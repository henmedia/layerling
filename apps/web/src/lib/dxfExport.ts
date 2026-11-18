import { EXACT_ROUND_TOLERANCE } from "@/lib/roundness";

/**
 * DXF for laser cutting shops (#774). What the shops asked for, and what this file writes:
 *
 * - LINE, ARC and CIRCLE only: no polylines, splines or blocks, which several shops refuse, and no
 *   curves made of short straight pieces, which make a cutting head shake. The outlines the editor has
 *   are polygons, so the round parts are found again: a run of corners that lies on one circle becomes
 *   an ARC, a whole loop on one circle a CIRCLE. For a hole or a rounded corner that circle is the true
 *   one, since the corners of its polygon sit on it; a free curve (a letter, an imported drawing) gets
 *   arcs that stay within DXF_FIT_TOLERANCE of it.
 * - Everything on layer 0 in colour 7 (white): shops read the colour as the process (white cut, yellow
 *   engrave, blue bend) and ignore other colours.
 * - DXF 2000 (AC1015) with $INSUNITS = 4: millimetres stand in the file. R12 has no place for the unit,
 *   and some programs read such a file as inches.
 * - Z = 0, scale 1:1, seen from above with the front at the bottom (not mirrored), the lower left corner
 *   of the drawing at 0,0.
 */

export type DxfPoint = readonly [number, number];

export type DxfEntity =
  | { type: "line"; from: DxfPoint; to: DxfPoint }
  /** Counter-clockwise from startAngle to endAngle, in degrees, as DXF has it. */
  | { type: "arc"; center: DxfPoint; radius: number; startAngle: number; endAngle: number }
  | { type: "circle"; center: DxfPoint; radius: number };

/** How far, in mm, a corner of the outline may lie off the arc or circle that replaces it. */
export const DXF_FIT_TOLERANCE = 0.01;

/**
 * A side of the outline belongs to a curve when it strays no further than this from the arc through its
 * ends (the height of its circle segment): the same 0.05 mm the edge tool takes to build a polygon as a
 * true circle (EXACT_ROUND_TOLERANCE). A hexagon's sides stray far more and stay straight lines.
 */
export const DXF_ROUND_SAGITTA = EXACT_ROUND_TOLERANCE;

/**
 * A side shorter than this, in mm, is no side: its ends are one corner. The outline of a mesh seen from above has
 * such crumbs where faces meet (a ten-thousandth of a millimetre), and a cutting program can choke on them. The
 * steps of a QR code's corners (0.0078 mm) are longer and stay.
 */
const MIN_SIDE = 1e-3;
/** A corner closer than this to the line through its neighbours is no corner at all and is dropped. */
const STRAIGHT_TOLERANCE = 1e-4;
/** Larger circles than this are taken for straight lines. */
const MAX_ARC_RADIUS = 100_000;
const MIN_ARC_RADIUS = 1e-4;
/** The sharpest turn, in radians, a corner inside a curve may make: a circle drawn with 9 sides or more turns less. */
const MAX_ARC_TURN = (40 * Math.PI) / 180;
/**
 * A side at least this many times as long as both its neighbours is a straight side, not a piece of a curve: the
 * corners of a curve drawn as a polygon sit at about the same distance from each other. Without it the straight side
 * of a slot (3.5 mm between two 0.9 mm sides of its round ends) passes for a very flat arc together with them.
 */
const STRAIGHT_SIDE_RATIO = 3;
/** How many longer runs are still tried after a run fails to be an arc. */
const DXF_ARC_MISSES = 12;

type Point = { x: number; y: number };

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function distanceToLine(point: Point, a: Point, b: Point) {
  const length = distance(a, b);
  if (length < 1e-12) return distance(point, a);
  return Math.abs((b.x - a.x) * (a.y - point.y) - (a.x - point.x) * (b.y - a.y)) / length;
}

/** The loop without repeated corners, a repeated first corner at its end, or corners on a straight line. */
export function cleanDxfLoop(points: readonly DxfPoint[]): Point[] {
  const loop: Point[] = [];
  points.forEach(([x, y]) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const point = { x, y };
    if (loop.length === 0 || distance(loop[loop.length - 1], point) > MIN_SIDE) loop.push(point);
  });
  while (loop.length > 1 && distance(loop[0], loop[loop.length - 1]) <= MIN_SIDE) loop.pop();
  // Drop corners that lie on the line through their neighbours, until none is left.
  let removed = true;
  while (removed && loop.length > 3) {
    removed = false;
    for (let index = 0; index < loop.length && loop.length > 3; index += 1) {
      const previous = loop[(index - 1 + loop.length) % loop.length];
      const next = loop[(index + 1) % loop.length];
      if (distanceToLine(loop[index], previous, next) < STRAIGHT_TOLERANCE) {
        loop.splice(index, 1);
        index -= 1;
        removed = true;
      }
    }
  }
  return loop;
}

