import { describe, expect, it } from "vitest";
import {
  CONNECTOR_END_PLAY,
  CONNECTOR_WALL,
  MAX_DOVETAIL_ANGLE,
  MAX_DOVETAIL_DEPTH,
  MAX_DOVETAIL_TURN,
  MAX_DOVETAIL_WIDTH,
  MIN_DOVETAIL_ANGLE,
  MIN_DOVETAIL_DEPTH,
  MIN_DOVETAIL_WIDTH,
  SPLIT_CONNECTOR_DEFAULTS,
  alongTongues,
  autoDovetailCount,
  cutFaceLongWay,
  dovetailChamfer,
  dovetailEdgeMargin,
  dovetailGrooveDepth,
  dovetailTopWidth,
  foldLineAngle,
  fromTongues,
  normalizeSplitConnectorOptions,
  placeDovetailsOnPiece,
  placeSplitDovetails,
  splitConnectorDefaults,
  splitPlaneFrame,
  tongueOutlines,
  type SectionRing,
  type SplitTongue,
} from "@/lib/splitConnectors";

/*
 * Where Split's dovetail puts its tongues (Discussion #832), worked out on outlines in the plane's frame: which way they
 * run, how many lie side by side, that each keeps its margin from the edges and from the next, that it runs from edge to
 * edge of the face, and that a piece without room gets none. The solids and how they fit are in the e2e test.
 */

/** A rectangle, counter-clockwise, `width` by `height` about (cx, cy). */
const rectangle = (width: number, height: number, cx = 0, cy = 0): SectionRing => [
  [cx - width / 2, cy - height / 2], [cx + width / 2, cy - height / 2], [cx + width / 2, cy + height / 2], [cx - width / 2, cy + height / 2],
];

/** A circle of `sides` corners, counter-clockwise, or clockwise for a hole. */
const circle = (radius: number, sides = 192, clockwise = false): SectionRing => Array.from({ length: sides }, (_, index) => {
  const angle = ((clockwise ? -index : index) / sides) * Math.PI * 2;
  return [radius * Math.cos(angle), radius * Math.sin(angle)] as const;
});

/** The outline turned by `degrees` about the origin. */
const turned = (ring: SectionRing, degrees: number): SectionRing => ring.map(([x, y]) => fromTongues(degrees, x, y));

const dovetail = { ...SPLIT_CONNECTOR_DEFAULTS, kind: "dovetail" as const };
const margin = dovetailEdgeMargin(dovetail);

/** Every tongue its margin from the edges across it, and twice that from the next. */
function expectRoomAcross(tongues: readonly SplitTongue[], low: number, high: number) {
  tongues.forEach((tongue, index) => {
    expect(tongue.offset).toBeGreaterThanOrEqual(low + margin - 1e-3);
    expect(tongue.offset).toBeLessThanOrEqual(high - margin + 1e-3);
    if (index > 0) expect(tongue.offset - tongues[index - 1].offset).toBeGreaterThanOrEqual(2 * margin - 1e-3);
  });
}

