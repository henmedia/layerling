// Adapted from WC3D/Cadverix-3D (SketchForge-3D), drawingProjection.ts,
// commit 8728f4d7a36fd965d362eb4d6d76b32d96e04391 (AGPL-3.0).
import * as THREE from "three";
import { MeshBVH } from "three-mesh-bvh";

export type DrawingPoint = [number, number];
export type DrawingPoint3 = [number, number, number];
export type DrawingMesh = { vertices: readonly DrawingPoint3[]; faces: readonly [number, number, number][] };
/**
 * `source` is the index of the mesh the edge belongs to - the first one, where two meshes share it. In a
 * precise view a visible line also has `sides`: the mesh seen just beside it on either hand, null for free space.
 */
export type DrawingLine = { a: DrawingPoint; b: DrawingPoint; hidden: boolean; source?: number; sides?: [number | null, number | null] };
export type DrawingProjection = { lines: DrawingLine[]; center: DrawingPoint3; width: number; height: number };
// A smooth, curved body is cut into very many triangles at export quality, so this is generous: the projection
// takes about 0.6 s per 250,000 of them (#414). The edges, not the triangles, are what makes a view slow.
export const MAX_DRAWING_TRIANGLES = 400_000;
export const MAX_DRAWING_EDGES = 12_000;

/** A view with more triangles or edges than a projection takes; the SVG export falls back on the silhouette then. */
export class DrawingTooComplexError extends Error {}

/**
 * How the design is turned before it is drawn: angles in degrees about x, y and z, or the quaternion of a camera
 * (x, y, z, w) to draw what that camera looks at - its right to the right, its up up (Discussion #2103).
 */
export type DrawingRotation = DrawingPoint3 | { camera: [number, number, number, number] };

export function drawingRotation(rotation: DrawingRotation) {
  if (!Array.isArray(rotation)) return new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion(...rotation.camera).normalize().invert());
  return new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...rotation.map((angle) => angle * Math.PI / 180) as DrawingPoint3, "XYZ"));
}

/**
 * Sharp and silhouette edges from the actual mesh, with BVH-tested hidden lines. An edge that is partly hidden
 * is halved where its samples disagree, to find where it goes out of sight. For a drawing three samples and a
 * 16th of the edge are plenty; `precise` (an SVG a laser or plotter follows) also looks just inside both ends,
 * where the three samples miss a change, and then pins a single change down by bisection.
 */
