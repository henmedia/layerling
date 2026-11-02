import { describe, expect, it } from "vitest";
import { METRIC_COUNTERSINK_ANGLE, SCREW_HOLE_SIZE_ORDER, isScrewHoleSize, screwHoleFields, screwHoleSizeFor, screwHoleSizesFor } from "@/lib/screwHoleSizes";
import { NUT_POCKET_ROOM, NUT_POCKET_SIZE_ORDER, isNutPocketSize, nutPocketFields, nutPocketSizeFor } from "@/lib/nutPocketSizes";
import { countersinkDepth, normalizeScrewHoleAngle, normalizeScrewHoleHeadDepth, normalizeScrewHoleShaft } from "@/lib/screwHoleGeometry";
import { regularPolygonAspect } from "@/lib/regularPolygonFootprint";

const kinds = ["counterbore", "countersink", "doubleCountersink"] as const;

describe("counterbores and countersinks by screw size", () => {
  it("sets an M5 counterbore and countersink to the standards", () => {
    expect(screwHoleFields("counterbore", "M5", 20)).toEqual({ width: 10, depth: 10, height: 20, screwHoleShaft: 5.5, screwHoleHeadDepth: 5.4 });
    expect(screwHoleFields("countersink", "M5", 20)).toEqual({ width: 10.4, depth: 10.4, height: 20, screwHoleShaft: 5.5, screwHoleAngle: 90 });
  });

  it("offers a countersink only up to M20, a counterbore up to M30", () => {
    expect(screwHoleSizesFor("counterbore")).toEqual(SCREW_HOLE_SIZE_ORDER);
    expect(screwHoleSizesFor("countersink").at(-1)).toBe("M20");
    expect(isScrewHoleSize("M30", "counterbore")).toBe(true);
    expect(isScrewHoleSize("M30", "countersink")).toBe(false);
    expect(isScrewHoleSize("M7", "counterbore")).toBe(false);
    expect(isScrewHoleSize(5, "counterbore")).toBe(false);
  });

  it("keeps every size as the shape's own limits leave it, so the hole shows its size again", () => {
    for (const kind of kinds) {
      for (const size of screwHoleSizesFor(kind)) {
        const fields = screwHoleFields(kind, size, 0);
        const shaft = normalizeScrewHoleShaft(fields.screwHoleShaft, fields.width);
        const headDepth = normalizeScrewHoleHeadDepth(fields.screwHoleHeadDepth, fields.height);
        const angle = normalizeScrewHoleAngle(fields.screwHoleAngle);
        expect(shaft, `${kind} ${size}`).toBe(fields.screwHoleShaft);
        if (kind === "counterbore") expect(headDepth, `${kind} ${size}`).toBe(fields.screwHoleHeadDepth);
        else expect(angle).toBe(METRIC_COUNTERSINK_ANGLE);
        expect(shaft, `${kind} ${size}`).toBeGreaterThan(Number(size.slice(1)));
        expect(screwHoleSizeFor(kind, { width: fields.width, screwHoleShaft: shaft, screwHoleHeadDepth: headDepth, screwHoleAngle: angle }), `${kind} ${size}`).toBe(size);
      }
    }
    expect(screwHoleSizeFor("counterbore", { width: 10, screwHoleShaft: 5.5, screwHoleHeadDepth: 3, screwHoleAngle: 90 })).toBeNull();
  });

  it("lengthens a hole too short for the head and keeps a long one", () => {
    expect(screwHoleFields("counterbore", "M10", 4).height).toBeCloseTo(11.4, 9);
    expect(screwHoleFields("counterbore", "M10", 30).height).toBe(30);
    const cone = countersinkDepth(20, 11, 90);
    expect(screwHoleFields("countersink", "M10", 2).height).toBeCloseTo(cone + 1, 9);
    expect(screwHoleFields("doubleCountersink", "M10", 2).height).toBeCloseTo(2 * cone + 1, 9);
  });
});

describe("nut pockets from the hexagon (ISO 4032)", () => {
  it("makes an M5 pocket 8.4 across flats and 5.1 high", () => {
    const pocket = nutPocketFields("M5");
    expect(pocket.width).toBeCloseTo(8 + NUT_POCKET_ROOM, 9);
    expect(pocket.height).toBeCloseTo(4.7 + NUT_POCKET_ROOM, 9);
  });

  it("is a regular hexagon: across corners to across flats as the editor's hexagon", () => {
    const aspect = regularPolygonAspect(6);
    for (const size of NUT_POCKET_SIZE_ORDER) {
      const pocket = nutPocketFields(size);
      expect(pocket.depth / pocket.width, size).toBeCloseTo(aspect.depth / aspect.width, 9);
      expect(nutPocketSizeFor(6, pocket.width, pocket.depth, pocket.height), size).toBe(size);
      expect(nutPocketSizeFor(5, pocket.width, pocket.depth, pocket.height), size).toBeNull();
    }
    expect(nutPocketSizeFor(6, 20, 23.09, 20)).toBeNull();
    expect(isNutPocketSize("M8")).toBe(true);
    expect(isNutPocketSize("M7")).toBe(false);
  });
});
