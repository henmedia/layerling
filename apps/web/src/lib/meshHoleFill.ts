// The polygon triangulation alone (mapbox/earcut), not three: the CAD workers load this file.
import { Earcut } from "three/src/extras/Earcut.js";
import type { MeshData, Vec3 } from "@/lib/editorMeshCore";

/**
 * Which openings are closed on their own: a small one, its rim at most this share of the mesh's
 * bounding box diagonal (an eye of a figure left open, a crack in a scan), and a flat one of any
 * size, its rim off its plane by at most `HOLE_FILL_MAX_WARP` of its radius (an open side, the open
 * back of an eye cup). A large opening whose rim bends is a missing piece of curved surface, and a
 * cap guessed over it would change the part.
 */
export const HOLE_FILL_MAX_RIM_SHARE = 0.1;
export const HOLE_FILL_MAX_WARP = 0.05;

export type MeshHoleFill = {
  /** The mesh with its small openings capped; the input when nothing was closed. */
  mesh: MeshData;
  /** How many openings were capped. */
  closed: number;
  /** How many openings stay open: large and bent, a cap that would fold over, or a rim through one corner twice. */
  open: number;
};

/** One opening's cap: its triangles as corners of the welded mesh, turned as the triangles around it, and the way the rim faces. */
type MeshHoleCap = { faces: [number, number, number][]; normal: Vec3 };

type MeshHoleCaps = { vertices: Vec3[]; faces: [number, number, number][]; caps: MeshHoleCap[]; open: number };

/**
 * Closes the small openings of a mesh whose surface is otherwise whole (#791). Corners are welded
 * by position, the edges only one triangle uses are chained into rims, and every rim small or flat
 * enough is capped by a fan from its centre, turned the same way as the triangles around it, when
 * no triangle of the fan folds back over the others. A flat rim a fan would fold over (a half
 * ellipse cut short by a chamfer, #1711) is triangulated in its plane instead. A mesh with
 * an edge three or more triangles share is left alone: its trouble is not a hole.
 */
export function closeSmallMeshHoles(mesh: MeshData, maxRimShare = HOLE_FILL_MAX_RIM_SHARE): MeshHoleFill {
  const found = meshHoleCaps(mesh, maxRimShare);
  if (!found || found.open > 0) {
    const sliver = closeSliverGaps(mesh);
    if (sliver) return { mesh: { name: mesh.name, vertices: sliver.vertices, faces: [...sliver.faces, ...sliver.caps.flatMap((cap) => cap.faces)] }, closed: sliver.caps.length, open: 0 };
  }
  if (!found || found.caps.length === 0) return { mesh, closed: 0, open: found?.open ?? 0 };
  return {
    mesh: { name: mesh.name, vertices: found.vertices, faces: [...found.faces, ...found.caps.flatMap((cap) => cap.faces)] },
    closed: found.caps.length,
    open: found.open,
  };
}

/** A mesh as the CAD kernel gives it: corners with their normals, and triangles as three corner numbers. */
export type IndexedMesh = { positions: Float32Array; normals: Float32Array; indices: Uint32Array; vertexCount: number; triangleCount: number };

/**
 * The mesh of an exact body with its flat openings closed (#1711). OpenCascade sometimes leaves a flat face
 * of a valid body without a single triangle - a half ellipse beside a chamfer on a group - and every cut,
 * the print check and the slicer then meet an open mesh. The opening's rim is the edges of the faces around
 * it, so it lies in the missing face's plane, and capping it gives that face back. Only flat rims are
 * capped (a missing piece of curved surface stays open), each cap with corners of its own facing out, so
 * the faces around it keep their shading; the mesh comes back as it was when nothing is capped.
 */
