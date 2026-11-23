// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { ShellPanel } from "@/components/workplane/ShellPanel";
import type { ShellDividers } from "@/lib/shellGridLimits";
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

/** The Hollow panel for a box 100 x 70 with these dividers; what it hands on comes back in `changes`. */
function mount(dividers: ShellDividers | null, more: Record<string, unknown> = {}) {
  const changes: (ShellDividers | null)[] = [];
  const nothing = () => {};
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(createElement(ShellPanel, {
      targetName: "Box", thickness: 2, maxThickness: 10, openings: "top", edges: "round", stack: 0, stackOffered: true,
      gridCells: 0, gridFit: false, gridMagnets: false, onGridMagnetsChange: nothing, gridScrews: false, onGridScrewsChange: nothing, gridMax: 2, gridColumns: 2, gridRows: 1,
      dividers, insideWidth: 96, insideDepth: 66, pocketParts: [{ id: "part", name: "Part" }], onAddPocket: nothing, dividerFullHeight: 33,
      shelf: 0, shelfHeight: 20, shelfOffered: true, workspace: DEFAULT_WORKPLANE_WORKSPACE, busy: false, error: null,
      appliedFeatureCount: 0, reversibleFeatureCount: 0, historyOptions: [], onRemoveFeature: nothing,
      onThicknessChange: nothing, onOpeningsChange: nothing, onEdgesChange: nothing, onStackChange: nothing, onGridChange: nothing, onGridSize: nothing,
      onDividersChange: (value: ShellDividers | null) => changes.push(value), onShelfChange: nothing, onShelfHeightChange: nothing, onApply: nothing, onCancel: nothing, ...more,
    } as unknown as Parameters<typeof ShellPanel>[0]));
  });
  return { panel: container, changes };
}

const find = (panel: HTMLElement, id: string) => panel.querySelector<HTMLElement>(`[data-testid="${id}"]`);

describe("the Hollow panel with the dividers as a loose insert", () => {
  it("offers the insert only once there are dividers, and switches it on and off", () => {
    expect(find(mount(null).panel, "shell-insert")).toBeNull();
    act(() => root?.unmount());
    const fixed = mount({ x: 1, z: 1 });
    const box = find(fixed.panel, "shell-insert") as HTMLInputElement;
    expect(box.checked).toBe(false);
    expect(fixed.panel.textContent).not.toContain("Play round the insert");
    act(() => box.click());
    expect(fixed.changes.at(-1)).toEqual({ x: 1, z: 1, insert: true });
    act(() => root?.unmount());
    const loose = mount({ x: 1, z: 1, insert: true, insertPlay: 0.4 });
    expect((find(loose.panel, "shell-insert") as HTMLInputElement).checked).toBe(true);
    expect(loose.panel.textContent).toContain("Play round the insert");
    expect(loose.panel.textContent).toContain("On Apply the dividers become a tray to take out");
    act(() => find(loose.panel, "shell-insert")!.click());
    // Switched off, the flag goes; the play is kept for the next time.
    expect(loose.changes.at(-1)).toEqual({ x: 1, z: 1, insert: undefined, insertPlay: 0.4 });
  });

  it("leaves the finger scoops and the shaped pockets out while the dividers are an insert", () => {
    const fixed = mount({ x: 1, z: 1 });
    expect(find(fixed.panel, "shell-scoops")).not.toBeNull();
    expect(find(fixed.panel, "shell-pockets")).not.toBeNull();
    act(() => root?.unmount());
    const loose = mount({ x: 1, z: 1, insert: true });
    expect(find(loose.panel, "shell-scoops")).toBeNull();
    expect(find(loose.panel, "shell-pockets")).toBeNull();
    // Walls set by hand can be an insert as well.
    act(() => root?.unmount());
    const manual = mount({ x: 0, z: 0, manual: true, walls: [{ dir: "x", at: 30, from: 0, to: 66 }] });
    expect(find(manual.panel, "shell-insert")).not.toBeNull();
  });
});

describe("the Hollow panel's step on to the lid", () => {
  it("offers to apply and go on to the lid with the top open, and not without", () => {
    let asked = 0;
    const open = mount({ x: 1, z: 1 }, { onMakeLid: () => { asked += 1; } });
    const button = find(open.panel, "shell-then-lid") as HTMLButtonElement;
    expect(button.textContent).toBe("Apply and make the lid");
    act(() => button.click());
    expect(asked).toBe(1);
    act(() => root?.unmount());
    // A sealed cavity or an open bottom alone takes no lid; nor is the button there where nothing opens the tool.
    expect(find(mount(null, { onMakeLid: () => {}, openings: "none" }).panel, "shell-then-lid")).toBeNull();
    act(() => root?.unmount());
    expect(find(mount(null, { onMakeLid: () => {}, openings: "bottom" }).panel, "shell-then-lid")).toBeNull();
    act(() => root?.unmount());
    expect(find(mount({ x: 1, z: 1 }).panel, "shell-then-lid")).toBeNull();
    act(() => root?.unmount());
    // With an error showing, the hollowing cannot be kept: the step waits.
    expect((find(mount(null, { onMakeLid: () => {}, error: "Walls too thick" }).panel, "shell-then-lid") as HTMLButtonElement).disabled).toBe(true);
  });
});
