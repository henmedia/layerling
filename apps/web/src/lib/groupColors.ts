import type { WorkplaneShape } from "@/types/layerling";

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
