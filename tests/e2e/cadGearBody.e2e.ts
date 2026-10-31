import { beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as THREE from "three";
import { OcctKernel, type ShapeHandle } from "occt-wasm";
import type { WorkplaneShape } from "@/types/layerling";
import { cadModifierHelicalGearForShape, cadModifierProfileForShape, cadProfileExpectation } from "@/lib/cadProfileExtrusion";
import { cadProfileSolidMismatch, profileExtrusionSolid } from "@/lib/cadProfileSolid";
import { cadTransformRequiresGeneralTransform } from "@/lib/cadModifierRuntime";
import { helicalGearPartSolid } from "@/lib/gearSolid";
import { BEVEL_GEAR_TOP_SCALE, createGearGeometry, gearOutlineCorners, gearSettings, MIN_GEAR_HELIX_QUALITY, MAX_GEAR_HELIX_QUALITY } from "@/lib/gearGeometry";
import { meshYawDegrees, mirrorSign } from "@/lib/workplaneShapes";
import { cad, gear, placer, displayMesh, body, area, section, outlineVolume, surfaceSides, sectionPoints } from "./helpers/gearHarness";
import type { Vec3, P2 } from "./helpers/gearHarness";

describe("the helical and bevel gears' exact bodies", () => {
  const cases: Array<[string, Partial<WorkplaneShape>]> = [
    ["default helical gear", {}],
    ["helical gear turned the other way", { helixAngle: -30 }],
    ["helical gear of 64 teeth at -45 degrees", { teeth: 64, helixAngle: -45, toothSize: 1 }],
    ["helical gear of 7 teeth at 5 degrees, stretched unevenly as drawn", { teeth: 7, helixAngle: 5 }],
    ["helical gear at 0 degrees", { helixAngle: 0 }],
    ["helical gear without a bore, tall", { centerHoleSize: 0, height: 25 }],
    ["helical gear turned, tipped and lifted", { rotation: 30, rotationX: 90, rotationZ: 15, elevation: 4, x: 12, z: -5 }],
    ["mirrored helical gear", { mirrorX: true }],
    ["default bevel gear", { gearType: "bevel" }],
    ["bevel gear of 7 teeth", { gearType: "bevel", teeth: 7 }],
    ["bevel gear on an oval footprint", { gearType: "bevel", width: 30, depth: 18 }],
    ["bevel gear without a bore, tall", { gearType: "bevel", centerHoleSize: 0, height: 25 }],
    ["bevel gear turned, tipped, lifted and mirrored", { gearType: "bevel", rotation: 30, rotationX: 90, elevation: 4, x: 12, z: -5, mirrorZ: true }],
  ];

  it.each(cases)("matches the drawn %s", (_name, extra) => {
    const shape = gear(extra);
    const solid = body(shape);
    expect(cad.isValid(solid)).toBe(true);
    const expected = displayMesh(shape);
    expect(cadProfileSolidMismatch(cad, solid, expected)).toBeNull();
    // Bounds: the mesh's tooth tips are the body's.
    const box = cad.getBoundingBox(solid);
    [box.xmin, box.ymin, box.zmin, box.xmax, box.ymax, box.zmax].forEach((value, index) => expect(Math.abs(value - expected.bounds[index])).toBeLessThan(0.01));
    // A bevel gear's sides are planes, not B-splines that happen to be flat.
    if (gearSettings(shape).gearType === "bevel") {
      const planes = cad.getSubShapes(solid, "face").filter((face) => cad.surfaceType(face) === "plane").length;
      expect(planes).toBe(gearSettings(shape).teeth * 4 + 2);
    }
    const volume = cad.getVolume(solid);
    expect(Math.abs(volume - outlineVolume(shape)) / volume).toBeLessThan(1e-5);
    expect(Math.abs(expected.volume - volume) / volume).toBeLessThan(0.01);
    const inside = surfaceSides(solid);
    const points = sectionPoints(shape, 0.02);
    for (const { p, inside: expectInside } of points) expect(inside(p, 0.5)).toBe(expectInside);
    expect(points.length).toBeGreaterThan(80);
  });

  it("keeps an oval helical gear on its mesh: its corners do not turn as one ring", () => {
    expect(cadModifierHelicalGearForShape(gear({ width: 30, depth: 18 }))).toBeNull();
  });

  it("builds the same exact helical gear at any quality, which only sets how finely the turn is drawn", () => {
    const coarse = gear({ helixQuality: MIN_GEAR_HELIX_QUALITY, helixAngle: 45 });
    const solid = body(coarse);
    expect(cadProfileSolidMismatch(cad, solid, displayMesh(coarse))).toBeNull();
    expect(Math.abs(cad.getVolume(solid) - cad.getVolume(body(gear({ helixQuality: MAX_GEAR_HELIX_QUALITY, helixAngle: 45 }))))).toBeLessThan(1e-6 * cad.getVolume(solid));
  });

  it.each<[string, Partial<WorkplaneShape>]>([
    ["involute spur gear", { gearType: "spur" }],
    ["involute spur gear of 40 teeth, root outside the base circle", { gearType: "spur", teeth: 50, width: 52, depth: 52, size: 52 }],
    ["involute spur gear of 150 teeth, module 0.5 (#679)", { gearType: "spur", teeth: 150, width: 76, depth: 76, size: 76 }],
    ["involute spur gear of 500 teeth, module 0.5 (#679)", { gearType: "spur", teeth: 500, width: 251, depth: 251, size: 251 }],
    ["involute helical gear", { gearType: "helical", helixAngle: 20 }],
    ["involute helical gear turned the other way, mirrored", { gearType: "helical", helixAngle: -25, mirrorX: true }],
    ["involute bevel gear", { gearType: "bevel" }],
  ])("builds the %s as drawn (#201)", (_name, extra) => {
    const shape = gear({ width: 28, depth: 28, size: 28, gearProfile: "involute", gearPressureAngle: 20, gearBacklash: 0.2, centerHoleSize: 5, ...extra });
    const started = performance.now();
    let solid: ShapeHandle;
    if (gearSettings(shape).gearType === "helical") {
      const part = cadModifierHelicalGearForShape(shape);
      expect(part).not.toBeNull();
      const local = helicalGearPartSolid(cad, part!);
      solid = !part!.transform ? local : cadTransformRequiresGeneralTransform(part!.transform) ? cad.generalTransform(local, part!.transform) : cad.transform(local, part!.transform);
    } else {
      const part = cadModifierProfileForShape(shape);
      expect(part).not.toBeNull();
      const local = profileExtrusionSolid(cad, part!);
      solid = !part!.transform ? local : cadTransformRequiresGeneralTransform(part!.transform) ? cad.generalTransform(local, part!.transform) : cad.transform(local, part!.transform);
    }
    const seconds = (performance.now() - started) / 1000;
    expect(cad.isValid(solid)).toBe(true);
    const expected = displayMesh(shape);
    expect(cadProfileSolidMismatch(cad, solid, expected)).toBeNull();
    // The tip circle spans width x depth (the bevel gear's foot does).
    const box = cad.getBoundingBox(solid);
    expect(Math.max(box.xmax - box.xmin, box.zmax - box.zmin)).toBeLessThanOrEqual(shape.width + 0.01);
    expect(Math.abs(cad.getVolume(solid) - expected.volume) / expected.volume).toBeLessThan(0.01);
    expect(seconds).toBeLessThan(20);
  });

  it.each<[string, Partial<WorkplaneShape>]>([
    ["round spur gear", { gearType: "spur" }],
    ["round spur gear of 6 teeth", { gearType: "spur", teeth: 6, width: 14.4, depth: 14.4, size: 14.4, centerHoleSize: 2 }],
    ["round spur gear of 50 teeth", { gearType: "spur", teeth: 50, width: 51.2, depth: 51.2, size: 51.2 }],
    ["round helical gear", { gearType: "helical", helixAngle: 20 }],
    ["round bevel gear", { gearType: "bevel" }],
  ])("builds the %s as drawn, from true arcs (#201)", (_name, extra) => {
    const shape = gear({ width: 26.4, depth: 26.4, size: 26.4, gearProfile: "round", gearBacklash: 0.2, centerHoleSize: 5, ...extra });
    let solid: ShapeHandle;
    if (gearSettings(shape).gearType === "helical") {
      const part = cadModifierHelicalGearForShape(shape);
      expect(part).not.toBeNull();
      const local = helicalGearPartSolid(cad, part!);
      solid = !part!.transform ? local : cadTransformRequiresGeneralTransform(part!.transform) ? cad.generalTransform(local, part!.transform) : cad.transform(local, part!.transform);
    } else {
      const part = cadModifierProfileForShape(shape);
      expect(part).not.toBeNull();
      // Two arcs a tooth and nothing else.
      expect(part!.loops[0].segments.every((segment) => segment.kind === "arc")).toBe(true);
      expect(part!.loops[0].segments).toHaveLength(2 * (shape.teeth ?? 12));
      const local = profileExtrusionSolid(cad, part!);
      solid = !part!.transform ? local : cadTransformRequiresGeneralTransform(part!.transform) ? cad.generalTransform(local, part!.transform) : cad.transform(local, part!.transform);
    }
    expect(cad.isValid(solid)).toBe(true);
    const expected = displayMesh(shape);
    expect(cadProfileSolidMismatch(cad, solid, expected)).toBeNull();
    const box = cad.getBoundingBox(solid);
    expect(Math.max(box.xmax - box.xmin, box.zmax - box.zmin)).toBeLessThanOrEqual(shape.width + 0.01);
    expect(Math.abs(cad.getVolume(solid) - expected.volume) / expected.volume).toBeLessThan(0.01);
  });

  it("takes a fillet on the round spur gear's top edges", () => {
    const shape = gear({ width: 26.4, depth: 26.4, size: 26.4, gearType: "spur", gearProfile: "round", centerHoleSize: 5 });
    const solid = profileExtrusionSolid(cad, cadModifierProfileForShape(shape)!);
    const bounds = cad.getBoundingBox(solid);
    const up = bounds.ymax - bounds.ymin < bounds.zmax - bounds.zmin ? "y" : "z";
    const edges = cad.getSubShapes(solid, "edge").filter((edge) => {
      const box = cad.getBoundingBox(edge);
      return up === "y"
        ? box.ymax - box.ymin < 1e-6 && Math.abs(box.ymax - bounds.ymax) < 1e-6
        : box.zmax - box.zmin < 1e-6 && Math.abs(box.zmax - bounds.zmax) < 1e-6;
    });
    expect(edges.length).toBeGreaterThanOrEqual(12 * 2);
    const rounded = cad.fillet(solid, edges, 0.3);
    expect(cad.isValid(rounded)).toBe(true);
    expect(cad.getVolume(rounded)).toBeLessThan(cad.getVolume(solid));
  });

  it("takes a fillet on the involute spur gear's top edges", () => {
    const shape = gear({ width: 28, depth: 28, size: 28, gearType: "spur", gearProfile: "involute", centerHoleSize: 5 });
    const part = cadModifierProfileForShape(shape)!;
    const solid = profileExtrusionSolid(cad, part);
    // The top end: the edges lying flat at the solid's highest point, whichever axis is up here.
    const bounds = cad.getBoundingBox(solid);
    const up = bounds.ymax - bounds.ymin < bounds.zmax - bounds.zmin ? "y" : "z";
    const edges = cad.getSubShapes(solid, "edge").filter((edge) => {
      const box = cad.getBoundingBox(edge);
      return up === "y"
        ? box.ymax - box.ymin < 1e-6 && Math.abs(box.ymax - bounds.ymax) < 1e-6
        : box.zmax - box.zmin < 1e-6 && Math.abs(box.zmax - bounds.zmax) < 1e-6;
    });
    expect(edges.length).toBeGreaterThan(12 * 6);
    const rounded = cad.fillet(solid, edges, 0.3);
    expect(cad.isValid(rounded)).toBe(true);
    expect(cad.getVolume(rounded)).toBeLessThan(cad.getVolume(solid));
  });

  it("takes edge treatment: the helical gear's ends filleted, the bevel gear's ends chamfered", () => {
    const ends = (solid: ShapeHandle, height: number) => cad.getSubShapes(solid, "edge").filter((edge) => {
      const box = cad.getBoundingBox(edge);
      return box.ymax - box.ymin < 1e-6 && (Math.abs(box.ymin) < 1e-6 || Math.abs(box.ymin - height) < 1e-6);
    });
    const helical = body(gear());
    const helicalEnds = ends(helical, 6);
    // The 48 sides of the ring and the bore's rim, at both ends.
    expect(helicalEnds.length).toBeGreaterThanOrEqual(98);
    const rounded = cad.fillet(helical, helicalEnds, 0.5);
    expect(cad.isValid(rounded)).toBe(true);
    expect(cad.getVolume(rounded)).toBeLessThan(cad.getVolume(helical));

    const bevel = body(gear({ gearType: "bevel" }));
    const bevelEnds = ends(bevel, 6);
    expect(bevelEnds.length).toBeGreaterThanOrEqual(98);
    const chamfered = cad.chamfer(bevel, bevelEnds, 0.5);
    expect(cad.isValid(chamfered)).toBe(true);
    expect(cad.getVolume(chamfered)).toBeLessThan(cad.getVolume(bevel));
  });
});

describe("the herringbone gear's exact body (#1007)", () => {
  const herringbone = (extra: Partial<WorkplaneShape> = {}) => gear({ gearType: "herringbone", ...extra });
  const cases: Array<[string, Partial<WorkplaneShape>]> = [
    ["default herringbone gear", {}],
    ["herringbone gear turned the other way", { helixAngle: -30 }],
    ["herringbone gear of 64 teeth at -45 degrees", { teeth: 64, helixAngle: -45, toothSize: 1 }],
    ["herringbone gear of 7 teeth at 5 degrees, stretched unevenly as drawn", { teeth: 7, helixAngle: 5 }],
    ["herringbone gear of 12 teeth at 10 degrees, stretched as drawn", { toothWidth: 4, helixAngle: 10 }],
    ["herringbone gear at 0 degrees", { helixAngle: 0 }],
    ["herringbone gear without a bore, tall", { centerHoleSize: 0, height: 25 }],
    ["herringbone gear turned, tipped and lifted", { rotation: 30, rotationX: 90, rotationZ: 15, elevation: 4, x: 12, z: -5 }],
    ["herringbone gear mirrored left to right", { mirrorX: true, helixAngle: -20 }],
    ["herringbone gear mirrored front to back", { mirrorZ: true }],
    ["involute herringbone gear", { width: 28, depth: 28, size: 28, gearProfile: "involute", gearPressureAngle: 20, gearBacklash: 0.2, centerHoleSize: 5, helixAngle: 20 }],
    ["involute herringbone gear turned the other way, mirrored", { width: 28, depth: 28, size: 28, gearProfile: "involute", gearPressureAngle: 20, gearBacklash: 0.2, centerHoleSize: 5, helixAngle: -25, mirrorX: true }],
    ["round herringbone gear", { width: 26.4, depth: 26.4, size: 26.4, gearProfile: "round", gearBacklash: 0.2, centerHoleSize: 5, helixAngle: 20 }],
  ];

  it.each(cases)("matches the drawn %s", (_name, extra) => {
    const shape = herringbone(extra);
    const started = performance.now();
    const solid = body(shape);
    const seconds = (performance.now() - started) / 1000;
    expect(cad.isValid(solid)).toBe(true);
    const expected = displayMesh(shape);
    expect(cadProfileSolidMismatch(cad, solid, expected)).toBeNull();
    const box = cad.getBoundingBox(solid);
    [box.xmin, box.ymin, box.zmin, box.xmax, box.ymax, box.zmax].forEach((value, index) => expect(Math.abs(value - expected.bounds[index])).toBeLessThan(0.01));
    // Volume and bounds cannot tell a herringbone from a helical gear: the sections at five heights can.
    const volume = cad.getVolume(solid);
    expect(Math.abs(volume - outlineVolume(shape)) / volume).toBeLessThan(1e-5);
    expect(Math.abs(expected.volume - volume) / volume).toBeLessThan(0.01);
    const inside = surfaceSides(solid);
    const points = sectionPoints(shape, 0.02);
    for (const { p, inside: expectInside } of points) expect(inside(p, 0.5)).toBe(expectInside);
    expect(points.length).toBeGreaterThan(80);
    expect(seconds).toBeLessThan(20);
  });

  it("is one face a side at 0 degrees, as the helical gear is, with no seam in the middle", () => {
    const flat = body(herringbone({ helixAngle: 0 }));
    const helical = body(gear({ helixAngle: 0 }));
    expect(cad.getSubShapes(flat, "face").length).toBe(cad.getSubShapes(helical, "face").length);
    expect(cad.getSubShapes(flat, "edge").length).toBe(cad.getSubShapes(helical, "edge").length);
    // Turned, each side is two faces: one for each half.
    expect(cad.getSubShapes(body(herringbone()), "face").length).toBe(2 * 48 + 3);
  });

  it("builds the same exact herringbone gear at any quality, which only sets how finely the turn is drawn", () => {
    const coarse = herringbone({ helixQuality: MIN_GEAR_HELIX_QUALITY, helixAngle: 45 });
    const solid = body(coarse);
    expect(cadProfileSolidMismatch(cad, solid, displayMesh(coarse))).toBeNull();
    expect(Math.abs(cad.getVolume(solid) - cad.getVolume(body(herringbone({ helixQuality: MAX_GEAR_HELIX_QUALITY, helixAngle: 45 }))))).toBeLessThan(1e-6 * cad.getVolume(solid));
  });

  it("takes a fillet on its ends and on the flanks where the halves meet", () => {
    const solid = body(herringbone());
    const flat = (edge: ShapeHandle, y: number) => {
      const box = cad.getBoundingBox(edge);
      return box.ymax - box.ymin < 1e-6 && Math.abs(box.ymin - y) < 1e-6;
    };
    const ends = cad.getSubShapes(solid, "edge").filter((edge) => flat(edge, 0) || flat(edge, 6));
    expect(ends.length).toBeGreaterThanOrEqual(98);
    const rounded = cad.fillet(solid, ends, 0.5);
    expect(cad.isValid(rounded)).toBe(true);
    expect(cad.getVolume(rounded)).toBeLessThan(cad.getVolume(solid));
    // In the middle a flank runs from the foot to the tip and turns back there, a ridge on one side of a tooth and a
    // valley on the other; the tip and the foot run on almost smoothly.
    const reach = (edge: ShapeHandle) => cad.getSubShapes(edge, "vertex").map((vertex) => {
      const { x, z } = cad.vertexPosition(vertex);
      return Math.hypot(x, z);
    });
    const flanks = cad.getSubShapes(solid, "edge").filter((edge) => {
      if (!flat(edge, 3)) return false;
      const [a, b] = reach(edge);
      return Math.abs(a - b) > 0.5;
    });
    expect(flanks).toHaveLength(12 * 2);
    const middle = cad.fillet(solid, flanks, 0.3);
    expect(cad.isValid(middle)).toBe(true);
    // A rounding face for every flank.
    expect(cad.getSubShapes(middle, "face").length).toBe(cad.getSubShapes(solid, "face").length + flanks.length);
  });
});
