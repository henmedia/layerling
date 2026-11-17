import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { setPickRayFromCamera } from "@/lib/cameraRay";

/** The flat view of the design in Discussion #1558: the camera stands about 100 mm from its pivot, among the parts. */
function flatCamera() {
  const camera = new THREE.OrthographicCamera(-800, 800, 450, -450, -9000, 9100);
  camera.position.set(93.93, -0.17, 168.16);
  camera.up.set(0, 1, 0);
  camera.lookAt(73.35, -70, 100);
  camera.zoom = 0.26;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  return camera;
}

describe("setPickRayFromCamera", () => {
  it("finds the plate under the lower part of a flat view whose camera stands among the parts (#1558)", () => {
    const camera = flatCamera();
    const plate = new THREE.Plane(new THREE.Vector3(0, 1, 0), -5.15);
    const lower = new THREE.Vector2(0, -0.6);
    const raycaster = new THREE.Raycaster();

    // three.js starts the ray in the camera's plane: the plate lies behind that start here.
    raycaster.setFromCamera(lower, camera);
    expect(raycaster.ray.intersectPlane(plate, new THREE.Vector3())).toBeNull();

    const hit = setPickRayFromCamera(raycaster, lower, camera).intersectPlane(plate, new THREE.Vector3());
    expect(hit).not.toBeNull();
    expect(hit!.y).toBeCloseTo(5.15, 6);
    // The point is the one drawn under the pointer: it projects back onto the same spot of the screen.
    const back = hit!.clone().project(camera);
    expect(back.x).toBeCloseTo(lower.x, 6);
    expect(back.y).toBeCloseTo(lower.y, 6);
  });

  it("starts the flat view's ray on its near plane, along the same line", () => {
    const camera = flatCamera();
    const spot = new THREE.Vector2(0.3, 0.2);
    const plain = new THREE.Raycaster();
    plain.setFromCamera(spot, camera);
    const ray = setPickRayFromCamera(new THREE.Raycaster(), spot, camera);
    expect(ray.direction.distanceTo(plain.ray.direction)).toBeLessThan(1e-12);
    expect(ray.origin.distanceTo(plain.ray.origin)).toBeCloseTo(9000, 6);
    expect(plain.ray.origin.clone().sub(ray.origin).normalize().distanceTo(ray.direction)).toBeLessThan(1e-9);
  });

  it("leaves a perspective camera's ray as three.js aims it", () => {
    const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 6000);
    camera.position.set(0, 200, 300);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    const spot = new THREE.Vector2(-0.4, -0.5);
    const plain = new THREE.Raycaster();
    plain.setFromCamera(spot, camera);
    const ray = setPickRayFromCamera(new THREE.Raycaster(), spot, camera);
    expect(ray.origin.distanceTo(plain.ray.origin)).toBe(0);
    expect(ray.direction.distanceTo(plain.ray.direction)).toBe(0);
  });
});
