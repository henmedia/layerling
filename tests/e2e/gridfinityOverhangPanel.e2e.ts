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
 * A Gridfinity bin's overhang in its settings: a row for each side on a bin, none on a baseplate or a tray; the
 * chamfer and the two switches only once a side has an overhang; a value typed in writes the box and moves the bin so
 * its feet stay where they are, also turned; a chamfer flatter than 45 degrees names the side that may need supports.
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

const row = (panel: HTMLElement, name: string) => [...panel.querySelectorAll<HTMLLabelElement>("label.range-property")].find((r) => r.querySelector(".range-property-name")?.textContent === name);
const field = (panel: HTMLElement, name: string) => row(panel, name)!.querySelector<HTMLInputElement>("input:not([type=range])")!;

function type(input: HTMLInputElement, value: string) {
  act(() => input.focus());
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  act(() => input.blur());
}

const bin = { width: 83.5, depth: 41.5, height: 25.4, gridfinityType: "bin" as const, gridfinityLip: true };
const sides = ["Overhang at the back", "Overhang at the front", "Overhang on the left", "Overhang on the right"];

describe("a Gridfinity bin's overhang in its settings", () => {
  it("has a row for each side on a bin, and none on a baseplate or a tray", () => {
    const panel = mount(bin);
    sides.forEach((name) => expect(row(panel, name), name).toBeDefined());
    expect(field(panel, "Overhang on the right").value).toBe("0.00");
    sides.forEach((name) => expect(row(mount({ gridfinityType: "baseplate", width: 84, depth: 42, height: 5 }), name)).toBeUndefined());
    sides.forEach((name) => expect(row(mount({ gridfinityType: "tray", width: 80, depth: 40, height: 20 }), name)).toBeUndefined());
  });

  it("offers the chamfer and the switches only once a side has an overhang", () => {
    const plain = mount(bin).textContent ?? "";
    expect(plain).not.toContain("Chamfer under the overhang");
    expect(plain).not.toContain("Solid overhang");
    const overhung = mount({ ...bin, width: 103.5, gridfinityOverhangRight: 19.75 }).textContent ?? "";
    expect(overhung).toContain("Chamfer under the overhang");
    expect(overhung).toContain("Solid overhang");
    expect(overhung).toContain("Keep the lip on the grid");
  });

  it("greys out Solid overhang while the lip is kept on the grid, which makes the overhang solid to the lip's foot", () => {
    const toggle = (panel: HTMLElement, name: string) => [...panel.querySelectorAll<HTMLLabelElement>("label.check-property")].find((r) => r.textContent === name)!.querySelector("input")!;
    const overhung = { ...bin, width: 103.5, gridfinityOverhangRight: 19.75 };
    expect(toggle(mount(overhung), "Solid overhang").disabled).toBe(false);
    const kept = mount({ ...overhung, gridfinityOverhangLipOnGrid: true });
    expect(toggle(kept, "Solid overhang").disabled).toBe(true);
    expect(toggle(kept, "Keep the lip on the grid").disabled).toBe(false);
  });

  it("writes the box and moves a turned bin so its feet stay where they are", () => {
    const updates: Partial<WorkplaneShape>[] = [];
    const panel = mount({ ...bin, x: 0, z: 0, rotation: 37 }, (patch) => updates.push(patch));
    type(field(panel, "Overhang on the right"), "19.75");
    expect(updates).toHaveLength(1);
    const [patch] = updates;
    expect(patch).toMatchObject({ gridfinityOverhangRight: 19.75, width: 103.5, depth: 41.5 });
    expect(patch.x).toBeCloseTo(10 * Math.cos((37 * Math.PI) / 180), 9);
    expect(patch.z).toBeCloseTo(-10 * Math.sin((37 * Math.PI) / 180), 9);
  });

  it("has no angle to set: the chamfer's height alone sets the slope", () => {
    expect(row(mount({ ...bin, width: 103.5, gridfinityOverhangRight: 19.75, gridfinityOverhangChamfer: 10 }), "Chamfer angle")).toBeUndefined();
  });

  it("lets a solid overhang's chamfer go higher than a hollow one's", () => {
    const slider = (fields: Partial<WorkplaneShape>) => row(mount({ ...bin, width: 103.5, gridfinityOverhangRight: 19.75, gridfinityOverhangChamfer: 5, ...fields }), "Chamfer under the overhang")!.querySelector<HTMLInputElement>("input[type=range]")!;
    expect(Number(slider({}).max)).toBeCloseTo(13.85, 6);
    expect(Number(slider({ gridfinityOverhangSolid: true }).max)).toBeCloseTo(20, 6);
  });

  it("names the sides a chamfer flatter than 45 degrees may need supports on", () => {
    const steep = mount({ ...bin, width: 103.5, height: 32.4, gridfinityOverhangRight: 19.75, gridfinityOverhangChamfer: 20 }).textContent ?? "";
    expect(steep).not.toContain("may need supports");
    const low = mount({ ...bin, width: 103.5, gridfinityOverhangRight: 19.75, gridfinityOverhangChamfer: 10 }).textContent ?? "";
    expect(low).toContain("Flatter than 45° on the right: it may need supports to print properly.");
  });

  it("says that an opening on a wall with a solid overhang stays closed by it", () => {
    const opening = { gridfinityOpenRight: true, gridfinityOpenings: [{ side: "right", depth: 10, width: 20 }] };
    const solid = mount({ ...bin, width: 103.5, gridfinityOverhangRight: 19.75, gridfinityOverhangSolid: true, ...opening } as Partial<WorkplaneShape>).textContent ?? "";
    expect(solid).toContain("A partial opening on a side with a solid overhang is not cut through the overhang");
    const hollow = mount({ ...bin, width: 103.5, gridfinityOverhangRight: 19.75, ...opening } as Partial<WorkplaneShape>).textContent ?? "";
    expect(hollow).not.toContain("not cut through the overhang");
  });
});
