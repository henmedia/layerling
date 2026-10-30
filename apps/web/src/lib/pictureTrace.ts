import { pictureShapePart } from "@/lib/pictureIcon";
import { fieldRings, ringArea, shapeField, shrinkRaster, type RasterPart, type RasterPixels } from "@/lib/rasterTrace";

/*
 * Trace (Nachzeichnen): a picture - a silhouette, a logo, a word - becomes outlines a person goes on
 * working with, in the sketch and in the vase drawing. Where the import's tracer (rasterTrace) writes
 * many short straight pieces, this one sets few points: a corner point where the outline turns sharply,
 * and between the corners smooth points with handles, as one would draw them by hand. How many points
 * there are, which turn counts as a corner, where dark turns light, how small a speck is left out and
 * whether holes stay are the settings, as in the trace tools of laser programs.
 *
 * The steps: the outline where the picture crosses the threshold (rasterTrace's marching squares, on
 * the picture softened a little, so a hard pixel edge gives a smooth line); the outline walked in even
 * steps; a corner where the line turns by more than the corner angle within a few pixels while the
 * line on either side runs on straight (a tight curve turns as much, but spread over its length);
 * between the corners Bezier curves fitted to the line (least squares, split where they stray, after
 * Schneider's "Algorithm for Automatically Fitting Digitized Curves", Graphics Gems, 1990), as
 * loosely as the number of points allows.
 */

export type TracePoint = { x: number; y: number };
/** A point of a traced outline, in the picture's pixels (0 at its left and top edge, y down). */
export type TraceNode = TracePoint & {
  /** A corner: the outline changes direction here. Otherwise the handles lie on one line through the point. */
  corner: boolean;
  /** The handle of the side arriving here, when that side is curved. */
  handleIn?: TracePoint;
  /** The handle of the side leaving here, when that side is curved. */
  handleOut?: TracePoint;
};
/** A closed outline: each point joins the next, the last the first; a side is curved when both of its ends have the handle facing it. */
export type TraceRing = { nodes: TraceNode[]; hole: boolean };

export type PictureTraceSettings = {
  /** The dark part (a black shape on white) or the light one becomes the shape. */
  part: RasterPart;
  /** Where dark turns light, 0 to 1. */
  threshold: number;
  /** At most this many points in all the outlines together; the corners always stay. */
  points: number;
  /** A turn sharper than this many degrees is a corner; 180 makes none. */
  cornerAngle: number;
  /** An outline round less than this many square pixels of the picture is a speck and left out. */
  speck: number;
  /** Holes (the middle of an A or an O) stay; without them only the outermost outlines are traced. */
  holes: boolean;
};

export type PictureTrace = {
  rings: TraceRing[];
  /** How many points all the outlines have together. */
  points: number;
  /** How many of them are corners. */
  corners: number;
};

/** The range the number of points can be set in for some settings, and the number that follows the picture closely. */
export type PictureTraceRange = { fewest: number; most: number; suggested: number };

/** Corner angles that can be set, in degrees; at the largest there are no corners. */
export const MIN_TRACE_CORNER_ANGLE = 10;
export const MAX_TRACE_CORNER_ANGLE = 180;
export const DEFAULT_TRACE_CORNER_ANGLE = 45;

/** How far the fitted line may stray from the picture's outline, in pixels of the traced picture: from close to loose. */
const FINEST_TOLERANCE = 0.3;
const LOOSEST_TOLERANCE = 48;
/** The tolerance the suggested number of points comes from: close to the picture, without following its pixels. */
const SUGGESTED_TOLERANCE = 1.2;
/** How many pixels on either side of a point the corner search looks. */
const CORNER_REACH = 3;
/** A corner turns at least this share of its turn within CORNER_REACH; a curve spreads its turn evenly. */
const CORNER_SHARPNESS = 0.7;
/** A sketch outline needs three sides to count as closed. */
const MIN_RING_SIDES = 3;

type Cubic = { from: TracePoint; c1: TracePoint; c2: TracePoint; to: TracePoint };
/** A piece of an outline: straight when it has no handles. */
type Piece = { from: TracePoint; to: TracePoint; c1?: TracePoint; c2?: TracePoint; cornerAtStart: boolean };
/** One outline of the picture, walked in even steps, with what does not change with the number of points. */
type Contour = { samples: TracePoint[]; area: number; depth: number };

