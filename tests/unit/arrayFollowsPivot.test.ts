import { describe, expect, it } from "vitest";
import { arrayCirclePivot, arrayFollowingPivot, type ArraySettings } from "@/lib/shapeArray";

const settings: ArraySettings = { mode: "circle", count: 6, spacingX: 10, spacingY: 0, spacingZ: 0, angle: 360, centerX: 0, centerY: 0, rotateCopies: true, rise: 0, radiusChange: 0 };

describe("the circle of a pattern follows the pivot (#638)", () => {
  it("moves the centre to the pivot, in the user's Y (scene z reversed)", () => {
    const moved = arrayFollowingPivot(settings, { x: 12, z: -30 });
    expect(moved.centerX).toBe(12);
    expect(moved.centerY).toBe(30);
    expect(moved.count).toBe(6);
  });

  it("returns the same object when the centre already sits at the pivot", () => {
    const placed = arrayFollowingPivot(settings, { x: 0, z: 0 });
    expect(placed).toBe(settings);
  });
});

describe("a circle pattern leaves its centre as the pivot (#990)", () => {
  it("is the circle's centre in the scene, halfway up the pieces", () => {
    // Three legs round x 12, user Y 30: their box is wider one way, its middle is not the centre.
    expect(arrayCirclePivot({ ...settings, centerX: 12, centerY: 30 }, 0, 8)).toEqual({ x: 12, y: 4, z: -30 });
  });

  it("keeps the height of a pivot that stood on the centre, and not one elsewhere", () => {
    const placed = { ...settings, centerX: 12, centerY: 30 };
    expect(arrayCirclePivot(placed, 0, 8, { x: 12, y: 6.5, z: -30 })).toEqual({ x: 12, y: 6.5, z: -30 });
    expect(arrayCirclePivot(placed, 0, 8, { x: 0, y: 6.5, z: 0 })).toEqual({ x: 12, y: 4, z: -30 });
  });

  it("is none for a row", () => {
    expect(arrayCirclePivot({ ...settings, mode: "row" }, 0, 8)).toBeNull();
  });
});
