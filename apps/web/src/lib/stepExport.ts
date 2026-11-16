import type { OcctKernel, ShapeHandle } from "occt-wasm";
import type { WorkplaneShape } from "@/types/layerling";
import { shapeDepth, shapeHasShapeDeform, shapeWidth } from "@/lib/workplaneShapes";
import { cadBrepTransformForShape } from "@/lib/cadBakeMetadata";
import { dropOcctKernel, loadBrepWithOcct, occtKernel, type Brep, type BrepSolid } from "@/lib/brepKernel";
import { asDesignedRound, cadModifierEnclosureForShape, cadModifierGridfinityForShape, cadModifierHelicalGearForShape, cadModifierHirthForShape, cadModifierProfileForShape, cadModifierSpringForShape, cadModifierThreadForShape, textGlyphProfiles } from "@/lib/cadProfileExtrusion";
import { threadPartSolid } from "@/lib/threadSolid";
import { springPartSolid } from "@/lib/springSolid";
import { helicalGearPartSolid } from "@/lib/gearSolid";
import { gridfinityPartSolid } from "@/lib/gridfinitySolid";
import { hirthPartSolid } from "@/lib/hirthSolid";
import { enclosurePartSolid } from "@/lib/enclosureSolid";
import { profileExtrusionSolid } from "@/lib/cadProfileSolid";
import { applyCadTransform, isCadModifierWasmMemoryFault } from "@/lib/cadModifierRuntime";
import { hingeWorldParts } from "@/lib/hingeParts";
import { restoreGroupedChildren } from "@/lib/editorBooleans";
import { groupShowsPartColors } from "@/lib/groupColors";
import { meshForShape } from "@/lib/editorMeshCore";
import { shapeDrillPointAngle, shapeDrillPointLength } from "@/lib/drillPoint";
import { exactMeshFreeformShare, exactSolidFromMesh } from "@/lib/cadMeshExact";

/**
 * Why a body did not go into the STEP file, in a word the editor can say in the user's language
 * (#184): a twist has no exact form yet, a mesh has no CAD source, a hole was left out, or the
 * kernel could not build it.
 */
export type SkipCode = "twist" | "deform" | "mesh" | "freeform" | "meshFailed" | "oval" | "hole" | "holeCut" | "failed" | "noExact";

export type SkippedShape = {
  name: string;
  kind: WorkplaneShape["kind"];
  /** The technical reason, for the console and bug reports. */
  reason: string;
  code: SkipCode;
};

export type StepExportResult = {
  blob: Blob;
  exportedCount: number;
  skipped: SkippedShape[];
};

/**
 * Nichts im Entwurf laesst sich als B-Rep schreiben - keine Stoerung, sondern
 * eine Aussage ueber den Inhalt. Als eigener Fehlertyp, damit die Oberflaeche
 * dafuer einen erklaerenden Satz in der Sprache des Benutzers zeigen kann
 * statt der englischen Zeile aus dieser Datei.
 */
export class StepExportEmptyError extends Error {
  constructor() {
    super("No exportable B-Rep solids in this design");
    this.name = "StepExportEmptyError";
  }
}

// Only primitives that OCCT can represent as exact analytic surfaces under a
// rigid placement are mapped to B-Rep. Everything else (swept/tessellated
// shapes) is reported as skipped rather than faceted into a low-fidelity STEP.
//
// Cones are exact: the multi-solid STEP writer that used to drop a cone's lateral
// CONICAL_SURFACE was fixed upstream in occt-wasm 3.6.1 (verified end-to-end —
// cone keeps its full surface and volume in a multi-solid assembly).
const EXACT_KINDS: ReadonlySet<WorkplaneShape["kind"]> = new Set(["box", "cylinder", "sphere", "cone"]);
const SIZE_EPS = 0.0005;

function unsupportedReason(): string {
  return "no exact B-Rep mapping";
}

/**
 * Woher die genaue Geometrie eines Koerpers kommt.
 *
 * - `primitive`: aus Breite, Tiefe, Hoehe neu gebaut - exakt und billig.
 * - `imported`: die STEP-Quelle, mit der er hereingekommen ist.
 * - `profile`: ein Umriss, der hochgezogen oder gedreht wird (Stern, Herz,
 *   Ellipse, Rohr, Halbkugel, Bohrungen ...) - derselbe exakte Koerper, den das
 *   Kantenwerkzeug bekommt.
 * - `baked`: das B-Rep, das der CAD-Dienst bei einer Kantenbearbeitung
 *   abgelegt hat. Ohne diesen Fall fiel jeder verrundete Koerper heraus: Er
 *   ist danach kein Quader mehr, sondern ein Netz, und ein Netz kann STEP
 *   nicht tragen - obwohl die exakte Form die ganze Zeit danebenlag.
 */
export type StepSource = "primitive" | "imported" | "baked" | "profile" | "thread" | "spring" | "helicalGear" | "gridfinity" | "hirth" | "enclosure" | "unsupported";

