import type { SketchPoint, SketchProfile, SketchSegment } from "@/types/layerling";

/*
 * Locked outlines in a sketch (#653), as locked bodies in the 3D editor: the lock sits on the
 * points of the outline. A locked point keeps its place, its handles and its kind; a side whose
 * two ends are locked keeps its ends, its curve and whether it is a construction line, and it is
 * not cut up or deleted. Everything else in the sketch stays free - a new line may start at a
 * locked corner. The editor checks every change against this, so no tool needs a rule of its own.
 */

function samePlace(a?: { x: number; z: number }, b?: { x: number; z: number }) {
  if (!a || !b) return !a && !b;
  return Math.abs(a.x - b.x) < 1e-9 && Math.abs(a.z - b.z) < 1e-9;
}

function samePoint(a: SketchPoint, b: SketchPoint) {
  return samePlace(a, b) && samePlace(a.handleIn, b.handleIn) && samePlace(a.handleOut, b.handleOut) && (a.mode ?? "corner") === (b.mode ?? "corner");
}

function sameSegment(a: SketchSegment, b: SketchSegment) {
  return a.startId === b.startId && a.endId === b.endId && (a.kind ?? "line") === (b.kind ?? "line") && Boolean(a.construction) === Boolean(b.construction);
}

/** Whether a change from `before` to `after` moves, reshapes or removes anything locked. */
export function changesLockedOutline(before: SketchProfile, after: SketchProfile) {
  const locked = before.points.filter((point) => point.locked);
  if (!locked.length) return false;
  const afterPoints = new Map(after.points.map((point) => [point.id, point]));
  if (locked.some((point) => {
    const next = afterPoints.get(point.id);
    return !next || !samePoint(point, next);
  })) return true;
  const lockedIds = new Set(locked.map((point) => point.id));
  const afterSegments = new Map(after.segments.map((segment) => [segment.id, segment]));
  return before.segments.some((segment) => {
    if (!lockedIds.has(segment.startId) || !lockedIds.has(segment.endId)) return false;
    const next = afterSegments.get(segment.id);
    return !next || !sameSegment(segment, next);
  });
}

/** The points of these ids locked or unlocked; `locked` is left off a free point. */
export function setSketchPointsLocked(profile: SketchProfile, pointIds: readonly string[], locked: boolean): SketchProfile {
  const ids = new Set(pointIds);
  return {
    ...profile,
    points: profile.points.map((point) => {
      if (!ids.has(point.id)) return point;
      const { locked: _was, ...free } = point;
      return locked ? { ...free, locked: true } : free;
    }),
  };
}

/** How locked these points are: none, some or all of them. */
export function sketchLockState(profile: SketchProfile, pointIds: readonly string[]): "none" | "some" | "all" {
  const ids = new Set(pointIds);
  const points = profile.points.filter((point) => ids.has(point.id));
  const count = points.filter((point) => point.locked).length;
  return count === 0 ? "none" : count === points.length ? "all" : "some";
}

/**
 * The point a typed length keeps in place (#629): the one asked for, unless that would move a
 * locked end while the other end is free - then the locked end stays and the free one moves.
 * With both ends locked the request stands, and the editor refuses it as any other change.
 */
export function lockedLengthAnchor(segment: SketchSegment, points: readonly SketchPoint[], requested: string): string {
  const start = points.find((point) => point.id === segment.startId);
  const end = points.find((point) => point.id === segment.endId);
  if (!start || !end || Boolean(start.locked) === Boolean(end.locked)) return requested;
  return start.locked ? start.id : end.id;
}

/**
 * Which of a corner's two lines a typed angle turns (#629): the one asked for, unless its far
 * end is locked and the other line's is free - then the other line turns.
 */
export function lockedCornerTurn(corner: { before: { far: SketchPoint }; after: { far: SketchPoint } }, requested: "after" | "before"): "after" | "before" {
  const turning = requested === "after" ? corner.after.far : corner.before.far;
  const other = requested === "after" ? corner.before.far : corner.after.far;
  return turning.locked && !other.locked ? (requested === "after" ? "before" : "after") : requested;
}
