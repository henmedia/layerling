import { fittedCurves, runsStraight, type Cubic, type TracePoint } from "@/lib/pictureTrace";
import { orderedPaths } from "@/lib/sketchPaths";
import { joinOpenEnds } from "@/lib/sketchPointJoin";
import type { SketchPoint, SketchProfile, SketchSegment } from "@/types/layerling";

/*
 * Freehand (#1280): a line drawn with the pen, a finger or the mouse becomes ordinary sketch points, as
 * one would set them by hand - a corner where the stroke turns sharply, smooth points with handles
 * between, few of them. The stroke is walked in even steps and softened a little, so the shake of a
 * hand does not count; corners are found as the picture trace finds them (a sharp turn with the line
 * running on straight either side), and between them Bezier curves are fitted with the trace's fitter
 * (pictureTrace, after Schneider). A stroke that ends near where it began closes into an outline, so
 * it can become a body; an open one stays a line, for Stroke or a sweep path.
 */

export type FreehandSample = { x: number; z: number };

export type FreehandOptions = {
  /** How far the curves may stray from the stroke, in mm: a couple of screen pixels at the sketch's zoom. */
  tolerance: number;
  /** How near the stroke's end must come to its start to close it, in mm. */
  closeReach: number;
  /** The turn, in degrees, that counts as a corner. */
  cornerAngle?: number;
  /** Draw it as a construction line. */
  construction?: boolean;
};

export type FreehandStroke = { points: SketchPoint[]; segments: SketchSegment[]; closed: boolean };

export const FREEHAND_CORNER_ANGLE = 55;
/** On screen: how far the curves may stray from the drawn line, and how near its end must come to its start to close it. */
export const FREEHAND_TOLERANCE_PX = 2.5;
export const FREEHAND_CLOSE_PX = 16;
/** Passes of 1-2-1 softening each run between corners gets before it is fitted: about three steps either side. */
const RUN_SOFTENING = 16;
/** The curves may stray this much further from the softened run than the shake that was softened away. */
const FIT_FACTOR = 1.6;

/** A piece of the result: straight when it has no handles. */
type Piece = { from: TracePoint; to: TracePoint; c1?: TracePoint; c2?: TracePoint };

const sub = (a: TracePoint, b: TracePoint): TracePoint => ({ x: a.x - b.x, y: a.y - b.y });
const add = (a: TracePoint, b: TracePoint): TracePoint => ({ x: a.x + b.x, y: a.y + b.y });
const scale = (a: TracePoint, factor: number): TracePoint => ({ x: a.x * factor, y: a.y * factor });
const distance = (a: TracePoint, b: TracePoint) => Math.hypot(a.x - b.x, a.y - b.y);
function unit(a: TracePoint): TracePoint {
  const size = Math.hypot(a.x, a.y);
  return size > 1e-12 ? { x: a.x / size, y: a.y / size } : { x: 1, y: 0 };
}
function turnDegrees(a: TracePoint, b: TracePoint) {
  const sizes = Math.hypot(a.x, a.y) * Math.hypot(b.x, b.y);
  if (sizes < 1e-12) return 0;
  return (Math.acos(Math.min(1, Math.max(-1, (a.x * b.x + a.y * b.y) / sizes))) * 180) / Math.PI;
}

function lengthOf(line: readonly TracePoint[]) {
  let sum = 0;
  for (let index = 1; index < line.length; index += 1) sum += distance(line[index], line[index - 1]);
  return sum;
}

/** An open line walked in steps of `step`, from its first point to its last, both kept. */
function resampled(line: readonly TracePoint[], step: number): TracePoint[] {
  const out: TracePoint[] = [{ ...line[0] }];
  let carried = 0;
  for (let index = 1; index < line.length; index += 1) {
    const a = line[index - 1];
    const b = line[index];
    const side = distance(a, b);
    let along = step - carried;
    while (along < side) {
      const t = along / side;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      along += step;
    }
    carried = side - (along - step);
  }
  const last = line[line.length - 1];
  if (distance(out[out.length - 1], last) < step * 0.5 && out.length > 1) out[out.length - 1] = { ...last };
  else out.push({ ...last });
  return out;
}

/**
 * The line softened with 1-2-1 weights, `passes` times: the shake of a hand goes, its shape stays. An open line keeps
 * its ends, so a run between two corners keeps its corners sharp.
 */
function softened(line: readonly TracePoint[], closed: boolean, passes = 2): TracePoint[] {
  let current = line.map((point) => ({ ...point }));
  const count = current.length;
  if (count < 3) return current;
  for (let pass = 0; pass < passes; pass += 1) {
    const before = current;
    current = before.map((point, index) => {
      if (!closed && (index === 0 || index === count - 1)) return point;
      const previous = before[(index - 1 + count) % count];
      const next = before[(index + 1) % count];
      return { x: (previous.x + 2 * point.x + next.x) / 4, y: (previous.y + 2 * point.y + next.y) / 4 };
    });
  }
  return current;
}

