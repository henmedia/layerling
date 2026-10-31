import { describe, expect, it } from "vitest";
import { isSameSize, resizedCopy, SAME_SIZE, shapeSize, sizeFactorsBetween } from "@/lib/duplicateResize";
import type { WorkplaneShape } from "@/types/layerling";

// Discussion #1072: Duplicate repeats a resize of the copy, as Tinkercad does: each further copy grows by the same factor.
const disc = { id: "d", name: "Disc", kind: "cylinder", color: "#d41721", x: 5, z: -3, elevation: 2, rotation: 0, width: 10, depth: 10, height: 2, size: 10 } as unknown as WorkplaneShape;

describe("Duplicate repeats a resize (#1072)", () => {
  it("measures the resize as factors per axis", () => {
    const factors = sizeFactorsBetween(shapeSize(disc), shapeSize({ ...disc, width: 15, depth: 15, size: 15, height: 3 }));
    expect(factors.width).toBeCloseTo(1.5, 9);
    expect(factors.depth).toBeCloseTo(1.5, 9);
    expect(factors.height).toBeCloseTo(1.5, 9);
    expect(isSameSize(factors)).toBe(false);
    expect(isSameSize(sizeFactorsBetween(shapeSize(disc), shapeSize({ ...disc, x: 40 })))).toBe(true);
  });

  it("grows each copy by the factor again, keeping its middle and its bottom", () => {
    const factors = { width: 1.5, depth: 1.5, height: 1 };
    const first = resizedCopy(disc, factors);
    const second = resizedCopy(first, factors);
    expect(first.width).toBeCloseTo(15, 9);
    expect(second.width).toBeCloseTo(22.5, 9);
    expect(second.depth).toBeCloseTo(22.5, 9);
    expect(second.height).toBeCloseTo(2, 9);
    expect([second.x, second.z, second.elevation]).toEqual([5, -3, 2]);
  });

  it("leaves a copy that was only moved as it is", () => {
    expect(resizedCopy(disc, SAME_SIZE)).toBe(disc);
  });
});
