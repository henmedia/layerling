import { describe, expect, it } from "vitest";
import { editorHistoryEntry } from "@/lib/editorHistory";
import { exportLylProject, importLylProject } from "@/lib/lylProject";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { applySurfaceTexture, normalizeSurfaceTexture, patternPartBody, surfaceTexturePositions, type SurfaceTextureResult } from "@/lib/surfaceTexture";
import { surfaceMeshReport } from "@/lib/surfaceTextureMesh";
import {
  contrastingPatternColor,
  isSurfacePatternBundle,
  offersSurfaceTexture,
  sceneWithSurfaceBody,
  shapeUnderSurfaceTexture,
  surfacePatternBundle,
  surfacePatternPartOf,
  surfacePatternPartWay,
  surfaceTextureEntry,
  surfaceTextureInput,
  surfaceTextureLayersToMake,
  surfaceTextureResultShape,
  textureSurfacePositions,
} from "@/lib/surfaceTextureShape";
import { analyzeTriangleSoup } from "@/lib/svgImport";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import { canonicalizeShape } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

/**
 * The pattern as a part of its own (Discussion #1347): raised, what stands out of the body; cut in, what fills the cut
 * up to the surface - two closed bodies that meet without a gap, in a bundle that carries the texture.
 */

/** A box of 40 x 30 x 25 mm on the plate, red, as the catalogue makes it. */
function box(overrides: Partial<WorkplaneShape> = {}): WorkplaneShape {
  const asset = toolbarShapeAssets.find((entry) => entry.kind === "box");
  if (!asset) throw new Error("no box");
  return canonicalizeShape({ ...makeShapeFromAsset(asset, { x: 0, z: 0 }), id: "box-1", name: "Box", color: "#d41721", width: 40, depth: 30, size: 40, height: 25, ...overrides });
}

function volume(positions: ArrayLike<number>) {
  let sum = 0;
  for (let i = 0; i < positions.length; i += 9) {
    const [ax, ay, az, bx, by, bz, cx, cy, cz] = Array.from({ length: 9 }, (_, k) => positions[i + k]);
    sum += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
  }
  return sum;
}

/** Closed, every edge between two faces of opposite ways, as an indexed mesh and as the triangles a file holds. */
function expectClosedManifold(body: Pick<SurfaceTextureResult, "vertices" | "indices">) {
  expect(surfaceMeshReport(body.indices, body.vertices.length / 3)).toMatchObject({ openEdges: 0, nonManifoldEdges: 0 });
  const soup = analyzeTriangleSoup(surfaceTexturePositions(body));
  expect(soup.boundaryEdges).toBe(0);
  expect(soup.nonManifoldEdges).toBe(0);
  expect(volume(surfaceTexturePositions(body))).toBeGreaterThan(0);
}

const KNURL = { pattern: "knurl", direction: "outward", depth: 0.8, detail: "coarse" } as const;
const BRICKS = { pattern: "bricks", direction: "inward", depth: 0.8, detail: "coarse" } as const;

