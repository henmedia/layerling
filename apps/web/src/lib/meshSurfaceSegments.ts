import {
  type AnalyticSurface,
  perpendicularFrame as perpendicularFrameOf,
  dot,
  fitCone,
  fitCylinder,
  fitPlane,
  fitSphere,
  fitTorus,
  maxDistance,
  norm,
  refine,
  sameSurface,
  scale,
  sub,
  surfaceNormal,
  unit,
  type V3,
  cross,
  add,
} from "@/lib/meshSurfaceFit";

/*
 * A closed triangle mesh cut into the faces it was made of: each face a plane, cylinder, cone, sphere or torus, or,
 * where nothing fits, a flat piece of one or a few triangles (a facet). The corners of a CAD program's STL lie on its
 * surfaces, so a face is grown triangle by triangle for as long as all corners stay within a small tolerance of one
 * fitted surface.
 *
 * First the flat faces: triangles that lie in one plane to float accuracy, gathered across edges where the triangles
 * are coplanar. A flat piece of one or two triangles with only shallow creases round it may be a strip of a finely
 * divided cylinder: it is let go again for the next step. Then the curved faces: from a seed, a small patch of its
 * neighbours is fitted with each kind in turn (cylinder before cone before sphere before torus: the simplest that
 * fits), and the face grows across shallow creases while the corners fit, refitted as it grows. What is left becomes
 * flat pieces. Last, neighbouring faces of the same surface are merged.
 */

export type WeldedMesh = { points: V3[]; triangles: [number, number, number][] };

export type MeshRegion = {
  id: number;
  surface: AnalyticSurface;
  triangles: number[];
  /** A flat piece of a curved or freeform area rather than a real flat face (its creases are all shallow). */
  facet: boolean;
};

export type MeshSegmentation = {
  mesh: WeldedMesh;
  regions: MeshRegion[];
  regionOfTriangle: Int32Array;
  /** Across each of a triangle's three edges (a-b, b-c, c-a): the triangle on the other side. */
  neighbors: Int32Array;
  normals: V3[];
  areas: number[];
  tolerance: number;
};

export type SegmentationOptions = {
  tolerance?: number;
  debug?: (message: string) => void;
  /** Stop looking for curved faces after this long (the rest become facets); default no limit. */
  budgetMs?: number;
};

/** Corners at the same place (to a tenth of a micrometre) become one point. */
export function weldMesh(positions: ArrayLike<number>, indices?: ArrayLike<number>): WeldedMesh {
  const keyToId = new Map<string, number>();
  const points: V3[] = [];
  const idOf = (corner: number) => {
    const p: V3 = [positions[corner * 3], positions[corner * 3 + 1], positions[corner * 3 + 2]];
    const key = `${Math.round(p[0] * 1e4)},${Math.round(p[1] * 1e4)},${Math.round(p[2] * 1e4)}`;
    let id = keyToId.get(key);
    if (id === undefined) {
      id = points.length;
      keyToId.set(key, id);
      points.push(p);
    }
    return id;
  };
  const count = indices ? indices.length : Math.floor(positions.length / 3);
  const triangles: [number, number, number][] = [];
  for (let k = 0; k + 2 < count; k += 3) {
    const a = idOf(indices ? indices[k] : k), b = idOf(indices ? indices[k + 1] : k + 1), c = idOf(indices ? indices[k + 2] : k + 2);
    if (a !== b && b !== c && a !== c) triangles.push([a, b, c]);
  }
  return { points, triangles };
}

/** Each triangle's neighbour across each of its edges, or null when an edge is not shared by exactly two. */
function adjacency(mesh: WeldedMesh): Int32Array | null {
  const V = mesh.points.length;
  const byEdge = new Map<number, number[]>();
  mesh.triangles.forEach((tri, t) => {
    for (let k = 0; k < 3; k += 1) {
      const a = tri[k], b = tri[(k + 1) % 3];
      const key = a < b ? a * V + b : b * V + a;
      const list = byEdge.get(key);
      if (list) list.push(t * 3 + k);
      else byEdge.set(key, [t * 3 + k]);
    }
  });
  const neighbors = new Int32Array(mesh.triangles.length * 3).fill(-1);
  for (const list of byEdge.values()) {
    if (list.length !== 2) return null;
    neighbors[list[0]] = Math.floor(list[1] / 3);
    neighbors[list[1]] = Math.floor(list[0] / 3);
  }
  return neighbors;
}

