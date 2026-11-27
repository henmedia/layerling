import { cloneSketchProfile } from "@/lib/sketchSmoothHandles";
import type { SketchProfile, SketchSegment } from "@/types/layerling";

/** How far a freshly curved side bows out, as a part of its length. */
export const CURVE_BULGE = 0.25;

/** A side is drawn as a curve when it is not a line and both of its ends have the handle that faces it. */
export function isSegmentCurved(profile: SketchProfile, segment: SketchSegment) {
  if ((segment.kind ?? "line") === "line") return false;
  const start = profile.points.find((point) => point.id === segment.startId);
  const end = profile.points.find((point) => point.id === segment.endId);
  return Boolean(start?.handleOut && end?.handleIn);
}

/**
 * Bends a straight side into a curve, by a quarter of its length. It bows away from the sides it is joined
 * to, so a side that cuts a corner off rounds that corner instead of bending against it (Discussion #1782).
 * Where the neighbours do not say (none, or one on each side), it bows away from the middle of a closed
 * sketch, to its left on an open line. The side's own two handles are set; they can be dragged afterwards.
 * Null when there is nothing to curve.
 */
export function curveSketchSegment(profile: SketchProfile, segmentId: string, bulge = CURVE_BULGE): SketchProfile | null {
  const next = cloneSketchProfile(profile);
  const segment = next.segments.find((entry) => entry.id === segmentId);
  const start = segment && next.points.find((point) => point.id === segment.startId);
  const end = segment && next.points.find((point) => point.id === segment.endId);
  if (!segment || !start || !end || start.id === end.id) return null;
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const length = Math.hypot(dx, dz);
  if (length < 1e-6) return null;
  // The normal on the left of start -> end, turned to point away from the sketch's middle.
  let normal = { x: dz / length, z: -dx / length };
  const middle = { x: (start.x + end.x) / 2, z: (start.z + end.z) / 2 };
  const centre = next.points.reduce((sum, point) => ({ x: sum.x + point.x / next.points.length, z: sum.z + point.z / next.points.length }), { x: 0, z: 0 });
  const closed = next.points.length >= 3 && next.points.every((point) => next.segments.filter((entry) => entry.startId === point.id || entry.endId === point.id).length >= 2);
  // Where the joined sides lead to, measured across this side: both on one side of it means a corner cut off.
  const across = (point: { x: number; z: number }) => (point.x - middle.x) * normal.x + (point.z - middle.z) * normal.z;
  const neighbourPull = next.segments.reduce((sum, entry) => {
    if (entry.id === segment.id) return sum;
    const farId = entry.startId === start.id || entry.startId === end.id ? entry.endId : entry.endId === start.id || entry.endId === end.id ? entry.startId : null;
    const far = farId && farId !== start.id && farId !== end.id ? next.points.find((point) => point.id === farId) : null;
    return far ? sum + across(far) : sum;
  }, 0);
  if (Math.abs(neighbourPull) > length * 1e-3) {
    if (neighbourPull > 0) normal = { x: -normal.x, z: -normal.z };
  } else if (closed && (middle.x - centre.x) * normal.x + (middle.z - centre.z) * normal.z < 0) normal = { x: -normal.x, z: -normal.z };
  const push = length * bulge;
  segment.kind = "bezier";
  start.handleOut = { x: start.x + dx / 3 + normal.x * push, z: start.z + dz / 3 + normal.z * push };
  end.handleIn = { x: end.x - dx / 3 + normal.x * push, z: end.z - dz / 3 + normal.z * push };
  return next;
}

/** Makes a curved side straight again; a handle another curve still needs stays. */
export function straightenSketchSegment(profile: SketchProfile, segmentId: string): SketchProfile | null {
  const next = cloneSketchProfile(profile);
  const segment = next.segments.find((entry) => entry.id === segmentId);
  if (!segment || (segment.kind ?? "line") === "line") return null;
  segment.kind = "line";
  const stillCurved = (pointId: string, role: "start" | "end") => next.segments.some((entry) =>
    entry.id !== segment.id && (entry.kind ?? "line") !== "line" && (role === "start" ? entry.startId === pointId : entry.endId === pointId));
  const start = next.points.find((point) => point.id === segment.startId);
  const end = next.points.find((point) => point.id === segment.endId);
  if (start && !stillCurved(start.id, "start")) start.handleOut = undefined;
  if (end && !stillCurved(end.id, "end")) end.handleIn = undefined;
  return next;
}
