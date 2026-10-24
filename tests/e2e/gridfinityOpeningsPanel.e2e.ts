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
 * A Gridfinity bin's partly open sides in its settings (#455): the four open switches drawn as a cross, seen from
 * above, and under it, for each side switched open, its opening's depth, width, place and distance, the distance only
 * when it sits at an end; each value typed or chosen is one change.
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

const bin = { width: 83.5, depth: 41.5, height: 25.4, gridfinityType: "bin" as const, gridfinityLip: true };

describe("a Gridfinity bin's partly open sides in its settings", () => {
  it("draws the four open switches together as a cross, each placed by its side's name, in the order they are seen", () => {
    const cross = mount(bin).querySelectorAll(".property-layout-sides");
    expect(cross).toHaveLength(1);
    const rows = [...cross[0].querySelectorAll("label.check-property")];
    expect(rows.map((row) => row.textContent)).toEqual(["Open at the back", "Open on the left", "Open on the right", "Open at the front"]);
    expect(rows.map((row) => [...row.classList].find((name) => name !== "check-property"))).toEqual(["check-property-back", "check-property-left", "check-property-right", "check-property-front"]);
  });

  it("shows an open side's opening as built, the whole side to begin with, and no rows for a closed side", () => {
    const panel = mount({ ...bin, gridfinityOpenFront: true });
    expect(field(panel, "Depth at the front").value).toBe("19.45");
    expect(field(panel, "Width at the front").value).toBe("76.00");
    expect(selectNamed(panel, "Position at the front")!.value).toBe("middle");
    expect([...selectNamed(panel, "Position at the front")!.options].map((option) => option.text)).toEqual(["Left", "Middle", "Right"]);
    expect(rowNamed(panel, "Distance at the front")).toBeUndefined();
    expect(panel.textContent).toContain("Opened its whole width down to the floor, the side is open in full");
    for (const label of ["Depth at the back", "Depth on the left", "Depth on the right"]) expect(rowNamed(panel, label), label).toBeUndefined();
  });

  it("shows the distance for an opening at an end, and a side wall's positions from the back", () => {
    const panel = mount({ ...bin, gridfinityOpenLeft: true, gridfinityOpenings: [{ side: "left", width: 10, align: "start", distance: 3 }] });
    expect(field(panel, "Width on the left").value).toBe("10.00");
    expect(field(panel, "Distance on the left").value).toBe("3.00");
    expect([...selectNamed(panel, "Position on the left")!.options].map((option) => option.text)).toEqual(["Back", "Middle", "Front"]);
  });

  it("keeps a partly open side's shelf switch away, as on any open side", () => {
    expect(mount({ ...bin, gridfinityOpenFront: true, gridfinityOpenings: [{ side: "front", width: 20 }] }).textContent).not.toContain("Label shelf at the front");
  });

  it("writes each value typed or chosen as one change, the other sides' openings kept", () => {
    const updates: Partial<WorkplaneShape>[] = [];
    const left = { side: "left" as const, depth: 5 };
    const panel = mount({ ...bin, gridfinityOpenFront: true, gridfinityOpenLeft: true, gridfinityOpenings: [left] }, (patch) => updates.push(patch));
    type(field(panel, "Depth at the front"), "10");
    expect(updates).toEqual([{ gridfinityOpenings: [left, { side: "front", depth: 10 }] }]);
    type(field(panel, "Width at the front"), "30");
    expect(updates.slice(1)).toEqual([{ gridfinityOpenings: [left, { side: "front", width: 30 }] }]);
    choose(selectNamed(panel, "Position at the front")!, "end");
    expect(updates.slice(2)).toEqual([{ gridfinityOpenings: [left, { side: "front", align: "end" }] }]);
  });

  it("shows the corners of the notches once, only when a side is opened partly, within what they take", () => {
    expect(selectNamed(mount({ ...bin, gridfinityOpenFront: true }), "Opening corners")).toBeUndefined();
    expect(rowNamed(mount({ ...bin, gridfinityOpenFront: true }), "Opening corner size")).toBeUndefined();
    const panel = mount({ ...bin, gridfinityOpenFront: true, gridfinityOpenLeft: true, gridfinityOpenings: [{ side: "front", width: 6, depth: 3 }, { side: "left", width: 6, depth: 3 }], gridfinityOpeningCornerSize: 5 });
    expect(selectNamed(panel, "Opening corners")!.value).toBe("round");
    expect([...selectNamed(panel, "Opening corners")!.options].map((option) => option.text)).toEqual(["Round", "Chamfer"]);
    expect([...panel.querySelectorAll(".range-property-name")].filter((name) => name.textContent === "Opening corner size")).toHaveLength(1);
    expect(field(panel, "Opening corner size").value).toBe("3.00");
  });

  it("writes the corners' shape and size as one change each", () => {
    const updates: Partial<WorkplaneShape>[] = [];
    const panel = mount({ ...bin, gridfinityOpenFront: true, gridfinityOpenings: [{ side: "front", width: 20, depth: 10 }] }, (patch) => updates.push(patch));
    expect(field(panel, "Opening corner size").value).toBe("0.00");
    type(field(panel, "Opening corner size"), "2");
    choose(selectNamed(panel, "Opening corners")!, "chamfer");
    expect(updates).toEqual([{ gridfinityOpeningCornerSize: 2 }, { gridfinityOpeningCorner: "chamfer" }]);
  });
});
