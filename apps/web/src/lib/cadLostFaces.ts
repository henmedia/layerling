import type { OcctKernel, ShapeHandle } from "occt-wasm";

const HASH_UPPER_BOUND = 2_147_483_647;

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

/**
 * How many faces of the body a chamfer or fillet lost that it had no business with (Issue #1503). A face that shares no
 * vertex with the treated edges comes through the kernel untouched, as the very same face. On the faceted holes a mesh
 * boolean leaves (a circle as 96 flat strips), the kernel sometimes returns a "valid" solid with a whole hole filled in:
 * the strips and the hole's floor are gone, and the floor never touched a treated edge. The edges' own faces and the ones
 * at their ends are left out, since the treatment reshapes or replaces them.
 */
export function cadTreatmentLostFaces(cad: OcctKernel, solid: ShapeHandle, edges: ShapeHandle[], result: ShapeHandle) {
  const treatedVertices = edges.flatMap((edge) => cad.getSubShapes(edge, "vertex"));
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
    release(cad, [...treatedVertices, ...bodyFaces, ...resultFaces, ...faceVertices]);
  }
}
