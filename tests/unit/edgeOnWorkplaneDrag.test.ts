import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { edgeOnWorkplanePoint, horizontalPlacementWorkplane } from "@/lib/placementWorkplane";

/** An orthographic ray from the front: it starts at (x, height, far in front) and runs along the view. */
function frontRay(x: number, height: number, view: THREE.Vector3) {
  const direction = view.clone().normalize();
  return new THREE.Ray(new THREE.Vector3(x, height, 0).addScaledVector(direction, -500), direction);
}

describe("dragging on a workplane seen edge-on (#1744)", () => {
  const plate = horizontalPlacementWorkplane();

  it("follows the pointer sideways from the front, where the ray never meets the plate", () => {
    const view = new THREE.Vector3(0, 0, -1);
    const ray = frontRay(37, 12, view);
    expect(ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3())).toBeNull();
    const point = edgeOnWorkplanePoint(plate, ray, view);
    expect(point?.x).toBeCloseTo(37);
    expect(point?.y).toBeCloseTo(0);
    expect(point?.z).toBeCloseTo(0);
  });

  it("keeps the depth when the view tilts a little, where the ray meets the plate far behind", () => {
    const view = new THREE.Vector3(0, -Math.sin(THREE.MathUtils.degToRad(1)), -1);
    for (const x of [-60, 5, 80]) {
      const point = edgeOnWorkplanePoint(plate, frontRay(x, 20, view), view);
      expect(point?.x).toBeCloseTo(x);
      expect(point?.y).toBeCloseTo(0);
      expect(Math.abs(point?.z ?? Infinity)).toBeLessThan(1);
    }
  });

  it("works on a raised workplane and from the side", () => {
    const raised = horizontalPlacementWorkplane(15);
    const view = new THREE.Vector3(-1, 0, 0);
    const ray = new THREE.Ray(new THREE.Vector3(300, 40, -22), view);
    const point = edgeOnWorkplanePoint(raised, ray, view);
    expect(point?.x).toBeCloseTo(0);
    expect(point?.y).toBeCloseTo(15);
    expect(point?.z).toBeCloseTo(-22);
  });

  it("leaves a view onto the workplane to the ray itself", () => {
    expect(edgeOnWorkplanePoint(plate, frontRay(0, 0, new THREE.Vector3(0, -1, -1)), new THREE.Vector3(0, -1, -1))).toBeNull();
    expect(edgeOnWorkplanePoint(plate, new THREE.Ray(new THREE.Vector3(0, 100, 0), new THREE.Vector3(0, -1, 0)), new THREE.Vector3(0, -1, 0))).toBeNull();
  });
});
