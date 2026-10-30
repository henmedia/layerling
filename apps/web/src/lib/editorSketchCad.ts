
import { t } from "@/lib/i18n";
import { isBuildMessage, reportWorkerBuild } from "@/lib/buildStamp";
import { cloneSketchProfile } from "@/lib/sketchSmoothHandles";
import { canonicalizeShape, cleanNearZero, shapeDepth, shapeWidth } from "@/lib/workplaneShapes";
import { SKETCH_CAD_DEFLECTION } from "@/lib/cadModifierRuntime";
import { createLocalId } from "@/lib/localIds";
import { revolveProfileFitsAxis } from "@/lib/cadSketchRevolve";
import { buildSketchRevolveMesh, normalizeSketchRevolveSettings } from "@/lib/sketchRevolve";
import { placementWorkplaneCoordinates, type PlacementWorkplane } from "@/lib/placementWorkplane";
import { silhouetteSketchProfile } from "@/lib/sketchCadProfile";
import { sweepPlan } from "@/lib/cadSketchSweep";
import { SKETCH_LOFT_FAILED, SKETCH_LOFT_HOLES, SKETCH_LOFT_OUTLINES, SKETCH_LOFT_STROKE_UNSUPPORTED, type SketchLoftSection } from "@/lib/cadSketchLoft";
import { filledGrowPockets, steppedEdgeWall, strokeEdgeChamfer, strokedSketchProfile } from "@/lib/sketchStroke";
import { keyringSketchProfile } from "@/lib/sketchKeyring";
import { bakedSketchPose } from "@/lib/sketchPlacement";
import type { ManifoldToplevel } from "manifold-3d";
import type { CadModifierDeflection } from "@/lib/cadModifierTypes";
import { SKETCH_EDGE_FAILED, SKETCH_INSET_UNSUPPORTED, SKETCH_STROKE_UNSUPPORTED, type SketchCadBuildResponse } from "@/lib/sketchCadTypes";
import { insetSketchProfile } from "@/lib/faceTool";
import type { SketchInset, SketchOperation, SketchProfile, SketchRevolveSettings, SketchStroke, WorkplaneShape } from "@/types/layerling";
import { MIN_SHAPE_DIMENSION, cleanModelDimension, getManifoldRuntime, meshForShape } from "@/lib/editorMeshCore";

export function emptySketchProfile(): SketchProfile {
  return { points: [], segments: [], images: [] };
}

let sketchCadWorker: Worker | null = null;

let sketchCadRequestId = 0;

const sketchCadPending = new Map<number, {
  resolve: (response: SketchCadBuildResponse) => void;
  reject: (error: Error) => void;
  timer: number;
}>();

function ensureSketchCadWorker() {
  if (sketchCadWorker) return sketchCadWorker;
  const worker = new Worker(new URL("../workers/sketchCad.worker.ts", import.meta.url), { type: "module" });
  worker.onmessage = (event: MessageEvent<SketchCadBuildResponse>) => {
    if (isBuildMessage(event.data)) {
      reportWorkerBuild(event.data);
      return;
    }
    const pending = sketchCadPending.get(event.data.requestId);
    if (!pending) return;
    window.clearTimeout(pending.timer);
    sketchCadPending.delete(event.data.requestId);
    pending.resolve(event.data);
  };
  worker.onerror = () => {
    sketchCadPending.forEach((pending) => {
      window.clearTimeout(pending.timer);
      // Most often the page outlived an update and its worker file is gone.
      pending.reject(new Error(t("edge.errorWorkerFailed")));
    });
    sketchCadPending.clear();
    worker.terminate();
    sketchCadWorker = null;
  };
  sketchCadWorker = worker;
  return worker;
}

/** How long the kernel may take for a sketch; a sweep runs a profile along a whole path and gets longer (#884). */
const SKETCH_CAD_TIMEOUT_MS = 30_000;
const SKETCH_SWEEP_TIMEOUT_MS = 120_000;

/**
 * One build on the sketch worker. When it takes too long the worker is stopped, not left to finish: it
 * worked on in the background, and the next try waited behind it and timed out as well (#884). Every
 * build still waiting on it is answered with the same message; the next one starts a fresh worker.
 */
