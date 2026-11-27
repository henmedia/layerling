import manifoldModule, { type ManifoldToplevel } from "manifold-3d";
import { beforeAll, describe, expect, it } from "vitest";
import { shapeGeometrySignature } from "@/components/workplane/viewportShapeObjects";
import { cadModifierGridfinityForShape } from "@/lib/cadProfileExtrusion";
import { editorHistoryEntry } from "@/lib/editorHistory";
import { mcpShapeSummary } from "@/lib/editorMcpSummary";
import {
  createGridfinityGeometry,
  gridfinityFootprintPatch,
  gridfinityHasPuzzle,
  gridfinityLabelledTriangles,
  gridfinityPlan,
  gridfinityPlatePieces,
  gridfinityPlateSplit,
  gridfinityPlateSplitsWithClips,
  gridfinityPlateSplitsWithPuzzle,
  gridfinityPlateToWorld,
  gridfinityPuzzleParts,
  gridfinityPuzzleReach,
  gridfinityPuzzleSides,
  gridfinityTriangles,
  gridfinityUnits,
} from "@/lib/gridfinityGeometry";
import { exportLylProject, importLylProject } from "@/lib/lylProject";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";
import { mcpGridfinityPatch } from "@/lib/mcpShapeSettings";
import { weldMeshVertices } from "@/lib/objExport";
import { sceneShape } from "@/lib/shapeCatalog";
import { shapeDefaultsFromShape } from "@/lib/shapeDefaults";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE, normalizeShapeCustomizations } from "@/lib/workplaneSettings";
import { canonicalizeShape, workplaneShapesEqual } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * GridFlock's intersection puzzle (yawkat/GridFlock, MIT) on a Gridfinity baseplate: the sides it is on, how far it
 * reaches past the plate, the mesh it makes, and a plate split to fit the printer joined by it.
 */

type Triangle = [number, number, number][];
const ALL = ["back", "front", "left", "right"] as const;
const plate = (fields: Record<string, unknown> = {}) => ({ width: 84, depth: 42, height: 5, gridfinityType: "baseplate" as const, ...fields });
/** A puzzle plate with its box taking the puzzle in, as canonicalizeShape keeps it. */
const puzzled = (fields: Record<string, unknown> = {}) => {
  const raw = plate({ gridfinityPuzzle: true, ...fields });
  return { ...raw, ...gridfinityFootprintPatch(raw) };
};
const shapeOf = (fields: Record<string, unknown>) => ({ id: "g", name: "plate", kind: "gridfinity", x: 0, z: 0, elevation: 0, size: 84, rotation: 0, color: "#4f7fa8", ...plate(fields) }) as WorkplaneShape;

let runtime: ManifoldToplevel;
beforeAll(async () => {
  runtime = await manifoldModule();
  runtime.setup();
  rememberManifoldRuntime(runtime);
});

/** A mesh as a Manifold, moved dx along x. */
function solidOf(triangles: Triangle[], dx = 0) {
  const positions = triangles.flat().flatMap(([x, y, z]) => [x + dx, y, z]);
  const mesh = new runtime.Mesh({ numProp: 3, vertProperties: new Float32Array(positions), triVerts: new Uint32Array(positions.length / 3).map((_, k) => k) });
  mesh.merge();
  return new runtime.Manifold(mesh);
}

/**
 * How many edges of a mesh are not on exactly two faces, one each way: its triangles' corners taken as they are, as an
 * STL is written, or welded within the 3MF export's tolerance (weldMeshVertices).
 */
