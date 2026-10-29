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
 * The edges of a rebuilt body that lie where the picked edges of the old one lay, each body taken in its own
 * bounds, so a body stretched in between still finds them. The kernel numbers the edges of a stretched body
 * otherwise: the seam of an oval tube comes first, the top rim of a round one (forum, 621213). Null when an
 * edge finds no partner.
 */
export function matchingEdgeIds(
  oldEdges: readonly CadModifierEdge[],
  pickedIds: readonly number[],
  newEdges: readonly CadModifierEdge[],
  candidateIds: readonly number[],
): number[] | null {
  const oldPlace = normalizer(oldEdges);
  const newPlace = normalizer(newEdges);
  const candidates = newEdges.filter((edge) => candidateIds.includes(edge.id)).map((edge) => ({ id: edge.id, points: edgePoints(edge).map(newPlace) }));
  const taken = new Set<number>();
  const matched: number[] = [];
  for (const id of pickedIds) {
    const old = oldEdges.find((edge) => edge.id === id);
    if (!old) return null;
    const points = edgePoints(old).map(oldPlace);
    let best: { id: number; distance: number } | null = null;
    for (const candidate of candidates) {
      if (taken.has(candidate.id)) continue;
      const distance = meanNearest(points, candidate.points) + meanNearest(candidate.points, points);
      if (!best || distance < best.distance) best = { id: candidate.id, distance };
    }
    // Further off than a twentieth of the body: that edge is gone, not moved.
    if (!best || best.distance > 0.1) return null;
    taken.add(best.id);
    matched.push(best.id);
  }
  return matched;
}
