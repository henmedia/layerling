import { describe, expect, it } from "vitest";
import { nearestFaceTriangle, pivotAfterJoin, planarFaceCentroid, planarFaceTriangles, snapsToWalls } from "@/lib/rotationPivot";
import type { WorkplaneShape } from "@/types/layerling";

type Point = [number, number, number];

/** Rim of a pipe end: a circle in the plane x = `x`, centred on (x, cy, cz). */
function rim(x: number, cy: number, cz: number, radius: number, segments = 48): Point[] {
  return Array.from({ length: segments }, (_, index) => {
    const angle = (index / segments) * Math.PI * 2;
    return [x, cy + Math.cos(angle) * radius, cz + Math.sin(angle) * radius];
  });
}

/** Fan from the first rim corner - no vertex sits on the centre, like OCCT caps. */
function disc(points: Point[]): number[] {
  const triangles: number[] = [];
  for (let index = 1; index + 1 < points.length; index += 1) {
    triangles.push(...points[0], ...points[index], ...points[index + 1]);
  }
  return triangles;
}

function annulus(outer: Point[], inner: Point[]): number[] {
  const triangles: number[] = [];
  for (let index = 0; index < outer.length; index += 1) {
    const next = (index + 1) % outer.length;
    triangles.push(...outer[index], ...outer[next], ...inner[index]);
    triangles.push(...inner[index], ...outer[next], ...inner[next]);
  }
  return triangles;
}

/** The pipe wall behind the cap: connected to it, but not in its plane. */
function wall(points: Point[], length: number): number[] {
  const triangles: number[] = [];
  for (let index = 0; index < points.length; index += 1) {
    const a = points[index];
    const b = points[(index + 1) % points.length];
    const a2: Point = [a[0] - length, a[1], a[2]];
    const b2: Point = [b[0] - length, b[1], b[2]];
    triangles.push(...a, ...b, ...a2, ...a2, ...b, ...b2);
  }
  return triangles;
}

describe("planarFaceCentroid", () => {
  it("finds the axis of a pipe end from any triangle of its cap", () => {
    const points = rim(40, 12, -7, 5);
    const positions = [...wall(points, 30), ...disc(points)];
    const capStart = wall(points, 30).length / 9;
    [capStart, capStart + 10, capStart + 40].forEach((hit) => {
      const centre = planarFaceCentroid(positions, hit);
      expect(centre?.x).toBeCloseTo(40, 6);
      expect(centre?.y).toBeCloseTo(12, 6);
      expect(centre?.z).toBeCloseTo(-7, 6);
    });
  });

  it("finds the axis of a hollow pipe end", () => {
    const positions = annulus(rim(0, 3, 4, 6), rim(0, 3, 4, 4));
    const centre = planarFaceCentroid(positions, 17);
    expect(centre?.y).toBeCloseTo(3, 6);
    expect(centre?.z).toBeCloseTo(4, 6);
  });

  it("keeps the two ends of a U-bend apart although they share a plane", () => {
    const left = disc(rim(10, 0, 0, 4));
    const right = disc(rim(10, 0, 30, 4));
    const positions = [...left, ...right];
    const rightCentre = planarFaceCentroid(positions, left.length / 9 + 3);
    expect(rightCentre?.z).toBeCloseTo(30, 6);
    const leftCentre = planarFaceCentroid(positions, 3);
    expect(leftCentre?.z).toBeCloseTo(0, 6);
  });

  it("rejects a hit outside the mesh or on a collapsed triangle", () => {
    expect(planarFaceCentroid([0, 0, 0, 1, 0, 0, 0, 1, 0], 1)).toBeNull();
    expect(planarFaceCentroid([0, 0, 0, 1, 0, 0, 2, 0, 0], 0)).toBeNull();
  });
});

describe("planarFaceTriangles", () => {
  // A square lying in y = 0 (two triangles) next to a square standing in x = 1 (two triangles).
  const floor = [0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 1];
  const wall = [1, 0, 0, 1, 1, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 1];
  const positions = [...floor, ...wall];

  it("returns both triangles of the flat face that was hit and nothing of the wall", () => {
    const face = planarFaceTriangles(positions, 0);
    expect(face?.triangles.sort()).toEqual([0, 1]);
    expect(planarFaceTriangles(positions, 3)?.triangles.sort()).toEqual([2, 3]);
  });

  it("gives nothing for a triangle that is not in the mesh", () => {
    expect(planarFaceTriangles(positions, 9)).toBeNull();
  });
});

