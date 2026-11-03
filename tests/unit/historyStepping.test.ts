import { describe, expect, it } from "vitest";
import { HISTORY_PLAY_DELAYS, historyKeyTarget, historyPlayNext, historyPlayStart, historyWheelSteps } from "@/lib/historyStepping";

describe("historyKeyTarget (#688)", () => {
  it("jumps ten states with Page Up and Page Down, held at both ends", () => {
    expect(historyKeyTarget("PageUp", 25, 40, 40)).toBe(15);
    expect(historyKeyTarget("PageDown", 25, 40, 40)).toBe(35);
    expect(historyKeyTarget("PageUp", 4, 40, 40)).toBe(0);
    expect(historyKeyTarget("PageDown", 36, 40, 40)).toBe(40);
  });

  it("goes to the oldest state with Home and to the state the design is at with End", () => {
    expect(historyKeyTarget("Home", 25, 40, 30)).toBe(0);
    expect(historyKeyTarget("End", 5, 40, 30)).toBe(30);
  });

  it("leaves other keys to the slider", () => {
    expect(historyKeyTarget("ArrowLeft", 25, 40, 40)).toBeNull();
    expect(historyKeyTarget("a", 25, 40, 40)).toBeNull();
  });
});

describe("historyWheelSteps (#688)", () => {
  it("goes one state per mouse notch, up to an earlier one", () => {
    expect(historyWheelSteps(0, -100, 0)).toEqual({ steps: -1, carry: 0 });
    expect(historyWheelSteps(0, 120, 0)).toEqual({ steps: 1, carry: 0 });
    expect(historyWheelSteps(0, -3, 1)).toEqual({ steps: -1, carry: 0 });
  });

  it("adds up the small deltas of a touchpad", () => {
    let carry = 0;
    let steps = 0;
    for (let i = 0; i < 10; i += 1) {
      const result = historyWheelSteps(carry, 12, 0);
      carry = result.carry;
      steps += result.steps;
    }
    expect(steps).toBe(2);
    expect(carry).toBeCloseTo(20);
  });
});

describe("playing the history (#1210)", () => {
  it("steps one state in the direction and stops at either end", () => {
    expect(historyPlayNext(2, 5, 1)).toBe(3);
    expect(historyPlayNext(2, 5, -1)).toBe(1);
    expect(historyPlayNext(5, 5, 1)).toBeNull();
    expect(historyPlayNext(0, 5, -1)).toBeNull();
    expect(historyPlayNext(2, 5, 0)).toBeNull();
  });

  it("starts again from the other end when it begins at the end of its way", () => {
    expect(historyPlayStart(5, 5, 1)).toBe(0);
    expect(historyPlayStart(0, 5, -1)).toBe(5);
    expect(historyPlayStart(2, 5, 1)).toBe(2);
    expect(historyPlayStart(2, 5, -1)).toBe(2);
  });

  it("goes faster the higher the speed", () => {
    expect(HISTORY_PLAY_DELAYS.fast).toBeLessThan(HISTORY_PLAY_DELAYS.normal);
    expect(HISTORY_PLAY_DELAYS.normal).toBeLessThan(HISTORY_PLAY_DELAYS.slow);
  });
});
