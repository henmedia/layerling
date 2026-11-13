import { circularArcCenter } from "@/lib/sketchCircularArc";
import { polygonInside, type PlanePoint } from "@/lib/sketchContainment";
import type { SketchPoint, SketchProfile, SketchSegment } from "@/types/layerling";

/**
 * A DXF as sketch bodies (#774), the counterpart of the DXF export: a part outline from a laser
 * cutting shop or a supplier comes in as sketch lines and curves, as an SVG does (svgSketch.ts), taken
 * apart into a body for every solid outline and a loose hole for every hole in it (`parts`), so a hole
 * is moved and sized in the 3D editor itself.
 *
 * Read: LINE, ARC, CIRCLE, ELLIPSE, LWPOLYLINE and POLYLINE (with bulges, so arcs inside them stay
 * arcs), SPLINE and INSERT (blocks, also nested, moved, turned, scaled, mirrored and in arrays), in
 * model space, on layers that are on and thawed. An arc becomes cubic Bézier pieces of a quarter
 * circle at most, exactly as the SVG import makes them: the sketch builds those back into true arcs
 * (sketchCircularArc.ts). Text, dimensions, hatches and the like carry no outline and are counted and
 * left out. The pieces are joined end to end into closed outlines; what does not close is left out
 * too, and counted. $INSUNITS gives the unit; a file without one is read as millimetres.
 */

export type DxfImportPoint = { x: number; y: number };
type Piece = { start: DxfImportPoint; end: DxfImportPoint; c1?: DxfImportPoint; c2?: DxfImportPoint };

/** A round hole of the drawing: its centre in the sketch's frame (as `profile`) and its diameter, in mm. */
export type DxfRoundHole = { x: number; z: number; diameter: number };

/**
 * The drawing taken apart the way a part is handled in the editor: every solid outline a body of its own, its
 * holes loose holes beside it, so each can be moved and sized there and not only in the sketch.
 */
export type DxfImportParts = {
  /** One sketch per solid outline, with the holes that must stay in it: those with an outline inside them. */
  solids: SketchProfile[];
  /** Holes that are not round, one sketch each. */
  holes: SketchProfile[];
  /** Holes that are whole circles, to come in as cylinders. */
  roundHoles: DxfRoundHole[];
};

export type DxfImportResult = {
  /** All outlines as one sketch. */
  profile: SketchProfile;
  parts: DxfImportParts;
  width: number;
  depth: number;
  /** Closed outlines read. */
  outlines: number;
  /** Outlines that did not close, left out. */
  openLeftOut: number;
  /** Entities that are no outline (text, dimensions, hatches, points...), by type, left out. */
  skipped: Record<string, number>;
  /** The unit the file names, when it is not millimetres (it is converted); null for millimetres or none. */
  unit: string | null;
  /** The file names no unit (or calls itself unitless): it was read as millimetres. */
  unitless: boolean;
  /** Millimetres per drawing unit. */
  scale: number;
};

export class DxfImportError extends Error {
  constructor(public readonly reason: "binary" | "unreadable" | "empty" | "tooComplex", message: string) {
    super(message);
  }
}

/** How high the body of an imported DXF is, as that of an SVG: a flat part to set the thickness of. */
export const DXF_SKETCH_HEIGHT = 4;
/** The colour of an imported DXF body, as that of an SVG. */
export const DXF_SKETCH_COLOR = "#0098c7";

/** As many pieces as a DXF may bring as a sketch. */
export const MAX_DXF_SKETCH_SEGMENTS = 2500;
/** Ends closer than this, in mm, are taken for one point when the pieces are joined. */
export const DXF_JOIN_TOLERANCE = 0.01;
/** A straight piece shorter than this, in mm, is no piece: the CAD kernel cannot make an edge of it. */
const DXF_MIN_PIECE = 1e-6;

/** $INSUNITS: millimetres per unit and the unit's name. 0 is "unitless". */
const UNITS: Record<number, [number, string]> = {
  1: [25.4, "in"], 2: [304.8, "ft"], 3: [1609344, "mi"], 4: [1, "mm"], 5: [10, "cm"], 6: [1000, "m"], 7: [1e6, "km"],
  8: [25.4e-6, "µin"], 9: [0.0254, "mil"], 10: [914.4, "yd"], 13: [0.001, "µm"], 14: [100, "dm"],
};

type Pair = readonly [number, string];
type Entity = { type: string; pairs: Pair[]; vertices?: Entity[] };
type Matrix = readonly [number, number, number, number, number, number]; // x' = a x + c y + e, y' = b x + d y + f
const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

