import { describe, expect, it } from "vitest";
import { sceneDimensionAxis, sizeDimensionAxis } from "@/lib/dimensionAxisColors";
import { moveDimensionAxisName } from "@/lib/moveDimensionLines";

describe("dimension boxes in axis colours (#1279)", () => {
  it("gives the size boxes the axis of their handles", () => {
    expect(sizeDimensionAxis("width")).toBe("x");
    expect(sizeDimensionAxis("depth")).toBe("y");
    expect(sizeDimensionAxis("height")).toBe("z");
    expect(sizeDimensionAxis("elevation")).toBe("z");
  });

  it("gives the move and origin distances the axis the user reads beside them", () => {
    for (const axis of ["x", "z", "lift"] as const) {
      expect(sceneDimensionAxis(axis).toUpperCase()).toBe(moveDimensionAxisName(axis));
    }
  });
});
