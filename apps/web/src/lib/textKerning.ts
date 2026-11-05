import * as THREE from "three";
import { Font } from "three/examples/jsm/loaders/FontLoader.js";

/**
 * Automatic kerning (#1297): pairs of letters that stand too far apart, such as AY, AV, LT or To, move closer.
 *
 * The typefaces layerling draws with carry no kerning of their own - the three.js typeface format has no place for
 * it - so every letter keeps its full advance and a pair whose shapes leave room between them shows a gap. The kerning
 * here is optical: both letters are cut by horizontal scan lines, and on every line where both have ink the distance
 * from the right edge of the first to the left edge of the second is measured. A pair whose mean distance is clearly
 * larger than the font's usual one is moved closer by part of the difference, never so close that the letters come
 * nearer than a floor on any line, so they stay apart when printed. Only pairs that are too open move: a pair the
 * designer already spaced well keeps its place.
 */

type GlyphData = { ha?: number; o?: string };
type FontData = { resolution?: number; glyphs?: Record<string, GlyphData>; boundingBox?: { yMin: number; yMax: number } };

/** Horizontal scan lines across the font's height. */
const SCAN_LINES = 64;
/** How much of a pair's extra room is taken away. */
const STRENGTH = 0.8;
/** Extra room, in parts of a capital's height, a pair may have before it moves. */
const TOLERANCE = 0.06;
/** The distance a line contributes at most, in parts of a capital's height: one very open line does not decide. */
const LINE_CAP = 0.5;
/** The closest two letters may come on any line after kerning, in parts of a capital's height. */
const FLOOR = 0.07;
/** The most a pair moves closer, in parts of a capital's height. */
const MAX_KERN = 0.3;

type Profile = { left: Float64Array; right: Float64Array };
type FontKerning = {
  lines: Float64Array;
  capHeight: number;
  profiles: Map<string, Profile | null>;
  pairs: Map<string, number>;
  reference: number | null;
};

const kerningByData = new WeakMap<object, FontKerning>();

function glyphOf(data: FontData, char: string): GlyphData | undefined {
  return data.glyphs?.[char] ?? data.glyphs?.["?"];
}

function stateOf(font: Font): FontKerning {
  const data = font.data as unknown as FontData;
  let state = kerningByData.get(data);
  if (state) return state;
  const resolution = data.resolution || 1000;
  const low = data.boundingBox?.yMin ?? -0.3 * resolution;
  const high = data.boundingBox?.yMax ?? resolution;
  const lines = new Float64Array(SCAN_LINES);
  for (let index = 0; index < SCAN_LINES; index += 1) lines[index] = low + ((index + 0.5) * (high - low)) / SCAN_LINES;
  state = { lines, capHeight: 0.7 * resolution, profiles: new Map(), pairs: new Map(), reference: null };
  kerningByData.set(data, state);
  const capital = profileOf(font, state, "H");
  if (capital) {
    let top = 0;
    font.generateShapes("H", resolution).forEach((shape) => shape.extractPoints(8).shape.forEach((point) => { top = Math.max(top, point.y); }));
    if (top > 0) state.capHeight = top;
  }
  return state;
}

/**
 * The leftmost and rightmost ink of a glyph on every scan line, in font units from the glyph's own origin; NaN where
 * the line misses the glyph. The edges are cut, not the points: a straight stroke of a typeface is only its two ends.
 */
function profileOf(font: Font, state: FontKerning, char: string): Profile | null {
  if (state.profiles.has(char)) return state.profiles.get(char)!;
  const data = font.data as unknown as FontData;
  const glyph = data.glyphs?.[char];
  let profile: Profile | null = null;
  if (glyph?.o && char.trim()) {
    const left = new Float64Array(SCAN_LINES).fill(Number.NaN);
    const right = new Float64Array(SCAN_LINES).fill(Number.NaN);
    const resolution = data.resolution || 1000;
    // At the size of the font's own units the outline comes out in them.
    font.generateShapes(char, resolution).forEach((shape) => {
      const sampled = shape.extractPoints(8);
      [sampled.shape, ...sampled.holes].forEach((ring) => cutRing(ring, state.lines, left, right));
    });
    profile = left.some((value) => !Number.isNaN(value)) ? { left, right } : null;
  }
  state.profiles.set(char, profile);
  return profile;
}

function cutRing(ring: THREE.Vector2[], lines: Float64Array, left: Float64Array, right: Float64Array) {
  for (let index = 0; index < ring.length; index += 1) {
    const a = ring[index];
    const b = ring[(index + 1) % ring.length];
    if (a.y === b.y) continue;
    const low = Math.min(a.y, b.y);
    const high = Math.max(a.y, b.y);
    for (let line = 0; line < lines.length; line += 1) {
      const y = lines[line];
      if (y < low || y >= high) continue;
      const x = a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x);
      if (Number.isNaN(left[line]) || x < left[line]) left[line] = x;
      if (Number.isNaN(right[line]) || x > right[line]) right[line] = x;
    }
  }
}