function edgeProblems(geometry: ReturnType<typeof createGridfinityGeometry>, welded: boolean) {
  const position = geometry.getAttribute("position");
  const corners = geometry.index ? Array.from(geometry.index.array) : Array.from({ length: position.count }, (_, k) => k);
  const vertices = Array.from({ length: position.count }, (_, k): Triangle[number] => [position.getX(k), position.getY(k), position.getZ(k)]);
  const faces = Array.from({ length: corners.length / 3 }, (_, t): [number, number, number] => [corners[3 * t], corners[3 * t + 1], corners[3 * t + 2]]);
  const mesh = welded ? weldMeshVertices({ name: "plate", vertices, faces }) : { vertices, faces };
  const ids = new Map<string, number>();
  const id = (k: number) => {
    const key = mesh.vertices[k].join(",");
    if (!ids.has(key)) ids.set(key, ids.size);
    return ids.get(key)!;
  };
  const directed = new Map<string, number>();
  mesh.faces.forEach((face) => {
    const [a, b, c] = face.map(id);
    for (const [p, q] of [[a, b], [b, c], [c, a]]) if (p !== q) directed.set(`${p}>${q}`, (directed.get(`${p}>${q}`) ?? 0) + 1);
  });
  let problems = 0;
  directed.forEach((count, key) => {
    const [p, q] = key.split(">");
    if (count !== 1 || directed.get(`${q}>${p}`) !== 1) problems += 1;
  });
  return problems;
}

