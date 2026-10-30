import type { WorkplaneShape } from "@/types/layerling";
import { shapeHasShapeDeform } from "@/lib/workplaneShapes";

/**
 * Whether a group shows each part in its own colour ("Multicolor" in
 * similar tools) instead of one colour for the whole group.
 *
 * A bundle keeps its parts' colours until Multicolor is switched off. Without an explicit choice a
 * group keeps what it always did: parts that stay separate bodies show their
 * own colour, a group that was cut into one mesh shows the group colour.
 */
export function groupShowsPartColors(shape: WorkplaneShape): boolean {
  if (!shape.groupedShapes?.length) return false;
  // A bundle keeps its parts' colours unless Multicolor is switched off for it.
  if (shape.groupOperation === "bundle") return shape.multicolor ?? true;
  // A hull is one body round its parts: there is no part of it to show in its own colour (#863).
  if (shape.groupOperation === "hull" || shape.groupOperation === "loft") return false;
  return shape.multicolor ?? !shape.importedMesh;
}

/**
 * Whether a group is drawn as one merged body (display only, the saved group keeps its parts): a plain
 * group of plain, visible, unlocked solids. Bundles, hulls, lofts, holes, imported meshes, nested groups
 * and a tapered or deformed group keep showing their parts. A group made from now on starts with
 * Multicolor off when this holds; a saved one keeps the colours it showed (#1029).
 */
export function groupDisplayMergeable(shape: WorkplaneShape): boolean {
  const parts = shape.groupedShapes;
  if (!parts || parts.length < 2 || shape.hole || shape.importedMesh) return false;
  if (shape.groupOperation && shape.groupOperation !== "group") return false;
  if (shapeHasShapeDeform(shape)) return false;
  return parts.every((part) => !part.hidden && !part.hole && !part.locked && !part.importedMesh && !part.groupedShapes?.length);
}

/** Whether the "Multicolor" switch applies to this shape at all. */
export function canToggleGroupColors(shape: WorkplaneShape): boolean {
  return Boolean(shape.groupedShapes?.length) && shape.groupOperation !== "hull" && shape.groupOperation !== "loft" && !shape.hole;
}

/**
 * The colour to hand down to the parts when a group or bundle is set to solid or given a colour.
 * Parts of a group keep their own colours, so Multicolor can bring them back after the group
 * was shown in one colour; only a hull, which is one body, takes the colour into its parts.
 */
export function colorForParts(shape: WorkplaneShape, color: string | undefined): string | undefined {
  return shape.groupedShapes?.length && shape.groupOperation !== "hull" && shape.groupOperation !== "loft" ? undefined : color;
}
