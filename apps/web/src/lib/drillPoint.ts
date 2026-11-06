import { countersinkDepth, normalizeScrewHoleShaft } from "@/lib/screwHoleGeometry";
import { shapeDepth, shapeHasShapeDeform, shapeWidth } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * Drill point (Discussion #621): a drilled hole that does not go through does not end flat. The drill leaves the
 * cone of its tip at the bottom, 118 degrees for a common twist drill, and whoever models a hole for drilling, for a
 * tap or for a self-tapping screw wants that end, as a drawing shows it.
 *
 * A cylinder set as a hole, a counterbore and a countersink take it. As in a drawing, the depth counts to the
 * shoulder, where the wall meets the cone: the shape's height (the cylinder's, a screw hole's whole length) stays
 * the depth, its frame ends at the shoulder, and the tip reaches beyond it, below the shape's bottom, by half the
 * diameter over the tangent of half the angle - 0.3 diameters at 118 degrees. The cone is as wide as the hole at
 * its bottom: the cylinder, or a screw hole's shaft.
 *
 * Only a hole takes it. A drill point is the end of a drilled hole; a solid cylinder that ends in a point would be
 * a pencil, and the cone is there for that. A solid keeps the setting and its flat end, and gets the point back when
 * it is made a hole again. The double countersink goes through and has no bottom. A tapered, twisted or sloped
 * cylinder keeps its flat bottom too: those run over the frame's height and would bend the tip.
 */

export const DEFAULT_DRILL_POINT_ANGLE = 118;
/** No drill is ground finer than 60 degrees, and above 150 the tip is so short that a flat bottom says it as well. */
export const MIN_DRILL_POINT_ANGLE = 60;
export const MAX_DRILL_POINT_ANGLE = 150;
/** The angles the panel offers at a click: a spot drill, a common twist drill, a split-point drill for harder stock. */
export const DRILL_POINT_ANGLES = [90, 118, 135] as const;

const DRILL_POINT_KINDS = new Set<WorkplaneShape["kind"]>(["cylinder", "counterbore", "countersink"]);

/** The point angle as it is kept, or undefined for a flat bottom: missing, 0 or less, or no number. */
export function normalizeDrillPointAngle(value: number | undefined): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return undefined;
  return Math.min(MAX_DRILL_POINT_ANGLE, Math.max(MIN_DRILL_POINT_ANGLE, value));
}

/**
 * How far past the shoulder the tip of a drill of this diameter and point angle reaches: the cone that opens from a
 * point to the diameter at that angle, as a countersink opens from the shaft to the head (screwHoleProfile).
 */
export function drillPointLength(diameter: number, angle: number) {
  return countersinkDepth(Math.max(0, diameter), 0, normalizeDrillPointAngle(angle) ?? DEFAULT_DRILL_POINT_ANGLE);
}

/**
 * Whether the shape can end in a drill point as it stands - and so whether the panel offers one. A body that is
 * its mesh already (after a fillet, or put together from others) carries whatever end it had then.
 */
export function shapeTakesDrillPoint(shape: WorkplaneShape) {
  return DRILL_POINT_KINDS.has(shape.kind) && Boolean(shape.hole) && !shape.importedMesh && !shape.groupedShapes?.length && !shapeHasShapeDeform(shape);
}

/** The point angle the shape is built with, or undefined while its bottom is flat. */
export function shapeDrillPointAngle(shape: WorkplaneShape) {
  return shapeTakesDrillPoint(shape) ? normalizeDrillPointAngle(shape.drillPointAngle) : undefined;
}

/** The diameter the cone starts from: the cylinder's own, or a screw hole's shaft. */
export function shapeDrillPointDiameter(shape: WorkplaneShape) {
  const width = shapeWidth(shape);
  return shape.kind === "cylinder" ? Math.min(width, shapeDepth(shape)) : normalizeScrewHoleShaft(shape.screwHoleShaft, width);
}

/** How far the shape's tip reaches below its bottom (its elevation), 0 for a flat bottom. */
export function shapeDrillPointLength(shape: WorkplaneShape) {
  const angle = shapeDrillPointAngle(shape);
  return angle === undefined ? 0 : drillPointLength(shapeDrillPointDiameter(shape), angle);
}

/**
 * Whether a point in the shape's own frame - x and z from its axis, y up from its bottom, before it is turned -
 * lies in the cone below the bottom: inside the cone's circle (an ellipse when the hole is stretched) at that depth.
 */
export function pointInDrillPoint(shape: WorkplaneShape, x: number, y: number, z: number, tolerance = 0) {
  const length = shapeDrillPointLength(shape);
  if (length <= 0 || y > tolerance || y < -length - tolerance) return false;
  const diameter = shapeDrillPointDiameter(shape);
  const stretch = shape.kind === "cylinder" ? 1 : shapeDepth(shape) / Math.max(0.001, shapeWidth(shape));
  const share = Math.max(0, Math.min(1, 1 + y / length));
  const rx = (diameter / 2) * share + tolerance;
  const rz = (diameter / 2) * stretch * share + tolerance;
  if (rx <= 0 || rz <= 0) return false;
  return (x / rx) ** 2 + (z / rz) ** 2 <= 1;
}
