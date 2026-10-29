import { curvedTextPatch, DEFAULT_TEXT_SIZE, displayTextOf, straightTextShapes, MAX_TEXT_SPACING, MIN_TEXT_SPACING, textBoxAroundLetters, textFitScale, textLayoutFont, textLetterBox, textLetterOffset, textSpacingOf } from "@/lib/textGeometry";
import { customFontRevision, ensureJapaneseGlyphs, textFont } from "@/lib/textFonts";
import { DEFAULT_TEXT_LAYERS, MAX_TEXT_LAYERS, MAX_TEXT_LAYER_GROW, type TextLayer, type textLayersOf } from "@/lib/textLayers";
import type { WorkplaneShape } from "@/types/layerling";

/**
 * The name tag panel (#215): what the simpler card does on top of the layered text of
 * textLayers - a letter size for the whole stack and "+" / "–" for its layers. The layers
 * themselves are built and read back by textLayers, unchanged.
 */

/** A name tag as the panel shows it: the letters, the layers top to bottom and their ids, as textLayersOf reads them. */
export type NameTagStack = NonNullable<ReturnType<typeof textLayersOf>>;

/** A name tag has its letters and at least one layer under them; "–" stops there. */
export const MIN_NAME_TAG_LAYERS = 2;
export const MIN_LETTER_SIZE = 1;
export const MAX_LETTER_SIZE = 200;
/** The space between the tags of a name list, in mm: the panel has no field for it, as layer_text's default. */
export const NAME_TAG_GAP = 5;
/** How tall the capitals of a name tag from the shape library stand, in mm: plazmabokor's printed tag. */
export const NAME_TAG_LETTER_SIZE = 9;
/**
 * The layers a name tag starts with, from the shape library and from "Make layers": layer_text's
 * three, the bottom plate 3 mm thick - it carries the key ring tab, and a thinner tab tears off.
 */
export const NAME_TAG_LAYERS: readonly TextLayer[] = DEFAULT_TEXT_LAYERS.map((layer, index) => (index === DEFAULT_TEXT_LAYERS.length - 1 ? { ...layer, height: 3 } : layer));

/** Colours a new layer takes, the first one the tag does not use yet - so the new layer shows. */
const NEW_LAYER_COLORS = ["#2b2b2b", "#f2cf10", "#0098c7", "#33983d", "#ffffff", "#d41721", "#6e2786"];

/**
 * "+": a new layer under the lowest one, as much wider again as that one was over its neighbour
 * (the step the Layers card took), as high as it and with or without holes as it, in a colour
 * the tag does not use yet. At the most layers the list stays as it is.
 */
export function addTextLayer(layers: readonly TextLayer[]): TextLayer[] {
  if (layers.length >= MAX_TEXT_LAYERS || layers.length === 0) return [...layers];
  const last = layers[layers.length - 1];
  const step = layers.length >= 2 ? Math.max(0.5, last.grow - layers[layers.length - 2].grow) : 1.5;
  const used = new Set(layers.map((layer) => layer.color.toLowerCase()));
  const color = NEW_LAYER_COLORS.find((candidate) => !used.has(candidate)) ?? last.color;
  return [...layers, { ...last, grow: Math.round(Math.min(MAX_TEXT_LAYER_GROW, last.grow + step) * 1000) / 1000, color }];
}

/** "–": the lowest layer goes, down to the letters and one layer under them. */
export function removeTextLayer(layers: readonly TextLayer[]): TextLayer[] {
  return layers.length > MIN_NAME_TAG_LAYERS ? layers.slice(0, -1) : [...layers];
}

// The straight line is laid out the way textGeometry lays it out before fitting it into its box:
// at this font size, its outlines sampled with these curve segments, an empty text as a space.
const LAYOUT_SIZE = 20;
const curveSegmentsOf = (fontName: string) => (fontName === "Stencil" ? 1 : 8);
const wordsOf = (shape: Pick<WorkplaneShape, "text">) => {
  const words = (shape.text ?? "TEXT").trim() || " ";
  ensureJapaneseGlyphs(words);
  return words;
};

