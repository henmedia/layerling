import * as THREE from "three";
import { toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { GearProfile, GearType, WorkplaneShape } from "@/types/layerling";

export const DEFAULT_GEAR_TEETH = 12;
export const DEFAULT_GEAR_TOOTH_SIZE = 2.5;
export const DEFAULT_GEAR_CENTER_HOLE_SIZE = 6;
export const DEFAULT_GEAR_TYPE: GearType = "spur";
export const DEFAULT_GEAR_HELIX_ANGLE = 22.5;
export const DEFAULT_GEAR_HELIX_QUALITY = 16;
export const MIN_GEAR_TEETH = 6;
export const MAX_GEAR_TEETH = 64;
export const MIN_GEAR_HELIX_ANGLE = -45;
export const MAX_GEAR_HELIX_ANGLE = 45;
export const MIN_GEAR_HELIX_QUALITY = 4;
export const MAX_GEAR_HELIX_QUALITY = 32;
/** Ein Kegelrad ist oben um diesen Faktor kleiner als am Fuss, zur Achse hin. */
export const BEVEL_GEAR_TOP_SCALE = 0.68;
/** Involute teeth (#201): the standard 20° pressure angle, and the play a printed pair needs. */
export const DEFAULT_GEAR_PRESSURE_ANGLE = 20;
export const MIN_GEAR_PRESSURE_ANGLE = 14.5;
export const MAX_GEAR_PRESSURE_ANGLE = 30;
export const DEFAULT_GEAR_BACKLASH = 0.2;
/** New involute gears start at this module. */
export const DEFAULT_GEAR_MODULE = 2;
export const MAX_GEAR_BACKLASH = 2;
/** Ring gear (#201): the rim outside its teeth, in mm. */
export const DEFAULT_GEAR_RIM = 3;
export const MIN_GEAR_RIM = 0.5;
export const MAX_GEAR_RIM = 60;
/** Points along one involute flank of the drawn outline; the exact body takes the true curve. */
const INVOLUTE_FLANK_STEPS = 5;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** A gear saved before involute teeth (#201) has no profile and keeps its straight teeth. */
export function normalizeGearProfile(value?: string): GearProfile {
  return value === "involute" || value === "round" ? value : "simple";
}

/**
 * Involute and round teeth (#201) are set by module and number of teeth: the outside diameter is
 * module x (teeth + 2), gears with the same module mesh, backlash applies. Simple teeth are not.
 */
export function gearUsesModule(value?: string) {
  return normalizeGearProfile(value) !== "simple";
}

export function normalizeGearPressureAngle(value?: number) {
  return clamp(Number.isFinite(value) ? value as number : DEFAULT_GEAR_PRESSURE_ANGLE, MIN_GEAR_PRESSURE_ANGLE, MAX_GEAR_PRESSURE_ANGLE);
}

/**
 * Round teeth stand lower than involute ones: a module above the pitch circle they would bulge
 * at their foot, wider there than at the gap's mouth. The tip sits this many modules above it,
 * the root this many below.
 */
export const ROUND_GEAR_ADDENDUM = 0.6;
export const ROUND_GEAR_DEDENDUM = 0.85;

/** How many modules a tooth stands above the pitch line: one for involute teeth, 0.6 for round ones. */
export function gearAddendum(profile?: string) {
  return normalizeGearProfile(profile) === "round" ? ROUND_GEAR_ADDENDUM : 1;
}

/** How many modules the root lies below the pitch line: 1.25 for involute teeth, 0.85 for round ones. */
export function gearDedendum(profile?: string) {
  return normalizeGearProfile(profile) === "round" ? ROUND_GEAR_DEDENDUM : 1.25;
}

/** How many modules the outside diameter adds to the teeth: 2 for involute teeth, 1.2 for round ones. */
function gearDiameterTeethOffset(profile?: string) {
  return 2 * gearAddendum(profile);
}

/** The module of a gear set by module: its outside diameter is module x (teeth + 2), round teeth module x (teeth + 1.2). */
export function involuteGearModule(width: number, depth: number, teeth?: number, profile?: string) {
  return Math.max(0.01, Math.min(width, depth)) / (normalizeGearTeeth(teeth) + gearDiameterTeethOffset(profile));
}

/** The outside diameter for a module and a number of teeth - the gear's width and length. */
export function involuteGearDiameter(module: number, teeth?: number, profile?: string) {
  return Math.max(0.001, module) * (normalizeGearTeeth(teeth) + gearDiameterTeethOffset(profile));
}

/**
 * Ring gear (#201): its teeth point in, and its outside diameter is the root circle of those
 * teeth plus the rim on both sides - module x (teeth + 2 x dedendum) + 2 x rim. The module
 * follows from the diameter, as with the other gears.
 */
export function internalGearModule(width: number, depth: number, teeth?: number, rim?: number, profile?: string) {
  return Math.max(0.01, Math.min(width, depth) - 2 * normalizeGearRim(rim)) / (normalizeGearTeeth(teeth) + 2 * gearDedendum(profile));
}

export function internalGearDiameter(module: number, teeth?: number, rim?: number, profile?: string) {
  return Math.max(0.001, module) * (normalizeGearTeeth(teeth) + 2 * gearDedendum(profile)) + 2 * normalizeGearRim(rim);
}

/** Rack (#201): its length is teeth x pitch, the pitch π x module, so racks of one module line up end to end. */
export function rackModule(width: number, teeth?: number) {
  return Math.max(0.01, width) / (Math.PI * normalizeGearTeeth(teeth));
}

export function rackLength(module: number, teeth?: number) {
  return Math.PI * Math.max(0.001, module) * normalizeGearTeeth(teeth);
}

/** From a rack's tooth tips to its root line. */
export function rackToothHeight(module: number, profile?: string) {
  return module * (gearAddendum(profile) + gearDedendum(profile));
}

/** The least depth a rack can have: its teeth and half a millimetre of bar behind them. */
export function rackMinDepth(module: number, profile?: string) {
  return rackToothHeight(module, profile) + MIN_GEAR_RIM;
}

type GearModuleShape = Pick<WorkplaneShape, "width" | "teeth" | "gearType" | "gearProfile" | "gearRim"> & { depth?: number };

/** The module of any gear set by module: spur, helical and bevel gear, ring gear and rack. */
export function gearModuleOf(shape: GearModuleShape) {
  const profile = gearToothProfile(shape);
  const depth = shape.depth ?? shape.width;
  switch (normalizeGearType(shape.gearType)) {
    case "rack": return rackModule(shape.width, shape.teeth);
    case "internal": return internalGearModule(shape.width, depth, shape.teeth, shape.gearRim, profile);
    default: return involuteGearModule(shape.width, depth, shape.teeth, profile);
  }
}

/**
 * Width and depth of a gear of this module and these teeth: gears and ring gears are round, a
 * rack is as long as its teeth and keeps its depth, at least its teeth and a little bar.
 */
export function gearSizeForModule(module: number, shape: GearModuleShape, teeth = shape.teeth) {
  const profile = gearToothProfile(shape);
  switch (normalizeGearType(shape.gearType)) {
    case "rack": return { width: rackLength(module, teeth), depth: Math.max(shape.depth ?? 0, rackMinDepth(module, profile)) };
    case "internal": {
      const diameter = internalGearDiameter(module, teeth, shape.gearRim, profile);
      return { width: diameter, depth: diameter };
    }
    default: {
      const diameter = involuteGearDiameter(module, teeth, profile);
      return { width: diameter, depth: diameter };
    }
  }
}

/** Backlash is the play of a meshing pair, half taken off each gear's teeth; at most half a module. */
export function normalizeGearBacklash(value: number | undefined, module: number) {
  return clamp(Number.isFinite(value) ? value as number : DEFAULT_GEAR_BACKLASH, 0, Math.min(MAX_GEAR_BACKLASH, module * 0.5));
}

/** Centre distance of two meshing involute gears with the same module. */
export function involuteCentreDistance(module: number, teethA: number, teethB: number) {
  return (module * (normalizeGearTeeth(teethA) + normalizeGearTeeth(teethB))) / 2;
}

type GearPairShape = Pick<WorkplaneShape, "kind" | "gearProfile" | "gearType" | "gearRim" | "teeth" | "size" | "width" | "depth" | "x" | "z">;

/**
 * Two selected involute gears (#201): the centre distance they mesh at and how far apart their
 * centres stand now, or the two modules when those differ. A ring gear and a pinion inside it
 * mesh at module x (teeth - pinion teeth) / 2; `internal` says so. Null for anything else -
 * two ring gears, or a rack, whose place is a line, not a centre.
 */
export function involuteGearPair(a: GearPairShape, b: GearPairShape) {
  // Round teeth mesh with round ones, involute with involute.
  const byModule = (shape: GearPairShape) => shape.kind === "gear" && gearUsesModule(gearToothProfile(shape)) && normalizeGearType(shape.gearType) !== "rack";
  if (!byModule(a) || !byModule(b) || gearToothProfile(a) !== gearToothProfile(b)) return null;
  const isRing = (shape: GearPairShape) => normalizeGearType(shape.gearType) === "internal";
  if (isRing(a) && isRing(b)) return null;
  const moduleOf = (shape: GearPairShape) => gearModuleOf({ ...shape, width: shape.width ?? shape.size, depth: shape.depth ?? shape.size });
  const modules = [moduleOf(a), moduleOf(b)] as const;
  const current = Math.hypot(a.x - b.x, a.z - b.z);
  const internal = isRing(a) || isRing(b);
  if (Math.abs(modules[0] - modules[1]) > 1e-3 * Math.max(modules[0], modules[1])) return { modules, current, distance: null, internal };
  const teethA = normalizeGearTeeth(a.teeth);
  const teethB = normalizeGearTeeth(b.teeth);
  if (internal) {
    const [ring, pinion] = isRing(a) ? [teethA, teethB] : [teethB, teethA];
    return { modules, current, distance: (modules[0] * Math.max(0, ring - pinion)) / 2, internal };
  }
  return { modules, current, distance: involuteCentreDistance(modules[0], teethA, teethB), internal };
}

/** inv(a) = tan a - a, the angle an involute has turned through at pressure angle a. */
function involuteFunction(angle: number) {
  return Math.tan(angle) - angle;
}

export type InvoluteGearMeasures = {
  teeth: number;
  module: number;
  pitchRadius: number;
  baseRadius: number;
  tipRadius: number;
  rootRadius: number;
  /** Where the involute starts: the base circle, or the root circle when that lies outside it. */
  flankRadius: number;
  /** Turn of a flank's involute from the tooth's centre line, at the base circle. */
  flankTurn: number;
  /** Roll angles of the involute where the flank starts and where it meets the tip. */
  rollStart: number;
  rollEnd: number;
};

/**
 * The standard involute tooth (#201) for a gear of `width` x `depth`: tip at module x
 * (teeth + 2), root a quarter module deeper than one module below the pitch circle, the
 * tooth thinned by half the backlash on the pitch circle. Below the base circle the flank
 * runs straight down to the root, as many generators draw it.
 */
export function involuteGearMeasures(width: number, depth: number, options: Pick<WorkplaneShape, "teeth" | "gearPressureAngle" | "gearBacklash">): InvoluteGearMeasures {
  const teeth = normalizeGearTeeth(options.teeth);
  const module = involuteGearModule(width, depth, teeth);
  const pressure = THREE.MathUtils.degToRad(normalizeGearPressureAngle(options.gearPressureAngle));
  const backlash = normalizeGearBacklash(options.gearBacklash, module);
  const pitchRadius = (module * teeth) / 2;
  return involuteMeasuresFor(teeth, module, pressure, (Math.PI * module) / 2 - backlash / 2, pitchRadius + module, Math.max(pitchRadius * 0.2, pitchRadius - 1.25 * module));
}

export type InternalGearMeasures = InvoluteGearMeasures & {
  /** The rim outside the teeth, and the radius of its outer edge - the ring's outside. */
  rim: number;
  rimRadius: number;
};

/**
 * A ring gear (#201): involute teeth pointing in. Its gaps are the teeth of a gear turned inside
 * out - half a pitch plus half the backlash thick on the pitch circle, reaching out to the ring's
 * root a dedendum beyond it and in to the ring's tips a module inside it - so its outline is that
 * gear's, drawn by the same corners and curves. A pinion of the same module runs in it at a centre
 * distance of module x (teeth - pinion teeth) / 2. Where a tip lies inside the base circle, its
 * flank runs straight in, as the external root does.
 */
export function internalGearMeasures(width: number, depth: number, options: Pick<WorkplaneShape, "teeth" | "gearPressureAngle" | "gearBacklash" | "gearRim">): InternalGearMeasures {
  const teeth = normalizeGearTeeth(options.teeth);
  const rim = normalizeGearRim(options.gearRim);
  const module = internalGearModule(width, depth, teeth, rim, "involute");
  const pressure = THREE.MathUtils.degToRad(normalizeGearPressureAngle(options.gearPressureAngle));
  const backlash = normalizeGearBacklash(options.gearBacklash, module);
  const pitchRadius = (module * teeth) / 2;
  const rootRadius = pitchRadius + 1.25 * module;
  // The tips a module inside the pitch circle - unless the base circle lies just outside them:
  // the straight piece from tip to base circle would be a sliver of an edge no fillet takes, so
  // the tips stop at the base circle then, at most a quarter module short.
  let tipRadius = Math.max(pitchRadius * 0.2, pitchRadius - module);
  const baseRadius = pitchRadius * Math.cos(pressure);
  if (baseRadius > tipRadius && baseRadius - tipRadius < 0.25 * module) tipRadius = baseRadius;
  const measures = involuteMeasuresFor(teeth, module, pressure, (Math.PI * module) / 2 + backlash / 2, rootRadius, tipRadius);
  return { ...measures, rim, rimRadius: rootRadius + rim };
}

/**
 * The involute measures for a tooth `thickness` wide on the pitch circle, with its tip and root
 * on the given circles; a ring gear passes its gaps here as teeth.
 */
function involuteMeasuresFor(teeth: number, module: number, pressure: number, thickness: number, requestedTipRadius: number, rootRadius: number): InvoluteGearMeasures {
  const pitchRadius = (module * teeth) / 2;
  const baseRadius = pitchRadius * Math.cos(pressure);
  const flankRadius = Math.max(baseRadius, rootRadius);
  // Half the tooth's angle on the pitch circle, carried back to the base circle.
  const flankTurn = thickness / (2 * pitchRadius) + involuteFunction(pressure);
  const roll = (radius: number) => Math.sqrt(Math.max(0, (radius / baseRadius) ** 2 - 1));
  // The two flanks meet where the turn is used up; the tip stops short of that point.
  let tipRadius = requestedTipRadius;
  const turnAt = (radius: number) => flankTurn - (roll(radius) - Math.atan(roll(radius)));
  if (turnAt(tipRadius) < flankTurn * 0.08) {
    let low = flankRadius;
    let high = tipRadius;
    for (let step = 0; step < 50; step += 1) {
      const middle = (low + high) / 2;
      if (turnAt(middle) < flankTurn * 0.08) high = middle;
      else low = middle;
    }
    tipRadius = low;
  }
  return { teeth, module, pitchRadius, baseRadius, tipRadius, rootRadius, flankRadius, flankTurn, rollStart: roll(flankRadius), rollEnd: roll(tipRadius) };
}

/**
 * A point of a flank and its derivative by the roll angle `roll`, for the tooth centred at
 * `centre` (radians from +x towards +z); `side` -1 is the flank before the centre, +1 the one
 * after it. The involute unwinds from the base circle away from the tooth's centre line.
 */
export function involuteFlankPoint(measures: InvoluteGearMeasures, centre: number, side: -1 | 1, roll: number) {
  const { baseRadius, flankTurn } = measures;
  const turn = centre + side * flankTurn;
  // The involute of the base circle, unwinding towards smaller angles for side +1.
  const localX = baseRadius * (Math.cos(roll) + roll * Math.sin(roll));
  const localZ = -side * baseRadius * (Math.sin(roll) - roll * Math.cos(roll));
  const dLocalX = baseRadius * roll * Math.cos(roll);
  const dLocalZ = -side * baseRadius * roll * Math.sin(roll);
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  return {
    x: localX * cos - localZ * sin,
    z: localX * sin + localZ * cos,
    dx: dLocalX * cos - dLocalZ * sin,
    dz: dLocalX * sin + dLocalZ * cos,
  };
}

/** The angle of a flank point from +x towards +z at a radius, as the corners list it. */
function involuteFlankAngle(measures: InvoluteGearMeasures, centre: number, side: -1 | 1, radius: number) {
  const roll = Math.sqrt(Math.max(0, (Math.max(radius, measures.baseRadius) / measures.baseRadius) ** 2 - 1));
  return centre + side * (measures.flankTurn - (roll - Math.atan(roll)));
}

/** The centre angle of tooth `index`, as the straight teeth are laid out. */
export function involuteToothCentre(teeth: number, index: number) {
  return ((index + 0.5) / teeth) * Math.PI * 2;
}

/** The involute outline as corners on circles, for the display mesh and the helical body. */
function involuteOutlineCorners(measures: InvoluteGearMeasures) {
  const { teeth, rootRadius, flankRadius, tipRadius, rollStart, rollEnd, baseRadius } = measures;
  const corners: Array<{ angle: number; radiusX: number; radiusZ: number }> = [];
  const push = (angle: number, radius: number) => corners.push({ angle, radiusX: radius, radiusZ: radius });
  const radii = Array.from({ length: INVOLUTE_FLANK_STEPS + 1 }, (_, step) => {
    const roll = rollStart + ((rollEnd - rollStart) * step) / INVOLUTE_FLANK_STEPS;
    return baseRadius * Math.sqrt(1 + roll * roll);
  });
  radii[0] = flankRadius;
  radii[radii.length - 1] = tipRadius;
  const radial = rootRadius < flankRadius - 1e-9;
  for (let tooth = 0; tooth < teeth; tooth += 1) {
    const centre = involuteToothCentre(teeth, tooth);
    if (radial) push(involuteFlankAngle(measures, centre, -1, flankRadius), rootRadius);
    for (const radius of radii) push(involuteFlankAngle(measures, centre, -1, radius), radius);
    push(centre, tipRadius);
    for (const radius of [...radii].reverse()) push(involuteFlankAngle(measures, centre, 1, radius), radius);
    if (radial) push(involuteFlankAngle(measures, centre, 1, flankRadius), rootRadius);
    push(centre + Math.PI / teeth, rootRadius);
  }
  return corners;
}

/**
 * The longest step along an arc of a round tooth in the drawn outline, in radians: below the 12°
 * the mesh's normals and edge lines break at, so the flanks look smooth. The exact body takes the
 * true arcs.
 */
const ROUND_ARC_STEP = (11 * Math.PI) / 180;

/**
 * A round wave round a circle (#201): `teeth` convex arcs over the tips and as many concave arcs
 * over the roots between them, each touching the next smoothly. Round gear teeth and the round
 * knurl are both one.
 */
export type RoundWave = {
  teeth: number;
  tipRadius: number;
  rootRadius: number;
  /** The tooth's arc: its centre's distance from the axis, on the tooth's centre line, and its radius. */
  toothCentre: number;
  toothRadius: number;
  /** The gap's arc, on the gap's centre line half a pitch further on. */
  gapCentre: number;
  gapRadius: number;
  /** The angle of the first tooth's centre line, from +x towards +z. */
  firstCentre: number;
};

export type RoundGearMeasures = RoundWave & {
  module: number;
  pitchRadius: number;
};

/**
 * The round wave with its tips on `tipRadius`, its roots on `rootRadius`, and each tooth
 * `halfThickness` (an angle from its centre line) wide on each side where it crosses `midRadius`.
 * Two arcs per pitch cannot stand deeper than about half a pitch without bulging at the foot -
 * the callers keep their teeth lower than that.
 */
export function roundWave(teeth: number, tipRadius: number, rootRadius: number, midRadius: number, halfThickness: number, firstCentre: number): RoundWave {
  const half = Math.PI / teeth;
  const gapCos = Math.cos(half);
  const gapSin = Math.sin(half);
  // For a tooth arc of radius rt: the gap arc that touches it, found by halving.
  const gapFor = (toothRadius: number) => {
    const toothCentre = tipRadius - toothRadius;
    const miss = (gapRadius: number) => {
      const centre = rootRadius + gapRadius;
      return Math.hypot(centre * gapCos - toothCentre, centre * gapSin) - toothRadius - gapRadius;
    };
    let low = 0;
    let high = tipRadius * 4;
    if (miss(low) <= 0 || miss(high) >= 0) return null;
    for (let step = 0; step < 60; step += 1) {
      const middle = (low + high) / 2;
      if (miss(middle) > 0) low = middle;
      else high = middle;
    }
    return { toothCentre, gapRadius: low, gapCentre: rootRadius + low };
  };
  // How thick the tooth is on the middle circle, as the angle from its centre line.
  const thickness = (toothRadius: number) => {
    const gap = gapFor(toothRadius);
    if (!gap) return null;
    const { toothCentre, gapCentre, gapRadius } = gap;
    const towards = toothRadius / (toothRadius + gapRadius);
    const touchX = toothCentre + (gapCentre * gapCos - toothCentre) * towards;
    const touchZ = gapCentre * gapSin * towards;
    const angleAt = (centre: number, radius: number) => Math.acos(clamp((midRadius ** 2 + centre ** 2 - radius ** 2) / (2 * midRadius * centre), -1, 1));
    return Math.hypot(touchX, touchZ) <= midRadius ? angleAt(toothCentre, toothRadius) : half - angleAt(gapCentre, gapRadius);
  };
  const depth = Math.max(1e-6, tipRadius - rootRadius);
  let low = depth * 0.02;
  let high = depth;
  for (let step = 0; step < 60; step += 1) {
    const middle = (low + high) / 2;
    const at = thickness(middle);
    if (at !== null && at < halfThickness) low = middle;
    else high = middle;
  }
  const gap = gapFor(low) ?? { toothCentre: tipRadius - low, gapRadius: depth * 0.02, gapCentre: rootRadius + depth * 0.02 };
  return { teeth, tipRadius, rootRadius, toothCentre: gap.toothCentre, toothRadius: low, gapCentre: gap.gapCentre, gapRadius: gap.gapRadius, firstCentre };
}

/**
 * Round teeth (#201, like Tinkercad's Useful gear): each tooth one convex arc, each gap one
 * concave arc, every arc running smoothly into the next. The tip sits ROUND_GEAR_ADDENDUM modules
 * above the pitch circle, the root ROUND_GEAR_DEDENDUM below it - a quarter module of room for the
 * other gear's tip - and the tooth is as thick on the pitch circle as half a pitch less half the
 * backlash, so round gears with the same module mesh. Forgiving to print small, and a smooth grip
 * on a knob.
 */
export function roundGearMeasures(width: number, depth: number, options: Pick<WorkplaneShape, "teeth" | "gearBacklash">): RoundGearMeasures {
  const teeth = normalizeGearTeeth(options.teeth);
  const module = involuteGearModule(width, depth, teeth, "round");
  const backlash = normalizeGearBacklash(options.gearBacklash, module);
  const pitchRadius = (module * teeth) / 2;
  const tipRadius = pitchRadius + ROUND_GEAR_ADDENDUM * module;
  const rootRadius = Math.max(pitchRadius * 0.2, pitchRadius - ROUND_GEAR_DEDENDUM * module);
  const halfThickness = Math.PI / teeth / 2 - backlash / (4 * pitchRadius);
  const wave = roundWave(teeth, tipRadius, rootRadius, pitchRadius, halfThickness, involuteToothCentre(teeth, 0));
  return { ...wave, module, pitchRadius };
}

export type RoundInternalMeasures = RoundGearMeasures & { rim: number; rimRadius: number };

/**
 * A ring gear with round teeth (#201): the round wave of a gear turned inside out, its tips on
 * the ring's root circle - a dedendum beyond the pitch circle - and its roots on the ring's tip
 * circle an addendum inside it, each gap half a pitch plus half the backlash wide.
 */
export function roundInternalMeasures(width: number, depth: number, options: Pick<WorkplaneShape, "teeth" | "gearBacklash" | "gearRim">): RoundInternalMeasures {
  const teeth = normalizeGearTeeth(options.teeth);
  const rim = normalizeGearRim(options.gearRim);
  const module = internalGearModule(width, depth, teeth, rim, "round");
  const backlash = normalizeGearBacklash(options.gearBacklash, module);
  const pitchRadius = (module * teeth) / 2;
  const rootRadius = pitchRadius + ROUND_GEAR_DEDENDUM * module;
  const tipRadius = Math.max(pitchRadius * 0.2, pitchRadius - ROUND_GEAR_ADDENDUM * module);
  const halfThickness = Math.PI / teeth / 2 + backlash / (4 * pitchRadius);
  const wave = roundWave(teeth, rootRadius, tipRadius, pitchRadius, halfThickness, involuteToothCentre(teeth, 0));
  return { ...wave, module, pitchRadius, rim, rimRadius: rootRadius + rim };
}

/**
 * The two arcs of round tooth `index`, as angles about their own centres (radians from +x towards
 * +z): the tooth arc from its left touch point over the tip to its right one, then the gap arc from
 * there over the root to the next tooth's left touch point.
 */
export function roundToothArcs(measures: RoundWave, index: number) {
  const { teeth, toothCentre, toothRadius, gapCentre, gapRadius } = measures;
  const centre = measures.firstCentre + (index / teeth) * Math.PI * 2;
  const half = Math.PI / teeth;
  const gapX = gapCentre * Math.cos(half);
  const gapZ = gapCentre * Math.sin(half);
  const towards = toothRadius / (toothRadius + gapRadius);
  const touchX = toothCentre + (gapX - toothCentre) * towards;
  const touchZ = gapZ * towards;
  // About the tooth's centre the right touch point lies at +reach, the left one mirrored.
  const reach = Math.atan2(touchZ, touchX - toothCentre);
  // About the gap's centre: from the touch point round over the root (which faces the axis) to its mirror.
  let gapStart = Math.atan2(touchZ - gapZ, touchX - gapX);
  const root = half + Math.PI;
  while (gapStart < root - Math.PI) gapStart += Math.PI * 2;
  while (gapStart >= root + Math.PI) gapStart -= Math.PI * 2;
  const turn = (x: number, z: number) => ({ x: x * Math.cos(centre) - z * Math.sin(centre), z: x * Math.sin(centre) + z * Math.cos(centre) });
  return {
    tooth: { ...turn(toothCentre, 0), radius: toothRadius, start: centre - reach, end: centre + reach },
    gap: { ...turn(gapX, gapZ), radius: gapRadius, start: centre + gapStart, end: centre + 2 * root - gapStart },
  };
}

/** The round outline as corners on circles, for the display mesh and the helical body. */
export function roundWaveCorners(measures: RoundWave) {
  const corners: Array<{ angle: number; radiusX: number; radiusZ: number }> = [];
  const push = (x: number, z: number) => {
    const radius = Math.hypot(x, z);
    corners.push({ angle: Math.atan2(z, x), radiusX: radius, radiusZ: radius });
  };
  for (let tooth = 0; tooth < measures.teeth; tooth += 1) {
    const arcs = roundToothArcs(measures, tooth);
    // An even count puts a corner on the tip and on the root, so the outline spans its frame.
    const steps = (span: number) => 2 * Math.max(1, Math.ceil(Math.abs(span) / (2 * ROUND_ARC_STEP)));
    const toothSteps = steps(arcs.tooth.end - arcs.tooth.start);
    const gapSteps = steps(arcs.gap.end - arcs.gap.start);
    for (let step = 0; step <= toothSteps; step += 1) {
      const angle = arcs.tooth.start + ((arcs.tooth.end - arcs.tooth.start) * step) / toothSteps;
      push(arcs.tooth.x + arcs.tooth.radius * Math.cos(angle), arcs.tooth.z + arcs.tooth.radius * Math.sin(angle));
    }
    for (let step = 1; step < gapSteps; step += 1) {
      const angle = arcs.gap.start + ((arcs.gap.end - arcs.gap.start) * step) / gapSteps;
      push(arcs.gap.x + arcs.gap.radius * Math.cos(angle), arcs.gap.z + arcs.gap.radius * Math.sin(angle));
    }
  }
  // Angles keep rising round the ring, as the straight and involute corners do.
  for (let index = 1; index < corners.length; index += 1) {
    while (corners[index].angle < corners[index - 1].angle - Math.PI) corners[index].angle += Math.PI * 2;
  }
  return corners;
}

export type InternalGearOptions = Pick<WorkplaneShape, "teeth" | "gearProfile" | "gearPressureAngle" | "gearBacklash" | "gearRim">;

/**
 * The ring gear's teeth as corners round its inside (angles rising from +x towards +z, as every
 * gear's corners do), its rim's outer radius, and how the ring is stretched to width x depth: by
 * that rim circle, as involute gears are by their tip circle.
 */
export function internalGearOutline(width: number, depth: number, options: InternalGearOptions) {
  const safeWidth = Math.max(0.01, width);
  const safeDepth = Math.max(0.01, depth);
  const round = normalizeGearProfile(options.gearProfile) === "round";
  const measures = round ? roundInternalMeasures(safeWidth, safeDepth, options) : internalGearMeasures(safeWidth, safeDepth, options);
  const corners = round ? roundWaveCorners(measures as RoundInternalMeasures) : involuteOutlineCorners(measures as InternalGearMeasures);
  return { corners, rimRadius: measures.rimRadius, module: measures.module, stretch: { x: safeWidth / (2 * measures.rimRadius), z: safeDepth / (2 * measures.rimRadius) } };
}

export type RackOptions = Pick<WorkplaneShape, "teeth" | "gearProfile" | "gearPressureAngle" | "gearBacklash">;

export type RackMeasures = {
  teeth: number;
  module: number;
  pitch: number;
  /** The bar: along x, its teeth towards +z. */
  length: number;
  depth: number;
  profile: "involute" | "round";
  /** z of the tooth tips, the pitch line, the root line and the back of the bar. */
  tipZ: number;
  pitchZ: number;
  rootZ: number;
  backZ: number;
  /** Involute teeth: half a tooth's width at the tips and at the root. */
  tipHalf: number;
  rootHalf: number;
  /** Round teeth: the tooth's and the gap's arc radius, and the angle about the tooth's centre (from +x) where they touch. */
  toothRadius: number;
  gapRadius: number;
  touchAngle: number;
};

/** The x of tooth `index` of a rack; the gaps' centres lie half a pitch beside it, and one on each end. */
export function rackToothCentre(measures: RackMeasures, index: number) {
  return -measures.length / 2 + (index + 0.5) * measures.pitch;
}

/**
 * A rack (#201): the gear of endless radius, so an involute flank is a straight line at the
 * pressure angle. The tooth is half a pitch less half the backlash thick on the pitch line, stands
 * an addendum above it and reaches a dedendum below; round teeth are two arcs per pitch touching
 * each other, as on the round gear. The bar runs along x with its teeth towards +z; its ends
 * fall on gap centres, so racks of one module line up end to end.
 */
export function rackMeasures(width: number, depth: number, options: RackOptions): RackMeasures {
  const teeth = normalizeGearTeeth(options.teeth);
  const profile = normalizeGearProfile(options.gearProfile) === "round" ? "round" : "involute";
  const length = Math.max(0.01, width);
  const module = rackModule(length, teeth);
  const pitch = Math.PI * module;
  const backlash = normalizeGearBacklash(options.gearBacklash, module);
  const addendum = gearAddendum(profile) * module;
  const dedendum = gearDedendum(profile) * module;
  const safeDepth = Math.max(depth, addendum + dedendum + module * 0.2);
  const tipZ = safeDepth / 2;
  const rootZ = tipZ - addendum - dedendum;
  const pitchZ = rootZ + dedendum;
  const thickness = pitch / 2 - backlash / 2;
  const measures: RackMeasures = { teeth, module, pitch, length, depth: safeDepth, profile, tipZ, pitchZ, rootZ, backZ: -safeDepth / 2, tipHalf: 0, rootHalf: 0, toothRadius: 0, gapRadius: 0, touchAngle: 0 };
  if (profile === "involute") {
    const slope = Math.tan(THREE.MathUtils.degToRad(normalizeGearPressureAngle(options.gearPressureAngle)));
    measures.tipHalf = Math.max(pitch * 0.02, thickness / 2 - addendum * slope);
    measures.rootHalf = Math.min(pitch * 0.48, thickness / 2 + dedendum * slope);
    return measures;
  }
  // Two arcs per pitch that touch: their radii add up to a sum the pitch and the depth fix, and
  // the split between them sets how thick the tooth is on the pitch line.
  const height = addendum + dedendum;
  const sum = ((pitch * pitch) / 4 + height * height) / (2 * height);
  const touchAngle = Math.atan2(sum - height, pitch / 2);
  const halfAt = (toothRadius: number) => {
    const gapRadius = sum - toothRadius;
    const toothZ = tipZ - toothRadius;
    const gapZ = rootZ + gapRadius;
    const touchZ = toothZ + (gapZ - toothZ) * (toothRadius / sum);
    return pitchZ >= touchZ
      ? Math.sqrt(Math.max(0, toothRadius * toothRadius - (pitchZ - toothZ) ** 2))
      : pitch / 2 - Math.sqrt(Math.max(0, gapRadius * gapRadius - (pitchZ - gapZ) ** 2));
  };
  let low = sum * 0.02;
  let high = sum * 0.98;
  for (let step = 0; step < 60; step += 1) {
    const middle = (low + high) / 2;
    if (halfAt(middle) < thickness / 2) low = middle;
    else high = middle;
  }
  measures.toothRadius = low;
  measures.gapRadius = sum - low;
  measures.touchAngle = touchAngle;
  return measures;
}

/** The arcs of round rack tooth `index` and of the gap on its left, as the outline runs from the right end to the left. */
export function rackToothArcs(measures: RackMeasures, index: number) {
  const { tipZ, rootZ, toothRadius, gapRadius, touchAngle, pitch } = measures;
  const centre = rackToothCentre(measures, index);
  return {
    tooth: { x: centre, z: tipZ - toothRadius, radius: toothRadius, start: touchAngle, end: Math.PI - touchAngle },
    // The gap's arc runs clockwise about its centre below the contour, down through the root and up again.
    gap: { x: centre - pitch / 2, z: rootZ + gapRadius, radius: gapRadius, start: -touchAngle, end: index === 0 ? -Math.PI / 2 : -Math.PI + touchAngle },
  };
}

/**
 * The rack's outline, counter-clockwise in x/z like every gear's corners: along the back, up
 * the right end and back over the teeth from right to left. Display mesh and exact body take it.
 */
export function rackOutlinePoints(measures: RackMeasures) {
  const { length, teeth, tipZ, rootZ, backZ, tipHalf, rootHalf } = measures;
  const points: Array<{ x: number; z: number }> = [{ x: -length / 2, z: backZ }, { x: length / 2, z: backZ }, { x: length / 2, z: rootZ }];
  if (measures.profile === "involute") {
    for (let tooth = teeth - 1; tooth >= 0; tooth -= 1) {
      const centre = rackToothCentre(measures, tooth);
      points.push({ x: centre + rootHalf, z: rootZ }, { x: centre + tipHalf, z: tipZ }, { x: centre - tipHalf, z: tipZ }, { x: centre - rootHalf, z: rootZ });
    }
    points.push({ x: -length / 2, z: rootZ });
    return points;
  }
  const arcPoints = (arc: { x: number; z: number; radius: number; start: number; end: number }) => {
    const steps = Math.max(2, Math.ceil(Math.abs(arc.end - arc.start) / ROUND_ARC_STEP));
    for (let step = 1; step <= steps; step += 1) {
      const angle = arc.start + ((arc.end - arc.start) * step) / steps;
      points.push({ x: arc.x + arc.radius * Math.cos(angle), z: arc.z + arc.radius * Math.sin(angle) });
    }
  };
  // The right end: half a gap from its root up to the last tooth.
  arcPoints({ x: length / 2, z: rootZ + measures.gapRadius, radius: measures.gapRadius, start: -Math.PI / 2, end: -Math.PI + measures.touchAngle });
  for (let tooth = teeth - 1; tooth >= 0; tooth -= 1) {
    const arcs = rackToothArcs(measures, tooth);
    arcPoints(arcs.tooth);
    arcPoints(arcs.gap);
  }
  return points;
}

export type OutlinePoint = { x: number; z: number };

/**
 * A body from an outline and the holes in it, all running the same way round, its foot at y = 0:
 * the walls, and both ends filled as the outline with its holes - a ring gear's many close corners
 * would fold a fan of spokes over.
 */
export function extrudeOutline(contour: OutlinePoint[], holes: OutlinePoint[][], height: number) {
  const rings = [contour, ...holes];
  const flat = rings.flat();
  // Where each ring's points start in the flat list, as the triangulation numbers them.
  const base: number[] = [];
  let count = 0;
  for (const ring of rings) {
    base.push(count);
    count += ring.length;
  }
  const positions: number[] = [];
  const indices: number[] = [];
  for (const top of [false, true]) for (const point of flat) positions.push(point.x, top ? height : 0, point.z);
  const at = (ring: number, point: number, top: boolean) => (top ? count : 0) + base[ring] + point;
  rings.forEach((ring, index) => {
    ring.forEach((_, point) => {
      const next = (point + 1) % ring.length;
      const a = at(index, point, false);
      const b = at(index, next, false);
      const c = at(index, point, true);
      const d = at(index, next, true);
      if (index === 0) indices.push(a, c, d, a, d, b);
      else indices.push(a, b, d, a, d, c);
    });
  });
  const triangles = THREE.ShapeUtils.triangulateShape(contour.map((point) => new THREE.Vector2(point.x, point.z)), holes.map((hole) => hole.map((point) => new THREE.Vector2(point.x, point.z))));
  for (const up of [false, true]) {
    const vertex = (index: number) => index + (up ? count : 0);
    for (const [a, b, c] of triangles) {
      const pa = flat[a];
      const pb = flat[b];
      const pc = flat[c];
      // The y of (b - a) x (c - a), with x/z as here: positive faces up.
      const facesUp = (pb.z - pa.z) * (pc.x - pa.x) - (pb.x - pa.x) * (pc.z - pa.z) > 0;
      indices.push(vertex(a), ...(facesUp === up ? [vertex(b), vertex(c)] : [vertex(c), vertex(b)]));
    }
  }
  const indexed = new THREE.BufferGeometry();
  indexed.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  indexed.setIndex(indices);
  const geometry = toCreasedNormals(indexed, THREE.MathUtils.degToRad(12));
  indexed.dispose();
  geometry.computeBoundingBox();
  return geometry;
}

export function normalizeGearTeeth(value?: number) {
  return clamp(Math.round(Number.isFinite(value) ? value as number : DEFAULT_GEAR_TEETH), MIN_GEAR_TEETH, MAX_GEAR_TEETH);
}

export function normalizeGearType(value?: string): GearType {
  return value === "helical" || value === "bevel" || value === "internal" || value === "rack" ? value : DEFAULT_GEAR_TYPE;
}

/** A ring gear (teeth pointing in) and a rack (#201) are set by module like involute gears, whatever profile is stored. */
export function gearTypeIsModular(value?: string) {
  const type = normalizeGearType(value);
  return type === "internal" || type === "rack";
}

/** The tooth shape a gear is drawn with: a ring gear or a rack has no straight teeth, so "simple" counts as involute there. */
export function gearToothProfile(options: Pick<WorkplaneShape, "gearType" | "gearProfile">): GearProfile {
  const profile = normalizeGearProfile(options.gearProfile);
  return profile === "simple" && gearTypeIsModular(options.gearType) ? "involute" : profile;
}

export function normalizeGearRim(value?: number) {
  return clamp(Number.isFinite(value) ? value as number : DEFAULT_GEAR_RIM, MIN_GEAR_RIM, MAX_GEAR_RIM);
}

export function normalizeGearToothSize(value: number | undefined, width: number, depth: number) {
  const maximum = Math.max(0.2, Math.min(width, depth) * 0.22);
  return clamp(Number.isFinite(value) ? value as number : DEFAULT_GEAR_TOOTH_SIZE, 0.2, maximum);
}

export function gearToothPitch(width: number, depth: number, teeth?: number) {
  return Math.PI * Math.max(0.01, Math.min(width, depth)) / normalizeGearTeeth(teeth);
}

export function normalizeGearToothWidth(value: number | undefined, width: number, depth: number, teeth?: number) {
  const pitch = gearToothPitch(width, depth, teeth);
  return clamp(Number.isFinite(value) ? value as number : pitch * 0.54, pitch * 0.12, pitch * 0.82);
}

/** The radius at the foot of the teeth, by the smaller of width and depth. */
function gearRootRadius(width: number, depth: number, toothSize?: number, profile?: Partial<GearOutlineOptions>) {
  const outerRadius = Math.max(0.005, Math.min(width, depth) / 2);
  if (normalizeGearProfile(profile?.gearProfile) === "round") {
    return roundGearMeasures(Math.max(0.01, width), Math.max(0.01, depth), profile ?? {}).rootRadius;
  }
  if (normalizeGearProfile(profile?.gearProfile) === "involute") {
    return involuteGearMeasures(Math.max(0.01, width), Math.max(0.01, depth), profile ?? {}).rootRadius;
  }
  const normalizedToothSize = normalizeGearToothSize(toothSize, width, depth);
  return Math.max(outerRadius * 0.34, outerRadius - normalizedToothSize);
}

export function gearCenterHoleLimits(width: number, depth: number, toothSize?: number, profile?: Partial<GearOutlineOptions>) {
  const rootRadius = gearRootRadius(width, depth, toothSize, profile);
  const max = Math.max(0.01, rootRadius * 1.5);
  return { min: 0, max };
}

export function normalizeGearCenterHoleSize(value: number | undefined, width: number, depth: number, toothSize?: number, profile?: Partial<GearOutlineOptions>) {
  const limits = gearCenterHoleLimits(width, depth, toothSize, profile);
  const outerRadius = Math.max(0.005, Math.min(width, depth) / 2);
  const rootRadius = gearRootRadius(width, depth, toothSize, profile);
  const defaultSize = Math.min(outerRadius * 0.4, rootRadius * 1.1);
  return clamp(Number.isFinite(value) ? value as number : defaultSize, limits.min, limits.max);
}

export function normalizeGearHelixAngle(value?: number) {
  return clamp(
    Number.isFinite(value) ? value as number : DEFAULT_GEAR_HELIX_ANGLE,
    MIN_GEAR_HELIX_ANGLE,
    MAX_GEAR_HELIX_ANGLE,
  );
}

export function normalizeGearHelixQuality(value?: number) {
  return clamp(
    Math.round(Number.isFinite(value) ? value as number : DEFAULT_GEAR_HELIX_QUALITY),
    MIN_GEAR_HELIX_QUALITY,
    MAX_GEAR_HELIX_QUALITY,
  );
}

export function gearSettings(shape: Pick<WorkplaneShape, "width" | "depth" | "teeth" | "toothSize" | "toothWidth" | "centerHoleSize" | "gearType" | "helixAngle" | "helixQuality">) {
  return {
    teeth: normalizeGearTeeth(shape.teeth),
    toothSize: normalizeGearToothSize(shape.toothSize, shape.width, shape.depth),
    toothWidth: normalizeGearToothWidth(shape.toothWidth, shape.width, shape.depth, shape.teeth),
    centerHoleSize: normalizeGearCenterHoleSize(shape.centerHoleSize, shape.width, shape.depth, shape.toothSize),
    gearType: normalizeGearType(shape.gearType),
    helixAngle: normalizeGearHelixAngle(shape.helixAngle),
    helixQuality: normalizeGearHelixQuality(shape.helixQuality),
  };
}

export type GearOutlineOptions = Pick<WorkplaneShape, "teeth" | "toothSize" | "toothWidth" | "gearProfile" | "gearPressureAngle" | "gearBacklash">;

/**
 * How the ring of corners is stretched to width x depth. Straight teeth are stretched until
 * they span exactly that; involute teeth by their tip circle, so the module stays exact even
 * where no tooth tip reaches the frame (#201). Null for the straight teeth.
 */
export function involuteOutlineStretch(width: number, depth: number, options: GearOutlineOptions) {
  if (!gearUsesModule(options.gearProfile)) return null;
  const safeWidth = Math.max(0.01, width);
  const safeDepth = Math.max(0.01, depth);
  const teeth = normalizeGearTeeth(options.teeth);
  const diameter = involuteGearDiameter(involuteGearModule(safeWidth, safeDepth, teeth, options.gearProfile), teeth, options.gearProfile);
  return { x: safeWidth / diameter, z: safeDepth / diameter };
}

/**
 * Die Ecken des Zahnkranzes auf einem Ring, vor dem Strecken auf Breite x
 * Tiefe: je Zahn vier (Fuss, Kopf, Kopf, Fuss) auf der Fuss- und der
 * Kopfellipse, beim Winkel `angle` von +x nach +z. Anzeigenetz und exakter
 * Koerper (`cadProfileExtrusion.ts`) nehmen dieselben Ecken.
 */
export function gearOutlineCorners(width: number, depth: number, options: GearOutlineOptions) {
  const safeWidth = Math.max(0.01, width);
  const safeDepth = Math.max(0.01, depth);
  if (normalizeGearProfile(options.gearProfile) === "involute") {
    return involuteOutlineCorners(involuteGearMeasures(safeWidth, safeDepth, options));
  }
  if (normalizeGearProfile(options.gearProfile) === "round") {
    return roundWaveCorners(roundGearMeasures(safeWidth, safeDepth, options));
  }
  const teeth = normalizeGearTeeth(options.teeth);
  const toothSize = normalizeGearToothSize(options.toothSize, safeWidth, safeDepth);
  const toothFraction = normalizeGearToothWidth(options.toothWidth, safeWidth, safeDepth, teeth) / gearToothPitch(safeWidth, safeDepth, teeth);
  const outerX = safeWidth / 2;
  const outerZ = safeDepth / 2;
  const rootX = Math.max(outerX * 0.34, outerX - toothSize);
  const rootZ = Math.max(outerZ * 0.34, outerZ - toothSize);
  const toothPhases = [0.05, (1 - toothFraction) / 2, (1 + toothFraction) / 2, 0.95] as const;
  const corners: Array<{ angle: number; radiusX: number; radiusZ: number }> = [];
  for (let tooth = 0; tooth < teeth; tooth += 1) {
    toothPhases.forEach((phase, phaseIndex) => {
      const isOuter = phaseIndex === 1 || phaseIndex === 2;
      corners.push({ angle: ((tooth + phase) / teeth) * Math.PI * 2, radiusX: isOuter ? outerX : rootX, radiusZ: isOuter ? outerZ : rootZ });
    });
  }
  return corners;
}

type GearGeometryOptions = {
  width: number;
  depth: number;
  height: number;
  teeth?: number;
  toothSize?: number;
  toothWidth?: number;
  centerHoleSize?: number;
  gearType?: GearType;
  helixAngle?: number;
  helixQuality?: number;
  gearProfile?: GearProfile;
  gearPressureAngle?: number;
  gearBacklash?: number;
  gearRim?: number;
};

/**
 * How far a helical gear's teeth turn from foot to top, in radians. Straight teeth take the
 * helix angle as that turn; involute teeth take it as the true helix angle on the pitch
 * circle (#201), so two gears with the same module and angle mesh at any size - one turned
 * the other way.
 */
export function gearHelixTwist(width: number, depth: number, height: number, options: GearOutlineOptions & Pick<WorkplaneShape, "helixAngle">) {
  const angle = THREE.MathUtils.degToRad(normalizeGearHelixAngle(options.helixAngle));
  if (!gearUsesModule(options.gearProfile)) return angle;
  const teeth = normalizeGearTeeth(options.teeth);
  const pitchRadius = (involuteGearModule(Math.max(0.01, width), Math.max(0.01, depth), teeth, options.gearProfile) * teeth) / 2;
  return (Math.max(0.01, height) * Math.tan(angle)) / pitchRadius;
}

export function createGearGeometry({
  width,
  depth,
  height,
  teeth: requestedTeeth,
  toothSize: requestedToothSize,
  toothWidth: requestedToothWidth,
  centerHoleSize: requestedCenterHoleSize,
  gearType: requestedType,
  helixAngle: requestedHelixAngle,
  helixQuality: requestedHelixQuality,
  gearProfile,
  gearPressureAngle,
  gearBacklash,
  gearRim,
}: GearGeometryOptions) {
  const safeWidth = Math.max(0.01, width);
  const safeDepth = Math.max(0.01, depth);
  const safeHeight = Math.max(0.01, height);
  const teeth = normalizeGearTeeth(requestedTeeth);
  const type = normalizeGearType(requestedType);
  // A ring gear (#201): its rim's circle round the teeth of a gear turned inside out, both stretched to width x depth.
  if (type === "internal") {
    const { corners, rimRadius, stretch } = internalGearOutline(safeWidth, safeDepth, { teeth, gearProfile, gearPressureAngle, gearBacklash, gearRim });
    const inner = corners.map((corner) => ({ x: Math.cos(corner.angle) * corner.radiusX * stretch.x, z: Math.sin(corner.angle) * corner.radiusZ * stretch.z }));
    const sides = Math.max(72, teeth * 6);
    const rim = Array.from({ length: sides }, (_, side) => {
      const angle = (side / sides) * Math.PI * 2;
      return { x: Math.cos(angle) * rimRadius * stretch.x, z: Math.sin(angle) * rimRadius * stretch.z };
    });
    return extrudeOutline(rim, [inner], safeHeight);
  }
  // A rack (#201): a bar with teeth along one side.
  if (type === "rack") return extrudeOutline(rackOutlinePoints(rackMeasures(safeWidth, safeDepth, { teeth, gearProfile, gearPressureAngle, gearBacklash })), [], safeHeight);
  const toothSize = normalizeGearToothSize(requestedToothSize, safeWidth, safeDepth);
  const profile: GearOutlineOptions = { teeth, toothSize: requestedToothSize, toothWidth: requestedToothWidth, gearProfile, gearPressureAngle, gearBacklash };
  const corners = gearOutlineCorners(safeWidth, safeDepth, profile);
  const involute = involuteOutlineStretch(safeWidth, safeDepth, profile);
  const centerHoleSize = normalizeGearCenterHoleSize(requestedCenterHoleSize, safeWidth, safeDepth, toothSize, profile);
  const hasCenterHole = centerHoleSize > 0;
  const gearType = normalizeGearType(requestedType);
  const helixQuality = normalizeGearHelixQuality(requestedHelixQuality);
  const outlineCount = corners.length;
  const ringCount = gearType === "helical" ? helixQuality : 2;
  const twist = gearType === "helical" ? gearHelixTwist(safeWidth, safeDepth, safeHeight, { ...profile, helixAngle: requestedHelixAngle }) : 0;
  const topScale = gearType === "bevel" ? BEVEL_GEAR_TOP_SCALE : 1;
  const boreX = centerHoleSize / 2;
  const boreZ = centerHoleSize / 2;
  const positions: number[] = [];
  const indices: number[] = [];

  const outerIndex = (ring: number, point: number) => ring * outlineCount * 2 + point;
  const innerIndex = (ring: number, point: number) => ring * outlineCount * 2 + outlineCount + point;

  for (let ring = 0; ring < ringCount; ring += 1) {
    const progress = ring / (ringCount - 1);
    const y = progress * safeHeight;
    const ringTwist = progress * twist;
    const scale = 1 + (topScale - 1) * progress;

    for (const corner of corners) {
      const angle = corner.angle + ringTwist;
      positions.push(Math.cos(angle) * corner.radiusX * scale, y, Math.sin(angle) * corner.radiusZ * scale);
    }

    for (let point = 0; point < outlineCount; point += 1) {
      // The bore of involute teeth turns with the ring; its end faces are filled below.
      const angle = (point / outlineCount) * Math.PI * 2 + (involute ? ringTwist : 0);
      positions.push(Math.cos(angle) * boreX, y, Math.sin(angle) * boreZ);
    }
  }

  let outlineMinX = Number.POSITIVE_INFINITY;
  let outlineMaxX = Number.NEGATIVE_INFINITY;
  let outlineMinZ = Number.POSITIVE_INFINITY;
  let outlineMaxZ = Number.NEGATIVE_INFINITY;
  for (let ring = 0; ring < ringCount; ring += 1) {
    for (let point = 0; point < outlineCount; point += 1) {
      const offset = outerIndex(ring, point) * 3;
      outlineMinX = Math.min(outlineMinX, positions[offset]);
      outlineMaxX = Math.max(outlineMaxX, positions[offset]);
      outlineMinZ = Math.min(outlineMinZ, positions[offset + 2]);
      outlineMaxZ = Math.max(outlineMaxZ, positions[offset + 2]);
    }
  }
  const outlineScaleX = involute ? involute.x : safeWidth / Math.max(Number.EPSILON, outlineMaxX - outlineMinX);
  const outlineScaleZ = involute ? involute.z : safeDepth / Math.max(Number.EPSILON, outlineMaxZ - outlineMinZ);
  for (let ring = 0; ring < ringCount; ring += 1) {
    for (let point = 0; point < outlineCount; point += 1) {
      const offset = outerIndex(ring, point) * 3;
      positions[offset] *= outlineScaleX;
      positions[offset + 2] *= outlineScaleZ;
    }
  }

  for (let ring = 0; ring < ringCount - 1; ring += 1) {
    for (let point = 0; point < outlineCount; point += 1) {
      const next = (point + 1) % outlineCount;
      const outerBottom = outerIndex(ring, point);
      const outerNextBottom = outerIndex(ring, next);
      const outerTop = outerIndex(ring + 1, point);
      const outerNextTop = outerIndex(ring + 1, next);
      indices.push(outerBottom, outerTop, outerNextTop, outerBottom, outerNextTop, outerNextBottom);

      if (hasCenterHole) {
        const innerBottom = innerIndex(ring, point);
        const innerNextBottom = innerIndex(ring, next);
        const innerTop = innerIndex(ring + 1, point);
        const innerNextTop = innerIndex(ring + 1, next);
        indices.push(innerBottom, innerNextBottom, innerNextTop, innerBottom, innerNextTop, innerTop);
      }
    }
  }

  const topRing = ringCount - 1;
  // Involute teeth have many corners close together, some straight above each other below
  // the base circle: a fan of spokes from the bore would fold over or lose its area there,
  // and the edge lines drew every spoke. Each end is filled as an outline with a hole.
  if (involute) {
    for (const [ring, up] of [[0, false], [topRing, true]] as const) {
      const at = (index: number) => new THREE.Vector2(positions[index * 3], positions[index * 3 + 2]);
      const contour = Array.from({ length: outlineCount }, (_, point) => at(outerIndex(ring, point)));
      const hole = hasCenterHole ? Array.from({ length: outlineCount }, (_, point) => at(innerIndex(ring, point))) : null;
      const vertex = (index: number) => (index < outlineCount ? outerIndex(ring, index) : innerIndex(ring, index - outlineCount));
      for (const [a, b, c] of THREE.ShapeUtils.triangulateShape(contour, hole ? [hole] : [])) {
        const pa = a < outlineCount ? contour[a] : hole![a - outlineCount];
        const pb = b < outlineCount ? contour[b] : hole![b - outlineCount];
        const pc = c < outlineCount ? contour[c] : hole![c - outlineCount];
        // The y of (b - a) x (c - a), with x/z as here: positive faces up.
        const facesUp = (pb.y - pa.y) * (pc.x - pa.x) - (pb.x - pa.x) * (pc.y - pa.y) > 0;
        indices.push(vertex(a), ...(facesUp === up ? [vertex(b), vertex(c)] : [vertex(c), vertex(b)]));
      }
    }
  }
  for (let point = 0; point < outlineCount && !involute; point += 1) {
    const next = (point + 1) % outlineCount;
    const bottomOuter = outerIndex(0, point);
    const bottomOuterNext = outerIndex(0, next);
    const bottomInner = innerIndex(0, point);
    const bottomInnerNext = innerIndex(0, next);
    if (hasCenterHole) {
      indices.push(bottomOuter, bottomOuterNext, bottomInnerNext, bottomOuter, bottomInnerNext, bottomInner);
    } else {
      indices.push(bottomOuter, bottomOuterNext, innerIndex(0, 0));
    }

    const topOuter = outerIndex(topRing, point);
    const topOuterNext = outerIndex(topRing, next);
    const topInner = innerIndex(topRing, point);
    const topInnerNext = innerIndex(topRing, next);
    if (hasCenterHole) {
      indices.push(topOuter, topInner, topInnerNext, topOuter, topInnerNext, topOuterNext);
    } else {
      indices.push(topOuter, innerIndex(topRing, 0), topOuterNext);
    }
  }

  const indexed = new THREE.BufferGeometry();
  indexed.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  indexed.setIndex(indices);
  const geometry = toCreasedNormals(indexed, THREE.MathUtils.degToRad(12));
  indexed.dispose();
  geometry.computeBoundingBox();
  return geometry;
}
