/**
 * Stencil bridges for a cut outline (a laser's DXF, a plotter's SVG): a part inside a hole - the middle of an
 * "o", the belly of a "b" - falls out once it is cut round. Small straight bridges hold it to the material
 * round it, as on a stencil.
 *
 * The outline is a set of closed loops, as a section's polygons come: the plate, its holes, the parts inside
 * the holes, their holes, and so on. A loop inside an even number of others is material's edge; inside an
 * odd number, a hole's. A part inside a hole is a loop of material's edge with a hole round it.
 *
 * Every such part gets `count` bridges, spread evenly round it and turned so that together they are as short
 * as they can be. Each bridge is a rectangle `width` wide from the part's outermost point in its direction
 * straight across the gap to the next material - the hole's edge, or another part inside the same hole - and
 * a little way into both. A bridge may not touch any other outline: it would fill a hole it has no business
 * in, or leave a sliver beside it. Where the parts of a hole only hold each other, one more bridge ties them
 * to the hole's edge, so nothing falls out; a part no bridge can reach is counted, not left out silently.
 */

export type StencilBridgeOptions = {
  /** The bridge's width in mm. */
  width: number;
  /** Bridges per part, 1 to 4. */
  count: number;
};

export const DEFAULT_STENCIL_BRIDGES: StencilBridgeOptions = { width: 1, count: 2 };
export const MIN_BRIDGE_WIDTH = 0.2;
export const MAX_BRIDGE_WIDTH = 10;
export const MAX_BRIDGE_COUNT = 4;

type P = readonly [number, number];
type Loop = readonly P[];
type Rect = Array<[number, number]>;

/**
 * How far a bridge reaches into the part it holds and into the material it holds it to, in mm: 0.3 where there is
 * room, less beside a thin web, so the bridge does not open the hole behind it.
 */
const BRIDGE_OVERLAPS = [0.3, 0.1, 0.05];
/** A gap narrower than this beside a bridge is too narrow to cut, in mm (a laser's kerf is 0.1 to 0.2 mm). */
const SLIVER_PROBES = [0.05, 0.15, 0.25];
/** Near its ends a bridge meets the edges at an angle; the narrow corner there is no sliver. In mm. */
const BRIDGE_SLIVER_ENDS = 0.35;
/** Directions tried round a part, in degrees apart. */
const ANGLE_STEP = 7.5;
/** At most this many more directions, square to the part's longest sides. */
const MAX_SIDE_TURNS = 32;
/** The bridge's width is checked by rays this far apart at most, in mm, so no notch of an edge is spanned unseen. */
const RAY_SPACING = 0.1;

export function normalizedStencilBridges(raw: Partial<StencilBridgeOptions> | null | undefined): StencilBridgeOptions {
  const width = typeof raw?.width === "number" && Number.isFinite(raw.width) ? raw.width : DEFAULT_STENCIL_BRIDGES.width;
  const count = typeof raw?.count === "number" && Number.isFinite(raw.count) ? Math.round(raw.count) : DEFAULT_STENCIL_BRIDGES.count;
  return {
    width: Math.min(MAX_BRIDGE_WIDTH, Math.max(MIN_BRIDGE_WIDTH, width)),
    count: Math.min(MAX_BRIDGE_COUNT, Math.max(1, count)),
  };
}

function area(loop: Loop) {
  let sum = 0;
  for (let i = 0; i < loop.length; i += 1) {
    const [ax, ay] = loop[i];
    const [bx, by] = loop[(i + 1) % loop.length];
    sum += ax * by - bx * ay;
  }
  return sum / 2;
}

type Box = { minX: number; minY: number; maxX: number; maxY: number };

