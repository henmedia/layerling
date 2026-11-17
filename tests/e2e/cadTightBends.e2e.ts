import { beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { OcctKernel } from "occt-wasm";
import { tightestOutsideBend } from "@/lib/cadTightBends";

describe("a refused fillet names the tightest outside bend with the real OCCT kernel (#1473)", () => {
  let kernel: OcctKernel;

  beforeAll(async () => {
    const wasm = join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm");
    kernel = await OcctKernel.init({ wasm });
  });

  const curvedEdges = (solid: ReturnType<OcctKernel["makeBox"]>) =>
    kernel.getSubShapes(solid, "edge").map((edge, id) => ({ id, edge })).filter((entry) => kernel.curveType(entry.edge) !== "line");

  it("measures the rim of a thin pin, which a 1 mm fillet cannot follow", () => {
    const pin = kernel.makeCylinder(0.5, 2);
    const rims = curvedEdges(pin);
    expect(() => kernel.fillet(pin, rims, 1)).toThrow();
    const bend = tightestOutsideBend(kernel, pin, rims, 1, performance.now() + 5000);
    expect(bend?.radius).toBeCloseTo(0.5, 2);
    expect(bend?.edgeIds.sort()).toEqual(rims.map((entry) => entry.id).sort());
  });

  it("does not blame the rim of a hole: it bends the other way", () => {
    const block = kernel.makeBox(10, 10, 2);
    const holed = kernel.cut(block, kernel.translate(kernel.makeCylinder(0.5, 4), 5, 5, -1));
    expect(tightestOutsideBend(kernel, holed, curvedEdges(holed), 1, performance.now() + 5000)).toBeNull();
  });

  it("says nothing when the bend is wider than the radius", () => {
    const pin = kernel.makeCylinder(3, 2);
    expect(tightestOutsideBend(kernel, pin, curvedEdges(pin), 1, performance.now() + 5000)).toBeNull();
  });
});
