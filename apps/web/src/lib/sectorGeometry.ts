import * as THREE from "three";
import { extrudeOutlineGeometry } from "@/lib/outlineExtrusion";
import type { WorkplaneShape } from "@/types/layerling";

/**
 * Sector: a disc cut back like a clock hand from a full turn (the angle), hollowed from the middle
 * outward into a ring (the inner diameter), with the two ends of a ring segment rounded (the end
 * radius) - a curved slot for a part that turns, such as a monitor mount. The shape keeps the full
 * circle as its frame, so its middle stays the middle of the circle and a turn of the shape turns
 * it about that middle; the piece starts at twelve o'clock and runs clockwise seen from above.
 */
export const DEFAULT_SECTOR_DIAMETER = 40;
export const DEFAULT_SECTOR_HEIGHT = 5;
export const DEFAULT_SECTOR_ANGLE = 360;
export const DEFAULT_SECTOR_INNER_DIAMETER = 0;
export const DEFAULT_SECTOR_END_RADIUS = 0;
export const MIN_SECTOR_ANGLE = 1;
export const MAX_SECTOR_ANGLE = 360;
const SEGMENTS_PER_TURN = 128;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeSectorAngle(value?: number) {
  return clamp(Number.isFinite(value) ? (value as number) : DEFAULT_SECTOR_ANGLE, MIN_SECTOR_ANGLE, MAX_SECTOR_ANGLE);
}

/** The bore's diameter, 0 for a solid piece; it leaves at least a tenth of a millimetre of wall. */
export function normalizeSectorInnerDiameter(value: number | undefined, diameter: number) {
  return clamp(Number.isFinite(value) ? (value as number) : DEFAULT_SECTOR_INNER_DIAMETER, 0, Math.max(0, diameter - 0.2));
}

/** The largest end radius that fits: half the wall of a ring, and the two ends of a short piece must not meet. */
export function maxSectorEndRadius(diameter: number, innerDiameter: number, angle: number) {
  const outer = Math.max(0.01, diameter / 2);
  const inner = Math.max(0, normalizeSectorInnerDiameter(innerDiameter, diameter) / 2);
  const sweep = normalizeSectorAngle(angle);
  if (sweep >= MAX_SECTOR_ANGLE) return 0;
  const half = Math.sin(THREE.MathUtils.degToRad(Math.min(sweep, 180)) / 2);
  let limit = inner > 0 ? (outer - inner) / 2 : outer / 2;
  limit = Math.min(limit, (outer * half) / (1 + half));
  if (inner > 0 && half < 1) limit = Math.min(limit, (inner * half) / (1 - half));
  return Math.max(0, limit * 0.999);
}

export function normalizeSectorEndRadius(value: number | undefined, diameter: number, innerDiameter: number, angle: number) {
  return clamp(Number.isFinite(value) ? (value as number) : DEFAULT_SECTOR_END_RADIUS, 0, maxSectorEndRadius(diameter, innerDiameter, angle));
}

export function sectorSettings(shape: Pick<WorkplaneShape, "width" | "sectorAngle" | "sectorInnerDiameter" | "sectorEndRadius">) {
  const diameter = Math.max(0.01, shape.width);
  const angle = normalizeSectorAngle(shape.sectorAngle);
  const innerDiameter = normalizeSectorInnerDiameter(shape.sectorInnerDiameter, diameter);
  return { angle, innerDiameter, endRadius: normalizeSectorEndRadius(shape.sectorEndRadius, diameter, innerDiameter, angle) };
}

type Point2D = { x: number; y: number };

/** A point at `radius` from the middle in the direction `theta` (0 = twelve o'clock, growing clockwise seen from above). */
function polar(theta: number, radius: number): Point2D {
  return { x: radius * Math.sin(theta), y: -radius * Math.cos(theta) };
}

function arcSteps(sweep: number) {
  return Math.max(2, Math.ceil((Math.abs(sweep) / (Math.PI * 2)) * SEGMENTS_PER_TURN));
}

/** Points along the circle of `radius` round the middle from theta0 to theta1, both ends included. */
function circleArc(radius: number, theta0: number, theta1: number): Point2D[] {
  const steps = arcSteps(theta1 - theta0);
  return Array.from({ length: steps + 1 }, (_, i) => polar(theta0 + ((theta1 - theta0) * i) / steps, radius));
}

/** Points round `center` from `from` to `to` (both on its circle), the shorter way, both ends included. */
function filletArc(center: Point2D, from: Point2D, to: Point2D): Point2D[] {
  const radius = Math.hypot(from.x - center.x, from.y - center.y);
  const a0 = Math.atan2(from.y - center.y, from.x - center.x);
  let delta = Math.atan2(to.y - center.y, to.x - center.x) - a0;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  const steps = Math.max(2, arcSteps(delta));
  return Array.from({ length: steps + 1 }, (_, i) => {
    const a = a0 + (delta * i) / steps;
    return { x: center.x + radius * Math.cos(a), y: center.y + radius * Math.sin(a) };
  });
}

