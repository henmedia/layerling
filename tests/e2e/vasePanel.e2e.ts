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
 * A vase in its settings: its measures under Properties, its form, its pattern, bottom and wall, accessories and
 * printing on cards of their own; a choice shows the rows that belong to it and changes the vase's settings, and
 * the accessories card lays them out. The pattern card offers the patterns as tiles, one's own picture or text, and
 * the rows of the chosen pattern; the slicer's vase mode is a switch.
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

/** The pattern card's tiles, its More button, and switches and buttons by their names. */
const tile = (panel: HTMLElement, name: string) => [...panel.querySelectorAll<HTMLButtonElement>(".vase-pattern-options button")].find((entry) => entry.textContent === name);
const patternMore = (panel: HTMLElement) => {
  const card = header(panel, "Pattern").closest<HTMLElement>(".property-card")!;
  const more = card.querySelector<HTMLButtonElement>(".name-tag-more")!;
  if (more.getAttribute("aria-expanded") !== "true") act(() => more.click());
};
const switchNamed = (panel: HTMLElement, name: string) => [...panel.querySelectorAll<HTMLLabelElement>("label.check-property")].find((row) => row.textContent === name)?.querySelector("input");
const buttonNamed = (panel: HTMLElement, name: string) => [...panel.querySelectorAll<HTMLButtonElement>("button")].find((entry) => entry.textContent === name);

