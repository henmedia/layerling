import * as THREE from "three";
import { toCreasedNormals } from "@/lib/creasedNormals";

/*
 * Screw holes: cutters for a screw with a head that sits in the part.
 *
 * Both are bodies of revolution around the vertical axis, standing on y = 0 with
 * the head end on top - the shape is set to "hole" and pushed into the part from
 * above. Width (and depth) is the diameter of the head end, height the whole
 * length of the hole, and the shaft is the narrow part below the head.
 *
 *   counterbore: a cylindrical pocket for a socket-head screw (DIN 912). The
 *                pocket is `headDepth` deep, the shaft runs on below it.
 *   countersink: a cone for a countersunk screw (DIN 7991). The cone opens with
 *                `angle` (90 degrees is standard) from the shaft up to the
 *                head diameter, the shaft runs on below it.
 *   doubleCountersink: a hole that is chamfered on both faces (#392): a cone at each end
 *                opening to the head diameter, the shaft between them. Where the two
 *                cones would not fit into the length they meet in the middle at the
 *                angle, so the shaft is then wider than set.
 *
 * A counterbore or countersink that ends blind may end in a drill point (Discussion #621,
 * drillPoint.ts): the cone of the drill's tip, as wide as the shaft, below y = 0. The
 * height still counts to the shoulder, so the tip is all the profile adds.
 *
 * Any of the three may be slotted (Discussion #1531): the same profile, as wide as the head, runs round the two ends
 * of a slot and straight along its sides, for a screw that leaves the part room to be lined up.
 *
 * A countersink may be recessed (Discussion #1531): a straight pocket as wide as the head sits above the cone, so
 * the screw head ends that far below the face instead of flush with it. The double countersink has it at both ends.
 *
 * A counterbore may have a chamfer at its rim (Discussion #1632): the top of the pocket opens at 45 degrees by that
 * many millimetres, outside the head's diameter, so the pocket keeps the width the screw head needs. The chamfer stays
 * shallower than the pocket.
 */

export type ScrewHoleKind = "counterbore" | "countersink" | "doubleCountersink";

export const DEFAULT_COUNTERBORE_WIDTH = 6.4;
export const DEFAULT_COUNTERBORE_HEIGHT = 12;
export const DEFAULT_COUNTERSINK_WIDTH = 6.6;
export const DEFAULT_COUNTERSINK_HEIGHT = 8;
export const DEFAULT_DOUBLE_COUNTERSINK_WIDTH = 6.6;
export const DEFAULT_DOUBLE_COUNTERSINK_HEIGHT = 6;
export const DEFAULT_SCREW_HOLE_SHAFT = 3.4;
export const DEFAULT_SCREW_HOLE_HEAD_DEPTH = 3.2;
export const DEFAULT_SCREW_HOLE_ANGLE = 90;
export const MIN_SCREW_HOLE_ANGLE = 30;
export const MAX_SCREW_HOLE_ANGLE = 150;
const DEFAULT_SEGMENTS = 48;
/** The shaft stays at least this much narrower than the head, or the step vanishes. */
const MAX_SHAFT_SHARE = 0.95;
const MIN_SHAFT = 0.1;
/** A step or cone leaves at least this much of the hole for the shaft. */
const MIN_SHAFT_LENGTH = 0.2;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeScrewHoleShaft(value: number | undefined, headWidth: number) {
  const requested = Number.isFinite(value) ? (value as number) : DEFAULT_SCREW_HOLE_SHAFT;
  return clamp(requested, Math.min(MIN_SHAFT, headWidth * 0.5), Math.max(MIN_SHAFT, headWidth * MAX_SHAFT_SHARE));
}

export function normalizeScrewHoleHeadDepth(value: number | undefined, height: number) {
  const requested = Number.isFinite(value) ? (value as number) : DEFAULT_SCREW_HOLE_HEAD_DEPTH;
  return clamp(requested, 0.1, Math.max(0.1, height - MIN_SHAFT_LENGTH));
}

