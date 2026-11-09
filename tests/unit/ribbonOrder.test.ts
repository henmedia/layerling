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

  it("drops names it does not know and repeats, and puts back the ones that are missing", () => {
    expect(normalizeRibbonOrder(["arrange", "bogus", "arrange", "combine", 7])).toEqual(["arrange", "combine", "clipboard", "history", "visibility", "modify", "manage"]);
    expect(normalizeRibbonOrder("nonsense")).toEqual(RIBBON_GROUP_ORDER);
  });

  it("gives every section its place and keeps Shapes between the second and the third", () => {
    const shipped = ribbonSectionOrders(RIBBON_GROUP_ORDER);
    expect(shipped).toEqual({ shapes: 2, clipboard: 0, history: 1, visibility: 3, combine: 4, modify: 5, arrange: 6, manage: 7 });
    const moved = ribbonSectionOrders(["clipboard", "history", "visibility", "combine", "arrange", "modify", "manage"]);
    expect(moved.arrange).toBe(5);
    expect(moved.modify).toBe(6);
    expect(moved.shapes).toBe(2);
    const toFront = ribbonSectionOrders(["arrange", ...RIBBON_GROUP_ORDER.filter((group) => group !== "arrange")]);
    expect(toFront.arrange).toBe(0);
    expect(new Set(Object.values(toFront)).size).toBe(8);
  });

  it("moves a group one place and stops at the ends", () => {
    expect(moveRibbonGroup(RIBBON_GROUP_ORDER, "arrange", -1).slice(3, 7)).toEqual(["combine", "arrange", "modify", "manage"]);
    expect(moveRibbonGroup(RIBBON_GROUP_ORDER, "clipboard", -1)).toEqual(RIBBON_GROUP_ORDER);
    expect(moveRibbonGroup(RIBBON_GROUP_ORDER, "manage", 1)).toEqual(RIBBON_GROUP_ORDER);
  });

  it("is kept in this browser, and the shipped order is stored as nothing", () => {
    writeRibbonOrder(["arrange", "combine"]);
    expect(JSON.parse(window.localStorage.getItem(RIBBON_ORDER_STORAGE_KEY) ?? "[]")[0]).toBe("arrange");
    forgetRibbonOrderCache();
    expect(readRibbonOrder()[0]).toBe("arrange");
    writeRibbonOrder(RIBBON_GROUP_ORDER);
    expect(window.localStorage.getItem(RIBBON_ORDER_STORAGE_KEY)).toBeNull();
  });
});
