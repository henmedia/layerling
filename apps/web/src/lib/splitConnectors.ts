import { printerPlayStart } from "@/lib/printerPlay";

/*
 * Connectors for the Split tool (Discussion #832): a part too big for the printer is split with a plane, and its two
 * halves have nothing that lines them up again. As in the cut tools of the slicers, the split can give them round
 * connectors through the cut face:
 * - dowels: a hole in each half, and loose pins printed apart that go into both;
 * - plugs: round pegs that stand on one half and go into holes in the other;
 * - a dovetail: a tongue that widens away from the cut face, standing on one half and running straight across it from
 *   edge to edge, and the groove it slides into in the other half (as OrcaSlicer's cut tool has it). The halves are
 *   pushed together sideways along it, and then hold without glue: they cannot pull apart across the cut.
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
 * The tongues of a dovetail are laid out across the piece instead, see placeDovetailsOnPiece.
 */

export type SplitConnectorKind = "none" | "dowels" | "plugs" | "dovetail";

export const SPLIT_CONNECTOR_KINDS: readonly SplitConnectorKind[] = ["none", "dowels", "plugs", "dovetail"];

/**
 * `count` connectors on each piece of the cut face (0: as many as its size suits), `diameter` of the pin or peg, each
 * hole `depth` deep into its half, and `clearance` per side between a pin or peg and its hole, in mm. A dovetail's
 * tongues take `count` and `clearance` as well, and their own measures: `dovetailWidth` where the tongue leaves the cut
 * face, `dovetailDepth` how far it stands out of it into the other half, both in mm, `dovetailAngle` how far each flank
 * leans out from square to the face, and `dovetailTurn` how far the tongues are turned from the cut face's long way,
 * both in degrees.
 */
export type SplitConnectorOptions = {
  kind: SplitConnectorKind;
  count: number;
  diameter: number;
  depth: number;
  clearance: number;
  dovetailWidth: number;
  dovetailDepth: number;
  dovetailAngle: number;
  dovetailTurn: number;
};

export const SPLIT_CONNECTOR_DEFAULTS: SplitConnectorOptions = {
  kind: "none",
  count: 0,
  diameter: 5,
  depth: 6,
  clearance: 0.2,
  dovetailWidth: 6,
  dovetailDepth: 4,
  dovetailAngle: 15,
  dovetailTurn: 0,
};
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
export const MIN_DOVETAIL_WIDTH = 3;
export const MAX_DOVETAIL_WIDTH = 30;
export const MIN_DOVETAIL_DEPTH = 1.5;
export const MAX_DOVETAIL_DEPTH = 15;
/**
 * Each flank's lean from square to the cut face, in degrees. Below 5 a tongue hardly holds; at 30 - the flaps angle
 * OrcaSlicer and PrusaSlicer start their dovetail cut with - its top is already well over half as wide again, and a
 * tongue printed upright leans out no further than a print manages without supports.
 */
export const MIN_DOVETAIL_ANGLE = 5;
export const MAX_DOVETAIL_ANGLE = 30;
/** The tongues' turn from the cut face's long way, either way, in degrees: 90 lies across it. */
export const MAX_DOVETAIL_TURN = 90;
/** The tongue's ends are chamfered so they find the groove, at most this much, in mm. */
const MAX_DOVETAIL_CHAMFER = 0.8;
/** Without a number given, a piece gets one tongue for every this many tongue widths across it, at least one and at most MAX_AUTO_DOVETAILS. */
const DOVETAIL_SHARE = 6;
const MAX_AUTO_DOVETAILS = 4;
/** How many lines across a piece of the cut face are tried for a tongue, whatever its size. */
const DOVETAIL_LINES = 400;
/** Pieces that spread less than this much more one way than the other have no long way; their tongues run along the frame's u. */
const LONG_WAY_SPREAD = 0.02;

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
  const width = finiteNumber(value?.dovetailWidth);
  if (width !== null) result.dovetailWidth = clamp(width, MIN_DOVETAIL_WIDTH, MAX_DOVETAIL_WIDTH);
  const tongueDepth = finiteNumber(value?.dovetailDepth);
  if (tongueDepth !== null) result.dovetailDepth = clamp(tongueDepth, MIN_DOVETAIL_DEPTH, MAX_DOVETAIL_DEPTH);
  const angle = finiteNumber(value?.dovetailAngle);
  if (angle !== null) result.dovetailAngle = clamp(angle, MIN_DOVETAIL_ANGLE, MAX_DOVETAIL_ANGLE);
  const turn = finiteNumber(value?.dovetailTurn);
  if (turn !== null) result.dovetailTurn = clamp(turn, -MAX_DOVETAIL_TURN, MAX_DOVETAIL_TURN);
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

