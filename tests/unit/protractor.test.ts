import { describe, expect, it } from "vitest";
import { angleAtVertex, angleBetweenFaces, formatFaceAngles, formatProtractorAngle } from "@/lib/protractor";

const point = (x: number, y: number, z: number) => ({ x, y, z });

describe("angleAtVertex", () => {
  it("reads the corner of a box as 90°", () => {
    expect(angleAtVertex(point(0, 0, 0), point(20, 0, 0), point(0, 0, 10))).toBeCloseTo(90, 9);
  });

  it("reads a slope of 30° whatever the length of the legs", () => {
    const rad = (30 * Math.PI) / 180;
    expect(angleAtVertex(point(5, 2, 1), point(105, 2, 1), point(5 + Math.cos(rad) * 3, 2 + Math.sin(rad) * 3, 1))).toBeCloseTo(30, 9);
  });

  it("goes up to 180° for a straight line and stays exact near 0°", () => {
    expect(angleAtVertex(point(0, 0, 0), point(-1, 0, 0), point(1, 0, 0))).toBeCloseTo(180, 9);
    expect(angleAtVertex(point(0, 0, 0), point(1000, 0, 0), point(1000, 0.001, 0))).toBeCloseTo(0.0000573, 6);
  });

  it("has no angle when a leg has no length", () => {
    expect(angleAtVertex(point(1, 1, 1), point(1, 1, 1), point(2, 1, 1))).toBeNull();
  });
});

describe("angleBetweenFaces", () => {
  it("reads two sides of a box as 90°, whichever way the normals point", () => {
    expect(angleBetweenFaces(point(0, 1, 0), point(1, 0, 0))).toEqual({ angle: 90, other: 90 });
    expect(angleBetweenFaces(point(0, -2, 0), point(3, 0, 0))).toEqual({ angle: 90, other: 90 });
  });

  it("reads a 45° chamfer against the top as 45° and 135°", () => {
    const chamfer = point(Math.SQRT1_2, Math.SQRT1_2, 0);
    const result = angleBetweenFaces(point(0, 1, 0), chamfer);
    expect(result?.angle).toBeCloseTo(45, 9);
    expect(result?.other).toBeCloseTo(135, 9);
    // The side below the chamfer meets it at the same pair.
    expect(angleBetweenFaces(point(1, 0, 0), chamfer)?.angle).toBeCloseTo(45, 9);
  });

  it("reads a wall leaning 60° from the floor the same from either side", () => {
    const rad = (60 * Math.PI) / 180;
    const wall = point(Math.sin(rad), Math.cos(rad), 0);
    expect(angleBetweenFaces(point(0, 1, 0), wall)?.angle).toBeCloseTo(60, 9);
    expect(angleBetweenFaces(point(0, -1, 0), wall)?.angle).toBeCloseTo(60, 9);
  });

  it("reads opposite and parallel faces as 0°", () => {
    expect(angleBetweenFaces(point(0, 0, 1), point(0, 0, -1))?.angle).toBeCloseTo(0, 9);
    expect(angleBetweenFaces(point(0, 0, 1), point(0, 0, 5))?.angle).toBeCloseTo(0, 9);
  });

  it("has no angle without a normal", () => {
    expect(angleBetweenFaces(point(0, 0, 0), point(0, 1, 0))).toBeNull();
  });
});

describe("formatting", () => {
  it("shows a tenth of a degree and drops a trailing zero", () => {
    expect(formatProtractorAngle(90)).toBe("90°");
    expect(formatProtractorAngle(37.4999)).toBe("37.5°");
    expect(formatProtractorAngle(12.04)).toBe("12°");
  });

  it("shows both face angles, or one when they are the same or the faces are parallel", () => {
    expect(formatFaceAngles({ angle: 45, other: 135 })).toBe("45° · 135°");
    expect(formatFaceAngles({ angle: 90, other: 90 })).toBe("90°");
    expect(formatFaceAngles({ angle: 89.98, other: 90.02 })).toBe("90°");
    expect(formatFaceAngles({ angle: 0, other: 180 })).toBe("0°");
  });
});