describe("the dovetail's settings", () => {
  it("start from a tongue 6 mm wide at the cut face, 4 mm deep, 15 degree flanks, lengthwise", () => {
    expect(SPLIT_CONNECTOR_DEFAULTS).toMatchObject({ dovetailWidth: 6, dovetailDepth: 4, dovetailAngle: 15, dovetailTurn: 0 });
    expect(splitConnectorDefaults(0.15)).toMatchObject({ clearance: 0.15, dovetailWidth: 6 });
  });

  it("hold every value within its field and keep the rest", () => {
    expect(normalizeSplitConnectorOptions({ kind: "Dovetail", dovetailWidth: 1, dovetailDepth: 99, dovetailAngle: 2, dovetailTurn: 400 })).toEqual({
      ...SPLIT_CONNECTOR_DEFAULTS, kind: "dovetail", dovetailWidth: MIN_DOVETAIL_WIDTH, dovetailDepth: MAX_DOVETAIL_DEPTH, dovetailAngle: MIN_DOVETAIL_ANGLE, dovetailTurn: MAX_DOVETAIL_TURN,
    });
    expect(normalizeSplitConnectorOptions({ dovetailWidth: "80", dovetailDepth: 0, dovetailAngle: 60, dovetailTurn: "-12,5" })).toMatchObject({
      dovetailWidth: MAX_DOVETAIL_WIDTH, dovetailDepth: MIN_DOVETAIL_DEPTH, dovetailAngle: MAX_DOVETAIL_ANGLE, dovetailTurn: -12.5,
    });
    const start = { ...dovetail, dovetailWidth: 8 };
    expect(normalizeSplitConnectorOptions({ dovetailTurn: 90, diameter: 7 }, start)).toEqual({ ...start, dovetailTurn: 90, diameter: 7 });
  });

  it("widen the tongue to its top by the flanks, and make the groove deeper by the end play", () => {
    expect(dovetailTopWidth(dovetail)).toBeCloseTo(6 + 8 * Math.tan(Math.PI / 12), 9);
    expect(dovetailTopWidth({ ...dovetail, dovetailAngle: 30 })).toBeCloseTo(6 + 8 * Math.tan(Math.PI / 6), 9);
    expect(margin).toBeCloseTo(dovetailTopWidth(dovetail) / 2 + 3 + CONNECTOR_WALL, 9);
    expect(dovetailGrooveDepth(dovetail)).toBeCloseTo(4 + CONNECTOR_END_PLAY, 9);
    expect(dovetailChamfer(dovetail)).toBeCloseTo(0.8, 9);
    expect(dovetailChamfer({ dovetailWidth: 3, dovetailDepth: 1.5 })).toBeCloseTo(0.3, 9);
  });

  it("give a cut face one tongue for every six widths across it, at least one and at most four", () => {
    expect(autoDovetailCount(30, 6)).toBe(1);
    expect(autoDovetailCount(72, 6)).toBe(2);
    expect(autoDovetailCount(100, 6)).toBe(3);
    expect(autoDovetailCount(1000, 6)).toBe(4);
    expect(autoDovetailCount(0, 6)).toBe(0);
    expect(MAX_DOVETAIL_ANGLE).toBe(30);
  });
});

describe("the way the tongues run", () => {
  it("is the long way of the cut face, and none for a square or a round one", () => {
    expect(cutFaceLongWay([[rectangle(60, 30)]])).toBe(0);
    expect(cutFaceLongWay([[rectangle(30, 60)]])).toBe(90);
    expect(cutFaceLongWay([[turned(rectangle(60, 30), 30)]])).toBeCloseTo(30, 6);
    expect(cutFaceLongWay([[turned(rectangle(60, 30), -50)]])).toBeCloseTo(-50, 6);
    // Clockwise outlines and a ring's hole change nothing.
    expect(cutFaceLongWay([[[...rectangle(30, 60)].reverse()]])).toBe(90);
    expect(cutFaceLongWay([[rectangle(40, 40)]])).toBe(0);
    expect(cutFaceLongWay([[turned(rectangle(40, 40), 20)]])).toBe(0);
    expect(cutFaceLongWay([[circle(20), circle(10, 96, true)]])).toBe(0);
  });

  it("is shared by the pieces of one cut, each taken about its own middle", () => {
    // Two long pieces one above the other: together they reach further up than across, but each runs across.
    expect(cutFaceLongWay([[rectangle(60, 20, 0, -50)], [rectangle(60, 20, 0, 50)]])).toBe(0);
    expect(cutFaceLongWay([[rectangle(60, 20, 1000, 1000)]])).toBe(0);
  });

  it("folds a turn into a half turn either way", () => {
    expect(foldLineAngle(120)).toBe(-60);
    expect(foldLineAngle(-90)).toBe(90);
    expect(foldLineAngle(90)).toBe(90);
    expect(foldLineAngle(180)).toBe(0);
    expect(foldLineAngle(-0.004)).toBe(0);
    expect(foldLineAngle(269.5)).toBe(89.5);
  });

  it("sees the frame along the tongues and back", () => {
    expect(alongTongues(90, [3, 4])).toEqual([4, -3]);
    expect(fromTongues(90, 4, -3)).toEqual([3, 4]);
    const [s, t] = alongTongues(37, [5, -2]);
    const [a, b] = fromTongues(37, s, t);
    expect(a).toBeCloseTo(5, 12);
    expect(b).toBeCloseTo(-2, 12);
  });
});