const DEG = Math.PI / 180;
/** Triangles this close in direction are coplanar: float noise on a flat face stays well below it. */
const COPLANAR_ANGLE = 0.1 * DEG;
/** Across a crease this sharp no curved face grows: a cylinder divided into fewer than about 8 is not one. */
const SMOOTH_ANGLE = 50 * DEG;
/** A triangle of a curved face faces this close to the surface's own normal at its middle. */
const NORMAL_SLACK = 35 * DEG;

/** How far a corner may lie off its surface, unless told otherwise: float accuracy of an STL of this size, at least 2 µm. */
export function defaultTolerance(diagonal: number) {
  return Math.max(0.002, diagonal * 1e-5);
}

/** The diagonal of a welded mesh's bounding box. */
export function meshDiagonal(mesh: WeldedMesh) {
  let lo: V3 = [Infinity, Infinity, Infinity], hi: V3 = [-Infinity, -Infinity, -Infinity];
  for (const p of mesh.points) {
    lo = [Math.min(lo[0], p[0]), Math.min(lo[1], p[1]), Math.min(lo[2], p[2])];
    hi = [Math.max(hi[0], p[0]), Math.max(hi[1], p[1]), Math.max(hi[2], p[2])];
  }
  return norm(sub(hi, lo));
}

export function segmentMesh(mesh: WeldedMesh, options: SegmentationOptions = {}): MeshSegmentation | null {
  const T = mesh.triangles.length;
  if (T < 4) return null;
  const neighbors = adjacency(mesh);
  if (!neighbors) return null;
  const P = mesh.points;
  const normals: V3[] = [];
  const areas: number[] = [];
  const centroids: V3[] = [];
  let lo: V3 = [Infinity, Infinity, Infinity], hi: V3 = [-Infinity, -Infinity, -Infinity];
  for (const p of P) {
    lo = [Math.min(lo[0], p[0]), Math.min(lo[1], p[1]), Math.min(lo[2], p[2])];
    hi = [Math.max(hi[0], p[0]), Math.max(hi[1], p[1]), Math.max(hi[2], p[2])];
  }
  const diagonal = norm(sub(hi, lo));
  const tolerance = options.tolerance ?? defaultTolerance(diagonal);
  for (const [a, b, c] of mesh.triangles) {
    const n = cross(sub(P[b], P[a]), sub(P[c], P[a]));
    areas.push(norm(n) / 2);
    normals.push(unit(n));
    centroids.push(scale(add(add(P[a], P[b]), P[c]), 1 / 3));
  }
  const totalArea = areas.reduce((sum, a) => sum + a, 0);
  /** The most a mesher lets a triangle stand off a curved surface it divides. */
  const chordLimit = Math.max(tolerance * 5, Math.min(0.5, diagonal * 0.004));
  const crease = (t: number, k: number) => {
    const o = neighbors[t * 3 + k];
    return Math.acos(Math.max(-1, Math.min(1, dot(normals[t], normals[o]))));
  };
  const regionOfTriangle = new Int32Array(T).fill(-1);
  const regions: MeshRegion[] = [];
  const cornersOf = (tris: Iterable<number>) => {
    const seen = new Set<number>();
    for (const t of tris) for (const v of mesh.triangles[t]) seen.add(v);
    return [...seen].map((v) => P[v]);
  };

  // 1. Flat faces: grown across coplanar edges, every corner within the tolerance of the plane fitted so far.
  const growPlane = (seed: number, free: (t: number) => boolean, angle: number) => {
    const tris = [seed];
    const inRegion = new Set([seed]);
    let plane = fitPlane(cornersOf(tris));
    let fittedAt = 1;
    for (let i = 0; i < tris.length; i += 1) {
      const t = tris[i];
      for (let k = 0; k < 3; k += 1) {
        const o = neighbors[t * 3 + k];
        if (inRegion.has(o) || !free(o) || crease(t, k) > angle) continue;
        if (Math.abs(dot(normals[o], plane.normal)) < Math.cos(Math.max(angle, COPLANAR_ANGLE) * 2)) continue;
        if (maxDistance(plane, mesh.triangles[o].map((v) => P[v])) > tolerance) continue;
        inRegion.add(o);
        tris.push(o);
        if (tris.length > fittedAt * 1.5 + 2) {
          const refit = fitPlane(cornersOf(tris));
          if (maxDistance(refit, cornersOf(tris)) <= tolerance) plane = refit;
          fittedAt = tris.length;
        }
      }
    }
    return { tris, plane };
  };
  const addRegion = (surface: AnalyticSurface, tris: number[], facet: boolean) => {
    const id = regions.length;
    regions.push({ id, surface, triangles: tris, facet });
    for (const t of tris) regionOfTriangle[t] = id;
    return id;
  };
  const byArea = [...Array(T).keys()].sort((a, b) => areas[b] - areas[a]);
  const tentative = new Set<number>();
  for (const seed of byArea) {
    if (regionOfTriangle[seed] >= 0) continue;
    const { tris, plane } = growPlane(seed, (t) => regionOfTriangle[t] < 0, COPLANAR_ANGLE);
    const id = addRegion(plane, tris, false);
    // A strip of a divided curve: most of its outline runs along shallow creases (a cylinder's strip may still end at
    // a sharp edge, the rim of a hole). Let go for the curved faces; what none of them takes comes back flat.
    let shallow = 0, perimeter = 0;
    for (const t of tris) for (let k = 0; k < 3; k += 1) {
      const o = neighbors[t * 3 + k];
      if (regionOfTriangle[o] === id) continue;
      const tri = mesh.triangles[t];
      const length = norm(sub(P[tri[k]], P[tri[(k + 1) % 3]]));
      perimeter += length;
      const angle = crease(t, k);
      if (angle > COPLANAR_ANGLE && angle < SMOOTH_ANGLE) shallow += length;
    }
    if (shallow >= perimeter * 0.3) tentative.add(id);
  }
  // Which flat piece each triangle lay in: a curved face must not be mostly one of them (a flat face between two
  // fillets fits a huge sphere through its corners).
  const pieceOf = Int32Array.from(regionOfTriangle);
  for (const id of tentative) for (const t of regions[id].triangles) regionOfTriangle[t] = -1;

  // 2. Curved faces from the triangles not taken.
  const isFree = (t: number) => regionOfTriangle[t] < 0;
  /**
   * The seed and its neighbours, taken across the longest shared edges first: a cylinder's strips share their long
   * sides with each other and only their short ends with the next face, so the patch runs round the cylinder before it
   * spills over its ends.
   */
  const patchAround = (seed: number, size: number, alongLongEdges = true) => {
    if (!alongLongEdges) return breadthPatch(seed, size);
    const tris = [seed];
    const seen = new Set([seed]);
    const frontier: { t: number; length: number }[] = [];
    const offer = (t: number) => {
      const tri = mesh.triangles[t];
      for (let k = 0; k < 3; k += 1) {
        const o = neighbors[t * 3 + k];
        if (seen.has(o) || !isFree(o) || crease(t, k) > SMOOTH_ANGLE) continue;
        frontier.push({ t: o, length: norm(sub(P[tri[k]], P[tri[(k + 1) % 3]])) });
      }
    };
    offer(seed);
    while (tris.length < size && frontier.length > 0) {
      let best = 0;
      for (let i = 1; i < frontier.length; i += 1) if (frontier[i].length > frontier[best].length) best = i;
      const { t } = frontier[best];
      frontier.splice(best, 1);
      if (seen.has(t)) continue;
      seen.add(t);
      tris.push(t);
      offer(t);
    }
    return tris;
  };
  /** The seed and its neighbours ring by ring: round, but it reaches the next face at a strip's end. */
  const breadthPatch = (seed: number, size: number) => {
    const tris = [seed];
    const seen = new Set([seed]);
    for (let i = 0; i < tris.length && tris.length < size; i += 1) {
      const t = tris[i];
      for (let k = 0; k < 3 && tris.length < size; k += 1) {
        const o = neighbors[t * 3 + k];
        if (seen.has(o) || !isFree(o) || crease(t, k) > SMOOTH_ANGLE) continue;
        seen.add(o);
        tris.push(o);
      }
    }
    return tris;
  };
  /** The corners of these triangles and, for each, the area-weighted normal of the triangles among them. */
  const cornersWithNormals = (tris: number[]) => {
    const sum = new Map<number, V3>();
    for (const t of tris) for (const v of mesh.triangles[t]) {
      const s = sum.get(v) ?? [0, 0, 0];
      sum.set(v, add(s, scale(normals[t], areas[t])));
    }
    const ids = [...sum.keys()];
    return { ids, points: ids.map((v) => P[v]), normals: ids.map((v) => unit(sum.get(v)!)) };
  };
  const facesTheSurface = (s: AnalyticSurface, t: number, sign: number) => {
    const n = surfaceNormal(s, centroids[t]);
    return sign * dot(n, normals[t]) >= Math.cos(NORMAL_SLACK);
  };
  const KINDS = ["cylinder", "cone", "sphere", "torus"] as const;
  const fitKind = (kind: (typeof KINDS)[number], tris: number[]): AnalyticSurface | null => {
    const { points, normals: vn } = cornersWithNormals(tris);
    if (points.length < 6) return null;
    // A closed-form fit far off is not refined: on a freeform patch most kinds are, and refining them all is slow.
    const fit = { gate: Math.max(tolerance * 50, diagonal * 2e-3), iterations: 15 };
    try {
      if (kind === "cylinder") return fitCylinder(points, vn, fit);
      if (kind === "cone") return fitCone(points, vn, fit);
      if (kind === "sphere") return fitSphere(points, fit);
      return fitTorus(points, vn, fit);
    } catch {
      return null;
    }
  };
  const mostlyOnePiece = (tris: number[]) => {
    const byPiece = new Map<number, number>();
    let total = 0;
    for (const t of tris) {
      total += areas[t];
      byPiece.set(pieceOf[t], (byPiece.get(pieceOf[t]) ?? 0) + areas[t]);
    }
    if (byPiece.size < 2) return true;
    return Math.max(...byPiece.values()) > total * 0.6;
  };
  const worstOff = (s: AnalyticSurface, t: number) => Math.max(...mesh.triangles[t].map((v) => Math.abs(distanceTo(s, P[v]))));
  /**
   * How far a triangle's edge midpoints and middle stand off the surface. A mesher keeps that small (its chord
   * tolerance); a wrong surface through the right corners does not: a cylinder's band of two rings of corners lies on
   * a sphere too, but the middle of its long upright edge is then far inside the sphere.
   */
  const chordOff = (s: AnalyticSurface, t: number) => {
    const [a, b, c] = mesh.triangles[t].map((v) => P[v]);
    let worst = Math.abs(distanceTo(s, centroids[t]));
    for (const [p, q] of [[a, b], [b, c], [c, a]] as const) worst = Math.max(worst, Math.abs(distanceTo(s, scale(add(p, q), 0.5))));
    return worst;
  };
  /**
   * The kind that fits the patch round the seed best. A patch at the end of a strip takes in a triangle or two of the
   * next face; those are trimmed away (the worst quarter at a time) as long as the seed and enough stay. Of the kinds
   * that fit the corners, the one whose chords stand off least wins, the simpler one when they are about even.
   */
  type Candidate = { surface: AnalyticSurface; sign: number; tris: number[]; chord: number };
  const fitCurved = (seed: number, patch: number[]): Candidate[] => {
    const found: Candidate[] = [];
    const { points } = cornersWithNormals(patch);
    if (points.length < 6) return found;
    if (maxDistance(fitPlane(points), points) <= tolerance) return found;
    for (const kind of KINDS) {
      let tris = patch;
      for (let round = 0; round < 4 && tris.length >= 3; round += 1) {
        const s = fitKind(kind, tris);
        if (!s || !surfaceIsSane(s, diagonal)) break;
        const off = tris.map((t) => worstOff(s, t));
        if (off.every((d) => d <= tolerance)) {
          const sign = Math.sign(tris.reduce((sum, t) => sum + dot(surfaceNormal(s, centroids[t]), normals[t]) * areas[t], 0)) || 1;
          const chord = Math.max(...tris.map((t) => chordOff(s, t)));
          if (chord <= chordLimit && tris.every((t) => facesTheSurface(s, t, sign)) && cornersWithNormals(tris).points.length >= 6 && !mostlyOnePiece(tris)) {
            found.push({ surface: s, sign, tris, chord });
          }
          break;
        }
        const order = tris.map((t, i) => ({ t, d: off[i] })).sort((a, b) => a.d - b.d);
        const keep = order.slice(0, Math.max(3, Math.ceil(order.length * 0.75))).map((e) => e.t);
        if (!keep.includes(seed)) break;
        tris = keep;
      }
    }
    return found;
  };
  const growCurved = (seedTris: number[], start: { surface: AnalyticSurface; sign: number }, limit = Infinity) => {
    let { surface } = start;
    const { sign } = start;
    const tris = seedTris.slice();
    const inRegion = new Set(tris);
    let fittedAt = tris.length;
    const fits = (t: number) => mesh.triangles[t].every((v) => Math.abs(distanceTo(surface, P[v])) <= tolerance) && facesTheSurface(surface, t, sign) && chordOff(surface, t) <= chordLimit;
    const refit = () => {
      const corners = cornersOf(tris);
      try {
        const better = refine(surface, corners, 15);
        if (maxDistance(better, corners) <= Math.max(tolerance, maxDistance(surface, corners))) surface = better;
      } catch {
        // keep the surface fitted so far
      }
      fittedAt = tris.length;
    };
    for (let round = 0; round < 200; round += 1) {
      const rejected = new Set<number>();
      for (let i = 0; i < tris.length; i += 1) {
        const t = tris[i];
        for (let k = 0; k < 3; k += 1) {
          const o = neighbors[t * 3 + k];
          if (inRegion.has(o) || !isFree(o) || crease(t, k) > SMOOTH_ANGLE) continue;
          if (tris.length >= limit) return { tris, surface };
          if (!fits(o)) { rejected.add(o); continue; }
          inRegion.add(o);
          tris.push(o);
          if (tris.length > fittedAt * 1.5 + 4) refit();
        }
      }
      // A surface fitted to a small patch can be a hair off further away: fit to all of it once more and try again.
      if (rejected.size === 0 || fittedAt === tris.length) break;
      refit();
      if (![...rejected].some((t) => fits(t))) break;
    }
    return { tris, surface };
  };
  const spanOf = (angles: number[]) => {
    const sorted = angles.slice().sort((x, y) => x - y);
    let gap = sorted[0] + 2 * Math.PI - sorted[sorted.length - 1];
    for (let i = 1; i < sorted.length; i += 1) gap = Math.max(gap, sorted[i] - sorted[i - 1]);
    return 2 * Math.PI - gap;
  };
  const bendsEnough = (given: AnalyticSurface, tris: number[]) => {
    const pts = cornersOf(tris);
    // Judged on the surface fitted to all its corners, not the one it grew from.
    let s = given;
    try {
      const refined = refine(given, pts, 20);
      if (maxDistance(refined, pts) <= maxDistance(given, pts)) s = refined;
    } catch {
      s = given;
    }
    const area = tris.reduce((sum, t) => sum + areas[t], 0);
    if (area < totalArea * 2e-4) return null;
    if (s.kind === "torus" && s.major < s.minor * 1.05) return null;
    // Cylinders rarely fit where they should not, tori and spheres on any small piece of a freeform surface.
    const MIN = s.kind === "cylinder" ? 3 * DEG : s.kind === "cone" ? 8 * DEG : 12 * DEG;
    if (s.kind === "sphere") {
      const dirs = pts.map((p) => unit(sub(p, s.center)));
      const mean = unit(dirs.reduce((m, d) => add(m, d), [0, 0, 0] as V3));
      return Math.max(...dirs.map((d) => Math.acos(Math.max(-1, Math.min(1, dot(d, mean)))))) >= MIN / 2 ? s : null;
    }
    if (s.kind === "plane") return s;
    const origin = s.kind === "cone" ? s.apex : s.kind === "cylinder" ? s.origin : s.center;
    const [u, v] = perpendicularFrameOf(s.axis);
    const theta = pts.map((p) => { const d = sub(p, origin); return Math.atan2(dot(d, v), dot(d, u)); });
    if (spanOf(theta) < MIN) return null;
    if (s.kind === "torus") {
      const phi = pts.map((p) => {
        const d = sub(p, s.center);
        const h = dot(d, s.axis);
        return Math.atan2(h, norm(sub(d, scale(s.axis, h))) - s.major);
      });
      if (spanOf(phi) < MIN) return null;
    }
    return s;
  };
  const attempted = new Set<number>();
  const remaining = [...Array(T).keys()].filter(isFree).sort((a, b) => interiorScore(b) - interiorScore(a));
  function interiorScore(t: number) {
    let score = 0;
    for (let k = 0; k < 3; k += 1) if (crease(t, k) < SMOOTH_ANGLE) score += 1;
    return score * 1e6 + areas[t];
  }
  const startedAt = Date.now();
  for (const seed of remaining) {
    if (options.budgetMs !== undefined && Date.now() - startedAt > options.budgetMs) break;
    if (!isFree(seed)) continue;
    if (attempted.has(seed)) continue;
    // Every kind that fits a patch round the seed (two patch shapes, two sizes) grows a little on trial; the one that
    // gets furthest is the face. A wrong kind that fits a narrow band (a cone on a ring of a sphere, a cylinder on a
    // ring of a torus) stops at the band's edge, the right one goes on.
    const candidates: Candidate[] = [];
    for (const size of [24, 10]) {
      for (const alongLongEdges of [true, false]) {
        const patch = patchAround(seed, size, alongLongEdges);
        if (patch.length >= 3) candidates.push(...fitCurved(seed, patch));
      }
      // The smaller patches only where the larger ones found nothing (a narrow face between two others).
      if (candidates.length > 0) break;
    }
    // One of each kind (the one standing off least): the same cylinder found from four patches is one trial.
    const byKind = new Map<string, Candidate>();
    for (const c of candidates) {
      const kept = byKind.get(c.surface.kind);
      if (!kept || c.chord < kept.chord || (c.chord === kept.chord && c.tris.length > kept.tris.length)) byKind.set(c.surface.kind, c);
    }
    candidates.length = 0;
    candidates.push(...byKind.values());
    if (candidates.length === 0) {
      // Nothing fits here: do not seed again from the triangles right round it.
      for (const t of breadthPatch(seed, 6)) attempted.add(t);
      continue;
    }
    // Those that reach the trial's limit try again with more room, until one of them stops before the others.
    let contenders = candidates.map((candidate) => ({ candidate, area: 0, full: true }));
    for (let limit = 300; contenders.length > 1 && contenders.some((c) => c.full); limit *= 4) {
      for (const c of contenders) {
        if (!c.full) continue;
        const trial = growCurved(c.candidate.tris, c.candidate, limit);
        c.area = trial.tris.reduce((sum, t) => sum + areas[t], 0);
        c.full = trial.tris.length >= limit;
      }
      const top = Math.max(...contenders.map((c) => c.area));
      contenders = contenders.filter((c) => c.area >= top * 0.95);
      if (limit > T) break;
    }
    contenders.sort((a, b) => a.candidate.chord - b.candidate.chord);
    const found = contenders[0].candidate;
    const grown = growCurved(found.tris, found);
    // A curved face needs a few triangles and must really bend: round its axis (and round a torus's tube) at least a
    // little, a sphere over a small cap. A wrong surface that fits a small patch of a freeform one does not.
    if (grown.tris.length < 4) continue;
    const accepted = bendsEnough(grown.surface, grown.tris);
    if (!accepted) continue;
    addRegion(accepted, grown.tris, false);
  }

  // 3. What is left: flat pieces, a triangle or a few coplanar ones each.
  for (const seed of byArea) {
    if (!isFree(seed)) continue;
    const { tris, plane } = growPlane(seed, isFree, COPLANAR_ANGLE);
    // A facet of a freeform area: one or two small triangles with only shallow creases round them.
    let sharp = false;
    for (const t of tris) for (let k = 0; k < 3; k += 1) {
      const o = neighbors[t * 3 + k];
      if (!tris.includes(o) && crease(t, k) > SMOOTH_ANGLE) sharp = true;
    }
    const area = tris.reduce((sum, t) => sum + areas[t], 0);
    addRegion(plane, tris, !sharp && tris.length <= 2 && area < totalArea * 0.005);
  }
  // The tentative flat pieces that no curved face took are back above; drop the emptied ones.
  const live = regions.filter((r) => r.triangles.some((t) => regionOfTriangle[t] === r.id));
  for (const r of live) r.triangles = r.triangles.filter((t) => regionOfTriangle[t] === r.id);

  // 4. Neighbouring faces of one surface become one.
  const parent = new Map<number, number>(live.map((r) => [r.id, r.id]));
  const find = (x: number): number => {
    const p = parent.get(x)!;
    if (p === x) return x;
    const root = find(p);
    parent.set(x, root);
    return root;
  };
  const byId = new Map(live.map((r) => [r.id, r]));
  const pointsOf = new Map(live.map((r) => [r.id, cornersOf(r.triangles)]));
  for (const r of live) {
    if (r.facet) continue;
    for (const t of r.triangles) for (let k = 0; k < 3; k += 1) {
      const other = regionOfTriangle[neighbors[t * 3 + k]];
      if (other === r.id) continue;
      const a = find(r.id), b = find(other);
      if (a === b) continue;
      const ra = byId.get(a)!, rb = byId.get(b)!;
      if (ra.facet || rb.facet) continue;
      let joined: AnalyticSurface | null = null;
      if (sameSurface(ra.surface, rb.surface, pointsOf.get(a)!, pointsOf.get(b)!, tolerance)) joined = ra.surface;
      else if (ra.surface.kind === rb.surface.kind && ra.surface.kind !== "plane") {
        // Two pieces of one surface, each fitted on its own a hair apart: fit both at once.
        const both = pointsOf.get(a)!.concat(pointsOf.get(b)!);
        try {
          const refit = refine(ra.triangles.length >= rb.triangles.length ? ra.surface : rb.surface, both, 20);
          if (maxDistance(refit, both) <= tolerance) joined = refit;
        } catch {
          joined = null;
        }
      }
      if (joined) {
        ra.surface = joined;
        parent.set(b, a);
        ra.triangles = ra.triangles.concat(rb.triangles);
        pointsOf.set(a, pointsOf.get(a)!.concat(pointsOf.get(b)!));
      }
    }
  }
  const merged: MeshRegion[] = [];
  const newId = new Map<number, number>();
  for (const r of live) {
    if (find(r.id) !== r.id) continue;
    newId.set(r.id, merged.length);
    merged.push({ ...r, id: merged.length });
  }
  for (let t = 0; t < T; t += 1) regionOfTriangle[t] = newId.get(find(regionOfTriangle[t]))!;
  for (const r of merged) r.triangles = [];
  for (let t = 0; t < T; t += 1) merged[regionOfTriangle[t]].triangles.push(t);

  // 5. A small piece that lies on its bigger neighbour's surface (a few triangles a wrong seed took first, a facet at
  // the edge of a curved face) goes to the neighbour.
  const regionArea = (r: MeshRegion) => r.triangles.reduce((sum, t) => sum + areas[t], 0);
  const bySize = merged.slice().sort((a, b) => regionArea(a) - regionArea(b));
  for (const small of bySize) {
    if (small.triangles.length === 0) continue;
    const smallArea = regionArea(small);
    const touching = new Set<number>();
    for (const t of small.triangles) for (let k = 0; k < 3; k += 1) {
      const other = regionOfTriangle[neighbors[t * 3 + k]];
      if (other !== small.id && crease(t, k) < SMOOTH_ANGLE) touching.add(other);
    }
    for (const id of touching) {
      const big = merged[id];
      if (big.surface.kind === "plane" || regionArea(big) < smallArea * 3) continue;
      const sign = Math.sign(big.triangles.reduce((sum, t) => sum + dot(surfaceNormal(big.surface, centroids[t]), normals[t]) * areas[t], 0)) || 1;
      const fitsBig = small.triangles.every((t) => mesh.triangles[t].every((v) => Math.abs(distanceTo(big.surface, P[v])) <= tolerance) && facesTheSurface(big.surface, t, sign) && chordOff(big.surface, t) <= chordLimit);
      if (!fitsBig) continue;
      for (const t of small.triangles) regionOfTriangle[t] = big.id;
      big.triangles = big.triangles.concat(small.triangles);
      small.triangles = [];
      break;
    }
  }
  const kept = merged.filter((r) => r.triangles.length > 0);
  const renumber = new Map(kept.map((r, i) => [r.id, i]));
  kept.forEach((r, i) => { r.id = i; });
  for (let t = 0; t < T; t += 1) regionOfTriangle[t] = renumber.get(regionOfTriangle[t])!;
  return { mesh, regions: kept, regionOfTriangle, neighbors, normals, areas, tolerance };
}

