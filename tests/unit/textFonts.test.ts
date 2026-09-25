import { describe, expect, it } from "vitest";
import { loadTextFonts, textFont, textFontsLoaded } from "@/lib/textFonts";

describe("textFonts", () => {
  it("refuses a lookup before the typefaces are loaded", () => {
    expect(textFontsLoaded()).toBe(false);
    expect(() => textFont("Sans")).toThrow(/loadTextFonts/);
  });

  it("loads every typeface once and falls back to Multilanguage", async () => {
    await Promise.all([loadTextFonts(), loadTextFonts()]);

    expect(textFontsLoaded()).toBe(true);
    const multilanguage = textFont("Multilanguage");
    expect(textFont(undefined)).toBe(multilanguage);
    expect(textFont("does-not-exist")).toBe(multilanguage);
    // Stencil is the Multilanguage face, parsed a single time.
    expect(textFont("Stencil")).toBe(multilanguage);
    for (const name of ["Sans", "Serif", "Script", "Monospace", "Rounded"]) {
      expect(textFont(name)).not.toBe(multilanguage);
      expect(textFont(name).generateShapes("A", 10).length).toBeGreaterThan(0);
    }
  });
});
