import { beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { OcctKernel } from "occt-wasm";
import { CONCAVE_FILLET_STRAIGHT_MESSAGE, concaveFilletSolid } from "@/lib/cadConcaveFillet";

describe("a concave fillet scoops an edge out with the real OCCT kernel", () => {
  let kernel: OcctKernel;

  beforeAll(async () => {
    const wasm = join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm");
    kernel = await OcctKernel.init({ wasm });
  });

  function edgesAlong(solid: ReturnType<OcctKernel["makeBox"]>, axis: 0 | 1 | 2) {
    return kernel.getSubShapes(solid, "edge").filter((edge) => {
      const b = kernel.getBoundingBox(edge, false);
      const span = [b.xmax - b.xmin, b.ymax - b.ymin, b.zmax - b.zmin];
      return span[axis] > 1 && span[(axis + 1) % 3] < 1e-6 && span[(axis + 2) % 3] < 1e-6;
    });
  }

  it("cuts a quarter-round out of each picked edge of a box, whatever way the edge runs", () => {
    for (const axis of [0, 1, 2] as const) {
      const solid = kernel.makeBox(40, 30, 20);
      const edges = edgesAlong(solid, axis);
      expect(edges).toHaveLength(4);
      const result = concaveFilletSolid(kernel, solid, [edges[0]], 5);
      const length = [40, 30, 20][axis];
      expect(kernel.isValid(result)).toBe(true);
      expect(kernel.getSubShapes(result, "solid")).toHaveLength(1);
      expect(kernel.getVolume(solid) - kernel.getVolume(result)).toBeCloseTo(length * Math.PI * 25 / 4, 1);
    }
  });

  it("scoops all four corners of one direction", () => {
    const solid = kernel.makeBox(40, 30, 20);
    const result = concaveFilletSolid(kernel, solid, edgesAlong(solid, 1), 4);
    expect(kernel.isValid(result)).toBe(true);
    expect(kernel.getVolume(solid) - kernel.getVolume(result)).toBeCloseTo(4 * 30 * Math.PI * 16 / 4, 1);
  });

  it("refuses a curved edge", () => {
    const cylinder = kernel.makeCylinder(10, 20);
    const curved = kernel.getSubShapes(cylinder, "edge").find((edge) => kernel.curveType(edge) !== "line");
    expect(curved).toBeDefined();
    expect(() => concaveFilletSolid(kernel, cylinder, [curved!], 2)).toThrow(CONCAVE_FILLET_STRAIGHT_MESSAGE);
  });
});
