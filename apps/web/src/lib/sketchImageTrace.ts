import { traceRasterRings, type RasterPart, type RasterPixels } from "@/lib/rasterTrace";
import type { PictureTrace, TracePoint } from "@/lib/pictureTrace";
import { imageCropViewBox, imageToLocal, imageToWorld, type Vec2 } from "@/lib/sketchImageTransform";
import { sketchFromPieceRings } from "@/lib/svgSketch";
import type { SketchImage, SketchPoint, SketchSegment } from "@/types/layerling";

/*
 * Tracing a reference image (#1060): its outlines laid exactly on the picture - at its size, turned
 * with it, and only the part a crop leaves. In sketch mode, Trace (pictureTrace) shows them over the
 * picture first, curves and corners, and Apply makes them sketch points; the MCP traces a reference
 * image on the plate into a sketch body of straight lines, with the import's tracing (rasterTrace.ts,
 * #359).
 */

export type ImageTraceOptions = { part?: RasterPart; threshold?: number };

/** What a traced picture needs of an image: its shown size in mm, its pixels and its crop. */
export type ImageTraceFrame = Pick<SketchImage, "width" | "depth" | "pixelWidth" | "pixelHeight" | "crop">;

/** The size, in pixels, of the part of the picture that was traced. */
export type TracedSize = { width: number; height: number };

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
 * The part of the picture the image shows: `pixels` is the whole picture, cut to the image's crop (the
 * record's pixel size and the decoded picture's should agree; scaled in case they do not).
 */
export function shownPixels(image: ImageTraceFrame, pixels: RasterPixels): RasterPixels {
  const scaleX = pixels.width / Math.max(1, image.pixelWidth);
  const scaleY = pixels.height / Math.max(1, image.pixelHeight);
  const [x, y, width, height] = imageCropViewBox(image as SketchImage);
  return croppedPixels(pixels, [x * scaleX, y * scaleY, width * scaleX, height * scaleY]);
}

/**
 * The traced outlines in the image's own frame, in mm: its middle at 0, not turned, x to the
 * right and z down the picture. `pixels` is the whole picture; a crop is cut out of it first.
 * Throws RASTER_TRACE_EMPTY when the part has no shape.
 */
export function tracedImageOutlines(image: ImageTraceFrame, pixels: RasterPixels, options: ImageTraceOptions = {}): Vec2[][] {
  const traced = traceRasterRings(shownPixels(image, pixels), options);
  const unitX = image.width / traced.width;
  const unitZ = image.depth / traced.height;
  return traced.rings.map((ring) => ring.map((point) => ({ x: point.x * unitX - image.width / 2, z: point.y * unitZ - image.depth / 2 })));
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

/** Where a traced point, in the pixels of the traced part, lies on the sketch plane. */
export function tracedPointOnPlane(image: SketchImage, size: TracedSize, point: TracePoint) {
  return imageToWorld(image, {
    x: (point.x / Math.max(1, size.width) - 0.5) * image.width,
    z: (point.y / Math.max(1, size.height) - 0.5) * image.depth,
  });
}

/** Where a spot on the sketch plane lies in the pixels of the traced part: the other way round from tracedPointOnPlane. */
export function planePointToTraced(image: SketchImage, size: TracedSize, point: { x: number; z: number }): TracePoint {
  const local = imageToLocal(image, point);
  return {
    x: (local.x / Math.max(1e-9, image.width) + 0.5) * size.width,
    y: (local.z / Math.max(1e-9, image.depth) + 0.5) * size.height,
  };
}

/** How many mm one pixel of the traced part spans on the plate, across and down. */
export function tracedPixelSize(image: SketchImage, size: TracedSize) {
  return { x: image.width / Math.max(1, size.width), z: image.depth / Math.max(1, size.height) };
}

/** A line through spots of the traced part on the sketch plane as SVG path data (open; a Z closes it), for the preview over the picture. */
export function tracedLinePath(points: readonly TracePoint[], image: SketchImage, size: TracedSize) {
  return `M${points.map((point) => {
    const { x, z } = tracedPointOnPlane(image, size, point);
    return `${Math.round(x * 1000) / 1000} ${Math.round(z * 1000) / 1000}`;
  }).join("L")}`;
}

/** The traced outlines on the sketch plane as SVG path data, for the preview over the picture. */
export function tracePreviewPath(trace: Pick<PictureTrace, "rings">, image: SketchImage, size: TracedSize) {
  const at = (point: TracePoint) => {
    const { x, z } = tracedPointOnPlane(image, size, point);
    return `${Math.round(x * 1000) / 1000} ${Math.round(z * 1000) / 1000}`;
  };
  return trace.rings.map(({ nodes }) => {
    const parts = [`M${at(nodes[0])}`];
    nodes.forEach((node, index) => {
      const next = nodes[(index + 1) % nodes.length];
      if (node.handleOut && next.handleIn) parts.push(`C${at(node.handleOut)} ${at(next.handleIn)} ${at(next)}`);
      else if (index < nodes.length - 1) parts.push(`L${at(next)}`);
    });
    return `${parts.join("")}Z`;
  }).join("");
}

/**
 * The traced outlines as sketch points and sides, on the picture: a corner without handles is a plain
 * point, a corner between curves keeps its two handles apart, and a point where the outline runs on
 * smoothly is a smooth point. Each outline is closed; a hole is simply an outline inside another, and
 * one marked as a line is drawn as a construction line, there but not cut.
 */
export function sketchGeometryFromTrace(trace: Pick<PictureTrace, "rings">, image: SketchImage, size: TracedSize, createId: (prefix: string) => string) {
  const points: SketchPoint[] = [];
  const segments: SketchSegment[] = [];
  const on = (point: TracePoint) => tracedPointOnPlane(image, size, point);
  trace.rings.forEach(({ nodes, line }) => {
    const ids = nodes.map(() => createId("sketch-point"));
    nodes.forEach((node, index) => {
      const point: SketchPoint = { id: ids[index], ...on(node) };
      if (node.handleIn) point.handleIn = on(node.handleIn);
      if (node.handleOut) point.handleOut = on(node.handleOut);
      if (!node.corner) point.mode = "smooth";
      else if (node.handleIn || node.handleOut) point.mode = "split";
      points.push(point);
      const next = nodes[(index + 1) % nodes.length];
      segments.push({
        id: createId("sketch-segment"),
        startId: ids[index],
        endId: ids[(index + 1) % nodes.length],
        kind: node.handleOut && next.handleIn ? "bezier" : "line",
        ...(line ? { construction: true } : {}),
      });
    });
  });
  return { points, segments };
}
