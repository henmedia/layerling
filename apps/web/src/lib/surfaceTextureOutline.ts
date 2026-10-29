/**
 * The outline of an angular body standing along an axis (a box, a hexagonal prism, a plate with rounded corners): its
 * side faces seen along the axis are line segments, chained into loops. A pattern laid round such a body measures along
 * the loop instead of round a circle (prismOutline, outlineAngle), so it runs round its corners without a seam; a top
 * takes rings that follow the outline inwards (outlineRing).
 */

type Mesh = { vertices: ArrayLike<number>; indices: ArrayLike<number> };

export type OutlineLoop = {
  /** Points, two numbers each (across the axis), counterclockwise seen from the axis' end; the loop closes. */
  points: Float64Array;
  /** Length of the loop up to each point, and all round. */
  cum: Float64Array;
  length: number;
  /** Per point the turning angle there (radians, > 0 bending left: a convex corner of an outer loop). */
  turn: Float64Array;
  /** For rings moved in (see outlineRing): per segment the sum of tan(turn / 2) at both ends of the segments before it, and over all corners twice. */
  ringBefore: Float64Array;
  ringAll: number;
};

/** A sharp convex corner of the outer loop: where it is, the outward normals of the faces either side (2D), how far a corner may round (mm). */
export type OutlineCorner = { at: [number, number]; before: [number, number]; after: [number, number]; reach: number };

export type SurfaceOutline = {
  loops: OutlineLoop[];
  /** The outer loop (the longest). */
  main: number;
  /** Rings on a top (outlineRing) need a single convex loop. */
  ringable: boolean;
  corners: OutlineCorner[];
  /** Middle of the outer loop. */
  center: [number, number];
  /** Segments by grid cell, for finding the nearest quickly. */
  grid: { x0: number; y0: number; cell: number; cols: number; rows: number; cells: number[][] };
  /** Per segment (in loop order): its loop and its index there. */
  segLoop: Int32Array;
  segIndex: Int32Array;
};

/** Side faces within this of perpendicular to the axis, tops within this of along it (sine and cosine of 2 degrees). */
const SIDE_SIN = 0.035;
const CAP_COS = 0.9994;
/** Points closer than this (mm) across the axis are one. */
const SNAP = 1e-4;

/**
 * The outline of a body standing along axis `ax` (across it: `i1`, `i2`), or null when the body is not such a prism:
 * every face either a side face (normal across the axis) or a top or bottom (normal along it), the side faces' segments
 * closing into loops. Corners sharper than `edgeAngle` degrees are kept for rounding a pattern standing out round them.
 */
