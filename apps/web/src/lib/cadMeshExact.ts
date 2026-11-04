import type { OcctKernel, ShapeHandle } from "occt-wasm";
import {
  type AnalyticSurface,
  add,
  cross,
  dot,
  fitCircle3D,
  norm,
  perpendicularFrame,
  scale,
  sub,
  unit,
  type V3,
} from "@/lib/meshSurfaceFit";
import { defaultTolerance, freeformShare, meshDiagonal, type MeshSegmentation, segmentMesh, summarizeSegmentation, type SegmentationSummary, weldMesh } from "@/lib/meshSurfaceSegments";
import { angleRound, buildTopology, type ForcedCuts, type MeshTopology, type Piece, solveOnto } from "@/lib/meshSurfaceTopology";
import { EXACT_MESH_FREEFORM_MESSAGE } from "@/lib/cadMeshExactMessages";

export { EXACT_MESH_FAILED_MESSAGE, EXACT_MESH_FREEFORM_MESSAGE, exactMeshFreeformShare } from "@/lib/cadMeshExactMessages";

/*
 * A triangle mesh rebuilt as an exact solid: its planes, cylinders, cones, spheres and tori as real faces, the edges
 * between them as lines, circular arcs or, where two surfaces meet in a curve of their own, a spline through the
 * meeting points. What fits no surface stays flat facets, one per triangle or per few coplanar ones. Then a fillet or
 * a chamfer has one round edge to follow instead of a hundred short ones, and a STEP file carries the real cylinder.
 *
 * Each face is built on its surface (a primitive turned so its seam lies behind the piece), bounded by the edges of
 * its outline; the faces are sewn into a shell, the shell made a solid, and the pieces of one surface joined. The
 * result is only taken when it is a valid closed solid of the mesh's volume; a face that cannot be built has its
 * surface given up for facets and the whole is tried again.
 */

export type ExactMeshReport = SegmentationSummary & {
  /** Faces of the finished solid, after the pieces of one surface were joined. */
  faces: number;
  triangles: number;
};

export type ExactMeshResult = { solid: ShapeHandle; report: ExactMeshReport };

type Vec = { x: number; y: number; z: number };
const vec = (p: V3): Vec => ({ x: p[0], y: p[1], z: p[2] });

export type ExactMeshOptions = {
  tolerance?: number;
  /** Give up when the mesh has more triangles than this (default 200 000). */
  maxTriangles?: number;
  /** Told why a step failed, for tests. */
  debug?: (message: string) => void;
  /** Stop looking for curved faces after this long; what is left becomes facets. */
  budgetMs?: number;
  /**
   * Throw EXACT_MESH_FREEFORM_MESSAGE instead of building a mesh that is mostly free-form (more than half its surface
   * fits no plane, cylinder, cone, sphere or torus): its solid would be the mesh's triangles over again, one face each.
   */
  refuseFreeform?: boolean;
};


export function exactSolidFromMesh(cad: OcctKernel, positions: ArrayLike<number>, indices?: ArrayLike<number>, options: ExactMeshOptions = {}): ExactMeshResult | null {
  // Every primitive, edge and face made on the way is let go at the end; only the solid is kept, as a fresh copy.
  const mark = cad.checkpoint();
  let brep: string | null = null;
  let report: ExactMeshReport | null = null;
  try {
    const result = rebuild(cad, positions, indices, options);
    if (result) {
      brep = cad.toBREP(result.solid);
      report = result.report;
    }
  } finally {
    cad.releaseSince(mark);
  }
  return brep && report ? { solid: cad.fromBREP(brep), report } : null;
}

