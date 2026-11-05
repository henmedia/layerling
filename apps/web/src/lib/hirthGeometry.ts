import * as THREE from "three";

/*
 * A Hirth joint (#1016): a disc whose top is a ring of V-shaped teeth running
 * out from the centre, so that two of them, the second turned over, lock into
 * each other at any multiple of one tooth.
 *
 * Every crest and every root is a straight line through one point on the axis,
 * `apexY` high, and every flank is the plane between a crest and the root next
 * to it - the teeth grow from nothing at the axis to `toothHeight` at the rim,
 * which is what centres the two halves on each other. The crests reach the
 * full height at the rim, the roots lie `toothHeight` lower there.
 *
 * The flanks are laid so that the joint is its own partner turned over front
 * to back (180 degrees about x): a crest at a quarter tooth past +x and a root
 * a quarter tooth before it, so that turn puts every crest of the one over a
 * root of the other. Built in the shape's own frame: y up from y = 0, centred
 * on x and z, angles from +x towards +z; an oval footprint stretches the
 * teeth, while the bore stays round.
 *
 * Saw teeth (Discussion #1320): with `hirthSteepFlank` one flank of every
 * tooth stands at that angle to the face at the rim, up to 90 degrees, and the
 * other takes the rest of the tooth, like a ratchet. The root then lies a
 * share `split` of a tooth past its crest instead of half a tooth, and the
 * crest (1 - split) / 2 of a tooth past +x, which keeps the joint its own
 * partner turned over. `hirthReverse` puts the steep flank on the other side.
 * A flank at 90 degrees is a step: a wall in the plane through the axis.
 */

export const DEFAULT_HIRTH_TEETH = 24;
export const MIN_HIRTH_TEETH = 6;
export const MAX_HIRTH_TEETH = 90;
export const DEFAULT_HIRTH_DIAMETER = 40;
export const DEFAULT_HIRTH_HEIGHT = 10;
export const DEFAULT_HIRTH_BORE = 10;
/** Material left under the roots at the rim, in mm. */
export const MIN_HIRTH_BASE = 0.4;
/** The narrowest ring between the bore and the outside, in mm. */
export const MIN_HIRTH_WALL = 1;
export const MIN_HIRTH_TOOTH_HEIGHT = 0.2;
/** Saw teeth: the steep flank's angle to the face, in degrees. */
export const MIN_HIRTH_STEEP_FLANK = 45;
export const MAX_HIRTH_STEEP_FLANK = 90;
export const DEFAULT_HIRTH_STEEP_FLANK = 90;
/** A flank narrower than this share of a tooth is a step (a wall through the axis). */
const STEP_SPLIT = 1e-6;

export type HirthMeasures = {
  /** Half the width and half the depth: the rim. */
  rx: number;
  rz: number;
  height: number;
  teeth: number;
  /** Crest over root at the rim. */
  toothHeight: number;
  /** 0 for none. */
  boreRadius: number;
  /** Where every crest and root line meets the axis. */
  apexY: number;
  /** How far past its crest a tooth's root lies, as a share of one tooth: 0.5 for symmetric teeth, 0 or 1 for a step. */
  split: number;
};

type HirthSource = { teeth?: number; toothSize?: number; centerHoleSize?: number; hirthSteepFlank?: number; hirthReverse?: boolean; height: number };

export function normalizeHirthTeeth(value?: number) {
  const teeth = Math.round(Number.isFinite(value) ? (value as number) : DEFAULT_HIRTH_TEETH);
  return Math.min(MAX_HIRTH_TEETH, Math.max(MIN_HIRTH_TEETH, teeth));
}

/** The tooth height at the rim that gives a right angle between the flanks there, to a tenth of a mm. */
export function hirthRightAngleToothHeight(width: number, depth: number, teeth: number) {
  const radius = Math.min(width, depth) / 2;
  return Math.max(MIN_HIRTH_TOOTH_HEIGHT, Math.round(((Math.PI * radius) / normalizeHirthTeeth(teeth)) * 10) / 10);
}

/** The roots may reach down to the bottom at the rim (Discussion #1320): the joint still holds together towards the axis. */
export function hirthToothHeightLimit(width: number, depth: number, height: number) {
  return Math.max(MIN_HIRTH_TOOTH_HEIGHT, Math.min(height, Math.min(width, depth) / 2));
}

/** A tooth height that leaves a base under the roots; missing means the right-angled teeth. */
export function normalizeHirthToothHeight(value: number | undefined, width: number, depth: number, height: number, teeth?: number) {
  const wanted = Number.isFinite(value) && (value as number) > 0 ? (value as number) : hirthRightAngleToothHeight(width, depth, normalizeHirthTeeth(teeth));
  return Math.min(hirthToothHeightLimit(width, depth, height), Math.max(MIN_HIRTH_TOOTH_HEIGHT, wanted));
}

