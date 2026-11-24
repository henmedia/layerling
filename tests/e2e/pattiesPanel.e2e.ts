// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { ShapeInspector } from "@/components/workplane/ShapeInspector";
import { DEFAULT_PATTIES, PATTIES_PRESETS, pattiesFan, type PattiesSettings } from "@/lib/pattiesPattern";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import type { WorkplaneShape } from "@/types/layerling";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Patties, the pattern plate, in the settings panel: the rows follow the pattern and the way the plate is built,
 * the first row says what came of it, and every change goes out as the plate's settings as a whole.
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

function mount(patties: Partial<PattiesSettings>, onUpdate: (patch: Partial<WorkplaneShape>) => void = () => {}, fields: Partial<WorkplaneShape> = {}, onPattiesSvg?: () => void) {
  const asset = toolbarShapeAssets.find((entry) => entry.kind === "patties")!;
  const shape = { ...makeShapeFromAsset(asset, { x: 0, z: 0, elevation: 0 }, { patties: { ...DEFAULT_PATTIES, ...patties } }), ...fields } as WorkplaneShape;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(createElement(ShapeInspector, { shape, snap: DEFAULT_SNAP_GRID, snapOpen: false, workspace: DEFAULT_WORKPLANE_WORKSPACE, onUpdate, onPattiesSvg, onSnapChange: () => {}, onSnapOpenChange: () => {} }));
  });
  return container;
}

const rangeNames = (panel: HTMLElement) => [...panel.querySelectorAll<HTMLElement>("label.range-property .range-property-name")].map((name) => name.textContent);
const rowNamed = (panel: HTMLElement, name: string) => [...panel.querySelectorAll<HTMLLabelElement>("label.range-property")].find((row) => row.querySelector(".range-property-name")?.textContent === name);
const field = (panel: HTMLElement, name: string) => rowNamed(panel, name)!.querySelector<HTMLInputElement>("input:not([type=range])")!;
/** The select that offers this choice: the fields have no names of their own, their choices tell them apart. */
const selectWith = (panel: HTMLElement, value: string) => [...panel.querySelectorAll<HTMLSelectElement>("select")].find((select) => [...select.options].some((option) => option.value === value));
const text = (panel: HTMLElement) => panel.textContent ?? "";

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