export function closeFlatMeshGaps(mesh: IndexedMesh): IndexedMesh {
  if (mesh.triangleCount === 0) return mesh;
  const vertices: Vec3[] = [];
  for (let vertex = 0; vertex < mesh.vertexCount; vertex += 1) {
    vertices.push([mesh.positions[vertex * 3], mesh.positions[vertex * 3 + 1], mesh.positions[vertex * 3 + 2]]);
  }
  const faces: [number, number, number][] = [];
  for (let triangle = 0; triangle < mesh.triangleCount; triangle += 1) {
    faces.push([mesh.indices[triangle * 3], mesh.indices[triangle * 3 + 1], mesh.indices[triangle * 3 + 2]]);
  }
  const found = meshHoleCaps({ name: "", vertices, faces }, 0);
  if (!found || found.open > 0) {
    const sliver = closeSliverGaps({ name: "", vertices, faces });
    if (sliver) {
      const positions = Float32Array.from(sliver.remap.flatMap((corner) => sliver.vertices[corner]));
      const indices = Uint32Array.from(sliver.kept.flatMap((face) => faces[face]));
      return withCaps({ ...mesh, positions, indices }, sliver);
    }
  }
  if (!found || found.caps.length === 0) return mesh;
  return withCaps(mesh, found);
}

/** The kernel's mesh with caps of their own corners added, facing out. */
function withCaps(mesh: IndexedMesh, found: { vertices: Vec3[]; caps: MeshHoleCap[] }): IndexedMesh {
  const added = found.caps.reduce((sum, cap) => sum + cap.faces.length, 0);
  const positions = new Float32Array(mesh.positions.length + added * 9);
  const normals = new Float32Array(mesh.normals.length + added * 9);
  const indices = new Uint32Array(mesh.indices.length + added * 3);
  positions.set(mesh.positions);
  normals.set(mesh.normals);
  indices.set(mesh.indices);
  let vertex = mesh.vertexCount;
  let corner = mesh.indices.length;
  for (const cap of found.caps) {
    const length = Math.hypot(cap.normal[0], cap.normal[1], cap.normal[2]);
    // The cap runs the rim against the triangles beside it, so it faces against the rim's normal.
    const outward: Vec3 = [-cap.normal[0] / length, -cap.normal[1] / length, -cap.normal[2] / length];
    for (const face of cap.faces) {
      for (const point of face) {
        positions.set(found.vertices[point], vertex * 3);
        normals.set(outward, vertex * 3);
        indices[corner] = vertex;
        corner += 1;
        vertex += 1;
      }
    }
  }
  return { positions, normals, indices, vertexCount: vertex, triangleCount: indices.length / 3 };
}

/** How wide a sliver gap may be, in mm: far below a printed line, far above the rounding of sizes typed and dragged. */
const SLIVER_WIDTH = 0.15;
/** In the plane of this many bad edges, a triangle on them is a stray one of a sliver face and not a wall beside it. */
const STRAY_RIM_EDGES = 6;
/** The longest rim a sliver's width is measured on: each of its corners is measured against the other side. */
const SLIVER_MAX_RIM = 4000;

/**
 * A mesh whose only trouble are slivers, closed (#2053): where two parts of a group end almost on one another - a tube
 * 0.015 mm beside the middle of a loft of nearly its size - the exact body has crescent faces a few hundredths of a
 * millimetre wide between the two edges, and OpenCascade leaves them without triangles, or with stray ones on edges two
 * walls share already. The stray ones go (a triangle in the plane of a whole rim of bad edges), and each gap left is closed by a strip
 * between its two sides. Null unless the mesh is whole afterwards, so nothing half repaired is kept.
 */
function closeSliverGaps(mesh: MeshData) {
  // First only strays with all their corners on bad edges; then, as a sliver can also be filled from one side alone, any with a bad edge.
  return sliverGapsClosed(mesh, false) ?? sliverGapsClosed(mesh, true);
}

