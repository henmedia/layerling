/// <reference lib="webworker" />

import { cadHasSolidBody } from "@/lib/cadSolidBody";
import { cadFaultyEdgeIds } from "@/lib/cadFaultyEdges";
import { OcctKernel, type OcctModuleFactory, type ShapeHandle } from "occt-wasm";
import { assertCadKernelRunnable } from "@/lib/wasmSupport";
import { CANNOT_OFFSET_MESSAGE, offsetSolid, orientedFaceNormal, shellSolid } from "@/lib/cadShell";
import { chamfilletSolid } from "@/lib/cadChamfillet";
import { cadFaceList, cadFaceTessellation, DELETE_FACES_UNCHANGED_MESSAGE, deleteFacesSolid } from "@/lib/cadDeleteFaces";
import type { CadModifierComponentMesh, CadModifierDeflection, CadModifierDisplayEdge, CadModifierEdge, CadModifierFaces, CadModifierMeshPart, CadModifierPrimitivePart, CadModifierProfilePart, CadModifierWorkerRequest, CadModifierWorkerResponse } from "@/lib/cadModifierTypes";
import { cadProfileSolidMismatch, profileExtrusionSolid } from "@/lib/cadProfileSolid";
import { importedStepBody } from "@/lib/cadImportedStep";
import { threadPartSolid } from "@/lib/threadSolid";
import { springPartSolid } from "@/lib/springSolid";
import { gridfinityPartSolid } from "@/lib/gridfinitySolid";
import { fuzzyCut, tidiedIfValid } from "@/lib/cadFuzzyCut";
import { helicalGearPartSolid } from "@/lib/gearSolid";
import { meshTreatedBody } from "@/lib/cadMeshAccuracy";
import { planarMeshFaces } from "@/lib/cadPlanarMesh";
import { cadFlatFaceMeshStraysFromOutline } from "@/lib/cadFaceOutline";
import { buildMessage } from "@/lib/buildStamp";
import { CAD_MODIFIER_KERNEL_RESTART_MESSAGE, CAD_MODIFIER_RUNTIME_BASE, VARIABLE_FILLET_ONE_EDGE_MESSAGE, cadModifierCappedDeflection, cadModifierTessellationDeflection, cadModifierTopologyEdgeIsSelectable, applyCadTransform, isCadModifierKernelExhausted, isCadModifierWasmMemoryFault } from "@/lib/cadModifierRuntime";

const HASH_UPPER_BOUND = 2_147_483_647;
const CAD_EDGE_WIREFRAME_DEFLECTION = 0.035;
const CAD_DISPLAY_EDGE_MIN_ANGLE = 0.75;
const CURVED_SURFACE_TYPES = new Set(["cylinder", "cone", "sphere", "torus", "bspline", "bezier", "offset", "revolution", "extrusion"]);
let kernelPromise: Promise<OcctKernel> | null = null;
let baseShape: ShapeHandle | null = null;
let baseSolids: ShapeHandle[] = [];
let edgeHandles: ShapeHandle[] = [];
let edgeOwners: number[] = [];
let faceHandles: ShapeHandle[] = [];
let faceOwners: number[] = [];

type CollectedCadEdgeGeometry = Omit<CadModifierEdge, "display" | "selectable"> & {
  curveType: string;
  surfaceTypes: string[];
  faceAreas: number[];
};
type CollectedCadEdge = CollectedCadEdgeGeometry & Pick<CadModifierEdge, "display" | "selectable">;

// The first thing the page hears: which build this worker is from (lib/buildStamp.ts).
self.postMessage(buildMessage());

function post(message: CadModifierWorkerResponse, transfer: Transferable[] = []) {
  self.postMessage(message, { transfer });
}

function kernel() {
  // Without WebAssembly SIMD the kernel cannot even compile; say so instead of failing inside it (#350).
  assertCadKernelRunnable();
  const moduleUrl = `${CAD_MODIFIER_RUNTIME_BASE}/occt-wasm.js`;
  // Drop a rejected attempt so a transient failure (e.g. a network blip
  // fetching the 22 MB wasm) can be retried on the next call instead of
  // poisoning edge treatment for the rest of the session - same fix as
  // brepKernel.ts's loadBrepWithOcct.
  kernelPromise ??= import(/* webpackIgnore: true */ moduleUrl).then((imported: { default: OcctModuleFactory }) => OcctKernel.init({
    createModule: imported.default,
    wasm: `${CAD_MODIFIER_RUNTIME_BASE}/occt-wasm.wasm`,
  })).catch((error) => {
    kernelPromise = null;
    throw error;
  });
  return kernelPromise;
}

function releaseSession(cad: OcctKernel) {
  try {
    cad.releaseAll();
  } catch {
    // The arena may already be empty after an operation failure.
  }
  baseShape = null;
  baseSolids = [];
  edgeHandles = [];
  edgeOwners = [];
  faceHandles = [];
  faceOwners = [];
}

function cadShapeIsValid(cad: OcctKernel, shape: ShapeHandle) {
  const validator = (cad as { isValid?: unknown }).isValid;
  if (typeof validator !== "function") throw new Error("isValid is not a function");
  try {
    return Boolean(validator.call(cad, shape));
  } catch {
    return false;
  }
}


/**
 * The BREP a treated body is stored as, without the mesh the display was cut from: on a body whose
 * faces the mesh stands off, the kernel's validity check counts the mesh too, and the stored body
 * then restores as "not valid" for the next treatment (a widened text's rim, #215). A copy of the
 * shape leaves the mesh behind; the stored text is also half the size.
 */
function storedBrep(cad: OcctKernel, shape: ShapeHandle) {
  const bare = cad.copy(shape);
  try {
    return cad.toBREP(bare);
  } finally {
    cad.release(bare);
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

type FaceFacts = {
  byHash: Map<number, ShapeHandle>;
  surfaceType: (hash: number) => string;
  /** A flat face points the same way all over: its normal is found once (a mesh body is nothing but flat faces). */
  planeNormals: Map<number, { x: number; y: number; z: number }>;
};

function faceNormalAt(cad: OcctKernel, faces: FaceFacts, hash: number, face: ShapeHandle, point: { x: number; y: number; z: number }) {
  const known = faces.planeNormals.get(hash);
  if (known) return known;
  const normal = orientedFaceNormal(cad, face, point);
  if (faces.surfaceType(hash) === "plane") faces.planeNormals.set(hash, normal);
  return normal;
}

function edgeAngle(cad: OcctKernel, points: number[], faceHashes: number[], faces: FaceFacts) {
  if (faceHashes.length !== 2 || points.length < 6) return { angle: 0, boundary: faceHashes.length < 2, manifold: false };
  const offset = Math.max(0, Math.floor(points.length / 6) * 3);
  const point = { x: points[offset], y: points[offset + 1], z: points[offset + 2] };
  const faceA = faces.byHash.get(faceHashes[0]);
  const faceB = faces.byHash.get(faceHashes[1]);
  if (faceA === undefined || faceB === undefined) return { angle: 0, boundary: false, manifold: false };
  try {
    const a = faceNormalAt(cad, faces, faceHashes[0], faceA, point);
    const b = faceNormalAt(cad, faces, faceHashes[1], faceB, point);
    const dot = Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y + a.z * b.z));
    // Both normals point out of the solid, so this is the turn across the edge:
    // 0 on a smooth seam, 90 on a box corner, near 180 on a knife edge.
    const angle = (Math.acos(dot) * 180) / Math.PI;
    return { angle, boundary: false, manifold: true };
  } catch {
    return { angle: 0, boundary: false, manifold: false };
  }
}

