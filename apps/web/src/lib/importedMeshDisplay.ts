import * as THREE from "three";
import { MeshBVH, type SerializedBVH } from "three-mesh-bvh";
import type { WorkplaneShape } from "@/types/layerling";

type ImportedMesh = NonNullable<WorkplaneShape["importedMesh"]>;

/** The raycasting index of an imported mesh, as the viewport builds it (enableAcceleratedMeshPicking). */
export const IMPORTED_MESH_BVH_OPTIONS = { targetLeafSize: 12 } as const;

/** Normals for every corner, the lowest point on the plate: how a shape's mesh is drawn. */
export function putGeometryOnBase(geometry: THREE.BufferGeometry, preserveNormals = false) {
  if (!preserveNormals || !geometry.getAttribute("normal")) {
    geometry.computeVertexNormals();
  }
  geometry.computeBoundingBox();
  const minY = geometry.boundingBox?.min.y ?? 0;
  geometry.translate(0, -minY, 0);
  return geometry;
}

/**
 * A mesh's own normals, made fit to be lit by. Many exporters write 0 0 0 for every facet of an
 * STL, and a body drawn with those gets no light at all and shows black (#988). A corner whose
 * normal is not a direction takes its triangle's, from the order of its corners; the others, such
 * as the smooth ones of a chamfillet, stay as they are.
 */
export function drawableNormals(positions: ArrayLike<number>, normals: ArrayLike<number>) {
  const result = Float32Array.from(normals);
  for (let corner = 0; corner < result.length; corner += 9) {
    let faceNormal: THREE.Vector3 | null = null;
    for (let i = corner; i < corner + 9; i += 3) {
      const lengthSq = result[i] * result[i] + result[i + 1] * result[i + 1] + result[i + 2] * result[i + 2];
      // NaN fails every comparison, so it is caught by the same test.
      if (lengthSq > 0.25) continue;
      faceNormal ??= triangleNormal(positions, corner);
      result[i] = faceNormal.x;
      result[i + 1] = faceNormal.y;
      result[i + 2] = faceNormal.z;
    }
  }
  return result;
}

function triangleNormal(positions: ArrayLike<number>, corner: number) {
  const a = new THREE.Vector3(positions[corner], positions[corner + 1], positions[corner + 2]);
  const b = new THREE.Vector3(positions[corner + 3], positions[corner + 4], positions[corner + 5]);
  const c = new THREE.Vector3(positions[corner + 6], positions[corner + 7], positions[corner + 8]);
  return b.sub(a).cross(c.sub(a)).normalize();
}

/**
 * The view's geometry of an imported mesh (WorkplaneViewport's getImportedMeshCache). Its own
 * normals when it brings them (corners without a usable one take their triangle's); without,
 * putGeometryOnBase works them out.
 */
export function buildImportedMeshGeometry(mesh: ImportedMesh) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(mesh.positions, 3));
  const hasNormals = Boolean(mesh.normals && mesh.normals.length === mesh.positions.length && mesh.positions.length % 9 === 0);
  if (hasNormals && mesh.normals) {
    geometry.setAttribute("normal", new THREE.BufferAttribute(drawableNormals(mesh.positions, mesh.normals), 3));
  }
  return putGeometryOnBase(geometry, hasNormals);
}

/**
 * That geometry and its raycasting index, worked out in the geometry worker for a mesh it has just
 * made, so the page only has to put them together. Built by the same code as on the page, from
 * the same numbers: the same geometry comes out.
 */
export type PreparedImportedMeshDisplay = {
  position: Float32Array;
  normal: Float32Array;
  box: [number, number, number, number, number, number];
  bvh: SerializedBVH;
};

export function prepareImportedMeshDisplay(mesh: ImportedMesh): { display: PreparedImportedMeshDisplay; transfer: ArrayBuffer[] } {
  const geometry = buildImportedMeshGeometry(mesh);
  const box = geometry.boundingBox ?? new THREE.Box3();
  const position = geometry.getAttribute("position").array as Float32Array;
  const normal = geometry.getAttribute("normal").array as Float32Array;
  // Built before the index exists, as on the page; the BVH adds it.
  const bvh = MeshBVH.serialize(new MeshBVH(geometry, IMPORTED_MESH_BVH_OPTIONS), { cloneBuffers: false });
  const transfer = [position.buffer, normal.buffer, ...bvh.roots, ...(bvh.index ? [bvh.index.buffer] : [])] as ArrayBuffer[];
  return {
    display: { position, normal, box: [box.min.x, box.min.y, box.min.z, box.max.x, box.max.y, box.max.z], bvh },
    transfer: Array.from(new Set(transfer)),
  };
}

/**
 * Kept by the mesh's position list: the geometry is made from its positions and normals alone, and
 * a copy of the mesh with something added (its asset id after an import) keeps both lists.
 */
const preparedDisplays = new WeakMap<object, { display: PreparedImportedMeshDisplay; normals: number[] | undefined }>();
const preparedTrees = new WeakMap<THREE.BufferGeometry, SerializedBVH>();

/** Keeps what the worker prepared for a mesh until the view draws it. */
export function rememberPreparedDisplay(mesh: ImportedMesh, display: PreparedImportedMeshDisplay) {
  preparedDisplays.set(mesh.positions, { display, normals: mesh.normals });
}

/** The view's geometry from what the worker prepared, or null when nothing was. Used once. */
export function takePreparedImportedMeshGeometry(mesh: ImportedMesh): THREE.BufferGeometry | null {
  const prepared = preparedDisplays.get(mesh.positions);
  if (!prepared || prepared.normals !== mesh.normals) return null;
  preparedDisplays.delete(mesh.positions);
  const { display } = prepared;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(display.position, 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(display.normal, 3));
  const [minX, minY, minZ, maxX, maxY, maxZ] = display.box;
  geometry.boundingBox = new THREE.Box3(new THREE.Vector3(minX, minY, minZ), new THREE.Vector3(maxX, maxY, maxZ));
  preparedTrees.set(geometry, display.bvh);
  return geometry;
}

/**
 * The raycasting index for a geometry: the one the worker built for exactly this geometry, or a new
 * one. Only ever asked where the page would build it, so nothing else changes.
 */
export function computeImportedBoundsTree(geometry: THREE.BufferGeometry) {
  const prepared = preparedTrees.get(geometry);
  const target = geometry as THREE.BufferGeometry & { boundsTree?: MeshBVH };
  if (prepared && !geometry.getIndex()) {
    preparedTrees.delete(geometry);
    target.boundsTree = MeshBVH.deserialize(prepared, geometry);
    return;
  }
  target.boundsTree = new MeshBVH(geometry, IMPORTED_MESH_BVH_OPTIONS);
}
