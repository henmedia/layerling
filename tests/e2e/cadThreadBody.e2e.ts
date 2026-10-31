import { beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as THREE from "three";
import { OcctKernel, type ShapeHandle } from "occt-wasm";
import type { WorkplaneShape } from "@/types/layerling";
import { cadModifierThreadForShape, cadProfileExpectation } from "@/lib/cadProfileExtrusion";
import { cadProfileSolidMismatch } from "@/lib/cadProfileSolid";
import { cadTransformRequiresGeneralTransform } from "@/lib/cadModifierRuntime";
import { threadPartSolid } from "@/lib/threadSolid";
import { createThreadGeometry, threadNaturalFootprint, threadNaturalHeight, threadProfileShape, threadSettings, MIN_THREAD_QUALITY, WHITWORTH_PROFILE_CONSTANTS } from "@/lib/threadGeometry";
import { meshYawDegrees, mirrorSign } from "@/lib/workplaneShapes";
import { cad, thread, displayMesh, body, triangles, inside } from "./helpers/threadHarness";
import type { Vec3 } from "./helpers/threadHarness";

describe("the thread's exact body", () => {
  const cases: Array<[string, Partial<WorkplaneShape>]> = [
    ["an M6 rod, V profile", {}],
    ["a left-hand M6 rod", { threadHand: "left" }],
    ["a trapezoidal rod", { threadProfile: "trapezoidal", threadDiameter: 10, threadPitch: 2, height: 24 }],
    ["a round-profile rod", { threadProfile: "round", threadDiameter: 10, threadPitch: 2, height: 24 }],
    ["a Whitworth G1/2 rod", { threadProfile: "whitworth", threadDiameter: 20.955, threadPitch: 25.4 / 14, height: 30 }],
    ["an M6 rod with 0.3 mm bolt clearance", { threadBoltClearance: 0.3 }],
    ["a screw with 0.25 mm bolt clearance", { threadRole: "screw", threadBoltClearance: 0.25 }],
    ["a screw with a cylinder head", { threadRole: "screw" }],
    ["a screw with a hex head, both head rims chamfered", { threadRole: "screw", threadHead: "hex", threadHeadChamfer: 0.4 }],
    ["a countersunk screw", { threadRole: "screw", threadHead: "countersunk" }],
    // The drive in the head and the head's own diameter (#1052).
    ["a screw with a Torx drive", { threadRole: "screw", threadDrive: "torx" }],
    ["a countersunk screw with a Phillips drive", { threadRole: "screw", threadHead: "countersunk", threadDrive: "phillips" }],
    ["a hex head with a Torx drive, both head rims chamfered", { threadRole: "screw", threadHead: "hex", threadDrive: "torx", threadHeadChamfer: 0.3 }],
    ["a flat wide head with a deep hex socket", { threadRole: "screw", threadDiameter: 20, threadPitch: 2, threadHeadHeight: 2, threadHeadDiameter: 26, threadDriveSize: 8, threadDriveDepth: 1.8, height: 30 }],
    ["a screw with a slot across its head", { threadRole: "screw", threadDrive: "slot" }],
    ["a countersunk screw with a slot", { threadRole: "screw", threadHead: "countersunk", threadDrive: "slot" }],
    ["a screw with a Robertson square", { threadRole: "screw", threadDrive: "robertson" }],
    ["a countersunk screw with a Robertson square", { threadRole: "screw", threadHead: "countersunk", threadDrive: "robertson" }],
    ["a socket head without a drive", { threadRole: "screw", threadDrive: "none" }],
    ["a nut", { threadRole: "nut" }],
    ["a nut with chamfered rims, left hand", { threadRole: "nut", threadHeadChamfer: 0.5, threadHand: "left" }],
    ["a tapped hole", { threadRole: "bore", hole: true }],
    // Both failed once: the chamfer cone ended on the tap's crest.
    ["a left-hand tapped hole, M6x0.8 with a 0.3 mm chamfer", { threadRole: "bore", hole: true, threadHand: "left", threadPitch: 0.8, threadChamfer: 0.3 }],
    ["a nut M6x0.8 with a 0.3 mm chamfer", { threadRole: "nut", threadPitch: 0.8, threadChamfer: 0.3 }],
    // The cone of an inside chamfer goes on down to the core, and each end has its own (#269).
    ["a tapped hole with a long chamfer at the top and none at the bottom", { threadRole: "bore", hole: true, threadChamfer: 1.2, threadChamferBottom: 0 }],
    ["a nut with different chamfers at its two faces", { threadRole: "nut", threadChamfer: 0.9, threadChamferBottom: 0.3 }],
    ["a rod chamfered at the top only", { threadChamfer: 1, threadChamferBottom: 0 }],
    // A chamfer of any width above zero counts: a zero-width cone at the mouth (forum, 14.10.2026).
    ["a tapped hole with a 0.001 mm chamfer", { threadRole: "bore", hole: true, threadChamfer: 0.001, threadChamferBottom: 0 }],
    ["a nut with a 0.001 mm chamfer at both faces", { threadRole: "nut", threadChamfer: 0.001, threadChamferBottom: 0.001 }],
    ["a rod with a 0.001 mm chamfer at the top", { threadChamfer: 0.001, threadChamferBottom: 0 }],
    // The own profile: a trapezoid of its own depth and flank angle.
    ["a rod with the own profile, 90 degrees and 0.4 mm deep", { threadProfile: "custom", threadFlankAngle: 90, threadDepth: 0.4 }],
    ["a nut with the own profile, 45 degrees", { threadRole: "nut", threadProfile: "custom", threadFlankAngle: 45, threadDepth: 0.6 }],
    ["a tapped hole with the own profile and a chamfer", { threadRole: "bore", hole: true, threadProfile: "custom", threadFlankAngle: 75, threadDepth: 0.5, threadChamfer: 0.4 }],
    ["a rod turned, tipped and lifted", { rotation: 30, rotationX: 90, elevation: 4, x: 12, z: -5 }],
  ];

  it.each(cases)("matches the drawn %s", (_name, extra) => {
    const shape = thread(extra);
    const solid = body(shape);
    expect(cad.isValid(solid)).toBe(true);
    const mesh = displayMesh(shape);
    const expected = cadProfileExpectation(mesh.vertices, mesh.faces);
    expect(cadProfileSolidMismatch(cad, solid, expected)).toBeNull();
    expect(Math.abs(cad.getVolume(solid) - expected.volume) / expected.volume).toBeLessThan(0.01);
    // Points a little off the drawn thread flanks, away from its ends: inside below the surface, outside above it.
    const part = cadModifierThreadForShape(shape)!;
    const settings = threadSettings(shape);
    const depth = settings.pitch * 0.06;
    const tris = triangles(solid, depth * 0.1);
    const onFlank = mesh.local.map((v, i) => i).filter((i) => {
      const [x, y, z] = mesh.local[i];
      const radius = Math.hypot(x, z);
      return radius > part.minor - 1e-6 && radius < part.major + 1e-6 && y > part.shaftBottom + 2 * settings.pitch && y < part.height - 2 * settings.pitch;
    });
    const picks = onFlank.filter((_, k) => k % Math.max(1, Math.floor(onFlank.length / 24)) === 0).slice(0, 24);
    let tested = 0;
    for (const i of picks) {
      const v = mesh.vertices[i];
      const n = mesh.normals[i];
      if (!n.every(Number.isFinite)) continue;
      const inPoint: Vec3 = [v[0] - n[0] * depth, v[1] - n[1] * depth, v[2] - n[2] * depth];
      const outPoint: Vec3 = [v[0] + n[0] * depth, v[1] + n[1] * depth, v[2] + n[2] * depth];
      expect(inside(tris, inPoint)).toBe(true);
      expect(inside(tris, outPoint)).toBe(false);
      tested += 1;
    }
    expect(tested).toBeGreaterThan(8);
  });

  it("builds the same exact body at any quality, which only sets how finely the mesh is drawn", () => {
    const fine = thread();
    const coarse = thread({ threadQuality: MIN_THREAD_QUALITY });
    const solid = body(coarse);
    const mesh = displayMesh(coarse);
    expect(cadProfileSolidMismatch(cad, solid, cadProfileExpectation(mesh.vertices, mesh.faces))).toBeNull();
    expect(Math.abs(cad.getVolume(solid) - cad.getVolume(body(fine)))).toBeLessThan(1e-6 * cad.getVolume(solid));
  });

  it("takes edge treatment: the screw head's rims, and a block with a tapped hole", () => {
    // The cylinder head's two circular rims, filleted.
    const screw = body(thread({ threadRole: "screw" }));
    const rims = cad.getSubShapes(screw, "edge").filter((edge) => {
      if (cad.curveType(edge) !== "circle") return false;
      const box = cad.getBoundingBox(edge);
      return box.xmax - box.xmin > 9;
    });
    expect(rims.length).toBe(2);
    const filleted = cad.fillet(screw, rims, 0.5);
    expect(cad.isValid(filleted)).toBe(true);
    expect(cad.getVolume(filleted)).toBeLessThan(cad.getVolume(screw));

    // A 20 x 20 x 12 block with an M6 tapped hole through it, its outer vertical edges rounded.
    const tapped = body(thread({ threadRole: "bore", hole: true, height: 12 }));
    const block = cad.translate(cad.makeBox(20, 12, 20), -10, 0, -10);
    let holed = cad.cut(block, tapped);
    const solids = cad.getSubShapes(holed, "solid");
    expect(solids.length).toBe(1);
    holed = solids[0];
    expect(cad.isValid(holed)).toBe(true);
    const corners = cad.getSubShapes(holed, "edge").filter((edge) => {
      if (cad.curveType(edge) !== "line") return false;
      const box = cad.getBoundingBox(edge);
      return box.ymax - box.ymin > 11.9 && Math.abs(box.xmin) > 9.9 && Math.abs(box.zmin) > 9.9;
    });
    expect(corners.length).toBe(4);
    const rounded = cad.fillet(holed, corners, 2);
    expect(cad.isValid(rounded)).toBe(true);
    expect(cad.getVolume(rounded)).toBeLessThan(cad.getVolume(holed));
  });
});

