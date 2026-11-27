import * as THREE from "three";
import type { RoundFaceAxis } from "@/lib/roundFaceAxis";
import { convexHull } from "@/lib/screenHull";

type Vec = { x: number; y: number; z: number };

/**
 * A face clicked for "Align faces": the body, its outward normal and a point
 * on it, in world space. A round face (a hole, a pin) also brings its axis.
 */
export type FacePick = { shapeId: string; normal: Vec; point: Vec; axis?: RoundFaceAxis | null };

/**
 * How the moved face meets the other: "against" puts them face to face (back
 * to back, touching), "flush" lays them in one plane, side by side, and
 * "concentric" puts two round faces on one axis (#794). "point" moves the body
 * so a point on it - a corner, a spot on an edge, the centre of a round edge
 * or a reference point - lands on a point of another body (Discussion #1491).
 */
export type MateMode = "against" | "flush" | "concentric" | "point";

/**
 * A point clicked for "Point to point": the body it lies on, or null for a
 * reference point, and where it is in world space.
 */
export type PointPick = { shapeId: string | null; point: Vec };

/**
 * The axes "Point to point" moves along, named as the editor shows them: X and
 * Y across the plate, Z up. Only X and Y on puts one point straight above or
 * below the other.
 */
export type MateAxes = { x: boolean; y: boolean; z: boolean };

export const ALL_MATE_AXES: MateAxes = { x: true, y: true, z: true };

/**
 * How far "Point to point" moves the body, in world space: the step from the
 * source point to the target point, along the axes switched on only. The
 * editor's Y runs along world z and its Z along world y, the height.
 */
export function pointMotion(source: Vec, target: Vec, axes: MateAxes) {
  return new THREE.Vector3(
    axes.x ? target.x - source.x : 0,
    axes.z ? target.y - source.y : 0,
    axes.y ? target.z - source.z : 0,
  );
}

const vector = (value: Vec) => new THREE.Vector3(value.x, value.y, value.z);

/**
 * The shortest turn that points `from` along `to`. Opposite directions are
 * turned over about an axis across them.
 */
