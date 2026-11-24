import { describe, expect, it } from "vitest";
import { SHELL_SHELF_RIB, SHELL_SHELF_SLOPE_FRONT, shellShelfDrop } from "@/lib/shellShelfLimits";

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
