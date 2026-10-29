import { describe, expect, it } from "vitest";
import { ownSizeAlong, sizeAlignmentState, sizedShapesForSelection } from "@/lib/alignSize";
import { meshAabb } from "@/lib/editorMeshCore";
import type { AlignAxis, AlignTarget, WorkplaneShape } from "@/types/layerling";

function box(id: string, x: number, z: number, width = 10, depth = width, height = 10, extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return { id, name: id, kind: "box", color: "#888888", x, z, elevation: 0, size: Math.max(width, depth), width, depth, height, rotation: 0, ...extra } as WorkplaneShape;
}

function sized(shapes: WorkplaneShape[], axis: AlignAxis, target: AlignTarget, anchorId: string | null = null, maxSize?: (shape: WorkplaneShape) => number) {
  return sizedShapesForSelection(shapes, shapes.map((shape) => shape.id), shapes, anchorId, axis, target, null, maxSize);
}

const byId = (shapes: WorkplaneShape[], id: string) => shapes.find((shape) => shape.id === id)!;

describe("align by size (#998)", () => {
  it("a side dot stretches the others to the farthest side and keeps their other side", () => {
    // a spans -25..-15, b spans 0..20: a grows to the right until it reaches 20.
    const result = sized([box("a", -20, 0), box("b", 10, 0, 20)], "x", "max");
    const a = byId(result.nextShapes, "a");
    expect(result.resized).toBe(1);
    expect(a.width).toBeCloseTo(45, 6);
    expect(a.x).toBeCloseTo(-2.5, 6);
    expect(a.depth).toBe(10);
    expect(byId(result.nextShapes, "b")).toEqual(box("b", 10, 0, 20));
    const bounds = meshAabb(a);
    expect(bounds.minX).toBeCloseTo(-25, 6);
    expect(bounds.maxX).toBeCloseTo(20, 6);
  });

  it("with an anchor the others stretch to its side, also shrinking", () => {
    // a spans -5..25 and the anchor b ends at 10: a keeps its left side at -5 and ends at 10.
    const result = sized([box("a", 10, 0, 30), box("b", 0, 20, 20)], "x", "max", "b");
    const a = byId(result.nextShapes, "a");
    expect(a.width).toBeCloseTo(15, 6);
    expect(meshAabb(a).minX).toBeCloseTo(-5, 6);
    expect(meshAabb(a).maxX).toBeCloseTo(10, 6);
  });

  it("the middle dot gives the anchor's size about each part's own middle", () => {
    const result = sized([box("a", -20, 5), box("b", 20, 0, 30, 12, 40)], "x", "center", "b");
    const a = byId(result.nextShapes, "a");
    expect(a.width).toBeCloseTo(30, 6);
    expect(a.x).toBeCloseTo(-20, 6);
    expect(a.z).toBeCloseTo(5, 6);
    expect(a.depth).toBe(10);
    expect(a.height).toBe(10);
  });

  it("without an anchor the middle dot gives every part the size of the largest", () => {
    const result = sized([box("a", -20, 0, 10), box("b", 0, 0, 14), box("c", 20, 0, 30)], "x", "center");
    expect(byId(result.nextShapes, "a").width).toBeCloseTo(30, 6);
    expect(byId(result.nextShapes, "b").width).toBeCloseTo(30, 6);
    expect(byId(result.nextShapes, "c")).toEqual(box("c", 20, 0, 30));
    expect(result.resized).toBe(2);
  });

  it("upward a part grows from its bottom to the anchor's top", () => {
    const result = sized([box("a", 0, 0), box("b", 30, 0, 10, 10, 35)], "y", "max", "b");
    const a = byId(result.nextShapes, "a");
    expect(a.height).toBeCloseTo(35, 6);
    expect(a.elevation).toBeCloseTo(0, 6);
  });

  it("a cylinder stays round: its depth follows its width", () => {
    const cylinder = { ...box("a", 0, 0), kind: "cylinder" } as WorkplaneShape;
    const result = sized([cylinder, box("b", 40, 0, 24)], "x", "center", "b");
    const a = byId(result.nextShapes, "a");
    expect(a.width).toBeCloseTo(24, 1);
    expect(a.depth).toBeCloseTo(a.width, 9);
    const bounds = meshAabb(a);
    expect(bounds.maxX - bounds.minX).toBeCloseTo(24, 3);
  });

  it("a part turned by a right angle changes the own size that runs along the axis", () => {
    const turned = box("a", 0, 0, 10, 20, 10, { rotation: 90 });
    expect(ownSizeAlong(turned, { x: 1, y: 0, z: 0 })).toBe("depth");
    const result = sized([turned, box("b", 40, 0, 30)], "x", "center", "b");
    const a = byId(result.nextShapes, "a");
    expect(a.depth).toBeCloseTo(30, 6);
    expect(a.width).toBeCloseTo(10, 6);
    expect(a.x).toBeCloseTo(0, 6);

    const lying = box("c", 0, 0, 10, 10, 20, { rotationX: 90 });
    expect(ownSizeAlong(lying, { x: 0, y: 1, z: 0 })).toBe("depth");
    const raised = byId(sized([lying, box("d", 40, 0, 10, 10, 25)], "y", "max", "d").nextShapes, "c");
    // Lying on its back it spans 5 to 15 upward (its middle stays at half its own height); its bottom stays.
    const bounds = meshAabb(raised);
    expect(bounds.minY).toBeCloseTo(5, 6);
    expect(bounds.maxY).toBeCloseTo(25, 6);
    expect(raised.x).toBeCloseTo(0, 6);
    expect(raised.z).toBeCloseTo(0, 6);
  });

  it("leaves a part turned at an angle, a locked part and the anchor as they are", () => {
    const tilted = box("a", 0, 0, 10, 10, 10, { rotation: 30 });
    const locked = box("c", 0, 30, 10, 10, 10, { locked: true });
    const shapes = [tilted, box("b", 40, 0, 30), locked];
    const result = sized(shapes, "x", "center", "b");
    expect(result.resized).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.nextShapes).toEqual(shapes);
  });

  it("does not stretch a part past the size limit or to nothing", () => {
    const tooLarge = sized([box("a", 0, 0), box("b", 40, 0, 300)], "x", "center", "b", () => 220);
    expect(tooLarge.resized).toBe(0);
    expect(tooLarge.skipped).toBe(1);
    // The anchor ends left of a's left side: nothing is left of a.
    const nothing = sized([box("a", 0, 0), box("b", -40, 0)], "x", "max", "b");
    expect(nothing.resized).toBe(0);
    expect(nothing.skipped).toBe(1);
  });

  it("along a workplane's axes a part turned with it takes the size along them", () => {
    const half = Math.SQRT1_2;
    const axes = { x: { x: half, y: 0, z: -half }, y: { x: 0, y: 1, z: 0 }, z: { x: half, y: 0, z: half } };
    const a = box("a", 0, 0, 10, 10, 10, { rotation: 45 });
    const b = box("b", 30, 30, 24, 10, 10, { rotation: 45 });
    expect(ownSizeAlong(a, axes.x)).toBe("width");
    const result = sizedShapesForSelection([a, b], ["a", "b"], [a, b], "b", "x", "center", axes);
    const next = byId(result.nextShapes, "a");
    expect(next.width).toBeCloseTo(24, 6);
    expect(next.x).toBeCloseTo(0, 6);
    expect(next.z).toBeCloseTo(0, 6);
  });

  it("tells the dots whether they would change anything", () => {
    const shapes = [box("a", -20, 0), box("b", 20, 0)];
    expect(sizeAlignmentState(shapes, null, "x", "center")).toEqual({ aligned: true, wouldChange: false });
    expect(sizeAlignmentState(shapes, null, "x", "max")).toEqual({ aligned: false, wouldChange: true });
    const tilted = [box("a", -20, 0, 10, 10, 10, { rotation: 30 }), box("b", 20, 0, 30)];
    expect(sizeAlignmentState(tilted, "b", "x", "center")).toEqual({ aligned: false, wouldChange: false });
  });
});
