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

/** The lid's panel with these settings; what it hands on comes back in `changes`. */
function mount(settings: Partial<LidOptions> = {}) {
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
    }));
  });
  return { panel: container, changes };
}

const checkbox = (panel: HTMLElement, name: string) => [...panel.querySelectorAll<HTMLLabelElement>("label")]
  .find((label) => label.textContent?.trim() === name)
  ?.querySelector<HTMLInputElement>("input[type=checkbox]") ?? null;
const texts = (panel: HTMLElement) => panel.textContent ?? "";

describe("the lid's panel with a hinge", () => {
  it("offers a hinge and asks for its side, pin, clearance, pin play, knuckles and a printed pin once it is on", () => {
    const off = mount();
    const hinge = checkbox(off.panel, "Hinge")!;
    expect(hinge).not.toBeNull();
    expect(hinge.checked).toBe(false);
    expect(texts(off.panel)).not.toContain("Pin diameter");
    act(() => hinge.click());
    expect(off.changes.at(-1)).toEqual({ hinge: true });
    act(() => root?.unmount());
    const on = mount({ hinge: true });
    for (const label of ["Hinge side", "Pin diameter", "Hinge clearance", "Pin play (per side)", "Knuckles (0 = automatic)"]) expect(texts(on.panel)).toContain(label);
    expect(checkbox(on.panel, "Print the pin too")).not.toBeNull();
    // Teardrop holes are on to start with, and can be turned off.
    const teardrop = checkbox(on.panel, "Teardrop pin holes (no droop when printed)")!;
    expect(teardrop.checked).toBe(true);
    act(() => teardrop.click());
    expect(on.changes.at(-1)).toEqual({ hingeTeardrop: false });
    // The knuckles' size for a 1.75 mm pin: its hole with 0.15 mm play and a 1.6 mm wall round it.
    // 1.75 mm pin, 0.2 mm of play and a 1.6 mm wall round it: 5.35 mm across.
    expect(texts(on.panel)).toContain("Knuckles 5.4 mm");
  });

  it("puts the hinge at the back unless another side is picked", () => {
    const { panel, changes } = mount({ hinge: true });
    const group = panel.querySelector<HTMLElement>('[role="radiogroup"][aria-label="Hinge side"]')!;
    expect(group).not.toBeNull();
    const sides = [...group.querySelectorAll<HTMLButtonElement>('[role="radio"]')];
    expect(sides.map((button) => button.textContent)).toEqual(["Back", "Right", "Front", "Left"]);
    expect(sides.filter((button) => button.getAttribute("aria-checked") === "true").map((button) => button.textContent)).toEqual(["Back"]);
    act(() => sides[1].click());
    expect(changes.at(-1)).toEqual({ hingeSide: "right" });
    act(() => root?.unmount());
    const left = mount({ hinge: true, hingeSide: "left" });
    expect(left.panel.querySelector('[aria-label="Hinge side"] [role="radio"][aria-checked="true"]')?.textContent).toBe("Left");
  });

  it("offers the hinge outside, flush in the wall or as pivot pins, and hides the knuckle count for pivot pins", () => {
    const { panel, changes } = mount({ hinge: true });
    const group = panel.querySelector<HTMLElement>('[role="radiogroup"][aria-label="Hinge type"]')!;
    expect(group).not.toBeNull();
    const styles = [...group.querySelectorAll<HTMLButtonElement>('[role="radio"]')];
    expect(styles.map((button) => button.textContent)).toEqual(["Outside", "Flush", "Pivot pins"]);
    expect(group.querySelector('[role="radio"][aria-checked="true"]')?.textContent).toBe("Outside");
    expect(texts(panel)).toContain("the lid opens all the way");
    act(() => styles[1].click());
    expect(changes.at(-1)).toEqual({ hingeStyle: "flush" });
    act(() => root?.unmount());
    const flush = mount({ hinge: true, hingeStyle: "flush" });
    expect(texts(flush.panel)).toContain("the box keeps its size");
    expect(texts(flush.panel)).toContain("Knuckles (0 = automatic)");
    act(() => root?.unmount());
    const pivot = mount({ hinge: true, hingeStyle: "pivot" });
    expect(texts(pivot.panel)).toContain("turns on two pins through the side walls");
    expect(texts(pivot.panel)).not.toContain("Knuckles (0 = automatic)");
  });

  it("goes with a lid that pushes in or a flat one, and says so for one with a rim round the outside", () => {
    const cap = mount({ type: "cap", hinge: true });
    const hinge = checkbox(cap.panel, "Hinge")!;
    expect(hinge.disabled).toBe(true);
    expect(hinge.checked).toBe(false);
    expect(texts(cap.panel)).toContain("A hinge goes with a lid that pushes in or a flat one.");
    expect(texts(cap.panel)).not.toContain("Pin diameter");
    act(() => root?.unmount());
    const flat = mount({ type: "flat", hinge: true });
    expect(checkbox(flat.panel, "Hinge")!.disabled).toBe(false);
    expect(texts(flat.panel)).toContain("Pin diameter");
  });
});

