import * as THREE from "three";
import { toCreasedNormals } from "@/lib/creasedNormals";
import { normalizeScrewHoleAngle } from "@/lib/screwHoleGeometry";

/*
 * The finishing washer (rosette, Discussion #1131): a domed ring under a countersunk or raised countersunk
 * screw, for a tidy look. A body of revolution around the vertical axis, standing on y = 0:
 *
 *   - flat underneath, from the bore out to the rim;
 *   - a low upright rim, then a dome (a quarter ellipse) rising inwards to the lip of the seat;
 *   - the seat: a cone opening with the screw's angle (90 degrees for metric countersunk screws) from the bore up
 *     to the lip, `screwHoleHeadDepth` deep, as on the countersink shape;
 *   - the bore straight through below the seat.
 *
 * Width (and depth) is the outer diameter, height the whole height, `screwHoleShaft` the bore.
 */

export const DEFAULT_FINISHING_WASHER_WIDTH = 13.4;
export const DEFAULT_FINISHING_WASHER_HEIGHT = 3.95;
export const DEFAULT_FINISHING_WASHER_SHAFT = 4.5;
export const DEFAULT_FINISHING_WASHER_SEAT_DEPTH = 2.45;
/** The ring under the seat keeps at least this much. */
const MIN_BASE = 0.2;
/** The dome keeps at least this much between the lip and the rim. */
const MIN_DOME = 0.2;
const MIN_SHAFT = 0.1;
/** The rim's upright part, as a share of the ring under the seat. */
const RIM_SHARE = 0.25;
const DEFAULT_SEGMENTS = 48;

export type FinishingWasherOptions = {
  width: number;
  height: number;
  screwHoleShaft?: number;
  screwHoleHeadDepth?: number;
  screwHoleAngle?: number;
};

export type FinishingWasherMeasures = {
  /** The rim's radius. */
  outer: number;
  height: number;
  /** The bore's radius. */
  shaft: number;
  /** How deep the seat goes, from the top. */
  seatDepth: number;
  /** The lip of the seat, where the dome ends. */
  seat: number;
  /** The upright part of the rim, from the bottom. */
  rim: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function finite(value: number | undefined, fallback: number) {
  return Number.isFinite(value) ? (value as number) : fallback;
}

/** The washer's measures, each kept within what the others leave: the bore inside the rim, the seat inside the height. */
export function finishingWasherMeasures({ width, height, screwHoleShaft, screwHoleHeadDepth, screwHoleAngle }: FinishingWasherOptions): FinishingWasherMeasures {
  const safeHeight = Math.max(0.05, height);
  const outer = Math.max(0.05, width / 2);
  const shaft = clamp(finite(screwHoleShaft, DEFAULT_FINISHING_WASHER_SHAFT) / 2, Math.min(MIN_SHAFT, outer * 0.25), outer - Math.min(MIN_DOME, outer * 0.25));
  const slope = Math.tan(THREE.MathUtils.degToRad(normalizeScrewHoleAngle(screwHoleAngle)) / 2);
  // The lip stays inside the rim, and the seat leaves a ring under it.
  const deepest = Math.min(safeHeight - Math.min(MIN_BASE, safeHeight * 0.25), (outer - Math.min(MIN_DOME, (outer - shaft) / 2) - shaft) / slope);
  const seatDepth = clamp(finite(screwHoleHeadDepth, DEFAULT_FINISHING_WASHER_SEAT_DEPTH), 0, Math.max(0, deepest));
  return { outer, height: safeHeight, shaft, seatDepth, seat: shaft + seatDepth * slope, rim: (safeHeight - seatDepth) * RIM_SHARE };
}

/** The seat's depth for a lip of this diameter: what the panel sets when a head diameter is typed. */
export function finishingWasherSeatDepthFor(seatDiameter: number, shaft: number, angle: number | undefined) {
  return Math.max(0, (seatDiameter - shaft) / 2 / Math.tan(THREE.MathUtils.degToRad(normalizeScrewHoleAngle(angle)) / 2));
}

type ProfilePoint = { r: number; y: number };

/**
 * The section, counter-clockwise from the bottom of the bore: out along the bottom, up the rim, over the dome
 * (`arcSteps` chords) to the lip, down the seat and down the bore.
 */
export function finishingWasherProfile(options: FinishingWasherOptions, arcSteps = 16): ProfilePoint[] {
  const { outer, height, shaft, seatDepth, seat, rim } = finishingWasherMeasures(options);
  const points: ProfilePoint[] = [{ r: shaft, y: 0 }, { r: outer, y: 0 }];
  const steps = Math.max(2, Math.round(arcSteps));
  for (let step = 0; step <= steps; step += 1) {
    const angle = (step / steps) * (Math.PI / 2);
    points.push({ r: seat + (outer - seat) * Math.cos(angle), y: rim + (height - rim) * Math.sin(angle) });
  }
  if (seatDepth > 1e-6) points.push({ r: shaft, y: height - seatDepth });
  return points;
}

/** A closed, watertight ring: the section turned around the y axis, stretched along z when depth and width differ. */
export function createFinishingWasherGeometry(options: FinishingWasherOptions & { depth: number; sides?: number }): THREE.BufferGeometry {
  const segments = Math.max(3, Math.round(options.sides ?? DEFAULT_SEGMENTS));
  const profile = finishingWasherProfile(options, Math.max(8, Math.round(segments / 3)));
  const stretch = Math.max(0.01, options.depth) / Math.max(0.01, options.width);
  const positions: number[] = [];
  const indices: number[] = [];
  profile.forEach(({ r, y }) => {
    for (let s = 0; s < segments; s += 1) {
      const angle = (s / segments) * Math.PI * 2;
      positions.push(r * Math.cos(angle), y, r * Math.sin(angle) * stretch);
    }
  });
  const rings = profile.length;
  for (let ring = 0; ring < rings; ring += 1) {
    const nextRing = (ring + 1) % rings;
    for (let s = 0; s < segments; s += 1) {
      const next = (s + 1) % segments;
      const a = ring * segments + s;
      const b = ring * segments + next;
      const c = nextRing * segments + next;
      const d = nextRing * segments + s;
      // Counter-clockwise seen from outside, as on the screw holes (screwHoleGeometry.ts).
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
