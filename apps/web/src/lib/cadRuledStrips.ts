import type { Mesh, OcctKernel, ShapeHandle, Vec3 } from "occt-wasm";
import { cadTriangleFaces } from "@/lib/cadFacePick";

/**
 * Straight strips on the side of an extruded body (#1696).
 *
 * OCCT meshes the side of an extruded curve (a surface of linear extrusion) like any free-form surface: it sets
 * points at many heights inside the face, spread unevenly, and joins them across. A Bezier dip 5 mm wide and 1 mm deep,
 * extruded 20 mm, got points at 32 heights, and its triangles leaned up to 9.5 degrees off the straight lines the
 * surface is made of. The mesh stays within the chord limit, but every slicer and the view show the leaning triangles
 * as a crumpled surface. Such a side is ruled: straight lines from the bottom curve to the top curve. Meshed as strips
 * along those lines, with exactly the points the kernel set on the face's border, it is as close to the surface as
 * before (the border carries the chord limit) and every triangle stands straight.
 *
 * Only a face that is plainly such a patch is changed: an extrusion surface with four edges, two of them parallel
 * straight lines of the same length. Anything else keeps the kernel's triangles, so the mesh only gets better.
 */

const HASH_UPPER_BOUND = 2_147_483_647;

type Point = readonly [number, number, number];

function pointAt(positions: ArrayLike<number>, vertex: number): Point {
  return [positions[vertex * 3], positions[vertex * 3 + 1], positions[vertex * 3 + 2]];
}

function distance(a: Point, b: Point) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function areaVector(positions: ArrayLike<number>, triangles: ArrayLike<number>): Point {
  let x = 0;
  let y = 0;
  let z = 0;
  for (let corner = 0; corner + 2 < triangles.length; corner += 3) {
    const a = pointAt(positions, triangles[corner]);
    const b = pointAt(positions, triangles[corner + 1]);
    const c = pointAt(positions, triangles[corner + 2]);
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    x += u[1] * v[2] - u[2] * v[1];
    y += u[2] * v[0] - u[0] * v[2];
    z += u[0] * v[1] - u[1] * v[0];
  }
  return [x / 2, y / 2, z / 2];
}

/** The border of one face's triangles as a single closed loop of vertices, in the face's own turning, or null. */
function borderLoop(triangles: ArrayLike<number>): number[] | null {
  const uses = new Map<string, number>();
  const key = (a: number, b: number) => (a < b ? `${a},${b}` : `${b},${a}`);
  for (let corner = 0; corner + 2 < triangles.length; corner += 3) {
    for (let side = 0; side < 3; side += 1) {
      const k = key(triangles[corner + side], triangles[corner + ((side + 1) % 3)]);
      uses.set(k, (uses.get(k) ?? 0) + 1);
    }
  }
  const next = new Map<number, number>();
  for (let corner = 0; corner + 2 < triangles.length; corner += 3) {
    for (let side = 0; side < 3; side += 1) {
      const a = triangles[corner + side];
      const b = triangles[corner + ((side + 1) % 3)];
      if (uses.get(key(a, b)) !== 1) continue;
      if (next.has(a)) return null;
      next.set(a, b);
    }
  }
  if (next.size < 4) return null;
  const start = next.keys().next().value as number;
  const loop = [start];
  for (let vertex = next.get(start); vertex !== start; vertex = next.get(vertex as number)) {
    if (vertex === undefined || loop.length > next.size) return null;
    loop.push(vertex);
  }
  return loop.length === next.size ? loop : null;
}

/** Each point's share of the way along the chain, by length. */
function shares(positions: ArrayLike<number>, chain: number[]) {
  const lengths = [0];
  for (let index = 1; index < chain.length; index += 1) {
    lengths.push(lengths[index - 1] + distance(pointAt(positions, chain[index - 1]), pointAt(positions, chain[index])));
  }
  const total = lengths[lengths.length - 1];
  return total > 0 ? lengths.map((length) => length / total) : null;
}

function offLine(point: Point, from: Point, to: Point) {
  const d = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
  const length = Math.hypot(d[0], d[1], d[2]);
  const p = [point[0] - from[0], point[1] - from[1], point[2] - from[2]];
  const cross = [p[1] * d[2] - p[2] * d[1], p[2] * d[0] - p[0] * d[2], p[0] * d[1] - p[1] * d[0]];
  return Math.hypot(cross[0], cross[1], cross[2]) / length;
}

/**
 * New triangles for one face whose border runs: a curve, a straight side, the same curve moved along the side, the
 * other straight side - `sides` are the two straight edges by their end points. Every border point of the old
 * triangles is kept, so the face still meets its neighbours point for point; points inside the face are left out.
 * Null when the border is not such a patch or the new triangles would not cover the face the same way round.
 */