function meshPartToAsciiStl(part: CadModifierMeshPart) {
  if (!part.positions || !part.indices) throw new Error("The selected object has no mesh data");
  const lines = new Array<string>(part.indices.length / 3 + 2);
  lines[0] = "solid layerling";
  const { positions, indices } = part;
  for (let offset = 0, face = 1; offset + 2 < indices.length; offset += 3, face += 1) {
    const ai = indices[offset] * 3;
    const bi = indices[offset + 1] * 3;
    const ci = indices[offset + 2] * 3;
    const ax = positions[ai];
    const ay = positions[ai + 1];
    const az = positions[ai + 2];
    const bx = positions[bi];
    const by = positions[bi + 1];
    const bz = positions[bi + 2];
    const cx = positions[ci];
    const cy = positions[ci + 1];
    const cz = positions[ci + 2];
    const abx = bx - ax;
    const aby = by - ay;
    const abz = bz - az;
    const acx = cx - ax;
    const acy = cy - ay;
    const acz = cz - az;
    let nx = aby * acz - abz * acy;
    let ny = abz * acx - abx * acz;
    let nz = abx * acy - aby * acx;
    const length = Math.hypot(nx, ny, nz) || 1;
    nx /= length;
    ny /= length;
    nz /= length;
    lines[face] = `facet normal ${nx} ${ny} ${nz}\n outer loop\n  vertex ${ax} ${ay} ${az}\n  vertex ${bx} ${by} ${bz}\n  vertex ${cx} ${cy} ${cz}\n endloop\nendfacet`;
  }
  lines[lines.length - 1] = "endsolid layerling";
  return lines.join("\n");
}

const ROTATE_Z_TO_Y: number[] = [
  1, 0, 0, 0,
  0, 0, 1, 0,
  0, -1, 0, 0,
];

function reconstructPrimitiveSolid(cad: OcctKernel, primitive: CadModifierPrimitivePart) {
  let solid: ShapeHandle;
  if (primitive.kind === "box") {
    const width = primitive.width;
    const depth = primitive.depth;
    const height = primitive.height;
    if (![width, depth, height].every((value) => Number.isFinite(value) && value > 0)) {
      throw new Error("The selected primitive has invalid dimensions");
    }
    solid = cad.makeBoxFromCorners(
      { x: -width / 2, y: 0, z: -depth / 2 },
      { x: width / 2, y: height, z: depth / 2 },
    );
  } else if (primitive.kind === "cylinder") {
    const radius = primitive.radius;
    const height = primitive.height;
    if (![radius, height].every((value) => Number.isFinite(value) && value > 0)) {
      throw new Error("The selected primitive has invalid dimensions");
    }
    const raw = cad.makeCylinder(radius, height);
    solid = cad.transform(raw, ROTATE_Z_TO_Y);
    cad.release(raw);
  } else if (primitive.kind === "cone") {
    const baseRadius = primitive.baseRadius;
    const topRadius = primitive.topRadius;
    const height = primitive.height;
    if (![baseRadius, topRadius, height].every(Number.isFinite) || baseRadius <= 0 || topRadius < 0 || height <= 0) {
      throw new Error("The selected primitive has invalid dimensions");
    }
    const raw = cad.makeCone(baseRadius, topRadius, height);
    solid = cad.transform(raw, ROTATE_Z_TO_Y);
    cad.release(raw);
  } else if (primitive.kind === "sphere") {
    const radius = primitive.radius;
    if (!Number.isFinite(radius) || radius <= 0) {
      throw new Error("The selected primitive has invalid dimensions");
    }
    solid = cad.makeSphere(radius);
  } else if (primitive.kind === "torus") {
    const majorRadius = primitive.majorRadius;
    const minorRadius = primitive.minorRadius;
    if (![majorRadius, minorRadius].every(Number.isFinite) || majorRadius <= 0 || minorRadius <= 0) {
      throw new Error("The selected primitive has invalid dimensions");
    }
    const raw = cad.makeTorus(majorRadius, minorRadius);
    solid = cad.transform(raw, ROTATE_Z_TO_Y);
    cad.release(raw);
  } else {
    throw new Error(`Unsupported CAD primitive: ${(primitive as { kind: string }).kind}`);
  }

  const transformed = applyCadTransform(cad, solid, primitive.transform);
  if (!cad.isSolid(transformed) || !cadShapeIsValid(cad, transformed)) {
    throw new Error("The selected primitive could not be prepared as a valid CAD solid");
  }
  return transformed;
}

/**
 * Only a memory fault leaves the kernel unfit for another attempt. Everything
 * else the exact path can throw - an OCCT error, even a raw
 * WebAssembly.Exception - still leaves the mesh path to try; if that runs out
 * of room too, the handler below restarts the kernel exactly as before.
 */
function isFatalKernelFault(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const name = error instanceof Error ? error.name : "";
  return isCadModifierWasmMemoryFault(message, name);
}

/** Exact profile and STEP bodies the current prepare attempt has actually used. */
let exactProfileBodiesUsed = 0;

function reconstructProfileSolid(cad: OcctKernel, profile: CadModifierProfilePart) {
  const local = profileExtrusionSolid(cad, profile);
  let placed = applyCadTransform(cad, local, profile.transform);
  if (profile.grow && (!cad.isSolid(placed) || !cadShapeIsValid(cad, placed))) {
    // A widened text's walls are moved outlines: standing somewhere other than the origin can tip
    // the kernel's validity check, and its own repair closes that - kept where the volume stays.
    const volume = cad.getVolume(placed);
    const repaired = cad.fixShape(placed);
    const solids = cad.isSolid(repaired) ? [repaired] : cad.getSubShapes(repaired, "solid");
    if (solids.length === 1 && cadShapeIsValid(cad, solids[0]) && Math.abs(cad.getVolume(solids[0]) - volume) <= 1e-4 * Math.abs(volume)) placed = solids[0];
  }
  if (!cad.isSolid(placed) || !cadShapeIsValid(cad, placed)) throw new Error("The exact profile body is not a valid solid after placing it");
  const mismatch = cadProfileSolidMismatch(cad, placed, profile.expected);
  if (mismatch) throw new Error(`The exact profile body does not match the shape (${mismatch})`);
  return placed;
}