describe("gridfinity GridFlock puzzle", () => {
  it("is on the sides a baseplate lists that have no padding, and on none of a whole plate unless listed", () => {
    expect(gridfinityPuzzleSides(plate({ gridfinityPuzzle: true }))).toEqual({ back: false, front: false, left: false, right: false });
    expect(gridfinityPuzzleSides(plate({ gridfinityPuzzle: true, gridfinityPuzzleSides: ["right", "back"], gridfinityPaddingBack: 5 }))).toEqual({ back: false, front: false, left: false, right: true });
    expect(gridfinityPuzzleSides(plate({ gridfinityPuzzle: false, gridfinityPuzzleSides: ALL }))).toEqual({ back: false, front: false, left: false, right: false });
    expect(gridfinityPuzzleSides({ ...plate({ gridfinityPuzzle: true, gridfinityPuzzleSides: ALL }), gridfinityType: "bin" })).toEqual({ back: false, front: false, left: false, right: false });
    expect(gridfinityHasPuzzle(gridfinityPlan(plate({ gridfinityPuzzle: true })))).toBe(false);
    expect(gridfinityHasPuzzle(gridfinityPlan(puzzled({ gridfinityPuzzleSides: ["left"] })))).toBe(true);
  });

  it("reaches past the plate by a tab's head at the back and right and a socket's fingers at the front and left, its box taking that in", () => {
    // The fit is 0.7 unless set (printed pieces in PLA and PETG held at 0.5, and a little better at 0.7); GridFlock's own default is 1.
    expect(gridfinityPuzzleReach(plate({ gridfinityPuzzle: true, gridfinityPuzzleSides: ALL }))).toEqual({ back: 1.19, right: 1.19, front: 0.48, left: 0.48 });
    expect(gridfinityPuzzleReach(plate({ gridfinityPuzzle: true, gridfinityPuzzleSides: ALL, gridfinityPuzzleFit: 1 }))).toEqual({ back: 1.19, right: 1.19, front: 0.58, left: 0.58 });
    // Looser, the fingers reach less far round the tab's neck; the tab stays as wide.
    expect(gridfinityPuzzleReach(plate({ gridfinityPuzzle: true, gridfinityPuzzleSides: ALL, gridfinityPuzzleFit: 0 }))).toEqual({ back: 1.19, right: 1.19, front: 0.26, left: 0.26 });
    const shape = puzzled({ gridfinityPuzzleSides: ALL });
    expect(shape).toMatchObject({ width: 85.67, depth: 43.67, height: 5 });
    expect(gridfinityUnits(shape)).toEqual({ x: 2, z: 1, y: 1 });
    const plan = gridfinityPlan(shape);
    expect(plan.size).toEqual({ width: 84, depth: 42, height: 5 });
    expect(plan.box).toEqual({ width: 85.67, depth: 43.67 });
    expect(plan.offset).toEqual({ x: -0.355, z: 0.355 });
    // The drawn plate fills its box, the reach rounded up to 0.01 mm: the body set off its middle by the offset.
    const geometry = createGridfinityGeometry(shape);
    geometry.computeBoundingBox();
    const { min, max } = geometry.boundingBox!;
    [min.x + 42.835, max.x - 42.835, min.z + 21.835, max.z - 21.835].forEach((d) => expect(Math.abs(d)).toBeLessThan(0.02));
  });

  it("draws one closed solid, the tabs added and the sockets cut, whatever sides, padding, fit or other cuts the plate has", () => {
    for (const fields of [
      { gridfinityPuzzleSides: ALL },
      { width: 42, depth: 42, gridfinityPuzzleSides: ["right"] },
      { width: 42, depth: 42, gridfinityPuzzleSides: ["left"] },
      { width: 136, depth: 94, gridfinityPaddingLeft: 10, gridfinityPaddingBack: 10, gridfinityPuzzleSides: ALL },
      { width: 84, depth: 84, gridfinityPuzzleSides: ALL, gridfinityPuzzleFit: 0 },
      { width: 84, depth: 84, gridfinityPuzzleSides: ["back", "right"], gridfinitySwallowtail: true },
      { width: 84, depth: 84, gridfinityPuzzleSides: ALL, gridfinityClipNotches: true },
      { width: 84, depth: 84, gridfinityPuzzleSides: ALL, gridfinityCornerRadius: 1 },
    ]) {
      const shape = puzzled(fields);
      const parts = gridfinityPuzzleParts(gridfinityPlan(shape));
      expect(parts.cuts.length).toBeGreaterThan(0);
      const solid = solidOf(gridfinityLabelledTriangles(runtime, shape) as Triangle[]);
      expect(solid.status()).toBe("NoError");
      expect(solid.decompose()).toHaveLength(1);
      expect(solid.volume()).not.toBeCloseTo(solidOf(gridfinityTriangles({ ...shape, gridfinityPuzzle: false }) as Triangle[]).volume(), 1);
    }
  });

  it("has every edge of its mesh on two faces, unwelded as an STL has it and welded as a 3MF does (#2145)", () => {
    // The two pieces of 6 x 2 units split on an A1 mini, and plates with the puzzle on other sides, at other fits, beside
    // padding, half cells, Swallowtail pockets and clip notches, and with other corners: where the tabs and the square
    // corners' fills meet the sockets' tops, Manifold left pairs of sheets touching along the socket's chamfer.
    const shape = shapeOf({ width: 252, depth: 84, gridfinityPuzzle: true });
    const pieces = gridfinityPlatePieces(shape, gridfinityPlateSplit(shape, { width: 180, depth: 180 })!, "Gridfinity", (() => { let n = 0; return () => `piece${(n += 1)}`; })(), () => []);
    const plates: Array<Record<string, unknown>> = [...pieces];
    for (const sides of [["right"], ["left"], ["back"], ["front"], ["back", "right"], ALL]) {
      for (const fit of [0, 0.7, 1]) plates.push(puzzled({ width: 126, depth: 84, gridfinityPuzzleSides: sides, gridfinityPuzzleFit: fit }));
    }
    for (const fields of [{ gridfinityCornerRadius: 0 }, { gridfinityCornerRadius: 1 }, { gridfinitySwallowtail: true }, { gridfinityClipNotches: true }, { gridfinityPaddingLeft: 10, gridfinityPaddingBack: 10 }, { gridfinityPaddingRight: 3 }, { gridfinityHalfCells: true, gridfinityPaddingLeft: 21 }, { width: 42, depth: 42 }, { width: 252 }]) {
      for (const sides of [["right"], ["left"], ALL]) plates.push(puzzled({ width: 126, depth: 84, gridfinityPuzzleSides: sides, ...fields }));
    }
    for (const fields of plates) {
      const geometry = createGridfinityGeometry(fields);
      const label = JSON.stringify(Object.fromEntries(Object.entries(fields).filter(([key]) => key.startsWith("gridfinity") || key === "width" || key === "depth")));
      expect(edgeProblems(geometry, false), label).toBe(0);
      expect(edgeProblems(geometry, true), label).toBe(0);
      geometry.dispose();
    }
  });

  it("keeps its parts beside half cells in the padding, the end of a side reaching in beside a half socket (Discussion #2078)", () => {
    // The puzzle on the front with a row along the left, and on the left with a row along the back: at the end of the
    // side the other half of a connector lies in the padding, beside the row's last half socket, as beside a neighbour's.
    for (const [fields, cells] of [
      [{ width: 109, depth: 42, gridfinityPaddingLeft: 25, gridfinityPuzzleSides: ["front"] }, 2],
      [{ width: 84, depth: 63, gridfinityPaddingBack: 21, gridfinityPuzzleSides: ["left"] }, 4],
    ] as const) {
      const shape = puzzled({ ...fields, gridfinityHalfCells: true });
      const plain = { ...shape, gridfinityHalfCells: false };
      expect(gridfinityPlan(shape).halfCells).toHaveLength(cells);
      expect(gridfinityPuzzleParts(gridfinityPlan(shape))).toStrictEqual(gridfinityPuzzleParts(gridfinityPlan(plain)));
      const solid = solidOf(gridfinityLabelledTriangles(runtime, shape) as Triangle[]);
      expect(solid.status()).toBe("NoError");
      expect(solid.decompose()).toHaveLength(1);
      // Each half socket takes out its 1506.94 mm3 beside the connector as anywhere else.
      const taken = (solidOf(gridfinityLabelledTriangles(runtime, plain) as Triangle[]).volume() - solid.volume()) / (cells * 1506.94);
      expect(taken).toBeGreaterThan(0.995);
      expect(taken).toBeLessThan(1.002);
    }
  });

  it("joins two plates side by side: the tabs of one in the sockets of the other, at either fit", () => {
    for (const fit of [1, 0.5, 0]) {
      const left = solidOf(gridfinityLabelledTriangles(runtime, puzzled({ width: 42, depth: 84, gridfinityPuzzleSides: ["right"], gridfinityPuzzleFit: fit })) as Triangle[], -21);
      const right = solidOf(gridfinityLabelledTriangles(runtime, puzzled({ width: 42, depth: 84, gridfinityPuzzleSides: ["left"], gridfinityPuzzleFit: fit })) as Triangle[], 21);
      // The tabs reach into the other plate's sockets; where the drawn curves meet they touch, no more than a sliver.
      expect(left.boundingBox().max[0]).toBeCloseTo(1.18, 2);
      expect(left.intersect(right).volume()).toBeLessThan(0.15);
      // Together they are one plate, 84 mm across, with nothing missing at the seam but the play the fit leaves.
      const joined = runtime.Manifold.union([left, right]);
      expect(joined.decompose()).toHaveLength(1);
      const whole = solidOf(gridfinityTriangles(plate({ depth: 84 })) as Triangle[]);
      expect(Math.abs(joined.volume() - whole.volume()) / whole.volume()).toBeLessThan(0.01);
    }
  });
});

