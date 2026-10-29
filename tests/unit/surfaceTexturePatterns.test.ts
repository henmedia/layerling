import { describe, expect, it } from "vitest";
import {
  applySurfaceTexture,
  createSurfaceTextureSession,
  insideToScreenPositions,
  makeSurfaceTextureLayout,
  normalizeSurfaceTexture,
  surfaceTexturePositions,
  surfaceTextureValueAt,
  type SurfaceTexturePattern,
  type SurfaceTextureResult,
} from "@/lib/surfaceTexture";
import { base64ToBytes, normalizeSurfaceTextureOwnImage, surfaceTextureOwnImage, SURFACE_TEXTURE_IMAGE_TILE } from "@/lib/surfaceTextureImages";
import { prepareSurfaceBase, surfaceMeshReport } from "@/lib/surfaceTextureMesh";
import { analyzeTriangleSoup } from "@/lib/svgImport";

type Vec3 = [number, number, number];

/** A cup: a closed tube on the plate (inside frame, y up), wound outward, `rings` rows of points up its walls. */
function tube(outer: number, inner: number, height: number, segments = 96, rings = 2): number[] {
  const out: number[] = [];
  const tri = (a: Vec3, b: Vec3, c: Vec3) => out.push(...a, ...b, ...c);
  const at = (r: number, k: number, y: number): Vec3 => {
    const a = (2 * Math.PI * k) / segments;
    return [r * Math.cos(a), y, r * Math.sin(a)];
  };
  for (let k = 0; k < segments; k += 1) {
    for (let j = 0; j < rings - 1; j += 1) {
      const y0 = (height * j) / (rings - 1), y1 = (height * (j + 1)) / (rings - 1);
      tri(at(outer, k, y0), at(outer, k, y1), at(outer, k + 1, y1));
      tri(at(outer, k, y0), at(outer, k + 1, y1), at(outer, k + 1, y0));
      tri(at(inner, k, y0), at(inner, k + 1, y1), at(inner, k, y1));
      tri(at(inner, k, y0), at(inner, k + 1, y0), at(inner, k + 1, y1));
    }
    tri(at(inner, k, height), at(inner, k + 1, height), at(outer, k + 1, height));
    tri(at(inner, k, height), at(outer, k + 1, height), at(outer, k, height));
    tri(at(inner, k, 0), at(outer, k + 1, 0), at(inner, k + 1, 0));
    tri(at(inner, k, 0), at(outer, k, 0), at(outer, k + 1, 0));
  }
  return out;
}

/** A closed box on the plate (inside frame), two triangles a face, wound outward. */
function box(w: number, h: number, d: number): number[] {
  const p = (x: number, y: number, z: number): Vec3 => [(x - 0.5) * w, y * h, (z - 0.5) * d];
  const quads: Vec3[][] = [
    [p(0, 0, 1), p(1, 0, 1), p(1, 1, 1), p(0, 1, 1)],
    [p(1, 0, 0), p(0, 0, 0), p(0, 1, 0), p(1, 1, 0)],
    [p(1, 0, 1), p(1, 0, 0), p(1, 1, 0), p(1, 1, 1)],
    [p(0, 0, 0), p(0, 0, 1), p(0, 1, 1), p(0, 1, 0)],
    [p(0, 1, 1), p(1, 1, 1), p(1, 1, 0), p(0, 1, 0)],
    [p(0, 0, 0), p(1, 0, 0), p(1, 0, 1), p(0, 0, 1)],
  ];
  return quads.flatMap(([a, b, c, d]) => [...a, ...b, ...c, ...a, ...c, ...d]);
}

function expectClosed(result: SurfaceTextureResult) {
  expect(surfaceMeshReport(result.indices, result.vertices.length / 3)).toEqual({ shells: 1, openEdges: 0, nonManifoldEdges: 0 });
  const analysis = analyzeTriangleSoup(surfaceTexturePositions(result));
  expect(analysis.degenerateTriangles).toBe(0);
  expect(analysis.boundaryEdges).toBe(0);
  expect(analysis.nonManifoldEdges).toBe(0);
}

/** The body as the core sees it: the screen frame, z up. */
const screenBase = (positions: number[]) => prepareSurfaceBase(insideToScreenPositions(positions));

const NEW_PATTERNS: SurfaceTexturePattern[] = ["cells", "knit", "rope", "weave", "grain", "image"];
const SMALL = { maxTriangles: 250_000 };

