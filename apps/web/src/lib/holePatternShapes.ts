import * as THREE from "three";
import { faceFrameWorkplane } from "@/lib/carryOntoFace";
import {
  faceOutlineFromTriangles,
  HOLE_PATTERN_MIN_SIZE,
  holeFootprintPolygon,
  holeFootprintSize,
  holeHasHead,
  holeHeadDepth,
  holeHeadSize,
  holePatternCenters,
  holeTurn,
  roundWallCenters,
  type FaceOutline,
  type HolePatternSettings,
  type Point2,
  type RoundWallOutline,
} from "@/lib/holePattern";
import { placementPatchForNewShape, type PlacementWorkplane } from "@/lib/placementWorkplane";
import { nearestFaceTriangle, planarFaceTriangles } from "@/lib/rotationPivot";
import { roundFaceTriangles, type RoundFaceAxis } from "@/lib/roundFaceAxis";
import { METRIC_COUNTERSINK_ANGLE, screwHoleFields, screwHoleSizesFor, type ScrewHoleSize } from "@/lib/screwHoleSizes";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { createLocalId } from "@/lib/localIds";
import { canonicalizeShape, shapeDepth, shapeWidth, withHoleMode } from "@/lib/workplaneShapes";
import type { ShapeKind, WorkplaneShape } from "@/types/layerling";

type Vec = { x: number; y: number; z: number };

/** How far a hole reaches out of the face and past the far side, so the cut leaves no skin behind. */
export const HOLE_OVERSHOOT = 0.2;

/** A flat face of a body, measured once when it is picked. */
export type PerforableFace = {
  workplane: PlacementWorkplane;
  outline: FaceOutline;
  /** How thick the body is behind the face, along the face's normal. */
  thickness: number;
};

export type FaceReadResult =
  | { ok: true; face: PerforableFace }
  | { ok: false; reason: "noFace" | "curved" };

/**
 * The flat face around a click. `positions` holds the body's world triangles
 * (nine numbers each); the face is the one whose triangle lies nearest to
 * `point` among those that face `normal`. A face of a single facet is a
 * curved surface, not a face to perforate.
 */
export function readPerforableFace(positions: ArrayLike<number>, point: Vec, normal: Vec): FaceReadResult {
  const triangleCount = Math.floor(positions.length / 9);
  const n = new THREE.Vector3(normal.x, normal.y, normal.z);
  if (triangleCount === 0 || n.lengthSq() < 1e-12) return { ok: false, reason: "noFace" };
  n.normalize();

  const p = new THREE.Vector3(point.x, point.y, point.z);
  const hit = nearestFaceTriangle(positions, point, n);
  if (hit < 0) return { ok: false, reason: "noFace" };

  const face = planarFaceTriangles(positions, hit);
  if (!face || face.triangles.length < 2) return { ok: false, reason: face ? "curved" : "noFace" };
  // A facet of a round wall is two triangles in one plane, but the wall is curved: not a flat face (#1393).
  if (flatOrRoundFaceTriangles(positions, hit)?.round) return { ok: false, reason: "curved" };

  const workplane = faceFrameWorkplane(point, n);
  // Lay the origin on the face's plane itself, not on whatever the click was slightly off by.
  const o = hit * 9;
  const onPlane = new THREE.Vector3(positions[o], positions[o + 1], positions[o + 2]);
  const offset = n.dot(p.clone().sub(onPlane));
  const origin = p.clone().addScaledVector(n, -offset);
  workplane.origin = { x: origin.x, y: origin.y, z: origin.z };

  const outline = faceOutlineFromTriangles(positions, face.triangles, {
    origin: workplane.origin,
    xAxis: workplane.xAxis,
    zAxis: workplane.zAxis,
  });
  if (!outline) return { ok: false, reason: "noFace" };

  const planeOffset = n.dot(origin);
  let lowest = Infinity;
  for (let index = 0; index < positions.length; index += 3) {
    lowest = Math.min(lowest, n.x * positions[index] + n.y * positions[index + 1] + n.z * positions[index + 2]);
  }
  return { ok: true, face: { workplane, outline, thickness: Math.max(0, planeOffset - lowest) } };
}

/**
 * A round wall of a body (#1393): the outside of a cylinder or tube, or the inside of a bore, with its axis. The holes
 * go into it straight towards the axis (from the outside) or away from it (from the inside of a bore).
 */
