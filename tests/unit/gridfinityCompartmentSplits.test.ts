import manifoldModule, { type ManifoldToplevel } from "manifold-3d";
import { beforeAll, describe, expect, it } from "vitest";
import {
  GRIDFINITY_LIP_HEIGHT,
  gridfinityCompartmentLabel,
  gridfinityCompartmentLabelCell,
  gridfinityCompartmentParts,
  gridfinityCompartmentPartsMax,
  gridfinityCompartmentPieces,
  gridfinityCompartmentSplitPatch,
  gridfinityCompartments,
  gridfinityDividerBound,
  gridfinityLabelTextPlaces,
  gridfinityLabelledTriangles,
  gridfinityListPatch,
  gridfinityPlan,
  normalizeGridfinityCompartmentSplits,
} from "@/lib/gridfinityGeometry";
import { mcpGridfinityListParams } from "@/lib/mcpShapeSettings";
import { canonicalizeShape, workplaneShapesEqual } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * Single compartments of a Gridfinity bin split further into evenly spaced parts (#1799): the parts take the place of
 * their compartment, with dividers as the bin's between them, and the label, the scoops and the limits follow.
 */

type V = [number, number, number];

/** A bin of 2 x 1 x 3 units, 3 compartments across and 2 deep: each 26.4 x 19.2 mm inside, dividers 1.2 mm thick. */
const bin = (fields: Record<string, unknown> = {}) => ({ width: 83.5, depth: 41.5, height: 21 + GRIDFINITY_LIP_HEIGHT, gridfinityType: "bin" as const, gridfinityLip: true, gridfinityCompartmentsX: 3, gridfinityCompartmentsZ: 2, ...fields });
const round = (n: number) => Number(n.toFixed(9)) + 0;

function signedVolume(triangles: V[][]) {
  return triangles.reduce((sum, [a, b, c]) => sum + (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6, 0);
}

/** Every directed edge appears once and its reverse once: closed, consistently wound, two-manifold. */
function openEdges(triangles: V[][]) {
  const ids = new Map<string, number>();
  const id = (v: V) => {
    const key = v.map((n) => Math.round(n * 1e5)).join(",");
    if (!ids.has(key)) ids.set(key, ids.size);
    return ids.get(key)!;
  };
  const directed = new Map<string, number>();
  triangles.forEach((t) => {
    const [a, b, c] = t.map(id);
    for (const [p, q] of [[a, b], [b, c], [c, a]]) directed.set(`${p},${q}`, (directed.get(`${p},${q}`) ?? 0) + 1);
  });
  return [...directed].filter(([key, count]) => count !== 1 || directed.get(key.split(",").reverse().join(",")) !== 1).length;
}

describe("Gridfinity compartments split further (#1799)", () => {
  let runtime: ManifoldToplevel;

  beforeAll(async () => {
    runtime = await manifoldModule();
    runtime.setup();
  });

  it("builds a bin without splits as before, every compartment its own single part", () => {
    const cells = gridfinityCompartments(bin())!.cells;
    expect(cells).toHaveLength(6);
    cells.forEach((cell) => {
      expect(cell.part).toEqual({ column: 0, row: 0 });
      expect(cell.parts).toEqual({ x: 1, z: 1 });
    });
    expect(gridfinityLabelledTriangles(runtime, bin({ gridfinityCompartmentSplits: [] }))).toEqual(gridfinityLabelledTriangles(runtime, bin()));
  });

  it("puts a split compartment's parts in its place, evenly spaced with a divider between two", () => {
    const cells = gridfinityCompartments(bin({ gridfinityCompartmentSplits: [{ column: 1, row: 0, x: 2 }] }))!.cells;
    expect(cells).toHaveLength(7);
    const parts = cells.filter((cell) => cell.column === 1 && cell.row === 0);
    // 26.4 mm less a divider of 1.2 mm in two: 12.6 mm each, either side of the middle.
    expect(parts.map((cell) => [cell.centre.x, cell.centre.z, cell.hx, cell.hz].map(round))).toEqual([[-6.9, -10.2, 6.3, 9.6], [6.9, -10.2, 6.3, 9.6]]);
    expect(parts.map((cell) => cell.part)).toEqual([{ column: 0, row: 0 }, { column: 1, row: 0 }]);
    // The middle compartment lies against the back wall only; so do both its parts, and neither against the side walls.
    parts.forEach((cell) => expect(cell.onWall).toEqual({ back: true, front: false, left: false, right: false }));
    // The other compartments are as they were.
    expect(cells.filter((cell) => cell.column !== 1 || cell.row !== 0).map((cell) => [cell.centre.x, cell.centre.z].map(round))).toEqual([[-27.6, -10.2], [27.6, -10.2], [-27.6, 10.2], [0, 10.2], [27.6, 10.2]]);
  });

  it("splits a corner compartment both ways, the outer parts against the bin's walls", () => {
    const parts = gridfinityCompartments(bin({ gridfinityCompartmentSplits: [{ column: 0, row: 1, x: 2, z: 2 }] }))!.cells.filter((cell) => cell.column === 0 && cell.row === 1);
    expect(parts).toHaveLength(4);
    expect(parts.map((cell) => cell.onWall)).toEqual([
      { back: false, front: false, left: true, right: false },
      { back: false, front: false, left: false, right: false },
      { back: false, front: true, left: true, right: false },
      { back: false, front: true, left: false, right: false },
    ]);
    // 19.2 mm deep less a divider in two: 9 mm each.
    parts.forEach((cell) => expect(round(cell.hz)).toBe(4.5));
  });

  it("builds a closed mesh that holds the new dividers", () => {
    const whole = gridfinityLabelledTriangles(runtime, bin({ gridfinityScoopFront: true })) as V[][];
    const split = bin({ gridfinityScoopFront: true, gridfinityCompartmentSplits: [{ column: 1, row: 0, x: 3 }, { column: 2, row: 1, z: 2 }] });
    const mesh = gridfinityLabelledTriangles(runtime, split) as V[][];
    expect(openEdges(mesh)).toBe(0);
    // Two dividers 1.2 mm thick across a row and one along a compartment: at least their footprint times a few mm of height.
    expect(signedVolume(mesh) - signedVolume(whole)).toBeGreaterThan((2 * 19.2 + 26.4) * 1.2 * 5);
    const pieces = gridfinityCompartmentPieces(split)!;
    expect(pieces.cells).toHaveLength(9);
    // A front scoop in every part along the front, against the wall or the new divider alike.
    pieces.cells.forEach((cell) => expect(cell.scoops?.scoops.map((scoop) => scoop.wall)).toEqual(["front"]));
    expect(gridfinityDividerBound(gridfinityPlan(split), pieces)).toBeGreaterThan(gridfinityDividerBound(gridfinityPlan(bin({ gridfinityScoopFront: true })), gridfinityCompartmentPieces(bin({ gridfinityScoopFront: true }))!));
  });

  it("keeps each part 6 mm wide, at most 6 a way and 40 compartments in all", () => {
    // 26.4 mm across takes three parts of 6 mm with two dividers, not four.
    expect(gridfinityCompartmentParts(bin({ gridfinityCompartmentSplits: [{ column: 0, row: 0, x: 9 }] }), 0, 0)).toEqual({ x: 3, z: 1 });
    expect(gridfinityCompartmentPartsMax(bin(), 0, 0, "x")).toBe(3);
    expect(gridfinityCompartmentPartsMax(bin(), 0, 0, "z")).toBe(2);
    // A bin of 6 x 4 units with 8 x 5 compartments has its 40 already: no compartment is split further.
    const full = { width: 251.5, depth: 167.5, gridfinityCompartmentsX: 8, gridfinityCompartmentsZ: 5 };
    expect(gridfinityCompartments(bin({ ...full, gridfinityCompartmentSplits: [{ column: 0, row: 0, x: 2 }] }))!.cells).toHaveLength(40);
    expect(gridfinityCompartmentPartsMax(bin(full), 0, 0, "x")).toBe(1);
    // With 36, taken from the back left: the first keeps its 3 deep and is lowered to 1 across, which leaves 2 for the next.
    const near = bin({ ...full, gridfinityCompartmentsX: 9, gridfinityCompartmentsZ: 4, gridfinityCompartmentSplits: [{ column: 3, row: 2, x: 2 }, { column: 0, row: 0, x: 2, z: 3 }] });
    expect(gridfinityCompartments(near)!.cells).toHaveLength(39);
    expect(gridfinityCompartmentParts(near, 0, 0)).toEqual({ x: 1, z: 3 });
    expect(gridfinityCompartmentParts(near, 3, 2)).toEqual({ x: 2, z: 1 });
  });

  it("ignores a split of a compartment the bin does not have and the second entry for the same compartment", () => {
    const cells = gridfinityCompartments(bin({ gridfinityCompartmentSplits: [{ column: 5, row: 0, x: 2 }, { column: 0, row: 0, x: 2 }, { column: 0, row: 0, x: 3 }] }))!.cells;
    expect(cells).toHaveLength(7);
    expect(gridfinityCompartmentParts(bin({ gridfinityCompartmentsX: 1, gridfinityCompartmentsZ: 1, gridfinityCompartmentSplits: [{ column: 0, row: 0, x: 2 }] }), 0, 0)).toEqual({ x: 1, z: 1 });
  });

  it("stands a split compartment's label in the part along its side furthest left or back, with its text", () => {
    // A bin of 3 x 2 units: each compartment 40.4 x 40.2 mm inside, its parts about 19.6 mm each way, room for a label.
    const labelled = (side: "back" | "front" | "left" | "right") => bin({
      width: 125.5,
      depth: 83.5,
      gridfinityCompartmentSplits: [{ column: 1, row: 1, x: 2, z: 2 }],
      gridfinityCompartmentLabels: [{ column: 1, row: 1, side, text: "M3" }],
    });
    const at = { back: { column: 0, row: 0 }, front: { column: 0, row: 1 }, left: { column: 0, row: 0 }, right: { column: 1, row: 0 } } as const;
    for (const side of ["back", "front", "left", "right"] as const) {
      const shape = labelled(side);
      expect(gridfinityCompartmentLabelCell(shape, 1, 1, side)?.part, side).toEqual(at[side]);
      const withLabel = gridfinityCompartmentPieces(shape)!.cells.filter((cell) => cell.labels);
      expect(withLabel, side).toHaveLength(1);
      expect(withLabel[0].centre, side).toEqual(gridfinityCompartmentLabelCell(shape, 1, 1, side)!.centre);
      expect(gridfinityCompartmentLabel(shape, 1, 1)?.side, side).toBe(side);
      expect(gridfinityLabelTextPlaces(shape).map((place) => place.text), side).toEqual(["M3"]);
    }
  });

  it("writes a split as the settings window writes it, and none for a compartment made whole again", () => {
    const shape = bin({ gridfinityCompartmentSplits: [{ column: 2, row: 1, z: 2 }] });
    expect(gridfinityCompartmentSplitPatch(shape, 0, 0, "x", 3)).toStrictEqual({ gridfinityCompartmentSplits: [{ column: 0, row: 0, x: 3 }, { column: 2, row: 1, z: 2 }] });
    expect(gridfinityCompartmentSplitPatch(shape, 2, 1, "x", 2)).toStrictEqual({ gridfinityCompartmentSplits: [{ column: 2, row: 1, x: 2, z: 2 }] });
    expect(gridfinityCompartmentSplitPatch(shape, 2, 1, "z", 1)).toStrictEqual({ gridfinityCompartmentSplits: undefined });
  });

  it("reads splits from outside: whole numbers within 1 to 6, one per compartment, also as the text layerling_read_scene gives", () => {
    expect(normalizeGridfinityCompartmentSplits("no list")).toBeUndefined();
    expect(normalizeGridfinityCompartmentSplits([
      { column: 0, row: 0, x: 2.4, z: 9 },
      { column: 0, row: 0, x: 3 },
      { column: 1, row: 0, x: 1 },
      { column: -1, row: 0, x: 2 },
      { column: "a", row: 0, x: 2 },
      null,
      { column: 1.6, row: 1, z: 2 },
    ])).toStrictEqual([{ column: 0, row: 0, x: 2, z: 6 }, { column: 2, row: 1, z: 2 }]);
    const split = [{ column: 1, row: 0, x: 2 }];
    expect(gridfinityListPatch(mcpGridfinityListParams({ gridfinityCompartmentSplits: JSON.stringify(split) }))).toStrictEqual({ gridfinityCompartmentSplits: split });
    expect(gridfinityListPatch({ gridfinityCompartmentSplits: [] })).toStrictEqual({ gridfinityCompartmentSplits: undefined });
  });

  it("tells splits apart for undo and the scene", () => {
    const shape = canonicalizeShape({ id: "g", name: "bin", kind: "gridfinity", x: 0, z: 0, elevation: 0, size: 83.5, width: 83.5, depth: 41.5, height: 25.4, rotation: 0, color: "#4f7fa8", gridfinityType: "bin", gridfinityCompartmentsX: 3, gridfinityCompartmentSplits: [{ column: 1, row: 0, x: 2 }] } as WorkplaneShape);
    for (const change of [{ gridfinityCompartmentSplits: undefined }, { gridfinityCompartmentSplits: [{ column: 1, row: 0, x: 3 }] }, { gridfinityCompartmentSplits: [{ column: 1, row: 0, x: 2, z: 2 }] }, { gridfinityCompartmentSplits: [{ column: 2, row: 0, x: 2 }] }]) {
      expect(workplaneShapesEqual(shape, { ...shape, ...change }), JSON.stringify(change)).toBe(false);
    }
    expect(workplaneShapesEqual(shape, { ...shape, gridfinityCompartmentSplits: [{ column: 1, row: 0, x: 2 }] })).toBe(true);
  });
});
