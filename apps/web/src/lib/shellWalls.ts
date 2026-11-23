import type { ManifoldToplevel } from "manifold-3d";
import { loadedManifoldRuntime, requestManifoldRuntime } from "@/lib/manifoldHandle";
import { MAX_SHELL_DIVIDER_WALLS, MAX_SHELL_POCKET_POINTS, type ShellDividerWall, type ShellScoop } from "@/lib/shellGridLimits";

/*
 * The plan of a hollowed box seen from above, for the Hollow tool's panel and its grips on the body: the dividers set by
 * hand as walls, the compartments they leave open, and the finger scoops and shaped pockets that go with them.
 *
 * Everything is measured in the box's own inside: a room `width` by `depth`, in mm from its left (x) and its back (z).
 * The kernel builds the real walls on the body (cadShellGrid); what is worked out here is only what the panel draws and
 * what its buttons change, so it needs no CAD kernel. Walls that run straight are sorted into compartments at once; a
 * wall at a slant is cut out by the 2D kernel (Manifold's CrossSection), and until that has loaded the compartments are
 * shown as the straight walls leave them.
 */

type Point = { x: number; z: number };

/** The least width a compartment may have; a narrower room is not offered as one. */
const MIN_COMPARTMENT_SPAN = 2;
/** The shortest a divider set by hand may be, in mm; a shorter one is left out. */
const MIN_WALL_LENGTH = 1;

export type ShellCompartment = {
  /** The compartment's outline, in mm from the left and the back of the inside. */
  outline: Point[];
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  /** A point well inside it, for a label. */
  label: Point;
};

/** The inside of a hollowed box seen from above: its size, its outline and the compartments its dividers leave open. */
export type ShellWallRoom = { width: number; depth: number; outline: Point[]; compartments: ShellCompartment[] };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function signedArea(points: Point[]) {
  let sum = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a.x * b.z - b.x * a.z;
  }
  return sum / 2;
}

/** The outline counter-clockwise in the x, z plane, whichever way it was given. */
function counterClockwise(points: Point[]) {
  return signedArea(points) < 0 ? [...points].reverse() : points;
}

/** Keeps the part of a convex outline on the left of the line a to b (the inside of a counter-clockwise outline). */
function clipHalfPlane(points: Point[], a: Point, b: Point): Point[] {
  const side = (p: Point) => (b.x - a.x) * (p.z - a.z) - (b.z - a.z) * (p.x - a.x);
  const out: Point[] = [];
  for (let i = 0; i < points.length; i += 1) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    const sc = side(current);
    const sn = side(next);
    if (sc >= 0) out.push(current);
    if ((sc > 0 && sn < 0) || (sc < 0 && sn > 0)) {
      const t = sc / (sc - sn);
      out.push({ x: current.x + (next.x - current.x) * t, z: current.z + (next.z - current.z) * t });
    }
  }
  return out;
}

function dropDuplicates(points: Point[]) {
  const kept = points.filter((point, index) => {
    const next = points[(index + 1) % points.length];
    return Math.hypot(next.x - point.x, next.z - point.z) > 1e-6;
  });
  return kept.length >= 3 ? kept : points;
}

function bounds(points: Point[]) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minZ = Math.min(minZ, point.z);
    maxZ = Math.max(maxZ, point.z);
  }
  return { minX, maxX, minZ, maxZ };
}

function boundsOf(points: Point[]) {
  const b = bounds(points);
  return { width: b.maxX - b.minX, depth: b.maxZ - b.minZ };
}

function clipRectangle(points: Point[], minX: number, maxX: number, minZ: number, maxZ: number): Point[] {
  let result = points;
  const edges: Array<[Point, Point]> = [
    [{ x: minX, z: minZ }, { x: maxX, z: minZ }],
    [{ x: maxX, z: minZ }, { x: maxX, z: maxZ }],
    [{ x: maxX, z: maxZ }, { x: minX, z: maxZ }],
    [{ x: minX, z: maxZ }, { x: minX, z: minZ }],
  ];
  for (const [a, b] of edges) {
    result = clipHalfPlane(result, a, b);
    if (result.length < 3) return [];
  }
  return result;
}

/** A sorted list of coordinates without (near) repeats, held inside a range. */
type Strip = { minX: number; maxX: number; minZ: number; maxZ: number };