export type RoundWall = {
  /** A point on the axis; `v` is measured along the axis from it. */
  axisPoint: Vec;
  /** The axis, pointing the way `v` grows. */
  axis: Vec;
  radius: number;
  /** Straight out from the axis to where the wall was picked: `u = 0`. */
  reference: Vec;
  /** Round the axis the way `u` grows: axis × reference. */
  around: Vec;
  /** The face looks away from the axis (a cylinder's or tube's outside), not into it (a bore). */
  outside: boolean;
  outline: RoundWallOutline;
  /** The body's other triangles, nine numbers each, to find the wall's far side behind a hole. */
  others: Float64Array;
};

/** A round wall picked for the hole pattern, with a frame on it where it was clicked. */
export type RoundWallFace = {
  round: RoundWall;
  workplane: PlacementWorkplane;
  /** How thick the wall is behind the point picked, measured straight in. */
  thickness: number;
};

/** What the hole pattern works on: a flat face or a round wall. */
export type HolePatternFace = PerforableFace | RoundWallFace;

export function isRoundWallFace(face: HolePatternFace): face is RoundWallFace {
  return "round" in face;
}

export type HolePatternFaceReadResult =
  | { ok: true; face: HolePatternFace }
  | { ok: false; reason: "noFace" | "curved" };

/**
 * The face a click picks for the hole pattern: the round wall of a cylinder, tube or bore when the click lies on one,
 * else the flat face around it. A cylinder's facet is two triangles in one plane, a strip a flat read would also
 * take, so the round read comes first and wins when it reaches further than that strip. Other curved surfaces (a
 * sphere, a cone) are neither.
 */
export function readHolePatternFace(positions: ArrayLike<number>, point: Vec, normal: Vec): HolePatternFaceReadResult {
  const n = new THREE.Vector3(normal.x, normal.y, normal.z);
  if (Math.floor(positions.length / 9) === 0 || n.lengthSq() < 1e-12) return { ok: false, reason: "noFace" };
  n.normalize();
  const hit = nearestFaceTriangle(positions, point, n);
  if (hit < 0) return { ok: false, reason: "noFace" };
  const found = flatOrRoundFaceTriangles(positions, hit);
  if (found?.round) {
    const wall = readRoundWall(positions, found.triangles, found.round, point, n);
    if (wall) return { ok: true, face: wall };
  }
  return readPerforableFace(positions, point, normal);
}

/**
 * The face around a triangle that the hole pattern would take: a round wall that reaches beyond the triangle's flat
 * strip, else the flat face. For the light under the pointer and for the click alike.
 */
export function flatOrRoundFaceTriangles(positions: ArrayLike<number>, hit: number): { triangles: number[]; round: RoundFaceAxis | null } | null {
  const flat = planarFaceTriangles(positions, hit);
  const round = roundFaceTriangles(positions, hit);
  if (round && round.triangles.length > (flat?.triangles.length ?? 1)) return { triangles: round.triangles, round: round.axis };
  return flat ? { triangles: flat.triangles, round: null } : null;
}

/** How a wall's coverage round the axis is checked for a gap: in slices of one degree. */
const WALL_COVER_SLICES = 360;

