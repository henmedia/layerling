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
    // The fit is 0.5 unless set (a printed coupon pressed together firmly at 0.5); GridFlock's own default is 1.
    expect(gridfinityPuzzleReach(plate({ gridfinityPuzzle: true, gridfinityPuzzleSides: ALL }))).toEqual({ back: 1.19, right: 1.19, front: 0.42, left: 0.42 });
    expect(gridfinityPuzzleReach(plate({ gridfinityPuzzle: true, gridfinityPuzzleSides: ALL, gridfinityPuzzleFit: 1 }))).toEqual({ back: 1.19, right: 1.19, front: 0.58, left: 0.58 });
    // Looser, the fingers reach less far round the tab's neck; the tab stays as wide.
    expect(gridfinityPuzzleReach(plate({ gridfinityPuzzle: true, gridfinityPuzzleSides: ALL, gridfinityPuzzleFit: 0 }))).toEqual({ back: 1.19, right: 1.19, front: 0.26, left: 0.26 });
    const shape = puzzled({ gridfinityPuzzleSides: ALL });
    expect(shape).toMatchObject({ width: 85.61, depth: 43.61, height: 5 });
    expect(gridfinityUnits(shape)).toEqual({ x: 2, z: 1, y: 1 });
    const plan = gridfinityPlan(shape);
    expect(plan.size).toEqual({ width: 84, depth: 42, height: 5 });
    expect(plan.box).toEqual({ width: 85.61, depth: 43.61 });
    expect(plan.offset).toEqual({ x: -0.385, z: 0.385 });
    // The drawn plate fills its box, the reach rounded up to 0.01 mm: the body set off its middle by the offset.
    const geometry = createGridfinityGeometry(shape);
    geometry.computeBoundingBox();
    const { min, max } = geometry.boundingBox!;
    [min.x + 42.805, max.x - 42.805, min.z + 21.805, max.z - 21.805].forEach((d) => expect(Math.abs(d)).toBeLessThan(0.02));
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
      { count: { x: 3, z: 2 }, seams: ["left"], x: 62.79, z: 0 },
    ]);
    const pieces = gridfinityPlatePieces(shape, split, "Gridfinity", ids(), () => []);
    expect(pieces.map(({ width, depth, gridfinityPuzzle, gridfinityPuzzleSides, gridfinitySwallowtail }) => ({ width, depth, gridfinityPuzzle, gridfinityPuzzleSides, gridfinitySwallowtail }))).toEqual([
      { width: 127.19, depth: 84, gridfinityPuzzle: true, gridfinityPuzzleSides: ["right"], gridfinitySwallowtail: undefined },
      { width: 126.42, depth: 84, gridfinityPuzzle: true, gridfinityPuzzleSides: ["left"], gridfinitySwallowtail: undefined },
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
    expect(pieces.map((piece) => piece.width)).toEqual([85.19, 85.61, 84.42]);
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
