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
  /** Corners around the axis; the automatic count for the diameter when left out. */
  sides?: number;
};

/** Radius and height of each corner of the outline, from the bottom of the shaft up to the rim of the head. */
export function screwHoleProfile({ kind, width, height, screwHoleShaft, screwHoleHeadDepth, screwHoleAngle }: Omit<ScrewHoleGeometryOptions, "depth">): ProfilePoint[] {
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

/** A closed, watertight body of revolution: the profile turned around the y axis, capped top and bottom. */
export function createScrewHoleGeometry(options: ScrewHoleGeometryOptions): THREE.BufferGeometry {
  const profile = screwHoleProfile(options);
  const rings = profile.length;
  const SEGMENTS = Math.max(3, Math.round(options.sides ?? DEFAULT_SEGMENTS));
  // Width and depth may differ: the round body is stretched along z.
  const stretch = Math.max(0.01, options.depth) / Math.max(0.01, options.width);
  const positions: number[] = [];
  const indices: number[] = [];
  profile.forEach(({ r, y }) => {
    for (let s = 0; s < SEGMENTS; s += 1) {
      const angle = (s / SEGMENTS) * Math.PI * 2;
      positions.push(r * Math.cos(angle), y, r * Math.sin(angle) * stretch);
    }
  });
  const bottomCentre = rings * SEGMENTS;
  const topCentre = bottomCentre + 1;
  positions.push(0, profile[0].y, 0, 0, profile[rings - 1].y, 0);
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
  return geometry;
}
