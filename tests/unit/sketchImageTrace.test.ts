import { describe, expect, it } from "vitest";
import { RASTER_TRACE_EMPTY, type RasterPixels } from "@/lib/rasterTrace";
import { croppedPixels, imageTraceProfile, planePointToTraced, shownPixels, sketchGeometryFromTrace, tracedImageOutlines, tracedPixelSize, tracedPointOnPlane, tracePreviewPath } from "@/lib/sketchImageTrace";
import type { TraceRing } from "@/lib/pictureTrace";
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

  it("traces only the part a crop leaves, at the size it is shown", () => {
    // The right half cut away: the shown part is 50 x 50 mm, its middle at 0, and the block keeps its place on it.
    const cropped = image({ crop: { left: 0, top: 0, right: 0.5, bottom: 0 }, width: 50, depth: 50 });
    const box = bounds(tracedImageOutlines(cropped, pixels, { part: "dark" })[0]);
    expect(box.minX).toBeCloseTo(-15, 0);
    expect(box.maxX).toBeCloseTo(15, 0);
  });

  it("traces the light part as the ring round the block, and keeps ids apart by the prefix", () => {
    const light = imageTraceProfile(image(), pixels, { part: "light" }, "trace-c");
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

function placedImage(patch: Partial<SketchImage> = {}): SketchImage {
  return { id: "image", name: "picture", dataUrl: "data:image/png;base64,", mimeType: "image/png", pixelWidth: 200, pixelHeight: 100, x: 10, z: -5, width: 40, depth: 20, ...patch };
}

/** A square with a straight side, a curved side and a corner between curves, in the traced part's pixels. */
const ring: TraceRing = {
  hole: false,
  key: "o:17:8",
  source: "outline",
  nodes: [
    { x: 0, y: 0, corner: true },
    { x: 200, y: 0, corner: true, handleOut: { x: 220, y: 30 } },
    { x: 200, y: 100, corner: false, handleIn: { x: 220, y: 70 }, handleOut: { x: 180, y: 110 } },
    { x: 0, y: 100, corner: true, handleIn: { x: 20, y: 110 } },
  ],
};

describe("Trace in the sketch: the outlines on the picture", () => {
  it("cuts the picture down to the part the image shows", () => {
    const data = new Uint8ClampedArray(10 * 4 * 4);
    for (let index = 0; index < 40; index += 1) data[index * 4] = index;
    const frame = { width: 40, depth: 20, pixelWidth: 10, pixelHeight: 4 };
    const cut = shownPixels({ ...frame, crop: { left: 0.2, top: 0.25, right: 0.3, bottom: 0.25 } }, { width: 10, height: 4, data });
    expect(cut.width).toBe(5);
    expect(cut.height).toBe(2);
    // The first pixel shown is (2, 1): the eleventh plus two.
    expect(cut.data[0]).toBe(12);
    expect(cut.data[4 * 5]).toBe(22);
    const whole = { width: 10, height: 4, data };
    expect(shownPixels(frame, whole)).toBe(whole);
  });

  it("lays the traced points on the picture: its middle, its size and its turn", () => {
    const flat = placedImage();
    const size = { width: 200, height: 100 };
    expect(tracedPointOnPlane(flat, size, { x: 100, y: 50 })).toEqual({ x: 10, z: -5 });
    expect(tracedPointOnPlane(flat, size, { x: 0, y: 0 })).toEqual({ x: -10, z: -15 });
    expect(tracedPointOnPlane(flat, size, { x: 200, y: 100 })).toEqual({ x: 30, z: 5 });
    // Turned a quarter counter-clockwise on the plate: the picture's right edge points up the screen.
    const turned = tracedPointOnPlane(placedImage({ rotation: 90 }), size, { x: 200, y: 50 });
    expect(turned.x).toBeCloseTo(10, 6);
    expect(turned.z).toBeCloseTo(-25, 6);
    expect(tracedPixelSize(flat, size)).toEqual({ x: 0.2, z: 0.2 });
    // And back: a spot on the plate in the picture's pixels, for a click on it.
    const back = planePointToTraced(placedImage({ rotation: 90 }), size, turned);
    expect(back.x).toBeCloseTo(200, 6);
    expect(back.y).toBeCloseTo(50, 6);
  });

  it("draws a ring marked as a line as construction lines, there but not cut", () => {
    let next = 0;
    const { segments } = sketchGeometryFromTrace({ rings: [{ ...ring, source: "area", hole: true, line: true }] }, placedImage(), { width: 200, height: 100 }, (prefix) => `${prefix}-${(next += 1)}`);
    expect(segments.every((segment) => segment.construction)).toBe(true);
    const cut = sketchGeometryFromTrace({ rings: [ring] }, placedImage(), { width: 200, height: 100 }, (prefix) => `${prefix}-${(next += 1)}`);
    expect(cut.segments.some((segment) => segment.construction)).toBe(false);
  });

  it("makes sketch points of the outline: plain corners, split corners between curves, smooth points", () => {
    let next = 0;
    const { points, segments } = sketchGeometryFromTrace({ rings: [ring] }, placedImage(), { width: 200, height: 100 }, (prefix) => `${prefix}-${(next += 1)}`);
    expect(points).toHaveLength(4);
    expect(segments).toHaveLength(4);
    expect(points[0]).toMatchObject({ x: -10, z: -15 });
    expect(points[0].mode).toBeUndefined();
    expect(points[0].handleIn).toBeUndefined();
    expect(points[1].mode).toBe("split");
    expect(points[2].mode).toBe("smooth");
    expect(points[3].mode).toBe("split");
    expect(points[1].handleOut).toEqual({ x: 34, z: -9 });
    expect(segments.map((segment) => segment.kind)).toEqual(["line", "bezier", "bezier", "line"]);
    // A closed outline: each side starts where the last one ended.
    segments.forEach((segment, index) => {
      expect(segment.startId).toBe(points[index].id);
      expect(segment.endId).toBe(points[(index + 1) % points.length].id);
    });
    expect(points.every((point) => point.id.startsWith("sketch-point-"))).toBe(true);
    expect(segments.every((segment) => segment.id.startsWith("sketch-segment-"))).toBe(true);
  });

  it("draws the preview as one closed path per outline, curves as C", () => {
    const path = tracePreviewPath({ rings: [ring] }, placedImage(), { width: 200, height: 100 });
    expect(path).toBe("M-10 -15L30 -15C34 -9 34 -1 30 5C26 7 -6 7 -10 5Z");
  });
});