export function hirthBoreLimit(width: number, depth: number) {
  return Math.max(0, Math.min(width, depth) - 2 * MIN_HIRTH_WALL);
}

/** The bore's diameter, 0 for none, within the ring the joint leaves. */
export function normalizeHirthBore(value: number | undefined, width: number, depth: number) {
  const wanted = Number.isFinite(value) ? Math.max(0, value as number) : DEFAULT_HIRTH_BORE;
  return Math.min(hirthBoreLimit(width, depth), wanted);
}

/** Saw teeth's steep flank in degrees, or undefined for symmetric teeth (also for 0 or less). */
export function normalizeHirthSteepFlank(value: number | undefined | null) {
  if (value === undefined || value === null || !Number.isFinite(value) || value <= 0) return undefined;
  return Math.min(MAX_HIRTH_STEEP_FLANK, Math.max(MIN_HIRTH_STEEP_FLANK, value));
}

/**
 * The share of a tooth from a crest to the next root, going from +x towards +z: 0.5 for symmetric teeth;
 * for saw teeth the steep flank's run at the rim over one tooth (0 for a step), or one less that with `reverse`.
 * A steep flank that would need more than half a tooth gives symmetric teeth.
 */
export function hirthSplit(width: number, depth: number, teeth: number, toothHeight: number, steepFlank?: number, reverse?: boolean) {
  const angle = normalizeHirthSteepFlank(steepFlank);
  if (angle === undefined) return 0.5;
  const pitch = (Math.PI * Math.min(width, depth)) / normalizeHirthTeeth(teeth);
  const run = angle >= MAX_HIRTH_STEEP_FLANK ? 0 : toothHeight / Math.tan(THREE.MathUtils.degToRad(angle));
  let steep = Math.min(0.5, Math.max(0, run / pitch));
  if (steep < STEP_SPLIT) steep = 0;
  return reverse ? 1 - steep : steep;
}

/** Saw teeth's gentle flank: its angle to the face at the rim, in degrees (on a round joint). */
export function hirthGentleFlankAngle(width: number, depth: number, teeth: number, toothHeight: number, split: number) {
  const pitch = (Math.PI * Math.min(width, depth)) / normalizeHirthTeeth(teeth);
  const run = Math.max(1e-9, Math.max(split, 1 - split) * pitch);
  return THREE.MathUtils.radToDeg(Math.atan2(toothHeight, run));
}

/** The angle between the two flanks of a tooth at the rim, in degrees (on a round joint). */
export function hirthFlankAngle(width: number, depth: number, teeth: number, toothHeight: number) {
  const radius = Math.min(width, depth) / 2;
  const halfPitch = (Math.PI * radius) / normalizeHirthTeeth(teeth);
  return THREE.MathUtils.radToDeg(2 * Math.atan2(halfPitch, Math.max(1e-9, toothHeight)));
}

export function hirthMeasures(shape: HirthSource, width: number, depth: number): HirthMeasures {
  const teeth = normalizeHirthTeeth(shape.teeth);
  const height = Math.max(MIN_HIRTH_BASE + MIN_HIRTH_TOOTH_HEIGHT, shape.height);
  const toothHeight = normalizeHirthToothHeight(shape.toothSize, width, depth, height, teeth);
  return {
    rx: width / 2,
    rz: depth / 2,
    height,
    teeth,
    toothHeight,
    boreRadius: normalizeHirthBore(shape.centerHoleSize, width, depth) / 2,
    apexY: height - toothHeight / 2,
    split: hirthSplit(width, depth, teeth, toothHeight, shape.hirthSteepFlank, shape.hirthReverse),
  };
}

/** Crests (1 - split) / 2 of a tooth past +x and every tooth on (a quarter for symmetric teeth), the roots `split` of a tooth after them. */
export function hirthCrestAngle(teeth: number, index: number, split = 0.5) {
  return ((index + (1 - split) / 2) * 2 * Math.PI) / teeth;
}

export function hirthRootAngle(teeth: number, index: number, split = 0.5) {
  return ((index + (1 - split) / 2 + split) * 2 * Math.PI) / teeth;
}

type Flank = { from: number; to: number; a: number; b: number };

/**
 * The flank planes in the unit frame (x / rx, z / rz): y = apexY + toothHeight / 2 * (a u + b v),
 * flank 2k from crest k to root k, flank 2k + 1 from root k to crest k + 1. A step has no plane
 * and is left out: the flanks beside it meet there, one at the crest's height, one at the root's.
 */
