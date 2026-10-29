import * as THREE from "three";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Font } from "three/examples/jsm/loaders/FontLoader.js";
import { shapeText, textNeedsShaping } from "@/lib/arabicShaping";
import { normalizeSketchStroke } from "@/lib/sketchStroke";
import { customFontRevision, ensureJapaneseGlyphs, textFont } from "@/lib/textFonts";
import { shapeDepth, shapeWidth } from "@/lib/workplaneShapes";
import type { FreeKeyring, TextKeyring, TextKeyringSide, WorkplaneShape } from "@/types/layerling";

/** Font size the straight text is laid out at before it is fitted into its box. */
const LAYOUT_SIZE = 20;
export const DEFAULT_TEXT_SIZE = 10;
export const MIN_TEXT_RADIUS = 5;
export const MAX_TEXT_RADIUS = 500;
/** Longest arc the lettering may take, as a share of the full circle - leaves a gap so the ends never meet. */
const MAX_ARC_SHARE = 0.84;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function textOf(shape: Pick<WorkplaneShape, "text">) {
  const text = (shape.text ?? "TEXT").trim() || " ";
  // Kana or kanji: fetch the Japanese face if it is not here yet; the text is drawn again when it is.
  ensureJapaneseGlyphs(text);
  return text;
}

/**
 * The characters the typeface draws for a text, left to right: Arabic and Hebrew shaped and
 * turned round (#294) with the forms this typeface has, anything else as typed.
 */
export function displayTextOf(shape: Pick<WorkplaneShape, "text" | "font">) {
  const text = textOf(shape);
  if (!textNeedsShaping(text)) return text;
  const glyphs = (textFont(shape.font ?? "Multilanguage").data as { glyphs?: Record<string, unknown> }).glyphs ?? {};
  return shapeText(text, (char) => Boolean(glyphs[char]));
}

/** The space between letters (#594), in per cent of the letter size, either way. */
export const MIN_TEXT_SPACING = -50;
export const MAX_TEXT_SPACING = 300;

/** The spacing a shape asks for, in per cent: 0 when it has none. */
export function textSpacingOf(shape: Pick<WorkplaneShape, "textSpacing">): number {
  const value = Number(shape.textSpacing);
  return Number.isFinite(value) ? clamp(value, MIN_TEXT_SPACING, MAX_TEXT_SPACING) : 0;
}

const spacedFonts = new WeakMap<Font, Map<number, Font>>();

/**
 * The typeface with every glyph's advance widened or narrowed by `percent` of the letter size (#594). The layout of
 * three.js moves the pen by each glyph's own advance, so a copy of the font with those advances changed is the one
 * place the spacing has to enter: the straight line, its measure and the curved text all read it from there.
 */
export function spacedFont(font: Font, percent: number): Font {
  if (!percent) return font;
  let byPercent = spacedFonts.get(font);
  if (!byPercent) {
    byPercent = new Map();
    spacedFonts.set(font, byPercent);
  }
  const known = byPercent.get(percent);
  if (known) return known;
  const data = font.data as unknown as { resolution?: number; glyphs?: Record<string, { ha?: number }> };
  const extra = ((data.resolution || 1000) * percent) / 100;
  const glyphs: Record<string, unknown> = {};
  Object.entries(data.glyphs ?? {}).forEach(([char, glyph]) => {
    glyphs[char] = { ...glyph, ha: (glyph.ha ?? 0) + extra };
  });
  const made = new Font({ ...(font.data as object), glyphs } as ConstructorParameters<typeof Font>[0]);
  byPercent.set(percent, made);
  return made;
}

/** The typeface a shape's text is laid out with: its font, with its spacing. */
export function textLayoutFont(shape: Pick<WorkplaneShape, "font" | "text" | "textSpacing">): Font {
  // Arabic and Hebrew letters join up and read from the right: a gap between them would break the words (#594).
  const spaced = textNeedsShaping(shape.text ?? "") ? 0 : textSpacingOf(shape);
  return spacedFont(textFont(shape.font ?? "Multilanguage"), spaced);
}

/** The gap between two letters of vertical text, in parts of a capital's height, with no spacing set. */
const VERTICAL_GAP = 0.35;

/** Moves every point of a glyph outline, its holes included; a point two curves share is moved once. */
function translateGlyph(glyph: THREE.Shape, dx: number, dy: number) {
  const moved = new Set<THREE.Vector2>();
  [glyph, ...glyph.holes].forEach((path) => path.curves.forEach((curve) => {
    for (const key of ["v0", "v1", "v2", "v3"] as const) {
      const point = (curve as unknown as Record<string, THREE.Vector2 | undefined>)[key];
      if (point instanceof THREE.Vector2 && !moved.has(point)) {
        point.x += dx;
        point.y += dy;
        moved.add(point);
      }
    }
  }));
}

/**
 * The outlines of straight text at `size`, as the font lays out the line - or, for vertical text (#981), the
 * letters stacked top to bottom, each centred on one upright line, a gap of about a third of a capital between
 * them plus the spacing in per cent of the letter size. A space leaves the room of a capital. Everything that
 * draws or measures straight text takes its outlines from here.
 */
