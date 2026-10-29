/**
 * A surface texture on a shape (see surfaceTexture.ts): the body's mesh goes
 * in, and a mesh body with the relief takes its place, remembering the
 * settings it was made with. The body under the relief goes with it in the
 * history that fillets and hollowing keep, so the texture can be made again
 * with other settings, or taken off, also after saving.
 *
 * The texture is computed on a worker of its own: a large body takes a few
 * seconds, and the editor stays usable meanwhile.
 */

import { isBuildMessage, reportWorkerBuild } from "@/lib/buildStamp";
import { cloneWorkplaneShapeSnapshot, compactEdgeTreatmentHistory, edgeTreatmentAppliedFrame, restoreShapeBeforeEdgeTreatment } from "@/lib/edgeTreatmentHistory";
import { MIN_SHAPE_DIMENSION, cleanModelDimension, meshAabb, meshForShape } from "@/lib/editorMeshCore";
import { t, type MessageKey } from "@/lib/i18n";
import { createLocalId } from "@/lib/localIds";
import {
  applySurfaceTexture,
  normalizeSurfaceTexture,
  surfaceTexturePositions,
  SURFACE_TEXTURE_MAX_MASK_PLANES,
  type SurfaceTextureCarbonWeave,
  type SurfaceTextureBrickBond,
  type SurfaceTextureBarkType,
  type SurfaceTextureCrackStart,
  type SurfaceTextureCrackStyle,
  type SurfaceTextureDetail,
  type SurfaceTextureDirection,
  type SurfaceTextureImage,
  type SurfaceTextureMask,
  type SurfaceTextureMaskMode,
  type SurfaceTexturePattern,
  type SurfaceTextureProfile,
  type SurfaceTextureProjection,
  type SurfaceTextureSettings,
  type SurfaceTextureWoodCut,
  type SurfaceTextureWoodType,
  type SurfaceTextureStats,
  type SurfaceTextureTiling,
  type SurfaceTextureCapEdge,
  type SurfaceTextureCapStyle,
} from "@/lib/surfaceTexture";
import { canonicalizeShape, cleanNearZero, isNonSolidShapeKind } from "@/lib/workplaneShapes";
import type { EdgeTreatmentHistoryEntry, ShapeKind, WorkplaneShape } from "@/types/layerling";

export type SurfaceTextureWorkerRequest = {
  requestId: number;
  /** The body's triangles, nine numbers each, in the editor's inside frame. */
  positions: Float64Array;
  settings: SurfaceTextureSettings;
  maxTriangles?: number;
};

export type SurfaceTextureWorkerResponse =
  | { requestId: number; positions: Float64Array; stats: SurfaceTextureStats; fill: Float64Array | null }
  | { requestId: number; error: string };

/** The textured body's triangles and, for cracks with gold, the triangles of the gold filling their notch. */
export type SurfaceTextureOutcome = { positions: Float64Array; stats: SurfaceTextureStats; fill: Float64Array | null };

/** The colour the gold of the cracks comes in. */
export const SURFACE_TEXTURE_GOLD = "#d4a72c";