describe("where tongues go on one piece", () => {
  it("runs one tongue from edge to edge along the middle of a long face", () => {
    expect(placeDovetailsOnPiece([rectangle(60, 30)], dovetail, 0)).toEqual([{ angle: 0, offset: 0, segments: [[-30, 30]], hold: [-30, 30] }]);
  });

  it("runs it the way it is turned, across a face turned with it", () => {
    expect(placeDovetailsOnPiece([rectangle(30, 60, 5, 0)], dovetail, 90)).toEqual([{ angle: 90, offset: -5, segments: [[-30, 30]], hold: [-30, 30] }]);
    const slanted = placeDovetailsOnPiece([turned(rectangle(60, 30), 30)], dovetail, 30);
    expect(slanted).toHaveLength(1);
    expect(slanted[0].offset).toBeCloseTo(0, 3);
    expect(slanted[0].segments[0][0]).toBeCloseTo(-30, 3);
    expect(slanted[0].segments[0][1]).toBeCloseTo(30, 3);
  });

  it("lays tongues side by side in equal shares of a wide face, each its margin from the edges and the next", () => {
    const rings = [rectangle(120, 100)];
    const three = placeDovetailsOnPiece(rings, dovetail, 0);
    expect(three.map((tongue) => tongue.offset)).toEqual([-33.333, 0, 33.333]);
    three.forEach((tongue) => expect(tongue.segments).toEqual([[-60, 60]]));
    expectRoomAcross(three, -50, 50);
    expect(placeDovetailsOnPiece(rings, { ...dovetail, count: 2 }, 0).map((tongue) => tongue.offset)).toEqual([-25, 25]);
    expect(placeDovetailsOnPiece(rings, { ...dovetail, count: 1 }, 0).map((tongue) => tongue.offset)).toEqual([0]);
  });

  it("gives fewer than asked where there is less room, still apart and inside", () => {
    const tongues = placeDovetailsOnPiece([rectangle(60, 40)], { ...dovetail, count: 4 }, 0);
    expect(tongues).toHaveLength(2);
    expectRoomAcross(tongues, -20, 20);
  });

  it("gives a piece too narrow across or too short along none", () => {
    expect(placeDovetailsOnPiece([rectangle(60, 2 * margin - 0.1)], dovetail, 0)).toEqual([]);
    expect(placeDovetailsOnPiece([rectangle(60, 2 * margin + 0.2)], dovetail, 0)).toHaveLength(1);
    expect(placeDovetailsOnPiece([rectangle(5, 40)], dovetail, 0)).toEqual([]);
    // A narrower, shallower tongue fits where the default did not.
    expect(placeDovetailsOnPiece([rectangle(60, 12)], { ...dovetail, dovetailWidth: 3, dovetailDepth: 2 }, 0)).toHaveLength(1);
  });

  it("keeps a tongue's wide top inside a round face, edge to edge", () => {
    const [tongue] = placeDovetailsOnPiece([circle(20)], dovetail, 0);
    expect(tongue.offset).toBeCloseTo(0, 3);
    const top = dovetailTopWidth(dovetail) / 2;
    const reach = Math.sqrt(400 - top * top);
    expect(tongue.segments).toHaveLength(1);
    expect(tongue.segments[0][0]).toBeGreaterThan(-reach - 0.01);
    expect(tongue.segments[0][0]).toBeLessThan(-reach + 0.05);
    expect(tongue.segments[0][1]).toBeCloseTo(-tongue.segments[0][0], 3);
    // Its whole margin lies in the face over a shorter stretch.
    expect(tongue.hold[1]).toBeLessThan(tongue.segments[0][1]);
    expect(tongue.hold[1]).toBeCloseTo(Math.sqrt(400 - margin * margin), 1);
  });

  it("crosses the hole of a ring in two stretches, and keeps out of a ring too thin", () => {
    const [tongue] = placeDovetailsOnPiece([circle(40), circle(15, 192, true)], { ...dovetail, count: 1 }, 0);
    expect(tongue.offset).toBeCloseTo(0, 3);
    expect(tongue.segments).toHaveLength(2);
    expect(tongue.segments[0][1]).toBeCloseTo(-15, 1);
    expect(tongue.segments[1][0]).toBeCloseTo(15, 1);
    expect(tongue.segments[1][1]).toBeCloseTo(-tongue.segments[0][0], 3);
    expect(placeDovetailsOnPiece([circle(30), circle(25, 192, true)], dovetail, 0)).toEqual([]);
  });

  it("works the same out every time", () => {
    const rings = [rectangle(73, 41, 3, -2), circle(5, 48, true)];
    expect(placeDovetailsOnPiece(rings, { ...dovetail, count: 3 }, 12)).toEqual(placeDovetailsOnPiece(rings, { ...dovetail, count: 3 }, 12));
  });
});

