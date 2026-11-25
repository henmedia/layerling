// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShapeInspector } from "@/components/workplane/ShapeInspector";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import type { WorkplaneShape } from "@/types/layerling";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
Element.prototype.scrollTo ??= () => {};

/**
 * A changed value has a small arrow beside its name that sets it back. The arrow stands in the row's label, and a
 * browser hands a click on a label to the first control inside it: the unit beside the number, the space round it
 * and the name all set the value back (Discussion #2072). They go to the number field; only the arrow sets back.
 */
let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  container = null;
  root = null;
});

function mount(onUpdate: (patch: Partial<WorkplaneShape>) => void) {
  const asset = toolbarShapeAssets.find((entry) => entry.kind === "box")!;
  const shape = { ...makeShapeFromAsset(asset, { x: 0, z: 0 }), height: 1 } as WorkplaneShape;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(createElement(ShapeInspector, { shape, snap: DEFAULT_SNAP_GRID, snapOpen: false, workspace: DEFAULT_WORKPLANE_WORKSPACE, onUpdate, onSnapChange: () => {}, onSnapOpenChange: () => {} }));
  });
  return [...container.querySelectorAll<HTMLElement>(".range-property")].find((row) => row.querySelector(".property-reset"))!;
}

describe("a changed value's reset arrow", () => {
  for (const spot of [".range-value-unit", ".range-value-control", ".range-property-name", ".range-control"]) {
    it(`is not pressed by a click on ${spot}`, () => {
      const onUpdate = vi.fn();
      const row = mount(onUpdate);
      act(() => row.querySelector<HTMLElement>(spot)!.click());
      expect(onUpdate).not.toHaveBeenCalled();
    });
  }

  it("sets the value back when it is clicked itself", () => {
    const onUpdate = vi.fn();
    const row = mount(onUpdate);
    act(() => row.querySelector<HTMLElement>(".property-reset")!.click());
    expect(onUpdate).toHaveBeenCalled();
  });
});
