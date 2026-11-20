import { describe, expect, it } from "vitest";
import { pointCoordinateLabel, pointCoordinateLabelSpot, pointDragStarted, SKETCH_POINT_DRAG_REACH } from "@/lib/sketchPointHover";

describe("a point under the pointer (Discussion #1801)", () => {
  const names = { x: "X", y: "Y" };
  const twoDecimals = (value: number) => value.toFixed(2);

  it("says where the point lies, with Y counting up the screen as in the X and Y fields", () => {
    expect(pointCoordinateLabel({ x: 12.5, z: -8 }, names, twoDecimals)).toBe("X 12.50  Y 8.00");
    expect(pointCoordinateLabel({ x: -3, z: 4.25 }, names, twoDecimals)).toBe("X -3.00  Y -4.25");
  });

  it("shows no minus before a zero", () => {
    expect(pointCoordinateLabel({ x: 0, z: 0 }, names, twoDecimals)).toBe("X 0.00  Y 0.00");
  });

  it("puts the label up and to the right, clear of the point", () => {
    const pill = { width: 100, height: 26 };
    const spot = pointCoordinateLabelSpot({ x: 10, z: 20 }, pill, 8);
    expect(spot.x - pill.width / 2).toBeCloseTo(18);
    expect(spot.z + pill.height / 2).toBeCloseTo(12);
  });

  it("keeps a pressed point where it is until the pointer has left the reach of a click", () => {
    const press = { x: 400, y: 300 };
    expect(pointDragStarted(press, press)).toBe(false);
    expect(pointDragStarted(press, { x: 402, y: 301 })).toBe(false);
    expect(pointDragStarted(press, { x: 400 + SKETCH_POINT_DRAG_REACH, y: 300 })).toBe(false);
    expect(pointDragStarted(press, { x: 400 + SKETCH_POINT_DRAG_REACH + 1, y: 300 })).toBe(true);
    expect(pointDragStarted(press, { x: 396, y: 296 })).toBe(true);
  });
});
