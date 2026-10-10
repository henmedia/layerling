import type { SketchImage } from "@/types/layerling";

/**
 * The reference image in sketch mode (#216): turned by an angle, cut down to a part of the
 * picture, scaled to a known distance and centred. Everything here is plain arithmetic on the
 * image's record - the workspace draws and drags, this works out what the drag means.
 *
 * Frames: the "world" is the sketch plane (x right, z down on screen, as the SVG draws it). The
 * image's "local" frame has its centre at the origin and is not turned; `rotation` is in degrees,
 * positive turning the picture counter-clockwise as seen on the plate.
 */

export type Vec2 = { x: number; z: number };
export type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
/** Shares of the original picture cut away on each side, 0 to just under 1. */
export type SketchImageCrop = { left: number; top: number; right: number; bottom: number };

export const MIN_IMAGE_SIZE = 0.5;
/** How much of the picture must stay in each direction. */
const MIN_CROP_REMAINDER = 0.02;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

export function normalizeImageRotation(value: unknown): number {
  const degrees = Number(value);
  if (!Number.isFinite(degrees)) return 0;
  let wrapped = ((degrees + 180) % 360 + 360) % 360 - 180;
  if (wrapped <= -180) wrapped += 360;
  return Math.round(wrapped * 100) / 100;
}

export function normalizeImageCrop(value: unknown): SketchImageCrop | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Partial<Record<keyof SketchImageCrop, unknown>>;
  const side = (entry: unknown) => {
    const share = Number(entry);
    return Number.isFinite(share) ? Math.min(1 - MIN_CROP_REMAINDER, Math.max(0, share)) : 0;
  };
  const crop = { left: side(raw.left), top: side(raw.top), right: side(raw.right), bottom: side(raw.bottom) };
  if (crop.left + crop.right > 1 - MIN_CROP_REMAINDER) crop.right = Math.max(0, 1 - MIN_CROP_REMAINDER - crop.left);
  if (crop.top + crop.bottom > 1 - MIN_CROP_REMAINDER) crop.bottom = Math.max(0, 1 - MIN_CROP_REMAINDER - crop.top);
  return crop.left || crop.top || crop.right || crop.bottom ? crop : undefined;
}

/** A point turned about the origin by `degrees`, counter-clockwise on the plate (z down). */
export function rotateVec(point: Vec2, degrees: number): Vec2 {
  const angle = toRadians(degrees);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: point.x * cos + point.z * sin, z: -point.x * sin + point.z * cos };
}

export function imageToLocal(image: Pick<SketchImage, "x" | "z" | "rotation">, point: Vec2): Vec2 {
  return rotateVec({ x: point.x - image.x, z: point.z - image.z }, -(image.rotation ?? 0));
}

export function imageToWorld(image: Pick<SketchImage, "x" | "z" | "rotation">, local: Vec2): Vec2 {
  const turned = rotateVec(local, image.rotation ?? 0);
  return { x: image.x + turned.x, z: image.z + turned.z };
}

/** The four corners on the plate, starting top left and going clockwise on screen. */
export function imageCorners(image: SketchImage): Vec2[] {
  const w = image.width / 2;
  const d = image.depth / 2;
  return [{ x: -w, z: -d }, { x: w, z: -d }, { x: w, z: d }, { x: -w, z: d }].map((local) => imageToWorld(image, local));
}

const HANDLE_LOCALS: Record<ResizeHandle, Vec2> = {
  nw: { x: -1, z: -1 }, n: { x: 0, z: -1 }, ne: { x: 1, z: -1 }, e: { x: 1, z: 0 },
  se: { x: 1, z: 1 }, s: { x: 0, z: 1 }, sw: { x: -1, z: 1 }, w: { x: -1, z: 0 },
};
export const IMAGE_HANDLES: readonly ResizeHandle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

/** Where the eight handles sit on the plate, following the turn of the picture. */
export function imageHandlePositions(image: SketchImage): Array<{ id: ResizeHandle } & Vec2> {
  return IMAGE_HANDLES.map((id) => ({ id, ...imageToWorld(image, { x: HANDLE_LOCALS[id].x * image.width / 2, z: HANDLE_LOCALS[id].z * image.depth / 2 }) }));
}

/** The turning handle: above the top edge, `gap` mm out from it (in the picture's own up direction). */
export function imageRotateHandle(image: SketchImage, gap: number): Vec2 {
  return imageToWorld(image, { x: 0, z: -image.depth / 2 - gap });
}

