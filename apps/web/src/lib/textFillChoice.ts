import { DEFAULT_SKETCH_STROKE, MIN_SKETCH_STROKE_WIDTH, normalizeSketchStroke } from "@/lib/sketchStroke";
import { textFillPatch } from "@/lib/textGeometry";
import type { ShellEdges, SketchStroke, SketchStrokeAlign, WorkplaneShape } from "@/types/layerling";

/**
 * The fill of a plain text in one list, as similar tools name it (#215): the filled letters, a line
 * centred on their outline, a line outside it and a line inside it - the stroke aligns the text
 * fill modes already have. "Wider" is the filled letters grown by the line width, so it reads as
 * filled here and has its own switch.
 */
export type TextFillChoice = "filled" | "outline" | "outer" | "inner";
export const TEXT_FILL_CHOICES: readonly { choice: TextFillChoice; align: SketchStrokeAlign | null }[] = [
  { choice: "filled", align: null },
  { choice: "outline", align: "center" },
  { choice: "outer", align: "outside" },
  { choice: "inner", align: "inside" },
];

/** Which entry of the list a text's stroke is. */
export function textFillChoice(textStroke: unknown): TextFillChoice {
  const stroke = normalizeSketchStroke(textStroke);
  if (!stroke || stroke.align === "grow") return "filled";
  return TEXT_FILL_CHOICES.find((entry) => entry.align === stroke.align)?.choice ?? "filled";
}

/** The stroke an entry of the list makes; line width and corners stay as they were. */
export function textStrokeForChoice(choice: TextFillChoice, textStroke: unknown): SketchStroke | undefined {
  const align = TEXT_FILL_CHOICES.find((entry) => entry.choice === choice)?.align ?? null;
  if (!align) return undefined;
  return { ...(normalizeSketchStroke(textStroke) ?? DEFAULT_SKETCH_STROKE), align };
}

/** The "Wider" switch: the filled letters grown by the line width, or back to the plain letters. */
export function textStrokeWider(wider: boolean, textStroke: unknown): SketchStroke | undefined {
  return wider ? { ...(normalizeSketchStroke(textStroke) ?? DEFAULT_SKETCH_STROKE), align: "grow" } : undefined;
}

/**
 * Whether a line's settings - its width and its corners - stand right under the list, as in
 * similar tools: for Outline, Outer line and Inner line. Filled has no line; "Wider" keeps its
 * width there and its corners under "More", next to its switch.
 */
export function textLineSettingsInView(textStroke: unknown): boolean {
  return textFillChoice(textStroke) !== "filled";
}

/**
 * A plain text offset as a text, for the letters whose body the kernel cannot offset - an A, B, M, N,
 * W or 9 (Discussion #1037): the letters made wider (narrower) by the distance, as the "Wider" fill
 * does with the letters' own outlines, and the text as much taller (lower) at both ends, about its
 * middle. Sharp edges give mitred corners, round ones round corners. Null for any other shape, a text
 * that already has a fill mode or rounded lettering, and a distance too small for a fill or too large
 * for the text's height. Sideways only (#1057), the text keeps its height and place.
 */
export function textOffsetAsFill(shape: WorkplaneShape, distance: number, shrink: boolean, edges: ShellEdges, sideways = false): WorkplaneShape | null {
  if (shape.kind !== "text" || normalizeSketchStroke(shape.textStroke) || (shape.bevel ?? 0) > 0) return null;
  const grownBy = sideways ? 0 : distance;
  const height = shape.height + (shrink ? -2 : 2) * grownBy;
  if (distance < MIN_SKETCH_STROKE_WIDTH || height <= 0) return null;
  const textStroke: SketchStroke = { width: distance, align: shrink ? "shrink" : "grow", join: edges === "sharp" ? "miter" : "round", cap: "flat" };
  return { ...shape, ...textFillPatch(shape, { textStroke }), height, elevation: (shape.elevation ?? 0) + (shrink ? grownBy : -grownBy) };
}

