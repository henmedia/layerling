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
};

type HirthSource = { teeth?: number; toothSize?: number; centerHoleSize?: number; height: number };

export function normalizeHirthTeeth(value?: number) {
  const teeth = Math.round(Number.isFinite(value) ? (value as number) : DEFAULT_HIRTH_TEETH);
  return Math.min(MAX_HIRTH_TEETH, Math.max(MIN_HIRTH_TEETH, teeth));
}

/** The tooth height at the rim that gives a right angle between the flanks there, to a tenth of a mm. */
export function hirthRightAngleToothHeight(width: number, depth: number, teeth: number) {
  const radius = Math.min(width, depth) / 2;
  return Math.max(MIN_HIRTH_TOOTH_HEIGHT, Math.round(((Math.PI * radius) / normalizeHirthTeeth(teeth)) * 10) / 10);
}

export function hirthToothHeightLimit(width: number, depth: number, height: number) {
  return Math.max(MIN_HIRTH_TOOTH_HEIGHT, Math.min(height - MIN_HIRTH_BASE, Math.min(width, depth) / 2));
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
  };
}

/** Crests at a quarter tooth past +x and every tooth on, the roots half a tooth after them. */
export function hirthCrestAngle(teeth: number, index: number) {
  return ((index + 0.25) * 2 * Math.PI) / teeth;
}

export function hirthRootAngle(teeth: number, index: number) {
  return ((index + 0.75) * 2 * Math.PI) / teeth;
}

/**
 * The flank planes in the unit frame (x / rx, z / rz): y = apexY + toothHeight / 2 * (a u + b v),
 * flank 2k from crest k to root k, flank 2k + 1 from root k to crest k + 1.
 */
function flankCoefficients(teeth: number) {
  const flanks: Array<{ from: number; to: number; a: number; b: number }> = [];
  for (let index = 0; index < teeth; index += 1) {
    const crest = hirthCrestAngle(teeth, index);
    const root = hirthRootAngle(teeth, index);
    const next = hirthCrestAngle(teeth, index + 1);
    flanks.push({ from: crest, to: root, ...throughTwo(crest, 1, root, -1) });
    flanks.push({ from: root, to: next, ...throughTwo(root, -1, next, 1) });
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
  const flanks = flankCoefficients(measures.teeth);
  const period = (2 * Math.PI) / measures.teeth;
  let angle = Math.atan2(v, u) - hirthCrestAngle(measures.teeth, 0);
  angle = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const index = Math.min(flanks.length - 1, Math.floor(angle / (period / 2)));
  const { a, b } = flanks[index];
  return measures.apexY + (measures.toothHeight / 2) * (a * u + b * v);
}

/**
 * The display mesh: the flanks as planar strips between the bore and the rim,
 * each flank split into a few rays so the walls come round; the outer wall,
 * the bore's wall and the flat bottom. Normals are the flanks' own, and the
 * walls' radial ones, so the teeth shade flat and the walls round.
 */
export function createHirthGeometry(width: number, height: number, depth: number, shape: Omit<HirthSource, "height">) {
  const measures = hirthMeasures({ ...shape, height }, width, depth);
  const { rx, rz, teeth, boreRadius, apexY, toothHeight } = measures;
  const flanks = flankCoefficients(teeth);
  // At least 128 corners round the rim, and every crest and root among them.
  const raysPerFlank = Math.max(2, Math.ceil(128 / (2 * teeth)));
  const positions: number[] = [];
  const normals: number[] = [];
  const rays: Array<{ flank: number; angle: number }> = [];
  flanks.forEach((flank, index) => {
    for (let step = 0; step < raysPerFlank; step += 1) rays.push({ flank: index, angle: flank.from + ((flank.to - flank.from) * step) / raysPerFlank });
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
  const wall = (a: [number, number, number], b: [number, number, number], c: [number, number, number], d: [number, number, number], sign: number) => {
    // a-b along the bottom, c above b, d above a; facing out for sign 1, in towards the axis for -1.
    const n = new THREE.Vector3().crossVectors(new THREE.Vector3(...b).sub(new THREE.Vector3(...a)), new THREE.Vector3(...c).sub(new THREE.Vector3(...a)));
    const facing = new THREE.Vector3(...radial([(a[0] + b[0]) / 2, 0, (a[2] + b[2]) / 2], sign));
    const order: Array<[number, number, number]> = n.dot(facing) >= 0 ? [a, b, c, a, c, d] : [a, c, b, a, d, c];
    push(order, (point) => radial(point, sign));
  };

  rays.forEach((ray, index) => {
    const next = rays[(index + 1) % rays.length];
    const nextAngle = index + 1 === rays.length ? next.angle + 2 * Math.PI : next.angle;
    // Both rays of a strip lie in the same flank: the one this ray starts.
    const flank = ray.flank;
    const o1 = outer(ray.angle);
    const o2 = outer(nextAngle);
    const i1 = inner(ray.angle);
    const i2 = inner(nextAngle);
    const top: Array<[number, number, number]> = [at(i1, surfaceY(flank, i1.u, i1.v)), at(o1, surfaceY(flank, o1.u, o1.v)), at(o2, surfaceY(flank, o2.u, o2.v)), at(i2, surfaceY(flank, i2.u, i2.v))];
    const up: [number, number, number] = [0, 1, 0];
    flat(top[0], top[1], top[2], up);
    if (boreRadius > 0) flat(top[0], top[2], top[3], up);
    // Outer wall, from the bottom up to the flank.
    wall(at(o1, 0), at(o2, 0), top[2], top[1], 1);
    // The flat bottom, a ring (or a fan without a bore).
    const down: [number, number, number] = [0, -1, 0];
    flat(at(i1, 0), at(o1, 0), at(o2, 0), down);
    if (boreRadius > 0) {
      flat(at(i1, 0), at(o2, 0), at(i2, 0), down);
      wall(at(i1, 0), at(i2, 0), top[3], top[0], -1);
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  return geometry;
}