const sub = (a: TracePoint, b: TracePoint): TracePoint => ({ x: a.x - b.x, y: a.y - b.y });
const add = (a: TracePoint, b: TracePoint): TracePoint => ({ x: a.x + b.x, y: a.y + b.y });
const scale = (a: TracePoint, factor: number): TracePoint => ({ x: a.x * factor, y: a.y * factor });
const dot = (a: TracePoint, b: TracePoint) => a.x * b.x + a.y * b.y;
const length = (a: TracePoint) => Math.hypot(a.x, a.y);
const distance = (a: TracePoint, b: TracePoint) => Math.hypot(a.x - b.x, a.y - b.y);
function unit(a: TracePoint): TracePoint {
  const size = length(a);
  return size > 1e-12 ? { x: a.x / size, y: a.y / size } : { x: 1, y: 0 };
}

/** The angle between two directions, 0 to 180 degrees. */
function turnDegrees(a: TracePoint, b: TracePoint) {
  const sizes = length(a) * length(b);
  if (sizes < 1e-12) return 0;
  return (Math.acos(Math.min(1, Math.max(-1, dot(a, b) / sizes))) * 180) / Math.PI;
}

/** A closed line walked in steps of `step`, starting at its first point. */
function resampled(ring: readonly TracePoint[], step: number): TracePoint[] {
  const out: TracePoint[] = [{ ...ring[0] }];
  let carried = 0;
  for (let index = 0; index < ring.length; index += 1) {
    const a = ring[index];
    const b = ring[(index + 1) % ring.length];
    const side = distance(a, b);
    let along = step - carried;
    while (along < side) {
      const t = along / side;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      along += step;
    }
    carried = side - (along - step);
  }
  // The last step would land on the start again.
  if (out.length > 1 && distance(out[out.length - 1], out[0]) < step * 0.5) out.pop();
  return out;
}

function perimeter(ring: readonly TracePoint[]) {
  let sum = 0;
  for (let index = 0; index < ring.length; index += 1) sum += distance(ring[index], ring[(index + 1) % ring.length]);
  return sum;
}

/** Whether a point lies inside a closed line (even-odd). */
function inside(point: TracePoint, ring: readonly TracePoint[]) {
  let hit = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const a = ring[index];
    const b = ring[previous];
    if ((a.y > point.y) !== (b.y > point.y) && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) hit = !hit;
  }
  return hit;
}

/**
 * The darkness (or lightness) where the picture's two parts meet: the threshold that splits its pixels
 * best into two groups (Otsu), then the middle between the two groups, so a picture of pure black and
 * white is cut half way, where its edges lie.
 */
function splitLightness(pixels: RasterPixels) {
  const histogram = new Float64Array(256);
  const { data } = pixels;
  for (let index = 0; index < data.length; index += 4) {
    const opacity = data[index + 3] / 255;
    if (opacity < 0.5) continue;
    const lightness = (0.2126 * data[index] + 0.7152 * data[index + 1] + 0.0722 * data[index + 2]) / 255;
    histogram[Math.min(255, Math.round(lightness * 255))] += 1;
  }
  let total = 0;
  let sum = 0;
  histogram.forEach((count, level) => {
    total += count;
    sum += count * level;
  });
  if (total === 0) return 0.5;
  let below = 0;
  let belowSum = 0;
  let best = -1;
  let split = 127;
  for (let level = 0; level < 255; level += 1) {
    below += histogram[level];
    belowSum += histogram[level] * level;
    const above = total - below;
    if (below === 0 || above === 0) continue;
    const meanBelow = belowSum / below;
    const meanAbove = (sum - belowSum) / above;
    const spread = below * above * (meanBelow - meanAbove) ** 2;
    if (spread > best) {
      best = spread;
      split = (meanBelow + meanAbove) / 2;
    }
  }
  return Math.min(0.9, Math.max(0.1, split / 255));
}

/** A picture made ready to trace: shrunk to the tracer's size, its outlines kept for each part and threshold tried. */
export type PreparedPicture = {
  /** The picture's own size, in pixels: the traced points are given in these. */
  width: number;
  height: number;
  /** The picture as it is traced, and how many of its own pixels one of these is. */
  pixels: RasterPixels;
  scaleX: number;
  scaleY: number;
  fields: Partial<Record<RasterPart, Float32Array>>;
  contours: Map<string, Contour[]>;
};

