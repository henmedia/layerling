import {
  type AnalyticSurface,
  add,
  cross,
  dot,
  norm,
  perpendicularFrame,
  type PlaneSurface,
  scale,
  sub,
  surfaceDistance,
  surfaceNormal,
  unit,
  type V3,
} from "@/lib/meshSurfaceFit";
import type { MeshSegmentation } from "@/lib/meshSurfaceSegments";

/*
 * The faces of a segmented mesh as the pieces a B-rep is built from, with the edges between them.
 *
 * A curved face is cut into pieces small enough to lie on one side of its surface's seam: a cylinder, cone or torus
 * at most 200 degrees round its axis, a sphere at most 75 degrees from its middle. The cuts are planes through the
 * axis (or the centre); the edges along them are exact (a line, a meridian, a circle of the tube), and the pieces are
 * one face again once sewn.
 *
 * Each piece's outline runs along mesh edges. Where its neighbour changes, there is a corner; between corners, a
 * chain, shared by the two pieces either side. The corners are moved onto the meeting point of the surfaces there,
 * the chains' points onto the meeting line of their two surfaces, so the edges built from them are the real ones.
 */

export type Piece = {
  id: number;
  region: number;
  surface: AnalyticSurface;
  facet: boolean;
  triangles: number[];
  /** For a curved piece: the direction (from the axis, or from a sphere's centre) its middle faces. */
  middle?: V3;
};

export type Chain = {
  id: number;
  /** The pieces left and right of it as it runs (the left one has it in its outline forwards). */
  left: number;
  right: number;
  /** Mesh points, first to last; for a closed chain the first is not repeated. */
  vertices: number[];
  closed: boolean;
  /** For a chain between two pieces of one face: the plane it was cut along. */
  cut?: PlaneSurface;
};

export type LoopPart = { chain: number; reversed: boolean };
export type Loop = { piece: number; parts: LoopPart[] };

export type MeshTopology = {
  pieces: Piece[];
  pieceOfTriangle: Int32Array;
  chains: Chain[];
  loops: Loop[];
  /** Mesh points where three or more pieces meet, and where each one was moved to. */
  corners: Map<number, V3>;
  /** Every chain's points moved onto its two surfaces (the corners at its ends included). */
  chainPoints: Map<number, V3[]>;
  /** Chains along which their two surfaces touch (a fillet's edge): their points are the mesh's own. */
  tangentChains: Set<number>;
};

const SPAN_LIMIT = (200 * Math.PI) / 180;
const SPHERE_LIMIT = (75 * Math.PI) / 180;

type Cut = { a: number; b: number; plane: PlaneSurface };

/** The angle of p round an axis through `origin`, in the frame `perpendicularFrame(axis)` gives. */
export function angleRound(origin: V3, axis: V3, p: V3) {
  const [u, v] = perpendicularFrame(axis);
  const d = sub(p, origin);
  return Math.atan2(dot(d, v), dot(d, u));
}

function axisOf(s: AnalyticSurface): { origin: V3; axis: V3 } | null {
  if (s.kind === "cylinder") return { origin: s.origin, axis: s.axis };
  if (s.kind === "cone") return { origin: s.apex, axis: s.axis };
  if (s.kind === "torus") return { origin: s.center, axis: s.axis };
  return null;
}

/** The plane through the axis at angle `theta` (its normal round the axis, a quarter turn on). */
function cutPlane(origin: V3, axis: V3, theta: number): PlaneSurface {
  const [u, v] = perpendicularFrame(axis);
  const along = add(scale(u, Math.cos(theta)), scale(v, Math.sin(theta)));
  const normal = unit(cross(axis, along));
  return { kind: "plane", normal, offset: dot(normal, origin) };
}

/** Extra cuts round a region's axis, by angle (in the frame `perpendicularFrame(axis)` gives), to break up holes. */
export type ForcedCuts = Map<number, number[]>;

