// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  RIBBON_GROUP_ORDER,
  RIBBON_ORDER_STORAGE_KEY,
  forgetRibbonOrderCache,
  moveRibbonGroup,
  normalizeRibbonOrder,
  readRibbonOrder,
  ribbonSectionOrders,
  writeRibbonOrder,
} from "@/lib/ribbonOrder";

beforeEach(() => {
  window.localStorage.clear();
  forgetRibbonOrderCache();
});

describe("the order of the ribbon's groups", () => {
  it("is the shipped order when nothing was set", () => {
    expect(readRibbonOrder()).toEqual(RIBBON_GROUP_ORDER);
  });

  it("drops names it does not know and repeats, and puts back the ones that are missing at their usual place", () => {
    expect(normalizeRibbonOrder(["arrange", "bogus", "arrange", "combine", 7])).toEqual(["clipboard", "history", "shapes", "visibility", "arrange", "mirrorPattern", "splitShape", "edgesWalls", "surface", "combine", "manage"]);
    expect(normalizeRibbonOrder("nonsense")).toEqual(RIBBON_GROUP_ORDER);
  });

  it("puts Shapes third in an order kept while it could not move, where the ribbon showed it (#1550)", () => {
    expect(normalizeRibbonOrder(["manage", "visibility", "history", "clipboard", "combine", "modify", "arrange"])).toEqual(["manage", "visibility", "shapes", "history", "clipboard", "combine", "mirrorPattern", "splitShape", "edgesWalls", "surface", "arrange"]);
  });

  it("gives every section its place in the order, Shapes too (#1550)", () => {
    const shipped = ribbonSectionOrders(RIBBON_GROUP_ORDER);
    expect(shipped).toEqual({ clipboard: 0, history: 1, shapes: 2, visibility: 3, combine: 4, mirrorPattern: 5, splitShape: 6, edgesWalls: 7, surface: 8, arrange: 9, manage: 10 });
    const shapesLast = ribbonSectionOrders(["clipboard", "history", "visibility", "combine", "mirrorPattern", "splitShape", "edgesWalls", "surface", "arrange", "manage", "shapes"]);
    expect(shapesLast.shapes).toBe(10);
    expect(shapesLast.visibility).toBe(2);
    const toFront = ribbonSectionOrders(["shapes", ...RIBBON_GROUP_ORDER.filter((group) => group !== "shapes")]);
    expect(toFront.shapes).toBe(0);
    expect(new Set(Object.values(toFront)).size).toBe(11);
  });

  it("puts Modify's four groups where Modify stood in an order kept before it was split (#1551)", () => {
    expect(normalizeRibbonOrder(["arrange", "modify", "combine", "clipboard", "history", "shapes", "visibility", "manage"])).toEqual(["arrange", "mirrorPattern", "splitShape", "edgesWalls", "surface", "combine", "clipboard", "history", "shapes", "visibility", "manage"]);
    // One of the four already set keeps its place; Modify brings only the others.
    const kept = normalizeRibbonOrder(["surface", "modify"]);
    expect(kept.filter((group) => ["mirrorPattern", "splitShape", "edgesWalls", "surface"].includes(group))).toEqual(["surface", "mirrorPattern", "splitShape", "edgesWalls"]);
    expect(kept).toHaveLength(RIBBON_GROUP_ORDER.length);
    expect(RIBBON_GROUP_ORDER).not.toContain("modify");
  });

  it("moves a group one place and stops at the ends", () => {
    expect(moveRibbonGroup(RIBBON_GROUP_ORDER, "arrange", -1).slice(7, 11)).toEqual(["edgesWalls", "arrange", "surface", "manage"]);
    expect(moveRibbonGroup(RIBBON_GROUP_ORDER, "shapes", 1).slice(1, 4)).toEqual(["history", "visibility", "shapes"]);
    expect(moveRibbonGroup(RIBBON_GROUP_ORDER, "clipboard", -1)).toEqual(RIBBON_GROUP_ORDER);
    expect(moveRibbonGroup(RIBBON_GROUP_ORDER, "manage", 1)).toEqual(RIBBON_GROUP_ORDER);
  });

  it("is kept in this browser, and the shipped order is stored as nothing", () => {
    writeRibbonOrder(["arrange", ...RIBBON_GROUP_ORDER.filter((group) => group !== "arrange")]);
    expect(JSON.parse(window.localStorage.getItem(RIBBON_ORDER_STORAGE_KEY) ?? "[]")[0]).toBe("arrange");
    forgetRibbonOrderCache();
    expect(readRibbonOrder()[0]).toBe("arrange");
    writeRibbonOrder(RIBBON_GROUP_ORDER);
    expect(window.localStorage.getItem(RIBBON_ORDER_STORAGE_KEY)).toBeNull();
  });
});
