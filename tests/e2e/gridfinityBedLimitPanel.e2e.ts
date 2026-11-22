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
 * How large a Gridfinity bin or tray the settings offer (#1917): as far as the bed of the printer chosen in the
 * workspace settings reaches, and the 6 units or 252 mm every bed was offered before without one.
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

/** A Bambu Lab H2C, whose bed is 330 x 320 mm, as in the discussion. */
const h2c = { ...DEFAULT_WORKPLANE_WORKSPACE, printer: "bambu-lab-h2c" };

function mount(fields: Partial<WorkplaneShape>, onUpdate: (patch: Partial<WorkplaneShape>) => void = () => {}, workspace = DEFAULT_WORKPLANE_WORKSPACE) {
  const asset = toolbarShapeAssets.find((entry) => entry.kind === "gridfinity")!;
  const shape = { ...makeShapeFromAsset(asset, { x: 0, z: 0 }), ...fields } as WorkplaneShape;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(createElement(ShapeInspector, { shape, snap: DEFAULT_SNAP_GRID, snapOpen: false, workspace, onUpdate, onSnapChange: () => {}, onSnapOpenChange: () => {} }));
  });
  return container;
}

const rowNamed = (panel: HTMLElement, name: string) => [...panel.querySelectorAll<HTMLLabelElement>("label.range-property")].find((row) => row.querySelector(".range-property-name")?.textContent === name)!;
const slider = (panel: HTMLElement, name: string) => rowNamed(panel, name).querySelector<HTMLInputElement>("input[type=range]")!;
const field = (panel: HTMLElement, name: string) => rowNamed(panel, name).querySelector<HTMLInputElement>("input:not([type=range])")!;

function type(input: HTMLInputElement, value: string) {
  act(() => input.focus());
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  act(() => input.blur());
}

const bin = { width: 83.5, depth: 41.5, height: 25.4, gridfinityType: "bin" as const, gridfinityLip: true };
const tray = { width: 80, depth: 40, height: 20, gridfinityType: "tray" as const };

describe("a Gridfinity bin's and tray's size on the chosen printer's bed (#1917)", () => {
  it("offers a bin 6 units without a printer and 7 on a bed of 330 x 320 mm, and says why", () => {
    expect(slider(mount(bin), "Units across").max).toBe("6");
    const panel = mount(bin, () => {}, h2c);
    expect([slider(panel, "Units across").max, slider(panel, "Units deep").max]).toEqual(["7", "7"]);
    expect(rowNamed(panel, "Units deep").nextElementSibling!.textContent).toContain("Up to 330 mm across and deep");
  });

  it("writes a bin of 7 units typed in on that bed", () => {
    const updates: Partial<WorkplaneShape>[] = [];
    type(field(mount(bin, (patch) => updates.push(patch), h2c), "Units across"), "7");
    expect(updates.at(-1)).toMatchObject({ width: 293.5, depth: 41.5 });
  });

  it("keeps a bin larger than the bed at its units in the field", () => {
    expect(slider(mount({ ...bin, width: 377.5 }), "Units across").max).toBe("9");
  });

  it("offers a tray up to 252 mm without a printer and up to the bed's 330 mm with one, so 282.1 mm fits", () => {
    expect(slider(mount(tray), "Width").max).toBe("252");
    const updates: Partial<WorkplaneShape>[] = [];
    const panel = mount(tray, (patch) => updates.push(patch), h2c);
    expect([slider(panel, "Width").max, slider(panel, "Length").max]).toEqual(["330", "330"]);
    type(field(panel, "Width"), "282.1");
    expect(updates.at(-1)).toMatchObject({ width: 282.1 });
  });
});
