import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { poleDirectionKeepingTurn, viewFaceDirection } from "@/lib/viewCubeDrag";
import { DEFAULT_WORKPLANE_WORKSPACE, normalizeWorkspaceSettings } from "@/lib/workplaneSettings";

// Discussion #1967: Top and Bottom of the view cube can keep the view's turn, to the nearest quarter.

/** Where a camera at this offset looking at the origin has its screen's "down": the side of the plate at the bottom. */
function downOnScreen(direction: THREE.Vector3) {
  const camera = new THREE.PerspectiveCamera();
  camera.up.set(0, 1, 0);
  camera.position.copy(direction).multiplyScalar(100);
  camera.lookAt(0, 0, 0);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
  const down = up.negate();
  return [down.x, down.y, down.z].map((value) => Math.round(value) + 0);
}

const turned = (degrees: number, height = 100) => {
  const angle = THREE.MathUtils.degToRad(degrees);
  return new THREE.Vector3(Math.sin(angle) * 50, height, Math.cos(angle) * 50);
};

describe("Top and Bottom keeping the view's turn", () => {
  it("looks straight down with the front at the bottom when the view is turned a little", () => {
    const direction = poleDirectionKeepingTurn("top", turned(30));
    expect(direction.y).toBeCloseTo(1, 6);
    expect(downOnScreen(direction)).toEqual([0, 0, 1]);
  });

  it("keeps the side the view was turned to at the bottom", () => {
    expect(downOnScreen(poleDirectionKeepingTurn("top", turned(100)))).toEqual([1, 0, 0]);
    expect(downOnScreen(poleDirectionKeepingTurn("top", turned(-80)))).toEqual([-1, 0, 0]);
    expect(downOnScreen(poleDirectionKeepingTurn("top", turned(170)))).toEqual([0, 0, -1]);
  });

  it("looks straight up for Bottom, keeping the turn the same way", () => {
    const direction = poleDirectionKeepingTurn("bottom", turned(95, -40));
    expect(direction.y).toBeCloseTo(-1, 6);
    expect(Math.sign(direction.x)).toBe(1);
    expect(Math.abs(direction.z)).toBeLessThan(1e-9);
  });

  it("counts a camera right on the pole as not turned, like the plain Top view", () => {
    const direction = poleDirectionKeepingTurn("top", new THREE.Vector3(0, 80, 0));
    expect(direction.angleTo(viewFaceDirection("top"))).toBeLessThan(1e-3);
    expect(downOnScreen(direction)).toEqual([0, 0, 1]);
  });

  it("is off unless switched on, and is kept as a setting", () => {
    expect(DEFAULT_WORKPLANE_WORKSPACE.viewCubeKeepsTurn).toBe(false);
    expect(normalizeWorkspaceSettings({ viewCubeKeepsTurn: true }).viewCubeKeepsTurn).toBe(true);
    expect(normalizeWorkspaceSettings({}).viewCubeKeepsTurn).toBe(false);
  });
});
