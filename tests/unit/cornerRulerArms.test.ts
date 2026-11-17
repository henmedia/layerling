import { describe, expect, it } from "vitest";
import { horizontalPlacementWorkplane } from "@/lib/placementWorkplane";
import { CORNER_RULER_MAX_ARM, CORNER_RULER_MIN_ARM, cornerRulerArmLength, cornerRulerArmsShown, cornerRulerElevationArmLength, cornerRulerFrameForWorkplane, cornerRulerPlateArms, rotateCornerRulerFrame, toggledCornerRulerArms } from "@/lib/rulerDimensions";

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

  it("takes the third arm's length from the pointer's ray where it passes closest to the arm (Discussion #1649)", () => {
    // Looking from the front, level with the plate, at the place 37.4 mm above the corner.
    const fromFront = { origin: { x: ruler.corner.x + 5, y: 37.4, z: ruler.corner.z + 300 }, direction: { x: 0, y: 0, z: -1 } };
    expect(cornerRulerElevationArmLength(ruler, fromFront)).toBe(37);
    // From above at a slant, aimed at 64 mm up the arm.
    const target = { x: ruler.corner.x, y: 64, z: ruler.corner.z };
    const origin = { x: target.x + 200, y: target.y + 150, z: target.z + 100 };
    const slanted = { origin, direction: { x: target.x - origin.x, y: target.y - origin.y, z: target.z - origin.z } };
    expect(cornerRulerElevationArmLength(ruler, slanted)).toBe(64);
    // Below the corner it is the shortest arm, far up the longest.
    expect(cornerRulerElevationArmLength(ruler, { ...fromFront, origin: { ...fromFront.origin, y: -30 } })).toBe(CORNER_RULER_MIN_ARM);
    expect(cornerRulerElevationArmLength(ruler, { ...fromFront, origin: { ...fromFront.origin, y: 99999 } })).toBe(CORNER_RULER_MAX_ARM);
    // Straight down along the arm the place along it cannot be told.
    expect(cornerRulerElevationArmLength(ruler, { origin: { x: ruler.corner.x, y: 400, z: ruler.corner.z }, direction: { x: 0.01, y: -1, z: 0 } })).toBeNull();
  });

  it("shows the two arms in the plane and not the third to begin with, and keeps one arm shown (Discussion #1649)", () => {
    expect(cornerRulerArmsShown(undefined)).toEqual({ x: true, z: true, elevation: false });
    const up = toggledCornerRulerArms(undefined, "elevation");
    expect(up).toEqual({ elevation: true });
    expect(cornerRulerArmsShown(up)).toEqual({ x: true, z: true, elevation: true });
    // Back as at the start keeps nothing.
    expect(toggledCornerRulerArms(up, "elevation")).toBeUndefined();
    const onlyX = toggledCornerRulerArms(undefined, "z");
    expect(onlyX).toEqual({ z: false });
    // The last arm shown stays.
    expect(toggledCornerRulerArms(onlyX, "x")).toEqual({ z: false });
    expect(cornerRulerArmsShown(toggledCornerRulerArms({ x: false, z: false, elevation: true }, "elevation"))).toEqual({ x: false, z: false, elevation: true });
  });

  it("gives the arm along the plate's width the width and the other its depth, turned too", () => {
    const arms = cornerRulerPlateArms(frame, 256, 180);
    const xAlongWidth = Math.abs(frame.xAxis.x) >= Math.abs(frame.xAxis.z);
    expect(arms).toEqual(xAlongWidth ? { armLengthX: 256, armLengthZ: 180 } : { armLengthX: 180, armLengthZ: 256 });
    const turned = cornerRulerPlateArms(rotateCornerRulerFrame(frame), 256, 180);
    expect(turned).toEqual({ armLengthX: arms.armLengthZ, armLengthZ: arms.armLengthX });
  });
});
