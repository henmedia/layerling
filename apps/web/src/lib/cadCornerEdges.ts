import type { CadModifierEdge } from "./cadModifierTypes";

/**
 * Short edges at the ends of the picked ones, for a second try when the kernel refuses a chamfer or
 * fillet (#1178). Where an earlier chamfer ends on a wall that is still sharp, a short slanted edge
 * sits between the corner and the wall's top edge; the kernel will not treat the two across that
 * corner while the short edge stays sharp, and nobody finds a 1 mm edge among hundreds to pick it.
 *
 * Bridges join two picked edges (that slanted edge, between the upright corner and the top edge)
 * and come first; the others touch one picked edge only. Only edges up to twice the size count, so
 * nothing the eye would call an edge of its own gets treated unasked.
 */
export function cornerEdgeCandidates(edges: CadModifierEdge[], selectedIds: number[], amount: number) {
  const tolerance = 1e-3;
  const picked = new Set(selectedIds);
  const ends = selectedIds.flatMap((id) => {
    const edge = edges[id];
    return edge && edge.points.length >= 6 ? [{ id, owner: edge.owner ?? 0, ...edgeEnds(edge.points) }] : [];
  });
  const bridges: number[] = [];
  const others: number[] = [];
  for (const edge of edges) {
    if (picked.has(edge.id) || !edge.selectable || edge.points.length < 6) continue;
    if (edgeLength(edge.points) > amount * 2 + tolerance) continue;
    const { start, end } = edgeEnds(edge.points);
    const owner = edge.owner ?? 0;
    const touching = (point: number[]) => ends.filter((other) => other.owner === owner && (near(point, other.start, tolerance) || near(point, other.end, tolerance))).map((other) => other.id);
    const atStart = touching(start);
    const atEnd = touching(end);
    if (atStart.length && atEnd.length && new Set([...atStart, ...atEnd]).size >= 2) bridges.push(edge.id);
    else if (atStart.length || atEnd.length) others.push(edge.id);
  }
  return { bridges, others };
}

function edgeEnds(points: number[]) {
  return { start: points.slice(0, 3), end: points.slice(points.length - 3) };
}

function edgeLength(points: number[]) {
  let length = 0;
  for (let index = 3; index + 2 < points.length; index += 3) {
    length += Math.hypot(points[index] - points[index - 3], points[index + 1] - points[index - 2], points[index + 2] - points[index - 1]);
  }
  return length;
}

function near(first: number[], second: number[], tolerance: number) {
  return Math.abs(first[0] - second[0]) <= tolerance && Math.abs(first[1] - second[1]) <= tolerance && Math.abs(first[2] - second[2]) <= tolerance;
}

/**
 * Every edge, however long, with an end at an end of a picked one: the candidates for the sharp inner corners a
 * fillet or chamfer cannot get past (see lib/cadInnerCorners.ts).
 */
export function edgesTouchingEnds(edges: CadModifierEdge[], selectedIds: number[]) {
  const tolerance = 1e-3;
  const picked = new Set(selectedIds);
  const ends = selectedIds.flatMap((id) => {
    const edge = edges[id];
    return edge && edge.points.length >= 6 ? [{ owner: edge.owner ?? 0, ...edgeEnds(edge.points) }] : [];
  });
  return edges.filter((edge) => {
    if (picked.has(edge.id) || !edge.selectable || edge.points.length < 6) return false;
    const { start, end } = edgeEnds(edge.points);
    const owner = edge.owner ?? 0;
    return ends.some((other) => other.owner === owner && [other.start, other.end].some((point) => near(point, start, tolerance) || near(point, end, tolerance)));
  }).map((edge) => edge.id);
}
