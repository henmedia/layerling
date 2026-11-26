import * as THREE from "three";
import { RENDER_LAYER_HELPERS, disposeObject, releaseSharedShapeMaterials, setObjectRenderLayer, type ThreeState } from "@/components/workplane/ViewportOverlays";
import { createShapeObject } from "@/components/workplane/viewportShapeObjects";
import type { LidPreviewPart } from "@/lib/lidTool";

/*
 * What the lid tool shows while its panel is open (Discussion #2130): the lid it would make with the settings as they
 * are, where Make lid puts it (beside the body, turned over as it prints), with the parts that print loose beside it
 * (clips, a hinge's pin and plugs, a tether), and the parts that would go onto the body (a hinge's knuckles, the latches'
 * cheeks, a thread, a bayonet's lugs, the magnets' posts) in place on it. Flat and quiet: one grey, a little see-through,
 * no shine, with thin edges where faces meet at an angle, so it reads as a sketch of what comes and not as a body of the
 * design. It takes no clicks and casts no shadow; picking and snapping look straight through it.
 */

export type { LidPreviewPart };

const FILL = { lid: 0.55, loose: 0.55, body: 0.4 } as const;
/** Faces meeting at more than this show an edge line. */
const EDGE_ANGLE = 30;

const groups = new WeakMap<ThreeState, THREE.Group>();

function colours(dark: boolean) {
  return dark ? { fill: "#aab4be", edge: "#e6ebef" } : { fill: "#8f9aa5", edge: "#3e4852" };
}

function flatten(object: THREE.Object3D, opacity: number, dark: boolean) {
  const { fill, edge } = colours(dark);
  const meshes: THREE.Mesh[] = [];
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) meshes.push(child);
    else if (child instanceof THREE.LineSegments) child.visible = false;
  });
  for (const mesh of meshes) {
    mesh.raycast = () => {};
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    releaseSharedShapeMaterials(mesh);
    mesh.userData.sharedShapeMaterialKeys = [];
    // Pushed back a hair: where a part lies in a face of the body (a magnet's post in its corner, flush with the wall) the
    // body is drawn, not the two flickering through each other.
    mesh.material = new THREE.MeshLambertMaterial({ color: fill, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, flatShading: true, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2 });
    mesh.renderOrder = 900;
    const lines = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, EDGE_ANGLE), new THREE.LineBasicMaterial({ color: edge, transparent: true, opacity: 0.55, depthWrite: false }));
    lines.raycast = () => {};
    lines.renderOrder = 901;
    mesh.add(lines);
  }
}

/** Draws the preview, replacing what was drawn before; null or no parts takes it away. */
export function syncLidPreviewOverlay(state: ThreeState, parts: readonly LidPreviewPart[] | null, dark = false) {
  const previous = groups.get(state);
  if (previous) {
    state.scene.remove(previous);
    disposeObject(previous);
    groups.delete(state);
  }
  if (parts?.length) {
    const group = new THREE.Group();
    group.name = "LidPreview";
    for (const part of parts) {
      const object = createShapeObject({ ...part.shape, hidden: false, hole: false }, false, () => {
        state.needsRender = true;
      }, false);
      flatten(object, FILL[part.role], dark);
      object.userData.lidPreviewRole = part.role;
      group.add(object);
    }
    group.traverse((child) => setObjectRenderLayer(child, RENDER_LAYER_HELPERS));
    state.scene.add(group);
    groups.set(state, group);
  }
  state.needsRender = true;
}

/** The box round what the preview shows, or null when it shows nothing. */
export function lidPreviewBounds(state: ThreeState): THREE.Box3 | null {
  const group = groups.get(state);
  if (!group) return null;
  const box = new THREE.Box3().setFromObject(group, true);
  return box.isEmpty() ? null : box;
}

/** The preview's group, for tests. */
export function lidPreviewGroup(state: ThreeState) {
  return groups.get(state) ?? null;
}
