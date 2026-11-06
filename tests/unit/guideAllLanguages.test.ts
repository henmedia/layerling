import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { GUIDE_SECTIONS, guideHref, type GuideSection } from "@/lib/guideLinks";
// @ts-expect-error the guide build is a plain .mjs module
import { effectiveChapters, englishHeadingPairs, headingIds, loadMessages, loadValues, readChapters, readToolIcons, renderBlocks } from "../../scripts/build-guide.mjs";
// @ts-expect-error the tool list is a plain .mjs module
import { tools } from "../../scripts/layerling-mcp-tools.mjs";

// These read every language's chapters; under a full parallel run that can take more than the 5 s default.
vi.setConfig({ testTimeout: 30_000 });

/*
 * guide.test.ts holds the five languages that translate every chapter to the same plan. These
 * checks hold for every language folder, whatever stage its translation is at: they are the
 * mistakes that slipped through there (a heading that never rendered as one, links into a
 * chapter that went nowhere, a tool missing from the AI chapter).
 */
const root = join(__dirname, "..", "..");
const guideRoot = join(root, "docs", "guide");
const LANGUAGES = readdirSync(guideRoot).filter((name) => name !== "images" && statSync(join(guideRoot, name)).isDirectory());

type Chapter = { file: string; number: string; slug: string; body: string };

const AI_CHAPTER_NUMBER = "14";

describe("the guide in every language", () => {
  it("covers the seventeen guide languages", () => {
    expect(LANGUAGES.sort()).toEqual(["ar", "cs", "da", "de", "en", "es", "fr", "hu", "it", "nl", "pl", "pt-br", "pt-pt", "ru", "sl", "zh-cn", "zh-tw"]);
  });

  it("writes headings with a plain space, so they render as headings", async () => {
    for (const language of LANGUAGES) {
      for (const chapter of (await readChapters(language)) as Chapter[]) {
        chapter.body.split(/\r?\n/).forEach((line, index) => {
          if (/^#{1,3}\S/.test(line) && !/^#{1,3}\s/.test(line)) throw new Error(`${language}/${chapter.file}:${index + 1}: "${line.slice(0, 40)}"`);
          expect(line.startsWith("#") && /^#{1,3} /.test(line), `${language}/${chapter.file}:${index + 1}`).toBe(false);
        });
      }
    }
  });

  it("links only to headings a chapter has", async () => {
    const english = (await readChapters("en")) as Chapter[];
    for (const language of LANGUAGES) {
      for (const chapter of (await readChapters(language)) as Chapter[]) {
        // As the build names them: a heading whose text gives no id takes the English one it stands
        // for (englishHeadingPairs, section by section), and every English id it stands for is an
        // anchor on the page as well.
        const own: string[] = headingIds(chapter.body);
        const source = english.find((entry) => entry.number === chapter.number);
        const pairs: string[][] | null = source && language !== "en" ? englishHeadingPairs(chapter.body, source.body) : null;
        const ids = new Set([...own.map((id, position) => id || pairs?.[position]?.[0] || `section-${position + 1}`), ...(pairs ?? []).flat()]);
        for (const match of chapter.body.matchAll(/\]\(#([^)]+)\)/g)) {
          expect(ids.has(match[1]), `${language}/${chapter.file}: #${match[1]}`).toBe(true);
        }
      }
    }
  });

  it("names every MCP tool in the AI chapter each language builds", async () => {
    const chaptersByLanguage = Object.fromEntries(await Promise.all(LANGUAGES.map(async (language) => [language, await readChapters(language)])));
    for (const language of LANGUAGES) {
      const builtAiChapter = (effectiveChapters(language, chaptersByLanguage) as Chapter[]).find((entry) => entry.number === AI_CHAPTER_NUMBER);
      expect(builtAiChapter, language).toBeDefined();
      for (const tool of tools as { name: string }[]) expect(builtAiChapter!.body, `${language}: ${tool.name}`).toContain(`\`${tool.name}\``);
    }
  });

  it("lands every question mark on a heading of the Brazilian Portuguese chapters translated so far", async () => {
    const translatedChapters = (await readChapters("pt-br")) as Chapter[];
    for (const sectionName of Object.keys(GUIDE_SECTIONS) as GuideSection[]) {
      const [page, anchor] = guideHref("pt-br", undefined, sectionName).split("#");
      const translatedChapter = translatedChapters.find((chapter) => page.endsWith(`/${chapter.slug}.html`));
      if (!translatedChapter) continue;
      expect(headingIds(translatedChapter.body), sectionName).toContain(anchor);
    }
  });

  it("uses only interface names that exist", async () => {
    const values = await loadValues();
    const toolIcons = await readToolIcons();
    for (const language of LANGUAGES) {
      const messages = await loadMessages(language);
      for (const chapter of (await readChapters(language)) as Chapter[]) {
        const context = { language, messages, values, toolIcons, imageSize: () => null, shortcutsHtml: "", references: { uiKeys: new Set(), shots: new Set(), chapters: new Set() } };
        const { html } = renderBlocks(chapter.body, context);
        expect(html, `${language}/${chapter.file}`).not.toMatch(/\{\{|\}\}/);
        expect(html, `${language}/${chapter.file}`).not.toContain("{count}");
      }
    }
  });
});
