import { describe, expect, it } from "vitest";
import {
  applySurfaceTexture,
  insideToScreenPositions,
  makeSurfaceTextureLayout,
  normalizeSurfaceTexture,
  SURFACE_TEXTURE_BARK_TYPES,
  surfaceTexturePositions,
  surfaceTextureValueAt,
  type SurfaceTextureResult,
} from "@/lib/surfaceTexture";
import { prepareSurfaceBase, surfaceMeshReport } from "@/lib/surfaceTextureMesh";
import { analyzeTriangleSoup } from "@/lib/svgImport";

type Vec3 = [number, number, number];

/** A closed cylinder standing on the plate (inside frame, y up), faces wound outward. */
function cylinder(radius: number, height: number, segments = 96): number[] {
  const out: number[] = [];
  const tri = (a: Vec3, b: Vec3, c: Vec3) => out.push(...a, ...b, ...c);
  const at = (k: number, y: number): Vec3 => {
    const a = (2 * Math.PI * k) / segments;
    return [radius * Math.cos(a), y, radius * Math.sin(a)];
  };
  for (let k = 0; k < segments; k += 1) {
    tri(at(k, 0), at(k, height), at(k + 1, height));
    tri(at(k, 0), at(k + 1, height), at(k + 1, 0));
    tri([0, height, 0], at(k + 1, height), at(k, height));
    tri([0, 0, 0], at(k, 0), at(k + 1, 0));
  }
  return out;
}

/** A closed box standing on the plate, inside frame, faces wound outward. */
function box(w: number, h: number, d: number): number[] {
  const [x0, x1, y0, y1, z0, z1] = [-w / 2, w / 2, 0, h, -d / 2, d / 2];
  const p: Vec3[] = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]];
  const faces = [[0, 1, 2], [0, 2, 3], [4, 6, 5], [4, 7, 6], [0, 4, 5], [0, 5, 1], [3, 2, 6], [3, 6, 7], [0, 3, 7], [0, 7, 4], [1, 5, 6], [1, 6, 2]];
  return faces.flatMap((face) => face.flatMap((i) => p[i]));
}

function expectClosed(result: SurfaceTextureResult) {
  expect(surfaceMeshReport(result.indices, result.vertices.length / 3)).toEqual({ shells: 1, openEdges: 0, nonManifoldEdges: 0 });
  const analysis = analyzeTriangleSoup(surfaceTexturePositions(result));
  expect(analysis.degenerateTriangles).toBe(0);
  expect(analysis.boundaryEdges).toBe(0);
  expect(analysis.nonManifoldEdges).toBe(0);
}

/** The pattern on a body (screen frame, z up): its settings, its layout and its value at a point with a normal. */
function onBody(positions: number[], settings: Record<string, unknown>) {
  const s = normalizeSurfaceTexture(settings);
  const layout = makeSurfaceTextureLayout(prepareSurfaceBase(insideToScreenPositions(positions)), s);
  return { s, layout, at: (x: number, y: number, z: number, n: Vec3) => surfaceTextureValueAt(x, y, z, n[0], n[1], n[2], s, layout) };
}

/** How many rings a line crosses: the times the value falls from earlywood (above `half`) to latewood. */
function ringsAlong(value: (t: number) => number, length: number, half = 0.5, steps = 4000) {
  let count = 0;
  let previous = value(0);
  for (let k = 1; k <= steps; k += 1) {
    const next = value((length * k) / steps);
    if (previous > half && next <= half) count += 1;
    previous = next;
  }
  return count;
}