/**
 * Where the stroke has corners: the steps where it turns by more than `angle` within `reach` steps
 * while turning hardly more twice as far out, the sharpest step of each corner only. An open
 * line's ends are no corners here; they are ends anyway.
 */
function cornerIndexes(samples: readonly TracePoint[], closed: boolean, angle: number, reach: number): number[] {
  const count = samples.length;
  if (reach * 4 >= count) return [];
  const at = (index: number) => (closed ? samples[((index % count) + count) % count] : samples[Math.min(count - 1, Math.max(0, index))]);
  const turn = (index: number, span: number) => turnDegrees(sub(at(index), at(index - span)), sub(at(index + span), at(index)));
  const near = samples.map((_, index) => turn(index, reach));
  const corners: number[] = [];
  const first = closed ? 0 : reach;
  const last = closed ? count - 1 : count - 1 - reach;
  for (let index = first; index <= last; index += 1) {
    const wide = turn(index, 2 * reach);
    if (wide < angle || near[index] < 0.6 * wide) continue;
    let sharpest = true;
    for (let offset = -reach; offset <= reach && sharpest; offset += 1) {
      if (offset === 0) continue;
      const other = closed ? near[(((index + offset) % count) + count) % count] : near[index + offset];
      if (other === undefined) continue;
      if (other > near[index] || (other === near[index] && offset < 0)) sharpest = false;
    }
    if (sharpest) corners.push(index);
  }
  return corners;
}

/** The direction a run leaves its point `index` in, looking `reach` steps ahead (or back, with a negative `toward`). */
function runDirection(points: readonly TracePoint[], index: number, toward: 1 | -1, reach: number) {
  const span = Math.max(1, Math.min(reach, Math.floor((points.length - 1) / 3)));
  const other = points[Math.min(points.length - 1, Math.max(0, index + toward * span))];
  return unit(sub(other, points[index]));
}

/** One run between two corners (or ends) as pieces: a line where it runs straight, else fitted curves. */
function runPieces(run: readonly TracePoint[], startDirection: TracePoint, endDirection: TracePoint, tolerance: number): Piece[] {
  if (run.length < 2 || (run.length < 3 && distance(run[0], run[run.length - 1]) < 1e-9)) return [];
  if (runsStraight(run, tolerance)) return [{ from: run[0], to: run[run.length - 1] }];
  const curves: Cubic[] = [];
  fittedCurves(run, startDirection, endDirection, tolerance, curves);
  return curves.map((curve) => ({ from: curve.from, c1: curve.c1, c2: curve.c2, to: curve.to }));
}

/** A cubic halved at its middle (de Casteljau). */
function halved(piece: Piece): [Piece, Piece] {
  if (!piece.c1 || !piece.c2) {
    const middle = scale(add(piece.from, piece.to), 0.5);
    return [{ from: piece.from, to: middle }, { from: middle, to: piece.to }];
  }
  const mid = (a: TracePoint, b: TracePoint) => scale(add(a, b), 0.5);
  const ab = mid(piece.from, piece.c1);
  const bc = mid(piece.c1, piece.c2);
  const cd = mid(piece.c2, piece.to);
  const abc = mid(ab, bc);
  const bcd = mid(bc, cd);
  const middle = mid(abc, bcd);
  return [{ from: piece.from, c1: ab, c2: abc, to: middle }, { from: middle, c1: bcd, c2: cd, to: piece.to }];
}

/**
 * Where a closed stroke closes: the step near its end that comes nearest its start, when that lies
 * within `reach` of it and the stroke went round far enough to make an outline. The tail after it
 * (a hand overshoots the start) is left off. -1 for an open stroke.
 */
function closingIndex(line: readonly TracePoint[], reach: number): number {
  const total = lengthOf(line);
  if (total < Math.max(4 * reach, 1e-9)) return -1;
  let walked = 0;
  let best = -1;
  let bestDistance = Infinity;
  for (let index = 1; index < line.length; index += 1) {
    walked += distance(line[index], line[index - 1]);
    // Only the last part of the stroke may close it: the start is near itself at first.
    if (walked < total * 0.6) continue;
    const gap = distance(line[index], line[0]);
    if (gap < bestDistance) {
      bestDistance = gap;
      best = index;
    }
  }
  return bestDistance <= reach ? best : -1;
}

/**
 * A drawn stroke as sketch points and sides, or null when it is too short to be a line (a tap).
 * The points are in the sketch's own coordinates (x, z), rounded to a thousandth of a millimetre.
 */
