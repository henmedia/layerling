import * as THREE from "three";
import { toCreasedNormals } from "@/lib/creasedNormals";
import { isBuildMessage, reportWorkerBuild } from "@/lib/buildStamp";
import { printVolume, printWeight, vaseChecks, VASE_MODE_BOTTOM } from "@/lib/vase/vase-geometry.mjs";
import { buildParts, layoutParts, meshBox, placePoint, type VasePart } from "@/lib/vase/vase-parts.mjs";
import { t, type MessageKey } from "@/lib/i18n";
import { createLocalId } from "@/lib/localIds";
import { buildVaseBody, type VaseBody, type VaseBodyWorkerRequest, type VaseBodyWorkerResponse } from "@/lib/vaseBody";
import { normalizeVaseSettings, vaseSettingsInFrame, type VaseSettings } from "@/lib/vaseSettings";
import { canonicalizeShape, cleanNearZero, shapeDepth, shapeWidth } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

/**
 * The vase, a shape of its own: a body from a body form (a preset or drawn), a
 * cross-section (circle, polygon, wave or drawn), twist and sway, solid for the
 * slicer's vase mode or hollow with a wall, and a relief of grooves, stripes,
 * Voronoi cells or facets. The settings and the body come from the vase tool's
 * core (lib/vase, shared with the stand-alone vase tool), so both build the
 * same vase.
 *
 * The body fills the shape's frame: it is built as tall as the frame and as
 * wide as its larger side, then fitted exactly into width, depth and height -
 * resizing the shape resizes the vase, and a wall stays as thick as set
 * unless the frame is stretched unevenly.
 *
 * Frame as the knurl's: centred on x and z, from y = 0 to the height.
 */

const builtCache = new Map<string, VaseBody>();

/** The core's body for these settings; the last few are kept (the frame and the fitted mesh both ask). */
function buildVaseCached(settings: VaseSettings): VaseBody {
  const key = JSON.stringify(settings);
  const known = builtCache.get(key);
  if (known) {
    builtCache.delete(key);
    builtCache.set(key, known);
    return known;
  }
  return rememberVaseBody(key, buildVaseBody(settings));
}

function rememberVaseBody(key: string, body: VaseBody) {
  builtCache.set(key, body);
  while (builtCache.size > 3) builtCache.delete(builtCache.keys().next().value as string);
  return body;
}

let worker: Worker | null = null;
let requestCounter = 0;
const pending = new Map<number, { key: string; resolve: () => void; reject: (error: Error) => void }>();
const latestForShape = new Map<string, number>();

function ensureWorker() {
  if (worker) return worker;
  const next = new Worker(new URL("../workers/vaseBody.worker.ts", import.meta.url), { type: "module" });
  next.onmessage = (event: MessageEvent<VaseBodyWorkerResponse>) => {
    if (isBuildMessage(event.data)) {
      reportWorkerBuild(event.data);
      return;
    }
    const entry = pending.get(event.data.requestId);
    if (!entry) return;
    pending.delete(event.data.requestId);
    if ("error" in event.data) {
      entry.reject(new Error(event.data.error));
      return;
    }
    rememberVaseBody(entry.key, event.data.body);
    entry.resolve();
  };
  next.onerror = () => {
    pending.forEach((entry) => entry.reject(new Error("The vase worker stopped")));
    pending.clear();
    next.terminate();
    worker = null;
  };
  worker = next;
  return next;
}

/**
 * vaseShapePatch with the body built on a worker: a hollow vase with Voronoi cells took a fifth of a
 * second to build, a fine one half a second, and the editor stood still while a setting changed. The
 * patch comes once the body is there; for the same shape only the newest change is handed on, so
 * clicking through the choices does not play them all back. Where no worker can run (tests), and for
 * a body built before, it comes at once.
 */
export function vaseShapePatchOffThread(
  shape: { id?: string; width: number; depth: number; height: number },
  vase: VaseSettings,
  apply: (patch: ReturnType<typeof vaseShapePatch>) => void,
) {
  const size = Math.max(shape.width, shape.depth);
  const settings = vaseSettingsInFrame(vase, size, size, shape.height);
  const key = JSON.stringify(settings);
  const requestId = ++requestCounter;
  const owner = shape.id ?? "";
  latestForShape.set(owner, requestId);
  if (builtCache.has(key) || typeof Worker === "undefined" || typeof window === "undefined") {
    apply(vaseShapePatch(shape, vase));
    return;
  }
  const handOn = () => {
    if (latestForShape.get(owner) !== requestId) return;
    latestForShape.delete(owner);
    apply(vaseShapePatch(shape, vase));
  };
  pending.set(requestId, {
    key,
    resolve: handOn,
    // The worker could not build it: build it here, as before there was one.
    reject: handOn,
  });
  const request: VaseBodyWorkerRequest = { requestId, settings };
  ensureWorker().postMessage(request);
}

