import { describe, expect, it } from "vitest";
import { COMPUTED_PATTERNS, computedDetail, computedHeight, isComputedPattern } from "@/lib/vase/vase-computed-patterns.mjs";
import { EFFECTS, buildVase, isReliefPattern, normalizeParams } from "@/lib/vase/vase-geometry.mjs";
import { patternHeight, patternPreview } from "@/lib/vase/vase-patterns.mjs";

/*
 * The vase's worked-out relief patterns (vase-computed-patterns.mjs): formulas over the unrolled wall instead of
 * pictures. Each closes round the vase without a seam, stays between 0 and 1, builds a closed body and has no flank
 * steeper than the build's grid can draw.
 */

const FAMILIES = Object.keys(COMPUTED_PATTERNS);

/** Every edge walked once each way: the body is closed and oriented. */
function openEdges(mesh: { vertices: Float64Array; indices: Uint32Array }) {
  const key = (i: number) => `${Math.round(mesh.vertices[i * 3] * 1e4)},${Math.round(mesh.vertices[i * 3 + 1] * 1e4)},${Math.round(mesh.vertices[i * 3 + 2] * 1e4)}`;
  const edges = new Map<string, number>();
  for (let t = 0; t < mesh.indices.length; t += 3) {
    for (let k = 0; k < 3; k += 1) {
      const edge = `${key(mesh.indices[t + k])}>${key(mesh.indices[t + ((k + 1) % 3)])}`;
      edges.set(edge, (edges.get(edge) ?? 0) + 1);
    }
  }
  let bad = 0;
  for (const [edge, count] of edges) {
    const [a, b] = edge.split(">");
    if (count !== 1 || edges.get(`${b}>${a}`) !== 1) bad += 1;
  }
  return bad;
}