describe("bark and wood settings", () => {
  it("start each bark at its own size and depth, and show the rings on a log's ends", () => {
    expect(normalizeSurfaceTexture({ pattern: "bark" })).toMatchObject({ barkType: "oak", spacing: 8, depth: 1.5, topFree: 0, bottomFree: 0, keepEdges: false });
    expect(normalizeSurfaceTexture({ pattern: "bark", barkType: "birch" })).toMatchObject({ spacing: 10, depth: 0.6 });
    expect(normalizeSurfaceTexture({ pattern: "bark", barkType: "beech", spacing: 20, depth: 0.3 })).toMatchObject({ spacing: 20, depth: 0.3 });
    expect(normalizeSurfaceTexture({ pattern: "bark", barkType: "elm" })).toMatchObject({ barkType: "oak" });
  });

  it("start each wood at its own ring width, and keep the rest within limits", () => {
    expect(normalizeSurfaceTexture({ pattern: "wood" })).toMatchObject({ woodType: "oak", woodCut: "log", ringWidth: 3, depth: 0.8, topFree: 0, bottomFree: 0, keepEdges: false, woodKnots: 0, woodWobble: 0.5 });
    expect(normalizeSurfaceTexture({ pattern: "wood", woodType: "pine" })).toMatchObject({ ringWidth: 4 });
    expect(normalizeSurfaceTexture({ pattern: "wood", woodType: "teak", woodCut: "rotary", woodKnots: 30.6, woodWobble: -1, ringWidth: 0 })).toMatchObject({ woodType: "oak", woodCut: "log", woodKnots: 12, woodWobble: 0, ringWidth: 0.3 });
  });
});

describe("bark", () => {
  it("closes round a cylinder for every tree, deeper in its furrows than on its ridges", () => {
    for (const barkType of SURFACE_TEXTURE_BARK_TYPES) {
      const { layout, at } = onBody(cylinder(15, 30), { pattern: "bark", barkType, projection: "cylinder" });
      const R = layout.radius;
      const side = (angle: number, z: number) => at(R * Math.cos(angle), R * Math.sin(angle), z, [Math.cos(angle), Math.sin(angle), 0]);
      for (const z of [6.3, 14.1, 22.7]) expect(Math.abs(side(Math.PI - 1e-7, z) - side(-Math.PI + 1e-7, z))).toBeLessThan(1e-3);
      const values = Array.from({ length: 400 }, (_, k) => side((2 * Math.PI * k) / 400, 15));
      values.forEach((value) => {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      });
      expect(Math.max(...values) - Math.min(...values)).toBeGreaterThan(0.3);
    }
  });

  it("shows the annual rings of its wood on a log's ends, less deep than the bark", () => {
    const { at } = onBody(cylinder(15, 30), { pattern: "bark", barkType: "oak", projection: "cylinder", ringWidth: 2 });
    const top = (r: number) => at(r, 0, 30, [0, 0, 1]);
    expect(ringsAlong(top, 14, 0.2)).toBeGreaterThanOrEqual(4);
    for (let r = 0; r < 14; r += 0.1) expect(top(r)).toBeLessThanOrEqual(0.4 + 1e-9);
  });

  it("lays a closed bark onto a log, right up to its edges", () => {
    for (const barkType of ["oak", "birch"]) {
      const result = applySurfaceTexture(cylinder(10, 16), { pattern: "bark", barkType, detail: "coarse" });
      expectClosed(result);
      expect(result.stats.around).toBeGreaterThan(0);
    }
    // No smooth rim at the top standing out round the bark like a column's: next to the edge, no point of the side stays
    // at the log's full radius (kept smooth, about one in eleven did).
    const oak = applySurfaceTexture(cylinder(10, 16), { pattern: "bark", barkType: "oak", detail: "coarse" });
    const v = oak.vertices;
    let rim = 0, full = 0;
    for (const i of new Set(oak.indices)) {
      const r = Math.hypot(v[i * 3], v[i * 3 + 2]), y = v[i * 3 + 1];
      if (y > 15 && r > 8.4) {
        rim += 1;
        if (r > 9.97) full += 1;
      }
    }
    expect(rim).toBeGreaterThan(50);
    expect(full).toBe(0);
  }, 30000);

  it("cuts its furrows along their levels round a log, and the side's long strips do not use up the budget", () => {
    for (const barkType of ["pine", "spruce"]) {
      const result = applySurfaceTexture(cylinder(15, 30, 148), { pattern: "bark", barkType });
      expectClosed(result);
      // The side came in strips 30 mm long and 0.6 mm wide: halved in their own shape they ran out of triangles, and the
      // bark was laid on a coarser grid of slivers, in streaks.
      expect(result.stats.limited).toBe(false);
      // Taken at the grid's points, a furrow's flank crossing it came out as a zip of small triangles folding against each
      // other: few bends over 30 degrees on the side now, away from the ends.
      // (Pine about 15 000 before, spruce about 40 000.)
      expect(sideBends(result, 30, (p) => p[1] > 2 && p[1] < 28)).toBeLessThan(600);
    }
  }, 120000);

  it("cuts its furrows along their levels on a box's faces as well, taken without smoothing, and they do not fold", () => {
    const result = applySurfaceTexture(box(40, 30, 30), { pattern: "bark", barkType: "pine" });
    expectClosed(result);
    expect(sideBends(result, 30, (p) => p[1] > 2 && p[1] < 28 && Math.abs(p[0]) < 18 && Math.abs(p[2]) < 13)).toBeLessThan(50);
  }, 60000);
});

