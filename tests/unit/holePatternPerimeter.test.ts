import manifoldModule from "manifold-3d";
import { beforeAll, describe, expect, it } from "vitest";
import { holePatternCenters, normalizeHolePattern, rectangleOutline, type FaceOutline, type HolePatternSettings, type Point2 } from "@/lib/holePattern";
import { HOLE_OVERSHOOT, holePatternScrewPatch, holePatternScrewSize, holePatternShapes, type PerforableFace } from "@/lib/holePatternShapes";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";

/*
 * Holes round the edge (#1232): a ring of holes along the outer edge of a face, a hole on every corner and the
 * sides shared out evenly, or evenly from a start point on a round face; by spacing or by number; and a round hole
 * can take a counterbore or countersink for the screw's head.
 */

beforeAll(async () => {
  const runtime = await manifoldModule();
  runtime.setup();
  rememberManifoldRuntime(runtime);
});

const ring = (patch: Partial<HolePatternSettings>) => normalizeHolePattern({ form: "round", size: 4, margin: 3, arrangement: "perimeter", depth: null, ...patch });
const circleOutline = (radius: number, sides = 96): FaceOutline => ({
  loops: [Array.from({ length: sides }, (_, index) => ({ u: Math.cos((index / sides) * Math.PI * 2) * radius, v: Math.sin((index / sides) * Math.PI * 2) * radius }))],
});
const near = (a: Point2, b: Point2) => Math.hypot(a.u - b.u, a.v - b.v) < 0.01;
const gaps = (centers: Point2[]) => centers.map((center, index) => {
  const next = centers[(index + 1) % centers.length];
  return Math.hypot(next.u - center.u, next.v - center.v);
});

describe("holes round the edge of a face", () => {
  it("puts a hole on every corner of a plate and shares each side out evenly", () => {
    // 200 x 120 plate, holes 4 mm with 3 mm margin: the ring's line is 5 mm in, 190 x 110.
    const { centers } = holePatternCenters(rectangleOutline(0, 0, 200, 120), ring({ spacing: 60 }));
    for (const corner of [{ u: 5, v: 5 }, { u: 195, v: 5 }, { u: 195, v: 115 }, { u: 5, v: 115 }]) {
      expect(centers.some((center) => near(center, corner))).toBe(true);
    }
    // 190 / 60 rounds to 3 pieces along, 110 / 60 to 2 across: 2 * (3 + 2) holes.
    expect(centers).toHaveLength(10);
    expect(centers.filter((center) => Math.abs(center.v - 115) < 0.01).map((center) => center.u).sort((a, b) => a - b))
      .toEqual([5, 5 + 190 / 3, 5 + 380 / 3, 195].map((value) => expect.closeTo(value, 4)));
  });

  it("starts the ring at the top left corner", () => {
    const { centers } = holePatternCenters(rectangleOutline(0, 0, 200, 120), ring({ spacing: 60 }));
    expect(near(centers[0], { u: 5, v: 115 })).toBe(true);
  });

  it("puts one on each corner of a hexagon", () => {
    const hexagon: FaceOutline = { loops: [Array.from({ length: 6 }, (_, index) => ({ u: Math.sin((index / 6) * Math.PI * 2) * 100, v: Math.cos((index / 6) * Math.PI * 2) * 100 }))] };
    const { centers } = holePatternCenters(hexagon, ring({ spacing: 1000 }));
    expect(centers).toHaveLength(6);
  });

  it("goes round a circle evenly from the top, or from a start point along the edge", () => {
    const top = holePatternCenters(circleOutline(50), ring({ perimeterBy: "count", perimeterCount: 8 })).centers;
    expect(top).toHaveLength(8);
    expect(top[0].u).toBeCloseTo(0, 0);
    expect(top[0].v).toBeCloseTo(45, 0);
    const spread = gaps(top);
    expect(Math.max(...spread) - Math.min(...spread)).toBeLessThan(0.05);
    // A quarter of the way round moves the first hole a quarter turn.
    const quarter = (2 * Math.PI * 45) / 4;
    const turned = holePatternCenters(circleOutline(50), ring({ perimeterBy: "count", perimeterCount: 8, perimeterStart: quarter })).centers;
    expect(Math.hypot(turned[0].u, turned[0].v)).toBeCloseTo(45, 0);
    expect(Math.abs(turned[0].v)).toBeLessThan(1);
  });

  it("shares a number of holes out over the sides of a plate, a hole still on every corner", () => {
    const { centers } = holePatternCenters(rectangleOutline(0, 0, 200, 120), ring({ perimeterBy: "count", perimeterCount: 12 }));
    expect(centers).toHaveLength(12);
    expect(centers.some((center) => near(center, { u: 195, v: 5 }))).toBe(true);
  });

  it("without corner holes goes evenly round the whole edge from the start point", () => {
    const { centers } = holePatternCenters(rectangleOutline(0, 0, 200, 120), ring({ perimeterBy: "count", perimeterCount: 6, perimeterCorners: false, perimeterStart: 10 }));
    expect(centers).toHaveLength(6);
    // The line is 190 x 110, 600 mm round: from the top left corner the first hole sits 10 mm down the left side,
    // the next 100 mm further along, past the bottom left corner.
    expect(near(centers[0], { u: 5, v: 105 })).toBe(true);
    expect(near(centers[1], { u: 5, v: 5 })).toBe(true);
    expect(near(centers[2], { u: 105, v: 5 })).toBe(true);
  });

  it("never puts more holes on the edge than fit without overlapping", () => {
    const { centers } = holePatternCenters(rectangleOutline(0, 0, 40, 40), ring({ perimeterBy: "count", perimeterCount: 200 }));
    expect(centers.length).toBeGreaterThan(4);
    expect(Math.min(...gaps(centers))).toBeGreaterThanOrEqual(4.4 - 1e-6);
  });

  it("keeps clear of an opening in the face", () => {
    const outline = rectangleOutline(0, 0, 100, 100);
    outline.loops.push([{ u: 0, v: 40 }, { u: 10, v: 40 }, { u: 10, v: 60 }, { u: 0, v: 60 }].map((point) => ({ ...point, u: point.u + 2 })));
    const { centers } = holePatternCenters(outline, ring({ perimeterBy: "count", perimeterCount: 40 }));
    expect(centers.some((center) => center.u < 20 && center.v > 35 && center.v < 65)).toBe(false);
  });

  it("gives a hole with a head the head's room on the face", () => {
    const plain = holePatternCenters(rectangleOutline(0, 0, 200, 120), ring({ spacing: 60 })).centers;
    const head = holePatternCenters(rectangleOutline(0, 0, 200, 120), ring({ spacing: 60, holeType: "counterbore", headSize: 8 })).centers;
    expect(plain.some((center) => near(center, { u: 5, v: 5 }))).toBe(true);
    // Half the 8 mm head plus the margin.
    expect(head.some((center) => near(center, { u: 7, v: 7 }))).toBe(true);
  });
});

