import manifoldModule, { type ManifoldToplevel } from "manifold-3d";
import { beforeAll, describe, expect, it } from "vitest";
import { COOKIE_CUTTER_DEFAULTS, MAX_COOKIE_CUTTER_POINTS, cookieCutterBridges, cookieCutterProfiles, normalizeCookieCutterOptions, outlineFromCurves, outlineFromLoops, sampledCurveLoop, unitedFootprint } from "@/lib/cookieCutter";
import type { SketchProfile } from "@/types/layerling";

const square: SketchProfile = {
  points: [[-10, -10], [10, -10], [10, 10], [-10, 10]].map(([x, z], index) => ({ id: `p${index}`, x, z, mode: "corner" as const })),
  segments: [0, 1, 2, 3].map((index) => ({ id: `s${index}`, startId: `p${index}`, endId: `p${(index + 1) % 4}`, kind: "line" as const })),
  // What a cutter drops from its source: a fill mode of its own and the key ring.
  stroke: { width: 3, align: "inside", join: "miter", cap: "flat" },
  keyring: { x: 0, z: 0, diameter: 4 } as SketchProfile["keyring"],
};

describe("cookie cutter", () => {
  it("builds the wall and the rim as lines outside the same outline, the rim round its silhouette", () => {
    const { wall, rim, inner } = cookieCutterProfiles(square, { ...COOKIE_CUTTER_DEFAULTS, mirror: false });
    // Both go round the outside only; the holes' walls are a sketch of their own (#982), and a square has none.
    expect(wall.silhouette).toBe(true);
    expect(rim.silhouette).toBe(true);
    expect(inner).toBeNull();
    for (const profile of [wall, rim]) {
      expect(profile.stroke?.align).toBe("outside");
      expect(profile.points).toEqual(square.points.map((point) => ({ ...point })));
      expect(profile.segments).toEqual(square.segments.map((segment) => ({ ...segment })));
      expect(profile.keyring).toBeUndefined();
    }
    expect(wall.stroke?.width).toBeCloseTo(COOKIE_CUTTER_DEFAULTS.wall, 9);
    // The rim's line also covers the wall's, so the wall stands on it.
    expect(rim.stroke?.width).toBeCloseTo(COOKIE_CUTTER_DEFAULTS.wall + COOKIE_CUTTER_DEFAULTS.rim, 9);
    // Only the wall cuts: its top runs in to the edge, the rim stays flat.
    expect(wall.stroke?.edge).toBeCloseTo(COOKIE_CUTTER_DEFAULTS.edge, 9);
    expect(rim.stroke?.edge).toBeUndefined();
  });

  it("mirrors the outline left to right by default, the curves' handles with their points (#982)", () => {
    const letter: SketchProfile = {
      points: [
        { id: "a", x: 2, z: -5, mode: "corner" },
        { id: "b", x: 9, z: 0, mode: "smooth", handleIn: { x: 9, z: -3 }, handleOut: { x: 9, z: 3 } },
        { id: "c", x: 2, z: 5, mode: "corner" },
      ],
      segments: [
        { id: "s0", startId: "a", endId: "b", kind: "bezier" },
        { id: "s1", startId: "b", endId: "c", kind: "bezier" },
        { id: "s2", startId: "c", endId: "a", kind: "line" },
      ],
    };
    const { wall, rim } = cookieCutterProfiles(letter, COOKIE_CUTTER_DEFAULTS);
    for (const profile of [wall, rim]) {
      expect(profile.points.map((point) => [point.x, point.z])).toEqual([[-2, -5], [-9, 0], [-2, 5]]);
      expect(profile.points[1].handleIn).toEqual({ x: -9, z: -3 });
      expect(profile.points[1].handleOut).toEqual({ x: -9, z: 3 });
      expect(profile.segments).toEqual(letter.segments);
    }
    expect(cookieCutterProfiles(letter, { ...COOKIE_CUTTER_DEFAULTS, mirror: false }).wall.points.map((point) => point.x)).toEqual([2, 9, 2]);
  });

  it("gives the wall a flat top for an edge of 0, or one as wide as the wall", () => {
    expect(cookieCutterProfiles(square, normalizeCookieCutterOptions({ edge: 0 })).wall.stroke?.edge).toBeUndefined();
    expect(normalizeCookieCutterOptions({ wall: 1, edge: 1.5 }).edge).toBe(0);
    expect(normalizeCookieCutterOptions({ wall: 2, edge: 0.6 }).edge).toBe(0.6);
  });

  it("leaves the sketch it is made from as it was", () => {
    const before = JSON.stringify(square);
    cookieCutterProfiles(square, COOKIE_CUTTER_DEFAULTS);
    expect(JSON.stringify(square)).toBe(before);
  });

  it("takes the options as given within their limits, and the nearest allowed value outside", () => {
    expect(normalizeCookieCutterOptions()).toEqual(COOKIE_CUTTER_DEFAULTS);
    const given = { wall: 2, height: 20, rim: 6, rimHeight: 3, edge: 0.8, mirror: false, inner: false, imprint: 5, bridgeCount: 3, bridge: 3, bridgeHeight: 4, plate: 1.5, fillet: 2 };
    expect(normalizeCookieCutterOptions(given)).toEqual(given);
    expect(normalizeCookieCutterOptions({ mirror: "no", inner: "no" })).toMatchObject({ mirror: true, inner: true });
    expect(normalizeCookieCutterOptions({ height: 3, bridgeHeight: 10 }).bridgeHeight).toBe(3);
    // Whole bridges only, and inner walls no lower than the bridges holding them.
    expect(normalizeCookieCutterOptions({ bridgeCount: 2.6 }).bridgeCount).toBe(3);
    expect(normalizeCookieCutterOptions({ bridgeCount: 0 }).bridgeCount).toBe(1);
    expect(normalizeCookieCutterOptions({ height: 15, bridgeHeight: 3, imprint: 40 }).imprint).toBe(12);
    expect(normalizeCookieCutterOptions({ wall: 0, height: 5000, rim: -1 })).toMatchObject({ wall: 0.4, height: 100, rim: 0.5 });
    expect(normalizeCookieCutterOptions({ wall: "abc", height: "", rim: null })).toEqual(COOKIE_CUTTER_DEFAULTS);
    expect(normalizeCookieCutterOptions({ wall: "1.5" }).wall).toBe(1.5);
  });

  it("keeps the rim no higher than the cutter", () => {
    expect(normalizeCookieCutterOptions({ height: 3, rimHeight: 10 }).rimHeight).toBe(3);
  });
});