function readRoundWall(positions: ArrayLike<number>, triangles: number[], axisFit: RoundFaceAxis, point: Vec, normal: THREE.Vector3): RoundWallFace | null {
  const radius = axisFit.radius;
  if (!(radius > 0)) return null;
  const axis = new THREE.Vector3(axisFit.direction.x, axisFit.direction.y, axisFit.direction.z).normalize();
  // v grows upward on a standing wall (or along +x, +z on a lying one), so the rows count from the bottom.
  if (axis.y < -1e-6 || (Math.abs(axis.y) <= 1e-6 && (axis.x < -1e-6 || (Math.abs(axis.x) <= 1e-6 && axis.z < 0)))) axis.negate();
  const centre = new THREE.Vector3(axisFit.point.x, axisFit.point.y, axisFit.point.z);
  const clicked = new THREE.Vector3(point.x, point.y, point.z);
  const reference = clicked.clone().sub(centre).projectOnPlane(axis);
  if (reference.lengthSq() < 1e-12) return null;
  reference.normalize();
  const around = axis.clone().cross(reference);
  const outside = normal.dot(reference) > 0;

  // Every facet laid flat: its corners' angle round the axis, kept together where a facet spans the seam.
  const angleAt = (x: number, y: number, z: number) => {
    const dx = x - centre.x;
    const dy = y - centre.y;
    const dz = z - centre.z;
    return {
      angle: Math.atan2(dx * around.x + dy * around.y + dz * around.z, dx * reference.x + dy * reference.y + dz * reference.z),
      along: dx * axis.x + dy * axis.y + dz * axis.z,
    };
  };
  const flatCorners = triangles.map((triangle) => {
    const corners = [0, 1, 2].map((corner) => {
      const o = triangle * 9 + corner * 3;
      return angleAt(positions[o], positions[o + 1], positions[o + 2]);
    });
    for (let corner = 1; corner < 3; corner += 1) {
      while (corners[corner].angle - corners[0].angle > Math.PI) corners[corner].angle -= Math.PI * 2;
      while (corners[corner].angle - corners[0].angle < -Math.PI) corners[corner].angle += Math.PI * 2;
    }
    return corners;
  });

  // Does the wall go all the way round? If not, the seam goes into the middle of its widest gap.
  const covered = new Uint8Array(WALL_COVER_SLICES);
  const slice = (angle: number) => Math.floor(((((angle / (Math.PI * 2)) % 1) + 1) % 1) * WALL_COVER_SLICES) % WALL_COVER_SLICES;
  for (const corners of flatCorners) {
    const low = Math.min(...corners.map((corner) => corner.angle));
    const high = Math.max(...corners.map((corner) => corner.angle));
    const steps = Math.max(1, Math.ceil(((high - low) / (Math.PI * 2)) * WALL_COVER_SLICES * 4));
    for (let step = 0; step <= steps; step += 1) covered[slice(low + ((high - low) * step) / steps)] = 1;
  }
  let gapStart = -1;
  let gapLength = 0;
  for (let start = 0; start < WALL_COVER_SLICES; start += 1) {
    if (covered[start] || covered[(start - 1 + WALL_COVER_SLICES) % WALL_COVER_SLICES] === 0) continue;
    let length = 0;
    while (length < WALL_COVER_SLICES && !covered[(start + length) % WALL_COVER_SLICES]) length += 1;
    if (length > gapLength) {
      gapLength = length;
      gapStart = start;
    }
  }
  const closed = gapLength === 0;
  // On a closed wall the window runs half a round either side of the click; on an open one it starts in the gap.
  const seam = closed ? -Math.PI : ((gapStart + gapLength / 2) / WALL_COVER_SLICES) * Math.PI * 2;
  const intoWindow = (angle: number) => {
    let a = angle;
    while (a < seam) a += Math.PI * 2;
    while (a >= seam + Math.PI * 2) a -= Math.PI * 2;
    return a;
  };
  const flatTriangles = flatCorners.map((corners) => {
    const shift = intoWindow(corners[0].angle) - corners[0].angle;
    return corners.map((corner) => ({ u: (corner.angle + shift) * radius, v: corner.along }));
  });

  // The edges only one facet of the wall has: its rims and the edges of openings in it.
  let extent = 1;
  for (let index = 0; index < positions.length; index += 1) extent = Math.max(extent, Math.abs(positions[index]));
  const weld = extent * 1e-6;
  const key = (triangle: number, corner: number) => {
    const o = triangle * 9 + corner * 3;
    return `${Math.round(positions[o] / weld)},${Math.round(positions[o + 1] / weld)},${Math.round(positions[o + 2] / weld)}`;
  };
  const edgeUse = new Map<string, { count: number; a: Point2; b: Point2 }>();
  triangles.forEach((triangle, index) => {
    const keys = [key(triangle, 0), key(triangle, 1), key(triangle, 2)];
    for (let corner = 0; corner < 3; corner += 1) {
      const next = (corner + 1) % 3;
      if (keys[corner] === keys[next]) continue;
      const edgeKey = keys[corner] < keys[next] ? `${keys[corner]}|${keys[next]}` : `${keys[next]}|${keys[corner]}`;
      const entry = edgeUse.get(edgeKey);
      if (entry) entry.count += 1;
      else edgeUse.set(edgeKey, { count: 1, a: flatTriangles[index][corner], b: flatTriangles[index][next] });
    }
  });
  const edges: [Point2, Point2][] = [];
  edgeUse.forEach((entry) => { if (entry.count === 1) edges.push([entry.a, entry.b]); });

  const onWall = new Set(triangles);
  const others = new Float64Array((Math.floor(positions.length / 9) - onWall.size) * 9);
  let slot = 0;
  for (let triangle = 0; triangle < Math.floor(positions.length / 9); triangle += 1) {
    if (onWall.has(triangle)) continue;
    for (let offset = 0; offset < 9; offset += 1) others[slot * 9 + offset] = positions[triangle * 9 + offset];
    slot += 1;
  }

  const clickedAlong = clicked.clone().sub(centre).dot(axis);
  const round: RoundWall = {
    axisPoint: { x: centre.x, y: centre.y, z: centre.z },
    axis: { x: axis.x, y: axis.y, z: axis.z },
    radius,
    reference: { x: reference.x, y: reference.y, z: reference.z },
    around: { x: around.x, y: around.y, z: around.z },
    outside,
    outline: { radius, circumference: Math.PI * 2 * radius, closed, triangles: flatTriangles, edges },
    others,
  };
  const facing = outside ? reference.clone() : reference.clone().negate();
  const origin = centre.clone().addScaledVector(axis, clickedAlong).addScaledVector(reference, radius);
  const workplane: PlacementWorkplane = {
    origin: { x: origin.x, y: origin.y, z: origin.z },
    normal: { x: facing.x, y: facing.y, z: facing.z },
    xAxis: vec(facing.clone().cross(axis)),
    zAxis: { x: axis.x, y: axis.y, z: axis.z },
  };
  return { round, workplane, thickness: roundWallThickness(round, 0, clickedAlong) };
}

