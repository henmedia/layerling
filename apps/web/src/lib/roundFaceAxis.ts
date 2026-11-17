type Vec = { x: number; y: number; z: number };

/** The axis of a round face: a point on it (half way along the face), its direction and the radius. */
export type RoundFaceAxis = { point: Vec; direction: Vec; radius: number };

/** Neighbouring facets of one round face meet at less than this (a 7-sided hole still counts). */
const MAX_FACET_TURN = Math.cos((55 * Math.PI) / 180);
/** A facet belongs to the round face while its normal stands this square to the axis. */
const MAX_AXIS_LEAN = 0.2;
/** Facets closer to parallel than this are one flat strip, not a turn of the face. */
const SAME_FACET = Math.cos((1 * Math.PI) / 180);

/**
 * The round face a click landed on - the inside of a hole, the outside of a
 * pin - and its axis, from the triangles alone, so it works on imported meshes
 * as well as on layerling's own shapes.
 *
 * `positions` holds world-space triangles, nine numbers per triangle, as
 * `planarFaceTriangles` takes them. From the hit facet the face grows over
 * shared corners to neighbours that turn only a little and keep standing
 * square to the axis; a sharp rim, a chamfer or a flat face ends it. The axis
 * direction is the one all its normals stand square to, the centre the circle
 * that fits its corners best. Returns null for a flat face, or a curved one
 * that is not a part of a cylinder.
 */