describe("the lid's panel with click bumps and a handle (#1234, #1230)", () => {
  it("offers click bumps, off to begin with, says what they do once on, and not for a flat lid or pivot pins", () => {
    const off = mount();
    const bumps = checkbox(off.panel, "Click bumps")!;
    expect(bumps).not.toBeNull();
    expect(bumps.checked).toBe(false);
    expect(bumps.disabled).toBe(false);
    expect(texts(off.panel)).not.toContain("snap into dimples in the body");
    act(() => bumps.click());
    expect(off.changes.at(-1)).toEqual({ clickBumps: true });
    act(() => root?.unmount());
    const on = mount({ clickBumps: true, type: "cap" });
    expect(checkbox(on.panel, "Click bumps")!.checked).toBe(true);
    expect(texts(on.panel)).toContain("snap into dimples in the body");
    act(() => root?.unmount());
    for (const settings of [{ type: "flat" as const }, { hinge: true, hingeStyle: "pivot" as const }]) {
      const refused = mount({ ...settings, clickBumps: true });
      const box = checkbox(refused.panel, "Click bumps")!;
      expect(box.disabled).toBe(true);
      expect(box.checked).toBe(false);
      expect(texts(refused.panel)).toContain("Not for a flat lid or pivot pins.");
      act(() => root?.unmount());
    }
  });

  it("offers no handle, a pull tab or a finger notch, and none for a pivot lid", () => {
    const { panel, changes } = mount();
    const group = panel.querySelector<HTMLElement>('[role="radiogroup"][aria-label="Handle"]')!;
    expect(group).not.toBeNull();
    const options = [...group.querySelectorAll<HTMLButtonElement>('[role="radio"]')];
    expect(options.map((button) => button.textContent)).toEqual(["None", "Pull tab", "Finger notch"]);
    expect(group.querySelector('[role="radio"][aria-checked="true"]')?.textContent).toBe("None");
    act(() => options[1].click());
    expect(changes.at(-1)).toEqual({ handle: "tab" });
    act(() => root?.unmount());
    const tab = mount({ handle: "tab" });
    expect(texts(tab.panel)).toContain("6 mm out from its front edge");
    act(() => root?.unmount());
    const notch = mount({ handle: "notch" });
    expect(notch.panel.querySelector('[role="radiogroup"][aria-label="Handle"] [aria-checked="true"]')?.textContent).toBe("Finger notch");
    expect(texts(notch.panel)).toContain("for a finger to lift it");
    act(() => root?.unmount());
    const pivot = mount({ hinge: true, hingeStyle: "pivot", handle: "tab" });
    const pivotGroup = pivot.panel.querySelector<HTMLElement>('[role="radiogroup"][aria-label="Handle"]')!;
    expect(pivotGroup.querySelector('[aria-checked="true"]')?.textContent).toBe("None");
    expect([...pivotGroup.querySelectorAll<HTMLButtonElement>('[role="radio"]')].map((button) => button.disabled)).toEqual([false, true, true]);
    expect(texts(pivot.panel)).toContain("A pivot lid lies in the opening");
  });
});
