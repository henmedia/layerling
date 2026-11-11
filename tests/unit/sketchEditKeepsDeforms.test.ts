import { describe, expect, it } from "vitest";
import { withExtrudeDeformsKept } from "@/lib/editorSketchCad";
import type { WorkplaneShape } from "@/types/layerling";

// A sketch body tapered, twisted and leaned lost all three as soon as its sketch was edited and built again
// (Federico Garcia, Facebook, 11.11.2026): shapeFromCadMesh drops them from a mesh that has them in it already.
const body = (fields: Partial<WorkplaneShape>) => ({
  id: "sketch", name: "Sketch extrusion", kind: "mesh", color: "#d41721", x: 0, z: 0, elevation: 0,
  size: 40, width: 40, depth: 30, height: 20, rotation: 0, rotationX: 0, rotationZ: 0, sketchOperation: "extrude",
  ...fields,
}) as WorkplaneShape;

describe("editing the sketch of a deformed sketch body", () => {
  const before = body({ taperTopWidth: 20, taperTopDepth: 15, extrudeTwist: 30, extrudeTopOffsetX: 5, extrudeTopOffsetZ: -2 });

  it("keeps the twist and the lean as they were", () => {
    const after = withExtrudeDeformsKept(body({}), before);
    expect(after.extrudeTwist).toBe(30);
    expect(after.extrudeTopOffsetX).toBe(5);
    expect(after.extrudeTopOffsetZ).toBe(-2);
  });

  it("keeps the taper in proportion to the outline drawn anew", () => {
    const after = withExtrudeDeformsKept(body({ width: 60, size: 60, depth: 30 }), before);
    expect(after.taperTopWidth).toBeCloseTo(30, 6);
    expect(after.taperTopDepth).toBeCloseTo(15, 6);
    expect(after.taperBottomWidth).toBeUndefined();
  });

  it("leaves a body without them, a new one or another kind of sketch body as built", () => {
    const plain = body({});
    expect(withExtrudeDeformsKept(plain, body({}))).toBe(plain);
    expect(withExtrudeDeformsKept(plain, null)).toBe(plain);
    expect(withExtrudeDeformsKept(plain, { ...before, sketchOperation: "revolve" })).toBe(plain);
  });
});
