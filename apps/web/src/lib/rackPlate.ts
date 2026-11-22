/**
 * The rack plate: a flat plate to glue, tape or screw a device to, with a HomeRacker sleeve on its back
 * (https://github.com/kellerlabs/homeracker). The sleeve is a U that slips over a 15 x 15 mm support and is locked
 * with lock pins through its side walls, as the connectors are. Not part of the HomeRacker project; its measures
 * follow the project's published constants (models/core/lib/constants.scad, MIT):
 *
 * - A support is 15 x 15 mm with a 4 mm square lock pin hole through the middle of every 15 mm unit.
 * - Walls are 2 mm, the fit tolerance is 0.2 mm: the sleeve's inside is 15.2 mm across and 15.1 mm deep (the plate
 *   closes it at the back), its outside 19.2 mm across, like a connector's.
 * - A sleeve of n units is n x 15 - 0.2 mm long; its lock pin holes sit 15 mm apart about its middle, halfway up the
 *   support.
 *
 * The plate lies on the workplane and the sleeve stands on it, open at the top: printed so, the lock pin holes run
 * level and need no supports. Plain functions without three.js, so the layout can be tested on its own;
 * editorRackPlate.ts builds the body.
 */
import type { RackPlateAxis, RackPlateSettings } from "@/types/layerling";

/** The HomeRacker grid unit in mm. */
export const RACK_PLATE_UNIT = 15;
/** HomeRacker's fit tolerance between mating parts, in mm. */
export const RACK_PLATE_TOLERANCE = 0.2;
/** HomeRacker's wall strength in mm. */
export const RACK_PLATE_WALL = 2;
/** The lock pin's square side in mm (the hole has no tolerance of its own in HomeRacker). */
export const RACK_PLATE_PIN_HOLE = 4;
/** The sleeve's inside: across the support, and from the plate to the open top. */
export const RACK_PLATE_SLEEVE_INNER = RACK_PLATE_UNIT + RACK_PLATE_TOLERANCE;
export const RACK_PLATE_SLEEVE_DEPTH = RACK_PLATE_UNIT + RACK_PLATE_TOLERANCE / 2;
/** The sleeve's outside across: 19.2 mm, as a connector. */
export const RACK_PLATE_SLEEVE_OUTER = RACK_PLATE_SLEEVE_INNER + 2 * RACK_PLATE_WALL;

export const MIN_RACK_PLATE_SIZE = 20;
export const MAX_RACK_PLATE_SIZE = 300;
export const MIN_RACK_PLATE_THICKNESS = 1.6;
export const MAX_RACK_PLATE_THICKNESS = 10;
export const MIN_RACK_PLATE_UNITS = 1;
export const MAX_RACK_PLATE_UNITS = 20;
export const MAX_RACK_PLATE_HOLE_CLEARANCE = 1;
export const MAX_RACK_PLATE_CORNER_RADIUS = 20;
export const MIN_RACK_PLATE_SCREW_DIAMETER = 1.5;
export const MAX_RACK_PLATE_SCREW_DIAMETER = 10;

export const RACK_PLATE_AXES: readonly RackPlateAxis[] = ["depth", "width"];

export const DEFAULT_RACK_PLATE: RackPlateSettings = {
  width: 80,
  depth: 60,
  thickness: 3,
  sleeveUnits: 3,
  sleeveAlong: "depth",
  sleeveOffset: 0,
  holeClearance: 0,
  cornerRadius: 2,
  screwHoles: false,
  screwDiameter: 3.2,
  screwInset: 6,
};

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const number = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, number));
}

/** Rounded to a hundredth of a millimetre, so a typed value and a stored one compare equal. */
function hundredths(value: number): number {
  return Math.round(value * 100) / 100;
}

/** A sleeve of this many units, in mm. */
export function rackPlateSleeveLength(units: number): number {
  return units * RACK_PLATE_UNIT - RACK_PLATE_TOLERANCE;
}

