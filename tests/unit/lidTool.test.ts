import { describe, expect, it } from "vitest";
import { BAYONET_MIN_WALL, HINGE_PIN_GRIP, HINGE_PRINTED_PIN_GRIP, LID_DEFAULTS, LID_THREAD_STANDARD_SPECS, LID_THREAD_STANDARDS, LID_TYPES, NECK_LARGER, NECK_SMALLER, MAX_BAYONET_AXIAL_GAP, MAX_BAYONET_DEPTH, MAX_BAYONET_DETENT, MAX_BAYONET_LUGS, MAX_BAYONET_TURN, MIN_BAYONET_AXIAL_GAP, MIN_BAYONET_DEPTH, MIN_BAYONET_LUGS, MIN_BAYONET_TURN, MAX_CLICK_BUMP_HEIGHT, MAX_HINGE_PIN, MAX_HINGE_PIN_PLAY, MAX_LID_GAP, MAX_LID_THICKNESS, MAX_LID_THREAD_PITCH, MAX_LID_THREAD_TURNS, MAX_MAGNET_GAP, MIN_CLICK_BUMP_HEIGHT, MIN_HINGE_PIN, MIN_HINGE_PIN_PLAY, MIN_LID_THREAD_PITCH, MIN_LID_THREAD_TURNS, MIN_LID_WALL, MIN_MAGNET_DIAMETER, SCREW_MIN_WALL, bayonetLugSize, bayonetPlan, bayonetTurn, clickBumpPlaces, cornerKnucklePlan, endPlugPlan, hingeKnuckleRadius, hingePinGrip, hingePinHoles, lidClickBumpsFit, lidHandleFits, lidNeckFit, lidStandardThread, lidTakesExtras, lidTakesMagnets, lidThicknessForMagnets, lidThread, magnetPlaces, magnetPocketDepth, normalizeLidOptions, roundOutline, screwPlan, lidTetherFits, tetherPlan, FLIP_HINGE_LENGTH, FLIP_HINGE_THICKNESS, MAX_FLIP_TOP_OPENING, MIN_FLIP_TOP_OPENING, flipTopPlan, flipTopThickness, lidFlipTopFits, screwInPlan, LID_HINGE_TYPES, SLIDE_EDGE, SLIDE_LIP, SLIDE_MAX_GROOVE, SLIDE_MIN_HOLD, SLIDE_WALL_KEEP, slideBoxTurn, slidePlan, slideWall, MAX_SLIDE_FRAME, SLIDE_FRAME_KEEP, slideFrameNeeded, slideSlotRoom } from "@/lib/lidTool";
import { threadSize } from "@/lib/vase/vase-geometry.mjs";

describe("lid options (#1009)", () => {
  it("starts from a push-in lid with a normal fit", () => {
    expect(normalizeLidOptions()).toEqual(LID_DEFAULTS);
    expect(LID_DEFAULTS).toEqual({ type: "plug", thickness: 2, gap: 0.2, depth: 4, wall: 1.6, magnets: false, magnetDiameter: 6, magnetHeight: 2, magnetGap: 0.1, hinge: false, hingePin: 1.75, hingeGap: 0.3, hingePinPlay: 0.2, hingeKnuckles: 0, hingePrintPin: false, hingeSide: "back", hingeTeardrop: true, hingeStyle: "outside", hingeEndPlugs: false, clickBumps: false, clickBumpHeight: 0.4, handle: "none", threadPitch: 3, threadTurns: 2, threadStandard: "own", bayonetLugs: 3, bayonetDepth: 8, bayonetAxialGap: 0.3, bayonetDetent: 0.3, bayonetTurn: 0, tether: false, flipTop: false, flipTopOpening: 8, topEdge: "square", topEdgeSize: 1, slideSide: "front", slideFrame: 0 });
  });

  it("takes the kind in any case and keeps the default for an unknown one", () => {
    expect(normalizeLidOptions({ type: " CAP " }).type).toBe("cap");
    expect(normalizeLidOptions({ type: "flat" }).type).toBe("flat");
    expect(normalizeLidOptions({ type: "Both" }).type).toBe("both");
    expect(normalizeLidOptions({ type: "thread" }).type).toBe("plug");
  });

  it("puts the hinge on the side asked for, in any case, and at the back otherwise", () => {
    expect(normalizeLidOptions({ hingeSide: " Right " }).hingeSide).toBe("right");
    expect(normalizeLidOptions({ hingeSide: "front" }).hingeSide).toBe("front");
    expect(normalizeLidOptions({ hingeSide: "left" }).hingeSide).toBe("left");
    expect(normalizeLidOptions({ hingeSide: "top" }).hingeSide).toBe("back");
    expect(normalizeLidOptions({ hingeSide: 3 }).hingeSide).toBe("back");
  });

  it("puts the hinge outside unless asked for one flush in the wall or a pivot lid", () => {
    expect(normalizeLidOptions().hingeStyle).toBe("outside");
    expect(normalizeLidOptions({ hingeStyle: " Flush " }).hingeStyle).toBe("flush");
    expect(normalizeLidOptions({ hingeStyle: "pivot" }).hingeStyle).toBe("pivot");
    expect(normalizeLidOptions({ hingeStyle: "inside" }).hingeStyle).toBe("outside");
  });

  it("closes a flush hinge's pin hole with end plugs only when asked to (Discussion #1387)", () => {
    expect(normalizeLidOptions().hingeEndPlugs).toBe(false);
    expect(normalizeLidOptions({ hingeEndPlugs: true }).hingeEndPlugs).toBe(true);
    expect(normalizeLidOptions({ hingeEndPlugs: "true" }).hingeEndPlugs).toBe(true);
    expect(normalizeLidOptions({ hingeEndPlugs: "yes" }).hingeEndPlugs).toBe(false);
    expect(normalizeLidOptions({ hingeEndPlugs: 1 }).hingeEndPlugs).toBe(false);
  });

  it("puts the end plugs where the hinge's line leaves the body, 4 mm deep, less where an end knuckle is short (Discussion #1387)", () => {
    // Seven knuckles corner to corner on a 60 mm back: in from the sides 4 mm each, and the pin 0.5 mm short of each plug.
    const seven = Array.from({ length: 7 }, (_, index): [number, number] => [-30 + index * 8.6, -30 + index * 8.6 + 8.3]);
    expect(endPlugPlan(seven, [-30, 30])).toEqual({ outer: [-30, 30], depth: 4, pinLength: 51 });
    // Rounded corners: the knuckles stop where the back's straight stretch does, the hinge's line leaves the body further out.
    const rounded = endPlugPlan([[-24, -14.6], [-14.3, 14.3], [14.6, 24]], [-29, 29]);
    expect(rounded).toEqual({ outer: [-29, 29], depth: 4, pinLength: 49 });
    // Without a crossing, the knuckles' own ends.
    expect(endPlugPlan([[-20, -12], [-11.7, 11.7], [12, 20]], null)).toEqual({ outer: [-20, 20], depth: 4, pinLength: 31 });
    // An end knuckle 3.6 mm wide keeps 1.5 mm of itself to the pin: plugs 2.1 mm deep, at both ends alike.
    const narrow = endPlugPlan([[-20, -16.4], [-16.1, 15.1], [15.4, 20]], [-20, 20]);
    if ("error" in narrow) throw new Error(narrow.error.code);
    expect(narrow.depth).toBeCloseTo(2.1, 9);
    expect(narrow.pinLength).toBeCloseTo(40 - 4.2 - 1, 9);
    // Under 3.5 mm, a plug would be shorter than 2 mm: refused.
    expect(endPlugPlan([[-20, -16.6], [-16.3, 16.3], [16.6, 20]], [-20, 20])).toEqual({ error: { code: "endPlugsShort" } });
  });

  it("fills rounded corners with a flush hinge's end knuckles without end plugs too, the pin ending where its hole is whole (Discussion #1387)", () => {
    // A 60 x 40 box seen from above, its back at y 20 and its corners cut off by `cut` (a straight cut is as good as a round
    // for this, and its crossings are exact); `right` cuts only the two on the right.
    const box = (cut: number, right = false) => [[[-30 + (right ? 0 : cut), 20], [30 - cut, 20], [30, 20 - cut], [30, -20 + cut], [30 - cut, -20], [-30 + (right ? 0 : cut), -20], [-30, -20 + (right ? 0 : cut)], [-30, 20 - (right ? 0 : cut)]]] as [number, number][][];
    // Five knuckles along the straight back from `from` to `to`, 0.3 mm apart.
    const knuckles = (from: number, to: number) => Array.from({ length: 5 }, (_, index): [number, number] => {
      const width = (to - from - 4 * 0.3) / 5;
      return [from + index * (width + 0.3), from + index * (width + 0.3) + width];
    });
    // Square corners: the knuckles reach the ends of the back, nothing to fill.
    expect(cornerKnucklePlan(box(0), knuckles(-30, 30), 17, 1, 0.3)).toBeNull();
    // Cut by 6 mm: the axis 3 mm in front of the back crosses the outline at ±27, where the end knuckles now end. The hole,
    // 1 mm round, is whole out to where the line 1 mm behind the axis crosses (±26): the pin ends half a millimetre inside.
    const cut = cornerKnucklePlan(box(6), knuckles(-24, 24), 17, 1, 0.3)!;
    expect(cut.outer[0]).toBeCloseTo(-27, 9);
    expect(cut.outer[1]).toBeCloseTo(27, 9);
    expect(cut.pinLength).toBeCloseTo(51, 9);
    // Within the gap and a hundredth of the knuckles, as on a square box: nothing to fill. A little further, filled.
    expect(cornerKnucklePlan(box(0.3), knuckles(-29.7, 29.7), 17, 1, 0.3)).toBeNull();
    const just = cornerKnucklePlan(box(0.4), knuckles(-29.6, 29.6), 17, 1, 0.3)!;
    expect(just.outer).toEqual([-30, 30]);
    expect(just.pinLength).toBeCloseTo(59, 9);
    // One end rounded is enough, and the other end then ends where the body does.
    const one = cornerKnucklePlan(box(6, true), knuckles(-30, 24), 17, 1, 0.3)!;
    expect(one.outer[0]).toBeCloseTo(-30, 9);
    expect(one.outer[1]).toBeCloseTo(27, 9);
    expect(one.pinLength).toBeCloseTo(55, 9);
    // An axis that does not cross the outline at all.
    expect(cornerKnucklePlan(box(6), knuckles(-24, 24), 25, 1, 0.3)).toBeNull();
  });

  it("makes teardrop pin holes unless told not to", () => {
    expect(normalizeLidOptions({ hingePinPlay: 0.35 }).hingePinPlay).toBe(0.35);
    expect(normalizeLidOptions({ hingePinPlay: 0 }).hingePinPlay).toBe(0.05);
    expect(normalizeLidOptions({ hingePinPlay: 2 }).hingePinPlay).toBe(0.5);
    expect(normalizeLidOptions({ hingePinPlay: "x" }).hingePinPlay).toBe(0.2);
    expect(normalizeLidOptions().hingeTeardrop).toBe(true);
    expect(normalizeLidOptions({ hingeTeardrop: false }).hingeTeardrop).toBe(false);
    expect(normalizeLidOptions({ hingeTeardrop: "false" }).hingeTeardrop).toBe(false);
    expect(normalizeLidOptions({ hingeTeardrop: "no" }).hingeTeardrop).toBe(true);
  });

  it("clicks in only when asked to, and has a handle only when one is named (#1234, #1230)", () => {
    expect(normalizeLidOptions({ clickBumps: true }).clickBumps).toBe(true);
    expect(normalizeLidOptions({ clickBumps: "true" }).clickBumps).toBe(true);
    expect(normalizeLidOptions({ clickBumps: "yes" }).clickBumps).toBe(false);
    expect(normalizeLidOptions({ clickBumps: 1 }).clickBumps).toBe(false);
    expect(normalizeLidOptions({ handle: " TAB " }).handle).toBe("tab");
    expect(normalizeLidOptions({ handle: "Notch" }).handle).toBe("notch");
    expect(normalizeLidOptions({ handle: "none" }).handle).toBe("none");
    expect(normalizeLidOptions({ handle: "knob" }).handle).toBe("none");
    expect(normalizeLidOptions({ handle: 2 }).handle).toBe("none");
  });

  it("makes the click bumps reach 0.4 mm into the wall unless told otherwise, 0.2 to 0.8 mm (#1220)", () => {
    expect(normalizeLidOptions().clickBumpHeight).toBe(0.4);
    expect(normalizeLidOptions({ clickBumpHeight: 0.25 }).clickBumpHeight).toBe(0.25);
    expect(normalizeLidOptions({ clickBumpHeight: "0.6" }).clickBumpHeight).toBe(0.6);
    expect(normalizeLidOptions({ clickBumpHeight: 0 }).clickBumpHeight).toBe(MIN_CLICK_BUMP_HEIGHT);
    expect(normalizeLidOptions({ clickBumpHeight: -1 }).clickBumpHeight).toBe(0.2);
    expect(normalizeLidOptions({ clickBumpHeight: 2 }).clickBumpHeight).toBe(MAX_CLICK_BUMP_HEIGHT);
    expect(MAX_CLICK_BUMP_HEIGHT).toBe(0.8);
    expect(normalizeLidOptions({ clickBumpHeight: "x" }).clickBumpHeight).toBe(0.4);
    expect(normalizeLidOptions({ clickBumpHeight: null }).clickBumpHeight).toBe(0.4);
  });

  it("knows where click bumps and a handle go: bumps need a lip or a rim, and a pivot lid takes neither", () => {
    const options = (patch: Record<string, unknown>) => normalizeLidOptions(patch);
    expect(lidClickBumpsFit(options({}))).toBe(true);
    expect(lidClickBumpsFit(options({ type: "cap" }))).toBe(true);
    expect(lidClickBumpsFit(options({ type: "both" }))).toBe(true);
    expect(lidClickBumpsFit(options({ type: "flat" }))).toBe(false);
    expect(lidClickBumpsFit(options({ hinge: true, hingeStyle: "flush" }))).toBe(true);
    expect(lidClickBumpsFit(options({ hinge: true, hingeStyle: "pivot" }))).toBe(false);
    // A pivot style picked while the hinge is off counts for nothing.
    expect(lidClickBumpsFit(options({ hingeStyle: "pivot" }))).toBe(true);
    expect(lidHandleFits(options({ type: "flat" }))).toBe(true);
    expect(lidHandleFits(options({ hinge: true }))).toBe(true);
    expect(lidHandleFits(options({ hinge: true, hingeStyle: "pivot" }))).toBe(false);
  });

  it("holds the pin tight in the body's holes and gives it its play only in the lid's (#1220)", () => {
    expect(HINGE_PIN_GRIP).toBe(0.05);
    const holes = hingePinHoles(normalizeLidOptions({ hingePin: 1.75 }));
    expect(holes.lidHole).toBeCloseTo(0.875 + 0.2, 9);
    expect(holes.bodyHole).toBeCloseTo(0.875 + 0.05, 9);
    // The play changes the lid's holes only.
    const wide = hingePinHoles(normalizeLidOptions({ hingePin: 3, hingePinPlay: 0.4 }));
    expect(wide.lidHole).toBeCloseTo(1.9, 9);
    expect(wide.bodyHole).toBeCloseTo(1.55, 9);
    // The least play is the grip: then both are as tight.
    const least = hingePinHoles(normalizeLidOptions({ hingePin: 1.75, hingePinPlay: 0 }));
    expect(least.lidHole).toBeCloseTo(least.bodyHole, 9);
    // The knuckles keep their size, so the body's keep at least the 1.6 mm wall the lid's have round their hole, more
    // round their tighter one, for every pin and play.
    for (const hingePin of [MIN_HINGE_PIN, 1.75, 3, MAX_HINGE_PIN]) {
      for (const hingePinPlay of [MIN_HINGE_PIN_PLAY, 0.1, 0.2, MAX_HINGE_PIN_PLAY]) {
        for (const hingePrintPin of [false, true]) {
          const radius = hingeKnuckleRadius({ hingePin, hingePinPlay });
          const { lidHole, bodyHole } = hingePinHoles({ hingePin, hingePinPlay, hingePrintPin });
          expect(radius - lidHole).toBeCloseTo(1.6, 9);
          expect(radius - bodyHole).toBeGreaterThanOrEqual(1.6 - 1e-9);
          expect(bodyHole).toBeLessThanOrEqual(lidHole + 1e-9);
        }
      }
    }
  });

  it("gives a printed pin more room in the body's holes, so it can be pressed in", () => {
    // A printed pin comes out at its full diameter and the printed holes a little smaller: at 0.05 mm it hardly went in.
    expect(HINGE_PRINTED_PIN_GRIP).toBe(0.15);
    const printed = hingePinHoles(normalizeLidOptions({ hingePin: 3, hingePrintPin: true }));
    expect(printed.bodyHole).toBeCloseTo(1.5 + 0.15, 9);
    expect(printed.lidHole).toBeCloseTo(1.5 + 0.2, 9);
    // Filament keeps its tight fit.
    expect(hingePinHoles(normalizeLidOptions({ hingePin: 3 })).bodyHole).toBeCloseTo(1.5 + 0.05, 9);
    // Never looser than the lid's holes: with less play than that, both are as wide.
    const tight = hingePinHoles(normalizeLidOptions({ hingePin: 3, hingePinPlay: 0.1, hingePrintPin: true }));
    expect(tight.bodyHole).toBeCloseTo(tight.lidHole, 9);
    expect(hingePinGrip({ hingePinPlay: 0.1, hingePrintPin: true })).toBeCloseTo(0.1, 9);
    expect(hingePinGrip({ hingePinPlay: 0.3, hingePrintPin: true })).toBeCloseTo(0.15, 9);
    expect(hingePinGrip({ hingePinPlay: 0.3, hingePrintPin: false })).toBe(HINGE_PIN_GRIP);
  });

  it("brings sizes into range and ignores what is not a number", () => {
    const options = normalizeLidOptions({ thickness: 50, gap: -1, depth: "6", wall: 0.1 });
    expect(options.thickness).toBe(MAX_LID_THICKNESS);
    expect(options.gap).toBe(0);
    expect(options.depth).toBe(6);
    expect(options.wall).toBe(MIN_LID_WALL);
    expect(normalizeLidOptions({ gap: 5 }).gap).toBe(MAX_LID_GAP);
    expect(normalizeLidOptions({ thickness: "thick" }).thickness).toBe(LID_DEFAULTS.thickness);
  });
});

