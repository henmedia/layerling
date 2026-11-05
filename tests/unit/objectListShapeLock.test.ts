import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ObjectListPanel } from "@/components/workplane/ObjectListPanel";
import type { WorkplaneShape } from "@/types/layerling";

const box = (id: string, shapeLocked?: boolean): WorkplaneShape => ({
  id, name: id, kind: "box", color: "#ff0000", x: 0, z: 0, elevation: 0, size: 20, width: 20, depth: 20, height: 20, rotation: 0, shapeLocked,
});

const render = (shapes: WorkplaneShape[]) => renderToStaticMarkup(createElement(ObjectListPanel, {
  shapes,
  selectedIds: [],
  onSelectShape: () => {},
  onToggleLock: () => {},
  onToggleHidden: () => {},
  onUnlockShapeLock: () => {},
  onClose: () => {},
}));

// #1277: a locked shape was only to be seen in the settings of the selected part, not in the object list.
describe("the shape lock in the object list (#1277)", () => {
  it("shows a shield on a part whose shape is locked, and only there", () => {
    const markup = render([box("free"), box("held", true)]);
    expect(markup.match(/data-testid="outliner-shape-lock"/g)).toHaveLength(1);
  });

  it("shows no shield when no shape is locked", () => {
    expect(render([box("free")])).not.toContain('data-testid="outliner-shape-lock"');
  });
});
