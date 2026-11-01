import type { ManifoldToplevel } from "manifold-3d";
import * as THREE from "three";
import { MeshBVH } from "three-mesh-bvh";
import { disposeManifold, shapeToManifoldSolid, visibleExportShapes } from "@/lib/editorBooleans";
import { getManifoldRuntime } from "@/lib/editorMeshCore";
import { t } from "@/lib/i18n";
import type { ManifoldSolid } from "@/lib/manifoldSplit";
import { isNonSolidShape } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * The clearance check (Spiel prüfen): for the bodies of a design, or the separate parts of one body printed in place,
 * where they overlap (they would print as one), where they touch, and the narrowest gap between those that come close.
 * It only reads: nothing in the design changes. The same check answers the tool panel and the MCP tool.
 *
 * Everything is measured on the triangle meshes the slicer would get, in the scene's frame (mm, y up: the height the
 * user sees as Z).
 */

/** Pairs further apart than this (mm) are clear without a number: the closest point is not looked for beyond it. */
export const CLEARANCE_SEARCH_MM = 5;
/** Below this gap (mm) a pair is too tight; around 0.3 is tight, 0.4 usual (as the threads' hint says). */
export const CLEARANCE_DEFAULT_THRESHOLD_MM = 0.3;
export const CLEARANCE_THRESHOLD_LIMITS: [number, number] = [0.01, 5];
/** A common volume from this size on (mm³) is an overlap; below it the two only touch. */
export const CLEARANCE_OVERLAP_MM3 = 0.01;
/** Closer than this (mm) two parts touch: they fuse when printed. */
export const CLEARANCE_TOUCH_MM = 0.001;
/** A direction within this angle of the vertical (degrees) lies between layers. */
const LAYER_ANGLE = 45;

export type ClearanceVec3 = [number, number, number];
export type ClearanceBox = { min: ClearanceVec3; max: ClearanceVec3 };
/** "layer": the narrowest place lies between layers (above or below); "side": within the same layer. */
export type ClearanceDirection = "layer" | "side";

export type ClearanceOptions = {
  /** Gaps below this (mm) are too tight. */
  threshold: number;
  /** Check the separate parts of one object (a flexi print, a hinge printed in place) against each other. */
  splitParts: boolean;
  /** How far (mm) the closest point is looked for. */
  searchLength: number;
  /** At most this many triangles in a pair; a pair above it is not checked (see ClearanceResult.unchecked). */
  triangleLimit: number;
};

export type ClearancePart = {
  /** The part's key in this result: the object's id, with "#n" for its n-th separate part. */
  key: string;
  id: string;
  name: string;
  /** Which separate part of the object (from 1), or null when the object is checked whole. */
  part: number | null;
  box: ClearanceBox;
  triangles: number;
};

export type ClearanceOverlap = {
  a: string;
  b: string;
  volumeMm3: number;
  center: ClearanceVec3;
  box: ClearanceBox;
  /** The common volume as triangles (nine numbers each), to show it. */
  positions: number[];
};
export type ClearanceTouch = { a: string; b: string; point: ClearanceVec3 | null };
export type ClearanceGap = { a: string; b: string; gapMm: number; pointA: ClearanceVec3; pointB: ClearanceVec3; direction: ClearanceDirection };
export type ClearanceUnchecked = { a: string; b: string; reason: "triangles" | "failed" };

export type ClearanceResult = {
  parts: ClearancePart[];
  overlaps: ClearanceOverlap[];
  touching: ClearanceTouch[];
  /** Gaps below the threshold, narrowest first. */
  tight: ClearanceGap[];
  /** Gaps measured within the search length that are wide enough, narrowest first. */
  fine: ClearanceGap[];
  /** Pairs with nothing closer than the search length (their boxes apart, or measured). */
  clearCount: number;
  unchecked: ClearanceUnchecked[];
  /** Not enough to check: fewer than two parts. */
  tooFew: boolean;
};

export function normalizeClearanceOptions(given: Partial<ClearanceOptions> = {}): ClearanceOptions {
  const number = (value: unknown, fallback: number, [min, max]: [number, number]) => {
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
  };
  return {
    threshold: number(given.threshold, CLEARANCE_DEFAULT_THRESHOLD_MM, CLEARANCE_THRESHOLD_LIMITS),
    splitParts: given.splitParts !== false,
    searchLength: number(given.searchLength, CLEARANCE_SEARCH_MM, [0.1, 100]),
    triangleLimit: Math.round(number(given.triangleLimit, 250_000, [1_000, 10_000_000])),
  };
}

