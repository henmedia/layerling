import { normalizeHexColor } from "@/lib/coloredImport";
import type { WorkplaneShape } from "@/types/layerling";

/**
 * Select same colour (Discussion #1839): what the swatch in the object list shows. A solid goes by its colour,
 * written any way ("#F80" is "#ff8800"); holes have no colour of their own and count as one "colour" together.
 */
export function shapeColorKey(shape: Pick<WorkplaneShape, "color" | "hole">): string {
  if (shape.hole) return "hole";
  return normalizeHexColor(shape.color) ?? (shape.color ?? "").trim().toLowerCase();
}

/**
 * The ids of every visible shape that has the colour of one of `fromIds`, in the design's order. As with Select
 * all, hidden shapes and reference images stay out; a hidden shape among `fromIds` still names its colour.
 */
export function shapesOfSameColor(shapes: readonly WorkplaneShape[], fromIds: readonly string[]): string[] {
  const from = new Set(fromIds);
  const colors = new Set(shapes.filter((shape) => from.has(shape.id) && !shape.imagePlate).map(shapeColorKey));
  return shapes.filter((shape) => !shape.hidden && !shape.imagePlate && colors.has(shapeColorKey(shape))).map((shape) => shape.id);
}
