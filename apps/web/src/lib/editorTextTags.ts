
import * as THREE from "three";
import { t } from "@/lib/i18n";
import { quaternionForShape } from "@/lib/geometryRotation";
import { iconEarOffset, sketchOutlineBounds } from "@/lib/sketchKeyring";
import { nameTagOffsets, textLayerShapes, textLayersOf, type NameTagKeyring, type TextLayer, type TextLayerStack } from "@/lib/textLayers";
import { textLetterSize, textLetterSizePatch } from "@/lib/nameTag";
import { ICON_TAG_LAYERS, iconLayerElevations, iconLayerKeyrings, iconLayerProfile, iconLayersOf, iconSourceProfile, iconTagGrid, isIconLayerBody, MAX_ICON_TAG_WIDTH, MIN_ICON_TAG_WIDTH, normalizeIconTagCount, scaledIconProfile, type IconLayerStack, type IconTagPlace } from "@/lib/iconTag";
import { shapeBedFootprint } from "@/lib/printBed";
import { freeKeyringAt, freeKeyringCenter, KEYRING_HOLE_EDGE_DISTANCE, keyringEarRadius, MAX_KEYRING_DIAMETER, MIN_KEYRING_DIAMETER } from "@/lib/textGeometry";
import { canonicalizeShape, cloneWorkplaneShapeTreeWithFreshIds, shapeDepth, shapeWidth } from "@/lib/workplaneShapes";
import { createLocalId } from "@/lib/localIds";
import { importedShapeFromSvg } from "@/lib/svgImport";
import { sketchProfileFromSvg, svgSketchMatchesMesh } from "@/lib/svgSketch";
import { strokedSketchProfile } from "@/lib/sketchStroke";
import type { FreeKeyring, SketchProfile, WorkplaneShape } from "@/types/layerling";
import { getManifoldRuntime } from "@/lib/editorMeshCore";
import { groupedShape, restoreGroupedChildren } from "@/lib/editorBooleans";
import { cadShapeFromSketchProfile } from "@/lib/editorSketchCad";
import { iconFileName } from "@/lib/pictureIcon";

/**
 * The settings panel offers wrapping only where it is what people want: an
 * imported outline or model (an SVG above all), text and a sketch body. On a
 * box, a cylinder or a gear the card was only in the way; through MCP any
 * body can still be wrapped.
 */
/** A text, or a stack of text layers, that the layers card (#215) can work on. */
export function offersTextLayers(shape: WorkplaneShape | null | undefined) {
  if (!shape || shape.locked || shape.importedMesh || shape.cadBrep) return false;
  if (shape.kind === "text") return !shape.cylinderWrap;
  return Boolean(shape.layeredText && shape.groupOperation === "bundle" && shape.groupedShapes?.length);
}

/**
 * The text and layers a shape stands for: a plain text is one layer of itself; a layered-text
 * bundle is read from its parts as they stand in the world. Null for anything else.
 */
export function textLayerStack(shape: WorkplaneShape): TextLayerStack | null {
  if (shape.kind === "text") {
    return textLayersOf([shape]);
  }
  if (!shape.layeredText || !shape.groupedShapes?.length) return null;
  return textLayersOf(restoreGroupedChildren(shape));
}

/**
 * A text's layers as one shape: a bundle flagged as layered text, or, with one layer only, that
 * text itself. `keepId` and `name` carry over from the shape it replaces.
 */
export function layeredTextShape(source: WorkplaneShape, layers: readonly TextLayer[], ids: (string | undefined)[], keepId: string, keep: Pick<WorkplaneShape, "locked" | "hidden" | "name">, previousText?: string, keyring: NameTagKeyring | null = null): WorkplaneShape {
  const words = (source.text ?? "TEXT").trim() || "Text";
  // The stack is named after its words unless somebody gave it a name of its own.
  const name = !keep.name || keep.name === "Bundle" || keep.name === "Text" || keep.name === previousText ? words : keep.name;
  const parts = textLayerShapes(source, layers, ids, keyring);
  if (parts.length === 1) return canonicalizeShape({ ...parts[0], id: keepId, name, locked: keep.locked, hidden: keep.hidden });
  const group = groupedShape(parts);
  if (!group) throw new Error("Could not build the text layers");
  return canonicalizeShape({ ...group, id: keepId, name, groupOperation: "bundle", layeredText: true, locked: keep.locked, hidden: keep.hidden });
}

/**
 * The name tag panel (#215): the letters of a stack with other words, another font or another
 * letter size. New words or another font keep the letter size, so a tag grows with its name.
 */
