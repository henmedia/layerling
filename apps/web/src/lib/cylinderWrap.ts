/**
 * Wrapping a flat body around a cylinder (#106): what lies flat on the plate,
 * as seen from above, stands up on the wall of a cylinder about the vertical.
 * Left to right on the plate runs around the cylinder, the back edge becomes
 * the top, and the thickness stands outward - or inward, for an engraving.
 *
 * The bend only depends on the position along the arc, so the mesh is first
 * cut by planes across the arc, a few degrees apart: then no triangle spans
 * more than one of those steps and the bent surface stays round instead of
 * cutting chords. The cuts go through an indexed mesh with one shared point
 * per cut edge, so neighbouring triangles meet exactly and a closed body stays
 * closed.
 */

export type CylinderWrapVec3 = [number, number, number];
export type CylinderWrapInput = { vertices: CylinderWrapVec3[]; faces: [number, number, number][] };

export type CylinderWrapOptions = {
  /** Diameter of the cylinder wall the body is laid on, in mm. */
  diameter: number;
  /** The thickness goes into the wall instead of standing out of it - for engraving with a hole. */
  inward?: boolean;
};

export type CylinderWrapResult = {
  /** Triangles as a flat list, with the cylinder axis at x = z = 0 and the bottom at y = 0. */
  positions: number[];
  /** Radius the result is given for, width and depth of its box are twice this; an engraving reaches a little beyond it, see the overshoot. */
  outerRadius: number;
  /** Height on the wall: the depth the body had on the plate. */
  height: number;
  /** How much of the circle the body covers, in degrees. */
  arcDegrees: number;
  /** Centre of the body on the plate and its bottom, before wrapping. */
  flatCenter: { x: number; z: number };
  flatBottom: number;
  /** Thickness of the body on the plate - how far it stands out of (or into) the wall. */
  thickness: number;
};

export type CylinderWrapError = "empty" | "invalidDiameter" | "tooWide" | "tooThick";

/** Angle between two cuts across the arc. Two degrees keep the chord within 0.02 mm up to 70 mm radius. */
export const CYLINDER_WRAP_STEP_DEGREES = 2;
const ON_PLANE_EPSILON = 1e-9;
/**
 * An engraving's outer skin reaches this far beyond the given diameter (#578). A cylinder is made of flat facets, 96 of them for
 * the kernel's, so its wall lies up to 0.03 mm inside the true circle between the corners, and the wrapped body's own facets are
 * cut differently. A hole that ended exactly on the wall left a hair-thin skin standing over parts of the letters.
 */
export const CYLINDER_WRAP_INWARD_OVERSHOOT_MM = 0.05;

export function wrapMeshAroundCylinder(mesh: CylinderWrapInput, options: CylinderWrapOptions): CylinderWrapResult | { error: CylinderWrapError } {
  if (!mesh.faces.length || !mesh.vertices.length) return { error: "empty" };
  const radius = options.diameter / 2;
  if (!Number.isFinite(radius) || radius <= 0) return { error: "invalidDiameter" };

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
  mesh.faces.forEach((face) => face.forEach((index) => {
    const [x, y, z] = mesh.vertices[index];
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
  }));
  const width = maxX - minX;
  const depth = maxZ - minZ;
  const thickness = maxY - minY;
  // Once around and no further: more would run the body into itself.
  if (width > 2 * Math.PI * radius * (1 + 1e-9)) return { error: "tooWide" };
  if (options.inward && thickness >= radius) return { error: "tooThick" };

  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const vertices: CylinderWrapVec3[] = mesh.vertices.map(([x, y, z]) => [x - centerX, y - minY, z - centerZ]);
  const step = radius * (CYLINDER_WRAP_STEP_DEGREES * Math.PI / 180);
  const first = Math.ceil((-width / 2) / step);
  const last = Math.floor((width / 2) / step);
  const faces = cutAcrossArc(vertices, mesh.faces, step, first, last);

  const innerRadius = options.inward ? radius - thickness : radius;
  // The inside of an engraving stays where it was; only its outside is pushed out by the overshoot.
  const stretch = options.inward && thickness > 0 ? (thickness + CYLINDER_WRAP_INWARD_OVERSHOOT_MM) / thickness : 1;
  const positions: number[] = [];
  const bent = vertices.map(([x, y, z]): CylinderWrapVec3 => {
    const angle = x / radius;
    const r = innerRadius + y * stretch;
    // The back edge on the plate (smallest z) becomes the top of the wall.
    return [r * Math.sin(angle), depth / 2 - z, r * Math.cos(angle)];
  });
  faces.forEach((face) => face.forEach((index) => positions.push(...bent[index])));

  return {
    positions,
    outerRadius: options.inward ? radius : radius + thickness,
    height: depth,
    arcDegrees: (width / radius) * 180 / Math.PI,
    flatCenter: { x: centerX, z: centerZ },
    flatBottom: minY,
    thickness,
  };
}

