/**
 * Cracks as in kintsugi for the surface texture: lines that grow across a body's surface - with kinks,
 * branches, a width that tapers to their end and chips at the border -, the notch under them and the body that
 * fills the notch (gold, as a part of its own for a second filament).
 *
 * The cracks lie on the surface (3D), not in a projection, so they work the same on a vase, a plate, a cup or
 * a box. A crack is a random walk: step by step (about 1 mm) a little further along the surface, back onto it,
 * the normal carried along - never through a thin wall onto the other side.
 */

type Vec3 = number[];
type Mesh = { vertices: ArrayLike<number>; indices: ArrayLike<number> };
type SurfaceHit = { face: number; point: Vec3; normal: Vec3; distance: number };

/** The surface to search on: a grid over its triangles. */
export type CrackSurfaceIndex = {
  normals: Float64Array;
  cell: number;
  /**
   * The surface point nearest to `p` within `reach`, only on triangles whose normal does not face against
   * `hint` (so a walk never jumps onto the inner wall of a thin vase).
   */
  project: (p: Vec3, hint?: Vec3 | null, reach?: number) => SurfaceHit | null;
};

export type CrackSettings = {
  style: "crack" | "lightning";
  /** Where the cracks begin: at the top rim (a vase, a cup), at the bottom, at the rim towards the middle (a plate), anywhere. */
  start: "top" | "bottom" | "rim" | "anywhere";
  count: number;
  /** In % of the height (from the rim to the middle: of the radius). */
  length: number;
  /** Width at the start, mm. */
  width: number;
  branch: number;
  jag: number;
  rough: number;
  seed: number;
};

export type CrackContext = {
  index?: CrackSurfaceIndex;
  /** 0, 1 or 2: the axis the body stands along. */
  axis: number;
  /** The axis' place across it. */
  center: [number, number];
  lo: number;
  hi: number;
  maxRadius: number;
  /** Whether a crack may grow over this face, at this point. */
  allowed?: (face: number, point: Vec3) => boolean;
};

type CrackLine = { points: Vec3[]; normals: Vec3[]; hw: number[]; level: number; planned: number; traveled: number };

export type CrackNetwork = {
  /** Per segment [ax ay az bx by bz hwA hwB nx ny nz]: its ends, the half width at both and its normal. */
  segs: Float64Array;
  count: number;
  /** Every segment in all cells its band (half width) touches. */
  grid: Map<number, number[]>;
  cell: number;
  maxHw: number;
  /** Total length of the lines, mm. */
  length: number;
  lines: CrackLine[];
};

/** Length of a walk's step, mm. */
const STEP = 1;

/** Random numbers from a seed (mulberry32): the same seed, the same cracks. */
function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: Vec3): Vec3 | null => {
  const l = Math.hypot(a[0], a[1], a[2]);
  return l > 1e-12 ? [a[0] / l, a[1] / l, a[2] / l] : null;
};
/** The direction laid into the face with normal n (length 1), or null when it stands nearly upright on it. */
function tangent(d: Vec3, n: Vec3) {
  const k = dot(d, n);
  const t = [d[0] - k * n[0], d[1] - k * n[1], d[2] - k * n[2]];
  return Math.hypot(t[0], t[1], t[2]) > 0.15 * Math.hypot(d[0], d[1], d[2]) ? norm(t) : null;
}
/** The direction d (in the face) turned round the normal n, by degrees. */
function turn(d: Vec3, n: Vec3, deg: number) {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  const x = cross(n, d);
  return norm([d[0] * c + x[0] * s, d[1] * c + x[1] * s, d[2] * c + x[2] * s]) ?? d;
}

/** A grid key without collisions for cells -65536 to 65535 on each axis. */
const cellKey = (i: number, j: number, k: number) => ((i + 65536) * 131072 + (j + 65536)) * 131072 + (k + 65536);