/** The angle of a point about the image's centre, in degrees counter-clockwise on the plate. */
export function imageAngleTo(image: Pick<SketchImage, "x" | "z">, point: Vec2) {
  return (Math.atan2(-(point.z - image.z), point.x - image.x) * 180) / Math.PI;
}

/**
 * Resizing in the picture's own frame: the handle's opposite edge or corner stays put, with the
 * aspect kept unless it was unlocked. Returns the new size and the centre on the plate.
 */
export function resizeImageLocal(start: SketchImage, handle: ResizeHandle, local: Vec2): { x: number; z: number; width: number; depth: number } {
  const minimum = MIN_IMAGE_SIZE;
  const startsWest = handle.includes("w");
  const startsEast = handle.includes("e");
  const startsNorth = handle.includes("n");
  const startsSouth = handle.includes("s");
  const minX = -start.width / 2;
  const maxX = start.width / 2;
  const minZ = -start.depth / 2;
  const maxZ = start.depth / 2;
  const aspect = start.width / Math.max(minimum, start.depth);
  let next: { x: number; z: number; width: number; depth: number };
  if (start.lockAspect !== false) {
    if ((startsWest || startsEast) && (startsNorth || startsSouth)) {
      const fixedX = startsWest ? maxX : minX;
      const fixedZ = startsNorth ? maxZ : minZ;
      const widthScale = Math.abs(local.x - fixedX) / Math.max(minimum, start.width);
      const depthScale = Math.abs(local.z - fixedZ) / Math.max(minimum, start.depth);
      const scale = Math.max(minimum / Math.min(start.width, start.depth), widthScale, depthScale);
      const width = Math.max(minimum, start.width * scale);
      const depth = Math.max(minimum, start.depth * scale);
      next = { width, depth, x: fixedX + (startsWest ? -1 : 1) * width / 2, z: fixedZ + (startsNorth ? -1 : 1) * depth / 2 };
    } else if (startsWest || startsEast) {
      const fixedX = startsWest ? maxX : minX;
      const width = Math.max(minimum, Math.abs(local.x - fixedX));
      next = { width, depth: Math.max(minimum, width / aspect), x: fixedX + (startsWest ? -1 : 1) * width / 2, z: 0 };
    } else {
      const fixedZ = startsNorth ? maxZ : minZ;
      const depth = Math.max(minimum, Math.abs(local.z - fixedZ));
      next = { depth, width: Math.max(minimum, depth * aspect), z: fixedZ + (startsNorth ? -1 : 1) * depth / 2, x: 0 };
    }
  } else {
    let nextMinX = minX;
    let nextMaxX = maxX;
    let nextMinZ = minZ;
    let nextMaxZ = maxZ;
    if (startsWest) nextMinX = Math.min(local.x, maxX - minimum);
    if (startsEast) nextMaxX = Math.max(local.x, minX + minimum);
    if (startsNorth) nextMinZ = Math.min(local.z, maxZ - minimum);
    if (startsSouth) nextMaxZ = Math.max(local.z, minZ + minimum);
    next = { x: (nextMinX + nextMaxX) / 2, z: (nextMinZ + nextMaxZ) / 2, width: nextMaxX - nextMinX, depth: nextMaxZ - nextMinZ };
  }
  const centre = imageToWorld(start, { x: next.x, z: next.z });
  return { x: centre.x, z: centre.z, width: next.width, depth: next.depth };
}

/** Resizing by a handle dragged to a point on the plate. */
export function resizeImage(start: SketchImage, handle: ResizeHandle, point: Vec2) {
  return resizeImageLocal(start, handle, imageToLocal(start, point));
}

/** Turning: the picture follows the pointer round its centre from where the drag began; Shift snaps to 15 degrees. */
export function rotateImage(start: SketchImage, startAngle: number, point: Vec2, snap: boolean): { rotation: number } {
  const delta = imageAngleTo(start, point) - startAngle;
  const rotation = (start.rotation ?? 0) + delta;
  return { rotation: normalizeImageRotation(snap ? Math.round(rotation / 15) * 15 : rotation) };
}

/**
 * Cropping by a handle (#216): the edge moves to the pointer in the picture's own frame, the
 * opposite edge stays, and the part cut away is remembered as a share of the original picture,
 * so the picture itself is not scaled. Pulling an edge back out uncovers the picture again, at
 * most to its original edge.
 */
