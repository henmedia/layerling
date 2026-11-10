// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  RIBBON_TOOL_ORDER_STORAGE_KEY,
  forgetRibbonToolOrderCache,
  moveRibbonTool,
  normalizeRibbonToolOrder,
  readRibbonToolOrder,
  sortByRibbonToolOrder,
  withRibbonToolOrder,
  writeRibbonToolOrder,
} from "@/lib/ribbonToolOrder";

beforeEach(() => {
  window.localStorage.clear();
  forgetRibbonToolOrderCache();
});

const tools = ["group", "bundle", "ungroup", "intersect"].map((id) => ({ id }));

describe("the order of the buttons inside the ribbon's groups", () => {
  it("is the shipped order when nothing was set", () => {
    expect(readRibbonToolOrder()).toEqual({});
    expect(sortByRibbonToolOrder(tools, undefined).map((tool) => tool.id)).toEqual(["group", "bundle", "ungroup", "intersect"]);
  });

  it("puts the named buttons first in the saved order, and a button it lacks after them", () => {
    expect(sortByRibbonToolOrder(tools, ["intersect", "group"]).map((tool) => tool.id)).toEqual(["intersect", "group", "bundle", "ungroup"]);
    expect(sortByRibbonToolOrder(tools, ["gone", "ungroup", "group"]).map((tool) => tool.id)).toEqual(["ungroup", "group", "bundle", "intersect"]);
  });

  it("keeps only known groups and plain ids, once each", () => {
    expect(normalizeRibbonToolOrder({ combine: ["a", "a", 3, " b ", ""], bogus: ["x"], arrange: "no", modify: [] })).toEqual({ combine: ["a", "b"] });
    expect(normalizeRibbonToolOrder([1, 2])).toEqual({});
    expect(normalizeRibbonToolOrder(null)).toEqual({});
  });

  it("moves a button past another, up or down", () => {
    expect(moveRibbonTool(["group", "bundle", "ungroup"], "ungroup", "bundle", -1)).toEqual(["group", "ungroup", "bundle"]);
    expect(moveRibbonTool(["group", "bundle", "ungroup"], "group", "bundle", 1)).toEqual(["bundle", "group", "ungroup"]);
    expect(moveRibbonTool(["group", "bundle"], "group", "missing", 1)).toEqual(["group", "bundle"]);
  });

  it("stores a group's list, and none when it is the shipped order again", () => {
    const shipped = ["group", "bundle", "ungroup"];
    const moved = withRibbonToolOrder({}, "combine", ["bundle", "group", "ungroup"], shipped);
    expect(moved).toEqual({ combine: ["bundle", "group", "ungroup"] });
    expect(withRibbonToolOrder(moved, "combine", shipped, shipped)).toEqual({});
    expect(withRibbonToolOrder({ arrange: ["snap", "align"] }, "combine", ["bundle", "group", "ungroup"], shipped)).toEqual({ arrange: ["snap", "align"], combine: ["bundle", "group", "ungroup"] });
  });

  it("is kept in this browser, and an empty order is stored as nothing", () => {
    writeRibbonToolOrder({ combine: ["bundle", "group"] });
    expect(JSON.parse(window.localStorage.getItem(RIBBON_TOOL_ORDER_STORAGE_KEY) ?? "{}")).toEqual({ combine: ["bundle", "group"] });
    forgetRibbonToolOrderCache();
    expect(readRibbonToolOrder()).toEqual({ combine: ["bundle", "group"] });
    writeRibbonToolOrder({});
    expect(window.localStorage.getItem(RIBBON_TOOL_ORDER_STORAGE_KEY)).toBeNull();
  });
});
