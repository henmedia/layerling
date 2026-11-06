/**
 * The centre of the flat face a triangle belongs to: every triangle in the same plane that is
 * connected to it, weighted by area. A shape dropped on the top of a box or a cylinder lands
 * in the middle of that top, as in Tinkercad (#823). Works in the mesh's own coordinates.
 */
export function planarFaceCentre(
  positions: ArrayLike<number>,
  index: ArrayLike<number> | null,
  triangle: number,
  maxTriangles = 200_000,
): { centre: [number, number, number]; radius: number; farthest: [number, number, number] } | null {
  const triangleCount = Math.floor((index ? index.length : positions.length / 3) / 3);
  if (triangle < 0 || triangle >= triangleCount || triangleCount > maxTriangles) return null;
  const vertexOf = (tri: number, corner: number) => (index ? index[tri * 3 + corner] : tri * 3 + corner);
  const point = (vertex: number): [number, number, number] => [positions[vertex * 3], positions[vertex * 3 + 1], positions[vertex * 3 + 2]];

  const normals = new Float64Array(triangleCount * 3);
  const areas = new Float64Array(triangleCount);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (let tri = 0; tri < triangleCount; tri += 1) {
    const a = point(vertexOf(tri, 0));
    const b = point(vertexOf(tri, 1));
    const c = point(vertexOf(tri, 2));
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const length = Math.hypot(nx, ny, nz);
    areas[tri] = length / 2;
    if (length > 0) {
      normals[tri * 3] = nx / length;
      normals[tri * 3 + 1] = ny / length;
      normals[tri * 3 + 2] = nz / length;
    }
    for (const p of [a, b, c]) {
      minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]);
      minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]);
      minZ = Math.min(minZ, p[2]); maxZ = Math.max(maxZ, p[2]);
    }
  }
  if (areas[triangle] <= 0) return null;
  const tolerance = Math.max(1e-6, Math.hypot(maxX - minX, maxY - minY, maxZ - minZ) * 1e-5);
  const key = (p: [number, number, number]) => `${Math.round(p[0] / tolerance)},${Math.round(p[1] / tolerance)},${Math.round(p[2] / tolerance)}`;

  // Triangles of the plane only, joined where they share a corner: separate faces that happen to
  // lie in the same plane (two feet of a stand) stay apart.
  const n = [normals[triangle * 3], normals[triangle * 3 + 1], normals[triangle * 3 + 2]];
  const origin = point(vertexOf(triangle, 0));
  const inPlane = (tri: number) => {
    if (areas[tri] <= 0) return false;
    if (normals[tri * 3] * n[0] + normals[tri * 3 + 1] * n[1] + normals[tri * 3 + 2] * n[2] < 0.9999) return false;
    const p = point(vertexOf(tri, 0));
    return Math.abs((p[0] - origin[0]) * n[0] + (p[1] - origin[1]) * n[1] + (p[2] - origin[2]) * n[2]) <= tolerance * 10;
  };
  const byCorner = new Map<string, number[]>();
  for (let tri = 0; tri < triangleCount; tri += 1) {
    if (!inPlane(tri)) continue;
    for (let corner = 0; corner < 3; corner += 1) {
      const k = key(point(vertexOf(tri, corner)));
      const list = byCorner.get(k);
      if (list) list.push(tri);
      else byCorner.set(k, [tri]);
    }
  }

  const seen = new Set<number>([triangle]);
  const queue = [triangle];
  let area = 0;
  const sum = [0, 0, 0];
  while (queue.length) {
    const tri = queue.pop()!;
    const corners = [0, 1, 2].map((corner) => point(vertexOf(tri, corner)));
    area += areas[tri];
    for (let axis = 0; axis < 3; axis += 1) sum[axis] += areas[tri] * (corners[0][axis] + corners[1][axis] + corners[2][axis]) / 3;
    for (const corner of corners) {
      for (const next of byCorner.get(key(corner)) ?? []) {
        if (seen.has(next)) continue;
        seen.add(next);
        queue.push(next);
      }
    }
  }
  if (area <= 0) return null;
  const centre: [number, number, number] = [sum[0] / area, sum[1] / area, sum[2] / area];
  // How far the face reaches from its centre, so a pointer near the middle can be told from one near an edge.
  // The corner farthest out comes along too: a body stretched in the view is measured in the room through it.
  let radius = 0;
  let farthest = centre;
  for (const tri of seen) {
    for (let corner = 0; corner < 3; corner += 1) {
      const p = point(vertexOf(tri, corner));
      const distance = Math.hypot(p[0] - centre[0], p[1] - centre[1], p[2] - centre[2]);
      if (distance > radius) {
        radius = distance;
        farthest = p;
      }
    }
  }
  return { centre, radius, farthest };
}