/** The pieces of a cut face that have an outline, in a fixed order whatever order they came in: by where they lie. */
function orderedPieces(pieces: ReadonlyArray<readonly SectionRing[]>) {
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
  return pieces
    .filter((rings) => rings.some((ring) => ring.length >= 3))
    .map((rings) => ({ rings, corner: corner(rings) }))
    .sort((a, b) => a.corner[1] - b.corner[1] || a.corner[0] - b.corner[0])
    .map(({ rings }) => rings);
}

/**
 * The connectors of every piece of the cut face, in a fixed order whatever order the pieces came in: by where they lie,
 * then each piece's own from front to back.
 */
export function placeSplitConnectors(pieces: ReadonlyArray<readonly SectionRing[]>, options: Pick<SplitConnectorOptions, "diameter" | "count">) {
  const ordered = orderedPieces(pieces);
  const points: Vec2[] = [];
  let tooSmall = 0;
  for (const rings of ordered) {
    const placed = placeConnectorsOnPiece(rings, options);
    if (!placed.length) tooSmall += 1;
    points.push(...placed);
  }
  return { points, faces: ordered.length, tooSmall };
}

/*
 * The dovetail. A tongue stands on the half on the minus side of the plane and runs straight across its piece of the cut
 * face, from edge to edge; it widens away from the face, its flanks leaning out by the angle, so the groove it goes into in
 * the other half holds it from pulling out. The halves are pushed together sideways, along the tongue, and the groove is
 * open at both ends for that. One or more tongues lie side by side on each piece, all one way: along the cut face's long
 * way, or turned from it as asked. As for the dowels, a tongue keeps material round it, half its width and a wall beside
 * its wide top on either side (dovetailEdgeMargin), two tongues twice that apart; it needs a stretch at least its own width
 * long where that margin lies wholly in the face, and a piece without one gets none. Within that, the tongues share the
 * piece's area across them equally, each on the middle line of its share, moved aside where that line has no room.
 *
 * A tongue is laid out along lines across the piece: seen along it (s along the tongue, t across), a line t = constant
 * runs inside the piece in stretches, and a band about it lies wholly inside where no edge comes into it. That is worked
 * out exactly from the outline's edges, a few hundred lines across the piece, so again the same cut gives the same.
 */

type DovetailMeasures = Pick<SplitConnectorOptions, "dovetailWidth" | "dovetailDepth" | "dovetailAngle">;

/** The tongue's width at its top, where it is widest: its width at the cut face, and each flank leaning out over its depth. */
export function dovetailTopWidth(options: DovetailMeasures) {
  return options.dovetailWidth + 2 * options.dovetailDepth * Math.tan((options.dovetailAngle * Math.PI) / 180);
}

/**
 * How far a tongue's middle line stays from every edge of the cut face, in mm: half its top, then half its own width and a
 * wall, as a dowel keeps its diameter and a wall. So the groove keeps that much material beside it even where it is widest.
 */
export function dovetailEdgeMargin(options: DovetailMeasures) {
  return dovetailTopWidth(options) / 2 + options.dovetailWidth / 2 + CONNECTOR_WALL;
}

/** How deep the groove goes into the other half: the tongue's depth and the end play, so the tongue never stands on its floor. */
export function dovetailGrooveDepth(options: Pick<SplitConnectorOptions, "dovetailDepth">) {
  return options.dovetailDepth + CONNECTOR_END_PLAY;
}

/** The chamfer round the tongue's ends, so its leading end finds the groove, in mm: a fifth of its depth, a sixth of its width, at most 0.8. */
export function dovetailChamfer(options: Pick<SplitConnectorOptions, "dovetailWidth" | "dovetailDepth">) {
  return Math.min(MAX_DOVETAIL_CHAMFER, options.dovetailDepth / 5, options.dovetailWidth / 6);
}

/**
 * How many tongues side by side a piece of the cut face gets when the number is left to its size: one for every
 * DOVETAIL_SHARE tongue widths it measures across them (`across`, its area over its length along them), at least one and
 * at most MAX_AUTO_DOVETAILS. A dovetail holds with one; more share the load on a wide face.
 */
export function autoDovetailCount(across: number, width: number) {
  if (!(across > 0) || !(width > 0)) return 0;
  return Math.round(clamp(across / (DOVETAIL_SHARE * width), 1, MAX_AUTO_DOVETAILS));
}

