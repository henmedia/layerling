import * as THREE from "three";

/**
 * The circle through three points of an edge, or null when the edge is no circle: the centre, the radius
 * and the unit normal of its plane. Every point of the edge has to lie on it (an arc counts, a full ring too).
 */
export function circleOfEdgePoints(points: readonly THREE.Vector3[]) {
  if (points.length < 4) return null;
  const a = points[0];
  const b = points[Math.floor(points.length / 3)];
  const c = points[Math.floor((points.length * 2) / 3)];
  const ab = b.clone().sub(a);
  const ac = c.clone().sub(a);
  const normal = ab.clone().cross(ac);
  const normalLengthSquared = normal.lengthSq();
  if (normalLengthSquared < 1e-12) return null;
  const center = a.clone().add(
    normal.clone().cross(ab).multiplyScalar(ac.lengthSq()).add(ac.clone().cross(normal).multiplyScalar(ab.lengthSq())).multiplyScalar(1 / (2 * normalLengthSquared)),
  );
  const radius = center.distanceTo(a);
  if (!(radius > 1e-6)) return null;
  const unitNormal = normal.clone().normalize();
  const tolerance = Math.max(1e-4, radius * 5e-3);
  const onCircle = points.every((point) => Math.abs(center.distanceTo(point) - radius) <= tolerance && Math.abs(point.clone().sub(center).dot(unitNormal)) <= tolerance);
  return onCircle ? { center, radius, normal: unitNormal } : null;
}

/**
 * The place on the true circle nearest to `point`. The display edge of a circle is a polygon, and a
 * point on one of its sides lies a little inside the circle; measured from there, a diameter comes out
 * a few hundredths short.
 */
export function pointOnCircle(circle: { center: THREE.Vector3; radius: number; normal: THREE.Vector3 }, point: THREE.Vector3) {
  const offset = point.clone().sub(circle.center);
  offset.addScaledVector(circle.normal, -offset.dot(circle.normal));
  const length = offset.length();
  return length > 1e-9 ? circle.center.clone().addScaledVector(offset, circle.radius / length) : point.clone();
}

/** The point across the circle: the other end of the diameter that starts at `point`, when `point` lies on it. */
export function pointAcrossCircle(circle: { center: THREE.Vector3; radius: number }, point: THREE.Vector3) {
  if (Math.abs(circle.center.distanceTo(point) - circle.radius) > Math.max(1e-4, circle.radius * 0.02)) return null;
  return circle.center.clone().multiplyScalar(2).sub(point);
}

/**
 * The foot of the perpendicular from `from` onto the straight segment `a`–`b`, when it falls on
 * the segment itself and is not `from` itself (#589).
 */
export function perpendicularFootOnSegment(from: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3) {
  const ab = b.clone().sub(a);
  const lengthSquared = ab.lengthSq();
  if (lengthSquared <= 1e-12) return null;
  const rawAmount = from.clone().sub(a).dot(ab) / lengthSquared;
  if (rawAmount < -1e-6 || rawAmount > 1 + 1e-6) return null;
  const amount = Math.max(0, Math.min(1, rawAmount));
  const point = a.clone().addScaledVector(ab, amount);
  if (point.distanceToSquared(from) <= 1e-12) return null;
  return { point, amount };
}

/**
 * The foot of the perpendicular from `from` onto the plane through `planePoint` with normal
 * `planeNormal`, or null when `from` already lies in that plane (#589).
 */
export function perpendicularFootOnPlane(from: THREE.Vector3, planePoint: THREE.Vector3, planeNormal: THREE.Vector3) {
  const length = planeNormal.length();
  if (length <= 1e-9) return null;
  const unitNormal = planeNormal.clone().divideScalar(length);
  const signedDistance = from.clone().sub(planePoint).dot(unitNormal);
  if (Math.abs(signedDistance) <= 1e-6) return null;
  return from.clone().addScaledVector(unitNormal, -signedDistance);
}

/**
 * The points on a circle where the line from `from` meets the circle radially (at a right angle to
 * the tangent): the nearest and the farthest point on the ring, excluding `from` itself (#589).
 */
export function perpendicularPointsOnCircle(
  circle: { center: THREE.Vector3; radius: number; normal: THREE.Vector3 },
  from: THREE.Vector3,
) {
  const offset = from.clone().sub(circle.center);
  offset.addScaledVector(circle.normal, -offset.dot(circle.normal));
  const length = offset.length();
  if (length <= 1e-6) return [];
  const radial = offset.divideScalar(length);
  const near = circle.center.clone().addScaledVector(radial, circle.radius);
  const far = circle.center.clone().addScaledVector(radial, -circle.radius);
  const tolerance = Math.max(1e-4, circle.radius * 0.02);
  return [near, far].filter((point) => point.distanceTo(from) > tolerance);
}