function vec(value: THREE.Vector3): Vec {
  return { x: value.x, y: value.y, z: value.z };
}

/** The point on the axis at `v` and the way straight out from it at `u`. */
function roundWallFrameAt(wall: RoundWall, u: number, v: number) {
  const angle = u / wall.radius;
  const out = new THREE.Vector3(wall.reference.x, wall.reference.y, wall.reference.z).multiplyScalar(Math.cos(angle))
    .addScaledVector(new THREE.Vector3(wall.around.x, wall.around.y, wall.around.z), Math.sin(angle));
  const onAxis = new THREE.Vector3(wall.axisPoint.x, wall.axisPoint.y, wall.axisPoint.z).addScaledVector(new THREE.Vector3(wall.axis.x, wall.axis.y, wall.axis.z), v);
  return { out, onAxis };
}

/**
 * How thick the wall is at a place: from the face straight in (towards the axis from the outside, away from it from a
 * bore) to the next surface of the body. A solid cylinder has none before the axis, so from the outside it counts
 * up to the axis.
 */
export function roundWallThickness(wall: RoundWall, u: number, v: number): number {
  const { out, onAxis } = roundWallFrameAt(wall, u, v);
  const start = onAxis.clone().addScaledVector(out, wall.radius);
  const direction = wall.outside ? out.clone().negate() : out.clone();
  const hit = nearestRayHit(wall.others, start, direction);
  if (wall.outside) return Math.min(hit ?? wall.radius, wall.radius);
  return hit ?? wall.radius;
}

/** The distance along a ray to the nearest triangle it meets past its start (Möller-Trumbore), or null. */
function nearestRayHit(triangles: Float64Array, origin: THREE.Vector3, direction: THREE.Vector3): number | null {
  let nearest = Infinity;
  const ox = origin.x, oy = origin.y, oz = origin.z;
  const dx = direction.x, dy = direction.y, dz = direction.z;
  for (let o = 0; o + 8 < triangles.length; o += 9) {
    const ax = triangles[o], ay = triangles[o + 1], az = triangles[o + 2];
    const e1x = triangles[o + 3] - ax, e1y = triangles[o + 4] - ay, e1z = triangles[o + 5] - az;
    const e2x = triangles[o + 6] - ax, e2y = triangles[o + 7] - ay, e2z = triangles[o + 8] - az;
    const px = dy * e2z - dz * e2y, py = dz * e2x - dx * e2z, pz = dx * e2y - dy * e2x;
    const det = e1x * px + e1y * py + e1z * pz;
    if (Math.abs(det) < 1e-12) continue;
    const inv = 1 / det;
    const tx = ox - ax, ty = oy - ay, tz = oz - az;
    const b1 = (tx * px + ty * py + tz * pz) * inv;
    if (b1 < -1e-9 || b1 > 1 + 1e-9) continue;
    const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x;
    const b2 = (dx * qx + dy * qy + dz * qz) * inv;
    if (b2 < -1e-9 || b1 + b2 > 1 + 1e-9) continue;
    const distance = (e2x * qx + e2y * qy + e2z * qz) * inv;
    if (distance > 1e-5 && distance < nearest) nearest = distance;
  }
  return Number.isFinite(nearest) ? nearest : null;
}

/** The screw sizes a hole with this head offers (a countersink only those ISO 15065 has). */
export function holePatternScrewSizes(type: "counterbore" | "countersink"): ScrewHoleSize[] {
  return screwHoleSizesFor(type);
}

