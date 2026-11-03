import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { angleAtVertex, angleBetweenFaces, facetOfCurvedSurface, formatFaceAngles, formatProtractorAngle } from "@/lib/protractor";
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