/** The surface to search on: a grid over the triangles and their normals. */
export function surfaceIndex(mesh: Mesh): CrackSurfaceIndex {
  const v = mesh.vertices, I = mesh.indices;
  const T = I.length / 3;
  const normals = new Float64Array(T * 3);
  let edgeSum = 0;
  for (let t = 0; t < T; t++) {
    const a = I[t * 3] * 3, b = I[t * 3 + 1] * 3, c = I[t * 3 + 2] * 3;
    const ux = v[b] - v[a], uy = v[b + 1] - v[a + 1], uz = v[b + 2] - v[a + 2];
    const wx = v[c] - v[a], wy = v[c + 1] - v[a + 1], wz = v[c + 2] - v[a + 2];
    const nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
    const l = Math.hypot(nx, ny, nz) || 1;
    normals[t * 3] = nx / l;
    normals[t * 3 + 1] = ny / l;
    normals[t * 3 + 2] = nz / l;
    edgeSum += Math.hypot(ux, uy, uz);
  }
  const cell = Math.min(8, Math.max(1.5, T ? edgeSum / T : 2));
  const grid = new Map<number, number[]>();
  for (let t = 0; t < T; t++) {
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (let k = 0; k < 3; k++) {
      const q = I[t * 3 + k] * 3;
      for (let c = 0; c < 3; c++) {
        lo[c] = Math.min(lo[c], v[q + c]);
        hi[c] = Math.max(hi[c], v[q + c]);
      }
    }
    const [li, lj, lk] = lo.map((x) => Math.floor(x / cell));
    const [hi0, hj, hk] = hi.map((x) => Math.floor(x / cell));
    for (let i = li; i <= hi0; i++) for (let j = lj; j <= hj; j++) for (let k = lk; k <= hk; k++) {
      const key = cellKey(i, j, k);
      const list = grid.get(key);
      if (list) list.push(t);
      else grid.set(key, [t]);
    }
  }
  const stamp = new Uint32Array(T);
  let round = 0;
  const q = [0, 0, 0];
  const set = (x: number, y: number, z: number) => {
    q[0] = x;
    q[1] = y;
    q[2] = z;
  };
  /** The point of triangle t nearest to p (Ericson, Real-Time Collision Detection, 5.1.5), into `q`. */
  const closest = (p: Vec3, t: number) => {
    const a = I[t * 3] * 3, b = I[t * 3 + 1] * 3, c = I[t * 3 + 2] * 3;
    const abx = v[b] - v[a], aby = v[b + 1] - v[a + 1], abz = v[b + 2] - v[a + 2];
    const acx = v[c] - v[a], acy = v[c + 1] - v[a + 1], acz = v[c + 2] - v[a + 2];
    const apx = p[0] - v[a], apy = p[1] - v[a + 1], apz = p[2] - v[a + 2];
    const d1 = abx * apx + aby * apy + abz * apz, d2 = acx * apx + acy * apy + acz * apz;
    if (d1 <= 0 && d2 <= 0) return set(v[a], v[a + 1], v[a + 2]);
    const bpx = p[0] - v[b], bpy = p[1] - v[b + 1], bpz = p[2] - v[b + 2];
    const d3 = abx * bpx + aby * bpy + abz * bpz, d4 = acx * bpx + acy * bpy + acz * bpz;
    if (d3 >= 0 && d4 <= d3) return set(v[b], v[b + 1], v[b + 2]);
    const vc = d1 * d4 - d3 * d2;
    if (vc <= 0 && d1 >= 0 && d3 <= 0) {
      const s = d1 / (d1 - d3);
      return set(v[a] + s * abx, v[a + 1] + s * aby, v[a + 2] + s * abz);
    }
    const cpx = p[0] - v[c], cpy = p[1] - v[c + 1], cpz = p[2] - v[c + 2];
    const d5 = abx * cpx + aby * cpy + abz * cpz, d6 = acx * cpx + acy * cpy + acz * cpz;
    if (d6 >= 0 && d5 <= d6) return set(v[c], v[c + 1], v[c + 2]);
    const vb = d5 * d2 - d1 * d6;
    if (vb <= 0 && d2 >= 0 && d6 <= 0) {
      const s = d2 / (d2 - d6);
      return set(v[a] + s * acx, v[a + 1] + s * acy, v[a + 2] + s * acz);
    }
    const va = d3 * d6 - d5 * d4;
    if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
      const s = (d4 - d3) / (d4 - d3 + (d5 - d6));
      return set(v[b] + s * (v[c] - v[b]), v[b + 1] + s * (v[c + 1] - v[b + 1]), v[b + 2] + s * (v[c + 2] - v[b + 2]));
    }
    const den = 1 / (va + vb + vc), s = vb * den, w = vc * den;
    return set(v[a] + abx * s + acx * w, v[a + 1] + aby * s + acy * w, v[a + 2] + abz * s + acz * w);
  };
  const project = (p: Vec3, hint: Vec3 | null = null, reach = cell): SurfaceHit | null => {
    round = (round + 1) >>> 0;
    if (round === 0) {
      stamp.fill(0);
      round = 1;
    }
    const r = Math.max(reach, 1e-6);
    const lo = p.map((x) => Math.floor((x - r) / cell)), hi = p.map((x) => Math.floor((x + r) / cell));
    let best = -1, bestD = r * r;
    const bq = [0, 0, 0];
    for (let i = lo[0]; i <= hi[0]; i++) for (let j = lo[1]; j <= hi[1]; j++) for (let k = lo[2]; k <= hi[2]; k++) {
      const list = grid.get(cellKey(i, j, k));
      if (!list) continue;
      for (const t of list) {
        if (stamp[t] === round) continue;
        stamp[t] = round;
        if (hint && normals[t * 3] * hint[0] + normals[t * 3 + 1] * hint[1] + normals[t * 3 + 2] * hint[2] < -0.2) continue;
        closest(p, t);
        const d = (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2 + (q[2] - p[2]) ** 2;
        if (d <= bestD) {
          bestD = d;
          best = t;
          bq[0] = q[0];
          bq[1] = q[1];
          bq[2] = q[2];
        }
      }
    }
    if (best < 0) return null;
    return { face: best, point: bq, normal: [normals[best * 3], normals[best * 3 + 1], normals[best * 3 + 2]], distance: Math.sqrt(bestD) };
  };
  return { normals, cell, project };
}

