import { sliceMeshAtHeights } from "@/lib/heightSlices";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * Slope along (Lejtés hosszában): the top of a box or a round roof runs down
 * from its full height at one end to a lower height at the other, straight or
 * along a curve. Every point of the body keeps its place across and along; its
 * height is scaled by how high the top is at that spot, so a round roof keeps
 * its half-ellipse section everywhere, only lower towards the far end.
 *
 * The top line is a quadratic Bezier from (0, H) at the kept end to (L, E) at
 * the far end. Its control point lies on the middle of the chord for a straight
 * slope; a positive curve moves it towards (L, H), so the top leaves the kept
 * end level and bulges up, a negative one towards (0, E), so it drops at once
 * and comes in level at the far end. A Bezier stays inside the box of its
 * points, so the top never rises above the body's height nor drops below the
 * far end: the body's box stays its box.
 */

export type SlopeSide = "back" | "front" | "left" | "right";

export const SLOPE_SIDES: SlopeSide[] = ["back", "front", "left", "right"];
/** Lowest a far end may go, in mm: the body stays a body. */
export const SLOPE_MIN_END = 0.2;

/*
 * Where the two make sense: bodies with a length to run along. A round roof and a wedge lie
 * along their depth (their section stands in the width), so they slope and narrow front or
 * back; the upright prisms take any side. A tube or ring only slopes - narrowed, its wall
 * would get thinner across than along.
 */
const SLOPE_KINDS = new Set<WorkplaneShape["kind"]>(["box", "roundRoof", "wedge", "roundedBox", "cylinder", "ellipse", "polygon", "tube", "ring"]);
const NARROW_KINDS = new Set<WorkplaneShape["kind"]>(["box", "roundRoof", "wedge", "roundedBox", "cylinder", "ellipse", "polygon"]);
/** Kinds lying along their depth: their section stands across the width. */
export const LYING_ALONG_KINDS = new Set<WorkplaneShape["kind"]>(["roundRoof", "wedge"]);

export function shapeSupportsSlope(shape: Pick<WorkplaneShape, "kind" | "radius" | "importedMesh" | "groupedShapes">) {
  if (!SLOPE_KINDS.has(shape.kind)) return false;
  if (shape.importedMesh || shape.groupedShapes?.length) return false;
  // A box with a rounded radius (older files only) is drawn round.
  if (shape.kind === "box" && (shape.radius ?? 0) > 0) return false;
  return true;
}

/** The sides a kind can slope towards: a round roof runs along its length (front to back) only. */
export function slopeSidesFor(kind: WorkplaneShape["kind"]): SlopeSide[] {
  return LYING_ALONG_KINDS.has(kind) ? ["back", "front"] : SLOPE_SIDES;
}

export function normalizeSlopeSide(kind: WorkplaneShape["kind"], side: unknown): SlopeSide {
  const sides = slopeSidesFor(kind);
  return sides.includes(side as SlopeSide) ? (side as SlopeSide) : sides[0];
}

/** -1 to 1. */
export function normalizeSlopeCurve(value: unknown) {
  const number = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return Math.min(1, Math.max(-1, number));
}

/** The far end's height in mm, between SLOPE_MIN_END and the body's height. */
export function slopeEndHeight(shape: Pick<WorkplaneShape, "height" | "slopeEnd">) {
  const height = shape.height;
  const end = typeof shape.slopeEnd === "number" && Number.isFinite(shape.slopeEnd) ? shape.slopeEnd : height;
  return Math.min(height, Math.max(Math.min(SLOPE_MIN_END, height), end));
}

export function shapeHasSlope(shape: WorkplaneShape) {
  if (!shapeSupportsSlope(shape)) return false;
  if (typeof shape.slopeEnd !== "number" || !Number.isFinite(shape.slopeEnd)) return false;
  return shape.height - slopeEndHeight(shape) > 1e-6;
}

/** Whether the slope runs along the width (left/right) instead of the depth. */
export function slopeAlongWidth(side: SlopeSide) {
  return side === "left" || side === "right";
}

export type SlopeCurve = {
  /** Length along the slope, mm. */
  length: number;
  /** Height at the kept end (the body's height) and at the far end, mm. */
  keep: number;
  end: number;
  /** The Bezier's control point, in (distance from the kept end, height). */
  control: { s: number; y: number };
};

