import * as THREE from "three";
import { RENDER_LAYER_HELPERS, setObjectRenderLayer, type ThreeState } from "@/components/workplane/ViewportOverlays";
import { RENDER_LAYER_SHAPES, aimPickRay, firstShapeHit, pointerRayFor } from "@/components/workplane/viewportPicking";
import type { ClearanceVec3 } from "@/lib/clearanceCheck";

/*
 * What the mold tool shows while its panel is open (its undercuts are painted red by the print check's paint, see
 * ThinWallOverlay): the parting face as a see-through coloured plane round the master, the sprue as an orange post on the
 * master's highest point, each vent as a blue post, and every high point left without one as a red ball. With the openings
 * set by the user (Discussion #1806) the posts are those openings, and a click sets one on the master or takes one away.
 */

export type MoldPreview = {
  partingCorners: ClearanceVec3[];
  highPoints: Array<{ point: ClearanceVec3; vented: boolean; sprue: boolean; opening?: number }>;
  /** The scene's direction the mold opens in (the sprue and vents run along it). */
  up: ClearanceVec3;
  /** With a free direction: the drag handle, an arrow from the master's middle along `up` with a knob at its tip. */
  handle?: { centre: ClearanceVec3; reach: number } | null;
  /**
   * With the openings set by the user: clicks in the view set and remove them. `ids` are the master's bodies, the only
   * ones a click sets an opening on (a body standing in front of the master is looked through).
   */
  openingPick?: { ids: string[] } | null;
};

/** What a click meant while the user sets the openings: the post of the opening to take away, or the point on the master for a new one. */
export type MoldOpeningPick = { remove: number } | { point: ClearanceVec3 };

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
      const marker = point.sprue ? post(point.point, up, size * 0.35, Math.max(0.8, size * 0.02), "#e8851a")
        : point.vented ? post(point.point, up, size * 0.3, Math.max(0.5, size * 0.01), "#2f6fd6") : null;
      if (marker) {
        // An opening the user set knows its place in the list, for the click that takes it away.
        // A thin post is hard to hit, so a wider one that is not drawn stands round it for the click.
        if (point.opening !== undefined) {
          const target = post(point.point, up, size * 0.35, Math.max(2, size * 0.04), "#000000");
          target.visible = false;
          target.userData.moldOpening = point.opening;
          marker.userData.moldOpening = point.opening;
          group.add(target);
        }
        group.add(marker);
      } else {
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

/**
 * What a press means while the user sets the openings: on the post of an opening, that opening is to go; on the master
 * (one of `ids`, whatever stands in front of it), a new opening is to come at that point. Null beside both, so the press
 * does what it always does.
 */
export function pickMoldOpening(state: ThreeState, clientX: number, clientY: number, ids: readonly string[], shapeIds: readonly string[]): MoldOpeningPick | null {
  const group = groups.get(state);
  if (group) {
    pointerRayFor(state, clientX, clientY);
    state.raycaster.layers.set(RENDER_LAYER_HELPERS);
    const post = state.raycaster.intersectObjects(group.children, false).find((hit) => typeof hit.object.userData.moldOpening === "number");
    if (post) return { remove: post.object.userData.moldOpening as number };
  }
  aimPickRay(state, clientX, clientY, RENDER_LAYER_SHAPES);
  const hit = firstShapeHit(state, { needsFace: true, skip: new Set(shapeIds.filter((id) => !ids.includes(id))) });
  return hit ? { point: [hit.point.x, hit.point.y, hit.point.z] } : null;
}