function sliverGapsClosed(mesh: MeshData, anyCorner: boolean): (MeshHoleCaps & { kept: number[]; remap: number[] }) | null {
  const vertices: Vec3[] = [];
  const welded = new Map<string, number>();
  const remap = mesh.vertices.map((point) => {
    // Coarser than elsewhere: the edges two faces share come out of a sliver up to a ten-thousandth apart.
    const key = point.map((value) => Math.round(value * 1e4)).join(",");
    let index = welded.get(key);
    if (index === undefined) {
      index = vertices.length;
      welded.set(key, index);
      vertices.push(point);
    }
    return index;
  });
  const welds = mesh.faces.map((face) => face.map((index) => remap[index]) as [number, number, number]);
  const edgeKey = (a: number, b: number) => (a < b ? `${a},${b}` : `${b},${a}`);
  const edgesOf = ([a, b, c]: [number, number, number]) => [edgeKey(a, b), edgeKey(b, c), edgeKey(c, a)];
  const usesOf = (triangles: Iterable<[number, number, number]>) => {
    const uses = new Map<string, number>();
    for (const face of triangles) for (const key of edgesOf(face)) uses.set(key, (uses.get(key) ?? 0) + 1);
    return uses;
  };
  const whole = welds.map((_, index) => index).filter((index) => new Set(welds[index]).size === 3);
  const uses = usesOf(whole.map((index) => welds[index]));
  const around = new Map<string, number[]>();
  for (const index of whole) for (const key of edgesOf(welds[index])) around.set(key, [...(around.get(key) ?? []), index]);

  // The stray triangles, round by round: taking one away bares the next. What was bad in an earlier round counts on:
  // a stray one's corner is whole again once its neighbour is gone.
  const gone = new Set<number>();
  const beside = new Set<number>();
  const bad = new Set<number>();
  const badEdges: [number, number][] = [];
  const seen = new Set<string>();
  const noteBad = (key: string) => {
    if (seen.has(key)) return;
    seen.add(key);
    const [a, b] = key.split(",").map(Number);
    badEdges.push([a, b]);
    bad.add(a).add(b);
    for (const index of around.get(key) ?? []) beside.add(index);
  };
  for (const [key, count] of uses) if (count !== 2) noteBad(key);
  const asked = new Set<number>();
  const isStray = (index: number) => {
    const [a, b, c] = welds[index];
    if (!anyCorner && (!bad.has(a) || !bad.has(b) || !bad.has(c))) return false;
    if (edgesOf(welds[index]).every((key) => uses.get(key) === 2)) return false;
    // Its plane is asked once: a round adds only a few bad edges.
    if (asked.has(index)) return false;
    asked.add(index);
    const [from, to, third] = [vertices[a], vertices[b], vertices[c]];
    const normal = cross(from, to, third);
    const length = Math.hypot(...normal);
    // A triangle without any width lies in no plane of its own.
    if (length <= Math.max(apart(from, to), apart(to, third), apart(third, from)) * 1e-3) return true;
    const off = ([x, y, z]: Vec3) => Math.abs((x - from[0]) * normal[0] + (y - from[1]) * normal[1] + (z - from[2]) * normal[2]) / length;
    // A wall beside the sliver has only an edge or two of it in its plane.
    let inPlane = 0;
    for (const [start, end] of badEdges) if (off(vertices[start]) <= 1e-3 && off(vertices[end]) <= 1e-3 && (inPlane += 1) >= STRAY_RIM_EDGES) return true;
    return false;
  };
  for (;;) {
    if (badEdges.length === 0 || badEdges.length > SLIVER_MAX_RIM) return null;
    const stray = [...beside].filter(isStray);
    if (stray.length === 0) break;
    for (const index of stray) {
      gone.add(index);
      beside.delete(index);
      for (const key of edgesOf(welds[index])) uses.set(key, (uses.get(key) ?? 0) - 1);
    }
    for (const index of stray) for (const key of edgesOf(welds[index])) {
      const count = uses.get(key) ?? 0;
      if (count !== 0 && count !== 2) noteBad(key);
    }
    for (const index of gone) beside.delete(index);
  }
  const kept = whole.filter((index) => !gone.has(index));
  const facesKept = () => kept.map((index) => welds[index]);

  // Each open edge as its triangle runs it; at a tip two crescents meet in, a corner has two ways on.
  const next = new Map<number, number[]>();
  const arriving = new Map<number, number>();
  for (const count of uses.values()) if (count > 2) return null;
  for (const [a, b, c] of facesKept()) {
    for (const [from, to] of [[a, b], [b, c], [c, a]] as const) {
      if (uses.get(edgeKey(from, to)) !== 1) continue;
      next.set(from, [...(next.get(from) ?? []), to]);
      arriving.set(to, (arriving.get(to) ?? 0) + 1);
    }
  }
  for (const [corner, ways] of next) if (arriving.get(corner) !== ways.length) return null;

  const caps: MeshHoleCap[] = [];
  for (const start of [...next.keys()]) {
    const path: number[] = [start];
    for (;;) {
      const current = path[path.length - 1];
      const ways = next.get(current);
      if (!ways?.length) {
        if (path.length === 1) break;
        return null;
      }
      // At a tip the way that turns back sharpest: round the same crescent, not on into the next one.
      const before = path.length > 1 ? vertices[path[path.length - 2]] : null;
      if (before && ways.length > 1) ways.sort((a, b) => turn(before, vertices[current], vertices[a]) - turn(before, vertices[current], vertices[b]));
      const to = ways.shift()!;
      const at = path.indexOf(to);
      if (at < 0) {
        path.push(to);
        continue;
      }
      // Round one gap: it ends here, and the path goes on from the corner it closed at.
      const rim = path.slice(at);
      path.length = at + 1;
      const cap = stripCap(rim, vertices);
      if (!cap) return null;
      caps.push(cap);
    }
  }
  const faces = facesKept();
  for (const count of usesOf([...faces, ...caps.flatMap((cap) => cap.faces)]).values()) if (count !== 2) return null;
  return { vertices, faces, caps, open: 0, kept, remap };
}

