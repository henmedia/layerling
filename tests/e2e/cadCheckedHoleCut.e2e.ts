import { beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { OcctKernel } from "occt-wasm";
import { checkedHoleCut, cutLooksRight } from "@/lib/cadFuzzyCut";

/*
 * Discussion #1523: a roller-skate plate with two nearly identical tilted holes in one spot. The second cut left the body
 * invalid, and a later hole cut into it came back taller than the plate, the hole standing on it as a solid cylinder. A hole
 * cut is now checked: valid, no larger than the body, and lighter by no more than the hole.
 */
describe("a hole cut that is checked (#1523)", () => {
  let cad: OcctKernel;
  const valid = (kernel: OcctKernel, shape: Parameters<OcctKernel["isValid"]>[0]) => kernel.isValid(shape);

  beforeAll(async () => {
    const wasm = join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm");
    cad = await OcctKernel.init({ wasm });
  });

  it("cuts a hole through a body as before", () => {
    const body = cad.makeBox(40, 30, 20);
    const hole = cad.translate(cad.makeCylinder(5, 50), 20, 15, -10);
    const cut = checkedHoleCut(cad, body, hole, valid);
    expect(cad.getVolume(cut)).toBeCloseTo(40 * 30 * 20 - Math.PI * 25 * 20, 0);
    const box = cad.getBoundingBox(cut);
    expect(box.zmax).toBeCloseTo(20, 3);
  });

  it("refuses a result that grows past the body, as the hole standing on the plate did", () => {
    const body = cad.makeBox(40, 30, 20);
    const hole = cad.translate(cad.makeCylinder(5, 50), 20, 15, -10);
    const grown = cad.fuse(body, hole);
    expect(cutLooksRight(cad, body, hole, grown, valid)).toBe(false);
  });

  it("refuses a result that lost more than the hole holds", () => {
    const body = cad.makeBox(40, 30, 20);
    const hole = cad.translate(cad.makeCylinder(5, 50), 20, 15, -10);
    const halved = cad.makeBox(40, 30, 10);
    expect(cutLooksRight(cad, body, hole, halved, valid)).toBe(false);
    expect(cutLooksRight(cad, body, hole, cad.cut(body, hole), valid)).toBe(true);
  });
});
