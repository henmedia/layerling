import { beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { OcctKernel } from "occt-wasm";
import { offsetTorusRadii, torusSolid } from "@/lib/cadTorus";

/** The volume of a torus about a ring of R with a tube of r, only the part outside the axis when r > R. */
function torusVolume(R: number, r: number) {
  if (R >= r) return 2 * Math.PI * Math.PI * R * r * r;
  let sum = 0;
  const n = 20000;
  for (let i = 0; i < n; i += 1) {
    const y = -r + ((i + 0.5) / n) * 2 * r;
    const half = Math.sqrt(r * r - y * y);
    const outer = R + half;
    const inner = Math.max(0, R - half);
    sum += Math.PI * (outer * outer - inner * inner) * (2 * r / n);
  }
  return sum;
}

// #2187: a torus whose tube is wider than its ring, and the offset of a torus past that point.
describe("spindle torus with the real OCCT kernel", () => {
  let kernel: OcctKernel;

  beforeAll(async () => {
    const wasm = join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm");
    kernel = await OcctKernel.init({ wasm });
  });

  it("builds a ring torus as before, about the y axis", () => {
    const solid = torusSolid(kernel, 25, 10);
    expect(kernel.isValid(solid)).toBe(true);
    expect(kernel.getVolume(solid)).toBeCloseTo(torusVolume(25, 10), 0);
    const bounds = kernel.getBoundingBox(solid, false);
    expect(bounds.ymax - bounds.ymin).toBeCloseTo(20, 3);
    expect(bounds.xmax - bounds.xmin).toBeCloseTo(70, 3);
    kernel.release(solid);
  });

  it("builds a tube wider than the ring as a valid closed spindle torus", () => {
    const solid = torusSolid(kernel, 15, 35);
    expect(kernel.isSolid(solid)).toBe(true);
    expect(kernel.isValid(solid)).toBe(true);
    expect(kernel.getVolume(solid) / torusVolume(15, 35)).toBeCloseTo(1, 3);
    const bounds = kernel.getBoundingBox(solid, false);
    expect(bounds.xmax - bounds.xmin).toBeCloseTo(100, 3);
    expect(bounds.ymax - bounds.ymin).toBeCloseTo(70, 3);
    kernel.release(solid);
  });

  it("makes a ring of nothing a sphere", () => {
    const solid = torusSolid(kernel, 0, 10);
    expect(kernel.getVolume(solid)).toBeCloseTo((4 / 3) * Math.PI * 1000, 1);
    kernel.release(solid);
  });

  it("grows the torus from the report past the closed hole: tube 25 about a ring of 25, by 2 mm", () => {
    const radii = offsetTorusRadii(25, 25, 2, false)!;
    expect(radii).toEqual({ majorRadius: 25, minorRadius: 27 });
    const grown = torusSolid(kernel, radii.majorRadius, radii.minorRadius);
    expect(kernel.isValid(grown)).toBe(true);
    const bounds = kernel.getBoundingBox(grown, false);
    expect(bounds.xmax - bounds.xmin).toBeCloseTo(104, 3);
    expect(bounds.ymax - bounds.ymin).toBeCloseTo(54, 3);
    expect(kernel.getVolume(grown) / torusVolume(25, 27)).toBeCloseTo(1, 3);
    kernel.release(grown);
  });

  it("shrinks a torus by the distance, and refuses a shrink that leaves no tube", () => {
    expect(offsetTorusRadii(25, 10, 2, true)).toEqual({ majorRadius: 25, minorRadius: 8 });
    expect(offsetTorusRadii(25, 10, 10, true)).toBeNull();
    // On a torus placed at twice its size, the distance in the design is half as much on the torus itself.
    expect(offsetTorusRadii(25, 10, 2, false, 2)).toEqual({ majorRadius: 25, minorRadius: 11 });
  });
});
