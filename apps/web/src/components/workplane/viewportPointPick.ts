import * as THREE from "three";
import { fastEdgesGeometry } from "@/lib/fastEdgesGeometry";
import { pointerReach } from "@/lib/pointerReach";
import { findShapeObject, worldPointHidden, type ThreeState } from "./ViewportOverlays";

/** The crease edges of a mesh, in its own space, worked out once per geometry. */
function creaseEdges(mesh: THREE.Mesh<THREE.BufferGeometry>): Float32Array | null {
  const geometry = mesh.geometry;
  // A big imported mesh would stall the pointer while its edges are worked out.
  if ((geometry.index?.count ?? geometry.getAttribute("position")?.count ?? 0) > 600_000) return null;
  const cached = mesh.userData.pointPickEdges as { geometry: THREE.BufferGeometry; positions: Float32Array } | undefined;
  if (cached && cached.geometry === geometry) return cached.positions;
  const edgeGeometry = fastEdgesGeometry(geometry, 25);
  const positions = Float32Array.from(edgeGeometry.getAttribute("position").array as ArrayLike<number>);
  edgeGeometry.dispose();
  mesh.userData.pointPickEdges = { geometry, positions };
  return positions;
}

export type MeshFeature = { kind: "vertex" | "edge"; shapeId: string; point: THREE.Vector3; distance: number };

/**
 * The corner of one of these bodies nearest to the pointer, or else the nearest spot on one of their edges, within
 * reach on the screen (Discussion #1491). The corners and edges come from the meshes themselves (25° crease), so a
 * body that is not selected - which draws no edge lines - has them too, and one a body in front hides is left out.
 * `shapeId` is the id asked for, also when the mesh belongs to a part inside a group.
 */
export function meshFeatureNear(state: ThreeState, shapeIds: readonly string[], clientX: number, clientY: number): MeshFeature | null {
  const rect = state.renderer.domElement.getBoundingClientRect();
  const pointerX = clientX - rect.left;
  const pointerY = clientY - rect.top;
  const vertexReach = pointerReach(10);
  const edgeReach = pointerReach(8);
  state.camera.updateMatrixWorld();
  const vertices: MeshFeature[] = [];
  const edges: MeshFeature[] = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const screen = (point: THREE.Vector3) => {
    const projected = point.clone().project(state.camera);
    if (!Number.isFinite(projected.x) || !Number.isFinite(projected.y) || projected.z < -1 || projected.z > 1) return null;
    return { x: ((projected.x + 1) / 2) * rect.width, y: ((1 - projected.y) / 2) * rect.height };
  };
  shapeIds.forEach((shapeId) => {
    const object = findShapeObject(state, shapeId);
    if (!object || !object.visible) return;
    object.updateWorldMatrix(true, true);
    object.traverse((child) => {
      if (!(child instanceof THREE.Mesh) || !child.visible || !child.layers.isEnabled(1)) return;
      const positions = creaseEdges(child as THREE.Mesh<THREE.BufferGeometry>);
      if (!positions) return;
      for (let index = 0; index + 5 < positions.length; index += 6) {
        a.set(positions[index], positions[index + 1], positions[index + 2]).applyMatrix4(child.matrixWorld);
        b.set(positions[index + 3], positions[index + 4], positions[index + 5]).applyMatrix4(child.matrixWorld);
        const aScreen = screen(a);
        const bScreen = screen(b);
        if (!aScreen || !bScreen) continue;
        [[a, aScreen], [b, bScreen]].forEach(([world, place]) => {
          const at = place as { x: number; y: number };
          const distance = Math.hypot(at.x - pointerX, at.y - pointerY);
          if (distance <= vertexReach) vertices.push({ kind: "vertex", shapeId, point: (world as THREE.Vector3).clone(), distance });
        });
        const dx = bScreen.x - aScreen.x;
        const dy = bScreen.y - aScreen.y;
        const lengthSq = dx * dx + dy * dy;
        if (lengthSq < 1) continue;
        const amount = Math.min(1, Math.max(0, ((pointerX - aScreen.x) * dx + (pointerY - aScreen.y) * dy) / lengthSq));
        const distance = Math.hypot(pointerX - (aScreen.x + dx * amount), pointerY - (aScreen.y + dy * amount));
        if (distance <= edgeReach) edges.push({ kind: "edge", shapeId, point: a.clone().lerp(b, amount), distance });
      }
    });
  });
  const inView = (feature: MeshFeature) => !worldPointHidden(feature.point, state);
  vertices.sort((first, second) => first.distance - second.distance);
  const vertex = vertices.find(inView);
  if (vertex) return vertex;
  edges.sort((first, second) => first.distance - second.distance);
  return edges.find(inView) ?? null;
}
