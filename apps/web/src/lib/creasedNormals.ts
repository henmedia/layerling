import * as THREE from "three";

/**
 * The same as three's toCreasedNormals (BufferGeometryUtils): smooth across a corner where the
 * faces meet flatter than the crease angle, sharp where they meet steeper. three's version builds
 * a text key for every corner twice and a vector for every face, which took 0.57 s for a hollow
 * Voronoi vase of 200,000 triangles and 1.7 s for a fine one - nearly three times as long as
 * building it. This one finds the corners at one place once per vertex and keeps the face normals
 * in one array; the normals come out the same (tests/unit/creasedNormals.test.ts).
 */
export function toCreasedNormals(geometry: THREE.BufferGeometry, creaseAngle = Math.PI / 3) {
  const creaseDot = Math.cos(creaseAngle);
  const hashMultiplier = (1 + 1e-10) * 1e2;
  const index = geometry.index;
  const sourcePositions = geometry.getAttribute("position");
  const result = index ? geometry.toNonIndexed() : geometry;
  const positions = result.getAttribute("position");
  const cornerCount = positions.count - (positions.count % 3);
  const triangleCount = cornerCount / 3;

  // Which place each corner sits at: corners of one place share their faces' normals, as in three.
  const placeOfVertex = new Int32Array(sourcePositions.count).fill(-1);
  const places = new Map<string, number>();
  const placeOfSource = (vertex: number) => {
    let place = placeOfVertex[vertex];
    if (place >= 0) return place;
    const key = `${~~(sourcePositions.getX(vertex) * hashMultiplier)},${~~(sourcePositions.getY(vertex) * hashMultiplier)},${~~(sourcePositions.getZ(vertex) * hashMultiplier)}`;
    place = places.get(key) ?? places.size;
    if (place === places.size) places.set(key, place);
    placeOfVertex[vertex] = place;
    return place;
  };
  const cornerPlace = new Int32Array(cornerCount);
  for (let corner = 0; corner < cornerCount; corner += 1) {
    cornerPlace[corner] = placeOfSource(index ? index.getX(corner) : corner);
  }

  const faceNormals = new Float64Array(triangleCount * 3);
  for (let triangle = 0; triangle < triangleCount; triangle += 1) {
    const a = triangle * 3;
    const ax = positions.getX(a), ay = positions.getY(a), az = positions.getZ(a);
    const bx = positions.getX(a + 1), by = positions.getY(a + 1), bz = positions.getZ(a + 1);
    const cx = positions.getX(a + 2), cy = positions.getY(a + 2), cz = positions.getZ(a + 2);
    // (c - b) x (a - b), as three takes it.
    const ux = cx - bx, uy = cy - by, uz = cz - bz;
    const vx = ax - bx, vy = ay - by, vz = az - bz;
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    const length = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    faceNormals[a] = nx / length;
    faceNormals[a + 1] = ny / length;
    faceNormals[a + 2] = nz / length;
  }

  // The faces at each place, as one list sorted by place.
  const placeStart = new Int32Array(places.size + 1);
  for (let corner = 0; corner < cornerCount; corner += 1) placeStart[cornerPlace[corner] + 1] += 1;
  for (let place = 0; place < places.size; place += 1) placeStart[place + 1] += placeStart[place];
  const filled = placeStart.slice(0, places.size);
  const facesAtPlace = new Int32Array(cornerCount);
  for (let corner = 0; corner < cornerCount; corner += 1) facesAtPlace[filled[cornerPlace[corner]]++] = (corner / 3) | 0;

  const normals = new Float32Array(positions.count * 3);
  for (let corner = 0; corner < cornerCount; corner += 1) {
    const own = ((corner / 3) | 0) * 3;
    const ox = faceNormals[own], oy = faceNormals[own + 1], oz = faceNormals[own + 2];
    const place = cornerPlace[corner];
    let sx = 0, sy = 0, sz = 0;
    for (let k = placeStart[place]; k < placeStart[place + 1]; k += 1) {
      const other = facesAtPlace[k] * 3;
      const fx = faceNormals[other], fy = faceNormals[other + 1], fz = faceNormals[other + 2];
      if (ox * fx + oy * fy + oz * fz > creaseDot) {
        sx += fx;
        sy += fy;
        sz += fz;
      }
    }
    const length = Math.sqrt(sx * sx + sy * sy + sz * sz) || 1;
    normals[corner * 3] = sx / length;
    normals[corner * 3 + 1] = sy / length;
    normals[corner * 3 + 2] = sz / length;
  }
  result.setAttribute("normal", new THREE.BufferAttribute(normals, 3, false));
  return result;
}
