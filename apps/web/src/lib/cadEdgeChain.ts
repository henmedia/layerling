import * as THREE from "three";
import type { CadModifierEdge } from "@/lib/cadModifierTypes";

function cadEdgeEndpoint(edge: CadModifierEdge, end: "start" | "end") {
  const offset = end === "start" ? 0 : edge.points.length - 3;
  return new THREE.Vector3(edge.points[offset], edge.points[offset + 1], edge.points[offset + 2]);
}

function cadEdgeTangentAt(edge: CadModifierEdge, endpoint: THREE.Vector3) {
  const start = cadEdgeEndpoint(edge, "start");
  const end = cadEdgeEndpoint(edge, "end");
  if (endpoint.distanceToSquared(start) <= endpoint.distanceToSquared(end)) {
    const next = new THREE.Vector3(edge.points[3], edge.points[4], edge.points[5]);
    return next.sub(start).normalize();
  }
  const offset = Math.max(0, edge.points.length - 6);
  const previous = new THREE.Vector3(edge.points[offset], edge.points[offset + 1], edge.points[offset + 2]);
  return previous.sub(end).normalize();
}

/**
 * The edges that run on smoothly from the start edges, all at once: the ends of every edge go into a
 * grid of the tolerance's size once, so an edge finds its neighbours in the cells about its ends instead
 * of in the whole list (a mesh body has thousands of edges, and every selected edge was a search of its own).
 */
export function tangentCadEdgeChain(edges: CadModifierEdge[], startIds: number | readonly number[], allowedIds: Set<number>) {
  const edgeById = new Map(edges.map((edge) => [edge.id, edge]));
  const starts = typeof startIds === "number" ? [startIds] : startIds;
  const selected = new Set<number>(starts);
  const queue = [...starts];
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  edges.forEach((edge) => {
    for (let index = 0; index + 2 < edge.points.length; index += 3) {
      minX = Math.min(minX, edge.points[index]);
      minY = Math.min(minY, edge.points[index + 1]);
      minZ = Math.min(minZ, edge.points[index + 2]);
      maxX = Math.max(maxX, edge.points[index]);
      maxY = Math.max(maxY, edge.points[index + 1]);
      maxZ = Math.max(maxZ, edge.points[index + 2]);
    }
  });
  const diagonal = [minX, minY, minZ, maxX, maxY, maxZ].every(Number.isFinite)
    ? Math.hypot(maxX - minX, maxY - minY, maxZ - minZ)
    : 1;
  const tolerance = Math.max(1e-6, Math.min(0.01, diagonal * 1e-5));
  const cellOf = (point: THREE.Vector3) => [Math.floor(point.x / tolerance), Math.floor(point.y / tolerance), Math.floor(point.z / tolerance)];
  const grid = new Map<string, Array<{ edge: CadModifierEdge; point: THREE.Vector3 }>>();
  const ends = new Map<number, THREE.Vector3[]>();
  edges.forEach((edge) => {
    if (!allowedIds.has(edge.id) && !selected.has(edge.id)) return;
    const points = [cadEdgeEndpoint(edge, "start"), cadEdgeEndpoint(edge, "end")];
    ends.set(edge.id, points);
    if (!allowedIds.has(edge.id)) return;
    points.forEach((point) => {
      const [x, y, z] = cellOf(point);
      const key = `${x},${y},${z}`;
      const cell = grid.get(key);
      if (cell) cell.push({ edge, point });
      else grid.set(key, [{ edge, point }]);
    });
  });
  // The edges with an end within the tolerance of `point`: such an end lies in the point's cell or one next to it.
  const near = (point: THREE.Vector3) => {
    const [x, y, z] = cellOf(point);
    const found = new Set<CadModifierEdge>();
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dz = -1; dz <= 1; dz += 1) {
          grid.get(`${x + dx},${y + dy},${z + dz}`)?.forEach((entry) => {
            if (entry.point.distanceTo(point) <= tolerance) found.add(entry.edge);
          });
        }
      }
    }
    return found;
  };
  while (queue.length > 0) {
    const id = queue.shift() as number;
    const edge = edgeById.get(id);
    const endpoints = ends.get(id);
    if (!edge || !endpoints) continue;
    // An edge meeting both ends is judged at the start, as before.
    const sharedAt = new Map<CadModifierEdge, THREE.Vector3>();
    endpoints.forEach((point) => near(point).forEach((candidate) => {
      if (!sharedAt.has(candidate)) sharedAt.set(candidate, point);
    }));
    sharedAt.forEach((shared, candidate) => {
      if (selected.has(candidate.id)) return;
      const a = cadEdgeTangentAt(edge, shared);
      const b = cadEdgeTangentAt(candidate, shared);
      const deviation = (Math.acos(Math.max(-1, Math.min(1, Math.abs(a.dot(b))))) * 180) / Math.PI;
      if (deviation <= 16) {
        selected.add(candidate.id);
        queue.push(candidate.id);
      }
    });
  }
  return [...selected];
}