/** A stored exact body placed by its transform, healed if it has to be; throws unless it is a valid solid. */
function restoredExactSolid(cad: OcctKernel, stored: ShapeHandle, transform: number[] | undefined) {
  // Eine Verschiebung oder Drehung ist eine starre Bewegung; die gehoert in
  // transform. generalTransform baut analytische Flaechen in Splines um - das
  // ist teuer, ungenauer, und der Kernel nimmt es uebel.
  let exact = applyCadTransform(cad, stored, transform);
  const restoredSolids = cad.getSubShapes(exact, "solid");
  if (cadShapeIsValid(cad, exact) && (cad.isSolid(exact) || restoredSolids.length > 0)) {
    return restoredSolids.length === 1 ? restoredSolids[0] : exact;
  }
  exact = cad.fixShape(exact);
  exact = cad.fixFaceOrientations(exact);
  if (cad.isSolid(exact)) exact = cad.healSolid(exact, 1e-5);
  const healedSolids = cad.getSubShapes(exact, "solid");
  if (cadShapeIsValid(cad, exact) && (cad.isSolid(exact) || healedSolids.length > 0)) {
    return healedSolids.length === 1 ? healedSolids[0] : exact;
  }
  throw new Error("The stored CAD feature could not be restored as a valid solid");
}

function reconstructSolid(cad: OcctKernel, part: CadModifierMeshPart) {
  if (part.primitive) {
    return reconstructPrimitiveSolid(cad, part.primitive);
  }
  if (part.profile) {
    try {
      const solid = reconstructProfileSolid(cad, part.profile);
      exactProfileBodiesUsed += 1;
      return solid;
    } catch (error) {
      // Without its mesh (too dense to send) there is nothing to fall back on;
      // with it, the part goes the way it always went.
      if (isFatalKernelFault(error)) throw error;
      if (!part.positions || !part.indices) {
        const reason = error instanceof Error ? error.message : String(error ?? "");
        throw new Error(`This shape could not be rebuilt as an exact CAD body, and its mesh is too dense for edge treatment. ${reason}`.trim());
      }
    }
  }
  if (part.thread) {
    try {
      const placed = applyCadTransform(cad, threadPartSolid(cad, part.thread), part.thread.transform);
      if (!cadShapeIsValid(cad, placed)) throw new Error("The exact thread body is not valid after placing it");
      const mismatch = cadProfileSolidMismatch(cad, placed, part.thread.expected);
      if (mismatch) throw new Error(`The exact thread body does not match the shape (${mismatch})`);
      exactProfileBodiesUsed += 1;
      return placed;
    } catch (error) {
      // As for a profile: with its mesh along, the part goes the way it always went.
      if (isFatalKernelFault(error)) throw error;
      if (!part.positions || !part.indices) {
        const reason = error instanceof Error ? error.message : String(error ?? "");
        throw new Error(`This thread could not be built as an exact body, and its mesh is too dense for edge treatment. ${reason}`.trim());
      }
    }
  }
  if (part.spring) {
    try {
      const placed = applyCadTransform(cad, springPartSolid(cad, part.spring), part.spring.transform);
      if (!cadShapeIsValid(cad, placed)) throw new Error("The exact spring body is not valid after placing it");
      const mismatch = cadProfileSolidMismatch(cad, placed, part.spring.expected);
      if (mismatch) throw new Error(`The exact spring body does not match the shape (${mismatch})`);
      exactProfileBodiesUsed += 1;
      return placed;
    } catch (error) {
      // As for a profile: with its mesh along, the part goes the way it always went.
      if (isFatalKernelFault(error)) throw error;
      if (!part.positions || !part.indices) {
        const reason = error instanceof Error ? error.message : String(error ?? "");
        throw new Error(`This spring could not be built as an exact body, and its mesh is too dense for edge treatment. ${reason}`.trim());
      }
    }
  }
  if (part.helicalGear) {
    try {
      const placed = applyCadTransform(cad, helicalGearPartSolid(cad, part.helicalGear), part.helicalGear.transform);
      if (!cadShapeIsValid(cad, placed)) throw new Error("The exact gear body is not valid after placing it");
      const mismatch = cadProfileSolidMismatch(cad, placed, part.helicalGear.expected);
      if (mismatch) throw new Error(`The exact gear body does not match the shape (${mismatch})`);
      exactProfileBodiesUsed += 1;
      return placed;
    } catch (error) {
      // As for a profile: with its mesh along, the part goes the way it always went.
      if (isFatalKernelFault(error)) throw error;
      if (!part.positions || !part.indices) {
        const reason = error instanceof Error ? error.message : String(error ?? "");
        throw new Error(`This gear could not be built as an exact body, and its mesh is too dense for edge treatment. ${reason}`.trim());
      }
    }
  }
  if (part.gridfinity) {
    try {
      const placed = applyCadTransform(cad, gridfinityPartSolid(cad, part.gridfinity), part.gridfinity.transform);
      if (!cadShapeIsValid(cad, placed)) throw new Error("The exact Gridfinity body is not valid after placing it");
      const mismatch = cadProfileSolidMismatch(cad, placed, part.gridfinity.expected);
      if (mismatch) throw new Error(`The exact Gridfinity body does not match the shape (${mismatch})`);
      exactProfileBodiesUsed += 1;
      return placed;
    } catch (error) {
      // As for a profile: with its mesh along, the part goes the way it always went.
      if (isFatalKernelFault(error)) throw error;
      if (!part.positions || !part.indices) {
        const reason = error instanceof Error ? error.message : String(error ?? "");
        throw new Error(`This Gridfinity part could not be built as an exact body, and its mesh is too dense for edge treatment. ${reason}`.trim());
      }
    }
  }
  if (part.step) {
    try {
      const restored = restoredExactSolid(cad, importedStepBody(cad, part.step), part.brepTransform);
      const mismatch = cadProfileSolidMismatch(cad, restored, part.expected);
      if (mismatch) throw new Error(`The imported STEP body does not match the shape (${mismatch})`);
      exactProfileBodiesUsed += 1;
      return restored;
    } catch (error) {
      // As for a profile: with its mesh along, the part goes the way it always went.
      if (isFatalKernelFault(error)) throw error;
      if (!part.positions || !part.indices) {
        const reason = error instanceof Error ? error.message : String(error ?? "");
        throw new Error(`This imported STEP body could not be restored for edge treatment, and its mesh is too dense to use instead. ${reason}`.trim());
      }
    }
  }
  if (part.brep) {
    return restoredExactSolid(cad, cad.fromBREP(part.brep), part.brepTransform);
  }
  return reconstructMeshSolid(cad, part);
}

/** Meshes of more triangles than this are curved bodies: no use looking for flat faces in them. */
const PLANAR_FACE_TRIANGLE_LIMIT = 6000;

