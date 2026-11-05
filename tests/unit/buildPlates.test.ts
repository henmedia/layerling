import { describe, expect, it } from "vitest";
import {
  MAX_BUILD_PLATES,
  PLATE_GAP,
  normalizePlateNames,
  packOntoPlates,
  plateCenterX,
  plateCount,
  plateIndexAt,
  plateOfShape,
  plateOverhangs,
  platesExtentX,
  platesMoved,
  platesRemoved,
  platesWithAdded,
  shapesAfterPlateResize,
  shapesMovedToPlate,
} from "@/lib/buildPlates";
import { shapeBedFootprint } from "@/lib/printBed";
import { normalizeWorkspaceSettings, workspaceWithSavedDefault } from "@/lib/workplaneSettings";
import type { WorkplaneShape } from "@/types/layerling";

const box = (id: string, x: number, z = 0, width = 20, depth = 10, height = 10): WorkplaneShape => ({
  id, name: id, kind: "box", color: "#ff0000", x, z, elevation: 0, size: Math.max(width, depth), width, depth, height, rotation: 0,
});

// Three plates of 200 × 150 mm: their middles at 0, 220 and 440.
const ws = { width: 200, depth: 150, plates: ["", "Lid", ""] };

describe("build plates side by side (Discussion #456)", () => {
  it("keeps one plate for a design without plates, as before", () => {
    const one = { width: 200, depth: 150 };
    expect(plateCount(one)).toBe(1);
    expect(plateOfShape(one, box("a", 900))).toBe(0);
    expect(platesExtentX(one)).toEqual({ minX: -100, maxX: 100 });
  });

  it("lays the plates out to the right with a gap", () => {
    expect(plateCount(ws)).toBe(3);
    expect(plateCenterX(ws, 0)).toBe(0);
    expect(plateCenterX(ws, 1)).toBe(200 + PLATE_GAP);
    expect(plateCenterX(ws, 2)).toBe(2 * (200 + PLATE_GAP));
    expect(platesExtentX(ws)).toEqual({ minX: -100, maxX: 540 });
  });

  it("puts a body on the plate under the middle of its footprint", () => {
    expect(plateOfShape(ws, box("a", 30))).toBe(0);
    expect(plateOfShape(ws, box("b", 230))).toBe(1);
    expect(plateOfShape(ws, box("c", 2000))).toBe(2);
    expect(plateOfShape(ws, box("d", -500))).toBe(0);
    // In the gap it goes to the nearer plate.
    expect(plateIndexAt(ws, 105)).toBe(0);
    expect(plateIndexAt(ws, 115)).toBe(1);
  });

  it("checks each body against its own plate", () => {
    const printer = { width: 200, depth: 150, height: 100 };
    const fits = box("fits", 220 + 80, 0, 20); // reaches 310, plate 2 ends at 320
    const past = box("past", 220 + 95, 0, 20); // reaches 325
    const onFirst = box("first", 90, 0, 20); // reaches 100, the first plate's edge
    const overhangs = plateOverhangs([fits, past, onFirst], ws, printer);
    expect(overhangs.map((overhang) => overhang.shape.id)).toEqual(["past"]);
    expect(overhangs[0].right).toBeCloseTo(5, 6);
    // The body is named as it stands, not moved into its plate's frame.
    expect(overhangs[0].shape).toBe(past);
  });

  it("counts the build height from the lowest body on each plate", () => {
    const printer = { width: 200, depth: 150, height: 50 };
    const sunk = { ...box("sunk", 0, 0, 10, 10, 10), elevation: -40 };
    const tall = { ...box("tall", 220, 0, 10, 10, 45) };
    // Together on one plate the tall one would reach 85 above the sunk one; on its own plate it fits.
    expect(plateOverhangs([sunk, tall], ws, printer)).toEqual([]);
  });

  it("adds plates up to the limit", () => {
    expect(platesWithAdded(ws, " Base ")).toEqual(["", "Lid", "", "Base"]);
    const full = { width: 200, depth: 150, plates: Array.from({ length: MAX_BUILD_PLATES }, () => "") };
    expect(platesWithAdded(full)).toBeNull();
    expect(normalizePlateNames(Array.from({ length: 20 }, () => "x"))).toHaveLength(MAX_BUILD_PLATES);
    expect(normalizePlateNames([""])).toBeUndefined();
    expect(normalizePlateNames(["Only"])).toEqual(["Only"]);
  });

  it("moves bodies onto another plate at the same spot", () => {
    const shapes = [box("a", 30, 12), box("b", 230)];
    const moved = shapesMovedToPlate(ws, shapes, new Set(["a"]), 2);
    expect(moved[0].x).toBeCloseTo(440 + 30, 6);
    expect(moved[0].z).toBe(12);
    expect(moved[1]).toBe(shapes[1]);
  });

  it("removes a plate and moves the later plates up with their bodies", () => {
    const shapes = [box("a", 10), box("b", 230), box("c", 450)];
    const kept = platesRemoved(ws, shapes, 1, "move");
    expect(kept.plates).toEqual(["", ""]);
    expect(kept.shapes.map((shape) => shape.x)).toEqual([10, 10, 230]);
    const gone = platesRemoved(ws, shapes, 1, "delete");
    expect(gone.removedIds).toEqual(["b"]);
    expect(gone.shapes.map((shape) => [shape.id, shape.x])).toEqual([["a", 10], ["c", 230]]);
    // Without plate 1 the next one lies at the origin.
    const firstGone = platesRemoved(ws, shapes, 0, "move");
    expect(firstGone.plates).toEqual(["Lid", ""]);
    expect(firstGone.shapes.map((shape) => shape.x)).toEqual([10, 10, 230]);
  });

  it("reorders plates with their bodies", () => {
    const shapes = [box("a", 10), box("b", 230), box("c", 450)];
    const result = platesMoved(ws, shapes, 0, 2);
    expect(result.plates).toEqual(["Lid", "", ""]);
    expect(result.shapes.map((shape) => [shape.id, shape.x])).toEqual([["a", 450], ["b", 10], ["c", 230]]);
  });

  it("keeps each body on its plate when the plates change size", () => {
    const shapes = [box("a", 10), box("b", 230)];
    const larger = { ...ws, width: 250 };
    const moved = shapesAfterPlateResize(ws, larger, shapes);
    expect(moved[0].x).toBe(10);
    expect(moved[1].x).toBe(270 + 10);
    expect(plateOfShape(larger, moved[1])).toBe(1);
  });

  it("arranges bodies onto the plates row by row and opens new plates", () => {
    const one = { width: 100, depth: 100 };
    // Each 40 × 40: two fit in a row (5 + 40 + 5 + 40 + 5 = 95), two rows on a plate: four per plate.
    const shapes = Array.from({ length: 6 }, (_, index) => box(`p${index}`, 0, 0, 40, 40));
    const packed = packOntoPlates(one, shapes, new Set(shapes.map((shape) => shape.id)));
    expect(packed.plateCount).toBe(2);
    expect(packed.leftOver).toEqual([]);
    const plates = packed.shapes.map((shape) => plateOfShape({ ...one, plates: ["", ""] }, shape));
    expect(plates.filter((plate) => plate === 0)).toHaveLength(4);
    expect(plates.filter((plate) => plate === 1)).toHaveLength(2);
    // Every packed body lies wholly on its plate and none overlap.
    const printer = { width: 100, depth: 100 };
    expect(plateOverhangs(packed.shapes, { ...one, plates: ["", ""] }, printer)).toEqual([]);
    const prints = packed.shapes.map(shapeBedFootprint);
    for (let i = 0; i < prints.length; i += 1) {
      for (let j = i + 1; j < prints.length; j += 1) {
        const a = prints[i];
        const b = prints[j];
        const overlap = a.minX < b.maxX - 1e-6 && b.minX < a.maxX - 1e-6 && a.minZ < b.maxZ - 1e-6 && b.minZ < a.maxZ - 1e-6;
        expect(overlap).toBe(false);
      }
    }
  });

  it("leaves a body larger than a plate where it is", () => {
    const one = { width: 100, depth: 100 };
    const huge = box("huge", 7, 3, 150, 20);
    const packed = packOntoPlates(one, [huge], new Set(["huge"]));
    expect(packed.leftOver).toEqual(["huge"]);
    expect(packed.shapes[0]).toBe(huge);
  });

  it("keeps the plates with the design, never in the default workplane", () => {
    const design = normalizeWorkspaceSettings({ width: 200, depth: 150, plates: ["", "Lid"] });
    expect(design.plates).toEqual(["", "Lid"]);
    expect(normalizeWorkspaceSettings({ width: 200, depth: 150 }).plates).toBeUndefined();
    const withDefault = workspaceWithSavedDefault(design, normalizeWorkspaceSettings({ width: 300, depth: 300 }));
    expect(withDefault.plates).toEqual(["", "Lid"]);
  });
});
