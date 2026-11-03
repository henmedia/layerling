// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { ShapeInspector } from "@/components/workplane/ShapeInspector";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { workplaneShapesEqual } from "@/lib/workplaneShapes";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import type { WorkplaneShape } from "@/types/layerling";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Keep proportions in the Taper card (Discussion #1229): with it on, Length and Width of one end change together in
 * the ratio they have, while top and bottom stay apart; with it off, each field changes only itself.
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

/** The settings panel for a box with these fields, its Taper card opened. */
function mount(fields: Partial<WorkplaneShape>, onUpdate: (patch: Partial<WorkplaneShape>) => void = () => {}) {
  const asset = toolbarShapeAssets.find((entry) => entry.kind === "box")!;
  const shape = { ...makeShapeFromAsset(asset, { x: 0, z: 0 }), width: 30, depth: 20, ...fields } as WorkplaneShape;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(createElement(ShapeInspector, { shape, snap: DEFAULT_SNAP_GRID, snapOpen: false, workspace: DEFAULT_WORKPLANE_WORKSPACE, onUpdate, onSnapChange: () => {}, onSnapOpenChange: () => {} }));
  });
  const header = [...container.querySelectorAll<HTMLButtonElement>("button.property-card-header")].find((button) => button.textContent === "Taper")!;
  if (header.getAttribute("aria-expanded") !== "true") act(() => header.click());
  return container.querySelector<HTMLElement>(`#taper-${shape.id}`)!;
}

const field = (panel: HTMLElement, name: string) =>
  [...panel.querySelectorAll<HTMLLabelElement>("label.range-property")].find((label) => label.querySelector(".range-property-name")?.textContent === name)!.querySelector<HTMLInputElement>("input:not([type=range])")!;
const keepProportions = (panel: HTMLElement) =>
  [...panel.querySelectorAll<HTMLLabelElement>("label.check-property")].find((label) => label.textContent === "Keep proportions")!.querySelector<HTMLInputElement>("input")!;

function type(input: HTMLInputElement, value: string) {
  act(() => input.focus());
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  act(() => input.blur());
}

describe("keep proportions in the Taper card", () => {
  it("is off at first, and each field then changes only itself", () => {
    const patches: Partial<WorkplaneShape>[] = [];
    const panel = mount({}, (patch) => patches.push(patch));
    expect(keepProportions(panel).checked).toBe(false);
    type(field(panel, "Top Length"), "10");
    expect(patches).toEqual([{ taperTopDepth: 10, taperTopWidth: 30, taperTopScale: undefined }]);
  });

  it("is switched on and off as one patch", () => {
    const patches: Partial<WorkplaneShape>[] = [];
    const off = keepProportions(mount({}, (patch) => patches.push(patch)));
    act(() => off.click());
    act(() => root?.unmount());
    container?.remove();
    const on = keepProportions(mount({ taperKeepProportions: true }, (patch) => patches.push(patch)));
    expect(on.checked).toBe(true);
    act(() => on.click());
    expect(patches).toEqual([{ taperKeepProportions: true }, { taperKeepProportions: undefined }]);
  });

  it("changes the width of the same end with the length, and the other way round, top and bottom apart", () => {
    const patches: Partial<WorkplaneShape>[] = [];
    const panel = mount({ taperKeepProportions: true, taperTopWidth: 24, taperTopDepth: 12, taperBottomWidth: 30, taperBottomDepth: 20 }, (patch) => patches.push(patch));
    type(field(panel, "Top Length"), "6");
    type(field(panel, "Top Width"), "36");
    type(field(panel, "Bottom Length"), "10");
    type(field(panel, "Bottom Width"), "60");
    expect(patches).toEqual([
      { taperTopDepth: 6, taperTopWidth: 12, taperTopScale: undefined },
      { taperTopWidth: 36, taperTopDepth: 18, taperTopScale: undefined },
      { taperBottomDepth: 10, taperBottomWidth: 15, taperBottomScale: undefined },
      { taperBottomWidth: 60, taperBottomDepth: 40, taperBottomScale: undefined },
    ]);
  });

  it("counts as a change of the shape, so switching it is not dropped as nothing", () => {
    const shape = makeShapeFromAsset(toolbarShapeAssets.find((entry) => entry.kind === "box")!, { x: 0, z: 0 });
    expect(workplaneShapesEqual(shape, { ...shape, taperKeepProportions: true })).toBe(false);
  });
});
