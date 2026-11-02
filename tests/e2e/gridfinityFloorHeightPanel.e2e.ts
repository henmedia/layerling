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
 * A Gridfinity bin's floor height in its settings (#1126): with the lip it goes on to the lip's top,
 * skipping the heights between that and where a bin still stacks on it, which the hint names; a
 * filled bin has no lip chamfer, wall or open sides to set.
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

/** The settings panel for a Gridfinity part with these fields, which takes each change as the editor does. */
function mount(fields: Partial<WorkplaneShape>, onUpdate: (patch: Partial<WorkplaneShape>) => void = () => {}) {
  const asset = toolbarShapeAssets.find((entry) => entry.kind === "gridfinity")!;
  let shape = { ...makeShapeFromAsset(asset, { x: 0, z: 0 }), ...fields } as WorkplaneShape;
  const render = () => root!.render(createElement(ShapeInspector, {
    shape, snap: DEFAULT_SNAP_GRID, snapOpen: false, workspace: DEFAULT_WORKPLANE_WORKSPACE, onSnapChange: () => {}, onSnapOpenChange: () => {},
    onUpdate: (patch: Partial<WorkplaneShape>) => {
      onUpdate(patch);
      shape = { ...shape, ...patch };
      render();
    },
  }));
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(render);
  return container;
}

const rowNamed = (panel: HTMLElement, name: string) => [...panel.querySelectorAll<HTMLLabelElement>("label.range-property")].find((row) => row.querySelector(".range-property-name")?.textContent === name);
const field = (panel: HTMLElement) => rowNamed(panel, "Floor height")!.querySelector<HTMLInputElement>("input:not([type=range])")!;
const slider = (panel: HTMLElement) => rowNamed(panel, "Floor height")!.querySelector<HTMLInputElement>("input[type=range]")!;
const hint = (panel: HTMLElement) => rowNamed(panel, "Floor height")!.nextElementSibling?.textContent;

function type(input: HTMLInputElement, value: string) {
  act(() => input.focus());
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  act(() => input.blur());
}

/** Up or Down in the field, focused first. */
function press(input: HTMLInputElement, key: string) {
  act(() => input.focus());
  act(() => { input.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true })); });
}

const bin = { width: 83.5, depth: 41.5, height: 25.4, gridfinityType: "bin" as const, gridfinityLip: true };

