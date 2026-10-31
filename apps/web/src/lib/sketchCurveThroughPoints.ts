import { orderedPaths } from "@/lib/sketchPaths";
import { cloneSketchProfile } from "@/lib/sketchSmoothHandles";
import type { SketchPoint, SketchProfile, SketchSegment } from "@/types/layerling";

/** A run of an outline from its first to its last selected point; `closed` when it is the whole closed outline. */
export type CurveStretch = { points: SketchPoint[]; segments: SketchSegment[]; closed: boolean };

/**
 * Where Curve through points works: on each outline with 3 or more of the selected points, the run from the
 * first of them to the last. The points in between that are not selected go on the curve too. On a
 * closed outline the run is the shortest one that holds them all: the largest gap stays as it is.
 */
export function curveStretches(profile: SketchProfile, pointIds: readonly string[]): CurveStretch[] {
  const selected = new Set(pointIds);
  const stretches: CurveStretch[] = [];
  orderedPaths(profile).forEach((path) => {
    const count = path.points.length;
    const indexes = path.points.flatMap((point, index) => (selected.has(point.id) ? [index] : []));
    if (indexes.length < 3) return;
    if (!path.closed) {
      const first = indexes[0];
      const last = indexes[indexes.length - 1];
      stretches.push({ points: path.points.slice(first, last + 1), segments: path.steps.slice(first, last).map((step) => step.segment), closed: false });
      return;
    }
    if (indexes.length === count) {
      stretches.push({ points: path.points, segments: path.steps.map((step) => step.segment), closed: true });
      return;
    }
    // The gap after indexes[widest] is the largest: the run starts after it and goes all the way round to it.
    let widest = 0;
    let widestGap = 0;
    indexes.forEach((index, order) => {
      const gap = (indexes[(order + 1) % indexes.length] - index + count) % count;
      if (gap > widestGap) {
        widest = order;
        widestGap = gap;
      }
    });
    const start = indexes[(widest + 1) % indexes.length];
    const length = count - widestGap;
    stretches.push({
      points: Array.from({ length: length + 1 }, (_, offset) => path.points[(start + offset) % count]),
      segments: Array.from({ length }, (_, offset) => path.steps[(start + offset) % count].segment),
      closed: false,
    });
  });
  return stretches;
}

/** Which handle of the point a curved side outside the run uses, if any. */
function outerHandle(profile: SketchProfile, point: SketchPoint, inner: ReadonlySet<string>): "in" | "out" | null {
  const outer = profile.segments.find((segment) =>
    !inner.has(segment.id) && (segment.kind ?? "line") !== "line" && (segment.startId === point.id || segment.endId === point.id));
  if (!outer) return null;
  return outer.startId === point.id ? "out" : "in";
}

/**
 * Curve through points (3 or more points selected), "Fit curve" or "Fit point spline" elsewhere: each run from curveStretches becomes one flowing
 * curve through its points, laid as the Smooth Curve tool lays one (withSmoothSketchHandles). The
 * points inside the run turn smooth; its two ends keep their kind and only get the handle facing the
 * curve, so the lines and curves beyond them stay as they are. Null when no outline has 3 points.
 */
export function curveThroughPoints(profile: SketchProfile, pointIds: readonly string[]): { profile: SketchProfile; count: number } | null {
  const stretches = curveStretches(profile, pointIds);
  if (!stretches.length) return null;
  const next = cloneSketchProfile(profile);
  const points = new Map(next.points.map((point) => [point.id, point]));
  const segments = new Map(next.segments.map((segment) => [segment.id, segment]));
  let count = 0;
  stretches.forEach((stretch) => {
    const run = stretch.points.map((point) => points.get(point.id)!);
    const last = run.length - 1;
    const inner = new Set(stretch.segments.map((segment) => segment.id));
    // A handle belongs to the side as it is stored: the out handle to the one starting at the point,
    // the in handle to the one ending there. The run's sides are stored one way along it: the way
    // most of them already run, unless that takes an end's handle that a curve beyond it uses.
    const storedForward = stretch.segments.filter((segment, index) => segment.startId === run[index].id).length * 2 >= stretch.segments.length;
    const forwardFree = outerHandle(next, run[0], inner) !== "out" && outerHandle(next, run[last], inner) !== "in";
    const backwardFree = outerHandle(next, run[0], inner) !== "in" && outerHandle(next, run[last], inner) !== "out";
    const forward = stretch.closed || forwardFree === backwardFree ? storedForward : forwardFree;
    // The tangent along the run at each point, a sixth of the way between its neighbours.
    const tangents = run.map((_point, index) => {
      const previous = stretch.closed ? run[(index - 1 + run.length) % run.length] : run[Math.max(0, index - 1)];
      const following = stretch.closed ? run[(index + 1) % run.length] : run[Math.min(last, index + 1)];
      return { x: (following.x - previous.x) / 6, z: (following.z - previous.z) / 6 };
    });
    stretch.segments.forEach((source, index) => {
      const segment = segments.get(source.id)!;
      const from = run[index];
      const toIndex = (index + 1) % run.length;
      const to = run[toIndex];
      const nearFrom = { x: from.x + tangents[index].x, z: from.z + tangents[index].z };
      const nearTo = { x: to.x - tangents[toIndex].x, z: to.z - tangents[toIndex].z };
      segment.kind = "bezier";
      segment.startId = forward ? from.id : to.id;
      segment.endId = forward ? to.id : from.id;
      if (forward) {
        from.handleOut = nearFrom;
        to.handleIn = nearTo;
      } else {
        from.handleIn = nearFrom;
        to.handleOut = nearTo;
      }
    });
    run.forEach((point, index) => {
      if (stretch.closed || (index > 0 && index < last)) point.mode = "smooth";
      // An end that was smooth no longer has its two handles in line.
      else if (point.mode === "smooth") point.mode = "split";
    });
    count += run.length;
  });
  return { profile: next, count };
}
