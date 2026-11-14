import { FontLoader, type Font, type FontData } from "three/examples/jsm/loaders/FontLoader.js";
import { isCustomFontId, type CustomTypeface } from "@/lib/customFonts";
import { chineseFilesFor, type ChineseFile } from "@/lib/chineseText";
import { textNeedsJapanese, textNeedsJapaneseLevel2 } from "@/lib/japaneseText";

/**
 * The typefaces the text shape offers, loaded on demand.
 *
 * Together the six typeface files are about 1.6 MB of JSON (0.5 MB gzipped).
 * Imported statically they sat in the first page load of every visitor - the
 * dashboard included - and were parsed twice, once by the viewport and once by
 * the boolean path. Now each file is its own chunk, fetched once the editor
 * starts, and parsed a single time for both.
 *
 * Text geometry is built synchronously all over the editor, so the editor waits
 * for `loadTextFonts()` before it renders; after that `textFont()` is plain
 * lookup.
 */

const fontLoaders = {
  Multilanguage: () => import("three/examples/fonts/helvetiker_bold.typeface.json"),
  Sans: () => import("three/examples/fonts/droid/droid_sans_bold.typeface.json"),
  Serif: () => import("three/examples/fonts/droid/droid_serif_bold.typeface.json"),
  Script: () => import("three/examples/fonts/gentilis_bold.typeface.json"),
  Monospace: () => import("three/examples/fonts/droid/droid_sans_mono_regular.typeface.json"),
  Rounded: () => import("three/examples/fonts/optimer_bold.typeface.json"),
  // Stencil is drawn from the Multilanguage face with straight segments.
  Stencil: () => import("three/examples/fonts/helvetiker_bold.typeface.json"),
} satisfies Record<string, () => Promise<{ default: unknown }>>;

let loadedFonts: Record<string, Font> | null = null;
let fontsPromise: Promise<void> | null = null;

export function textFontsLoaded() {
  return loadedFonts !== null;
}

type GlyphData = { x_min?: number; x_max?: number; ha: number; o?: string };

/**
 * The typeface with every character it lacks taken from `fallback`, scaled to
 * its units. The Multilanguage face (helvetiker) has no umlauts, no ß, no é and
 * no €, and three.js draws "?" for a missing character - "Grüße" came out as
 * "Gr??e". Sans has them all; a borrowed letter looks a little different, but
 * it is the letter. Characters the face has are never touched.
 */
export function withFallbackGlyphs(data: FontData, fallback: FontData): FontData {
  const own = data.glyphs as Record<string, GlyphData>;
  const borrowed = fallback.glyphs as Record<string, GlyphData>;
  const missing = Object.keys(borrowed).filter((char) => !own[char]);
  if (missing.length === 0) return data;
  const scale = (data.resolution ?? 1000) / (fallback.resolution ?? 1000);
  const scaled = (value: number | undefined) => (value === undefined ? undefined : value * scale);
  const glyphs: Record<string, GlyphData> = { ...own };
  for (const char of missing) {
    const glyph = borrowed[char];
    // Same units: the glyph itself is shared, nothing is copied (3,672 kanji and kana per face otherwise).
    if (scale === 1) {
      glyphs[char] = glyph;
      continue;
    }
    glyphs[char] = {
      x_min: scaled(glyph.x_min),
      x_max: scaled(glyph.x_max),
      ha: glyph.ha * scale,
      o: glyph.o
        ?.split(" ")
        .map((token) => (token === "" || Number.isNaN(Number(token)) ? token : String(Number(token) * scale)))
        .join(" "),
    };
  }
  return { ...data, glyphs } as FontData;
}

/**
 * Faces that miss common letters borrow them from Sans. Script lacks the whole Cyrillic and Greek
 * alphabets and 37 letters of Latin Extended-A, among them the Polish ą and ę, which came out as "?".
 */
const BORROWS_FROM_SANS = new Set(["Multilanguage", "Stencil", "Rounded", "Script"]);

/**
 * Mistakes in the outlines of the built-in typefaces, mended where the typeface is loaded. The "f" of
 * Rounded (optimer) leaves the end of its crossbar for a point 4 units above it and comes back
 * (`l 425 669`), so its outline touches itself and, 40 mm wide, a triangle of 0.1 mm hangs there in a
 * DXF or SVG export. The curve now ends at the crossbar's own edge.
 */