/** Gets a picture ready for tracing it several times over, as its settings change. */
export function preparePicture(source: RasterPixels): PreparedPicture {
  const pixels = shrinkRaster(source);
  return {
    width: source.width,
    height: source.height,
    pixels,
    scaleX: source.width / pixels.width,
    scaleY: source.height / pixels.height,
    fields: {},
    contours: new Map(),
  };
}

/**
 * The settings a picture is traced with to start: the part that is not its background, the threshold
 * between its two parts, specks of a few pixels left out, holes kept, corners from 45 degrees. The
 * number of points follows the picture closely.
 */
export function defaultTraceSettings(picture: PreparedPicture): PictureTraceSettings {
  const base = {
    part: pictureShapePart(picture.pixels),
    threshold: Math.round(splitLightness(picture.pixels) * 100) / 100,
    cornerAngle: DEFAULT_TRACE_CORNER_ANGLE,
    speck: defaultSpeck(picture),
    holes: true,
  };
  return { ...base, points: traceRange(picture, base).suggested };
}

/** Specks left out to start: a few pixels of the traced picture, or a hundred-thousandth of its area. */
export function defaultSpeck(picture: PreparedPicture) {
  const { width, height } = picture.pixels;
  return Math.max(4, width * height * 2e-5) * picture.scaleX * picture.scaleY;
}

/** The outlines for a part and a threshold, walked in even steps, with how deeply each lies inside the others. */
function contoursFor(picture: PreparedPicture, part: RasterPart, threshold: number): Contour[] {
  const level = Math.min(0.98, Math.max(0.02, threshold));
  const key = `${part}:${level.toFixed(3)}`;
  const known = picture.contours.get(key);
  if (known) return known;
  const { width, height } = picture.pixels;
  const field = picture.fields[part] ?? (picture.fields[part] = shapeField(picture.pixels, part));
  const rings = fieldRings(field, width + 2, height + 2, level).filter((ring) => ring.length >= 3);
  const areas = rings.map((ring) => ringArea(ring));
  const boxes = rings.map((ring) => {
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    ring.forEach(({ x, y }) => {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    });
    return { minX, minY, maxX, maxY };
  });
  const contours = rings.map((ring, index): Contour => {
    // How many larger outlines this one lies in: even for an outline, odd for a hole.
    const probe = ring[0];
    let depth = 0;
    rings.forEach((other, otherIndex) => {
      if (otherIndex === index || areas[otherIndex] <= areas[index]) return;
      const box = boxes[otherIndex];
      if (probe.x < box.minX || probe.x > box.maxX || probe.y < box.minY || probe.y > box.maxY) return;
      if (inside(probe, other)) depth += 1;
    });
    // Steps of a pixel, but at least 16 round a small outline.
    const step = Math.min(1, perimeter(ring) / 16);
    return { samples: resampled(ring, step), area: areas[index], depth };
  });
  picture.contours.set(key, contours);
  return contours;
}

/** The outlines the settings keep: no specks, and only the outermost ones without holes. */
function keptContours(picture: PreparedPicture, settings: Omit<PictureTraceSettings, "points">) {
  const speck = settings.speck / (picture.scaleX * picture.scaleY);
  return contoursFor(picture, settings.part, settings.threshold).filter((contour) =>
    contour.samples.length >= 3 && contour.area >= speck && (settings.holes || contour.depth === 0));
}

/**
 * Where an outline has corners: the indexes of its steps where it turns by more than `angle` degrees
 * within CORNER_REACH pixels, and turns there rather than along a tight curve - the line on either
 * side runs on straight, so twice as far out it has turned hardly more.
 */
function cornerIndexes(samples: readonly TracePoint[], angle: number): number[] {
  const count = samples.length;
  if (angle >= MAX_TRACE_CORNER_ANGLE) return [];
  const spacing = perimeter(samples) / count;
  const reach = Math.max(2, Math.round(CORNER_REACH / Math.max(1e-6, spacing)));
  if (reach * 4 >= count) return [];
  const at = (index: number) => samples[((index % count) + count) % count];
  const turn = (index: number, span: number) => turnDegrees(sub(at(index), at(index - span)), sub(at(index + span), at(index)));
  const near = samples.map((_, index) => turn(index, reach));
  const candidates: number[] = [];
  for (let index = 0; index < count; index += 1) {
    const wide = turn(index, 2 * reach);
    if (wide < angle || near[index] < CORNER_SHARPNESS * wide) continue;
    // The sharpest step of the corner only, the first of equals.
    let sharpest = true;
    for (let offset = -reach; offset <= reach && sharpest; offset += 1) {
      if (offset === 0) continue;
      const other = near[((index + offset) % count + count) % count];
      if (other > near[index] || (other === near[index] && offset < 0)) sharpest = false;
    }
    if (sharpest) candidates.push(index);
  }
  return candidates;
}