function requestSketchCad(message: Record<string, unknown>, timeoutMs = SKETCH_CAD_TIMEOUT_MS) {
  const worker = ensureSketchCadWorker();
  const requestId = ++sketchCadRequestId;
  return new Promise<SketchCadBuildResponse>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      const error = new Error(t("sketch.cadTimedOut"));
      sketchCadPending.forEach((pending) => {
        window.clearTimeout(pending.timer);
        pending.reject(error);
      });
      sketchCadPending.clear();
      worker.terminate();
      if (sketchCadWorker === worker) sketchCadWorker = null;
    }, timeoutMs);
    sketchCadPending.set(requestId, { resolve, reject, timer });
    worker.postMessage({ ...message, requestId });
  });
}

export async function cadShapeFromSketchProfile(profile: SketchProfile, height: number, existing?: WorkplaneShape | null) {
  const safeHeight = Math.max(MIN_SHAPE_DIMENSION, height);
  // A silhouette leaves its holes out first, so its outer line runs round the outside only (#197).
  const buildProfile = profile.silhouette ? silhouetteSketchProfile(profile) : profile;
  // A cutting edge (#982) is chamfered onto whatever the stroke is built as, the kernel's own outline or the straight pieces.
  const topChamfer = strokeEdgeChamfer(profile.stroke, safeHeight);
  const buildOnWorker = (build: SketchProfile, stroke?: SketchStroke, inset?: SketchInset) =>
    requestSketchCad({ type: "build", profile: cloneSketchProfile(build), height: safeHeight, ...(stroke ? { stroke } : {}), ...(inset ? { inset } : {}), ...(topChamfer > 0 ? { topChamfer } : {}) });
  let response: SketchCadBuildResponse;
  // A key ring hole (#391): the outline the sketch fills with its ear and its hole is worked out here and built as an area.
  const withKeyring = profile.keyring ? keyringSketchProfile(await getManifoldRuntime(), profile) : null;
  // With No holes and a "Wider" line, parts that touch once wider can close a pocket between
  // them; without holes means without those too, as for a text (#215). Only then is the outline
  // worked out here, as the polygon stroke with its outer rings only, and built as an area.
  const pocketsFilled = profile.stroke?.align === "grow" && profile.silhouette && !profile.inset ? filledGrowPockets(await getManifoldRuntime(), buildProfile) : null;
  // A face tool body given a stroke: the stroke runs along the outline set in, built as straight lines.
  const strokedInset = profile.stroke && profile.inset ? insetSketchProfile(await getManifoldRuntime(), buildProfile, profile.inset) : null;
  if (profile.stroke && profile.inset && !strokedInset) throw new Error(t("faceTool.empty"));
  if (withKeyring) {
    response = await buildOnWorker(withKeyring);
  } else if (pocketsFilled) {
    response = await buildOnWorker(pocketsFilled);
  } else if (strokedInset && profile.stroke) {
    const stroked = strokedSketchProfile(await getManifoldRuntime(), { ...strokedInset, stroke: profile.stroke });
    if (!stroked) throw new Error(t("sketch.strokeEmpty"));
    response = await buildOnWorker(stroked);
  } else if (profile.stroke) {
    // The kernel moves the outlines of a stroked sketch itself, so its walls stay planes, arcs and
    // single curves (#154); where it cannot (open lines, bevelled corners ...), a stroked outline of
    // straight lines is worked out here and the usual extrusion builds that. The body keeps the drawn line.
    response = await buildOnWorker(buildProfile, profile.stroke);
    if (response.type === "error" && response.message === SKETCH_STROKE_UNSUPPORTED) {
      const stroked = strokedSketchProfile(await getManifoldRuntime(), buildProfile);
      if (!stroked) throw new Error(t("sketch.strokeEmpty"));
      response = await buildOnWorker(stroked);
    }
  } else if (profile.inset) {
    // The face tool's outline set in (cadSketchInset.ts): the kernel moves the lines and arcs
    // itself; where it cannot, the polygon inset of the outline is built as an area.
    response = await buildOnWorker(buildProfile, undefined, profile.inset);
    if (response.type === "error" && response.message === SKETCH_INSET_UNSUPPORTED) {
      const inset = insetSketchProfile(await getManifoldRuntime(), buildProfile, profile.inset);
      if (!inset) throw new Error(t("faceTool.empty"));
      response = await buildOnWorker(inset);
    }
  } else {
    response = await buildOnWorker(buildProfile);
  }
  // Where the kernel cannot chamfer the cutting edge (a logo's sharp points), the wall is built with the edge in fine steps,
  // from polygon offsets, as a mesh instead of an exact body (#982).
  let stepped: ReturnType<typeof steppedEdgeWall> = null;
  if (response.type === "error" && response.message === SKETCH_EDGE_FAILED) {
    stepped = steppedEdgeWall(await getManifoldRuntime(), { ...buildProfile, stroke: profile.stroke }, safeHeight, topChamfer);
    if (!stepped) throw new Error(t("sketch.edgeFailed"));
  } else if (response.type === "error") {
    throw new Error(response.message);
  }
  const source = canonicalizeShape({
    ...(existing ?? {
      id: createLocalId("sketch-extrusion"),
      name: "Sketch extrusion",
      kind: "mesh" as const,
      color: "#d41721",
      x: 0,
      z: 0,
      size: 1,
      width: 1,
      depth: 1,
      height: safeHeight,
      rotation: 0,
    }),
    sketchProfile: cloneSketchProfile(profile),
    sketchOperation: "extrude",
    edgeTreatments: undefined,
    edgeTreatmentHistory: undefined,
    cadDisplayEdges: undefined,
    cadDisplayEdgesVersion: undefined,
  });
  if (stepped) {
    const mesh = shapeFromCadMesh(source, stepped.positions, new Float32Array(0), stepped.indices, "");
    if (!mesh) throw new Error(t("sketch.edgeFailed"));
    return { ...mesh, cadBrep: undefined, cadBrepFrame: undefined, cadMeshDeflection: undefined, sketchProfile: cloneSketchProfile(profile), sketchOperation: "extrude" as const, sketchPose: undefined };
  }
  if (response.type === "error") throw new Error(response.message);
  const shape = shapeFromCadMesh(source, response.positions, response.normals, response.indices, response.brep, response.deflection ?? SKETCH_CAD_DEFLECTION);
  if (!shape) throw new Error("OpenCascade returned an empty sketch solid");
  // Built in the sketch's own coordinates, not baked where a body stands: no pose to keep.
  return { ...shape, sketchProfile: cloneSketchProfile(profile), sketchOperation: "extrude" as const, sketchPose: undefined };
}