/** Which way a path goes on at `at`: -1 straight back, 1 straight on. */
function turn(before: Vec3, at: Vec3, after: Vec3) {
  const [ux, uy, uz] = [at[0] - before[0], at[1] - before[1], at[2] - before[2]];
  const [vx, vy, vz] = [after[0] - at[0], after[1] - at[1], after[2] - at[2]];
  return (ux * vx + uy * vy + uz * vz) / (Math.hypot(ux, uy, uz) * Math.hypot(vx, vy, vz) || 1);
}

/**
 * The strip between the two sides of a long thin rim, from tip to tip; null for a rim wider than a sliver. It uses every
 * edge of the rim once whatever the two sides do: where their straight pieces cross, it only overlaps itself.
 */
function stripCap(rim: number[], vertices: Vec3[]): MeshHoleCap | null {
  const count = rim.length;
  if (count < 3 || count > SLIVER_MAX_RIM) return null;
  // The tips: the two corners where the rim turns back sharpest.
  const turns = rim.map((corner, i) => ({ i, back: turn(vertices[rim[(i + count - 1) % count]], vertices[corner], vertices[rim[(i + 1) % count]]) })).sort((a, b) => a.back - b.back);
  const [first, second] = [turns[0].i, turns[1].i].sort((a, b) => a - b);
  // Both sides from the first tip to the second: the one the rim runs, and the one it comes back on.
  const side = rim.slice(first, second + 1);
  const back = [...rim.slice(second), ...rim.slice(0, first + 1)].reverse();
  const near = (corner: number, line: number[]) => line.some((from, i) => i + 1 < line.length && pointToSegment(vertices[corner], vertices[from], vertices[line[i + 1]]) <= SLIVER_WIDTH);
  if (!side.every((corner) => near(corner, back)) || !back.every((corner) => near(corner, side))) return null;
  const faces: [number, number, number][] = [];
  const normal: Vec3 = [0, 0, 0];
  let i = 0;
  let j = 0;
  while (i + 1 < side.length || j + 1 < back.length) {
    const alongSide = j + 1 >= back.length || (i + 1 < side.length && apart(vertices[side[i + 1]], vertices[back[j]]) <= apart(vertices[side[i]], vertices[back[j + 1]]));
    // The cap runs the rim's edges the other way round.
    const face: [number, number, number] = alongSide ? [side[i + 1], side[i], back[j]] : [back[j], back[j + 1], side[i]];
    if (alongSide) i += 1;
    else j += 1;
    if (new Set(face).size < 3) continue;
    faces.push(face);
    const [a, b, c] = face.map((corner) => vertices[corner]);
    cross(a, b, c).forEach((value, axis) => { normal[axis] -= value; });
  }
  return { faces, normal: Math.hypot(...normal) > 0 ? normal : [0, 0, 1] };
}

