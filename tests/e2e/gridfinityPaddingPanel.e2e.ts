// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { SelectionInspector, ShapeInspector } from "@/components/workplane/ShapeInspector";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import type { WorkplaneShape } from "@/types/layerling";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * A Gridfinity baseplate's padding in its settings (#455): a row for each side on a baseplate and
 * none on a bin, and a change of padding writes the plate's size with it, keeping the units. The
 * drawer rows show the drawer a baseplate fills and fit it to one typed in. The corner radius
 * row (#856) rounds the plate's outer corners less, down to square. The large plate switch
 * (#1061) lets a baseplate take up to 12 units, and the Swallowtail switch (#1061) puts it on a floor
 * with pockets for keys, which Add keys lays out beside it with the clearance set under the switch.
 * A plate larger than the chosen printer's bed is offered a split into plates that fit it (#1388), joined by
 * clips when it has clip notches, or by GridFlock's puzzle when that is switched on, its fit set under the switch.
 * A plate fitted into an outline (#1061) has its size in mm and a switch to take the outline away; a
 * baseplate and another shape selected together offer the fit. A padded plate's buttons put all the padding
 * of one direction on one side in one change, the plate keeping its size and its place (Discussion #2078).
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

/** The settings panel for a Gridfinity part with these fields, and any of the editor's actions handed in. */
function mount(fields: Partial<WorkplaneShape>, onUpdate: (patch: Partial<WorkplaneShape>) => void = () => {}, workspace = DEFAULT_WORKPLANE_WORKSPACE, actions: Partial<Parameters<typeof ShapeInspector>[0]> = {}) {
  const asset = toolbarShapeAssets.find((entry) => entry.kind === "gridfinity")!;
  const shape = { ...makeShapeFromAsset(asset, { x: 0, z: 0 }), ...fields } as WorkplaneShape;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(createElement(ShapeInspector, { shape, snap: DEFAULT_SNAP_GRID, snapOpen: false, workspace, onUpdate, onSnapChange: () => {}, onSnapOpenChange: () => {}, ...actions }));
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

describe("a Gridfinity baseplate's padding moved to one side (Discussion #2078)", () => {
  const buttonNamed = (panel: HTMLElement, name: string) => [...panel.querySelectorAll<HTMLButtonElement>("button.property-subheading-action")].find((button) => button.textContent === name);
  const moves = ["All at the back", "All at the front", "All on the left", "All on the right"];
  // A drawer 230 mm deep: 5 units and 9.75 mm at the back and the front.
  const even = { ...plate, depth: 229.5, gridfinityPaddingBack: 9.75, gridfinityPaddingFront: 9.75 };

  it("offers the four buttons on a padded baseplate only, not without padding, on a bin or on a plate fitted to an outline", () => {
    const padded = mount(even);
    moves.forEach((move) => expect(buttonNamed(padded, move), move).toBeDefined());
    // An outline plate keeps the padding settings it had before the fit, but has no padding.
    const square = [{ x: -84, z: -84 }, { x: 84, z: -84 }, { x: 84, z: 84 }, { x: -84, z: 84 }];
    for (const fields of [plate, { gridfinityType: "bin" as const, gridfinityPaddingBack: 9.75 }, { ...plate, width: 168, depth: 168, gridfinityOutline: square, gridfinityPaddingBack: 9.75 }]) {
      act(() => root?.unmount());
      const panel = mount(fields);
      moves.forEach((move) => expect(buttonNamed(panel, move), move).toBeUndefined());
    }
  });

  it("moves the padding of that direction to the side in one change, the plate keeping its size and its place", () => {
    const updates: Partial<WorkplaneShape>[] = [];
    const panel = mount(even, (patch) => updates.push(patch));
    act(() => buttonNamed(panel, "All at the front")!.click());
    // Nothing else in the change: the plate is not moved.
    expect(updates).toEqual([{ gridfinityPaddingFront: 19.5, gridfinityPaddingBack: 0, width: 252, depth: 229.5, size: 252 }]);
  });

  it("moves the padding across to the side its button names", () => {
    const updates: Partial<WorkplaneShape>[] = [];
    const panel = mount({ ...plate, width: 267, gridfinityPaddingLeft: 10, gridfinityPaddingRight: 5 }, (patch) => updates.push(patch));
    act(() => buttonNamed(panel, "All on the left")!.click());
    expect(updates).toEqual([{ gridfinityPaddingLeft: 15, gridfinityPaddingRight: 0, width: 267, depth: 42, size: 267 }]);
  });

  it("greys out a button that would change nothing", () => {
    const panel = mount({ ...even, gridfinityPaddingBack: 0, gridfinityPaddingFront: 19.5 });
    expect(moves.map((move) => buttonNamed(panel, move)!.disabled)).toEqual([false, true, true, true]);
  });

  it("is greyed out on a locked plate or one with its shape locked", () => {
    for (const lock of [{ locked: true }, { shapeLocked: true }]) {
      act(() => root?.unmount());
      const panel = mount({ ...even, ...lock });
      moves.forEach((move) => expect(buttonNamed(panel, move)!.disabled, move).toBe(true));
    }
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

describe("a Gridfinity baseplate's Swallowtail switch (#1061)", () => {
  const swallowtail = "Swallowtail";
  const addKeys = (panel: HTMLElement) => [...panel.querySelectorAll<HTMLButtonElement>("button.inspector-action-button")].find((button) => button.textContent === "Add keys");

  it("shows the switch on a baseplate, off, and none on a bin or a plate fitted to an outline", () => {
    expect(toggleNamed(mount(plate), swallowtail)!.querySelector("input")!.checked).toBe(false);
    expect(toggleNamed(mount({ gridfinityType: "bin" }), swallowtail)).toBeUndefined();
    const l = [{ x: -84, z: -84 }, { x: 84, z: -84 }, { x: 84, z: 0 }, { x: 0, z: 0 }, { x: 0, z: 84 }, { x: -84, z: 84 }];
    expect(toggleNamed(mount({ ...plate, width: 168, depth: 168, gridfinityOutline: l }), swallowtail)).toBeUndefined();
  });

  it("switching it on or off is one change with the plate's height, 7.4 or 5 mm", () => {
    const updates: Partial<WorkplaneShape>[] = [];
    const off = mount(plate, (patch) => updates.push(patch));
    act(() => toggleNamed(off, swallowtail)!.querySelector("input")!.click());
    act(() => root?.unmount());
    const on = mount({ ...plate, height: 7.4, gridfinitySwallowtail: true }, (patch) => updates.push(patch));
    act(() => toggleNamed(on, swallowtail)!.querySelector("input")!.click());
    expect(updates).toHaveLength(2);
    expect(updates[0]).toMatchObject({ gridfinitySwallowtail: true, width: 252, depth: 42, height: 7.4 });
    expect(updates[1]).toMatchObject({ gridfinitySwallowtail: false, width: 252, depth: 42, height: 5 });
  });

  it("shows the keys' clearance under the switch only while it is on, and writes one typed in as one change, at most 0.15 mm", () => {
    const updates: Partial<WorkplaneShape>[] = [];
    const panel = mount({ ...plate, height: 7.4, gridfinitySwallowtail: true, gridfinitySwallowtailClearance: 0.08 }, (patch) => updates.push(patch));
    const row = rowNamed(panel, "Key clearance")!;
    expect(row.querySelector<HTMLInputElement>("input:not([type=range])")!.value).toContain("0.08");
    const slider = row.querySelector<HTMLInputElement>("input[type=range]")!;
    expect([slider.min, slider.max]).toEqual(["0", "0.15"]);
    expect(toggleNamed(panel, swallowtail)!.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    type(row.querySelector<HTMLInputElement>("input:not([type=range])")!, "0.4");
    expect(updates).toEqual([{ gridfinitySwallowtailClearance: 0.15 }]);
    act(() => root?.unmount());
    expect(rowNamed(mount(plate), "Key clearance")).toBeUndefined();
  });

  it("says what the plate becomes, and offers Add keys when the editor hands it in and hands the click on", () => {
    let made = 0;
    const on = { ...plate, height: 7.4, gridfinitySwallowtail: true };
    const panel = mount(on, undefined, undefined, { onGridfinityKeys: () => { made += 1; } });
    expect(panel.textContent).toContain("7.4 mm tall");
    act(() => addKeys(panel)!.click());
    expect(made).toBe(1);
    act(() => root?.unmount());
    expect(addKeys(mount({ ...on, locked: true }, undefined, undefined, { onGridfinityKeys: () => {} }))!.disabled).toBe(true);
    act(() => root?.unmount());
    const bare = mount(on);
    expect(bare.textContent).toContain("7.4 mm tall");
    expect(addKeys(bare)).toBeUndefined();
    act(() => root?.unmount());
    expect(mount(plate).textContent).not.toContain("7.4 mm tall");
  });
});

describe("a Gridfinity baseplate's split to fit the printer (#1388)", () => {
  const splitButton = (panel: HTMLElement) => [...panel.querySelectorAll<HTMLButtonElement>("button.inspector-action-button")].find((button) => button.textContent === "Split to fit the printer");
  const coreOne = { ...DEFAULT_WORKPLANE_WORKSPACE, printer: "prusa-core-one", width: 250, depth: 220 };
  /** 10 x 8 units with 20 mm of padding on every side, 460 x 376 mm: four plates on the CORE One. */
  const large = { ...plate, width: 460, depth: 376, gridfinityLargePlate: true, gridfinityPaddingBack: 20, gridfinityPaddingFront: 20, gridfinityPaddingLeft: 20, gridfinityPaddingRight: 20 };
  const actions = { onGridfinitySplit: () => {} };

  it("says how many plates fit the chosen printer, and hands the click on", () => {
    let made = 0;
    const panel = mount(large, undefined, coreOne, { onGridfinitySplit: () => { made += 1; } });
    expect(panel.textContent).toContain("into 4 plates that fit the Prusa CORE One");
    act(() => splitButton(panel)!.click());
    expect(made).toBe(1);
  });

  it("says a plate with clip notches is joined by clips, with notches on the cut sides too", () => {
    const panel = mount({ ...large, gridfinityClipNotches: true }, undefined, coreOne, actions);
    expect(panel.textContent).toContain("into 4 plates that fit the Prusa CORE One, with clip notches on the cut sides too, and lays out the clips for the seams");
    expect(panel.textContent).not.toContain("each with Swallowtail, and lays out their keys");
    expect(splitButton(panel)).toBeDefined();
  });

  it("is not offered without a printer, for a plate that fits its bed, or without the editor's action", () => {
    expect(splitButton(mount(large, undefined, undefined, actions))).toBeUndefined();
    act(() => root?.unmount());
    // 5 x 5 units, 210 mm a side, fit the CORE One's 250 x 220 mm.
    expect(splitButton(mount({ ...plate, width: 210, depth: 210 }, undefined, coreOne, actions))).toBeUndefined();
    act(() => root?.unmount());
    expect(splitButton(mount(large, undefined, coreOne))).toBeUndefined();
  });

  it("is greyed out on a locked plate or one with its shape locked", () => {
    expect(splitButton(mount({ ...large, locked: true }, undefined, coreOne, actions))!.disabled).toBe(true);
    act(() => root?.unmount());
    expect(splitButton(mount({ ...large, shapeLocked: true }, undefined, coreOne, actions))!.disabled).toBe(true);
  });
});

describe("a Gridfinity baseplate's GridFlock puzzle switch", () => {
  const puzzle = "GridFlock puzzle";
  const coreOne = { ...DEFAULT_WORKPLANE_WORKSPACE, printer: "prusa-core-one", width: 250, depth: 220 };
  const large = { ...plate, width: 460, depth: 376, gridfinityLargePlate: true, gridfinityPaddingBack: 20, gridfinityPaddingFront: 20, gridfinityPaddingLeft: 20, gridfinityPaddingRight: 20 };
  const actions = { onGridfinitySplit: () => {} };

  it("shows the switch on a baseplate, off, and none on a bin or a plate fitted to an outline", () => {
    expect(toggleNamed(mount(plate), puzzle)!.querySelector("input")!.checked).toBe(false);
    expect(toggleNamed(mount({ gridfinityType: "bin" }), puzzle)).toBeUndefined();
    const l = [{ x: -84, z: -84 }, { x: 84, z: -84 }, { x: 84, z: 0 }, { x: 0, z: 0 }, { x: 0, z: 84 }, { x: -84, z: 84 }];
    expect(toggleNamed(mount({ ...plate, width: 168, depth: 168, gridfinityOutline: l }), puzzle)).toBeUndefined();
  });

  it("switching it on or off is one change, and shows the fit, 0.7 unless set, only while it is on", () => {
    const updates: Partial<WorkplaneShape>[] = [];
    const off = mount(plate, (patch) => updates.push(patch));
    expect(rowNamed(off, "Puzzle fit")).toBeUndefined();
    act(() => toggleNamed(off, puzzle)!.querySelector("input")!.click());
    act(() => root?.unmount());
    const on = mount({ ...plate, gridfinityPuzzle: true }, (patch) => updates.push(patch));
    const row = rowNamed(on, "Puzzle fit")!;
    expect(row.querySelector<HTMLInputElement>("input:not([type=range])")!.value).toContain("0.7");
    const slider = row.querySelector<HTMLInputElement>("input[type=range]")!;
    expect([slider.min, slider.max]).toEqual(["0", "1"]);
    expect(toggleNamed(on, puzzle)!.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    act(() => toggleNamed(on, puzzle)!.querySelector("input")!.click());
    expect(updates).toMatchObject([{ gridfinityPuzzle: true }, { gridfinityPuzzle: false }]);
  });

  it("writes a fit typed in as one change, at most 1", () => {
    const updates: Partial<WorkplaneShape>[] = [];
    const panel = mount({ ...plate, gridfinityPuzzle: true, gridfinityPuzzleFit: 0.8 }, (patch) => updates.push(patch));
    type(rowNamed(panel, "Puzzle fit")!.querySelector<HTMLInputElement>("input:not([type=range])")!, "1.7");
    expect(updates).toMatchObject([{ gridfinityPuzzleFit: 1 }]);
  });

  it("keeps a split piece's cells where they are when the puzzle is switched off or its fit changes", () => {
    // A piece with sockets on its left: the fingers take 0.48 mm of its box at 0.7, its body 0.24 mm right of the middle.
    const piece = { ...plate, width: 84.48, depth: 42, x: 10, z: 5, gridfinityPuzzle: true, gridfinityPuzzleSides: ["left" as const] };
    const updates: Partial<WorkplaneShape>[] = [];
    const panel = mount(piece, (patch) => updates.push(patch));
    act(() => toggleNamed(panel, puzzle)!.querySelector("input")!.click());
    type(rowNamed(panel, "Puzzle fit")!.querySelector<HTMLInputElement>("input:not([type=range])")!, "1");
    expect(updates).toHaveLength(2);
    // Off: the box shrinks to the body, and its middle moves onto the body's.
    expect(updates[0]).toMatchObject({ gridfinityPuzzle: false, width: 84, depth: 42, z: 5 });
    expect(updates[0].x).toBeCloseTo(10.24, 6);
    // Tighter: the fingers reach 0.58 mm, the box grows on the left only.
    expect(updates[1]).toMatchObject({ gridfinityPuzzleFit: 1, width: 84.58, depth: 42, z: 5 });
    expect(updates[1].x).toBeCloseTo(9.95, 6);
  });

  it("says a split plate is joined by the puzzle, with its keys laid out as well when it has Swallowtail", () => {
    const panel = mount({ ...large, gridfinityPuzzle: true }, undefined, coreOne, actions);
    expect(panel.textContent).toContain("plates that fit the Prusa CORE One, joined by GridFlock's puzzle: tabs on the cut sides at the back and right, sockets at the front and left.");
    expect(panel.textContent).not.toContain("Their Swallowtail keys");
    expect(panel.textContent).not.toContain("each with Swallowtail, and lays out their keys");
    act(() => root?.unmount());
    expect(mount({ ...large, height: 7.4, gridfinityPuzzle: true, gridfinitySwallowtail: true }, undefined, coreOne, actions).textContent).toContain("Their Swallowtail keys are laid out in front of them.");
  });
});

describe("a Gridfinity baseplate fitted into an outline", () => {
  const l = [{ x: -84, z: -84 }, { x: 84, z: -84 }, { x: 84, z: 0 }, { x: 0, z: 0 }, { x: 0, z: 84 }, { x: -84, z: 84 }];
  const outlined = { ...plate, width: 168, depth: 168, gridfinityOutline: l };

  it("shows its size in mm and how many cells it holds, and no units, drawer, padding or corner rows", () => {
    const panel = mount(outlined);
    expect(toggleNamed(panel, "Fitted to an outline")!.querySelector("input")!.checked).toBe(true);
    expect(rowNamed(panel, "Width")!.nextElementSibling!.textContent).toContain("Whole cells in the outline: 12");
    for (const gone of ["Units across", "Units deep", "Drawer width", "Drawer depth", "Corner radius", ...sides]) expect(rowNamed(panel, gone)).toBeUndefined();
  });

  it("switching the outline off is one change back to whole units in the same box", () => {
    const updates: Partial<WorkplaneShape>[] = [];
    const panel = mount(outlined, (patch) => updates.push(patch));
    act(() => toggleNamed(panel, "Fitted to an outline")!.querySelector("input")!.click());
    expect(updates).toHaveLength(1);
    expect(updates[0]).toHaveProperty("gridfinityOutline", undefined);
    expect(updates[0]).toMatchObject({ width: 168, depth: 168 });
  });

  it("keeps the Large plate switch on while the outline is wider than a plate without it, and says why", () => {
    const wide = mount({ ...plate, width: 500, depth: 100, gridfinityLargePlate: true, gridfinityOutline: [{ x: -250, z: -50 }, { x: 250, z: -50 }, { x: 250, z: 50 }, { x: -250, z: 50 }] });
    expect(toggleNamed(wide, "Large plate (up to 12 units)")!.querySelector("input")!.disabled).toBe(true);
    expect(rowNamed(wide, "Width")!.nextElementSibling!.textContent).toContain("334 mm");
    // With a baseplate saved as the default, its switch is off there: the switch offers no reset to it either.
    const plateDefault = { ...DEFAULT_WORKPLANE_WORKSPACE, shapeCustomizations: { ...DEFAULT_WORKPLANE_WORKSPACE.shapeCustomizations, gridfinity: { gridfinityType: "baseplate" as const } } };
    const changes: Partial<WorkplaneShape>[] = [];
    const saved = mount({ ...plate, width: 500, depth: 100, gridfinityLargePlate: true, gridfinityOutline: [{ x: -250, z: -50 }, { x: 250, z: -50 }, { x: 250, z: 50 }, { x: -250, z: 50 }] }, (patch) => changes.push(patch), plateDefault);
    expect(toggleNamed(saved, "Large plate (up to 12 units)")!.parentElement!.querySelector(".property-reset")).toBeNull();
    expect(changes).toEqual([]);
  });

  it("lets the Large plate switch off when the outline fits a plate without it", () => {
    const narrow = mount({ ...outlined, gridfinityLargePlate: true });
    expect(toggleNamed(narrow, "Large plate (up to 12 units)")!.querySelector("input")!.disabled).toBe(false);
  });

  it("points a plain baseplate to the fit", () => {
    expect(rowNamed(mount(plate), "Drawer depth")!.nextElementSibling!.textContent).toContain("Fit baseplate to outline");
  });
});

describe("a baseplate and another shape selected together (#1061)", () => {
  function mountSelection(shapes: WorkplaneShape[], onFit: (plateId: string, sourceId: string) => void = () => {}) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root!.render(createElement(SelectionInspector, { shapes, onSetHole: () => {}, onSetColor: () => {}, onToggleLocked: () => {}, onFitGridfinityOutline: onFit, workspace: DEFAULT_WORKPLANE_WORKSPACE, snap: DEFAULT_SNAP_GRID, snapOpen: false, onSnapChange: () => {}, onSnapOpenChange: () => {} }));
    });
    return container;
  }
  const asset = (kind: string) => toolbarShapeAssets.find((entry) => entry.kind === kind)!;
  const basePlate = { ...makeShapeFromAsset(asset("gridfinity"), { x: 0, z: 0 }), ...plate, id: "plate" } as WorkplaneShape;
  const box = { ...makeShapeFromAsset(asset("box"), { x: 0, z: 0 }), id: "box" } as WorkplaneShape;
  const fitButton = (panel: HTMLElement) => [...panel.querySelectorAll("button")].find((button) => button.textContent === "Fit baseplate to outline");

  it("offers the fit and hands it the plate and the other shape", () => {
    const fitted: string[][] = [];
    const panel = mountSelection([box, basePlate], (plateId, sourceId) => fitted.push([plateId, sourceId]));
    act(() => fitButton(panel)!.click());
    expect(fitted).toEqual([["plate", "box"]]);
  });

  it("offers it for exactly one baseplate", () => {
    expect(fitButton(mountSelection([basePlate, { ...basePlate, id: "other" }]))).toBeUndefined();
  });

  it("greys it out with a locked shape", () => {
    expect(fitButton(mountSelection([basePlate, { ...box, locked: true }]))!.disabled).toBe(true);
  });
});

describe("a Gridfinity baseplate's clip notches in its settings", () => {
  const notches = "Clip notches";
  const addClips = "Add clips";

  it("offers the switch on a baseplate, and Add clips with a count once it is on, each handing the count to the editor", () => {
    const updates: Array<Partial<WorkplaneShape>> = [];
    const counts: number[] = [];
    const actions = { onGridfinityClips: (count: number) => { counts.push(count); } };
    const off = mount(plate, (patch) => updates.push(patch), undefined, actions);
    expect(toggleNamed(off, addClips)).toBeUndefined();
    expect(toggleNamed(mount({ gridfinityType: "bin" }), notches)).toBeUndefined();
    act(() => toggleNamed(off, notches)!.querySelector("input")!.click());
    expect(updates).toEqual([{ gridfinityClipNotches: true }]);
    act(() => root?.unmount());
    // Switched on, no clips yet: Add clips lays out one, and only then is there a count to change.
    const on = mount({ ...plate, gridfinityClipNotches: true }, undefined, undefined, actions);
    expect(toggleNamed(on, addClips)!.querySelector("input")!.checked).toBe(false);
    expect(rowNamed(on, "Clips")).toBeUndefined();
    act(() => toggleNamed(on, addClips)!.querySelector("input")!.click());
    expect(counts).toEqual([1]);
    act(() => root?.unmount());
    const five = mount({ ...plate, gridfinityClipNotches: true, gridfinityClipCount: 1 }, undefined, undefined, actions);
    expect(toggleNamed(five, addClips)!.querySelector("input")!.checked).toBe(true);
    type(rowNamed(five, "Clips")!.querySelector<HTMLInputElement>("input:not([type=range])")!, "5");
    expect(counts).toEqual([1, 5]);
    act(() => toggleNamed(five, addClips)!.querySelector("input")!.click());
    expect(counts).toEqual([1, 5, 0]);
  });
});
