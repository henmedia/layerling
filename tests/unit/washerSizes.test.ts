import { describe, expect, it } from "vitest";
import { WASHER_SIZES, WASHER_SIZE_ORDER, isWasherSize, washerSizeFor, washerTubeFields } from "@/lib/washerSizes";
import { tubeInnerDiameter } from "@/lib/tubeDiameters";

describe("washers to ISO 7089 (#1052)", () => {
  it("makes a tube of the size's measures", () => {
    expect(washerTubeFields("M5")).toEqual({ width: 10, depth: 10, height: 1, bevel: 2.35 });
    const tube = washerTubeFields("M8");
    expect(tubeInnerDiameter(tube.width, tube.bevel)).toBeCloseTo(8.4, 6);
  });

  it("names the size a tube's measures are, and none for measures of its own", () => {
    for (const size of WASHER_SIZE_ORDER) {
      const tube = washerTubeFields(size);
      expect(washerSizeFor(tube.width, tubeInnerDiameter(tube.width, tube.bevel), tube.height), size).toBe(size);
    }
    expect(washerSizeFor(10, 5.3, 1.2)).toBeNull();
    expect(washerSizeFor(20, 12, 4)).toBeNull();
  });

  it("has a bore over the screw and a wall the tube can build", () => {
    for (const size of WASHER_SIZE_ORDER) {
      const { inner, outer, thickness } = WASHER_SIZES[size];
      expect(inner, size).toBeGreaterThan(Number(size.slice(1)));
      expect((outer - inner) / 2, size).toBeGreaterThanOrEqual(0.5);
      expect(thickness, size).toBeGreaterThan(0);
    }
    expect(isWasherSize("M5")).toBe(true);
    expect(isWasherSize("M7")).toBe(false);
    expect(isWasherSize(5)).toBe(false);
  });
});
