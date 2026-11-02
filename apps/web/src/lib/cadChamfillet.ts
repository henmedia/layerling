import type { OcctKernel, ShapeHandle, Vec3 } from "occt-wasm";
import { isCadModifierWasmMemoryFault } from "@/lib/cadModifierRuntime";
import { orientedFaceNormal } from "@/lib/cadShell";

// Printable bottom-edge treatment ("chamfillet") for the CAD modifier worker:
// a self-supporting chamfer at the base whose upper transition edge into the
// wall is rounded with a tangent fillet. Lives outside the worker so end-to-end
// tests can run it against the real OCCT kernel.

const HASH_UPPER_BOUND = 2_147_483_647;

function releaseAll(cad: OcctKernel, handles: ShapeHandle[]) {
  handles.forEach((handle) => {
    try {
      cad.release(handle);
    } catch {
      // already released
    }
  });
}

function shapeIsValidSolid(cad: OcctKernel, shape: ShapeHandle) {
  try {
    if (!cad.isValid(shape)) return false;
    if (cad.isSolid(shape)) return true;
    return cad.subShapeCount(shape, "solid") > 0;
  } catch {
    return false;
  }
}

function parseEdgeFaceMap(values: number[]) {
  const map = new Map<number, number[]>();
  for (let index = 0; index + 1 < values.length; ) {
    const edgeHash = values[index++];
    const count = values[index++];
    const faces = values.slice(index, index + count);
    index += count;
    const current = map.get(edgeHash) ?? [];
    faces.forEach((hash) => {
      if (!current.includes(hash)) current.push(hash);
    });
    map.set(edgeHash, current);
  }
  return map;
}

function edgeMidpoint(cad: OcctKernel, edge: ShapeHandle): Vec3 {
  try {
    const { first, last } = cad.curveParameters(edge);
    if (Number.isFinite(first) && Number.isFinite(last)) {
      return cad.curvePointAtParam(edge, (first + last) * 0.5);
    }
  } catch {
    // Fall back to linear center of mass.
  }
  return cad.getLinearCenterOfMass(edge);
}

function faceSamplePoint(cad: OcctKernel, face: ShapeHandle): Vec3 {
  const center = cad.getSurfaceCenterOfMass(face);
  try {
    return cad.projectPointOnFace(face, center);
  } catch {
    return center;
  }
}

function crossUnit(a: Vec3, b: Vec3): Vec3 {
  const x = a.y * b.z - a.z * b.y;
  const y = a.z * b.x - a.x * b.z;
  const z = a.x * b.y - a.y * b.x;
  const length = Math.hypot(x, y, z) || 1;
  return { x: x / length, y: y / length, z: z / length };
}

function dot(a: Vec3, b: Vec3) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function distance3(a: Vec3, b: Vec3) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

type OriginalFaceSnapshot = {
  handle: ShapeHandle;
  surfaceType: string;
};

/**
 * Points that lie on `face` itself. The centre of mass of a curved face is no such point (that of a cylinder wall is on
 * its axis, and projecting it back onto the wall picks any spot), so the midpoints of its edges serve instead (#570).
 */
function faceBoundaryPoints(cad: OcctKernel, face: ShapeHandle): Vec3[] {
  const edges = cad.getSubShapes(face, "edge");
  try {
    // The tip of a cone is an edge of no length; the wall has no normal there, so it would fail the comparison.
    const real = edges.filter((edge) => {
      const box = cad.getBoundingBox(edge, false);
      return Math.hypot(box.xmax - box.xmin, box.ymax - box.ymin, box.zmax - box.zmin) > 1e-6;
    });
    const points = real.slice(0, 6).map((edge) => edgeMidpoint(cad, edge));
    return points.length ? points : [faceSamplePoint(cad, face)];
  } finally {
    releaseAll(cad, edges);
  }
}

function isOriginalFace(cad: OcctKernel, face: ShapeHandle, originals: OriginalFaceSnapshot[], tolerance: number) {
  for (const orig of originals) {
    if (cad.isSame(face, orig.handle)) return true;
  }
  const surfaceType = cad.surfaceType(face);
  const samples = faceBoundaryPoints(cad, face);
  for (const orig of originals) {
    if (orig.surfaceType !== surfaceType) continue;
    try {
      const matches = samples.every((sample) => {
        const projected = cad.projectPointOnFace(orig.handle, sample);
        if (distance3(sample, projected) > tolerance) return false;
        const normal = orientedFaceNormal(cad, face, sample);
        const origNormal = orientedFaceNormal(cad, orig.handle, projected);
        return dot(normal, origNormal) > 0.999;
      });
      if (matches) return true;
    } catch {
      // Ignore faces whose projection fails.
    }
  }
  return false;
}

