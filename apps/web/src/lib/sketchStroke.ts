import type { CrossSection, ManifoldToplevel } from "manifold-3d";
import { orderedCadSketchPaths, silhouetteSketchProfile, type OrderedCadSketchPath } from "@/lib/sketchCadProfile";
import type { SketchProfile, SketchStroke, SketchStrokeAlign, SketchStrokeCap, SketchStrokeJoin } from "@/types/layerling";

/**
 * Stroke for sketches (#154): instead of filling its outlines, a sketch can be drawn as a line of
 * a given width. A closed outline becomes a frame - its wall inside, outside or centred on the
 * drawn line, as in similar tools (a 0.2 mm outside stroke round a dovetail hole is a print
 * tolerance). An open line becomes a stripe with chosen corners and ends. The sketch keeps the
 * drawn line; the stroked outline is worked out when the body is built.
 */

export const SKETCH_STROKE_ALIGNS: readonly SketchStrokeAlign[] = ["center", "inside", "outside", "grow", "shrink"];
export const SKETCH_STROKE_JOINS: readonly SketchStrokeJoin[] = ["miter", "round", "bevel"];
export const SKETCH_STROKE_CAPS: readonly SketchStrokeCap[] = ["flat", "square", "round"];
export const DEFAULT_SKETCH_STROKE: SketchStroke = { width: 2, align: "center", join: "miter", cap: "flat" };
export const MIN_SKETCH_STROKE_WIDTH = 0.05;
export const MAX_SKETCH_STROKE_WIDTH = 500;

/** The most pieces a curve is cut into, and the fewest; a short or flat curve needs few (#461). */
const CURVE_SAMPLES = 32;
const MIN_CURVE_SAMPLES = 4;
/** How far, in mm, the straight pieces may stray from the curve. */
const CURVE_TOLERANCE = 0.01;
const MITER_LIMIT = 4;

type Vec = { x: number; z: number };

export function normalizeSketchStroke(value: unknown): SketchStroke | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Partial<SketchStroke>;
  const width = Number(candidate.width);
  if (!Number.isFinite(width) || width <= 0) return undefined;
  const edge = Number(candidate.edge);
  return {
    width: Math.max(MIN_SKETCH_STROKE_WIDTH, Math.min(MAX_SKETCH_STROKE_WIDTH, width)),
    align: SKETCH_STROKE_ALIGNS.includes(candidate.align as SketchStrokeAlign) ? candidate.align as SketchStrokeAlign : DEFAULT_SKETCH_STROKE.align,
    join: SKETCH_STROKE_JOINS.includes(candidate.join as SketchStrokeJoin) ? candidate.join as SketchStrokeJoin : DEFAULT_SKETCH_STROKE.join,
    cap: SKETCH_STROKE_CAPS.includes(candidate.cap as SketchStrokeCap) ? candidate.cap as SketchStrokeCap : DEFAULT_SKETCH_STROKE.cap,
    ...(Number.isFinite(edge) && edge > 0 ? { edge: Math.min(MAX_SKETCH_STROKE_WIDTH, edge) } : {}),
  };
}

/** The narrowest cutting edge, in mm: less is no flat top the kernel can still chamfer down to. */
export const MIN_SKETCH_STROKE_EDGE = 0.1;

/**
 * How far the 45° chamfer of a cutting edge (#982) reaches in from each side of the wall's top, in mm, or 0 for a flat top:
 * half of what the line is wider than its edge, and never more than most of the height. Only a wall has an edge -
 * a line inside, outside or centred; a wider or narrower area does not.
 */
export function strokeEdgeChamfer(stroke: SketchStroke | undefined, height: number): number {
  if (!stroke?.edge || !(stroke.align === "outside" || stroke.align === "inside" || stroke.align === "center")) return 0;
  const edge = Math.max(MIN_SKETCH_STROKE_EDGE, stroke.edge);
  if (edge >= stroke.width) return 0;
  return Math.min((stroke.width - edge) / 2, height * 0.9);
}

