import type { Mesh, OcctKernel, ShapeHandle } from "occt-wasm";
import type { CadModifierDeflection } from "@/lib/cadModifierTypes";
import { isCadModifierWasmMemoryFault } from "@/lib/cadModifierRuntime";

/**
 * Surface kinds the edge tool meshes with the looser angle of a small
 * treatment without checking: measured against the exact faces, their meshes
 * stayed within the chord limit with it wherever they did with the old angle
 * (fillets and chamfers on boxes, cylinders, cones, glyphs, the crescent and
 * the heart). Not measured to be so: a sphere of 10 mm radius strays 0.02 mm
 * at a 0.01 mm limit with either angle, and a lofted B-spline strayed
 * 0.032 mm with the old angle and 0.038 mm with the looser one at a 0.025 mm
 * limit - B-spline faces are too slow to project for a check on every
 * preview, and the glyph outlines this change is for stay within it.
 *
 * A torus is not on the list: across a fillet round a circular edge OCCT's
 * rows follow the angle, and a 0.1 mm fillet round a 6 mm cylinder strayed
 * 0.031 mm at a 0.01 mm limit - so torus faces, and any kind not listed, are
 * checked.
 */
export const UNCHECKED_SURFACE_TYPES: ReadonlySet<string> = new Set(["plane", "cylinder", "cone", "sphere", "bspline", "extrusion"]);

/**
 * A triangle's centroid is checked against this share of the chord limit.
 * Over 87 torus fillets (three qualities, cylinder radii 0.6 to 20 mm,
 * fillets 0.05 to 0.8 mm) the worst centroid was never below 0.86 of the
 * worst centroid or edge midpoint, so checking centroids at 0.75 catches
 * every mesh whose edges stray - at a quarter of the projections.
 */
const CENTROID_SHARE = 0.75;

type TessellateOptions = { linearDeflection: number; angularDeflection: number };

function optionsFor(deflection: CadModifierDeflection): TessellateOptions {
  return { linearDeflection: deflection.linear, angularDeflection: deflection.angular };
}

/** WebAssembly out of memory or trapped: the kernel is lost and must be restarted, so such an error is never caught here. */
function isWasmMemoryFault(error: unknown) {
  return isCadModifierWasmMemoryFault(error instanceof Error ? error.message : String(error ?? ""), error instanceof Error ? error.name : "");
}

function releaseAll(cad: OcctKernel, handles: ShapeHandle[]) {
  handles.forEach((handle) => {
    try {
      cad.release(handle);
    } catch {
      // A failed topology operation can invalidate temporary handles.
    }
  });
}

/**
 * Whether the mesh just stored on `shape` (by cad.tessellate with `options`)
 * strays from a face whose kind is not in UNCHECKED_SURFACE_TYPES: any
 * triangle centroid further than CENTROID_SHARE of the chord limit from its
 * own face.
 */
export function cadMeshStraysFromFaces(cad: OcctKernel, shape: ShapeHandle, options: TessellateOptions): boolean {
  const limit = options.linearDeflection * CENTROID_SHARE;
  const faces = cad.getSubShapes(shape, "face");
  try {
    for (const face of faces) {
      if (UNCHECKED_SURFACE_TYPES.has(cad.surfaceType(face))) continue;
      // The face keeps the triangulation the whole shape just got.
      const { positions, indices, triangleCount } = cad.tessellate(face, options);
      for (let triangle = 0; triangle < triangleCount; triangle += 1) {
        const a = indices[triangle * 3] * 3;
        const b = indices[triangle * 3 + 1] * 3;
        const c = indices[triangle * 3 + 2] * 3;
        const x = (positions[a] + positions[b] + positions[c]) / 3;
        const y = (positions[a + 1] + positions[b + 1] + positions[c + 1]) / 3;
        const z = (positions[a + 2] + positions[b + 2] + positions[c + 2]) / 3;
        const projected = cad.projectPointOnFace(face, { x, y, z });
        if (Math.hypot(projected.x - x, projected.y - y, projected.z - z) > limit) return true;
      }
    }
    return false;
  } finally {
    releaseAll(cad, faces);
  }
}