/** How the core's coordinates map into the shape's frame: centred, scaled, z up turned into y up. */
type VaseFrameMap = { cx: number; cy: number; minZ: number; sx: number; sy: number; sz: number };

type FittedVase = { positions: Float32Array; indices: Uint32Array; vertices: Float32Array; triangleCount: number; notes: string[]; map: VaseFrameMap };

const CACHE_SIZE = 6;
const cache = new Map<string, FittedVase>();

/**
 * The vase's mesh in the shape's frame, from a small cache: the editor asks for the same body
 * for drawing, bounds, cuts and export, and building one takes a tenth of a second or more.
 * The arrays are shared; callers copy before they change them.
 */
export function fittedVaseMesh(shape: { width: number; depth: number; height: number; vase?: unknown }): FittedVase {
  const width = Math.max(0.1, shape.width);
  const depth = Math.max(0.1, shape.depth);
  const height = Math.max(0.1, shape.height);
  const settings = vaseSettingsInFrame(shape.vase, width, depth, height);
  const key = JSON.stringify([width, depth, height, settings]);
  const known = cache.get(key);
  if (known) {
    cache.delete(key);
    cache.set(key, known);
    return known;
  }
  const mesh = buildVaseCached(settings);
  const source = mesh.vertices;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < source.length; i += 3) {
    minX = Math.min(minX, source[i]); maxX = Math.max(maxX, source[i]);
    minY = Math.min(minY, source[i + 1]); maxY = Math.max(maxY, source[i + 1]);
    minZ = Math.min(minZ, source[i + 2]); maxZ = Math.max(maxZ, source[i + 2]);
  }
  // The core stands the vase on z = 0 with z up; the editor's y is up and its z points to the viewer.
  // (x, y, z) -> (x, z, -y) is a turn, not a mirror, so the triangles keep facing out.
  const sx = width / Math.max(1e-9, maxX - minX);
  const sy = height / Math.max(1e-9, maxZ - minZ);
  const sz = depth / Math.max(1e-9, maxY - minY);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const vertices = new Float32Array(source.length);
  for (let i = 0; i < source.length; i += 3) {
    vertices[i] = (source[i] - cx) * sx;
    vertices[i + 1] = (source[i + 2] - minZ) * sy;
    vertices[i + 2] = -(source[i + 1] - cy) * sz;
  }
  const positions = new Float32Array(mesh.indices.length * 3);
  for (let t = 0; t < mesh.indices.length; t += 1) {
    const v = mesh.indices[t] * 3;
    positions[t * 3] = vertices[v];
    positions[t * 3 + 1] = vertices[v + 1];
    positions[t * 3 + 2] = vertices[v + 2];
  }
  const fitted: FittedVase = { positions, indices: mesh.indices, vertices, triangleCount: mesh.triangleCount, notes: mesh.notes, map: { cx, cy, minZ, sx, sy, sz } };
  cache.set(key, fitted);
  while (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value as string);
  return fitted;
}

/** A new geometry of the vase (the editor disposes and moves its geometries, so each gets its own arrays). */
export function createVaseGeometry(shape: { width: number; depth: number; height: number; vase?: unknown }): THREE.BufferGeometry {
  const mesh = fittedVaseMesh(shape);
  const indexed = new THREE.BufferGeometry();
  indexed.setAttribute("position", new THREE.BufferAttribute(mesh.vertices.slice(), 3));
  indexed.setIndex(new THREE.BufferAttribute(mesh.indices.slice(), 1));
  // Smooth over the body, sharp at ribs, corners and rims - as the loft shades.
  const geometry = toCreasedNormals(indexed, THREE.MathUtils.degToRad(30));
  indexed.dispose();
  return geometry;
}

/**
 * The frame a vase with these settings fills without being stretched, as large as the given
 * frame's larger side: a hexagon is a little narrower across its flats than across its corners.
 */