describe("outline of what a body stands on", () => {
  const ring = (cx: number, cv: number, half: number) => ({
    closed: true,
    points: [[-half, -half], [half, -half], [half, half], [-half, half]].map(([u, v]) => ({ u: cx + u, v: cv + v })),
  });

  it("is a sketch round the middle of the box, and that middle in the world", () => {
    const outline = outlineFromLoops([ring(30, -12, 10)]);
    expect(outline?.x).toBeCloseTo(30, 9);
    expect(outline?.z).toBeCloseTo(-12, 9);
    expect(outline?.profile.points).toHaveLength(4);
    expect(outline?.profile.segments).toHaveLength(4);
    expect(Math.min(...outline!.profile.points.map((point) => point.x))).toBeCloseTo(-10, 9);
    expect(Math.max(...outline!.profile.points.map((point) => point.z))).toBeCloseTo(10, 9);
  });

  it("joins every outline as one sketch, ring after ring, and leaves open lines and specks out", () => {
    const outline = outlineFromLoops([ring(0, 0, 10), ring(0, 0, 4), { closed: false, points: [{ u: 0, v: 0 }, { u: 5, v: 5 }, { u: 9, v: 1 }] }, { closed: true, points: [{ u: 0, v: 0 }, { u: 0.01, v: 0 }, { u: 0, v: 0.01 }] }]);
    expect(outline?.profile.points).toHaveLength(8);
    expect(new Set(outline?.profile.points.map((point) => point.id)).size).toBe(8);
    // Each segment joins two points of the sketch.
    const ids = new Set(outline?.profile.points.map((point) => point.id));
    expect(outline?.profile.segments.every((segment) => ids.has(segment.startId) && ids.has(segment.endId))).toBe(true);
  });

  it("drops a point that lies on the one before, and the last one when it closes onto the first", () => {
    const outline = outlineFromLoops([{ closed: true, points: [{ u: 0, v: 0 }, { u: 0.01, v: 0 }, { u: 10, v: 0 }, { u: 10, v: 10 }, { u: 0, v: 10 }, { u: 0, v: 0.02 }] }]);
    expect(outline?.profile.points).toHaveLength(4);
  });

  it("is null without a closed outline and refuses one that is too large", () => {
    expect(outlineFromLoops([])).toBeNull();
    expect(outlineFromLoops([{ closed: false, points: [{ u: 0, v: 0 }, { u: 1, v: 0 }, { u: 1, v: 1 }] }])).toBeNull();
    const many = { closed: true, points: Array.from({ length: MAX_COOKIE_CUTTER_POINTS + 10 }, (_, index) => ({ u: Math.cos(index) * 50 + index, v: Math.sin(index) * 50 })) };
    expect(() => outlineFromLoops([many])).toThrow();
  });
});