/**
 * How many straight pieces a cubic curve is cut into so none strays more than CURVE_TOLERANCE: the
 * error of n pieces is at most (1/8) * |B''| / n^2, with |B''| at most 6 times the larger second
 * difference of the control points. A traced drawing has hundreds of short curves; cutting each
 * into 32 made tens of thousands of edges that the kernel could not build in time (#461).
 */
function curveSampleCount(a: Vec, b: Vec, c: Vec, d: Vec): number {
  const second = Math.max(Math.hypot(a.x - 2 * b.x + c.x, a.z - 2 * b.z + c.z), Math.hypot(b.x - 2 * c.x + d.x, b.z - 2 * c.z + d.z));
  const pieces = Math.ceil(Math.sqrt((0.75 * second) / CURVE_TOLERANCE));
  return Math.max(MIN_CURVE_SAMPLES, Math.min(CURVE_SAMPLES, pieces));
}

/** A path as points, curves broken into short straight pieces; a closed path does not repeat its start. */
export function sampledPath(path: OrderedCadSketchPath): Vec[] {
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
    const pieces = curveSampleCount(from, first, second, to);
    for (let index = 1; index <= pieces; index += 1) {
      const t = index / pieces;
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
 * edge, or ("grow", #215) the region itself widened by `width`, or ("shrink", #558) narrowed by it - a filled base layer under a
 * text or logo for a multicolour print. Text fills (textFill.ts) use this for their letters.
 */
export function strokeRegion(keep: Keep, region: CrossSection, stroke: SketchStroke): CrossSection {
  const joinType = stroke.join === "round" ? "Round" : stroke.join === "bevel" ? "Square" : "Miter";
  const grow = (delta: number) => (delta === 0 ? region : keep(region.offset(delta, joinType, MITER_LIMIT, 48)));
  if (stroke.align === "grow") return grow(stroke.width);
  if (stroke.align === "shrink") return grow(-stroke.width);
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
  return strokeRegion(keep, region, stroke);
}

/**
 * The outline the stroked sketch fills, as a sketch of straight lines the usual extrusion builds.
 * Null when there is nothing to stroke (no stroke set, or the lines left no area).
 */
export function strokedSketchProfile(runtime: ManifoldToplevel, profile: SketchProfile, options: { clipToRevolveSide?: boolean } = {}): SketchProfile | null {
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
    const stroked = keep(keep(runtime.CrossSection.union(parts)).simplify(1e-6));
    // A revolve turns what lies left of its axis (x <= 0); a wide line near the axis may reach across it.
    const result = options.clipToRevolveSide
      ? keep(stroked.intersect(keep(new runtime.CrossSection([[[-1e6, -1e6], [0, -1e6], [0, 1e6], [-1e6, 1e6]]]))))
      : stroked;
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

/**
 * A sketch with No holes and a "Wider" line (#215) whose wider parts close a pocket between
 * them: the polygon stroke of its outline with only the outer rings kept, so the pocket is filled
 * as for a text. Null when no pocket closes - the exact build of the line is the better one then -
 * or when the line leaves nothing. `profile` is the sketch with its own holes already left out.
 */
export function filledGrowPockets(runtime: ManifoldToplevel, profile: SketchProfile): SketchProfile | null {
  if (profile.stroke?.align !== "grow") return null;
  const stroked = strokedSketchProfile(runtime, profile);
  if (!stroked) return null;
  const filled = silhouetteSketchProfile(stroked);
  const closedRings = (sketch: SketchProfile) => orderedCadSketchPaths(sketch).filter((path) => path.closed).length;
  return closedRings(filled) < closedRings(stroked) ? filled : null;
}

/** How high one step of a stepped cutting edge is, in mm: half a usual print layer, so the printer draws it as a slope. */
const EDGE_STEP = 0.1;

/**
 * A wall with its cutting edge in fine steps, as a mesh (#982), where the kernel cannot chamfer the outline - a logo's sharp
 * points and pieces a hundredth of a millimetre long. Below the edge the wall is the stroke of the closed outlines; above it,
 * `chamfer` mm high, come steps of EDGE_STEP mm, each set in by one step on both sides, so the top is as narrow as the 45°
 * chamfer would leave it. A 0.2 mm print layer cannot tell the steps from the slope. The polygon offsets (Manifold) do not
 * fail where the kernel's chamfer does. Positions with y up, from 0 to `height`; null without a closed outline, for a stroke
 * that is no wall, or when a step leaves nothing.
 */
export function steppedEdgeWall(runtime: ManifoldToplevel, profile: SketchProfile, height: number, chamfer: number): { positions: Float32Array; indices: Uint32Array } | null {
  const stroke = normalizeSketchStroke(profile.stroke);
  if (!stroke || !(stroke.align === "outside" || stroke.align === "inside" || stroke.align === "center")) return null;
  if (!(chamfer > 0) || chamfer >= height) return null;
  const paths = orderedCadSketchPaths(profile);
  if (paths.some((path) => !path.closed)) return null;
  const loops = paths.map(sampledPath).filter((loop) => loop.length >= 3);
  if (!loops.length) return null;
  const made: Array<{ delete(): void }> = [];
  const keep = <T extends { delete(): void }>(item: T) => {
    made.push(item);
    return item;
  };
  try {
    const region = keep(new runtime.CrossSection(loops.map(toPolygon), "EvenOdd"));
    const joinType = stroke.join === "round" ? "Round" : stroke.join === "bevel" ? "Square" : "Miter";
    const grow = (delta: number) => (Math.abs(delta) < 1e-9 ? region : keep(region.offset(delta, joinType, MITER_LIMIT, 48)));
    const [outer, inner] = stroke.align === "inside" ? [0, -stroke.width] : stroke.align === "outside" ? [stroke.width, 0] : [stroke.width / 2, -stroke.width / 2];
    const ring = (inset: number) => keep(grow(outer - inset).subtract(grow(inner + inset)));
    const steps = Math.max(2, Math.min(12, Math.round(chamfer / EDGE_STEP)));
    const rise = chamfer / steps;
    const pieces = [keep(ring(0).extrude(height - chamfer))];
    for (let step = 1; step <= steps; step += 1) {
      const section = ring((chamfer * step) / steps);
      if (section.area() <= 1e-9) return null;
      pieces.push(keep(keep(section.extrude(rise)).translate([0, 0, height - chamfer + rise * (step - 1)])));
    }
    const mesh = keep(runtime.Manifold.union(pieces)).getMesh();
    const count = mesh.vertProperties.length / mesh.numProp;
    const positions = new Float32Array(count * 3);
    // The section lies in x and the sketch's z, the extrusion runs along z: y up is (x, extrusion, sketch z).
    for (let vertex = 0; vertex < count; vertex += 1) {
      positions[vertex * 3] = mesh.vertProperties[vertex * mesh.numProp];
      positions[vertex * 3 + 1] = mesh.vertProperties[vertex * mesh.numProp + 2];
      positions[vertex * 3 + 2] = mesh.vertProperties[vertex * mesh.numProp + 1];
    }
    // Swapping two axes mirrors the mesh, so each triangle turns the other way round to keep facing out.
    const indices = new Uint32Array(mesh.triVerts.length);
    for (let index = 0; index < mesh.triVerts.length; index += 3) {
      indices[index] = mesh.triVerts[index];
      indices[index + 1] = mesh.triVerts[index + 2];
      indices[index + 2] = mesh.triVerts[index + 1];
    }
    return indices.length ? { positions, indices } : null;
  } finally {
    new Set(made).forEach((item) => item.delete());
  }
}
