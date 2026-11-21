/**
 * Hole pattern (#223): where the holes of a perforated face go. Pure numbers in
 * the 2D frame of the face - `u` along the frame's x axis, `v` along its z
 * axis - so the editor and the tests share one calculation.
 */
import type { ManifoldToplevel } from "manifold-3d";
import { loadedManifoldRuntime, requestManifoldRuntime } from "@/lib/manifoldHandle";

export type Point2 = { u: number; v: number };

/** custom repeats a shape from the scene over the face (#1235): a rivet, a tread, any body or hole. */
export type HoleForm = "round" | "square" | "rectangle" | "hexagon" | "slot" | "custom";
/** Grid and staggered fill the face; perimeter puts the holes in a ring along its outer edge (#1232). */
/** `corners`: mounting holes, one in each corner of the face's outline (see cornerCenters). */
export type HoleArrangement = "grid" | "staggered" | "perimeter" | "corners";
/** A round hole can take a screw's head (#1232): a counterbore for a cap screw, a countersink for a countersunk one. */
export type HoleType = "plain" | "counterbore" | "countersink";
/** Around the edge the holes follow the spacing or come to a set number. */
export type HolePerimeterBy = "spacing" | "count";

export type HolePatternSettings = {
  form: HoleForm;
  /** Round: diameter. Square: side. Rectangle and slot: width (along the frame's x). Hexagon: diameter across the corners. */
  size: number;
  /** Rectangle and slot: height (along the frame's z). The other forms follow `size`. */
  height: number;
  /**
   * Rectangle and slot: how far every hole is turned in the face, in degrees, counter-clockwise as seen looking at the
   * face; 0 lays its width along the frame's x. Both look the same half a turn on, so -90 to 90 covers every direction.
   */
  holeAngle?: number;
  /**
   * Flat faces only: how far every hole slopes through the wall, in degrees, about the face's x axis (level on a
   * standing face). Positive puts the inner end higher on a standing face, so rain runs back out. The hole keeps its
   * size square to its own axis, so it shows longer on the face. Not for holes with a head or an own shape.
   */
  holeTilt?: number;
  /** Centre to centre of neighbouring holes; for a rectangle or slot, of the holes along a row. */
  spacing: number;
  /**
   * Rectangle and slot: centre to centre of the rows (#975), so a narrow, tall hole can sit close to its neighbours in
   * the row while the rows keep clear of each other. The other forms space their rows by `spacing`.
   */
  rowSpacing?: number;
  arrangement: HoleArrangement;
  /** Clear distance between a hole and the edge of the face (and any opening in it). */
  margin: number;
  /** Round holes only: a plain hole, or one with a counterbore or countersink of `headSize` for the screw's head. */
  holeType?: HoleType;
  /** Diameter of the counterbore or countersink at the face; `size` is then the shaft. */
  headSize?: number;
  /** How deep the counterbore reaches into the face (a countersink's depth follows from its angle). */
  headDepth?: number;
  /** The countersink's angle: 90 degrees unless an inch screw size set 82 (Discussion #1534). */
  headAngle?: number;
  /** Perimeter only: whether the holes keep to `spacing` or come to `perimeterCount`. */
  perimeterBy?: HolePerimeterBy;
  /** Perimeter only: how many holes go round the edge. */
  perimeterCount?: number;
  /** Perimeter only: a hole on every corner of the edge, each side shared out evenly between them. */
  perimeterCorners?: boolean;
  /** Perimeter only, without corner holes: how far along the edge the first hole sits, in mm. */
  /** Mounting holes (`corners`): the margin counts to the holes' middles instead of their edges. */
  cornerToCenter?: boolean;
  /**
   * Mounting holes: how many in all, four in the corners and the rest shared out along the sides, the same number on
   * opposite sides and as evenly spaced as the sides allow - a watertight lid wants more than four screws. Even, 4 up.
   */
  cornerCount?: number;
  /**
   * Mounting holes for a 19" rack (EIA-310, IEC 60297-3-100): four slots of the standard size in the corners, 465.1 mm
   * apart across the panel and one rail spacing apart up it, so the panel screws onto the rack's rails. The size, the
   * hole type and the distance from the sides do not apply then.
   */
  rack?: boolean;
  /** 19" rack: a standard panel height from 1U to 6U, its holes as the standard has them; 0 or unset fits the panel. */
  rackUnits?: number;
  /**
   * When the edge cuts the holes (`holePatternCutsAtEdge`): a solid frame this wide (mm) along the face's edge and its
   * openings; the holes are cut off where it starts. 0 or unset: no frame, the holes run right to the edge.
   */
  edgeBorder?: number;
  /**
   * A pattern in a flat face (Discussion #1771): the top `topLayerThickness` mm of the body under the face becomes a
   * body of its own in `topLayerColor`, and the holes go through that layer only: a net in a second colour, its holes
   * filled up to the face by the body's own colour, so the face is flat. `depth` does not apply then.
   */
  topLayer?: boolean;
  topLayerThickness?: number;
  topLayerColor?: string;
  perimeterStart?: number;
  /** Own shape (#1235): the id of the shape from the scene that is repeated. */
  customId?: string;
  /** Own shape: its width and depth, the room it takes on the face, and whether it is round seen from above. */
  customWidth?: number;
  customDepth?: number;
  customRound?: boolean;
  /** Depth of the holes in mm; null cuts through the whole body. */
  depth: number | null;
  /** Set after the user was warned and chose to go on: the pattern may then hold up to `HOLE_PATTERN_MANY_HOLES` holes (#941). */
  allowMany?: boolean;
};

export const HOLE_PATTERN_MAX_HOLES = 400;
/** The limit once the warning was accepted: the cuts are made one by one, so it still ends somewhere. */
export const HOLE_PATTERN_MANY_HOLES = 3000;
export const HOLE_PATTERN_MIN_SIZE = 0.5;
export const HOLE_PATTERN_MAX_SIZE = 200;
export const HOLE_PATTERN_MAX_SPACING = 400;
export const HOLE_PATTERN_MAX_MARGIN = 100;
/** The top layer in a second colour: its thickness by default, the thinnest it can be, and its colour by default. */
export const HOLE_PATTERN_TOP_LAYER_DEFAULT = 1;
export const HOLE_PATTERN_TOP_LAYER_MIN = 0.2;
export const HOLE_PATTERN_TOP_LAYER_COLOR = "#ffffff";
/** The widest frame along the edge when the edge cuts the holes. */
export const HOLE_PATTERN_MAX_EDGE_BORDER = 20;
export const HOLE_PATTERN_MIN_PERIMETER_COUNT = 2;
export const HOLE_PATTERN_MAX_PERIMETER_COUNT = 200;
export const HOLE_PATTERN_MAX_PERIMETER_START = 2000;
/** A rectangle or slot turned beyond a quarter turn either way looks like one turned the other way. */
export const HOLE_PATTERN_MAX_HOLE_ANGLE = 90;
/** The steepest slope through the wall: there a hole is twice as long on the face as it is wide. */
export const HOLE_PATTERN_MAX_HOLE_TILT = 60;
/** The turn at which a bend of the edge counts as a corner that gets its own hole; a circle's facets turn far less. */
const PERIMETER_CORNER_TURN = (25 * Math.PI) / 180;
/** How much wider than the shaft a screw's head is at least. */
const HEAD_OVER_SHAFT = 0.5;

export const DEFAULT_HOLE_PATTERN: HolePatternSettings = {
  form: "hexagon",
  size: 6,
  height: 6,
  spacing: 9,
  arrangement: "staggered",
  margin: 4,
  depth: null,
};

/** Whether the holes have a head: round ones with a counterbore or countersink. */
export function holeHasHead(settings: Pick<HolePatternSettings, "form"> & Partial<Pick<HolePatternSettings, "holeType">>) {
  return settings.form === "round" && (settings.holeType === "counterbore" || settings.holeType === "countersink");
}

/** The head of a counterbore or countersink at the face: twice the shaft unless set, always a little wider than it. */
export function holeHeadSize(settings: Pick<HolePatternSettings, "size"> & Partial<Pick<HolePatternSettings, "headSize">>) {
  const shaft = Math.max(HOLE_PATTERN_MIN_SIZE, settings.size);
  const head = typeof settings.headSize === "number" && Number.isFinite(settings.headSize) ? settings.headSize : shaft * 2;
  return Math.min(HOLE_PATTERN_MAX_SIZE, Math.max(shaft + HEAD_OVER_SHAFT, head));
}

/** How deep a counterbore is: the shaft's diameter unless set (a cap screw's head is about as high as it is thick). */
/** A countersink's angle as the settings have it: 90 degrees unless set (Discussion #1534). */
export const DEFAULT_HOLE_HEAD_ANGLE = 90;
export function holeHeadAngle(settings: Partial<Pick<HolePatternSettings, "headAngle">>) {
  const angle = settings.headAngle;
  return typeof angle === "number" && Number.isFinite(angle) ? Math.min(120, Math.max(60, angle)) : DEFAULT_HOLE_HEAD_ANGLE;
}

export function holeHeadDepth(settings: Pick<HolePatternSettings, "size"> & Partial<Pick<HolePatternSettings, "headDepth">>) {
  const depth = typeof settings.headDepth === "number" && Number.isFinite(settings.headDepth) ? settings.headDepth : Math.max(HOLE_PATTERN_MIN_SIZE, settings.size);
  return Math.min(HOLE_PATTERN_MAX_SIZE, Math.max(0.2, depth));
}

/** Any angle in degrees as the same hole direction, from just over -90 up to 90 (-90 is 90): a rectangle or slot repeats every half turn. */
export function normalizeHoleAngle(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  const half = HOLE_PATTERN_MAX_HOLE_ANGLE * 2;
  let angle = ((value % half) + half) % half;
  if (angle > HOLE_PATTERN_MAX_HOLE_ANGLE + 1e-9) angle -= half;
  // Rounded off so float noise does not count as a turn; -0 comes out as 0.
  angle = Math.round(angle * 1e6) / 1e6;
  return angle === 0 ? 0 : angle;
}

/**
 * The turn of every hole in the face's frame, in radians from `u` towards `v`: a rectangle's or slot's angle, else none. The frame
 * runs `u` to `v` clockwise as seen looking at the face (x cross z points into it), so a counter-clockwise angle is a
 * negative turn here.
 */
export function holeTurn(settings: Pick<HolePatternSettings, "form"> & Partial<Pick<HolePatternSettings, "holeAngle">>) {
  if (!holePatternHasRowSpacing(settings.form)) return 0;
  const angle = normalizeHoleAngle(settings.holeAngle);
  return angle === 0 ? 0 : -(angle * Math.PI) / 180;
}

/** A slope through the wall as the tool keeps it: -60 to 60 degrees, float noise rounded off, -0 as 0. */
export function normalizeHoleTilt(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  const tilt = Math.round(Math.min(HOLE_PATTERN_MAX_HOLE_TILT, Math.max(-HOLE_PATTERN_MAX_HOLE_TILT, value)) * 1e6) / 1e6;
  return tilt === 0 ? 0 : tilt;
}

/** Whether the holes can slope through the wall: not with a screw's head (screws go in straight) or an own shape. */
export function holeTiltApplies(settings: Pick<HolePatternSettings, "form"> & Partial<Pick<HolePatternSettings, "holeType" | "arrangement">>) {
  // Mounting holes go in straight, for the screws.
  return settings.form !== "custom" && !holeHasHead(settings) && settings.arrangement !== "corners";
}

