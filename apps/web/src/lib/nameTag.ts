import { curvedTextPatch, DEFAULT_TEXT_SIZE, textBoxAroundLetters, textLetterBox } from "@/lib/textGeometry";
import { customFontRevision, textFont } from "@/lib/textFonts";
import { MAX_TEXT_LAYERS, MAX_TEXT_LAYER_GROW, type TextLayer, type textLayersOf } from "@/lib/textLayers";
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
/** How tall the capitals of a name tag from the shape library stand, in mm. */
export const NAME_TAG_LETTER_SIZE = 12;

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
const wordsOf = (shape: Pick<WorkplaneShape, "text">) => (shape.text ?? "TEXT").trim() || " ";

const measuresCache = new Map<string, { width: number; depth: number; cap: number }>();

/**
 * The straight line at layout size, measured the way textGlyphShapes measures it, and the height
 * of a capital H above the baseline in the same font - the yardstick of the letter size.
 */
function layoutMeasures(shape: WorkplaneShape) {
  const fontName = shape.font ?? "Multilanguage";
  const key = JSON.stringify([wordsOf(shape), fontName, customFontRevision(shape.font)]);
  const cached = measuresCache.get(key);
  if (cached) return cached;
  const font = textFont(fontName);
  const extent = (words: string) => {
    const box = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
    font.generateShapes(words, LAYOUT_SIZE).forEach((glyph) => {
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
  const line = extent(wordsOf(shape));
  const capital = extent("H");
  const measures = {
    // The same floor of 1 the fit into the box uses, so a size set here is the size drawn.
    width: Math.max(1, line.maxX - line.minX),
    depth: Math.max(1, line.maxY - line.minY),
    cap: Number.isFinite(capital.maxY) && capital.maxY > 0 ? capital.maxY : LAYOUT_SIZE * 0.7,
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
  return Math.min(letters.width / measures.width, letters.depth / measures.depth) * measures.cap;
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
  // Round the letters the fill's reach all round, and a key ring's ear on its side.
  return textBoxAroundLetters(shape, { width: measures.width * scale, depth: measures.depth * scale });
}
