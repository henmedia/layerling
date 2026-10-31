import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  loadMessages,
  loadValues,
  parseEnv,
  parseFrontMatter,
  renderFooter,
  renderPrintAll,
  readChapters,
  readShortcutGroups,
  renderBlocks,
  renderInline,
  slugify,
  webpSize,
  englishHeadingPairs,
} from "../../scripts/build-guide.mjs";
import { tools } from "../../scripts/layerling-mcp-tools.mjs";
import { LANGUAGE_INFO } from "@/lib/languages";
import { GUIDE_CHAPTERS, GUIDE_SECTIONS, guideChapterForShape, guideHref, guideSectionForShape } from "@/lib/guideLinks";

// These read every language's chapters; under a full parallel run that can take more than the 5 s default.
vi.setConfig({ testTimeout: 30_000 });

const root = join(__dirname, "..", "..");
const LANGUAGES = ["de", "en", "nl", "ru", "cs"] as const;

async function contextFor(language: (typeof LANGUAGES)[number]) {
  return {
    language,
    messages: await loadMessages(language),
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

  it("fills the {count} of a counting sentence from the number after the bar", async () => {
    expect(renderInline("{{ui:workspace.gridMajorSteps|10}}", await contextFor("en"))).toContain("“10 grid steps”");
    expect(renderInline("{{ui:workspace.gridMajorSteps|10}}", await contextFor("de"))).toContain("„10 Rasterschritte“");
  });

  it("never writes a {count} placeholder into a built guide page", async () => {
    for (const language of LANGUAGES) {
      for (const chapter of await readChapters(language)) {
        const html = renderInline(chapter.body.replace(/^#.*$/gm, ""), await contextFor(language));
        expect(html, `${language}/${chapter.file}`).not.toContain("{count}");
      }
    }
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

  it("spells a heading in Cyrillic out, so it has an id of its own", () => {
    expect(slugify("Резьба и механика")).toBe("rezba-i-mekhanika");
    expect(slugify("Własne czcionki")).toBe("wlasne-czcionki");
    expect(slugify("Как отменить обработку кромки")).toBe("kak-otmenit-obrabotku-kromki");
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

  it("links the project's support page by default and drops it when switched off", async () => {
    const messages = await loadMessages("en");
    const byDefault = renderFooter({ language: "en", messages, version: "1.0.0", environment: {} });
    expect(byDefault).toContain("https://layerling.com/support.html?lang=en");
    const off = renderFooter({ language: "en", messages, version: "1.0.0", environment: { NEXT_PUBLIC_SUPPORT_HINT: "off" } });
    expect(off).not.toContain("support.html");
  });
});

describe("guide content", () => {
  it("has the same chapters in every language", async () => {
    const [de, en, nl, ru] = await Promise.all(LANGUAGES.map((language) => readChapters(language)));
    expect(de.length).toBeGreaterThan(10);
    expect(en.map((chapter: { number: string }) => chapter.number)).toEqual(de.map((chapter: { number: string }) => chapter.number));
    expect(nl.map((chapter: { number: string }) => chapter.number)).toEqual(en.map((chapter: { number: string }) => chapter.number));
    expect(ru.map((chapter: { number: string }) => chapter.number)).toEqual(en.map((chapter: { number: string }) => chapter.number));
    for (const chapter of [...de, ...en, ...nl, ...ru]) {
      expect(chapter.title, chapter.file).not.toBe(chapter.slug);
      expect(chapter.summary, chapter.file).not.toBe("");
    }
  });

  it("uses only interface names, chapters and pictures that exist", async () => {
    for (const language of LANGUAGES) {
      const chapters = await readChapters(language);
      const slugs = new Set(chapters.map((chapter: { slug: string }) => chapter.slug));
      for (const chapter of chapters) {
        const context = await contextFor(language);
        const { html } = renderBlocks(chapter.body, { ...context, shortcutsHtml: "" });
        const where = `${language}/${chapter.file}`;
        expect(html, where).not.toMatch(/\{\{|\}\}/);
        for (const target of context.references.chapters) expect(slugs.has(target), `${where}: chapter ${target}`).toBe(true);
        for (const shot of context.references.shots) {
          // A language without pictures of its own shows the English ones.
          const own = join(root, "docs", "guide", "images", language);
          const pictures = existsSync(own) ? own : join(root, "docs", "guide", "images", "en");
          expect(existsSync(join(pictures, `${shot}.webp`)), `${where}: picture ${shot}`).toBe(true);
        }
      }
    }
  });

  it("stands opposite the English section it answers, in every language", async () => {
    // The sections run in the same order in every language, and the names inside
    // one (interface keys, pictures) stay the same in a translation: a section
    // put in the wrong place, or two of them the other way round, shows up here.
    const names = (text: string) =>
      [...text.matchAll(/\{\{ui:[^}]+\}\}|\[\[[^\]]+\]\]|\(shot:[\w-]+\)/g)].map((match) => match[0].toLowerCase());
    const sectionsOf = (body: string) =>
      body
        .split(/\r?\n(?=## )/)
        .filter((part) => part.startsWith("## "))
        .map((part) => names(part));
    const overlap = (left: string[], right: string[]) => {
      const a = new Set(left);
      const b = new Set(right);
      if (a.size === 0 || b.size === 0) return 0;
      let common = 0;
      for (const name of a) if (b.has(name)) common += 1;
      return common / (a.size + b.size - common);
    };
    const english = await readChapters("en");
    for (const language of LANGUAGES.filter((code) => code !== "en")) {
      const other = await readChapters(language);
      for (const chapter of english) {
        const mine = other.find((entry: { number: string }) => entry.number === chapter.number);
        expect(mine, `${language}: chapter ${chapter.number}`).toBeDefined();
        const here = sectionsOf(chapter.body);
        const there = sectionsOf(mine!.body);
        expect(there.length, `${language}/${chapter.file}`).toBe(here.length);
        for (let index = 0; index < here.length; index += 1) {
          if (here[index].length === 0) continue;
          const scores = here.map((names, at) => ({ at, score: overlap(there[index], names) }));
          const best = scores.reduce((left, right) => (right.score > left.score ? right : left));
          expect(best.at, `${language}/${chapter.file}: section ${index + 1} of ${here.length}`).toBe(index);
        }
      }
    }
  });

  it("shows the same pictures in every language", async () => {
    const shots = async (language: (typeof LANGUAGES)[number]) => {
      const names = new Set<string>();
      for (const chapter of await readChapters(language)) {
        for (const match of chapter.body.matchAll(/\(shot:([\w-]+)\)/g)) names.add(match[1]);
      }
      return [...names].sort();
    };
    expect(await shots("en")).toEqual(await shots("de"));
    expect(await shots("nl")).toEqual(await shots("en"));
    expect(await shots("ru")).toEqual(await shots("en"));
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
      const chapter = (await readChapters(language)).find((entry: { slug: string }) => entry.slug === GUIDE_CHAPTERS.ai[language]);
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
      const slugs = new Set((await readChapters(language)).map((chapter: { slug: string }) => chapter.slug));
      for (const [name, files] of Object.entries(GUIDE_CHAPTERS)) {
        expect(slugs.has(files[language]), `${language}: ${name} -> ${files[language]}`).toBe(true);
      }
    }
  });

  it("lands every question mark of every language on its page and heading", () => {
    const headings = (markdown: string) => markdown.split(/\r?\n/).filter((line) => /^#{1,3} /.test(line)).map((line) => slugify(line.replace(/^#{1,3} /, "").trim()));
    const english = join(root, "docs", "guide", "en");
    const broken: string[] = [];
    for (const language of Object.keys(LANGUAGE_INFO) as Array<keyof typeof LANGUAGE_INFO>) {
      const directory = join(root, "docs", "guide", language);
      const own = existsSync(directory) ? readdirSync(directory).filter((entry) => entry.endsWith(".md")) : [];
      for (const [name, section] of Object.entries(GUIDE_SECTIONS)) {
        const [path, anchor] = guideHref(language, undefined, name as keyof typeof GUIDE_SECTIONS).split("#");
        const slug = path.split("/").pop()!.replace(/\.html$/, "");
        const englishFile = readdirSync(english).find((entry) => entry.endsWith(`-${GUIDE_CHAPTERS[section.chapter].en}.md`))!;
        const number = englishFile.slice(0, 3);
        const translated = own.find((entry) => entry.startsWith(number));
        const englishBody = readFileSync(join(english, englishFile), "utf8");
        if (!translated) {
          // An untranslated chapter shows the English text under the English name.
          if (slug !== GUIDE_CHAPTERS[section.chapter].en || !headings(englishBody).includes(anchor)) broken.push(`${language} ${name}: ${path}#${anchor}`);
          continue;
        }
        const body = readFileSync(join(directory, translated), "utf8");
        const ids = [...headings(body), ...englishHeadingPairs(body, englishBody).flat()];
        if (translated !== `${number}${slug}.md` || !ids.includes(anchor)) broken.push(`${language} ${name}: ${path}#${anchor} (${translated})`);
      }
    }
    expect(broken).toEqual([]);
  });

  it("has a heading behind every question mark that jumps into a chapter", () => {
    for (const language of LANGUAGES) {
      const directory = join(root, "docs", "guide", language);
      for (const [name, section] of Object.entries(GUIDE_SECTIONS)) {
        const file = readdirSync(directory).find((entry) => entry.endsWith(`-${GUIDE_CHAPTERS[section.chapter][language]}.md`));
        expect(file, `${language}: ${name}`).toBeTruthy();
        const ids = readFileSync(join(directory, file!), "utf8").split(/\r?\n/).filter((line) => /^#{2,3} /.test(line)).map((line) => slugify(line.replace(/^#{2,3} /, "").trim()));
        expect(ids, `${language}: ${name}`).toContain(section[language]);
      }
    }
    expect(guideHref("en", undefined, "sectionView")).toBe("/guide/view-and-workplane.html#looking-inside-the-section-view");
    // A shape's question mark lands on its own heading, in the chapter it belongs to.
    expect(guideHref("de", guideChapterForShape({ kind: "hinge" }), guideSectionForShape({ kind: "hinge" }))).toBe("/anleitung/gewinde-und-mechanik.html#scharnier");
    expect(guideHref("de", guideChapterForShape({ kind: "knurl" }), guideSectionForShape({ kind: "knurl" }))).toBe("/anleitung/gewinde-und-mechanik.html#raendelung");
    expect(guideHref("en", guideChapterForShape({ kind: "box" }), guideSectionForShape({ kind: "box" }))).toBe("/guide/shapes.html#the-shape-s-settings");
    expect(guideSectionForShape({ kind: "mesh", groupedShapes: [{}], groupOperation: "bundle" })).toBe("bundling");
    // Every shape's question mark jumps to a heading, not just into a chapter.
    expect(guideSectionForShape({ kind: "text" })).toBe("addingText");
    expect(guideSectionForShape({ kind: "mesh", sketchProfile: {} })).toBe("sketchFill");
    expect(guideSectionForShape({ kind: "mesh", sketchProfile: {}, sketchOperation: "revolve" })).toBe("sketchToBody");
    expect(guideSectionForShape({ kind: "mesh", importedMesh: { sourceFormat: "stl" } })).toBe("importing");
    expect(guideHref("de", guideChapterForShape({ kind: "mesh", sketchProfile: {} }), guideSectionForShape({ kind: "mesh", sketchProfile: {} }))).toBe("/anleitung/skizzen.html#fuellung-und-silhouette");
    for (const kind of ["thread", "gear", "spring", "bentTube", "gridfinity", "hinge", "knurl", "vase", "dovetail", "teardrop", "port", "counterbore", "countersink", "doubleCountersink", "ruler"] as const) {
      const section = guideSectionForShape({ kind });
      expect(section && GUIDE_SECTIONS[section].chapter, kind).toBe(guideChapterForShape({ kind }));
    }
  });

  it("opens the chapter that fits a shape", () => {
    expect(guideHref("de", "solids")).toBe("/anleitung/koerper-und-aussparungen.html");
    expect(guideHref("en")).toBe("/guide/index.html");
    expect(guideChapterForShape({ kind: "text" })).toBe("text");
    expect(guideChapterForShape({ kind: "thread" })).toBe("threads");
    expect(guideChapterForShape({ kind: "box", groupedShapes: [{}] })).toBe("solids");
    expect(guideChapterForShape({ kind: "cylinder" })).toBe("shapes");
  });
});

describe("the whole guide on one page", () => {
  const chapters = [
    { slug: "shapes", title: "Shapes", summary: "What there is", fallback: false },
    { slug: "solids", title: "Solids", summary: "Holes and bodies", fallback: true },
  ];
  const printable = [
    { chapter: chapters[0], html: '<h2 id="box">Box</h2><p>See <a href="#box">above</a>, <a href="/guide/solids.html#holes">holes</a> and <a href="/guide/solids.html">solids</a>.</p><h3 id="size">Size</h3><figure><img src="/guide/img/a.webp" loading="lazy"></figure>' },
    { chapter: chapters[1], html: '<h2 id="box">Box again</h2><h3 id="holes">Holes</h3>' },
  ];
  const html = renderPrintAll({ language: "en", chapters, printable, footer: "", languageLinks: [] });

  it("keeps two chapters' equal anchors apart and points links between chapters into the page", () => {
    expect(html).toContain('id="shapes--box"');
    expect(html).toContain('id="solids--box"');
    expect(html).toContain('href="#shapes--box"');
    expect(html).toContain('href="#solids--holes"');
    expect(html).toContain('href="#chapter-solids"');
    expect(html).toContain('id="chapter-shapes"');
    const ids = [...html.matchAll(/ id="([^"]+)"/g)].map((match) => match[1]);
    expect(new Set(ids).size).toBe(ids.length);
    const anchors = [...html.matchAll(/ href="#([^"]+)"/g)].map((match) => match[1]);
    for (const anchor of anchors) expect(ids, anchor).toContain(anchor);
  });

  it("sets the headings one level below the chapter's own title and loads every picture at once", () => {
    expect(html).toContain("<h2>1. Shapes</h2>");
    expect(html).toContain('<h3 id="shapes--box">Box</h3>');
    expect(html).toContain('<h4 id="shapes--size">Size</h4>');
    expect(html).not.toContain('loading="lazy"');
  });

  it("is no page for a search engine, and says when a chapter is not translated", () => {
    expect(html).toContain('<meta name="robots" content="noindex">');
    expect(html).toContain("not translated");
  });
});