describe("the pattern as a part of its own", () => {
  const input = surfaceTextureInput(box());
  const plain = volume(input);

  it("is off unless asked for, and changes nothing then", () => {
    expect(normalizeSurfaceTexture({}).patternPart).toBe(false);
    expect(normalizeSurfaceTexture({}).patternColor).toBe("");
    expect(normalizeSurfaceTexture({ patternPart: "true", patternColor: "#FFAA00" })).toMatchObject({ patternPart: true, patternColor: "#ffaa00" });
    expect(normalizeSurfaceTexture({ patternColor: "red" }).patternColor).toBe("");
    const without = applySurfaceTexture(input, KNURL);
    expect(without.part).toBeNull();
    // Asked for, the textured body itself is the same: the part comes beside it.
    const withPart = applySurfaceTexture(input, { ...KNURL, patternPart: true });
    expect(Array.from(withPart.indices)).toEqual(Array.from(without.indices));
    expect(Array.from(withPart.vertices)).toEqual(Array.from(without.vertices));
  }, 60_000);

  it("raised (knurling), is what stands out of the box: closed, and box plus part is the textured box", () => {
    const result = applySurfaceTexture(input, { ...KNURL, patternPart: true });
    expect(result.part).not.toBeNull();
    const part = result.part!;
    expectClosedManifold(part);
    const textured = volume(surfaceTexturePositions(result));
    const pattern = volume(surfaceTexturePositions(part));
    expect(pattern).toBeGreaterThan(500);
    // Within 0.02 % of the part's own volume: where the texture tidies short edges at the box's edges, and the thin
    // webs that join two pieces touching along a knurl's valley.
    expect(Math.abs(plain + pattern - textured)).toBeLessThan(2e-4 * pattern);
    // Outside the box, but for those webs (0.01 mm into it).
    for (let i = 0; i < part.vertices.length; i += 3) {
      const [x, y, z] = [part.vertices[i], part.vertices[i + 1], part.vertices[i + 2]];
      const inside = Math.min(20 - Math.abs(x), 15 - Math.abs(z), y, 25 - y);
      expect(inside).toBeLessThan(0.0101);
    }
  }, 60_000);

  it("raised, ends where the relief runs out: no skin of it reaches across the smooth top", () => {
    const tall = surfaceTextureInput(box({ width: 40, depth: 40, size: 40, height: 30 }));
    const part = applySurfaceTexture(tall, { pattern: "knurl", direction: "outward", depth: 0.8, patternPart: true }).part!;
    expectClosedManifold(part);
    // A triangle of the textured box runs from a side's rim, moved a hundredth of a millimetre, far into the top; a
    // part over it would be a skin the view draws flickering on the top.
    for (let t = 0; t < part.indices.length; t += 3) {
      for (let k = 0; k < 3; k += 1) {
        const at = part.indices[t + k] * 3;
        const onTop = part.vertices[at + 1] > 29.5 && Math.abs(part.vertices[at]) < 18 && Math.abs(part.vertices[at + 2]) < 18;
        expect(onTop).toBe(false);
      }
    }
  }, 60_000);

  it("cut in (bricks), fills the joints up to the surface: closed, and box with joints plus part is the plain box", () => {
    const result = applySurfaceTexture(input, { ...BRICKS, patternPart: true });
    const part = result.part!;
    expectClosedManifold(part);
    const textured = volume(surfaceTexturePositions(result));
    const filling = volume(surfaceTexturePositions(part));
    expect(filling).toBeGreaterThan(300);
    expect(Math.abs(textured + filling - plain)).toBeLessThan(1e-5 * filling);
    // Within the box: nothing stands out of it.
    for (let i = 0; i < part.vertices.length; i += 3) {
      const [x, y, z] = [part.vertices[i], part.vertices[i + 1], part.vertices[i + 2]];
      expect(Math.max(Math.abs(x) - 20, Math.abs(z) - 15, -y, y - 25)).toBeLessThan(1e-6);
    }
  }, 60_000);

  it("is made for a pattern raised or cut in only, not both ways", () => {
    expect(applySurfaceTexture(input, { ...KNURL, direction: "both", patternPart: true }).part).toBeNull();
    const first = normalizeSurfaceTexture({ ...KNURL, patternPart: true });
    expect(surfacePatternPartWay(first)).toBe("outward");
    expect(surfacePatternPartWay({ ...first, patternPart: false })).toBeNull();
    expect(surfacePatternPartWay({ ...first, direction: "both" })).toBeNull();
    // Layers: all one way, or none of them makes a part - else no body would be under it.
    const top = normalizeSurfaceTexture({ pattern: "grooves", direction: "outward", faces: ["top"] });
    expect(surfacePatternPartWay(first, [top])).toBe("outward");
    expect(surfacePatternPartWay(first, [{ ...top, direction: "inward" }])).toBeNull();
    // A layer without faces of its own is left out, and does not count.
    expect(surfacePatternPartWay(first, [{ ...top, direction: "inward", faces: [] }])).toBe("outward");
    // The first layer's choice goes to every layer that is made.
    expect(surfaceTextureLayersToMake(first, [top]).map((layer) => layer.patternPart)).toEqual([true, true]);
    expect(surfaceTextureLayersToMake(first, [{ ...top, direction: "inward" }]).map((layer) => layer.patternPart)).toEqual([false, false]);
  }, 60_000);

  it("leaves the cracks' gold as it was: the gold is their part", () => {
    const asset = toolbarShapeAssets.find((entry) => entry.kind === "cylinder")!;
    const cylinder = canonicalizeShape({ ...makeShapeFromAsset(asset, { x: 0, z: 0 }), width: 50, depth: 50, size: 50, height: 70 });
    const cracks = { pattern: "cracks", depth: 0.8, direction: "inward", crackCount: 4, crackLength: 70, crackWidth: 1.5, detail: "coarse", crackGold: true };
    const gold = applySurfaceTexture(surfaceTextureInput(cylinder), cracks);
    const both = applySurfaceTexture(surfaceTextureInput(cylinder), { ...cracks, patternPart: true });
    expect(gold.fill).not.toBeNull();
    expect(both.part).toBeNull();
    expect(Array.from(both.fill!.vertices)).toEqual(Array.from(gold.fill!.vertices));
    expect(Array.from(both.fill!.indices)).toEqual(Array.from(gold.fill!.indices));
    expect(Array.from(both.vertices)).toEqual(Array.from(gold.vertices));
    // Without the gold, the cracks are filled up to the surface as any pattern cut in.
    const filled = applySurfaceTexture(surfaceTextureInput(cylinder), { ...cracks, crackGold: false, patternPart: true });
    expect(filled.fill).toBeNull();
    expectClosedManifold(filled.part!);
  }, 60_000);

  it("lets a point the texture moved the other way stay where it was: the part is never turned inside out", () => {
    // A unit cube, its faces wound outward; one corner raised out of it, another pulled into it (a corner rounded).
    const before = [0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1];
    const indices = Uint32Array.from([0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7]);
    const after = before.slice();
    for (let k = 0; k < 3; k += 1) {
      after[6 * 3 + k] += 0.3;
      after[k] += 0.2;
    }
    const part = patternPartBody(before, after, indices, true);
    expectClosedManifold(part);
    for (let i = 0; i < part.vertices.length; i += 3) {
      const inside = Math.min(...[0, 1, 2].map((k) => Math.min(part.vertices[i + k], 1 - part.vertices[i + k])));
      expect(inside).toBeLessThan(1e-9);
    }
    // Cut in, the same: a point the texture pushed out of the body is no notch to fill.
    const cut = after.slice();
    for (let k = 0; k < 3; k += 1) cut[6 * 3 + k] = before[6 * 3 + k] - 0.3;
    const filling = patternPartBody(before, cut, indices, false);
    expectClosedManifold(filling);
    for (let i = 0; i < filling.vertices.length; i += 3) {
      expect(Math.max(...[0, 1, 2].map((k) => Math.max(-filling.vertices[i + k], filling.vertices[i + k] - 1)))).toBeLessThan(1e-9);
    }
  }, 60_000);

  it("starts in a colour that stands out against the body", () => {
    expect(contrastingPatternColor("#d41721")).toBe("#ffffff");
    expect(contrastingPatternColor("#111111")).toBe("#ffffff");
    expect(contrastingPatternColor("#ffffff")).toBe("#111111");
    expect(contrastingPatternColor("#f7e65a")).toBe("#111111");
  }, 60_000);
});