/** The slope of every hole through the wall in radians, or 0 where it does not apply. */
export function holeTiltRadians(settings: Pick<HolePatternSettings, "form"> & Partial<Pick<HolePatternSettings, "holeType" | "holeTilt" | "arrangement">>) {
  if (!holeTiltApplies(settings)) return 0;
  const tilt = normalizeHoleTilt(settings.holeTilt);
  return tilt === 0 ? 0 : (tilt * Math.PI) / 180;
}

/** The settings with the holes straight through the wall: where sloping does not apply yet (round walls). */
export function withoutHoleTilt<T extends Partial<Pick<HolePatternSettings, "holeTilt">>>(settings: T): T {
  if (settings.holeTilt === undefined) return settings;
  const { holeTilt: _tilt, ...rest } = settings;
  return rest as T;
}

/** Across-flats width of a hexagon whose corners point along v, as a share of the corner-to-corner size. */
export const HEXAGON_FLAT_RATIO = Math.sqrt(3) / 2;

/** Rows of a staggered pattern sit this far apart relative to the spacing, so every neighbour is one spacing away. */
const STAGGER_ROW_RATIO = Math.sqrt(3) / 2;

/** Whether the form has its own spacing for the rows (#975): the two forms whose width and height differ. */
export function holePatternHasRowSpacing(form: HoleForm) {
  return form === "rectangle" || form === "slot";
}

/** Centre to centre of the rows: the row spacing of a rectangle or slot, else what the spacing makes of it. */
export function holePatternRowSpacing(settings: Pick<HolePatternSettings, "form" | "arrangement" | "spacing" | "rowSpacing">) {
  if (holePatternHasRowSpacing(settings.form) && settings.rowSpacing !== undefined) return Math.max(HOLE_PATTERN_MIN_SIZE, settings.rowSpacing);
  const spacing = Math.max(HOLE_PATTERN_MIN_SIZE, settings.spacing);
  return settings.arrangement === "staggered" ? spacing * STAGGER_ROW_RATIO : spacing;
}

/** The most lattice points tried at once; a face with more is far beyond the hole limit anyway. */
const MAX_CANDIDATES = 60000;
const EPSILON = 1e-7;

type FootprintSettings = Pick<HolePatternSettings, "form" | "size" | "height">
  & Partial<Pick<HolePatternSettings, "holeAngle" | "holeTilt" | "holeType" | "headSize" | "customWidth" | "customDepth" | "customRound">>;

/** The room a hole takes on the face: a hole with a head takes its head's, an own shape its width and depth. */
export function holeFootprintSize(settings: FootprintSettings): { width: number; height: number } {
  if (settings.form === "custom") {
    const side = (value: number | undefined) => Math.max(HOLE_PATTERN_MIN_SIZE, typeof value === "number" && Number.isFinite(value) ? value : DEFAULT_HOLE_PATTERN.size);
    return { width: side(settings.customWidth), height: side(settings.customDepth) };
  }
  if (holeHasHead(settings)) {
    const head = holeHeadSize(settings);
    return { width: head, height: head };
  }
  const size = Math.max(HOLE_PATTERN_MIN_SIZE, settings.size);
  switch (settings.form) {
    case "round":
    case "square":
      return { width: size, height: size };
    case "hexagon":
      return { width: size * HEXAGON_FLAT_RATIO, height: size };
    default:
      return { width: size, height: Math.max(HOLE_PATTERN_MIN_SIZE, settings.height) };
  }
}

/**
 * The outline of one hole square to its own axis, as a convex polygon, turned as the hole is turned in the face: `u`
 * along the face's x, `v` square to both that and the hole's axis. For a straight hole that is its outline on the face.
 */
export function holeCrossSection(settings: FootprintSettings): Point2[] {
  // Sloping holes meet their neighbours at any direction, not only at the polygon's corners: fit them with a polygon
  // that holds the whole round outline, so the cut (a much finer polygon) keeps the wall too.
  const outline = unturnedFootprintPolygon(settings, holeTiltRadians(settings) !== 0);
  const turn = holeTurn(settings);
  if (turn === 0) return outline;
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  return outline.map((point) => ({ u: point.u * cos - point.v * sin, v: point.u * sin + point.v * cos }));
}

/**
 * How much shorter a hole's room is square to its axis than on the face, along `v`: cos of the slope. Distances along
 * `v` on the face times this are the distances between the (parallel) holes themselves.
 */
function tiltSquash(settings: Parameters<typeof holeTiltRadians>[0]) {
  return Math.cos(holeTiltRadians(settings));
}

/**
 * The outline of one hole where it meets the face, as a convex polygon: its cross-section, turned in the face, and for
 * a hole sloping through the wall stretched along `v` by 1 / cos of the slope.
 */
export function holeFootprintPolygon(settings: FootprintSettings): Point2[] {
  const section = holeCrossSection(settings);
  const squash = tiltSquash(settings);
  return squash === 1 ? section : section.map((point) => ({ u: point.u, v: point.v / squash }));
}

/**
 * Where a hole sloping through the wall comes out at the back of a wall `wall` thick (measured along the face's
 * normal), relative to where it goes in, in the face's frame: up the face for a positive slope, which is `-v`.
 */
export function holeExitShift(settings: Parameters<typeof holeTiltRadians>[0], wall: number): Point2 {
  const tilt = holeTiltRadians(settings);
  return { u: 0, v: tilt === 0 ? 0 : -Math.max(0, wall) * Math.tan(tilt) };
}

/** The convex hull of some points (monotone chain), counter-clockwise. */
function convexHull(points: readonly Point2[]): Point2[] {
  const sorted = [...points].sort((a, b) => a.u - b.u || a.v - b.v);
  if (sorted.length < 3) return sorted;
  const cross = (o: Point2, a: Point2, b: Point2) => (a.u - o.u) * (b.v - o.v) - (a.v - o.v) * (b.u - o.u);
  const lower: Point2[] = [];
  for (const point of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) lower.pop();
    lower.push(point);
  }
  const upper: Point2[] = [];
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    const point = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) upper.pop();
    upper.push(point);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/**
 * The room a hole takes on the face when it is fitted: its outline on the face and, for a hole sloping through a wall
 * `wall` thick, the same outline where it comes out at the back, and all between (Discussion 942: the margin counts the
 * shift of wall thickness times tan of the slope). A straight hole takes its outline.
 */
export function holeFitPolygon(settings: FootprintSettings, wall = 0): Point2[] {
  const footprint = holeFootprintPolygon(settings);
  const shift = holeExitShift(settings, wall);
  if (shift.v === 0) return footprint;
  return convexHull([...footprint, ...footprint.map((point) => ({ u: point.u + shift.u, v: point.v + shift.v }))]);
}

/** The outline of one hole with its width along `u` and its height along `v`. */
function unturnedFootprintPolygon(settings: FootprintSettings, enclose = false): Point2[] {
  const { width, height } = holeFootprintSize(settings);
  const halfW = width / 2;
  const halfH = height / 2;
  // A polygon with its corners on a circle cuts inside it by up to 1 - cos(half a step); `enclose` puts it all outside.
  const out = (steps: number) => (enclose ? 1 / Math.cos(Math.PI / steps) : 1);
  switch (settings.form === "custom" ? (settings.customRound ? "round" : "square") : settings.form) {
    case "round": {
      const count = 24;
      return Array.from({ length: count }, (_, index) => {
        const angle = (index / count) * Math.PI * 2;
        return { u: Math.cos(angle) * halfW * out(count), v: Math.sin(angle) * halfH * out(count) };
      });
    }
    case "hexagon":
      // Corners along v, flats facing u: the polygon shape's own orientation.
      return Array.from({ length: 6 }, (_, index) => {
        const angle = (index / 6) * Math.PI * 2;
        return { u: Math.sin(angle) * halfH, v: Math.cos(angle) * halfH };
      });
    case "slot": {
      // A capsule: straight sides and a half circle on each short end.
      const radius = Math.min(halfW, halfH);
      const along = width >= height ? "u" : "v";
      const reach = (along === "u" ? halfW : halfH) - radius;
      const points: Point2[] = [];
      const steps = 8;
      for (let end = 0; end < 2; end += 1) {
        const sign = end === 0 ? 1 : -1;
        for (let step = 0; step <= steps; step += 1) {
          const angle = -Math.PI / 2 + (step / steps) * Math.PI;
          const bulge = { a: Math.cos(angle) * radius * out(steps * 2), b: Math.sin(angle) * radius * out(steps * 2) };
          const point = along === "u"
            ? { u: sign * (reach + bulge.a), v: sign * bulge.b }
            : { u: -sign * bulge.b, v: sign * (reach + bulge.a) };
          points.push(point);
        }
      }
      return points;
    }
    default:
      return [
        { u: -halfW, v: -halfH },
        { u: halfW, v: -halfH },
        { u: halfW, v: halfH },
        { u: -halfW, v: halfH },
      ];
  }
}

export type FaceOutline = {
  /** Closed loops of the face: its outer edge and the edges of any openings, in the face's 2D frame. */
  loops: Point2[][];
};

export type FaceFrame = {
  origin: { x: number; y: number; z: number };
  xAxis: { x: number; y: number; z: number };
  zAxis: { x: number; y: number; z: number };
};

/**
 * The edge loops of a flat face. `positions` holds world triangles (nine
 * numbers each) and `triangles` the indices of those that make up the face
 * (see planarFaceTriangles). An edge that only one of them uses is a boundary
 * edge; those are chained into loops and measured in the face's frame.
 */
export function faceOutlineFromTriangles(
  positions: ArrayLike<number>,
  triangles: readonly number[],
  frame: FaceFrame,
): FaceOutline | null {
  if (triangles.length === 0) return null;
  let extent = 0;
  for (const triangle of triangles) {
    for (let i = 0; i < 9; i += 1) extent = Math.max(extent, Math.abs(positions[triangle * 9 + i]));
  }
  const weld = Math.max(extent, 1) * 1e-6;
  const nodeIds = new Map<string, number>();
  const nodes: Point2[] = [];
  const nodeOf = (triangle: number, corner: number) => {
    const o = triangle * 9 + corner * 3;
    const x = positions[o];
    const y = positions[o + 1];
    const z = positions[o + 2];
    const key = `${Math.round(x / weld)},${Math.round(y / weld)},${Math.round(z / weld)}`;
    let id = nodeIds.get(key);
    if (id === undefined) {
      id = nodes.length;
      nodeIds.set(key, id);
      const rx = x - frame.origin.x;
      const ry = y - frame.origin.y;
      const rz = z - frame.origin.z;
      nodes.push({
        u: rx * frame.xAxis.x + ry * frame.xAxis.y + rz * frame.xAxis.z,
        v: rx * frame.zAxis.x + ry * frame.zAxis.y + rz * frame.zAxis.z,
      });
    }
    return id;
  };

  const edgeUse = new Map<string, number>();
  const edgeKey = (a: number, b: number) => (a < b ? `${a}:${b}` : `${b}:${a}`);
  for (const triangle of triangles) {
    const ids = [nodeOf(triangle, 0), nodeOf(triangle, 1), nodeOf(triangle, 2)];
    for (let corner = 0; corner < 3; corner += 1) {
      const a = ids[corner];
      const b = ids[(corner + 1) % 3];
      if (a === b) continue;
      const key = edgeKey(a, b);
      edgeUse.set(key, (edgeUse.get(key) ?? 0) + 1);
    }
  }

  const neighbours = new Map<number, number[]>();
  edgeUse.forEach((count, key) => {
    if (count !== 1) return;
    const [a, b] = key.split(":").map(Number);
    neighbours.set(a, [...(neighbours.get(a) ?? []), b]);
    neighbours.set(b, [...(neighbours.get(b) ?? []), a]);
  });

  const used = new Set<string>();
  const loops: Point2[][] = [];
  for (const [start, firstNeighbours] of neighbours) {
    for (const first of firstNeighbours) {
      if (used.has(edgeKey(start, first))) continue;
      const loop = [start];
      let previous = start;
      let current = first;
      used.add(edgeKey(start, first));
      while (current !== start) {
        loop.push(current);
        const next = (neighbours.get(current) ?? []).find((candidate) => candidate !== previous && !used.has(edgeKey(current, candidate)))
          ?? (neighbours.get(current) ?? []).find((candidate) => !used.has(edgeKey(current, candidate)));
        if (next === undefined) break;
        used.add(edgeKey(current, next));
        previous = current;
        current = next;
      }
      if (current === start && loop.length >= 3) loops.push(loop.map((id) => nodes[id]));
    }
  }
  return loops.length ? { loops } : null;
}

