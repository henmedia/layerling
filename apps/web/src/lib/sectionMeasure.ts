import type { SectionLoop, SectionPoint } from "@/lib/sectionSvg";
import type { SectionPlaneAxis } from "@/lib/sectionView";

/**
 * Messen auf der Schnittebene: Wandstaerken, Spalte und Passungen direkt am
 * aufgeschnittenen Teil. Gerechnet wird in den Blattkoordinaten des
 * Schnitt-SVG (u nach rechts, v nach unten, siehe projectSectionPoint), damit
 * Messung und SVG dieselben Umrisse sehen.
 */

/** The way back from projectSectionPoint: a point of the sheet onto the plane, editor world (y up). */
export function sectionPointToWorld(point: SectionPoint, axis: SectionPlaneAxis, offset: number): [number, number, number] {
  if (axis === "x") return [offset, -point.v, -point.u];
  if (axis === "y") return [point.u, offset, point.v];
  return [point.u, -point.v, offset];
}

export type SectionSnapKind = "perpendicular" | "corner" | "outline" | "center" | "opposite" | "free";
export type SectionSnap = { point: SectionPoint; kind: SectionSnapKind };

function segmentsOf(loop: SectionLoop) {
  const { points } = loop;
  const count = loop.closed ? points.length : points.length - 1;
  const segments: Array<[SectionPoint, SectionPoint]> = [];
  for (let index = 0; index < count; index += 1) {
    segments.push([points[index], points[(index + 1) % points.length]]);
  }
  return segments;
}

/** Where on segment a-b the point p falls, as a share 0..1 of its length (unclamped). */
function along(p: SectionPoint, a: SectionPoint, b: SectionPoint) {
  const du = b.u - a.u;
  const dv = b.v - a.v;
  const lengthSq = du * du + dv * dv;
  return lengthSq < 1e-18 ? 0 : ((p.u - a.u) * du + (p.v - a.v) * dv) / lengthSq;
}

function lerp(a: SectionPoint, b: SectionPoint, t: number): SectionPoint {
  return { u: a.u + (b.u - a.u) * t, v: a.v + (b.v - a.v) * t };
}

function distance(a: SectionPoint, b: SectionPoint) {
  return Math.hypot(a.u - b.u, a.v - b.v);
}

export type SectionCircle = { center: SectionPoint; radius: number };

const circleCache = new WeakMap<SectionLoop, SectionCircle | null>();

/**
 * The circle a closed outline lies on, or null when it is not one (#375). A cut through a cylinder,
 * a hole or a revolved body is a polygon with all its corners on one circle; fitting the circle
 * through them gives the true centre and radius, which the polygon's corners alone cannot. Fewer
 * than twelve corners are never taken for a circle, so a square or a hexagon stays a polygon.
 */
export function circleOfLoop(loop: SectionLoop): SectionCircle | null {
  if (circleCache.has(loop)) return circleCache.get(loop) ?? null;
  const circle = fitCircle(loop);
  circleCache.set(loop, circle);
  return circle;
}

function fitCircle(loop: SectionLoop): SectionCircle | null {
  const { points } = loop;
  const count = points.length;
  if (!loop.closed || count < 12) return null;
  // Kasa fit, on points moved to their mean so large offsets cost no precision.
  let meanU = 0;
  let meanV = 0;
  points.forEach((point) => {
    meanU += point.u;
    meanV += point.v;
  });
  meanU /= count;
  meanV /= count;
  let suu = 0;
  let svv = 0;
  let suv = 0;
  let suuu = 0;
  let svvv = 0;
  let suvv = 0;
  let svuu = 0;
  points.forEach((point) => {
    const x = point.u - meanU;
    const y = point.v - meanV;
    suu += x * x;
    svv += y * y;
    suv += x * y;
    suuu += x * x * x;
    svvv += y * y * y;
    suvv += x * y * y;
    svuu += y * x * x;
  });
  const det = suu * svv - suv * suv;
  if (Math.abs(det) < 1e-12) return null;
  const rightU = 0.5 * (suuu + suvv);
  const rightV = 0.5 * (svvv + svuu);
  const centerU = (rightU * svv - rightV * suv) / det;
  const centerV = (suu * rightV - suv * rightU) / det;
  const radius = Math.sqrt(centerU * centerU + centerV * centerV + (suu + svv) / count);
  if (!Number.isFinite(radius) || radius < 1e-6) return null;
  const center = { u: meanU + centerU, v: meanV + centerV };
  const tolerance = Math.max(0.004 * radius, 1e-4);
  if (points.some((point) => Math.abs(distance(point, center) - radius) > tolerance)) return null;
  // The corners must go all the way round: a D-shape with a long straight side is not a circle.
  const angles = points.map((point) => Math.atan2(point.v - center.v, point.u - center.u)).sort((a, b) => a - b);
  let widestGap = angles[0] + 2 * Math.PI - angles[count - 1];
  for (let index = 1; index < count; index += 1) widestGap = Math.max(widestGap, angles[index] - angles[index - 1]);
  if (widestGap > (100 * Math.PI) / 180) return null;
  return { center, radius };
}

