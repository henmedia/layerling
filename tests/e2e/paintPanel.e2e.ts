// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PaintPanel } from "@/components/workplane/PaintPanel";
import { setLanguage } from "@/lib/i18n";
import { DEFAULT_PAINT_TOOL, normalizePaintTool, type PaintToolSettings } from "@/lib/paint";
import { DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";

/**
 * The paint tool's window: fill, circle and lasso, the design's colours and one of one's own, the eraser, the angle of
 * a fill and the size of a circle, how many strokes the body carries, Clear all and Done.
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

function mount(props: { settings?: Partial<PaintToolSettings>; strokes?: number; wholeFaces?: boolean } = {}) {
  const calls: string[] = [];
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(createElement(PaintPanel, {
      targetName: "Box",
      settings: normalizePaintTool({ ...DEFAULT_PAINT_TOOL, color: "#2f9e44", ...props.settings }),
      colors: ["#1c7ed6", "#2f9e44", "#ffffff"],
      strokes: props.strokes ?? 0,
      wholeFaces: props.wholeFaces ?? false,
      workspace: DEFAULT_WORKPLANE_WORKSPACE,
      onChange: (patch) => calls.push(JSON.stringify(patch)),
      onClear: () => calls.push("clear"),
      onClose: () => calls.push("close"),
    }));
  });
  return { panel: container, calls };
}

const click = (element: Element | null | undefined) => act(() => (element as HTMLElement).click());
const button = (panel: HTMLElement, text: string) => [...panel.querySelectorAll<HTMLButtonElement>("button")].find((entry) => entry.textContent?.trim() === text);

describe("the paint tool's window", () => {
  it("offers fill, circle and lasso, with the fill's angle and what a click does", () => {
    const { panel, calls } = mount();
    const modes = [...panel.querySelectorAll<HTMLButtonElement>("[role=radiogroup] [role=radio]")].filter((entry) => entry.textContent);
    expect(modes.map((entry) => entry.textContent)).toEqual(["Fill", "Circle", "Lasso"]);
    expect(modes.map((entry) => entry.getAttribute("aria-checked"))).toEqual(["true", "false", "false"]);
    expect(panel.querySelector("[role=status]")?.textContent).toBe("Click a face to fill it up to its sharp edges.");
    expect(panel.textContent).toContain("Stop at edges sharper than");
    expect(panel.textContent).not.toContain("Diameter");
    click(modes[1]);
    click(modes[2]);
    expect(calls).toEqual([JSON.stringify({ mode: "circle" }), JSON.stringify({ mode: "lasso" })]);
  });

  it("shows the circle's diameter in circle mode, and the eraser's own words", () => {
    const { panel } = mount({ settings: { mode: "circle", erase: true } });
    expect(panel.textContent).toContain("Diameter");
    expect(panel.textContent).not.toContain("Stop at edges sharper than");
    expect(panel.querySelector("[role=status]")?.textContent).toBe("Eraser: click where a round patch of paint should come off.");
    expect(button(panel, "Eraser")?.getAttribute("aria-pressed")).toBe("true");
    // With the eraser on, no colour is the one chosen.
    expect(panel.querySelectorAll(".color-grid .selected")).toHaveLength(0);
  });

  it("picks a colour of the design, its own colour, or the eraser", () => {
    const { panel, calls } = mount();
    const swatches = [...panel.querySelectorAll<HTMLButtonElement>(".color-grid button")];
    expect(swatches.map((entry) => entry.title)).toEqual(["#1C7ED6", "#2F9E44", "#FFFFFF"]);
    expect(swatches.map((entry) => entry.getAttribute("aria-checked"))).toEqual(["false", "true", "false"]);
    click(swatches[2]);
    const own = panel.querySelector<HTMLInputElement>("input[type=color]")!;
    expect(own.value).toBe("#2f9e44");
    act(() => {
      own.value = "#ae3ec9";
      own.dispatchEvent(new Event("change"));
    });
    click(button(panel, "Eraser"));
    expect(calls).toEqual([
      JSON.stringify({ color: "#ffffff", erase: false }),
      JSON.stringify({ color: "#ae3ec9", erase: false }),
      JSON.stringify({ erase: true }),
    ]);
  });

  it("counts the strokes, clears them all and closes", () => {
    const empty = mount();
    expect(empty.panel.textContent).toContain("No paint on this body yet.");
    expect(button(empty.panel, "Clear all")?.disabled).toBe(true);
    act(() => root?.unmount());
    const painted = mount({ strokes: 3, wholeFaces: true });
    expect(painted.panel.textContent).toContain("Strokes on this body: 3. Undo takes the last one back.");
    expect(painted.panel.textContent).toContain("This mesh is not closed: circles and lassos follow its triangles.");
    click(button(painted.panel, "Clear all"));
    click(button(painted.panel, "Done"));
    click(painted.panel.querySelector("button[aria-label='Close the paint tool']"));
    expect(painted.calls).toEqual(["clear", "close", "close"]);
  });

  it("speaks German as the editor does", async () => {
    await setLanguage("de", false);
    const { panel } = mount({ settings: { mode: "lasso" } });
    expect(panel.textContent).toContain("Bemalen");
    expect([...panel.querySelectorAll("[role=radio]")].map((entry) => entry.textContent).filter(Boolean)).toEqual(["Füllen", "Kreis", "Lasso"]);
    expect(panel.querySelector("[role=status]")?.textContent).toBe("Halte die Maustaste gedrückt und umfahre den Bereich.");
  });
});
