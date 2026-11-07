import { describe, expect, it } from "vitest";
import { horizontalPlacementWorkplane } from "@/lib/placementWorkplane";
import { CORNER_RULER_MAX_ARM, CORNER_RULER_MIN_ARM, cornerRulerArmLength, cornerRulerFrameForWorkplane, cornerRulerPlateArms, rotateCornerRulerFrame } from "@/lib/rulerDimensions";

const frame = cornerRulerFrameForWorkplane(horizontalPlacementWorkplane(0));
const ruler = { corner: { x: 10, y: 0, z: -20 }, frame };
const along = (arm: "x" | "z", distance: number, sideways = 0) => {
  const axis = arm === "x" ? frame.xAxis : frame.zAxis;
  const across = arm === "x" ? frame.zAxis : frame.xAxis;
  return {
    x: ruler.corner.x + axis.x * distance + across.x * sideways,
    y: 0,
    z: ruler.corner.z + axis.z * distance + across.z * sideways,
  };
};

describe("framing square arms (Discussion #1469)", () => {
  it("takes an arm's length from where its end is dragged, along the arm, in whole millimetres", () => {
    expect(cornerRulerArmLength(ruler, "x", along("x", 256.4))).toBe(256);
    expect(cornerRulerArmLength(ruler, "z", along("z", 179.6, 30))).toBe(180);
  });

  it("keeps an arm between its shortest and longest length", () => {
    expect(cornerRulerArmLength(ruler, "x", along("x", -40))).toBe(CORNER_RULER_MIN_ARM);
    expect(cornerRulerArmLength(ruler, "x", along("x", 3))).toBe(CORNER_RULER_MIN_ARM);
    expect(cornerRulerArmLength(ruler, "z", along("z", 99999))).toBe(CORNER_RULER_MAX_ARM);
  });

  it("gives the arm along the plate's width the width and the other its depth, turned too", () => {
    const arms = cornerRulerPlateArms(frame, 256, 180);
    const xAlongWidth = Math.abs(frame.xAxis.x) >= Math.abs(frame.xAxis.z);
    expect(arms).toEqual(xAlongWidth ? { armLengthX: 256, armLengthZ: 180 } : { armLengthX: 180, armLengthZ: 256 });
    const turned = cornerRulerPlateArms(rotateCornerRulerFrame(frame), 256, 180);
    expect(turned).toEqual({ armLengthX: arms.armLengthZ, armLengthZ: arms.armLengthX });
  });
});