/**
 * A sketch swept along its path (#400): the closed outlines are the cross-section, the construction
 * line the path. An exact CAD body like an extruded one, so Fillet, Chamfer and the STEP export work.
 * Throws with a sentence for what is missing or what the kernel cannot sweep.
 */
export async function cadShapeFromSketchSweep(profile: SketchProfile, existing?: WorkplaneShape | null) {
  const planned = sweepPlan(profile);
  if ("problem" in planned) {
    throw new Error(t(planned.problem === "no-profile" ? "sketch.sweepNoProfile" : planned.problem === "no-path" ? "sketch.sweepNoPath" : "sketch.sweepManyPaths"));
  }
  const response = await requestSketchCad({ type: "build", profile: cloneSketchProfile(profile), height: MIN_SHAPE_DIMENSION, sweep: true }, SKETCH_SWEEP_TIMEOUT_MS);
  if (response.type === "error") throw new Error(t("sketch.sweepFailed"));
  const source = canonicalizeShape({
    ...(existing ?? {
      id: createLocalId("sketch-sweep"),
      name: "Sketch sweep",
      kind: "mesh" as const,
      color: "#3d8fb5",
      x: 0,
      z: 0,
      size: 1,
      width: 1,
      depth: 1,
      height: MIN_SHAPE_DIMENSION,
      rotation: 0,
    }),
    sketchProfile: cloneSketchProfile(profile),
    sketchOperation: "sweep",
    edgeTreatments: undefined,
    edgeTreatmentHistory: undefined,
    cadDisplayEdges: undefined,
    cadDisplayEdgesVersion: undefined,
  });
  const shape = shapeFromCadMesh(source, response.positions, response.normals, response.indices, response.brep, response.deflection ?? SKETCH_CAD_DEFLECTION);
  if (!shape) throw new Error(t("sketch.sweepFailed"));
  return { ...shape, sketchProfile: cloneSketchProfile(profile), sketchOperation: "sweep" as const };
}