function flankCoefficients(teeth: number, split = 0.5) {
  const flanks: Flank[] = [];
  for (let index = 0; index < teeth; index += 1) {
    const crest = hirthCrestAngle(teeth, index, split);
    const root = hirthRootAngle(teeth, index, split);
    const next = hirthCrestAngle(teeth, index + 1, split);
    if (split > 0) flanks.push({ from: crest, to: root, ...throughTwo(crest, 1, root, -1) });
    if (split < 1) flanks.push({ from: root, to: next, ...throughTwo(root, -1, next, 1) });
  }
  return flanks;
}

/** a cos + b sin taking the values p at angle s and q at angle t. */
function throughTwo(s: number, p: number, t: number, q: number) {
  const det = Math.cos(s) * Math.sin(t) - Math.sin(s) * Math.cos(t);
  return { a: (p * Math.sin(t) - q * Math.sin(s)) / det, b: (q * Math.cos(s) - p * Math.cos(t)) / det };
}

/** Height of the toothed top over the point (x, z) of the shape's frame. */
export function hirthSurfaceY(measures: HirthMeasures, x: number, z: number) {
  const u = x / measures.rx;
  const v = z / measures.rz;
  const flanks = flankCoefficients(measures.teeth, measures.split);
  const start = flanks[0].from;
  let angle = Math.atan2(v, u) - start;
  angle = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const flank = flanks.find((candidate) => angle + start < candidate.to) ?? flanks[flanks.length - 1];
  return measures.apexY + (measures.toothHeight / 2) * (flank.a * u + flank.b * v);
}

/**
 * The display mesh: the flanks as planar strips between the bore and the rim,
 * each flank split into a few rays so the walls come round; the outer wall,
 * the bore's wall and the flat bottom. Normals are the flanks' own, and the
 * walls' radial ones, so the teeth shade flat and the walls round. Where saw
 * teeth step, a wall through the axis joins the two flanks, and the outer and
 * the bore's wall take the step's corner too, so the mesh stays closed.
 */
