import { describe, expect, it } from "vitest";
import { boxEdgeTargets, edgeSnapGuide, objectSnapOffset, snapResizeEdge, wallTargetsFromHits, wallsInBand, type SideWalls, type SnapBox } from "@/lib/objectSnap";

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

describe("moving snaps to the wall it runs into", () => {
  // A part 10.3 wide and 10 deep inside a box whose inner walls are at -38 and 38 on X, -28 and 28 on Z.
  const none = { min: [], max: [] };
  const walls = (side: Partial<SideWalls>): SideWalls => ({ x: none, z: none, ...side });
  const right = walls({ x: { min: [], max: [{ value: 38, from: -28, to: 28 }] } });

  it("pulls the side facing a wall onto it within the threshold, with nothing else to snap to", () => {
    const result = objectSnapOffset(box(27.1, 37.4, -5, 5), [], 1, right);
    expect(result.dx).toBeCloseTo(0.6, 9);
    expect(result.dz).toBeNull();
    expect(result.guides).toEqual([{ axis: "x", value: 38, from: -28, to: 28 }]);
  });

  it("pulls a side that went a little into the wall back out onto it", () => {
    expect(objectSnapOffset(box(28, 38.3, -5, 5), [], 1, right).dx).toBeCloseTo(-0.3, 9);
  });

  it("leaves a wall to the side facing it: neither the centre nor the far side is pulled onto it", () => {
    // The left side (37.6) and then the centre (37.75) are within reach of 38, but neither faces the wall.
    expect(objectSnapOffset(box(37.6, 47.9, -5, 5), [], 1, right).dx).toBeNull();
    expect(objectSnapOffset(box(32.6, 42.9, -5, 5), [], 1, right).dx).toBeNull();
  });

  it("pairs each of the four sides with its own walls only", () => {
    const left = walls({ x: { min: [{ value: -38, from: -28, to: 28 }], max: [] } });
    expect(objectSnapOffset(box(-38.4, -28.1, -5, 5), [], 1, left).dx).toBeCloseTo(0.4, 9);
    expect(objectSnapOffset(box(-48.4, -38.3, -5, 5), [], 1, left).dx).toBeNull();
    const front = walls({ z: { min: [], max: [{ value: 28, from: -38, to: 38 }] } });
    const back = walls({ z: { min: [{ value: -28, from: -38, to: 38 }], max: [] } });
    const nearFront = objectSnapOffset(box(-5, 5, 17.6, 27.6), [], 1, front);
    expect(nearFront.dz).toBeCloseTo(0.4, 9);
    expect(nearFront.dx).toBeNull();
    expect(objectSnapOffset(box(-5, 5, -28.5, -18.5), [], 1, back).dz).toBeCloseTo(0.5, 9);
    // A wall on Z never moves the part along X, even with an X line at the same value.
    expect(objectSnapOffset(box(27.6, 37.9, -5, 5), [], 1, walls({ z: { min: [], max: [{ value: 38, from: -38, to: 38 }] } })).dx).toBeNull();
  });

  it("takes the nearer of a wall and another body's edge, either way round", () => {
    // The box's outer edge at 40 (a body from 40 to 60) and its inner wall at 38.
    const outside = [box(40, 60, -5, 5)];
    expect(objectSnapOffset(box(28.6, 38.9, -5, 5), outside, 1.5, right).dx).toBeCloseTo(-0.9, 9);
    expect(objectSnapOffset(box(28.9, 39.2, -5, 5), outside, 1.5, right).dx).toBeCloseTo(0.8, 9);
  });

  it("snaps into a corner on both axes at once", () => {
    const corner = walls({ x: right.x, z: { min: [], max: [{ value: 28, from: -38, to: 38 }] } });
    const result = objectSnapOffset(box(27.3, 37.6, 17.7, 27.7), [], 1, corner);
    expect(result.dx).toBeCloseTo(0.4, 9);
    expect(result.dz).toBeCloseTo(0.3, 9);
    expect(result.guides.map((guide) => `${guide.axis}${guide.value}`).sort()).toEqual(["x38", "z28"]);
  });

  it("draws one guide along a wall the part already sits against, over both stretches", () => {
    const short = walls({ x: { min: [], max: [{ value: 38, from: 2, to: 6 }] } });
    expect(objectSnapOffset(box(27.7, 38, -5, 5), [], 1e-4, short).guides).toEqual([{ axis: "x", value: 38, from: -5, to: 6 }]);
    const low = walls({ x: { min: [], max: [{ value: 38, from: -8, to: 4 }] } });
    expect(objectSnapOffset(box(27.7, 38, -5, 5), [], 1e-4, low).guides).toEqual([{ axis: "x", value: 38, from: -8, to: 5 }]);
  });

  it("draws one guide where a wall and another body's edge lie on the same line", () => {
    const result = objectSnapOffset(box(27.7, 37.6, -5, 5), [box(38, 50, -20, 20)], 1, right);
    expect(result.guides.filter((guide) => guide.axis === "x")).toEqual([{ axis: "x", value: 38, from: -28, to: 28 }]);
  });

  it("snaps to other bodies as before when there are no walls", () => {
    expect(objectSnapOffset(box(21.2, 41.2, 50, 70), [box(0, 20, 0, 20)], 2, walls({}))).toEqual(objectSnapOffset(box(21.2, 41.2, 50, 70), [box(0, 20, 0, 20)], 2));
  });
});

