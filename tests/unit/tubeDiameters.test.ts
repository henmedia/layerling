import { describe, expect, it } from "vitest";
import { MIN_TUBE_WALL, tubeAfterInner, tubeAfterOuter, tubeAfterTyped, tubeInnerDiameter, tubeTypedWith, type TubeMeasure, type TubeTyped } from "@/lib/tubeDiameters";

describe("round tube: outer diameter, inner diameter and wall", () => {
  it("keeps the bore when the outer diameter is typed", () => {
    // a bore of 12 in a tube of 20: the outer diameter goes to 71.5, the bore stays 12
    const next = tubeAfterOuter(71.5, 12);
    expect(next).toEqual({ outer: 71.5, wall: 29.75 });
    expect(tubeInnerDiameter(next.outer, next.wall)).toBeCloseTo(12, 6);
  });

  it("gives the wall way down to the thinnest, then the bore shrinks", () => {
    const next = tubeAfterOuter(20, 25);
    expect(next.wall).toBe(MIN_TUBE_WALL);
    expect(tubeInnerDiameter(next.outer, next.wall)).toBe(19);
  });

  it("keeps the outer diameter when a bore that fits is typed", () => {
    const next = tubeAfterInner(69.5, 71.5, 4);
    expect(next).toEqual({ outer: 71.5, wall: 1 });
  });

  it("grows the outer diameter by the wall when the bore does not fit", () => {
    // a tube of 20 with a wall of 4: a bore of 69.5 asks for an outer diameter of 77.5
    expect(tubeAfterInner(69.5, 20, 4)).toEqual({ outer: 77.5, wall: 4 });
  });

  it("comes to the same tube whichever of the two is typed first (50 x 69.5 inside, 71.5 outside)", () => {
    const innerFirst = tubeAfterInner(69.5, 20, 4);
    const finalA = tubeAfterOuter(71.5, tubeInnerDiameter(innerFirst.outer, innerFirst.wall));
    const outerFirst = tubeAfterOuter(71.5, tubeInnerDiameter(20, 4));
    const finalB = tubeAfterInner(69.5, outerFirst.outer, outerFirst.wall);
    expect(finalA.outer).toBe(71.5);
    expect(finalB.outer).toBe(71.5);
    expect(tubeInnerDiameter(finalA.outer, finalA.wall)).toBeCloseTo(69.5, 6);
    expect(tubeInnerDiameter(finalB.outer, finalB.wall)).toBeCloseTo(69.5, 6);
    expect(finalA.wall).toBeCloseTo(1, 6);
    expect(finalB.wall).toBeCloseTo(1, 6);
  });
});

describe("round tube: the measure typed last stays and the third follows (Discussion #2062)", () => {
  function type(...entries: [TubeMeasure, number][]) {
    let tube = { outer: 20, wall: 4 };
    let typed: TubeTyped[] = [];
    for (const [measure, value] of entries) {
      tube = tubeAfterTyped(measure, value, tube, typed);
      typed = tubeTypedWith(typed, measure, tube);
    }
    return { tube, typed, inner: tubeInnerDiameter(tube.outer, tube.wall) };
  }

  it("gives the same tube for any two of the three in either order", () => {
    const pairs: [TubeMeasure, number][] = [["outer", 30], ["inner", 28], ["wall", 1]];
    for (const a of pairs) for (const b of pairs) {
      if (a === b) continue;
      const { tube, inner } = type(a, b);
      expect(tube.outer).toBeCloseTo(30, 6);
      expect(tube.wall).toBeCloseTo(1, 6);
      expect(inner).toBeCloseTo(28, 6);
    }
  });

  it("makes the outer diameter follow when the bore is changed and then the wall", () => {
    expect(type(["outer", 60], ["inner", 53], ["inner", 53.2], ["wall", 3.88]).tube.outer).toBeCloseTo(60.96, 6);
  });

  it("keeps the wall while the outer or the inner diameter is changed again and again", () => {
    expect(type(["wall", 1], ["outer", 30], ["outer", 25], ["outer", 40]).inner).toBeCloseTo(38, 6);
    expect(type(["wall", 1], ["inner", 30], ["inner", 5], ["inner", 40]).tube.outer).toBeCloseTo(42, 6);
  });

  it("forgets a measure the tube no longer has, as after undo", () => {
    const { typed } = type(["wall", 1]);
    expect(tubeAfterTyped("outer", 30, { outer: 20, wall: 4 }, typed)).toEqual({ outer: 30, wall: 8 + 1 });
  });
});