/** The circle through three points, or null when they lie on one line. */
function circleThrough(a: Point, b: Point, c: Point) {
  const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
  if (Math.abs(d) < 1e-12) return null;
  const a2 = a.x * a.x + a.y * a.y;
  const b2 = b.x * b.x + b.y * b.y;
  const c2 = c.x * c.x + c.y * c.y;
  const center = {
    x: (a2 * (b.y - c.y) + b2 * (c.y - a.y) + c2 * (a.y - b.y)) / d,
    y: (a2 * (c.x - b.x) + b2 * (a.x - c.x) + c2 * (b.x - a.x)) / d,
  };
  return { center, radius: distance(center, a) };
}

/** How far a chord of this length strays from its arc. */
function sagitta(chord: number, radius: number) {
  if (chord >= 2 * radius) return radius;
  return radius - Math.sqrt(radius * radius - (chord * chord) / 4);
}

/** The best circle through all points (least squares), for a loop that might be a whole circle. */
function fittedCircle(points: readonly Point[]) {
  const n = points.length;
  const meanX = points.reduce((sum, point) => sum + point.x, 0) / n;
  const meanY = points.reduce((sum, point) => sum + point.y, 0) / n;
  let suu = 0, svv = 0, suv = 0, suuu = 0, svvv = 0, suvv = 0, svuu = 0;
  points.forEach((point) => {
    const u = point.x - meanX;
    const v = point.y - meanY;
    suu += u * u;
    svv += v * v;
    suv += u * v;
    suuu += u * u * u;
    svvv += v * v * v;
    suvv += u * v * v;
    svuu += v * u * u;
  });
  const det = suu * svv - suv * suv;
  if (Math.abs(det) < 1e-18) return null;
  const bu = (suuu + suvv) / 2;
  const bv = (svvv + svuu) / 2;
  const uc = (bu * svv - bv * suv) / det;
  const vc = (bv * suu - bu * suv) / det;
  const center = { x: uc + meanX, y: vc + meanY };
  const radius = Math.sqrt(uc * uc + vc * vc + (suu + svv) / n);
  return { center, radius };
}

/**
 * Which way the corners from `from` to `to` run round a centre: +1 counter-clockwise, -1 clockwise, 0 when they
 * turn back. A step back shorter than the tolerance is the jitter of a mesh's outline (a sketch body's curve or an
 * imported part: their corners wander a few thousandths of a millimetre either side of the line) and is let pass.
 */
function runAround(points: readonly Point[], from: number, to: number, count: number, center: Point, radius: number) {
  const steps: number[] = [];
  let total = 0;
  for (let index = from; index < to; index += 1) {
    const a = points[index % count];
    const b = points[(index + 1) % count];
    const angle = Math.atan2(b.y - center.y, b.x - center.x) - Math.atan2(a.y - center.y, a.x - center.x);
    const step = Math.atan2(Math.sin(angle), Math.cos(angle));
    steps.push(step);
    total += step;
  }
  const sign = Math.sign(total);
  if (sign === 0) return { sign: 0, total };
  if (steps.some((step) => sign * step < 0 && Math.abs(step) * radius > DXF_FIT_TOLERANCE)) return { sign: 0, total };
  return { sign, total };
}

function isRoundCircle(radius: number) {
  return Number.isFinite(radius) && radius >= MIN_ARC_RADIUS && radius <= MAX_ARC_RADIUS;
}

/** The whole loop as one circle, when every corner lies on it and every side is short enough to be a curve. */
function wholeCircle(points: readonly Point[]) {
  if (points.length < 8) return null;
  const circle = fittedCircle(points);
  if (!circle || !isRoundCircle(circle.radius)) return null;
  // Once round, one way: a loop that turns back or goes round twice is no circle.
  const around = runAround(points, 0, points.length, points.length, circle.center, circle.radius);
  if (around.sign === 0 || Math.abs(Math.abs(around.total) - Math.PI * 2) > 1e-3) return null;
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    if (Math.abs(distance(point, circle.center) - circle.radius) > DXF_FIT_TOLERANCE) return null;
    if (sagitta(distance(point, points[(index + 1) % points.length]), circle.radius) > DXF_ROUND_SAGITTA) return null;
  }
  return circle;
}

