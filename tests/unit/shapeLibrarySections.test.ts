import { describe, expect, it } from "vitest";
import { setLanguage } from "@/lib/i18n";
import { libraryShapeAssets, shapeAssetMenuLabel } from "@/lib/shapeCatalog";
import {
  RECENT_SHAPE_LIMIT,
  SHAPE_LIBRARY_SECTIONS,
  rememberRecentShape,
  searchShapeLibrary,
  shapeLibrarySections,
} from "@/lib/shapeLibrarySections";

const label = (shape: (typeof libraryShapeAssets)[number]) => shapeAssetMenuLabel(shape).replace(/\s+/g, " ");
const sections = shapeLibrarySections(libraryShapeAssets);
const search = (query: string) => searchShapeLibrary(sections, query, label);
const found = (query: string) => search(query).flatMap((section) => section.shapes.map((shape) => shape.id));

describe("the shape library's sections (#1170)", () => {
  it("puts every shape of the library into exactly one section, and the counts add up", () => {
    const ids = sections.flatMap((section) => section.shapes.map((shape) => shape.id));
    expect(ids).toHaveLength(libraryShapeAssets.length);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual(libraryShapeAssets.map((shape) => shape.id).sort());
    // No shape waits in "More shapes": a new one of the catalogue is given its section in SHAPE_LIBRARY_SECTIONS.
    expect(sections.map((section) => section.id)).not.toContain("other");
    expect(Object.fromEntries(sections.map((section) => [section.id, section.shapes.length]))).toEqual({
      basic: 15, vessels: 4, holes: 4, connections: 4, mechanics: 3, systems: 2, lettering: 4, decorative: 4, helpers: 1,
    });
  });

  it("names only shapes of the library, each once", () => {
    const named = SHAPE_LIBRARY_SECTIONS.flatMap((section) => section.shapes);
    expect(new Set(named).size).toBe(named.length);
    const library = new Set(libraryShapeAssets.map((shape) => shape.id));
    expect(named.filter((id) => !library.has(id))).toEqual([]);
  });

  it("puts a shape no section names at the end, under More shapes", () => {
    const withNew = shapeLibrarySections([...libraryShapeAssets.slice(0, 3), { id: "newShape", name: "New shape" }]);
    expect(withNew.map((section) => section.id)).toEqual(["basic", "other"]);
    expect(withNew.at(-1)?.shapes.map((shape) => shape.id)).toEqual(["newShape"]);
  });

  it("leaves out the sections a shorter list has no shape for", () => {
    const short = shapeLibrarySections(libraryShapeAssets.filter((shape) => ["box", "text", "ruler"].includes(shape.id)));
    expect(short.map((section) => [section.id, section.shapes.length])).toEqual([["basic", 1], ["lettering", 1], ["helpers", 1]]);
  });
});

describe("searching the shape library (#1170)", () => {
  it("finds the port opening by USB, through the words of the command search", () => {
    setLanguage("en", false);
    expect(search("USB")).toEqual([expect.objectContaining({ id: "holes", total: 4, shapes: [expect.objectContaining({ id: "port" })] })]);
  });

  it("shows what really matches for a word with several meanings: pipe is the cylinder and the tube", () => {
    setLanguage("en", false);
    expect(found("pipe")).toEqual(["cylinder", "tube"]);
  });

  it("finds by the name in the current language, by German words and by the English name in any language", async () => {
    await setLanguage("fr", false);
    // "Charnière", the hinge's French name, typed without its accent; no search word of the command search has it.
    expect(found("charniere")).toEqual(["hinge"]);
    expect(found("ressort")).toEqual(["spring"]);
    expect(found("gear")).toEqual(["gear"]);
    expect(found("Gewinde")).toEqual(["thread"]);
    await setLanguage("en", false);
    expect(found("charniere")).toEqual([]);
  });

  it("finds a shape by its own words, not by the name of its section, and nothing for a word no shape has", async () => {
    await setLanguage("de", false);
    // The German section "Gefäße, Rohre & Übergänge" holds the vase too; "rohr" finds the tubes and the cylinder only.
    expect(found("rohr")).toEqual(["cylinder", "tube", "bentTube"]);
    await setLanguage("en", false);
    expect(search("xyzzy")).toEqual([]);
    expect(search("   ")).toHaveLength(sections.length);
    expect(search("   ").map((section) => section.shapes.length)).toEqual(sections.map((section) => section.shapes.length));
  });

  it("needs every word: a ruler is found by measure, and not by measure and gear", () => {
    setLanguage("en", false);
    expect(found("measure")).toEqual(["ruler"]);
    expect(found("measure gear")).toEqual([]);
  });
});

describe("recently used shapes (#1170)", () => {
  it("keeps the last four distinct shapes put in, newest first", () => {
    let recent: string[] = [];
    for (const id of ["box", "cylinder", "box", "thread", "gear", "vase", "thread"]) recent = rememberRecentShape(recent, id);
    expect(recent).toEqual(["thread", "vase", "gear", "box"]);
    expect(recent).toHaveLength(RECENT_SHAPE_LIMIT);
  });
});