export function slopeCurveForShape(shape: WorkplaneShape): SlopeCurve {
  const side = normalizeSlopeSide(shape.kind, shape.slopeSide);
  const length = slopeAlongWidth(side) ? (shape.width ?? shape.size) : (shape.depth ?? shape.size);
  const keep = shape.height;
  const end = slopeEndHeight(shape);
  const curve = normalizeSlopeCurve(shape.slopeCurve);
  const middle = { s: length / 2, y: (keep + end) / 2 };
  const corner = curve >= 0 ? { s: length, y: keep } : { s: 0, y: end };
  const share = Math.abs(curve);
  return { length, keep, end, control: { s: middle.s + (corner.s - middle.s) * share, y: middle.y + (corner.y - middle.y) * share } };
}

/** The top's height (mm) at `s` mm from the kept end. */
export function slopeTopAt(curve: SlopeCurve, s: number) {
  const length = Math.max(1e-9, curve.length);
  const target = Math.min(length, Math.max(0, s));
  // x(t) = 2(1-t)t cs + t^2 L, monotone for cs within [0, L]: solve (L - 2cs) t^2 + 2cs t - target = 0.
  const a = length - 2 * curve.control.s;
  const b = 2 * curve.control.s;
  let t: number;
  if (Math.abs(a) < 1e-9 * length) {
    t = b > 1e-12 ? target / b : target / length;
  } else {
    const disc = Math.max(0, b * b + 4 * a * target);
    t = (-b + Math.sqrt(disc)) / (2 * a);
    if (!(t >= -1e-9 && t <= 1 + 1e-9)) t = (-b - Math.sqrt(disc)) / (2 * a);
  }
  t = Math.min(1, Math.max(0, t));
  return (1 - t) * (1 - t) * curve.keep + 2 * (1 - t) * t * curve.control.y + t * t * curve.end;
}

/** The factor a point's height is scaled by: the top's height there over the body's height. */
export function slopeScaleAt(curve: SlopeCurve, s: number) {
  return slopeTopAt(curve, s) / Math.max(1e-9, curve.keep);
}

/**
 * Where a point of the body lies along the slope, in mm from the kept end, from its
 * local x or z and the body's extent (min/max) along that axis. Inside, z runs
 * towards the viewer: the back is the small z.
 */
export function slopeDistance(side: SlopeSide, x: number, z: number, min: { x: number; z: number }, max: { x: number; z: number }, length: number) {
  const fraction = (value: number, low: number, high: number) => (high - low > 1e-12 ? (value - low) / (high - low) : 0);
  switch (side) {
    case "back":
      return fraction(max.z - z + min.z, min.z, max.z) * length;
    case "front":
      return fraction(z, min.z, max.z) * length;
    case "left":
      return fraction(max.x - x + min.x, min.x, max.x) * length;
    case "right":
      return fraction(x, min.x, max.x) * length;
  }
}

/** Sections a curved slope is drawn with along its length: close enough that the top stays within a hundredth of a mm. */
export function slopeSectionCount(curve: SlopeCurve) {
  const drop = Math.abs(curve.keep - curve.end);
  const straight = Math.abs(curve.control.s - curve.length / 2) < 1e-9 && Math.abs(curve.control.y - (curve.keep + curve.end) / 2) < 1e-9;
  if (straight) return 1;
  return Math.min(96, Math.max(8, Math.ceil(Math.sqrt(drop / 0.01))));
}

/*
 * Narrow along (Szűkülés hosszában): seen from above, the two long sides of a box
 * or a round roof run in towards one end, evenly from both sides, so that end
 * stays in the middle. The half-width follows the same kind of Bezier as the
 * slope's top, from where the narrowing starts (a share of the length) to the
 * end: straight, bulging out (a rounded bow) or drawn in.
 */

/** Narrowest an end may get, in mm: drawn as a point, but the body keeps a face there. */
export const NARROW_MIN_END = 0.01;

export function shapeSupportsNarrow(shape: Pick<WorkplaneShape, "kind" | "radius" | "importedMesh" | "groupedShapes">) {
  return shapeSupportsSlope(shape) && NARROW_KINDS.has(shape.kind);
}

/** The width across the narrowing: the depth for a box narrowing to the left or right, else the width. */
export function narrowCrossWidth(shape: Pick<WorkplaneShape, "kind" | "width" | "depth" | "size" | "narrowSide">) {
  const side = normalizeSlopeSide(shape.kind, shape.narrowSide);
  return slopeAlongWidth(side) ? (shape.depth ?? shape.size) : (shape.width ?? shape.size);
}

/** The narrow end's width in mm, between NARROW_MIN_END and the full width. */
export function narrowEndWidth(shape: Pick<WorkplaneShape, "kind" | "width" | "depth" | "size" | "narrowSide" | "narrowEnd">) {
  const full = narrowCrossWidth(shape);
  const end = typeof shape.narrowEnd === "number" && Number.isFinite(shape.narrowEnd) ? shape.narrowEnd : full;
  return Math.min(full, Math.max(Math.min(NARROW_MIN_END, full), end));
}

