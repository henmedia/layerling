import { describe, expect, it } from "vitest";
import { alwaysVisibleDimensionKeysFor } from "@/components/workplane/viewportTransformOverlays";

const keys = { width: "right-mid", depth: "near-mid", height: "top-height", lift: "lift-shape" };

describe("the sizes a lone selection shows", () => {
  it("adds the height above the workplane when the body does not stand on it (#979)", () => {
    expect(alwaysVisibleDimensionKeysFor(false, 0, keys)).toEqual(["right-mid", "near-mid", "top-height"]);
    expect(alwaysVisibleDimensionKeysFor(false, 10, keys)).toEqual(["right-mid", "near-mid", "top-height", "lift-shape"]);
    // Below the workplane too, and a round body has no depth of its own.
    expect(alwaysVisibleDimensionKeysFor(true, -2.5, keys)).toEqual(["right-mid", "top-height", "lift-shape"]);
    // A rounding error on the workplane is no height.
    expect(alwaysVisibleDimensionKeysFor(false, 0.001, keys)).toEqual(["right-mid", "near-mid", "top-height"]);
  });
});
