/*
 * Analytic surfaces fitted to the corners of a triangle mesh: plane, cylinder, cone, sphere and torus, the surfaces a
 * CAD program's STL is made of. A mesh exported from a CAD program has its corners on the real surface (a cylinder's
 * corners on the cylinder, to float precision); the triangles between them are chords. So the corners are what the
 * fits measure, and the triangles' normals only give the first guess and the side the surface faces.
 *
 * Every fit starts in closed form (an eigenvector, a linear least-squares solve) and is then refined by
 * Levenberg-Marquardt on the true distances of the points to the surface.
 */

export type V3 = [number, number, number];

export type PlaneSurface = { kind: "plane"; normal: V3; offset: number };
export type CylinderSurface = { kind: "cylinder"; origin: V3; axis: V3; radius: number };
/** One nappe: opening towards +axis from the apex, half the opening angle in radians. */
export type ConeSurface = { kind: "cone"; apex: V3; axis: V3; halfAngle: number };
export type SphereSurface = { kind: "sphere"; center: V3; radius: number };
/** The tube of radius `minor` round the circle of radius `major` about `axis` through `center`. */
export type TorusSurface = { kind: "torus"; center: V3; axis: V3; major: number; minor: number };
export type AnalyticSurface = PlaneSurface | CylinderSurface | ConeSurface | SphereSurface | TorusSurface;
export type SurfaceKind = AnalyticSurface["kind"];

export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const norm = (a: V3) => Math.hypot(a[0], a[1], a[2]);
export const unit = (a: V3): V3 => {
  const l = norm(a);
  return l > 0 ? [a[0] / l, a[1] / l, a[2] / l] : [0, 0, 1];
};

/** Two unit vectors at right angles to `axis` and to each other, the same every time for the same axis. */
export function perpendicularFrame(axis: V3): [V3, V3] {
  const a = unit(axis);
  const helper: V3 = Math.abs(a[0]) < 0.6 ? [1, 0, 0] : Math.abs(a[1]) < 0.6 ? [0, 1, 0] : [0, 0, 1];
  const x = unit(cross(helper, a));
  return [x, cross(a, x)];
}

/** Eigenvalues (ascending) and eigenvectors (columns, same order) of a symmetric 3x3 matrix, by Jacobi rotations. */
export function symmetricEigen(m: number[][]): { values: number[]; vectors: V3[] } {
  const a = m.map((row) => row.slice());
  const v = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  for (let sweep = 0; sweep < 50; sweep += 1) {
    const off = Math.abs(a[0][1]) + Math.abs(a[0][2]) + Math.abs(a[1][2]);
    if (off < 1e-30) break;
    for (const [p, q] of [[0, 1], [0, 2], [1, 2]] as const) {
      if (Math.abs(a[p][q]) < 1e-300) continue;
      const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
      const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
      const c = 1 / Math.sqrt(t * t + 1);
      const s = t * c;
      for (let k = 0; k < 3; k += 1) {
        const akp = a[k][p], akq = a[k][q];
        a[k][p] = c * akp - s * akq;
        a[k][q] = s * akp + c * akq;
      }
      for (let k = 0; k < 3; k += 1) {
        const apk = a[p][k], aqk = a[q][k];
        a[p][k] = c * apk - s * aqk;
        a[q][k] = s * apk + c * aqk;
      }
      for (let k = 0; k < 3; k += 1) {
        const vkp = v[k][p], vkq = v[k][q];
        v[k][p] = c * vkp - s * vkq;
        v[k][q] = s * vkp + c * vkq;
      }
    }
  }
  const order = [0, 1, 2].sort((i, j) => a[i][i] - a[j][j]);
  return { values: order.map((i) => a[i][i]), vectors: order.map((i) => unit([v[0][i], v[1][i], v[2][i]])) };
}

/** Solves the small dense system A x = b (Gaussian elimination with pivoting); null when it is singular. */
export function solveLinear(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const m = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    for (let row = col + 1; row < n; row += 1) if (Math.abs(m[row][col]) > Math.abs(m[pivot][col])) pivot = row;
    if (Math.abs(m[pivot][col]) < 1e-14) return null;
    [m[col], m[pivot]] = [m[pivot], m[col]];
    for (let row = 0; row < n; row += 1) {
      if (row === col) continue;
      const f = m[row][col] / m[col][col];
      if (f === 0) continue;
      for (let k = col; k <= n; k += 1) m[row][k] -= f * m[col][k];
    }
  }
  return m.map((row, i) => row[n] / row[i]);
}

