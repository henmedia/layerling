import * as THREE from "three";
import { toCreasedNormals } from "@/lib/creasedNormals";
import type { CadModifierProfileLoop, CadModifierProfileSegment } from "@/lib/cadModifierTypes";
import type { FlatSpringEnds, FlatSpringPattern, SpringForm } from "@/types/layerling";

/*
 * The flat spring (#1076): a band that runs in waves across the plate and is
 * pushed up by the shape's height, like the printed serpentine springs that
 * flex in their own plane. Width is its length along x, depth how far the
 * waves reach across, height how thick it is printed.
 *
 * The band follows a centre line of straight pieces with rounded corners:
 * a lead-in from each end, then legs that run across and turn back. Its
 * outline is that line offset by half the band each way, so every edge is a
 * straight line or a circular arc - the exact body gets them as they are,
 * and the display mesh samples the arcs.
 */

export const DEFAULT_FLAT_SPRING_TURNS = 4;
export const DEFAULT_FLAT_SPRING_WIRE = 2;
export const DEFAULT_FLAT_SPRING_PATTERN: FlatSpringPattern = "round";
export const DEFAULT_FLAT_SPRING_ENDS: FlatSpringEnds = "eye";
/** What a coil becomes when it is switched to flat: a strip that lies on the plate. */
export const FLAT_SPRING_DIMENSIONS = { width: 60, depth: 16, height: 4 };

export const MIN_FLAT_SPRING_WIRE = 0.4;
export const MAX_FLAT_SPRING_TURNS = 60;

/** Neighbouring legs keep at least a quarter of their spacing free, so the spring can close up a little before it locks. */
const MAX_WIRE_PER_SPACING = 0.75;

type Point = { x: number; z: number };

export function normalizeSpringForm(value?: string): SpringForm {
  return value === "flat" ? "flat" : "coil";
}

export function normalizeFlatSpringPattern(value?: string): FlatSpringPattern {
  return value === "zigzag" || value === "square" ? value : DEFAULT_FLAT_SPRING_PATTERN;
}

export function normalizeFlatSpringEnds(value?: string): FlatSpringEnds {
  return value === "tab" || value === "none" ? value : DEFAULT_FLAT_SPRING_ENDS;
}

function finite(value: number | undefined, fallback: number) {
  return Number.isFinite(value) ? (value as number) : fallback;
}

/** The eye's outer radius: one and three quarter bands, as far as the depth allows. Its hole is the eye less one band. */
function eyeRadius(depth: number, wire: number) {
  return Math.min(depth / 2, wire * 1.75);
}

/** The tab's half length across: one and a half bands. */
function tabReach(depth: number, wire: number) {
  return Math.min(depth / 2, wire * 1.5);
}

type Layout = {
  points: Point[];
  /** Fillet radius at each point; the two ends have none. */
  radii: number[];
  /** How far each side line starts in from the ends (the eye takes the start of the band into its ring). */
  trim: number;
  spacing: number;
};

/**
 * The centre line for a band `wire` wide in a box `width` x `depth`, with
 * `turns` turns. Its ends sit where the eye's centre, the tab's inner face or
 * the cut end is, and it reaches across so that the band just touches the
 * box's long sides.
 */
function centreLine(width: number, depth: number, wire: number, turns: number, pattern: FlatSpringPattern, ends: FlatSpringEnds): Layout {
  const half = wire / 2;
  const reach = ends === "eye" ? 2 * eyeRadius(depth, wire) : ends === "tab" ? wire : 0;
  // From the end piece a straight lead of one band, then the outer leg's own half band.
  const meander = width / 2 - reach - wire - half;
  const anchor = width / 2 - (ends === "eye" ? eyeRadius(depth, wire) : reach);
  const spacing = (2 * meander) / turns;
  const across = depth / 2 - half;
  const points: Point[] = [{ x: -anchor, z: 0 }, { x: -meander, z: 0 }];
  const radii: number[] = [0, half];
  if (pattern === "zigzag") {
    /*
     * The fillet at a peak lies inside the corner, so the band's outer edge
     * stays below the peak. The peak goes up by that much again; how much
     * depends on the angle, which the peak's height sets - a few passes.
     */
    let peak = across;
    for (let pass = 0; pass < 40; pass += 1) {
      peak = across - half + (half / spacing) * Math.hypot(spacing, 2 * peak);
    }
    let side = 1;
    for (let index = 0; index < turns; index += 1) {
      points.push({ x: -meander + spacing / 2 + index * spacing, z: side * peak });
      radii.push(half);
      side = -side;
    }
  } else {
    // A round turn is a half circle across the leg spacing, as far as the half legs at the ends leave room for it.
    const turn = pattern === "round" ? Math.max(half, Math.min(spacing / 2, across - half)) : half;
    let side = 1;
    points.push({ x: -meander, z: across });
    radii.push(turn);
    for (let index = 1; index <= turns; index += 1) {
      const x = -meander + index * spacing;
      points.push({ x, z: side * across });
      radii.push(turn);
      if (index < turns) {
        side = -side;
        points.push({ x, z: side * across });
        radii.push(turn);
      }
    }
  }
  points.push({ x: meander, z: 0 }, { x: anchor, z: 0 });
  radii.push(half, 0);
  const eye = eyeRadius(depth, wire);
  const trim = ends === "eye" ? Math.sqrt(Math.max(0, eye * eye - half * half)) : 0;
  return { points, radii, trim, spacing };
}

