// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { ShapeInspector } from "@/components/workplane/ShapeInspector";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { loadTextFonts } from "@/lib/textFonts";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import type { WorkplaneShape } from "@/types/layerling";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * The letters' colour on a Gridfinity bin's label shelves in its settings (Discussion #1308): a row below the font once a
 * shelf has a text, showing the bin's colour and saying so while the letters have none of their own; a colour picked is
 * one change, the bin's own colour or the reset arrow takes it away again, and a locked bin's row takes none.
 */
beforeAll(async () => {
  // jsdom lays nothing out; the panel only scrolls itself back to the top.
  Element.prototype.scrollTo ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
  await loadTextFonts();
});

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  container = null;
  root = null;
});

function mount(fields: Partial<WorkplaneShape>, onUpdate: (patch: Partial<WorkplaneShape>) => void = () => {}, onInteractionActiveChange?: (active: boolean) => void) {
  const asset = toolbarShapeAssets.find((entry) => entry.kind === "gridfinity")!;
  const shape = { ...makeShapeFromAsset(asset, { x: 0, z: 0 }), color: "#4f7fa8", ...fields } as WorkplaneShape;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(createElement(ShapeInspector, { shape, snap: DEFAULT_SNAP_GRID, snapOpen: false, workspace: DEFAULT_WORKPLANE_WORKSPACE, onUpdate, onSnapChange: () => {}, onSnapOpenChange: () => {}, onInteractionActiveChange }));
  });
  return container;
}

const colorRow = (panel: HTMLElement) => [...panel.querySelectorAll<HTMLElement>(".select-property")].find((row) => row.querySelector("span")?.textContent === "Letter colour");
const fontRow = (panel: HTMLElement) => [...panel.querySelectorAll<HTMLElement>("label, .font-picker, div")].find((row) => row.textContent?.startsWith("Font") && row.querySelector("button, select"));
const swatch = (row: HTMLElement) => row.querySelector<HTMLInputElement>("input[type=color]")!;
const resetButton = (row: HTMLElement) => row.querySelector<HTMLButtonElement>("button.property-reset");

/** A colour chosen in the browser's picker: the field takes it, then fires the one change it fires when the picker closes. */
function pick(input: HTMLInputElement, color: string) {
  act(() => input.focus());
  act(() => {
    input.value = color;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  act(() => input.blur());
}

const bin = { width: 83.5, depth: 41.5, height: 25.4, gridfinityType: "bin" as const, gridfinityLip: true, gridfinityLabelBack: true };
const sameAsBin = "Same as the bin";

describe("the letters' colour on a Gridfinity bin's label shelves in its settings", () => {
  it("has a row below the font once a shelf has a text, showing the bin's colour and saying so", () => {
    const panel = mount({ ...bin, gridfinityLabelBackText: "Screws" });
    const row = colorRow(panel)!;
    expect(row).toBeTruthy();
    expect(fontRow(panel)!.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(swatch(row).value).toBe("#4f7fa8");
    expect(row.textContent).toContain(sameAsBin);
    expect(resetButton(row)).toBeNull();
  });

  it("has no row without a text or on a tray, as the font has none", () => {
    expect(colorRow(mount(bin))).toBeUndefined();
    expect(colorRow(mount({ ...bin, gridfinityType: "tray", width: 80, depth: 40, height: 20, gridfinityLabelBackText: "Screws" }))).toBeUndefined();
  });

  it("shows the letters' own colour with a reset arrow, and the arrow gives them the bin's again", () => {
    const updates: Partial<WorkplaneShape>[] = [];
    const panel = mount({ ...bin, gridfinityLabelBackText: "Screws", gridfinityLabelColor: "#f2c200" }, (patch) => updates.push(patch));
    const row = colorRow(panel)!;
    expect(swatch(row).value).toBe("#f2c200");
    expect(row.textContent).not.toContain(sameAsBin);
    act(() => resetButton(row)!.click());
    expect(updates).toStrictEqual([{ gridfinityLabelColor: undefined }]);
  });

  it("shows a colour kept from before that is now the bin's own as the bin's, without a reset arrow", () => {
    const row = colorRow(mount({ ...bin, gridfinityLabelBackText: "Screws", color: "#f2c200", gridfinityLabelColor: "#f2c200" }))!;
    expect(swatch(row).value).toBe("#f2c200");
    expect(row.textContent).toContain(sameAsBin);
    expect(resetButton(row)).toBeNull();
  });

  it("writes a colour picked as one change, held as one undo step from the picker's opening to its closing", () => {
    const held: boolean[] = [];
    const updates: Partial<WorkplaneShape>[] = [];
    const panel = mount({ ...bin, gridfinityLabelBackText: "Screws" }, (patch) => updates.push(patch), (active) => held.push(active));
    pick(swatch(colorRow(panel)!), "#ff0000");
    expect(updates).toEqual([{ gridfinityLabelColor: "#ff0000" }]);
    expect(held).toEqual([true, false]);
  });

  it("writes the bin's own colour picked as none", () => {
    const updates: Partial<WorkplaneShape>[] = [];
    const panel = mount({ ...bin, gridfinityLabelBackText: "Screws", gridfinityLabelColor: "#f2c200" }, (patch) => updates.push(patch));
    pick(swatch(colorRow(panel)!), "#4f7fa8");
    expect(updates).toStrictEqual([{ gridfinityLabelColor: undefined }]);
  });

  it("locks the row of a locked bin", () => {
    const row = colorRow(mount({ ...bin, locked: true, gridfinityLabelBackText: "Screws", gridfinityLabelColor: "#f2c200" }))!;
    expect(swatch(row).disabled).toBe(true);
    expect(resetButton(row)).toBeNull();
  });
});
