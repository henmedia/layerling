import { describe, expect, it } from "vitest";
import { MOLD_CAST_MATERIAL_DATA, MOLD_CAST_MATERIALS, MOLD_DEFAULTS, MOLD_KINDS, moldMix, moldMixNotes, moldPartName, moldPouredMaterial, moldWarningText, normalizeMoldOptions } from "@/lib/moldTool";

/*
 * The settings of the mold tool's further kinds and ways, kept to what is offered, and what is poured into each kind:
 * the cast itself, or the silicone or plaster a mold is made of.
 */
describe("the mold tool's further settings", () => {
  it("keeps the new choices to what is offered and the new figures within their ranges", () => {
    const options = normalizeMoldOptions({
      kind: "skin", pieces: "five", pour: "seam", boxShape: "contour", moldMaterial: "wood", wick: "true", seal: true, shellSplit: "false", drain: 1,
      wickDiameter: 9, drainDiameter: 1, allowance: 80, mixA: 0, mixB: -5, price: -1, gap: 45, shrinkage: 12,
    });
    expect(options.kind).toBe("skin");
    expect(options.pieces).toBe("two");
    expect(options.pour).toBe("seam");
    expect(options.boxShape).toBe("contour");
    expect(options.moldMaterial).toBe("silicone");
    expect(options.wick).toBe(true);
    expect(options.seal).toBe(true);
    expect(options.shellSplit).toBe(false);
    // Not a yes or a no: the default stays.
    expect(options.drain).toBe(MOLD_DEFAULTS.drain);
    expect(options.wickDiameter).toBe(5);
    expect(options.drainDiameter).toBe(3);
    expect(options.allowance).toBe(50);
    expect(options.mixA).toBe(1);
    expect(options.mixB).toBe(0);
    expect(options.price).toBe(0);
    // Plaster halves want 25 mm round the master, slip shrinks a tenth: both within reach.
    expect(options.gap).toBe(45);
    expect(options.shrinkage).toBe(12);
  });

  it("starts as before: two halves poured from the top, a rectangular pour box", () => {
    const options = normalizeMoldOptions({});
    expect(options).toMatchObject({ kind: "twoPart", pieces: "two", pour: "top", wick: false, seal: false, boxShape: "rect", shellSplit: true, drain: false, moldMaterial: "silicone", allowance: 10, mixA: 100, mixB: 100, price: 0 });
    expect(MOLD_KINDS).toEqual(["twoPart", "box", "skin", "core", "halves", "tray", "die"]);
  });

  it("knows what is poured into each kind", () => {
    const of = (kind: (typeof MOLD_KINDS)[number]) => moldPouredMaterial({ kind, castMaterial: "concrete", moldMaterial: "plaster" });
    expect(of("twoPart")).toBe("concrete");
    expect(of("tray")).toBe("concrete");
    expect(of("core")).toBe("concrete");
    expect(of("box")).toBe("silicone");
    expect(of("skin")).toBe("silicone");
    expect(of("halves")).toBe("plaster");
  });

  it("has a shrinkage, a density and a mixing ratio for every casting material", () => {
    for (const material of MOLD_CAST_MATERIALS) {
      const data = MOLD_CAST_MATERIAL_DATA[material];
      expect(data.density).toBeGreaterThan(0.5);
      expect(data.shrinkage).toBeGreaterThanOrEqual(0);
      expect(data.mix[0]).toBeGreaterThan(0);
    }
    // Wax, soap and resin soften a mold printed in PLA; slip shrinks most.
    expect(MOLD_CAST_MATERIALS.filter((material) => MOLD_CAST_MATERIAL_DATA[material].hot)).toEqual(["resin", "wax", "soap"]);
    expect(MOLD_CAST_MATERIAL_DATA.clay.shrinkage).toBe(10);
    expect(MOLD_CAST_MATERIAL_DATA.wax.mix[1]).toBe(0);
  });

  it("says the mix in words: two parts by name, or one, and the cost when there is a price", () => {
    const plaster = moldMixNotes(moldMix(1000, normalizeMoldOptions({ kind: "halves", moldMaterial: "plaster", mixA: 100, mixB: 70, allowance: 0, price: 2 })));
    expect(plaster[0]).toBe("Mix about 1,600 g with 0 % extra: 941 g powder and 659 g water.");
    expect(plaster[1]).toBe("Material about 3.20.");
    const wax = moldMixNotes(moldMix(100, normalizeMoldOptions({ kind: "twoPart", castMaterial: "wax", density: 0.9, mixB: 0 })));
    expect(wax).toEqual(["Have about 99 g ready, 10 % extra included."]);
  });

  it("names the parts of the new kinds, numbered where there are several of one", () => {
    expect(moldPartName("quarter", "Owl", 3)).toBe("Owl mold, part 3 of 4");
    expect(moldPartName("skinShellHalf", "Owl", 2)).toBe("Owl skin mold, shell half 2");
    expect(moldPartName("sleeveHalf", "Pot", 1)).toBe("Pot core mold, sleeve half 1");
    expect(moldPartName("caseFirst", "Vase")).toBe("Vase case for the first mold half");
    expect(moldWarningText("rimCut", 0, 1.25)).toContain("1.3 mm lower");
  });
});
