import { describe, expect, it } from "vitest";
import { applySurfaceTexture, normalizeSurfaceTexture, surfaceTexturePositions, type SurfaceTextureResult } from "@/lib/surfaceTexture";
import { surfaceTextureLayerPlaced } from "@/lib/surfaceTextureShape";
import { surfaceTextureOwnImage } from "@/lib/surfaceTextureImages";
import { surfaceMeshReport } from "@/lib/surfaceTextureMesh";
import { analyzeTriangleSoup } from "@/lib/svgImport";

type Vec3 = [number, number, number];

/** A closed box on the plate (inside frame, y up), two triangles a face, wound outward; its front is +z. */
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

/** A closed cylinder standing on the plate (inside frame, y up), faces wound outward; its front is +z. */
function cylinder(radius: number, height: number, segments = 96, rings = 8): number[] {
  const out: number[] = [];
  const tri = (a: Vec3, b: Vec3, c: Vec3) => out.push(...a, ...b, ...c);
  const at = (k: number, y: number): Vec3 => {
    const a = (2 * Math.PI * k) / segments;
    return [radius * Math.cos(a), y, radius * Math.sin(a)];
  };
  for (let k = 0; k < segments; k += 1) {
    for (let j = 0; j < rings - 1; j += 1) {
      const y0 = (height * j) / (rings - 1), y1 = (height * (j + 1)) / (rings - 1);
      tri(at(k, y0), at(k, y1), at(k + 1, y1));
      tri(at(k, y0), at(k + 1, y1), at(k + 1, y0));
    }
    tri([0, height, 0], at(k + 1, height), at(k, height));
    tri([0, 0, 0], at(k, 0), at(k + 1, 0));
  }
  return out;
}

/** A closed sphere standing on the plate (inside frame, y up), its centre at y = radius, faces wound outward. */
function sphere(radius: number, segments = 64, rings = 32): number[] {
  const out: number[] = [];
  const at = (k: number, j: number): Vec3 => {
    const a = (2 * Math.PI * k) / segments, b = (Math.PI * j) / rings;
    return [radius * Math.sin(b) * Math.cos(a), radius - radius * Math.cos(b), radius * Math.sin(b) * Math.sin(a)];
  };
  for (let k = 0; k < segments; k += 1) {
    for (let j = 0; j < rings; j += 1) {
      const [a, b, c, d] = [at(k, j), at(k + 1, j), at(k + 1, j + 1), at(k, j + 1)];
      if (j > 0) out.push(...a, ...d, ...b);
      if (j < rings - 1) out.push(...b, ...d, ...c);
    }
  }
  return out;
}

/** The longest edge of a result's triangles (mm), and whether every point is a number. */
function longestEdge(result: Pick<SurfaceTextureResult, "vertices" | "indices">) {
  const v = result.vertices, I = result.indices;
  let longest = 0;
  for (let t = 0; t < I.length; t += 3) {
    for (const [a, b] of [[I[t], I[t + 1]], [I[t + 1], I[t + 2]], [I[t + 2], I[t]]]) {
      longest = Math.max(longest, Math.hypot(v[a * 3] - v[b * 3], v[a * 3 + 1] - v[b * 3 + 1], v[a * 3 + 2] - v[b * 3 + 2]));
    }
  }
  return { longest, finite: Array.from(v).every(Number.isFinite) };
}

function signedVolume(positions: ArrayLike<number>) {
  let volume = 0;
  for (let i = 0; i < positions.length; i += 9) {
    const [ax, ay, az, bx, by, bz, cx, cy, cz] = Array.from({ length: 9 }, (_, k) => positions[i + k]);
    volume += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
  }
  return volume;
}

function expectClosed(result: Pick<SurfaceTextureResult, "vertices" | "indices">) {
  expect(surfaceMeshReport(result.indices, result.vertices.length / 3)).toMatchObject({ openEdges: 0, nonManifoldEdges: 0 });
  const positions = surfaceTexturePositions(result);
  const analysis = analyzeTriangleSoup(positions);
  expect(analysis.boundaryEdges).toBe(0);
  expect(analysis.nonManifoldEdges).toBe(0);
  expect(signedVolume(positions)).toBeGreaterThan(0);
}

/** One's own grey image, `size` points a side: white (255) where `light` says so, black elsewhere. */
function ownImage(size: number, light: (x: number, y: number) => boolean) {
  const bytes = new Uint8Array(size * size);
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) bytes[y * size + x] = light(x, y) ? 255 : 0;
  return { width: size, height: size, data: Buffer.from(bytes).toString("base64") };
}

/** A white square in the middle half of a black image. */
const SQUARE = ownImage(16, (x, y) => x >= 4 && x < 12 && y >= 4 && y < 12);
const WHITE = ownImage(16, () => true);
const ONCE = { pattern: "image", image: "own", imageOwn: SQUARE, imageTiling: "once", spacing: 30, depth: 1, direction: "outward", detail: "coarse" };

