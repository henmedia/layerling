// @vitest-environment jsdom
import { act, createElement, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { useBuildPlates } from "@/components/workplane/useBuildPlates";
import { plateCenterX, plateOfShape } from "@/lib/buildPlates";
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

const workspace = { ...DEFAULT_WORKPLANE_WORKSPACE, plates: ["", "", ""] };

/** The build-plates hook as the editor holds it; returns what it hands out after each render. */
function mount() {
  const current: { plates: ReturnType<typeof useBuildPlates> | null } = { plates: null };
  function Harness() {
    const workspaceRef = useRef(workspace);
    const snapGridRef = useRef(DEFAULT_SNAP_GRID);
    const shapesRef = useRef<WorkplaneShape[]>([]);
    const selectedIdsRef = useRef<string[]>([]);
    current.plates = useBuildPlates({
      workspace,
      workspaceRef,
      snapGridRef,
      shapes: [],
      shapesRef,
      selectedIdsRef,
      selectedCount: 0,
      overhangs: [],
      roundPlate: false,
      commitShapes: () => {},
      updateWorkspace: () => {},
      setNotice: () => {},
    });
    return null;
  }
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(createElement(Harness)));
  return current;
}

describe("imported bodies land on the active plate (#1514)", () => {
  it("leaves them where they are while the first plate is active", () => {
    const hook = mount();
    const bodies = [box("a", 0, 0), box("b", 30, -10)];
    expect(hook.plates!.ontoActivePlate(bodies)).toEqual(bodies);
  });

  it("moves them onto the active plate, keeping their places to each other", () => {
    const hook = mount();
    act(() => hook.plates!.select(2));
    const moved = hook.plates!.ontoActivePlate([box("a", 0, 0), box("b", 30, -10)]);
    const dx = plateCenterX(workspace, 2);
    expect(dx).toBeGreaterThan(0);
    expect(moved.map((shape) => [shape.x, shape.z])).toEqual([[dx, 0], [30 + dx, -10]]);
    expect(moved.every((shape) => plateOfShape(workspace, shape) === 2)).toBe(true);
  });

  it("puts a shape without a spot in the middle of the active plate, as the custom shapes take it", () => {
    const hook = mount();
    act(() => hook.plates!.select(1));
    const base = { origin: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 }, xAxis: { x: 1, y: 0, z: 0 }, zAxis: { x: 0, y: 0, z: 1 } };
    expect(hook.plates!.newShapeOrigin(base as never).x).toBeCloseTo(plateCenterX(workspace, 1));
  });
});
