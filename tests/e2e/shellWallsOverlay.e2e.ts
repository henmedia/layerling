// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import * as THREE from "three";
import { afterEach, describe, expect, it } from "vitest";
import { ShellWallsOverlay, shellWallsSource, syncShellWallsOverlay, type ShellWallsOverlayState } from "@/components/workplane/ShellWallsOverlay";
import type { ShellWallsPick } from "@/components/workplane/ShellWallsPlan";
import type { ThreeState } from "@/components/workplane/ViewportOverlays";
import type { ShellDividerWall, ShellScoop } from "@/lib/shellGridLimits";
import type { WorkplaneShape } from "@/types/layerling";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Hollow, the dividers and finger scoops edited on the body in the view: a grip on every wall set by hand that moves it,
 * grips at the ends of the picked wall, a cross that removes it, and on every compartment its size with buttons that
 * split it and a hand for its finger scoop. The view here looks straight down on a body of 126 x 90 mm hollowed with a
 * wall of 2.4 mm (inside 121.2 x 85.2) at 2 pixels a millimetre, the middle of the body at 200, 200, so a place in the
 * room is at 78.8 + 2 x, 114.8 + 2 z on the screen.
 */
let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  container = null;
  root = null;
});

const shape = { id: "box", name: "Box", kind: "box", color: "#3b82f6", x: 0, z: 0, elevation: 0, size: 126, width: 126, depth: 90, height: 48, rotationX: 0, rotationY: 0, rotationZ: 0 } as unknown as WorkplaneShape;

type Dividers = { x?: number; z?: number; manual?: boolean; walls?: ShellDividerWall[]; scoops?: ShellScoop[] };
const sourceOf = (dividers: Dividers, turn = 0) => shellWallsSource(121.2, 85.2, { x: dividers.x ?? 0, z: dividers.z ?? 0, thickness: 1.6, manual: dividers.manual ?? true, walls: dividers.walls ?? [], scoops: dividers.scoops ?? [] }, turn);

function viewOf(turn = 0) {
  const camera = new THREE.OrthographicCamera(-100, 100, 100, -100, 0.1, 1000);
  camera.position.set(0, 300, 0);
  camera.up.set(0, 0, -1);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const object = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(126, 48, 90));
  mesh.position.y = 24;
  mesh.rotation.y = THREE.MathUtils.degToRad(turn);
  mesh.userData.shapeSurface = true;
  object.add(mesh);
  object.updateMatrixWorld(true);
  const state = {
    camera,
    renderer: { domElement: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 400 }) } },
    shapeRecords: new Map([[shape.id, { object, shape }]]),
  } as unknown as ThreeState;
  return state;
}

function overlayOf(state: ThreeState, dividers: Dividers | null, turn = 0) {
  let overlay: ShellWallsOverlayState | null = null;
  syncShellWallsOverlay(state, shape, { current: null }, (next) => { overlay = next as ShellWallsOverlayState | null; }, dividers ? sourceOf(dividers, turn) : null);
  return overlay as ShellWallsOverlayState | null;
}

/** The overlay over the view, kept up to date with the walls it writes and the wall it picks. */
function mount(walls: ShellDividerWall[]) {
  let dividers: Dividers = { walls };
  let pick: ShellWallsPick = null;
  const active: boolean[] = [];
  const noteActive = (value: boolean) => active.push(value);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  const threeRef = { current: viewOf() };
  const render = () => root!.render(createElement(ShellWallsOverlay, {
    overlay: overlayOf(threeRef.current, dividers)!,
    shape,
    source: sourceOf(dividers),
    pick,
    threeRef,
    onPick: (next: ShellWallsPick) => {
      pick = next;
      render();
    },
    onWallsChange: (next: ShellDividerWall[]) => {
      dividers = { ...dividers, walls: next };
      render();
    },
    onScoopsChange: (scoops: ShellScoop[]) => {
      dividers = { ...dividers, scoops };
      render();
    },
    onDragActiveChange: noteActive,
  }));
  act(render);
  return { panel: container, walls: () => dividers.walls, scoops: () => dividers.scoops, pick: () => pick, active };
}

const all = <T extends HTMLElement>(panel: HTMLElement, id: string) => [...panel.querySelectorAll<T>(`[data-testid="${id}"]`)];
function pointer(element: Element, type: string, x: number, y: number) {
  act(() => {
    const event = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y, button: 0 });
    Object.defineProperty(event, "pointerId", { value: 1 });
    element.dispatchEvent(event);
  });
}
const click = (element: Element) => act(() => element.dispatchEvent(new MouseEvent("click", { bubbles: true })));
const placeOf = (element: HTMLElement) => ({ x: Number.parseFloat(element.style.left), y: Number.parseFloat(element.style.top) });