/** A line's direction in degrees, folded into (-90, 90] - a line turned half round is the same line - to a hundredth. */
export function foldLineAngle(degrees: number) {
  const rounded = Math.round(degrees * 100) / 100;
  const folded = Math.round(((((rounded + 90) % 180) + 180) % 180 - 90) * 100) / 100;
  if (folded === -90) return 90;
  return Object.is(folded, -0) ? 0 : folded;
}

/** The cosine and sine of a turn in degrees, exact for whole quarter turns, so a tongue square to the frame lies on whole axes. */
function turnOf(angle: number): Vec2 {
  const quarter = angle / 90;
  if (Number.isInteger(quarter)) return ([[1, 0], [0, 1], [-1, 0], [0, -1]] as Vec2[])[((quarter % 4) + 4) % 4];
  const radians = (angle * Math.PI) / 180;
  return [Math.cos(radians), Math.sin(radians)];
}

/** A point of the plane's frame as seen along tongues running `angle` degrees from u towards v: s along them, t across. */
export function alongTongues(angle: number, [a, b]: readonly [number, number]): Vec2 {
  const [cos, sin] = turnOf(angle);
  return [a * cos + b * sin, b * cos - a * sin];
}

/** The point of the plane's frame `s` along and `t` across tongues running `angle` degrees from u towards v. */
export function fromTongues(angle: number, s: number, t: number): Vec2 {
  const [cos, sin] = turnOf(angle);
  return [s * cos - t * sin, s * sin + t * cos];
}

/**
 * The way the pieces of a cut face are longest, as an angle in the plane's frame (degrees from u towards v, in (-90, 90]):
 * the main axis of their areas, each piece taken about its own middle. The pieces of one cut share it, so a half that
 * meets the other on several of them still slides on in one move. Pieces that spread about as far every way - a square,
 * a round face - have no long way and get 0, the frame's u, a whole axis for a plane square to the axes.
 */
export function cutFaceLongWay(pieces: ReadonlyArray<readonly SectionRing[]>) {
  let xx = 0;
  let yy = 0;
  let xy = 0;
  for (const rings of pieces) {
    const usable = rings.filter((ring) => ring.length >= 3);
    if (!usable.length) continue;
    // Taken from a corner of the piece, so a piece far from the frame's origin loses nothing to rounding.
    const [ox, oy] = usable[0][0];
    let area = 0;
    let sx = 0;
    let sy = 0;
    let sxx = 0;
    let syy = 0;
    let sxy = 0;
    for (const ring of usable) {
      ring.forEach(([px, py], index) => {
        const [qx, qy] = ring[(index + 1) % ring.length];
        const x0 = px - ox;
        const y0 = py - oy;
        const x1 = qx - ox;
        const y1 = qy - oy;
        const cross = x0 * y1 - x1 * y0;
        area += cross / 2;
        sx += ((x0 + x1) * cross) / 6;
        sy += ((y0 + y1) * cross) / 6;
        sxx += ((x0 * x0 + x0 * x1 + x1 * x1) * cross) / 12;
        syy += ((y0 * y0 + y0 * y1 + y1 * y1) * cross) / 12;
        sxy += ((x0 * y1 + 2 * x0 * y0 + 2 * x1 * y1 + x1 * y0) * cross) / 24;
      });
    }
    if (!(Math.abs(area) > 1e-9)) continue;
    // The outside and its holes run opposite ways; whichever way the outside runs, the sums carry its sign.
    const sign = Math.sign(area);
    xx += sign * (sxx - (sx * sx) / area);
    yy += sign * (syy - (sy * sy) / area);
    xy += sign * (sxy - (sx * sy) / area);
  }
  const spread = Math.hypot(xx - yy, 2 * xy);
  if (!(xx + yy > 0) || spread < LONG_WAY_SPREAD * (xx + yy)) return 0;
  return foldLineAngle((Math.atan2(2 * xy, xx - yy) * 90) / Math.PI);
}

/** Where the line t = `t` runs inside the outline (edges as s0, t0, s1, t1), from the edges' crossings: its stretches along s. */
function stretchesOnLine(edges: Float64Array, t: number): Vec2[] {
  const crossings: number[] = [];
  for (let index = 0; index < edges.length; index += 4) {
    const t0 = edges[index + 1];
    const t1 = edges[index + 3];
    if ((t0 > t) !== (t1 > t)) crossings.push(edges[index] + ((t - t0) * (edges[index + 2] - edges[index])) / (t1 - t0));
  }
  crossings.sort((a, b) => a - b);
  const stretches: Vec2[] = [];
  for (let index = 0; index + 1 < crossings.length; index += 2) {
    if (crossings[index + 1] > crossings[index]) stretches.push([crossings[index], crossings[index + 1]]);
  }
  return stretches;
}