export function nameTagSource(source: WorkplaneShape, change: { text?: string; font?: string; letterSize?: number; vertical?: boolean }): WorkplaneShape {
  const next = {
    ...source,
    ...(change.text !== undefined ? { text: change.text } : {}),
    ...(change.font !== undefined ? { font: change.font } : {}),
    // Vertical letters (#981): the tag turns upright and keeps its letter size.
    ...(change.vertical !== undefined ? { textVertical: change.vertical || undefined } : {}),
  };
  if (change.text === undefined && change.font === undefined && change.letterSize === undefined && change.vertical === undefined) return next;
  return { ...next, ...textLetterSizePatch(next, change.letterSize ?? textLetterSize(source)) };
}

/**
 * The panel's name list (#215): one tag per name like the given stack, at its letter size, in
 * rows and columns from the place of the first, which takes `first`'s id and its layers' ids.
 */
export function nameTagsFor(stack: { source: WorkplaneShape; layers: readonly TextLayer[]; keyring: NameTagKeyring | null }, names: readonly string[], gap: number, first: { id: string; ids: string[] }): WorkplaneShape[] {
  const tags = names.map((name, index) => layeredTextShape(
    nameTagSource(stack.source, { text: name }),
    stack.layers,
    index === 0 ? first.ids : [],
    index === 0 ? first.id : createLocalId("text-tag"),
    { locked: false, hidden: false, name },
    stack.source.text,
    stack.keyring,
  ));
  // Every tag is as wide as its name; the rows take the widest and deepest.
  const width = Math.max(...tags.map(shapeWidth));
  const depth = Math.max(...tags.map(shapeDepth));
  const columns = Math.max(1, Math.round(Math.sqrt((tags.length * (depth + gap)) / (width + gap))));
  const offsets = nameTagOffsets(tags.length, width, depth, gap, columns);
  return tags.map((tag, index) => (index === 0 ? tag : canonicalizeShape({ ...tag, x: tag.x + offsets[index].x, z: tag.z + offsets[index].z })));
}

/**
 * The icon tag: a sketch body (an imported SVG above all) or a stack of its layers that the icon
 * tag card can work on. A revolved sketch, a group or a locked body has no such card.
 */
export function offersIconLayers(shape: WorkplaneShape | null | undefined) {
  if (!shape || shape.locked || shape.cylinderWrap) return false;
  if (isIconLayerBody(shape)) return !shape.edgeTreatments?.length;
  return Boolean(shape.layeredIcon && shape.groupOperation === "bundle" && shape.groupedShapes?.length);
}

/** The icon and layers a shape stands for: a sketch body is one layer of itself; an icon tag is read from its parts. */
export function iconLayerStack(shape: WorkplaneShape): IconLayerStack | null {
  if (isIconLayerBody(shape)) return iconLayersOf([shape]);
  if (!shape.layeredIcon || !shape.groupedShapes?.length) return null;
  return iconLayersOf(restoreGroupedChildren(shape));
}

/**
 * The icon's outline as an area at the width asked for: a drawing made of lines becomes the area
 * of its line first, so every layer can take a "Wider" line round it. `width` is the icon's,
 * `currentWidth` how wide the outline comes out as it is.
 */
export async function iconTagArea(source: SketchProfile, currentWidth: number, width: number) {
  let area: SketchProfile = { points: source.points, segments: source.segments };
  if (source.stroke) {
    const stroked = strokedSketchProfile(await getManifoldRuntime(), source);
    if (!stroked) throw new Error(t("sketch.strokeEmpty"));
    area = { points: stroked.points, segments: stroked.segments };
  }
  const wanted = Math.min(MAX_ICON_TAG_WIDTH, Math.max(MIN_ICON_TAG_WIDTH, width));
  return scaledIconProfile(area, wanted / Math.max(1e-6, currentWidth));
}

/**
 * An icon's layers as one shape, standing at `place`: each layer a sketch body built by the CAD
 * kernel, centred on the icon's middle, the bottom one on the place's elevation and each next
 * on the one below; a bundle flagged as an icon tag, or with one layer only, that body itself.
 */