/**
 * The angle limits tried, one after the other, when even the angle every
 * treatment got before the loosening leaves a mesh that strays. A 0.5 mm
 * fillet round a 60 mm cylinder strays 0.124 mm at 0.16 (five times its
 * 0.025 mm chord limit - OCCT lets one triangle span most of the quarter
 * arc), 0.008 mm at 0.1 and 0.002 mm at 0.05. Each step costs triangles
 * (5,912, 8,564 and 32,756 for that body), so a step is only taken for a
 * mesh that still strays after the one before it.
 */
const TIGHTER_ANGLES = [0.1, 0.05];

/** A tighter angle is not taken when it would leave a body with more triangles than this. */
export const MAX_REFINED_TRIANGLES = 400_000;

type MeshedBody = { components: ShapeHandle[]; result: ShapeHandle; deflection: CadModifierDeflection; mesh: Mesh };

/** Fresh copies of the components (OCCT keeps a triangulation a shape already has, a copy has none), meshed with `deflection`. */
function meshCopies(cad: OcctKernel, components: ShapeHandle[], deflection: CadModifierDeflection): MeshedBody {
  const fresh: ShapeHandle[] = [];
  let freshResult: ShapeHandle | null = null;
  try {
    components.forEach((component) => fresh.push(cad.copy(component)));
    freshResult = fresh.length === 1 ? fresh[0] : cad.makeCompound(fresh);
    const mesh = cad.tessellate(freshResult, optionsFor(deflection));
    return { components: fresh, result: freshResult, deflection, mesh };
  } catch (error) {
    if (freshResult !== null && fresh.length > 1) releaseAll(cad, [freshResult]);
    releaseAll(cad, fresh);
    throw error;
  }
}

function releaseMeshed(cad: OcctKernel, body: MeshedBody) {
  if (body.components.length > 1) releaseAll(cad, [body.result]);
  releaseAll(cad, body.components);
}

/** Whether a mesh has an edge that is not shared by exactly two triangles, its corners compared as they are. */
export function cadMeshHasOpenEdges(mesh: Pick<Mesh, "positions" | "indices" | "triangleCount">): boolean {
  // Every face brings its own copies of the corners on its edges: one number per distinct point first.
  const pointIds = new Map<string, number>();
  const vertexPoint = new Int32Array(mesh.positions.length / 3);
  for (let vertex = 0; vertex < vertexPoint.length; vertex += 1) {
    const key = `${mesh.positions[vertex * 3]},${mesh.positions[vertex * 3 + 1]},${mesh.positions[vertex * 3 + 2]}`;
    let id = pointIds.get(key);
    if (id === undefined) {
      id = pointIds.size;
      pointIds.set(key, id);
    }
    vertexPoint[vertex] = id;
  }
  const points = pointIds.size;
  const uses = new Map<number, number>();
  for (let triangle = 0; triangle < mesh.triangleCount; triangle += 1) {
    for (let side = 0; side < 3; side += 1) {
      const a = vertexPoint[mesh.indices[triangle * 3 + side]];
      const b = vertexPoint[mesh.indices[triangle * 3 + ((side + 1) % 3)]];
      const key = a < b ? a * points + b : b * points + a;
      uses.set(key, (uses.get(key) ?? 0) + 1);
    }
  }
  for (const count of uses.values()) if (count !== 2) return true;
  return false;
}

/** How closely the faces are sewn together again; a looser sewing left the same gaps in #651. */
const RESEW_TOLERANCE = 1e-6;

/**
 * The components sewn together again from copies of their faces and meshed with `deflection`, or null when
 * that changes their volume or does not close the mesh either.
 */
