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
  it("offers a hinge at the back and asks for its pin, clearance, knuckles and a printed pin once it is on", () => {
    const off = mount();
    const hinge = checkbox(off.panel, "Hinge at the back")!;
    expect(hinge).not.toBeNull();
    expect(hinge.checked).toBe(false);
    expect(texts(off.panel)).not.toContain("Pin diameter");
    act(() => hinge.click());
    expect(off.changes.at(-1)).toEqual({ hinge: true });
    act(() => root?.unmount());
    const on = mount({ hinge: true });
    for (const label of ["Pin diameter", "Hinge clearance", "Knuckles (0 = automatic)"]) expect(texts(on.panel)).toContain(label);
    expect(checkbox(on.panel, "Print the pin too")).not.toBeNull();
    // The knuckles' size for a 1.75 mm pin: its hole with 0.15 mm play and a 1.6 mm wall round it.
    expect(texts(on.panel)).toContain("Knuckles 5.3 mm");
  });

  it("goes with a lid that pushes in or a flat one, and says so for one with a rim round the outside", () => {
    const cap = mount({ type: "cap", hinge: true });
    const hinge = checkbox(cap.panel, "Hinge at the back")!;
    expect(hinge.disabled).toBe(true);
    expect(hinge.checked).toBe(false);
    expect(texts(cap.panel)).toContain("A hinge goes with a lid that pushes in or a flat one.");
    expect(texts(cap.panel)).not.toContain("Pin diameter");
    act(() => root?.unmount());
    const flat = mount({ type: "flat", hinge: true });
    expect(checkbox(flat.panel, "Hinge at the back")!.disabled).toBe(false);
    expect(texts(flat.panel)).toContain("Pin diameter");
  });
});