function circleTolerance(circle: SectionCircle) {
  return Math.max(0.004 * circle.radius, 1e-3);
}

/**
 * How much farther than the other snaps the point across a circle catches the pointer (#2123): it
 * is shown as soon as the first point lies on the circle, so the pointer only has to come near it.
 */
export const SECTION_OPPOSITE_REACH = 2.5;

/**
 * The points across the centre from `from`, one for each round outline `from` lies on (#2123).
 * Shown while the second point is still open, so it is clear where to click for the diameter.
 */
export function sectionPointsAcross(from: SectionPoint, loops: readonly SectionLoop[]): SectionPoint[] {
  const across: SectionPoint[] = [];
  loops.forEach((loop) => {
    const circle = circleOfLoop(loop);
    if (!circle) return;
    const fromAway = distance(from, circle.center);
    if (fromAway < circleTolerance(circle) || Math.abs(fromAway - circle.radius) > circleTolerance(circle)) return;
    across.push({ u: 2 * circle.center.u - from.u, v: 2 * circle.center.v - from.v });
  });
  return across;
}

/**
 * Snap a point of the cutting plane onto the cut's outline, `radius` in sheet
 * millimetres. A corner right under the cursor wins. Then, with a first point
 * `from`, the foot of the perpendicular from it onto the wall near the cursor
 * - wherever along that wall the cursor is, so a click anywhere on the
 * opposite wall gives the wall thickness or the gap. Then the nearest point of
 * the outline; off the outline the point stays where it is.
 *
 * Round outlines add three snaps (#375), all before the corners: the centre of the circle; with a
 * first point on the circle, the point exactly across the centre, so two clicks give the diameter;
 * and with the centre as the first point, the point of the circle in the direction of the cursor,
 * so two clicks give the radius.
 */
