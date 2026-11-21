import type { OcctKernel, ShapeHandle } from "occt-wasm";

const HASH_UPPER_BOUND = 2_147_483_647;

/**
 * The faces round each edge, by hash, from each face's own edges (#1812). The kernel's `edgeToFaceMap` gives the same
 * faces, but grows with the square of the faces.
 */
export function edgeFaceMap(cad: OcctKernel, faces: ShapeHandle[]) {
  const map = new Map<number, number[]>();
  for (const face of faces) {
    const faceHash = cad.hashCode(face, HASH_UPPER_BOUND);
    for (const edgeHash of cad.subShapeHashes(face, "edge", HASH_UPPER_BOUND)) {
      const around = map.get(edgeHash);
      if (around) around.push(faceHash);
      else map.set(edgeHash, [faceHash]);
    }
  }
  return map;
}
