import { scaledHorizontalShapePatch } from "@/lib/scaleByPercent";
import { shapeDepth, shapeWidth } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

/** By how much a copy was made wider, deeper and taller than its original, each as a factor. */
export type SizeFactors = { width: number; depth: number; height: number };

export const SAME_SIZE: SizeFactors = { width: 1, depth: 1, height: 1 };

export type ShapeSize = { width: number; depth: number; height: number };

export function shapeSize(shape: WorkplaneShape): ShapeSize {
  return { width: shapeWidth(shape), depth: shapeDepth(shape), height: shape.height };
}

export function sizeFactorsBetween(from: ShapeSize, to: ShapeSize): SizeFactors {
  const factor = (before: number, after: number) => (before > 0 && Number.isFinite(after / before) ? after / before : 1);
  return { width: factor(from.width, to.width), depth: factor(from.depth, to.depth), height: factor(from.height, to.height) };
}

export function isSameSize(factors: SizeFactors) {
  const epsilon = 1e-6;
  return Math.abs(factors.width - 1) < epsilon && Math.abs(factors.depth - 1) < epsilon && Math.abs(factors.height - 1) < epsilon;
}

/**
 * A copy grown by the factors its original was grown by (Discussion #1072), as Tinkercad's Duplicate repeats a
 * resize: in its own width, depth and height, with its middle and its bottom where they were, before the step it is
 * moved by. Sketch bodies and meshes grow the way Scale by percent grows them.
 */
export function resizedCopy(shape: WorkplaneShape, factors: SizeFactors): WorkplaneShape {
  if (isSameSize(factors)) return shape;
  return { ...shape, ...scaledHorizontalShapePatch(shape, factors.width, factors.depth), height: shape.height * factors.height };
}