/** The most units a sleeve can have along a plate side of this length. */
export function rackPlateMaxUnits(sideLength: number): number {
  return Math.max(MIN_RACK_PLATE_UNITS, Math.min(MAX_RACK_PLATE_UNITS, Math.floor((sideLength + RACK_PLATE_TOLERANCE) / RACK_PLATE_UNIT)));
}

/** How far the sleeve may move off the middle, across it, and still stand on the plate. */
export function rackPlateMaxOffset(width: number, depth: number, along: RackPlateAxis): number {
  const across = along === "depth" ? width : depth;
  return Math.max(0, hundredths((across - RACK_PLATE_SLEEVE_OUTER) / 2));
}

/** The corner screw holes' inset fits the plate: their rims stay a millimetre off the edges and off each other. */
function maxScrewInset(width: number, depth: number, diameter: number): number {
  return Math.max(diameter / 2 + 1, Math.min(width, depth) / 2 - diameter / 2 - 1);
}

/** Settings made safe: measures in range, the sleeve on the plate; null for anything that is not settings. */
export function normalizeRackPlateSettings(input: unknown): RackPlateSettings | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Partial<Record<keyof RackPlateSettings, unknown>>;
  const sleeveAlong = RACK_PLATE_AXES.includes(raw.sleeveAlong as RackPlateAxis) ? (raw.sleeveAlong as RackPlateAxis) : DEFAULT_RACK_PLATE.sleeveAlong;
  const width = hundredths(clampNumber(raw.width, MIN_RACK_PLATE_SIZE, MAX_RACK_PLATE_SIZE, DEFAULT_RACK_PLATE.width));
  const depth = hundredths(clampNumber(raw.depth, MIN_RACK_PLATE_SIZE, MAX_RACK_PLATE_SIZE, DEFAULT_RACK_PLATE.depth));
  const maxUnits = rackPlateMaxUnits(sleeveAlong === "depth" ? depth : width);
  const sleeveUnits = Math.round(clampNumber(raw.sleeveUnits, MIN_RACK_PLATE_UNITS, maxUnits, Math.min(DEFAULT_RACK_PLATE.sleeveUnits, maxUnits)));
  const maxOffset = rackPlateMaxOffset(width, depth, sleeveAlong);
  const screwDiameter = hundredths(clampNumber(raw.screwDiameter, MIN_RACK_PLATE_SCREW_DIAMETER, MAX_RACK_PLATE_SCREW_DIAMETER, DEFAULT_RACK_PLATE.screwDiameter));
  const insetMax = maxScrewInset(width, depth, screwDiameter);
  return {
    width,
    depth,
    thickness: hundredths(clampNumber(raw.thickness, MIN_RACK_PLATE_THICKNESS, MAX_RACK_PLATE_THICKNESS, DEFAULT_RACK_PLATE.thickness)),
    sleeveUnits,
    sleeveAlong,
    sleeveOffset: hundredths(clampNumber(raw.sleeveOffset, -maxOffset, maxOffset, 0)),
    holeClearance: hundredths(clampNumber(raw.holeClearance, 0, MAX_RACK_PLATE_HOLE_CLEARANCE, DEFAULT_RACK_PLATE.holeClearance)),
    cornerRadius: hundredths(clampNumber(raw.cornerRadius, 0, Math.min(MAX_RACK_PLATE_CORNER_RADIUS, Math.min(width, depth) / 2 - 0.5), DEFAULT_RACK_PLATE.cornerRadius)),
    screwHoles: raw.screwHoles === true,
    screwDiameter,
    screwInset: hundredths(clampNumber(raw.screwInset, screwDiameter / 2 + 1, insetMax, Math.min(DEFAULT_RACK_PLATE.screwInset, insetMax))),
  };
}

export function rackPlateSettingsEqual(a: RackPlateSettings | undefined, b: RackPlateSettings | undefined): boolean {
  if (!a || !b) return !a && !b;
  return JSON.stringify(normalizeRackPlateSettings(a)) === JSON.stringify(normalizeRackPlateSettings(b));
}

