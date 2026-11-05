// @vitest-environment jsdom
import { createElement } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { ObjectListPanel } from "@/components/workplane/ObjectListPanel";
import type { WorkplaneShape } from "@/types/layerling";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const box = (id: string, extra: Partial<WorkplaneShape> = {}): WorkplaneShape => ({
  id, name: id, kind: "box", color: "#ff0000", x: 0, z: 0, elevation: 0, size: 20, width: 20, depth: 20, height: 20, rotation: 0, ...extra,
});

const group = (extra: Partial<WorkplaneShape> = {}) => box("g", { kind: "mesh", groupedShapes: [box("left"), box("right")], ...extra });

// jsdom lays nothing out: each row gets a place by hand. "a" 0-20, the group 20-80 with its own line 20-40, "b" 80-100.
const PLACES: Record<string, [number, number]> = { a: [0, 20], g: [20, 80], b: [80, 100] };
const GROUP_LINE: [number, number] = [20, 40];

beforeAll(() => {
  HTMLElement.prototype.setPointerCapture = () => {};
  HTMLElement.prototype.getBoundingClientRect = function rect(this: HTMLElement) {
    const row = this.closest("li[data-shape-id]") as HTMLElement | null;
    const place = this.classList.contains("outliner-row-main") && row?.dataset.shapeId === "g"
      ? GROUP_LINE
      : (this.dataset.shapeId && PLACES[this.dataset.shapeId]) || (row?.dataset.shapeId ? PLACES[row.dataset.shapeId] : [0, 0]);
    const [top, bottom] = place;
    return { top, bottom, height: bottom - top, left: 0, right: 200, width: 200, x: 0, y: top, toJSON: () => ({}) } as DOMRect;
  };
});

let host: HTMLDivElement | null = null;
let root: Root | null = null;
afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  host = null;
  root = null;
});

type Calls = { moved: unknown[][]; added: unknown[][]; taken: unknown[][] };

function render(shapes: WorkplaneShape[], options: { expand?: boolean; openGroupPartIds?: string[] } = {}) {
  const calls: Calls = { moved: [], added: [], taken: [] };
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root!.render(createElement(ObjectListPanel, {
      shapes,
      selectedIds: [],
      onSelectShape: () => {},
      onToggleLock: () => {},
      onToggleHidden: () => {},
      onMoveShape: (...args: unknown[]) => { calls.moved.push(args); },
      onAddToGroup: (...args: unknown[]) => { calls.added.push(args); },
      onTakeOutOfGroup: async (...args: unknown[]) => {
        calls.taken.push(args);
        return { ok: true, partIds: ["left-loose"] };
      },
      openGroupPartIds: options.openGroupPartIds,
      onClose: () => {},
    }));
  });
  if (options.expand !== false) {
    const toggle = host.querySelector(".outliner-expand-toggle") as HTMLButtonElement;
    act(() => toggle.click());
  }
  return { list: host, calls };
}

function drag(handle: Element, toY: number) {
  act(() => {
    handle.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, button: 0, clientY: 5 }));
  });
  act(() => {
    handle.dispatchEvent(new MouseEvent("pointermove", { bubbles: true, clientY: toY }));
  });
  act(() => {
    handle.dispatchEvent(new MouseEvent("pointerup", { bubbles: true, clientY: toY }));
  });
}

const rowHandle = (list: HTMLElement, id: string) => list.querySelector(`li[data-shape-id="${id}"] > .outliner-row-main > .outliner-drag-handle`)!;
const partHandle = (list: HTMLElement, name: string) =>
  [...list.querySelectorAll('[data-testid="outliner-part-handle"]')].find((handle) => handle.closest("li")?.textContent?.includes(name))!;

// #1338: a loose shape could join a group only by grouping it with the group (nested) or ungrouping and grouping again.
describe("dragging shapes into and out of a group in the object list (Discussion #1338)", () => {
  const shapes = () => [box("a"), group(), box("b")];

  it("puts a shape dropped on the parts of an expanded group into it", () => {
    const { list, calls } = render(shapes());
    drag(rowHandle(list, "a"), 60);
    expect(calls.added).toEqual([[["a"], "g"]]);
    expect(calls.moved).toEqual([]);
  });

  it("shows the group that would take it with a frame while dragging", () => {
    const { list } = render(shapes());
    const handle = rowHandle(list, "a");
    act(() => {
      handle.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, button: 0, clientY: 5 }));
    });
    act(() => {
      handle.dispatchEvent(new MouseEvent("pointermove", { bubbles: true, clientY: 60 }));
    });
    expect(list.querySelector('li[data-shape-id="g"]')!.classList.contains("drop-into")).toBe(true);
    act(() => {
      handle.dispatchEvent(new MouseEvent("pointerup", { bubbles: true, clientY: 60 }));
    });
  });

  it("still moves it in front of the group when dropped on the upper half of the group's own line", () => {
    const { list, calls } = render(shapes());
    drag(rowHandle(list, "a"), 25);
    expect(calls.moved).toEqual([["a", "g"]]);
    expect(calls.added).toEqual([]);
  });

  it("only moves it past a collapsed group", () => {
    const { list, calls } = render(shapes(), { expand: false });
    drag(rowHandle(list, "a"), 35);
    expect(calls.moved).toEqual([["a", "b"]]);
    expect(calls.added).toEqual([]);
  });

  it("takes a part dragged out of the group out, in front of the row it is dropped on", () => {
    const { list, calls } = render(shapes());
    drag(partHandle(list, "left"), 85);
    expect(calls.taken).toEqual([["g", "left", "b"]]);
  });

  it("leaves a part dropped back on its own group where it is", () => {
    const { list, calls } = render(shapes());
    drag(partHandle(list, "left"), 60);
    expect(calls.taken).toEqual([]);
    expect(calls.added).toEqual([]);
  });

  it("moves a part dropped on another expanded group from the one into the other", async () => {
    const other = box("h", { kind: "mesh", groupedShapes: [box("x"), box("y")] });
    // "h" lies below the first group, 80-140; its own line counts as the whole row here, so 120 is on its lower half.
    PLACES.h = [80, 140];
    const { list, calls } = render([box("a"), group(), other]);
    const toggles = [...list.querySelectorAll(".outliner-expand-toggle")] as HTMLButtonElement[];
    act(() => toggles[1].click());
    drag(partHandle(list, "left"), 120);
    await act(async () => {});
    expect(calls.taken).toEqual([["g", "left", "h"]]);
    expect(calls.added).toEqual([[["left-loose"], "h", true]]);
    delete PLACES.h;
  });

  it("lets a part out of a group that is alone in the design, to the end of the list", () => {
    const { list, calls } = render([group()]);
    expect(list.querySelectorAll('[data-testid="outliner-part-handle"]')).toHaveLength(2);
    drag(partHandle(list, "right"), 95);
    expect(calls.taken).toEqual([["g", "right", null]]);
  });

  it("offers neither while a group is being edited", () => {
    const { list, calls } = render([box("a"), group(), box("b")], { openGroupPartIds: ["a", "g", "b"] });
    expect(list.querySelectorAll('[data-testid="outliner-part-handle"]')).toHaveLength(0);
    drag(rowHandle(list, "a"), 60);
    expect(calls.added).toEqual([]);
  });

  it("offers neither on a locked group", () => {
    const { list, calls } = render([box("a"), group({ locked: true }), box("b")]);
    expect(list.querySelectorAll('[data-testid="outliner-part-handle"]')).toHaveLength(0);
    drag(rowHandle(list, "a"), 60);
    expect(calls.added).toEqual([]);
  });
});