describe("lid magnets", () => {
  it("are off unless asked for, and their sizes come into range", () => {
    expect(normalizeLidOptions({ magnets: "yes" }).magnets).toBe(false);
    expect(normalizeLidOptions({ magnets: true }).magnets).toBe(true);
    expect(normalizeLidOptions({ magnets: "true" }).magnets).toBe(true);
    const options = normalizeLidOptions({ magnetDiameter: 1, magnetHeight: "3", magnetGap: 2 });
    expect(options.magnetDiameter).toBe(MIN_MAGNET_DIAMETER);
    expect(options.magnetHeight).toBe(3);
    expect(options.magnetGap).toBe(MAX_MAGNET_GAP);
  });

  it("need a pocket a little deeper than the magnet and a plate with a skin above it", () => {
    expect(magnetPocketDepth({ magnetHeight: 2 })).toBeCloseTo(2.2, 9);
    expect(lidThicknessForMagnets({ magnetHeight: 2 })).toBe(2.8);
    expect(lidThicknessForMagnets({ magnetHeight: 3 })).toBe(3.8);
    expect(lidThicknessForMagnets({ magnetHeight: 2.45 })).toBe(3.3);
  });

  it("sit in the corners of a rectangle, as far from both sides as their wall reaches", () => {
    const rectangle: [number, number][] = [[-30, -20], [30, -20], [30, 20], [-30, 20]];
    const places = magnetPlaces([rectangle], 4.3, 10);
    expect(places).toHaveLength(4);
    const centres = places!.map(({ centre }) => centre);
    const expected = [[-25.7, -15.7], [25.7, -15.7], [25.7, 15.7], [-25.7, 15.7]];
    centres.forEach(([x, y], index) => {
      expect(Math.abs(x - expected[index][0])).toBeLessThan(0.05);
      expect(Math.abs(y - expected[index][1])).toBeLessThan(0.05);
    });
    expect(places!.map(({ corner }) => corner)).toEqual(rectangle);
  });

  it("sit in the corners of a box turned on the plate, not halfway along its sides", () => {
    const turn = (30 * Math.PI) / 180;
    const turned = ([x, y]: [number, number]): [number, number] => [x * Math.cos(turn) - y * Math.sin(turn), x * Math.sin(turn) + y * Math.cos(turn)];
    const rectangle: [number, number][] = [[-30, -20], [30, -20], [30, 20], [-30, 20]];
    const places = magnetPlaces([rectangle.map(turned)], 4.3, 10);
    expect(places).toHaveLength(4);
    const expected = [[-25.7, -15.7], [25.7, -15.7], [25.7, 15.7], [-25.7, 15.7]].map((point) => turned(point as [number, number]));
    expected.forEach(([x, y]) => {
      expect(places!.some(({ centre }) => Math.hypot(centre[0] - x, centre[1] - y) < 0.05)).toBe(true);
    });
  });

  it("sit on the diagonals of a round outline, a wall in from its edge", () => {
    const circle: [number, number][] = Array.from({ length: 96 }, (_, index) => {
      const angle = (index / 96) * Math.PI * 2;
      return [Math.cos(angle) * 15, Math.sin(angle) * 15];
    });
    const places = magnetPlaces([circle], 4.3, 10);
    expect(places).toHaveLength(4);
    places!.forEach(({ centre: [x, y] }) => {
      expect(Math.abs(Math.abs(x) - Math.abs(y))).toBeLessThan(0.05);
      expect(Math.hypot(x, y)).toBeGreaterThan(15 - 4.3 - 0.1);
      expect(Math.hypot(x, y)).toBeLessThan(15 - 4.3 + 0.1);
    });
  });

  it("do not fit where four would run into each other", () => {
    const small: [number, number][] = [[-6, -6], [6, -6], [6, 6], [-6, 6]];
    expect(magnetPlaces([small], 4.3, 7.4)).toBeNull();
    expect(magnetPlaces([], 4.3, 7.4)).toBeNull();
  });
});

describe("where click bumps go (#1234)", () => {
  const rectangle = (width: number, depth: number): [number, number][] => [[-width / 2, -depth / 2], [width / 2, -depth / 2], [width / 2, depth / 2], [-width / 2, depth / 2]];

  it("go in the middle of each side of a box, pointing out of it", () => {
    const places = clickBumpPlaces([rectangle(55.6, 35.6)]);
    expect(places).toHaveLength(4);
    const expected = [[[0, -17.8], [0, -1]], [[27.8, 0], [1, 0]], [[0, 17.8], [0, 1]], [[-27.8, 0], [-1, 0]]];
    for (const [point, outward] of expected) {
      const place = places.find((candidate) => Math.hypot(candidate.point[0] - point[0], candidate.point[1] - point[1]) < 1e-9);
      expect(place, `a bump at ${point}`).toBeDefined();
      expect(place!.outward[0]).toBeCloseTo(outward[0], 9);
      expect(place!.outward[1]).toBeCloseTo(outward[1], 9);
    }
  });

  it("go twice on a side over 80 mm, and not on one under 12 mm", () => {
    const places = clickBumpPlaces([rectangle(100, 10)]);
    const rounded = (list: typeof places) => list.map(({ point }) => point.map((value) => Math.round(value * 10) / 10 + 0)).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    expect(rounded(places)).toEqual([[-25, -5], [-25, 5], [25, -5], [25, 5]]);
  });

  it("count a side made of points in a line as one, as a slice through a mesh gives it", () => {
    const side: [number, number][] = [[-30, -20], [-10, -20], [5, -20], [30, -20], [30, 20], [-30, 20]];
    const places = clickBumpPlaces([side]);
    expect(places).toHaveLength(4);
    expect(places.filter(({ point }) => Math.abs(point[1] + 20) < 1e-9).map(({ point }) => point[0])).toEqual([0]);
  });

  it("go on the straight sides of a box with round corners, not on its corners", () => {
    const corner = (cx: number, cy: number, from: number): [number, number][] => Array.from({ length: 13 }, (_, index) => {
      const angle = ((from + (index * 90) / 12) * Math.PI) / 180;
      return [cx + 5 * Math.cos(angle), cy + 5 * Math.sin(angle)];
    });
    const rounded = [...corner(25, -15, -90), ...corner(25, 15, 0), ...corner(-25, 15, 90), ...corner(-25, -15, 180)];
    const places = clickBumpPlaces([rounded]);
    expect(places).toHaveLength(4);
    expect(places.map(({ point }) => point.map((value) => Math.round(value * 10) / 10 + 0)).sort((a, b) => a[0] - b[0] || a[1] - b[1])).toEqual([[-30, 0], [0, -20], [0, 20], [30, 0]]);
  });

  it("go four evenly round a round pot, however large it is and however long its many short sides, the first at the front", () => {
    for (const [radius, sides] of [[17.8, 96], [150, 64]] as const) {
      const circle: [number, number][] = Array.from({ length: sides }, (_, index) => {
        const angle = (index / sides) * Math.PI * 2;
        return [Math.cos(angle) * radius, Math.sin(angle) * radius];
      });
      const places = clickBumpPlaces([circle]);
      expect(places).toHaveLength(4);
      const expected = [[0, -radius], [radius, 0], [0, radius], [-radius, 0]];
      places.forEach(({ point, outward }, index) => {
        expect(Math.hypot(point[0] - expected[index][0], point[1] - expected[index][1])).toBeLessThan(0.01 * radius);
        expect(outward[0] * expected[index][0] + outward[1] * expected[index][1]).toBeGreaterThan(0.99 * radius);
      });
    }
  });

  it("point out of a hole in the outline too, away from what it bounds", () => {
    const hole: [number, number][] = [...rectangle(20, 20)].reverse();
    const places = clickBumpPlaces([rectangle(55.6, 35.6), hole]);
    expect(places).toHaveLength(8);
    // On the hole's side at y = -10, out of the outline is into the hole: +y.
    const inHole = places.find(({ point }) => Math.abs(point[1] + 10) < 1e-9 && Math.abs(point[0]) < 1e-9)!;
    expect(inHole.outward[1]).toBeCloseTo(1, 9);
  });
});

/** A regular polygon round (cx, cy), `sides` corners on a circle of `radius`, anticlockwise; a hole clockwise. */
function polygonRound(radius: number, sides = 192, cx = 0, cy = 0, hole = false): [number, number][] {
  const points = Array.from({ length: sides }, (_, index): [number, number] => {
    const angle = (2 * Math.PI * index) / sides;
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
  });
  return hole ? points.reverse() : points;
}

describe("a screw lid (Discussion #1393)", () => {
  it("is a fifth kind of lid, taken in any case, and the push-in lid stays the one to begin with", () => {
    expect(LID_TYPES).toEqual(["plug", "cap", "both", "flat", "screw", "screwIn", "bayonet", "slide"]);
    expect(normalizeLidOptions({ type: " Screw " }).type).toBe("screw");
    expect(normalizeLidOptions().type).toBe("plug");
  });

  it("climbs 3 mm a turn and goes round twice unless told otherwise, the pitch 2 to 8 mm and the turns 1 to 8", () => {
    expect([LID_DEFAULTS.threadPitch, LID_DEFAULTS.threadTurns]).toEqual([3, 2]);
    expect(normalizeLidOptions({ threadPitch: 4.5, threadTurns: "1.5" })).toMatchObject({ threadPitch: 4.5, threadTurns: 1.5 });
    expect(normalizeLidOptions({ threadPitch: 0.5, threadTurns: 0 })).toMatchObject({ threadPitch: MIN_LID_THREAD_PITCH, threadTurns: MIN_LID_THREAD_TURNS });
    expect(normalizeLidOptions({ threadPitch: 20, threadTurns: 30 })).toMatchObject({ threadPitch: MAX_LID_THREAD_PITCH, threadTurns: MAX_LID_THREAD_TURNS });
    expect([MIN_LID_THREAD_PITCH, MAX_LID_THREAD_PITCH, MIN_LID_THREAD_TURNS, MAX_LID_THREAD_TURNS]).toEqual([2, 8, 1, 8]);
    expect(normalizeLidOptions({ threadPitch: "x", threadTurns: null })).toMatchObject({ threadPitch: 3, threadTurns: 2 });
  });

  it("has the vase's screw lid's thread: 0.3 of the pitch deep and at most 1.5 mm, crest and root alike, the pitch times the turns long", () => {
    for (const pitch of [2, 2.5, 3, 4, 5, 6, 8]) {
      const thread = lidThread({ threadPitch: pitch, threadTurns: 2 });
      expect(thread.depth, `pitch ${pitch}`).toBeCloseTo(threadSize({ threadPitch: pitch }).depth, 12);
      expect(thread.pitch).toBe(pitch);
      // Two flanks at 45 degrees, as long as the thread is deep, and the crest and the root share the rest.
      expect(2 * thread.depth + 2 * thread.crest).toBeCloseTo(pitch, 12);
      expect(thread.height).toBe(2 * pitch);
    }
    expect(lidThread({ threadPitch: 3, threadTurns: 1.5 })).toMatchObject({ depth: expect.closeTo(0.9, 12), crest: expect.closeTo(0.6, 12), height: 4.5 });
    expect(lidThread({ threadPitch: 8, threadTurns: 1 }).depth).toBe(1.5);
  });

  it("takes no magnets, hinge, click bumps or handle", () => {
    const screw = normalizeLidOptions({ type: "screw" });
    expect(lidTakesExtras(screw)).toBe(false);
    expect(lidClickBumpsFit(screw)).toBe(false);
    expect(lidHandleFits(screw)).toBe(false);
    for (const type of ["plug", "cap", "both", "flat"]) expect(lidTakesExtras(normalizeLidOptions({ type })), type).toBe(true);
  });

  it("knows a round outline from a box, a hexagon, an oval and two pots, by how far its points stray from a circle", () => {
    const round = roundOutline([polygonRound(30, 192, 5, -3)]);
    expect(round).not.toBeNull();
    expect(round!.centre[0]).toBeCloseTo(5, 9);
    expect(round!.centre[1]).toBeCloseTo(-3, 9);
    expect(round!.outer).toBeCloseTo(30, 9);
    expect(round!.inner).toBeCloseTo(30 * Math.cos(Math.PI / 192), 9);
    // A 64-sided cylinder of 60 mm is round enough (its sides come 0.04 mm in), a 24-sided one is not (0.26 mm).
    expect(roundOutline([polygonRound(30, 64)])).not.toBeNull();
    expect(roundOutline([polygonRound(30, 24)])).toBeNull();
    expect(roundOutline([polygonRound(30, 6)])).toBeNull();
    expect(roundOutline([[[-30, -30], [30, -30], [30, 30], [-30, 30]]])).toBeNull();
    const oval = polygonRound(30).map(([x, y]): [number, number] => [x * 1.01, y]);
    expect(roundOutline([oval])).toBeNull();
    expect(roundOutline([polygonRound(10, 96, -20), polygonRound(10, 96, 20)])).toBeNull();
    expect(roundOutline([])).toBeNull();
    // Measured round the rim's middle, a circle moved half a millimetre is not the same circle.
    expect(roundOutline([polygonRound(30, 192, 0.5)], [0, 0])).toBeNull();
    expect(roundOutline([polygonRound(30, 192, 0.05)], [0, 0])).not.toBeNull();
  });
});