export function vaseNaturalFrame(vase: unknown, width: number, depth: number, height: number) {
  const size = Math.max(width, depth);
  const settings = vaseSettingsInFrame(vase, size, size, height);
  const mesh = buildVaseCached(settings);
  const source = mesh.vertices;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < source.length; i += 3) {
    minX = Math.min(minX, source[i]); maxX = Math.max(maxX, source[i]);
    minY = Math.min(minY, source[i + 1]); maxY = Math.max(maxY, source[i + 1]);
  }
  const spanX = Math.max(1e-6, maxX - minX);
  const spanY = Math.max(1e-6, maxY - minY);
  const scale = size / Math.max(spanX, spanY);
  // The core's y is the editor's depth (z), see fittedVaseMesh.
  return { width: spanX * scale, depth: spanY * scale };
}

/** New settings for a vase, with the frame they fill unstretched (its larger side kept). */
export function vaseShapePatch(shape: { width: number; depth: number; height: number }, vase: VaseSettings) {
  const frame = vaseNaturalFrame(vase, shape.width, shape.depth, shape.height);
  return { vase, width: frame.width, depth: frame.depth, size: Math.max(frame.width, frame.depth) };
}

/** How far the core's vase reaches across, in x and y, for these settings (its widest diameter is settings.diameter). */
function vaseSpans(settings: VaseSettings) {
  const vertices = buildVaseCached(settings).vertices;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < vertices.length; i += 3) {
    minX = Math.min(minX, vertices[i]); maxX = Math.max(maxX, vertices[i]);
    minY = Math.min(minY, vertices[i + 1]); maxY = Math.max(maxY, vertices[i + 1]);
  }
  return { x: Math.max(1e-6, maxX - minX), y: Math.max(1e-6, maxY - minY) };
}

/**
 * The vase as the drawing boards see it: its settings with the height of the body and the widest
 * diameter in real millimetres. The frame holds the vase by its outline's box, which for an outline
 * that is not round is narrower than its widest diameter, so the diameter is worked back from it.
 */
export function vaseDrawingSettings(shape: { width: number; depth: number; height: number; vase?: unknown }): VaseSettings {
  const size = Math.max(0.1, shape.width, shape.depth);
  const settings = vaseSettingsInFrame(shape.vase, size, size, Math.max(0.1, shape.height));
  const spans = vaseSpans(settings);
  return { ...settings, diameter: (size * settings.diameter) / Math.max(spans.x, spans.y) };
}

/**
 * A shape change from the drawing boards' settings (real height of the body, real widest diameter):
 * the vase's own settings and the frame that holds it at those measures. The settings keep the
 * height and diameter they had; the frame carries the measures.
 */
export function vaseDrawingPatch(shape: { vase?: unknown }, drawing: VaseSettings) {
  const stored = normalizeVaseSettings(shape.vase);
  const vase = normalizeVaseSettings({ ...drawing, height: stored.height, diameter: stored.diameter });
  const body = Math.max(1, drawing.height);
  const height = vase.legMode === "angeformt" ? body + vase.legHeight : body;
  // Built at the real diameter, the vase's box is the frame (spans scale with the diameter).
  const spans = vaseSpans(vaseSettingsInFrame(vase, drawing.diameter, drawing.diameter, height));
  return { vase, width: spans.x, depth: spans.y, size: Math.max(spans.x, spans.y), height };
}

/** What printing a vase takes, and what to look out for: the core's checks and the notes it was built with (in German). */
export type VasePrintReport = { grams: number; meters: number; material: string; vaseMode: boolean; line: number; bottom: number; notes: string[] };

const reportCache = new Map<string, VasePrintReport>();

/**
 * Weight and filament of the vase as it stands (walls solid, no infill; in the slicer's vase mode one
 * line along the wall and a thin bottom), with the core's printing checks: overhangs, thin walls, what
 * a lid, a lamp or legs need. The last few are kept; the checks walk the whole wall.
 */
