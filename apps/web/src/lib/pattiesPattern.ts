/**
 * Patties: the flat pattern of the pattern plate, as plain outlines. A pattern is a set of closed figures ("cells")
 * laid out in pattern space, a rectangle measured in millimetres, and then carried onto the plate: straight, or
 * round a middle so the rows become rings and every figure keeps its shape and only grows with its ring.
 *
 * Everything here is numbers only, so the body (pattiesGeometry.ts), the figures the inspector shows and the tests
 * share one calculation. The one rule every pattern keeps: two figures, and a figure and the edge, are never closer
 * than the gap, so a plate with the figures cut out stays in one piece and its bars can be printed.
 */

import { DEFAULT_PATTIES_MOTIF, PATTIES_MOTIFS, normalizePattiesMotifLoops, pattiesMotifOutlines } from "@/lib/pattiesMotifShapes";
import type { PattiesCell, PattiesLayout, PattiesMode, PattiesMotif, PattiesOutline, PattiesPattern, PattiesSettings } from "@/types/layerling";

export type { PattiesCell, PattiesLayout, PattiesMode, PattiesMotif, PattiesOutline, PattiesPattern, PattiesSettings };
export { PATTIES_MOTIFS };

export type PattiesPoint = { x: number; y: number };
export type PattiesLoop = PattiesPoint[];

export const PATTIES_PATTERNS = ["warp", "dots", "petals", "scales", "waves", "cells", "bricks", "triangles", "diamonds", "weave", "herringbone", "rays", "motif"] as const satisfies readonly PattiesPattern[];
export const PATTIES_OUTLINES = ["rectangle", "round", "polygon", "star", "fan"] as const satisfies readonly PattiesOutline[];
export const PATTIES_LAYOUTS = ["straight", "polar"] as const satisfies readonly PattiesLayout[];
export const PATTIES_MODES = ["stencil", "raised", "sunk", "pieces"] as const satisfies readonly PattiesMode[];
export const PATTIES_CELLS = ["pill", "ellipse"] as const satisfies readonly PattiesCell[];

export const DEFAULT_PATTIES_WIDTH = 80;
export const DEFAULT_PATTIES_DEPTH = 80;
export const DEFAULT_PATTIES_HEIGHT = 1.6;

export const DEFAULT_PATTIES: PattiesSettings = {
  pattern: "warp",
  outline: "rectangle",
  corners: 6,
  layout: "straight",
  mode: "stencil",
  cell: "pill",
  count: 9,
  rows: 0,
  gap: 1.2,
  bulge: 40,
  focusX: 0,
  focusY: 0,
  turn: 0,
  roundness: 100,
  sides: 6,
  amount: 50,
  seed: 1,
  frame: 3,
  base: 0.8,
  seamless: false,
  cutEdge: false,
  hub: 20,
  fanTop: 80,
  fanBottom: 60,
  fanSide: 90,
  motif: DEFAULT_PATTIES_MOTIF,
};

export const PATTIES_MIN_COUNT = 1;
export const PATTIES_MAX_COUNT = 60;
export const PATTIES_MAX_ROWS = 60;
/** The thinnest bar a 0.4 mm nozzle lays down in one line. */
export const PATTIES_MIN_GAP = 0.4;
export const PATTIES_MAX_GAP = 20;
export const PATTIES_MAX_FRAME = 50;
export const PATTIES_MIN_BASE = 0.2;
export const PATTIES_MAX_BASE = 50;
export const PATTIES_MAX_SIDES = 12;
export const PATTIES_MIN_CORNERS = 3;
export const PATTIES_MAX_CORNERS = 12;
export const PATTIES_MAX_SEED = 9999;
export const PATTIES_MAX_HUB = 90;
export const PATTIES_MIN_FAN = 1;
export const PATTIES_MAX_FAN = 1000;
/** More figures than this are not built: the plate would take minutes and no printer shows them. */
export const PATTIES_MAX_FIGURES = 2500;

/** An opening smaller than this across closes up in the print, so it is left out. */
const MIN_FIGURE = 0.6;
/** How far a drawn arc may leave the true one, in mm. */
const CHORD = 0.03;
/**
 * The most points all the figures of a plate have together. A plate of many small round figures is drawn coarser
 * to keep to it: no printer shows the difference on a dot of two millimetres, and the plate stays quick to build.
 */
const POINT_BUDGET = 16000;
const TAU = Math.PI * 2;

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function numberIn(value: unknown, fallback: number, min: number, max: number, step: number) {
  if (!finite(value)) return fallback;
  return clamp(Math.round(value / step) * step, min, max);
}

function oneOf<T extends string>(value: unknown, list: readonly T[], fallback: T): T {
  return typeof value === "string" && (list as readonly string[]).includes(value) ? (value as T) : fallback;
}

export function normalizePattiesPattern(value: unknown): PattiesPattern {
  return oneOf(value, PATTIES_PATTERNS, DEFAULT_PATTIES.pattern);
}
export function normalizePattiesOutline(value: unknown): PattiesOutline {
  return oneOf(value, PATTIES_OUTLINES, DEFAULT_PATTIES.outline);
}
export function normalizePattiesCorners(value: unknown): number {
  return numberIn(value, DEFAULT_PATTIES.corners, PATTIES_MIN_CORNERS, PATTIES_MAX_CORNERS, 1);
}
export function normalizePattiesLayout(value: unknown): PattiesLayout {
  return oneOf(value, PATTIES_LAYOUTS, DEFAULT_PATTIES.layout);
}
export function normalizePattiesMode(value: unknown): PattiesMode {
  return oneOf(value, PATTIES_MODES, DEFAULT_PATTIES.mode);
}
export function normalizePattiesCell(value: unknown): PattiesCell {
  return oneOf(value, PATTIES_CELLS, DEFAULT_PATTIES.cell);
}
export function normalizePattiesCount(value: unknown): number {
  return numberIn(value, DEFAULT_PATTIES.count, PATTIES_MIN_COUNT, PATTIES_MAX_COUNT, 1);
}
export function normalizePattiesRows(value: unknown): number {
  return numberIn(value, DEFAULT_PATTIES.rows, 0, PATTIES_MAX_ROWS, 1);
}
export function normalizePattiesGap(value: unknown): number {
  return Math.round(numberIn(value, DEFAULT_PATTIES.gap, PATTIES_MIN_GAP, PATTIES_MAX_GAP, 0.1) * 10) / 10;
}
export function normalizePattiesBulge(value: unknown): number {
  return numberIn(value, DEFAULT_PATTIES.bulge, -100, 100, 1);
}
export function normalizePattiesFocus(value: unknown): number {
  return numberIn(value, 0, -100, 100, 1);
}
export function normalizePattiesTurn(value: unknown): number {
  return numberIn(value, DEFAULT_PATTIES.turn, -180, 180, 1);
}
export function normalizePattiesPercent(value: unknown, fallback: number): number {
  return numberIn(value, fallback, 0, 100, 1);
}
export function normalizePattiesSides(value: unknown): number {
  return numberIn(value, DEFAULT_PATTIES.sides, 1, PATTIES_MAX_SIDES, 1);
}
export function normalizePattiesSeed(value: unknown): number {
  return numberIn(value, DEFAULT_PATTIES.seed, 0, PATTIES_MAX_SEED, 1);
}
export function normalizePattiesFrame(value: unknown): number {
  return Math.round(numberIn(value, DEFAULT_PATTIES.frame, 0, PATTIES_MAX_FRAME, 0.1) * 10) / 10;
}
export function normalizePattiesBase(value: unknown): number {
  return Math.round(numberIn(value, DEFAULT_PATTIES.base, PATTIES_MIN_BASE, PATTIES_MAX_BASE, 0.1) * 10) / 10;
}
export function normalizePattiesHub(value: unknown): number {
  return numberIn(value, DEFAULT_PATTIES.hub, 0, PATTIES_MAX_HUB, 1);
}
export function normalizePattiesFan(value: unknown, fallback: number): number {
  return Math.round(numberIn(value, fallback, PATTIES_MIN_FAN, PATTIES_MAX_FAN, 0.1) * 10) / 10;
}

export function normalizePatties(input: Partial<Record<keyof PattiesSettings, unknown>> | null | undefined): PattiesSettings {
  const raw = input ?? {};
  const settings: PattiesSettings = {
    pattern: normalizePattiesPattern(raw.pattern),
    outline: normalizePattiesOutline(raw.outline),
    corners: normalizePattiesCorners(raw.corners),
    layout: normalizePattiesLayout(raw.layout),
    mode: normalizePattiesMode(raw.mode),
    cell: normalizePattiesCell(raw.cell),
    count: normalizePattiesCount(raw.count),
    rows: normalizePattiesRows(raw.rows),
    gap: normalizePattiesGap(raw.gap),
    bulge: normalizePattiesBulge(raw.bulge),
    focusX: normalizePattiesFocus(raw.focusX),
    focusY: normalizePattiesFocus(raw.focusY),
    turn: normalizePattiesTurn(raw.turn),
    roundness: normalizePattiesPercent(raw.roundness, DEFAULT_PATTIES.roundness),
    sides: normalizePattiesSides(raw.sides),
    amount: normalizePattiesPercent(raw.amount, DEFAULT_PATTIES.amount),
    seed: normalizePattiesSeed(raw.seed),
    frame: normalizePattiesFrame(raw.frame),
    base: normalizePattiesBase(raw.base),
    seamless: raw.seamless === true,
    cutEdge: raw.cutEdge === true,
    hub: normalizePattiesHub(raw.hub),
    fanTop: normalizePattiesFan(raw.fanTop, DEFAULT_PATTIES.fanTop),
    fanBottom: normalizePattiesFan(raw.fanBottom, DEFAULT_PATTIES.fanBottom),
    fanSide: normalizePattiesFan(raw.fanSide, DEFAULT_PATTIES.fanSide),
    motif: oneOf(raw.motif, PATTIES_MOTIFS, DEFAULT_PATTIES.motif),
  };
  // A figure of one's own travels with the plate whatever is shown, so choosing a ready one does not lose it.
  const own = normalizePattiesMotifLoops((raw as { motifLoops?: unknown }).motifLoops);
  if (own) settings.motifLoops = own;
  return settings;
}

/** Whether two shapes carry the same pattern; settings that are missing count as their defaults. */
export function pattiesSettingsEqual(a: Partial<PattiesSettings> | null | undefined, b: Partial<PattiesSettings> | null | undefined) {
  if (a === b || (!a && !b)) return true;
  const first = normalizePatties(a);
  const second = normalizePatties(b);
  return (Object.keys(first) as (keyof PattiesSettings)[]).every((key) => key === "motifLoops" || first[key] === second[key])
    && JSON.stringify(first.motifLoops ?? null) === JSON.stringify(second.motifLoops ?? null);
}

/**
 * What is wrong with settings read from a file, as the end of a sentence, or null. A file may hold fewer settings
 * than there are and numbers outside their range - both are put right where they are read - but not a text where a
 * number belongs, nor a choice nobody knows: that file was not written by this program.
 */
export function pattiesSettingsProblem(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return " must be an object of settings";
  const source = value as Record<string, unknown>;
  const choices: Record<string, readonly string[]> = {
    pattern: PATTIES_PATTERNS, outline: PATTIES_OUTLINES, layout: PATTIES_LAYOUTS, mode: PATTIES_MODES, cell: PATTIES_CELLS, motif: PATTIES_MOTIFS,
  };
  for (const [key, entry] of Object.entries(source)) {
    if (entry === undefined) continue;
    if (key in choices) {
      if (typeof entry !== "string" || !choices[key].includes(entry)) return `.${key} must be one of ${choices[key].join(", ")}`;
    } else if (key === "seamless" || key === "cutEdge") {
      if (typeof entry !== "boolean") return `.${key} must be true or false`;
    } else if (key === "motifLoops") {
      if (!Array.isArray(entry) || !entry.every((loop) => Array.isArray(loop) && loop.every((number) => typeof number === "number" && Number.isFinite(number)))) {
        return ".motifLoops must be lists of numbers";
      }
    } else if (key in DEFAULT_PATTIES) {
      if (typeof entry !== "number" || !Number.isFinite(entry)) return `.${key} must be a number`;
    }
  }
  return null;
}

/**
 * Settings as they come from outside - a saved default, the AI bridge - as a plain object: the object itself, or
 * its JSON text, which is how a bridge client may send it. Anything else is no settings.
 */
export function pattiesSettingsInput(value: unknown): Partial<Record<keyof PattiesSettings, unknown>> | null {
  let candidate = value;
  if (typeof candidate === "string") {
    try {
      candidate = JSON.parse(candidate);
    } catch {
      return null;
    }
  }
  return candidate && typeof candidate === "object" && !Array.isArray(candidate)
    ? (candidate as Partial<Record<keyof PattiesSettings, unknown>>)
    : null;
}

/**
 * Where each pattern starts: the settings that make it look like itself on a plate of 80 mm. Choosing a pattern in
 * the inspector sets these and leaves everything else - outline, size, border, way of building - as it is.
 */
