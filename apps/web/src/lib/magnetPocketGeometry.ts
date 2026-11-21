import * as THREE from "three";
import { t } from "@/lib/i18n";
import { HOLE_OVERSHOOT } from "@/lib/holePatternShapes";
import { magnetPocketMeasures, magnetSizeName, type MagnetPocketSpec } from "@/lib/magnetPocket";
import { placementPatchForNewShape } from "@/lib/placementWorkplane";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import type { ThreadInsertSpec } from "@/lib/threadInsert";
import type { ThreadInsertFace } from "@/lib/threadInsertGeometry";
import { canonicalizeShape, withHoleMode } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * The Magnet pocket tool (magnetPocket.ts) works as the thread insert tool does: a spot is picked on a flat face or the
 * outside of a round wall, a ring shows whether the part has the wall beside the pocket and the depth behind it, and
 * the pocket is an ordinary hole shape grouped with the part - a counterbore, its head the magnet's pocket and its
 * shaft the glue well, or a plain cylinder without a well. So the check is the thread insert's, for a "hole" as wide as
 * the pocket and as deep: the glue well may open into a hollow print, that is what it is for.
 *
 * The part that meets the face there - the other half of a figure's joint, standing where it fits - can get the same
 * pocket facing it, so the two magnets meet. It is found by looking out of the face a little way: the nearest surface of
 * another part that faces back at it.
 */

type Vec = { x: number; y: number; z: number };
const vec3 = (v: Vec) => new THREE.Vector3(v.x, v.y, v.z);

/** How far out of the face the part that meets it may stand, in mm: a joint printed with a little gap still counts. */
export const MAGNET_PARTNER_REACH = 1;
/** How far behind the face the search starts, in mm, so a partner that reaches a hair into the part is found too. */
const MAGNET_PARTNER_BACK = 0.3;

/** The pocket as the thread insert's check and ring take a hole: its width, its depth and the wall it wants. */
export function magnetInsertSpec(spec: MagnetPocketSpec): ThreadInsertSpec {
  const measures = magnetPocketMeasures(spec);
  return { name: magnetSizeName(spec), d3: measures.pocketDiameter, L: measures.pocketDepth, W: measures.wall };
}

/**
 * The pocket's hole shape on the face: a counterbore in hole mode, its head the magnet's pocket on the face and its shaft
 * the glue well below (a cylinder without a well), standing a little (HOLE_OVERSHOOT) out of the face as every hole the
 * tools make. Nothing is cut here: grouping it with the part does that.
 */
export function makeMagnetPocketHole(face: ThreadInsertFace, spec: MagnetPocketSpec): WorkplaneShape {
  const measures = magnetPocketMeasures(spec);
  const well = measures.wellDepth > 0;
  const asset = toolbarShapeAssets.find((entry) => entry.kind === (well ? "counterbore" : "cylinder"));
  if (!asset) throw new Error("The counterbore shape is missing");
  const { workplane } = face;
  const normal = vec3(workplane.normal).normalize();
  const base = vec3(workplane.origin).addScaledVector(normal, -measures.totalDepth);
  const height = measures.totalDepth + HOLE_OVERSHOOT;
  const width = measures.pocketDiameter;
  const made = makeShapeFromAsset(
    { ...asset, name: t("magnetPocket.holeName", { size: magnetSizeName(spec) }) },
    { x: 0, z: 0, elevation: 0 },
    { width, depth: width, height, ...(well ? { screwHoleShaft: measures.wellDiameter, screwHoleHeadDepth: measures.pocketDepth + HOLE_OVERSHOOT } : {}) },
  );
  const sized = {
    ...made,
    width,
    depth: width,
    size: width,
    height,
    ...(well ? { screwHoleShaft: measures.wellDiameter, screwHoleHeadDepth: measures.pocketDepth + HOLE_OVERSHOOT } : {}),
  };
  return canonicalizeShape(withHoleMode({ ...sized, ...placementPatchForNewShape(sized, workplane, base) }, true));
}

/**
 * Where another part meets the face at `point`: looking out of the face along `normal`, from a hair behind it, the nearest
 * triangle of `triangles` (that part's, in the scene's frame) that faces back at the face, within MAGNET_PARTNER_REACH.
 * The answer is that spot on the other part and its outward direction there (against `normal`), or null.
 */
export function findMagnetPartnerSpot(triangles: ArrayLike<number>, point: Vec, normal: Vec): { point: Vec; normal: Vec; distance: number } | null {
  const n = vec3(normal).normalize();
  const start = vec3(point).addScaledVector(n, -MAGNET_PARTNER_BACK);
  const ray = new THREE.Ray(start, n);
  const reach = MAGNET_PARTNER_BACK + MAGNET_PARTNER_REACH;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const facing = new THREE.Vector3();
  const hit = new THREE.Vector3();
  let best: THREE.Vector3 | null = null;
  let bestDistance = Infinity;
  for (let i = 0; i + 8 < triangles.length; i += 9) {
    a.set(triangles[i], triangles[i + 1], triangles[i + 2]);
    b.set(triangles[i + 3], triangles[i + 4], triangles[i + 5]);
    c.set(triangles[i + 6], triangles[i + 7], triangles[i + 8]);
    facing.crossVectors(ab.subVectors(b, a), ac.subVectors(c, a));
    const length = facing.length();
    // Only a surface turned back at the face: the other part's side of the joint, not its far side.
    if (length < 1e-12 || facing.dot(n) / length > -0.5) continue;
    if (!ray.intersectTriangle(a, b, c, false, hit)) continue;
    const distance = hit.distanceTo(start);
    if (distance <= reach && distance < bestDistance) {
      bestDistance = distance;
      best = hit.clone();
    }
  }
  if (!best) return null;
  return { point: { x: best.x, y: best.y, z: best.z }, normal: { x: -n.x, y: -n.y, z: -n.z }, distance: bestDistance - MAGNET_PARTNER_BACK };
}

/** Whether a part's box comes within MAGNET_PARTNER_REACH of the point: only those are read for a partner. */
export function boxNearPoint(box: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number }, point: Vec) {
  const reach = MAGNET_PARTNER_REACH + MAGNET_PARTNER_BACK;
  return point.x >= box.minX - reach && point.x <= box.maxX + reach
    && point.y >= box.minY - reach && point.y <= box.maxY + reach
    && point.z >= box.minZ - reach && point.z <= box.maxZ + reach;
}
