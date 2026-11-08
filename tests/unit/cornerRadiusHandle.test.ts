import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { syncTransformOverlay } from "@/components/workplane/viewportTransformOverlays";
import { CORNER_DOT_MIN_SCREEN_DISTANCE, handleClearOfOthers } from "@/components/workplane/transformOverlayTypes";
import { cornerRadiusDragPatch } from "@/lib/roundedBoxGeometry";
import type { ThreeState } from "@/components/workplane/ViewportOverlays";
import type { TransformOverlayState } from "@/components/workplane/TransformOverlay";
import type { WorkplaneShape } from "@/types/layerling";

function shape(extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return { id: "s1", name: "Box", kind: "box", color: "#ff8800", x: 0, z: 0, elevation: 0, size: 40, width: 40, depth: 30, height: 20, rotation: 0, rotationX: 0, rotationZ: 0, ...extra } as WorkplaneShape;
}

const VIEW = { width: 800, height: 600 };

/** The handles the overlay draws for one shape, seen from `position` (a straight look down needs its own up). */
function handlesFor(source: WorkplaneShape, position: [number, number, number], up: [number, number, number] = [0, 1, 0]) {
  const camera = new THREE.PerspectiveCamera(40, VIEW.width / VIEW.height, 0.1, 5000);
  camera.up.set(...up);
  camera.position.set(...position);
  camera.lookAt(0, source.height / 2, 0);
  camera.updateMatrixWorld();
  const state = {
    camera,
    renderer: { domElement: { getBoundingClientRect: () => ({ left: 0, top: 0, right: VIEW.width, bottom: VIEW.height, width: VIEW.width, height: VIEW.height }), closest: () => null } },
    scene: new THREE.Scene(),
    transformGuideLayer: new THREE.Group(),
  } as unknown as ThreeState;
  let overlay: TransformOverlayState | null = null;
  const ref = { current: null as TransformOverlayState | null };
  syncTransformOverlay(state, [source], [source.id], ref, (next) => { overlay = (typeof next === "function" ? next(overlay) : next) as TransformOverlayState | null; }, "normal" as never);
  return overlay ? (overlay as TransformOverlayState).handles : [];
}

const VIEWS: Array<[string, [number, number, number], [number, number, number]?]> = [
  ["from above", [0, 260, 0], [0, 0, -1]],
  ["from the front and above", [0, 150, 190]],
  ["from a corner and above", [150, 120, 150]],
  ["from the front, low", [0, 20, 220]],
  ["from the back, above", [60, 140, -190]],
  ["from below", [40, -180, 120]],
];