/**
 * Picks the upper transition edges of the chamfer bevel faces created on `chamfered`
 * so the upper wall transitions are smoothly rounded while leaving the lower
 * bed-side chamfer edges sharp.
 */
function findChamferTransitionEdges(
  cad: OcctKernel,
  chamfered: ShapeHandle,
  originals: OriginalFaceSnapshot[],
  tolerance: number,
): ShapeHandle[] {
  const faces = cad.getSubShapes(chamfered, "face");
  const edges = cad.getSubShapes(chamfered, "edge");
  const keepUpperHashes = new Set<number>();
  try {
    const faceByHash = new Map<number, ShapeHandle>();
    const bevelFaceHashes = new Set<number>();
    faces.forEach((face) => {
      const hash = cad.hashCode(face, HASH_UPPER_BOUND);
      faceByHash.set(hash, face);
      if (!isOriginalFace(cad, face, originals, tolerance)) {
        bevelFaceHashes.add(hash);
      }
    });

    if (bevelFaceHashes.size === 0) {
      releaseAll(cad, edges);
      return [];
    }

    const edgeToFaces = parseEdgeFaceMap(cad.edgeToFaceMap(chamfered, HASH_UPPER_BOUND));
    type BevelBoundaryEdge = {
      edge: ShapeHandle;
      edgeHash: number;
      otherFaceHash: number;
      midpoint: Vec3;
      crossDir: Vec3;
    };
    const byBevelFace = new Map<number, BevelBoundaryEdge[]>();

    edges.forEach((edge) => {
      const edgeHash = cad.hashCode(edge, HASH_UPPER_BOUND);
      const adjacent = edgeToFaces.get(edgeHash) ?? [];
      if (adjacent.length !== 2) return;
      const [hashA, hashB] = adjacent;
      const aIsBevel = bevelFaceHashes.has(hashA);
      const bIsBevel = bevelFaceHashes.has(hashB);
      if (aIsBevel === bIsBevel) return;
      const bevelHash = aIsBevel ? hashA : hashB;
      const otherHash = aIsBevel ? hashB : hashA;
      const bevelFace = faceByHash.get(bevelHash);
      const otherFace = faceByHash.get(otherHash);
      if (!bevelFace || !otherFace) return;

      const midpoint = edgeMidpoint(cad, edge);
      let crossDir: Vec3 = { x: 0, y: 1, z: 0 };
      try {
        const bevelNormal = orientedFaceNormal(cad, bevelFace, midpoint);
        const otherNormal = orientedFaceNormal(cad, otherFace, midpoint);
        crossDir = crossUnit(bevelNormal, otherNormal);
      } catch {
        // Keep fallback direction when normal evaluation fails.
      }
      const list = byBevelFace.get(bevelHash) ?? [];
      list.push({ edge, edgeHash, otherFaceHash: otherHash, midpoint, crossDir });
      byBevelFace.set(bevelHash, list);
    });

    byBevelFace.forEach((boundaryEdges) => {
      if (boundaryEdges.length === 0) return;
      if (boundaryEdges.length === 1) {
        keepUpperHashes.add(boundaryEdges[0].edgeHash);
        return;
      }

      // Group boundary edges of this bevel face by the original face they touch.
      const byOtherFace = new Map<number, BevelBoundaryEdge[]>();
      boundaryEdges.forEach((item) => {
        const group = byOtherFace.get(item.otherFaceHash) ?? [];
        group.push(item);
        byOtherFace.set(item.otherFaceHash, group);
      });
      const groups = [...byOtherFace.values()];

      let pair: [BevelBoundaryEdge[], BevelBoundaryEdge[]] | null = null;
      if (groups.length === 2) {
        pair = [groups[0], groups[1]];
      } else if (groups.length > 2) {
        // When an open edge is chamfered, the bevel face also touches end-cap faces.
        // The two main rails sit on opposite sides of the bevel strip, so their
        // (n_bevel x n_other) directions are anti-parallel (dot product near -1).
        let bestDot = Number.POSITIVE_INFINITY;
        for (let i = 0; i < groups.length; i += 1) {
          for (let j = i + 1; j < groups.length; j += 1) {
            const d = dot(groups[i][0].crossDir, groups[j][0].crossDir);
            if (d < bestDot) {
              bestDot = d;
              pair = [groups[i], groups[j]];
            }
          }
        }
      }

      if (!pair) return;
      const meanY = (items: BevelBoundaryEdge[]) =>
        items.reduce((sum, item) => sum + item.midpoint.y, 0) / items.length;
      const meanXZ = (items: BevelBoundaryEdge[]) =>
        items.reduce((sum, item) => sum + item.midpoint.x + item.midpoint.z, 0) / items.length;
      const yA = meanY(pair[0]);
      const yB = meanY(pair[1]);
      const chosen = Math.abs(yA - yB) > tolerance
        ? (yA >= yB ? pair[0] : pair[1])
        : (meanXZ(pair[0]) >= meanXZ(pair[1]) ? pair[0] : pair[1]);
      chosen.forEach((item) => keepUpperHashes.add(item.edgeHash));
    });

    const upperEdges: ShapeHandle[] = [];
    const unusedEdges: ShapeHandle[] = [];
    const seenHashes = new Set<number>();
    edges.forEach((edge) => {
      const hash = cad.hashCode(edge, HASH_UPPER_BOUND);
      if (keepUpperHashes.has(hash) && !seenHashes.has(hash)) {
        seenHashes.add(hash);
        upperEdges.push(edge);
      } else {
        unusedEdges.push(edge);
      }
    });
    releaseAll(cad, unusedEdges);
    return upperEdges;
  } finally {
    releaseAll(cad, faces);
  }
}

