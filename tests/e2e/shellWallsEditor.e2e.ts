// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { ShellScoopsEditor, ShellWallsEditor, shellGridWalls } from "@/components/workplane/ShellWallsEditor";
import { normalizeShellDividers, type ShellDividerWall, type ShellScoop } from "@/lib/shellGridLimits";
import { DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Hollow, dividers set by hand: the even dividers taken over as walls, the editor that puts a wall into the compartment
 * that was picked and takes walls away, and what the settings keep of walls set by hand.
 */
let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  container = null;
  root = null;
});

/** The editor for an inside of 96 x 76 mm, kept up to date with the walls it writes. */
function mount(start: ShellDividerWall[]) {
  let walls = start;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  const render = () => root!.render(createElement(ShellWallsEditor, {
    width: 96,
    depth: 76,
    walls,
    thickness: 1.2,
    workspace: DEFAULT_WORKPLANE_WORKSPACE,
    onChange: (next: ShellDividerWall[]) => {
      walls = next;
      render();
    },
  }));
  act(render);
  return { panel: container, walls: () => walls };
}

const all = <T extends Element>(panel: HTMLElement, id: string) => [...panel.querySelectorAll<T>(`[data-testid="${id}"]`)];
const click = (element: Element) => act(() => element.dispatchEvent(new MouseEvent("click", { bubbles: true })));
function pointer(element: Element, type: string, x = 0, z = 0) {
  act(() => {
    const event = new MouseEvent(type, { bubbles: true, clientX: x, clientY: z, button: 0 });
    Object.defineProperty(event, "pointerId", { value: 1 });
    element.dispatchEvent(event);
  });
}

describe("hollow, dividers set by hand", () => {
  it("takes the even dividers over as walls from wall to wall", () => {
    expect(shellGridWalls(1, 2, 96, 76)).toEqual([{ dir: "z", at: 48, from: 0, to: 76 }, { dir: "x", at: 25.33, from: 0, to: 96 }, { dir: "x", at: 50.67, from: 0, to: 96 }]);
  });

  it("draws the inside with its walls and compartments, splits the compartment that was picked, and takes walls away", () => {
    const { panel, walls } = mount(shellGridWalls(1, 0, 96, 76));
    expect(all(panel, "shell-walls-wall")).toHaveLength(1);
    expect(all(panel, "shell-walls-compartment")).toHaveLength(2);
    const left = all<SVGElement>(panel, "shell-walls-compartment").find((entry) => entry.getAttribute("points")!.startsWith("0,"))!;
    pointer(left, "pointerdown");
    click(all(panel, "shell-walls-add-across")[0]);
    // From the left wall to the middle of the wall it ends on.
    expect(walls()[1]).toEqual({ dir: "x", at: 38, from: 0, to: 48 });
    expect(all(panel, "shell-walls-compartment")).toHaveLength(3);
    click(all(panel, "shell-walls-remove")[0]);
    expect(walls()).toHaveLength(1);
    click(all(panel, "shell-walls-mirror-x")[0]);
    // The wall on the middle line is its own mirror image.
    expect(walls()).toHaveLength(1);
    click(all(panel, "shell-walls-clear")[0]);
    expect(walls()).toEqual([]);
  });

  it("keeps the walls set by hand in the settings, and is nothing without a wall", () => {
    const walls = [{ dir: "x" as const, at: 20, from: 30, to: 5, slant: 4 }, { dir: "y", at: 1, from: 0, to: 2 }];
    expect(normalizeShellDividers({ x: 2, z: 1, manual: true, walls, angle: 30 })).toEqual({ x: 2, z: 1, manual: true, walls: [{ dir: "x", at: 24, from: 5, to: 30, slant: -4 }], angle: 30 });
    expect(normalizeShellDividers({ x: 2, z: 1, manual: true, walls: [] })).toBeNull();
    // Walls kept beside an even grid are stored for the way back to "by hand", and the grid's counts decide.
    expect(normalizeShellDividers({ x: 1, z: 0, walls })).toEqual({ x: 1, z: 0, walls: [{ dir: "x", at: 24, from: 5, to: 30, slant: -4 }] });
    expect(normalizeShellDividers({ x: 0, z: 0, walls })).toBeNull();
  });

  it("gives the compartment that is picked a finger scoop at a side, every compartment one, and takes them away", () => {
    let scoops: ShellScoop[] = [];
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    const render = () => root!.render(createElement(ShellScoopsEditor, {
      width: 96,
      depth: 76,
      across: 1,
      along: 0,
      walls: null,
      scoops,
      thickness: 1.2,
      onChange: (next: ShellScoop[]) => {
        scoops = next;
        render();
      },
    }));
    act(render);
    const panel = container;
    expect(all(panel, "shell-walls-compartment")).toHaveLength(2);
    // Nothing is picked yet: no side to choose.
    expect(all(panel, "shell-scoop-front")).toHaveLength(0);
    const left = all<SVGElement>(panel, "shell-walls-compartment").find((entry) => entry.getAttribute("points")!.startsWith("0,"))!;
    pointer(left, "pointerdown");
    click(all(panel, "shell-scoop-left")[0]);
    expect(scoops).toEqual([{ x: expect.any(Number), z: expect.any(Number), side: "left" }]);
    expect(scoops[0].x).toBeLessThan(47);
    expect(all(panel, "shell-scoop-left")[0].getAttribute("aria-pressed")).toBe("true");
    expect(all(panel, "shell-walls-plan-scoop")).toHaveLength(1);
    // Every compartment: the one that has a scoop keeps its side, the other gets one at the front.
    click(all(panel, "shell-scoops-all")[0]);
    expect(scoops.map((scoop) => scoop.side).sort()).toEqual(["front", "left"]);
    click(all(panel, "shell-scoop-none")[0]);
    expect(scoops.map((scoop) => scoop.side)).toEqual(["front"]);
    click(all(panel, "shell-scoops-none")[0]);
    expect(scoops).toEqual([]);
    expect(normalizeShellDividers({ x: 0, z: 0, scoops: [{ x: 10, z: 10, side: "back" }], scoopRadius: 8 })).toEqual({ x: 0, z: 0, scoops: [{ x: 10, z: 10, side: "back" }], scoopRadius: 8 });
  });

  it("keeps shaped pockets in the settings, with the filling's height, also in a box without dividers", () => {
    const square = [{ x: 10, z: 10 }, { x: 40, z: 10 }, { x: 40, z: 30 }, { x: 10, z: 30 }];
    expect(normalizeShellDividers({ x: 0, z: 0, pockets: [{ points: square, depth: 8 }, { points: [{ x: 1, z: 1 }], depth: 3 }, { points: square }], pocketFill: 20 }))
      .toEqual({ x: 0, z: 0, pockets: [{ points: square, depth: 8 }, { points: square, depth: 10000 }], pocketFill: 20 });
    // Without a pocket the filling's height means nothing and is dropped.
    expect(normalizeShellDividers({ x: 1, z: 0, pocketFill: 20 })).toEqual({ x: 1, z: 0 });
    expect(normalizeShellDividers({ x: 0, z: 0, pockets: [] })).toBeNull();
  });
});