export function vasePrintReport(shape: { width: number; depth: number; height: number; vase?: unknown }): VasePrintReport {
  const size = Math.max(0.1, shape.width, shape.depth);
  const settings = vaseSettingsInFrame(shape.vase, size, size, Math.max(0.1, shape.height));
  const key = JSON.stringify([shape.width, shape.depth, shape.height, settings]);
  const known = reportCache.get(key);
  if (known) return known;
  // The fitted body, turned back to the core's z up: the vase mode's sums tell the bottom by its height.
  const fitted = fittedVaseMesh(shape).positions;
  const positions = new Float32Array(fitted.length);
  for (let i = 0; i < fitted.length; i += 3) {
    positions[i] = fitted[i];
    positions[i + 1] = -fitted[i + 2];
    positions[i + 2] = fitted[i + 1];
  }
  const volume = printVolume(settings, positions);
  const weight = printWeight(volume.mm3, settings.material);
  const notes = [...vaseChecks(settings), ...buildVaseCached(settings).notes].filter((note, index, all) => all.indexOf(note) === index);
  const report = { grams: weight.grams, meters: weight.meters, material: weight.material, vaseMode: volume.mode === "vasenmodus", line: settings.lineWidth, bottom: VASE_MODE_BOTTOM, notes };
  reportCache.set(key, report);
  while (reportCache.size > 4) reportCache.delete(reportCache.keys().next().value as string);
  return report;
}

/** An accessory of a vase, laid out for printing beside it: triangles in the vase shape's frame. */
export type VaseAccessory = { id: string; kind: VaseAccessoryKind; index: number; positions: number[] };

export type VaseAccessoryKind = "leg" | "stand" | "saucer" | "hiddenSaucer" | "plantInsert" | "wateringInsert" | "frog" | "tube" | "lid";

function accessoryKind(part: VasePart, settings: VaseSettings): VaseAccessoryKind {
  if (part.id.startsWith("bein-")) return "leg";
  if (part.id === "staender") return "stand";
  if (part.id === "untersetzer") return "saucer";
  if (part.id === "schale") return "hiddenSaucer";
  if (part.id === "einsatz") return settings.insertMode === "bewaesserung" ? "wateringInsert" : "plantInsert";
  if (part.id === "stecker") return "frog";
  if (part.id === "roehrchen") return "tube";
  return "lid";
}

/**
 * The vase's accessories - legs to plug in, a stand, a saucer, an insert, a lid - each a closed
 * mesh, laid out for printing to the right of the vase as the vase tool lays them out (upside
 * down where that prints better), in the vase shape's frame: x and z from its middle, y from its
 * bottom. Legs moulded on are part of the vase itself and not among them.
 */
export function vaseAccessories(shape: { width: number; depth: number; height: number; vase?: unknown }): VaseAccessory[] {
  const width = Math.max(0.1, shape.width);
  const depth = Math.max(0.1, shape.depth);
  const height = Math.max(0.1, shape.height);
  const settings = vaseSettingsInFrame(shape.vase, width, depth, height);
  const { parts, lift } = buildParts(settings);
  const own = parts.filter((part) => !part.merge);
  if (!own.length) return [];
  const body = buildVaseCached(settings);
  const { map } = fittedVaseMesh(shape);
  // In this layout the vase and every part stand on the bed (z = 0), the vase where it is.
  const layout = layoutParts(meshBox(body.vertices), parts, lift, "druck");
  const result: VaseAccessory[] = [];
  const counts = new Map<VaseAccessoryKind, number>();
  parts.forEach((part, index) => {
    if (part.merge) return;
    const pose = layout.parts[index];
    const { vertices, indices } = part.mesh;
    const positions: number[] = [];
    for (let t = 0; t < indices.length; t += 1) {
      const v = indices[t] * 3;
      const [x, y, z] = placePoint(pose, vertices[v], vertices[v + 1], vertices[v + 2]);
      // Mapped as the vase is (fittedVaseMesh); turned over is a half turn about x, so the triangles still face out.
      positions.push((x - map.cx) * map.sx, z * map.sy, -(y - map.cy) * map.sz);
    }
    const kind = accessoryKind(part, settings);
    const count = (counts.get(kind) ?? 0) + 1;
    counts.set(kind, count);
    result.push({ id: part.id, kind, index: count, positions });
  });
  return result;
}

