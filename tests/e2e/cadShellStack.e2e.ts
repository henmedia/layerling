import { beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { OcctKernel, type ShapeHandle } from "occt-wasm";
import { shellSolid } from "@/lib/cadShell";
import { STACK_NEEDS_TOP_MESSAGE, STACK_NOT_STRAIGHT_MESSAGE, STACK_TOO_LOW_MESSAGE, STACK_WALL_THIN_MESSAGE, shellStackSolid } from "@/lib/cadShellStack";

const ROTATE_Z_TO_Y: number[] = [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0];

describe("stacking a hollowed box with the real OCCT kernel", () => {
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

  /** 40 x 30 across, 20 high, hollowed to a 2 mm wall with the top open. */
  function hollowBox(wall = 2, height = 20) {
    const solid = yUp(kernel.makeBox(40, 30, height));
    const hollow = shellSolid(kernel, solid, wall, "top");
    kernel.release(solid);
    return hollow;
  }

  it("raises the outer half of the wall by the collar and cuts a groove under it", () => {
    const hollow = hollowBox();
    const stacked = shellStackSolid(kernel, hollow, 3, 2);
    expect(kernel.isValid(stacked)).toBe(true);
    const bounds = kernel.getBoundingBox(stacked, false);
    expect(bounds.ymax - bounds.ymin).toBeCloseTo(23, 3);
    expect(bounds.xmax - bounds.xmin).toBeCloseTo(40, 3);
    // The collar is 0.9 mm wide (half the wall less half the 0.2 mm play) and 3 high; the groove is 1.1 mm wide and 4 deep.
    const shell = 40 * 30 * 20 - 36 * 26 * 18;
    const collar = (40 * 30 - 38.2 * 28.2) * 3;
    const groove = (40 * 30 - 37.8 * 27.8) * 4;
    expect(kernel.getVolume(stacked)).toBeCloseTo(shell + collar - groove, 1);
    expect(kernel.getSubShapes(stacked, "solid")).toHaveLength(1);
  });

  it("makes a box that stands on the next without the two meeting", () => {
    const hollow = hollowBox();
    const stacked = shellStackSolid(kernel, hollow, 3, 2);
    // The box above rests on the rim of the one below: 20 higher.
    const above = kernel.translate(stacked, 0, 20, 0);
    expect(kernel.getVolume(kernel.common(stacked, above))).toBeLessThan(1e-6);
    // Without the groove the collar would stand in the wall of the box above.
    const plain = kernel.translate(hollow, 0, 20, 0);
    expect(kernel.getVolume(kernel.common(stacked, plain))).toBeGreaterThan(100);
  });

  it("says why it cannot", () => {
    expect(() => shellStackSolid(kernel, hollowBox(1), 3, 1)).toThrow(STACK_WALL_THIN_MESSAGE);
    expect(() => shellStackSolid(kernel, hollowBox(2, 8), 3, 2)).toThrow(STACK_TOO_LOW_MESSAGE);
    const sealed = shellSolid(kernel, yUp(kernel.makeBox(40, 30, 20)), 2, "none");
    expect(() => shellStackSolid(kernel, sealed, 3, 2)).toThrow(STACK_NEEDS_TOP_MESSAGE);
    // A cone is wider at the bottom than at the top.
    const cone = shellSolid(kernel, yUp(kernel.makeCone(20, 12, 25)), 2, "top");
    expect(() => shellStackSolid(kernel, cone, 3, 2)).toThrow(STACK_NOT_STRAIGHT_MESSAGE);
  });

  it("stacks a round box as well", () => {
    const cylinder = shellSolid(kernel, yUp(kernel.makeCylinder(25, 20)), 2, "top");
    const stacked = shellStackSolid(kernel, cylinder, 3, 2);
    expect(kernel.isValid(stacked)).toBe(true);
    const above = kernel.translate(stacked, 0, 20, 0);
    expect(kernel.getVolume(kernel.common(stacked, above))).toBeLessThan(1e-6);
  });
});
