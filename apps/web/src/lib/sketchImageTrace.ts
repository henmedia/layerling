import { imageToLocal, imageToWorld } from "@/lib/sketchImageTransform";
import type { PictureTrace, TracePoint } from "@/lib/pictureTrace";
import type { RasterPixels } from "@/lib/rasterTrace";
import type { SketchImage, SketchPoint, SketchSegment } from "@/types/layerling";

/*
 * Trace in the sketch: the reference image's picture traced (pictureTrace) and laid where the image
 * lies - its size, its turn and its crop - so the outlines sit on the picture, in the sketch's mm.
 * Only the part of the picture the image shows is traced.
 */

/** The size, in pixels, of the part of the picture that was traced. */
export type TracedSize = { width: number; height: number };

/** The part of the picture the image shows: its pixels without the margins cropped away. */
export function croppedPixels(pixels: RasterPixels, crop: SketchImage["crop"]): RasterPixels {
  if (!crop) return pixels;
  const left = Math.floor(pixels.width * crop.left);
  const top = Math.floor(pixels.height * crop.top);
  const right = Math.max(left + 1, Math.ceil(pixels.width * (1 - crop.right)));
  const bottom = Math.max(top + 1, Math.ceil(pixels.height * (1 - crop.bottom)));
  const width = right - left;
  const height = bottom - top;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const from = ((top + y) * pixels.width + left) * 4;
    data.set(pixels.data.subarray(from, from + width * 4), y * width * 4);
  }
  return { width, height, data };
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
