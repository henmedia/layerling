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
const radios = (panel: HTMLElement, name: string) => [...panel.querySelectorAll<HTMLButtonElement>(`[role="radiogroup"][aria-label="${name}"] [role="radio"]`)];

describe("the lid's panel with screws in the corners (Discussion #1938)", () => {
  it("offers the screws below the magnets and asks what they go into, their size and the hole in the lid once they are on", () => {
    const off = mount();
    const screws = checkbox(off.panel, "Screws in the corners")!;
    expect(screws).not.toBeNull();
    expect(screws.checked).toBe(false);
    expect(radios(off.panel, "Screw")).toHaveLength(0);
    act(() => screws.click());
    expect(off.changes.at(-1)).toEqual({ cornerScrews: true });
    act(() => root?.unmount());
    // They take the corners from the magnets and hold the lid down all round, so both of those go off with them.
    const both = mount({ magnets: true, hinge: true, thickness: 2.8 });
    act(() => checkbox(both.panel, "Screws in the corners")!.click());
    expect(both.changes.at(-1)).toEqual({ cornerScrews: true, magnets: false, hinge: false });
    act(() => root?.unmount());
    const on = mount({ cornerScrews: true });
    expect(radios(on.panel, "Screws go into").map((button) => button.textContent)).toEqual(["Heat-set inserts", "The plastic"]);
    expect(radios(on.panel, "Screw").map((button) => button.textContent)).toEqual(["M2", "M2.5", "M3", "M4", "M5"]);
    expect(radios(on.panel, "Hole in the lid").map((button) => button.textContent)).toEqual(["Countersunk", "Plain"]);
    expect(radios(on.panel, "Screw").find((button) => button.getAttribute("aria-checked") === "true")?.textContent).toBe("M3");
    // The hint says what the body gets: an M3 insert's hole.
    expect(texts(on.panel)).toContain("a hole 4 mm wide and 6.7 mm deep");
    act(() => radios(on.panel, "Screws go into")[1].click());
    expect(on.changes.at(-1)).toEqual({ cornerScrewFastener: "selfTapping" });
    act(() => radios(on.panel, "Hole in the lid")[1].click());
    expect(on.changes.at(-1)).toEqual({ cornerScrewHead: "flat" });
  });

  it("makes the plate thick enough for a countersunk head, and says so", () => {
    const { panel, changes } = mount({ cornerScrews: true });
    act(() => radios(panel, "Screw")[3].click());
    // An M4 head's cone is 2.45 mm deep: the 2 mm plate becomes 2.9 mm.
    expect(changes.at(-1)).toEqual({ cornerScrewSize: "M4", thickness: 2.9 });
    act(() => root?.unmount());
    // Set thinner by hand afterwards, the panel says what is needed.
    const thin = mount({ cornerScrews: true, cornerScrewSize: "M4", thickness: 2 });
    expect(texts(thin.panel)).toContain("The lid is too thin for these countersunk heads: make it at least 2.9 mm thick, or take a plain hole.");
    act(() => root?.unmount());
    // A plain hole needs no more than the plate there is.
    const plain = mount({ cornerScrews: true, cornerScrewSize: "M4", cornerScrewHead: "flat", thickness: 2 });
    expect(texts(plain.panel)).not.toContain("The lid is too thin");
  });

  it("switches the screws off when magnets or a hinge are switched on, and shows them off for a lid that turns or slides", () => {
    const { panel, changes } = mount({ cornerScrews: true });
    act(() => checkbox(panel, "Magnets in the corners")!.click());
    expect(changes.at(-1)).toEqual({ magnets: true, cornerScrews: false, thickness: 2.8 });
    act(() => checkbox(panel, "Hinge")!.click());
    expect(changes.at(-1)).toEqual({ hinge: true, cornerScrews: false });
    act(() => root?.unmount());
    for (const type of ["screw", "bayonet", "slide"] as const) {
      const turned = mount({ cornerScrews: true, type });
      const screws = checkbox(turned.panel, "Screws in the corners")!;
      expect(screws.checked).toBe(false);
      expect(screws.disabled).toBe(true);
      act(() => root?.unmount());
    }
  });
});