/**
 * Where a corner's point goes: where the two straight sides meet, as long as that is near the step -
 * the outline rounds every corner off by a pixel, the picture's corner is sharp.
 */
function cornerPoint(samples: readonly TracePoint[], index: number): TracePoint {
  const count = samples.length;
  const reach = Math.max(2, Math.round(CORNER_REACH / Math.max(1e-6, perimeter(samples) / count)));
  const at = (offset: number) => samples[(((index + offset) % count) + count) % count];
  const a1 = at(-2 * reach);
  const a2 = at(-reach);
  const b1 = at(reach);
  const b2 = at(2 * reach);
  const da = sub(a2, a1);
  const db = sub(b2, b1);
  const cross = da.x * db.y - da.y * db.x;
  if (Math.abs(cross) < 1e-9) return { ...at(0) };
  const t = ((b1.x - a1.x) * db.y - (b1.y - a1.y) * db.x) / cross;
  const meet = add(a1, scale(da, t));
  return distance(meet, at(0)) <= reach ? meet : { ...at(0) };
}

/** The Bernstein weights of a cubic at u. */
function weights(u: number): [number, number, number, number] {
  const v = 1 - u;
  return [v * v * v, 3 * u * v * v, 3 * u * u * v, u * u * u];
}

function pointOn(curve: Cubic, u: number): TracePoint {
  const [w0, w1, w2, w3] = weights(u);
  return {
    x: curve.from.x * w0 + curve.c1.x * w1 + curve.c2.x * w2 + curve.to.x * w3,
    y: curve.from.y * w0 + curve.c1.y * w1 + curve.c2.y * w2 + curve.to.y * w3,
  };
}

/** How far along its run each point lies, 0 to 1, by the length of the line up to it. */
function chordParameters(points: readonly TracePoint[]) {
  const along = [0];
  for (let index = 1; index < points.length; index += 1) along.push(along[index - 1] + distance(points[index], points[index - 1]));
  const total = along[along.length - 1] || 1;
  return along.map((value) => value / total);
}

/**
 * The cubic from the run's first point to its last, leaving along `startDirection` and arriving
 * against `endDirection` (both pointing into the run), whose handles are as long as fits the points
 * best (least squares); a third of the way when that gives nothing sensible.
 */
function fittedCubic(points: readonly TracePoint[], parameters: readonly number[], startDirection: TracePoint, endDirection: TracePoint): Cubic {
  const from = points[0];
  const to = points[points.length - 1];
  let c00 = 0;
  let c01 = 0;
  let c11 = 0;
  let x0 = 0;
  let x1 = 0;
  points.forEach((point, index) => {
    const [w0, w1, w2, w3] = weights(parameters[index]);
    const a1 = scale(startDirection, w1);
    const a2 = scale(endDirection, w2);
    c00 += dot(a1, a1);
    c01 += dot(a1, a2);
    c11 += dot(a2, a2);
    const rest = sub(point, add(scale(from, w0 + w1), scale(to, w2 + w3)));
    x0 += dot(a1, rest);
    x1 += dot(a2, rest);
  });
  const chord = distance(from, to);
  let run = 0;
  for (let index = 1; index < points.length; index += 1) run += distance(points[index], points[index - 1]);
  const longest = Math.max(chord * 2, run);
  const determinant = c00 * c11 - c01 * c01;
  let first = determinant !== 0 ? (x0 * c11 - x1 * c01) / determinant : 0;
  let second = determinant !== 0 ? (c00 * x1 - c01 * x0) / determinant : 0;
  // A handle that points backwards, has no length or reaches past the whole run would loop: a third each way instead.
  if (!(first > chord * 1e-3) || !(second > chord * 1e-3) || first > longest || second > longest) {
    first = chord / 3;
    second = chord / 3;
  }
  return { from, c1: add(from, scale(startDirection, first)), c2: add(to, scale(endDirection, second)), to };
}