/** Smooth noise along a crack (values -1 to 1 every `period` mm), for an uneven border. */
function noise1(rng: () => number, period: number) {
  const lattice: number[] = [];
  return (s: number) => {
    const x = s / period, i = Math.floor(x), f = x - i;
    while (lattice.length <= i + 1) lattice.push(rng() * 2 - 1);
    const u = f * f * (3 - 2 * f);
    return lattice[Math.max(0, i)] * (1 - u) + lattice[Math.max(0, i + 1)] * u;
  };
}

type Branch = {
  start: { point: Vec3; normal: Vec3 };
  /** The direction in the face to set off in. */
  dir: Vec3;
  length: number;
  /** Half the width at the start. */
  hw: number;
  level: number;
  /** The main direction at a point (or null) and how strongly it pulls. */
  main: ((p: Vec3, n: Vec3) => Vec3 | null) | null;
  pull: number;
};

/**
 * The cracks across the surface `mesh` (the cleaned base mesh). `ctx` says where the body stands and where a
 * crack may grow (walls, masks, faces kept smooth). The result: segments with half the width at both ends and
 * their normal, a grid to look them up and the lines (for tests and the summary).
 */
export function crackNetwork(mesh: Mesh, settings: CrackSettings, ctx: CrackContext): CrackNetwork {
  const S = ctx.index ?? surfaceIndex(mesh);
  const v = mesh.vertices, I = mesh.indices;
  const ax = ctx.axis;
  const [i1, i2] = [0, 1, 2].filter((k) => k !== ax);
  const up = [0, 0, 0];
  up[ax] = 1;
  const height = Math.max(ctx.hi - ctx.lo, 1);
  const lightning = settings.style === "lightning";
  const jag = settings.jag, rough = settings.rough, branch = settings.branch;
  const hw0 = settings.width / 2;
  const rng = random(0x9e3779b1 ^ Math.imul(settings.seed | 0, 2654435761));
  const allowed = ctx.allowed ?? (() => true);
  const lines: CrackLine[] = [];
  const gauss = () => {
    const u = Math.max(rng(), 1e-12), w = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * w);
  };
  const radial = (p: Vec3) => {
    const r = [0, 0, 0];
    r[i1] = p[i1] - ctx.center[0];
    r[i2] = p[i2] - ctx.center[1];
    return r;
  };

  /** One crack with its branches. Branches grow freely (a lightning's in a zigzag round their own direction). */
  const grow = (root: Omit<Branch, "level">) => {
    const stack: Branch[] = [{ level: 0, ...root }];
    while (stack.length) {
      const b = stack.pop()!;
      const { main, pull } = b;
      let P = b.start.point.slice(), N = b.start.normal.slice();
      const D0 = tangent(b.dir, N);
      if (!D0) continue;
      let D = D0;
      const wiggle = noise1(rng, 1.2);
      const chips: Array<{ at: number; len: number; amp: number }> = [];
      const pts = [P.slice()], nrm = [N.slice()], hws = [b.hw * Math.max(0.35, 1 + 0.45 * rough * wiggle(0))];
      let traveled = 0;
      let sign = rng() < 0.5 ? -1 : 1;
      const segLen = () => (lightning ? 4 + 6 * rng() : 1.5 + 3 * rng());
      let segLeft = segLen();
      // Lightning: a zigzag round the main direction, with the first kink right at the start.
      if (lightning && main) {
        const m = main(P, N);
        const mt = m && tangent(m, N);
        if (mt) D = turn(mt, N, sign * (15 + 30 * jag) * (0.6 + 0.4 * rng()));
      }
      while (traveled < b.length - 1e-9) {
        const step = Math.min(STEP, b.length - traveled);
        if (!lightning) D = turn(D, N, gauss() * (1.5 + 5 * jag));
        if (main && pull > 0) {
          const m = main(P, N);
          const mt = m && tangent(m, N);
          if (mt) D = norm([D[0] + pull * mt[0], D[1] + pull * mt[1], D[2] + pull * mt[2]]) ?? D;
        }
        const reach = step * 1.5 + 0.25;
        let hit = S.project([P[0] + D[0] * step, P[1] + D[1] * step, P[2] + D[2] * step], N, reach);
        let len = hit ? Math.hypot(hit.point[0] - P[0], hit.point[1] - P[1], hit.point[2] - P[2]) : 0;
        if (hit && len < step * 0.6) {
          // Over an edge (a box, a rim): forwards and a little into the body - that meets the face behind the
          // edge, not the edge itself again.
          const fold = S.project([P[0] + (D[0] - N[0]) * step, P[1] + (D[1] - N[1]) * step, P[2] + (D[2] - N[2]) * step], N, reach);
          if (fold && fold.face !== hit.face) {
            const l2 = Math.hypot(fold.point[0] - P[0], fold.point[1] - P[1], fold.point[2] - P[2]);
            if (l2 > len) {
              hit = fold;
              len = l2;
            }
          }
        }
        if (!hit || !allowed(hit.face, hit.point) || len < step * 0.25) break;
        const move = [hit.point[0] - P[0], hit.point[1] - P[1], hit.point[2] - P[2]];
        N = hit.normal;
        D = tangent(move, N) ?? D;
        P = hit.point.slice();
        traveled += len;
        segLeft -= len;
        if (segLeft <= 0) {
          // A kink: at random for a crack (now and then a large one), alternating round the main direction for lightning.
          if (lightning) {
            sign = -sign;
            const m = main ? main(P, N) : null;
            const mt = (m && tangent(m, N)) ?? D;
            D = turn(mt, N, sign * (20 + 40 * jag) * (0.6 + 0.4 * rng()));
          } else {
            const kink = rng() < 0.15 * jag ? (rng() < 0.5 ? -1 : 1) * (35 + 30 * rng()) : 0;
            D = turn(D, N, gauss() * jag * 30 + kink);
          }
          segLeft = segLen();
          // A branch: rarer with every level, narrower, shorter; forwards for lightning.
          const chance = branch * (lightning ? 0.7 * 0.6 ** b.level : 0.55 * 0.7 ** b.level);
          const rest = b.length - traveled;
          if (b.level < 3 && rest > 4 && rng() < chance) {
            const side = rng() < 0.5 ? -1 : 1;
            const dir = turn(D, N, side * (lightning ? 15 + 25 * rng() : 25 + 35 * rng()));
            stack.push({
              start: { point: P.slice(), normal: N.slice() },
              dir,
              length: Math.max(3, rest * (lightning ? 0.25 + 0.25 * rng() : 0.3 + 0.35 * rng())),
              hw: b.hw * (1 - traveled / b.length) ** 0.55 * 0.7,
              level: b.level + 1,
              main: lightning ? () => dir : null,
              pull: 0,
            });
          }
        }
        // Chips: small breakouts at the border (about 0.1 x roughness per mm), otherwise an uneven width.
        if (rng() < 0.1 * rough * len) chips.push({ at: traveled, len: 0.6 + 0.9 * rng(), amp: (0.4 + 0.6 * rng()) * rough });
        let chip = 0;
        for (const c of chips) if (traveled >= c.at && traveled <= c.at + c.len) chip += c.amp * Math.sin((Math.PI * (traveled - c.at)) / c.len);
        const t = Math.min(1, traveled / b.length);
        const taper = (1 - t) ** (lightning ? 0.8 : 0.55);
        hws.push(b.hw * taper * Math.max(0.35, 1 + 0.45 * rough * wiggle(traveled) + chip));
        pts.push(P.slice());
        nrm.push(N.slice());
      }
      // `planned` and `traveled`: a crack that runs into an edge or a mask before its end stops there, still wide.
      if (pts.length >= 2) lines.push({ points: pts, normals: nrm, hw: hws, level: b.level, planned: b.length, traveled });
    }
  }

  // The allowed faces with their area (for "anywhere") and points along their edges every 2 mm (for a rim) -
  // not only the mesh's corners: a box has only four on top.
  const count = settings.count;
  const start = settings.start;
  if (count > 0) {
    const faces: Array<{ A: Vec3[]; n: Vec3 }> = [], areas: number[] = [];
    const cand = { p: [] as Vec3[], n: [] as Vec3[], theta: [] as number[], h: [] as number[], r: [] as number[] };
    let areaSum = 0;
    for (let t = 0; t < I.length / 3; t++) {
      const fn = [S.normals[t * 3], S.normals[t * 3 + 1], S.normals[t * 3 + 2]];
      const A = [0, 1, 2].map((k) => [v[I[t * 3 + k] * 3], v[I[t * 3 + k] * 3 + 1], v[I[t * 3 + k] * 3 + 2]]);
      const centroid = [0, 1, 2].map((c) => (A[0][c] + A[1][c] + A[2][c]) / 3);
      if (!allowed(t, centroid)) continue;
      const rc = radial(centroid);
      const rl = Math.hypot(rc[0], rc[1], rc[2]);
      const outward = rl > 1e-9 ? dot(fn, rc) / rl : 0;
      if (start === "anywhere") {
        const area = Math.hypot(...cross([A[1][0] - A[0][0], A[1][1] - A[0][1], A[1][2] - A[0][2]], [A[2][0] - A[0][0], A[2][1] - A[0][1], A[2][2] - A[0][2]])) / 2;
        areaSum += area;
        faces.push({ A, n: fn });
        areas.push(areaSum);
        continue;
      }
      // The top or bottom rim: a wall facing out; the rim towards the middle: a face looking up (a plate, a bowl).
      if ((start === "top" || start === "bottom") && (Math.abs(fn[ax]) > 0.9 || outward < -0.2)) continue;
      if (start === "rim" && fn[ax] < 0.25) continue;
      for (let k = 0; k < 3; k++) {
        const a = A[k], b = A[(k + 1) % 3];
        const m = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / 2));
        for (let j = 0; j < m; j++) {
          const p = [a[0] + ((b[0] - a[0]) * j) / m, a[1] + ((b[1] - a[1]) * j) / m, a[2] + ((b[2] - a[2]) * j) / m];
          const r = radial(p);
          cand.p.push(p);
          cand.n.push(fn);
          cand.theta.push(Math.atan2(r[i2], r[i1]));
          cand.h.push(p[ax]);
          cand.r.push(Math.hypot(r[i1], r[i2]));
        }
      }
    }
    const theta0 = rng() * 2 * Math.PI;
    const span = (2 * Math.PI) / count;
    const L = (settings.length / 100) * (start === "rim" ? ctx.maxRadius : height);
    for (let k = 0; k < count; k++) {
      const length = L * (0.75 + 0.5 * rng());
      if (start === "anywhere") {
        if (!faces.length) break;
        // Anywhere: a random point of an allowed face (weighted by area), growing both ways.
        const x = rng() * areaSum;
        let lo = 0, hi = areas.length - 1;
        while (lo < hi) {
          const mid = (lo + hi) >> 1;
          if (areas[mid] < x) lo = mid + 1;
          else hi = mid;
        }
        const { A, n } = faces[lo];
        let u = rng(), w = rng();
        if (u + w > 1) {
          u = 1 - u;
          w = 1 - w;
        }
        const p = [0, 1, 2].map((c) => A[0][c] + (A[1][c] - A[0][c]) * u + (A[2][c] - A[0][c]) * w);
        const d0 = tangent([rng() - 0.5, rng() - 0.5, rng() - 0.5], n) ?? tangent(up, n) ?? tangent([1, 0, 0], n);
        if (!d0) continue;
        const back = [-d0[0], -d0[1], -d0[2]];
        grow({ start: { point: p, normal: n }, dir: d0, length: length / 2, hw: hw0, main: () => d0, pull: 0.05 });
        grow({ start: { point: p, normal: n }, dir: back, length: length / 2, hw: hw0, main: () => back, pull: 0.05 });
        continue;
      }
      const target = theta0 + span * (k + (rng() - 0.5) * 0.5);
      const win = Math.max(span * 0.3, (6 * Math.PI) / 180);
      let best = -1, bestScore = -Infinity, bestD = Infinity;
      for (let c = 0; c < cand.p.length; c++) {
        const d = Math.abs(Math.atan2(Math.sin(cand.theta[c] - target), Math.cos(cand.theta[c] - target)));
        if (d > win) continue;
        const score = start === "top" ? cand.h[c] : start === "bottom" ? -cand.h[c] : cand.r[c];
        if (score > bestScore + 1e-6 || (Math.abs(score - bestScore) <= 1e-6 && d < bestD)) {
          best = c;
          bestScore = score;
          bestD = d;
        }
      }
      if (best < 0) continue;
      const p = cand.p[best], n = cand.n[best];
      const main = start === "rim"
        ? (q: Vec3) => {
          const r = radial(q);
          return Math.hypot(r[0], r[1], r[2]) > 1 ? [-r[0], -r[1], -r[2]] : null;
        }
        : start === "top" ? () => [-up[0], -up[1], -up[2]] : () => up;
      const d0 = tangent(main(p) ?? up, n);
      if (!d0) continue;
      // Set off a little slanted (more with more jag).
      grow({ start: { point: p, normal: n }, dir: turn(d0, n, gauss() * (8 + 20 * jag)), length, hw: hw0, main, pull: lightning ? 0 : 0.06 + 0.1 * (1 - jag) });
    }
  }

  // The segments to look up, [ax ay az bx by bz hwA hwB nx ny nz], and a grid that has each segment in all
  // cells its band (half the width) touches.
  let nSeg = 0;
  let maxHw = 0;
  let total = 0;
  for (const l of lines) nSeg += l.points.length - 1;
  const segs = new Float64Array(nSeg * 11);
  let o = 0;
  for (const l of lines) {
    for (let k = 0; k + 1 < l.points.length; k++) {
      const a = l.points[k], b = l.points[k + 1];
      const n = norm([l.normals[k][0] + l.normals[k + 1][0], l.normals[k][1] + l.normals[k + 1][1], l.normals[k][2] + l.normals[k + 1][2]]) ?? l.normals[k];
      segs.set([a[0], a[1], a[2], b[0], b[1], b[2], l.hw[k], l.hw[k + 1], n[0], n[1], n[2]], o);
      o += 11;
      maxHw = Math.max(maxHw, l.hw[k], l.hw[k + 1]);
      total += Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    }
  }
  const cell = Math.max(0.75, 2 * maxHw + 0.5);
  const grid = new Map<number, number[]>();
  for (let s = 0; s < nSeg; s++) {
    const q = s * 11;
    const r = Math.max(segs[q + 6], segs[q + 7]) + 0.05;
    const lo = [0, 1, 2].map((c) => Math.floor((Math.min(segs[q + c], segs[q + 3 + c]) - r) / cell));
    const hi = [0, 1, 2].map((c) => Math.floor((Math.max(segs[q + c], segs[q + 3 + c]) + r) / cell));
    for (let i = lo[0]; i <= hi[0]; i++) for (let j = lo[1]; j <= hi[1]; j++) for (let k = lo[2]; k <= hi[2]; k++) {
      const key = cellKey(i, j, k);
      const list = grid.get(key);
      if (list) list.push(s);
      else grid.set(key, [s]);
    }
  }
  return { segs, count: nSeg, grid, cell, maxHw, length: total, lines };
}