function boxOf(points: readonly P[]): Box {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

const boxesMeet = (a: Box, b: Box, margin = 0) => a.minX <= b.maxX + margin && b.minX <= a.maxX + margin && a.minY <= b.maxY + margin && b.minY <= a.maxY + margin;

function inside(point: P, loop: Loop) {
  let result = false;
  for (let i = 0, j = loop.length - 1; i < loop.length; j = i, i += 1) {
    const [xi, yi] = loop[i];
    const [xj, yj] = loop[j];
    if ((yi > point[1]) !== (yj > point[1]) && point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi) result = !result;
  }
  return result;
}

/** Whether `loop` lies in `other`: loops of a section do not cross, but they can touch at a corner, so most of a few of its points decide. */
function liesIn(loop: Loop, other: Loop) {
  const samples: P[] = [];
  const step = Math.max(1, Math.floor(loop.length / 7));
  for (let i = 0; i < loop.length && samples.length < 7; i += step) {
    const a = loop[i];
    const b = loop[(i + 1) % loop.length];
    samples.push([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
  }
  return samples.filter((point) => inside(point, other)).length * 2 > samples.length;
}

/** Where the ray from `origin` in direction `d` first meets one of the loops' edges: the distance and the loop; Infinity if it does not. */
function rayHit(origin: P, d: P, loops: readonly number[], all: readonly Loop[]) {
  let best = Infinity;
  let hit = -1;
  for (const index of loops) {
    const loop = all[index];
    for (let i = 0; i < loop.length; i += 1) {
      const a = loop[i];
      const b = loop[(i + 1) % loop.length];
      const ex = b[0] - a[0];
      const ey = b[1] - a[1];
      const denom = d[0] * ey - d[1] * ex;
      if (Math.abs(denom) < 1e-12) continue;
      const wx = a[0] - origin[0];
      const wy = a[1] - origin[1];
      const t = (wx * ey - wy * ex) / denom;
      const u = (wx * d[1] - wy * d[0]) / denom;
      if (t > 1e-9 && u >= -1e-9 && u <= 1 + 1e-9 && t < best) {
        best = t;
        hit = index;
      }
    }
  }
  return { distance: best, loop: hit };
}

function segmentsCross(a: P, b: P, c: P, d: P) {
  const orient = (p: P, q: P, r: P) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const d1 = orient(c, d, a);
  const d2 = orient(c, d, b);
  const d3 = orient(a, b, c);
  const d4 = orient(a, b, d);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

type Outline = {
  loops: Loop[];
  boxes: Box[];
  depth: number[];
  parent: number[];
};

function outlineOf(loops: readonly Loop[]): Outline {
  const usable = loops.filter((loop) => loop.length >= 3 && Math.abs(area(loop)) > 1e-9);
  const areas = usable.map((loop) => Math.abs(area(loop)));
  const boxes = usable.map(boxOf);
  // For each loop, the loops it lies in, and so its depth: even is material's edge, odd a hole's.
  const containers = usable.map((loop, index) => usable.map((other, j) => (j !== index && areas[j] > areas[index] && boxesMeet(boxes[j], boxes[index]) && liesIn(loop, other) ? j : -1)).filter((j) => j >= 0));
  const depth = containers.map((list) => list.length);
  // The loop a loop sits directly in: of those round it, the smallest.
  const parent = containers.map((list) => (list.length ? list.reduce((best, j) => (areas[j] < areas[best] ? j : best)) : -1));
  return { loops: usable, boxes, depth, parent };
}

/** Whether a point is in material: inside an odd number of the loops. */
function inMaterial(point: P, outline: Outline) {
  let count = 0;
  outline.loops.forEach((loop, index) => {
    const box = outline.boxes[index];
    if (point[0] < box.minX || point[0] > box.maxX || point[1] < box.minY || point[1] > box.maxY) return;
    if (inside(point, loop)) count += 1;
  });
  return count % 2 === 1;
}

type Bridge = { length: number; rect: Rect; target: number };

function rectsMeet(a: Rect, b: Rect) {
  for (let i = 0; i < 4; i += 1) {
    if (inside(a[i], b) || inside(b[i], a)) return true;
    for (let k = 0; k < 4; k += 1) if (segmentsCross(a[i], a[(i + 1) % 4], b[k], b[(k + 1) % 4])) return true;
  }
  return false;
}

/**
 * The bridge of part `index` in direction `angle`: its rectangle, its length across the gap and the loop it holds the
 * part to - or null if nothing is there to hold it to, or the bridge would touch any other outline or bridge, or run
 * so close beside an edge that the gap left between them is too narrow to cut.
 */
function bridgeAt(outline: Outline, index: number, obstacles: readonly number[], angle: number, width: number, placed: readonly Rect[]): Bridge | null {
  const part = outline.loops[index];
  const d: P = [Math.cos(angle), Math.sin(angle)];
  const n: P = [-d[1], d[0]];
  // The part's outermost corner that way: nothing of the part lies further, so the bridge does not cross it again.
  let reach = -Infinity;
  for (const corner of part) reach = Math.max(reach, corner[0] * d[0] + corner[1] * d[1]);
  // Where the part is flat that way (the top of a "D"), the middle of the flat, so the bridge sits on it and not on its corner.
  let low = Infinity;
  let high = -Infinity;
  for (const corner of part) {
    if (corner[0] * d[0] + corner[1] * d[1] < reach - 1e-4) continue;
    const across = corner[0] * n[0] + corner[1] * n[1];
    low = Math.min(low, across);
    high = Math.max(high, across);
  }
  const middle = (low + high) / 2;
  const at: P = [d[0] * reach + n[0] * middle, d[1] * reach + n[1] * middle];
  const rays = Math.max(3, Math.ceil(width / RAY_SPACING) + 1);
  const offsets = Array.from({ length: rays }, (_, k) => (k / (rays - 1) - 0.5) * width);
  // Across its whole width the bridge has to reach the same material; the edge furthest away counts.
  let length = 0;
  let target = -1;
  for (const offset of offsets) {
    const origin: P = [at[0] + n[0] * offset, at[1] + n[1] * offset];
    const hit = rayHit(origin, d, obstacles, outline.loops);
    if (!Number.isFinite(hit.distance)) return null;
    if (target >= 0 && hit.loop !== target) return null;
    target = hit.loop;
    length = Math.max(length, hit.distance);
  }
  // How far the part's edge lies behind the outermost corner at the bridge's sides: the bridge reaches back that much
  // further, so its corners sit in the part and not beside it in the gap.
  let recede = 0;
  const behind: P = [-d[0], -d[1]];
  for (const offset of [offsets[0], offsets[offsets.length - 1]]) {
    const origin: P = [at[0] + n[0] * offset + d[0] * 1e-6, at[1] + n[1] * offset + d[1] * 1e-6];
    const hit = rayHit(origin, behind, [index], outline.loops);
    if (Number.isFinite(hit.distance) && hit.distance < width * 2) recede = Math.max(recede, hit.distance - 1e-6);
  }
  const half = width / 2;
  const point = (along: number, across: number): [number, number] => [at[0] + d[0] * along + n[0] * across, at[1] + d[1] * along + n[1] * across];
  const solid = (spot: P) => inMaterial(spot, outline) || placed.some((rect) => inside(spot, rect));
  // Beside the bridge, along the middle of the gap, no edge nearer than a cut can be narrow: else the bridge would
  // leave a sliver there (a bridge down a channel only a little wider than itself).
  const from = Math.max(BRIDGE_SLIVER_ENDS, length * 0.25);
  const to = Math.min(length - BRIDGE_SLIVER_ENDS, length * 0.75);
  for (let along = from; along <= to + 1e-9; along += RAY_SPACING) {
    for (const side of [-1, 1]) {
      for (const clearance of SLIVER_PROBES) if (solid(point(along, side * (half + clearance)))) return null;
    }
  }
  // As far into the material at both ends as the outline lets it: a thin web beside the edge takes a shorter reach.
  for (const overlap of BRIDGE_OVERLAPS) {
    const back = recede + overlap;
    const forth = length + overlap;
    const rect: Rect = [point(-back, -half), point(forth, -half), point(forth, half), point(-back, half)];
    if (rectFits(outline, index, target, rect, placed) && endsInMaterial(outline, point, forth - overlap / 2, -overlap / 2, width)) return { length, rect, target };
  }
  return null;
}

/** It may cross only the part's edge and the edge it holds the part to - no other outline or bridge, nor have one inside it. */
function rectFits(outline: Outline, index: number, target: number, rect: Rect, placed: readonly Rect[]) {
  const rectBox = boxOf(rect);
  for (let other = 0; other < outline.loops.length; other += 1) {
    if (other === index || other === target || !boxesMeet(outline.boxes[other], rectBox)) continue;
    const loop = outline.loops[other];
    for (let i = 0; i < loop.length; i += 1) {
      const a = loop[i];
      const b = loop[(i + 1) % loop.length];
      if (a[0] > rectBox.minX && a[0] < rectBox.maxX && a[1] > rectBox.minY && a[1] < rectBox.maxY && inside(a, rect)) return false;
      for (let k = 0; k < 4; k += 1) if (segmentsCross(a, b, rect[k], rect[(k + 1) % 4])) return false;
    }
  }
  return !placed.some((other) => boxesMeet(boxOf(other), rectBox) && rectsMeet(rect, other));
}

/** Both ends lie in material: the far one in what it holds the part to (not in a hole of that), the near one in the part. */
function endsInMaterial(outline: Outline, point: (along: number, across: number) => [number, number], far: number, near: number, width: number) {
  const samples = Math.max(2, Math.ceil(width / RAY_SPACING) + 1);
  for (let k = 0; k < samples; k += 1) {
    if (!inMaterial(point(far, (k / (samples - 1) - 0.5) * width * 0.98), outline)) return false;
  }
  return inMaterial(point(near, 0), outline);
}

/** The directions square to the sides of a part at least as long as a bridge is wide, both ways; the longest sides first, a few dozen at most. */
function squareToSides(part: Loop, width: number) {
  const sides: Array<{ length: number; angle: number }> = [];
  for (let i = 0; i < part.length; i += 1) {
    const a = part[i];
    const b = part[(i + 1) % part.length];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (length < width) continue;
    const angle = Math.atan2(b[1] - a[1], b[0] - a[0]) - Math.PI / 2;
    sides.push({ length, angle }, { length, angle: angle + Math.PI });
  }
  return sides.sort((x, y) => y.length - x.length).slice(0, MAX_SIDE_TURNS).map((side) => side.angle);
}

export type StencilBridgeResult = {
  /** The bridges as rectangles in the outline's own coordinates, to be joined with it. */
  rects: Rect[];
  /** Parts that would fall out and no bridge could hold: too narrow a way to anything, every way blocked. */
  unheld: number;
  /** Parts that would fall out, held or not. */
  parts: number;
};

/** The bridges for every part of the outline that would fall out. */
export function stencilBridges(loops: readonly Loop[], options: StencilBridgeOptions): StencilBridgeResult {
  const { width, count } = normalizedStencilBridges(options);
  const outline = outlineOf(loops);
  const { depth, parent } = outline;
  const rects: Rect[] = [];
  let unheld = 0;
  const steps = Math.round(360 / ANGLE_STEP);
  const holes = new Map<number, number[]>();
  outline.loops.forEach((_, index) => {
    if (depth[index] < 2 || depth[index] % 2 !== 0) return;
    const hole = parent[index];
    holes.set(hole, [...(holes.get(hole) ?? []), index]);
  });
  let partCount = 0;
  for (const [hole, parts] of holes) {
    partCount += parts.length;
    // What a bridge can reach: the hole's edge and the other parts in the same hole.
    const reachable = [hole, ...parts];
    // Which parts already hang together, and whether with the hole's edge.
    const group = new Map<number, number>(reachable.map((loop) => [loop, loop]));
    const root = (loop: number): number => {
      let at = loop;
      while (group.get(at) !== at) at = group.get(at)!;
      return at;
    };
    const join = (a: number, b: number) => group.set(root(a), root(b));
    for (const index of parts) {
      const obstacles = reachable.filter((loop) => loop !== index);
      const spread = (2 * Math.PI) / count;
      let best: { total: number; bridges: Bridge[] } | null = null;
      // Turned in steps, starting upright (as stencil letters have them), then square to each side of the part long
      // enough to take a bridge (a slanting side lies between the steps); the turn whose bridges are shortest together wins.
      const turns = [...Array.from({ length: Math.ceil(steps / count) }, (_, step) => Math.PI / 2 + (step * ANGLE_STEP * Math.PI) / 180), ...squareToSides(outline.loops[index], width)];
      for (const base of turns) {
        const found = Array.from({ length: count }, (_, k) => bridgeAt(outline, index, obstacles, base + k * spread, width, rects)).filter((bridge): bridge is Bridge => bridge !== null);
        if (found.length === 0) continue;
        // A turn that leaves a bridge out counts as worse than any that has them all.
        const total = found.reduce((sum, bridge) => sum + bridge.length, 0) + (count - found.length) * 1e6;
        // Only clearly shorter beats upright: a round part is as short every way but for its facets.
        if (!best || total < best.total - Math.max(0.05, best.total * 0.02)) best = { total, bridges: found };
      }
      for (const bridge of best?.bridges ?? []) {
        rects.push(bridge.rect);
        join(index, bridge.target);
      }
    }
    // Parts that only hold each other get one more bridge each round, the shortest from any of them to anything
    // that is not theirs, until all hang on the hole's edge - or no bridge is left that could do it.
    for (;;) {
      const loose = parts.filter((index) => root(index) !== root(hole));
      if (loose.length === 0) break;
      let best: { bridge: Bridge; from: number } | null = null;
      for (const index of loose) {
        const obstacles = reachable.filter((loop) => loop !== index);
        const ways = [...Array.from({ length: steps }, (_, step) => Math.PI / 2 + (step * ANGLE_STEP * Math.PI) / 180), ...squareToSides(outline.loops[index], width)];
        for (const way of ways) {
          const bridge = bridgeAt(outline, index, obstacles, way, width, rects);
          if (bridge && root(bridge.target) !== root(index) && (!best || bridge.length < best.bridge.length)) best = { bridge, from: index };
        }
      }
      if (!best) {
        unheld += loose.length;
        break;
      }
      rects.push(best.bridge.rect);
      join(best.from, best.bridge.target);
    }
  }
  return { rects, unheld, parts: partCount };
}