export function roundFaceTriangles(positions: ArrayLike<number>, hitTriangle: number): { triangles: number[]; axis: RoundFaceAxis } | null {
  const triangleCount = Math.floor(positions.length / 9);
  if (hitTriangle < 0 || hitTriangle >= triangleCount) return null;

  const normals = new Float64Array(triangleCount * 3);
  const areas = new Float64Array(triangleCount);
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
    areas[triangle] = length / 2;
    if (length > 0) {
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
  if (!(areas[hitTriangle] > 0)) return null;
  extent = Math.max(extent, high[0] - low[0], high[1] - low[1], high[2] - low[2]);
  // Corners closer than this count as one; the mesh stores float32 positions.
  const weld = extent * 1e-6;
  const cornerKey = (triangle: number, corner: number) => {
    const o = triangle * 9 + corner * 3;
    return `${Math.round(positions[o] / weld)},${Math.round(positions[o + 1] / weld)},${Math.round(positions[o + 2] / weld)}`;
  };
  const trianglesAtCorner = new Map<string, number[]>();
  for (let triangle = 0; triangle < triangleCount; triangle += 1) {
    if (!(areas[triangle] > 0)) continue;
    for (let corner = 0; corner < 3; corner += 1) {
      const key = cornerKey(triangle, corner);
      const list = trianglesAtCorner.get(key);
      if (list) list.push(triangle);
      else trianglesAtCorner.set(key, [triangle]);
    }
  }
  const neighbours = (triangle: number) => {
    const found = new Set<number>();
    for (let corner = 0; corner < 3; corner += 1) {
      trianglesAtCorner.get(cornerKey(triangle, corner))?.forEach((other) => { if (other !== triangle) found.add(other); });
    }
    return found;
  };
  const dot = (a: number, b: number) =>
    normals[a * 3] * normals[b * 3] + normals[a * 3 + 1] * normals[b * 3 + 1] + normals[a * 3 + 2] * normals[b * 3 + 2];

  // The first guess of the axis comes from the neighbour that turns least, so a
  // chamfer at the rim (a bigger turn) does not set it.
  const strip = new Set<number>([hitTriangle]);
  const stripQueue = [hitTriangle];
  while (stripQueue.length) {
    const triangle = stripQueue.pop() as number;
    neighbours(triangle).forEach((other) => {
      if (!strip.has(other) && dot(other, hitTriangle) >= SAME_FACET) {
        strip.add(other);
        stripQueue.push(other);
      }
    });
  }
  let seed = -1;
  let seedDot = -Infinity;
  strip.forEach((triangle) => {
    neighbours(triangle).forEach((other) => {
      const turn = dot(other, hitTriangle);
      if (turn < SAME_FACET && turn >= MAX_FACET_TURN && turn > seedDot) {
        seed = other;
        seedDot = turn;
      }
    });
  });
  if (seed < 0) return null;
  let axis = normalize(cross(normalAt(normals, hitTriangle), normalAt(normals, seed)));
  if (!axis) return null;

  const grow = (direction: Vec) => {
    const square = (triangle: number) => Math.abs(normals[triangle * 3] * direction.x + normals[triangle * 3 + 1] * direction.y + normals[triangle * 3 + 2] * direction.z) <= MAX_AXIS_LEAN;
    const region = new Set<number>([hitTriangle]);
    const queue = [hitTriangle];
    while (queue.length) {
      const triangle = queue.pop() as number;
      neighbours(triangle).forEach((other) => {
        if (region.has(other) || dot(other, triangle) < MAX_FACET_TURN || !square(other)) return;
        region.add(other);
        queue.push(other);
      });
    }
    return [...region];
  };

  // Grow, refit the direction from every normal of the face, grow again with it.
  let triangles = grow(axis);
  for (let pass = 0; pass < 2; pass += 1) {
    const refined = leastNormalDirection(normals, areas, triangles, axis);
    if (!refined) return null;
    axis = refined;
    triangles = grow(axis);
  }
  const circle = fitCircle(positions, triangles, axis);
  if (!circle) return null;
  if (widestFacetSpan(positions, normals, triangles, circle) > MAX_FACET_SPAN) return null;
  return { triangles, axis: circle };
}

/**
 * How far round the axis a facet of a round face may reach. A facet of a cylinder spans as much as its normal turns to
 * the next one, at most MAX_FACET_TURN; a flat face beside a 45-degree chamfer spans far more (Discussion #1385: the
 * two faces of a tilted cube and the chamfer of its bottom edge have four corners on one circle, as every isosceles
 * trapezoid has, and were taken for a round wall).
 */
const MAX_FACET_SPAN = (60 * Math.PI) / 180;

/** The widest angle round the axis that one flat strip of the face covers, its triangles taken together. */
function widestFacetSpan(positions: ArrayLike<number>, normals: Float64Array, triangles: number[], axis: RoundFaceAxis) {
  const d = axis.direction;
  const strips: Array<{ normal: Vec; out: Vec; side: Vec; low: number; high: number }> = [];
  const fromAxis = (triangle: number, corner: number) => {
    const o = triangle * 9 + corner;
    return { x: positions[o] - axis.point.x, y: positions[o + 1] - axis.point.y, z: positions[o + 2] - axis.point.z };
  };
  for (const triangle of triangles) {
    const normal = normalAt(normals, triangle);
    let strip = strips.find((entry) => entry.normal.x * normal.x + entry.normal.y * normal.y + entry.normal.z * normal.z >= SAME_FACET);
    if (!strip) {
      // Angles round the axis measured from the way out to the strip (along its normal on a pin, against it in a
      // bore), so a strip never wraps across the seam.
      const first = fromAxis(triangle, 0);
      const sign = first.x * normal.x + first.y * normal.y + first.z * normal.z >= 0 ? 1 : -1;
      const out = { x: normal.x * sign, y: normal.y * sign, z: normal.z * sign };
      strip = { normal, out, side: cross(d, out), low: Infinity, high: -Infinity };
      strips.push(strip);
    }
    const { out, side } = strip;
    for (let corner = 0; corner < 9; corner += 3) {
      const { x: dx, y: dy, z: dz } = fromAxis(triangle, corner);
      const angle = Math.atan2(dx * side.x + dy * side.y + dz * side.z, dx * out.x + dy * out.y + dz * out.z);
      strip.low = Math.min(strip.low, angle);
      strip.high = Math.max(strip.high, angle);
    }
  }
  return strips.reduce((widest, strip) => Math.max(widest, strip.high - strip.low), 0);
}

function normalAt(normals: Float64Array, triangle: number): Vec {
  return { x: normals[triangle * 3], y: normals[triangle * 3 + 1], z: normals[triangle * 3 + 2] };
}

function cross(a: Vec, b: Vec): Vec {
  return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
}

function normalize(value: Vec): Vec | null {
  const length = Math.hypot(value.x, value.y, value.z);
  return length > 1e-9 ? { x: value.x / length, y: value.y / length, z: value.z / length } : null;
}

/**
 * The direction the normals of the face stand most square to: the eigenvector
 * of the smallest eigenvalue of their area-weighted scatter, found by power
 * iteration on (trace - scatter) from the first guess. The normals must turn
 * through a real angle, or the direction is not defined.
 */
function leastNormalDirection(normals: Float64Array, areas: Float64Array, triangles: number[], guess: Vec): Vec | null {
  const m = [0, 0, 0, 0, 0, 0]; // xx, xy, xz, yy, yz, zz
  let weight = 0;
  triangles.forEach((triangle) => {
    const a = areas[triangle];
    const x = normals[triangle * 3];
    const y = normals[triangle * 3 + 1];
    const z = normals[triangle * 3 + 2];
    m[0] += a * x * x; m[1] += a * x * y; m[2] += a * x * z;
    m[3] += a * y * y; m[4] += a * y * z; m[5] += a * z * z;
    weight += a;
  });
  if (!(weight > 0)) return null;
  const trace = m[0] + m[3] + m[5];
  let v = guess;
  for (let step = 0; step < 60; step += 1) {
    const next = normalize({
      x: trace * v.x - (m[0] * v.x + m[1] * v.y + m[2] * v.z),
      y: trace * v.y - (m[1] * v.x + m[3] * v.y + m[4] * v.z),
      z: trace * v.z - (m[2] * v.x + m[4] * v.y + m[5] * v.z),
    });
    if (!next) return null;
    v = next;
  }
  // How far the normals stray from the plane square to v, and how widely they turn in it.
  const along = (m[0] * v.x * v.x + m[3] * v.y * v.y + m[5] * v.z * v.z + 2 * (m[1] * v.x * v.y + m[2] * v.x * v.z + m[4] * v.y * v.z)) / weight;
  if (along > 0.002) return null;
  return v;
}

/** The circle across the axis that fits the face's corners best (a least-squares fit), or null if they do not lie on one. */
function fitCircle(positions: ArrayLike<number>, triangles: number[], axis: Vec): RoundFaceAxis | null {
  const helper = Math.abs(axis.x) < 0.9 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
  const u = normalize(cross(axis, helper)) as Vec;
  const v = cross(axis, u);
  const points: [number, number][] = [];
  let alongMin = Infinity;
  let alongMax = -Infinity;
  triangles.forEach((triangle) => {
    for (let corner = 0; corner < 9; corner += 3) {
      const o = triangle * 9 + corner;
      const x = positions[o];
      const y = positions[o + 1];
      const z = positions[o + 2];
      points.push([x * u.x + y * u.y + z * u.z, x * v.x + y * v.y + z * v.z]);
      const along = x * axis.x + y * axis.y + z * axis.z;
      alongMin = Math.min(alongMin, along);
      alongMax = Math.max(alongMax, along);
    }
  });
  // Centre the numbers first, so a hole far from the origin keeps its precision.
  const meanA = points.reduce((sum, [a]) => sum + a, 0) / points.length;
  const meanB = points.reduce((sum, [, b]) => sum + b, 0) / points.length;
  // x² + y² + D x + E y + F = 0 by least squares (Kasa).
  const n = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  const r = [0, 0, 0];
  points.forEach(([pa, pb]) => {
    const a = pa - meanA;
    const b = pb - meanB;
    const row = [a, b, 1];
    const rhs = -(a * a + b * b);
    for (let i = 0; i < 3; i += 1) {
      r[i] += row[i] * rhs;
      for (let j = 0; j < 3; j += 1) n[i * 3 + j] += row[i] * row[j];
    }
  });
  const solved = solve3(n, r);
  if (!solved) return null;
  const [d, e, f] = solved;
  const ca = -d / 2;
  const cb = -e / 2;
  const radiusSquared = ca * ca + cb * cb - f;
  if (!(radiusSquared > 0)) return null;
  const radius = Math.sqrt(radiusSquared);
  let error = 0;
  points.forEach(([pa, pb]) => {
    error = Math.max(error, Math.abs(Math.hypot(pa - meanA - ca, pb - meanB - cb) - radius));
  });
  // The corners of a faceted round lie on its circle; one percent covers float32 positions.
  if (error > Math.max(radius * 0.01, 1e-4)) return null;
  const centreA = ca + meanA;
  const centreB = cb + meanB;
  const middle = (alongMin + alongMax) / 2;
  return {
    point: {
      x: u.x * centreA + v.x * centreB + axis.x * middle,
      y: u.y * centreA + v.y * centreB + axis.y * middle,
      z: u.z * centreA + v.z * centreB + axis.z * middle,
    },
    direction: axis,
    radius,
  };
}

function solve3(m: number[], r: number[]): [number, number, number] | null {
  const det = (a: number[]) =>
    a[0] * (a[4] * a[8] - a[5] * a[7]) - a[1] * (a[3] * a[8] - a[5] * a[6]) + a[2] * (a[3] * a[7] - a[4] * a[6]);
  const whole = det(m);
  if (Math.abs(whole) < 1e-18) return null;
  const column = (index: number) => m.map((value, slot) => (slot % 3 === index ? r[Math.floor(slot / 3)] : value));
  return [det(column(0)) / whole, det(column(1)) / whole, det(column(2)) / whole];
}

function distanceToAxis(axis: RoundFaceAxis, point: Vec) {
  const dx = point.x - axis.point.x;
  const dy = point.y - axis.point.y;
  const dz = point.z - axis.point.z;
  const along = dx * axis.direction.x + dy * axis.direction.y + dz * axis.direction.z;
  return Math.hypot(dx - along * axis.direction.x, dy - along * axis.direction.y, dz - along * axis.direction.z);
}

/** How many of the facets nearest a point are tried before giving up. */
const NEAR_TRIES = 400;

/**
 * The round face nearest a point, for the MCP action that names a face by a
 * point instead of a click: the facets are tried from the nearest out, and
 * flat ones skipped, so a point on a hole's axis finds the hole's wall even
 * when the top of a thin plate lies closer.
 */
export function roundFaceNear(mesh: { vertices: readonly (readonly number[])[]; faces: readonly (readonly number[])[] }, point: Vec): RoundFaceAxis | null {
  const positions = new Float64Array(mesh.faces.length * 9);
  mesh.faces.forEach((face, triangle) => {
    for (let corner = 0; corner < 3; corner += 1) {
      const vertex = mesh.vertices[face[corner]];
      positions[triangle * 9 + corner * 3] = vertex[0];
      positions[triangle * 9 + corner * 3 + 1] = vertex[1];
      positions[triangle * 9 + corner * 3 + 2] = vertex[2];
    }
  });
  const distances = mesh.faces.map((_, triangle) => {
    const o = triangle * 9;
    const cx = (positions[o] + positions[o + 3] + positions[o + 6]) / 3 - point.x;
    const cy = (positions[o + 1] + positions[o + 4] + positions[o + 7]) / 3 - point.y;
    const cz = (positions[o + 2] + positions[o + 5] + positions[o + 8]) / 3 - point.z;
    return { triangle, distance: cx * cx + cy * cy + cz * cz };
  });
  distances.sort((a, b) => a.distance - b.distance);
  const tried = new Set<number>();
  for (const { triangle } of distances.slice(0, NEAR_TRIES)) {
    if (tried.has(triangle)) continue;
    const round = roundFaceTriangles(positions, triangle);
    // Only a round face the point belongs to: on its wall, inside it or on its axis, not one across the part.
    if (round && distanceToAxis(round.axis, point) <= round.axis.radius + Math.max(1, round.axis.radius * 0.5)) return round.axis;
    round?.triangles.forEach((member) => tried.add(member));
    tried.add(triangle);
  }
  return null;
}
