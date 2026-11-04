import type { OcctKernel, ShapeHandle } from "occt-wasm";
import { cadTriangleFaces } from "@/lib/cadFacePick";
import type { CadFaceInfo } from "@/lib/cadModifierTypes";
import { isCadModifierWasmMemoryFault } from "@/lib/cadModifierRuntime";
import { orientedFaceNormal } from "@/lib/cadShell";
import { isKernelMemoryFault } from "@/lib/kernelFault";

// Deleting faces of an exact body (#451) for the CAD modifier worker: the
// faces around the deleted ones grow until they close the gap. It lives
// outside the worker so the end-to-end tests can run it against the real
// OCCT kernel.

/** The raw message when the kernel cannot close the gap; the editor words it for the person (cadModifierUserErrorMessage). */
export const DELETE_FACES_UNCHANGED_MESSAGE = "These faces cannot be deleted: the faces around them do not close the gap.";

const DEFEATURE_TOLERANCE = 1e-4;
/** The bound the kernel's face groups are hashed with (occt-wasm's meshShape); the faces are hashed alike to find them. */
const HASH_UPPER_BOUND = 2_147_483_647;

function releaseAll(cad: OcctKernel, handles: ShapeHandle[]) {
  handles.forEach((handle) => {
    try {
      cad.release(handle);
    } catch {
      // already gone
    }
  });
}

function shapeIsValid(cad: OcctKernel, shape: ShapeHandle) {
  try {
    return Boolean(cad.isValid(shape));
  } catch (error) {
    if (isKernelMemoryFault(error)) throw error;
    return false;
  }
}

/** A face's surface kind, area, middle and box: what makes two faces the same face to look at. */
function faceShape(cad: OcctKernel, face: ShapeHandle) {
  const { x, y, z } = cad.getSurfaceCenterOfMass(face);
  const box = cad.getBoundingBox(face);
  return { kind: cad.surfaceType(face), area: cad.getSurfaceArea(face), center: { x, y, z }, box: [box.xmin, box.ymin, box.zmin, box.xmax, box.ymax, box.zmax] };
}

// The box keeps apart faces that only share kind, area and middle, such as the bore and the hub of a spool.
function sameFaceShape(a: ReturnType<typeof faceShape>, b: ReturnType<typeof faceShape>) {
  return a.kind === b.kind && Math.abs(a.area - b.area) <= 1e-6 * Math.max(1, a.area) &&
    Math.hypot(a.center.x - b.center.x, a.center.y - b.center.y, a.center.z - b.center.z) <= 1e-4 &&
    a.box.every((value, index) => Math.abs(value - b.box[index]) <= 1e-4);
}

/**
 * The body without the given faces. Where the faces around them cannot close
 * the gap the kernel does not say so: it hands the body back as it was, or it
 * removes what it can and keeps the rest - a hole picked together with a face
 * that has to stay comes back filled, the other face rebuilt where it was. So
 * the result is accepted only when it is one valid solid and none of the
 * picked faces is still in it, as itself or as a face of the same kind, size
 * and place; otherwise the plain sentence is thrown and nothing changes.
 */
export function deleteFacesSolid(cad: OcctKernel, solid: ShapeHandle, faces: ShapeHandle[]) {
  if (faces.length === 0) throw new Error(DELETE_FACES_UNCHANGED_MESSAGE);
  const picked = faces.map((face) => faceShape(cad, face));
  let result: ShapeHandle;
  try {
    result = cad.defeature(solid, faces, DEFEATURE_TOLERANCE);
  } catch (error) {
    // A memory fault has to reach the worker, which restarts the kernel.
    if (error instanceof Error && isCadModifierWasmMemoryFault(error.message, error.name)) throw error;
    throw new Error(DELETE_FACES_UNCHANGED_MESSAGE);
  }
  const solids: ShapeHandle[] = [];
  let remaining: ShapeHandle[] = [];
  try {
    if (!cad.isSolid(result)) solids.push(...cad.getSubShapes(result, "solid"));
    const body = cad.isSolid(result) ? result : solids.length === 1 ? solids[0] : null;
    if (body === null || !shapeIsValid(cad, body)) throw new Error(DELETE_FACES_UNCHANGED_MESSAGE);
    remaining = cad.getSubShapes(body, "face");
    const left = remaining.map((face) => faceShape(cad, face));
    if (picked.some((face) => left.some((other) => sameFaceShape(face, other)))) throw new Error(DELETE_FACES_UNCHANGED_MESSAGE);
    releaseAll(cad, [...remaining, ...(body === result ? [] : [result]), ...solids.filter((other) => other !== body)]);
    return body;
  } catch (error) {
    releaseAll(cad, [...remaining, result, ...solids]);
    throw error;
  }
}

const round6 = (value: number) => Math.round(value * 1e6) / 1e6 || 0;

/**
 * The faces of a body, for the panel's check of the picked faces and the
 * MCP's face list, with each face's width and the faces it shares an edge
 * with, which say which thin faces go along when faces are deleted
 * (cadThinFaces).
 */
export function cadFaceList(cad: OcctKernel, solid: ShapeHandle): CadFaceInfo[] {
  const faces = cad.getSubShapes(solid, "face");
  try {
    // Each face's own edges, not the kernel's edge-to-face map: that one grows with the square of the faces.
    const facesByEdge = new Map<number, number[]>();
    const neighbours = faces.map(() => new Set<number>());
    faces.forEach((face, id) => {
      cad.subShapeHashes(face, "edge", HASH_UPPER_BOUND).forEach((hash) => {
        const others = facesByEdge.get(hash) ?? [];
        others.filter((other) => other !== id).forEach((other) => {
          neighbours[id].add(other);
          neighbours[other].add(id);
        });
        others.push(id);
        facesByEdge.set(hash, others);
      });
    });
    return faces.map((face, id) => {
      const kind = cad.surfaceType(face);
      const center = cad.getSurfaceCenterOfMass(face);
      const area = cad.getSurfaceArea(face);
      // getLength of a face is the length of its edges.
      const width = (2 * area) / cad.getLength(face);
      const info: CadFaceInfo = { id, kind, area, center: { x: center.x, y: center.y, z: center.z }, width, neighbours: [...neighbours[id]] };
      if (kind === "plane") {
        const normal = orientedFaceNormal(cad, face, center);
        info.normal = { x: round6(normal.x), y: round6(normal.y), z: round6(normal.z) };
      }
      return info;
    });
  } finally {
    releaseAll(cad, faces);
  }
}

/**
 * The body's tessellation for picking, with the face id (its place in
 * getSubShapes order) of every triangle.
 */
export function cadFaceTessellation(cad: OcctKernel, shape: ShapeHandle, options: { linearDeflection: number; angularDeflection: number }) {
  const mesh = cad.meshShape(shape, options);
  const faces = cad.getSubShapes(shape, "face");
  try {
    const hashes = faces.map((face) => cad.hashCode(face, HASH_UPPER_BOUND));
    return {
      positions: new Float32Array(mesh.positions),
      indices: new Uint32Array(mesh.indices),
      triangleFaces: cadTriangleFaces(mesh.faceGroups ?? [], hashes, mesh.triangleCount),
    };
  } finally {
    releaseAll(cad, faces);
  }
}
