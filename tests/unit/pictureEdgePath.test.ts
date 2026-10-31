import { describe, expect, it } from "vitest";
import { edgePath, edgeStrength, snapToEdge } from "@/lib/pictureEdgePath";
import { preparePicture, type TracePoint } from "@/lib/pictureTrace";

/** A picture of `width` x `height` pixels, each coloured by `paint(x, y)` as [red, green, blue, alpha]. */
function picture(width: number, height: number, paint: (x: number, y: number) => [number, number, number, number]) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) data.set(paint(x, y), (y * width + x) * 4);
  }
  return { width, height, data };
}

/** A red disk of radius 40 on white, its middle at (60, 60). */
const disk = preparePicture(picture(120, 120, (x, y) => (Math.hypot(x + 0.5 - 60, y + 0.5 - 60) <= 40 ? [220, 30, 40, 255] : [255, 255, 255, 255])));
const fromMiddle = (point: TracePoint) => Math.hypot(point.x - 60, point.y - 60);

/** How far a point lies from the side a-b. */
function distanceToSide(point: TracePoint, a: TracePoint, b: TracePoint) {
  const along = Math.min(1, Math.max(0, ((point.x - a.x) * (b.x - a.x) + (point.y - a.y) * (b.y - a.y)) / Math.max(1e-9, (b.x - a.x) ** 2 + (b.y - a.y) ** 2)));
  return Math.hypot(point.x - a.x - along * (b.x - a.x), point.y - a.y - along * (b.y - a.y));
}

describe("the magnetic lasso's way along an edge", () => {
  it("finds the edges where the colour changes, and none on an even picture", () => {
    const edges = edgeStrength(disk);
    expect(edges[60 * 120 + 100]).toBeGreaterThan(0.6);
    expect(edges[60 * 120 + 60]).toBe(0);
    expect(edges[5 * 120 + 5]).toBe(0);
    const even = preparePicture(picture(40, 40, () => [200, 200, 200, 255]));
    expect(Math.max(...edgeStrength(even))).toBe(0);
  });

  it("moves a spot clicked near an edge onto it, and leaves one far from any edge as it is", () => {
    const near = snapToEdge(disk, { x: 60, y: 16 });
    expect(Math.abs(fromMiddle(near) - 40)).toBeLessThan(1.5);
    expect(snapToEdge(disk, { x: 60, y: 60 })).toEqual({ x: 60, y: 60 });
  });

  it("follows the edge round its bend between two spots, where the straight line would cut across", () => {
    const from = snapToEdge(disk, { x: 60, y: 20 });
    const to = snapToEdge(disk, { x: 100, y: 60 });
    const way = edgePath(disk, from, to);
    expect(way[0]).toEqual(from);
    expect(way[way.length - 1]).toEqual(to);
    // A quarter of the circle: every point on the edge, and the way through the point half way along it.
    for (const point of way) expect(Math.abs(fromMiddle(point) - 40)).toBeLessThan(2);
    const halfway = { x: 60 + 40 * Math.SQRT1_2, y: 60 - 40 * Math.SQRT1_2 };
    expect(Math.min(...way.slice(1).map((point, index) => distanceToSide(halfway, way[index], point)))).toBeLessThan(2);
    // Thinned to the points it needs, far fewer than a pixel each.
    expect(way.length).toBeLessThan(30);
  });

  it("runs about straight where no edge lies between the spots", () => {
    const even = preparePicture(picture(80, 80, () => [255, 255, 255, 255]));
    const way = edgePath(even, { x: 10.5, y: 10.5 }, { x: 70.5, y: 40.5 });
    for (const point of way) {
      const off = Math.abs((70 - 10) * (10.5 - point.y) - (10.5 - point.x) * (40 - 10)) / Math.hypot(60, 30);
      expect(off).toBeLessThan(1.5);
    }
  });

  it("gives the way in the picture's own pixels when it was shrunk to trace", () => {
    const big = preparePicture(picture(2400, 1200, (x, y) => (Math.hypot(x + 0.5 - 1200, y + 0.5 - 600) <= 400 ? [0, 0, 0, 255] : [255, 255, 255, 255])));
    expect(big.scaleX).toBeGreaterThan(1);
    const from = snapToEdge(big, { x: 1200, y: 210 });
    const to = snapToEdge(big, { x: 1590, y: 600 });
    expect(Math.abs(Math.hypot(from.x - 1200, from.y - 600) - 400)).toBeLessThan(2 * big.scaleX);
    for (const point of edgePath(big, from, to)) expect(Math.abs(Math.hypot(point.x - 1200, point.y - 600) - 400)).toBeLessThan(2.5 * big.scaleX);
  });
});
