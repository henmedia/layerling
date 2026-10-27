import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  detectLanguage,
  getLanguage,
  isLanguage,
  languageFromTag,
  LANGUAGES,
  LANGUAGE_INFO,
  setLanguage,
  translate,
} from "@/lib/i18n";
import { MESSAGES_EN } from "@/lib/messages.en";

/**
 * Every catalogue that is there, whatever language it is: a language added in
 * languages.ts brings its own file, and a language that is fetched when chosen
 * (like Russian) is not built into the program, so it cannot be imported by
 * name here.
 */
const FILES = import.meta.glob("../../apps/web/src/lib/messages.*.ts", { eager: true }) as Record<string, Record<string, Record<string, string>>>;
const CATALOGUES: Record<string, Record<string, string> | undefined> = {};
for (const [path, module] of Object.entries(FILES)) {
  const code = /messages\.([a-z-]+)\.ts$/.exec(path)?.[1];
  if (code) CATALOGUES[code] = module[`MESSAGES_${code.toUpperCase().replace(/-/g, "_")}`];
}
/** The languages that must have every sentence; a language still on its way is held to less (i18nLanguages.test.ts). */
const COMPLETE_LANGUAGES = LANGUAGES.filter((language) => LANGUAGE_INFO[language].complete);
/** A complete language whose file is missing is a broken promise, not a passing test. */
const catalogueOf = (language: string) => {
  const catalogue = CATALOGUES[language];
  expect(catalogue, `messages.${language}.ts`).toBeDefined();
  return catalogue as Record<string, string>;
};