/**
 * A loft from the outline of one sketch to the outline of another, each placed where its body stands: an exact CAD body
 * standing in the world, so its middle and bottom are where the loft is. A sketch built as a line goes as that line,
 * which the kernel widens itself so its corners stay arcs; where it cannot, `filled` gives the line's area as straight
 * pieces instead. Throws with a sentence for what does not fit.
 */
export async function cadShapeFromSketchLoft(bottom: SketchLoftSection & { filled: SketchProfile }, top: SketchLoftSection & { filled: SketchProfile }) {
  const section = ({ profile, stroke, place }: SketchLoftSection): SketchLoftSection => ({ profile: cloneSketchProfile(profile), ...(stroke ? { stroke } : {}), place });
  const build = (lower: SketchLoftSection, upper: SketchLoftSection) =>
    requestSketchCad({ type: "build", profile: cloneSketchProfile(lower.profile), height: MIN_SHAPE_DIMENSION, loft: { bottom: section(lower), top: section(upper) } });
  let response = await build(bottom, top);
  if (response.type === "error" && response.message === SKETCH_LOFT_STROKE_UNSUPPORTED) {
    response = await build({ profile: bottom.filled, place: bottom.place }, { profile: top.filled, place: top.place });
  }
  if (response.type === "error") {
    throw new Error(response.message === SKETCH_LOFT_OUTLINES
      ? t("status.loftOneOutline")
      : response.message === SKETCH_LOFT_HOLES
        ? t("status.loftHoles")
        : response.message === SKETCH_LOFT_FAILED ? t("status.loftFailed") : response.message);
  }
  const source = canonicalizeShape({
    id: createLocalId("sketch-loft"),
    name: "Loft",
    kind: "mesh",
    color: "#d41721",
    x: 0,
    z: 0,
    size: 1,
    width: 1,
    depth: 1,
    height: 1,
    rotation: 0,
  });
  const shape = shapeFromCadMesh(source, response.positions, response.normals, response.indices, response.brep, response.deflection ?? SKETCH_CAD_DEFLECTION);
  if (!shape) throw new Error(t("status.loftFailed"));
  return shape;
}

/**
 * A revolved sketch as an exact CAD body, like an extruded one: the profile is turned about the
 * axis by OpenCascade, so Hollow, Fillet and Chamfer work on it and it has a few hundred
 * triangles, not tens of thousands (#167). Null when the profile cannot be built that way (it
 * crosses the axis) or the kernel refuses; the mesh revolve takes over then.
 */
/**
 * What a revolve turns: the sketch as drawn, or, with a stroke, the band the line makes - an open
 * line of a width turns into a thin wall, as a vase is drawn in Tinkercad (#347). The band is
 * cut off at the axis. The body keeps the drawn line, as an extruded stroke does.
 */
export function revolveBuildProfile(runtime: ManifoldToplevel, profile: SketchProfile): SketchProfile {
  if (!profile.stroke) return profile;
  const stroked = strokedSketchProfile(runtime, profile, { clipToRevolveSide: true });
  if (!stroked) throw new Error(t("sketch.strokeEmpty"));
  return stroked;
}