export function cropImage(start: SketchImage, handle: ResizeHandle, point: Vec2): { x: number; z: number; width: number; depth: number; crop: SketchImageCrop | undefined } {
  const local = imageToLocal(start, point);
  const crop = normalizeImageCrop(start.crop) ?? { left: 0, top: 0, right: 0, bottom: 0 };
  // The whole picture in mm, as it would be with nothing cut away.
  const fullWidth = start.width / Math.max(MIN_CROP_REMAINDER, 1 - crop.left - crop.right);
  const fullDepth = start.depth / Math.max(MIN_CROP_REMAINDER, 1 - crop.top - crop.bottom);
  let minX = -start.width / 2;
  let maxX = start.width / 2;
  let minZ = -start.depth / 2;
  let maxZ = start.depth / 2;
  const next = { ...crop };
  if (handle.includes("w")) {
    const edge = Math.min(Math.max(local.x, minX - crop.left * fullWidth), maxX - MIN_IMAGE_SIZE);
    next.left = Math.max(0, crop.left + (edge - minX) / fullWidth);
    minX = edge;
  }
  if (handle.includes("e")) {
    const edge = Math.max(Math.min(local.x, maxX + crop.right * fullWidth), minX + MIN_IMAGE_SIZE);
    next.right = Math.max(0, crop.right + (maxX - edge) / fullWidth);
    maxX = edge;
  }
  if (handle.includes("n")) {
    const edge = Math.min(Math.max(local.z, minZ - crop.top * fullDepth), maxZ - MIN_IMAGE_SIZE);
    next.top = Math.max(0, crop.top + (edge - minZ) / fullDepth);
    minZ = edge;
  }
  if (handle.includes("s")) {
    const edge = Math.max(Math.min(local.z, maxZ + crop.bottom * fullDepth), minZ + MIN_IMAGE_SIZE);
    next.bottom = Math.max(0, crop.bottom + (maxZ - edge) / fullDepth);
    maxZ = edge;
  }
  const centre = imageToWorld(start, { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2 });
  return { x: centre.x, z: centre.z, width: maxX - minX, depth: maxZ - minZ, crop: normalizeImageCrop(next) };
}

/** The whole picture again, where it was: the cut-away parts come back around what is shown. */
export function uncropImage(image: SketchImage): { x: number; z: number; width: number; depth: number; crop: undefined } {
  const crop = normalizeImageCrop(image.crop);
  if (!crop) return { x: image.x, z: image.z, width: image.width, depth: image.depth, crop: undefined };
  const fullWidth = image.width / Math.max(MIN_CROP_REMAINDER, 1 - crop.left - crop.right);
  const fullDepth = image.depth / Math.max(MIN_CROP_REMAINDER, 1 - crop.top - crop.bottom);
  // The shown part's centre, in the full picture's local frame.
  const shownX = (crop.left - crop.right) * fullWidth / 2;
  const shownZ = (crop.top - crop.bottom) * fullDepth / 2;
  const centre = imageToWorld(image, { x: -shownX, z: -shownZ });
  return { x: centre.x, z: centre.z, width: fullWidth, depth: fullDepth, crop: undefined };
}

/** The viewBox of the picture's own pixel space that the shown part covers: x, y, width, height in pixels. */
export function imageCropViewBox(image: SketchImage): [number, number, number, number] {
  const crop = normalizeImageCrop(image.crop) ?? { left: 0, top: 0, right: 0, bottom: 0 };
  const width = Math.max(1, image.pixelWidth);
  const height = Math.max(1, image.pixelHeight);
  return [crop.left * width, crop.top * height, Math.max(1, (1 - crop.left - crop.right) * width), Math.max(1, (1 - crop.top - crop.bottom) * height)];
}

/**
 * Calibrating as in Fusion (#216): two points clicked on the picture and the real distance
 * between them; the picture is scaled evenly so the two points are that far apart, and the
 * first point stays where it was clicked.
 */
export function calibrateImage(image: SketchImage, first: Vec2, second: Vec2, length: number): { x: number; z: number; width: number; depth: number } | null {
  const measured = Math.hypot(second.x - first.x, second.z - first.z);
  if (!(measured > 1e-6) || !(length > 0)) return null;
  const scale = length / measured;
  const width = Math.max(MIN_IMAGE_SIZE, image.width * scale);
  const depth = Math.max(MIN_IMAGE_SIZE, image.depth * scale);
  return {
    x: first.x + (image.x - first.x) * scale,
    z: first.z + (image.z - first.z) * scale,
    width,
    depth,
  };
}

/** Centred on an axis of the plate: x = 0 (the revolve axis) or z = 0, or both. */
export function centreImage(axis: "x" | "z" | "both"): { x?: number; z?: number } {
  return axis === "x" ? { x: 0 } : axis === "z" ? { z: 0 } : { x: 0, z: 0 };
}
