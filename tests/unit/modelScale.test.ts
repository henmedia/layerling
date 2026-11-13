import { describe, expect, it } from "vitest";
import { MODEL_SCALE_PRESETS, modelScalePercent, modelScalePercentInRange, modelScalePresetFor } from "@/lib/modelScale";
import { scaleShapesByPercent } from "@/lib/scaleByPercent";
import type { WorkplaneShape } from "@/types/layerling";

const tree = { width: 40, depth: 30, height: 80 };

describe("scaling to a model scale (forum, 3DVadda)", () => {
  it("takes a model built at full size as 1:1", () => {
    expect(modelScalePercent(87, null, tree, "height")).toBeCloseTo(100 / 87, 12);
    expect(modelScalePercent(220, null, tree, "height")).toBeCloseTo(0.4545, 4);
  });

  it("brings the model to the original's real size divided by the scale", () => {
    // A tree 16 m tall in H0 is 16,000 / 87 = 183.9 mm, however tall the model is now.
    const percent = modelScalePercent(87, 16_000, tree, "height");
    expect((tree.height * percent) / 100).toBeCloseTo(16_000 / 87, 9);
  });

  it("measures the length along the longest side across the plate", () => {
    // A locomotive 20 m long in N (1:160) is 125 mm long; its longest side is the width here.
    const percent = modelScalePercent(160, 20_000, { width: 250, depth: 40, height: 60 }, "length");
    expect((250 * percent) / 100).toBeCloseTo(125, 9);
    const turned = modelScalePercent(160, 20_000, { width: 40, depth: 250, height: 60 }, "length");
    expect(turned).toBeCloseTo(percent, 12);
  });

  it("gives nothing for a scale out of range or a size of nothing", () => {
    expect(modelScalePercent(0.5, null, tree, "height")).toBeNaN();
    expect(modelScalePercent(20_000, null, tree, "height")).toBeNaN();
    expect(modelScalePercent(87, 0, tree, "height")).toBeNaN();
    expect(modelScalePercent(87, 16_000, { width: 10, depth: 10, height: 0 }, "height")).toBeNaN();
  });

  it("lets the scaling take percentages down to 0.01 %, so Z (1:220) goes in one step", () => {
    expect(modelScalePercentInRange(100 / 220)).toBe(true);
    expect(modelScalePercentInRange(0.005)).toBe(false);
    expect(modelScalePercentInRange(1200)).toBe(false);
    const box = { id: "a", name: "a", kind: "box", color: "#888888", x: 0, z: 0, elevation: 0, size: 220, width: 220, depth: 220, height: 220, rotation: 0 } as WorkplaneShape;
    const result = scaleShapesByPercent([box], 100 / 220, "together", () => 10_000);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.patches[0].patch.height).toBeCloseTo(1, 9);
  });

  it("knows the usual gauges", () => {
    expect(MODEL_SCALE_PRESETS.map((preset) => preset.label)).toEqual(["Z", "N", "TT", "H0", "0", "1", "G", "16mm"]);
    expect(modelScalePresetFor(87)?.label).toBe("H0");
    expect(modelScalePresetFor(22.5)?.label).toBe("G");
    expect(modelScalePresetFor(19.05)?.label).toBe("16mm");
    expect(modelScalePresetFor(100)).toBeNull();
  });
});