export function snapSectionPoint(target: SectionPoint, loops: readonly SectionLoop[], radius: number, from: SectionPoint | null = null): SectionSnap {
  let perpendicular: SectionPoint | null = null;
  let perpendicularDistance = radius;
  let corner: SectionPoint | null = null;
  let cornerDistance = radius * 0.6;
  let nearest: SectionPoint | null = null;
  let nearestDistance = radius;
  let nearestCircle: SectionCircle | null = null;
  const circles = loops.map(circleOfLoop).filter((circle): circle is SectionCircle => circle !== null);
  if (from) {
    for (const circle of circles) {
      const fromAway = distance(from, circle.center);
      if (fromAway < circleTolerance(circle)) {
        const targetAway = distance(target, circle.center);
        if (targetAway > 1e-9 && Math.abs(targetAway - circle.radius) <= radius) {
          const scale = circle.radius / targetAway;
          return { point: { u: circle.center.u + (target.u - circle.center.u) * scale, v: circle.center.v + (target.v - circle.center.v) * scale }, kind: "outline" };
        }
      } else if (Math.abs(fromAway - circle.radius) <= circleTolerance(circle)) {
        const across = { u: 2 * circle.center.u - from.u, v: 2 * circle.center.v - from.v };
        if (distance(across, target) <= radius * SECTION_OPPOSITE_REACH) return { point: across, kind: "opposite" };
      }
    }
  }
  // A circle smaller than the reach would take every click, so its centre only snaps on larger ones.
  let center: SectionPoint | null = null;
  let centerDistance = radius * 0.6;
  circles.forEach((circle) => {
    if (circle.radius <= radius * 1.5) return;
    const away = distance(circle.center, target);
    if (away <= centerDistance) {
      centerDistance = away;
      center = circle.center;
    }
  });
  if (center) return { point: center, kind: "center" };
  loops.forEach((loop) => {
    const loopCircle = circleOfLoop(loop);
    if (loop.points.length === 1) {
      const only = loop.points[0];
      if (distance(only, target) <= cornerDistance) {
        corner = only;
        cornerDistance = distance(only, target);
      }
      return;
    }
    segmentsOf(loop).forEach(([a, b]) => {
      const t = along(target, a, b);
      const closest = lerp(a, b, Math.min(1, Math.max(0, t)));
      const away = distance(closest, target);
      if (away > radius) return;
      if (away < nearestDistance) {
        nearestDistance = away;
        nearest = closest;
        nearestCircle = loopCircle;
      }
      [a, b].forEach((end) => {
        const endAway = distance(end, target);
        if (endAway < cornerDistance) {
          cornerDistance = endAway;
          corner = end;
        }
      });
      if (from) {
        // Only a foot that lands on the segment itself: then the line from
        // `from` meets this wall square. On a curved wall that is the one
        // segment across from it; segments beside `from` on its own wall never
        // qualify, and its own segment gives back `from`, which measures nothing.
        const footShare = along(from, a, b);
        if (footShare < 0 || footShare > 1) return;
        const foot = lerp(a, b, footShare);
        if (distance(foot, from) < 1e-6) return;
        if (away < perpendicularDistance) {
          perpendicularDistance = away;
          perpendicular = foot;
        }
      }
    });
  });
  if (corner) return { point: corner, kind: "corner" };
  if (perpendicular) return { point: perpendicular, kind: "perpendicular" };
  if (nearest) {
    // On a round outline the point goes onto the true circle, not onto a side of the polygon it is
    // drawn as, so that a point across the centre from it is exactly one diameter away.
    const circle = nearestCircle as SectionCircle | null;
    const found = nearest as SectionPoint;
    if (circle) {
      const away = distance(found, circle.center);
      if (away > 1e-9 && Math.abs(away - circle.radius) <= 0.05 * circle.radius) {
        const scale = circle.radius / away;
        return { point: { u: circle.center.u + (found.u - circle.center.u) * scale, v: circle.center.v + (found.v - circle.center.v) * scale }, kind: "outline" };
      }
    }
    return { point: found, kind: "outline" };
  }
  return { point: { ...target }, kind: "free" };
}

/**
 * The distance between two points of the cut, and its parts along the
 * editor's axes as the position fields name them: X (width), Y (depth, z in
 * the scene) and Z (height, y in the scene).
 */
export function sectionMeasurement(a: SectionPoint, b: SectionPoint, axis: SectionPlaneAxis, offset: number, loops: readonly SectionLoop[] = []) {
  const [ax, ay, az] = sectionPointToWorld(a, axis, offset);
  const [bx, by, bz] = sectionPointToWorld(b, axis, offset);
  const deltaX = bx - ax;
  const deltaDepth = bz - az;
  const deltaHeight = by - ay;
  return {
    distance: Math.hypot(deltaX, deltaDepth, deltaHeight),
    deltaX,
    deltaDepth,
    deltaHeight,
    circle: circleMeasureKind(a, b, loops),
  };
}

/**
 * Whether two points measure a circle of the cut: "diameter" when they lie across the centre of one,
 * "radius" when one is the centre and the other lies on it. The panel then says Ø or R.
 */
export function circleMeasureKind(a: SectionPoint, b: SectionPoint, loops: readonly SectionLoop[]): "diameter" | "radius" | null {
  for (const loop of loops) {
    const circle = circleOfLoop(loop);
    if (!circle) continue;
    const tolerance = circleTolerance(circle);
    const aAway = distance(a, circle.center);
    const bAway = distance(b, circle.center);
    if (Math.abs(aAway - circle.radius) <= tolerance && Math.abs(bAway - circle.radius) <= tolerance && distance(a, b) >= 2 * circle.radius - 2 * tolerance) return "diameter";
    if ((aAway <= tolerance && Math.abs(bAway - circle.radius) <= tolerance) || (bAway <= tolerance && Math.abs(aAway - circle.radius) <= tolerance)) return "radius";
  }
  return null;
}