type Corner = { at: Point; before: Point; after: Point; turn: number; tangent: number; radius: number };

function unit(from: Point, to: Point) {
  const length = Math.hypot(to.x - from.x, to.z - from.z) || 1;
  return { x: (to.x - from.x) / length, z: (to.z - from.z) / length, length };
}

/** Each inner point's turn (signed, left positive) and how far its fillet reaches along both legs. */
function corners(layout: Layout): Corner[] {
  const { points, radii } = layout;
  return points.map((at, index) => {
    if (index === 0 || index === points.length - 1) return { at, before: at, after: at, turn: 0, tangent: 0, radius: 0 };
    const before = unit(points[index - 1], at);
    const after = unit(at, points[index + 1]);
    const turn = Math.atan2(before.x * after.z - before.z * after.x, before.x * after.x + before.z * after.z);
    const tangent = Math.abs(turn) < 1e-9 ? 0 : radii[index] * Math.tan(Math.abs(turn) / 2);
    return { at, before, after, turn, tangent, radius: radii[index] };
  });
}

/** Whether the band fits: every leg holds the fillets at both its ends, and the legs stay apart. */
function layoutFits(layout: Layout, wire: number) {
  if (!(layout.spacing > 0) || wire > layout.spacing * MAX_WIRE_PER_SPACING) return false;
  const turns = corners(layout);
  for (let index = 0; index + 1 < layout.points.length; index += 1) {
    const length = unit(layout.points[index], layout.points[index + 1]).length;
    const start = index === 0 ? layout.trim : turns[index].tangent;
    const end = index + 1 === layout.points.length - 1 ? layout.trim : turns[index + 1].tangent;
    if (start + end > length + 1e-9) return false;
  }
  return true;
}

function fits(width: number, depth: number, wire: number, turns: number, pattern: FlatSpringPattern, ends: FlatSpringEnds) {
  if (wire > depth / 3) return false;
  return layoutFits(centreLine(width, depth, wire, turns, pattern, ends), wire);
}

export type FlatSpringShapeFields = {
  springTurns?: number;
  springWire?: number;
  springQuality?: number;
  springPattern?: FlatSpringPattern;
  springEnds?: FlatSpringEnds;
};

/** The band width that still fits with a single turn - more turns only make it narrower. */
export function flatSpringWireLimits(width: number, depth: number, pattern?: FlatSpringPattern, ends?: FlatSpringEnds) {
  const shape = normalizeFlatSpringPattern(pattern);
  const end = normalizeFlatSpringEnds(ends);
  let low = MIN_FLAT_SPRING_WIRE;
  let high = Math.max(low, depth / 3);
  if (fits(width, depth, high, 1, shape, end)) return { min: low, max: high };
  if (!fits(width, depth, low, 1, shape, end)) return { min: low, max: low };
  for (let pass = 0; pass < 40; pass += 1) {
    const middle = (low + high) / 2;
    if (fits(width, depth, middle, 1, shape, end)) low = middle;
    else high = middle;
  }
  return { min: MIN_FLAT_SPRING_WIRE, max: Math.floor(low * 100) / 100 };
}

export function normalizeFlatSpringWire(value: number | undefined, width: number, depth: number, pattern?: FlatSpringPattern, ends?: FlatSpringEnds) {
  const limits = flatSpringWireLimits(width, depth, pattern, ends);
  return Math.min(limits.max, Math.max(limits.min, finite(value, DEFAULT_FLAT_SPRING_WIRE)));
}

/** As many turns as the length holds at this band width. */
export function flatSpringTurnLimits(width: number, depth: number, wire?: number, pattern?: FlatSpringPattern, ends?: FlatSpringEnds) {
  const shape = normalizeFlatSpringPattern(pattern);
  const end = normalizeFlatSpringEnds(ends);
  const band = normalizeFlatSpringWire(wire, width, depth, shape, end);
  let max = MAX_FLAT_SPRING_TURNS;
  while (max > 1 && !fits(width, depth, band, max, shape, end)) max -= 1;
  return { min: 1, max };
}