export function freehandStroke(samples: readonly FreehandSample[], options: FreehandOptions, createId: (prefix: string) => string): FreehandStroke | null {
  const tolerance = Math.max(1e-4, options.tolerance);
  const angle = options.cornerAngle ?? FREEHAND_CORNER_ANGLE;
  // The samples as the fitter's points, without repeats.
  const line: TracePoint[] = [];
  samples.forEach((sample) => {
    if (!Number.isFinite(sample.x) || !Number.isFinite(sample.z)) return;
    const point = { x: sample.x, y: sample.z };
    if (!line.length || distance(point, line[line.length - 1]) >= tolerance * 0.25) line.push(point);
  });
  if (line.length < 2 || lengthOf(line) < tolerance * 4) return null;

  const step = tolerance;
  const reach = Math.max(2, Math.round((4 * tolerance) / step));
  const fit = tolerance * FIT_FACTOR;
  const closeAt = closingIndex(line, Math.max(options.closeReach, tolerance * 2));
  const closed = closeAt > 0;
  let pieces: Piece[] = [];
  const corners: TracePoint[] = [];

  if (closed) {
    let ring = resampled(line.slice(0, closeAt + 1), step);
    // The last step lands on (or near) the first: one point for both.
    if (ring.length > 3 && distance(ring[ring.length - 1], ring[0]) < step * 1.5) ring = ring.slice(0, -1);
    if (ring.length < 6) return null;
    ring = softened(ring, true);
    const count = ring.length;
    const found = cornerIndexes(ring, true, angle, reach);
    if (!found.length) {
      // No corner: one smooth loop, fitted from a point round to itself (the fitter cuts it at its far end).
      const smooth = softened(ring, true, RUN_SOFTENING);
      const loop = [...smooth, smooth[0]];
      const across = unit(sub(smooth[1], smooth[count - 1]));
      pieces = runPieces(loop, across, scale(across, -1), fit);
    } else {
      found.forEach((start, order) => {
        const end = found[(order + 1) % found.length];
        const steps = (end - start + count) % count || count;
        const run = softened(Array.from({ length: steps + 1 }, (_, offset) => ring[(start + offset) % count]), false, RUN_SOFTENING);
        corners.push(run[0]);
        pieces.push(...runPieces(run, runDirection(run, 0, 1, reach), runDirection(run, run.length - 1, -1, reach), fit));
      });
    }
    // Fewer than three sides do not close an outline in the sketch: halve the longest until there are three.
    while (pieces.length && pieces.length < 3) {
      let longest = 0;
      pieces.forEach((piece, index) => {
        if (distance(piece.from, piece.to) > distance(pieces[longest].from, pieces[longest].to)) longest = index;
      });
      pieces.splice(longest, 1, ...halved(pieces[longest]));
    }
  } else {
    let walked = resampled(line, step);
    if (walked.length < 2) return null;
    walked = softened(walked, false);
    const found = [0, ...cornerIndexes(walked, false, angle, reach), walked.length - 1];
    for (let order = 0; order + 1 < found.length; order += 1) {
      const run = softened(walked.slice(found[order], found[order + 1] + 1), false, RUN_SOFTENING);
      corners.push(run[0]);
      pieces.push(...runPieces(run, runDirection(run, 0, 1, reach), runDirection(run, run.length - 1, -1, reach), fit));
    }
    corners.push(walked[walked.length - 1]);
  }
  if (!pieces.length) return null;

  const round = (value: number) => Math.round(value * 1000) / 1000;
  const toSketch = (point: TracePoint) => ({ x: round(point.x), z: round(point.y) });
  const isCorner = (point: TracePoint) => corners.some((corner) => distance(corner, point) < 1e-9);
  const nodeCount = closed ? pieces.length : pieces.length + 1;
  const ids = Array.from({ length: nodeCount }, () => createId("sketch-point"));
  const points: SketchPoint[] = ids.map((id, index) => {
    const piece = pieces[index];
    const previous = closed ? pieces[(index - 1 + pieces.length) % pieces.length] : pieces[index - 1];
    const at = piece ? piece.from : previous!.to;
    const point: SketchPoint = { id, ...toSketch(at) };
    if (piece?.c1) point.handleOut = toSketch(piece.c1);
    if (previous?.c2) point.handleIn = toSketch(previous.c2);
    const end = !closed && (index === 0 || index === nodeCount - 1);
    const corner = end || isCorner(at) || !point.handleIn || !point.handleOut;
    point.mode = corner ? (point.handleIn || point.handleOut ? "split" : "corner") : "smooth";
    return point;
  });
  const segments: SketchSegment[] = pieces.map((piece, index) => ({
    id: createId("sketch-segment"),
    startId: ids[index],
    endId: ids[(index + 1) % nodeCount],
    kind: piece.c1 && piece.c2 ? "bezier" : "line",
    ...(options.construction ? { construction: true } : {}),
  }));
  return { points, segments, closed };
}

