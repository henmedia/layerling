import type { SketchPoint, SketchProfile } from "@/types/layerling";

export type SketchGeometrySelection = {
  pointIds: readonly string[];
  segmentIds: readonly string[];
  imageIds?: readonly string[];
};

export function selectedClosedSketchPoints(
  profile: SketchProfile,
  selection: SketchGeometrySelection,
): SketchPoint[] | null {
  if (selection.imageIds?.length) return null;

  const pointIds = new Set(selection.pointIds);
  const segmentIds = new Set(selection.segmentIds);
  if (pointIds.size < 3 || segmentIds.size !== pointIds.size) return null;

  const selectedPoints = profile.points.filter((point) => pointIds.has(point.id));
  if (selectedPoints.length !== pointIds.size) return null;

  const segmentById = new Map(profile.segments.map((segment) => [segment.id, segment]));
  const adjacency = new Map([...pointIds].map((pointId) => [pointId, new Set<string>()]));

  for (const segmentId of segmentIds) {
    const segment = segmentById.get(segmentId);
    if (
      !segment
      || segment.startId === segment.endId
      || !pointIds.has(segment.startId)
      || !pointIds.has(segment.endId)
    ) {
      return null;
    }
    adjacency.get(segment.startId)?.add(segment.endId);
    adjacency.get(segment.endId)?.add(segment.startId);
  }

  if ([...adjacency.values()].some((neighbors) => neighbors.size !== 2)) return null;

  const unvisited = new Set(pointIds);
  while (unvisited.size > 0) {
    const start = unvisited.values().next().value as string | undefined;
    if (!start) return null;
    const stack = [start];
    let componentSize = 0;
    while (stack.length > 0) {
      const pointId = stack.pop();
      if (!pointId || !unvisited.delete(pointId)) continue;
      componentSize += 1;
      adjacency.get(pointId)?.forEach((neighborId) => {
        if (unvisited.has(neighborId)) stack.push(neighborId);
      });
    }
    if (componentSize < 3) return null;
  }

  return selectedPoints;
}

/** The middle of the box round the points: what a selection turns about. */
export function sketchPointsPivot(points: readonly SketchPoint[]): { x: number; z: number } {
  if (points.length === 0) return { x: 0, z: 0 };
  const xs = points.map((point) => point.x);
  const zs = points.map((point) => point.z);
  return { x: (Math.min(...xs) + Math.max(...xs)) / 2, z: (Math.min(...zs) + Math.max(...zs)) / 2 };
}

/** The points, with their curve handles, turned by `degrees` about `pivot` (the sketch's z runs down the screen). */
export function rotateSketchPointsAbout(points: readonly SketchPoint[], pivot: { x: number; z: number }, degrees: number): SketchPoint[] {
  const radians = degrees * Math.PI / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const rotatePosition = (position: { x: number; z: number }) => {
    const deltaX = position.x - pivot.x;
    const deltaZ = position.z - pivot.z;
    return {
      x: pivot.x + deltaX * cosine - deltaZ * sine,
      z: pivot.z + deltaX * sine + deltaZ * cosine,
    };
  };
  return points.map((point) => ({
    ...point,
    ...rotatePosition(point),
    handleIn: point.handleIn ? rotatePosition(point.handleIn) : undefined,
    handleOut: point.handleOut ? rotatePosition(point.handleOut) : undefined,
  }));
}

/**
 * The turn a drag of the rotation handle stands for: how far the pointer has gone round `pivot` since it
 * took hold at `start`, in degrees from -180 to 180. A `snapStep` (15 with Shift) rounds it.
 */
export function dragRotationDegrees(
  pivot: { x: number; z: number },
  start: { x: number; z: number },
  current: { x: number; z: number },
  snapStep = 0,
): number {
  const angle = (point: { x: number; z: number }) => Math.atan2(point.z - pivot.z, point.x - pivot.x);
  let degrees = ((angle(current) - angle(start)) * 180) / Math.PI;
  while (degrees > 180) degrees -= 360;
  while (degrees <= -180) degrees += 360;
  if (snapStep > 0) degrees = Math.round(degrees / snapStep) * snapStep;
  return Object.is(degrees, -0) ? 0 : degrees;
}

/** Inside the ring that turning shows, the turn snaps to this step, as inside the 3D rotation wheel. */
export const SKETCH_TURN_RING_STEP = 22.5;
/** Outside the ring the turn goes in whole degrees. */
export const SKETCH_TURN_FREE_STEP = 1;
/** Shift snaps to this step anywhere. */
export const SKETCH_TURN_SHIFT_STEP = 15;

/** The ring that turning shows around `pivot`, a little inside the point where the handle was taken. */
export function sketchTurnRing(pivot: { x: number; z: number }, grab: { x: number; z: number }) {
  return Math.hypot(grab.x - pivot.x, grab.z - pivot.z) * 0.75;
}

/**
 * The step a turn snaps to (forum, 621358): with the pointer inside the ring 22.5°, outside it 1°, with Shift
 * 15°, so that 90° is easy to hit and any whole angle can be had.
 */
export function sketchTurnStep(pivot: { x: number; z: number }, ring: number, current: { x: number; z: number }, shift: boolean) {
  if (shift) return SKETCH_TURN_SHIFT_STEP;
  return Math.hypot(current.x - pivot.x, current.z - pivot.z) < ring ? SKETCH_TURN_RING_STEP : SKETCH_TURN_FREE_STEP;
}

export function rotateSketchPoints(points: readonly SketchPoint[], degrees = 45): SketchPoint[] {
  if (points.length === 0) return [];
  return rotateSketchPointsAbout(points, sketchPointsPivot(points), degrees);
}