/** The arc from corner `from` to corner `to` (indices may run past the end of the loop), or null. */
function arcRun(points: readonly Point[], from: number, to: number) {
  const count = points.length;
  if (to - from < 2 || to - from >= count) return null;
  const at = (index: number) => points[index % count];
  const start = at(from);
  const end = at(to);
  const circle = circleThrough(start, at(Math.floor((from + to) / 2)), end);
  if (!circle || !isRoundCircle(circle.radius)) return null;
  const { sign, total } = runAround(points, from, to, count, circle.center, circle.radius);
  if (sign === 0) return null;
  for (let index = from; index < to; index += 1) {
    const a = at(index);
    const b = at(index + 1);
    if (index > from && sharpTurn(points, index)) return null;
    if (index > from && Math.abs(distance(a, circle.center) - circle.radius) > DXF_FIT_TOLERANCE) return null;
    if (sagitta(distance(a, b), circle.radius) > DXF_ROUND_SAGITTA) return null;
    if (straightSide(points, index)) return null;
  }
  // An arc stays an arc; a loop that closes on itself is a circle and was caught before.
  if (Math.abs(total) >= Math.PI * 2 - 1e-6) return null;
  // Corners that lie on the straight line from start to end within the tolerance are a line, not an arc of a
  // circle many metres wide.
  let bent = false;
  for (let index = from + 1; index < to && !bent; index += 1) bent = distanceToLine(at(index), start, end) > DXF_FIT_TOLERANCE;
  return { center: circle.center, radius: circle.radius, sign, bent };
}

/** Whether the side from corner `index` to the next is far longer than both sides beside it (STRAIGHT_SIDE_RATIO). */
function straightSide(points: readonly Point[], index: number) {
  const count = points.length;
  const at = (offset: number) => points[(((index + offset) % count) + count) % count];
  const side = distance(at(0), at(1));
  return side > STRAIGHT_SIDE_RATIO * Math.max(distance(at(-1), at(0)), distance(at(1), at(2)));
}

function degrees(radians: number) {
  const value = (((radians * 180) / Math.PI % 360) + 360) % 360;
  // 359.9999999999 is written as 360; keep the angle in 0 to 360 as DXF readers expect it.
  return value > 360 - 1e-7 ? 0 : value;
}

/**
 * Whether the outline turns sharply at a corner. Such a corner is a corner however short its sides: a few
 * hundredths of a millimetre of zigzag (where a QR code's modules meet, or a stencil bridge crosses an edge) lie
 * on some tiny circle too, and an arc bent through them bulges across the outline beside it.
 */
function sharpTurn(points: readonly Point[], index: number) {
  const count = points.length;
  const previous = points[(index - 1 + count) % count];
  const point = points[index % count];
  const next = points[(index + 1) % count];
  const turn = Math.abs(Math.atan2(
    (point.x - previous.x) * (next.y - point.y) - (point.y - previous.y) * (next.x - point.x),
    (point.x - previous.x) * (next.x - point.x) + (point.y - previous.y) * (next.y - point.y),
  ));
  return turn > MAX_ARC_TURN;
}

/**
 * Whether a corner can sit inside a curve: the circle through it and its neighbours exists, and both sides
 * next to it are short enough on that circle. A corner where this fails (a box corner, the tip of a star)
 * is where a run starts, so no arc is ever bent across it.
 */
function smoothCorner(points: readonly Point[], index: number) {
  const count = points.length;
  const previous = points[(index - 1 + count) % count];
  const point = points[index];
  const next = points[(index + 1) % count];
  const circle = circleThrough(previous, point, next);
  if (!circle || !isRoundCircle(circle.radius)) return false;
  if (sharpTurn(points, index)) return false;
  // The end of a straight side is where a curve ends, however gently the outline bends there.
  if (straightSide(points, index) || straightSide(points, index - 1)) return false;
  return sagitta(distance(previous, point), circle.radius) <= DXF_ROUND_SAGITTA && sagitta(distance(point, next), circle.radius) <= DXF_ROUND_SAGITTA;
}

