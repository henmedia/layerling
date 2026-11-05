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
 * The hinge's leaves in its settings: a leaf shape (plates or fingers), a corner radius, and screw holes with their
 * diameter, countersink and spacing, shown only where they apply, each change one patch.
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

/** The settings panel for a hinge with these fields. */
function mount(fields: Partial<WorkplaneShape>, onUpdate: (patch: Partial<WorkplaneShape>) => void = () => {}) {
  const asset = toolbarShapeAssets.find((entry) => entry.kind === "hinge")!;
  const shape = { ...makeShapeFromAsset(asset, { x: 0, z: 0 }), ...fields } as WorkplaneShape;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(createElement(ShapeInspector, { shape, snap: DEFAULT_SNAP_GRID, snapOpen: false, workspace: DEFAULT_WORKPLANE_WORKSPACE, onUpdate, onSnapChange: () => {}, onSnapOpenChange: () => {} }));
  });
  return container;
}

const row = (panel: HTMLElement, name: string) => [...panel.querySelectorAll<HTMLLabelElement>("label.range-property")].find((label) => label.querySelector(".range-property-name")?.textContent === name);
const field = (panel: HTMLElement, name: string) => row(panel, name)!.querySelector<HTMLInputElement>("input:not([type=range])")!;
const slider = (panel: HTMLElement, name: string) => row(panel, name)!.querySelector<HTMLInputElement>("input[type=range]")!;
const select = (panel: HTMLElement, option: string) => [...panel.querySelectorAll<HTMLSelectElement>("select")].find((one) => [...one.options].some((entry) => entry.value === option))!;

function type(input: HTMLInputElement, value: string) {
  act(() => input.focus());
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  act(() => input.blur());
}