/** A neighbouring face that turns less than this from a face continues it, as the facets of a round surface do. */
const SMOOTH_TURN = Math.cos((25 * Math.PI) / 180);

/** One flat face of a mesh: the centre of its area, its unit normal as the mesh winds it, and its area, in the mesh's own coordinates. */
export type PlanarFace = {
  centre: [number, number, number];
  normal: [number, number, number];
  area: number;
  /**
   * A facet of a round surface - the side of a cylinder, a sphere, a rounded edge -: one strip of the polygon the
   * surface is drawn as, whose middle means nothing. Neighbours with half its area or more continue it at a slight
   * turn. The top of a box with rounded edges stays a face: the strips of its rounding turn away just as slightly,
   * but they are far smaller than the top.
   */
  curved: boolean;
};

/**
 * The flat faces of a mesh, for the tape measure's snap to the middle of a face (Discussion #610). planarFaceCentre
 * searches the whole mesh for the one face it is asked about, and the tape asks about another face whenever the
 * pointer crosses onto one: on an imported mesh of a few hundred thousand triangles that was a stutter at every move.
 * Here which triangles meet at which corner is worked out once per mesh; a face is then grown from its own triangles
 * the first time it is asked about, and kept. Faces are grown as planarFaceCentre grows them: the triangles in the
 * plane of the first one, joined where they share a corner. Null for a mesh above `maxTriangles` or without size.
 */
