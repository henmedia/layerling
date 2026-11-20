import manifoldModule from "manifold-3d";
import { beforeAll, describe, expect, it } from "vitest";
import { holeFitPolygon, holePatternCenters, holePatternCutsAtEdge, holePatternEdgeBorder, holePatternTopLayer, holePatternWall, normalizeHolePattern, rectangleOutline, type HolePatternSettings } from "@/lib/holePattern";
import { HOLE_OVERSHOOT, holePatternShapes, TOP_LAYER_OVERCUT, type PerforableFace } from "@/lib/holePatternShapes";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";

beforeAll(async () => {
  const runtime = await manifoldModule();
  runtime.setup();
  rememberManifoldRuntime(runtime);
});

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

  describe("with a frame along the edge", () => {
    const face: PerforableFace = {
      workplane: { origin: { x: 0, y: 10, z: 0 }, normal: { x: 0, y: 1, z: 0 }, xAxis: { x: 1, y: 0, z: 0 }, zAxis: { x: 0, y: 0, z: 1 } } as PerforableFace["workplane"],
      outline: rectangleOutline(-45, -35, 45, 35),
      thickness: 6,
    };

    it("applies only where the edge cuts the holes", () => {
      expect(holePatternEdgeBorder(honeycomb({ edgeBorder: 2 }))).toBe(2);
      expect(holePatternEdgeBorder(honeycomb({ edgeBorder: 2, margin: 1 }))).toBe(0);
      expect(holePatternEdgeBorder(honeycomb({ edgeBorder: 2, depth: 3 }))).toBe(0);
      expect(holePatternEdgeBorder(honeycomb({ edgeBorder: 50 }))).toBe(20);
      expect(normalizeHolePattern({ edgeBorder: -3 }).edgeBorder).toBe(0);
    });

    it("cuts the holes off where a 2 mm frame starts, and makes the frame as a solid band round the face", () => {
      const settings = honeycomb({ edgeBorder: 2 });
      const plan = holePatternShapes(face, settings, "Hole");
      expect(plan.edgeCut?.border).toBe(2);
      expect(plan.holes.length).toBeGreaterThan(150);
      // Every hole bites into the face inside the frame: its middle or a corner well within 43 x 33.
      const { centers } = holePatternCenters(face.outline, settings);
      for (const c of centers) {
        const points = [c, ...corners(settings, c)];
        expect(points.some((p) => Math.abs(p.u) < 43 && Math.abs(p.v) < 33)).toBe(true);
      }
      const frame = plan.frame!;
      expect(frame).toBeDefined();
      expect(frame.hole).toBe(false);
      expect(frame.width).toBeCloseTo(90, 4);
      expect(frame.depth).toBeCloseTo(70, 4);
      expect(frame.height).toBeCloseTo(6, 4);
      // From the face (y 10) down through the body's thickness.
      expect(frame.elevation).toBeCloseTo(4, 4);
      // A closed band of the right volume, facing outwards: (90 x 70 - 86 x 66) x 6.
      const p = frame.importedMesh!.positions;
      let volume = 0;
      for (let i = 0; i < p.length; i += 9) {
        const [ax, ay, az, bx, by, bz, cx, cy, cz] = p.slice(i, i + 9);
        volume += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
      }
      expect(volume).toBeCloseTo((90 * 70 - 86 * 66) * 6, 1);
    });

    it("makes no frame at 0", () => {
      const plan = holePatternShapes(face, honeycomb({ edgeBorder: 0 }), "Hole");
      expect(plan.frame).toBeUndefined();
      expect(plan.edgeCut?.border).toBe(0);
    });
  });

  describe("with a top layer in a second colour", () => {
    const face: PerforableFace = {
      workplane: { origin: { x: 0, y: 10, z: 0 }, normal: { x: 0, y: 1, z: 0 }, xAxis: { x: 1, y: 0, z: 0 }, zAxis: { x: 0, y: 0, z: 1 } } as PerforableFace["workplane"],
      outline: rectangleOutline(-45, -35, 45, 35),
      thickness: 6,
    };

    it("is made for a pattern of plain holes only, and stays thinner than the body", () => {
      expect(holePatternTopLayer(honeycomb({ topLayer: true }), 6)).toEqual({ thickness: 1, color: "#ffffff" });
      expect(holePatternTopLayer(honeycomb({ topLayer: true, topLayerThickness: 2.5, topLayerColor: "#D41721" }), 6)).toEqual({ thickness: 2.5, color: "#d41721" });
      expect(holePatternTopLayer(honeycomb({ topLayer: true, topLayerThickness: 9 }), 6)!.thickness).toBeCloseTo(5.8, 9);
      expect(holePatternTopLayer(honeycomb({ topLayer: false }), 6)).toBeNull();
      // Any depth set before: the holes go through the layer only.
      expect(holePatternTopLayer(honeycomb({ topLayer: true, depth: 2 }), 6)).not.toBeNull();
      expect(holePatternTopLayer(honeycomb({ topLayer: true, form: "round", holeType: "counterbore", headSize: 9, headDepth: 2 }), 6)).toBeNull();
      expect(holePatternTopLayer(honeycomb({ topLayer: true, arrangement: "corners" }), 6)).toBeNull();
      expect(holePatternTopLayer(honeycomb({ topLayer: true }), 0.3)).toBeNull();
      // Any margin: the top layer does not need the edge to cut the holes.
      expect(holePatternTopLayer(honeycomb({ topLayer: true, margin: 3 }), 6)).not.toBeNull();
    });

    it("gives the slab of the face, as thick as asked, in its colour", () => {
      const plan = holePatternShapes(face, honeycomb({ topLayer: true, topLayerThickness: 1, topLayerColor: "#d41721", edgeBorder: 2 }), "Hole");
      const layer = plan.topLayer!;
      expect(layer.thickness).toBe(1);
      expect(layer.slab.color).toBe("#d41721");
      expect(layer.slab.width).toBeCloseTo(90, 4);
      expect(layer.slab.depth).toBeCloseTo(70, 4);
      expect(layer.slab.height).toBeCloseTo(1, 4);
      // From the face (y 10) one mm down.
      expect(layer.slab.elevation).toBeCloseTo(9, 4);
      expect(plan.frame).toBeDefined();
    });

    it("cuts the holes through the layer only, so the body stays solid below it", () => {
      const plan = holePatternShapes(face, honeycomb({ topLayer: true, topLayerThickness: 1.2 }), "Hole");
      expect(plan.holes.length).toBeGreaterThan(150);
      for (const hole of plan.holes) {
        // From HOLE_OVERSHOOT above the face to a hair under the layer.
        expect(hole.height).toBeCloseTo(HOLE_OVERSHOOT + 1.2 + TOP_LAYER_OVERCUT, 6);
        expect(hole.elevation).toBeCloseTo(10 - 1.2 - TOP_LAYER_OVERCUT, 6);
      }
      // The edge still cuts the net's holes at margin 0, even with a depth set before.
      expect(holePatternShapes(face, honeycomb({ topLayer: true, depth: 3 }), "Hole").edgeCut).toBeDefined();
    });
  });
});