function choose(element: HTMLSelectElement, value: string) {
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")!.set!.call(element, value);
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

describe("the hinge's leaves in its settings", () => {
  it("offers the leaf shape, a corner radius and screw holes, the holes' own rows only once there are holes", () => {
    const panel = mount({});
    expect(select(panel, "fingers").value).toBe("plate");
    expect(row(panel, "Corner radius")).toBeTruthy();
    expect(field(panel, "Screw holes per leaf").value).toBe("0");
    expect(row(panel, "Hole diameter")).toBeUndefined();
    expect(select(panel, "countersunk")).toBeUndefined();

    const holes = mount({ hingeScrewHoles: 2 });
    expect(field(holes, "Hole diameter").value).toBe("3.50");
    expect(select(holes, "countersunk").value).toBe("countersunk");
    expect(row(holes, "Hole spacing (along)")).toBeTruthy();
    expect(row(holes, "Hole spacing (across)")).toBeTruthy();
  });

  it("writes each change as one patch", () => {
    const patches: Partial<WorkplaneShape>[] = [];
    const panel = mount({ hingeScrewHoles: 2 }, (patch) => patches.push(patch));
    type(field(panel, "Screw holes per leaf"), "3");
    type(field(panel, "Corner radius"), "4");
    choose(select(panel, "countersunk"), "straight");
    choose(select(panel, "fingers"), "fingers");
    expect(patches).toEqual([{ hingeScrewHoles: 3 }, { hingeCornerRadius: 4 }, { hingeScrewHead: "straight", hingeScrewCountersink: undefined }, { hingeLeafStyle: "fingers" }]);
  });

  it("says when fewer holes fit than asked for", () => {
    const panel = mount({ width: 20, hingeScrewHoles: 6 });
    // The hint stands in a line of its own right under the row.
    expect(row(panel, "Screw holes per leaf")!.nextElementSibling?.textContent).toMatch(/^Only \d fit on the leaf\.$/);
    expect(row(mount({ hingeScrewHoles: 2 }), "Screw holes per leaf")!.nextElementSibling?.textContent).toBe("0 leaves the leaves without holes.");
  });

  it("has no screw holes on fingers, and says how fingers are joined", () => {
    const panel = mount({ hingeLeafStyle: "fingers", hingeScrewHoles: 2 });
    expect(select(panel, "fingers").value).toBe("fingers");
    expect(row(panel, "Screw holes per leaf")).toBeUndefined();
    expect(row(panel, "Hole diameter")).toBeUndefined();
    expect(panel.textContent).toContain("join them to your model");
  });

  it("offers nut pockets with the nut's width, and says how deep the pocket goes", () => {
    const panel = mount({ hingeScrewHoles: 2, hingeLeafThickness: 2 });
    expect([...select(panel, "countersunk").options].map((option) => option.value)).toEqual(["countersunk", "straight", "nut", "countersunkNut"]);
    expect(row(panel, "Nut width (across flats)")).toBeUndefined();
    const nuts = mount({ hingeScrewHoles: 2, hingeLeafThickness: 2, hingeScrewHead: "nut" });
    expect(field(nuts, "Nut width (across flats)").value).toBe("0.00");
    expect(row(nuts, "Nut width (across flats)")!.nextElementSibling?.textContent).toBe("0 takes it from the hole (M3 5.8, M4 7.3, with play). Now 5.8 mm; the pocket is 1.4 mm deep, as far as the leaf allows.");
    // An old hinge without the choice reads its countersink switch.
    expect(select(mount({ hingeScrewHoles: 2, hingeScrewCountersink: false }), "countersunk").value).toBe("straight");
  });

  it("raises the second leaf, says it needs supports, and folds the hinge down past lying flat (#1259)", () => {
    const patches: Partial<WorkplaneShape>[] = [];
    const panel = mount({}, (patch) => patches.push(patch));
    choose(select(panel, "raised"), "raised");
    type(field(panel, "Opening angle"), "-90");
    expect(patches).toEqual([{ hingeLeafStyle: "raised" }, { hingeAngle: -90 }]);
    const raised = mount({ hingeLeafStyle: "raised" });
    expect(select(raised, "raised").value).toBe("raised");
    expect(raised.textContent).toContain("Print it with supports under the raised leaf.");
    expect(field(mount({ hingeAngle: -500 }), "Opening angle").value).toBe("-180");
  });

  it("limits a raised hinge's leaf, width and corners by where the raised leaf starts (#1259)", () => {
    const sizes = { width: 40, depth: 40, height: 6, hingePinDiameter: 3, hingeLeafThickness: 1.1, hingeScrewHoles: 2 };
    // B's leaf starts sqrt(3.4² - 0.4²) from the axis, 0.4 above its level, where A's starts sqrt(3.4² - 1.9²).
    const startB = Math.sqrt(3.4 ** 2 - 0.4 ** 2);
    const raised = mount({ ...sizes, hingeLeafStyle: "raised" });
    expect(Number(slider(raised, "Width opened").min)).toBeCloseTo(2 * (startB + 0.5), 6);
    expect(Number(slider(raised, "Corner radius").max)).toBeCloseTo(20 - startB - 0.05, 6);
    expect(Number(slider(raised, "Corner radius").max)).toBeLessThan(Number(slider(mount(sizes), "Corner radius").max));
    // A cone hinge's leaves both fit within the knuckle, the clearance between: at most (6 - 0.4) / 2 thick.
    expect(Number(slider(mount({ ...sizes, hingeStyle: "cone", hingeLeafStyle: "raised" }), "Leaf thickness").max)).toBeCloseTo(2.8, 6);
    expect(Number(slider(mount({ ...sizes, hingeStyle: "cone" }), "Leaf thickness").max)).toBeCloseTo(6, 6);
  });

  it("has a lift-off style with two knuckles and no count to set", () => {
    const patches: Partial<WorkplaneShape>[] = [];
    const panel = mount({}, (patch) => patches.push(patch));
    choose(select(panel, "liftOff"), "liftOff");
    expect(patches).toEqual([{ hingeStyle: "liftOff", hingePinless: undefined }]);
    const liftOff = mount({ hingeStyle: "liftOff" });
    expect(row(liftOff, "Knuckles")).toBeUndefined();
    expect(row(liftOff, "Knuckle width (max)")).toBeUndefined();
    expect(row(liftOff, "Pin diameter")).toBeTruthy();
    expect(liftOff.textContent).toContain("the upper one is a sleeve that lifts off it");
  });
});
