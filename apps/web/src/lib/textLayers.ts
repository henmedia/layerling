import * as THREE from "three";
import { normalizeSketchStroke, SKETCH_STROKE_JOINS } from "@/lib/sketchStroke";
import { DEFAULT_KEYRING_DIAMETER, keyringEarRadius, MAX_KEYRING_DIAMETER, MIN_KEYRING_DIAMETER, TEXT_KEYRING_SIDES, textFillExtent, textKeyringOf, textKeyringReach, textLetterBox, textLetterOffset } from "@/lib/textGeometry";
import { shapeDepth, shapeWidth } from "@/lib/workplaneShapes";
import type { SketchStroke, SketchStrokeJoin, TextKeyring, TextKeyringSide, WorkplaneShape } from "@/types/layerling";

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
  /**
   * How a wider layer goes round the corners of the letters (#215): bevelled or sharp. Left out
   * it is round, as every layer was before, so older stacks come out the same.
   */
  join?: Exclude<SketchStrokeJoin, "round">;
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
    ...(isTextLayerJoin(layer.join as unknown) && (layer.join as unknown) !== "round" ? { join: layer.join } : {}),
  };
}

/** A corner a layer may take: round, bevel or miter (sharp), as a stroke's join. */
export function isTextLayerJoin(value: unknown): value is SketchStrokeJoin {
  return SKETCH_STROKE_JOINS.includes(value as SketchStrokeJoin);
}

export function normalizeTextLayers(layers: unknown): TextLayer[] | null {
  if (!Array.isArray(layers) || layers.length === 0 || layers.length > MAX_TEXT_LAYERS) return null;
  return layers.map((layer, index) => normalizeTextLayer((layer && typeof layer === "object" ? layer : {}) as Partial<TextLayer>, DEFAULT_TEXT_LAYERS[Math.min(index, DEFAULT_TEXT_LAYERS.length - 1)]));
}

/** A name tag's key ring hole as the card sets it: the side and the hole's diameter. */
export type NameTagKeyring = { side: TextKeyringSide; diameter: number };

export function normalizeNameTagKeyring(value: unknown): NameTagKeyring | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<NameTagKeyring>;
  const diameter = Number(candidate.diameter ?? DEFAULT_KEYRING_DIAMETER);
  return {
    side: TEXT_KEYRING_SIDES.includes(candidate.side as TextKeyringSide) ? candidate.side as TextKeyringSide : "left",
    diameter: Number.isFinite(diameter) ? Math.min(MAX_KEYRING_DIAMETER, Math.max(MIN_KEYRING_DIAMETER, diameter)) : DEFAULT_KEYRING_DIAMETER,
  };
}

/**
 * layerling_layer_text's `keyring` (#215): left out it stays as it is (undefined); false or null
 * takes it off; true puts a 4 mm hole on the left; { side, diameter } puts that one on. A side
 * other than left, right or top, or a diameter out of range, is refused, not bent into range.
 */
export function layerTextKeyringArgument(value: unknown): { keyring: NameTagKeyring | null } | { error: string } | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === false) return { keyring: null };
  if (value === true) return { keyring: { side: "left", diameter: DEFAULT_KEYRING_DIAMETER } };
  if (typeof value !== "object" || Array.isArray(value)) return { error: "keyring must be { side, diameter }, true, or false to take it off" };
  const candidate = value as Record<string, unknown>;
  const side = candidate.side ?? "left";
  if (!TEXT_KEYRING_SIDES.includes(side as TextKeyringSide)) return { error: "keyring.side must be left, right or top" };
  const diameter = candidate.diameter ?? DEFAULT_KEYRING_DIAMETER;
  if (typeof diameter !== "number" || !Number.isFinite(diameter) || diameter < MIN_KEYRING_DIAMETER || diameter > MAX_KEYRING_DIAMETER) {
    return { error: `keyring.diameter must be ${MIN_KEYRING_DIAMETER} to ${MAX_KEYRING_DIAMETER} mm` };
  }
  return { keyring: { side: side as TextKeyringSide, diameter } };
}

/** layerling_layer_text's `layers` (#215): a corner other than round, bevel or miter is refused; null when they are fine. */
export function layerTextLayersError(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  const bad = value.findIndex((layer) => layer && typeof layer === "object" && (layer as { join?: unknown }).join !== undefined && !isTextLayerJoin((layer as { join?: unknown }).join));
  return bad >= 0 ? `layers[${bad}].join must be round, bevel or miter` : null;
}

/** A shape's own (x, y, z) offset in the world: its turn applied, as the scene turns it. */
function turned(shape: WorkplaneShape, offset: { x: number; z: number }) {
  const euler = new THREE.Euler(
    THREE.MathUtils.degToRad(shape.rotationX ?? 0),
    THREE.MathUtils.degToRad(shape.rotation ?? 0),
    THREE.MathUtils.degToRad(shape.rotationZ ?? 0),
    "XYZ",
  );
  return new THREE.Vector3(offset.x, 0, offset.z).applyEuler(euler);
}

