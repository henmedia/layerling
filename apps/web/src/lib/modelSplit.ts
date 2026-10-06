import type { AlignAxis, WorkplaneShape } from "@/types/layerling";

/** Degrees about the two axes `splitRotationAxes` names for the split axis, in that order. */
export type SplitRotation = readonly [number, number];

export const NO_SPLIT_ROTATION: SplitRotation = [0, 0];

export type ModelSplitPlane = {
  axis: AlignAxis;
  rotation: SplitRotation;
  normal: [number, number, number];
  origin: [number, number, number];
  position: number;
  min: number;
  max: number;
  size: number;
};

type Point3 = readonly [number, number, number];

// The scene is y-up, but the panel and the AI name the axes as the Position
// card does: X to the right, Y along the depth (the scene's z), Z up (the scene's y).
export const SPLIT_AXIS_DISPLAY_ORDER: readonly AlignAxis[] = ["x", "z", "y"];

export function splitAxisLabel(axis: AlignAxis): "X" | "Y" | "Z" {
  return axis === "x" ? "X" : axis === "y" ? "Z" : "Y";
}

export function splitAxisFromLabel(label: string): AlignAxis | null {
  const value = label.trim().toLowerCase();
  return value === "x" ? "x" : value === "y" ? "z" : value === "z" ? "y" : null;
}

export function splitAxisNormal(axis: AlignAxis): [number, number, number] {
  return axis === "x" ? [1, 0, 0] : axis === "y" ? [0, 1, 0] : [0, 0, 1];
}

/** The two axes the plane turns about - the two it does not cut across. */
export function splitRotationAxes(axis: AlignAxis): readonly [AlignAxis, AlignAxis] {
  return axis === "x" ? ["z", "y"] : axis === "y" ? ["x", "z"] : ["y", "x"];
}

function rotateAboutAxis(normal: readonly [number, number, number], axis: AlignAxis, degrees: number): [number, number, number] {
  const rotationVector = splitAxisNormal(axis);
  const radians = degrees * Math.PI / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const dot = rotationVector[0] * normal[0] + rotationVector[1] * normal[1] + rotationVector[2] * normal[2];
  const cross: [number, number, number] = [
    rotationVector[1] * normal[2] - rotationVector[2] * normal[1],
    rotationVector[2] * normal[0] - rotationVector[0] * normal[2],
    rotationVector[0] * normal[1] - rotationVector[1] * normal[0],
  ];
  return normal.map((value, index) => {
    const rotated = value * cosine + cross[index] * sine + rotationVector[index] * dot * (1 - cosine);
    return Math.abs(rotated) < 1e-12 ? 0 : rotated;
  }) as [number, number, number];
}

// The second turn is about a fixed axis, applied after the first, so either
// slider alone tilts the plane exactly as its label says.
function rotatedSplitNormal(axis: AlignAxis, rotation: SplitRotation): [number, number, number] {
  const [first, second] = splitRotationAxes(axis);
  return rotateAboutAxis(rotateAboutAxis(splitAxisNormal(axis), first, rotation[0]), second, rotation[1]);
}

const AXIS_INDEX: Record<AlignAxis, 0 | 1 | 2> = { x: 0, y: 1, z: 2 };

function crossComponent(left: AlignAxis, right: AlignAxis, along: AlignAxis) {
  const a = splitAxisNormal(left);
  const b = splitAxisNormal(right);
  const cross = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  return cross[AXIS_INDEX[along]];
}

/**
 * The axis and the two turns that lay the plane on a face with this normal -
 * the inverse of `rotatedSplitNormal`. The axis is the one the normal leans
 * on most, so a face square to the axes gets no turn at all; the side the
 * normal points to does not matter for a cut.
 */
export function splitOrientationForNormal(normal: Point3): { axis: AlignAxis; rotation: SplitRotation } | null {
  const length = Math.hypot(normal[0], normal[1], normal[2]);
  if (!Number.isFinite(length) || length < 1e-9) return null;
  const axis: AlignAxis = (["x", "y", "z"] as const).reduce((best, candidate) =>
    Math.abs(normal[AXIS_INDEX[candidate]]) > Math.abs(normal[AXIS_INDEX[best]]) ? candidate : best);
  const sign = normal[AXIS_INDEX[axis]] < 0 ? -1 : 1;
  const unit = normal.map((value) => (value * sign) / length) as [number, number, number];
  const [first, second] = splitRotationAxes(axis);
  // Turning about the first axis lifts the normal towards the second axis;
  // turning about the second then swings it towards the first.
  const towardsSecond = crossComponent(first, axis, second);
  const towardsFirst = crossComponent(second, axis, first);
  const firstAngle = Math.asin(Math.max(-1, Math.min(1, towardsSecond * unit[AXIS_INDEX[second]])));
  const secondAngle = Math.cos(firstAngle) < 1e-9 ? 0 : Math.atan2(towardsFirst * unit[AXIS_INDEX[first]], unit[AXIS_INDEX[axis]]);
  // Only float noise is rounded away: a face at an odd angle keeps it exactly,
  // or the plane would tilt against the face and cut a wedge-thin skin off it.
  const degrees = (radians: number) => {
    const exact = radians * 180 / Math.PI;
    const round = Math.round(exact * 1e4) / 1e4;
    const value = Math.abs(exact - round) < 1e-6 ? round : exact;
    return Object.is(value, -0) || Math.abs(value) < 1e-9 ? 0 : value;
  };
  return { axis, rotation: [degrees(firstAngle), degrees(secondAngle)] };
}

