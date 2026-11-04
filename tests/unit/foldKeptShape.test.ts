import { describe, expect, it } from "vitest";
import { foldKeptShape } from "@/lib/editorBooleans";

// Discussion #1272: folding thin walls must not change a solid's shape.
describe("foldKeptShape", () => {
  it("takes a fold of thin steps: next to no volume and surface move", () => {
    // A 0.001 mm step round a 100 x 100 mm hole on a plate: about 10 mm³ against a large part, and its walls.
    expect(foldKeptShape({ volume: 200000, area: 60000 }, { volume: 200010, area: 59999.2 })).toBe(true);
    expect(foldKeptShape({ volume: 500, area: 600 }, { volume: 500.0004, area: 599.99 })).toBe(true);
  });

  it("refuses the fold of the housing in #1272: a corner folded into one slanted face", () => {
    expect(foldKeptShape({ volume: 52613.313, area: 57555.2 }, { volume: 52562.438, area: 57184.0 })).toBe(false);
  });

  it("refuses a fold that keeps the volume but changes the surface, or the other way round", () => {
    expect(foldKeptShape({ volume: 10000, area: 5000 }, { volume: 10000, area: 4980 })).toBe(false);
    expect(foldKeptShape({ volume: 10000, area: 5000 }, { volume: 9990, area: 5000 })).toBe(false);
  });
});