/**
 * A box in the plate's frame: x across the width and y along the depth, both from the plate's middle; z up from the
 * plate's underside. Sizes are full lengths.
 */
export type RackPlateBox = { x: number; y: number; z: number; sizeX: number; sizeY: number; sizeZ: number };

export type RackPlateLayout = {
  width: number;
  depth: number;
  thickness: number;
  /** The sleeve's two side walls, standing on the plate (reaching a little into it, so they join it). */
  walls: RackPlateBox[];
  /** The lock pin holes, square, through both side walls across the sleeve. */
  pinHoles: RackPlateBox[];
  /** The middles of the corner screw holes, in the plate's frame, and their diameter. */
  screwHoles: { x: number; y: number }[];
  screwDiameter: number;
  /** The whole height: plate and sleeve. */
  height: number;
};

/** How far the side walls reach down into the plate, so they make one body with it. */
const WALL_SINK = 0.2;
/** How far a lock pin hole reaches past the walls on both sides, so the cut leaves no skin. */
const PIN_OVERSHOOT = 1;

/** The plate, its sleeve, the lock pin holes and the corner screw holes for the settings. */
export function rackPlateLayout(input: RackPlateSettings): RackPlateLayout {
  const s = normalizeRackPlateSettings(input) ?? DEFAULT_RACK_PLATE;
  const length = rackPlateSleeveLength(s.sleeveUnits);
  const alongDepth = s.sleeveAlong === "depth";
  // In the sleeve's own frame: `u` across it, `v` along it; turned into the plate's x and y.
  const box = (u: number, v: number, z: number, sizeU: number, sizeV: number, sizeZ: number): RackPlateBox => (alongDepth
    ? { x: u + s.sleeveOffset, y: v, z, sizeX: sizeU, sizeY: sizeV, sizeZ }
    : { x: v, y: u + s.sleeveOffset, z, sizeX: sizeV, sizeY: sizeU, sizeZ });
  const wallMiddle = RACK_PLATE_SLEEVE_INNER / 2 + RACK_PLATE_WALL / 2;
  const wallHeight = RACK_PLATE_SLEEVE_DEPTH + WALL_SINK;
  const walls = [-1, 1].map((side) => box(side * wallMiddle, 0, s.thickness - WALL_SINK, RACK_PLATE_WALL, length, wallHeight));
  const hole = RACK_PLATE_PIN_HOLE + s.holeClearance;
  // Halfway up the support lying in the sleeve, as in the connectors and the RTL-SDR holder.
  const holeMiddle = s.thickness + RACK_PLATE_SLEEVE_DEPTH / 2;
  const pinHoles = Array.from({ length: s.sleeveUnits }, (_, index) => box(
    0,
    (index - (s.sleeveUnits - 1) / 2) * RACK_PLATE_UNIT,
    holeMiddle - hole / 2,
    RACK_PLATE_SLEEVE_OUTER + 2 * PIN_OVERSHOOT,
    hole,
    hole,
  ));
  // A corner screw hole under the sleeve would be closed by the support: those are left out.
  const halfX = s.width / 2 - s.screwInset;
  const halfY = s.depth / 2 - s.screwInset;
  const rim = s.screwDiameter / 2;
  const footprint = box(0, 0, 0, RACK_PLATE_SLEEVE_OUTER, length, 0);
  const underSleeve = (x: number, y: number) => Math.abs(x - footprint.x) < footprint.sizeX / 2 + rim && Math.abs(y - footprint.y) < footprint.sizeY / 2 + rim;
  const screwHoles = s.screwHoles
    ? [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy]) => ({ x: sx * halfX, y: sy * halfY })).filter((spot) => !underSleeve(spot.x, spot.y))
    : [];
  return {
    width: s.width,
    depth: s.depth,
    thickness: s.thickness,
    walls,
    pinHoles,
    screwHoles,
    screwDiameter: s.screwDiameter,
    height: s.thickness + RACK_PLATE_SLEEVE_DEPTH,
  };
}