describe("what several bodies stand on together (#982)", () => {
  let runtime: ManifoldToplevel;
  beforeAll(async () => {
    runtime = await manifoldModule();
    runtime.setup();
  });

  const square = (cu: number, cv: number, half: number, clockwise = false) => {
    const points = [[-half, -half], [half, -half], [half, half], [-half, half]].map(([u, v]) => ({ u: cu + u, v: cv + v }));
    return { closed: true, points: clockwise ? points.reverse() : points };
  };
  const area = (loop: { points: ReadonlyArray<{ u: number; v: number }> }) =>
    Math.abs(loop.points.reduce((sum, point, index, all) => {
      const next = all[(index + 1) % all.length];
      return sum + point.u * next.v - next.u * point.v;
    }, 0) / 2);

  it("joins two bodies that overlap into one outline round both", () => {
    // A box and a second box over its corner, as a box and a cylinder were in the report: one outline, not two crossing.
    const loops = unitedFootprint(runtime, [[square(0, 0, 10)], [square(15, 0, 10)]]);
    expect(loops).toHaveLength(1);
    expect(area(loops[0])).toBeCloseTo(20 * 35, 6);
  });

  it("keeps bodies apart that do not touch, and a hole inside a body, whichever way its outlines run", () => {
    const loops = unitedFootprint(runtime, [[square(0, 0, 10), square(0, 0, 4)], [square(40, 0, 5, true)]]);
    expect(loops).toHaveLength(3);
    expect(loops.map(area).sort((a, b) => a - b)).toEqual([expect.closeTo(64, 6), expect.closeTo(100, 6), expect.closeTo(400, 6)]);
  });

  it("leaves out open lines and gives nothing for nothing", () => {
    expect(unitedFootprint(runtime, [[{ closed: false, points: [{ u: 0, v: 0 }, { u: 5, v: 0 }, { u: 5, v: 5 }] }]])).toEqual([]);
    expect(unitedFootprint(runtime, [])).toEqual([]);
  });
});

