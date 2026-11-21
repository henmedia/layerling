import { describe, expect, it } from "vitest";
import { propertyUsesLengthUnit } from "@/components/workplane/ShapeInspector";

describe("gridfinity bin overhang: the rows' unit", () => {
  it("shows each side's overhang and the chamfer under it in the workspace's length unit, as the padding", () => {
    ["gridfinityPaddingBack", "gridfinityOverhangBack", "gridfinityOverhangFront", "gridfinityOverhangLeft", "gridfinityOverhangRight", "gridfinityOverhangChamfer"].forEach((key) => {
      expect(propertyUsesLengthUnit(key), key).toBe(true);
    });
  });
});