function distanceTo(s: AnalyticSurface, p: V3) {
  return maxDistance(s, [p]);
}

/** A fitted surface that is no use as a face: a radius many times the part, a cone almost flat or almost a cylinder. */
function surfaceIsSane(s: AnalyticSurface, diagonal: number) {
  switch (s.kind) {
    case "plane": return true;
    case "cylinder": return s.radius > 1e-3 && s.radius < diagonal * 50;
    case "sphere": return s.radius > 1e-3 && s.radius < diagonal * 50;
    case "cone": return s.halfAngle > 0.5 * DEG && s.halfAngle < 89.5 * DEG;
    case "torus": return s.minor > 1e-3 && s.major > 1e-4 && s.minor < diagonal * 50 && s.major < diagonal * 50;
  }
}

export type SegmentationSummary = { plane: number; cylinder: number; cone: number; sphere: number; torus: number; facets: number; facetArea: number; area: number };

export function summarizeSegmentation(seg: MeshSegmentation): SegmentationSummary {
  const out: SegmentationSummary = { plane: 0, cylinder: 0, cone: 0, sphere: 0, torus: 0, facets: 0, facetArea: 0, area: 0 };
  for (const r of seg.regions) {
    const area = r.triangles.reduce((s, t) => s + seg.areas[t], 0);
    out.area += area;
    if (r.facet) { out.facets += 1; out.facetArea += area; continue; }
    out[r.surface.kind] += 1;
  }
  return out;
}