describe("where a screw lid's thread goes (Discussion #1393)", () => {
  /**
   * The body seen from above at a height, as lidForSolid slices it: a pot 60 across with a 2 mm wall, 50 high (the rim
   * sliced at 49.7), or what `shape` gives at that height.
   */
  const pot = (shape?: (z: number) => { outer: [number, number][][]; opening: [number, number][][] }) => (z: number) => {
    const level = shape ? shape(z) : { outer: [polygonRound(30)], opening: [polygonRound(28, 192, 0, 0, true)] };
    return { outline: level.outer, opening: level.opening };
  };
  const options = (patch: Record<string, unknown> = {}) => normalizeLidOptions({ type: "screw", ...patch });

  it("starts the thread the pitch times the turns below the rim, and makes the cap the gap, the thread and its wall wider", () => {
    const plan = screwPlan(pot(), options(), 50, 0, 49.7);
    if ("error" in plan) throw new Error(plan.error.code);
    expect(plan.centre[0]).toBeCloseTo(0, 9);
    expect(plan.radius).toBeCloseTo(30, 9);
    expect(plan.inner).toBeCloseTo(30 * Math.cos(Math.PI / 192), 9);
    expect(plan.from).toBe(44);
    expect([plan.pitch, plan.depth, plan.crest]).toEqual([3, expect.closeTo(0.9, 12), expect.closeTo(0.6, 12)]);
    // 0.8 mm into the 2 mm wall; the cap 30 + 0.2 + 0.9 + 1.6 from the axis.
    expect(plan.reach).toBe(0.8);
    expect(plan.capRadius).toBeCloseTo(32.7, 9);
    // A thinner wall: half of it.
    const thin = screwPlan(pot(() => ({ outer: [polygonRound(30)], opening: [polygonRound(28.8, 192, 0, 0, true)] })), options(), 50, 0, 49.7);
    if ("error" in thin) throw new Error(thin.error.code);
    expect(thin.reach).toBeCloseTo((30 * Math.cos(Math.PI / 192) - 28.8) / 2, 9);
  });

  it("refuses a body that is not round, or not as round all the way down the thread", () => {
    const box = pot(() => ({ outer: [[[-30, -30], [30, -30], [30, 30], [-30, 30]]], opening: [[[-28, -28], [-28, 28], [28, 28], [28, -28]]] }));
    expect(screwPlan(box, options(), 50, 0, 49.7)).toEqual({ error: { code: "screwNotRound" } });
    // A pot that tapers: a millimetre less across at the bottom of the thread, 6 mm down.
    const tapering = pot((z) => ({ outer: [polygonRound(30 - (50 - z) / 12)], opening: [polygonRound(28 - (50 - z) / 12, 192, 0, 0, true)] }));
    expect(screwPlan(tapering, options(), 50, 0, 49.7)).toEqual({ error: { code: "screwNotRound" } });
    // A knob standing out of the wall below the rim.
    const knob = pot((z) => ({ outer: [z < 47 ? [...polygonRound(30, 192).slice(0, 96), [-31, 0] as [number, number], ...polygonRound(30, 192).slice(97)] : polygonRound(30)], opening: [polygonRound(28, 192, 0, 0, true)] }));
    expect(screwPlan(knob, options(), 50, 0, 49.7)).toEqual({ error: { code: "screwNotRound" } });
    // Two pots side by side.
    const two = pot(() => ({ outer: [polygonRound(10, 96, -20), polygonRound(10, 96, 20)], opening: [polygonRound(8, 96, -20, 0, true), polygonRound(8, 96, 20, 0, true)] }));
    expect(screwPlan(two, options(), 50, 0, 49.7)).toEqual({ error: { code: "screwNotRound" } });
  });

  it("refuses a wall under 0.8 mm where it is thinnest, also off the middle or lower down", () => {
    expect(SCREW_MIN_WALL).toBe(0.8);
    const thin = pot(() => ({ outer: [polygonRound(30)], opening: [polygonRound(29.4, 192, 0, 0, true)] }));
    expect(screwPlan(thin, options(), 50, 0, 49.7)).toEqual({ error: { code: "screwThinWall" } });
    const offMiddle = pot(() => ({ outer: [polygonRound(30)], opening: [polygonRound(27, 192, 2.5, 0, true)] }));
    expect(screwPlan(offMiddle, options(), 50, 0, 49.7)).toEqual({ error: { code: "screwThinWall" } });
    const widerBelow = pot((z) => ({ outer: [polygonRound(30)], opening: [polygonRound(z < 46 ? 29.5 : 28, 192, 0, 0, true)] }));
    expect(screwPlan(widerBelow, options(), 50, 0, 49.7)).toEqual({ error: { code: "screwThinWall" } });
  });

  it("refuses a body too low for the thread, and a gap too large for it", () => {
    // Two turns of 3 mm and 0.4 mm below them: 6.4 mm.
    expect(screwPlan(pot(), options(), 50, 43.7, 49.7)).toEqual({ error: { code: "screwTooLow", height: 6 } });
    expect("error" in screwPlan(pot(), options(), 50, 43.5, 49.7)).toBe(false);
    expect(screwPlan(pot(), options({ threadTurns: 8, threadPitch: 8 }), 50, 0, 49.7)).toEqual({ error: { code: "screwTooLow", height: 64 } });
    // At most half the depth: 0.45 mm on a 3 mm pitch, 0.3 mm on a 2 mm one.
    expect("error" in screwPlan(pot(), options({ gap: 0.45 }), 50, 0, 49.7)).toBe(false);
    expect(screwPlan(pot(), options({ gap: 0.5 }), 50, 0, 49.7)).toEqual({ error: { code: "screwGapDeep", gap: 0.45 } });
    expect(screwPlan(pot(), options({ gap: 0.35, threadPitch: 2 }), 50, 0, 49.7)).toEqual({ error: { code: "screwGapDeep", gap: 0.3 } });
  });
});

describe("a screw lid with a standard's thread", () => {
  it("offers its own thread first, as before, and five standards, taken as they are written", () => {
    expect(LID_THREAD_STANDARDS).toEqual(["own", "pco1881", "pco1810", "gl45", "mason70", "mason86"]);
    expect(normalizeLidOptions({ type: "screw" }).threadStandard).toBe("own");
    expect(normalizeLidOptions({ threadStandard: "PCO 1881" }).threadStandard).toBe("pco1881");
    expect(normalizeLidOptions({ threadStandard: " GL45 " }).threadStandard).toBe("gl45");
    expect(normalizeLidOptions({ threadStandard: "GL 45" }).threadStandard).toBe("gl45");
    expect(normalizeLidOptions({ threadStandard: "mason-70" }).threadStandard).toBe("mason70");
    expect(normalizeLidOptions({ threadStandard: "Mason_86" }).threadStandard).toBe("mason86");
    expect(normalizeLidOptions({ threadStandard: "pco1882" }).threadStandard).toBe("own");
    expect(normalizeLidOptions({ threadStandard: 1881 }).threadStandard).toBe("own");
    expect(Object.keys(LID_THREAD_STANDARD_SPECS)).toEqual(LID_THREAD_STANDARDS.slice(1));
  });

  it("has each standard's thread as its sources give it", () => {
    // PCO 1881 (ISBT; the patents and BOSL2): 27.40 across, 2.7 mm pitch, 650 degrees from 1.7 mm down; 24.94 under
    // the thread; BOSL2's lip of 25.07 above it, which the cap's ridges must pass.
    expect(LID_THREAD_STANDARD_SPECS.pco1881).toEqual({ name: "PCO 1881", major: 27.4, minor: 24.94, clear: 25.07, pitch: 2.7, flank: 15, crest: 1.02, start: 1.7, turns: 650 / 360, capDepth: 10 });
    expect(LID_THREAD_STANDARD_SPECS.pco1810).toEqual({ name: "PCO 1810", major: 27.43, minor: 24.51, clear: 25.07, pitch: 3.18, flank: 20, crest: 1.06, start: 1.7, turns: 810 / 360, capDepth: 13 });
    // GL 45 (DIN 168-1): the glass's largest, 45 and 42.3; a 4 mm pitch, 60 degrees between the flanks.
    expect(LID_THREAD_STANDARD_SPECS.gl45).toMatchObject({ name: "GL 45", major: 45, minor: 42.3, clear: 42.3, pitch: 4, flank: 30 });
    // Mason jars: 2.75 and 3.38 inches across the thread, 4 threads per inch.
    expect(LID_THREAD_STANDARD_SPECS.mason70).toMatchObject({ major: expect.closeTo(2.75 * 25.4, 9), pitch: expect.closeTo(25.4 / 4, 9), flank: 30 });
    expect(LID_THREAD_STANDARD_SPECS.mason86).toMatchObject({ major: expect.closeTo(3.38 * 25.4, 2), pitch: expect.closeTo(25.4 / 4, 9), flank: 30 });
    const gl45 = lidStandardThread("gl45");
    // The glass's tooth is 0.675 of the pitch wide at the core and half that high (DIN 168 Bild 1), here with a flat crest.
    expect(gl45.depth).toBeCloseTo(1.35, 9);
    expect(gl45.root).toBeCloseTo(0.675 * 4, 2);
    // A mason jar's tooth: 3.6 wide at its root, 1.8 deep (BOSL2).
    expect(lidStandardThread("mason70").depth).toBeCloseTo(1.8, 9);
    expect(lidStandardThread("mason70").root).toBeCloseTo(3.6, 2);
    expect(lidStandardThread("mason86").root).toBeCloseTo(3.6, 2);
    // PCO's crest is as wide as the root's gap, as BOSL2 draws it.
    for (const standard of ["pco1881", "pco1810"] as const) {
      const thread = lidStandardThread(standard);
      expect(thread.crest, standard).toBeCloseTo(thread.pitch - thread.root, 2);
    }
  });

  it("keeps every standard's thread on its neck inside the cap, its ridges off the neck, and the usual fits within reach", () => {
    for (const standard of LID_THREAD_STANDARDS.slice(1) as Exclude<typeof LID_THREAD_STANDARDS[number], "own">[]) {
      const thread = lidStandardThread(standard);
      expect(thread.depth, standard).toBeCloseTo((thread.major - thread.minor) / 2, 12);
      expect(thread.length, standard).toBeCloseTo(thread.turns * thread.pitch + thread.root, 12);
      expect(thread.end, standard).toBeCloseTo(thread.start + thread.length, 12);
      expect(thread.end, standard).toBeLessThan(thread.capDepth);
      expect(thread.root, standard).toBeLessThan(thread.pitch);
      expect(thread.clear, standard).toBeGreaterThanOrEqual(thread.minor);
      expect(thread.clear, standard).toBeLessThan(thread.major);
      // The loose fit, 0.3 mm, is within half the thread's depth.
      expect(thread.depth / 2, standard).toBeGreaterThan(0.6);
      expect([thread.neckFrom, thread.neckTo]).toEqual([thread.minor - NECK_SMALLER, thread.minor + NECK_LARGER]);
    }
    expect(lidStandardThread("pco1881")).toMatchObject({ depth: expect.closeTo(1.23, 9), end: expect.closeTo(1.7 + 650 / 360 * 2.7 + 1.02 + 2 * 1.23 * Math.tan(Math.PI / 12), 9) });
  });

  it("takes a body's top as the neck from a millimetre smaller to a fifth of one larger across, and says why not otherwise", () => {
    expect([NECK_SMALLER, NECK_LARGER]).toEqual([1, 0.2]);
    const top = (diameter: number) => ({ outer: diameter / 2, inner: diameter / 2 });
    expect(lidNeckFit("pco1881", top(24.94))).toBeNull();
    expect(lidNeckFit("pco1881", top(23.94))).toBeNull();
    expect(lidNeckFit("pco1881", top(25.14))).toBeNull();
    expect(lidNeckFit("pco1881", top(23.9))).toEqual({ reason: "size", diameter: 23.9 });
    expect(lidNeckFit("pco1881", top(25.2))).toEqual({ reason: "size", diameter: 25.2 });
    // The bottle a cap is wanted for: as wide as its neck over the thread.
    expect(lidNeckFit("pco1881", top(28))).toEqual({ reason: "size", diameter: 28 });
    expect(lidNeckFit("pco1881", null)).toEqual({ reason: "notRound" });
    // Its nearest point must reach the smallest, its farthest stay within the largest.
    expect(lidNeckFit("gl45", { outer: 21.1, inner: 20.6 })).toEqual({ reason: "size", diameter: 42.2 });
    expect(lidNeckFit("gl45", { outer: 21.26, inner: 21.1 })).toEqual({ reason: "size", diameter: 42.5 });
    expect(lidNeckFit("gl45", { outer: 21.2, inner: 21.1 })).toBeNull();
    expect(lidNeckFit("mason70", top(66))).toBeNull();
    expect(lidNeckFit("mason86", top(82.25))).toBeNull();
    expect(lidNeckFit("mason86", top(66.25))).toEqual({ reason: "size", diameter: 66.3 });
  });
});

