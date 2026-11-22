import { describe, expect, it } from "vitest";
import { CUSTOM_MAGNET_SIZE, MAGNET_POCKET_DEFAULTS, MAGNET_POCKET_SIZES, magnetPocketMeasures, magnetSizeFromId, magnetSizeId, magnetSizeName, normalizeMagnetPocketSpec } from "@/lib/magnetPocket";
import { connectorFootprint, normalizeSplitConnectorOptions, SPLIT_CONNECTOR_KINDS } from "@/lib/splitConnectors";

describe("magnet pockets", () => {
  it("are as wide as the magnet with the gap, 0.2 mm deeper, with a well half as wide and 1 mm deep", () => {
    const pocket = magnetPocketMeasures({ diameter: 3, height: 2, gap: 0.1, well: true });
    expect(pocket.pocketDiameter).toBeCloseTo(3.2, 6);
    expect(pocket.pocketDepth).toBeCloseTo(2.2, 6);
    expect(pocket.wellDiameter).toBeCloseTo(1.5, 6);
    expect(pocket.wellDepth).toBe(1);
    expect(pocket.totalDepth).toBeCloseTo(3.2, 6);
    expect(pocket.wall).toBe(1);
  });

  it("keep a ledge for the magnet round the well, and give a magnet too small for one no well", () => {
    for (const size of MAGNET_POCKET_SIZES) {
      const pocket = magnetPocketMeasures({ ...size, gap: 0.1, well: true });
      expect(pocket.wellDiameter).toBeGreaterThan(0);
      expect(pocket.pocketDiameter - pocket.wellDiameter).toBeGreaterThanOrEqual(1 - 1e-9);
    }
    expect(magnetPocketMeasures({ diameter: 1, height: 1, gap: 0, well: true }).wellDepth).toBe(0);
    expect(magnetPocketMeasures({ diameter: 6, height: 2, gap: 0.1, well: false })).toMatchObject({ wellDiameter: 0, wellDepth: 0, totalDepth: 2.2 });
  });

  it("hold every value within its limits and read typed numbers", () => {
    expect(normalizeMagnetPocketSpec({})).toEqual(MAGNET_POCKET_DEFAULTS);
    expect(normalizeMagnetPocketSpec({ diameter: "4,5", height: 50, gap: -1, well: false })).toEqual({ diameter: 4.5, height: 10, gap: 0, well: false });
    expect(normalizeMagnetPocketSpec({ diameter: "x" }).diameter).toBe(MAGNET_POCKET_DEFAULTS.diameter);
  });

  it("name the sizes and find a listed one again", () => {
    expect(magnetSizeName({ diameter: 6, height: 2 })).toBe("6 × 2");
    expect(magnetSizeId({ diameter: 3, height: 1 })).toBe("3x1");
    expect(magnetSizeId({ diameter: 7, height: 2 })).toBe(CUSTOM_MAGNET_SIZE);
    expect(magnetSizeFromId("10x3")).toEqual({ diameter: 10, height: 3 });
    expect(magnetSizeFromId("custom")).toBeNull();
  });

  it("are a connector of the split tool, spread by the pocket's width", () => {
    expect(SPLIT_CONNECTOR_KINDS).toContain("magnets");
    const options = normalizeSplitConnectorOptions({ kind: "magnets", magnetDiameter: 8, magnetHeight: 3, clearance: 0.15, magnetWell: false });
    expect(options).toMatchObject({ kind: "magnets", magnetDiameter: 8, magnetHeight: 3, magnetWell: false });
    expect(connectorFootprint(options)).toBeCloseTo(8.3, 6);
    expect(connectorFootprint({ ...options, kind: "dowels" })).toBe(options.diameter);
    expect(normalizeSplitConnectorOptions({ kind: "magnets", magnetDiameter: 99, magnetHeight: 0 })).toMatchObject({ magnetDiameter: 30, magnetHeight: 0.5 });
  });
});
