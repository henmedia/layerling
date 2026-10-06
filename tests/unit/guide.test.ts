import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  chaptersFor,
  GUIDE_LANGUAGES,
  imageDirectories,
  loadMessages,
  loadValues,
  messagesFor,
  parseEnv,
  parseFrontMatter,
  renderFooter,
  readChapters,
  readShortcutGroups,
  renderBlocks,
  renderInline,
  slugify,
  webpSize,
} from "../../scripts/build-guide.mjs";
import { tools } from "../../scripts/layerling-mcp-tools.mjs";
import {
  chapterFile,
  GUIDE_CHAPTERS,
  GUIDE_DIRECTORIES,
  GUIDE_SECTIONS,
  guideChapterForShape,
  guideHref,
  guideSectionForShape,
  sectionId,
  type GuideChapter,
  type GuideSection,
} from "@/lib/guideLinks";

const root = join(__dirname, "..", "..");
const LANGUAGES = ["de", "en", "ru"] as const;
type TestLanguage = (typeof LANGUAGES)[number];

async function contextFor(language: TestLanguage) {
  return {
    language,
    // The rule the interface itself follows: a text a language has not
    // translated yet is shown in English.
    messages: await messagesFor(language),
    values: await loadValues(),
    imageSize: () => null,
    references: { uiKeys: new Set<string>(), shots: new Set<string>(), chapters: new Set<string>() },
  };
}

describe("guide markdown", () => {
  it("takes button names from the interface's own wording", async () => {
    const context = await contextFor("de");
    const html = renderInline("Klicke auf {{ui:editor.tool.group}}.", context);
    expect(html).toContain("„Gruppieren“");
    const english = renderInline("Click {{ui:editor.tool.group}}.", await contextFor("en"));
    expect(english).toContain("“Group”");
  });

  it("takes the program's numbers from roundness.ts, written as the language writes them", async () => {
    const { EXACT_ROUND_TOLERANCE, MIN_AUTOMATIC_SIDES } = await import("@/lib/roundness");
    expect(renderInline("{{value:EXACT_ROUND_TOLERANCE}} mm, {{value:MIN_AUTOMATIC_SIDES}}", await contextFor("de"))).toBe(`${String(EXACT_ROUND_TOLERANCE).replace(".", ",")} mm, ${MIN_AUTOMATIC_SIDES}`);
    expect(renderInline("{{value:EXACT_ROUND_TOLERANCE}} mm", await contextFor("en"))).toBe(`${EXACT_ROUND_TOLERANCE} mm`);
    expect(() => renderInline("{{value:NO_SUCH_NUMBER}}", { language: "en", messages: {}, values: {} })).toThrow(/Unknown value/);
    // The function in the same file is no number to quote.
    expect((await loadValues()).drawnRound).toBeUndefined();
  });

  it("stops on a name the interface does not have", async () => {
    expect(() => renderInline("{{ui:no.such.key}}", { language: "de", messages: {} })).toThrow(/Unknown interface text/);
  });

  it("understands keys, code, links and chapter links", async () => {
    const context = await contextFor("de");
    const html = renderInline("[[Strg]]+[[Z]] und `npm run dev` und [Kapitel](chapter:formen) und [x](https://example.com)", context);
    expect(html).toContain("<kbd>Strg</kbd>+<kbd>Z</kbd>");
    expect(html).toContain("<code>npm run dev</code>");
    expect(html).toContain('href="/anleitung/formen.html"');
    expect(html).toContain('rel="noopener"');
  });

  it("escapes what is not markup", async () => {
    const html = renderInline("a < b & c", await contextFor("en"));
    expect(html).toBe("a &lt; b &amp; c");
  });

  it("builds headings, lists, tables, tips and pictures", async () => {
    const context = await contextFor("en");
    const { html, headings } = renderBlocks(
      ["## First step", "", "- one", "- two", "  continued", "", "1. a", "2. b", "", "| A | B |", "| - | - |", "| 1 | 2 |", "", "> **Tip:** careful", "", "![Caption](shot:some-picture)"].join("\n"),
      context,
    );
    expect(headings).toEqual([{ id: "first-step", text: "First step" }]);
    expect(html).toContain('<h2 id="first-step">');
    expect(html).toContain("<ul><li>one</li><li>two continued</li></ul>");
    expect(html).toContain("<ol><li>a</li><li>b</li></ol>");
    expect(html).toContain("<th>A</th>");
    expect(html).toContain('<aside class="tip">');
    expect(html).toContain('src="/guide/img/some-picture.webp"');
    expect(context.references.shots.has("some-picture")).toBe(true);
  });

  it("reads front matter, with or without quotes", () => {
    expect(parseFrontMatter("---\ntitle: \"A: b\"\nsummary: Text\n---\nBody").meta).toEqual({ title: "A: b", summary: "Text" });
  });

  it("turns umlauts into plain ids", () => {
    expect(slugify("Körper & Aussparungen")).toBe("koerper-aussparungen");
  });

  it("reads the size of a WebP picture", () => {
    const directory = join(root, "docs", "guide", "images", "de");
    const file = readdirSync(directory).find((name) => name.endsWith(".webp"));
    if (!file) return;
    const size = webpSize(readFileSync(join(directory, file)));
    expect(size?.width).toBeGreaterThan(100);
    expect(size?.height).toBeGreaterThan(100);
  });
});

