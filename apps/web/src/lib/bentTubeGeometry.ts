import * as THREE from "three";
import { toCreasedNormals } from "@/lib/creasedNormals";
import type { BentTubeInnerProfile, BentTubeProfile, BentTubeSegment, WorkplaneShape } from "@/types/layerling";

/*
 * Bent Tube: a pipe that follows a chain of segments. Every segment is a
 * straight run followed by a true circular-arc bend (constant centre-line
 * radius). The roll of a segment turns the plane of its bend about the
 * current running direction, relative to the previous bend.
 *
 * The body is built directly as an indexed triangle mesh: a ring of profile
 * points at every station along the path, consecutive rings stitched into
 * walls, and both ends closed with caps that share exactly the ring vertices.
 * Every edge is therefore used by exactly two triangles with opposite
 * direction, which is what grouping, hole subtraction and slicers need.
 *
 * Coordinate conventions match the other parametric shapes: the path starts at
 * the origin running along +X, the first bend (roll 0) turns within the
 * horizontal plane towards -Z, and roll +90 turns it upwards (+Y). The
 * profile's own axes are carried along the path, so a square tube keeps its
 * orientation relative to the material when the bend plane is rolled.
 */

export const BENT_TUBE_PROFILES: readonly BentTubeProfile[] = ["round", "square", "hexagon", "octagon"];
export const BENT_TUBE_INNER_PROFILES: readonly BentTubeInnerProfile[] = ["none", "round", "square", "hexagon", "octagon"];

export const DEFAULT_BENT_TUBE_PROFILE: BentTubeProfile = "round";
export const DEFAULT_BENT_TUBE_INNER_PROFILE: BentTubeInnerProfile = "round";
export const DEFAULT_BENT_TUBE_SIZE = 10;
export const DEFAULT_BENT_TUBE_WALL = 1.5;
export const DEFAULT_BENT_TUBE_QUALITY = 32;

export const MIN_BENT_TUBE_SIZE = 1;
export const MAX_BENT_TUBE_SIZE = 500;
export const MIN_BENT_TUBE_WALL = 0.2;
export const MIN_BENT_TUBE_QUALITY = 12;
export const MAX_BENT_TUBE_QUALITY = 96;
export const MAX_BENT_TUBE_SEGMENTS = 12;
export const MAX_BENT_TUBE_SEGMENT_LENGTH = 1000;
export const MAX_BENT_TUBE_BEND_ANGLE = 180;
export const MAX_BENT_TUBE_ROLL = 180;
export const MAX_BENT_TUBE_BEND_RADIUS = 1000;
/**
 * Clearance between the bend axis and the innermost profile point. At zero the
 * inner side of the bend would collapse onto one line and the body would stop
 * being a closed solid.
 */
export const BENT_TUBE_BEND_RADIUS_CLEARANCE = 0.1;
/** Smallest inner opening left when a wall is as thick as it may get. */
const MIN_BENT_TUBE_INNER_RADIUS = 0.1;
/** A path that is shorter than this in total gets its first straight run lengthened. */
const MIN_BENT_TUBE_PATH_LENGTH = 1;

export const DEFAULT_BENT_TUBE_SEGMENTS: readonly BentTubeSegment[] = [
  { length: 25, bendAngle: 90, bendRadius: 15, roll: 0 },
  { length: 25, bendAngle: 0, bendRadius: 15, roll: 0 },
];

export type BentTubeShapeFields = {
  bentTubeProfile?: BentTubeProfile;
  bentTubeInnerProfile?: BentTubeInnerProfile;
  bentTubeSize?: number;
  bentTubeWall?: number;
  bentTubeQuality?: number;
  bentTubeSegments?: BentTubeSegment[];
};

