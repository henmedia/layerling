import manifoldModule, { type ManifoldToplevel } from "manifold-3d";
import { beforeAll, describe, expect, it } from "vitest";
import { orderedCadSketchPaths } from "@/lib/sketchCadProfile";
import { normalizeSketchStroke, sampledPath, strokeEdgeChamfer, strokedSketchProfile } from "@/lib/sketchStroke";
import type { SketchProfile, SketchStroke } from "@/types/layerling";

let runtime: ManifoldToplevel;

beforeAll(async () => {
  runtime = await manifoldModule();
  runtime.setup();
});

function polyline(points: Array<[number, number]>, closed: boolean, stroke?: Partial<SketchStroke>): SketchProfile {
  const ids = points.map((_, index) => `p${index}`);
  const segments = ids.slice(0, closed ? ids.length : ids.length - 1).map((id, index) => ({
    id: `s${index}`,
    startId: id,
    endId: ids[(index + 1) % ids.length],
    kind: "line" as const,
  }));
  return {
    points: points.map(([x, z], index) => ({ id: ids[index], x, z })),
    segments,
    ...(stroke ? { stroke: { width: 2, align: "center", join: "miter", cap: "flat", ...stroke } } : {}),
  };
}

function area(profile: SketchProfile | null) {
  if (!profile) return 0;
  const byId = new Map(profile.points.map((point) => [point.id, point]));
  // Every loop's segments in order; shoelace over each, holes come out negative.
  return profile.segments.reduce((sum, segment) => {
    const a = byId.get(segment.startId)!;
    const b = byId.get(segment.endId)!;
    return sum + (a.x * b.z - b.x * a.z) / 2;
  }, 0);
}

const square = (stroke: Partial<SketchStroke>) => polyline([[0, 0], [10, 0], [10, 10], [0, 10]], true, stroke);

describe("sketch stroke (#154)", () => {
  it("leaves a sketch without a stroke alone", () => {
    expect(strokedSketchProfile(runtime, polyline([[0, 0], [10, 0], [10, 10]], true))).toBeNull();
  });

  it("turns a closed outline into a frame inside, outside or centred on the line", () => {
    expect(Math.abs(area(strokedSketchProfile(runtime, square({ width: 1, align: "outside" }))))).toBeCloseTo(12 * 12 - 100, 6);
    expect(Math.abs(area(strokedSketchProfile(runtime, square({ width: 1, align: "inside" }))))).toBeCloseTo(100 - 8 * 8, 6);
    expect(Math.abs(area(strokedSketchProfile(runtime, square({ width: 2, align: "center" }))))).toBeCloseTo(12 * 12 - 8 * 8, 6);
  });

  it("narrows a filled outline by the width all round, and swells its hole (#558)", () => {
    expect(Math.abs(area(strokedSketchProfile(runtime, square({ width: 1, align: "shrink" }))))).toBeCloseTo(8 * 8, 6);
    // Narrower by more than half the outline leaves nothing.
    expect(strokedSketchProfile(runtime, square({ width: 6, align: "shrink" }))).toBeNull();
    expect(normalizeSketchStroke({ width: 1, align: "shrink", join: "miter", cap: "flat" })?.align).toBe("shrink");
  });

  it("gives an open line a width, with flat, square or round ends", () => {
    const line = (cap: SketchStroke["cap"]) => Math.abs(area(strokedSketchProfile(runtime, polyline([[0, 0], [10, 0]], false, { width: 2, cap }))));
    expect(line("flat")).toBeCloseTo(20, 6);
    expect(line("square")).toBeCloseTo(24, 6);
    expect(line("round")).toBeCloseTo(20 + Math.PI, 1);
  });

  it("fills the corner of a bent line as chosen", () => {
    const bent = (join: SketchStroke["join"]) => Math.abs(area(strokedSketchProfile(runtime, polyline([[0, 0], [10, 0], [10, 10]], false, { width: 2, join }))));
    // Two 10 x 2 bars overlap in a 1 x 1 square at the corner; the outer corner adds 1 (miter),
    // half of it (bevel) or a quarter circle (round).
    expect(bent("miter")).toBeCloseTo(40 - 1 + 1, 6);
    expect(bent("bevel")).toBeCloseTo(40 - 1 + 0.5, 6);
    expect(bent("round")).toBeCloseTo(40 - 1 + Math.PI / 4, 1);
  });

  it("'Wider' keeps the area and grows it by the width all round (#215)", () => {
    // A 10 x 10 square widened by 1 with sharp corners is a 12 x 12 square; with round corners the corners are quarter circles.
    expect(area(strokedSketchProfile(runtime, square({ width: 1, align: "grow", join: "miter" })))).toBeCloseTo(144, 4);
    expect(area(strokedSketchProfile(runtime, square({ width: 1, align: "grow", join: "round" })))).toBeCloseTo(100 + 40 + Math.PI, 1);
    // An open line widened is the same as a centred stroke of that width.
    const open = (align: SketchStroke["align"]) => Math.abs(area(strokedSketchProfile(runtime, polyline([[0, 0], [10, 0]], false, { width: 2, align }))));
    expect(open("grow")).toBeCloseTo(open("center"), 6);
  });

  it("keeps a stroke's settings within range", () => {
    expect(normalizeSketchStroke({ width: -1 })).toBeUndefined();
    expect(normalizeSketchStroke({ width: 0.2, align: "sideways" })).toEqual({ width: 0.2, align: "center", join: "miter", cap: "flat" });
  });
});