/** One closed outline as lines, arcs and circles, in the order they run along it. */
export function dxfLoopEntities(loop: readonly DxfPoint[]): DxfEntity[] {
  const points = cleanDxfLoop(loop);
  const count = points.length;
  if (count < 2) return [];
  const toTuple = (point: Point): DxfPoint => [point.x, point.y];
  if (count >= 3) {
    const circle = wholeCircle(points);
    if (circle) return [{ type: "circle", center: toTuple(circle.center), radius: circle.radius }];
  }
  if (count < 3) return [{ type: "line", from: toTuple(points[0]), to: toTuple(points[1]) }];

  // Start where a curve surely ends: of the corners that cannot sit inside a curve, the one next to the longest
  // side (the end of a straight side). A wobbly outline has such corners inside its curves as well.
  const side = (index: number) => distance(points[(index + count - 1) % count], points[index]) + distance(points[index], points[(index + 1) % count]);
  let first = 0;
  for (let index = 0, longest = -1; index < count; index += 1) {
    if (smoothCorner(points, index) || side(index) <= longest) continue;
    longest = side(index);
    first = index;
  }
  const entities: DxfEntity[] = [];
  let index = first;
  const last = first + count;
  while (index < last) {
    let best: { to: number; center: Point; radius: number; sign: number } | null = null;
    // The longest arc from here. A short run of a wobbly outline can fail where a longer one holds (three
    // corners a few thousandths off give a poor circle), so a few failures in a row are looked past.
    for (let to = index + 2, misses = 0; to <= last && misses <= DXF_ARC_MISSES; to += 1) {
      const run = arcRun(points, index, to);
      if (!run) {
        misses += 1;
        continue;
      }
      misses = 0;
      if (run.bent) best = { to, ...run };
    }
    if (best) {
      const a = points[index % count];
      const b = points[best.to % count];
      const angleA = Math.atan2(a.y - best.center.y, a.x - best.center.x);
      const angleB = Math.atan2(b.y - best.center.y, b.x - best.center.x);
      const [startAngle, endAngle] = best.sign > 0 ? [degrees(angleA), degrees(angleB)] : [degrees(angleB), degrees(angleA)];
      entities.push({ type: "arc", center: toTuple(best.center), radius: best.radius, startAngle, endAngle });
      index = best.to;
    } else {
      entities.push({ type: "line", from: toTuple(points[index % count]), to: toTuple(points[(index + 1) % count]) });
      index += 1;
    }
  }
  return entities;
}

/** Where an entity starts and ends, for checks: an arc from its start angle to its end angle. */
export function dxfEntityEnds(entity: DxfEntity): [DxfPoint, DxfPoint] | null {
  if (entity.type === "line") return [entity.from, entity.to];
  if (entity.type === "circle") return null;
  const at = (angle: number): DxfPoint => [
    entity.center[0] + entity.radius * Math.cos((angle * Math.PI) / 180),
    entity.center[1] + entity.radius * Math.sin((angle * Math.PI) / 180),
  ];
  return [at(entity.startAngle), at(entity.endAngle)];
}

export type DxfOutlines = {
  /** Closed outlines seen from above in the editor's page coordinates: x to the right, y towards the front. */
  loops: ReadonlyArray<ReadonlyArray<DxfPoint>>;
};

export type DxfResult = {
  dxf: string;
  entities: DxfEntity[];
  counts: { lines: number; arcs: number; circles: number };
  width: number;
  height: number;
};

function dxfNumber(value: number) {
  if (Math.abs(value) < 5e-10) return "0.0";
  const text = value.toFixed(9).replace(/0+$/, "").replace(/\.$/, ".0");
  return text === "-0.0" ? "0.0" : text;
}

/**
 * The DXF of closed outlines: turned so the front is at the bottom (the page's y runs to the front, DXF's
 * y to the back), moved so the drawing's lower left corner is at 0,0, the round parts as arcs and circles.
 */
export function outlinesToDxf({ loops }: DxfOutlines): DxfResult {
  const flipped = loops
    .map((loop) => loop.map(([x, y]): DxfPoint => [x, -y]))
    .filter((loop) => loop.length >= 3);
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  flipped.forEach((loop) => loop.forEach(([x, y]) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }));
  if (!Number.isFinite(minX)) throw new Error("DXF export contains no readable contours");
  const moved = flipped.map((loop) => loop.map(([x, y]): DxfPoint => [x - minX, y - minY]));
  const entities = moved.flatMap((loop) => dxfLoopEntities(loop));
  if (entities.length === 0) throw new Error("DXF export contains no readable contours");
  const counts = {
    lines: entities.filter((entity) => entity.type === "line").length,
    arcs: entities.filter((entity) => entity.type === "arc").length,
    circles: entities.filter((entity) => entity.type === "circle").length,
  };
  const width = maxX - minX;
  const height = maxY - minY;
  return { dxf: dxfDocument(entities, { width, height }), entities, counts, width, height };
}

