import { describe, expect, it } from "vitest";
import { clearDesignOpening, forgetDesignOpening, markDesignOpening, OPENING_DESIGN_KEY, takeUnfinishedOpening } from "@/lib/openingDesignGuard";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
    has: (key: string) => values.has(key),
  };
}

describe("a design that crashed the page while opening is not reopened by a reload (#1157)", () => {
  it("reports an opening that never finished once, so the next try opens as usual", () => {
    const storage = memoryStorage();
    markDesignOpening(storage, "design-1");
    expect(takeUnfinishedOpening(storage, "design-2")).toBe(false);
    expect(takeUnfinishedOpening(storage, "design-1")).toBe(true);
    expect(takeUnfinishedOpening(storage, "design-1")).toBe(false);
  });

  it("forgets the mark once the design has opened, but only its own", () => {
    const storage = memoryStorage();
    markDesignOpening(storage, "design-1");
    clearDesignOpening(storage, "design-2");
    expect(storage.has(OPENING_DESIGN_KEY)).toBe(true);
    clearDesignOpening(storage, "design-1");
    expect(takeUnfinishedOpening(storage, "design-1")).toBe(false);
  });

  it("forgets the mark when the page is left in the usual way", () => {
    const storage = memoryStorage();
    markDesignOpening(storage, "design-1");
    forgetDesignOpening(storage);
    expect(takeUnfinishedOpening(storage, "design-1")).toBe(false);
  });

  it("works without storage and with a damaged mark", () => {
    expect(() => markDesignOpening(null, "design-1")).not.toThrow();
    expect(takeUnfinishedOpening(undefined, "design-1")).toBe(false);
    const storage = memoryStorage();
    storage.setItem(OPENING_DESIGN_KEY, "{not json");
    expect(takeUnfinishedOpening(storage, "design-1")).toBe(false);
    const throwing = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); }, removeItem: () => { throw new Error("blocked"); } };
    expect(() => markDesignOpening(throwing, "design-1")).not.toThrow();
    expect(takeUnfinishedOpening(throwing, "design-1")).toBe(false);
  });
});