describe("holes with a counterbore or countersink", () => {
  const face: PerforableFace = {
    workplane: { origin: { x: 0, y: 10, z: 0 }, normal: { x: 0, y: 1, z: 0 }, xAxis: { x: 1, y: 0, z: 0 }, zAxis: { x: 0, y: 0, z: 1 } } as PerforableFace["workplane"],
    outline: rectangleOutline(-50, -50, 50, 50),
    thickness: 10,
  };

  it("makes counterbore shapes with the shaft, the head and its depth as set", () => {
    const { holes } = holePatternShapes(face, ring({ perimeterBy: "count", perimeterCount: 8, size: 3.4, holeType: "counterbore", headSize: 6.5, headDepth: 3.4 }), "Hole");
    expect(holes).toHaveLength(8);
    for (const hole of holes) {
      expect(hole.kind).toBe("counterbore");
      expect(hole.hole).toBe(true);
      expect(hole.width).toBeCloseTo(6.5);
      expect(hole.screwHoleShaft).toBeCloseTo(3.4);
      expect(hole.screwHoleHeadDepth).toBeCloseTo(3.4 + HOLE_OVERSHOOT);
    }
  });

  it("makes countersinks that open to the head's size at the face", () => {
    const { holes } = holePatternShapes(face, ring({ perimeterBy: "count", perimeterCount: 4, size: 3.4, holeType: "countersink", headSize: 6.3 }), "Hole");
    expect(holes[0].kind).toBe("countersink");
    expect(holes[0].width).toBeCloseTo(6.3 + 2 * HOLE_OVERSHOOT);
    expect(holes[0].screwHoleAngle).toBe(90);
  });

  it("makes inch countersinks at 82 degrees and knows their size again (Discussion #1534)", () => {
    const patch = holePatternScrewPatch("countersink", "#8");
    expect(patch).toEqual({ size: 4.7, headSize: 8.43, headAngle: 82 });
    const settings = ring({ perimeterBy: "count", perimeterCount: 4, holeType: "countersink", ...patch });
    expect(settings.headAngle).toBe(82);
    expect(holePatternScrewSize(settings)).toBe("#8");
    const { holes } = holePatternShapes(face, settings, "Hole");
    expect(holes[0].screwHoleAngle).toBe(82);
    // The cone opens at 41 degrees to each side, so above the face it widens by tan(41) per millimetre.
    expect(holes[0].width).toBeCloseTo(8.43 + 2 * HOLE_OVERSHOOT * Math.tan((41 * Math.PI) / 180), 6);
    // A metric size puts the 90 degrees back, and the setting drops out again.
    const metric = ring({ ...settings, ...holePatternScrewPatch("countersink", "M4") });
    expect(metric.headAngle).toBeUndefined();
    expect(holePatternScrewSize(metric)).toBe("M4");
  });

  it("keeps a plain hole for every other form", () => {
    const settings = normalizeHolePattern({ form: "square", holeType: "countersink", arrangement: "grid" });
    const { holes } = holePatternShapes(face, settings, "Hole");
    expect(holes.length).toBeGreaterThan(0);
    expect(holes.every((hole) => hole.kind === "box")).toBe(true);
  });
});
