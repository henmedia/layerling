import * as THREE from "three";
import { toCreasedNormals } from "@/lib/creasedNormals";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * A GT2 timing belt pulley (Discussion #1319): a toothed band for a 2 mm GT2
 * belt between two flanges, with a hub on top and a bore through it all.
 *
 * The pitch is fixed, so the number of teeth sets the size: the pitch circle
 * is teeth x 2 mm round, and the pulley's outside diameter lies twice the
 * pitch line differential (0.254 mm) inside it - 12.22 mm for 20 teeth.
 *
 * Each groove is the belt's tooth as GT2 draws it, made of true arcs: the
 * tip of radius 0.555 mm at the bottom, 0.75 mm deep, a flank of radius 1 mm
 * on either side whose centre lies on the outside circle 0.4 mm across the
 * groove's middle, and a fillet of 0.15 mm where a flank meets the outside
 * circle. The tip touches both flanks (1 - 0.555 = 0.445 = the distance of
 * their centres), so the groove runs smoothly from one land to the next. The
 * groove is placed whole at its angle, not bent round the circle; the fillets
 * are fitted to the true outside circle, so every joint is smooth.
 *
 * From the bottom up: a flange, the toothed band as wide as the belt (plus a
 * little play), a flange, the hub. Width, depth and height follow from these
 * measures; a dragged handle sets the teeth and the belt width
 * (pulleyFromSize). Built in the shape's own frame: y up from y = 0, centred
 * on x and z, angles from +x towards +z.
 */

export const GT2_PITCH = 2;
export const GT2_PITCH_LINE_DIFFERENTIAL = 0.254;
export const GT2_GROOVE_DEPTH = 0.75;
export const GT2_TIP_RADIUS = 0.555;
export const GT2_FLANK_RADIUS = 1;
export const GT2_FLANK_OFFSET = 0.4;
export const GT2_FILLET_RADIUS = 0.15;

export const DEFAULT_PULLEY_TEETH = 20;
export const MIN_PULLEY_TEETH = 10;
export const MAX_PULLEY_TEETH = 200;
export const DEFAULT_PULLEY_BELT_WIDTH = 7;
export const MIN_PULLEY_BELT_WIDTH = 1;
export const MAX_PULLEY_BELT_WIDTH = 100;
export const DEFAULT_PULLEY_FLANGE = 1;
export const MAX_PULLEY_FLANGE = 10;
export const DEFAULT_PULLEY_FLANGE_RISE = 1.5;
export const MIN_PULLEY_FLANGE_RISE = 0.5;
export const MAX_PULLEY_FLANGE_RISE = 20;
export const DEFAULT_PULLEY_HUB_HEIGHT = 6;
export const MAX_PULLEY_HUB_HEIGHT = 100;
export const DEFAULT_PULLEY_HUB_DIAMETER = 12;
export const DEFAULT_PULLEY_BORE = 5;
/** The thinnest wall left round the bore, in mm. */
export const MIN_PULLEY_WALL = 0.8;
/** Below this a flange or a hub counts as none. */
const MIN_PART = 0.05;

type PulleySource = Pick<WorkplaneShape, "teeth" | "centerHoleSize" | "pulleyBeltWidth" | "pulleyFlange" | "pulleyFlangeRise" | "pulleyHubHeight" | "pulleyHubDiameter">;

export type PulleyMeasures = {
  teeth: number;
  /** The outside circle the lands lie on, and the circle through the groove bottoms. */
  outsideRadius: number;
  rootRadius: number;
  beltWidth: number;
  /** 0 for none. */
  flange: number;
  flangeRadius: number;
  /** 0 for none. */
  hubHeight: number;
  hubRadius: number;
  /** 0 for none. */
  boreRadius: number;
  /** Bottom to top. */
  height: number;
  /** Across the widest part. */
  diameter: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function finite(value: number | undefined, fallback: number) {
  return Number.isFinite(value) ? (value as number) : fallback;
}

export function normalizePulleyTeeth(value?: number) {
  return clamp(Math.round(finite(value, DEFAULT_PULLEY_TEETH)), MIN_PULLEY_TEETH, MAX_PULLEY_TEETH);
}

export function pulleyPitchDiameter(teeth?: number) {
  return (normalizePulleyTeeth(teeth) * GT2_PITCH) / Math.PI;
}

export function pulleyOutsideDiameter(teeth?: number) {
  return pulleyPitchDiameter(teeth) - 2 * GT2_PITCH_LINE_DIFFERENTIAL;
}

export function pulleyMeasures(shape: PulleySource): PulleyMeasures {
  const teeth = normalizePulleyTeeth(shape.teeth);
  const outsideRadius = pulleyOutsideDiameter(teeth) / 2;
  const rootRadius = outsideRadius - GT2_GROOVE_DEPTH;
  const beltWidth = clamp(finite(shape.pulleyBeltWidth, DEFAULT_PULLEY_BELT_WIDTH), MIN_PULLEY_BELT_WIDTH, MAX_PULLEY_BELT_WIDTH);
  let flange = clamp(finite(shape.pulleyFlange, DEFAULT_PULLEY_FLANGE), 0, MAX_PULLEY_FLANGE);
  if (flange < MIN_PART) flange = 0;
  const flangeRadius = flange > 0 ? outsideRadius + clamp(finite(shape.pulleyFlangeRise, DEFAULT_PULLEY_FLANGE_RISE), MIN_PULLEY_FLANGE_RISE, MAX_PULLEY_FLANGE_RISE) : outsideRadius;
  let hubHeight = clamp(finite(shape.pulleyHubHeight, DEFAULT_PULLEY_HUB_HEIGHT), 0, MAX_PULLEY_HUB_HEIGHT);
  if (hubHeight < MIN_PART) hubHeight = 0;
  // The hub stands on the top flange and stays within it; without flanges it stands on the teeth, inside their roots.
  const hubLimit = flange > 0 ? flangeRadius : rootRadius - 0.2;
  const boreWanted = Math.max(0, finite(shape.centerHoleSize, DEFAULT_PULLEY_BORE)) / 2;
  const hubFloor = Math.min(hubLimit, boreWanted + MIN_PULLEY_WALL);
  const hubRadius = hubHeight > 0 ? clamp(finite(shape.pulleyHubDiameter, DEFAULT_PULLEY_HUB_DIAMETER) / 2, hubFloor, hubLimit) : 0;
  const boreLimit = Math.max(0, Math.min(rootRadius, hubHeight > 0 ? hubRadius : Infinity) - MIN_PULLEY_WALL);
  let boreRadius = Math.min(boreWanted, boreLimit);
  if (boreRadius < MIN_PART) boreRadius = 0;
  return {
    teeth,
    outsideRadius,
    rootRadius,
    beltWidth,
    flange,
    flangeRadius,
    hubHeight,
    hubRadius,
    boreRadius,
    height: 2 * flange + beltWidth + hubHeight,
    diameter: 2 * Math.max(flangeRadius, outsideRadius, hubRadius),
  };
}

/** The shape's box as its measures make it. */
export function pulleyFootprint(shape: PulleySource) {
  const measures = pulleyMeasures(shape);
  return { width: measures.diameter, depth: measures.diameter, height: measures.height, size: measures.diameter };
}

/**
 * A handle dragged to a new width or height: the teeth that come nearest that width (flanges and
 * hub kept), the belt width that gives that height. Missing sizes keep what they set.
 */
export function pulleyFromSize(shape: PulleySource, size: { width?: number; height?: number }): Pick<WorkplaneShape, "teeth" | "pulleyBeltWidth"> {
  const measures = pulleyMeasures(shape);
  let teeth = measures.teeth;
  if (Number.isFinite(size.width) && Math.abs((size.width as number) - measures.diameter) > 1e-6) {
    // The flange (or the outside circle) is what is wider than the hub when that is dragged; past the hub's width the teeth still follow.
    const rim = measures.flange > 0 ? measures.flangeRadius - measures.outsideRadius : 0;
    const outside = (size.width as number) - 2 * rim;
    teeth = normalizePulleyTeeth((Math.PI * (outside + 2 * GT2_PITCH_LINE_DIFFERENTIAL)) / GT2_PITCH);
  }
  let beltWidth = measures.beltWidth;
  if (Number.isFinite(size.height) && Math.abs((size.height as number) - measures.height) > 1e-6) {
    beltWidth = clamp((size.height as number) - 2 * measures.flange - measures.hubHeight, MIN_PULLEY_BELT_WIDTH, MAX_PULLEY_BELT_WIDTH);
  }
  return { teeth, pulleyBeltWidth: beltWidth };
}

/**
 * A patch that sizes a pulley - a dragged handle, a typed width or height - turned into the teeth
 * and the belt width that make that size, with the box they then give. Other shapes' patches pass.
 */
export function pulleySizedPatch(shape: WorkplaneShape, patch: Partial<WorkplaneShape>): Partial<WorkplaneShape> {
  if (shape.kind !== "pulley") return patch;
  const sized = pulleyFromSize({ ...shape, ...patch }, { width: patch.width ?? patch.depth, height: patch.height });
  return { ...patch, ...sized, ...pulleyFootprint({ ...shape, ...patch, ...sized }) };
}

export type PulleyArc ={ cx: number; cz: number; radius: number; start: number; end: number };

type Vec = { x: number; z: number };

const add = (a: Vec, b: Vec, scale = 1): Vec => ({ x: a.x + b.x * scale, z: a.z + b.z * scale });
const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, z: a.z - b.z });
const length = (a: Vec) => Math.hypot(a.x, a.z);

