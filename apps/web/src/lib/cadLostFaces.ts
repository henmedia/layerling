import type { OcctKernel, ShapeHandle, Vec3 } from "occt-wasm";
import { isKernelMemoryFault } from "@/lib/kernelFault";

const HASH_UPPER_BOUND = 2_147_483_647;
// Two edges that meet at no more than this angle run on smoothly: the kernel takes the one with the other (#1591).
const SMOOTH_CONTINUATION_DEGREES = 2;

export const TREATMENT_LOST_FACES_MESSAGE = "The kernel lost part of the body at this size";

function bucketByHash(cad: OcctKernel, handles: ShapeHandle[]) {
  const buckets = new Map<number, ShapeHandle[]>();
  for (const handle of handles) {
    const hash = cad.hashCode(handle, HASH_UPPER_BOUND);
    const bucket = buckets.get(hash);
    if (bucket) bucket.push(handle);
    else buckets.set(hash, [handle]);
  }
  return buckets;
}

function release(cad: OcctKernel, handles: ShapeHandle[]) {
  for (const handle of handles) {
    try {
      cad.release(handle);
    } catch {
      // The handle is already gone.
    }
  }
}

function unit(vector: Vec3) {
  const length = Math.hypot(vector.x, vector.y, vector.z);
  return length > 1e-12 ? { x: vector.x / length, y: vector.y / length, z: vector.z / length } : null;
}

function distanceSquared(a: Vec3, b: Vec3) {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2;
}

/** The edge's direction at the end that lies at `at`, or null where the kernel cannot say (a degenerate edge). */
function tangentAtEnd(cad: OcctKernel, edge: ShapeHandle, at: Vec3) {
  try {
    const range = cad.curveParameters(edge);
    const first = cad.curvePointAtParam(edge, range.first);
    const last = cad.curvePointAtParam(edge, range.last);
    return unit(cad.curveTangent(edge, distanceSquared(first, at) <= distanceSquared(last, at) ? range.first : range.last));
  } catch (error) {
    // A kernel out of memory is no degenerate edge: it has to reach the caller, which starts the kernel afresh.
    if (isKernelMemoryFault(error)) throw error;
    return null;
  }
}

/**
 * The picked edges and every edge of the body that runs on from them smoothly. OpenCascade chamfers and fillets such a
 * chain as a whole, whichever of its edges was picked (#161), so the faces along all of it are reshaped. Worked out on the
 * kernel's own curves, not on the page's polylines: those bend at every point and would take faceted circles along too.
 */
function smoothlyContinuedEdges(cad: OcctKernel, solid: ShapeHandle, edges: ShapeHandle[], owned: ShapeHandle[]) {
  const bodyEdges = cad.getSubShapes(solid, "edge");
  owned.push(...bodyEdges);
  const atVertex = new Map<number, Array<{ vertex: ShapeHandle; edge: ShapeHandle }>>();
  for (const edge of bodyEdges) {
    const vertices = cad.getSubShapes(edge, "vertex");
    owned.push(...vertices);
    for (const vertex of vertices) {
      const hash = cad.hashCode(vertex, HASH_UPPER_BOUND);
      const bucket = atVertex.get(hash);
      if (bucket) bucket.push({ vertex, edge });
      else atVertex.set(hash, [{ vertex, edge }]);
    }
  }
  const reached: ShapeHandle[] = [];
  const reachedByHash = new Map<number, ShapeHandle[]>();
  const isReached = (edge: ShapeHandle) => (reachedByHash.get(cad.hashCode(edge, HASH_UPPER_BOUND)) ?? []).some((other) => cad.isSame(edge, other));
  const reach = (edge: ShapeHandle) => {
    if (isReached(edge)) return;
    reached.push(edge);
    const hash = cad.hashCode(edge, HASH_UPPER_BOUND);
    const bucket = reachedByHash.get(hash);
    if (bucket) bucket.push(edge);
    else reachedByHash.set(hash, [edge]);
  };
  edges.forEach(reach);
  const limit = Math.cos((SMOOTH_CONTINUATION_DEGREES * Math.PI) / 180);
  for (let index = 0; index < reached.length; index += 1) {
    const edge = reached[index];
    const vertices = cad.getSubShapes(edge, "vertex");
    owned.push(...vertices);
    for (const vertex of vertices) {
      const at = cad.vertexPosition(vertex);
      const own = tangentAtEnd(cad, edge, at);
      if (!own) continue;
      for (const entry of atVertex.get(cad.hashCode(vertex, HASH_UPPER_BOUND)) ?? []) {
        if (!cad.isSame(entry.vertex, vertex) || isReached(entry.edge)) continue;
        const other = tangentAtEnd(cad, entry.edge, at);
        if (other && Math.abs(own.x * other.x + own.y * other.y + own.z * other.z) >= limit) reach(entry.edge);
      }
    }
  }
  return reached;
}

/**
 * How many faces of the body a chamfer or fillet lost that it had no business with (Issue #1503). A face that shares no
 * vertex with the treated edges comes through the kernel untouched, as the very same face. On the faceted holes a mesh
 * boolean leaves (a circle as 96 flat strips), the kernel sometimes returns a "valid" solid with a whole hole filled in:
 * the strips and the hole's floor are gone, and the floor never touched a treated edge. The edges' own faces and the ones
 * at their ends are left out, since the treatment reshapes or replaces them; so are the faces along the edges the kernel
 * takes with them because they run on smoothly (#1591: one straight rim edge of a tray with rounded corners was refused).
 */
export function cadTreatmentLostFaces(cad: OcctKernel, solid: ShapeHandle, edges: ShapeHandle[], result: ShapeHandle) {
  const owned: ShapeHandle[] = [];
  const treatedVertices = smoothlyContinuedEdges(cad, solid, edges, owned).flatMap((edge) => cad.getSubShapes(edge, "vertex"));
  const bodyFaces = cad.getSubShapes(solid, "face");
  const resultFaces = cad.getSubShapes(result, "face");
  const faceVertices: ShapeHandle[] = [];
  try {
    const treated = bucketByHash(cad, treatedVertices);
    const kept = bucketByHash(cad, resultFaces);
    let lost = 0;
    for (const face of bodyFaces) {
      const vertices = cad.getSubShapes(face, "vertex");
      faceVertices.push(...vertices);
      const touched = vertices.some((vertex) => (treated.get(cad.hashCode(vertex, HASH_UPPER_BOUND)) ?? []).some((other) => cad.isSame(vertex, other)));
      if (touched) continue;
      if (!(kept.get(cad.hashCode(face, HASH_UPPER_BOUND)) ?? []).some((other) => cad.isSame(face, other))) lost += 1;
    }
    return lost;
  } finally {
    release(cad, [...treatedVertices, ...bodyFaces, ...resultFaces, ...faceVertices, ...owned]);
  }
}
