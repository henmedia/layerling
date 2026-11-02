/*
 * Cable channel: a round tunnel through a body, from an entry to an exit picked on its surface, for a cable or an LED
 * lead (Facebook question about a deer with LEDs). The tool finds the way itself:
 *
 * 1. The body is cut into a grid of little cubes; a cube is inside when a ray up through its column crosses the
 *    surface an odd number of times below it.
 * 2. Every inside cube learns how far it is from the hull (an exact Euclidean distance transform on the grid).
 * 3. The cheapest walk from cube to cube, where a cube near the hull costs more: the walk keeps to the middle, and
 *    cubes closer to the hull than the channel's radius and its wall are not walked at all.
 * 4. The walk becomes straight pieces: corners that a straight line can pass with room to spare go away ("pulling
 *    the string"). Both ends run straight in along the surface's normal for a few millimetres.
 * 5. Every remaining corner is rounded with the largest bend from three times the minimum bend down to it that keeps
 *    the wall; where even the minimum does not fit, a tighter one is used and the result says so.
 * 6. The straight pieces and bends are exactly the segments of a bent tube: the channel becomes a bent tube, solid,
 *    as a hole, placed and turned so that it starts just outside the entry and ends just outside the exit. It stays
 *    a bent tube to change later and keeps the body exact.
 *
 * Plain functions without React, so the search can be tested on its own.
 */
import * as THREE from "three";
import {
  MAX_BENT_TUBE_SEGMENTS,
  bentTubeLocalPlacement,
  bentTubeNaturalDimensions,
  bentTubeStations,
  bentTubeSettings,
  minBentTubeBendRadius,
} from "@/lib/bentTubeGeometry";
import { rotationPatchFromQuaternion } from "@/lib/geometryRotation";
import type { BentTubeSegment, WorkplaneShape } from "@/types/layerling";

export type Vec3 = [number, number, number];

export type CableChannelOptions = {
  /** Diameter of the channel in mm. */
  diameter: number;
  /** Smallest centre-line radius of a bend, in mm, so that a cable can still be pushed through. */
  minBend: number;
  /** Least material left between the channel and the hull, in mm. */
  minWall: number;
};

export const CABLE_DEFAULTS: CableChannelOptions = { diameter: 5, minBend: 25, minWall: 1.5 };
export const MIN_CABLE_DIAMETER = 1;
export const MAX_CABLE_DIAMETER = 30;
export const MAX_CABLE_BEND = 200;
export const MIN_CABLE_WALL = 0.4;
export const MAX_CABLE_WALL = 10;

/** A point picked on the body, with the surface's outward normal there. */
export type CableEnd = { point: Vec3; normal: Vec3 };

export type CableChannelError = "noBody" | "endsTooClose" | "endTooThin" | "noWay" | "tooWinding";

export type CableChannelPath = {
  ok: true;
  /** The bent tube's chain, from just outside the entry to just outside the exit. */
  segments: BentTubeSegment[];
  /** The centre line in the world, densely sampled, for a preview. */
  centreLine: Vec3[];
  /** The tightest bend's radius (Infinity for a straight channel) and the thinnest wall along the way, in mm. */
  minBend: number;
  minWall: number;
  /** Length of the centre line inside the body, in mm. */
  length: number;
  /** A bend had to be more than 5 % tighter than asked, or the wall is thinner than asked somewhere. */
  tight: boolean;
  thin: boolean;
  /** Where the tube starts (just outside the entry) and its own axes in the world: +X runs in, -Z is the first bend. */
  start: Vec3;
  axes: { x: Vec3; y: Vec3; z: Vec3 };
};

export type CableChannelResult = CableChannelPath | { ok: false; error: CableChannelError };

export function normalizeCableOptions(options: Partial<CableChannelOptions>): CableChannelOptions {
  const number = (value: unknown, fallback: number) => (typeof value === "number" && Number.isFinite(value) ? value : fallback);
  const diameter = Math.min(MAX_CABLE_DIAMETER, Math.max(MIN_CABLE_DIAMETER, number(options.diameter, CABLE_DEFAULTS.diameter)));
  return {
    diameter,
    // A bend tighter than the tube's own radius cannot be built; the bent tube needs a little more than that.
    minBend: Math.min(MAX_CABLE_BEND, Math.max(minBentTubeBendRadius("round", diameter), number(options.minBend, CABLE_DEFAULTS.minBend))),
    minWall: Math.min(MAX_CABLE_WALL, Math.max(MIN_CABLE_WALL, number(options.minWall, CABLE_DEFAULTS.minWall))),
  };
}

