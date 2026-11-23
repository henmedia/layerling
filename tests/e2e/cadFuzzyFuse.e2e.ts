import { beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { OcctKernel, type ShapeHandle } from "occt-wasm";
import { fuzzyFuse } from "@/lib/cadFuzzyCut";

/*
 * Issue #1954: a hook grouped with a plate stood 0.00024 mm off it. The plain fuse kept two solids, and a fillet along the
 * joint rounded the hook's own bottom edge inward instead of filling the corner. Parts within a thousandth of a millimetre
 * are now joined, as a hole cuts with that tolerance.
 */
describe("joining the parts of a group (#1954)", () => {
  let cad: OcctKernel;
  const valid = (kernel: OcctKernel, shape: ShapeHandle) => kernel.isValid(shape);

  beforeAll(async () => {
    const wasm = join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm");
    cad = await OcctKernel.init({ wasm });
  });

  const plate = () => cad.makeBox(40, 30, 4);
  const post = (gap: number) => cad.translate(cad.makeBox(10, 10, 20), 15, 10, 4 + gap);
  const plateVolume = 40 * 30 * 4;
  const postVolume = 10 * 10 * 20;

  /** The edges where the post meets the plate: in the plane of the plate's top, inside the post's footprint. */
  function jointEdges(body: ShapeHandle) {
    return cad.getSubShapes(body, "edge").filter((edge) => {
      const box = cad.getBoundingBox(edge);
      return Math.abs(box.zmin - 4) < 0.01 && Math.abs(box.zmax - 4) < 0.01 && box.xmin > 14.9 && box.xmax < 25.1 && box.ymin > 9.9 && box.ymax < 20.1;
    });
  }

  it("joins a post standing a quarter of a thousandth off the plate into one solid", () => {
    const joined = fuzzyFuse(cad, plate(), post(0.00024), valid);
    expect(cad.getSubShapes(joined, "solid")).toHaveLength(1);
    expect(cad.isValid(joined)).toBe(true);
    expect(cad.getVolume(joined)).toBeCloseTo(plateVolume + postVolume, 1);
    // The plain fuse keeps them apart, which is what the fillet ran into.
    expect(cad.getSubShapes(cad.fuse(plate(), post(0.00024)), "solid")).toHaveLength(2);
  });

  it("fills the corner along the joint, where the fillet rounded the post's own edge before", () => {
    // As the edge tool tidies a group's body before treating it (reconstructParts).
    const joined = cad.unifySameDomain(cad.simplify(cad.getSubShapes(fuzzyFuse(cad, plate(), post(0.00024), valid), "solid")[0]));
    const edges = jointEdges(joined);
    expect(edges).toHaveLength(4);
    const filleted = cad.fillet(joined, edges, 1);
    // A fillet in an inside corner adds material; one on the post's own bottom edges would take it away.
    expect(cad.getVolume(filleted)).toBeGreaterThan(plateVolume + postVolume);
  });

  it("leaves parts a hundredth of a millimetre apart as two bodies", () => {
    const apart = fuzzyFuse(cad, plate(), post(0.01), valid);
    expect(cad.getSubShapes(apart, "solid")).toHaveLength(2);
  });

  it("joins overlapping parts as the plain fuse does", () => {
    const overlapping = fuzzyFuse(cad, plate(), post(-1), valid);
    expect(cad.getSubShapes(overlapping, "solid")).toHaveLength(1);
    expect(cad.getVolume(overlapping)).toBeCloseTo(cad.getVolume(cad.fuse(plate(), post(-1))), 3);
  });
});
