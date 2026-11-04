import { describe, expect, it } from "vitest";
import { convexHull, pointInsideOutline } from "@/lib/screenHull";

// The eight corners of a box seen at an angle, in screen pixels (y down), as the selection frame projects them.
const box = [
  { x: 100, y: 300 }, { x: 400, y: 340 }, { x: 160, y: 200 }, { x: 460, y: 240 },
  { x: 100, y: 250 }, { x: 400, y: 290 }, { x: 160, y: 150 }, { x: 460, y: 190 },
];

describe("screen outline of the selection frame (#1282)", () => {
  it("keeps only the outer corners", () => {
    expect(convexHull(box)).toHaveLength(6);
  });

  it("finds a point in the empty middle of the frame", () => {
    expect(pointInsideOutline({ x: 280, y: 250 }, box)).toBe(true);
  });

  it("leaves a point beside the frame out", () => {
    expect(pointInsideOutline({ x: 50, y: 250 }, box)).toBe(false);
    expect(pointInsideOutline({ x: 280, y: 400 }, box)).toBe(false);
    // Inside the bounding rectangle but outside the slanted outline.
    expect(pointInsideOutline({ x: 110, y: 160 }, box)).toBe(false);
  });

  it("lets a click just beside the line count with a margin", () => {
    expect(pointInsideOutline({ x: 95, y: 275 }, box)).toBe(false);
    expect(pointInsideOutline({ x: 95, y: 275 }, box, 8)).toBe(true);
  });

  it("works whichever order the corners come in", () => {
    expect(pointInsideOutline({ x: 280, y: 250 }, [...box].reverse())).toBe(true);
  });

  it("has no inside for a frame squashed to a line", () => {
    expect(pointInsideOutline({ x: 5, y: 5 }, [{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 5, y: 5 }])).toBe(false);
  });
});
