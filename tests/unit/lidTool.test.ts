import { describe, expect, it } from "vitest";
import { LID_DEFAULTS, MAX_LID_GAP, MAX_LID_THICKNESS, MAX_MAGNET_GAP, MIN_LID_WALL, MIN_MAGNET_DIAMETER, lidThicknessForMagnets, magnetPlaces, magnetPocketDepth, normalizeLidOptions } from "@/lib/lidTool";

describe("lid options (#1009)", () => {
  it("starts from a push-in lid with a normal fit", () => {
    expect(normalizeLidOptions()).toEqual(LID_DEFAULTS);
    expect(LID_DEFAULTS).toEqual({ type: "plug", thickness: 2, gap: 0.2, depth: 4, wall: 1.6, magnets: false, magnetDiameter: 6, magnetHeight: 2, magnetGap: 0.1 });
  });

  it("takes the kind in any case and keeps the default for an unknown one", () => {
    expect(normalizeLidOptions({ type: " CAP " }).type).toBe("cap");
    expect(normalizeLidOptions({ type: "flat" }).type).toBe("flat");
    expect(normalizeLidOptions({ type: "Both" }).type).toBe("both");
    expect(normalizeLidOptions({ type: "thread" }).type).toBe("plug");
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
