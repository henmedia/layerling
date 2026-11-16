// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { ShapeInspector } from "@/components/workplane/ShapeInspector";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import type { WorkplaneShape } from "@/types/layerling";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * The dividers' height in a Gridfinity bin's or tray's settings (#1560): a row under the dividers' thickness once there
 * are compartments, showing the full height until it is set, and a value typed in is one change; one built at the full
 * height, within 0.1 mm of it or over, is written as unset, which the reset arrow gives back too.
 */
beforeAll(() => {
  // jsdom lays nothing out; the panel only scrolls itself back to the top.
  Element.prototype.scrollTo ??= () => {};
});

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  container = null;
  root = null;
});

/** The settings panel for a Gridfinity part with these fields. */
function mount(fields: Partial<WorkplaneShape>, onUpdate: (patch: Partial<WorkplaneShape>) => void = () => {}, workspace = DEFAULT_WORKPLANE_WORKSPACE) {
  const asset = toolbarShapeAssets.find((entry) => entry.kind === "gridfinity")!;
  const shape = { ...makeShapeFromAsset(asset, { x: 0, z: 0 }), ...fields } as WorkplaneShape;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(createElement(ShapeInspector, { shape, snap: DEFAULT_SNAP_GRID, snapOpen: false, workspace, onUpdate, onSnapChange: () => {}, onSnapOpenChange: () => {} }));
  });
  return container;
}

const rows = (panel: HTMLElement) => [...panel.querySelectorAll<HTMLLabelElement>("label.range-property")].filter((row) => row.querySelector(".range-property-name")?.textContent === "Divider height");
const field = (panel: HTMLElement) => rows(panel)[0].querySelector<HTMLInputElement>("input:not([type=range])")!;
const reset = (panel: HTMLElement) => rows(panel)[0].querySelector<HTMLButtonElement>(".property-reset");

function type(input: HTMLInputElement, value: string) {
  act(() => input.focus());
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  act(() => input.blur());
}

const bin = { width: 83.5, depth: 41.5, height: 25.4, gridfinityType: "bin" as const, gridfinityLip: true, gridfinityCompartmentsX: 2 };
const tray = { width: 80, depth: 40, height: 20, gridfinityType: "tray" as const, gridfinityCompartmentsX: 2 };

describe("the dividers' height in a Gridfinity bin's settings", () => {
  it("has one row with compartments, none without, showing the full height to begin with", () => {
    expect(rows(mount({ ...bin, gridfinityCompartmentsX: 1 }))).toHaveLength(0);
    const panel = mount(bin);
    expect(rows(panel)).toHaveLength(1);
    // 20.15 - 5.95 in a bin of 3 units, 20 - 1.2 in a tray 20 mm high.
    expect(field(panel).value).toBe("14.20");
    expect(field(mount(tray)).value).toBe("18.80");
    expect(field(mount({ ...bin, gridfinityDividerHeight: 8 })).value).toBe("8.00");
  });

  it("sits right under the dividers' thickness", () => {
    const names = [...mount(bin).querySelectorAll(".range-property-name")].map((node) => node.textContent);
    expect(names.indexOf("Divider height")).toBe(names.indexOf("Divider thickness") + 1);
  });

  it("writes a height typed in as one change, and one within 0.1 mm of the full height or over as unset", () => {
    const updates: Partial<WorkplaneShape>[] = [];
    const panel = mount(bin, (patch) => updates.push(patch));
    type(field(panel), "8");
    expect(updates).toEqual([{ gridfinityDividerHeight: 8 }]);
    type(field(panel), "1");
    expect(updates.slice(1)).toEqual([{ gridfinityDividerHeight: 3 }]);
    for (const value of ["14.1", "14.15", "14.2", "30"]) {
      const patches: Partial<WorkplaneShape>[] = [];
      type(field(mount({ ...bin, gridfinityDividerHeight: 8 }, (patch) => patches.push(patch))), value);
      expect(patches, value).toHaveLength(1);
      expect(patches[0], value).toHaveProperty("gridfinityDividerHeight", undefined);
    }
  });

  it("has no reset arrow at the full height, and one that takes a lower height back to it", () => {
    expect(reset(mount(bin))).toBeNull();
    const patches: Partial<WorkplaneShape>[] = [];
    const panel = mount({ ...bin, gridfinityDividerHeight: 8 }, (patch) => patches.push(patch));
    act(() => reset(panel)!.click());
    expect(patches).toHaveLength(1);
    expect(patches[0]).toHaveProperty("gridfinityDividerHeight", undefined);
  });

  it("takes a height saved as the default back to it, at most the bin's full height", () => {
    const saved = { ...DEFAULT_WORKPLANE_WORKSPACE, shapeCustomizations: { ...DEFAULT_WORKPLANE_WORKSPACE.shapeCustomizations, gridfinity: { gridfinityDividerHeight: 6 } } };
    expect(reset(mount({ ...bin, gridfinityDividerHeight: 6 }, () => {}, saved))).toBeNull();
    const patches: Partial<WorkplaneShape>[] = [];
    const panel = mount(bin, (patch) => patches.push(patch), saved);
    act(() => reset(panel)!.click());
    expect(patches).toEqual([{ gridfinityDividerHeight: 6 }]);
    // A default higher than a bin of 2 units stands is that bin's full height.
    const high = { ...DEFAULT_WORKPLANE_WORKSPACE, shapeCustomizations: { ...DEFAULT_WORKPLANE_WORKSPACE.shapeCustomizations, gridfinity: { gridfinityDividerHeight: 12 } } };
    expect(reset(mount({ ...bin, height: 18.4 }, () => {}, high))).toBeNull();
  });
});