async function cadShapeFromSketchRevolve(
  profile: SketchProfile,
  settings: SketchRevolveSettings,
  existing?: WorkplaneShape | null,
  drawn: SketchProfile = profile,
): Promise<WorkplaneShape | null> {
  // A helix has no exact body yet; the mesh revolve winds it.
  if (!revolveProfileFitsAxis(profile) || settings.pitch) return null;
  try {
    const response = await requestSketchCad({
      type: "build",
      profile: cloneSketchProfile(profile),
      height: MIN_SHAPE_DIMENSION,
      revolve: { startAngle: settings.startAngle, sweepAngle: settings.sweepAngle },
    });
    if (response.type === "error") return null;
    const source = canonicalizeShape({
      id: existing?.id ?? createLocalId("sketch-revolve"),
      name: existing?.name ?? "Sketch revolve",
      kind: "mesh",
      color: existing?.color ?? "#78b96b",
      hole: existing?.hole,
      x: 0,
      z: 0,
      elevation: 0,
      size: 1,
      width: 1,
      depth: 1,
      height: MIN_SHAPE_DIMENSION,
      rotation: 0,
      sketchProfile: cloneSketchProfile(drawn),
      sketchOperation: "revolve",
      sketchRevolve: settings,
      locked: existing?.locked ?? false,
      hidden: existing?.hidden ?? false,
    } satisfies WorkplaneShape);
    const shape = shapeFromCadMesh(source, response.positions, response.normals, response.indices, response.brep, response.deflection ?? SKETCH_CAD_DEFLECTION);
    if (!shape) return null;
    // Like the mesh revolve: the body stands at the origin (or where the edited one stood); the
    // exact body keeps its own frame, so it follows the move.
    return canonicalizeShape({
      ...shape,
      x: existing?.x ?? 0,
      z: existing?.z ?? 0,
      elevation: existing?.elevation ?? 0,
      sketchProfile: cloneSketchProfile(drawn),
      sketchOperation: "revolve",
      sketchRevolve: settings,
    });
  } catch {
    return null;
  }
}

export async function shapeFromRevolvedSketchProfile(
  profile: SketchProfile,
  settings: Partial<SketchRevolveSettings>,
  existing?: WorkplaneShape | null,
) {
  const runtime = await getManifoldRuntime();
  const buildProfile = revolveBuildProfile(runtime, profile);
  const exact = await cadShapeFromSketchRevolve(buildProfile, normalizeSketchRevolveSettings(settings), existing, profile);
  if (exact) return exact;
  const normalizedSettings = normalizeSketchRevolveSettings(settings);
  const mesh = buildSketchRevolveMesh(runtime, buildProfile, normalizedSettings);
  return canonicalizeShape({
    id: existing?.id ?? createLocalId("sketch-revolve"),
    name: existing?.name ?? "Sketch revolve",
    kind: "mesh",
    color: existing?.color ?? "#78b96b",
    hole: existing?.hole,
    x: existing?.x ?? 0,
    z: existing?.z ?? 0,
    elevation: existing?.elevation ?? 0,
    size: Math.max(mesh.width, mesh.depth),
    width: mesh.width,
    depth: mesh.depth,
    height: mesh.height,
    rotation: existing?.rotation ?? 0,
    rotationX: existing?.rotationX ?? 0,
    rotationZ: existing?.rotationZ ?? 0,
    mirrorX: existing?.mirrorX,
    mirrorY: existing?.mirrorY,
    mirrorZ: existing?.mirrorZ,
    importedMesh: {
      positions: mesh.positions,
      baseWidth: mesh.width,
      baseDepth: mesh.depth,
      baseHeight: mesh.height,
      triangleCount: mesh.triangleCount,
      sourceFormat: "json",
    },
    sketchProfile: cloneSketchProfile(profile),
    sketchOperation: "revolve",
    sketchRevolve: normalizedSettings,
    locked: existing?.locked ?? false,
    hidden: existing?.hidden ?? false,
  } satisfies WorkplaneShape);
}