describe("guide footer", () => {
  it("reads the settings of an installation, ignoring comments", () => {
    expect(parseEnv(["# NEXT_PUBLIC_A=x", "NEXT_PUBLIC_IMPRINT_URL=/impressum.html", "", 'B="q"'].join("\n"))).toEqual({ NEXT_PUBLIC_IMPRINT_URL: "/impressum.html", B: "q" });
  });

  it("shows the legal links of the installation from any folder, and leaves out what is not set", async () => {
    const messages = await loadMessages("de");
    const full = renderFooter({ language: "de", messages, version: "9.9.9", environment: { NEXT_PUBLIC_IMPRINT_URL: "/impressum.html", NEXT_PUBLIC_PRIVACY_URL: "/datenschutz.html", NEXT_PUBLIC_SPONSOR_URL: "https://example.org/spende" } });
    expect(full).toContain('href="/impressum.html">Impressum');
    expect(full).toContain('href="/datenschutz.html">Datenschutz');
    expect(full).toContain("https://example.org/spende");
    expect(full).toContain("v9.9.9");
    const bare = renderFooter({ language: "en", messages: await loadMessages("en"), version: "1.0.0", environment: {} });
    expect(bare).not.toMatch(/Imprint|Privacy|impressum/i);
    expect(bare).toContain("Discussions");
  });
});

