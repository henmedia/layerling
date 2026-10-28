import type { OcctKernel, ShapeHandle } from "occt-wasm";

/*
 * A flat face whose mesh covers more than its outline (#740). A fillet at a size the thinnest part of
 * the outline cannot take (0.8 mm round a thin horn of an imported disc) can leave the kernel with a
 * body it calls valid, whose top face is meshed across a bay outside its own outline: a thin strip
 * over the opening, in no way part of the body. The edges of that face are straight and form a simple
 * polygon, so the area the mesh covers has to be the area of that polygon; when it is not, the size
 * is refused as one that "intersects adjacent faces" instead of showing the strip.
 */

type V3 = [number, number, number];

/** Past this many flat faces the check is skipped: a body of that many faces is checked by its mesh, not face by face. */
const MAX_CHECKED_FACES = 600;
/** The mesh and the polygon agree to this share of the face (a straight outline gives about one part in a million). */
const AREA_TOLERANCE = 0.002;
const MIN_AREA_DIFFERENCE = 0.05;

function releaseAll(cad: OcctKernel, handles: ShapeHandle[]) {
  handles.forEach((handle) => {
    try {
      cad.release(handle);
    } catch {
      // A failed topology operation can invalidate temporary handles.
    }
  });
}

function key(point: V3) {
  return `${Math.round(point[0] * 1e5)},${Math.round(point[1] * 1e5)},${Math.round(point[2] * 1e5)}`;
}

/** The corners of a face's one outer wire in order, or null when an edge is not straight or the edges do not close up. */
function straightOutline(cad: OcctKernel, face: ShapeHandle): V3[] | null {
  // Every sub-shape asked for is a handle of its own in the kernel's arena; each preview asks again (#740).
  const wires = cad.getSubShapes(face, "wire");
  releaseAll(cad, wires);
  if (wires.length !== 1) return null;
  const edges = cad.getSubShapes(face, "edge");
  try {
    return outlineOfEdges(cad, edges);
  } finally {
    releaseAll(cad, edges);
  }
}

function outlineOfEdges(cad: OcctKernel, edges: ShapeHandle[]): V3[] | null {
  if (edges.length < 3) return null;
  const links = new Map<string, { to: string; point: V3 }[]>();
  const points = new Map<string, V3>();
  for (const edge of edges) {
    if (cad.curveType(edge) !== "line") return null;
    const vertices = cad.getSubShapes(edge, "vertex");
    let ends: V3[];
    try {
      ends = vertices.map((vertex) => {
        const position = cad.vertexPosition(vertex) as unknown as { x: number; y: number; z: number } | V3;
        return (Array.isArray(position) ? [position[0], position[1], position[2]] : [position.x, position.y, position.z]) as V3;
      });
    } finally {
      releaseAll(cad, vertices);
    }
    if (ends.length < 2) return null;
    const a = ends[0];
    const b = ends[ends.length - 1];
    const ka = key(a);
    const kb = key(b);
    if (ka === kb) return null;
    points.set(ka, a);
    points.set(kb, b);
    links.set(ka, [...(links.get(ka) ?? []), { to: kb, point: b }]);
    links.set(kb, [...(links.get(kb) ?? []), { to: ka, point: a }]);
  }
  for (const around of links.values()) if (around.length !== 2) return null;
  const first = edges.length ? [...points.keys()][0] : null;
  if (first === null) return null;
  const outline: V3[] = [points.get(first)!];
  let previous: string | null = null;
  let current = first;
  for (let step = 0; step < edges.length; step += 1) {
    const next: { to: string; point: V3 } = links.get(current)!.find((link) => link.to !== previous) ?? links.get(current)![0];
    if (next.to === first) return outline.length === edges.length ? outline : null;
    outline.push(next.point);
    previous = current;
    current = next.to;
  }
  return null;
}

/** Twice the area of a polygon in space is the length of the sum of the cross products about its first corner. */
function polygonArea(outline: V3[]) {
  let x = 0;
  let y = 0;
  let z = 0;
  for (let index = 1; index + 1 < outline.length; index += 1) {
    const a = outline[0];
    const b = outline[index];
    const c = outline[index + 1];
    const ux = b[0] - a[0];
    const uy = b[1] - a[1];
    const uz = b[2] - a[2];
    const vx = c[0] - a[0];
    const vy = c[1] - a[1];
    const vz = c[2] - a[2];
    x += uy * vz - uz * vy;
    y += uz * vx - ux * vz;
    z += ux * vy - uy * vx;
  }
  return Math.hypot(x, y, z) / 2;
}

function meshArea(cad: OcctKernel, face: ShapeHandle) {
  const mesh = cad.tessellate(face, { linearDeflection: 0.1, angularDeflection: 0.5 });
  const positions = mesh.positions;
  let total = 0;
  for (let triangle = 0; triangle < mesh.triangleCount; triangle += 1) {
    const a = mesh.indices[triangle * 3] * 3;
    const b = mesh.indices[triangle * 3 + 1] * 3;
    const c = mesh.indices[triangle * 3 + 2] * 3;
    const ux = positions[b] - positions[a];
    const uy = positions[b + 1] - positions[a + 1];
    const uz = positions[b + 2] - positions[a + 2];
    const vx = positions[c] - positions[a];
    const vy = positions[c + 1] - positions[a + 1];
    const vz = positions[c + 2] - positions[a + 2];
    total += Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2;
  }
  return total;
}

/**
 * Whether a flat face with a straight, simple outline is meshed over more or less than that outline.
 * A face with a hole or a curved edge is not judged: the check only says so when it knows.
 */
export function cadFlatFaceMeshStraysFromOutline(cad: OcctKernel, shape: ShapeHandle): boolean {
  const all = cad.getSubShapes(shape, "face");
  try {
    return planeFaceStrays(cad, all.filter((face) => cad.surfaceType(face) === "plane"));
  } finally {
    releaseAll(cad, all);
  }
}

function planeFaceStrays(cad: OcctKernel, faces: ShapeHandle[]) {
  if (faces.length === 0 || faces.length > MAX_CHECKED_FACES) return false;
  for (const face of faces) {
    let outline: V3[] | null;
    try {
      outline = straightOutline(cad, face);
    } catch {
      continue;
    }
    if (!outline || outline.length < 5) continue;
    const expected = polygonArea(outline);
    let covered: number;
    try {
      covered = meshArea(cad, face);
    } catch {
      continue;
    }
    if (Math.abs(covered - expected) > Math.max(MIN_AREA_DIFFERENCE, expected * AREA_TOLERANCE)) return true;
  }
  return false;
}
