import { describe, expect, it } from "vitest";
import {
  PATTIES_MOTIF_MAX_LOOPS,
  PATTIES_MOTIF_MAX_POINTS,
  PATTIES_READY_MOTIFS,
  normalizePattiesMotifLoops,
  pattiesMotifFromRings,
  pattiesMotifOutlines,
  type MotifPoint,
} from "@/lib/pattiesMotifShapes";

const area = (loop: MotifPoint[]) => loop.reduce((sum, p, i) => sum + (p.x * loop[(i + 1) % loop.length].y - loop[(i + 1) % loop.length].x * p.y) / 2, 0);
const points = (loop: number[]) => Array.from({ length: loop.length / 2 }, (_, i) => ({ x: loop[i * 2], y: loop[i * 2 + 1] }));
const circle = (cx: number, cy: number, r: number, n: number) => Array.from({ length: n }, (_, i) => ({ x: cx + r * Math.cos((i / n) * Math.PI * 2), y: cy + r * Math.sin((i / n) * Math.PI * 2) }));

describe("Patties: the ready motifs", () => {
  it("lie inside the circle of radius 1, reach its rim and turn counter-clockwise", () => {
    for (const motif of PATTIES_READY_MOTIFS) {
      const loops = pattiesMotifOutlines(motif, undefined);
      expect(loops.length, motif).toBeGreaterThan(0);
      const reach = Math.max(...loops.flat().map((p) => Math.hypot(p.x, p.y)));
      expect(reach, motif).toBeCloseTo(1, 6);
      loops.forEach((loop) => expect(area(loop), motif).toBeGreaterThan(0));
    }
    expect(pattiesMotifOutlines("paw", undefined)).toHaveLength(5);
    expect(pattiesMotifOutlines("cross", undefined)[0]).toHaveLength(12);
  });

  it("stand in for a figure of one's own that is not there", () => {
    expect(pattiesMotifOutlines("custom", undefined)).toEqual(pattiesMotifOutlines("heart", undefined));
    expect(pattiesMotifOutlines("custom", [[-1, 0, 1, 0, 0, 1]])).toEqual([[{ x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }]]);
  });
});

describe("Patties: a motif from the lines of a drawing or a picture", () => {
  it("brings the outline into the circle, the right way up", () => {
    // A triangle on a page: its point is at the top of the page, where y is smallest.
    const motif = pattiesMotifFromRings([[{ x: 100, y: 300 }, { x: 300, y: 300 }, { x: 200, y: 100 }]], true)!;
    expect(motif).toHaveLength(1);
    const loop = points(motif[0]);
    expect(area(loop)).toBeGreaterThan(0);
    expect(Math.max(...loop.map((p) => Math.hypot(p.x, p.y)))).toBeCloseTo(1, 3);
    const top = loop.reduce((best, p) => (p.y > best.y ? p : best));
    expect(top.x).toBeCloseTo(0, 3);
    expect(loop.filter((p) => p.y < 0)).toHaveLength(2);
  });

  it("leaves out holes and whatever stands inside them, so nothing falls out of a stencil", () => {
    const ring = pattiesMotifFromRings([circle(0, 0, 100, 40), circle(0, 0, 60, 40).reverse(), circle(0, 0, 20, 20), circle(300, 0, 50, 30)], false)!;
    // The ring's outer line and the disc beside it; not the hole, not the dot in the hole.
    expect(ring).toHaveLength(2);
    const sizes = ring.map((loop) => Math.abs(area(points(loop)))).sort((a, b) => b - a);
    expect(sizes[0] / sizes[1]).toBeCloseTo(4, 0);
  });

  it("thins a fine outline out to the points a motif may have, and keeps its shape", () => {
    const fine = pattiesMotifFromRings([circle(0, 0, 500, 4000)], false)!;
    const loop = points(fine[0]);
    expect(loop.length).toBeLessThanOrEqual(PATTIES_MOTIF_MAX_POINTS);
    expect(loop.length).toBeGreaterThan(20);
    expect(area(loop)).toBeCloseTo(Math.PI, 1);
    const many = pattiesMotifFromRings(Array.from({ length: 40 }, (_, i) => circle(i * 30, 0, 10, 12)), false)!;
    expect(many.length).toBeLessThanOrEqual(PATTIES_MOTIF_MAX_LOOPS);
  });

  it("is none when nothing closed is left", () => {
    expect(pattiesMotifFromRings([], false)).toBeNull();
    expect(pattiesMotifFromRings([[{ x: 0, y: 0 }, { x: 1, y: 0 }]], false)).toBeNull();
    expect(pattiesMotifFromRings([[{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }]], false)).toBeNull();
    expect(pattiesMotifFromRings([[{ x: 0, y: 0 }, { x: Number.NaN, y: 0 }, { x: 2, y: 3 }]], false)).toBeNull();
  });

  it("checks a stored motif: lists of numbers in pairs, inside the circle", () => {
    expect(normalizePattiesMotifLoops([[-1, 0, 1, 0, 0, 1]])).toEqual([[-1, 0, 1, 0, 0, 1]]);
    expect(normalizePattiesMotifLoops([[-1, 0, 1, 0, 0, 1], [0, 0, 5, 0, 0, 5], [0, 0, 1, 0], "x", [0, 0, 0.5, 0, 0, "y"]])).toEqual([[-1, 0, 1, 0, 0, 1]]);
    expect(normalizePattiesMotifLoops("heart")).toBeUndefined();
    expect(normalizePattiesMotifLoops([])).toBeUndefined();
    expect(normalizePattiesMotifLoops([[0.123456, 0, 1, 0, 0, 1]])![0][0]).toBe(0.1235);
  });
});