describe("gridfinity baseplate split joined by the GridFlock puzzle", () => {
  const ids = () => { let n = 0; return () => `piece${(n += 1)}`; };
  const piecesOf = (shape: WorkplaneShape, bed: { width: number; depth: number }) => gridfinityPlatePieces(shape, gridfinityPlateSplit(shape, bed)!, "Gridfinity", ids(), () => []);

  it("splits a plate with the puzzle into pieces with it on their cut sides, their boxes taking the tabs in", () => {
    // 6 x 2 units on an A1 mini's bed, 180 mm: two plates of 3 x 2, as GridFlock splits it.
    const shape = shapeOf({ width: 252, depth: 84, gridfinityPuzzle: true });
    expect(gridfinityPlateSplitsWithPuzzle(shape)).toBe(true);
    expect(gridfinityPlateSplitsWithPuzzle({ ...shape, gridfinityPuzzle: false })).toBe(false);
    expect(gridfinityPlateSplitsWithPuzzle({ ...shape, gridfinityOutline: [{ x: 0, z: 0 }, { x: 100, z: 0 }, { x: 100, z: 60 }] })).toBe(false);
    const split = gridfinityPlateSplit(shape, { width: 180, depth: 180 })!;
    expect(split.map(({ count, seams, x, z }) => ({ count, seams, x, z }))).toEqual([
      { count: { x: 3, z: 2 }, seams: ["right"], x: -62.405, z: 0 },
      { count: { x: 3, z: 2 }, seams: ["left"], x: 62.76, z: 0 },
    ]);
    const pieces = gridfinityPlatePieces(shape, split, "Gridfinity", ids(), () => []);
    expect(pieces.map(({ width, depth, gridfinityPuzzle, gridfinityPuzzleSides, gridfinitySwallowtail }) => ({ width, depth, gridfinityPuzzle, gridfinityPuzzleSides, gridfinitySwallowtail }))).toEqual([
      { width: 127.19, depth: 84, gridfinityPuzzle: true, gridfinityPuzzleSides: ["right"], gridfinitySwallowtail: undefined },
      { width: 126.48, depth: 84, gridfinityPuzzle: true, gridfinityPuzzleSides: ["left"], gridfinitySwallowtail: undefined },
    ]);
    // Each piece's body lies where its cells were: the left one's from -126 to 0, the right one's from 0 to 126.
    expect(pieces.map((piece) => { const { offset } = gridfinityPlan(piece); return gridfinityPlateToWorld({ x: offset.x, z: offset.z }, piece).x; }).map((x) => Number(x.toFixed(6)))).toEqual([-63, 63]);
    for (const piece of pieces) expect(gridfinityUnits(piece)).toEqual({ x: 3, z: 2, y: 1 });
    // Clip notches go unclipped: the puzzle joins the pieces.
    expect(gridfinityPlateSplitsWithClips({ ...shape, gridfinityClipNotches: true })).toBe(true);
    expect(piecesOf({ ...shape, gridfinityClipNotches: true, gridfinityClipCount: 3 }, { width: 180, depth: 180 }).map((piece) => piece.gridfinityClipCount)).toEqual([3, 3]);
  });

  it("leaves room on the bed for the tabs, so a plate that fits in halves without them may take thirds", () => {
    const bed = { width: 126.5, depth: 126.5 };
    expect(gridfinityPlateSplit(shapeOf({ width: 252, depth: 42 }), bed)).toHaveLength(2);
    const split = gridfinityPlateSplit(shapeOf({ width: 252, depth: 42, gridfinityPuzzle: true }), bed)!;
    expect(split.map((piece) => piece.seams)).toEqual([["right"], ["left", "right"], ["left"]]);
    const pieces = piecesOf(shapeOf({ width: 252, depth: 42, gridfinityPuzzle: true }), bed);
    expect(pieces.map((piece) => piece.width)).toEqual([85.19, 85.67, 84.48]);
  });

  it("keeps the puzzle on the outer sides the plate lists, and cuts both ways with it", () => {
    const shape = canonicalizeShape(shapeOf({ width: 252, depth: 252, gridfinityPuzzle: true, gridfinityPuzzleSides: ["left"], gridfinityPuzzleFit: 0.5 }));
    // The plate's own fingers on its left take 0.42 mm of its box, so its body lies 0.21 mm right of the box's middle.
    expect(shape.width).toBe(252.42);
    expect(gridfinityPlan(shape).offset).toEqual({ x: 0.21, z: 0 });
    const pieces = piecesOf(shape, { width: 180, depth: 180 });
    expect(pieces.map((piece) => piece.gridfinityPuzzleSides)).toEqual([["front", "left", "right"], ["front", "left"], ["back", "left", "right"], ["back", "left"]]);
    expect(pieces.map((piece) => piece.gridfinityPuzzleFit)).toEqual([0.5, 0.5, 0.5, 0.5]);
    // The tabs and fingers across each seam meet: every piece's body abuts the next one's, where the plate's cells were.
    const bodies = pieces.map((piece) => {
      const plan = gridfinityPlan(piece);
      const middle = gridfinityPlateToWorld({ x: plan.offset.x, z: plan.offset.z }, piece);
      return [middle.x - plan.size.width / 2, middle.x + plan.size.width / 2, middle.z - plan.size.depth / 2, middle.z + plan.size.depth / 2].map((n) => Number(n.toFixed(6)));
    });
    expect(bodies).toEqual([[-125.79, 0.21, -126, 0], [0.21, 126.21, -126, 0], [-125.79, 0.21, 0, 126], [0.21, 126.21, 0, 126]]);
  });
});