describe("a vase in its settings", () => {
  it("is in the shape library and comes out plain, as a bottle", () => {
    const { shape } = mount();
    expect(shape.kind).toBe("vase");
    expect(shape.vase?.profile).toBe("flasche");
    expect(shape.vase?.effect).toBe("keine");
  });

  it("has its form, its pattern, its bottom and wall, its accessories and printing on cards of their own", () => {
    const { panel } = mount();
    expect(headers(panel)).toEqual(expect.arrayContaining(["Form", "Pattern", "Bottom and wall", "Accessories", "Print"]));
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

  it("chooses a pattern from its tiles and shows the rows that matter most, the finer ones under More", () => {
    const { panel, calls } = mount();
    // Every pattern is a tile with a picture; a new vase is smooth.
    expect(panel.querySelectorAll(".vase-pattern-options button")).toHaveLength(27);
    expect(tile(panel, "None")?.getAttribute("aria-pressed")).toBe("true");
    expect(panel.querySelector(".vase-pattern-options .vase-tile-picture")).not.toBeNull();
    act(() => tile(panel, "Leaves")!.click());
    // Leaves start with a relief strong enough to read.
    expect(calls.updates.at(-1)?.vase).toMatchObject({ effect: "blaetter", reliefDepth: 2.4 });
    const leaves = mount({ vase: { ...calls.updates.at(-1)!.vase! } });
    // The leaf shapes as tiles of their own, and the main sliders before More.
    expect(tile(leaves.panel, "Ginkgo")).toBeDefined();
    expect(rangeNamed(leaves.panel, "Leaf size (%)")).toBeDefined();
    expect(rangeNamed(leaves.panel, "Relief height")).toBeDefined();
    expect(rangeNamed(leaves.panel, "Overlap (%)")).toBeDefined();
    expect(rangeNamed(leaves.panel, "Pattern from (%)")).toBeDefined();
    expect(rangeNamed(leaves.panel, "Tilt (°)")).toBeUndefined();
    patternMore(leaves.panel);
    expect(rangeNamed(leaves.panel, "Tilt (°)")).toBeDefined();
    expect(selectNamed(leaves.panel, "Arrangement")?.value).toBe("verstreut");
    act(() => tile(leaves.panel, "Maple")!.click());
    expect(leaves.calls.updates.at(-1)?.vase?.leafShape).toBe("ahorn");
    // One's own leaf: a board to draw half of it on.
    const own = mount({ vase: { ...leaves.shape.vase!, leafShape: "eigen" } });
    expect(own.panel.querySelector(".vase-leaf-editor svg")).not.toBeNull();
    expect(own.panel.querySelectorAll(".vase-leaf-point").length).toBeGreaterThan(3);
  });

  it("takes one's own picture or a text as the pattern: a button to load, a text field and how it is put on", () => {
    const { panel, calls } = mount();
    // The last tile; nothing to load or type before it is chosen.
    const tiles = [...panel.querySelectorAll<HTMLButtonElement>(".vase-pattern-options button")];
    expect(tiles.at(-1)?.textContent).toBe("Picture or text");
    expect(panel.querySelector(".vase-own-picture")).toBeNull();
    act(() => tile(panel, "Picture or text")!.click());
    expect(calls.updates.at(-1)?.vase?.effect).toBe("bild");
    // A quarter of the way round, large enough to read.
    expect(calls.updates.at(-1)?.vase?.patternCount).toBe(4);
    const own = mount({ vase: { ...calls.updates.at(-1)!.vase! } });
    const block = own.panel.querySelector<HTMLElement>(".vase-own-picture")!;
    expect(buttonNamed(block, "Load your own image…")).toBeDefined();
    expect(block.querySelector("input[type=file]")?.getAttribute("accept")).toBe("image/*");
    expect(block.querySelector(".cylinder-wrap-hint")?.textContent).toBe("Load a picture or type a text. Light places stand out, dark ones lie deeper.");
    const text = [...own.panel.querySelectorAll<HTMLLabelElement>("label.text-property")].find((row) => row.querySelector("span")?.textContent === "Text")!.querySelector("input")!;
    expect(text.maxLength).toBe(60);
    const placement = selectNamed(own.panel, "Placement")!;
    expect([...placement.options].map((option) => option.textContent)).toEqual(["All over", "A band all round", "Once"]);
    expect(rangeNamed(own.panel, "Relief height")).toBeDefined();
    expect(rangeNamed(own.panel, "Repeats around")).toBeDefined();
    expect(rangeNamed(own.panel, "Lean (°)")).toBeDefined();
    choose(placement, "einmal");
    expect(own.calls.updates.at(-1)?.vase?.patternFit).toBe("einmal");
    type(text, "Anna");
    expect(own.calls.updates.at(-1)?.vase?.patternText).toBe("Anna");
  });

  it("offers the worked-out patterns as tiles, the same size where the vase narrows, the width of their joints under More", () => {
    const { panel, calls } = mount();
    for (const name of ["Honeycomb", "Bricks", "Studs", "Hammered", "Knit", "Basket weave", "Rings", "Gentle hills"]) expect(tile(panel, name), name).toBeDefined();
    act(() => tile(panel, "Bricks")!.click());
    expect(calls.updates.at(-1)?.vase?.effect).toBe("ziegel");
    const bricks = mount({ vase: { ...calls.updates.at(-1)!.vase! } });
    expect(rangeNamed(bricks.panel, "Relief height")).toBeDefined();
    expect(rangeNamed(bricks.panel, "Repeats around")).toBeDefined();
    expect(rangeNamed(bricks.panel, "Lean (°)")).toBeDefined();
    patternMore(bricks.panel);
    expect(rangeNamed(bricks.panel, "Width (%)")).toBeDefined();
    expect(switchNamed(bricks.panel, "Print-friendly")?.checked).toBe(true);
    // A pattern may keep its size where the vase narrows; wisp ribs run up the vase in one piece.
    expect(switchNamed(bricks.panel, "Keep the same size")).toBeDefined();
    act(() => switchNamed(bricks.panel, "Keep the same size")!.click());
    expect(bricks.calls.updates.at(-1)?.vase?.leafFixed).toBe("ja");
    expect(switchNamed(mount({ vase: { ...bricks.shape.vase!, effect: "waben" } }).panel, "Keep the same size")).toBeDefined();
    expect(switchNamed(mount({ vase: { ...bricks.shape.vase!, effect: "wisp" } }).panel, "Keep the same size")).toBeUndefined();
    // Rings run round the vase: nothing to lean.
    const rings = mount({ vase: { ...bricks.shape.vase!, effect: "ringe" } });
    expect(rangeNamed(rings.panel, "Relief height")).toBeDefined();
    expect(rangeNamed(rings.panel, "Lean (°)")).toBeUndefined();
  });

  it("offers a smooth neck where a lid sits", () => {
    const plain = mount().shape;
    const { panel, calls } = mount({ vase: { ...plain.vase!, body: "hohl", effect: "waben", lidMode: "stuelp" } });
    const smooth = panel.querySelector<HTMLButtonElement>(".vase-neck-hint button")!;
    expect(smooth.textContent).toBe("Keep the neck smooth (pattern up to 91 %)");
    act(() => smooth.click());
    expect(calls.updates.at(-1)?.vase?.zoneTo).toBe(91);
    expect(mount({ vase: { ...plain.vase!, body: "hohl", effect: "waben", lidMode: "stuelp", zoneTo: 91 } }).panel.querySelector(".vase-neck-hint")).toBeNull();
  });

  it("has the slicer's vase mode as a switch, with how the vase is drawn", () => {
    const { panel, calls } = mount();
    // A new vase is for the vase mode, and drawn as it is printed.
    expect(switchNamed(panel, "Vase mode")?.checked).toBe(true);
    expect(switchNamed(panel, "Show as printed")?.checked).toBe(true);
    expect([...panel.querySelectorAll(".property-hint")].some((line) => line.textContent?.startsWith("The vase is a solid body, and the slicer prints a single wall of it in a spiral"))).toBe(true);
    expect(rangeNamed(panel, "Wall")).toBeUndefined();
    act(() => switchNamed(panel, "Show as printed")!.click());
    expect(calls.updates.at(-1)?.vase?.printView).toBe("nein");
    act(() => switchNamed(panel, "Vase mode")!.click());
    expect(calls.updates.at(-1)?.vase?.body).toBe("hohl");
    // With a real wall: the wall's measures, and nothing about how it is drawn.
    const hollow = mount({ vase: { ...calls.updates.at(-1)!.vase! } });
    expect(switchNamed(hollow.panel, "Vase mode")?.checked).toBe(false);
    expect(switchNamed(hollow.panel, "Show as printed")).toBeUndefined();
    expect(rangeNamed(hollow.panel, "Wall")).toBeDefined();
  });

  it("says at a glance how it prints", () => {
    const plain = mount().shape;
    const { panel } = mount({ vase: { ...plain.vase!, effect: "blaetter", printFriendly: "nein", body: "hohl", reliefDepth: 2.4 } });
    if (!panel.querySelector(".vase-print-report")) act(() => header(panel, "Print").click());
    expect(panel.querySelector(".vase-print-verdict")?.textContent).toBe("Supports recommended");
    expect(panel.querySelector(".vase-print-disclaimer")?.textContent).toBe("A guide, not a guarantee: material, layer height and slicer decide as well.");
  }, 60000);

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