/** The farthest any point lies from the curve (squared), and which point that is. */
function farthestPoint(points: readonly TracePoint[], parameters: readonly number[], curve: Cubic) {
  let worst = 0;
  let at = Math.floor(points.length / 2);
  for (let index = 1; index < points.length - 1; index += 1) {
    const gap = sub(pointOn(curve, parameters[index]), points[index]);
    const squared = dot(gap, gap);
    if (squared > worst) {
      worst = squared;
      at = index;
    }
  }
  return { worst, at };
}

/** The parameters moved to where the curve comes nearest each point (one Newton step). */
function improvedParameters(points: readonly TracePoint[], parameters: readonly number[], curve: Cubic) {
  const { from, c1, c2, to } = curve;
  const d1 = [scale(sub(c1, from), 3), scale(sub(c2, c1), 3), scale(sub(to, c2), 3)];
  const d2 = [scale(sub(d1[1], d1[0]), 2), scale(sub(d1[2], d1[1]), 2)];
  return parameters.map((u, index) => {
    const v = 1 - u;
    const onCurve = pointOn(curve, u);
    const first = add(add(scale(d1[0], v * v), scale(d1[1], 2 * u * v)), scale(d1[2], u * u));
    const second = add(scale(d2[0], v), scale(d2[1], u));
    const gap = sub(onCurve, points[index]);
    const denominator = dot(first, first) + dot(gap, second);
    if (Math.abs(denominator) < 1e-12) return u;
    return Math.min(1, Math.max(0, u - dot(gap, first) / denominator));
  });
}

/** Whether every point of the run lies within `tolerance` of the straight line from its first point to its last. */
function runsStraight(points: readonly TracePoint[], tolerance: number) {
  const from = points[0];
  const to = points[points.length - 1];
  const direction = sub(to, from);
  const size = length(direction);
  if (size < 1e-9) return false;
  return points.every((point) => Math.abs(direction.x * (point.y - from.y) - direction.y * (point.x - from.x)) / size <= tolerance);
}

/** The direction a run leaves its point `index` in, looking a few steps ahead (or back, with a negative `toward`). */
function runDirection(points: readonly TracePoint[], index: number, toward: 1 | -1) {
  const reach = Math.max(1, Math.min(CORNER_REACH, Math.floor((points.length - 1) / 3)));
  const other = points[Math.min(points.length - 1, Math.max(0, index + toward * reach))];
  return unit(sub(other, points[index]));
}

/**
 * Curves through a run of points from one end to the other, each within `tolerance` of them: one
 * cubic if it fits, else split where it strays most, the two halves meeting smoothly there.
 */
function fittedCurves(points: readonly TracePoint[], startDirection: TracePoint, endDirection: TracePoint, tolerance: number, out: Cubic[]) {
  if (points.length <= 2) {
    const third = distance(points[0], points[points.length - 1]) / 3;
    out.push({
      from: points[0],
      c1: add(points[0], scale(startDirection, third)),
      c2: add(points[points.length - 1], scale(endDirection, third)),
      to: points[points.length - 1],
    });
    return;
  }
  const start = points[0];
  let farthest = 0;
  points.forEach((point, index) => {
    if (distance(point, start) > distance(points[farthest], start)) farthest = index;
  });
  if (distance(start, points[points.length - 1]) < 0.02 * distance(points[farthest], start) && farthest > 0 && farthest < points.length - 1) {
    // A run that comes back to where it started (an outline without corners, or with one) is first cut at its far end.
    const reach = Math.min(2, farthest, points.length - 1 - farthest);
    const across = unit(sub(points[farthest + reach], points[farthest - reach]));
    fittedCurves(points.slice(0, farthest + 1), startDirection, scale(across, -1), tolerance, out);
    fittedCurves(points.slice(farthest), across, endDirection, tolerance, out);
    return;
  }
  let parameters = chordParameters(points);
  let curve = fittedCubic(points, parameters, startDirection, endDirection);
  let { worst, at } = farthestPoint(points, parameters, curve);
  const allowed = tolerance * tolerance;
  // Nearly there: the points sit at the wrong places along the curve more than the curve is wrong.
  for (let round = 0; round < 4 && worst > allowed && worst < allowed * 16; round += 1) {
    parameters = improvedParameters(points, parameters, curve);
    curve = fittedCubic(points, parameters, startDirection, endDirection);
    ({ worst, at } = farthestPoint(points, parameters, curve));
  }
  if (worst <= allowed) {
    out.push(curve);
    return;
  }
  const split = Math.min(points.length - 2, Math.max(1, at));
  const reach = Math.min(2, split, points.length - 1 - split);
  const across = unit(sub(points[split + reach], points[split - reach]));
  fittedCurves(points.slice(0, split + 1), startDirection, scale(across, -1), tolerance, out);
  fittedCurves(points.slice(split), across, endDirection, tolerance, out);
}