/**
 * How far a countersink's head sits below the face (Discussion #1531), 0 for flush. It leaves the cone and some
 * shaft room: at most the length less a little shaft, on the double countersink half of that at each end.
 */
export function maxScrewHoleRecess(height: number, kind: ScrewHoleKind = "countersink") {
  if (kind === "counterbore") return 0;
  const room = Math.max(0, height - 2 * MIN_SHAFT_LENGTH);
  return kind === "doubleCountersink" ? room / 2 : room;
}

export function normalizeScrewHoleRecess(value: number | undefined, height: number, kind: ScrewHoleKind = "countersink") {
  if (!Number.isFinite(value)) return 0;
  return clamp(value as number, 0, maxScrewHoleRecess(height, kind));
}

/** A counterbore's rim chamfer (Discussion #1632) leaves at least this much straight pocket wall below it. */
const MIN_POCKET_WALL = 0.1;

/**
 * How deep (and wide) a counterbore's rim chamfer may be (Discussion #1632): shallower than its pocket, so a straight
 * wall stays for the screw head. 0 for the other screw holes.
 */
export function maxScrewHoleChamfer(height: number, screwHoleHeadDepth: number | undefined, kind: ScrewHoleKind = "counterbore") {
  if (kind !== "counterbore") return 0;
  return Math.max(0, normalizeScrewHoleHeadDepth(screwHoleHeadDepth, Math.max(0.01, height)) - MIN_POCKET_WALL);
}

export function normalizeScrewHoleChamfer(value: number | undefined, height: number, screwHoleHeadDepth: number | undefined, kind: ScrewHoleKind = "counterbore") {
  if (!Number.isFinite(value)) return 0;
  return clamp(value as number, 0, maxScrewHoleChamfer(height, screwHoleHeadDepth, kind));
}

export function normalizeScrewHoleAngle(value: number | undefined) {
  return clamp(Number.isFinite(value) ? (value as number) : DEFAULT_SCREW_HOLE_ANGLE, MIN_SCREW_HOLE_ANGLE, MAX_SCREW_HOLE_ANGLE);
}

/** Depth of the cone that opens from the shaft to the head diameter at this angle. */
export function countersinkDepth(headWidth: number, shaft: number, angle: number) {
  return Math.max(0, (headWidth - shaft) / 2 / Math.tan(THREE.MathUtils.degToRad(normalizeScrewHoleAngle(angle)) / 2));
}

type ProfilePoint = { r: number; y: number };

export type ScrewHoleGeometryOptions = {
  kind: ScrewHoleKind;
  width: number;
  depth: number;
  height: number;
  screwHoleShaft?: number;
  screwHoleHeadDepth?: number;
  screwHoleAngle?: number;
  /** Countersink and double countersink: how far the head sits below the face (Discussion #1531), 0 or left out for flush. */
  screwHoleRecess?: number;
  /** Counterbore: a 45-degree chamfer this deep at the rim of the pocket (Discussion #1632), 0 or left out for none. */
  screwHoleChamfer?: number;
  /** The drill point's angle in degrees (shapeDrillPointAngle), or left out for a flat bottom; the double countersink has none. */
  drillPointAngle?: number;
  /** Corners around the axis; the automatic count for the diameter when left out. */
  sides?: number;
  /** A slotted hole (Discussion #1531, screwHoleSlotMeasures): the profile runs round the two ends of a slot. */
  slot?: boolean;
};

/**
 * A slotted screw hole (Discussion #1531): the shorter of width and depth is the head's diameter, and the hole runs
 * by the difference along the longer one - a slot for a screw that leaves the part room to be lined up. `alongX` when
 * the slot runs along the width (x), else along the depth (z).
 */
export function screwHoleSlotMeasures(width: number, depth: number) {
  const head = Math.max(0.01, Math.min(width, depth));
  return { head, length: Math.abs(width - depth), alongX: width >= depth };
}

/**
 * Radius and height of each corner of the outline, from the bottom of the shaft up to the rim of the head. With a
 * drill point the first corner is its tip, on the axis below the shaft.
 */
