import type { CrossSection, ManifoldToplevel } from "manifold-3d";
import { textFont } from "@/lib/textFonts";
import type { TagBack } from "@/types/layerling";

/**
 * Text on the back of a name tag or an icon tag: a phone number, an e-mail address. The lines are
 * centred under each other and sunk into the bottom layer's underside, mirrored, so they read
 * the right way round when the tag is turned over sideways, like a page of a book. (Layerling's Bottom
 * view turns a tag over top to bottom instead, so there the text stands on its head.) With a colour of its own the letters are
 * filled flush with the underside by a part in that colour; without, they stay sunk in.
 */

/** How tall a capital of the back text is to begin with, in mm. */
export const DEFAULT_BACK_SIZE = 4;
/** The smallest and largest capital, in mm: under 2 mm a 0.4 mm nozzle no longer draws the letters. */
export const MIN_BACK_SIZE = 2;
export const MAX_BACK_SIZE = 20;
/** Text that does not fit at its letter height is made smaller, down to this, in mm: still clearly printed by a 0.4 mm nozzle. */
export const MIN_FITTED_BACK_SIZE = 2.5;
/** How deep the back text is sunk in to begin with, in mm: four print layers of 0.2 mm, as a flat inlay's. */
export const DEFAULT_BACK_DEPTH = 0.8;
export const MIN_BACK_DEPTH = 0.2;
export const MAX_BACK_DEPTH = 3;
/** How much of the bottom layer is kept over the back text at least, in mm: two print layers, so the tag stays one piece. */
export const MIN_BACK_FLOOR = 0.4;
/** The most lines and characters the back takes. */
export const MAX_BACK_LINES = 6;
export const MAX_BACK_LENGTH = 200;
/** The fill's colour to begin with: white, which shows on the usual dark bottom layer. */
export const DEFAULT_BACK_FILL = "#ffffff";
/**
 * How far the back text keeps from the bottom layer's edges, in mm: letters that would come closer are cut off
 * there, so neither the letters' hollows nor their fill break through the tag's outline or its key ring hole.
 */
export const BACK_EDGE_MARGIN = 1;
/** Baseline to baseline, in capitals' heights. */
const LINE_PITCH = 1.6;
/** How finely the letters' curves are drawn, as the text's own. */
const CURVE_SEGMENTS = 8;

const round = (value: number) => Math.round(value * 1000) / 1000;

/** The back's lines as they are built: each line's ends trimmed, empty lines at the start and end dropped, at most MAX_BACK_LINES. */
export function tagBackLines(text: string | undefined): string[] {
  const lines = (text ?? "").slice(0, MAX_BACK_LENGTH).split(/\r?\n/).map((line) => line.trim());
  while (lines.length && !lines[0]) lines.shift();
  while (lines.length && !lines[lines.length - 1]) lines.pop();
  return lines.slice(0, MAX_BACK_LINES);
}

/** How finely the back text is moved up or down to find where it fits best, in mm. */
const FIT_STEP = 0.25;
/** How many places are tried for text that fits nowhere, to keep the most of it, before a closer look round the best. */
const MOST_TRIES = 12;

/** Where the back text has to stay: BACK_EDGE_MARGIN inside the layer's outline `region`. */
function backRoom(keep: (section: CrossSection) => CrossSection, region: CrossSection) {
  return keep(region.offset(-BACK_EDGE_MARGIN, "Round", 2, 12));
}

/**
 * The back text kept inside `room`, and whether some of it was cut off there (the card then says it does not fit).
 * Null when nothing of it is left.
 *
 * The text is centred on the letters' box, but a name tag's outline is not as high everywhere: over small letters its
 * top edge is lower than over capitals, so the first line was cut off while there was room below the last one. Where
 * it does not fit in the middle, the block is moved up or down (never sideways, so the lines stay centred under the
 * front) to the place nearest the middle where all of it fits. Only places where its box is inside the room's are
 * tried, so text wider or taller than the room is known not to fit at once. Where it fits nowhere and `most` is set,
 * it goes where clearly more of it stays (its middle within the room's height).
 */