describe("where a standard's thread and cap go", () => {
  /** A pot `diameter` across with a `wall`, seen from above, or what `shape` gives at a height. */
  const pot = (diameter: number, wall = 1.6, shape?: (z: number) => { outer: [number, number][][]; opening: [number, number][][] }) => (z: number) => {
    const level = shape ? shape(z) : { outer: [polygonRound(diameter / 2)], opening: [polygonRound(diameter / 2 - wall, 192, 0, 0, true)] };
    return { outline: level.outer, opening: level.opening };
  };
  const options = (patch: Record<string, unknown> = {}) => normalizeLidOptions({ type: "screw", threadStandard: "pco1881", ...patch });

  it("puts a PCO 1881 neck's thread where the standard has it on a body that is the neck, and makes the cap to the standard", () => {
    const plan = screwPlan(pot(24.94), options(), 30, 0, 29.7);
    if ("error" in plan) throw new Error(plan.error.code);
    expect(plan.neck).toBeNull();
    expect(plan.standard).toBe("pco1881");
    // From 1.7 mm below the rim, 650 degrees and its tooth down; the cap 10 mm deep.
    expect(plan.to).toBeCloseTo(28.3, 9);
    expect(plan.from).toBeCloseTo(30 - lidStandardThread("pco1881").end, 9);
    expect(plan.mouth).toBe(20);
    expect([plan.pitch, plan.turns, plan.crest]).toEqual([2.7, 650 / 360, 1.02]);
    expect(plan.depth).toBeCloseTo(1.23, 9);
    // On the neck under the thread, whatever the body's own size; 15 degree flanks fall 3.73 mm a millimetre.
    expect(plan.base).toBeCloseTo(12.47, 9);
    expect(plan.slope).toBeCloseTo(1 / Math.tan(Math.PI / 12), 9);
    // The cap's ridges 25.07 / 2 and the gap from the axis, its grooves the gap square to the flanks wider, its rim
    // the thread, the gap and the wall out.
    expect(plan.clear).toBeCloseTo(12.535 + 0.2, 9);
    expect(plan.widen).toBeCloseTo(0.2 * (1 / Math.cos(Math.PI / 12) - Math.tan(Math.PI / 12)), 9);
    expect(plan.capRadius).toBeCloseTo(13.7 + 0.2 + 1.6, 9);
    expect(plan.reach).toBeCloseTo(0.8, 2);
    // A body a little thinner gets the same thread, standing on the standard's neck.
    const thinner = screwPlan(pot(24), options(), 30, 0, 29.7);
    if ("error" in thinner) throw new Error(thinner.error.code);
    expect(thinner.neck).toBeNull();
    expect(thinner.base).toBeCloseTo(12.47, 9);
    expect(thinner.inner).toBeCloseTo(12 * Math.cos(Math.PI / 192), 9);
  });

  it("makes the cap alone for a body that is not the neck, whatever its height, wall or opening", () => {
    const wide = screwPlan(pot(30, 2), options(), 30, 0, 29.7);
    if ("error" in wide) throw new Error(wide.error.code);
    expect(wide.neck).toEqual({ reason: "size", diameter: 30 });
    expect(wide.capRadius).toBeCloseTo(15.5, 9);
    expect(wide.mouth).toBe(20);
    // A ring 3 mm high with a thin wall, a solid rod: the cap all the same.
    expect(screwPlan(pot(30, 0.3), options(), 30, 27, 29.7)).toMatchObject({ neck: { reason: "size", diameter: 30 } });
    const rod = screwPlan(() => ({ outline: [polygonRound(15)], opening: [] }), options(), 30, 0, 29.7);
    expect(rod).toMatchObject({ neck: { reason: "size", diameter: 30 } });
    // A box is no neck: the cap goes round its middle.
    const box = screwPlan(() => ({ outline: [[[-20, -10], [30, -10], [30, 20], [-20, 20]]], opening: [] }), options(), 30, 0, 29.7);
    if ("error" in box) throw new Error(box.error.code);
    expect(box.neck).toEqual({ reason: "notRound" });
    expect(box.centre).toEqual([5, 5]);
  });

  it("refuses a neck too low for the thread, one that does not stay the neck as far as the cap reaches, a thin wall and a gap too large", () => {
    // 650 degrees and the tooth from 1.7 mm down end 8.25 mm down; 0.4 mm must stay below.
    expect(screwPlan(pot(24.94), options(), 30, 21.5, 29.7)).toEqual({ error: { code: "screwStandardTooLow", standard: "pco1881", height: 8.3 } });
    // A neck on a ring shorter than the cap reaches is fine: nothing is in the cap's way below it.
    expect("error" in screwPlan(pot(24.94), options(), 30, 21.3, 29.7)).toBe(false);
    // A shoulder 6 mm below the rim, where the cap still reaches, or a neck that tapers.
    const shoulder = pot(24.94, 1.6, (z) => ({ outer: [polygonRound(z < 24 ? 20 : 12.47)], opening: [polygonRound(10.87, 192, 0, 0, true)] }));
    expect(screwPlan(shoulder, options(), 30, 0, 29.7)).toEqual({ error: { code: "screwStandardNeck", standard: "pco1881", depth: 10 } });
    const tapering = pot(24.94, 1.6, (z) => ({ outer: [polygonRound(12.47 + (30 - z) / 40)], opening: [polygonRound(10.87, 192, 0, 0, true)] }));
    expect(screwPlan(tapering, options(), 30, 0, 29.7)).toEqual({ error: { code: "screwStandardNeck", standard: "pco1881", depth: 10 } });
    expect(screwPlan(pot(24.94, 0.6), options(), 30, 0, 29.7)).toEqual({ error: { code: "screwThinWall" } });
    // At most half the depth: 0.61 mm on PCO 1881, 0.9 on a mason jar; for the cap alone as well.
    expect(screwPlan(pot(24.94), options({ gap: 0.65 }), 30, 0, 29.7)).toEqual({ error: { code: "screwStandardGapDeep", gap: 0.61 } });
    expect(screwPlan(pot(30), options({ gap: 0.65 }), 30, 0, 29.7)).toEqual({ error: { code: "screwStandardGapDeep", gap: 0.61 } });
    expect("error" in screwPlan(pot(66.25), options({ threadStandard: "mason70", gap: 0.9 }), 30, 0, 29.7)).toBe(false);
    // The own thread's pitch and turns do not count.
    expect("error" in screwPlan(pot(24.94), options({ threadPitch: 8, threadTurns: 8 }), 30, 0, 29.7)).toBe(false);
  });
});

/**
 * A pot 60 across with a 2 mm wall whose rim is rounded or chamfered (Discussion #1426), as lidForSolid slices it: how far
 * the outline reaches from the axis and the opening's edge at a height, its top at 50. `outer` and `inner` give how far
 * the rounding takes the outline in and the opening out at a height.
 */
const roundedRim = (outer: (z: number) => number, inner: (z: number) => number = () => 0, radius = 30, wall = 2) => (z: number) => ({
  outline: [polygonRound(radius - outer(z))],
  opening: [polygonRound(radius - wall + inner(z), 192, 0, 0, true)],
});
/** How far a quarter circle of `size` at the rim's edge takes it in at a height, 50 the top. */
const fillet = (size: number, top = 50) => (z: number) => (z <= top - size ? 0 : size - Math.sqrt(size ** 2 - (z - (top - size)) ** 2));
/** How far a chamfer of `size` at 45 degrees takes it in. */
const chamfer = (size: number, top = 50) => (z: number) => Math.max(0, z - (top - size));

describe("a screw lid or a bayonet lid on a rim that is rounded or chamfered (Discussion #1426)", () => {
  const screw = (patch: Record<string, unknown> = {}) => normalizeLidOptions({ type: "screw", ...patch });
  const bayonet = (patch: Record<string, unknown> = {}) => normalizeLidOptions({ type: "bayonet", ...patch });

  it("puts the thread on the straight wall below an outside fillet, where the outline comes within 0.05 mm of the wall's", () => {
    // A fillet of 1.5 mm comes within 0.05 mm of the wall 1.116 mm under the top; found to 0.05 mm.
    const plan = screwPlan(roundedRim(fillet(1.5)), screw(), 50, 0, 49.7);
    if ("error" in plan) throw new Error(plan.error.code);
    const begins = 48.5 + Math.sqrt(1.5 ** 2 - 1.45 ** 2);
    expect(plan.wallTop).toBeLessThanOrEqual(begins);
    expect(plan.wallTop).toBeGreaterThan(begins - 0.05);
    // The thread its height under it, the rest as on a square rim: the wall's own size, its whole thickness to reach into.
    expect(plan.from).toBeCloseTo(plan.wallTop - 6, 9);
    expect(plan.radius).toBeCloseTo(30, 9);
    expect(plan.reach).toBe(0.8);
    expect(plan.capRadius).toBeCloseTo(32.7, 9);
    // A square rim keeps the thread where it was: the wall reaches the top.
    const square = screwPlan(roundedRim(() => 0), screw(), 50, 0, 49.7);
    if ("error" in square) throw new Error(square.error.code);
    expect([square.wallTop, square.from]).toEqual([50, 44]);
  });

  it("goes as far down as a chamfer outside, or one inside that leaves the rim too thin, and as a fillet small enough to pass leaves it", () => {
    const outside = screwPlan(roundedRim(chamfer(1.5)), screw(), 50, 0, 49.7);
    if ("error" in outside) throw new Error(outside.error.code);
    expect(outside.wallTop).toBeGreaterThan(48.5);
    expect(outside.wallTop).toBeLessThanOrEqual(48.55);
    // 1.8 mm of the 2 mm wall chamfered away inside: 0.5 mm of wall at the rim, too thin; whole from 48.2 mm down.
    const inside = screwPlan(roundedRim(() => 0, chamfer(1.8)), screw(), 50, 0, 49.7);
    if ("error" in inside) throw new Error(inside.error.code);
    expect(inside.wallTop).toBeGreaterThan(48.2);
    expect(inside.wallTop).toBeLessThanOrEqual(48.25);
    expect(inside.reach).toBe(0.8);
    // A chamfer of 1 mm inside leaves 1.3 mm at the rim, and a fillet of 0.6 mm outside comes in only 0.08 mm there:
    // both take a thread as before, up to the top.
    for (const rim of [roundedRim(() => 0, chamfer(1)), roundedRim(fillet(0.6))]) {
      const plan = screwPlan(rim, screw(), 50, 0, 49.7);
      if ("error" in plan) throw new Error(plan.error.code);
      expect(plan.wallTop).toBe(50);
    }
  });

  it("refuses a rounding that leaves too little straight wall for the thread, and a rim that flares out or a pot that tapers as before", () => {
    // 8.5 mm high, a 4 mm wall: under a square rim the thread fits, under a fillet of 3 mm it does not, one turn does.
    const low = roundedRim(fillet(3), () => 0, 30, 4);
    expect("error" in screwPlan(roundedRim(() => 0, () => 0, 30, 4), screw(), 50, 41.5, 49.83)).toBe(false);
    expect(screwPlan(low, screw(), 50, 41.5, 49.83)).toEqual({ error: { code: "screwRimRound", height: 6 } });
    expect("error" in screwPlan(low, screw({ threadTurns: 1 }), 50, 41.5, 49.83)).toBe(false);
    // A rim flaring a millimetre out past the wall over its last 3 mm: no cap passes over it.
    const flared = roundedRim((z) => -Math.max(0, (z - 47) / 3));
    expect(screwPlan(flared, screw(), 50, 0, 49.7)).toEqual({ error: { code: "screwNotRound" } });
    // A pot narrowing to the top all the way up, a millimetre in 6 mm, and a wall too thin all the way up.
    const narrowing = roundedRim((z) => (z - 40) / 6, (z) => -(z - 40) / 6);
    expect(screwPlan(narrowing, screw(), 50, 0, 49.7)).toEqual({ error: { code: "screwNotRound" } });
    expect(screwPlan(roundedRim(() => 0, () => 1.4), screw(), 50, 0, 49.7)).toEqual({ error: { code: "screwThinWall" } });
    // On a pot just high enough for the thread, too thin a wall under a square rim is that, not a rounding.
    expect(screwPlan(roundedRim(() => 0, () => 1.4), screw(), 50, 43.5, 49.87)).toEqual({ error: { code: "screwThinWall" } });
  });

  it("puts a bayonet's lugs below the rounding and its cap's mouth the rim depth under where it begins, or refuses as for a screw lid", () => {
    const plan = bayonetPlan(roundedRim(fillet(1.5)), bayonet(), 50, 0, 49.7);
    if ("error" in plan) throw new Error(plan.error.code);
    expect(plan.wallTop).toBeLessThan(48.885);
    expect(plan.wallTop).toBeGreaterThan(48.83);
    expect(plan.lugTop).toBeCloseTo(plan.wallTop - 0.2, 9);
    expect(plan.lugLow).toBeCloseTo(plan.wallTop - 0.2 - 1.5, 9);
    expect(plan.from).toBeCloseTo(plan.wallTop - 8, 9);
    expect(plan.capRadius).toBeCloseTo(30 + 1.5 + 0.2 + 1.6, 9);
    const square = bayonetPlan(roundedRim(() => 0), bayonet(), 50, 0, 49.7);
    if ("error" in square) throw new Error(square.error.code);
    expect([square.wallTop, square.lugTop, square.from]).toEqual([50, expect.closeTo(49.8, 9), 42]);
    expect(bayonetPlan(roundedRim(fillet(3), () => 0, 30, 4), bayonet(), 50, 41.5, 49.83)).toEqual({ error: { code: "bayonetRimRound", height: 8 } });
    expect("error" in bayonetPlan(roundedRim(() => 0, () => 0, 30, 4), bayonet(), 50, 41.5, 49.83)).toBe(false);
    expect(bayonetPlan(roundedRim((z) => -Math.max(0, (z - 47) / 3)), bayonet(), 50, 0, 49.7)).toEqual({ error: { code: "bayonetNotRound" } });
  });
});

