import { describe, expect, it } from "vitest";
import type { Vec3 } from "occt-wasm";
import { bendsRoundTheOutside, bendsTighterThan, circumradius, tightBendFromMessage, tightBendMessage, tightBendShown } from "@/lib/cadTightBends";

/** A circle in the plane y = height, sampled at `count` points. */
function circle(radius: number, count: number, height = 0): Vec3[] {
  return Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * 2 * Math.PI;
    return { x: Math.cos(angle) * radius, y: height, z: Math.sin(angle) * radius };
  });
}

/** The tip of a drop: half an ellipse 1 mm long and 0.8 mm wide, its tip at x = 1 bending with a radius of 0.16 mm. */
function dropTip(): Vec3[] {
  return Array.from({ length: 81 }, (_, index) => {
    const angle = ((index - 40) / 40) * (Math.PI / 2);
    return { x: Math.cos(angle), y: 0, z: Math.sin(angle) * 0.4 };
  });
}

describe("tight bends of a fillet's edge (#1473)", () => {
  it("measures the radius of the circle through three points", () => {
    const [a, b, c] = [0, 1, 2].map((index) => ({ x: Math.cos(index) * 2, y: 0, z: Math.sin(index) * 2 }));
    expect(circumradius(a, b, c)).toBeCloseTo(2, 9);
    expect(circumradius({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 2, y: 0, z: 0 })).toBe(Infinity);
  });

  it("finds one bend for an arc tighter than the radius, none for a wider one", () => {
    const tight = bendsTighterThan(circle(0.53, 200), 1, true);
    expect(tight).toHaveLength(1);
    expect(tight[0].radius).toBeCloseTo(0.53, 3);
    expect(bendsTighterThan(circle(0.53, 200), 0.5, true)).toHaveLength(0);
  });

  it("finds the tip of a drop on an open edge, pointing to its centre", () => {
    const bends = bendsTighterThan(dropTip(), 1);
    expect(bends).toHaveLength(1);
    const [bend] = bends;
    expect(bend.radius).toBeCloseTo(0.16, 2);
    expect(bend.towardCentre.x).toBeLessThan(-0.99);
  });

  it("counts a bend round the outside of the body, not one round a notch", () => {
    const [bend] = bendsTighterThan(circle(0.5, 120, 2), 1, true);
    // The top edge of a cylinder 0.5 mm round and 2 mm tall: the body lies towards the axis and below.
    const cylinder = (point: Vec3) => Math.hypot(point.x, point.z) < 0.5 && point.y < 2 && point.y > 0;
    expect(bendsRoundTheOutside(cylinder, bend, 0.02)).toBe(true);
    // The top edge of a 0.5 mm hole in a block: the body lies away from the axis.
    const hole = (point: Vec3) => Math.hypot(point.x, point.z) > 0.5 && point.y < 2 && point.y > 0;
    expect(bendsRoundTheOutside(hole, bend, 0.02)).toBe(false);
  });

  it("says the bend rounded down and reads it back", () => {
    expect(tightBendShown(0.534)).toBe(0.53);
    expect(tightBendShown(0.5)).toBe(0.5);
    expect(tightBendShown(0.001)).toBe(0.01);
    expect(tightBendFromMessage(tightBendMessage(0.534))).toBe(0.53);
    expect(tightBendFromMessage("The selected edges cannot be filleted together at this size.")).toBeNull();
  });
});
