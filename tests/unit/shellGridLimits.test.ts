import { describe, expect, it } from "vitest";
import { MAX_SHELL_DIVIDERS, MAX_SHELL_GRID_CELLS, normalizeShellDividers, normalizeShellGrid, SHELL_GRID_FLOOR, shellGridEstimate, shellGridFloor } from "@/lib/shellGridLimits";
import { clampShellStackHeight } from "@/lib/shellStackLimits";

describe("what the Gridfinity floor, the dividers and the stacking of a hollow box offer", () => {
  it("keeps the floor to whole cells, or none", () => {
    expect(normalizeShellGrid({ cells: 3.4, fit: true })).toEqual({ cells: 3, fit: true });
    expect(normalizeShellGrid({ cells: 0 })).toBeNull();
    expect(normalizeShellGrid({ cells: "x" })).toBeNull();
    expect(normalizeShellGrid(null)).toBeNull();
    expect(normalizeShellGrid({ cells: 1e6, fit: "yes" })).toEqual({ cells: MAX_SHELL_GRID_CELLS, fit: false });
    // Magnet and screw holes are kept only when switched on, and either makes the floor 2.4 mm thicker, once.
    expect(normalizeShellGrid({ cells: 2, magnets: true, screws: true })).toEqual({ cells: 2, fit: false, magnets: true, screws: true });
    expect(normalizeShellGrid({ cells: 2, screws: "yes" })).toEqual({ cells: 2, fit: false });
    expect(shellGridFloor({ screws: true })).toBeCloseTo(SHELL_GRID_FLOOR + 2.4, 6);
    expect(shellGridFloor({ magnets: true, screws: true })).toBeCloseTo(SHELL_GRID_FLOOR + 2.4, 6);
    expect(shellGridFloor(null)).toBeCloseTo(SHELL_GRID_FLOOR, 6);
  });

  it("keeps the dividers to whole numbers up to the most", () => {
    expect(normalizeShellDividers({ x: 2, z: 0 })).toEqual({ x: 2, z: 0 });
    expect(normalizeShellDividers({ x: 0, z: 0 })).toBeNull();
    // Height and thickness as the Gridfinity compartments keep them: 0 or less is the full height, the thickness 0.8 to 3,
    // and the default 1.2 is not stored.
    expect(normalizeShellDividers({ x: 1, z: 0, height: 15, thickness: 2.4 })).toEqual({ x: 1, z: 0, height: 15, thickness: 2.4 });
    expect(normalizeShellDividers({ x: 1, z: 0, height: 0, thickness: 1.2 })).toEqual({ x: 1, z: 0 });
    expect(normalizeShellDividers({ x: 1, z: 0, height: -3, thickness: 9 })).toEqual({ x: 1, z: 0, thickness: 3 });
    expect(normalizeShellDividers({ x: 1, z: 0, thickness: 0.2 })).toEqual({ x: 1, z: 0, thickness: 0.8 });
    expect(normalizeShellDividers({ x: 99, z: -3 })).toEqual({ x: MAX_SHELL_DIVIDERS, z: 0 });
    expect(normalizeShellDividers(undefined)).toBeNull();
  });

  it("estimates the cells an inside holds from the box's size and wall", () => {
    // 100 x 80 with a 2 mm wall: 96 x 76 inside, 0.5 mm play: two cells along, one across.
    expect(shellGridEstimate(100, 80, 2)).toEqual({ columns: 2, rows: 1, max: 2 });
    expect(shellGridEstimate(30, 30, 2)).toEqual({ columns: 0, rows: 0, max: 0 });
    // 8 cells and a hair along an axis, wall included.
    expect(shellGridEstimate(2 * 1.5 + 4 * 42 + 0.5, 2 * 1.5 + 2 * 42 + 0.5, 1.5)).toEqual({ columns: 4, rows: 2, max: 8 });
  });

  it("keeps the collar's height to what is offered", () => {
    expect(clampShellStackHeight(0)).toBe(1);
    expect(clampShellStackHeight(99)).toBe(10);
    expect(clampShellStackHeight(3.04)).toBe(3);
    expect(clampShellStackHeight(Number.NaN)).toBe(3);
  });
});