/** The notch's value (0 to 1) at a point with its normal: the profile over the distance to the nearest crack line. */
export function crackValue(net: CrackNetwork, x: number, y: number, z: number, nx: number, ny: number, nz: number, profile: string) {
  const list = net.grid.get(cellKey(Math.floor(x / net.cell), Math.floor(y / net.cell), Math.floor(z / net.cell)));
  if (!list) return 0;
  const S = net.segs;
  let best = 0;
  for (const s of list) {
    const q = s * 11;
    // The back of a wall (its normal against the crack's): left alone.
    if (S[q + 8] * nx + S[q + 9] * ny + S[q + 10] * nz < 0.3) continue;
    const dx = S[q + 3] - S[q], dy = S[q + 4] - S[q + 1], dz = S[q + 5] - S[q + 2];
    const l2 = dx * dx + dy * dy + dz * dz;
    let t = l2 > 0 ? ((x - S[q]) * dx + (y - S[q + 1]) * dy + (z - S[q + 2]) * dz) / l2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const hw = S[q + 6] + (S[q + 7] - S[q + 6]) * t;
    if (hw <= 1e-4) continue;
    const d = Math.hypot(S[q] + t * dx - x, S[q + 1] + t * dy - y, S[q + 2] + t * dz - z);
    if (d >= hw) continue;
    const u = d / hw;
    const val = profile === "pointed" ? 1 - u : profile === "flat" ? Math.min(1, (1 - u) / 0.25) : 0.5 * (1 + Math.cos(Math.PI * u));
    if (val > best) best = val;
  }
  return best;
}

