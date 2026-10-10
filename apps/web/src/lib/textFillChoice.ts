import { DEFAULT_SKETCH_STROKE, normalizeSketchStroke } from "@/lib/sketchStroke";
import type { SketchStroke, SketchStrokeAlign } from "@/types/layerling";

/**
 * The fill of a plain text in one list, as Tinkercad names it (#215): the filled letters, a line
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
