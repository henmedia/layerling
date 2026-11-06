import { printerPlayStart } from "@/lib/printerPlay";

/*
 * Connectors for the Split tool (Discussion #832): a part too big for the printer is split with a plane, and its two
 * halves have nothing that lines them up again. As in the cut tools of the slicers, the split can give them round
 * connectors through the cut face:
 * - dowels: a hole in each half, and loose pins printed apart that go into both;
 * - plugs: round pegs that stand on one half and go into holes in the other.
 * None, the default, splits as the tool always did.
 *
 * What is worked out here is plain arithmetic, the same on the page and in the worker: the settings and their limits,
 * the frame of the plane the section lies in, and where on the section the connectors go. The section itself, the
 * holes, the pegs and the pins are made with Manifold (manifoldSplit.ts).
 *
 * Where they go: each separate piece of the cut face - a split through the two legs of a stool has two - gets its own,
 * as many as its size suits or as asked. A connector needs a round patch of material about it, its diameter and a wall
 * (CONNECTOR_WALL) from every edge of the piece, holes in it included, and two connectors do not share theirs; a piece
 * without room for one gets none. Within that, they are spread over the piece the way its area divides best into as
 * many equal shares: each stands in the middle of its share, pulled inside where the middle lies too close to an edge.
 * Everything is worked out on a fixed grid in a fixed order, so the same cut gives the same connectors every time.
 */

export type SplitConnectorKind = "none" | "dowels" | "plugs";

export const SPLIT_CONNECTOR_KINDS: readonly SplitConnectorKind[] = ["none", "dowels", "plugs"];

/**
 * `count` connectors on each piece of the cut face (0: as many as its size suits), `diameter` of the pin or peg, each
 * hole `depth` deep into its half, and `clearance` per side between a pin or peg and its hole, in mm.
 */
export type SplitConnectorOptions = {
  kind: SplitConnectorKind;
  count: number;
  diameter: number;
  depth: number;
  clearance: number;
};

export const SPLIT_CONNECTOR_DEFAULTS: SplitConnectorOptions = { kind: "none", count: 0, diameter: 5, depth: 6, clearance: 0.2 };
export const MIN_CONNECTOR_DIAMETER = 2;
export const MAX_CONNECTOR_DIAMETER = 20;
export const MIN_CONNECTOR_DEPTH = 2;
export const MAX_CONNECTOR_DEPTH = 30;
/** On each piece of the cut face; 0 leaves it to the piece's size. */
export const MAX_CONNECTOR_COUNT = 16;
export const MAX_CONNECTOR_CLEARANCE = 0.5;
/**
 * How much material a connector keeps round it beyond its own diameter, in mm: about three lines of a 0.4 mm nozzle, as
 * round a magnet's pocket in a lid. So a connector's middle stays a diameter and this far from every edge of the cut face.
 */
export const CONNECTOR_WALL = 1.2;
/**
 * How much shorter a pin or a peg is than its holes at each end, in mm, so it never stands on a hole's floor and the
 * halves close fully even where a printed end came out a little long.
 */
export const CONNECTOR_END_PLAY = 0.3;
/** How much skin a hole keeps below its floor in the half, at least, in mm; a half thinner than that there gets no connector. */
export const CONNECTOR_FLOOR_SKIN = 0.6;
/** Area of the cut face per connector, in diameters squared, when the number is left to its size: 2500 mm² for 5 mm. */
const AREA_PER_CONNECTOR = 100;
/** Without a number given, a piece gets at least two, so a half cannot turn about one, and at most this many. */
const MAX_AUTO_COUNT = 8;
/** About this many grid points cover a piece of the cut face, whatever its size. */
const GRID_POINTS = 6000;
/** How often the shares are worked out again before the connectors stand still. */
const SHARE_ROUNDS = 60;

type Vec2 = [number, number];
type Vec3 = [number, number, number];

/** A closed outline in the plane's frame, the outside of a piece or a hole in it; the last corner joins the first. */
export type SectionRing = ReadonlyArray<readonly [number, number]>;