/** Where two circles cross: the two points, the one on the left of the line from the first centre to the second first. */
function circleCrossings(c1: Vec, r1: number, c2: Vec, r2: number): [Vec, Vec] {
  const d = length(sub(c2, c1));
  const along = (d * d + r1 * r1 - r2 * r2) / (2 * d);
  const across = Math.sqrt(Math.max(0, r1 * r1 - along * along));
  const unit = { x: (c2.x - c1.x) / d, z: (c2.z - c1.z) / d };
  const foot = add(c1, unit, along);
  const normal = { x: -unit.z, z: unit.x };
  return [add(foot, normal, across), add(foot, normal, -across)];
}

function arcBetween(centre: Vec, radius: number, from: Vec, to: Vec): PulleyArc {
  const start = Math.atan2(from.z - centre.z, from.x - centre.x);
  let delta = Math.atan2(to.z - centre.z, to.x - centre.x) - start;
  // Every arc of the outline is less than half a turn.
  while (delta > Math.PI) delta -= 2 * Math.PI;
  while (delta < -Math.PI) delta += 2 * Math.PI;
  return { cx: centre.x, cz: centre.z, radius, start, end: start + delta };
}

/**
 * The outline of the toothed band as true arcs, in order with rising angle from the left end of the
 * first groove's fillet (groove 0 is centred on +x): per groove fillet, flank, tip, flank, fillet,
 * then the land on the outside circle to the next groove.
 */