describe("Hollow, dividers and finger scoops on the body", () => {
  it("shows the compartments of the even grid without walls to move, and nothing without the tool's settings", () => {
    // With even dividers the compartments are there, for their sizes and finger scoops, and no wall has a grip.
    const overlay = overlayOf(viewOf(), { manual: false, x: 1, walls: [{ dir: "x", at: 30, from: 0, to: 60 }] })!;
    expect(overlay.manual).toBe(false);
    expect(overlay.walls).toHaveLength(0);
    expect(overlay.compartments).toHaveLength(2);
    expect(overlay.scoops).toBe(true);
    expect(overlayOf(viewOf(), null)).toBeNull();
  });

  it("lays the room round the middle of a body that stands turned, turned as the body is", () => {
    // Turned a quarter, the wall along the depth runs left to right on the screen, through the middle of the body.
    const overlay = overlayOf(viewOf(90), { walls: [{ dir: "z", at: 60.6, from: 0, to: 85.2 }] }, 90)!;
    expect(overlay.walls[0].middle.x).toBeCloseTo(200, 1);
    expect(overlay.walls[0].middle.y).toBeCloseTo(200, 1);
    expect(overlay.walls[0].from.y).toBeCloseTo(overlay.walls[0].to.y, 1);
    expect(Math.abs(overlay.walls[0].to.x - overlay.walls[0].from.x)).toBeCloseTo(170.4, 1);
  });

  it("puts each wall's grip on the wall's top and each compartment's size in the compartment", () => {
    const overlay = overlayOf(viewOf(), { walls: [{ dir: "z", at: 60, from: 0, to: 85.2 }, { dir: "x", at: 30, from: 0, to: 60 }] })!;
    expect(overlay.walls).toHaveLength(2);
    expect(overlay.walls[0].middle.x).toBeCloseTo(78.8 + 120, 1);
    expect(overlay.walls[0].middle.y).toBeCloseTo(200, 1);
    expect(overlay.walls[0].from.y).toBeCloseTo(114.8, 1);
    expect(overlay.walls[1].to.x).toBeCloseTo(78.8 + 120, 1);
    expect(overlay.walls[1].middle.y).toBeCloseTo(114.8 + 60, 1);
    expect(overlay.compartments.map((entry) => entry.text).sort()).toEqual(["59 × 29", "59 × 54", "60 × 85"]);
    expect(overlay.compartments.every((entry) => entry.room === "buttons")).toBe(true);
  });

  it("moves the wall whose grip is dragged over the box, and pulls an end of the picked wall", () => {
    const { panel, walls, pick, active } = mount([{ dir: "z", at: 60, from: 0, to: 85.2 }]);
    const grip = all(panel, "shell-walls-overlay-grip")[0];
    expect(placeOf(grip)).toEqual({ x: expect.closeTo(198.8, 1), y: expect.closeTo(200, 1) });
    pointer(grip, "pointerdown", 198.8, 200);
    pointer(grip, "pointermove", 218.9, 203);
    pointer(grip, "pointerup", 218.9, 203);
    expect(walls()).toEqual([{ dir: "z", at: 70, from: 0, to: 85.2 }]);
    expect(pick()).toEqual({ type: "wall", index: 0 });
    expect(active).toEqual([true, false]);
    // The end at the front is pulled back by 20 mm (40 pixels).
    const end = all(panel, "shell-walls-overlay-to")[0];
    pointer(end, "pointerdown", 218.8, 280);
    pointer(end, "pointermove", 218.8, 240);
    pointer(end, "pointerup", 218.8, 240);
    expect(walls()).toEqual([{ dir: "z", at: 70, from: 0, to: 65 }]);
  });

  it("splits the compartment whose button is clicked, and removes the picked wall with the cross", () => {
    const { panel, walls, pick } = mount([{ dir: "z", at: 60, from: 0, to: 85.2 }]);
    expect(all(panel, "shell-walls-overlay-remove")).toHaveLength(0);
    // The compartment on the left: its label stands left of the wall.
    const left = all(panel, "shell-walls-overlay-across").find((button) => placeOf(button.closest<HTMLElement>(".shell-walls-overlay-compartment")!).x < 198)!;
    click(left);
    expect(walls()?.[1]).toEqual({ dir: "x", at: 42.6, from: 0, to: 60 });
    expect(pick()).toEqual({ type: "wall", index: 1 });
    click(all(panel, "shell-walls-overlay-remove")[0]);
    expect(walls()).toEqual([{ dir: "z", at: 60, from: 0, to: 85.2 }]);
    expect(pick()).toBeNull();
  });

  it("switches the finger scoop of the compartment whose hand button is clicked on, through its sides, and off", () => {
    const { panel, scoops } = mount([{ dir: "z", at: 60, from: 0, to: 85.2 }]);
    const buttons = () => all(panel, "shell-walls-overlay-scoop");
    expect(buttons()).toHaveLength(2);
    const left = () => buttons().find((button) => placeOf(button.closest<HTMLElement>(".shell-walls-overlay-compartment")!).x < 198)!;
    click(left());
    expect(scoops()).toEqual([{ x: expect.any(Number), z: expect.any(Number), side: "front" }]);
    expect(scoops()![0].x).toBeLessThan(59);
    expect(left().getAttribute("aria-pressed")).toBe("true");
    expect(buttons().filter((button) => button.getAttribute("aria-pressed") === "true")).toHaveLength(1);
    // Each further click goes on to the next side, and after the last one the scoop is off again.
    for (const side of ["back", "left", "right"]) {
      click(left());
      expect(scoops()!.map((scoop) => scoop.side)).toEqual([side]);
    }
    click(left());
    expect(scoops()).toEqual([]);
  });
});
