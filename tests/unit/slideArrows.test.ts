import { describe, expect, it } from "vitest";
import { horizontalPlacementWorkplane } from "@/lib/placementWorkplane";
import {
  SLIDE_ARROW_GAP,
  SLIDE_ARROW_LENGTH,
  SLIDE_HANDLE_KEYS,
  slideArrowLayout,
  slideAxisForHandle,
  slideAxisVector,
} from "@/lib/slideArrows";

// Discussion #1434: red and green arrows beside the lift arrow move a selection along X or Y only.
describe("slide arrows", () => {
  const reach = SLIDE_ARROW_GAP + SLIDE_ARROW_LENGTH / 2;

  it("know their axis from the handle key", () => {
    expect(slideAxisForHandle(SLIDE_HANDLE_KEYS.x)).toBe("x");
    expect(slideAxisForHandle(SLIDE_HANDLE_KEYS.y)).toBe("y");
    expect(slideAxisForHandle("lift-shape")).toBeNull();
  });

  it("point along X and, for Y, towards the back of the plate, as the arrows at its corner (#182)", () => {
    const flat = horizontalPlacementWorkplane();
    expect(slideAxisVector(flat, "x")).toEqual({ x: 1, y: 0, z: 0 });
    // Inside, Y counts towards the back: that is minus z.
    const y = slideAxisVector(flat, "y");
    expect(y.x).toBe(-0);
    expect(y.y).toBe(-0);
    expect(y.z).toBe(-1);
  });

  it("follow the axes of a tilted workplane", () => {
    const wall = { origin: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 0, z: 1 }, xAxis: { x: 1, y: 0, z: 0 }, zAxis: { x: 0, y: -1, z: 0 } };
    expect(slideAxisVector(wall, "x")).toEqual({ x: 1, y: 0, z: 0 });
    expect(slideAxisVector(wall, "y")).toEqual({ x: -0, y: 1, z: -0 });
  });

  it("stand a fixed way out from the middle of the top, along the way their axis runs on the screen", () => {
    const placements = slideArrowLayout(
      { x: 100, y: 100 },
      [
        { axis: "x", dx: 10, dy: 5, foreshortening: 0.9 },
        { axis: "y", dx: 6, dy: -8, foreshortening: 0.8 },
      ],
      { x: 0, y: -40 },
    );
    expect(placements.map((placement) => placement.axis)).toEqual(["x", "y"]);
    const [x, y] = placements;
    expect(Math.hypot(x.x - 100, x.y - 100)).toBeCloseTo(reach, 6);
    expect(x.angle).toBeCloseTo((Math.atan2(5, 10) * 180) / Math.PI, 6);
    expect(x.flipped).toBe(false);
    expect(Math.hypot(y.x - 100, y.y - 100)).toBeCloseTo(reach, 6);
    expect(y.flipped).toBe(false);
  });

  it("leave out an axis seen end on, so pulling it cannot throw the body far away", () => {
    const placements = slideArrowLayout(
      { x: 0, y: 0 },
      [
        { axis: "x", dx: 20, dy: 0, foreshortening: 1 },
        // The front view looks along Y: it shows as a short stub on the screen.
        { axis: "y", dx: 0, dy: -1, foreshortening: 0.05 },
      ],
      { x: 0, y: -30 },
    );
    expect(placements.map((placement) => placement.axis)).toEqual(["x"]);
  });

  it("turn an arrow round when it would lie on the lift arrow, as seen from straight above", () => {
    // From above the lift arrow points up on the screen, and so does Y.
    const placements = slideArrowLayout(
      { x: 50, y: 50 },
      [
        { axis: "x", dx: 12, dy: 0, foreshortening: 1 },
        { axis: "y", dx: 0, dy: -12, foreshortening: 1 },
      ],
      { x: 0, y: -30 },
    );
    const y = placements.find((placement) => placement.axis === "y");
    expect(y?.flipped).toBe(true);
    // It points down instead, the other way along the same line.
    expect(y?.x).toBeCloseTo(50, 6);
    expect(y?.y).toBeCloseTo(50 + reach, 6);
    expect(y?.angle).toBeCloseTo(90, 6);
  });

  it("keep the two arrows apart when both axes run the same way on the screen", () => {
    const placements = slideArrowLayout(
      { x: 0, y: 0 },
      [
        { axis: "x", dx: 10, dy: 1, foreshortening: 0.7 },
        { axis: "y", dx: 10, dy: -1, foreshortening: 0.7 },
      ],
      null,
    );
    expect(placements).toHaveLength(2);
    const [x, y] = placements;
    expect(x.flipped).toBe(false);
    expect(y.flipped).toBe(true);
    expect(Math.sign(x.x)).toBe(1);
    expect(Math.sign(y.x)).toBe(-1);
  });
});