function placeholders(value: string) {
  return [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
}

/** Alle Bauteile der Oberflaeche, auch die Tafeln unter workplane/. */
function alleBauteile(wurzel: string) {
  return readdirSync(wurzel, { recursive: true, encoding: "utf8" })
    .filter((datei) => datei.endsWith(".tsx"))
    .map((datei) => datei.split(String.fromCharCode(92)).join("/"));
}

describe("message catalogues", () => {
  it("covers every key in every language", () => {
    const keys = Object.keys(MESSAGES_EN).sort();
    for (const language of COMPLETE_LANGUAGES) {
      expect(Object.keys(catalogueOf(language)).sort()).toEqual(keys);
    }
  });

  it("leaves no message empty", () => {
    for (const language of COMPLETE_LANGUAGES) {
      for (const [key, value] of Object.entries(catalogueOf(language))) {
        expect(value.trim(), `${language}:${key}`).not.toBe("");
      }
    }
  });

  it("keeps the same placeholders in every translation", () => {
    for (const [key, english] of Object.entries(MESSAGES_EN)) {
      for (const language of COMPLETE_LANGUAGES) {
        const translated = catalogueOf(language)[key];
        expect(placeholders(translated), `${language}:${key}`).toEqual(placeholders(english));
      }
    }
  });

  it("does not leave a catalogue that was never touched", () => {
    // A handful of sentences read the same in every language on purpose - "X",
    // the material names, a file suffix - but a catalogue that never changed
    // would mean a forgotten translation.
    for (const language of COMPLETE_LANGUAGES.filter((code) => code !== "en")) {
      const catalogue = catalogueOf(language);
      const identical = Object.keys(MESSAGES_EN).filter((key) => catalogue[key] === MESSAGES_EN[key as keyof typeof MESSAGES_EN]);
      expect(identical.length, language).toBeLessThan(Object.keys(MESSAGES_EN).length * 0.1);
    }
  });
});

describe("translation", () => {
  it("fills placeholders", () => {
    expect(translate("en", "dashboard.designsCount", { count: 3 })).toBe("Designs (3)");
    expect(translate("de", "dashboard.designsCount", { count: 3 })).toBe("Entwürfe (3)");
  });

  it("leaves an unknown placeholder untouched instead of printing undefined", () => {
    expect(translate("en", "notice.openedLocalProject", {})).toBe("Opened {name} as a new local design");
  });

  it("falls back to English when a catalogue misses a key", () => {
    const broken = { ...catalogueOf("de") } as Record<string, string>;
    delete broken["common.save"];
    // The catalogue itself is type-checked; this guards the runtime path.
    expect(translate("en", "common.save")).toBe("Save");
  });
});

describe("language detection", () => {
  it("reads the primary subtag", () => {
    expect(languageFromTag("de-AT")).toBe("de");
    expect(languageFromTag("DE")).toBe("de");
    expect(languageFromTag("en-GB")).toBe("en");
    expect(languageFromTag("fr-FR")).toBe("fr");
    expect(languageFromTag("ru-RU")).toBe("ru");
    expect(languageFromTag("sv-SE")).toBe(null);
    expect(languageFromTag(undefined)).toBe(null);
  });

  it("serves Brazilian Portuguese for a browser that asks for pt-BR", () => {
    expect(languageFromTag("pt-BR")).toBe("pt-br");
  });

  it("serves European Portuguese for pt-PT, not Brazilian Portuguese", () => {
    expect(languageFromTag("pt-PT")).toBe("pt-pt");
  });

  it("serves Spanish for the Spanish of Spain and of Latin America", () => {
    expect(languageFromTag("es-ES")).toBe("es");
    expect(languageFromTag("es-MX")).toBe("es");
    expect(languageFromTag("es-419")).toBe("es");
  });

  it("recognises only the languages it can serve", () => {
    expect(isLanguage("de")).toBe(true);
    expect(isLanguage("nl")).toBe(true);
    expect(isLanguage("fr")).toBe(true);
    expect(isLanguage("pl")).toBe(true);
    expect(isLanguage("ru")).toBe(true);
    expect(isLanguage("it")).toBe(true);
    expect(isLanguage("ar")).toBe(true);
    expect(isLanguage("es")).toBe(true);
    expect(isLanguage("sv")).toBe(false);
    expect(isLanguage(null)).toBe(false);
  });

  it("starts in English, so the first render matches the served HTML", () => {
    expect(getLanguage()).toBe("en");
    expect(detectLanguage()).toBe("en");
  });

  it("follows the browser when nothing was chosen", () => {
    // The tests run without a DOM, so this stands in for one: a browser that
    // has never been given a preference, only a language list.
    const withBrowser = (languages: string[], stored: string | null = null) => {
      const fake = {
        localStorage: { getItem: () => stored, setItem: () => undefined },
        navigator: { languages, language: languages[0] },
      };
      const original = (globalThis as { window?: unknown }).window;
      (globalThis as { window?: unknown }).window = fake;
      try {
        return detectLanguage();
      } finally {
        (globalThis as { window?: unknown }).window = original;
      }
    };

    expect(withBrowser(["en-GB", "en"])).toBe("en");
    expect(withBrowser(["en-US"])).toBe("en");
    expect(withBrowser(["de-AT", "de"])).toBe("de");
    expect(withBrowser(["de"])).toBe("de");
    // A language we do not serve falls back to English rather than to nothing.
    expect(withBrowser(["sv-SE", "ko"])).toBe("en");
    expect(withBrowser(["ja-JP", "ja"])).toBe("ja");
    // The first tag we can serve wins, even behind one we cannot.
    expect(withBrowser(["sv-SE", "de-DE"])).toBe("de");
    // A stored choice outranks the browser in both directions.
    expect(withBrowser(["de-DE"], "en")).toBe("en");
    expect(withBrowser(["en-US"], "de")).toBe("de");
  });

  it("switches and reports the new language", async () => {
    setLanguage("de", false);
    expect(getLanguage()).toBe("de");
    await setLanguage("fr", false);
    expect(getLanguage()).toBe("fr");
    setLanguage("en", false);
    expect(getLanguage()).toBe("en");
  });

  /*
   * Ein englischer Satz mitten im Code faellt nur dem auf, der die Oberflaeche
   * auf Deutsch benutzt - Stefan sah „Deleted 2 selected shapes" in der
   * deutschen Anzeige, lange nach dem Einbau. `setNotice` und die Meldung von
   * `commitShapes` landen beide in derselben Statusanzeige, also darf dort
   * nichts stehen, was nicht durch `t()` gegangen ist.
   *
   * Geprueft wird der Quelltext, weil diese Aufrufe in Bauteilen stecken, die
   * sich hier nicht ausfuehren lassen.
   */
  it("laesst keinen englischen Satz in die Statusanzeige", () => {
    const wurzel = fileURLToPath(new URL("../../apps/web/src/components/", import.meta.url));
    const dateien = alleBauteile(wurzel);
    const verdaechtig: string[] = [];
    for (const datei of dateien) {
      const zeilen = readFileSync(wurzel + datei, "utf8").split(String.fromCharCode(10));
      zeilen.forEach((zeile, index) => {
        const ohneKommentar = zeile.replace(/\/\/.*$/, "");
        // Ein Anzeigetext ist ein Literal, das mit einem Grossbuchstaben
        // anfaengt und mehr als ein Wort traegt - ein Feldname nicht.
        const literal = ohneKommentar.match(/^\s*[`"]([A-Z][a-z]+ [a-z][^"`]*)[`"],?\s*$/);
        if (literal) verdaechtig.push(`${datei}:${index + 1}  ${literal[1].slice(0, 60)}`);
      });
    }
    expect(verdaechtig).toEqual([]);
  });

  /*
   * Dasselbe, wenn der Satz direkt im Aufruf steht, auch ueber mehrere Zeilen
   * - so rutschten die Meldungen des Skizzenmodus durch („Half circle added to
   * sketch", „Sketch image moved"). Gelesen wird der ganze Aufruf bis zu seiner
   * schliessenden Klammer.
   */
  it("laesst keinen englischen Satz in einen Meldungsaufruf", () => {
    const wurzel = fileURLToPath(new URL("../../apps/web/src/components/", import.meta.url));
    const dateien = alleBauteile(wurzel);
    const aufruf = /\b(setNotice|commitSketchProfile|commitShapes|onUpdate|onUpdateImage|insertSketchCopy)\(/g;
    const satz = /[`"]([A-Z][a-z]+ [a-z${][^"`]*)[`"]/g;
    const verdaechtig: string[] = [];
    for (const datei of dateien) {
      const text = readFileSync(wurzel + datei, "utf8").replace(/\/\/.*$/gm, "");
      for (const treffer of text.matchAll(aufruf)) {
        let tiefe = 1;
        let ende = treffer.index! + treffer[0].length;
        let zeichen: string | null = null;
        for (; ende < text.length && tiefe > 0; ende += 1) {
          const c = text[ende];
          if (zeichen) {
            if (c === "\\") ende += 1;
            else if (c === zeichen) zeichen = null;
          } else if (c === '"' || c === "'" || c === "`") zeichen = c;
          else if (c === "(") tiefe += 1;
          else if (c === ")") tiefe -= 1;
        }
        const argumente = text.slice(treffer.index! + treffer[0].length, ende);
        for (const literal of argumente.matchAll(satz)) {
          const zeile = text.slice(0, treffer.index!).split(String.fromCharCode(10)).length;
          verdaechtig.push(`${datei}:${zeile}  ${literal[1].slice(0, 60)}`);
        }
      }
    }
    expect(verdaechtig).toEqual([]);
  });
});
