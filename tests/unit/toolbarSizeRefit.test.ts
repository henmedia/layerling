// @vitest-environment jsdom
import { act, createElement, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { useToolbarCollapse } from "@/components/workplane/useToolbarCollapse";
import { setToolbarSize } from "@/lib/toolbarSize";

// jsdom lays nothing out: each group gets its width from data-width, scaled by the control size as globals.css does.
const SCALE = { small: 0.8, medium: 1, large: 1.25 } as const;
const scale = () => SCALE[(document.documentElement.dataset.toolbarSize as "small" | "large" | undefined) ?? "medium"];

function Bar() {
  const ref = useRef<HTMLDivElement>(null);
  useToolbarCollapse(ref, true);
  return createElement(
    "div",
    { ref, className: "toolbar-mode-content" },
    createElement("div", { className: "toolbar-section", "data-collapse": "1", "data-width": "200" }),
    createElement("div", { className: "toolbar-section", "data-width": "300" }),
    createElement("div", { className: "toolbar-section", "data-collapse": "2", "data-width": "400" }),
  );
}

let root: Root | null = null;

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get(this: HTMLElement) {
      return this.classList.contains("toolbar-mode-content") ? 1000 : 0;
    },
  });
  HTMLElement.prototype.getClientRects = function (this: HTMLElement) {
    return [{}] as unknown as DOMRectList;
  };
  HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
    const width = this.hasAttribute("data-collapsed") ? 64 : Number(this.dataset.width ?? 0) * scale();
    return { width, height: 40, top: 0, left: 0, right: width, bottom: 40, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
  };
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  act(() => setToolbarSize("medium"));
  document.body.innerHTML = "";
});

const folded = () => [...document.querySelectorAll<HTMLElement>(".toolbar-section")].map((section) => section.hasAttribute("data-collapsed"));

describe("the ribbon fits again when the control size changes (Discussion #1502)", () => {
  it("folds a group as soon as Large makes the bar too wide, and opens it again on Small", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    act(() => {
      root = createRoot(host);
      root.render(createElement(Bar));
    });
    // Medium: 900 px fit into 1000.
    expect(folded()).toEqual([false, false, false]);
    // Large: 1125 px do not; the group folded first goes, without the window or the bar changing otherwise.
    act(() => setToolbarSize("large"));
    expect(folded()).toEqual([true, false, false]);
    // Small: everything fits open again.
    act(() => setToolbarSize("small"));
    expect(folded()).toEqual([false, false, false]);
  });
});