export function shapeFromCadMesh(
  source: WorkplaneShape,
  positions: Float32Array,
  normals: Float32Array,
  indices: Uint32Array,
  brep: string,
  deflection?: CadModifierDeflection,
): WorkplaneShape | null {
  if (positions.length < 9 || indices.length < 3) return null;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < positions.length; index += 3) {
    minX = Math.min(minX, positions[index]);
    minY = Math.min(minY, positions[index + 1]);
    minZ = Math.min(minZ, positions[index + 2]);
    maxX = Math.max(maxX, positions[index]);
    maxY = Math.max(maxY, positions[index + 1]);
    maxZ = Math.max(maxZ, positions[index + 2]);
  }
  if (![minX, minY, minZ, maxX, maxY, maxZ].every(Number.isFinite)) return null;
  const meshCenterX = (minX + maxX) / 2;
  const meshCenterZ = (minZ + maxZ) / 2;
  const rawWidth = Math.max(MIN_SHAPE_DIMENSION, maxX - minX);
  const rawHeight = Math.max(MIN_SHAPE_DIMENSION, maxY - minY);
  const rawDepth = Math.max(MIN_SHAPE_DIMENSION, maxZ - minZ);
  // The kernel's mesh is the exact body cut into facets, so a round side measures a few hundredths short of the body:
  // a 38.7 mm cylinder hollowed showed 38.69, and typing 38.7 again stretched the body before it into an ellipse that
  // drifted further with every try (Jürgen Keller, 25.10.2026). A size or place within the facets' reach of what the
  // body had before is the body's own, so it keeps it; the mesh is stretched by that hair to meet the true surface.
  const near = Math.min(0.1, Math.max(0.02, 2 * (deflection?.linear ?? source.cadMeshDeflection?.linear ?? 0)));
  const unturned = !source.rotation && !source.rotationX && !source.rotationZ;
  const exact = (measured: number, before: number | undefined) => (
    unturned && typeof before === "number" && Number.isFinite(before) && Math.abs(measured - before) <= near ? before : measured
  );
  const centerX = exact(meshCenterX, source.x);
  const centerZ = exact(meshCenterZ, source.z);
  const bottom = exact(minY, source.elevation ?? 0);
  const flattenedPositions: number[] = [];
  const flattenedNormals: number[] = [];
  for (let index = 0; index < indices.length; index += 1) {
    const vertex = indices[index] * 3;
    flattenedPositions.push(positions[vertex] - centerX, positions[vertex + 1] - bottom, positions[vertex + 2] - centerZ);
    if (normals.length >= vertex + 3) flattenedNormals.push(normals[vertex], normals[vertex + 1], normals[vertex + 2]);
  }
  const width = cleanModelDimension(exact(rawWidth, shapeWidth(source)));
  const height = cleanModelDimension(exact(rawHeight, source.height));
  const depth = cleanModelDimension(exact(rawDepth, shapeDepth(source)));
  return canonicalizeShape({
    ...source,
    kind: "mesh",
    x: cleanNearZero(centerX, 0.0005),
    z: cleanNearZero(centerZ, 0.0005),
    elevation: cleanNearZero(bottom, 0.0005),
    width,
    depth,
    height,
    size: Math.max(width, depth),
    rotation: 0,
    rotationX: 0,
    rotationZ: 0,
    mirrorX: undefined,
    mirrorY: undefined,
    mirrorZ: undefined,
    radius: undefined,
    // The CAD result is already generated from the final tapered surface. Do
    // not carry the parametric taper fields onto this baked mesh or the viewport
    // and subsequent mesh exports will apply the deformation a second time.
    taperTopWidth: undefined,
    taperTopDepth: undefined,
    taperBottomWidth: undefined,
    taperBottomDepth: undefined,
    taperTopScale: undefined,
    taperBottomScale: undefined,
    // Twist and lean are in the mesh as well, so they go the way the taper does.
    extrudeTwist: undefined,
    extrudeTopOffsetX: undefined,
    extrudeTopOffsetZ: undefined,
    // So is a slope along.
    slopeEnd: undefined,
    slopeSide: undefined,
    slopeCurve: undefined,
    narrowEnd: undefined,
    narrowSide: undefined,
    narrowCurve: undefined,
    narrowStart: undefined,
    importedMesh: {
      positions: flattenedPositions,
      normals: flattenedNormals.length === flattenedPositions.length ? flattenedNormals : undefined,
      baseWidth: rawWidth,
      baseDepth: rawDepth,
      baseHeight: rawHeight,
      triangleCount: Math.floor(indices.length / 3),
      sourceFormat: "json",
    },
    imagePlate: undefined,
    cadBrep: brep,
    cadMeshDeflection: deflection ?? source.cadMeshDeflection,
    cadBrepFrame: {
      x: cleanNearZero(centerX, 0.0005),
      z: cleanNearZero(centerZ, 0.0005),
      elevation: cleanNearZero(bottom, 0.0005),
      width,
      depth,
      height,
    },
    cadPrimitiveFrame: undefined,
    // The turn and place are baked in now: a sketch body keeps where its sketch lay, for Edit sketch (#1006).
    sketchPose: bakedSketchPose(source),
  });
}