describe("only walls beside the moving part count", () => {
  const all: SideWalls = {
    x: { min: [{ value: -38, from: -12, to: -5 }], max: [{ value: 38, from: 5, to: 5 }] },
    z: { min: [{ value: -28, from: -38, to: -10.01 }], max: [{ value: 28, from: -10, to: 0 }, { value: 30, from: 0.01, to: 12 }] },
  };

  it("keeps a wall whose stretch touches or crosses the part's own, and drops one just beside it on either side", () => {
    // The part spans -10..0 on X and -5..5 on Z: X walls are judged on Z, Z walls on X.
    expect(wallsInBand(all, box(-10, 0, -5, 5))).toEqual({
      x: { min: [{ value: -38, from: -12, to: -5 }], max: [{ value: 38, from: 5, to: 5 }] },
      z: { min: [], max: [{ value: 28, from: -10, to: 0 }] },
    });
  });

  it("keeps the guide of a wall on X when the part is also pulled along Z, out of that wall's stretch", () => {
    const short = { x: { min: [], max: [{ value: 38, from: 3, to: 5 }] }, z: { min: [], max: [{ value: 28, from: -38, to: 38 }] } };
    // Judged where the pointer is, the X wall is beside the part; the guide pass then sees the part snapped to 18..28.
    const kept = wallsInBand(short, box(27.6, 37.9, -6, 4));
    const snapped = objectSnapOffset(box(27.7, 38, 18, 28), [], 1e-4, kept);
    expect(snapped.guides.map((guide) => `${guide.axis}${guide.value}`).sort()).toEqual(["x38", "z28"]);
  });
});

describe("walls from the rays that crossed the scene", () => {
  const hit = (x: number, z: number, nx: number, nz = 0) => ({ point: { x, y: 5, z }, normal: { x: nx, y: 0, z: nz } });

  it("gives a face turned towards -X to the right side and one turned towards +X to the left side", () => {
    const walls = wallTargetsFromHits([hit(-40, 0, -1), hit(-38, 0, 1), hit(38, 0, -1), hit(40, 0, 1)], "x");
    expect(walls.max.map((wall) => wall.value)).toEqual([-40, 38]);
    expect(walls.min.map((wall) => wall.value)).toEqual([-38, 40]);
  });

  it("takes a sloped face such as a fillet, and leaves out a face seen exactly side-on", () => {
    const walls = wallTargetsFromHits([hit(30, 0, -0.05, 0.9987), hit(20, 0, -1e-4, 1)], "x");
    expect(walls.max.map((wall) => wall.value)).toEqual([30]);
    expect(walls.min).toEqual([]);
  });

  it("rounds to a hundredth and merges the hits of one wall into the stretch they span", () => {
    const walls = wallTargetsFromHits([hit(38.004, -4, -1), hit(37.998, 3, -1), hit(38.001, 1, -1)], "x");
    expect(walls.max).toEqual([{ value: 38, from: -4, to: 3 }]);
    expect(wallTargetsFromHits([hit(38.04, 0, -1), hit(38, 0, -1)], "x").max.map((wall) => wall.value)).toEqual([38, 38.04]);
  });

  it("works along Z with the stretch across X", () => {
    const walls = wallTargetsFromHits([hit(-2, 28, 0, -1), hit(6, 28.003, 0, -1)], "z");
    expect(walls.max).toEqual([{ value: 28, from: -2, to: 6 }]);
  });
});
