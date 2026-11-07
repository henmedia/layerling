// @vitest-environment jsdom
import { act, createElement, useRef } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { SnapGridPointerMenu } from "@/components/workplane/SnapGridMenu";
import { isMiddleClick, MIDDLE_CLICK_MS, MIDDLE_CLICK_PIXELS, pressLandsInTextField, useMiddleClick, type MiddlePress } from "@/lib/middleClick";
import type { GridSize } from "@/types/layerling";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
});

function mount(element: ReturnType<typeof createElement>) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => root.render(element));
  cleanups.push(() => {
    act(() => root.unmount());
    host.remove();
  });
  return host;
}

function pointer(type: string, init: { button: number; clientX: number; clientY: number; pointerId?: number }) {
  return new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, ...init });
}

describe("a short middle click, not a middle drag (Discussion #1439)", () => {
  const press: MiddlePress = { pointerId: 1, x: 100, y: 100, at: 1000, wandered: false };
  const release = (x: number, y: number, extra: Partial<{ button: number; pointerId: number }> = {}) => ({ pointerId: 1, button: 1, clientX: x, clientY: y, ...extra });

  it("counts a press let go where it started, soon after", () => {
    expect(isMiddleClick(press, release(100, 100), 1100)).toBe(true);
    // A wheel gives a little when it is pushed.
    expect(isMiddleClick(press, release(100 + MIDDLE_CLICK_PIXELS - 1, 100), 1100)).toBe(true);
  });

  it("leaves a drag, a long hold and other buttons to the view", () => {
    expect(isMiddleClick(press, release(130, 100), 1100)).toBe(false);
    expect(isMiddleClick({ ...press, wandered: true }, release(100, 100), 1100)).toBe(false);
    expect(isMiddleClick(press, release(100, 100), 1000 + MIDDLE_CLICK_MS + 1)).toBe(false);
    expect(isMiddleClick(press, release(100, 100, { button: 2 }), 1100)).toBe(false);
    expect(isMiddleClick(press, release(100, 100, { pointerId: 2 }), 1100)).toBe(false);
    expect(isMiddleClick(null, release(100, 100), 1100)).toBe(false);
  });

  it("leaves the middle button to the text in a field", () => {
    const input = document.createElement("input");
    const editable = document.createElement("div");
    editable.setAttribute("contenteditable", "true");
    const inside = document.createElement("span");
    editable.appendChild(inside);
    expect(pressLandsInTextField(input)).toBe(true);
    expect(pressLandsInTextField(inside)).toBe(true);
    expect(pressLandsInTextField(document.createElement("canvas"))).toBe(false);
    expect(pressLandsInTextField(null)).toBe(false);
  });

  function View({ onClick }: { onClick: (x: number, y: number) => void }) {
    const ref = useRef<HTMLDivElement>(null);
    useMiddleClick(ref, onClick);
    return createElement("div", { ref, className: "view" }, createElement("canvas"));
  }

  it("reports where a middle click on the view happened, even when the view took the pointer for its pan", () => {
    const clicks: Array<[number, number]> = [];
    const host = mount(createElement(View, { onClick: (x: number, y: number) => clicks.push([x, y]) }));
    const canvas = host.querySelector("canvas")!;
    canvas.dispatchEvent(pointer("pointerdown", { button: 1, clientX: 40, clientY: 50 }));
    // The view captured the pointer: the release reaches only the window.
    window.dispatchEvent(pointer("pointerup", { button: 1, clientX: 41, clientY: 50 }));
    expect(clicks).toEqual([[41, 50]]);
  });

  it("keeps working when the view is built anew, as the sketch plate is", () => {
    function Rebuilt({ round, onClick }: { round: number; onClick: (x: number, y: number) => void }) {
      const ref = useRef<HTMLElement>(null);
      useMiddleClick(ref, onClick);
      return createElement("section", { key: round, ref, className: `plate-${round}` }, createElement("svg"));
    }
    const clicks: Array<[number, number]> = [];
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    const onClick = (x: number, y: number) => clicks.push([x, y]);
    act(() => root.render(createElement(Rebuilt, { round: 1, onClick })));
    act(() => root.render(createElement(Rebuilt, { round: 2, onClick })));
    cleanups.push(() => {
      act(() => root.unmount());
      host.remove();
    });
    const plate = host.querySelector(".plate-2 svg")!;
    plate.dispatchEvent(pointer("pointerdown", { button: 1, clientX: 70, clientY: 80 }));
    window.dispatchEvent(pointer("pointerup", { button: 1, clientX: 70, clientY: 80 }));
    expect(clicks).toEqual([[70, 80]]);
  });

  it("opens nothing after a middle drag that came back, a left click or a press elsewhere", () => {
    const clicks: Array<[number, number]> = [];
    const host = mount(createElement(View, { onClick: (x: number, y: number) => clicks.push([x, y]) }));
    const canvas = host.querySelector("canvas")!;
    canvas.dispatchEvent(pointer("pointerdown", { button: 1, clientX: 40, clientY: 50 }));
    window.dispatchEvent(pointer("pointermove", { button: -1, clientX: 140, clientY: 50 }));
    window.dispatchEvent(pointer("pointerup", { button: 1, clientX: 40, clientY: 50 }));
    canvas.dispatchEvent(pointer("pointerdown", { button: 0, clientX: 40, clientY: 50 }));
    window.dispatchEvent(pointer("pointerup", { button: 0, clientX: 40, clientY: 50 }));
    document.body.dispatchEvent(pointer("pointerdown", { button: 1, clientX: 40, clientY: 50 }));
    window.dispatchEvent(pointer("pointerup", { button: 1, clientX: 40, clientY: 50 }));
    expect(clicks).toEqual([]);
  });
});

