import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { forgetViewBarsCache, normalizeViewBars, readViewBars, VIEW_BARS_STORAGE_KEY, writeViewBars } from "@/lib/viewBars";

describe("the bars over the 3D view (Discussion #2073)", () => {
  const stored = new Map<string, string>();
  beforeEach(() => {
    stored.clear();
    forgetViewBarsCache();
    vi.stubGlobal("window", {
      localStorage: { getItem: (key: string) => stored.get(key) ?? null, setItem: (key: string, value: string) => stored.set(key, value) },
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("is as it always was until changed", () => {
    expect(readViewBars()).toEqual({ viewBar: true, measureBar: false });
  });

  it("takes only yes and no", () => {
    expect(normalizeViewBars({ viewBar: "no", measureBar: 1 })).toEqual({ viewBar: true, measureBar: false });
    expect(normalizeViewBars([])).toEqual({ viewBar: true, measureBar: false });
  });

  it("keeps the choice in the browser", () => {
    writeViewBars({ viewBar: false, measureBar: true });
    expect(JSON.parse(stored.get(VIEW_BARS_STORAGE_KEY)!)).toEqual({ viewBar: false, measureBar: true });
    forgetViewBarsCache();
    expect(readViewBars()).toEqual({ viewBar: false, measureBar: true });
  });

  it("falls back on a broken entry", () => {
    stored.set(VIEW_BARS_STORAGE_KEY, "{");
    expect(readViewBars()).toEqual({ viewBar: true, measureBar: false });
  });
});
