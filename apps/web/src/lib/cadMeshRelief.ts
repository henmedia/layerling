import { cadModifierBaseDeflection, cadModifierCappedDeflection } from "@/lib/cadModifierRuntime";
import { sketchCadDeflection, sketchRevolveCadDeflection } from "@/lib/sketchCadDeflection";
import type { CadModifierDeflection } from "@/lib/cadModifierTypes";
import type { EditorHistoryEntry } from "@/lib/editorHistory";
import type { WorkplaneShape } from "@/types/layerling";

/**
 * Bodies an old Chamfillet meshed far finer than any print needs, lightened when a design is opened (Discussion #1042).
 *
 * Until 1.131.1 a Chamfillet cut its body with a chord of 0.0025 mm and an angle of 0.028 rad, whatever the quality,
 * and the body kept that as the floor for every edge treatment after it: a star 31 mm across with a 1 mm Chamfillet
 * and a fillet came to 195,263 triangles, 6,923 at the fillet's own fineness. Dean's design of 50 such bodies was
 * 139 MB, took minutes to open and seconds to select. Nothing else meshes that fine - the finest quality stops at
 * 0.005 mm - so a body below that has the old Chamfillet's mesh. It is cut again from its exact body (its BREP), at
 * the fineness its edge treatments ask for in standard quality, the same in every step of the undo history.
 */
export const OVER_FINE_LINEAR_DEFLECTION = 0.005;

/** What the kernel gives back for a body meshed again: its triangles where the exact body lies. */
export type RemeshedCadBody = { positions: Float32Array; normals: Float32Array; indices: Uint32Array; deflection: CadModifierDeflection };

export type RemeshCadBrep = (brep: string, deflection: CadModifierDeflection, capped: CadModifierDeflection) => Promise<RemeshedCadBody | null>;

/** How far the new mesh's outline may lie from the old one's, in mm: the facets of the coarser mesh lie within 0.05 mm of the body. */
const OUTLINE_TOLERANCE = 0.2;

export function hasOverFineCadMesh(shape: WorkplaneShape) {
  const linear = shape.cadMeshDeflection?.linear;
  return Boolean(shape.cadBrep && shape.importedMesh && typeof linear === "number" && linear < OVER_FINE_LINEAR_DEFLECTION);
}

/**
 * The fineness a body's edge treatments ask for in standard quality, each at its own size, as the edge tool works it
 * out (cadModifierTessellationDeflection), with a floor from the sketch it was drawn from and from any body before
 * that was not over-fine itself.
 */
export function relievedCadDeflection(shape: WorkplaneShape): CadModifierDeflection {
  let linear = Number.POSITIVE_INFINITY;
  let angular = Number.POSITIVE_INFINITY;
  const fold = (deflection: CadModifierDeflection | undefined) => {
    if (!deflection || !(deflection.linear >= OVER_FINE_LINEAR_DEFLECTION)) return;
    linear = Math.min(linear, deflection.linear);
    angular = Math.min(angular, deflection.angular);
  };
  shape.edgeTreatmentHistory?.forEach((entry) => {
    const { kind, amount, endAmount } = entry.feature;
    if (kind === "fillet" || kind === "chamfer" || kind === "chamfillet") fold(cadModifierBaseDeflection("standard", Math.min(amount, endAmount ?? amount)));
    fold(entry.before.cadMeshDeflection);
  });
  if (shape.sketchProfile) fold(shape.sketchRevolve ? sketchRevolveCadDeflection(shape.sketchProfile, shape.sketchRevolve.smoothness) : sketchCadDeflection(shape.sketchProfile));
  if (!Number.isFinite(linear)) return cadModifierBaseDeflection("standard", 1);
  return { linear, angular };
}

function bounds(positions: ArrayLike<number>) {
  const min = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY];
  const max = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY];
  for (let index = 0; index + 2 < positions.length; index += 3) {
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], positions[index + axis]);
      max[axis] = Math.max(max[axis], positions[index + axis]);
    }
  }
  return { min, max };
}

/**
 * The new mesh in the body's own frame, as shapeFromCadMesh lays it out: one triangle after the other, about the
 * frame's middle and bottom. Null when its outline does not match the old mesh's, so a body whose exact body lies
 * in another frame keeps the mesh it has.
 */