/** How many edges between two triangles bend by more than `degrees`, with their middle where `where` says (inside frame). */
function sideBends(result: SurfaceTextureResult, degrees: number, where: (p: Vec3) => boolean) {
  const v = result.vertices, I = result.indices;
  const normal = (t: number): Vec3 => {
    const [a, b, c] = [I[t * 3], I[t * 3 + 1], I[t * 3 + 2]];
    const u = [v[b * 3] - v[a * 3], v[b * 3 + 1] - v[a * 3 + 1], v[b * 3 + 2] - v[a * 3 + 2]];
    const w = [v[c * 3] - v[a * 3], v[c * 3 + 1] - v[a * 3 + 1], v[c * 3 + 2] - v[a * 3 + 2]];
    const n: Vec3 = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    const l = Math.hypot(...n) || 1;
    return [n[0] / l, n[1] / l, n[2] / l];
  };
  const first = new Map<string, number>();
  const limit = Math.cos((degrees * Math.PI) / 180);
  let count = 0;
  for (let t = 0; t < I.length / 3; t += 1) {
    for (let k = 0; k < 3; k += 1) {
      const p = I[t * 3 + k], q = I[t * 3 + ((k + 1) % 3)];
      const key = p < q ? `${p},${q}` : `${q},${p}`;
      const other = first.get(key);
      if (other === undefined) {
        first.set(key, t);
        continue;
      }
      const middle: Vec3 = [(v[p * 3] + v[q * 3]) / 2, (v[p * 3 + 1] + v[q * 3 + 1]) / 2, (v[p * 3 + 2] + v[q * 3 + 2]) / 2];
      if (!where(middle)) continue;
      const [n1, n2] = [normal(t), normal(other)];
      if (n1[0] * n2[0] + n1[1] * n2[1] + n1[2] * n2[2] < limit) count += 1;
    }
  }
  return count;
}

