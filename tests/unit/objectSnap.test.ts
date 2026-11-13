import { describe, expect, it } from "vitest";
import { boxEdgeTargets, edgeSnapGuide, objectSnapOffset, snapResizeEdge, type SnapBox } from "@/lib/objectSnap";

const box = (minX: number, maxX: number, minZ: number, maxZ: number): SnapBox => ({ minX, maxX, minZ, maxZ });

describe("objectSnapOffset", () => {
  it("lays the moving edge against a neighbour's edge within the threshold", () => {
    const result = objectSnapOffset(box(21.2, 41.2, 50, 70), [box(0, 20, 0, 20)], 2);
    expect(result.dx).toBeCloseTo(-1.2);
    expect(result.dz).toBeNull();
    expect(result.guides).toEqual([{ axis: "x", value: 20, from: 0, to: 70 }]);
  });

  it("snaps centres onto centres", () => {
    const result = objectSnapOffset(box(-4.5, 5.5, 30, 40), [box(-10, 10, -10, 10)], 1);
    // The centre line (0.5 -> 0) is the nearest; edges are 5.5 and 4.5 away.
    expect(result.dx).toBeCloseTo(-0.5);
  });

  it("takes the nearest of several candidates on each axis independently", () => {
    const result = objectSnapOffset(box(9, 19, 9.6, 19.6), [box(0, 10, 0, 10), box(30, 40, 20, 30)], 1.5);
    expect(result.dx).toBeCloseTo(1); // 9 -> 10
    expect(result.dz).toBeCloseTo(0.4); // 19.6 -> 20
    // After the shift the box also lines up with the first neighbour at z = 10.
    expect(result.guides.map((guide) => `${guide.axis}${guide.value}`).sort()).toEqual(["x10", "z10", "z20"]);
  });

  it("leaves the box alone when nothing is close enough", () => {
    expect(objectSnapOffset(box(50, 60, 50, 60), [box(0, 10, 0, 10)], 2)).toEqual({ dx: null, dz: null, guides: [] });
  });

  it("does nothing without targets or with a zero threshold", () => {
    expect(objectSnapOffset(box(0, 1, 0, 1), [], 5).dx).toBeNull();
    expect(objectSnapOffset(box(0, 1, 0, 1), [box(0, 1, 0, 1)], 0).dx).toBeNull();
  });

  it("merges guides for the same line from several targets", () => {
    const result = objectSnapOffset(box(10.5, 20.5, 0, 10), [box(0, 10, 20, 30), box(0, 10, -30, -20)], 1);
    const xGuides = result.guides.filter((guide) => guide.axis === "x");
    expect(xGuides).toEqual([{ axis: "x", value: 10, from: -30, to: 30 }]);
  });
  it("snaps the centre, and each edge, to a reference point, which is a box with no size", () => {
    const point = box(40, 40, 15, 15);
    // A 20 wide part whose centre (at x = 39.6) is close to the point's x of 40.
    const centre = objectSnapOffset(box(29.6, 49.6, 0, 10), [point], 1);
    expect(centre.dx).toBeCloseTo(0.4);
    // Its right edge (at 29.6 + 20 = 49.6 here shifted) can snap too: edge at 40.3 -> 40.
    const edge = objectSnapOffset(box(20.3, 40.3, 0, 10), [point], 1);
    expect(edge.dx).toBeCloseTo(-0.3);
    // z: the box 8..22 has its centre at 15, exactly on the point already.
    expect(objectSnapOffset(box(100, 120, 8, 22), [point], 1).dz).toBeCloseTo(0);
    expect(edge.guides.some((guide) => guide.axis === "x" && Math.abs(guide.value - 40) < 1e-6)).toBe(true);
  });
});

describe("a side handle snaps to other bodies and walls (Discussion #1647)", () => {
  // A part 20 wide standing with its left side at 0, inside a case whose inner wall is at 84.6.
  const wall = { value: 84.6, from: -10, to: 10 };

  it("pulls the dragged side onto a wall within reach, off the grid", () => {
    const hit = snapResizeEdge({ anchor: 0, direction: 1, size: 84, symmetric: false }, [wall], 1, 0.1);
    expect(hit?.size).toBeCloseTo(84.6, 9);
    expect(hit?.target).toBe(wall);
  });

  it("leaves the size alone when nothing is within reach", () => {
    expect(snapResizeEdge({ anchor: 0, direction: 1, size: 80, symmetric: false }, [wall], 1, 0.1)).toBeNull();
  });

  it("moves only the dragged side: the anchored side stays, also when growing the other way", () => {
    // Dragging the left side out to a wall at -30 while the right side stays at 20: 50 wide.
    const hit = snapResizeEdge({ anchor: 20, direction: -1, size: 49.4, symmetric: false }, [{ value: -30, from: 0, to: 0 }], 1, 0.1);
    expect(hit?.size).toBeCloseTo(50, 9);
  });

  it("with Alt grows from the middle, so the size is twice the way from the middle to the target", () => {
    const hit = snapResizeEdge({ anchor: 10, direction: 1, size: 149, symmetric: true }, [wall], 1, 0.1);
    expect(hit?.size).toBeCloseTo(149.2, 9);
  });

  it("takes the nearest of several targets and none that would leave too small a body", () => {
    const near = { value: 41, from: 0, to: 0 };
    const far = { value: 39.5, from: 0, to: 0 };
    expect(snapResizeEdge({ anchor: 0, direction: 1, size: 40.6, symmetric: false }, [far, near], 1, 0.1)?.target).toBe(near);
    expect(snapResizeEdge({ anchor: 0, direction: 1, size: 0.3, symmetric: false }, [{ value: 0.05, from: 0, to: 0 }], 1, 0.1)).toBeNull();
  });

  it("offers the edges and middles of other bodies along the dragged axis, and a guide over both", () => {
    const targets = boxEdgeTargets([box(10, 30, -5, 5)], "x");
    expect(targets.map((target) => target.value)).toEqual([10, 20, 30]);
    expect(targets[0]).toMatchObject({ from: -5, to: 5 });
    expect(boxEdgeTargets([box(10, 30, -5, 5)], "z").map((target) => target.value)).toEqual([-5, 0, 5]);
    expect(edgeSnapGuide("x", wall, -20, 4)).toEqual({ axis: "x", value: 84.6, from: -20, to: 10 });
  });
});
