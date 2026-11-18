import * as THREE from "three";
import { t } from "@/lib/i18n";
import { HOLE_OVERSHOOT, isRoundWallFace, type HolePatternFace, type PerforableFace } from "@/lib/holePatternShapes";
import { placementPatchForNewShape } from "@/lib/placementWorkplane";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { checkThreadInsert, CUSTOM_THREAD_INSERT, type ThreadInsertResult, type ThreadInsertSpec } from "@/lib/threadInsert";
import { canonicalizeShape, withHoleMode } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * The hole for a threaded insert: an ordinary round hole shape (a cylinder in hole mode) standing on the picked spot,
 * the length of the insert deep and a little out of the face, just as the hole pattern's holes stand. Grouped with the
 * body the CAD kernel cuts it exactly, so the bore is a true cylinder face. What is measured here is only the check
 * whether the part is thick enough around and behind the spot; it reads the display mesh, the kernel does not offer
 * the distance to an edge or the depth behind a point.
 */

export type ThreadInsertFace = HolePatternFace;
export type ThreadInsertMeasured = ThreadInsertResult;

type Vec = { x: number; y: number; z: number };
const vec3 = (v: Vec) => new THREE.Vector3(v.x, v.y, v.z);

/** Whether the point (u, v) of a face lies on its material: inside an outer loop and outside every opening. */
function insideLoops(loops: PerforableFace["outline"]["loops"], u: number, v: number) {
  let hit = false;
  for (const polygon of loops) {
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const a = polygon[i];
      const b = polygon[j];
      if (a.v > v !== b.v > v && u < ((b.u - a.u) * (v - a.v)) / (b.v - a.v) + a.u) hit = !hit;
    }
  }
  return hit;
}

/** The distance from the picked spot, the origin of the face's frame, to the nearest edge of the face or of an opening in it; -1 off the material. */
function distanceToEdge(face: PerforableFace) {
  const { loops } = face.outline;
  if (!insideLoops(loops, 0, 0)) return -1;
  let closest = Infinity;
  for (const loop of loops) {
    for (let i = 0; i < loop.length; i++) {
      const a = loop[i];
      const b = loop[(i + 1) % loop.length];
      const du = b.u - a.u;
      const dv = b.v - a.v;
      const along = Math.max(0, Math.min(1, -(a.u * du + a.v * dv) / (du * du + dv * dv || 1)));
      closest = Math.min(closest, Math.hypot(a.u + along * du, a.v + along * dv));
    }
  }
  return Number.isFinite(closest) ? closest : -1;
}

/** How far the material reaches into the body from a point of a flat face (u, v in the face's frame); null where nothing is behind it. */
function depthBehind(face: PerforableFace, u: number, v: number) {
  if (!face.body) return null;
  const { workplane: w } = face;
  const origin = vec3(w.origin).addScaledVector(vec3(w.xAxis), u).addScaledVector(vec3(w.zAxis), v);
  const normal = vec3(w.normal).normalize();
  // Starts a hair inside the face so that it does not measure the face's own triangles.
  const ray = new THREE.Ray(origin.clone().addScaledVector(normal, -0.0005), normal.clone().negate());
  const triangles = face.body;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const hitPoint = new THREE.Vector3();
  let nearest = Infinity;
  for (let i = 0; i + 8 < triangles.length; i += 9) {
    a.set(triangles[i], triangles[i + 1], triangles[i + 2]);
    b.set(triangles[i + 3], triangles[i + 4], triangles[i + 5]);
    c.set(triangles[i + 6], triangles[i + 7], triangles[i + 8]);
    const hit = ray.intersectTriangle(a, b, c, false, hitPoint);
    if (hit) {
      const distance = hit.distanceTo(origin);
      if (distance > 0.001 && distance < nearest) nearest = distance;
    }
  }
  return Number.isFinite(nearest) ? nearest : null;
}

