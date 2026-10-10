import type { CrossSection, ManifoldToplevel } from "manifold-3d";
import { orderedCadSketchPaths, type OrderedCadSketchPath } from "@/lib/sketchCadProfile";
import type { SketchProfile, SketchStroke, SketchStrokeAlign, SketchStrokeCap, SketchStrokeJoin } from "@/types/layerling";

/**
 * Stroke for sketches (#154): instead of filling its outlines, a sketch can be drawn as a line of
 * a given width. A closed outline becomes a frame - its wall inside, outside or centred on the
 * drawn line, as in Tinkercad (a 0.2 mm outside stroke round a dovetail hole is a print
 * tolerance). An open line becomes a stripe with chosen corners and ends. The sketch keeps the
 * drawn line; the stroked outline is worked out when the body is built.
 */

export const SKETCH_STROKE_ALIGNS: readonly SketchStrokeAlign[] = ["center", "inside", "outside", "grow"];
export const SKETCH_STROKE_JOINS: readonly SketchStrokeJoin[] = ["miter", "round", "bevel"];
export const SKETCH_STROKE_CAPS: readonly SketchStrokeCap[] = ["flat", "square", "round"];
export const DEFAULT_SKETCH_STROKE: SketchStroke = { width: 2, align: "center", join: "miter", cap: "flat" };
export const MIN_SKETCH_STROKE_WIDTH = 0.05;
export const MAX_SKETCH_STROKE_WIDTH = 500;

const CURVE_SAMPLES = 32;
const MITER_LIMIT = 4;

type Vec = { x: number; z: number };

export function normalizeSketchStroke(value: unknown): SketchStroke | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Partial<SketchStroke>;
  const width = Number(candidate.width);
  if (!Number.isFinite(width) || width <= 0) return undefined;
  return {
    width: Math.max(MIN_SKETCH_STROKE_WIDTH, Math.min(MAX_SKETCH_STROKE_WIDTH, width)),
    align: SKETCH_STROKE_ALIGNS.includes(candidate.align as SketchStrokeAlign) ? candidate.align as SketchStrokeAlign : DEFAULT_SKETCH_STROKE.align,
    join: SKETCH_STROKE_JOINS.includes(candidate.join as SketchStrokeJoin) ? candidate.join as SketchStrokeJoin : DEFAULT_SKETCH_STROKE.join,
    cap: SKETCH_STROKE_CAPS.includes(candidate.cap as SketchStrokeCap) ? candidate.cap as SketchStrokeCap : DEFAULT_SKETCH_STROKE.cap,
  };
}

/** A path as points, curves broken into short straight pieces; a closed path does not repeat its start. */
function sampledPath(path: OrderedCadSketchPath): Vec[] {
  const samples: Vec[] = [];
  path.steps.forEach(({ segment, from, to }, stepIndex) => {
    if (stepIndex === 0) samples.push({ x: from.x, z: from.z });
    const forward = segment.startId === from.id;
    const first = forward ? from.handleOut : from.handleIn;
    const second = forward ? to.handleIn : to.handleOut;
    if (segment.kind === "line" || !first || !second) {
      samples.push({ x: to.x, z: to.z });
      return;
    }
    for (let index = 1; index <= CURVE_SAMPLES; index += 1) {
      const t = index / CURVE_SAMPLES;
      const u = 1 - t;
      samples.push({
        x: u ** 3 * from.x + 3 * u ** 2 * t * first.x + 3 * u * t ** 2 * second.x + t ** 3 * to.x,
        z: u ** 3 * from.z + 3 * u ** 2 * t * first.z + 3 * u * t ** 2 * second.z + t ** 3 * to.z,
      });
    }
  });
  const cleaned = samples.filter((point, index) => index === 0 || Math.hypot(point.x - samples[index - 1].x, point.z - samples[index - 1].z) > 1e-9);
  if (path.closed && cleaned.length > 1) {
    const last = cleaned[cleaned.length - 1];
    if (Math.hypot(last.x - cleaned[0].x, last.z - cleaned[0].z) < 1e-9) cleaned.pop();
  }
  return cleaned;
}