function multiply(m: Matrix, n: Matrix): Matrix {
  return [
    m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

function apply(m: Matrix, point: DxfImportPoint): DxfImportPoint {
  return { x: m[0] * point.x + m[2] * point.y + m[4], y: m[1] * point.x + m[3] * point.y + m[5] };
}

function readPairs(text: string): Pair[] {
  const lines = text.split(/\r\n|\r|\n/);
  const pairs: Pair[] = [];
  for (let index = 0; index + 1 < lines.length; index += 2) {
    const code = Number.parseInt(lines[index].trim(), 10);
    if (!Number.isFinite(code)) throw new DxfImportError("unreadable", "The DXF file could not be read");
    pairs.push([code, lines[index + 1].trim()]);
  }
  return pairs;
}

const num = (value: string | undefined, fallback = 0) => {
  const parsed = value === undefined ? Number.NaN : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const first = (entity: Entity, code: number) => entity.pairs.find(([c]) => c === code)?.[1];
const all = (entity: Entity, code: number) => entity.pairs.filter(([c]) => c === code).map(([, value]) => value);

/** The entities between two markers: each one from its 0 to the next 0, POLYLINE with its VERTEX until SEQEND. */
function entitiesOf(pairs: readonly Pair[], from: number, to: number): Entity[] {
  const entities: Entity[] = [];
  let current: Entity | null = null;
  let polyline: Entity | null = null;
  for (let index = from; index < to; index += 1) {
    const [code, value] = pairs[index];
    if (code === 0) {
      if (value === "VERTEX" && polyline) {
        current = { type: value, pairs: [] };
        polyline.vertices!.push(current);
        continue;
      }
      if (value === "SEQEND") {
        polyline = null;
        current = null;
        continue;
      }
      current = { type: value, pairs: [] };
      if (value === "POLYLINE") {
        current.vertices = [];
        polyline = current;
      } else {
        polyline = null;
      }
      entities.push(current);
      continue;
    }
    current?.pairs.push([code, value]);
  }
  return entities;
}

type Drawing = {
  units: number | null;
  layersOff: Set<string>;
  blocks: Map<string, { base: DxfImportPoint; entities: Entity[] }>;
  entities: Entity[];
};

function readDrawing(text: string): Drawing {
  if (text.startsWith("AutoCAD Binary DXF")) throw new DxfImportError("binary", "A binary DXF cannot be read; save it as an ASCII DXF");
  const pairs = readPairs(text);
  const drawing: Drawing = { units: null, layersOff: new Set(), blocks: new Map(), entities: [] };
  let index = 0;
  while (index < pairs.length) {
    if (pairs[index][0] !== 0 || pairs[index][1] !== "SECTION") {
      index += 1;
      continue;
    }
    const name = pairs[index + 1]?.[1];
    let end = index + 2;
    while (end < pairs.length && !(pairs[end][0] === 0 && pairs[end][1] === "ENDSEC")) end += 1;
    if (name === "HEADER") {
      for (let at = index + 2; at < end; at += 1) {
        if (pairs[at][0] === 9 && pairs[at][1] === "$INSUNITS" && pairs[at + 1]) drawing.units = Math.round(num(pairs[at + 1][1]));
      }
    } else if (name === "TABLES") {
      entitiesOf(pairs, index + 2, end).filter((entity) => entity.type === "LAYER").forEach((layer) => {
        const layerName = first(layer, 2);
        if (layerName === undefined) return;
        // A negative colour is a layer switched off, flag 1 a frozen one.
        if (num(first(layer, 62), 7) < 0 || (Math.round(num(first(layer, 70))) & 1) === 1) drawing.layersOff.add(layerName.toUpperCase());
      });
    } else if (name === "BLOCKS") {
      let blockName: string | null = null;
      let base: DxfImportPoint = { x: 0, y: 0 };
      let start = index + 2;
      for (let at = index + 2; at < end; at += 1) {
        if (pairs[at][0] !== 0) continue;
        if (pairs[at][1] === "BLOCK") {
          let next = at + 1;
          const header: Entity = { type: "BLOCK", pairs: [] };
          while (next < end && pairs[next][0] !== 0) header.pairs.push(pairs[next++]);
          blockName = first(header, 2) ?? null;
          base = { x: num(first(header, 10)), y: num(first(header, 20)) };
          start = next;
          at = next - 1;
        } else if (pairs[at][1] === "ENDBLK" && blockName !== null) {
          drawing.blocks.set(blockName.toUpperCase(), { base, entities: entitiesOf(pairs, start, at) });
          blockName = null;
        }
      }
    } else if (name === "ENTITIES") {
      drawing.entities = entitiesOf(pairs, index + 2, end);
    }
    index = end + 1;
  }
  return drawing;
}

/** Cubic pieces of an elliptical arc C + M cos t + N sin t from t0 over `sweep` (signed), a quarter at most each. */
function ellipticalPieces(center: DxfImportPoint, major: DxfImportPoint, minor: DxfImportPoint, t0: number, sweep: number): Piece[] {
  if (Math.abs(sweep) < 1e-12) return [];
  const count = Math.max(1, Math.ceil(Math.abs(sweep) / (Math.PI / 2) - 1e-9));
  const step = sweep / count;
  const handle = (4 / 3) * Math.tan(step / 4);
  const at = (t: number) => ({ x: center.x + major.x * Math.cos(t) + minor.x * Math.sin(t), y: center.y + major.y * Math.cos(t) + minor.y * Math.sin(t) });
  const tangent = (t: number) => ({ x: -major.x * Math.sin(t) + minor.x * Math.cos(t), y: -major.y * Math.sin(t) + minor.y * Math.cos(t) });
  const pieces: Piece[] = [];
  for (let index = 0; index < count; index += 1) {
    const a = t0 + step * index;
    const b = a + step;
    const start = at(a);
    const end = at(b);
    const ta = tangent(a);
    const tb = tangent(b);
    pieces.push({ start, c1: { x: start.x + handle * ta.x, y: start.y + handle * ta.y }, c2: { x: end.x - handle * tb.x, y: end.y - handle * tb.y }, end });
  }
  return pieces;
}

function arcPieces(center: DxfImportPoint, radius: number, startAngle: number, sweep: number) {
  return ellipticalPieces(center, { x: radius, y: 0 }, { x: 0, y: radius }, startAngle, sweep);
}

/** The piece between two polyline vertices with the first one's bulge: a line, or an arc of 4 atan(bulge). */
function bulgePieces(from: DxfImportPoint, to: DxfImportPoint, bulge: number): Piece[] {
  const chord = Math.hypot(to.x - from.x, to.y - from.y);
  if (chord < 1e-12) return [];
  if (Math.abs(bulge) < 1e-12) return [{ start: from, end: to }];
  const half = chord / 2;
  const sagitta = bulge * half;
  const radius = (half * half + sagitta * sagitta) / (2 * sagitta);
  const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  const left = { x: -(to.y - from.y) / chord, y: (to.x - from.x) / chord };
  const center = { x: mid.x + left.x * (radius - sagitta), y: mid.y + left.y * (radius - sagitta) };
  const pieces = arcPieces(center, Math.abs(radius), Math.atan2(from.y - center.y, from.x - center.x), 4 * Math.atan(bulge));
  if (pieces.length) {
    pieces[0].start = from;
    pieces[pieces.length - 1].end = to;
  }
  return pieces;
}

/** de Boor on span k of a (homogeneous) B-spline: the point and its derivative at u. */
function splineSpan(degree: number, knots: readonly number[], points: ReadonlyArray<readonly number[]>, k: number, u: number) {
  const dim = points[0].length;
  const evaluate = (p: number, ctrl: (i: number) => readonly number[], span: number, knot: (i: number) => number) => {
    const d = Array.from({ length: p + 1 }, (_, j) => [...ctrl(j + span - p)]);
    for (let r = 1; r <= p; r += 1) {
      for (let j = p; j >= r; j -= 1) {
        const i = j + span - p;
        const denominator = knot(i + p - r + 1) - knot(i);
        const alpha = denominator === 0 ? 0 : (u - knot(i)) / denominator;
        for (let c = 0; c < dim; c += 1) d[j][c] = (1 - alpha) * d[j - 1][c] + alpha * d[j][c];
      }
    }
    return d[p];
  };
  const point = evaluate(degree, (i) => points[i], k, (i) => knots[i]);
  if (degree === 0) return { point, derivative: new Array(dim).fill(0) };
  // The derivative is a B-spline of one degree less over the knots without their ends.
  const ctrl = (i: number) => {
    const span = knots[i + degree + 1] - knots[i + 1];
    return points[i + 1].map((value, c) => (span === 0 ? 0 : (degree * (value - points[i][c])) / span));
  };
  const derivative = evaluate(degree - 1, ctrl, k - 1, (i) => knots[i + 1]);
  return { point, derivative };
}

/**
 * A SPLINE as cubic pieces: each knot span cut into pieces that run through the curve's points with its
 * tangents there. For a non-rational spline of degree 3 or less one piece per span is the span itself.
 */
function splinePieces(entity: Entity): Piece[] {
  const degree = Math.round(num(first(entity, 71), 3));
  const knots = all(entity, 40).map((value) => num(value));
  const xs = all(entity, 10).map((value) => num(value));
  const ys = all(entity, 20).map((value) => num(value));
  const weightsGiven = all(entity, 41).map((value) => num(value, 1));
  const count = Math.min(xs.length, ys.length);
  if (count >= degree + 1 && knots.length === count + degree + 1 && degree >= 1) {
    const rational = weightsGiven.length === count && weightsGiven.some((weight) => Math.abs(weight - 1) > 1e-12);
    const weights = rational ? weightsGiven : new Array(count).fill(1);
    const homogeneous = Array.from({ length: count }, (_, index) => [xs[index] * weights[index], ys[index] * weights[index], weights[index]]);
    const split = rational || degree > 3 ? 4 : 1;
    const pieces: Piece[] = [];
    for (let k = degree; k < count; k += 1) {
      const a = knots[k];
      const b = knots[k + 1];
      if (!(b > a)) continue;
      for (let part = 0; part < split; part += 1) {
        const u0 = a + ((b - a) * part) / split;
        const u1 = a + ((b - a) * (part + 1)) / split;
        const end = (u: number) => {
          const { point, derivative } = splineSpan(degree, knots, homogeneous, k, u);
          const w = point[2] || 1;
          const at = { x: point[0] / w, y: point[1] / w };
          return { at, tangent: { x: (derivative[0] - derivative[2] * at.x) / w, y: (derivative[1] - derivative[2] * at.y) / w } };
        };
        const s = end(u0);
        const e = end(u1);
        const third = (u1 - u0) / 3;
        pieces.push({
          start: s.at,
          c1: { x: s.at.x + s.tangent.x * third, y: s.at.y + s.tangent.y * third },
          c2: { x: e.at.x - e.tangent.x * third, y: e.at.y - e.tangent.y * third },
          end: e.at,
        });
      }
    }
    return pieces;
  }
  // Only fit points: a smooth curve through them (Catmull-Rom), as a drawing program shows it.
  const fx = all(entity, 11).map((value) => num(value));
  const fy = all(entity, 21).map((value) => num(value));
  const fits = Array.from({ length: Math.min(fx.length, fy.length) }, (_, index) => ({ x: fx[index], y: fy[index] }));
  const pieces: Piece[] = [];
  for (let index = 0; index + 1 < fits.length; index += 1) {
    const p0 = fits[Math.max(0, index - 1)];
    const p1 = fits[index];
    const p2 = fits[index + 1];
    const p3 = fits[Math.min(fits.length - 1, index + 2)];
    pieces.push({ start: p1, c1: { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 }, c2: { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 }, end: p2 });
  }
  return pieces;
}

/**
 * The object coordinate system of a 2D entity (#774): drawn with its extrusion along -Z, as a mirrored arc
 * often is, x runs the other way. Any other direction is not flat on the drawing and null.
 */
function ocsMatrix(entity: Entity): Matrix | null {
  const nx = num(first(entity, 210), 0);
  const ny = num(first(entity, 220), 0);
  const nz = num(first(entity, 230), 1);
  const length = Math.hypot(nx, ny, nz) || 1;
  if (Math.abs(nx / length) > 1e-9 || Math.abs(ny / length) > 1e-9) return null;
  return nz < 0 ? [-1, 0, 0, 1, 0, 0] : IDENTITY;
}

type Collected = { loops: Piece[][]; open: Piece[][]; skipped: Record<string, number> };

const OUTLINE_TYPES = new Set(["LINE", "ARC", "CIRCLE", "ELLIPSE", "LWPOLYLINE", "POLYLINE", "SPLINE", "INSERT"]);

function transformPiece(matrix: Matrix, piece: Piece): Piece {
  return {
    start: apply(matrix, piece.start),
    end: apply(matrix, piece.end),
    ...(piece.c1 && piece.c2 ? { c1: apply(matrix, piece.c1), c2: apply(matrix, piece.c2) } : {}),
  };
}

function collect(drawing: Drawing, entities: readonly Entity[], matrix: Matrix, out: Collected, depth: number) {
  const skip = (type: string) => {
    out.skipped[type] = (out.skipped[type] ?? 0) + 1;
  };
  for (const entity of entities) {
    // Paper space (a sheet with its frame) and layers that are off or frozen are not the part.
    if (num(first(entity, 67)) === 1) continue;
    if (drawing.layersOff.has((first(entity, 8) ?? "0").toUpperCase())) continue;
    if (!OUTLINE_TYPES.has(entity.type)) {
      skip(entity.type);
      continue;
    }
    const ocs = ocsMatrix(entity);
    if (!ocs) {
      skip(`${entity.type} (3D)`);
      continue;
    }
    const place = multiply(matrix, ocs);
    const add = (pieces: Piece[], closed: boolean) => {
      const placed = pieces.map((piece) => transformPiece(place, piece));
      if (placed.length) (closed ? out.loops : out.open).push(placed);
    };
    const point = (x: number, y: number): DxfImportPoint => ({ x: num(first(entity, x)), y: num(first(entity, y)) });
    switch (entity.type) {
      case "LINE":
        add([{ start: point(10, 20), end: point(11, 21) }], false);
        break;
      case "CIRCLE":
        add(arcPieces(point(10, 20), num(first(entity, 40)), 0, Math.PI * 2), true);
        break;
      case "ARC": {
        const start = (num(first(entity, 50)) * Math.PI) / 180;
        let sweep = (num(first(entity, 51)) * Math.PI) / 180 - start;
        while (sweep <= 0) sweep += Math.PI * 2;
        add(arcPieces(point(10, 20), num(first(entity, 40)), start, sweep), false);
        break;
      }
      case "ELLIPSE": {
        const center = point(10, 20);
        const major = point(11, 21);
        const ratio = num(first(entity, 40), 1);
        const minor = { x: -major.y * ratio, y: major.x * ratio };
        const t0 = num(first(entity, 41), 0);
        let sweep = num(first(entity, 42), Math.PI * 2) - t0;
        while (sweep <= 1e-12) sweep += Math.PI * 2;
        const whole = Math.abs(sweep - Math.PI * 2) < 1e-9;
        add(ellipticalPieces(center, major, minor, t0, whole ? Math.PI * 2 : sweep), whole);
        break;
      }
      case "LWPOLYLINE":
      case "POLYLINE": {
        const flags = Math.round(num(first(entity, 70)));
        // 3D polylines and polyface or polygon meshes are no outline on the drawing.
        if (entity.type === "POLYLINE" && (flags & (8 | 16 | 64)) !== 0) {
          skip("POLYLINE (3D)");
          break;
        }
        const vertices: Array<{ at: DxfImportPoint; bulge: number }> = [];
        if (entity.type === "LWPOLYLINE") {
          let current: { at: DxfImportPoint; bulge: number } | null = null;
          entity.pairs.forEach(([code, value]) => {
            if (code === 10) {
              current = { at: { x: num(value), y: 0 }, bulge: 0 };
              vertices.push(current);
            } else if (code === 20 && current) current.at.y = num(value);
            else if (code === 42 && current) current.bulge = num(value);
          });
        } else {
          (entity.vertices ?? []).forEach((vertex) => {
            // Spline frame control points are not on the curve.
            if ((Math.round(num(first(vertex, 70))) & 16) !== 0) return;
            vertices.push({ at: { x: num(first(vertex, 10)), y: num(first(vertex, 20)) }, bulge: num(first(vertex, 42)) });
          });
        }
        const closed = (flags & 1) === 1;
        const pieces: Piece[] = [];
        const last = closed ? vertices.length : vertices.length - 1;
        for (let index = 0; index < last; index += 1) {
          pieces.push(...bulgePieces(vertices[index].at, vertices[(index + 1) % vertices.length].at, vertices[index].bulge));
        }
        add(pieces, closed && pieces.length > 0);
        break;
      }
      case "SPLINE": {
        const pieces = splinePieces(entity);
        const closed = (Math.round(num(first(entity, 70))) & 1) === 1 && pieces.length > 0
          && Math.hypot(pieces[0].start.x - pieces[pieces.length - 1].end.x, pieces[0].start.y - pieces[pieces.length - 1].end.y) < 1e-6;
        add(pieces, closed);
        break;
      }
      case "INSERT": {
        const block = drawing.blocks.get((first(entity, 2) ?? "").toUpperCase());
        if (!block || depth > 16) break;
        const at = point(10, 20);
        const sx = num(first(entity, 41), 1);
        const sy = num(first(entity, 42), 1);
        const angle = (num(first(entity, 50)) * Math.PI) / 180;
        const columns = Math.max(1, Math.round(num(first(entity, 70), 1)));
        const rows = Math.max(1, Math.round(num(first(entity, 71), 1)));
        const columnSpacing = num(first(entity, 44));
        const rowSpacing = num(first(entity, 45));
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        for (let row = 0; row < rows; row += 1) {
          for (let column = 0; column < columns; column += 1) {
            // Array spacing runs along the turned axes; the block's base point lands on the insertion point.
            const offset = { x: column * columnSpacing, y: row * rowSpacing };
            const local: Matrix = [cos * sx, sin * sx, -sin * sy, cos * sy, at.x + cos * offset.x - sin * offset.y, at.y + sin * offset.x + cos * offset.y];
            const toBase: Matrix = [1, 0, 0, 1, -block.base.x, -block.base.y];
            collect(drawing, block.entities, multiply(place, multiply(local, toBase)), out, depth + 1);
          }
        }
        break;
      }
    }
  }
}

const distance = (a: DxfImportPoint, b: DxfImportPoint) => Math.hypot(a.x - b.x, a.y - b.y);

function reversed(piece: Piece): Piece {
  return piece.c1 && piece.c2 ? { start: piece.end, c1: piece.c2, c2: piece.c1, end: piece.start } : { start: piece.end, end: piece.start };
}

/**
 * Open runs joined end to end into closed outlines: a run continues with one whose end lies on its end (turned
 * round if need be), until it comes back to its start. What never closes is returned apart.
 */
function joinRuns(runs: Piece[][], tolerance: number) {
  const loops: Piece[][] = [];
  const left: Piece[][] = [];
  const pool = runs.map((run) => run.slice());
  // The same piece drawn twice (a line over a line) would be cut twice and branch the outline: once is enough.
  const seen = new Set<string>();
  const key = (piece: Piece) => {
    const round = (p: DxfImportPoint) => `${Math.round(p.x / tolerance)},${Math.round(p.y / tolerance)}`;
    const ends = [round(piece.start), round(piece.end)].sort();
    return `${piece.c1 ? "c" : "l"}:${ends.join("|")}:${piece.c1 ? [round(piece.c1), round(piece.c2!)].sort().join("|") : ""}`;
  };
  const unique = pool.filter((run) => {
    if (run.length !== 1) return true;
    const k = key(run[0]);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const used = new Array(unique.length).fill(false);
  // The runs' ends in a grid of the tolerance, so a run finds the one that goes on without looking at all of them.
  const cell = (p: DxfImportPoint) => [Math.floor(p.x / tolerance), Math.floor(p.y / tolerance)] as const;
  const grid = new Map<string, Array<{ run: number; atEnd: boolean }>>();
  unique.forEach((run, index) => {
    for (const [point, atEnd] of [[run[0].start, false], [run[run.length - 1].end, true]] as const) {
      const [cx, cy] = cell(point);
      const list = grid.get(`${cx},${cy}`) ?? [];
      list.push({ run: index, atEnd });
      grid.set(`${cx},${cy}`, list);
    }
  });
  // Of the runs that go on from here, the nearest: where several ends meet within the tolerance (two outlines
  // touching at a corner, a QR code's modules), the one that really goes on starts exactly here.
  const nextAt = (tail: DxfImportPoint) => {
    const [cx, cy] = cell(tail);
    let best: { run: number; atEnd: boolean } | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        for (const candidate of grid.get(`${cx + dx},${cy + dy}`) ?? []) {
          if (used[candidate.run]) continue;
          const run = unique[candidate.run];
          const point = candidate.atEnd ? run[run.length - 1].end : run[0].start;
          const gap = distance(point, tail);
          if (gap <= tolerance && gap < bestDistance) {
            best = candidate;
            bestDistance = gap;
          }
        }
      }
    }
    return best;
  };
  for (let index = 0; index < unique.length; index += 1) {
    if (used[index]) continue;
    used[index] = true;
    const chain = unique[index].slice();
    // A chain closes where it comes back to its start - but not while all of it still lies within the tolerance
    // of its start: a few tiny pieces in a row would close on themselves and take nothing round.
    const closes = () => distance(chain[0].start, chain[chain.length - 1].end) <= tolerance && ringExtent(chain) > 2 * tolerance;
    let closed = closes();
    while (!closed) {
      const tail = chain[chain.length - 1].end;
      const found = nextAt(tail);
      if (!found) break;
      used[found.run] = true;
      const next = found.atEnd ? unique[found.run].slice().reverse().map(reversed) : unique[found.run].slice();
      next[0] = { ...next[0], start: tail };
      chain.push(...next);
      closed = closes();
    }
    if (closed) {
      chain[chain.length - 1] = { ...chain[chain.length - 1], end: chain[0].start };
      loops.push(chain);
    } else {
      left.push(chain);
    }
  }
  return { loops, open: left };
}

/** How far a ring reaches: the diagonal of the box round its ends and handles. */
function ringExtent(ring: readonly Piece[]) {
  const points = ring.flatMap((piece) => [piece.start, piece.end, ...(piece.c1 ? [piece.c1] : []), ...(piece.c2 ? [piece.c2] : [])]);
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
}

/** A ring needs three pieces to be a closed sketch outline: halve the longest until it has them. */
function atLeastThree(ring: Piece[]) {
  const mid = (a: DxfImportPoint, b: DxfImportPoint) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  while (ring.length < 3) {
    let longest = 0;
    ring.forEach((piece, index) => {
      if (distance(piece.start, piece.end) > distance(ring[longest].start, ring[longest].end)) longest = index;
    });
    const piece = ring[longest];
    let halves: Piece[];
    if (piece.c1 && piece.c2) {
      const a = mid(piece.start, piece.c1);
      const b = mid(piece.c1, piece.c2);
      const c = mid(piece.c2, piece.end);
      const d = mid(a, b);
      const e = mid(b, c);
      const centre = mid(d, e);
      halves = [{ start: piece.start, c1: a, c2: d, end: centre }, { start: centre, c1: e, c2: c, end: piece.end }];
    } else {
      const centre = mid(piece.start, piece.end);
      halves = [{ start: piece.start, end: centre }, { start: centre, end: piece.end }];
    }
    ring.splice(longest, 1, ...halves);
  }
  return ring;
}

/**
 * The circle a closed ring runs once round, in the sketch's frame, when every piece is an arc of that one circle
 * (as the sketch judges an arc, sketchCircularArc.ts); null otherwise.
 */
function ringCircle(ring: readonly Piece[], place: (point: DxfImportPoint) => PlanePoint) {
  let circle: { center: PlanePoint; radius: number } | null = null;
  let turned = 0;
  for (const piece of ring) {
    if (!piece.c1 || !piece.c2) return null;
    const [start, c1, c2, end] = [piece.start, piece.c1, piece.c2, piece.end].map(place);
    const center = circularArcCenter(start, c1, c2, end);
    if (!center) return null;
    const radius = Math.hypot(start.x - center.x, start.z - center.z);
    if (!circle) circle = { center, radius };
    const tolerance = 1e-6 * Math.max(1, circle.radius);
    if (Math.hypot(center.x - circle.center.x, center.z - circle.center.z) > tolerance || Math.abs(radius - circle.radius) > tolerance) return null;
    // How far round the piece goes: its handle says which way it leaves the start.
    const from = Math.atan2(start.z - center.z, start.x - center.x);
    const to = Math.atan2(end.z - center.z, end.x - center.x);
    const way = Math.sign((start.x - center.x) * (c1.z - start.z) - (start.z - center.z) * (c1.x - start.x));
    if (way === 0) return null;
    let step = to - from;
    while (way * step <= 1e-12) step += way * Math.PI * 2;
    while (Math.abs(step) > Math.PI * 2) step -= way * Math.PI * 2;
    turned += step;
  }
  return circle && Math.abs(Math.abs(turned) - Math.PI * 2) < 1e-6 ? circle : null;
}

/**
 * The DXF's closed outlines as a sketch, read as the top view shows the plate: x across, the drawing's y up
 * the page running to the back (-z), in millimetres, centred on the middle of its outline.
 */
export function sketchProfileFromDxf(text: string): DxfImportResult {
  const drawing = readDrawing(text);
  const unitEntry = drawing.units !== null ? UNITS[drawing.units] : undefined;
  const scale = unitEntry ? unitEntry[0] : 1;
  const out: Collected = { loops: [], open: [], skipped: {} };
  collect(drawing, drawing.entities, [scale, 0, 0, scale, 0, 0], out, 0);
  const tolerance = DXF_JOIN_TOLERANCE;
  const clean = (run: Piece[]) => run.filter((piece) => distance(piece.start, piece.end) > 1e-9 || Boolean(piece.c1));
  const joined = joinRuns(out.open.map(clean).filter((run) => run.length > 0), tolerance);
  // Each piece starts exactly where the one before ends, the last ends at the first's start.
  const chain = (ring: Piece[]) => {
    for (let index = 1; index < ring.length; index += 1) ring[index] = { ...ring[index], start: ring[index - 1].end };
    ring[ring.length - 1] = { ...ring[ring.length - 1], end: ring[0].start };
    return ring;
  };
  const rings = [...out.loops.map(clean), ...joined.loops].filter((ring) => ring.length > 0).map((ring) => {
    // A straight piece shorter than the join tolerance (a QR code's 0.008 mm steps) can end up with no length at
    // all once its ends are joined: the CAD kernel cannot make an edge of it, and the whole import failed. It goes.
    const kept = chain(ring).filter((piece) => Boolean(piece.c1) || distance(piece.start, piece.end) > DXF_MIN_PIECE);
    return kept.length > 0 && kept.length < ring.length ? chain(kept) : ring;
  })
    // A run of pieces all within the join tolerance of each other (a few 0.005 mm lines between two arcs) closes on
    // itself as a ring of no size, which the CAD kernel takes for broken topology: it is no outline, and goes.
    .filter((ring) => ringExtent(ring) > 2 * tolerance)
    .map(atLeastThree);
  const total = rings.reduce((sum, ring) => sum + ring.length, 0);
  if (rings.length === 0) throw new DxfImportError("empty", "The DXF holds no closed outline");
  if (total > MAX_DXF_SKETCH_SEGMENTS) throw new DxfImportError("tooComplex", "The DXF has too many lines and curves for a sketch");

  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  // The extent of the outline, a curve's bulge between its ends included.
  const curvePoint = (piece: Piece, t: number): DxfImportPoint => {
    if (!piece.c1 || !piece.c2) return { x: piece.start.x + (piece.end.x - piece.start.x) * t, y: piece.start.y + (piece.end.y - piece.start.y) * t };
    const u = 1 - t;
    return {
      x: u * u * u * piece.start.x + 3 * u * u * t * piece.c1.x + 3 * u * t * t * piece.c2.x + t * t * t * piece.end.x,
      y: u * u * u * piece.start.y + 3 * u * u * t * piece.c1.y + 3 * u * t * t * piece.c2.y + t * t * t * piece.end.y,
    };
  };
  rings.flat().forEach((piece) => {
    const steps = piece.c1 ? 32 : 1;
    for (let step = 0; step <= steps; step += 1) {
      const { x, y } = curvePoint(piece, step / steps);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  });
  const centreX = (minX + maxX) / 2;
  const centreY = (minY + maxY) / 2;
  // DXF's y runs to the back, the plate's z to the front.
  const place = ({ x, y }: DxfImportPoint) => ({ x: x - centreX, z: centreY - y });
  const points: SketchPoint[] = [];
  const segments: SketchSegment[] = [];
  const ringSketches: SketchProfile[] = [];
  rings.forEach((ring, ringIndex) => {
    const ids = ring.map((_, index) => `dxf-${ringIndex}-${index}`);
    const ringPoints: SketchPoint[] = ring.map((piece, index) => ({ id: ids[index], ...place(piece.start) }));
    ring.forEach((piece, index) => {
      const next = (index + 1) % ring.length;
      const curved = Boolean(piece.c1 && piece.c2);
      if (curved) {
        ringPoints[index].handleOut = place(piece.c1!);
        ringPoints[next].handleIn = place(piece.c2!);
      }
      segments.push({ id: `dxf-${ringIndex}-s${index}`, startId: ids[index], endId: ids[next], kind: curved ? "bezier" : "line" });
    });
    // Each handle moves on its own, as drawn: the outline stays exactly the file's.
    ringPoints.forEach((point) => {
      if (point.handleIn || point.handleOut) point.mode = "split";
    });
    points.push(...ringPoints);
    ringSketches.push({ points: ringPoints, segments: segments.slice(segments.length - ring.length) });
  });
  const parts = dxfParts(rings, ringSketches, curvePoint, place);
  return {
    profile: { points, segments },
    parts,
    width: maxX - minX,
    depth: maxY - minY,
    outlines: rings.length,
    openLeftOut: joined.open.length,
    skipped: out.skipped,
    unit: unitEntry && unitEntry[1] !== "mm" ? unitEntry[1] : null,
    unitless: !unitEntry,
    scale,
  };
}

/**
 * The outlines as solids and loose holes. An outline inside an odd number of others is a hole of the nearest
 * solid round it, as the sketch builds it. Such a hole goes beside its solid as a hole of its own, a cylinder
 * when it is a whole circle. A hole with an outline inside it (a part lying in a cut-out) stays in its solid's
 * sketch: a loose hole would cut that part as well.
 */
function dxfParts(
  rings: readonly Piece[][],
  sketches: readonly SketchProfile[],
  curvePoint: (piece: Piece, t: number) => DxfImportPoint,
  place: (point: DxfImportPoint) => PlanePoint,
): DxfImportParts {
  const polygons = rings.map((ring) => ring.flatMap((piece) => {
    const steps = piece.c1 ? 8 : 1;
    return Array.from({ length: steps }, (_, step) => place(curvePoint(piece, step / steps)));
  }));
  const areas = polygons.map((polygon) => {
    let sum = 0;
    polygon.forEach((point, index) => {
      const next = polygon[(index + 1) % polygon.length];
      sum += point.x * next.z - next.x * point.z;
    });
    return Math.abs(sum) / 2;
  });
  const inside = (inner: number, outer: number) => inner !== outer && areas[outer] > areas[inner] && polygonInside(polygons[inner], polygons[outer]);
  const containers = rings.map((_, index) => rings.map((__, other) => other).filter((other) => inside(index, other)));
  const depth = containers.map((list) => list.length);
  const hasInside = rings.map((_, index) => containers.some((list) => list.includes(index)));
  const solids: SketchProfile[] = [];
  const holes: SketchProfile[] = [];
  const roundHoles: DxfRoundHole[] = [];
  const kept = new Map<number, number[]>();
  rings.forEach((ring, index) => {
    if (depth[index] % 2 === 0) return;
    if (hasInside[index]) {
      // The nearest solid round it: of the outlines it lies in, the smallest one at an even depth.
      const parent = containers[index].filter((other) => depth[other] % 2 === 0).sort((a, b) => areas[a] - areas[b])[0];
      if (parent !== undefined) kept.set(parent, [...(kept.get(parent) ?? []), index]);
      return;
    }
    const circle = ringCircle(ring, place);
    if (circle) {
      roundHoles.push({ x: circle.center.x, z: circle.center.z, diameter: circle.radius * 2 });
    } else {
      holes.push(sketches[index]);
    }
  });
  rings.forEach((_, index) => {
    if (depth[index] % 2 !== 0) return;
    const own = [index, ...(kept.get(index) ?? [])].map((ring) => sketches[ring]);
    solids.push({ points: own.flatMap((sketch) => sketch.points), segments: own.flatMap((sketch) => sketch.segments) });
  });
  return { solids, holes, roundHoles };
}