describe("the vase's worked-out relief patterns", () => {
  it("are eight families of the vase, reliefs like the ones from pictures", () => {
    expect(FAMILIES).toEqual(["wabennetz", "ziegel", "noppen", "gehaemmert", "strick", "korb", "ringe", "rauschen"]);
    for (const family of FAMILIES) {
      expect(isComputedPattern(family), family).toBe(true);
      expect(isReliefPattern(family), family).toBe(true);
      expect(EFFECTS[family], family).toBe(COMPUTED_PATTERNS[family]);
      expect(normalizeParams({ effect: family }).effect).toBe(family);
      expect(computedDetail(family, 0.45)).toBeGreaterThanOrEqual(1);
    }
    expect(isComputedPattern("waben")).toBe(false);
    expect(isComputedPattern("toString")).toBe(false);
  });

  it("stay between 0 and 1, use that range and close round the vase without a seam", () => {
    const around = 7;
    for (const family of FAMILIES) {
      let low = Infinity, high = -Infinity;
      for (let j = 0; j < 90; j += 1) {
        for (let i = 0; i < 90; i += 1) {
          const cu = (i / 90) * around, cv = (j / 90) * 5 - 1.3;
          const h = computedHeight(family, cu, cv, around, 0.45);
          low = Math.min(low, h);
          high = Math.max(high, h);
          // A whole turn on, and a whole turn back: the same height.
          expect(Math.abs(computedHeight(family, cu + around, cv, around, 0.45) - h), family).toBeLessThan(1e-9);
          expect(Math.abs(computedHeight(family, cu - around, cv, around, 0.45) - h), family).toBeLessThan(1e-9);
        }
      }
      expect(low, family).toBeGreaterThanOrEqual(0);
      expect(high, family).toBeLessThanOrEqual(1);
      expect(low, family).toBeLessThan(0.15);
      expect(high, family).toBeGreaterThan(0.85);
    }
  });

  it("build a closed body, sunk by the relief's depth at most", () => {
    for (const family of FAMILIES) {
      const mesh = buildVase({ profile: "bauchig", effect: family, reliefDepth: 2, quality: "entwurf", twist: 40, patternTwist: 20 });
      expect(openEdges(mesh), family).toBe(0);
      expect(mesh.triangleCount, family).toBeGreaterThan(20000);
    }
    const smooth = buildVase({ profile: "zylinder", quality: "entwurf" });
    const studs = buildVase({ profile: "zylinder", effect: "noppen", reliefDepth: 2, quality: "entwurf" });
    // The wall round half its height, a band tall enough to cross a row of studs: its nearest and farthest points from the axis.
    const radii = (mesh: { vertices: Float64Array }) => {
      let low = Infinity, high = 0;
      for (let i = 0; i < mesh.vertices.length; i += 3) {
        if (Math.abs(mesh.vertices[i + 2] - 90) > 14) continue;
        const r = Math.hypot(mesh.vertices[i], mesh.vertices[i + 1]);
        low = Math.min(low, r);
        high = Math.max(high, r);
      }
      return { low, high };
    };
    expect(radii(smooth).high - radii(smooth).low).toBeLessThan(0.01);
    expect(radii(studs).high).toBeLessThanOrEqual(radii(smooth).high + 1e-6);
    expect(radii(studs).high - radii(studs).low).toBeGreaterThan(1.5);
    expect(radii(studs).high - radii(studs).low).toBeLessThanOrEqual(2 + 1e-6);
  }, 120000);

  it("have no flank steeper than the grid can draw, so a slanted edge is not a row of teeth", () => {
    // The largest step between two neighbouring points round the vase, of a relief 1.6 mm deep.
    for (const family of FAMILIES) {
      const mesh = buildVase({ profile: "zylinder", effect: family, quality: "standard", printFriendly: "nein" });
      const { segments, rows } = mesh.grid;
      let most = 0;
      for (let i = 0; i <= rows; i += 1) {
        for (let j = 0; j < segments; j += 1) {
          const a = (i * segments + j) * 3, b = (i * segments + ((j + 1) % segments)) * 3;
          most = Math.max(most, Math.abs(Math.hypot(mesh.vertices[a], mesh.vertices[a + 1]) - Math.hypot(mesh.vertices[b], mesh.vertices[b + 1])));
        }
      }
      expect(most, family).toBeLessThan(0.62);
    }
  }, 120000);

  it("keep their size where the vase narrows, if asked: fewer round there instead of smaller ones", () => {
    // A funnel, narrow at the bottom: the bricks of a course counted by the joints between them.
    const bricksAt = (mesh: { vertices: Float64Array }, z: number) => {
      const columns = 300;
      const most = new Float64Array(columns);
      for (let i = 0; i < mesh.vertices.length; i += 3) {
        if (Math.abs(mesh.vertices[i + 2] - z) > 0.7) continue;
        const column = Math.floor(((Math.atan2(mesh.vertices[i + 1], mesh.vertices[i]) + Math.PI) / (2 * Math.PI)) * columns) % columns;
        most[column] = Math.max(most[column], Math.hypot(mesh.vertices[i], mesh.vertices[i + 1]));
      }
      const filled = [...most].filter((r) => r > 0);
      const high = Math.max(...filled);
      const raised = filled.map((r) => high - r < 1);
      let count = 0;
      for (let k = 0; k < raised.length; k += 1) if (raised[k] && !raised[(k + raised.length - 1) % raised.length]) count += 1;
      return count;
    };
    // The middle of a course of bricks near a height (courses are half a cell high; the joints between lie lower).
    const courseNear = (mesh: { vertices: Float64Array }, from: number) => {
      let best = 0, at = from;
      for (let z = from; z < from + 14; z += 0.7) {
        const n = bricksAt(mesh, z);
        if (n > best) {
          best = n;
          at = z;
        }
      }
      return { count: best, at };
    };
    const settings = { profile: "trichter", effect: "ziegel", patternCount: 12, reliefDepth: 2, quality: "standard" };
    const shrinking = buildVase(settings);
    const kept = buildVase({ ...settings, leafFixed: "ja" });
    expect(openEdges(kept)).toBe(0);
    // As the count says everywhere - or as many as fit: at the narrow foot clearly fewer than at the wide rim.
    expect(courseNear(shrinking, 20).count).toBe(12);
    expect(courseNear(shrinking, 160).count).toBe(12);
    const low = courseNear(kept, 20).count, high = courseNear(kept, 160).count;
    expect(high).toBe(12);
    expect(low).toBeLessThan(10);
    expect(low).toBeGreaterThanOrEqual(6);
    // Wisp ribs run up the vase in one piece: they do not take the switch.
    const ribs = { profile: "trichter", effect: "wisp", quality: "entwurf" };
    expect(Array.from(buildVase({ ...ribs, leafFixed: "ja" }).vertices.slice(0, 600))).toEqual(Array.from(buildVase(ribs).vertices.slice(0, 600)));
  }, 120000);

  it("follow the width of their joints and strands, and turn inside out", () => {
    const p = normalizeParams({ effect: "wabennetz" });
    // In the middle of a joint (where three hexagons meet lies at cu 0, cv 1/sqrt 3): narrow joints leave more raised.
    const share = (width: number) => {
      let raised = 0;
      for (let i = 0; i < 400; i += 1) if (computedHeight("wabennetz", i / 400, 0.31, 6, width) > 0.5) raised += 1;
      return raised / 400;
    };
    expect(share(0.2)).toBeGreaterThan(share(0.8));
    const h = patternHeight(p, 0.5, 0.2, 6);
    expect(patternHeight({ ...p, patternInvert: "ja" }, 0.5, 0.2, 6)).toBeCloseTo(1 - h, 9);
    // The gallery shades a tile from the same heights.
    const tile = patternPreview(p, 24, 24);
    expect(Math.max(...tile)).toBeGreaterThan(0.9);
    expect(Math.min(...tile)).toBeLessThan(0.1);
  });
});
