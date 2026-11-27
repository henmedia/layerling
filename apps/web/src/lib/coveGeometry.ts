import * as THREE from "three";

/**
 * The cove (Facebook, Car'OS): a strip that fills an inside corner, its open side hollowed out round. Seen from the
 * front it is the wedge's right triangle, the right angle at the bottom of +x, with the slope replaced by an arc of a
 * circle that bows towards the corner; pushed along the depth like the wedge.
 *
 * The arc runs from the end of the bottom side (-w/2, 0) to the top of the upright side (w/2, h). Its radius cannot be
 * smaller than the one at which it leaves the longer side tangent: below that it would bow out of the frame. With
 * width and height equal that radius is the width, the arc a quarter circle tangent to both sides, the hollow a fillet
 * leaves. A larger radius makes the hollow flatter, towards the wedge.
 *
 * The edge thickness: left to itself the hollow runs out to nothing at both ends, two edges as thin as paper that a
 * printer cannot lay and a fillet eats away. With a thickness the two ends are cut square that thick, and the hollow
 * lies between them, in the frame that is left: the arc then runs from (-w/2, t) to (w/2 - t, h).
 */

/** A radius as large as this many times the smallest is a slope to the eye; the slider and the stored value end there. */
export const COVE_MAX_RADIUS_FACTOR = 20;
/** What the edge thickness leaves of the shorter side for the hollow, at the least. */
const COVE_MIN_HOLLOW = 0.5;

/** The edge thickness the body is built with: the stored one within what the sides allow, none if none is stored. */
export function coveLand(width: number, height: number, stored?: number) {
  if (typeof stored !== "number" || !Number.isFinite(stored) || stored <= 0) return 0;
  return Math.max(0, Math.min(stored, Math.min(width, height) - COVE_MIN_HOLLOW));
}

/** The largest edge thickness these sides take. */
export function coveMaxLand(width: number, height: number) {
  return Math.max(0, Math.min(width, height) - COVE_MIN_HOLLOW);
}

/** The value to store for an edge thickness typed: none for none. */
export function normalizeCoveLand(width: number, height: number, value: number | undefined): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  const land = coveLand(width, height, value);
  return land > 1e-6 ? land : undefined;
}

/** The smallest radius the hollow can have for these sides: the arc then leaves the longer side tangent. */
export function coveMinRadius(width: number, height: number, land = 0) {
  const t = coveLand(width, height, land);
  const w = Math.max(1e-6, width - t);
  const h = Math.max(1e-6, height - t);
  return (w * w + h * h) / (2 * Math.min(w, h));
}

/** The largest radius offered for these sides. */
export function coveMaxRadius(width: number, height: number, land = 0) {
  return coveMinRadius(width, height, land) * COVE_MAX_RADIUS_FACTOR;
}

/** The radius the hollow is built with: the stored one within what the sides allow, the smallest if none is stored. */
export function coveRadius(width: number, height: number, stored?: number, land = 0) {
  const min = coveMinRadius(width, height, land);
  if (typeof stored !== "number" || !Number.isFinite(stored) || stored <= min) return min;
  return Math.min(stored, min * COVE_MAX_RADIUS_FACTOR);
}

/** The value to store for a radius typed: none for the smallest, which then follows the sides when they change. */
export function normalizeCoveRadius(width: number, height: number, value: number | undefined, land = 0): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  const min = coveMinRadius(width, height, land);
  if (value <= min + 1e-6) return undefined;
  return Math.min(value, min * COVE_MAX_RADIUS_FACTOR);
}

export type CoveArc = { cx: number; cz: number; radius: number; start: number; end: number };

/**
 * The hollow's arc in the front view (x across, z up, the body standing on z = 0), from its upper end down to its
 * lower one: from (w/2 - t, h) to (-w/2, t) for an edge thickness t. With what follows it - the lower end's square
 * edge, the corner, the upper end's square edge - the outline runs counter-clockwise.
 */
