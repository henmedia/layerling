// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { ShapeContextMenu } from "@/components/workplane/ShapeContextMenu";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** Opens a menu in the page and counts how often it asks to be closed. */
function open() {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  let closed = 0;
  const items = Array.from({ length: 30 }, (_, index) => ({ key: `item-${index}`, label: `Item ${index}`, onSelect: () => {} }));
  act(() => root.render(createElement(ShapeContextMenu, { x: 10, y: 10, label: "Menu", items, onClose: () => { closed += 1; } })));
  const menu = host.querySelector<HTMLElement>(".shape-context-menu")!;
  return {
    menu,
    closed: () => closed,
    unmount: () => {
      act(() => root.unmount());
      host.remove();
    },
  };
}

describe("the right-click menu and the wheel (Discussion #1058)", () => {
  it("stays open while the wheel scrolls it", () => {
    const context = open();
    context.menu.querySelector("button")!.dispatchEvent(new WheelEvent("wheel", { deltaY: 100, bubbles: true }));
    context.menu.dispatchEvent(new WheelEvent("wheel", { deltaY: 100, bubbles: true }));
    expect(context.closed()).toBe(0);
    context.unmount();
  });

  it("closes on the wheel anywhere else, as before", () => {
    const context = open();
    document.body.dispatchEvent(new WheelEvent("wheel", { deltaY: 100, bubbles: true }));
    expect(context.closed()).toBe(1);
    context.unmount();
  });
});