describe("a bayonet lid (Discussion #1424)", () => {
  it("is a sixth kind of lid, taken in any case, and the push-in lid stays the one to begin with", () => {
    expect(LID_TYPES[6]).toBe("bayonet");
    expect(normalizeLidOptions({ type: " Bayonet " }).type).toBe("bayonet");
    expect(normalizeLidOptions().type).toBe("plug");
  });

  it("has three lugs, a rim 8 mm deep, 0.3 mm of room above the ledge and a detent of 0.3 mm unless told otherwise, each held in its range", () => {
    expect([LID_DEFAULTS.bayonetLugs, LID_DEFAULTS.bayonetDepth, LID_DEFAULTS.bayonetAxialGap, LID_DEFAULTS.bayonetDetent]).toEqual([3, 8, 0.3, 0.3]);
    expect(normalizeLidOptions({ bayonetLugs: "4", bayonetDepth: 12.5, bayonetAxialGap: "0.25", bayonetDetent: 0 })).toMatchObject({ bayonetLugs: 4, bayonetDepth: 12.5, bayonetAxialGap: 0.25, bayonetDetent: 0 });
    // Whole lugs only.
    expect(normalizeLidOptions({ bayonetLugs: 2.6 }).bayonetLugs).toBe(3);
    expect(normalizeLidOptions({ bayonetLugs: 1, bayonetDepth: 0, bayonetAxialGap: 0, bayonetDetent: -1 })).toMatchObject({ bayonetLugs: MIN_BAYONET_LUGS, bayonetDepth: MIN_BAYONET_DEPTH, bayonetAxialGap: MIN_BAYONET_AXIAL_GAP, bayonetDetent: 0 });
    expect(normalizeLidOptions({ bayonetLugs: 9, bayonetDepth: 80, bayonetAxialGap: 3, bayonetDetent: 2 })).toMatchObject({ bayonetLugs: MAX_BAYONET_LUGS, bayonetDepth: MAX_BAYONET_DEPTH, bayonetAxialGap: MAX_BAYONET_AXIAL_GAP, bayonetDetent: MAX_BAYONET_DETENT });
    expect([MIN_BAYONET_LUGS, MAX_BAYONET_LUGS, MIN_BAYONET_DEPTH, MAX_BAYONET_DEPTH, MIN_BAYONET_AXIAL_GAP, MAX_BAYONET_AXIAL_GAP, MAX_BAYONET_DETENT]).toEqual([2, 4, 3, 30, 0.05, 1, 0.5]);
    expect(normalizeLidOptions({ bayonetLugs: "x", bayonetDetent: null })).toMatchObject({ bayonetLugs: 3, bayonetDetent: 0.3 });
  });

  it("turns a third of the way to the next lug, 45 degrees at most, and sizes its lugs from the body's diameter", () => {
    expect([2, 3, 4].map(bayonetTurn)).toEqual([45, 40, 30]);
    // A fortieth of the diameter out of the wall, 1.2 to 2.5 mm, and 0.15 of it wide, 6 to 20 mm.
    expect(bayonetLugSize(60)).toEqual({ height: 1.5, width: expect.closeTo(9, 12) });
    expect(bayonetLugSize(100)).toEqual({ height: 2.5, width: expect.closeTo(15, 12) });
    expect(bayonetLugSize(30)).toEqual({ height: 1.2, width: 6 });
    expect(bayonetLugSize(200)).toEqual({ height: 2.5, width: 20 });
    expect(bayonetLugSize(82)).toEqual({ height: 2.1, width: expect.closeTo(12.3, 12) });
  });

  it("leaves the turn to the lugs unless it is set by hand, in whole degrees from 15 to a quarter turn", () => {
    expect(LID_DEFAULTS.bayonetTurn).toBe(0);
    expect([MIN_BAYONET_TURN, MAX_BAYONET_TURN]).toEqual([15, 90]);
    expect(normalizeLidOptions({ bayonetTurn: 90 }).bayonetTurn).toBe(90);
    expect(normalizeLidOptions({ bayonetTurn: "62.4" }).bayonetTurn).toBe(62);
    expect(normalizeLidOptions({ bayonetTurn: 37.5 }).bayonetTurn).toBe(38);
    // 0 is the lugs' own turn; a turn set by hand is 15 at least and 90 at most.
    expect(normalizeLidOptions({ bayonetTurn: 0 }).bayonetTurn).toBe(0);
    expect(normalizeLidOptions({ bayonetTurn: 0.4 }).bayonetTurn).toBe(0);
    expect(normalizeLidOptions({ bayonetTurn: -30 }).bayonetTurn).toBe(0);
    expect(normalizeLidOptions({ bayonetTurn: 5 }).bayonetTurn).toBe(MIN_BAYONET_TURN);
    expect(normalizeLidOptions({ bayonetTurn: 180 }).bayonetTurn).toBe(MAX_BAYONET_TURN);
    expect(normalizeLidOptions({ bayonetTurn: "x" }).bayonetTurn).toBe(0);
    expect(normalizeLidOptions({ bayonetTurn: null }, { ...LID_DEFAULTS, bayonetTurn: 45 }).bayonetTurn).toBe(45);
  });

  it("takes no magnets, hinge, click bumps or handle", () => {
    const bayonet = normalizeLidOptions({ type: "bayonet" });
    expect(lidTakesExtras(bayonet)).toBe(false);
    expect(lidClickBumpsFit(bayonet)).toBe(false);
    expect(lidHandleFits(bayonet)).toBe(false);
  });
});

describe("where a bayonet lid's lugs and slots go (Discussion #1424)", () => {
  const pot = (shape?: (z: number) => { outer: [number, number][][]; opening: [number, number][][] }, radius = 30, wall = 2) => (z: number) => {
    const level = shape ? shape(z) : { outer: [polygonRound(radius)], opening: [polygonRound(radius - wall, 192, 0, 0, true)] };
    return { outline: level.outer, opening: level.opening };
  };
  const options = (patch: Record<string, unknown> = {}) => normalizeLidOptions({ type: "bayonet", ...patch });

  it("puts three lugs 1.5 mm out of a 60 mm pot's wall, the first at the front, under the rim, with the ledge's slope the axial gap under theirs", () => {
    const plan = bayonetPlan(pot(), options(), 50, 0, 49.7);
    if ("error" in plan) throw new Error(plan.error.code);
    expect(plan.centre[0]).toBeCloseTo(0, 9);
    expect(plan.radius).toBeCloseTo(30, 9);
    expect(plan.inner).toBeCloseTo(30 * Math.cos(Math.PI / 192), 9);
    expect(plan.reach).toBe(0.8);
    // The front is the least y: -90 degrees, the others evenly round.
    expect(plan.angles).toEqual([-90, 30, 150]);
    expect(plan.turn).toBe(40);
    expect([plan.height, plan.width]).toEqual([1.5, expect.closeTo(9, 9)]);
    // 0.2 under the rim, an outer face 1.5 tall; the cap 8 down, its rim the gap and the wall outside the lugs.
    expect(plan.lugTop).toBeCloseTo(49.8, 9);
    expect(plan.lugLow).toBeCloseTo(48.3, 9);
    expect(plan.from).toBe(42);
    expect(plan.capRadius).toBeCloseTo(30 + 1.5 + 0.2 + 1.6, 9);
    // A lug 9 mm wide on a face 31.5 from the axis: 16.4 degrees; its slot 0.5 mm wider each side where the cap's ring
    // begins, 30.2 from the axis; the stop the gap past the lug there.
    expect(2 * plan.half).toBeCloseTo((9 / 31.5) * (180 / Math.PI), 9);
    expect(plan.slotHalf - plan.half).toBeCloseTo((0.5 / 30.2) * (180 / Math.PI), 9);
    expect(plan.stop).toBeCloseTo((0.2 / 30.2) * (180 / Math.PI), 9);
  });

  it("puts the rib behind a locked lug so that the lug's outer corner keeps the gap from it, and the rib stands the detent past the gap", () => {
    for (const [gap, detent] of [[0.2, 0.3], [0.3, 0.5], [0.1, 0.1]]) {
      const plan = bayonetPlan(pot(), options({ gap, bayonetDetent: detent }), 50, 0, 49.7);
      if ("error" in plan) throw new Error(plan.error.code);
      const rib = plan.rib!;
      const outer = plan.radius + plan.height;
      // The round's nearest point to the axis is the detent inside the lugs' outer faces.
      expect(rib.middle - 3).toBeCloseTo(outer - detent, 9);
      const corner = (((plan.angles[0] - plan.half) * Math.PI) / 180);
      const middle = (((plan.angles[0] - plan.half - rib.behind) * Math.PI) / 180);
      const distance = Math.hypot(outer * Math.cos(corner) - rib.middle * Math.cos(middle), outer * Math.sin(corner) - rib.middle * Math.sin(middle));
      expect(distance - 3, `gap ${gap}, detent ${detent}`).toBeCloseTo(gap, 9);
    }
    const none = bayonetPlan(pot(), options({ bayonetDetent: 0 }), 50, 0, 49.7);
    if ("error" in none) throw new Error(none.error.code);
    expect(none.rib).toBeNull();
  });

  it("narrows the lugs where the turn leaves less room, and refuses a body too small for so many", () => {
    // 30 mm across: 6 mm lugs where the turn leaves room, less with four lugs and their 30 degrees.
    const three = bayonetPlan(pot(undefined, 15, 1.6), options(), 50, 0, 49.7);
    const four = bayonetPlan(pot(undefined, 15, 1.6), options({ bayonetLugs: 4 }), 50, 0, 49.7);
    if ("error" in three || "error" in four) throw new Error("refused");
    expect(three.width).toBe(6);
    expect(four.width).toBeLessThan(6);
    expect(four.width).toBeGreaterThan(4);
    // Without the rib behind the lug there is more room.
    const free = bayonetPlan(pot(undefined, 15, 1.6), options({ bayonetLugs: 4, bayonetDetent: 0 }), 50, 0, 49.7);
    if ("error" in free) throw new Error(free.error.code);
    expect(free.width).toBe(6);
    // 20 mm across: two lugs and 45 degrees, not three.
    expect("error" in bayonetPlan(pot(undefined, 10, 1.6), options({ bayonetLugs: 2 }), 50, 0, 49.7)).toBe(false);
    expect(bayonetPlan(pot(undefined, 10, 1.6), options({ bayonetLugs: 3 }), 50, 0, 49.7)).toEqual({ error: { code: "bayonetNoRoom" } });
  });

  /**
   * Of each lug's share of the way round, what its slot, turn, lug and the stop's gap take, and what is left of the cap's
   * ring before the next lug's slot, in mm where the ring is nearest the axis (the gap outside the body's wall).
   */
  const ringLeft = (plan: Exclude<ReturnType<typeof bayonetPlan>, { error: unknown }>, gap = 0.2) => {
    const taken = plan.slotHalf + plan.turn + plan.half + plan.stop;
    return ((360 / plan.angles.length - taken) * Math.PI / 180) * (plan.radius + gap);
  };

  it("turns as far as set when the turn is set by hand: a quarter turn with two lugs, and the lugs' own turn gives the plan as before", () => {
    const own = bayonetPlan(pot(), options(), 50, 0, 49.7);
    const set = bayonetPlan(pot(), options({ bayonetTurn: 40 }), 50, 0, 49.7);
    if ("error" in own || "error" in set) throw new Error("refused");
    expect(set).toEqual(own);
    const quarter = bayonetPlan(pot(), options({ bayonetLugs: 2, bayonetTurn: 90 }), 50, 0, 49.7);
    if ("error" in quarter) throw new Error(quarter.error.code);
    expect(quarter.turn).toBe(90);
    expect(quarter.angles).toEqual([-90, 90]);
    // The lugs as wide as the pot gives them, the rib and the stop where they are with the lugs' own turn: both lie by
    // the locked lug, so they go with the turn.
    expect(quarter.width).toBeCloseTo(9, 9);
    expect([quarter.half, quarter.slotHalf, quarter.stop]).toEqual([own.half, own.slotHalf, own.stop]);
    expect(quarter.rib).toEqual(own.rib);
    // Slot, turn, lug and the stop's gap take about 107 of each lug's 180 degrees: 38 mm of ring are left before the next slot.
    expect(ringLeft(quarter)).toBeGreaterThan(38);
    expect(ringLeft(quarter)).toBeLessThan(39);
  });

  it("holds a turn set by hand to what fits round the body: never so far that the slots run into each other, never so short that the lugs get too narrow", () => {
    // Four lugs on a 60 mm pot: 66 degrees leave 3 mm of ring and more before the next slot, 67 would not.
    const four = bayonetPlan(pot(), options({ bayonetLugs: 4, bayonetTurn: 90 }), 50, 0, 49.7);
    if ("error" in four) throw new Error(four.error.code);
    expect(four.turn).toBe(66);
    expect(four.width).toBeCloseTo(9, 9);
    expect(ringLeft(four)).toBeGreaterThanOrEqual(3);
    expect(ringLeft({ ...four, turn: 67 })).toBeLessThan(3);
    // A turn that fits is kept as it is.
    const fits = bayonetPlan(pot(), options({ bayonetLugs: 4, bayonetTurn: 60 }), 50, 0, 49.7);
    if ("error" in fits) throw new Error(fits.error.code);
    expect(fits.turn).toBe(60);
    // Three lugs on a tube 30 mm across: 84 degrees at most; 15 is too short for a lug 4 mm wide, 29 the least that gives one.
    const most = bayonetPlan(pot(undefined, 15, 1.6), options({ bayonetTurn: 90 }), 50, 0, 49.7);
    const least = bayonetPlan(pot(undefined, 15, 1.6), options({ bayonetTurn: 15 }), 50, 0, 49.7);
    if ("error" in most || "error" in least) throw new Error("refused");
    expect(most.turn).toBe(84);
    expect(ringLeft(most)).toBeGreaterThanOrEqual(3);
    expect(ringLeft({ ...most, turn: 85 })).toBeLessThan(3);
    expect(least.turn).toBe(29);
    expect(least.width).toBeGreaterThanOrEqual(4);
    // A degree less is 0.28 mm narrower on the lugs' outer faces, 16.2 mm from the axis: under 4.
    expect(least.width).toBeLessThan(4 + 16.2 * (Math.PI / 180));
    // On every size and count it builds, a lug's slot, turn and stop leave 3 mm of ring before the next slot.
    for (const radius of [8, 10, 15, 20, 30, 50, 75]) {
      for (const lugs of [2, 3, 4]) {
        for (const turn of [15, 45, 60, 75, 90]) {
          const plan = bayonetPlan(pot(undefined, radius, 1.6), options({ bayonetLugs: lugs, bayonetTurn: turn }), 50, 0, 49.7);
          if ("error" in plan) continue;
          expect(ringLeft(plan), `${2 * radius} mm, ${lugs} lugs, ${turn} degrees`).toBeGreaterThanOrEqual(3 - 1e-9);
          expect(plan.width).toBeGreaterThanOrEqual(4 - 1e-9);
          expect(Number.isInteger(plan.turn)).toBe(true);
        }
      }
    }
  });

  it("takes three lugs on a body too small for them at their own turn when a longer one is set, and refuses a body with no room for the lugs at any turn", () => {
    // 20 mm across: three lugs and 40 degrees leave the lugs too narrow; 90 is held to 68, and they fit.
    expect(bayonetPlan(pot(undefined, 10, 1.6), options({ bayonetLugs: 3 }), 50, 0, 49.7)).toEqual({ error: { code: "bayonetNoRoom" } });
    const longer = bayonetPlan(pot(undefined, 10, 1.6), options({ bayonetLugs: 3, bayonetTurn: 90 }), 50, 0, 49.7);
    if ("error" in longer) throw new Error(longer.error.code);
    expect(longer.turn).toBe(68);
    expect(longer.width).toBe(6);
    // 16 mm across: four lugs leave no room for a lug 4 mm wide and its stop at any turn.
    for (const turn of [15, 45, 90]) expect(bayonetPlan(pot(undefined, 8, 1.6), options({ bayonetLugs: 4, bayonetTurn: turn }), 50, 0, 49.7)).toEqual({ error: { code: "bayonetNoRoom" } });
  });

  it("refuses a body that is not round, a wall under 0.8 mm, a body too low, a gap over half the lugs' height and a rim too short for lugs and ledge", () => {
    const box = pot(() => ({ outer: [[[-30, -30], [30, -30], [30, 30], [-30, 30]]], opening: [[[-28, -28], [-28, 28], [28, 28], [28, -28]]] }));
    expect(bayonetPlan(box, options(), 50, 0, 49.7)).toEqual({ error: { code: "bayonetNotRound" } });
    // Round at the rim, but tapering down where the cap's rim reaches, 8 mm.
    const tapering = pot((z) => ({ outer: [polygonRound(30 - (50 - z) / 16)], opening: [polygonRound(28 - (50 - z) / 16, 192, 0, 0, true)] }));
    expect(bayonetPlan(tapering, options(), 50, 0, 49.7)).toEqual({ error: { code: "bayonetNotRound" } });
    expect(BAYONET_MIN_WALL).toBe(0.8);
    expect(bayonetPlan(pot(undefined, 30, 0.6), options(), 50, 0, 49.7)).toEqual({ error: { code: "bayonetThinWall" } });
    // 8 mm of rim and 0.4 mm below it.
    expect(bayonetPlan(pot(), options(), 50, 41.7, 49.7)).toEqual({ error: { code: "bayonetTooLow", height: 8 } });
    expect("error" in bayonetPlan(pot(), options(), 50, 41.5, 49.7)).toBe(false);
    // Half of 1.5 mm lugs; 2.5 mm ones on a pot 100 across take the largest gap there is.
    expect("error" in bayonetPlan(pot(), options({ gap: 0.75 }), 50, 0, 49.7)).toBe(false);
    expect(bayonetPlan(pot(), options({ gap: 0.8 }), 50, 0, 49.7)).toEqual({ error: { code: "bayonetGapDeep", gap: 0.75 } });
    expect("error" in bayonetPlan(pot(undefined, 50, 2), options({ gap: 1 }), 50, 0, 49.7)).toBe(false);
    // The lugs' tops 0.2 under the rim, their 1.5 mm faces, the axial gap, the slope's 1.5 less the gap, and 1 mm of
    // ledge: 4.3 mm; more with a larger axial gap or larger lugs.
    expect(bayonetPlan(pot(), options({ bayonetDepth: 4.2 }), 50, 0, 49.7)).toEqual({ error: { code: "bayonetShallow", depth: 4.3 } });
    expect("error" in bayonetPlan(pot(), options({ bayonetDepth: 4.3 }), 50, 0, 49.7)).toBe(false);
    expect(bayonetPlan(pot(), options({ bayonetDepth: 4.3, bayonetAxialGap: 0.6 }), 50, 0, 49.7)).toEqual({ error: { code: "bayonetShallow", depth: 4.6 } });
    expect(bayonetPlan(pot(undefined, 50, 2), options({ bayonetDepth: 6 }), 50, 0, 49.7)).toEqual({ error: { code: "bayonetShallow", depth: 6.3 } });
  });
});