function gridLines(values: number[], min: number, max: number) {
  const sorted = [min, max, ...values.filter((value) => value > min && value < max)].sort((a, b) => a - b);
  return sorted.filter((value, index) => index === 0 || value - sorted[index - 1] > 1e-6);
}

/**
 * What is left open of a convex outline when axis-parallel strips (the dividers set by hand) are taken out of it: each
 * connected room as its outline (counter-clockwise) with the strips that stand free inside it as holes (given
 * counter-clockwise too). `solid` counts the rooms narrower than a compartment may be, which are left out and so stay solid.
 *
 * The strips' sides cut the outline's bounding box into a grid of cells that are each wholly open or wholly wall. Every
 * open cell is the outline clipped to the cell; its sides that lie on the outline or against a wall cell are the border of
 * the open room, those against another open cell are not. The border pieces are then joined end to end into loops. Where
 * two rooms meet in a single point the walk turns as far left as it can, so they stay two rooms.
 */
function openRegions(inner: Point[], strips: Strip[]): { regions: { outline: Point[]; holes: Point[][] }[]; solid: number } {
  const box = bounds(inner);
  const xs = gridLines(strips.flatMap((strip) => [strip.minX, strip.maxX]), box.minX, box.maxX);
  const zs = gridLines(strips.flatMap((strip) => [strip.minZ, strip.maxZ]), box.minZ, box.maxZ);
  const columns = xs.length - 1;
  const rows = zs.length - 1;
  const open = (column: number, row: number) => {
    if (column < 0 || row < 0 || column >= columns || row >= rows) return false;
    const x = (xs[column] + xs[column + 1]) / 2;
    const z = (zs[row] + zs[row + 1]) / 2;
    return !strips.some((strip) => x > strip.minX && x < strip.maxX && z > strip.minZ && z < strip.maxZ);
  };
  // One point for every place, however it was reached: neighbouring cells work the same crossing out a hair apart.
  const places = new Map<string, Point>();
  const keyOf = (point: Point) => `${Math.round(point.x * 1e6)},${Math.round(point.z * 1e6)}`;
  type Edge = { from: string; to: string; used: boolean };
  const leaving = new Map<string, Edge[]>();
  const edges: Edge[] = [];
  for (let column = 0; column < columns; column += 1) {
    for (let row = 0; row < rows; row += 1) {
      if (!open(column, row)) continue;
      const x0 = xs[column];
      const x1 = xs[column + 1];
      const z0 = zs[row];
      const z1 = zs[row + 1];
      const snap = (value: number, a: number, b: number) => (Math.abs(value - a) < 1e-7 ? a : Math.abs(value - b) < 1e-7 ? b : value);
      const cell = dropDuplicates(clipRectangle(inner, x0, x1, z0, z1).map((point) => ({ x: snap(point.x, x0, x1), z: snap(point.z, z0, z1) })));
      if (cell.length < 3 || signedArea(cell) < 1e-9) continue;
      for (let i = 0; i < cell.length; i += 1) {
        const a = cell[i];
        const b = cell[(i + 1) % cell.length];
        // A side on a grid line is shared with the cell beyond it; open on both sides, it is no border.
        const beyond = a.x === x0 && b.x === x0 ? open(column - 1, row)
          : a.x === x1 && b.x === x1 ? open(column + 1, row)
            : a.z === z0 && b.z === z0 ? open(column, row - 1)
              : a.z === z1 && b.z === z1 ? open(column, row + 1)
                : false;
        if (beyond) continue;
        const from = keyOf(a);
        const to = keyOf(b);
        if (from === to) continue;
        if (!places.has(from)) places.set(from, a);
        if (!places.has(to)) places.set(to, b);
        const edge = { from, to, used: false };
        edges.push(edge);
        leaving.set(from, [...(leaving.get(from) ?? []), edge]);
      }
    }
  }
  const loops: Point[][] = [];
  for (const start of edges) {
    if (start.used) continue;
    const loop: Point[] = [];
    let edge = start;
    let closed = false;
    for (let guard = 0; guard <= edges.length; guard += 1) {
      edge.used = true;
      loop.push(places.get(edge.from)!);
      const a = places.get(edge.from)!;
      const b = places.get(edge.to)!;
      const choices = (leaving.get(edge.to) ?? []).filter((next) => next === start || !next.used);
      if (choices.length === 0) break;
      // The turn furthest to the left; the open room lies on the left of every border piece.
      let best = choices[0];
      let bestTurn = -Infinity;
      for (const next of choices) {
        const c = places.get(next.to)!;
        const turn = Math.atan2((b.x - a.x) * (c.z - b.z) - (b.z - a.z) * (c.x - b.x), (b.x - a.x) * (c.x - b.x) + (b.z - a.z) * (c.z - b.z));
        if (turn > bestTurn) {
          bestTurn = turn;
          best = next;
        }
      }
      if (best === start) {
        closed = true;
        break;
      }
      edge = best;
    }
    if (!closed) continue;
    // Points in the middle of a straight run (where the grid cut it) are dropped.
    const corners = loop.filter((point, index) => {
      const before = loop[(index + loop.length - 1) % loop.length];
      const after = loop[(index + 1) % loop.length];
      const cross = (point.x - before.x) * (after.z - point.z) - (point.z - before.z) * (after.x - point.x);
      return Math.abs(cross) > 1e-9 * (1 + Math.hypot(point.x - before.x, point.z - before.z) * Math.hypot(after.x - point.x, after.z - point.z));
    });
    if (corners.length >= 3 && Math.abs(signedArea(corners)) > 1e-6) loops.push(corners);
  }
  return regionsOfLoops(loops);
}