function rebuild(cad: OcctKernel, positions: ArrayLike<number>, indices: ArrayLike<number> | undefined, options: ExactMeshOptions): ExactMeshResult | null {
  const welded = weldMesh(positions, indices);
  if (welded.triangles.length > (options.maxTriangles ?? 200_000)) return null;
  const found = bestSegmentation(welded, options);
  if (!found) return null;
  let seg = found.seg;
  const meshVolume = signedVolume(seg);
  const meshArea = seg.areas.reduce((s, a) => s + a, 0);
  // Mostly freeform (a figure, a sculpted shape): no surfaces to find, and thousands of facets are what the mesh is
  // already. One try for what there is; no second.
  const doubtful = found.doubtful;
  const freeform = doubtful > 0.5;
  if (freeform && options.refuseFreeform) {
    throw new Error(`${EXACT_MESH_FREEFORM_MESSAGE} (${Math.floor(100 * (1 - doubtful))} %)`);
  }
  for (let attempt = 0; attempt < (freeform ? 1 : 4); attempt += 1) {
    // A curved face with a hole in it (a bore crossing another) cannot be built in one: cut it through each hole.
    const forced: ForcedCuts = new Map();
    let topology = buildTopology(seg, forced);
    for (let round = 0; topology && round < 3; round += 1) {
      let added = false;
      const loopsOf = new Map<number, number>();
      for (const loop of topology.loops) loopsOf.set(loop.piece, (loopsOf.get(loop.piece) ?? 0) + 1);
      for (const piece of topology.pieces) {
        if ((loopsOf.get(piece.id) ?? 0) < 2 || piece.facet) continue;
        const s = piece.surface;
        if (s.kind !== "cylinder" && s.kind !== "cone" && s.kind !== "torus") continue;
        const origin = s.kind === "cone" ? s.apex : s.kind === "cylinder" ? s.origin : s.center;
        const loops = topology.loops.filter((l) => l.piece === piece.id).map((l) => ({ l, area: loopArea(topology!, piece, l.parts) }));
        loops.sort((x, y) => y.area - x.area);
        for (const { l } of loops.slice(1)) {
          const pts = l.parts.flatMap((part) => topology!.chainPoints.get(part.chain)!);
          const mean = scale(pts.reduce((m, p) => add(m, p), [0, 0, 0] as V3), 1 / pts.length);
          const list = forced.get(piece.region) ?? [];
          list.push(angleRound(origin, s.axis, mean));
          forced.set(piece.region, list);
          added = true;
        }
      }
      if (!added) break;
      options.debug?.(`forced cuts ${[...forced].map(([r, a]) => `${r}: ${a.map((x) => x.toFixed(2)).join(",")}`).join("; ")}`);
      topology = buildTopology(seg, forced);
    }
    if (!topology) return null;
    const built = buildSolid(cad, seg, topology, meshVolume, meshArea, options.debug);
    if (built.solid) {
      const summary = summarizeSegmentation(seg);
      return { solid: built.solid, report: { ...summary, faces: cad.subShapeCount(built.solid, "face"), triangles: welded.triangles.length } };
    }
    if (freeform) return null;
    // Nothing in particular failed, but the whole did not close: last, every curved face given up for facets.
    const failed = built.failedRegions.size > 0 ? built.failedRegions : new Set(seg.regions.filter((r) => !r.facet && r.surface.kind !== "plane").map((r) => r.id));
    if (failed.size === 0) return null;
    options.debug?.(`demoting regions ${[...failed].join(",")}`);
    seg = demote(seg, failed);
  }
  return null;
}

/** The looser tolerances tried when the first leaves faces in doubt, as multiples of it. */
const LOOSER_TOLERANCES = [4, 16];

/**
 * The mesh cut into its faces at the tightest tolerance that finds them. A CAD program's STL has its corners on the
 * surfaces to float accuracy, and the first try finds every face. A mesh divided again after it was exported (a
 * remesher, a repair, a boolean that split its long triangles) has corners on the straight chords between the old
 * ones, a few µm off a cylinder: the tight tolerance breaks its cylinders into hundreds of strips, a looser one finds
 * them whole. Looser is only taken when it is stable: the real faces of a part come out alike at four and at sixteen
 * times the tolerance, while on a free-form surface every tolerance fits other patches. A given tolerance is
 * taken as it is. Each try has a third of the time.
 */
function bestSegmentation(welded: ReturnType<typeof weldMesh>, options: ExactMeshOptions) {
  const base = options.tolerance ?? defaultTolerance(meshDiagonal(welded));
  const share = options.budgetMs === undefined ? undefined : options.budgetMs / (options.tolerance === undefined ? 1 + LOOSER_TOLERANCES.length : 1);
  const tryAt = (tolerance: number) => {
    const seg = segmentMesh(welded, { tolerance, debug: options.debug, budgetMs: share });
    if (!seg) return null;
    const doubtful = freeformShare(seg);
    options.debug?.(`tolerance ${tolerance.toFixed(4)}: ${(doubtful * 100).toFixed(1)} % in doubt, ${seg.regions.length} regions`);
    return { seg, doubtful };
  };
  // Not closed, or not manifold: no tolerance mends that.
  const first = tryAt(base);
  if (!first || first.doubtful <= 0.01 || options.tolerance !== undefined) return first;
  const looser = LOOSER_TOLERANCES.map((step) => tryAt(base * step));
  const [near, far] = looser;
  if (!near || !far) return first;
  // Stable: as many faces, give or take a tenth (a cylinder may come out as a cone of a fraction of a degree), and as
  // much left in doubt.
  const faces = (seg: MeshSegmentation) => seg.regions.filter((r) => !r.facet).length;
  const stable = Math.abs(faces(near.seg) - faces(far.seg)) <= Math.max(1, faces(near.seg) * 0.1) && Math.abs(near.doubtful - far.doubtful) <= 0.01;
  return stable && near.doubtful < first.doubtful - 0.005 ? near : first;
}

/** The mesh's volume by the divergence theorem (positive for an outward-facing mesh). */
function signedVolume(seg: MeshSegmentation) {
  const P = seg.mesh.points;
  let v = 0;
  for (const [a, b, c] of seg.mesh.triangles) v += dot(P[a], cross(P[b], P[c])) / 6;
  return v;
}