describe("a stroke for a revolve (#347)", () => {
  const wall = (stroke: Partial<SketchStroke> = {}) => polyline([[-20, 0], [-20, -10], [-8, -20]], false, { width: 2, ...stroke });
  const xs = (profile: SketchProfile | null) => (profile?.points ?? []).map((point) => point.x);

  it("keeps a wall left of the axis as it is", () => {
    const stroked = strokedSketchProfile(runtime, wall(), { clipToRevolveSide: true });
    expect(stroked).not.toBeNull();
    expect(Math.max(...xs(stroked))).toBeLessThanOrEqual(0);
    expect(Math.abs(area(stroked))).toBeCloseTo(Math.abs(area(strokedSketchProfile(runtime, wall()))), 6);
  });

  it("cuts a wall that reaches across the axis off at the axis", () => {
    const across = polyline([[-6, 0], [4, 0]], false, { width: 4 });
    const free = strokedSketchProfile(runtime, across);
    const clipped = strokedSketchProfile(runtime, across, { clipToRevolveSide: true });
    expect(Math.max(...xs(free))).toBeCloseTo(4, 6);
    expect(Math.max(...xs(clipped))).toBeLessThanOrEqual(1e-9);
    expect(Math.abs(area(clipped))).toBeCloseTo(6 * 4, 6);
  });

  it("leaves nothing when the whole line lies right of the axis", () => {
    expect(strokedSketchProfile(runtime, polyline([[5, 0], [15, 0]], false, { width: 2 }), { clipToRevolveSide: true })).toBeNull();
  });
});

/** A closed loop of `count` cubic curves round a circle of `radius` mm, as a traced drawing has them. */
function curvedLoop(count: number, radius: number): SketchProfile {
  const step = (2 * Math.PI) / count;
  const handle = (4 / 3) * Math.tan(step / 4) * radius;
  const points = Array.from({ length: count }, (_, index) => {
    const angle = index * step;
    return {
      id: `c${index}`,
      x: radius * Math.cos(angle),
      z: radius * Math.sin(angle),
      handleOut: { x: radius * Math.cos(angle) - handle * Math.sin(angle), z: radius * Math.sin(angle) + handle * Math.cos(angle) },
      handleIn: { x: radius * Math.cos(angle) + handle * Math.sin(angle), z: radius * Math.sin(angle) - handle * Math.cos(angle) },
    };
  });
  const segments = points.map((point, index) => ({ id: `cs${index}`, startId: point.id, endId: points[(index + 1) % count].id, kind: "bezier" as const }));
  return { points, segments };
}