function centroid(points: V3[]): V3 {
  const c: V3 = [0, 0, 0];
  for (const p of points) { c[0] += p[0]; c[1] += p[1]; c[2] += p[2]; }
  return scale(c, 1 / Math.max(1, points.length));
}

function covariance(points: V3[], center: V3) {
  const m = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (const p of points) {
    const d = sub(p, center);
    for (let i = 0; i < 3; i += 1) for (let j = 0; j < 3; j += 1) m[i][j] += d[i] * d[j];
  }
  return m;
}

/** Signed distance: positive on the side the surface's own normal points to (outside a cylinder, cone, sphere, torus). */
export function surfaceDistance(s: AnalyticSurface, p: V3): number {
  switch (s.kind) {
    case "plane":
      return dot(s.normal, p) - s.offset;
    case "cylinder": {
      const d = sub(p, s.origin);
      const h = dot(d, s.axis);
      return norm(sub(d, scale(s.axis, h))) - s.radius;
    }
    case "sphere":
      return norm(sub(p, s.center)) - s.radius;
    case "cone": {
      const d = sub(p, s.apex);
      const h = dot(d, s.axis);
      const rho = norm(sub(d, scale(s.axis, h)));
      return rho * Math.cos(s.halfAngle) - h * Math.sin(s.halfAngle);
    }
    case "torus": {
      const d = sub(p, s.center);
      const h = dot(d, s.axis);
      const rho = norm(sub(d, scale(s.axis, h)));
      return Math.hypot(rho - s.major, h) - s.minor;
    }
  }
}

/** The unit normal of the surface nearest `p`, pointing the way the distance grows. */
export function surfaceNormal(s: AnalyticSurface, p: V3): V3 {
  switch (s.kind) {
    case "plane":
      return s.normal;
    case "cylinder": {
      const d = sub(p, s.origin);
      return unit(sub(d, scale(s.axis, dot(d, s.axis))));
    }
    case "sphere":
      return unit(sub(p, s.center));
    case "cone": {
      const d = sub(p, s.apex);
      const h = dot(d, s.axis);
      const radial = unit(sub(d, scale(s.axis, h)));
      return unit(sub(scale(radial, Math.cos(s.halfAngle)), scale(s.axis, Math.sin(s.halfAngle))));
    }
    case "torus": {
      const d = sub(p, s.center);
      const h = dot(d, s.axis);
      const radial = unit(sub(d, scale(s.axis, h)));
      const spine = add(s.center, scale(radial, s.major));
      return unit(sub(p, spine));
    }
  }
}

export function fitPlane(points: V3[]): PlaneSurface {
  const c = centroid(points);
  const { vectors } = symmetricEigen(covariance(points, c));
  const normal = vectors[0];
  return { kind: "plane", normal, offset: dot(normal, c) };
}

/** Kasa's algebraic circle fit in the plane of `u`, `v` through `origin`: centre (3D) and radius. */
function fitCircleInPlane(points: V3[], origin: V3, u: V3, v: V3): { center: V3; radius: number } | null {
  // x^2 + y^2 + D x + E y + F = 0
  const AtA = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const Atb = [0, 0, 0];
  for (const p of points) {
    const d = sub(p, origin);
    const x = dot(d, u), y = dot(d, v);
    const row = [x, y, 1];
    const rhs = -(x * x + y * y);
    for (let i = 0; i < 3; i += 1) {
      Atb[i] += row[i] * rhs;
      for (let j = 0; j < 3; j += 1) AtA[i][j] += row[i] * row[j];
    }
  }
  const sol = solveLinear(AtA, Atb);
  if (!sol) return null;
  const cx = -sol[0] / 2, cy = -sol[1] / 2;
  const r2 = cx * cx + cy * cy - sol[2];
  if (!(r2 > 0)) return null;
  return { center: add(origin, add(scale(u, cx), scale(v, cy))), radius: Math.sqrt(r2) };
}