/** These regions' triangles become facets, one flat piece each. */
function demote(seg: MeshSegmentation, regions: Set<number>): MeshSegmentation {
  const P = seg.mesh.points;
  const out = seg.regions.filter((r) => !regions.has(r.id)).map((r) => ({ ...r, triangles: r.triangles.slice() }));
  for (const id of regions) {
    for (const t of seg.regions[id].triangles) {
      const n = seg.normals[t];
      out.push({ id: -1, surface: { kind: "plane", normal: n, offset: dot(n, P[seg.mesh.triangles[t][0]]) }, triangles: [t], facet: true });
    }
  }
  out.forEach((r, i) => { r.id = i; });
  const regionOfTriangle = new Int32Array(seg.mesh.triangles.length);
  for (const r of out) for (const t of r.triangles) regionOfTriangle[t] = r.id;
  return { ...seg, regions: out, regionOfTriangle };
}

type Built = { solid: ShapeHandle | null; failedRegions: Set<number> };

function buildSolid(cad: OcctKernel, seg: MeshSegmentation, topo: MeshTopology, meshVolume: number, meshArea: number, debug?: (message: string) => void): Built {
  const failedRegions = new Set<number>();
  const tolerance = seg.tolerance;
  debugChains = debug;
  const edgesOf = new Map<number, ShapeHandle[]>();
  const edgeFailed = new Set<number>();
  for (const chain of topo.chains) {
    try {
      const made = chainEdges(cad, topo, chain.id, tolerance);
      edgesOf.set(chain.id, made);
      debug?.(`chain ${chain.id} ${topo.pieces[chain.left].surface.kind}${chain.left}/${topo.pieces[chain.right].surface.kind}${chain.right}${chain.closed ? " closed" : ""}${chain.cut ? " cut" : ""}: ${made.map((e) => cad.curveType(e)).join(",")} pts ${topo.chainPoints.get(chain.id)!.length}`);
    } catch (error) {
      debug?.(`chain ${chain.id} (${topo.pieces[chain.left].surface.kind}/${topo.pieces[chain.right].surface.kind}): ${String(error)}`);
      edgeFailed.add(chain.id);
      const a = topo.pieces[chain.left], b = topo.pieces[chain.right];
      if (!a.facet && a.surface.kind !== "plane") failedRegions.add(a.region);
      else if (!b.facet && b.surface.kind !== "plane") failedRegions.add(b.region);
    }
  }
  if (failedRegions.size > 0) return { solid: null, failedRegions };
  const faces: ShapeHandle[] = [];
  const loopsOf = new Map<number, typeof topo.loops>();
  for (const loop of topo.loops) (loopsOf.get(loop.piece) ?? loopsOf.set(loop.piece, []).get(loop.piece)!).push(loop);
  for (const piece of topo.pieces) {
    const loops = loopsOf.get(piece.id) ?? [];
    if (loops.length === 0) continue;
    try {
      const wires = loops.map((loop) => {
        const edges: ShapeHandle[] = [];
        for (const part of loop.parts) {
          const list = edgesOf.get(part.chain)!;
          edges.push(...(part.reversed ? list.slice().reverse() : list));
        }
        return { wire: cad.makeWire(edges), area: loopArea(topo, piece, loop.parts) };
      });
      wires.sort((a, b) => b.area - a.area);
      const [outer, ...holes] = wires;
      let face: ShapeHandle;
      if (piece.surface.kind === "plane") {
        try {
          face = cad.makeFace(outer.wire);
        } catch {
          // Spline or ellipse edges a hair off the plane: build on the plane itself.
          face = cad.makeFaceOnSurface(planeFace(cad, piece.surface, piece, seg), outer.wire);
        }
      } else {
        // On a bounded surface a wire can bound the piece or everything round it: the one near the mesh's area wins.
        const base = surfaceFace(cad, piece, topo, seg);
        const meshAreaOfPiece = piece.triangles.reduce((sum, t) => sum + seg.areas[t], 0);
        const sized = (f: ShapeHandle) => {
          try {
            return cad.getSurfaceArea(cad.fixShape(f));
          } catch {
            return NaN;
          }
        };
        face = cad.makeFaceOnSurface(base, outer.wire);
        const area = sized(face);
        if (!(area > meshAreaOfPiece * 0.7 && area < meshAreaOfPiece * 1.4)) {
          const flipped = cad.makeFaceOnSurface(base, cad.reverseShape(outer.wire));
          const other = sized(flipped);
          debug?.(`piece ${piece.id} ${piece.surface.kind}: area ${area.toFixed(2)}, flipped ${other.toFixed(2)}, mesh ${meshAreaOfPiece.toFixed(2)}`);
          if (Math.abs(other - meshAreaOfPiece) < Math.abs(area - meshAreaOfPiece)) face = flipped;
        }
      }
      if (holes.length > 0) {
        // A face built on a curved surface has no extent until it is fixed; holes go in after.
        if (piece.surface.kind !== "plane") face = cad.fixShape(face);
        face = cad.addHolesInFace(face, holes.map((h) => h.wire));
      }
      face = facingOut(cad, face, piece, seg);
      if (debug) {
        const meshAreaOfPiece = piece.triangles.reduce((sum, t) => sum + seg.areas[t], 0);
        debug(`face ${piece.id} ${piece.surface.kind}${piece.facet ? " facet" : ""}: area ${cad.getSurfaceArea(face).toFixed(3)} mesh ${meshAreaOfPiece.toFixed(3)} loops ${loops.length} valid ${cad.isValid(face)} edges ${cad.subShapeCount(face, "edge")} chains ${loops.map((l) => l.parts.map((q) => `${q.chain}${q.reversed ? "r" : ""}`).join(" ")).join(" / ")}`);
      }
      faces.push(face);
    } catch (error) {
      debug?.(`piece ${piece.id} ${piece.surface.kind} (${loops.length} loops): ${String(error)}`);
      if (piece.surface.kind !== "plane" && !piece.facet) failedRegions.add(piece.region);
      else return { solid: null, failedRegions };
    }
  }
  if (failedRegions.size > 0) return { solid: null, failedRegions };
  if (debug) {
    try {
      const shell = cad.sew(faces, 1e-4);
      const map = cad.edgeToFaceMap(shell, 2147483647);
      const counts = new Map<number, number>();
      for (let i = 0; i + 1 < map.length; i += 2) counts.set(map[i], (counts.get(map[i]) ?? 0) + 1);
      const edges = cad.getSubShapes(shell, "edge");
      const hashes = cad.subShapeHashes(shell, "edge", 2147483647);
      const free = edges.filter((_, i) => (counts.get(hashes[i]) ?? 0) < 2);
      debug(`sewn shell: ${cad.subShapeCount(shell, "face")} faces, ${edges.length} edges, map ${map.length}, free ${free.length}: ${free.slice(0, 6).map((e) => { const q = cad.curveParameters(e); const a = cad.curvePointAtParam(e, q.first), b = cad.curvePointAtParam(e, q.last); return `${cad.curveType(e)} ${a.x.toFixed(2)},${a.y.toFixed(2)},${a.z.toFixed(2)}->${b.x.toFixed(2)},${b.y.toFixed(2)},${b.z.toFixed(2)}`; }).join(" ; ")}`);
    } catch (error) {
      debug(`sew check failed: ${String(error)}`);
    }
  }
  const scaleOf = Math.max(1, Math.sqrt(meshArea));
  for (const sewTolerance of [1e-6, 1e-5, 1e-4, tolerance, tolerance * 5]) {
    try {
      let solid = cad.sewAndSolidify(faces, sewTolerance);
      solid = cad.fixShape(solid);
      if (!cad.isSolid(solid)) { debug?.(`sew ${sewTolerance}: not a solid`); continue; }
      const steps: string[] = [];
      const note = (label: string) => { if (debug) steps.push(`${label}:${cad.isValid(solid) ? "ok" : "bad"}`); };
      note("sewn");
      solid = cad.healSolid(solid, sewTolerance);
      note("healed");
      solid = cad.fixFaceOrientations(solid);
      note("oriented");
      solid = cad.removeDegenerateEdges(solid);
      note("degenerate");
      solid = cad.unifySameDomain(solid);
      note("unified");
      if (!cad.isValid(solid)) {
        // Joining the pieces of one surface can be what breaks it: then without.
        solid = cad.fixShape(solid);
        note("fixed");
      }
      if (!cad.isSolid(solid) || !cad.isValid(solid)) { debug?.(`sew ${sewTolerance}: invalid (${steps.join(" ")})`); continue; }
      let volume = cad.getVolume(solid);
      if (volume < 0) {
        solid = cad.reverseShape(solid);
        volume = cad.getVolume(solid);
      }
      // A curved face's mesh is its chords: the volumes differ by about the area times the chord height.
      const allowed = Math.max(Math.abs(meshVolume) * 0.02, meshArea * Math.min(0.05, scaleOf * 1e-3));
      if (Math.abs(volume - Math.abs(meshVolume)) > allowed) {
        debug?.(`sew ${sewTolerance}: volume ${volume} vs mesh ${meshVolume}; faces ${cad.getSubShapes(solid, "face").map((f) => `${cad.surfaceType(f)} ${cad.getSurfaceArea(f).toFixed(1)}`).join(", ")}`);
        continue;
      }
      return { solid, failedRegions };
    } catch (error) {
      debug?.(`sew ${sewTolerance}: ${String(error)}`);
    }
  }
  return { solid: null, failedRegions };
}

