import * as THREE from "three";
import { quaternionForShape } from "@/lib/geometryRotation";
import { NAME_TAG_GAP, NAME_TAG_LAYERS } from "@/lib/nameTag";
import { sketchBodyStretch, stretchedSketchProfile } from "@/lib/sketchResize";
import { normalizeSketchStroke } from "@/lib/sketchStroke";
import { iconKeyringFor } from "@/lib/sketchKeyring";
import { DEFAULT_TEXT_LAYERS, MAX_TEXT_LAYERS, normalizeTextLayer, type NameTagKeyring, type TagFlush, type TextLayer } from "@/lib/textLayers";
import type { FlushLayer, SketchProfile, WorkplaneShape } from "@/types/layerling";

/**
 * The icon tag: the name tag's layers (#215) for an SVG icon instead of letters. Every layer is an
 * extruded sketch body of the icon's outline - the top one as drawn, those under it a "Wider" line
 * round it in the sketch body's own fill modes (#197) - so the layers line up and each keeps its
 * colour and height. The stack is a bundle flagged `layeredIcon`; the card reads it back from its
 * parts and builds it again on every change, as the name tag card does.
 */

/** The layers a new icon tag starts with: the name tag's - icon, rim, a 3 mm plate without holes. */
export const ICON_TAG_LAYERS: readonly TextLayer[] = NAME_TAG_LAYERS.map(({ edge: _edge, ...layer }) => ({ ...layer }));
/** How wide a new icon tag's icon is, in mm. */
export const DEFAULT_ICON_TAG_WIDTH = 30;
export const MIN_ICON_TAG_WIDTH = 2;
export const MAX_ICON_TAG_WIDTH = 250;
/** How many copies of a tag the card makes at most, as the name list. */
export const MAX_ICON_TAGS = 100;
/** The space between the copies on the plate, in mm, as between the tags of a name list. */
export const ICON_TAG_GAP = NAME_TAG_GAP;

/** Where a stack stands: the middle of its icon, the bottom of its lowest layer, and its turn. */
export type IconTagPlace = { x: number; z: number; elevation: number; rotation: number; rotationX: number; rotationZ: number };

/**
 * An icon tag as its card shows it: the icon's outline (an area, without the layer's line or
 * silhouette), how wide the icon is, the layers top to bottom with their ids, where it stands.
 */
export type IconLayerStack = {
  source: SketchProfile;
  width: number;
  layers: TextLayer[];
  ids: string[];
  place: IconTagPlace;
  name: string;
  /** The key ring hole the layers carry (#391), or null: its side and size; its middle follows from the icon and the layers. */
  keyring: NameTagKeyring | null;
  /** Laid in flush (#215): how deep the layers above the bottom one are set into it; null when stacked. */
  flush: TagFlush | null;
};

/** A body the icon layers can be built from or read back from: an extruded sketch, not a group. */
export function isIconLayerBody(shape: WorkplaneShape | null | undefined): shape is WorkplaneShape & { sketchProfile: SketchProfile } {
  // A face tool body is built set in from its sketch, which the layers would leave out.
  return Boolean(shape?.sketchProfile && shape.sketchOperation !== "revolve" && shape.sketchOperation !== "sweep" && !shape.groupedShapes?.length && shape.kind !== "text" && !shape.sketchProfile.inset);
}

/**
 * The outline a layer is built from: the points and segments of the sketch, without a layer's
 * "Wider" line or silhouette. A line of another kind (a drawing made of lines) stays: it is part
 * of the icon, and the build turns it into its area first.
 */
export function iconSourceProfile(profile: SketchProfile): SketchProfile {
  const stroke = normalizeSketchStroke(profile.stroke);
  return {
    points: profile.points.map((point) => ({ ...point })),
    segments: profile.segments.map((segment) => ({ ...segment })),
    ...(stroke && stroke.align !== "grow" ? { stroke } : {}),
  };
}

/**
 * A layer's sketch: the icon's area, with a "Wider" line round it and without its holes as the row says.
 * With a key ring hole (#391) every layer has the hole; the bottom one, `ear`, has the tab round it too.
 */