/** Shaft, head and depth for a screw of this size, as the counterbore and countersink shapes take them (#1232). */
export function holePatternScrewPatch(type: "counterbore" | "countersink", size: ScrewHoleSize): Pick<HolePatternSettings, "size" | "headSize" | "headDepth"> {
  const fields = screwHoleFields(type, size, 0);
  return { size: fields.screwHoleShaft, headSize: fields.width, ...(fields.screwHoleHeadDepth !== undefined ? { headDepth: fields.screwHoleHeadDepth } : {}) };
}

/** The screw size whose hole the settings make, or null for measures of their own. */
export function holePatternScrewSize(settings: Pick<HolePatternSettings, "form" | "size" | "holeType" | "headSize" | "headDepth">): ScrewHoleSize | null {
  if (!holeHasHead(settings)) return null;
  const type = settings.holeType as "counterbore" | "countersink";
  const near = (a: number | undefined, b: number | undefined) => a !== undefined && b !== undefined && Math.abs(a - b) < 0.005;
  return holePatternScrewSizes(type).find((size) => {
    const patch = holePatternScrewPatch(type, size);
    return near(settings.size, patch.size) && near(holeHeadSize(settings), patch.headSize) && (type === "countersink" || near(holeHeadDepth(settings), patch.headDepth));
  }) ?? null;
}

const FORM_KIND: Record<HolePatternSettings["form"], ShapeKind> = {
  round: "cylinder",
  square: "box",
  rectangle: "box",
  hexagon: "polygon",
  slot: "slot",
  // An own shape is a copy of itself; the kind is not used for it.
  custom: "box",
};

/**
 * A hole's frame turned round its normal by `turn` radians from x towards z, as `holeTurn` gives it: a turned rectangle
 * or slot stands in it, its width along the new x. The turn stays in the face, so the frame keeps its handedness.
 */
function turnedWorkplane(workplane: PlacementWorkplane, turn: number): PlacementWorkplane {
  if (turn === 0) return workplane;
  const x = new THREE.Vector3(workplane.xAxis.x, workplane.xAxis.y, workplane.xAxis.z);
  const z = new THREE.Vector3(workplane.zAxis.x, workplane.zAxis.y, workplane.zAxis.z);
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  return {
    ...workplane,
    xAxis: vec(x.clone().multiplyScalar(cos).addScaledVector(z, sin)),
    zAxis: vec(z.clone().multiplyScalar(cos).addScaledVector(x, -sin)),
  };
}

/** The depth the holes actually get: the body's thickness plus a skin's worth, or what was asked for. */
export function holeDepth(face: Pick<PerforableFace, "thickness">, settings: Pick<HolePatternSettings, "depth">) {
  return settings.depth === null ? face.thickness + HOLE_OVERSHOOT : settings.depth;
}

/** Kinds that are round seen from above, so an own shape of one takes a round room on the face (#1235). */
const ROUND_KINDS = new Set<ShapeKind>(["cylinder", "sphere", "halfSphere", "cone", "curvedCone", "paraboloid", "tube", "ring", "torus", "counterbore", "countersink", "doubleCountersink", "finishingWasher"]);

/** The footprint settings of a shape repeated over the face: its own width and depth, round for the round kinds. */
export function holePatternCustomFootprint(shape: WorkplaneShape): Pick<HolePatternSettings, "customId" | "customWidth" | "customDepth" | "customRound"> {
  return { customId: shape.id, customWidth: shapeWidth(shape), customDepth: shapeDepth(shape), customRound: ROUND_KINDS.has(shape.kind) && Math.abs(shapeWidth(shape) - shapeDepth(shape)) < 1e-6 };
}

/** A shape and its parts with ids made by `idFor`, so a preview keeps the same ids while the numbers change. */
function cloneTree(shape: WorkplaneShape, idFor: (id: string) => string): WorkplaneShape {
  return { ...shape, id: idFor(shape.id), groupedShapes: shape.groupedShapes?.map((child) => cloneTree(child, idFor)) };
}

export type HolePatternPlan = {
  holes: WorkplaneShape[];
  tooMany: boolean;
  /** Holes round the edge: the length of the line they go round on, and whether they sit on its corners. */
  ring?: { length: number; onCorners: boolean };
  /** On a round wall (#1393): its diameter, whether it goes all the way round, and then how many holes a row holds at what step. */
  wall?: { diameter: number; closed: boolean; columns?: number; spacing?: number };
};

/**
 * Where each hole of a round wall goes (#1393): one frame per hole, standing straight out of the wall (or into the
 * bore) at its place, x round the axis, z along it. `reach(halfWidth)` gives how far from the axis the hole's foot and
 * top lie so that a straight hole of that half width cuts the wall clean: the side of the wall that bends away from
 * the hole's flat end is reached at the hole's edges too, not only in its middle.
 */
