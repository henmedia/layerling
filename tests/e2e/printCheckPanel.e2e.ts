// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PrintCheckPanel, type PrintCheckLine } from "@/components/workplane/PrintCheckPanel";
import { setLanguage } from "@/lib/i18n";
import type { PrintCheckPiece, PrintCheckResult } from "@/lib/printCheck";
import { DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";

/**
 * The print check's window: a line for each check, green or amber, Show on the amber ones, the nozzle as buttons and
 * a field, the line that says the design changed, and the summary.
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
});

const box = { min: [0, 0, 0] as [number, number, number], max: [10, 10, 10] as [number, number, number] };
const piece = (patch: Partial<PrintCheckPiece>): PrintCheckPiece => ({
  key: "piece-1", ids: ["a"], name: "A", box, triangles: 12, onPlate: true, floating: false, heightMm: 10, footprintMm2: 100, smallContact: false, ...patch,
});
const clean: PrintCheckResult = {
  nozzleMm: 0.4, minimumWallMm: 0.8, pieces: [piece({})], thinWalls: { places: [], positions: [], rays: 12 }, wallTriangles: 12,
  overhang: { angle: 45, areaMm2: 0, steepest: null }, openMeshes: [], unchecked: [], joined: true,
};
const troubled: PrintCheckResult = {
  ...clean,
  pieces: [
    piece({ key: "piece-1", ids: ["tray"], name: "Tray" }),
    piece({ key: "piece-2", ids: ["lid"], name: "Lid", onPlate: false, floating: true, footprintMm2: null, box: { min: [20, 4, 0], max: [50, 7, 30] } }),
    piece({ key: "piece-3", ids: ["ball"], name: "Ball", footprintMm2: 4, heightMm: 16, smallContact: true }),
  ],
  thinWalls: { places: [{ id: "tray", name: "Tray", areaMm2: 288, thinnestMm: 0.6, point: [15, 10, 0], box }], positions: [0, 0, 0, 1, 0, 0, 0, 1, 0], rays: 900 },
  overhang: { angle: 45, areaMm2: 900, steepest: { degrees: 90, name: "Lid" } },
};

function mount(props: { result?: PrintCheckResult | null; stale?: boolean; running?: boolean; overhangsShown?: boolean; nozzle?: number } = {}) {
  const calls: string[] = [];
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(createElement(PrintCheckPanel, {
      scope: "All visible objects",
      settings: { nozzle: props.nozzle ?? 0.4 },
      workspace: DEFAULT_WORKPLANE_WORKSPACE,
      result: props.result === undefined ? troubled : props.result,
      running: props.running ?? false,
      stale: props.stale ?? false,
      error: null,
      active: null,
      overhangsShown: props.overhangsShown ?? false,
      onChange: (patch) => calls.push(`nozzle:${patch.nozzle}`),
      onCheck: () => calls.push("check"),
      onShow: (line: PrintCheckLine) => calls.push(`show:${line}`),
      onClose: () => calls.push("close"),
    }));
  });
  return { panel: container, calls };
}

const rows = (panel: HTMLElement) => [...panel.querySelectorAll<HTMLElement>(".print-check-row")];
const click = (element: Element | null) => act(() => (element as HTMLElement).click());

describe("the print check's window", () => {
  it("lists the five checks in order, green when nothing was found and amber with what and where", () => {
    const { panel } = mount();
    expect(rows(panel).map((row) => row.dataset.line)).toEqual(["thin", "floating", "contact", "overhang", "openMesh"]);
    expect(rows(panel).map((row) => row.className.split(" ")[1])).toEqual(["warning", "warning", "warning", "warning", "ok"]);
    const [thin, floating, contact, overhang] = rows(panel).map((row) => row.textContent ?? "");
    expect(thin).toMatch(/Thinnest 0[.,]60 mm on "Tray", 2[.,]88 cm² of surface below 0[.,]80 mm/);
    expect(thin).toContain("prints it as one weak line");
    expect(floating).toMatch(/"Lid" 4[.,]00 mm above the plate/);
    expect(contact).toMatch(/"Ball" stands on 4[.,]00 mm² at 16[.,]00 mm tall/);
    // The overhangs in the words of the line under the view.
    expect(overhang).toContain("Steepest overhang 90° on \"Lid\"");
    expect(panel.textContent).toContain("Something found in 4 of 5 checks");
  });

  it("has Show on the amber lines only, and hands the line over", () => {
    const { panel, calls } = mount();
    const shows = [...panel.querySelectorAll<HTMLButtonElement>(".print-check-show")];
    expect(shows.map((button) => button.getAttribute("aria-label"))).toEqual(["Show: Thin walls", "Show: Floating parts", "Show: Small contact with the plate", "Show: Overhangs"]);
    click(shows[1]);
    click(shows[3]);
    expect(calls).toEqual(["show:floating", "show:overhang"]);
  });

  it("says when nothing was found, and shows no Show at all", () => {
    const { panel } = mount({ result: clean });
    expect(rows(panel).every((row) => row.classList.contains("ok"))).toBe(true);
    expect(panel.querySelector(".print-check-show")).toBeNull();
    expect(panel.textContent).toContain("Nothing found: ready for the slicer.");
    expect(panel.textContent).toContain("No wall thinner than 0");
  });

  it("says when the walls were not measured", () => {
    const { panel } = mount({ result: { ...clean, thinWalls: null, wallTriangles: 2_500_000 } });
    expect(rows(panel)[0].className).toContain("unchecked");
    expect(rows(panel)[0].textContent).toMatch(/Not measured: 2.500.000 triangles are too many/);
  });

  it("offers to check again once the design changed, and keeps Show from pointing at what is gone", () => {
    const { panel, calls } = mount({ stale: true });
    const stale = panel.querySelector<HTMLButtonElement>(".clearance-stale")!;
    expect(stale.textContent).toContain("Changed – check again");
    expect([...panel.querySelectorAll<HTMLButtonElement>(".print-check-show")].every((button) => button.disabled)).toBe(true);
    expect(panel.querySelector(".print-check-list")!.classList.contains("stale")).toBe(true);
    click(stale);
    expect(calls).toEqual(["check"]);
  });

  it("marks the overhangs' Show as pressed while Show overhangs is on", () => {
    const { panel } = mount({ overhangsShown: true });
    expect(panel.querySelector('.print-check-row[data-line="overhang"] .print-check-show')!.getAttribute("aria-pressed")).toBe("true");
    expect(panel.querySelector('.print-check-row[data-line="thin"] .print-check-show')!.getAttribute("aria-pressed")).toBe("false");
  });

  it("takes a nozzle from its buttons and from the field, and gives the wall it needs", () => {
    const { panel, calls } = mount({ nozzle: 0.4 });
    expect(panel.querySelector(".print-check-nozzle-hint")!.textContent).toMatch(/Walls from 0[.,]80 mm: two lines of the nozzle/);
    const buttons = [...panel.querySelectorAll<HTMLButtonElement>(".print-check-nozzles button")];
    expect(buttons.map((button) => button.textContent)).toEqual(["0.20", "0.40", "0.60", "0.80"]);
    expect(buttons[1].getAttribute("aria-pressed")).toBe("true");
    click(buttons[2]);
    const field = panel.querySelector<HTMLInputElement>(".print-check-nozzle-field input")!;
    const type = (value: string) => act(() => {
      field.focus();
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
      setter.call(field, value);
      field.dispatchEvent(new Event("input", { bubbles: true }));
      field.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    type("0,25");
    // Beyond the range it is held at the largest; what is no number leaves the nozzle as it was.
    type("7");
    type("wide");
    expect(calls).toEqual(["nozzle:0.6", "nozzle:0.25", "nozzle:2"]);
    expect(field.value).toBe("0.40");
  });

  it("closes, and checks again from its footer", () => {
    const { panel, calls } = mount();
    click(panel.querySelector(".edge-modifier-footer .secondary"));
    click(panel.querySelector(".edge-modifier-footer .primary"));
    expect(calls).toEqual(["close", "check"]);
    expect(panel.querySelector(".edge-modifier-footer .primary")!.textContent).toContain("Check again");
  });
});