/** A group's triangles part by part, by the range of vertices each visible part takes in the group's mesh; null for a single body or a mesh that does not add up. */function groupPartFaces(shape: WorkplaneShape, mesh: ReturnType<typeof meshForShape>): number[][][] | null {
  const children = (shape.groupedShapes ?? []).filter((entry) => !entry.hidden);
  if (children.length < 2) return null;
  const ends: number[] = [];
  let end = 0;
  for (const child of children) {
    try {
      end += meshForShape(child).vertices.length;
    } catch {
      return null;
    }
    ends.push(end);
  }
  if (end !== mesh.vertices.length) return null;
  const parts: number[][][] = children.map(() => []);
  mesh.faces.forEach((face) => {
    const part = ends.findIndex((partEnd) => face[0] < partEnd);
    if (part >= 0) parts[part].push(face);
  });
  return parts.filter((faces) => faces.length > 0);
}

/**
 * A body as the sketch shows it on a workplane. With `seen` (a workplane on a face) the sketch shows each part as it is seen
 * from the plane, not only the face on it (#778): a plane set on a facet of a round body stands a little askew, and the face
 * "on the plane" was then a thin strip of one end, with the parts behind it left out.
 *
 * `mirrorAbout`: the sketch of a mirrored body is shown as it was drawn, not mirrored, so the bodies around it are mirrored
 * to match, about the place of the body's middle in the sketch's own coordinates (#896).
 */
export type SketchMirrorAbout = { x?: number; z?: number };

export function sketchReferenceShapeOnWorkplane(shape: WorkplaneShape, workplane: PlacementWorkplane, seen = false, mirrorAbout?: SketchMirrorAbout): WorkplaneShape {
  const mesh = meshForShape(shape);
  const projectedVertices = mesh.vertices.map(([x, y, z]) => {
    const local = placementWorkplaneCoordinates(workplane, { x, y, z });
    return {
      x: mirrorAbout?.x !== undefined ? 2 * mirrorAbout.x - local.x : local.x,
      y: -local.y,
      z: mirrorAbout?.z !== undefined ? 2 * mirrorAbout.z - local.z : local.z,
    };
  });
  // One mirror turns the triangles inside out; two do not.
  const reversed = (mirrorAbout?.x !== undefined) !== (mirrorAbout?.z !== undefined);
  // A loop, not Math.min(...list): a large imported mesh has more points than a call takes
  // arguments, and the spread overflowed the stack when the design was opened (#190).
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  for (const vertex of projectedVertices) {
    if (vertex.x < minX) minX = vertex.x;
    if (vertex.x > maxX) maxX = vertex.x;
    if (vertex.y < minY) minY = vertex.y;
    if (vertex.y > maxY) maxY = vertex.y;
    if (vertex.z < minZ) minZ = vertex.z;
    if (vertex.z > maxZ) maxZ = vertex.z;
  }
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const triangle = ([a, b, c]: number[]) => (reversed ? [a, c, b] : [a, b, c]).flatMap((index) => {
    const vertex = projectedVertices[index];
    return [vertex.x - centerX, vertex.y - centerY, vertex.z - centerZ];
  });
  // A group keeps its parts apart, part after part, so that the sketch shows the outline of each (#778). The mesh holds the
  // visible parts one after the other.
  const parts = seen ? groupPartFaces(shape, mesh) ?? [mesh.faces] : null;
  const positions = (parts ?? [mesh.faces]).flatMap((faces) => faces.flatMap(triangle));
  const width = Math.max(0.01, maxX - minX);
  const depth = Math.max(0.01, maxZ - minZ);
  const height = Math.max(0.01, maxY - minY);

  return canonicalizeShape({
    ...shape,
    kind: "mesh",
    x: centerX,
    z: centerZ,
    elevation: 0,
    size: Math.max(width, depth),
    width,
    depth,
    height,
    rotation: 0,
    rotationX: 0,
    rotationZ: 0,
    mirrorX: undefined,
    mirrorY: undefined,
    mirrorZ: undefined,
    importedMesh: {
      positions,
      baseWidth: width,
      baseDepth: depth,
      baseHeight: height,
      triangleCount: mesh.faces.length,
      partTriangleCounts: parts?.map((faces) => faces.length),
      sourceFormat: "json",
    },
    groupedShapes: undefined,
    edgeTreatments: undefined,
    edgeTreatmentHistory: undefined,
    cadDisplayEdges: undefined,
    cadBrep: undefined,
    cadBrepFrame: undefined,
    cadPrimitiveFrame: undefined,
  });
}