/** The smallest distance of the segments P (points P[0..2] to P[3..5]) and Q - Ericson 5.1.9, without allocating. */
function segmentDistance(P: Float64Array, Q: Float64Array) {
  const d1x = P[3] - P[0], d1y = P[4] - P[1], d1z = P[5] - P[2];
  const d2x = Q[3] - Q[0], d2y = Q[4] - Q[1], d2z = Q[5] - Q[2];
  const rx = P[0] - Q[0], ry = P[1] - Q[1], rz = P[2] - Q[2];
  const a = d1x * d1x + d1y * d1y + d1z * d1z, e = d2x * d2x + d2y * d2y + d2z * d2z, f = d2x * rx + d2y * ry + d2z * rz;
  let s: number, t: number;
  if (a <= 1e-12 && e <= 1e-12) return Math.hypot(rx, ry, rz);
  if (a <= 1e-12) {
    s = 0;
    t = Math.min(1, Math.max(0, f / e));
  } else {
    const c = d1x * rx + d1y * ry + d1z * rz;
    if (e <= 1e-12) {
      t = 0;
      s = Math.min(1, Math.max(0, -c / a));
    } else {
      const b = d1x * d2x + d1y * d2y + d1z * d2z, den = a * e - b * b;
      s = den > 1e-12 ? Math.min(1, Math.max(0, (b * f - c * e) / den)) : 0;
      t = (b * s + f) / e;
      if (t < 0) {
        t = 0;
        s = Math.min(1, Math.max(0, -c / a));
      } else if (t > 1) {
        t = 1;
        s = Math.min(1, Math.max(0, (b - c) / a));
      }
    }
  }
  return Math.hypot(rx + d1x * s - d2x * t, ry + d1y * s - d2y * t, rz + d1z * s - d2z * t);
}

