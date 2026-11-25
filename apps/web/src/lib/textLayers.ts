import * as THREE from "three";
import { loadedManifoldRuntime } from "@/lib/manifoldHandle";
import { normalizeSketchStroke, SKETCH_STROKE_JOINS } from "@/lib/sketchStroke";
import { DEFAULT_FLUSH_DEPTH, flushDepthFor, MAX_FLUSH_DEPTH, MIN_FLUSH_DEPTH } from "@/lib/flushLayers";
import { normalizeTextEdge, topTextEdge } from "@/lib/textEdge";
import { textBackClipped, textOutlineClearance, textOutlineReach } from "@/lib/textFill";
import { DEFAULT_KEYRING_DIAMETER, freeKeyringAt, KEYRING_HOLE_EDGE_DISTANCE, keyringAlongLimit, keyringEarRadius, MAX_KEYRING_DIAMETER, MIN_KEYRING_DIAMETER, TEXT_KEYRING_SIDES, textFillExtent, textKeyringOf, textKeyringReaches, textLetterBox, textLetterOffset } from "@/lib/textGeometry";
import { normalizeTagBack, tagBackDepthFor } from "@/lib/tagBack";
import type { FlushLayer, FreeKeyring, SketchStroke, SketchStrokeJoin, TagBack, TextEdge, TextKeyring, TextKeyringSide, WorkplaneShape } from "@/types/layerling";

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
  /**
   * The top edge of this layer's letters rounded or chamfered (#225), as the name tag card's
   * "Letter edge" sets it on the top layer. Left out the edge is as sharp as it was.
   */
  edge?: TextEdge;
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
    // A layer's edge is on its top only (topTextEdge): on the bottom it would cut a groove where it meets the layer under it.
    ...(topTextEdge(layer.edge) ? { edge: topTextEdge(layer.edge) } : {}),
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

/**
 * A name tag's key ring hole as the card sets it: the side, the hole's diameter and how far the tab
 * sits off the middle of its side (#671): up on the left and right, to the right on top; 0 or left out is the middle.
 * `free` (#598) when it was placed freely, where a key ring tab of its own was fixed; side and along are not used then.
 */
export type NameTagKeyring = { side: TextKeyringSide; diameter: number; along?: number; free?: FreeKeyring };

/** The tab's shift along its side (#671), kept within the side. */
function clampedAlong(along: number | undefined, limit: number) {
  return round(Math.min(limit, Math.max(-limit, along ?? 0)));
}

/** How far a name tag's tab can move along its side (#671): within the bottom layer's side. */
export function nameTagKeyringAlongLimit(source: WorkplaneShape, layers: readonly TextLayer[], keyring: Pick<NameTagKeyring, "side" | "diameter">) {
  const letters = textLetterBox(source);
  const bottom = layers[layers.length - 1];
  const extent = bottom ? textFillExtent({ textStroke: growStroke(bottom.grow, bottom.join) }) : 0;
  return keyringAlongLimit((keyring.side === "top" ? letters.width : letters.depth) + 2 * extent, keyring.diameter);
}

/**
 * A key ring as layerling_layer_text and layerling_layer_icon take it: a side, or (#598) `free`
 * with the hole's middle `at` in mm from the middle of the letters or the icon, seen from above in
 * the tag's own frame, and the ear's direction and length when given.
 */
export type KeyringArgument = NameTagKeyring & { at?: { x: number; z: number; angle?: number; length?: number } };

/**
 * layerling_layer_text's `keyring` (#215): left out it stays as it is (undefined); false or null
 * takes it off; true puts a 4 mm hole on the left; { side, diameter, along } puts that one on, `along`
 * mm off the middle of its side (#671, kept within the side); side "free" (#598) with x and z puts
 * it there. A side other than left, right, top or free, a free hole without its place, or a number
 * out of range, is refused, not bent into range.
 */