describe("guide content", () => {
  it("offers every English chapter in every language, and no chapter of its own", async () => {
    const english = await chaptersFor("en");
    expect(english.length).toBeGreaterThan(10);
    const numbers = english.map((chapter: { number: string }) => chapter.number);
    for (const language of LANGUAGES) {
      // A language that has not translated a chapter yet reads the English one,
      // but must not add a chapter English does not have.
      const own = await readChapters(language);
      for (const chapter of own) expect(numbers, `${language}/${chapter.file}`).toContain(chapter.number);
      const chapters = await chaptersFor(language);
      expect(chapters.map((chapter: { number: string }) => chapter.number), language).toEqual(numbers);
      for (const chapter of chapters) {
        expect(chapter.title, chapter.file).not.toBe(chapter.slug);
        expect(chapter.summary, chapter.file).not.toBe("");
      }
    }
  });

  it("uses only interface names, chapters and pictures that exist", async () => {
    for (const language of LANGUAGES) {
      const chapters = await chaptersFor(language);
      const slugs = new Set(chapters.map((chapter: { slug: string }) => chapter.slug));
      for (const chapter of chapters) {
        const context = await contextFor(language);
        const { html } = renderBlocks(chapter.body, { ...context, shortcutsHtml: "" });
        const where = `${language}/${chapter.file}`;
        expect(html, where).not.toMatch(/\{\{|\}\}/);
        for (const target of context.references.chapters) expect(slugs.has(target), `${where}: chapter ${target}`).toBe(true);
        for (const shot of context.references.shots) {
          // A picture of its own, or the English one standing in for it.
          const picture = imageDirectories(language).find((directory) => existsSync(join(directory, `${shot}.webp`)));
          expect(picture, `${where}: picture ${shot}`).toBeTruthy();
        }
      }
    }
  });

  it("shows the same pictures in every language", async () => {
    const shots = async (language: TestLanguage) => {
      const names = new Set<string>();
      for (const chapter of await chaptersFor(language)) {
        for (const match of chapter.body.matchAll(/\(shot:([\w-]+)\)/g)) names.add(match[1]);
      }
      return [...names].sort();
    };
    const english = await shots("en");
    for (const language of LANGUAGES) expect(await shots(language), language).toEqual(english);
  });

  it("has a scene for every picture", async () => {
    const scenes = readFileSync(join(root, "scripts", "guide-scenes.mjs"), "utf8");
    const taken = new Set([...scenes.matchAll(/ctx\.shot\("([\w-]+)"/g)].map((match) => match[1]));
    for (const chapter of await readChapters("de")) {
      for (const match of chapter.body.matchAll(/\(shot:([\w-]+)\)/g)) {
        expect(taken.has(match[1]), `no scene takes the picture ${match[1]}`).toBe(true);
      }
    }
  });

  it("names every MCP tool in the AI chapter, in every language", async () => {
    for (const language of LANGUAGES) {
      const slug = chapterFile(language, "ai");
      const chapter = (await chaptersFor(language)).find((entry: { slug: string }) => entry.slug === slug);
      expect(chapter, language).toBeDefined();
      for (const tool of tools) expect(chapter.body, `${language}: ${tool.name}`).toContain(`\`${tool.name}\``);
    }
  });

  it("reads the shortcut table from the program", async () => {
    const groups = await readShortcutGroups();
    expect(groups.length).toBeGreaterThan(6);
    expect(groups.flatMap((group: { entries: unknown[] }) => group.entries).length).toBeGreaterThan(30);
  });

  it("has a chapter behind every question mark in the program", async () => {
    for (const language of LANGUAGES) {
      const slugs = new Set((await chaptersFor(language)).map((chapter: { slug: string }) => chapter.slug));
      for (const name of Object.keys(GUIDE_CHAPTERS) as GuideChapter[]) {
        const file = chapterFile(language, name);
        expect(slugs.has(file), `${language}: ${name} -> ${file}`).toBe(true);
      }
    }
  });

  it("has a heading behind every question mark that jumps into a chapter", async () => {
    for (const language of LANGUAGES) {
      const chapters = await chaptersFor(language);
      for (const name of Object.keys(GUIDE_SECTIONS) as GuideSection[]) {
        const section = GUIDE_SECTIONS[name];
        const chapter = chapters.find((entry: { slug: string }) => entry.slug === chapterFile(language, section.chapter));
        expect(chapter, `${language}: ${name}`).toBeTruthy();
        // The headings of the file the reader really gets: its own, or English.
        const ids = chapter!.body.split(/\r?\n/).filter((line: string) => line.startsWith("## ")).map((line: string) => slugify(line.slice(3).trim()));
        expect(ids, `${language}: ${name}`).toContain(sectionId(language, name));
      }
    }
    expect(guideHref("en", undefined, "sectionView")).toBe("/guide/view-and-workplane.html#looking-inside-the-section-view");
    // Russian has a folder of its own, as German does.
    expect(guideHref("ru", undefined, "sectionView")).toBe("/ru/view-and-workplane.html#zaglyanut-vnutr-vid-v-razreze");
    expect(guideHref("ru")).toBe("/ru/index.html");
    // A shape's question mark lands on its own heading, in the chapter it belongs to.
    expect(guideHref("de", guideChapterForShape({ kind: "hinge" }), guideSectionForShape({ kind: "hinge" }))).toBe("/anleitung/gewinde-und-mechanik.html#scharnier");
    expect(guideHref("de", guideChapterForShape({ kind: "knurl" }), guideSectionForShape({ kind: "knurl" }))).toBe("/anleitung/gewinde-und-mechanik.html#raendelung");
    expect(guideHref("en", guideChapterForShape({ kind: "box" }), guideSectionForShape({ kind: "box" }))).toBe("/guide/shapes.html#the-shape-s-settings");
    expect(guideSectionForShape({ kind: "mesh", groupedShapes: [{}], groupOperation: "bundle" })).toBe("bundling");
    expect(guideSectionForShape({ kind: "text" })).toBeUndefined();
    for (const kind of ["thread", "gear", "spring", "bentTube", "honeycomb", "hinge", "knurl", "dovetail", "teardrop", "counterbore", "countersink", "ruler"] as const) {
      const section = guideSectionForShape({ kind });
      expect(section && GUIDE_SECTIONS[section].chapter, kind).toBe(guideChapterForShape({ kind }));
    }
  });

  it("opens the chapter that fits a shape", () => {
    expect(guideHref("de", "solids")).toBe("/anleitung/koerper-und-aussparungen.html");
    expect(guideHref("ru", "solids")).toBe("/ru/solids-and-holes.html");
    expect(guideHref("en")).toBe("/guide/index.html");
    expect(guideChapterForShape({ kind: "text" })).toBe("text");
    expect(guideChapterForShape({ kind: "thread" })).toBe("threads");
    expect(guideChapterForShape({ kind: "box", groupedShapes: [{}] })).toBe("solids");
    expect(guideChapterForShape({ kind: "cylinder" })).toBe("shapes");
  });

  it("writes every language where the program looks for it", () => {
    // guideLinks answers the question marks, build-guide writes the pages. The
    // two tables have to name the same folder, or every link leaves the guide.
    for (const language of LANGUAGES) {
      expect(GUIDE_DIRECTORIES[language], language).toBe(GUIDE_LANGUAGES[language].dir);
    }
  });
});