const edgeP = new Float64Array(6), edgeQ = new Float64Array(6);
/** Whether the edge a-b (points in `verts`) lies in the band round a crack, half its width plus `margin`; for subdividing. */
export function crackEdgeNear(net: CrackNetwork, verts: ArrayLike<number>, a: number, b: number, margin: number) {
  for (let c = 0; c < 3; c++) {
    edgeP[c] = verts[a * 3 + c];
    edgeP[3 + c] = verts[b * 3 + c];
  }
  const lx = Math.floor((Math.min(edgeP[0], edgeP[3]) - margin) / net.cell), hx = Math.floor((Math.max(edgeP[0], edgeP[3]) + margin) / net.cell);
  const ly = Math.floor((Math.min(edgeP[1], edgeP[4]) - margin) / net.cell), hy = Math.floor((Math.max(edgeP[1], edgeP[4]) + margin) / net.cell);
  const lz = Math.floor((Math.min(edgeP[2], edgeP[5]) - margin) / net.cell), hz = Math.floor((Math.max(edgeP[2], edgeP[5]) + margin) / net.cell);
  if ((hx - lx + 1) * (hy - ly + 1) * (hz - lz + 1) > 4096) return true;
  const S = net.segs;
  for (let i = lx; i <= hx; i++) for (let j = ly; j <= hy; j++) for (let k = lz; k <= hz; k++) {
    const list = net.grid.get(cellKey(i, j, k));
    if (!list) continue;
    for (const s of list) {
      const q = s * 11;
      for (let c = 0; c < 6; c++) edgeQ[c] = S[q + c];
      if (segmentDistance(edgeP, edgeQ) <= Math.max(S[q + 6], S[q + 7]) + margin) return true;
    }
  }
  return false;
}