function insideRegion(loops: readonly Point2[][], point: Point2) {
  // Even-odd over every loop: inside the outer edge, outside the openings.
  let inside = false;
  for (const loop of loops) {
    for (let i = 0, j = loop.length - 1; i < loop.length; j = i, i += 1) {
      const a = loop[i];
      const b = loop[j];
      if ((a.v > point.v) !== (b.v > point.v) && point.u < ((b.u - a.u) * (point.v - a.v)) / (b.v - a.v) + a.u) {
        inside = !inside;
      }
    }
  }
  return inside;
}

function insideConvex(polygon: readonly Point2[], point: Point2) {
  let sign = 0;
  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const cross = (b.u - a.u) * (point.v - a.v) - (b.v - a.v) * (point.u - a.u);
    if (Math.abs(cross) < EPSILON) continue;
    const s = cross > 0 ? 1 : -1;
    if (sign === 0) sign = s;
    else if (s !== sign) return false;
  }
  return true;
}

function pointSegmentDistance(p: Point2, a: Point2, b: Point2) {
  const du = b.u - a.u;
  const dv = b.v - a.v;
  const lengthSq = du * du + dv * dv;
  const t = lengthSq < EPSILON ? 0 : Math.max(0, Math.min(1, ((p.u - a.u) * du + (p.v - a.v) * dv) / lengthSq));
  return Math.hypot(p.u - (a.u + du * t), p.v - (a.v + dv * t));
}

function segmentsCross(a: Point2, b: Point2, c: Point2, d: Point2) {
  const orient = (p: Point2, q: Point2, r: Point2) => (q.u - p.u) * (r.v - p.v) - (q.v - p.v) * (r.u - p.u);
  const o1 = orient(a, b, c);
  const o2 = orient(a, b, d);
  const o3 = orient(c, d, a);
  const o4 = orient(c, d, b);
  return o1 * o2 < 0 && o3 * o4 < 0;
}

export function segmentSegmentDistance(a: Point2, b: Point2, c: Point2, d: Point2) {
  if (segmentsCross(a, b, c, d)) return 0;
  return Math.min(pointSegmentDistance(a, c, d), pointSegmentDistance(b, c, d), pointSegmentDistance(c, a, b), pointSegmentDistance(d, a, b));
}

type Segment = { a: Point2; b: Point2; minU: number; maxU: number; minV: number; maxV: number };

function loopSegments(loops: readonly Point2[][]): Segment[] {
  const segments: Segment[] = [];
  for (const loop of loops) {
    for (let i = 0; i < loop.length; i += 1) {
      const a = loop[i];
      const b = loop[(i + 1) % loop.length];
      segments.push({ a, b, minU: Math.min(a.u, b.u), maxU: Math.max(a.u, b.u), minV: Math.min(a.v, b.v), maxV: Math.max(a.v, b.v) });
    }
  }
  return segments;
}

export type HolePatternResult = {
  /** Hole centres in the face's frame. */
  centers: Point2[];
  /** More holes than the limit would fit; `centers` is empty then. */
  tooMany: boolean;
  /** Rows and columns of the lattice that was used (rows that carry at least one hole). */
  rows: number;
  /** Perimeter only: how long the line is the holes go round on, and whether they sit on its corners. */
  ring?: { length: number; onCorners: boolean };
  /** Mounting holes only: the face is round, so the holes go evenly round a circle instead of into corners. */
  roundFace?: boolean;
  /** 19" rack holes: how the slots came out on the face, or why there are none. */
  rack?: RackFit;
  /**
   * The edge cuts the holes (`holePatternCutsAtEdge`): holes reaching past it are cut off there instead of left out.
   * `thin` counts the holes inside the face that leave a strip to its edge thinner than the walls between holes.
   */
  edgeCut?: { thin: number; wall: number; border: number };
};

/** The panel heights of IEC 60297-3-100 (table 1): the height, and the distance between the upper and lower holes. */
export const RACK_STANDARD_PANELS = [
  { units: 1, height: 43.65, spacing: 31.75 },
  { units: 2, height: 88.1, spacing: 76.2 },
  { units: 3, height: 132.55, spacing: 57.15 },
  { units: 4, height: 177, spacing: 101.6 },
  { units: 5, height: 221.45, spacing: 146.05 },
  { units: 6, height: 265.9, spacing: 190.5 },
] as const;
/** The front panel of a 19" rack is 19 inches wide. */
export const RACK_PANEL_WIDTH = 482.6;
/** Centre to centre of the two rails, 18 5/16 inches (EIA-310). */
export const RACK_HOLE_SPACING = 465.1;
/** The slot of IEC 60297-3-100 (as Schroff, Fischer and other makers cut it): 10.3 mm long across, 6.8 mm high. */
export const RACK_SLOT_LENGTH = 10.3;
export const RACK_SLOT_WIDTH = 6.8;
/** One rack unit, 1 3/4 inches; its three rail holes sit 1/4, 7/8 and 1 1/2 inches up from its bottom. */
export const RACK_UNIT = 44.45;
const RACK_RAIL_HOLES = [6.35, 22.225, 38.1];
/** The least room from a hole's middle to the panel's edge: what the standard's 1U and 2U panels keep. */
export const RACK_EDGE = 5.95;
/** The least material left beside a slot, across the panel and up it. */
const RACK_RIM = 1;

export type RackFit = {
  /** The holes: four, or none and why. */
  ok: boolean;
  reason?: "narrow" | "low";
  /** The panel as the face has it, across (its long side) and up. */
  width: number;
  height: number;
  /** Up the panel: centre to centre of the lower and upper holes, and from a hole's middle to the nearer edge. */
  spacing: number;
  edge: number;
  /** How many units of the rack the panel takes; it sits in their middle. */
  space: number;
  /** A standard height that was asked for, and the height its panel has. */
  units?: number;
  standardHeight?: number;
  /** The slots' turn in the face, in degrees as `holeAngle` takes it: they lie along the panel's width. */
  angle: number;
};

/** A standard panel height asked for, 1 to 6, or 0 for one that fits the panel. */
export function normalizeRackUnits(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(RACK_STANDARD_PANELS.length, Math.max(0, Math.round(value))) : 0;
}

/**
 * The holes of a panel of any height on a rack's rail. The panel takes the fewest whole units it fits in and sits in
 * their middle, so it never reaches into its neighbours' room and fits on any unit of the rack. The rail's holes are
 * the same about the middle of any whole number of units (1/4, 7/8 and 1 1/2 inch up each unit), so the outermost two
 * that keep RACK_EDGE to the panel's edges lie the same distance from its upper and lower edges.
 */
export function rackPanelFit(height: number): { units: number; spacing: number; edge: number } | null {
  if (!(height > 0)) return null;
  const units = Math.max(1, Math.ceil(height / RACK_UNIT - 1e-9));
  const room = units * RACK_UNIT;
  const below = (room - height) / 2;
  for (let unit = 0; unit < units; unit += 1) {
    for (const hole of RACK_RAIL_HOLES) {
      const position = unit * RACK_UNIT + hole;
      if (position >= room / 2) return null;
      const edge = position - below;
      if (edge >= RACK_EDGE - 1e-6) {
        const round = (value: number) => Math.round(value * 1e6) / 1e6;
        return { units, spacing: round(room - 2 * position), edge: round(edge) };
      }
    }
  }
  return null;
}

/** The smallest rectangle round a face's hull: it lies along one of the hull's sides; the face's own x wins a tie. */
function outlineBox(hull: readonly Point2[]) {
  let best: { angle: number; area: number; minA: number; maxA: number; minB: number; maxB: number } | null = null;
  const angles = [0, ...hull.map((point, index) => {
    const next = hull[(index + 1) % hull.length];
    return Math.atan2(next.v - point.v, next.u - point.u);
  })];
  for (const raw of angles) {
    // A rectangle repeats every quarter turn.
    let angle = raw % (Math.PI / 2);
    if (angle < 0) angle += Math.PI / 2;
    if (angle > Math.PI / 4 + 1e-9) angle -= Math.PI / 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    let minA = Infinity, maxA = -Infinity, minB = Infinity, maxB = -Infinity;
    for (const point of hull) {
      const a = point.u * cos + point.v * sin;
      const b = -point.u * sin + point.v * cos;
      minA = Math.min(minA, a); maxA = Math.max(maxA, a); minB = Math.min(minB, b); maxB = Math.max(maxB, b);
    }
    const area = (maxA - minA) * (maxB - minB);
    if (!best || area < best.area * (1 - 1e-6)) best = { angle, area, minA, maxA, minB, maxB };
  }
  return best;
}

/**
 * 19" rack holes: four slots in the corners of the smallest rectangle round the face, its long side across the rack.
 * Across they sit 465.1 mm apart about its middle; up it either as a standard panel of 1U to 6U has them, or for any
 * other height the longest distance between two rail holes that leaves room to the edges, again about its middle -
 * so they sit the same distance from the upper and lower edges and still meet the rail's holes.
 */
export function rackCenters(loops: readonly Point2[][], settings: Pick<HolePatternSettings, "rackUnits">): { centers: Point2[]; fit: RackFit | null } {
  const hull = convexHull(loops.flat());
  const box = hull.length >= 3 ? outlineBox(hull) : null;
  if (!box) return { centers: [], fit: null };
  const sizeA = box.maxA - box.minA;
  const sizeB = box.maxB - box.minB;
  const across = sizeA >= sizeB;
  const width = across ? sizeA : sizeB;
  const height = across ? sizeB : sizeA;
  // The slots lie along the panel's width: the turn from the face's x to it, as a hole's angle (counter-clockwise).
  const turn = across ? box.angle : box.angle + Math.PI / 2;
  const angle = normalizeHoleAngle((-turn * 180) / Math.PI);
  const units = normalizeRackUnits(settings.rackUnits);
  const standard = units > 0 ? RACK_STANDARD_PANELS[units - 1] : null;
  const fitted = standard ? null : rackPanelFit(height);
  const spacing = standard ? standard.spacing : fitted?.spacing ?? 0;
  const round = (value: number) => Math.round(value * 1000) / 1000;
  const fit: RackFit = {
    ok: false,
    width: round(width),
    height: round(height),
    spacing,
    edge: Math.round(((height - spacing) / 2) * 1e6) / 1e6,
    space: standard ? units : fitted?.units ?? 0,
    angle,
    ...(standard ? { units, standardHeight: standard.height } : {}),
  };
  if (width < RACK_HOLE_SPACING + RACK_SLOT_LENGTH + 2 * RACK_RIM - 1e-9) return { centers: [], fit: { ...fit, reason: "narrow" } };
  if (!(spacing > 0) || height < spacing + RACK_SLOT_WIDTH + 2 * RACK_RIM - 1e-9) return { centers: [], fit: { ...fit, reason: "low" } };
  const middleA = (box.minA + box.maxA) / 2;
  const middleB = (box.minB + box.maxB) / 2;
  const halfAcross = RACK_HOLE_SPACING / 2;
  const halfUp = spacing / 2;
  const cos = Math.cos(box.angle);
  const sin = Math.sin(box.angle);
  const back = (a: number, b: number): Point2 => ({ u: a * cos - b * sin, v: a * sin + b * cos });
  const offsets = across
    ? [[-halfAcross, -halfUp], [halfAcross, -halfUp], [halfAcross, halfUp], [-halfAcross, halfUp]]
    : [[-halfUp, -halfAcross], [halfUp, -halfAcross], [halfUp, halfAcross], [-halfUp, halfAcross]];
  return { centers: offsets.map(([a, b]) => back(middleA + a, middleB + b)), fit: { ...fit, ok: true } };
}

