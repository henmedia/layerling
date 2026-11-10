// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { ShapeInspector } from "@/components/workplane/ShapeInspector";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import type { WorkplaneShape, WorkplaneWorkspaceSettings } from "@/types/layerling";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * A diameter or radius typed beyond the slider's end (drucktipps3d forum, "Zylinder Durchmesser max. 160mm?"): a
 * cylinder of 198 mm was cut to 160, as the diameter field was not among the fields that may be typed past the
 * slider, as width, length and height may. The cone's radii were cut the same way.
 */
beforeAll(() => {
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

function mount(kind: WorkplaneShape["kind"], fields: Partial<WorkplaneShape>, onUpdate: (patch: Partial<WorkplaneShape>) => void, workspace: WorkplaneWorkspaceSettings = DEFAULT_WORKPLANE_WORKSPACE) {
  const asset = toolbarShapeAssets.find((entry) => entry.kind === kind)!;
  const shape = { ...makeShapeFromAsset(asset, { x: 0, z: 0, elevation: 0 }), ...fields } as WorkplaneShape;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(createElement(ShapeInspector, { shape, snap: DEFAULT_SNAP_GRID, snapOpen: false, workspace, onUpdate, onSnapChange: () => {}, onSnapOpenChange: () => {} }));
  });
  return container;
}

const rowNamed = (panel: HTMLElement, name: string) => [...panel.querySelectorAll<HTMLLabelElement>("label.range-property")].find((row) => row.querySelector(".range-property-name")?.textContent === name);
const field = (panel: HTMLElement, name: string) => rowNamed(panel, name)!.querySelector<HTMLInputElement>("input:not([type=range])")!;

function type(input: HTMLInputElement, value: string) {
  act(() => input.focus());
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  act(() => input.blur());
}

describe("a diameter or radius typed beyond the slider", () => {
  it("gives a cylinder the 198 mm typed, not 160", () => {
    const patches: Partial<WorkplaneShape>[] = [];
    const panel = mount("cylinder", {}, (patch) => patches.push(patch));
    type(field(panel, "Diameter"), "198");
    expect(patches.at(-1)).toMatchObject({ width: 198, depth: 198 });
  });

  it("gives a curved cone the width typed", () => {
    const patches: Partial<WorkplaneShape>[] = [];
    const panel = mount("curvedCone", {}, (patch) => patches.push(patch));
    type(field(panel, "Width"), "198");
    expect(patches.at(-1)).toMatchObject({ width: 198 });
  });

  it("gives a cone the radii typed", () => {
    const patches: Partial<WorkplaneShape>[] = [];
    const panel = mount("cone", { width: 20, depth: 20, baseRadius: 10, topRadius: 0 }, (patch) => patches.push(patch));
    type(field(panel, "Base Radius"), "99");
    expect(patches.at(-1)).toMatchObject({ baseRadius: 99, width: 198, depth: 198 });
    type(field(panel, "Top Radius"), "60");
    expect(patches.at(-1)).toMatchObject({ topRadius: 60 });
  });

  it("holds a diameter to the largest size set for the shape in the settings", () => {
    const patches: Partial<WorkplaneShape>[] = [];
    const workspace = { ...DEFAULT_WORKPLANE_WORKSPACE, shapeCustomizations: { cylinder: { maxDimension: 300 } } } as WorkplaneWorkspaceSettings;
    const panel = mount("cylinder", {}, (patch) => patches.push(patch), workspace);
    const slider = rowNamed(panel, "Diameter")!.querySelector<HTMLInputElement>("input[type=range]")!;
    expect(Number(slider.max)).toBe(300);
  });
});
