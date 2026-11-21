import type { ManifoldToplevel } from "manifold-3d";
import { big5Characters, gb2312Characters } from "@/lib/chineseText";
import { commonJapaneseCharacters, level2JapaneseCharacters } from "@/lib/japaneseText";
import type { Font as OpentypeFont, Glyph as OpentypeGlyph, GsubSubtable, GsubTable } from "opentype.js";
import type { FontData } from "three/examples/jsm/loaders/FontLoader.js";
import { arabicLetterForms, lamAlefLigatures, shapeText } from "@/lib/arabicShaping";
import { sha256Hex } from "@/lib/projectAssets";

/*
 * Fonts of one's own for the text shape: a TrueType or OpenType file chosen from disk, or a font
 * installed on the computer (Chrome and Edge only, see systemFonts.ts). The file is read once,
 * here, into the same typeface format the built-in fonts use, so curved text, the exact body and
 * STEP work on it unchanged.
 *
 * Two things happen on the way that the built-in fonts never needed:
 * - Outlines are turned so their outer contours run clockwise, as the three.js typeface format
 *   expects. TrueType draws them that way already; OpenType fonts with PostScript outlines (CFF)
 *   draw them the other way round, and their letters would come out as holes.
 * - Contours that overlap each other - common in variable fonts and in script faces, where a
 *   stroke is drawn over the next - are merged into one outline. Extruded as they come, they
 *   would make bodies that run through each other. A merged letter has straight pieces where
 *   it had curves, fine enough not to show.
 *
 * A design keeps only the letters its texts use (typefaceSubset), never the whole file.
 */

export const CUSTOM_FONT_PREFIX = "custom:";
/** Font files larger than this are refused: a full CJK font is well past it. */
export const MAX_CUSTOM_FONT_BYTES = 40 * 1024 * 1024;
/** Characters kept from one font; a font with more keeps the common ones of its language first (customFontRanks), then the rest by code point. */
export const MAX_CUSTOM_FONT_CHARACTERS = 8000;
/** A glyph outline longer than this is refused when a design brings it along. */
const MAX_GLYPH_OUTLINE_LENGTH = 400_000;
const CURVE_SAMPLES = 12;

export type CustomTypeface = { id: string; name: string; data: FontData };

type Point = { x: number; y: number };
type Segment =
  | { type: "L"; x: number; y: number }
  | { type: "Q"; x1: number; y1: number; x: number; y: number }
  | { type: "C"; x1: number; y1: number; x2: number; y2: number; x: number; y: number };
type Contour = { start: Point; segments: Segment[] };
type TypefaceGlyph = { ha: number; x_min: number; x_max: number; o: string };

export function isCustomFontId(value: unknown): value is `custom:${string}` {
  return typeof value === "string" && value.startsWith(CUSTOM_FONT_PREFIX) && /^custom:[0-9a-f]{16}$/.test(value);
}

/**
 * The id a font file gets: the same file has the same id on every computer. The browser's own
 * hashing exists only on https pages; the app's SHA-256 falls back to its own over http (a home
 * server, a Docker install in the house), with the same result.
 */
export async function customFontId(bytes: ArrayBuffer) {
  return CUSTOM_FONT_PREFIX + (await sha256Hex(new Uint8Array(bytes))).slice(0, 16);
}

/** A clean display name: what the font calls itself, or the file's name. */
export function customFontName(name: string | undefined, fallback: string) {
  const cleaned = (name ?? "").replace(/[\u0000-\u001f]/g, "").replace(/\s+/g, " ").trim().slice(0, 80);
  return cleaned || fallback.replace(/\.(ttf|otf|woff2?|ttc)$/i, "").trim().slice(0, 80) || "Font";
}

function signedArea(points: Point[]) {
  let area = 0;
  points.forEach((point, index) => {
    const next = points[(index + 1) % points.length];
    area += point.x * next.y - next.x * point.y;
  });
  return area / 2;
}

function boxArea(points: Point[]) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
}