function roundWallPlaces(face: RoundWallFace, centers: Point2[]) {
  const { round } = face;
  const axis = new THREE.Vector3(round.axis.x, round.axis.y, round.axis.z);
  const thicknessByRow = new Map<string, number>();
  return centers.map((center) => {
    const { out, onAxis } = roundWallFrameAt(round, center.u, center.v);
    const normal = round.outside ? out.clone() : out.clone().negate();
    const workplane: PlacementWorkplane = {
      origin: vec(onAxis),
      normal: vec(normal),
      xAxis: vec(normal.clone().cross(axis)),
      zAxis: round.axis,
    };
    // The wall is measured once per row and twelfth of the way round: enough for a tapered or off-centre bore.
    const rowKey = `${Math.round(center.u / round.radius / (Math.PI / 6))}:${Math.round(center.v * 1000)}`;
    let thickness = thicknessByRow.get(rowKey);
    if (thickness === undefined) {
      thickness = roundWallThickness(round, center.u, center.v);
      thicknessByRow.set(rowKey, thickness);
    }
    /** A point `distance` from the axis, straight out at this hole. */
    const at = (distance: number) => onAxis.clone().addScaledVector(out, distance);
    return { workplane, normal, thickness, at };
  });
}

/** How far from the axis a flat end must lie for a straight hole of half width `half` to clear a wall surface of `radius` across its width. */
function clearOfSurface(radius: number, half: number, inward: boolean) {
  // Towards the axis the surface bends away from the end; outward the end lies beyond it everywhere once past it in the middle.
  return inward ? Math.sqrt(Math.max(0, radius * radius - half * half)) : radius;
}

/**
 * The hole shapes of a pattern on a face: ordinary hole shapes standing on the
 * face, reaching `depth` into the body and a little out of it. Nothing is cut
 * here - grouping them with the body does that, and ungrouping frees them.
 */
