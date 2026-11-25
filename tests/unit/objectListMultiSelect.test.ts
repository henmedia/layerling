// @vitest-environment jsdom
import { createElement } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ObjectListPanel } from "@/components/workplane/ObjectListPanel";
import type { WorkplaneShape } from "@/types/layerling";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const box = (id: string, extra: Partial<WorkplaneShape> = {}): WorkplaneShape => ({
  id, name: id, kind: "box", color: "#ff0000", x: 0, z: 0, elevation: 0, size: 20, width: 20, depth: 20, height: 20, rotation: 0, ...extra,
});

let host: HTMLDivElement | null = null;
afterEach(() => {
  host?.remove();
  host = null;
  vi.useRealTimers();
});

function render(multiSelect: boolean, selectedIds: string[] = []) {
  const picks: [string | string[], string | undefined][] = [];
  const started: number[] = [];
  host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => {
    root.render(createElement(ObjectListPanel, {
      shapes: [box("a"), box("b"), box("group", { kind: "mesh", groupedShapes: [box("left"), box("right")] })],
      selectedIds,
      onSelectShape: (id: string | string[], mode?: string) => picks.push([id, mode]),
      multiSelect,
      onStartMultiSelect: () => started.push(1),
      onToggleLock: () => {},
      onToggleHidden: () => {},
      onClose: () => {},
    }));
  });
  const row = (id: string) => host!.querySelector(`li[data-shape-id="${id}"]`) as HTMLElement;
  return { picks, started, row, host };
}

function pointer(target: Element, type: string, pointerType: string, x = 10, y = 10) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y });
  Object.assign(event, { pointerId: 1, pointerType });
  act(() => { target.dispatchEvent(event); });
}

function longPress(target: Element, pointerType = "touch", moveTo?: number) {
  pointer(target, "pointerdown", pointerType);
  if (moveTo !== undefined) pointer(target, "pointermove", pointerType, moveTo, 10);
  act(() => { vi.advanceTimersByTime(600); });
  pointer(target, "pointerup", pointerType);
  act(() => { (target as HTMLElement).click(); });
}

describe("Select multiple in the object list on a touch screen", () => {
  it("a tap adds a row to the selection while Select multiple is on", () => {
    const { picks, row } = render(true, ["a"]);
    act(() => row("b").click());
    expect(picks).toEqual([["b", "toggle"]]);
  });

  it("a tap replaces the selection while it is off, as before", () => {
    const { picks, row } = render(false, ["a"]);
    act(() => row("b").click());
    expect(picks).toEqual([["b", "replace"]]);
  });

  it("a long press with a finger turns Select multiple on and adds the row, and the release does not take it out again", () => {
    vi.useFakeTimers();
    const { picks, started, row } = render(false, ["a"]);
    longPress(row("b"));
    expect(started).toHaveLength(1);
    expect(picks).toEqual([["b", "toggle"]]);
  });

  it("a long press does nothing with a mouse, after sliding, or on a part of an expanded group", () => {
    vi.useFakeTimers();
    const { picks, started, row, host } = render(false);
    longPress(row("a"), "mouse");
    longPress(row("b"), "touch", 40);
    act(() => (host.querySelector(".outliner-expand-toggle") as HTMLButtonElement).click());
    const part = host.querySelector(".outliner-child-item")!;
    pointer(part, "pointerdown", "touch");
    act(() => { vi.advanceTimersByTime(600); });
    expect(started).toHaveLength(0);
    // The mouse press and the slid one end as ordinary clicks that replace the selection.
    expect(picks).toEqual([["a", "replace"], ["b", "replace"]]);
  });
});
