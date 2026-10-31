import { planarFaceCentroid, planarFaceTriangles, type PivotPoint } from "@/lib/rotationPivot";
import { roundFaceTriangles } from "@/lib/roundFaceAxis";

/** Facets of one smooth surface turn less than this against their neighbour. */
const SMOOTH_TURN = Math.cos((40 * Math.PI) / 180);
/** A corner shared by at least this many facets of one smooth surface is its tip. */
const MIN_TIP_FACETS = 6;

/**
 * Where a dragged pivot lands with Shift held (#1065): the logical centre of the face under the
 * pointer instead of the point on it. A round face (a pin, a hinge ring, a hole) gives the middle
 * of its axis, a flat face the centre of its area - the axis of a pipe end, the middle of a box
 * side - and a pointed surface such as a cone its tip. `positions` holds world-space triangles,
 * nine numbers per triangle; null when the face has no such centre.
 */
export function pivotSnapCentre(positions: ArrayLike<number>, hitTriangle: number): PivotPoint | null {
  // Round first: the side of a cylinder is made of flat strips, each of which would pass as a face.
  const round = roundFaceTriangles(positions, hitTriangle);
  if (round) return { ...round.axis.point };
  const flat = planarFaceTriangles(positions, hitTriangle);
  if (flat && flat.triangles.length >= 2) return planarFaceCentroid(positions, hitTriangle);
  return surfaceTip(positions, hitTriangle);
}

/**
 * The tip of the smooth surface a triangle belongs to: the corner most of its facets share, as at
 * the point of a cone. Null when no corner is shared by enough of them.
 */
function surfaceTip(positions: ArrayLike<number>, hitTriangle: number): PivotPoint | null {
  const triangleCount = Math.floor(positions.length / 9);
  if (hitTriangle < 0 || hitTriangle >= triangleCount) return null;
  const normals = new Float64Array(triangleCount * 3);
  const usable = new Uint8Array(triangleCount);
  let extent = 1;
  const low = [Infinity, Infinity, Infinity];
  const high = [-Infinity, -Infinity, -Infinity];
  for (let triangle = 0; triangle < triangleCount; triangle += 1) {
    const o = triangle * 9;
    const ux = positions[o + 3] - positions[o];
    const uy = positions[o + 4] - positions[o + 1];
    const uz = positions[o + 5] - positions[o + 2];
    const vx = positions[o + 6] - positions[o];
    const vy = positions[o + 7] - positions[o + 1];
    const vz = positions[o + 8] - positions[o + 2];
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    const length = Math.hypot(nx, ny, nz);
    if (length > 0) {
      usable[triangle] = 1;
      normals[triangle * 3] = nx / length;
      normals[triangle * 3 + 1] = ny / length;
      normals[triangle * 3 + 2] = nz / length;
    }
    for (let corner = 0; corner < 9; corner += 3) {
      for (let axis = 0; axis < 3; axis += 1) {
        low[axis] = Math.min(low[axis], positions[o + corner + axis]);
        high[axis] = Math.max(high[axis], positions[o + corner + axis]);
      }
    }
  }
  if (!usable[hitTriangle]) return null;
  extent = Math.max(extent, high[0] - low[0], high[1] - low[1], high[2] - low[2]);
  // Corners closer than this count as one; the mesh stores float32 positions.
  const weld = extent * 1e-6;
  const cornerKey = (triangle: number, corner: number) => {
    const o = triangle * 9 + corner * 3;
    return `${Math.round(positions[o] / weld)},${Math.round(positions[o + 1] / weld)},${Math.round(positions[o + 2] / weld)}`;
  };
  const trianglesAtCorner = new Map<string, number[]>();
  for (let triangle = 0; triangle < triangleCount; triangle += 1) {
    if (!usable[triangle]) continue;
    for (let corner = 0; corner < 3; corner += 1) {
      const key = cornerKey(triangle, corner);
      const list = trianglesAtCorner.get(key);
      if (list) list.push(triangle);
      else trianglesAtCorner.set(key, [triangle]);
    }
  }
  const dot = (a: number, b: number) =>
    normals[a * 3] * normals[b * 3] + normals[a * 3 + 1] * normals[b * 3 + 1] + normals[a * 3 + 2] * normals[b * 3 + 2];

  const surface = new Set<number>([hitTriangle]);
  const queue = [hitTriangle];
  while (queue.length) {
    const triangle = queue.pop() as number;
    for (let corner = 0; corner < 3; corner += 1) {
      trianglesAtCorner.get(cornerKey(triangle, corner))?.forEach((other) => {
        if (surface.has(other) || dot(other, triangle) < SMOOTH_TURN) return;
        surface.add(other);
        queue.push(other);
      });
    }
  }

  const shared = new Map<string, { count: number; triangle: number; corner: number }>();
  surface.forEach((triangle) => {
    for (let corner = 0; corner < 3; corner += 1) {
      const key = cornerKey(triangle, corner);
      const entry = shared.get(key);
      if (entry) entry.count += 1;
      else shared.set(key, { count: 1, triangle, corner });
    }
  });
  let tip: { count: number; triangle: number; corner: number } | null = null;
  shared.forEach((entry) => {
    if (!tip || entry.count > tip.count) tip = entry;
  });
  const found = tip as { count: number; triangle: number; corner: number } | null;
  if (!found || found.count < MIN_TIP_FACETS) return null;
  const o = found.triangle * 9 + found.corner * 3;
  return { x: positions[o], y: positions[o + 1], z: positions[o + 2] };
}
