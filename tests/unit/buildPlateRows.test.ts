import { describe, expect, it } from "vitest";
import {
  PLATE_GAP,
  packOntoPlates,
  plateCenterX,
  plateCenterZ,
  plateIndexAt,
  plateOfShape,
  platesBounds,
  platesExtentX,
  platesExtentZ,
  platesLieAlike,
  platesMoved,
  platesRemoved,
  shapesAfterPlateResize,
  shapesMovedToPlate,
  shapesOnPlateFrame,
} from "@/lib/buildPlates";
import { normalizePlatesPerRow } from "@/lib/buildPlateNames";
import { normalizeWorkspaceSettings } from "@/lib/workplaneSettings";
import { canonicalizeShape } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

const names = (count: number) => Array.from({ length: count }, () => "");
const eight = { width: 200, depth: 100, plates: names(8), platesPerRow: 4 };
const row = { ...eight, platesPerRow: undefined };
const box = (id: string, x: number, z: number, size = 20): WorkplaneShape =>
  canonicalizeShape({ id, name: id, kind: "box", color: "#fff", hole: false, x, z, elevation: 0, rotation: 0, width: size, depth: size, height: 10, size } as WorkplaneShape);

describe("build plates in rows (Discussion #2073)", () => {
  it("lays eight plates out as two rows of four, the second in front", () => {
    expect([plateCenterX(eight, 3), plateCenterZ(eight, 3)]).toEqual([3 * (200 + PLATE_GAP), 0]);
    expect([plateCenterX(eight, 4), plateCenterZ(eight, 4)]).toEqual([0, 100 + PLATE_GAP]);
    expect([plateCenterX(eight, 7), plateCenterZ(eight, 7)]).toEqual([660, 120]);
    expect(platesExtentX(eight)).toEqual({ minX: -100, maxX: 760 });
    expect(platesExtentZ(eight)).toEqual({ minZ: -50, maxZ: 170 });
    expect(platesBounds(eight, 2, 5)).toEqual({ minX: -100, maxX: 760, minZ: -50, maxZ: 170 });
  });

  it("finds every plate's own middle, and the nearest plate from outside", () => {
    for (let index = 0; index < 8; index += 1) expect(plateIndexAt(eight, plateCenterX(eight, index), plateCenterZ(eight, index))).toBe(index);
    expect(plateIndexAt(eight, 2000, 2000)).toBe(7);
    expect(plateIndexAt(eight, -500, 70)).toBe(4);
    // A last row that is not full: beside its last plate.
    const five = { ...eight, plates: names(5) };
    expect(plateIndexAt(five, 100, 120)).toBe(4);
    expect(plateIndexAt(five, 660, 70)).toBe(3);
  });

  it("is one row as before without a number, whatever the depth", () => {
    expect(plateCenterZ(row, 7)).toBe(0);
    expect(plateIndexAt(row, 440, 5000)).toBe(2);
    expect(plateIndexAt(row, 5000)).toBe(7);
  });

  it("takes the bodies along when the rows change, and back", () => {
    const shapes = [box("a", 10, 5), box("b", plateCenterX(row, 5) + 7, -9), box("c", plateCenterX(row, 7), 0)];
    const inRows = shapesAfterPlateResize(row, eight, shapes);
    expect(inRows.map((shape) => plateOfShape(eight, shape))).toEqual([0, 5, 7]);
    expect([inRows[1].x, inRows[1].z]).toEqual([plateCenterX(eight, 5) + 7, 120 - 9]);
    expect(shapesAfterPlateResize(eight, row, inRows).map(({ x, z }) => [x, z])).toEqual(shapes.map(({ x, z }) => [x, z]));
    expect(platesLieAlike(row, eight)).toBe(false);
    expect(platesLieAlike({ ...row, plates: names(4) }, { ...eight, plates: names(4) })).toBe(true);
  });

  it("keeps the spot on its plate through a deeper plate, moving, removing and exporting", () => {
    const body = box("a", plateCenterX(eight, 6) + 3, plateCenterZ(eight, 6) + 4);
    const deeper = shapesAfterPlateResize(eight, { ...eight, depth: 160 }, [body])[0];
    expect([deeper.x, deeper.z]).toEqual([plateCenterX(eight, 6) + 3, 180 + 4]);
    const first = shapesOnPlateFrame(eight, [body], 6)[0];
    expect([first.x, first.z]).toEqual([3, 4]);
    expect(plateOfShape(eight, shapesMovedToPlate(eight, [body], new Set(["a"]), 1)[0])).toBe(1);
    expect(plateOfShape(eight, platesMoved(eight, [body], 6, 0).shapes[0])).toBe(0);
    const removed = platesRemoved(eight, [body], 2, "move");
    expect(plateOfShape({ ...eight, plates: removed.plates }, removed.shapes[0])).toBe(5);
  });

  it("arranges onto the rows", () => {
    const bodies = Array.from({ length: 6 }, (_, index) => box(`b${index}`, 0, 0, 85));
    const packed = packOntoPlates({ ...eight, plates: names(1), platesPerRow: 2 }, bodies, new Set(bodies.map(({ id }) => id)));
    const laidOut = { ...eight, plates: names(packed.plateCount), platesPerRow: 2 };
    expect(packed.leftOver).toEqual([]);
    expect(packed.plateCount).toBe(3);
    expect([...new Set(packed.shapes.map((shape) => plateOfShape(laidOut, shape)))].sort()).toEqual([0, 1, 2]);
  });

  it("is kept with the design as a whole number from 1, and nothing else", () => {
    expect([1, 4, 11].map(normalizePlatesPerRow)).toEqual([1, 4, 11]);
    expect([0, -1, 2.5, 12, "4", null, undefined].map(normalizePlatesPerRow).every((value) => value === undefined)).toBe(true);
    expect(normalizeWorkspaceSettings({ plates: ["", ""], platesPerRow: 1 }).platesPerRow).toBe(1);
    expect("platesPerRow" in normalizeWorkspaceSettings({ plates: ["", ""] })).toBe(false);
  });
});
