import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { showFaceMarksThroughPlates } from "@/components/workplane/renderFrame";

// The plate as viewportScene.ts builds it: a see-through plane in XY, turned to lie flat, writing depth.
function scene() {
  const root = new THREE.Scene();
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.9 }));
  plate.name = "WorkplaneBase";
  plate.rotation.x = -Math.PI / 2;
  root.add(plate);
  return { root, plate: plate.material };
}

// The mark on a flat face at height y, as syncLayFlatHover lays it: world corners in a layer at the origin.
function addMark(root: THREE.Object3D, y: number, name = "LayFlatHover") {
  const layer = new THREE.Group();
  layer.name = name;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array([-5, y, -5, 5, y, -5, 5, y, 5]), 3));
  layer.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false })));
  root.add(layer);
  return layer;
}

function cameraAt(y: number) {
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(30, y, 40);
  return camera;
}

describe("face marks behind the plate (#1492)", () => {
  it("lets the mark on a part's underside show through the plate from below", () => {
    const { root, plate } = scene();
    addMark(root, 10);
    const undo = showFaceMarksThroughPlates(root, cameraAt(-60));
    expect(plate.depthWrite).toBe(false);
    undo?.();
    expect(plate.depthWrite).toBe(true);
  });

  it("does the same for the faces a texture or delete faces waits for", () => {
    const { root, plate } = scene();
    addMark(root, 10, "CadFacePick");
    showFaceMarksThroughPlates(root, cameraAt(-60));
    expect(plate.depthWrite).toBe(false);
  });

  it("leaves the plate alone when the mark is on the camera's side", () => {
    const { root, plate } = scene();
    addMark(root, 10);
    expect(showFaceMarksThroughPlates(root, cameraAt(60))).toBeNull();
    expect(plate.depthWrite).toBe(true);
  });

  it("leaves the plate alone for the floor of a part standing on it", () => {
    const { root, plate } = scene();
    addMark(root, 0);
    expect(showFaceMarksThroughPlates(root, cameraAt(-60))).toBeNull();
    expect(plate.depthWrite).toBe(true);
  });

  it("leaves the plate alone while no face is lit", () => {
    const { root, plate } = scene();
    addMark(root, 10).visible = false;
    expect(showFaceMarksThroughPlates(root, cameraAt(-60))).toBeNull();
    expect(plate.depthWrite).toBe(true);
  });

  it("opens the plate from above for a face below it", () => {
    const { root, plate } = scene();
    addMark(root, -10);
    showFaceMarksThroughPlates(root, cameraAt(60));
    expect(plate.depthWrite).toBe(false);
  });
});
