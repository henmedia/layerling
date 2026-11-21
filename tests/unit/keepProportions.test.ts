import { describe, expect, it } from "vitest";
import { keepsProportionsForUpdate, keepsProportionsOnAxis } from "@/lib/keepProportions";

describe("keep proportions", () => {
  it("keeps a text's height out of it, the height being the thickness of the letters (#724)", () => {
    expect(keepsProportionsOnAxis({ kind: "text" }, "height")).toBe(false);
    expect(keepsProportionsOnAxis({ kind: "text" }, "width")).toBe(true);
    expect(keepsProportionsOnAxis({ kind: "text" }, "depth")).toBe(true);
  });

  it("keeps the other shapes as they were", () => {
    for (const kind of ["box", "cylinder", "gear"] as const) {
      expect(keepsProportionsOnAxis({ kind }, "height")).toBe(true);
    }
    expect(keepsProportionsOnAxis({ kind: "box" }, undefined)).toBe(false);
  });
});

describe("an angle typed with keep proportions on (#1763)", () => {
  it("changes only the size the angle is reached through", () => {
    expect(keepsProportionsForUpdate({ kind: "wedge" }, { resizeAxis: "height", angle: true })).toBe(false);
    expect(keepsProportionsForUpdate({ kind: "teardrop" }, { resizeAxis: "height", angle: true })).toBe(false);
  });

  it("still scales the other sizes along for a size typed in", () => {
    expect(keepsProportionsForUpdate({ kind: "wedge" }, { resizeAxis: "height" })).toBe(true);
    expect(keepsProportionsForUpdate({ kind: "text" }, { resizeAxis: "height" })).toBe(false);
  });
});