const GLYPH_REPAIRS: Record<string, Record<string, { from: string; to: string }>> = {
  Rounded: { f: { from: "q 428 665 372 659 l 425 669 l 425 641", to: "q 425 665 372 659 l 425 641" } },
};

export function withGlyphRepairs(name: string, data: FontData): FontData {
  const repairs = GLYPH_REPAIRS[name];
  if (!repairs) return data;
  const glyphs = { ...(data.glyphs as Record<string, GlyphData>) };
  for (const [char, { from, to }] of Object.entries(repairs)) {
    const glyph = glyphs[char];
    // A glyph that is not what it was when the repair was written is left alone.
    if (glyph?.o?.includes(from)) glyphs[char] = { ...glyph, o: glyph.o.replace(from, to) };
  }
  return { ...data, glyphs } as FontData;
}

export function loadTextFonts(): Promise<void> {
  if (loadedFonts) return Promise.resolve();
  fontsPromise ??= Promise.all(
    Object.entries(fontLoaders).map(async ([name, load]) => [name, (await load()).default as FontData] as const),
  )
    .then((entries) => {
      const loader = new FontLoader();
      const parsed = new Map<FontData, Font>();
      entries = entries.map(([name, data]) => [name, withGlyphRepairs(name, data)] as const);
      const sans = entries.find(([name]) => name === "Sans")?.[1];
      sansData = sans ?? null;
      // Filled once per typeface file, so Multilanguage and Stencil keep sharing one.
      const filled = new Map<FontData, FontData>();
      entries = entries.map(([name, data]) => {
        if (!sans || !BORROWS_FROM_SANS.has(name)) return [name, data] as const;
        let complete = filled.get(data);
        if (!complete) {
          complete = withFallbackGlyphs(data, sans);
          filled.set(data, complete);
        }
        return [name, complete] as const;
      });
      loadedFonts = Object.fromEntries(entries.map(([name, data]) => {
        let font = parsed.get(data);
        if (!font) {
          font = loader.parse(data);
          parsed.set(data, font);
        }
        return [name, font];
      }));
    })
    .catch((error) => {
      // A failed fetch must not poison every later attempt.
      fontsPromise = null;
      throw error;
    });
  return fontsPromise;
}

/** The typeface for a text shape; unknown names fall back to Multilanguage. */
export function textFont(name: string | undefined): Font {
  if (!loadedFonts) {
    throw new Error("Text fonts are not loaded yet - await loadTextFonts() first");
  }
  if (isCustomFontId(name)) {
    const entry = customFonts.get(name);
    if (entry) {
      // Letters the font lacks - or a design did not bring along - come from Sans, as for the built-in faces.
      if (!entry.font) {
        let data = sansData ? withFallbackGlyphs(entry.data, sansData) : entry.data;
        if (japaneseData) data = withFallbackGlyphs(data, japaneseData);
        entry.font = new FontLoader().parse(data);
      }
      return entry.font;
    }
  }
  if (name === JAPANESE_FONT) {
    if (japaneseFont) return japaneseFont;
    // Chosen before it arrived: Multilanguage meanwhile, and the text is drawn again when it is here.
    void loadJapaneseTypeface();
  }
  return loadedFonts[name ?? "Multilanguage"] ?? loadedFonts.Multilanguage;
}

/*
 * Japanese. The built-in faces have no kana and no kanji; Zen Maru Gothic, cut down to what
 * Japanese text needs (scripts/build-japanese-typeface.mjs), is a face of its own and lends those
 * characters to every other face. It comes in two files under /fonts/japanese/<version>/, plain
 * files and not chunks, which the service worker keeps out of the install download and stores
 * on first use: `base` (about 2.6 MB gzipped: Latin, kana, symbols and the 2,965 level-1 kanji) and
 * `level2` (the rare kanji of names and places: 澤, 槇, 檜). Each is fetched the first time a text
 * needs it - `ensureJapaneseGlyphs` - or, for base, the face is chosen, never before: most
 * visitors never write Japanese. Until it is here such a text shows "?" for them; when it
 * arrives, every text is drawn again (`onCustomFontsChanged`, `customFontRevision`).
 */
export const JAPANESE_FONT = "Japanese";

/*
 * Chinese (Issue #1757): the Japanese face lacks most simplified hanzi (说, 书) and many traditional
 * ones. Four more files beside it (zh1, zh2, zht1, zht2; chineseText.ts says which characters each
 * holds) are fetched the first time a text needs one of their characters, and lend them like the
 * level-2 kanji: to the Japanese face, to every face and to fonts of one's own.
 */