/** The holes a rack's slots are made of: the standard slot, plain, straight through the wall, turned along the panel. */
export function rackSlotSettings(settings: HolePatternSettings, angle = 0): HolePatternSettings {
  const { holeType: _type, headSize: _head, headDepth: _depth, headAngle: _angle, holeTilt: _tilt, ...rest } = settings;
  return { ...rest, form: "slot", size: RACK_SLOT_LENGTH, height: RACK_SLOT_WIDTH, holeAngle: angle };
}

/**
 * The centres of a hole pattern on a face. Only holes that lie wholly inside
 * the face, at least `margin` away from its edge and from any opening, are
 * kept. The lattice is centred on the face; of the four ways to centre it
 * (on a hole or between holes, along each axis) the one that fits most holes
 * wins. A staggered pattern shifts every second row by half a spacing and
 * packs the rows closer, so each hole has neighbours one spacing away.
 */
/**
 * Whether a hole of this outline, centred on a point, lies wholly inside the face and keeps the margin to its edges:
 * `inside` says whether a point lies on the face, `segments` are its edges.
 */
function holeFitter(inside: (point: Point2) => boolean, segments: readonly Segment[], footprint: readonly Point2[], margin: number) {
  let reach = margin;
  for (const corner of footprint) reach = Math.max(reach, Math.hypot(corner.u, corner.v) + margin);
  return (c: Point2) => {
    if (!inside(c)) return false;
    for (const corner of footprint) {
      if (!inside({ u: c.u + corner.u, v: c.v + corner.v })) return false;
    }
    const placed = footprint.map((corner) => ({ u: c.u + corner.u, v: c.v + corner.v }));
    for (const segment of segments) {
      if (segment.maxU < c.u - reach || segment.minU > c.u + reach || segment.maxV < c.v - reach || segment.minV > c.v + reach) continue;
      if (insideConvex(placed, segment.a) || insideConvex(placed, segment.b)) return false;
      for (let i = 0; i < placed.length; i += 1) {
        if (segmentSegmentDistance(segment.a, segment.b, placed[i], placed[(i + 1) % placed.length]) < margin - EPSILON) return false;
      }
    }
    return true;
  };
}

/**
 * The best of the four ways to centre a lattice on a box of the face (on a hole or between holes, along each axis):
 * the one that fits most holes. A staggered lattice shifts every second row by half a step.
 */
function bestLattice(
  bounds: { minU: number; maxU: number; minV: number; maxV: number },
  pitchU: number,
  pitchV: number,
  staggered: boolean,
  fits: (c: Point2) => boolean,
  /** Cut off at the edge: how many of these holes leave a thin strip to it; the way with fewest wins, then the most holes. */
  thinOf?: (centers: Point2[]) => number,
  /** Where to try the lattice, moved off the face's middle; by default on a hole or between holes along each axis. */
  shifts?: readonly Point2[],
): { centers: Point2[]; rows: number; thin: number } | null {
  const centerU = (bounds.minU + bounds.maxU) / 2;
  const centerV = (bounds.minV + bounds.maxV) / 2;
  const halfSpanU = Math.ceil((bounds.maxU - bounds.minU) / 2 / pitchU) + 1;
  const halfSpanV = Math.ceil((bounds.maxV - bounds.minV) / 2 / pitchV) + 1;
  if ((halfSpanU * 2 + 1) * (halfSpanV * 2 + 1) > MAX_CANDIDATES) return null;
  let best: Point2[] = [];
  let bestRows = 0;
  let bestThin = Infinity;
  const offsets = shifts ?? [
    { u: 0, v: 0 },
    { u: pitchU / 2, v: 0 },
    { u: 0, v: pitchV / 2 },
    { u: pitchU / 2, v: pitchV / 2 },
  ];
  for (const offset of offsets) {
    const found: Point2[] = [];
    const rowsUsed = new Set<number>();
    for (let row = -halfSpanV; row <= halfSpanV; row += 1) {
      const shift = staggered && Math.abs(row) % 2 === 1 ? pitchU / 2 : 0;
      for (let column = -halfSpanU; column <= halfSpanU; column += 1) {
        const c = { u: centerU + offset.u + column * pitchU + shift, v: centerV + offset.v + row * pitchV };
        if (fits(c)) {
          found.push(c);
          rowsUsed.add(row);
        }
      }
    }
    const thin = thinOf ? thinOf(found) : 0;
    if (thin < bestThin || (thin === bestThin && found.length > best.length)) {
      best = found;
      bestRows = rowsUsed.size;
      bestThin = thin;
    }
  }
  return { centers: best, rows: bestRows, thin: Number.isFinite(bestThin) ? bestThin : 0 };
}

/**
 * Whether the face's edge cuts the holes (Discussion #1771): with no distance to the edge, the plain holes of a pattern
 * that go through the body run on past the edge and are cut off by it, so a grille or a honeycomb reaches right to the
 * edge without a solid strip round it. Screw holes with a head, own shapes, blind holes and a round wall keep to the face.
 */
export function holePatternCutsAtEdge(settings: Pick<HolePatternSettings, "arrangement" | "form" | "margin" | "depth"> & Partial<Pick<HolePatternSettings, "holeType" | "topLayer">>) {
  if (settings.arrangement !== "grid" && settings.arrangement !== "staggered") return false;
  if (settings.form === "custom" || holeHasHead(settings)) return false;
  // A top layer in a second colour is a net cut right through that layer, whatever depth was set before.
  return (settings.depth === null || Boolean(settings.topLayer)) && !(settings.margin > EPSILON);
}

/**
 * The top layer in a second colour (Discussion #1771), when it is asked for and can be made: a pattern (not mounting
 * holes) of plain holes in a flat face, not an own shape. The holes go through that layer only, so it is a net in its
 * colour, and the body's own colour fills them up to the face. Its thickness stays under the body's
 * (`thickness`, when known), so some of the body is left under it.
 */
export function holePatternTopLayer(
  settings: Pick<HolePatternSettings, "arrangement" | "form"> & Partial<Pick<HolePatternSettings, "topLayer" | "topLayerThickness" | "topLayerColor" | "holeType">>,
  thickness?: number,
): { thickness: number; color: string } | null {
  if (!settings.topLayer || settings.arrangement === "corners" || settings.form === "custom" || holeHasHead(settings)) return null;
  const asked = typeof settings.topLayerThickness === "number" && Number.isFinite(settings.topLayerThickness) ? settings.topLayerThickness : HOLE_PATTERN_TOP_LAYER_DEFAULT;
  const most = thickness !== undefined && thickness > 0 ? thickness - HOLE_PATTERN_TOP_LAYER_MIN : Infinity;
  if (!(most >= HOLE_PATTERN_TOP_LAYER_MIN)) return null;
  const color = typeof settings.topLayerColor === "string" && /^#[0-9a-f]{6}$/i.test(settings.topLayerColor) ? settings.topLayerColor : HOLE_PATTERN_TOP_LAYER_COLOR;
  return { thickness: Math.min(most, Math.max(HOLE_PATTERN_TOP_LAYER_MIN, asked)), color };
}

/** The frame along the edge when the edge cuts the holes, in mm; 0 when it does not cut them or has no frame. */
export function holePatternEdgeBorder(settings: Parameters<typeof holePatternCutsAtEdge>[0] & Partial<Pick<HolePatternSettings, "edgeBorder">>) {
  if (!holePatternCutsAtEdge(settings)) return 0;
  const border = typeof settings.edgeBorder === "number" && Number.isFinite(settings.edgeBorder) ? settings.edgeBorder : 0;
  return Math.min(HOLE_PATTERN_MAX_EDGE_BORDER, Math.max(0, border));
}

/**
 * The face set in by `border` along its edge and its openings, in the face's frame: where the frame ends and the holes
 * are cut off. Sharp corners stay sharp (mitred), so the frame is as wide all round.
 */
export function insetFaceLoops(runtime: ManifoldToplevel, loops: readonly Point2[][], border: number): Point2[][] {
  const made: { delete(): void }[] = [];
  try {
    const region = new runtime.CrossSection(loops.map((loop) => loop.map((point): [number, number] => [point.u, point.v])), "EvenOdd");
    made.push(region);
    const inset = region.offset(-border, "Miter", 2);
    made.push(inset);
    const simple = inset.simplify(1e-6);
    made.push(simple);
    return simple.toPolygons().map((polygon) => polygon.map((point) => ({ u: point[0], v: point[1] }))).filter((loop) => loop.length >= 3);
  } finally {
    made.forEach((section) => section.delete());
  }
}

/** How far a hole cut off by the edge must reach into the face at least, so it does not leave a bare scratch. */
const EDGE_CUT_MIN_BITE = 0.4;
/** A hole this close to the edge counts as touching it, with no strip between. */
const EDGE_CUT_TOUCH = 0.01;
/** The finer steps the lattice is moved in across one step each way, when laid about the middle it leaves thin strips. */
const EDGE_CUT_SHIFT_STEPS = 12;
/** About how much work that may take, holes times the edges of the face: past it the steps are halved, then left out. */
const EDGE_CUT_SHIFT_BUDGET = 1200000;

/**
 * A hole cut off by the edge: kept when some part of it lies on the face at least `EDGE_CUT_MIN_BITE` from every edge,
 * or when it lies wholly on the face.
 */
function edgeCutFitter(inside: (point: Point2) => boolean, segments: readonly Segment[], footprint: readonly Point2[], whole: (c: Point2) => boolean) {
  const bite = EDGE_CUT_MIN_BITE;
  const radius = footprint.reduce((most, point) => Math.max(most, Math.hypot(point.u, point.v)), 0);
  const nearestEdge = (point: Point2, within: number) => {
    let nearest = within;
    for (const segment of segments) {
      if (segment.maxU < point.u - nearest || segment.minU > point.u + nearest || segment.maxV < point.v - nearest || segment.minV > point.v + nearest) continue;
      nearest = Math.min(nearest, pointSegmentDistance(point, segment.a, segment.b));
    }
    return nearest;
  };
  // Points spread over the hole: its corners and the middles of its sides (at most 16 of them), and halfway out to those.
  const rim = footprint.flatMap((corner, index) => {
    const next = footprint[(index + 1) % footprint.length];
    return [corner, { u: (corner.u + next.u) / 2, v: (corner.v + next.v) / 2 }];
  });
  const every = Math.max(1, Math.ceil(rim.length / 16));
  const spread = rim.filter((_, index) => index % every === 0);
  const samples = [...spread, ...spread.map((point) => ({ u: point.u / 2, v: point.v / 2 }))];
  return (c: Point2) => {
    // Most holes are settled by their middle alone: well on the face, or so far off it that no part reaches it.
    const edge = nearestEdge(c, radius + bite);
    const onFace = inside(c);
    if (onFace && edge >= bite) return true;
    if (!onFace && edge >= radius) return false;
    if (whole(c)) return true;
    return samples.some((sample) => {
      const point = { u: c.u + sample.u, v: c.v + sample.v };
      return inside(point) && nearestEdge(point, bite) >= bite;
    });
  };
}

