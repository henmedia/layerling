import { describe, expect, it } from "vitest";
import { holePatternCenters, normalizeHolePattern } from "@/lib/holePattern";

const rect = (w: number, d: number, turn = 0) => {
  const c = Math.cos(turn), s = Math.sin(turn);
  return [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([u, v]) => ({ u: u * c - v * s, v: u * s + v * c }));
};
const sorted = (points: Array<{ u: number; v: number }>) => points.map((p) => [Number(p.u.toFixed(3)), Number(p.v.toFixed(3))]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
const settings = (patch = {}) => normalizeHolePattern({ form: "round", size: 4.3, arrangement: "corners", margin: 5, ...patch });

describe("mounting holes in the corners", () => {
  it("puts four holes this far from the sides, to their edge or their middle", () => {
    expect(sorted(holePatternCenters({ loops: [rect(90, 73)] }, settings()).centers)).toEqual([[-37.85, -29.35], [-37.85, 29.35], [37.85, -29.35], [37.85, 29.35]]);
    expect(sorted(holePatternCenters({ loops: [rect(90, 73)] }, settings({ cornerToCenter: true })).centers)).toEqual([[-40, -31.5], [-40, 31.5], [40, -31.5], [40, 31.5]]);
  });

  it("finds the corners of a turned plate", () => {
    const turn = Math.PI / 6;
    const centres = holePatternCenters({ loops: [rect(60, 30, turn)] }, settings({ cornerToCenter: true })).centers;
    const own = centres.map((p) => ({ u: p.u * Math.cos(-turn) - p.v * Math.sin(-turn), v: p.u * Math.sin(-turn) + p.v * Math.cos(-turn) }));
    expect(sorted(own)).toEqual([[-25, -10], [-25, 10], [25, -10], [25, 10]]);
  });

  it("keeps them even on a plate with notches in its sides", () => {
    // 90 x 73 with a 30 mm wide, 4 mm deep notch in the middle of each long side and a corner cut off at one corner's inside.
    const notched = [
      { u: -45, v: -36.5 }, { u: -15, v: -36.5 }, { u: -15, v: -32.5 }, { u: 15, v: -32.5 }, { u: 15, v: -36.5 }, { u: 45, v: -36.5 },
      { u: 45, v: 36.5 }, { u: 15, v: 36.5 }, { u: 15, v: 32.5 }, { u: -15, v: 32.5 }, { u: -15, v: 36.5 }, { u: -45, v: 36.5 },
    ];
    expect(sorted(holePatternCenters({ loops: [notched] }, settings({ size: 4.5, margin: 5.5 })).centers)).toEqual([[-37.25, -28.75], [-37.25, 28.75], [37.25, -28.75], [37.25, 28.75]]);
  });

  it("counts a screw head's width as the hole's edge", () => {
    const centres = holePatternCenters({ loops: [rect(90, 73)] }, settings({ size: 3.4, holeType: "counterbore", headSize: 6.5, margin: 2 })).centers;
    expect(sorted(centres)[0]).toEqual([-39.75, -31.25]);
  });

  it("makes none when two holes would run into each other", () => {
    expect(holePatternCenters({ loops: [rect(14, 73)] }, settings()).centers).toEqual([]);
  });

  it("keeps the choice when the settings are cleaned", () => {
    expect(settings({ cornerToCenter: true }).arrangement).toBe("corners");
    expect(settings({ cornerToCenter: true }).cornerToCenter).toBe(true);
    expect(settings({ holeTilt: 20 }).holeTilt).toBe(20);
  });
});
