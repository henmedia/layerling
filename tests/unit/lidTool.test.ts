import { describe, expect, it } from "vitest";
import { HINGE_PIN_GRIP, LID_DEFAULTS, LID_TYPES, MAX_CLICK_BUMP_HEIGHT, MAX_HINGE_PIN, MAX_HINGE_PIN_PLAY, MAX_LID_GAP, MAX_LID_THICKNESS, MAX_LID_THREAD_PITCH, MAX_LID_THREAD_TURNS, MAX_MAGNET_GAP, MIN_CLICK_BUMP_HEIGHT, MIN_HINGE_PIN, MIN_HINGE_PIN_PLAY, MIN_LID_THREAD_PITCH, MIN_LID_THREAD_TURNS, MIN_LID_WALL, MIN_MAGNET_DIAMETER, SCREW_MIN_WALL, clickBumpPlaces, cornerKnucklePlan, endPlugPlan, hingeKnuckleRadius, hingePinHoles, lidClickBumpsFit, lidHandleFits, lidTakesExtras, lidThicknessForMagnets, lidThread, magnetPlaces, magnetPocketDepth, normalizeLidOptions, roundOutline, screwPlan } from "@/lib/lidTool";
import { threadSize } from "@/lib/vase/vase-geometry.mjs";

describe("lid options (#1009)", () => {
  it("starts from a push-in lid with a normal fit", () => {
    expect(normalizeLidOptions()).toEqual(LID_DEFAULTS);
    expect(LID_DEFAULTS).toEqual({ type: "plug", thickness: 2, gap: 0.2, depth: 4, wall: 1.6, magnets: false, magnetDiameter: 6, magnetHeight: 2, magnetGap: 0.1, hinge: false, hingePin: 1.75, hingeGap: 0.3, hingePinPlay: 0.2, hingeKnuckles: 0, hingePrintPin: false, hingeSide: "back", hingeTeardrop: true, hingeStyle: "outside", hingeEndPlugs: false, clickBumps: false, clickBumpHeight: 0.4, handle: "none", threadPitch: 3, threadTurns: 2 });
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
      for (const hingePinPlay of [MIN_HINGE_PIN_PLAY, 0.2, MAX_HINGE_PIN_PLAY]) {
        const radius = hingeKnuckleRadius({ hingePin, hingePinPlay });
        const { lidHole, bodyHole } = hingePinHoles({ hingePin, hingePinPlay });
        expect(radius - lidHole).toBeCloseTo(1.6, 9);
        expect(radius - bodyHole).toBeGreaterThanOrEqual(1.6 - 1e-9);
        expect(bodyHole).toBeLessThanOrEqual(lidHole + 1e-9);
      }
    }
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
    expect(LID_TYPES).toEqual(["plug", "cap", "both", "flat", "screw"]);
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