const toPolygon = (points: Vec[]) => points.map((point) => [point.x, point.z] as [number, number]);

/**
 * Every CrossSection lives in Manifold's WebAssembly memory until it is deleted; the preview
 * builds the stroke again on every edit, so each one is kept here and freed at the end.
 */
export type Keep = <T extends CrossSection>(section: T) => T;

function circleAt(runtime: ManifoldToplevel, keep: Keep, center: Vec, radius: number) {
  return keep(keep(runtime.CrossSection.circle(radius, 48)).translate([center.x, center.z]));
}

/** Positive area (counter-clockwise in x/z) for a triangle or quad, so Manifold keeps it. */
function ccw(points: Vec[]) {
  const area = points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + point.x * next.z - next.x * point.z;
  }, 0);
  return area < 0 ? [...points].reverse() : points;
}

/** An open line of `width`, centred on it: one bar per piece, the corners and ends filled as chosen. */
function strokeOpenPath(runtime: ManifoldToplevel, keep: Keep, points: Vec[], stroke: SketchStroke): CrossSection | null {
  if (points.length < 2) return null;
  const half = stroke.width / 2;
  const pieces: CrossSection[] = [];
  const direction = (a: Vec, b: Vec) => {
    const length = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    return { x: (b.x - a.x) / length, z: (b.z - a.z) / length };
  };
  const ends = points.map((point) => ({ ...point }));
  if (stroke.cap === "square") {
    const startDirection = direction(ends[1], ends[0]);
    ends[0] = { x: ends[0].x + startDirection.x * half, z: ends[0].z + startDirection.z * half };
    const last = ends.length - 1;
    const endDirection = direction(ends[last - 1], ends[last]);
    ends[last] = { x: ends[last].x + endDirection.x * half, z: ends[last].z + endDirection.z * half };
  }
  for (let index = 0; index + 1 < ends.length; index += 1) {
    const a = ends[index];
    const b = ends[index + 1];
    const d = direction(a, b);
    const n = { x: -d.z * half, z: d.x * half };
    pieces.push(keep(new runtime.CrossSection([toPolygon(ccw([
      { x: a.x + n.x, z: a.z + n.z },
      { x: b.x + n.x, z: b.z + n.z },
      { x: b.x - n.x, z: b.z - n.z },
      { x: a.x - n.x, z: a.z - n.z },
    ]))])));
  }
  for (let index = 1; index + 1 < points.length; index += 1) {
    const corner = points[index];
    if (stroke.join === "round") {
      pieces.push(circleAt(runtime, keep, corner, half));
      continue;
    }
    const before = direction(points[index - 1], corner);
    const after = direction(corner, points[index + 1]);
    const turn = before.x * after.z - before.z * after.x;
    if (Math.abs(turn) < 1e-9) continue;
    // The gap opens on the outer side of the turn.
    const side = turn > 0 ? -1 : 1;
    const outerBefore = { x: corner.x - before.z * half * side, z: corner.z + before.x * half * side };
    const outerAfter = { x: corner.x - after.z * half * side, z: corner.z + after.x * half * side };
    const wedge = [corner, outerBefore, outerAfter];
    if (stroke.join === "miter") {
      const bisector = { x: outerBefore.x + outerAfter.x - 2 * corner.x, z: outerBefore.z + outerAfter.z - 2 * corner.z };
      const bisectorLength = Math.hypot(bisector.x, bisector.z);
      const cosHalf = bisectorLength / (2 * half);
      const miterLength = cosHalf > 1e-6 ? half / cosHalf : Number.POSITIVE_INFINITY;
      if (miterLength <= half * MITER_LIMIT && bisectorLength > 1e-9) {
        const tip = { x: corner.x + (bisector.x / bisectorLength) * miterLength, z: corner.z + (bisector.z / bisectorLength) * miterLength };
        wedge.splice(2, 0, tip);
      }
    }
    pieces.push(keep(new runtime.CrossSection([toPolygon(ccw(wedge))])));
  }
  if (stroke.cap === "round") {
    pieces.push(circleAt(runtime, keep, points[0], half), circleAt(runtime, keep, points[points.length - 1], half));
  }
  return keep(runtime.CrossSection.union(pieces));
}

