import { describe, expect, it } from "vitest";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { vaseNote } from "@/lib/vaseNotes";
import { normalizeVaseSettings } from "@/lib/vaseSettings";
import { vasePrintReport } from "@/lib/vaseShape";
import { canonicalizeShape } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

const asset = toolbarShapeAssets.find((entry) => entry.kind === "vase");

function vase(settings: Record<string, unknown> = {}, frame: Partial<WorkplaneShape> = {}): WorkplaneShape {
  if (!asset) throw new Error("no vase in the catalogue");
  const shape = makeShapeFromAsset(asset, { x: 0, z: 0 });
  return canonicalizeShape({ ...shape, ...frame, vase: normalizeVaseSettings({ ...shape.vase, quality: "entwurf", effect: "keine", ...settings }) });
}

describe("printing a vase", () => {
  it("weighs a hollow vase by its walls, and a heavier material more", () => {
    const pla = vasePrintReport(vase({ body: "hohl", wall: 2, bottom: 2 }));
    expect(pla.vaseMode).toBe(false);
    expect(pla.material).toBe("PLA");
    // A 90 by 180 mm bottle with 2 mm walls: a good deal of plastic, but far from solid.
    expect(pla.grams).toBeGreaterThan(40);
    expect(pla.grams).toBeLessThan(250);
    expect(pla.meters).toBeGreaterThan(10);
    const petg = vasePrintReport(vase({ body: "hohl", wall: 2, bottom: 2, material: "petg" }));
    expect(petg.grams).toBeGreaterThan(pla.grams);
  });

  it("weighs a solid vase as the slicer's vase mode prints it: one line along the wall", () => {
    const thin = vasePrintReport(vase({ body: "voll", lineWidth: 0.45 }));
    const wide = vasePrintReport(vase({ body: "voll", lineWidth: 0.9 }));
    expect(thin.vaseMode).toBe(true);
    expect(thin.line).toBeCloseTo(0.45, 6);
    // The wall doubles; the 1 mm bottom stays.
    expect(wide.grams).toBeGreaterThan(1.5 * thin.grams);
    // Much lighter than the same vase printed hollow with 2 mm walls.
    expect(thin.grams).toBeLessThan(vasePrintReport(vase({ body: "hohl", wall: 2, bottom: 2 })).grams);
  });

  it("finds an overhang, and says every note in the current language", () => {
    const bowl = vasePrintReport(vase({ profile: "schale", body: "hohl" }, { height: 60 }));
    expect(bowl.notes.some((note) => note.startsWith("Überhang"))).toBe(true);
    const variants: Array<Record<string, unknown>> = [
      { profile: "schale", body: "hohl", wall: 0.6, bottom: 0.6 },
      { body: "hohl", lamp: "haengend" },
      { body: "hohl", lamp: "stehend", footHeight: 4, lampNotch: 8 },
      { body: "hohl", lamp: "puck", drainHoles: 3, puckDiameter: 120 },
      { body: "voll", lamp: "haengend", drainHoles: 3, rubberFeet: 4 },
      { body: "voll", legMode: "stecken" },
      { body: "hohl", legMode: "stecken", footHeight: 10 },
      { body: "hohl", legMode: "stecken", legCount: 6, legDiameter: 30 },
      { body: "hohl", drainHoles: 9, drainDiameter: 14, floorSlope: 6 },
      { body: "hohl", watertight: "ja", drainHoles: 3, cutout: "waben" },
      { body: "voll", watertight: "ja" },
      { body: "voll", reinforce: "rippen" },
      { body: "voll", reinforce: "doppelwand", reinforceDepth: 1 },
      { body: "voll", reinforce: "rippen", slitWidth: 0.03 },
      { body: "hohl", reinforce: "rippen" },
      { body: "hohl", cutout: "waben", cutoutEdge: "ganz", cutoutFrom: 40, cutoutTo: 45 },
      { body: "voll", cutout: "kreise" },
      { body: "hohl", effect: "lowpoly", cutout: "kreise" },
      { body: "voll", lidMode: "schnapp" },
      { body: "hohl", lidMode: "schraube", wall: 1.2 },
      { body: "hohl", lidMode: "stuelp", insertMode: "stecker" },
      { body: "hohl", lidMode: "stuelp", lamp: "haengend" },
      { body: "hohl", bottom: 0, drainHoles: 3, legMode: "stecken" },
      { body: "hohl", bottom: 0, rubberFeet: 4 },
    ];
    const seen = new Set<string>();
    for (const settings of variants) {
      for (const note of vasePrintReport(vase(settings)).notes) {
        seen.add(note);
        const said = vaseNote(note);
        expect(said, note).not.toBe(note);
        expect(said, note).not.toMatch(/\{\w+\}/);
      }
    }
    // A good share of the core's notes came up.
    expect(seen.size).toBeGreaterThan(20);
  });

  it("says how a vase without a bottom prints, and what it leaves out", () => {
    const notes = vasePrintReport(vase({ body: "hohl", bottom: 0, drainHoles: 3, legMode: "stecken" })).notes;
    expect(notes).toContain("Ohne Boden gibt es keine Ablauflöcher.");
    expect(notes).toContain("Ohne Boden gibt es keine Buchsen und Mulden.");
    expect(notes.some((note) => note.startsWith("Ohne Boden: unten offen wie ein Rohr."))).toBe(true);
    expect(notes.some((note) => note.startsWith("Boden nur") || note.startsWith("Boden auf"))).toBe(false);
  });

  it("has nothing to say about a plain hollow vase", () => {
    expect(vasePrintReport(vase({ profile: "zylinder", body: "hohl", wall: 2, bottom: 2 })).notes).toEqual([]);
  });
});
