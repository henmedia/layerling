// @vitest-environment jsdom
import { act, createElement, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { PlateBar } from "@/components/workplane/PlateBar";
import { useBuildPlates } from "@/components/workplane/useBuildPlates";
import { t } from "@/lib/i18n";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import type { WorkplaneShape } from "@/types/layerling";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const box = (id: string, x: number, z: number): WorkplaneShape => ({
  id, name: id, kind: "box", color: "#ff0000", x, z, elevation: 0, size: 20, width: 20, depth: 20, height: 10, rotation: 0,
});

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  container = null;
  root = null;
});

type Commit = { shapes: WorkplaneShape[]; message?: string };

/** The plate bar wired to the build-plates hook the way the editor wires it. */
function mount(shapes: WorkplaneShape[], selected: string[] = []) {
  const commits: Commit[] = [];
  const workspace = { ...DEFAULT_WORKPLANE_WORKSPACE, plates: ["", ""] };
  function Harness() {
    const workspaceRef = useRef(workspace);
    const snapGridRef = useRef(DEFAULT_SNAP_GRID);
    const shapesRef = useRef(shapes);
    const selectedIdsRef = useRef(selected);
    const plates = useBuildPlates({
      workspace,
      workspaceRef,
      snapGridRef,
      shapes,
      shapesRef,
      selectedIdsRef,
      selectedCount: selected.length,
      overhangs: [],
      roundPlate: false,
      commitShapes: (next, _selection, message) => commits.push({ shapes: next, message }),
      updateWorkspace: () => {},
      setNotice: () => {},
    });
    return createElement(PlateBar, {
      plates: plates.plates,
      active: plates.active,
      selectionCount: selected.length,
      onSelect: plates.select,
      onAdd: plates.add,
      onShowAll: plates.showAll,
      onRename: plates.rename,
      onMove: plates.move,
      onRemove: plates.remove,
      onArrange: plates.arrange,
      onClose: plates.closeBar,
    });
  }
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(createElement(Harness)));
  const label = selected.length ? t("plates.arrangeSelected", { count: selected.length }) : t("plates.arrange");
  const button = [...container.querySelectorAll<HTMLButtonElement>("button")].find((entry) => entry.textContent?.trim() === label)!;
  return { button, commits };
}

describe("Arrange on plates button", () => {
  it("arranges every body when nothing is selected", () => {
    const { button, commits } = mount([box("a", 0, 0), box("b", 0, 0)]);
    expect(button).toBeTruthy();
    act(() => button.click());
    expect(commits).toHaveLength(1);
    const [a, b] = commits[0].shapes;
    // Both were stacked on the same spot; laid out in a row they no longer are.
    expect(a.x !== b.x || a.z !== b.z).toBe(true);
  });

  it("arranges only the selection", () => {
    const { button, commits } = mount([box("a", 0, 0), box("b", 0, 0), box("c", 0, 0)], ["a", "b"]);
    act(() => button.click());
    expect(commits).toHaveLength(1);
    const c = commits[0].shapes.find((shape) => shape.id === "c")!;
    expect([c.x, c.z]).toEqual([0, 0]);
  });
});
