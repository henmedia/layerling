// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  forgetRibbonFoldCache,
  KEEP_OPEN_PRIORITY_OFFSET,
  normalizeRibbonFold,
  readRibbonFold,
  RIBBON_FOLD_STORAGE_KEY,
  ribbonCollapsePriority,
  ribbonFoldOf,
  ribbonGroupFolds,
  subscribeRibbonFold,
  withRibbonFold,
  writeRibbonFold,
} from "@/lib/ribbonFold";
import { ribbonToolOrderFor } from "@/lib/ribbonToolOrder";
import { groupsToCollapse } from "@/lib/toolbarCollapse";

beforeEach(() => {
  window.localStorage.clear();
  forgetRibbonFoldCache();
});

describe("how each group of the ribbon folds (Discussion #1551)", () => {
  it("keeps only groups it knows and choices it has; Shapes, a single button, has none", () => {
    expect(normalizeRibbonFold({ surface: "always", arrange: "keep", combine: "auto", bogus: "always", shapes: "always", manage: 3 })).toEqual({ surface: "always", arrange: "keep" });
    expect(normalizeRibbonFold(["always"])).toEqual({});
    expect(ribbonGroupFolds("shapes")).toBe(false);
    expect(ribbonGroupFolds("edgesWalls")).toBe(true);
  });

  it("reads a choice for Modify as one for each of its four groups", () => {
    expect(normalizeRibbonFold({ modify: "keep" })).toEqual({ mirrorPattern: "keep", splitShape: "keep", edgesWalls: "keep", surface: "keep" });
    // A group named for itself keeps its own choice.
    expect(normalizeRibbonFold({ surface: "always", modify: "keep" }).surface).toBe("always");
  });

  it("is when there is no room unless chosen, and stores that as nothing", () => {
    expect(ribbonFoldOf({}, "combine")).toBe("auto");
    const folds = withRibbonFold({}, "combine", "always");
    expect(ribbonFoldOf(folds, "combine")).toBe("always");
    expect(withRibbonFold(folds, "combine", "auto")).toEqual({});
  });

  it("lets a group kept open fold after every other one", () => {
    expect(ribbonCollapsePriority(4, "auto")).toBe(4);
    expect(ribbonCollapsePriority(4, "always")).toBe(4);
    expect(ribbonCollapsePriority(1, "keep")).toBe(1 + KEEP_OPEN_PRIORITY_OFFSET);
    // File (1) folds first as it comes; kept open it is the last to go, after Edges & walls (10).
    const groups = [
      { key: "manage", width: 120, priority: ribbonCollapsePriority(1, "keep") },
      { key: "clipboard", width: 200, priority: 2 },
      { key: "edgesWalls", width: 300, priority: 10 },
    ];
    expect(groupsToCollapse(groups, 500)).toEqual(["clipboard"]);
    expect(groupsToCollapse(groups, 300)).toEqual(["clipboard", "edgesWalls"]);
    expect(groupsToCollapse(groups, 200)).toEqual(["clipboard", "edgesWalls", "manage"]);
  });

  it("is kept in this browser and tells who listens", () => {
    let calls = 0;
    const stop = subscribeRibbonFold(() => { calls += 1; });
    writeRibbonFold({ surface: "always" });
    expect(JSON.parse(window.localStorage.getItem(RIBBON_FOLD_STORAGE_KEY)!)).toEqual({ surface: "always" });
    forgetRibbonFoldCache();
    expect(readRibbonFold()).toEqual({ surface: "always" });
    writeRibbonFold({});
    expect(window.localStorage.getItem(RIBBON_FOLD_STORAGE_KEY)).toBeNull();
    expect(calls).toBe(2);
    stop();
  });
});

describe("the order of the buttons in Modify's four groups (#1551)", () => {
  it("comes from the list Modify had until a group gets one of its own", () => {
    const order = { modify: ["fillet", "chamfer", "mirror"] };
    expect(ribbonToolOrderFor(order, "edgesWalls")).toEqual(["fillet", "chamfer", "mirror"]);
    expect(ribbonToolOrderFor({ ...order, edgesWalls: ["hollow"] }, "edgesWalls")).toEqual(["hollow"]);
    expect(ribbonToolOrderFor(order, "combine")).toBeUndefined();
  });
});
