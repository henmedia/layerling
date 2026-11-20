import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GUIDE_SEARCH_CORE, plainText, searchEntries } from "../../scripts/build-guide.mjs";

/*
 * The search box of the user guide (#279): the index the build writes and the matching the page runs.
 */

type Entry = { c: string; h: string; u: string; t: string };
type Hit = { entry: Entry; score: number };

const core = new Function(`${GUIDE_SEARCH_CORE}; return { fold: guideFold, prepare: guidePrepare, search: guideSearch, ranges: guideRanges };`)() as {
  fold: (text: string) => string;
  ranges: (text: string, query: string, umlauts?: boolean) => { at: number; len: number }[];
  prepare: (entries: Entry[]) => unknown;
  search: (prepared: unknown, query: string, limit?: number, umlauts?: boolean) => Hit[];
};

const entries: Entry[] = [
  { c: "Selecting and moving", h: "Mirror", u: "/guide/selecting.html#mirror", t: "Mirror flips the selection across a plane. For a mirrored copy, duplicate first." },
  { c: "Selecting and moving", h: "Align", u: "/guide/selecting.html#align", t: "Align lays several bodies out along one edge or centre." },
  { c: "Shapes", h: "", u: "/guide/shapes.html", t: "Every shape the palette offers, and how to mirror a half of a part." },
  { c: "Anleitung", h: "Größe ändern", u: "/anleitung/groesse.html#groesse", t: "Über die Griffe oder die Felder. Ändere die Höhe, ohne die Breite zu verlieren." },
];
const prepared = core.prepare(entries);
const find = (query: string) => core.search(prepared, query).map((hit) => hit.entry.u);

describe("the index of a chapter", () => {
  const html = [
    "<p>Intro &amp; more.</p>",
    '<h2 id="first">First <code>part</code></h2>',
    "<p>Text of the first part, with a <strong>bold</strong> word.</p>",
    '<h3 id="deeper">Deeper</h3>',
    "<ul><li>One</li><li>Two &lt;3</li></ul>",
  ].join("\n");
  const found = searchEntries({ title: "Chapter", summary: "What it is.", html, path: "/guide/chapter.html" });

  it("has the chapter itself and one entry per section", () => {
    expect(found.map((entry: Entry) => entry.u)).toEqual(["/guide/chapter.html", "/guide/chapter.html#first", "/guide/chapter.html#deeper"]);
    expect(found.map((entry: Entry) => entry.h)).toEqual(["", "First part", "Deeper"]);
  });

  it("keeps the text and loses the markup", () => {
    expect(found[0].t).toBe("What it is. Intro & more.");
    expect(found[1].t).toBe("Text of the first part, with a bold word.");
    expect(found[2].t).toBe("One Two <3");
  });

  it("reads plain text out of rendered HTML", () => {
    expect(plainText("<p>a</p><p>b&nbsp;c</p>")).toBe("a b c");
  });
});

describe("the guide that is built", () => {
  const root = join(__dirname, "..", "..");
  for (const dir of ["guide", "anleitung"]) {
    const file = join(root, "apps/web/public", dir, "search-index.json");
    it.skipIf(!existsSync(file))(`${dir} has an index whose entries point into its own pages`, () => {
      const list = JSON.parse(readFileSync(file, "utf8")) as Entry[];
      expect(list.length).toBeGreaterThan(100);
      for (const entry of list) {
        expect(entry.u.startsWith(`/${dir}/`)).toBe(true);
        expect(entry.c.length).toBeGreaterThan(0);
      }
      expect(list.some((entry) => entry.h && entry.t.length > 20)).toBe(true);
    });
  }
});

