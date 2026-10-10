import { normalizeSketchStroke } from "@/lib/sketchStroke";
import { textFillExtent, textLetterBox } from "@/lib/textGeometry";
import { shapeDepth, shapeWidth } from "@/lib/workplaneShapes";
import type { SketchStroke, WorkplaneShape } from "@/types/layerling";

/**
 * Layered text (#215): one text as a stack of bodies for a multicolour print - the letters on
 * top, under them the same letters a little wider in another colour, and at the bottom a plate
 * wider still, without the holes in the letters, that carries the key ring. Every layer is an
 * ordinary text with a "Wider" fill, so each has its own colour, height and edge treatments; the
 * stack is a bundle, and the bundle's properties panel edits text, font and the layers together.
 */

export type TextLayer = {
  /** How much wider than the letters, in mm all round; 0 is the letters themselves. */
  grow: number;
  height: number;
  color: string;
  /** Without the counters of the letters - the base plate. */
  silhouette?: boolean;
};

export const MAX_TEXT_LAYERS = 6;
export const MIN_TEXT_LAYER_HEIGHT = 0.2;
export const MAX_TEXT_LAYER_GROW = 20;

/** Top to bottom: white letters, a red rim, a black plate - the classic name tag. */
export const DEFAULT_TEXT_LAYERS: readonly TextLayer[] = [
  { grow: 0, height: 1.2, color: "#ffffff" },
  { grow: 1.5, height: 1.2, color: "#d41721" },
  { grow: 3, height: 2, color: "#2b2b2b", silhouette: true },
];

const round = (value: number) => Math.round(value * 1000) / 1000;

export function normalizeTextLayer(layer: Partial<TextLayer>, fallback: TextLayer): TextLayer {
  const grow = Number(layer.grow);
  const height = Number(layer.height);
  return {
    grow: round(Number.isFinite(grow) ? Math.min(MAX_TEXT_LAYER_GROW, Math.max(0, grow)) : fallback.grow),
    height: round(Number.isFinite(height) ? Math.max(MIN_TEXT_LAYER_HEIGHT, height) : fallback.height),
    color: typeof layer.color === "string" && /^#[0-9a-f]{6}$/i.test(layer.color) ? layer.color.toLowerCase() : fallback.color,
    ...(layer.silhouette ? { silhouette: true } : {}),
  };
}

export function normalizeTextLayers(layers: unknown): TextLayer[] | null {
  if (!Array.isArray(layers) || layers.length === 0 || layers.length > MAX_TEXT_LAYERS) return null;
  return layers.map((layer, index) => normalizeTextLayer((layer && typeof layer === "object" ? layer : {}) as Partial<TextLayer>, DEFAULT_TEXT_LAYERS[Math.min(index, DEFAULT_TEXT_LAYERS.length - 1)]));
}

/** The letters as a text without any fill: what every layer is built from. */
export function textLayerSource(text: WorkplaneShape): WorkplaneShape {
  const letters = textLetterBox(text);
  const { textStroke: _stroke, textSilhouette: _silhouette, ...rest } = text;
  // A layer is named "<name> <number>"; the stack's name is the part before the number.
  return { ...rest, name: text.name.replace(/\s\d+$/, ""), width: letters.width, depth: letters.depth, size: Math.max(letters.width, letters.depth) };
}

const growStroke = (grow: number): SketchStroke | undefined => (grow > 0 ? { width: grow, align: "grow", join: "round", cap: "flat" } : undefined);

/**
 * The layers as texts standing in the world, bottom layer first on the source's elevation and
 * each next one on top of the one below; all share the source's letters, place and turn, so the
 * letters line up through the stack. `ids` keep the layers' ids when a stack is built again.
 */
export function textLayerShapes(source: WorkplaneShape, layers: readonly TextLayer[], ids: (string | undefined)[] = []): WorkplaneShape[] {
  const letters = textLayerSource(source);
  const base = letters.elevation ?? 0;
  const bottomUp = [...layers].reverse();
  let elevation = base;
  const shapes = bottomUp.map((layer, fromBottom) => {
    const index = layers.length - 1 - fromBottom;
    const stroke = growStroke(layer.grow);
    const extent = textFillExtent({ textStroke: stroke });
    const width = round(letters.width + 2 * extent);
    const depth = round(letters.depth + 2 * extent);
    const shape: WorkplaneShape = {
      ...letters,
      id: ids[index] ?? `${letters.id}-layer-${index + 1}`,
      name: layers.length > 1 ? `${letters.name} ${index + 1}` : letters.name,
      color: layer.color,
      hole: false,
      height: layer.height,
      elevation: round(elevation),
      width,
      depth,
      size: Math.max(width, depth),
      ...(stroke ? { textStroke: stroke } : {}),
      ...(layer.silhouette ? { textSilhouette: true } : {}),
    };
    elevation += layer.height;
    return shape;
  });
  return shapes.reverse();
}

/**
 * Reads a stack back from its layers (texts standing in the world, any order): the letters
 * without a fill, and the layer settings top to bottom. Null when the shapes are not one text's
 * layers - another kind among them, different words or fonts.
 */
export function textLayersOf(shapes: WorkplaneShape[]): { source: WorkplaneShape; layers: TextLayer[]; ids: string[] } | null {
  if (!shapes.length || shapes.some((shape) => shape.kind !== "text")) return null;
  const words = new Set(shapes.map((shape) => `${shape.text ?? "TEXT"}\u0000${shape.font ?? "Multilanguage"}\u0000${Boolean(shape.textCurved)}`));
  if (words.size !== 1) return null;
  const topDown = [...shapes].sort((a, b) => (b.elevation ?? 0) - (a.elevation ?? 0));
  const layers = topDown.map((shape) => {
    const stroke = normalizeSketchStroke(shape.textStroke);
    return normalizeTextLayer({
      grow: stroke?.align === "grow" ? stroke.width : stroke ? textFillExtent({ textStroke: stroke }) : 0,
      height: shape.height,
      color: shape.color,
      silhouette: shape.textSilhouette,
    }, DEFAULT_TEXT_LAYERS[0]);
  });
  // The letters are the same in every layer; the top one is as good a source as any.
  const source = textLayerSource(topDown[0]);
  const bottom = topDown[topDown.length - 1];
  return { source: { ...source, elevation: bottom.elevation ?? 0 }, layers, ids: topDown.map((shape) => shape.id) };
}

/** A name tag per line: empty lines dropped, at most `limit` names. */
export function namesFromList(list: string, limit = 100) {
  return list.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, limit);
}

/**
 * Where the tags of a list go: rows along +z under the first tag, left aligned with it, each row
 * as deep as the tallest tag plus a gap; several columns when the names would run past `columns`.
 */
export function nameTagOffsets(count: number, width: number, depth: number, gap = 5, columns = 1) {
  const perColumn = Math.max(1, Math.ceil(count / Math.max(1, columns)));
  return Array.from({ length: count }, (_, index) => ({
    x: Math.floor(index / perColumn) * (width + gap),
    z: (index % perColumn) * (depth + gap),
  }));
}

/** A text shape's box as it stands - what a tag of it needs on the plate. */
export function textFootprint(shape: WorkplaneShape) {
  return { width: shapeWidth(shape), depth: shapeDepth(shape) };
}