/** A circle through points in 3D: its plane, centre and radius, and how far the points are off it at most. */
export function fitCircle3D(points: V3[]): { center: V3; normal: V3; radius: number; error: number } | null {
  if (points.length < 3) return null;
  const plane = fitPlane(points);
  const [u, v] = perpendicularFrame(plane.normal);
  const origin = centroid(points);
  const circle = fitCircleInPlane(points, origin, u, v);
  if (!circle) return null;
  let error = 0;
  for (const p of points) {
    const off = dot(sub(p, origin), plane.normal);
    const inPlane = sub(sub(p, scale(plane.normal, off)), circle.center);
    error = Math.max(error, Math.hypot(norm(inPlane) - circle.radius, off));
  }
  return { center: circle.center, normal: plane.normal, radius: circle.radius, error };
}

/**
 * How close a closed-form fit must come before it is refined: refinement makes a good start exact, it does not
 * rescue a bad one. Infinity refines always.
 */
export type FitOptions = { gate?: number; iterations?: number };

function gated<S extends AnalyticSurface>(start: S, points: V3[], options: FitOptions): S | null {
  if (options.gate !== undefined && maxDistance(start, points) > options.gate) return null;
  return refine(start, points, options.iterations ?? 25);
}

export function fitSphere(points: V3[], options: FitOptions = {}): SphereSurface | null {
  // x^2+y^2+z^2 + D x + E y + F z + G = 0
  const AtA = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
  const Atb = [0, 0, 0, 0];
  const c0 = centroid(points);
  for (const p of points) {
    const d = sub(p, c0);
    const row = [d[0], d[1], d[2], 1];
    const rhs = -dot(d, d);
    for (let i = 0; i < 4; i += 1) {
      Atb[i] += row[i] * rhs;
      for (let j = 0; j < 4; j += 1) AtA[i][j] += row[i] * row[j];
    }
  }
  const sol = solveLinear(AtA, Atb);
  if (!sol) return null;
  const center: V3 = [-sol[0] / 2, -sol[1] / 2, -sol[2] / 2];
  const r2 = dot(center, center) - sol[3];
  if (!(r2 > 0)) return null;
  return gated({ kind: "sphere", center: add(c0, center), radius: Math.sqrt(r2) }, points, options);
}

export function fitCylinder(points: V3[], normals: V3[], options: FitOptions = {}): CylinderSurface | null {
  // The normals of a cylinder are all at right angles to its axis.
  const m = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (const n of normals) for (let i = 0; i < 3; i += 1) for (let j = 0; j < 3; j += 1) m[i][j] += n[i] * n[j];
  const axis = symmetricEigen(m).vectors[0];
  const [u, v] = perpendicularFrame(axis);
  const c = centroid(points);
  const circle = fitCircleInPlane(points, c, u, v);
  if (!circle) return null;
  return gated({ kind: "cylinder", origin: circle.center, axis, radius: circle.radius }, points, options);
}

export function fitCone(points: V3[], normals: V3[], options: FitOptions = {}): ConeSurface | null {
  // The normals of a cone make one angle with its axis: their tips lie on a circle of the unit sphere, in a plane.
  const nc = centroid(normals);
  const { vectors } = symmetricEigen(covariance(normals, nc));
  let axis = vectors[0];
  const c = dot(nc, axis);
  if (Math.abs(c) < 1e-3) return null; // a cylinder
  // The apex lies in every tangent plane: n . (x - p) = 0 for all of them.
  const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const b = [0, 0, 0];
  for (let k = 0; k < points.length; k += 1) {
    const n = normals[k];
    const np = dot(n, points[k]);
    for (let i = 0; i < 3; i += 1) {
      b[i] += n[i] * np;
      for (let j = 0; j < 3; j += 1) A[i][j] += n[i] * n[j];
    }
  }
  const apexSol = solveLinear(A, b);
  if (!apexSol) return null;
  const apex: V3 = [apexSol[0], apexSol[1], apexSol[2]];
  let sumH = 0;
  for (const p of points) sumH += dot(sub(p, apex), axis);
  if (sumH < 0) axis = scale(axis, -1);
  let sumAngle = 0;
  for (const p of points) {
    const d = sub(p, apex);
    const h = dot(d, axis);
    sumAngle += Math.atan2(norm(sub(d, scale(axis, h))), h);
  }
  const halfAngle = sumAngle / points.length;
  if (!(halfAngle > 1e-3 && halfAngle < Math.PI / 2 - 1e-3)) return null;
  return gated({ kind: "cone", apex, axis, halfAngle }, points, options);
}

