import { describe, expect, it } from "vitest";
import { alignAxesForWorkplane } from "@/lib/alignFrame";
import { ALIGN_PLATE_ID, alignPlateShape, distributedShapesForSelection, distributionState } from "@/lib/alignDistribute";
import { alignBounds } from "@/lib/alignSize";
import { meshAabb } from "@/lib/editorMeshCore";
import type { PlacementWorkplane } from "@/lib/placementWorkplane";
import type { AlignAxis, WorkplaneShape } from "@/types/layerling";

function box(id: string, x: number, z: number, width = 10, depth = width, height = 10, extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return { id, name: id, kind: "box", color: "#888888", x, z, elevation: 0, size: Math.max(width, depth), width, depth, height, rotation: 0, ...extra } as WorkplaneShape;
}

function spread(shapes: WorkplaneShape[], axis: AlignAxis = "x", anchorId: string | null = null, gap: number | null = null) {
  return distributedShapesForSelection(shapes, shapes, anchorId, axis, null, gap);
}

const byId = (shapes: WorkplaneShape[], id: string) => shapes.find((shape) => shape.id === id)!;
const left = (shapes: WorkplaneShape[], id: string) => meshAabb(byId(shapes, id)).minX;
const right = (shapes: WorkplaneShape[], id: string) => meshAabb(byId(shapes, id)).maxX;

