import * as THREE from "three";
import { toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { ManifoldToplevel } from "manifold-3d";
import { loadedManifoldRuntime, requestManifoldRuntime } from "@/lib/manifoldHandle";
import type { GridfinityLabelCorner, GridfinityType, WorkplaneShape } from "@/types/layerling";

/*
 * Gridfinity (#381), the open storage system by Zack Freedman: bins on a 42 mm grid
 * that drop into a baseplate and stack on one another. Everything here is
 * built from the published measurements (the Gridfinity design reference
 * linked from gridfinity.xyz/specification), so a bin fits baseplates printed
 * from other designs and the other way round:
 *
 * - a grid unit is 42 x 42 mm, a bin 0.5 mm smaller (41.5 per unit), a height
 *   unit 7 mm; the stacking lip adds 4.4 mm on top;
 * - under each grid unit a bin has a foot: from the bottom 0.8 mm at 45
 *   degrees, 1.8 mm straight, 2.15 mm at 45 degrees, 4.75 mm in all;
 * - the lip on the top of the wall is the foot's counterpart: from the
 *   bottom 0.7 mm at 45 degrees, 1.8 mm straight, 1.9 mm at 45 degrees up to
 *   the outer wall;
 * - the baseplate has the same three steps as a socket in each grid unit
 *   (0.7, 1.8, 2.15), on a 0.35 mm band, 5 mm tall: a bin of more than one
 *   unit rests on the ridges between the sockets, 0.25 mm above the plate's
 *   underside, with 0.25 mm all round its feet; a bin of one unit has no
 *   ridge under it and sits down on the slopes;
 * - magnet holes for 6 x 2 mm magnets, 6.5 mm wide, 13 mm from the middle of
 *   each unit in both directions.
 *
 * The wall (0.95 mm), the floor (1.2 mm) and the depth of the magnet holes
 * (2.4 mm) are not in the specification and are fixed here. The top of the
 * lip is sharp as drawn; the edge tool rounds it. A baseplate has no magnet
 * holes: the specification's plate is an open frame with nothing to hold one.
 *
 * Every outline of the body is an inset of one rounded rectangle whose corner
 * centres stay where they are - the outer wall, the inside, each step of the
 * lip; and likewise each foot and each socket inside its grid cell. So all of
 * them share the same points: the walls are strips between neighbouring
 * outlines, point to point, and where a foot meets the bin above it the two
 * outlines have the very same edge. That keeps the mesh closed with no
 * T-junctions. The exact body (gridfinitySolid) is built from the same plan.
 *
 * A bin of three height units or more can have a label shelf along any of
 * its inner walls (#455), which the specification does not have; the
 * measures follow kennetek's gridfinity-rebuilt tab, with the 0.5 mm
 * stacking gap the Fusion 360 add-in leaves. The shelf is flat on top,
 * 0.5 mm under the feet of a bin stacked on its lip, with a 1.2 mm strip
 * straight down at the front and an underside rising at 36 degrees from the
 * wall. It runs from wall to wall, into the round corners, or is a set
 * length moved along its wall. Where two shelves meet they join where they
 * cross; where a shelf meets a wall or another shelf the corner is rounded
 * or chamfered where there is room. The shelves are pieces, prisms or
 * prisms with a round cut out, joined to the bin and cut to its inside: the
 * display mesh by Manifold's booleans (gridfinityLabelledTriangles), the
 * exact body by the kernel's, from the same pieces (gridfinityLabelPieces).
 */

export const GRIDFINITY_GRID = 42;
export const GRIDFINITY_HEIGHT_UNIT = 7;
export const GRIDFINITY_LIP_HEIGHT = 4.4;
export const GRIDFINITY_BASEPLATE_HEIGHT = 5;
export const GRIDFINITY_FOOT_HEIGHT = 4.75;
export const GRIDFINITY_CLEARANCE = 0.25;
export const GRIDFINITY_BIN_RADIUS = 3.75;
export const GRIDFINITY_BASEPLATE_RADIUS = 4;
export const GRIDFINITY_WALL = 0.95;
export const GRIDFINITY_FLOOR = 1.2;
export const GRIDFINITY_MAGNET_DIAMETER = 6.5;
export const GRIDFINITY_MAGNET_DEPTH = 2.4;
export const GRIDFINITY_MAGNET_OFFSET = 13;
export const MIN_GRIDFINITY_UNITS = 1;
export const MAX_GRIDFINITY_UNITS = 6;
export const MAX_GRIDFINITY_HEIGHT_UNITS = 20;
export const DEFAULT_GRIDFINITY_TYPE: GridfinityType = "bin";
export const DEFAULT_GRIDFINITY_UNITS = { x: 2, z: 1, y: 3 };
export const DEFAULT_GRIDFINITY_LIP = true;
export const DEFAULT_GRIDFINITY_MAGNETS = false;
/** A label shelf's top under the wall's top: the 0.35 mm a stacked bin's feet sink into the lip, and 0.5 mm clear of them. */
const LABEL_DROP = 0.85;
/** The straight strip at the shelf's front edge, so it does not end in a knife edge. */
const LABEL_LAND = 1.2;
/** The rise of the shelf's underside from the wall: 36 degrees. */
const LABEL_RISE = Math.tan((36 * Math.PI) / 180);
/** How far above the floor the widest shelf's underside ends, rather than on the floor's edge. */
const LABEL_FLOOR_CLEARANCE = 0.5;
/** The shortest set length; anything shorter would be a peg, not a shelf for a label. */
const LABEL_MIN_LENGTH = 10;
export const MIN_GRIDFINITY_LABEL_HEIGHT_UNITS = 3;
export const MIN_GRIDFINITY_LABEL_WIDTH = 4;
export const DEFAULT_GRIDFINITY_LABEL_WIDTH = 14;
export const DEFAULT_GRIDFINITY_LABEL_CORNER: GridfinityLabelCorner = "round";
export const DEFAULT_GRIDFINITY_LABEL_CORNER_SIZE = 2;
export const MAX_GRIDFINITY_LABEL_CORNER_SIZE = 10;

/** Section of a foot, a socket or the wall: inset from the outline, at a height. */
export type GridfinityStep = [inset: number, y: number];

/** From the bottom: 0.8 at 45 degrees, 1.8 straight, 2.15 at 45 degrees, inset from the bin's 41.5 mm outline. */
export const GRIDFINITY_FOOT: GridfinityStep[] = [[2.95, 0], [2.15, 0.8], [2.15, 2.6], [0, 4.75]];
/** The baseplate's socket, inset from the 42 mm cell: a 0.35 band, then 0.7 at 45 degrees, 1.8 straight, 2.15 at 45 degrees. */
export const GRIDFINITY_SOCKET: GridfinityStep[] = [[2.85, 0], [2.85, 0.35], [2.15, 1.05], [2.15, 2.85], [0, 5]];
/** The lip's inner face, from where it leaves the support to the sharp top on the outer wall. */
const LIP: GridfinityStep[] = [[2.6, 0], [1.9, 0.7], [1.9, 2.5], [0, 4.4]];

const CORNER_STEPS = 8;
const MAGNET_SIDES = 32;

export type GridfinityShapeFields = Pick<WorkplaneShape, "width" | "height"> & {
  depth?: number;
  gridfinityType?: GridfinityType;
  gridfinityLip?: boolean;
  gridfinityMagnets?: boolean;
  gridfinityLabelBack?: boolean;
  gridfinityLabelFront?: boolean;
  gridfinityLabelLeft?: boolean;
  gridfinityLabelRight?: boolean;
  gridfinityLabelBackWidth?: number;
  gridfinityLabelBackLength?: number;
  gridfinityLabelBackOffset?: number;
  gridfinityLabelFrontWidth?: number;
  gridfinityLabelFrontLength?: number;
  gridfinityLabelFrontOffset?: number;
  gridfinityLabelLeftWidth?: number;
  gridfinityLabelLeftLength?: number;
  gridfinityLabelLeftOffset?: number;
  gridfinityLabelRightWidth?: number;
  gridfinityLabelRightLength?: number;
  gridfinityLabelRightOffset?: number;
  gridfinityLabelCorner?: GridfinityLabelCorner;
  gridfinityLabelCornerSize?: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeGridfinityType(value?: string): GridfinityType {
  return value === "baseplate" ? "baseplate" : "bin";
}

function units(value: number | undefined, fallback: number, max: number) {
  return Number.isFinite(value) ? clamp(Math.round(value as number), MIN_GRIDFINITY_UNITS, max) : fallback;
}

/**
 * The grid units the size stands for: across (x), deep (z) and, for a bin,
 * high (y). The height is counted from half the lip: a bin of so many units
 * reads the same with the lip and without it, so switching the lip alone
 * keeps the units and only adds or takes off the 4.4 mm.
 */
export function gridfinityUnits(shape: GridfinityShapeFields) {
  const type = normalizeGridfinityType(shape.gridfinityType);
  const margin = type === "bin" ? 2 * GRIDFINITY_CLEARANCE : 0;
  return {
    x: units((shape.width + margin) / GRIDFINITY_GRID, DEFAULT_GRIDFINITY_UNITS.x, MAX_GRIDFINITY_UNITS),
    z: units(((shape.depth ?? shape.width) + margin) / GRIDFINITY_GRID, DEFAULT_GRIDFINITY_UNITS.z, MAX_GRIDFINITY_UNITS),
    y: type === "bin" ? units((shape.height - GRIDFINITY_LIP_HEIGHT / 2) / GRIDFINITY_HEIGHT_UNIT, DEFAULT_GRIDFINITY_UNITS.y, MAX_GRIDFINITY_HEIGHT_UNITS) : 1,
  };
}

/** The size of a bin or baseplate of so many units. */
export function gridfinitySize(type: GridfinityType, count: { x: number; z: number; y: number }, lip = true) {
  if (type === "baseplate") return { width: count.x * GRIDFINITY_GRID, depth: count.z * GRIDFINITY_GRID, height: GRIDFINITY_BASEPLATE_HEIGHT };
  return {
    width: count.x * GRIDFINITY_GRID - 2 * GRIDFINITY_CLEARANCE,
    depth: count.z * GRIDFINITY_GRID - 2 * GRIDFINITY_CLEARANCE,
    height: count.y * GRIDFINITY_HEIGHT_UNIT + (lip ? GRIDFINITY_LIP_HEIGHT : 0),
  };
}

/**
 * The size belongs to the grid: a drag on a handle writes width, depth and
 * height directly, so they are turned back into whole units here and the box
 * sits exactly on the body again.
 */
export function gridfinityFootprintPatch(shape: GridfinityShapeFields) {
  return gridfinitySize(normalizeGridfinityType(shape.gridfinityType), gridfinityUnits(shape), shape.gridfinityLip !== false);
}

/**
 * What a change of type, units or lip writes to the shape: the settings and
 * the box their whole units make. A baseplate keeps no height units, so a
 * baseplate turned into a bin gets the default 3.
 */
export function gridfinityShapePatch(shape: GridfinityShapeFields, next: { type?: GridfinityType; x?: number; z?: number; y?: number; lip?: boolean }) {
  const current = gridfinityUnits(shape);
  const currentType = normalizeGridfinityType(shape.gridfinityType);
  const type = next.type ?? currentType;
  const lip = next.lip ?? shape.gridfinityLip !== false;
  const count = {
    x: units(next.x ?? current.x, DEFAULT_GRIDFINITY_UNITS.x, MAX_GRIDFINITY_UNITS),
    z: units(next.z ?? current.z, DEFAULT_GRIDFINITY_UNITS.z, MAX_GRIDFINITY_UNITS),
    y: units(next.y ?? (currentType === "bin" ? current.y : DEFAULT_GRIDFINITY_UNITS.y), DEFAULT_GRIDFINITY_UNITS.y, MAX_GRIDFINITY_HEIGHT_UNITS),
  };
  const size = gridfinitySize(type, count, lip);
  return { gridfinityType: type, gridfinityLip: lip, ...size };
}

/** Everything the body is built from, in the shape's own frame: x across, z deep, y up from 0, centred on x and z. */
export function gridfinityPlan(shape: GridfinityShapeFields) {
  const type = normalizeGridfinityType(shape.gridfinityType);
  const count = gridfinityUnits(shape);
  const lip = type === "bin" && shape.gridfinityLip !== false;
  const magnets = type === "bin" && Boolean(shape.gridfinityMagnets);
  const size = gridfinitySize(type, count, lip);
  const cells: Array<{ x: number; z: number; i: number; j: number }> = [];
  for (let i = 0; i < count.x; i += 1) {
    for (let j = 0; j < count.z; j += 1) {
      cells.push({ i, j, x: (i - (count.x - 1) / 2) * GRIDFINITY_GRID, z: (j - (count.z - 1) / 2) * GRIDFINITY_GRID });
    }
  }
  const magnetHoles = magnets
    ? cells.flatMap((cell) => [-1, 1].flatMap((sx) => [-1, 1].map((sz) => ({ x: cell.x + sx * GRIDFINITY_MAGNET_OFFSET, z: cell.z + sz * GRIDFINITY_MAGNET_OFFSET }))))
    : [];
  const top = count.y * GRIDFINITY_HEIGHT_UNIT;
  return { type, count, lip, magnets, size, cells, magnetHoles, top };
}

export type GridfinityPlan = ReturnType<typeof gridfinityPlan>;

export type GridfinityWall = "back" | "front" | "left" | "right";
type FlatPoint = { x: number; z: number };

/** Each wall's own shelf settings, in the order the walls are built and listed: its switch, width, length and offset. */
export const GRIDFINITY_LABEL_WALL_KEYS = {
  back: { on: "gridfinityLabelBack", width: "gridfinityLabelBackWidth", length: "gridfinityLabelBackLength", offset: "gridfinityLabelBackOffset" },
  front: { on: "gridfinityLabelFront", width: "gridfinityLabelFrontWidth", length: "gridfinityLabelFrontLength", offset: "gridfinityLabelFrontOffset" },
  left: { on: "gridfinityLabelLeft", width: "gridfinityLabelLeftWidth", length: "gridfinityLabelLeftLength", offset: "gridfinityLabelLeftOffset" },
  right: { on: "gridfinityLabelRight", width: "gridfinityLabelRightWidth", length: "gridfinityLabelRightLength", offset: "gridfinityLabelRightOffset" },
} as const;
const LABEL_WALLS = Object.keys(GRIDFINITY_LABEL_WALL_KEYS) as GridfinityWall[];
/** The walls a shelf's two ends run into, its left end first as seen from inside the bin. */
const LABEL_SIDE_WALLS: Record<GridfinityWall, [GridfinityWall, GridfinityWall]> = { back: ["left", "right"], front: ["right", "left"], left: ["front", "back"], right: ["back", "front"] };
/** How far a shelf's piece reaches into the wall behind it and past the walls at its ends, cut off again at the bin's inside. */
const LABEL_PAST = 1;
/**
 * A set length that ends closer to a wall than this runs into it, as one does that stops this close in
 * front of a side shelf's front: a slot that narrow would not print. A side shelf meets this one only
 * when it reaches at least this far past its front.
 */
const LABEL_END_SNAP = 1;
/** The smallest a corner piece is squeezed down to, and the front left straight between two rounded front corners. */
const LABEL_MIN_FRONT = 1;
/** Kept between a corner piece and anything near it, and between a hidden end and the front of the shelf it is in. */
const LABEL_CLEARANCE = 0.5;
/** How far the lip's 45 degree support leans into the bin at the shelf's top: it starts 1.65 under the top, the shelf 0.85. */
const LABEL_LIP_LEAN = 0.8;

/**
 * A shelf's cross-section pushed along its wall from u = from to u = to; u runs left to right seen
 * from inside the bin, 0 in the middle. With `strip`, only the band of the straight front strip's
 * height, from the wall out to `width`.
 */
export type GridfinityLabelProfile = { wall: GridfinityWall; width: number; from: number; to: number; strip?: boolean };
/**
 * A corner piece over the plan: from `at`, legs of `size` along a and b; a triangle (chamfer), or
 * the square less a quarter circle (round). It reaches back beyond `at` by `reachA` against a and
 * `reachB` against b, into what it is cut from or into a wall, so that none of its faces lies exactly
 * on a face it trims or meets there.
 */
export type GridfinityLabelCornerShape = { at: FlatPoint; a: FlatPoint; b: FlatPoint; size: number; round: boolean; reachA: number; reachB: number };

/** The corner piece's outline over the plan, and for a round one the circle taken out of it. */
export function gridfinityLabelCornerOutline(c: GridfinityLabelCornerShape) {
  const point = (u: number, v: number) => ({ x: c.at.x + c.a.x * u + c.b.x * v, z: c.at.z + c.a.z * u + c.b.z * v });
  const ra = c.reachA;
  const rb = c.reachB;
  // Both shapes stay within `size` along a and b, beyond `at` only by the reach; a reach of 0 leaves a
  // point twice, which the kernel would take for an edge of no length.
  if (!c.round) {
    const outline = [point(-ra, -rb), point(c.size, -rb), point(c.size, 0), point(0, c.size), point(-ra, c.size)];
    return { outline: outline.filter((p, i) => { const q = outline[(i + 1) % outline.length]; return Math.hypot(p.x - q.x, p.z - q.z) > 1e-9; }), circle: null };
  }
  return { outline: [point(-ra, -rb), point(c.size, -rb), point(c.size, c.size), point(-ra, c.size)], circle: { centre: point(c.size, c.size), radius: c.size } };
}

export type GridfinityLabelPieces = {
  top: number;
  floor: number;
  /** The bin's inside the pieces are cut to: half sizes and corner radius of the inner wall. */
  inside: { hx: number; hz: number; radius: number };
  /** Each shelf, with the round corners taken off the front of a shelf that stops short of the walls. */
  shelves: Array<{ profile: GridfinityLabelProfile; notches: GridfinityLabelCornerShape[] }>;
  /** The rounding or chamfer where a shelf meets a wall or another shelf, trimmed to lie under the shelves it joins. */
  corners: Array<GridfinityLabelCornerShape & { under: GridfinityLabelProfile[] }>;
};

function clampLabel(value: number | undefined, fallback: number, min: number, max: number) {
  return Number.isFinite(value) ? clamp(value as number, min, max) : fallback;
}

/** The inner half sizes of a bin of this plan: from the middle to the inner wall, across and deep. */
function labelInside(plan: GridfinityPlan) {
  return { hx: plan.size.width / 2 - GRIDFINITY_WALL, hz: plan.size.depth / 2 - GRIDFINITY_WALL };
}

/** The rounding or chamfer the shelves are set to, in mm. */
function labelCornerSize(shape: GridfinityShapeFields) {
  return clampLabel(shape.gridfinityLabelCornerSize, DEFAULT_GRIDFINITY_LABEL_CORNER_SIZE, 0, MAX_GRIDFINITY_LABEL_CORNER_SIZE);
}

/**
 * The widest shelf a wall takes: its underside ends above the floor, and across the bin the
 * shelves and their corner pieces leave at least 2 mm open, between two shelves facing each
 * other or between a shelf and the wall opposite it, so the bin is never closed off.
 */
export function gridfinityLabelMaxWidth(shape: GridfinityShapeFields, wall: GridfinityWall) {
  const plan = gridfinityPlan(shape);
  const { hx, hz } = labelInside(plan);
  const size = labelCornerSize(shape);
  const max = (plan.top - LABEL_DROP - LABEL_LAND - GRIDFINITY_FOOT_HEIGHT - GRIDFINITY_FLOOR - LABEL_FLOOR_CLEARANCE) / LABEL_RISE;
  const [half, facing] = wall === "back" || wall === "front" ? [hz, wall === "back" ? shape.gridfinityLabelFront : shape.gridfinityLabelBack] : [hx, wall === "left" ? shape.gridfinityLabelRight : shape.gridfinityLabelLeft];
  return Math.min(max, facing ? half - 1 - size : 2 * half - 2 - size);
}

/** A wall's shelf width as it is built: its own, else 14 mm, within what the wall takes. */
export function gridfinityLabelWidth(shape: GridfinityShapeFields, wall: GridfinityWall) {
  const max = gridfinityLabelMaxWidth(shape, wall);
  return clampLabel(shape[GRIDFINITY_LABEL_WALL_KEYS[wall].width], Math.max(MIN_GRIDFINITY_LABEL_WIDTH, Math.min(DEFAULT_GRIDFINITY_LABEL_WIDTH, max)), MIN_GRIDFINITY_LABEL_WIDTH, Math.max(MIN_GRIDFINITY_LABEL_WIDTH, max));
}

/** A wall's set length as it is built: 0 for wall to wall, else at least LABEL_MIN_LENGTH. */
export function gridfinityLabelLength(shape: GridfinityShapeFields, wall: GridfinityWall) {
  const length = shape[GRIDFINITY_LABEL_WALL_KEYS[wall].length];
  return Number.isFinite(length) && (length as number) > 0 ? Math.max(LABEL_MIN_LENGTH, length as number) : 0;
}

/**
 * How close to a wall an end runs into it: LABEL_END_SNAP from the wall's face beside the shelf's top,
 * where the lip's support leans LABEL_LIP_LEAN into the bin.
 */
function labelEndSnap(plan: { lip: boolean }) {
  return LABEL_END_SNAP + (plan.lip ? LABEL_LIP_LEAN : 0);
}

/** Whether a shelf of this length on a wall of this half length runs from wall to wall: it would leave at most the snap at both ends. */
function labelFull(length: number, along: number, snap: number) {
  return length === 0 || length >= 2 * (along - snap);
}

/**
 * A wall's longest length worth setting (the wall itself), how far a shelf of its set length can
 * move in whole millimetres, as its slider steps (0 when it runs wall to wall; an end left less
 * than 1 mm from the wall runs into it anyway), and the bin's inside across the wall, the most a
 * width could be.
 */
export function gridfinityLabelLimits(shape: GridfinityShapeFields, wall: GridfinityWall) {
  const plan = gridfinityPlan(shape);
  const { hx, hz } = labelInside(plan);
  const [along, across] = wall === "back" || wall === "front" ? [hx, hz] : [hz, hx];
  const length = gridfinityLabelLength(shape, wall);
  return { length: 2 * along, offset: labelFull(length, along, labelEndSnap(plan)) ? 0 : Math.floor(along - length / 2), across: 2 * across };
}

/** A point of the bin's inside in the shape's frame from a wall's own (u along it, v out from it). */
function labelPoint(wall: GridfinityWall, hx: number, hz: number, u: number, v: number): FlatPoint {
  if (wall === "back") return { x: u, z: -hz + v };
  if (wall === "front") return { x: -u, z: hz - v };
  if (wall === "left") return { x: -hx + v, z: -u };
  return { x: hx - v, z: u };
}

/** The bin's label shelves as pieces for the mesh and the exact body, or null when it has none. */
export function gridfinityLabelPieces(shape: GridfinityShapeFields): GridfinityLabelPieces | null {
  const plan = gridfinityPlan(shape);
  if (plan.type !== "bin" || plan.count.y < MIN_GRIDFINITY_LABEL_HEIGHT_UNITS) return null;
  const walls = LABEL_WALLS.filter((wall) => shape[GRIDFINITY_LABEL_WALL_KEYS[wall].on] === true);
  if (walls.length === 0) return null;
  const size = labelCornerSize(shape);
  const round = (shape.gridfinityLabelCorner ?? DEFAULT_GRIDFINITY_LABEL_CORNER) !== "chamfer";
  const { hx, hz } = labelInside(plan);
  const alongOf = (wall: GridfinityWall) => (wall === "back" || wall === "front" ? hx : hz);
  const widthOf = (wall: GridfinityWall) => gridfinityLabelWidth(shape, wall);
  const snap = labelEndSnap(plan);
  // Each shelf's middle and length along its wall, and whether each end (0 at u = -along, 1 at u = along) stops short of the wall there.
  const spans = new Map(walls.map((wall) => {
    const along = alongOf(wall);
    const length = gridfinityLabelLength(shape, wall);
    if (labelFull(length, along, snap)) return [wall, { centre: 0, length: 2 * along, short: [false, false] }] as const;
    const setOffset = shape[GRIDFINITY_LABEL_WALL_KEYS[wall].offset];
    const offset = Number.isFinite(setOffset) ? (setOffset as number) : 0;
    // The offset is along the editor's axes: right on the back and front walls, towards the front on the sides.
    const sign = wall === "back" || wall === "right" ? 1 : -1;
    const centre = clamp(sign * offset, -along + length / 2, along - length / 2);
    return [wall, { centre, length, short: [centre - length / 2 > -along + snap, centre + length / 2 < along - snap] }] as const;
  }));
  // The wall at an end, which end of that wall's shelf is here, and whether it has a shelf.
  const across = (wall: GridfinityWall, end: number) => {
    const side = LABEL_SIDE_WALLS[wall][end];
    return { side, sideEnd: LABEL_SIDE_WALLS[side].indexOf(wall), on: spans.has(side) };
  };
  // How far an end stops from the wall there, and how far the shelf reaches out from that wall.
  const gap = (wall: GridfinityWall, end: number) => {
    const span = spans.get(wall)!;
    const sign = end === 0 ? -1 : 1;
    return alongOf(wall) - sign * (span.centre + sign * span.length / 2);
  };
  const reach = (wall: GridfinityWall, end: number) => 2 * alongOf(wall) - gap(wall, 1 - end);
  // How far the shelf on the wall at an end reaches past this shelf's front.
  const past = (wall: GridfinityWall, end: number) => {
    const { side, sideEnd, on } = across(wall, end);
    return on ? reach(side, sideEnd) - widthOf(wall) : -Infinity;
  };
  // Whether that shelf reaches past this front, and whether this end stops on it.
  const covered = (wall: GridfinityWall, end: number) => past(wall, end) >= LABEL_END_SNAP;
  const lands = (wall: GridfinityWall, end: number) => gap(wall, end) < widthOf(across(wall, end).side) + LABEL_END_SNAP;
  // A short end is free unless it stops on the shelf at that end where that shelf runs into this wall or also stops on this one.
  const freeEnds = new Map(walls.map((wall) => [wall, [0, 1].map((end) => {
    if (!spans.get(wall)!.short[end]) return false;
    const { side, sideEnd, on } = across(wall, end);
    if (!on || !lands(wall, end)) return true;
    return spans.get(side)!.short[sideEnd] && !lands(side, sideEnd);
  })]));
  const free = (wall: GridfinityWall, end: number) => freeEnds.get(wall)![end];
  // A free end inside the shelf at the other end, which runs into this wall and past this front, is hidden: it gets no finish.
  const hiddenEnds = new Map(walls.map((wall) => [wall, [0, 1].map((end) => {
    const { side, sideEnd, on } = across(wall, 1 - end);
    return free(wall, end) && on && !free(side, sideEnd) && covered(wall, 1 - end) && reach(wall, 1 - end) < widthOf(side) + LABEL_END_SNAP;
  })]));
  const hidden = (wall: GridfinityWall, end: number) => hiddenEnds.get(wall)![end];
  // A corner piece of the size wanted where there is room for it, else as much as there is, but not below LABEL_MIN_FRONT.
  const fit = (wanted: number, room: number) => (room >= wanted ? wanted : room >= LABEL_MIN_FRONT ? room : 0);
  const notchOf = (wall: GridfinityWall) => Math.min(size, widthOf(wall) / 2, (spans.get(wall)!.length - LABEL_MIN_FRONT) / 2);
  // The front of the shelf at an end left straight past this shelf's front, less its own rounded end and LABEL_CLEARANCE.
  const straight = (wall: GridfinityWall, end: number) => {
    const { side, sideEnd } = across(wall, end);
    return past(wall, end) - (round && free(side, 1 - sideEnd) ? notchOf(side) + LABEL_CLEARANCE : 0);
  };
  const direction = (wall: GridfinityWall, du: number, dv: number) => {
    const o = labelPoint(wall, hx, hz, 0, 0);
    const p = labelPoint(wall, hx, hz, du, dv);
    return { x: p.x - o.x, z: p.z - o.z };
  };
  const fullProfile = (wall: GridfinityWall, w: number): GridfinityLabelProfile => ({ wall, width: w, from: -alongOf(wall) - LABEL_PAST, to: alongOf(wall) + LABEL_PAST });
  const shelves: GridfinityLabelPieces["shelves"] = [];
  const corners: GridfinityLabelPieces["corners"] = [];
  walls.forEach((wall) => {
    const along = alongOf(wall);
    const width = widthOf(wall);
    const point = (u: number, v: number) => labelPoint(wall, hx, hz, u, v);
    const { centre, length } = spans.get(wall)!;
    const finished = [0, 1].map((end) => free(wall, end) && !hidden(wall, end));
    const [from, to] = [0, 1].map((end) => {
      const sign = end === 0 ? -1 : 1;
      if (!free(wall, end)) return sign * (along + LABEL_PAST);
      if (!hidden(wall, end)) return centre + sign * length / 2;
      return sign * Math.min(along - gap(wall, end), widthOf(across(wall, 1 - end).side) - LABEL_CLEARANCE - along);
    });
    const notch = notchOf(wall);
    const notches: GridfinityLabelCornerShape[] = [];
    // The cuts reach out past the shelf's end and front, so no sliver of either is left standing.
    if (round && notch > 0 && finished[0]) notches.push({ at: point(from, width), a: direction(wall, 1, 0), b: direction(wall, 0, -1), size: notch, round: true, reachA: LABEL_PAST, reachB: LABEL_PAST });
    if (round && notch > 0 && finished[1]) notches.push({ at: point(to, width), a: direction(wall, -1, 0), b: direction(wall, 0, -1), size: notch, round: true, reachA: LABEL_PAST, reachB: LABEL_PAST });
    shelves.push({ profile: { wall, width, from, to }, notches });
    // Beside a finished end, against the wall: short of its rounding, of the wall there and of a shelf on that wall that comes near.
    const endSize = (end: number) => {
      const { side, sideEnd, on } = across(wall, end);
      const s = Math.min(size, width - (round ? notch : 0) - LABEL_CLEARANCE, gap(wall, end) - LABEL_CLEARANCE);
      if (!on || gap(side, sideEnd) - size >= s + LABEL_CLEARANCE) return s;
      return fit(s, gap(wall, end) - widthOf(side) - size - LABEL_CLEARANCE);
    };
    const under = [fullProfile(wall, width)];
    if (finished[0] && endSize(0) > 0) corners.push({ at: point(from, 0), a: direction(wall, -1, 0), b: direction(wall, 0, 1), size: endSize(0), round, under, reachA: 0, reachB: LABEL_PAST });
    if (finished[1] && endSize(1) > 0) corners.push({ at: point(to, 0), a: direction(wall, 1, 0), b: direction(wall, 0, 1), size: endSize(1), round, under, reachA: 0, reachB: LABEL_PAST });
    // In front of an end that runs into the wall, against the wall or the shelf there: at most half the shelf's length.
    const meetSize = Math.min(size, length / 2);
    if (meetSize <= 0) return;
    [0, 1].forEach((end) => {
      if (free(wall, end)) return;
      const { side, sideEnd, on } = across(wall, end);
      const meets = on && !free(side, sideEnd) && covered(wall, end) && covered(side, sideEnd);
      const sideWidth = meets ? widthOf(side) : 0;
      let cornerSize = meetSize;
      if (meets) cornerSize = fit(Math.min(meetSize, spans.get(side)!.length / 2), Math.min(straight(wall, end), straight(side, sideEnd)));
      else if (on) {
        // None where the shelf on that wall stands in front of this one; clear of it where it starts beyond.
        const start = gap(side, sideEnd);
        if (start < width && covered(wall, end)) return;
        if (start >= width) cornerSize = fit(meetSize, start - width - size - LABEL_CLEARANCE);
      }
      if (cornerSize <= 0) return;
      // Where two shelves meet, the corner between their fronts is made once, by the first of the two.
      if (meets && walls.indexOf(side) < walls.indexOf(wall)) return;
      // Kept to the shelves and a band at the front strip's height, so nothing hangs down below the front edge.
      const strips = [fullProfile(wall, width), { ...fullProfile(wall, width + cornerSize), strip: true }];
      if (meets) strips.push(fullProfile(side, sideWidth), { ...fullProfile(side, sideWidth + cornerSize), strip: true });
      const inward = end === 0 ? 1 : -1;
      corners.push({ at: point((end === 0 ? -along : along) + inward * sideWidth, width), a: direction(wall, inward, 0), b: direction(wall, 0, 1), size: cornerSize, round, under: strips, reachA: LABEL_PAST, reachB: 0 });
    });
  });
  return { top: plan.top - LABEL_DROP, floor: GRIDFINITY_FOOT_HEIGHT + GRIDFINITY_FLOOR, inside: { hx, hz, radius: GRIDFINITY_BIN_RADIUS - GRIDFINITY_WALL }, shelves, corners };
}

/** The shelf's cross-section, wall side first: top, the straight strip at the front, the underside back down to the wall. */
function labelSection(pieces: GridfinityLabelPieces, width: number, strip = false): Array<[v: number, y: number]> {
  const top = pieces.top;
  if (strip) return [[-LABEL_PAST, top], [width, top], [width, top - LABEL_LAND], [-LABEL_PAST, top - LABEL_LAND]];
  const bottom = top - LABEL_LAND - width * LABEL_RISE;
  // The underside carries on into the wall, so no corner of the profile lies on the wall's face.
  return [[-LABEL_PAST, top], [width, top], [width, top - LABEL_LAND], [-LABEL_PAST, bottom - LABEL_PAST * LABEL_RISE]];
}

/** The profile's cross-section at its two ends, as points in the shape's frame (x, y, z). */
export function gridfinityLabelProfileEnds(pieces: GridfinityLabelPieces, profile: GridfinityLabelProfile) {
  const { hx, hz } = pieces.inside;
  const at = (u: number) => labelSection(pieces, profile.width, profile.strip).map(([v, y]): Vec3 => {
    const p = labelPoint(profile.wall, hx, hz, u, v);
    return [p.x, y, p.z];
  });
  return { start: at(profile.from), end: at(profile.to) };
}

/**
 * The bin's wall from the outside over the top to the floor inside, as insets
 * from the outline: up the outer wall, over the lip (or the flat top of a bin
 * without one), down the inside to the floor. The lip rests on a 45 degree
 * support that grows out of the wall below it.
 */
export function gridfinityWallProfile(plan: GridfinityPlan): GridfinityStep[] {
  const floor = GRIDFINITY_FOOT_HEIGHT + GRIDFINITY_FLOOR;
  const top = plan.top;
  if (!plan.lip) return [[0, GRIDFINITY_FOOT_HEIGHT], [0, top], [GRIDFINITY_WALL, top], [GRIDFINITY_WALL, floor]];
  const profile: GridfinityStep[] = [[0, GRIDFINITY_FOOT_HEIGHT]];
  [...LIP].reverse().forEach(([inset, y]) => profile.push([inset, top + y]));
  const support = LIP[0][0] - GRIDFINITY_WALL;
  // A low bin has no straight wall inside: the support runs down to the floor.
  if (top - support > floor) profile.push([GRIDFINITY_WALL, top - support], [GRIDFINITY_WALL, floor]);
  else profile.push([LIP[0][0] - (top - floor), floor]);
  return profile;
}

type LoopPoint = { x: number; z: number; nx: number; nz: number };

/**
 * A rounded rectangle centred on (cx, cz), half sizes hx and hz, corner
 * radius `radius`, set in by `inset` with its corner centres kept. The points
 * on the straight sides are the corner ends plus `breaksX` (on the two sides
 * along x) and `breaksZ`, so that outlines of one family match point for
 * point.
 */
function roundedLoop(cx: number, cz: number, hx: number, hz: number, radius: number, inset: number, breaksX: number[] = [], breaksZ: number[] = []): LoopPoint[] {
  const ax = hx - radius;
  const az = hz - radius;
  const r = radius - inset;
  const points: LoopPoint[] = [];
  const side = (fromX: number, fromZ: number, toX: number, toZ: number, nx: number, nz: number, breaks: number[]) => {
    points.push({ x: fromX, z: fromZ, nx, nz });
    const along = fromX !== toX;
    const ordered = breaks.filter((b) => (along ? b > Math.min(fromX, toX) + 1e-9 && b < Math.max(fromX, toX) - 1e-9 : b > Math.min(fromZ, toZ) + 1e-9 && b < Math.max(fromZ, toZ) - 1e-9));
    ordered.sort((a, b) => (along ? (toX > fromX ? a - b : b - a) : toZ > fromZ ? a - b : b - a));
    ordered.forEach((b) => points.push(along ? { x: b, z: fromZ, nx, nz } : { x: fromX, z: b, nx, nz }));
    points.push({ x: toX, z: toZ, nx, nz });
  };
  const corner = (ox: number, oz: number, from: number) => {
    for (let k = 1; k < CORNER_STEPS; k += 1) {
      const angle = from + (k / CORNER_STEPS) * (Math.PI / 2);
      points.push({ x: ox + r * Math.cos(angle), z: oz + r * Math.sin(angle), nx: Math.cos(angle), nz: Math.sin(angle) });
    }
  };
  side(cx - ax, cz - az - r, cx + ax, cz - az - r, 0, -1, breaksX);
  corner(cx + ax, cz - az, -Math.PI / 2);
  side(cx + ax + r, cz - az, cx + ax + r, cz + az, 1, 0, breaksZ);
  corner(cx + ax, cz + az, 0);
  side(cx + ax, cz + az + r, cx - ax, cz + az + r, 0, 1, breaksX);
  corner(cx - ax, cz + az, Math.PI / 2);
  side(cx - ax - r, cz + az, cx - ax - r, cz - az, -1, 0, breaksZ);
  corner(cx - ax, cz - az, Math.PI);
  return points;
}

type Vec3 = [number, number, number];
type Box = { x0: number; x1: number; z0: number; z1: number; edge: (sign: number, axis: "x" | "z") => boolean };

/**
 * The display body as closed, watertight triangles. Walls are strips between
 * outlines of one family; the flat parts (the bin's underside between its
 * feet, the baseplate's top and bottom) are the ring between each grid cell
 * and the foot or socket in it - a strip along each side and a fan from each
 * corner of the cell, both left out where they have no width.
 */
export function gridfinityTriangles(shape: GridfinityShapeFields) {
  const plan = gridfinityPlan(shape);
  const triangles: Vec3[][] = [];
  const push = (a: Vec3, b: Vec3, c: Vec3, want: Vec3) => {
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
    if (Math.hypot(n[0], n[1], n[2]) < 1e-12) return;
    triangles.push(n[0] * want[0] + n[1] * want[1] + n[2] * want[2] >= 0 ? [a, b, c] : [a, c, b]);
  };
  const at = (p: { x: number; z: number }, y: number): Vec3 => [p.x, y, p.z];

  /** Strips between the outlines of a profile; `outside` is +1 where the material is inside the outline, -1 where it is outside (a socket). */
  const sweep = (loop: (inset: number) => LoopPoint[], profile: GridfinityStep[], outside: 1 | -1) => {
    for (let s = 0; s + 1 < profile.length; s += 1) {
      const [i0, y0] = profile[s];
      const [i1, y1] = profile[s + 1];
      if (Math.abs(i0 - i1) < 1e-12 && Math.abs(y0 - y1) < 1e-12) continue;
      const a = loop(i0);
      const b = loop(i1);
      // Walking the profile with the material on the left: the face points to the right of the walk.
      const dOut = -(i1 - i0);
      const dy = y1 - y0;
      const nOut = dy * outside;
      const nY = -dOut * outside;
      a.forEach((p, k) => {
        const q = a[(k + 1) % a.length];
        const pb = b[k];
        const qb = b[(k + 1) % b.length];
        const want: Vec3 = [p.nx * nOut, nY, p.nz * nOut];
        push(at(p, y0), at(q, y0), at(qb, y1), want);
        push(at(p, y0), at(qb, y1), at(pb, y1), want);
      });
    }
  };
  /** A flat face inside an outline, with holes. */
  const cap = (outline: Array<{ x: number; z: number }>, holes: Array<Array<{ x: number; z: number }>>, y: number, up: 1 | -1) => {
    const contour = outline.map((p) => new THREE.Vector2(p.x, p.z));
    const holeVectors = holes.map((hole) => hole.map((p) => new THREE.Vector2(p.x, p.z)));
    const all = [...outline, ...holes.flat()];
    THREE.ShapeUtils.triangulateShape(contour, holeVectors).forEach(([a, b, c]) => push(at(all[a], y), at(all[b], y), at(all[c], y), [0, up, 0]));
  };
  /**
   * The ring between a grid cell and the rounded square in it, at height y:
   * a strip along each side where the square stays clear of the cell's edge,
   * a fan from each corner of the cell to the arc in front of it. Where the
   * cell's corner is the body's own rounded corner there is no point to fan
   * from: with `outer` (the body's outline in that cell) the strip between the
   * two arcs fills it, without it the arcs are the same and nothing is left.
   */
  const ring = (inner: LoopPoint[], box: Box, y: number, up: 1 | -1, outer?: LoopPoint[]) => {
    const per = inner.length / 4;
    const want: Vec3 = [0, up, 0];
    const project = (p: LoopPoint) => ({ x: p.nx > 0.5 ? box.x1 : p.nx < -0.5 ? box.x0 : p.x, z: p.nz > 0.5 ? box.z1 : p.nz < -0.5 ? box.z0 : p.z });
    const touches = (p: LoopPoint) => {
      const q = project(p);
      return Math.abs(q.x - p.x) < 1e-9 && Math.abs(q.z - p.z) < 1e-9;
    };
    for (let s = 0; s < 4; s += 1) {
      const a = inner[s * per];
      const b = inner[s * per + 1];
      if (!touches(a)) {
        push(at(a, y), at(b, y), at(project(b), y), want);
        push(at(a, y), at(project(b), y), at(project(a), y), want);
      }
      // The corner after this side: from its end round the arc to the next side's start.
      const end = inner[s * per + 1];
      const next = inner[((s + 1) % 4) * per];
      const arc = [end, ...inner.slice(s * per + 2, (s + 1) * per), next];
      const sx = end.nx + next.nx > 0 ? 1 : -1;
      const sz = end.nz + next.nz > 0 ? 1 : -1;
      if (box.edge(sx, "x") && box.edge(sz, "z")) {
        if (!outer) continue;
        const outerArc = [outer[s * per + 1], ...outer.slice(s * per + 2, (s + 1) * per), outer[((s + 1) % 4) * per]];
        for (let k = 0; k + 1 < arc.length; k += 1) {
          push(at(arc[k], y), at(outerArc[k], y), at(outerArc[k + 1], y), want);
          push(at(arc[k], y), at(outerArc[k + 1], y), at(arc[k + 1], y), want);
        }
        continue;
      }
      const cornerPoint = { x: sx > 0 ? box.x1 : box.x0, z: sz > 0 ? box.z1 : box.z0 };
      const fan: Array<{ x: number; z: number }> = [];
      if (!touches(end)) fan.push(project(end));
      fan.push(...arc);
      if (!touches(next)) fan.push(project(next));
      for (let k = 0; k + 1 < fan.length; k += 1) push(at(cornerPoint, y), at(fan[k], y), at(fan[k + 1], y), want);
    }
  };
  const circle = (c: { x: number; z: number }) => Array.from({ length: MAGNET_SIDES }, (_, k) => {
    const angle = (2 * Math.PI * k) / MAGNET_SIDES;
    return { x: c.x + (GRIDFINITY_MAGNET_DIAMETER / 2) * Math.cos(angle), z: c.z + (GRIDFINITY_MAGNET_DIAMETER / 2) * Math.sin(angle) };
  });

  const { size, cells, count } = plan;
  const half = (n: number) => (n * GRIDFINITY_GRID) / 2;
  const cellHalf = plan.type === "bin" ? GRIDFINITY_GRID / 2 - GRIDFINITY_CLEARANCE : GRIDFINITY_GRID / 2;
  const radius = plan.type === "bin" ? GRIDFINITY_BIN_RADIUS : GRIDFINITY_BASEPLATE_RADIUS;
  // Points on the long sides: every grid line inside, and where each foot or socket's corner begins.
  const breaks = (n: number) => {
    const values: number[] = [];
    for (let i = 0; i < n; i += 1) {
      const c = (i - (n - 1) / 2) * GRIDFINITY_GRID;
      values.push(c - cellHalf + radius, c + cellHalf - radius);
      if (i < n - 1) values.push(c + GRIDFINITY_GRID / 2);
    }
    return values;
  };
  const breaksX = breaks(count.x);
  const breaksZ = breaks(count.z);
  const outline = (inset: number) => roundedLoop(0, 0, size.width / 2, size.depth / 2, radius, inset, breaksX, breaksZ);
  const cellOf = (cell: (typeof cells)[number], inset: number) => roundedLoop(cell.x, cell.z, cellHalf, cellHalf, radius, inset);
  // A cell's box, cut back to the body's outline at the edge; edge() says whether a side is the body's own.
  const cellBox = (cell: (typeof cells)[number]): Box => ({
    x0: cell.i === 0 ? -size.width / 2 : cell.x - GRIDFINITY_GRID / 2,
    x1: cell.i === count.x - 1 ? size.width / 2 : cell.x + GRIDFINITY_GRID / 2,
    z0: cell.j === 0 ? -size.depth / 2 : cell.z - GRIDFINITY_GRID / 2,
    z1: cell.j === count.z - 1 ? size.depth / 2 : cell.z + GRIDFINITY_GRID / 2,
    edge: (sign, axis) => (axis === "x" ? (sign > 0 ? cell.i === count.x - 1 : cell.i === 0) : sign > 0 ? cell.j === count.z - 1 : cell.j === 0),
  });

  if (plan.type === "bin") {
    const wall = gridfinityWallProfile(plan);
    sweep(outline, wall, 1);
    const [floorInset, floorY] = wall[wall.length - 1];
    cap(outline(floorInset), [], floorY, 1);
    cells.forEach((cell) => {
      sweep((inset) => cellOf(cell, inset), GRIDFINITY_FOOT, 1);
      ring(cellOf(cell, 0), cellBox(cell), GRIDFINITY_FOOT_HEIGHT, -1);
      const holes = plan.magnetHoles.filter((hole) => Math.abs(hole.x - cell.x) < half(1) && Math.abs(hole.z - cell.z) < half(1)).map(circle);
      cap(cellOf(cell, GRIDFINITY_FOOT[0][0]), holes, 0, -1);
      holes.forEach((hole) => {
        hole.forEach((p, k) => {
          const q = hole[(k + 1) % hole.length];
          const centre = { x: hole.reduce((sum, h) => sum + h.x, 0) / hole.length, z: hole.reduce((sum, h) => sum + h.z, 0) / hole.length };
          const want: Vec3 = [centre.x - p.x, 0, centre.z - p.z];
          push(at(p, 0), at(q, 0), at(q, GRIDFINITY_MAGNET_DEPTH), want);
          push(at(p, 0), at(q, GRIDFINITY_MAGNET_DEPTH), at(p, GRIDFINITY_MAGNET_DEPTH), want);
        });
        cap(hole, [], GRIDFINITY_MAGNET_DEPTH, -1);
      });
    });
  } else {
    sweep(outline, [[0, 0], [0, GRIDFINITY_BASEPLATE_HEIGHT]], 1);
    cells.forEach((cell) => {
      sweep((inset) => cellOf(cell, inset), GRIDFINITY_SOCKET, -1);
      ring(cellOf(cell, 0), cellBox(cell), GRIDFINITY_BASEPLATE_HEIGHT, 1);
      ring(cellOf(cell, GRIDFINITY_SOCKET[0][0]), cellBox(cell), 0, -1, cellOf(cell, 0));
    });
  }

  return triangles;
}

/** Segments round a full circle in the shelves' corners and in the bin's inside they are cut to. */
const LABEL_CIRCLE_SEGMENTS = 32;
/** The inside the shelves are cut to reaches this far into the wall, below the floor and above the top, so no sliver is left between the two polygons of a round corner. */
const LABEL_INSIDE_OVERLAP = 0.05;
/**
 * In the display mesh the shelf pieces are moved together by this much, differently along each axis
 * (down, so the stacking gap only grows): whole-millimetre settings put a piece's edge exactly on an
 * edge or vertex of the bin's polygon (where the wall starts to curve, the top of the lip's support,
 * or a crease on the corner's 45 degree line), which Manifold resolves into a pinch. Far below
 * anything printed; the exact body has true arcs and is not moved.
 */
const LABEL_MESH_NUDGE: Vec3 = [1.3e-3, -0.9e-3, 0.7e-3];
/** Slivers thinner than this, left where pieces meet exactly on the bin's own vertices, are removed. */
const LABEL_SLIVER = 1e-4;

/**
 * The bin with its label shelves as closed triangles: the bin's own mesh, and the shelves' convex
 * pieces joined to it by Manifold, which keeps the result closed. Without shelves it is
 * gridfinityTriangles.
 */
export function gridfinityLabelledTriangles(runtime: ManifoldToplevel, shape: GridfinityShapeFields): Vec3[][] {
  const base = gridfinityTriangles(shape);
  const pieces = gridfinityLabelPieces(shape);
  if (!pieces) return base;
  const { Manifold } = runtime;
  const made: Array<{ delete: () => void }> = [];
  const keep = <T extends { delete: () => void }>(value: T) => {
    made.push(value);
    return value;
  };
  try {
    // The bin's triangles welded into an indexed mesh (meshDataToManifoldMesh would close an import cycle here).
    const ids = new Map<string, number>();
    const vertices: number[] = [];
    const triVerts: number[] = [];
    base.forEach((triangle) => triangle.forEach((v) => {
      const key = v.map((n) => Math.round(n * 1e5)).join(",");
      if (!ids.has(key)) {
        ids.set(key, ids.size);
        vertices.push(...v);
      }
      triVerts.push(ids.get(key)!);
    }));
    const mesh = new runtime.Mesh({ numProp: 3, vertProperties: new Float32Array(vertices), triVerts: new Uint32Array(triVerts) });
    mesh.merge();
    const bin = keep(new Manifold(mesh));
    const y0 = pieces.floor - LABEL_INSIDE_OVERLAP;
    const height = pieces.top - y0 + LABEL_INSIDE_OVERLAP;
    // A cylinder standing on y = y0 at (x, z).
    const post = (x: number, z: number, radius: number) => {
      const lying = keep(Manifold.cylinder(height, radius, radius, LABEL_CIRCLE_SEGMENTS));
      const standing = keep(lying.rotate([-90, 0, 0]));
      return keep(standing.translate([x, y0, z]));
    };
    const { hx, hz, radius } = pieces.inside;
    const r = radius + LABEL_INSIDE_OVERLAP;
    const inside = keep(Manifold.hull([post(-hx + radius, -hz + radius, r), post(hx - radius, -hz + radius, r), post(hx - radius, hz - radius, r), post(-hx + radius, hz - radius, r)]));
    const profile = (p: GridfinityLabelProfile) => {
      const { start, end } = gridfinityLabelProfileEnds(pieces, p);
      return keep(Manifold.hull([...start, ...end]));
    };
    const cornerShape = (c: GridfinityLabelCornerShape) => {
      const { outline, circle } = gridfinityLabelCornerOutline(c);
      const block = keep(Manifold.hull(outline.flatMap((p): Vec3[] => [[p.x, y0, p.z], [p.x, y0 + height, p.z]])));
      return circle ? keep(block.subtract(post(circle.centre.x, circle.centre.z, circle.radius))) : block;
    };
    const parts = [
      ...pieces.shelves.map(({ profile: p, notches }) => notches.reduce((solid, notch) => keep(solid.subtract(cornerShape(notch))), profile(p))),
      ...pieces.corners.map((c) => keep(cornerShape(c).intersect(c.under.length === 1 ? profile(c.under[0]) : keep(Manifold.union(c.under.map(profile)))))),
    ].map((part) => keep(keep(part.intersect(inside)).translate(LABEL_MESH_NUDGE)));
    const result = keep(keep(Manifold.union([bin, ...parts])).simplify(LABEL_SLIVER));
    if (result.status() !== "NoError") return base;
    const out = result.getMesh();
    const triangles: Vec3[][] = [];
    for (let t = 0; t < out.triVerts.length; t += 3) {
      triangles.push([0, 1, 2].map((k) => {
        const i = out.triVerts[t + k] * out.numProp;
        return [out.vertProperties[i], out.vertProperties[i + 1], out.vertProperties[i + 2]] as Vec3;
      }));
    }
    return triangles;
  } catch {
    // The bin is drawn without its shelves rather than not at all.
    return base;
  } finally {
    new Set(made).forEach((value) => value.delete());
  }
}

/**
 * The bin's triangles with its label shelves. They need Manifold: until it has loaded the bin is
 * drawn without them and asks for it, and the viewport draws it again once it is there
 * (manifoldRevision in its cache key).
 */
function gridfinityDisplayTriangles(shape: GridfinityShapeFields) {
  if (!gridfinityLabelPieces(shape)) return gridfinityTriangles(shape);
  const runtime = loadedManifoldRuntime();
  if (!runtime) {
    requestManifoldRuntime();
    return gridfinityTriangles(shape);
  }
  return gridfinityLabelledTriangles(runtime, shape);
}

/** A closed, watertight bin or baseplate from y = 0 up, centred on x and z. */
export function createGridfinityGeometry(shape: GridfinityShapeFields): THREE.BufferGeometry {
  const positions: number[] = [];
  gridfinityDisplayTriangles(shape).forEach((triangle) => triangle.forEach((vertex) => positions.push(...vertex)));
  const raw = new THREE.BufferGeometry();
  raw.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const geometry = toCreasedNormals(raw, THREE.MathUtils.degToRad(30));
  raw.dispose();
  geometry.computeBoundingBox();
  return geometry;
}