/** The words for every choice, as the panel and the status line show them. */
export const SURFACE_TEXTURE_LABELS: {
  pattern: Record<SurfaceTexturePattern, MessageKey>;
  profile: Record<SurfaceTextureProfile, MessageKey>;
  /** The same profiles as the shape of a bump. */
  bumpShape: Record<SurfaceTextureProfile, MessageKey>;
  direction: Record<SurfaceTextureDirection, MessageKey>;
  projection: Record<SurfaceTextureProjection, MessageKey>;
  projectionHint: Record<SurfaceTextureProjection, MessageKey>;
  detail: Record<SurfaceTextureDetail, MessageKey>;
  mask: Record<SurfaceTextureMaskMode | "none", MessageKey>;
  crackStyle: Record<SurfaceTextureCrackStyle, MessageKey>;
  crackStart: Record<SurfaceTextureCrackStart, MessageKey>;
  carbonWeave: Record<SurfaceTextureCarbonWeave, MessageKey>;
  carbonWeaveHint: Record<SurfaceTextureCarbonWeave, MessageKey>;
  brickBond: Record<SurfaceTextureBrickBond, MessageKey>;
  brickBondHint: Record<SurfaceTextureBrickBond, MessageKey>;
  barkType: Record<SurfaceTextureBarkType, MessageKey>;
  barkTypeHint: Record<SurfaceTextureBarkType, MessageKey>;
  woodType: Record<SurfaceTextureWoodType, MessageKey>;
  woodCut: Record<SurfaceTextureWoodCut, MessageKey>;
  woodCutHint: Record<SurfaceTextureWoodCut, MessageKey>;
  image: Record<SurfaceTextureImage, MessageKey>;
  tiling: Record<SurfaceTextureTiling, MessageKey>;
  capStyle: Record<SurfaceTextureCapStyle, MessageKey>;
  capEdge: Record<SurfaceTextureCapEdge, MessageKey>;
  capEdgeHint: Record<SurfaceTextureCapEdge, MessageKey>;
} = {
  pattern: {
    grooves: "surfaceTexture.grooves",
    knurl: "surfaceTexture.knurl",
    honeycomb: "surfaceTexture.honeycomb",
    bumps: "surfaceTexture.bumps",
    cells: "surfaceTexture.cells",
    bricks: "surfaceTexture.bricks",
    knit: "surfaceTexture.knit",
    rope: "surfaceTexture.rope",
    weave: "surfaceTexture.weave",
    carbon: "surfaceTexture.carbon",
    bark: "surfaceTexture.bark",
    wood: "surfaceTexture.wood",
    grain: "surfaceTexture.grain",
    image: "surfaceTexture.image",
    cracks: "surfaceTexture.cracks",
    text: "surfaceTexture.text",
  },
  profile: { round: "surfaceTexture.round", pointed: "surfaceTexture.pointed", flat: "surfaceTexture.flat", dome: "surfaceTexture.dome" },
  bumpShape: { dome: "surfaceTexture.bumpDome", pointed: "surfaceTexture.bumpCone", round: "surfaceTexture.bumpSoft", flat: "surfaceTexture.bumpFlat" },
  direction: { inward: "surfaceTexture.inward", outward: "surfaceTexture.outward", both: "surfaceTexture.both" },
  projection: { auto: "surfaceTexture.auto", cylinder: "surfaceTexture.cylinder", allRound: "surfaceTexture.allRound", flat: "surfaceTexture.flatProjection" },
  projectionHint: { auto: "surfaceTexture.autoHint", cylinder: "surfaceTexture.cylinderHint", allRound: "surfaceTexture.allRoundHint", flat: "surfaceTexture.flatHint" },
  detail: { coarse: "surfaceTexture.coarse", medium: "surfaceTexture.medium", fine: "surfaceTexture.fine" },
  mask: { none: "surfaceTexture.maskNone", exclude: "surfaceTexture.maskExclude", only: "surfaceTexture.maskOnly" },
  crackStyle: { crack: "surfaceTexture.crackStyleCrack", lightning: "surfaceTexture.crackStyleLightning" },
  crackStart: { top: "surfaceTexture.crackStartTop", bottom: "surfaceTexture.crackStartBottom", rim: "surfaceTexture.crackStartRim", anywhere: "surfaceTexture.crackStartAnywhere" },
  carbonWeave: { twill22: "surfaceTexture.carbonTwill22", twill21: "surfaceTexture.carbonTwill21", twill31: "surfaceTexture.carbonTwill31" },
  carbonWeaveHint: { twill22: "surfaceTexture.carbonTwill22Hint", twill21: "surfaceTexture.carbonTwill21Hint", twill31: "surfaceTexture.carbonTwill31Hint" },
  brickBond: {
    running: "surfaceTexture.bondRunning",
    stack: "surfaceTexture.bondStack",
    english: "surfaceTexture.bondEnglish",
    englishCross: "surfaceTexture.bondEnglishCross",
    flemish: "surfaceTexture.bondFlemish",
  },
  brickBondHint: {
    running: "surfaceTexture.bondRunningHint",
    stack: "surfaceTexture.bondStackHint",
    english: "surfaceTexture.bondEnglishHint",
    englishCross: "surfaceTexture.bondEnglishCrossHint",
    flemish: "surfaceTexture.bondFlemishHint",
  },
  barkType: { oak: "surfaceTexture.barkOak", pine: "surfaceTexture.barkPine", spruce: "surfaceTexture.barkSpruce", birch: "surfaceTexture.barkBirch", beech: "surfaceTexture.barkBeech" },
  barkTypeHint: {
    oak: "surfaceTexture.barkOakHint",
    pine: "surfaceTexture.barkPineHint",
    spruce: "surfaceTexture.barkSpruceHint",
    birch: "surfaceTexture.barkBirchHint",
    beech: "surfaceTexture.barkBeechHint",
  },
  woodType: { oak: "surfaceTexture.woodOak", ash: "surfaceTexture.woodAsh", beech: "surfaceTexture.woodBeech", pine: "surfaceTexture.woodPine", walnut: "surfaceTexture.woodWalnut" },
  woodCut: { log: "surfaceTexture.woodCutLog", flatSawn: "surfaceTexture.woodCutFlatSawn", quarterSawn: "surfaceTexture.woodCutQuarterSawn" },
  woodCutHint: { log: "surfaceTexture.woodCutLogHint", flatSawn: "surfaceTexture.woodCutFlatSawnHint", quarterSawn: "surfaceTexture.woodCutQuarterSawnHint" },
  image: {
    topography: "surfaceTexture.imageTopography",
    wood: "surfaceTexture.imageWood",
    woodRift: "surfaceTexture.imageWoodRift",
    guilloche: "surfaceTexture.imageGuilloche",
    terrazzo: "surfaceTexture.imageTerrazzo",
    craquelure: "surfaceTexture.imageCraquelure",
    cord: "surfaceTexture.imageCord",
    moire: "surfaceTexture.imageMoire",
    mosaic: "surfaceTexture.imageMosaic",
    folds: "surfaceTexture.imageFolds",
    fingerprint: "surfaceTexture.imageFingerprint",
    rosettes: "surfaceTexture.imageRosettes",
    own: "surfaceTexture.imageOwn",
  },
  tiling: { repeat: "surfaceTexture.tilingRepeat", mirror: "surfaceTexture.tilingMirror", staggered: "surfaceTexture.tilingStaggered" },
  capStyle: { auto: "surfaceTexture.capAuto", rows: "surfaceTexture.capRows", rings: "surfaceTexture.capRings" },
  capEdge: { auto: "surfaceTexture.edgeAuto", sharp: "surfaceTexture.edgeSharp", over: "surfaceTexture.edgeOver", fold: "surfaceTexture.edgeFold", bead: "surfaceTexture.edgeBead" },
  capEdgeHint: { auto: "surfaceTexture.edgeAutoHint", sharp: "surfaceTexture.edgeSharpHint", over: "surfaceTexture.edgeOverHint", fold: "surfaceTexture.edgeFoldHint", bead: "surfaceTexture.edgeBeadHint" },
};

