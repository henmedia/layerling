import { describe, expect, it } from "vitest";
import { circularArcCenter } from "@/lib/sketchCircularArc";
import { sketchPrimitiveGeometry } from "@/lib/sketchPrimitives";
import { movingSelectionCentre, outlineSideMiddles, selectionSnapTargets, sketchSnapPoints, snappedSelectionTarget } from "@/lib/sketchSnapPoints";
import type { SketchProfile } from "@/types/layerling";

const square: SketchProfile = {
  points: [{ id: "a", x: 0, z: 0 }, { id: "b", x: 40, z: 0 }, { id: "c", x: 40, z: 20 }],
  segments: [
    { id: "ab", startId: "a", endId: "b", kind: "line" },
    { id: "bc", startId: "b", endId: "c", kind: "line", construction: true },
  ],
};

describe("snapping to middles and centres (#624)", () => {
  it("lists the middle of every straight line, construction lines too", () => {
    expect(sketchSnapPoints(square)).toEqual([{ x: 20, z: 0 }, { x: 40, z: 10 }]);
  });

  it("leaves out the lines of a point that is dragged", () => {
    expect(sketchSnapPoints(square, "c")).toEqual([{ x: 20, z: 0 }]);
    expect(sketchSnapPoints(square, "b")).toEqual([]);
  });

  it("does not list a middle that is a point already", () => {
    const withMiddle: SketchProfile = { ...square, points: [...square.points, { id: "m", x: 20, z: 0 }] };
    expect(sketchSnapPoints(withMiddle)).toEqual([{ x: 40, z: 10 }]);
  });

  it("lists the centre of a circle once, not once per arc", () => {
    let count = 0;
    const circle = sketchPrimitiveGeometry("circle", { x: 12, z: -7 }, () => `id-${count++}`, undefined, undefined);
    const profile: SketchProfile = { points: circle.points, segments: circle.segments };
    const snaps = sketchSnapPoints(profile);
    const centres = snaps.filter((point) => Math.hypot(point.x - 12, point.z + 7) < 0.01);
    expect(centres.length).toBe(1);
  });

  it("takes the centre of a quarter circle arc", () => {
    const radius = 10;
    const k = (4 / 3) * Math.tan(Math.PI / 8) * radius;
    const centre = circularArcCenter({ x: radius, z: 0 }, { x: radius, z: k }, { x: k, z: radius }, { x: 0, z: radius });
    expect(centre!.x).toBeCloseTo(0, 3);
    expect(centre!.z).toBeCloseTo(0, 3);
  });

  it("gives the middles of the sides of an outline", () => {
    expect(outlineSideMiddles([{ x: 0, z: 0 }, { x: 10, z: 0 }, { x: 10, z: 4 }, { x: 0, z: 4 }])).toEqual([
      { x: 5, z: 0 }, { x: 10, z: 2 }, { x: 5, z: 4 }, { x: 0, z: 2 },
    ]);
  });
});

describe("snapping the middle of a moved shape (#1236)", () => {
  const withCircle = () => {
    let count = 0;
    const circle = sketchPrimitiveGeometry("circle", { x: 12, z: -7 }, () => `circle-${count++}`, undefined, undefined);
    const profile: SketchProfile = { points: [...square.points, ...circle.points], segments: [...square.segments, ...circle.segments] };
    return { profile, circle };
  };

  it("takes a circle's centre as the middle of what moves", () => {
    const { profile, circle } = withCircle();
    const centre = movingSelectionCentre(profile, circle.points)!;
    expect(centre.x).toBeCloseTo(12, 4);
    expect(centre.z).toBeCloseTo(-7, 4);
  });

  it("offers the ends, middles and crossings of the rest of the sketch, not the moved shape's own", () => {
    const { profile, circle } = withCircle();
    const targets = selectionSnapTargets(profile, new Set(circle.points.map((point) => point.id)));
    expect(targets).toEqual(expect.arrayContaining([{ x: 0, z: 0 }, { x: 40, z: 0 }, { x: 40, z: 20 }, { x: 20, z: 0 }, { x: 40, z: 10 }]));
    expect(targets.some((point) => Math.hypot(point.x - 12, point.z + 7) < 0.01)).toBe(false);
    expect(targets).toHaveLength(5);
  });

  it("leaves out a line one of whose ends moves along", () => {
    const targets = selectionSnapTargets(square, new Set(["b"]));
    expect(targets).toEqual([{ x: 0, z: 0 }, { x: 40, z: 20 }]);
  });

  it("lands the middle on the nearest target within reach, and on none beyond it", () => {
    const targets = [{ x: 20, z: 0 }, { x: 21, z: 0 }];
    expect(snappedSelectionTarget({ x: 12, z: -7 }, { x: 8.6, z: 7.2 }, targets, 1)).toEqual({ x: 21, z: 0 });
    expect(snappedSelectionTarget({ x: 12, z: -7 }, { x: 8, z: 4 }, targets, 1)).toBeNull();
  });
});