/** A cubic halved at its middle (de Casteljau): two cubics meeting smoothly. */
function halved(curve: Cubic): [Cubic, Cubic] {
  const mid = (a: TracePoint, b: TracePoint) => scale(add(a, b), 0.5);
  const ab = mid(curve.from, curve.c1);
  const bc = mid(curve.c1, curve.c2);
  const cd = mid(curve.c2, curve.to);
  const abc = mid(ab, bc);
  const bcd = mid(bc, cd);
  const middle = mid(abc, bcd);
  return [{ from: curve.from, c1: ab, c2: abc, to: middle }, { from: middle, c1: bcd, c2: cd, to: curve.to }];
}

/** The pieces of one outline at a tolerance: straight between two corners where it runs straight, else curved. */
function ringPieces(samples: readonly TracePoint[], corners: readonly number[], tolerance: number): Piece[] {
  const count = samples.length;
  const pieces: Piece[] = [];
  if (!corners.length) {
    // No corner: one smooth loop, from its first step all the way round, meeting itself smoothly.
    const loop = [...samples, samples[0]];
    const across = unit(sub(samples[2 % count], samples[(count - 2) % count]));
    const curves: Cubic[] = [];
    fittedCurves(loop, across, scale(across, -1), tolerance, curves);
    curves.forEach((curve) => pieces.push({ ...curve, cornerAtStart: false }));
  } else {
    const points = corners.map((index) => cornerPoint(samples, index));
    corners.forEach((start, order) => {
      const end = corners[(order + 1) % corners.length];
      const steps = (end - start + count) % count || count;
      const run = Array.from({ length: steps + 1 }, (_, offset) => samples[(start + offset) % count]);
      run[0] = points[order];
      run[run.length - 1] = points[(order + 1) % corners.length];
      if (runsStraight(run, tolerance)) {
        pieces.push({ from: run[0], to: run[run.length - 1], cornerAtStart: true });
        return;
      }
      const curves: Cubic[] = [];
      fittedCurves(run, runDirection(run, 0, 1), runDirection(run, run.length - 1, -1), tolerance, curves);
      curves.forEach((curve, index) => pieces.push({ ...curve, cornerAtStart: index === 0 }));
    });
  }
  // Fewer than three sides do not close an outline in the sketch: halve the longest until there are three.
  while (pieces.length < MIN_RING_SIDES) {
    let longest = 0;
    pieces.forEach((piece, index) => {
      if (distance(piece.from, piece.to) > distance(pieces[longest].from, pieces[longest].to)) longest = index;
    });
    const piece = pieces[longest];
    if (piece.c1 && piece.c2) {
      const [a, b] = halved({ from: piece.from, c1: piece.c1, c2: piece.c2, to: piece.to });
      pieces.splice(longest, 1, { ...a, cornerAtStart: piece.cornerAtStart }, { ...b, cornerAtStart: false });
    } else {
      const middle = scale(add(piece.from, piece.to), 0.5);
      pieces.splice(longest, 1, { from: piece.from, to: middle, cornerAtStart: piece.cornerAtStart }, { from: middle, to: piece.to, cornerAtStart: false });
    }
  }
  return pieces;
}

/** The pieces as points with handles, in the picture's own pixels. */
function ringNodes(pieces: readonly Piece[], picture: PreparedPicture): TraceNode[] {
  const own = (point: TracePoint): TracePoint => ({ x: point.x * picture.scaleX, y: point.y * picture.scaleY });
  return pieces.map((piece, index) => {
    const before = pieces[(index - 1 + pieces.length) % pieces.length];
    const node: TraceNode = { ...own(piece.from), corner: piece.cornerAtStart };
    if (before.c2) node.handleIn = own(before.c2);
    if (piece.c1) node.handleOut = own(piece.c1);
    return node;
  });
}

type Fit = { rings: Array<{ pieces: Piece[]; hole: boolean }>; points: number; corners: number };