export function projectDrawingMeshes(meshes: readonly DrawingMesh[], rotation: DrawingRotation, precise = false): DrawingProjection {
  const triangleCount = meshes.reduce((sum, mesh) => sum + mesh.faces.length, 0);
  if (!triangleCount) throw new Error("This view has no solid geometry");
  if (triangleCount > MAX_DRAWING_TRIANGLES) throw new DrawingTooComplexError(`Drawing views support up to ${MAX_DRAWING_TRIANGLES.toLocaleString("en-US")} triangles; these views have ${triangleCount.toLocaleString("en-US")}. Choose fewer or simpler objects.`);
  if (meshes.reduce((sum, mesh) => sum + mesh.vertices.length, 0) > MAX_DRAWING_TRIANGLES * 3) throw new DrawingTooComplexError("Drawing source has too many vertices");
  const matrix = drawingRotation(rotation);
  const points: THREE.Vector3[] = [];
  const indices: number[] = [];
  // Which mesh a triangle is from, by its corners: the BVH reorders the triangles, but keeps each one whole.
  const triangleSource = new Map<string, number>();
  const welded = new Map<string, number>();
  const edges = new Map<string, { a: number; b: number; normals: THREE.Vector3[]; source: number }>();
  const pointId = (point: DrawingPoint3) => {
    if (point.length !== 3 || !point.every(Number.isFinite)) throw new Error("Drawing source contains invalid coordinates");
    const key = point.map((v) => Math.round(v * 100000)).join(",");
    const existing = welded.get(key);
    if (existing !== undefined) return existing;
    const id = points.length;
    welded.set(key, id);
    points.push(new THREE.Vector3(...point).applyMatrix4(matrix));
    return id;
  };
  for (const [source, mesh] of meshes.entries()) {
    const ids = mesh.vertices.map(pointId);
    for (const face of mesh.faces) {
      const [a, b, c] = face.map((index) => ids[index]);
      if (a === undefined || b === undefined || c === undefined) throw new Error("Drawing source contains an invalid triangle");
      const normal = points[b]!.clone().sub(points[a]!).cross(points[c]!.clone().sub(points[a]!));
      if (normal.lengthSq() < 1e-18) continue;
      normal.normalize();
      indices.push(a, b, c);
      triangleSource.set(`${a},${b},${c}`, source);
      for (const [start, end] of [[a, b], [b, c], [c, a]]) {
        const key = start! < end! ? `${start}:${end}` : `${end}:${start}`;
        const edge = edges.get(key) ?? { a: start!, b: end!, normals: [], source };
        edge.normals.push(normal);
        edges.set(key, edge);
      }
    }
  }
  if (!indices.length) throw new Error("Drawing source contains no usable triangles");
  const bounds = new THREE.Box3().setFromPoints(points);
  const center = bounds.getCenter(new THREE.Vector3()).toArray() as DrawingPoint3;
  const size = bounds.getSize(new THREE.Vector3());
  const project = (p: THREE.Vector3): DrawingPoint => [p.x - center[0], center[1] - p.y];
  // A silhouette is where the surface turns from facing the viewer to facing away - or to running along the
  // view, as a rounded edge meets the wall below it: the outline of a filleted top seen from above.
  const candidates = [...edges.values()].filter(({ normals }) => normals.length !== 2
    || normals[0]!.dot(normals[1]!) < Math.cos(25 * Math.PI / 180)
    || (normals.some((n) => n.z > 1e-7) && normals.some((n) => n.z < 1e-7)));
  if (candidates.length > MAX_DRAWING_EDGES) throw new DrawingTooComplexError("This view has too many drawing edges. Choose fewer or simpler objects.");
  const geometry = new THREE.BufferGeometry();
  // Keep Float32 BVH coordinates near the origin for far-away parts.
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(points.flatMap((p) => [p.x - center[0], p.y - center[1], p.z - center[2]]), 3));
  geometry.setIndex(indices);
  const lines = new Map<string, DrawingLine>();
  try {
    const bvh = new MeshBVH(geometry, { targetLeafSize: 8 });
    const tolerance = Math.max(0.0001, size.length() * 1e-6);
    const top = bounds.max.z - center[2] + size.length() + 1;
    const ray = new THREE.Ray(new THREE.Vector3(), new THREE.Vector3(0, 0, -1));
    const hidden = (p: THREE.Vector3) => {
      ray.origin.set(p.x - center[0], p.y - center[1], top);
      const hit = bvh.raycastFirst(ray, THREE.DoubleSide);
      return Boolean(hit && hit.distance < top - (p.z - center[2]) - tolerance);
    };
    // The mesh one sees first looking down at (x, y), or null where the view passes the design.
    const seenAt = (x: number, y: number) => {
      ray.origin.set(x - center[0], y - center[1], top);
      const face = bvh.raycastFirst(ray, THREE.DoubleSide)?.face;
      return face ? triangleSource.get(`${face.a},${face.b},${face.c}`) ?? null : null;
    };
    const sideOffset = Math.max(tolerance * 20, 0.005);
    const emit = (a: THREE.Vector3, b: THREE.Vector3, source: number, isHidden: boolean, sides?: [number | null, number | null]) => {
      const p = project(a), q = project(b);
      if (Math.hypot(q[0] - p[0], q[1] - p[1]) < 1e-6) return;
      const key = [p, q].map((point) => point.map((v) => Math.round(v * 100000)).join(",")).sort().join(":");
      if (lines.has(key) && isHidden) return;
      lines.set(key, { a: p, b: q, hidden: isHidden, source, ...(sides ? { sides } : {}) });
    };
    // What a point of an edge shows: hidden, or visible with the meshes seen just beside it on either hand.
    type Look = { hidden: boolean; sides?: [number | null, number | null]; key: string };
    const lookAt = (a: THREE.Vector3, b: THREE.Vector3, t: number): Look => {
      const point = a.clone().lerp(b, t);
      const isHidden = hidden(point);
      if (!precise || isHidden) return { hidden: isHidden, key: isHidden ? "h" : "v" };
      const dx = b.x - a.x, dy = b.y - a.y;
      const length = Math.hypot(dx, dy) || 1;
      const nx = -dy / length * sideOffset, ny = dx / length * sideOffset;
      const sides: [number | null, number | null] = [seenAt(point.x + nx, point.y + ny), seenAt(point.x - nx, point.y - ny)];
      return { hidden: false, sides, key: `v${sides[0]}|${sides[1]}` };
    };
    const samples = precise ? [0.001, 0.2, 0.5, 0.8, 0.999] : [0.2, 0.5, 0.8];
    const middleSample = Math.floor(samples.length / 2);
    const add = (a: THREE.Vector3, b: THREE.Vector3, source: number, depth = 0) => {
      const p = project(a), q = project(b);
      if (Math.hypot(q[0] - p[0], q[1] - p[1]) < 1e-6) return;
      const looks = samples.map((t) => lookAt(a, b, t));
      const changes = looks.filter((look, index) => index > 0 && look.key !== looks[index - 1]!.key).length;
      if (depth < 4 && changes > 0) {
        const middle = a.clone().lerp(b, 0.5);
        add(a, middle, source, depth + 1); add(middle, b, source, depth + 1); return;
      }
      // One clean change - in sight or in what lies beside: find where by bisection. Several (rays grazing a
      // wall) stay with the middle sample.
      if (precise && changes === 1) {
        const at = looks.findIndex((look, index) => index > 0 && look.key !== looks[index - 1]!.key);
        let low = samples[at - 1]!;
        let high = samples[at]!;
        for (let step = 0; step < 30; step += 1) {
          const middle = (low + high) / 2;
          if (lookAt(a, b, middle).key === looks[0]!.key) low = middle;
          else high = middle;
        }
        const turn = a.clone().lerp(b, (low + high) / 2);
        const first = looks[0]!;
        const last = looks[looks.length - 1]!;
        emit(a, turn, source, first.hidden, first.sides);
        emit(turn, b, source, last.hidden, last.sides);
        return;
      }
      const middle = looks[middleSample]!;
      emit(a, b, source, middle.hidden, middle.sides);
    };
    candidates.forEach(({ a, b, source }) => add(points[a]!, points[b]!, source));
  } finally { geometry.dispose(); }
  return { lines: [...lines.values()], center, width: size.x, height: size.y };
}