/**
 * The solid of a mesh part. Triangles of one flat face are flat only to float32 accuracy, so the
 * kernel can leave such a face in pieces, and a fillet or chamfer next to the seams fails (#248).
 * When the plain way gives more faces than the mesh has flat ones, the flat faces are built whole
 * and sewn instead; whatever goes wrong there leaves the plain result.
 */
function reconstructMeshSolid(cad: OcctKernel, part: CadModifierMeshPart) {
  const key = meshSolidKey(part);
  const kept = key === null ? undefined : meshSolids.get(key);
  if (key !== null && kept !== undefined) {
    try {
      const restored = cad.fromBREP(kept);
      if (cad.isSolid(restored) && cadShapeIsValid(cad, restored)) return restored;
    } catch (error) {
      if (isFatalKernelFault(error)) throw error;
    }
    meshSolids.delete(key);
  }
  const solid = rebuiltMeshSolid(cad, part);
  if (key !== null) {
    try {
      meshSolids.set(key, storedBrep(cad, solid));
      while (meshSolids.size > MESH_SOLID_KEPT) meshSolids.delete(meshSolids.keys().next().value as string);
    } catch (error) {
      if (isFatalKernelFault(error)) throw error;
    }
  }
  return solid;
}

/**
 * A mesh that was turned into a solid once is turned into one again when the same group is prepared again (the tool
 * cancelled and started anew, Undo and back): sewing a few thousand triangles takes seconds, so the solid is kept as
 * its BREP for the next time (forum: a pocket in a filleted body took 21 seconds each time).
 */
const MESH_SOLID_KEPT = 4;
const meshSolids = new Map<string, string>();

/** What identifies a mesh part: its own triangles, however they got there. Null when the part carries no mesh. */
function meshSolidKey(part: CadModifierMeshPart) {
  if (!part.positions || !part.indices) return null;
  const bits = new Uint32Array(new Float32Array(part.positions).buffer);
  let first = 0x811c9dc5;
  let second = 0x9747b28c;
  for (let index = 0; index < bits.length; index += 1) {
    first = Math.imul(first ^ bits[index], 0x01000193);
    second = Math.imul(second ^ bits[index], 0x85ebca6b);
  }
  for (let index = 0; index < part.indices.length; index += 1) {
    first = Math.imul(first ^ part.indices[index], 0x01000193);
    second = Math.imul(second ^ part.indices[index], 0x85ebca6b);
  }
  return `${part.positions.length}:${part.indices.length}:${(first >>> 0).toString(36)}${(second >>> 0).toString(36)}`;
}

function rebuiltMeshSolid(cad: OcctKernel, part: CadModifierMeshPart) {
  let plain: ShapeHandle | null = null;
  let plainError: unknown = null;
  try {
    plain = plainMeshSolid(cad, part);
  } catch (error) {
    if (isFatalKernelFault(error)) throw error;
    plainError = error;
  }
  if (part.positions && part.indices && part.indices.length / 3 <= PLANAR_FACE_TRIANGLE_LIMIT) {
    try {
      const flat = planarMeshFaces(cad, part.positions, part.indices);
      // The face counts are handles too: counted and let go, the session keeps only the solid it goes on with.
      const plainFaces = flat && plain !== null ? faceCount(cad, plain) : 0;
      if (flat && (plain === null || plainFaces > flat.faceCount)) {
        try {
          for (const tolerance of [1e-6, 1e-5, 1e-4]) {
            let candidate = cad.sewAndSolidify(flat.faces, tolerance);
            candidate = cad.fixShape(candidate);
            if (cad.isSolid(candidate)) candidate = cad.healSolid(candidate, tolerance);
            candidate = cad.fixFaceOrientations(candidate);
            candidate = cad.removeDegenerateEdges(candidate);
            candidate = cad.unifySameDomain(candidate);
            if (cad.isSolid(candidate) && cadShapeIsValid(cad, candidate) && (plain === null || faceCount(cad, candidate) < plainFaces)) {
              if (plain !== null) releaseHandles(cad, [plain]);
              return candidate;
            }
            releaseHandles(cad, [candidate]);
          }
        } finally {
          releaseHandles(cad, flat.faces);
        }
      } else if (flat) {
        releaseHandles(cad, flat.faces);
      }
    } catch (error) {
      if (isFatalKernelFault(error)) throw error;
      // The plain solid stays.
    }
  }
  if (plain !== null) return plain;
  throw plainError;
}

function faceCount(cad: OcctKernel, shape: ShapeHandle) {
  const faces = cad.getSubShapes(shape, "face");
  releaseHandles(cad, faces);
  return faces.length;
}

function plainMeshSolid(cad: OcctKernel, part: CadModifierMeshPart) {
  const imported = cad.importStl(meshPartToAsciiStl(part));
  let shape = cad.fixShape(imported);
  if (cad.isSolid(shape)) {
    try {
      shape = cad.healSolid(shape, 1e-4);
      shape = cad.fixFaceOrientations(shape);
      shape = cad.removeDegenerateEdges(shape);
      shape = cad.unifySameDomain(shape);
    } catch {
      // Fall through to face sewing when the imported solid cannot be healed directly.
    }
    if (cad.isSolid(shape) && cadShapeIsValid(cad, shape)) return shape;
  }

  const faces = cad.getSubShapes(imported, "face");
  if (faces.length === 0) throw new Error("The selected object has no closed faces");
  for (const tolerance of [1e-5, 1e-4, 1e-3, 1e-2]) {
    try {
      let candidate = cad.sewAndSolidify(faces, tolerance);
      candidate = cad.fixShape(candidate);
      if (cad.isSolid(candidate)) candidate = cad.healSolid(candidate, tolerance);
      candidate = cad.fixFaceOrientations(candidate);
      candidate = cad.removeDegenerateEdges(candidate);
      candidate = cad.unifySameDomain(candidate);
      if (cad.isSolid(candidate) && cadShapeIsValid(cad, candidate)) return candidate;
      // A mesh of several loose pieces (a group of holes, two bodies grouped side by side) sews to one
      // shell per piece, which is no single solid; each piece becomes a solid and they are joined (#394).
      const joined = joinedShellSolids(cad, candidate);
      if (joined) return joined;
    } catch {
      // Try the next tolerance. Curved tessellations can need looser vertex sewing.
    }
  }
  throw new Error("The selected mesh is open or non-manifold. Repair it before adding edge treatments.");
}

/**
 * The solids of a sewn mesh that came out as several closed shells, fused into one body. Null when
 * there is only one shell or one of them is not closed - then the mesh really is open.
 */