/** The edges of a chain, first to last: a line, one or two arcs, a spline, or for a facet's side the mesh's own segments. */
let debugChains: ((message: string) => void) | undefined;

function chainEdges(cad: OcctKernel, topo: MeshTopology, id: number, tolerance: number): ShapeHandle[] {
  const chain = topo.chains[id];
  const pts = topo.chainPoints.get(id)!;
  const a = topo.pieces[chain.left], b = topo.pieces[chain.right];
  const closed = chain.closed;
  const ring = closed ? [...pts, pts[0]] : pts;
  if (a.facet || b.facet) {
    const out: ShapeHandle[] = [];
    for (let i = 0; i + 1 < ring.length; i += 1) out.push(cad.makeLineEdge(vec(ring[i]), vec(ring[i + 1])));
    return out;
  }
  const surfaces: AnalyticSurface[] = a.region === b.region ? (chain.cut ? [a.surface, chain.cut] : [a.surface]) : [a.surface, b.surface];
  if (chain.cut && !closed) {
    const exact = cutEdge(cad, a.surface, chain.cut, pts);
    if (exact) return [exact];
  }
  // Midpoints between the chain's points, moved onto both surfaces too: a coarse mesh has few points on an edge. Not
  // where the two surfaces touch: there the mesh's own points are the edge.
  const dense: V3[] = [];
  const tangent = topo.tangentChains.has(id);
  for (let i = 0; i + 1 < ring.length; i += 1) {
    dense.push(ring[i]);
    if (tangent) continue;
    const mid = scale(add(ring[i], ring[i + 1]), 0.5);
    dense.push(solveOnto(mid, surfaces, tolerance * 4) ?? mid);
  }
  dense.push(ring[ring.length - 1]);
  const ellipse = a.region !== b.region ? planeCylinderEllipse(a.surface, b.surface) : null;
  if (ellipse && !tangent) {
    const edges = ellipseEdges(cad, ellipse, dense, closed);
    if (edges) return edges;
  }
  if (!closed) {
    const start = dense[0], end = dense[dense.length - 1];
    if (offLine(dense, start, end) <= tolerance) return [cad.makeLineEdge(vec(start), vec(end))];
    const circle = fitCircle3D(dense);
    if (circle && circle.error <= tolerance) {
      const mid = dense[Math.floor(dense.length / 2)];
      return [cad.makeArcEdge(vec(start), vec(onCircle(circle, mid)), vec(end))];
    }
    if (debugChains) debugChains(`chain ${id} spline: line off ${offLine(dense, start, end).toExponential(2)}, circle error ${circle?.error.toExponential(2)}, points ${dense.map((p) => p.map((v) => v.toFixed(4)).join(" ")).join(" | ")}`);
    return [splineEdge(cad, dense)];
  }
  // A closed chain in two halves, so each edge has two ends of its own.
  const half = Math.floor((dense.length - 1) / 2);
  const firstHalf = dense.slice(0, half + 1), secondHalf = dense.slice(half);
  const circle = fitCircle3D(dense);
  if (circle && circle.error <= tolerance) {
    const p0 = onCircle(circle, dense[0]), p1 = onCircle(circle, dense[half]);
    return [
      cad.makeArcEdge(vec(p0), vec(onCircle(circle, firstHalf[Math.floor(firstHalf.length / 2)])), vec(p1)),
      cad.makeArcEdge(vec(p1), vec(onCircle(circle, secondHalf[Math.floor(secondHalf.length / 2)])), vec(p0)),
    ];
  }
  return [splineEdge(cad, firstHalf), splineEdge(cad, secondHalf)];
}