/** The mean distance of a pair over the lines where both letters have ink, and the smallest one; null when they share none. */
function pairMeasure(font: Font, state: FontKerning, first: string, second: string) {
  const a = profileOf(font, state, first);
  const b = profileOf(font, state, second);
  if (!a || !b) return null;
  const advance = (font.data as unknown as FontData).glyphs?.[first]?.ha ?? 0;
  const cap = LINE_CAP * state.capHeight;
  let sum = 0;
  let count = 0;
  let closest = Infinity;
  for (let line = 0; line < SCAN_LINES; line += 1) {
    const end = a.right[line];
    const start = b.left[line];
    if (Number.isNaN(end) || Number.isNaN(start)) continue;
    const gap = advance - end + start;
    sum += Math.min(gap, cap);
    count += 1;
    closest = Math.min(closest, gap);
  }
  return count ? { mean: sum / count, closest } : null;
}

/** The usual distance of the font: the median over the pairs of its Latin letters. */
function referenceOf(font: Font, state: FontKerning) {
  if (state.reference !== null) return state.reference;
  const letters = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"].filter((char) => profileOf(font, state, char));
  const values: number[] = [];
  letters.forEach((first) => letters.forEach((second) => {
    const measure = pairMeasure(font, state, first, second);
    if (measure) values.push(measure.mean);
  }));
  values.sort((x, y) => x - y);
  state.reference = values.length ? values[Math.floor(values.length / 2)] : 0;
  return state.reference;
}

/**
 * How far the second letter moves towards the first, in the font's units: 0 or less. Measured on the font's own
 * advances, so a letter spacing set on top of it stays as set.
 */
export function kerningOf(font: Font, first: string, second: string): number {
  if (!first.trim() || !second.trim()) return 0;
  const state = stateOf(font);
  const key = `${first}\u0000${second}`;
  const known = state.pairs.get(key);
  if (known !== undefined) return known;
  let kern = 0;
  const measure = pairMeasure(font, state, first, second);
  if (measure) {
    const extra = measure.mean - referenceOf(font, state) - TOLERANCE * state.capHeight;
    if (extra > 0) {
      const room = Math.max(0, measure.closest - FLOOR * state.capHeight);
      // A pair with no room left stays where it is (0, not -0).
      kern = 0 - Math.min(STRENGTH * extra, room, MAX_KERN * state.capHeight) || 0;
    }
  }
  state.pairs.set(key, kern);
  return kern;
}

/** Scripts whose letters are not set side by side as Latin, Greek and Cyrillic ones are: kana, kanji, hangul. */
const UNKERNED = /[ᄀ-ᇿ　-鿿가-힯豈-﫿＀-￯]/;

/**
 * A typeface that lays out its line with the kerning of `measured` (the font without letter spacing). Everything else -
 * the outlines, the advances it was given, a new line - is as three.js does it.
 */
export class KernedFont extends Font {
  readonly measured: Font;

  constructor(font: Font, measured: Font) {
    super(font.data);
    this.measured = measured;
  }

  /** The kerning between two characters at `size`, in the same units as the layout. */
  kernAt(first: string, second: string, size: number): number {
    if (UNKERNED.test(first) || UNKERNED.test(second)) return 0;
    const resolution = (this.data as unknown as FontData).resolution || 1000;
    return (kerningOf(this.measured, first, second) * size) / resolution;
  }

  override generateShapes(text: string, size = 100, direction: "ltr" | "rtl" | "tb" = "ltr"): THREE.Shape[] {
    if (direction !== "ltr") return super.generateShapes(text, size, direction);
    const data = this.data as unknown as FontData & { underlineThickness?: number };
    const resolution = data.resolution || 1000;
    const scale = size / resolution;
    const box = data.boundingBox ?? { yMin: -0.3 * resolution, yMax: resolution };
    const lineHeight = (box.yMax - box.yMin + (data.underlineThickness ?? 0)) * scale;
    const shapes: THREE.Shape[] = [];
    let x = 0;
    let y = 0;
    let previous = "";
    for (const char of Array.from(text)) {
      if (char === "\n") {
        x = 0;
        y -= lineHeight;
        previous = "";
        continue;
      }
      const glyph = glyphOf(data, char);
      if (!glyph) continue;
      if (previous) x += this.kernAt(previous, char, size);
      super.generateShapes(char, size).forEach((shape) => {
        shapes.push(x || y ? moved(shape, x, y) : shape);
      });
      x += (glyph.ha ?? 0) * scale;
      previous = char;
    }
    return shapes;
  }
}

function moved(shape: THREE.Shape, dx: number, dy: number) {
  const seen = new Set<THREE.Vector2>();
  [shape, ...shape.holes].forEach((path) => path.curves.forEach((curve) => {
    for (const key of ["v0", "v1", "v2", "v3"] as const) {
      const point = (curve as unknown as Record<string, THREE.Vector2 | undefined>)[key];
      if (point instanceof THREE.Vector2 && !seen.has(point)) {
        point.x += dx;
        point.y += dy;
        seen.add(point);
      }
    }
  }));
  return shape;
}

const kernedFonts = new WeakMap<Font, KernedFont>();

/** The font laid out with kerning, one wrapper per font so caches keyed on the font stay stable. */
export function kernedFont(font: Font, measured: Font): KernedFont {
  let made = kernedFonts.get(font);
  if (!made || made.measured !== measured) {
    made = new KernedFont(font, measured);
    kernedFonts.set(font, made);
  }
  return made;
}

/** The kerning a laid-out font adds between two characters at `size`: 0 for a font without kerning. */
export function kernBetween(font: Font, first: string, second: string, size: number): number {
  return font instanceof KernedFont ? font.kernAt(first, second, size) : 0;
}
