import { describe, expect, it } from "vitest";
import { RASTER_TRACE_EMPTY, type RasterPixels } from "@/lib/rasterTrace";
import { croppedPixels, imageTraceProfile, sketchTraceOfImage, tracedImageOutlines } from "@/lib/sketchImageTrace";
import type { SketchImage } from "@/types/layerling";

/*
 * Tracing the sketch's reference image (#1060): the outline lands on the picture, at its size,
 * turned with it and only within its crop.
 */

/** A white picture with a black rectangle from (left, top) to (right, bottom) in pixels. */
function picture(width: number, height: number, black: { left: number; top: number; right: number; bottom: number }): RasterPixels {
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  for (let y = black.top; y < black.bottom; y += 1) {
    for (let x = black.left; x < black.right; x += 1) {
      const index = (y * width + x) * 4;
      data[index] = 0;
      data[index + 1] = 0;
      data[index + 2] = 0;
    }
  }
  return { width, height, data };
}

const image = (patch: Partial<SketchImage> = {}): SketchImage => ({
  id: "image",
  name: "Drawing",
  dataUrl: "",
  mimeType: "image/png",
  pixelWidth: 200,
  pixelHeight: 100,
  x: 0,
  z: 0,
  width: 100,
  depth: 50,
  ...patch,
});

const bounds = (points: Array<{ x: number; z: number }>) => ({
  minX: Math.min(...points.map((point) => point.x)),
  maxX: Math.max(...points.map((point) => point.x)),
  minZ: Math.min(...points.map((point) => point.z)),
  maxZ: Math.max(...points.map((point) => point.z)),
});

// The black block covers pixels 20 to 80 across and 10 to 40 down: on a picture 100 x 50 mm
// laid with its middle at 0, that is x -40 to -10 and z -20 to -5.
const pixels = picture(200, 100, { left: 20, top: 10, right: 80, bottom: 40 });

describe("tracing the reference image", () => {
  it("lays the dark part's outline where it lies on the picture", () => {
    const outlines = tracedImageOutlines(image(), pixels, { part: "dark" });
    expect(outlines).toHaveLength(1);
    const box = bounds(outlines[0]);
    expect(box.minX).toBeCloseTo(-40, 0);
    expect(box.maxX).toBeCloseTo(-10, 0);
    expect(box.minZ).toBeCloseTo(-20, 0);
    expect(box.maxZ).toBeCloseTo(-5, 0);
  });

  it("moves and turns the lines with the picture", () => {
    const { points, segments, outlines } = sketchTraceOfImage(image({ x: 30, z: -10, rotation: 90 }), pixels, { part: "dark" }, "trace-a");
    expect(outlines).toBe(1);
    expect(segments).toHaveLength(points.length);
    expect(segments.every((segment) => segment.kind === "line")).toBe(true);
    // A quarter turn counter-clockwise on the plate (z down): local (x, z) lands at (z, -x) from the middle.
    const box = bounds(points);
    expect(box.minX - 30).toBeCloseTo(-20, 0);
    expect(box.maxX - 30).toBeCloseTo(-5, 0);
    expect(box.minZ + 10).toBeCloseTo(10, 0);
    expect(box.maxZ + 10).toBeCloseTo(40, 0);
  });

  it("traces only the part a crop leaves, at the size it is shown", () => {
    // The right half cut away: the block stays where it was on the picture, and the shown part is 50 x 50 mm.
    const cropped = image({ crop: { left: 0, top: 0, right: 0.5, bottom: 0 }, width: 50, depth: 50, x: -25 });
    const box = bounds(sketchTraceOfImage(cropped, pixels, { part: "dark" }, "trace-b").points);
    expect(box.minX).toBeCloseTo(-40, 0);
    expect(box.maxX).toBeCloseTo(-10, 0);
  });

  it("traces the light part as the ring round the block, and keeps ids apart by the prefix", () => {
    const light = sketchTraceOfImage(image(), pixels, { part: "light" }, "trace-c");
    expect(light.outlines).toBe(2);
    expect(light.points.every((point) => point.id.startsWith("trace-c-"))).toBe(true);
    expect(new Set(light.points.map((point) => point.id)).size).toBe(light.points.length);
  });

  it("gives the outline in the picture's own frame for a body that takes its place", () => {
    const box = bounds(imageTraceProfile({ width: 100, depth: 50, pixelWidth: 200, pixelHeight: 100 }, pixels, {}, "trace-d").points);
    expect(box.minX).toBeCloseTo(-40, 0);
    expect(box.maxZ).toBeCloseTo(-5, 0);
  });

  it("says so when the part has nothing to trace", () => {
    expect(() => tracedImageOutlines(image(), picture(200, 100, { left: 0, top: 0, right: 0, bottom: 0 }), { part: "dark" })).toThrow(RASTER_TRACE_EMPTY);
  });

  it("cuts a rectangle of pixels out as a picture of its own", () => {
    const cut = croppedPixels(pixels, [20, 10, 60, 30]);
    expect(cut.width).toBe(60);
    expect(cut.height).toBe(30);
    expect(Array.from(cut.data.subarray(0, 4))).toEqual([0, 0, 0, 255]);
    expect(croppedPixels(pixels, [0, 0, 200, 100])).toBe(pixels);
  });
});
