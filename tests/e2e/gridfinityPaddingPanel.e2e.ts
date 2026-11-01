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
 * A Gridfinity baseplate's padding in its settings (#455): a row for each side on a baseplate and
 * none on a bin, and a change of padding writes the plate's size with it, keeping the units. The
 * drawer rows show the drawer a baseplate fills and fit it to one typed in. The corner radius
 * row (#856) rounds the plate's outer corners less, down to square. The large plate switch
 * (#1061) lets a baseplate take up to 12 units.
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

const rowNamed = (panel: HTMLElement, name: string) => [...panel.querySelectorAll<HTMLLabelElement>("label.range-property")].find((row) => row.querySelector(".range-property-name")?.textContent === name);
const toggleNamed = (panel: HTMLElement, name: string) => [...panel.querySelectorAll<HTMLLabelElement>("label.check-property")].find((row) => row.textContent === name);
const hintOf = (panel: HTMLElement, name: string) => rowNamed(panel, name)!.nextElementSibling!.textContent;

function type(input: HTMLInputElement, value: string) {
  act(() => input.focus());
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  act(() => input.blur());
}

const sides = ["Padding at the back", "Padding at the front", "Padding on the left", "Padding on the right"];
const plate = { gridfinityType: "baseplate" as const, width: 252, depth: 42, height: 5 };

describe("a Gridfinity baseplate's padding in its settings", () => {
  it("has a row for each side on a baseplate, showing its padding", () => {
    const panel = mount({ ...plate, width: 266.2, gridfinityPaddingRight: 14.2 });
    sides.forEach((side) => expect(rowNamed(panel, side), side).toBeDefined());
    expect(rowNamed(panel, "Padding on the right")!.querySelector<HTMLInputElement>("input:not([type=range])")!.value).toContain("14.2");
  });

  it("has no padding or drawer rows on a bin, which keeps the setting", () => {
    const panel = mount({ gridfinityType: "bin", gridfinityPaddingRight: 14.2, gridfinityCornerRadius: 1.5 });
    [...sides, "Drawer width", "Drawer depth"].forEach((row) => expect(rowNamed(panel, row), row).toBeUndefined());
    expect(rowNamed(panel, "Corner radius")!.querySelector<HTMLInputElement>("input:not([type=range])")!.value).toContain("3.75");
  });

  it("writes the plate's size with a new padding, keeping its six units", () => {
    const updates: Partial<WorkplaneShape>[] = [];
    const panel = mount(plate, (patch) => updates.push(patch));
    type(rowNamed(panel, "Padding on the right")!.querySelector<HTMLInputElement>("input:not([type=range])")!, "41");
    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({ gridfinityPaddingRight: 41, width: 293, depth: 42 });
  });

  it("shows the drawer a baseplate fills, and fits it to a drawer typed in, in one change", () => {
    const updates: Partial<WorkplaneShape>[] = [];
    const panel = mount(plate, (patch) => updates.push(patch));
    expect(rowNamed(panel, "Drawer width")!.querySelector<HTMLInputElement>("input:not([type=range])")!.value).toContain("252.5");
    // 292.1 mm: 6 units and 19.8 mm each side, the plate 0.5 mm narrower than the drawer.
    type(rowNamed(panel, "Drawer width")!.querySelector<HTMLInputElement>("input:not([type=range])")!, "292.1");
    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({ gridfinityPaddingLeft: 19.8, gridfinityPaddingRight: 19.8, width: 291.6, depth: 42, size: 291.6 });
  });

  it("fits the depth to a drawer typed into Drawer depth, leaving the width", () => {
    const updates: Partial<WorkplaneShape>[] = [];
    const panel = mount(plate, (patch) => updates.push(patch));
    // 230 mm: 5 units and 9.75 mm at the back and the front.
    type(rowNamed(panel, "Drawer depth")!.querySelector<HTMLInputElement>("input:not([type=range])")!, "230");
    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({ gridfinityPaddingBack: 9.75, gridfinityPaddingFront: 9.75, depth: 229.5, width: 252 });
  });

  it("shows the radius a baseplate has, below the padding rows, from 0 to 4 mm", () => {
    const panel = mount({ ...plate, gridfinityCornerRadius: 1.5 });
    const row = rowNamed(panel, "Corner radius")!;
    expect(row.querySelector<HTMLInputElement>("input:not([type=range])")!.value).toContain("1.5");
    const slider = row.querySelector<HTMLInputElement>("input[type=range]")!;
    expect([slider.min, slider.max]).toEqual(["0", "4"]);
    expect(rowNamed(panel, "Padding on the right")!.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("writes a radius typed in as one change, at most 4 mm", () => {
    const updates: Partial<WorkplaneShape>[] = [];
    const panel = mount({ ...plate, gridfinityCornerRadius: 1.5 }, (patch) => updates.push(patch));
    type(rowNamed(panel, "Corner radius")!.querySelector<HTMLInputElement>("input:not([type=range])")!, "7");
    expect(updates).toEqual([{ gridfinityCornerRadius: 4 }]);
  });
});

describe("a Gridfinity baseplate's large plate switch", () => {
  const largePlate = "Large plate (up to 12 units)";

  it("shows the switch on a baseplate, off and above its units", () => {
    const panel = mount(plate);
    const toggle = toggleNamed(panel, largePlate)!;
    expect(toggle.querySelector("input")!.checked).toBe(false);
    expect(toggle.compareDocumentPosition(rowNamed(panel, "Units across")!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(hintOf(panel, "Drawer width")).toContain("334.5");
  });

  it("has no switch on a bin", () => {
    expect(toggleNamed(mount({ gridfinityType: "bin" }), largePlate)).toBeUndefined();
  });

  it("switching it on is one change that keeps the plate's size", () => {
    const updates: Partial<WorkplaneShape>[] = [];
    const panel = mount(plate, (patch) => updates.push(patch));
    act(() => toggleNamed(panel, largePlate)!.querySelector("input")!.click());
    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({ gridfinityLargePlate: true, width: 252, depth: 42 });
  });

  it("with the switch on, takes up to 12 units and fits a drawer of up to 586.5 mm", () => {
    const updates: Partial<WorkplaneShape>[] = [];
    const panel = mount({ ...plate, gridfinityLargePlate: true }, (patch) => updates.push(patch));
    expect(hintOf(panel, "Units across")).toContain("Up to 12 units across and deep instead of 6");
    expect(hintOf(panel, "Drawer width")).toContain("586.5");
    type(rowNamed(panel, "Units across")!.querySelector<HTMLInputElement>("input:not([type=range])")!, "13");
    expect(updates[0]).toMatchObject({ width: 504 });
    // 560 mm: 12 units and 55.5 mm, 27.75 each side.
    type(rowNamed(panel, "Drawer width")!.querySelector<HTMLInputElement>("input:not([type=range])")!, "560");
    expect(updates[1]).toMatchObject({ gridfinityPaddingLeft: 27.75, gridfinityPaddingRight: 27.75, width: 559.5 });
  });

  it("switching it off brings a large plate back to 6 units in one change, its padding kept", () => {
    const updates: Partial<WorkplaneShape>[] = [];
    const panel = mount({ ...plate, gridfinityLargePlate: true, width: 430, depth: 342, gridfinityPaddingLeft: 5, gridfinityPaddingRight: 5, gridfinityPaddingBack: 3, gridfinityPaddingFront: 3 }, (patch) => updates.push(patch));
    act(() => toggleNamed(panel, largePlate)!.querySelector("input")!.click());
    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({ gridfinityLargePlate: false, width: 262, depth: 258 });
  });
});