function sampleContour(contour: Contour, steps = CURVE_SAMPLES): Point[] {
  const points: Point[] = [contour.start];
  let from = contour.start;
  for (const segment of contour.segments) {
    if (segment.type === "L") {
      points.push({ x: segment.x, y: segment.y });
    } else if (segment.type === "Q") {
      for (let step = 1; step <= steps; step += 1) {
        const t = step / steps;
        const u = 1 - t;
        points.push({ x: u * u * from.x + 2 * u * t * segment.x1 + t * t * segment.x, y: u * u * from.y + 2 * u * t * segment.y1 + t * t * segment.y });
      }
    } else {
      for (let step = 1; step <= steps; step += 1) {
        const t = step / steps;
        const u = 1 - t;
        points.push({
          x: u ** 3 * from.x + 3 * u * u * t * segment.x1 + 3 * u * t * t * segment.x2 + t ** 3 * segment.x,
          y: u ** 3 * from.y + 3 * u * u * t * segment.y1 + 3 * u * t * t * segment.y2 + t ** 3 * segment.y,
        });
      }
    }
    from = { x: segment.x, y: segment.y };
  }
  // The last point sits on the start when the outline closes itself.
  const last = points[points.length - 1];
  if (points.length > 1 && Math.hypot(last.x - contour.start.x, last.y - contour.start.y) < 1e-9) points.pop();
  return points;
}

/** The same contour run the other way round, curves and all. */
function reverseContour(contour: Contour): Contour {
  const segments = [...contour.segments];
  const last = segments[segments.length - 1];
  if (!last || Math.hypot(last.x - contour.start.x, last.y - contour.start.y) > 1e-9) segments.push({ type: "L", x: contour.start.x, y: contour.start.y });
  const ends = [contour.start, ...segments.map((segment) => ({ x: segment.x, y: segment.y }))];
  const reversed: Segment[] = [];
  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const segment = segments[index];
    const to = ends[index];
    if (segment.type === "L") reversed.push({ type: "L", x: to.x, y: to.y });
    else if (segment.type === "Q") reversed.push({ type: "Q", x1: segment.x1, y1: segment.y1, x: to.x, y: to.y });
    else reversed.push({ type: "C", x1: segment.x2, y1: segment.y2, x2: segment.x1, y2: segment.y1, x: to.x, y: to.y });
  }
  return { start: contour.start, segments: reversed };
}