export function planarFaces(
  positions: ArrayLike<number>,
  index: ArrayLike<number> | null,
  maxTriangles = 2_000_000,
): { faceOf: (triangle: number) => PlanarFace | null } | null {
  const triangleCount = Math.floor((index ? index.length : positions.length / 3) / 3);
  const vertexCount = Math.floor(positions.length / 3);
  if (triangleCount === 0 || triangleCount > maxTriangles) return null;
  const vertexOf = (tri: number, corner: number) => (index ? index[tri * 3 + corner] : tri * 3 + corner);

  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  for (let vertex = 0; vertex < vertexCount; vertex += 1) {
    const x = positions[vertex * 3];
    const y = positions[vertex * 3 + 1];
    const z = positions[vertex * 3 + 2];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  const extent = Math.max(maxX - minX, maxY - minY, maxZ - minZ);
  if (!(extent > 0)) return null;
  const planeTolerance = extent * 1e-5;

  // Corners closer than a hundred-thousandth of the mesh count as one. Each axis then needs at most 17 bits, so the
  // three make one number as the key, kept in a table of its own: with a text key, or even a Map, for each of the
  // million corners of an imported mesh, this took longer than all the rest.
  const cell = extent * 1e-5;
  const welded = new Int32Array(vertexCount);
  let size = 1024;
  while (size < vertexCount * 2) size *= 2;
  const slots = new Float64Array(size).fill(-1);
  const slotIds = new Int32Array(size);
  let cornerIds = 0;
  for (let vertex = 0; vertex < vertexCount; vertex += 1) {
    const qx = Math.round((positions[vertex * 3] - minX) / cell);
    const qy = Math.round((positions[vertex * 3 + 1] - minY) / cell);
    const qz = Math.round((positions[vertex * 3 + 2] - minZ) / cell);
    const key = (qx * 131072 + qy) * 131072 + qz;
    let slot = (Math.imul(qx, 73856093) ^ Math.imul(qy, 19349663) ^ Math.imul(qz, 83492791)) & (size - 1);
    while (slots[slot] !== -1 && slots[slot] !== key) slot = (slot + 1) & (size - 1);
    if (slots[slot] === -1) {
      slots[slot] = key;
      slotIds[slot] = cornerIds++;
    }
    welded[vertex] = slotIds[slot];
  }

  const normals = new Float64Array(triangleCount * 3);
  const areas = new Float64Array(triangleCount);
  const corners = new Int32Array(triangleCount * 3);
  // The triangles at each corner, one run per corner in a single array: `atCornerStart[id]` up to `atCornerStart[id + 1]`.
  const atCornerStart = new Int32Array(cornerIds + 1);
  for (let tri = 0; tri < triangleCount; tri += 1) {
    const a = vertexOf(tri, 0);
    const b = vertexOf(tri, 1);
    const c = vertexOf(tri, 2);
    const ux = positions[b * 3] - positions[a * 3];
    const uy = positions[b * 3 + 1] - positions[a * 3 + 1];
    const uz = positions[b * 3 + 2] - positions[a * 3 + 2];
    const vx = positions[c * 3] - positions[a * 3];
    const vy = positions[c * 3 + 1] - positions[a * 3 + 1];
    const vz = positions[c * 3 + 2] - positions[a * 3 + 2];
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    const length = Math.hypot(nx, ny, nz);
    areas[tri] = length / 2;
    if (length > 0) {
      normals[tri * 3] = nx / length;
      normals[tri * 3 + 1] = ny / length;
      normals[tri * 3 + 2] = nz / length;
    }
    for (let corner = 0; corner < 3; corner += 1) {
      const id = welded[vertexOf(tri, corner)];
      corners[tri * 3 + corner] = id;
      atCornerStart[id + 1] += 1;
    }
  }
  for (let id = 0; id < cornerIds; id += 1) atCornerStart[id + 1] += atCornerStart[id];
  const atCorner = new Int32Array(triangleCount * 3);
  const filled = atCornerStart.slice(0, cornerIds);
  for (let slot = 0; slot < triangleCount * 3; slot += 1) atCorner[filled[corners[slot]]++] = Math.floor(slot / 3);

  const regionOf = new Int32Array(triangleCount).fill(-1);
  const regions: Array<{ face: PlanarFace; triangles: number[]; checked: boolean }> = [];

  const grow = (seed: number) => {
    const region = regions.length;
    const hx = normals[seed * 3];
    const hy = normals[seed * 3 + 1];
    const hz = normals[seed * 3 + 2];
    const first = vertexOf(seed, 0);
    const offset = hx * positions[first * 3] + hy * positions[first * 3 + 1] + hz * positions[first * 3 + 2];
    const inPlane = (tri: number) => {
      if (!(areas[tri] > 0)) return false;
      if (normals[tri * 3] * hx + normals[tri * 3 + 1] * hy + normals[tri * 3 + 2] * hz < 0.9999) return false;
      for (let corner = 0; corner < 3; corner += 1) {
        const vertex = vertexOf(tri, corner);
        if (Math.abs(hx * positions[vertex * 3] + hy * positions[vertex * 3 + 1] + hz * positions[vertex * 3 + 2] - offset) > planeTolerance) return false;
      }
      return true;
    };
    const triangles = [seed];
    regionOf[seed] = region;
    let area = 0;
    let sx = 0;
    let sy = 0;
    let sz = 0;
    for (let next = 0; next < triangles.length; next += 1) {
      const tri = triangles[next];
      const a = vertexOf(tri, 0);
      const b = vertexOf(tri, 1);
      const c = vertexOf(tri, 2);
      area += areas[tri];
      sx += areas[tri] * (positions[a * 3] + positions[b * 3] + positions[c * 3]) / 3;
      sy += areas[tri] * (positions[a * 3 + 1] + positions[b * 3 + 1] + positions[c * 3 + 1]) / 3;
      sz += areas[tri] * (positions[a * 3 + 2] + positions[b * 3 + 2] + positions[c * 3 + 2]) / 3;
      for (let corner = 0; corner < 3; corner += 1) {
        const id = corners[tri * 3 + corner];
        for (let slot = atCornerStart[id]; slot < atCornerStart[id + 1]; slot += 1) {
          const neighbour = atCorner[slot];
          if (regionOf[neighbour] !== -1 || !inPlane(neighbour)) continue;
          regionOf[neighbour] = region;
          triangles.push(neighbour);
        }
      }
    }
    regions.push({ face: { centre: [sx / area, sy / area, sz / area], normal: [hx, hy, hz], area, curved: false }, triangles, checked: false });
    return region;
  };

  return {
    faceOf(triangle: number) {
      if (!(triangle >= 0 && triangle < triangleCount) || !(areas[triangle] > 0)) return null;
      const region = regionOf[triangle] >= 0 ? regionOf[triangle] : grow(triangle);
      const entry = regions[region];
      if (!entry.checked) {
        // Only the neighbours that turn away slightly are grown into faces of their own, to weigh them.
        entry.checked = true;
        const [hx, hy, hz] = entry.face.normal;
        const seen = new Set<number>([region]);
        let smooth = 0;
        for (let next = 0; next < entry.triangles.length && smooth < entry.face.area / 2; next += 1) {
          const tri = entry.triangles[next];
          for (let corner = 0; corner < 3; corner += 1) {
            const id = corners[tri * 3 + corner];
            for (let slot = atCornerStart[id]; slot < atCornerStart[id + 1]; slot += 1) {
              const neighbour = atCorner[slot];
              if (seen.has(regionOf[neighbour]) || !(areas[neighbour] > 0)) continue;
              if (normals[neighbour * 3] * hx + normals[neighbour * 3 + 1] * hy + normals[neighbour * 3 + 2] * hz <= SMOOTH_TURN) continue;
              const other = regionOf[neighbour] >= 0 ? regionOf[neighbour] : grow(neighbour);
              seen.add(other);
              smooth += regions[other].face.area;
            }
          }
        }
        entry.face.curved = smooth >= entry.face.area / 2;
      }
      return entry.face;
    },
  };
}