function joinedShellSolids(cad: OcctKernel, sewn: ShapeHandle) {
  const shells = cad.isShell(sewn) ? [sewn] : cad.getSubShapes(sewn, "shell");
  if (shells.length < 2) return null;
  const solids: ShapeHandle[] = [];
  for (const shell of shells) {
    let solid = cad.makeSolid(shell);
    if (!(cad.getVolume(solid) > 0)) solid = cad.makeSolid(cad.reverseShape(shell));
    if (!(cad.getVolume(solid) > 0) || !cadShapeIsValid(cad, solid)) return null;
    solids.push(solid);
  }
  let joined = solids[0];
  for (let index = 1; index < solids.length; index += 1) {
    joined = cad.fuse(joined, solids[index]);
  }
  joined = cad.unifySameDomain(cad.simplify(joined));
  return cad.getSubShapes(joined, "solid").length > 0 && cadShapeIsValid(cad, joined) ? joined : null;
}

/**
 * The solids and holes of one level of the group, the parts of the groups inside it that mix solids and holes
 * first built on their own (#996): such a group's holes cut only its own solids, not the neighbours it was
 * grouped with afterwards.
 */
function combinedScope(cad: OcctKernel, parts: CadModifierMeshPart[], depth: number): ShapeHandle | null {
  const here = parts.filter((part) => (part.scope?.length ?? 0) === depth);
  const inner = new Map<number, CadModifierMeshPart[]>();
  for (const part of parts) {
    if ((part.scope?.length ?? 0) <= depth) continue;
    const key = (part.scope as number[])[depth];
    inner.set(key, [...(inner.get(key) ?? []), part]);
  }
  const solids = [
    ...here.filter((part) => !part.hole).map((part) => reconstructSolid(cad, part)),
    ...[...inner.values()].flatMap((nested) => combinedScope(cad, nested, depth + 1) ?? []),
  ];
  const holes = here.filter((part) => part.hole).map((part) => reconstructSolid(cad, part));
  if (solids.length === 0) return null;
  let result = solids[0];
  for (let index = 1; index < solids.length; index += 1) {
    result = cad.fuse(result, solids[index]);
    result = cad.simplify(result);
    result = cad.unifySameDomain(result);
  }
  for (const hole of holes) {
    result = tidiedIfValid(cad, fuzzyCut(cad, result, hole), cadShapeIsValid);
  }
  return result;
}

function reconstructParts(cad: OcctKernel, parts: CadModifierMeshPart[]) {
  const combined = combinedScope(cad, parts, 0);
  if (combined === null) throw new Error("The group has no solid body to modify");
  let result: ShapeHandle;
  // The repair runs on a copy: ShapeFix also rewrites the sub-shapes it
  // shares with its input, so a body it breaks would be broken for the
  // fallback below as well.
  result = cad.fixShape(cad.copy(combined));
  result = cad.simplify(result);
  result = cad.unifySameDomain(result);
  if (!cadShapeIsValid(cad, result) && cadShapeIsValid(cad, combined)) {
    // The repair can break a body that was valid to begin with: a filleted
    // text (several glyph solids with curved fillets) comes back from its
    // stored BREP valid, and fixShape turns it invalid, so a second edge
    // treatment on it failed. Keep the body as it was.
    try {
      const untouched = cad.unifySameDomain(cad.simplify(combined));
      result = cadShapeIsValid(cad, untouched) ? untouched : combined;
    } catch {
      result = combined;
    }
  }
  if (!cadShapeIsValid(cad, result)) throw new Error("The grouped solid could not be repaired into valid topology");
  return result;
}

/**
 * Exact profile bodies (and STEP imports' own bodies) first; if the group
 * cannot be combined from them, the whole group again from the display meshes - the way it was built before
 * exact profiles existed - as long as an exact body was in play and every
 * profile part brought its mesh. Called right after releaseSession, so the
 * failed attempt's handles are all that is in the arena and can go.
 */
function reconstructPartsWithFallback(cad: OcctKernel, parts: CadModifierMeshPart[]) {
  exactProfileBodiesUsed = 0;
  try {
    return reconstructParts(cad, parts);
  } catch (error) {
    const exactParts = parts.filter((part) => part.profile || part.step || part.thread || part.spring || part.helicalGear || part.gridfinity);
    if (
      isFatalKernelFault(error) ||
      exactProfileBodiesUsed === 0 ||
      exactParts.some((part) => !part.positions || !part.indices)
    ) throw error;
    releaseSession(cad);
    return reconstructParts(cad, parts.map((part) => (part.profile || part.step || part.thread || part.spring || part.helicalGear || part.gridfinity ? { ...part, profile: undefined, step: undefined, thread: undefined, spring: undefined, helicalGear: undefined, gridfinity: undefined } : part)));
  }
}

function isDisplayCadEdge(edge: CollectedCadEdgeGeometry) {
  if (!edge.manifold || edge.boundary || edge.points.length < 6) return false;
  const effectiveAngle = Math.min(edge.angle, 180 - edge.angle);
  const touchesCurvedSurface = edge.surfaceTypes.some((surfaceType) => CURVED_SURFACE_TYPES.has(surfaceType));
  const isCurvedEdge = edge.curveType !== "line";
  return effectiveAngle + 1e-3 >= CAD_DISPLAY_EDGE_MIN_ANGLE || touchesCurvedSurface || isCurvedEdge;
}

function treatmentDetailFaceAreaLimit(faceAreas: number[]) {
  const finiteAreas = faceAreas.filter((area) => Number.isFinite(area) && area > 1e-8);
  if (finiteAreas.length === 0) return 0;
  return Math.max(1e-8, Math.max(...finiteAreas) * 0.3);
}

function touchesTreatmentDetailFace(edge: CollectedCadEdgeGeometry, areaLimit: number) {
  return areaLimit > 0 && edge.faceAreas.some((area) => area > 0 && area <= areaLimit);
}

function isModifierDisplayCadEdge(edge: CollectedCadEdgeGeometry, treatmentAreaLimit: number) {
  return isDisplayCadEdge(edge) && !touchesTreatmentDetailFace(edge, treatmentAreaLimit);
}

function releaseHandles(cad: OcctKernel, handles: ShapeHandle[]) {
  handles.forEach((handle) => {
    try {
      cad.release(handle);
    } catch {
      // A failed topology operation can invalidate temporary handles.
    }
  });
}