function pointInPolygon(point: Point, polygon: Point[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i];
    const b = polygon[j];
    if ((a.y > point.y) !== (b.y > point.y) && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/**
 * The contours of a glyph from opentype.js's path commands, in font units with y up. A line to the
 * point the pen is already on is left out: opentype.js draws one after the move and after many
 * curves of a TrueType outline, a quarter of all segments in Zen Maru Gothic, and it draws nothing.
 */
export function contoursFromCommands(commands: ReadonlyArray<{ type: string; x?: number; y?: number; x1?: number; y1?: number; x2?: number; y2?: number }>): Contour[] {
  const contours: Contour[] = [];
  let current: Contour | null = null;
  const finite = (...values: Array<number | undefined>) => values.every((value) => typeof value === "number" && Number.isFinite(value));
  for (const command of commands) {
    if (command.type === "M" && finite(command.x, command.y)) {
      if (current?.segments.length) contours.push(current);
      current = { start: { x: command.x as number, y: command.y as number }, segments: [] };
    } else if (!current) {
      continue;
    } else if (command.type === "L" && finite(command.x, command.y)) {
      const pen = current.segments[current.segments.length - 1] ?? current.start;
      if (pen.x === command.x && pen.y === command.y) continue;
      current.segments.push({ type: "L", x: command.x as number, y: command.y as number });
    } else if (command.type === "Q" && finite(command.x, command.y, command.x1, command.y1)) {
      current.segments.push({ type: "Q", x1: command.x1 as number, y1: command.y1 as number, x: command.x as number, y: command.y as number });
    } else if (command.type === "C" && finite(command.x, command.y, command.x1, command.y1, command.x2, command.y2)) {
      current.segments.push({ type: "C", x1: command.x1 as number, y1: command.y1 as number, x2: command.x2 as number, y2: command.y2 as number, x: command.x as number, y: command.y as number });
    } else if (command.type === "Z") {
      if (current.segments.length) contours.push(current);
      current = null;
    }
  }
  if (current?.segments.length) contours.push(current);
  return contours;
}

/**
 * A glyph's contours as the typeface format wants them: degenerate ones dropped, outers clockwise
 * and holes counter-clockwise (y up), and overlapping contours merged into one outline when a
 * manifold runtime is at hand. Returns the contours to write.
 */
export function normalizeGlyphContours(contours: Contour[], runtime?: ManifoldToplevel): Contour[] {
  const sampled = contours
    .map((contour) => ({ contour, points: sampleContour(contour) }))
    .map((entry) => ({ ...entry, area: signedArea(entry.points) }))
    // A contour that crosses itself can add up to no area at all; only one with no extent is empty.
    .filter((entry) => entry.points.length >= 3 && (Math.abs(entry.area) > 1e-6 || boxArea(entry.points) > 1e-6));
  if (!sampled.length) return [];
  if (runtime) {
    // Without overlaps the non-zero fill covers exactly what the contours add up to. A single
    // contour can overlap too, crossing itself - an ampersand in a variable font does.
    const total = Math.abs(sampled.reduce((sum, entry) => sum + entry.area, 0));
    const polygons = sampled.map((entry) => entry.points.map((point) => [point.x, point.y] as [number, number]));
    const section = new runtime.CrossSection(polygons, "NonZero");
    try {
      const filled = section.area();
      if (Math.abs(filled - total) > Math.max(1e-6, total * 1e-4)) {
        // The merged outline: manifold gives outers counter-clockwise, the typeface format wants them clockwise.
        // Slivers a hundredth of a font unit wide go; they only trouble the CAD kernel.
        const simplified = section.simplify(0.01);
        const polygons = simplified.toPolygons();
        simplified.delete();
        return polygons
          .filter((polygon) => polygon.length >= 3)
          .map((polygon) => {
            const points = polygon.map(([x, y]) => ({ x, y }));
            const ordered = signedArea(points) > 0 ? [...points].reverse() : points;
            return { start: ordered[0], segments: ordered.slice(1).map((point) => ({ type: "L" as const, x: point.x, y: point.y })) };
          });
      }
    } finally {
      section.delete();
    }
  }
  // Outer or hole by how many other contours hold it; an outer runs clockwise (negative area).
  // A contour without area left over here encloses nothing and is dropped.
  return sampled.filter((entry) => Math.abs(entry.area) > 1e-6).map((entry, index, kept) => {
    const probe = entry.points[0];
    const depth = kept.filter((other, otherIndex) => otherIndex !== index && Math.abs(other.area) > Math.abs(entry.area) && pointInPolygon(probe, other.points)).length;
    const wantsClockwise = depth % 2 === 0;
    const isClockwise = entry.area < 0;
    return wantsClockwise === isClockwise ? entry.contour : reverseContour(entry.contour);
  });
}

const round = (value: number) => String(Math.round(value * 100) / 100);

/** The typeface format's outline: m, l, q (end, control) and b (end, control 1, control 2). */
export function outlineString(contours: Contour[]) {
  const parts: string[] = [];
  for (const contour of contours) {
    parts.push("m", round(contour.start.x), round(contour.start.y));
    for (const segment of contour.segments) {
      if (segment.type === "L") parts.push("l", round(segment.x), round(segment.y));
      else if (segment.type === "Q") parts.push("q", round(segment.x), round(segment.y), round(segment.x1), round(segment.y1));
      else parts.push("b", round(segment.x), round(segment.y), round(segment.x1), round(segment.y1), round(segment.x2), round(segment.y2));
    }
  }
  return parts.join(" ");
}

function contoursBounds(contours: Contour[]) {
  const xs = contours.flatMap((contour) => [contour.start.x, ...contour.segments.map((segment) => segment.x)]);
  return xs.length ? { min: Math.min(...xs), max: Math.max(...xs) } : { min: 0, max: 0 };
}

/** Explains why a file could not be read, in words the editor can show. */
export class CustomFontError extends Error {}

function coverageGlyphs(coverage: GsubSubtable["coverage"]): number[] {
  if (!coverage) return [];
  if (coverage.format === 1) return coverage.glyphs;
  const glyphs: number[] = [];
  coverage.ranges.forEach((range) => {
    for (let glyph = range.start; glyph <= range.end; glyph += 1) glyphs.push(glyph);
  });
  return glyphs;
}

/** The GSUB subtables of one feature for Arabic, each with its real lookup type (an extension lookup unwrapped). */
function arabicSubtables(gsub: GsubTable, tag: string): Array<{ type: number; table: GsubSubtable }> {
  const script = gsub.scripts.find((entry) => entry.tag === "arab") ?? gsub.scripts.find((entry) => entry.tag === "DFLT");
  const langSys = script?.script.defaultLangSys ?? script?.script.langSysRecords[0]?.langSys;
  const subtables: Array<{ type: number; table: GsubSubtable }> = [];
  for (const featureIndex of langSys?.featureIndexes ?? []) {
    const feature = gsub.features[featureIndex];
    if (!feature || feature.tag !== tag) continue;
    for (const lookupIndex of feature.feature.lookupListIndexes) {
      const lookup = gsub.lookups[lookupIndex];
      lookup?.subtables.forEach((table) => {
        if (lookup.lookupType === 7 && table.extension) subtables.push({ type: table.lookupType ?? 0, table: table.extension });
        else subtables.push({ type: lookup.lookupType, table });
      });
    }
  }
  return subtables;
}

/** One glyph for another under a feature: single substitutions, and the one-glyph sequences some fonts write them as. */
function singleSubstitutions(gsub: GsubTable, tag: string): Map<number, number> {
  const map = new Map<number, number>();
  for (const { type, table } of arabicSubtables(gsub, tag)) {
    coverageGlyphs(table.coverage).forEach((glyph, index) => {
      if (map.has(glyph)) return;
      if (type === 1) map.set(glyph, table.substFormat === 1 ? glyph + (table.deltaGlyphId ?? 0) : table.substitute?.[index] ?? glyph);
      else if (type === 2 && table.sequences?.[index]?.length === 1) map.set(glyph, table.sequences[index][0]);
    });
  }
  return map;
}

/** Two glyphs as one under the given features, keyed "first,second". */
function pairLigatures(gsub: GsubTable, tags: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const tag of tags) {
    for (const { type, table } of arabicSubtables(gsub, tag)) {
      if (type !== 4) continue;
      coverageGlyphs(table.coverage).forEach((first, index) => {
        table.ligatureSets?.[index]?.forEach((ligature) => {
          const key = `${first},${ligature.components[0]}`;
          if (ligature.components.length === 1 && !map.has(key)) map.set(key, ligature.ligGlyph);
        });
      });
    }
  }
  return map;
}

/**
 * The shapes Arabic letters take beside their neighbours (#294), read from the font's shaping
 * rules - GSUB init, medi and fina, and the lam-alef ligature under rlig or liga - and put into
 * the character map under the presentation-form characters `shapeText` draws them by. A font
 * that lists those characters itself is read as it is; the rules win where both exist, as they
 * are what the font's designer meant for running text.
 */
function addArabicForms(font: OpentypeFont, byCharacter: Map<number, OpentypeGlyph>) {
  const gsub = font.tables.gsub;
  if (!gsub) return;
  const byForm = [null, singleSubstitutions(gsub, "fina"), singleSubstitutions(gsub, "init"), singleSubstitutions(gsub, "medi")];
  if (byForm.every((map) => !map?.size)) return;
  const glyphIndex = (char: string) => font.charToGlyphIndex(char) || 0;
  for (const { letter, forms } of arabicLetterForms()) {
    const base = glyphIndex(letter);
    if (!base) continue;
    forms.forEach((code, formIndex) => {
      const index = formIndex > 0 && code ? byForm[formIndex]?.get(base) : undefined;
      if (index) byCharacter.set(code, font.glyphs.get(index));
    });
  }
  const ligatures = pairLigatures(gsub, ["rlig", "liga", "calt"]);
  const lam = glyphIndex("ل");
  if (!lam || !ligatures.size) return;
  const [fina, init, medi] = [byForm[1]!, byForm[2]!, byForm[3]!];
  for (const { alef, forms } of lamAlefLigatures()) {
    const alefIndex = glyphIndex(alef);
    if (!alefIndex) continue;
    const isolated = ligatures.get(`${init.get(lam)},${fina.get(alefIndex)}`) ?? ligatures.get(`${lam},${alefIndex}`);
    const final = ligatures.get(`${medi.get(lam)},${fina.get(alefIndex)}`);
    if (isolated) byCharacter.set(forms[0], font.glyphs.get(isolated));
    if (final) byCharacter.set(forms[1], font.glyphs.get(final));
  }
}

/**
 * A TrueType, OpenType or WOFF file as a typeface the text shape can use. WOFF2 needs a
 * decompressor this does not carry, and a collection (.ttc) holds several fonts; both are refused
 * with a reason.
 */
export type CustomFontScript = "japanese" | "simplified" | "traditional";

/** The share of `characters` a font has. */
function coverage(has: ReadonlySet<string>, characters: Iterable<string>) {
  let total = 0;
  let found = 0;
  for (const char of characters) {
    total += 1;
    if (has.has(char)) found += 1;
  }
  return total === 0 ? 0 : found / total;
}

/**
 * Which language a font with more characters than are kept is made for, by what it has: a
 * simplified-Chinese font has the GB2312 characters Japanese does not use (说, 书), a traditional
 * one the Big5 ones neither has. A font that has both (a pan-CJK one) goes by the browser's
 * language; anything else is taken as Japanese, as before (Issue #1757).
 */
export function customFontScript(has: ReadonlySet<string>, language = typeof navigator === "undefined" ? "" : navigator.language ?? ""): CustomFontScript {
  const japanese = new Set(commonJapaneseCharacters());
  for (const char of level2JapaneseCharacters()) japanese.add(char);
  const gb = gb2312Characters();
  const gbAll = new Set([...gb.level1, ...gb.level2]);
  const big5 = big5Characters();
  const simplifiedOnly = [...gbAll].filter((char) => !japanese.has(char));
  const traditionalOnly = [...big5.level1].filter((char) => !japanese.has(char) && !gbAll.has(char));
  const simplified = coverage(has, simplifiedOnly) >= 0.8;
  const traditional = coverage(has, traditionalOnly) >= 0.8;
  const lang = language.toLowerCase();
  if (simplified && traditional) {
    if (lang.startsWith("ja")) return "japanese";
    return /^zh-(tw|hk|mo|hant)/.test(lang) ? "traditional" : "simplified";
  }
  if (simplified) return "simplified";
  if (traditional) return "traditional";
  return "japanese";
}

/**
 * The order in which a font's characters are kept, lowest first, when it has more than
 * MAX_CUSTOM_FONT_CHARACTERS. By code point a CJK font would keep the first 8,000 and lose the
 * common characters late in the block: for Japanese the level-1 kanji (郎, 高, 鈴), for Chinese
 * nearly every simplified one (说, 试). So the common ones of the font's language come first.
 */
export function customFontRanks(has: ReadonlySet<string>, language?: string): (char: string) => number {
  const script = customFontScript(has, language);
  const japaneseCommon = commonJapaneseCharacters();
  const tiers: Iterable<string>[] = [];
  const latin: string[] = [];
  for (let code = 0x20; code <= 0x7e; code++) latin.push(String.fromCharCode(code));
  for (let code = 0xa0; code <= 0xff; code++) latin.push(String.fromCharCode(code));
  const gb = gb2312Characters();
  const big5 = big5Characters();
  if (script === "simplified") tiers.push([...latin, ...gb.symbols, ...gb.level1], gb.level2, japaneseCommon, big5.level1);
  else if (script === "traditional") tiers.push([...latin, ...gb.symbols, ...big5.level1], japaneseCommon, big5.level2, gb.level1);
  else tiers.push(japaneseCommon, level2JapaneseCharacters());
  const rankOf = new Map<string, number>();
  tiers.forEach((tier, index) => {
    for (const char of tier) if (!rankOf.has(char)) rankOf.set(char, index);
  });
  return (char) => rankOf.get(char) ?? tiers.length;
}

export async function typefaceFromFontFile(bytes: ArrayBuffer, fileName: string, runtime?: ManifoldToplevel): Promise<CustomTypeface> {
  if (bytes.byteLength > MAX_CUSTOM_FONT_BYTES) throw new CustomFontError("font-too-large");
  const signature = new TextDecoder("latin1").decode(new Uint8Array(bytes, 0, Math.min(4, bytes.byteLength)));
  if (signature === "wOF2") throw new CustomFontError("font-woff2");
  if (signature === "ttcf") throw new CustomFontError("font-collection");
  const { parse } = await import("opentype.js");
  let font: ReturnType<typeof parse>;
  try {
    font = parse(bytes);
  } catch {
    throw new CustomFontError("font-unreadable");
  }
  const englishOrFirst = (record: Record<string, string> | undefined) => record?.en ?? (record ? Object.values(record)[0] : undefined);
  const name = customFontName(englishOrFirst(font.names.fullName) ?? englishOrFirst(font.names.fontFamily), fileName);
  const resolution = font.unitsPerEm || 1000;
  const byCharacter = new Map<number, ReturnType<typeof font.glyphs.get>>();
  for (let index = 0; index < font.glyphs.length; index += 1) {
    const glyph = font.glyphs.get(index);
    for (const code of glyph.unicodes ?? (glyph.unicode !== undefined ? [glyph.unicode] : [])) {
      if (!byCharacter.has(code)) byCharacter.set(code, glyph);
    }
  }
  addArabicForms(font, byCharacter);
  const rank = customFontRanks(new Set([...byCharacter.keys()].map((code) => String.fromCodePoint(code))));
  const codes = [...byCharacter.keys()].sort((a, b) => rank(String.fromCodePoint(a)) - rank(String.fromCodePoint(b)) || a - b).slice(0, MAX_CUSTOM_FONT_CHARACTERS);
  const glyphs: Record<string, TypefaceGlyph> = {};
  for (const code of codes) {
    const glyph = byCharacter.get(code);
    if (!glyph) continue;
    const contours = normalizeGlyphContours(contoursFromCommands(glyph.path.commands), runtime);
    const bounds = contoursBounds(contours);
    glyphs[String.fromCodePoint(code)] = {
      ha: Math.round(glyph.advanceWidth ?? resolution * 0.6),
      x_min: Math.round(glyph.xMin ?? bounds.min),
      x_max: Math.round(glyph.xMax ?? bounds.max),
      o: outlineString(contours),
    };
  }
  if (!Object.values(glyphs).some((glyph) => glyph.o.length > 0)) throw new CustomFontError("font-no-letters");
  const head = font.tables.head;
  const data = {
    glyphs,
    familyName: name,
    ascender: font.ascender,
    descender: font.descender,
    underlinePosition: font.tables.post?.underlinePosition ?? -100,
    underlineThickness: font.tables.post?.underlineThickness ?? 50,
    boundingBox: head ? { xMin: head.xMin, yMin: head.yMin, xMax: head.xMax, yMax: head.yMax } : { xMin: 0, yMin: font.descender, xMax: resolution, yMax: font.ascender },
    resolution,
    original_font_information: { format: 0, fullName: name },
  } as unknown as FontData;
  return { id: await customFontId(bytes), name, data };
}

/** The typeface with only the characters in `characters` - what a design keeps. */
export function typefaceSubset(data: FontData, characters: Iterable<string>): FontData {
  const all = data.glyphs as Record<string, TypefaceGlyph>;
  const glyphs: Record<string, TypefaceGlyph> = {};
  for (const character of characters) {
    if (all[character]) glyphs[character] = all[character];
  }
  return { ...data, glyphs } as FontData;
}

/**
 * The characters a text uses, each once, with the space a line needs - and, for Arabic, the
 * presentation forms the typeface draws it by (#294), judged by the glyphs it has.
 */
export function textCharacters(text: string, glyphs?: Record<string, unknown>) {
  const shaped = shapeText(text, glyphs ? (char) => Boolean(glyphs[char]) : undefined);
  return new Set([...text, ...shaped, " "]);
}

/**
 * A typeface a design brought along, checked before it is used: finite measures, outlines made of
 * the four commands and numbers only, single characters as keys, within the size limits.
 */
export function checkedTypefaceData(raw: unknown, label: string): FontData {
  const data = raw as Record<string, unknown> | null;
  if (!data || typeof data !== "object") throw new Error(`${label} is not a font`);
  const finite = (value: unknown, name: string) => {
    if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${label}.${name} is not a number`);
    return value;
  };
  finite(data.resolution, "resolution");
  if ((data.resolution as number) <= 0) throw new Error(`${label}.resolution must be positive`);
  const box = data.boundingBox as Record<string, unknown> | undefined;
  if (!box || typeof box !== "object") throw new Error(`${label}.boundingBox is missing`);
  ["xMin", "yMin", "xMax", "yMax"].forEach((key) => finite(box[key], `boundingBox.${key}`));
  finite(data.underlineThickness ?? 0, "underlineThickness");
  const glyphs = data.glyphs as Record<string, unknown> | undefined;
  if (!glyphs || typeof glyphs !== "object") throw new Error(`${label}.glyphs is missing`);
  const entries = Object.entries(glyphs);
  if (entries.length > MAX_CUSTOM_FONT_CHARACTERS) throw new Error(`${label} has too many characters`);
  for (const [character, rawGlyph] of entries) {
    if ([...character].length !== 1) throw new Error(`${label} has a glyph key that is not one character`);
    const glyph = rawGlyph as Record<string, unknown> | null;
    if (!glyph || typeof glyph !== "object") throw new Error(`${label} has an invalid glyph`);
    finite(glyph.ha, "ha");
    if (glyph.x_min !== undefined) finite(glyph.x_min, "x_min");
    if (glyph.x_max !== undefined) finite(glyph.x_max, "x_max");
    if (glyph.o !== undefined) {
      if (typeof glyph.o !== "string" || glyph.o.length > MAX_GLYPH_OUTLINE_LENGTH) throw new Error(`${label} has an invalid outline`);
      if (!/^[mlqb0-9eE.\- ]*$/.test(glyph.o)) throw new Error(`${label} has an outline with unknown commands`);
    }
  }
  return data as unknown as FontData;
}