const measuresCache = new Map<string, { width: number; depth: number; cap: number; middle: number }>();

/**
 * The straight line at layout size, measured the way textGlyphShapes measures it, and the height
 * of a capital H above the baseline in the same font - the yardstick of the letter size.
 */
function layoutMeasures(shape: WorkplaneShape) {
  const fontName = shape.font ?? "Multilanguage";
  const key = JSON.stringify([wordsOf(shape), fontName, customFontRevision(shape.font), textSpacingOf(shape), Boolean(shape.textVertical)]);
  const cached = measuresCache.get(key);
  if (cached) return cached;
  // The spacing between the letters (#594) is part of the line, so it is part of its measure.
  const font = textLayoutFont(shape);
  const extent = (words: string) => {
    const box = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
    // Vertical text (#981) is measured stacked, as it is drawn.
    (shape.textVertical ? straightTextShapes({ ...shape, text: words }, LAYOUT_SIZE) : font.generateShapes(words, LAYOUT_SIZE)).forEach((glyph) => {
      const sampled = glyph.extractPoints(curveSegmentsOf(fontName));
      [sampled.shape, ...sampled.holes].forEach((points) => points.forEach((point) => {
        box.minX = Math.min(box.minX, point.x);
        box.maxX = Math.max(box.maxX, point.x);
        box.minY = Math.min(box.minY, point.y);
        box.maxY = Math.max(box.maxY, point.y);
      }));
    });
    return box;
  };
  // Arabic is measured as it is drawn: shaped and turned round (#294).
  const line = extent(displayTextOf(shape));
  // A capital is measured without spacing: it is one letter.
  const capital = ((words: string) => {
    const box = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
    textFont(fontName).generateShapes(words, LAYOUT_SIZE).forEach((glyph) => {
      const sampled = glyph.extractPoints(curveSegmentsOf(fontName));
      [sampled.shape, ...sampled.holes].forEach((points) => points.forEach((point) => {
        box.minX = Math.min(box.minX, point.x);
        box.maxX = Math.max(box.maxX, point.x);
        box.minY = Math.min(box.minY, point.y);
        box.maxY = Math.max(box.maxY, point.y);
      }));
    });
    return box;
  })("H");
  const measures = {
    // The same floor of 1 the fit into the box uses, so a size set here is the size drawn.
    width: Math.max(1, line.maxX - line.minX),
    depth: Math.max(1, line.maxY - line.minY),
    cap: Number.isFinite(capital.maxY) && capital.maxY > 0 ? capital.maxY : LAYOUT_SIZE * 0.7,
    // How far the middle of the line's box stands above the baseline: the box is laid round the shapes of the letters.
    middle: Number.isFinite(line.minY) && Number.isFinite(line.maxY) ? (line.minY + line.maxY) / 2 : 0,
  };
  if (measuresCache.size > 200) measuresCache.clear();
  measuresCache.set(key, measures);
  return measures;
}

/**
 * How tall the capitals of a text stand, in mm: the letter size of a name tag. A straight text
 * fits its line into its box, so this follows the box; curved text has its own letter size.
 */
export function textLetterSize(shape: WorkplaneShape): number {
  if (shape.textCurved) return Math.max(0.5, shape.textSize ?? DEFAULT_TEXT_SIZE);
  const measures = layoutMeasures(shape);
  const letters = textLetterBox(shape);
  // A stretched text (#382) has the height of its box: that is how tall its capitals stand.
  return textFitScale(shape, letters, measures).y * measures.cap;
}

/**
 * Where the baseline of a straight text lies in its own frame along its depth (towards +z, the bottom of the
 * letters): the box is laid round the shapes of the letters, so a "p" reaches the bottom of its box and a "T" has
 * the baseline there.
 */
function textBaselineZ(shape: WorkplaneShape): number {
  const measures = layoutMeasures(shape);
  const scale = textFitScale(shape, textLetterBox(shape), measures).y;
  return textLetterOffset(shape).z + measures.middle * scale;
}