export function holePatternShapes(
  face: HolePatternFace,
  settings: HolePatternSettings,
  namePrefix: string,
  /** Ids that stay the same from one call to the next, for a preview that is redrawn while the numbers change. */
  previewIdPrefix?: string,
  /** Own shape (#1235): the shape from the scene that is repeated in place of a hole. */
  custom?: WorkplaneShape | null,
): HolePatternPlan {
  if (isRoundWallFace(face)) return roundWallHoleShapes(face, settings, namePrefix, previewIdPrefix, custom);
  if (settings.form === "custom" && !custom) return { holes: [], tooMany: false };
  const { centers, tooMany, ring } = holePatternCenters(face.outline, settings);
  if (tooMany || centers.length === 0) return { holes: [], tooMany, ...(ring ? { ring } : {}) };

  if (settings.form === "custom" && custom) {
    // A copy of the shape stands upright on every place, turned with the face: a body a little sunk in so it joins, a
    // hole reaching its own height into the face and a little out of it. Its own turn is not taken along.
    const { workplane } = face;
    const normal = new THREE.Vector3(workplane.normal.x, workplane.normal.y, workplane.normal.z);
    const origin = new THREE.Vector3(workplane.origin.x, workplane.origin.y, workplane.origin.z);
    const xAxis = new THREE.Vector3(workplane.xAxis.x, workplane.xAxis.y, workplane.xAxis.z);
    const zAxis = new THREE.Vector3(workplane.zAxis.x, workplane.zAxis.y, workplane.zAxis.z);
    const name = custom.name || namePrefix;
    const pieces = centers.map((center, index) => {
      const onFace = origin.clone().addScaledVector(xAxis, center.u).addScaledVector(zAxis, center.v);
      const base = custom.hole
        ? onFace.addScaledVector(normal, HOLE_OVERSHOOT - custom.height)
        : onFace.addScaledVector(normal, -HOLE_OVERSHOOT);
      const copy = cloneTree(custom, (id) => (previewIdPrefix ? `${previewIdPrefix}-${index}-${id}` : createLocalId(`${id}-pattern`)));
      const placed: WorkplaneShape = {
        ...copy,
        ...(previewIdPrefix ? { id: `${previewIdPrefix}-${index}` } : {}),
        name: `${name} ${index + 1}`,
        locked: false,
        ...placementPatchForNewShape(copy, workplane, base),
      };
      return canonicalizeShape(placed);
    });
    return { holes: pieces, tooMany: false, ...(ring ? { ring } : {}) };
  }

  // A round hole with a head is a counterbore or countersink shape (#1232), its head on the face.
  const headType = holeHasHead(settings) ? settings.holeType as "counterbore" | "countersink" : null;
  const kind = headType ?? FORM_KIND[settings.form];
  const asset = toolbarShapeAssets.find((entry) => entry.kind === kind);
  if (!asset) return { holes: [], tooMany: false };
  const depth = holeDepth(face, settings);
  const height = depth + HOLE_OVERSHOOT;
  // The shape's top stands HOLE_OVERSHOOT out of the face: the counterbore reaches that much deeper, and the
  // countersink's cone, opening at 90 degrees, is that much wider up there, so both meet the face as set.
  const head: { width: number; screwHoleShaft: number; screwHoleHeadDepth?: number; screwHoleAngle?: number } | null = headType ? {
    screwHoleShaft: Math.max(0.5, settings.size),
    ...(headType === "counterbore"
      ? { screwHoleHeadDepth: holeHeadDepth(settings) + HOLE_OVERSHOOT, width: holeHeadSize(settings) }
      : { screwHoleAngle: METRIC_COUNTERSINK_ANGLE, width: holeHeadSize(settings) + 2 * HOLE_OVERSHOOT }),
  } : null;
  const size = head ? { width: head.width, height: head.width } : holeFootprintSize(settings);
  const { workplane } = face;
  const normal = new THREE.Vector3(workplane.normal.x, workplane.normal.y, workplane.normal.z);
  const origin = new THREE.Vector3(workplane.origin.x, workplane.origin.y, workplane.origin.z);
  const xAxis = new THREE.Vector3(workplane.xAxis.x, workplane.xAxis.y, workplane.xAxis.z);
  const zAxis = new THREE.Vector3(workplane.zAxis.x, workplane.zAxis.y, workplane.zAxis.z);
  // A turned rectangle or slot stands turned in the face as its outline was when the holes were fitted.
  const holeFrame = turnedWorkplane(workplane, holeTurn(settings));

  const holes = centers.map((center, index) => {
    const top = origin.clone().addScaledVector(xAxis, center.u).addScaledVector(zAxis, center.v).addScaledVector(normal, HOLE_OVERSHOOT);
    const base = top.clone().addScaledVector(normal, -height);
    const made = makeShapeFromAsset(
      { ...asset, name: `${namePrefix} ${index + 1}` },
      { x: 0, z: 0, elevation: 0 },
      {
        width: size.width,
        depth: size.height,
        height,
        sides: settings.form === "hexagon" ? 6 : undefined,
        ...(head ? { screwHoleShaft: head.screwHoleShaft, screwHoleHeadDepth: head.screwHoleHeadDepth, screwHoleAngle: head.screwHoleAngle } : {}),
      },
    );
    const sized = { ...made, width: size.width, depth: size.height, height, size: Math.max(size.width, size.height) };
    const placed = { ...sized, ...placementPatchForNewShape(sized, holeFrame, base), ...(previewIdPrefix ? { id: `${previewIdPrefix}-${index}` } : {}) };
    return canonicalizeShape(withHoleMode(placed, true));
  });
  return { holes, tooMany: false, ...(ring ? { ring } : {}) };
}

/**
 * The holes of a pattern on a round wall (#1393): each one a straight hole pointing at the axis, set at its place
 * round the wall. Through the wall it reaches from just outside the face to just past the wall's other side - on a
 * solid cylinder to the axis - far enough at its edges too that no skin is left where the wall bends away.
 */