type Ellipse = { center: V3; normal: V3; xDir: V3; yDir: V3; major: number; minor: number };

/** Where a plane cuts a cylinder at a slant: an ellipse, its minor radius the cylinder's. Null when square or along it. */
function planeCylinderEllipse(a: AnalyticSurface, b: AnalyticSurface): Ellipse | null {
  const plane = a.kind === "plane" ? a : b.kind === "plane" ? b : null;
  const cyl = a.kind === "cylinder" ? a : b.kind === "cylinder" ? b : null;
  if (!plane || !cyl) return null;
  const c = Math.abs(dot(plane.normal, cyl.axis));
  if (c > 1 - 1e-6 || c < 1e-3) return null;
  const t = (plane.offset - dot(plane.normal, cyl.origin)) / dot(plane.normal, cyl.axis);
  const center = add(cyl.origin, scale(cyl.axis, t));
  const xDir = unit(sub(cyl.axis, scale(plane.normal, dot(cyl.axis, plane.normal))));
  return { center, normal: plane.normal, xDir, yDir: cross(plane.normal, xDir), major: cyl.radius / c, minor: cyl.radius };
}

function ellipseEdges(cad: OcctKernel, e: Ellipse, pts: V3[], closed: boolean): ShapeHandle[] | null {
  const param = (p: V3) => {
    const d = sub(p, e.center);
    return Math.atan2(dot(d, e.yDir) / e.minor, dot(d, e.xDir) / e.major);
  };
  const TWO_PI = 2 * Math.PI;
  const arc = (from: V3, through: V3, to: V3) => {
    const t0 = param(from), tm = param(through), t1 = param(to);
    const span = (((t1 - t0) % TWO_PI) + TWO_PI) % TWO_PI;
    const mid = (((tm - t0) % TWO_PI) + TWO_PI) % TWO_PI;
    if (mid < span) return cad.makeEllipseArc(vec(e.center), vec(e.normal), e.major, e.minor, t0, t0 + span, vec(e.xDir));
    return cad.makeEllipseArc(vec(e.center), vec(e.normal), e.major, e.minor, t1, t1 + (TWO_PI - span), vec(e.xDir));
  };
  try {
    if (!closed) return [arc(pts[0], pts[Math.floor(pts.length / 2)], pts[pts.length - 1])];
    const half = Math.floor((pts.length - 1) / 2);
    return [arc(pts[0], pts[Math.floor(half / 2)], pts[half]), arc(pts[half], pts[Math.floor((half + pts.length - 1) / 2)], pts[0])];
  } catch {
    return null;
  }
}

/**
 * The edge where a face was cut in pieces, from the surface and the cutting plane alone: a cylinder's or a cone's is a
 * straight line, a sphere's a great circle, a torus's a circle of its tube. Null when its ends are not on it.
 */