describe("the matching", () => {
  it("folds case and accents letter for letter", () => {
    expect(core.fold("Größe Über")).toBe("große uber");
    expect(core.fold("Größe Über").length).toBe("Größe Über".length);
  });

  it("folds the Polish ł to l, which has no decomposition", () => {
    expect(core.fold("Własne czcionki Łódź")).toBe("wlasne czcionki lodz");
  });

  it("finds a section by a word in its heading first", () => {
    expect(find("mirror")[0]).toBe("/guide/selecting.html#mirror");
    expect(find("mirror")).toContain("/guide/shapes.html");
  });

  it("wants every word of the query", () => {
    expect(find("mirror duplicate")).toEqual(["/guide/selecting.html#mirror"]);
    expect(find("mirror unicorn")).toEqual([]);
  });

  it("matches without caring for case or accents", () => {
    expect(find("GROßE")).toEqual(["/anleitung/groesse.html#groesse"]);
    expect(find("große")).toEqual(["/anleitung/groesse.html#groesse"]);
    expect(find("uber griffe")).toEqual(["/anleitung/groesse.html#groesse"]);
  });

  it("takes ss and the sharp s for each other, in the query and in the text", () => {
    const tape = core.prepare([
      { c: "Messen", h: "Das Maßband", u: "/anleitung/messen.html#das-massband", t: "Das Maßband misst zwischen zwei Punkten." },
      { c: "Messen", h: "Straße und Fuß", u: "/anleitung/messen.html#strasse", t: "Eine Strasse ist kein Fuss." },
    ]);
    const urls = (query: string) => core.search(tape, query).map((hit) => hit.entry.u);
    expect(urls("massband")).toEqual(["/anleitung/messen.html#das-massband"]);
    expect(urls("maßband")).toEqual(["/anleitung/messen.html#das-massband"]);
    expect(urls("MASSBAND")).toEqual(["/anleitung/messen.html#das-massband"]);
    expect(urls("strasse")).toEqual(["/anleitung/messen.html#strasse"]);
    expect(urls("straße")).toEqual(["/anleitung/messen.html#strasse"]);
    expect(urls("fuss")).toEqual(["/anleitung/messen.html#strasse"]);
    expect(urls("fuß")).toEqual(["/anleitung/messen.html#strasse"]);
    expect(urls("strasse fuß")).toEqual(["/anleitung/messen.html#strasse"]);
  });

  it("finds an umlaut by its two letters where the language writes them so", () => {
    const search = (query: string, umlauts: boolean) => core.search(prepared, query, 8, umlauts).map((hit) => hit.entry.u);
    expect(search("aendere", true)).toEqual(["/anleitung/groesse.html#groesse"]);
    expect(search("groesse", true)).toEqual([]);
    expect(search("hoehe", true)).toEqual(["/anleitung/groesse.html#groesse"]);
    expect(search("ueber", true)).toEqual(["/anleitung/groesse.html#groesse"]);
    // Without it a query is taken as typed: English "blue" must not turn into "blu".
    expect(search("aendere", false)).toEqual([]);
    expect(search("hoehe", false)).toEqual([]);
  });

  it("finds a part of a word", () => {
    expect(find("palet")).toEqual(["/guide/shapes.html"]);
  });

  it("answers nothing for an empty query", () => {
    expect(find("")).toEqual([]);
    expect(find("   ")).toEqual([]);
  });

  it("limits the number of results", () => {
    expect(core.search(prepared, "e", 2)).toHaveLength(2);
  });
});

describe("the words marked on the page a result leads to (#1059)", () => {
  const marked = (text: string, query: string, umlauts = false) =>
    core.ranges(core.fold(text), query, umlauts).map((r) => text.slice(r.at, r.at + r.len));

  it("marks every place a word stands, whatever its case or accents", () => {
    expect(marked("Mirror flips; a mirrored copy is a MIRROR too.", "mirror")).toEqual(["Mirror", "mirror", "MIRROR"]);
    expect(marked("Café and cafe", "cafe")).toEqual(["Café", "cafe"]);
  });

  it("marks each word of the query and joins places that touch", () => {
    expect(marked("Align lays bodies out along one edge.", "edge align")).toEqual(["Align", "edge"]);
    expect(marked("fillet", "fil let")).toEqual(["fillet"]);
  });

  it("leaves out single letters when the query has longer words", () => {
    expect(marked("a hole in a wall", "a hole")).toEqual(["hole"]);
    expect(marked("x and y", "x")).toEqual(["x"]);
  });

  it("finds the umlaut by its two letters and the sharp s by ss", () => {
    expect(marked("Ändere die Größe", "aendere grosse", true)).toEqual(["Ändere", "Größe"]);
  });

  it("marks nothing for an empty query or a word that is not there", () => {
    expect(marked("Mirror", "")).toEqual([]);
    expect(marked("Mirror", "align")).toEqual([]);
  });
});

