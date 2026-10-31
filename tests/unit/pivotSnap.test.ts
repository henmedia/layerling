import { describe, expect, it } from "vitest";
import { pivotSnapCentre } from "@/lib/pivotSnap";

type Point = [number, number, number];

/** A circle in the plane y = `y` around the vertical line through (cx, cz). */
function ring(cx: number, y: number, cz: number, radius: number, segments = 32): Point[] {
  return Array.from({ length: segments }, (_, index) => {
    const angle = (index / segments) * Math.PI * 2;
    return [cx + Math.cos(angle) * radius, y, cz + Math.sin(angle) * radius];
  });
}

/** Fan from the first rim corner, as OCCT caps are: no corner on the centre. */
function cap(points: Point[]): number[] {
  const triangles: number[] = [];
  for (let index = 1; index + 1 < points.length; index += 1) triangles.push(...points[0], ...points[index], ...points[index + 1]);
  return triangles;
}

/** A standing cylinder: bottom cap, side made of two triangles per strip, top cap. Side triangles come first. */
function cylinder(cx: number, cz: number, bottom: number, top: number, radius: number): number[] {
  const low = ring(cx, bottom, cz, radius);
  const high = ring(cx, top, cz, radius);
  const side: number[] = [];
  low.forEach((a, index) => {
    const next = (index + 1) % low.length;
    side.push(...a, ...low[next], ...high[index], ...high[index], ...low[next], ...high[next]);
  });
  return [...side, ...cap(low), ...cap(high)];
}

/** A standing cone: side triangles to the tip first, then the base. */
function cone(cx: number, cz: number, base: number, tip: number, radius: number): number[] {
  const rim = ring(cx, base, cz, radius);
  const side: number[] = [];
  rim.forEach((a, index) => side.push(...a, ...rim[(index + 1) % rim.length], cx, tip, cz));
  return [...side, ...cap(rim)];
}

/** An axis-aligned box from `min` to `max`, two triangles per side; the top comes first. */
function box(min: Point, max: Point): number[] {
  const [x0, y0, z0] = min;
  const [x1, y1, z1] = max;
  return [
    x0, y1, z0, x1, y1, z0, x1, y1, z1, x0, y1, z0, x1, y1, z1, x0, y1, z1,
    x0, y0, z0, x1, y0, z1, x1, y0, z0, x0, y0, z0, x0, y0, z1, x1, y0, z1,
    x0, y0, z0, x1, y0, z0, x1, y1, z0, x0, y0, z0, x1, y1, z0, x0, y1, z0,
    x0, y0, z1, x1, y1, z1, x1, y0, z1, x0, y0, z1, x0, y1, z1, x1, y1, z1,
    x0, y0, z0, x0, y1, z0, x0, y1, z1, x0, y0, z0, x0, y1, z1, x0, y0, z1,
    x1, y0, z0, x1, y0, z1, x1, y1, z1, x1, y0, z0, x1, y1, z1, x1, y1, z0,
  ];
}

function expectNear(point: { x: number; y: number; z: number } | null, expected: Point, digits = 3) {
  expect(point).not.toBeNull();
  expect(point!.x).toBeCloseTo(expected[0], digits);
  expect(point!.y).toBeCloseTo(expected[1], digits);
  expect(point!.z).toBeCloseTo(expected[2], digits);
}

describe("pivot snap to the centre of a face (#1065)", () => {
  it("puts the pivot on the middle of a hinge ring's axis from its round side", () => {
    expectNear(pivotSnapCentre(cylinder(10, -4, 2, 12, 5), 7), [10, 7, -4]);
  });

  it("takes the centre of a round end, not a point on its rim", () => {
    const mesh = cylinder(10, -4, 2, 12, 5);
    const topCapTriangle = 32 * 2 + 30 + 5;
    expectNear(pivotSnapCentre(mesh, topCapTriangle), [10, 12, -4], 2);
  });

  it("takes the middle of a flat box side", () => {
    expectNear(pivotSnapCentre(box([0, 0, 0], [20, 6, 10]), 1), [10, 6, 5]);
  });

  it("finds the tip of a cone from its sloping side", () => {
    expectNear(pivotSnapCentre(cone(3, 3, 0, 15, 4), 11), [3, 15, 3]);
  });

  it("finds the tip of a cone sitting on a box, with the box in the same mesh", () => {
    const mesh = [...cone(10, 5, 6, 20, 3), ...box([0, 0, 0], [20, 6, 10])];
    expectNear(pivotSnapCentre(mesh, 4), [10, 20, 5]);
  });
});