export function coveArc(width: number, height: number, stored?: number, land = 0): CoveArc {
  const t = coveLand(width, height, land);
  // The hollow's own frame: what the two square ends leave, its corner at (w/2 - t, t).
  const w = Math.max(1e-6, width - t);
  const h = Math.max(1e-6, height - t);
  const radius = coveRadius(width, height, stored, t);
  const chord = Math.hypot(w, h);
  // The centre lies on the far side of the chord from the corner, so the arc bows towards the corner.
  const off = Math.sqrt(Math.max(0, radius * radius - (chord * chord) / 4));
  const cx = (-h / chord) * off - t / 2;
  const cz = h / 2 + (w / chord) * off + t;
  const start = Math.atan2(height - cz, width / 2 - t - cx);
  let delta = Math.atan2(t - cz, -width / 2 - cx) - start;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return { cx, cz, radius, start, end: start + delta };
}

/** How many straight pieces draw the arc: the gap to the true circle stays below 0.005 mm, within 8 to 128 pieces. */
export function coveArcSegments(arc: CoveArc) {
  const sweep = Math.abs(arc.end - arc.start);
  const step = 2 * Math.acos(Math.max(-1, Math.min(1, 1 - 0.005 / Math.max(arc.radius, 0.01))));
  return Math.max(8, Math.min(128, Math.ceil(sweep / Math.max(step, 1e-4))));
}

/**
 * The outline in the front view, counter-clockwise, the corner of the right angle last: the top of the upright side
 * (only with an edge thickness, where the arc ends short of it), along the arc from its upper end down, the end of
 * the bottom side (again only with a thickness), then the corner.
 */
export function coveOutline(width: number, height: number, stored?: number, segments?: number, land = 0): Array<{ x: number; z: number }> {
  const w = Math.max(1e-6, width);
  const h = Math.max(1e-6, height);
  const t = coveLand(w, h, land);
  const arc = coveArc(w, h, stored, t);
  const count = Math.max(1, Math.round(segments ?? coveArcSegments(arc)));
  const points: Array<{ x: number; z: number }> = [];
  if (t > 0) points.push({ x: w / 2, z: h });
  for (let index = 0; index <= count; index += 1) {
    // The two ends exactly where the sides end, so the body fills its frame to the last digit.
    if (index === 0) points.push({ x: w / 2 - t, z: h });
    else if (index === count) points.push({ x: -w / 2, z: t });
    else {
      const angle = arc.start + ((arc.end - arc.start) * index) / count;
      points.push({ x: arc.cx + arc.radius * Math.cos(angle), z: arc.cz + arc.radius * Math.sin(angle) });
    }
  }
  if (t > 0) points.push({ x: -w / 2, z: 0 });
  points.push({ x: w / 2, z: 0 });
  return points;
}

/**
 * The cove as a closed mesh: x across, y up from 0, the depth along z about its middle. Every point of the outline is
 * seen from the corner of the right angle, so the two ends are fans from it.
 */
export function createCoveGeometry(width: number, height: number, depth: number, stored?: number, land = 0) {
  const outline = coveOutline(width, height, stored, undefined, land);
  const count = outline.length;
  const corner = count - 1;
  const d = depth / 2;
  const vertices = new Float32Array(count * 6);
  outline.forEach((point, index) => {
    // The front end (+z) first, then the back end (-z).
    vertices.set([point.x, point.z, d], index * 3);
    vertices.set([point.x, point.z, -d], (count + index) * 3);
  });
  const indices: number[] = [];
  for (let index = 0; index < corner - 1; index += 1) {
    // Counter-clockwise seen from +z on the front end, the other way round on the back end.
    indices.push(corner, index, index + 1);
    indices.push(count + corner, count + index + 1, count + index);
  }
  for (let index = 0; index < count; index += 1) {
    const next = (index + 1) % count;
    indices.push(index, count + index, count + next, index, count + next, next);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  const flat = geometry.toNonIndexed();
  flat.computeVertexNormals();
  return flat;
}