function roundWallHoleShapes(
  face: RoundWallFace,
  settings: HolePatternSettings,
  namePrefix: string,
  previewIdPrefix?: string,
  custom?: WorkplaneShape | null,
): HolePatternPlan {
  const { round } = face;
  // The wall's flat frame runs round it and along the axis; seen from outside that turns the other way to a flat
  // face's frame (and to a hole's own frame there, whose x points back round the wall). So on the outside a turned
  // hole is fitted turned the other way round, and both the fit and the hole come out turned as seen looking at the wall.
  const fitSettings: HolePatternSettings = round.outside && holeTurn(settings) !== 0
    ? { ...settings, holeAngle: -(settings.holeAngle ?? 0) }
    : settings;
  const result = roundWallCenters(round.outline, fitSettings);
  const wall = { diameter: round.radius * 2, closed: round.outline.closed, ...(result.columns !== undefined ? { columns: result.columns, spacing: result.spacing } : {}) };
  if (settings.form === "custom" && !custom) return { holes: [], tooMany: false, wall };
  if (result.tooMany || result.centers.length === 0) return { holes: [], tooMany: result.tooMany, wall };
  const places = roundWallPlaces(face, result.centers);
  const radius = round.radius;
  const inward = round.outside;
  /** Distance from the axis, measured the way the hole points into the body: in from the outside, out from a bore. */
  const intoBody = (depth: number) => (inward ? radius - depth : radius + depth);

  if (settings.form === "custom" && custom) {
    const name = custom.name || namePrefix;
    const half = Math.max(shapeWidth(custom), shapeDepth(custom)) / 2;
    const pieces = places.map((place, index) => {
      // A body stands sunk in far enough to meet the wall across its whole foot, a hole reaches its height into it.
      const foot = custom.hole
        ? (inward ? clearOfSurface(radius + HOLE_OVERSHOOT, half, false) - custom.height : clearOfSurface(radius - HOLE_OVERSHOOT, half, true) + custom.height)
        : (inward ? clearOfSurface(radius, half, true) - HOLE_OVERSHOOT : radius + HOLE_OVERSHOOT);
      const copy = cloneTree(custom, (id) => (previewIdPrefix ? `${previewIdPrefix}-${index}-${id}` : createLocalId(`${id}-pattern`)));
      const placed: WorkplaneShape = {
        ...copy,
        ...(previewIdPrefix ? { id: `${previewIdPrefix}-${index}` } : {}),
        name: `${name} ${index + 1}`,
        locked: false,
        ...placementPatchForNewShape(copy, place.workplane, place.at(foot)),
      };
      return canonicalizeShape(placed);
    });
    return { holes: pieces, tooMany: false, wall };
  }

  const headType = holeHasHead(settings) ? settings.holeType as "counterbore" | "countersink" : null;
  const kind = headType ?? FORM_KIND[settings.form];
  const asset = toolbarShapeAssets.find((entry) => entry.kind === kind);
  if (!asset) return { holes: [], tooMany: false, wall };
  const footprint = holeFootprintSize(settings);
  const width = headType ? holeHeadSize(settings) : footprint.width;
  // How far the hole reaches round the wall from its middle: half its width, or more for a turned hole.
  const turn = holeTurn(settings);
  const half = turn !== 0 && !headType
    ? Math.max(...holeFootprintPolygon(fitSettings).map((point) => Math.abs(point.u)))
    : width / 2;
  // The open end stands just clear of the face: outside a cylinder in its middle, inside a bore at its edges as well.
  const top = inward ? radius + HOLE_OVERSHOOT : clearOfSurface(radius - HOLE_OVERSHOOT, half, true);
  const topOver = Math.abs(top - radius);

  const holes = places.map((place, index) => {
    const through = settings.depth === null;
    // Through: past the far side of the wall by a skin's worth, reached at the hole's edges too where it bends away.
    const far = through ? intoBody(place.thickness + HOLE_OVERSHOOT) : intoBody(settings.depth as number);
    const end = through && inward ? clearOfSurface(Math.max(0, far), half, true) : far;
    const height = Math.max(HOLE_PATTERN_MIN_SIZE, Math.abs(top - end));
    const head: { width: number; screwHoleShaft: number; screwHoleHeadDepth?: number; screwHoleAngle?: number } | null = headType ? {
      screwHoleShaft: Math.max(0.5, settings.size),
      ...(headType === "counterbore"
        ? { screwHoleHeadDepth: holeHeadDepth(settings) + topOver, width: holeHeadSize(settings) }
        : { screwHoleAngle: METRIC_COUNTERSINK_ANGLE, width: holeHeadSize(settings) + 2 * topOver }),
    } : null;
    const size = head ? { width: head.width, height: head.width } : footprint;
    const made = makeShapeFromAsset(
      { ...asset, name: `${namePrefix} ${index + 1}` },
      { x: 0, z: 0, elevation: 0 },
      {
        width: size.width,
        depth: size.height,
        height,
        sides: settings.form === "hexagon" ? 6 : undefined,
        ...(head ? { screwHoleShaft: head.screwHoleShaft, screwHoleHeadDepth: head.screwHoleHeadDepth, screwHoleAngle: head.screwHoleAngle } : {}),
      },
    );
    const sized = { ...made, width: size.width, depth: size.height, height, size: Math.max(size.width, size.height) };
    // The hole stands on its far end and reaches up to the open end, along the frame's normal.
    const placed = { ...sized, ...placementPatchForNewShape(sized, turnedWorkplane(place.workplane, turn), place.at(end)), ...(previewIdPrefix ? { id: `${previewIdPrefix}-${index}` } : {}) };
    return canonicalizeShape(withHoleMode(placed, true));
  });
  return { holes, tooMany: false, wall };
}
