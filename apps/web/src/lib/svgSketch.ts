import * as THREE from "three";
import {
  analyzeTriangleSoup,
  parseSvgForImport,
  svgProfilePaths,
} from "@/lib/svgImport";
import type { SketchPoint, SketchProfile, SketchSegment, WorkplaneShape } from "@/types/layerling";

/*
 * An SVG as a sketch (#197): its outlines become sketch lines and Bézier curves, so the body is an
 * exact extrusion with a fill that can be changed afterwards - an area, a stroke outside or inside
 * its lines, a silhouette - and its points can be edited in sketch mode. Quadratic curves and arcs
 * become cubic curves; an arc is cut into quarters at most, which keeps it within a hair of the
 * true ellipse. Too many pieces, or a curve of a kind the loader does not draw, and the import
 * keeps the mesh.
 */
export const MAX_SVG_SKETCH_SEGMENTS = 2500;

type SvgPoint = { x: number; y: number };
type SvgPiece = { start: SvgPoint; c1?: SvgPoint; c2?: SvgPoint; end: SvgPoint };

/** An arc or ellipse as cubic curves of a quarter turn at most. */
export function ellipsePieces(curve: THREE.EllipseCurve): SvgPiece[] {
  // The sweep exactly as EllipseCurve.getPoint works it out.
  const twoPi = Math.PI * 2;
  let delta = curve.aEndAngle - curve.aStartAngle;
  const samePoints = Math.abs(delta) < Number.EPSILON;
  while (delta < 0) delta += twoPi;
  while (delta > twoPi) delta -= twoPi;
  if (delta < Number.EPSILON) delta = samePoints ? 0 : twoPi;
  if (curve.aClockwise && !samePoints) delta = delta === twoPi ? -twoPi : delta - twoPi;
  if (Math.abs(delta) < 1e-12) return [];
  const cos = Math.cos(curve.aRotation);
  const sin = Math.sin(curve.aRotation);
  const turn = (x: number, y: number) => ({ x: x * cos - y * sin, y: x * sin + y * cos });
  const at = (angle: number) => {
    const offset = turn(curve.xRadius * Math.cos(angle), curve.yRadius * Math.sin(angle));
    return { x: curve.aX + offset.x, y: curve.aY + offset.y };
  };
  const tangent = (angle: number) => turn(-curve.xRadius * Math.sin(angle), curve.yRadius * Math.cos(angle));
  const count = Math.max(1, Math.ceil(Math.abs(delta) / (Math.PI / 2) - 1e-9));
  const step = delta / count;
  const handle = (4 / 3) * Math.tan(step / 4);
  const pieces: SvgPiece[] = [];
  for (let index = 0; index < count; index += 1) {
    const from = curve.aStartAngle + step * index;
    const to = from + step;
    const start = at(from);
    const end = at(to);
    const startTangent = tangent(from);
    const endTangent = tangent(to);
    pieces.push({
      start,
      c1: { x: start.x + handle * startTangent.x, y: start.y + handle * startTangent.y },
      c2: { x: end.x - handle * endTangent.x, y: end.y - handle * endTangent.y },
      end,
    });
  }
  return pieces;
}

function curvePieces(curve: THREE.Curve<THREE.Vector2>): SvgPiece[] | null {
  const point = (vector: THREE.Vector2) => ({ x: vector.x, y: vector.y });
  if (curve instanceof THREE.LineCurve) return [{ start: point(curve.v1), end: point(curve.v2) }];
  if (curve instanceof THREE.CubicBezierCurve) {
    return [{ start: point(curve.v0), c1: point(curve.v1), c2: point(curve.v2), end: point(curve.v3) }];
  }
  if (curve instanceof THREE.QuadraticBezierCurve) {
    const { v0, v1, v2 } = curve;
    return [{
      start: point(v0),
      c1: { x: v0.x + (2 / 3) * (v1.x - v0.x), y: v0.y + (2 / 3) * (v1.y - v0.y) },
      c2: { x: v2.x + (2 / 3) * (v1.x - v2.x), y: v2.y + (2 / 3) * (v1.y - v2.y) },
      end: point(v2),
    }];
  }
  if (curve instanceof THREE.EllipseCurve) return ellipsePieces(curve);
  return null;
}

const distance = (a: SvgPoint, b: SvgPoint) => Math.hypot(a.x - b.x, a.y - b.y);