function backInRoom(keep: (section: CrossSection) => CrossSection, back: CrossSection | null, room: CrossSection, most: boolean): { region: CrossSection | null; clipped: boolean } {
  if (!back || back.isEmpty()) return { region: null, clipped: false };
  const whole = back.area();
  const inRoom = (dz: number) => keep(keep(dz ? back.translate([0, dz]) : back).intersect(room));
  const centred = inRoom(0);
  const centredKept = centred.area();
  if (centredKept >= whole * 0.995) return { region: centred, clipped: false };
  const { min, max } = back.bounds();
  const { min: roomMin, max: roomMax } = room.bounds();
  // All of it can only fit where its box is inside the room's: moved by `lowest` to `highest`.
  const lowest = roomMin[1] - min[1];
  const highest = roomMax[1] - max[1];
  if (max[0] - min[0] <= roomMax[0] - roomMin[0] && lowest <= highest) {
    const places: number[] = [];
    for (let dz = Math.ceil(lowest / FIT_STEP) * FIT_STEP; dz <= highest + 1e-9; dz += FIT_STEP) places.push(dz);
    if (!places.length) places.push((lowest + highest) / 2);
    places.sort((a, b) => Math.abs(a) - Math.abs(b));
    for (const dz of places) {
      if (!dz) continue;
      const moved = inRoom(dz);
      if (moved.area() >= whole * 0.995) return { region: moved, clipped: false };
    }
  }
  if (!most) return { region: centredKept > 0 ? centred : null, clipped: true };
  // Fits nowhere: where the most of it stays, its middle within the room's height, if clearly more than in the middle.
  const middle = (min[1] + max[1]) / 2;
  const from = roomMin[1] - middle;
  const to = roomMax[1] - middle;
  let best = centred;
  let kept = centredKept;
  let bestAt = 0;
  const tryAt = (dz: number) => {
    const moved = inRoom(dz);
    const area = moved.area();
    if (area > kept + whole * 0.001) {
      best = moved;
      kept = area;
      bestAt = dz;
    }
  };
  // A few places across, then a closer look either side of the best of them.
  const step = Math.max(FIT_STEP, (to - from) / MOST_TRIES);
  for (let dz = from; dz <= to + 1e-9; dz += step) tryAt(dz);
  const around = bestAt;
  for (let fine = FIT_STEP; fine < step; fine += FIT_STEP) {
    tryAt(around - fine);
    tryAt(around + fine);
  }
  // Text that is only too wide is not moved off the middle for a sliver of a letter.
  if (kept < centredKept + whole * 0.02) {
    best = centred;
    kept = centredKept;
  }
  return { region: best.isEmpty() ? null : best, clipped: true };
}

/** The back text inside the outline, as fittedBackInside works it out: `size` when it was made smaller to fit. */
export type BackInside = { region: CrossSection | null; clipped: boolean; size?: number };

/**
 * The back text centred on `middle` and kept inside the outline `plate` (backInRoom). Text that does not fit at its
 * letter height is made smaller, a tenth of a millimetre at a time, to the largest height at which all of it fits, but
 * not under MIN_FITTED_BACK_SIZE (nor under the height asked for); if it does not fit even then, it is cut off at that
 * height and `clipped`. The letter height asked for is the largest, so a longer line just comes out smaller.
 *
 * The heights tried start from the one at which the text's box would just fit the room's, as the box grows with the
 * letter height, so text that fits nowhere is known at once and a few halvings find the rest.
 */
export function fittedBackInside(runtime: ManifoldToplevel, keep: (section: CrossSection) => CrossSection, back: TagBack, middle: { x: number; z: number }, plate: CrossSection): BackInside {
  const room = backRoom(keep, plate);
  const text = (tenths: number) => tagBackRegion(runtime, keep, { ...back, size: tenths / 10 }, middle);
  const askedText = tagBackRegion(runtime, keep, back, middle);
  const asked = backInRoom(keep, askedText, room, false);
  const top = Math.floor(back.size * 10 + 1e-6);
  const floor = Math.min(top, Math.round(MIN_FITTED_BACK_SIZE * 10));
  if (!asked.clipped) return asked;
  if (floor >= top || !askedText) return backInRoom(keep, askedText, room, true);
  // The box grows with the letter height: no larger than where it would just fit the room's box.
  const box = askedText.bounds();
  const roomBox = room.bounds();
  const scale = Math.min((roomBox.max[0] - roomBox.min[0]) / (box.max[0] - box.min[0]), (roomBox.max[1] - roomBox.min[1]) / (box.max[1] - box.min[1]));
  let high = Math.min(back.size * 10 > top ? top + 1 : top, Math.floor(back.size * 10 * scale) + 2);
  if (high <= floor) return { ...backInRoom(keep, text(floor), room, true), size: floor / 10 };
  const smallest = backInRoom(keep, text(floor), room, false);
  if (smallest.clipped) return { ...backInRoom(keep, text(floor), room, true), size: floor / 10 };
  // Fits at `low`, not at `high`: halved until they meet.
  let low = floor;
  let fits = smallest;
  while (high - low > 1) {
    const tenths = Math.floor((low + high) / 2);
    const tried = backInRoom(keep, text(tenths), room, false);
    if (tried.clipped) {
      high = tenths;
    } else {
      low = tenths;
      fits = tried;
    }
  }
  return { ...fits, size: low / 10 };
}