export function ruledStripTriangles(
  positions: ArrayLike<number>,
  triangles: ArrayLike<number>,
  sides: readonly [readonly [Point, Point], readonly [Point, Point]],
  tolerance = 1e-3,
): number[] | null {
  const loop = borderLoop(triangles);
  if (!loop) return null;
  // Each side's two ends on the loop.
  const ends = sides.map((side) => side.map((end) => {
    const found = loop.flatMap((vertex, index) => (distance(pointAt(positions, vertex), end) <= tolerance ? [index] : []));
    return found.length === 1 ? found[0] : -1;
  }));
  if (ends.some((pair) => pair.some((index) => index < 0))) return null;
  const corners = ends.flat().sort((a, b) => a - b);
  if (new Set(corners).size !== 4) return null;
  const sameSide = (a: number, b: number) => ends.some((pair) => pair.includes(a) && pair.includes(b));
  // Which runs between neighbouring corners are the sides: either the first and third or the second and fourth.
  const sideFirst = sameSide(corners[0], corners[1]) && sameSide(corners[2], corners[3]);
  const sideSecond = sameSide(corners[1], corners[2]) && sameSide(corners[3], corners[0]);
  if (sideFirst === sideSecond) return null;
  // Rotate so the loop reads: curve p..q, side q..r, curve r..s, side s..p.
  const [p, q, r, s] = sideFirst ? [corners[1], corners[2], corners[3], corners[0]] : [corners[0], corners[1], corners[2], corners[3]];
  const run = (from: number, to: number) => {
    const out: number[] = [];
    for (let index = from; ; index = (index + 1) % loop.length) {
      out.push(loop[index]);
      if (index === to) return out;
    }
  };
  const bottom = run(p, q);
  const rightSide = run(q, r);
  const top = run(r, s).reverse();
  const leftSide = run(s, p);
  // The sides must be straight: every point on them lies on the line between their ends.
  for (const side of [rightSide, leftSide]) {
    const from = pointAt(positions, side[0]);
    const to = pointAt(positions, side[side.length - 1]);
    if (side.some((vertex) => offLine(pointAt(positions, vertex), from, to) > tolerance)) return null;
  }
  if (bottom.length < 2 || top.length < 2 || bottom.length + top.length < 5) return null;
  const bottomShares = shares(positions, bottom);
  const topShares = shares(positions, top);
  if (!bottomShares || !topShares) return null;

  // Zip the two curves together by their share of the way: matching points give straight strips.
  const result: number[] = [];
  let i = 0;
  let j = 0;
  const n = bottom.length - 1;
  const m = top.length - 1;
  while (i < n || j < m) {
    const stepBottom = j === m || (i < n && bottomShares[i + 1] <= topShares[j + 1] + 1e-9);
    if (stepBottom) {
      result.push(bottom[i], bottom[i + 1], top[j]);
      i += 1;
    } else {
      result.push(bottom[i], top[j + 1], top[j]);
      j += 1;
    }
  }
  // Points on a side between its ends: the triangle on that side becomes a fan over them.
  const fanOut = (triangleIndex: number, from: number, to: number, chain: number[]) => {
    if (chain.length <= 2) return;
    const corner = triangleIndex * 3;
    const triangle = [result[corner], result[corner + 1], result[corner + 2]];
    const at = [0, 1, 2].find((k) => triangle[k] === from && triangle[(k + 1) % 3] === to);
    if (at === undefined) throw new Error("ruled strip side not found");
    const apex = triangle[(at + 2) % 3];
    const fan: number[] = [];
    for (let k = 0; k + 1 < chain.length; k += 1) fan.push(chain[k], chain[k + 1], apex);
    result.splice(corner, 3, ...fan);
  };
  try {
    // The last triangle holds the right side (q -> r), the first the left one (s -> p); the last first, so the first stays in place.
    fanOut(result.length / 3 - 1, bottom[n], top[m], rightSide);
    fanOut(0, top[0], bottom[0], leftSide);
  } catch {
    return null;
  }
  // The same face, the same way round: the area vectors agree.
  const before = areaVector(positions, triangles);
  const after = areaVector(positions, result);
  const size = Math.hypot(before[0], before[1], before[2]);
  const gap = Math.hypot(before[0] - after[0], before[1] - after[1], before[2] - after[2]);
  if (!(size > 0) || gap > size * 0.05) return null;
  return result;
}

function releaseAll(cad: OcctKernel, handles: ShapeHandle[]) {
  for (const handle of handles) {
    try {
      cad.release(handle);
    } catch {
      // Already gone with its parent.
    }
  }
}

function toPoint(vector: Vec3): Point {
  return [vector.x, vector.y, vector.z];
}

