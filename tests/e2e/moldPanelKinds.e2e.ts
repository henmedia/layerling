// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { MoldPanel } from "@/components/workplane/MoldPanel";
import { MOLD_DEFAULTS, MOLD_KINDS, moldMix, type MoldFigures, type MoldOptions } from "@/lib/moldTool";
import { DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";

/*
 * The mold tool's panel for its further kinds and ways: what each kind asks for, which settings give way to others
 * (four parts and the pour through the seam leave no openings set by hand), and the mixing sheet under every kind
 * but the die.
 */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  container = null;
  root = null;
});

function mount(settings: Partial<MoldOptions> = {}, figures: MoldFigures | null = null) {
  const changes: Partial<MoldOptions>[] = [];
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(createElement(MoldPanel, {
      targetName: "Master",
      settings: { ...MOLD_DEFAULTS, ...settings },
      workspace: DEFAULT_WORKPLANE_WORKSPACE,
      busy: false,
      error: null,
      figures,
      onChange: (patch: Partial<MoldOptions>) => changes.push(patch),
      onApply: () => {},
      onCancel: () => {},
    }));
  });
  return { panel: container, changes };
}

const texts = (panel: HTMLElement) => panel.textContent ?? "";
const radio = (panel: HTMLElement, name: string) => [...panel.querySelectorAll<HTMLButtonElement>("button[role=radio]")].find((button) => button.textContent?.trim() === name) ?? null;
const checkbox = (panel: HTMLElement, name: string) => [...panel.querySelectorAll<HTMLLabelElement>("label")]
  .find((label) => label.textContent?.trim() === name)
  ?.querySelector<HTMLInputElement>("input[type=checkbox]") ?? null;
const sliders = (panel: HTMLElement) => [...panel.querySelectorAll(".range-property-name")].map((name) => name.textContent);

