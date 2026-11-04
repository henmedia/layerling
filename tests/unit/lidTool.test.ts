import { describe, expect, it } from "vitest";
import { LID_DEFAULTS, MAX_LID_GAP, MAX_LID_THICKNESS, MAX_MAGNET_GAP, MIN_LID_WALL, MIN_MAGNET_DIAMETER, clickBumpPlaces, lidClickBumpsFit, lidHandleFits, lidThicknessForMagnets, magnetPlaces, magnetPocketDepth, normalizeLidOptions } from "@/lib/lidTool";

describe("lid options (#1009)", () => {
  it("starts from a push-in lid with a normal fit", () => {
    expect(normalizeLidOptions()).toEqual(LID_DEFAULTS);
    expect(LID_DEFAULTS).toEqual({ type: "plug", thickness: 2, gap: 0.2, depth: 4, wall: 1.6, magnets: false, magnetDiameter: 6, magnetHeight: 2, magnetGap: 0.1, hinge: false, hingePin: 1.75, hingeGap: 0.3, hingePinPlay: 0.2, hingeKnuckles: 0, hingePrintPin: false, hingeSide: "back", hingeTeardrop: true, hingeStyle: "outside", clickBumps: false, handle: "none" });
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