/** The letters as a text without any fill: what every layer is built from. */
export function textLayerSource(text: WorkplaneShape): WorkplaneShape {
  const letters = textLetterBox(text);
  // Beside an ear (#215) the letters sit off the middle of the box; the source stands where they are.
  const middle = turned(text, textLetterOffset(text));
  const { textStroke: _stroke, textSilhouette: _silhouette, textKeyring: _keyring, ...rest } = text;
  // A layer is named "<name> <number>"; the stack's name is the part before the number.
  return {
    ...rest,
    name: text.name.replace(/\s\d+$/, ""),
    x: round(text.x + middle.x),
    z: round(text.z + middle.z),
    elevation: round((text.elevation ?? 0) + middle.y),
    width: letters.width,
    depth: letters.depth,
    size: Math.max(letters.width, letters.depth),
  };
}

const growStroke = (grow: number, join: SketchStrokeJoin = "round"): SketchStroke | undefined => (grow > 0 ? { width: grow, align: "grow", join, cap: "flat" } : undefined);

/**
 * The key ring hole (#215) of each layer, top to bottom: the bottom layer carries the ear, the hole
 * sits as far beyond the letters as the bottom layer reaches plus the ear's radius, and a layer
 * above gets the hole only where it reaches that far itself.
 */
function layerKeyrings(layers: readonly TextLayer[], keyring: NameTagKeyring | null): (TextKeyring | undefined)[] {
  if (!keyring || !layers.length) return layers.map(() => undefined);
  const bottom = layers[layers.length - 1];
  const offset = round(textFillExtent({ textStroke: growStroke(bottom.grow) }) + keyringEarRadius(keyring.diameter));
  return layers.map((layer, index) => {
    if (index === layers.length - 1) return { side: keyring.side, diameter: keyring.diameter, offset, ear: true };
    const reach = textFillExtent({ textStroke: growStroke(layer.grow) });
    return offset - keyring.diameter / 2 < reach ? { side: keyring.side, diameter: keyring.diameter, offset } : undefined;
  });
}

/**
 * The layers as texts standing in the world, bottom layer first on the source's elevation and
 * each next one on top of the one below; all share the source's letters, place and turn, so the
 * letters line up through the stack. `ids` keep the layers' ids when a stack is built again.
 */
export function textLayerShapes(source: WorkplaneShape, layers: readonly TextLayer[], ids: (string | undefined)[] = [], keyring: NameTagKeyring | null = null): WorkplaneShape[] {
  const letters = textLayerSource(source);
  const base = letters.elevation ?? 0;
  // Curved text has no key ring hole.
  const keyrings = layerKeyrings(layers, letters.textCurved ? null : keyring);
  const bottomUp = [...layers].reverse();
  let elevation = base;
  const shapes = bottomUp.map((layer, fromBottom) => {
    const index = layers.length - 1 - fromBottom;
    const stroke = growStroke(layer.grow, layer.join);
    const extent = textFillExtent({ textStroke: stroke });
    const layerKeyring = keyrings[index];
    let shape: WorkplaneShape = {
      ...letters,
      id: ids[index] ?? `${letters.id}-layer-${index + 1}`,
      name: layers.length > 1 ? `${letters.name} ${index + 1}` : letters.name,
      color: layer.color,
      hole: false,
      height: layer.height,
      elevation: round(elevation),
      width: round(letters.width + 2 * extent),
      depth: round(letters.depth + 2 * extent),
      size: 0,
      ...(stroke ? { textStroke: stroke } : {}),
      ...(layer.silhouette ? { textSilhouette: true } : {}),
      ...(layerKeyring ? { textKeyring: layerKeyring } : {}),
    };
    if (layerKeyring?.ear) {
      // The ear widens the box on its side; the box moves by half of that, so the letters stay put.
      const reach = textKeyringReach(shape);
      shape = {
        ...shape,
        width: round(letters.width + 2 * extent + (layerKeyring.side === "top" ? 0 : reach)),
        depth: round(letters.depth + 2 * extent + (layerKeyring.side === "top" ? reach : 0)),
      };
      const middle = turned(shape, textLetterOffset(shape));
      shape = { ...shape, x: round(letters.x - middle.x), z: round(letters.z - middle.z), elevation: round(elevation - middle.y) };
    }
    shape.size = Math.max(shape.width ?? 0, shape.depth ?? 0);
    elevation += layer.height;
    return shape;
  });
  return shapes.reverse();
}

/** A name tag as its card shows it: the letters, the layers top to bottom, their ids and the key ring hole. */
export type TextLayerStack = { source: WorkplaneShape; layers: TextLayer[]; ids: string[]; keyring: NameTagKeyring | null };

/**
 * Reads a stack back from its layers (texts standing in the world, any order): the letters
 * without a fill, and the layer settings top to bottom. Null when the shapes are not one text's
 * layers - another kind among them, different words or fonts.
 */
export function textLayersOf(shapes: WorkplaneShape[]): TextLayerStack | null {
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
      // A wider layer's corners (#215); round is the default and is left out.
      ...(stroke?.align === "grow" && stroke.join !== "round" ? { join: stroke.join } : {}),
    }, DEFAULT_TEXT_LAYERS[0]);
  });
  // The letters are the same in every layer; the top one is as good a source as any.
  const source = textLayerSource(topDown[0]);
  const bottom = topDown[topDown.length - 1];
  // The key ring hole (#215) is the bottom layer's, where the ear is.
  const ring = textKeyringOf(bottom);
  const keyring = ring ? { side: ring.side, diameter: ring.diameter } : null;
  return { source: { ...source, elevation: bottom.elevation ?? 0 }, layers, ids: topDown.map((shape) => shape.id), keyring };
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
