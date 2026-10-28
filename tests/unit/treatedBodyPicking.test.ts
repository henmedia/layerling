import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { enableLazyMeshPicking, TREATED_BVH_TRIANGLE_THRESHOLD } from "@/components/workplane/viewportShapeObjects";

type TreeGeometry = THREE.BufferGeometry & { boundsTree?: unknown };

function hits(mesh: THREE.Mesh) {
  const found: number[] = [];
  for (let index = 0; index < 40; index += 1) {
    const raycaster = new THREE.Raycaster(new THREE.Vector3(Math.sin(index) * 12, Math.cos(index * 1.3) * 12, 100), new THREE.Vector3(0, 0, -1));
    const first = raycaster.intersectObject(mesh)[0];
    found.push(first ? Math.round(first.distance * 1e6) / 1e6 : -1);
  }
  return found;
}

describe("picking a body with edge treatments", () => {
  it("builds the tree of a large mesh at the first ray and hits the same points", () => {
    const geometry: TreeGeometry = new THREE.SphereGeometry(20, 160, 80).toNonIndexed();
    expect(geometry.getAttribute("position").count / 3).toBeGreaterThanOrEqual(TREATED_BVH_TRIANGLE_THRESHOLD);
    const material = new THREE.MeshBasicMaterial();
    const expected = hits(new THREE.Mesh(geometry, material));
    const mesh = new THREE.Mesh(geometry, material);
    enableLazyMeshPicking(mesh, geometry);
    expect(geometry.boundsTree).toBeUndefined();
    expect(hits(mesh)).toEqual(expected);
    expect(geometry.boundsTree).toBeDefined();
  });

  it("leaves a small mesh to the plain ray test", () => {
    const geometry: TreeGeometry = new THREE.SphereGeometry(20, 32, 16).toNonIndexed();
    const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
    const plain = mesh.raycast;
    enableLazyMeshPicking(mesh, geometry);
    expect(mesh.raycast).toBe(plain);
    hits(mesh);
    expect(geometry.boundsTree).toBeUndefined();
  });
});
