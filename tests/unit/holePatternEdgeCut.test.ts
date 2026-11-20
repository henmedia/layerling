import { describe, expect, it } from "vitest";
import { holeFitPolygon, holePatternCenters, holePatternCutsAtEdge, holePatternWall, normalizeHolePattern, type HolePatternSettings } from "@/lib/holePattern";

type P = { u: number; v: number };
const rect = (w: number, d: number): P[] => [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([u, v]) => ({ u, v }));
const square = (u: number, v: number, side: number): P[] => [[u, v], [u, v + side], [u + side, v + side], [u + side, v]].map(([a, b]) => ({ u: a, v: b }));
const honeycomb = (patch: Partial<HolePatternSettings> = {}) => normalizeHolePattern({ form: "hexagon", size: 5, spacing: 6, arrangement: "staggered", margin: 0, depth: null, ...patch });

const inside = (loops: P[][], p: P) => {
  let hit = false;
  for (const loop of loops) {
    for (let i = 0, j = loop.length - 1; i < loop.length; j = i, i += 1) {
      const a = loop[i];
      const b = loop[j];
      if ((a.v > p.v) !== (b.v > p.v) && p.u < ((b.u - a.u) * (p.v - a.v)) / (b.v - a.v) + a.u) hit = !hit;
    }
  }
  return hit;
};
const corners = (settings: HolePatternSettings, c: P) => holeFitPolygon(settings).map((p) => ({ u: c.u + p.u, v: c.v + p.v }));

describe("Hole pattern: the face's edge cuts the holes at margin 0 (Discussion #1771)", () => {
  it("applies to plain through holes of a grid or staggered pattern only", () => {
    expect(holePatternCutsAtEdge(honeycomb())).toBe(true);
    expect(holePatternCutsAtEdge(honeycomb({ arrangement: "grid" }))).toBe(true);
    expect(holePatternCutsAtEdge(honeycomb({ margin: 0.5 }))).toBe(false);
    expect(holePatternCutsAtEdge(honeycomb({ depth: 2 }))).toBe(false);
    expect(holePatternCutsAtEdge(honeycomb({ arrangement: "perimeter" }))).toBe(false);
    expect(holePatternCutsAtEdge(honeycomb({ arrangement: "corners" }))).toBe(false);
    expect(holePatternCutsAtEdge(honeycomb({ form: "round", holeType: "counterbore", headSize: 9, headDepth: 2 }))).toBe(false);
    expect(holePatternCutsAtEdge(honeycomb({ form: "round", holeType: "countersink", headSize: 9 }))).toBe(false);
    expect(holePatternCutsAtEdge(honeycomb({ form: "custom" }))).toBe(false);
  });

  it("runs a honeycomb right to the edge of a 90 x 70 panel, the outer holes cut off by it", () => {
    const loops = [rect(90, 70)];
    const cut = holePatternCenters({ loops }, honeycomb());
    const kept = holePatternCenters({ loops }, honeycomb({ margin: 0.0001 }));
    expect(cut.edgeCut).toBeDefined();
    expect(kept.edgeCut).toBeUndefined();
    expect(cut.centers.length).toBeGreaterThan(kept.centers.length);
    // Holes reach past every side of the panel.
    const settings = honeycomb();
    const out = (test: (p: P) => boolean) => cut.centers.some((c) => corners(settings, c).some(test));
    expect(out((p) => p.u < -45)).toBe(true);
    expect(out((p) => p.u > 45)).toBe(true);
    expect(out((p) => p.v < -35)).toBe(true);
    expect(out((p) => p.v > 35)).toBe(true);
    // Every hole still bites into the panel, its middle or a corner well on it.
    for (const c of cut.centers) {
      const points = [c, ...corners(settings, c)];
      expect(points.some((p) => inside(loops, p))).toBe(true);
    }
    // No two holes in the same place.
    const keys = new Set(cut.centers.map((c) => `${c.u.toFixed(4)},${c.v.toFixed(4)}`));
    expect(keys.size).toBe(cut.centers.length);
  });

  it("leaves out a hole that would only scratch the edge or that lies wholly in an opening", () => {
    // A single hole's worth: a 5 mm round hole on a 6 mm step, the face 30 x 30 with a 12 mm square opening.
    const loops = [rect(30, 30), square(-6, -6, 12)];
    const settings = honeycomb({ form: "round", size: 5, spacing: 6, arrangement: "grid" });
    const { centers } = holePatternCenters({ loops }, settings);
    const r = 2.5;
    for (const c of centers) {
      // Not wholly inside the opening.
      const inOpening = Math.abs(c.u) <= 6 - r && Math.abs(c.v) <= 6 - r;
      expect(inOpening).toBe(false);
      // Not off the face but for a sliver: some part reaches 0.4 mm onto it.
      const reach = Math.max(15 - (Math.abs(c.u) - r), 0);
      const reachV = Math.max(15 - (Math.abs(c.v) - r), 0);
      expect(Math.min(reach, reachV)).toBeGreaterThanOrEqual(0.4 - 1e-6);
    }
  });

  it("lays the lattice so as few holes as it can leave a thin strip along the edge, and counts the rest", () => {
    const settings = honeycomb({ form: "round", size: 4, spacing: 6, arrangement: "grid" });
    const wall = holePatternWall(settings);
    expect(wall).toBeCloseTo(2, 6);
    // 6 mm steps on a 31 mm face: laid on a hole the outer holes keep only 1.5 mm to the edge, laid between holes they cross it.
    const result = holePatternCenters({ loops: [rect(31, 31)] }, settings);
    expect(result.edgeCut?.thin).toBe(0);
    for (const c of result.centers) {
      const gaps = [15.5 - (Math.abs(c.u) + 2), 15.5 - (Math.abs(c.v) + 2)];
      // Either cut by the edge (gap below 0) or touching it, or clear of it by at least a wall.
      for (const gap of gaps) expect(gap <= 0.01 || gap >= wall - 1e-6).toBe(true);
    }
  });

  it("moves a staggered honeycomb off the middle when that is the only way to leave no thin strip", () => {
    // The Raspberry Pi cluster's front panel: 90 x 70 mm, honeycomb 5 mm across the corners on a 6 mm step.
    const loops = [rect(90, 70)];
    const result = holePatternCenters({ loops }, honeycomb());
    expect(result.edgeCut?.thin).toBe(0);
    expect(result.centers.length).toBeGreaterThan(150);
  });

  it("says how many thin strips are left when no way of laying the lattice avoids them", () => {
    // Round a circle the edge comes at every distance: some holes inside keep a thin strip to it, and they are counted.
    const n = 256;
    const circle = Array.from({ length: n }, (_, i) => ({ u: 60 * Math.cos((2 * Math.PI * i) / n), v: 60 * Math.sin((2 * Math.PI * i) / n) }));
    const settings = honeycomb({ form: "round", size: 4, spacing: 6, arrangement: "grid" });
    const result = holePatternCenters({ loops: [circle] }, settings);
    const wall = result.edgeCut!.wall;
    expect(result.edgeCut!.thin).toBeGreaterThan(0);
    // The holes wholly on the face closer to the edge than a wall (give or take the circle's and the holes' facets).
    const gaps = result.centers.map((c) => 60 - (Math.hypot(c.u, c.v) + 2)).filter((gap) => gap > 0);
    expect(result.edgeCut!.thin).toBeGreaterThanOrEqual(gaps.filter((gap) => gap > 0.1 && gap < wall - 0.1).length);
    expect(result.edgeCut!.thin).toBeLessThanOrEqual(gaps.filter((gap) => gap < wall + 0.1).length);
  });
});