function fitAll(contours: readonly Contour[], corners: readonly number[][], tolerance: number): Fit {
  let points = 0;
  let cornerCount = 0;
  const rings = contours.map((contour, index) => {
    const pieces = ringPieces(contour.samples, corners[index], tolerance);
    points += pieces.length;
    cornerCount += pieces.filter((piece) => piece.cornerAtStart).length;
    return { pieces, hole: contour.depth % 2 === 1 };
  });
  return { rings, points, corners: cornerCount };
}

/** The outlines a set of settings keeps, with their corners. */
function keptWithCorners(picture: PreparedPicture, settings: Omit<PictureTraceSettings, "points">) {
  const contours = keptContours(picture, settings);
  return { contours, corners: contours.map((contour) => cornerIndexes(contour.samples, settings.cornerAngle)) };
}

/** How many points the outlines can have with these settings: fewest at the loosest fit, most at the closest. */
export function traceRange(picture: PreparedPicture, settings: Omit<PictureTraceSettings, "points">): PictureTraceRange {
  const { contours, corners } = keptWithCorners(picture, settings);
  if (!contours.length) return { fewest: 0, most: 0, suggested: 0 };
  const fewest = fitAll(contours, corners, LOOSEST_TOLERANCE).points;
  const most = Math.max(fewest, fitAll(contours, corners, FINEST_TOLERANCE).points);
  const suggested = Math.min(most, Math.max(fewest, fitAll(contours, corners, SUGGESTED_TOLERANCE).points));
  return { fewest, most, suggested };
}

/**
 * The picture traced with the settings: the outlines as close to the picture as the number of points
 * allows - the closest fit that has no more points than asked for, or the loosest one if even that has
 * more (the corners always stay). No outlines when the settings leave nothing.
 */
export function tracePicture(picture: PreparedPicture, settings: PictureTraceSettings): PictureTrace {
  const { contours, corners } = keptWithCorners(picture, settings);
  if (!contours.length) return { rings: [], points: 0, corners: 0 };
  let best = fitAll(contours, corners, FINEST_TOLERANCE);
  if (best.points > settings.points) {
    let close = Math.log(FINEST_TOLERANCE);
    let loose = Math.log(LOOSEST_TOLERANCE);
    best = fitAll(contours, corners, LOOSEST_TOLERANCE);
    if (best.points <= settings.points) {
      // The closest fit within the number of points: halve the gap between too many and few enough.
      for (let round = 0; round < 12; round += 1) {
        const middle = (close + loose) / 2;
        const fit = fitAll(contours, corners, Math.exp(middle));
        if (fit.points <= settings.points) {
          best = fit;
          loose = middle;
        } else close = middle;
      }
    }
  }
  return {
    rings: best.rings.map((ring) => ({ nodes: ringNodes(ring.pieces, picture), hole: ring.hole })),
    points: best.points,
    corners: best.corners,
  };
}

const svgNumber = (value: number) => String(Math.round(value * 1000) / 1000);

/** A traced picture as an SVG path's data, in the picture's pixels: M, L and C, each outline closed. */
export function tracePathData(trace: Pick<PictureTrace, "rings">) {
  return trace.rings.map(({ nodes }) => {
    const parts = [`M${svgNumber(nodes[0].x)} ${svgNumber(nodes[0].y)}`];
    nodes.forEach((node, index) => {
      const next = nodes[(index + 1) % nodes.length];
      if (node.handleOut && next.handleIn) {
        parts.push(`C${svgNumber(node.handleOut.x)} ${svgNumber(node.handleOut.y)} ${svgNumber(next.handleIn.x)} ${svgNumber(next.handleIn.y)} ${svgNumber(next.x)} ${svgNumber(next.y)}`);
      } else if (index < nodes.length - 1) parts.push(`L${svgNumber(next.x)} ${svgNumber(next.y)}`);
    });
    return `${parts.join("")}Z`;
  }).join("");
}

/** A traced picture as an SVG file of the picture's size, the outlines filled even-odd, as a drawing program writes one. */
export function traceSvg(trace: Pick<PictureTrace, "rings">, picture: Pick<PreparedPicture, "width" | "height">) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${picture.width}" height="${picture.height}" viewBox="0 0 ${picture.width} ${picture.height}"><path fill="#000000" fill-rule="evenodd" d="${tracePathData(trace)}"/></svg>`;
}