function hasExactProfile(shape: WorkplaneShape) {
  try {
    return cadModifierProfileForShape(asDesignedRound(shape), { designedRound: true }) !== null;
  } catch {
    return false;
  }
}

function hasExactThread(shape: WorkplaneShape) {
  try {
    return cadModifierThreadForShape(shape) !== null;
  } catch {
    return false;
  }
}

function hasExactSpring(shape: WorkplaneShape) {
  try {
    return cadModifierSpringForShape(shape) !== null;
  } catch {
    return false;
  }
}

function hasExactHelicalGear(shape: WorkplaneShape) {
  try {
    return cadModifierHelicalGearForShape(shape, { anySize: true }) !== null;
  } catch {
    return false;
  }
}

function hasExactHirth(shape: WorkplaneShape) {
  try {
    return cadModifierHirthForShape(shape) !== null;
  } catch {
    return false;
  }
}

function hasExactEnclosure(shape: WorkplaneShape) {
  try {
    return cadModifierEnclosureForShape(shape) !== null;
  } catch {
    return false;
  }
}

function hasExactGridfinity(shape: WorkplaneShape) {
  try {
    return cadModifierGridfinityForShape(shape) !== null;
  } catch {
    return false;
  }
}

export function stepSourceForShape(shape: WorkplaneShape): StepSource {
  // A taper or lean is no part of the primitives: the box would go out as a
  // plain box. A tapered, leaning or twisted prism goes out as its loft. A
  // stored or imported B-Rep never holds one: an edge treatment bakes the
  // deformation in and clears it, so one set after that only bends the mesh,
  // and the B-Rep would go out as it was before (#1237).
  if (shapeHasShapeDeform(shape)) {
    if (shape.cadBrep || shape.importedMesh) return "unsupported";
    return hasExactProfile(shape) ? "profile" : "unsupported";
  }
  if (shape.kind === "mesh" && shape.importedMesh?.brepStep) return "imported";
  const oval = (shape.kind === "cylinder" || shape.kind === "cone") && Math.abs(shapeWidth(shape) - shapeDepth(shape)) >= SIZE_EPS;
  // A drilled hole (Discussion #621) is no plain cylinder: it goes out turned from its section, the drill point with it.
  const drilled = shapeDrillPointAngle(shape) !== undefined;
  if (EXACT_KINDS.has(shape.kind) && !oval && !drilled) return "primitive";
  if (shape.cadBrep) return "baked";
  if (hasExactProfile(shape)) return "profile";
  if (hasExactThread(shape)) return "thread";
  if (hasExactSpring(shape)) return "spring";
  if (hasExactHelicalGear(shape)) return "helicalGear";
  if (hasExactGridfinity(shape)) return "gridfinity";
  if (hasExactHirth(shape)) return "hirth";
  if (hasExactEnclosure(shape)) return "enclosure";
  // An oval cylinder or cone without a profile: the builder says why it is skipped.
  if (EXACT_KINDS.has(shape.kind)) return "primitive";
  return "unsupported";
}

// Layerling composes rotation as a THREE Euler in "XYZ" order, so the world
// matrix is Rx·Ry·Rz. Re-applying the same rotations about world axes through
// the origin (Z, then Y, then X) reproduces that product before the shape is
// translated off-origin. Circular cylinders/cones ignore yaw, matching the
// editor's meshYawDegrees so the exported diameter is invariant.
export function shapeYawDegrees(shape: WorkplaneShape): number {
  const round = shape.kind === "cylinder" || shape.kind === "cone";
  const circular = Math.abs(shapeWidth(shape) - shapeDepth(shape)) < SIZE_EPS;
  // Tipped about Z first, the yaw decides where a round body points (meshYawDegrees).
  const tippedAboutZ = Math.abs(shape.rotationZ ?? 0) > 1e-9;
  // A taper or a lean follows the body's own axes, so the yaw stays (meshYawDegrees, #504).
  return round && circular && !tippedAboutZ && !shapeHasShapeDeform(shape) ? 0 : shape.rotation;
}

type BuildOutcome = { solid: BrepSolid } | { skip: string };