/**
 * A back as it is read from a tag, with whether it was made smaller or cut off worked out again (`fit`) where the 2D
 * kernel is at hand: a file saved by another version, or before the font arrived, may say otherwise.
 */
export function withBackFit(back: TagBack, fit: { clipped: boolean; size?: number } | null): TagBack {
  if (!fit) return back;
  const { clipped: _clipped, fitted: _fitted, ...plain } = back;
  return { ...plain, ...(fit.clipped ? { clipped: true } : {}), ...(fit.size !== undefined ? { fitted: fit.size } : {}) };
}

/** A back as a .lyl file, the card or the AI bridge gives it, or undefined when there is no text on it. */
export function normalizeTagBack(value: unknown): TagBack | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;
  const text = typeof raw.text === "string" ? raw.text.slice(0, MAX_BACK_LENGTH) : "";
  if (!tagBackLines(text).length) return undefined;
  const size = Number(raw.size);
  const depth = Number(raw.depth);
  const fill = typeof raw.fill === "string" && /^#[0-9a-f]{6}$/i.test(raw.fill) ? raw.fill.toLowerCase() : undefined;
  return {
    text,
    size: round(Number.isFinite(size) ? Math.min(MAX_BACK_SIZE, Math.max(MIN_BACK_SIZE, size)) : DEFAULT_BACK_SIZE),
    depth: round(Number.isFinite(depth) ? Math.min(MAX_BACK_DEPTH, Math.max(MIN_BACK_DEPTH, depth)) : DEFAULT_BACK_DEPTH),
    ...(typeof raw.font === "string" && raw.font ? { font: raw.font } : {}),
    ...(fill ? { fill } : {}),
    ...(raw.clipped === true ? { clipped: true } : {}),
    ...(typeof raw.fitted === "number" && Number.isFinite(raw.fitted) && raw.fitted >= MIN_BACK_SIZE && raw.fitted < size ? { fitted: round(raw.fitted) } : {}),
  };
}

/**
 * layerling_layer_text's and layerling_layer_icon's `back`: left out it stays as the tag has it (undefined); false or
 * null takes the back text off; { text, size, depth, fill } sets it, each part left out staying as `current` has it
 * (a new back takes the usual size and depth, and no fill). `fill` true is white, a "#rrggbb" that colour, false none.
 * A value out of range is refused, not bent into range.
 */
