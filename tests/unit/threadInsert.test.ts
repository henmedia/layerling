import { describe, expect, it } from "vitest";
import { THREAD_INSERT_SIZES, checkThreadInsert, customThreadInsert, threadInsertSpec } from "../../apps/web/src/lib/threadInsert";

describe("the thread insert check (#1828)", () => {
  const m3 = THREAD_INSERT_SIZES.find((spec) => spec.name === "M3")!;

  it("allows a hole at the exact wall and depth", () => {
    const result = checkThreadInsert(m3, { edgeDistance: m3.d3 / 2 + m3.W, materialDepth: m3.L });
    expect(result.allowed).toBe(true);
    expect(result.wallShort).toBe(false);
    expect(result.depthShort).toBe(false);
  });

  it("blocks a wall that is too thin and says how thin it is", () => {
    const result = checkThreadInsert(m3, { edgeDistance: m3.d3 / 2 + m3.W - 0.1, materialDepth: m3.L });
    expect(result.allowed).toBe(false);
    expect(result.wallShort).toBe(true);
    expect(result.depthShort).toBe(false);
    expect(result.wall).toBeCloseTo(m3.W - 0.1, 6);
    expect(result.requiredWall).toBe(m3.W);
  });

  it("blocks a part that is not deep enough", () => {
    const result = checkThreadInsert(m3, { edgeDistance: m3.d3 / 2 + m3.W, materialDepth: m3.L - 0.1 });
    expect(result.allowed).toBe(false);
    expect(result.depthShort).toBe(true);
    expect(result.wallShort).toBe(false);
  });

  it("blocks when both fall short, and when the numbers are no numbers", () => {
    const both = checkThreadInsert(m3, { edgeDistance: 0.5, materialDepth: 1 });
    expect(both.wallShort && both.depthShort).toBe(true);
    const invalid = checkThreadInsert(m3, { edgeDistance: Number.NaN, materialDepth: m3.L });
    expect(invalid.allowed).toBe(false);
    expect(invalid.invalid).toBe(true);
  });

  it("rounds the wall of a size of its own up to 0.1 mm", () => {
    expect(customThreadInsert(7, 8).W).toBe(2.9);
  });

  it("takes a size from the list or from the typed numbers, with a comma too", () => {
    expect(threadInsertSpec("M4", "", "")?.d3).toBe(5.6);
    expect(threadInsertSpec("custom", "7,5", "9")).toMatchObject({ d3: 7.5, L: 9 });
    expect(threadInsertSpec("custom", "", "9")).toBeNull();
    expect(threadInsertSpec("custom", "0", "9")).toBeNull();
    expect(threadInsertSpec("nope", "", "")).toBeNull();
  });
});
