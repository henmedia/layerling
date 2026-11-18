import * as THREE from "three";
import { RENDER_LAYER_HELPERS, setObjectRenderLayer, type ThreeState } from "@/components/workplane/ViewportOverlays";
import { pointerRayFor } from "@/components/workplane/viewportPicking";
import type { ClearanceVec3 } from "@/lib/clearanceCheck";

/*
 * What the mold tool shows while its panel is open (its undercuts are painted red by the print check's paint, see
 * ThinWallOverlay): the parting face as a see-through coloured plane round the master, the sprue as an orange post on the
 * master's highest point, each vent as a blue post, and every high point left without one as a red ball.
 */

export type MoldPreview = {
  partingCorners: ClearanceVec3[];
  highPoints: Array<{ point: ClearanceVec3; vented: boolean; sprue: boolean }>;
  /** The scene's direction the mold opens in (the sprue and vents run along it). */
  up: ClearanceVec3;
  /** With a free direction: the drag handle, an arrow from the master's middle along `up` with a knob at its tip. */
  handle?: { centre: ClearanceVec3; reach: number } | null;
};

/** How far from the master's middle the handle's knob stands, as a share of half its diagonal. */
const HANDLE_REACH = 1.6;

const groups = new WeakMap<ThreeState, THREE.Group>();

function post(point: ClearanceVec3, up: THREE.Vector3, length: number, radius: number, color: string) {
  const geometry = new THREE.CylinderGeometry(radius, radius, length, 16);
  geometry.translate(0, length / 2, 0);
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color, depthTest: false, transparent: true, opacity: 0.9 }));
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
  mesh.position.set(...point);
  mesh.renderOrder = 1010;
  return mesh;
}

/** Draws the preview, replacing what was drawn before; null takes it away. */
export function syncMoldPreviewOverlay(state: ThreeState, preview: MoldPreview | null) {
  const previous = groups.get(state);
  if (previous) {
    state.scene.remove(previous);
    previous.traverse((child) => {
      const mesh = child as THREE.Mesh;
      mesh.geometry?.dispose();
      (mesh.material as THREE.Material | undefined)?.dispose?.();
    });
    groups.delete(state);
  }
  if (preview && preview.partingCorners.length === 4) {
    const group = new THREE.Group();
    group.name = "MoldPreview";
    const [a, b, c, d] = preview.partingCorners;
    const plane = new THREE.BufferGeometry();
    plane.setAttribute("position", new THREE.Float32BufferAttribute([...a, ...b, ...c, ...a, ...c, ...d], 3));
    const face = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({ color: "#2e9fd6", transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }));
    face.renderOrder = 1001;
    group.add(face);
    const rim = new THREE.LineLoop(new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute([...a, ...b, ...c, ...d], 3)), new THREE.LineBasicMaterial({ color: "#1a6fa0" }));
    group.add(rim);
    const up = new THREE.Vector3(...preview.up).normalize();
    const size = Math.max(a.map((value, index) => Math.abs(value - c[index])).reduce((x, y) => Math.max(x, y), 0), 10);
    for (const point of preview.highPoints) {
      if (point.sprue) group.add(post(point.point, up, size * 0.35, Math.max(0.8, size * 0.02), "#e8851a"));
      else if (point.vented) group.add(post(point.point, up, size * 0.3, Math.max(0.5, size * 0.01), "#2f6fd6"));
      else {
        const ball = new THREE.Mesh(new THREE.SphereGeometry(Math.max(0.8, size * 0.025), 16, 12), new THREE.MeshBasicMaterial({ color: "#e5484d", depthTest: false }));
        ball.position.set(...point.point);
        ball.renderOrder = 1011;
        group.add(ball);
      }
    }
    if (preview.handle) {
      // The arrow both ways (a mold opens both ways), the knob on the upper end, drawn over everything.
      const { centre, reach } = preview.handle;
      const length = Math.max(reach, 5) * HANDLE_REACH;
      const knob = Math.max(1.6, length * 0.06);
      const middle = new THREE.Vector3(...centre);
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(knob * 0.18, knob * 0.18, 2 * length, 12), new THREE.MeshBasicMaterial({ color: "#7c4ddb", depthTest: false, transparent: true, opacity: 0.75 }));
      shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
      shaft.position.copy(middle);
      shaft.renderOrder = 1012;
      group.add(shaft);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(knob, 24, 16), new THREE.MeshBasicMaterial({ color: "#7c4ddb", depthTest: false }));
      ball.position.copy(middle).addScaledVector(up, length);
      ball.renderOrder = 1013;
      ball.userData.moldHandle = true;
      group.add(ball);
      // A ring round the knob's path, so it is plain that the knob goes round on a sphere.
      const ring = new THREE.Mesh(new THREE.TorusGeometry(length, knob * 0.08, 6, 96), new THREE.MeshBasicMaterial({ color: "#7c4ddb", depthTest: false, transparent: true, opacity: 0.35 }));
      ring.position.copy(middle);
      ring.rotation.x = Math.PI / 2;
      ring.renderOrder = 1011;
      group.add(ring);
    }
    group.traverse((child) => setObjectRenderLayer(child, RENDER_LAYER_HELPERS));
    state.scene.add(group);
    groups.set(state, group);
  }
  state.needsRender = true;
}

/** Whether the pointer is over the free direction's knob. */
export function pickMoldHandle(state: ThreeState, clientX: number, clientY: number) {
  const group = groups.get(state);
  if (!group) return false;
  pointerRayFor(state, clientX, clientY);
  state.raycaster.layers.set(RENDER_LAYER_HELPERS);
  return state.raycaster.intersectObjects(group.children, false).some((hit) => hit.object.userData.moldHandle === true);
}

/**
 * Where the dragged knob points: the pointer ray met with the sphere the knob goes round (the nearer side), or where the
 * ray passes closest to the middle when it misses the sphere. A unit vector from the middle, or null.
 */
export function moldHandleDirection(state: ThreeState, clientX: number, clientY: number, handle: { centre: ClearanceVec3; reach: number }) {
  pointerRayFor(state, clientX, clientY);
  const ray = state.raycaster.ray;
  const middle = new THREE.Vector3(...handle.centre);
  const sphere = new THREE.Sphere(middle, Math.max(handle.reach, 5) * HANDLE_REACH);
  const point = ray.intersectSphere(sphere, new THREE.Vector3()) ?? ray.closestPointToPoint(middle, new THREE.Vector3());
  const direction = point.sub(middle);
  return direction.lengthSq() > 1e-9 ? direction.normalize() : null;
}