export function tagBackArgument(value: unknown, current: TagBack | null): { back: TagBack | null } | { error: string } | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === false) return { back: null };
  if (typeof value !== "object" || Array.isArray(value)) return { error: "back must be { text, size, depth, fill }, or false to take it off" };
  const raw = value as Record<string, unknown>;
  const text = raw.text ?? current?.text;
  if (typeof text !== "string" || !tagBackLines(text).length) return { error: "back.text must have some text; pass back: false to take the back text off" };
  if (text.length > MAX_BACK_LENGTH || text.trim().split(/\r?\n/).length > MAX_BACK_LINES) return { error: `back.text takes at most ${MAX_BACK_LINES} lines and ${MAX_BACK_LENGTH} characters` };
  const within = (entry: unknown, min: number, max: number) => typeof entry === "number" && Number.isFinite(entry) && entry >= min && entry <= max;
  if (raw.size !== undefined && !within(raw.size, MIN_BACK_SIZE, MAX_BACK_SIZE)) return { error: `back.size must be ${MIN_BACK_SIZE} to ${MAX_BACK_SIZE} mm` };
  if (raw.depth !== undefined && !within(raw.depth, MIN_BACK_DEPTH, MAX_BACK_DEPTH)) return { error: `back.depth must be ${MIN_BACK_DEPTH} to ${MAX_BACK_DEPTH} mm` };
  if (raw.fill !== undefined && typeof raw.fill !== "boolean" && !(typeof raw.fill === "string" && /^#[0-9a-f]{6}$/i.test(raw.fill))) {
    return { error: "back.fill must be a colour such as #ffffff, true or false" };
  }
  const fill = raw.fill === undefined ? current?.fill : raw.fill === true ? current?.fill ?? DEFAULT_BACK_FILL : raw.fill || undefined;
  const back = normalizeTagBack({
    text,
    size: raw.size ?? current?.size ?? DEFAULT_BACK_SIZE,
    depth: raw.depth ?? current?.depth ?? DEFAULT_BACK_DEPTH,
    ...(current?.font ? { font: current.font } : {}),
    ...(fill ? { fill } : {}),
  });
  return { back: back ?? null };
}

/**
 * How deep the back text is sunk into a bottom layer this high: the depth asked for, as long as
 * MIN_BACK_FLOOR is kept over it - and, laid in flush, under the pocket in the layer's top as well.
 */
export function tagBackDepthFor(depth: number, bottomHeight: number, flushDepth = 0) {
  const most = Math.max(MIN_BACK_DEPTH, bottomHeight - Math.max(0, flushDepth) - MIN_BACK_FLOOR);
  return round(Math.min(most, Math.max(MIN_BACK_DEPTH, Number.isFinite(depth) ? depth : DEFAULT_BACK_DEPTH)));
}

/** The deepest the back text may go on this bottom layer, for the card's slider. */
export function tagBackMaxDepth(bottomHeight: number, flushDepth = 0) {
  return tagBackDepthFor(MAX_BACK_DEPTH, bottomHeight, flushDepth);
}

/** How tall a capital is in the font at size 1: the scale that makes `size` the capital's height. */
function capitalAtOne(font: ReturnType<typeof textFont>) {
  let top = 0;
  font.generateShapes("H", 1).forEach((outline) => outline.getPoints().forEach((point) => { top = Math.max(top, point.y); }));
  return top > 0 ? top : 0.7;
}

/**
 * The back text as a region of the 2D kernel in a layer's own frame (x along the letters, -z where
 * a tag's top is, as it is seen from above), mirrored left to right so it reads the right way round
 * when the tag is turned over sideways like a page of a book, its lines centred under each other
 * and the whole block centred on `middle`. Null without any letters.
 */
export function tagBackRegion(runtime: ManifoldToplevel, keep: (section: CrossSection) => CrossSection, back: TagBack, middle: { x: number; z: number }): CrossSection | null {
  const lines = tagBackLines(back.text);
  if (!lines.length) return null;
  const font = textFont(back.font);
  const scale = back.size / capitalAtOne(font);
  const pitch = back.size * LINE_PITCH;
  const pieces: CrossSection[] = [];
  lines.forEach((line, row) => {
    if (!line) return;
    const glyphs = font.generateShapes(line, scale).map((glyph) => glyph.extractPoints(CURVE_SEGMENTS));
    let minX = Infinity;
    let maxX = -Infinity;
    glyphs.forEach(({ shape }) => shape.forEach((point) => {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
    }));
    if (!Number.isFinite(minX)) return;
    const shift = -(minX + maxX) / 2;
    const baseline = -row * pitch;
    glyphs.forEach(({ shape, holes }) => {
      // Mirrored left to right, the font's up towards -z as on the front: turned over sideways like a page of a
      // book, the tag reads the right way round, the first line at the top.
      const rings = [shape, ...holes]
        .filter((ring) => ring.length >= 3)
        .map((ring) => ring.map((point) => [-(point.x + shift), -(point.y + baseline)] as [number, number]));
      if (rings.length) pieces.push(keep(new runtime.CrossSection(rings, "EvenOdd")));
    });
  });
  if (!pieces.length) return null;
  const block = keep(runtime.CrossSection.union(pieces));
  if (block.isEmpty()) return null;
  const { min, max } = block.bounds();
  return keep(block.translate([middle.x - (min[0] + max[0]) / 2, middle.z - (min[1] + max[1]) / 2]));
}