function cutEdge(cad: OcctKernel, s: AnalyticSurface, cut: AnalyticSurface, pts: V3[]): ShapeHandle | null {
  const start = pts[0], end = pts[pts.length - 1];
  if (s.kind === "cylinder" || s.kind === "cone") return cad.makeLineEdge(vec(start), vec(end));
  if (cut.kind !== "plane") return null;
  let center: V3, radius: number;
  if (s.kind === "sphere") {
    center = s.center;
    radius = s.radius;
  } else if (s.kind === "torus") {
    const d = sub(scale(add(start, end), 0.5), s.center);
    const h = dot(d, s.axis);
    const radial = unit(sub(d, scale(s.axis, h)));
    center = add(s.center, scale(radial, s.major));
    radius = s.minor;
  } else return null;
  // Through the middle of the chain's own points, on the circle in the cutting plane.
  const middle = pts[Math.floor(pts.length / 2)];
  const toCircle = (p: V3) => {
    const d = sub(p, center);
    const inPlane = sub(d, scale(cut.normal, dot(d, cut.normal)));
    return add(center, scale(unit(inPlane), radius));
  };
  if (Math.abs(norm(sub(start, center)) - radius) > 1e-3 || Math.abs(norm(sub(end, center)) - radius) > 1e-3) return null;
  let mid = toCircle(middle);
  if (pts.length <= 2) mid = toCircle(scale(add(start, end), 0.5));
  return cad.makeArcEdge(vec(start), vec(mid), vec(end));
}

function offLine(points: V3[], a: V3, b: V3) {
  const d = sub(b, a);
  const len = norm(d);
  if (len < 1e-12) return Infinity;
  const u = scale(d, 1 / len);
  let worst = 0;
  for (const p of points) {
    const w = sub(p, a);
    worst = Math.max(worst, norm(sub(w, scale(u, dot(w, u)))));
  }
  return worst;
}

function onCircle(circle: { center: V3; normal: V3; radius: number }, p: V3): V3 {
  const d = sub(p, circle.center);
  const inPlane = sub(d, scale(circle.normal, dot(d, circle.normal)));
  return add(circle.center, scale(unit(inPlane), circle.radius));
}

/**
 * A cubic spline through the points (chord-length parameters, clamped ends), as a B-spline edge: at most 60 points
 * go in, picked evenly with both ends kept.
 */
function splineEdge(cad: OcctKernel, allPoints: V3[]): ShapeHandle {
  const step = Math.max(1, Math.ceil((allPoints.length - 1) / 59));
  const points: V3[] = [];
  for (let i = 0; i < allPoints.length - 1; i += step) points.push(allPoints[i]);
  points.push(allPoints[allPoints.length - 1]);
  const n = points.length;
  if (n === 2) return cad.makeLineEdge(vec(points[0]), vec(points[1]));
  const degree = n === 3 ? 2 : 3;
  // Chord-length parameters.
  const u = [0];
  for (let i = 1; i < n; i += 1) u.push(u[i - 1] + Math.max(1e-12, norm(sub(points[i], points[i - 1]))));
  const total = u[n - 1];
  for (let i = 0; i < n; i += 1) u[i] /= total;
  // Knots by averaging (The NURBS Book, 9.8).
  const knots: number[] = [];
  for (let i = 0; i <= degree; i += 1) knots.push(0);
  for (let j = 1; j <= n - 1 - degree; j += 1) {
    let sum = 0;
    for (let i = j; i < j + degree; i += 1) sum += u[i];
    knots.push(sum / degree);
  }
  for (let i = 0; i <= degree; i += 1) knots.push(1);
  // Solve N P = Q for the poles.
  const N = u.map((t) => basisRow(t, degree, knots, n));
  const poles: V3[] = [];
  const solved = [0, 1, 2].map((k) => gauss(N.map((row) => row.slice()), points.map((p) => p[k])));
  if (solved.some((s) => !s)) throw new Error("no spline through these points");
  for (let i = 0; i < n; i += 1) poles.push([solved[0]![i], solved[1]![i], solved[2]![i]]);
  // Distinct knots and their multiplicities, as OCCT takes them.
  const distinct: number[] = [], mults: number[] = [];
  for (const k of knots) {
    if (distinct.length > 0 && Math.abs(k - distinct[distinct.length - 1]) < 1e-12) mults[mults.length - 1] += 1;
    else { distinct.push(k); mults.push(1); }
  }
  return cad.makeBSplineEdge(poles.flatMap((p) => p), poles.map(() => 1), distinct, mults, degree);
}

function basisRow(t: number, p: number, U: number[], n: number): number[] {
  const row = new Array(n).fill(0);
  if (t >= 1 - 1e-12) { row[n - 1] = 1; return row; }
  if (t <= 1e-12) { row[0] = 1; return row; }
  let span = p;
  while (span < n - 1 && U[span + 1] <= t) span += 1;
  const N = new Array(p + 1).fill(0);
  N[0] = 1;
  const left = new Array(p + 1).fill(0), right = new Array(p + 1).fill(0);
  for (let j = 1; j <= p; j += 1) {
    left[j] = t - U[span + 1 - j];
    right[j] = U[span + j] - t;
    let saved = 0;
    for (let r = 0; r < j; r += 1) {
      const temp = N[r] / (right[r + 1] + left[j - r]);
      N[r] = saved + right[r + 1] * temp;
      saved = left[j - r] * temp;
    }
    N[j] = saved;
  }
  for (let j = 0; j <= p; j += 1) row[span - p + j] = N[j];
  return row;
}