/**
 * The torus: each point less its tube radius along its normal lies on the spine circle. The tube radius is searched
 * for (both sides: a fillet on an outside or an inside edge), the spine fitted as a circle in 3D for each.
 */
export function fitTorus(points: V3[], normals: V3[], options: FitOptions = {}): TorusSurface | null {
  if (points.length < 7) return null;
  let extent = 0;
  const c0 = centroid(points);
  for (const p of points) extent = Math.max(extent, norm(sub(p, c0)));
  if (!(extent > 0)) return null;
  const spineFor = (r: number) => fitCircle3D(points.map((p, k) => sub(p, scale(normals[k], r))));
  const errorFor = (r: number) => spineFor(r)?.error ?? Infinity;
  let best: { r: number; e: number } | null = null;
  for (const sign of [1, -1]) {
    let lo = sign * extent * 1e-3, hi = sign * extent * 4;
    // Golden-section search for the tube radius with the roundest spine.
    const g = (Math.sqrt(5) - 1) / 2;
    let x1 = hi - g * (hi - lo), x2 = lo + g * (hi - lo);
    let f1 = errorFor(x1), f2 = errorFor(x2);
    for (let it = 0; it < 60; it += 1) {
      if (f1 < f2) { hi = x2; x2 = x1; f2 = f1; x1 = hi - g * (hi - lo); f1 = errorFor(x1); }
      else { lo = x1; x1 = x2; f1 = f2; x2 = lo + g * (hi - lo); f2 = errorFor(x2); }
    }
    const r = (lo + hi) / 2;
    const e = errorFor(r);
    if (!best || e < best.e) best = { r, e };
  }
  if (!best) return null;
  const spine = spineFor(best.r);
  if (!spine) return null;
  const minor = Math.abs(best.r);
  if (!(minor > 0) || !(spine.radius > 0)) return null;
  return gated({ kind: "torus", center: spine.center, axis: spine.normal, major: spine.radius, minor }, points, options);
}

/** The surface's free parameters as a vector, for Levenberg-Marquardt, and back. */
function toParams(s: AnalyticSurface): number[] {
  const angles = (a: V3) => [Math.atan2(Math.hypot(a[0], a[1]), a[2]), Math.atan2(a[1], a[0])];
  switch (s.kind) {
    case "plane": return [];
    case "cylinder": return [...s.origin, ...angles(s.axis), s.radius];
    case "cone": return [...s.apex, ...angles(s.axis), s.halfAngle];
    case "sphere": return [...s.center, s.radius];
    case "torus": return [...s.center, ...angles(s.axis), s.major, s.minor];
  }
}

function fromParams(kind: SurfaceKind, x: number[]): AnalyticSurface {
  const axis = (theta: number, phi: number): V3 => [Math.sin(theta) * Math.cos(phi), Math.sin(theta) * Math.sin(phi), Math.cos(theta)];
  switch (kind) {
    case "cylinder": return { kind, origin: [x[0], x[1], x[2]], axis: axis(x[3], x[4]), radius: Math.abs(x[5]) };
    case "cone": return { kind, apex: [x[0], x[1], x[2]], axis: axis(x[3], x[4]), halfAngle: x[5] };
    case "sphere": return { kind, center: [x[0], x[1], x[2]], radius: Math.abs(x[3]) };
    case "torus": return { kind, center: [x[0], x[1], x[2]], axis: axis(x[3], x[4]), major: Math.abs(x[5]), minor: Math.abs(x[6]) };
    default: throw new Error(`no parameters for ${kind}`);
  }
}

/** At most this many points go into a refinement: an even pick of them, the same every time. */
const REFINE_POINTS = 240;