function collectEdges(cad: OcctKernel, shape: ShapeHandle, sharpAngle: number, suppressTreatmentDetailEdges = false, retainEdgeHandles = false) {
  const handles = cad.getSubShapes(shape, "edge");
  const faces = cad.getSubShapes(shape, "face");
  let keepEdgeHandles = false;
  try {
    const faceByHash = new Map(faces.map((face) => [cad.hashCode(face, HASH_UPPER_BOUND), face]));
    // The areas only matter when small treatment faces are left out; each one is a surface integral.
    const faceAreaByHash = new Map<number, number>();
    if (suppressTreatmentDetailEdges) {
      faceByHash.forEach((face, hash) => {
        let area = 0;
        try {
          area = Math.abs(cad.getSurfaceArea(face));
        } catch {
          area = 0;
        }
        faceAreaByHash.set(hash, area);
      });
    }
    const treatmentAreaLimit = suppressTreatmentDetailEdges ? treatmentDetailFaceAreaLimit([...faceAreaByHash.values()]) : 0;
    const surfaceTypeByHash = new Map<number, string>();
    const faceFacts: FaceFacts = {
      byHash: faceByHash,
      planeNormals: new Map(),
      surfaceType: (hash) => {
        let type = surfaceTypeByHash.get(hash);
        if (type === undefined) {
          const face = faceByHash.get(hash);
          try {
            type = face === undefined ? "unknown" : cad.surfaceType(face);
          } catch {
            type = "unknown";
          }
          surfaceTypeByHash.set(hash, type);
        }
        return type;
      },
    };
    const adjacentFaces = parseEdgeFaceMap(cad.edgeToFaceMap(shape, HASH_UPPER_BOUND));
    const wire = cad.wireframe(shape, CAD_EDGE_WIREFRAME_DEFLECTION);
    const pointsByHash = new Map<number, number[]>();
    for (let index = 0; index + 2 < wire.edgeGroups.length; index += 3) {
      const start = wire.edgeGroups[index];
      const count = wire.edgeGroups[index + 1];
      const hash = wire.edgeGroups[index + 2];
      if (!pointsByHash.has(hash)) pointsByHash.set(hash, Array.from(wire.points.slice(start, start + count)));
    }

    const collectedEdges = handles.map((handle, id) => {
      const hash = cad.hashCode(handle, HASH_UPPER_BOUND);
      const faceHashes = adjacentFaces.get(hash) ?? [];
      const points = pointsByHash.get(hash) ?? [];
      const classification = edgeAngle(cad, points, faceHashes, faceFacts);
      const faceAreas = faceHashes.map((faceHash) => faceAreaByHash.get(faceHash) ?? 0);
      const surfaceTypes = faceHashes.filter((faceHash) => faceByHash.has(faceHash)).map(faceFacts.surfaceType);
      let curveType = "line";
      try {
        curveType = cad.curveType(handle);
      } catch {
        curveType = "unknown";
      }
      return { id, points, ...classification, curveType, surfaceTypes, faceAreas };
    }).filter((edge) => edge.points.length >= 6);
    const edges: CollectedCadEdge[] = collectedEdges.map((edge) => {
      const display = treatmentAreaLimit > 0 ? isModifierDisplayCadEdge(edge, treatmentAreaLimit) : isDisplayCadEdge(edge);
      return {
        ...edge,
        display,
        selectable: cadModifierTopologyEdgeIsSelectable(edge),
      };
    });
    const selectableEdgeIds = edges.filter((edge) => edge.selectable && edge.angle + 1e-3 >= sharpAngle).map((edge) => edge.id);
    const displayEdges = cadDisplayEdgesFromCollected(edges);
    keepEdgeHandles = retainEdgeHandles;
    return { handles, edges: edges.map(({ curveType: _curveType, surfaceTypes: _surfaceTypes, faceAreas: _faceAreas, ...edge }) => edge), selectableEdgeIds, displayEdges };
  } finally {
    releaseHandles(cad, faces);
    if (!keepEdgeHandles) releaseHandles(cad, handles);
  }
}

function cadDisplayEdgesFromCollected(edges: CollectedCadEdge[]): CadModifierDisplayEdge[] {
  return edges
    .filter((edge) => edge.display)
    .map((edge) => ({ points: edge.points }));
}

function tessellationOptions(deflection: CadModifierDeflection) {
  return { linearDeflection: deflection.linear, angularDeflection: deflection.angular };
}

function copyCadMesh(mesh: { positions: Float32Array; normals: Float32Array; indices: Uint32Array; triangleCount: number }) {
  return {
    positions: new Float32Array(mesh.positions),
    normals: new Float32Array(mesh.normals),
    indices: new Uint32Array(mesh.indices),
    triangleCount: mesh.triangleCount,
  };
}

function isImportStlWasmFault(message: string) {
  return /importStl:.*WebAssembly\.Exception/i.test(message);
}

function isMissingValidatorFault(message: string) {
  return /isValid/i.test(message) && /null|not a function|undefined/i.test(message);
}

function verwirfKernel(cad: OcctKernel | null) {
  // Nur die Verweise fallenzulassen reicht nicht: der alte Kernel haelt seinen
  // eigenen WebAssembly-Speicher fest, und daneben ist fuer einen zweiten kein
  // Platz. occt-wasm bietet dafuer Symbol.dispose an.
  try {
    (cad as unknown as { [key: symbol]: (() => void) | undefined })?.[Symbol.dispose]?.();
  } catch {
    // Ein Kernel, der schon nicht mehr antwortet, laesst sich auch nicht mehr abbauen.
  }
  kernelPromise = null;
  baseShape = null;
  baseSolids = [];
  edgeHandles = [];
  edgeOwners = [];
  faceHandles = [];
  faceOwners = [];
}

// Testing each edge alone costs one kernel call per edge, on a heavy body a
// second or more each. Past this budget the whole component is reported
// instead, so a refusal never comes near the preview's 30 s watchdog.
const CULPRIT_SEARCH_BUDGET_MS = 1500;

class EdgeTreatmentError extends Error {
  constructor(message: string, readonly failedEdgeIds: number[]) {
    super(message);
  }
}

function treatEdges(cad: OcctKernel, solid: ShapeHandle, edges: ShapeHandle[], request: Extract<CadModifierWorkerRequest, { type: "preview" }>) {
  // A variable fillet (#687) runs from `amount` at the edge's start to `endAmount` at its end; the kernel takes one edge.
  if (request.kind === "fillet" && request.endAmount !== undefined) {
    return cad.filletVariable(solid, edges[0], request.amount, request.endAmount);
  }
  if (request.kind === "fillet") return cad.fillet(solid, edges, request.amount);
  if (request.kind === "chamfillet") return chamfilletSolid(cad, solid, edges, request.amount, request.chamferAngle);
  return Math.abs(request.chamferAngle - 45) < 0.001
    ? cad.chamfer(solid, edges, request.amount)
    : cad.chamferDistAngle(solid, edges, request.amount, request.chamferAngle);
}

function failsAlone(cad: OcctKernel, solid: ShapeHandle, edge: ShapeHandle, request: Extract<CadModifierWorkerRequest, { type: "preview" }>) {
  try {
    const single = treatEdges(cad, solid, [edge], request);
    const solidLeft = cadHasSolidBody(cad, single);
    releaseHandles(cad, [single]);
    return !solidLeft;
  } catch (error) {
    if (isFatalKernelFault(error)) throw error;
    return true;
  }
}