export function straightTextShapes(shape: Pick<WorkplaneShape, "text" | "font" | "textSpacing" | "textVertical">, size: number): THREE.Shape[] {
  const font = textLayoutFont(shape);
  const text = displayTextOf(shape);
  if (!shape.textVertical) return font.generateShapes(text, size);
  const plain = textFont(shape.font ?? "Multilanguage");
  const cap = capHeightOf(plain, size);
  const gap = Math.max(0, cap * VERTICAL_GAP + (size * textSpacingOf(shape)) / 100);
  const shapes: THREE.Shape[] = [];
  let top = 0;
  for (const char of [...text]) {
    const glyphs = char.trim() ? plain.generateShapes(char, size) : [];
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    glyphs.forEach((glyph) => glyph.getPoints().forEach((point) => {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    }));
    if (!Number.isFinite(minX)) {
      top -= cap + gap;
      continue;
    }
    glyphs.forEach((glyph) => translateGlyph(glyph, -(minX + maxX) / 2, top - maxY));
    shapes.push(...glyphs);
    top -= maxY - minY + gap;
  }
  return shapes;
}

function textOptions(shape: WorkplaneShape, size: number) {
  const bevel = clamp(shape.bevel ?? 0, 0, 8);
  const fontName = shape.font ?? "Multilanguage";
  return {
    font: textLayoutFont(shape),
    size,
    depth: shape.height,
    curveSegments: fontName === "Stencil" ? 1 : 8,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel * 0.22,
    bevelSize: bevel * 0.16,
    bevelSegments: Math.max(1, shape.segments ?? 0),
  };
}

/** How far the pen moves after a character - the font's own advance, so "i" and "m" sit as the typeface intends. */
function advanceOf(font: Font, char: string, size: number): number {
  const data = font.data as { resolution?: number; glyphs?: Record<string, { ha?: number }> };
  const glyph = data.glyphs?.[char] ?? data.glyphs?.["?"];
  const resolution = data.resolution || 1000;
  return glyph?.ha !== undefined ? (glyph.ha * size) / resolution : size * 0.6;
}

/** Height of a capital above the baseline - the band a line of text occupies. */
function capHeightOf(font: Font, size: number): number {
  const shapes = font.generateShapes("H", size);
  let top = 0;
  shapes.forEach((outline) => outline.getPoints().forEach((point) => { top = Math.max(top, point.y); }));
  return top > 0 ? top : size * 0.7;
}

function curvedRadius(shape: WorkplaneShape) {
  return clamp(shape.textRadius ?? 30, MIN_TEXT_RADIUS, MAX_TEXT_RADIUS);
}

function curvedSize(shape: WorkplaneShape) {
  return Math.max(0.5, shape.textSize ?? DEFAULT_TEXT_SIZE);
}

/**
 * How far a fill mode (#215) reaches out beyond the letters: a stroke outside or the widened
 * letters by the line width, a centred stroke by half of it. The shape's box is the box of the
 * whole body, so the letters are fitted into the box less this reach all round.
 */
export function textFillExtent(shape: Pick<WorkplaneShape, "textStroke">): number {
  const stroke = normalizeSketchStroke(shape.textStroke);
  if (!stroke) return 0;
  return stroke.align === "outside" || stroke.align === "grow" ? stroke.width : stroke.align === "center" ? stroke.width / 2 : 0;
}

export const TEXT_KEYRING_SIDES: readonly TextKeyringSide[] = ["left", "right", "top"];
/**
 * The ear of a name tag's key ring hole (#215), as the tab plazmabokor measured on a printed one:
 * 6.5 mm wide round a 3 mm hole - a 1.75 mm wall either side - its far end a half circle round
 * the hole. The hole's edge is 2 mm beyond the bottom layer, so the tab sticks out 6.75 mm. The
 * walls and that distance stay as they are; the tab grows with the hole.
 */
export const DEFAULT_KEYRING_DIAMETER = 3;
export const MIN_KEYRING_DIAMETER = 1;
export const MAX_KEYRING_DIAMETER = 20;
export const KEYRING_TAB_WALL = 1.75;
export const KEYRING_HOLE_EDGE_DISTANCE = 2;
/** A hole sits off the letters' box by up to this much either way: inside it where the letters are thin in the tab's band. */
export const MAX_KEYRING_OFFSET = 1000;

/**
 * A freely placed key ring hole (#598) as stored: a corner it keeps to, the hole's distance from it,
 * the ear's direction and length, all within MAX_KEYRING_OFFSET mm. Undefined for anything else.
 */
export function normalizeFreeKeyring(value: unknown): FreeKeyring | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const candidate = value as Record<string, unknown>;
  const numbers = [candidate.dx, candidate.dz, candidate.angle, candidate.length].map(Number);
  if (!numbers.every(Number.isFinite)) return undefined;
  const [dx, dz, angle, length] = numbers;
  return {
    ax: Number(candidate.ax) < 0 ? -1 : 1,
    az: Number(candidate.az) < 0 ? -1 : 1,
    dx: clamp(dx, -MAX_KEYRING_OFFSET, MAX_KEYRING_OFFSET),
    dz: clamp(dz, -MAX_KEYRING_OFFSET, MAX_KEYRING_OFFSET),
    angle: ((angle % 360) + 360) % 360,
    length: clamp(length, 0, MAX_KEYRING_OFFSET),
  };
}

