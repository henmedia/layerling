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
 * Splitting one compartment of a Gridfinity bin further (#1799): the compartments card offers the row and the column
 * of a compartment, also in a bin too low for labels, and under them how many parts it is split into across and deep,
 * each a change of its own that leaves the other compartments as they are.
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
function mount(fields: Partial<WorkplaneShape>, onUpdate: (patch: Partial<WorkplaneShape>) => void = () => {}) {
  const asset = toolbarShapeAssets.find((entry) => entry.kind === "gridfinity")!;
  const shape = { ...makeShapeFromAsset(asset, { x: 0, z: 0 }), ...fields } as WorkplaneShape;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(createElement(ShapeInspector, { shape, snap: DEFAULT_SNAP_GRID, snapOpen: false, workspace: DEFAULT_WORKPLANE_WORKSPACE, onUpdate, onSnapChange: () => {}, onSnapOpenChange: () => {} }));
  });
  return container;
}

const row = (panel: HTMLElement, name: string) => [...panel.querySelectorAll<HTMLLabelElement>("label.range-property")].find((entry) => entry.querySelector(".range-property-name")?.textContent === name);
const field = (panel: HTMLElement, name: string) => row(panel, name)!.querySelector<HTMLInputElement>("input:not([type=range])")!;
/** The menu in the row of that name. */
const menu = (panel: HTMLElement, name: string) => [...panel.querySelectorAll<HTMLLabelElement>("label.select-property")].find((entry) => entry.querySelector("span")?.textContent === name)?.querySelector("select");

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

/** A bin of 2 x 1 x 3 units, 3 compartments across and 2 deep: each 26.4 x 19.2 mm inside. */
const bin = { width: 83.5, depth: 41.5, height: 25.4, gridfinityType: "bin" as const, gridfinityLip: true, gridfinityCompartmentsX: 3, gridfinityCompartmentsZ: 2 };

describe("splitting one compartment of a Gridfinity bin", () => {
  it("offers the parts across and deep for the chosen compartment, none in a bin of one compartment", () => {
    expect(row(mount({ ...bin, gridfinityCompartmentsX: 1, gridfinityCompartmentsZ: 1 }), "Split across")).toBeUndefined();
    const panel = mount(bin);
    expect(field(panel, "Split across").value).toBe("1");
    expect(field(panel, "Split deep").value).toBe("1");
    // 26.4 mm across takes 3 parts of at least 6 mm, 19.2 mm deep 2.
    expect(row(panel, "Split across")!.querySelector<HTMLInputElement>("input[type=range]")!.max).toBe("3");
    expect(row(panel, "Split deep")!.querySelector<HTMLInputElement>("input[type=range]")!.max).toBe("2");
    expect(field(mount({ ...bin, gridfinityCompartmentSplits: [{ column: 0, row: 0, x: 2 }] }), "Split across").value).toBe("2");
  });

  it("writes the chosen compartment's parts as one change, keeping the other compartments' splits", () => {
    const updates: Partial<WorkplaneShape>[] = [];
    const panel = mount({ ...bin, gridfinityCompartmentSplits: [{ column: 0, row: 0, z: 2 }] }, (patch) => updates.push(patch));
    const column = menu(panel, "Column");
    expect(column).toBeTruthy();
    choose(column!, "2");
    type(field(panel, "Split across"), "2");
    expect(updates).toEqual([{ gridfinityCompartmentSplits: [{ column: 0, row: 0, z: 2 }, { column: 2, row: 0, x: 2 }] }]);
  });

  it("takes a compartment back to whole as no split at all", () => {
    const updates: Partial<WorkplaneShape>[] = [];
    const panel = mount({ ...bin, gridfinityCompartmentSplits: [{ column: 0, row: 0, x: 2 }] }, (patch) => updates.push(patch));
    type(field(panel, "Split across"), "1");
    expect(updates).toEqual([{ gridfinityCompartmentSplits: undefined }]);
  });

  it("shows the row and the column in a bin too low for labels, so its compartments can still be split", () => {
    const panel = mount({ ...bin, height: 18.4 });
    expect(row(panel, "Split across")).toBeDefined();
    expect(menu(panel, "Column")).toBeTruthy();
    expect(panel.textContent).not.toContain("Label shelf");
  });
});
