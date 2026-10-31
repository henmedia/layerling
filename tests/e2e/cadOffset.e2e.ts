import { beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { OcctKernel } from "occt-wasm";
import { CANNOT_OFFSET_MESSAGE, offsetSolid, offsetSolidSideways } from "@/lib/cadShell";

// A body grown or shrunk along its faces, for the clearance of a press fit (#919).
describe("offsetting a solid with the real OCCT kernel", () => {
  let kernel: OcctKernel;

  beforeAll(async () => {
    const wasm = join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm");
    kernel = await OcctKernel.init({ wasm });
  });

  it("grows a box by the distance on every side, with sharp corners", () => {
    const box = kernel.makeBox(40, 30, 20);
    const result = offsetSolid(kernel, box, 0.2, false, "sharp");
    expect(kernel.isValid(result)).toBe(true);
    expect(kernel.getVolume(result)).toBeCloseTo(40.4 * 30.4 * 20.4, 3);
    const bounds = kernel.getBoundingBox(result, false);
    expect(bounds.xmax - bounds.xmin).toBeCloseTo(40.4, 4);
    expect(bounds.ymax - bounds.ymin).toBeCloseTo(30.4, 4);
    expect(bounds.zmax - bounds.zmin).toBeCloseTo(20.4, 4);
    kernel.release(result);
    kernel.release(box);
  });

  it("rounds the corners of the grown box when asked", () => {
    const box = kernel.makeBox(40, 30, 20);
    const sharp = offsetSolid(kernel, box, 2, false, "sharp");
    const round = offsetSolid(kernel, box, 2, false, "round");
    expect(kernel.getVolume(round)).toBeLessThan(kernel.getVolume(sharp));
    expect(kernel.getVolume(round)).toBeGreaterThan(40 * 30 * 20);
    [sharp, round, box].forEach((handle) => kernel.release(handle));
  });

  it("shrinks a box, and keeps the hole of a plate with a hole", () => {
    const box = kernel.makeBox(40, 30, 20);
    const small = offsetSolid(kernel, box, 1, true, "sharp");
    expect(kernel.getVolume(small)).toBeCloseTo(38 * 28 * 18, 3);
    const pin = kernel.makeCylinder(5, 20);
    const plate = kernel.cut(kernel.makeBox(40, 30, 20), kernel.translate(pin, 20, 15, 0));
    const grown = offsetSolid(kernel, plate, 0.5, false, "sharp");
    // The hole shrinks by the distance all round: the pin that fits it is a smaller one.
    expect(kernel.getVolume(grown)).toBeGreaterThan(kernel.getVolume(plate));
    expect(kernel.isValid(grown)).toBe(true);
    [small, grown, box, plate, pin].forEach((handle) => kernel.release(handle));
  });

  // Sideways only (#1057): the border grows all round, the height stays.
  it("grows a box sideways only, keeping its height", () => {
    const box = kernel.makeBox(40, 20, 30);
    const sharp = offsetSolidSideways(kernel, box, 2, false, "sharp");
    expect(kernel.isValid(sharp)).toBe(true);
    expect(kernel.getVolume(sharp)).toBeCloseTo(44 * 20 * 34, 2);
    const bounds = kernel.getBoundingBox(sharp, false);
    expect(bounds.ymin).toBeCloseTo(0, 4);
    expect(bounds.ymax).toBeCloseTo(20, 4);
    const round = offsetSolidSideways(kernel, box, 2, false, "round");
    // Round corners: the four upright corners become quarter cylinders.
    expect(kernel.getVolume(round)).toBeCloseTo((44 * 34 - (16 - 4 * Math.PI)) * 20, 1);
    expect(kernel.getBoundingBox(round, false).ymax).toBeCloseTo(20, 4);
    [sharp, round, box].forEach((handle) => kernel.release(handle));
  });

  it("keeps every step of a stepped body at its height", () => {
    const low = kernel.makeBox(40, 10, 20);
    const high = kernel.makeBox(20, 20, 20);
    const stepped = kernel.fuse(low, high);
    const grown = offsetSolidSideways(kernel, stepped, 1, false, "sharp");
    expect(kernel.isValid(grown)).toBe(true);
    // Lower step 42 x 22 x 10, upper step 22 x 22 x 10 on top of it.
    expect(kernel.getVolume(grown)).toBeCloseTo(42 * 22 * 10 + 22 * 22 * 10, 2);
    [grown, stepped, high, low].forEach((handle) => kernel.release(handle));
  });

  it("shrinks sideways only, and grows a round body without making it taller", () => {
    const box = kernel.makeBox(40, 20, 30);
    const small = offsetSolidSideways(kernel, box, 1, true, "sharp");
    expect(kernel.getVolume(small)).toBeCloseTo(38 * 20 * 28, 2);
    expect(kernel.getBoundingBox(small, false).ymax - kernel.getBoundingBox(small, false).ymin).toBeCloseTo(20, 4);
    const disc = kernel.makeCylinder(10, 5);
    const lying = kernel.rotate(disc, { point: { x: 0, y: 0, z: 0 }, direction: { x: 1, y: 0, z: 0 } }, -Math.PI / 2);
    const wider = offsetSolidSideways(kernel, lying, 2, false, "round");
    expect(kernel.getVolume(wider)).toBeCloseTo(Math.PI * 12 * 12 * 5, 0);
    [small, box, disc, lying, wider].forEach((handle) => kernel.release(handle));
  });

  it("refuses a shrink that eats the whole body", () => {
    const box = kernel.makeBox(4, 4, 4);
    expect(() => offsetSolid(kernel, box, 5, true)).toThrow(CANNOT_OFFSET_MESSAGE);
    kernel.release(box);
  });
});