export type BentTubeSettings = {
  profile: BentTubeProfile;
  innerProfile: BentTubeInnerProfile;
  size: number;
  wall: number;
  quality: number;
  segments: BentTubeSegment[];
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function finite(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function normalizeBentTubeProfile(value: unknown): BentTubeProfile {
  return BENT_TUBE_PROFILES.includes(value as BentTubeProfile) ? value as BentTubeProfile : DEFAULT_BENT_TUBE_PROFILE;
}

export function normalizeBentTubeInnerProfile(value: unknown): BentTubeInnerProfile {
  return BENT_TUBE_INNER_PROFILES.includes(value as BentTubeInnerProfile) ? value as BentTubeInnerProfile : DEFAULT_BENT_TUBE_INNER_PROFILE;
}

export function normalizeBentTubeSize(value: unknown) {
  return clamp(finite(value, DEFAULT_BENT_TUBE_SIZE), MIN_BENT_TUBE_SIZE, MAX_BENT_TUBE_SIZE);
}

export function normalizeBentTubeQuality(value: unknown) {
  const rounded = Math.round(clamp(finite(value, DEFAULT_BENT_TUBE_QUALITY), MIN_BENT_TUBE_QUALITY, MAX_BENT_TUBE_QUALITY) / 4) * 4;
  return clamp(rounded, MIN_BENT_TUBE_QUALITY, MAX_BENT_TUBE_QUALITY);
}

function profileSides(profile: BentTubeProfile, quality: number) {
  if (profile === "square") return 4;
  if (profile === "hexagon") return 6;
  if (profile === "octagon") return 8;
  return quality;
}

/**
 * The profile size is the diameter of a round tube and the width across flats
 * of a polygonal one. A round tube is drawn with its corners on that circle,
 * so its flats lie slightly inside it.
 */
function outerInradius(profile: BentTubeProfile, size: number, quality: number) {
  const half = size / 2;
  return profile === "round" ? half * Math.cos(Math.PI / quality) : half;
}

/** Distance from the centre line to the outermost profile corner. */
export function bentTubeOuterCircumradius(profile: BentTubeProfile, size: number, quality = DEFAULT_BENT_TUBE_QUALITY) {
  const half = size / 2;
  return profile === "round" ? half : half / Math.cos(Math.PI / profileSides(profile, normalizeBentTubeQuality(quality)));
}

/**
 * The thickest wall that still leaves an opening. With the same profile inside
 * and out the wall is uniform. With different profiles the value is the
 * thinnest point of the wall: the inner profile's corners stay that far inside
 * the outer profile's flats, so the inner profile can never break through.
 */
export function bentTubeWallLimits(profile: BentTubeProfile, innerProfile: BentTubeInnerProfile, size: number, quality = DEFAULT_BENT_TUBE_QUALITY) {
  const q = normalizeBentTubeQuality(quality);
  const available = innerProfile === profile
    ? (profile === "round" ? size / 2 : outerInradius(profile, size, q))
    : outerInradius(profile, size, q);
  const max = Math.max(MIN_BENT_TUBE_WALL, available - MIN_BENT_TUBE_INNER_RADIUS);
  return { min: MIN_BENT_TUBE_WALL, max };
}

export function normalizeBentTubeWall(value: unknown, profile: BentTubeProfile, innerProfile: BentTubeInnerProfile, size: number, quality = DEFAULT_BENT_TUBE_QUALITY) {
  const limits = bentTubeWallLimits(profile, innerProfile, size, quality);
  return clamp(finite(value, DEFAULT_BENT_TUBE_WALL), limits.min, limits.max);
}

/** The tightest bend the outer profile allows without folding into itself. */
export function minBentTubeBendRadius(profile: BentTubeProfile, size: number, quality = DEFAULT_BENT_TUBE_QUALITY) {
  return bentTubeOuterCircumradius(profile, size, quality) + BENT_TUBE_BEND_RADIUS_CLEARANCE;
}

/** Wraps an angle into [-180, 180] so a typed 270 means the same as -90. */
function wrapDegrees(value: number) {
  const wrapped = ((((value + 180) % 360) + 360) % 360) - 180;
  return wrapped === -180 && value > 0 ? 180 : wrapped;
}

export function normalizeBentTubeSegment(segment: Partial<BentTubeSegment> | undefined, minBendRadius: number): BentTubeSegment {
  const source = segment ?? {};
  return {
    length: clamp(finite(source.length, 0), 0, MAX_BENT_TUBE_SEGMENT_LENGTH),
    bendAngle: clamp(finite(source.bendAngle, 0), -MAX_BENT_TUBE_BEND_ANGLE, MAX_BENT_TUBE_BEND_ANGLE),
    bendRadius: clamp(finite(source.bendRadius, minBendRadius), minBendRadius, Math.max(minBendRadius, MAX_BENT_TUBE_BEND_RADIUS)),
    roll: wrapDegrees(finite(source.roll, 0)),
  };
}

export function normalizeBentTubeSegments(value: unknown, profile: BentTubeProfile, size: number, quality = DEFAULT_BENT_TUBE_QUALITY): BentTubeSegment[] {
  const minRadius = minBentTubeBendRadius(profile, size, quality);
  const source = Array.isArray(value) && value.length > 0 ? value : DEFAULT_BENT_TUBE_SEGMENTS;
  const segments = source
    .slice(0, MAX_BENT_TUBE_SEGMENTS)
    .map((segment) => normalizeBentTubeSegment(segment && typeof segment === "object" ? segment as Partial<BentTubeSegment> : undefined, minRadius));
  const pathLength = segments.reduce((total, segment) => total + segment.length + (Math.abs(segment.bendAngle) * Math.PI / 180) * segment.bendRadius, 0);
  if (pathLength < MIN_BENT_TUBE_PATH_LENGTH) {
    segments[0] = { ...segments[0], length: segments[0].length + (MIN_BENT_TUBE_PATH_LENGTH - pathLength) };
  }
  return segments;
}

export function bentTubeSettings(shape: BentTubeShapeFields): BentTubeSettings {
  const profile = normalizeBentTubeProfile(shape.bentTubeProfile);
  const innerProfile = normalizeBentTubeInnerProfile(shape.bentTubeInnerProfile);
  const size = normalizeBentTubeSize(shape.bentTubeSize);
  const quality = normalizeBentTubeQuality(shape.bentTubeQuality);
  return {
    profile,
    innerProfile,
    size,
    quality,
    wall: normalizeBentTubeWall(shape.bentTubeWall, profile, innerProfile, size, quality),
    segments: normalizeBentTubeSegments(shape.bentTubeSegments, profile, size, quality),
  };
}

/** The stored fields exactly as the geometry will read them. */
export function normalizedBentTubeFields(shape: BentTubeShapeFields): Required<BentTubeShapeFields> {
  const settings = bentTubeSettings(shape);
  return {
    bentTubeProfile: settings.profile,
    bentTubeInnerProfile: settings.innerProfile,
    bentTubeSize: settings.size,
    bentTubeWall: settings.wall,
    bentTubeQuality: settings.quality,
    bentTubeSegments: settings.segments,
  };
}

export function bentTubeSegmentsEqual(a: readonly BentTubeSegment[] | undefined, b: readonly BentTubeSegment[] | undefined) {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  return a.every((segment, index) => {
    const other = b[index];
    return segment.length === other.length
      && segment.bendAngle === other.bendAngle
      && segment.bendRadius === other.bendRadius
      && segment.roll === other.roll;
  });
}

type Vec3 = [number, number, number];

function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function scale(a: Vec3, s: number): Vec3 {
  return [a[0] * s, a[1] * s, a[2] * s];
}

function dot(a: Vec3, b: Vec3) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function normalize(a: Vec3): Vec3 {
  const length = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / length, a[1] / length, a[2] / length];
}

/** Rodrigues rotation of a vector about a unit axis. */
function rotate(v: Vec3, axis: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const k = cross(axis, v);
  const d = dot(axis, v) * (1 - c);
  return [
    v[0] * c + k[0] * s + axis[0] * d,
    v[1] * c + k[1] * s + axis[1] * d,
    v[2] * c + k[2] * s + axis[2] * d,
  ];
}

/** One cross-section along the path: position, running direction and the profile's own axes. */
export type BentTubeStation = {
  point: Vec3;
  tangent: Vec3;
  u: Vec3;
  v: Vec3;
  /** Distance along the centre line from the start. */
  distance: number;
};

const STATION_EPSILON = 1e-6;

function arcSteps(angleDegrees: number, quality: number) {
  return Math.max(1, Math.ceil((Math.abs(angleDegrees) * quality) / 240));
}

/**
 * Walks the segment chain and returns every cross-section the mesh needs.
 * `straightSpacing` additionally subdivides straight runs, which only the
 * self-intersection check uses; the mesh itself never needs it.
 */
export function bentTubeStations(settings: BentTubeSettings, straightSpacing = Number.POSITIVE_INFINITY): BentTubeStation[] {
  let point: Vec3 = [0, 0, 0];
  let tangent: Vec3 = [1, 0, 0];
  let bendDirection: Vec3 = [0, 0, -1];
  let u: Vec3 = [0, 0, -1];
  let v: Vec3 = [0, 1, 0];
  let distance = 0;
  const stations: BentTubeStation[] = [{ point, tangent, u, v, distance }];
  const push = () => {
    const last = stations[stations.length - 1];
    const gap = sub(point, last.point);
    if (Math.hypot(gap[0], gap[1], gap[2]) <= STATION_EPSILON) return;
    stations.push({ point, tangent, u, v, distance });
  };

  settings.segments.forEach((segment) => {
    bendDirection = normalize(rotate(bendDirection, tangent, (segment.roll * Math.PI) / 180));
    if (segment.length > STATION_EPSILON) {
      const pieces = Number.isFinite(straightSpacing) ? Math.max(1, Math.ceil(segment.length / straightSpacing)) : 1;
      const start = point;
      const startDistance = distance;
      for (let piece = 1; piece <= pieces; piece += 1) {
        const along = (segment.length * piece) / pieces;
        point = add(start, scale(tangent, along));
        distance = startDistance + along;
        push();
      }
    }
    if (Math.abs(segment.bendAngle) > 1e-9) {
      const toward = segment.bendAngle < 0 ? scale(bendDirection, -1) : bendDirection;
      const axis = normalize(cross(tangent, toward));
      const centre = add(point, scale(toward, segment.bendRadius));
      const total = (Math.abs(segment.bendAngle) * Math.PI) / 180;
      const steps = arcSteps(segment.bendAngle, settings.quality);
      const start = { point, tangent, u, v, bendDirection, distance };
      for (let step = 1; step <= steps; step += 1) {
        const angle = (total * step) / steps;
        point = add(centre, rotate(sub(start.point, centre), axis, angle));
        tangent = normalize(rotate(start.tangent, axis, angle));
        u = normalize(rotate(start.u, axis, angle));
        v = normalize(rotate(start.v, axis, angle));
        distance = start.distance + angle * segment.bendRadius;
        push();
      }
      bendDirection = normalize(rotate(start.bendDirection, axis, total));
    }
  });
  return stations;
}

type Profile2D = Array<[number, number]>;

/**
 * Regular polygon with a flat on top (+v) and, for the round profile, a
 * vertex count that follows the quality. Points run counter-clockwise in
 * (u, v), whose normal is the running direction.
 */
export function profilePoints(profile: BentTubeProfile, circumradius: number, quality: number): Profile2D {
  const sides = profileSides(profile, quality);
  const step = (Math.PI * 2) / sides;
  const offset = ((Math.PI / 2 - Math.PI / sides) % step + step) % step;
  const points: Profile2D = [];
  for (let index = 0; index < sides; index += 1) {
    const angle = offset + index * step;
    points.push([Math.cos(angle) * circumradius, Math.sin(angle) * circumradius]);
  }
  return points;
}

export type BentTubeProfiles = { outer: Profile2D; inner: Profile2D | null };

export function bentTubeProfiles(settings: BentTubeSettings): BentTubeProfiles {
  const { profile, innerProfile, quality } = settings;
  const radii = bentTubeProfileRadii(settings);
  const outer = profilePoints(profile, radii.outer, quality);
  if (innerProfile === "none" || radii.inner === null) return { outer, inner: null };
  return { outer, inner: profilePoints(innerProfile, radii.inner, quality) };
}

/**
 * Circumradius of the outer profile and of the opening (null when solid): the
 * corners of a polygonal profile lie on that circle, and a round profile is
 * that circle - the display draws it with `quality` corners on it.
 */
export function bentTubeProfileRadii(settings: BentTubeSettings): { outer: number; inner: number | null } {
  const { profile, innerProfile, size, wall, quality } = settings;
  const outer = bentTubeOuterCircumradius(profile, size, quality);
  if (innerProfile === "none") return { outer, inner: null };
  let innerCircumradius: number;
  if (innerProfile === profile) {
    // Same profile: a uniformly offset copy. A round tube is measured at its
    // corners, a polygonal one across its flats - both give a wall of `wall`.
    innerCircumradius = profile === "round"
      ? size / 2 - wall
      : (size / 2 - wall) / Math.cos(Math.PI / profileSides(profile, quality));
  } else {
    // Different profiles: the wall is its thinnest point, at the inner corners.
    innerCircumradius = outerInradius(profile, size, quality) - wall;
  }
  return { outer, inner: Math.max(MIN_BENT_TUBE_INNER_RADIUS, innerCircumradius) };
}

/**
 * One piece of the centre line for the exact body: a straight run or a bend.
 * `frame` is a 3x4 matrix, row by row, that sets a section drawn in the X/Z
 * plane at the start of the piece: local X runs along the profile's v axis,
 * local Y along the running direction and local Z along u, so a profile point
 * (a, b) in (u, v) is drawn at x = b, z = a. The matrix keeps handedness
 * (det +1). A bend turns the section about `axis` through `center` by
 * `angle` radians, right-handed - the same rotation bentTubeStations applies.
 */
export type BentTubePathPiece =
  | { kind: "straight"; frame: number[]; length: number }
  | { kind: "bend"; frame: number[]; center: Vec3; axis: Vec3; angle: number };

/**
 * The centre line as straight runs and true circular bends, walked exactly as
 * bentTubeStations walks it; the exact body is the section pushed along each
 * run and turned through each bend.
 */
export function bentTubePathPieces(settings: BentTubeSettings): BentTubePathPiece[] {
  let point: Vec3 = [0, 0, 0];
  let tangent: Vec3 = [1, 0, 0];
  let bendDirection: Vec3 = [0, 0, -1];
  let u: Vec3 = [0, 0, -1];
  let v: Vec3 = [0, 1, 0];
  const pieces: BentTubePathPiece[] = [];
  const frame = () => [
    v[0], tangent[0], u[0], point[0],
    v[1], tangent[1], u[1], point[1],
    v[2], tangent[2], u[2], point[2],
  ];
  settings.segments.forEach((segment) => {
    bendDirection = normalize(rotate(bendDirection, tangent, (segment.roll * Math.PI) / 180));
    if (segment.length > STATION_EPSILON) {
      pieces.push({ kind: "straight", frame: frame(), length: segment.length });
      point = add(point, scale(tangent, segment.length));
    }
    if (Math.abs(segment.bendAngle) > 1e-9) {
      const toward = segment.bendAngle < 0 ? scale(bendDirection, -1) : bendDirection;
      const axis = normalize(cross(tangent, toward));
      const center = add(point, scale(toward, segment.bendRadius));
      const total = (Math.abs(segment.bendAngle) * Math.PI) / 180;
      pieces.push({ kind: "bend", frame: frame(), center, axis, angle: total });
      point = add(center, rotate(sub(point, center), axis, total));
      tangent = normalize(rotate(tangent, axis, total));
      u = normalize(rotate(u, axis, total));
      v = normalize(rotate(v, axis, total));
      bendDirection = normalize(rotate(bendDirection, axis, total));
    }
  });
  return pieces;
}

/**
 * How the body built in its own frame (path from the origin) is placed in the
 * shape's local frame: moved so the box is centred in X and Z and rests on
 * y = 0, and stretched to the shape's width, height and depth - exactly what
 * createBentTubeGeometry does to the display mesh.
 */
export function bentTubeLocalPlacement(options: BentTubeGeometryOptions) {
  const mesh = buildBentTubeMesh(bentTubeSettings(options));
  const { min, max } = boundsOf(mesh.positions, mesh.outerVertexCount);
  const natural: Vec3 = [Math.max(1e-6, max[0] - min[0]), Math.max(1e-6, max[1] - min[1]), Math.max(1e-6, max[2] - min[2])];
  return {
    centre: [(min[0] + max[0]) / 2, min[1], (min[2] + max[2]) / 2] as Vec3,
    factor: [Math.max(0.01, options.width) / natural[0], Math.max(0.01, options.height) / natural[1], Math.max(0.01, options.depth) / natural[2]] as Vec3,
  };
}

function signedArea(points: Profile2D) {
  let area = 0;
  for (let index = 0; index < points.length; index += 1) {
    const [ax, ay] = points[index];
    const [bx, by] = points[(index + 1) % points.length];
    area += ax * by - bx * ay;
  }
  return area / 2;
}

/**
 * Triangulates the end face between the outer profile and the optional inner
 * one, using only the ring points themselves so the cap shares every edge
 * with the walls. Returns index pairs into the outer ring (>= 0) and the inner
 * ring (encoded as -1 - index), each triangle counter-clockwise in (u, v).
 */
function capTriangles(profiles: BentTubeProfiles): Array<[number, number, number]> {
  const outer = profiles.outer.map(([x, y]) => new THREE.Vector2(x, y));
  const refs: number[] = profiles.outer.map((_point, index) => index);
  const holes: THREE.Vector2[][] = [];
  if (profiles.inner) {
    // Holes are expected clockwise; feeding them that way keeps ShapeUtils
    // from reversing anything, so the indices map back without guessing.
    const reversed = profiles.inner.map((_point, index) => profiles.inner!.length - 1 - index);
    holes.push(reversed.map((index) => new THREE.Vector2(profiles.inner![index][0], profiles.inner![index][1])));
    reversed.forEach((index) => refs.push(-1 - index));
  }
  const all: Profile2D = [...profiles.outer, ...(profiles.inner ? [...profiles.inner].reverse() : [])];
  const faces = THREE.ShapeUtils.triangulateShape(outer, holes);
  return faces.map(([a, b, c]) => {
    const area = signedArea([all[a], all[b], all[c]]);
    return area >= 0 ? [refs[a], refs[b], refs[c]] : [refs[a], refs[c], refs[b]];
  });
}

export type BentTubeMesh = {
  positions: number[];
  indices: number[];
  /** Number of vertices that belong to outer rings; they alone decide the bounds. */
  outerVertexCount: number;
};

/** The body in its own frame, before it is centred and fitted to a size. */
export function buildBentTubeMesh(settings: BentTubeSettings): BentTubeMesh {
  const stations = bentTubeStations(settings);
  const profiles = bentTubeProfiles(settings);
  const outerCount = profiles.outer.length;
  const innerCount = profiles.inner?.length ?? 0;
  const positions: number[] = [];
  const indices: number[] = [];
  const place = (station: BentTubeStation, [a, b]: [number, number]) => {
    positions.push(
      station.point[0] + station.u[0] * a + station.v[0] * b,
      station.point[1] + station.u[1] * a + station.v[1] * b,
      station.point[2] + station.u[2] * a + station.v[2] * b,
    );
  };
  stations.forEach((station) => profiles.outer.forEach((point) => place(station, point)));
  const outerVertexCount = positions.length / 3;
  if (profiles.inner) stations.forEach((station) => profiles.inner!.forEach((point) => place(station, point)));

  const outerIndex = (station: number, corner: number) => station * outerCount + (corner % outerCount);
  const innerIndex = (station: number, corner: number) => outerVertexCount + station * innerCount + (corner % innerCount);

  for (let station = 0; station + 1 < stations.length; station += 1) {
    for (let corner = 0; corner < outerCount; corner += 1) {
      const a = outerIndex(station, corner);
      const b = outerIndex(station, corner + 1);
      const c = outerIndex(station + 1, corner + 1);
      const d = outerIndex(station + 1, corner);
      indices.push(a, b, c, a, c, d);
    }
    for (let corner = 0; corner < innerCount; corner += 1) {
      const a = innerIndex(station, corner);
      const b = innerIndex(station, corner + 1);
      const c = innerIndex(station + 1, corner + 1);
      const d = innerIndex(station + 1, corner);
      // Facing the axis: the opposite winding of the outer wall.
      indices.push(a, c, b, a, d, c);
    }
  }

  const caps = capTriangles(profiles);
  const last = stations.length - 1;
  const resolve = (station: number, ref: number) => (ref >= 0 ? outerIndex(station, ref) : innerIndex(station, -1 - ref));
  caps.forEach(([a, b, c]) => {
    // Counter-clockwise in (u, v) faces along the running direction: that is
    // outwards at the end and inwards at the start.
    indices.push(resolve(0, a), resolve(0, c), resolve(0, b));
    indices.push(resolve(last, a), resolve(last, b), resolve(last, c));
  });
  return { positions, indices, outerVertexCount };
}

export type BentTubeBounds = { min: Vec3; max: Vec3 };

function boundsOf(positions: number[], count: number, transform?: (point: Vec3) => Vec3): BentTubeBounds {
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (let index = 0; index < count; index += 1) {
    const raw: Vec3 = [positions[index * 3], positions[index * 3 + 1], positions[index * 3 + 2]];
    const point = transform ? transform(raw) : raw;
    for (let axis = 0; axis < 3; axis += 1) {
      if (point[axis] < min[axis]) min[axis] = point[axis];
      if (point[axis] > max[axis]) max[axis] = point[axis];
    }
  }
  return { min, max };
}

/**
 * Size of the body exactly as the parameters describe it. These become the
 * shape's width, depth and height when it is made; a changed parameter keeps a stretch the handles gave it.
 */
export function bentTubeNaturalDimensions(shape: BentTubeShapeFields) {
  const mesh = buildBentTubeMesh(bentTubeSettings(shape));
  const { min, max } = boundsOf(mesh.positions, mesh.outerVertexCount);
  const width = max[0] - min[0];
  const height = max[1] - min[1];
  const depth = max[2] - min[2];
  return { width, depth, height, size: Math.max(width, depth) };
}

export type BentTubeGeometryOptions = BentTubeShapeFields & {
  width: number;
  depth: number;
  height: number;
};

/**
 * Local frame of the finished geometry: centred in X and Z, resting on Y = 0
 * and stretched to the shape's box (1:1 as long as the box is the natural size).
 */
function localFrame(mesh: BentTubeMesh, width: number, depth: number, height: number) {
  // bentTubeLocalPlacement computes the same centre and factor for the exact body.
  const { min, max } = boundsOf(mesh.positions, mesh.outerVertexCount);
  const natural: Vec3 = [Math.max(1e-6, max[0] - min[0]), Math.max(1e-6, max[1] - min[1]), Math.max(1e-6, max[2] - min[2])];
  const factor: Vec3 = [Math.max(0.01, width) / natural[0], Math.max(0.01, height) / natural[1], Math.max(0.01, depth) / natural[2]];
  const centre: Vec3 = [(min[0] + max[0]) / 2, min[1], (min[2] + max[2]) / 2];
  return (point: Vec3): Vec3 => [
    (point[0] - centre[0]) * factor[0],
    (point[1] - centre[1]) * factor[1],
    (point[2] - centre[2]) * factor[2],
  ];
}

export function createBentTubeGeometry(options: BentTubeGeometryOptions) {
  const mesh = buildBentTubeMesh(bentTubeSettings(options));
  const toLocal = localFrame(mesh, options.width, options.depth, options.height);
  const positions = new Float32Array(mesh.positions.length);
  for (let index = 0; index < mesh.positions.length; index += 3) {
    const local = toLocal([mesh.positions[index], mesh.positions[index + 1], mesh.positions[index + 2]]);
    positions[index] = local[0];
    positions[index + 1] = local[1];
    positions[index + 2] = local[2];
  }
  const indexed = new THREE.BufferGeometry();
  indexed.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  indexed.setIndex(mesh.indices);
  const geometry = toCreasedNormals(indexed, THREE.MathUtils.degToRad(35));
  indexed.dispose();
  geometry.computeBoundingBox();
  return geometry;
}

/**
 * Just the walls of one segment, a hair wider than the tube, in the same local
 * frame as the tube's own geometry. The editor draws it over the tube to show
 * which segment the settings are about. Null for a segment that has no length
 * and no bend.
 */
export function createBentTubeSegmentGeometry(options: BentTubeGeometryOptions, segmentIndex: number, margin = 0.4) {
  const settings = bentTubeSettings(options);
  if (!Number.isInteger(segmentIndex) || segmentIndex < 0 || segmentIndex >= settings.segments.length) return null;
  const toLocal = localFrame(buildBentTubeMesh(settings), options.width, options.depth, options.height);
  const before = bentTubeStations({ ...settings, segments: settings.segments.slice(0, segmentIndex) });
  const through = bentTubeStations({ ...settings, segments: settings.segments.slice(0, segmentIndex + 1) });
  // The stations of a shorter chain are the first stations of a longer one.
  const stations = through.slice(before.length - 1);
  if (stations.length < 2) return null;
  const ring = profilePoints(settings.profile, bentTubeProfileRadii(settings).outer + margin, settings.quality);
  const positions: number[] = [];
  stations.forEach((station) => ring.forEach(([a, b]) => {
    const local = toLocal([
      station.point[0] + station.u[0] * a + station.v[0] * b,
      station.point[1] + station.u[1] * a + station.v[1] * b,
      station.point[2] + station.u[2] * a + station.v[2] * b,
    ]);
    positions.push(local[0], local[1], local[2]);
  }));
  const indices: number[] = [];
  for (let station = 0; station + 1 < stations.length; station += 1) {
    for (let corner = 0; corner < ring.length; corner += 1) {
      const a = station * ring.length + corner;
      const b = station * ring.length + ((corner + 1) % ring.length);
      const c = (station + 1) * ring.length + ((corner + 1) % ring.length);
      const d = (station + 1) * ring.length + corner;
      indices.push(a, b, c, a, c, d);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(Float32Array.from(positions), 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * True when two cross-sections that are not neighbours on the path overlap,
 * i.e. the chain of segments runs back into itself. Local folding at a bend is
 * already excluded by the minimum bend radius; this catches the global case.
 * The check uses the outer corner circle of every section, so it errs on the
 * side of reporting.
 */
export function bentTubeSelfIntersects(shape: BentTubeShapeFields) {
  const settings = bentTubeSettings(shape);
  const radius = bentTubeOuterCircumradius(settings.profile, settings.size, settings.quality);
  const stations = bentTubeStations(settings, radius).slice(0, 800);
  for (let i = 0; i < stations.length; i += 1) {
    for (let j = i + 1; j < stations.length; j += 1) {
      if (sectionsOverlap(stations[i], stations[j], radius)) return true;
    }
  }
  return false;
}

function sectionsOverlap(a: BentTubeStation, b: BentTubeStation, radius: number) {
  const n1 = a.tangent;
  const n2 = b.tangent;
  const direction = cross(n1, n2);
  const sine = Math.hypot(direction[0], direction[1], direction[2]);
  const between = sub(b.point, a.point);
  if (sine < 1e-9) {
    // Parallel sections only touch when they lie in the same plane.
    if (Math.abs(dot(n1, between)) > 1e-6) return false;
    return Math.hypot(between[0], between[1], between[2]) < radius * 2 - 1e-6;
  }
  const lineDirection = scale(direction, 1 / sine);
  const k = dot(n1, n2);
  const h1 = dot(n1, a.point);
  const h2 = dot(n2, b.point);
  const denominator = 1 - k * k;
  const onLine = add(scale(n1, (h1 - h2 * k) / denominator), scale(n2, (h2 - h1 * k) / denominator));
  const chord = (centre: Vec3) => {
    const along = dot(sub(centre, onLine), lineDirection);
    const nearest = add(onLine, scale(lineDirection, along));
    const offset = sub(centre, nearest);
    const gap = Math.hypot(offset[0], offset[1], offset[2]);
    if (gap >= radius) return null;
    const half = Math.sqrt(radius * radius - gap * gap);
    return [along - half, along + half] as const;
  };
  const first = chord(a.point);
  const second = chord(b.point);
  if (!first || !second) return false;
  return Math.min(first[1], second[1]) - Math.max(first[0], second[0]) > 1e-6;
}

type Placement = Pick<WorkplaneShape, "x" | "z" | "width" | "depth" | "height" | "rotation" | "rotationX" | "rotationZ" | "mirrorX" | "mirrorY" | "mirrorZ" | "parametricSource">;

/**
 * Horizontal offset from the shape's stored position to the start of the
 * tube, in world units. For a plain shape the position is the centre of its
 * box. A rotated shape is stored baked, and then the position is the centre
 * of the rotated body's bounds - that case is measured the same way here.
 */
function startOffset(shape: Placement & BentTubeShapeFields, fitted: { width: number; depth: number; height: number }) {
  const settings = bentTubeSettings(shape);
  const mesh = buildBentTubeMesh(settings);
  const toLocal = localFrame(mesh, fitted.width, fitted.depth, fitted.height);
  const source = shape.parametricSource;
  const baked = Boolean(source);
  const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(
    THREE.MathUtils.degToRad((baked ? source!.rotationX : shape.rotationX) ?? 0),
    THREE.MathUtils.degToRad((baked ? source!.rotation : shape.rotation) ?? 0),
    THREE.MathUtils.degToRad((baked ? source!.rotationZ : shape.rotationZ) ?? 0),
    "XYZ",
  ));
  const mirror: Vec3 = baked ? [1, 1, 1] : [shape.mirrorX ? -1 : 1, shape.mirrorY ? -1 : 1, shape.mirrorZ ? -1 : 1];
  const halfHeight = fitted.height / 2;
  const toObject = (point: Vec3): Vec3 => {
    const local = toLocal(point);
    const vector = new THREE.Vector3(local[0] * mirror[0], (local[1] - halfHeight) * mirror[1], local[2] * mirror[2]).applyQuaternion(rotation);
    return [vector.x, vector.y, vector.z];
  };
  const start = toObject([0, 0, 0]);
  if (!baked) return start;
  const { min, max } = boundsOf(mesh.positions, mesh.outerVertexCount, toObject);
  return sub(start, [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2]);
}

/**
 * The patch for a changed bent-tube parameter: the normalised fields, the new
 * natural size, and a position that keeps the start of the tube where it was,
 * whether or not the shape has been moved or rotated. Height is left to the
 * caller, which keeps the body standing on the same floor.
 */
export function bentTubeParameterPatch(shape: Placement & BentTubeShapeFields, changes: BentTubeShapeFields): Partial<WorkplaneShape> {
  const current = normalizedBentTubeFields(shape);
  const nextFields = normalizedBentTubeFields({ ...current, ...changes });
  const naturalNow = bentTubeNaturalDimensions(current);
  const natural = bentTubeNaturalDimensions(nextFields);
  // A tube pulled larger or smaller by its handles keeps that stretch: the new size is the new natural size by the
  // factor it had before, so changing the inner profile or the wall does not put it back to its natural size (#737).
  const stretch = (now: number, natural0: number) => (now > 0 && natural0 > 0 && Number.isFinite(now / natural0) ? now / natural0 : 1);
  const stretched = {
    width: natural.width * stretch(shape.width, naturalNow.width),
    depth: natural.depth * stretch(shape.depth, naturalNow.depth),
    height: natural.height * stretch(shape.height, naturalNow.height),
  };
  const before = startOffset(shape, { width: shape.width, depth: shape.depth, height: shape.height });
  const after = startOffset({ ...shape, ...nextFields }, stretched);
  return {
    ...nextFields,
    width: stretched.width,
    depth: stretched.depth,
    height: stretched.height,
    size: Math.max(stretched.width, stretched.depth),
    x: shape.x + before[0] - after[0],
    z: shape.z + before[2] - after[2],
  };
}
