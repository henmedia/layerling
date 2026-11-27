import { beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { OcctKernel, type ShapeHandle } from "occt-wasm";
import { shellSolid } from "@/lib/cadShell";
import { shellGridSolid } from "@/lib/cadShellGrid";
import { shellStackSolid } from "@/lib/cadShellStack";
import { shellShelfLevels } from "@/lib/shellShelfLimits";
import { SHELF_FAILED_MESSAGE, SHELF_HEIGHT_MESSAGE, SHELF_NEEDS_TOP_MESSAGE, SHELF_NOT_STRAIGHT_MESSAGE, shellShelfSolid, shellShelvesSolid } from "@/lib/cadShellShelf";

const ROTATE_Z_TO_Y: number[] = [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0];

describe("a shelf ledge in a hollowed box with the real OCCT kernel", () => {
  let kernel: OcctKernel;

  beforeAll(async () => {
    const wasm = join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm");
    kernel = await OcctKernel.init({ wasm });
  });

  function yUp(shape: ShapeHandle) {
    const turned = kernel.transform(shape, ROTATE_Z_TO_Y);
    kernel.release(shape);
    return turned;
  }

  /** 40 x 30 across, 40 high, hollowed to a 2 mm wall with the top open. */
  function hollowBox(wall = 2, height = 40) {
    const solid = yUp(kernel.makeBox(40, 30, height));
    const hollow = shellSolid(kernel, solid, wall, "top");
    kernel.release(solid);
    return hollow;
  }

  it("lays a ledge all round the inside, 2 mm thick and as wide as asked", () => {
    const hollow = hollowBox();
    const before = kernel.getVolume(hollow);
    const shelf = shellShelfSolid(kernel, hollow, 1.5, 20, 2);
    expect(kernel.isValid(shelf)).toBe(true);
    expect(kernel.getSubShapes(shelf, "solid")).toHaveLength(1);
    // The cavity is 36 x 26; the ledge takes a 1.5 mm ring of it, 2 mm high, and nothing leaves the outside.
    const ring = (36 * 26 - 33 * 23) * 2;
    expect(kernel.getVolume(shelf) - before).toBeCloseTo(ring, 1);
    const bounds = kernel.getBoundingBox(shelf, false);
    expect(bounds.xmax - bounds.xmin).toBeCloseTo(40, 3);
    expect(bounds.ymax - bounds.ymin).toBeCloseTo(40, 3);
  });

  /** A flat plate 1 mm thick that fills the cavity less 0.05 mm, its underside at `y`. */
  function plateAt(y: number, across = 35.9, along = 25.9) {
    return kernel.translate(yUp(kernel.makeBox(across, along, 1)), 2.05, y, -2.05);
  }

  it("puts the top of the ledge at the height above the inside of the floor", () => {
    const shelf = shellShelfSolid(kernel, hollowBox(), 2, 20, 2);
    // The ledge reaches from 20 to 22 mm (2 mm floor + 20); a plate resting on it touches it without cutting into it.
    expect(kernel.getVolume(kernel.common(shelf, plateAt(22)))).toBeLessThan(1e-6);
    expect(kernel.getVolume(kernel.common(shelf, plateAt(21.9)))).toBeGreaterThan(1);
    expect(kernel.getVolume(kernel.common(shelf, plateAt(18.9)))).toBeLessThan(1e-6);
  });

  it("keeps the middle free", () => {
    const shelf = shellShelfSolid(kernel, hollowBox(), 2, 20, 2);
    const middle = kernel.translate(yUp(kernel.makeBox(30, 20, 2)), 5, 20, -5);
    expect(kernel.getVolume(kernel.common(shelf, middle))).toBeLessThan(1e-6);
  });

  it("follows a round box", () => {
    const cylinder = shellSolid(kernel, yUp(kernel.makeCylinder(25, 40)), 2, "top");
    const before = kernel.getVolume(cylinder);
    const shelf = shellShelfSolid(kernel, cylinder, 2, 15, 2);
    expect(kernel.isValid(shelf)).toBe(true);
    const ring = Math.PI * (23 * 23 - 21 * 21) * 2;
    expect(kernel.getVolume(shelf) - before).toBeCloseTo(ring, 0);
  });

  it("goes together with the stacking foot and with a Gridfinity floor", () => {
    const solid = yUp(kernel.makeBox(100, 60, 40));
    const hollow = shellSolid(kernel, solid, 2, "top");
    const shelf = shellShelfSolid(kernel, hollow, 1.5, 20, 2);
    const withoutShelf = shellStackSolid(kernel, hollow, 3, 2, solid);
    const stacked = shellStackSolid(kernel, shelf, 3, 2, solid);
    expect(kernel.isValid(stacked)).toBe(true);
    expect(kernel.getSubShapes(stacked, "solid")).toHaveLength(1);
    expect(kernel.getVolume(stacked)).toBeGreaterThan(kernel.getVolume(withoutShelf) + 1);
    const floored = shellGridSolid(kernel, solid, shelf, { cells: 2, fit: false }, 0);
    expect(kernel.isValid(floored)).toBe(true);
    expect(kernel.getSubShapes(floored, "solid")).toHaveLength(1);
  });

  /** A flat plate 0.05 mm thick, its underside at `y`, that keeps `inset` mm away from the inside of every wall. */
  function sheetAt(y: number, inset: number) {
    return kernel.translate(yUp(kernel.makeBox(36 - 2 * inset, 26 - 2 * inset, 0.05)), 2 + inset, y, -(2 + inset));
  }

  it("lets the underside fall at 45 degrees to the wall with the slope (#1981)", () => {
    const hollow = hollowBox();
    const before = kernel.getVolume(hollow);
    const shelf = shellShelfSolid(kernel, hollow, 1.5, 20, 2, true);
    expect(kernel.isValid(shelf)).toBe(true);
    expect(kernel.getSubShapes(shelf, "solid")).toHaveLength(1);
    // A front edge 0.5 mm high and 1.5 mm wide, and under it the slope: a ring that narrows from 1.5 mm to nothing over 1.5 mm.
    const front = (36 * 26 - 33 * 23) * 0.5;
    const slope = 62 * 1.5 ** 2 - (4 / 3) * 1.5 ** 3;
    expect(kernel.getVolume(shelf) - before).toBeCloseTo(front + slope, 1);
    const bounds = kernel.getBoundingBox(shelf, false);
    expect(bounds.xmax - bounds.xmin).toBeCloseTo(40, 3);
    expect(bounds.ymax - bounds.ymin).toBeCloseTo(40, 3);
  });

  it("keeps the top of a sloped ledge where it was and narrows it underneath", () => {
    const shelf = shellShelfSolid(kernel, hollowBox(), 2, 20, 2, true);
    // The top lies at 22 mm as without the slope, at its full width of 2 mm.
    expect(kernel.getVolume(kernel.common(shelf, plateAt(22)))).toBeLessThan(1e-6);
    expect(kernel.getVolume(kernel.common(shelf, sheetAt(21.9, 1.9)))).toBeGreaterThan(1e-4);
    expect(kernel.getVolume(kernel.common(shelf, sheetAt(21.9, 2.05)))).toBeLessThan(1e-6);
    // The front edge ends at 21.5 mm; 1 mm below that the ledge is 1 mm wide, and at 19.5 mm it has reached the wall.
    expect(kernel.getVolume(kernel.common(shelf, sheetAt(20.45, 0.8)))).toBeGreaterThan(1e-4);
    expect(kernel.getVolume(kernel.common(shelf, sheetAt(20.45, 1.1)))).toBeLessThan(1e-6);
    expect(kernel.getVolume(kernel.common(shelf, sheetAt(19.4, 0)))).toBeLessThan(1e-6);
  });

  it("is never thinner at the wall with the slope than without it", () => {
    const hollow = hollowBox();
    const narrow = shellShelfSolid(kernel, hollow, 0.5, 20, 2, true);
    // A ledge 0.5 mm wide keeps a front edge of 1.5 mm, so it still reaches 2 mm down the wall.
    expect(kernel.getVolume(kernel.common(narrow, sheetAt(20.05, 0)))).toBeGreaterThan(1e-4);
    expect(kernel.getVolume(kernel.common(narrow, sheetAt(19.9, 0)))).toBeLessThan(1e-6);
    expect(kernel.getVolume(kernel.common(narrow, sheetAt(20.6, 0.45)))).toBeGreaterThan(1e-4);
  });

  it("slopes the ledge of a round box and of a box with rounded corners", () => {
    const cylinder = shellSolid(kernel, yUp(kernel.makeCylinder(25, 40)), 2, "top");
    const round = shellShelfSolid(kernel, cylinder, 2, 15, 2, true);
    expect(kernel.isValid(round)).toBe(true);
    expect(kernel.getSubShapes(round, "solid")).toHaveLength(1);
    const ring = Math.PI * ((23 * 23 - 21 * 21) * 0.5 + 23 * 2 ** 2 - 2 ** 3 / 3);
    expect(kernel.getVolume(round) - kernel.getVolume(cylinder)).toBeCloseTo(ring, 0);
    const box = yUp(kernel.makeBox(40, 30, 40));
    const upright = kernel.getSubShapes(box, "edge").filter((edge) => {
      const bounds = kernel.getBoundingBox(edge);
      return bounds.ymax - bounds.ymin > 39;
    });
    const rounded = shellSolid(kernel, kernel.fillet(box, upright, 6), 2, "top");
    // Wider than the inside corners' radius of 4 mm, where a chamfer on the finished ledge fails.
    for (const width of [1.5, 5]) {
      const shelf = shellShelfSolid(kernel, rounded, width, 20, 2, true);
      expect(kernel.isValid(shelf)).toBe(true);
      expect(kernel.getSubShapes(shelf, "solid")).toHaveLength(1);
      expect(kernel.getVolume(shelf)).toBeGreaterThan(kernel.getVolume(rounded) + 1);
    }
  });

  it("goes together with the stacking foot and with a Gridfinity floor when it is sloped", () => {
    const solid = yUp(kernel.makeBox(100, 60, 40));
    const hollow = shellSolid(kernel, solid, 2, "top");
    const shelf = shellShelfSolid(kernel, hollow, 3, 20, 2, true);
    const stacked = shellStackSolid(kernel, shelf, 3, 2, solid);
    expect(kernel.isValid(stacked)).toBe(true);
    expect(kernel.getSubShapes(stacked, "solid")).toHaveLength(1);
    const floored = shellGridSolid(kernel, solid, shelf, { cells: 2, fit: false }, 0);
    expect(kernel.isValid(floored)).toBe(true);
    expect(kernel.getSubShapes(floored, "solid")).toHaveLength(1);
  });

  it("needs room under a wide sloped ledge", () => {
    // 5 mm wide, the slope reaches 5.5 mm down the wall: more than the 4 mm there are above the floor.
    expect(() => shellShelfSolid(kernel, hollowBox(), 5, 4, 2, true)).toThrow(SHELF_HEIGHT_MESSAGE);
    expect(() => shellShelfSolid(kernel, hollowBox(), 5, 4, 2)).not.toThrow();
    expect(() => shellShelfSolid(kernel, hollowBox(), 5, 6, 2, true)).not.toThrow();
  });

  it("says why it cannot", () => {
    expect(() => shellShelfSolid(kernel, hollowBox(), 1.5, 80, 2)).toThrow(SHELF_HEIGHT_MESSAGE);
    expect(() => shellShelfSolid(kernel, hollowBox(2, 12), 1.5, 20, 2)).toThrow(SHELF_HEIGHT_MESSAGE);
    const sealed = shellSolid(kernel, yUp(kernel.makeBox(40, 30, 40)), 2, "none");
    expect(() => shellShelfSolid(kernel, sealed, 1.5, 20, 2)).toThrow(SHELF_NEEDS_TOP_MESSAGE);
    const cone = shellSolid(kernel, yUp(kernel.makeCone(20, 12, 40)), 2, "top");
    expect(() => shellShelfSolid(kernel, cone, 1.5, 20, 2)).toThrow(SHELF_NOT_STRAIGHT_MESSAGE);
    expect(() => shellShelfSolid(kernel, hollowBox(2, 40), 5, 20, 2)).not.toThrow();
    const narrow = shellSolid(kernel, yUp(kernel.makeBox(10, 10, 40)), 2, "top");
    expect(() => shellShelfSolid(kernel, narrow, 5, 20, 2)).toThrow(SHELF_FAILED_MESSAGE);
  });

  it("lays several ledges up the wall, each one above a step narrower, for floors put in from the top (#2065)", () => {
    // 3 ledges in a box 70 high: tops at 12, 32 and 52 mm above the inside of the floor, 3, 2 and 1 mm wide.
    const hollow = hollowBox(2, 70);
    const before = kernel.getVolume(hollow);
    const levels = shellShelfLevels(3, 12, 3, 20);
    expect(levels).toEqual([{ width: 3, height: 12 }, { width: 2, height: 32 }, { width: 1, height: 52 }]);
    const shelves = shellShelvesSolid(kernel, hollow, levels, 2);
    expect(kernel.isValid(shelves)).toBe(true);
    expect(kernel.getSubShapes(shelves, "solid")).toHaveLength(1);
    const ring = (width: number) => (36 * 26 - (36 - 2 * width) * (26 - 2 * width)) * 2;
    expect(kernel.getVolume(shelves) - before).toBeCloseTo(ring(3) + ring(2) + ring(1), 1);
    // Each ledge's top where it should be: a plate lying on it touches it, one 0.1 mm lower cuts into it.
    for (const { height } of levels) {
      expect(kernel.getVolume(kernel.common(shelves, plateAt(height + 2)))).toBeLessThan(1e-6);
      expect(kernel.getVolume(kernel.common(shelves, plateAt(height + 1.9)))).toBeGreaterThan(1);
    }
    // A floor plate for the lowest ledge, 2.5 mm in from each wall, lies on that ledge yet passes both ledges above.
    const floor = (y: number) => kernel.translate(yUp(kernel.makeBox(31, 21, 1)), 4.5, y, -4.5);
    expect(kernel.getVolume(kernel.common(shelves, floor(13.9)))).toBeGreaterThan(1);
    expect(kernel.getVolume(kernel.common(shelves, floor(33.5)))).toBeLessThan(1e-6);
    expect(kernel.getVolume(kernel.common(shelves, floor(53.5)))).toBeLessThan(1e-6);
    // The body it was given is still there for the caller.
    expect(kernel.getVolume(hollow)).toBeCloseTo(before, 6);
  });

  it("says so when a ledge above does not fit below the rim", () => {
    expect(() => shellShelvesSolid(kernel, hollowBox(2, 40), shellShelfLevels(3, 12, 3, 20), 2)).toThrow(SHELF_HEIGHT_MESSAGE);
  });
});
