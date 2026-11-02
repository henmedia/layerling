// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { ShapeInspector, type SbcBoardControls } from "@/components/workplane/ShapeInspector";
import { SBC_BOARDS, SBC_BOARD_ORDER } from "@/lib/sbcBoards";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import type { SbcBoardSettings, WorkplaneShape } from "@/types/layerling";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * The SBC board card (#1098): the board list and the connector clearance; either change asks for
 * the board to be made again with the new settings, and nothing else.
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

function mount(settings: SbcBoardSettings, onRegenerate: SbcBoardControls["onRegenerate"], locked = false) {
  const asset = toolbarShapeAssets.find((entry) => entry.kind === "box")!;
  const shape = { ...makeShapeFromAsset(asset, { x: 0, z: 0, elevation: 0 }), name: SBC_BOARDS[settings.board].name, sbcBoard: settings, locked } as WorkplaneShape;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(createElement(ShapeInspector, {
      shape, snap: DEFAULT_SNAP_GRID, snapOpen: false, workspace: DEFAULT_WORKPLANE_WORKSPACE,
      onUpdate: () => {}, onSnapChange: () => {}, onSnapOpenChange: () => {},
      sbcBoard: { settings, onRegenerate },
    }));
  });
  return container;
}

const card = (panel: HTMLElement) => panel.querySelector<HTMLElement>("[data-testid=sbc-board-card]")!;
const boardList = (panel: HTMLElement) => card(panel).querySelector<HTMLSelectElement>("select")!;
const clearanceField = (panel: HTMLElement) => card(panel).querySelector<HTMLInputElement>("input")!;

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

describe("the SBC board card", () => {
  it("shows the board chosen and every board in the list, and its question mark", () => {
    const panel = mount({ board: "pi4", clearance: 0 }, async () => {});
    expect(card(panel)).not.toBeNull();
    expect(boardList(panel).value).toBe("pi4");
    expect([...boardList(panel).options].map((option) => option.value)).toEqual(SBC_BOARD_ORDER);
    expect([...boardList(panel).options].map((option) => option.textContent)).toEqual(SBC_BOARD_ORDER.map((type) => SBC_BOARDS[type].name));
    expect(clearanceField(panel).value).toBe("0.00");
    expect(panel.querySelector(".sbc-board-card .inspector-help-link")).not.toBeNull();
  });

  it("makes the board again when another board is chosen, keeping the clearance", async () => {
    const asked: SbcBoardSettings[] = [];
    const panel = mount({ board: "pi5", clearance: 0.3 }, async (settings) => { asked.push(settings); });
    choose(boardList(panel), "bttPi12");
    await act(async () => {});
    expect(asked).toEqual([{ board: "bttPi12", clearance: 0.3 }]);
  });

  it("makes the board again with a new clearance, kept between 0 and 2 mm", async () => {
    const asked: SbcBoardSettings[] = [];
    const panel = mount({ board: "pi5", clearance: 0 }, async (settings) => { asked.push(settings); });
    type(clearanceField(panel), "0.4");
    await act(async () => {});
    type(clearanceField(panel), "7");
    await act(async () => {});
    expect(asked).toEqual([{ board: "pi5", clearance: 0.4 }, { board: "pi5", clearance: 2 }]);
  });

  it("asks for nothing when the value does not change, and shows a failure", async () => {
    const asked: SbcBoardSettings[] = [];
    const panel = mount({ board: "pi5", clearance: 0.3 }, async (settings) => { asked.push(settings); throw new Error("The board could not be made."); });
    type(clearanceField(panel), "0.3");
    await act(async () => {});
    expect(asked).toEqual([]);
    choose(boardList(panel), "zero2w");
    await act(async () => {});
    expect(asked).toHaveLength(1);
    expect(card(panel).querySelector("[role=alert]")?.textContent).toBe("The board could not be made.");
  });

  it("is shut for a locked board", () => {
    const panel = mount({ board: "pi5", clearance: 0 }, async () => {}, true);
    expect(boardList(panel).disabled).toBe(true);
    expect(clearanceField(panel).disabled).toBe(true);
  });

  it("makes the board again with a new reach, kept between 0 and 10 mm", async () => {
    const asked: SbcBoardSettings[] = [];
    const panel = mount({ board: "pi5", clearance: 0.3 }, async (settings) => { asked.push(settings); });
    const reachField = card(panel).querySelectorAll<HTMLInputElement>("input")[1];
    expect(reachField.value).toBe("0.00");
    type(reachField, "3");
    await act(async () => {});
    type(reachField, "25");
    await act(async () => {});
    expect(asked).toEqual([{ board: "pi5", clearance: 0.3, reach: 3 }, { board: "pi5", clearance: 0.3, reach: 10 }]);
  });
});
