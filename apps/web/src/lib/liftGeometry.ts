import * as THREE from "three";
import type { PlacementWorkplane } from "@/lib/placementWorkplane";
import type { WorkplaneShape } from "@/types/layerling";

export type SelectionFrame = {
  ids: string[];
  center: THREE.Vector3;
  quaternion: THREE.Quaternion;
  xAxis: THREE.Vector3;
  yAxis: THREE.Vector3;
  zAxis: THREE.Vector3;
  width: number;
  height: number;
  depth: number;
  min: THREE.Vector3;
  max: THREE.Vector3;
  singleShape: WorkplaneShape | null;
};

export type LiftGeometry = {
  axis: THREE.Vector3;
  low: number;
  high: number;
  height: number;
  elevation: number;
  pointAt: (h: number) => THREE.Vector3;
};

export function liftGeometryForFrame(frame: SelectionFrame, workplane: PlacementWorkplane): LiftGeometry {
  const axis = new THREE.Vector3(workplane.normal.x, workplane.normal.y, workplane.normal.z).normalize();
  const origin = new THREE.Vector3(workplane.origin.x, workplane.origin.y, workplane.origin.z);
  const centerHeight = frame.center.clone().sub(origin).dot(axis);
  const reach = [
    frame.xAxis.clone().normalize().multiplyScalar(frame.width / 2),
    frame.yAxis.clone().normalize().multiplyScalar(frame.height / 2),
    frame.zAxis.clone().normalize().multiplyScalar(frame.depth / 2),
  ].reduce((total, halfSide) => total + Math.abs(halfSide.dot(axis)), 0);
  const low = centerHeight - reach;
  const high = centerHeight + reach;
  return {
    axis,
    low,
    high,
    height: Math.max(0.01, high - low),
    elevation: Math.min(Math.max(0, low), high),
    pointAt: (h: number) => frame.center.clone().addScaledVector(axis, h - centerHeight),
  };
}

/** How far a selection has to clear the workplane before its footprint is drawn. */
const GROUND_FOOTPRINT_MIN_GAP = 0.08;
/** Lifts the footprint just off the plane so it does not fight with the grid. */
const GROUND_FOOTPRINT_OFFSET = 0.04;

/**
 * The outline a selection that floats above (or sits below) the workplane
 * throws onto it, or null while it touches the plane.
 *
 * Measured along the workplane normal, like the lift: a single rotated shape
 * keeps its own axes as the selection frame, and after a 90 degree turn its y
 * axis lies flat - measuring along that read the sideways distance to the
 * plane origin as a height and stood the footprint upright next to the shape.
 * The frame's corners are projected onto the plane and wrapped in their convex
 * hull, which is the frame's own footprint rectangle whenever the frame is
 * upright on the plane.
 */
export function groundFootprintForFrame(frame: SelectionFrame, workplane: PlacementWorkplane): THREE.Vector3[] | null {
  const lift = liftGeometryForFrame(frame, workplane);
  if (lift.low <= GROUND_FOOTPRINT_MIN_GAP && lift.high >= -GROUND_FOOTPRINT_MIN_GAP) {
    return null;
  }

  const origin = new THREE.Vector3(workplane.origin.x, workplane.origin.y, workplane.origin.z);
  const planeX = new THREE.Vector3(workplane.xAxis.x, workplane.xAxis.y, workplane.xAxis.z).normalize();
  const planeZ = new THREE.Vector3(workplane.zAxis.x, workplane.zAxis.y, workplane.zAxis.z).normalize();
  const projected: { u: number; v: number }[] = [];
  [-1, 1].forEach((xSign) => {
    [-1, 1].forEach((ySign) => {
      [-1, 1].forEach((zSign) => {
        const corner = frame.center.clone()
          .addScaledVector(frame.xAxis, (xSign * frame.width) / 2)
          .addScaledVector(frame.yAxis, (ySign * frame.height) / 2)
          .addScaledVector(frame.zAxis, (zSign * frame.depth) / 2)
          .sub(origin);
        projected.push({ u: corner.dot(planeX), v: corner.dot(planeZ) });
      });
    });
  });

  // Andrew's monotone chain; collinear and duplicate points are dropped.
  const sorted = projected.sort((a, b) => a.u - b.u || a.v - b.v);
  const cross = (o: { u: number; v: number }, a: { u: number; v: number }, b: { u: number; v: number }) =>
    (a.u - o.u) * (b.v - o.v) - (a.v - o.v) * (b.u - o.u);
  const epsilon = 1e-9;
  const lower: { u: number; v: number }[] = [];
  for (const point of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= epsilon) lower.pop();
    lower.push(point);
  }
  const upper: { u: number; v: number }[] = [];
  for (const point of [...sorted].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= epsilon) upper.pop();
    upper.push(point);
  }
  const hull = [...lower.slice(0, -1), ...upper.slice(0, -1)];
  if (hull.length < 3) {
    return null;
  }

  return hull.map(({ u, v }) => origin.clone()
    .addScaledVector(planeX, u)
    .addScaledVector(planeZ, v)
    .addScaledVector(lift.axis, GROUND_FOOTPRINT_OFFSET));
}
