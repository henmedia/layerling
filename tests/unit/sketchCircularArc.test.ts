import { describe, expect, it } from "vitest";
import { circularArcMidpoint } from "@/lib/sketchCircularArc";

// The cubic Bezier of a circular arc of angle a: handles k = 4/3 * tan(a / 4) of the radius long.
function arc(radius: number, angle: number) {
  const k = (4 / 3) * Math.tan(angle / 4) * radius;
  return [
    { x: radius, z: 0 },
    { x: radius, z: k },
    { x: radius * Math.cos(angle) + k * Math.sin(angle), z: radius * Math.sin(angle) - k * Math.cos(angle) },
    { x: radius * Math.cos(angle), z: radius * Math.sin(angle) },
  ] as const;
}

describe("circularArcMidpoint", () => {
  it("takes the Bezier of a quarter circle for the arc, at any radius", () => {
    for (const radius of [0.5, 2.5, 10, 120]) {
      const [p0, p1, p2, p3] = arc(radius, Math.PI / 2);
      const mid = circularArcMidpoint(p0, p1, p2, p3);
      expect(mid).not.toBeNull();
      expect(Math.hypot(mid!.x, mid!.z)).toBeCloseTo(radius, 1);
      expect(Math.atan2(mid!.z, mid!.x)).toBeCloseTo(Math.PI / 4, 3);
    }
  });

  it("takes smaller and larger arcs, and one drawn backwards", () => {
    for (const angle of [0.4, 1, Math.PI / 2, 2]) {
      const [p0, p1, p2, p3] = arc(10, angle);
      expect(circularArcMidpoint(p0, p1, p2, p3)).not.toBeNull();
      expect(circularArcMidpoint(p3, p2, p1, p0)).not.toBeNull();
    }
  });

  it("leaves an arc too wide for one Bezier to be a circle as it is", () => {
    const [p0, p1, p2, p3] = arc(10, 2.9);
    expect(circularArcMidpoint(p0, p1, p2, p3)).toBeNull();
  });

  it("leaves a curve that is not a circle as a Bezier", () => {
    const [p0, , , p3] = arc(10, Math.PI / 2);
    expect(circularArcMidpoint(p0, { x: 14, z: 1 }, { x: 3, z: 12 }, p3)).toBeNull();
    // An ellipse quarter: same ends as a circle but another bulge.
    const k = 0.5523;
    expect(circularArcMidpoint({ x: 20, z: 0 }, { x: 20, z: 10 * k }, { x: 20 * k, z: 10 }, { x: 0, z: 10 })).toBeNull();
  });

  it("leaves a near circle whose handles lean off the circle as a Bezier (#996)", () => {
    // Its arc would leave the ends along the circle, at an angle to the curve beside it.
    const [p0, p1, p2, p3] = arc(10, Math.PI / 2);
    const lean = (0.3 * Math.PI) / 180;
    const leaned = { x: p0.x + (p1.x - p0.x) * Math.cos(lean) - (p1.z - p0.z) * Math.sin(lean), z: p0.z + (p1.x - p0.x) * Math.sin(lean) + (p1.z - p0.z) * Math.cos(lean) };
    expect(circularArcMidpoint(p0, leaned, p2, p3)).toBeNull();
  });

  it("leaves a straight curve alone", () => {
    expect(circularArcMidpoint({ x: 0, z: 0 }, { x: 3, z: 0 }, { x: 6, z: 0 }, { x: 9, z: 0 })).toBeNull();
    expect(circularArcMidpoint({ x: 0, z: 0 }, { x: 3, z: 3 }, { x: 6, z: 6 }, { x: 9, z: 9 })).toBeNull();
  });
});
