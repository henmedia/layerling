import type { OcctKernel, ShapeHandle } from "occt-wasm";
import type { WorkplaneShape } from "@/types/layerling";
import { shapeDepth, shapeHasShapeDeform, shapeWidth } from "@/lib/workplaneShapes";
import { cadBrepTransformForShape } from "@/lib/cadBakeMetadata";
import { loadBrepWithOcct, occtKernel, type Brep, type BrepSolid } from "@/lib/brepKernel";
import { asDesignedRound, cadModifierGridfinityForShape, cadModifierHelicalGearForShape, cadModifierProfileForShape, cadModifierSpringForShape, cadModifierThreadForShape } from "@/lib/cadProfileExtrusion";
import { threadPartSolid } from "@/lib/threadSolid";
import { springPartSolid } from "@/lib/springSolid";
import { helicalGearPartSolid } from "@/lib/gearSolid";
import { gridfinityPartSolid } from "@/lib/gridfinitySolid";
import { profileExtrusionSolid } from "@/lib/cadProfileSolid";
import { applyCadTransform } from "@/lib/cadModifierRuntime";
import { hingeHasExactParts } from "@/lib/hingeGeometry";
import { hingeWorldParts } from "@/lib/hingeParts";
import { restoreGroupedChildren } from "@/lib/editorBooleans";

/**
 * Why a body did not go into the STEP file, in a word the editor can say in the user's language
 * (#184): a twist has no exact form yet, a mesh has no CAD source, a hole was left out, or the
 * kernel could not build it.
 */
export type SkipCode = "twist" | "deform" | "mesh" | "oval" | "hole" | "holeCut" | "failed" | "noExact";

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
// rigid placement are mapped to B-Rep. Everything else (swept/tessellated/text
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
export type StepSource = "primitive" | "imported" | "baked" | "profile" | "thread" | "spring" | "helicalGear" | "gridfinity" | "unsupported";

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
    return cadModifierHelicalGearForShape(shape) !== null;
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
  if (shape.kind === "mesh" && shape.importedMesh?.brepStep) return "imported";
  // A taper or lean is no part of the primitives: the box would go out as a
  // plain box. A tapered or leaning prism goes out as its loft; a twist, or a
  // deformed round body, has no exact form yet.
  if (shapeHasShapeDeform(shape)) return shape.cadBrep ? "baked" : hasExactProfile(shape) ? "profile" : "unsupported";
  const oval = (shape.kind === "cylinder" || shape.kind === "cone") && Math.abs(shapeWidth(shape) - shapeDepth(shape)) >= SIZE_EPS;
  if (EXACT_KINDS.has(shape.kind) && !oval) return "primitive";
  if (shape.cadBrep) return "baked";
  if (hasExactProfile(shape)) return "profile";
  if (hasExactThread(shape)) return "thread";
  if (hasExactSpring(shape)) return "spring";
  if (hasExactHelicalGear(shape)) return "helicalGear";
  if (hasExactGridfinity(shape)) return "gridfinity";
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

