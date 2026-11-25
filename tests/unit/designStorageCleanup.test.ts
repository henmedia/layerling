import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PER_DESIGN_STORAGE_PREFIXES, removeDesignStorage } from "@/lib/designStorageCleanup";

// Deleting a design left its view, saved views, named selections and measurements in the browser for good.
describe("removeDesignStorage", () => {
  it("removes every per-design key of the deleted designs and nothing else", () => {
    const removed: string[] = [];
    removeDesignStorage(["a", "", "b"], { removeItem: (key) => void removed.push(key) });
    expect(removed).toHaveLength(PER_DESIGN_STORAGE_PREFIXES.length * 2);
    expect(removed).toContain("layerling.selectionSets.a");
    expect(removed).toContain("layerling.savedViews.b");
    expect(removed.every((key) => key.endsWith(".a") || key.endsWith(".b"))).toBe(true);
  });

  it("goes on when the browser refuses a key", () => {
    let calls = 0;
    removeDesignStorage(["a"], {
      removeItem: () => {
        calls += 1;
        throw new Error("denied");
      },
    });
    expect(calls).toBe(PER_DESIGN_STORAGE_PREFIXES.length);
  });

  // A new store that keeps something beside a design must be added to the list, or its leftovers stay.
  it("knows every per-design storage prefix of the source", () => {
    const sources = ["designView.ts", "selectionSets.ts", "cornerRulerStore.ts", "tapeStore.ts", "drawingInfo.ts"]
      .map((name) => readFileSync(`apps/web/src/lib/${name}`, "utf8")).join("\n");
    const used = [...sources.matchAll(/_PREFIX = "(layerling\.[A-Za-z]+\.)"/g)].map((match) => match[1]);
    expect(used.length).toBeGreaterThanOrEqual(PER_DESIGN_STORAGE_PREFIXES.length);
    expect([...used].sort()).toEqual([...PER_DESIGN_STORAGE_PREFIXES].sort());
  });
});
