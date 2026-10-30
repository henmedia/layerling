import { describe, expect, it } from "vitest";
import { ARRAY_AUTO_GROUP_ABOVE, arrayFitGap, arrayFitShift, arrayFitStep, arrayGroupsCopies, arrayWithFit, circleStepDegrees, clampArrayCount, moveAlongRadius, rotateAroundVertical, rowOffset, singleAxisSpacing } from "@/lib/shapeArray";

describe("shape arrays", () => {
  it("groups the pieces by itself above five, until the person chooses", () => {
    expect(ARRAY_AUTO_GROUP_ABOVE).toBe(5);
    expect(arrayGroupsCopies({ count: 4 })).toBe(false);
    expect(arrayGroupsCopies({ count: 5 })).toBe(false);
    expect(arrayGroupsCopies({ count: 6 })).toBe(true);
    // A choice stays, whatever the count does afterwards.
    expect(arrayGroupsCopies({ count: 35, groupCopies: false })).toBe(false);
    expect(arrayGroupsCopies({ count: 3, groupCopies: true })).toBe(true);
  });

  it("keeps the count between two pieces and a hundred", () => {
    expect(clampArrayCount(1)).toBe(2);
    expect(clampArrayCount(7.4)).toBe(7);
    expect(clampArrayCount(5000)).toBe(100);
    expect(clampArrayCount(Number.NaN)).toBe(2);
  });

  it("runs a row along X, back along Y and up along Z", () => {
    expect(rowOffset(singleAxisSpacing("x", 10), 3)).toEqual({ dx: 30, dy: 0, dz: 0 });
    // Y points to the back, which is -z in the scene.
    expect(rowOffset(singleAxisSpacing("y", 10), 2)).toEqual({ dx: 0, dy: 0, dz: -20 });
    expect(rowOffset(singleAxisSpacing("z", -4), 1)).toEqual({ dx: 0, dy: -4, dz: 0 });
  });

  it("steps along all three axes at once for a diagonal row or a staircase", () => {
    expect(rowOffset({ spacingX: 10, spacingY: 5, spacingZ: 2 }, 3)).toEqual({ dx: 30, dy: 6, dz: -15 });
    expect(rowOffset({ spacingX: 0, spacingY: 0, spacingZ: 0 }, 4)).toEqual({ dx: 0, dy: 0, dz: 0 });
  });

  it("moves a point along its line from the centre, which makes a spiral", () => {
    // 10 mm right of the centre, pushed out by 5: 15 mm right.
    const out = moveAlongRadius({ x: 10, z: 0 }, { x: 0, y: 0 }, 0, 5);
    expect(out.x).toBeCloseTo(15);
    expect(Math.abs(out.z)).toBeCloseTo(0);
    // Pulled in by 4 towards a centre at (10, 0), from 10 mm behind it (scene z -10).
    const inward = moveAlongRadius({ x: 10, z: -10 }, { x: 10, y: 0 }, 90, -4);
    expect(inward.x).toBeCloseTo(10);
    expect(inward.z).toBeCloseTo(-6);
    // A point on the centre goes the way the circle has turned: 90 degrees is towards the back (Y), scene -z.
    const fromCentre = moveAlongRadius({ x: 0, z: 0 }, { x: 0, y: 0 }, 90, 7);
    expect(fromCentre.x).toBeCloseTo(0);
    expect(fromCentre.z).toBeCloseTo(-7);
    expect(moveAlongRadius({ x: 3, z: 4 }, { x: 0, y: 0 }, 30, 0)).toEqual({ x: 3, z: 4 });
  });

  it("shares a full circle among all pieces and spans an arc end to end", () => {
    expect(circleStepDegrees(6, 360)).toBeCloseTo(60);
    expect(circleStepDegrees(5, 90)).toBeCloseTo(22.5);
    expect(circleStepDegrees(4, -360)).toBeCloseTo(-90);
  });

  it("turns counter-clockwise seen from above, around the given centre", () => {
    // A point 10 mm right of the centre (5 | 5) ends up 10 mm behind it.
    const quarter = rotateAroundVertical({ x: 15, z: -5 }, { x: 5, y: 5 }, 90);
    expect(quarter.x).toBeCloseTo(5);
    expect(quarter.z).toBeCloseTo(-15);
    const half = rotateAroundVertical({ x: 15, z: -5 }, { x: 5, y: 5 }, 180);
    expect(half.x).toBeCloseTo(-5);
    expect(half.z).toBeCloseTo(-5);
  });
  it("spreads a row over a body with the same gap at both ends (#1037)", () => {
    // Five holes of 8 mm, 20 mm in from the left end of a 150 mm plate: 25.5 mm apart, the last one 20 mm from the right.
    const plate = { min: -75, max: 75 };
    const hole = { min: -55, max: -47 };
    expect(arrayFitGap(hole, plate)).toEqual({ gap: 20, fromStart: true });
    const step = arrayFitStep(5, hole, plate);
    expect(step).toBeCloseTo(25.5);
    expect(plate.max - (hole.max + 4 * step)).toBeCloseTo(20);
    // Nearer the far end the row runs back towards the start.
    expect(arrayFitStep(5, { min: 47, max: 55 }, plate)).toBeCloseTo(-25.5);
    // A new gap moves the piece in from its nearer end, at either end.
    expect(arrayFitShift(hole, plate, 10)).toBeCloseTo(-10);
    expect(arrayFitShift({ min: 47, max: 55 }, plate, 10)).toBeCloseTo(10);
  });

  it("turns a fit into spacings along X or Y only, and leaves a circle alone", () => {
    const base = { mode: "row" as const, count: 3, spacingX: 7, spacingY: 3, spacingZ: 1 };
    const pieces = { minX: 0, maxX: 10, minZ: -5, maxZ: 5 };
    const body = { minX: -10, maxX: 50, minZ: -20, maxZ: 40 };
    // X: 10 mm in from -10, so the last piece ends 10 mm before 50: two steps of 15.
    expect(arrayWithFit({ ...base, fit: { axis: "x", bodyId: "b" } }, pieces, body)).toMatchObject({ spacingX: 15, spacingY: 0, spacingZ: 0 });
    // Y is -z in the scene: 15 mm in from -20, so the last piece ends at 25 - two steps of 10 towards +z, -10 in Y.
    expect(arrayWithFit({ ...base, fit: { axis: "y", bodyId: "b" } }, pieces, body)).toMatchObject({ spacingX: 0, spacingY: -10, spacingZ: 0 });
    expect(arrayWithFit({ ...base, fit: null }, pieces, body)).toMatchObject({ spacingX: 7, spacingY: 3, spacingZ: 1 });
    expect(arrayWithFit({ ...base, fit: { axis: "x", bodyId: "b" } }, pieces, null)).toMatchObject({ spacingX: 7 });
    expect(arrayWithFit({ ...base, mode: "circle", fit: { axis: "x", bodyId: "b" } }, pieces, body)).toMatchObject({ spacingX: 7 });
  });
});
