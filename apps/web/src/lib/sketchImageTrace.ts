import { traceRasterRings, type RasterPart, type RasterPixels } from "@/lib/rasterTrace";
import { imageCropViewBox, imageToWorld, type Vec2 } from "@/lib/sketchImageTransform";
import { sketchFromPieceRings } from "@/lib/svgSketch";
import type { SketchImage, SketchPoint, SketchSegment } from "@/types/layerling";

/*
 * Tracing a reference image (#1060): the dark or the light part of the picture becomes closed
 * outlines lying exactly on the picture - at its size, turned with it, and only the part a crop
 * leaves. The tracing is the import's (rasterTrace.ts, #359); this only lays its lines onto the
 * picture. In sketch mode they become sketch lines to edit; the MCP traces a reference image on the
 * plate into a sketch body.
 */

export type ImageTraceOptions = { part?: RasterPart; threshold?: number };

/** What a traced picture needs of an image: its shown size in mm, its pixels and its crop. */
export type ImageTraceFrame = Pick<SketchImage, "width" | "depth" | "pixelWidth" | "pixelHeight" | "crop">;

/** The pixels of the rectangle x, y, width, height (in pixels) as a picture of their own. */
export function croppedPixels(pixels: RasterPixels, [x, y, width, height]: readonly [number, number, number, number]): RasterPixels {
  const left = Math.max(0, Math.min(pixels.width - 1, Math.round(x)));
  const top = Math.max(0, Math.min(pixels.height - 1, Math.round(y)));
  const right = Math.max(left + 1, Math.min(pixels.width, Math.round(x + width)));
  const bottom = Math.max(top + 1, Math.min(pixels.height, Math.round(y + height)));
  if (left === 0 && top === 0 && right === pixels.width && bottom === pixels.height) return pixels;
  const outWidth = right - left;
  const outHeight = bottom - top;
  const data = new Uint8ClampedArray(outWidth * outHeight * 4);
  for (let row = 0; row < outHeight; row += 1) {
    const from = ((top + row) * pixels.width + left) * 4;
    data.set(pixels.data.subarray(from, from + outWidth * 4), row * outWidth * 4);
  }
  return { width: outWidth, height: outHeight, data };
}

/**
 * The traced outlines in the image's own frame, in mm: its middle at 0, not turned, x to the
 * right and z down the picture. `pixels` is the whole picture; a crop is cut out of it first.
 * Throws RASTER_TRACE_EMPTY when the part has no shape.
 */
export function tracedImageOutlines(image: ImageTraceFrame, pixels: RasterPixels, options: ImageTraceOptions = {}): Vec2[][] {
  // The record's pixel size and the decoded picture's should agree; scaled in case they do not.
  const scaleX = pixels.width / Math.max(1, image.pixelWidth);
  const scaleY = pixels.height / Math.max(1, image.pixelHeight);
  const [x, y, width, height] = imageCropViewBox(image as SketchImage);
  const shown = croppedPixels(pixels, [x * scaleX, y * scaleY, width * scaleX, height * scaleY]);
  const traced = traceRasterRings(shown, options);
  const unitX = image.width / traced.width;
  const unitZ = image.depth / traced.height;
  return traced.rings.map((ring) => ring.map((point) => ({ x: point.x * unitX - image.width / 2, z: point.y * unitZ - image.depth / 2 })));
}

/**
 * The sketch image traced into sketch points and straight lines where the picture lies on the
 * sketch plane. `prefix` keeps the ids apart from the sketch's others and from an earlier trace.
 */
export function sketchTraceOfImage(image: SketchImage, pixels: RasterPixels, options: ImageTraceOptions, prefix: string): { points: SketchPoint[]; segments: SketchSegment[]; outlines: number } {
  return tracedSketch(tracedImageOutlines(image, pixels, options), (point) => imageToWorld(image, point), prefix);
}

/**
 * A picture traced into a sketch in its own frame (middle at 0, not turned, z down the picture):
 * the outline of a sketch body that stands where the picture lies once it takes the picture's
 * place and turn - the MCP's trace of a reference image.
 */
export function imageTraceProfile(image: ImageTraceFrame, pixels: RasterPixels, options: ImageTraceOptions, prefix: string): { points: SketchPoint[]; segments: SketchSegment[]; outlines: number } {
  return tracedSketch(tracedImageOutlines(image, pixels, options), (point) => point, prefix);
}

function tracedSketch(outlines: Vec2[][], place: (point: Vec2) => Vec2, prefix: string) {
  const rings = outlines.map((ring) => ring.map((point, index) => ({
    start: { x: point.x, y: point.z },
    end: { x: ring[(index + 1) % ring.length].x, y: ring[(index + 1) % ring.length].z },
  })));
  const round = (value: number) => Math.round(value * 1000) / 1000;
  const sketch = sketchFromPieceRings(rings, ({ x, y }) => {
    const placed = place({ x, z: y });
    return { x: round(placed.x), z: round(placed.z) };
  }, prefix);
  return { ...sketch, outlines: rings.length };
}