describe("nearestFaceTriangle", () => {
  // A floor square, a wall on its right edge, and a second floor square two units along, not touching the first.
  const floor = [0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 1];
  const wall = [1, 0, 0, 1, 1, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 1];
  const farFloor = floor.map((value, index) => (index % 3 === 0 ? value + 2 : value));
  const positions = [...floor, ...wall, ...farFloor];

  it("takes the nearest triangle facing the click, whichever way round the normal points", () => {
    expect(nearestFaceTriangle(positions, { x: 2.8, y: 0, z: 0.5 }, { x: 0, y: 1, z: 0 })).toBe(4);
    expect(nearestFaceTriangle(positions, { x: 0.8, y: 0, z: 0.2 }, { x: 0, y: -1, z: 0 })).toBe(0);
  });

  it("finds nothing for a normal no triangle faces, no normal, or no triangle within reach", () => {
    expect(nearestFaceTriangle(positions, { x: 0.5, y: 0, z: 0.5 }, { x: 0, y: 0, z: 1 })).toBe(-1);
    expect(nearestFaceTriangle(positions, { x: 0.5, y: 0, z: 0.5 }, { x: 0, y: 0, z: 0 })).toBe(-1);
    expect(nearestFaceTriangle(positions, { x: 0.5, y: 0.02, z: 0.5 }, { x: 0, y: 1, z: 0 }, 0.01)).toBe(-1);
    expect(nearestFaceTriangle(positions, { x: 0.8, y: 0.005, z: 0.2 }, { x: 0, y: 1, z: 0 }, 0.01)).toBe(0);
  });
});

describe("pivotAfterJoin", () => {
  // The top of two 20 mm cubes grouped with their middles 7 and 8 mm apart, joined: a 27 x 28 outline
  // less two opposite 7 x 8 corners, laid as six rectangles of two triangles at y = 20.
  const rectangle = (x0: number, z0: number, x1: number, z1: number) => [
    x0, 20, z0, x1, 20, z0, x1, 20, z1,
    x0, 20, z0, x1, 20, z1, x0, 20, z1,
  ];
  const top = [
    ...rectangle(-10, -10, 10, -2), ...rectangle(-10, -2, -3, 10), ...rectangle(-3, -2, 10, 10),
    ...rectangle(10, -2, 17, 10), ...rectangle(-3, 10, 10, 18), ...rectangle(10, 10, 17, 18),
  ];
  const up = { x: 0, y: 1, z: 0 };
  const drawn = { x: 0, y: 20, z: 0 };

  it("takes the middle of the whole joined face, wherever on it the click lands", () => {
    for (const point of [{ x: -8, y: 20, z: -8 }, { x: 15, y: 20, z: 16 }]) {
      const pivot = pivotAfterJoin(drawn, { point, normal: up }, top);
      expect(pivot?.x).toBeCloseTo(3.5, 6);
      expect(pivot?.y).toBeCloseTo(20, 6);
      expect(pivot?.z).toBeCloseTo(4, 6);
    }
  });

  it("keeps the drawn face's middle when the click lies off the joined face", () => {
    expect(pivotAfterJoin(drawn, { point: { x: 3, y: 20.5, z: 3 }, normal: up }, top)).toEqual(drawn);
  });
});

describe("which parts snap to walls", () => {
  const part = (extra: Partial<WorkplaneShape>) => ({ id: "p", name: "Box", kind: "box", color: "#d41721", x: 0, z: 0, size: 10, width: 10, depth: 10, height: 10, rotation: 0, ...extra }) as WorkplaneShape;

  it("snaps parts standing upright or upside down and turned by whole quarter turns or not at all, tapered too", () => {
    for (const rotation of [0, 90, 180, 270, -90, -0, 1e-14, 360, -1e-9, 90 - 1e-9]) expect(snapsToWalls(part({ rotation }))).toBe(true);
    expect(snapsToWalls(part({ rotation: 90, rotationX: 0, rotationZ: -0 }))).toBe(true);
    expect(snapsToWalls(part({ rotationX: 180 }))).toBe(true);
    expect(snapsToWalls(part({ rotationZ: -180, rotation: 270 }))).toBe(true);
    // A taper stays inside the box the part is measured by.
    expect(snapsToWalls(part({ taperTopWidth: 6 }))).toBe(true);
  });

  it("leaves out a part turned part of the way, tipped, twisted or leaning, whose box is not where a wall would meet it", () => {
    for (const rotation of [45, 0.01, 89.99]) expect(snapsToWalls(part({ rotation }))).toBe(false);
    expect(snapsToWalls(part({ rotationX: 90 }))).toBe(false);
    expect(snapsToWalls(part({ rotationX: 179.5 }))).toBe(false);
    expect(snapsToWalls(part({ rotationZ: 0.5 }))).toBe(false);
    expect(snapsToWalls(part({ rotationZ: 90 }))).toBe(false);
    expect(snapsToWalls(part({ extrudeTwist: 30 }))).toBe(false);
    expect(snapsToWalls(part({ extrudeTopOffsetX: 4 }))).toBe(false);
  });
});
