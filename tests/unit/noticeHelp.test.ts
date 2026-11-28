import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GUIDE_CHAPTERS, GUIDE_SECTIONS } from "@/lib/guideLinks";
import { translate } from "@/lib/i18n";
import { NOTICE_HELP_KEYS, noticeHelpSection } from "@/lib/noticeHelp";
// @ts-expect-error -- plain script without types
import { slugify } from "../../scripts/build-guide.mjs";

const root = join(__dirname, "..", "..");
const headingIds = (file: string) =>
  readFileSync(file, "utf8").split(/\r?\n/).filter((line) => /^#{1,3} /.test(line)).map((line) => slugify(line.replace(/^#+ /, "").trim()));

describe("messages that lead to the FAQ", () => {
  it("finds the answer for a message as the program shows it, with its numbers filled in", () => {
    expect(noticeHelpSection(translate("en", "error.storageFull"), "en")).toBe("faqStorageFull");
    expect(noticeHelpSection(translate("de", "error.storageFull"), "de")).toBe("faqStorageFull");
    expect(noticeHelpSection(translate("en", "status.edgeWouldOpen", { count: 12 }), "en")).toBe("faqFilletFails");
    expect(noticeHelpSection(translate("de", "status.cutOpenPart", { name: "Deckel", count: 3 }), "de")).toBe("faqCutFails");
    // Wrapped into another sentence, as the save failure is.
    expect(noticeHelpSection(`Saving failed: ${translate("en", "error.outOfMemory")}`, "en")).toBe("faqOutOfMemory");
  });

  it("leaves an ordinary message alone", () => {
    expect(noticeHelpSection("Box added", "en")).toBeNull();
    expect(noticeHelpSection("", "en")).toBeNull();
    expect(noticeHelpSection(null, "en")).toBeNull();
    expect(noticeHelpSection(translate("en", "status.computing"), "en")).toBeNull();
  });

  it("has a sentence long enough to tell for every key, in English and German", () => {
    for (const { key, section } of NOTICE_HELP_KEYS) {
      for (const language of ["en", "de"] as const) {
        const filled = translate(language, key).replace(/\{\w+\}/g, "7");
        expect(noticeHelpSection(filled, language), `${language} ${key}`).toBe(section);
      }
    }
  });

  it("points every answer at a question that exists in the FAQ", () => {
    for (const { section } of NOTICE_HELP_KEYS) {
      const target = GUIDE_SECTIONS[section];
      expect(target.chapter).toBe("faq");
      for (const language of ["en", "de"] as const) {
        const directory = join(root, "docs", "guide", language);
        const file = readdirSync(directory).find((entry) => entry.endsWith(`-${GUIDE_CHAPTERS.faq[language]}.md`))!;
        expect(headingIds(join(directory, file)), `${language} ${section}`).toContain(target[language]);
      }
    }
  });
});

describe("the FAQ chapter", () => {
  it("links only to chapters and headings that exist, in English and German", () => {
    for (const language of ["en", "de"] as const) {
      const directory = join(root, "docs", "guide", language);
      const files = readdirSync(directory).filter((entry) => entry.endsWith(".md"));
      const faq = files.find((entry) => entry.endsWith(`-${GUIDE_CHAPTERS.faq[language]}.md`))!;
      const body = readFileSync(join(directory, faq), "utf8");
      const links = [...body.matchAll(/\(chapter:([\w-]+)#([\w-]+)\)/g)];
      expect(links.length).toBeGreaterThan(30);
      for (const [, chapter, anchor] of links) {
        const file = files.find((entry) => entry.replace(/^\d+-|\.md$/g, "") === chapter);
        expect(file && existsSync(join(directory, file)), `${language}: chapter ${chapter}`).toBeTruthy();
        expect(headingIds(join(directory, file!)), `${language}: ${chapter}#${anchor}`).toContain(anchor);
      }
    }
  });

  it("asks the same questions in both languages and answers each with a way into the guide", () => {
    const questions = (language: "en" | "de") => {
      const directory = join(root, "docs", "guide", language);
      const faq = readdirSync(directory).find((entry) => entry.endsWith(`-${GUIDE_CHAPTERS.faq[language]}.md`))!;
      return readFileSync(join(directory, faq), "utf8").split(/\r?\n(?=### )/).slice(1);
    };
    const english = questions("en");
    const german = questions("de");
    expect(german.length).toBe(english.length);
    for (const answer of [...english, ...german]) expect(answer, answer.split(/\r?\n/)[0]).toMatch(/\(chapter:[\w-]+#[\w-]+\)/);
  });
});