/** A piece cut in two at its middle. */
export function splitPiece(piece: SvgPiece): [SvgPiece, SvgPiece] {
  const mid = (a: SvgPoint, b: SvgPoint) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  if (!piece.c1 || !piece.c2) {
    const centre = mid(piece.start, piece.end);
    return [{ start: piece.start, end: centre }, { start: centre, end: piece.end }];
  }
  // de Casteljau at one half.
  const a = mid(piece.start, piece.c1);
  const b = mid(piece.c1, piece.c2);
  const c = mid(piece.c2, piece.end);
  const d = mid(a, b);
  const e = mid(b, c);
  const centre = mid(d, e);
  return [{ start: piece.start, c1: a, c2: d, end: centre }, { start: centre, c1: e, c2: c, end: piece.end }];
}

/** One closed ring of pieces from a sub-path, closed with a line where the drawing left it open; null when a curve cannot be read. */
function subPathRing(path: THREE.Path, tolerance: number): SvgPiece[] | null {
  const pieces: SvgPiece[] = [];
  for (const curve of path.curves) {
    const converted = curvePieces(curve as THREE.Curve<THREE.Vector2>);
    if (!converted) return null;
    for (const piece of converted) {
      const curved = Boolean(piece.c1 && piece.c2)
        && distance(piece.c1!, piece.start) + distance(piece.c2!, piece.end) > tolerance;
      if (distance(piece.start, piece.end) <= tolerance && !curved) continue;
      const previous = pieces[pieces.length - 1];
      if (previous && distance(piece.start, previous.end) > tolerance) pieces.push({ start: previous.end, end: piece.start });
      if (previous) piece.start = pieces[pieces.length - 1].end;
      pieces.push(piece);
    }
  }
  if (!pieces.length) return [];
  const first = pieces[0];
  const last = pieces[pieces.length - 1];
  // Inkscape ends an outline of arcs a hair short of its start: the hair closes onto the start.
  if (distance(last.end, first.start) <= tolerance * 1000) last.end = first.start;
  else pieces.push({ start: last.end, end: first.start });
  // A sketch outline needs three steps to count as closed: halve the longest piece until it has them.
  while (pieces.length < 3) {
    let longest = 0;
    pieces.forEach((piece, index) => {
      if (distance(piece.start, piece.end) > distance(pieces[longest].start, pieces[longest].end)) longest = index;
    });
    pieces.splice(longest, 1, ...splitPiece(pieces[longest]));
  }
  return pieces;
}

/**
 * Below this many degrees, two pieces of an outline meeting at a curve are taken as running smoothly
 * on (#996). A tracer such as VTracer joins its curves with kinks of up to 10 degrees where the
 * picture runs on smoothly, and puts its real corners well above that (17 degrees and more in the
 * file of #996). The kernel cannot chamfer or fillet along such a kink: too small for a corner, too
 * large for a smooth run, it fails every edge treatment along the whole outline.
 */
const SMOOTH_JOIN_DEGREES = 12;

/**
 * A ring with its near-smooth joins made smooth: where a curve meets another piece at a kink below
 * {@link SMOOTH_JOIN_DEGREES}, its handle turns onto the line through the join (the line's own
 * direction, or between both curves' handles), keeping its length. Straight lines and real corners
 * stay as drawn.
 */
function smoothedRing(ring: SvgPiece[]): SvgPiece[] {
  const limit = Math.cos((SMOOTH_JOIN_DEGREES * Math.PI) / 180);
  const unit = (from: SvgPoint, to: SvgPoint) => {
    const length = distance(from, to);
    return length > 0 ? { x: (to.x - from.x) / length, y: (to.y - from.y) / length, length } : null;
  };
  return ring.map((piece, index) => {
    const next = ring[(index + 1) % ring.length];
    const join = piece.end;
    // How the piece arrives at the join and how the next one leaves it; a curve's handle can turn, a line cannot.
    const arriving = piece.c2 ? unit(piece.c2, join) : unit(piece.start, join);
    const leaving = next.c1 ? unit(join, next.c1) : unit(join, next.end);
    if (!arriving || !leaving || (!piece.c2 && !next.c1)) return piece;
    const cos = arriving.x * leaving.x + arriving.y * leaving.y;
    if (cos < limit || cos > 1 - 1e-15) return piece;
    const along = !piece.c2 ? arriving : !next.c1 ? leaving : unit({ x: 0, y: 0 }, { x: arriving.x + leaving.x, y: arriving.y + leaving.y });
    if (!along) return piece;
    if (piece.c2) piece.c2 = { x: join.x - along.x * arriving.length, y: join.y - along.y * arriving.length };
    if (next.c1) next.c1 = { x: join.x + along.x * leaving.length, y: join.y + along.y * leaving.length };
    return piece;
  });
}

