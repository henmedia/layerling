/**
 * Wood for the surface texture (see surfaceTexture.ts): the bark of a tree, laid round its trunk, and the grain of
 * wood as a solid - a piece of wood cut out of a tree, so its sides show the grain and its ends the annual rings.
 *
 * Grain: the annual rings are cylinders round the pith, an axis through the trunk. A ring's place is its distance
 * from the pith in ring widths, made to wobble a little (round and along the trunk, as a tree grows) and to bend
 * round the knots. Within a ring the soft, wide earlywood lies deeper than the hard latewood - wood brushed or
 * sandblasted, as a print can carry it. How deep along the ring depends on the wood: a pine's latewood a hard band
 * with a sharp edge to the next ring, oak and ash ring-porous (a band of pores in the earlywood), beech even with a
 * fine line at the ring's end, walnut soft and wavy. Oak has large rays (thin plates running out from the pith: lines
 * on the end grain, flecks on a quartered board), beech small ones. Fine fibres run along the trunk.
 * Where the pith runs decides the figure: through the middle of a log (the rings on its ends), under a board slightly
 * slanted (flat-sawn: the rings cut the board's face in arches), or beside it (quarter-sawn: straight lines).
 *
 * Bark is a height map round the trunk (u round it, v along it, mm): cells of irregular shape for oak (long ridges
 * between deep furrows that join into a net), pine (plates with flaky layers) and spruce (small scales lying like
 * shingles), and marks on a smooth bark for birch (short crosswise lenticels and peeling lines) and beech (gentle
 * waves and the chevrons under old branch scars). Round a cylinder every grid repeats a whole number of times.
 *
 * Every value is 0 to 1, 1 the deepest (inward: soft earlywood, a furrow), as the other patterns are.
 */

export const BARK_KINDS = ["oak", "pine", "spruce", "birch", "beech"] as const;
export type BarkKind = (typeof BARK_KINDS)[number];
export const WOOD_KINDS = ["oak", "ash", "beech", "pine", "walnut"] as const;
export type WoodKind = (typeof WOOD_KINDS)[number];
/** Where the pith runs: through a log, under a flat-sawn board, beside a quarter-sawn one. */
export const WOOD_CUTS = ["log", "flatSawn", "quarterSawn"] as const;
export type WoodCut = (typeof WOOD_CUTS)[number];

/**
 * A bark's own size (the spacing, mm) and depth (mm) to start from, and how finely its marks have to be resolved. Oak,
 * pine and beech have broad ridges: at a grid of 1.1 to 1.5 mm their rounded backs came out in flat facets, so they ask
 * for one about 0.8 to 1.1 mm (medium detail).
 */
export const BARK_STARTS: Record<BarkKind, { spacing: number; depth: number; detail: number }> = {
  oak: { spacing: 8, depth: 1.5, detail: 2 },
  pine: { spacing: 12, depth: 1.5, detail: 2.6 },
  spruce: { spacing: 5, depth: 0.8, detail: 1.2 },
  birch: { spacing: 10, depth: 0.6, detail: 3 },
  beech: { spacing: 16, depth: 0.5, detail: 3 },
};
/** A wood's ring width to start from (mm). */
export const WOOD_RINGS: Record<WoodKind, number> = { oak: 3, ash: 3.5, beech: 2.5, pine: 4, walnut: 3 };
/** The rings on the ends of a log with bark: the wood the bark grows on. */
export const BARK_WOOD: Record<BarkKind, WoodKind> = { oak: "oak", pine: "pine", spruce: "pine", birch: "beech", beech: "beech" };

/* ------------------------------------------------------------------ */
/* Noise                                                               */
/* ------------------------------------------------------------------ */