// Builds the shape in Layerling's Y-up world frame (Y is the vertical/height
// axis). The caller converts the whole assembly to CAD Z-up afterwards.
function buildExactSolid(brep: Brep, shape: WorkplaneShape): BuildOutcome {
  const width = shapeWidth(shape);
  const depth = shapeDepth(shape);
  const height = shape.height;
  if (width <= SIZE_EPS || depth <= SIZE_EPS || height <= SIZE_EPS) {
    return { skip: "degenerate dimensions" };
  }

  let solid: BrepSolid;
  switch (shape.kind) {
    case "box": {
      // brep.box maps args to (X, Y, Z); in the Y-up frame that is (width, height, depth).
      solid = brep.box(width, height, depth, { centered: true });
      break;
    }
    case "sphere": {
      const rx = width / 2;
      const ry = height / 2;
      const rz = depth / 2;
      const uniform = Math.abs(rx - ry) < SIZE_EPS && Math.abs(ry - rz) < SIZE_EPS;
      solid = uniform ? brep.sphere(rx) : brep.ellipsoid(rx, ry, rz);
      break;
    }
    case "cylinder": {
      if (Math.abs(width - depth) >= SIZE_EPS) {
        return { skip: "elliptical base is not an exact OCCT primitive" };
      }
      solid = brep.cylinder(width / 2, height, { axis: [0, 1, 0], centered: true });
      break;
    }
    case "cone": {
      if (Math.abs(width - depth) >= SIZE_EPS) {
        return { skip: "elliptical base is not an exact OCCT primitive" };
      }
      // Honor the resized footprint (width) while keeping the shape's own
      // top/base radius ratio, so a truncated cone stays truncated after resize.
      const baseRadius = width / 2;
      const topScale = shape.baseRadius ? (shape.topRadius ?? 0) / shape.baseRadius : 0;
      solid = brep.cone(baseRadius, baseRadius * topScale, height, { axis: [0, 1, 0], centered: true });
      break;
    }
    default:
      return { skip: "no exact B-Rep mapping" };
  }

  const rotZ = shape.rotationZ ?? 0;
  const rotY = shapeYawDegrees(shape);
  const rotX = shape.rotationX ?? 0;
  if (rotZ) solid = brep.rotate(solid, rotZ, { axis: [0, 0, 1] });
  if (rotY) solid = brep.rotate(solid, rotY, { axis: [0, 1, 0] });
  if (rotX) solid = brep.rotate(solid, rotX, { axis: [1, 0, 0] });

  const center: [number, number, number] = [shape.x, (shape.elevation ?? 0) + height / 2, shape.z];
  solid = brep.translate(solid, center);
  return { solid };
}

// +90° about world X maps Layerling +Y (up) to CAD +Z (up) so the file opens
// upright in FreeCAD/SolidWorks instead of lying on its side.
function toCadZUp(brep: Brep, solid: BrepSolid): BrepSolid {
  return brep.rotate(solid, 90, { axis: [1, 0, 0] });
}

// Place a STEP-imported body (stored in its normalized local frame: x/z-centred,
// y in [0, baseHeight], Y-up) into world space, reproducing the editor's
// transformMesh exactly. Built from rigid kernel ops (rotate/translate/uniform
// scale) which preserve analytic surfaces and the original geometry losslessly;
// only genuinely non-uniform resize falls back to applyMatrix, which validly
// turns the affected primitives into B-splines. The shared toCadZUp applies the
// final Y-up→Z-up flip afterwards, as for primitives.
async function buildImportedBody(brep: Brep, shape: WorkplaneShape): Promise<BuildOutcome> {
  const mesh = shape.importedMesh;
  if (!mesh?.brepStep) {
    return { skip: "imported mesh has no B-Rep source; re-import as STEP to round-trip" };
  }
  const imported = await brep.importSTEP(new Blob([mesh.brepStep]));
  if (!imported.ok) {
    return { skip: "stored B-Rep failed to re-import" };
  }

  const h = shape.height;
  const sx = shapeWidth(shape) / Math.max(0.001, mesh.baseWidth);
  const sy = h / Math.max(0.001, mesh.baseHeight);
  const sz = shapeDepth(shape) / Math.max(0.001, mesh.baseDepth);
  let body = imported.value as unknown as BrepSolid;

  if (Math.abs(sx - sy) < 1e-6 && Math.abs(sy - sz) < 1e-6) {
    if (Math.abs(sx - 1) > 1e-6) body = brep.scale(body, sx);
  } else {
    const scaled = brep.applyMatrix(body, { linear: [sx, 0, 0, 0, sy, 0, 0, 0, sz], translation: [0, 0, 0] });
    if (!scaled.ok) {
      return { skip: `non-uniform scale failed: ${String(scaled.error.message ?? scaled.error)}` };
    }
    body = scaled.value as unknown as BrepSolid;
  }

  body = brep.translate(body, [0, -h / 2, 0]);
  if (shape.mirrorX) body = brep.mirror(body, { normal: [1, 0, 0] });
  if (shape.mirrorY) body = brep.mirror(body, { normal: [0, 1, 0] });
  if (shape.mirrorZ) body = brep.mirror(body, { normal: [0, 0, 1] });
  const rotZ = shape.rotationZ ?? 0;
  const rotY = shapeYawDegrees(shape);
  const rotX = shape.rotationX ?? 0;
  if (rotZ) body = brep.rotate(body, rotZ, { axis: [0, 0, 1] });
  if (rotY) body = brep.rotate(body, rotY, { axis: [0, 1, 0] });
  if (rotX) body = brep.rotate(body, rotX, { axis: [1, 0, 0] });
  body = brep.translate(body, [shape.x, (shape.elevation ?? 0) + h / 2, shape.z]);
  return { solid: body };
}

