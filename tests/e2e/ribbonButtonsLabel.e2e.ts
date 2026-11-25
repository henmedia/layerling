// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { RibbonButtonsSetting } from "@/components/workplane/RibbonButtonsSetting";
import { readRibbonHidden, setRibbonLayout } from "@/lib/ribbonHidden";
import { readRibbonToolOrder } from "@/lib/ribbonToolOrder";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** A click on a button's name in "Buttons in the ribbon" ticks its box; it must not press the arrow up beside it (Discussion #2072). */
describe("the list of buttons in the ribbon", () => {
  it("ticks the box on a click on the name and leaves the order alone", () => {
    setRibbonLayout([{ group: "combine", label: "Combine", tools: [{ id: "group", label: "Group" }, { id: "bundle", label: "Bundle" }] }]);
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => root.render(createElement(RibbonButtonsSetting)));
    const before = JSON.stringify(readRibbonToolOrder());
    const name = [...container.querySelectorAll<HTMLElement>(".ribbon-buttons-tools .workspace-toggle-copy")][1];
    expect(name.textContent).toBe("Bundle");
    act(() => name.click());
    expect(JSON.stringify(readRibbonToolOrder())).toBe(before);
    expect(readRibbonHidden().has("bundle")).toBe(true);
    act(() => root.unmount());
  });
});