describe("the patterns from the surface tool", () => {
  it("start as they look right: knitting, rope and weave raised and round, an image as wide as its tile", () => {
    expect(normalizeSurfaceTexture({ pattern: "knit" })).toMatchObject({ spacing: 5, depth: 1.2, width: 0.85, profile: "round", direction: "outward" });
    expect(normalizeSurfaceTexture({ pattern: "weave" })).toMatchObject({ spacing: 10, direction: "outward" });
    expect(normalizeSurfaceTexture({ pattern: "grain" })).toMatchObject({ spacing: 1.2, depth: 0.25 });
    expect(normalizeSurfaceTexture({ pattern: "image", image: "terrazzo" }).spacing).toBe(SURFACE_TEXTURE_IMAGE_TILE.terrazzo);
    // What is told stays as told.
    expect(normalizeSurfaceTexture({ pattern: "knit", spacing: 8, direction: "inward" })).toMatchObject({ spacing: 8, direction: "inward" });
    // One's own image asked for without one: the first ready image.
    expect(normalizeSurfaceTexture({ pattern: "image", image: "own" }).image).toBe("topography");
  });

  it.each(NEW_PATTERNS)("lays %s round a cup: closed, no deeper than set, and closing at the seam", (pattern) => {
    const result = applySurfaceTexture(tube(30, 27, 40, 96, 2), { pattern, projection: "cylinder" }, SMALL);
    expectClosed(result);
    expect(result.stats.nothing).toBe(false);
    const s = normalizeSurfaceTexture({ pattern, projection: "cylinder" });
    // Outward patterns stand out of the wall at most their depth; nothing goes into the wall further than the depth.
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < result.vertices.length; i += 3) {
      const r = Math.hypot(result.vertices[i], result.vertices[i + 2]);
      // The outer wall (inside frame: y up), not the top and bottom rings.
      if (r < 28.5 || result.vertices[i + 1] < 1 || result.vertices[i + 1] > 39) continue;
      lo = Math.min(lo, r);
      hi = Math.max(hi, r);
    }
    expect(hi).toBeLessThan(30 + (s.direction === "outward" ? s.depth : 0) + 1e-6);
    expect(lo).toBeGreaterThan(30 - (s.direction === "outward" ? 0 : s.depth) - 0.05);
    expect(hi - lo).toBeGreaterThan(0.5 * s.depth);
    if (pattern !== "grain") {
      // A whole number round, so the pattern meets itself at the seam: the value just before and just after it agree.
      expect(Number.isInteger(result.stats.around)).toBe(true);
      const layout = makeSurfaceTextureLayout(screenBase(tube(30, 27, 40, 96, 2)), s);
      for (const z of [7.3, 15.1, 22.9, 31.7]) {
        const a = Math.PI - 1e-7;
        const before = surfaceTextureValueAt(30 * Math.cos(a), 30 * Math.sin(a), z, Math.cos(a), Math.sin(a), 0, s, layout);
        const after = surfaceTextureValueAt(30 * Math.cos(-a), 30 * Math.sin(-a), z, Math.cos(-a), Math.sin(-a), 0, s, layout);
        expect(Math.abs(before - after)).toBeLessThan(1e-3);
      }
    }
  }, 120_000);

  it.each(NEW_PATTERNS)("lays %s on a box all round: closed", (pattern) => {
    const result = applySurfaceTexture(box(20, 20, 20), { pattern }, SMALL);
    expectClosed(result);
    expect(result.stats.nothing).toBe(false);
  }, 120_000);

  it("weaves an even number of stakes round, or two weavers 'over' would meet at the seam", () => {
    for (const radius of [20, 21, 23.5, 30]) {
      const layout = makeSurfaceTextureLayout(screenBase(tube(radius, radius - 3, 30)), normalizeSurfaceTexture({ pattern: "weave", projection: "cylinder" }));
      expect(layout.around! % 2).toBe(0);
    }
  });

  it("cuts cells along their joints: on a box's face a pointed joint follows its profile in the triangles", () => {
    const asked = { pattern: "cells", profile: "pointed", fade: 0, spacing: 6, width: 0.4, projection: "allRound" } as const;
    const session = createSurfaceTextureSession(box(20, 20, 20));
    const result = session.apply(asked);
    expectClosed(result);
    const s = { ...normalizeSurfaceTexture(asked), projection: "allRound" as const };
    const layout = makeSurfaceTextureLayout(session.base, s);
    const v = result.vertices, I = result.indices;
    let checked = 0, off = 0, worst = 0, deep = 0;
    for (let t = 0; t < I.length; t += 3) {
      const ids = [I[t], I[t + 1], I[t + 2]];
      // The right face (x = 10 before moving, at most 0.8 in): not the front, back, top or bottom.
      if (ids.some((k) => v[k * 3] < 9)) continue;
      const c = [0, 1, 2].map((e) => ids.reduce((sum, k) => sum + v[k * 3 + e], 0) / 3);
      if (Math.abs(c[2]) > 9 || c[1] < 1 || c[1] > 19) continue;
      checked += 1;
      // The surface in the middle of the triangle against the pattern there (the core's frame: x, -z, y).
      const miss = Math.abs(10 - c[0] - s.depth * surfaceTextureValueAt(10, -c[2], c[1], 1, 0, 0, s, layout));
      if (miss > 0.02) off += 1;
      worst = Math.max(worst, miss);
    }
    // The joints' middles, cut along the cell borders, reach the full depth.
    for (let i = 0; i < v.length; i += 3) if (v[i] > 9 && Math.abs(v[i + 2]) < 9 && v[i + 1] > 1 && v[i + 1] < 19 && 10 - v[i] > s.depth - 0.01) deep += 1;
    expect(checked).toBeGreaterThan(1000);
    // Exact but for a few triangles where short edges were pulled together.
    expect(off / checked).toBeLessThan(0.01);
    expect(worst).toBeLessThan(0.05);
    expect(deep).toBeGreaterThan(20);
  }, 60_000);

  it("gives cells and grain another arrangement with another seed", () => {
    const base = screenBase(tube(30, 27, 40));
    for (const pattern of ["cells", "grain"] as const) {
      const one = normalizeSurfaceTexture({ pattern, projection: "cylinder" });
      const two = { ...one, seed: 2 };
      const layout = makeSurfaceTextureLayout(base, one);
      let differ = 0;
      for (let k = 0; k < 40; k += 1) {
        const a = (k / 40) * 2 * Math.PI, z = 5 + k * 0.7;
        const p = [30 * Math.cos(a), 30 * Math.sin(a), z] as const;
        if (Math.abs(surfaceTextureValueAt(...p, Math.cos(a), Math.sin(a), 0, one, layout) - surfaceTextureValueAt(...p, Math.cos(a), Math.sin(a), 0, two, layout)) > 0.05) differ += 1;
      }
      expect(differ).toBeGreaterThan(10);
    }
  });
});