/**
 * Locks `target` to the cardinal world axis (X, Y or Z) along which it has moved furthest from
 * `from`, projected into the plane through `from` with normal `planeNormal` when given (#589).
 */
export function axisLockedPoint(from: THREE.Vector3, target: THREE.Vector3, planeNormal?: THREE.Vector3 | null) {
  const delta = target.clone().sub(from);
  if (delta.lengthSq() <= 1e-12) return target.clone();
  const axes = [
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, 0, 1),
  ];
  const normal = planeNormal && planeNormal.lengthSq() > 1e-12 ? planeNormal.clone().normalize() : null;
  let bestPoint: THREE.Vector3 | null = null;
  let bestProjection = -1;
  for (const rawAxis of axes) {
    const axis = normal ? rawAxis.clone().addScaledVector(normal, -rawAxis.dot(normal)) : rawAxis;
    const axisLength = axis.length();
    if (axisLength <= 1e-6) continue;
    axis.divideScalar(axisLength);
    const signed = delta.dot(axis);
    if (Math.abs(signed) > bestProjection) {
      bestProjection = Math.abs(signed);
      bestPoint = from.clone().addScaledVector(axis, signed);
    }
  }
  return bestPoint ?? target.clone();
}


/**
 * How far the body at one end of a measurement moves when a length is typed for it: along the
 * measured line until the two points are `length` apart (#823). A negative length takes that end
 * past the other point by as much, for a hole inside a box measured from the box's edge (#963).
 * Null when the points lie on top of each other and give no direction.
 */
export function tapeLengthShift(start: THREE.Vector3, end: THREE.Vector3, length: number, movesEnd: boolean) {
  const current = start.distanceTo(end);
  if (current < 1e-6) return null;
  const shift = end.clone().sub(start).multiplyScalar((length - current) / current);
  return movesEnd ? shift : shift.negate();
}

/**
 * The same for the reach along one axis, as the label's tip lists it (Discussion #610): the body moves
 * along that axis only, until the two points are `length` apart on it, and stays where it was on the
 * other two. It stays on the side of the other point it was on; a negative length takes it that far
 * to the other side. `axis` is the axis inside the scene (y up). Null when the points are level on it.
 */
export function tapeAxisLengthShift(start: THREE.Vector3, end: THREE.Vector3, axis: "x" | "y" | "z", length: number, movesEnd: boolean) {
  const current = end[axis] - start[axis];
  if (Math.abs(current) < 1e-6) return null;
  const shift = new THREE.Vector3();
  shift[axis] = Math.sign(current) * length - current;
  return movesEnd ? shift : shift.negate();
}

/**
 * What a whole round edge measures (asked for in the Facebook group): a full circle its diameter, an arc its radius,
 * each with the length along the edge. A circle's polyline may stop one side short of where it began, so a gap no
 * longer than its longest side still counts as closed. Null for any edge that is not round.
 */
export function roundEdgeMeasure(points: readonly THREE.Vector3[]) {
  const circle = circleOfEdgePoints(points);
  if (!circle) return null;
  let length = 0;
  let longestSide = 0;
  for (let index = 0; index + 1 < points.length; index += 1) {
    const side = points[index].distanceTo(points[index + 1]);
    length += side;
    longestSide = Math.max(longestSide, side);
  }
  const gap = points[0].distanceTo(points[points.length - 1]);
  const full = gap <= longestSide * 1.01 + Math.max(1e-6, circle.radius * 1e-4);
  return { full, diameter: circle.radius * 2, radius: circle.radius, length: full ? length + gap : length };
}

/**
 * A closed round edge (a whole circle, the rim of a cylinder or a hole) and how close a point has to come to one of
 * its points to lie on it; null for any other edge.
 */
export function closedRoundEdge(points: readonly THREE.Vector3[]) {
  const round = roundEdgeMeasure(points);
  return round?.full ? { points, tolerance: Math.max(1e-6, round.radius * 1e-4) } : null;
}

/**
 * Whether a corner only sits on a closed round edge: where the side lines of a faceted cylinder end on its rim, each
 * end is a corner of its line, but on the rim it is just one of its points. A click there means the rim, so its
 * diameter comes in one click on a cylinder too, not only on a half sphere (Making Layers, 1.142.0).
 */
export function cornerOnRoundEdge(corner: THREE.Vector3, edge: { points: readonly THREE.Vector3[]; tolerance: number }) {
  return edge.points.some((point) => point.distanceTo(corner) <= edge.tolerance);
}