export function iconLayerProfile(area: SketchProfile, layer: TextLayer, keyring?: NonNullable<SketchProfile["keyring"]>, flush?: FlushLayer): SketchProfile {
  return {
    points: area.points.map((point) => ({ ...point })),
    segments: area.segments.map((segment) => ({ ...segment })),
    ...(layer.grow > 0 ? { stroke: { width: layer.grow, align: "grow" as const, join: layer.join ?? "round", cap: "flat" as const } } : {}),
    ...(layer.silhouette ? { silhouette: true } : {}),
    ...(keyring ? { keyring: { ...keyring } } : {}),
    // Laid in flush (#215): the pocket the layer above lies in.
    ...(flush ? { flush: { ...flush } } : {}),
  };
}

/**
 * The key ring hole of each layer, top to bottom: the same middle for all, which lies beyond the widest
 * layer's reach, and the ear on the bottom one only. Undefined for every layer without a hole.
 */
export function iconLayerKeyrings(area: SketchProfile, layers: readonly TextLayer[], keyring: NameTagKeyring | null | undefined): (NonNullable<SketchProfile["keyring"]> | undefined)[] {
  if (!keyring || !layers.length) return layers.map(() => undefined);
  const reach = Math.max(0, ...layers.map((layer) => layer.grow));
  const bottom = iconKeyringFor(area, reach, keyring.side, keyring.diameter, true, keyring.along, layers[layers.length - 1].grow, keyring.free);
  if (!bottom) return layers.map(() => undefined);
  const { ear: _ear, ...hole } = bottom;
  return layers.map((_, index) => (index === layers.length - 1 ? bottom : { ...hole }));
}

/** The icon's outline at `factor` times its size, about the middle of its points; 1 leaves it as it is. */
export function scaledIconProfile(profile: SketchProfile, factor: number): SketchProfile {
  if (!Number.isFinite(factor) || factor <= 0 || Math.abs(factor - 1) < 1e-9) return profile;
  const { images: _images, ...scaled } = stretchedSketchProfile(profile, factor, factor);
  return scaled;
}

const outlineKey = (profile: SketchProfile) => `${profile.points.length}/${profile.segments.length}`;

/**
 * Reads a stack back from its layers as they stand in the world, any order: one sketch body is a
 * stack of one layer, itself. Null when the parts are not one icon's layers - another kind among
 * them, or outlines that differ.
 */
export function iconLayersOf(shapes: WorkplaneShape[]): IconLayerStack | null {
  if (!shapes.length || shapes.length > MAX_TEXT_LAYERS || !shapes.every(isIconLayerBody)) return null;
  const bodies = shapes as Array<WorkplaneShape & { sketchProfile: SketchProfile }>;
  if (new Set(bodies.map((shape) => outlineKey(shape.sketchProfile))).size !== 1) return null;
  // Ordered along the tag's own up, which is not the world's on a side face (#696).
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(quaternionForShape(bodies[0]));
  const footOf = (shape: WorkplaneShape) => new THREE.Vector3(shape.x, (shape.elevation ?? 0) + shape.height / 2, shape.z).addScaledVector(up, -shape.height / 2);
  // Laid in flush (#215) the layers above the bottom one start on one level: the narrower is the one above.
  const grownBy = (shape: WorkplaneShape & { sketchProfile: SketchProfile }) => {
    const stroke = normalizeSketchStroke(shape.sketchProfile.stroke);
    return stroke?.align === "grow" ? stroke.width : 0;
  };
  const level = (shape: WorkplaneShape) => footOf(shape).dot(up);
  const topDown = [...bodies].sort((a, b) => (Math.abs(level(b) - level(a)) > 1e-6 ? level(b) - level(a) : grownBy(a) - grownBy(b)));
  const layers = topDown.map((shape, index) => {
    const stroke = normalizeSketchStroke(shape.sketchProfile.stroke);
    const grown = stroke?.align === "grow";
    return normalizeTextLayer({
      // The top layer is the icon itself: a line round it belongs to the icon, not to the layer.
      grow: index > 0 && grown ? stroke.width : 0,
      // A layer laid in flush keeps its own height in the stack (#215).
      height: shape.sketchProfile.flush?.height ?? shape.height,
      color: shape.color,
      silhouette: Boolean(shape.sketchProfile.silhouette),
      ...(index > 0 && grown && stroke.join !== "round" ? { join: stroke.join } : {}),
    }, DEFAULT_TEXT_LAYERS[Math.min(index, DEFAULT_TEXT_LAYERS.length - 1)]);
  });
  const top = topDown[0];
  const bottom = topDown[topDown.length - 1];
  // A body stretched with its handles keeps that size: the outline is read at it.
  const stretch = sketchBodyStretch(top);
  const outline = iconSourceProfile(top.sketchProfile);
  const source = stretch ? (({ images: _images, ...profile }) => profile)(stretchedSketchProfile(outline, stretch.x, stretch.z)) : outline;
  const holed = bodies.find((shape) => shape.sketchProfile.keyring);
  // The place is the middle of the underside: the top layer's middle slid down its up onto the bottom layer's underside.
  const foot = footOf(top).addScaledVector(up, footOf(bottom).dot(up) - footOf(top).dot(up));
  return {
    source,
    width: top.width,
    layers,
    keyring: holed?.sketchProfile.keyring
      ? {
        side: holed.sketchProfile.keyring.side,
        diameter: holed.sketchProfile.keyring.diameter,
        ...(holed.sketchProfile.keyring.along ? { along: holed.sketchProfile.keyring.along } : {}),
        ...(holed.sketchProfile.keyring.free ? { free: holed.sketchProfile.keyring.free } : {}),
      }
      : null,
    ids: topDown.map((shape) => shape.id),
    // Laid in flush (#215) when the bottom layer carries a pocket.
    flush: topDown.length > 1 && bottom.sketchProfile.flush?.pocket ? { depth: bottom.sketchProfile.flush.depth } : null,
    place: {
      x: foot.x,
      z: foot.z,
      elevation: Math.round(foot.y * 1000) / 1000,
      rotation: top.rotation ?? 0,
      rotationX: top.rotationX ?? 0,
      rotationZ: top.rotationZ ?? 0,
    },
    name: top.name.replace(/\s\d+$/, ""),
  };
}