/** 0 to 0.95: where along the length the narrowing begins. */
export function normalizeNarrowStart(value: unknown) {
  const number = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return Math.min(0.95, Math.max(0, number));
}

export function shapeHasNarrow(shape: WorkplaneShape) {
  if (!shapeSupportsNarrow(shape)) return false;
  if (typeof shape.narrowEnd !== "number" || !Number.isFinite(shape.narrowEnd)) return false;
  return narrowCrossWidth(shape) - narrowEndWidth(shape) > 1e-6;
}

/** Either deformation along the length. */
export function shapeHasAlongDeform(shape: WorkplaneShape) {
  return shapeHasSlope(shape) || shapeHasNarrow(shape);
}

export type NarrowCurve = SlopeCurve & {
  /** Where the narrowing starts, mm from the wide end; the Bezier runs from there to the end. */
  start: number;
  /** The whole length along the narrowing, mm. */
  total: number;
};

/** The half-width's Bezier, from (start, W/2) to (total, E/2). */
export function narrowCurveForShape(shape: WorkplaneShape): NarrowCurve {
  const side = normalizeSlopeSide(shape.kind, shape.narrowSide);
  const total = slopeAlongWidth(side) ? (shape.width ?? shape.size) : (shape.depth ?? shape.size);
  const start = total * normalizeNarrowStart(shape.narrowStart);
  const length = total - start;
  const keep = narrowCrossWidth(shape) / 2;
  const end = narrowEndWidth(shape) / 2;
  const curve = normalizeSlopeCurve(shape.narrowCurve);
  const middle = { s: length / 2, y: (keep + end) / 2 };
  const corner = curve >= 0 ? { s: length, y: keep } : { s: 0, y: end };
  const share = Math.abs(curve);
  return { length, keep, end, start, total, control: { s: middle.s + (corner.s - middle.s) * share, y: middle.y + (corner.y - middle.y) * share } };
}

/** Half the width (mm) at `s` mm from the wide end. */
export function narrowHalfWidthAt(curve: NarrowCurve, s: number) {
  return s <= curve.start ? curve.keep : slopeTopAt(curve, s - curve.start);
}

function curveIsStraight(curve: SlopeCurve) {
  return Math.abs(curve.control.s - curve.length / 2) < 1e-9 && Math.abs(curve.control.y - (curve.keep + curve.end) / 2) < 1e-9;
}

/**
 * Where along the length a body has to be cut into sections for the display, in mm from
 * the kept (wide) end: the narrowing's start exactly, and short steps where a line curves
 * (or, on a round roof, where its sides would fold inside long triangles).
 */
export function alongLevels(length: number, from: number, curve: SlopeCurve, roof: boolean) {
  const levels: number[] = [];
  if (from > 1e-9 && from < length - 1e-9) levels.push(from);
  const straight = curveIsStraight(curve);
  const drop = Math.abs(curve.keep - curve.end);
  const count = straight ? (roof ? 24 : 1) : Math.max(roof ? 24 : 8, Math.min(96, Math.ceil(Math.sqrt(drop / 0.01))));
  // Spaced by the Bezier's own parameter, so the steps crowd where the line turns fast; a straight line is spaced evenly.
  for (let k = 1; k < count; k += 1) {
    const t = k / count;
    levels.push(from + 2 * (1 - t) * t * curve.control.s + t * t * curve.length);
  }
  return levels;
}

type Vec3 = [number, number, number];
type Face = [number, number, number];

/** Cut a mesh at planes square to x (axis 0) or z (axis 2): the slicer cuts along y, so the axis is swapped in and out. */
function sliceAlongAxis(vertices: readonly Vec3[], faces: readonly Face[], axis: 0 | 2, levels: number[]) {
  if (!levels.length) return { vertices: vertices.slice() as Vec3[], faces: faces.slice() as Face[] };
  const swap = ([x, y, z]: readonly number[]): Vec3 => (axis === 2 ? [x, z, y] : [y, x, z]);
  const cut = sliceMeshAtHeights(vertices.map(swap), faces, levels);
  return { vertices: cut.vertices.map(swap), faces: cut.faces as Face[] };
}

/**
 * A body's mesh with its slope and its narrowing applied: cut first where a line
 * bends or curves along the length, then every corner's height above the bottom
 * scaled by the top's height at its place, and its distance from the middle across
 * by the width there. Both are worked out from where the corner stood before.
 */