function gauss(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const m = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c += 1) {
    let piv = c;
    for (let r = c + 1; r < n; r += 1) if (Math.abs(m[r][c]) > Math.abs(m[piv][c])) piv = r;
    if (Math.abs(m[piv][c]) < 1e-14) return null;
    [m[c], m[piv]] = [m[piv], m[c]];
    for (let r = c + 1; r < n; r += 1) {
      const f = m[r][c] / m[c][c];
      if (f === 0) continue;
      for (let k = c; k <= n; k += 1) m[r][k] -= f * m[c][k];
    }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r -= 1) {
    let s = m[r][n];
    for (let k = r + 1; k < n; k += 1) s -= m[r][k] * x[k];
    x[r] = s / m[r][r];
  }
  return x;
}

/** How big a loop is, to tell a piece's outline from its holes: its area projected across the piece's surface. */
function loopArea(topo: MeshTopology, piece: Piece, parts: { chain: number; reversed: boolean }[]) {
  const pts: V3[] = [];
  for (const part of parts) {
    const list = topo.chainPoints.get(part.chain)!;
    pts.push(...(part.reversed ? list.slice().reverse() : list));
  }
  const s = piece.surface;
  const project = (p: V3): [number, number] => {
    if (s.kind === "plane") {
      const [u, v] = perpendicularFrame(s.normal);
      return [dot(p, u), dot(p, v)];
    }
    if (s.kind === "sphere") {
      const middle = piece.middle ?? [1, 0, 0];
      const [u, v] = perpendicularFrame(middle);
      const d = unit(sub(p, s.center));
      return [dot(d, u), dot(d, v)];
    }
    const origin = s.kind === "cone" ? s.apex : s.kind === "cylinder" ? s.origin : s.center;
    const axis = s.axis;
    const [u, v] = perpendicularFrame(axis);
    const middle = piece.middle ?? u;
    const d = sub(p, origin);
    const mu = dot(middle, u), mv = dot(middle, v);
    const angle = Math.atan2(dot(d, v), dot(d, u)) - Math.atan2(mv, mu);
    const wrapped = Math.atan2(Math.sin(angle), Math.cos(angle));
    if (s.kind === "torus") {
      const h = dot(d, axis);
      const rho = norm(sub(d, scale(axis, h)));
      return [wrapped, Math.atan2(h, rho - s.major)];
    }
    return [wrapped, dot(d, axis)];
  };
  const uv = pts.map(project);
  let area = 0;
  for (let i = 0; i < uv.length; i += 1) {
    const [x1, y1] = uv[i], [x2, y2] = uv[(i + 1) % uv.length];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area / 2);
}

/**
 * The face turned to face out of the solid, the way the mesh's triangles face: a swept face's normal follows the
 * direction of its sweep, not the side the material is on.
 */
function facingOut(cad: OcctKernel, face: ShapeHandle, piece: Piece, seg: MeshSegmentation): ShapeHandle {
  let best = piece.triangles[0];
  for (const t of piece.triangles) if (seg.areas[t] > seg.areas[best]) best = t;
  const [a, b, c] = seg.mesh.triangles[best].map((v) => seg.mesh.points[v]);
  const middle = scale(add(add(a, b), c), 1 / 3);
  try {
    const uv = cad.uvFromPoint(face, vec(middle));
    const n = cad.surfaceNormal(face, uv.u, uv.v);
    if (n.x * seg.normals[best][0] + n.y * seg.normals[best][1] + n.z * seg.normals[best][2] < 0) return cad.reverseShape(face);
  } catch {
    // keep it as built
  }
  return face;
}

/** A square of the plane larger than the piece. */
function planeFace(cad: OcctKernel, plane: { normal: V3; offset: number }, piece: Piece, seg: MeshSegmentation): ShapeHandle {
  const [u, v] = perpendicularFrame(plane.normal);
  let lo = [Infinity, Infinity], hi = [-Infinity, -Infinity];
  for (const t of piece.triangles) for (const w of seg.mesh.triangles[t]) {
    const p = seg.mesh.points[w];
    lo = [Math.min(lo[0], dot(p, u)), Math.min(lo[1], dot(p, v))];
    hi = [Math.max(hi[0], dot(p, u)), Math.max(hi[1], dot(p, v))];
  }
  const m = Math.max(1, (hi[0] - lo[0] + hi[1] - lo[1]) * 0.2);
  const at = (x: number, y: number) => vec(add(scale(plane.normal, plane.offset), add(scale(u, x), scale(v, y))));
  const corners = [at(lo[0] - m, lo[1] - m), at(hi[0] + m, lo[1] - m), at(hi[0] + m, hi[1] + m), at(lo[0] - m, hi[1] + m)];
  return cad.makeFace(cad.makeWire(corners.map((c, i) => cad.makeLineEdge(c, corners[(i + 1) % 4]))));
}