/**
 * The SVG's visible outlines as a sketch, read as the top view shows the plate: x across, the
 * drawing's y down the page running to the front (+z), centred on the middle of its outline - so a
 * letter reads right from above. Null when the drawing cannot become a sketch, so the import keeps
 * the mesh.
 */
export function sketchProfileFromSvg(source: string): SketchProfile | null {
  return sketchProfileFromSvgPaths(svgProfilePaths(parseSvgForImport(source).paths));
}

/** The sketch of some of a drawing's profile paths, as {@link sketchProfileFromSvg} reads them: one colour of it, say (#818). */
export function sketchProfileFromSvgPaths(profilePaths: readonly THREE.ShapePath[]): SketchProfile | null {
  let extent = 1;
  profilePaths.forEach((path) => path.subPaths.forEach((subPath) => subPath.curves.forEach((curve) => {
    const point = (curve as THREE.Curve<THREE.Vector2>).getPoint(0);
    extent = Math.max(extent, Math.abs(point.x), Math.abs(point.y));
  })));
  const tolerance = extent * 1e-9;
  const rings: SvgPiece[][] = [];
  let total = 0;
  for (const path of profilePaths) {
    for (const subPath of path.subPaths) {
      const ring = subPathRing(subPath, tolerance);
      if (ring === null) return null;
      if (ring.length < 3) continue;
      total += ring.length;
      if (total > MAX_SVG_SKETCH_SEGMENTS) return null;
      rings.push(smoothedRing(ring));
    }
  }
  if (!rings.length) return null;
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  rings.flat().forEach((piece) => [piece.start, piece.end].forEach(({ x, y }) => {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }));
  const centreX = (minX + maxX) / 2;
  const centreY = (minY + maxY) / 2;
  return sketchFromPieceRings(rings, ({ x, y }) => ({ x: x - centreX, z: y - centreY }));
}

/** A run of an outline: a straight line from start to end, or a cubic curve with its two handles. */
export type SketchPiece = SvgPiece;

/** Closed rings of pieces as sketch points and lines, each piece's handles kept apart as drawn, `place` putting a point into the sketch. */
export function sketchFromPieceRings(
  rings: readonly SketchPiece[][],
  place: (point: SvgPoint) => { x: number; z: number },
  prefix = "svg",
): SketchProfile {
  const points: SketchPoint[] = [];
  const segments: SketchSegment[] = [];
  rings.forEach((ring, ringIndex) => {
    const ids = ring.map((_, index) => `${prefix}-${ringIndex}-${index}`);
    const ringPoints: SketchPoint[] = ring.map((piece, index) => ({ id: ids[index], ...place(piece.start) }));
    ring.forEach((piece, index) => {
      const next = (index + 1) % ring.length;
      const curved = Boolean(piece.c1 && piece.c2);
      if (curved) {
        ringPoints[index].handleOut = place(piece.c1!);
        ringPoints[next].handleIn = place(piece.c2!);
      }
      segments.push({ id: `${prefix}-${ringIndex}-s${index}`, startId: ids[index], endId: ids[next], kind: curved ? "bezier" : "line" });
    });
    // Each handle moves on its own, as drawn: the outline stays the drawing's (an SVG's with its near-smooth joins made smooth).
    ringPoints.forEach((point) => {
      if (point.handleIn || point.handleOut) point.mode = "split";
    });
    points.push(...ringPoints);
  });
  return { points, segments };
}

/** Whether the sketch body came out as the mesh import would have: the same footprint and area. */
export function svgSketchMatchesMesh(sketch: WorkplaneShape, mesh: WorkplaneShape) {
  const sketchPositions = sketch.importedMesh?.positions;
  const meshPositions = mesh.importedMesh?.positions;
  if (!sketchPositions?.length || !meshPositions?.length) return false;
  const close = (a: number, b: number) => Math.abs(a - b) <= Math.max(0.05, Math.max(a, b) * 0.01);
  if (!close(sketch.width, mesh.width) || !close(sketch.depth, mesh.depth)) return false;
  const sketchArea = Math.abs(analyzeTriangleSoup(sketchPositions).volume) / Math.max(1e-9, sketch.height);
  const meshArea = Math.abs(analyzeTriangleSoup(meshPositions).volume) / Math.max(1e-9, mesh.height);
  return Math.abs(sketchArea - meshArea) <= Math.max(meshArea * 0.03, 0.01);
}