/**
 * The elevation of every layer, top to bottom: the bottom one on `base`, each next on the one below. Laid in flush
 * (#215, `depth`), every layer above the bottom one stands `depth` below the bottom layer's top.
 */
export function iconLayerElevations(layers: readonly TextLayer[], base: number, depth?: number): number[] {
  if (depth !== undefined && layers.length > 1) {
    const top = base + layers[layers.length - 1].height;
    return layers.map((_, index) => Math.round((index === layers.length - 1 ? base : top - depth) * 1000) / 1000);
  }
  const elevations: number[] = [];
  let elevation = base;
  for (let index = layers.length - 1; index >= 0; index -= 1) {
    elevations[index] = Math.round(elevation * 1000) / 1000;
    elevation += layers[index].height;
  }
  return elevations;
}

/** How many tags of this footprint fit on the plate side by side, `gap` apart, at most `limit`; 0 when not one. */
export function iconTagFitCount(tag: { width: number; depth: number }, plate: { width: number; depth: number }, gap = ICON_TAG_GAP, limit = MAX_ICON_TAGS) {
  if (!(tag.width > 0 && tag.depth > 0 && plate.width > 0 && plate.depth > 0)) return 0;
  // A hair of tolerance, so a tag exactly as wide as the room still counts.
  const across = Math.floor((plate.width + gap) / (tag.width + gap) + 1e-9);
  const along = Math.floor((plate.depth + gap) / (tag.depth + gap) + 1e-9);
  return Math.max(0, Math.min(limit, across * along));
}

/**
 * Where `count` tags go: the middles of a grid centred on the plate's middle (the origin), row by
 * row from the back, as many to a row as the plate's width takes (at least one), `gap` apart.
 */
export function iconTagGrid(count: number, tag: { width: number; depth: number }, plate: { width: number; depth: number }, gap = ICON_TAG_GAP) {
  const total = Math.max(0, Math.floor(count));
  if (!total) return [];
  const fit = Math.floor((plate.width + gap) / (tag.width + gap) + 1e-9);
  const columns = Math.max(1, Math.min(total, fit));
  const rows = Math.ceil(total / columns);
  const spanX = columns * tag.width + (columns - 1) * gap;
  const spanZ = rows * tag.depth + (rows - 1) * gap;
  const clean = (value: number) => (Math.abs(value) < 1e-9 ? 0 : Math.round(value * 1000) / 1000);
  return Array.from({ length: total }, (_, index) => ({
    x: clean(-spanX / 2 + tag.width / 2 + (index % columns) * (tag.width + gap)),
    z: clean(-spanZ / 2 + tag.depth / 2 + Math.floor(index / columns) * (tag.depth + gap)),
  }));
}

/** A count typed into the card: a whole number from 1 to MAX_ICON_TAGS. */
export function normalizeIconTagCount(value: number) {
  return Number.isFinite(value) ? Math.min(MAX_ICON_TAGS, Math.max(1, Math.round(value))) : 1;
}
