// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { LidPanel } from "@/components/workplane/LidPanel";
import { t } from "@/lib/i18n";
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

/** The checkbox in the label that reads `text`. */
function checkbox(panel: HTMLElement, text: string) {
  const label = Array.from(panel.querySelectorAll("label")).find((entry) => entry.textContent?.trim() === text);
  return label?.querySelector<HTMLInputElement>("input[type=checkbox]") ?? null;
}

/** Discussion #1988: the lid leaves an opening right through the body open, and the panel lets you close it after all. */
describe("the lid panel's switch for openings right through the body", () => {
  it("is ticked to begin with, for every kind of lid, and hands on the change", () => {
    for (const type of ["plug", "cap", "flat", "screw", "slide"] as const) {
      const { panel, changes } = mount({ type });
      const box = checkbox(panel, t("lid.leaveOpenings"));
      expect([type, box?.checked]).toEqual([type, true]);
      act(() => box!.click());
      expect(changes).toEqual([{ leaveOpenings: false }]);
      act(() => root?.unmount());
      container?.remove();
      root = null;
      container = null;
    }
  });

  it("shows it unticked when the openings are to be closed", () => {
    const { panel } = mount({ leaveOpenings: false });
    expect(checkbox(panel, t("lid.leaveOpenings"))?.checked).toBe(false);
  });
});
