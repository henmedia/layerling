import { copySketchSelection, type SketchClipboardSelection } from "@/lib/sketchClipboard";
import { addLineIntersectionPoints } from "@/lib/sketchPointRefinement";
import type { SketchPoint, SketchProfile, SketchSegment } from "@/types/layerling";

/*
 * Mirror inside a sketch (#512): the selected points and lines are copied to the other side of an axis. The copies
 * are independent - nothing is linked - and the originals stay. A point that lies on the axis is its own mirror
 * image, so the copy shares it: a half outline whose ends sit on the axis comes out as one closed outline.
 */

type Vec = { x: number; z: number };

/** A mirror line: a point on it and its direction (a unit vector). */
export type SketchMirrorAxis = { point: Vec; direction: Vec };

/** The vertical line through the middle of the plate: the copy lands to the other side, left-right. */
export const SKETCH_MIRROR_VERTICAL: SketchMirrorAxis = { point: { x: 0, z: 0 }, direction: { x: 0, z: 1 } };
/** The horizontal line through the middle of the plate: the copy lands above or below, top-bottom. */
export const SKETCH_MIRROR_HORIZONTAL: SketchMirrorAxis = { point: { x: 0, z: 0 }, direction: { x: 1, z: 0 } };

/** How close to the axis a point counts as on it, in millimetres. */
const ON_AXIS = 0.001;

/** The axis through a straight line of the sketch, or null for a curve or a line without length. */
export function sketchMirrorAxisThroughSegment(profile: SketchProfile, segmentId: string): SketchMirrorAxis | null {
  const segment = profile.segments.find((entry) => entry.id === segmentId);
  if (!segment || (segment.kind ?? "line") !== "line") return null;
  const start = profile.points.find((point) => point.id === segment.startId);
  const end = profile.points.find((point) => point.id === segment.endId);
  if (!start || !end) return null;
  const length = Math.hypot(end.x - start.x, end.z - start.z);
  if (length < 1e-6) return null;
  return { point: { x: start.x, z: start.z }, direction: { x: (end.x - start.x) / length, z: (end.z - start.z) / length } };
}

export function reflectSketchPoint(axis: SketchMirrorAxis, position: Vec): Vec {
  const dx = position.x - axis.point.x;
  const dz = position.z - axis.point.z;
  const along = dx * axis.direction.x + dz * axis.direction.z;
  return { x: axis.point.x + 2 * along * axis.direction.x - dx, z: axis.point.z + 2 * along * axis.direction.z - dz };
}

function distanceToAxis(axis: SketchMirrorAxis, position: Vec) {
  return Math.abs((position.x - axis.point.x) * axis.direction.z - (position.z - axis.point.z) * axis.direction.x);
}

/**
 * Adds the mirror image of the selection to the profile. Returns the new profile and what was added, to select it,
 * or null when nothing that can be mirrored is selected (an image is not mirrored).
 */
export function mirrorSketchSelection(
  profile: SketchProfile,
  selection: SketchClipboardSelection,
  axis: SketchMirrorAxis,
  createId: (prefix: string) => string,
  options: { preserveReferences?: boolean } = {},
) {
  const copied = copySketchSelection(profile, selection);
  if (!copied || copied.points.length === 0) return null;

  // On the axis a point is its own image; the copy reuses it instead of laying a second point on it.
  const pointIdMap = new Map(copied.points.map((point) => [point.id, distanceToAxis(axis, point) <= ON_AXIS ? point.id : createId("sketch-point")]));
  const mirrored: SketchPoint[] = copied.points
    .filter((point) => pointIdMap.get(point.id) !== point.id)
    .map((point) => ({
      ...point,
      ...reflectSketchPoint(axis, point),
      id: pointIdMap.get(point.id)!,
      handleIn: point.handleIn ? reflectSketchPoint(axis, point.handleIn) : undefined,
      handleOut: point.handleOut ? reflectSketchPoint(axis, point.handleOut) : undefined,
    }));

  const existing = new Set(profile.segments.map((segment) => [segment.startId, segment.endId].sort().join("|")));
  const segments: SketchSegment[] = [];
  copied.segments.forEach((segment) => {
    const startId = pointIdMap.get(segment.startId);
    const endId = pointIdMap.get(segment.endId);
    if (!startId || !endId || startId === endId) return;
    // A line on the axis (or two that meet there) would be laid twice on itself.
    const key = [startId, endId].sort().join("|");
    if (existing.has(key)) return;
    existing.add(key);
    segments.push({ ...segment, id: createId("sketch-segment"), startId, endId });
  });
  if (mirrored.length === 0 && segments.length === 0) return null;

  const reflectedProfile: SketchProfile = {
    ...profile,
    points: [...profile.points, ...mirrored],
    segments: [...profile.segments, ...segments],
  };
  const next = options.preserveReferences ? reflectedProfile : addLineIntersectionPoints(reflectedProfile, createId);
  // The same bookkeeping as a paste: crossing points lie on a mirrored line, and the split keeps the new lines last.
  const existingPointIds = new Set(profile.points.map((point) => point.id));
  const firstNew = segments.length ? next.segments.findIndex((segment) => segment.id === segments[0].id) : -1;
  return {
    profile: next,
    pointIdMap,
    pointIds: next.points.filter((point) => !existingPointIds.has(point.id)).map((point) => point.id),
    segmentIds: firstNew < 0 ? [] : next.segments.slice(firstNew).map((segment) => segment.id),
  };
}
