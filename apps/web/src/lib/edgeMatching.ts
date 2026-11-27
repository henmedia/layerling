import type { CadModifierEdge } from "@/lib/cadModifierTypes";

type Point = [number, number, number];

function edgePoints(edge: CadModifierEdge): Point[] {
  const points: Point[] = [];
  for (let index = 0; index + 2 < edge.points.length; index += 3) points.push([edge.points[index], edge.points[index + 1], edge.points[index + 2]]);
  return points;
}

/** Every point of the edges, moved into the box of all of them scaled to 0..1 per axis. */
function normalizer(edges: readonly CadModifierEdge[]) {
  const min: Point = [Infinity, Infinity, Infinity];
  const max: Point = [-Infinity, -Infinity, -Infinity];
  edges.forEach((edge) => edgePoints(edge).forEach((point) => point.forEach((value, axis) => {
    min[axis] = Math.min(min[axis], value);
    max[axis] = Math.max(max[axis], value);
  })));
  return (point: Point): Point => point.map((value, axis) => (value - min[axis]) / Math.max(1e-6, max[axis] - min[axis])) as Point;
}

function meanNearest(from: readonly Point[], to: readonly Point[]) {
  if (!from.length || !to.length) return Infinity;
  return from.reduce((sum, [x, y, z]) => sum + Math.min(...to.map(([u, v, w]) => Math.hypot(x - u, y - v, z - w))), 0) / from.length;
}

/**
 * The picked edges of a body built anew from its changed sketch, by their numbers (#1804). A corner of the outline
 * dragged elsewhere takes its edges with it, so they do not lie where they lay, and in a frame that has grown the
 * others do not either. But a body built the same way from an outline with as many pieces has as many edges, and the
 * kernel numbers them in the same order: edge 7 is the edge 7 was. Taken only when both bodies have the same number
 * of edges and each picked edge is, under its number, still an edge that can be picked and of the same kind, straight
 * or curved. An edge that could not be picked on the old body either (a corner edge the kernel took along) is passed
 * over: the kernel takes it along again. Null otherwise.
 */
export function sameNumberedEdgeIds(
  oldEdges: readonly CadModifierEdge[],
  pickedIds: readonly number[],
  newEdges: readonly CadModifierEdge[],
  candidateIds: readonly number[],
  oldCandidateIds: readonly number[],
): number[] | null {
  if (oldEdges.length !== newEdges.length) return null;
  const straight = (edge: CadModifierEdge) => edge.points.length <= 6;
  const matched: number[] = [];
  for (const id of pickedIds) {
    if (!oldCandidateIds.includes(id)) continue;
    const before = oldEdges.find((edge) => edge.id === id);
    const after = newEdges.find((edge) => edge.id === id);
    if (!before || !after || !candidateIds.includes(id) || straight(before) !== straight(after)) return null;
    matched.push(id);
  }
  return matched.length ? matched : null;
}

const WALK_STEPS = 16;
/** How far apart, both ways together, an edge and its partner may lie after a fillet or chamfer got another size. */
const ALONG_REACH = 0.15;

/** Points in even steps along a line of points, both ends among them. */
function walked(line: readonly Point[]): Point[] {
  if (line.length < 2) return [...line];
  const lengths = line.slice(1).map((point, index) => Math.hypot(point[0] - line[index][0], point[1] - line[index][1], point[2] - line[index][2]));
  const total = lengths.reduce((sum, length) => sum + length, 0);
  if (total < 1e-12) return [line[0]];
  const points: Point[] = [];
  let piece = 0;
  let before = 0;
  for (let step = 0; step <= WALK_STEPS; step += 1) {
    const at = (total * step) / WALK_STEPS;
    while (piece < lengths.length - 1 && before + lengths[piece] < at) {
      before += lengths[piece];
      piece += 1;
    }
    const share = lengths[piece] > 1e-12 ? Math.min(1, Math.max(0, (at - before) / lengths[piece])) : 0;
    const from = line[piece];
    const to = line[piece + 1];
    points.push([from[0] + (to[0] - from[0]) * share, from[1] + (to[1] - from[1]) * share, from[2] + (to[2] - from[2]) * share]);
  }
  return points;
}

