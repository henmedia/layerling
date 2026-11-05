// @vitest-environment jsdom
import { createElement } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { ObjectListPanel } from "@/components/workplane/ObjectListPanel";
import type { WorkplaneShape } from "@/types/layerling";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const box = (id: string, extra: Partial<WorkplaneShape> = {}): WorkplaneShape => ({
  id, name: id, kind: "box", color: "#ff0000", x: 0, z: 0, elevation: 0, size: 20, width: 20, depth: 20, height: 20, rotation: 0, ...extra,
});

const group = (extra: Partial<WorkplaneShape> = {}) => box("group", { kind: "mesh", groupedShapes: [box("left"), box("right")], ...extra });

let host: HTMLDivElement | null = null;
afterEach(() => {
  host?.remove();
  host = null;
});

function render(shapes: WorkplaneShape[], opened: string[][], openGroupPartIds?: string[]) {
  host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => {
    root.render(createElement(ObjectListPanel, {
      shapes,
      selectedIds: [],
      onSelectShape: () => {},
      onToggleLock: () => {},
      onToggleHidden: () => {},
      onOpenGroup: () => {},
      onOpenGroupPart: (groupId: string, partId: string) => opened.push([groupId, partId]),
      openGroupPartIds,
      onClose: () => {},
    }));
  });
  // Expand the group with its arrow.
  const toggle = host.querySelector(".outliner-expand-toggle") as HTMLButtonElement;
  act(() => toggle.click());
  return host;
}

// #1316: a part of a group in the expanded object list could only be looked at; a click now opens the group with it.
describe("a part of a group in the object list (Discussion #1316)", () => {
  it("opens its group with that part selected when clicked", () => {
    const opened: string[][] = [];
    const list = render([group()], opened);
    const parts = [...list.querySelectorAll('[data-testid="outliner-group-part"]')] as HTMLElement[];
    expect(parts).toHaveLength(2);
    const right = parts.find((part) => part.textContent?.includes("right"))!;
    act(() => right.click());
    expect(opened).toEqual([["group", "right"]]);
  });

  it("does nothing on a locked group", () => {
    const list = render([group({ locked: true })], []);
    expect(list.querySelectorAll('[data-testid="outliner-group-part"]')).toHaveLength(0);
    expect(list.querySelectorAll(".outliner-child-item")).toHaveLength(2);
  });
});
