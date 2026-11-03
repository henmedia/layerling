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

/** The angle at `vertex` between the legs to `a` and to `b`, 0 to 180 degrees; null when a leg has no length. */
export function angleAtVertex(vertex: ProtractorVector, a: ProtractorVector, b: ProtractorVector) {
  return angleOfDirections(between(vertex, a), between(vertex, b));
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
