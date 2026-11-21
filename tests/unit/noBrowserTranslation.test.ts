import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LANGUAGE_BOOT_SCRIPT } from "@/lib/i18n";

/** Runs the head script against a stored choice and the browser's languages, and returns the page language it sets. */
function bootLanguage(stored: string | null, languages: string[]) {
  const documentElement = { lang: "en" };
  new Function("localStorage", "navigator", "document", LANGUAGE_BOOT_SCRIPT)(
    { getItem: () => stored },
    { languages, language: languages[0] },
    { documentElement },
  );
  return documentElement.lang;
}

describe("the browser's translator and the page language", () => {
  const layout = readFileSync(path.resolve(__dirname, "../../apps/web/src/app/layout.tsx"), "utf8");

  it("lets the browser translate into a language layerling does not speak (#681)", () => {
    expect(layout).not.toMatch(/<html[^>]*translate="no"/);
    expect(layout).not.toMatch(/notranslate/);
    expect(layout).toMatch(/LANGUAGE_BOOT_SCRIPT/);
  });

  it("gives the page its real language before anything is drawn", () => {
    // Read as English, a German page was translated into German and "Hell" became "Hölle".
    expect(bootLanguage("de", ["de-DE"])).toBe("de");
    expect(bootLanguage(null, ["de-AT", "en"])).toBe("de");
    expect(bootLanguage(null, ["pt-BR"])).toBe("pt-BR");
    expect(bootLanguage("en", ["de-DE"])).toBe("en");
    expect(bootLanguage(null, ["es-MX", "es"])).toBe("es-ES");
    expect(bootLanguage(null, ["sv-SE", "sv"])).toBe("sv");
    expect(bootLanguage(null, ["nb-NO", "nb"])).toBe("en");
    expect(bootLanguage("xx", ["ko"])).toBe("en");
  });
});