export function layerTextKeyringArgument(value: unknown): { keyring: KeyringArgument | null } | { error: string } | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === false) return { keyring: null };
  if (value === true) return { keyring: { side: "left", diameter: DEFAULT_KEYRING_DIAMETER } };
  if (typeof value !== "object" || Array.isArray(value)) return { error: "keyring must be { side, diameter }, true, or false to take it off" };
  const candidate = value as Record<string, unknown>;
  const side = candidate.side ?? "left";
  if (side !== "free" && !TEXT_KEYRING_SIDES.includes(side as TextKeyringSide)) return { error: "keyring.side must be left, right, top or free" };
  const diameter = candidate.diameter ?? DEFAULT_KEYRING_DIAMETER;
  if (typeof diameter !== "number" || !Number.isFinite(diameter) || diameter < MIN_KEYRING_DIAMETER || diameter > MAX_KEYRING_DIAMETER) {
    return { error: `keyring.diameter must be ${MIN_KEYRING_DIAMETER} to ${MAX_KEYRING_DIAMETER} mm` };
  }
  if (side !== "free") {
    const along = candidate.along ?? 0;
    if (typeof along !== "number" || !Number.isFinite(along)) return { error: "keyring.along must be a number of mm" };
    return { keyring: { side: side as TextKeyringSide, diameter, ...(along ? { along } : {}) } };
  }
  const within = (entry: unknown) => typeof entry === "number" && Number.isFinite(entry) && Math.abs(entry) <= 1000;
  if (!within(candidate.x) || !within(candidate.z)) return { error: "a free keyring needs x and z: the hole's middle in mm from the middle of the letters or the icon, -1000 to 1000" };
  if (candidate.angle !== undefined && !within(candidate.angle)) return { error: "keyring.angle must be a number of degrees" };
  if (candidate.length !== undefined && !(within(candidate.length) && (candidate.length as number) >= 0)) return { error: "keyring.length must be 0 to 1000 mm" };
  return {
    keyring: {
      side: "left",
      diameter,
      at: {
        x: candidate.x as number,
        z: candidate.z as number,
        ...(candidate.angle !== undefined ? { angle: candidate.angle as number } : {}),
        ...(candidate.length !== undefined ? { length: candidate.length as number } : {}),
      },
    },
  };
}

/**
 * A key ring from layerling_layer_text or layerling_layer_icon as the tag stores it (#598): a free
 * hole `at` a place becomes one kept to the nearest corner of the box of the letters or the icon.
 * Left out, the ear points at the middle of the box and runs until it is half its width inside it.
 */
export function placedKeyring(keyring: KeyringArgument | null, box: { width: number; depth: number }): NameTagKeyring | null {
  if (!keyring) return null;
  const { at, ...plain } = keyring;
  if (!at) return plain;
  const radius = keyringEarRadius(keyring.diameter);
  const angle = at.angle ?? (Math.hypot(at.x, at.z) > 1e-9 ? THREE.MathUtils.radToDeg(Math.atan2(-at.z, -at.x)) : 0);
  // How far the hole's middle lies outside the box, straight across: the ear reaches that far in and half its width more.
  const outside = Math.hypot(Math.max(0, Math.abs(at.x) - box.width / 2), Math.max(0, Math.abs(at.z) - box.depth / 2));
  const length = at.length ?? outside + radius;
  return { side: "left", diameter: keyring.diameter, free: freeKeyringAt({ x: at.x, z: at.z }, box, angle, length) };
}