/** The points of a textured box standing out of it (mm), with how far: its front is z = d / 2. */
function outOfBox(result: SurfaceTextureResult, w: number, h: number, d: number) {
  const out: { x: number; y: number; z: number; by: number }[] = [];
  const v = result.vertices;
  for (let i = 0; i < v.length; i += 3) {
    const [x, y, z] = [v[i], v[i + 1], v[i + 2]];
    const by = Math.max(Math.abs(x) - w / 2, Math.abs(z) - d / 2, y - h, -y);
    if (by > 0.01) out.push({ x, y, z, by });
  }
  return out;
}

describe("an image pressed on once", () => {
  it("knows its tiling and goes where it is put, as a text does", () => {
    const s = normalizeSurfaceTexture(ONCE);
    expect(s.imageTiling).toBe("once");
    expect(surfaceTextureLayerPlaced(s)).toBe(true);
    expect(surfaceTextureLayerPlaced(normalizeSurfaceTexture({ ...ONCE, imageTiling: "repeat" }))).toBe(false);
  });

  it("stands out once on the front of a box, the light square raised by the depth and nothing beside it", () => {
    const result = applySurfaceTexture(box(60, 40, 20), ONCE);
    expect(result.stats.image).toEqual({ placed: true, torn: 0 });
    expect(result.stats.text).toBeNull();
    expectClosed(result);
    const out = outOfBox(result, 60, 40, 20);
    // Only on the front, round its middle (x 0, y 20), within the image's 30 mm box.
    expect(out.length).toBeGreaterThan(20);
    expect(out.every((p) => p.z > 10 && Math.abs(p.x) <= 15.5 && Math.abs(p.y - 20) <= 15.5)).toBe(true);
    // The light square (the middle half, 15 mm) stands out by the depth; the dark rest of the image stays flat.
    const raised = out.filter((p) => p.by > 0.5);
    expect(Math.max(...raised.map((p) => p.by))).toBeCloseTo(1, 1);
    expect(raised.every((p) => Math.abs(p.x) <= 9 && Math.abs(p.y - 20) <= 9)).toBe(true);
    expect(raised.some((p) => Math.abs(p.x) >= 6) && raised.some((p) => Math.abs(p.y - 20) >= 6)).toBe(true);
  });

  it("is laid all over when repeated, where once lays it at one place", () => {
    const repeated = outOfBox(applySurfaceTexture(box(60, 40, 20), { ...ONCE, imageTiling: "repeat" }), 60, 40, 20);
    expect(repeated.some((p) => p.z <= 10 || Math.abs(p.x) > 20)).toBe(true);
  });

  it("is as wide as set and as high as asked, and turns with the image", () => {
    const span = (turn: number) => {
      const raised = outOfBox(applySurfaceTexture(box(60, 40, 20), { ...ONCE, imageOwn: WHITE, tileHeight: 10, imageTurn: turn }), 60, 40, 20).filter((p) => p.by > 0.5);
      return { x: Math.max(...raised.map((p) => p.x)) - Math.min(...raised.map((p) => p.x)), y: Math.max(...raised.map((p) => p.y)) - Math.min(...raised.map((p) => p.y)) };
    };
    const flat = span(0);
    expect(flat.x).toBeGreaterThan(27);
    expect(flat.x).toBeLessThan(31);
    expect(flat.y).toBeGreaterThan(7);
    expect(flat.y).toBeLessThan(11);
    const turned = span(90);
    expect(turned.x).toBeLessThan(11);
    expect(turned.y).toBeGreaterThan(27);
  });

  it("swaps light and dark inside its box only: the surface beside it stays smooth", () => {
    const out = outOfBox(applySurfaceTexture(box(60, 40, 20), { ...ONCE, imageInvert: true }), 60, 40, 20);
    const raised = out.filter((p) => p.by > 0.5);
    // The dark frame round the square now stands out, the square stays flat, and nothing beyond the box.
    expect(raised.some((p) => Math.abs(p.x) > 10)).toBe(true);
    expect(raised.some((p) => Math.abs(p.x) < 5 && Math.abs(p.y - 20) < 5)).toBe(false);
    expect(out.every((p) => Math.abs(p.x) <= 15.5 && Math.abs(p.y - 20) <= 15.5)).toBe(true);
  });

  it("is pressed into the surface going inward, and keeps its width round a cylinder", () => {
    const result = applySurfaceTexture(cylinder(20, 50), { ...ONCE, imageOwn: WHITE, direction: "inward" });
    expect(result.stats.image?.placed).toBe(true);
    expectClosed(result);
    const along: number[] = [];
    const v = result.vertices;
    for (let i = 0; i < v.length; i += 3) {
      const [x, y, z] = [v[i], v[i + 1], v[i + 2]];
      if (y < 0.5 || y > 49.5) continue;
      if (20 - Math.hypot(x, z) > 0.5) along.push(Math.atan2(x, z) * 20);
    }
    // 30 mm along the wall, round the front.
    expect(Math.max(...along) - Math.min(...along)).toBeGreaterThan(27);
    expect(Math.max(...along.map(Math.abs))).toBeLessThan(15.5);
  });

  it("goes onto the picked faces when Around and Height aim past them (#1206)", () => {
    // A flat plate with its top picked: Around 0 and Height 100 % aim at the top of the front wall.
    const result = applySurfaceTexture(box(60, 10, 40), { ...ONCE, faces: ["top"], textHeight: 100, direction: "inward" });
    expect(result.stats.image?.placed).toBe(true);
    expectClosed(result);
    const pressed: Vec3[] = [];
    const v = result.vertices;
    for (let i = 0; i < v.length; i += 3) {
      const [x, y, z] = [v[i], v[i + 1], v[i + 2]];
      if (Math.max(Math.abs(x) - 30, Math.abs(z) - 20, y - 10, -y) < -0.01) pressed.push([x, y, z]);
    }
    // Pressed into the top round its middle (the light square, 15 mm), not into the front wall or along its edge.
    expect(pressed.length).toBeGreaterThan(20);
    expect(pressed.every(([x, y, z]) => y > 8.9 && Math.abs(x) <= 9 && Math.abs(z) <= 9)).toBe(true);
    expect(Math.min(...pressed.map(([, y]) => y))).toBeCloseTo(9, 1);
  });

  it("keeps a sphere whole: no point left without its value, no long triangle through the body (#1268)", () => {
    for (const imageOwn of [SQUARE, WHITE]) {
      for (const direction of ["inward", "outward"]) {
        const result = applySurfaceTexture(sphere(50), { ...ONCE, imageOwn, direction, spacing: 60 });
        expect(result.stats.image?.placed).toBe(true);
        const edges = longestEdge(result);
        expect(edges.finite).toBe(true);
        expect(edges.longest).toBeLessThan(15);
        expectClosed(result);
      }
    }
  }, 60_000);

  /**
   * A line drawing as an SVG often is: 400 points a side, transparent, black lines - 3 points wide at 150 (0.45 mm on a
   * 60 mm image), 2 at 250 (0.3 mm), and, if asked, 4 along the left border - made one's own image as the inspector does.
   */
  function lineDrawing(leftBorder = false) {
    const n = 400, rgba = new Uint8ClampedArray(n * n * 4);
    for (let y = 0; y < n; y += 1) {
      for (let x = 0; x < n; x += 1) {
        if ((x >= 150 && x < 153) || (x >= 250 && x < 252) || (leftBorder && x < 4)) rgba.set([0, 0, 0, 255], (y * n + x) * 4);
      }
    }
    return surfaceTextureOwnImage(rgba, n, n);
  }

  /** The points of a textured cylinder of radius 25, halfway up, by where they lie along its wall (mm round the front) and how deep they are cut in. */
  function cutIn(result: SurfaceTextureResult) {
    const out: { along: number; depth: number }[] = [];
    const v = result.vertices;
    for (let i = 0; i < v.length; i += 3) {
      const [x, y, z] = [v[i], v[i + 1], v[i + 2]];
      if (y > 25 && y < 45) out.push({ along: Math.atan2(x, z) * 25, depth: 25 - Math.hypot(x, z) });
    }
    return out;
  }

  it("cuts a thin black line drawing on a transparent ground in sharply, to the full depth (#1268)", () => {
    const result = applySurfaceTexture(cylinder(25, 70), { pattern: "image", image: "own", imageOwn: lineDrawing(), imageTiling: "once", spacing: 60, depth: 3, direction: "inward" });
    expect(result.stats.image?.placed).toBe(true);
    expectClosed(result);
    const points = cutIn(result);
    // The 0.45 mm line, 7.3 mm left of the middle, goes in by the full 3 mm, and no wider than about a millimetre there.
    const first = points.filter((p) => Math.abs(p.along + 7.27) < 2);
    expect(Math.max(...first.map((p) => p.depth))).toBeGreaterThan(2.8);
    const deep = first.filter((p) => p.depth > 1.5).map((p) => p.along);
    expect(Math.max(...deep) - Math.min(...deep)).toBeLessThan(1);
    // The 0.3 mm line, 7.35 mm right of it, goes in too.
    expect(Math.max(...points.filter((p) => Math.abs(p.along - 7.35) < 1.5).map((p) => p.depth))).toBeGreaterThan(1.5);
    // The ground between them stays as it was.
    expect(Math.max(...points.filter((p) => Math.abs(p.along) < 3).map((p) => p.depth))).toBeLessThan(0.05);
  }, 60_000);

  it("softens a once image without its left border running over into its right one (#1268)", () => {
    const result = applySurfaceTexture(cylinder(25, 70), { pattern: "image", image: "own", imageOwn: lineDrawing(true), imageTiling: "once", spacing: 60, depth: 3, direction: "inward", imageBlur: 6 });
    const points = cutIn(result);
    // The line along the left border is cut in there; along the right border, where the drawing has nothing, nothing is.
    expect(Math.max(...points.filter((p) => p.along < -28 && p.along > -30).map((p) => p.depth))).toBeGreaterThan(0.05);
    expect(Math.max(...points.filter((p) => p.along > 27 && p.along < 30.5).map((p) => p.depth))).toBeLessThan(0.05);
  }, 60_000);
});
