import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { projectSegmentToScreen, syncCornerRulerToolOverlay } from "@/components/workplane/ViewportOverlays";
import type { CornerRulerInstance, CornerRulerOverlayState, ThreeState } from "@/components/workplane/ViewportOverlays";
import { cornerRulerTicks } from "@/lib/rulerDimensions";

function stateFor(camera: THREE.Camera) {
  return {
    camera,
    renderer: { domElement: { getBoundingClientRect: () => ({ width: 800, height: 600 }) } },
  } as unknown as ThreeState;
}

describe("projectSegmentToScreen", () => {
  // The camera hovers above the start of a ruler arm that runs along x, looking at the arm's far end:
  // the first part of the arm lies behind it (the fan of lines in the forum, 14.10.2026).
  const camera = new THREE.PerspectiveCamera(45, 800 / 600, 0.1, 1000);
  camera.position.set(0, 20, 0);
  camera.lookAt(100, 0, 0);
  const state = stateFor(camera);

  it("cuts a segment off where it passes behind the camera", () => {
    const line = projectSegmentToScreen(new THREE.Vector3(-100, 0, 0), new THREE.Vector3(100, 0, 0), state);
    expect(line).not.toBeNull();
    for (const value of [line!.x1, line!.y1, line!.x2, line!.y2]) expect(Number.isFinite(value)).toBe(true);
    // The end that lies behind the camera is not drawn where it would project (mirrored) but where the arm meets the camera plane.
    const mirrored = new THREE.Vector3(-100, 0, 0).project(camera);
    const mirroredY = ((1 - mirrored.y) / 2) * 600;
    expect(Math.abs(line!.y1 - mirroredY)).toBeGreaterThan(1);
    // The arm runs away from the camera, down towards the horizon: the cut end is lower on the screen than the far end.
    expect(line!.y1).toBeGreaterThan(line!.y2);
  });

  it("drops a segment that is wholly behind the camera", () => {
    expect(projectSegmentToScreen(new THREE.Vector3(-50, 0, 0), new THREE.Vector3(-10, 0, 0), state)).toBeNull();
  });

  it("keeps a segment that is wholly in front as it is", () => {
    const line = projectSegmentToScreen(new THREE.Vector3(20, 0, 0), new THREE.Vector3(60, 0, 0), state)!;
    const a = new THREE.Vector3(20, 0, 0).project(camera);
    expect(line.x1).toBeCloseTo(((a.x + 1) / 2) * 800, 6);
    expect(line.y1).toBeCloseTo(((1 - a.y) / 2) * 600, 6);
  });

  it("does not cut anything for a flat (orthographic) camera", () => {
    const ortho = new THREE.OrthographicCamera(-50, 50, 50, -50, 0.1, 1000);
    ortho.position.set(0, 20, 0);
    ortho.lookAt(100, 0, 0);
    expect(projectSegmentToScreen(new THREE.Vector3(-100, 0, 0), new THREE.Vector3(100, 0, 0), stateFor(ortho))).not.toBeNull();
  });
});

describe("the corner ruler with the camera hovering above it", () => {
  it("keeps no label that was mirrored from behind the camera, and draws its lines in the room", () => {
    const camera = new THREE.PerspectiveCamera(45, 800 / 600, 0.1, 1000);
    camera.position.set(0, 15, 40);
    camera.lookAt(0, 0, -100);
    const ruler: CornerRulerInstance = {
      id: "corner-ruler-1",
      corner: { x: 0, y: 0, z: 0 },
      workplane: { kind: "base" } as unknown as CornerRulerInstance["workplane"],
      frame: { xAxis: { x: 1, y: 0, z: 0 }, zAxis: { x: 0, y: 0, z: 1 }, normal: { x: 0, y: 1, z: 0 } },
      armLengthX: 100,
      armLengthZ: 80,
    };
    const layer = new THREE.Group();
    const state = { ...stateFor(camera), cornerRulerLayer: layer, shapeLayer: new THREE.Group(), raycaster: new THREE.Raycaster() } as unknown as ThreeState;
    let overlay: CornerRulerOverlayState | null = null;
    syncCornerRulerToolOverlay(state, [ruler], [], [], { current: null }, (next) => {
      overlay = typeof next === "function" ? next(overlay) : next;
    }, "0.01" as never);
    const item = overlay!.items[0];
    const allLabels = [100, 80].reduce((sum, length) => sum + cornerRulerTicks(length).filter((tick) => tick.label).length, 0);
    expect(item.labels.length).toBeGreaterThan(0);
    // The part of the z arm behind the camera (z > 40) has no numbers.
    expect(item.labels.length).toBeLessThan(allLabels);
    for (const label of item.labels) {
      for (const value of [label.x, label.y]) expect(Math.abs(value)).toBeLessThan(100000);
    }
    // The ticks and the arms are lines in the room, which the graphics card cuts at the camera: no mirrored fan.
    expect(layer.children.length).toBe(2);
    // A ruler that hides behind bodies tests the depth; one that stays in view does not.
    expect(item.occlude).toBe(true);
    const material = (layer.children[0] as THREE.Mesh).material as THREE.Material;
    expect(material.depthTest).toBe(true);
    syncCornerRulerToolOverlay(state, [{ ...ruler, occlude: false }], [], [], { current: null }, (next) => {
      overlay = typeof next === "function" ? next(overlay) : next;
    }, "0.01" as never);
    expect(overlay!.items[0].occlude).toBe(false);
    expect(((layer.children[0] as THREE.Mesh).material as THREE.Material).depthTest).toBe(false);
  });
});