export async function layeredIconShape(area: SketchProfile, layers: readonly TextLayer[], place: IconTagPlace, ids: (string | undefined)[], keepId: string, keep: Pick<WorkplaneShape, "locked" | "hidden" | "name">, keyring: NameTagKeyring | null = null): Promise<WorkplaneShape> {
  const name = keep.name || "Icon tag";
  // The place is the middle of the underside; the layers stack along the tag's own up, out of a side face too (#696).
  const turn = quaternionForShape(place);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(turn);
  const below = iconLayerElevations(layers, 0);
  const holes = iconLayerKeyrings(area, layers, keyring);
  const parts = await Promise.all(layers.map(async (layer, index) => {
    const built = await cadShapeFromSketchProfile(iconLayerProfile(area, layer, holes[index]), layer.height);
    // A body stands by the middle of its extent: the layer with the ear is moved back so that the icon stays where it was.
    const hole = holes[index];
    const earOffset = hole?.ear ? iconEarOffset(area, layer.grow, hole) : { x: 0, z: 0 };
    const middle = new THREE.Vector3(earOffset.x, 0, earOffset.z).applyQuaternion(turn)
      .add(new THREE.Vector3(place.x, place.elevation, place.z))
      .addScaledVector(up, below[index] + layer.height / 2);
    return canonicalizeShape({
      ...built,
      id: ids[index] ?? createLocalId("icon-layer"),
      name: layers.length > 1 ? `${name} ${index + 1}` : name,
      color: layer.color,
      hole: false,
      x: middle.x,
      z: middle.z,
      elevation: Math.round((middle.y - layer.height / 2) * 1000) / 1000,
      rotation: place.rotation,
      rotationX: place.rotationX,
      rotationZ: place.rotationZ,
    });
  }));
  if (parts.length === 1) return canonicalizeShape({ ...parts[0], id: keepId, name, locked: keep.locked, hidden: keep.hidden });
  const group = groupedShape(parts);
  if (!group) throw new Error("Could not build the icon layers");
  return canonicalizeShape({ ...group, id: keepId, name, groupOperation: "bundle", layeredIcon: true, locked: keep.locked, hidden: keep.hidden });
}

/**
 * Copies of a tag in a grid on the plate (the icon tag's count): `count` of them centred on the
 * plate's middle, as many to a row as its width takes, the first being the tag itself.
 */
export function iconTagCopies(tag: WorkplaneShape, count: number, plate: { width: number; depth: number }): WorkplaneShape[] {
  const footprint = shapeBedFootprint(tag);
  const size = { width: footprint.maxX - footprint.minX, depth: footprint.maxZ - footprint.minZ };
  // The grid places footprints; the tag's own point may sit off the middle of its footprint.
  const offsetX = tag.x - (footprint.minX + footprint.maxX) / 2;
  const offsetZ = tag.z - (footprint.minZ + footprint.maxZ) / 2;
  return iconTagGrid(normalizeIconTagCount(count), size, plate).map((spot, index) => canonicalizeShape({
    ...(index === 0 ? tag : cloneWorkplaneShapeTreeWithFreshIds(tag, `copy${index}`)),
    x: Math.round((spot.x + offsetX) * 1000) / 1000,
    z: Math.round((spot.z + offsetZ) * 1000) / 1000,
  }));
}

/**
 * An SVG file's icon as an area `width` mm wide, and the name a tag of it takes - the file's.
 * As the import does (#197), a drawing the kernel builds differently from the mesh is refused.
 */
export async function svgIconArea(fileName: string, text: string, width: number) {
  const profile = sketchProfileFromSvg(text);
  if (!profile) throw new Error(t("iconTag.unreadable"));
  const probe = await cadShapeFromSketchProfile(profile, 1).catch(() => null);
  if (!probe || !svgSketchMatchesMesh(probe, { ...importedShapeFromSvg(fileName, text), mirrorZ: true })) throw new Error(t("iconTag.unreadable"));
  const area = await iconTagArea(iconSourceProfile(profile), probe.width, width);
  return { area, name: iconFileName(fileName) || "Icon tag" };
}

/** An SVG file's text as a new icon tag in the start layers, `width` mm wide, standing on the plate's middle. */
export async function iconTagFromSvg(fileName: string, text: string, width: number): Promise<WorkplaneShape> {
  const { area, name } = await svgIconArea(fileName, text, width);
  return layeredIconShape(area, ICON_TAG_LAYERS, { x: 0, z: 0, elevation: 0, rotation: 0, rotationX: 0, rotationZ: 0 }, [], createLocalId("icon-tag"), { locked: false, hidden: false, name });
}

/** Where a key ring tab of its own (#598) holds its hole, seen from above in the world: the hole's middle, the way the tab runs to its straight end, how far, and the hole's size. */
export type KeyringTabPlace = { hole: { x: number; z: number }; direction: { x: number; z: number }; length: number; diameter: number };