function apart(a: Vec3, b: Vec3) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function cross(from: Vec3, to: Vec3, third: Vec3): Vec3 {
  const [ux, uy, uz] = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
  const [vx, vy, vz] = [third[0] - from[0], third[1] - from[1], third[2] - from[2]];
  return [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
}

function pointToSegment(point: Vec3, from: Vec3, to: Vec3) {
  const [dx, dy, dz] = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
  const t = Math.max(0, Math.min(1, ((point[0] - from[0]) * dx + (point[1] - from[1]) * dy + (point[2] - from[2]) * dz) / (dx * dx + dy * dy + dz * dz || 1)));
  return Math.hypot(point[0] - from[0] - t * dx, point[1] - from[1] - t * dy, point[2] - from[2] - t * dz);
}

/** The caps of a mesh's openings, or null for a mesh with an edge three or more triangles share. */
function meshHoleCaps(mesh: MeshData, maxRimShare: number): MeshHoleCaps | null {
  if (mesh.faces.length === 0) return { vertices: [], faces: [], caps: [], open: 0 };

  const vertices: Vec3[] = [];
  const welded = new Map<string, number>();
  const remap = mesh.vertices.map(([x, y, z]) => {
    const key = `${Math.round(x * 1e5)},${Math.round(y * 1e5)},${Math.round(z * 1e5)}`;
    let index = welded.get(key);
    if (index === undefined) {
      index = vertices.length;
      welded.set(key, index);
      vertices.push([x, y, z]);
    }
    return index;
  });

  const faces: [number, number, number][] = [];
  // Every edge as "low,high" with how often it is used, and the direction a triangle runs along it.
  const uses = new Map<string, number>();
  const direction = new Map<string, [number, number]>();
  for (const face of mesh.faces) {
    const [a, b, c] = face.map((index) => remap[index]) as [number, number, number];
    if (a === b || b === c || c === a) continue;
    faces.push([a, b, c]);
    for (const [from, to] of [[a, b], [b, c], [c, a]] as const) {
      const key = from < to ? `${from},${to}` : `${to},${from}`;
      uses.set(key, (uses.get(key) ?? 0) + 1);
      direction.set(key, [from, to]);
    }
  }

  // Each open edge as its triangle runs it: from -> to.
  const next = new Map<number, number[]>();
  let openEdges = 0;
  for (const [key, count] of uses) {
    if (count > 2) return null;
    if (count !== 1) continue;
    const [from, to] = direction.get(key)!;
    const list = next.get(from);
    if (list) list.push(to);
    else next.set(from, [to]);
    openEdges += 1;
  }
  if (openEdges === 0) return { vertices, faces, caps: [], open: 0 };

  let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (const [x, y, z] of vertices) {
    minX = Math.min(minX, x); minY = Math.min(minY, y); minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); maxZ = Math.max(maxZ, z);
  }
  const maxRim = Math.hypot(maxX - minX, maxY - minY, maxZ - minZ) * maxRimShare;
  const distance = (a: number, b: number) => {
    const [ax, ay, az] = vertices[a];
    const [bx, by, bz] = vertices[b];
    return Math.hypot(ax - bx, ay - by, az - bz);
  };

  // A corner two rims meet in cannot be told apart: its rims stay open.
  const pinched = new Set([...next].filter(([, list]) => list.length > 1).map(([from]) => from));
  const visited = new Set<number>();
  const caps: MeshHoleCap[] = [];
  let open = 0;
  for (const start of next.keys()) {
    if (visited.has(start)) continue;
    const rim: number[] = [];
    let current = start;
    let broken = false;
    while (!visited.has(current)) {
      visited.add(current);
      rim.push(current);
      if (pinched.has(current)) broken = true;
      const following = next.get(current);
      if (!following) { broken = true; break; }
      current = following[0];
    }
    if (current !== start) broken = true;
    if (broken || rim.length < 3) { open += 1; continue; }
    const points = rim.map((index) => vertices[index]);
    const centre: Vec3 = [0, 0, 0];
    for (const [x, y, z] of points) {
      centre[0] += x / rim.length;
      centre[1] += y / rim.length;
      centre[2] += z / rim.length;
    }
    // The rim's plane (Newell's normal) faces the way the triangles beside it run the rim round.
    const normal: Vec3 = [0, 0, 0];
    let length = 0;
    points.forEach((point, i) => {
      const following = points[(i + 1) % points.length];
      normal[0] += (point[1] - following[1]) * (point[2] + following[2]);
      normal[1] += (point[2] - following[2]) * (point[0] + following[0]);
      normal[2] += (point[0] - following[0]) * (point[1] + following[1]);
      length += distance(rim[i], rim[(i + 1) % rim.length]);
    });
    const normalLength = Math.hypot(normal[0], normal[1], normal[2]);
    if (normalLength === 0) { open += 1; continue; }
    const warp = Math.max(...points.map(([x, y, z]) => Math.abs((x - centre[0]) * normal[0] + (y - centre[1]) * normal[1] + (z - centre[2]) * normal[2]))) / normalLength;
    const flat = warp <= HOLE_FILL_MAX_WARP * (length / (2 * Math.PI));
    if (length > maxRim && !flat) { open += 1; continue; }
    // The triangles beside the rim run it forwards, so the cap runs it backwards: every fan triangle faces against the rim's normal.
    const folds = points.some((point, i) => {
      const before = points[(i + 1) % points.length];
      const ux = before[0] - centre[0], uy = before[1] - centre[1], uz = before[2] - centre[2];
      const vx = point[0] - centre[0], vy = point[1] - centre[1], vz = point[2] - centre[2];
      return (uy * vz - uz * vy) * normal[0] + (uz * vx - ux * vz) * normal[1] + (ux * vy - uy * vx) * normal[2] > 0;
    });
    if (folds) {
      const planar = flat ? planarRimCap(rim, points, normal) : null;
      if (planar) caps.push({ faces: planar, normal });
      else open += 1;
      continue;
    }
    if (rim.length === 3) {
      caps.push({ faces: [[rim[2], rim[1], rim[0]]], normal });
    } else {
      const middle = vertices.length;
      vertices.push(centre);
      const fan: [number, number, number][] = [];
      for (let i = 0; i < rim.length; i += 1) fan.push([rim[(i + 1) % rim.length], rim[i], middle]);
      caps.push({ faces: fan, normal });
    }
  }
  return { vertices, faces, caps, open };
}