export function relievedImportedMesh(shape: WorkplaneShape, body: RemeshedCadBody): WorkplaneShape["importedMesh"] | null {
  const frame = shape.cadBrepFrame;
  const old = shape.importedMesh;
  if (!frame || frame.sourceTransform || !old || body.indices.length < 3) return null;
  const positions: number[] = [];
  const normals: number[] = [];
  for (let index = 0; index < body.indices.length; index += 1) {
    const vertex = body.indices[index] * 3;
    positions.push(body.positions[vertex] - frame.x, body.positions[vertex + 1] - frame.elevation, body.positions[vertex + 2] - frame.z);
    if (body.normals.length >= vertex + 3) normals.push(body.normals[vertex], body.normals[vertex + 1], body.normals[vertex + 2]);
  }
  const fresh = bounds(positions);
  const before = bounds(old.positions);
  for (let axis = 0; axis < 3; axis += 1) {
    if (!(Math.abs(fresh.min[axis] - before.min[axis]) <= OUTLINE_TOLERANCE && Math.abs(fresh.max[axis] - before.max[axis]) <= OUTLINE_TOLERANCE)) return null;
  }
  return {
    positions,
    normals: normals.length === positions.length ? normals : undefined,
    baseWidth: fresh.max[0] - fresh.min[0],
    baseHeight: fresh.max[1] - fresh.min[1],
    baseDepth: fresh.max[2] - fresh.min[2],
    triangleCount: Math.floor(body.indices.length / 3),
    sourceFormat: old.sourceFormat,
  };
}

type Relievable = { shapes: WorkplaneShape[]; history?: EditorHistoryEntry[] };

/**
 * Every over-fine body of a design meshed again, in its shapes, its groups, the bodies its edge treatments started
 * from and every step of its history; each exact body only once. Gives the design back as it was when there is none.
 */
export async function relieveOverFineCadMeshes<T extends Relievable>(project: T, remesh: RemeshCadBrep): Promise<{ project: T; relieved: number }> {
  const found = new Map<string, WorkplaneShape>();
  const visit = (shape: WorkplaneShape) => {
    if (hasOverFineCadMesh(shape)) {
      const key = shape.cadBrep as string;
      if (!found.has(key)) found.set(key, shape);
    }
    shape.groupedShapes?.forEach(visit);
    shape.edgeTreatmentHistory?.forEach((entry) => visit(entry.before));
  };
  project.shapes.forEach(visit);
  project.history?.forEach((entry) => entry.shapes.forEach(visit));
  if (found.size === 0) return { project, relieved: 0 };

  const meshes = new Map<string, { body: RemeshedCadBody; deflection: CadModifierDeflection }>();
  for (const [brep, shape] of found) {
    const deflection = relievedCadDeflection(shape);
    try {
      const body = await remesh(brep, deflection, cadModifierCappedDeflection("standard", deflection));
      if (body) meshes.set(brep, { body, deflection: body.deflection });
    } catch {
      // The body keeps its fine mesh; it still opens as before.
    }
  }
  if (meshes.size === 0) return { project, relieved: 0 };

  let relieved = 0;
  const done = new Map<WorkplaneShape, WorkplaneShape>();
  const sameMesh = new Map<object, WorkplaneShape["importedMesh"] | null>();
  const relieve = (shape: WorkplaneShape): WorkplaneShape => {
    const known = done.get(shape);
    if (known) return known;
    let next = shape;
    const meshed = hasOverFineCadMesh(shape) ? meshes.get(shape.cadBrep as string) : undefined;
    if (meshed && shape.importedMesh) {
      // Steps of the history share one mesh: it is laid out once.
      let mesh = sameMesh.get(shape.importedMesh);
      if (mesh === undefined) {
        mesh = relievedImportedMesh(shape, meshed.body);
        sameMesh.set(shape.importedMesh, mesh);
        if (mesh) relieved += 1;
      }
      if (mesh) next = { ...next, importedMesh: mesh, cadMeshDeflection: meshed.deflection };
    }
    const groupedShapes = shape.groupedShapes?.map(relieve);
    if (groupedShapes && groupedShapes.some((child, index) => child !== shape.groupedShapes?.[index])) next = { ...next, groupedShapes };
    const edgeTreatmentHistory = shape.edgeTreatmentHistory?.map((entry) => {
      const before = relieve(entry.before);
      return before === entry.before ? entry : { ...entry, before };
    });
    if (edgeTreatmentHistory && edgeTreatmentHistory.some((entry, index) => entry !== shape.edgeTreatmentHistory?.[index])) next = { ...next, edgeTreatmentHistory };
    done.set(shape, next);
    return next;
  };
  const shapes = project.shapes.map(relieve);
  const history = project.history?.map((entry) => {
    const entryShapes = entry.shapes.map(relieve);
    return entryShapes.some((shape, index) => shape !== entry.shapes[index]) ? { ...entry, shapes: entryShapes } : entry;
  });
  if (relieved === 0) return { project, relieved: 0 };
  return { project: { ...project, shapes, ...(history ? { history } : {}) }, relieved };
}
