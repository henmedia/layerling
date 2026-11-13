import * as THREE from "three";
import { quaternionForShape } from "@/lib/geometryRotation";
import { starSettingsForSize } from "@/lib/starGeometry";
import { cleanNearZero, resizedShapeSize, shapeDepth, shapeHasTaper, shapeTaperDimensions, shapeWidth } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

const MIN_SIZE = 0.01;
/** As small as 1:10,000 of the size, for model scales such as Z (1:220) and below. */
export const SCALE_PERCENT_MIN = 0.01;
export const SCALE_PERCENT_MAX = 1000;

/**
 * "together": the parts grow around their common centre, so the layout grows with them, as if they
 * were one part. "each": every part grows where it stands, and the gaps between them stay.
 * Either way the bottom stays where it is, so nothing sinks into the plate.
 */
export type ScaleByPercentMode = "together" | "each";

/** The footprint fields that change when a body is stretched sideways - the same the handles change. */
export function scaledHorizontalShapePatch(shape: WorkplaneShape, scaleX: number, scaleZ: number): Partial<WorkplaneShape> {
  const width = Math.max(MIN_SIZE, shapeWidth(shape) * scaleX);
  const depth = Math.max(MIN_SIZE, shapeDepth(shape) * scaleZ);
  const patch: Partial<WorkplaneShape> = {
    width,
    depth,
    size: resizedShapeSize(width, depth),
  };
  if (shape.kind === "cone") {
    patch.baseRadius = width / 2;
  }
  if (shape.kind === "star") {
    Object.assign(patch, starSettingsForSize({ ...shape, width: shapeWidth(shape), depth: shapeDepth(shape) }, width, depth));
  }
  if (shapeHasTaper(shape)) {
    const taper = shapeTaperDimensions(shape);
    patch.taperTopWidth = Math.max(MIN_SIZE, taper.topWidth * scaleX);
    patch.taperBottomWidth = Math.max(MIN_SIZE, taper.bottomWidth * scaleX);
    patch.taperTopDepth = Math.max(MIN_SIZE, taper.topDepth * scaleZ);
    patch.taperBottomDepth = Math.max(MIN_SIZE, taper.bottomDepth * scaleZ);
  }
  return patch;
}

/** The corners of a body's own box in the world, turned as the body is. */
function worldCorners(shape: WorkplaneShape) {
  const half = new THREE.Vector3(shapeWidth(shape) / 2, shape.height / 2, shapeDepth(shape) / 2);
  const centre = new THREE.Vector3(shape.x, (shape.elevation ?? 0) + shape.height / 2, shape.z);
  const turn = quaternionForShape(shape);
  const corners: THREE.Vector3[] = [];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    corners.push(new THREE.Vector3(sx * half.x, sy * half.y, sz * half.z).applyQuaternion(turn).add(centre));
  }
  return corners;
}

/** The box the bodies take up in the world. */
export function worldBoxOfShapes(shapes: readonly WorkplaneShape[]) {
  const box = new THREE.Box3();
  shapes.forEach((shape) => worldCorners(shape).forEach((corner) => box.expandByPoint(corner)));
  return box;
}

/** 100 % changes nothing, so the window does not apply it; 100.4 % is a change (#817). */
export function isUnchangedPercent(percent: number) {
  return Math.abs(percent - 100) < 1e-9;
}

export type ScaleByPercentResult =
  | { ok: true; patches: Array<{ id: string; patch: Partial<WorkplaneShape> }> }
  | { ok: false; reason: "percent" | "tooSmall" | "tooLarge"; name?: string };

/**
 * Scales bodies by a percentage, the same in every direction. A uniform scale turns with the body,
 * so a tilted part simply has its own sizes multiplied, and its middle moves away from (or towards)
 * the point it grows from. `maxSize` is the largest a single size may become for a body.
 */
export function scaleShapesByPercent(
  shapes: readonly WorkplaneShape[],
  percent: number,
  mode: ScaleByPercentMode,
  maxSize: (shape: WorkplaneShape) => number,
): ScaleByPercentResult {
  if (!Number.isFinite(percent) || percent < SCALE_PERCENT_MIN || percent > SCALE_PERCENT_MAX) return { ok: false, reason: "percent" };
  const factor = percent / 100;
  const together = worldBoxOfShapes(shapes);
  const patches: Array<{ id: string; patch: Partial<WorkplaneShape> }> = [];
  for (const shape of shapes) {
    const sizes = [shapeWidth(shape), shapeDepth(shape), shape.height].map((size) => size * factor);
    if (sizes.some((size) => size < MIN_SIZE)) return { ok: false, reason: "tooSmall", name: shape.name };
    if (sizes.some((size) => size > maxSize(shape) + 1e-9)) return { ok: false, reason: "tooLarge", name: shape.name };
    const own = mode === "each" ? worldBoxOfShapes([shape]) : together;
    const middle = own.getCenter(new THREE.Vector3());
    // The point it grows from: the middle of the box, at its bottom.
    const from = new THREE.Vector3(middle.x, own.min.y, middle.z);
    const centre = new THREE.Vector3(shape.x, (shape.elevation ?? 0) + shape.height / 2, shape.z);
    const next = from.clone().add(centre.sub(from).multiplyScalar(factor));
    const height = shape.height * factor;
    patches.push({
      id: shape.id,
      patch: {
        ...scaledHorizontalShapePatch(shape, factor, factor),
        height,
        x: cleanNearZero(next.x, 0.0005),
        z: cleanNearZero(next.z, 0.0005),
        elevation: cleanNearZero(next.y - height / 2, 0.0005),
      },
    });
  }
  return { ok: true, patches };
}
