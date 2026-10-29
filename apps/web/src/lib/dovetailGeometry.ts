import * as THREE from "three";
import { toCreasedNormals } from "@/lib/creasedNormals";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * The dovetail: a trapezoid in the plane, pushed straight up - the tail of a
 * joint that holds two flat printed parts together without screws. Width is
 * the wide end, depth the length of the tail from its neck to that end, height
 * the thickness of the plates. The neck sits at the back (-z), the wide end at
 * the front (+z).
 *
 * The same shape serves both halves: as a body it is the tail at its nominal
 * size; as a cut-out it grows by the clearance on every side, so a copy of the
 * tail set to "hole" in the other part makes a socket the tail slides into.
 */

export const DEFAULT_DOVETAIL_WIDTH = 30;
export const DEFAULT_DOVETAIL_DEPTH = 20;
export const DEFAULT_DOVETAIL_HEIGHT = 10;
/** Neck as a share of the width: 30 wide, 20 long gives flanks of about 14 degrees. */
export const DEFAULT_DOVETAIL_NECK_RATIO = 0.5;
export const DEFAULT_DOVETAIL_CLEARANCE = 0.2;
export const MAX_DOVETAIL_CLEARANCE = 2;
const MIN_DOVETAIL_NECK = 0.1;

type Point2D = { x: number; y: number };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** The neck is narrower than the wide end - otherwise the joint would not hold. */
export function normalizeDovetailNeckWidth(value: number | undefined, width: number) {
  const safeWidth = Math.max(0.01, width);
  const requested = Number.isFinite(value) ? (value as number) : safeWidth * DEFAULT_DOVETAIL_NECK_RATIO;
  return clamp(requested, Math.min(MIN_DOVETAIL_NECK, safeWidth * 0.5), safeWidth * 0.95);
}

export function normalizeDovetailClearance(value?: number) {
  return clamp(Number.isFinite(value) ? (value as number) : DEFAULT_DOVETAIL_CLEARANCE, 0, MAX_DOVETAIL_CLEARANCE);
}

/** Angle of each flank against the length of the tail, in degrees - for the inspector's hint. */
export function dovetailFlankAngle(width: number, depth: number, neckWidth: number) {
  return THREE.MathUtils.radToDeg(Math.atan2((width - neckWidth) / 2, Math.max(0.01, depth)));
}

/**
 * The four corners of the outline, counter-clockwise seen from above (x right,
 * y = z towards the front). As a cut-out every side moves out by the clearance:
 * the flanks along their normals, the ends straight out.
 */
export function dovetailContourPoints(
  width: number,
  depth: number,
  neckWidth: number,
  clearance = 0,
): Point2D[] {
  const safeWidth = Math.max(0.01, width);
  const safeDepth = Math.max(0.01, depth);
  const neck = normalizeDovetailNeckWidth(neckWidth, safeWidth);
  const halfDepth = safeDepth / 2;
  const c = Math.max(0, clearance);
  // Moving a flank out by c along its normal widens the outline at each end
  // by c / cos(angle) and shifts it along the length by c * tan(angle).
  const run = (safeWidth - neck) / 2;
  const flankLength = Math.hypot(run, safeDepth);
  const secant = flankLength / safeDepth;
  const tangent = run / safeDepth;
  const endBack = -halfDepth - c;
  const endFront = halfDepth + c;
  // Half width of the enlarged outline at any y along the tail.
  const halfWidthAt = (y: number) => neck / 2 + c * secant + tangent * (y + halfDepth);
  return [
    { x: -halfWidthAt(endBack), y: endBack },
    { x: halfWidthAt(endBack), y: endBack },
    { x: halfWidthAt(endFront), y: endFront },
    { x: -halfWidthAt(endFront), y: endFront },
  ];
}

export type DovetailGeometryOptions = {
  width: number;
  depth: number;
  height: number;
  dovetailNeckWidth?: number;
  dovetailClearance?: number;
  hole?: boolean;
};

export function dovetailOutlineForShape(shape: Pick<WorkplaneShape, "width" | "depth" | "hole" | "dovetailNeckWidth" | "dovetailClearance">) {
  const depth = shape.depth ?? shape.width;
  return dovetailContourPoints(
    shape.width,
    depth,
    normalizeDovetailNeckWidth(shape.dovetailNeckWidth, shape.width),
    shape.hole ? normalizeDovetailClearance(shape.dovetailClearance) : 0,
  );
}

/** A closed, watertight dovetail body from y = 0 to y = height. */
export function createDovetailGeometry({ width, depth, height, dovetailNeckWidth, dovetailClearance, hole }: DovetailGeometryOptions): THREE.BufferGeometry {
  const safeHeight = Math.max(0.01, height);
  const contour = dovetailOutlineForShape({ width, depth, hole, dovetailNeckWidth, dovetailClearance });
  const count = contour.length;
  const positions: number[] = [];
  const indices: number[] = [];
  contour.forEach((point) => positions.push(point.x, 0, point.y));
  contour.forEach((point) => positions.push(point.x, safeHeight, point.y));

  const outline = contour.map((point) => new THREE.Vector2(point.x, point.y));
  const clockwise = THREE.ShapeUtils.isClockWise(outline);
  THREE.ShapeUtils.triangulateShape(outline, []).forEach(([a, b, c]) => {
    if (clockwise) {
      indices.push(count + a, count + b, count + c);
      indices.push(a, c, b);
    } else {
      indices.push(count + a, count + c, count + b);
      indices.push(a, b, c);
    }
  });
  for (let i = 0; i < count; i += 1) {
    const next = (i + 1) % count;
    if (clockwise) {
      indices.push(i, next, count + next);
      indices.push(i, count + next, count + i);
    } else {
      indices.push(i, count + next, next);
      indices.push(i, count + i, count + next);
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