describe("equal gaps", () => {
  it("keeps the outer parts and spreads the ones between, whatever their size", () => {
    // a 0..10, b 12..32 (20 wide), c 34..39 (5 wide), d 90..100: 90 - 10 - 25 = 55 of room in three gaps.
    const shapes = [box("a", 5, 0), box("b", 22, 0, 20), box("c", 36.5, 0, 5), box("d", 95, 0)];
    const result = spread(shapes);
    expect(result.problem).toBeNull();
    expect(result.moved).toBe(2);
    const gap = 55 / 3;
    expect(result.gaps[0]).toBeCloseTo(gap, 6);
    expect(byId(result.nextShapes, "a")).toBe(shapes[0]);
    expect(byId(result.nextShapes, "d")).toBe(shapes[3]);
    expect(left(result.nextShapes, "b") - right(result.nextShapes, "a")).toBeCloseTo(gap, 6);
    expect(left(result.nextShapes, "c") - right(result.nextShapes, "b")).toBeCloseTo(gap, 6);
    expect(left(result.nextShapes, "d") - right(result.nextShapes, "c")).toBeCloseTo(gap, 6);
    // Nothing moves across the axis.
    expect(byId(result.nextShapes, "b").z).toBe(0);
  });

  it("goes by the order along the axis, not the order of the selection", () => {
    const shapes = [box("far", 95, 0), box("mid", 20, 0, 6), box("near", 5, 0)];
    const result = spread(shapes);
    // 0..10 and 90..100 stay; the 6 wide part comes to the middle: 47..53.
    expect(left(result.nextShapes, "mid")).toBeCloseTo(47, 6);
  });

  it("says when the gaps are already equal, and needs three parts", () => {
    const even = [box("a", 5, 0), box("b", 25, 0), box("c", 45, 0)];
    expect(spread(even).moved).toBe(0);
    expect(spread(even).problem).toBeNull();
    expect(distributionState(even, null, "x")).toEqual({ problem: null, equal: true, wouldMove: false });
    expect(spread([box("a", 5, 0), box("b", 50, 0)]).problem).toBe("tooFew");
  });

  it("moves nothing when the parts are longer than the room between the outer ones", () => {
    const result = spread([box("a", 5, 0), box("b", 15, 0, 30), box("c", 30, 0)]);
    expect(result.problem).toBe("noRoom");
    expect(result.moved).toBe(0);
  });

  it("does not move a locked part or the anchor between the outer ones", () => {
    const shapes = [box("a", 5, 0), box("b", 20, 0, 10, 10, 10, { locked: true }), box("c", 95, 0)];
    expect(spread(shapes).problem).toBe("lockedBetween");
    expect(spread([box("a", 5, 0), box("b", 20, 0), box("c", 95, 0)], "x", "b").problem).toBe("lockedBetween");
    // An anchor at the end is fine: it stays anyway.
    expect(spread([box("a", 5, 0), box("b", 20, 0), box("c", 95, 0)], "x", "c").moved).toBe(1);
  });

  it("finds a board under the parts by itself and leaves the same gap at its edges", () => {
    // Tray 0..100, pieces 10, 20 and 30 wide: 40 of room in four gaps of 10.
    const tray = box("tray", 50, 0, 100, 60, 5);
    const shapes = [tray, box("p1", 20, 0, 10), box("p2", 40, 0, 20), box("p3", 60, 0, 30)];
    const result = spread(shapes);
    expect(result.frameId).toBe("tray");
    expect(byId(result.nextShapes, "tray")).toBe(tray);
    expect(left(result.nextShapes, "p1")).toBeCloseTo(10, 6);
    expect(left(result.nextShapes, "p2")).toBeCloseTo(30, 6);
    expect(left(result.nextShapes, "p3")).toBeCloseTo(60, 6);
    expect(result.gaps[0]).toBeCloseTo(10, 6);
  });

  it("puts a single part on a board in its middle, and the clicked board counts too", () => {
    const shapes = [box("tray", 50, 0, 100, 60, 5), box("p", 12, 3, 20)];
    const result = spread(shapes, "x", "tray");
    expect(left(result.nextShapes, "p")).toBeCloseTo(40, 6);
    expect(byId(result.nextShapes, "p").z).toBe(3);
  });

  it("spreads a peg puzzle's rows each on its own", () => {
    // A tray 0..120 by 0..90 with three rows of animals of different widths, each row in its own band.
    const tray = box("tray", 60, 45, 120, 90, 5);
    const rows = [
      [box("cat", 10, 15, 20, 16), box("dog", 40, 15, 30, 18), box("cow", 80, 15, 25, 20)],
      [box("hen", 12, 45, 14, 14), box("pig", 30, 45, 22, 16), box("fox", 55, 45, 18, 12), box("owl", 90, 45, 16, 14)],
      [box("cow2", 20, 75, 26, 18), box("eel", 50, 75, 34, 10), box("bee", 100, 75, 12, 12)],
    ];
    const shapes = [tray, ...rows.flat()];
    const result = spread(shapes);
    expect(result.problem).toBeNull();
    expect(result.gaps).toHaveLength(3);
    for (const row of rows) {
      const ids = row.map((shape) => shape.id);
      const edges = [0, ...ids.flatMap((id) => [left(result.nextShapes, id), right(result.nextShapes, id)]), 120];
      const gaps = edges.reduce<number[]>((list, value, index) => (index % 2 === 1 ? [...list, value - edges[index - 1]] : list), []);
      gaps.forEach((gap) => expect(gap).toBeCloseTo(gaps[0], 6));
      // Every part keeps its row.
      row.forEach((shape) => expect(byId(result.nextShapes, shape.id).z).toBe(shape.z));
    }
  });

  it("spreads the same puzzle's rows as wholes from front to back", () => {
    // The animals stand in no clean columns, so each row moves as one block: rows 7..25, 37..53 and 66..84 (z),
    // 18 + 16 + 18 = 52 deep in a tray 90 deep: four gaps of 9.5.
    const tray = box("tray", 60, 45, 120, 90, 5);
    const rows = [
      [box("cat", 10, 16, 20, 16), box("dog", 40, 16, 30, 18), box("cow", 80, 16, 25, 18)],
      [box("hen", 12, 45, 14, 14), box("pig", 30, 45, 22, 16), box("fox", 55, 45, 18, 12), box("owl", 90, 45, 16, 14)],
      [box("cow2", 20, 75, 26, 18), box("eel", 50, 75, 34, 10), box("bee", 100, 75, 12, 12)],
    ];
    const shapes = [tray, ...rows.flat()];
    const result = spread(shapes, "z");
    expect(result.problem).toBeNull();
    expect(result.gaps).toHaveLength(1);
    expect(result.gaps[0]).toBeCloseTo(9.5, 6);
    const front = (id: string) => meshAabb(byId(result.nextShapes, id)).minZ;
    // The first row's front edge comes to 9.5, the second's to 9.5 + 18 + 9.5 = 37, the third's to 37 + 16 + 9.5.
    expect(Math.min(...rows[0].map((shape) => front(shape.id)))).toBeCloseTo(9.5, 6);
    expect(Math.min(...rows[1].map((shape) => front(shape.id)))).toBeCloseTo(37, 6);
    expect(Math.min(...rows[2].map((shape) => front(shape.id)))).toBeCloseTo(62.5, 6);
    // A row moves as a whole: its parts keep their places to each other, and nothing moves sideways.
    expect(byId(result.nextShapes, "cat").z - byId(result.nextShapes, "dog").z).toBeCloseTo(0, 6);
    rows.flat().forEach((shape) => expect(byId(result.nextShapes, shape.id).x).toBe(shape.x));
  });

  it("moves parts side by side as one block when a third part joins their rows", () => {
    // tall lies in both left parts and joins the two rows, so they would come to stand on top of each other:
    // t1 and b1, side by side, become one block 0..10; tall, lying in them, is spread apart like a heap.
    const shapes = [
      box("t1", 5, 0), box("t2", 30, 0), box("t3", 200, 0),
      box("b1", 5, 30), box("b2", 40, 30), box("b3", 200, 30),
      box("tall", 6, 15, 8, 40),
    ];
    const result = spread(shapes);
    expect(result.problem).toBeNull();
    expect(result.gaps).toHaveLength(1);
    // Blocks 0..10, tall 2..10, t2 25..35, b2 35..45 and 195..205: 195 - 10 - 28 = 157 of room in four gaps.
    const gap = 157 / 4;
    expect(result.gaps[0]).toBeCloseTo(gap, 6);
    expect(left(result.nextShapes, "tall")).toBeCloseTo(10 + gap, 6);
    expect(left(result.nextShapes, "t2")).toBeCloseTo(18 + 2 * gap, 6);
    expect(left(result.nextShapes, "b2")).toBeCloseTo(28 + 3 * gap, 6);
    expect(byId(result.nextShapes, "t1")).toBe(shapes[0]);
    expect(byId(result.nextShapes, "b1")).toBe(shapes[3]);
  });

  it("takes parts in a staggered line as one row", () => {
    const shapes = [box("a", 5, 0), box("b", 20, 20), box("c", 95, 40)];
    const result = spread(shapes);
    expect(result.gaps).toHaveLength(1);
    expect(left(result.nextShapes, "b")).toBeCloseTo(45, 6);
    expect(byId(result.nextShapes, "b").z).toBe(20);
  });

  it("lines the parts up a typed gap apart from the first one, or from the anchor", () => {
    const shapes = [box("a", 5, 0), box("b", 40, 0, 20), box("c", 95, 0)];
    const result = spread(shapes, "x", null, 5);
    expect(right(result.nextShapes, "a")).toBeCloseTo(10, 6);
    expect(left(result.nextShapes, "b")).toBeCloseTo(15, 6);
    expect(left(result.nextShapes, "c")).toBeCloseTo(40, 6);
    const anchored = spread(shapes, "x", "c", 5);
    expect(left(anchored.nextShapes, "c")).toBeCloseTo(90, 6);
    expect(right(anchored.nextShapes, "b")).toBeCloseTo(85, 6);
    expect(right(anchored.nextShapes, "a")).toBeCloseTo(60, 6);
    // Two parts are enough for a typed gap.
    expect(spread([box("a", 5, 0), box("b", 50, 0)], "x", null, 2).moved).toBe(1);
  });

  it("centres the row on a board with a typed gap, and refuses what does not fit", () => {
    const shapes = [box("tray", 50, 0, 100, 60, 5), box("p1", 10, 0, 10), box("p2", 80, 0, 20)];
    const result = spread(shapes, "x", null, 10);
    // 10 + 10 + 20 = 40, centred on 50: 30..40 and 50..70.
    expect(left(result.nextShapes, "p1")).toBeCloseTo(30, 6);
    expect(left(result.nextShapes, "p2")).toBeCloseTo(50, 6);
    expect(spread(shapes, "x", null, 80).problem).toBe("noRoom");
  });

  it("spreads the parts over the whole plate when the plate is the reference", () => {
    // A plate 200 x 200 round the origin; parts 10, 20 and 30 wide crowded on the left: 140 of room, gaps of 35.
    const parts = [box("a", -90, 0, 10), box("b", -70, 10, 20), box("c", -40, -10, 30)];
    const selection = [...parts, alignPlateShape(200, 200)];
    const result = distributedShapesForSelection(parts, selection, ALIGN_PLATE_ID, "x");
    expect(result.frameId).toBe(ALIGN_PLATE_ID);
    expect(result.gaps[0]).toBeCloseTo(35, 6);
    expect(left(result.nextShapes, "a")).toBeCloseTo(-65, 6);
    expect(left(result.nextShapes, "b")).toBeCloseTo(-20, 6);
    expect(left(result.nextShapes, "c")).toBeCloseTo(35, 6);
    // The plate is in no design: only the parts come back.
    expect(result.nextShapes).toHaveLength(3);
  });

  it("spreads upwards too", () => {
    const shapes = [box("a", 0, 0), box("b", 0, 0, 10, 10, 4, { elevation: 12 }), box("c", 0, 0, 10, 10, 10, { elevation: 50 })];
    const result = spread(shapes, "y");
    // 0..10 and 50..60 stay; the 4 high part comes to 28..32.
    expect(byId(result.nextShapes, "b").elevation).toBeCloseTo(28, 6);
  });

  it("spreads along a workplane's axes", () => {
    const s = Math.SQRT1_2;
    const workplane = { origin: { x: 0, y: 5, z: 0 }, normal: { x: 0, y: 1, z: 0 }, xAxis: { x: s, y: 0, z: s }, zAxis: { x: s, y: 0, z: -s } } as unknown as PlacementWorkplane;
    const axes = alignAxesForWorkplane(workplane);
    expect(axes).not.toBeNull();
    // Three cubes turned 45° along the diagonal, at 0, 4 and 30 along it.
    const at = (id: string, along: number) => box(id, along * s, along * s, 10, 10, 10, { rotation: 45 });
    const shapes = [at("a", 0), at("b", 4), at("c", 30)];
    const result = distributedShapesForSelection(shapes, shapes, null, "x", axes);
    expect(result.moved).toBe(1);
    const middle = (id: string) => {
      const bounds = alignBounds(byId(result.nextShapes, id), axes);
      return (bounds.minX + bounds.maxX) / 2;
    };
    expect(middle("b")).toBeCloseTo(15, 4);
  });
});