/**
 * Counts the holes wholly on the face that come closer to its edge than `wall` without reaching it: there the edge
 * keeps a strip thinner than the walls between the holes, which prints or cuts poorly.
 */
function thinStripCounter(segments: readonly Segment[], footprint: readonly Point2[], whole: (c: Point2) => boolean, wall: number) {
  let reach = wall;
  for (const corner of footprint) reach = Math.max(reach, Math.hypot(corner.u, corner.v) + wall);
  return (centers: Point2[]) => {
    if (!(wall > EDGE_CUT_TOUCH)) return 0;
    let thin = 0;
    for (const c of centers) {
      if (!whole(c)) continue;
      const placed = footprint.map((corner) => ({ u: c.u + corner.u, v: c.v + corner.v }));
      let gap = Infinity;
      for (const segment of segments) {
        if (segment.maxU < c.u - reach || segment.minU > c.u + reach || segment.maxV < c.v - reach || segment.minV > c.v + reach) continue;
        for (let i = 0; i < placed.length; i += 1) {
          gap = Math.min(gap, segmentSegmentDistance(segment.a, segment.b, placed[i], placed[(i + 1) % placed.length]));
        }
      }
      if (gap > EDGE_CUT_TOUCH && gap < wall - EPSILON) thin += 1;
    }
    return thin;
  };
}

/**
 * Mounting holes: one hole in each corner of the face, the same distance from its sides - for the screws of a lid, a
 * base plate or a board. The corners are those of the smallest rectangle round the face's outline, so a plate turned
 * on the plate or one with notches in its sides still gets them in its own corners, evenly. The margin counts to the
 * holes' edge (their widest point, a screw head included) or, with `cornerToCenter`, to their middles. None when two
 * holes on a side would run into each other.
 */
export function cornerCenters(
  loops: readonly Point2[][],
  settings: Pick<HolePatternSettings, "margin" | "cornerToCenter" | "cornerCount">,
  footprint: readonly Point2[],
  /** Whether a hole between the corners lies on the face; one that does not is left out. */
  onFace: (point: Point2) => boolean = () => true,
): { centers: Point2[]; round: boolean } {
  const hull = convexHull(loops.flat());
  if (hull.length < 3) return { centers: [], round: false };
  const radius = footprint.reduce((most, point) => Math.max(most, Math.hypot(point.u, point.v)), 0);
  const inset = Math.max(0, settings.margin) + (settings.cornerToCenter ? 0 : radius);
  // A round face (the lid of a round box) has no corners: the holes go evenly round a circle that far in from its edge.
  const circle = roundOutline(hull);
  if (circle) {
    const count = normalizeCornerCount(settings.cornerCount, true);
    const ring = circle.radius - inset;
    // On the circle, neighbours must stay clear of each other.
    if (!(ring > 0) || 2 * ring * Math.sin(Math.PI / count) < 2 * radius) return { centers: [], round: true };
    const centers = Array.from({ length: count }, (_, index) => {
      const angle = Math.PI / 2 + (2 * Math.PI * index) / count;
      return { u: circle.u + ring * Math.cos(angle), v: circle.v + ring * Math.sin(angle) };
    });
    return { centers, round: true };
  }
  // The smallest rectangle round the outline lies along one of its hull's sides; the face's own x wins a tie.
  const best = outlineBox(hull);
  if (!best) return { centers: [], round: false };
  const left = best.minA + inset;
  const right = best.maxA - inset;
  const near = best.minB + inset;
  const far = best.maxB - inset;
  if (right - left < 2 * radius || far - near < 2 * radius) return { centers: [], round: false };
  const cos = Math.cos(best.angle);
  const sin = Math.sin(best.angle);
  const back = (a: number, b: number): Point2 => ({ u: a * cos - b * sin, v: a * sin + b * cos });
  const corners = [back(left, near), back(right, near), back(right, far), back(left, far)];
  const extra = (normalizeCornerCount(settings.cornerCount) - 4) / 2;
  if (extra <= 0) return { centers: corners, round: false };
  // The holes past the corners go in pairs on opposite sides, split between the long and short sides so the gaps
  // along both come out as near the same as they can.
  const long = right - left;
  const short = far - near;
  let alongA = 0;
  for (let a = 0; a <= extra; a += 1) {
    const gap = (count: number, side: number) => side / (count + 1);
    const best = Math.abs(gap(alongA, long) - gap(extra - alongA, short));
    if (Math.abs(gap(a, long) - gap(extra - a, short)) < best - 1e-9) alongA = a;
  }
  const alongB = extra - alongA;
  // Holes closer than their own width would run into one another.
  if ((alongA > 0 && long / (alongA + 1) < 2 * radius) || (alongB > 0 && short / (alongB + 1) < 2 * radius)) return { centers: [], round: false };
  const between: Point2[] = [];
  for (let i = 1; i <= alongA; i += 1) {
    const a = left + (long * i) / (alongA + 1);
    between.push(back(a, near), back(a, far));
  }
  for (let i = 1; i <= alongB; i += 1) {
    const b = near + (short * i) / (alongB + 1);
    between.push(back(left, b), back(right, b));
  }
  return { centers: [...corners, ...between.filter(onFace)], round: false };
}

/** The middle and radius of an outline that is a circle (its hull's corners all as far from the middle), or null. */
function roundOutline(hull: readonly Point2[]): { u: number; v: number; radius: number } | null {
  if (hull.length < 12) return null;
  const us = hull.map((point) => point.u);
  const vs = hull.map((point) => point.v);
  const u = (Math.min(...us) + Math.max(...us)) / 2;
  const v = (Math.min(...vs) + Math.max(...vs)) / 2;
  const distances = hull.map((point) => Math.hypot(point.u - u, point.v - v));
  const far = Math.max(...distances);
  return far > 0 && Math.min(...distances) / far > 0.985 ? { u, v, radius: far } : null;
}

export const MIN_CORNER_COUNT = 4;
export const MIN_ROUND_COUNT = 3;
export const MAX_CORNER_COUNT = 40;

/** Mounting holes in all: on a rectangle even, from the four corners up; round a circle any number from three. */
export function normalizeCornerCount(value: unknown, round = false) {
  const raw = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : MIN_CORNER_COUNT;
  if (round) return Math.min(MAX_CORNER_COUNT, Math.max(MIN_ROUND_COUNT, raw));
  // An odd number on a rectangle would leave one side short: the next even number down.
  return Math.min(MAX_CORNER_COUNT, Math.max(MIN_CORNER_COUNT, raw - (raw % 2)));
}

export function holePatternCenters(
  outline: FaceOutline,
  settings: HolePatternSettings,
  /** How thick the wall is behind the face, along its normal: where a hole sloping through it comes out. */
  wall = 0,
): HolePatternResult {
  const empty: HolePatternResult = { centers: [], tooMany: false, rows: 0 };
  const footprint = holeFitPolygon(settings, wall);
  const spacing = Math.max(HOLE_PATTERN_MIN_SIZE, settings.spacing);
  const margin = Math.max(0, settings.margin);
  const staggered = settings.arrangement === "staggered";
  const pitchU = spacing;
  const pitchV = holePatternRowSpacing(settings);

  const loops = outline.loops.filter((loop) => loop.length >= 3);
  if (loops.length === 0) return empty;
  let minU = Infinity;
  let maxU = -Infinity;
  let minV = Infinity;
  let maxV = -Infinity;
  for (const loop of loops) {
    for (const point of loop) {
      minU = Math.min(minU, point.u);
      maxU = Math.max(maxU, point.u);
      minV = Math.min(minV, point.v);
      maxV = Math.max(maxV, point.v);
    }
  }
  const segments = loopSegments(loops);
  const fits = holeFitter((point) => insideRegion(loops, point), segments, footprint, margin);

  if (settings.arrangement === "corners" && settings.rack) {
    const { centers, fit } = rackCenters(loops, settings);
    return { centers, tooMany: false, rows: centers.length ? 2 : 0, ...(fit ? { rack: fit } : {}) };
  }

  if (settings.arrangement === "corners") {
    // Holes between the corners that would leave the face (a notch in a side) are left out; the corners always stay.
    const onFace = holeFitter((point) => insideRegion(loops, point), segments, footprint, 0);
    const { centers, round } = cornerCenters(loops, settings, footprint, onFace);
    return { centers, tooMany: false, rows: centers.length ? 2 : 0, ...(round ? { roundFace: true } : {}) };
  }

  if (settings.arrangement === "perimeter") {
    const runtime = loadedManifoldRuntime();
    if (!runtime) {
      // The ring is laid on the edge set in by the kernel; the editor has it loaded long before a face is picked.
      requestManifoldRuntime();
      return empty;
    }
    const ring = perimeterRing(runtime, loops, settings, wall);
    if (ring.tooMany) return { ...empty, tooMany: true };
    const centers = ring.centers.filter(fits);
    return { centers, tooMany: false, rows: centers.length ? 1 : 0, ring: { length: ring.length, onCorners: ring.onCorners } };
  }

  if (holePatternCutsAtEdge(settings)) {
    // The edge cuts the holes: those reaching past it stay, and of the ways to lay the lattice the one leaving the
    // fewest thin strips along the edge wins. With a frame the line it starts on, set in from the edge, cuts them.
    const wall = holePatternWall(settings);
    const border = holePatternEdgeBorder(settings);
    let cutLoops = loops;
    if (border > 0) {
      const runtime = loadedManifoldRuntime();
      if (!runtime) {
        requestManifoldRuntime();
        return empty;
      }
      cutLoops = insetFaceLoops(runtime, loops, border);
      if (cutLoops.length === 0) return { ...empty, edgeCut: { thin: 0, wall, border } };
    }
    const cutSegments = cutLoops === loops ? segments : loopSegments(cutLoops);
    const inside = (point: Point2) => insideRegion(cutLoops, point);
    const whole = cutLoops === loops ? fits : holeFitter(inside, cutSegments, footprint, 0);
    const bounds = { minU, maxU, minV, maxV };
    const keep = edgeCutFitter(inside, cutSegments, footprint, whole);
    const thinOf = thinStripCounter(cutSegments, footprint, whole, wall);
    let cut = bestLattice(bounds, pitchU, pitchV, staggered, keep, thinOf);
    if (!cut) return { ...empty, tooMany: true };
    // Laid evenly about the middle, a staggered row often keeps a thin strip whichever way: then the lattice is moved
    // in finer steps across one step each way, and the place with the fewest thin strips (then the most holes) wins.
    if (cut.thin > 0) {
      // About the work of one lattice, so a big face or a long curved outline stays quick: finer steps only as far as that allows.
      const work = Math.max(1, cut.centers.length) * Math.max(1, cutSegments.length);
      const steps = [EDGE_CUT_SHIFT_STEPS, EDGE_CUT_SHIFT_STEPS / 2].find((count) => work * count * count <= EDGE_CUT_SHIFT_BUDGET) ?? 0;
      const shifts: Point2[] = [];
      for (let i = 0; i < steps; i += 1) for (let j = 0; j < steps; j += 1) shifts.push({ u: (pitchU * i) / steps, v: (pitchV * j) / steps });
      const moved = shifts.length ? bestLattice(bounds, pitchU, pitchV, staggered, keep, thinOf, shifts) : null;
      if (moved && (moved.thin < cut.thin || (moved.thin === cut.thin && moved.centers.length > cut.centers.length))) cut = moved;
    }
    if (cut.centers.length > (settings.allowMany ? HOLE_PATTERN_MANY_HOLES : HOLE_PATTERN_MAX_HOLES)) return { centers: [], tooMany: true, rows: 0 };
    return { centers: cut.centers, tooMany: false, rows: cut.rows, edgeCut: { thin: cut.thin, wall, border } };
  }

  const lattice = bestLattice({ minU, maxU, minV, maxV }, pitchU, pitchV, staggered, fits);
  if (!lattice) return { ...empty, tooMany: true };
  if (lattice.centers.length > (settings.allowMany ? HOLE_PATTERN_MANY_HOLES : HOLE_PATTERN_MAX_HOLES)) return { centers: [], tooMany: true, rows: 0 };
  return { centers: lattice.centers, tooMany: false, rows: lattice.rows };
}