export function buildTopology(seg: MeshSegmentation, forced: ForcedCuts = new Map()): MeshTopology | null {
  const { mesh, neighbors } = seg;
  const P = mesh.points;
  const centroid = (t: number) => scale(add(add(P[mesh.triangles[t][0]], P[mesh.triangles[t][1]]), P[mesh.triangles[t][2]]), 1 / 3);

  // 1. Pieces.
  const pieces: Piece[] = [];
  const cuts: Cut[] = [];
  const sectorOf = new Map<number, { region: number; k: number }>();
  const sectorsOf = new Map<number, { origin: V3; axis: V3; start: number; bounds: number[] }>();
  /** The triangles in connected parts: a sector of a face, or a face, can come in several. */
  const components = (tris: number[]) => {
    const inSet = new Set(tris);
    const seen = new Set<number>();
    const out: number[][] = [];
    for (const t0 of tris) {
      if (seen.has(t0)) continue;
      const part = [t0];
      seen.add(t0);
      for (let i = 0; i < part.length; i += 1) {
        const t = part[i];
        for (let k = 0; k < 3; k += 1) {
          const o = neighbors[t * 3 + k];
          if (inSet.has(o) && !seen.has(o)) { seen.add(o); part.push(o); }
        }
      }
      out.push(part);
    }
    return out;
  };
  const pieceOfTriangle = new Int32Array(mesh.triangles.length).fill(-1);
  const addPiece = (region: number, surface: AnalyticSurface, facet: boolean, triangles: number[], middle?: V3) => {
    const id = pieces.length;
    pieces.push({ id, region, surface, facet, triangles, middle });
    for (const t of triangles) pieceOfTriangle[t] = id;
    return id;
  };
  for (const region of seg.regions) {
    const s = region.surface;
    const rot = axisOf(s);
    if (rot) {
      // Cut round the axis into equal sectors of at most the limit, starting after the widest gap between triangles.
      const angles = region.triangles.map((t) => angleRound(rot.origin, rot.axis, centroid(t)));
      const sorted = angles.slice().sort((x, y) => x - y);
      let gapEnd = sorted[0], gap = sorted[0] + 2 * Math.PI - sorted[sorted.length - 1];
      for (let i = 1; i < sorted.length; i += 1) if (sorted[i] - sorted[i - 1] > gap) { gap = sorted[i] - sorted[i - 1]; gapEnd = sorted[i]; }
      const span = 2 * Math.PI - gap;
      const sectors = Math.max(1, Math.ceil(span / SPAN_LIMIT - 1e-9));
      const width = sectors === 1 ? Math.max(span, 1e-6) : (2 * Math.PI - Math.min(gap, 2 * Math.PI - SPAN_LIMIT)) / sectors;
      const start = sectors === 1 ? gapEnd : gapEnd - (width * sectors - span) / 2;
      const [u, v] = perpendicularFrame(rot.axis);
      const rel = (angle: number) => (((angle - start) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      // Boundaries round the axis, measured from `start`: the sectors' and any forced through a hole.
      const bounds = [...Array(sectors).keys()].map((i) => i * width);
      for (const angle of forced.get(region.id) ?? []) {
        const r = rel(angle);
        if (bounds.every((b) => Math.abs(b - r) > 1e-3)) bounds.push(r);
      }
      bounds.sort((x, y) => x - y);
      const intervalOf = (r: number) => {
        let k = bounds.length - 1;
        for (let i = 0; i < bounds.length; i += 1) if (bounds[i] <= r) k = i;
        return k;
      };
      const buckets: number[][] = bounds.map(() => []);
      region.triangles.forEach((t, i) => buckets[intervalOf(rel(angles[i]))].push(t));
      sectorsOf.set(region.id, { origin: rot.origin, axis: rot.axis, start, bounds });
      buckets.forEach((tris, k) => {
        for (const part of components(tris)) {
          // The middle of the triangles actually there (a partial face does not fill its last interval).
          const relAngles = part.map((t) => rel(angleRound(rot.origin, rot.axis, centroid(t))));
          const mid = start + (Math.min(...relAngles) + Math.max(...relAngles)) / 2;
          const id = addPiece(region.id, s, region.facet, part, add(scale(u, Math.cos(mid)), scale(v, Math.sin(mid))));
          if (bounds.length > 1) sectorOf.set(id, { region: region.id, k });
        }
      });
      continue;
    }
    if (s.kind === "sphere") {
      const splitPlanes: { plane: PlaneSurface; sideA: Set<number>; sideB: Set<number> }[] = [];
      // Halve across the widest spread of directions until each part stays within the limit of its middle.
      const split = (tris: number[]): { tris: number[]; middle: V3 }[] => {
        const dirs = tris.map((t) => unit(sub(centroid(t), s.center)));
        const sum = dirs.reduce((m, d) => add(m, d), [0, 0, 0] as V3);
        const mean = norm(sum) > 1e-9 ? unit(sum) : dirs[0];
        const worst = Math.max(...dirs.map((d) => Math.acos(Math.max(-1, Math.min(1, dot(d, mean))))));
        if ((worst <= SPHERE_LIMIT && norm(sum) > tris.length * 0.3) || tris.length < 4) return [{ tris, middle: mean }];
        let axis: V3 = mean;
        let best = -1;
        for (const candidate of [...perpendicularFrame(mean), mean]) {
          let spread = 0;
          for (const d of dirs) spread += dot(d, candidate) ** 2;
          spread -= dirs.length * dot(mean, candidate) ** 2;
          if (spread > best) { best = spread; axis = candidate; }
        }
        // Through the centre: the cut is a great circle.
        const offset = dot(axis, s.center);
        const plane: PlaneSurface = { kind: "plane", normal: axis, offset };
        const sideA = tris.filter((t) => dot(centroid(t), axis) >= offset);
        const sideB = tris.filter((t) => dot(centroid(t), axis) < offset);
        if (sideA.length === 0 || sideB.length === 0) return [{ tris, middle: mean }];
        splitPlanes.push({ plane, sideA: new Set(sideA), sideB: new Set(sideB) });
        return [...split(sideA), ...split(sideB)];
      };
      const parts = split(region.triangles).flatMap((part) => components(part.tris).map((tris) => ({ tris, middle: part.middle })));
      const ids = parts.map((part) => addPiece(region.id, s, region.facet, part.tris, part.middle));
      // A cut between two parts: the split plane that has one on each side.
      for (let i = 0; i < ids.length; i += 1) for (let j = i + 1; j < ids.length; j += 1) {
        const ta = parts[i].tris[0], tb = parts[j].tris[0];
        const plane = splitPlanes.find((sp) => (sp.sideA.has(ta) && sp.sideB.has(tb)) || (sp.sideB.has(ta) && sp.sideA.has(tb)));
        if (plane) cuts.push({ a: ids[i], b: ids[j], plane: plane.plane });
      }
      continue;
    }
    for (const part of components(region.triangles)) addPiece(region.id, s, region.facet, part);
  }
  if (pieceOfTriangle.some((p) => p < 0)) return null;
  /**
   * The plane two pieces of one face were cut apart along, the one nearest `near`: two halves of a cylinder meet
   * along two cuts, one each side.
   */
  const cutOf = (a: number, b: number, near: V3) => {
    const candidates: PlaneSurface[] = cuts.filter((c) => (c.a === a && c.b === b) || (c.a === b && c.b === a)).map((c) => c.plane);
    const sa = sectorOf.get(a), sb = sectorOf.get(b);
    if (sa && sb && sa.region === sb.region) {
      const info = sectorsOf.get(sa.region)!;
      const n = info.bounds.length;
      // The cut at the start of a sector lies between it and the sector before.
      if ((sa.k + 1) % n === sb.k) candidates.push(cutPlane(info.origin, info.axis, info.start + info.bounds[sb.k]));
      if ((sb.k + 1) % n === sa.k) candidates.push(cutPlane(info.origin, info.axis, info.start + info.bounds[sa.k]));
    }
    let best: PlaneSurface | undefined;
    let bestDistance = Infinity;
    for (const plane of candidates) {
      // A cutting plane through an axis is only the half on its own side: measure from the half-line too.
      const d = Math.abs(surfaceDistance(plane, near));
      if (d < bestDistance) { bestDistance = d; best = plane; }
    }
    return best;
  };

  // 2. Outlines: boundary half-edges, walked round each piece.
  type Half = { from: number; to: number; tri: number; k: number; other: number; used: boolean };
  const halvesOf = new Map<number, Half[]>(); // by piece
  const outgoing = new Map<string, Half[]>(); // piece:from
  for (let t = 0; t < mesh.triangles.length; t += 1) {
    const p = pieceOfTriangle[t];
    for (let k = 0; k < 3; k += 1) {
      const o = neighbors[t * 3 + k];
      const q = pieceOfTriangle[o];
      if (q === p) continue;
      const h: Half = { from: mesh.triangles[t][k], to: mesh.triangles[t][(k + 1) % 3], tri: t, k, other: q, used: false };
      (halvesOf.get(p) ?? halvesOf.set(p, []).get(p)!).push(h);
      const key = `${p}:${h.from}`;
      (outgoing.get(key) ?? outgoing.set(key, []).get(key)!).push(h);
    }
  }
  /** The next boundary half-edge after h round its end point, turning inside the piece. */
  const nextHalf = (p: number, h: Half): Half | null => {
    const options = outgoing.get(`${p}:${h.to}`) ?? [];
    const free = options.filter((o) => !o.used);
    if (free.length <= 1) return free[0] ?? null;
    // Several leave this point: walk round it through the piece's triangles from h's triangle.
    let t = h.tri;
    let entering = h.to;
    for (let guard = 0; guard < 64; guard += 1) {
      const tri = mesh.triangles[t];
      const k = tri.indexOf(entering);
      const out = free.find((o) => o.tri === t && o.k === k);
      if (out) return out;
      const o = neighbors[t * 3 + k];
      if (pieceOfTriangle[o] !== p) return free[0];
      t = o;
    }
    return free[0];
  };
  type RawLoop = { piece: number; halves: Half[] };
  const rawLoops: RawLoop[] = [];
  for (const [p, halves] of halvesOf) {
    for (const start of halves) {
      if (start.used) continue;
      const loop: Half[] = [];
      let h: Half | null = start;
      while (h && !h.used) {
        h.used = true;
        loop.push(h);
        if (h.to === start.from) break;
        h = nextHalf(p, h);
      }
      if (loop.length === 0 || loop[loop.length - 1].to !== start.from) return null;
      rawLoops.push({ piece: p, halves: loop });
    }
  }

  // 3. Corners: points round which three or more pieces meet.
  const piecesAt = new Map<number, Set<number>>();
  const trianglesAt = new Map<number, number[]>();
  mesh.triangles.forEach((tri, t) => {
    for (const v of tri) {
      (piecesAt.get(v) ?? piecesAt.set(v, new Set()).get(v)!).add(pieceOfTriangle[t]);
      (trianglesAt.get(v) ?? trianglesAt.set(v, []).get(v)!).push(t);
    }
  });
  const isCorner = (v: number) => (piecesAt.get(v)?.size ?? 0) >= 3;

  // 4. Chains, each found once from either side.
  const chains: Chain[] = [];
  const chainByKey = new Map<string, number>();
  const loops: Loop[] = [];
  for (const raw of rawLoops) {
    const { piece, halves } = raw;
    // Rotate so the loop starts at a corner or a change of neighbour.
    let startAt = halves.findIndex((h, i) => isCorner(h.from) || halves[(i - 1 + halves.length) % halves.length].other !== h.other);
    const closedLoop = startAt < 0;
    if (closedLoop) startAt = 0;
    const order = halves.slice(startAt).concat(halves.slice(0, startAt));
    const runs: Half[][] = [];
    for (const h of order) {
      const last = runs[runs.length - 1];
      if (!last || isCorner(h.from) || last[last.length - 1].other !== h.other) runs.push([h]);
      else last.push(h);
    }
    const parts: LoopPart[] = [];
    for (const run of runs) {
      const forward = [run[0].from, ...run.map((h) => h.to)];
      const other = run[0].other;
      const closed = closedLoop && runs.length === 1;
      const vertices = closed ? forward.slice(0, -1) : forward;
      // The key the same chain has from the other side: the run reversed.
      const canonical = canonicalChain(vertices, closed);
      const key = `${Math.min(piece, other)}|${Math.max(piece, other)}|${canonical.join(",")}`;
      let id = chainByKey.get(key);
      let reversed = false;
      if (id === undefined) {
        id = chains.length;
        chainByKey.set(key, id);
        chains.push({ id, left: piece, right: other, vertices, closed, cut: pieces[piece].region === pieces[other].region ? cutOf(piece, other, P[vertices[Math.floor(vertices.length / 2)]]) : undefined });
      } else {
        // Seen from the other piece: the stored chain runs the other way here.
        reversed = true;
        const stored = chains[id];
        if (stored.left === piece) reversed = false;
      }
      parts.push({ chain: id, reversed });
    }
    loops.push({ piece, parts });
  }

  // 5. Corners and chain points onto their surfaces.
  const corners = new Map<number, V3>();
  const constraintsAt = (v: number): AnalyticSurface[] => {
    const around = [...(piecesAt.get(v) ?? [])];
    if (around.some((p) => pieces[p].facet)) return [];
    const out: AnalyticSurface[] = [];
    const regions = new Set<number>();
    for (const p of around) {
      if (regions.has(pieces[p].region)) continue;
      regions.add(pieces[p].region);
      out.push(pieces[p].surface);
    }
    for (let i = 0; i < around.length; i += 1) for (let j = i + 1; j < around.length; j += 1) {
      if (pieces[around[i]].region !== pieces[around[j]].region) continue;
      const plane = cutOf(around[i], around[j], P[v]);
      if (plane) out.push(plane);
    }
    return out;
  };
  for (const chain of chains) {
    if (chain.closed) continue;
    for (const v of [chain.vertices[0], chain.vertices[chain.vertices.length - 1]]) {
      if (corners.has(v)) continue;
      const constraints = constraintsAt(v);
      // A corner on a cut plane lies where the mesh's jagged edge crossed it: it may move as far as a triangle is wide.
      const onCut = constraints.some((c) => c.kind === "plane" && !pieces.some((piece) => piece.surface === c));
      const maxMove = onCut ? seg.tolerance * 20 + 6 * spreadAround(v) : undefined;
      corners.set(v, constraints.length > 0 ? solveOnto(P[v], constraints, seg.tolerance, maxMove) ?? P[v] : P[v]);
    }
  }
  const chainPoints = new Map<number, V3[]>();
  const tangentChains = new Set<number>();
  function spreadAround(v: number) {
    let worst = 0;
    for (const t of trianglesAt.get(v) ?? []) for (const w of mesh.triangles[t]) worst = Math.max(worst, norm(sub(P[w], P[v])));
    return worst;
  }
  for (const chain of chains) {
    const a = pieces[chain.left], b = pieces[chain.right];
    const onto: AnalyticSurface[] = a.facet || b.facet ? [] : a.region === b.region ? (chain.cut ? [a.surface, chain.cut] : [a.surface]) : [a.surface, b.surface];
    const middle = P[chain.vertices[Math.floor(chain.vertices.length / 2)]];
    const tangent = onto.length === 2 && !chain.cut && Math.abs(dot(surfaceNormal(onto[0], middle), surfaceNormal(onto[1], middle))) > Math.cos((8 * Math.PI) / 180);
    const pts = chain.vertices.map((v, i) => {
      const end = !chain.closed && (i === 0 || i === chain.vertices.length - 1);
      if (end) return corners.get(v)!;
      // Where two surfaces touch, the mesh's own points are on the line they share; moving them only blurs it.
      if (tangent) return P[v];
      const maxMove = chain.cut ? seg.tolerance * 20 + 6 * spreadAround(v) : undefined;
      return onto.length > 0 ? solveOnto(P[v], onto, seg.tolerance, maxMove) ?? P[v] : P[v];
    });
    if (tangent) tangentChains.add(chain.id);
    chainPoints.set(chain.id, pts);
  }
  return { pieces, pieceOfTriangle, chains, loops, corners, chainPoints, tangentChains };
}

/** The chain's points in the order that is the same from either side: starting at the lower end, or for a closed one at its lowest point going towards the lower neighbour. */
function canonicalChain(vertices: number[], closed: boolean): number[] {
  if (!closed) return vertices[0] <= vertices[vertices.length - 1] ? vertices : vertices.slice().reverse();
  let low = 0;
  for (let i = 1; i < vertices.length; i += 1) if (vertices[i] < vertices[low]) low = i;
  const rotated = vertices.slice(low).concat(vertices.slice(0, low));
  return rotated[1] <= rotated[rotated.length - 1] ? rotated : [rotated[0], ...rotated.slice(1).reverse()];
}

/**
 * The point nearest p on all the given surfaces at once (Gauss-Newton, the least step each time), or null when they
 * do not meet near it.
 */
/** The axis a surface turns about, when it has one (a plane counts for any axis at right angles to it, a sphere for any through its centre). */
function turnsAbout(s: AnalyticSurface, origin: V3, axis: V3): boolean {
  const onAxis = (q: V3) => norm(sub(sub(q, origin), scale(axis, dot(sub(q, origin), axis)))) < 1e-6;
  switch (s.kind) {
    case "plane": return Math.abs(Math.abs(dot(s.normal, axis)) - 1) < 1e-6;
    case "sphere": return onAxis(s.center);
    case "cylinder": return Math.abs(Math.abs(dot(s.axis, axis)) - 1) < 1e-6 && onAxis(s.origin);
    case "cone": return Math.abs(Math.abs(dot(s.axis, axis)) - 1) < 1e-6 && onAxis(s.apex);
    case "torus": return Math.abs(Math.abs(dot(s.axis, axis)) - 1) < 1e-6 && onAxis(s.center);
  }
}

function ownAxis(s: AnalyticSurface): { origin: V3; axis: V3 } | null {
  if (s.kind === "cylinder") return { origin: s.origin, axis: s.axis };
  if (s.kind === "cone") return { origin: s.apex, axis: s.axis };
  if (s.kind === "torus") return { origin: s.center, axis: s.axis };
  return null;
}

/**
 * Two surfaces that touch along a curve (a fillet running into a wall) meet in a band, not a line, and solving for
 * both is singular. Where the curve is known, two plain constraints stand in for them: round a common axis it is a
 * circle (the same distance from the axis, the same height along it as p); a cylinder lying on a plane touches it
 * along the line under its axis. Null when it is neither.
 */
function touchingCurve(a: AnalyticSurface, b: AnalyticSurface, p: V3): AnalyticSurface[] | null {
  for (const [round, other] of [[a, b], [b, a]] as const) {
    const ax = ownAxis(round);
    if (!ax) continue;
    if (!turnsAbout(other, ax.origin, ax.axis)) continue;
    const d = sub(p, ax.origin);
    const h = dot(d, ax.axis);
    const rho = norm(sub(d, scale(ax.axis, h)));
    return [
      { kind: "cylinder", origin: ax.origin, axis: ax.axis, radius: rho },
      { kind: "plane", normal: ax.axis, offset: dot(ax.axis, add(ax.origin, scale(ax.axis, h))) },
    ];
  }
  for (const [cyl, plane] of [[a, b], [b, a]] as const) {
    if (cyl.kind !== "cylinder" || plane.kind !== "plane") continue;
    if (Math.abs(dot(cyl.axis, plane.normal)) > 1e-6) continue;
    const normal = unit(cross(plane.normal, cyl.axis));
    return [plane, { kind: "plane", normal, offset: dot(normal, cyl.origin) }];
  }
  return null;
}

/**
 * How far a point may slide to the line a plane touches a cylinder along. A hull joins corners of polygons, so its
 * corners lie up to half a polygon step round the cylinder from where its side really touches (#1442); that move is
 * along both surfaces and changes nothing of the shape.
 */
function touchingSlide(a: AnalyticSurface, b: AnalyticSurface) {
  const cyl = a.kind === "cylinder" ? a : b.kind === "cylinder" ? b : null;
  const plane = a.kind === "plane" ? a : b.kind === "plane" ? b : null;
  if (!cyl || !plane || Math.abs(dot(cyl.axis, plane.normal)) > 1e-6) return 0;
  return cyl.radius * Math.sin((8 * Math.PI) / 180);
}

export function solveOnto(p: V3, given: AnalyticSurface[], tolerance: number, maxMove = tolerance * 20 + 1e-6): V3 | null {
  // Touching pairs are replaced by the curve they touch along, where it is known.
  let allSurfaces = given;
  for (let i = 0; i < allSurfaces.length; i += 1) for (let j = i + 1; j < allSurfaces.length; j += 1) {
    const a = allSurfaces[i], b = allSurfaces[j];
    if (Math.abs(dot(surfaceNormal(a, p), surfaceNormal(b, p))) < Math.cos((5 * Math.PI) / 180)) continue;
    if (Math.abs(surfaceDistance(a, p)) > tolerance || Math.abs(surfaceDistance(b, p)) > tolerance) continue;
    const curve = touchingCurve(a, b, p);
    if (!curve) continue;
    maxMove = Math.max(maxMove, touchingSlide(a, b));
    allSurfaces = [...allSurfaces.filter((_, k) => k !== i && k !== j), ...curve];
    i = -1;
    break;
  }
  // Surfaces that touch here (a fillet running into a cylinder or a plane) meet in a band, not a line: keep only one
  // of each such pair, so the point moves across them, not along the band.
  const surfaces: AnalyticSurface[] = [];
  // Of two that touch, the flatter one stays: along a plane or a cylinder the point does not leave the other.
  const rank = { plane: 0, cylinder: 1, cone: 1, sphere: 2, torus: 3 } as const;
  const ordered = allSurfaces.slice().sort((a, b) => rank[a.kind] - rank[b.kind]);
  for (const s of ordered) {
    const n = surfaceNormal(s, p);
    if (surfaces.some((kept) => Math.abs(dot(surfaceNormal(kept, p), n)) > Math.cos((5 * Math.PI) / 180))) continue;
    surfaces.push(s);
  }
  if (onAll(p, allSurfaces, tolerance * 0.02)) return p;
  const solved = gaussNewtonOnto(p, surfaces);
  if (solved && onAll(solved, allSurfaces, tolerance) && norm(sub(solved, p)) <= maxMove) return solved;
  // Surfaces that touch (a fillet running into a plane or a cylinder) make the steps singular; projecting onto one
  // after the other still gets there.
  let x: V3 = [p[0], p[1], p[2]];
  for (let it = 0; it < 60; it += 1) {
    for (const s of surfaces) x = sub(x, scale(surfaceNormal(s, x), surfaceDistance(s, x)));
    if (onAll(x, surfaces, tolerance * 0.05)) break;
  }
  if (onAll(x, allSurfaces, tolerance) && norm(sub(x, p)) <= maxMove) return x;
  return null;
}

function onAll(x: V3, surfaces: AnalyticSurface[], tolerance: number) {
  return surfaces.every((s) => Math.abs(surfaceDistance(s, x)) <= tolerance * 0.5);
}

function gaussNewtonOnto(p: V3, surfaces: AnalyticSurface[]): V3 | null {
  let x: V3 = [p[0], p[1], p[2]];
  for (let it = 0; it < 40; it += 1) {
    const r = surfaces.map((s) => surfaceDistance(s, x));
    if (Math.max(...r.map(Math.abs)) < 1e-10) break;
    const J = surfaces.map((s) => surfaceNormal(s, x));
    // Minimum-norm step: x -= J^T (J J^T + eps I)^-1 r.
    const m = J.length;
    const A = J.map((ri, i) => J.map((rj, j) => dot(ri, rj) + (i === j ? 1e-12 : 0)));
    const y = solveSmall(A, r);
    if (!y) break;
    let step: V3 = [0, 0, 0];
    for (let i = 0; i < m; i += 1) step = add(step, scale(J[i], y[i]));
    x = sub(x, step);
  }
  return x.every(Number.isFinite) ? x : null;
}

function solveSmall(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const m = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c += 1) {
    let piv = c;
    for (let r = c + 1; r < n; r += 1) if (Math.abs(m[r][c]) > Math.abs(m[piv][c])) piv = r;
    if (Math.abs(m[piv][c]) < 1e-14) {
      // Dependent constraints (three planes through one line, a surface twice): drop this one.
      m[c] = m[c].map((_, k) => (k === c ? 1 : 0));
      continue;
    }
    [m[c], m[piv]] = [m[piv], m[c]];
    for (let r = 0; r < n; r += 1) {
      if (r === c) continue;
      const f = m[r][c] / m[c][c];
      for (let k = c; k <= n; k += 1) m[r][k] -= f * m[c][k];
    }
  }
  return m.map((row, i) => row[n] / row[i]);
}