export const PATTIES_PRESETS: Record<PattiesPattern, Partial<PattiesSettings>> = {
  warp: { count: 9, rows: 0, gap: 1.2, bulge: 40, turn: 0, roundness: 100, cell: "pill" },
  dots: { count: 10, gap: 1.6, bulge: 0, turn: 0, roundness: 100, sides: 6, amount: 0 },
  petals: { count: 5, gap: 1.2, bulge: 0, turn: 0, roundness: 30, sides: 6, amount: 100 },
  scales: { count: 8, gap: 1, bulge: 0, amount: 30 },
  waves: { count: 4, rows: 0, gap: 1.6, bulge: 0, roundness: 100, sides: 2, amount: 60 },
  cells: { count: 8, gap: 1.6, bulge: 0, roundness: 60, amount: 70 },
  bricks: { count: 6, rows: 0, gap: 1.4, bulge: 0, roundness: 20 },
  triangles: { count: 7, gap: 1.4, bulge: 0, roundness: 15 },
  diamonds: { count: 7, gap: 1.4, bulge: 0, roundness: 0, amount: 50 },
  weave: { count: 5, gap: 1.2, bulge: 0, roundness: 40, sides: 3 },
  herringbone: { count: 8, rows: 0, gap: 1.2, bulge: 0, turn: 45, roundness: 60, amount: 40 },
  rays: { count: 16, rows: 1, gap: 1.6, focusX: 0, focusY: 0, amount: 25 },
  motif: { count: 6, gap: 1.6, bulge: 0, turn: 0 },
};

/** Which settings a pattern reads, so the inspector shows only those and a helper knows what it may set. */
export type PattiesField = "rows" | "bulge" | "focus" | "turn" | "roundness" | "sides" | "amount" | "seed" | "cell" | "motif";

const PATTERN_FIELDS: Record<PattiesPattern, readonly PattiesField[]> = {
  warp: ["rows", "bulge", "focus", "turn", "roundness", "cell"],
  dots: ["bulge", "focus", "turn", "roundness", "sides", "amount"],
  petals: ["bulge", "focus", "turn", "roundness", "sides", "amount"],
  scales: ["bulge", "focus", "amount"],
  waves: ["rows", "bulge", "focus", "roundness", "sides", "amount"],
  cells: ["bulge", "focus", "roundness", "amount", "seed"],
  bricks: ["rows", "bulge", "focus", "roundness"],
  triangles: ["bulge", "focus", "roundness"],
  diamonds: ["bulge", "focus", "roundness", "amount"],
  weave: ["bulge", "focus", "roundness", "sides"],
  herringbone: ["rows", "bulge", "focus", "turn", "roundness", "amount"],
  rays: ["rows", "focus", "amount"],
  motif: ["bulge", "focus", "turn", "motif"],
};

export function pattiesPatternUses(pattern: PattiesPattern, field: PattiesField) {
  return PATTERN_FIELDS[pattern].includes(field);
}

/** The fewest corners, petals or pieces a pattern takes. */
export function pattiesMinSides(pattern: PattiesPattern) {
  return pattern === "waves" || pattern === "weave" ? 1 : 3;
}

// ---------------------------------------------------------------------------------------------------------------
// Small geometry helpers
// ---------------------------------------------------------------------------------------------------------------

export function pattiesLoopArea(loop: readonly PattiesPoint[]) {
  let sum = 0;
  for (let i = 0; i < loop.length; i += 1) {
    const a = loop[i];
    const b = loop[(i + 1) % loop.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return sum / 2;
}

function loopPerimeter(loop: readonly PattiesPoint[]) {
  let sum = 0;
  for (let i = 0; i < loop.length; i += 1) {
    const a = loop[i];
    const b = loop[(i + 1) % loop.length];
    sum += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return sum;
}

/**
 * The loop without doubled points and without points that sit on a straight run, turning counter-clockwise.
 * Points on a straight run matter: the triangles of a flat face skip them, the wall beside it does not, and the
 * body would have a crack there that no eye sees and every boolean stumbles over.
 */
export function cleanPattiesLoop(loop: readonly PattiesPoint[]): PattiesLoop {
  const distinct: PattiesPoint[] = [];
  for (const p of loop) {
    const last = distinct[distinct.length - 1];
    if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 1e-6) distinct.push({ x: p.x, y: p.y });
  }
  while (distinct.length > 1 && Math.hypot(distinct[0].x - distinct[distinct.length - 1].x, distinct[0].y - distinct[distinct.length - 1].y) <= 1e-6) {
    distinct.pop();
  }
  let points = distinct;
  for (let pass = 0; pass < 3; pass += 1) {
    const n = points.length;
    if (n < 3) return [];
    const kept: PattiesPoint[] = [];
    for (let i = 0; i < n; i += 1) {
      const a = points[(i + n - 1) % n];
      const p = points[i];
      const b = points[(i + 1) % n];
      const cross = (p.x - a.x) * (b.y - p.y) - (p.y - a.y) * (b.x - p.x);
      const scale = Math.hypot(p.x - a.x, p.y - a.y) * Math.hypot(b.x - p.x, b.y - p.y);
      if (Math.abs(cross) > 1e-7 * Math.max(scale, 1e-9)) kept.push(p);
    }
    if (kept.length === n) break;
    points = kept;
  }
  if (points.length < 3) return [];
  return pattiesLoopArea(points) < 0 ? points.reverse() : points;
}

/** How far apart the points of an arc of this radius may sit, as an angle. */
function arcStep(radius: number, tolerance: number) {
  const r = Math.max(radius, 1e-6);
  const step = 2 * Math.acos(clamp(1 - tolerance / r, -1, 1));
  return clamp(Number.isFinite(step) && step > 0 ? step : TAU / 6, TAU / 720, TAU / 6);
}

function arcPoints(cx: number, cy: number, radius: number, from: number, to: number, tolerance: number): PattiesPoint[] {
  const steps = Math.max(1, Math.ceil(Math.abs(to - from) / arcStep(radius, tolerance)));
  const points: PattiesPoint[] = [];
  for (let k = 0; k <= steps; k += 1) {
    const a = from + ((to - from) * k) / steps;
    points.push({ x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a) });
  }
  return points;
}

/**
 * Every corner of the loop rounded: `share` 0 leaves it, 1 lets the roundings of two neighbouring corners meet in
 * the middle of their edge, which turns a regular polygon into its inner circle. Corners that point inwards are
 * rounded the same way.
 */
function roundLoopCorners(loop: readonly PattiesPoint[], share: number, tolerance: number): PattiesLoop {
  const n = loop.length;
  if (share <= 0 || n < 3) return loop.slice();
  const out: PattiesPoint[] = [];
  for (let i = 0; i < n; i += 1) {
    const p = loop[i];
    const a = loop[(i + n - 1) % n];
    const b = loop[(i + 1) % n];
    const la = Math.hypot(a.x - p.x, a.y - p.y);
    const lb = Math.hypot(b.x - p.x, b.y - p.y);
    if (la < 1e-9 || lb < 1e-9) {
      out.push(p);
      continue;
    }
    const ux = (a.x - p.x) / la, uy = (a.y - p.y) / la;
    const vx = (b.x - p.x) / lb, vy = (b.y - p.y) / lb;
    const half = Math.acos(clamp(ux * vx + uy * vy, -1, 1)) / 2;
    const along = (share * Math.min(la, lb)) / 2;
    const radius = along * Math.tan(half);
    if (half > Math.PI / 2 - 1e-3 || radius < 1e-4) {
      out.push(p);
      continue;
    }
    const bx = ux + vx, by = uy + vy;
    const bl = Math.hypot(bx, by) || 1;
    const reach = radius / Math.sin(half);
    const cx = p.x + (bx / bl) * reach, cy = p.y + (by / bl) * reach;
    const sx = p.x + ux * along, sy = p.y + uy * along;
    const ex = p.x + vx * along, ey = p.y + vy * along;
    const a0 = Math.atan2(sy - cy, sx - cx);
    let delta = Math.atan2(ey - cy, ex - cx) - a0;
    while (delta > Math.PI) delta -= TAU;
    while (delta < -Math.PI) delta += TAU;
    out.push(...arcPoints(cx, cy, radius, a0, a0 + delta, tolerance));
  }
  return out;
}

function turned(loop: readonly PattiesPoint[], angle: number): PattiesLoop {
  if (!angle) return loop.slice();
  const c = Math.cos(angle), s = Math.sin(angle);
  return loop.map((p) => ({ x: p.x * c - p.y * s, y: p.x * s + p.y * c }));
}

function placed(loop: readonly PattiesPoint[], cx: number, cy: number, scale = 1): PattiesLoop {
  return loop.map((p) => ({ x: cx + p.x * scale, y: cy + p.y * scale }));
}

/**
 * The part of a loop on the side `nx*x + ny*y <= c` of a line, as loops: a figure with a waist may come apart in
 * two when it is cut, and both pieces are kept as they are, not joined by a thread along the cut.
 */
export function clipPattiesLoop(loop: readonly PattiesPoint[], nx: number, ny: number, c: number): PattiesLoop[] {
  const n = loop.length;
  const EPS = 1e-9;
  const side = loop.map((p) => c - (nx * p.x + ny * p.y));
  let anyIn = false, anyOut = false;
  for (const s of side) {
    if (s >= -EPS) anyIn = true;
    else anyOut = true;
  }
  if (!anyOut) return [loop.slice()];
  if (!anyIn) return [];

  const along = (p: PattiesPoint) => -ny * p.x + nx * p.y;
  type Chain = { points: PattiesPoint[]; entry: number; exit: number };
  const chains: Chain[] = [];
  let start = 0;
  for (let i = 0; i < n; i += 1) {
    if (side[i] < -EPS && side[(i + 1) % n] >= -EPS) {
      start = i;
      break;
    }
  }
  let current: Chain | null = null;
  for (let k = 0; k < n; k += 1) {
    const i = (start + k) % n;
    const j = (i + 1) % n;
    const aIn = side[i] >= -EPS, bIn = side[j] >= -EPS;
    if (aIn === bIn) {
      if (bIn && current) current.points.push(loop[j]);
      continue;
    }
    const t = side[i] / (side[i] - side[j]);
    const q = { x: loop[i].x + (loop[j].x - loop[i].x) * t, y: loop[i].y + (loop[j].y - loop[i].y) * t };
    if (bIn) {
      current = { points: [q, loop[j]], entry: along(q), exit: 0 };
    } else if (current) {
      current.points.push(q);
      current.exit = along(q);
      chains.push(current);
      current = null;
    }
  }
  if (chains.length <= 1) return chains.map((chain) => chain.points);

  // Along the cut the pieces of the loop pair up: every stretch of the line inside the loop joins the end of one
  // chain to the start of another.
  const marks = chains.flatMap((chain, index) => [
    { t: chain.entry, chain: index, entry: true },
    { t: chain.exit, chain: index, entry: false },
  ]).sort((a, b) => a.t - b.t);
  const next = new Array<number>(chains.length).fill(-1);
  let valid = true;
  for (let i = 0; i + 1 < marks.length; i += 2) {
    const a = marks[i], b = marks[i + 1];
    if (a.entry === b.entry) {
      valid = false;
      break;
    }
    const exit = a.entry ? b : a;
    const entry = a.entry ? a : b;
    next[exit.chain] = entry.chain;
  }
  if (!valid || next.some((value) => value < 0)) return chains.map((chain) => chain.points);
  const done = new Array<boolean>(chains.length).fill(false);
  const loops: PattiesLoop[] = [];
  for (let i = 0; i < chains.length; i += 1) {
    if (done[i]) continue;
    const points: PattiesPoint[] = [];
    let at = i;
    while (!done[at]) {
      done[at] = true;
      points.push(...chains[at].points);
      at = next[at];
    }
    loops.push(points);
  }
  return loops;
}

function clipLoopsToBox(loops: PattiesLoop[], minX: number, maxX: number, minY: number, maxY: number): PattiesLoop[] {
  let current = loops;
  for (const [nx, ny, c] of [[1, 0, maxX], [-1, 0, -minX], [0, 1, maxY], [0, -1, -minY]] as const) {
    current = current.flatMap((loop) => clipPattiesLoop(loop, nx, ny, c));
  }
  return current;
}

/**
 * What is left of a loop when a wedge is cut out of it: the wedge has its point at `apex` and opens between the
 * rays towards `first` and `second`, the second counter-clockwise from the first by less than half a turn. This is
 * the cut at the inward corner of a star, where a line alone would take away too much. The pieces close along the
 * wedge's two sides, round its point where they reach across it.
 */
export function cutPattiesWedge(loop: readonly PattiesPoint[], apex: PattiesPoint, first: PattiesPoint, second: PattiesPoint): PattiesLoop[] {
  const EPS = 1e-9;
  const firstLength = Math.hypot(first.x - apex.x, first.y - apex.y) || 1;
  const secondLength = Math.hypot(second.x - apex.x, second.y - apex.y) || 1;
  const r1 = { x: (first.x - apex.x) / firstLength, y: (first.y - apex.y) / firstLength };
  const r2 = { x: (second.x - apex.x) / secondLength, y: (second.y - apex.y) / secondLength };
  // Both are above 0 inside the wedge: how far a point is in from each of its sides.
  const f1 = (p: PattiesPoint) => r1.x * (p.y - apex.y) - r1.y * (p.x - apex.x);
  const f2 = (p: PattiesPoint) => r2.y * (p.x - apex.x) - r2.x * (p.y - apex.y);
  const depthIn = (p: PattiesPoint) => Math.min(f1(p), f2(p));

  // A long edge may cross the wedge with both ends outside it; a point is set on it inside the wedge, so that the
  // walk below sees it leave and come back.
  const points: PattiesPoint[] = [];
  for (let i = 0; i < loop.length; i += 1) {
    const a = loop[i], b = loop[(i + 1) % loop.length];
    points.push(a);
    if (depthIn(a) > EPS || depthIn(b) > EPS) continue;
    let from = 0, to = 1;
    for (const [fa, fb] of [[f1(a), f1(b)], [f2(a), f2(b)]]) {
      if (fa <= 0 && fb <= 0) {
        to = -1;
        break;
      }
      if (fa <= 0) from = Math.max(from, fa / (fa - fb));
      else if (fb <= 0) to = Math.min(to, fa / (fa - fb));
    }
    if (to <= from) continue;
    const middle = { x: a.x + (b.x - a.x) * ((from + to) / 2), y: a.y + (b.y - a.y) * ((from + to) / 2) };
    if (depthIn(middle) > 1e-7) points.push(middle);
  }

  const n = points.length;
  const side = points.map((p) => -depthIn(p));
  let anyIn = false, anyOut = false;
  for (const s of side) {
    if (s >= -EPS) anyIn = true;
    else anyOut = true;
  }
  if (!anyOut) return [loop.slice()];
  if (!anyIn) return [];

  // Where an edge from a kept point to a cut one meets the wedge, and how far along the wedge's edge that is:
  // below 0 on the first side, above 0 on the second, 0 at the point.
  const meet = (kept: PattiesPoint, cut: PattiesPoint) => {
    const a1 = f1(kept), a2 = f2(kept);
    const t1 = a1 < 0 ? -a1 / (f1(cut) - a1) : 0;
    const t2 = a2 < 0 ? -a2 / (f2(cut) - a2) : 0;
    const onFirst = t1 !== t2 ? t1 > t2 : a1 <= a2;
    const t = Math.max(t1, t2);
    const q = { x: kept.x + (cut.x - kept.x) * t, y: kept.y + (cut.y - kept.y) * t };
    const along = onFirst
      ? -Math.max(0, (q.x - apex.x) * r1.x + (q.y - apex.y) * r1.y)
      : Math.max(0, (q.x - apex.x) * r2.x + (q.y - apex.y) * r2.y);
    return { q, along };
  };
  type Chain = { points: PattiesPoint[]; entry: number; exit: number };
  const chains: Chain[] = [];
  let start = 0;
  for (let i = 0; i < n; i += 1) {
    if (side[i] < -EPS && side[(i + 1) % n] >= -EPS) {
      start = i;
      break;
    }
  }
  let current: Chain | null = null;
  for (let k = 0; k < n; k += 1) {
    const i = (start + k) % n;
    const j = (i + 1) % n;
    const aIn = side[i] >= -EPS, bIn = side[j] >= -EPS;
    if (aIn === bIn) {
      if (bIn && current) current.points.push(points[j]);
      continue;
    }
    if (bIn) {
      const { q, along } = meet(points[j], points[i]);
      current = { points: [q, points[j]], entry: along, exit: 0 };
    } else if (current) {
      const { q, along } = meet(points[i], points[j]);
      current.points.push(q);
      current.exit = along;
      chains.push(current);
      current = null;
    }
  }
  // From the end of one chain to the start of the next the piece follows the wedge, round its point if need be.
  const closed = (chain: Chain, to: Chain) => (chain.exit * to.entry < 0 ? [...chain.points, { x: apex.x, y: apex.y }] : chain.points);
  const marks = chains.flatMap((chain, index) => [
    { t: chain.entry, chain: index, entry: true },
    { t: chain.exit, chain: index, entry: false },
  ]).sort((a, b) => a.t - b.t);
  const next = new Array<number>(chains.length).fill(-1);
  let valid = true;
  for (let i = 0; i + 1 < marks.length; i += 2) {
    const a = marks[i], b = marks[i + 1];
    if (a.entry === b.entry) {
      valid = false;
      break;
    }
    const exit = a.entry ? b : a;
    const entry = a.entry ? a : b;
    next[exit.chain] = entry.chain;
  }
  if (!valid || next.some((value) => value < 0)) return chains.map((chain) => closed(chain, chain));
  const done = new Array<boolean>(chains.length).fill(false);
  const loops: PattiesLoop[] = [];
  for (let i = 0; i < chains.length; i += 1) {
    if (done[i]) continue;
    const piece: PattiesPoint[] = [];
    let at = i;
    while (!done[at]) {
      done[at] = true;
      piece.push(...closed(chains[at], chains[next[at]]));
      at = next[at];
    }
    loops.push(piece);
  }
  return loops;
}

/** The corners of a counter-clockwise loop that point inwards, as a star's do between two of its points. */
function inwardCorners(edge: readonly PattiesPoint[]) {
  const corners: number[] = [];
  for (let i = 0; i < edge.length; i += 1) {
    const before = edge[(i + edge.length - 1) % edge.length], at = edge[i], after = edge[(i + 1) % edge.length];
    if ((at.x - before.x) * (after.y - at.y) - (at.y - before.y) * (after.x - at.x) < -1e-9) corners.push(i);
  }
  return corners;
}

/**
 * The part of a figure inside a polygon or a star, both counter-clockwise. A polygon is cut along each of its
 * sides; a star is what its inward corners leave, each of them cutting a wedge out of the plane.
 */
export function clipPattiesLoopToEdge(loop: readonly PattiesPoint[], edge: readonly PattiesPoint[]): PattiesLoop[] {
  let pieces: PattiesLoop[] = [loop.slice()];
  const inward = inwardCorners(edge);
  if (inward.length) {
    for (const i of inward) {
      if (!pieces.length) break;
      const before = edge[(i + edge.length - 1) % edge.length], after = edge[(i + 1) % edge.length];
      pieces = pieces.flatMap((piece) => cutPattiesWedge(piece, edge[i], before, after));
    }
    return pieces;
  }
  for (let i = 0; i < edge.length && pieces.length; i += 1) {
    const p = edge[i], q = edge[(i + 1) % edge.length];
    const nx = q.y - p.y, ny = -(q.x - p.x);
    pieces = pieces.flatMap((piece) => clipPattiesLoop(piece, nx, ny, nx * p.x + ny * p.y));
  }
  return pieces;
}

function pointToEdge(p: PattiesPoint, a: PattiesPoint, b: PattiesPoint) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const length = dx * dx + dy * dy;
  const t = length > 0 ? clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / length, 0, 1) : 0;
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}