export function prismOutline(base: Mesh, ax: number, i1: number, i2: number, edgeAngle: number): SurfaceOutline | null {
  const v = base.vertices, I = base.indices;
  const T = I.length / 3;
  let total = 0, other = 0;
  const keyOf = new Map<string, number>();
  const pts: number[] = [];
  const point = (a: number, b: number) => {
    const key = `${Math.round(a / SNAP)},${Math.round(b / SNAP)}`;
    let id = keyOf.get(key);
    if (id === undefined) {
      id = pts.length / 2;
      keyOf.set(key, id);
      pts.push(a, b);
    }
    return id;
  };
  const segments: [number, number][] = [];
  for (let t = 0; t < T; t += 1) {
    const a = I[t * 3], b = I[t * 3 + 1], c = I[t * 3 + 2];
    const ux = v[b * 3] - v[a * 3], uy = v[b * 3 + 1] - v[a * 3 + 1], uz = v[b * 3 + 2] - v[a * 3 + 2];
    const wx = v[c * 3] - v[a * 3], wy = v[c * 3 + 1] - v[a * 3 + 1], wz = v[c * 3 + 2] - v[a * 3 + 2];
    const n = [uy * wz - uz * wy, uz * wx - ux * wz, ux * wy - uy * wx];
    const l = Math.hypot(n[0], n[1], n[2]);
    if (l === 0) continue;
    total += l;
    const along = Math.abs(n[ax]) / l;
    if (along >= CAP_COS) continue;
    if (along > SIDE_SIN) {
      other += l;
      continue;
    }
    // A side face seen along the axis: a segment between its two outermost points.
    const q = [a, b, c].map((i) => [v[i * 3 + i1], v[i * 3 + i2]]);
    let best = -1, p0 = 0, p1 = 1;
    for (const [x, y] of [[0, 1], [1, 2], [0, 2]]) {
      const d = Math.hypot(q[x][0] - q[y][0], q[x][1] - q[y][1]);
      if (d > best) [best, p0, p1] = [d, x, y];
    }
    if (best < SNAP * 4) continue;
    segments.push([point(q[p0][0], q[p0][1]), point(q[p1][0], q[p1][1])]);
  }
  if (!segments.length || other > 0.005 * total) return null;
  const P = pts.length / 2;
  if (P > 6000) return null;
  // Split every segment at the points lying on it, then keep each piece once.
  const pieces = new Set<string>();
  const edges: [number, number][] = [];
  const add = (p: number, q: number) => {
    if (p === q) return;
    const key = p < q ? `${p},${q}` : `${q},${p}`;
    if (pieces.has(key)) return;
    pieces.add(key);
    edges.push([p, q]);
  };
  for (const [p, q] of segments) {
    const ax0 = pts[p * 2], ay0 = pts[p * 2 + 1], dx = pts[q * 2] - ax0, dy = pts[q * 2 + 1] - ay0;
    const l2 = dx * dx + dy * dy;
    const on: [number, number][] = [];
    for (let k = 0; k < P; k += 1) {
      if (k === p || k === q) continue;
      const ox = pts[k * 2] - ax0, oy = pts[k * 2 + 1] - ay0;
      const t = (ox * dx + oy * dy) / l2;
      if (t <= 0 || t >= 1) continue;
      if (Math.abs(ox * dy - oy * dx) / Math.sqrt(l2) > SNAP * 4) continue;
      on.push([t, k]);
    }
    on.sort((x, y) => x[0] - y[0]);
    let last = p;
    for (const [, k] of on) {
      add(last, k);
      last = k;
    }
    add(last, q);
  }
  // Loops: every point between exactly two pieces.
  const next: number[][] = Array.from({ length: P }, () => []);
  for (const [p, q] of edges) {
    next[p].push(q);
    next[q].push(p);
  }
  const used = new Uint8Array(P);
  const loops: OutlineLoop[] = [];
  for (let start = 0; start < P; start += 1) {
    if (used[start] || !next[start].length) continue;
    const order: number[] = [];
    let prev = -1, cur = start;
    for (;;) {
      if (next[cur].length !== 2) return null;
      used[cur] = 1;
      order.push(cur);
      const nb = next[cur][0] === prev ? next[cur][1] : next[cur][0];
      prev = cur;
      cur = nb;
      if (cur === start) break;
      if (used[cur]) return null;
    }
    if (order.length < 3) return null;
    // Counterclockwise, and points where the outline goes on straight dropped.
    let area = 0;
    for (let k = 0; k < order.length; k += 1) {
      const a = order[k], b = order[(k + 1) % order.length];
      area += pts[a * 2] * pts[b * 2 + 1] - pts[b * 2] * pts[a * 2 + 1];
    }
    if (area < 0) order.reverse();
    const kept = order.filter((id, k) => {
      const a = order[(k + order.length - 1) % order.length], b = order[(k + 1) % order.length];
      const ux = pts[id * 2] - pts[a * 2], uy = pts[id * 2 + 1] - pts[a * 2 + 1], wx = pts[b * 2] - pts[id * 2], wy = pts[b * 2 + 1] - pts[id * 2 + 1];
      return Math.abs(ux * wy - uy * wx) > 1e-9 * Math.hypot(ux, uy) * Math.hypot(wx, wy) || ux * wx + uy * wy < 0;
    });
    const n = kept.length;
    const points = new Float64Array(n * 2);
    kept.forEach((id, k) => {
      points[k * 2] = pts[id * 2];
      points[k * 2 + 1] = pts[id * 2 + 1];
    });
    const cum = new Float64Array(n + 1);
    const turn = new Float64Array(n);
    for (let k = 0; k < n; k += 1) {
      const j = (k + 1) % n, h = (k + n - 1) % n;
      cum[k + 1] = cum[k] + Math.hypot(points[j * 2] - points[k * 2], points[j * 2 + 1] - points[k * 2 + 1]);
      const ux = points[k * 2] - points[h * 2], uy = points[k * 2 + 1] - points[h * 2 + 1];
      const wx = points[j * 2] - points[k * 2], wy = points[j * 2 + 1] - points[k * 2 + 1];
      turn[k] = Math.atan2(ux * wy - uy * wx, ux * wx + uy * wy);
    }
    const ringBefore = new Float64Array(n);
    for (let k = 1; k < n; k += 1) ringBefore[k] = ringBefore[k - 1] + Math.tan(turn[k - 1] / 2) + Math.tan(turn[k] / 2);
    const ringAll = Array.from(turn).reduce((sum, t) => sum + 2 * Math.tan(t / 2), 0);
    loops.push({ points, cum, length: cum[n], turn, ringBefore, ringAll });
  }
  if (!loops.length) return null;
  let main = 0;
  loops.forEach((loop, k) => {
    if (loop.length > loops[main].length) main = k;
  });
  const outer = loops[main];
  const m = outer.points.length / 2;
  let cx = 0, cy = 0;
  for (let k = 0; k < m; k += 1) {
    const j = (k + 1) % m;
    const len = outer.cum[k + 1] - outer.cum[k];
    cx += ((outer.points[k * 2] + outer.points[j * 2]) / 2) * len;
    cy += ((outer.points[k * 2 + 1] + outer.points[j * 2 + 1]) / 2) * len;
  }
  const center: [number, number] = [cx / outer.length, cy / outer.length];
  // Sharp convex corners of the outer loop; a corner may round as far as half its shorter side.
  const sharp = (edgeAngle * Math.PI) / 180;
  const corners: OutlineCorner[] = [];
  for (let k = 0; k < m; k += 1) {
    if (outer.turn[k] <= sharp) continue;
    const h = (k + m - 1) % m, j = (k + 1) % m;
    const normal = (a: number, b: number): [number, number] => {
      const dx = outer.points[b * 2] - outer.points[a * 2], dy = outer.points[b * 2 + 1] - outer.points[a * 2 + 1];
      const l = Math.hypot(dx, dy) || 1;
      return [dy / l, -dx / l];
    };
    const reach = 0.5 * Math.min(outer.cum[h + 1] - outer.cum[h], outer.cum[k + 1] - outer.cum[k]);
    corners.push({ at: [outer.points[k * 2], outer.points[k * 2 + 1]], before: normal(h, k), after: normal(k, j), reach });
  }
  const ringable = loops.length === 1 && Array.from(outer.turn).every((t) => t >= -1e-9);
  // The grid over all segments.
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, count = 0;
  for (const loop of loops) {
    for (let k = 0; k < loop.points.length; k += 2) {
      x0 = Math.min(x0, loop.points[k]);
      x1 = Math.max(x1, loop.points[k]);
      y0 = Math.min(y0, loop.points[k + 1]);
      y1 = Math.max(y1, loop.points[k + 1]);
    }
    count += loop.points.length / 2;
  }
  const side = Math.max(x1 - x0, y1 - y0, 1e-6);
  const g = Math.max(1, Math.min(128, Math.round(Math.sqrt(count) * 2)));
  const cell = side / g;
  const cols = Math.ceil((x1 - x0) / cell) + 1, rows = Math.ceil((y1 - y0) / cell) + 1;
  const cells: number[][] = Array.from({ length: cols * rows }, () => []);
  const segLoop: number[] = [], segIndex: number[] = [];
  loops.forEach((loop, li) => {
    const n = loop.points.length / 2;
    for (let k = 0; k < n; k += 1) {
      const id = segLoop.length;
      segLoop.push(li);
      segIndex.push(k);
      const j = (k + 1) % n;
      const ax0 = Math.min(loop.points[k * 2], loop.points[j * 2]), ax1 = Math.max(loop.points[k * 2], loop.points[j * 2]);
      const ay0 = Math.min(loop.points[k * 2 + 1], loop.points[j * 2 + 1]), ay1 = Math.max(loop.points[k * 2 + 1], loop.points[j * 2 + 1]);
      for (let r = Math.floor((ay0 - y0) / cell); r <= Math.floor((ay1 - y0) / cell); r += 1) {
        for (let c = Math.floor((ax0 - x0) / cell); c <= Math.floor((ax1 - x0) / cell); c += 1) cells[r * cols + c].push(id);
      }
    }
  });
  return { loops, main, ringable, corners, center, grid: { x0, y0, cell, cols, rows, cells }, segLoop: Int32Array.from(segLoop), segIndex: Int32Array.from(segIndex) };
}