describe("a slide-in lid (Discussion #1443)", () => {
  it("is a seventh kind of lid, taken in any case, and the push-in lid stays the one to begin with", () => {
    expect(LID_TYPES.at(-1)).toBe("slide");
    expect(normalizeLidOptions({ type: " Slide " }).type).toBe("slide");
    expect(normalizeLidOptions().type).toBe("plug");
  });

  it("slides in through the front unless another wall is picked, in any case", () => {
    expect(LID_DEFAULTS.slideSide).toBe("front");
    expect(normalizeLidOptions({ slideSide: " Left " }).slideSide).toBe("left");
    expect(normalizeLidOptions({ slideSide: "back" }).slideSide).toBe("back");
    expect(normalizeLidOptions({ slideSide: "top" }).slideSide).toBe("front");
    expect(normalizeLidOptions({ slideSide: 2 }).slideSide).toBe("front");
    // Its own setting: the hinge's side stays as it was.
    expect(normalizeLidOptions({ slideSide: "right" }).hingeSide).toBe("back");
  });

  it("sits flush with the rim unless a frame is set, from 0 to 5 mm below it", () => {
    expect(LID_DEFAULTS.slideFrame).toBe(0);
    expect(MAX_SLIDE_FRAME).toBe(5);
    expect(normalizeLidOptions({ slideFrame: 2 }).slideFrame).toBe(2);
    expect(normalizeLidOptions({ slideFrame: "1.6" }).slideFrame).toBe(1.6);
    expect(normalizeLidOptions({ slideFrame: 12 }).slideFrame).toBe(MAX_SLIDE_FRAME);
    expect(normalizeLidOptions({ slideFrame: -1 }).slideFrame).toBe(0);
    expect(normalizeLidOptions({ slideFrame: "deep" }).slideFrame).toBe(0);
    expect(normalizeLidOptions({ slideFrame: Number.NaN }).slideFrame).toBe(0);
  });

  it("keeps the gap over the lid in the slot, with click bumps their height too, and 1 mm of wall above it", () => {
    expect(SLIDE_FRAME_KEEP).toBe(1);
    expect(slideSlotRoom(normalizeLidOptions({ type: "slide" }))).toBeCloseTo(0.2, 12);
    expect(slideSlotRoom(normalizeLidOptions({ type: "slide", clickBumps: true, clickBumpHeight: 0.6 }))).toBeCloseTo(0.8, 12);
    // A bump height left over from another lid counts only with the bumps on.
    expect(slideSlotRoom(normalizeLidOptions({ type: "slide", clickBumpHeight: 0.6 }))).toBeCloseTo(0.2, 12);
    expect(slideFrameNeeded(normalizeLidOptions({ type: "slide" }))).toBe(1.2);
    expect(slideFrameNeeded(normalizeLidOptions({ type: "slide", gap: 0.25 }))).toBe(1.3);
    expect(slideFrameNeeded(normalizeLidOptions({ type: "slide", clickBumps: true }))).toBe(1.6);
  });

  it("takes click bumps and a handle, but neither magnets nor a hinge", () => {
    const slide = normalizeLidOptions({ type: "slide" });
    expect(lidTakesExtras(slide)).toBe(true);
    expect(lidTakesMagnets(slide)).toBe(false);
    expect(LID_HINGE_TYPES).not.toContain("slide");
    expect(lidClickBumpsFit(slide)).toBe(true);
    expect(lidHandleFits(slide)).toBe(true);
    // The others as they were: magnets with the four plain kinds, not with a screw or bayonet lid.
    expect(LID_TYPES.filter((type) => lidTakesMagnets({ type }))).toEqual(["plug", "cap", "both", "flat"]);
  });
});

describe("where a slide-in lid's grooves go (Discussion #1443)", () => {
  const rectangle = (left: number, front: number, right: number, back: number): [number, number][] => [[left, front], [right, front], [right, back], [left, back]];
  /** A rectangle from `left` to `right` and `front` to `back` with its corners rounded `radius`, a point every 5 degrees. */
  const rounded = (left: number, front: number, right: number, back: number, radius: number): [number, number][] => {
    const corner = (cx: number, cy: number, from: number) => Array.from({ length: 19 }, (_, index): [number, number] => {
      const angle = ((from + index * 5) * Math.PI) / 180;
      return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
    });
    return [...corner(right - radius, front + radius, -90), ...corner(right - radius, back - radius, 0), ...corner(left + radius, back - radius, 90), ...corner(left + radius, front + radius, 180)];
  };
  /**
   * A box seen from above as `slidePlan` slices it, the wall it slides in through at the front (the least y): 60 x 40 with
   * 2 mm walls to begin with, 30 high, its floor 2 mm thick; `low` gives other contours below a height.
   */
  const box = (outline = rectangle(-30, -20, 30, 20), opening = rectangle(-28, -18, 28, 18), floor = 2, low?: { below: number; outline: [number, number][]; opening: [number, number][] }) => (z: number) => {
    if (low && z < low.below) return { outline: [low.outline], opening: [low.opening] };
    return { outline: [outline], opening: z > floor ? [[...opening].reverse()] : [] };
  };
  const options = (patch: Record<string, unknown> = {}) => normalizeLidOptions({ type: "slide", ...patch });
  // The groove's depth a 2 mm plate allows with a 0.2 mm gap: its tip, the gap upright on the slope and the lip above.
  const fromPlate = (thickness: number, gap = 0.2) => thickness - SLIDE_EDGE - gap * (Math.SQRT2 - 1) - SLIDE_LIP;

  it("puts the grooves as deep as a 2 mm plate allows into 2 mm walls, under it the gap, the lid's underside flat with the plate's", () => {
    expect([SLIDE_MAX_GROOVE, SLIDE_WALL_KEEP, SLIDE_EDGE, SLIDE_LIP, SLIDE_MIN_HOLD]).toEqual([1.5, 0.8, 0.4, 0.6, 0.4]);
    const plan = slidePlan(box(), options(), 30, 29.7);
    if ("error" in plan) throw new Error(plan.error.code);
    expect(plan.depth).toBeCloseTo(fromPlate(2), 12);
    expect(plan.depth).toBeCloseTo(0.917, 3);
    expect(plan.wall).toBeCloseTo(2, 12);
    expect(plan.underside).toBe(28);
    expect(plan.floor).toBeCloseTo(27.8, 12);
    expect([...plan.opening].sort((a, b) => a[0] - b[0] || a[1] - b[1])).toEqual([[-28, -18], [-28, 18], [28, -18], [28, 18]]);
    expect(plan.outline).toEqual([rectangle(-30, -20, 30, 20)]);
  });

  it("goes deeper with a thicker plate, as far as the walls leave 0.8 mm behind the grooves and 1.5 mm at most", () => {
    const deep = (thickness: number, wall: number) => {
      const plan = slidePlan(box(rectangle(-30, -20, 30, 20), rectangle(-30 + wall, -20 + wall, 30 - wall, 20 - wall)), options({ thickness }), 30, 29.7);
      if ("error" in plan) throw new Error(plan.error.code);
      return plan.depth;
    };
    expect(deep(2.2, 2)).toBeCloseTo(fromPlate(2.2), 12);
    expect(deep(3, 2)).toBeCloseTo(2 - SLIDE_WALL_KEEP, 12);
    expect(deep(3, 3)).toBeCloseTo(SLIDE_MAX_GROOVE, 12);
    expect(deep(5, 4)).toBeCloseTo(SLIDE_MAX_GROOVE, 12);
  });

  it("measures the thinnest of the side and back walls, never the wall it slides in through", () => {
    const plan = (opening: [number, number][]) => {
      const result = slidePlan(box(rectangle(-30, -20, 30, 20), opening), options({ thickness: 4 }), 30, 29.7);
      if ("error" in result) throw new Error(result.error.code);
      return result;
    };
    // A thin back, a thin right side, both, a thin front.
    expect(plan(rectangle(-28, -18, 28, 18.3)).wall).toBeCloseTo(1.7, 12);
    expect(plan(rectangle(-28, -18, 28.5, 18)).wall).toBeCloseTo(1.5, 12);
    expect(plan(rectangle(-28, -18, 28.5, 18)).depth).toBeCloseTo(1.5 - SLIDE_WALL_KEEP, 12);
    expect(plan(rectangle(-28, -18, 28.5, 18.3)).wall).toBeCloseTo(1.5, 12);
    expect(plan(rectangle(-28, -19.5, 28, 18)).wall).toBeCloseTo(2, 12);
    expect(plan(rectangle(-28, -19.5, 28, 18)).depth).toBeCloseTo(1.2, 12);
    // Without the front: no wall in front of the opening's front edge counts, nor the outline before it.
    expect(slideWall([rectangle(-30, -20, 30, 20)], rectangle(-28, -19.9, 28, 18), -19.9)).toBeCloseTo(2, 12);
    expect(slideWall([rectangle(-30, -20, 30, 20)], rectangle(-28, -19.9, 28, 18), -25)).toBeCloseTo(0.1, 12);
    // An opening that reaches out of the outline, or round a corner of it, leaves no wall.
    expect(slideWall([rectangle(-30, -20, 30, 20)], rectangle(-28, -18, 31, 18), -18)).toBe(0);
    const lShape: [number, number][] = [[-30, -20], [30, -20], [30, 0], [0, 0], [0, 20], [-30, 20]];
    expect(slideWall([lShape], rectangle(-28, -18, 28, 18), -18)).toBe(0);
    // Two boxes side by side: one opening's hull spans the gap between them.
    expect(slideWall([rectangle(-30, -20, -1, 20), rectangle(1, -20, 30, 20)], rectangle(-28, -18, 28, 18), -18)).toBe(0);
  });

  it("takes a box with rounded corners, but not a round pot nor one whose sides do not run straight from near the front", () => {
    // Corners of 5 mm outside and 3 mm inside: the opening is as wide as it gets 3 mm behind its front, of 36.
    const roundedBox = box(rounded(-30, -20, 30, 20, 5), rounded(-28, -18, 28, 18, 3));
    const plan = slidePlan(roundedBox, options(), 30, 29.7);
    if ("error" in plan) throw new Error(plan.error.code);
    expect(plan.wall).toBeCloseTo(2, 2);
    expect(plan.depth).toBeCloseTo(fromPlate(2), 12);
    // Corners up to a quarter of the opening's length, 9 mm: the lid's end fills them.
    expect("error" in slidePlan(box(rounded(-30, -20, 30, 20, 11), rounded(-28, -18, 28, 18, 9)), options(), 30, 29.7)).toBe(false);
    expect(slidePlan(box(rounded(-30, -20, 30, 20, 12), rounded(-28, -18, 28, 18, 10)), options(), 30, 29.7)).toEqual({ error: { code: "slideNotBox" } });
    expect(slidePlan(box([polygonRound(25)], [polygonRound(23, 192, 0, 0, true)].flat() as [number, number][]), options(), 30, 29.7)).toEqual({ error: { code: "slideNotBox" } });
    expect(slidePlan(box(polygonRound(25), polygonRound(23)), options(), 30, 29.7)).toEqual({ error: { code: "slideNotBox" } });
  });

  it("refuses walls that lean or step in or out between the rim and below the grooves' floor", () => {
    const under = (outline: [number, number][], opening: [number, number][]) => slidePlan(box(rectangle(-30, -20, 30, 20), rectangle(-28, -18, 28, 18), 2, { below: 29, outline, opening }), options(), 30, 29.7);
    expect("error" in under(rectangle(-30, -20, 30, 20), rectangle(-28, -18, 28, 18))).toBe(false);
    expect("error" in under(rectangle(-30.05, -20, 30, 20), rectangle(-28, -18, 28, 18.05))).toBe(false);
    expect(under(rectangle(-29.5, -20, 30, 20), rectangle(-28, -18, 28, 18))).toEqual({ error: { code: "slideNotBox" } });
    expect(under(rectangle(-30, -20, 30, 20), rectangle(-28, -18, 28, 17.5))).toEqual({ error: { code: "slideNotBox" } });
  });

  it("refuses walls or a plate too thin for a tongue reaching 0.4 mm past the gap, a box too shallow and one closed at the top", () => {
    const walls = (wall: number) => box(rectangle(-30, -20, 30, 20), rectangle(-30 + wall, -20 + wall, 30 - wall, 20 - wall));
    // 0.4 mm into the wall past the gap and 0.8 mm behind it: 1.4 mm with a gap of 0.2, 1.5 with 0.3.
    expect(slidePlan(walls(1.39), options(), 30, 29.7)).toEqual({ error: { code: "slideThinWall", wall: 1.4 } });
    expect("error" in slidePlan(walls(1.4), options(), 30, 29.7)).toBe(false);
    expect(slidePlan(walls(1.4), options({ gap: 0.3 }), 30, 29.7)).toEqual({ error: { code: "slideThinWall", wall: 1.5 } });
    // The plate holds the tongue's tip, its slope, the gap upright on it and the wall's lip above: 1.7 mm with a gap of 0.2.
    expect(slidePlan(walls(2), options({ thickness: 1.6 }), 30, 29.7)).toEqual({ error: { code: "slideThinLid", thickness: 1.7 } });
    expect("error" in slidePlan(walls(2), options({ thickness: 1.7 }), 30, 29.7)).toBe(false);
    expect(slidePlan(walls(2), options({ thickness: 1.7, gap: 0.3 }), 30, 29.7)).toEqual({ error: { code: "slideThinLid", thickness: 1.9 } });
    // Both too thin: the walls are named, for a thicker plate would not help them.
    expect(slidePlan(walls(1.2), options({ thickness: 1.2 }), 30, 29.7)).toEqual({ error: { code: "slideThinWall", wall: 1.4 } });
    expect(slidePlan(walls(1.6), options({ thickness: 1.2 }), 30, 29.7)).toEqual({ error: { code: "slideThinLid", thickness: 1.7 } });
    // The opening must reach below the grooves' floor, 2.2 mm under the rim with a 2 mm plate.
    expect(slidePlan(box(undefined, undefined, 27.8), options(), 30, 29.7)).toEqual({ error: { code: "slideShallow", depth: 2.3 } });
    expect("error" in slidePlan(box(undefined, undefined, 27.7), options(), 30, 29.7)).toBe(false);
    expect(slidePlan(box(undefined, undefined, 26.8), options({ thickness: 3 }), 30, 29.7)).toEqual({ error: { code: "slideShallow", depth: 3.3 } });
    expect(slidePlan(() => ({ outline: [rectangle(-30, -20, 30, 20)], opening: [] }), options(), 30, 29.7)).toEqual({ error: { code: "notOpen" } });
  });

  it("with a frame, sets the lid, its grooves and their floor that much lower, the rim and the walls as they are", () => {
    const flush = slidePlan(box(), options(), 30, 29.7);
    const framed = slidePlan(box(), options({ slideFrame: 2.4 }), 30, 29.7);
    if ("error" in flush || "error" in framed) throw new Error("refused");
    expect([flush.lidTop, flush.frame, flush.underside, flush.floor]).toEqual([30, 0, 28, flush.floor]);
    expect(framed.lidTop).toBeCloseTo(27.6, 12);
    expect(framed.frame).toBe(2.4);
    expect(framed.underside).toBeCloseTo(25.6, 12);
    expect(framed.floor).toBeCloseTo(25.4, 12);
    // The same grooves in the same walls, the opening and outline taken at the rim.
    expect(framed.depth).toBeCloseTo(flush.depth, 12);
    expect(framed.wall).toBeCloseTo(flush.wall, 12);
    expect(framed.opening).toEqual(flush.opening);
    expect(framed.outline).toEqual(flush.outline);
    // A thicker plate goes lower still.
    const thick = slidePlan(box(), options({ slideFrame: 2, thickness: 3 }), 30, 29.7);
    if ("error" in thick) throw new Error(thick.error.code);
    expect(thick.underside).toBeCloseTo(25, 12);
    expect(thick.floor).toBeCloseTo(24.8, 12);
  });

  it("refuses a frame too low for the wall above the slot, and a box too shallow for the lid that far down, saying what is needed", () => {
    expect(slidePlan(box(), options({ slideFrame: 1 }), 30, 29.7)).toEqual({ error: { code: "slideThinFrame", frame: 1.2 } });
    expect("error" in slidePlan(box(), options({ slideFrame: 1.2 }), 30, 29.7)).toBe(false);
    expect(slidePlan(box(), options({ slideFrame: 1.2, gap: 0.3 }), 30, 29.7)).toEqual({ error: { code: "slideThinFrame", frame: 1.3 } });
    expect(slidePlan(box(), options({ slideFrame: 1.4, clickBumps: true }), 30, 29.7)).toEqual({ error: { code: "slideThinFrame", frame: 1.6 } });
    expect("error" in slidePlan(box(), options({ slideFrame: 1.6, clickBumps: true }), 30, 29.7)).toBe(false);
    // Down to the floor 2 mm lower: 4.3 mm with a 2 mm frame and plate; without the frame the same box takes the lid.
    expect(slidePlan(box(undefined, undefined, 25.8), options({ slideFrame: 2 }), 30, 29.7)).toEqual({ error: { code: "slideFrameShallow", depth: 4.3 } });
    expect("error" in slidePlan(box(undefined, undefined, 25.7), options({ slideFrame: 2 }), 30, 29.7)).toBe(false);
    expect("error" in slidePlan(box(undefined, undefined, 25.8), options(), 30, 29.7)).toBe(false);
    expect(slidePlan(box(undefined, undefined, 22), options({ slideFrame: 5, thickness: 3 }), 30, 29.7)).toEqual({ error: { code: "slideFrameShallow", depth: 8.3 } });
  });

  it("finds how far a box stands turned on the plate from its opening, to the nearest wall either way", () => {
    const turned = (polygon: [number, number][], degrees: number): [number, number][] => {
      const angle = (degrees * Math.PI) / 180;
      return polygon.map(([x, y]) => [x * Math.cos(angle) - y * Math.sin(angle), x * Math.sin(angle) + y * Math.cos(angle)]);
    };
    const opening = rectangle(-28, -18, 28, 18);
    expect(slideBoxTurn([opening])).toBe(0);
    for (const degrees of [0.5, 5, 30, 44, -0.5, -30]) expect(slideBoxTurn([turned(opening, degrees)]), `${degrees}`).toBeCloseTo(degrees, 9);
    // A quarter turn on is the same box: a wall faces each way again.
    expect(slideBoxTurn([turned(opening, 90)])).toBeCloseTo(0, 9);
    expect(slideBoxTurn([turned(opening, 60)])).toBeCloseTo(-30, 9);
    expect(slideBoxTurn([turned(opening, 120)])).toBeCloseTo(30, 9);
    // Rounded corners do not count: the straight walls set the turn.
    const rounded: [number, number][] = [];
    for (const [cx, cy, from] of [[23, -13, -90], [23, 13, 0], [-23, 13, 90], [-23, -13, 180]] as const) {
      for (let step = 0; step <= 16; step += 1) {
        const angle = ((from + (90 * step) / 16) * Math.PI) / 180;
        rounded.push([cx + 5 * Math.cos(angle), cy + 5 * Math.sin(angle)]);
      }
    }
    expect(slideBoxTurn([rounded])).toBe(0);
    expect(slideBoxTurn([turned(rounded, 20)])).toBeCloseTo(20, 9);
    // Walls inside the box lie within its convex hull and change nothing.
    expect(slideBoxTurn([turned(rectangle(-28, -18, -1, 18), 12), turned(rectangle(1, -18, 28, 18), 12)])).toBeCloseTo(12, 9);
    expect(slideBoxTurn([[[0, 0], [1, 1]]])).toBe(0);
  });
});

