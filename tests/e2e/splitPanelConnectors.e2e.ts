// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SplitPanel, type SplitConnectorPreviewState } from "@/components/workplane/SplitPanel";
import { setLanguage } from "@/lib/i18n";
import { setPrinterPlay } from "@/lib/printerPlay";
import { SPLIT_CONNECTOR_DEFAULTS, type SplitConnectorOptions } from "@/lib/splitConnectors";
import { DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";

/*
 * The Split panel's connectors (Discussion #832): None shows nothing more, Dowels and Plugs show their settings and what
 * fits on the cut face, a cut face too small and a split without room say so, and the clearance says when it comes from
 * the fit test. A dovetail shows its tongue's own measures and says it in its own words.
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let container: HTMLDivElement | null = null;

beforeEach(async () => {
  await setLanguage("en", false);
});

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  container = null;
  root = null;
  setPrinterPlay(null);
});

function mount(connectors: Partial<SplitConnectorOptions>, connectorPreview: SplitConnectorPreviewState = { state: "idle" }) {
  const changes: Array<Partial<SplitConnectorOptions>> = [];
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(createElement(SplitPanel, {
      axis: "y",
      rotation: [0, 0],
      position: 20,
      min: 0,
      max: 40,
      targetCount: 1,
      workspace: DEFAULT_WORKPLANE_WORKSPACE,
      busy: false,
      error: null,
      picking: false,
      connectors: { ...SPLIT_CONNECTOR_DEFAULTS, ...connectors },
      connectorPreview,
      onPickToggle: () => {},
      onAxisChange: () => {},
      onAlignToWorkplane: () => {},
      onRotationChange: () => {},
      onPositionChange: () => {},
      onConnectorsChange: (patch) => changes.push(patch),
      onApply: () => {},
      onCancel: () => {},
    }));
  });
  return { panel: container, changes };
}

const text = (panel: HTMLElement) => panel.textContent ?? "";
const kindButtons = (panel: HTMLElement) => [...panel.querySelectorAll<HTMLButtonElement>(".split-connector-control button")];
const fieldLabels = (panel: HTMLElement) => [...panel.querySelectorAll(".split-panel .range-property-name")].map((label) => label.textContent);
const summary = (panel: HTMLElement) => [...panel.querySelectorAll(".split-connector-summary span")].map((line) => line.textContent);
const done = (tally: Partial<{ placed: number; faces: number; tooSmall: number; tooThin: number }>, holes = 0): SplitConnectorPreviewState => ({
  state: "done", tally: { placed: 0, faces: 1, tooSmall: 0, tooThin: 0, ...tally }, holes, points: [],
});

describe("the Split panel's connectors", () => {
  it("offers None, Dowels, Plugs, Lip, Dovetail and Magnets, with None chosen and nothing more shown", () => {
    const { panel, changes } = mount({});
    expect(kindButtons(panel).map((button) => button.textContent)).toEqual(["None", "Dowels", "Plugs", "Lip", "Dovetail", "Magnets"]);
    expect(kindButtons(panel).map((button) => button.getAttribute("aria-pressed"))).toEqual(["true", "false", "false", "false", "false", "false"]);
    expect(fieldLabels(panel)).toEqual([]);
    expect(panel.querySelector(".split-connector-summary")).toBeNull();
    act(() => kindButtons(panel)[1].click());
    expect(changes).toEqual([{ kind: "dowels" }]);
  });

  it("shows the dowels' settings and what fits on the cut face", () => {
    const { panel } = mount({ kind: "dowels" }, done({ placed: 2 }));
    expect(fieldLabels(panel)).toEqual(["Per cut face (0 = automatic)", "Diameter", "Depth into each half", "Clearance per side"]);
    expect(text(panel)).toContain("loose pins");
    expect(summary(panel)).toEqual(["Room for 2 on the cut face."]);
  });

  it("says when the plugs are being worked out, then how many fit on how many cut faces and which are too small", () => {
    const working = mount({ kind: "plugs" }, { state: "working" });
    expect(text(working.panel)).toContain("Round pegs stand on the half named with a minus");
    expect(summary(working.panel)).toEqual(["Looking for room on the cut face …"]);
    act(() => root?.unmount());
    const { panel } = mount({ kind: "plugs" }, done({ placed: 4, faces: 3, tooSmall: 1, tooThin: 1 }, 1));
    expect(summary(panel)).toEqual([
      "Room for 4 on 3 cut faces.",
      "One cut face is too small for a connector.",
      "1 left out where a half is thinner than the depth.",
      "Holes are split without connectors.",
    ]);
  });

  it("says when no connector fits, so the parts are split without", () => {
    const { panel } = mount({ kind: "dowels" }, done({ placed: 0, faces: 2, tooSmall: 2 }));
    expect(summary(panel)).toEqual([
      "No connector fits on the cut face, so the parts will be split without. A smaller diameter may fit.",
      "“Filament as dowels (1.75 mm)” needs less room and fits plates from 3 mm.",
    ]);
    act(() => root?.unmount());
    // Plugs have no filament to point to.
    const plugs = mount({ kind: "plugs" }, done({ placed: 0, faces: 2, tooSmall: 2 }));
    expect(summary(plugs.panel)).toEqual(["No connector fits on the cut face, so the parts will be split without. A smaller diameter may fit."]);
  });

  it("takes filament as the dowels: no diameter and no base, and the length to cut (Discussion #1986)", () => {
    const { panel, changes } = mount({ kind: "dowels" }, done({ placed: 2 }));
    const checks = () => [...panel.querySelectorAll<HTMLLabelElement>(".split-panel label.edge-modifier-check")];
    expect(checks().map((label) => label.textContent)).toEqual(["Filament as dowels (1.75 mm)", "Dowels on a breakaway base"]);
    act(() => checks()[0].querySelector("input")!.click());
    expect(changes).toEqual([{ dowelFilament: true }]);
    act(() => root?.unmount());
    const filament = mount({ kind: "dowels", dowelFilament: true }, done({ placed: 0, faces: 1, tooSmall: 1 }));
    expect(fieldLabels(filament.panel)).toEqual(["Per cut face (0 = automatic)", "Depth into each half", "Clearance per side"]);
    expect([...filament.panel.querySelectorAll(".split-panel label.edge-modifier-check")].map((label) => label.textContent)).toEqual(["Filament as dowels (1.75 mm)"]);
    expect(text(filament.panel)).toContain("Cut pieces of filament 11 mm long, one for each pair of holes.");
    // Nothing smaller to point to once the filament is chosen.
    expect(summary(filament.panel)).toEqual(["No connector fits on the cut face, so the parts will be split without. A smaller diameter may fit."]);
    act(() => root?.unmount());
    // The switch belongs to the dowels.
    const plugs = mount({ kind: "plugs", dowelFilament: true });
    expect(fieldLabels(plugs.panel)).toContain("Diameter");
    expect(text(plugs.panel)).not.toContain("Filament as dowels");
  });

  it("says the clearance comes from the fit test while it holds the printer's play", () => {
    setPrinterPlay(0.15);
    const from = mount({ kind: "dowels", clearance: 0.15 });
    expect(text(from.panel)).toContain("From your fit test");
    act(() => root?.unmount());
    const own = mount({ kind: "dowels", clearance: 0.3 });
    expect(text(own.panel)).not.toContain("From your fit test");
  });

  it("shows the magnets' size, their well and the pocket they get, and hands a listed size over in one go", () => {
    const { panel, changes } = mount({ kind: "magnets" }, done({ placed: 2, faces: 1 }));
    expect(kindButtons(panel).map((button) => button.getAttribute("aria-pressed"))).toEqual(["false", "false", "false", "false", "false", "true"]);
    expect(fieldLabels(panel)).toEqual(["Per cut face (0 = automatic)", "Magnet diameter (mm)", "Magnet height (mm)", "Clearance per side"]);
    expect(text(panel)).toContain("Glue well below the pocket");
    expect(text(panel)).toContain("Pocket Ø 6.4 mm, 2.2 mm deep, glue well Ø 3 mm, 1 mm deep");
    const size = panel.querySelector<HTMLSelectElement>(".split-panel select[aria-label='Magnet size']")!;
    expect(size.value).toBe("6x2");
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")!.set!.call(size, "3x1");
      size.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(changes.at(-1)).toEqual({ magnetDiameter: 3, magnetHeight: 1 });
  });

  it("shows the dovetail's measures, and says in its own words when a cut face has no room for one", () => {
    const { panel, changes } = mount({ kind: "dovetail" }, done({ placed: 1, faces: 2, tooSmall: 1 }));
    expect(kindButtons(panel).map((button) => button.getAttribute("aria-pressed"))).toEqual(["false", "false", "false", "false", "true", "false"]);
    expect(fieldLabels(panel)).toEqual(["Per cut face (0 = automatic)", "Width at the cut face", "Depth into the other half", "Flank angle", "Clearance per side"]);
    expect(text(panel)).toContain("Slide the halves together from the side");
    expect(summary(panel)).toEqual(["Room for 1 on 2 cut faces.", "One cut face is too small for a dovetail."]);
    // Automatic to begin with; the slider comes with the switch off, so that 0 can be asked for (Discussion #2201).
    const auto = [...panel.querySelectorAll<HTMLLabelElement>(".split-panel label.edge-modifier-check")].find((label) => label.textContent === "Automatic direction")!.querySelector("input")!;
    expect(auto.checked).toBe(true);
    act(() => auto.click());
    expect(changes).toContainEqual({ dovetailAutoTurn: false });
    act(() => root?.unmount());
    const own = mount({ kind: "dovetail", dovetailAutoTurn: false }, done({ placed: 1, faces: 2, tooSmall: 1 }));
    expect(fieldLabels(own.panel)).toEqual(["Per cut face (0 = automatic)", "Width at the cut face", "Depth into the other half", "Flank angle", "Direction", "Clearance per side"]);
    const direction = [...own.panel.querySelectorAll<HTMLInputElement>(".split-panel input[type=range]")].find((input) => input.min === "-90");
    expect(direction?.max).toBe("90");
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(direction, "90");
      direction!.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(own.changes).toContainEqual({ dovetailTurn: 90 });
    act(() => root?.unmount());
    const none = mount({ kind: "dovetail" }, done({ placed: 0, faces: 1, tooSmall: 1 }));
    expect(summary(none.panel)).toEqual(["No dovetail fits on the cut face, so the parts will be split without. A narrower or shallower tongue may fit."]);
  });

  it("shows a lip's measures without a number, and says why a cut face gets none (Discussion #2181)", () => {
    const { panel } = mount({ kind: "lip" }, done({ placed: 1, faces: 2, tooSmall: 1 }));
    expect(fieldLabels(panel)).toEqual(["Lip depth", "Lip width", "Clearance per side"]);
    expect(text(panel)).toContain("0: half of the wall, up to 3 mm.");
    expect(summary(panel)).toEqual(["Room for 1 on 2 cut faces.", "One cut face has no opening or too thin a wall for a lip."]);
    act(() => root?.unmount());
    const none = mount({ kind: "lip", lipWidth: 2 }, done({ placed: 0, faces: 1, tooSmall: 1 }));
    expect(text(none.panel)).not.toContain("0: half of the wall");
    expect(summary(none.panel)[0]).toContain("No lip fits");
  });

  it("says when the tongues were turned across or made smaller to fit (Discussion #2129)", () => {
    const turned = mount({ kind: "dovetail" }, { ...done({ placed: 1 }), dovetail: { dovetailWidth: 6, dovetailDepth: 4, turned: true } });
    expect(summary(turned.panel)).toEqual(["Room for 1 on the cut face.", "No room lengthwise, so the tongues run across the cut face."]);
    act(() => root?.unmount());
    const smaller = mount({ kind: "dovetail" }, { ...done({ placed: 1 }), dovetail: { dovetailWidth: 4.5, dovetailDepth: 2.8, turned: false } });
    expect(summary(smaller.panel)).toEqual(["Room for 1 on the cut face.", "Made smaller to fit: 4.5 mm wide, 2.8 mm deep."]);
    act(() => root?.unmount());
    const asSet = mount({ kind: "dovetail" }, { ...done({ placed: 1 }), dovetail: { dovetailWidth: 6, dovetailDepth: 4, turned: false } });
    expect(summary(asSet.panel)).toEqual(["Room for 1 on the cut face."]);
  });
});
