import { FontLoader, type Font, type FontData } from "three/examples/jsm/loaders/FontLoader.js";

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
 * Faces that miss common letters borrow them from Sans.
 *
 * Script (gentilis) is the only one without Cyrillic: it has 704 glyphs and not
 * one of them is а-я, so Russian lettering came out as question marks.
 */
const BORROWS_FROM_SANS = new Set(["Multilanguage", "Stencil", "Rounded", "Script"]);

export function loadTextFonts(): Promise<void> {
  if (loadedFonts) return Promise.resolve();
  fontsPromise ??= Promise.all(
    Object.entries(fontLoaders).map(async ([name, load]) => [name, (await load()).default as FontData] as const),
  )
    .then((entries) => {
      const loader = new FontLoader();
      const parsed = new Map<FontData, Font>();
      const sans = entries.find(([name]) => name === "Sans")?.[1];
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
  return loadedFonts[name ?? "Multilanguage"] ?? loadedFonts.Multilanguage;
}