describe("a tether for a screw or bayonet cap (asked in the Layerling User Group on Facebook)", () => {
  /** A pot 60 across with a 2 mm wall, 50 high, as the screw lid's tests slice it, or what `shape` gives at a height. */
  const pot = (shape?: (z: number) => { outer: [number, number][][]; opening: [number, number][][] }) => (z: number) => {
    const level = shape ? shape(z) : { outer: [polygonRound(30)], opening: [polygonRound(28, 192, 0, 0, true)] };
    return { outline: level.outer, opening: level.opening };
  };
  const options = (patch: Record<string, unknown> = {}) => normalizeLidOptions({ type: "screw", tether: true, ...patch });
  /** The screw cap on that pot: two turns of 3 mm, its mouth 6 mm under the rim, 30 + 0.2 + 0.9 + 1.6 from the axis. */
  const screwCap = { from: 44, capRadius: 32.7 };

  it("is off unless asked for, and goes only with a screw or a bayonet lid", () => {
    expect(LID_DEFAULTS.tether).toBe(false);
    expect(normalizeLidOptions({ tether: true }).tether).toBe(true);
    expect(normalizeLidOptions({ tether: "true" }).tether).toBe(true);
    expect(normalizeLidOptions({ tether: "yes" }).tether).toBe(false);
    expect(["plug", "cap", "both", "flat", "screw", "bayonet"].map((type) => lidTetherFits(normalizeLidOptions({ type })))).toEqual([false, false, false, false, true, true]);
  });

  it("puts the body's ring under the cap's mouth on a bead, and the cap's ring under a collar round its top with a bead below it, the gap round each", () => {
    const plan = tetherPlan(pot(), options(), 50, 0, 49.7, screwCap);
    if ("error" in plan) throw new Error(plan.error.code);
    expect(plan.play).toBe(0.2);
    expect(plan.centre[0]).toBeCloseTo(0, 9);
    expect(plan.radius).toBeCloseTo(30, 9);
    expect(plan.reach).toBe(0.8);
    // The body's ring: 1.2 mm wide, 2 mm tall, the gap round the pot, under the cap's mouth and over the bead.
    expect([plan.neckInner, plan.neckOuter, plan.neckLow, plan.neckHigh]).toEqual([expect.closeTo(30.2, 9), expect.closeTo(31.4, 9), expect.closeTo(41.8, 9), expect.closeTo(43.8, 9)]);
    // The bead's flat top reaches 0.5 mm past the ring's inner face; its upright face is 0.4 mm tall.
    expect([plan.beadTop, plan.beadOuter, plan.beadLow]).toEqual([expect.closeTo(41.6, 9), expect.closeTo(30.7, 9), expect.closeTo(41.2, 9)]);
    // The cap's ring the gap round the cap (32.7) and under the collar, whose underside is 1 mm below the plate's top
    // (52); the collar and the bead stand out as far as the bead on the body does past its ring, and reach 0.8 mm into
    // the cap's 1.6 mm wall.
    expect([plan.capInner, plan.capOuter, plan.capLow, plan.capHigh, plan.collarLow]).toEqual([expect.closeTo(32.9, 9), expect.closeTo(34.1, 9), expect.closeTo(48.8, 9), expect.closeTo(50.8, 9), expect.closeTo(51, 9)]);
    expect([plan.capBeadOuter, plan.capRoot]).toEqual([expect.closeTo(33.4, 9), expect.closeTo(31.9, 9)]);
    // The bead's upper flank the gap under the ring at its inner face, then 0.5 lower out at its crest, 0.4 tall.
    expect([plan.crestHigh, plan.crestLow]).toEqual([expect.closeTo(48.1, 9), expect.closeTo(47.7, 9)]);
    // The strap: from the cap's ring's lower edge to the body's ring's upper edge, the cap lifted 7 mm, 12.9 mm, and 3
    // more: 16 mm.
    expect(plan.strap).toBe(16);
  });

  it("keeps the gap round each ring, at least 0.1 mm, and makes the strap longer for a deeper cap", () => {
    const tight = tetherPlan(pot(), options({ gap: 0 }), 50, 0, 49.7, screwCap);
    const loose = tetherPlan(pot(), options({ gap: 0.3 }), 50, 0, 49.7, screwCap);
    if ("error" in tight || "error" in loose) throw new Error("refused");
    expect(tight.play).toBe(0.1);
    expect(tight.neckInner).toBeCloseTo(30.1, 9);
    expect(tight.capInner).toBeCloseTo(32.8, 9);
    expect(loose.play).toBe(0.3);
    expect(loose.neckHigh).toBeCloseTo(43.7, 9);
    expect(loose.beadTop).toBeCloseTo(43.7 - 2 - 0.3, 9);
    expect(loose.capHigh).toBeCloseTo(50.7, 9);
    // A bayonet cap on the same pot, 8 mm deep and 33.3 from the axis: the strap 20 mm.
    const bayonet = tetherPlan(pot(), options({ type: "bayonet" }), 50, 0, 49.7, { from: 42, capRadius: 33.3 });
    if ("error" in bayonet) throw new Error(bayonet.error.code);
    expect(bayonet.neckHigh).toBeCloseTo(41.8, 9);
    expect(bayonet.strap).toBe(20);
  });

  it("refuses a cap too short for its ring, a body too low or not round below the cap, and a wall too thin there", () => {
    // The collar, the ring with the gap over and under it and the bead below take 3.8 mm of the cap's rim.
    expect(tetherPlan(pot(), options(), 50, 0, 49.7, { from: 47, capRadius: 32.7 })).toEqual({ error: { code: "tetherCapShort", depth: 3.8 } });
    expect("error" in tetherPlan(pot(), options(), 50, 0, 49.7, { from: 46.2, capRadius: 32.7 })).toBe(false);
    // Below the cap the gap, the ring, the gap, the bead's face and slope (at most 1.7 mm) take 4.5 mm, and 0.4 mm stays.
    expect(tetherPlan(pot(), options(), 50, 39.2, 49.7, screwCap)).toEqual({ error: { code: "tetherNoNeck", length: 4.5 } });
    expect("error" in tetherPlan(pot(), options(), 50, 39, 49.7, screwCap)).toBe(false);
    // A pot that widens under its neck, 41 mm up: 4.5 mm below the cap (39.5) it is not as wide as at its top.
    const shoulder = pot((z) => ({ outer: [polygonRound(z < 41 ? 31 : 30)], opening: [polygonRound(28, 192, 0, 0, true)] }));
    expect(tetherPlan(shoulder, options(), 50, 0, 49.7, screwCap)).toEqual({ error: { code: "tetherNoNeck", length: 4.5 } });
    const lowerShoulder = pot((z) => ({ outer: [polygonRound(z < 39.4 ? 31 : 30)], opening: [polygonRound(28, 192, 0, 0, true)] }));
    expect("error" in tetherPlan(lowerShoulder, options(), 50, 0, 49.7, screwCap)).toBe(false);
    // A wall 0.6 mm thick below 43 mm, where the bead goes.
    const thinBelow = pot((z) => ({ outer: [polygonRound(30)], opening: [polygonRound(z < 43 ? 29.4 : 28, 192, 0, 0, true)] }));
    expect(tetherPlan(thinBelow, options(), 50, 0, 49.7, screwCap)).toEqual({ error: { code: "tetherThinWall" } });
  });
});

