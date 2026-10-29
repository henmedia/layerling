import { describe, expect, it } from "vitest";
import {
  applySurfaceTexture,
  createSurfaceTextureSession,
  insideToScreenPositions,
  makeSurfaceTextureLayout,
  normalizeSurfaceTexture,
  surfaceTexturePositions,
  surfaceTextureValueAt,
  SURFACE_TEXTURE_CARBON_WEAVES,
  type SurfaceTextureResult,
} from "@/lib/surfaceTexture";
import { prepareSurfaceBase, surfaceMeshReport } from "@/lib/surfaceTextureMesh";
import { analyzeTriangleSoup } from "@/lib/svgImport";

type Vec3 = [number, number, number];

/** A cup: a closed tube on the plate (inside frame, y up), wound outward. */
function tube(outer: number, inner: number, height: number, segments = 96): number[] {
  const out: number[] = [];
  const tri = (a: Vec3, b: Vec3, c: Vec3) => out.push(...a, ...b, ...c);
  const at = (r: number, k: number, y: number): Vec3 => {
    const a = (2 * Math.PI * k) / segments;
    return [r * Math.cos(a), y, r * Math.sin(a)];
  };
  for (let k = 0; k < segments; k += 1) {
    tri(at(outer, k, 0), at(outer, k, height), at(outer, k + 1, height));
    tri(at(outer, k, 0), at(outer, k + 1, height), at(outer, k + 1, 0));
    tri(at(inner, k, 0), at(inner, k + 1, height), at(inner, k, height));
    tri(at(inner, k, 0), at(inner, k + 1, 0), at(inner, k + 1, height));
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
const FLOATS = { twill22: [2, 2], twill21: [2, 1], twill31: [3, 1] } as const;
const SMALL = { maxTriangles: 250_000 };

describe("carbon in twill", () => {
  it("starts as fine raised bands in twill 2/2, the crossing bands as wide, and keeps what it is told within limits", () => {
    expect(normalizeSurfaceTexture({ pattern: "carbon" })).toMatchObject({ spacing: 2.5, depth: 0.4, width: 0.95, profile: "round", direction: "outward", carbonWeave: "twill22", carbonCross: 0 });
    expect(normalizeSurfaceTexture({ pattern: "carbon", carbonWeave: "twill31", carbonCross: "3.5" })).toMatchObject({ carbonWeave: "twill31", carbonCross: 3.5 });
    expect(normalizeSurfaceTexture({ pattern: "carbon", carbonWeave: "satin", carbonCross: -2 })).toMatchObject({ carbonWeave: "twill22", carbonCross: 0 });
    expect(normalizeSurfaceTexture({ pattern: "carbon", carbonCross: 400 }).carbonCross).toBe(50);
  });

  it.each(SURFACE_TEXTURE_CARBON_WEAVES)("goes round a cup in whole repeats of %s, so the diagonal closes at the seam", (carbonWeave) => {
    const period = FLOATS[carbonWeave][0] + FLOATS[carbonWeave][1];
    for (const radius of [9, 12.3, 20, 31.7]) {
      for (const carbonCross of [0, 3.3]) {
        const s = normalizeSurfaceTexture({ pattern: "carbon", carbonWeave, carbonCross, projection: "cylinder" });
        const layout = makeSurfaceTextureLayout(screenBase(tube(radius, radius - 2, 20)), s);
        expect(layout.around! % period).toBe(0);
        for (const z of [3.1, 7.7, 11.9, 16.3]) {
          const a = Math.PI - 1e-7;
          const before = surfaceTextureValueAt(radius * Math.cos(a), radius * Math.sin(a), z, Math.cos(a), Math.sin(a), 0, s, layout);
          const after = surfaceTextureValueAt(radius * Math.cos(-a), radius * Math.sin(-a), z, Math.cos(-a), Math.sin(-a), 0, s, layout);
          expect(Math.abs(before - after)).toBeLessThan(1e-3);
        }
      }
    }
  });

  it.each(SURFACE_TEXTURE_CARBON_WEAVES)("lays %s one band on from band to band, with floats as long as the weave says", (carbonWeave) => {
    const [over, under] = FLOATS[carbonWeave];
    const radius = 20;
    const s = normalizeSurfaceTexture({ pattern: "carbon", carbonWeave, carbonCross: 3, projection: "cylinder" });
    const layout = makeSurfaceTextureLayout(screenBase(tube(radius, radius - 2, 40)), s);
    const Su = layout.cell, Sv = 3;
    // u round the axis as the layout measures it: along its circle (fitted to the wall, a hair inside the corners).
    const at = (u: number, v: number) => {
      const a = u / layout.radius;
      return surfaceTextureValueAt(radius * Math.cos(a), radius * Math.sin(a), v, Math.cos(a), Math.sin(a), 0, s, layout);
    };
    // The twill's diagonal: one band along and one up, the weave is the same; one band along alone, it is not.
    let same = 0, moved = 0;
    for (let k = 0; k < 200; k += 1) {
      const u = 0.37 * k, v = 4 + 0.11 * k;
      same = Math.max(same, Math.abs(at(u + Su, v + Sv) - at(u, v)));
      moved = Math.max(moved, Math.abs(at(u + Su, v) - at(u, v)));
    }
    expect(same).toBeLessThan(1e-6);
    expect(moved).toBeGreaterThan(0.3);
    // Along an upright band's middle the longest stretch standing high is its float, `over` crossing bands long; along a
    // crossing band's middle, `under` upright bands long. Between floats the band dives under the crossing one.
    const longest = (value: (t: number) => number, from: number, to: number) => {
      let best = 0, run = 0;
      for (let t = from; t <= to; t += 0.01) {
        run = value(t) > 0.45 ? run + 0.01 : 0;
        best = Math.max(best, run);
      }
      return best;
    };
    const upright = longest((v) => at(0.5 * Su, v), 2, 38) / Sv;
    const crossing = longest((u) => at(u, 12.5 * Sv), 0, 3 * (over + under) * Su) / Su;
    expect(upright).toBeGreaterThan(over - 0.25);
    expect(upright).toBeLessThan(over + 0.05);
    expect(crossing).toBeGreaterThan(under - 0.25);
    expect(crossing).toBeLessThan(under + 0.05);
  });

  it.each(SURFACE_TEXTURE_CARBON_WEAVES)("makes %s round a cup and on a box closed, raised by at most its depth", (carbonWeave) => {
    const result = applySurfaceTexture(tube(12, 10, 15), { pattern: "carbon", carbonWeave, projection: "cylinder" }, SMALL);
    expectClosed(result);
    expect(result.stats.nothing).toBe(false);
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < result.vertices.length; i += 3) {
      const r = Math.hypot(result.vertices[i], result.vertices[i + 2]);
      if (r < 11 || result.vertices[i + 1] < 1 || result.vertices[i + 1] > 14) continue;
      lo = Math.min(lo, r);
      hi = Math.max(hi, r);
    }
    expect(hi).toBeLessThan(12 + 0.4 + 1e-6);
    expect(lo).toBeGreaterThan(12 - 0.05);
    expect(hi - lo).toBeGreaterThan(0.3);
    const onBox = applySurfaceTexture(box(16, 12, 16), { pattern: "carbon", carbonWeave, carbonCross: 3 }, SMALL);
    expectClosed(onBox);
    expect(onBox.stats.nothing).toBe(false);
  }, 120_000);

  it("comes out as made anew when the weave or the crossing bands change", () => {
    const soup = tube(10, 8, 12);
    const session = createSurfaceTextureSession(soup);
    session.apply({ pattern: "carbon" });
    for (const change of [{ carbonWeave: "twill31" }, { carbonWeave: "twill31", carbonCross: 4 }]) {
      const kept = surfaceTexturePositions(session.apply({ pattern: "carbon", ...change }));
      const fresh = surfaceTexturePositions(applySurfaceTexture(soup, { pattern: "carbon", ...change }));
      // Counted rather than compared whole: a list this long would take minutes to show where it differs.
      const differing = kept.length === fresh.length ? kept.filter((value, i) => value !== fresh[i]).length : -1;
      expect(differing).toBe(0);
    }
  }, 120_000);
});