describe("Patties in the settings panel", () => {
  it("offers the thirteen patterns and says how many figures the plate has", () => {
    const panel = mount({});
    const pattern = selectWith(panel, "warp")!;
    expect([...pattern.options].map((option) => option.textContent)).toEqual([
      "Warp grid", "Dots and stars", "Flowers", "Scales", "Waves, zigzag", "Cells", "Bricks", "Triangles", "Diamonds", "Weave", "Herringbone", "Rays", "Own figure",
    ]);
    expect(text(panel)).toContain("81 figures, 55 % of the plate.");
    expect([...selectWith(panel, "stencil")!.options].map((option) => option.value)).toEqual(["stencil", "raised", "sunk", "pieces"]);
    expect([...selectWith(panel, "fan")!.options].map((option) => option.value)).toEqual(["rectangle", "round", "fan"]);
  });

  it("shows only the rows a pattern reads", () => {
    const warp = rangeNames(mount({}));
    expect(warp).toEqual(expect.arrayContaining(["Figures across", "Rows", "Bar width", "Roundness (%)", "Turn figures (°)", "Bulge (%)", "Focus X (%)", "Focus Y (%)", "Border", "Length", "Width", "Height"]));
    for (const name of ["Corners", "Petals", "Disorder (%)", "Random layout", "Base plate", "Solid middle (%)"]) expect(warp).not.toContain(name);
    act(() => root?.unmount());
    const cells = rangeNames(mount({ ...PATTIES_PRESETS.cells, pattern: "cells" }));
    expect(cells).toEqual(expect.arrayContaining(["Disorder (%)", "Random layout", "Roundness (%)"]));
    for (const name of ["Rows", "Turn figures (°)", "Focus X (%)"]) expect(cells).not.toContain(name);
    act(() => root?.unmount());
    const dots = rangeNames(mount({ ...PATTIES_PRESETS.dots, pattern: "dots" }));
    expect(dots).toEqual(expect.arrayContaining(["Corners", "Star depth (%)"]));
  });

  it("starts a newly chosen pattern from its own settings and keeps the plate as it is", () => {
    const patches: Partial<WorkplaneShape>[] = [];
    const panel = mount({ mode: "raised", frame: 5 }, (patch) => patches.push(patch));
    choose(selectWith(panel, "warp")!, "petals");
    expect(patches.at(-1)?.patties).toMatchObject({ pattern: "petals", ...PATTIES_PRESETS.petals, mode: "raised", frame: 5 });
    expect(patches.at(-1)?.width).toBeUndefined();
  });

  it("sends a changed setting out with all the others", () => {
    const patches: Partial<WorkplaneShape>[] = [];
    const panel = mount({ count: 7 }, (patch) => patches.push(patch));
    type(field(panel, "Bar width"), "2");
    expect(patches.at(-1)?.patties).toEqual({ ...DEFAULT_PATTIES, count: 7, gap: 2 });
    type(field(panel, "Bar width"), "0.1");
    expect(patches.at(-1)?.patties?.gap).toBe(0.4);
  });

  it("gives a stamp and a mould the plate under the figures, and says how far the figures stand out", () => {
    const stamp = mount({ mode: "raised", base: 0.6 });
    expect(rangeNames(stamp)).toContain("Base plate");
    expect(text(stamp)).toContain("The figures stand 1 mm above the plate.");
    act(() => root?.unmount());
    expect(text(mount({ mode: "sunk", base: 0.6 }))).toContain("The figures reach 1 mm into the plate.");
    act(() => root?.unmount());
    const pieces = rangeNames(mount({ mode: "pieces" }));
    expect(pieces).not.toContain("Border");
    expect(pieces).not.toContain("Base plate");
  });

  it("asks for the vessel's three measures on a fan and gives the plate the fan's size", () => {
    const patches: Partial<WorkplaneShape>[] = [];
    const flat = mount({}, (patch) => patches.push(patch));
    choose(selectWith(flat, "fan")!, "fan");
    const fan = pattiesFan(DEFAULT_PATTIES);
    expect(patches.at(-1)).toMatchObject({ patties: { outline: "fan" }, width: Math.round(fan.width * 100) / 100, depth: Math.round(fan.depth * 100) / 100 });
    act(() => root?.unmount());
    const panel = mount({ outline: "fan" }, (patch) => patches.push(patch), { width: fan.width, depth: fan.depth });
    expect(rangeNames(panel)).toEqual(expect.arrayContaining(["Top diameter", "Bottom diameter", "Side length"]));
    expect(selectWith(panel, "polar")).toBeUndefined();
    expect(text(panel)).toContain("The side of the vessel, unrolled flat: 246.25 × 106.28 mm.");
    // A longer side makes the plate deeper; a wider bar leaves its size alone.
    type(field(panel, "Side length"), "120");
    expect(patches.at(-1)?.depth).toBeGreaterThan(fan.depth);
    type(field(panel, "Bar width"), "2");
    expect(patches.at(-1)?.width).toBeUndefined();
  });

  it("counts the figures round the ring and offers the solid middle when they run in rings", () => {
    const rings = rangeNames(mount({ layout: "polar" }));
    expect(rings).toEqual(expect.arrayContaining(["Figures per ring", "Solid middle (%)", "Focus to rim (%)"]));
    expect(rings).not.toContain("Figures across");
    expect(rings).not.toContain("Focus X (%)");
    expect(text(container!)).not.toContain("Ends meet round a vessel");
    act(() => root?.unmount());
    expect(text(mount({}))).toContain("Ends meet round a vessel");
  });

  it("lets the rays start from a focus of their own and cuts them into rings", () => {
    const rays = mount({ ...PATTIES_PRESETS.rays, pattern: "rays" });
    expect(rangeNames(rays)).toEqual(expect.arrayContaining(["Rows", "Open middle (%)", "Focus X (%)", "Focus Y (%)"]));
    expect(rangeNames(rays)).not.toContain("Bulge (%)");
    expect(text(rays)).toContain("How many rings the rays are cut into");
    act(() => root?.unmount());
    // Round a ring the rays start from the ring's own middle.
    expect(rangeNames(mount({ ...PATTIES_PRESETS.rays, pattern: "rays", layout: "polar" }))).not.toContain("Focus X (%)");
  });

  it("offers the ready figures for the motif pattern, and one's own once it is there", () => {
    const patches: Partial<WorkplaneShape>[] = [];
    const ready = mount({ ...PATTIES_PRESETS.motif, pattern: "motif" }, (patch) => patches.push(patch));
    const motif = selectWith(ready, "heart")!;
    expect([...motif.options].map((option) => option.textContent)).toEqual(["Heart", "Drop", "Moon", "Cross", "Leaf", "Paw"]);
    choose(motif, "paw");
    expect(patches.at(-1)?.patties).toMatchObject({ pattern: "motif", motif: "paw" });
    expect(ready.querySelector("[data-testid=patties-motif-load]")?.textContent).toBe("Load own figure (SVG, PNG, JPG)");
    expect(ready.querySelector<HTMLInputElement>("[data-testid=patties-motif-file]")?.accept).toContain(".svg");
    expect(text(ready)).toContain("Holes inside it are filled in");
    act(() => root?.unmount());
    const square = [[-0.7, -0.7, 0.7, -0.7, 0.7, 0.7, -0.7, 0.7]];
    const own = mount({ ...PATTIES_PRESETS.motif, pattern: "motif", motif: "custom", motifLoops: square }, (patch) => patches.push(patch));
    expect([...selectWith(own, "heart")!.options].map((option) => option.value)).toContain("custom");
    expect(selectWith(own, "heart")!.value).toBe("custom");
    // A ready figure chosen keeps one's own with the plate, to go back to.
    choose(selectWith(own, "heart")!, "moon");
    expect(patches.at(-1)?.patties).toMatchObject({ motif: "moon", motifLoops: square });
    act(() => root?.unmount());
    // No other pattern shows the button.
    expect(mount({}).querySelector("[data-testid=patties-motif-load]")).toBeNull();
  });

  it("offers to save the pattern as a drawing for a cutter where the editor can", () => {
    expect(mount({}).querySelector("[data-testid=patties-svg]")).toBeNull();
    act(() => root?.unmount());
    let saved = 0;
    const panel = mount({}, () => {}, {}, () => { saved += 1; });
    const button = panel.querySelector<HTMLButtonElement>("[data-testid=patties-svg]")!;
    expect(button.textContent).toBe("Save pattern as SVG");
    expect(text(panel)).toContain("for a laser cutter, a cutting plotter or a CNC mill");
    act(() => button.click());
    expect(saved).toBe(1);
  });

  it("says so when no figure fits and when there are too many", () => {
    expect(text(mount({ pattern: "petals", count: 40, gap: 6 }))).toContain("No figure fits with these settings");
    act(() => root?.unmount());
    expect(text(mount({ pattern: "dots", count: 60, gap: 0.4, frame: 0 }, () => {}, { width: 200, depth: 200, size: 200 }))).toContain("Too many figures to build");
  });
});