export function screwHoleProfile(options: Omit<ScrewHoleGeometryOptions, "depth">): ProfilePoint[] {
  const profile = flatScrewHoleProfile(options);
  if (options.kind === "doubleCountersink" || options.drillPointAngle === undefined) return profile;
  // The tip is a cone opening from a point to the shaft at the drill's angle, as the countersink opens from the shaft to the head.
  return [{ r: 0, y: -countersinkDepth(profile[0].r * 2, 0, options.drillPointAngle) }, ...profile];
}

function flatScrewHoleProfile(options: Omit<ScrewHoleGeometryOptions, "depth">): ProfilePoint[] {
  const height = Math.max(0.01, options.height);
  const chamfer = normalizeScrewHoleChamfer(options.screwHoleChamfer, height, options.screwHoleHeadDepth, options.kind);
  if (chamfer > 0) {
    // A chamfered counterbore (Discussion #1632): the rim, the last corner, opens outwards at 45 degrees.
    const profile = flushScrewHoleProfile(options);
    const rim = profile[profile.length - 1];
    return [...profile.slice(0, -1), { r: rim.r, y: rim.y - chamfer }, { r: rim.r + chamfer, y: rim.y }];
  }
  const recess = normalizeScrewHoleRecess(options.screwHoleRecess, height, options.kind);
  if (recess <= 0) return flushScrewHoleProfile(options);
  // A recessed countersink (Discussion #1531): the flush profile in the shorter length, with a straight pocket as wide
  // as the head above it - and on the double countersink below it too.
  const headRadius = Math.max(0.005, options.width / 2);
  if (options.kind === "doubleCountersink") {
    const inner = flushScrewHoleProfile({ ...options, height: height - 2 * recess }).map(({ r, y }) => ({ r, y: y + recess }));
    return [{ r: headRadius, y: 0 }, ...inner, { r: headRadius, y: height }];
  }
  return [...flushScrewHoleProfile({ ...options, height: height - recess }), { r: headRadius, y: height }];
}

function flushScrewHoleProfile({ kind, width, height, screwHoleShaft, screwHoleHeadDepth, screwHoleAngle }: Omit<ScrewHoleGeometryOptions, "depth">): ProfilePoint[] {
  const safeHeight = Math.max(0.01, height);
  const headRadius = Math.max(0.005, width / 2);
  const shaftRadius = normalizeScrewHoleShaft(screwHoleShaft, width) / 2;
  if (kind === "counterbore") {
    const stepY = safeHeight - normalizeScrewHoleHeadDepth(screwHoleHeadDepth, safeHeight);
    return [
      { r: shaftRadius, y: 0 },
      { r: shaftRadius, y: stepY },
      { r: headRadius, y: stepY },
      { r: headRadius, y: safeHeight },
    ];
  }
  if (kind === "doubleCountersink") {
    const angle = screwHoleAngle ?? DEFAULT_SCREW_HOLE_ANGLE;
    const coneDepth = countersinkDepth(width, shaftRadius * 2, angle);
    if (coneDepth * 2 > safeHeight - MIN_SHAFT_LENGTH) {
      // Too short for two full cones: they meet in the middle at the set angle (#392).
      const middleRadius = Math.max(shaftRadius, headRadius - (safeHeight / 2) * Math.tan(THREE.MathUtils.degToRad(normalizeScrewHoleAngle(angle)) / 2));
      return [
        { r: headRadius, y: 0 },
        { r: middleRadius, y: safeHeight / 2 },
        { r: headRadius, y: safeHeight },
      ];
    }
    return [
      { r: headRadius, y: 0 },
      { r: shaftRadius, y: coneDepth },
      { r: shaftRadius, y: safeHeight - coneDepth },
      { r: headRadius, y: safeHeight },
    ];
  }
  // The cone is as deep as its angle needs, but leaves some shaft; a shallow hole opens more steeply.
  const coneDepth = Math.min(countersinkDepth(width, shaftRadius * 2, screwHoleAngle ?? DEFAULT_SCREW_HOLE_ANGLE), safeHeight - MIN_SHAFT_LENGTH);
  return [
    { r: shaftRadius, y: 0 },
    { r: shaftRadius, y: safeHeight - coneDepth },
    { r: headRadius, y: safeHeight },
  ];
}

