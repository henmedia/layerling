import { describe, expect, it } from "vitest";
import { pressTakesThumb, rangeThumbX, rangeValueAt, RANGE_THUMB_PX } from "@/lib/rangeTouch";
import { reachForPointer } from "@/lib/pointerReach";

describe("a slider follows a finger or pen only from its knob (Discussion #2019)", () => {
  const bar = { left: 100, width: 217, min: 0, max: 100 };

  it("finds the knob's middle along the bar", () => {
    expect(rangeThumbX({ ...bar, value: 0 })).toBe(100 + RANGE_THUMB_PX / 2);
    expect(rangeThumbX({ ...bar, value: 100 })).toBe(100 + 217 - RANGE_THUMB_PX / 2);
    expect(rangeThumbX({ ...bar, value: 50 })).toBe(100 + RANGE_THUMB_PX / 2 + 100);
    expect(rangeThumbX({ ...bar, value: 0, rtl: true })).toBe(100 + 217 - RANGE_THUMB_PX / 2);
  });

  it("takes the knob only near it, so a swipe elsewhere on the bar scrolls", () => {
    const geometry = { ...bar, value: 50 };
    const knob = rangeThumbX(geometry);
    expect(pressTakesThumb(geometry, knob)).toBe(true);
    expect(pressTakesThumb(geometry, knob + 15)).toBe(true);
    expect(pressTakesThumb(geometry, knob - 40)).toBe(false);
    expect(pressTakesThumb(geometry, bar.left + 5)).toBe(false);
  });

  it("turns the knob's place back into a value on the slider's steps", () => {
    expect(rangeValueAt(bar, rangeThumbX({ ...bar, value: 37 }), 1)).toBe(37);
    expect(rangeValueAt(bar, 0, 1)).toBe(0);
    expect(rangeValueAt(bar, 1000, 1)).toBe(100);
    expect(rangeValueAt({ ...bar, max: 1 }, rangeThumbX({ ...bar, max: 1, value: 0.3 }), 0.1)).toBe(0.3);
    expect(rangeValueAt({ ...bar, rtl: true }, rangeThumbX({ ...bar, value: 20, rtl: true }), 1)).toBe(20);
  });

  it("gives a pen a mouse's reach, not a finger's", () => {
    expect(reachForPointer(10, "pen")).toBe(10);
    expect(reachForPointer(10, "mouse")).toBe(10);
    expect(reachForPointer(10, "touch")).toBe(18);
  });
});
