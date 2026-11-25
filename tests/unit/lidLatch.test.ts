import { describe, expect, it } from "vitest";
import { MAX_LID_LATCH_GRIP, MAX_LID_LATCH_WIDTH, MIN_LID_LATCH_GRIP, MIN_LID_LATCH_WIDTH, lidLatchClipProfile, lidLatchMeasures } from "@/lib/lidLatch";

/** The way in to the socket round the pin at `centre`: the least room between its two jaws, wall side of the pin's middle. */
function wayIn(profile: Array<[number, number]>, centre: number, measures: ReturnType<typeof lidLatchMeasures>) {
  const near = profile.filter(([v, n]) => n < measures.reach - 1e-6 && Math.hypot(v - centre, n - measures.reach) <= measures.rim + 1e-6);
  const above = Math.min(...near.filter(([v]) => v > centre).map(([v]) => v - centre));
  const below = Math.min(...near.filter(([v]) => v < centre).map(([v]) => centre - v));
  return above + below;
}

describe("the clip of a lid's latches", () => {
  it("opens its sockets narrower than the pins by a share of the pin and the grip, the lid's more than the body's", () => {
    const standard = lidLatchMeasures(12, 0.3);
    expect(standard.pin).toBeCloseTo(1.5, 6);
    // A 3 mm pin: a tenth of it and the grip narrower for the body's socket, 15 % and the grip for the lid's.
    expect(2 * standard.opening).toBeCloseTo(3 - 0.3 - 0.3, 6);
    expect(2 * standard.lidOpening).toBeCloseTo(3 - 0.45 - 0.3, 6);
    for (const width of [MIN_LID_LATCH_WIDTH, 12, 20, MAX_LID_LATCH_WIDTH]) {
      let last = Infinity;
      for (const grip of [MIN_LID_LATCH_GRIP, 0.15, 0.3, 0.6, MAX_LID_LATCH_GRIP]) {
        const measures = lidLatchMeasures(width, grip);
        // Even the least grip holds by the socket's shape: a pin has to push the jaws apart to get out.
        expect(2 * measures.opening).toBeLessThan(2 * measures.pin * 0.9 + 1e-9);
        expect(measures.lidOpening).toBeLessThan(measures.opening);
        // The most grip still lets the pin in.
        expect(2 * measures.lidOpening).toBeGreaterThanOrEqual(2 * measures.pin * 0.4 - 1e-9);
        expect(measures.opening).toBeLessThan(last);
        last = measures.opening;
      }
    }
  });

  it("draws both sockets as a C whose jaws reach round past the pin's middle and leave that opening between their noses", () => {
    for (const [width, grip] of [[12, 0.3], [20, 0.15], [6, 1], [30, 0.05]] as const) {
      const measures = lidLatchMeasures(width, grip);
      const profile = lidLatchClipProfile(measures);
      expect(wayIn(profile, 0, measures)).toBeCloseTo(2 * measures.opening, 1);
      expect(wayIn(profile, measures.spacing, measures)).toBeCloseTo(2 * measures.lidOpening, 1);
      for (const centre of [0, measures.spacing]) {
        const jaws = profile.filter(([v, n]) => Math.abs(v - centre) <= measures.rim + 1e-6 && n < measures.reach);
        // The noses end well past the pin's middle on the wall's side, and stay off the wall.
        const lowest = Math.min(...jaws.map(([, n]) => n));
        expect(measures.reach - lowest).toBeGreaterThan(measures.pin * 0.75);
        expect(lowest).toBeGreaterThan(0);
        // Nothing of the clip lies inside the socket, so the pin turns in it.
        for (const [v, n] of profile) expect(Math.hypot(v - centre, n - measures.reach)).toBeGreaterThan(measures.socket - 1e-6);
      }
      // A simple outline, drawn clockwise.
      let area = 0;
      profile.forEach(([v, n], index) => {
        const [nextV, nextN] = profile[(index + 1) % profile.length];
        area += v * nextN - nextV * n;
      });
      expect(area).toBeLessThan(0);
    }
  });
});
