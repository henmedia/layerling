import * as THREE from "three";
import { describe, expect, it } from "vitest";
import {
  holePatternCenters,
  normalizeHolePattern,
  rackCenters,
  rackPanelFit,
  RACK_HOLE_SPACING,
  RACK_SLOT_LENGTH,
  RACK_SLOT_WIDTH,
  RACK_STANDARD_PANELS,
} from "@/lib/holePattern";
import { holePatternShapes, readPerforableFace } from "@/lib/holePatternShapes";
import { quaternionForShape } from "@/lib/geometryRotation";

const rect = (w: number, d: number) => [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([u, v]) => ({ u, v }));
const sorted = (points: Array<{ u: number; v: number }>) => points.map((p) => [Number(p.u.toFixed(4)), Number(p.v.toFixed(4))]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
const settings = (patch = {}) => normalizeHolePattern({ form: "round", size: 4.3, arrangement: "corners", margin: 5, rack: true, ...patch });

/** The rail's holes, 1/4, 7/8 and 1 1/2 inch up every 1 3/4 inch unit (EIA-310). */
const railHoles = Array.from({ length: 20 }, (_, unit) => [6.35, 22.225, 38.1].map((hole) => unit * 44.45 + hole)).flat();
const onRail = (spacing: number) => railHoles.some((a) => railHoles.some((b) => Math.abs(b - a - spacing) < 1e-6));

describe("19 inch rack holes", () => {
  it("puts a panel of any height in the middle of the whole units it takes, its holes on the rail and alike from both edges", () => {
    expect(rackPanelFit(43.65)).toEqual({ units: 1, spacing: 31.75, edge: 5.95 });
    expect(rackPanelFit(88.1)).toEqual({ units: 2, spacing: 76.2, edge: 5.95 });
    // 74 mm takes two units; centred in them, the rail holes 7/8 inch up the lower and 7/8 inch down the upper one.
    expect(rackPanelFit(74)).toEqual({ units: 2, spacing: 44.45, edge: 14.775 });
    expect(rackPanelFit(44.45)).toEqual({ units: 1, spacing: 31.75, edge: 6.35 });
    // On any unit of the rack: the panel's room starts on a unit's edge, so both holes meet rail holes there.
    for (const height of [20, 30, 43.65, 50, 74, 80, 100, 132.55, 150, 200, 265.9]) {
      const fit = rackPanelFit(height);
      if (!fit) continue;
      const room = fit.units * 44.45;
      const lower = (room - height) / 2 + fit.edge;
      for (const unit of [0, 3, 7]) {
        for (const y of [lower, lower + fit.spacing]) expect(railHoles.some((hole) => Math.abs(hole - (unit * 44.45 + y)) < 1e-5)).toBe(true);
      }
      expect(height - (fit.edge * 2 + fit.spacing)).toBeCloseTo(0, 6);
      expect(fit.edge).toBeGreaterThanOrEqual(5.95 - 1e-6);
    }
  });

  it("puts four slots 465.1 mm apart on a 74 mm panel, the same distance from its upper and lower edges", () => {
    const result = holePatternCenters({ loops: [rect(482.6, 74)] }, settings());
    expect(sorted(result.centers)).toEqual([[-232.55, -22.225], [-232.55, 22.225], [232.55, -22.225], [232.55, 22.225]]);
    expect(result.rack).toMatchObject({ ok: true, spacing: 44.45, edge: 14.775, space: 2, angle: 0 });
  });

  it("places the standard panels' holes as IEC 60297-3-100 has them", () => {
    const edges = [5.95, 5.95, 37.7, 37.7, 37.7, 37.7];
    RACK_STANDARD_PANELS.forEach((panel, index) => {
      const { centers, fit } = rackCenters([rect(482.6, panel.height)], { rackUnits: panel.units });
      expect(fit?.ok).toBe(true);
      expect(fit?.spacing).toBeCloseTo(panel.spacing, 6);
      expect(fit?.edge).toBeCloseTo(edges[index], 3);
      expect(onRail(panel.spacing)).toBe(true);
      const vs = [...new Set(centers.map((c) => Number(c.v.toFixed(4))))].sort((a, b) => a - b);
      expect(vs[1] - vs[0]).toBeCloseTo(panel.spacing, 4);
      const us = [...new Set(centers.map((c) => Number(c.u.toFixed(4))))].sort((a, b) => a - b);
      expect(us[1] - us[0]).toBeCloseTo(RACK_HOLE_SPACING, 4);
    });
  });

  it("lays the slots along the panel's width when the panel stands the other way in the face", () => {
    const result = holePatternCenters({ loops: [rect(74, 482.6)] }, settings());
    expect(sorted(result.centers)).toEqual([[-22.225, -232.55], [-22.225, 232.55], [22.225, -232.55], [22.225, 232.55]]);
    expect(result.rack?.angle).toBe(90);
  });

  it("makes no holes on a panel too narrow or too low, and says why", () => {
    expect(holePatternCenters({ loops: [rect(400, 74)] }, settings()).rack).toMatchObject({ ok: false, reason: "narrow" });
    expect(holePatternCenters({ loops: [rect(482.6, 20)] }, settings()).rack).toMatchObject({ ok: false, reason: "low" });
    // The 2U holes do not fit a 74 mm panel.
    const twoU = holePatternCenters({ loops: [rect(482.6, 74)] }, settings({ rackUnits: 2 }));
    expect(twoU.centers).toHaveLength(0);
    expect(twoU.rack).toMatchObject({ ok: false, reason: "low", units: 2, standardHeight: 88.1 });
  });

  it("keeps the choice when the settings are read back", () => {
    expect(settings({ rackUnits: 3 })).toMatchObject({ rack: true, rackUnits: 3 });
    expect(settings({ rackUnits: 0 }).rackUnits).toBeUndefined();
    expect(normalizeHolePattern({ arrangement: "corners", rackUnits: 3 }).rack).toBeUndefined();
  });

  it("makes the holes as slots of the standard size, lying along the panel", () => {
    const geometry = new THREE.BoxGeometry(482.6, 3, 74).toNonIndexed();
    geometry.translate(0, 1.5, 0);
    const positions = Array.from(geometry.getAttribute("position").array as Float32Array);
    const read = readPerforableFace(positions, { x: 10, y: 3, z: 5 }, { x: 0, y: 1, z: 0 });
    if (!read.ok) throw new Error("no face");
    const plan = holePatternShapes(read.face, settings({ holeType: "countersink", depth: null }), "Hole");
    expect(plan.rack?.ok).toBe(true);
    expect(plan.holes).toHaveLength(4);
    const xs = plan.holes.map((hole) => hole.x).sort((a, b) => a - b);
    const zs = plan.holes.map((hole) => hole.z).sort((a, b) => a - b);
    expect(xs[3] - xs[0]).toBeCloseTo(RACK_HOLE_SPACING, 3);
    expect(zs[3] - zs[0]).toBeCloseTo(44.45, 3);
    for (const hole of plan.holes) {
      expect(hole.hole).toBe(true);
      expect(hole.kind).not.toBe("countersink");
      // The slot's length runs across the panel, along the world's x.
      const sizes = [hole.width, hole.depth].sort((a, b) => a - b);
      expect(sizes[0]).toBeCloseTo(RACK_SLOT_WIDTH, 6);
      expect(sizes[1]).toBeCloseTo(RACK_SLOT_LENGTH, 6);
      const along = new THREE.Vector3(hole.width >= hole.depth ? 1 : 0, 0, hole.width >= hole.depth ? 0 : 1).applyQuaternion(quaternionForShape(hole));
      expect(Math.abs(along.x)).toBeCloseTo(1, 4);
    }
  });
});