/** Whether two loops that do not cross come closer than `limit` anywhere. */
function loopsCloserThan(first: readonly PattiesPoint[], second: readonly PattiesPoint[], limit: number) {
  for (let i = 0; i < first.length; i += 1) {
    const a = first[i], b = first[(i + 1) % first.length];
    for (let j = 0; j < second.length; j += 1) {
      const c = second[j], d = second[(j + 1) % second.length];
      if (Math.min(pointToEdge(a, c, d), pointToEdge(c, a, b)) < limit) return true;
    }
  }
  return false;
}

/**
 * What is kept of one figure after a cut. A cut may leave two pieces with only a thread of plate between them -
 * the notch of a zigzag just inside the edge - so of two pieces closer than a bar only the larger stays.
 */
function keptPieces(pieces: PattiesLoop[], bar: number): PattiesLoop[] {
  const worth = pieces.filter(worthKeeping);
  if (worth.length < 2) return worth;
  const kept: PattiesLoop[] = [];
  for (const piece of worth.sort((a, b) => Math.abs(pattiesLoopArea(b)) - Math.abs(pattiesLoopArea(a)))) {
    if (kept.every((other) => !loopsCloserThan(piece, other, bar))) kept.push(piece);
  }
  return kept;
}

/** A figure worth keeping after a cut: not a splinter that closes up in the print. */
function worthKeeping(loop: readonly PattiesPoint[]) {
  if (loop.length < 3) return false;
  const area = Math.abs(pattiesLoopArea(loop));
  const perimeter = loopPerimeter(loop);
  return area >= MIN_FIGURE * MIN_FIGURE * 0.5 && (2 * area) / Math.max(perimeter, 1e-9) >= MIN_FIGURE * 0.35;
}

