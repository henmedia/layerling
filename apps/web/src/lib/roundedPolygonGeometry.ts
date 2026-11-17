import * as THREE from "three";
import { extrudeOutlineGeometry, type OutlinePoint } from "@/lib/outlineExtrusion";
import { regularPolygonFootprintScale } from "@/lib/regularPolygonFootprint";

/**
 * Polygon with rounded corners: every corner of the outline seen from above rounded with one radius, like the
 * corners of a Rounded box. The corners stand where the plain polygon has them (prismGeometry.ts), so a rounding
 * of 0 is the same body; the radius is in millimetres, so a stretched polygon keeps round, not oval, corners.
 */
const STEPS_PER_TURN = 96;

function sideCount(sides: number | undefined) {
  return Math.max(3, Math.round(sides ?? 6));
}

/** The corners of the polygon in its frame, as the plain polygon has them: x along the width, y along the depth. */
export function polygonCorners(width: number, depth: number, sides: number | undefined): OutlinePoint[] {
  const count = sideCount(sides);
  const fit = regularPolygonFootprintScale(width, depth, count);
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2;
    return { x: fit.offsetX + fit.x * Math.sin(angle), y: fit.offsetZ + fit.z * Math.cos(angle) };
  });
}

/** Half the opening angle of the corner at `i`, between its two edges. */
function halfCornerAngle(corners: OutlinePoint[], i: number) {
  const n = corners.length;
  const p = corners[i];
  const a = corners[(i + n - 1) % n];
  const b = corners[(i + 1) % n];
  const u = new THREE.Vector2(a.x - p.x, a.y - p.y).normalize();
  const v = new THREE.Vector2(b.x - p.x, b.y - p.y).normalize();
  return Math.acos(THREE.MathUtils.clamp(u.dot(v), -1, 1)) / 2;
}

/** The largest radius that fits: the roundings of two neighbouring corners may meet on their edge, not overlap. */
export function maxPolygonCornerRadius(width: number, depth: number, sides: number | undefined) {
  const corners = polygonCorners(width, depth, sides);
  const n = corners.length;
  let limit = Number.POSITIVE_INFINITY;
  for (let i = 0; i < n; i += 1) {
    const j = (i + 1) % n;
    const length = Math.hypot(corners[j].x - corners[i].x, corners[j].y - corners[i].y);
    const along = 1 / Math.tan(halfCornerAngle(corners, i)) + 1 / Math.tan(halfCornerAngle(corners, j));
    limit = Math.min(limit, length / along);
  }
  return Number.isFinite(limit) ? Math.max(0, limit * 0.999) : 0;
}

export function normalizePolygonCornerRadius(value: unknown, width: number, depth: number, sides: number | undefined) {
  const radius = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return THREE.MathUtils.clamp(radius, 0, maxPolygonCornerRadius(width, depth, sides));
}

/** The outline with every corner rounded by `radius` (already fitting), in order round the polygon. */
export function roundedPolygonOutline(width: number, depth: number, sides: number | undefined, radius: number): OutlinePoint[] {
  const corners = polygonCorners(width, depth, sides);
  const r = normalizePolygonCornerRadius(radius, width, depth, sides);
  if (r <= 0) return corners;
  const n = corners.length;
  const points: OutlinePoint[] = [];
  for (let i = 0; i < n; i += 1) {
    const p = new THREE.Vector2(corners[i].x, corners[i].y);
    const toPrev = new THREE.Vector2(corners[(i + n - 1) % n].x, corners[(i + n - 1) % n].y).sub(p).normalize();
    const toNext = new THREE.Vector2(corners[(i + 1) % n].x, corners[(i + 1) % n].y).sub(p).normalize();
    const half = halfCornerAngle(corners, i);
    const along = r / Math.tan(half);
    const start = p.clone().add(toPrev.clone().multiplyScalar(along));
    const end = p.clone().add(toNext.clone().multiplyScalar(along));
    const centre = p.clone().add(toPrev.clone().add(toNext).normalize().multiplyScalar(r / Math.sin(half)));
    const a0 = Math.atan2(start.y - centre.y, start.x - centre.x);
    let delta = Math.atan2(end.y - centre.y, end.x - centre.x) - a0;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    const steps = Math.max(2, Math.ceil((Math.abs(delta) / (Math.PI * 2)) * STEPS_PER_TURN));
    for (let k = 0; k <= steps; k += 1) {
      const a = a0 + (delta * k) / steps;
      const point = { x: centre.x + r * Math.cos(a), y: centre.y + r * Math.sin(a) };
      const last = points[points.length - 1];
      if (!last || Math.hypot(last.x - point.x, last.y - point.y) > 1e-6) points.push(point);
    }
  }
  const first = points[0];
  const last = points[points.length - 1];
  if (points.length > 1 && Math.hypot(first.x - last.x, first.y - last.y) < 1e-6) points.pop();
  return points;
}

/** The polygon with rounded corners, from 0 to `height`, in millimetres. */
export function createRoundedPolygonGeometry(width: number, height: number, depth: number, sides: number | undefined, radius: number) {
  return extrudeOutlineGeometry([roundedPolygonOutline(width, depth, sides, radius)], height);
}

/**
 * The corner dot of a polygon, like the Rounded box's: it sits where the rounding of the front corner (corner 0)
 * starts on the edge to the next corner, so it slides along that edge as the radius changes. `point` is in the
 * polygon's frame (x along the width, y along the depth, round its middle); `gain` turns a pull along the width's
 * axis into a change of the radius (a pull towards +x moves the dot away from the corner, the radius grows).
 */
export function polygonCornerDot(width: number, depth: number, sides: number | undefined, radius: number) {
  const corners = polygonCorners(width, depth, sides);
  const r = normalizePolygonCornerRadius(radius, width, depth, sides);
  const half = halfCornerAngle(corners, 0);
  const direction = new THREE.Vector2(corners[1].x - corners[0].x, corners[1].y - corners[0].y).normalize();
  const along = r / Math.tan(half);
  const point = { x: corners[0].x + direction.x * along, y: corners[0].y + direction.y * along };
  const gain = Math.abs(direction.x) > 1e-3 ? Math.tan(half) / direction.x : 0;
  return { point, gain };
}

/** A pull of the polygon's corner dot by `delta` along the width's axis: the new shared corner radius. */
export function polygonCornerDragPatch(start: { kind?: string; width?: number; depth?: number; size: number; sides?: number; cornerFillet?: number }, delta: number) {
  const width = start.width ?? start.size;
  const depth = start.depth ?? start.size;
  const { gain } = polygonCornerDot(width, depth, start.sides, start.cornerFillet ?? 0);
  const startRadius = normalizePolygonCornerRadius(start.cornerFillet, width, depth, start.sides);
  const next = normalizePolygonCornerRadius(startRadius + delta * gain, width, depth, start.sides);
  return { cornerFillet: Math.round(next * 1e2) / 1e2 };
}