/** Where the narrowest place lies, from the line between its two points: within LAYER_ANGLE of the vertical (scene y) between layers. */
export function clearanceDirection(a: ClearanceVec3, b: ClearanceVec3): ClearanceDirection {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const length = Math.hypot(d[0], d[1], d[2]);
  if (length < 1e-12) return "side";
  return Math.abs(d[1]) / length >= Math.cos((LAYER_ANGLE * Math.PI) / 180) ? "layer" : "side";
}

/** Whether two boxes come within `reach` of each other (the pairs worth measuring). */
export function clearanceBoxesNear(a: ClearanceBox, b: ClearanceBox, reach: number) {
  for (let k = 0; k < 3; k += 1) {
    if (a.min[k] - reach > b.max[k] || b.min[k] - reach > a.max[k]) return false;
  }
  return true;
}

/** The name a part is listed by: the object's own, with "· Part n" for one of its separate parts. */
export function clearancePartName(name: string, part: number | null, partLabel: (n: number) => string) {
  return part === null ? name : `${name} · ${partLabel(part)}`;
}

/** A measured gap: touching below CLEARANCE_TOUCH_MM, too tight below the threshold, else fine. */
export function classifyClearanceGap(gap: number, threshold: number): "touching" | "tight" | "fine" {
  if (gap < CLEARANCE_TOUCH_MM) return "touching";
  return gap < threshold ? "tight" : "fine";
}

/** The result in the order it is listed: overlaps (largest first), touching, too tight and fine (narrowest first). */
export function sortClearanceResult(result: ClearanceResult): ClearanceResult {
  return {
    ...result,
    overlaps: [...result.overlaps].sort((p, q) => q.volumeMm3 - p.volumeMm3),
    tight: [...result.tight].sort((p, q) => p.gapMm - q.gapMm),
    fine: [...result.fine].sort((p, q) => p.gapMm - q.gapMm),
  };
}

/**
 * A body made of triangles in the scene's frame (nine numbers each), as a mesh object of the design: the common volume
 * of an overlap shown in the view, or several separate parts as one object (a flexi print imported as one STL).
 */
export function clearanceMeshShape(id: string, name: string, color: string, positions: ArrayLike<number>): WorkplaneShape | null {
  if (positions.length < 9) return null;
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 1) {
    min[i % 3] = Math.min(min[i % 3], positions[i]);
    max[i % 3] = Math.max(max[i % 3], positions[i]);
  }
  const center = [(min[0] + max[0]) / 2, min[1], (min[2] + max[2]) / 2];
  const local = Array.from(positions, (value, i) => value - center[i % 3]);
  const width = Math.max(1e-3, max[0] - min[0]), height = Math.max(1e-3, max[1] - min[1]), depth = Math.max(1e-3, max[2] - min[2]);
  return {
    id,
    name,
    kind: "mesh",
    color,
    x: center[0],
    z: center[2],
    elevation: center[1],
    size: Math.max(width, depth),
    width,
    depth,
    height,
    rotation: 0,
    importedMesh: { positions: local, baseWidth: width, baseDepth: depth, baseHeight: height, triangleCount: Math.floor(local.length / 9), sourceFormat: "json" },
    locked: false,
    hidden: false,
  } as WorkplaneShape;
}

/** The bodies a check takes, as the export does: visible, bundles as their parts, no holes, rulers or reference images. */
export function clearanceSourceShapes(source: readonly WorkplaneShape[]) {
  return visibleExportShapes(source).visible.filter((shape) => !shape.hole && !isNonSolidShape(shape));
}

type Part = ClearancePart & { solid: ManifoldSolid; geometry: THREE.BufferGeometry };

function boxOf(solid: ManifoldSolid): ClearanceBox {
  const box = solid.boundingBox();
  return { min: [box.min[0], box.min[1], box.min[2]], max: [box.max[0], box.max[1], box.max[2]] };
}