/**
 * A key ring tab of its own (#598), for "Free" on the name tag and the icon tag: a plain group -
 * a capsule with the key ring hole cut through its round end - in the bottom layer's colour and
 * height, standing on the tag's floor. It is moved and turned like any other shape and then fixed
 * to the tag where it was put. Its measures are the side tab's (#215): as wide as the hole and a
 * 1.75 mm wall either side, a round end round the hole and a straight one `length` mm from the
 * hole's middle along `direction`.
 */
export function keyringTabAt(place: KeyringTabPlace, bottom: { color: string; height: number; elevation: number }, name: string): WorkplaneShape {
  const { hole, length, diameter } = place;
  const norm = Math.hypot(place.direction.x, place.direction.z) || 1;
  const along = { x: place.direction.x / norm, z: place.direction.z / norm };
  const radius = keyringEarRadius(diameter);
  const round = (value: number) => Math.round(value * 1000) / 1000;
  const base = { locked: false, hidden: false, rotation: 0, elevation: round(bottom.elevation), height: round(bottom.height) };
  // Built lying along +x with the hole's middle at the origin, from the far side of the round end
  // to the straight end; the whole tab is then turned, so its handles and its turn show the way it runs.
  const capsuleLength = length + radius;
  const capsule = canonicalizeShape({
    ...base,
    id: createLocalId("keyring-tab"),
    name,
    kind: "slot",
    color: bottom.color,
    hole: false,
    x: round((length - radius) / 2),
    z: 0,
    width: round(capsuleLength),
    depth: round(2 * radius),
    size: round(capsuleLength),
  });
  const cut = canonicalizeShape({
    ...base,
    id: createLocalId("keyring-hole"),
    name: "Hole",
    kind: "cylinder",
    color: bottom.color,
    hole: true,
    x: 0,
    z: 0,
    width: diameter,
    depth: diameter,
    size: diameter,
  });
  const group = groupedShape([capsule, cut]);
  if (!group) throw new Error("Could not build the key ring tab");
  const rotation = round(THREE.MathUtils.radToDeg(Math.atan2(-along.z, along.x)));
  // The tab turns about its own middle; it is put where its hole comes to lie on `hole`.
  const turned = new THREE.Vector3(-group.x, 0, -group.z).applyQuaternion(quaternionForShape({ rotation, rotationX: 0, rotationZ: 0 }));
  return canonicalizeShape({ ...group, id: createLocalId("keyring-tab"), name, color: bottom.color, keyringTab: true, rotation, x: round(hole.x - turned.x), z: round(hole.z - turned.z) });
}

/**
 * The tab "Free" puts beside a tag that has no free hole yet (#598): on the left of the tag,
 * pointing left, its hole's edge 2 mm beyond the tag's box and its straight end half its width
 * on the plate, as the side tab sits.
 */
export function keyringTabShape(tag: WorkplaneShape, bottom: { color: string; height: number; elevation: number }, diameter: number, name: string): WorkplaneShape {
  const footprint = shapeBedFootprint(tag);
  const radius = keyringEarRadius(diameter);
  const holeX = footprint.minX - KEYRING_HOLE_EDGE_DISTANCE - diameter / 2;
  const hole = { x: holeX, z: (footprint.minZ + footprint.maxZ) / 2 };
  return keyringTabAt({ hole, direction: { x: 1, z: 0 }, length: footprint.minX + radius - holeX, diameter }, bottom, name);
}

/** Where a key ring tab of its own holds its hole (#598), read from its parts as they stand; null when it is not one any more. */
export function keyringTabPlace(tab: WorkplaneShape): KeyringTabPlace | null {
  if (!tab.groupedShapes?.length) return null;
  const parts = restoreGroupedChildren(tab);
  const cut = parts.find((part) => part.hole);
  const capsule = parts.find((part) => !part.hole);
  if (!cut || !capsule) return null;
  const diameter = Math.min(MAX_KEYRING_DIAMETER, Math.max(MIN_KEYRING_DIAMETER, Math.min(shapeWidth(cut), shapeDepth(cut))));
  const way = { x: capsule.x - cut.x, z: capsule.z - cut.z };
  const apart = Math.hypot(way.x, way.z);
  // The straight end lies half the capsule's length beyond its middle.
  const turn = THREE.MathUtils.degToRad(capsule.rotation ?? 0);
  const direction = apart > 1e-6 ? { x: way.x / apart, z: way.z / apart } : { x: Math.cos(turn), z: -Math.sin(turn) };
  const length = Math.max(0, apart + shapeWidth(capsule) / 2);
  return { hole: { x: cut.x, z: cut.z }, direction, length, diameter };
}