/** The spots under the hole's footprint that are tested: its middle and two rings. */
function footprintSpots(radius: number): [number, number][] {
  const spots: [number, number][] = [[0, 0]];
  for (const ring of [radius * 0.5, radius * 0.98]) {
    for (let k = 0; k < 16; k++) {
      const turn = (k * Math.PI) / 8;
      spots.push([ring * Math.cos(turn), ring * Math.sin(turn)]);
    }
  }
  return spots;
}

/**
 * A round wall (cylinder, tube): the wall is flattened to (u, v) round the axis for the distance to its rim and
 * openings; the depth is the chord through the wall at the hole's footprint or the next surface behind it, the
 * smaller one. Only the outside of a cylinder wide enough for the hole and its wall counts; anything else is blocked.
 */
function measureRoundWall(face: Extract<HolePatternFace, { round: unknown }>, spec: ThreadInsertSpec): ThreadInsertResult {
  const wall = face.round;
  const holeRadius = spec.d3 / 2;
  const origin = vec3(face.workplane.origin);
  const axis = vec3(wall.axis).normalize();
  const reference = vec3(wall.reference).normalize();
  const around = vec3(wall.around).normalize();
  const relative = origin.clone().sub(vec3(wall.axisPoint));
  const v0 = relative.dot(axis);
  const u0 = Math.atan2(relative.dot(around), relative.dot(reference)) * wall.radius;
  const nearEdge = (u: number, v: number) => {
    let distance = Infinity;
    for (const [a, b] of wall.outline.edges) {
      const du = b.u - a.u;
      const dv = b.v - a.v;
      const denominator = du * du + dv * dv;
      const offsets = wall.outline.closed ? [-wall.outline.circumference, 0, wall.outline.circumference] : [0];
      for (const offset of offsets) {
        const au = a.u + offset;
        const along = denominator > 0 ? Math.max(0, Math.min(1, ((u - au) * du + (v - a.v) * dv) / denominator)) : 0;
        distance = Math.min(distance, Math.hypot(u - (au + along * du), v - (a.v + along * dv)));
      }
    }
    return distance;
  };
  const rim = Math.min(...[u0, u0 + wall.outline.circumference, u0 - wall.outline.circumference].map((u) => nearEdge(u, v0)));
  const edgeDistance = Math.min(rim, wall.radius);
  const normal = vec3(face.workplane.normal).normalize();
  const tangent = vec3(face.workplane.xAxis).normalize();
  const vertical = vec3(face.workplane.zAxis).normalize();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const hitPoint = new THREE.Vector3();
  /** The next surface behind a point of the wall, looking into the body. */
  const nextSurface = (start: THREE.Vector3) => {
    const ray = new THREE.Ray(start.clone().addScaledVector(normal, -0.001), normal.clone().negate());
    const triangles = wall.others;
    let nearest = Infinity;
    for (let i = 0; i + 8 < triangles.length; i += 9) {
      a.set(triangles[i], triangles[i + 1], triangles[i + 2]);
      b.set(triangles[i + 3], triangles[i + 4], triangles[i + 5]);
      c.set(triangles[i + 6], triangles[i + 7], triangles[i + 8]);
      const hit = ray.intersectTriangle(a, b, c, false, hitPoint);
      if (hit) {
        const distance = hit.distanceTo(start);
        if (distance > 0.002 && distance < nearest) nearest = distance;
      }
    }
    return nearest;
  };
  let available = !wall.outside || wall.radius - (holeRadius + spec.W) < 0 ? 0 : Infinity;
  if (available !== 0) {
    for (const [u, v] of footprintSpots(holeRadius)) {
      if (Math.abs(u) >= wall.radius) {
        available = 0;
        break;
      }
      // The wall bends away from the tangent plane: the chord is the depth to the far side of a solid cylinder.
      const sag = wall.radius - Math.sqrt(wall.radius * wall.radius - u * u);
      const chord = 2 * Math.sqrt(wall.radius * wall.radius - u * u);
      const surface = origin.clone().addScaledVector(tangent, u).addScaledVector(vertical, v).addScaledVector(normal, -sag);
      available = Math.min(available, Math.min(chord, nextSurface(surface)));
    }
  }
  return checkThreadInsert(spec, {
    edgeDistance: Number.isFinite(edgeDistance) ? edgeDistance : 0,
    materialDepth: Number.isFinite(available) ? available : 0,
  });
}