/**
 * A round wall laid flat (#1393): the wall of a cylinder, a tube or a bore, `u` the way round it as a length on the
 * face, `v` along its axis. A wall that goes all the way round wraps: `u` and `u + circumference` are one place.
 */
export type RoundWallOutline = {
  /** The radius of the face. */
  radius: number;
  /** Once round the face, 2 pi times the radius. */
  circumference: number;
  /** The face goes all the way round, without an edge along its axis. */
  closed: boolean;
  /** The facets of the face laid flat, three corners each. */
  triangles: Point2[][];
  /** The edges of the face that border nothing of it: its rims and the edges of any openings. */
  edges: [Point2, Point2][];
};

export type RoundWallResult = HolePatternResult & {
  /** Round a closed wall: how many holes go round in a row, and the step between them that closes the ring. */
  columns?: number;
  spacing?: number;
};

/** How many slices of the way round a wall's facets are filed into, to find the facets under a point quickly. */
const ROUND_WALL_BINS = 720;

/**
 * The centres of a hole pattern on a round wall (#1393), in the wall's flat frame. On a wall that goes all the way
 * round, every row holds a whole number of holes evenly round it, never closer than the spacing asks, so the ring
 * closes with no gap; the margin then holds only to the rims and to openings. A part of a wall (a rounded edge, a half
 * cylinder) is filled like a flat face. A hole's room is measured round the wall as the straight hole meets it.
 * Along the edge is a flat face's arrangement: on a wall it is laid out as a grid.
 */
export function roundWallCenters(wall: RoundWallOutline, sloped: HolePatternSettings): RoundWallResult {
  const empty: RoundWallResult = { centers: [], tooMany: false, rows: 0 };
  // Sloping through the wall is for flat faces for now: on a round wall every hole points at the axis.
  const settings = withoutHoleTilt(sloped);
  const radius = wall.radius;
  if (!(radius > 0) || wall.triangles.length === 0) return empty;
  const margin = Math.max(0, settings.margin);
  const staggered = settings.arrangement === "staggered";
  const spacing = Math.max(HOLE_PATTERN_MIN_SIZE, settings.spacing);
  const pitchV = holePatternRowSpacing({ ...settings, arrangement: staggered ? "staggered" : "grid" });
  // A straight hole meets the wall further round than its half width: at the angle whose sine is that width over the radius.
  const flat = holeFootprintPolygon(settings);
  if (flat.some((corner) => Math.abs(corner.u) >= radius * 0.98)) return empty;
  const footprint = flat.map((corner) => ({ u: radius * Math.asin(corner.u / radius), v: corner.v }));

  const circumference = wall.circumference;
  const shifts = wall.closed ? [-circumference, 0, circumference] : [0];
  let minU = Infinity;
  let maxU = -Infinity;
  let minV = Infinity;
  let maxV = -Infinity;
  for (const triangle of wall.triangles) {
    for (const point of triangle) {
      minU = Math.min(minU, point.u);
      maxU = Math.max(maxU, point.u);
      minV = Math.min(minV, point.v);
      maxV = Math.max(maxV, point.v);
    }
  }
  // The facets filed by where they lie round the wall, with a copy one round before and after on a closed wall.
  const binLow = minU - (wall.closed ? circumference : 0);
  const binHigh = maxU + (wall.closed ? circumference : 0);
  const binWidth = Math.max(EPSILON, (binHigh - binLow) / ROUND_WALL_BINS);
  const bins: Point2[][][] = Array.from({ length: ROUND_WALL_BINS }, () => []);
  const binOf = (u: number) => Math.min(ROUND_WALL_BINS - 1, Math.max(0, Math.floor((u - binLow) / binWidth)));
  for (const triangle of wall.triangles) {
    for (const shift of shifts) {
      const moved = shift ? triangle.map((point) => ({ u: point.u + shift, v: point.v })) : triangle;
      const low = binOf(Math.min(moved[0].u, moved[1].u, moved[2].u));
      const high = binOf(Math.max(moved[0].u, moved[1].u, moved[2].u));
      for (let bin = low; bin <= high; bin += 1) bins[bin].push(moved);
    }
  }
  const inTriangle = (triangle: Point2[], point: Point2) => {
    const [a, b, c] = triangle;
    const d1 = (b.u - a.u) * (point.v - a.v) - (b.v - a.v) * (point.u - a.u);
    const d2 = (c.u - b.u) * (point.v - b.v) - (c.v - b.v) * (point.u - b.u);
    const d3 = (a.u - c.u) * (point.v - c.v) - (a.v - c.v) * (point.u - c.u);
    const tolerance = 1e-9 * Math.max(1, radius * radius);
    const negative = d1 < -tolerance || d2 < -tolerance || d3 < -tolerance;
    const positive = d1 > tolerance || d2 > tolerance || d3 > tolerance;
    return !(negative && positive);
  };
  const inside = (point: Point2) => {
    if (point.u < binLow || point.u > binHigh) return false;
    return bins[binOf(point.u)].some((triangle) => inTriangle(triangle, point));
  };
  const segments: Segment[] = [];
  for (const [a, b] of wall.edges) {
    for (const shift of shifts) {
      const p = { u: a.u + shift, v: a.v };
      const q = { u: b.u + shift, v: b.v };
      segments.push({ a: p, b: q, minU: Math.min(p.u, q.u), maxU: Math.max(p.u, q.u), minV: Math.min(p.v, q.v), maxV: Math.max(p.v, q.v) });
    }
  }
  const fits = holeFitter(inside, segments, footprint, margin);
  const limit = settings.allowMany ? HOLE_PATTERN_MANY_HOLES : HOLE_PATTERN_MAX_HOLES;

  if (!wall.closed) {
    const lattice = bestLattice({ minU, maxU, minV, maxV }, spacing, pitchV, staggered, fits);
    if (!lattice) return { ...empty, tooMany: true };
    if (lattice.centers.length > limit) return { ...empty, tooMany: true };
    return { centers: lattice.centers, tooMany: false, rows: lattice.rows };
  }

  // All the way round: a whole number of holes per row, the step evened out upward so neighbours keep the spacing.
  const columns = Math.max(1, Math.floor(circumference / spacing + 1e-9));
  const pitchU = circumference / columns;
  const halfSpanV = Math.ceil((maxV - minV) / 2 / pitchV) + 1;
  if (columns * (halfSpanV * 2 + 1) > MAX_CANDIDATES) return { ...empty, tooMany: true, columns, spacing: pitchU };
  const centerV = (minV + maxV) / 2;
  // Into the window of one round, centred on u = 0 where the wall was picked.
  const wrap = (u: number) => ((((u + circumference / 2) % circumference) + circumference) % circumference) - circumference / 2;
  let best: Point2[] = [];
  let bestRows = 0;
  for (const offset of [{ u: 0, v: 0 }, { u: 0, v: pitchV / 2 }, { u: pitchU / 2, v: 0 }, { u: pitchU / 2, v: pitchV / 2 }]) {
    const found: Point2[] = [];
    const rowsUsed = new Set<number>();
    for (let row = -halfSpanV; row <= halfSpanV; row += 1) {
      const shift = staggered && Math.abs(row) % 2 === 1 ? pitchU / 2 : 0;
      for (let column = 0; column < columns; column += 1) {
        const c = { u: wrap(offset.u + shift + column * pitchU), v: centerV + offset.v + row * pitchV };
        if (fits(c)) {
          found.push(c);
          rowsUsed.add(row);
        }
      }
    }
    if (found.length > best.length) {
      best = found;
      bestRows = rowsUsed.size;
    }
  }
  if (best.length > limit) return { ...empty, tooMany: true, columns, spacing: pitchU };
  return { centers: best, tooMany: false, rows: bestRows, columns, spacing: pitchU };
}

function loopArea(loop: readonly Point2[]) {
  let area = 0;
  for (let i = 0, j = loop.length - 1; i < loop.length; j = i, i += 1) area += (loop[j].u - loop[i].u) * (loop[j].v + loop[i].v);
  return area / 2;
}

/** A closed line measured along its length: its corners, and how far each one lies along it from the first. */
type MeasuredPath = { points: Point2[]; along: number[]; length: number };

function measuredPath(points: Point2[]): MeasuredPath {
  const along = [0];
  for (let i = 1; i <= points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i % points.length];
    along.push(along[i - 1] + Math.hypot(b.u - a.u, b.v - a.v));
  }
  return { points, along, length: along[points.length] };
}

/** The point `distance` along the closed line from its first corner. */
function pointAlong(path: MeasuredPath, distance: number): Point2 {
  const d = ((distance % path.length) + path.length) % path.length;
  let index = 0;
  while (index < path.points.length - 1 && path.along[index + 1] <= d) index += 1;
  const a = path.points[index];
  const b = path.points[(index + 1) % path.points.length];
  const span = path.along[index + 1] - path.along[index];
  const t = span > EPSILON ? (d - path.along[index]) / span : 0;
  return { u: a.u + (b.u - a.u) * t, v: a.v + (b.v - a.v) * t };
}

/** Shares `total` out over the sides in proportion to their lengths, every side at least one (largest remainder). */
function shareOut(lengths: readonly number[], total: number) {
  const sum = lengths.reduce((a, b) => a + b, 0);
  const exact = lengths.map((length) => (length / sum) * total);
  const counts = exact.map((value) => Math.max(1, Math.floor(value)));
  let left = total - counts.reduce((a, b) => a + b, 0);
  const order = exact.map((value, index) => ({ index, rest: value - Math.floor(value) })).sort((a, b) => b.rest - a.rest);
  for (let k = 0; left > 0; k = (k + 1) % order.length, left -= 1) counts[order[k].index] += 1;
  return counts;
}

/**
 * The hole centres of a ring along the face's outer edge (#1232), before they are checked against the face: the
 * edge is set in by the margin and half a hole, so each hole keeps the margin to it, and the holes go round that
 * line evenly with no gap where the ring closes. With corner holes every bend sharper than a circle's facets gets a
 * hole and each side between two is shared out on its own; else the first hole sits `perimeterStart` along the
 * line from its topmost point. The spacing is evened out to fit the line, and never comes below what keeps two
 * holes apart.
 */
