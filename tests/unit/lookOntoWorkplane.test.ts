import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { setCameraOntoPlane, stepCameraTurn, type CameraRig } from "@/components/workplane/cameraRig";
import { VIEW_CUBE_TURN_MS } from "@/lib/viewCubeTransition";

function rig(position: THREE.Vector3, target: THREE.Vector3): CameraRig {
  const camera = new THREE.PerspectiveCamera();
  camera.position.copy(position);
  const controls = { target: target.clone(), update: () => false } as unknown as CameraRig["controls"];
  return { renderer: {} as CameraRig["renderer"], camera, controls, needsRender: false, focusReach: null };
}

// A workplane on the top of a box tipped forward by 35 degrees (#1128).
const origin = new THREE.Vector3(0, 33.19, 5.74);
const normal = new THREE.Vector3(0, Math.cos((35 * Math.PI) / 180), Math.sin((35 * Math.PI) / 180));

function lookDirection(view: CameraRig) {
  return view.camera.position.clone().sub(view.controls.target).normalize();
}

describe("look straight onto the workplane (#1128)", () => {
  it("jumps square onto a sloped workplane, its origin in the middle, the distance kept", () => {
    const view = rig(new THREE.Vector3(118, 96, 118), new THREE.Vector3(0, 0, 0));
    const distance = view.camera.position.length();
    setCameraOntoPlane(view, origin, normal, false);
    expect(view.controls.target.toArray()).toEqual(origin.toArray());
    expect(lookDirection(view).angleTo(normal)).toBeLessThan(1e-9);
    expect(view.camera.position.distanceTo(origin)).toBeCloseTo(distance, 9);
    expect(view.cameraTurn).toBeNull();
    expect(view.focusReach?.containsPoint(origin)).toBe(true);
  });

  it("turns there and slides the pivot along in one move", () => {
    const view = rig(new THREE.Vector3(118, 96, 118), new THREE.Vector3(0, 0, 0));
    setCameraOntoPlane(view, origin, normal);
    const startedAt = view.cameraTurn!.startedAt;
    expect(stepCameraTurn(view, startedAt + VIEW_CUBE_TURN_MS / 2)).toBe(true);
    // Halfway the pivot is between the two spots, not still at the start.
    expect(view.controls.target.length()).toBeGreaterThan(0);
    expect(view.controls.target.distanceTo(origin)).toBeGreaterThan(0);
    // A hair past the end: startedAt + 320 - startedAt can come out 319.99999... and leave the turn unfinished.
    expect(stepCameraTurn(view, startedAt + VIEW_CUBE_TURN_MS + 0.001)).toBe(true);
    expect(view.controls.target.distanceTo(origin)).toBeLessThan(1e-9);
    expect(lookDirection(view).angleTo(normal)).toBeLessThan(1e-6);
    expect(view.cameraTurn).toBeNull();
  });

  it("looks down on the base plate from above", () => {
    const view = rig(new THREE.Vector3(118, 96, 118), new THREE.Vector3(20, 0, -10));
    setCameraOntoPlane(view, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0), false);
    expect(view.controls.target.toArray()).toEqual([0, 0, 0]);
    expect(lookDirection(view).angleTo(new THREE.Vector3(0, 1, 0))).toBeLessThan(1e-9);
  });
});
