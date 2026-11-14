import { describe, expect, it } from "vitest";
import { cornerRulerArmCursor } from "@/lib/rulerDimensions";

// Discussion #1743: the pointer over an arm's end showed the left-right arrows on every arm.
describe("cornerRulerArmCursor", () => {
  const corner = { x: 100, y: 100 };

  it("shows left-right arrows for an arm running sideways, either way", () => {
    expect(cornerRulerArmCursor(corner, { x: 200, y: 105 })).toBe("ew-resize");
    expect(cornerRulerArmCursor(corner, { x: 0, y: 95 })).toBe("ew-resize");
  });

  it("shows up-and-down arrows for an arm running up or down the screen", () => {
    expect(cornerRulerArmCursor(corner, { x: 104, y: 0 })).toBe("ns-resize");
    expect(cornerRulerArmCursor(corner, { x: 96, y: 200 })).toBe("ns-resize");
  });

  it("shows the slanted arrows for a slanted arm", () => {
    // Screen y grows downwards: down-right and up-left is the nwse arrow.
    expect(cornerRulerArmCursor(corner, { x: 200, y: 200 })).toBe("nwse-resize");
    expect(cornerRulerArmCursor(corner, { x: 0, y: 0 })).toBe("nwse-resize");
    expect(cornerRulerArmCursor(corner, { x: 200, y: 0 })).toBe("nesw-resize");
    expect(cornerRulerArmCursor(corner, { x: 0, y: 200 })).toBe("nesw-resize");
  });

  it("falls back to left-right arrows when the end lies on the corner", () => {
    expect(cornerRulerArmCursor(corner, corner)).toBe("ew-resize");
  });
});