// ---- small vector helpers ----------------------------------------------------------------------------------------
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);
const unit = (a: Vec3): Vec3 => {
  const l = len(a);
  return l > 1e-12 ? mul(a, 1 / l) : [0, 0, 0];
};
function rotate(v: Vec3, axis: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle), s = Math.sin(angle);
  const k = cross(axis, v), d = dot(axis, v) * (1 - c);
  return [v[0] * c + k[0] * s + axis[0] * d, v[1] * c + k[1] * s + axis[1] * d, v[2] * c + k[2] * s + axis[2] * d];
}

// ---- the grid --------------------------------------------------------------------------------------------------
/** At most this many cubes along the body's longest side: fine enough for a channel, quick enough to search. */
const GRID_CELLS = 120;
/** No finer than this, in mm: smaller cubes would only cost time. */
const GRID_FINEST = 0.4;

export type CableGrid = {
  origin: Vec3;
  step: number;
  n: [number, number, number];
  inside: Uint8Array;
  /** Distance from each cube's middle to the hull in mm (0 outside). */
  distance: Float32Array;
};

/** The body as a grid: inside or not, and how far from the hull. `triangles` are nine numbers each, in the world. */
export function cableGrid(triangles: ArrayLike<number>, finest = GRID_FINEST): CableGrid | null {
  if (triangles.length < 9) return null;
  const min: Vec3 = [Infinity, Infinity, Infinity], max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < triangles.length; i += 1) {
    const axis = i % 3;
    if (triangles[i] < min[axis]) min[axis] = triangles[i];
    if (triangles[i] > max[axis]) max[axis] = triangles[i];
  }
  const longest = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
  if (!(longest > 0)) return null;
  const step = Math.max(finest, longest / GRID_CELLS);
  // One empty cube all round, so every inside cube has an outside one to measure against.
  const origin: Vec3 = [min[0] - step, min[1] - step, min[2] - step];
  const n: [number, number, number] = [0, 1, 2].map((axis) => Math.ceil((max[axis] - min[axis]) / step) + 2) as [number, number, number];
  const [nx, ny, nz] = n;
  const inside = new Uint8Array(nx * ny * nz);
  // Each column (x, z) collects the heights where it crosses the surface; the triangles are sorted into the columns
  // their shadow covers first. A hair's breadth off the cube's middle, so a column never runs along an edge.
  const crossings: number[][] = Array.from({ length: nx * nz }, () => []);
  const jitter = step * 1.3e-4;
  for (let t = 0; t + 8 < triangles.length; t += 9) {
    const ax = triangles[t], ay = triangles[t + 1], az = triangles[t + 2];
    const bx = triangles[t + 3], by = triangles[t + 4], bz = triangles[t + 5];
    const cx = triangles[t + 6], cy = triangles[t + 7], cz = triangles[t + 8];
    const det = (bx - ax) * (cz - az) - (cx - ax) * (bz - az);
    if (Math.abs(det) < 1e-14) continue;
    const i0 = Math.max(0, Math.floor((Math.min(ax, bx, cx) - origin[0]) / step - 0.5));
    const i1 = Math.min(nx - 1, Math.ceil((Math.max(ax, bx, cx) - origin[0]) / step - 0.5));
    const k0 = Math.max(0, Math.floor((Math.min(az, bz, cz) - origin[2]) / step - 0.5));
    const k1 = Math.min(nz - 1, Math.ceil((Math.max(az, bz, cz) - origin[2]) / step - 0.5));
    for (let i = i0; i <= i1; i += 1) {
      const px = origin[0] + (i + 0.5) * step + jitter;
      for (let k = k0; k <= k1; k += 1) {
        const pz = origin[2] + (k + 0.5) * step + jitter * 0.7;
        const u = ((px - ax) * (cz - az) - (cx - ax) * (pz - az)) / det;
        const v = ((bx - ax) * (pz - az) - (px - ax) * (bz - az)) / det;
        if (u < 0 || v < 0 || u + v > 1) continue;
        crossings[i * nz + k].push(ay + u * (by - ay) + v * (cy - ay));
      }
    }
  }
  crossings.forEach((ys, column) => {
    if (ys.length < 2) return;
    ys.sort((a, b) => a - b);
    const i = Math.floor(column / nz), k = column % nz;
    for (let pair = 0; pair + 1 < ys.length; pair += 2) {
      const j0 = Math.max(0, Math.ceil((ys[pair] - origin[1]) / step - 0.5));
      const j1 = Math.min(ny - 1, Math.floor((ys[pair + 1] - origin[1]) / step - 0.5));
      for (let j = j0; j <= j1; j += 1) inside[(i * ny + j) * nz + k] = 1;
    }
  });
  return { origin, step, n, inside, distance: distanceToHull(inside, n, step) };
}