/** The stroke drawn the other way round: its sides run from its end to its start, the handles of each point swapped. */
function reversedStroke(stroke: FreehandStroke): FreehandStroke {
  return {
    closed: stroke.closed,
    points: [...stroke.points].reverse().map((point) => {
      const turned: SketchPoint = { ...point };
      delete turned.handleIn;
      delete turned.handleOut;
      if (point.handleOut) turned.handleIn = point.handleOut;
      if (point.handleIn) turned.handleOut = point.handleIn;
      return turned;
    }),
    segments: [...stroke.segments].reverse().map((segment) => ({ ...segment, startId: segment.endId, endId: segment.startId })),
  };
}

/** The point moved to `to`, its handles with it. */
function movedTo(point: SketchPoint, to: { x: number; z: number }): SketchPoint {
  const dx = to.x - point.x;
  const dz = to.z - point.z;
  const moved: SketchPoint = { ...point, x: to.x, z: to.z };
  if (point.handleIn) moved.handleIn = { x: point.handleIn.x + dx, z: point.handleIn.z + dz };
  if (point.handleOut) moved.handleOut = { x: point.handleOut.x + dx, z: point.handleOut.z + dz };
  return moved;
}

/** The open ends of a sketch: points with one side, not locked. */
function openEnds(profile: SketchProfile): SketchPoint[] {
  const used = new Map<string, number>();
  profile.segments.forEach((segment) => {
    used.set(segment.startId, (used.get(segment.startId) ?? 0) + 1);
    used.set(segment.endId, (used.get(segment.endId) ?? 0) + 1);
  });
  return profile.points.filter((point) => !point.locked && used.get(point.id) === 1);
}

/**
 * The stroke added to the sketch. An open stroke that begins or ends within `reach` of an open end of
 * the sketch carries that line on: its end becomes that point, so a shape can be drawn in several
 * strokes and closed with the last one. Drawn the other way round when the handles call for it (a
 * side bends from the handle of its start or its end, and the two sides at the joined point must not
 * need the same one). `closed` tells whether the stroke closed an outline, by itself or with others;
 * `points` is how many points that outline has, or for an open stroke how many it added.
 */
export function addFreehandStroke(profile: SketchProfile, stroke: FreehandStroke, reach: number): { profile: SketchProfile; joined: number; closed: boolean; points: number } {
  const appended = (piece: FreehandStroke): SketchProfile => ({ ...profile, points: [...profile.points, ...piece.points], segments: [...profile.segments, ...piece.segments] });
  if (stroke.closed) return { profile: appended(stroke), joined: 0, closed: true, points: stroke.points.length };
  const ends = openEnds(profile);
  const nearest = (point: SketchPoint, except: string | null) => {
    let best: SketchPoint | null = null;
    let bestDistance = reach;
    ends.forEach((end) => {
      const gap = Math.hypot(end.x - point.x, end.z - point.z);
      if (end.id !== except && gap <= bestDistance) {
        best = end;
        bestDistance = gap;
      }
    });
    return best as SketchPoint | null;
  };
  const attempt = (piece: FreehandStroke) => {
    const first = piece.points[0];
    const last = piece.points[piece.points.length - 1];
    const startTarget = nearest(first, null);
    const endTarget = nearest(last, startTarget?.id ?? null);
    let next = appended({
      ...piece,
      points: piece.points.map((point) => (point === first && startTarget ? movedTo(point, startTarget) : point === last && endTarget ? movedTo(point, endTarget) : point)),
    });
    let joined = 0;
    let wanted = 0;
    [[first, startTarget], [last, endTarget]].forEach(([point, target]) => {
      if (!target || !point) return;
      wanted += 1;
      const result = joinOpenEnds(next, point.id);
      if (result) {
        next = result;
        joined += 1;
      }
    });
    return { profile: next, joined, wanted };
  };
  let best = attempt(stroke);
  if (best.joined < best.wanted) {
    const other = attempt(reversedStroke(stroke));
    if (other.joined > best.joined) best = other;
  }
  const strokeSide = new Set(stroke.segments.map((segment) => segment.id));
  const outline = orderedPaths(best.profile).find((path) => path.closed && path.steps.some((step) => strokeSide.has(step.segment.id)));
  return { profile: best.profile, joined: best.joined, closed: Boolean(outline), points: outline ? outline.points.length : stroke.points.length - best.joined };
}