/**
 * Where a band `half` to either side of the line t = `t` lies wholly inside the outline: the line's stretches, less
 * wherever an edge comes into the band. An edge that only touches the band's border leaves it whole.
 */
function bandStretches(edges: Float64Array, t: number, half: number): Vec2[] {
  const low = t - half + 1e-9;
  const high = t + half - 1e-9;
  const blocked: Vec2[] = [];
  for (let index = 0; index < edges.length; index += 4) {
    const s0 = edges[index];
    const t0 = edges[index + 1];
    const s1 = edges[index + 2];
    const t1 = edges[index + 3];
    if (Math.max(t0, t1) < low || Math.min(t0, t1) > high) continue;
    if (t0 === t1) {
      blocked.push([Math.min(s0, s1), Math.max(s0, s1)]);
      continue;
    }
    const at = (level: number) => s0 + ((clamp(level, Math.min(t0, t1), Math.max(t0, t1)) - t0) * (s1 - s0)) / (t1 - t0);
    const a = at(low);
    const b = at(high);
    blocked.push([Math.min(a, b), Math.max(a, b)]);
  }
  let free = stretchesOnLine(edges, t);
  for (const [b0, b1] of blocked) {
    free = free.flatMap(([f0, f1]): Vec2[] => (b1 <= f0 || b0 >= f1
      ? [[f0, f1]]
      : [...(b0 > f0 ? [[f0, b0] as Vec2] : []), ...(b1 < f1 ? [[b1, f1] as Vec2] : [])]));
  }
  return free.filter(([f0, f1]) => f1 - f0 > 1e-9);
}

const longestStretch = (stretches: readonly Vec2[]) => stretches.reduce<Vec2>((best, stretch) => (stretch[1] - stretch[0] > best[1] - best[0] ? stretch : best), [0, 0]);

/**
 * A tongue of a dovetail on a piece of the cut face, seen along the tongues (alongTongues): the way they run, `angle`
 * degrees from the frame's u towards v; its middle line t = `offset`; the stretches of that line it stands on, from edge
 * to edge of the face, one for each time the line crosses the piece; and `hold`, the longest stretch where its whole margin
 * lies in the face, where the other half is probed for room for the groove.
 */
export type SplitTongue = { angle: number; offset: number; segments: Vec2[]; hold: Vec2 };

/**
 * Where the tongues of a dovetail go on one piece of the cut face, given by its outside and its holes in the plane's frame,
 * running `angle` degrees from u towards v: up to `count` (0: as many as its size suits), each with its margin from every
 * edge along a stretch at least its own width long, and twice the margin from the next. An empty list when the piece has
 * no room for one; when fewer than asked fit, they share the piece for that many.
 */