/** The pattern's name in the current language. */
export function surfacePatternLabel(pattern: SurfaceTexturePattern) {
  return t(SURFACE_TEXTURE_LABELS.pattern[pattern] ?? "surfaceTexture.knurl");
}

/** Whether a texture can go on this shape: one solid body, not locked, and not textured already (a texture is changed instead). */
export function canTextureSurface(shape: WorkplaneShape | null | undefined) {
  return Boolean(shape && !shape.locked && !shape.surfaceTexture && shape.groupOperation !== "bundle" && !isNonSolidShapeKind(shape.kind));
}

/**
 * The history entry of the texture a body carries, with the body under it: only while the texture is the body's
 * last step. A texture with steps after it, or one made before bodies kept what was under them, has none.
 */
export function surfaceTextureEntry(shape: WorkplaneShape | null | undefined): EdgeTreatmentHistoryEntry | null {
  const last = shape?.surfaceTexture ? shape.edgeTreatmentHistory?.at(-1) : undefined;
  return last?.feature.kind === "surfaceTexture" ? last : null;
}

/** Whether the texture on this body can be changed or taken off: it has the body under it, and it is not locked. */
export function canChangeSurfaceTexture(shape: WorkplaneShape | null | undefined) {
  return Boolean(shape && !shape.locked && surfaceTextureEntry(shape));
}