/** The part's triangles with a bounding-volume tree, for the closest points. */
function geometryOf(solid: ManifoldSolid) {
  const mesh = solid.getMesh();
  try {
    const count = mesh.vertProperties.length / mesh.numProp;
    const position = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      for (let k = 0; k < 3; k += 1) position[i * 3 + k] = mesh.vertProperties[i * mesh.numProp + k];
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(position, 3));
    geometry.setIndex(new THREE.BufferAttribute(Uint32Array.from(mesh.triVerts), 1));
    geometry.boundsTree = new MeshBVH(geometry);
    return geometry;
  } finally {
    disposeManifold(mesh);
  }
}

/**
 * The separate parts of one object: its outer skins, each with the cavities inside it (a ball printed in a cage lies
 * in the cage's cavity, not in the cage). A skin's cavities are cut back out of it.
 */
function separateParts(runtime: ManifoldToplevel, solid: ManifoldSolid, created: ManifoldSolid[]): ManifoldSolid[] {
  const components = solid.decompose();
  created.push(...components);
  const bodies = components.filter((component) => component.volume() > 0);
  const cavities = components.filter((component) => component.volume() < 0);
  if (bodies.length <= 1) return [solid];
  if (!cavities.length) return bodies;
  const holes = new Map<ManifoldSolid, ManifoldSolid[]>();
  for (const cavity of cavities) {
    const box = cavity.boundingBox();
    // The smallest skin round the cavity's box holds it.
    const holder = bodies
      .filter((body) => {
        const outer = body.boundingBox();
        return [0, 1, 2].every((k) => outer.min[k] <= box.min[k] + 1e-9 && outer.max[k] >= box.max[k] - 1e-9);
      })
      .sort((p, q) => p.volume() - q.volume())[0];
    if (holder) holes.set(holder, [...(holes.get(holder) ?? []), cavity]);
  }
  return bodies.map((body) => {
    const inside = holes.get(body);
    if (!inside) return body;
    // A cavity is a skin facing inward: joined with its body it is the body with the cavity in it.
    const whole = runtime.Manifold.compose([body, ...inside]);
    created.push(whole);
    return whole;
  });
}

/**
 * Checks the bodies among `source` (see clearanceSourceShapes) against each other: overlaps with their volume, touching
 * parts, and the narrowest gap of every pair that comes within the search length. `partLabel` names a separate part
 * ("Part 2" in the language of the interface).
 */
