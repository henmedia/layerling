/*
 * Smoothing a line drawn or laid in the view (the paint tool's lasso and magnetic lasso): the steps of a hand or of
 * the pixels the magnetic lasso ran along are evened out, while the corners meant as corners stay where they are.
 * The line is taken at even steps, its corners are found (a turn of more than CORNER_TURN within a few steps, the
 * sharpest of its neighbours), and the other points are moved towards their neighbours and back a little further
 * (Taubin's smoothing, which does not shrink a closed line as plain averaging would), as often as the strength says.
 */

type Point = [number, number];

/** The line is taken at steps this long (pixels) before it is smoothed. */
const STEP = 2;
/** How many steps either side a corner's turn is measured over. */
const CORNER_SPAN = 3;
/** A turn sharper than this (degrees) over CORNER_SPAN steps either side is a corner, kept where it is ... */
const CORNER_TURN = 55;
/** ... if it is still this sharp over twice as many steps: a shaky hand turns sharply too, but not for long. */
const WIDE_CORNER_TURN = 40;
/** At full strength the line is smoothed this many times. */
const MAX_PASSES = 30;
/** How closely the smoothed line is kept when its points are thinned out again, in pixels. */
const KEEP = 0.3;

function resample(points: readonly Point[], closed: boolean): Point[] {
  const line = closed ? [...points, points[0]] : points.slice();
  const out: Point[] = [line[0]];
  let carry = 0;
  for (let index = 1; index < line.length; index += 1) {
    const [x1, y1] = line[index - 1];
    const [x2, y2] = line[index];
    const length = Math.hypot(x2 - x1, y2 - y1);
    let at = STEP - carry;
    while (at <= length) {
      out.push([x1 + ((x2 - x1) * at) / length, y1 + ((y2 - y1) * at) / length]);
      at += STEP;
    }
    carry = length - (at - STEP);
  }
  const last = line[line.length - 1];
  if (closed) {
    // The way round ends where it began.
    const end = out[out.length - 1];
    if (Math.hypot(end[0] - last[0], end[1] - last[1]) < STEP / 2) out.pop();
  } else if (out[out.length - 1] !== last) {
    out.push(last);
  }
  return out;
}

function corners(points: readonly Point[], closed: boolean) {
  const count = points.length;
  const at = (index: number) => points[closed ? ((index % count) + count) % count : Math.max(0, Math.min(count - 1, index))];
  const turnOver = (index: number, span: number) => {
    const [a, b, c] = [at(index - span), points[index], at(index + span)];
    const inX = b[0] - a[0];
    const inY = b[1] - a[1];
    const outX = c[0] - b[0];
    const outY = c[1] - b[1];
    const lengths = Math.hypot(inX, inY) * Math.hypot(outX, outY);
    return lengths > 1e-9 ? Math.acos(Math.max(-1, Math.min(1, (inX * outX + inY * outY) / lengths))) : 0;
  };
  const turn = new Float64Array(count);
  for (let index = 0; index < count; index += 1) turn[index] = turnOver(index, CORNER_SPAN);
  const fixed = new Uint8Array(count);
  const limit = (CORNER_TURN * Math.PI) / 180;
  const wideLimit = (WIDE_CORNER_TURN * Math.PI) / 180;
  for (let index = 0; index < count; index += 1) {
    if (turn[index] < limit || turnOver(index, CORNER_SPAN * 2) < wideLimit) continue;
    let sharpest = true;
    for (let other = index - CORNER_SPAN; other <= index + CORNER_SPAN && sharpest; other += 1) {
      if (other === index || (!closed && (other < 0 || other >= count))) continue;
      const near = ((other % count) + count) % count;
      if (turn[near] > turn[index] || (turn[near] === turn[index] && near < index)) sharpest = false;
    }
    if (sharpest) fixed[index] = 1;
  }
  if (!closed && count) {
    fixed[0] = 1;
    fixed[count - 1] = 1;
  }
  return fixed;
}

/** The points kept so the line stays within KEEP of them (Douglas-Peucker). */
function thin(points: readonly Point[]): Point[] {
  if (points.length <= 2) return points.slice();
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: Array<[number, number]> = [[0, points.length - 1]];
  while (stack.length) {
    const [from, to] = stack.pop()!;
    const [ax, ay] = points[from];
    const [bx, by] = points[to];
    const span = Math.hypot(bx - ax, by - ay);
    let farthest = -1;
    let most = KEEP;
    for (let index = from + 1; index < to; index += 1) {
      const [px, py] = points[index];
      const off = span < 1e-9 ? Math.hypot(px - ax, py - ay) : Math.abs((bx - ax) * (ay - py) - (ax - px) * (by - ay)) / span;
      if (off > most) {
        most = off;
        farthest = index;
      }
    }
    if (farthest < 0) continue;
    keep[farthest] = 1;
    stack.push([from, farthest], [farthest, to]);
  }
  return points.filter((_, index) => keep[index]);
}

/**
 * The line smoothed by `strength`, 0 (as it is) to 100 (as smooth as it gets), its corners kept; `closed` for a
 * line that runs back to its start (a lasso), else its ends stay where they are.
 */
export function smoothOutline(points: ReadonlyArray<readonly [number, number]>, strength: number, closed: boolean): Array<[number, number]> {
  const passes = Math.round((Math.max(0, Math.min(100, strength)) / 100) * MAX_PASSES);
  const copy = points.map(([x, y]): Point => [x, y]);
  if (passes === 0 || points.length < 3) return copy;
  let line = resample(copy, closed);
  if (line.length < 5) return copy;
  const fixed = corners(line, closed);
  const count = line.length;
  const step = (factor: number) => {
    line = line.map((point, index) => {
      if (fixed[index]) return point;
      const before = line[closed ? (index - 1 + count) % count : index - 1];
      const after = line[closed ? (index + 1) % count : index + 1];
      return [point[0] + factor * ((before[0] + after[0]) / 2 - point[0]), point[1] + factor * ((before[1] + after[1]) / 2 - point[1])];
    });
  };
  for (let pass = 0; pass < passes; pass += 1) {
    step(0.5);
    step(-0.53);
  }
  if (!closed) return thin(line);
  // Thinned as an open line from one corner (or the first point) round to itself, then closed again.
  const start = Math.max(0, fixed.indexOf(1));
  const round = [...line.slice(start), ...line.slice(0, start), line[start]];
  return thin(round).slice(0, -1);
}
