import { describe, expect, it } from "vitest";
import { croppedPixels, sketchGeometryFromTrace, tracedPixelSize, tracedPointOnPlane, tracePreviewPath } from "@/lib/sketchImageTrace";
import type { TraceRing } from "@/lib/pictureTrace";
import type { SketchImage } from "@/types/layerling";

function image(patch: Partial<SketchImage> = {}): SketchImage {
  return { id: "image", name: "picture", dataUrl: "data:image/png;base64,", mimeType: "image/png", pixelWidth: 200, pixelHeight: 100, x: 10, z: -5, width: 40, depth: 20, ...patch };
}

/** A square with a straight side, a curved side and a corner between curves, in the traced part's pixels. */
const ring: TraceRing = {
  hole: false,
  nodes: [
    { x: 0, y: 0, corner: true },
    { x: 200, y: 0, corner: true, handleOut: { x: 220, y: 30 } },
    { x: 200, y: 100, corner: false, handleIn: { x: 220, y: 70 }, handleOut: { x: 180, y: 110 } },
    { x: 0, y: 100, corner: true, handleIn: { x: 20, y: 110 } },
  ],
};

describe("tracing the sketch's reference image", () => {
  it("cuts the picture down to the part the image shows", () => {
    const data = new Uint8ClampedArray(10 * 4 * 4);
    for (let index = 0; index < 40; index += 1) data[index * 4] = index;
    const cut = croppedPixels({ width: 10, height: 4, data }, { left: 0.2, top: 0.25, right: 0.3, bottom: 0.25 });
    expect(cut.width).toBe(5);
    expect(cut.height).toBe(2);
    // The first pixel shown is (2, 1): the eleventh plus two.
    expect(cut.data[0]).toBe(12);
    expect(cut.data[4 * 5]).toBe(22);
    expect(croppedPixels({ width: 10, height: 4, data }, undefined).width).toBe(10);
  });

  it("lays the traced points on the picture: its middle, its size and its turn", () => {
    const flat = image();
    const size = { width: 200, height: 100 };
    expect(tracedPointOnPlane(flat, size, { x: 100, y: 50 })).toEqual({ x: 10, z: -5 });
    expect(tracedPointOnPlane(flat, size, { x: 0, y: 0 })).toEqual({ x: -10, z: -15 });
    expect(tracedPointOnPlane(flat, size, { x: 200, y: 100 })).toEqual({ x: 30, z: 5 });
    // Turned a quarter counter-clockwise on the plate: the picture's right edge points up the screen.
    const turned = tracedPointOnPlane(image({ rotation: 90 }), size, { x: 200, y: 50 });
    expect(turned.x).toBeCloseTo(10, 6);
    expect(turned.z).toBeCloseTo(-25, 6);
    expect(tracedPixelSize(flat, size)).toEqual({ x: 0.2, z: 0.2 });
  });

  it("makes sketch points of the outline: plain corners, split corners between curves, smooth points", () => {
    let next = 0;
    const { points, segments } = sketchGeometryFromTrace({ rings: [ring] }, image(), { width: 200, height: 100 }, (prefix) => `${prefix}-${(next += 1)}`);
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
    const path = tracePreviewPath({ rings: [ring] }, image(), { width: 200, height: 100 });
    expect(path).toBe("M-10 -15L30 -15C34 -9 34 -1 30 5C26 7 -6 7 -10 5Z");
  });
});
