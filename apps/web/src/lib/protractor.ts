/**
 * The protractor (#1228): the angle at a corner between two points, and the angle between two faces.
 * The editor and MCP both measure with these, so the number on screen is the number MCP answers.
 */

export type ProtractorVector = { x: number; y: number; z: number };

/** Shorter than this a leg or a normal has no direction to measure by. */
const PROTRACTOR_MIN_LENGTH = 1e-6;

const toDegrees = (radians: number) => (radians * 180) / Math.PI;

function lengthOf(vector: ProtractorVector) {
  return Math.hypot(vector.x, vector.y, vector.z);
}

function between(from: ProtractorVector, to: ProtractorVector): ProtractorVector {
  return { x: to.x - from.x, y: to.y - from.y, z: to.z - from.z };
}

/** The angle between two directions in degrees, 0 to 180, or null when one of them has no length. */
function angleOfDirections(a: ProtractorVector, b: ProtractorVector) {
  const lengthA = lengthOf(a);
  const lengthB = lengthOf(b);
  if (lengthA < PROTRACTOR_MIN_LENGTH || lengthB < PROTRACTOR_MIN_LENGTH) return null;
  // atan2 of cross and dot stays exact near 0° and 180°, where acos of the dot loses its digits.
  const cross = {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
  const dot = a.x * b.x + a.y * b.y + a.z * b.z;
  return toDegrees(Math.atan2(lengthOf(cross), dot));
}

/** A straight view a measurement was begun in: the axis it looked along, and the camera's place when it has a perspective. */
export type ProtractorView = { normal: ProtractorVector; eye?: ProtractorVector | null };

/**
 * The angle at `vertex` between the legs to `a` and to `b`, 0 to 180 degrees; null when a leg has no length.
 * With `view`, the angle as that view shows it: both side points first moved to where they appear on the
 * plane through the corner square to the view (pointAsSeen).
 */
export function angleAtVertex(vertex: ProtractorVector, a: ProtractorVector, b: ProtractorVector, view?: ProtractorView | null) {
  const seenA = view ? pointAsSeen(vertex, a, view) : a;
  const seenB = view ? pointAsSeen(vertex, b, view) : b;
  return angleOfDirections(between(vertex, seenA), between(vertex, seenB));
}

const dotOf = (a: ProtractorVector, b: ProtractorVector) => a.x * b.x + a.y * b.y + a.z * b.z;

/** `point` moved along the unit `normal` onto the plane through `vertex` square to it. */
export function flattenOntoPlane(vertex: ProtractorVector, point: ProtractorVector, normal: ProtractorVector): ProtractorVector {
  const off = dotOf(between(vertex, point), normal);
  return { x: point.x - normal.x * off, y: point.y - normal.y * off, z: point.z - normal.z * off };
}

/**
 * Where `point` appears on the plane through `vertex` square to the view: along the sight line from the eye
 * in a perspective, straight along the axis without one. A bottom corner seen behind a top corner lands on it.
 */
export function pointAsSeen(vertex: ProtractorVector, point: ProtractorVector, view: ProtractorView): ProtractorVector {
  const { normal, eye } = view;
  if (!eye) return flattenOntoPlane(vertex, point, normal);
  const sight = between(eye, point);
  const across = dotOf(sight, normal);
  if (Math.abs(across) < PROTRACTOR_MIN_LENGTH) return flattenOntoPlane(vertex, point, normal);
  const t = dotOf(between(eye, vertex), normal) / across;
  return { x: eye.x + sight.x * t, y: eye.y + sight.y * t, z: eye.z + sight.z * t };
}

/** Within this many degrees of an axis a view counts as straight: from the top, the front or a side. */
const STRAIGHT_VIEW_DEGREES = 1;

/**
 * The axis a view looks straight along, as a unit vector, or null for a tilted view (#1650). Seen straight
 * from the top, a top corner and the bottom corner below it are one spot on the screen, so the protractor
 * measures there on the plane of the screen: the angle that is seen, not the one in space it may have caught.
 */
export function straightViewAxis(direction: ProtractorVector): ProtractorVector | null {
  const length = lengthOf(direction);
  if (length < PROTRACTOR_MIN_LENGTH) return null;
  const straight = Math.cos((STRAIGHT_VIEW_DEGREES * Math.PI) / 180);
  if (Math.abs(direction.x) / length >= straight) return { x: 1, y: 0, z: 0 };
  if (Math.abs(direction.y) / length >= straight) return { x: 0, y: 1, z: 0 };
  if (Math.abs(direction.z) / length >= straight) return { x: 0, y: 0, z: 1 };
  return null;
}

/**
 * The angle between two flat faces, from their normals: `angle` is the smaller of the two the planes make
 * (0 to 90 degrees, what a chamfer of 45° is called by), `other` the one beside it (180 minus that), so a
 * slanted wall reads 60° and 120° whichever way its normal points. Null when a normal has no length.
 */
export function angleBetweenFaces(normalA: ProtractorVector, normalB: ProtractorVector) {
  const normals = angleOfDirections(normalA, normalB);
  if (normals === null) return null;
  const angle = Math.min(normals, 180 - normals);
  return { angle, other: 180 - angle };
}

/** Neighbouring triangles flatter than this (degrees) are one surface bending, as round a cylinder; at a real edge they meet steeper. */
const SMOOTH_NEIGHBOUR_DEGREES = 20;

/**
 * Whether a flat patch of a display mesh (`region`, triangle indexes into `positions`, nine numbers per
 * triangle, as planarFaceTriangles finds it) is a facet of a curved surface: a triangle beside it, sharing
 * an edge, turns away by less than SMOOTH_NEIGHBOUR_DEGREES. A lone triangle can be a whole flat face (the
 * end of a wedge), so the count of triangles says nothing.
 */
export function facetOfCurvedSurface(positions: ArrayLike<number>, region: readonly number[]) {
  const triangleCount = Math.floor(positions.length / 9);
  if (region.length === 0) return false;
  let extent = 1;
  for (let axis = 0; axis < 3; axis += 1) {
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (let offset = axis; offset < triangleCount * 9; offset += 3) {
      min = Math.min(min, positions[offset]);
      max = Math.max(max, positions[offset]);
    }
    extent = Math.max(extent, max - min);
  }
  // Corners closer than this count as one; the mesh stores float32 positions.
  const weld = extent * 1e-6;
  const corner = (triangle: number, index: number) => {
    const offset = triangle * 9 + index * 3;
    return `${Math.round(positions[offset] / weld)},${Math.round(positions[offset + 1] / weld)},${Math.round(positions[offset + 2] / weld)}`;
  };
  const normal = (triangle: number): ProtractorVector => {
    const o = triangle * 9;
    const u = { x: positions[o + 3] - positions[o], y: positions[o + 4] - positions[o + 1], z: positions[o + 5] - positions[o + 2] };
    const v = { x: positions[o + 6] - positions[o], y: positions[o + 7] - positions[o + 1], z: positions[o + 8] - positions[o + 2] };
    return { x: u.y * v.z - u.z * v.y, y: u.z * v.x - u.x * v.z, z: u.x * v.y - u.y * v.x };
  };
  const inRegion = new Set(region);
  const regionCorners = new Set(region.flatMap((triangle) => [0, 1, 2].map((index) => corner(triangle, index))));
  const faceNormal = normal(region[0]);
  for (let triangle = 0; triangle < triangleCount; triangle += 1) {
    if (inRegion.has(triangle)) continue;
    const shared = [0, 1, 2].filter((index) => regionCorners.has(corner(triangle, index))).length;
    if (shared < 2) continue;
    const turn = angleOfDirections(faceNormal, normal(triangle));
    // The winding of display meshes is not always consistent, so a neighbour may point either way.
    if (turn !== null && Math.min(turn, 180 - turn) < SMOOTH_NEIGHBOUR_DEGREES) return true;
  }
  return false;
}

/** An angle as the editor shows it: to a tenth of a degree, without a trailing ".0". */
export function formatProtractorAngle(degrees: number) {
  return `${Number(degrees.toFixed(1))}°`;
}

/** What a face measurement reads: both angles, the smaller first, and one alone when the faces are square or parallel. */
export function formatFaceAngles(angles: { angle: number; other: number }) {
  const angle = formatProtractorAngle(angles.angle);
  const other = formatProtractorAngle(angles.other);
  return angle === other || angles.angle < 0.05 ? angle : `${angle} · ${other}`;
}