/**
 * Exact squared distance from every inside cube to the nearest outside one (Felzenszwalb and Huttenlocher, one axis
 * after the other), then in mm, less half a cube: the hull runs between an inside and an outside cube.
 */
function distanceToHull(inside: Uint8Array, [nx, ny, nz]: [number, number, number], step: number) {
  const total = nx * ny * nz;
  const big = 1e20;
  const d2 = new Float64Array(total);
  for (let index = 0; index < total; index += 1) d2[index] = inside[index] ? big : 0;
  const longest = Math.max(nx, ny, nz);
  const f = new Float64Array(longest), out = new Float64Array(longest);
  const v = new Int32Array(longest), z = new Float64Array(longest + 1);
  const pass = (count: number, read: (i: number) => number, write: (i: number, value: number) => void) => {
    for (let i = 0; i < count; i += 1) f[i] = read(i);
    let k = 0;
    v[0] = 0; z[0] = -Infinity; z[1] = Infinity;
    for (let q = 1; q < count; q += 1) {
      let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (s <= z[k]) {
        k -= 1;
        s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      }
      k += 1; v[k] = q; z[k] = s; z[k + 1] = Infinity;
    }
    k = 0;
    for (let q = 0; q < count; q += 1) {
      while (z[k + 1] < q) k += 1;
      out[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
    }
    for (let i = 0; i < count; i += 1) write(i, out[i]);
  };
  for (let i = 0; i < nx; i += 1) for (let j = 0; j < ny; j += 1) pass(nz, (k) => d2[(i * ny + j) * nz + k], (k, value) => { d2[(i * ny + j) * nz + k] = value; });
  for (let i = 0; i < nx; i += 1) for (let k = 0; k < nz; k += 1) pass(ny, (j) => d2[(i * ny + j) * nz + k], (j, value) => { d2[(i * ny + j) * nz + k] = value; });
  for (let j = 0; j < ny; j += 1) for (let k = 0; k < nz; k += 1) pass(nx, (i) => d2[(i * ny + j) * nz + k], (i, value) => { d2[(i * ny + j) * nz + k] = value; });
  const distance = new Float32Array(total);
  for (let index = 0; index < total; index += 1) distance[index] = inside[index] ? Math.max(0, Math.sqrt(d2[index]) * step - step / 2) : 0;
  return distance;
}

/** The distance to the hull at a point, between the cubes' middles (0 outside the body). */
export function sampleDistance(grid: CableGrid, point: Vec3) {
  const [nx, ny, nz] = grid.n;
  const fx = (point[0] - grid.origin[0]) / grid.step - 0.5;
  const fy = (point[1] - grid.origin[1]) / grid.step - 0.5;
  const fz = (point[2] - grid.origin[2]) / grid.step - 0.5;
  const i = Math.floor(fx), j = Math.floor(fy), k = Math.floor(fz);
  if (i < 0 || j < 0 || k < 0 || i + 1 >= nx || j + 1 >= ny || k + 1 >= nz) return 0;
  const tx = fx - i, ty = fy - j, tz = fz - k;
  let value = 0;
  for (let di = 0; di < 2; di += 1) for (let dj = 0; dj < 2; dj += 1) for (let dk = 0; dk < 2; dk += 1) {
    const index = ((i + di) * ny + (j + dj)) * nz + (k + dk);
    if (!grid.inside[index]) return 0;
    value += grid.distance[index] * (di ? tx : 1 - tx) * (dj ? ty : 1 - ty) * (dk ? tz : 1 - tz);
  }
  return value;
}

/** Whether a point lies in an inside cube. */
function insideAt(grid: CableGrid, point: Vec3) {
  const index = cubeAt(grid, point);
  return index >= 0 && grid.inside[index] === 1;
}

/** The material across the channel at `point`: eight rays square to `tangent`, out to where the body ends, less the radius. */
function wallAcross(grid: CableGrid, point: Vec3, tangent: Vec3, radius: number) {
  const helper: Vec3 = Math.abs(tangent[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const a = unit(cross(tangent, helper)), b = cross(tangent, a);
  const step = grid.step * 0.5, reach = radius + 25;
  let wall = Infinity;
  for (let ray = 0; ray < 8; ray += 1) {
    const angle = (ray * Math.PI) / 4;
    const direction = add(mul(a, Math.cos(angle)), mul(b, Math.sin(angle)));
    let travelled = 0;
    while (travelled < reach && insideAt(grid, add(point, mul(direction, travelled + step)))) travelled += step;
    wall = Math.min(wall, travelled + step / 2 - radius);
  }
  return wall;
}

// ---- the walk --------------------------------------------------------------------------------------------------
/** How much a cube near the hull costs more: 1 + PULL / (clearance)^1.5, clearance in mm beyond the channel's radius. */
const PULL = 40;

/** The cheapest walk from cube `from` to cube `to` (A*), as cube indices, or null when there is none. */
function cheapestWalk(grid: CableGrid, from: number, to: number, radius: number, need: number): number[] | null {
  const [nx, ny, nz] = grid.n;
  const total = nx * ny * nz;
  const cost = new Float32Array(total);
  for (let index = 0; index < total; index += 1) {
    const d = grid.distance[index];
    cost[index] = grid.inside[index] && d >= need ? 1 + PULL / Math.pow(Math.max(d - radius, 0.5), 1.5) : Infinity;
  }
  if (!Number.isFinite(cost[from]) || !Number.isFinite(cost[to])) return null;
  const g = new Float64Array(total).fill(Infinity);
  const came = new Int32Array(total).fill(-1);
  const done = new Uint8Array(total);
  const ti = Math.floor(to / (ny * nz)), tj = Math.floor(to / nz) % ny, tk = to % nz;
  const heuristic = (index: number) => {
    const i = Math.floor(index / (ny * nz)), j = Math.floor(index / nz) % ny, k = index % nz;
    return Math.hypot(i - ti, j - tj, k - tk) * grid.step;
  };
  // A binary heap of (priority, cube).
  let heapKeys = new Float64Array(1024), heapIds = new Int32Array(1024), size = 0;
  const push = (key: number, id: number) => {
    if (size === heapKeys.length) {
      const keys = new Float64Array(size * 2); keys.set(heapKeys); heapKeys = keys;
      const ids = new Int32Array(size * 2); ids.set(heapIds); heapIds = ids;
    }
    let at = size++;
    while (at > 0) {
      const parent = (at - 1) >> 1;
      if (heapKeys[parent] <= key) break;
      heapKeys[at] = heapKeys[parent]; heapIds[at] = heapIds[parent]; at = parent;
    }
    heapKeys[at] = key; heapIds[at] = id;
  };
  const pop = () => {
    const id = heapIds[0];
    const key = heapKeys[--size], last = heapIds[size];
    let at = 0;
    for (;;) {
      let child = at * 2 + 1;
      if (child >= size) break;
      if (child + 1 < size && heapKeys[child + 1] < heapKeys[child]) child += 1;
      if (heapKeys[child] >= key) break;
      heapKeys[at] = heapKeys[child]; heapIds[at] = heapIds[child]; at = child;
    }
    heapKeys[at] = key; heapIds[at] = last;
    return id;
  };
  const steps: Array<[number, number]> = [];
  for (let di = -1; di <= 1; di += 1) for (let dj = -1; dj <= 1; dj += 1) for (let dk = -1; dk <= 1; dk += 1) {
    if (di || dj || dk) steps.push([(di * ny + dj) * nz + dk, Math.hypot(di, dj, dk) * grid.step]);
  }
  g[from] = 0;
  push(heuristic(from), from);
  while (size > 0) {
    const current = pop();
    if (done[current]) continue;
    if (current === to) break;
    done[current] = 1;
    const i = Math.floor(current / (ny * nz)), j = Math.floor(current / nz) % ny, k = current % nz;
    if (i === 0 || j === 0 || k === 0 || i === nx - 1 || j === ny - 1 || k === nz - 1) continue;
    for (const [offset, length] of steps) {
      const next = current + offset;
      if (done[next] || !Number.isFinite(cost[next])) continue;
      const tentative = g[current] + length * (cost[current] + cost[next]) / 2;
      if (tentative < g[next]) {
        g[next] = tentative;
        came[next] = current;
        push(tentative + heuristic(next), next);
      }
    }
  }
  if (came[to] < 0 && to !== from) return null;
  const walk = [to];
  while (walk[walk.length - 1] !== from) walk.push(came[walk[walk.length - 1]]);
  return walk.reverse();
}

const cubeCentre = (grid: CableGrid, index: number): Vec3 => {
  const [, ny, nz] = grid.n;
  const i = Math.floor(index / (ny * nz)), j = Math.floor(index / nz) % ny, k = index % nz;
  return [grid.origin[0] + (i + 0.5) * grid.step, grid.origin[1] + (j + 0.5) * grid.step, grid.origin[2] + (k + 0.5) * grid.step];
};
const cubeAt = (grid: CableGrid, point: Vec3) => {
  const [nx, ny, nz] = grid.n;
  const i = Math.floor((point[0] - grid.origin[0]) / grid.step);
  const j = Math.floor((point[1] - grid.origin[1]) / grid.step);
  const k = Math.floor((point[2] - grid.origin[2]) / grid.step);
  return i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz ? -1 : (i * ny + j) * nz + k;
};

// ---- from the walk to straight pieces and bends ------------------------------------------------------------------
function simplify(points: Vec3[], tolerance: number): Vec3[] {
  if (points.length < 3) return points.slice();
  const a = points[0], b = points[points.length - 1];
  const ab = sub(b, a), l = len(ab) || 1;
  let worst = 0, at = 0;
  for (let i = 1; i < points.length - 1; i += 1) {
    const d = len(cross(ab, sub(points[i], a))) / l;
    if (d > worst) { worst = d; at = i; }
  }
  if (worst <= tolerance) return [a, b];
  return [...simplify(points.slice(0, at + 1), tolerance).slice(0, -1), ...simplify(points.slice(at), tolerance)];
}

type Bend = { corner: number; radius: number; enter: Vec3; leave: Vec3; turn: number };

/**
 * Where the line from `a` through `b` and the line from `c` through `d` come closest, both points ahead of `b` and
 * `d` (the legs run on into the corner), or null when they do not meet ahead.
 */
function closestBetweenLines(a: Vec3, b: Vec3, c: Vec3, d: Vec3) {
  const u = unit(sub(b, a)), v = unit(sub(d, c));
  const w = sub(a, c);
  const uv = dot(u, v), denominator = 1 - uv * uv;
  if (denominator < 1e-9) return null;
  const s = (uv * dot(v, w) - dot(u, w)) / denominator;
  const t = (dot(v, w) - uv * dot(u, w)) / denominator;
  if (s < len(sub(b, a)) - 1e-6 || t < len(sub(d, c)) - 1e-6) return null;
  const onFirst = add(a, mul(u, s)), onSecond = add(c, mul(v, t));
  return { onFirst, onSecond, gap: len(sub(onFirst, onSecond)) };
}

function solveWithLead(grid: CableGrid, entry: CableEnd, exit: CableEnd, options: CableChannelOptions, lead: number, tolerance: number, spare: number, walks: Map<number, number[] | null>): CableChannelResult {
  const radius = options.diameter / 2;
  const need = radius + options.minWall;
  const inward = unit(mul(entry.normal, -1)), outward = unit(exit.normal);
  const s0 = add(entry.point, mul(inward, lead));
  const t0 = add(exit.point, mul(outward, -lead));
  const from = cubeAt(grid, s0), to = cubeAt(grid, t0);
  if (from < 0 || to < 0 || sampleDistance(grid, s0) < need || sampleDistance(grid, t0) < need) return { ok: false, error: "endTooThin" };
  // The walk depends only on the lead; the ways of straightening it are tried on the same walk.
  if (!walks.has(lead)) walks.set(lead, cheapestWalk(grid, from, to, radius, need));
  const walk = walks.get(lead)!;
  if (!walk) return { ok: false, error: "noWay" };
  const room = (a: Vec3, b: Vec3, margin: number) => {
    const n = Math.max(2, Math.ceil(len(sub(b, a)) / (grid.step * 0.5)));
    for (let q = 0; q <= n; q += 1) if (sampleDistance(grid, add(a, mul(sub(b, a), q / n))) - radius < options.minWall + margin) return false;
    return true;
  };
  // Straight pieces along the walk; corners a straight line passes with `spare` millimetres to spare go.
  const middle = simplify([s0, ...walk.slice(1, -1).map((index) => cubeCentre(grid, index)), t0], tolerance);
  const corners: Vec3[] = [entry.point, ...middle, exit.point];
  const turnAt = (i: number) => {
    const u = unit(sub(corners[i - 1], corners[i])), v = unit(sub(corners[i + 1], corners[i]));
    return Math.PI - Math.acos(Math.max(-1, Math.min(1, dot(u, v))));
  };
  for (let changed = true; changed;) {
    changed = false;
    for (let i = 2; i < corners.length - 2 && !changed; i += 1) {
      // A corner goes when a straight line passes it with a millimetre to spare, or when it hardly turns at all.
      if (room(corners[i - 1], corners[i + 1], spare) || (turnAt(i) < (4 * Math.PI) / 180 && room(corners[i - 1], corners[i + 1], 0))) {
        corners.splice(i, 1);
        changed = true;
      }
    }
    // Two corners too close together for their bends become one, where the legs before and after them meet, if the
    // legs to it still keep the wall. A corner at the end of a lead stays on the lead's line.
    for (let i = 1; i + 1 < corners.length - 1 && !changed; i += 1) {
      const gap = len(sub(corners[i + 1], corners[i]));
      const needed = options.minBend * (Math.tan(turnAt(i) / 2) + Math.tan(turnAt(i + 1) / 2));
      if (gap >= needed) continue;
      const meet = closestBetweenLines(corners[i - 1], corners[i], corners[i + 2], corners[i + 1]);
      if (!meet || meet.gap > Math.max(1, grid.step)) continue;
      const point = i === 1 ? meet.onFirst : i + 1 === corners.length - 2 ? meet.onSecond : mul(add(meet.onFirst, meet.onSecond), 0.5);
      if (!room(corners[i - 1], point, 0) || !room(point, corners[i + 2], 0)) continue;
      corners.splice(i, 2, point);
      changed = true;
    }
  }
  const bends: Bend[] = [];
  for (let i = 1; i < corners.length - 1; i += 1) {
    const u = unit(sub(corners[i - 1], corners[i])), v = unit(sub(corners[i + 1], corners[i]));
    const inner = Math.acos(Math.max(-1, Math.min(1, dot(u, v))));
    const turn = Math.PI - inner;
    if (turn < 1e-3) continue;
    // A straight lead at the surface may be used up whole, a piece between two bends half each.
    const before = len(sub(corners[i - 1], corners[i])) * (i === 1 ? 1 : 0.5);
    const after = len(sub(corners[i + 1], corners[i])) * (i === corners.length - 2 ? 1 : 0.5);
    const fits = Math.min(before, after) / Math.tan(turn / 2);
    const arc = (r: number) => {
      const t = r * Math.tan(turn / 2);
      const enter = add(corners[i], mul(u, t)), leave = add(corners[i], mul(v, t));
      return { enter, leave, centre: add(corners[i], mul(unit(add(u, v)), r / Math.sin(inner / 2))) };
    };
    const arcKeepsWall = (r: number) => {
      const { enter, leave, centre } = arc(r);
      const axis = unit(cross(sub(enter, centre), sub(leave, centre)));
      for (let q = 0; q <= 16; q += 1) if (sampleDistance(grid, add(centre, rotate(sub(enter, centre), axis, (turn * q) / 16))) - radius < options.minWall) return false;
      return true;
    };
    let chosen: number | null = null;
    for (let step = 0; step <= 40; step += 1) {
      const r = options.minBend * (3 - (2 * step) / 40);
      if (r <= fits + 1e-9 && arcKeepsWall(r)) { chosen = r; break; }
    }
    if (chosen === null) chosen = Math.max(minBentTubeBendRadius("round", options.diameter), Math.min(options.minBend, fits));
    const { enter, leave } = arc(chosen);
    bends.push({ corner: i, radius: chosen, enter, leave, turn });
  }
  // A bent tube has at most MAX_BENT_TUBE_SEGMENTS links: a straight run, then a bend; the last one ends straight.
  if (bends.length > MAX_BENT_TUBE_SEGMENTS - 1) return { ok: false, error: "tooWinding" };
  return buildChain(grid, entry, exit, options, corners, bends);
}

/** The bent tube's links from the straight pieces and bends, its frame in the world, and what the channel measures. */
function buildChain(grid: CableGrid, entry: CableEnd, exit: CableEnd, options: CableChannelOptions, corners: Vec3[], bends: Bend[]): CableChannelPath {
  // The tube starts a millimetre outside the entry and ends a millimetre outside the exit, so both openings are clean.
  const outside = 1;
  const start = add(entry.point, mul(unit(entry.normal), outside));
  const end = add(exit.point, mul(unit(exit.normal), outside));
  const directions: Vec3[] = [];
  for (let i = 0; i < corners.length - 1; i += 1) directions.push(unit(sub(corners[i + 1], corners[i])));
  const tangent0 = directions[0];
  // The tube's own -Z points where its first bend turns, so that bend needs no roll.
  const firstTurn = bends.length ? unit(sub(directions[bends[0].corner], mul(tangent0, dot(directions[bends[0].corner], tangent0)))) : null;
  const helper: Vec3 = Math.abs(tangent0[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const minusZ = firstTurn && len(firstTurn) > 0.5 ? firstTurn : unit(cross(tangent0, helper));
  const zAxis = mul(minusZ, -1);
  const yAxis = unit(cross(zAxis, tangent0));
  const segments: BentTubeSegment[] = [];
  let tangent = tangent0, bendDirection = minusZ, from = start;
  bends.forEach((bend) => {
    const next = directions[bend.corner];
    const wanted = unit(sub(next, mul(tangent, dot(next, tangent))));
    const roll = Math.atan2(dot(cross(bendDirection, wanted), tangent), dot(bendDirection, wanted));
    segments.push({
      length: Math.max(0, len(sub(bend.enter, from))),
      bendAngle: (bend.turn * 180) / Math.PI,
      bendRadius: bend.radius,
      roll: (roll * 180) / Math.PI,
    });
    const axis = unit(cross(tangent, wanted));
    bendDirection = unit(rotate(wanted, axis, bend.turn));
    tangent = next;
    from = bend.leave;
  });
  segments.push({ length: Math.max(0, len(sub(end, from))), bendAngle: 0, bendRadius: Math.max(options.minBend, minBentTubeBendRadius("round", options.diameter)), roll: 0 });
  // The centre line as the tube will run, for the preview and the measures.
  const stations = bentTubeStations(bentTubeSettings({ bentTubeProfile: "round", bentTubeInnerProfile: "none", bentTubeSize: options.diameter, bentTubeSegments: segments }), grid.step);
  const toWorld = (p: Vec3): Vec3 => add(start, add(add(mul(tangent0, p[0]), mul(yAxis, p[1])), mul(zAxis, p[2])));
  const centreLine = stations.map((station) => toWorld(station.point as Vec3));
  const radius = options.diameter / 2;
  let minWall = Infinity, length = 0;
  // The wall is what is left across the channel: rays out from its centre line, square to it, to the hull. Near the
  // openings the grid's cubes blur the surface, so the first and last bit are left to the lead's own check.
  const margin = outside + 1.5 * grid.step + 1;
  const total = stations[stations.length - 1].distance;
  stations.forEach((station, index) => {
    if (index > 0) length += len(sub(centreLine[index], centreLine[index - 1]));
    if (station.distance < margin || station.distance > total - margin) return;
    const tangent = unit(add(add(mul(tangent0, station.tangent[0]), mul(yAxis, station.tangent[1])), mul(zAxis, station.tangent[2])));
    minWall = Math.min(minWall, wallAcross(grid, centreLine[index], tangent, radius));
  });
  const minBend = bends.length ? Math.min(...bends.map((bend) => bend.radius)) : Infinity;
  return {
    ok: true,
    segments,
    centreLine,
    minBend,
    minWall: Number.isFinite(minWall) ? minWall : 0,
    length: Math.max(0, length - 2 * outside),
    // The smallest bend is a rule of thumb (about five times the diameter): a bend a few per cent tighter still takes the cable.
    tight: minBend < options.minBend * 0.95 - 1e-9,
    thin: minWall < options.minWall - Math.max(0.05, grid.step * 0.25),
    start,
    axes: { x: tangent0, y: yAxis, z: zAxis },
  };
}

/** Lengths of the straight piece at the surface to try, in mm; the best channel wins. */
const LEADS = [8, 10, 12, 15];
/** How much room, in mm beyond the wall, a straight line must leave to replace a corner of the walk. */
const SPARES = [1, 4, 8];

/**
 * The channel from `entry` to `exit` through the body whose triangles are given (world, nine numbers each). Several
 * lengths for the straight piece at the surface are tried: a small head has room only for a short one, a house for
 * a long one. The best keeps the wall, then has the gentlest tightest bend, then is the shortest.
 */
export function findCableChannel(triangles: ArrayLike<number> | CableGrid, entry: CableEnd, exit: CableEnd, options: Partial<CableChannelOptions>): CableChannelResult {
  const settings = normalizeCableOptions(options);
  const grid = "inside" in triangles ? triangles : cableGrid(triangles);
  if (!grid) return { ok: false, error: "noBody" };
  if (len(sub(entry.point, exit.point)) < settings.diameter * 2) return { ok: false, error: "endsTooClose" };
  let best: CableChannelPath | null = null;
  let failure: CableChannelError = "endTooThin";
  const walks = new Map<number, number[] | null>();
  // Pulling the string tight cuts corners close; in a narrow part (a chimney, a leg) that can leave no room for the
  // bend that follows. So the string is also pulled less tight, keeping more of the walk's own corners.
  for (const lead of LEADS) for (const spare of SPARES) {
    for (const tolerance of [1.5, 3]) {
      const result = solveWithLead(grid, { point: entry.point, normal: unit(entry.normal) }, { point: exit.point, normal: unit(exit.normal) }, settings, Math.max(lead, settings.diameter), tolerance, spare, walks);
      if (!result.ok) {
        if (failure !== "noWay" && failure !== "tooWinding") failure = result.error;
        continue;
      }
      const score = (path: CableChannelPath) => [path.thin ? 0 : 1, Math.min(path.minBend, settings.minBend), -path.length];
      if (!best) best = result;
      else {
        const a = score(result), b = score(best);
        if (a[0] > b[0] || (a[0] === b[0] && (a[1] > b[1] + 1e-6 || (Math.abs(a[1] - b[1]) <= 1e-6 && a[2] > b[2])))) best = result;
      }
      break;
    }
  }
  return best ?? { ok: false, error: failure };
}

/**
 * The bent tube that makes the channel: solid, a hole, its chain as found, placed so that its start lies just outside
 * the entry. A shape's mesh is centred on its box and turned about the box's middle (editorMeshCore), so the box's
 * middle goes where the tube's own middle lands once the start is put on the entry.
 */
export function cableChannelShapeFields(path: CableChannelPath, diameter: number): Partial<WorkplaneShape> {
  const fields = { bentTubeProfile: "round" as const, bentTubeInnerProfile: "none" as const, bentTubeSize: diameter, bentTubeQuality: 48, bentTubeSegments: path.segments };
  const natural = bentTubeNaturalDimensions(fields);
  const placement = bentTubeLocalPlacement({ ...fields, width: natural.width, depth: natural.depth, height: natural.height });
  const middle: Vec3 = [placement.centre[0], placement.centre[1] + natural.height / 2, placement.centre[2]];
  const { x, y, z } = path.axes;
  const turned = add(add(mul(x, middle[0]), mul(y, middle[1])), mul(z, middle[2]));
  const centre = add(path.start, turned);
  const basis = new THREE.Matrix4().makeBasis(new THREE.Vector3(...x), new THREE.Vector3(...y), new THREE.Vector3(...z));
  const rotation = rotationPatchFromQuaternion(new THREE.Quaternion().setFromRotationMatrix(basis));
  return {
    kind: "bentTube",
    ...fields,
    hole: true,
    x: centre[0],
    z: centre[2],
    elevation: centre[1] - natural.height / 2,
    width: natural.width,
    depth: natural.depth,
    height: natural.height,
    size: natural.size,
    ...rotation,
  };
}

/**
 * The point on the body's surface nearest to `point`, with the outward normal of the triangle it lies on: an entry or
 * exit given by coordinates (MCP) instead of a click. The triangles are wound outward, as every mesh of Layerling's.
 */
export function cableEndNear(triangles: ArrayLike<number>, point: Vec3): CableEnd | null {
  let best: { distance: number; point: Vec3; normal: Vec3 } | null = null;
  for (let t = 0; t + 8 < triangles.length; t += 9) {
    const a: Vec3 = [triangles[t], triangles[t + 1], triangles[t + 2]];
    const b: Vec3 = [triangles[t + 3], triangles[t + 4], triangles[t + 5]];
    const c: Vec3 = [triangles[t + 6], triangles[t + 7], triangles[t + 8]];
    const normal = unit(cross(sub(b, a), sub(c, a)));
    if (len(normal) < 0.5) continue;
    const onTriangle = closestPointOnTriangle(point, a, b, c);
    const distance = len(sub(point, onTriangle));
    if (!best || distance < best.distance - 1e-9) best = { distance, point: onTriangle, normal };
  }
  return best ? { point: best.point, normal: best.normal } : null;
}

/** The point of triangle abc nearest to p (Ericson, Real-Time Collision Detection, 5.1.5). */
function closestPointOnTriangle(p: Vec3, a: Vec3, b: Vec3, c: Vec3): Vec3 {
  const ab = sub(b, a), ac = sub(c, a), ap = sub(p, a);
  const d1 = dot(ab, ap), d2 = dot(ac, ap);
  if (d1 <= 0 && d2 <= 0) return a;
  const bp = sub(p, b), d3 = dot(ab, bp), d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) return b;
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) return add(a, mul(ab, d1 / (d1 - d3)));
  const cp = sub(p, c), d5 = dot(ab, cp), d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) return c;
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) return add(a, mul(ac, d2 / (d2 - d6)));
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) return add(b, mul(sub(c, b), (d4 - d3) / ((d4 - d3) + (d5 - d6))));
  const denominator = 1 / (va + vb + vc);
  return add(a, add(mul(ab, vb * denominator), mul(ac, vc * denominator)));
}
