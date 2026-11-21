import type { SketchProfile } from "@/types/layerling";

export type SketchSelection =
  | { kind: "point"; id: string }
  | { kind: "segment"; id: string }
  | { kind: "image"; id: string }
  | { kind: "multiple"; pointIds: string[]; segmentIds: string[]; imageIds?: string[] }
  | null;

export type SketchSelectableEntity = { kind: "point" | "segment"; id: string };

/**
 * Shift+click in the sketch: adds a point or line to the selection, or takes it
 * out if it is already in. What is left collapses to the plain single kinds, so
 * one remaining point still gets the point tools (corner, smooth, split) and
 * nothing left means no selection at all.
 */
export function toggleSketchSelection(selected: SketchSelection, entity: SketchSelectableEntity): SketchSelection {
  const pointIds = selected?.kind === "multiple" ? [...selected.pointIds] : selected?.kind === "point" ? [selected.id] : [];
  const segmentIds = selected?.kind === "multiple" ? [...selected.segmentIds] : selected?.kind === "segment" ? [selected.id] : [];
  const imageIds = selected?.kind === "multiple" ? [...(selected.imageIds ?? [])] : selected?.kind === "image" ? [selected.id] : [];
  const ids = entity.kind === "point" ? pointIds : segmentIds;
  const index = ids.indexOf(entity.id);
  if (index >= 0) ids.splice(index, 1);
  else ids.push(entity.id);

  const count = pointIds.length + segmentIds.length + imageIds.length;
  if (count === 0) return null;
  if (count === 1) {
    if (pointIds.length) return { kind: "point", id: pointIds[0] };
    if (segmentIds.length) return { kind: "segment", id: segmentIds[0] };
    return { kind: "image", id: imageIds[0] };
  }
  return { kind: "multiple", pointIds, segmentIds, imageIds };
}

/**
 * The corners a corner treatment works on: the selected points, whatever lines are selected with
 * them. A frame round a shape, or a click inside it, selects its points and its lines together, and
 * the corners should still be rounded then (#283).
 */
export function sketchSelectedPointIds(selected: SketchSelection): string[] {
  if (selected?.kind === "point") return [selected.id];
  if (selected?.kind === "multiple" && !selected.imageIds?.length) return selected.pointIds;
  return [];
}

/** The selected lines, alone or together with points, for the tools that curve or straighten lines (#283). */
export function sketchSelectedSegmentIds(selected: SketchSelection): string[] {
  if (selected?.kind === "segment") return [selected.id];
  if (selected?.kind === "multiple" && !selected.imageIds?.length) return selected.segmentIds;
  return [];
}

export function sketchSelectionCount(selected: SketchSelection): number {
  if (!selected) return 0;
  if (selected.kind === "multiple") return selected.pointIds.length + selected.segmentIds.length + (selected.imageIds?.length ?? 0);
  return 1;
}

/**
 * The points that move when the selection moves: the selected points and the
 * end points of the selected lines. A line has no position of its own, so
 * moving it means moving its two ends.
 *
 * One kind of line is left out: a line of a larger selection that hangs on the
 * selected points by one end only. A frame drawn round a part of an outline
 * selects the points inside it and every line that touches one of them, so the
 * two lines that lead out of the frame are selected with it. They are the
 * connection to the rest of the outline and stretch as the part moves; taking
 * their far ends along would move points that were never selected. Dragging the
 * frame always left those points alone, the arrow keys and the typed position
 * did not (Issue #1800). All of them ask here now, so they move the same points.
 */
export function sketchSelectionMovePointIds(profile: Pick<SketchProfile, "segments">, selected: SketchSelection): string[] {
  if (!selected || selected.kind === "image") return [];
  const ids = new Set<string>();
  const addSegment = (segmentId: string) => {
    const segment = profile.segments.find((entry) => entry.id === segmentId);
    if (segment) {
      ids.add(segment.startId);
      ids.add(segment.endId);
    }
  };
  if (selected.kind === "point") ids.add(selected.id);
  else if (selected.kind === "segment") addSegment(selected.id);
  else {
    const selectedPoints = new Set(selected.pointIds);
    // Looked up once, not line by line: a frame round a large outline selects hundreds of lines (#1930).
    const segmentsById = new Map(profile.segments.map((segment) => [segment.id, segment]));
    selected.pointIds.forEach((id) => ids.add(id));
    selected.segmentIds.forEach((segmentId) => {
      const segment = segmentsById.get(segmentId);
      if (!segment || selectedPoints.has(segment.startId) !== selectedPoints.has(segment.endId)) return;
      ids.add(segment.startId);
      ids.add(segment.endId);
    });
  }
  return [...ids];
}

/**
 * What dragging a line moves: the whole selection when the line is part of a
 * larger one (it is then the handle for all of it), otherwise its own two ends.
 * The line in the hand always comes along whole, also where it leads out of the
 * selection and would only stretch when the selection is moved another way.
 */
export function sketchSegmentDragPointIds(profile: Pick<SketchProfile, "segments">, selected: SketchSelection, segmentId: string): string[] {
  const own = sketchSelectionMovePointIds(profile, { kind: "segment", id: segmentId });
  if (selected?.kind === "multiple" && selected.segmentIds.includes(segmentId)) {
    return [...new Set([...sketchSelectionMovePointIds(profile, selected), ...own])];
  }
  return own;
}

/** Shift while dragging: the move stays on the axis it follows more, like on the workplane. */
export function constrainToAxis(origin: { x: number; z: number }, point: { x: number; z: number }) {
  return Math.abs(point.x - origin.x) >= Math.abs(point.z - origin.z)
    ? { x: point.x, z: origin.z }
    : { x: origin.x, z: point.z };
}

/** A nudge, shortened where it would carry a point off the plate (which spans +-halfWidth by +-halfDepth). */
export function clampNudge(points: Array<{ x: number; z: number }>, dx: number, dz: number, halfWidth: number, halfDepth: number) {
  let nextX = dx;
  let nextZ = dz;
  for (const point of points) {
    nextX = Math.min(Math.max(nextX, -halfWidth - point.x), halfWidth - point.x);
    nextZ = Math.min(Math.max(nextZ, -halfDepth - point.z), halfDepth - point.z);
  }
  return { dx: nextX, dz: nextZ };
}
