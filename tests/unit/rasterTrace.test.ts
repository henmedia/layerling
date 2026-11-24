// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { buildSvgExtrusionFromPaths } from "@/lib/svgImport";
import { sketchProfileFromSvg } from "@/lib/svgSketch";
import { MAX_RASTER_TRACE_SIDE, RASTER_TRACE_EMPTY, ringCrossesItself, shrinkRaster, traceRaster, traceRasterRings } from "@/lib/rasterTrace";

/** A picture of `width` x `height` pixels, each coloured by `paint(x, y)` as [red, green, blue, alpha]. */
function picture(width: number, height: number, paint: (x: number, y: number) => [number, number, number, number]) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) data.set(paint(x, y), (y * width + x) * 4);
  }
  return { width, height, data };
}

const BLACK: [number, number, number, number] = [0, 0, 0, 255];
const WHITE: [number, number, number, number] = [255, 255, 255, 255];
const CLEAR: [number, number, number, number] = [0, 0, 0, 0];

/** The area the traced SVG imports as, in square pixels. */
function importedArea(svg: string) {
  const { analysis } = buildSvgExtrusionFromPaths(new SVGLoader().parse(svg).paths);
  return analysis.volume / analysis.height;
}

/** A black ring on white: 40 px across, a 20 px hole. */
const ring = picture(60, 60, (x, y) => {
  const r = Math.hypot(x + 0.5 - 30, y + 0.5 - 30);
  return r <= 20 && r >= 10 ? BLACK : WHITE;
});

describe("tracing a picture (PNG, JPG) as an outline", () => {
  it("draws a black square on white as one closed line of its size", () => {
    const square = picture(40, 40, (x, y) => (x >= 10 && x < 30 && y >= 10 && y < 30 ? BLACK : WHITE));
    const trace = traceRaster(square);
    expect(trace.rings).toBe(1);
    expect(importedArea(trace.svg)).toBeGreaterThan(20 * 20 * 0.95);
    expect(importedArea(trace.svg)).toBeLessThan(20 * 20 * 1.05);
  });

  it("keeps the hole of a ring, and the sketch import reads it", () => {
    const trace = traceRaster(ring);
    expect(trace.rings).toBe(2);
    const expected = Math.PI * (20 * 20 - 10 * 10);
    expect(importedArea(trace.svg)).toBeGreaterThan(expected * 0.95);
    expect(importedArea(trace.svg)).toBeLessThan(expected * 1.05);
    expect(sketchProfileFromSvg(trace.svg)).not.toBeNull();
  });

  it("takes the light part when asked: the white of the picture, the ring's hole included", () => {
    const trace = traceRaster(ring, { part: "light" });
    // The white square round the ring (with the ring cut out of it) and the white disc inside.
    expect(trace.rings).toBe(3);
    const expected = 60 * 60 - Math.PI * (20 * 20 - 10 * 10);
    expect(importedArea(trace.svg)).toBeGreaterThan(expected * 0.95);
    expect(importedArea(trace.svg)).toBeLessThan(expected * 1.05);
  });

  it("never makes a shape of transparent pixels", () => {
    const disc = picture(50, 50, (x, y) => (Math.hypot(x + 0.5 - 25, y + 0.5 - 25) <= 15 ? WHITE : CLEAR));
    expect(traceRaster(disc, { part: "light" }).rings).toBe(1);
    expect(() => traceRaster(disc, { part: "dark" })).toThrow(RASTER_TRACE_EMPTY);
  });

  it("leaves specks out, and a picture of nothing but specks has no shape", () => {
    const dots = picture(80, 80, (x, y) => (x % 20 === 5 && y % 20 === 5 ? BLACK : WHITE));
    expect(() => traceRaster(dots)).toThrow(RASTER_TRACE_EMPTY);
  });

  it("straightens the line until it has no more pieces than allowed", () => {
    const wavy = picture(400, 400, (x, y) => {
      const angle = Math.atan2(y - 200, x - 200);
      return Math.hypot(x - 200, y - 200) <= 150 + 12 * Math.sin(angle * 30) ? BLACK : WHITE;
    });
    expect(traceRaster(wavy).segments).toBeGreaterThan(80);
    expect(traceRaster(wavy, { maxSegments: 80 }).segments).toBeLessThanOrEqual(80);
  });

  it("makes the outline as wide as asked, its height in proportion (#359)", () => {
    const bar = picture(100, 60, (x, y) => (x >= 10 && x < 90 && y >= 20 && y < 40 ? BLACK : WHITE));
    const trace = traceRaster(bar, { width: 50 });
    // 80 x 20 px become 50 x 12.5 units; the page keeps the picture's proportions.
    expect(importedArea(trace.svg)).toBeGreaterThan(50 * 12.5 * 0.95);
    expect(importedArea(trace.svg)).toBeLessThan(50 * 12.5 * 1.05);
    expect(trace.svg).toContain('width="62.5" height="37.5"');
  });

  it("shrinks a large picture first, keeping its proportions", () => {
    const wide = picture(3000, 300, () => WHITE);
    const small = shrinkRaster(wide);
    expect(small.width).toBe(MAX_RASTER_TRACE_SIDE);
    expect(small.height).toBe(100);
    const bar = picture(3000, 300, (x, y) => (y >= 100 && y < 200 ? BLACK : WHITE));
    const trace = traceRaster(bar);
    expect(trace.svg).toContain(`width="${MAX_RASTER_TRACE_SIDE}" height="100"`);
    expect(trace.rings).toBe(1);
  });
});

describe("traced rings the kernel can make faces of (Discussion #1997)", () => {
  // Thin, slanted blobs, many of them, traced with few segments: straightened hard enough, a thin
  // part turned into a bow tie, and two blobs meeting in one point made a figure eight.
  function blobs(seed: number) {
    let state = seed;
    const random = () => {
      state = (state * 1103515245 + 12345) & 0x7fffffff;
      return state / 0x7fffffff;
    };
    const spots = Array.from({ length: 30 }, () => [random() * 200, random() * 200, 2 + random() * 10, random() * 3]);
    return picture(200, 200, (x, y) => (spots.some(([bx, by, radius, squash]) => Math.hypot(x - bx, (y - by) * (1 + squash)) < radius && (x + y) % 7 > 1) ? BLACK : WHITE));
  }

  it("tells a ring that crosses or touches itself", () => {
    expect(ringCrossesItself([{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }, { x: 0, y: 2 }])).toBe(false);
    expect(ringCrossesItself([{ x: 0, y: 0 }, { x: 2, y: 2 }, { x: 2, y: 0 }, { x: 0, y: 2 }])).toBe(true);
    expect(ringCrossesItself([{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }, { x: 0, y: 2 }, { x: 1, y: 1 }])).toBe(true);
  });

  it("straightens a ring less where straightening would make it cross itself, and cuts a figure eight in two", () => {
    for (const seed of [1, 18, 25, 32, 40, 59, 70]) {
      const { rings } = traceRasterRings(blobs(seed), { part: "dark", maxSegments: 300 });
      expect(rings.filter(ringCrossesItself), `seed ${seed}`).toEqual([]);
    }
  });

  it("traces two squares meeting at one corner as two rings", () => {
    const corner = picture(12, 12, (x, y) => ((x >= 2 && x < 6 && y >= 2 && y < 6) || (x >= 6 && x < 10 && y >= 6 && y < 10) ? BLACK : WHITE));
    const { rings } = traceRasterRings(corner, { part: "dark" });
    expect(rings.filter(ringCrossesItself)).toEqual([]);
  });
});