function pushPoints(target: Point2D[], points: Point2D[]) {
  points.forEach((p) => {
    const last = target[target.length - 1];
    if (!last || Math.hypot(last.x - p.x, last.y - p.y) > 1e-6) target.push(p);
  });
}

/**
 * The outline of the piece seen from above, in mm round the middle of the circle: `outer`, and
 * `hole` for a full ring. A piece cut back has no hole; its bore is part of the outline.
 */
export function buildSectorOutline(diameter: number, innerDiameter: number, angle: number, endRadius: number): { outer: Point2D[]; hole: Point2D[] | null } {
  const outerR = Math.max(0.005, diameter / 2);
  const innerD = normalizeSectorInnerDiameter(innerDiameter, diameter);
  const innerR = innerD / 2;
  const sweepDeg = normalizeSectorAngle(angle);
  if (sweepDeg >= MAX_SECTOR_ANGLE) {
    const outer = circleArc(outerR, 0, Math.PI * 2).slice(0, -1);
    const hole = innerR > 0 ? circleArc(innerR, 0, Math.PI * 2).slice(0, -1) : null;
    return { outer, hole };
  }
  const sweep = THREE.MathUtils.degToRad(sweepDeg);
  const e = normalizeSectorEndRadius(endRadius, diameter, innerD, sweepDeg);
  const theta0 = 0;
  const theta1 = sweep;
  const points: Point2D[] = [];
  const deltaOuter = e > 0 ? Math.asin(Math.min(1, e / (outerR - e))) : 0;
  const deltaInner = e > 0 && innerR > 0 ? Math.asin(Math.min(1, e / (innerR + e))) : 0;

  // Outer arc, then the far end (theta1) from the outside in.
  pushPoints(points, circleArc(outerR, theta0 + deltaOuter, theta1 - deltaOuter));
  const endCorner = (theta: number, side: 1 | -1, outward: boolean) => {
    // side: -1 for the far end (centres lie back towards smaller angles), +1 for the start end.
    if (outward) {
      if (e <= 0) return [polar(theta, outerR)];
      const centre = polar(theta + side * deltaOuter, outerR - e);
      const onCircle = polar(theta + side * deltaOuter, outerR);
      const onLine = polar(theta, (outerR - e) * Math.cos(deltaOuter));
      return side < 0 ? filletArc(centre, onCircle, onLine) : filletArc(centre, onLine, onCircle);
    }
    if (innerR <= 0) return [{ x: 0, y: 0 }];
    if (e <= 0) return [polar(theta, innerR)];
    const centre = polar(theta + side * deltaInner, innerR + e);
    const onCircle = polar(theta + side * deltaInner, innerR);
    const onLine = polar(theta, (innerR + e) * Math.cos(deltaInner));
    return side < 0 ? filletArc(centre, onLine, onCircle) : filletArc(centre, onCircle, onLine);
  };
  pushPoints(points, endCorner(theta1, -1, true));
  pushPoints(points, endCorner(theta1, -1, false));
  if (innerR > 0) pushPoints(points, circleArc(innerR, theta1 - deltaInner, theta0 + deltaInner));
  pushPoints(points, endCorner(theta0, 1, false));
  pushPoints(points, endCorner(theta0, 1, true));
  const first = points[0];
  const last = points[points.length - 1];
  if (points.length > 1 && Math.hypot(first.x - last.x, first.y - last.y) < 1e-6) points.pop();
  return { outer: points, hole: null };
}

export type SectorGeometryOptions = {
  width: number;
  depth: number;
  height: number;
  sectorAngle?: number;
  sectorInnerDiameter?: number;
  sectorEndRadius?: number;
};

/** A closed, watertight body: the outline (with its hole, for a full ring) raised by the height. */
export function createSectorGeometry({ width, depth, height, sectorAngle, sectorInnerDiameter, sectorEndRadius }: SectorGeometryOptions): THREE.BufferGeometry {
  const diameter = Math.max(0.01, width);
  const scaleY = Math.max(0.01, depth) / diameter;
  const safeHeight = Math.max(0.01, height);
  const { outer, hole } = buildSectorOutline(diameter, sectorInnerDiameter ?? 0, sectorAngle ?? DEFAULT_SECTOR_ANGLE, sectorEndRadius ?? 0);
  const loops = [outer, ...(hole ? [hole] : [])].map((loop) => loop.map((p) => ({ x: p.x, y: p.y * scaleY })));
  return extrudeOutlineGeometry(loops, safeHeight);
}