/** The body under a texture, where and how large the textured body stands now: what Remove gives back, and what Change textures again. */
export function shapeUnderSurfaceTexture(shape: WorkplaneShape): WorkplaneShape | null {
  const entry = surfaceTextureEntry(shape);
  return entry ? restoreShapeBeforeEdgeTreatment(shape, entry) : null;
}

/** Whether the panel shows the texture card for this shape: for every solid body, textured ones say what they carry. */
export function offersSurfaceTexture(shape: WorkplaneShape | null | undefined) {
  return Boolean(shape && shape.groupOperation !== "bundle" && !isNonSolidShapeKind(shape.kind));
}

/** Kinds of body that can be a texture mask: convex ones, which the planes of their faces describe exactly. */
export const SURFACE_TEXTURE_MASK_KINDS: readonly ShapeKind[] = ["box", "roundedBox", "cylinder", "ellipse", "sphere", "halfSphere", "cone", "pyramid"];

/** Whether this body can be a texture mask (it carries no texture itself). */
export function offersSurfaceTextureMask(shape: WorkplaneShape | null | undefined) {
  return Boolean(shape && SURFACE_TEXTURE_MASK_KINDS.includes(shape.kind) && !shape.groupedShapes?.length && !shape.surfaceTexture && !shape.importedMesh);
}

/**
 * A convex body as a mask: the planes of its faces, pointing out, with its box, where it stands in
 * the design (inside frame). Faces of one plane give it once. Null when the body has too many
 * faces to test quickly.
 */