// The edges that fail on their own are the ones to blame; when every edge works
// alone, it is the combination. The kernel may name the edges whose contour
// failed: when each of those fails alone, they are the answer and the other
// edges need no test. When one of them works alone, every edge is tried.
function culpritEdgeIds(cad: OcctKernel, solid: ShapeHandle, entries: { id: number; edge: ShapeHandle }[], request: Extract<CadModifierWorkerRequest, { type: "preview" }>, error: unknown) {
  const all = entries.map((entry) => entry.id);
  if (entries.length <= 1 || request.addedEdgeIds?.length) return all;
  const deadline = performance.now() + CULPRIT_SEARCH_BUDGET_MS;
  const named = new Set(cadFaultyEdgeIds(error, entries));
  const tried = new Map<number, boolean>();
  for (const entry of entries) {
    if (!named.has(entry.id)) continue;
    if (performance.now() > deadline) return all;
    tried.set(entry.id, failsAlone(cad, solid, entry.edge, request));
  }
  if (tried.size && [...tried.values()].every(Boolean)) return [...tried.keys()];
  const failing: number[] = [];
  for (const entry of entries) {
    if (performance.now() > deadline) return all;
    if (tried.get(entry.id) ?? failsAlone(cad, solid, entry.edge, request)) failing.push(entry.id);
  }
  return failing.length ? failing : all;
}

// Which solid of the body each edge or face belongs to, found by hash and isSame.
function componentOwners(cad: OcctKernel, handles: ShapeHandle[], type: "edge" | "face", unmappedMessage: string) {
  // One solid owns everything there is.
  if (baseSolids.length === 1) return new Array<number>(handles.length).fill(0);
  const ownerHandles = baseSolids.map((solid) => cad.getSubShapes(solid, type));
  try {
    const ownerCandidates = new Map<number, Array<{ owner: number; handle: ShapeHandle }>>();
    ownerHandles.forEach((componentHandles, owner) => {
      componentHandles.forEach((handle) => {
        const hash = cad.hashCode(handle, HASH_UPPER_BOUND);
        const candidates = ownerCandidates.get(hash) ?? [];
        candidates.push({ owner, handle });
        ownerCandidates.set(hash, candidates);
      });
    });
    return handles.map((handle) => {
      const hash = cad.hashCode(handle, HASH_UPPER_BOUND);
      const candidates = ownerCandidates.get(hash) ?? [];
      const exact = candidates.find((candidate) => cad.isSame(handle, candidate.handle));
      if (!exact) throw new Error(unmappedMessage);
      return exact.owner;
    });
  } finally {
    ownerHandles.forEach((componentHandles) => releaseHandles(cad, componentHandles));
  }
}

async function bearbeiteAnfrage(request: CadModifierWorkerRequest, halter: { cad: OcctKernel | null }) {
  const cad = await kernel();
  halter.cad = cad;
  const activeCad = cad;
  if (request.type === "dispose") {
    releaseSession(activeCad);
    post({ type: "disposed", requestId: request.requestId });
    return;
  }
  if (request.type === "prepare") {
    releaseSession(activeCad);
    baseShape = reconstructPartsWithFallback(activeCad, request.parts);
    const collected = collectEdges(activeCad, baseShape, request.sharpAngle, Boolean(request.suppressTreatmentDetailEdges), true);
    edgeHandles = collected.handles;
    baseSolids = activeCad.isSolid(baseShape) ? [baseShape] : activeCad.getSubShapes(baseShape, "solid");
    if (baseSolids.length === 0) throw new Error("The selected group contains no closed solid components");
    edgeOwners = componentOwners(activeCad, edgeHandles, "edge", "A CAD edge could not be mapped to its solid component; restart the edge tool");
    let faces: CadModifierFaces | undefined;
    if (request.faces) {
      faceHandles = activeCad.getSubShapes(baseShape, "face");
      faceOwners = componentOwners(activeCad, faceHandles, "face", "A CAD face could not be mapped to its solid component; restart the tool");
      faces = {
        list: cadFaceList(activeCad, baseShape).map((face) => ({ ...face, owner: faceOwners[face.id] ?? 0 })),
        ...(request.faceMesh ? { mesh: cadFaceTessellation(activeCad, baseShape, tessellationOptions(cadModifierTessellationDeflection("standard", 1))) } : {}),
      };
    }
    post({
      type: "ready",
      requestId: request.requestId,
      edges: collected.edges.map((edge) => ({ ...edge, owner: edgeOwners[edge.id] ?? 0 })),
      selectableEdgeIds: collected.selectableEdgeIds,
      sourceType: activeCad.getShapeType(baseShape),
      ...(faces ? { faces } : {}),
    }, faces?.mesh ? [faces.mesh.positions.buffer, faces.mesh.indices.buffer, faces.mesh.triangleFaces.buffer] : []);
    return;
  }
  if (baseShape === null) throw new Error("Prepare an object before previewing the modifier");
  const selected = request.edgeIds.map((id) => ({ id, edge: edgeHandles[id], owner: edgeOwners[id] })).filter((entry): entry is { id: number; edge: ShapeHandle; owner: number } => entry.edge !== undefined);
  const selectedFaces = request.kind === "deleteFace"
    ? (request.faceIds ?? []).map((id) => ({ id, face: faceHandles[id], owner: faceOwners[id] })).filter((entry): entry is { id: number; face: ShapeHandle; owner: number } => entry.face !== undefined)
    : [];
  if (request.kind === "deleteFace" && selectedFaces.length === 0) throw new Error("Select at least one face");
  if (selected.length === 0 && request.kind !== "shell" && request.kind !== "deleteFace" && request.kind !== "offset") throw new Error("Select at least one highlighted edge");
  if (request.kind === "fillet" && request.endAmount !== undefined && selected.length !== 1) throw new Error(VARIABLE_FILLET_ONE_EDGE_MESSAGE);
  const componentResults: ShapeHandle[] = [];
  let result: ShapeHandle | null = null;
  try {
    for (let owner = 0; owner < baseSolids.length; owner += 1) {
      const solid = baseSolids[owner];
      const componentEntries = selected.filter((entry) => entry.owner === owner);
      const componentEdges = componentEntries.map((entry) => entry.edge);
      let component: ShapeHandle;
      if (request.kind === "shell") {
        component = shellSolid(activeCad, solid, request.amount, request.shellOpenings ?? "none", request.shellEdges);
      } else if (request.kind === "offset") {
        component = offsetSolid(activeCad, solid, request.amount, request.offsetShrink === true, request.shellEdges);
      } else if (request.kind === "deleteFace") {
        const componentFaces = selectedFaces.filter((entry) => entry.owner === owner).map((entry) => entry.face);
        component = componentFaces.length ? deleteFacesSolid(activeCad, solid, componentFaces) : activeCad.copy(solid);
      } else if (componentEdges.length === 0) {
        component = activeCad.copy(solid);
      } else {
        try {
          component = treatEdges(activeCad, solid, componentEdges, request);
        } catch (error) {
          if (isFatalKernelFault(error)) throw error;
          const rawMessage = error instanceof Error ? error.message : String(error ?? "");
          throw new EdgeTreatmentError(rawMessage, culpritEdgeIds(activeCad, solid, componentEntries, request, error));
        }
      }
      if (request.kind !== "shell" && componentEdges.length > 0 && !cadHasSolidBody(activeCad, component)) {
        // Past a certain size the kernel returns a "valid" compound without any
        // solid in it (and a volume that grew): not a body to go on with.
        releaseHandles(activeCad, [component]);
        throw new Error("The chosen size does not leave a closed solid");
      }
      componentResults.push(component);
    }
    result = componentResults.length === 1 ? componentResults[0] : activeCad.makeCompound(componentResults);
    if (!cadShapeIsValid(activeCad, result)) throw new Error(request.kind === "deleteFace" ? DELETE_FACES_UNCHANGED_MESSAGE : "The chosen size creates invalid or overlapping edge geometry");
    // A fillet round a part of the outline thinner than the size can leave a "valid" body whose flat face is meshed over
    // a bay outside its outline, a strip nobody drew (#740): that size is refused like one that crosses adjacent faces.
    if ((request.kind === "fillet" || request.kind === "chamfer") && cadFlatFaceMeshStraysFromOutline(activeCad, result)) {
      throw new Error("The chosen size creates invalid or overlapping edge geometry");
    }
    const baseLoose = cadModifierTessellationDeflection(request.quality, Math.min(request.amount, request.endAmount ?? request.amount), request.minDeflection);
    const baseCapped = cadModifierCappedDeflection(request.quality, baseLoose);
    const loose = request.kind === "chamfillet"
      ? { linear: Math.min(baseLoose.linear * 0.25, 0.0025), angular: Math.min(baseCapped.angular * 0.2, 0.028) }
      : baseLoose;
    const capped = request.kind === "chamfillet" ? loose : baseCapped;
    const meshed = meshTreatedBody(activeCad, [...componentResults], result, loose, capped);
    // The body may have been replaced by fresh copies, meshed with the old angle.
    componentResults.splice(0, componentResults.length, ...meshed.components);
    result = meshed.result;
    const deflection = meshed.deflection;
    const options = tessellationOptions(deflection);
    const mesh = copyCadMesh(meshed.mesh);
    const displayEdges = collectEdges(activeCad, result, 0).displayEdges;
    const brep = storedBrep(activeCad, result);
    // One component is the body itself: its mesh, BREP and edges are the ones just made, copied
    // rather than worked out a second time (the buffers above go to the page, so these need their own).
    const components: CadModifierComponentMesh[] = componentResults.length === 1 ? [{
      owner: 0,
      positions: mesh.positions.slice(),
      normals: mesh.normals.slice(),
      indices: mesh.indices.slice(),
      triangleCount: mesh.triangleCount,
      brep,
      displayEdges,
    }] : componentResults.map((component, owner) => {
      const componentMesh = copyCadMesh(activeCad.tessellate(component, options));
      return {
        owner,
        positions: componentMesh.positions,
        normals: componentMesh.normals,
        indices: componentMesh.indices,
        triangleCount: componentMesh.triangleCount,
        brep: storedBrep(activeCad, component),
        displayEdges: collectEdges(activeCad, component, 0).displayEdges,
      };
    });
    post(
      { type: "preview", requestId: request.requestId, positions: mesh.positions, normals: mesh.normals, indices: mesh.indices, triangleCount: mesh.triangleCount, brep, displayEdges, components, deflection },
      [
        mesh.positions.buffer,
        mesh.normals.buffer,
        mesh.indices.buffer,
        ...components.flatMap((component) => [component.positions.buffer, component.normals.buffer, component.indices.buffer]),
      ],
    );
  } finally {
    componentResults.forEach((component) => activeCad.release(component));
    if (result !== null && componentResults.length > 1) activeCad.release(result);
  }
}