/** The outline's segment nearest to (a, b): its loop, its index, the place along it (0 to its length) and the distance. */
export function nearestOnOutline(outline: SurfaceOutline, a: number, b: number) {
  const { x0, y0, cell, cols, rows, cells } = outline.grid;
  const cc = Math.min(cols - 1, Math.max(0, Math.floor((a - x0) / cell)));
  const cr = Math.min(rows - 1, Math.max(0, Math.floor((b - y0) / cell)));
  let best = Infinity, bestSeg = -1, bestAt = 0;
  const seen = new Set<number>();
  for (let ring = 0; ring < Math.max(cols, rows); ring += 1) {
    for (let r = cr - ring; r <= cr + ring; r += 1) {
      if (r < 0 || r >= rows) continue;
      for (let c = cc - ring; c <= cc + ring; c += 1) {
        if (c < 0 || c >= cols || (Math.abs(r - cr) !== ring && Math.abs(c - cc) !== ring)) continue;
        for (const id of cells[r * cols + c]) {
          if (seen.has(id)) continue;
          seen.add(id);
          const loop = outline.loops[outline.segLoop[id]];
          const k = outline.segIndex[id], n = loop.points.length / 2, j = (k + 1) % n;
          const px = loop.points[k * 2], py = loop.points[k * 2 + 1];
          const dx = loop.points[j * 2] - px, dy = loop.points[j * 2 + 1] - py;
          const len = loop.cum[k + 1] - loop.cum[k];
          const t = len > 0 ? Math.min(len, Math.max(0, ((a - px) * dx + (b - py) * dy) / len)) : 0;
          const d = Math.hypot(px + (dx * t) / (len || 1) - a, py + (dy * t) / (len || 1) - b);
          if (d < best - 1e-12) {
            best = d;
            bestSeg = id;
            bestAt = t;
          }
        }
      }
    }
    // Everything nearer than the cells searched so far is found.
    if (bestSeg >= 0 && best <= ring * cell) break;
  }
  return { loop: outline.segLoop[bestSeg], seg: outline.segIndex[bestSeg], at: bestAt, distance: best };
}