/** A part's exact body in its own frame, placed and handed over as the CAD worker does. */
function buildPlacedBody(brep: Brep, part: { transform?: number[] } | null, build: (kernel: OcctKernel) => ShapeHandle, what = "exact body"): BuildOutcome {
  const kernel = occtKernel();
  if (!kernel || !part) return { skip: unsupportedReason() };
  try {
    const local = build(kernel);
    const placed = applyCadTransform(kernel, local, part.transform);
    const text = kernel.toBREP(placed);
    try {
      if (placed !== local) kernel.release(local);
      kernel.release(placed);
    } catch {
      // A released handle is no reason to lose the export.
    }
    const restored = brep.fromBREP(text);
    if (!restored.ok) return { skip: `${what} failed to load: ${String(restored.error.message ?? restored.error)}` };
    return { solid: restored.value as unknown as BrepSolid };
  } catch (error) {
    return { skip: `${what} could not be built: ${error instanceof Error ? error.message : String(error)}` };
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
  const part = cadModifierHelicalGearForShape(shape);
  return buildPlacedBody(brep, part, (kernel) => helicalGearPartSolid(kernel, part!));
}

/** A Gridfinity bin or baseplate as its exact body, built and placed as the CAD worker does. */
function buildGridfinityBody(brep: Brep, shape: WorkplaneShape): BuildOutcome {
  const part = cadModifierGridfinityForShape(shape);
  return buildPlacedBody(brep, part, (kernel) => gridfinityPartSolid(kernel, part!));
}

/** The hinge as the boxes, cylinders and tubes it is made of, fused, its screw holes cut out: two bodies that turn against each other. */
function buildHingeBody(brep: Brep, shape: WorkplaneShape): BuildOutcome {
  const solids: BrepSolid[] = [];
  const holes: BrepSolid[] = [];
  for (const part of hingeWorldParts(shape)) {
    const source = stepSourceForShape(part);
    const built = source === "primitive" ? buildExactSolid(brep, part) : source === "profile" ? buildProfileBody(brep, part) : { skip: `its ${part.kind} part has no exact body` };
    if ("skip" in built) return built;
    (part.hole ? holes : solids).push(built.solid);
  }
  const fused = brep.fuseAll(solids as Parameters<Brep["fuseAll"]>[0]);
  if (!fused.ok) return { skip: "the hinge's parts could not be joined" };
  if (holes.length === 0) return { solid: fused.value as BrepSolid };
  const cut = brep.cutAll(fused.value as BrepSolid, holes);
  return cut.ok ? { solid: cut.value as BrepSolid } : { skip: "the hinge's screw holes could not be cut" };
}

export function skipCodeFor(shape: WorkplaneShape, reason: string): SkipCode {
  if (reason.startsWith("hole subtraction")) return "holeCut";
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
export function worldAabb(shape: WorkplaneShape): Aabb {
  const w = shapeWidth(shape);
  const d = shapeDepth(shape);
  const h = shape.height;
  const cx = shape.x;
  const cy = (shape.elevation ?? 0) + h / 2;
  const cz = shape.z;
  const rotated = (shape.rotationX ?? 0) !== 0 || (shape.rotationZ ?? 0) !== 0 || shapeYawDegrees(shape) !== 0;
  const [hx, hy, hz] = rotated
    ? (() => {
        const r = 0.5 * Math.sqrt(w * w + h * h + d * d);
        return [r, r, r];
      })()
    : [w / 2, h / 2, d / 2];
  return { min: [cx - hx, cy - hy, cz - hz], max: [cx + hx, cy + hy, cz + hz] };
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

/** The cutters among these shapes, a group of holes opened into the holes it holds. */
function collectHoles(brep: Brep, shapes: WorkplaneShape[], skipped: SkippedShape[], holes: { box: Aabb; solid: BrepSolid }[]) {
  for (const shape of shapes.filter((s) => s.hole)) {
    const source = stepSourceForShape(shape);
    if (source === "unsupported" && isOpenableGroup(shape)) {
      collectHoles(brep, restoreGroupedChildren(shape).filter((child) => !child.hidden), skipped, holes);
      continue;
    }
    if (source === "unsupported") {
      skipped.push(describe(shape, `hole ${unsupportedReason()}; cut omitted`));
      continue;
    }
    // Eine Aussparung wird hier nur aus dem gebaut, was ohne Warten geht; eine
    // eingelesene STEP-Quelle als Bohrer ist kein Fall, der vorkommt.
    const built = source === "primitive" ? buildExactSolid(brep, shape) : source === "profile" ? buildProfileBody(brep, shape) : source === "thread" ? buildThreadBody(brep, shape) : source === "spring" ? buildSpringBody(brep, shape) : source === "helicalGear" ? buildHelicalGearBody(brep, shape) : source === "gridfinity" ? buildGridfinityBody(brep, shape) : buildBakedBody(brep, shape);
    if ("skip" in built) {
      skipped.push(describe(shape, `hole ${built.skip}; cut omitted`));
      continue;
    }
    holes.push({ box: worldAabb(shape), solid: built.solid });
  }
}

/** The solids of these shapes with the holes among them cut out; a group is a scope of its own. */
async function buildScope(brep: Brep, shapes: WorkplaneShape[], skipped: SkippedShape[]): Promise<ScopePart[]> {
  const holes: { box: Aabb; solid: BrepSolid }[] = [];
  collectHoles(brep, shapes, skipped, holes);

  const parts: ScopePart[] = [];
  for (const shape of shapes.filter((s) => !s.hole)) {
    let built: BuildOutcome;
    const source = stepSourceForShape(shape);
    if (source === "unsupported" && isOpenableGroup(shape)) {
      // Its holes were cut inside; the holes around it still reach its bodies below.
      parts.push(...await buildScope(brep, restoreGroupedChildren(shape).filter((child) => !child.hidden), skipped));
      continue;
    }
    if (shape.kind === "hinge" && hingeHasExactParts(shape) && !shape.cadBrep && !shapeHasShapeDeform(shape)) {
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
 * The kernel takes a colour as linear light and writes it to the file as sRGB, so a colour handed over as it is came out
 * paler in the file (#d12a2a as #ea7171). Handed over as linear light, unrounded (on the 0-255 scale the kernel divides
 * by 255), the file carries the colour as it shows here.
 */
export function stepColorForKernel(color: string): [number, number, number, number] {
  const hex = /^#?([0-9a-f]{6})$/i.exec(color)?.[1] ?? "ff0000";
  const channel = (offset: number) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4) * 255;
  };
  return [channel(0), channel(2), channel(4), 255];
}

export async function exportShapesToStep(shapes: WorkplaneShape[]): Promise<StepExportResult> {
  const brep = await loadBrepWithOcct();

  const skipped: SkippedShape[] = [];
  const parts = (await buildScope(brep, shapes, skipped)).map((part) => ({ shape: toCadZUp(brep, part.solid), name: part.name, color: part.color }));

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