describe("the mold tool's panel", () => {
  it("offers every kind and switches to it", () => {
    const { panel, changes } = mount();
    const names = ["Two-part mold", "Silicone pour box", "Silicone skin mold", "Core mold for a vessel", "Two cases for mold halves", "Open mold", "Stamp & die"];
    expect(names.length).toBe(MOLD_KINDS.length);
    for (const name of names) expect(radio(panel, name)).not.toBeNull();
    act(() => radio(panel, "Silicone skin mold")!.click());
    expect(changes.at(-1)).toEqual({ kind: "skin" });
  });

  it("asks a skin mold for the silicone's thickness, the shell's wall and whether it comes in two halves", () => {
    const { panel, changes } = mount({ kind: "skin" });
    expect(sliders(panel)).toEqual(expect.arrayContaining(["Silicone thickness", "Shell wall", "Base plate"]));
    expect(checkbox(panel, "In two halves")!.checked).toBe(true);
    act(() => checkbox(panel, "In two halves")!.click());
    expect(changes.at(-1)).toEqual({ shellSplit: false });
    expect(texts(panel)).toContain("the silicone lifts it");
    // Nothing of the two-part mold's.
    expect(texts(panel)).not.toContain("Opening direction");
  });

  it("asks a core mold for the material, the sleeve and a drain hole", () => {
    const one = mount({ kind: "core", shellSplit: false });
    expect(radio(one.panel, "Concrete")).not.toBeNull();
    // A sleeve in one piece has no way to part.
    expect(texts(one.panel)).not.toContain("Opening direction");
    expect(sliders(one.panel)).not.toContain("Drain hole");
    act(() => root?.unmount());
    const two = mount({ kind: "core", shellSplit: true, drain: true });
    expect(radio(two.panel, "Left/right")).not.toBeNull();
    expect(radio(two.panel, "Up/down")).toBeNull();
    expect(sliders(two.panel)).toContain("Drain hole");
  });

  it("asks the two cases what the halves are poured from", () => {
    const { panel, changes } = mount({ kind: "halves" });
    expect(sliders(panel)).toEqual(expect.arrayContaining(["Mold material around the master", "Frame wall", "Plate"]));
    expect(checkbox(panel, "Natches in the corners")!.checked).toBe(true);
    expect(checkbox(panel, "Pour channel on the master's top")!.checked).toBe(true);
    act(() => radio(panel, "Plaster")!.click());
    expect(changes.at(-1)).toEqual({ moldMaterial: "plaster" });
    expect(radio(panel, "Slip (clay)")).not.toBeNull();
    // No free direction: the cases stand straight.
    expect(radio(panel, "Free")).toBeNull();
  });

  it("lets a two-part mold be poured through the seam, take a wick and a sealing lip, or come in four parts", () => {
    const two = mount({ kind: "twoPart" });
    expect(radio(two.panel, "Standing, through the seam")).not.toBeNull();
    expect(checkbox(two.panel, "Sealing lip round the cavity")).not.toBeNull();
    expect(checkbox(two.panel, "Wick hole for a candle")).not.toBeNull();
    expect(checkbox(two.panel, "Set the openings myself")).not.toBeNull();
    act(() => radio(two.panel, "Four parts")!.click());
    expect(two.changes.at(-1)).toEqual({ pieces: "four" });
    act(() => root?.unmount());
    // Four parts: no parting height, no outside to choose, no sealing lip, no openings set by hand, no pry slots.
    const four = mount({ kind: "twoPart", pieces: "four", ownOpenings: true });
    expect(texts(four.panel)).toContain("each comes off sideways");
    expect(texts(four.panel)).not.toContain("Find the parting height");
    expect(radio(four.panel, "Contour shell")).toBeNull();
    expect(checkbox(four.panel, "Sealing lip round the cavity")).toBeNull();
    expect(checkbox(four.panel, "Set the openings myself")).toBeNull();
    expect(checkbox(four.panel, "Pry slots on the seam")).toBeNull();
    expect(checkbox(four.panel, "Grooves for rubber bands")).not.toBeNull();
    act(() => root?.unmount());
    // Through the seam: the openings lie in it, so none are set by hand.
    const seam = mount({ kind: "twoPart", pour: "seam", ownOpenings: true });
    expect(checkbox(seam.panel, "Set the openings myself")).toBeNull();
    expect(checkbox(seam.panel, "Sprue with funnel")).not.toBeNull();
  });

  it("lets a pour box follow the outline", () => {
    const { panel, changes } = mount({ kind: "box" });
    act(() => radio(panel, "Follows the outline")!.click());
    expect(changes.at(-1)).toEqual({ boxShape: "contour" });
  });

  it("shows what to mix under every kind but the die", () => {
    const options = { ...MOLD_DEFAULTS, kind: "box" as const, mixA: 100, mixB: 10, price: 30 };
    const figures: MoldFigures = { volume: 500, mix: moldMix(500, options), saved: 120, warnings: [] };
    const { panel } = mount(options, figures);
    const text = texts(panel);
    expect(text).toContain("What to mix");
    expect(text).toContain("To pour: 500.0 ml / 16.91 fl oz");
    expect(text).toContain("Mix 605 g with 10 % extra: 550 g A + 55 g B");
    expect(text).toContain("Material about 18.15");
    expect(text).toContain("120 ml (19 %) less silicone than a rectangular pour box");
    expect(sliders(panel)).toEqual(expect.arrayContaining(["Extra for cup and stick", "Ratio, first part", "Ratio, second part", "Price per kg"]));
    act(() => root?.unmount());
    expect(texts(mount({ kind: "die" }).panel)).not.toContain("What to mix");
  });

  it("says what a core mold warns of beside the figures", () => {
    const options = { ...MOLD_DEFAULTS, kind: "core" as const, castMaterial: "plaster" as const, mixA: 100, mixB: 70 };
    const { panel } = mount(options, { volume: 80, mix: moldMix(80, options), warnings: ["rimCut", "coreUndercut"], rimCut: 2.4 });
    const text = texts(panel);
    expect(text).toContain("it was cut 2.4 mm lower");
    expect(text).toContain("a rigid core cannot come out");
    expect(text).toContain("g powder + ");
  });
});