function random(seed: number) {
  let state = (Math.round(seed) * 2654435761 + 0x9e3779b9) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Pattern space
// ---------------------------------------------------------------------------------------------------------------

/**
 * Where the figures may go, in pattern space: `u` across, `v` up, both in mm where the pattern is at its own size.
 * `period` is set where the pattern runs round a full ring: its left and right end are the same line, and figures
 * cross it whole.
 */
type Region = {
  minU: number;
  maxU: number;
  minV: number;
  maxV: number;
  period: number | null;
  /**
   * How much larger than drawn a figure at height `v` arrives on the plate, 1 or more. Bars are drawn that much
   * thinner there, so on the plate they are as wide at the rim as at the middle.
   */
  grow: (v: number) => number;
};

const SAME_SIZE = () => 1;

type Layout = {
  outline: PattiesLoop;
  region: Region | null;
  /** Pattern space onto the plate; unset where both are the same but for the plate's middle. */
  carry: (p: PattiesPoint) => PattiesPoint;
  /**
   * Pattern space is bent on its way: edges are cut into steps this long across before they are carried, short
   * enough that a straight step leaves the curve by no more than an arc may (CHORD), even at the outermost ring.
   */
  bendStep: number;
  /** A second cut on the plate itself, for an edge that is not a straight line in pattern space. */
  plateBox: { minX: number; maxX: number; minY: number; maxY: number } | null;
  plateEllipse: { a: number; b: number } | null;
  /** The same for an edge with corners, a polygon or a star: the line the figures keep inside, counter-clockwise. */
  plateLoop: PattiesLoop | null;
  /** The plate is stretched after everything else (an oval plate with rings). */
  stretch: { x: number; y: number };
  width: number;
  depth: number;
};

/** The size of a figure at a place, 0..1 of its full size, from the bulge. */
function bulgeScale(settings: PattiesSettings, region: Region, u: number, v: number) {
  if (!settings.bulge) return 1;
  const fu = (region.minU + region.maxU) / 2 + (settings.focusX / 100) * ((region.maxU - region.minU) / 2);
  const fv = (region.minV + region.maxV) / 2 + (settings.focusY / 100) * ((region.maxV - region.minV) / 2);
  let distance: number;
  if (region.period) {
    const far = Math.max(fv - region.minV, region.maxV - fv) || 1;
    distance = Math.abs(v - fv) / far;
  } else {
    const farU = Math.max(fu - region.minU, region.maxU - fu);
    const farV = Math.max(fv - region.minV, region.maxV - fv);
    distance = Math.hypot(u - fu, v - fv) / (Math.hypot(farU, farV) || 1);
  }
  const d = clamp(distance, 0, 1);
  const strength = Math.abs(settings.bulge) / 25;
  return Math.pow(2, -strength * (settings.bulge > 0 ? d : 1 - d));
}

/**
 * The widths of the columns (or heights of the rows) of the warp grid: they shrink or grow step by step away from
 * the focus, and together fill `total` exactly. No column is narrower than a bar and the smallest figure.
 */
export function pattiesWarpSizes(count: number, total: number, gap: number, bulge: number, focus: number, ring: boolean): number[] {
  const least = gap + MIN_FIGURE;
  const n = Math.max(1, Math.min(count, Math.floor(total / least)));
  if (total < least) return [];
  const centre = ((n - 1) / 2) * (1 + focus / 100);
  const far = ring ? n / 2 : Math.max(centre, n - 1 - centre) || 1;
  const strength = bulge / 25;
  const weights = Array.from({ length: n }, (_, i) => {
    let d = Math.abs(i - centre);
    if (ring) d = Math.min(d, n - d);
    return Math.pow(2, -strength * clamp(d / far, 0, 1));
  });
  // Share out the width by weight; a column that would come out too narrow takes the least and the rest share
  // what is left.
  const sizes = new Array<number>(n).fill(0);
  const fixed = new Array<boolean>(n).fill(false);
  for (let pass = 0; pass < n; pass += 1) {
    let free = total;
    let weight = 0;
    for (let i = 0; i < n; i += 1) {
      if (fixed[i]) free -= least;
      else weight += weights[i];
    }
    let changed = false;
    for (let i = 0; i < n; i += 1) {
      if (fixed[i]) {
        sizes[i] = least;
        continue;
      }
      sizes[i] = (free * weights[i]) / (weight || 1);
      if (sizes[i] < least) {
        fixed[i] = true;
        changed = true;
      }
    }
    if (!changed) break;
  }
  return sizes;
}

// ---------------------------------------------------------------------------------------------------------------
// The patterns
// ---------------------------------------------------------------------------------------------------------------

type Context = {
  settings: PattiesSettings;
  region: Region;
  /** The column step and where the first column starts. */
  pitch: number;
  originU: number;
  columns: number;
  /** How far an arc may leave the true one on the plate; CHORD unless the plate has too many points. */
  chord: number;
  /**
   * How much smaller than on the plate a length is drawn for a figure between two heights: the bar, the smallest
   * figure and the arc tolerance all shrink by it. It follows the end of the figure that grows least, so the bar
   * is nowhere thinner than asked for.
   */
  shrink: (low: number, high: number) => number;
};

function latticeContext(settings: PattiesSettings, region: Region, chord: number): Context | null {
  const span = region.maxU - region.minU;
  const columns = settings.count;
  const pitch = region.period ? region.period / columns : (span + settings.gap) / columns;
  if (!(pitch > settings.gap + MIN_FIGURE * 0.5) || region.maxV - region.minV < MIN_FIGURE) return null;
  return {
    settings,
    region,
    pitch,
    originU: region.period ? 0 : region.minU - settings.gap / 2,
    columns,
    chord,
    shrink: (low, high) => 1 / Math.max(1, Math.min(region.grow(low), region.grow(high))),
  };
}

/** Rows of a honeycomb lattice that fit between the bottom and the top, with the middle of the first. */
function staggeredRows(context: Context, figure: number, rowStep: number) {
  const room = context.region.maxV - context.region.minV;
  const rows = Math.floor((room - figure) / rowStep + 1e-9) + 1;
  if (rows < 1 || room < figure - 1e-9) return { rows: 0, first: 0 };
  const used = (rows - 1) * rowStep + figure;
  return { rows, first: context.region.minV + (room - used) / 2 + figure / 2 };
}

/** The middles of a honeycomb lattice: every second row half a step along, and half figures at its ends. */
function staggeredCentres(context: Context, figure: number, rowStep: number): { u: number; v: number }[] {
  const { rows, first } = staggeredRows(context, figure, rowStep);
  const centres: { u: number; v: number }[] = [];
  for (let row = 0; row < rows; row += 1) {
    const odd = row % 2 === 1;
    const v = first + row * rowStep;
    if (context.region.period) {
      for (let i = 0; i < context.columns; i += 1) centres.push({ u: (i + (odd ? 1 : 0.5)) * context.pitch, v });
    } else if (odd) {
      for (let i = 0; i <= context.columns; i += 1) centres.push({ u: context.originU + i * context.pitch, v });
    } else {
      for (let i = 0; i < context.columns; i += 1) centres.push({ u: context.originU + (i + 0.5) * context.pitch, v });
    }
  }
  return centres;
}

function warpFigures(context: Context): PattiesLoop[] {
  const { settings, region } = context;
  const ring = Boolean(region.period);
  const gap = settings.gap;
  // The outermost figures reach the edge of the patterned ground: the grid is laid out half a bar wider all round.
  const padLow = (gap * context.shrink(region.minV, region.minV)) / 2;
  const padHigh = (gap * context.shrink(region.maxV, region.maxV)) / 2;
  const totalU = ring ? region.period! : region.maxU - region.minU + gap;
  const totalV = region.maxV - region.minV + padLow + padHigh;
  const columns = pattiesWarpSizes(settings.count, totalU, gap, settings.bulge, ring ? 0 : settings.focusX, ring);
  if (!columns.length) return [];
  const even = totalU / columns.length;
  const rowCount = settings.rows > 0 ? settings.rows : Math.max(1, Math.round(totalV / even));
  const rows = pattiesWarpSizes(rowCount, totalV, gap, settings.bulge, settings.focusY, false);
  const turn = (settings.turn * Math.PI) / 180;
  const figures: PattiesLoop[] = [];
  let v = region.minV - padLow;
  for (const rowSize of rows) {
    const k = context.shrink(v, v + rowSize);
    const tolerance = context.chord * k;
    let u = ring ? 0 : region.minU - gap / 2;
    for (const columnSize of columns) {
      const hx = (columnSize - gap * k) / 2;
      const hy = (rowSize - gap * k) / 2;
      if (hx >= (MIN_FIGURE * k) / 2 - 1e-9 && hy >= (MIN_FIGURE * k) / 2 - 1e-9) {
        let shape: PattiesLoop;
        if (settings.cell === "ellipse") {
          const steps = Math.max(8, Math.ceil(TAU / arcStep(Math.max(hx, hy), tolerance)));
          shape = Array.from({ length: steps }, (_, i) => ({ x: hx * Math.cos((i / steps) * TAU), y: hy * Math.sin((i / steps) * TAU) }));
        } else {
          const r = (settings.roundness / 100) * Math.min(hx, hy);
          shape = r < 1e-4
            ? [{ x: -hx, y: -hy }, { x: hx, y: -hy }, { x: hx, y: hy }, { x: -hx, y: hy }]
            : [
              ...arcPoints(hx - r, -hy + r, r, -Math.PI / 2, 0, tolerance),
              ...arcPoints(hx - r, hy - r, r, 0, Math.PI / 2, tolerance),
              ...arcPoints(-hx + r, hy - r, r, Math.PI / 2, Math.PI, tolerance),
              ...arcPoints(-hx + r, -hy + r, r, Math.PI, Math.PI * 1.5, tolerance),
            ];
        }
        if (turn) {
          // Turned, the figure is made as much smaller as keeps it inside its own field: the bars stay.
          shape = turned(shape, turn);
          let ex = 0, ey = 0;
          for (const p of shape) {
            ex = Math.max(ex, Math.abs(p.x));
            ey = Math.max(ey, Math.abs(p.y));
          }
          const fit = Math.min(1, hx / (ex || 1), hy / (ey || 1));
          shape = shape.map((p) => ({ x: p.x * fit, y: p.y * fit }));
        }
        figures.push(placed(shape, u + columnSize / 2, v + rowSize / 2));
      }
      u += columnSize;
    }
    v += rowSize;
  }
  return figures;
}

/** A polygon or star of radius 1, its corners rounded, its first corner pointing up. */
function unitDot(settings: PattiesSettings, tolerance: number): PattiesLoop {
  const sides = Math.max(3, settings.sides);
  const depth = settings.amount / 100;
  const points: PattiesPoint[] = [];
  const inner = 1 - 0.7 * depth;
  for (let i = 0; i < sides; i += 1) {
    const a = Math.PI / 2 + (i / sides) * TAU;
    points.push({ x: Math.cos(a), y: Math.sin(a) });
    if (depth > 0) {
      const b = a + Math.PI / sides;
      points.push({ x: inner * Math.cos(b), y: inner * Math.sin(b) });
    }
  }
  const rounded = roundLoopCorners(points, settings.roundness / 100, tolerance);
  let reach = 0;
  for (const p of rounded) reach = Math.max(reach, Math.hypot(p.x, p.y));
  return rounded.map((p) => ({ x: p.x / (reach || 1), y: p.y / (reach || 1) }));
}

function dotFigures(context: Context): PattiesLoop[] {
  const { settings, region } = context;
  const full = (context.pitch - settings.gap) / 2;
  const turn = (settings.turn * Math.PI) / 180;
  // One outline for all the dots, drawn fine enough for the largest.
  const shape = turned(unitDot(settings, context.chord / Math.max(context.pitch / 2, 0.5)), turn);
  const figures: PattiesLoop[] = [];
  for (const centre of staggeredCentres(context, Math.max(full * 2, 0), (context.pitch * Math.sqrt(3)) / 2)) {
    const k = context.shrink(centre.v - context.pitch / 2, centre.v + context.pitch / 2);
    const r = ((context.pitch - settings.gap * k) / 2) * bulgeScale(settings, region, centre.u, centre.v);
    if (r >= (MIN_FIGURE * k) / 2) figures.push(placed(shape, centre.u, centre.v, r));
  }
  return figures;
}

/**
 * A flower round the origin: `sides` petals, each a drop with its point at the middle. A petal is the wedge between
 * two bars that run out from the middle, closed by the circle that fits into the wedge, so two petals are a bar
 * apart all the way. `gap` is that bar: the spokes of a flower are short and held at both ends, so they are half as
 * wide as the bars between the flowers (pattiesSpoke). Where a flower is too small for petals it is a single dot.
 */
function flower(settings: PattiesSettings, radius: number, gap: number, least: number, tolerance: number): PattiesLoop[] {
  const petals = Math.max(3, settings.sides);
  const sine = Math.sin(Math.PI / petals);
  const apex = gap / 2 / sine;
  const widest = (radius * sine - gap / 2) / (1 + sine);
  const big = widest * (0.35 + 0.65 * (settings.amount / 100));
  if (big < least / 2) {
    const dot = radius * 0.6;
    return dot >= least / 2 ? [arcPoints(0, 0, dot, 0, TAU, tolerance).slice(0, -1)] : [];
  }
  const centre = radius - big;
  const reach = centre - apex;
  if (reach <= big * 1.02) {
    // No room for a point: the petal is a plain dot.
    const dot = arcPoints(centre, 0, big, 0, TAU, tolerance).slice(0, -1);
    return Array.from({ length: petals }, (_, i) => turned(dot, Math.PI / 2 + (i / petals) * TAU));
  }
  const half = Math.asin(big / reach);
  // The point may be rounded: a second, small circle that touches the same two sides.
  const small = (settings.roundness / 100) * big * 0.6;
  const lean = Math.PI / 2 + half;
  const petal: PattiesPoint[] = [...arcPoints(centre, 0, big, lean, -lean, tolerance)];
  if (small > 1e-3) {
    const smallCentre = apex + small / Math.sin(half);
    petal.push(...arcPoints(smallCentre, 0, small, -lean, -TAU + lean, tolerance));
  } else {
    petal.push({ x: apex, y: 0 });
  }
  return Array.from({ length: petals }, (_, i) => turned(petal, Math.PI / 2 + (i / petals) * TAU));
}

/** The bar between two petals of one flower: half the bar between the flowers, and never thinner than a bar may be. */
export function pattiesSpoke(gap: number) {
  return Math.max(PATTIES_MIN_GAP, gap / 2);
}

function petalFigures(context: Context): PattiesLoop[] {
  const { settings, region } = context;
  const full = (context.pitch - settings.gap) / 2;
  const turn = (settings.turn * Math.PI) / 180;
  const made = new Map<string, PattiesLoop[]>();
  const figures: PattiesLoop[] = [];
  for (const centre of staggeredCentres(context, Math.max(full * 2, 0), (context.pitch * Math.sqrt(3)) / 2)) {
    const k = context.shrink(centre.v - context.pitch / 2, centre.v + context.pitch / 2);
    // Flowers of nearly one size share one outline; the bars inside a flower keep their width at every size.
    const r = Math.round(((context.pitch - settings.gap * k) / 2) * bulgeScale(settings, region, centre.u, centre.v) * 50) / 50;
    const key = `${r}|${Math.round(k * 200)}`;
    let petals = made.get(key);
    if (!petals) {
      petals = flower(settings, r, pattiesSpoke(settings.gap) * k, MIN_FIGURE * k, context.chord * k).map((petal) => turned(petal, turn));
      made.set(key, petals);
    }
    for (const petal of petals) figures.push(placed(petal, centre.u, centre.v));
  }
  return figures;
}

/**
 * Scales: half rings hanging down, every second row half a step along, so each tip sits between two below. Their
 * ends are round, and stop short of the line the ring hangs from, so the row above keeps its bar.
 */
function scaleFigures(context: Context): PattiesLoop[] {
  const { settings, region } = context;
  const rowStep = context.pitch / 2;
  const room = region.maxV - region.minV;
  // Every row takes half a step of height: the ring hangs from the top of it.
  const rows = Math.floor(room / rowStep + 1e-9);
  if (rows < 1) return [];
  const first = region.minV + (room - rows * rowStep) / 2 + rowStep;
  const figures: PattiesLoop[] = [];
  for (let row = 0; row < rows; row += 1) {
    const odd = row % 2 === 1;
    const v = first + row * rowStep;
    const k = context.shrink(v - context.pitch / 2, v);
    const outer = context.pitch / 2 - settings.gap * k;
    const least = MIN_FIGURE * k;
    if (outer * 0.85 < least) continue;
    const from = region.period || !odd ? 0 : -1;
    for (let i = from; i < context.columns; i += 1) {
      const u = region.period
        ? (i + (odd ? 1 : 0.5)) * context.pitch
        : context.originU + (i + (odd ? 1 : 0.5)) * context.pitch;
      const width = clamp(outer * (0.15 + 0.6 * (settings.amount / 100)) * bulgeScale(settings, region, u, v), least, outer * 0.85);
      const inner = outer - width;
      const middle = outer - width / 2;
      // The round end, a half circle on the ring's middle line, just touches the line the ring hangs from.
      const stop = Math.asin(clamp(width / 2 / middle, 0, 1));
      const tolerance = context.chord * k;
      const left = { x: u - middle * Math.cos(stop), y: v - middle * Math.sin(stop) };
      const right = { x: u + middle * Math.cos(stop), y: v - middle * Math.sin(stop) };
      figures.push([
        ...arcPoints(u, v, outer, Math.PI + stop, TAU - stop, tolerance),
        ...arcPoints(right.x, right.y, width / 2, -stop, Math.PI - stop, tolerance).slice(1, -1),
        ...arcPoints(u, v, inner, TAU - stop, Math.PI + stop, tolerance),
        ...arcPoints(left.x, left.y, width / 2, stop, Math.PI + stop, tolerance).slice(1, -1),
      ]);
    }
  }
  return figures;
}

/** Waves: bands across the plate, cut into pieces so a ring of them does not fall out of the plate. */
function waveFigures(context: Context): PattiesLoop[] {
  const { settings, region } = context;
  const from = region.period ? 0 : region.minU;
  const span = region.period ?? region.maxU - region.minU;
  const length = span / settings.count;
  const smooth = settings.roundness / 100;
  const height = (settings.amount / 100) * (length / 4);
  const steepest = (height / length) * (4 * (1 - smooth) + TAU * smooth);
  // A sloped bar is thinner than it is tall: the bands keep as much further apart.
  const slope = Math.hypot(1, steepest);
  const room = region.maxV - region.minV - 2 * height;
  const widest = settings.gap * slope;
  const most = Math.floor((room + widest) / (MIN_FIGURE + widest) + 1e-9);
  if (most < 1) return [];
  const bands = Math.min(most, settings.rows > 0 ? settings.rows : Math.max(1, Math.round((room + widest) / Math.max(length / 2, MIN_FIGURE + widest))));
  const step = room / bands;
  // The bar on the line between two bands, as tall as it has to be drawn there; none at the bottom and the top.
  const barAt = (line: number) => {
    if (line === 0 || line === bands) return 0;
    const v = region.minV + line * step;
    return settings.gap * context.shrink(v - step / 2, v + step / 2 + 2 * height) * slope;
  };
  const wave = (u: number) => {
    const phase = ((u - from) / length) % 1;
    const p = phase < 0 ? phase + 1 : phase;
    const zigzag = p < 0.25 ? p * 4 : p < 0.75 ? 2 - p * 4 : p * 4 - 4;
    return height * ((1 - smooth) * zigzag + smooth * Math.sin(p * TAU));
  };
  const pieces = Math.max(1, settings.sides);
  const figures: PattiesLoop[] = [];
  for (let band = 0; band < bands; band += 1) {
    const low = region.minV + band * step + barAt(band) / 2;
    const high = region.minV + (band + 1) * step - barAt(band + 1) / 2;
    const k = context.shrink(region.minV + band * step, region.minV + (band + 1) * step + 2 * height);
    const bar = settings.gap * k;
    const middle = (low + high) / 2 + height;
    const half = ((high - low) * bulgeScale(settings, region, from + span / 2, middle)) / 2;
    if (half * 2 < MIN_FIGURE * k) continue;
    // Where the band is cut: every second band half a piece along, like bricks.
    const shift = band % 2 === 1 ? 0.5 : 0;
    const cuts: number[] = [];
    for (let i = 0; i <= pieces; i += 1) {
      const at = (i + shift) / pieces;
      if (region.period ? at < 1 + shift - 1e-9 : pieces > 1 && at > 1e-9 && at < 1 - 1e-9) cuts.push(from + at * span);
    }
    const stretches: [number, number][] = [];
    if (region.period) {
      for (let i = 0; i < cuts.length; i += 1) {
        stretches.push([cuts[i] + bar / 2, (i + 1 < cuts.length ? cuts[i + 1] : cuts[0] + span) - bar / 2]);
      }
    } else {
      const edges = [from, ...cuts, from + span];
      for (let i = 0; i + 1 < edges.length; i += 1) {
        stretches.push([edges[i] + (i === 0 ? 0 : bar / 2), edges[i + 1] - (i + 2 === edges.length ? 0 : bar / 2)]);
      }
    }
    for (const [a, b] of stretches) {
      if (b - a < MIN_FIGURE * k) continue;
      const us: number[] = [a];
      if (height > 1e-6) {
        const fine = smooth > 0 ? length / 24 : length / 2;
        const offset = smooth > 0 ? 0 : length / 4;
        for (let i = Math.ceil((a - from - offset) / fine + 1e-9); from + offset + i * fine < b - 1e-9; i += 1) {
          const u = from + offset + i * fine;
          if (u > a + 1e-9) us.push(u);
        }
      }
      us.push(b);
      const lower = us.map((u) => ({ x: u, y: middle + wave(u) - half }));
      const upper = us.map((u) => ({ x: u, y: middle + wave(u) + half })).reverse();
      figures.push([...lower, ...upper]);
    }
  }
  return figures;
}

/**
 * Cells: every figure is the ground nearer to its own seed than to any other, drawn in by half a bar. With no
 * disorder the seeds stand in a honeycomb and so do the cells.
 */
function cellFigures(context: Context): PattiesLoop[] {
  const { settings, region } = context;
  const next = random(settings.seed);
  const disorder = settings.amount / 100;
  const rowStep = (context.pitch * Math.sqrt(3)) / 2;
  const room = region.maxV - region.minV;
  const rows = Math.max(1, Math.round(room / rowStep));
  const step = room / rows;
  type Seed = { u: number; v: number; own: boolean };
  const seeds: Seed[] = [];
  for (let row = 0; row < rows; row += 1) {
    const odd = row % 2 === 1;
    const columns = region.period || !odd ? context.columns : context.columns + 1;
    for (let i = 0; i < columns; i += 1) {
      const base = region.period ? (i + (odd ? 1 : 0.5)) * context.pitch : context.originU + (i + (odd ? 0 : 0.5)) * context.pitch;
      const u = base + (next() - 0.5) * disorder * context.pitch * 0.9;
      const v = region.minV + (row + 0.5) * step + (next() - 0.5) * disorder * step * 0.9;
      seeds.push({
        u: region.period ? u : clamp(u, region.minU + 0.01, region.maxU - 0.01),
        v: clamp(v, region.minV + 0.01, region.maxV - 0.01),
        own: true,
      });
    }
  }
  if (region.period) {
    // Round a ring the neighbours across the seam count too.
    for (const seed of seeds.slice()) {
      seeds.push({ u: seed.u - region.period, v: seed.v, own: false }, { u: seed.u + region.period, v: seed.v, own: false });
    }
  }
  const reach = Math.max(context.pitch, step) * 3;
  const buckets = new Map<string, Seed[]>();
  for (const seed of seeds) {
    const key = `${Math.floor(seed.u / reach)},${Math.floor(seed.v / reach)}`;
    const list = buckets.get(key);
    if (list) list.push(seed);
    else buckets.set(key, [seed]);
  }
  const figures: PattiesLoop[] = [];
  for (const seed of seeds) {
    if (!seed.own) continue;
    const minU = region.period ? seed.u - reach : region.minU;
    const maxU = region.period ? seed.u + reach : region.maxU;
    let cell: PattiesLoop = [
      { x: minU, y: region.minV },
      { x: maxU, y: region.minV },
      { x: maxU, y: region.maxV },
      { x: minU, y: region.maxV },
    ];
    const bu = Math.floor(seed.u / reach), bv = Math.floor(seed.v / reach);
    for (let du = -1; du <= 1 && cell.length; du += 1) {
      for (let dv = -1; dv <= 1 && cell.length; dv += 1) {
        for (const other of buckets.get(`${bu + du},${bv + dv}`) ?? []) {
          if (other === seed) continue;
          const nx = other.u - seed.u, ny = other.v - seed.v;
          const distance = Math.hypot(nx, ny);
          if (distance < 1e-6 || distance > reach) continue;
          // The line half way between the two seeds, moved half a bar towards this one.
          const bar = settings.gap * context.shrink(Math.min(seed.v, other.v) - step, Math.max(seed.v, other.v) + step);
          const c = (nx * (seed.u + other.u)) / 2 + (ny * (seed.v + other.v)) / 2 - (bar / 2) * distance;
          cell = clipPattiesLoop(cell, nx, ny, c)[0] ?? [];
          if (!cell.length) break;
        }
      }
    }
    if (cell.length < 3) continue;
    let cx = 0, cy = 0;
    for (const p of cell) {
      cx += p.x;
      cy += p.y;
    }
    cx /= cell.length;
    cy /= cell.length;
    const scale = bulgeScale(settings, region, cx, cy);
    const sized = scale < 1 ? cell.map((p) => ({ x: cx + (p.x - cx) * scale, y: cy + (p.y - cy) * scale })) : cell;
    const cleaned = cleanPattiesLoop(sized);
    const k = context.shrink(seed.v, seed.v);
    if (cleaned.length >= 3 && Math.abs(pattiesLoopArea(cleaned)) >= MIN_FIGURE * MIN_FIGURE * k * k * 0.5) {
      figures.push(roundLoopCorners(cleaned, (settings.roundness / 100) * 0.9, context.chord * k));
    }
  }
  return figures;
}

/** A rectangle round the origin with its corners rounded by a share of its shorter half side. */
function roundedBox(hx: number, hy: number, share: number, tolerance: number): PattiesLoop {
  const r = share * Math.min(hx, hy);
  if (r < 1e-4) return [{ x: -hx, y: -hy }, { x: hx, y: -hy }, { x: hx, y: hy }, { x: -hx, y: hy }];
  return [
    ...arcPoints(hx - r, -hy + r, r, -Math.PI / 2, 0, tolerance),
    ...arcPoints(hx - r, hy - r, r, 0, Math.PI / 2, tolerance),
    ...arcPoints(-hx + r, hy - r, r, Math.PI / 2, Math.PI, tolerance),
    ...arcPoints(-hx + r, -hy + r, r, Math.PI, Math.PI * 1.5, tolerance),
  ];
}

/** The rows of a grid that fill the patterned ground from bottom to top: how many, how tall, and where the first starts. */
function gridRows(context: Context, wanted: number, natural: number) {
  const { region, settings } = context;
  const padLow = (settings.gap * context.shrink(region.minV, region.minV)) / 2;
  const padHigh = (settings.gap * context.shrink(region.maxV, region.maxV)) / 2;
  const total = region.maxV - region.minV + padLow + padHigh;
  const count = wanted > 0 ? wanted : Math.max(1, Math.round(total / Math.max(natural, 1e-6)));
  return { count, step: total / count, start: region.minV - padLow };
}

/** Bricks: rows of rectangles, every second row half a brick along. */
function brickFigures(context: Context): PattiesLoop[] {
  const { settings, region } = context;
  const rows = gridRows(context, settings.rows, context.pitch / 2);
  const figures: PattiesLoop[] = [];
  for (let row = 0; row < rows.count; row += 1) {
    const v = rows.start + row * rows.step;
    const k = context.shrink(v, v + rows.step);
    const hx = (context.pitch - settings.gap * k) / 2;
    const hy = (rows.step - settings.gap * k) / 2;
    if (hx < (MIN_FIGURE * k) / 2 || hy < (MIN_FIGURE * k) / 2) continue;
    const brick = roundedBox(hx, hy, settings.roundness / 100, context.chord * k);
    const odd = row % 2 === 1;
    // A shifted row has half a brick over each end, unless the row runs round a ring.
    const last = odd && !region.period ? context.columns : context.columns - 1;
    for (let i = 0; i <= last; i += 1) {
      const u = context.originU + (i + (odd ? 0 : 0.5)) * context.pitch + (odd && region.period ? context.pitch : 0);
      const scale = bulgeScale(settings, region, u, v + rows.step / 2);
      if (Math.min(hx, hy) * scale >= (MIN_FIGURE * k) / 2) figures.push(placed(brick, u, v + rows.step / 2, scale));
    }
  }
  return figures;
}

/** Triangles: rows of triangles standing and hanging in turn, each drawn in by half a bar. */
function triangleFigures(context: Context): PattiesLoop[] {
  const { settings, region } = context;
  const from = region.period ? 0 : region.minU;
  const side = (region.period ?? region.maxU - region.minU) / context.columns;
  const height = (side * Math.sqrt(3)) / 2;
  const room = region.maxV - region.minV;
  const rows = Math.floor(room / height + 1e-9);
  if (rows < 1) return [];
  const first = region.minV + (room - rows * height) / 2;
  const figures: PattiesLoop[] = [];
  for (let row = 0; row < rows; row += 1) {
    const v = first + row * height;
    const k = context.shrink(v, v + height);
    // Half a bar off every side leaves a smaller triangle round the same middle.
    const reach = 2 * (side / (2 * Math.sqrt(3)) - (settings.gap * k) / 2);
    if (reach < MIN_FIGURE * k) continue;
    const shift = row % 2 === 1 ? side / 2 : 0;
    // On a plate the rows run half a triangle over each end; round a ring every triangle is there once.
    for (let i = region.period ? 0 : -1; i <= (region.period ? context.columns - 1 : context.columns); i += 1) {
      for (const up of [true, false]) {
        const u = from + shift + (i + (up ? 0.5 : 1)) * side;
        const middle = v + (up ? height / 3 : (2 * height) / 3);
        const scale = bulgeScale(settings, region, u, middle);
        if (reach * scale < MIN_FIGURE * k) continue;
        const turn = up ? Math.PI / 2 : -Math.PI / 2;
        const corners = [0, 1, 2].map((corner) => ({ x: Math.cos(turn + (corner * TAU) / 3), y: Math.sin(turn + (corner * TAU) / 3) }));
        const shape = roundLoopCorners(corners, settings.roundness / 100, (context.chord * k) / reach);
        figures.push(placed(shape, u, middle, reach * scale));
      }
    }
  }
  return figures;
}

/** Diamonds: squares standing on a corner, stretched tall or wide, in a lattice of their own. */
function diamondFigures(context: Context): PattiesLoop[] {
  const { settings, region } = context;
  const from = region.period ? 0 : region.minU;
  const across = (region.period ?? region.maxU - region.minU) / context.columns;
  const up = across * Math.pow(2, (settings.amount - 50) / 50);
  const room = region.maxV - region.minV;
  const rows = Math.floor(room / up + 1e-9);
  if (rows < 1) return [];
  const first = region.minV + (room - rows * up) / 2;
  const a = across / 2, b = up / 2;
  // How far the middle is from a side: half a bar less than that is left of the diamond.
  const toSide = (a * b) / Math.hypot(a, b);
  const figures: PattiesLoop[] = [];
  const add = (u: number, v: number) => {
    const k = context.shrink(v - b, v + b);
    const share = ((toSide - (settings.gap * k) / 2) / toSide) * bulgeScale(settings, region, u, v);
    if (Math.min(a, b) * share < (MIN_FIGURE * k) / 2) return;
    const shape = roundLoopCorners([{ x: a, y: 0 }, { x: 0, y: b }, { x: -a, y: 0 }, { x: 0, y: -b }], settings.roundness / 100, context.chord * k);
    figures.push(placed(shape, u, v, share));
  };
  for (let row = 0; row < rows; row += 1) {
    for (let i = 0; i < context.columns; i += 1) add(from + (i + 0.5) * across, first + (row + 0.5) * up);
  }
  // The diamonds in between: on the corners of the first ones, with halves along the edge.
  for (let row = 0; row <= rows; row += 1) {
    for (let i = 0; i <= (region.period ? context.columns - 1 : context.columns); i += 1) add(from + i * across, first + row * up);
  }
  return figures;
}

/** A weave: fields of parallel strips, lying and standing in turn like a woven mat. */
function weaveFigures(context: Context): PattiesLoop[] {
  const { settings, region } = context;
  const rows = gridRows(context, 0, context.pitch);
  const strips = Math.max(1, settings.sides);
  const figures: PattiesLoop[] = [];
  for (let row = 0; row < rows.count; row += 1) {
    const v = rows.start + row * rows.step;
    const k = context.shrink(v, v + rows.step);
    const bar = settings.gap * k;
    const width = context.pitch - bar, height = rows.step - bar;
    for (let column = 0; column < context.columns; column += 1) {
      const u = context.originU + (column + 0.5) * context.pitch;
      const lying = (row + column) % 2 === 0;
      // Across the strips the field holds them and the bars between them.
      const acrossRoom = lying ? height : width;
      const thick = (acrossRoom - (strips - 1) * bar) / strips;
      const long = lying ? width : height;
      const scale = bulgeScale(settings, region, u, v + rows.step / 2);
      if (thick * scale < MIN_FIGURE * k || long * scale < MIN_FIGURE * k) continue;
      for (let strip = 0; strip < strips; strip += 1) {
        const offset = -acrossRoom / 2 + thick / 2 + strip * (thick + bar);
        const shape = lying
          ? roundedBox((long * scale) / 2, (thick * scale) / 2, settings.roundness / 100, context.chord * k)
          : roundedBox((thick * scale) / 2, (long * scale) / 2, settings.roundness / 100, context.chord * k);
        figures.push(placed(shape, u + (lying ? 0 : offset), v + rows.step / 2 + (lying ? offset : 0)));
      }
    }
  }
  return figures;
}

/**
 * Herringbone: slanted bars stacked in columns, leaning one way in one column and the other way in the next. A bar
 * is a slanted piece of its column: its ends stand upright on the column's sides, so the columns are a bar apart,
 * and the bars of a column are a bar apart measured square to their slant.
 */
function herringboneFigures(context: Context): PattiesLoop[] {
  const { settings, region } = context;
  const slant = (clamp(settings.turn, -75, 75) * Math.PI) / 180;
  const room = region.maxV - region.minV;
  const figures: PattiesLoop[] = [];
  for (let column = 0; column < context.columns; column += 1) {
    const u = context.originU + (column + 0.5) * context.pitch;
    const lean = column % 2 === 0 ? slant : -slant;
    const k = context.shrink(region.minV, region.maxV);
    const width = context.pitch - settings.gap * k;
    if (width < MIN_FIGURE * k) continue;
    // How far the bar's far end is above or below its near end.
    const rise = width * Math.tan(lean);
    const between = (settings.gap * k) / Math.cos(lean);
    const free = room - Math.abs(rise);
    const tall = settings.rows > 0
      ? (free + between) / settings.rows - between
      : Math.max(MIN_FIGURE * k, (0.2 + 0.8 * (settings.amount / 100)) * width * 0.6);
    const count = settings.rows > 0 ? settings.rows : Math.floor((free + between) / (tall + between) + 1e-9);
    if (count < 1 || tall < MIN_FIGURE * k) continue;
    const start = region.minV + Math.max(0, -rise) + (free - (count * (tall + between) - between)) / 2;
    for (let row = 0; row < count; row += 1) {
      const low = start + row * (tall + between);
      const bar: PattiesPoint[] = [
        { x: -width / 2, y: -rise / 2 - tall / 2 },
        { x: width / 2, y: rise / 2 - tall / 2 },
        { x: width / 2, y: rise / 2 + tall / 2 },
        { x: -width / 2, y: -rise / 2 + tall / 2 },
      ];
      const middle = low + rise / 2 + tall / 2;
      const scale = bulgeScale(settings, region, u, middle);
      if (tall * scale < MIN_FIGURE * k) continue;
      figures.push(placed(roundLoopCorners(bar, settings.roundness / 100, context.chord * k), u, middle, scale));
    }
  }
  return figures;
}

/**
 * Rays where the pattern runs round a middle or up a vessel: there the middle is the ring's own, and a ray is a
 * column from the innermost ring to the rim. Its sides lean in as the ring grows, so on the plate the bar between
 * two rays keeps its width.
 */
function rayColumns(context: Context): PattiesLoop[] {
  const { settings, region } = context;
  const rings = Math.max(1, settings.rows);
  const room = region.maxV - region.minV;
  const figures: PattiesLoop[] = [];
  for (let ring = 0; ring < rings; ring += 1) {
    const low = region.minV + (ring * room) / rings;
    const high = region.minV + ((ring + 1) * room) / rings;
    // Between two rings a bar as wide as its place asks for, half of it on each side of the line.
    const bottom = low + (ring === 0 ? 0 : (settings.gap * context.shrink(low, low)) / 2);
    const top = high - (ring === rings - 1 ? 0 : (settings.gap * context.shrink(high, high)) / 2);
    if (top - bottom < MIN_FIGURE * context.shrink(bottom, top)) continue;
    const steps = 10;
    for (let column = 0; column < context.columns; column += 1) {
      const left = context.originU + column * context.pitch;
      const right = left + context.pitch;
      const sides = Array.from({ length: steps + 1 }, (_, i) => {
        const v = bottom + ((top - bottom) * i) / steps;
        return { v, off: (settings.gap * context.shrink(v, v)) / 2 };
      });
      if (context.pitch - 2 * sides[0].off < MIN_FIGURE * context.shrink(bottom, bottom) && context.pitch - 2 * sides[steps].off < MIN_FIGURE * context.shrink(top, top)) continue;
      figures.push([
        ...sides.map((side) => ({ x: left + Math.min(side.off, context.pitch / 2 - 1e-4), y: side.v })).reverse(),
        ...sides.map((side) => ({ x: right - Math.min(side.off, context.pitch / 2 - 1e-4), y: side.v })),
      ]);
    }
  }
  return figures;
}

/**
 * Rays: wedges round a middle, like a sun, cut into rings if asked. The bars between them run straight out and
 * keep their width, so every ray starts where it is wide enough to be a figure.
 */
function rayFigures(context: Context): PattiesLoop[] {
  const { settings, region } = context;
  if (region.grow !== SAME_SIZE) return rayColumns(context);
  const minU = region.period ? 0 : region.minU;
  const maxU = region.period ?? region.maxU;
  const cu = (minU + maxU) / 2 + (settings.focusX / 100) * ((maxU - minU) / 2);
  const cv = (region.minV + region.maxV) / 2 + (settings.focusY / 100) * ((region.maxV - region.minV) / 2);
  const rays = Math.max(3, settings.count);
  const half = Math.PI / rays;
  const off = settings.gap / 2;
  const far = Math.max(Math.hypot(cu - minU, cv - region.minV), Math.hypot(maxU - cu, cv - region.minV), Math.hypot(cu - minU, region.maxV - cv), Math.hypot(maxU - cu, region.maxV - cv));
  // Where a ray is as wide as the smallest figure, and no nearer the middle than the open middle asks for.
  const least = (off + MIN_FIGURE / 2) / Math.sin(half);
  const start = Math.max(least, (settings.amount / 100) * 0.5 * Math.min(maxU - minU, region.maxV - region.minV));
  if (far <= start + MIN_FIGURE) return [];
  const rings = Math.max(1, settings.rows);
  const step = (far - start + settings.gap) / rings;
  const figures: PattiesLoop[] = [];
  for (let ray = 0; ray < rays; ray += 1) {
    const middle = Math.PI / 2 + ray * 2 * half;
    for (let ring = 0; ring < rings; ring += 1) {
      const inner = start + ring * step;
      const outer = inner + step - settings.gap;
      if (outer - inner < MIN_FIGURE) continue;
      // On a circle of radius r the bar takes this much of the angle on each side.
      const lost = (r: number) => Math.asin(Math.min(1, off / r));
      const loop: PattiesPoint[] = [
        ...arcPoints(cu, cv, outer, middle - half + lost(outer), middle + half - lost(outer), context.chord),
        ...arcPoints(cu, cv, inner, middle + half - lost(inner), middle - half + lost(inner), context.chord),
      ];
      const cut = keptPieces(clipLoopsToBox([loop], minU, maxU, region.minV, region.maxV), settings.gap);
      figures.push(...cut);
    }
  }
  return figures;
}

/** A motif: a ready figure or one's own, once in every place of a honeycomb lattice. */
function motifFigures(context: Context): PattiesLoop[] {
  const { settings, region } = context;
  const full = (context.pitch - settings.gap) / 2;
  const outlines = pattiesMotifOutlines(settings.motif, settings.motifLoops).map((loop) => turned(loop, (settings.turn * Math.PI) / 180));
  const figures: PattiesLoop[] = [];
  for (const centre of staggeredCentres(context, Math.max(full * 2, 0), (context.pitch * Math.sqrt(3)) / 2)) {
    const k = context.shrink(centre.v - context.pitch / 2, centre.v + context.pitch / 2);
    const r = ((context.pitch - settings.gap * k) / 2) * bulgeScale(settings, region, centre.u, centre.v);
    if (r < MIN_FIGURE * k) continue;
    const parts = outlines.map((outline) => placed(outline, centre.u, centre.v, r));
    // A figure of several parts is kept whole or not at all: two toes of a paw without the paw are no figure.
    const whole = parts.every((part) => part.every((p) =>
      p.y >= region.minV - 1e-7 && p.y <= region.maxV + 1e-7 && (region.period !== null || (p.x >= region.minU - 1e-7 && p.x <= region.maxU + 1e-7))));
    if (settings.cutEdge || whole) figures.push(...parts);
  }
  return figures;
}

function patternFigures(settings: PattiesSettings, region: Region, chord: number): PattiesLoop[] {
  const context = latticeContext(settings, region, chord);
  if (!context) return [];
  switch (settings.pattern) {
    case "warp":
      return warpFigures(context);
    case "dots":
      return dotFigures(context);
    case "petals":
      return petalFigures(context);
    case "scales":
      return scaleFigures(context);
    case "waves":
      return waveFigures(context);
    case "cells":
      return cellFigures(context);
    case "bricks":
      return brickFigures(context);
    case "triangles":
      return triangleFigures(context);
    case "diamonds":
      return diamondFigures(context);
    case "weave":
      return weaveFigures(context);
    case "herringbone":
      return herringboneFigures(context);
    case "rays":
      return rayFigures(context);
    case "motif":
      return motifFigures(context);
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Outlines and the way onto the plate
// ---------------------------------------------------------------------------------------------------------------

/**
 * How far the figures keep from the plate's edge. A plate keeps at least a bar there: with no border the figures
 * still do not open its side. Loose pieces have no plate and no border, so they reach the edge of their box.
 */
function edgeMargin(settings: PattiesSettings) {
  return settings.mode === "pieces" ? 0 : Math.max(settings.frame, PATTIES_MIN_GAP);
}

/** Left and right: where the two ends meet round a body, each keeps half a bar, so the bar across the seam is whole. */
function sideMargin(settings: PattiesSettings) {
  if (!settings.seamless) return edgeMargin(settings);
  return settings.mode === "pieces" ? settings.gap / 2 : Math.max(settings.gap / 2, PATTIES_MIN_GAP);
}

function cornered(outline: PattiesOutline) {
  return outline === "polygon" || outline === "star";
}

/**
 * A polygon or a star with all its sides alike and a corner at the top, counter-clockwise round the middle of the
 * box it fills, and that box. The larger side of the box is 1; a pentagon is a little less deep than wide.
 */
function evenCorners(settings: PattiesSettings): { loop: PattiesLoop; width: number; depth: number } {
  const count = settings.corners;
  const star = settings.outline === "star";
  // The inward corners of a star sit halfway between its middle and the line from point to point.
  const inner = Math.cos(Math.PI / count) / 2;
  const steps = star ? count * 2 : count;
  const raw: PattiesPoint[] = [];
  for (let k = 0; k < steps; k += 1) {
    const angle = Math.PI / 2 + (k / steps) * TAU;
    const radius = star && k % 2 ? inner : 1;
    raw.push({ x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
  }
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of raw) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const scale = 1 / Math.max(maxX - minX, maxY - minY);
  return {
    loop: raw.map((p) => ({ x: (p.x - (minX + maxX) / 2) * scale, y: (p.y - (minY + maxY) / 2) * scale })),
    width: (maxX - minX) * scale,
    depth: (maxY - minY) * scale,
  };
}

/** The edge of a plate with corners, filling the box it is given: pulled to another size it is stretched. */
function cornerLoop(settings: PattiesSettings, width: number, depth: number): PattiesLoop {
  const even = evenCorners(settings);
  return even.loop.map((p) => ({ x: (p.x / even.width) * width, y: (p.y / even.depth) * depth }));
}

/** A counter-clockwise loop of straight sides moved inwards by `margin`, or null where nothing is left of it. */
function insetLoop(loop: readonly PattiesPoint[], margin: number): PattiesLoop | null {
  const n = loop.length;
  const lines = loop.map((p, i) => {
    const q = loop[(i + 1) % n];
    const length = Math.hypot(q.x - p.x, q.y - p.y) || 1;
    const dx = (q.x - p.x) / length, dy = (q.y - p.y) / length;
    // Inwards is to the left of the way round.
    return { x: p.x - dy * margin, y: p.y + dx * margin, dx, dy };
  });
  const inset: PattiesPoint[] = [];
  for (let i = 0; i < n; i += 1) {
    const a = lines[(i + n - 1) % n], b = lines[i];
    const across = a.dx * b.dy - a.dy * b.dx;
    if (Math.abs(across) < 1e-9) return null;
    const t = ((b.x - a.x) * b.dy - (b.y - a.y) * b.dx) / across;
    inset.push({ x: a.x + a.dx * t, y: a.y + a.dy * t });
  }
  // A margin too wide turns a side round; then there is no ground left for figures.
  for (let i = 0; i < n; i += 1) {
    const p = inset[i], q = inset[(i + 1) % n];
    if ((q.x - p.x) * lines[i].dx + (q.y - p.y) * lines[i].dy < MIN_FIGURE) return null;
  }
  return inset;
}

/** The line the figures of a plate with corners keep inside, and the box round it. */
function cornerGround(settings: PattiesSettings, outline: PattiesLoop) {
  // Loose pieces reach the edge itself; the least step in keeps the cut clear of it.
  const inside = insetLoop(outline, Math.max(edgeMargin(settings), 1e-3));
  if (!inside) return null;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, far = 0;
  for (const p of inside) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
    far = Math.max(far, Math.hypot(p.x, p.y));
  }
  return { inside, minX, maxX, minY, maxY, far };
}

/**
 * The size at which a plate's outline is even, inside a square of `side`: a circle for a round plate, all sides
 * alike for a polygon and a star. A rectangle is a square then; a fan has the size of its vessel instead.
 */
export function pattiesEvenSize(input: Partial<PattiesSettings> | null | undefined, side: number): { width: number; depth: number } {
  const settings = normalizePatties(input);
  if (settings.outline === "fan") {
    const fan = pattiesFan(settings);
    return { width: fan.width, depth: fan.depth };
  }
  const even = cornered(settings.outline) ? evenCorners(settings) : { width: 1, depth: 1 };
  return { width: Math.round(even.width * side * 100) / 100, depth: Math.round(even.depth * side * 100) / 100 };
}

export type PattiesFan = {
  /** A vessel with straight sides: the unrolled side is a plain rectangle. */
  straight: boolean;
  inner: number;
  outer: number;
  /** The angle the unrolled side spans. */
  angle: number;
  /** The wide end is the vessel's top: the fan stands like a rainbow, otherwise it hangs. */
  wideTop: boolean;
  width: number;
  depth: number;
};

/** The largest angle a fan opens to; a vessel flatter than that would lap over itself when unrolled. */
const MAX_FAN_ANGLE = (350 / 360) * TAU;

/**
 * The side of a vessel that is round and has straight, sloped sides, unrolled flat: a piece of a ring. Its two arcs
 * are as long as the vessel's rims, and it is as wide as the vessel's side is long.
 */
export function pattiesFan(settings: Pick<PattiesSettings, "fanTop" | "fanBottom" | "fanSide">): PattiesFan {
  const top = settings.fanTop, bottom = settings.fanBottom, side = settings.fanSide;
  const wide = Math.max(top, bottom), narrow = Math.min(top, bottom);
  if (wide - narrow < 0.05) {
    return { straight: true, inner: 0, outer: 0, angle: 0, wideTop: true, width: Math.PI * wide, depth: side };
  }
  // Flatter than a full turn allows, the side is taken as long as it must be.
  const length = Math.max(side, ((wide - narrow) / 2) * (TAU / MAX_FAN_ANGLE));
  const inner = (length * narrow) / (wide - narrow);
  const outer = inner + length;
  const angle = Math.min(MAX_FAN_ANGLE, (Math.PI * wide) / outer);
  const half = angle / 2;
  // The box round a ring piece that is symmetric about the upright axis.
  const width = half >= Math.PI / 2 ? outer * 2 : outer * Math.sin(half) * 2;
  const low = half >= Math.PI / 2 ? outer * Math.cos(half) : inner * Math.cos(half);
  return { straight: false, inner, outer, angle, wideTop: top >= bottom, width, depth: outer - low };
}

/** The size the plate has by its own settings: a fan follows the vessel, everything else the box it is given. */
export function pattiesNaturalSize(settings: PattiesSettings, width: number, depth: number): { width: number; depth: number } {
  if (settings.outline !== "fan") return { width, depth };
  const fan = pattiesFan(settings);
  return { width: fan.width, depth: fan.depth };
}

/**
 * What changes on the shape when its pattern settings change: the settings themselves, and for a fan the plate's
 * size, which follows the vessel. A fan that was pulled to another size is set back to fit the vessel only when a
 * measure of the vessel or the outline itself changed, so a stretched fan stays stretched while its pattern is tuned.
 *
 * Another outline, or other corners, keeps an even plate even (#2055): a plate that comes back from a fan has the
 * fan's long box, and "round" on it would be an oval, so it becomes a circle as wide as the fan's short side; a
 * square plate becomes a pentagon with all sides alike, which is a little less deep than wide. A plate that was
 * pulled out of shape on purpose - a rectangle, an oval - keeps its box.
 */
export function pattiesShapePatch(
  shape: { patties?: Partial<PattiesSettings> | null; width?: number; depth?: number },
  change: Partial<Record<keyof PattiesSettings, unknown>>,
): { patties: PattiesSettings; width?: number; depth?: number } {
  const before = normalizePatties(shape.patties);
  const patties = normalizePatties({ ...shape.patties, ...change });
  const refit = patties.outline === "fan" && (
    before.outline !== "fan" || before.fanTop !== patties.fanTop || before.fanBottom !== patties.fanBottom || before.fanSide !== patties.fanSide);
  if (!refit) {
    const { width, depth } = shape;
    const reshaped = before.outline !== patties.outline || (cornered(patties.outline) && before.corners !== patties.corners);
    if (patties.outline === "fan" || !reshaped || !finite(width) || !finite(depth) || width <= 0 || depth <= 0) return { patties };
    let side: number | null = null;
    if (before.outline === "fan") {
      // A rectangle may well be as long as the fan was; everything else starts even again.
      side = patties.outline === "rectangle" ? null : Math.min(width, depth);
    } else {
      const was = pattiesEvenSize(before, Math.max(width, depth));
      if (Math.abs(was.width - width) < 0.02 && Math.abs(was.depth - depth) < 0.02) side = Math.max(width, depth);
    }
    if (side === null) return { patties };
    const even = pattiesEvenSize(patties, side);
    return Math.abs(even.width - width) < 0.005 && Math.abs(even.depth - depth) < 0.005 ? { patties } : { patties, ...even };
  }
  const fan = pattiesFan(patties);
  const width = Math.round(fan.width * 100) / 100;
  const depth = Math.round(fan.depth * 100) / 100;
  return { patties, width, depth };
}

function straightLayout(settings: PattiesSettings, width: number, depth: number, round: boolean): Layout {
  const carry = (p: PattiesPoint) => ({ x: p.x - width / 2, y: p.y - depth / 2 });
  const marginV = edgeMargin(settings);
  if (cornered(settings.outline)) {
    // A polygon or a star: the figures are laid out over the box round the patterned ground and cut by its sides.
    const outline = cornerLoop(settings, width, depth);
    const ground = cornerGround(settings, outline);
    const region: Region | null = ground && ground.maxX - ground.minX > MIN_FIGURE && ground.maxY - ground.minY > MIN_FIGURE
      ? { minU: ground.minX + width / 2, maxU: ground.maxX + width / 2, minV: ground.minY + depth / 2, maxV: ground.maxY + depth / 2, period: null, grow: SAME_SIZE }
      : null;
    return {
      outline, region, carry, bendStep: 0, plateBox: null, plateEllipse: null, plateLoop: region && ground ? ground.inside : null,
      stretch: { x: 1, y: 1 }, width, depth,
    };
  }
  if (!round) {
    const marginU = sideMargin(settings);
    const region: Region | null = width - 2 * marginU > MIN_FIGURE && depth - 2 * marginV > MIN_FIGURE
      ? { minU: marginU, maxU: width - marginU, minV: marginV, maxV: depth - marginV, period: null, grow: SAME_SIZE }
      : null;
    return {
      outline: [{ x: -width / 2, y: -depth / 2 }, { x: width / 2, y: -depth / 2 }, { x: width / 2, y: depth / 2 }, { x: -width / 2, y: depth / 2 }],
      region, carry, bendStep: 0, plateBox: null, plateEllipse: null, plateLoop: null, stretch: { x: 1, y: 1 }, width, depth,
    };
  }
  // A round plate: the figures are laid out over the box round the patterned ground and cut by its curve.
  const a = width / 2, b = depth / 2;
  // The drawn edge is made of straight steps that cut the curve short by up to CHORD.
  const shrink = 1 - (marginV + CHORD) / Math.min(a, b);
  const region: Region | null = shrink * Math.min(a, b) > MIN_FIGURE
    ? { minU: a - a * shrink, maxU: a + a * shrink, minV: b - b * shrink, maxV: b + b * shrink, period: null, grow: SAME_SIZE }
    : null;
  return {
    outline: ellipseLoop(a, b),
    region, carry, bendStep: 0, plateBox: null, plateEllipse: region ? { a: a * shrink, b: b * shrink } : null, plateLoop: null,
    stretch: { x: 1, y: 1 }, width, depth,
  };
}

function ellipseLoop(a: number, b: number): PattiesLoop {
  const steps = Math.max(48, Math.min(360, Math.ceil(TAU / arcStep(Math.max(a, b), CHORD))));
  return Array.from({ length: steps }, (_, k) => ({ x: a * Math.cos((k / steps) * TAU), y: b * Math.sin((k / steps) * TAU) }));
}

/** The smallest radius at which `count` figures and their bars still fit round a ring that spans `angle`. */
function bendStepFor(start: number, far: number) {
  return start * Math.min(0.12, Math.sqrt((8 * CHORD) / Math.max(far, 1e-6)));
}

function leastRing(settings: PattiesSettings, angle: number) {
  return Math.max(0.5, (settings.count * (settings.gap + MIN_FIGURE + 0.2)) / angle);
}

/**
 * Round a middle: pattern space is rolled up so that `u` runs round the ring and `v` outwards, and every step
 * outwards makes the figures as much larger as the ring is longer there. So a circle stays a circle and a bar never
 * gets thinner than it is at the innermost ring.
 */
function ringLayout(settings: PattiesSettings, width: number, depth: number, round: boolean): Layout {
  const margin = edgeMargin(settings);
  const least = Math.min(width, depth) / 2;
  const corners = cornered(settings.outline) ? cornerLoop(settings, width, depth) : null;
  const ground = corners ? cornerGround(settings, corners) : null;
  const far = corners ? ground?.far ?? 0 : round ? least - margin - CHORD : Math.hypot(width, depth) / 2;
  const start = Math.max((settings.hub / 100) * least, leastRing(settings, TAU));
  const region: Region | null = far > start * 1.05
    ? { minU: 0, maxU: TAU * start, minV: 0, maxV: start * Math.log(far / start), period: TAU * start, grow: (v) => Math.exp(v / start) }
    : null;
  const carry = (p: PattiesPoint) => {
    const r = start * Math.exp(p.y / start);
    const angle = Math.PI / 2 - p.x / start;
    return { x: r * Math.cos(angle), y: r * Math.sin(angle) };
  };
  if (corners) {
    // The rings run out to the farthest corner and are cut by the sides.
    return {
      outline: corners, region, carry, bendStep: bendStepFor(start, Math.max(far, start)), plateBox: null, plateEllipse: null,
      plateLoop: region && ground ? ground.inside : null, stretch: { x: 1, y: 1 }, width, depth,
    };
  }
  if (round) {
    return {
      outline: ellipseLoop(width / 2, depth / 2),
      region, carry, bendStep: bendStepFor(start, far), plateBox: null, plateEllipse: null, plateLoop: null,
      stretch: { x: width / 2 / least, y: depth / 2 / least }, width, depth,
    };
  }
  const marginU = margin;
  return {
    outline: [{ x: -width / 2, y: -depth / 2 }, { x: width / 2, y: -depth / 2 }, { x: width / 2, y: depth / 2 }, { x: -width / 2, y: depth / 2 }],
    region, carry, bendStep: bendStepFor(start, far),
    plateBox: { minX: -width / 2 + marginU, maxX: width / 2 - marginU, minY: -depth / 2 + margin, maxY: depth / 2 - margin },
    plateEllipse: null, plateLoop: null, stretch: { x: 1, y: 1 }, width, depth,
  };
}

function fanLayout(settings: PattiesSettings): Layout {
  const fan = pattiesFan(settings);
  if (fan.straight) return straightLayout(settings, fan.width, fan.depth, false);
  const margin = edgeMargin(settings);
  const half = fan.angle / 2;
  // The ring's middle sits below a standing fan and above a hanging one; the box round it is centred afterwards.
  const up = fan.wideTop ? 1 : -1;
  const low = half >= Math.PI / 2 ? fan.outer * Math.cos(half) : fan.inner * Math.cos(half);
  const middle = (fan.outer + low) / 2;
  const onPlate = (r: number, fromLeft: number) => {
    // `fromLeft` 0 at the left end of the fan, `fan.angle` at the right end.
    const angle = Math.PI / 2 + half - fromLeft;
    return { x: r * Math.cos(angle), y: up * (r * Math.sin(angle) - middle) };
  };
  const steps = Math.max(12, Math.ceil(fan.angle / arcStep(fan.outer, CHORD)));
  const outline: PattiesPoint[] = [];
  for (let k = 0; k <= steps; k += 1) outline.push(onPlate(fan.outer, (fan.angle * k) / steps));
  for (let k = steps; k >= 0; k -= 1) outline.push(onPlate(fan.inner, (fan.angle * k) / steps));

  // The pattern is at its own size on the ring where the figures and bars first fit; the fan starts further out
  // than that unless the vessel runs to a point.
  const start = Math.max(fan.inner, leastRing(settings, fan.angle));
  const from = Math.max(fan.inner + margin + CHORD, start);
  const to = fan.outer - margin - CHORD;
  const marginU = sideMargin(settings);
  const top = start * Math.log(fan.outer / start);
  const region: Region | null = to > from * 1.02 && fan.angle * start - 2 * marginU > MIN_FIGURE
    ? {
      minU: marginU,
      maxU: fan.angle * start - marginU,
      minV: fan.wideTop ? start * Math.log(from / start) : top - start * Math.log(to / start),
      maxV: fan.wideTop ? start * Math.log(to / start) : top - start * Math.log(from / start),
      period: null,
      grow: (v) => Math.exp((fan.wideTop ? v : top - v) / start),
    }
    : null;
  const carry = (p: PattiesPoint) => {
    const r = start * Math.exp((fan.wideTop ? p.y : top - p.y) / start);
    return onPlate(r, p.x / start);
  };
  return {
    outline, region, carry, bendStep: bendStepFor(start, fan.outer), plateBox: null, plateEllipse: null, plateLoop: null,
    stretch: { x: 1, y: 1 }, width: fan.width, depth: fan.depth,
  };
}

function layoutOf(settings: PattiesSettings, width: number, depth: number): Layout {
  if (settings.outline === "fan") return fanLayout(settings);
  const round = settings.outline === "round";
  return settings.layout === "polar" ? ringLayout(settings, width, depth, round) : straightLayout(settings, width, depth, round);
}

/** An edge that goes across pattern space bends on its way onto the plate: it is carried in short steps. */
function carried(loop: readonly PattiesPoint[], layout: Layout): PattiesLoop {
  if (!layout.bendStep) return loop.map(layout.carry);
  const out: PattiesPoint[] = [];
  for (let i = 0; i < loop.length; i += 1) {
    const a = loop[i];
    const b = loop[(i + 1) % loop.length];
    const steps = Math.max(1, Math.ceil(Math.abs(b.x - a.x) / layout.bendStep));
    for (let k = 0; k < steps; k += 1) {
      out.push(layout.carry({ x: a.x + ((b.x - a.x) * k) / steps, y: a.y + ((b.y - a.y) * k) / steps }));
    }
  }
  return out;
}

export type PattiesPlan = {
  /** The plate's edge, counter-clockwise, round the origin: x along the width, y along the depth. */
  outline: PattiesLoop;
  /** The figures, each counter-clockwise, none touching another or the edge. */
  figures: PattiesLoop[];
  /** The size the outline was drawn at. */
  width: number;
  depth: number;
  /** More figures were asked for than are built; the plate is then left plain. */
  tooMany: boolean;
};

/**
 * The plate seen from above: its edge and its figures. `width` and `depth` are the plate's size; a fan has the size
 * its vessel gives it (pattiesNaturalSize) and is stretched to the size asked for, like any shape that is pulled.
 */
export function pattiesPlan(input: Partial<PattiesSettings> | null | undefined, width: number, depth: number): PattiesPlan {
  const settings = normalizePatties(input);
  const safeWidth = Math.max(1, width);
  const safeDepth = Math.max(1, depth);
  const layout = layoutOf(settings, safeWidth, safeDepth);
  let figures: PattiesLoop[] = [];
  let tooMany = false;
  const region = layout.region;
  if (region) {
    let chord = CHORD;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      figures = patternFigures(settings, region, chord);
      const points = figures.reduce((sum, loop) => sum + loop.length, 0);
      if (points <= POINT_BUDGET) break;
      // Half as many points take an arc four times as coarse.
      chord = Math.min(0.4, chord * Math.max(2, (points / POINT_BUDGET) ** 2));
    }
    if (figures.length > PATTIES_MAX_FIGURES) {
      figures = [];
      tooMany = true;
    }
    // In pattern space the patterned ground is a box; round a full ring it has no left and right end.
    const inBox = (loop: PattiesLoop) => loop.every((p) =>
      p.y >= region.minV - 1e-7 && p.y <= region.maxV + 1e-7 && (region.period !== null || (p.x >= region.minU - 1e-7 && p.x <= region.maxU + 1e-7)));
    if (settings.cutEdge) {
      figures = figures.flatMap((loop) => {
        if (inBox(loop)) return [loop];
        const cut = clipLoopsToBox([loop], region.period !== null ? -Infinity : region.minU, region.period !== null ? Infinity : region.maxU, region.minV, region.maxV);
        return keptPieces(cut, settings.gap);
      });
    } else {
      figures = figures.filter(inBox);
    }
    figures = figures.map((loop) => carried(loop, layout));
    if (layout.plateBox) {
      const box = layout.plateBox;
      const inside = (loop: PattiesLoop) => loop.every((p) => p.x >= box.minX && p.x <= box.maxX && p.y >= box.minY && p.y <= box.maxY);
      figures = settings.cutEdge
        ? figures.flatMap((loop) => (inside(loop) ? [loop] : keptPieces(clipLoopsToBox([loop], box.minX, box.maxX, box.minY, box.maxY), settings.gap)))
        : figures.filter(inside);
    }
    if (layout.plateEllipse) {
      const { a, b } = layout.plateEllipse;
      const inside = (loop: PattiesLoop) => loop.every((p) => (p.x * p.x) / (a * a) + (p.y * p.y) / (b * b) <= 1);
      if (settings.cutEdge) {
        const edge = ellipseLoop(a, b);
        figures = figures.flatMap((loop) => {
          if (inside(loop)) return [loop];
          let pieces: PattiesLoop[] = [loop];
          for (let i = 0; i < edge.length && pieces.length; i += 1) {
            const p = edge[i], q = edge[(i + 1) % edge.length];
            const nx = q.y - p.y, ny = -(q.x - p.x);
            pieces = pieces.flatMap((piece) => clipPattiesLoop(piece, nx, ny, nx * p.x + ny * p.y));
          }
          return keptPieces(pieces, settings.gap);
        });
      } else {
        figures = figures.filter(inside);
      }
    }
    if (layout.plateLoop) {
      const edge = layout.plateLoop;
      // A figure is inside when the cut leaves it as it is: an edge may cross an inward corner between two points.
      const inside = (loop: PattiesLoop) => {
        const cut = clipPattiesLoopToEdge(loop, edge);
        return cut.length === 1 && cut[0].length === loop.length && cut[0].every((p, i) => p === loop[i]);
      };
      figures = settings.cutEdge
        ? figures.flatMap((loop) => (inside(loop) ? [loop] : keptPieces(clipPattiesLoopToEdge(loop, edge), settings.gap)))
        : figures.filter(inside);
    }
  }
  const sx = layout.stretch.x * (safeWidth / layout.width);
  const sy = layout.stretch.y * (safeDepth / layout.depth);
  const fit = (loop: PattiesLoop) => (sx === 1 && sy === 1 ? loop : loop.map((p) => ({ x: p.x * sx, y: p.y * sy })));
  // The ring layout draws its outline at the plate's size already; only its figures are stretched to an oval.
  const outlineFit = (loop: PattiesLoop) => {
    const ox = safeWidth / layout.width, oy = safeDepth / layout.depth;
    return ox === 1 && oy === 1 ? loop : loop.map((p) => ({ x: p.x * ox, y: p.y * oy }));
  };
  return {
    outline: cleanPattiesLoop(outlineFit(layout.outline)),
    figures: figures.map((loop) => cleanPattiesLoop(fit(loop))).filter((loop) => loop.length >= 3),
    width: safeWidth,
    depth: safeDepth,
    tooMany,
  };
}

export type PattiesFigures = {
  figures: number;
  /** The share of the plate the figures take, 0 to 1. */
  share: number;
  tooMany: boolean;
};

/** What the inspector says about the plate: how many figures, and how much of it they take. */
export function pattiesFigures(plan: PattiesPlan): PattiesFigures {
  const plate = Math.abs(pattiesLoopArea(plan.outline));
  let open = 0;
  for (const loop of plan.figures) open += Math.abs(pattiesLoopArea(loop));
  return { figures: plan.figures.length, share: plate > 0 ? clamp(open / plate, 0, 1) : 0, tooMany: plan.tooMany };
}

/** The pattern as a drawing for a cutter or plotter: the plate's edge and every figure, in millimetres. */
export function pattiesSvg(plan: PattiesPlan): string {
  const number = (value: number) => (Math.round(value * 1000) / 1000).toString();
  // On screen and on a cutter y runs down; the plate is seen from above with its back at the top.
  const path = (loop: PattiesLoop) => `M${loop.map((p) => `${number(p.x + plan.width / 2)} ${number(plan.depth / 2 - p.y)}`).join("L")}Z`;
  const edge = path(plan.outline);
  const figures = plan.figures.map(path).join("");
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${number(plan.width)}mm" height="${number(plan.depth)}mm" viewBox="0 0 ${number(plan.width)} ${number(plan.depth)}">`,
    `<path d="${edge}" fill="none" stroke="#000" stroke-width="0.1"/>`,
    figures ? `<path d="${figures}" fill="none" stroke="#d00" stroke-width="0.1"/>` : "",
    "</svg>",
  ].filter(Boolean).join("\n");
}