export function shortestTurn(from: Vec, to: Vec): THREE.Quaternion {
  const a = vector(from).normalize();
  const b = vector(to).normalize();
  if (a.dot(b) < -1 + 1e-9) {
    const helper = Math.abs(a.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    return new THREE.Quaternion().setFromAxisAngle(helper.cross(a).normalize(), Math.PI);
  }
  return new THREE.Quaternion().setFromUnitVectors(a, b);
}

/** Triangles whose normal strays further than this from the picked face's belong to another face. */
const FACE_NORMAL_COS = Math.cos(THREE.MathUtils.degToRad(1));
/** How far, in mm, a corner of the face may lie off its plane. */
const FACE_PLANE_TOLERANCE = 0.02;

/**
 * The middle of the flat face of a mesh that a point lies on, for "Centre the faces" (Discussion #2168): the
 * triangles of that plane joined to the one nearest the point, and the centre of area of the convex outline
 * round their corners. Holes in the face and the way it is cut into triangles do not move the middle; a face
 * apart from it in the same plane, a second foot, is not counted. Null when no triangle lies there.
 */
export function faceCentre(
  vertices: ReadonlyArray<readonly [number, number, number]>,
  faces: ReadonlyArray<readonly [number, number, number]>,
  point: Vec,
  normal: Vec,
): THREE.Vector3 | null {
  const along = vector(normal).normalize();
  const at = vector(point);
  const level = at.dot(along);
  const corner = (index: number) => new THREE.Vector3(...(vertices[index] as [number, number, number]));
  const flat: Array<{ corners: THREE.Vector3[]; keys: string[] }> = [];
  let seed = -1;
  let nearest = Number.POSITIVE_INFINITY;
  const triangle = new THREE.Triangle();
  for (const face of faces) {
    const corners = face.map(corner);
    if (corners.some((entry) => Math.abs(entry.dot(along) - level) > FACE_PLANE_TOLERANCE)) continue;
    triangle.set(corners[0], corners[1], corners[2]);
    if (triangle.getNormal(new THREE.Vector3()).dot(along) < FACE_NORMAL_COS) continue;
    const distance = triangle.closestPointToPoint(at, new THREE.Vector3()).distanceTo(at);
    if (distance < nearest) {
      nearest = distance;
      seed = flat.length;
    }
    // Corners are told apart by where they are: a mesh may give each triangle corners of its own.
    flat.push({ corners, keys: corners.map((entry) => `${Math.round(entry.x * 1000)},${Math.round(entry.y * 1000)},${Math.round(entry.z * 1000)}`) });
  }
  if (seed < 0) return null;
  const byCorner = new Map<string, number[]>();
  flat.forEach((entry, index) => entry.keys.forEach((key) => {
    const list = byCorner.get(key);
    if (list) list.push(index);
    else byCorner.set(key, [index]);
  }));
  const joined = new Set([seed]);
  const queue = [seed];
  const seen = new Set<string>();
  const outline: THREE.Vector3[] = [];
  while (queue.length) {
    const entry = flat[queue.pop() as number];
    entry.keys.forEach((key, index) => {
      if (seen.has(key)) return;
      seen.add(key);
      outline.push(entry.corners[index]);
      for (const other of byCorner.get(key) ?? []) {
        if (!joined.has(other)) {
          joined.add(other);
          queue.push(other);
        }
      }
    });
  }
  const helper = Math.abs(along.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const u = helper.cross(along).normalize();
  const v = new THREE.Vector3().crossVectors(along, u);
  const origin = outline[0];
  const hull = convexHull(outline.map((entry) => ({ x: entry.clone().sub(origin).dot(u), y: entry.clone().sub(origin).dot(v) })));
  let area = 0;
  let cx = 0;
  let cy = 0;
  hull.forEach((a, index) => {
    const b = hull[(index + 1) % hull.length];
    const piece = a.x * b.y - b.x * a.y;
    area += piece;
    cx += (a.x + b.x) * piece;
    cy += (a.y + b.y) * piece;
  });
  if (Math.abs(area) < 1e-9) return null;
  const middle = origin.clone().addScaledVector(u, cx / (3 * area)).addScaledVector(v, cy / (3 * area));
  // Onto the face's plane, off which the first corner may lie by a hair.
  return middle.addScaledVector(along, level - middle.dot(along));
}

/**
 * Moves the body of `source` so its face meets the face of `target`: first the
 * shortest turn about the clicked point that makes the faces parallel (none if
 * they already are), then a slide along the target face's normal only, so the
 * body keeps its place sideways. `gap` leaves that much room between the two
 * planes, measured out of the target face. With `centres`, the middles of the
 * two faces, it also slides sideways until they lie over each other.
 */
export function mateMotion(source: Omit<FacePick, "shapeId">, target: Omit<FacePick, "shapeId">, mode: MateMode, gap = 0, centres: { source: Vec; target: Vec } | null = null) {
  const targetNormal = vector(target.normal).normalize();
  const wanted = mode === "against" ? targetNormal.clone().negate() : targetNormal.clone();
  const rotation = shortestTurn(source.normal, wanted);
  const turned = Math.abs(rotation.w) < 1 - 1e-12;
  // The turn is about the clicked point, so that point stays where it is.
  const pivot = vector(source.point);
  const distance = vector(target.point).dot(targetNormal) + gap - pivot.dot(targetNormal);
  const translation = targetNormal.clone().multiplyScalar(distance);
  if (centres) {
    const landed = (turned ? turnedAbout(centres.source, rotation, pivot) : vector(centres.source)).add(translation);
    const sideways = vector(centres.target).sub(landed);
    translation.add(sideways.addScaledVector(targetNormal, -sideways.dot(targetNormal)));
  }
  return { rotation: turned ? rotation : null, pivot, translation };
}

/**
 * Moves the body of `source` so its round face shares the axis of the round
 * face of `target` - a hole over a hole, a pin into a hole: the shortest turn
 * about the source axis's point that makes the axes parallel (either way
 * round, so a body never flips over), then a slide straight across onto the
 * target axis. The body keeps its depth along the axis.
 */
export function concentricMotion(source: Pick<RoundFaceAxis, "point" | "direction">, target: Pick<RoundFaceAxis, "point" | "direction">) {
  const targetDirection = vector(target.direction).normalize();
  const sourceDirection = vector(source.direction).normalize();
  const wanted = sourceDirection.dot(targetDirection) < 0 ? targetDirection.clone().negate() : targetDirection;
  const rotation = shortestTurn(sourceDirection, wanted);
  const turned = Math.abs(rotation.w) < 1 - 1e-12;
  const pivot = vector(source.point);
  const offset = vector(target.point).sub(pivot);
  const translation = offset.addScaledVector(targetDirection, -offset.dot(targetDirection));
  return { rotation: turned ? rotation : null, pivot, translation };
}

/** Closer than this to the pivot or the axis, a point gives no direction to turn by. */
const POINT_TURN_MIN_DISTANCE = 1e-4;

/**
 * "Point to point", second pair (Discussion #1491): the first point already
 * lies where it should, at `pivot`. The body turns about it - the shortest
 * turn - so the line from the pivot through `source` runs through `target`.
 * Null when either point lies on the pivot and gives no direction.
 */
export function pointTurnAboutPivot(pivot: Vec, source: Vec, target: Vec): THREE.Quaternion | null {
  const from = vector(source).sub(vector(pivot));
  const to = vector(target).sub(vector(pivot));
  if (from.length() < POINT_TURN_MIN_DISTANCE || to.length() < POINT_TURN_MIN_DISTANCE) return null;
  return shortestTurn(from, to);
}

/**
 * "Point to point", third pair: the first two pairs fixed a line, from `pivot`
 * towards `axisPoint`. The body turns about that line only, so `source` comes
 * into the plane through the line and `target` - on the same side. Null when
 * either point lies on the line.
 */
export function pointTurnAboutAxis(pivot: Vec, axisPoint: Vec, source: Vec, target: Vec): THREE.Quaternion | null {
  const origin = vector(pivot);
  const axis = vector(axisPoint).sub(origin);
  if (axis.length() < POINT_TURN_MIN_DISTANCE) return null;
  axis.normalize();
  const across = (value: Vec) => {
    const offset = vector(value).sub(origin);
    return offset.addScaledVector(axis, -offset.dot(axis));
  };
  const from = across(source);
  const to = across(target);
  if (from.length() < POINT_TURN_MIN_DISTANCE || to.length() < POINT_TURN_MIN_DISTANCE) return null;
  from.normalize();
  to.normalize();
  const angle = Math.atan2(new THREE.Vector3().crossVectors(from, to).dot(axis), from.dot(to));
  return new THREE.Quaternion().setFromAxisAngle(axis, angle);
}

/** Where a point lands when the body turns by `rotation` about `pivot`. */
export function turnedAbout(point: Vec, rotation: THREE.Quaternion, pivot: Vec): THREE.Vector3 {
  const origin = vector(pivot);
  return vector(point).sub(origin).applyQuaternion(rotation).add(origin);
}