/** The two straight edges of a face that is a ruled patch of an extrusion: four edges, two of them parallel lines of one length. */
function extrusionSides(cad: OcctKernel, face: ShapeHandle): [[Point, Point], [Point, Point]] | null {
  if (cad.surfaceType(face) !== "extrusion") return null;
  const edges = cad.getSubShapes(face, "edge");
  try {
    if (edges.length !== 4) return null;
    const lines = edges.filter((edge) => cad.curveType(edge) === "line");
    if (lines.length !== 2) return null;
    const sides = lines.map((line) => {
      const vertices = cad.getSubShapes(line, "vertex");
      try {
        return vertices.length === 2 ? [toPoint(cad.vertexPosition(vertices[0])), toPoint(cad.vertexPosition(vertices[1]))] as [Point, Point] : null;
      } finally {
        releaseAll(cad, vertices);
      }
    });
    if (!sides[0] || !sides[1]) return null;
    const vector = (side: [Point, Point]) => [side[1][0] - side[0][0], side[1][1] - side[0][1], side[1][2] - side[0][2]];
    const a = vector(sides[0]);
    const b = vector(sides[1]);
    const la = Math.hypot(a[0], a[1], a[2]);
    const lb = Math.hypot(b[0], b[1], b[2]);
    if (!(la > 0) || Math.abs(la - lb) > Math.max(1e-4, la * 1e-6)) return null;
    // Parallel either way round.
    const cross = Math.hypot(a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]);
    if (cross > la * lb * 1e-6) return null;
    return [sides[0], sides[1]];
  } finally {
    releaseAll(cad, edges);
  }
}

/**
 * The shape meshed as `cad.tessellate` would, but with the side of every extruded curve in straight strips
 * (ruledStripTriangles). Faces that are not such a patch keep the kernel's triangles; points no triangle uses any more
 * are dropped. When no face changes, the kernel's mesh is returned as it came.
 */
export function tessellateWithRuledStrips(cad: OcctKernel, shape: ShapeHandle, options: { linearDeflection: number; angularDeflection: number }): Mesh {
  const mesh = cad.meshShape(shape, options);
  const faces = cad.getSubShapes(shape, "face");
  try {
    const candidates = new Map<number, [[Point, Point], [Point, Point]]>();
    faces.forEach((face, id) => {
      const sides = extrusionSides(cad, face);
      if (sides) candidates.set(id, sides);
    });
    if (candidates.size === 0) return mesh;
    const triangleFaces = cadTriangleFaces(mesh.faceGroups ?? [], faces.map((face) => cad.hashCode(face, HASH_UPPER_BOUND)), mesh.triangleCount);
    const byFace = new Map<number, number[]>();
    for (let triangle = 0; triangle < mesh.triangleCount; triangle += 1) {
      const face = triangleFaces[triangle];
      if (!candidates.has(face)) continue;
      const list = byFace.get(face) ?? [];
      list.push(mesh.indices[triangle * 3], mesh.indices[triangle * 3 + 1], mesh.indices[triangle * 3 + 2]);
      byFace.set(face, list);
    }
    const replaced = new Map<number, number[]>();
    for (const [face, triangles] of byFace) {
      const strips = ruledStripTriangles(mesh.positions, triangles, candidates.get(face)!);
      if (strips) replaced.set(face, strips);
    }
    if (replaced.size === 0) return mesh;
    const indices: number[] = [];
    for (let triangle = 0; triangle < mesh.triangleCount; triangle += 1) {
      if (replaced.has(triangleFaces[triangle])) continue;
      indices.push(mesh.indices[triangle * 3], mesh.indices[triangle * 3 + 1], mesh.indices[triangle * 3 + 2]);
    }
    for (const strips of replaced.values()) indices.push(...strips);
    // Drop the points inside the changed faces.
    const remap = new Int32Array(mesh.positions.length / 3).fill(-1);
    let kept = 0;
    for (const vertex of indices) if (remap[vertex] < 0) remap[vertex] = kept++;
    const positions = new Float32Array(kept * 3);
    const normals = new Float32Array(kept * 3);
    for (let vertex = 0; vertex < remap.length; vertex += 1) {
      const to = remap[vertex];
      if (to < 0) continue;
      positions.set(mesh.positions.subarray(vertex * 3, vertex * 3 + 3), to * 3);
      normals.set(mesh.normals.subarray(vertex * 3, vertex * 3 + 3), to * 3);
    }
    const remapped = new Uint32Array(indices.length);
    indices.forEach((vertex, index) => {
      remapped[index] = remap[vertex];
    });
    return { positions, normals, indices: remapped, vertexCount: kept, triangleCount: remapped.length / 3 };
  } finally {
    releaseAll(cad, faces);
  }
}