/**
 * Applies a Chamfillet to `edges` of `solid`:
 * 1. Chamfers `edges` with a base setback of `0.5 * amount` at `chamferAngle` (default 45°).
 * 2. Fillets the upper transition edge of each chamfer bevel so ~70% of the bevel
 *    sweeps tangentially into a generous rounded fillet toward the vertical wall
 *    (giving a total vertical height of ~`amount` with ~85% curved fillet and a
 *    ~15% self-supporting build-plate chamfer starter).
 */
export function chamfilletSolid(
  cad: OcctKernel,
  solid: ShapeHandle,
  edges: ShapeHandle[],
  amount: number,
  chamferAngle = 45,
): ShapeHandle {
  const origFaces = cad.getSubShapes(solid, "face");
  let chamfered: ShapeHandle | null = null;
  let upperEdges: ShapeHandle[] = [];
  try {
    const originals: OriginalFaceSnapshot[] = origFaces.map((handle) => ({
      handle,
      surfaceType: cad.surfaceType(handle),
    }));
    const safeAngle = Math.min(75, Math.max(15, Number.isFinite(chamferAngle) ? chamferAngle : 45));
    const chamferDist = amount * 0.5;
    const chamferedSolid = Math.abs(safeAngle - 45) < 0.001
      ? cad.chamfer(solid, edges, chamferDist)
      : cad.chamferDistAngle(solid, edges, chamferDist, safeAngle);
    chamfered = chamferedSolid;

    const tolerance = Math.max(1e-4, chamferDist * 1e-3);
    upperEdges = findChamferTransitionEdges(cad, chamferedSolid, originals, tolerance);
    if (upperEdges.length === 0) {
      chamfered = null;
      return chamferedSolid;
    }

    const alphaRad = (safeAngle * Math.PI) / 180;
    const bevelLength = chamferDist / Math.max(Math.cos(alphaRad), Math.sin(alphaRad));
    const halfTurnRad = ((90 - safeAngle) * Math.PI) / 360;
    const targetRadius = (0.7 * bevelLength) / Math.max(0.1, Math.tan(halfTurnRad));

    for (const scale of [1, 0.85, 0.7, 0.5]) {
      const radius = targetRadius * scale;
      if (radius < 0.01) break;
      try {
        const result = cad.fillet(chamferedSolid, upperEdges, radius);
        if (shapeIsValidSolid(cad, result)) {
          cad.release(chamferedSolid);
          chamfered = null;
          return result;
        }
        cad.release(result);
      } catch (error) {
        // A kernel that has run out of memory is no case for a smaller radius; the worker restarts it.
        if (error instanceof Error && isCadModifierWasmMemoryFault(error.message, error.name)) throw error;
        // Try a slightly smaller blend radius when adjacent geometry is tight.
      }
    }
    throw new Error("The CAD kernel could not complete this edge treatment");
  } catch (error) {
    if (chamfered !== null) cad.release(chamfered);
    throw error;
  } finally {
    releaseAll(cad, upperEdges);
    releaseAll(cad, origFaces);
  }
}
