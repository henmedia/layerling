import { describe, expect, it } from "vitest";
import {
  DINGUIN_INSERT_SIZES,
  checkDinguinThreadInsert,
  customDinguinInsert,
} from "../../apps/web/src/lib/dinguinThreadInsertSafety";

describe("threaded insert safety gate", () => {
  const m3 = DINGUIN_INSERT_SIZES.find((spec) => spec.name === "M3")!;

  it("allows a placement at the exact depth and edge limits", () => {
    const result = checkDinguinThreadInsert(m3, {
      edgeDistance: m3.d3 / 2 + m3.W,
      materialDepth: m3.L,
    });
    expect(result.allowed).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it("blocks insufficient edge clearance", () => {
    const result = checkDinguinThreadInsert(m3, {
      edgeDistance: m3.d3 / 2 + m3.W - 0.1,
      materialDepth: m3.L,
    });
    expect(result.allowed).toBe(false);
    expect(result.warnings.some((message) => message.includes("RANDABSTAND"))).toBe(true);
  });

  it("blocks insufficient material depth", () => {
    const result = checkDinguinThreadInsert(m3, {
      edgeDistance: m3.d3 / 2 + m3.W,
      materialDepth: m3.L - 0.1,
    });
    expect(result.allowed).toBe(false);
    expect(result.warnings.some((message) => message.includes("MATERIALTIEFE"))).toBe(true);
  });

  it("fails closed for invalid numbers", () => {
    const result = checkDinguinThreadInsert(m3, {
      edgeDistance: Number.NaN,
      materialDepth: m3.L,
    });
    expect(result.allowed).toBe(false);
  });

  it("rounds up the recommended wall thickness for custom sizes", () => {
    expect(customDinguinInsert(7, 8).W).toBe(2.9);
  });
});