/** Whether a stored free key ring hole (#598) is one layerling writes: corners of -1 or 1, finite numbers within range. */
export function isFreeKeyring(value: unknown): value is FreeKeyring {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  const finite = (entry: unknown): entry is number => typeof entry === "number" && Number.isFinite(entry);
  return (candidate.ax === -1 || candidate.ax === 1) && (candidate.az === -1 || candidate.az === 1)
    && finite(candidate.dx) && Math.abs(candidate.dx) <= MAX_KEYRING_OFFSET
    && finite(candidate.dz) && Math.abs(candidate.dz) <= MAX_KEYRING_OFFSET
    && finite(candidate.angle) && finite(candidate.length) && candidate.length >= 0 && candidate.length <= MAX_KEYRING_OFFSET;
}

/** The direction a free ear (#598) runs in from its hole, as a unit step in x and z. */
export function freeKeyringDirection(free: Pick<FreeKeyring, "angle">) {
  const radians = THREE.MathUtils.degToRad(free.angle);
  return { x: Math.cos(radians), z: Math.sin(radians) };
}

/**
 * The straight part of a free ear (#598) round a hole at `center`: a strip as wide as the ear, from
 * the hole's middle `length` mm along the ear's direction - the ear is this and a disc round the hole.
 */
export function freeKeyringStrip(center: { x: number; z: number }, diameter: number, free: Pick<FreeKeyring, "angle" | "length">): [number, number][] {
  const radius = keyringEarRadius(diameter);
  const along = freeKeyringDirection(free);
  const across = { x: -along.z, z: along.x };
  const end = { x: center.x + along.x * free.length, z: center.z + along.z * free.length };
  const corner = (point: { x: number; z: number }, sign: number): [number, number] => [point.x + sign * across.x * radius, point.z + sign * across.z * radius];
  // Counter-clockwise in x/z, as the 2D kernel takes an outer ring.
  const ring = [corner(center, -1), corner(end, -1), corner(end, 1), corner(center, 1)];
  const area = ring.reduce((sum, [x, z], index) => {
    const [nextX, nextZ] = ring[(index + 1) % ring.length];
    return sum + x * nextZ - nextX * z;
  }, 0);
  return area < 0 ? ring.reverse() : ring;
}

/** How far a free ear (#598) reaches from its hole's middle, the disc round the hole and the strip. */
export function freeKeyringExtent(diameter: number, free: Pick<FreeKeyring, "angle" | "length">) {
  const radius = keyringEarRadius(diameter);
  const strip = freeKeyringStrip({ x: 0, z: 0 }, diameter, free);
  return {
    minX: Math.min(-radius, ...strip.map(([x]) => x)),
    maxX: Math.max(radius, ...strip.map(([x]) => x)),
    minZ: Math.min(-radius, ...strip.map(([, z]) => z)),
    maxZ: Math.max(radius, ...strip.map(([, z]) => z)),
  };
}

/** The middle of a free key ring hole (#598) from the middle of a box `width` by `depth`: off the corner it keeps to. */
export function freeKeyringCenter(free: Pick<FreeKeyring, "ax" | "az" | "dx" | "dz">, box: { width: number; depth: number }) {
  return { x: free.ax * box.width / 2 + free.dx, z: free.az * box.depth / 2 + free.dz };
}

/**
 * A hole at `center` from the middle of a box `width` by `depth`, with its ear towards `angle` for
 * `length` mm, as a free key ring hole (#598): kept to the corner of the box it is nearest to.
 */
export function freeKeyringAt(center: { x: number; z: number }, box: { width: number; depth: number }, angle: number, length: number): FreeKeyring {
  const ax = center.x < 0 ? -1 : 1;
  const az = center.z < 0 ? -1 : 1;
  const round = (value: number) => Math.round(value * 1000) / 1000;
  return normalizeFreeKeyring({ ax, az, dx: round(center.x - ax * box.width / 2), dz: round(center.z - az * box.depth / 2), angle: round(angle), length: round(length) })!;
}

export function normalizeTextKeyring(value: unknown): TextKeyring | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Partial<TextKeyring>;
  const diameter = Number(candidate.diameter);
  const offset = Number(candidate.offset);
  const along = Number(candidate.along ?? 0);
  if (!Number.isFinite(diameter) || diameter <= 0 || !Number.isFinite(offset)) return undefined;
  const free = normalizeFreeKeyring(candidate.free);
  return {
    side: TEXT_KEYRING_SIDES.includes(candidate.side as TextKeyringSide) ? candidate.side as TextKeyringSide : "left",
    diameter: clamp(diameter, MIN_KEYRING_DIAMETER, MAX_KEYRING_DIAMETER),
    offset: clamp(offset, -MAX_KEYRING_OFFSET, MAX_KEYRING_OFFSET),
    ...(Number.isFinite(along) && along !== 0 ? { along: clamp(along, -MAX_KEYRING_OFFSET, MAX_KEYRING_OFFSET) } : {}),
    ...(candidate.ear ? { ear: true } : {}),
    ...(free ? { free } : {}),
  };
}

