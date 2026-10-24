// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TouchMultiSelectButton } from "@/components/workplane/TouchMultiSelectButton";
import { showsTouchMultiSelect } from "@/lib/touchMultiSelect";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("the Select multiple button of a touch screen (#337)", () => {
  it("is for a finger on a body, not for empty space or a mouse", () => {
    expect(showsTouchMultiSelect("touch", "body-1")).toBe(true);
    expect(showsTouchMultiSelect("touch", null)).toBe(false);
    expect(showsTouchMultiSelect("mouse", "body-1")).toBe(false);
    expect(showsTouchMultiSelect("pen", "body-1")).toBe(false);
  });

  let container: HTMLDivElement | null = null;
  let root: Root | null = null;
  afterEach(() => {
    if (root) act(() => root!.unmount());
    container?.remove();
    container = null;
    root = null;
  });

  const mount = (active = false) => {
    const onToggle = vi.fn();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    const render = (nextActive: boolean) => act(() => {
      root!.render(createElement(TouchMultiSelectButton, { active: nextActive, onToggle }));
    });
    render(active);
    return { button: container.querySelector("button")!, onToggle, render };
  };

  it("locks Select multiple on a tap", () => {
    const { button, onToggle } = mount();
    act(() => button.click());
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("shows whether the mode is locked", () => {
    const { button, render } = mount();
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(button.classList.contains("active")).toBe(false);
    render(true);
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(button.classList.contains("active")).toBe(true);
  });
});
