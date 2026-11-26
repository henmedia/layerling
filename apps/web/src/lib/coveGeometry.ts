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
 */

/** A radius as large as this many times the smallest is a slope to the eye; the slider and the stored value end there. */
export const COVE_MAX_RADIUS_FACTOR = 20;

/** The smallest radius the hollow can have for these sides: the arc then leaves the longer side tangent. */
export function coveMinRadius(width: number, height: number) {
  const w = Math.max(1e-6, width);
  const h = Math.max(1e-6, height);
  return (w * w + h * h) / (2 * Math.min(w, h));
}

/** The largest radius offered for these sides. */
export function coveMaxRadius(width: number, height: number) {
  return coveMinRadius(width, height) * COVE_MAX_RADIUS_FACTOR;
}

/** The radius the hollow is built with: the stored one within what the sides allow, the smallest if none is stored. */
export function coveRadius(width: number, height: number, stored?: number) {
  const min = coveMinRadius(width, height);
  if (typeof stored !== "number" || !Number.isFinite(stored) || stored <= min) return min;
  return Math.min(stored, min * COVE_MAX_RADIUS_FACTOR);
}

/** The value to store for a radius typed: none for the smallest, which then follows the sides when they change. */
export function normalizeCoveRadius(width: number, height: number, value: number | undefined): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  const min = coveMinRadius(width, height);
  if (value <= min + 1e-6) return undefined;
  return Math.min(value, min * COVE_MAX_RADIUS_FACTOR);
}

export type CoveArc = { cx: number; cz: number; radius: number; start: number; end: number };

/**
 * The hollow's arc in the front view (x across, z up, the body standing on z = 0), from the top of the upright side
 * down to the end of the bottom side: with the corner (w/2, 0) after it the outline runs counter-clockwise.
 */
export function coveArc(width: number, height: number, stored?: number): CoveArc {
  const w = Math.max(1e-6, width);
  const h = Math.max(1e-6, height);
  const radius = coveRadius(w, h, stored);
  const chord = Math.hypot(w, h);
  // The centre lies on the far side of the chord from the corner, so the arc bows towards the corner.
  const off = Math.sqrt(Math.max(0, radius * radius - (chord * chord) / 4));
  const cx = (-h / chord) * off;
  const cz = h / 2 + (w / chord) * off;
  const start = Math.atan2(h - cz, w / 2 - cx);
  let delta = Math.atan2(0 - cz, -w / 2 - cx) - start;
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

/** The outline in the front view, counter-clockwise: along the arc from the top down, then the corner. */
export function coveOutline(width: number, height: number, stored?: number, segments?: number): Array<{ x: number; z: number }> {
  const w = Math.max(1e-6, width);
  const h = Math.max(1e-6, height);
  const arc = coveArc(w, h, stored);
  const count = Math.max(1, Math.round(segments ?? coveArcSegments(arc)));
  const points: Array<{ x: number; z: number }> = [];
  for (let index = 0; index <= count; index += 1) {
    // The two ends exactly where the sides end, so the body fills its frame to the last digit.
    if (index === 0) points.push({ x: w / 2, z: h });
    else if (index === count) points.push({ x: -w / 2, z: 0 });
    else {
      const angle = arc.start + ((arc.end - arc.start) * index) / count;
      points.push({ x: arc.cx + arc.radius * Math.cos(angle), z: arc.cz + arc.radius * Math.sin(angle) });
    }
  }
  points.push({ x: w / 2, z: 0 });
  return points;
}

/**
 * The cove as a closed mesh: x across, y up from 0, the depth along z about its middle. Every point of the arc is
 * seen from the corner, so the two ends are fans from it.
 */
export function createCoveGeometry(width: number, height: number, depth: number, stored?: number) {
  const outline = coveOutline(width, height, stored);
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