describe("gridfinity GridFlock puzzle settings", () => {
  it("is kept with the shape: normalised, compared, signed, sent to the kernel, offered by the MCP and saved", async () => {
    const shape = canonicalizeShape(shapeOf({ width: 90, gridfinityPuzzle: true, gridfinityPuzzleSides: ["right", "left", "right"], gridfinityPuzzleFit: 1.7 }));
    expect(shape).toMatchObject({ width: 85.77, depth: 42, gridfinityPuzzle: true, gridfinityPuzzleSides: ["left", "right"], gridfinityPuzzleFit: 1 });
    expect(workplaneShapesEqual(shape, { ...shape, gridfinityPuzzle: false })).toBe(false);
    expect(workplaneShapesEqual(shape, { ...shape, gridfinityPuzzleSides: ["left"] })).toBe(false);
    expect(workplaneShapesEqual(shape, { ...shape, gridfinityPuzzleSides: undefined })).toBe(false);
    expect(workplaneShapesEqual(shape, { ...shape, gridfinityPuzzleFit: 0.5 })).toBe(false);
    expect(workplaneShapesEqual(shape, { ...shape })).toBe(true);
    expect(shapeGeometrySignature(shape)).not.toBe(shapeGeometrySignature({ ...shape, gridfinityPuzzleFit: 0.5 }));
    expect(shapeGeometrySignature(shape)).not.toBe(shapeGeometrySignature({ ...shape, gridfinityPuzzleSides: ["left"] }));
    expect(cadModifierGridfinityForShape(shape)).toMatchObject({ width: 85.77, depth: 42, gridfinityPuzzle: true, gridfinityPuzzleSides: ["left", "right"], gridfinityPuzzleFit: 1 });
    expect(sceneShape(shape)).toMatchObject({ gridfinityPuzzle: true, gridfinityPuzzleSides: ["left", "right"], gridfinityPuzzleFit: 1 });
    expect(mcpShapeSummary(shape)).toMatchObject({ settings: { gridfinityPuzzle: true, gridfinityPuzzleFit: 1 } });
    expect(normalizeShapeCustomizations({ gridfinity: { gridfinityPuzzle: true, gridfinityPuzzleFit: 3 } }, {})).toMatchObject({ gridfinity: { gridfinityPuzzle: true, gridfinityPuzzleFit: 1 } });
    expect(shapeDefaultsFromShape(shape)).toMatchObject({ gridfinityPuzzle: true, gridfinityPuzzleFit: 1 });
    // A piece's sides belong to it alone and are not made a default.
    expect(shapeDefaultsFromShape(shape)).not.toHaveProperty("gridfinityPuzzleSides");
    expect(mcpGridfinityPatch({ gridfinityPuzzleSides: ["back", "left"] })).toMatchObject({ gridfinityPuzzleSides: ["back", "left"] });
    expect(mcpGridfinityPatch({ gridfinityPuzzleSides: "[\"front\"]" })).toMatchObject({ gridfinityPuzzleSides: ["front"] });
    expect(() => mcpGridfinityPatch({ gridfinityPuzzleSides: ["up"] })).toThrow("gridfinityPuzzleSides must");
    expect(() => mcpGridfinityPatch({ gridfinityPuzzleSides: ["left", "left"] })).toThrow("gridfinityPuzzleSides must");
    const save = (shapes: WorkplaneShape[]) => exportLylProject({ projectId: "puzzle", projectName: "Puzzle", createdAt: 1, modifiedAt: 2, shapes, history: [editorHistoryEntry(shapes, [])], historyIndex: 0, assets: [], workspace: DEFAULT_WORKPLANE_WORKSPACE, snapGrid: DEFAULT_SNAP_GRID, placementElevation: 0 });
    expect((await importLylProject(await save([shape]))).shapes[0]).toMatchObject({ width: 85.77, gridfinityPuzzle: true, gridfinityPuzzleSides: ["left", "right"], gridfinityPuzzleFit: 1 });
    await expect(importLylProject(await save([{ ...shape, gridfinityPuzzle: "yes" } as unknown as WorkplaneShape]))).rejects.toThrow("gridfinityPuzzle must");
    // Saving keeps the sides as the geometry reads them.
    expect((await importLylProject(await save([{ ...shape, gridfinityPuzzleSides: ["top", "left"] } as unknown as WorkplaneShape]))).shapes[0].gridfinityPuzzleSides).toEqual(["left"]);
  });
});