export function pulleyToothArcs(measures: Pick<PulleyMeasures, "teeth" | "outsideRadius">): PulleyArc[] {
  const { teeth, outsideRadius: R } = measures;
  const origin = { x: 0, z: 0 };
  const grooves = Array.from({ length: teeth }, (_, index) => {
    const angle = (index * 2 * Math.PI) / teeth;
    const out = { x: Math.cos(angle), z: Math.sin(angle) };
    const across = { x: -out.z, z: out.x };
    const local = (a: number, b: number) => add(add({ x: R * out.x, z: R * out.z }, across, a), out, b);
    const tip = local(0, -(GT2_GROOVE_DEPTH - GT2_TIP_RADIUS));
    // The flank on the side towards the next groove (a > 0) is the circle centred 0.4 mm back across the middle.
    const side = (sign: 1 | -1) => {
      const flank = local(-sign * GT2_FLANK_OFFSET, 0);
      const crossings = circleCrossings(origin, R - GT2_FILLET_RADIUS, flank, GT2_FLANK_RADIUS + GT2_FILLET_RADIUS);
      const across0 = (point: Vec) => (point.x - R * out.x) * across.x + (point.z - R * out.z) * across.z;
      const fillet = sign > 0 ? (across0(crossings[0]) > across0(crossings[1]) ? crossings[0] : crossings[1]) : (across0(crossings[0]) < across0(crossings[1]) ? crossings[0] : crossings[1]);
      const land = { x: (fillet.x * R) / length(fillet), z: (fillet.z * R) / length(fillet) };
      const toFillet = sub(fillet, flank);
      const filletFlank = add(flank, toFillet, GT2_FLANK_RADIUS / length(toFillet));
      const toTip = sub(tip, flank);
      const flankTip = add(flank, toTip, GT2_FLANK_RADIUS / length(toTip));
      return { flank, fillet, land, filletFlank, flankTip };
    };
    return { tip, left: side(-1), right: side(1) };
  });
  const arcs: PulleyArc[] = [];
  grooves.forEach((groove, index) => {
    const { left, right, tip } = groove;
    arcs.push(arcBetween(left.fillet, GT2_FILLET_RADIUS, left.land, left.filletFlank));
    arcs.push(arcBetween(left.flank, GT2_FLANK_RADIUS, left.filletFlank, left.flankTip));
    arcs.push(arcBetween(tip, GT2_TIP_RADIUS, left.flankTip, right.flankTip));
    arcs.push(arcBetween(right.flank, GT2_FLANK_RADIUS, right.flankTip, right.filletFlank));
    arcs.push(arcBetween(right.fillet, GT2_FILLET_RADIUS, right.filletFlank, right.land));
    arcs.push(arcBetween(origin, R, right.land, grooves[(index + 1) % teeth].left.land));
  });
  return arcs;
}