/**
 * How far a straight text's box has to move when its words change, so that the baseline stays where it was (#871):
 * other words make another box, round their own letters, and a "Dp" came out bottom aligned with the "TEXT" before
 * it, its tail on the old baseline. The letters keep their middle along the line. Null for a text with nothing
 * to keep: curved, stretched, or tilted out of the flat.
 */
export function textBaselineKeepShift(before: WorkplaneShape, after: WorkplaneShape): { x: number; z: number } | null {
  if (before.kind !== "text" || after.kind !== "text" || before.textCurved || after.textCurved || before.textStretch || after.textStretch) return null;
  // Vertical text has no baseline to keep: its letters hang from the top.
  if (before.textVertical || after.textVertical) return null;
  if (before.rotationX || before.rotationZ) return null;
  const along = textBaselineZ(before) - textBaselineZ(after);
  if (!Number.isFinite(along) || Math.abs(along) < 1e-6) return null;
  const turn = ((before.rotation ?? 0) * Math.PI) / 180;
  // The shape's own +z in the plan, for a turn about the vertical axis.
  return { x: Math.sin(turn) * along, z: Math.cos(turn) * along };
}

/**
 * A straight text shrunk by its box takes the box with it (#432): the letters fit their box in one scale, so a box
 * made lower than the line needs leaves it much wider than the letters, and the measures and handles stand far from
 * them. When a change of the box makes the letters smaller, the box becomes the one the letters at that size need.
 * A box made larger leaves the letters and the box as they are, and a stretched text fills its box anyway.
 */
export function textShrinkPatch(shape: WorkplaneShape, patch: Partial<WorkplaneShape>): Partial<WorkplaneShape> {
  if (shape.kind !== "text" || shape.textCurved || !("width" in patch || "depth" in patch)) return patch;
  const next = { ...shape, ...patch } as WorkplaneShape;
  if (next.textStretch || next.textCurved) return patch;
  const measures = layoutMeasures(next);
  const before = textFitScale(shape, textLetterBox(shape), measures).x;
  const after = textFitScale(next, textLetterBox(next), measures).x;
  if (!(after < before - 1e-6)) return patch;
  return { ...patch, ...textBoxAroundLetters(next, { width: measures.width * after, depth: measures.depth * after }) };
}

/**
 * The change that sets a text's spacing between the letters (#594) and keeps the letters as tall as they were: the line
 * gets longer or shorter, so a straight text's box follows it (its letter size is what is kept), and curved text re-measures its box.
 */
export function textSpacingPatch(shape: WorkplaneShape, percent: number): Partial<WorkplaneShape> {
  const spacing = Math.min(MAX_TEXT_SPACING, Math.max(MIN_TEXT_SPACING, Number.isFinite(percent) ? Math.round(percent * 10) / 10 : 0));
  const patch: Partial<WorkplaneShape> = { textSpacing: spacing === 0 ? undefined : spacing };
  if (shape.textCurved) return curvedTextPatch(shape, patch);
  // A stretched text fills its box whatever the spacing is, and a text with no letters to measure keeps its box.
  if (shape.textStretch) return patch;
  const size = textLetterSize(shape);
  return { ...patch, ...textLetterSizePatch({ ...shape, ...patch } as WorkplaneShape, size) };
}

/**
 * The change that makes the capitals of a text `size` mm tall: a straight text gets the box its
 * line needs at that size, the fill's and an ear's reach added, so other words or another font keep the
 * size; curved text takes it as its letter size.
 */
export function textLetterSizePatch(shape: WorkplaneShape, size: number): Partial<WorkplaneShape> {
  const letterSize = Math.min(MAX_LETTER_SIZE, Math.max(MIN_LETTER_SIZE, Number.isFinite(size) ? size : DEFAULT_TEXT_SIZE));
  if (shape.textCurved) return curvedTextPatch(shape, { textSize: letterSize });
  const measures = layoutMeasures(shape);
  const scale = letterSize / measures.cap;
  // A stretched text (#382) keeps the width of its box and changes only its depth.
  const width = shape.textStretch ? textLetterBox(shape).width : measures.width * scale;
  // Round the letters the fill's reach all round, and a key ring's ear on its side.
  return textBoxAroundLetters(shape, { width, depth: measures.depth * scale });
}