export function slopeMesh(vertices: readonly Vec3[], faces: readonly Face[], shape: WorkplaneShape) {
  const slope = shapeHasSlope(shape);
  const narrow = shapeHasNarrow(shape);
  if (!vertices.length || (!slope && !narrow)) return { vertices: vertices.slice() as Vec3[], faces: faces.slice() as Face[] };
  const bounds = (list: readonly Vec3[]) => {
    const min = { x: Infinity, y: Infinity, z: Infinity };
    const max = { x: -Infinity, y: -Infinity, z: -Infinity };
    for (const [x, y, z] of list) {
      min.x = Math.min(min.x, x); min.y = Math.min(min.y, y); min.z = Math.min(min.z, z);
      max.x = Math.max(max.x, x); max.y = Math.max(max.y, y); max.z = Math.max(max.z, z);
    }
    return { min, max };
  };
  const { min, max } = bounds(vertices);
  // A lying body's sloped or narrowed sides are ruled surfaces between its end sections: short pieces keep the long triangles from folding.
  const roof = LYING_ALONG_KINDS.has(shape.kind);
  // A distance from the kept end (mm) as the mesh's own coordinate along that axis.
  const coordinate = (side: SlopeSide, s: number, length: number) => {
    const f = s / Math.max(1e-9, length);
    switch (side) {
      case "back": return max.z - f * (max.z - min.z);
      case "front": return min.z + f * (max.z - min.z);
      case "left": return max.x - f * (max.x - min.x);
      case "right": return min.x + f * (max.x - min.x);
    }
  };
  let mesh = { vertices: vertices.slice() as Vec3[], faces: faces.slice() as Face[] };
  const slopeSide = normalizeSlopeSide(shape.kind, shape.slopeSide);
  const narrowSide = normalizeSlopeSide(shape.kind, shape.narrowSide);
  const slopeCurve = slope ? slopeCurveForShape(shape) : null;
  const narrowCurve = narrow ? narrowCurveForShape(shape) : null;
  const cuts: Record<0 | 2, number[]> = { 0: [], 2: [] };
  if (slopeCurve) {
    const axis = slopeAlongWidth(slopeSide) ? 0 : 2;
    alongLevels(slopeCurve.length, 0, slopeCurve, roof).forEach((s) => cuts[axis].push(coordinate(slopeSide, s, slopeCurve.length)));
  }
  if (narrowCurve) {
    const axis = slopeAlongWidth(narrowSide) ? 0 : 2;
    alongLevels(narrowCurve.total, narrowCurve.start, narrowCurve, roof).forEach((s) => cuts[axis].push(coordinate(narrowSide, s, narrowCurve.total)));
  }
  for (const axis of [0, 2] as const) mesh = sliceAlongAxis(mesh.vertices, mesh.faces, axis, cuts[axis]);
  const centerX = (min.x + max.x) / 2;
  const centerZ = (min.z + max.z) / 2;
  const out = mesh.vertices.map(([x, y, z]): Vec3 => {
    let nx = x;
    let ny = y;
    let nz = z;
    if (slopeCurve) ny = min.y + (y - min.y) * slopeScaleAt(slopeCurve, slopeDistance(slopeSide, x, z, min, max, slopeCurve.length));
    if (narrowCurve) {
      const factor = narrowHalfWidthAt(narrowCurve, slopeDistance(narrowSide, x, z, min, max, narrowCurve.total)) / Math.max(1e-9, narrowCurve.keep);
      if (slopeAlongWidth(narrowSide)) nz = centerZ + (z - centerZ) * factor;
      else nx = centerX + (x - centerX) * factor;
    }
    return [nx, ny, nz];
  });
  return { vertices: out, faces: mesh.faces };
}

/** The same for a flat list of triangle corners; returns a flat list again. */
export function slopePositions(positions: ArrayLike<number>, shape: WorkplaneShape) {
  const vertices: Vec3[] = [];
  const faces: Face[] = [];
  for (let index = 0; index + 8 < positions.length; index += 9) {
    const base = vertices.length;
    vertices.push([positions[index], positions[index + 1], positions[index + 2]]);
    vertices.push([positions[index + 3], positions[index + 4], positions[index + 5]]);
    vertices.push([positions[index + 6], positions[index + 7], positions[index + 8]]);
    faces.push([base, base + 1, base + 2]);
  }
  const mesh = slopeMesh(vertices, faces, shape);
  const flat = new Float32Array(mesh.faces.length * 9);
  mesh.faces.forEach((face, faceIndex) => face.forEach((vertex, corner) => flat.set(mesh.vertices[vertex], faceIndex * 9 + corner * 3)));
  return flat;
}
