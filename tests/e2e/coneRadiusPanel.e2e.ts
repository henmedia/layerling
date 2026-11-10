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
 * A cone's base radius in the settings panel (#1476): a radius is a circle's, so width and length both follow it.
 * Before, only the width did, and with Keep proportions off the cone went oval.
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

function mount(fields: Partial<WorkplaneShape>, onUpdate: (patch: Partial<WorkplaneShape>) => void) {
  const asset = toolbarShapeAssets.find((entry) => entry.kind === "cone")!;
  const shape = { ...makeShapeFromAsset(asset, { x: 0, z: 0, elevation: 0 }), ...fields } as WorkplaneShape;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(createElement(ShapeInspector, { shape, snap: DEFAULT_SNAP_GRID, snapOpen: false, workspace: DEFAULT_WORKPLANE_WORKSPACE, onUpdate, onSnapChange: () => {}, onSnapOpenChange: () => {} }));
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

describe("a cone's base radius in the settings panel", () => {
  it("sets width and length both to its diameter", () => {
    const patches: Partial<WorkplaneShape>[] = [];
    const panel = mount({ width: 20, depth: 20, size: 20, baseRadius: 10, topRadius: 0 }, (patch) => patches.push(patch));
    type(field(panel, "Base Radius"), "20");
    expect(patches.at(-1)).toMatchObject({ baseRadius: 20, width: 40, depth: 40 });
  });

  it("says under Top Radius that width and length count the base circle, once the top is the wider one (#1477)", () => {
    const hint = (panel: HTMLElement) => rowNamed(panel, "Top Radius")!.nextElementSibling?.textContent ?? "";
    expect(hint(mount({ width: 20, depth: 20, baseRadius: 10, topRadius: 5 }, () => {}))).not.toContain("base circle");
    act(() => root?.unmount());
    expect(hint(mount({ width: 20, depth: 20, baseRadius: 10, topRadius: 20 }, () => {}))).toBe("Width and length count the base circle. For a cone wider at the top, set the larger radius as Base Radius and turn the cone over.");
  });

  it("makes an oval cone round again", () => {
    const patches: Partial<WorkplaneShape>[] = [];
    const panel = mount({ width: 30, depth: 16, baseRadius: 15, topRadius: 0 }, (patch) => patches.push(patch));
    type(field(panel, "Base Radius"), "12");
    expect(patches.at(-1)).toMatchObject({ baseRadius: 12, width: 24, depth: 24 });
  });
});