describe("a body with its pattern as a part of its own", () => {
  const knurl = normalizeSurfaceTexture({ ...KNURL, patternPart: true, patternColor: "#ffffff" });
  const make = (body: WorkplaneShape, settings = knurl) => {
    const outcome = textureSurfacePositions(surfaceTextureInput(body), settings);
    const made = surfaceTextureResultShape(body, null, outcome, settings, [], "Box – Pattern");
    if (!made) throw new Error("nothing made");
    return { made, outcome };
  };

  it("raised, is a bundle of the box as it was and the pattern in its own colour, carrying the texture", () => {
    const red = box({ x: 12, z: -7, rotation: 30 });
    const { made } = make(red);
    expect(isSurfacePatternBundle(made)).toBe(true);
    expect(made.id).toBe(red.id);
    expect(made.groupOperation).toBe("bundle");
    expect(made.surfaceTexture).toEqual(knurl);
    expect(offersSurfaceTexture(made)).toBe(true);
    const [body, pattern] = made.groupedShapes!;
    // The body stays as it was: still a box, in its colour.
    expect(body.kind).toBe("box");
    expect(body.color).toBe("#d41721");
    expect(body.id).not.toBe(red.id);
    expect(pattern.kind).toBe("mesh");
    expect(pattern.color).toBe("#ffffff");
    expect(pattern.name).toBe("Box – Pattern");
    expect(surfacePatternPartOf(made)?.id).toBe(pattern.id);
    // The body under it comes back where the bundle stands now, and the pattern part goes with the bundle.
    const moved = canonicalizeShape({ ...made, x: made.x + 10 });
    const under = shapeUnderSurfaceTexture(moved);
    expect(under?.kind).toBe("box");
    expect(under?.x).toBeCloseTo(22, 2);
    expect(under?.rotation).toBeCloseTo(30, 6);
    expect(under?.surfaceTexture).toBeUndefined();
    expect(under?.groupedShapes).toBeUndefined();
    const other = box({ id: "other", x: 100 });
    const scene = sceneWithSurfaceBody([moved, other], moved.id, under!, null);
    expect(scene.map((shape) => shape.id)).toEqual([red.id, "other"]);
    expect(scene.some((shape) => shape.groupedShapes?.some((part) => part.id === pattern.id))).toBe(false);
  }, 60_000);

  it("cut in, is the textured box and the filling, and keeps the colour the pattern had when made again", () => {
    const bricks = normalizeSurfaceTexture({ ...BRICKS, patternPart: true });
    const red = box();
    const outcome = textureSurfacePositions(surfaceTextureInput(red), bricks);
    const first = surfaceTextureResultShape(red, null, outcome, { ...bricks, patternColor: "#33983d" }, [], "Box – Pattern")!;
    const [body, filling] = first.groupedShapes!;
    expect(body.kind).toBe("mesh");
    expect(body.color).toBe("#d41721");
    expect(filling.color).toBe("#33983d");
    // Made again with no colour of its own given: the pattern keeps the one it has.
    const again = surfaceTextureResultShape(shapeUnderSurfaceTexture(first)!, first, outcome, bricks, [], "Box – Pattern")!;
    expect(surfacePatternPartOf(again)?.color).toBe("#33983d");
    expect(again.id).toBe(first.id);
  }, 60_000);

  it("is the plain textured body with the choice off, for a hole, or with layers going different ways", () => {
    const off = normalizeSurfaceTexture(KNURL);
    expect(make(box(), off).made.groupedShapes).toBeUndefined();
    const hole = box({ hole: true });
    const outcome = textureSurfacePositions(surfaceTextureInput(hole), knurl);
    expect(surfacePatternBundle(hole, outcome.positions, outcome.part!, knurl, { color: "#ffffff", patternName: "x" })).toBeNull();
    const plain = surfaceTextureResultShape(hole, null, outcome, knurl, [], "x")!;
    expect(plain.groupedShapes).toBeUndefined();
    expect(plain.surfaceTexture?.patternPart).toBe(true);
    const mixed = surfaceTextureResultShape(box(), null, outcome, knurl, [normalizeSurfaceTexture({ pattern: "grooves", direction: "inward", faces: ["top"] })], "x")!;
    expect(mixed.groupedShapes).toBeUndefined();
  }, 60_000);

  it("keeps the body, the pattern, their colours and the body under them through saving and opening the project", async () => {
    const { made } = make(box());
    const exported = await exportLylProject({
      projectId: "project-pattern-part",
      projectName: "Pattern part",
      createdAt: 1_700_000_000_000,
      modifiedAt: 1_700_000_100_000,
      shapes: [made],
      history: [editorHistoryEntry([made], [])],
      historyIndex: 0,
      assets: [],
      workspace: DEFAULT_WORKPLANE_WORKSPACE,
      snapGrid: DEFAULT_SNAP_GRID,
      placementElevation: 0,
    });
    const restored = (await importLylProject(exported)).shapes[0];
    expect(isSurfacePatternBundle(restored)).toBe(true);
    expect(restored.surfaceTexture).toEqual(knurl);
    expect(restored.groupedShapes?.map((part) => [part.kind, part.color])).toEqual([["box", "#d41721"], ["mesh", "#ffffff"]]);
    expect(restored.groupedShapes?.[1].importedMesh?.triangleCount).toBe(made.groupedShapes?.[1].importedMesh?.triangleCount);
    expect(surfaceTextureEntry(restored)?.feature.surfaceTexture).toEqual(knurl);
    expect(shapeUnderSurfaceTexture(restored)?.kind).toBe("box");
  }, 60_000);
});