/** layerling_layer_text's `layers` (#215): a corner other than round, bevel or miter is refused; null when they are fine. */
export function layerTextLayersError(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  const bad = value.findIndex((layer) => layer && typeof layer === "object" && (layer as { join?: unknown }).join !== undefined && !isTextLayerJoin((layer as { join?: unknown }).join));
  if (bad >= 0) return `layers[${bad}].join must be round, bevel or miter`;
  const badEdge = value.findIndex((layer) => layer && typeof layer === "object" && (layer as { edge?: unknown }).edge !== undefined && !normalizeTextEdge((layer as { edge?: unknown }).edge));
  return badEdge >= 0 ? `layers[${badEdge}].edge must be a round or chamfer edge with a size` : null;
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

/** Which way a shape's own up points: the stack grows that way, on a side face too (#696). */
function upOf(shape: WorkplaneShape) {
  return new THREE.Vector3(0, 1, 0).applyEuler(new THREE.Euler(
    THREE.MathUtils.degToRad(shape.rotationX ?? 0),
    THREE.MathUtils.degToRad(shape.rotation ?? 0),
    THREE.MathUtils.degToRad(shape.rotationZ ?? 0),
    "XYZ",
  ));
}

/** The middle of a shape's underside: it turns about its middle, so on a side face that is not (x, elevation, z). */
function footOf(shape: WorkplaneShape) {
  const middle = new THREE.Vector3(shape.x, (shape.elevation ?? 0) + shape.height / 2, shape.z);
  return middle.addScaledVector(upOf(shape), -shape.height / 2);
}

/** Where a shape of `height` and `shape`'s turn stands with its underside's middle on `foot`. */
function placedOnFoot(shape: WorkplaneShape, foot: THREE.Vector3, height: number) {
  const middle = foot.clone().addScaledVector(upOf(shape), height / 2);
  return { x: round(middle.x), z: round(middle.z), elevation: round(middle.y - height / 2) };
}

/** The letters as a text without any fill: what every layer is built from. */
export function textLayerSource(text: WorkplaneShape): WorkplaneShape {
  const letters = textLetterBox(text);
  // Beside an ear (#215) the letters sit off the middle of the box; the source stands where they are.
  const middle = turned(text, textLetterOffset(text));
  const { textStroke: _stroke, textSilhouette: _silhouette, textKeyring: _keyring, textEdge: _edge, textFlush: _flush, textBack: _back, textBackFill: _backFill, ...rest } = text;
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
 * The key ring hole (#215) of each layer, top to bottom: the bottom layer carries the ear. The
 * tab's flat end sits where the bottom layer's outline reaches furthest in the band the tab runs
 * in (its width, across the middle of its side) - its real outline when the 2D kernel is there,
 * else its box - and the hole's edge KEYRING_HOLE_EDGE_DISTANCE beyond that. A layer above gets
 * the hole only where it reaches into it. `along` moves the band and the hole along the side (#671).
 */
function layerKeyrings(letters: WorkplaneShape, layers: readonly TextLayer[], keyring: NameTagKeyring | null): (TextKeyring | undefined)[] {
  if (!keyring || !layers.length) return layers.map(() => undefined);
  const { side, diameter } = keyring;
  // A free hole (#598) stands where it was put, the same for every layer: the ear on the bottom one,
  // the hole through all - a layer it does not reach keeps its outline.
  if (keyring.free) {
    const free = keyring.free;
    return layers.map((_, index) => (index === layers.length - 1 ? { side, diameter, offset: 0, ear: true, free } : { side, diameter, offset: 0, free }));
  }
  const half = side === "top" ? (letters.depth ?? 0) / 2 : (letters.width ?? 0) / 2;
  const bottomLayer = layers[layers.length - 1];
  const bottomExtent = textFillExtent({ textStroke: growStroke(bottomLayer.grow, bottomLayer.join) });
  const limit = keyringAlongLimit((side === "top" ? letters.width ?? 0 : letters.depth ?? 0) + 2 * bottomExtent, diameter);
  const along = clampedAlong(keyring.along, limit);
  const shifted = along ? { along } : {};
  const runtime = loadedManifoldRuntime();
  // A layer as a text without a key ring, and how far its box reaches from the letters' middle.
  const layerText = (layer: TextLayer) => {
    const stroke = growStroke(layer.grow, layer.join);
    const extent = textFillExtent({ textStroke: stroke });
    const { textStroke: _stroke, textSilhouette: _silhouette, textKeyring: _keyring, textEdge: _edge, textFlush: _flush, textBack: _back, textBackFill: _backFill, ...plain } = letters;
    const shape: WorkplaneShape = { ...plain, width: (letters.width ?? 0) + 2 * extent, depth: (letters.depth ?? 0) + 2 * extent, ...(stroke ? { textStroke: stroke } : {}) };
    return { shape, box: half + extent };
  };
  const band = keyringEarRadius(diameter);
  const bottom = layerText(layers[layers.length - 1]);
  const plate = (runtime ? textOutlineReach(runtime, bottom.shape, side, band, along) : null) ?? bottom.box;
  const hole = plate + KEYRING_HOLE_EDGE_DISTANCE + diameter / 2;
  const offset = round(hole - half);
  return layers.map((layer, index) => {
    if (index === layers.length - 1) return { side, diameter, offset, ...shifted, ear: true };
    // A layer reaches into the hole where a hole's edge would have to stand further out to clear it.
    const { shape, box } = layerText(layer);
    const reach = runtime ? textOutlineClearance(runtime, shape, side, band, diameter / 2, along) : box + diameter / 2;
    return reach !== null && reach > hole + 1e-6 ? { side, diameter, offset, ...shifted } : undefined;
  });
}

/** A tag laid in flush (#215): how deep the layers above the bottom one are set into it, in mm. */
export type TagFlush = { depth: number };

/**
 * layerling_layer_text's and layerling_layer_icon's `flush` (#215): left out it stays as it is (undefined); false or
 * null stacks the layers again; true lays them in flush DEFAULT_FLUSH_DEPTH mm deep; a number, or { depth }, that deep.
 * A depth out of range is refused, not bent into range.
 */
export function tagFlushArgument(value: unknown): { flush: TagFlush | null } | { error: string } | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === false) return { flush: null };
  if (value === true) return { flush: { depth: DEFAULT_FLUSH_DEPTH } };
  const depth = typeof value === "number" ? value : value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>).depth ?? DEFAULT_FLUSH_DEPTH : undefined;
  if (typeof depth !== "number" || !Number.isFinite(depth) || depth < MIN_FLUSH_DEPTH || depth > MAX_FLUSH_DEPTH) {
    return { error: `flush must be true, false, or a depth of ${MIN_FLUSH_DEPTH} to ${MAX_FLUSH_DEPTH} mm` };
  }
  return { flush: { depth: round(depth) } };
}

/**
 * Each layer's flush setting (#215), top to bottom, for a tag laid in flush: the depth the layers are set in (kept on
 * the bottom layer's height), the layer's own height in the stack, and the pocket the layer above it lies in. Every
 * layer undefined for a stacked tag, or one of a single layer.
 */
export function flushLayersFor(layers: readonly TextLayer[], flush: TagFlush | null | undefined): (FlushLayer | undefined)[] {
  if (!flush || layers.length < 2) return layers.map(() => undefined);
  const depth = flushDepthFor(flush.depth, layers[layers.length - 1].height);
  return layers.map((layer, index) => {
    const above = index > 0 ? layers[index - 1] : null;
    return {
      depth,
      height: layer.height,
      ...(above ? { pocket: { grow: above.grow, ...(above.join ? { join: above.join } : {}), ...(above.silhouette ? { silhouette: true } : {}) } } : {}),
    };
  });
}

/**
 * The layers as texts standing in the world, bottom layer first on the source's elevation and
 * each next one on top of the one below; all share the source's letters, place and turn, so the
 * letters line up through the stack. `ids` keep the layers' ids when a stack is built again.
 * Laid in flush (#215, `flush`), the layers above the bottom one are all `depth` high and end on
 * the bottom layer's top, each in a pocket of the one under it.
 */
export function textLayerShapes(source: WorkplaneShape, layers: readonly TextLayer[], ids: (string | undefined)[] = [], keyring: NameTagKeyring | null = null, flush: TagFlush | null = null, back: TagBack | null = null): WorkplaneShape[] {
  const letters = textLayerSource(source);
  // The stack grows along the letters' own up, so a tag on a side face stands out of it (#696).
  const foot = footOf(letters);
  const up = upOf(letters);
  // Curved text has no key ring hole.
  const keyrings = layerKeyrings(letters, layers, letters.textCurved ? null : keyring);
  const flushes = flushLayersFor(layers, flush);
  // Text on the back (tagBack.ts), in the tag's own font; curved text has none.
  const backText = back && !letters.textCurved ? normalizeTagBack({ ...back, font: letters.font ?? back.font }) ?? null : null;
  const bottomUp = [...layers].reverse();
  let below = 0;
  const shapes = bottomUp.map((layer, fromBottom) => {
    const index = layers.length - 1 - fromBottom;
    const stroke = growStroke(layer.grow, layer.join);
    const extent = textFillExtent({ textStroke: stroke });
    const layerKeyring = keyrings[index];
    const layerFlush = flushes[index];
    // Laid in flush every layer above the bottom one stands in its pocket, its top on the bottom layer's.
    const height = layerFlush && index < layers.length - 1 ? layerFlush.depth : layer.height;
    const rise = layerFlush && index < layers.length - 1 ? layers[layers.length - 1].height - layerFlush.depth : below;
    const place = placedOnFoot(letters, foot.clone().addScaledVector(up, rise), height);
    let shape: WorkplaneShape = {
      ...letters,
      id: ids[index] ?? `${letters.id}-layer-${index + 1}`,
      name: layers.length > 1 ? `${letters.name} ${index + 1}` : letters.name,
      color: layer.color,
      hole: false,
      height,
      ...place,
      width: round(letters.width + 2 * extent),
      depth: round(letters.depth + 2 * extent),
      size: 0,
      ...(stroke ? { textStroke: stroke } : {}),
      ...(layer.silhouette ? { textSilhouette: true } : {}),
      ...(layer.edge ? { textEdge: layer.edge } : {}),
      ...(layerKeyring ? { textKeyring: layerKeyring } : {}),
      ...(layerFlush ? { textFlush: layerFlush } : {}),
    };
    if (layerKeyring?.ear) {
      // The ear widens the box on its side; the box moves by half of that, so the letters stay put.
      const reach = textKeyringReaches(shape);
      shape = {
        ...shape,
        width: round(letters.width + 2 * extent + reach.left + reach.right),
        depth: round(letters.depth + 2 * extent + reach.top + reach.bottom),
      };
      const middle = turned(shape, textLetterOffset(shape));
      shape = { ...shape, x: round(place.x - middle.x), z: round(place.z - middle.z), elevation: round(place.elevation - middle.y) };
    }
    shape.size = Math.max(shape.width ?? 0, shape.depth ?? 0);
    below += layer.height;
    return shape;
  });
  const topDown = shapes.reverse();
  return backText ? withTagBack(topDown, backText, flushes[layers.length - 1]?.depth ?? 0, up, ids[layers.length]) : topDown;
}

/**
 * Text on a name tag's back: the bottom layer (the last of `topDown`) gets it, sunk in as deep as the layer allows
 * under a flush pocket `pocketDepth` deep, and with a fill colour a part of the layer's own outline and place fills
 * the letters from the underside up (the text built by tagBack.ts, `textBackFill`). `fillId` keeps the fill's id.
 */
function withTagBack(topDown: WorkplaneShape[], back: TagBack, pocketDepth: number, up: THREE.Vector3, fillId?: string): WorkplaneShape[] {
  const bottom = topDown[topDown.length - 1];
  const height = bottom.textFlush?.height ?? bottom.height;
  const depth = tagBackDepthFor(back.depth, height, pocketDepth);
  const sunk: TagBack = { text: back.text, size: back.size, depth, ...(back.font ? { font: back.font } : {}), ...(back.fill ? { fill: back.fill } : {}) };
  let carrier: WorkplaneShape = { ...bottom, textBack: sunk };
  // Letters past the layer's outline are cut off there; the card says so (tagBack.ts).
  const runtime = loadedManifoldRuntime();
  if (runtime && textBackClipped(runtime, carrier)) carrier = { ...carrier, textBack: { ...sunk, clipped: true } };
  if (!back.fill) return [...topDown.slice(0, -1), carrier];
  // The fill stands on the bottom layer's underside: its middle is the layer's, moved down its up by half of what it is lower.
  const middle = new THREE.Vector3(bottom.x, (bottom.elevation ?? 0) + bottom.height / 2, bottom.z).addScaledVector(up, -(bottom.height - depth) / 2);
  const { textFlush: _flush, textEdge: _edge, ...plain } = carrier;
  const fill: WorkplaneShape = {
    ...plain,
    id: fillId ?? `${bottom.id}-back`,
    name: `${bottom.name.replace(/\s\d+$/, "")} back`,
    color: back.fill,
    height: depth,
    x: round(middle.x),
    z: round(middle.z),
    elevation: round(middle.y - depth / 2) || 0,
    textBackFill: true,
  };
  return [...topDown.slice(0, -1), carrier, fill];
}

/** A name tag as its card shows it: the letters, the layers top to bottom, their ids, the key ring hole and whether it is laid in flush (#215). */
export type TextLayerStack = { source: WorkplaneShape; layers: TextLayer[]; ids: string[]; keyring: NameTagKeyring | null; flush: TagFlush | null; /** Text on the back (tagBack.ts), the fill's colour from its part; null without. */ back: TagBack | null; /** The fill part's id, kept when the tag is built again. */ backId?: string };

/**
 * Reads a stack back from its layers (texts standing in the world, any order): the letters
 * without a fill, and the layer settings top to bottom. Null when the shapes are not one text's
 * layers - another kind among them, different words or fonts.
 */
export function textLayersOf(all: WorkplaneShape[]): TextLayerStack | null {
  // The back text's fill (tagBack.ts) is no layer: it is read with the back.
  const fillPart = all.find((shape) => shape.kind === "text" && shape.textBackFill);
  const shapes = all.filter((shape) => !(shape.kind === "text" && shape.textBackFill));
  if (!shapes.length || shapes.some((shape) => shape.kind !== "text")) return null;
  const words = new Set(shapes.map((shape) => `${shape.text ?? "TEXT"}\u0000${shape.font ?? "Multilanguage"}\u0000${Boolean(shape.textCurved)}`));
  if (words.size !== 1) return null;
  // Ordered along the stack's own up, which is not the world's on a side face (#696).
  const up = upOf(shapes[0]);
  const level = (shape: WorkplaneShape) => footOf(shape).dot(up);
  // Laid in flush (#215) the layers above the bottom one start on one level: the narrower is the one above.
  const grownBy = (shape: WorkplaneShape) => textFillExtent({ textStroke: normalizeSketchStroke(shape.textStroke) });
  const topDown = [...shapes].sort((a, b) => (Math.abs(level(b) - level(a)) > 1e-6 ? level(b) - level(a) : grownBy(a) - grownBy(b)));
  const layers = topDown.map((shape) => {
    const stroke = normalizeSketchStroke(shape.textStroke);
    return normalizeTextLayer({
      grow: stroke?.align === "grow" ? stroke.width : stroke ? textFillExtent({ textStroke: stroke }) : 0,
      // A layer laid in flush keeps its own height in the stack (#215).
      height: shape.textFlush?.height ?? shape.height,
      color: shape.color,
      silhouette: shape.textSilhouette,
      // A wider layer's corners (#215); round is the default and is left out.
      ...(stroke?.align === "grow" && stroke.join !== "round" ? { join: stroke.join } : {}),
      // The top edge of the letters (#225).
      ...(shape.textEdge ? { edge: shape.textEdge } : {}),
    }, DEFAULT_TEXT_LAYERS[0]);
  });
  // The letters are the same in every layer; the top one is as good a source as any.
  const source = textLayerSource(topDown[0]);
  const bottom = topDown[topDown.length - 1];
  // The key ring hole (#215) is the bottom layer's, where the ear is.
  const ring = textKeyringOf(bottom);
  const keyring = ring ? { side: ring.side, diameter: ring.diameter, ...(ring.along ? { along: ring.along } : {}), ...(ring.free ? { free: ring.free } : {}) } : null;
  // Laid in flush (#215) when the bottom layer carries a pocket.
  const flush = topDown.length > 1 && bottom.textFlush?.pocket ? { depth: bottom.textFlush.depth } : null;
  // The letters where the top layer has them, slid down its up onto the bottom layer's underside.
  const foot = footOf(source).addScaledVector(up, level(bottom) - footOf(source).dot(up));
  // Text on the back is the bottom layer's; its fill's colour is the fill part's own, which may have been recoloured.
  const backRead = normalizeTagBack(bottom.textBack);
  const back = backRead ? { ...backRead, ...(fillPart ? { fill: fillPart.color } : {}) } : null;
  if (back && !fillPart) delete back.fill;
  return { source: { ...source, ...placedOnFoot(source, foot, source.height) }, layers, ids: topDown.map((shape) => shape.id), keyring, flush, back, ...(fillPart ? { backId: fillPart.id } : {}) };
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