describe("bridges that hold the inner walls (#982)", () => {
  /** Squares of `half` round (cx, cz), one outline each, as a sketch. */
  const squares = (...rings: Array<[number, number, number]>): SketchProfile => {
    const profile: SketchProfile = { points: [], segments: [] };
    rings.forEach(([cx, cz, half], ring) => {
      [[-half, -half], [half, -half], [half, half], [-half, half]].forEach(([x, z], index) => {
        profile.points.push({ id: `r${ring}-${index}`, x: cx + x, z: cz + z, mode: "corner" });
        profile.segments.push({ id: `t${ring}-${index}`, startId: `r${ring}-${index}`, endId: `r${ring}-${(index + 1) % 4}`, kind: "line" });
      });
    });
    return profile;
  };
  const corners = (profile: SketchProfile, bar: number) => profile.points.filter((point) => point.id.startsWith(`b${bar}-`));

  it("runs a bar from a hole to the outline round it, where they come closest, a wall past both ends", () => {
    // A frame 20 wide round a hole 8 wide sitting 4 off the middle: the hole comes closest to the right side, 2 mm away.
    const bridges = cookieCutterBridges(squares([0, 0, 10], [4, 0, 4]), 1.2, 2)!;
    expect(bridges.points).toHaveLength(4);
    expect(bridges.segments).toHaveLength(4);
    const bar = corners(bridges, 0);
    const xs = bar.map((point) => point.x);
    const zs = bar.map((point) => point.z);
    // From x = 8 - 1.2 into the hole's wall to x = 10 + 1.2 into the outer wall; 2 mm wide.
    expect(Math.min(...xs)).toBeCloseTo(6.8, 6);
    expect(Math.max(...xs)).toBeCloseTo(11.2, 6);
    expect(Math.max(...zs) - Math.min(...zs)).toBeCloseTo(2, 6);
  });

  it("holds a piece lying in another's hole to that hole, and gives nothing for an outline without anything inside", () => {
    // A frame with a hole, and a small square inside the hole: two bars, one for the hole and one for the piece.
    const bridges = cookieCutterBridges(squares([0, 0, 20], [0, 0, 12], [0, 0, 4]), 1.2, 2)!;
    expect(bridges.points).toHaveLength(8);
    expect(cookieCutterBridges(squares([0, 0, 10]), 1.2, 2)).toBeNull();
  });

  it("ends the bar of a piece in a hole on both outlines, so it does not reach into the piece or past the hole (#982)", () => {
    // The square of 4 sits in the hole of 12: both walls stand in the gap between x = 4 and x = 12, and so does the bar.
    const bridges = cookieCutterBridges(squares([0, 0, 20], [0, 0, 12], [2, 0, 4]), 1.2, 2)!;
    const bar = corners(bridges, 1);
    const xs = bar.map((point) => point.x);
    expect(Math.min(...xs)).toBeCloseTo(6, 6);
    expect(Math.max(...xs)).toBeCloseTo(12, 6);
  });

  it("spreads several bars round each hole, leaving out places far off (#982)", () => {
    // A hole of 8 in the middle of a frame of 20: 6 mm all round, so two bars hold it on opposite sides.
    const two = cookieCutterBridges(squares([0, 0, 10], [0, 0, 4]), 1.2, 2, 2)!;
    expect(two.points).toHaveLength(8);
    const middles = [0, 1].map((bar) => {
      const points = corners(two, bar);
      return { x: points.reduce((sum, point) => sum + point.x, 0) / 4, z: points.reduce((sum, point) => sum + point.z, 0) / 4 };
    });
    expect(Math.hypot(middles[0].x - middles[1].x, middles[0].z - middles[1].z)).toBeGreaterThan(10);
    // A hole 1 mm from the right side of a long frame and 50 mm from its left end: the far side gets no bar.
    const long = cookieCutterBridges(squares([0, 0, 60], [55, 0, 4]), 1.2, 2, 2)!;
    expect(long.points.every((point) => point.x > 40)).toBe(true);
  });

  /** Outlines given corner by corner, one ring each, as a sketch. */
  const rings = (...loops: Array<Array<[number, number]>>): SketchProfile => {
    const profile: SketchProfile = { points: [], segments: [] };
    loops.forEach((loop, ring) => loop.forEach(([x, z], index) => {
      profile.points.push({ id: `q${ring}-${index}`, x, z, mode: "corner" });
      profile.segments.push({ id: `u${ring}-${index}`, startId: `q${ring}-${index}`, endId: `q${ring}-${(index + 1) % loop.length}`, kind: "line" });
    }));
    return profile;
  };
  const middleOf = (profile: SketchProfile, bar: number) => {
    const points = corners(profile, bar);
    return { x: points.reduce((sum, point) => sum + point.x, 0) / 4, z: points.reduce((sum, point) => sum + point.z, 0) / 4 };
  };

  it("puts a bar in the middle of a side that runs along the outline, not where the side starts (avxmw, #982)", () => {
    // The hole's right side runs 2 mm from the frame's all the way along: the bar sits at its middle, z = 0.
    expect(middleOf(cookieCutterBridges(squares([0, 0, 10], [4, 0, 4]), 1.2, 2)!, 0).z).toBeCloseTo(0, 6);
  });

  it("holds a symmetrical piece symmetrically with two bars (avxmw, #982)", () => {
    // A slot 16 x 10 in a frame of 40: 12 mm to the left and to the right side, 15 mm up and down.
    const bridges = cookieCutterBridges(rings([[-20, -20], [20, -20], [20, 20], [-20, 20]], [[-8, -5], [8, -5], [8, 5], [-8, 5]]), 1.2, 4, 2)!;
    const [one, other] = [middleOf(bridges, 0), middleOf(bridges, 1)];
    expect(Math.abs(one.x + other.x)).toBeLessThan(0.6);
    expect(Math.abs(one.z)).toBeLessThan(0.6);
    expect(Math.abs(other.z)).toBeLessThan(0.6);
  });

  it("runs no bar across another piece, taking the next side it can reach clear (avxmw, #982)", () => {
    // Two pieces side by side near the frame's right side: the left one is not held through the right one but downwards.
    const bridges = cookieCutterBridges(squares([0, 0, 30], [17, 0, 2], [24, 0, 2]), 1.2, 2, 1)!;
    for (let bar = 0; corners(bridges, bar).length; bar += 1) {
      const points = corners(bridges, bar);
      const xs = points.map((point) => point.x);
      const zs = points.map((point) => point.z);
      // No bar overlaps the right piece, x 22 to 26 and z -2 to 2, other than the one that holds it.
      const holdsRight = Math.min(...xs) > 22;
      const overlaps = Math.max(...xs) > 22 && Math.min(...xs) < 26 && Math.max(...zs) > -2 && Math.min(...zs) < 2;
      expect(holdsRight || !overlaps).toBe(true);
    }
  });

  it("fills the silhouette as a plate instead of the bridges when asked (avxmw, #982)", () => {
    const framed = squares([0, 0, 20], [0, 0, 12], [0, 0, 4]);
    const plated = cookieCutterProfiles(framed, { ...COOKIE_CUTTER_DEFAULTS, plate: 1 });
    expect(plated.bridges).toBeNull();
    expect(plated.plate?.silhouette).toBe(true);
    expect(plated.plate?.stroke).toBeUndefined();
    expect(cookieCutterProfiles(framed, COOKIE_CUTTER_DEFAULTS).plate).toBeNull();
    // Too thin to hold is no plate, and the inner walls stay at least as high as the plate.
    expect(normalizeCookieCutterOptions({ plate: 0.2 }).plate).toBe(0);
    expect(normalizeCookieCutterOptions({ plate: 2, height: 15, imprint: 40 }).imprint).toBe(13);
  });

  it("builds the holes' walls as a sketch of their own, inside the holes, only with inner walls (#982)", () => {
    const framed = squares([0, 0, 20], [0, 0, 12], [0, 0, 4]);
    const profiles = cookieCutterProfiles(framed, { ...COOKIE_CUTTER_DEFAULTS, mirror: false });
    expect(profiles.bridges).not.toBeNull();
    // The frame's outside is the wall; the hole and the piece in it are the inner walls, a line inside them.
    expect(profiles.wall.silhouette).toBe(true);
    expect(profiles.inner?.points.map((point) => point.id)).toEqual(framed.points.slice(4).map((point) => point.id));
    expect(profiles.inner?.stroke).toMatchObject({ align: "inside", width: COOKIE_CUTTER_DEFAULTS.wall, edge: COOKIE_CUTTER_DEFAULTS.edge });
    expect(profiles.inner?.silhouette).toBeUndefined();
    const without = cookieCutterProfiles(framed, { ...COOKIE_CUTTER_DEFAULTS, inner: false });
    expect(without.inner).toBeNull();
    expect(without.bridges).toBeNull();
  });
});