/** Loops sorted into rooms: each counter-clockwise loop an outline, each clockwise one a wall standing free in the room around it (given back counter-clockwise). Rooms narrower than a compartment may be are left out and counted. */
function regionsOfLoops(loops: Point[][]): { regions: { outline: Point[]; holes: Point[][] }[]; solid: number } {
  const outlines = loops.filter((loop) => signedArea(loop) > 0);
  const inside = (point: Point, outline: Point[]) => {
    let hit = false;
    for (let i = 0, j = outline.length - 1; i < outline.length; j = i, i += 1) {
      const a = outline[i];
      const b = outline[j];
      if ((a.z > point.z) !== (b.z > point.z) && point.x < ((b.x - a.x) * (point.z - a.z)) / (b.z - a.z) + a.x) hit = !hit;
    }
    return hit;
  };
  const regions = outlines.map((outline) => ({ outline, holes: [] as Point[][] }));
  for (const hole of loops.filter((loop) => signedArea(loop) < 0)) {
    // A point just beside the hole's first side, in the open room around it, tells which room that is.
    const a = hole[0];
    const b = hole[1];
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    const probe = { x: (a.x + b.x) / 2 - ((b.z - a.z) / length) * 1e-4, z: (a.z + b.z) / 2 + ((b.x - a.x) / length) * 1e-4 };
    const home = regions.find((region) => inside(probe, region.outline));
    if (home) home.holes.push([...hole].reverse());
  }
  const kept = regions.filter((region) => {
    const span = boundsOf(region.outline);
    return Math.min(span.width, span.depth) >= MIN_COMPARTMENT_SPAN;
  });
  return { regions: kept, solid: regions.length - kept.length };
}

/**
 * As openRegions, for walls at any angle: the inside less every wall's outline, worked out by the 2D kernel. Slivers
 * smaller than a hundredth of a square millimetre, which a slanted wall can leave where it meets another, are dropped.
 */
function kernelRegions(runtime: ManifoldToplevel, inner: Point[], walls: Point[][]) {
  const made: { delete(): void }[] = [];
  const keep = <T extends { delete(): void }>(value: T) => {
    made.push(value);
    return value;
  };
  try {
    const ring = (points: Point[]) => counterClockwise(points).map((point): [number, number] => [point.x, point.z]);
    const room = keep(new runtime.CrossSection([ring(inner)], "Positive"));
    const taken = keep(runtime.CrossSection.union(walls.map((wall) => keep(new runtime.CrossSection([ring(wall)], "Positive")))));
    const open = keep(room.subtract(taken));
    const loops = open.toPolygons().map((polygon) => dropDuplicates(polygon.map(([x, z]) => ({ x, z })))).filter((loop) => loop.length >= 3 && Math.abs(signedArea(loop)) > 0.01);
    return regionsOfLoops(loops);
  } finally {
    made.forEach((value) => value.delete());
  }
}

