// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CableChannelPanel, type CableChannelPanelResult } from "@/components/workplane/CableChannelPanel";
import { CABLE_DEFAULTS } from "@/lib/cableChannel";
import { setLanguage } from "@/lib/i18n";
import { DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";

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

function mount(props: { entrySet?: boolean; exitSet?: boolean; picking?: "entry" | "exit" | null; result?: CableChannelPanelResult }) {
  const calls: string[] = [];
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(createElement(CableChannelPanel, {
      targetName: "Deer",
      settings: CABLE_DEFAULTS,
      entrySet: props.entrySet ?? false,
      exitSet: props.exitSet ?? false,
      picking: props.picking ?? null,
      result: props.result ?? { state: "idle" },
      workspace: DEFAULT_WORKPLANE_WORKSPACE,
      busy: false,
      error: null,
      onChange: () => calls.push("change"),
      onPick: (end) => calls.push(`pick:${end}`),
      onApply: () => calls.push("apply"),
      onCancel: () => calls.push("cancel"),
    }));
  });
  return { panel: container, calls };
}

const text = (panel: HTMLElement) => panel.textContent ?? "";
const applyButton = (panel: HTMLElement) => panel.querySelector<HTMLButtonElement>(".edge-modifier-footer button.primary")!;

describe("the cable channel's panel", () => {
  it("asks for the entry first and waits for a click on the body", () => {
    const { panel } = mount({ picking: "entry" });
    expect(text(panel)).toContain("Now click on the body …");
    expect(text(panel)).toContain("Exit");
    for (const label of ["Diameter", "Smallest bend", "Least wall"]) expect(text(panel)).toContain(label);
    // Nothing found yet: nothing to make.
    expect(applyButton(panel).disabled).toBe(true);
  });

  it("lets an end be set again, and says what the way it found measures", () => {
    const { panel, calls } = mount({ entrySet: true, exitSet: true, result: { state: "found", length: 134.62, minBend: 25, minWall: 2.94, tight: false, thin: false } });
    expect(text(panel)).toContain("Way found: 134.6 mm, tightest bend 25 mm, thinnest wall 2.9 mm.");
    const again = [...panel.querySelectorAll<HTMLButtonElement>(".cable-channel-end button")];
    expect(again.map((button) => button.textContent)).toEqual(["Set again", "Set again"]);
    act(() => again[1].click());
    expect(calls).toContain("pick:exit");
    expect(applyButton(panel).disabled).toBe(false);
    act(() => applyButton(panel).click());
    expect(calls).toContain("apply");
  });

  it("says a straight channel is straight, and warns in red when a bend had to be tighter than asked", () => {
    const straight = mount({ entrySet: true, exitSet: true, result: { state: "found", length: 80, minBend: Infinity, minWall: 17.5, tight: false, thin: false } });
    expect(text(straight.panel)).toContain("Way found: 80 mm, straight, thinnest wall 17.5 mm.");
    act(() => root?.unmount());
    const tight = mount({ entrySet: true, exitSet: true, result: { state: "found", length: 50, minBend: 12, minWall: 3, tight: true, thin: false } });
    expect(tight.panel.querySelector(".cable-channel-status.warning")).not.toBeNull();
    expect(text(tight.panel)).toContain("A bend is tighter than asked");
  });

  it("shows why no channel could be found", () => {
    const { panel } = mount({ entrySet: true, exitSet: true, result: { state: "error", message: "No way found that keeps the wall." } });
    expect(panel.querySelector("[role=alert]")!.textContent).toBe("No way found that keeps the wall.");
    expect(applyButton(panel).disabled).toBe(true);
  });
});
