import { beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { OcctKernel, type ShapeHandle } from "occt-wasm";
import { shellSolid } from "@/lib/cadShell";
import { shellGridSolid } from "@/lib/cadShellGrid";
import { shellStackSolid } from "@/lib/cadShellStack";
import { SHELF_FAILED_MESSAGE, SHELF_HEIGHT_MESSAGE, SHELF_NEEDS_TOP_MESSAGE, SHELF_NOT_STRAIGHT_MESSAGE, shellShelfSolid } from "@/lib/cadShellShelf";

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
});
