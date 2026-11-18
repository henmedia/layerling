import * as THREE from "three";
import { RENDER_LAYER_HELPERS, setObjectRenderLayer, type ThreeState } from "@/components/workplane/ViewportOverlays";
import type { ClearanceBox } from "@/lib/clearanceCheck";
import type { FindingLevel } from "@/lib/findings";

/*
 * What the layer view of the layer check (Druckanalyse) draws in the 3D view. The bodies are cut at the top of the layer
 * shown, with the section view's plane (only the bodies' own materials are cut, as by the section view); "only this
 * layer" and "from - to" cut away what lies below as well, with a plane for the whole view. Over the cut lies the layer's
 * cross-section, filled, so the cut bodies do not look hollow; the places a finding marks are painted on their layers,
 * yellow for a hint and red for a problem; the layers still to come may show as faint outlines.
 */

/** Polygons in the kernel's frame (x, and the scene's -z), flat lists of points, at a height `z` (the scene's y). */
export type LayerViewPolygons = { z: number; polygons: number[][] };

export type LayerView = {
  /** The bodies are cut away above this height (the top of the layer shown). */
  top: number;
  /** And below this one, for "only this layer" and "from - to"; null keeps everything under the top. */
  bottom: number | null;
  /** The cross-section of the layer shown, at its top. */
  cap: LayerViewPolygons | null;
  /** Places to paint: each finding's outline on its layers. */
  marks: Array<LayerViewPolygons & { level: FindingLevel; active: boolean }>;
  /** Outlines of the layers still to come, faint; empty when the shadow is off. */
  ghost: LayerViewPolygons[];
  /** Where the camera goes; `request` counts the jumps, each one brings the camera there. */
  focus: ClearanceBox | null;
  request: number;
};

const CAP_COLOR = "#8fb3e0";
const HINT_COLOR = "#f2c230";
const PROBLEM_COLOR = "#e5484d";
const GHOST_COLOR = "#9aa4b2";

type Saved = { position: THREE.Vector3; target: THREE.Vector3; zoom: number; up: THREE.Vector3 };
const groups = new WeakMap<ThreeState, THREE.Group>();
const savedCameras = new WeakMap<ThreeState, Saved>();
const lowerPlanes = new WeakMap<ThreeState, THREE.Plane>();

function signedArea(flat: number[]) {
  let area = 0;
  for (let index = 0; index < flat.length; index += 2) {
    const next = (index + 2) % flat.length;
    area += flat[index] * flat[next + 1] - flat[next] * flat[index + 1];
  }
  return area / 2;
}