function resewnCopies(cad: OcctKernel, components: ShapeHandle[], deflection: CadModifierDeflection): MeshedBody | null {
  const sewn: ShapeHandle[] = [];
  let sewnResult: ShapeHandle | null = null;
  try {
    for (const component of components) {
      const faces = cad.getSubShapes(component, "face");
      const copies: ShapeHandle[] = [];
      let solid: ShapeHandle;
      try {
        faces.forEach((face) => copies.push(cad.copy(face)));
        solid = cad.sewAndSolidify(copies, RESEW_TOLERANCE);
      } finally {
        // The copies too: the sewn solid holds its faces itself, the handles only took kernel memory.
        releaseAll(cad, [...faces, ...copies]);
      }
      sewn.push(solid);
      const before = cad.getVolume(component);
      if (!cad.isValid(solid) || Math.abs(cad.getVolume(solid) - before) > Math.max(1e-6, Math.abs(before) * 1e-7)) throw new Error("resewn body differs");
    }
    sewnResult = sewn.length === 1 ? sewn[0] : cad.makeCompound(sewn);
    const mesh = cad.tessellate(sewnResult, optionsFor(deflection));
    if (cadMeshHasOpenEdges(mesh)) throw new Error("resewn mesh still open");
    return { components: sewn, result: sewnResult, deflection, mesh };
  } catch (error) {
    if (sewnResult !== null && sewn.length > 1) releaseAll(cad, [sewnResult]);
    releaseAll(cad, sewn);
    // A kernel out of memory is restarted by the worker, not passed off as a mesh that stays open.
    if (isWasmMemoryFault(error)) throw error;
    return null;
  }
}

/**
 * A treated body whose mesh came out with gaps, meshed again from its faces sewn together anew (#651):
 * a 1 mm fillet at the corner of a pocket left the two faces along one fillet edge meshed each with its own
 * points, so the body showed hollow in the section view and the next cut stopped at "Not manifold". The
 * exact body was valid; sewing its faces again at a fine tolerance gave the same body with a closed mesh.
 * The body passed in is released when it is replaced; a mesh that stays open is kept as it was.
 */
function closedMeshBody(cad: OcctKernel, body: MeshedBody): MeshedBody {
  if (!cadMeshHasOpenEdges(body.mesh)) return body;
  const resewn = resewnCopies(cad, body.components, body.deflection);
  if (!resewn) return body;
  releaseMeshed(cad, body);
  return resewn;
}

/**
 * Meshes a treated body with `deflection` - unless the angle can still be
 * tightened to `capped` and the mesh strays from a checked face: then fresh
 * copies of the components are meshed with `capped`, which is what every
 * treatment got before the angle loosened. If that mesh still strays, the
 * angle is tightened further (TIGHTER_ANGLES) until it does not, as long as
 * the body stays under MAX_REFINED_TRIANGLES. The components passed in are
 * released when they are replaced; the caller owns whatever comes back.
 * A mesh with gaps is closed afterwards where sewing the faces again can (closedMeshBody).
 */
export function meshTreatedBody(cad: OcctKernel, components: ShapeHandle[], result: ShapeHandle, deflection: CadModifierDeflection, capped: CadModifierDeflection): MeshedBody {
  return closedMeshBody(cad, accurateMeshBody(cad, components, result, deflection, capped));
}

function accurateMeshBody(cad: OcctKernel, components: ShapeHandle[], result: ShapeHandle, deflection: CadModifierDeflection, capped: CadModifierDeflection): MeshedBody {
  const mesh = cad.tessellate(result, optionsFor(deflection));
  const kept = { components, result, deflection, mesh };
  if (!(capped.angular < deflection.angular)) return kept;
  const straysWith = (body: { result: ShapeHandle }, options: CadModifierDeflection) => {
    try {
      return cadMeshStraysFromFaces(cad, body.result, optionsFor(options));
    } catch (error) {
      if (isWasmMemoryFault(error)) throw error;
      // A face the check cannot measure counts as straying.
      return true;
    }
  };
  if (!straysWith(kept, deflection)) return kept;
  let current: MeshedBody | null = null;
  const angles = [capped.angular, ...TIGHTER_ANGLES.filter((angular) => angular < capped.angular)];
  for (const angular of angles) {
    let next: MeshedBody;
    try {
      next = meshCopies(cad, components, { linear: capped.linear, angular });
    } catch (error) {
      if (isWasmMemoryFault(error)) {
        if (current) releaseMeshed(cad, current);
        throw error;
      }
      // The treatment itself succeeded; keep the mesh it has rather than fail it.
      break;
    }
    if (current && next.mesh.triangleCount > MAX_REFINED_TRIANGLES) {
      releaseMeshed(cad, next);
      break;
    }
    if (current) releaseMeshed(cad, current);
    current = next;
    if (!straysWith(next, next.deflection)) break;
  }
  if (!current) return kept;
  if (components.length > 1) releaseAll(cad, [result]);
  releaseAll(cad, components);
  return current;
}