/**
 * A closed, watertight body of revolution: the profile turned around the y axis, capped top and bottom. A drill
 * point's tip is the middle of the bottom cap, so the cap is its cone.
 */
export function createScrewHoleGeometry(options: ScrewHoleGeometryOptions): THREE.BufferGeometry {
  const slot = options.slot ? screwHoleSlotMeasures(options.width, options.depth) : null;
  // A slotted hole (Discussion #1531) has the profile of a round one as wide as its head, and no drill point.
  const outline = slot ? screwHoleProfile({ ...options, width: slot.head, drillPointAngle: undefined }) : screwHoleProfile(options);
  const tip = outline[0].r <= 0 ? outline[0] : null;
  const profile = tip ? outline.slice(1) : outline;
  const rings = profile.length;
  const segments = Math.max(3, Math.round(options.sides ?? DEFAULT_SEGMENTS));
  // Width and depth may differ: the round body is stretched along z.
  const stretch = slot ? 1 : Math.max(0.01, options.depth) / Math.max(0.01, options.width);
  // Each ring, counter-clockwise from above as the angle grows. A slot's ring is its two half circles, each with both
  // of its ends, so the quads between them are the straight walls along the slot.
  const half = Math.max(2, Math.ceil(segments / 2));
  const ringPoints = (r: number): Array<[number, number]> => {
    if (!slot) return Array.from({ length: segments }, (_, s) => [r * Math.cos((s / segments) * Math.PI * 2), r * Math.sin((s / segments) * Math.PI * 2) * stretch]);
    const start = slot.alongX ? -Math.PI / 2 : 0;
    const [dx, dz] = slot.alongX ? [slot.length / 2, 0] : [0, slot.length / 2];
    const points: Array<[number, number]> = [];
    for (const side of [1, -1]) {
      for (let s = 0; s <= half; s += 1) {
        const angle = start + (side === 1 ? 0 : Math.PI) + (s / half) * Math.PI;
        points.push([side * dx + r * Math.cos(angle), side * dz + r * Math.sin(angle)]);
      }
    }
    return points;
  };
  const SEGMENTS = slot ? 2 * (half + 1) : segments;
  const positions: number[] = [];
  const indices: number[] = [];
  profile.forEach(({ r, y }) => {
    for (const [x, z] of ringPoints(r)) positions.push(x, y, z);
  });
  const bottomCentre = rings * SEGMENTS;
  const topCentre = bottomCentre + 1;
  positions.push(0, (tip ?? profile[0]).y, 0, 0, profile[rings - 1].y, 0);
  for (let s = 0; s < SEGMENTS; s += 1) {
    const next = (s + 1) % SEGMENTS;
    // Bottom cap faces down, top cap up.
    indices.push(bottomCentre, s, next);
    indices.push(topCentre, (rings - 1) * SEGMENTS + next, (rings - 1) * SEGMENTS + s);
    for (let ring = 0; ring < rings - 1; ring += 1) {
      const a = ring * SEGMENTS + s;
      const b = ring * SEGMENTS + next;
      const c = (ring + 1) * SEGMENTS + next;
      const d = (ring + 1) * SEGMENTS + s;
      // Counter-clockwise seen from outside: a sideways step or cone faces the axis-away side.
      indices.push(a, d, c);
      indices.push(a, c, b);
    }
  }
  const indexed = new THREE.BufferGeometry();
  indexed.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  indexed.setIndex(indices);
  const geometry = toCreasedNormals(indexed, THREE.MathUtils.degToRad(30));
  indexed.dispose();
  geometry.computeBoundingBox();
  // The tip lies below the bottom: nothing may set the body down on it.
  if (tip) geometry.userData.keepsItsHeight = true;
  return geometry;
}