function pointProjection(point: Point3, normal: Point3) {
  return point[0] * normal[0] + point[1] * normal[1] + point[2] * normal[2];
}

export function modelSplitPlane(points: readonly Point3[], axis: AlignAxis, requestedPosition?: number, rotation: SplitRotation = NO_SPLIT_ROTATION): ModelSplitPlane | null {
  if (points.length === 0) return null;
  const mins = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY];
  const maxs = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY];
  points.forEach((point) => {
    point.forEach((value, index) => {
      if (!Number.isFinite(value)) return;
      mins[index] = Math.min(mins[index], value);
      maxs[index] = Math.max(maxs[index], value);
    });
  });
  if (![...mins, ...maxs].every(Number.isFinite)) return null;

  const normal = rotatedSplitNormal(axis, rotation);
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  points.forEach((point) => {
    if (!point.every(Number.isFinite)) return;
    const projection = pointProjection(point, normal);
    min = Math.min(min, projection);
    max = Math.max(max, projection);
  });
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  const midpoint = (min + max) / 2;
  const position = Math.min(max, Math.max(min, Number.isFinite(requestedPosition) ? requestedPosition as number : midpoint));
  const center: [number, number, number] = [
    (mins[0] + maxs[0]) / 2,
    (mins[1] + maxs[1]) / 2,
    (mins[2] + maxs[2]) / 2,
  ];
  const rawOffset = position - pointProjection(center, normal);
  const offset = Math.abs(rawOffset) < 1e-12 ? 0 : rawOffset;
  const origin: [number, number, number] = [
    center[0] + normal[0] * offset,
    center[1] + normal[1] * offset,
    center[2] + normal[2] * offset,
  ];

  return {
    axis,
    rotation,
    normal,
    origin,
    position,
    min,
    max,
    size: Math.max(10, Math.hypot(maxs[0] - mins[0], maxs[1] - mins[1], maxs[2] - mins[2]) * 1.1),
  };
}

/**
 * A picked point is only as exact as the screen mesh it was read from. When a
 * vertex of the target lies within `tolerance` of the plane, the plane goes
 * through it exactly - so it lies on the face, not a hair beside it.
 */
export function snapSplitPositionToVertices(points: readonly Point3[], normal: Point3, position: number, tolerance = 1e-3) {
  let snapped = position;
  let nearest = tolerance;
  for (const point of points) {
    const projection = pointProjection(point, normal);
    const distance = Math.abs(projection - position);
    if (distance <= nearest) {
      nearest = distance;
      snapped = projection;
    }
  }
  return snapped;
}

export function splitPlaneIntersectsPoints(points: readonly Point3[], normal: Point3, position: number, tolerance = 1e-5) {
  let below = false;
  let above = false;
  for (const point of points) {
    const projection = pointProjection(point, normal);
    below ||= projection < position - tolerance;
    above ||= projection > position + tolerance;
    if (below && above) return true;
  }
  return false;
}

export function splitShapeFromWorldPositions(source: WorkplaneShape, positions: readonly number[], id: string, name: string): WorkplaneShape | null {
  if (positions.length < 9 || positions.length % 9 !== 0 || positions.some((value) => !Number.isFinite(value))) return null;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < positions.length; index += 3) {
    minX = Math.min(minX, positions[index]);
    minY = Math.min(minY, positions[index + 1]);
    minZ = Math.min(minZ, positions[index + 2]);
    maxX = Math.max(maxX, positions[index]);
    maxY = Math.max(maxY, positions[index + 1]);
    maxZ = Math.max(maxZ, positions[index + 2]);
  }
  if (![minX, minY, minZ, maxX, maxY, maxZ].every(Number.isFinite)) return null;

  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const width = Math.max(0.01, maxX - minX);
  const height = Math.max(0.01, maxY - minY);
  const depth = Math.max(0.01, maxZ - minZ);
  const localPositions: number[] = [];
  for (let index = 0; index < positions.length; index += 3) {
    localPositions.push(positions[index] - centerX, positions[index + 1] - minY, positions[index + 2] - centerZ);
  }

  return {
    id,
    name,
    kind: "mesh",
    color: source.color,
    x: centerX,
    z: centerZ,
    elevation: minY,
    size: Math.max(width, depth),
    width,
    depth,
    height,
    rotation: 0,
    importedMesh: {
      positions: localPositions,
      baseWidth: width,
      baseDepth: depth,
      baseHeight: height,
      triangleCount: positions.length / 9,
      sourceFormat: "json",
    },
    locked: false,
    hidden: source.hidden,
    // A split hole leaves two holes, so both halves still cut once grouped.
    ...(source.hole ? { hole: true } : {}),
  };
}