/**
 * Cuts every face by the planes x = k * step, k from first to last, in that order. Each face is cut
 * on its own, and only by the planes that lie across it: the same pieces as cutting the whole mesh plane
 * after plane, in the same order, without going over every face for each of up to 180 planes. The point
 * on an edge is made once per plane, so neighbouring faces share it.
 */
function cutAcrossArc(vertices: CylinderWrapVec3[], faces: readonly [number, number, number][], step: number, first: number, last: number) {
  const edgePoints = new Map<string, number>();
  const result: [number, number, number][] = [];
  const pieces: Array<{ face: [number, number, number]; from: number }> = [];
  for (let index = faces.length - 1; index >= 0; index -= 1) pieces.push({ face: [...faces[index]] as [number, number, number], from: first });
  while (pieces.length) {
    const { face, from } = pieces.pop()!;
    const xs = face.map((index) => vertices[index][0]);
    // A plane further than this from the face cannot have its corners on both sides.
    const to = Math.min(last, Math.floor((Math.max(...xs) + ON_PLANE_EPSILON) / step) + 1);
    let k = Math.max(from, Math.ceil((Math.min(...xs) - ON_PLANE_EPSILON) / step) - 1);
    let split: [number, number, number][] | null = null;
    for (; k <= to; k += 1) {
      split = cutFace(vertices, face, k * step, edgePoints, k);
      if (split) break;
    }
    if (!split) {
      result.push(face);
      continue;
    }
    for (let index = split.length - 1; index >= 0; index -= 1) pieces.push({ face: split[index], from: k + 1 });
  }
  return result;
}

/** The pieces of a face that crosses the plane x = cut, or null when it does not cross it. */
function cutFace(vertices: CylinderWrapVec3[], face: [number, number, number], cut: number, edgePoints: Map<string, number>, plane: number): [number, number, number][] | null {
  const pointOnEdge = (a: number, b: number) => {
    const [i, j] = a < b ? [a, b] : [b, a];
    const key = `${plane}:${i}:${j}`;
    const known = edgePoints.get(key);
    if (known !== undefined) return known;
    const p = vertices[i];
    const q = vertices[j];
    const t = (cut - p[0]) / (q[0] - p[0]);
    vertices.push([cut, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t]);
    edgePoints.set(key, vertices.length - 1);
    return vertices.length - 1;
  };
  const side = (index: number) => {
    const offset = vertices[index][0] - cut;
    return Math.abs(offset) <= ON_PLANE_EPSILON ? 0 : Math.sign(offset);
  };

  const sides = face.map(side);
  if (!(sides.some((s) => s > 0) && sides.some((s) => s < 0))) return null;
  const zero = sides.indexOf(0);
  if (zero >= 0) {
    // One corner on the plane, the other two on either side: halve the opposite edge.
    const a = face[zero];
    const b = face[(zero + 1) % 3];
    const c = face[(zero + 2) % 3];
    const m = pointOnEdge(b, c);
    return [[a, b, m], [a, m, c]];
  }
  // One corner alone on its side: it keeps a triangle, the other two a quad.
  const lone = sides.findIndex((s, index) => sides.filter((other) => other === s).length === 1 && index >= 0);
  const a = face[lone];
  const b = face[(lone + 1) % 3];
  const c = face[(lone + 2) % 3];
  const ab = pointOnEdge(a, b);
  const ca = pointOnEdge(c, a);
  return [[a, ab, ca], [ab, b, c], [ab, c, ca]];
}