/** Levenberg-Marquardt on the points' distances to the surface; the start when it does not get better. */
export function refine<S extends AnalyticSurface>(start: S, allPoints: V3[], iterations = 25): S {
  if (start.kind === "plane") return start;
  const step = Math.max(1, Math.floor(allPoints.length / REFINE_POINTS));
  const points = step > 1 ? allPoints.filter((_, i) => i % step === 0) : allPoints;
  let x = toParams(start);
  const residuals = (params: number[]) => {
    const s = fromParams(start.kind, params);
    return points.map((p) => surfaceDistance(s, p));
  };
  const cost = (r: number[]) => r.reduce((sum, v) => sum + v * v, 0);
  let r = residuals(x);
  let current = cost(r);
  let lambda = 1e-3;
  const n = x.length;
  for (let it = 0; it < iterations && current > 1e-24; it += 1) {
    const J: number[][] = points.map(() => new Array(n).fill(0));
    for (let k = 0; k < n; k += 1) {
      const h = Math.max(1e-7, Math.abs(x[k]) * 1e-7);
      const xp = x.slice(); xp[k] += h;
      const xm = x.slice(); xm[k] -= h;
      const rp = residuals(xp), rm = residuals(xm);
      for (let i = 0; i < points.length; i += 1) J[i][k] = (rp[i] - rm[i]) / (2 * h);
    }
    const JtJ = Array.from({ length: n }, () => new Array(n).fill(0));
    const Jtr = new Array(n).fill(0);
    for (let i = 0; i < points.length; i += 1) {
      for (let a = 0; a < n; a += 1) {
        Jtr[a] += J[i][a] * r[i];
        for (let b = 0; b < n; b += 1) JtJ[a][b] += J[i][a] * J[i][b];
      }
    }
    let improved = false;
    for (let tries = 0; tries < 8 && !improved; tries += 1) {
      const A = JtJ.map((row, a) => row.map((v, b) => (a === b ? v * (1 + lambda) + 1e-12 : v)));
      const delta = solveLinear(A, Jtr.map((v) => -v));
      if (!delta) { lambda *= 10; continue; }
      const candidate = x.map((v, k) => v + delta[k]);
      const rc = residuals(candidate);
      const cc = cost(rc);
      if (Number.isFinite(cc) && cc < current) {
        x = candidate; r = rc; current = cc; lambda = Math.max(1e-9, lambda / 4); improved = true;
      } else {
        lambda *= 8;
      }
    }
    if (!improved) break;
  }
  const result = fromParams(start.kind, x) as S;
  return normalizeSurface(result);
}

/** Axis directions made unique (a cylinder's axis could point either way), the origin of a cylinder nearest 0. */
function normalizeSurface<S extends AnalyticSurface>(s: S): S {
  if (s.kind === "cylinder") {
    const axis = s.axis;
    const flip = axis[2] < -1e-9 || (Math.abs(axis[2]) <= 1e-9 && (axis[1] < -1e-9 || (Math.abs(axis[1]) <= 1e-9 && axis[0] < 0)));
    const a = flip ? scale(axis, -1) : axis;
    const origin = sub(s.origin, scale(a, dot(s.origin, a)));
    return { ...s, axis: a, origin };
  }
  if (s.kind === "torus") {
    const flip = s.axis[2] < -1e-9 || (Math.abs(s.axis[2]) <= 1e-9 && (s.axis[1] < -1e-9 || (Math.abs(s.axis[1]) <= 1e-9 && s.axis[0] < 0)));
    return flip ? { ...s, axis: scale(s.axis, -1) } : s;
  }
  return s;
}

/** The largest distance of the points from the surface. */
export function maxDistance(s: AnalyticSurface, points: V3[]): number {
  let worst = 0;
  for (const p of points) worst = Math.max(worst, Math.abs(surfaceDistance(s, p)));
  return worst;
}

/** Whether two fitted surfaces are the same one, to within `tolerance` on the points of either. */
export function sameSurface(a: AnalyticSurface, b: AnalyticSurface, pointsA: V3[], pointsB: V3[], tolerance: number) {
  if (a.kind !== b.kind) return false;
  return maxDistance(a, pointsB) <= tolerance && maxDistance(b, pointsA) <= tolerance;
}