/**
 * The body that fills the notch, closed: its bottom lies exactly on the notch's floor (the finished points
 * `out`), its top `recess` mm below the surface without the notch. `g`: the notch's depth per point (mm), `dir`:
 * the way the point was moved. Where the notch is shallower than `recess` there is no fill; the border is cut
 * exactly on each edge, and top and bottom meet there. The gold of the cracks, in single precision.
 */
export function crackFillBody(out: ArrayLike<number>, indices: ArrayLike<number>, g: ArrayLike<number>, dir: ArrayLike<number>, recess: number) {
  const body = surfaceFillBody(out, indices, g, dir, recess);
  return { vertices: Float32Array.from(body.vertices), indices: body.indices };
}

/**
 * The closed body crackFillBody makes, its points as they were worked out: the cracks' gold, and with `recess` 0 the
 * pattern as a part of its own (see patternPartBody in surfaceTexture.ts), whose points have to meet the body's exactly.
 * `sunk` (with `recess` 0 only): points on the border whose bottom lies elsewhere, below the surface - the top stays on
 * the border, and where such a point ends the body on an edge of the border, a wall as high as it sank closes it there.
 */
export function surfaceFillBody(out: ArrayLike<number>, indices: ArrayLike<number>, g: ArrayLike<number>, dir: ArrayLike<number>, recess: number, sunk?: ReadonlyMap<number, readonly number[]>) {
  const eps = 1e-6;
  const vert: number[] = [];
  const tris: number[] = [];
  const bottomId = new Map<number, number>(), topId = new Map<number, number>(), isoId = new Map<number, number>();
  const SHIFT = 2 ** 26;
  const add = (x: number, y: number, z: number) => {
    vert.push(x, y, z);
    return vert.length / 3 - 1;
  };
  const bottom = (i: number) => {
    let id = bottomId.get(i);
    if (id === undefined) {
      const low = sunk?.get(i);
      id = low ? add(low[0], low[1], low[2]) : add(out[i * 3], out[i * 3 + 1], out[i * 3 + 2]);
      bottomId.set(i, id);
      // On the border: top = bottom (but for a point sunk).
      if (Math.abs(g[i] - recess) <= eps) topId.set(i, low ? add(out[i * 3], out[i * 3 + 1], out[i * 3 + 2]) : id);
    }
    return id;
  };
  // The edges between two points on the border, as the faces' tops run along them: one face only, and a point sunk at
  // either end, and a wall closes the body there.
  const borderEdges = new Map<number, { from: number; to: number; count: number }>();
  const top = (i: number) => {
    let id = topId.get(i);
    if (id === undefined) {
      bottom(i);
      id = topId.get(i);
      if (id === undefined) {
        const k = g[i] - recess;
        id = add(out[i * 3] + dir[i * 3] * k, out[i * 3 + 1] + dir[i * 3 + 1] * k, out[i * 3 + 2] + dir[i * 3 + 2] * k);
        topId.set(i, id);
      }
    }
    return id;
  };
  // The point on the edge a-b where the notch is exactly `recess` deep (top = bottom).
  const iso = (a: number, b: number) => {
    const key = a < b ? a * SHIFT + b : b * SHIFT + a;
    let id = isoId.get(key);
    if (id === undefined) {
      const t = (recess - g[a]) / (g[b] - g[a]);
      id = add(out[a * 3] + (out[b * 3] - out[a * 3]) * t, out[a * 3 + 1] + (out[b * 3 + 1] - out[a * 3 + 1]) * t, out[a * 3 + 2] + (out[b * 3 + 2] - out[a * 3 + 2]) * t);
      isoId.set(key, id);
    }
    return id;
  };
  for (let f = 0; f < indices.length; f += 3) {
    const c = [indices[f], indices[f + 1], indices[f + 2]];
    const s = c.map((i) => g[i] - recess);
    if (!s.some((x) => x > eps)) continue;
    // The polygon of the face where the notch is deeper than `recess`: per corner [bottom, top].
    const poly: Array<[number, number]> = [];
    for (let k = 0; k < 3; k++) {
      const a = c[k], b = c[(k + 1) % 3], sa = s[k], sb = s[(k + 1) % 3];
      if (sa >= -eps) poly.push([bottom(a), top(a)]);
      if ((sa > eps && sb < -eps) || (sa < -eps && sb > eps)) {
        const id = iso(a, b);
        poly.push([id, id]);
      }
    }
    for (let k = 1; k + 1 < poly.length; k++) {
      const A = poly[0], B = poly[k], C = poly[k + 1];
      // The top facing as the surface does, the bottom the other way (into the notch).
      if (A[1] !== B[1] && B[1] !== C[1] && A[1] !== C[1]) tris.push(A[1], B[1], C[1]);
      if (A[0] !== B[0] && B[0] !== C[0] && A[0] !== C[0]) tris.push(A[0], C[0], B[0]);
    }
    if (sunk?.size) {
      for (let k = 0; k < 3; k++) {
        const a = c[k], b = c[(k + 1) % 3];
        if (Math.abs(s[k]) > eps || Math.abs(s[(k + 1) % 3]) > eps) continue;
        const key = a < b ? a * SHIFT + b : b * SHIFT + a;
        const edge = borderEdges.get(key);
        if (edge) edge.count += 1;
        else borderEdges.set(key, { from: a, to: b, count: 1 });
      }
    }
  }
  borderEdges.forEach(({ from: a, to: b, count }) => {
    if (count !== 1 || !(sunk?.has(a) || sunk?.has(b))) return;
    // The face's top runs a -> b, its bottom b -> a: the wall goes back along both, down at a and up at b.
    const aTop = top(a), aBottom = bottom(a), bTop = top(b), bBottom = bottom(b);
    if (aTop !== aBottom) tris.push(aTop, aBottom, bBottom);
    if (bTop !== bBottom) tris.push(aTop, bBottom, bTop);
  });
  // Only the points a triangle uses (a corner on the border without deeper neighbours would stay loose).
  const used = new Int32Array(vert.length / 3).fill(-1);
  const vOut: number[] = [];
  const iOut = new Uint32Array(tris.length);
  for (let k = 0; k < tris.length; k++) {
    const i = tris[k];
    if (used[i] < 0) {
      used[i] = vOut.length / 3;
      vOut.push(vert[i * 3], vert[i * 3 + 1], vert[i * 3 + 2]);
    }
    iOut[k] = used[i];
  }
  return { vertices: vOut, indices: iOut };
}