function pointInOutline(point: Point, outline: readonly Point[]) {
  let hit = false;
  for (let i = 0, j = outline.length - 1; i < outline.length; j = i, i += 1) {
    const a = outline[i];
    const b = outline[j];
    if ((a.z > point.z) !== (b.z > point.z) && point.x < ((b.x - a.x) * (point.z - a.z)) / (b.z - a.z) + a.x) hit = !hit;
  }
  return hit;
}

/** The scoop of a compartment: the last one in the list whose point lies in it, or none. */
export function shellScoopOf(compartment: { outline: readonly Point[] }, scoops: readonly ShellScoop[]): ShellScoop | null {
  for (let index = scoops.length - 1; index >= 0; index -= 1) if (pointInOutline(scoops[index], compartment.outline)) return scoops[index];
  return null;
}

/**
 * The scoops with one compartment's set to a side, or taken away (null): every scoop whose point lies in the compartment
 * goes, and the new one is put at the compartment's label point, well inside it.
 */
export function shellScoopsWith(scoops: readonly ShellScoop[], compartment: { outline: readonly Point[]; label: Point }, side: ShellScoop["side"] | null): ShellScoop[] {
  const rest = scoops.filter((scoop) => !pointInOutline(scoop, compartment.outline));
  const round = (value: number) => Math.round(value * 100) / 100;
  return side ? [...rest, { x: round(compartment.label.x), z: round(compartment.label.z), side }] : rest;
}

/** The two ends of a wall's middle line, in mm from the left and the back of the inside: its beginning and its end. */
export function shellWallEnds(wall: ShellDividerWall): [Point, Point] {
  const far = wall.at + (wall.slant ?? 0);
  return wall.dir === "x" ? [{ x: wall.from, z: wall.at }, { x: wall.to, z: far }] : [{ x: wall.at, z: wall.from }, { x: far, z: wall.to }];
}

export function shellWallLength(wall: ShellDividerWall) {
  return Math.hypot(wall.to - wall.from, wall.slant ?? 0);
}

/**
 * The wall whose middle line runs between two points: along the width when it reaches further that way than along the
 * depth, else along the depth, beginning at the end that lies further left (or further back).
 */
export function shellWallFromEnds(a: Point, b: Point): ShellDividerWall {
  const round = (value: number) => Math.round(Math.max(0, value) * 1000) / 1000;
  const dir: ShellDividerWall["dir"] = Math.abs(b.x - a.x) >= Math.abs(b.z - a.z) ? "x" : "z";
  const along = (point: Point) => (dir === "x" ? point.x : point.z);
  const across = (point: Point) => (dir === "x" ? point.z : point.x);
  const [start, end] = along(a) <= along(b) ? [a, b] : [b, a];
  const at = round(across(start));
  const slant = Math.round((round(across(end)) - at) * 1000) / 1000;
  return { dir, at, from: round(along(start)), to: round(along(end)), ...(slant !== 0 ? { slant } : {}) };
}

/**
 * The outline of a wall seen from above, `thickness` wide square to its middle line, in mm from the left and the back of
 * the inside. With `room` given, a straight wall is held inside it, and an end that lies on a side of the room or beyond
 * is drawn out past it, so that a slanted wall closes against the box's wall instead of touching it with one corner.
 */
export function shellWallQuad(wall: ShellDividerWall, thickness: number, room?: { width: number; depth: number }): Point[] {
  let [a, b] = shellWallEnds(wall);
  const length = Math.hypot(b.x - a.x, b.z - a.z) || 1;
  const ux = (b.x - a.x) / length;
  const uz = (b.z - a.z) / length;
  if (room) {
    const outside = (point: Point) => point.x <= 1e-6 || point.z <= 1e-6 || point.x >= room.width - 1e-6 || point.z >= room.depth - 1e-6;
    const reach = 2 * thickness + 1;
    if (outside(a)) a = { x: a.x - ux * reach, z: a.z - uz * reach };
    if (outside(b)) b = { x: b.x + ux * reach, z: b.z + uz * reach };
  }
  const nx = (-uz * thickness) / 2;
  const nz = (ux * thickness) / 2;
  return [{ x: a.x - nx, z: a.z - nz }, { x: b.x - nx, z: b.z - nz }, { x: b.x + nx, z: b.z + nz }, { x: a.x + nx, z: a.z + nz }];
}

