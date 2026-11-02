// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { ShapeInspector } from "@/components/workplane/ShapeInspector";
import { PORT_PRESETS, portPresetSize } from "@/lib/portGeometry";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import type { WorkplaneShape } from "@/types/layerling";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * A port opening's settings: Micro-HDMI in the socket list, and Extra clearance, which grows the opening on every
 * side so the board slides into a printed box; the socket stays chosen in the list.
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

function mount(fields: Partial<WorkplaneShape>, onUpdate: (patch: Partial<WorkplaneShape>) => void = () => {}) {
  const asset = toolbarShapeAssets.find((entry) => entry.kind === "port")!;
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
const selectNamed = (panel: HTMLElement, name: string) => [...panel.querySelectorAll<HTMLLabelElement>("label.select-property")].find((row) => row.querySelector("span")?.textContent === name)?.querySelector("select");

function type(input: HTMLInputElement, value: string) {
  act(() => input.focus());
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  act(() => input.blur());
}

function choose(select: HTMLSelectElement, value: string) {
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")!.set!.call(select, value);
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

const micro = PORT_PRESETS.microHdmi;

describe("a port opening's Micro-HDMI and extra clearance", () => {
  it("offers Micro-HDMI after Mini-HDMI and sets its opening", () => {
    const patches: Partial<WorkplaneShape>[] = [];
    const panel = mount({}, (patch) => patches.push(patch));
    const list = selectNamed(panel, "Socket")!;
    const labels = [...list.options].map((option) => option.textContent);
    expect(labels.indexOf("Micro-HDMI")).toBe(labels.indexOf("Mini-HDMI") + 1);
    choose(list, "microHdmi");
    expect(patches.at(-1)).toMatchObject({ width: micro.width, height: micro.height, cornerFillet: micro.corner, portProfile: "microHdmi" });
  });

  it("starts at no extra clearance, so an opening is the socket's own", () => {
    expect(field(mount({}), "Extra clearance").value).toBe("0.00");
  });

  it("grows the opening on every side and keeps its middle, and the socket stays chosen", () => {
    const patches: Partial<WorkplaneShape>[] = [];
    const panel = mount({ width: micro.width, height: micro.height, cornerFillet: micro.corner, portProfile: "microHdmi", elevation: 10 }, (patch) => patches.push(patch));
    type(field(panel, "Extra clearance"), "0.3");
    const patch = patches.at(-1)!;
    expect(patch.width).toBeCloseTo(micro.width + 0.6, 9);
    expect(patch.height).toBeCloseTo(micro.height + 0.6, 9);
    expect(patch.cornerFillet).toBeCloseTo(micro.corner + 0.3, 9);
    expect(patch.elevation).toBeCloseTo(10 - 0.3, 9);
    expect(patch.portClearance).toBe(0.3);
    const grown = portPresetSize("microHdmi", 0.3);
    const again = mount({ width: grown.width, height: grown.height, cornerFillet: grown.corner, portProfile: "microHdmi", portClearance: 0.3 });
    expect(selectNamed(again, "Socket")!.value).toBe("microHdmi");
  });

  it("takes a socket chosen later with the clearance set", () => {
    const patches: Partial<WorkplaneShape>[] = [];
    const grown = portPresetSize("usbC", 0.5);
    const panel = mount({ width: grown.width, height: grown.height, cornerFillet: grown.corner, portClearance: 0.5 }, (patch) => patches.push(patch));
    choose(selectNamed(panel, "Socket")!, "hdmi");
    expect(patches.at(-1)).toMatchObject({ width: 16.7, height: 7.2, portProfile: "hdmi" });
    expect(patches.at(-1)!.cornerFillet).toBeCloseTo(0.8, 9);
  });
});