export function normalizeFlatSpringTurns(value: number | undefined, width: number, depth: number, wire?: number, pattern?: FlatSpringPattern, ends?: FlatSpringEnds) {
  const limits = flatSpringTurnLimits(width, depth, wire, pattern, ends);
  return Math.min(limits.max, Math.max(limits.min, Math.round(finite(value, DEFAULT_FLAT_SPRING_TURNS))));
}

export function flatSpringSettings(shape: FlatSpringShapeFields, width: number, depth: number) {
  const pattern = normalizeFlatSpringPattern(shape.springPattern);
  const ends = normalizeFlatSpringEnds(shape.springEnds);
  const wire = normalizeFlatSpringWire(shape.springWire, width, depth, pattern, ends);
  return { pattern, ends, wire, turns: normalizeFlatSpringTurns(shape.springTurns, width, depth, wire, pattern, ends) };
}

type Arc = { cx: number; cz: number; r: number; start: number; end: number };
type SidePiece = { kind: "point"; at: Point } | { kind: "arc"; arc: Arc };

function arcPoint(arc: Arc, angle: number): Point {
  return { x: arc.cx + arc.r * Math.cos(angle), z: arc.cz + arc.r * Math.sin(angle) };
}

/**
 * One side of the band, `offset` to the left of the centre line (negative:
 * to the right), from start to end: its first point, each corner as an arc
 * (or as one point where the fillet's inner side shrinks to nothing), and its
 * last point.
 */
function bandSide(layout: Layout, offset: number): SidePiece[] {
  const { points, trim } = layout;
  const turns = corners(layout);
  const first = unit(points[0], points[1]);
  const last = unit(points[points.length - 2], points[points.length - 1]);
  const pieces: SidePiece[] = [
    { kind: "point", at: { x: points[0].x + first.x * trim - first.z * offset, z: points[0].z + first.z * trim + first.x * offset } },
  ];
  turns.slice(1, -1).forEach((corner) => {
    if (corner.tangent === 0) return;
    const { before } = corner;
    const into = { x: corner.at.x - before.x * corner.tangent, z: corner.at.z - before.z * corner.tangent };
    const left = { x: -before.z, z: before.x };
    const side = Math.sign(corner.turn);
    const centre = { x: into.x + left.x * corner.radius * side, z: into.z + left.z * corner.radius * side };
    const from = { x: into.x + left.x * offset - centre.x, z: into.z + left.z * offset - centre.z };
    const radius = Math.hypot(from.x, from.z);
    if (radius < 1e-7) {
      pieces.push({ kind: "point", at: centre });
      return;
    }
    const start = Math.atan2(from.z, from.x);
    pieces.push({ kind: "arc", arc: { cx: centre.x, cz: centre.z, r: radius, start, end: start + corner.turn } });
  });
  const end = points[points.length - 1];
  pieces.push({ kind: "point", at: { x: end.x - last.x * trim - last.z * offset, z: end.z - last.z * trim + last.x * offset } });
  return pieces;
}

class LoopBuilder {
  private segments: CadModifierProfileSegment[] = [];
  private current: Point;
  private readonly first: Point;

  constructor(start: Point) {
    this.first = start;
    this.current = start;
  }

  line(to: Point) {
    if (Math.hypot(to.x - this.current.x, to.z - this.current.z) < 1e-7) return;
    this.segments.push({ kind: "line", x: to.x, z: to.z });
    this.current = to;
  }

  arc(arc: Arc) {
    this.line(arcPoint(arc, arc.start));
    const end = arcPoint(arc, arc.end);
    this.segments.push({ kind: "arc", x: end.x, z: end.z, cx: arc.cx, cz: arc.cz, rx: arc.r, rz: arc.r, start: arc.start, end: arc.end });
    this.current = end;
  }

  piece(piece: SidePiece, reversed = false) {
    if (piece.kind === "point") this.line(piece.at);
    else this.arc(reversed ? { ...piece.arc, start: piece.arc.end, end: piece.arc.start } : piece.arc);
  }

  close(): CadModifierProfileLoop {
    this.line(this.first);
    return { ...this.first, segments: this.segments };
  }
}

/** A whole circle in two halves, for the eye's hole. */
function circleLoop(centre: Point, radius: number): CadModifierProfileLoop {
  const builder = new LoopBuilder({ x: centre.x + radius, z: centre.z });
  builder.arc({ cx: centre.x, cz: centre.z, r: radius, start: 0, end: Math.PI });
  builder.arc({ cx: centre.x, cz: centre.z, r: radius, start: Math.PI, end: 2 * Math.PI });
  return builder.close();
}