describe("wood grain", () => {
  it("shows the annual rings on a log's end, as many as fit its radius", () => {
    const fine = onBody(cylinder(20, 30), { pattern: "wood", woodType: "pine", ringWidth: 2, woodWobble: 0 });
    const coarse = onBody(cylinder(20, 30), { pattern: "wood", woodType: "pine", ringWidth: 4, woodWobble: 0 });
    const fineRings = ringsAlong((r) => fine.at(r, 0, 30, [0, 0, 1]), 19);
    const coarseRings = ringsAlong((r) => coarse.at(r, 0, 30, [0, 0, 1]), 19);
    expect(Math.abs(fineRings - 19 / 2)).toBeLessThanOrEqual(2.5);
    expect(Math.abs(coarseRings - 19 / 4)).toBeLessThanOrEqual(1.5);
    // The grain is a solid: along the top's edge the end and the side see the same rings.
    expect(ringsAlong((r) => fine.at(r, 0, 30, [1, 0, 0]), 19)).toBe(fineRings);
  });

  it("keeps the rings' steps as sharp on a board's face as on its end", () => {
    // Pine: no rays, whose edges would be steep anywhere.
    const board = onBody(box(60, 12, 30), { pattern: "wood", woodType: "pine", woodCut: "flatSawn", woodWobble: 0 });
    // The steepest change per mm along a line: along the face (top, z = 12), where the arches stretch the rings most, and
    // across the end (x = 30).
    const steepest = (value: (t: number) => number, length: number, steps = 6000) => {
      let most = 0;
      for (let k = 1; k <= steps; k += 1) most = Math.max(most, Math.abs(value((length * k) / steps) - value((length * (k - 1)) / steps)) / (length / steps));
      return most;
    };
    const face = Math.max(...[-5, 0, 5].map((y) => steepest((t) => board.at(-30 + t, y, 12, [0, 0, 1]), 60)));
    const end = steepest((t) => board.at(30, -15 + t, 6, [1, 0, 0]), 30);
    expect(face).toBeGreaterThan(0.5 * end);
  });

  it("cuts a flat-sawn board's face across its rings, and a quarter-sawn one along them", () => {
    const flat = onBody(box(60, 12, 30), { pattern: "wood", woodType: "oak", woodCut: "flatSawn", woodWobble: 0 });
    const quarter = onBody(box(60, 12, 30), { pattern: "wood", woodType: "oak", woodCut: "quarterSawn", woodWobble: 0 });
    // The board's face is its top (screen frame: z = 12), its length along x and its width along y.
    const across = (body: typeof flat, x: number) => ringsAlong((t) => body.at(x, -15 + t, 12, [0, 0, 1]), 30);
    const along = (body: typeof flat, y: number) => ringsAlong((t) => body.at(-30 + t, y, 12, [0, 0, 1]), 60);
    expect(across(flat, 0)).toBeGreaterThanOrEqual(2);
    expect(along(flat, 0)).toBeGreaterThanOrEqual(2);
    // Quarter-sawn: straight lines along the board, many across it.
    expect(across(quarter, 0)).toBeGreaterThanOrEqual(7);
    expect(along(quarter, 2)).toBeLessThanOrEqual(2);
  });

  it("bends the rings round its knots, the same for the same number", () => {
    const plain = onBody(cylinder(20, 40), { pattern: "wood", woodType: "pine", woodKnots: 0 });
    const knotty = onBody(cylinder(20, 40), { pattern: "wood", woodType: "pine", woodKnots: 4, seed: 7 });
    const again = onBody(cylinder(20, 40), { pattern: "wood", woodType: "pine", woodKnots: 4, seed: 7 });
    expect(knotty.layout.wood?.knots).toHaveLength(4);
    let differ = 0;
    for (let k = 0; k < 2000; k += 1) {
      const angle = (2 * Math.PI * k) / 200, z = 2 + (36 * Math.floor(k / 200)) / 10;
      const p: Vec3 = [19.5 * Math.cos(angle), 19.5 * Math.sin(angle), z];
      const n: Vec3 = [Math.cos(angle), Math.sin(angle), 0];
      if (Math.abs(plain.at(...p, n) - knotty.at(...p, n)) > 0.2) differ += 1;
      expect(knotty.at(...p, n)).toBe(again.at(...p, n));
    }
    expect(differ).toBeGreaterThan(20);
    // Every knot comes out of the side, not through the ends.
    knotty.layout.wood!.knots.forEach((knot) => {
      const t = (20 - Math.hypot(knot.at[0], knot.at[1])) / Math.hypot(knot.dir[0], knot.dir[1]);
      expect(knot.at[2] + t * knot.dir[2]).toBeLessThan(40);
    });
  });

  it("makes a closed log whose ends carry the rings", () => {
    const result = applySurfaceTexture(cylinder(10, 16), { pattern: "wood", woodType: "oak", detail: "coarse" });
    expectClosed(result);
    // The top (inside frame: y = 16) is textured: points on it lie lower than it.
    const top = Array.from(new Set(result.indices)).filter((i) => Math.hypot(result.vertices[i * 3], result.vertices[i * 3 + 2]) < 8 && result.vertices[i * 3 + 1] > 15);
    expect(Math.min(...top.map((i) => result.vertices[i * 3 + 1]))).toBeLessThan(16 - 0.1);
  }, 30000);
});
