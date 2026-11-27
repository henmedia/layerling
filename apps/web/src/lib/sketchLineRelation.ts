import type { SketchPoint, SketchProfile, SketchSegment } from "@/types/layerling";

/*
 * Parallel and square in a sketch (Discussion #1881): one straight line turns until it runs parallel or at a right
 * angle to another straight line, picked as the reference. It is a one-time command: nothing is linked afterwards,
 * so moving either line later does not move the other. The line keeps its length and turns about one of its ends;
 * the reference line never moves.
 */

export type SketchLineRelation = "parallel" | "perpendicular";

export type SketchLineRelationResult =
  | { ok: true; points: SketchPoint[] }
  | { ok: false; reason: "notStraight" | "sameLine" | "onReference" | "locked" | "already" };

type Vec = { x: number; z: number };

/** A line is straight when it is a line, or a curve whose handles do not bend it (as sketchAngles counts it). */
function straightEnds(profile: SketchProfile, segmentId: string): { segment: SketchSegment; start: SketchPoint; end: SketchPoint } | null {
  const segment = profile.segments.find((entry) => entry.id === segmentId);
  if (!segment) return null;
  const start = profile.points.find((point) => point.id === segment.startId);
  const end = profile.points.find((point) => point.id === segment.endId);
  if (!start || !end) return null;
  const straight = (segment.kind ?? "line") === "line" || !(start.handleOut && end.handleIn);
  if (!straight) return null;
  if (Math.hypot(end.x - start.x, end.z - start.z) < 1e-6) return null;
  return { segment, start, end };
}

/** How many lines meet at the point: 1 for an open end. */
function lineCount(profile: SketchProfile, pointId: string) {
  return profile.segments.filter((segment) => segment.startId === pointId || segment.endId === pointId).length;
}

/** Whether a straight line of the sketch can serve as the line that turns, or as the reference. */
export function isStraightSketchLine(profile: SketchProfile, segmentId: string) {
  return straightEnds(profile, segmentId) !== null;
}

/**
 * Turns the line `segmentId` until it is parallel or square to the line `referenceId`. The end that stays is the
 * one it shares with the reference; otherwise a locked end, otherwise the end where more lines meet (so an open end
 * swings, not a corner), otherwise its start. Of the two ways it could point, it takes the one with the smaller turn.
 * What hangs at the moved end goes with it, as when the point is dragged.
 */
export function relateSketchLine(
  profile: SketchProfile,
  segmentId: string,
  referenceId: string,
  relation: SketchLineRelation,
): SketchLineRelationResult {
  if (segmentId === referenceId) return { ok: false, reason: "sameLine" };
  const line = straightEnds(profile, segmentId);
  const reference = straightEnds(profile, referenceId);
  if (!line || !reference) return { ok: false, reason: "notStraight" };

  const onReference = (point: SketchPoint) => point.id === reference.start.id || point.id === reference.end.id;
  if (onReference(line.start) && onReference(line.end)) return { ok: false, reason: "onReference" };

  let pivot: SketchPoint;
  let moving: SketchPoint;
  if (onReference(line.start)) [pivot, moving] = [line.start, line.end];
  else if (onReference(line.end)) [pivot, moving] = [line.end, line.start];
  else if (line.end.locked && !line.start.locked) [pivot, moving] = [line.end, line.start];
  else if (line.start.locked && !line.end.locked) [pivot, moving] = [line.start, line.end];
  else if (lineCount(profile, line.start.id) < lineCount(profile, line.end.id)) [pivot, moving] = [line.end, line.start];
  else [pivot, moving] = [line.start, line.end];
  if (moving.locked) return { ok: false, reason: "locked" };

  const along: Vec = { x: reference.end.x - reference.start.x, z: reference.end.z - reference.start.z };
  const base = Math.atan2(along.z, along.x) + (relation === "perpendicular" ? Math.PI / 2 : 0);
  const current = Math.atan2(moving.z - pivot.z, moving.x - pivot.x);
  // The goal and the goal turned round: whichever is nearer to where the line points now.
  const turn = (goal: number) => {
    let difference = goal - current;
    while (difference > Math.PI) difference -= 2 * Math.PI;
    while (difference < -Math.PI) difference += 2 * Math.PI;
    return difference;
  };
  const first = turn(base);
  const second = turn(base + Math.PI);
  const rotation = Math.abs(first) <= Math.abs(second) ? first : second;
  if (Math.abs(rotation) < 1e-9) return { ok: false, reason: "already" };

  const length = Math.hypot(moving.x - pivot.x, moving.z - pivot.z);
  const angle = current + rotation;
  const dx = pivot.x + Math.cos(angle) * length - moving.x;
  const dz = pivot.z + Math.sin(angle) * length - moving.z;
  const points = profile.points.map((point) => point.id !== moving.id ? point : {
    ...point,
    x: point.x + dx,
    z: point.z + dz,
    handleIn: point.handleIn ? { x: point.handleIn.x + dx, z: point.handleIn.z + dz } : point.handleIn,
    handleOut: point.handleOut ? { x: point.handleOut.x + dx, z: point.handleOut.z + dz } : point.handleOut,
  });
  return { ok: true, points };
}
