import { describe, expect, it } from "vitest";
import type { ShapeHandle } from "occt-wasm";
import type { WorkplaneShape } from "@/types/layerling";
import { cadModifierHirthForShape, cadProfileExpectation } from "@/lib/cadProfileExtrusion";
import { cadProfileSolidMismatch } from "@/lib/cadProfileSolid";
import { cadTransformRequiresGeneralTransform } from "@/lib/cadModifierRuntime";
import { hirthPartSolid } from "@/lib/hirthSolid";
import { createHirthGeometry, hirthMeasures } from "@/lib/hirthGeometry";
import { stepSourceForShape } from "@/lib/stepExport";
import { cad, placer } from "./helpers/gearHarness";
import type { Vec3 } from "./helpers/gearHarness";

/*
 * The Hirth joint's exact body (#1016) against its display mesh, placed as
 * transformMesh places it. Its volume is known in closed form: the toothed
 * top rises as far above the height of the apex as it falls below it, so the
 * joint holds the ring under the apex. And a copy turned 180 degrees about x
 * and set on it at its height less the tooth height touches it everywhere
 * without reaching into it.
 */

function hirth(extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return {
    id: "h", name: "Hirth", kind: "hirth", color: "#888888", x: 0, z: 0, elevation: 0, rotation: 0,
    width: 40, depth: 40, size: 40, height: 10, teeth: 24, toothSize: 2.6, centerHoleSize: 10,
    ...extra,
  } as WorkplaneShape;
}

function displayMesh(shape: WorkplaneShape) {
  const geometry = createHirthGeometry(shape.width, shape.height, shape.depth ?? shape.width, shape);
  const position = geometry.getAttribute("position");
  const place = placer(shape);
  const vertices: Vec3[] = [];
  for (let i = 0; i < position.count; i += 1) vertices.push(place(position.getX(i), position.getY(i), position.getZ(i)));
  const faces: Vec3[] = [];
  const flip = [shape.mirrorX, shape.mirrorY, shape.mirrorZ].filter(Boolean).length % 2 === 1;
  for (let i = 0; i + 2 < vertices.length; i += 3) faces.push(flip ? [i, i + 2, i + 1] : [i, i + 1, i + 2]);
  return cadProfileExpectation(vertices, faces);
}

function body(shape: WorkplaneShape): ShapeHandle {
  const part = cadModifierHirthForShape(shape);
  expect(part).not.toBeNull();
  const local = hirthPartSolid(cad, part!);
  const transform = part!.transform;
  return !transform ? local : cadTransformRequiresGeneralTransform(transform) ? cad.generalTransform(local, transform) : cad.transform(local, transform);
}

function closedFormVolume(shape: WorkplaneShape) {
  const measures = hirthMeasures(shape, shape.width, shape.depth ?? shape.width);
  return measures.apexY * Math.PI * (measures.rx * measures.rz - measures.boreRadius * measures.boreRadius);
}

describe("the Hirth joint's exact body (#1016)", () => {
  it.each<[string, Partial<WorkplaneShape>]>([
    ["default joint", {}],
    ["joint without a bore", { centerHoleSize: 0 }],
    ["joint of 6 tall teeth", { teeth: 6, toothSize: 8 }],
    ["joint of 90 teeth", { teeth: 90, toothSize: 0.7, width: 60, depth: 60, size: 60 }],
    ["joint on an oval footprint", { width: 50, depth: 30, size: 50 }],
    ["joint deeper than wide", { width: 30, depth: 50, size: 50 }],
    ["joint turned, tipped and lifted", { rotation: 30, rotationX: 90, rotationZ: 15, elevation: 4, x: 12, z: -5 }],
    ["mirrored joint", { mirrorX: true }],
  ])("matches the drawn %s", (_name, extra) => {
    const shape = hirth(extra);
    const solid = body(shape);
    expect(cad.isValid(solid)).toBe(true);
    expect(cad.getSubShapes(solid, "solid").length).toBe(1);
    const expected = displayMesh(shape);
    expect(cadProfileSolidMismatch(cad, solid, expected)).toBeNull();
    const volume = cad.getVolume(solid);
    expect(Math.abs(volume - closedFormVolume(shape)) / volume).toBeLessThan(1e-6);
    expect(Math.abs(expected.volume - volume) / volume).toBeLessThan(0.01);
    expect(stepSourceForShape(shape)).toBe("hirth");
  });

  it("has a flat face for every flank and the bottom, and round walls", () => {
    const solid = body(hirth());
    const faces = cad.getSubShapes(solid, "face");
    expect(faces.filter((face) => cad.surfaceType(face) === "plane").length).toBe(2 * 24 + 1);
    expect(faces.filter((face) => cad.surfaceType(face) === "cylinder").length).toBe(2);
  });

  it.each([24, 23, 6])("locks into a copy of %i teeth turned over front to back", (teeth) => {
    const shape = hirth({ teeth, toothSize: 3 });
    const lower = body(shape);
    const lift = shape.height - 3;
    const upper = body({ ...shape, rotationX: 180, elevation: lift });
    const volume = cad.getVolume(lower);
    // Touching all over the flanks, reaching into each other nowhere.
    expect(cad.getVolume(cad.common(lower, upper))).toBeLessThan(volume * 1e-6);
    const joined = cad.fuse(lower, upper);
    expect(Math.abs(cad.getVolume(joined) - 2 * volume) / volume).toBeLessThan(1e-6);
    const box = cad.getBoundingBox(joined);
    expect(box.ymax - box.ymin).toBeCloseTo(2 * shape.height - 3, 6);
    // Turned by half a tooth more, crest stands on crest: they overlap.
    const clash = body({ ...shape, rotationX: 180, elevation: lift, rotation: 180 / teeth });
    expect(cad.getVolume(cad.common(lower, clash))).toBeGreaterThan(volume * 1e-3);
  });

  it("takes edge treatment on its bottom rim and its bore", () => {
    const solid = body(hirth());
    const bottom = cad.getSubShapes(solid, "edge").filter((edge) => {
      const box = cad.getBoundingBox(edge);
      return box.ymax < 1e-6;
    });
    expect(bottom.length).toBe(2);
    const chamfered = cad.chamfer(solid, bottom, 0.5);
    expect(cad.isValid(chamfered)).toBe(true);
    expect(cad.getVolume(chamfered)).toBeLessThan(cad.getVolume(solid));
  });
});
