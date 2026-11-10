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

type Neck = { top: { outer: number; inner: number } | null | undefined; fit: number | null; fitting: boolean };

/** The lid's panel for a screw lid with these settings and this measurement of the body's top; clicks on the fit button count up. */
function mount(settings: Partial<LidOptions>, neck: Neck | null) {
  const fits: number[] = [];
  const applied: number[] = [];
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(createElement(LidPanel, {
      targetName: "Jar",
      settings: { ...LID_DEFAULTS, type: "screw", ...settings },
      workspace: DEFAULT_WORKPLANE_WORKSPACE,
      busy: false,
      error: null,
      onChange: () => {},
      onApply: () => applied.push(1),
      onCancel: () => {},
      neck: neck ? { ...neck, onFit: () => fits.push(1) } : null,
    }));
  });
  return { panel: container, fits, applied };
}

const line = (panel: HTMLElement) => panel.querySelector(".lid-neck-fit")?.textContent ?? null;
const fitButton = (panel: HTMLElement) => [...panel.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent?.includes("Fit the body to the neck")) ?? null;
const makeLid = (panel: HTMLElement) => [...panel.querySelectorAll<HTMLButtonElement>(".edge-modifier-footer button")].find((button) => button.textContent?.includes("Make lid"))!;

describe("the lid panel says whether the body fits a standard's neck before the lid is made (issue #1482)", () => {
  it("says a body too narrow for a Mason 70 neck gets only the cap, and offers to fit it", () => {
    const { panel, fits } = mount({ threadStandard: "mason70" }, { top: { outer: 20, inner: 19.99 }, fit: 65.85, fitting: false });
    expect(line(panel)).toContain("Your body's top: 40 mm across. A Mason 70 neck needs 65.25 to 66.45 mm under the thread, so only the cap is made.");
    expect(line(panel)).toContain("Makes the body 65.85 mm across and keeps its height, so Make lid gives it the thread.");
    const button = fitButton(panel)!;
    expect(button).not.toBeNull();
    act(() => button.click());
    expect(fits).toEqual([1]);
  });

  it("says a body that is the neck gets the thread, and offers nothing more", () => {
    const { panel } = mount({ threadStandard: "mason70" }, { top: { outer: 32.925, inner: 32.92 }, fit: 65.85, fitting: false });
    expect(line(panel)).toContain("Your body's top: 65.85 mm across. A Mason 70 neck is 65.25 to 66.45 mm under the thread, so your body gets the thread too.");
    expect(fitButton(panel)).toBeNull();
  });

  it("measures exactly as Make lid does: the corners against the largest neck, the sides against the smallest", () => {
    // The corners 66.5 mm apart: 0.05 more than a Mason 70 neck may be.
    expect(line(mount({ threadStandard: "mason70" }, { top: { outer: 33.25, inner: 33.2 }, fit: null, fitting: false }).panel)).toContain("only the cap is made");
    act(() => root?.unmount());
    // The middles of the sides 65.2 mm apart, though the corners are 65.3: too narrow all the same.
    expect(line(mount({ threadStandard: "mason70" }, { top: { outer: 32.65, inner: 32.6 }, fit: null, fitting: false }).panel)).toContain("only the cap is made");
  });

  it("for a body it cannot resize, a group or a mesh, says what size to make it instead of offering the button", () => {
    const { panel } = mount({ threadStandard: "gl45" }, { top: { outer: 25, inner: 24.99 }, fit: null, fitting: false });
    expect(line(panel)).toContain("Your body's top: 50 mm across. A GL 45 neck needs 41.3 to 42.5 mm under the thread, so only the cap is made.");
    expect(line(panel)).toContain("Make its top 41.9 mm across, and it gets the thread too.");
    expect(fitButton(panel)).toBeNull();
  });

  it("says a top that is not round gets only the cap, and offers the fit where it can make it round", () => {
    const fittable = mount({ threadStandard: "pco1881" }, { top: null, fit: 24.54, fitting: false });
    expect(line(fittable.panel)).toContain("Your body's top is not round, so only the cap is made.");
    expect(fitButton(fittable.panel)).not.toBeNull();
    act(() => root?.unmount());
    const box = mount({ threadStandard: "pco1881" }, { top: null, fit: null, fitting: false });
    expect(line(box.panel)).toBe("Your body's top is not round, so only the cap is made.");
  });

  it("says it is measuring while it measures, and holds Make lid back while the body is being fitted", () => {
    const measuring = mount({ threadStandard: "mason86" }, { top: undefined, fit: 81.85, fitting: false });
    expect(line(measuring.panel)).toBe("Measuring your body's top…");
    expect(fitButton(measuring.panel)).toBeNull();
    expect(makeLid(measuring.panel).disabled).toBe(false);
    act(() => root?.unmount());
    const fitting = mount({ threadStandard: "mason86" }, { top: { outer: 20, inner: 20 }, fit: 81.85, fitting: true });
    expect(fitting.panel.querySelector<HTMLButtonElement>(".lid-neck-fit-button")?.textContent).toBe("Fitting the body…");
    expect(fitting.panel.querySelector<HTMLButtonElement>(".lid-neck-fit-button")?.disabled).toBe(true);
    expect(makeLid(fitting.panel).disabled).toBe(true);
  });

  it("says nothing of the neck with the custom thread, another kind of lid, or no measurement", () => {
    expect(line(mount({ threadStandard: "own" }, { top: { outer: 20, inner: 20 }, fit: null, fitting: false }).panel)).toBeNull();
    act(() => root?.unmount());
    expect(line(mount({ type: "bayonet", threadStandard: "mason70" }, { top: { outer: 20, inner: 20 }, fit: null, fitting: false }).panel)).toBeNull();
    act(() => root?.unmount());
    expect(line(mount({ threadStandard: "mason70" }, null).panel)).toBeNull();
  });
});
