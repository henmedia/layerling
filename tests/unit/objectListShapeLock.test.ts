// @vitest-environment jsdom
import { createElement } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ObjectListPanel } from "@/components/workplane/ObjectListPanel";
import type { WorkplaneShape } from "@/types/layerling";

const box = (id: string, shapeLocked?: boolean): WorkplaneShape => ({
  id, name: id, kind: "box", color: "#ff0000", x: 0, z: 0, elevation: 0, size: 20, width: 20, depth: 20, height: 20, rotation: 0, shapeLocked,
});

const props = (shapes: WorkplaneShape[], extra: Record<string, unknown> = {}) => ({
  shapes,
  selectedIds: [],
  onSelectShape: () => {},
  onToggleLock: () => {},
  onToggleHidden: () => {},
  onToggleShapeLock: () => {},
  onClose: () => {},
  ...extra,
});

const render = (shapes: WorkplaneShape[]) => renderToStaticMarkup(createElement(ObjectListPanel, props(shapes)));

// #1277: a locked shape was only to be seen in the settings of the selected part, not in the object list;
// then the list could take the lock off but not put it on.
describe("the shape lock in the object list (#1277)", () => {
  it("shows a closed shield on a part whose shape is locked, an open one on the others", () => {
    const markup = render([box("free"), box("held", true)]);
    expect(markup.match(/data-testid="outliner-shape-lock"/g)).toHaveLength(2);
    expect(markup.match(/aria-pressed="true"/g)).toHaveLength(1);
    // The open shield is kept out of sight until the row is selected or under the mouse.
    expect(markup.match(/shape-lock-btn/g)).toHaveLength(1);
  });

  it("shows no shield when the list cannot change the lock and no shape is locked", () => {
    const markup = renderToStaticMarkup(createElement(ObjectListPanel, props([box("free")], { onToggleShapeLock: undefined })));
    expect(markup).not.toContain('data-testid="outliner-shape-lock"');
  });
});

describe("the arrow keys on the grip of the object list (#1277)", () => {
  let host: HTMLDivElement | undefined;
  afterEach(() => {
    host?.remove();
    host = undefined;
  });

  it("move the entry and do not reach the editor, which would move the selected part", () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const onMoveShape = vi.fn();
    const editorKeys = vi.fn();
    host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    act(() => root.render(createElement(ObjectListPanel, props([box("a"), box("b")], { onMoveShape }))));
    window.addEventListener("keydown", editorKeys);
    try {
      const grips = host.querySelectorAll<HTMLButtonElement>(".outliner-drag-handle");
      expect(grips.length).toBe(2);
      for (const key of ["ArrowDown", "ArrowLeft"]) {
        act(() => {
          grips[0].dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
        });
      }
      expect(onMoveShape).toHaveBeenCalledTimes(1);
      expect(editorKeys).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener("keydown", editorKeys);
      act(() => root.unmount());
    }
  });
});