self.onmessage = async (event: MessageEvent<CadModifierWorkerRequest>) => {
  const request = event.data;
  const halter: { cad: OcctKernel | null } = { cad: null };
  let error: unknown = null;
  try {
    await bearbeiteAnfrage(request, halter);
    return;
  } catch (ersterFehler) {
    error = ersterFehler;
  }

  if (request.type === "prepare" && isCadModifierKernelExhausted(
    error instanceof Error ? error.message : String(error ?? ""),
    error instanceof Error ? error.name : "",
  )) {
    // Ein neuer Kernel in derselben Aufgabe scheitert genauso - der alte haelt
    // seinen Speicher noch. Deshalb nur abbauen und melden: der naechste Anlauf
    // bekommt einen frischen und kommt durch.
    verwirfKernel(halter.cad);
    post({
      type: "error",
      requestId: request.requestId,
      message: CAD_MODIFIER_KERNEL_RESTART_MESSAGE,
      resetSession: true,
    });
    return;
  }

  const rawMessage = error instanceof Error ? error.message : String(error ?? "");
  const errorName = error instanceof Error ? error.name : "";
  if (isCadModifierWasmMemoryFault(rawMessage, errorName) || isImportStlWasmFault(rawMessage) || isMissingValidatorFault(rawMessage)) {
    if (halter.cad) releaseSession(halter.cad);
    kernelPromise = null;
    const message = isImportStlWasmFault(rawMessage)
      ? "The selected mesh could not be converted into a closed CAD solid. The CAD kernel reset; try Separate Parts, ungrouping, or simplifying the object before adding edge features."
      : isMissingValidatorFault(rawMessage)
        ? "The CAD kernel exposed an incomplete validation function and reset. Start the edge tool again; no page refresh is needed."
      : "The CAD kernel hit a memory fault and reset. Start the edge tool again; no page refresh is needed.";
    post({
      type: "error",
      requestId: request.requestId,
      message,
      resetSession: true,
    });
    return;
  }
  const kernelRefused = request.type === "preview" && (rawMessage.includes("WebAssembly.Exception") || rawMessage.includes("fillet:") || rawMessage.includes("chamfer:") || rawMessage.includes("chamferDistAngle:"));
  const message = kernelRefused
    ? request.kind === "deleteFace"
      ? DELETE_FACES_UNCHANGED_MESSAGE
      : request.kind === "offset"
        ? CANNOT_OFFSET_MESSAGE
      : request.kind === "shell"
        ? "The walls cannot be this thick for this body. Choose a thinner wall."
        : `The selected edges cannot be ${request.kind === "fillet" ? "filleted" : "chamfered"} together at this size. Reduce the size or select fewer connected edges.`
    : rawMessage || "The CAD kernel could not complete this edge treatment";
  if (request.type === "prepare" && halter.cad) releaseSession(halter.cad);
  const failedEdgeIds = kernelRefused && error instanceof EdgeTreatmentError ? error.failedEdgeIds : undefined;
  post({ type: "error", requestId: request.requestId, message, ...(failedEdgeIds ? { failedEdgeIds } : {}) });
};

export {};