describe("tongues on the pieces of a cut", () => {
  it("gives two separate pieces their own, all one way, whatever order they come in", () => {
    const left = [rectangle(60, 30, -50, 0)];
    const right = [rectangle(60, 30, 50, 8)];
    const placed = placeSplitDovetails([right, left], dovetail);
    expect(placed).toMatchObject({ angle: 0, faces: 2, tooSmall: 0 });
    expect(placed.tongues.map((tongue) => [tongue.offset, tongue.segments])).toEqual([[0, [[-80, -20]]], [8, [[20, 80]]]]);
    expect(placeSplitDovetails([left, right], dovetail)).toEqual(placed);
  });

  it("turns them all by the turn asked, and counts a piece too small", () => {
    // Turned across, the small piece is 14 mm wide across its tongue: too narrow for one with its margins.
    const placed = placeSplitDovetails([[rectangle(60, 30)], [rectangle(14, 10, 0, 50)]], { ...dovetail, count: 1, dovetailTurn: 90 });
    expect(placed.angle).toBe(90);
    expect(placed).toMatchObject({ faces: 2, tooSmall: 1 });
    expect(placed.tongues).toEqual([{ angle: 90, offset: 0, segments: [[-15, 15]], hold: [-15, 15] }]);
    // Left to its size, the big piece is 60 mm across the tongues: two of them.
    expect(placeSplitDovetails([[rectangle(60, 30)]], { ...dovetail, dovetailTurn: 90 }).tongues.map((tongue) => tongue.offset)).toEqual([-15, 15]);
  });

  it("draws each tongue's foot and wide top on the plane, in the world", () => {
    const frame = splitPlaneFrame([0, 1, 0]);
    const [tongue] = placeDovetailsOnPiece([rectangle(60, 30)], dovetail, 0);
    const [outline] = tongueOutlines(frame, 20, tongue, dovetail);
    // The frame's v is the world's -z.
    expect(outline.foot).toEqual([[-30, 20, 3], [30, 20, 3], [30, 20, -3], [-30, 20, -3]]);
    outline.top.forEach(([x, y, z]) => {
      expect(Math.abs(x)).toBe(30);
      expect(y).toBe(20);
      expect(Math.abs(z)).toBeCloseTo(dovetailTopWidth(dovetail) / 2, 9);
    });
  });
});