/**
 * Back text kept inside a layer's outline, remembered by `key` (what the outline and the text are made of): the bottom
 * layer, its fill and the card's "does not fit" all ask for the same, and each asking would build glyphs and inset
 * the outline anew. `make` works it out; the answer is kept as plain polygons, a few of the latest only.
 */
const insideCache = new Map<string, { polygons: [number, number][][]; clipped: boolean; size?: number }>();
const INSIDE_CACHE_SIZE = 24;

export function cachedBackInside(runtime: ManifoldToplevel, keep: (section: CrossSection) => CrossSection, key: string, make: () => BackInside): BackInside {
  const known = insideCache.get(key);
  if (known) {
    insideCache.delete(key);
    insideCache.set(key, known);
    return { region: known.polygons.length ? keep(new runtime.CrossSection(known.polygons, "EvenOdd")) : null, clipped: known.clipped, ...(known.size !== undefined ? { size: known.size } : {}) };
  }
  const made = make();
  insideCache.set(key, { polygons: made.region ? made.region.toPolygons().map((ring) => ring.map(([x, z]) => [x, z] as [number, number])) : [], clipped: made.clipped, ...(made.size !== undefined ? { size: made.size } : {}) });
  if (insideCache.size > INSIDE_CACHE_SIZE) insideCache.delete(insideCache.keys().next().value!);
  return made;
}

/**
 * A bottom layer with its back text: `region` extruded `height` high, the flush pocket (if any) out
 * of its top `pocketDepth` deep, and the back text out of its underside `backDepth` deep. Or, for the
 * fill (`region` null), the back text alone `backDepth` high. Positions with y up (x, height, the
 * region's second axis), as flushLayerSolid's; null when nothing is left.
 */
export function tagLayerSolid(region: CrossSection | null, pocket: CrossSection | null, height: number, pocketDepth: number, back: CrossSection | null, backDepth: number): { positions: Float32Array; indices: Uint32Array } | null {
  const made: Array<{ delete(): void }> = [];
  const keep = <T extends { delete(): void }>(item: T) => {
    made.push(item);
    return item;
  };
  try {
    const safeHeight = Math.max(1e-3, height);
    let solid;
    if (!region) {
      if (!back) return null;
      solid = keep(back.extrude(Math.max(1e-3, backDepth)));
    } else {
      solid = keep(region.extrude(safeHeight));
      if (pocket) {
        if (pocketDepth >= safeHeight - 1e-6) solid = keep(keep(keep(region.subtract(pocket)).simplify(1e-6)).extrude(safeHeight));
        // The cuts reach a little past the faces they open in, so no face of them lies on one of the body's own.
        else solid = keep(solid.subtract(keep(keep(pocket.extrude(pocketDepth + 0.01)).translate([0, 0, safeHeight - pocketDepth]))));
      }
      if (back) solid = keep(solid.subtract(keep(keep(back.extrude(backDepth + 0.01)).translate([0, 0, -0.01]))));
    }
    if (solid.status() !== "NoError" || solid.isEmpty() || solid.numTri() < 1) return null;
    const mesh = solid.getMesh();
    const count = mesh.vertProperties.length / mesh.numProp;
    const positions = new Float32Array(count * 3);
    // The section lies in x and its second axis, the extrusion runs along z: y up is (x, extrusion, second axis).
    for (let vertex = 0; vertex < count; vertex += 1) {
      positions[vertex * 3] = mesh.vertProperties[vertex * mesh.numProp];
      positions[vertex * 3 + 1] = mesh.vertProperties[vertex * mesh.numProp + 2];
      positions[vertex * 3 + 2] = mesh.vertProperties[vertex * mesh.numProp + 1];
    }
    // Swapping two axes mirrors the mesh, so each triangle turns the other way round to keep facing out.
    const indices = new Uint32Array(mesh.triVerts.length);
    for (let index = 0; index < mesh.triVerts.length; index += 3) {
      indices[index] = mesh.triVerts[index];
      indices[index + 1] = mesh.triVerts[index + 2];
      indices[index + 2] = mesh.triVerts[index + 1];
    }
    return indices.length ? { positions, indices } : null;
  } finally {
    new Set(made).forEach((item) => item.delete());
  }
}