/**
 * Ein Koerper, dessen genaue Geometrie schon neben ihm liegt.
 *
 * Sobald an einem Koerper Kanten verrundet oder gefast wurden, ist er kein
 * Quader mehr, sondern ein Netz - die Form aus Breite, Tiefe und Hoehe neu zu
 * bauen wuerde die Verrundung verlieren. Der CAD-Dienst legt aber bei jeder
 * Bearbeitung das Ergebnis als B-Rep in `cadBrep` ab, und genau das gehoert in
 * die STEP-Datei. `cadBrepTransformForShape` liefert die Lage, die der Koerper
 * seit dieser Aufnahme bekommen hat - dieselbe Rechnung, mit der der Arbeiter
 * die Form spaeter wieder aufbaut.
 */
function buildBakedBody(brep: Brep, shape: WorkplaneShape): BuildOutcome {
  const stored = shape.cadBrep;
  if (!stored) return { skip: unsupportedReason() };

  // Placed with the kernel as the CAD worker places it: brepjs' applyMatrix always takes the
  // general transform, and a body that was only moved went out with every face a B-spline.
  return buildPlacedBody(brep, { transform: cadBrepTransformForShape(shape) }, (kernel) => kernel.fromBREP(stored), "stored B-Rep");
}

/**
 * Ein Koerper aus seinem Umriss: derselbe exakte Koerper, den das
 * Kantenwerkzeug bekommt (Linien, Boegen, ebene Deckel, gedrehte Schnitte),
 * hier in die Weltlage gestellt und als B-Rep an brepjs uebergeben.
 */
function buildProfileBody(brep: Brep, shape: WorkplaneShape): BuildOutcome {
  // Round shapes go out round, as they always have, whatever their side count.
  const part = cadModifierProfileForShape(asDesignedRound(shape), { designedRound: true });
  // A stretched placement (an oval dome or cone) takes the general transform there.
  return buildPlacedBody(brep, part, (kernel) => profileExtrusionSolid(kernel, part!));
}

/** Lets the kernel's handles go; a handle already released is no reason to lose the export. */
function releaseKernelHandles(kernel: OcctKernel, handles: Array<ShapeHandle | null>) {
  for (const handle of new Set(handles)) {
    if (handle === null) continue;
    try {
      kernel.release(handle);
    } catch {
      // Already gone.
    }
  }
}

/**
 * A kernel whose WebAssembly memory broke is not tried on with the next body: the export stops with the error and
 * the next one loads a fresh kernel. Any other error only leaves this body out.
 */
function throwIfKernelBroken(error: unknown) {
  if (!isCadModifierWasmMemoryFault(error instanceof Error ? error.message : String(error ?? ""), error instanceof Error ? error.name : "")) return;
  dropOcctKernel();
  throw error;
}

/** Lets go of every handle made since `mark`; only a broken kernel stops the export there. */
function releaseKernelSince(kernel: OcctKernel, mark: number) {
  try {
    kernel.releaseSince(mark);
  } catch (error) {
    throwIfKernelBroken(error);
  }
}

