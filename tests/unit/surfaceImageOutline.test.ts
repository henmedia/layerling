import { describe, expect, it } from "vitest";
import { drawingGrey, drawingOutlines, inTwoTones, SURFACE_IMAGE_OUTLINE_UNITS } from "@/lib/surfaceImageOutline";
import { normalizeSurfaceTextureOwnImage, ownImageKey } from "@/lib/surfaceTextureImages";

/** A grey raster of `size` points a side, light where `light` says so (the middle of the point in 0..1), anti-aliased by 4 × 4 samples. */
function raster(size: number, light: (x: number, y: number) => boolean) {
  const grey = new Float32Array(size * size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let on = 0;
      for (let j = 0; j < 4; j += 1) for (let i = 0; i < 4; i += 1) if (light((x + (i + 0.5) / 4) / size, (y + (j + 0.5) / 4) / size)) on += 1;
      grey[y * size + x] = on / 16;
    }
  }
  return grey;
}

const toUnit = (value: number) => value / SURFACE_IMAGE_OUTLINE_UNITS;

describe("the outlines of a drawing (#1268)", () => {
  it("finds a slanted square within a fraction of a point, where a small image has steps", () => {
    const size = 512;
    // A diamond: |x - 0.5| + |y - 0.5| <= 1/3, so its corners lie at 1/6 and 5/6.
    const grey = raster(size, (x, y) => Math.abs(x - 0.5) + Math.abs(y - 0.5) <= 1 / 3);
    const rings = drawingOutlines(grey, size, size);
    expect(rings).toHaveLength(1);
    // A diamond needs only a few points: the straight edges are simplified.
    expect(rings[0].length / 2).toBeLessThan(40);
    for (let k = 0; k < rings[0].length; k += 2) {
      const u = toUnit(rings[0][k]), v = toUnit(rings[0][k + 1]);
      expect(Math.abs(Math.abs(u - 0.5) + Math.abs(v - 0.5) - 1 / 3)).toBeLessThan(1.5 / size);
    }
  });

  it("keeps v upward and a hole as a ring of its own", () => {
    const size = 128;
    // A frame: light between 0.2 and 0.8, but not inside 0.4 to 0.6; its top (v large) is the picture's first rows.
    const grey = raster(size, (x, y) => x > 0.2 && x < 0.8 && y > 0.2 && y < 0.8 && !(x > 0.4 && x < 0.6 && y > 0.4 && y < 0.6));
    const rings = drawingOutlines(grey, size, size);
    expect(rings).toHaveLength(2);
    const boxes = rings.map((ring) => {
      const us = ring.filter((_, k) => k % 2 === 0).map(toUnit), vs = ring.filter((_, k) => k % 2 === 1).map(toUnit);
      return { minU: Math.min(...us), maxU: Math.max(...us), minV: Math.min(...vs), maxV: Math.max(...vs) };
    }).sort((a, b) => a.maxU - a.minU - (b.maxU - b.minU));
    expect(boxes[0].minU).toBeCloseTo(0.4, 1);
    expect(boxes[0].maxV).toBeCloseTo(0.6, 1);
    expect(boxes[1].minU).toBeCloseTo(0.2, 1);
    expect(boxes[1].maxV).toBeCloseTo(0.8, 1);
  });

  it("closes a shape that reaches the border of the image", () => {
    const size = 64;
    const grey = raster(size, (x) => x < 0.5);
    const rings = drawingOutlines(grey, size, size);
    expect(rings).toHaveLength(1);
    const us = rings[0].filter((_, k) => k % 2 === 0).map(toUnit);
    expect(Math.min(...us)).toBeCloseTo(0, 1);
    expect(Math.max(...us)).toBeCloseTo(0.5, 1);
  });

  it("stays within the point budget by simplifying a circle further", () => {
    const size = 512;
    const grey = raster(size, (x, y) => Math.hypot(x - 0.5, y - 0.5) < 0.4);
    const fine = drawingOutlines(grey, size, size, 1_000_000);
    const rough = drawingOutlines(grey, size, size, 60);
    expect(rough[0].length / 2).toBeLessThanOrEqual(60);
    expect(fine[0].length).toBeGreaterThan(rough[0].length);
  });

  it("makes grey like a own image does: a dark drawing on a transparent ground counts by its ink", () => {
    // Two points: black ink (opaque) and the transparent ground.
    const grey = drawingGrey([0, 0, 0, 255, 0, 0, 0, 0], 2, 1);
    expect(Array.from(grey)).toEqual([1, 0]);
  });

  it("tells a drawing in two tones from one in shades", () => {
    expect(inTwoTones(raster(64, (x) => x < 0.5))).toBe(true);
    expect(inTwoTones(Float32Array.from({ length: 100 }, (_, i) => i / 99))).toBe(false);
  });
});

describe("one's own image with outlines", () => {
  const data = Buffer.from(new Uint8Array(16)).toString("base64");
  const square = [0, 0, 4096, 0, 4096, 4096, 0, 4096];

  it("keeps its outlines and tells it from the same grey values without them", () => {
    const own = normalizeSurfaceTextureOwnImage({ width: 4, height: 4, data, outline: [square] });
    expect(own?.outline).toEqual([square]);
    const plain = normalizeSurfaceTextureOwnImage({ width: 4, height: 4, data });
    expect(plain).toEqual({ width: 4, height: 4, data });
    expect(ownImageKey(own!)).not.toBe(ownImageKey(plain!));
  });

  it("drops rings that are not whole numbers within the image, or too short", () => {
    const own = normalizeSurfaceTextureOwnImage({ width: 4, height: 4, data, outline: [[0, 0, 1, 1], [0, 0, 0.5, 0, 1, 1], [0, 0, 9000, 0, 1, 1], square] });
    expect(own?.outline).toEqual([square]);
  });
});