describe("a text's own curves as the outline (#982)", () => {
  // A letter-like loop: a line, a quadratic curve and a cubic one back to the start, 20 mm wide, standing at x = 50.
  const loop = {
    x: 40,
    z: 0,
    segments: [
      { kind: "line" as const, x: 60, z: 0 },
      { kind: "bezier" as const, x: 60, z: 10, controls: [{ x: 66, z: 5 }] },
      { kind: "bezier" as const, x: 40, z: 0, controls: [{ x: 50, z: 14 }, { x: 40, z: 8 }] },
    ],
  };

  it("keeps the curves as curves, round the middle of their box, a quadratic one raised to the same cubic", () => {
    const outline = outlineFromCurves([loop])!;
    expect(outline.profile.points).toHaveLength(3);
    expect(outline.profile.segments.map((segment) => segment.kind)).toEqual(["line", "bezier", "bezier"]);
    // The last piece closes on the first point instead of laying a second one on it.
    expect(outline.profile.segments[2].endId).toBe(outline.profile.points[0].id);
    const [first, second, third] = outline.profile.points;
    // The quadratic control (66, 5) from (60, 0) to (60, 10) is the cubic (64, 3.33) and (64, 6.67), then moved by the middle.
    expect(second.handleOut!.x - third.x).toBeCloseTo(4, 6);
    expect(third.handleIn!.x - third.x).toBeCloseTo(4, 6);
    expect(first.handleIn).toEqual({ x: outline.profile.points[0].x, z: expect.closeTo(8 - outline.z, 4) });
    expect(outline.x).toBeGreaterThan(49);
  });

  it("samples the curves for the overlap test without repeating the start", () => {
    const sampled = sampledCurveLoop(loop);
    expect(sampled.closed).toBe(true);
    expect(sampled.points[0]).toEqual({ u: 40, v: 0 });
    expect(sampled.points).toHaveLength(1 + 1 + 8 + 8 - 1);
  });
});