/** The point of an arc at the given angle. */
export function pulleyArcPoint(arc: Pick<PulleyArc, "cx" | "cz" | "radius">, angle: number): Vec {
  return { x: arc.cx + arc.radius * Math.cos(angle), z: arc.cz + arc.radius * Math.sin(angle) };
}

/** The outline as points, each arc in steps of at most `step` radians (its end is the next arc's start). */
function sampleArcs(arcs: PulleyArc[], step: number) {
  const points: Vec[] = [];
  for (const arc of arcs) {
    const count = Math.max(1, Math.ceil(Math.abs(arc.end - arc.start) / step));
    for (let index = 0; index < count; index += 1) points.push(pulleyArcPoint(arc, arc.start + ((arc.end - arc.start) * index) / count));
  }
  return points;
}

function circlePoints(radius: number, sides: number) {
  return Array.from({ length: sides }, (_, index) => {
    const angle = (index / sides) * Math.PI * 2;
    return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius };
  });
}

/**
 * The display mesh: a stack of prisms - flange, toothed band, flange, hub - each with its wall, the
 * ring between two neighbours as a flat face up or down, the bore's wall through all of them and the
 * two ends. Every ring is drawn once per height and shared by the faces that meet there, so the mesh
 * is closed.
 */
export function createPulleyGeometry(shape: PulleySource) {
  const measures = pulleyMeasures(shape);
  const { flange, beltWidth, hubHeight, flangeRadius, hubRadius, boreRadius, height } = measures;
  const teethRing = sampleArcs(pulleyToothArcs(measures), (6 * Math.PI) / 180);
  const sides = Math.max(96, measures.teeth * 4);
  const flangeRing = circlePoints(flangeRadius, sides);
  const hubRing = circlePoints(hubRadius, sides);
  const boreRing = boreRadius > 0 ? circlePoints(boreRadius, Math.max(48, Math.round(sides / 2))) : null;
  // `radius`: how far out a level reaches, the teeth to the outside circle.
  type Level = { ring: Vec[]; bottom: number; top: number; radius: number };
  const levels: Level[] = [];
  if (flange > 0) levels.push({ ring: flangeRing, bottom: 0, top: flange, radius: flangeRadius });
  levels.push({ ring: teethRing, bottom: flange, top: flange + beltWidth, radius: measures.outsideRadius });
  if (flange > 0) levels.push({ ring: flangeRing, bottom: flange + beltWidth, top: 2 * flange + beltWidth, radius: flangeRadius });
  if (hubHeight > 0) levels.push({ ring: hubRing, bottom: 2 * flange + beltWidth, top: height, radius: hubRadius });

  const positions: number[] = [];
  const indices: number[] = [];
  const placeRing = (ring: Vec[], y: number) => {
    const first = positions.length / 3;
    for (const point of ring) positions.push(point.x, y, point.z);
    return first;
  };
  // A wall between two copies of a ring; outward for an outline, inward for the bore.
  const wall = (ring: Vec[], bottom: number, top: number, inward: boolean) => {
    const low = placeRing(ring, bottom);
    const high = placeRing(ring, top);
    ring.forEach((_, point) => {
      const next = (point + 1) % ring.length;
      const a = low + point;
      const b = low + next;
      const c = high + point;
      const d = high + next;
      if (!inward) indices.push(a, c, d, a, d, b);
      else indices.push(a, b, d, a, d, c);
    });
    return { low, high };
  };
  // A flat face: the outline `outer` (its first index `outerAt`) less the `inner` one, facing up or down.
  const cap = (outer: Vec[], outerAt: number, inner: Vec[] | null, innerAt: number, up: boolean) => {
    const triangles = THREE.ShapeUtils.triangulateShape(outer.map((point) => new THREE.Vector2(point.x, point.z)), inner ? [inner.map((point) => new THREE.Vector2(point.x, point.z))] : []);
    const vertex = (index: number) => (index < outer.length ? outerAt + index : innerAt + index - outer.length);
    const pointOf = (index: number) => (index < outer.length ? outer[index] : (inner as Vec[])[index - outer.length]);
    for (const [a, b, c] of triangles) {
      const pa = pointOf(a);
      const pb = pointOf(b);
      const pc = pointOf(c);
      const facesUp = (pb.z - pa.z) * (pc.x - pa.x) - (pb.x - pa.x) * (pc.z - pa.z) > 0;
      indices.push(vertex(a), ...(facesUp === up ? [vertex(b), vertex(c)] : [vertex(c), vertex(b)]));
    }
  };

  const walls = levels.map((level) => wall(level.ring, level.bottom, level.top, false));
  const bore = boreRing ? wall(boreRing, 0, height, true) : null;
  // The two ends, round the bore.
  cap(levels[0].ring, walls[0].low, boreRing, bore ? bore.low : 0, false);
  const last = levels.length - 1;
  cap(levels[last].ring, walls[last].high, boreRing, bore ? bore.high : 0, true);
  // Between two levels: the wider one's ring less the narrower one's, facing away from the narrower.
  for (let index = 0; index < last; index += 1) {
    const below = levels[index];
    const above = levels[index + 1];
    // A hub as wide as the flange under it leaves no step.
    if (Math.abs(below.radius - above.radius) < 1e-9) continue;
    // The teeth always lie inside a flange; a hub on the teeth stays inside their roots, one on a flange within the flange.
    if (below.radius > above.radius) cap(below.ring, walls[index].high, above.ring, walls[index + 1].low, true);
    else cap(above.ring, walls[index + 1].low, below.ring, walls[index].high, false);
  }
  const indexed = new THREE.BufferGeometry();
  indexed.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  indexed.setIndex(indices);
  const geometry = toCreasedNormals(indexed, THREE.MathUtils.degToRad(12));
  indexed.dispose();
  geometry.computeBoundingBox();
  return geometry;
}