/**
 * Whether a stored key ring hole is one layerling writes (#215): a known side, a diameter within
 * range, an offset and a shift along the side within MAX_KEYRING_OFFSET mm either way and the ear switch. A file with
 * anything else is refused rather than read as something else.
 */
export function isTextKeyring(value: unknown): value is TextKeyring {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  const finite = (entry: unknown): entry is number => typeof entry === "number" && Number.isFinite(entry);
  return TEXT_KEYRING_SIDES.includes(candidate.side as TextKeyringSide)
    && finite(candidate.diameter) && candidate.diameter >= MIN_KEYRING_DIAMETER && candidate.diameter <= MAX_KEYRING_DIAMETER
    && finite(candidate.offset) && Math.abs(candidate.offset) <= MAX_KEYRING_OFFSET
    && (candidate.along === undefined || (finite(candidate.along) && Math.abs(candidate.along) <= MAX_KEYRING_OFFSET))
    && (candidate.ear === undefined || typeof candidate.ear === "boolean")
    && (candidate.free === undefined || isFreeKeyring(candidate.free));
}

/** The key ring hole a text is drawn with (#215) - straight text only, curved text has none. */
export function textKeyringOf(shape: Pick<WorkplaneShape, "textKeyring" | "textCurved">): TextKeyring | undefined {
  return shape.textCurved ? undefined : normalizeTextKeyring(shape.textKeyring);
}

/** The radius of the ear's half circle round a key ring hole of this diameter: half the tab's width, the hole and a wall either side. */
export function keyringEarRadius(diameter: number) {
  return diameter / 2 + KEYRING_TAB_WALL;
}

/**
 * How far a key ring tab can be moved off the middle of its side (#671), either way: its whole
 * width stays within the side of the bottom layer, `across` mm long, so the box keeps its size.
 */
export function keyringAlongLimit(across: number, diameter: number) {
  return Math.max(0, across / 2 - keyringEarRadius(diameter));
}

/**
 * How far the ear reaches out beyond the letters and the fill's reach on each side (#215): on its
 * one side for a hole on a side; for a free hole (#598) on the sides of the corner it keeps to,
 * which do not change with the letters. Seen from above the tops of the letters are towards -z.
 */
export function textKeyringReaches(shape: Pick<WorkplaneShape, "textKeyring" | "textCurved" | "textStroke">): { left: number; right: number; top: number; bottom: number } {
  const none = { left: 0, right: 0, top: 0, bottom: 0 };
  const keyring = textKeyringOf(shape);
  if (!keyring?.ear) return none;
  const extent = textFillExtent(shape);
  if (keyring.free) {
    const { free } = keyring;
    const ear = freeKeyringExtent(keyring.diameter, free);
    return {
      left: free.ax < 0 ? Math.max(0, -(free.dx + ear.minX) - extent) : 0,
      right: free.ax > 0 ? Math.max(0, free.dx + ear.maxX - extent) : 0,
      top: free.az < 0 ? Math.max(0, -(free.dz + ear.minZ) - extent) : 0,
      bottom: free.az > 0 ? Math.max(0, free.dz + ear.maxZ - extent) : 0,
    };
  }
  const reach = Math.max(0, keyring.offset + keyringEarRadius(keyring.diameter) - extent);
  return { ...none, [keyring.side]: reach };
}

/**
 * The scale that fits a straight line of this size into the letters' box (#382): one for both
 * directions, so the letters keep their proportions, or - with `textStretch` - one for each, so
 * they fill the box and can be made lower or narrower.
 */
export function textFitScale(shape: Pick<WorkplaneShape, "textStretch" | "textCurved">, letters: { width: number; depth: number }, line: { width: number; depth: number }) {
  const x = letters.width / line.width;
  const y = letters.depth / line.depth;
  if (shape.textStretch && !shape.textCurved) return { x, y };
  const scale = Math.min(x, y);
  return { x: scale, y: scale };
}

/** The box the letters themselves are laid out in: the shape's box less the fill's reach and the ear's. */
export function textLetterBox(shape: WorkplaneShape) {
  const extent = textFillExtent(shape);
  const reach = textKeyringReaches(shape);
  return {
    width: Math.max(1, shapeWidth(shape) - 2 * extent - reach.left - reach.right),
    depth: Math.max(1, shapeDepth(shape) - 2 * extent - reach.top - reach.bottom),
  };
}

/** The box a text needs round letters of this size: the fill's reach all round, the ear's on its side. */
export function textBoxAroundLetters(shape: WorkplaneShape, letters: { width: number; depth: number }) {
  const extent = textFillExtent(shape);
  const reach = textKeyringReaches(shape);
  const width = letters.width + 2 * extent + reach.left + reach.right;
  const depth = letters.depth + 2 * extent + reach.top + reach.bottom;
  return { width, depth, size: Math.max(width, depth) };
}

