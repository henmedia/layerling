import { circularArcCenter } from "@/lib/sketchCircularArc";
import { constructionCrossings } from "@/lib/sketchConstruction";
import { cubicPoint } from "@/lib/sketchPaths";
import type { SketchPoint, SketchProfile } from "@/types/layerling";

type Plane = { x: number; z: number };

const round = (value: number) => Number(value.toFixed(4)) || 0;

/**
 * Where a new or dragged point snaps to on the sketch itself (#624): the middle of every straight
 * line, construction lines too, and the centre of every circle or rounded corner. A circle is four arcs
 * round one centre, which is listed once. With `exceptPointId`, whatever has that point as an end is left
 * out: a point that is being dragged would otherwise snap to the middle of its own line and run away.
 */
export function sketchSnapPoints(profile: SketchProfile, exceptPointId?: string | null): Plane[] {
  const pointById = new Map(profile.points.map((point) => [point.id, point]));
  const found = new Map<string, Plane>();
  const add = (point: Plane) => {
    const x = round(point.x);
    const z = round(point.z);
    found.set(`${x}:${z}`, { x, z });
  };
  profile.segments.forEach((segment) => {
    if (exceptPointId && (segment.startId === exceptPointId || segment.endId === exceptPointId)) return;
    const start = pointById.get(segment.startId);
    const end = pointById.get(segment.endId);
    if (!start || !end) return;
    const first = start.handleOut;
    const second = end.handleIn;
    if ((segment.kind ?? "line") === "line" || !first || !second) {
      add({ x: (start.x + end.x) / 2, z: (start.z + end.z) / 2 });
      return;
    }
    const center = circularArcCenter(start, first, second, end);
    if (center) add(center);
  });
  // A middle that is a point already is not listed again; it snaps as a point.
  profile.points.forEach((point) => found.delete(`${round(point.x)}:${round(point.z)}`));
  return [...found.values()];
}

/** The middles of the sides of a shape's outline given by its corners in order, for the bodies shown underneath. */
export function outlineSideMiddles(corners: readonly Plane[]): Plane[] {
  return corners.map((corner, index) => {
    const next = corners[(index + 1) % corners.length];
    return { x: (corner.x + next.x) / 2, z: (corner.z + next.z) / 2 };
  });
}

/**
 * Where the middle of a moved selection snaps to (#1236): the ends and corners of the rest of the sketch, the middles
 * of its lines and centres of its circles, and where its construction lines cross. What moves is left out, and so is
 * every line with an end among it, as it would move along under the selection.
 */
export function selectionSnapTargets(profile: SketchProfile, movingIds: ReadonlySet<string>): Plane[] {
  const rest: SketchProfile = {
    ...profile,
    points: profile.points.filter((point) => !movingIds.has(point.id)),
    segments: profile.segments.filter((segment) => !movingIds.has(segment.startId) && !movingIds.has(segment.endId)),
  };
  const found = new Map<string, Plane>();
  const add = (point: Plane) => {
    const x = round(point.x);
    const z = round(point.z);
    found.set(`${x}:${z}`, { x, z });
  };
  rest.points.forEach(add);
  sketchSnapPoints(rest).forEach(add);
  constructionCrossings(rest).forEach(add);
  return [...found.values()];
}

/**
 * The middle of what moves, as the selection frame shows it: the box round its points and its curves. A circle's or
 * a rectangle's middle is its centre. Null when nothing moves.
 */
export function movingSelectionCentre(profile: SketchProfile, startPoints: readonly SketchPoint[]): Plane | null {
  if (startPoints.length === 0) return null;
  const byId = new Map(startPoints.map((point) => [point.id, point]));
  const extent: Plane[] = [...startPoints];
  profile.segments.forEach((segment) => {
    const start = byId.get(segment.startId);
    const end = byId.get(segment.endId);
    if (!start || !end || (segment.kind ?? "line") === "line" || !start.handleOut || !end.handleIn) return;
    for (let index = 1; index < 16; index += 1) extent.push(cubicPoint(start, start.handleOut, end.handleIn, end, index / 16));
  });
  const xs = extent.map((point) => point.x);
  const zs = extent.map((point) => point.z);
  return { x: (Math.min(...xs) + Math.max(...xs)) / 2, z: (Math.min(...zs) + Math.max(...zs)) / 2 };
}

/**
 * The target the moved middle lands on, if one lies within `reach` of where the pointer would put it, the nearest.
 * `centre` is the middle before the move, `delta` the move the pointer makes, off the grid.
 */
export function snappedSelectionTarget(centre: Plane, delta: Plane, targets: readonly Plane[], reach: number): Plane | null {
  const x = centre.x + delta.x;
  const z = centre.z + delta.z;
  let nearest: Plane | null = null;
  let nearestDistance = reach;
  targets.forEach((target) => {
    const distance = Math.hypot(target.x - x, target.z - z);
    if (distance <= nearestDistance) {
      nearest = target;
      nearestDistance = distance;
    }
  });
  return nearest;
}
