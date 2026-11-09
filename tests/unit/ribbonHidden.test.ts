// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RibbonButtonsSetting } from "@/components/workplane/RibbonButtonsSetting";
import {
  forgetRibbonHiddenCache,
  normalizeRibbonHidden,
  readRibbonHidden,
  RIBBON_HIDDEN_STORAGE_KEY,
  ribbonGroupKey,
  ribbonGroupShown,
  setRibbonEntryShown,
  setRibbonLayout,
  shownInRibbon,
  subscribeRibbonHidden,
  writeRibbonHidden,
} from "@/lib/ribbonHidden";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  window.localStorage.clear();
  forgetRibbonHiddenCache();
});

describe("buttons taken out of the ribbon (Discussion #1519)", () => {
  it("keeps only names that can be ids, once each", () => {
    expect(normalizeRibbonHidden(["paint", "paint", " lid ", "", 4, null, "x".repeat(81)])).toEqual(["lid", "paint"]);
    expect(normalizeRibbonHidden("paint")).toEqual([]);
  });

  it("takes out Modify's four groups where Modify was taken out before it was split (#1551)", () => {
    expect(normalizeRibbonHidden(["group:modify", "paint"])).toEqual(["group:edgesWalls", "group:mirrorPattern", "group:splitShape", "group:surface", "paint"]);
  });

  it("leaves out what is hidden and keeps the order of the rest", () => {
    const tools = [{ id: "mirror" }, { id: "cookieCutter" }, { id: "fillet" }];
    expect(shownInRibbon(tools, new Set(["cookieCutter"])).map((tool) => tool.id)).toEqual(["mirror", "fillet"]);
    expect(shownInRibbon(tools, new Set())).toEqual(tools);
  });

  it("drops a group taken out, or one with no button left", () => {
    expect(ribbonGroupShown("modify", new Set([ribbonGroupKey("modify")]), [{ id: "mirror" }])).toBe(false);
    expect(ribbonGroupShown("modify", new Set(), [])).toBe(false);
    expect(ribbonGroupShown("modify", new Set(), [{ id: "mirror" }])).toBe(true);
    // A group with a menu of its own (Visibility) passes no list and stays while it is not taken out.
    expect(ribbonGroupShown("visibility", new Set())).toBe(true);
  });

  it("keeps the choice in this browser and tells who listens", () => {
    let calls = 0;
    const stop = subscribeRibbonHidden(() => { calls += 1; });
    setRibbonEntryShown("cookieCutter", false);
    setRibbonEntryShown(ribbonGroupKey("visibility"), false);
    expect(JSON.parse(window.localStorage.getItem(RIBBON_HIDDEN_STORAGE_KEY)!)).toEqual(["cookieCutter", "group:visibility"]);
    forgetRibbonHiddenCache();
    expect([...readRibbonHidden()]).toEqual(["cookieCutter", "group:visibility"]);
    setRibbonEntryShown("cookieCutter", true);
    expect([...readRibbonHidden()]).toEqual(["group:visibility"]);
    writeRibbonHidden([]);
    expect(window.localStorage.getItem(RIBBON_HIDDEN_STORAGE_KEY)).toBeNull();
    expect(calls).toBe(4);
    stop();
  });
});

describe("the list in the settings window", () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;
  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    root = null;
    container = null;
    setRibbonLayout([]);
  });

  function mount() {
    setRibbonLayout([
      { group: "modify", label: "Modify", tools: [{ id: "mirror", label: "Mirror" }, { id: "cookieCutter", label: "Cookie cutter" }] },
      { group: "manage", label: "File", tools: [{ id: "import", label: "Import" }, { id: "export", label: "Export" }] },
    ]);
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root!.render(createElement(RibbonButtonsSetting)));
    const box = (label: string) => [...container!.querySelectorAll("label")].find((entry) => entry.textContent?.trim() === label)!.querySelector("input")!;
    return { box, container };
  }

  it("takes a button out with its tick and brings everything back with Show all", () => {
    const { box, container } = mount();
    expect(box("Cookie cutter").checked).toBe(true);
    act(() => box("Cookie cutter").click());
    expect([...readRibbonHidden()]).toEqual(["cookieCutter"]);
    expect(box("Cookie cutter").checked).toBe(false);
    const showAll = [...container.querySelectorAll("button")].find((button) => !button.closest("a") && button.className === "make-default-button")!;
    expect(showAll.disabled).toBe(false);
    act(() => showAll.click());
    expect(readRibbonHidden().size).toBe(0);
    expect(box("Cookie cutter").checked).toBe(true);
  });

  it("takes a whole group out and greys out its buttons", () => {
    const { container } = mount();
    const groupBoxes = [...container.querySelectorAll<HTMLInputElement>(".ribbon-buttons-group > label input")];
    expect(groupBoxes).toHaveLength(2);
    act(() => groupBoxes[1].click());
    expect([...readRibbonHidden()]).toEqual(["group:manage"]);
    const fileButtons = [...container.querySelectorAll<HTMLDetailsElement>(".ribbon-buttons-group")][1].querySelectorAll<HTMLInputElement>(".ribbon-buttons-tools input");
    expect([...fileButtons].every((input) => input.disabled)).toBe(true);
  });
});
