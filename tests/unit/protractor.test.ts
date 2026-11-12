import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { angleAtVertex, angleBetweenFaces, facetOfCurvedSurface, flattenOntoPlane, formatFaceAngles, formatProtractorAngle, pointAsSeen, straightViewAxis } from "@/lib/protractor";
import { planarFaceTriangles } from "@/lib/rotationPivot";

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

  // #1650: a 20 mm cube seen from the top (y is the height). The corner on top, a point along the top edge,
  // and the opposite corner caught at the bottom: in space that is 54.7°, seen from the top the diagonal 45°.
  it("reads the angle as a straight view shows it when given one", () => {
    const corner = point(20, 20, 0);
    const alongTop = point(0, 20, 0);
    const oppositeBottom = point(0, 0, 20);
    const top = { normal: point(0, 1, 0) };
    expect(angleAtVertex(corner, alongTop, oppositeBottom)).toBeCloseTo(54.7356, 3);
    expect(angleAtVertex(corner, alongTop, oppositeBottom, top)).toBeCloseTo(45, 9);
    // A point on the plate beside a raised corner reads square, as it looks.
    expect(angleAtVertex(corner, point(20, 0, 30), alongTop, top)).toBeCloseTo(90, 9);
  });

  it("follows the sight lines of a perspective, so what lies behind a point on screen reads as that point", () => {
    const eye = point(30, 200, 10);
    const corner = point(20, 20, 0);
    const alongTop = point(0, 20, 0);
    // On the plate, exactly where the sight line through (20, 20, 30) meets it.
    const t = 200 / 180;
    const onPlate = point(30 + (20 - 30) * t, 0, 10 + (30 - 10) * t);
    const view = { normal: point(0, 1, 0), eye };
    expect(angleAtVertex(corner, onPlate, alongTop, view)).toBeCloseTo(90, 9);
    expect(pointAsSeen(corner, onPlate, view)).toEqual({ x: expect.closeTo(20, 9), y: expect.closeTo(20, 9), z: expect.closeTo(30, 9) });
  });
});

describe("straightViewAxis", () => {
  it("finds the axis a straight view looks along, either way", () => {
    expect(straightViewAxis(point(0, -1, 0))).toEqual({ x: 0, y: 1, z: 0 });
    expect(straightViewAxis(point(0, 0, 5))).toEqual({ x: 0, y: 0, z: 1 });
    expect(straightViewAxis(point(-2, 0, 0))).toEqual({ x: 1, y: 0, z: 0 });
  });

  it("takes a view a hair off the axis as straight, a tilted one not", () => {
    const tilt = (degrees: number) => point(Math.sin((degrees * Math.PI) / 180), -Math.cos((degrees * Math.PI) / 180), 0);
    expect(straightViewAxis(tilt(0.5))).toEqual({ x: 0, y: 1, z: 0 });
    expect(straightViewAxis(tilt(2))).toBeNull();
    expect(straightViewAxis(point(1, -1, 1))).toBeNull();
    expect(straightViewAxis(point(0, 0, 0))).toBeNull();
  });
});

describe("flattenOntoPlane", () => {
  it("moves a point along the normal onto the plane through the corner", () => {
    expect(flattenOntoPlane(point(1, 5, 2), point(4, -3, 7), point(0, 1, 0))).toEqual({ x: 4, y: 5, z: 7 });
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

describe("facetOfCurvedSurface", () => {
  /** Nine numbers per triangle, as the editor reads a display mesh. */
  const trianglesOf = (geometry: THREE.BufferGeometry) => Array.from((geometry.index ? geometry.toNonIndexed() : geometry).getAttribute("position").array);
  /** The flat patch around the triangle whose middle lies furthest along `direction`. */
  const patchFacing = (positions: number[], direction: THREE.Vector3) => {
    let best = 0;
    let bestReach = Number.NEGATIVE_INFINITY;
    for (let triangle = 0; triangle < positions.length / 9; triangle += 1) {
      const middle = new THREE.Vector3(
        (positions[triangle * 9] + positions[triangle * 9 + 3] + positions[triangle * 9 + 6]) / 3,
        (positions[triangle * 9 + 1] + positions[triangle * 9 + 4] + positions[triangle * 9 + 7]) / 3,
        (positions[triangle * 9 + 2] + positions[triangle * 9 + 5] + positions[triangle * 9 + 8]) / 3,
      );
      if (middle.dot(direction) > bestReach) {
        bestReach = middle.dot(direction);
        best = triangle;
      }
    }
    return planarFaceTriangles(positions, best)?.triangles ?? [];
  };

  it("takes the side of a box as flat", () => {
    const box = trianglesOf(new THREE.BoxGeometry(20, 10, 30));
    const side = patchFacing(box, new THREE.Vector3(1, 0, 0));
    expect(side).toHaveLength(2);
    expect(facetOfCurvedSurface(box, side)).toBe(false);
  });

  it("takes the end of a wedge, one triangle, as flat", () => {
    const wedge = [
      // The two ends, one triangle each.
      -20, 0, 20, 20, 0, 20, 20, 40, 20,
      -20, 0, -20, 20, 40, -20, 20, 0, -20,
      // The floor, the back and the slope, two each.
      -20, 0, -20, 20, 0, -20, 20, 0, 20, -20, 0, -20, 20, 0, 20, -20, 0, 20,
      20, 0, -20, 20, 40, -20, 20, 40, 20, 20, 0, -20, 20, 40, 20, 20, 0, 20,
      -20, 0, -20, -20, 0, 20, 20, 40, 20, -20, 0, -20, 20, 40, 20, 20, 40, -20,
    ];
    expect(facetOfCurvedSurface(wedge, planarFaceTriangles(wedge, 0)?.triangles ?? [])).toBe(false);
    expect(facetOfCurvedSurface(wedge, planarFaceTriangles(wedge, 6)?.triangles ?? [])).toBe(false);
  });

  it("takes a facet of a round wall as curved, and the cap as flat", () => {
    const cylinder = trianglesOf(new THREE.CylinderGeometry(10, 10, 20, 32));
    expect(facetOfCurvedSurface(cylinder, patchFacing(cylinder, new THREE.Vector3(1, 0, 0.01)))).toBe(true);
    expect(facetOfCurvedSurface(cylinder, patchFacing(cylinder, new THREE.Vector3(0, 1, 0)))).toBe(false);
  });

  it("takes the sides of a hexagonal prism as flat", () => {
    const prism = trianglesOf(new THREE.CylinderGeometry(10, 10, 20, 6));
    expect(facetOfCurvedSurface(prism, patchFacing(prism, new THREE.Vector3(1, 0, 0.3)))).toBe(false);
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