export function defaultMcpSketchProfile(width: number, depth: number): SketchProfile {
  const halfWidth = Math.max(0.01, width) / 2;
  const halfDepth = Math.max(0.01, depth) / 2;
  const pointIds = ["mcp-sketch-a", "mcp-sketch-b", "mcp-sketch-c", "mcp-sketch-d"].map((prefix) => createLocalId(prefix));
  return {
    points: [
      { id: pointIds[0], x: -halfWidth, z: -halfDepth, mode: "corner" },
      { id: pointIds[1], x: halfWidth, z: -halfDepth, mode: "corner" },
      { id: pointIds[2], x: halfWidth, z: halfDepth, mode: "corner" },
      { id: pointIds[3], x: -halfWidth, z: halfDepth, mode: "corner" },
    ],
    segments: [
      { id: createLocalId("mcp-sketch-segment"), startId: pointIds[0], endId: pointIds[1], kind: "line" },
      { id: createLocalId("mcp-sketch-segment"), startId: pointIds[1], endId: pointIds[2], kind: "line" },
      { id: createLocalId("mcp-sketch-segment"), startId: pointIds[2], endId: pointIds[3], kind: "line" },
      { id: createLocalId("mcp-sketch-segment"), startId: pointIds[3], endId: pointIds[0], kind: "line" },
    ],
    images: [],
  };
}

/** The kind of body a sketch body was made as; bodies from before `sketchOperation` was kept tell it by their revolve settings. */
export function sketchBodyOperation(shape: WorkplaneShape): SketchOperation {
  return shape.sketchOperation ?? (shape.sketchRevolve ? "revolve" : "extrude");
}

/**
 * An outline moved left until its rightmost point lies on a revolve's axis, x = 0 (#655): an imported SVG
 * is centred on itself, so the half cross-section of a vase would reach across the axis. Pictures and a
 * key ring hole move with it; an outline already left of the axis stays where it is.
 */
export function sketchProfileLeftOfAxis(profile: SketchProfile): SketchProfile {
  if (!profile.points.length) return profile;
  const shift = Math.max(...profile.points.map((point) => point.x));
  if (shift <= 1e-6) return profile;
  const move = (point: { x: number; z: number }) => ({ x: point.x - shift, z: point.z });
  return {
    ...profile,
    points: profile.points.map((point) => ({
      ...point,
      x: point.x - shift,
      ...(point.handleIn ? { handleIn: move(point.handleIn) } : {}),
      ...(point.handleOut ? { handleOut: move(point.handleOut) } : {}),
    })),
    images: (profile.images ?? []).map((image) => ({ ...image, x: image.x - shift })),
    ...(profile.keyring ? { keyring: { ...profile.keyring, x: profile.keyring.x - shift } } : {}),
  };
}

/**
 * A sketch body made again from its outline as another kind of body (#655): an imported SVG comes in
 * extruded, revolved it gives a vase. The new body takes the old one's place, name and colour and stands
 * where it stood, its foot at the same height. A revolve takes the outline left of its axis; an extrusion
 * made from another kind is 10 mm high, as a new sketch is. Edge treatments go, as when a sketch is edited.
 */
export async function sketchBodyAsOperation(
  existing: WorkplaneShape,
  profile: SketchProfile,
  operation: SketchOperation,
  revolveSettings: Partial<SketchRevolveSettings> = existing.sketchRevolve ?? {},
) {
  const built = operation === "revolve"
    ? await shapeFromRevolvedSketchProfile(sketchProfileLeftOfAxis(profile), revolveSettings, null)
    : operation === "sweep"
      ? await cadShapeFromSketchSweep(profile, null)
      : await cadShapeFromSketchProfile(profile, 10, null);
  if (!built) return null;
  return canonicalizeShape({
    ...built,
    id: existing.id,
    name: existing.name,
    color: existing.color,
    hole: existing.hole,
    x: existing.x,
    z: existing.z,
    elevation: existing.elevation ?? 0,
    rotation: existing.rotation,
    locked: existing.locked,
    hidden: existing.hidden,
  });
}