function toSegment([x, y, z]: Point, [ax, ay, az]: Point, [bx, by, bz]: Point) {
  const dx = bx - ax, dy = by - ay, dz = bz - az;
  const square = dx * dx + dy * dy + dz * dz;
  const share = square > 1e-18 ? Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy + (z - az) * dz) / square)) : 0;
  return Math.hypot(x - ax - dx * share, y - ay - dy * share, z - az - dz * share);
}

/** How far the points lie from a line of points, on average. */
function meanToLine(points: readonly Point[], line: readonly Point[]) {
  if (!points.length || !line.length) return Infinity;
  if (line.length === 1) return meanNearest(points, line);
  return points.reduce((sum, point) => {
    let nearest = Infinity;
    for (let index = 0; index + 1 < line.length; index += 1) nearest = Math.min(nearest, toSegment(point, line[index], line[index + 1]));
    return sum + nearest;
  }, 0) / points.length;
}

/**
 * The edges of a rebuilt body that lie where the picked edges of the old one lay, each body taken in its own
 * bounds, so a body stretched in between still finds them. The kernel numbers the edges of a stretched body
 * otherwise: the seam of an oval tube comes first, the top rim of a round one (forum, 621213). Null when an
 * edge finds no partner.
 *
 * `along`: for a body whose older fillet or chamfer got another size (Discussion #175). Its edges are the old ones cut
 * shorter or longer at their ends, and a straight edge is two points only: measured point to point, an edge that lost
 * 3 mm at each end was already "gone". So both edges are walked in even steps and measured to the line of the other,
 * which a shortened edge still lies on. The rounding's own edges move with its size, a corner arc of 3 mm to where one
 * of 7 mm lies, so an edge may lie a little further off than otherwise; in return the edge found must have no old edge
 * nearer to it than the one that asks, or a neighbour would stand in for an edge that is gone.
 */
export function matchingEdgeIds(
  oldEdges: readonly CadModifierEdge[],
  pickedIds: readonly number[],
  newEdges: readonly CadModifierEdge[],
  candidateIds: readonly number[],
  along = false,
): number[] | null {
  const oldPlace = normalizer(oldEdges);
  const newPlace = normalizer(newEdges);
  const placed = (edge: CadModifierEdge, place: (point: Point) => Point) => {
    const points = edgePoints(edge).map(place);
    return along ? { points: walked(points), line: points } : { points, line: null };
  };
  const apart = (from: { points: Point[]; line: Point[] | null }, to: { points: Point[]; line: Point[] | null }) => (
    to.line ? meanToLine(from.points, to.line) : meanNearest(from.points, to.points)
  );
  const candidates = newEdges.filter((edge) => candidateIds.includes(edge.id)).map((edge) => ({ id: edge.id, ...placed(edge, newPlace) }));
  const taken = new Set<number>();
  const matched: number[] = [];
  for (const id of pickedIds) {
    const old = oldEdges.find((edge) => edge.id === id);
    if (!old) return null;
    const own = placed(old, oldPlace);
    let best: { id: number; distance: number } | null = null;
    for (const candidate of candidates) {
      if (taken.has(candidate.id)) continue;
      const distance = apart(own, candidate) + apart(candidate, own);
      if (!best || distance < best.distance) best = { id: candidate.id, distance };
    }
    // Further off than a twentieth of the body: that edge is gone, not moved.
    if (!best || best.distance > (along ? ALONG_REACH : 0.1)) return null;
    if (along) {
      const found = candidates.find((candidate) => candidate.id === best!.id)!;
      const nearer = oldEdges.some((other) => {
        if (other.id === id) return false;
        const theirs = placed(other, oldPlace);
        return apart(theirs, found) + apart(found, theirs) < best!.distance - 1e-9;
      });
      if (nearer) return null;
    }
    taken.add(best.id);
    matched.push(best.id);
  }
  return matched;
}
