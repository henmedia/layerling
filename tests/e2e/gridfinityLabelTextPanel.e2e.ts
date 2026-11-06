// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { FontData } from "three/examples/jsm/loaders/FontLoader.js";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { ShapeInspector } from "@/components/workplane/ShapeInspector";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { onFontManagerRequested } from "@/lib/fontManagerEvents";
import { loadTextFonts, registerCustomFont, textFont } from "@/lib/textFonts";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import type { WorkplaneShape } from "@/types/layerling";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Text on a Gridfinity bin's label shelves in its settings (Discussion #1308): a text row under each shelf that is on and
 * in a compartment's label, none on a tray; a font row once a shelf has a text, with the fonts of one's own as for a
 * text, and a letter size below the letter colour; a note under a text whose letters would be under 3 mm; typing is one
 * change and a locked bin's rows take none.
 */
beforeAll(async () => {
  // jsdom lays nothing out; the panel only scrolls itself back to the top.
  Element.prototype.scrollTo ??= () => {};
  // The font list scrolls its chosen entry into view.
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

function mount(fields: Partial<WorkplaneShape>, onUpdate: (patch: Partial<WorkplaneShape>) => void = () => {}, onInteractionActiveChange?: (active: boolean) => void, workspace = DEFAULT_WORKPLANE_WORKSPACE) {
  const asset = toolbarShapeAssets.find((entry) => entry.kind === "gridfinity")!;
  const shape = { ...makeShapeFromAsset(asset, { x: 0, z: 0 }), ...fields } as WorkplaneShape;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(createElement(ShapeInspector, { shape, snap: DEFAULT_SNAP_GRID, snapOpen: false, workspace, onUpdate, onSnapChange: () => {}, onSnapOpenChange: () => {}, onInteractionActiveChange }));
  });
  return container;
}

const textRows = (panel: HTMLElement) => [...panel.querySelectorAll<HTMLLabelElement>("label.text-property")].filter((row) => row.querySelector("span")?.textContent === "Text");
const sizeRow = (panel: HTMLElement) => [...panel.querySelectorAll<HTMLLabelElement>("label.range-property")].find((row) => row.querySelector(".range-property-name")?.textContent === "Letter size");
const fontRow = (panel: HTMLElement) => [...panel.querySelectorAll<HTMLElement>("label, .font-picker, div")].find((row) => row.textContent?.startsWith("Font") && row.querySelector("button, select"));

function type(input: HTMLInputElement, value: string) {
  act(() => input.focus());
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  act(() => input.blur());
}

const bin = { width: 83.5, depth: 41.5, height: 25.4, gridfinityType: "bin" as const, gridfinityLip: true };
const tooSmall = "On this shelf the capitals would be under 3 mm high, so the text is left out. Use a shorter text, or a wider or longer shelf.";