describe("the snap menu at the pointer (Discussion #1439)", () => {
  function open(extra: Record<string, unknown> = {}) {
    const picked: GridSize[] = [];
    let closed = 0;
    mount(createElement(SnapGridPointerMenu, {
      x: 30,
      y: 40,
      units: "Metric (Default)",
      snap: "1.0 mm" as GridSize,
      onSnapChange: (value: GridSize | ((current: GridSize) => GridSize)) => {
        if (typeof value !== "function") picked.push(value);
      },
      onClose: () => {
        closed += 1;
      },
      ...extra,
    }));
    const menu = [...document.querySelectorAll<HTMLElement>(".snap-menu.snap-menu-at-pointer")].at(-1)!;
    return { menu, picked, closed: () => closed };
  }

  it("stands where the click was, with the step in use focused", () => {
    const context = open();
    expect(context.menu.style.left).toBe("30px");
    expect(context.menu.style.top).toBe("40px");
    expect(document.activeElement?.textContent).toBe("1.0 mm");
    expect(document.activeElement?.className).toBe("selected");
  });

  it("sets the picked step and closes", () => {
    const context = open();
    const off = [...context.menu.querySelectorAll("button")].find((button) => button.textContent === "Off")!;
    act(() => off.click());
    expect(context.picked).toEqual(["Off"]);
    expect(context.closed()).toBe(1);
  });

  it("stays open after the button is let go and closes on a press outside or Escape", () => {
    const context = open();
    act(() => {
      context.menu.dispatchEvent(pointer("pointerdown", { button: 0, clientX: 35, clientY: 45 }));
    });
    expect(context.closed()).toBe(0);
    act(() => {
      document.body.dispatchEvent(pointer("pointerdown", { button: 0, clientX: 300, clientY: 300 }));
    });
    expect(context.closed()).toBe(1);
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(context.closed()).toBe(2);
  });

  it("offers snapping to other shapes in the 3D editor only", () => {
    expect(open().menu.querySelector(".snap-object-toggle")).toBeNull();
    const context = open({ objectSnap: true, onObjectSnapChange: () => {} });
    expect(context.menu.querySelector<HTMLInputElement>(".snap-object-toggle input")?.checked).toBe(true);
  });
});