/** An accessory as an object of its own beside its vase: a mesh in the vase's colour, remembering whose part it is. */
export function vaseAccessoryShape(vase: WorkplaneShape, accessory: VaseAccessory, name: string): WorkplaneShape {
  const p = accessory.positions;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < p.length; i += 3) {
    minX = Math.min(minX, p[i]); maxX = Math.max(maxX, p[i]);
    minY = Math.min(minY, p[i + 1]); maxY = Math.max(maxY, p[i + 1]);
    minZ = Math.min(minZ, p[i + 2]); maxZ = Math.max(maxZ, p[i + 2]);
  }
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;
  const local = new Array<number>(p.length);
  for (let i = 0; i < p.length; i += 3) {
    local[i] = p[i] - cx;
    local[i + 1] = p[i + 1] - minY;
    local[i + 2] = p[i + 2] - cz;
  }
  const width = Math.max(0.01, maxX - minX);
  const depth = Math.max(0.01, maxZ - minZ);
  const height = Math.max(0.01, maxY - minY);
  return canonicalizeShape({
    id: createLocalId("mesh"),
    name,
    kind: "mesh",
    color: vase.color,
    x: cleanNearZero(vase.x + cx, 0.0005),
    z: cleanNearZero(vase.z + cz, 0.0005),
    elevation: cleanNearZero((vase.elevation ?? 0) + minY, 0.0005),
    size: Math.max(width, depth),
    width,
    depth,
    height,
    rotation: 0,
    importedMesh: { positions: local, baseWidth: width, baseDepth: depth, baseHeight: height, triangleCount: Math.floor(local.length / 9), sourceFormat: "json" },
    vasePartOf: vase.id,
  });
}

/**
 * The scene with a vase's accessories laid out anew beside it: the parts laid out for it before give
 * way, so changed settings come out new. Unchanged when the vase is not there or has no accessories.
 */
export function sceneWithVaseAccessories(
  shapes: WorkplaneShape[],
  vaseId: string,
  name: (vase: WorkplaneShape, accessory: VaseAccessory) => string,
): { shapes: WorkplaneShape[]; parts: WorkplaneShape[]; missing: VaseAccessoryKind[] } {
  const vase = shapes.find((shape) => shape.id === vaseId);
  if (!vase || vase.kind !== "vase") return { shapes, parts: [], missing: [] };
  const accessories = vaseAccessories({ width: shapeWidth(vase), depth: shapeDepth(vase), height: vase.height, vase: vase.vase });
  const missing = askedAccessories(vase.vase).filter((kind) => !accessories.some((accessory) => accessory.kind === kind));
  if (!accessories.length) return { shapes, parts: [], missing };
  const parts = accessories.map((accessory) => vaseAccessoryShape(vase, accessory, name(vase, accessory)));
  return { shapes: [...shapes.filter((shape) => shape.vasePartOf !== vase.id), ...parts], parts, missing };
}

/** The kinds of part the settings ask for: what the vase tool builds when the vase allows it (an insert needs a wide enough opening). */
function askedAccessories(settings: unknown): VaseAccessoryKind[] {
  const vase = normalizeVaseSettings(settings);
  const asked: VaseAccessoryKind[] = [];
  if (vase.legMode === "stecken") asked.push("leg");
  if (vase.legMode === "staender") asked.push("stand");
  if (vase.saucerMode === "schale") asked.push("saucer");
  if (vase.saucerMode === "versteckt") asked.push("hiddenSaucer");
  const inserts: Record<string, VaseAccessoryKind> = { pflanze: "plantInsert", bewaesserung: "wateringInsert", stecker: "frog", roehrchen: "tube" };
  if (inserts[vase.insertMode]) asked.push(inserts[vase.insertMode]);
  if (vase.lidMode !== "keiner") asked.push("lid");
  return asked;
}

const ACCESSORY_NAMES: Record<VaseAccessoryKind, MessageKey> = {
  leg: "vase.partLeg",
  stand: "vase.partStand",
  saucer: "vase.partSaucer",
  hiddenSaucer: "vase.partHiddenSaucer",
  plantInsert: "vase.partPlantInsert",
  wateringInsert: "vase.partWateringInsert",
  frog: "vase.partFrog",
  tube: "vase.partTube",
  lid: "vase.partLid",
};

/** An accessory's name in the current language, legs numbered. */
export function vaseAccessoryName(accessory: VaseAccessory) {
  return t(ACCESSORY_NAMES[accessory.kind], { n: accessory.index });
}

/** The name of a kind of accessory, legs all together: for saying which ones could not be made. */
export function vaseAccessoryKindName(kind: VaseAccessoryKind) {
  return kind === "leg" ? t("vase.partLegs") : t(ACCESSORY_NAMES[kind]);
}