function perimeterRing(
  runtime: ManifoldToplevel,
  loops: readonly Point2[][],
  settings: HolePatternSettings,
  /** How thick the wall is behind the face: where a hole sloping through it comes out. */
  wall: number,
): { centers: Point2[]; tooMany: boolean; length: number; onCorners: boolean } {
  const none = { centers: [], tooMany: false, length: 0, onCorners: false };
  const outer = loops.reduce((best, loop) => (Math.abs(loopArea(loop)) > Math.abs(loopArea(best)) ? loop : best));
  const size = holeFootprintSize(settings);
  // A hole sloping through the wall is longer on the face and comes out shifted; the ring keeps clear of both ends.
  const squash = tiltSquash(settings);
  const shift = Math.abs(holeExitShift(settings, wall).v);
  const inset = Math.max(0, settings.margin) + Math.max(size.width, size.height / squash) / 2 + shift;
  const made: { delete(): void }[] = [];
  let polygons: Point2[][];
  try {
    const region = new runtime.CrossSection([outer.map((point): [number, number] => [point.u, point.v])], "EvenOdd");
    made.push(region);
    // Round keeps a notch in the edge a smooth bend for the ring; the face's own corners stay corners.
    const shrunk = inset > 0 ? region.offset(-inset, "Round", 2, 48) : region;
    if (shrunk !== region) made.push(shrunk);
    const simple = shrunk.simplify(1e-6);
    made.push(simple);
    polygons = simple.toPolygons().map((polygon) => polygon.map((point) => ({ u: point[0], v: point[1] })));
  } finally {
    made.forEach((section) => section.delete());
  }
  if (!polygons.length) return none;
  let line = polygons.reduce((best, polygon) => (Math.abs(loopArea(polygon)) > Math.abs(loopArea(best)) ? polygon : best));
  if (line.length < 3) return none;
  // Counter-clockwise in the face's frame, so the ring runs the same way on every face.
  if (loopArea(line) < 0) line = [...line].reverse();

  const turnAt = (index: number) => {
    const a = line[(index - 1 + line.length) % line.length];
    const b = line[index];
    const c = line[(index + 1) % line.length];
    const into = Math.atan2(b.v - a.v, b.u - a.u);
    const out = Math.atan2(c.v - b.v, c.u - b.u);
    return Math.abs(Math.atan2(Math.sin(out - into), Math.cos(out - into)));
  };
  const corners = settings.perimeterCorners === false ? [] : line.map((_, index) => index).filter((index) => turnAt(index) >= PERIMETER_CORNER_TURN);
  // The topmost corner (the left one of two at the same height) starts the ring: on a plate, a corner at the top.
  const topmost = (indices: number[]) => indices.reduce((best, index) => {
    const p = line[index];
    const q = line[best];
    return p.v > q.v + 1e-4 || (Math.abs(p.v - q.v) <= 1e-4 && p.u < q.u) ? index : best;
  }, indices[0]);
  const first = topmost(corners.length ? corners : line.map((_, index) => index));
  const path = measuredPath([...line.slice(first), ...line.slice(0, first)]);
  if (path.length < EPSILON) return none;

  const minStep = holePatternMinSpacing({ ...settings, arrangement: "grid" });
  const spacing = Math.max(minStep, settings.spacing);
  // What the line holds at the least spacing; more would overlap.
  const most = Math.max(1, Math.floor(path.length / minStep + EPSILON));
  const wanted = settings.perimeterBy === "count"
    ? Math.max(1, Math.round(settings.perimeterCount ?? HOLE_PATTERN_MIN_PERIMETER_COUNT))
    : Math.max(1, Math.round(path.length / spacing));
  const total = Math.min(wanted, most);
  if (total > (settings.allowMany ? HOLE_PATTERN_MANY_HOLES : HOLE_PATTERN_MAX_HOLES)) return { ...none, tooMany: true };

  const cornerAlong = corners.map((index) => path.along[(index - first + line.length) % line.length]).sort((a, b) => a - b);
  const centers: Point2[] = [];
  // By spacing every side gets at least its corner's hole; a number too small for the corners goes round evenly.
  const onCorners = cornerAlong.length >= 2 && (settings.perimeterBy !== "count" || total >= cornerAlong.length);
  if (onCorners) {
    const sides = cornerAlong.map((start, index) => (index + 1 < cornerAlong.length ? cornerAlong[index + 1] : path.length) - start);
    const counts = settings.perimeterBy === "count" ? shareOut(sides, total) : sides.map((side) => Math.max(1, Math.round(side / spacing)));
    sides.forEach((side, index) => {
      const pieces = Math.max(1, Math.min(counts[index], Math.floor(side / minStep + EPSILON)));
      for (let k = 0; k < pieces; k += 1) centers.push(pointAlong(path, cornerAlong[index] + (side * k) / pieces));
    });
  } else {
    const start = Math.max(0, settings.perimeterStart ?? 0);
    for (let k = 0; k < total; k += 1) centers.push(pointAlong(path, start + (path.length * k) / total));
  }
  return { centers, tooMany: false, length: path.length, onCorners };
}

/** A rectangle as an outline, for tests and for faces known to be plain rectangles. */
export function rectangleOutline(minU: number, minV: number, maxU: number, maxV: number): FaceOutline {
  return {
    loops: [[
      { u: minU, v: minV },
      { u: maxU, v: minV },
      { u: maxU, v: maxV },
      { u: minU, v: maxV },
    ]],
  };
}

/** The least clear wall between two neighbouring holes that the tool allows, in mm. */
export const HOLE_PATTERN_MIN_WALL = 0.4;

/** Do two copies of a convex outline, one moved by (dU, dV), come closer than `gap`? */
function footprintsCloserThan(polygon: readonly Point2[], dU: number, dV: number, gap: number) {
  const moved = polygon.map((point) => ({ u: point.u + dU, v: point.v + dV }));
  if (moved.some((point) => insideConvex(polygon, point)) || polygon.some((point) => insideConvex(moved, point))) return true;
  let nearest = Infinity;
  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    for (let j = 0; j < moved.length; j += 1) {
      nearest = Math.min(nearest, segmentSegmentDistance(a, b, moved[j], moved[(j + 1) % moved.length]));
      if (nearest < gap) return true;
    }
  }
  return false;
}

/**
 * Where a hole's neighbours sit, relative to it: along the row and in the next row (straight above, or half a spacing
 * over in a staggered pattern, and then also two rows up, which tall holes can reach first).
 */
function neighbourOffsets(settings: Pick<HolePatternSettings, "form" | "arrangement" | "spacing" | "rowSpacing">): Point2[] {
  const spacing = Math.max(HOLE_PATTERN_MIN_SIZE, settings.spacing);
  // Round the edge a hole's neighbours are the ones before and after it.
  if (settings.arrangement === "perimeter") return [{ u: spacing, v: 0 }];
  const row = holePatternRowSpacing(settings);
  return settings.arrangement === "staggered"
    ? [{ u: spacing, v: 0 }, { u: spacing / 2, v: row }, { u: 0, v: row * 2 }]
    : [{ u: spacing, v: 0 }, { u: 0, v: row }];
}

/** The least distance at which `place(distance)` keeps two holes `gap` apart, found by halving. */
function leastClearDistance(polygon: readonly Point2[], gap: number, high: number, place: (distance: number) => Point2) {
  let low = 0;
  for (let step = 0; step < 40; step += 1) {
    const middle = (low + high) / 2;
    const offset = place(middle);
    if (footprintsCloserThan(polygon, offset.u, offset.v, gap)) low = middle;
    else high = middle;
  }
  return high;
}

/** The clear distance between a hole's outline and a copy of it moved by (dU, dV); 0 where they overlap. */
function footprintGap(polygon: readonly Point2[], dU: number, dV: number) {
  const moved = polygon.map((point) => ({ u: point.u + dU, v: point.v + dV }));
  if (moved.some((point) => insideConvex(polygon, point)) || polygon.some((point) => insideConvex(moved, point))) return 0;
  let nearest = Infinity;
  for (let i = 0; i < polygon.length; i += 1) {
    for (let j = 0; j < moved.length; j += 1) {
      nearest = Math.min(nearest, segmentSegmentDistance(polygon[i], polygon[(i + 1) % polygon.length], moved[j], moved[(j + 1) % moved.length]));
    }
  }
  return nearest;
}

/** How far apart two copies of the outline can stand along u and along v and still come within `gap` of each other. */
function footprintReach(polygon: readonly Point2[], gap: number) {
  let u = 0;
  let v = 0;
  for (const point of polygon) {
    u = Math.max(u, Math.abs(point.u));
    v = Math.max(v, Math.abs(point.v));
  }
  return { u: u * 2 + gap, v: v * 2 + gap };
}

/** The most rows above a hole that are looked at for a turned hole; one reaching further is beyond the size limit. */
const TURNED_MAX_ROWS = 800;

/**
 * Where the neighbours of a turned rectangle or slot sit that can come within `gap` of it: along its row and in the rows above (the
 * rows below are the same pairs seen from the other hole). A turned hole has no mirror line along the frame, so the
 * nearest one can be a diagonal neighbour or one several rows up, not just the next in the row or the row above.
 */
function turnedNeighbourOffsets(polygon: readonly Point2[], spacing: number, row: number, staggered: boolean, gap: number): Point2[] {
  const reach = footprintReach(polygon, gap);
  const offsets: Point2[] = [{ u: spacing, v: 0 }];
  for (let k = 2; k * spacing < reach.u; k += 1) offsets.push({ u: k * spacing, v: 0 });
  for (let j = 1; j <= TURNED_MAX_ROWS && (j === 1 || j * row < reach.v); j += 1) {
    const shift = staggered && j % 2 === 1 ? spacing / 2 : 0;
    for (let k = Math.ceil((-reach.u - shift) / spacing); k * spacing + shift < reach.u; k += 1) offsets.push({ u: k * spacing + shift, v: j * row });
  }
  return offsets;
}

/**
 * How high above a hole, straight up from (u, 0), a copy of it must stand to keep `gap` clear: the top of the zone where
 * the two come closer, or null if a copy on that line never does. The clear distance changes convexly along the line,
 * so its lowest point is found by thirds and the top edge of the zone by halving above it.
 */
function clearHeightAbove(polygon: readonly Point2[], gap: number, u: number, high: number): number | null {
  let low = -high;
  let top = high;
  for (let step = 0; step < 60; step += 1) {
    const a = low + (top - low) / 3;
    const b = top - (top - low) / 3;
    if (footprintGap(polygon, u, a) <= footprintGap(polygon, u, b)) top = b;
    else low = a;
  }
  let inside = (low + top) / 2;
  if (footprintGap(polygon, u, inside) >= gap) return null;
  let clear = high;
  for (let step = 0; step < 40; step += 1) {
    const middle = (inside + clear) / 2;
    if (footprintGap(polygon, u, middle) < gap) inside = middle;
    else clear = middle;
  }
  return clear;
}

/**
 * The least row spacing for a turned rectangle or slot at this spacing along the row: every row above has to clear every hole of
 * the row below that it can reach, which a single halving cannot find, so each such pair gives the height it needs
 * and the rows are raised until all of them are met.
 */
function turnedMinRowSpacing(polygon: readonly Point2[], gap: number, spacing: number, staggered: boolean) {
  const reach = footprintReach(polygon, gap);
  const needFromRow = (j: number) => {
    const shift = staggered && j % 2 === 1 ? spacing / 2 : 0;
    let need = 0;
    for (let k = Math.ceil((-reach.u - shift) / spacing); k * spacing + shift < reach.u; k += 1) {
      const height = clearHeightAbove(polygon, gap, k * spacing + shift, reach.v);
      if (height !== null) need = Math.max(need, height / j);
    }
    return need;
  };
  let row = Math.max(HOLE_PATTERN_MIN_SIZE, needFromRow(1));
  const checked = new Map<number, number>([[1, row]]);
  for (let pass = 0; pass < 20; pass += 1) {
    let raised = row;
    for (let j = 2; j <= TURNED_MAX_ROWS && j * row < reach.v; j += 1) {
      let need = checked.get(j);
      if (need === undefined) {
        need = needFromRow(j);
        checked.set(j, need);
      }
      raised = Math.max(raised, need);
    }
    if (raised <= row + EPSILON) break;
    row = raised;
  }
  return row;
}

