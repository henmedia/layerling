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
 * the fit test.
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
  it("offers None, Dowels and Plugs, with None chosen and nothing more shown", () => {
    const { panel, changes } = mount({});
    expect(kindButtons(panel).map((button) => button.textContent)).toEqual(["None", "Dowels", "Plugs"]);
    expect(kindButtons(panel).map((button) => button.getAttribute("aria-pressed"))).toEqual(["true", "false", "false"]);
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
    expect(summary(panel)).toEqual(["No connector fits on the cut face, so the parts will be split without. A smaller diameter may fit."]);
  });

  it("says the clearance comes from the fit test while it holds the printer's play", () => {
    setPrinterPlay(0.15);
    const from = mount({ kind: "dowels", clearance: 0.15 });
    expect(text(from.panel)).toContain("From your fit test");
    act(() => root?.unmount());
    const own = mount({ kind: "dowels", clearance: 0.3 });
    expect(text(own.panel)).not.toContain("From your fit test");
  });
});
