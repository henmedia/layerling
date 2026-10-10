import { describe, expect, it } from "vitest";
import { calibrateImage, cropImage, imageCorners, imageHandlePositions, imageRotateHandle, imageToLocal, imageToWorld, normalizeImageCrop, normalizeImageRotation, resizeImage, rotateImage, uncropImage, imageCropViewBox, imageAngleTo } from "@/lib/sketchImageTransform";
import type { SketchImage } from "@/types/layerling";

// #216: the reference image turned, cropped, calibrated and centred.
const image = (overrides: Partial<SketchImage> = {}): SketchImage => ({
  id: "img", name: "photo.png", dataUrl: "data:,", mimeType: "image/png", pixelWidth: 800, pixelHeight: 400,
  x: 10, z: -5, width: 40, depth: 20, ...overrides,
});
const close = (a: { x: number; z: number }, b: { x: number; z: number }) => {
  expect(a.x).toBeCloseTo(b.x, 6);
  expect(a.z).toBeCloseTo(b.z, 6);
};

describe("sketch image transform (#216)", () => {
  it("turns points about the centre, counter-clockwise on the plate, and back", () => {
    const turned = image({ rotation: 90 });
    // The right edge's middle, turned a quarter counter-clockwise on screen (z down), points up.
    close(imageToWorld(turned, { x: 20, z: 0 }), { x: 10, z: -25 });
    close(imageToLocal(turned, { x: 10, z: -25 }), { x: 20, z: 0 });
    const corners = imageCorners(image({ rotation: 0 }));
    close(corners[0], { x: -10, z: -15 });
    close(corners[2], { x: 30, z: 5 });
    expect(normalizeImageRotation(370)).toBe(10);
    expect(normalizeImageRotation(-190)).toBe(170);
    expect(normalizeImageRotation(180)).toBe(180);
    expect(normalizeImageRotation("x")).toBe(0);
  });

  it("drags a handle in the picture's own frame when it is turned", () => {
    const turned = image({ rotation: 90, lockAspect: false });
    // The east handle of a picture turned 90 degrees sits above the centre; pulling it further up widens the picture.
    const handles = imageHandlePositions(turned);
    const east = handles.find((handle) => handle.id === "e")!;
    close(east, { x: 10, z: -25 });
    const resized = resizeImage(turned, "e", { x: 10, z: -35 });
    expect(resized.width).toBeCloseTo(50, 6);
    expect(resized.depth).toBeCloseTo(20, 6);
    // The west edge stayed where it was: the centre moved up by half the growth.
    close(resized, { x: 10, z: -10 });
    // The turning handle sits beyond the top edge, in the picture's own up direction.
    close(imageRotateHandle(turned, 4), { x: 10 - 14, z: -5 });
  });

  it("follows the pointer round the centre when turning, snapping with Shift", () => {
    const start = image();
    const startAngle = imageAngleTo(start, { x: 30, z: -5 });
    expect(startAngle).toBeCloseTo(0, 6);
    expect(rotateImage(start, startAngle, { x: 10, z: -25 }, false).rotation).toBeCloseTo(90, 6);
    expect(rotateImage(start, startAngle, { x: 10 + 20 * Math.cos(0.4), z: -5 - 20 * Math.sin(0.4) }, true).rotation).toBe(30);
  });

  it("crops by moving an edge, keeps the opposite edge and remembers the share cut away", () => {
    const cropped = cropImage(image(), "w", { x: 0, z: 0 });
    // The west edge was at x = -10 and moved to 0: a quarter of the 40 mm picture is gone.
    expect(cropped.width).toBeCloseTo(30, 6);
    expect(cropped.x).toBeCloseTo(15, 6);
    expect(cropped.crop).toEqual({ left: 0.25, top: 0, right: 0, bottom: 0 });
    expect(imageCropViewBox({ ...image(), ...cropped })).toEqual([200, 0, 600, 400]);
    // Pulling it back out past the original edge stops there.
    const back = cropImage({ ...image(), ...cropped }, "w", { x: -30, z: 0 });
    expect(back.width).toBeCloseTo(40, 6);
    expect(back.crop).toBeUndefined();
    // A corner crops both ways, and uncrop brings the whole picture back where it was.
    const corner = cropImage(image(), "se", { x: 20, z: 0 });
    expect(corner.crop).toEqual({ left: 0, top: 0, right: 0.25, bottom: 0.25 });
    const whole = uncropImage({ ...image(), ...corner });
    expect(whole.width).toBeCloseTo(40, 6);
    expect(whole.depth).toBeCloseTo(20, 6);
    close(whole, { x: 10, z: -5 });
    expect(normalizeImageCrop({ left: 0.7, right: 0.7 })).toEqual({ left: 0.7, top: 0, right: 0.28, bottom: 0 });
    expect(normalizeImageCrop({ left: 0, right: 0 })).toBeUndefined();
  });

  it("calibrates: two points and a real distance scale the picture about the first point", () => {
    const scaled = calibrateImage(image(), { x: 0, z: 0 }, { x: 10, z: 0 }, 25)!;
    expect(scaled.width).toBeCloseTo(100, 6);
    expect(scaled.depth).toBeCloseTo(50, 6);
    // The first point (0,0) stays; the centre, 10 to the right and 5 up of it, is 2.5 times as far now.
    close(scaled, { x: 25, z: -12.5 });
    expect(calibrateImage(image(), { x: 0, z: 0 }, { x: 0, z: 0 }, 25)).toBeNull();
    expect(calibrateImage(image(), { x: 0, z: 0 }, { x: 1, z: 0 }, 0)).toBeNull();
  });
});