/** A part's exact body in its own frame, placed and handed over as the CAD worker does. */
function buildPlacedBody(brep: Brep, part: { transform?: number[] } | null, build: (kernel: OcctKernel) => ShapeHandle, what = "exact body"): BuildOutcome {
  const kernel = occtKernel();
  if (!kernel || !part) return { skip: unsupportedReason() };
  // The kernel is kept for the whole session, so a lost handle stays lost: everything the build makes on the way (a
  // Hirth joint leaves some 600 faces, edges and wires, a screw boss a dozen) goes at the end, whether the build
  // worked or not. The body leaves the kernel as BREP text and is read back only after that, as brepjs keeps its
  // shapes in the same kernel and the release would take the read-back body along.
  const mark = kernel.checkpoint();
  let text: string;
  try {
    const local = build(kernel);
    const placed = applyCadTransform(kernel, local, part.transform);
    text = kernel.toBREP(placed);
  } catch (error) {
    throwIfKernelBroken(error);
    return { skip: `${what} could not be built: ${error instanceof Error ? error.message : String(error)}` };
  } finally {
    if (occtKernel() === kernel) releaseKernelSince(kernel, mark);
  }
  try {
    const restored = brep.fromBREP(text);
    if (!restored.ok) return { skip: `${what} failed to load: ${String(restored.error.message ?? restored.error)}` };
    return { solid: restored.value as unknown as BrepSolid };
  } catch (error) {
    throwIfKernelBroken(error);
    return { skip: `${what} failed to load: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/** All meshes of one export are made exact within this time, so a design full of scans still gets its file. */
const EXACT_EXPORT_BUDGET_MS = 60_000;
/** One mesh at most this long, so one hard mesh leaves time for the others. */
const EXACT_EXPORT_MESH_BUDGET_MS = 20_000;
/** A denser mesh is left out: Make exact in the editor takes up to 400,000 triangles with more time. */
const EXACT_EXPORT_TRIANGLE_LIMIT = 200_000;
const FREEFORM_REASON = "mostly free-form mesh";
const MESH_NOT_EXACT_REASON = "mesh not made exact";

export type ExactExportBudget = { until: number };

/**
 * An imported mesh (STL, OBJ, 3MF, the mesh of a cut) made exact for the file, as Make exact does in the editor: its
 * planes, cylinders, cones, spheres and tori become real faces (lib/cadMeshExact.ts). A mesh that is mostly free-form
 * stays out, as does one that does not close into a solid or would take longer than the export has left.
 */
function buildMeshMadeExact(brep: Brep, shape: WorkplaneShape, budget: ExactExportBudget): BuildOutcome {
  const kernel = occtKernel();
  if (!kernel) return { skip: `${MESH_NOT_EXACT_REASON}: the CAD kernel is not loaded` };
  const left = budget.until - performance.now();
  if (left < 2000) return { skip: `${MESH_NOT_EXACT_REASON}: no time left in this export` };
  const mesh = meshForShape(shape);
  if (mesh.faces.length > EXACT_EXPORT_TRIANGLE_LIMIT) return { skip: `${MESH_NOT_EXACT_REASON}: ${mesh.faces.length} triangles, more than ${EXACT_EXPORT_TRIANGLE_LIMIT}` };
  const positions = new Float64Array(mesh.vertices.length * 3);
  mesh.vertices.forEach((vertex, index) => positions.set(vertex, index * 3));
  const indices = new Uint32Array(mesh.faces.length * 3);
  mesh.faces.forEach((face, index) => indices.set(face, index * 3));
  let solid: ShapeHandle | null = null;
  try {
    const exact = exactSolidFromMesh(kernel, positions, indices, { budgetMs: Math.min(EXACT_EXPORT_MESH_BUDGET_MS, left), refuseFreeform: true });
    if (!exact) return { skip: `${MESH_NOT_EXACT_REASON}: its faces did not close into a solid` };
    solid = exact.solid;
    const text = kernel.toBREP(exact.solid);
    const restored = brep.fromBREP(text);
    if (!restored.ok) return { skip: `${MESH_NOT_EXACT_REASON}: ${String(restored.error.message ?? restored.error)}` };
    return { solid: restored.value as unknown as BrepSolid };
  } catch (error) {
    throwIfKernelBroken(error);
    const message = error instanceof Error ? error.message : String(error);
    if (exactMeshFreeformShare(message) !== null) return { skip: FREEFORM_REASON };
    return { skip: `${MESH_NOT_EXACT_REASON}: ${message}` };
  } finally {
    if (occtKernel() === kernel) releaseKernelHandles(kernel, [solid]);
  }
}

/** A thread, rod, screw, nut or tapped hole as its exact body, built and placed as the CAD worker does. */
function buildThreadBody(brep: Brep, shape: WorkplaneShape): BuildOutcome {
  const part = cadModifierThreadForShape(shape);
  return buildPlacedBody(brep, part, (kernel) => threadPartSolid(kernel, part!));
}

/** A spring as its exact body, built and placed as the CAD worker does. */
function buildSpringBody(brep: Brep, shape: WorkplaneShape): BuildOutcome {
  const part = cadModifierSpringForShape(shape);
  return buildPlacedBody(brep, part, (kernel) => springPartSolid(kernel, part!));
}

/** A helical gear as its exact body, built and placed as the CAD worker does. */
function buildHelicalGearBody(brep: Brep, shape: WorkplaneShape): BuildOutcome {
  const part = cadModifierHelicalGearForShape(shape, { anySize: true });
  return buildPlacedBody(brep, part, (kernel) => helicalGearPartSolid(kernel, part!));
}

/** A Hirth joint as its exact body, built and placed as the CAD worker does. */
function buildHirthBody(brep: Brep, shape: WorkplaneShape): BuildOutcome {
  const part = cadModifierHirthForShape(shape);
  return buildPlacedBody(brep, part, (kernel) => hirthPartSolid(kernel, part!));
}

/** A screw boss, snap-fit or rib as its exact body, built and placed as the CAD worker does; a boss set as a hole is its pocket. */
function buildEnclosureBody(brep: Brep, shape: WorkplaneShape): BuildOutcome {
  const part = cadModifierEnclosureForShape(shape);
  return buildPlacedBody(brep, part, (kernel) => enclosurePartSolid(kernel, part!));
}

/** A Gridfinity bin or baseplate as its exact body, built and placed as the CAD worker does. */
function buildGridfinityBody(brep: Brep, shape: WorkplaneShape): BuildOutcome {
  const part = cadModifierGridfinityForShape(shape);
  return buildPlacedBody(brep, part, (kernel) => gridfinityPartSolid(kernel, part!));
}

/**
 * The hinge as the boxes, cylinders, tubes and cones it is made of, fused, its screw holes cut out: two bodies that turn
 * against each other. Each knuckle of the cone hinge's B has its recesses cut first, before the cones in them are added,
 * and each of the snap hinge's clips its opening, before the pin in it is.
 */
function buildHingeBody(brep: Brep, shape: WorkplaneShape): BuildOutcome {
  const solids: BrepSolid[] = [];
  const holes: BrepSolid[] = [];
  const knuckles = new Map<number, { solids: BrepSolid[]; holes: BrepSolid[] }>();
  for (const part of hingeWorldParts(shape)) {
    const source = stepSourceForShape(part);
    const built = source === "primitive" ? buildExactSolid(brep, part) : source === "profile" ? buildProfileBody(brep, part) : { skip: `its ${part.kind} part has no exact body` };
    if ("skip" in built) return built;
    const own = part.knuckle === undefined ? { solids, holes } : knuckles.get(part.knuckle) ?? { solids: [], holes: [] };
    if (part.knuckle !== undefined) knuckles.set(part.knuckle, own);
    (part.hole ? own.holes : own.solids).push(built.solid);
  }
  for (const knuckle of knuckles.values()) {
    const joined = brep.fuseAll(knuckle.solids as Parameters<Brep["fuseAll"]>[0]);
    if (!joined.ok) return { skip: "a knuckle of the hinge could not be joined" };
    const cut = brep.cutAll(joined.value as BrepSolid, knuckle.holes);
    if (!cut.ok) return { skip: "the hinge's recesses could not be cut" };
    solids.push(cut.value as BrepSolid);
  }
  const fused = brep.fuseAll(solids as Parameters<Brep["fuseAll"]>[0]);
  if (!fused.ok) return { skip: "the hinge's parts could not be joined" };
  if (holes.length === 0) return { solid: fused.value as BrepSolid };
  const cut = brep.cutAll(fused.value as BrepSolid, holes);
  return cut.ok ? { solid: cut.value as BrepSolid } : { skip: "the hinge's screw holes could not be cut" };
}

/**
 * A raised text of several letters as its exact body (#1337): each letter (or each loose piece of a filled text) built
 * from the font's own curves, as the edge tool gets them, and fused into one. A text of one letter already goes as a
 * profile. Null when the text has no exact outline: a bevel, a rounded top edge, a taper or twist, or fonts that are not
 * loaded - where the export runs, they are (exportShapesToStepOffThread keeps a text on the page).
 */
function buildTextBody(brep: Brep, shape: WorkplaneShape): BuildOutcome | null {
  if (shape.kind !== "text") return null;
  const glyphs = textGlyphProfiles(shape);
  if (!glyphs?.length || glyphs.some((glyph) => !glyph.profile)) return null;
  const solids: BrepSolid[] = [];
  for (const { profile } of glyphs) {
    const built = buildPlacedBody(brep, profile, (kernel) => profileExtrusionSolid(kernel, profile!), "letter");
    if ("skip" in built) return built;
    solids.push(built.solid);
  }
  if (solids.length === 1) return { solid: solids[0] };
  const fused = brep.fuseAll(solids as Parameters<Brep["fuseAll"]>[0]);
  return fused.ok ? { solid: fused.value as BrepSolid } : { skip: "the letters could not be joined" };
}

export function skipCodeFor(shape: WorkplaneShape, reason: string): SkipCode {
  if (reason.startsWith("hole subtraction")) return "holeCut";
  if (reason.startsWith(FREEFORM_REASON)) return "freeform";
  if (reason.startsWith(MESH_NOT_EXACT_REASON)) return "meshFailed";
  if (shape.hole) return "hole";
  if (/failed|could not/i.test(reason)) return "failed";
  if (Math.abs(shape.extrudeTwist ?? 0) > 1e-9) return "twist";
  if (shapeHasShapeDeform(shape)) return "deform";
  if (shape.kind === "mesh") return "mesh";
  if (/elliptical/i.test(reason)) return "oval";
  return "noExact";
}

function describe(shape: WorkplaneShape, reason: string): SkippedShape {
  return { name: shape.name, kind: shape.kind, reason, code: skipCodeFor(shape, reason) };
}

export type Aabb = { min: [number, number, number]; max: [number, number, number] };

// World-space AABB used to decide whether a hole actually reaches a body. A hole
// is only cut from a body when their boxes overlap, so a body far from every hole
// skips the boolean entirely — which both avoids the per-cut color loss in the
// STEP writer and keeps the export O(bodies + intersections), not O(bodies×holes).
//
// Axis-aligned shapes get a tight box. Rotated shapes fall back to the box that
// encloses the bounding sphere (rotation-invariant, never under-reports), trading
// tightness for the guarantee that a real intersection is never missed.
//
// A drill point (Discussion #621) reaches past the frame by its tip: the box grows by it at the bottom (at the top
// when the hole is mirrored upside down), and a turned one round a body with a tip at both ends, which holds it however
// it is turned.
export function worldAabb(shape: WorkplaneShape): Aabb {
  const w = shapeWidth(shape);
  const d = shapeDepth(shape);
  const h = shape.height;
  const tip = shapeDrillPointLength(shape);
  const cx = shape.x;
  const cy = (shape.elevation ?? 0) + h / 2;
  const cz = shape.z;
  const rotated = (shape.rotationX ?? 0) !== 0 || (shape.rotationZ ?? 0) !== 0 || shapeYawDegrees(shape) !== 0;
  if (rotated) {
    const r = 0.5 * Math.sqrt(w * w + (h + 2 * tip) ** 2 + d * d);
    return { min: [cx - r, cy - r, cz - r], max: [cx + r, cy + r, cz + r] };
  }
  const below = shape.mirrorY ? 0 : tip;
  return { min: [cx - w / 2, cy - h / 2 - below, cz - d / 2], max: [cx + w / 2, cy + h / 2 + tip - below, cz + d / 2] };
}

export function aabbsOverlap(a: Aabb, b: Aabb): boolean {
  return (
    a.min[0] <= b.max[0] &&
    a.max[0] >= b.min[0] &&
    a.min[1] <= b.max[1] &&
    a.max[1] >= b.min[1] &&
    a.min[2] <= b.max[2] &&
    a.max[2] >= b.min[2]
  );
}

type ScopePart = { solid: BrepSolid; box: Aabb; name: string; kind: WorkplaneShape["kind"]; color: string };

/**
 * A plain group, taken apart: its parts are built as the exact bodies they are, and its holes cut
 * only its own solids (#709). A group already made of one body (a CAD source, an imported STEP), the
 * result of an intersection, a bundle, or a group with edge treatments is left to the usual way.
 */
function isOpenableGroup(shape: WorkplaneShape) {
  return Boolean(shape.groupedShapes?.length)
    && !shape.cadBrep
    && !shape.importedMesh?.brepStep
    && !shape.edgeTreatments?.length
    && !shapeHasShapeDeform(shape)
    && (shape.groupOperation === undefined || shape.groupOperation === "group");
}

/**
 * The cutters among these shapes. A group set as a hole cuts what the group is, as the editor builds it: a group of
 * holes alone is opened into the holes it holds; a group with solids in it cuts its solids with its own holes taken out
 * of them first (Discussion #1748: a box with a capsule hole, set as a hole, trims a filleted capsule to the capsule's
 * outline - its box was left out and its capsule cut the body instead, leaving a thin ring).
 */
async function collectHoles(brep: Brep, shapes: WorkplaneShape[], skipped: SkippedShape[], holes: { box: Aabb; solid: BrepSolid }[], budget: ExactExportBudget) {
  for (const shape of shapes.filter((s) => s.hole)) {
    const source = stepSourceForShape(shape);
    if (source === "unsupported" && isOpenableGroup(shape)) {
      const children = restoreGroupedChildren(shape).filter((child) => !child.hidden);
      if (children.some((child) => !child.hole)) {
        const inner = await buildScope(brep, children, skipped, budget);
        holes.push(...inner.map((part) => ({ box: part.box, solid: part.solid })));
      } else {
        await collectHoles(brep, children, skipped, holes, budget);
      }
      continue;
    }
    const text = source === "unsupported" ? buildTextBody(brep, shape) : null;
    if (text && "solid" in text) {
      holes.push({ box: worldAabb(shape), solid: text.solid });
      continue;
    }
    if (source === "unsupported") {
      skipped.push(describe(shape, `hole ${text?.skip ?? unsupportedReason()}; cut omitted`));
      continue;
    }
    // Eine Aussparung wird hier nur aus dem gebaut, was ohne Warten geht; eine
    // eingelesene STEP-Quelle als Bohrer ist kein Fall, der vorkommt.
    const built = source === "primitive" ? buildExactSolid(brep, shape) : source === "profile" ? buildProfileBody(brep, shape) : source === "thread" ? buildThreadBody(brep, shape) : source === "spring" ? buildSpringBody(brep, shape) : source === "helicalGear" ? buildHelicalGearBody(brep, shape) : source === "gridfinity" ? buildGridfinityBody(brep, shape) : source === "hirth" ? buildHirthBody(brep, shape) : source === "enclosure" ? buildEnclosureBody(brep, shape) : buildBakedBody(brep, shape);
    if ("skip" in built) {
      skipped.push(describe(shape, `hole ${built.skip}; cut omitted`));
      continue;
    }
    holes.push({ box: worldAabb(shape), solid: built.solid });
  }
}

/** The solids of these shapes with the holes among them cut out; a group is a scope of its own. */
async function buildScope(brep: Brep, shapes: WorkplaneShape[], skipped: SkippedShape[], budget: ExactExportBudget): Promise<ScopePart[]> {
  const holes: { box: Aabb; solid: BrepSolid }[] = [];
  await collectHoles(brep, shapes, skipped, holes, budget);

  const parts: ScopePart[] = [];
  for (const shape of shapes.filter((s) => !s.hole)) {
    let built: BuildOutcome;
    const source = stepSourceForShape(shape);
    if (source === "unsupported" && isOpenableGroup(shape)) {
      // Its holes were cut inside; the holes around it still reach its bodies below.
      const inner = await buildScope(brep, restoreGroupedChildren(shape).filter((child) => !child.hidden), skipped, budget);
      // A group shown in one colour gives it to all its parts, as the editor draws it; with Multicolor they keep their own (#1305).
      parts.push(...(groupShowsPartColors(shape) ? inner : inner.map((part) => ({ ...part, color: shape.color }))));
      continue;
    }
    const text = source === "unsupported" ? buildTextBody(brep, shape) : null;
    if (text) {
      built = text;
    } else if (shape.kind === "hinge" && !shape.cadBrep && !shapeHasShapeDeform(shape)) {
      built = buildHingeBody(brep, shape);
    } else if (source === "imported") {
      built = await buildImportedBody(brep, shape);
    } else if (source === "primitive") {
      built = buildExactSolid(brep, shape);
    } else if (source === "baked") {
      built = buildBakedBody(brep, shape);
    } else if (source === "profile") {
      built = buildProfileBody(brep, shape);
    } else if (source === "thread") {
      built = buildThreadBody(brep, shape);
    } else if (source === "spring") {
      built = buildSpringBody(brep, shape);
    } else if (source === "helicalGear") {
      built = buildHelicalGearBody(brep, shape);
    } else if (source === "gridfinity") {
      built = buildGridfinityBody(brep, shape);
    } else if (source === "hirth") {
      built = buildHirthBody(brep, shape);
    } else if (source === "enclosure") {
      built = buildEnclosureBody(brep, shape);
    } else if (shape.importedMesh && !shape.importedMesh.brepStep) {
      built = buildMeshMadeExact(brep, shape, budget);
    } else {
      const reason = shape.kind === "mesh" ? "imported mesh has no B-Rep source; re-import as STEP to round-trip" : unsupportedReason();
      skipped.push(describe(shape, reason));
      continue;
    }
    if ("skip" in built) {
      skipped.push(describe(shape, built.skip));
      continue;
    }
    parts.push({ solid: built.solid, box: worldAabb(shape), name: shape.name, kind: shape.kind, color: shape.color });
  }

  return parts.map((part) => {
    const overlapping = holes.filter((hole) => aabbsOverlap(part.box, hole.box));
    if (overlapping.length === 0) return part;
    const cut = brep.cutAll(part.solid, overlapping.map((hole) => hole.solid));
    if (cut.ok) return { ...part, solid: cut.value };
    skipped.push({ name: part.name, kind: part.kind, reason: "hole subtraction failed; exported solid without holes", code: "failed" });
    return part;
  });
}

/**
 * The colour as the kernel takes it for the file: sRGB on the 0-255 scale, as it shows here. Up to occt-wasm 5.8 the
 * kernel took it as linear light and turned it into sRGB on writing, so layerling handed it over linearised (else
 * #d12a2a came out as #ea7171); since 5.9 it stores the colour as given, and the linearised one came out as #a30606.
 */
export function stepColorForKernel(color: string): [number, number, number, number] {
  const hex = /^#?([0-9a-f]{6})$/i.exec(color)?.[1] ?? "ff0000";
  const channel = (offset: number) => parseInt(hex.slice(offset, offset + 2), 16);
  return [channel(0), channel(2), channel(4), 255];
}

export async function exportShapesToStep(shapes: WorkplaneShape[]): Promise<StepExportResult> {
  const brep = await loadBrepWithOcct();

  const skipped: SkippedShape[] = [];
  const parts = (await buildScope(brep, shapes, skipped, { until: performance.now() + EXACT_EXPORT_BUDGET_MS })).map((part) => ({ shape: toCadZUp(brep, part.solid), name: part.name, color: part.color }));

  if (parts.length === 0) {
    // Der Aufrufer uebersetzt diesen Fall; der Text hier ist nur fuer Protokolle.
    throw new StepExportEmptyError();
  }

  // The kernel's own document rather than brepjs's exportAssemblySTEP, which takes colours only as whole hex steps.
  const kernel = brep.getKernel();
  const doc = kernel.createXCAFDocument(parts.map((part) => ({ shape: part.shape.wrapped, name: part.name, color: stepColorForKernel(part.color) })));
  let step: string;
  try {
    step = kernel.writeXCAFToSTEP(doc, { unit: "MM" });
  } finally {
    doc.delete();
  }
  if (!step) throw new Error("STEP export failed: Failed to write STEP file");

  return { blob: new Blob([step], { type: "application/STEP" }), exportedCount: parts.length, skipped };
}
