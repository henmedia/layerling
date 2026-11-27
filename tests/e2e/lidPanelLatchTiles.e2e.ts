// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { LidPanel } from "@/components/workplane/LidPanel";
import { LID_DEFAULTS, LID_LATCH_STYLES, type LidOptions } from "@/lib/lidTool";
import { MESSAGES_EN } from "@/lib/messages.en";
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

const tiles = (panel: HTMLElement) => [...panel.querySelectorAll<HTMLButtonElement>('[role="group"][aria-label="Kind"] button')];

describe("the lid's latch kinds as picture tiles", () => {
  it("show a tile with a side-view picture and the name for every kind, the chosen one marked", () => {
    const { panel } = mount({ latches: 1 });
    const buttons = tiles(panel);
    expect(buttons.length).toBe(LID_LATCH_STYLES.length);
    LID_LATCH_STYLES.forEach((style, index) => {
      const button = buttons[index];
      expect(button.textContent).toBe(MESSAGES_EN[`lid.latchStyle.${style}`]);
      // Each its own picture: the box's wall and the lid's edge, and the latch in the accent colour.
      const picture = button.querySelector(`svg[data-latch-kind="${style}"]`);
      expect(picture).not.toBeNull();
      expect(picture!.querySelector(".latch-kind-accent")).not.toBeNull();
      // Plain buttons, so the keyboard reaches them, with their state for a screen reader.
      expect(button.type).toBe("button");
      expect(button.disabled).toBe(false);
      expect(button.getAttribute("aria-pressed")).toBe(style === "clip" ? "true" : "false");
    });
    expect(panel.querySelector('[role="group"][aria-label="Kind"] button.selected')?.textContent).toBe("Clips");
    // No tiles without latches.
    act(() => root?.unmount());
    expect(tiles(mount().panel).length).toBe(0);
  });

  it("choose a kind when its tile is clicked, and mark the kind the settings have", () => {
    const { panel, changes } = mount({ latches: 2 });
    LID_LATCH_STYLES.forEach((style, index) => {
      act(() => tiles(panel)[index].click());
      expect(changes.at(-1)).toEqual({ latchStyle: style });
    });
    for (const style of LID_LATCH_STYLES) {
      act(() => root?.unmount());
      const chosen = tiles(mount({ latches: 1, latchStyle: style }).panel).filter((button) => button.getAttribute("aria-pressed") === "true");
      expect(chosen.map((button) => button.textContent)).toEqual([MESSAGES_EN[`lid.latchStyle.${style}`]]);
    }
  });
});
