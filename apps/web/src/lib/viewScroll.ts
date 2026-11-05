import * as THREE from "three";
import { visibleViewHeight, type ViewCamera } from "@/lib/viewArrowKeys";

/**
 * Scrollbars for the 3D view (Discussion #1241), switched in the view bar. They slide the view as Ctrl and the
 * arrow keys do - camera and pivot together, nothing turns - but smoothly and also while a part is selected.
 *
 * A scrollbar needs something to scroll through. Here that is the room the view's pivot may move in: the plate, and
 * as far out as the bodies reach (`pivotLimits`, kept by the viewport). Along each screen axis that box spans a
 * range; the view, centred on the pivot, is a window of the visible width (or height) on it. The track stands for
 * the range widened by half the window at each end, so every edge of the plate can be brought to the middle; the
 * thumb is the window, its length the window's share of the track.
 */

export type PivotLimits = { halfWidth: number; halfDepth: number; minY: number; maxY: number };

/** One scrollbar's reading: where the thumb starts and how long it is, both as parts of the track (0 to 1). */
export type ScrollAxisMetrics = { start: number; size: number; min: number; length: number };

/** The shortest thumb, as a part of the track, so it stays easy to catch. */
const MIN_THUMB = 0.06;

/** The eight corners of the box the pivot may move in. */
export function pivotBoxCorners(limits: PivotLimits): THREE.Vector3[] {
  const corners: THREE.Vector3[] = [];
  for (const x of [-limits.halfWidth, limits.halfWidth]) for (const y of [limits.minY, limits.maxY]) for (const z of [-limits.halfDepth, limits.halfDepth]) corners.push(new THREE.Vector3(x, y, z));
  return corners;
}

/**
 * The thumb on one axis: `axis` is the screen's right or up direction in the world, `pivot` the view's centre,
 * `window` how much of the world the view shows along that axis. `min` and `length` are the track in world units,
 * which a drag holds on to while the thumb moves.
 */
export function scrollAxisMetrics(corners: readonly THREE.Vector3[], axis: THREE.Vector3, pivot: THREE.Vector3, window: number): ScrollAxisMetrics {
  let low = Infinity;
  let high = -Infinity;
  for (const corner of corners) {
    const along = corner.dot(axis);
    low = Math.min(low, along);
    high = Math.max(high, along);
  }
  const centre = pivot.dot(axis);
  // The view may stand a little past the box (the pivot is clamped only in the next frame): the track takes it in.
  const min = Math.min(low, centre) - window / 2;
  const max = Math.max(high, centre) + window / 2;
  const length = Math.max(max - min, 1e-9);
  const size = Math.min(1, Math.max(MIN_THUMB, window / length));
  // With a thumb held longer than the window's share, its start is spread over the room that is left.
  const travel = (centre - (min + window / 2)) / Math.max(length - window, 1e-9);
  const start = Math.min(1 - size, Math.max(0, travel * (1 - size)));
  return { start, size, min, length };
}

/** How far the view moves in the world for a thumb dragged by `fraction` of its track, on a track held as it was. */
export function scrollDistance(metrics: Pick<ScrollAxisMetrics, "length" | "size">, windowSize: number, fraction: number) {
  // The thumb's travel (1 - size) covers the pivot's travel (length - window).
  const travel = Math.max(1 - metrics.size, 1e-9);
  return (fraction / travel) * Math.max(metrics.length - windowSize, 0);
}

/** The screen's right and up directions in the world, and how much of the world the view shows across and up. */
export function viewScrollFrame(view: ViewCamera, aspect: number) {
  const { camera } = view;
  camera.updateMatrixWorld();
  const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).normalize();
  const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1).normalize();
  const height = visibleViewHeight(view);
  return { right, up, width: height * aspect, height };
}

/** Slides camera and pivot together by `distance` along `direction` (a unit vector in the world): the view moves, nothing turns. */
export function scrollViewAlong(view: ViewCamera, direction: THREE.Vector3, distance: number) {
  if (!Number.isFinite(distance) || distance === 0) return;
  const step = direction.clone().multiplyScalar(distance);
  view.camera.position.add(step);
  view.controls.target.add(step);
  view.controls.update();
}
