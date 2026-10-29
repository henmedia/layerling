import * as THREE from "three";
import { toCreasedNormals } from "@/lib/creasedNormals";

/*
 * The teardrop: the cross-section of a horizontal hole that prints without
 * support. A round hole lying on its side needs a bridge over its top, and the
 * printer drops the filament there. A point on top - flanks no flatter than
 * about 45 degrees - lets every layer rest on the one below.
 *
 * Width is the diameter of the round part, depth the length of the hole along
 * its axis (the shape's own z axis), height the full height up to the tip. The
 * tip angle follows from width and height; 90 degrees (flanks at 45 degrees)
 * is the usual choice and the default.
 */

export const DEFAULT_TEARDROP_WIDTH = 6;
export const DEFAULT_TEARDROP_DEPTH = 20;
export const DEFAULT_TEARDROP_TIP_ANGLE = 90;
export const MIN_TEARDROP_TIP_ANGLE = 40;
export const MAX_TEARDROP_TIP_ANGLE = 140;
/** Segments for a full circle; the arc of the teardrop gets its share. */
const TEARDROP_CIRCLE_SEGMENTS = 48;
/** The tip must stand at least this far above the circle's top, or the outline is just a circle. */
const MIN_TIP_RISE = 1.02;

type Point2D = { x: number; y: number };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeTeardropTipAngle(angle: number) {
  return clamp(Number.isFinite(angle) ? angle : DEFAULT_TEARDROP_TIP_ANGLE, MIN_TEARDROP_TIP_ANGLE, MAX_TEARDROP_TIP_ANGLE);
}

/** Full height of a teardrop of this diameter whose tip has the given angle. */
export function teardropHeightForTipAngle(width: number, tipAngle: number) {
  const radius = Math.max(0.005, width / 2);
  const half = THREE.MathUtils.degToRad(normalizeTeardropTipAngle(tipAngle) / 2);
  return radius + radius / Math.sin(half);
}

/** Tip angle in degrees for this diameter and height; 180 when the tip is flush with the circle. */
export function teardropTipAngle(width: number, height: number) {
  const radius = Math.max(0.005, width / 2);
  const rise = height - radius;
  if (rise <= radius * MIN_TIP_RISE) return 180;
  return THREE.MathUtils.radToDeg(2 * Math.asin(radius / rise));
}

/**
 * The outline, counter-clockwise seen from the front (x right, y up), from y = 0
 * at the bottom of the circle to y = height at the tip. When the height is too
 * small for a tip, the outline is squashed to fit it.
 */
export function teardropContourPoints(width: number, height: number, circleSegments = TEARDROP_CIRCLE_SEGMENTS): Point2D[] {
  const radius = Math.max(0.005, width / 2);
  const safeHeight = Math.max(0.01, height);
  const rise = Math.max(safeHeight - radius, radius * MIN_TIP_RISE);
  const naturalHeight = radius + rise;
  // Where the flanks touch the circle, measured from straight up at the circle's centre.
  const tangent = Math.acos(radius / rise);
  const arcStart = Math.PI / 2 - tangent; // right tangent point, seen as an angle from +x
  const arcEnd = Math.PI / 2 + tangent; // left tangent point, going the long way round below
  const arcSpan = 2 * Math.PI - (arcEnd - arcStart);
  const steps = Math.max(8, Math.ceil((Math.max(3, circleSegments) * arcSpan) / (2 * Math.PI)));
  const squash = safeHeight / naturalHeight;
  const points: Point2D[] = [];
  // Right tangent point, down round the bottom, up to the left tangent point.
  for (let i = 0; i <= steps; i += 1) {
    const angle = arcEnd + (arcSpan * i) / steps;
    points.push({ x: radius * Math.cos(angle), y: (radius + radius * Math.sin(angle)) * squash });
  }
  // The tip. The list runs left tangent -> bottom -> right tangent counter-clockwise.
  points.push({ x: 0, y: (radius + rise) * squash });
  return points;
}

export type TeardropGeometryOptions = {
  width: number;
  depth: number;
  height: number;
  /** Segments of a full circle for the round part; the arc gets its share. */
  sides?: number;
};

/** A closed, watertight teardrop body: the outline pushed along z, centred on the origin, from y = 0 to y = height. */
export function createTeardropGeometry({ width, depth, height, sides }: TeardropGeometryOptions): THREE.BufferGeometry {
  const safeDepth = Math.max(0.01, depth);
  const contour = teardropContourPoints(width, height, sides);
  const count = contour.length;
  const front = safeDepth / 2;
  const back = -safeDepth / 2;
  const positions: number[] = [];
  const indices: number[] = [];
  contour.forEach((point) => positions.push(point.x, point.y, back));
  contour.forEach((point) => positions.push(point.x, point.y, front));

  const outline = contour.map((point) => new THREE.Vector2(point.x, point.y));
  const clockwise = THREE.ShapeUtils.isClockWise(outline);
  THREE.ShapeUtils.triangulateShape(outline, []).forEach(([a, b, c]) => {
    // Back cap faces -z, front cap +z; the winding follows the outline's direction.
    if (clockwise) {
      indices.push(count + a, count + c, count + b);
      indices.push(a, b, c);
    } else {
      indices.push(count + a, count + b, count + c);
      indices.push(a, c, b);
    }
  });
  for (let i = 0; i < count; i += 1) {
    const next = (i + 1) % count;
    if (clockwise) {
      indices.push(i, count + next, next);
      indices.push(i, count + i, count + next);
    } else {
      indices.push(i, next, count + next);
      indices.push(i, count + next, count + i);
    }
  }

  const indexed = new THREE.BufferGeometry();
  indexed.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  indexed.setIndex(indices);
  const geometry = toCreasedNormals(indexed, THREE.MathUtils.degToRad(30));
  indexed.dispose();
  geometry.computeBoundingBox();
  return geometry;
}

/**
 * The exact outline of a teardrop in its front view (x, y), or null when the
 * height leaves no room for a tip - there the display mesh squashes the outline
 * and the mesh stays the body. The arc is the round part from the left
 * tangent point round the bottom to the right one; the tip closes the loop.
 */
export function teardropExactSection(width: number, height: number) {
  const radius = Math.max(0.005, width / 2);
  const rise = height - radius;
  if (!(rise > radius * MIN_TIP_RISE)) return null;
  const tangent = Math.acos(radius / rise);
  const start = Math.PI / 2 + tangent;
  const end = Math.PI / 2 - tangent + Math.PI * 2;
  const at = (angle: number) => ({ x: radius * Math.cos(angle), z: radius + radius * Math.sin(angle) });
  return {
    arc: { start: at(start), end: at(end), arc: { cx: 0, cz: radius, rx: radius, rz: radius, start, end } },
    tip: { x: 0, z: radius + rise },
  };
}
