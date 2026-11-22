import type { WorkplaneShape } from "@/types/layerling";

/**
 * Whether typing this measure with "Keep proportions" on scales the other two along. A text's height is the
 * thickness of its letters, not a size of its picture: scaling the width and depth by it would change the
 * letter size (#724).
 */
export function keepsProportionsOnAxis(shape: Pick<WorkplaneShape, "kind">, axis: "width" | "depth" | "height" | undefined) {
  if (!axis) return false;
  return !(shape.kind === "text" && axis === "height");
}

/**
 * Whether a change from the shape's window scales the other sizes along with "Keep proportions" on. An angle typed in (a
 * wedge's slope, a teardrop's tip) is reached through one size alone: scaled along, the body grew and the angle stayed (#1763).
 */
export function keepsProportionsForUpdate(
  shape: Pick<WorkplaneShape, "kind">,
  options: { resizeAxis?: "width" | "depth" | "height"; angle?: boolean } | undefined,
) {
  if (options?.angle) return false;
  return keepsProportionsOnAxis(shape, options?.resizeAxis);
}

let typedWithShift = false;

/**
 * Shift+Enter in a size field of the properties (#1872): the size typed there scales the other two along for this one
 * change, as Shift+Enter does in the size box on the body (#899), without switching "Keep proportions" on. The field
 * hands its value on while `run` runs, so the mark holds for exactly that change.
 */
export function withProportionsKeptOnce<T>(run: () => T): T {
  typedWithShift = true;
  try {
    return run();
  } finally {
    typedWithShift = false;
  }
}

/** Whether the change being handed on right now was confirmed with Shift+Enter. */
export function proportionsKeptOnce() {
  return typedWithShift;
}
