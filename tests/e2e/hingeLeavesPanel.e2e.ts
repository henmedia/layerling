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
 * The hinge's leaves in its settings: a leaf shape (plates or fingers), a corner radius, and screw holes with their
 * diameter, countersink and spacing, shown only where they apply, each change one patch.
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

/** The settings panel for a hinge with these fields. */
function mount(fields: Partial<WorkplaneShape>, onUpdate: (patch: Partial<WorkplaneShape>) => void = () => {}) {
  const asset = toolbarShapeAssets.find((entry) => entry.kind === "hinge")!;
  const shape = { ...makeShapeFromAsset(asset, { x: 0, z: 0 }), ...fields } as WorkplaneShape;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(createElement(ShapeInspector, { shape, snap: DEFAULT_SNAP_GRID, snapOpen: false, workspace: DEFAULT_WORKPLANE_WORKSPACE, onUpdate, onSnapChange: () => {}, onSnapOpenChange: () => {} }));
  });
  return container;
}

const row = (panel: HTMLElement, name: string) => [...panel.querySelectorAll<HTMLLabelElement>("label.range-property")].find((label) => label.querySelector(".range-property-name")?.textContent === name);
const field = (panel: HTMLElement, name: string) => row(panel, name)!.querySelector<HTMLInputElement>("input:not([type=range])")!;
const select = (panel: HTMLElement, option: string) => [...panel.querySelectorAll<HTMLSelectElement>("select")].find((one) => [...one.options].some((entry) => entry.value === option))!;

function type(input: HTMLInputElement, value: string) {
  act(() => input.focus());
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  act(() => input.blur());
}

function choose(element: HTMLSelectElement, value: string) {
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")!.set!.call(element, value);
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

describe("the hinge's leaves in its settings", () => {
  it("offers the leaf shape, a corner radius and screw holes, the holes' own rows only once there are holes", () => {
    const panel = mount({});
    expect(select(panel, "fingers").value).toBe("plate");
    expect(row(panel, "Corner radius")).toBeTruthy();
    expect(field(panel, "Screw holes per leaf").value).toBe("0");
    expect(row(panel, "Hole diameter")).toBeUndefined();
    expect(select(panel, "countersunk")).toBeUndefined();

    const holes = mount({ hingeScrewHoles: 2 });
    expect(field(holes, "Hole diameter").value).toBe("3.50");
    expect(select(holes, "countersunk").value).toBe("countersunk");
    expect(row(holes, "Hole spacing (along)")).toBeTruthy();
    expect(row(holes, "Hole spacing (across)")).toBeTruthy();
  });

  it("writes each change as one patch", () => {
    const patches: Partial<WorkplaneShape>[] = [];
    const panel = mount({ hingeScrewHoles: 2 }, (patch) => patches.push(patch));
    type(field(panel, "Screw holes per leaf"), "3");
    type(field(panel, "Corner radius"), "4");
    choose(select(panel, "countersunk"), "straight");
    choose(select(panel, "fingers"), "fingers");
    expect(patches).toEqual([{ hingeScrewHoles: 3 }, { hingeCornerRadius: 4 }, { hingeScrewCountersink: false }, { hingeLeafStyle: "fingers" }]);
  });

  it("says when fewer holes fit than asked for", () => {
    const panel = mount({ width: 20, hingeScrewHoles: 6 });
    // The hint stands in a line of its own right under the row.
    expect(row(panel, "Screw holes per leaf")!.nextElementSibling?.textContent).toMatch(/^Only \d fit on the leaf\.$/);
    expect(row(mount({ hingeScrewHoles: 2 }), "Screw holes per leaf")!.nextElementSibling?.textContent).toBe("0 leaves the leaves without holes.");
  });

  it("has no screw holes on fingers, and says how fingers are joined", () => {
    const panel = mount({ hingeLeafStyle: "fingers", hingeScrewHoles: 2 });
    expect(select(panel, "fingers").value).toBe("fingers");
    expect(row(panel, "Screw holes per leaf")).toBeUndefined();
    expect(row(panel, "Hole diameter")).toBeUndefined();
    expect(panel.textContent).toContain("join them to your model");
  });
});