/** Whether a hole of this size may be made at the face's spot, and what the part offers there. */
export function measureThreadInsert(face: ThreadInsertFace, spec: ThreadInsertSpec): ThreadInsertResult {
  if (isRoundWallFace(face)) return measureRoundWall(face, spec);
  let available = Infinity;
  for (const [u, v] of footprintSpots(spec.d3 / 2)) {
    const depth = depthBehind(face, u, v);
    if (depth === null) {
      available = 0;
      break;
    }
    available = Math.min(available, depth);
  }
  return checkThreadInsert(spec, { edgeDistance: distanceToEdge(face), materialDepth: Number.isFinite(available) ? available : 0 });
}

/**
 * The hole shape for the insert on the face: a cylinder in hole mode, its foot the insert's length inside the body, its
 * top a little (`HOLE_OVERSHOOT`) outside. Nothing is cut here: grouping it with the body does that.
 */
export function makeThreadInsertHole(face: ThreadInsertFace, spec: ThreadInsertSpec): WorkplaneShape {
  const asset = toolbarShapeAssets.find((entry) => entry.kind === "cylinder");
  if (!asset) throw new Error("The cylinder shape is missing");
  const { workplane } = face;
  const normal = vec3(workplane.normal).normalize();
  const base = vec3(workplane.origin).addScaledVector(normal, -spec.L);
  const height = spec.L + HOLE_OVERSHOOT;
  const sizeName = spec.name === CUSTOM_THREAD_INSERT ? `Ø${spec.d3}` : spec.name;
  const made = makeShapeFromAsset(
    { ...asset, name: t("threadInsert.holeName", { size: sizeName }) },
    { x: 0, z: 0, elevation: 0 },
    { width: spec.d3, depth: spec.d3, height },
  );
  const sized = { ...made, width: spec.d3, depth: spec.d3, size: spec.d3, height };
  return canonicalizeShape(withHoleMode({ ...sized, ...placementPatchForNewShape(sized, workplane, base) }, true));
}

/**
 * The middle of the picked face as the purple mark shows it: on a flat face the middle of its extent, if that lies on
 * the material; on a round wall the same angle at half the wall's height. Null where there is none.
 */
export function threadInsertSurfaceCenter(face: ThreadInsertFace): { point: Vec; normal: Vec } | null {
  const { workplane: w } = face;
  if (isRoundWallFace(face)) {
    const values = face.round.outline.edges.flatMap(([a, b]) => [a.v, b.v]);
    if (values.length === 0 || values.some((value) => !Number.isFinite(value))) return null;
    const low = Math.min(...values);
    const high = Math.max(...values);
    if (!(high > low)) return null;
    const { axis, axisPoint } = face.round;
    const currentV = (w.origin.x - axisPoint.x) * axis.x + (w.origin.y - axisPoint.y) * axis.y + (w.origin.z - axisPoint.z) * axis.z;
    const shift = (low + high) / 2 - currentV;
    return { point: { x: w.origin.x + axis.x * shift, y: w.origin.y + axis.y * shift, z: w.origin.z + axis.z * shift }, normal: { ...w.normal } };
  }
  const { loops } = face.outline;
  const points = loops.flat();
  if (points.length < 3) return null;
  const us = points.map((p) => p.u);
  const vs = points.map((p) => p.v);
  const u = (Math.min(...us) + Math.max(...us)) / 2;
  const v = (Math.min(...vs) + Math.max(...vs)) / 2;
  if (![u, v].every(Number.isFinite) || !insideLoops(loops, u, v)) return null;
  return {
    point: {
      x: w.origin.x + w.xAxis.x * u + w.zAxis.x * v,
      y: w.origin.y + w.xAxis.y * u + w.zAxis.y * v,
      z: w.origin.z + w.xAxis.z * u + w.zAxis.z * v,
    },
    normal: { ...w.normal },
  };
}