export async function checkClearance(source: readonly WorkplaneShape[], given: Partial<ClearanceOptions> = {}, partLabel: (n: number) => string = (n) => t("clearance.part", { number: n })): Promise<ClearanceResult> {
  const options = normalizeClearanceOptions(given);
  const shapes = clearanceSourceShapes(source);
  const empty: ClearanceResult = { parts: [], overlaps: [], touching: [], tight: [], fine: [], clearCount: 0, unchecked: [], tooFew: true };
  if (!shapes.length) return empty;
  const runtime = await getManifoldRuntime();
  const created: ManifoldSolid[] = [];
  const parts: Part[] = [];
  try {
    for (const shape of shapes) {
      const solid = shapeToManifoldSolid(runtime, shape, created);
      if (!solid) continue;
      created.push(solid);
      if (solid.status() !== "NoError" || solid.numTri() === 0) continue;
      const pieces = options.splitParts ? separateParts(runtime, solid, created) : [solid];
      pieces.forEach((piece, index) => {
        const part = pieces.length > 1 ? index + 1 : null;
        parts.push({
          key: part === null ? shape.id : `${shape.id}#${part}`,
          id: shape.id,
          name: clearancePartName(shape.name, part, partLabel),
          part,
          box: boxOf(piece),
          triangles: piece.numTri(),
          solid: piece,
          geometry: geometryOf(piece),
        });
      });
    }
    const result: ClearanceResult = { ...empty, parts: parts.map(({ solid: _solid, geometry: _geometry, ...part }) => part), tooFew: parts.length < 2 };
    const identity = new THREE.Matrix4();
    for (let i = 0; i < parts.length; i += 1) {
      for (let j = i + 1; j < parts.length; j += 1) {
        const a = parts[i], b = parts[j];
        if (!clearanceBoxesNear(a.box, b.box, options.searchLength)) {
          result.clearCount += 1;
          continue;
        }
        if (a.triangles + b.triangles > options.triangleLimit) {
          result.unchecked.push({ a: a.key, b: b.key, reason: "triangles" });
          continue;
        }
        try {
          const common = clearanceBoxesNear(a.box, b.box, 0) ? a.solid.intersect(b.solid) : null;
          if (common) created.push(common);
          const volume = common ? Math.max(0, common.volume()) : 0;
          if (common && volume >= CLEARANCE_OVERLAP_MM3) {
            const box = boxOf(common);
            const mesh = common.getMesh();
            const positions: number[] = [];
            for (let k = 0; k < mesh.triVerts.length; k += 1) {
              const at = mesh.triVerts[k] * mesh.numProp;
              positions.push(mesh.vertProperties[at], mesh.vertProperties[at + 1], mesh.vertProperties[at + 2]);
            }
            disposeManifold(mesh);
            result.overlaps.push({
              a: a.key,
              b: b.key,
              volumeMm3: volume,
              center: [(box.min[0] + box.max[0]) / 2, (box.min[1] + box.max[1]) / 2, (box.min[2] + box.max[2]) / 2],
              box,
              positions,
            });
            continue;
          }
          const hitA = { point: new THREE.Vector3(), distance: 0, faceIndex: 0 };
          const hitB = { point: new THREE.Vector3(), distance: 0, faceIndex: 0 };
          const bvh = a.geometry.boundsTree as MeshBVH;
          const found = bvh.closestPointToGeometry(b.geometry, identity, hitA, hitB, 0, options.searchLength);
          if (!found && volume <= 0) {
            result.clearCount += 1;
            continue;
          }
          const pointA: ClearanceVec3 = [hitA.point.x, hitA.point.y, hitA.point.z];
          const pointB: ClearanceVec3 = [hitB.point.x, hitB.point.y, hitB.point.z];
          const gap = found ? hitA.distance : 0;
          const kind = volume > 0 ? "touching" : classifyClearanceGap(gap, options.threshold);
          if (kind === "touching") result.touching.push({ a: a.key, b: b.key, point: found ? pointA : null });
          else (kind === "tight" ? result.tight : result.fine).push({ a: a.key, b: b.key, gapMm: gap, pointA, pointB, direction: clearanceDirection(pointA, pointB) });
        } catch {
          result.unchecked.push({ a: a.key, b: b.key, reason: "failed" });
        }
      }
    }
    return sortClearanceResult(result);
  } finally {
    for (const part of parts) {
      part.geometry.boundsTree = undefined;
      part.geometry.dispose();
    }
    // The same solid can be listed twice (a primitive, a body that needed no union): each is freed once.
    for (const solid of new Set(created)) {
      try {
        disposeManifold(solid);
      } catch {
        // Freed already.
      }
    }
  }
}

/**
 * The same result for another threshold: the gaps are measured already, only the line between too tight and fine moves
 * (touching and overlaps stay as they are). No new check is needed when the field changes.
 */
export function reclassifyClearance(result: ClearanceResult, threshold: number): ClearanceResult {
  const gaps = [...result.tight, ...result.fine];
  return sortClearanceResult({
    ...result,
    tight: gaps.filter((gap) => classifyClearanceGap(gap.gapMm, threshold) === "tight"),
    fine: gaps.filter((gap) => classifyClearanceGap(gap.gapMm, threshold) === "fine"),
  });
}

const CLEARANCE_SETTINGS_KEY = "layerling.clearanceCheck";

/** The threshold and the split-parts switch as last used in this browser; blocked storage gives the defaults. */
export function readClearanceSettings(): Pick<ClearanceOptions, "threshold" | "splitParts"> {
  try {
    const stored: unknown = JSON.parse(window.localStorage.getItem(CLEARANCE_SETTINGS_KEY) ?? "{}");
    const { threshold, splitParts } = normalizeClearanceOptions(stored && typeof stored === "object" ? stored as Partial<ClearanceOptions> : {});
    return { threshold, splitParts };
  } catch {
    return { threshold: CLEARANCE_DEFAULT_THRESHOLD_MM, splitParts: true };
  }
}

export function writeClearanceSettings(settings: Pick<ClearanceOptions, "threshold" | "splitParts">) {
  try {
    window.localStorage.setItem(CLEARANCE_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Blocked storage: the settings hold until the page is closed.
  }
}

/** The pair a row of the result stands for: the key the list and the view share. */
export function clearancePairKey(a: string, b: string) {
  return `${a}\u0000${b}`;
}