/**
 * How far the cap of a flat rim may cover more or less than the rim encloses. Where two curved faces
 * touch at a point (the tip of a crescent between a chamfer and an ellipse, #1711), the straight pieces
 * their edges are meshed in cross just short of it, so the rim crosses itself by a sliver.
 */
const PLANAR_CAP_AREA_SLACK = 0.01;

/**
 * A flat rim triangulated in its own plane (Earcut), turned against the rim's normal as a fan would
 * be; null unless its triangles use every edge of the rim once and cover about the area the rim
 * encloses.
 */
function planarRimCap(rim: number[], points: Vec3[], normal: Vec3): [number, number, number][] | null {
  const length = Math.hypot(normal[0], normal[1], normal[2]);
  const n: Vec3 = [normal[0] / length, normal[1] / length, normal[2] / length];
  const helper: Vec3 = Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const dot = helper[0] * n[0] + helper[1] * n[1] + helper[2] * n[2];
  const rawU: Vec3 = [helper[0] - dot * n[0], helper[1] - dot * n[1], helper[2] - dot * n[2]];
  const lengthU = Math.hypot(rawU[0], rawU[1], rawU[2]);
  const u: Vec3 = [rawU[0] / lengthU, rawU[1] / lengthU, rawU[2] / lengthU];
  const v: Vec3 = [n[1] * u[2] - n[2] * u[1], n[2] * u[0] - n[0] * u[2], n[0] * u[1] - n[1] * u[0]];
  // Seen along the normal (u, v, n turn right-handed) the rim runs counter-clockwise: Newell's normal is its turning.
  const flat = points.flatMap(([x, y, z]) => [x * u[0] + y * u[1] + z * u[2], x * v[0] + y * v[1] + z * v[2]]);
  const corners = withLeftOutPoints(Earcut.triangulate(flat, [], 2), rim.length);
  if (!corners || corners.length !== (rim.length - 2) * 3) return null;
  // Every edge of the rim once, every other edge twice: the cap closes the opening and nothing else.
  const uses = new Map<number, number>();
  const edgeKey = (a: number, b: number) => (a < b ? a * rim.length + b : b * rim.length + a);
  // Newell's normal is twice the rim's area.
  const rimArea = length / 2;
  let covered = 0;
  let turning = 0;
  const triangles: [number, number, number][] = [];
  for (let corner = 0; corner < corners.length; corner += 3) {
    const [a, b, c] = [corners[corner], corners[corner + 1], corners[corner + 2]];
    const area = ((flat[b * 2] - flat[a * 2]) * (flat[c * 2 + 1] - flat[a * 2 + 1]) - (flat[c * 2] - flat[a * 2]) * (flat[b * 2 + 1] - flat[a * 2 + 1])) / 2;
    covered += Math.abs(area);
    turning += area;
    for (const [from, to] of [[a, b], [b, c], [c, a]] as const) uses.set(edgeKey(from, to), (uses.get(edgeKey(from, to)) ?? 0) + 1);
    triangles.push([a, b, c]);
  }
  // Earcut turns all its triangles one way; the cap runs against the normal, clockwise seen along it.
  const cap = triangles.map(([a, b, c]): [number, number, number] => (turning > 0 ? [rim[c], rim[b], rim[a]] : [rim[a], rim[b], rim[c]]));
  for (let i = 0; i < rim.length; i += 1) {
    if (uses.get(edgeKey(i, (i + 1) % rim.length)) !== 1) return null;
    uses.delete(edgeKey(i, (i + 1) % rim.length));
  }
  for (const count of uses.values()) if (count !== 2) return null;
  return Math.abs(covered - rimArea) <= rimArea * PLANAR_CAP_AREA_SLACK ? cap : null;
}

