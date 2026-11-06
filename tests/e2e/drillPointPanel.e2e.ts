// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { ShapeInspector } from "@/components/workplane/ShapeInspector";
import { drillPointLength } from "@/lib/drillPoint";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import type { WorkplaneShape } from "@/types/layerling";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * The bottom of a blind hole in the settings panel (Discussion #621): flat or a drill point at a common angle, or an
 * angle of one's own in the row under it, with the depth and the tip in its hint. Only a hole that has a bottom
 * offers it.
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

function mount(kind: WorkplaneShape["kind"], fields: Partial<WorkplaneShape>, onUpdate: (patch: Partial<WorkplaneShape>) => void = () => {}) {
  const asset = toolbarShapeAssets.find((entry) => entry.kind === kind)!;
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

describe("the bottom of a blind hole in the settings panel", () => {
  it("offers a flat bottom or a drill point at 90, 118 or 135 degrees on a cylinder set as a hole", () => {
    const patches: Partial<WorkplaneShape>[] = [];
    const panel = mount("cylinder", { hole: true }, (patch) => patches.push(patch));
    const bottom = selectNamed(panel, "Bottom")!;
    expect(bottom.value).toBe("flat");
    expect([...bottom.options].map((option) => option.textContent)).toEqual(["Flat", "Drill point 90°", "Drill point 118°", "Drill point 135°", "Drill point, other angle"]);
    // Flat, there is no angle to set.
    expect(rowNamed(panel, "Point angle")).toBeUndefined();
    choose(bottom, "118");
    expect(patches.at(-1)).toEqual({ drillPointAngle: 118 });
    choose(bottom, "custom");
    expect(patches.at(-1)).toEqual({ drillPointAngle: 118 });
  });

  it("shows the angle with the depth and the tip in its hint, takes one of its own and clamps it", () => {
    const patches: Partial<WorkplaneShape>[] = [];
    const panel = mount("cylinder", { hole: true, width: 10, depth: 10, drillPointAngle: 120 }, (patch) => patches.push(patch));
    expect(selectNamed(panel, "Bottom")!.value).toBe("custom");
    expect(field(panel, "Point angle").value).toBe("120");
    const tip = Math.round(drillPointLength(10, 120) * 100) / 100;
    expect(rowNamed(panel, "Point angle")!.nextElementSibling?.textContent).toBe(`The depth counts to the shoulder, as in a drawing; the tip lies ${tip} mm deeper. 118° is a common twist drill.`);
    type(field(panel, "Point angle"), "200");
    expect(patches.at(-1)).toEqual({ drillPointAngle: 150 });
    type(field(panel, "Point angle"), "90");
    expect(patches.at(-1)).toEqual({ drillPointAngle: 90 });
    choose(selectNamed(panel, "Bottom")!, "flat");
    expect(patches.at(-1)).toEqual({ drillPointAngle: undefined });
  });

  it("shows a common angle by its name", () => {
    expect(selectNamed(mount("cylinder", { hole: true, drillPointAngle: 135 }), "Bottom")!.value).toBe("135");
  });

  it("is on the counterbore and the countersink, which start as holes, but not when it goes through on both sides", () => {
    const counterbore = mount("counterbore", {});
    expect(selectNamed(counterbore, "Bottom")!.value).toBe("flat");
    act(() => root?.unmount());
    const countersink = mount("countersink", { drillPointAngle: 118 });
    expect(selectNamed(countersink, "Bottom")!.value).toBe("118");
    expect(field(countersink, "Point angle").value).toBe("118");
    act(() => root?.unmount());
    expect(selectNamed(mount("countersink", { kind: "doubleCountersink" }), "Bottom")).toBeUndefined();
  });

  it("leaves a solid cylinder and a tapered hole without it", () => {
    expect(selectNamed(mount("cylinder", { drillPointAngle: 118 }), "Bottom")).toBeUndefined();
    act(() => root?.unmount());
    expect(selectNamed(mount("cylinder", { hole: true, taperTopWidth: 10, taperTopDepth: 10 }), "Bottom")).toBeUndefined();
  });
});