function hash(i: number, j: number, k: number, seed: number) {
  let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(k, 1274126177) ^ Math.imul(seed, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

/**
 * Smooth value noise in space, 0 to 1. Blended with a fifth-order curve, smooth in its slope too: with a third-order one
 * the lattice showed through as steps where a bark cut its noise at a level.
 */
function noise3(x: number, y: number, z: number, seed: number) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const f = (t: number) => t * t * t * (t * (6 * t - 15) + 10);
  const fx = f(x - xi), fy = f(y - yi), fz = f(z - zi);
  let sum = 0;
  for (let dz = 0; dz < 2; dz += 1) {
    for (let dy = 0; dy < 2; dy += 1) {
      for (let dx = 0; dx < 2; dx += 1) {
        const w = (dx ? fx : 1 - fx) * (dy ? fy : 1 - fy) * (dz ? fz : 1 - fz);
        sum += w * hash(xi + dx, yi + dy, zi + dz, seed);
      }
    }
  }
  return sum;
}

/** Three octaves, 0 to 1 - each finer one turned against the one before, so their lattices do not line up in rows. */
function fbm3(x: number, y: number, z: number, seed: number) {
  // About z by 37 degrees, then about x by 29: a turn keeps the scale.
  const turn = (p: number[]) => {
    const [c1, s1, c2, s2] = [0.7986, 0.6018, 0.8746, 0.4848];
    const a = c1 * p[0] - s1 * p[1], b = s1 * p[0] + c1 * p[1];
    return [a, c2 * b - s2 * p[2], s2 * b + c2 * p[2]];
  };
  const p1 = turn([x, y, z]), p2 = turn(p1);
  return 0.57 * noise3(x, y, z, seed) + 0.29 * noise3(2 * p1[0] + 17, 2 * p1[1], 2 * p1[2], seed) + 0.14 * noise3(4 * p2[0], 4 * p2[1] + 31, 4 * p2[2], seed);
}

/** Noise in the plane round a cylinder: `u` repeats after `period` mm when given (it is read on a circle). */
function fbm2(u: number, v: number, scaleU: number, scaleV: number, period: number | null, seed: number) {
  if (!period) return fbm3(u / scaleU, v / scaleV, 0, seed);
  // On a circle as long as the period, so the noise closes at the seam.
  const turns = Math.max(1, Math.round(period / scaleU));
  const a = (2 * Math.PI * u) / period;
  const r = turns / (2 * Math.PI);
  return fbm3(r * Math.cos(a), r * Math.sin(a), v / scaleV, seed);
}

/** The larger of a and b, rounded where they meet over `k` (no crease for the mesh to follow in steps). */
function softMax(a: number, b: number, k: number) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.max(a, b) + (h * h * k) / 4;
}