describe("an exact phrase in quotation marks (#1841)", () => {
  const text = core.prepare([
    { c: "Text", h: "Text on a circular arc", u: "/guide/text.html#arc", t: "Bend the line: the text follows a circular arc. Größe and Maßband stay as typed." },
    { c: "Text", h: "Search", u: "/guide/text.html#search", t: "The search box finds a font. On a circle the arc of the text closes; circular it is not." },
    { c: "Holes", h: "Rack", u: "/guide/holes.html#rack", t: 'A 19" rack panel has four slots.' },
  ]);
  const urls = (query: string, umlauts = false) => core.search(text, query, 8, umlauts).map((hit) => hit.entry.u);
  const marked = (sentence: string, query: string) => core.ranges(core.fold(sentence), query).map((r) => sentence.slice(r.at, r.at + r.len));

  it("wants the words next to each other and in this order", () => {
    expect(urls("circular arc")).toEqual(["/guide/text.html#arc", "/guide/text.html#search"]);
    expect(urls('"circular arc"')).toEqual(["/guide/text.html#arc"]);
    expect(urls('"arc circular"')).toEqual([]);
    expect(urls('"CIRCULAR   Arc"')).toEqual(["/guide/text.html#arc"]);
  });

  it("takes a quoted word whole, not as a part of a longer one", () => {
    expect(urls("sear")).toEqual(["/guide/text.html#search"]);
    expect(urls('"sear"')).toEqual([]);
    expect(urls('"search"')).toEqual(["/guide/text.html#search"]);
    expect(urls('"text follows"')).toEqual(["/guide/text.html#arc"]);
    expect(urls('"ext follows"')).toEqual([]);
    expect(urls('"text follow"')).toEqual([]);
  });

  it("mixes a phrase with plain words, all of which must be there", () => {
    expect(urls('"circular arc" bend')).toEqual(["/guide/text.html#arc"]);
    expect(urls('font "the arc"')).toEqual(["/guide/text.html#search"]);
    expect(urls('"circular arc" font')).toEqual([]);
  });

  it("reads curly and angled quotation marks like straight ones", () => {
    expect(urls("“circular arc”")).toEqual(["/guide/text.html#arc"]);
    expect(urls("„circular arc“")).toEqual(["/guide/text.html#arc"]);
    expect(urls("«circular arc»")).toEqual(["/guide/text.html#arc"]);
    expect(urls("「circular arc」")).toEqual(["/guide/text.html#arc"]);
  });

  it("still folds case, accents, the sharp s and the umlauts inside a phrase", () => {
    expect(urls('"grosse and massband"')).toEqual(["/guide/text.html#arc"]);
    expect(urls('"groesse and massband"', true)).toEqual([]);
    expect(urls('"groeße and maßband"', true)).toEqual(["/guide/text.html#arc"]);
  });

  it("takes a mark without a partner for a space: an inch sign, a phrase still being typed", () => {
    expect(urls('19" rack')).toEqual(["/guide/holes.html#rack"]);
    expect(urls('"circular ar')).toEqual(["/guide/text.html#arc", "/guide/text.html#search"]);
    expect(urls('""')).toEqual([]);
    expect(urls('" "')).toEqual([]);
  });

  it("marks the phrase as one piece on the page, and only where it stands whole", () => {
    expect(marked("A circular arc; an arc that is circular. Circular arcs.", '"circular arc"')).toEqual(["circular arc"]);
    expect(marked("Search the arc, ARC by arc.", '"arc"')).toEqual(["arc", "ARC", "arc"]);
    expect(marked("Bend the text on an arc.", '"an arc" bend')).toEqual(["Bend", "an arc"]);
  });
});