describe("an image as the pattern", () => {
  it("takes one's own picture as grey values, made smaller, and refuses one that does not fit", () => {
    // A picture 600 x 300, dark on the left and light on the right, half transparent at the bottom.
    const width = 600, height = 300;
    const rgba = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const o = (y * width + x) * 4;
        rgba[o] = rgba[o + 1] = rgba[o + 2] = Math.round((255 * x) / (width - 1));
        rgba[o + 3] = y < height / 2 ? 255 : 0;
      }
    }
    const own = surfaceTextureOwnImage(rgba, width, height);
    expect(own).toMatchObject({ width: 256, height: 128 });
    const grey = base64ToBytes(own.data);
    expect(grey.length).toBe(256 * 128);
    expect(grey[0]).toBeLessThan(5);
    expect(grey[255]).toBeGreaterThan(250);
    // Transparent counts as dark.
    expect(grey[127 * 256 + 255]).toBe(0);
    expect(normalizeSurfaceTextureOwnImage(own)).toEqual(own);
    expect(normalizeSurfaceTextureOwnImage({ ...own, height: 129 })).toBeNull();
    expect(normalizeSurfaceTextureOwnImage({ ...own, width: 512 })).toBeNull();
    expect(normalizeSurfaceTextureOwnImage({ ...own, data: "not base64!" })).toBeNull();
    // Kept with the settings, and the tile as high as the picture is for its width.
    const s = normalizeSurfaceTexture({ pattern: "image", image: "own", imageOwn: own, projection: "flat", axis: "z", spacing: 40 });
    expect(s.image).toBe("own");
    const layout = makeSurfaceTextureLayout(screenBase(box(80, 10, 80)), s);
    expect(layout.tileHeight).toBeCloseTo(20, 9);
    // Light on the right of the tile, dark on the left; swapped when inverted.
    const at = (u: number, v: number, settings = s) => surfaceTextureValueAt(u, v, 10, 0, 0, 1, settings, layout);
    expect(at(39, 15)).toBeGreaterThan(0.9);
    expect(at(1, 15)).toBeLessThan(0.1);
    expect(at(39, 15, { ...s, imageInvert: true })).toBeLessThan(0.1);
  });

  it("repeats, mirrors or staggers its tiles", () => {
    const s = normalizeSurfaceTexture({ pattern: "image", image: "rosettes", projection: "flat", axis: "z", spacing: 30 });
    const layout = makeSurfaceTextureLayout(screenBase(box(80, 10, 80)), s);
    const at = (u: number, v: number, settings = s) => surfaceTextureValueAt(u, v, 10, 0, 0, 1, settings, layout);
    // Repeated: one tile further, the same.
    expect(at(4.3 + 30, 7.1)).toBeCloseTo(at(4.3, 7.1), 6);
    // Mirrored: the next tile runs backwards.
    const mirror = { ...s, imageTiling: "mirror" as const };
    expect(at(30 + 4.3, 7.1, mirror)).toBeCloseTo(at(30 - 4.3, 7.1, mirror), 6);
    // Staggered: the second row half a tile along.
    const staggered = { ...s, imageTiling: "staggered" as const };
    expect(at(4.3, 30 + 7.1, staggered)).toBeCloseTo(at(4.3 + 15, 7.1, staggered), 6);
  });
});
