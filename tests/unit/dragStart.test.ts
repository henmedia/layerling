import { describe, expect, it } from "vitest";
import { DRAG_START_PIXELS, dragHasStarted } from "@/lib/dragStart";

describe("dragHasStarted", () => {
  it("keeps a press with a slightly shaky hand a click", () => {
    expect(dragHasStarted(100, 100, 100, 100)).toBe(false);
    expect(dragHasStarted(100, 100, 103, 103)).toBe(false);
    expect(dragHasStarted(100, 100, 96, 102)).toBe(false);
  });

  it("starts the drag once the pointer has travelled the threshold, in any direction", () => {
    expect(dragHasStarted(100, 100, 100 + DRAG_START_PIXELS, 100)).toBe(true);
    expect(dragHasStarted(100, 100, 100, 100 - DRAG_START_PIXELS)).toBe(true);
    expect(dragHasStarted(100, 100, 104, 104)).toBe(true);
  });

  it("takes a threshold of its own", () => {
    expect(dragHasStarted(0, 0, 6, 0, 8)).toBe(false);
    expect(dragHasStarted(0, 0, 8, 0, 8)).toBe(true);
  });
});
