// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { LidPanel } from "@/components/workplane/LidPanel";
import { LID_DEFAULTS, type LidOptions } from "@/lib/lidTool";
import { DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  container = null;
  root = null;
});

type Rooms = { outline: [number, number][][]; rooms: { points: [number, number][]; centre: [number, number] }[] };
const square = (x: number, z: number, w: number, d: number): [number, number][] => [[x, z], [x + w, z], [x + w, z + d], [x, z + d]];
const TWO: Rooms = { outline: [square(0, 0, 100, 70)], rooms: [{ points: square(2, 2, 37, 66), centre: [20.5, 35] }, { points: square(41, 2, 57, 66), centre: [69.5, 35] }] };

/** The lid's panel with these settings and compartments; what it hands on comes back in `changes`. */
function mount(settings: Partial<LidOptions> = {}, rooms?: Rooms | null) {
  const changes: Partial<LidOptions>[] = [];
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(createElement(LidPanel, {
      targetName: "Box",
      settings: { ...LID_DEFAULTS, ...settings },
      workspace: DEFAULT_WORKPLANE_WORKSPACE,
      busy: false,
      error: null,
      onChange: (patch: Partial<LidOptions>) => changes.push(patch),
      onApply: () => {},
      onCancel: () => {},
      ...(rooms === undefined ? {} : { rooms }),
    }));
  });
  return { panel: container, changes };
}

const find = (panel: HTMLElement, id: string) => panel.querySelector<HTMLElement>(`[data-testid="${id}"]`);
const type = (input: HTMLInputElement, value: string) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
};

describe("the lid's panel with labels for the compartments", () => {
  it("offers no labels, outside or inside, and asks for no text until a side is picked", () => {
    const { panel, changes } = mount();
    expect(find(panel, "lid-labels")).not.toBeNull();
    expect(find(panel, "lid-label-side-none")!.getAttribute("aria-checked")).toBe("true");
    expect(find(panel, "lid-rooms-plan")).toBeNull();
    expect(find(panel, "lid-label-text-0")).toBeNull();
    act(() => find(panel, "lid-label-side-outside")!.click());
    expect(changes.at(-1)).toEqual({ labelSide: "outside" });
    act(() => find(panel, "lid-label-side-inside")!.click());
    expect(changes.at(-1)).toEqual({ labelSide: "inside" });
  });

  it("draws the compartments numbered and takes a text for each", () => {
    const { panel, changes } = mount({ labelSide: "outside", labels: ["", "M4"] }, TWO);
    const plan = find(panel, "lid-rooms-plan")!;
    expect([...plan.querySelectorAll("text")].map((text) => text.textContent)).toEqual(["1", "2 · M4"]);
    const first = find(panel, "lid-label-text-0") as HTMLInputElement;
    const second = find(panel, "lid-label-text-1") as HTMLInputElement;
    expect(first.value).toBe("");
    expect(second.value).toBe("M4");
    expect(first.maxLength).toBe(24);
    expect(find(panel, "lid-label-text-2")).toBeNull();
    act(() => type(first, "M3"));
    expect(changes.at(-1)).toEqual({ labels: ["M3", "M4"] });
    // A text for a compartment further on fills the ones before it with nothing.
    act(() => root?.unmount());
    const empty = mount({ labelSide: "inside", labels: [] }, TWO);
    act(() => type(find(empty.panel, "lid-label-text-1") as HTMLInputElement, "Nuts"));
    expect(empty.changes.at(-1)).toEqual({ labels: ["", "Nuts"] });
    expect(empty.panel.textContent).toContain("underside");
  });

  it("says that it is looking for the compartments, and when the body has none", () => {
    const measuring = mount({ labelSide: "outside" }, undefined);
    // Without the property the panel takes it that there is nothing to measure.
    expect(find(measuring.panel, "lid-label-text-0")).toBeNull();
    act(() => root?.unmount());
    const none = mount({ labelSide: "outside" }, null);
    expect(find(none.panel, "lid-rooms-plan")).toBeNull();
    expect(none.panel.textContent).toContain("no opening at the top");
  });

  it("has no labels for a lid that is screwed, turned or slid on, and says where a stacking lid takes them", () => {
    for (const kind of ["screw", "screwIn", "bayonet", "slide"] as const) {
      const { panel } = mount({ type: kind, labelSide: "outside" }, TWO);
      expect(find(panel, "lid-labels"), kind).toBeNull();
      act(() => root?.unmount());
    }
    const stack = mount({ stackTop: true, labelSide: "inside", labels: ["A"] }, TWO);
    expect(stack.panel.textContent).toContain("tray");
  });
});
