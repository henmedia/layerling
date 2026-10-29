import { describe, expect, it } from "vitest";
import {
  automaticFlexiJoints,
  flexiJointPositions,
  flexiKnuckleForHalfWidth,
  flexiKnuckleProfile,
  flexiNeck,
  flexiRingRadius,
  normalizeFlexiOptions,
} from "@/lib/flexiJoints";

describe("flexi joint options", () => {
  it("keeps the defaults and clamps what is out of range", () => {
    expect(normalizeFlexiOptions({})).toEqual({ clearance: 0.4, swing: 30 });
    expect(normalizeFlexiOptions({ clearance: 5, swing: 90, joints: 200 })).toMatchObject({ clearance: 1, swing: 60, joints: 30 });
    expect(normalizeFlexiOptions({ clearance: 0, swing: 1, joints: 0 })).toEqual({ clearance: 0.1, swing: 5 });
    expect(normalizeFlexiOptions({ joints: "3", size: "abc", start: -2 })).toEqual({ clearance: 0.4, swing: 30, joints: 3 });
  });

  it("takes the axes as the panel and the AI name them", () => {
    expect(normalizeFlexiOptions({ axis: "X" }).axis).toBe("x");
    expect(normalizeFlexiOptions({ axis: "Y" }).axis).toBe("z");
    expect(normalizeFlexiOptions({ axis: "z" }).axis).toBe("z");
    expect(normalizeFlexiOptions({ axis: "up" }).axis).toBeUndefined();
  });
});

describe("where the joints go", () => {
  it("makes links of equal length by default", () => {
    expect(flexiJointPositions(0, 100, 4)).toEqual([20, 40, 60, 80]);
    expect(flexiJointPositions(-50, 50, 1)).toEqual([0]);
  });

  it("puts the first and last joint where asked and the others evenly between", () => {
    expect(flexiJointPositions(0, 100, 3, 30, 10)).toEqual([30, 60, 90]);
    expect(flexiJointPositions(0, 100, 1, 25)).toEqual([25]);
    expect(flexiJointPositions(0, 100, 1, undefined, 25)).toEqual([75]);
  });

  it("suggests as many joints as leave room between them, more for a narrow body", () => {
    expect(automaticFlexiJoints(100, 20)).toBe(3);
    expect(automaticFlexiJoints(90, 18)).toBe(2);
    expect(automaticFlexiJoints(30, 20)).toBe(1);
    expect(automaticFlexiJoints(200, 12)).toBeGreaterThan(automaticFlexiJoints(200, 20));
    expect(automaticFlexiJoints(400, 10)).toBe(15);
  });
});

describe("the joint's measures", () => {
  it("fits the socket's ring into the body's half width", () => {
    for (const half of [8, 10, 15]) {
      const knuckle = flexiKnuckleForHalfWidth(half, 0.4);
      expect(flexiRingRadius(knuckle, 0.4)).toBeLessThanOrEqual(half - 0.3 + 1e-9);
    }
  });

  it("keeps the cones at 45 degrees and inside the body's height", () => {
    const { bulge, foot } = flexiKnuckleProfile(6, 8);
    expect(bulge + foot).toBeCloseTo(6, 9);
    expect(2 * bulge).toBeLessThanOrEqual(8 - 0.8 + 1e-9);
    expect(flexiKnuckleProfile(6, 30).bulge).toBeCloseTo(2.7, 9);
  });

  it("opens the socket no wider than still holds the knuckle, and the turned neck clears it", () => {
    const knuckle = 6;
    const { foot } = flexiKnuckleProfile(knuckle, 8);
    const neck = flexiNeck(knuckle, foot, 0.4, 25);
    expect(neck).not.toBeNull();
    const { opening, swing, neck: half } = neck!;
    const socket = knuckle + 0.4 * Math.SQRT2;
    // Where the knuckle is widest, the opening is narrower than the knuckle.
    expect(socket * Math.sin(opening)).toBeLessThan(knuckle);
    // Turned by the swing, the neck still keeps the clearance from the opening's edge where the socket is narrowest.
    const narrowest = foot + 0.4 * Math.SQRT2;
    expect(swing + Math.asin((half + 0.4) / narrowest)).toBeLessThanOrEqual(opening + 1e-9);
    expect(swing).toBeCloseTo(25 * Math.PI / 180, 9);
  });

  it("swings less than asked when the joint is too small for it, and refuses one with no room for a neck", () => {
    const { foot } = flexiKnuckleProfile(2.5, 6);
    const small = flexiNeck(2.5, foot, 0.4, 60);
    expect(small).not.toBeNull();
    expect(small!.swing).toBeLessThan(60 * Math.PI / 180);
    expect(flexiNeck(1, 0.5, 1, 30)).toBeNull();
  });
});