function smooth(e0: number, e1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/* ------------------------------------------------------------------ */
/* Bark                                                                */
/* ------------------------------------------------------------------ */

/**
 * Cells of irregular shape stretched `stretch` times along v: one point per grid cell of `cell` mm (`cell` × `cell` ×
 * `stretch` in the plane), round a cylinder repeating after `around` cells. Each column of cells is shifted along v by
 * a share of its own, so the cells' upper and lower borders do not line up round the body in rows. The distance from
 * (u, v) to the nearest border in mm (the borders found in the stretched plane, measured in the true one), how much
 * that border runs across (0 along v, 1 across it), the nearest point and its key.
 */
function stretchedCells(u: number, v: number, cell: number, stretch: number, around: number | null, seed: number) {
  const w = v / stretch;
  const ci = Math.floor(u / cell);
  const pts = CELL_POINTS, keys = CELL_KEYS;
  let best = Infinity, k1 = 0, count = 0;
  for (let di = -2; di <= 2; di += 1) {
    const i = ci + di;
    const wi = around ? ((i % around) + around) % around : i;
    const shift = hash(wi, 0, 3, seed);
    const cj = Math.floor(w / cell - shift);
    for (let dj = -2; dj <= 2; dj += 1) {
      const j = cj + dj;
      const px = (i + 0.1 + 0.8 * hash(wi, j, 1, seed)) * cell;
      const py = (j + shift + 0.1 + 0.8 * hash(wi, j, 2, seed)) * cell;
      const d = (px - u) ** 2 + (py - w) ** 2;
      if (d < best) {
        best = d;
        k1 = count;
      }
      pts[count * 2] = px;
      pts[count * 2 + 1] = py;
      keys[count] = wi * 100003 + j;
      count += 1;
    }
  }
  const sx = pts[k1 * 2], sy = pts[k1 * 2 + 1];
  const near = (sx - u) ** 2 + (sy - w) ** 2;
  let edge = Infinity;
  const ds = CELL_DS, as = CELL_AS;
  for (let k = 0; k < count; k += 1) {
    if (k === k1) {
      ds[k] = Infinity;
      continue;
    }
    const bx = pts[k * 2], by = pts[k * 2 + 1];
    const len = Math.sqrt((bx - sx) ** 2 + (by - sy) ** 2) || 1;
    const nx = (bx - sx) / len, ny = (by - sy) / len;
    // Distance to the bisector in the stretched plane, then in the true one (the normal shrinks along v).
    const scale = Math.sqrt(nx * nx + (ny / stretch) ** 2);
    const d = ((bx - u) ** 2 + (by - w) ** 2 - near) / (2 * len) / scale;
    edge = Math.min(edge, d);
    ds[k] = d;
    as[k] = Math.abs(ny / stretch) / scale;
  }
  // How much the borders near the point run across, the nearest most: from the nearest one alone, it jumped where two
  // borders meet, and a ridge narrowed by it broke off in a wedge there. Borders further than CELL_SOFT_REACH softs
  // weigh nothing to speak of.
  const soft = 0.08 * cell;
  let sum = 0, across = 0;
  for (let k = 0; k < count; k += 1) {
    const over = (ds[k] - edge) / soft;
    if (!(over < CELL_SOFT_REACH)) continue;
    const weight = Math.exp(-over);
    sum += weight;
    across += weight * as[k];
  }
  return { edge, across: across / sum, u: sx, v: sy * stretch, key: keys[k1] };
}

/** Scratch for stretchedCells: the 5 × 5 points round a place, their keys, borders and how much those run across. */
const CELL_POINTS = new Float64Array(50);
const CELL_KEYS = new Float64Array(25);
const CELL_DS = new Float64Array(25);
const CELL_AS = new Float64Array(25);
/** Beyond this many softs (see stretchedCells) a border's weight is under 0.1 %. */
const CELL_SOFT_REACH = 7;

/** A furrow `half` mm wide either side of a border: 1 in its middle, a soft bowl (cosine) to its edges. */
function furrow(edge: number, half: number) {
  if (edge >= half) return 0;
  return 0.5 * (1 + Math.cos((Math.PI * edge) / half));
}

/** The plane bent a little by noise, so borders and marks are not straight lines: (u, v) moved by up to `amount` × `cell`. */
function warp(u: number, v: number, cell: number, stretch: number, amount: number, period: number | null, seed: number) {
  const du = (fbm2(u, v, 1.3 * cell, 1.3 * cell * stretch, period, seed + 91) - 0.5) * 2 * amount * cell;
  const dv = (fbm2(u, v, 1.3 * cell, 1.3 * cell * stretch, period, seed + 92) - 0.5) * 2 * amount * cell * stretch;
  return [u + du, v + dv];
}

/**
 * The bark's value at (u, v): `cell` is the bark's size (mm, rounded round a cylinder to a whole number of cells), and
 * `around` how many go round (null when it does not close).
 */
export function barkValue(kind: BarkKind, u: number, v: number, cell: number, around: number | null, seed: number) {
  const period = around ? around * cell : null;
  switch (kind) {
    case "oak": {
      // Long ridges between deep furrows that wander and join into a net; smaller cracks split the ridges across.
      const [wu, wv] = warp(u, v, cell, 3.5, 0.3, period, seed);
      const big = stretchedCells(wu, wv, cell, 3.5, around, seed);
      const small = stretchedCells(wu, wv, cell / 2, 1.6, around ? around * 2 : null, seed + 101);
      const rough = fbm2(u, v, 0.35 * cell, 1.2 * cell, period, seed + 7);
      // Rounded ridges: deepest at a border, highest in the middle of a cell. The furrows run along the trunk; where a
      // ridge ends, across it, the break is narrow and shallow.
      const ridge = (1 - smooth(0, 0.48 * cell * (1 - 0.7 * big.across), big.edge)) ** 1.4 * (1 - 0.45 * big.across);
      return Math.min(1, softMax(softMax(ridge, 0.45 * furrow(small.edge, 0.12 * cell), 0.15), 0.1 + 0.2 * rough, 0.15));
    }
    case "pine": {
      // Long plates between furrows, each lying at a height of its own, in flaky layers.
      const [wu, wv] = warp(u, v, cell, 2.2, 0.22, period, seed);
      const plate = stretchedCells(wu, wv, cell, 2.2, around, seed);
      const layers = fbm2(u, v, 0.5 * cell, 0.8 * cell, period, seed + 11);
      const lift = hash(plate.key, 3, 5, seed);
      return Math.min(1, softMax(furrow(plate.edge, 0.14 * cell), 0.08 + 0.3 * lift + 0.35 * smooth(0.35, 0.75, layers), 0.2));
    }
    case "spruce": {
      // Small round scales lying like shingles: the free lower edge of each stands out, its upper part slips under the
      // scale above.
      const [wu, wv] = warp(u, v, cell, 1.3, 0.18, period, seed);
      const scale = stretchedCells(wu, wv, cell, 1.3, around, seed);
      const rel = Math.min(0.5, Math.max(-0.5, (wv - scale.v) / (1.3 * cell)));
      // The lower edge falls to the border over a short way: as a step it ran over the grid in stairs.
      const shingle = (0.15 + 0.7 * (rel + 0.5)) * smooth(0, 0.15 * cell, scale.edge);
      return Math.min(1, softMax(0.9 * furrow(scale.edge, 0.12 * cell), shingle, 0.2));
    }
    case "birch": {
      // Smooth, with short crosswise lenticels in rows and now and then a long peeling line.
      const rowH = cell / 3;
      const j = Math.floor(v / rowH);
      let best = 0.05 * fbm2(u, v, 0.8 * cell, 0.8 * cell, period, seed + 13);
      const ci = Math.floor(u / cell);
      for (let di = -1; di <= 1; di += 1) {
        const i = ci + di;
        const wi = around ? ((i % around) + around) % around : i;
        if (hash(wi, j, 21, seed) > 0.72) continue;
        const cx = (i + 0.2 + 0.6 * hash(wi, j, 22, seed)) * cell;
        const cy = (j + 0.3 + 0.4 * hash(wi, j, 23, seed)) * rowH;
        const half = cell * (0.18 + 0.27 * hash(wi, j, 24, seed));
        const du = Math.abs(u - cx) / half;
        if (du >= 1) continue;
        const thick = 0.07 * cell * Math.sqrt(1 - du * du);
        const dv = Math.abs(v - cy);
        if (dv < thick) best = Math.max(best, 1 - dv / thick);
      }
      // Peeling lines: one in every few rows, a thin step a few lenticels long.
      const band = 4 * cell;
      const k = Math.floor(v / band);
      if (hash(k, 0, 31, seed) > 0.45) {
        const lineV = (k + 0.15 + 0.7 * hash(k, 0, 32, seed)) * band;
        const dv = Math.abs(v - lineV);
        const half = 0.03 * cell;
        // Only part of the way round: the line begins and ends.
        const along = fbm2(u, k * 7.3, 1.8 * cell, 1, period, seed + 33);
        if (dv < half && along > 0.42) best = Math.max(best, 0.6 * (1 - dv / half));
      }
      return Math.min(1, best);
    }
    case "beech": {
      // Smooth and grey: gentle waves, and here and there the chevron under an old branch scar ("Chinese moustache").
      let best = 0.18 * fbm2(u, v, 1.4 * cell, 2.4 * cell, period, seed + 41);
      const cw = cell, ch = 1.6 * cell;
      const ci = Math.floor(u / cw), cj = Math.floor(v / ch);
      for (let dj = -1; dj <= 1; dj += 1) {
        for (let di = -1; di <= 1; di += 1) {
          const i = ci + di, j = cj + dj;
          const wi = around ? ((i % around) + around) % around : i;
          if (hash(wi, j, 42, seed) > 0.22) continue;
          const sx = (i + 0.5) * cw + 0.3 * cw * (hash(wi, j, 43, seed) - 0.5);
          const sy = (j + 0.6) * ch;
          let du = u - sx;
          if (period) du -= period * Math.round(du / period);
          const dv = v - sy;
          // The scar: a small eye.
          const eye = Math.hypot(du / 0.18, dv / 0.11) / cell;
          if (eye < 1) best = Math.max(best, 0.8 * furrow(eye, 1) + 0.15);
          // Its moustache: two arms running down and out from below the scar.
          const armLength = 0.9 * cell;
          const half = 0.08 * cell;
          for (const side of [-1, 1]) {
            const ax = side * Math.cos(0.5), ay = -Math.sin(0.5);
            const px = du, py = dv + 0.15 * cell;
            const t = px * ax + py * ay;
            if (t < 0 || t > armLength) continue;
            const off = Math.abs(-px * ay + py * ax);
            const taper = half * (1 - 0.7 * (t / armLength));
            if (off < taper) best = Math.max(best, 0.7 * furrow(off, taper));
          }
        }
      }
      return Math.min(1, best);
    }
    default:
      return 0;
  }
}

/* ------------------------------------------------------------------ */
/* Grain                                                               */
/* ------------------------------------------------------------------ */

/** A knot: where its branch leaves the pith (along it), the way it grows out, and its radius at the surface (mm). */
type Knot = { at: number[]; dir: number[]; radius: number; reach: number };

/** The pith and what the grain needs of the body, made once per texture (see woodFrame). */
export type WoodFrame = {
  /** A point on the pith and its direction, and two directions across it. */
  origin: number[];
  dir: number[];
  e1: number[];
  e2: number[];
  /** The body's radius round the pith (log) or the pith's distance to the board's far side: how many rays begin. */
  reach: number;
  knots: Knot[];
  /** How much sharper a slanted face may make the rings' steps (see ringProfile). */
  stretch: number;
};

function dot(a: ArrayLike<number>, b: ArrayLike<number>) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function unit(a: number[]) {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
}
function cross(a: number[], b: number[]) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

/**
 * Where the pith runs for a body with this box (min, max) and, for a log, this axis (0, 1, 2) through `center` (the
 * two coordinates across it). A board's pith runs along its longest side; flat-sawn it lies under the board (across its
 * thinnest side) and rises a few degrees along it, so the rings cut the face in arches; quarter-sawn it lies beside the
 * board (across its middle side), so they cut it in straight lines. Knots: branches leaving the pith along the body,
 * rising as branches do, each low enough to come out of the side rather than through the end.
 */
export function woodFrame(cut: WoodCut, axis: number, center: [number, number], min: ArrayLike<number>, max: ArrayLike<number>, ring: number, knots: number, seed: number): WoodFrame {
  const size = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  const mid = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
  const basis = (k: number) => [k === 0 ? 1 : 0, k === 1 ? 1 : 0, k === 2 ? 1 : 0];
  let origin: number[], dir: number[], reach: number;
  // A board's knots come up towards its face: away from the pith.
  let toward: number[] | null = null;
  if (cut === "log") {
    const across = axis === 0 ? [1, 2] : axis === 1 ? [0, 2] : [0, 1];
    origin = [0, 0, 0];
    origin[across[0]] = center[0];
    origin[across[1]] = center[1];
    // The pith is rarely in the very middle.
    const off = 0.06 * Math.min(size[across[0]], size[across[1]]);
    origin[across[0]] += off * (hash(seed, 1, 51, 0) - 0.5);
    origin[across[1]] += off * (hash(seed, 2, 51, 0) - 0.5);
    dir = basis(axis);
    reach = Math.max(size[across[0]], size[across[1]]) / 2;
  } else {
    const order = [0, 1, 2].sort((a, b) => size[b] - size[a]);
    const [long, middle, thin] = order;
    const away = cut === "flatSawn" ? thin : middle;
    // Flat-sawn: the pith so close under the board that its face, half its width either side, crosses about three
    // rings, and slanted so that along its length it crosses about three more - the arches. (A real board, wider and
    // metres long, comes from further out of the trunk; a small print needs its rings closer to show the same figure.)
    // Quarter-sawn: beside the board, a couple of rings away, nearly parallel.
    let gap: number, tilt: number;
    if (cut === "flatSawn") {
      const half = size[middle] / 2, cross = 3 * ring;
      const top = Math.max(size[away] + 0.5 * ring, (half * half - cross * cross) / (2 * cross));
      gap = top - size[away];
      tilt = Math.min(Math.atan((3 * ring) / Math.max(size[long], 1)), (12 * Math.PI) / 180);
    } else {
      gap = 2 * ring;
      tilt = (1 * Math.PI) / 180;
    }
    origin = mid.slice();
    origin[away] = min[away] - gap;
    dir = basis(long).map((value, k) => value * Math.cos(tilt) + (k === away ? Math.sin(tilt) : 0));
    reach = gap + size[away];
    toward = basis(away);
  }
  dir = unit(dir);
  const helper = Math.abs(dir[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const e1 = unit(cross(dir, helper));
  const e2 = cross(dir, e1);
  // Along the pith: where the body lies, for the knots.
  const corners = [0, 1, 2, 3, 4, 5, 6, 7].map((c) => [c & 1 ? max[0] : min[0], c & 2 ? max[1] : min[1], c & 4 ? max[2] : min[2]]);
  const alongs = corners.map((p) => dot([p[0] - origin[0], p[1] - origin[1], p[2] - origin[2]], dir));
  const lo = Math.min(...alongs), hi = Math.max(...alongs);
  const list: Knot[] = [];
  for (let k = 0; k < knots; k += 1) {
    // A branch rises as it grows out: it begins low enough to come out of the side, not through the end.
    let rise = (35 + 20 * hash(seed, k, 63, 0)) * (Math.PI / 180);
    const first = lo + 0.08 * (hi - lo);
    let last = hi - reach * Math.tan(rise) - ring;
    if (last < first) {
      rise = Math.atan(Math.max(0.15, (hi - ring - first) / reach));
      last = Math.max(first, hi - reach * Math.tan(rise) - ring);
    }
    const a = first + hash(seed, k, 61, 0) * (last - first);
    let theta = 2 * Math.PI * hash(seed, k, 62, 0);
    if (toward) {
      const t = unit(toward.map((value, i) => value - dot(toward!, dir) * dir[i]));
      theta = Math.atan2(dot(t, e2), dot(t, e1)) + 0.9 * (hash(seed, k, 62, 0) - 0.5);
    }
    const radial = [0, 1, 2].map((i) => Math.cos(theta) * e1[i] + Math.sin(theta) * e2[i]);
    const along = unit(radial.map((value, i) => Math.cos(rise) * value + Math.sin(rise) * dir[i]));
    list.push({
      at: [origin[0] + a * dir[0], origin[1] + a * dir[1], origin[2] + a * dir[2]],
      dir: along,
      radius: Math.max(2.5, 1.2 * ring) * (0.8 + 0.6 * hash(seed, k, 64, 0)),
      reach: Math.max(reach, 1),
    });
  }
  // A board's faces cross the rings in long, even lines, which the mesh follows; a log's side runs along a ring and
  // touches it in patches, whose edges came out in steps of the grid when kept as sharp.
  return { origin, dir, e1, e2, reach: Math.max(reach, 1), knots: list, stretch: cut === "log" ? LOG_STRETCH : MAX_STRETCH };
}

/**
 * Within a ring (0 where it begins, 1 where it ends): how deep, 1 the soft earlywood, 0 the hard latewood. `sharp` is
 * how many times a face stretches the ring compared to an end, which cuts straight across it: the steps narrow by as
 * much, so they keep on every face the width they have on an end.
 */
function ringProfile(kind: WoodKind, phase: number, pores: number, sharp = 1) {
  const step = (from: number, to: number) => smooth(from, from + (to - from) / sharp, phase);
  // The step from one ring's latewood to the next ring's earlywood is sharp; on an end it rises over a tenth of the ring
  // (the mesh could not follow a sharper one: it came out in steps).
  const start = step(0, 0.1);
  switch (kind) {
    case "pine":
      return start * (1 - step(0.42, 0.78));
    case "oak":
      return start * (1 - step(0.2, 0.32)) * (0.7 + 0.3 * pores) + 0.12 * step(0.2, 0.32);
    case "ash":
      return start * (1 - step(0.26, 0.36)) * (0.65 + 0.35 * pores) + 0.06 * step(0.26, 0.36);
    case "beech":
      return 0.25 + 0.45 * start * (1 - step(0.6, 0.95));
    case "walnut":
      return start * (1 - step(0.3, 0.85));
    default:
      return 0;
  }
}

/** A face cutting the rings at a slant stretches them at most this many times over: on a board's face, and on a log's side. */
const MAX_STRETCH = 5;
const LOG_STRETCH = 2;

/** How much the rings wobble per wood (times the setting), and how big its rays are: tangential spacing, width, height (mm). */
const WOOD_LOOK: Record<WoodKind, { wobble: number; rays: { spacing: number; half: number; height: number } | null }> = {
  oak: { wobble: 1, rays: { spacing: 3.2, half: 0.3, height: 14 } },
  ash: { wobble: 0.9, rays: null },
  beech: { wobble: 0.7, rays: { spacing: 1.6, half: 0.22, height: 3.5 } },
  pine: { wobble: 1, rays: null },
  walnut: { wobble: 1.7, rays: null },
};

/**
 * The grain's value at a point (the editor's screen frame, mm): `ring` the width of an annual ring, `wobble` how
 * unevenly the tree grew (0 to 1). With the surface's `normal`, a face that cuts the rings at a slant keeps their steps
 * as sharp as an end does.
 */
export function woodValue(kind: WoodKind, frame: WoodFrame, x: number, y: number, z: number, ring: number, wobble: number, seed: number, normal?: ArrayLike<number>) {
  const p = [x - frame.origin[0], y - frame.origin[1], z - frame.origin[2]];
  const a = dot(p, frame.dir);
  const x1 = dot(p, frame.e1), x2 = dot(p, frame.e2);
  const r = Math.hypot(x1, x2);
  const theta = Math.atan2(x2, x1);
  const look = WOOD_LOOK[kind];
  // The rings wobble round the trunk and along it (read on a circle, so they close round the pith).
  const c = Math.cos(theta), s = Math.sin(theta);
  const sway = (fbm3(1.3 * c, 1.3 * s, a / (14 * ring), seed + 71) - 0.5) * 2;
  // And finely, a ring's width round and long along the trunk: a log's side, which keeps to about one ring, cuts
  // through them in long streaks.
  const fine = (noise3((r * c) / (2 * ring), (r * s) / (2 * ring), a / (20 * ring), seed + 72) - 0.5) * 2;
  let rr = r + wobble * look.wobble * ring * (1.2 * sway + 0.4 * fine);
  // Knots: the rings bend round each branch, and inside it the branch's own rings show.
  let knotValue = -1;
  for (const knot of frame.knots) {
    const q = [x - knot.at[0], y - knot.at[1], z - knot.at[2]];
    const t = dot(q, knot.dir);
    if (t <= 0) continue;
    const off = Math.hypot(q[0] - t * knot.dir[0], q[1] - t * knot.dir[1], q[2] - t * knot.dir[2]);
    // A knot is a cone: thin at the pith, its full radius towards the outside.
    const radius = knot.radius * Math.min(1, 0.25 + t / knot.reach);
    if (off < radius) {
      const phase = off / (0.55 * ring);
      const inner = ringProfile(kind, phase - Math.floor(phase), 0.5);
      // Its border, where bark grew in, lies a little deeper.
      const edge = smooth(0.82, 1, off / radius);
      knotValue = Math.max(knotValue, 0.6 * inner * (1 - edge) + 0.9 * edge);
    } else {
      rr -= radius * Math.exp(-(((off - radius) / (1.4 * radius)) ** 2));
    }
  }
  if (knotValue >= 0) return Math.min(1, knotValue);
  // Some years grew more than others: the ring widths vary a little (never backwards).
  const years = rr / ring + 0.3 * (noise3(rr / (3 * ring), 0.5, 0.5, seed + 73) - 0.5);
  const phase = years - Math.floor(years);
  // How far the face stretches a ring: by 1 / the sine of the angle between the face and the way out from the pith.
  let sharp = 1;
  if (normal && r > 1e-9) {
    const out = (x1 * dot(normal, frame.e1) + x2 * dot(normal, frame.e2)) / r;
    sharp = 1 / Math.max(Math.sqrt(Math.max(0, 1 - out * out)), 1 / frame.stretch);
  }
  // Pores and fibres: fine streaks along the trunk.
  const fibre = noise3(a / 5, (r * c) / 0.45, (r * s) / 0.45, seed + 79);
  let value = ringProfile(kind, phase, fibre, sharp) + 0.1 * (fibre - 0.5);
  // Rays: thin plates out from the pith, each only so high along the trunk; harder, so they stand out a little.
  if (look.rays) {
    const count = Math.max(8, Math.round((2 * Math.PI * frame.reach) / look.rays.spacing));
    const sector = ((theta + Math.PI) / (2 * Math.PI)) * count;
    const k = Math.floor(sector);
    const kw = ((k % count) + count) % count;
    const at = (k + 0.2 + 0.6 * hash(kw, 0, 81, seed)) * ((2 * Math.PI) / count) - Math.PI;
    const across = r * Math.abs(Math.sin(theta - at));
    const length = look.rays.height * (0.6 + 0.8 * hash(kw, 1, 82, seed));
    const pos = a / length + hash(kw, 2, 83, seed);
    const piece = Math.floor(pos);
    // Not every piece is a ray, and none begins at the pith.
    if (hash(kw, piece, 84, seed) < 0.55 && r > 0.15 * frame.reach) {
      const lens = Math.sin(Math.PI * (pos - piece));
      const half = look.rays.half * lens;
      if (across < half) value = value * (0.25 + 0.75 * (across / half));
    }
  }
  return Math.min(1, Math.max(0, value));
}