function finiteNumber(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(typeof value === "string" ? value.replace(",", ".") : value);
  return Number.isFinite(number) ? number : null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/**
 * The options with a mistyped or out-of-range value replaced by the nearest allowed one, and a missing one by that of
 * `defaults` (the built-in ones, or `splitConnectorDefaults` with the printer's play).
 */
export function normalizeSplitConnectorOptions(value?: Partial<Record<keyof SplitConnectorOptions, unknown>> | null, defaults: SplitConnectorOptions = SPLIT_CONNECTOR_DEFAULTS): SplitConnectorOptions {
  const result: SplitConnectorOptions = { ...defaults };
  const kind = typeof value?.kind === "string" ? value.kind.trim().toLowerCase() : "";
  if ((SPLIT_CONNECTOR_KINDS as readonly string[]).includes(kind)) result.kind = kind as SplitConnectorKind;
  const count = finiteNumber(value?.count);
  if (count !== null) result.count = Math.round(clamp(count, 0, MAX_CONNECTOR_COUNT));
  const diameter = finiteNumber(value?.diameter);
  if (diameter !== null) result.diameter = clamp(diameter, MIN_CONNECTOR_DIAMETER, MAX_CONNECTOR_DIAMETER);
  const depth = finiteNumber(value?.depth);
  if (depth !== null) result.depth = clamp(depth, MIN_CONNECTOR_DEPTH, MAX_CONNECTOR_DEPTH);
  const clearance = finiteNumber(value?.clearance);
  if (clearance !== null) result.clearance = clamp(clearance, 0, MAX_CONNECTOR_CLEARANCE);
  return result;
}

/**
 * What the connectors start from each time the Split tool opens: none, and a clearance per side that takes the printer's
 * play (printerPlay.ts) when it is measured, held within its field; without a play, the built-in 0.2.
 */
export function splitConnectorDefaults(play: number | null): SplitConnectorOptions {
  const clearance = printerPlayStart("split.connectorClearance", play);
  return normalizeSplitConnectorOptions(clearance === null ? {} : { clearance });
}

/** How far a connector's middle stays from every edge of the cut face, in mm: its diameter and a wall. */
export function connectorEdgeMargin(diameter: number) {
  return diameter + CONNECTOR_WALL;
}

/** A hole's radius: the pin's or peg's with the clearance on each side. */
export function connectorHoleRadius(options: Pick<SplitConnectorOptions, "diameter" | "clearance">) {
  return options.diameter / 2 + options.clearance;
}

/** A loose dowel's length: both holes' depths, less the end play at each end, so each hole is deeper than half the pin. */
export function dowelLength(options: Pick<SplitConnectorOptions, "depth">) {
  return 2 * (options.depth - CONNECTOR_END_PLAY);
}

/** How far a plug's peg stands out of the cut face: its hole's depth, less the end play. */
export function plugHeight(options: Pick<SplitConnectorOptions, "depth">) {
  return options.depth - CONNECTOR_END_PLAY;
}

/** The chamfer on the ends of a pin or a peg, in mm: a tenth of its diameter, at most half a millimetre. */
export function connectorChamfer(diameter: number) {
  return Math.min(0.5, diameter / 10);
}

/**
 * How many connectors a piece of the cut face of this area (mm²) gets when the number is left to its size: one for every
 * AREA_PER_CONNECTOR diameters squared, at least two and at most MAX_AUTO_COUNT. A piece with room for fewer gets fewer.
 */
export function autoConnectorCount(area: number, diameter: number) {
  if (!(area > 0) || !(diameter > 0)) return 0;
  return Math.round(clamp(area / (AREA_PER_CONNECTOR * diameter * diameter), 2, MAX_AUTO_COUNT));
}

/**
 * The plane's own frame: `u` and `v` across it, `n` its normal, right-handed (u × v = n). `u` starts from the world axis
 * the normal leans on least, so a plane square to the axes gets a frame of whole axes and nothing is turned by a hair.
 */
export type SplitPlaneFrame = { u: Vec3; v: Vec3; n: Vec3 };

export function splitPlaneFrame(normal: readonly [number, number, number]): SplitPlaneFrame {
  const length = Math.hypot(normal[0], normal[1], normal[2]);
  const n: Vec3 = length > 0 ? [normal[0] / length, normal[1] / length, normal[2] / length] : [0, 1, 0];
  const lean = n.map(Math.abs);
  const axis = lean[0] <= lean[1] && lean[0] <= lean[2] ? 0 : lean[1] <= lean[2] ? 1 : 2;
  const helper: Vec3 = [axis === 0 ? 1 : 0, axis === 1 ? 1 : 0, axis === 2 ? 1 : 0];
  const along = helper[0] * n[0] + helper[1] * n[1] + helper[2] * n[2];
  const raw: Vec3 = [helper[0] - along * n[0], helper[1] - along * n[1], helper[2] - along * n[2]];
  const rawLength = Math.hypot(...raw);
  const clean = (value: number) => (Math.abs(value) < 1e-12 ? 0 : value);
  const u = raw.map((value) => clean(value / rawLength)) as Vec3;
  const v: Vec3 = [
    clean(n[1] * u[2] - n[2] * u[1]),
    clean(n[2] * u[0] - n[0] * u[2]),
    clean(n[0] * u[1] - n[1] * u[0]),
  ];
  return { u, v, n: n.map(clean) as Vec3 };
}

/** World to frame, for Manifold's `transform` (column-major): the frame's axes as rows. */
export function toSplitFrame({ u, v, n }: SplitPlaneFrame): [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number] {
  return [u[0], v[0], n[0], 0, u[1], v[1], n[1], 0, u[2], v[2], n[2], 0, 0, 0, 0, 1];
}

/** Frame to world: the frame's axes as columns. */
export function fromSplitFrame({ u, v, n }: SplitPlaneFrame): [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number] {
  return [u[0], u[1], u[2], 0, v[0], v[1], v[2], 0, n[0], n[1], n[2], 0, 0, 0, 0, 1];
}

/** The world point at (a, b) in the plane `position` along the normal. */
export function splitFramePoint({ u, v, n }: SplitPlaneFrame, point: readonly [number, number], position: number): Vec3 {
  const [a, b] = point;
  return [
    a * u[0] + b * v[0] + position * n[0],
    a * u[1] + b * v[1] + position * n[1],
    a * u[2] + b * v[2] + position * n[2],
  ];
}

/** The rings' area, holes taken off: the outside and its holes run opposite ways, so their signed areas add up to it. */
export function sectionArea(rings: readonly SectionRing[]) {
  let sum = 0;
  for (const ring of rings) {
    for (let index = 0; index < ring.length; index += 1) {
      const [x0, y0] = ring[index];
      const [x1, y1] = ring[(index + 1) % ring.length];
      sum += x0 * y1 - x1 * y0;
    }
  }
  return Math.abs(sum) / 2;
}

/** Whether the point lies in the material: inside an odd number of the rings, the outside and not one of its holes. */
function insideRings(rings: readonly SectionRing[], x: number, y: number) {
  let inside = false;
  for (const ring of rings) {
    for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
      const [xi, yi] = ring[index];
      const [xj, yj] = ring[previous];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}

/** How far the point lies from the nearest edge of the rings. */
function edgeDistance(edges: Float64Array, x: number, y: number) {
  let nearest = Number.POSITIVE_INFINITY;
  for (let index = 0; index < edges.length; index += 4) {
    const ax = edges[index];
    const ay = edges[index + 1];
    const dx = edges[index + 2] - ax;
    const dy = edges[index + 3] - ay;
    const lengthSquared = dx * dx + dy * dy;
    const along = lengthSquared > 0 ? clamp(((x - ax) * dx + (y - ay) * dy) / lengthSquared, 0, 1) : 0;
    const ex = ax + along * dx - x;
    const ey = ay + along * dy - y;
    const distance = ex * ex + ey * ey;
    if (distance < nearest) nearest = distance;
  }
  return Math.sqrt(nearest);
}

type Candidate = { x: number; y: number; depth: number };

const squaredDistance = (a: { x: number; y: number }, b: { x: number; y: number }) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
const round3 = (value: number) => {
  const rounded = Math.round(value * 1000) / 1000;
  return Object.is(rounded, -0) ? 0 : rounded;
};

/**
 * The shares: `count` middles that divide the points into as many groups of equal weight as well as they can, each the
 * middle of the points nearest it (Lloyd's rounds, begun from points as far from one another as the piece allows, the
 * deepest first). Ties go to the first, so the answer is always the same.
 */
function shareMiddles(points: readonly Candidate[], count: number) {
  const deepest = points.reduce((best, point) => (point.depth > best.depth ? point : best), points[0]);
  const middles = [{ x: deepest.x, y: deepest.y }];
  const nearestMiddle = points.map((point) => squaredDistance(point, middles[0]));
  while (middles.length < count) {
    let farthest = 0;
    for (let index = 1; index < points.length; index += 1) {
      if (nearestMiddle[index] > nearestMiddle[farthest]) farthest = index;
    }
    if (!(nearestMiddle[farthest] > 0)) break;
    const next = { x: points[farthest].x, y: points[farthest].y };
    middles.push(next);
    points.forEach((point, index) => {
      nearestMiddle[index] = Math.min(nearestMiddle[index], squaredDistance(point, next));
    });
  }
  const owner = new Int32Array(points.length).fill(-1);
  for (let round = 0; round < SHARE_ROUNDS; round += 1) {
    let moved = false;
    points.forEach((point, index) => {
      let best = 0;
      let bestDistance = squaredDistance(point, middles[0]);
      for (let middle = 1; middle < middles.length; middle += 1) {
        const distance = squaredDistance(point, middles[middle]);
        if (distance < bestDistance) {
          best = middle;
          bestDistance = distance;
        }
      }
      if (owner[index] !== best) {
        owner[index] = best;
        moved = true;
      }
    });
    if (!moved) break;
    const sums = middles.map(() => ({ x: 0, y: 0, weight: 0 }));
    points.forEach((point, index) => {
      const sum = sums[owner[index]];
      sum.x += point.x;
      sum.y += point.y;
      sum.weight += 1;
    });
    sums.forEach((sum, middle) => {
      if (sum.weight > 0) middles[middle] = { x: sum.x / sum.weight, y: sum.y / sum.weight };
    });
  }
  return middles;
}

/**
 * Where the connectors go on one piece of the cut face, given by its outside and its holes in the plane's frame: up to
 * `count` points (0: as many as its size suits), each its diameter and a wall from every edge and twice that from the
 * others. An empty list when the piece has no room for one. When fewer than asked fit, they are spread out for that
 * many, not crowded into one end.
 */
export function placeConnectorsOnPiece(rings: readonly SectionRing[], options: Pick<SplitConnectorOptions, "diameter" | "count">): Vec2[] {
  const usable = rings.filter((ring) => ring.length >= 3);
  if (!usable.length || !(options.diameter > 0)) return [];
  const margin = connectorEdgeMargin(options.diameter);
  const edgeCount = usable.reduce((sum, ring) => sum + ring.length, 0);
  const edges = new Float64Array(edgeCount * 4);
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let offset = 0;
  for (const ring of usable) {
    ring.forEach(([x, y], index) => {
      const [nextX, nextY] = ring[(index + 1) % ring.length];
      edges.set([x, y, nextX, nextY], offset);
      offset += 4;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    });
  }
  const width = maxX - minX;
  const height = maxY - minY;
  // Too narrow for a connector across one way or the other: no grid is needed to see it.
  if (!(width > 2 * margin) || !(height > 2 * margin)) return [];
  const area = sectionArea(usable);

  // A grid of points over the piece, each in the middle of its cell, so a piece the same on both sides gets a grid that is too.
  const step = Math.sqrt((width * height) / GRID_POINTS);
  const columns = Math.max(1, Math.ceil(width / step));
  const rows = Math.max(1, Math.ceil(height / step));
  const inside: Candidate[] = [];
  for (let row = 0; row < rows; row += 1) {
    const y = minY + ((row + 0.5) * height) / rows;
    for (let column = 0; column < columns; column += 1) {
      const x = minX + ((column + 0.5) * width) / columns;
      if (insideRings(usable, x, y)) inside.push({ x, y, depth: edgeDistance(edges, x, y) });
    }
  }
  // The middle of the area as well: on a small round piece the only spot with room may fall between the grid's points.
  let centreX = 0;
  let centreY = 0;
  let signedArea = 0;
  for (const ring of usable) {
    ring.forEach(([x0, y0], index) => {
      const [x1, y1] = ring[(index + 1) % ring.length];
      const cross = x0 * y1 - x1 * y0;
      signedArea += cross;
      centreX += (x0 + x1) * cross;
      centreY += (y0 + y1) * cross;
    });
  }
  const room = inside.filter((point) => point.depth >= margin);
  if (Math.abs(signedArea) > 1e-9) {
    const x = centreX / (3 * signedArea);
    const y = centreY / (3 * signedArea);
    const depth = insideRings(usable, x, y) ? edgeDistance(edges, x, y) : -1;
    if (depth >= margin) room.push({ x, y, depth });
  }
  if (!room.length) return [];

  const spacing = 2 * margin;
  const wanted = options.count > 0 ? Math.round(options.count) : autoConnectorCount(area, options.diameter);
  for (let count = Math.max(1, wanted); count >= 1; count -= 1) {
    const chosen: Candidate[] = [];
    const clear = (point: { x: number; y: number }) => chosen.every((other) => squaredDistance(point, other) >= spacing * spacing - 1e-9);
    for (const middle of shareMiddles(inside, count)) {
      // The middle of its share where it has room, otherwise the nearest spot that has.
      const own = insideRings(usable, middle.x, middle.y) ? edgeDistance(edges, middle.x, middle.y) : -1;
      if (own >= margin && clear(middle)) {
        chosen.push({ ...middle, depth: own });
        continue;
      }
      let best: Candidate | null = null;
      let bestDistance = Number.POSITIVE_INFINITY;
      for (const point of room) {
        const distance = squaredDistance(point, middle);
        if (distance < bestDistance && clear(point)) {
          best = point;
          bestDistance = distance;
        }
      }
      if (best) chosen.push(best);
    }
    if (chosen.length === count) {
      return chosen
        .map((point): Vec2 => [round3(point.x), round3(point.y)])
        .sort((a, b) => a[1] - b[1] || a[0] - b[0]);
    }
  }
  return [];
}

/** What a split's connectors came to: how many were made, on how many pieces of cut face, and why some got none. */
export type SplitConnectorTally = {
  /** Connectors made, all pieces together. */
  placed: number;
  /** The separate pieces of the cut faces the plane made through solids. */
  faces: number;
  /** Pieces too small for even one. */
  tooSmall: number;
  /** Connectors left out where a half is thinner than the hole's depth and its floor. */
  tooThin: number;
};

export const NO_CONNECTORS: SplitConnectorTally = { placed: 0, faces: 0, tooSmall: 0, tooThin: 0 };

export function addConnectorTallies(a: SplitConnectorTally, b: SplitConnectorTally): SplitConnectorTally {
  return { placed: a.placed + b.placed, faces: a.faces + b.faces, tooSmall: a.tooSmall + b.tooSmall, tooThin: a.tooThin + b.tooThin };
}

/**
 * The connectors of every piece of the cut face, in a fixed order whatever order the pieces came in: by where they lie,
 * then each piece's own from front to back.
 */
export function placeSplitConnectors(pieces: ReadonlyArray<readonly SectionRing[]>, options: Pick<SplitConnectorOptions, "diameter" | "count">) {
  const corner = (rings: readonly SectionRing[]) => {
    let x = Number.POSITIVE_INFINITY;
    let y = Number.POSITIVE_INFINITY;
    rings.forEach((ring) => ring.forEach(([px, py]) => {
      if (py < y || (py === y && px < x)) {
        x = px;
        y = py;
      }
    }));
    return [x, y] as const;
  };
  const ordered = pieces
    .filter((rings) => rings.some((ring) => ring.length >= 3))
    .map((rings) => ({ rings, corner: corner(rings) }))
    .sort((a, b) => a.corner[1] - b.corner[1] || a.corner[0] - b.corner[0]);
  const points: Vec2[] = [];
  let tooSmall = 0;
  for (const { rings } of ordered) {
    const placed = placeConnectorsOnPiece(rings, options);
    if (!placed.length) tooSmall += 1;
    points.push(...placed);
  }
  return { points, faces: ordered.length, tooSmall };
}