/**
 * The walls with a mirror image of each added: mirrored left to right ("x") or back to front ("z") about the middle of
 * the room. A wall that already has its mirror image (or is its own) gets none, and no more are added than a box takes.
 */
export function shellMirroredWalls(walls: readonly ShellDividerWall[], room: { width: number; depth: number }, axis: "x" | "z"): ShellDividerWall[] {
  const flip = (point: Point): Point => (axis === "x" ? { x: room.width - point.x, z: point.z } : { x: point.x, z: room.depth - point.z });
  const same = (a: ShellDividerWall, b: ShellDividerWall) => a.dir === b.dir && [a.at - b.at, a.from - b.from, a.to - b.to, (a.slant ?? 0) - (b.slant ?? 0)].every((off) => Math.abs(off) < 0.01);
  // Held to the room first, so that a wall running to "the end" mirrors onto the other end and not past it.
  const held = (wall: ShellDividerWall): ShellDividerWall => {
    const run = wall.dir === "x" ? room.width : room.depth;
    return wall.slant ? wall : { ...wall, from: clamp(wall.from, 0, run), to: clamp(wall.to, 0, run) };
  };
  const result = [...walls];
  for (const wall of walls) {
    if (result.length >= MAX_SHELL_DIVIDER_WALLS) break;
    const [a, b] = shellWallEnds(held(wall));
    const mirrored = shellWallFromEnds(flip(a), flip(b));
    if (!result.some((other) => same(held(other), mirrored))) result.push(mirrored);
  }
  return result;
}

/**
 * The outlines of shaped pockets for a part: its outlines seen from above (in mm from the left and the back of the
 * inside of the box) joined, grown by the play all round with rounded corners, and thinned out to a number of points a
 * box stores. Holes in the part are left out, the pocket being cut from above. Only what lies at least partly in a room
 * `width` by `depth` is kept; an empty list when nothing does.
 */
export function shellPocketOutlines(runtime: ManifoldToplevel, loops: ReadonlyArray<ReadonlyArray<Point>>, clearance: number, room: { width: number; depth: number }): Point[][] {
  const made: { delete(): void }[] = [];
  const keep = <T extends { delete(): void }>(value: T) => {
    made.push(value);
    return value;
  };
  try {
    const joined = keep(new runtime.CrossSection(loops.filter((loop) => loop.length >= 3).map((loop) => loop.map((point): [number, number] => [point.x, point.z])), "NonZero"));
    const grown = clearance > 0 ? keep(joined.offset(clearance, "Round", 2, 32)) : joined;
    const outlines: Point[][] = [];
    for (const polygon of grown.toPolygons()) {
      let points = polygon.map(([x, z]) => ({ x, z }));
      if (signedArea(points) <= 1) continue;
      // Thinned out until it fits: first to a twentieth of a millimetre, then coarser for an outline with very many points.
      for (let tolerance = 0.05; ; tolerance *= 2) {
        const thinned = keep(keep(new runtime.CrossSection([points.map((point): [number, number] => [point.x, point.z])], "Positive")).simplify(tolerance)).toPolygons();
        const largest = thinned.sort((a, b) => b.length - a.length)[0];
        if (largest) points = largest.map(([x, z]) => ({ x, z }));
        if (points.length <= MAX_SHELL_POCKET_POINTS || tolerance > 5) break;
      }
      const box = bounds(points);
      if (box.maxX <= 0 || box.maxZ <= 0 || box.minX >= room.width || box.minZ >= room.depth) continue;
      const round = (value: number) => Math.round(value * 100) / 100;
      outlines.push(points.slice(0, MAX_SHELL_POCKET_POINTS).map((point) => ({ x: round(point.x), z: round(point.z) })));
    }
    return outlines;
  } catch {
    return [];
  } finally {
    made.forEach((value) => value.delete());
  }
}

/**
 * The dividers set by hand that lie inside a box whose inside is `width` by `depth` at its widest and deepest: each one
 * held inside it, and those left shorter than a wall may be, dropped. The stored list is not changed by this, so a wall
 * that a smaller box cuts short is whole again when the box grows.
 */