export function createHirthGeometry(width: number, height: number, depth: number, shape: Omit<HirthSource, "height">) {
  const measures = hirthMeasures({ ...shape, height }, width, depth);
  const { rx, rz, teeth, boreRadius, apexY, toothHeight, split } = measures;
  const flanks = flankCoefficients(teeth, split);
  // At least 128 corners round the rim, two on every flank, and every crest and root among them.
  const raysFor = (flank: Flank) => Math.max(2, Math.ceil(((flank.to - flank.from) * 128) / (2 * Math.PI)));
  const positions: number[] = [];
  const normals: number[] = [];
  const rays: Array<{ flank: number; angle: number }> = [];
  flanks.forEach((flank, index) => {
    const count = raysFor(flank);
    for (let step = 0; step < count; step += 1) rays.push({ flank: index, angle: flank.from + ((flank.to - flank.from) * step) / count });
  });
  const surfaceY = (flank: number, u: number, v: number) => apexY + (toothHeight / 2) * (flanks[flank].a * u + flanks[flank].b * v);
  // A ray's points in the unit frame: on the rim, and where it crosses the round bore.
  const outer = (angle: number) => ({ u: Math.cos(angle), v: Math.sin(angle) });
  const inner = (angle: number) => {
    if (boreRadius <= 0) return { u: 0, v: 0 };
    const along = boreRadius / Math.hypot(rx * Math.cos(angle), rz * Math.sin(angle));
    return { u: Math.cos(angle) * along, v: Math.sin(angle) * along };
  };
  const at = (point: { u: number; v: number }, y: number): [number, number, number] => [point.u * rx, y, point.v * rz];
  const push = (points: Array<[number, number, number]>, normal: (point: [number, number, number]) => [number, number, number]) => {
    for (const point of points) {
      positions.push(...point);
      normals.push(...normal(point));
    }
  };
  const flat = (a: [number, number, number], b: [number, number, number], c: [number, number, number], outward: [number, number, number]) => {
    const n = new THREE.Vector3().crossVectors(new THREE.Vector3(...b).sub(new THREE.Vector3(...a)), new THREE.Vector3(...c).sub(new THREE.Vector3(...a)));
    if (n.lengthSq() < 1e-24) return;
    const flip = n.dot(new THREE.Vector3(...outward)) < 0;
    n.normalize().multiplyScalar(flip ? -1 : 1);
    push(flip ? [a, c, b] : [a, b, c], () => [n.x, n.y, n.z]);
  };
  const radial = (point: [number, number, number], sign: number): [number, number, number] => {
    const n = new THREE.Vector3((point[0] / (rx * rx)) * sign, 0, (point[2] / (rz * rz)) * sign);
    if (n.lengthSq() < 1e-24) return [0, 0, 0];
    n.normalize();
    return [n.x, n.y, n.z];
  };
  type P = [number, number, number];
  // A piece of the outer wall (sign 1) or the bore's (-1) between two rays, from the bottom b1, b2 up to
  // the flank at t1, t2; `low1` / `low2` is the lower corner of a step on that side, which the wall's edge
  // has to pass through. Fanned from the bottom corner across from that side.
  const wall = (b1: P, b2: P, t1: P, t2: P, sign: number, low1?: P, low2?: P) => {
    const polygon: P[] = low1 ? [b2, t2, t1, low1, b1] : low2 ? [b1, b2, low2, t2, t1] : [b1, b2, t2, t1];
    for (let corner = 1; corner + 1 < polygon.length; corner += 1) {
      const a = polygon[0];
      const b = polygon[corner];
      const c = polygon[corner + 1];
      const n = new THREE.Vector3().crossVectors(new THREE.Vector3(...b).sub(new THREE.Vector3(...a)), new THREE.Vector3(...c).sub(new THREE.Vector3(...a)));
      if (n.lengthSq() < 1e-24) continue;
      const facing = new THREE.Vector3(...radial([(a[0] + b[0] + c[0]) / 3, 0, (a[2] + b[2] + c[2]) / 3], sign));
      push(n.dot(facing) >= 0 ? [a, b, c] : [a, c, b], (point) => radial(point, sign));
    }
  };
  const tops = (flank: number, i: { u: number; v: number }, o: { u: number; v: number }): [P, P] => [at(i, surfaceY(flank, i.u, i.v)), at(o, surfaceY(flank, o.u, o.v))];
  const differ = (a: P, b: P) => Math.abs(a[1] - b[1]) > 1e-9 * Math.max(1, toothHeight);

  rays.forEach((ray, index) => {
    const previous = rays[(index - 1 + rays.length) % rays.length];
    const next = rays[(index + 1) % rays.length];
    const nextAngle = index + 1 === rays.length ? next.angle + 2 * Math.PI : next.angle;
    // Both rays of a strip lie in the same flank: the one this ray starts.
    const flank = ray.flank;
    const o1 = outer(ray.angle);
    const o2 = outer(nextAngle);
    const i1 = inner(ray.angle);
    const i2 = inner(nextAngle);
    const [inner1, outer1] = tops(flank, i1, o1);
    const [inner2, outer2] = tops(flank, i2, o2);
    const top: P[] = [inner1, outer1, outer2, inner2];
    const up: P = [0, 1, 0];
    flat(top[0], top[1], top[2], up);
    if (boreRadius > 0) flat(top[0], top[2], top[3], up);
    // A step at either end: the flank beside it is lower or higher there. A lower one is a corner on this
    // strip's walls; the step's own wall is drawn once, by the strip before it.
    const [prevInner, prevOuter] = tops(previous.flank, i1, o1);
    const [nextInner, nextOuter] = tops(next.flank, i2, o2);
    const stepBefore = previous.flank !== flank && differ(prevOuter, outer1);
    const stepAfter = next.flank !== flank && differ(nextOuter, outer2);
    const lowOuter1 = stepBefore && prevOuter[1] < outer1[1] ? prevOuter : undefined;
    const lowOuter2 = stepAfter && nextOuter[1] < outer2[1] ? nextOuter : undefined;
    const lowInner1 = stepBefore && prevInner[1] < inner1[1] ? prevInner : undefined;
    const lowInner2 = stepAfter && nextInner[1] < inner2[1] ? nextInner : undefined;
    if (stepAfter) {
      // The step's wall, in the plane through the axis, facing the lower side.
      const tangent: P = [-rx * Math.sin(nextAngle), 0, rz * Math.cos(nextAngle)];
      const towards: P = nextOuter[1] < outer2[1] ? tangent : [-tangent[0], 0, -tangent[2]];
      flat(inner2, outer2, nextOuter, towards);
      flat(inner2, nextOuter, nextInner, towards);
    }
    // Outer wall, from the bottom up to the flank.
    wall(at(o1, 0), at(o2, 0), outer1, outer2, 1, lowOuter1, lowOuter2);
    // The flat bottom, a ring (or a fan without a bore).
    const down: P = [0, -1, 0];
    flat(at(i1, 0), at(o1, 0), at(o2, 0), down);
    if (boreRadius > 0) {
      flat(at(i1, 0), at(o2, 0), at(i2, 0), down);
      wall(at(i1, 0), at(i2, 0), inner1, inner2, -1, lowInner1, lowInner2);
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  return geometry;
}