describe("the corner radius dot (Discussion #1470)", () => {
  it("turns a plain Box into a Rounded box with flat top and bottom on the first pull, keeping its size", () => {
    const start = shape();
    // pulling the dot away from the corner (negative) grows the radius from 0
    expect(cornerRadiusDragPatch(start, -4)).toEqual({ kind: "roundedBox", cornerFillet: 4, topBottomFillet: 0 });
    // no pull yet: still no rounding, still ready to be the Rounded box
    expect(cornerRadiusDragPatch(start, 0)).toEqual({ kind: "roundedBox", cornerFillet: 0, topBottomFillet: 0 });
    expect(cornerRadiusDragPatch(start, 3).cornerFillet).toBe(0);
  });

  it("only changes the radius of a Rounded box, from where it stands, and never past half the shorter side", () => {
    const rounded = shape({ kind: "roundedBox", cornerFillet: 6, topBottomFillet: 2 });
    expect(cornerRadiusDragPatch(rounded, -3)).toEqual({ cornerFillet: 9 });
    expect(cornerRadiusDragPatch(rounded, 2)).toEqual({ cornerFillet: 4 });
    expect(cornerRadiusDragPatch(rounded, 99)).toEqual({ cornerFillet: 0 });
    expect(cornerRadiusDragPatch(rounded, -99)).toEqual({ cornerFillet: 15 });
    // a Rounded box that never had its radius set starts from the default one
    expect(cornerRadiusDragPatch(shape({ kind: "roundedBox" }), -1)).toEqual({ cornerFillet: 6 });
  });

  it("rounds a pulled Box the same way the Corner fillet field does: the patch is only the radius and the kind", () => {
    const patch = cornerRadiusDragPatch(shape(), -7.126);
    expect(Object.keys(patch).sort()).toEqual(["cornerFillet", "kind", "topBottomFillet"]);
    expect(patch.cornerFillet).toBe(7.13);
  });

  it.each(VIEWS)("shows one dot on a plain Box %s, clear of every resize handle", (_name, position, up) => {
    const handles = handlesFor(shape(), position, up);
    const dots = handles.filter((handle) => handle.key === "corner-radius");
    expect(dots).toHaveLength(1);
    const others = handles.filter((handle) => handle.key !== "corner-radius");
    expect(others.some((handle) => handle.kind === "scale")).toBe(true);
    for (const other of others) {
      expect(Math.hypot(other.x - dots[0].x, other.y - dots[0].y), `too near ${other.key}`).toBeGreaterThanOrEqual(CORNER_DOT_MIN_SCREEN_DISTANCE - 1e-6);
    }
  });

  it.each(VIEWS)("shows one dot on a Rounded box %s, clear of every resize handle", (_name, position, up) => {
    const handles = handlesFor(shape({ kind: "roundedBox", cornerFillet: 5, topBottomFillet: 0 }), position, up);
    const dots = handles.filter((handle) => handle.key === "corner-radius");
    expect(dots).toHaveLength(1);
    for (const other of handles.filter((handle) => handle.key !== "corner-radius")) {
      expect(Math.hypot(other.x - dots[0].x, other.y - dots[0].y), `too near ${other.key}`).toBeGreaterThanOrEqual(CORNER_DOT_MIN_SCREEN_DISTANCE - 1e-6);
    }
  });

  it("moves the dot along the edge when the radius grows, in the same view", () => {
    const at = (radius: number) => handlesFor(shape({ kind: "roundedBox", cornerFillet: radius, topBottomFillet: 0 }), [0, 150, 190]).find((handle) => handle.key === "corner-radius")!;
    const small = at(2);
    const large = at(12);
    expect(large.x).toBeLessThan(small.x);
  });

  it("leaves the other handles where they were", () => {
    const withDot = handlesFor(shape(), [0, 150, 190]).filter((handle) => handle.key !== "corner-radius");
    expect(withDot.map((handle) => handle.key)).toContain("near-left");
    expect(withDot.find((handle) => handle.key === "near-left")).toMatchObject({ kind: "scale" });
  });

  it("is not there for bodies that are not a box, a Box with its own rounding, or a picture plate", () => {
    for (const other of [shape({ kind: "cylinder" }), shape({ radius: 3 }), shape({ imagePlate: true } as Partial<WorkplaneShape>)]) {
      expect(handlesFor(other, [0, 150, 190]).some((handle) => handle.key === "corner-radius")).toBe(false);
    }
  });
});

describe("a handle kept clear of the others on the screen", () => {
  const edge = { x: -1, y: 0 };

  it("stays where it is when nothing is near", () => {
    const point = { x: 100, y: 100 };
    expect(handleClearOfOthers(point, edge, [{ x: 200, y: 100 }])).toBe(point);
  });

  it("slides along the edge until it is clear", () => {
    const moved = handleClearOfOthers({ x: 100, y: 100 }, edge, [{ x: 100, y: 100 }]);
    expect(moved.y).toBe(100);
    expect(moved.x).toBeLessThan(100);
    expect(100 - moved.x).toBeGreaterThanOrEqual(CORNER_DOT_MIN_SCREEN_DISTANCE);
    expect(100 - moved.x).toBeLessThan(CORNER_DOT_MIN_SCREEN_DISTANCE + 2.01);
  });

  it("goes up when the edge is seen end on", () => {
    const moved = handleClearOfOthers({ x: 100, y: 100 }, { x: 0, y: 0 }, [{ x: 100, y: 100 }]);
    expect(moved.x).toBe(100);
    expect(moved.y).toBeLessThan(100);
  });

  it("steps past another handle that lies in its way", () => {
    const others = [{ x: 100, y: 100 }, { x: 70, y: 100 }];
    const moved = handleClearOfOthers({ x: 100, y: 100 }, edge, others);
    for (const other of others) expect(Math.hypot(other.x - moved.x, other.y - moved.y)).toBeGreaterThanOrEqual(CORNER_DOT_MIN_SCREEN_DISTANCE);
  });
});
