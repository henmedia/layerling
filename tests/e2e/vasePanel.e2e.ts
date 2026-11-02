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
 * A vase in its settings: its measures under Properties, its form and pattern, bottom and wall, accessories and
 * printing on cards of their own; a choice shows the rows that belong to it and changes the vase's settings, and
 * the accessories card lays them out.
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

type Calls = { updates: Array<Partial<WorkplaneShape>>; accessories: number };

/** The settings panel for a vase from the shape library, with these fields. */
function mount(fields: Partial<WorkplaneShape> = {}) {
  const calls: Calls = { updates: [], accessories: 0 };
  const asset = toolbarShapeAssets.find((entry) => entry.kind === "vase")!;
  const shape = { ...makeShapeFromAsset(asset, { x: 0, z: 0 }), ...fields } as WorkplaneShape;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(createElement(ShapeInspector, {
      shape,
      snap: DEFAULT_SNAP_GRID,
      snapOpen: false,
      workspace: DEFAULT_WORKPLANE_WORKSPACE,
      onUpdate: (patch: Partial<WorkplaneShape>) => calls.updates.push(patch),
      onSnapChange: () => {},
      onSnapOpenChange: () => {},
      onVaseAccessories: () => {
        calls.accessories += 1;
      },
    }));
  });
  return { panel: container, calls, shape };
}

const headers = (panel: HTMLElement) => [...panel.querySelectorAll<HTMLButtonElement>(".property-card-header")].map((header) => header.textContent?.trim());
const header = (panel: HTMLElement, name: string) => [...panel.querySelectorAll<HTMLButtonElement>(".property-card-header")].find((entry) => entry.textContent?.trim() === name)!;
const selectNamed = (panel: HTMLElement, name: string) => [...panel.querySelectorAll<HTMLLabelElement>("label.select-property")]
  .find((row) => row.querySelector("span")?.textContent === name)
  ?.querySelector("select") ?? undefined;
const rangeNamed = (panel: HTMLElement, name: string) => [...panel.querySelectorAll<HTMLLabelElement>("label.range-property")]
  .find((row) => row.querySelector(".range-property-name")?.textContent === name);

function choose(select: HTMLSelectElement, value: string) {
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")!.set!.call(select, value);
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

function type(input: HTMLInputElement, value: string) {
  act(() => input.focus());
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  act(() => input.blur());
}

describe("a vase in its settings", () => {
  it("is in the shape library and comes out plain, as a bottle", () => {
    const { shape } = mount();
    expect(shape.kind).toBe("vase");
    expect(shape.vase?.profile).toBe("flasche");
    expect(shape.vase?.effect).toBe("keine");
  });

  it("has its form, its bottom and wall, its accessories and printing on cards of their own", () => {
    const { panel } = mount();
    expect(headers(panel)).toEqual(expect.arrayContaining(["Form and pattern", "Bottom and wall", "Accessories", "Print"]));
    expect(selectNamed(panel, "Body form")?.value).toBe("flasche");
    expect([...panel.querySelectorAll("button")].some((button) => button.textContent === "Draw the vase")).toBe(true);
  });

  it("shows the rows of a choice and changes the vase's settings with it", () => {
    const { panel, calls } = mount();
    expect(rangeNamed(panel, "Corners")).toBeUndefined();
    choose(selectNamed(panel, "Cross-section")!, "vieleck");
    expect(calls.updates.at(-1)?.vase?.section).toBe("vieleck");
    const polygon = mount({ vase: { ...calls.updates.at(-1)!.vase! } });
    expect(rangeNamed(polygon.panel, "Corners")).toBeDefined();
  });

  it("lays its accessories out from their card", () => {
    const { panel, calls } = mount();
    act(() => header(panel, "Accessories").click());
    const button = [...panel.querySelectorAll<HTMLButtonElement>("button")].find((entry) => entry.textContent === "Lay out accessories")!;
    act(() => button.click());
    expect(calls.accessories).toBe(1);
  });

  it("fills the teapot lid's height and the joint up to the vase's height, whichever is typed", () => {
    const plain = mount().shape;
    const teapot = (lidHeight: number) => {
      const opened = mount({ height: 140, vase: { ...plain.vase!, body: "hohl", lidMode: "kanne", lidHeight } });
      // The card stays open once opened.
      if (!rangeNamed(opened.panel, "Lid height")) act(() => header(opened.panel, "Accessories").click());
      const field = (name: string) => rangeNamed(opened.panel, name)!.querySelector<HTMLInputElement>("input[type=text]")!;
      return { ...opened, lid: field("Lid height"), joint: field("Body up to · lid from") };
    };
    const vase = teapot(35);
    expect(Number(vase.lid.value)).toBe(35);
    expect(Number(vase.joint.value)).toBe(105);
    // The joint typed in: the lid is the rest.
    type(vase.joint, "90");
    expect(vase.calls.updates.at(-1)?.vase?.lidHeight).toBe(50);
    // The lid typed in: the joint follows.
    const typed = teapot(35);
    type(typed.lid, "42");
    expect(typed.calls.updates.at(-1)?.vase?.lidHeight).toBe(42);
    expect(Number(teapot(42).joint.value)).toBe(98);
    // At most seven tenths of the vase is the lid, and both show what is built.
    const tall = teapot(200);
    expect(Number(tall.lid.value)).toBe(98);
    expect(Number(tall.joint.value)).toBe(42);
    type(tall.joint, "10");
    expect(tall.calls.updates.at(-1)?.vase?.lidHeight).toBe(98);
  });
});
