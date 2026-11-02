import { describe, expect, it } from "vitest";
import { gearPairFitPatches, gearPairKeepPatches, gearModuleOf, involuteGearPair, gearSizeForModule } from "@/lib/gearGeometry";

/** A spur gear of this module and these teeth, its centre at (x, z). */
function spur(id: string, module: number, teeth: number, x: number, z: number) {
  const { width, depth } = gearSizeForModule(module, { teeth, gearType: "spur", gearProfile: "involute", width: 1 });
  return { id, kind: "gear", gearType: "spur", gearProfile: "involute", teeth, width, depth, size: Math.max(width, depth), x, z } as const;
}

const apply = <T extends { id: string }>(shape: T, patch: { id: string; patch: Partial<T> } | null | undefined) => (patch && patch.id === shape.id ? { ...shape, ...patch.patch } : shape);

describe("keeping one gear of a pair (Discussion #1136)", () => {
  it("fits the other gear to the kept one's module and sets it at the centre distance, along the line between them", () => {
    const kept = spur("a", 2, 20, 0, 0);
    const other = spur("b", 3, 10, 30, 40);
    const result = gearPairKeepPatches(kept, other)!;
    expect(result.module).toBeCloseTo(2, 9);
    // module 2 x (20 + 10) / 2 = 30 mm, on the line towards (30, 40): 3-4-5, so (18, 24).
    expect(result.distance).toBeCloseTo(30, 9);
    expect(result.patch.id).toBe("b");
    expect(result.patch.patch.x).toBeCloseTo(18, 9);
    expect(result.patch.patch.z).toBeCloseTo(24, 9);
    const fitted = apply(other, result.patch);
    expect(gearModuleOf(fitted)).toBeCloseTo(2, 9);
    const pair = involuteGearPair(kept, fitted)!;
    expect(pair.distance).toBeCloseTo(pair.current, 9);
  });

  it("fits a third gear without undoing the first pair, which fitting both modules does", () => {
    const a = spur("a", 2, 20, 0, 0);
    const b0 = spur("b", 2, 12, 26, 0);
    const c0 = spur("c", 3, 16, 60, 10);
    // A meshes with B as it stands: 2 x (20 + 12) / 2 = 32 is not 26, so fit B to A first.
    const b = apply(b0, gearPairKeepPatches(a, b0)!.patch);
    expect(involuteGearPair(a, b)!.distance).toBeCloseTo(involuteGearPair(a, b)!.current, 9);
    // Keep B, fit C to it: A and B stay exactly as they are.
    const c = apply(c0, gearPairKeepPatches(b, c0)!.patch);
    expect(gearModuleOf(c)).toBeCloseTo(2, 9);
    expect(involuteGearPair(b, c)!.distance).toBeCloseTo(involuteGearPair(b, c)!.current, 9);
    expect(involuteGearPair(a, b)!.distance).toBeCloseTo(involuteGearPair(a, b)!.current, 9);
    // Fitting the modules of B and C (the old way) changes B and with it its pair with A.
    const [fittedB] = gearPairFitPatches(b, c0, 2.4);
    expect(gearModuleOf({ ...b, ...fittedB.patch })).not.toBeCloseTo(gearModuleOf(b), 3);
  });

  it("puts a gear whose centre sits on the kept one's aside along x, and gives a ring gear and its pinion their distance", () => {
    const kept = spur("a", 2, 20, 5, 5);
    const on = spur("b", 2, 10, 5, 5);
    const result = gearPairKeepPatches(kept, on)!;
    expect(result.patch.patch.x).toBeCloseTo(5 + 30, 9);
    expect(result.patch.patch.z).toBeCloseTo(5, 9);
    const ring = { id: "r", kind: "gear", gearType: "internal", gearProfile: "involute", teeth: 30, gearRim: 3, width: 71, depth: 71, size: 71, x: 0, z: 0 } as const;
    const pinion = spur("p", 3, 12, 40, 0);
    const fit = gearPairKeepPatches(ring, pinion)!;
    // Ring module 2: 2 x (30 - 12) / 2 = 18.
    expect(fit.distance).toBeCloseTo(18, 9);
    expect(fit.patch.patch.x).toBeCloseTo(18, 9);
  });

  it("is null where the two do not make a pair", () => {
    const gear = spur("a", 2, 20, 0, 0);
    expect(gearPairKeepPatches(gear, { ...spur("b", 2, 20, 30, 0), gearType: "rack" })).toBeNull();
    expect(gearPairKeepPatches(gear, { ...spur("b", 2, 20, 30, 0), gearProfile: "round" })).toBeNull();
  });
});