export type FlatSpringGeometryOptions = FlatSpringShapeFields & { width: number; depth: number; height: number };

/** The band's outline (and the eyes' holes) in the plate's x/z plane, centred on the origin. */
export function flatSpringProfileLoops(options: FlatSpringGeometryOptions): CadModifierProfileLoop[] {
  const width = Math.max(0.2, options.width);
  const depth = Math.max(0.2, options.depth);
  const settings = flatSpringSettings(options, width, depth);
  const { wire, turns, pattern, ends } = settings;
  const half = wire / 2;
  const layout = centreLine(width, depth, wire, turns, pattern, ends);
  const left = bandSide(layout, half);
  const right = bandSide(layout, -half);
  const start = layout.points[0];
  const end = layout.points[layout.points.length - 1];
  const builder = new LoopBuilder((left[0] as { at: Point }).at);
  left.slice(1).forEach((piece) => builder.piece(piece));
  const rightEnd = (right[right.length - 1] as { at: Point }).at;
  const rightStart = (right[0] as { at: Point }).at;
  const eye = eyeRadius(depth, wire);
  const reach = tabReach(depth, wire);
  // The end: round the eye, out along the tab, or straight across.
  if (ends === "eye") {
    const angle = Math.asin(Math.min(1, half / eye));
    builder.arc({ cx: end.x, cz: end.z, r: eye, start: Math.PI - angle, end: angle - Math.PI });
  } else if (ends === "tab") {
    [{ x: end.x, z: reach }, { x: width / 2, z: reach }, { x: width / 2, z: -reach }, { x: end.x, z: -reach }].forEach((point) => builder.line(point));
  }
  builder.line(rightEnd);
  right.slice(1, -1).reverse().forEach((piece) => builder.piece(piece, true));
  builder.line(rightStart);
  if (ends === "eye") {
    const angle = Math.asin(Math.min(1, half / eye));
    builder.arc({ cx: start.x, cz: start.z, r: eye, start: -angle, end: angle - 2 * Math.PI });
  } else if (ends === "tab") {
    [{ x: start.x, z: -reach }, { x: -width / 2, z: -reach }, { x: -width / 2, z: reach }, { x: start.x, z: reach }].forEach((point) => builder.line(point));
  }
  const loops = [builder.close()];
  if (ends === "eye") loops.push(circleLoop(start, eye - wire), circleLoop(end, eye - wire));
  return loops;
}

/** Points along a loop, each arc in steps of at most a `quality`-th of a full turn. */
function sampleLoop(loop: CadModifierProfileLoop, quality: number): THREE.Vector2[] {
  const points: THREE.Vector2[] = [new THREE.Vector2(loop.x, -loop.z)];
  loop.segments.forEach((segment) => {
    if (segment.kind === "arc") {
      const steps = Math.max(2, Math.ceil((Math.abs(segment.end - segment.start) / (2 * Math.PI)) * quality));
      for (let step = 1; step <= steps; step += 1) {
        const angle = segment.start + ((segment.end - segment.start) * step) / steps;
        points.push(new THREE.Vector2(segment.cx + segment.rx * Math.cos(angle), -(segment.cz + segment.rz * Math.sin(angle))));
      }
    } else {
      points.push(new THREE.Vector2(segment.x, -segment.z));
    }
  });
  // The loop ends where it began; THREE.Shape closes it by itself.
  points.pop();
  return points;
}

/** The display mesh: the outline pushed up from y = 0 to the height. */
export function createFlatSpringGeometry(options: FlatSpringGeometryOptions & { springQuality?: number }) {
  const [outer, ...holes] = flatSpringProfileLoops(options);
  const quality = Math.max(12, Math.min(96, finite(options.springQuality, 36)));
  const shape = new THREE.Shape(sampleLoop(outer, quality));
  holes.forEach((hole) => shape.holes.push(new THREE.Path(sampleLoop(hole, quality))));
  const extruded = new THREE.ExtrudeGeometry(shape, { depth: Math.max(0.01, options.height), bevelEnabled: false, curveSegments: 1, steps: 1 });
  // The shape is drawn in x/-z and pushed along +z: turned down, that push runs up +y.
  extruded.rotateX(-Math.PI / 2);
  const geometry = toCreasedNormals(extruded, THREE.MathUtils.degToRad(35));
  if (geometry !== extruded) extruded.dispose();
  geometry.computeBoundingBox();
  return geometry;
}