/** A world point and direction in a tag's own frame about `origin` (#598): its turn taken off, seen from above. */
function intoFrame(origin: Pick<WorkplaneShape, "x" | "z" | "rotation" | "rotationX" | "rotationZ">, place: KeyringTabPlace) {
  const back = quaternionForShape(origin).invert();
  const point = new THREE.Vector3(place.hole.x - origin.x, 0, place.hole.z - origin.z).applyQuaternion(back);
  const way = new THREE.Vector3(place.direction.x, 0, place.direction.z).applyQuaternion(back);
  return { center: { x: point.x, z: point.z }, angle: THREE.MathUtils.radToDeg(Math.atan2(way.z, way.x)) };
}

/** A free hole (#598) in a tag's own frame about `origin` back in the world, as a tab would hold it. */
function outOfFrame(origin: Pick<WorkplaneShape, "x" | "z" | "rotation" | "rotationX" | "rotationZ">, center: { x: number; z: number }, free: FreeKeyring, diameter: number): KeyringTabPlace {
  const turn = quaternionForShape(origin);
  const point = new THREE.Vector3(center.x, 0, center.z).applyQuaternion(turn);
  const radians = THREE.MathUtils.degToRad(free.angle);
  const way = new THREE.Vector3(Math.cos(radians), 0, Math.sin(radians)).applyQuaternion(turn);
  return { hole: { x: origin.x + point.x, z: origin.z + point.z }, direction: { x: way.x, z: way.z }, length: free.length, diameter };
}

/** A name tag's free hole (#598) where the tab holds it: from the middle of its letters, kept to the nearest corner of their box. */
export function textFreeKeyring(letters: WorkplaneShape, place: KeyringTabPlace): FreeKeyring {
  const { center, angle } = intoFrame(letters, place);
  return freeKeyringAt(center, { width: shapeWidth(letters), depth: shapeDepth(letters) }, angle, place.length);
}

/** Where a name tag's free hole (#598) stands in the world, as a tab would hold it again. */
export function textFreeKeyringPlace(letters: WorkplaneShape, keyring: NameTagKeyring & { free: FreeKeyring }): KeyringTabPlace {
  const center = freeKeyringCenter(keyring.free, { width: shapeWidth(letters), depth: shapeDepth(letters) });
  return outOfFrame(letters, center, keyring.free, keyring.diameter);
}

/** An icon tag's free hole (#598) where the tab holds it: from the middle of the icon's box, kept to its nearest corner. */
export function iconFreeKeyring(area: SketchProfile, place: IconTagPlace, tab: KeyringTabPlace): FreeKeyring | null {
  const bounds = sketchOutlineBounds(area);
  if (!bounds) return null;
  const { center, angle } = intoFrame(place, tab);
  return freeKeyringAt(center, { width: bounds.maxX - bounds.minX, depth: bounds.maxZ - bounds.minZ }, angle, tab.length);
}

/** Where an icon tag's free hole (#598) stands in the world, as a tab would hold it again. */
export function iconFreeKeyringPlace(area: SketchProfile, place: IconTagPlace, keyring: NameTagKeyring & { free: FreeKeyring }): KeyringTabPlace | null {
  const bounds = sketchOutlineBounds(area);
  if (!bounds) return null;
  const center = freeKeyringCenter(keyring.free, { width: bounds.maxX - bounds.minX, depth: bounds.maxZ - bounds.minZ });
  return outOfFrame(place, center, keyring.free, keyring.diameter);
}

/**
 * The tag a key ring tab (#598) is fixed to when its panel's button is pressed: the
 * nearest name tag or icon tag that is neither locked nor hidden, measured between the middles
 * of their footprints. null when there is none.
 */
export function keyringTabTag(tab: WorkplaneShape, shapes: readonly WorkplaneShape[]): WorkplaneShape | null {
  const middle = (shape: WorkplaneShape) => {
    const footprint = shapeBedFootprint(shape);
    return { x: (footprint.minX + footprint.maxX) / 2, z: (footprint.minZ + footprint.maxZ) / 2 };
  };
  const from = middle(tab);
  let best: WorkplaneShape | null = null;
  let bestDistance = Infinity;
  for (const shape of shapes) {
    if (shape.id === tab.id || shape.locked || shape.hidden || shape.groupOperation !== "bundle" || !(shape.layeredText || shape.layeredIcon)) continue;
    const to = middle(shape);
    const distance = Math.hypot(to.x - from.x, to.z - from.z);
    if (distance < bestDistance) {
      best = shape;
      bestDistance = distance;
    }
  }
  return best;
}