/**
 * A filled region as the stroke asks: a frame of `width` inside, outside or centred on its
 * edge, or ("grow", #215) the region itself widened by `width` - a filled base layer under a
 * text or logo for a multicolour print. Text fills (textFill.ts) use this for their letters.
 */
export function strokeRegion(runtime: ManifoldToplevel, keep: Keep, region: CrossSection, stroke: SketchStroke): CrossSection {
  const joinType = stroke.join === "round" ? "Round" : stroke.join === "bevel" ? "Square" : "Miter";
  const grow = (delta: number) => (delta === 0 ? region : keep(region.offset(delta, joinType, MITER_LIMIT, 48)));
  if (stroke.align === "grow") return grow(stroke.width);
  const [outerDelta, innerDelta] = stroke.align === "inside"
    ? [0, -stroke.width]
    : stroke.align === "outside"
      ? [stroke.width, 0]
      : [stroke.width / 2, -stroke.width / 2];
  return keep(grow(outerDelta).subtract(grow(innerDelta)));
}

/** The closed outlines as a frame of `width`: inside, outside or centred on the drawn line, or widened. */
function strokeClosedPaths(runtime: ManifoldToplevel, keep: Keep, loops: Vec[][], stroke: SketchStroke): CrossSection | null {
  if (!loops.length) return null;
  const region = keep(new runtime.CrossSection(loops.map(toPolygon), "EvenOdd"));
  return strokeRegion(runtime, keep, region, stroke);
}

/**
 * The outline the stroked sketch fills, as a sketch of straight lines the usual extrusion builds.
 * Null when there is nothing to stroke (no stroke set, or the lines left no area).
 */
export function strokedSketchProfile(runtime: ManifoldToplevel, profile: SketchProfile): SketchProfile | null {
  const stroke = normalizeSketchStroke(profile.stroke);
  if (!stroke) return null;
  const paths = orderedCadSketchPaths(profile);
  const closed = paths.filter((path) => path.closed).map(sampledPath).filter((loop) => loop.length >= 3);
  const open = paths.filter((path) => !path.closed).map(sampledPath).filter((line) => line.length >= 2);
  const made: CrossSection[] = [];
  const keep: Keep = (section) => {
    made.push(section);
    return section;
  };
  let polygons: ReturnType<CrossSection["toPolygons"]>;
  try {
    const parts = [strokeClosedPaths(runtime, keep, closed, stroke), ...open.map((line) => strokeOpenPath(runtime, keep, line, stroke))]
      .filter((part): part is CrossSection => Boolean(part));
    if (!parts.length) return null;
    const result = keep(keep(runtime.CrossSection.union(parts)).simplify(1e-6));
    polygons = result.toPolygons();
    if (!polygons.length || result.area() <= 1e-9) return null;
  } finally {
    new Set(made).forEach((section) => section.delete());
  }
  const points: SketchProfile["points"] = [];
  const segments: SketchProfile["segments"] = [];
  polygons.forEach((polygon, loopIndex) => {
    const ids = polygon.map((_, index) => `stroke-${loopIndex}-${index}`);
    polygon.forEach(([x, z], index) => points.push({ id: ids[index], x, z }));
    ids.forEach((id, index) => segments.push({ id: `stroke-${loopIndex}-s${index}`, startId: id, endId: ids[(index + 1) % ids.length], kind: "line" }));
  });
  return { points, segments };
}