type JapaneseFile = "base" | "level2" | ChineseFile;

async function fetchJapaneseFile(file: JapaneseFile): Promise<FontData> {
  const response = await fetch(`/fonts/japanese/${process.env.NEXT_PUBLIC_JAPANESE_FONT_VERSION ?? ""}/${file}.typeface.json`);
  if (!response.ok) throw new Error(`Japanese typeface ${file}: HTTP ${response.status}`);
  return (await response.json()) as FontData;
}

let japaneseFetcher: (file: JapaneseFile) => Promise<FontData> = fetchJapaneseFile;
let japaneseData: FontData | null = null;
let japaneseFont: Font | null = null;
let japanesePromise: Promise<void> | null = null;
let japaneseLevel2Promise: Promise<void> | null = null;
let japaneseLevel2Done = false;
const chinesePromises = new Map<ChineseFile, Promise<void>>();
const chineseDone = new Set<ChineseFile>();
let japaneseRevision = 0;

export function japaneseTypefaceLoaded() {
  return japaneseFont !== null;
}

export function japaneseLevel2Loaded() {
  return japaneseLevel2Done;
}

/** Adds the characters a font lacks, in place: the parsed Font reads its glyphs at drawing time, so nothing is parsed again. */
function lend(font: { data: unknown }, borrowed: Record<string, GlyphData>) {
  const glyphs = (font.data as FontData).glyphs as Record<string, GlyphData>;
  for (const char of Object.keys(borrowed)) if (!glyphs[char]) glyphs[char] = borrowed[char];
}

/** Fetches the Japanese face once and lends its characters to every face the editor has. */
export function loadJapaneseTypeface(): Promise<void> {
  if (japaneseFont) return Promise.resolve();
  japanesePromise ??= japaneseFetcher("base")
    .then((data) => {
      japaneseData = data;
      // Its own Latin is complete; the Greek and Cyrillic it lacks come from Sans like everywhere.
      japaneseFont = new FontLoader().parse(sansData ? withFallbackGlyphs(data, sansData) : data);
      const borrowed = data.glyphs as Record<string, GlyphData>;
      for (const font of new Set(Object.values(loadedFonts ?? {}))) lend(font, borrowed);
      for (const entry of customFonts.values()) if (entry.font) lend(entry.font, borrowed);
      japaneseRevision += 1;
      customFontListeners.forEach((listener) => listener());
    })
    .catch((error) => {
      japanesePromise = null;
      throw error;
    });
  return japanesePromise;
}

/**
 * Fetches the level-2 kanji once, after the base face, and adds them to it, to every face the
 * editor has and to `japaneseData`, so a font of one's own parsed later has them too.
 */
/** Adds a later file's characters to the Japanese face, its data, every face and every font of one's own. */
function lendEverywhere(data: FontData) {
  const borrowed = data.glyphs as Record<string, GlyphData>;
  if (japaneseData) lend({ data: japaneseData }, borrowed);
  if (japaneseFont) lend(japaneseFont, borrowed);
  for (const font of new Set(Object.values(loadedFonts ?? {}))) lend(font, borrowed);
  for (const entry of customFonts.values()) if (entry.font) lend(entry.font, borrowed);
  japaneseRevision += 1;
  customFontListeners.forEach((listener) => listener());
}

export function loadJapaneseLevel2(): Promise<void> {
  if (japaneseLevel2Done) return Promise.resolve();
  japaneseLevel2Promise ??= loadJapaneseTypeface()
    .then(() => japaneseFetcher("level2"))
    .then((data) => {
      japaneseLevel2Done = true;
      lendEverywhere(data);
    })
    .catch((error) => {
      japaneseLevel2Promise = null;
      throw error;
    });
  return japaneseLevel2Promise;
}

/**
 * Called with every text that is drawn: one with kana or kanji starts the fetch of the Japanese
 * face if it has not happened yet, and one with a level-2 kanji the fetch of the second file.
 * Returns at once; the text is drawn again when the face is here.
 */
export function ensureJapaneseGlyphs(text: string) {
  if (!textNeedsJapanese(text)) return;
  const ignore = () => {
    // Without it the text keeps its question marks, as before - the next text tries again.
  };
  if (!japaneseFont && !japanesePromise) loadJapaneseTypeface().catch(ignore);
  if (!japaneseLevel2Done && !japaneseLevel2Promise && textNeedsJapaneseLevel2(text)) loadJapaneseLevel2().catch(ignore);
  for (const file of chineseFilesFor(text)) if (!chineseDone.has(file) && !chinesePromises.has(file)) loadChineseFile(file).catch(ignore);
}

