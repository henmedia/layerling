import { describe, expect, it } from "vitest";
import { LID_LATCH_IN_PLACE_PLAY, MAX_LID_LATCH_GRIP, MAX_LID_LATCH_WIDTH, MIN_LID_LATCH_GRIP, MIN_LID_LATCH_WIDTH, lidLatchClipProfile, lidLatchInPlaceMeasures, lidLatchInPlaceParts, lidLatchMeasures } from "@/lib/lidLatch";

/**
 * How close a clip printed in place comes to the wall (n = 0, the body's wall below the rim and the lid's edge above it)
 * as it swings about the lid's pin from closed (0) to `upTo` degrees open, its lower end outward: the least n of its
 * profile, its ring and the foot under the ring, left whole (the clear room only takes material away).
 */
function closestToWall(parts: ReturnType<typeof lidLatchInPlaceParts>, upTo: number) {
  const [cv, cn] = parts.ring.centre;
  const ring = Array.from({ length: 360 }, (_, step) => {
    const angle = (step / 360) * Math.PI * 2;
    return [cv + Math.cos(angle) * parts.ring.outside, cn + Math.sin(angle) * parts.ring.outside] as [number, number];
  });
  const foot = parts.foot.v.flatMap((v) => parts.foot.n.map((n) => [v, n] as [number, number]));
  const points = [...parts.profile, ...ring, ...foot];
  let least = Infinity;
  for (let degrees = 0; degrees <= upTo; degrees += 1) {
    const turn = (degrees * Math.PI) / 180;
    for (const [v, n] of points) least = Math.min(least, cn - (v - cv) * Math.sin(turn) + (n - cn) * Math.cos(turn));
  }
  return least;
}

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

  it("closes the socket of a clip printed in place into a ring round the lid's pin, never thinner than 0.6 mm (Discussion #2047)", () => {
    for (let width = MIN_LID_LATCH_WIDTH; width <= MAX_LID_LATCH_WIDTH; width += 1) {
      const measures = lidLatchMeasures(width, 0.3);
      const parts = lidLatchInPlaceParts(measures, measures.spacing);
      // The ring sits on the lid's pin with the play of a clip printed in place round it.
      expect(parts.ring.centre).toEqual([measures.spacing, measures.reach]);
      expect(parts.ring.hole).toBeCloseTo(measures.pin + LID_LATCH_IN_PLACE_PLAY, 9);
      expect(parts.ring.outside).toBe(measures.rim);
      // The clear room by the wall reaches down past the ring, so the ring keeps off the body's wall when closed...
      expect(parts.clear.v[0]).toBeLessThanOrEqual(measures.spacing - measures.rim);
      // ...and what is left of it there, and all round, is still a wall to print.
      expect(measures.reach - parts.ring.hole - parts.clear.n[1]).toBeGreaterThanOrEqual(0.6 - 1e-9);
      expect(parts.ring.outside - parts.ring.hole).toBeGreaterThanOrEqual(0.6);
    }
  });

  it("swings a clip printed in place about the lid's pin, open to closed, past the wall and the lid's edge with the play to spare (Discussion #2047)", () => {
    for (let width = MIN_LID_LATCH_WIDTH; width <= MAX_LID_LATCH_WIDTH; width += 1) {
      for (const grip of [MIN_LID_LATCH_GRIP, 0.15, 0.3, MAX_LID_LATCH_GRIP]) {
        const standard = lidLatchMeasures(width, grip);
        const measures = lidLatchInPlaceMeasures(standard);
        // A 2 mm plate on the rim: its bottom, the rim, in the clip's frame.
        const parts = lidLatchInPlaceParts(measures, measures.spacing + measures.rim - 2);
        // All the way up and back, it keeps the play of a part printed in place off the wall.
        expect(closestToWall(parts, 180)).toBeGreaterThanOrEqual(LID_LATCH_IN_PLACE_PLAY - 1e-9);
        // With the pins where a loose clip has them, the corners of the foot ran into the wall as the clip turned.
        expect(closestToWall(lidLatchInPlaceParts(standard, standard.spacing + standard.rim - 2), 180)).toBeLessThan(0);
        // Only the pins stand further out: the sockets and the grip on the body's pin are the same.
        expect(measures.reach).toBeGreaterThan(standard.reach);
        expect({ ...measures, reach: standard.reach }).toEqual(standard);
        expect(wayIn(parts.profile, 0, measures)).toBeCloseTo(2 * standard.opening, 1);
      }
    }
  });
});
