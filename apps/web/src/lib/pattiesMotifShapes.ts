import type { PattiesMotif } from "@/types/layerling";

/**
 * Patties: the figures the motif pattern repeats. A motif is one or more closed outlines inside a circle of
 * radius 1 round the origin, y up; the pattern makes it as large as its place in the lattice and turns it.
 *
 * There are a few ready ones, and one's own: the outlines of a drawing (SVG) or of a picture that was traced
 * (PNG, JPG), brought into that circle here. Reading the file itself is pattiesMotif.ts; this file is numbers only.
 */

export type MotifPoint = { x: number; y: number };

export const PATTIES_MOTIFS = ["heart", "drop", "moon", "cross", "leaf", "paw", "custom"] as const satisfies readonly PattiesMotif[];
/** The ready motifs, without one's own. */
export const PATTIES_READY_MOTIFS = PATTIES_MOTIFS.filter((motif) => motif !== "custom");
export const DEFAULT_PATTIES_MOTIF: PattiesMotif = "heart";

/** A motif of one's own keeps at most this many points and outlines: it is drawn once for every place in the pattern. */
export const PATTIES_MOTIF_MAX_POINTS = 200;
export const PATTIES_MOTIF_MAX_LOOPS = 16;

const TAU = Math.PI * 2;

function area(loop: readonly MotifPoint[]) {
  let sum = 0;
  for (let i = 0; i < loop.length; i += 1) {
    const a = loop[i];
    const b = loop[(i + 1) % loop.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return sum / 2;
}

function inside(point: MotifPoint, loop: readonly MotifPoint[]) {
  let within = false;
  for (let i = 0, j = loop.length - 1; i < loop.length; j = i, i += 1) {
    const a = loop[i], b = loop[j];
    if (a.y > point.y !== b.y > point.y && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) within = !within;
  }
  return within;
}

/** The loop with the points left out that leave it by less than `tolerance` (Douglas and Peucker). */
function simplified(loop: readonly MotifPoint[], tolerance: number): MotifPoint[] {
  if (loop.length <= 4) return loop.slice();
  // Split the closed line at its two points furthest apart, so each half has two fixed ends.
  let far = 0;
  for (let i = 1; i < loop.length; i += 1) {
    if (Math.hypot(loop[i].x - loop[0].x, loop[i].y - loop[0].y) > Math.hypot(loop[far].x - loop[0].x, loop[far].y - loop[0].y)) far = i;
  }
  const run = (points: readonly MotifPoint[]): MotifPoint[] => {
    if (points.length <= 2) return points.slice(0, -1);
    const a = points[0], b = points[points.length - 1];
    const dx = b.x - a.x, dy = b.y - a.y;
    const length = Math.hypot(dx, dy) || 1e-12;
    let worst = 0, at = 0;
    for (let i = 1; i < points.length - 1; i += 1) {
      const off = Math.abs((points[i].x - a.x) * dy - (points[i].y - a.y) * dx) / length;
      if (off > worst) {
        worst = off;
        at = i;
      }
    }
    if (worst <= tolerance) return [a];
    return [...run(points.slice(0, at + 1)), ...run(points.slice(at))];
  };
  return [...run(loop.slice(0, far + 1)), ...run([...loop.slice(far), loop[0]])];
}

/** Outlines as they come, brought into the circle of radius 1 round the middle of their box, counter-clockwise. */
function intoCircle(loops: readonly MotifPoint[][]): MotifPoint[][] {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of loops.flat()) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  let reach = 0;
  for (const p of loops.flat()) reach = Math.max(reach, Math.hypot(p.x - cx, p.y - cy));
  if (!(reach > 0)) return [];
  return loops.map((loop) => {
    const moved = loop.map((p) => ({ x: (p.x - cx) / reach, y: (p.y - cy) / reach }));
    return area(moved) < 0 ? moved.reverse() : moved;
  });
}

/**
 * A motif from the closed lines of a drawing or a traced picture. Only the outermost lines count: a hole in a
 * figure would leave an island that falls out of a stencil, so holes - and whatever stands inside them - are
 * left out. `yDown` says the lines come from a page, where y runs down. Null when nothing closed is left.
 */
export function pattiesMotifFromRings(rings: readonly (readonly MotifPoint[])[], yDown: boolean): number[][] | null {
  const closed = rings
    .map((ring) => ring.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y)).map((p) => ({ x: p.x, y: yDown ? -p.y : p.y })))
    .filter((ring) => ring.length >= 3)
    .map((ring) => ({ ring, size: Math.abs(area(ring)) }))
    .filter((entry) => entry.size > 0)
    .sort((a, b) => b.size - a.size);
  if (!closed.length) return null;
  const whole = closed[0].size;
  const outer = closed.filter((entry, index) =>
    entry.size >= whole * 1e-4 && !closed.slice(0, index).some((larger) => inside(entry.ring[0], larger.ring)));
  const kept = outer.slice(0, PATTIES_MOTIF_MAX_LOOPS).map((entry) => entry.ring);
  let loops = intoCircle(kept);
  if (!loops.length) return null;
  // Coarser and coarser until the motif keeps to its points; a thousandth of its size is where it starts.
  for (let tolerance = 0.001; tolerance < 0.2; tolerance *= 1.6) {
    const fewer = loops.map((loop) => simplified(loop, tolerance)).filter((loop) => loop.length >= 3);
    if (fewer.reduce((sum, loop) => sum + loop.length, 0) <= PATTIES_MOTIF_MAX_POINTS) {
      loops = fewer;
      break;
    }
    if (tolerance * 1.6 >= 0.2) loops = fewer;
  }
  loops = intoCircle(loops);
  if (!loops.length) return null;
  return loops.map((loop) => loop.flatMap((p) => [Math.round(p.x * 1e4) / 1e4, Math.round(p.y * 1e4) / 1e4]));
}