describe("text on a Gridfinity bin's label shelves in its settings", () => {
  it("has a text row under each shelf that is on, with its text, and none under a shelf that is off", () => {
    const panel = mount({ ...bin, gridfinityLabelBack: true, gridfinityLabelLeft: true, gridfinityLabelBackText: "Screws" });
    const rows = textRows(panel);
    expect(rows).toHaveLength(2);
    expect(rows[0].querySelector("input")!.value).toBe("Screws");
    expect(rows[1].querySelector("input")!.value).toBe("");
    expect(rows[0].querySelector("input")!.maxLength).toBe(24);
  });

  it("has no text row and no font row on a tray, whose shelves run up to its top, in its compartments either", () => {
    const tray = { gridfinityType: "tray" as const, width: 80, depth: 40, height: 20 };
    const walls = mount({ ...tray, gridfinityLabelBack: true, gridfinityLabelBackText: "Screws" });
    expect(textRows(walls)).toHaveLength(0);
    expect(fontRow(walls)).toBeUndefined();
    const divided = mount({ ...tray, gridfinityCompartmentsX: 2, gridfinityCompartmentLabels: [{ column: 0, row: 0, side: "back", text: "Nuts" }] });
    expect(textRows(divided)).toHaveLength(0);
    expect(fontRow(divided)).toBeUndefined();
  });

  it("shows only the shelf's own note under a compartment's shelf too short to build, not the letters' one", () => {
    const panel = mount({ ...bin, gridfinityCompartmentsX: 3, gridfinityCompartmentLabels: [{ column: 0, row: 0, side: "back", length: 10, text: "W".repeat(24) }] });
    const notes = [...panel.querySelectorAll(".property-hint, .select-property-hint")].map((note) => note.textContent);
    expect(notes).toContain("This shelf is shorter than 4 mm and is left out.");
    expect(notes).not.toContain(tooSmall);
  });

  it("writes the text typed into the second shelf's row to that shelf", () => {
    const updates: Partial<WorkplaneShape>[] = [];
    const panel = mount({ ...bin, gridfinityLabelBack: true, gridfinityLabelLeft: true }, (patch) => updates.push(patch));
    type(textRows(panel)[1].querySelector("input")!, "Nuts");
    expect(updates).toEqual([{ gridfinityLabelLeftText: "Nuts" }]);
  });

  it("writes a font picked in the font row", () => {
    const updates: Partial<WorkplaneShape>[] = [];
    const panel = mount({ ...bin, gridfinityLabelBack: true, gridfinityLabelBackText: "Screws" }, (patch) => updates.push(patch));
    act(() => fontRow(panel)!.querySelector<HTMLButtonElement>("button")!.click());
    const serif = [...document.querySelectorAll<HTMLElement>("[role=option]")].find((option) => option.querySelector("small")?.textContent === "Serif")!;
    act(() => serif.click());
    expect(updates).toEqual([{ gridfinityLabelFont: "Serif" }]);
  });

  it("offers the fonts of one's own and the window for them, as a text's font row does, and shows a font this browser lacks as missing", () => {
    registerCustomFont({ id: "custom:0123456789abcdef", name: "Mine", data: textFont("Serif").data as unknown as FontData }, true);
    const updates: Partial<WorkplaneShape>[] = [];
    let requested = 0;
    const stop = onFontManagerRequested(() => {
      requested += 1;
    });
    const panel = mount({ ...bin, gridfinityLabelBack: true, gridfinityLabelBackText: "Screws" }, (patch) => updates.push(patch));
    const option = (label: string) => [...document.querySelectorAll<HTMLElement>("[role=option]")].find((entry) => entry.querySelector("small")?.textContent === label)!;
    act(() => fontRow(panel)!.querySelector<HTMLButtonElement>("button")!.click());
    act(() => option("Mine").click());
    act(() => fontRow(panel)!.querySelector<HTMLButtonElement>("button")!.click());
    act(() => option("Your own fonts …").click());
    stop();
    expect(updates).toEqual([{ gridfinityLabelFont: "custom:0123456789abcdef" }]);
    expect(requested).toBe(1);
    expect(fontRow(mount({ ...bin, gridfinityLabelBack: true, gridfinityLabelBackText: "Screws", gridfinityLabelFont: "custom:0123456789abcdef" }))?.textContent).toContain("Mine");
    expect(fontRow(mount({ ...bin, gridfinityLabelBack: true, gridfinityLabelBackText: "Screws", gridfinityLabelFont: "custom:fedcba9876543210" }))?.textContent).toContain("Missing font");
  });

  it("writes a text typed in as one change, held as one undo step from the field's focus to its blur", () => {
    const held: boolean[] = [];
    const updates: Partial<WorkplaneShape>[] = [];
    const panel = mount({ ...bin, gridfinityLabelBack: true }, (patch) => updates.push(patch), (active) => held.push(active));
    type(textRows(panel)[0].querySelector("input")!, "M3 x 8");
    expect(held).toEqual([true, false]);
    expect(updates).toEqual([{ gridfinityLabelBackText: "M3 x 8" }]);
  });

  it("writes an emptied text as none", () => {
    const updates: Partial<WorkplaneShape>[] = [];
    const panel = mount({ ...bin, gridfinityLabelBack: true, gridfinityLabelBackText: "M3" }, (patch) => updates.push(patch));
    type(textRows(panel)[0].querySelector("input")!, "");
    expect(updates).toStrictEqual([{ gridfinityLabelBackText: undefined }]);
  });

  it("shows the font row only once a shelf has a text, with the built-in fonts", () => {
    expect(fontRow(mount({ ...bin, gridfinityLabelBack: true }))).toBeUndefined();
    const panel = mount({ ...bin, gridfinityLabelBack: true, gridfinityLabelBackText: "Screws", gridfinityLabelFont: "Serif" });
    expect(fontRow(panel)?.textContent).toContain("Serif");
  });

  it("has a letter size row below the letter colour, 0 for as large as each shelf lets them, up to the shelf with the most room", () => {
    expect(sizeRow(mount({ ...bin, gridfinityLabelBack: true }))).toBeUndefined();
    const panel = mount({ ...bin, gridfinityLabelBack: true, gridfinityLabelBackText: "Screws" });
    const row = sizeRow(panel)!;
    const color = [...panel.querySelectorAll<HTMLElement>(".select-property")].find((entry) => entry.querySelector("span")?.textContent === "Letter colour")!;
    expect(color.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(Number(row.querySelector<HTMLInputElement>("input:not([type=range])")!.value)).toBe(0);
    expect(Number(row.querySelector<HTMLInputElement>("input[type=range]")!.max)).toBeCloseTo(12.1, 6);
    expect(row.nextElementSibling?.textContent).toBe("The capitals' height on every shelf; 0 makes them as large as each shelf lets them.");
    expect(Number(sizeRow(mount({ ...bin, gridfinityLabelBack: true, gridfinityLabelBackText: "Screws", gridfinityLabelTextSize: 6.5 }))!.querySelector<HTMLInputElement>("input:not([type=range])")!.value)).toBe(6.5);
  });

  it("writes a letter size typed in as one change, 0 as none, one under 3 mm as 3 mm and one past the shelf with the most room as that room", () => {
    const held: boolean[] = [];
    const updates: Partial<WorkplaneShape>[] = [];
    const panel = mount({ ...bin, gridfinityLabelBack: true, gridfinityLabelBackText: "Screws" }, (patch) => updates.push(patch), (active) => held.push(active));
    const input = () => sizeRow(panel)!.querySelector<HTMLInputElement>("input:not([type=range])")!;
    type(input(), "5");
    expect(held).toEqual([true, false]);
    type(input(), "2");
    type(input(), "50");
    type(input(), "0");
    expect(updates.map((patch) => patch.gridfinityLabelTextSize)).toEqual([5, 3, 12.1, undefined]);
    expect(updates[3]).toHaveProperty("gridfinityLabelTextSize", undefined);
  });

  it("writes a letter size typed under 3 mm as 3 mm, also coming down from a larger one", () => {
    const updates: Partial<WorkplaneShape>[] = [];
    const panel = mount({ ...bin, gridfinityLabelBack: true, gridfinityLabelBackText: "Screws", gridfinityLabelTextSize: 5 }, (patch) => updates.push(patch));
    type(sizeRow(panel)!.querySelector<HTMLInputElement>("input:not([type=range])")!, "2");
    expect(updates.map((patch) => patch.gridfinityLabelTextSize)).toEqual([3]);
  });

  it("offers a letter size up to 3 mm where no shelf has that much room", () => {
    const panel = mount({ ...bin, gridfinityLabelBack: true, gridfinityLabelBackWidth: 4.5, gridfinityLabelBackText: "H" });
    expect(Number(sizeRow(panel)!.querySelector<HTMLInputElement>("input[type=range]")!.max)).toBe(3);
  });

  it("shows and takes the letter size in inches in an inch workspace", () => {
    const updates: Partial<WorkplaneShape>[] = [];
    const inches = { ...DEFAULT_WORKPLANE_WORKSPACE, units: "Imperial", scale: "1:1 (inches)", inchFormat: "decimal" as const };
    const panel = mount({ ...bin, gridfinityLabelBack: true, gridfinityLabelBackText: "Screws", gridfinityLabelTextSize: 6.35 }, (patch) => updates.push(patch), undefined, inches);
    const row = sizeRow(panel)!;
    expect(row.querySelector(".range-value-unit")?.textContent).toBe("in");
    expect(row.querySelector<HTMLInputElement>("input:not([type=range])")!.value).toBe("0.25");
    type(row.querySelector<HTMLInputElement>("input:not([type=range])")!, "0.2");
    expect(updates[0].gridfinityLabelTextSize).toBeCloseTo(5.08, 9);
  });

  it("locks the letter size row of a locked bin", () => {
    expect(sizeRow(mount({ ...bin, locked: true, gridfinityLabelBack: true, gridfinityLabelBackText: "Screws" }))!.querySelector<HTMLInputElement>("input:not([type=range])")!.disabled).toBe(true);
  });

  it("says under a text that its letters are left out, on that shelf only", () => {
    const panel = mount({ ...bin, width: 41.5, gridfinityLabelBack: true, gridfinityLabelLeft: true, gridfinityLabelBackText: "AB", gridfinityLabelLeftText: "W".repeat(24) });
    const notes = [...panel.querySelectorAll(".property-hint")].filter((note) => note.textContent === tooSmall);
    expect(notes).toHaveLength(1);
    expect(notes[0].previousElementSibling).toBe(textRows(panel)[1]);
  });

  it("has a text row in a compartment's label, written into that label", () => {
    const updates: Partial<WorkplaneShape>[] = [];
    const panel = mount({ ...bin, gridfinityCompartmentsX: 2, gridfinityCompartmentLabels: [{ column: 0, row: 0, side: "back" }, { column: 1, row: 0, side: "front", text: "Nuts" }] }, (patch) => updates.push(patch));
    const rows = textRows(panel);
    expect(rows).toHaveLength(1);
    type(rows[0].querySelector("input")!, "Bolts");
    expect(updates).toEqual([{ gridfinityCompartmentLabels: [{ column: 0, row: 0, side: "back", text: "Bolts" }, { column: 1, row: 0, side: "front", text: "Nuts" }] }]);
  });

  it("writes a compartment's emptied text as none", () => {
    const updates: Partial<WorkplaneShape>[] = [];
    const panel = mount({ ...bin, gridfinityCompartmentsX: 2, gridfinityCompartmentLabels: [{ column: 0, row: 0, side: "back", text: "Nuts" }] }, (patch) => updates.push(patch));
    type(textRows(panel)[0].querySelector("input")!, "");
    expect(updates).toStrictEqual([{ gridfinityCompartmentLabels: [{ column: 0, row: 0, side: "back" }] }]);
  });

  it("locks the text rows of a locked bin", () => {
    const panel = mount({ ...bin, locked: true, gridfinityLabelBack: true, gridfinityCompartmentsX: 1 });
    expect(textRows(panel)[0].querySelector("input")!.disabled).toBe(true);
  });
});
