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

export function loadTextFonts(): Promise<void> {
  if (loadedFonts) return Promise.resolve();
  fontsPromise ??= Promise.all(
    Object.entries(fontLoaders).map(async ([name, load]) => [name, (await load()).default as FontData] as const),
  )
    .then((entries) => {
      const loader = new FontLoader();
      const parsed = new Map<FontData, Font>();
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
