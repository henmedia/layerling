import { orderedSketchPaths } from "@/lib/sketchSmoothHandles";
import type { SketchConstraintInput, SketchPoint, SketchProfile, SketchSegment } from "@/types/layerling";

/** Which of a corner's two lines turns when its angle is typed: the one that follows, or the one before. */
export type CornerTurn = "after" | "before";

export type SketchCorner = {
  point: SketchPoint;
  /** The line that comes first around the outline, and the point at its far end. */
  before: { segment: SketchSegment; far: SketchPoint };
  /** The line that follows, and the point at its far end. */
  after: { segment: SketchSegment; far: SketchPoint };
  /** The angle between the two lines inside the outline, in degrees; on an open line the smaller of the two. */
  degrees: number;
  /** True when the corner lies on a closed outline, so the angle may be a dent above 180 degrees. */
  closed: boolean;
  /**
   * The direction from the corner along the `before` line, and the signed sweep (radians) from there
   * through the inside to the `after` line - what the arc is drawn from.
   */
  startAngle: number;
  sweep: number;
};

const toDegrees = (radians: number) => (radians * 180) / Math.PI;

/** A line is straight when it has no handles to bend it. */
function isStraight(segment: SketchSegment, from: SketchPoint, to: SketchPoint) {
  return (segment.kind ?? "line") === "line" || !(from.handleOut && to.handleIn);
}

/**
 * The corner where exactly two straight lines meet at `pointId`, with the angle between them.
 * Nothing for a point with other lines, curves, or two lines that end in the same far point.
 */
export function sketchCornerAt(profile: SketchProfile, pointId: string): SketchCorner | null {
  const point = profile.points.find((entry) => entry.id === pointId);
  if (!point) return null;
  const pointById = new Map(profile.points.map((entry) => [entry.id, entry]));
  // A construction line meeting a corner does not make it a different corner (#229).
  const touching = profile.segments.filter((segment) => !segment.construction && (segment.startId === pointId || segment.endId === pointId));
  if (touching.length !== 2) return null;
  const legs = touching.map((segment) => {
    const farId = segment.startId === pointId ? segment.endId : segment.startId;
    const far = pointById.get(farId);
    return far ? { segment, far } : null;
  });
  if (!legs[0] || !legs[1] || legs[0].far.id === legs[1].far.id || legs[0].far.id === pointId || legs[1].far.id === pointId) return null;
  if (!touching.every((segment) => {
    const start = pointById.get(segment.startId);
    const end = pointById.get(segment.endId);
    return start && end && isStraight(segment, start, end);
  })) return null;

  let first = legs[0];
  let second = legs[1];
  let closed = false;
  let convex = true;
  const path = orderedSketchPaths(profile).find((entry) => entry.points.some((candidate) => candidate.id === pointId));
  if (path?.closed) {
    const index = path.points.findIndex((candidate) => candidate.id === pointId);
    const previous = path.points[(index - 1 + path.points.length) % path.points.length];
    const following = path.points[(index + 1) % path.points.length];
    const previousLeg = legs.find((leg) => leg?.far.id === previous.id);
    const followingLeg = legs.find((leg) => leg?.far.id === following.id);
    if (previousLeg && followingLeg && previousLeg !== followingLeg) {
      first = previousLeg;
      second = followingLeg;
      closed = true;
      // Winding of the whole outline (on its corner points), and which way this corner turns.
      const area = path.points.reduce((sum, candidate, i) => {
        const next = path.points[(i + 1) % path.points.length];
        return sum + candidate.x * next.z - next.x * candidate.z;
      }, 0);
      const turn = (point.x - previous.x) * (following.z - point.z) - (point.z - previous.z) * (following.x - point.x);
      convex = turn * area >= 0;
    }
  }
  const fromFirst = { x: first.far.x - point.x, z: first.far.z - point.z };
  const fromSecond = { x: second.far.x - point.x, z: second.far.z - point.z };
  if (Math.hypot(fromFirst.x, fromFirst.z) < 1e-9 || Math.hypot(fromSecond.x, fromSecond.z) < 1e-9) return null;
  const signed = Math.atan2(fromFirst.x * fromSecond.z - fromFirst.z * fromSecond.x, fromFirst.x * fromSecond.x + fromFirst.z * fromSecond.z);
  const smaller = Math.abs(signed);
  const interior = convex ? smaller : 2 * Math.PI - smaller;
  // The inside lies on the side the second line is on when the corner is convex, on the other side when it is a dent.
  const side = Math.sign(signed) || 1;
  const sweep = (convex ? side : -side) * interior;
  return {
    point,
    before: first,
    after: second,
    degrees: toDegrees(interior),
    closed,
    startAngle: Math.atan2(fromFirst.z, fromFirst.x),
    sweep,
  };
}

/** The inline editor and persistent angle use the same fixed and turning legs. */
export function cornerAngleConstraint(corner: SketchCorner, degrees: number, turn: CornerTurn = "after"): SketchConstraintInput | null {
  if (!Number.isFinite(degrees) || degrees < 0.1 || degrees >= 180) return null;
  const fixed = turn === "after" ? corner.before.far : corner.after.far;
  const turning = turn === "after" ? corner.after.far : corner.before.far;
  return { kind: "angle", a: corner.point.id, b: fixed.id, c: corner.point.id, d: turning.id, value: degrees };
}

/**
 * Turns one of the corner's lines about the corner until the angle between them is `degrees`,
 * keeping its length and the inside of the outline on the same side. The other line stays. What
 * hangs at the turned line's far end goes with the point. Open corners take up to 180 degrees.
 */
export function applyCornerAngle(
  points: SketchPoint[],
  corner: SketchCorner,
  degrees: number,
  turn: CornerTurn = "after",
): SketchPoint[] {
  const limit = corner.closed ? 359.9 : 180;
  if (!Number.isFinite(degrees) || degrees < 0.1 || degrees > limit) return points;
  const fixed = turn === "after" ? corner.before.far : corner.after.far;
  const turning = turn === "after" ? corner.after.far : corner.before.far;
  const origin = corner.point;
  const toFixed = Math.atan2(fixed.z - origin.z, fixed.x - origin.x);
  // The inside lies from `before` towards `after` by `sweep`; from the other line it is the mirror image.
  const direction = Math.sign(corner.sweep) * (turn === "after" ? 1 : -1);
  const target = toFixed + direction * (degrees * Math.PI) / 180;
  const length = Math.hypot(turning.x - origin.x, turning.z - origin.z);
  const dx = origin.x + Math.cos(target) * length - turning.x;
  const dz = origin.z + Math.sin(target) * length - turning.z;
  return points.map((point) => point.id !== turning.id ? point : {
    ...point,
    x: point.x + dx,
    z: point.z + dz,
    handleIn: point.handleIn ? { x: point.handleIn.x + dx, z: point.handleIn.z + dz } : point.handleIn,
    handleOut: point.handleOut ? { x: point.handleOut.x + dx, z: point.handleOut.z + dz } : point.handleOut,
  });
}
