/**
 * Hole pattern (#223): where the holes of a perforated face go. Pure numbers in
 * the 2D frame of the face - `u` along the frame's x axis, `v` along its z
 * axis - so the editor and the tests share one calculation.
 */
export type Point2 = { u: number; v: number };

export type HoleForm = "round" | "square" | "rectangle" | "hexagon" | "slot";
export type HoleArrangement = "grid" | "staggered";

export type HolePatternSettings = {
  form: HoleForm;
  /** Round: diameter. Square: side. Rectangle and slot: width (along the frame's x). Hexagon: diameter across the corners. */
  size: number;
  /** Rectangle and slot: height (along the frame's z). The other forms follow `size`. */
  height: number;
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

export const DEFAULT_HOLE_PATTERN: HolePatternSettings = {
  form: "hexagon",
  size: 6,
  height: 6,
  spacing: 9,
  arrangement: "staggered",
  margin: 4,
  depth: null,
};

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

export function holeFootprintSize(settings: Pick<HolePatternSettings, "form" | "size" | "height">): { width: number; height: number } {
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

/** The outline of one hole around its centre, as a convex polygon. */
export function holeFootprintPolygon(settings: Pick<HolePatternSettings, "form" | "size" | "height">): Point2[] {
  const { width, height } = holeFootprintSize(settings);
  const halfW = width / 2;
  const halfH = height / 2;
  switch (settings.form) {
    case "round": {
      const count = 24;
      return Array.from({ length: count }, (_, index) => {
        const angle = (index / count) * Math.PI * 2;
        return { u: Math.cos(angle) * halfW, v: Math.sin(angle) * halfH };
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
          const bulge = { a: Math.cos(angle) * radius, b: Math.sin(angle) * radius };
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

function segmentSegmentDistance(a: Point2, b: Point2, c: Point2, d: Point2) {
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
};

/**
 * The centres of a hole pattern on a face. Only holes that lie wholly inside
 * the face, at least `margin` away from its edge and from any opening, are
 * kept. The lattice is centred on the face; of the four ways to centre it
 * (on a hole or between holes, along each axis) the one that fits most holes
 * wins. A staggered pattern shifts every second row by half a spacing and
 * packs the rows closer, so each hole has neighbours one spacing away.
 */
export function holePatternCenters(outline: FaceOutline, settings: HolePatternSettings): HolePatternResult {
  const empty: HolePatternResult = { centers: [], tooMany: false, rows: 0 };
  const footprint = holeFootprintPolygon(settings);
  const size = holeFootprintSize(settings);
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
  const centerU = (minU + maxU) / 2;
  const centerV = (minV + maxV) / 2;
  const halfSpanU = Math.ceil((maxU - minU) / 2 / pitchU) + 1;
  const halfSpanV = Math.ceil((maxV - minV) / 2 / pitchV) + 1;
  if ((halfSpanU * 2 + 1) * (halfSpanV * 2 + 1) > MAX_CANDIDATES) return { ...empty, tooMany: true };

  const segments = loopSegments(loops);
  const reach = Math.max(size.width, size.height) / 2 + margin;

  const fits = (c: Point2) => {
    if (!insideRegion(loops, c)) return false;
    for (const corner of footprint) {
      if (!insideRegion(loops, { u: c.u + corner.u, v: c.v + corner.v })) return false;
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

  let best: Point2[] = [];
  let bestRows = 0;
  const offsets = [
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
    if (found.length > best.length) {
      best = found;
      bestRows = rowsUsed.size;
    }
  }

  if (best.length > (settings.allowMany ? HOLE_PATTERN_MANY_HOLES : HOLE_PATTERN_MAX_HOLES)) return { centers: [], tooMany: true, rows: 0 };
  return { centers: best, tooMany: false, rows: bestRows };
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

/**
 * The smallest spacing at which neighbouring holes of this shape keep a wall of `wall`
 * (default `HOLE_PATTERN_MIN_WALL`): a grid compares along both axes, a staggered
 * pattern along the row and along the diagonal. Hexagons that interlock in a
 * staggered pattern can stand closer than their corner-to-corner size. A rectangle or
 * slot spaces its rows on its own (#975), so only its neighbour in the row counts.
 */
export function holePatternMinSpacing(
  settings: Pick<HolePatternSettings, "form" | "size" | "height" | "arrangement">,
  wall = HOLE_PATTERN_MIN_WALL,
) {
  const polygon = holeFootprintPolygon(settings);
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
    needed = Math.max(needed, leastClearDistance(polygon, gap, high, (distance) => ({ u: direction.u * distance, v: direction.v * distance })));
  }
  return needed;
}

/**
 * The smallest row spacing of a rectangle or slot at which the rows keep a wall of `wall` (#975), for the spacing
 * along the row that is set: straight above in a grid, half a spacing over in a staggered pattern.
 */
export function holePatternMinRowSpacing(
  settings: Pick<HolePatternSettings, "form" | "size" | "height" | "arrangement" | "spacing">,
  wall = HOLE_PATTERN_MIN_WALL,
) {
  const polygon = holeFootprintPolygon(settings);
  const gap = Math.max(HOLE_PATTERN_MIN_WALL, wall);
  const high = (holeFootprintSize(settings).width + holeFootprintSize(settings).height) * 2 + gap;
  const over = settings.arrangement === "staggered" ? Math.max(HOLE_PATTERN_MIN_SIZE, settings.spacing) / 2 : 0;
  const next = leastClearDistance(polygon, gap, high, (distance) => ({ u: over, v: distance }));
  // Two rows up stands straight above again.
  const twoUp = over ? leastClearDistance(polygon, gap, high, (distance) => ({ u: 0, v: distance })) / 2 : 0;
  return Math.max(HOLE_PATTERN_MIN_SIZE, next, twoUp);
}

/**
 * The wall between two neighbouring holes (#239): the least clear distance between a hole and
 * its neighbours at the current spacing, which is what the print's wall thickness comes to.
 * Holes that overlap have none. It is the other way to say the spacing - set one, the other
 * follows: `holePatternMinSpacing(settings, wall)` is the spacing for a wanted wall (and
 * `holePatternMinRowSpacing` the row spacing of a rectangle or slot).
 */
export function holePatternWall(settings: Pick<HolePatternSettings, "form" | "size" | "height" | "arrangement" | "spacing" | "rowSpacing">) {
  const polygon = holeFootprintPolygon(settings);
  let wall = Infinity;
  for (const offset of neighbourOffsets(settings)) {
    const moved = polygon.map((point) => ({ u: point.u + offset.u, v: point.v + offset.v }));
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
  const forms: HoleForm[] = ["round", "square", "rectangle", "hexagon", "slot"];
  const number = (value: unknown, fallback: number, min: number, max: number) =>
    typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
  const form = forms.includes(input.form as HoleForm) ? input.form as HoleForm : base.form;
  const arrangement: HoleArrangement = input.arrangement === "grid" ? "grid" : input.arrangement === "staggered" ? "staggered" : base.arrangement;
  const size = number(input.size, base.size, HOLE_PATTERN_MIN_SIZE, HOLE_PATTERN_MAX_SIZE);
  const height = number(input.height, size, HOLE_PATTERN_MIN_SIZE, HOLE_PATTERN_MAX_SIZE);
  // Holes that overlap would only merge into one wide cut.
  const minSpacing = holePatternMinSpacing({ form, size, height, arrangement });
  const spacing = Math.max(minSpacing, number(input.spacing, base.spacing, HOLE_PATTERN_MIN_SIZE, HOLE_PATTERN_MAX_SPACING));
  // A rectangle or slot without a row spacing of its own (saved before #975) keeps the rows where its spacing put them.
  const rowSpacing = holePatternHasRowSpacing(form)
    ? Math.max(
        holePatternMinRowSpacing({ form, size, height, arrangement, spacing }),
        number(input.rowSpacing, holePatternRowSpacing({ form, arrangement, spacing }), HOLE_PATTERN_MIN_SIZE, HOLE_PATTERN_MAX_SPACING),
      )
    : undefined;
  return {
    form,
    size,
    height,
    spacing,
    ...(rowSpacing !== undefined ? { rowSpacing } : {}),
    arrangement,
    margin: number(input.margin, base.margin, 0, HOLE_PATTERN_MAX_MARGIN),
    depth: typeof input.depth === "number" && Number.isFinite(input.depth) && input.depth > 0 ? Math.min(input.depth, 1000) : null,
    ...(input.allowMany === true ? { allowMany: true } : {}),
  };
}