/**
 * How much of the surface is in doubt, 0 to 1: the facets, flat pieces of one triangle, and small curved pieces that
 * turn by less than a quarter round their axis. A CAD part has its area in a few large faces and in bores and fillets
 * that run all the way round or along an edge; on a free-form surface (a figure, a sculpted or lofted shape) the
 * fitting finds only small patches here and there, each of some surface or other, and that is what this measures.
 * A perforated plate's hundred small bores each go all the way round and are not in doubt.
 */
export function freeformShare(seg: MeshSegmentation): number {
  let total = 0;
  let doubtful = 0;
  const regionAreas = seg.regions.map((r) => r.triangles.reduce((s, t) => s + seg.areas[t], 0));
  for (const area of regionAreas) total += area;
  if (total <= 0) return 1;
  seg.regions.forEach((r, index) => {
    const area = regionAreas[index];
    if (r.facet) {
      doubtful += area;
      return;
    }
    const s = r.surface;
    if (s.kind === "plane") {
      if (r.triangles.length === 1) doubtful += area;
      return;
    }
    if (area >= total * 0.01) return;
    if (s.kind === "sphere") {
      doubtful += area;
      return;
    }
    const origin = s.kind === "cone" ? s.apex : s.kind === "cylinder" ? s.origin : s.center;
    const [u, v] = perpendicularFrameOf(s.axis);
    const angles: number[] = [];
    for (const t of r.triangles) {
      for (const corner of seg.mesh.triangles[t]) {
        const d = sub(seg.mesh.points[corner], origin);
        angles.push(Math.atan2(dot(d, v), dot(d, u)));
      }
    }
    angles.sort((x, y) => x - y);
    let gap = angles[0] + 2 * Math.PI - angles[angles.length - 1];
    for (let i = 1; i < angles.length; i += 1) gap = Math.max(gap, angles[i] - angles[i - 1]);
    if (2 * Math.PI - gap < Math.PI / 2) doubtful += area;
  });
  return doubtful / total;
}