/**
 * Where the middle of the letters sits in the shape's own frame: the middle of the box, unless an
 * ear takes room on one side - then the letters move half of that to the other side.
 */
export function textLetterOffset(shape: WorkplaneShape): { x: number; z: number } {
  const reach = textKeyringReaches(shape);
  // Seen from above the letters read along +x with their tops towards -z.
  return { x: (reach.left - reach.right) / 2, z: (reach.top - reach.bottom) / 2 };
}

/**
 * Where along its side the middle of a key ring hole lies (#671), in the shape's own frame: the
 * letters' middle moved by `along`, up on the left and right (towards -z, where the tops of the
 * letters are), to the right on top.
 */
export function keyringBandCenter(middle: { x: number; z: number }, side: TextKeyringSide, along = 0) {
  return side === "top" ? { x: middle.x + along, z: middle.z } : { x: middle.x, z: middle.z - along };
}

/** The middle of the key ring hole in the shape's own frame, or null without one. */
export function textKeyringCenter(shape: WorkplaneShape): { x: number; z: number } | null {
  const keyring = textKeyringOf(shape);
  if (!keyring) return null;
  const letters = textLetterBox(shape);
  if (keyring.free) {
    const center = freeKeyringCenter(keyring.free, letters);
    const free = textLetterOffset(shape);
    return { x: free.x + center.x, z: free.z + center.z };
  }
  const middle = keyringBandCenter(textLetterOffset(shape), keyring.side, keyring.along);
  if (keyring.side === "top") return { x: middle.x, z: middle.z - letters.depth / 2 - keyring.offset };
  const direction = keyring.side === "right" ? 1 : -1;
  return { x: middle.x + direction * (letters.width / 2 + keyring.offset), z: middle.z };
}

/** The letters' footprint with the fill's reach added: what the shape's width and depth hold. */
function withFillReach(shape: Pick<WorkplaneShape, "textStroke">, footprint: { width: number; depth: number }) {
  const extent = textFillExtent(shape);
  return { width: footprint.width + 2 * extent, depth: footprint.depth + 2 * extent };
}

/**
 * A change of the fill keeps the letters as they are and moves the box instead: a stroke of
 * 1.5 mm outside makes the body 3 mm wider and deeper, back to an area takes it away again.
 */
export function textFillPatch(shape: WorkplaneShape, patch: Partial<WorkplaneShape>): Partial<WorkplaneShape> {
  if (!("textStroke" in patch) && !("textKeyring" in patch)) return patch;
  const letters = textLetterBox(shape);
  const before = textBoxAroundLetters(shape, letters);
  // A key ring's ear (#215) takes room on its side the same way.
  const after = textBoxAroundLetters({ ...shape, ...patch } as WorkplaneShape, letters);
  if (Math.abs(after.width - before.width) < 1e-9 && Math.abs(after.depth - before.depth) < 1e-9) return patch;
  return { ...patch, ...after };
}

/**
 * Curved text at its real measures: the baseline lies on a circle of
 * `textRadius`, the letters stand `textSize` tall. Every glyph keeps the
 * font's baseline (y = 0), so "a", "T", "g" and "." line up exactly as in a
 * straight line - only the line itself is bent. The centre of the circle stays
 * at the origin, so centring the text on a round body puts it concentric.
 *
 * Returns the text options and, for every character that draws something, the
 * matrix that takes its TextGeometry (at the letter size, thickness along +Z) to its
 * place on the circle. The edge tool puts each glyph's exact outline through
 * the same matrices, so its CAD bodies land on the drawn letters.
 */