describe("a flip-top on a screw or bayonet cap", () => {
  it("is off unless asked for, with an opening 8 mm across to begin with, 4 to 40", () => {
    expect([LID_DEFAULTS.flipTop, LID_DEFAULTS.flipTopOpening]).toEqual([false, 8]);
    expect(normalizeLidOptions({ flipTop: "true", flipTopOpening: "12.5" })).toMatchObject({ flipTop: true, flipTopOpening: 12.5 });
    expect(normalizeLidOptions({ flipTop: 1, flipTopOpening: "x" })).toMatchObject({ flipTop: false, flipTopOpening: 8 });
    expect(normalizeLidOptions({ flipTopOpening: 1 }).flipTopOpening).toBe(MIN_FLIP_TOP_OPENING);
    expect(normalizeLidOptions({ flipTopOpening: 90 }).flipTopOpening).toBe(MAX_FLIP_TOP_OPENING);
    expect([MIN_FLIP_TOP_OPENING, MAX_FLIP_TOP_OPENING, FLIP_HINGE_THICKNESS, FLIP_HINGE_LENGTH]).toEqual([4, 40, 0.4, 3]);
  });

  it("goes only with a cap that stays on: a screw lid's or a bayonet lid's", () => {
    expect(["plug", "cap", "both", "flat", "screw", "bayonet"].map((type) => lidFlipTopFits(normalizeLidOptions({ type })))).toEqual([false, false, false, false, true, true]);
  });

  it("needs a plate deep enough for the V under the strip, or for seat and catch with a large gap", () => {
    // The strip's 0.4 and the V's 1.4 (half of 3 less the gap): 1.8 mm; with no gap the V is deeper.
    expect(flipTopThickness({ gap: 0.2 })).toBe(1.8);
    expect(flipTopThickness({ gap: 0 })).toBe(1.9);
    // 0.6 of seat, the gap at 45 degrees and once more, and 0.2 of catch: 2.25, up to 2.3.
    expect(flipTopThickness({ gap: 0.6 })).toBe(2.3);
  });

  describe("where the flap and its hinge go", () => {
    /** A round opening `radius` round the axis, as the body's rim has it seen from above. */
    const opening = (radius = 28, cx = 0) => [polygonRound(radius, 192, cx, 0, true)];
    const options = (patch: Record<string, unknown> = {}) => normalizeLidOptions({ type: "screw", flipTop: true, ...patch });

    it("makes the flap 0.6 less the gap wider than the opening each side, its back 0.1 behind the opening's under the V", () => {
      const plan = flipTopPlan(options(), [0, 0], opening());
      if ("error" in plan) throw new Error(plan.error.code);
      expect(plan.opening).toBe(8);
      expect(plan.radius).toBeCloseTo(4.4, 12);
      // The catch: the gap at 45 degrees, the gap the flap can slide back, and 0.2 to click past.
      expect(plan.catchWidth).toBeCloseTo(0.2 * Math.SQRT2 + 0.4, 12);
      // The V leans 1.4 each way, to a slit as wide as the gap; that slit is 0.1 behind the opening at the plate's
      // underside (4 from the axis): the flap's back 2.5 behind the middle.
      expect(plan.lean).toBeCloseTo(1.4, 12);
      expect(plan.back).toBeCloseTo(2.5, 12);
      expect(plan.back + plan.lean + 0.2).toBeCloseTo(4 + 0.1, 12);
      // The strip as wide as the flap's straight back, a chord of its 4.4 at 2.5.
      expect(plan.hingeWidth).toBeCloseTo(2 * Math.sqrt(4.4 ** 2 - 2.5 ** 2), 12);
      expect([plan.hingeLength, plan.hingeThickness]).toEqual([3, 0.4]);
      // The farthest cut: the slot's back corners at the plate's top, behind the round opening there (4.4 + 0.28).
      expect(plan.reach).toBeCloseTo(Math.hypot(plan.hingeWidth / 2 + 0.2, 2.5 + 3), 12);
      expect(plan.back + 3).toBeGreaterThan(4.4 + 0.2 * Math.SQRT2);
    });

    it("keeps the flap's back at least 0.3 of its radius behind its middle, so a small flap's strip is narrower than it", () => {
      const plan = flipTopPlan(options({ flipTopOpening: 4 }), [0, 0], opening());
      if ("error" in plan) throw new Error(plan.error.code);
      expect(plan.radius).toBeCloseTo(2.4, 12);
      expect(plan.back).toBeCloseTo(0.72, 12);
      expect(plan.hingeWidth).toBeLessThan(2 * plan.radius);
    });

    it("keeps everything cut through the plate 0.5 inside the body's opening, and says how large an opening fits", () => {
      // 13.8 round the axis: 20 mm reaches 13.06, 20.5 reaches 13.32.
      expect("error" in flipTopPlan(options({ flipTopOpening: 20 }), [0, 0], opening(13.8))).toBe(false);
      expect(flipTopPlan(options({ flipTopOpening: 20.5 }), [0, 0], opening(13.8))).toEqual({ error: { code: "flipTopTooLarge", opening: 20 } });
      expect(flipTopPlan(options({ flipTopOpening: 30 }), [0, 0], opening(13.8))).toEqual({ error: { code: "flipTopTooLarge", opening: 20 } });
      // Not even 4 mm in an opening 4.8 round, or one that is not round the cap's axis.
      expect(flipTopPlan(options({ flipTopOpening: 4 }), [0, 0], opening(4.8))).toEqual({ error: { code: "flipTopNoRoom" } });
      expect(flipTopPlan(options(), [0, 0], opening(10, 30))).toEqual({ error: { code: "flipTopNoRoom" } });
      expect(flipTopPlan(options(), [0, 0], [])).toEqual({ error: { code: "flipTopNoRoom" } });
    });

    it("refuses a plate thinner than the flap and its hinge need, saying how thick", () => {
      expect(flipTopPlan(options({ thickness: 1.7 }), [0, 0], opening())).toEqual({ error: { code: "flipTopThin", thickness: 1.8 } });
      expect("error" in flipTopPlan(options({ thickness: 1.8 }), [0, 0], opening())).toBe(false);
      expect(flipTopPlan(options({ gap: 0.6 }), [0, 0], opening())).toEqual({ error: { code: "flipTopThin", thickness: 2.3 } });
    });
  });
});

describe("a screw-in lid (Discussion #1432)", () => {
  it("is a seventh kind of lid, beside the screw lid, taken in any case, and the push-in lid stays the one to begin with", () => {
    expect(LID_TYPES.indexOf("screwIn")).toBe(LID_TYPES.indexOf("screw") + 1);
    for (const type of ["screwIn", " ScrewIn ", "screwin", "SCREWIN"]) expect(normalizeLidOptions({ type }).type, type).toBe("screwIn");
    expect(normalizeLidOptions({ type: "screw in" }).type).toBe("plug");
    expect(normalizeLidOptions().type).toBe("plug");
  });

  it("takes no magnets, hinge, click bumps or handle", () => {
    const screwIn = normalizeLidOptions({ type: "screwIn" });
    expect(lidTakesExtras(screwIn)).toBe(false);
    expect(lidClickBumpsFit(screwIn)).toBe(false);
    expect(lidHandleFits(screwIn)).toBe(false);
  });
});

describe("where a screw-in lid's thread and plug go (Discussion #1432)", () => {
  /**
   * The body seen from above at a height, as lidForSolid slices it: a pot 60 across with a 2 mm wall and a floor 2 mm
   * thick, 50 high (the rim sliced at 49.7), or what `shape` gives at that height.
   */
  const pot = (shape?: (z: number) => { outer: [number, number][][]; opening: [number, number][][] }) => (z: number) => {
    const level = shape ? shape(z) : { outer: [polygonRound(30)], opening: z > 2 ? [polygonRound(28, 192, 0, 0, true)] : [] };
    return { outline: level.outer, opening: level.opening };
  };
  const options = (patch: Record<string, unknown> = {}) => normalizeLidOptions({ type: "screwIn", ...patch });

  it("puts the thread inside the opening, the pitch times the turns down, and makes the plug the opening less the gap, a ring with the lid's wall", () => {
    const plan = screwInPlan(pot(), options(), 50, 0, 49.7);
    if ("error" in plan) throw new Error(plan.error.code);
    expect(plan.centre[0]).toBeCloseTo(0, 9);
    // The plate is as large as the body; the opening's face 28 mm from the axis, the nearest at the middle of a side.
    expect(plan.radius).toBeCloseTo(30, 9);
    expect(plan.openingFar).toBeCloseTo(28, 9);
    expect(plan.opening).toBeCloseTo(28 * Math.cos(Math.PI / 192), 9);
    expect(plan.from).toBe(44);
    // The screw lid's thread: 3 mm pitch, 0.9 mm deep, the crest 0.6 mm wide.
    expect([plan.pitch, plan.depth, plan.crest]).toEqual([3, expect.closeTo(0.9, 12), expect.closeTo(0.6, 12)]);
    // 0.8 mm into the 2 mm wall; the plug the gap inside the opening, its hole 1.6 mm inside the thread's root.
    expect(plan.reach).toBe(0.8);
    expect(plan.plugRadius).toBeCloseTo(plan.opening - 0.2, 9);
    expect(plan.holeRadius).toBeCloseTo(plan.opening - 0.2 - 0.9 - 1.6, 9);
    // A thinner wall: the thread reaches half of it in.
    const thin = screwInPlan(pot(() => ({ outer: [polygonRound(30)], opening: [polygonRound(29.1, 192, 0, 0, true)] })), options(), 50, 0, 49.7);
    if ("error" in thin) throw new Error(thin.error.code);
    expect(thin.reach).toBeCloseTo((30 * Math.cos(Math.PI / 192) - 29.1) / 2, 9);
  });

  it("keeps 0.8 mm of wall in the plug however thin the lid's wall is, and leaves a plug solid where a hole would be under 4 mm across", () => {
    const thinWall = screwInPlan(pot(), options({ wall: 0.4 }), 50, 0, 49.7);
    if ("error" in thinWall) throw new Error(thinWall.error.code);
    expect(thinWall.plugRadius - thinWall.depth - thinWall.holeRadius).toBeCloseTo(SCREW_MIN_WALL, 9);
    // A tube 12 across with a 1 mm wall: a plug 8.8 across at its thread's root, a hole of 5.6 inside 1.6 mm of wall.
    const tube = (radius: number) => pot(() => ({ outer: [polygonRound(radius + 1)], opening: [polygonRound(radius, 192, 0, 0, true)] }));
    const hollow = screwInPlan(tube(5), options(), 50, 0, 49.7);
    if ("error" in hollow) throw new Error(hollow.error.code);
    expect(2 * hollow.holeRadius).toBeCloseTo(2 * (5 * Math.cos(Math.PI / 192) - 0.2 - 0.9 - 1.6), 9);
    // 10 across: the hole would be 3.6, so the plug is solid; with a thinner wall in it, 5.2.
    const solid = screwInPlan(tube(4), options(), 50, 0, 49.7);
    if ("error" in solid) throw new Error(solid.error.code);
    expect(solid.holeRadius).toBe(0);
    const ring = screwInPlan(tube(4), options({ wall: 0.8 }), 50, 0, 49.7);
    if ("error" in ring) throw new Error(ring.error.code);
    expect(2 * ring.holeRadius).toBeCloseTo(2 * (4 * Math.cos(Math.PI / 192) - 0.2 - 0.9 - 0.8), 9);
  });

  it("refuses a body that is not round, an opening that is not round or not round the same middle, or one that narrows down the thread", () => {
    const box = pot(() => ({ outer: [[[-30, -30], [30, -30], [30, 30], [-30, 30]]], opening: [[[-28, -28], [-28, 28], [28, 28], [28, -28]]] }));
    expect(screwInPlan(box, options(), 50, 0, 49.7)).toEqual({ error: { code: "screwInNotRound" } });
    const squareOpening = pot(() => ({ outer: [polygonRound(30)], opening: [[[-18, -18], [-18, 18], [18, 18], [18, -18]]] }));
    expect(screwInPlan(squareOpening, options(), 50, 0, 49.7)).toEqual({ error: { code: "screwInNotRound" } });
    const offMiddle = pot(() => ({ outer: [polygonRound(30)], opening: [polygonRound(25, 192, 1, 0, true)] }));
    expect(screwInPlan(offMiddle, options(), 50, 0, 49.7)).toEqual({ error: { code: "screwInNotRound" } });
    const twoOpenings = pot(() => ({ outer: [polygonRound(30)], opening: [polygonRound(8, 96, -12, 0, true), polygonRound(8, 96, 12, 0, true)] }));
    expect(screwInPlan(twoOpenings, options(), 50, 0, 49.7)).toEqual({ error: { code: "screwInNotRound" } });
    // A cone-shaped pocket: half a millimetre narrower at the bottom of the thread, 6 mm down.
    const narrowing = pot((z) => ({ outer: [polygonRound(30)], opening: [polygonRound(28 - (50 - z) / 12, 192, 0, 0, true)] }));
    expect(screwInPlan(narrowing, options(), 50, 0, 49.7)).toEqual({ error: { code: "screwInNotRound" } });
  });

  it("refuses a wall under 0.8 mm, a body too low, an opening not deep enough or too small, and a gap too large for the thread", () => {
    const thin = pot(() => ({ outer: [polygonRound(30)], opening: [polygonRound(29.4, 192, 0, 0, true)] }));
    expect(screwInPlan(thin, options(), 50, 0, 49.7)).toEqual({ error: { code: "screwThinWall" } });
    // Two turns of 3 mm and 0.4 mm below them: 6.4 mm.
    expect(screwInPlan(pot(), options(), 50, 43.7, 49.7)).toEqual({ error: { code: "screwTooLow", height: 6 } });
    // The opening's floor 44 mm up, where the plug's end would lie on it; at 43.5 the plug keeps half a millimetre above it.
    const floor = (thickness: number) => pot((z) => ({ outer: [polygonRound(30)], opening: z > thickness ? [polygonRound(28, 192, 0, 0, true)] : [] }));
    expect(screwInPlan(floor(44), options(), 50, 0, 49.7)).toEqual({ error: { code: "screwInShallow", height: 6 } });
    expect(screwInPlan(floor(43.7), options(), 50, 0, 49.7)).toEqual({ error: { code: "screwInShallow", height: 6 } });
    expect("error" in screwInPlan(floor(43.5), options(), 50, 0, 49.7)).toBe(false);
    // A floor above where the thread starts.
    expect(screwInPlan(floor(20), options({ threadTurns: 8, threadPitch: 4 }), 50, 0, 49.7)).toEqual({ error: { code: "screwInShallow", height: 32 } });
    // An opening 5.6 mm across: a plug 4 mm across at its thread's root needs 6.2 with a 3 mm pitch and a 0.2 mm gap,
    // 5.6 with a 2 mm pitch (0.6 mm deep), and 6.0 with a 0.4 mm gap.
    const small = pot(() => ({ outer: [polygonRound(4)], opening: [polygonRound(2.8, 192, 0, 0, true)] }));
    expect(screwInPlan(small, options(), 50, 0, 49.7)).toEqual({ error: { code: "screwInSmallOpening", diameter: 6.2 } });
    const wider = pot(() => ({ outer: [polygonRound(4)], opening: [polygonRound(2.81, 192, 0, 0, true)] }));
    expect("error" in screwInPlan(wider, options({ threadPitch: 2 }), 50, 0, 49.7)).toBe(false);
    expect(screwInPlan(small, options({ gap: 0.4, threadPitch: 4 }), 50, 0, 49.7)).toEqual({ error: { code: "screwInSmallOpening", diameter: 7.2 } });
    // At most half the depth, as for a screw lid.
    expect("error" in screwInPlan(pot(), options({ gap: 0.45 }), 50, 0, 49.7)).toBe(false);
    expect(screwInPlan(pot(), options({ gap: 0.5 }), 50, 0, 49.7)).toEqual({ error: { code: "screwGapDeep", gap: 0.45 } });
  });
});