/**
 * A DXF 2000 file holding the entities in model space: the sections, tables and objects AutoCAD needs
 * for that version (HEADER with $ACADVER and $HANDSEED, CLASSES, the nine tables with their standard
 * entries, the two block records and blocks, ENTITIES, and OBJECTS with the root dictionary and
 * ACAD_GROUP), nothing more. Every entity on layer 0 in colour 7, linetype Continuous.
 */
export function dxfDocument(entities: readonly DxfEntity[], extents: { width: number; height: number }): string {
  const out: string[] = [];
  const pair = (code: number, value: string | number) => {
    out.push(String(code).padStart(3, " "), typeof value === "number" ? dxfNumber(value) : value);
  };
  const int = (code: number, value: number) => out.push(String(code).padStart(3, " "), String(Math.round(value)));
  let nextHandle = 0x20;
  const handle = () => (nextHandle++).toString(16).toUpperCase();

  // Fixed handles of the tables, blocks and dictionaries; entities count on from 0x20.
  const H = {
    vportTable: "8", ltypeTable: "2", layerTable: "1", styleTable: "5", viewTable: "7", ucsTable: "6", appidTable: "3",
    dimstyleTable: "4", blockRecordTable: "9", byBlock: "10", byLayer: "11", continuous: "12", layer0: "13", standardStyle: "14",
    appidAcad: "15", dimStandard: "16", modelRecord: "17", modelBlock: "18", modelEnd: "19", paperRecord: "1A", paperBlock: "1B",
    paperEnd: "1C", rootDictionary: "1D", groupDictionary: "1E",
  };
  const entityHandles = entities.map(() => handle());

  const section = (name: string) => { pair(0, "SECTION"); pair(2, name); };
  const endSection = () => pair(0, "ENDSEC");
  const table = (name: string, own: string, count: number, extra?: () => void) => {
    pair(0, "TABLE"); pair(2, name); pair(5, own); pair(330, "0"); pair(100, "AcDbSymbolTable"); int(70, count);
    extra?.();
  };
  const record = (type: string, own: string, owner: string, subclass: string) => {
    pair(0, type); pair(5, own); pair(330, owner); pair(100, "AcDbSymbolTableRecord"); pair(100, subclass);
  };
  const header = (name: string) => pair(9, name);

  section("HEADER");
  header("$ACADVER"); pair(1, "AC1015");
  header("$DWGCODEPAGE"); pair(3, "ANSI_1252");
  header("$INSBASE"); pair(10, 0); pair(20, 0); pair(30, 0);
  header("$EXTMIN"); pair(10, 0); pair(20, 0); pair(30, 0);
  header("$EXTMAX"); pair(10, extents.width); pair(20, extents.height); pair(30, 0);
  header("$LIMMIN"); pair(10, 0); pair(20, 0);
  header("$LIMMAX"); pair(10, Math.max(extents.width, 1)); pair(20, Math.max(extents.height, 1));
  header("$LUNITS"); int(70, 2);
  header("$LUPREC"); int(70, 4);
  header("$AUNITS"); int(70, 0);
  header("$MEASUREMENT"); int(70, 1);
  header("$INSUNITS"); int(70, 4);
  header("$CLAYER"); pair(8, "0");
  // Every handle in the file lies below the seed: the fixed ones and those of the entities, taken above.
  header("$HANDSEED"); pair(5, nextHandle.toString(16).toUpperCase());
  endSection();

  section("CLASSES");
  endSection();

  section("TABLES");
  table("VPORT", H.vportTable, 0);
  pair(0, "ENDTAB");
  table("LTYPE", H.ltypeTable, 3);
  for (const [own, name] of [[H.byBlock, "ByBlock"], [H.byLayer, "ByLayer"], [H.continuous, "Continuous"]] as const) {
    record("LTYPE", own, H.ltypeTable, "AcDbLinetypeTableRecord");
    pair(2, name); int(70, 0); pair(3, name === "Continuous" ? "Solid line" : ""); int(72, 65); int(73, 0); pair(40, 0);
  }
  pair(0, "ENDTAB");
  table("LAYER", H.layerTable, 1);
  record("LAYER", H.layer0, H.layerTable, "AcDbLayerTableRecord");
  // Layer 0, white (7), solid, lineweight 0.00 mm: a cut contour as shops read it.
  pair(2, "0"); int(70, 0); int(62, 7); pair(6, "Continuous"); int(370, 0);
  pair(0, "ENDTAB");
  table("STYLE", H.styleTable, 1);
  record("STYLE", H.standardStyle, H.styleTable, "AcDbTextStyleTableRecord");
  pair(2, "Standard"); int(70, 0); pair(40, 0); pair(41, 1); pair(50, 0); int(71, 0); pair(42, 2.5); pair(3, "txt"); pair(4, "");
  pair(0, "ENDTAB");
  table("VIEW", H.viewTable, 0);
  pair(0, "ENDTAB");
  table("UCS", H.ucsTable, 0);
  pair(0, "ENDTAB");
  table("APPID", H.appidTable, 1);
  record("APPID", H.appidAcad, H.appidTable, "AcDbRegAppTableRecord");
  pair(2, "ACAD"); int(70, 0);
  pair(0, "ENDTAB");
  table("DIMSTYLE", H.dimstyleTable, 1, () => pair(100, "AcDbDimStyleTable"));
  pair(0, "DIMSTYLE"); pair(105, H.dimStandard); pair(330, H.dimstyleTable); pair(100, "AcDbSymbolTableRecord"); pair(100, "AcDbDimStyleTableRecord");
  pair(2, "Standard"); int(70, 0);
  pair(0, "ENDTAB");
  table("BLOCK_RECORD", H.blockRecordTable, 2);
  record("BLOCK_RECORD", H.modelRecord, H.blockRecordTable, "AcDbBlockTableRecord"); pair(2, "*Model_Space");
  record("BLOCK_RECORD", H.paperRecord, H.blockRecordTable, "AcDbBlockTableRecord"); pair(2, "*Paper_Space");
  pair(0, "ENDTAB");
  endSection();

  section("BLOCKS");
  for (const [record, block, end, name] of [[H.modelRecord, H.modelBlock, H.modelEnd, "*Model_Space"], [H.paperRecord, H.paperBlock, H.paperEnd, "*Paper_Space"]] as const) {
    pair(0, "BLOCK"); pair(5, block); pair(330, record); pair(100, "AcDbEntity"); pair(8, "0"); pair(100, "AcDbBlockBegin");
    pair(2, name); int(70, 0); pair(10, 0); pair(20, 0); pair(30, 0); pair(3, name); pair(1, "");
    pair(0, "ENDBLK"); pair(5, end); pair(330, record); pair(100, "AcDbEntity"); pair(8, "0"); pair(100, "AcDbBlockEnd");
  }
  endSection();

  section("ENTITIES");
  entities.forEach((entity, index) => {
    const common = (type: string) => {
      pair(0, type); pair(5, entityHandles[index]); pair(330, H.modelRecord); pair(100, "AcDbEntity"); pair(8, "0"); int(62, 7); pair(6, "Continuous");
    };
    if (entity.type === "line") {
      common("LINE"); pair(100, "AcDbLine");
      pair(10, entity.from[0]); pair(20, entity.from[1]); pair(30, 0);
      pair(11, entity.to[0]); pair(21, entity.to[1]); pair(31, 0);
    } else if (entity.type === "arc") {
      common("ARC"); pair(100, "AcDbCircle");
      pair(10, entity.center[0]); pair(20, entity.center[1]); pair(30, 0); pair(40, entity.radius);
      pair(100, "AcDbArc"); pair(50, entity.startAngle); pair(51, entity.endAngle);
    } else {
      common("CIRCLE"); pair(100, "AcDbCircle");
      pair(10, entity.center[0]); pair(20, entity.center[1]); pair(30, 0); pair(40, entity.radius);
    }
  });
  endSection();

  section("OBJECTS");
  pair(0, "DICTIONARY"); pair(5, H.rootDictionary); pair(330, "0"); pair(100, "AcDbDictionary"); int(281, 1);
  pair(3, "ACAD_GROUP"); pair(350, H.groupDictionary);
  pair(0, "DICTIONARY"); pair(5, H.groupDictionary); pair(330, H.rootDictionary); pair(100, "AcDbDictionary"); int(281, 1);
  endSection();
  pair(0, "EOF");
  return `${out.join("\r\n")}\r\n`;
}
