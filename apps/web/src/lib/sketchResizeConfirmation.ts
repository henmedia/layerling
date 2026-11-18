import type { WorkplaneShape } from "@/types/layerling";

/** Ordinary placement changes are safe; resizing a constrained sketch needs an explicit choice. */
export function constrainedSketchResizeIds(before: readonly WorkplaneShape[], after: readonly WorkplaneShape[]) {
  const previous = new Map(before.map((shape) => [shape.id, shape]));
  return after.filter((shape) => {
    const original = previous.get(shape.id);
    return original?.sketchProfile?.constraints?.length && shape.sketchProfile &&
      (["width", "depth", "height", "size"] as const).some((key) => Math.abs((shape[key] ?? 0) - (original[key] ?? 0)) > 1e-8);
  }).map((shape) => shape.id);
}

export function withoutResizedSketchConstraints(shapes: readonly WorkplaneShape[], ids: readonly string[]) {
  const affected = new Set(ids);
  return shapes.map((shape) => affected.has(shape.id) && shape.sketchProfile ? {
    ...shape, sketchProfile: { ...shape.sketchProfile, constraints: undefined },
  } : shape);
}