/**
 * Earcut's triangles with the points of the rim it left out put back. Earcut drops a point that lies
 * exactly on the line between its neighbours (the points along a straight edge of the missing face),
 * which leaves the two rim edges at it unused; each run of such points goes back into the triangle
 * on the edge that spans it, as a fan from that triangle's third corner. Null when a run has no such
 * triangle.
 */
function withLeftOutPoints(corners: number[], count: number): number[] | null {
  const used = new Uint8Array(count);
  for (const corner of corners) used[corner] = 1;
  if (used.every(Boolean)) return corners;
  if (!used.some(Boolean)) return null;
  const result = [...corners];
  for (let start = 0; start < count; start += 1) {
    // A run begins after a used point.
    if (used[start] || !used[(start - 1 + count) % count]) continue;
    const from = (start - 1 + count) % count;
    const run: number[] = [];
    let to = start;
    while (!used[to]) {
      run.push(to);
      to = (to + 1) % count;
    }
    let replaced = false;
    for (let corner = 0; corner < result.length && !replaced; corner += 3) {
      const triangle = result.slice(corner, corner + 3);
      for (let side = 0; side < 3; side += 1) {
        const a = triangle[side];
        const b = triangle[(side + 1) % 3];
        const opposite = triangle[(side + 2) % 3];
        if (!((a === from && b === to) || (a === to && b === from))) continue;
        // Along the triangle's own turning from a to b, through the run in that direction.
        const chain = [a, ...(a === from ? run : [...run].reverse()), b];
        const fan: number[] = [];
        for (let i = 0; i + 1 < chain.length; i += 1) fan.push(chain[i], chain[i + 1], opposite);
        result.splice(corner, 3, ...fan);
        replaced = true;
        break;
      }
    }
    if (!replaced) return null;
  }
  return result;
}