/** A motif of one's own as it is stored, checked: lists of numbers in pairs, inside the circle. Undefined when it is none. */
export function normalizePattiesMotifLoops(value: unknown): number[][] | undefined {
  if (!Array.isArray(value)) return undefined;
  const loops: number[][] = [];
  let points = 0;
  for (const entry of value.slice(0, PATTIES_MOTIF_MAX_LOOPS)) {
    if (!Array.isArray(entry) || entry.length < 6 || entry.length % 2 !== 0) continue;
    if (!entry.every((number) => typeof number === "number" && Number.isFinite(number) && Math.abs(number) <= 1.0001)) continue;
    points += entry.length / 2;
    if (points > PATTIES_MOTIF_MAX_POINTS * 2) break;
    loops.push(entry.map((number) => Math.round(number * 1e4) / 1e4));
  }
  return loops.length ? loops : undefined;
}

function arc(cx: number, cy: number, radius: number, from: number, to: number, steps: number): MotifPoint[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const a = from + ((to - from) * i) / steps;
    return { x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a) };
  });
}

function ready(motif: Exclude<PattiesMotif, "custom">): MotifPoint[][] {
  switch (motif) {
    case "heart":
      return [Array.from({ length: 64 }, (_, i) => {
        const t = (i / 64) * TAU;
        return { x: 16 * Math.sin(t) ** 3, y: 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t) };
      })];
    case "drop": {
      // A circle and a point above it, joined by the two lines that touch the circle.
      const lean = Math.PI / 2 + Math.asin(0.62 / 1.3);
      return [[{ x: 0, y: 1 }, ...arc(0, -0.3, 0.62, -Math.PI / 2 - lean, -Math.PI / 2 + lean, 28)]];
    }
    case "moon": {
      // A disc with a smaller one, set to the right, taken out of it.
      const outer = Math.atan2(0.7806, 0.625);
      const inner = Math.atan2(0.7806, 0.175);
      return [[...arc(0, 0, 1, outer, TAU - outer, 36), ...arc(0.45, 0, 0.8, -inner, -TAU + inner, 28).slice(1, -1)]];
    }
    case "cross": {
      const w = 0.3;
      return [[
        { x: w, y: -1 }, { x: w, y: -w }, { x: 1, y: -w }, { x: 1, y: w }, { x: w, y: w }, { x: w, y: 1 },
        { x: -w, y: 1 }, { x: -w, y: w }, { x: -1, y: w }, { x: -1, y: -w }, { x: -w, y: -w }, { x: -w, y: -1 },
      ]];
    }
    case "leaf": {
      // Two arcs from tip to tip.
      const half = Math.atan2(1, 0.75);
      return [[...arc(-0.75, 0, 1.25, -half, half, 20), ...arc(0.75, 0, 1.25, Math.PI - half, Math.PI + half, 20).slice(1, -1)]];
    }
    case "paw": {
      const pad = Array.from({ length: 28 }, (_, i) => ({ x: 0.5 * Math.cos((i / 28) * TAU), y: -0.34 + 0.4 * Math.sin((i / 28) * TAU) }));
      const toe = (x: number, y: number) => arc(x, y, 0.18, 0, TAU, 14).slice(0, -1);
      return [pad, toe(-0.68, 0.16), toe(-0.26, 0.66), toe(0.26, 0.66), toe(0.68, 0.16)];
    }
  }
}

const READY = new Map<PattiesMotif, MotifPoint[][]>();

/** The outlines of a motif, counter-clockwise inside the circle of radius 1. One's own that is missing is the heart. */
export function pattiesMotifOutlines(motif: PattiesMotif, own: readonly (readonly number[])[] | undefined): MotifPoint[][] {
  if (motif === "custom" && own?.length) {
    return own.map((loop) => Array.from({ length: loop.length / 2 }, (_, i) => ({ x: loop[i * 2], y: loop[i * 2 + 1] })));
  }
  const name = motif === "custom" ? DEFAULT_PATTIES_MOTIF : motif;
  let loops = READY.get(name);
  if (!loops) {
    loops = intoCircle(ready(name as Exclude<PattiesMotif, "custom">));
    READY.set(name, loops);
  }
  return loops;
}