export function shellWallsInside(walls: readonly ShellDividerWall[], width: number, depth: number): ShellDividerWall[] {
  return walls.flatMap((wall) => {
    const run = wall.dir === "x" ? width : depth;
    const across = wall.dir === "x" ? depth : width;
    // A slanted wall is not cut straight at the sides: that would turn it. What lies outside is cut off when the box is built.
    if (wall.slant) return shellWallLength(wall) < MIN_WALL_LENGTH ? [] : [wall];
    const from = clamp(wall.from, 0, run);
    const to = clamp(wall.to, 0, run);
    if (to - from < MIN_WALL_LENGTH || wall.at < 0 || wall.at > across) return [];
    return [{ dir: wall.dir, at: wall.at, from, to }];
  });
}

/** A point inside an outline: the middle of its widest stretch on the line through the middle of its depth. */
function pointInside(outline: Point[]): Point {
  const box = bounds(outline);
  const z = (box.minZ + box.maxZ) / 2 + 1e-4;
  const crossings: number[] = [];
  outline.forEach((a, index) => {
    const b = outline[(index + 1) % outline.length];
    if ((a.z > z) !== (b.z > z)) crossings.push(a.x + ((b.x - a.x) * (z - a.z)) / (b.z - a.z));
  });
  crossings.sort((p, q) => p - q);
  let best = { x: (box.minX + box.maxX) / 2, width: -1 };
  for (let i = 0; i + 1 < crossings.length; i += 2) {
    const width = crossings[i + 1] - crossings[i];
    if (width > best.width) best = { x: (crossings[i] + crossings[i + 1]) / 2, width };
  }
  return { x: best.x, z };
}

/**
 * A wall that splits a compartment in two through its middle: across (running along the width, "x") or along (running
 * along the depth, "z"), from one side of the compartment to the other. Where the compartment ends on another divider
 * the wall reaches to that one's middle, so the two stay joined when the thickness is changed.
 */
export function shellSplitWall(compartment: Pick<ShellCompartment, "minX" | "maxX" | "minZ" | "maxZ">, dir: ShellDividerWall["dir"], room: { width: number; depth: number }, divider: number): ShellDividerWall {
  const round = (value: number) => Math.round(value * 100) / 100;
  const reach = (value: number, limit: number, sign: number) => (value <= 1e-6 || value >= limit - 1e-6 ? clamp(value, 0, limit) : value + (sign * divider) / 2);
  return dir === "x"
    ? { dir, at: round((compartment.minZ + compartment.maxZ) / 2), from: round(reach(compartment.minX, room.width, -1)), to: round(reach(compartment.maxX, room.width, 1)) }
    : { dir, at: round((compartment.minX + compartment.maxX) / 2), from: round(reach(compartment.minZ, room.depth, -1)), to: round(reach(compartment.maxZ, room.depth, 1)) };
}

/**
 * The room the dividers set by hand are measured in: the inside of the box, `width` by `depth` mm, and the compartments
 * that walls of this `thickness` leave open in it. Null when the inside is too small to hold a compartment.
 */
export function shellWallRoom(width: number, depth: number, walls: readonly ShellDividerWall[], thickness: number): ShellWallRoom | null {
  if (!(width >= MIN_COMPARTMENT_SPAN) || !(depth >= MIN_COMPARTMENT_SPAN)) return null;
  const outline: Point[] = [{ x: 0, z: 0 }, { x: width, z: 0 }, { x: width, z: depth }, { x: 0, z: depth }];
  const half = thickness / 2;
  const straight = shellWallsInside(walls.filter((wall) => !wall.slant), width, depth);
  const slanted = walls.filter((wall) => wall.slant && shellWallLength(wall) >= MIN_WALL_LENGTH);
  // Slanted walls are cut out by the 2D kernel; until it has loaded the room is shown with its straight walls and asks for it.
  const runtime = slanted.length > 0 ? loadedManifoldRuntime() : null;
  if (slanted.length > 0 && !runtime) requestManifoldRuntime();
  const { regions } = runtime
    ? kernelRegions(runtime, outline, [...straight, ...slanted].map((wall) => shellWallQuad(wall, thickness, { width, depth })))
    : openRegions(outline, straight.map((wall) => wall.dir === "x"
      ? { minX: wall.from, maxX: wall.to, minZ: wall.at - half, maxZ: wall.at + half }
      : { minX: wall.at - half, maxX: wall.at + half, minZ: wall.from, maxZ: wall.to }));
  const compartments = regions.map((region) => ({ outline: region.outline, ...bounds(region.outline), label: pointInside(region.outline) }));
  return { width, depth, outline, compartments };
}