export function curvedTextLayout(shape: WorkplaneShape) {
  const text = displayTextOf(shape);
  const radius = curvedRadius(shape);
  const baseFont = textFont(shape.font ?? "Multilanguage");
  if (shape.textVertical) return curvedColumnLayout(shape, text, radius, baseFont);
  // The spacing (#594) goes into the advances; a glyph still sits in the middle of its own natural width.
  const font = textLayoutFont(shape);
  let size = curvedSize(shape);
  const chars = [...text];

  // Too long for the circle: shrink the letters rather than let the ends overlap.
  const naturalLength = chars.reduce((sum, char) => sum + advanceOf(font, char, size), 0);
  const maxLength = 2 * Math.PI * radius * MAX_ARC_SHARE;
  if (naturalLength > maxLength) size *= maxLength / naturalLength;

  // Upside down: the straight line turned over before it is bent - the letters
  // swap order and each turns half round about the middle of the capital band,
  // so the line keeps its place on the circle and reads from the other side.
  const flipped = Boolean(shape.textFlipped);
  const ordered = flipped ? [...chars].reverse() : chars;
  const advances = ordered.map((char) => advanceOf(font, char, size));
  const totalLength = advances.reduce((sum, advance) => sum + advance, 0);
  const bandMiddle = capHeightOf(font, size) / 2;
  const inward = Boolean(shape.textInward);
  const options = textOptions(shape, size);
  const glyphs: Array<{ char: string; matrix: THREE.Matrix4 }> = [];

  let run = -totalLength / 2;
  ordered.forEach((char, index) => {
    const advance = advances[index];
    const angle = (run + advance / 2) / radius;
    run += advance;
    if (!char.trim()) return;

    // Built right to left: the first factor is the last step.
    const matrix = new THREE.Matrix4();
    if (inward) {
      // Along the bottom of the circle, read left to right, letters pointing at the centre.
      matrix.makeTranslation(radius * Math.sin(angle), 0, radius * Math.cos(angle)).multiply(new THREE.Matrix4().makeRotationY(angle));
    } else {
      // Along the top of the circle, letters pointing away from the centre.
      matrix.makeTranslation(radius * Math.sin(angle), 0, -radius * Math.cos(angle)).multiply(new THREE.Matrix4().makeRotationY(-angle));
    }
    if (flipped) {
      matrix
        .multiply(new THREE.Matrix4().makeTranslation(0, 0, -bandMiddle))
        .multiply(new THREE.Matrix4().makeRotationY(Math.PI))
        .multiply(new THREE.Matrix4().makeTranslation(0, 0, bandMiddle));
    }
    // Centre the glyph's own width on its arc point - horizontally only, the baseline stays at z = 0. With spacing the
    // arc point is the middle of the wider box, so the extra room lies half before and half behind the glyph.
    matrix.multiply(new THREE.Matrix4().makeTranslation(-advanceOf(baseFont, char, size) / 2, 0, 0));
    // Flat on the workplane: letter height points to -Z, thickness to +Y.
    matrix.multiply(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
    glyphs.push({ char, matrix });
  });
  return { options, glyphs };
}

/**
 * Vertical text on a curve (#981): the letters one under another as in straight vertical text - the same gap, a space the room
 * of a capital - but the column follows the circle of `textRadius` at its left side, bulging outwards, the middle of the column
 * at the circle's 9 o'clock; "inward" puts it on the right side instead. Every letter keeps standing upright, only its place
 * runs along the arc, so a name down the rim of a disk reads as it would written by hand. A column too long for the circle
 * shrinks its letters like curved text does.
 */
function curvedColumnLayout(shape: WorkplaneShape, text: string, radius: number, baseFont: Font) {
  const chars = [...text];
  let size = curvedSize(shape);
  const measure = (letterSize: number) => {
    const cap = capHeightOf(baseFont, letterSize);
    const gap = Math.max(0, cap * VERTICAL_GAP + (letterSize * textSpacingOf(shape)) / 100);
    const letters = chars.map((char) => {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      if (char.trim()) {
        baseFont.generateShapes(char, letterSize).forEach((glyph) => glyph.getPoints().forEach((point) => {
          minX = Math.min(minX, point.x);
          maxX = Math.max(maxX, point.x);
          minY = Math.min(minY, point.y);
          maxY = Math.max(maxY, point.y);
        }));
      }
      return Number.isFinite(minX) ? { char, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, height: maxY - minY } : { char: "", cx: 0, cy: 0, height: cap };
    });
    const total = letters.reduce((sum, letter) => sum + letter.height + gap, 0) - gap;
    return { letters, gap, total };
  };
  let layout = measure(size);
  const maxLength = 2 * Math.PI * radius * MAX_ARC_SHARE;
  if (layout.total > maxLength) {
    size *= maxLength / layout.total;
    layout = measure(size);
  }
  const options = textOptions(shape, size);
  const inward = Boolean(shape.textInward);
  const glyphs: Array<{ char: string; matrix: THREE.Matrix4 }> = [];
  let start = -layout.total / 2;
  layout.letters.forEach((letter) => {
    const angle = (start + letter.height / 2) / radius;
    start += letter.height + layout.gap;
    if (!letter.char) return;
    const matrix = new THREE.Matrix4().makeTranslation((inward ? 1 : -1) * radius * Math.cos(angle), 0, radius * Math.sin(angle));
    // Flat on the workplane: letter height points to -Z, thickness to +Y; the glyph's own middle sits on the arc point.
    matrix.multiply(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
    matrix.multiply(new THREE.Matrix4().makeTranslation(-letter.cx, -letter.cy, 0));
    glyphs.push({ char: letter.char, matrix });
  });
  return { options, glyphs };
}

export function buildCurvedText(shape: WorkplaneShape): THREE.BufferGeometry | null {
  const { options, glyphs } = curvedTextLayout(shape);
  const placed = glyphs.map(({ char, matrix }) => new TextGeometry(char, options).applyMatrix4(matrix));
  if (!placed.length) return null;
  const merged = mergeGeometries(placed, false);
  placed.forEach((glyph) => glyph.dispose());
  merged.computeBoundingBox();
  const box = merged.boundingBox;
  if (box) merged.translate(0, -box.min.y, 0);
  return merged;
}

/**
 * The box of curved text is symmetric around the circle centre: as wide and
 * deep as the lettering reaches out from it on either side. It may hold empty
 * space, but the shape's middle is the circle's middle.
 */
function symmetricExtent(geometry: THREE.BufferGeometry) {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  if (!box) return null;
  return {
    width: Math.max(0.1, 2 * Math.max(Math.abs(box.min.x), Math.abs(box.max.x))),
    depth: Math.max(0.1, 2 * Math.max(Math.abs(box.min.z), Math.abs(box.max.z))),
  };
}

/**
 * The uniform scale that fits curved text into its box - 1 when the box
 * already matches (within 1e-3), as it normally does.
 */
export function curvedTextFitScale(shape: WorkplaneShape, curved: THREE.BufferGeometry): number {
  const extent = symmetricExtent(curved);
  if (!extent) return 1;
  const letters = textLetterBox(shape);
  const scale = Math.min(letters.width / extent.width, letters.depth / extent.depth);
  return Number.isFinite(scale) && Math.abs(scale - 1) > 1e-3 ? scale : 1;
}

const footprintCache = new Map<string, { width: number; depth: number }>();

/** The width and depth curved text takes at its own radius and letter size. */
export function curvedTextFootprint(shape: WorkplaneShape): { width: number; depth: number } {
  const key = JSON.stringify([textOf(shape), shape.font ?? "Multilanguage", customFontRevision(shape.font), curvedSize(shape), curvedRadius(shape), Boolean(shape.textInward), Boolean(shape.textFlipped), Boolean(shape.textVertical), shape.bevel ?? 0, textSpacingOf(shape)]);
  const cached = footprintCache.get(key);
  if (cached) return cached;
  const geometry = buildCurvedText({ ...shape, height: 1 });
  let result = { width: curvedSize(shape), depth: curvedSize(shape) };
  if (geometry) {
    result = symmetricExtent(geometry) ?? result;
    geometry.dispose();
  }
  footprintCache.set(key, result);
  return result;
}

/** Width and depth of the straight line at layout size, before it is fitted into its box. */
function straightTextExtent(shape: WorkplaneShape) {
  const geometry = new THREE.ExtrudeGeometry(straightTextShapes(shape, LAYOUT_SIZE), textOptions({ ...shape, height: 1 }, LAYOUT_SIZE));
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  const extent = box ? { width: Math.max(1, box.max.x - box.min.x), depth: Math.max(1, box.max.y - box.min.y) } : { width: LAYOUT_SIZE, depth: LAYOUT_SIZE };
  geometry.dispose();
  return extent;
}

const CURVE_KEYS = ["textCurved", "textVertical", "textRadius", "textInward", "textFlipped", "textSize", "text", "font", "bevel", "textStroke", "textSpacing"] as const;

/**
 * Keeps curved text and its box in step. Straight text simply fills its box;
 * curved text is defined by radius and letter size, so the box follows them:
 *
 * - switching the curve on takes the letter size the straight text had,
 * - switching it off lays the straight line out at that letter size again,
 * - changing text, font, radius or size re-measures the box,
 * - pulling a handle scales radius and letter size together, so the values in
 *   the inspector always match what is drawn.
 */
export function curvedTextPatch(shape: WorkplaneShape, patch: Partial<WorkplaneShape>): Partial<WorkplaneShape> {
  const next = { ...shape, ...patch } as WorkplaneShape;
  if (next.kind !== "text") return patch;
  const wasCurved = Boolean(shape.textCurved);
  const isCurved = Boolean(next.textCurved);
  // Straight text: only a changed fill moves the box (textFillPatch); the letters fill the rest.
  if (!wasCurved && !isCurved) return textFillPatch(shape, patch);
  const boxOf = (footprint: { width: number; depth: number }) => {
    const box = withFillReach(next, footprint);
    return { ...box, size: Math.max(box.width, box.depth) };
  };

  if (!wasCurved && isCurved) {
    const extent = straightTextExtent(shape);
    const letters = textLetterBox(shape);
    const scale = Math.min(letters.width / extent.width, letters.depth / extent.depth);
    const textSize = Number((patch.textSize ?? LAYOUT_SIZE * scale).toFixed(2));
    const textRadius = patch.textRadius ?? shape.textRadius ?? Math.max(MIN_TEXT_RADIUS, Math.round(shapeWidth(shape) / Math.PI));
    return { ...patch, textSize, textRadius, ...boxOf(curvedTextFootprint({ ...next, textSize, textRadius })) };
  }

  if (wasCurved && !isCurved) {
    const extent = straightTextExtent(next);
    const scale = curvedSize(next) / LAYOUT_SIZE;
    return { ...patch, ...boxOf({ width: extent.width * scale, depth: extent.depth * scale }) };
  }

  const touchesCurve = CURVE_KEYS.some((key) => key in patch);
  const resized = patch.width !== undefined || patch.depth !== undefined || patch.size !== undefined;
  if (resized && !touchesCurve) {
    const current = withFillReach(shape, curvedTextFootprint(shape));
    const factors = [
      patch.width !== undefined ? patch.width / current.width : null,
      patch.depth !== undefined ? patch.depth / current.depth : null,
      patch.width === undefined && patch.depth === undefined && patch.size !== undefined ? patch.size / Math.max(current.width, current.depth) : null,
    ].filter((factor): factor is number => factor !== null && Number.isFinite(factor) && factor > 0);
    // One handle pulled: follow it. Both: the smaller step, so the text still fits.
    const factor = factors.length ? Math.min(...factors) : 1;
    const textSize = Number((curvedSize(shape) * factor).toFixed(2));
    const textRadius = Number(clamp(curvedRadius(shape) * factor, MIN_TEXT_RADIUS, MAX_TEXT_RADIUS).toFixed(2));
    return { ...patch, textSize, textRadius, ...boxOf(curvedTextFootprint({ ...next, textSize, textRadius })) };
  }

  if (touchesCurve) {
    return { ...patch, ...boxOf(curvedTextFootprint(next)) };
  }
  return patch;
}

export type TextGlyphShape = { glyph: THREE.Shape; map: (point: THREE.Vector2) => { x: number; z: number } };

/**
 * The glyphs of a text as the font's outlines, each with the map that takes its points to the
 * workplane (x/z, in mm, about the shape's own centre) - straight text scaled and centred the
 * way createTextGeometry fits it into the letter box, curved text through the matrix that
 * places its display glyph on the circle and the same fit. The exact outlines for the edge
 * tool and the fill modes (#215) both start from these. Null when nothing is drawn.
 */
export function textGlyphShapes(shape: WorkplaneShape): { glyphs: TextGlyphShape[]; curveSegments: number } | null {
  const fontName = shape.font ?? "Multilanguage";
  const curveSegments = fontName === "Stencil" ? 1 : 8;
  const glyphs: TextGlyphShape[] = [];
  if (shape.textCurved) {
    const display = buildCurvedText(shape);
    if (!display) return null;
    const fit = curvedTextFitScale(shape, display);
    display.dispose();
    const { options, glyphs: placed } = curvedTextLayout(shape);
    placed.forEach(({ char, matrix }) => {
      const map = (point: THREE.Vector2) => {
        const world = new THREE.Vector3(point.x, point.y, 0).applyMatrix4(matrix);
        return { x: fit * world.x, z: fit * world.z };
      };
      options.font.generateShapes(char, options.size).forEach((glyph) => glyphs.push({ glyph, map }));
    });
  } else {
    const shapes = straightTextShapes(shape, LAYOUT_SIZE);
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    shapes.forEach((glyph) => {
      const sampled = glyph.extractPoints(curveSegments);
      [sampled.shape, ...sampled.holes].forEach((points) => points.forEach((point) => {
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
      }));
    });
    const letters = textLetterBox(shape);
    const scale = textFitScale(shape, letters, { width: Math.max(1, maxX - minX), depth: Math.max(1, maxY - minY) });
    // Scaled, turned flat (font y becomes -z) and centred, as the display does - beside an ear, off centre by it.
    const middle = textLetterOffset(shape);
    const map = (point: THREE.Vector2) => ({
      x: scale.x * point.x - (scale.x * (minX + maxX)) / 2 + middle.x,
      z: -scale.y * point.y + (scale.y * (minY + maxY)) / 2 + middle.z,
    });
    shapes.forEach((glyph) => glyphs.push({ glyph, map }));
  }
  return glyphs.length ? { glyphs, curveSegments } : null;
}

export function createTextGeometry(shape: WorkplaneShape): THREE.BufferGeometry {
  if (shape.textCurved) {
    const curved = buildCurvedText(shape);
    if (!curved) return new THREE.BoxGeometry(0.001, shape.height, 0.001);
    // The box normally matches already; if it does not (older data, a stray
    // width), fit uniformly so the drawing never leaves its own frame.
    const scale = curvedTextFitScale(shape, curved);
    if (scale !== 1) curved.scale(scale, 1, scale);
    curved.computeVertexNormals();
    return curved;
  }

  // TextGeometry extrudes font.generateShapes; vertical text (#981) has outlines of its own.
  const geometry = new THREE.ExtrudeGeometry(straightTextShapes(shape, LAYOUT_SIZE), textOptions(shape, LAYOUT_SIZE));
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  if (box) {
    const textWidth = Math.max(1, box.max.x - box.min.x);
    const textDepth = Math.max(1, box.max.y - box.min.y);
    const letters = textLetterBox(shape);
    const scale = textFitScale(shape, letters, { width: textWidth, depth: textDepth });
    geometry.scale(scale.x, scale.y, 1);
  }

  geometry.rotateX(-Math.PI / 2);
  geometry.computeBoundingBox();
  const rotatedBox = geometry.boundingBox;
  if (rotatedBox) {
    const middle = textLetterOffset(shape);
    geometry.translate(
      -(rotatedBox.min.x + rotatedBox.max.x) / 2 + middle.x,
      -rotatedBox.min.y,
      -(rotatedBox.min.z + rotatedBox.max.z) / 2 + middle.z,
    );
  }
  return geometry;
}