export function surfaceTextureMaskOf(shape: WorkplaneShape, mode: SurfaceTextureMaskMode): SurfaceTextureMask | null {
  const mesh = meshForShape(shape);
  if (!mesh.vertices.length) return null;
  const centroid = [0, 0, 0];
  const box = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  mesh.vertices.forEach(([x, y, z]) => {
    centroid[0] += x / mesh.vertices.length;
    centroid[1] += y / mesh.vertices.length;
    centroid[2] += z / mesh.vertices.length;
    box[0] = Math.min(box[0], x); box[1] = Math.min(box[1], y); box[2] = Math.min(box[2], z);
    box[3] = Math.max(box[3], x); box[4] = Math.max(box[4], y); box[5] = Math.max(box[5], z);
  });
  const planes: number[] = [];
  const seen = new Set<string>();
  for (const [ia, ib, ic] of mesh.faces) {
    const [a, b, c] = [mesh.vertices[ia], mesh.vertices[ib], mesh.vertices[ic]];
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const wx = c[0] - a[0], wy = c[1] - a[1], wz = c[2] - a[2];
    let nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
    const length = Math.hypot(nx, ny, nz);
    if (length < 1e-9) continue;
    nx /= length; ny /= length; nz /= length;
    let d = nx * a[0] + ny * a[1] + nz * a[2];
    // Pointing out, whichever way the faces are wound: the middle of the body lies behind every face.
    if (nx * centroid[0] + ny * centroid[1] + nz * centroid[2] > d) {
      nx = -nx; ny = -ny; nz = -nz; d = -d;
    }
    const key = `${Math.round(nx * 1e4)},${Math.round(ny * 1e4)},${Math.round(nz * 1e4)},${Math.round(d * 1e3)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    planes.push(nx, ny, nz, d);
  }
  if (!planes.length || planes.length > SURFACE_TEXTURE_MAX_MASK_PLANES * 4) return null;
  return { mode, planes, box };
}

/** The masks a texture on `target` takes into account: bodies marked as masks that reach into its box. */
export function surfaceTextureMasksFor(target: WorkplaneShape, shapes: readonly WorkplaneShape[]) {
  const own = meshAabb(target);
  const masks: SurfaceTextureMask[] = [];
  for (const shape of shapes) {
    if (shape.id === target.id || !shape.surfaceTextureMask || !offersSurfaceTextureMask(shape)) continue;
    const box = meshAabb(shape);
    if (box.maxX < own.minX || box.minX > own.maxX || box.maxY < own.minY || box.minY > own.maxY || box.maxZ < own.minZ || box.minZ > own.maxZ) continue;
    const mask = surfaceTextureMaskOf(shape, shape.surfaceTextureMask);
    if (mask) masks.push(mask);
  }
  return masks;
}

/** The body's triangles as the texture takes them: nine numbers each, where they stand in the design (inside frame). */
export function surfaceTextureInput(shape: WorkplaneShape) {
  const mesh = meshForShape(shape);
  const out = new Float64Array(mesh.faces.length * 9);
  mesh.faces.forEach((face, index) => {
    for (let k = 0; k < 3; k += 1) {
      const [x, y, z] = mesh.vertices[face[k]];
      out[index * 9 + k * 3] = x;
      out[index * 9 + k * 3 + 1] = y;
      out[index * 9 + k * 3 + 2] = z;
    }
  });
  return out;
}

/** Texture a body's triangles here and now (tests, and where no worker can run). */
export function textureSurfacePositions(positions: Float64Array, settings: SurfaceTextureSettings, maxTriangles?: number): SurfaceTextureOutcome {
  const result = applySurfaceTexture(positions, settings, maxTriangles ? { maxTriangles } : {});
  return { positions: Float64Array.from(surfaceTexturePositions(result)), stats: result.stats, fill: result.fill ? Float64Array.from(surfaceTexturePositions(result.fill)) : null };
}

/** Triangles where they stand in the design, as a mesh body's box (centred on x and z, its bottom at the elevation) and points within it. */
function placedMesh(positions: ArrayLike<number>) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < positions.length; i += 3) {
    minX = Math.min(minX, positions[i]);
    maxX = Math.max(maxX, positions[i]);
    minY = Math.min(minY, positions[i + 1]);
    maxY = Math.max(maxY, positions[i + 1]);
    minZ = Math.min(minZ, positions[i + 2]);
    maxZ = Math.max(maxZ, positions[i + 2]);
  }
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const local = new Array<number>(positions.length);
  for (let i = 0; i < positions.length; i += 3) {
    local[i] = positions[i] - centerX;
    local[i + 1] = positions[i + 1] - minY;
    local[i + 2] = positions[i + 2] - centerZ;
  }
  const rawWidth = Math.max(MIN_SHAPE_DIMENSION, maxX - minX);
  const rawDepth = Math.max(MIN_SHAPE_DIMENSION, maxZ - minZ);
  const rawHeight = Math.max(MIN_SHAPE_DIMENSION, maxY - minY);
  const width = cleanModelDimension(rawWidth);
  const depth = cleanModelDimension(rawDepth);
  return {
    x: cleanNearZero(centerX, 0.0005),
    z: cleanNearZero(centerZ, 0.0005),
    elevation: cleanNearZero(minY, 0.0005),
    size: Math.max(width, depth),
    width,
    depth,
    height: cleanModelDimension(rawHeight),
    importedMesh: {
      positions: local,
      baseWidth: rawWidth,
      baseDepth: rawDepth,
      baseHeight: rawHeight,
      triangleCount: Math.floor(local.length / 9),
      sourceFormat: "json" as const,
    },
  };
}

/**
 * The gold of a body's cracks as a part of its own: it sits in the notch of the textured body, in gold,
 * remembering whose it is - a texture made again or taken off takes it along.
 */
export function surfaceTextureGoldShape(body: WorkplaneShape, positions: ArrayLike<number>, name: string): WorkplaneShape | null {
  if (positions.length < 9) return null;
  return canonicalizeShape({
    id: createLocalId("mesh"),
    name,
    kind: "mesh",
    color: SURFACE_TEXTURE_GOLD,
    rotation: 0,
    rotationX: 0,
    rotationZ: 0,
    ...placedMesh(positions),
    surfaceFillOf: body.id,
    hidden: body.hidden,
  });
}

/**
 * The scene with a body in place of the one with this id (textured anew, or the texture taken off), and the gold of
 * its cracks: the gold made before gives way, new gold (if any) comes in after the body.
 */
export function sceneWithSurfaceBody(shapes: readonly WorkplaneShape[], id: string, body: WorkplaneShape, gold: WorkplaneShape | null) {
  const out: WorkplaneShape[] = [];
  for (const shape of shapes) {
    if (shape.surfaceFillOf === id) continue;
    if (shape.id !== id) {
      out.push(shape);
      continue;
    }
    out.push(body);
    if (gold) out.push(gold);
  }
  return out;
}

/**
 * The shape the texture makes: a mesh body in place of the old one, standing where it stood
 * (its box centred on the old box, its bottom on the old bottom), with the settings it got.
 * Turns and mirroring are in the mesh already; the new body starts upright. Null when the
 * texture left nothing.
 */
export function surfaceTexturedShape(shape: WorkplaneShape, positions: ArrayLike<number>, settings: SurfaceTextureSettings, createdAt = Date.now()): WorkplaneShape | null {
  if (positions.length < 9) return null;
  const normalized = normalizeSurfaceTexture(settings);
  const textured = canonicalizeShape({
    id: shape.id,
    name: shape.name,
    kind: "mesh",
    color: shape.color,
    hole: shape.hole || undefined,
    rotation: 0,
    rotationX: 0,
    rotationZ: 0,
    ...placedMesh(positions),
    surfaceTexture: normalized,
    locked: false,
    hidden: shape.hidden,
  });
  // The body under the relief is kept as a fillet keeps the body before it, with the frame the
  // textured body stands in: moved, turned or scaled later, the body comes back the same way.
  return canonicalizeShape({
    ...textured,
    edgeTreatmentHistory: [
      ...compactEdgeTreatmentHistory(shape.edgeTreatmentHistory),
      {
        id: createLocalId("edge-history"),
        createdAt,
        feature: { kind: "surfaceTexture", amount: normalized.depth, edgeCount: 0, surfaceTexture: normalized },
        before: cloneWorkplaneShapeSnapshot(shape),
        appliedFrame: edgeTreatmentAppliedFrame(textured),
      },
    ],
  });
}

let worker: Worker | null = null;
let requestCounter = 0;
const pending = new Map<number, { resolve: (outcome: SurfaceTextureOutcome) => void; reject: (error: Error) => void; timer: number }>();

/** How long a texture may take before the editor gives up on it. */
const SURFACE_TEXTURE_TIMEOUT_MS = 120_000;

function ensureWorker() {
  if (worker) return worker;
  const next = new Worker(new URL("../workers/surfaceTexture.worker.ts", import.meta.url), { type: "module" });
  next.onmessage = (event: MessageEvent<SurfaceTextureWorkerResponse>) => {
    if (isBuildMessage(event.data)) {
      reportWorkerBuild(event.data);
      return;
    }
    const entry = pending.get(event.data.requestId);
    if (!entry) return;
    window.clearTimeout(entry.timer);
    pending.delete(event.data.requestId);
    if ("error" in event.data) entry.reject(new Error(event.data.error));
    else entry.resolve({ positions: event.data.positions, stats: event.data.stats, fill: event.data.fill });
  };
  next.onerror = () => {
    pending.forEach((entry) => {
      window.clearTimeout(entry.timer);
      entry.reject(new Error("The surface texture worker stopped"));
    });
    pending.clear();
    next.terminate();
    worker = null;
  };
  worker = next;
  return next;
}

/** Texture a body's triangles on the worker; where none can run, right here. */
export function textureSurfaceOffThread(positions: Float64Array, settings: SurfaceTextureSettings, maxTriangles?: number): Promise<SurfaceTextureOutcome> {
  if (typeof Worker === "undefined" || typeof window === "undefined") {
    try {
      return Promise.resolve(textureSurfacePositions(positions, settings, maxTriangles));
    } catch (error) {
      return Promise.reject(error instanceof Error ? error : new Error(String(error)));
    }
  }
  const target = ensureWorker();
  const requestId = ++requestCounter;
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      pending.delete(requestId);
      reject(new Error("The surface texture took too long"));
    }, SURFACE_TEXTURE_TIMEOUT_MS);
    pending.set(requestId, { resolve, reject, timer });
    const request: SurfaceTextureWorkerRequest = { requestId, positions, settings, ...(maxTriangles ? { maxTriangles } : {}) };
    target.postMessage(request, [positions.buffer]);
  });
}