/** Round the outline: 0 to 2π along its loop from the loop's first point, counterclockwise (as an angle round a circle). */
export function outlineAngle(outline: SurfaceOutline, a: number, b: number) {
  const near = nearestOnOutline(outline, a, b);
  const loop = outline.loops[near.loop];
  return (2 * Math.PI * (loop.cum[near.seg] + near.at)) / loop.length;
}

/**
 * A point of a top inside a single convex outline (see SurfaceOutline.ringable) in rings following the outline inwards:
 * how far in it lies (`depth`, mm), how far round its ring (`turn`, 0 to 1), and the length of the ring at a given depth.
 * Each ring is the outline moved in, its corners staying on the corners' bisectors, so `turn` runs on without a jump
 * where the nearest side changes. Near another loop (a hole), the same round that one. Also the nearest point on the
 * outline (`foot`) and the outward normal of its side there (`normal`).
 */
export function outlineRing(outline: SurfaceOutline, a: number, b: number) {
  const near = nearestOnOutline(outline, a, b);
  const loop = outline.loops[near.loop];
  const depth = near.distance;
  const lengthAt = (d: number) => Math.max(loop.length - d * loop.ringAll, 1e-6);
  const along = loop.cum[near.seg] + near.at - depth * (loop.ringBefore[near.seg] + Math.tan(loop.turn[near.seg] / 2));
  const turn = along / lengthAt(depth);
  const n = loop.points.length / 2, k = near.seg, j = (k + 1) % n;
  const dx = loop.points[j * 2] - loop.points[k * 2], dy = loop.points[j * 2 + 1] - loop.points[k * 2 + 1];
  const len = Math.hypot(dx, dy) || 1;
  const foot: [number, number] = [loop.points[k * 2] + (dx * near.at) / len, loop.points[k * 2 + 1] + (dy * near.at) / len];
  // Away from the body's material: towards the foot (a hole's loop runs counterclockwise too, its normal would point in).
  const normal: [number, number] = depth > 1e-9 ? [(foot[0] - a) / depth, (foot[1] - b) / depth] : [dy / len, -dx / len];
  return { depth, turn: turn - Math.floor(turn), lengthAt, foot, normal };
}
