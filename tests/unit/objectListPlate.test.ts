// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { ObjectListPanel, type ObjectListPanelProps } from "@/components/workplane/ObjectListPanel";
import type { WorkplaneShape } from "@/types/layerling";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const box = (id: string, x: number): WorkplaneShape => ({
  id, name: id, kind: "box", color: "#ff0000", x, z: 0, elevation: 0, size: 20, width: 20, depth: 20, height: 20, rotation: 0,
});

// Plates of 200 mm with a gap of 20 mm: plate 2 has its middle at 220.
const workspace = { width: 200, depth: 200, plates: ["", ""] };
const shapes = [box("first", 0), box("second", 220), box("edge", 300)];

let root: Root | null = null;
let host: HTMLDivElement | null = null;

function draw(plates?: ObjectListPanelProps["plates"], list = shapes) {
  if (!host) {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  }
  act(() => {
    root!.render(createElement(ObjectListPanel, {
      shapes: list,
      selectedIds: [],
      onSelectShape: () => {},
      onToggleLock: () => {},
      onToggleHidden: () => {},
      onMoveShape: () => {},
      plates,
      onClose: () => {},
    }));
  });
}

const rows = () => Array.from(host!.querySelectorAll<HTMLElement>("li[data-shape-id]")).map((row) => row.dataset.shapeId);
// The plate button stands first, before A-Z; without plates only A-Z is there.
const buttons = () => Array.from(host!.querySelectorAll<HTMLButtonElement>(".outliner-sort-button"));
const press = () => act(() => buttons()[0].click());

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
  window.localStorage.clear();
});

describe("the object list of the current build plate", () => {
  it("has no such button on one plate", () => {
    draw();
    expect(buttons()).toHaveLength(1);
    expect(rows()).toEqual(["first", "second", "edge"]);
  });

  it("shows the active plate's objects and follows another plate", () => {
    draw({ workspace, active: 0 });
    expect(rows()).toEqual(["first", "second", "edge"]);
    press();
    expect(rows()).toEqual(["first"]);
    expect(host!.querySelector(".outliner-count-badge")?.textContent).toBe("1/3");
    draw({ workspace, active: 1 });
    expect(rows()).toEqual(["second", "edge"]);
    press();
    expect(rows()).toEqual(["first", "second", "edge"]);
  });

  it("is remembered, and shows everything again in a design with one plate", () => {
    window.localStorage.setItem("layerling.editor.objectListPlateOnly", "true");
    draw({ workspace, active: 0 });
    expect(rows()).toEqual(["first"]);
    draw(undefined);
    expect(rows()).toEqual(["first", "second", "edge"]);
  });

  it("says when the plate is empty and offers no reordering while filtered", () => {
    draw({ workspace, active: 1 }, [box("first", 0), box("other", 30)]);
    press();
    expect(rows()).toEqual([]);
    expect(host!.querySelector(".outliner-empty-state")?.textContent).toBe("No objects on this plate");
    draw({ workspace, active: 1 });
    expect(rows()).toEqual(["second", "edge"]);
    expect(host!.querySelector(".outliner-drag-handle")).toBeNull();
  });
});