export function chineseFileLoaded(file: ChineseFile) {
  return chineseDone.has(file);
}

/** Fetches one Chinese file once, after the Japanese face, and lends its characters everywhere. */
export function loadChineseFile(file: ChineseFile): Promise<void> {
  if (chineseDone.has(file)) return Promise.resolve();
  let promise = chinesePromises.get(file);
  if (!promise) {
    promise = loadJapaneseTypeface()
      .then(() => japaneseFetcher(file))
      .then((data) => {
        chineseDone.add(file);
        lendEverywhere(data);
      })
      .catch((error) => {
        chinesePromises.delete(file);
        throw error;
      });
    chinesePromises.set(file, promise);
  }
  return promise;
}

/** Waits for every file a text needs - the Japanese face, its level-2 kanji, the Chinese files - for code that draws once and cannot draw again. */
export async function loadGlyphsForText(text: string): Promise<void> {
  if (!textNeedsJapanese(text)) return;
  const ignore = () => undefined;
  await loadJapaneseTypeface().catch(ignore);
  const waits: Promise<void>[] = [];
  if (textNeedsJapaneseLevel2(text)) waits.push(loadJapaneseLevel2().catch(ignore));
  for (const file of chineseFilesFor(text)) waits.push(loadChineseFile(file).catch(ignore));
  await Promise.all(waits);
}

/*
 * Fonts of one's own (customFonts.ts), by their id ("custom:<hash of the file>"). A font read
 * from a file or from the computer is complete; one a design brought along holds only the
 * letters its texts use. A complete one always wins; the letters of several designs add up.
 */
type CustomFontEntry = { id: string; name: string; data: FontData; complete: boolean; font: Font | null; revision: number };

let sansData: FontData | null = null;
const customFonts = new Map<string, CustomFontEntry>();
const customFontListeners = new Set<() => void>();

export function registerCustomFont(typeface: CustomTypeface, complete: boolean) {
  const existing = customFonts.get(typeface.id);
  if (existing?.complete && !complete) return;
  let data = typeface.data;
  if (existing && !existing.complete && !complete) {
    data = { ...existing.data, glyphs: { ...(existing.data.glyphs as object), ...(typeface.data.glyphs as object) } } as FontData;
  }
  customFonts.set(typeface.id, { id: typeface.id, name: existing?.complete ? existing.name : typeface.name, data, complete, font: null, revision: (existing?.revision ?? 0) + 1 });
  customFontListeners.forEach((listener) => listener());
}

/** Every font of one's own the editor knows now, by name. */
export function customFontList() {
  return [...customFonts.values()]
    .map(({ id, name, complete }) => ({ id, name, complete }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function customFontEntry(id: string) {
  const entry = customFonts.get(id);
  return entry ? { id: entry.id, name: entry.name, data: entry.data, complete: entry.complete } : null;
}

/** Changes whenever a font's letters change - a font of one's own, or the Japanese face arriving for all - so cached text shapes are drawn again. */
export function customFontRevision(id: string | undefined) {
  return (id ? customFonts.get(id)?.revision ?? 0 : 0) + japaneseRevision * 1000;
}

/** The display name of a text's font: a built-in name, a font of one's own, or null when it is missing. */
export function textFontLabel(id: string | undefined) {
  if (!isCustomFontId(id)) return id ?? "Multilanguage";
  return customFonts.get(id)?.name ?? null;
}

/** Forgets every font of one's own - for tests, which share this module's state. */
export function resetCustomFontsForTests() {
  customFonts.clear();
}

/** Forgets the Japanese face - for tests. */
export function resetJapaneseTypefaceForTests() {
  japaneseData = null;
  japaneseFont = null;
  japanesePromise = null;
  japaneseLevel2Promise = null;
  japaneseLevel2Done = false;
  chinesePromises.clear();
  chineseDone.clear();
  japaneseRevision = 0;
  japaneseFetcher = fetchJapaneseFile;
}

/** Replaces the fetch of the Japanese files - for tests, which read them from disk. */
export function setJapaneseTypefaceFetcherForTests(fetcher: (file: JapaneseFile) => Promise<FontData>) {
  japaneseFetcher = fetcher;
}

export function onCustomFontsChanged(listener: () => void) {
  customFontListeners.add(listener);
  return () => {
    customFontListeners.delete(listener);
  };
}