/**
 * The smallest spacing at which neighbouring holes of this shape keep a wall of `wall`
 * (default `HOLE_PATTERN_MIN_WALL`): a grid compares along both axes, a staggered
 * pattern along the row and along the diagonal. Hexagons that interlock in a
 * staggered pattern can stand closer than their corner-to-corner size. A rectangle or
 * slot spaces its rows on its own (#975), so only its neighbour in the row counts.
 */
export function holePatternMinSpacing(
  settings: FootprintSettings & Pick<HolePatternSettings, "arrangement">,
  wall = HOLE_PATTERN_MIN_WALL,
) {
  // Holes sloping through the wall are parallel: the wall between them is measured square to them, where a step of dv
  // on the face is dv times cos of the slope.
  const polygon = holeCrossSection(settings);
  const squash = tiltSquash(settings);
  const gap = Math.max(HOLE_PATTERN_MIN_WALL, wall);
  const high = (holeFootprintSize(settings).width + holeFootprintSize(settings).height) * 2 + gap;
  if (holePatternHasRowSpacing(settings.form)) {
    return Math.max(HOLE_PATTERN_MIN_SIZE, leastClearDistance(polygon, gap, high, (distance) => ({ u: distance, v: 0 })));
  }
  const directions = settings.arrangement === "staggered"
    ? [{ u: 1, v: 0 }, { u: 0.5, v: STAGGER_ROW_RATIO }]
    : [{ u: 1, v: 0 }, { u: 0, v: 1 }];
  let needed = HOLE_PATTERN_MIN_SIZE;
  for (const direction of directions) {
    needed = Math.max(needed, leastClearDistance(polygon, gap, high / squash, (distance) => ({ u: direction.u * distance, v: direction.v * distance * squash })));
  }
  return needed;
}

/**
 * The smallest row spacing of a rectangle or slot at which the rows keep a wall of `wall` (#975), for the spacing
 * along the row that is set: straight above in a grid, half a spacing over in a staggered pattern.
 */
export function holePatternMinRowSpacing(
  settings: FootprintSettings & Pick<HolePatternSettings, "arrangement" | "spacing">,
  wall = HOLE_PATTERN_MIN_WALL,
) {
  // Worked out square to the holes, where the rows stand cos(slope) times closer than on the face (see holePatternMinSpacing).
  const polygon = holeCrossSection(settings);
  const squash = tiltSquash(settings);
  const gap = Math.max(HOLE_PATTERN_MIN_WALL, wall);
  if (holeTurn(settings) !== 0) {
    return Math.max(HOLE_PATTERN_MIN_SIZE, turnedMinRowSpacing(polygon, gap, Math.max(HOLE_PATTERN_MIN_SIZE, settings.spacing), settings.arrangement === "staggered") / squash);
  }
  const high = (holeFootprintSize(settings).width + holeFootprintSize(settings).height) * 2 + gap;
  const over = settings.arrangement === "staggered" ? Math.max(HOLE_PATTERN_MIN_SIZE, settings.spacing) / 2 : 0;
  const next = leastClearDistance(polygon, gap, high, (distance) => ({ u: over, v: distance }));
  // Two rows up stands straight above again.
  const twoUp = over ? leastClearDistance(polygon, gap, high, (distance) => ({ u: 0, v: distance })) / 2 : 0;
  return Math.max(HOLE_PATTERN_MIN_SIZE, next / squash, twoUp / squash);
}

/**
 * The wall between two neighbouring holes (#239): the least clear distance between a hole and
 * its neighbours at the current spacing, which is what the print's wall thickness comes to.
 * Holes that overlap have none. It is the other way to say the spacing - set one, the other
 * follows: `holePatternMinSpacing(settings, wall)` is the spacing for a wanted wall (and
 * `holePatternMinRowSpacing` the row spacing of a rectangle or slot).
 */
export function holePatternWall(settings: FootprintSettings & Pick<HolePatternSettings, "arrangement" | "spacing" | "rowSpacing">) {
  // Square to the holes: for holes sloping through the wall the rows stand cos(slope) times closer than on the face.
  const polygon = holeCrossSection(settings);
  const squash = tiltSquash(settings);
  if (holeTurn(settings) !== 0 && settings.arrangement !== "perimeter") {
    const spacing = Math.max(HOLE_PATTERN_MIN_SIZE, settings.spacing);
    const row = holePatternRowSpacing(settings) * squash;
    const staggered = settings.arrangement === "staggered";
    // The next one in the row and in the row above bound the wall; the others that could come closer lie within that much.
    const first = Math.min(footprintGap(polygon, spacing, 0), footprintGap(polygon, staggered ? spacing / 2 : 0, row));
    let nearest = first;
    for (const offset of turnedNeighbourOffsets(polygon, spacing, row, staggered, first)) {
      nearest = Math.min(nearest, footprintGap(polygon, offset.u, offset.v));
      if (nearest === 0) return 0;
    }
    return Number.isFinite(nearest) ? nearest : 0;
  }
  let wall = Infinity;
  for (const offset of neighbourOffsets(settings)) {
    const moved = polygon.map((point) => ({ u: point.u + offset.u, v: point.v + offset.v * squash }));
    if (moved.some((point) => insideConvex(polygon, point)) || polygon.some((point) => insideConvex(moved, point))) return 0;
    for (let i = 0; i < polygon.length; i += 1) {
      for (let j = 0; j < moved.length; j += 1) {
        wall = Math.min(wall, segmentSegmentDistance(polygon[i], polygon[(i + 1) % polygon.length], moved[j], moved[(j + 1) % moved.length]));
      }
    }
  }
  return Number.isFinite(wall) ? wall : 0;
}

/** Keeps every number of the settings inside what the tool offers. */
export function normalizeHolePattern(input: Partial<HolePatternSettings>): HolePatternSettings {
  const base = DEFAULT_HOLE_PATTERN;
  const forms: HoleForm[] = ["round", "square", "rectangle", "hexagon", "slot", "custom"];
  const number = (value: unknown, fallback: number, min: number, max: number) =>
    typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
  const form = forms.includes(input.form as HoleForm) ? input.form as HoleForm : base.form;
  const arrangement: HoleArrangement = input.arrangement === "grid" || input.arrangement === "staggered" || input.arrangement === "perimeter" || input.arrangement === "corners" ? input.arrangement : base.arrangement;
  const size = number(input.size, base.size, HOLE_PATTERN_MIN_SIZE, HOLE_PATTERN_MAX_SIZE);
  const height = number(input.height, size, HOLE_PATTERN_MIN_SIZE, HOLE_PATTERN_MAX_SIZE);
  const holeType: HoleType = input.holeType === "counterbore" || input.holeType === "countersink" ? input.holeType : "plain";
  const custom = {
    ...(typeof input.customId === "string" && input.customId ? { customId: input.customId } : {}),
    ...(typeof input.customWidth === "number" && Number.isFinite(input.customWidth) ? { customWidth: Math.max(HOLE_PATTERN_MIN_SIZE, input.customWidth) } : {}),
    ...(typeof input.customDepth === "number" && Number.isFinite(input.customDepth) ? { customDepth: Math.max(HOLE_PATTERN_MIN_SIZE, input.customDepth) } : {}),
    ...(input.customRound === true ? { customRound: true } : {}),
  };
  const head = {
    headSize: holeHeadSize({ size, headSize: input.headSize }),
    headDepth: holeHeadDepth({ size, headDepth: input.headDepth }),
    ...(holeHeadAngle(input) !== DEFAULT_HOLE_HEAD_ANGLE ? { headAngle: holeHeadAngle(input) } : {}),
  };
  const holeAngle = normalizeHoleAngle(input.holeAngle);
  const holeTilt = normalizeHoleTilt(input.holeTilt);
  // Holes that overlap would only merge into one wide cut.
  const minSpacing = holePatternMinSpacing({ form, size, height, holeAngle, holeTilt, arrangement, holeType, ...head, ...custom });
  const spacing = Math.max(minSpacing, number(input.spacing, base.spacing, HOLE_PATTERN_MIN_SIZE, HOLE_PATTERN_MAX_SPACING));
  // A rectangle or slot without a row spacing of its own (saved before #975) keeps the rows where its spacing put them.
  const rowSpacing = holePatternHasRowSpacing(form)
    ? Math.max(
        holePatternMinRowSpacing({ form, size, height, holeAngle, holeTilt, arrangement, spacing }),
        number(input.rowSpacing, holePatternRowSpacing({ form, arrangement, spacing }), HOLE_PATTERN_MIN_SIZE, HOLE_PATTERN_MAX_SPACING),
      )
    : undefined;
  return {
    form,
    size,
    height,
    // Kept while another form is chosen, like the hole type, so going back to a rectangle or slot finds it turned as it was.
    ...(holeAngle !== 0 ? { holeAngle } : {}),
    // Kept while a head or an own shape is chosen, which stand straight, so going back finds the holes sloped as they were.
    ...(holeTilt !== 0 ? { holeTilt } : {}),
    spacing,
    ...(rowSpacing !== undefined ? { rowSpacing } : {}),
    arrangement,
    margin: number(input.margin, base.margin, 0, HOLE_PATTERN_MAX_MARGIN),
    ...(input.edgeBorder !== undefined ? { edgeBorder: number(input.edgeBorder, 0, 0, HOLE_PATTERN_MAX_EDGE_BORDER) } : {}),
    ...(input.topLayer !== undefined ? { topLayer: Boolean(input.topLayer) } : {}),
    ...(input.topLayerThickness !== undefined ? { topLayerThickness: number(input.topLayerThickness, HOLE_PATTERN_TOP_LAYER_DEFAULT, HOLE_PATTERN_TOP_LAYER_MIN, 100) } : {}),
    ...(typeof input.topLayerColor === "string" && /^#[0-9a-f]{6}$/i.test(input.topLayerColor) ? { topLayerColor: input.topLayerColor.toLowerCase() } : {}),
    // Kept while another form or arrangement is chosen, so going back finds them as they were.
    holeType,
    ...head,
    perimeterBy: input.perimeterBy === "count" ? "count" : "spacing",
    perimeterCount: Math.round(number(input.perimeterCount, 8, HOLE_PATTERN_MIN_PERIMETER_COUNT, HOLE_PATTERN_MAX_PERIMETER_COUNT)),
    perimeterCorners: input.perimeterCorners !== false,
    perimeterStart: number(input.perimeterStart, 0, 0, HOLE_PATTERN_MAX_PERIMETER_START),
    ...(input.cornerToCenter === true ? { cornerToCenter: true } : {}),
    // Kept as given (3 to 40): a round face takes it as it is, a rectangle the even number at or below it.
    ...(typeof input.cornerCount === "number" && Number.isFinite(input.cornerCount) && Math.round(input.cornerCount) !== MIN_CORNER_COUNT ? { cornerCount: normalizeCornerCount(input.cornerCount, true) } : {}),
    ...(input.rack === true ? { rack: true } : {}),
    ...(input.rack === true && normalizeRackUnits(input.rackUnits) > 0 ? { rackUnits: normalizeRackUnits(input.rackUnits) } : {}),
    ...custom,
    depth: typeof input.depth === "number" && Number.isFinite(input.depth) && input.depth > 0 ? Math.min(input.depth, 1000) : null,
    ...(input.allowMany === true ? { allowMany: true } : {}),
  };
}
