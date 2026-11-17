import { describe, expect, it } from "vitest";
import {
  applySurfaceTexture,
  createSurfaceTextureSession,
  insideToScreenPositions,
  makeSurfaceTextureLayout,
  normalizeSurfaceTexture,
  surfaceTexturePositions,
  surfaceTextureValueAt,
  SURFACE_TEXTURE_MAX_TRIANGLES,
  type SurfaceTexturePattern,
  type SurfaceTextureResult,
} from "@/lib/surfaceTexture";
import { base64ToBytes, bytesToBase64, normalizeSurfaceTextureOwnImage, surfaceTextureOwnImage, SURFACE_TEXTURE_IMAGE_TILE } from "@/lib/surfaceTextureImages";
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
  it("takes a dark drawing on a transparent ground by its ink: the lines become the full depth, the ground stays (#1268)", () => {
    // 40 x 40, transparent, a black line 4 points wide down the middle and a navy one across.
    const n = 40;
    const picture = (ink: [number, number, number]) => {
      const rgba = new Uint8ClampedArray(n * n * 4);
      for (let y = 0; y < n; y += 1) for (let x = 0; x < n; x += 1) {
        if (x >= 18 && x < 22) rgba.set([...ink, 255], (y * n + x) * 4);
        else if (y >= 30 && y < 32) rgba.set([20, 30, 90, 255], (y * n + x) * 4);
      }
      return base64ToBytes(surfaceTextureOwnImage(rgba, n, n).data);
    };
    const dark = picture([0, 0, 0]);
    expect(dark[5 * n + 20]).toBe(255);
    expect(dark[31 * n + 5]).toBeGreaterThan(200);
    expect(dark[5 * n + 5]).toBe(0);
    // A light drawing on a transparent ground stays as it was: light is the full depth, and so is the white line.
    const light = picture([255, 255, 255]);
    expect(light[5 * n + 20]).toBe(255);
    expect(light[5 * n + 5]).toBe(0);
    // Without a transparent ground nothing changes: black stays black.
    const opaque = new Uint8ClampedArray(n * n * 4).fill(255);
    for (let y = 0; y < n; y += 1) for (let x = 18; x < 22; x += 1) opaque.set([0, 0, 0, 255], (y * n + x) * 4);
    const plain = base64ToBytes(surfaceTextureOwnImage(opaque, n, n).data);
    expect(plain[5 * n + 20]).toBe(0);
    expect(plain[5 * n + 5]).toBe(255);
  });

  it("takes one's own picture as grey values, made smaller, and refuses one that does not fit", () => {
    // A picture 1200 x 600, dark on the left and light on the right, half transparent at the bottom.
    const width = 1200, height = 600;
    const rgba = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const o = (y * width + x) * 4;
        rgba[o] = rgba[o + 1] = rgba[o + 2] = Math.round((255 * x) / (width - 1));
        rgba[o + 3] = y < height / 2 ? 255 : 0;
      }
    }
    const own = surfaceTextureOwnImage(rgba, width, height);
    expect(own).toMatchObject({ width: 512, height: 256 });
    const grey = base64ToBytes(own.data);
    expect(grey.length).toBe(512 * 256);
    expect(grey[0]).toBeLessThan(5);
    expect(grey[511]).toBeGreaterThan(250);
    // Transparent counts as dark.
    expect(grey[255 * 512 + 511]).toBe(0);
    expect(normalizeSurfaceTextureOwnImage(own)).toEqual(own);
    expect(normalizeSurfaceTextureOwnImage({ ...own, height: 257 })).toBeNull();
    expect(normalizeSurfaceTextureOwnImage({ ...own, width: 513 })).toBeNull();
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

  it("makes the edge of one's own picture across a wide tile steeper than 256 points would (#1462)", () => {
    // A picture 1000 x 1000, light on the left of a line at a slant, on a tile 140 mm wide: at 256 across a point is
    // 0.55 mm, and the steps of the grid showed as a saw along the edge. The way from dark to light is now shorter.
    const n = 1000;
    const rgba = new Uint8ClampedArray(n * n * 4);
    for (let y = 0; y < n; y += 1) {
      for (let x = 0; x < n; x += 1) {
        rgba.set(x < 300 + 0.3 * y ? [255, 255, 255, 255] : [0, 0, 0, 255], (y * n + x) * 4);
      }
    }
    const own = surfaceTextureOwnImage(rgba, n, n);
    expect(own.width).toBe(512);
    const s = normalizeSurfaceTexture({ pattern: "image", image: "own", imageOwn: own, imageBlur: 0, projection: "flat", axis: "z", spacing: 140 });
    const layout = makeSurfaceTextureLayout(screenBase(box(200, 10, 200)), s);
    const at = (u: number, v: number) => surfaceTextureValueAt(u, v, 10, 0, 0, 1, s, layout);
    // How far (mm) along a row the value is between a tenth and nine tenths: the way from dark to light.
    const across = (v: number) => {
      let width = 0;
      for (let u = 0; u < 140; u += 0.01) {
        const value = at(u, v);
        if (value > 0.1 && value < 0.9) width += 0.01;
      }
      return width;
    };
    for (const v of [30, 70, 110]) expect(across(v)).toBeLessThan(0.7);
  });

  /**
   * One's own picture with sharp outlines at every slant, as a logo has: a five-pointed star in a ring, light on dark,
   * 256 points wide.
   */
  function starPicture() {
    const n = 256;
    const grey = new Uint8Array(n * n);
    for (let y = 0; y < n; y += 1) {
      for (let x = 0; x < n; x += 1) {
        const dx = x - n / 2 + 0.5, dy = n / 2 - y - 0.5, r = Math.hypot(dx, dy);
        const k = ((Math.atan2(dy, dx) + Math.PI / 2) / ((2 * Math.PI) / 5)) % 1;
        const point = Math.abs(((k + 1) % 1) - 0.5) * 2;
        const inStar = r < n * (0.17 + 0.25 * point);
        grey[y * n + x] = inStar || (r > 0.45 * n && r < 0.49 * n) ? 255 : 0;
      }
    }
    return { width: n, height: n, data: bytesToBase64(grey) };
  }

  /**
   * How a picture pressed 1 mm into a cup's wall (`radius` outside, `height` tall) comes out: of the wall's edges along
   * which the depth changes (the picture's outlines), how many step by most of the depth from one end to the other - a
   * step of the grid, which the view shows as a pixel and a printer prints.
   */
  function stepsOnTheWall(result: SurfaceTextureResult, radius: number, height: number) {
    const v = result.vertices, I = result.indices;
    const depth = (i: number) => radius - Math.hypot(v[i * 3], v[i * 3 + 2]);
    let outlines = 0, steps = 0;
    for (let t = 0; t < I.length; t += 3) {
      for (const [a, b] of [[I[t], I[t + 1]], [I[t + 1], I[t + 2]], [I[t + 2], I[t]]]) {
        // The outer wall only, away from its rims.
        if (depth(a) > 2 || depth(b) > 2 || Math.min(v[a * 3 + 1], v[b * 3 + 1]) < 5 || Math.max(v[a * 3 + 1], v[b * 3 + 1]) > height - 5) continue;
        const jump = Math.abs(depth(a) - depth(b));
        if (jump > 0.1) outlines += 1;
        if (jump > 0.7) steps += 1;
      }
    }
    return { outlines, steps };
  }

  it("is softened to the grid the budget leaves, not to the one asked for: no outline in steps of the grid (Discussion #1347)", () => {
    // A cup 100 mm across and as tall, in the long strips CAD gives a round wall, its picture laid all round: halving the
    // strips cost so many triangles that the grid came out several times coarser than asked. The picture was softened
    // for the grid asked for, and a third of its outlines stepped by the whole depth over one edge of the grid made.
    const s = { pattern: "image", image: "own", imageOwn: starPicture(), spacing: 40, depth: 1, direction: "inward", projection: "allRound" };
    const session = createSurfaceTextureSession(tube(50, 45, 100));
    const result = session.apply(s);
    expect(result.stats.limited).toBe(true);
    const { outlines, steps } = stepsOnTheWall(result, 50, 100);
    expect(outlines).toBeGreaterThan(20_000);
    expect(steps).toBeLessThan(0.002 * outlines);
    // Made again on the grid kept from before (only the depth changed), it is softened as much.
    const again = session.apply({ ...s, depth: 1.0001 });
    expect(stepsOnTheWall(again, 50, 100).steps).toBe(steps);
  }, 60_000);

  it("round a cylinder cuts CAD's long strips across first: as fine as asked, the budget not spent on slivers (Discussion #1347)", () => {
    // A cup 50 mm across and as tall, in 160 strips 50 mm long, its picture round its axis: halved in their own shape,
    // the strips spent the budget on slivers, the grid came out twice as coarse as asked (made coarser, the status line
    // said), and Fine was no finer than Medium.
    const s = { pattern: "image", image: "own", imageOwn: starPicture(), spacing: 40, depth: 1, direction: "inward", projection: "cylinder" };
    const result = applySurfaceTexture(tube(25, 20, 50, 160), s);
    expect(result.stats.limited).toBe(false);
    expect(result.stats.triangles).toBeLessThan(0.75 * SURFACE_TEXTURE_MAX_TRIANGLES);
    const { outlines, steps } = stepsOnTheWall(result, 25, 50);
    expect(outlines).toBeGreaterThan(10_000);
    expect(steps).toBe(0);
  }, 60_000);

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
