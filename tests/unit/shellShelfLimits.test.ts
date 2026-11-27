import { describe, expect, it } from "vitest";
import { DEFAULT_SHELL_SHELF_SPACING, SHELL_SHELF_MAX_COUNT, SHELL_SHELF_RIB, SHELL_SHELF_SLOPE_FRONT, SHELL_SHELF_STEP, clampShellShelfCount, clampShellShelfSpacing, shellShelfDrop, shellShelfLevels, shellShelfMaxCount } from "@/lib/shellShelfLimits";

describe("how far the shelf ledge reaches down the wall (#1981)", () => {
  it("is the ledge's thickness without the slope, whatever its width", () => {
    expect(shellShelfDrop(0.5, false)).toBe(SHELL_SHELF_RIB);
    expect(shellShelfDrop(5, false)).toBe(SHELL_SHELF_RIB);
  });

  it("is the width and the front edge with the slope", () => {
    expect(shellShelfDrop(1.5, true)).toBeCloseTo(1.5 + SHELL_SHELF_SLOPE_FRONT, 6);
    expect(shellShelfDrop(3, true)).toBeCloseTo(3.5, 6);
    expect(shellShelfDrop(5, true)).toBeCloseTo(5.5, 6);
  });

  it("is never less with the slope than without it", () => {
    expect(shellShelfDrop(0.5, true)).toBe(SHELL_SHELF_RIB);
    expect(shellShelfDrop(1, true)).toBe(SHELL_SHELF_RIB);
  });

  it("keeps the width to what is offered", () => {
    expect(shellShelfDrop(40, true)).toBeCloseTo(5.5, 6);
    expect(shellShelfDrop(Number.NaN, true)).toBe(SHELL_SHELF_RIB);
  });
});

describe("several shelf ledges up the wall (#2065)", () => {
  it("makes each ledge above a step narrower and as many as stay at least the least width", () => {
    expect(shellShelfMaxCount(0.5)).toBe(1);
    expect(shellShelfMaxCount(1.5)).toBe(2);
    expect(shellShelfMaxCount(4.5)).toBe(5);
    expect(shellShelfMaxCount(5)).toBe(SHELL_SHELF_MAX_COUNT);
    expect(shellShelfLevels(4, 20, 3, 35)).toEqual([{ width: 4, height: 20 }, { width: 4 - SHELL_SHELF_STEP, height: 55 }, { width: 4 - 2 * SHELL_SHELF_STEP, height: 90 }]);
  });

  it("keeps one ledge when no count is given, and keeps the count and the spacing to what is offered", () => {
    expect(shellShelfLevels(1.5, 20)).toEqual([{ width: 1.5, height: 20 }]);
    expect(clampShellShelfCount(undefined, 5)).toBe(1);
    expect(clampShellShelfCount(9, 1.5)).toBe(2);
    expect(clampShellShelfCount(0, 5)).toBe(1);
    expect(clampShellShelfSpacing(undefined)).toBe(DEFAULT_SHELL_SHELF_SPACING);
    expect(clampShellShelfSpacing(2)).toBe(10);
    expect(shellShelfLevels(1.5, 20, 4, 30)).toHaveLength(2);
  });
});