describe("a Gridfinity bin's floor height in its settings", () => {
  it("goes on to the lip's top on a bin with the lip, naming where a bin still stacks on it", () => {
    const panel = mount(bin);
    expect(field(panel).value).toBe("5.95");
    expect(Number(slider(panel).max)).toBeCloseTo(25.4, 6);
    expect(hint(panel)).toBe("The bin is solid from its underside up to this height, a blank to cut shapes into. Up to 19.35 mm another bin still stacks on it; above that the stacking lip is filled too, for a flat top.");
  });

  it("goes up to the top without the lip, with the hint as before", () => {
    const panel = mount({ ...bin, height: 21, gridfinityLip: false });
    expect(Number(slider(panel).max)).toBeCloseTo(21, 6);
    expect(hint(panel)).toBe("The bin is solid from its underside up to this height, a blank to cut shapes into.");
  });

  it("has a row on a bin of 1 height unit with the lip, which can only be filled", () => {
    const panel = mount({ ...bin, width: 41.5, height: 7 + 4.4 });
    expect(Number(slider(panel).max)).toBeCloseTo(11.4, 6);
    expect(hint(panel)).toContain("Up to 5.95 mm another bin still stacks on it");
  });

  it("shows a bin filled to the lip's top with no lip chamfer, wall or open sides", () => {
    for (const floor of [25.4, 30]) {
      const panel = mount({ ...bin, gridfinityFloorHeight: floor, gridfinityLipChamfer: 0.5 });
      expect(field(panel).value).toBe("25.40");
      expect(rowNamed(panel, "Lip chamfer")).toBeUndefined();
      expect(rowNamed(panel, "Wall thickness")).toBeUndefined();
      expect(panel.textContent).not.toContain("Open at the front");
    }
    const stacking = mount({ ...bin, gridfinityFloorHeight: 19.35, gridfinityLipChamfer: 0.5 });
    expect(rowNamed(stacking, "Lip chamfer")).toBeDefined();
    expect(rowNamed(stacking, "Wall thickness")).toBeDefined();
    expect(stacking.textContent).toContain("Open at the front");
  });

  it("writes a floor typed in as one change, and any higher than a bin still stacks on as the lip's top", () => {
    const updates: Partial<WorkplaneShape>[] = [];
    const panel = mount(bin, (patch) => updates.push(patch));
    type(field(panel), "19.35");
    expect(updates).toEqual([{ gridfinityFloorHeight: 19.35 }]);
    type(field(panel), "19.4");
    expect(updates.slice(1)).toEqual([{ gridfinityFloorHeight: 25.4 }]);
    type(field(panel), "30");
    expect(updates.slice(2)).toEqual([{ gridfinityFloorHeight: 25.4 }]);
  });

  it("takes a floor typed between the two the way it goes: down from a filled bin to where a bin still stacks", () => {
    const updates: Partial<WorkplaneShape>[] = [];
    type(field(mount({ ...bin, gridfinityFloorHeight: 25.4 }, (patch) => updates.push(patch))), "22");
    expect(updates).toEqual([{ gridfinityFloorHeight: 19.35 }]);
  });

  it("steps down from a filled bin with Down in the field in one step, to where a bin still stacks", () => {
    const updates: Partial<WorkplaneShape>[] = [];
    const input = field(mount({ ...bin, gridfinityFloorHeight: 25.4 }, (patch) => updates.push(patch)));
    press(input, "ArrowDown");
    expect([updates, input.value]).toEqual([[{ gridfinityFloorHeight: 19.35 }], "19.35"]);
  });

  it("steps up from there with Up in the field in one step, filling the lip", () => {
    const updates: Partial<WorkplaneShape>[] = [];
    const input = field(mount({ ...bin, gridfinityFloorHeight: 19.35 }, (patch) => updates.push(patch)));
    press(input, "ArrowUp");
    expect([updates, input.value]).toEqual([[{ gridfinityFloorHeight: 25.4 }], "25.40"]);
  });

  it("takes the slider into the gap the way the drag went, also for a value that comes after the pointer is up", () => {
    const drag = (fields: Partial<WorkplaneShape>, values: number[], late: number) => {
      const updates: Partial<WorkplaneShape>[] = [];
      const range = slider(mount(fields, (patch) => updates.push(patch)));
      const set = (value: number) => act(() => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(range, String(value));
        range.dispatchEvent(new Event("input", { bubbles: true }));
      });
      act(() => { range.dispatchEvent(new Event("pointerdown", { bubbles: true })); });
      values.forEach(set);
      act(() => { range.dispatchEvent(new Event("pointerup", { bubbles: true })); });
      // Firefox sends one last value after the pointer is up.
      set(late);
      return updates.map((patch) => patch.gridfinityFloorHeight);
    };
    expect(drag({ ...bin, gridfinityFloorHeight: 25.4 }, [23, 22, 15], 22)).toEqual([19.35, 19.35, 15, 19.35]);
    act(() => root?.unmount());
    expect(drag({ ...bin, gridfinityFloorHeight: 10 }, [15, 22, 23], 22)).toEqual([15, 25.4, 25.4, 25.4]);
  });

  it("fills a bin of 1 height unit with the lip from any floor typed over 5.95", () => {
    const updates: Partial<WorkplaneShape>[] = [];
    type(field(mount({ ...bin, width: 41.5, height: 7 + 4.4 }, (patch) => updates.push(patch))), "6");
    expect(updates).toEqual([{ gridfinityFloorHeight: 11.4 }]);
  });
});
