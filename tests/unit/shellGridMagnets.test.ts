import { describe, expect, it } from "vitest";
import { magnetsGridLeastSize, magnetsMeetGridCells, shellGridCellsOf } from "@/lib/shellGridMagnets";
import type { LidShapeMagnets } from "@/lib/lidTool";
import type { WorkplaneShape } from "@/types/layerling";

const body = { x: 0, z: 0, edgeTreatmentHistory: [{ feature: { kind: "shell", amount: 2, shellGrid: { cells: 999 } } }] } as unknown as WorkplaneShape;
/** A magnet post of 8 mm in each inner corner of a box `width` x `depth` with a 2 mm wall. */
const posts = (width: number, depth: number): LidShapeMagnets => ({
  pockets: [],
  posts: [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => ({ kind: "cylinder", x: sx * (width / 2 - 2 - 4), z: sz * (depth / 2 - 2 - 4), width: 8, depth: 8 }) as unknown as WorkplaneShape),
});

describe("magnets in the corners of a box with a Gridfinity floor", () => {
  it("counts the cells of the floor for the box's size", () => {
    expect(shellGridCellsOf(130.5, 88.5, 2, 999)).toHaveLength(6);
    expect(shellGridCellsOf(130.5, 88.5, 2, 4)).toHaveLength(4);
    expect(shellGridCellsOf(10, 10, 2, 999)).toHaveLength(0);
  });

  it("meets a cell when the box is just as large as the cells need, and none when it has room", () => {
    expect(magnetsMeetGridCells(body, posts(130.5, 88.5), 130.5, 88.5)).toBe(true);
    expect(magnetsMeetGridCells(body, posts(160, 110), 160, 110)).toBe(false);
    // Fewer cells (the floor takes the 4 nearest the middle) leave the corners free.
    const fewer = { ...body, edgeTreatmentHistory: [{ feature: { kind: "shell", amount: 2, shellGrid: { cells: 2 } } }] } as unknown as WorkplaneShape;
    expect(magnetsMeetGridCells(fewer, posts(130.5, 88.5), 130.5, 88.5)).toBe(false);
  });

  it("does not take the posts drawn as one mesh for all four corners as one huge post; their pockets count", () => {
    // A box of 117 x 112 with 2 x 2 cells and 8 x 3 magnets: the pockets' walls reach 10.6 mm in, the cells begin 16.75 and 14.25 mm in.
    const two = { ...body, edgeTreatmentHistory: [{ feature: { kind: "shell", amount: 2, shellGrid: { cells: 999 } } }] } as unknown as WorkplaneShape;
    const at = (x: number, z: number) => ({ kind: "cylinder", x, z, width: 8.2, depth: 8.2 }) as unknown as WorkplaneShape;
    const pockets = [at(-53.2, 50.7), at(53.2, 50.7), at(53.2, -50.7), at(-53.2, -50.7)];
    const mesh = { kind: "mesh", x: 0, z: 0, width: 117, depth: 112 } as unknown as WorkplaneShape;
    expect(magnetsMeetGridCells(two, { pockets, posts: [mesh] }, 117, 112)).toBe(false);
    // In a box just large enough for the cells they do meet them.
    const tight = [at(-37.9, 37.9), at(37.9, 37.9), at(37.9, -37.9), at(-37.9, -37.9)];
    expect(magnetsMeetGridCells(two, { pockets: tight, posts: [mesh] }, 88.5, 88.5)).toBe(true);
  });

  it("says how large the box must be for the cells it has and the magnets asked for", () => {
    const two = { ...body, edgeTreatmentHistory: [{ feature: { kind: "shell", amount: 2, shellGrid: { cells: 999 } } }] } as unknown as WorkplaneShape;
    const pockets = (diameter: number) => [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => ({ kind: "cylinder", x: sx * 40, z: sz * 40, width: diameter + 0.2, depth: diameter + 0.2 }) as unknown as WorkplaneShape);
    // 2 x 2 cells in a box of 88.5: the same numbers the Lid tool gives for 6, 8 and 10 mm magnets.
    expect(magnetsGridLeastSize(two, { pockets: pockets(6), posts: [] }, 88.5, 88.5)).toEqual({ width: 98.3, depth: 98.3, columns: 2, rows: 2 });
    expect(magnetsGridLeastSize(two, { pockets: pockets(8), posts: [] }, 88.5, 88.5)).toEqual({ width: 101.7, depth: 101.7, columns: 2, rows: 2 });
    expect(magnetsGridLeastSize(two, { pockets: pockets(10), posts: [] }, 130.5, 88.5)).toEqual({ width: 147.1, depth: 105.1, columns: 3, rows: 2 });
    expect(magnetsGridLeastSize({ x: 0, z: 0 } as WorkplaneShape, { pockets: pockets(8), posts: [] }, 88.5, 88.5)).toBeNull();
  });

  it("has nothing to say about a body without a Gridfinity floor", () => {
    expect(magnetsMeetGridCells({ x: 0, z: 0 } as WorkplaneShape, posts(130.5, 88.5), 130.5, 88.5)).toBe(false);
  });
});