export function placeDovetailsOnPiece(rings: readonly SectionRing[], options: Pick<SplitConnectorOptions, "count"> & DovetailMeasures, angle: number): SplitTongue[] {
  const usable = rings.filter((ring) => ring.length >= 3);
  if (!usable.length || !(options.dovetailWidth > 0)) return [];
  const margin = dovetailEdgeMargin(options);
  const topHalf = dovetailTopWidth(options) / 2;
  const holdLength = options.dovetailWidth;
  const edgeCount = usable.reduce((sum, ring) => sum + ring.length, 0);
  const edges = new Float64Array(edgeCount * 4);
  let minS = Number.POSITIVE_INFINITY;
  let maxS = Number.NEGATIVE_INFINITY;
  let minT = Number.POSITIVE_INFINITY;
  let maxT = Number.NEGATIVE_INFINITY;
  let offset = 0;
  for (const ring of usable) {
    const turned = ring.map((point) => alongTongues(angle, point));
    turned.forEach(([s, t], index) => {
      const [nextS, nextT] = turned[(index + 1) % turned.length];
      edges.set([s, t, nextS, nextT], offset);
      offset += 4;
      minS = Math.min(minS, s);
      maxS = Math.max(maxS, s);
      minT = Math.min(minT, t);
      maxT = Math.max(maxT, t);
    });
  }
  const length = maxS - minS;
  const across = maxT - minT;
  // Too narrow across for a tongue and its margins, or too short along: no lines are needed to see it.
  if (!(across > 2 * margin) || !(length >= holdLength)) return [];
  const fits = (t: number) => {
    const [start, end] = longestStretch(bandStretches(edges, t, margin));
    return end - start >= holdLength - 1e-9;
  };

  // Lines across the piece, each in the middle of its strip: the area below each, and those with room for a tongue.
  const step = across / DOVETAIL_LINES;
  const below = new Float64Array(DOVETAIL_LINES + 1);
  const roomy: number[] = [];
  for (let line = 0; line < DOVETAIL_LINES; line += 1) {
    const t = minT + (line + 0.5) * step;
    const inside = stretchesOnLine(edges, t).reduce((sum, [start, end]) => sum + end - start, 0);
    below[line + 1] = below[line] + inside * step;
    if (t > minT + margin && t < maxT - margin && fits(t)) roomy.push(t);
  }
  const total = below[DOVETAIL_LINES];
  if (!(total > 0)) return [];
  /** The line below which this share of the piece's area lies. */
  const lineAt = (share: number) => {
    const target = share * total;
    let line = 0;
    while (line < DOVETAIL_LINES - 1 && below[line + 1] < target) line += 1;
    const within = below[line + 1] - below[line];
    return minT + (line + (within > 0 ? clamp((target - below[line]) / within, 0, 1) : 0.5)) * step;
  };
  const tongueOn = (t: number): SplitTongue => {
    const segments = bandStretches(edges, t, topHalf)
      .filter(([start, end]) => end - start >= holdLength - 1e-9)
      .map(([start, end]): Vec2 => [round3(start), round3(end)]);
    const [start, end] = longestStretch(bandStretches(edges, t, margin));
    return { angle, offset: round3(t), segments, hold: [round3(start), round3(end)] };
  };

  const spacing = 2 * margin;
  const wanted = options.count > 0 ? Math.round(options.count) : autoDovetailCount(total / length, options.dovetailWidth);
  for (let count = Math.max(1, wanted); count >= 1; count -= 1) {
    const chosen: number[] = [];
    for (let index = 0; index < count; index += 1) {
      // The middle line of its share where it has room, otherwise the nearest line that has, clear of the one before.
      const ideal = lineAt((index + 0.5) / count);
      const lowest = chosen.length ? chosen[chosen.length - 1] + spacing - 1e-9 : Number.NEGATIVE_INFINITY;
      if (ideal >= lowest && fits(ideal)) {
        chosen.push(ideal);
        continue;
      }
      let best: number | null = null;
      for (const t of roomy) {
        if (t >= lowest && (best === null || Math.abs(t - ideal) < Math.abs(best - ideal))) best = t;
      }
      if (best === null) break;
      chosen.push(best);
    }
    if (chosen.length === count) return chosen.map(tongueOn);
  }
  return [];
}

/**
 * The tongues of every piece of the cut face, all running one way - the pieces' long way, turned by `dovetailTurn` - in
 * a fixed order whatever order the pieces came in: by where the pieces lie, then each piece's own across it.
 */
export function placeSplitDovetails(pieces: ReadonlyArray<readonly SectionRing[]>, options: Pick<SplitConnectorOptions, "count" | "dovetailTurn"> & DovetailMeasures) {
  const ordered = orderedPieces(pieces);
  const angle = foldLineAngle(cutFaceLongWay(ordered) + options.dovetailTurn);
  const tongues: SplitTongue[] = [];
  let tooSmall = 0;
  for (const rings of ordered) {
    const placed = placeDovetailsOnPiece(rings, options, angle);
    if (!placed.length) tooSmall += 1;
    tongues.push(...placed);
  }
  return { angle, tongues, faces: ordered.length, tooSmall };
}

/** The outline of a tongue's stretch on the plane, in the world: its foot, as wide as it leaves the cut face, and its wide top above it. */
export type SplitTongueOutline = { foot: Vec3[]; top: Vec3[] };

/** The outlines a tongue's stretches leave on the plane, for the preview: each as its foot and its wide top, four corners each. */
export function tongueOutlines(frame: SplitPlaneFrame, position: number, tongue: SplitTongue, options: DovetailMeasures): SplitTongueOutline[] {
  const corners = (start: number, end: number, half: number) => ([[start, -half], [end, -half], [end, half], [start, half]] as const)
    .map(([s, t]) => splitFramePoint(frame, fromTongues(tongue.angle, s, tongue.offset + t), position));
  return tongue.segments.map(([start, end]) => ({
    foot: corners(start, end, options.dovetailWidth / 2),
    top: corners(start, end, dovetailTopWidth(options) / 2),
  }));
}