/** The 3x4 matrix that carries the primitive's frame (x seam, z axis) to the given one. */
function frameMatrix(x: V3, z: V3, origin: V3): number[] {
  const y = cross(z, x);
  return [x[0], y[0], z[0], origin[0], x[1], y[1], z[1], origin[1], x[2], y[2], z[2], origin[2]];
}

/** A face of the piece's surface, larger than the piece, its seam turned to the far side of it. */
function surfaceFace(cad: OcctKernel, piece: Piece, topo: MeshTopology, seg: MeshSegmentation): ShapeHandle {
  const s = piece.surface;
  const P = seg.mesh.points;
  const points: V3[] = [];
  const seen = new Set<number>();
  for (const t of piece.triangles) for (const v of seg.mesh.triangles[t]) if (!seen.has(v)) { seen.add(v); points.push(P[v]); }
  void topo;
  const pick = (shape: ShapeHandle, kind: string) => {
    const face = cad.getSubShapes(shape, "face").find((f) => cad.surfaceType(f) === kind);
    if (!face) throw new Error(`no ${kind} face`);
    return face;
  };
  if (s.kind === "cylinder" || s.kind === "cone" || s.kind === "torus") {
    const z = s.axis;
    const middle = piece.middle ?? perpendicularFrame(z)[0];
    const x = unit(scale(sub(middle, scale(z, dot(middle, z))), -1));
    if (s.kind === "cylinder") {
      const hs = points.map((p) => dot(sub(p, s.origin), z));
      const lo = Math.min(...hs), hi = Math.max(...hs);
      const margin = Math.max(1, (hi - lo) * 0.2);
      const prim = cad.makeCylinder(s.radius, hi - lo + 2 * margin);
      return pick(cad.transform(prim, frameMatrix(x, z, add(s.origin, scale(z, lo - margin)))), "cylinder");
    }
    if (s.kind === "cone") {
      const hs = points.map((p) => dot(sub(p, s.apex), z));
      const lo = Math.min(...hs), hi = Math.max(...hs);
      const margin = Math.max(0.5, (hi - lo) * 0.2);
      const h0 = Math.max(lo - margin, lo * 0.5, 0);
      const h1 = hi + margin;
      const tan = Math.tan(s.halfAngle);
      const prim = cad.makeCone(h0 * tan, h1 * tan, h1 - h0);
      return pick(cad.transform(prim, frameMatrix(x, z, add(s.apex, scale(z, h0)))), "cone");
    }
    // The torus primitive has a seam all round its outer equator, where a fillet meets the wall it rounds into. So
    // the face is swept instead: an arc of the tube, turned round the axis, both only as far as the piece needs.
    const [u, v] = [x, cross(z, x)];
    const local = points.map((p) => {
      const d = sub(p, s.center);
      const h = dot(d, z);
      const rho = norm(sub(d, scale(z, h)));
      const theta = Math.atan2(dot(d, v), dot(d, u));
      return { theta, phi: Math.atan2(h, rho - s.major) };
    });
    // Angles round the axis measured from the seam direction x (behind the piece): the piece lies round pi.
    const thetas = local.map((l) => (l.theta < 0 ? l.theta + 2 * Math.PI : l.theta));
    const t0 = Math.max(0.01, Math.min(...thetas) - 0.15), t1 = Math.min(2 * Math.PI - 0.01, Math.max(...thetas) + 0.15);
    // Round the tube: centred on the piece's own middle angle, so the arc does not cross itself.
    const phis = local.map((l) => l.phi);
    const phiMid = Math.atan2(phis.reduce((a, f) => a + Math.sin(f), 0), phis.reduce((a, f) => a + Math.cos(f), 0));
    const rel = phis.map((f) => Math.atan2(Math.sin(f - phiMid), Math.cos(f - phiMid)));
    const f0 = Math.max(-Math.PI + 0.02, Math.min(...rel) - 0.15) + phiMid, f1 = Math.min(Math.PI - 0.02, Math.max(...rel) + 0.15) + phiMid;
    const radial = add(scale(u, Math.cos(t0)), scale(v, Math.sin(t0)));
    const tubePoint = (f: number): V3 => add(add(s.center, scale(radial, s.major + s.minor * Math.cos(f))), scale(z, s.minor * Math.sin(f)));
    const arc = cad.makeArcEdge(vec(tubePoint(f0)), vec(tubePoint((f0 + f1) / 2)), vec(tubePoint(f1)));
    const swept = cad.revolve(arc, { point: vec(s.center), direction: vec(z) }, t1 - t0);
    const face = cad.getSubShapes(swept, "face")[0];
    if (!face) throw new Error("no swept torus face");
    return face;
  }
  if (s.kind === "sphere") {
    const middle = piece.middle ?? [1, 0, 0];
    const x = scale(unit(middle), -1);
    const z = perpendicularFrame(x)[0];
    const prim = cad.makeSphere(s.radius);
    return pick(cad.transform(prim, frameMatrix(x, z, s.center)), "sphere");
  }
  throw new Error("not a curved surface");
}