function insidePolygon(x: number, y: number, flat: number[]) {
  let inside = false;
  for (let index = 0, previous = flat.length - 2; index < flat.length; previous = index, index += 2) {
    const [xi, yi, xj, yj] = [flat[index], flat[index + 1], flat[previous], flat[previous + 1]];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * The polygons filled as triangles in the scene's frame at height `z`: Manifold gives outer outlines counter-clockwise
 * and holes clockwise; each hole goes with the smallest outline round it.
 */
export function layerFillPositions(polygons: readonly number[][], z: number): number[] {
  const outers = polygons.filter((flat) => flat.length >= 6 && signedArea(flat) > 0);
  const holes = polygons.filter((flat) => flat.length >= 6 && signedArea(flat) < 0);
  const holesOf = new Map<number[], number[][]>(outers.map((outer) => [outer, []]));
  for (const hole of holes) {
    const owner = outers
      .filter((outer) => insidePolygon(hole[0], hole[1], outer))
      .sort((a, b) => Math.abs(signedArea(a)) - Math.abs(signedArea(b)))[0];
    if (owner) holesOf.get(owner)!.push(hole);
  }
  const positions: number[] = [];
  const vectors = (flat: number[]) => {
    const points: THREE.Vector2[] = [];
    for (let index = 0; index < flat.length; index += 2) points.push(new THREE.Vector2(flat[index], flat[index + 1]));
    return points;
  };
  for (const outer of outers) {
    const contour = vectors(outer);
    const inner = holesOf.get(outer)!.map(vectors);
    const all = [...contour, ...inner.flat()];
    for (const [a, b, c] of THREE.ShapeUtils.triangulateShape(contour, inner)) {
      for (const point of [all[a], all[b], all[c]]) positions.push(point.x, z, -point.y);
    }
  }
  return positions;
}

function outlinePositions(polygons: readonly number[][], z: number, into: number[]) {
  for (const flat of polygons) {
    for (let index = 0; index < flat.length; index += 2) {
      const next = (index + 2) % flat.length;
      into.push(flat[index], z, -flat[index + 1], flat[next], z, -flat[next + 1]);
    }
  }
}

function fillMesh(positions: number[], color: string, opacity: number, order: number) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  const material = new THREE.MeshBasicMaterial({
    color, transparent: opacity < 1, opacity, side: THREE.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -order,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 1000 + order;
  return mesh;
}

function clearGroup(state: ThreeState) {
  const group = groups.get(state);
  if (!group) return;
  state.scene.remove(group);
  group.traverse((child) => {
    const object = child as THREE.Mesh;
    object.geometry?.dispose();
    (object.material as THREE.Material | undefined)?.dispose?.();
  });
  groups.delete(state);
}

/** Draws the layer view, replacing what it drew before; null takes it away and gives the camera back. */
export function syncLayerViewOverlay(state: ThreeState, view: LayerView | null) {
  clearGroup(state);
  if (!view) {
    state.renderer.clippingPlanes = [];
    lowerPlanes.delete(state);
    state.needsRender = true;
    return;
  }
  // The lower cut, for the whole view: the bodies' materials hold the section view's plane.
  if (view.bottom !== null) {
    let plane = lowerPlanes.get(state);
    if (!plane) {
      plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      lowerPlanes.set(state, plane);
    }
    plane.constant = -view.bottom + 1e-4;
    state.renderer.clippingPlanes = [plane];
  } else {
    state.renderer.clippingPlanes = [];
  }
  const group = new THREE.Group();
  group.name = "LayerView";
  if (view.cap?.polygons.length) {
    const fill = layerFillPositions(view.cap.polygons, view.cap.z - 0.002);
    if (fill.length) group.add(fillMesh(fill, CAP_COLOR, 1, 1));
    const lines: number[] = [];
    outlinePositions(view.cap.polygons, view.cap.z, lines);
    const outline = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(lines, 3)), new THREE.LineBasicMaterial({ color: "#2f5f9e" }));
    outline.renderOrder = 1004;
    group.add(outline);
  }
  view.marks.forEach((mark, index) => {
    const fill = layerFillPositions(mark.polygons, mark.z);
    if (!fill.length) return;
    group.add(fillMesh(fill, mark.level === "problem" ? PROBLEM_COLOR : HINT_COLOR, mark.active ? 0.95 : 0.6, 2 + Math.min(index, 4)));
  });
  if (view.ghost.length) {
    const lines: number[] = [];
    for (const layer of view.ghost) outlinePositions(layer.polygons, layer.z, lines);
    const ghost = new THREE.LineSegments(
      new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(lines, 3)),
      new THREE.LineBasicMaterial({ color: GHOST_COLOR, transparent: true, opacity: 0.35, depthWrite: false }),
    );
    ghost.renderOrder = 999;
    group.add(ghost);
  }
  group.traverse((child) => setObjectRenderLayer(child, RENDER_LAYER_HELPERS));
  state.scene.add(group);
  groups.set(state, group);
  state.needsRender = true;
}

/** Keeps the camera as it was when the layer view opened, once. */
export function saveLayerViewCamera(state: ThreeState) {
  if (savedCameras.has(state)) return;
  const camera = state.camera;
  savedCameras.set(state, { position: camera.position.clone(), target: state.controls.target.clone(), zoom: camera.zoom, up: camera.up.clone() });
}

/** Puts the camera back where it was when the layer view opened. */
export function restoreLayerViewCamera(state: ThreeState) {
  const saved = savedCameras.get(state);
  savedCameras.delete(state);
  if (!saved) return;
  state.cameraTurn = null;
  state.camera.position.copy(saved.position);
  state.camera.up.copy(saved.up);
  state.camera.zoom = saved.zoom;
  state.controls.target.copy(saved.target);
  state.camera.lookAt(saved.target);
  state.camera.updateProjectionMatrix();
  state.controls.update();
  state.needsRender = true;
}