describe("curves cut into straight pieces (#461)", () => {
  const loop = (profile: SketchProfile) => sampledPath(orderedCadSketchPaths(profile).find((path) => path.closed)!);

  it("cuts a long curve finely and a short one coarsely", () => {
    // 4 curves round 50 mm: a quarter is about 78 mm long and gets the most pieces; 600 of them are 0.5 mm long.
    expect(loop(curvedLoop(4, 50)).length).toBeGreaterThanOrEqual(4 * 28);
    expect(loop(curvedLoop(600, 50)).length).toBeLessThanOrEqual(600 * 5);
  });

  it("keeps every piece within 0.01 mm of the curve", () => {
    for (const [count, radius] of [[8, 20], [12, 30], [60, 40]] as const) {
      const profile = curvedLoop(count, radius);
      const polygon = loop(profile);
      const distanceToPolygon = (x: number, z: number) => Math.min(...polygon.map((a, index) => {
        const b = polygon[(index + 1) % polygon.length];
        const length2 = (b.x - a.x) ** 2 + (b.z - a.z) ** 2;
        const along = length2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - a.x) * (b.x - a.x) + (z - a.z) * (b.z - a.z)) / length2));
        return Math.hypot(x - (a.x + along * (b.x - a.x)), z - (a.z + along * (b.z - a.z)));
      }));
      let worst = 0;
      profile.segments.forEach((segment, index) => {
        const from = profile.points[index];
        const to = profile.points[(index + 1) % count];
        for (let step = 0; step <= 40; step += 1) {
          const t = step / 40;
          const u = 1 - t;
          worst = Math.max(worst, distanceToPolygon(
            u ** 3 * from.x + 3 * u ** 2 * t * from.handleOut!.x + 3 * u * t ** 2 * to.handleIn!.x + t ** 3 * to.x,
            u ** 3 * from.z + 3 * u ** 2 * t * from.handleOut!.z + 3 * u * t ** 2 * to.handleIn!.z + t ** 3 * to.z,
          ));
        }
        expect(segment.kind).toBe("bezier");
      });
      expect(worst).toBeLessThan(0.0101);
    }
  });

  it("makes far fewer edges for a traced drawing than the fixed 32 per curve did", () => {
    const stroked = strokedSketchProfile(runtime, { ...curvedLoop(568, 58), stroke: { width: 1, align: "inside", join: "round", cap: "round" } });
    expect(stroked).not.toBeNull();
    expect(stroked!.points.length).toBeLessThan((568 * 32) / 2);
  });
});

describe("a cutting edge on a wall (#982)", () => {
  const wall: SketchStroke = { width: 1.2, align: "outside", join: "round", cap: "flat", edge: 0.4 };

  it("keeps the edge through normalizing, and drops one that is no number above 0", () => {
    expect(normalizeSketchStroke(wall)?.edge).toBe(0.4);
    expect(normalizeSketchStroke({ ...wall, edge: 0 })?.edge).toBeUndefined();
    expect(normalizeSketchStroke({ ...wall, edge: "x" })).not.toHaveProperty("edge");
  });

  it("chamfers half of what the wall is wider than its edge from each side", () => {
    expect(strokeEdgeChamfer(wall, 15)).toBeCloseTo(0.4, 9);
    expect(strokeEdgeChamfer({ ...wall, align: "center", width: 2, edge: 1 }, 15)).toBeCloseTo(0.5, 9);
  });

  it("leaves the top flat without an edge, for an edge as wide as the wall, and for an area", () => {
    expect(strokeEdgeChamfer({ ...wall, edge: undefined }, 15)).toBe(0);
    expect(strokeEdgeChamfer({ ...wall, edge: 1.2 }, 15)).toBe(0);
    expect(strokeEdgeChamfer({ ...wall, align: "grow" }, 15)).toBe(0);
    expect(strokeEdgeChamfer(undefined, 15)).toBe(0);
  });

  it("never chamfers deeper than most of a low wall", () => {
    expect(strokeEdgeChamfer({ ...wall, width: 5, edge: 0.4 }, 1)).toBeCloseTo(0.9, 9);
  });
});
