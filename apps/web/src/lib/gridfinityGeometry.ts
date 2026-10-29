import * as THREE from "three";
import { toCreasedNormals } from "@/lib/creasedNormals";
import type { ManifoldToplevel } from "manifold-3d";
import { loadedManifoldRuntime, requestManifoldRuntime } from "@/lib/manifoldHandle";
import type { GridfinityCompartmentLabel, GridfinityLabelCorner, GridfinityOpening, GridfinityType, WorkplaneShape } from "@/types/layerling";

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
 * The wall (0.95 mm unless it is set), the floor (1.2 mm) and the depth of the
 * magnet holes (2.4 mm) are not in the specification; the floor and the holes'
 * depth are fixed here. The top of the lip is sharp as drawn; the edge tool
 * rounds it. A baseplate has no magnet holes: the specification's plate is an
 * open frame with nothing to hold one.
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
 *
 * A bin can also have a finger scoop along any of its inner walls (#455),
 * which the specification does not have either: the floor rises along a
 * quarter circle into the wall, from wall to wall, so small parts can be
 * pushed out. Unless it is set, the radius is half the height from the floor
 * up to where the lip's support leaves the wall, or to the top without the
 * lip. A bin with a scoop has every inner floor edge rounded as much as its
 * inner corners, 2.8 mm with a wall of 0.95 (the wall profile's last step,
 * filleted in the exact body), and the scoop is that rounding made large on its
 * wall.
 * The scoops come from the same pieces in both kernels (gridfinityScoopPieces):
 * joined like the shelves in the mesh, cut out of the inside in the exact body.
 *
 * A bin can also be made on a half-size grid (#455): its size counts cells of
 * 21 mm, each with a foot of its own, four to a baseplate's socket. Like the
 * common generators' half-size bins, it changes only the grid: a bin is still
 * 0.5 mm smaller than its cells, a foot has the same steps and corners (20.5 mm
 * across at the top), and the lip follows the outline. The magnet holes, one
 * under each foot, stay where a baseplate with magnets from another generator
 * has them.
 *
 * A bin's floor can be raised (#455), for a bin blank to cut shapes into: the
 * bin is solid up to it, at most to where the lip's support leaves the wall,
 * or to the top without the lip. Scoops start on the raised floor, and shelves
 * can reach less far out above it.
 *
 * A bin can also be divided into compartments (#554), across and deep, by
 * dividers that run the full height up to 0.85 mm under the top, where the
 * label shelves stop, so a bin stacked on it sits as before. They start evenly
 * spaced and can be moved one by one, measured from the inside of the wall to
 * their middle, as long as every compartment stays at least 6 mm wide: the
 * kernel's cut fails on narrower ones. A bin takes at most 4 compartments a
 * grid unit each way and 40 in all, which keep it quick to build.
 *
 * A bin can also be open on any of its sides (#682), so that bins standing side
 * by side make one long run: above the floor an open side has no wall and no
 * lip, and the walls beside it run straight out to the outline and end square
 * there, 0.5 mm from the next bin as between any two. The corners on an open
 * side are square from the top of the feet up, so the floor is flat out to the
 * edge. The inside and the compartments are cut by cutters that run on past the
 * outline far enough for their roundings to lie beyond it, and the pieces joined
 * to the walls beside an open side are cut off at the outline. A shelf or a
 * scoop set on an open side is not built.
 *
 * A baseplate can be padded on any side (#455), so that it fills a drawer that
 * is not whole units: a solid border at its height outside the grid, which
 * moves away from the padded sides. The box takes the padding in, and the units
 * are read from it less the padding. The outer cells' flat top and bottom reach
 * out to the padded outline, and a padded outer corner, whose rounding no longer
 * meets the cell's, is filled between the two. A baseplate's outer corners can
 * be rounded less than the specification's 4 mm, down to square (#856), filled
 * the same way; the sockets keep their rounding, so bins fit as before.
 *
 * The lip's top can be chamfered (#780) as the edge tool would: the chamfer
 * takes its size off the outer wall and off the slope a stacked bin's feet rest
 * on. The bin keeps its height setting, and its top comes down by 0.71 times it.
 *
 * The bin's wall can be set from 0.8 mm up to where the walls meet: its inside
 * face is the outline set in by it, with the corner centres kept, so the inner
 * corners are rounded by 3.75 mm less the wall and square from a wall of
 * 3.75 mm; the outside, the feet and the lip never change. With the lip, a wall
 * over 1.75 mm stops at a flat ledge 0.85 mm under 7 mm per height unit, where
 * the shelves and dividers stop, 0.5 mm clear of a stacked bin's feet, and the
 * floor goes no higher. Where the walls leave less than 1 mm inside, the bin is
 * solid. Scoops and shelves that no longer have room are left out, and fewer
 * compartments are built and offered.
 *
 * A Gridfinity shape can also be a tray (#837), for board game inserts and parts
 * that need no grid: a bin of any size in mm with a flat bottom, no feet, no lip
 * and no magnet holes, standing on y = 0. Its walls, floor, compartments,
 * scoops, shelves and open sides are built as a bin's, and its dividers and
 * shelves run up to the top, as nothing stacks on it.
 *
 * A bin's outer corners can be rounded less than the specification's 3.75 mm,
 * down to square (#856), so bins side by side in a drawer leave only their
 * 0.5 mm gaps where four of them meet. Only the outer wall above the feet takes
 * it: the feet, the inside and the slopes of the lip a stacked bin's feet rest
 * on keep their rounding, and 3.75 mm stays on the wall's first 0.5 mm over the
 * feet, so on a bin within one socket, which sits down on the slopes, the square
 * corners start 0.25 mm over the plate's top. In each corner the wall is filled
 * out between the two roundings, flat at the band's top and at the wall's top,
 * where it meets the lip or its chamfer.
 */

export const GRIDFINITY_GRID = 42;
export const GRIDFINITY_HEIGHT_UNIT = 7;
export const GRIDFINITY_LIP_HEIGHT = 4.4;
export const GRIDFINITY_BASEPLATE_HEIGHT = 5;
export const GRIDFINITY_FOOT_HEIGHT = 4.75;
export const GRIDFINITY_CLEARANCE = 0.25;
export const GRIDFINITY_BIN_RADIUS = 3.75;
export const GRIDFINITY_BASEPLATE_RADIUS = 4;
/** The bin's wall unless it is set: not in the specification. */
export const DEFAULT_GRIDFINITY_WALL_THICKNESS = 0.95;
/** The thinnest wall: two lines of a 0.4 mm nozzle. The thickest is where the walls meet. */
export const MIN_GRIDFINITY_WALL_THICKNESS = 0.8;
export const GRIDFINITY_FLOOR = 1.2;
export const GRIDFINITY_MAGNET_DIAMETER = 6.5;
export const GRIDFINITY_MAGNET_DEPTH = 2.4;
export const GRIDFINITY_MAGNET_OFFSET = 13;
export const MIN_GRIDFINITY_UNITS = 1;
export const MAX_GRIDFINITY_UNITS = 6;
export const MAX_GRIDFINITY_HEIGHT_UNITS = 20;
/** The most padding on a side of a baseplate: 42 mm would be room for another unit of grid. */
export const MAX_GRIDFINITY_PADDING = GRIDFINITY_GRID - 1;
/** How much smaller than the drawer a baseplate fitted to it is, so that it drops in. */
export const GRIDFINITY_DRAWER_CLEARANCE = 0.5;
/** The smallest and largest drawer one baseplate fits: 1 unit, or 6 units and 41 mm each side. */
export const MIN_GRIDFINITY_DRAWER = MIN_GRIDFINITY_UNITS * GRIDFINITY_GRID + GRIDFINITY_DRAWER_CLEARANCE;
export const MAX_GRIDFINITY_DRAWER = MAX_GRIDFINITY_UNITS * GRIDFINITY_GRID + 2 * MAX_GRIDFINITY_PADDING + GRIDFINITY_DRAWER_CLEARANCE;
export const DEFAULT_GRIDFINITY_TYPE: GridfinityType = "bin";
export const DEFAULT_GRIDFINITY_UNITS = { x: 2, z: 1, y: 3 };
export const DEFAULT_GRIDFINITY_LIP = true;
export const DEFAULT_GRIDFINITY_MAGNETS = false;
/** A tray's size (#837): free in mm, from a 10 mm square, whose 3.75 mm corners still fit a wall, up to six grid units, 252 mm. */
export const MIN_GRIDFINITY_TRAY_SIZE = 10;
export const MAX_GRIDFINITY_TRAY_SIZE = MAX_GRIDFINITY_UNITS * GRIDFINITY_GRID;
/** A tray's height: at least the 1.2 mm floor and a wall above it, at most the 20 height units of the tallest bin. */
export const MIN_GRIDFINITY_TRAY_HEIGHT = 3;
export const MAX_GRIDFINITY_TRAY_HEIGHT = MAX_GRIDFINITY_HEIGHT_UNITS * GRIDFINITY_HEIGHT_UNIT;
/** A new tray's size, and the height a baseplate turned into a tray gets. */
export const DEFAULT_GRIDFINITY_TRAY_SIZE = { width: 80, depth: 40, height: 20 };
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
/** The smallest scoop radius: below about 3.2 mm the floor's 2.8 mm rounding (the inner corners' radius with a wall of 0.95) still shows through the sunk scoop. */
export const MIN_GRIDFINITY_SCOOP_RADIUS = 3.5;
/** The lowest floor inside a bin, measured from the underside: the 1.2 mm floor on the feet. */
export const MIN_GRIDFINITY_FLOOR_HEIGHT = GRIDFINITY_FOOT_HEIGHT + GRIDFINITY_FLOOR;
/** A floor this close under the highest the bin takes is raised onto it, so no sliver of wall is left between them. */
const FLOOR_SNAP = 0.05;
/** A baseplate's corner radius this close under the sockets' 4 mm is built as 4 (#856), so no sliver of flat face under 0.05 mm wide is left between the two roundings; likewise a bin's within 0.05 mm under 3.75. */
const CORNER_SNAP = 0.05;
/** How far over the feet's top a bin's outer wall keeps the feet's 3.75 mm corners before it takes its own (#856), so on a bin within one socket its corners rounded less start 0.25 mm over the plate's top. */
export const GRIDFINITY_BIN_CORNER_BAND = 0.5;
export const DEFAULT_GRIDFINITY_DIVIDER_THICKNESS = 1.2;
export const MIN_GRIDFINITY_DIVIDER_THICKNESS = 0.8;
export const MAX_GRIDFINITY_DIVIDER_THICKNESS = 3;
/** The largest chamfer on the lip's top: it takes the top 1 mm of the 2.69 mm slope a stacked bin's feet rest on. */
export const MAX_GRIDFINITY_LIP_CHAMFER = 1;
/** The shallowest and the narrowest partial opening of a side (#455), in mm. */
export const MIN_GRIDFINITY_OPENING_DEPTH = 2;
export const MIN_GRIDFINITY_OPENING_WIDTH = 5;
/** A notch's corner (#455) smaller than this (mm) is built square, as the panel's smallest step. */
const OPENING_CORNER_MIN = 0.5;
/** A corner set this close (mm) under the room the notch leaves takes all of that room, so no sliver of wall is left beside it. */
const OPENING_CORNER_SNAP = 0.01;
/** How far (mm) what a corner makes stays from another edge of the wall, more than this: the shortest edge the kernel keeps. */
const OPENING_CORNER_CLEAR = 0.01;
/** The most (mm) a corner comes down to keep that clear; with nothing clear within it, it keeps its size. */
const OPENING_CORNER_GIVE = 0.5;
/** An opening this close to the full wall or to the floor (mm) opens it fully, so no sliver of wall is left beside it. */
const OPENING_SNAP = 0.5;
/** An opening's bottom this close to the ledge and the dividers' top (mm) moves off it, so their faces never meet. */
const OPENING_LEDGE_CLEAR = 0.05;
/** The narrowest compartment: the kernel's cut fails below about 5.6 mm and leaves slivers up to 5.65. */
export const MIN_GRIDFINITY_COMPARTMENT = 6;
/** The most compartments a grid unit of 42 mm takes each way. */
export const GRIDFINITY_COMPARTMENTS_PER_UNIT = 4;
/** The most compartments a bin takes in all: at 50 with front and back scoops the exact body took up to 19.9 s to build in the browser (with labels). */
export const MAX_GRIDFINITY_COMPARTMENTS = 40;
/** The least height a divider stands above the floor. */
const MIN_GRIDFINITY_DIVIDER_HEIGHT = 3;

/** Section of a foot, a socket or the wall: inset from the outline, at a height. */
export type GridfinityStep = [inset: number, y: number];

/** From the bottom: 0.8 at 45 degrees, 1.8 straight, 2.15 at 45 degrees, inset from the bin's outline in its cell (41.5 mm, or 20.5 on the half-size grid). */
export const GRIDFINITY_FOOT: GridfinityStep[] = [[2.95, 0], [2.15, 0.8], [2.15, 2.6], [0, 4.75]];
/** The baseplate's socket, inset from the 42 mm cell: a 0.35 band, then 0.7 at 45 degrees, 1.8 straight, 2.15 at 45 degrees. */
export const GRIDFINITY_SOCKET: GridfinityStep[] = [[2.85, 0], [2.85, 0.35], [2.15, 1.05], [2.15, 2.85], [0, 5]];
/** The lip's inner face, from where it leaves the support to the sharp top on the outer wall. */
const LIP: GridfinityStep[] = [[2.6, 0], [1.9, 0.7], [1.9, 2.5], [0, 4.4]];
/** How far in the lip's support is at the ledge, 0.85 mm under 7 mm per height unit (LABEL_DROP): a wall thicker than this stops at a ledge. */
export const GRIDFINITY_LEDGE_INSET = LIP[0][0] - LABEL_DROP;

const CORNER_STEPS = 8;
const MAGNET_SIDES = 32;

export type GridfinityShapeFields = Pick<WorkplaneShape, "width" | "height"> & {
  depth?: number;
  gridfinityType?: GridfinityType;
  gridfinityLip?: boolean;
  gridfinityMagnets?: boolean;
  gridfinityHalfGrid?: boolean;
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
  gridfinityScoopBack?: boolean;
  gridfinityScoopFront?: boolean;
  gridfinityScoopLeft?: boolean;
  gridfinityScoopRight?: boolean;
  gridfinityScoopRadius?: number;
  gridfinityFloorHeight?: number;
  gridfinityOpenBack?: boolean;
  gridfinityOpenFront?: boolean;
  gridfinityOpenLeft?: boolean;
  gridfinityOpenRight?: boolean;
  gridfinityLipChamfer?: number;
  gridfinityWallThickness?: number;
  gridfinityPaddingBack?: number;
  gridfinityPaddingFront?: number;
  gridfinityPaddingLeft?: number;
  gridfinityPaddingRight?: number;
  gridfinityCornerRadius?: number;
  gridfinityBinCornerRadius?: number;
  gridfinityCompartmentsX?: number;
  gridfinityCompartmentsZ?: number;
  gridfinityDividerThickness?: number;
  gridfinityDividerPositionsX?: number[];
  gridfinityDividerPositionsZ?: number[];
  gridfinityCompartmentLabels?: GridfinityCompartmentLabel[];
  gridfinityOpenings?: GridfinityOpening[];
  gridfinityOpeningCorner?: GridfinityLabelCorner;
  gridfinityOpeningCornerSize?: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeGridfinityType(value?: string): GridfinityType {
  return value === "baseplate" || value === "tray" ? value : "bin";
}

/** Where the body's walls start (#837): on a bin's feet, or on y = 0 for a tray. A baseplate's is never read. */
function gridfinityBase(type: GridfinityType) {
  return type === "tray" ? 0 : GRIDFINITY_FOOT_HEIGHT;
}

/** The lowest floor, measured from the underside: the 1.2 mm floor on the feet, or on a tray's flat bottom. */
function floorMinHeight(type: GridfinityType) {
  return type === "tray" ? GRIDFINITY_FLOOR : MIN_GRIDFINITY_FLOOR_HEIGHT;
}

/** Where the label shelves and dividers stop: 0.85 mm under the top, clear of a stacked bin's feet, or at a tray's top. */
function gridfinityDividerTop(type: GridfinityType, top: number) {
  return type === "tray" ? top : top - LABEL_DROP;
}

/** A tray's box (#837): its width, depth and height in mm as they are, kept to the tray's limits. */
function gridfinityTraySize(shape: Pick<GridfinityShapeFields, "width" | "depth" | "height">) {
  return {
    width: clampLabel(shape.width, DEFAULT_GRIDFINITY_TRAY_SIZE.width, MIN_GRIDFINITY_TRAY_SIZE, MAX_GRIDFINITY_TRAY_SIZE),
    depth: clampLabel(shape.depth ?? shape.width, DEFAULT_GRIDFINITY_TRAY_SIZE.depth, MIN_GRIDFINITY_TRAY_SIZE, MAX_GRIDFINITY_TRAY_SIZE),
    height: clampLabel(shape.height, DEFAULT_GRIDFINITY_TRAY_SIZE.height, MIN_GRIDFINITY_TRAY_HEIGHT, MAX_GRIDFINITY_TRAY_HEIGHT),
  };
}

function units(value: number | undefined, fallback: number, max: number) {
  return Number.isFinite(value) ? clamp(Math.round(value as number), MIN_GRIDFINITY_UNITS, max) : fallback;
}

/** The grid a size counts: 42 mm, or cells of 21 mm for a bin on the half-size grid. A baseplate is always 42. */
function gridfinityPitch(shape: Pick<GridfinityShapeFields, "gridfinityType" | "gridfinityHalfGrid">) {
  return normalizeGridfinityType(shape.gridfinityType) === "bin" && shape.gridfinityHalfGrid === true ? GRIDFINITY_GRID / 2 : GRIDFINITY_GRID;
}

/** The most units across or deep: 6 of 42 mm, or the same size in cells of 21 mm. */
export function gridfinityMaxUnits(shape: Pick<GridfinityShapeFields, "gridfinityType" | "gridfinityHalfGrid">) {
  return (MAX_GRIDFINITY_UNITS * GRIDFINITY_GRID) / gridfinityPitch(shape);
}

/**
 * The grid units the size stands for: across (x), deep (z) and, for a bin,
 * high (y). The height is counted from half the lip: a bin of so many units
 * reads the same with the lip and without it, so switching the lip alone
 * keeps the units and only adds or takes off the 4.4 mm. A tray has no grid:
 * it counts as one unit each way.
 */
export function gridfinityUnits(shape: GridfinityShapeFields) {
  const type = normalizeGridfinityType(shape.gridfinityType);
  if (type === "tray") return { x: 1, z: 1, y: 1 };
  const margin = type === "bin" ? 2 * GRIDFINITY_CLEARANCE : 0;
  const pitch = gridfinityPitch(shape);
  const max = gridfinityMaxUnits(shape);
  const padding = gridfinityPadding(shape);
  return {
    x: units((shape.width + margin - padding.left - padding.right) / pitch, DEFAULT_GRIDFINITY_UNITS.x, max),
    z: units(((shape.depth ?? shape.width) + margin - padding.back - padding.front) / pitch, DEFAULT_GRIDFINITY_UNITS.z, max),
    y: type === "bin" ? units((shape.height - GRIDFINITY_LIP_HEIGHT / 2) / GRIDFINITY_HEIGHT_UNIT, DEFAULT_GRIDFINITY_UNITS.y, MAX_GRIDFINITY_HEIGHT_UNITS) : 1,
  };
}

/** The size of a bin or baseplate of so many units; a bin on the half-size grid counts units of 21 mm, and a baseplate's box takes its padding in. */
export function gridfinitySize(type: GridfinityType, count: { x: number; z: number; y: number }, lip = true, pitch = GRIDFINITY_GRID, padding = NO_GRIDFINITY_PADDING) {
  // To 0.01 mm, as the padding is stored, so 252 + 22.98 + 22.97 is 297.95.
  if (type === "baseplate") return { width: Math.round((count.x * GRIDFINITY_GRID + padding.left + padding.right) * 100) / 100, depth: Math.round((count.z * GRIDFINITY_GRID + padding.back + padding.front) * 100) / 100, height: GRIDFINITY_BASEPLATE_HEIGHT };
  return {
    width: count.x * pitch - 2 * GRIDFINITY_CLEARANCE,
    depth: count.z * pitch - 2 * GRIDFINITY_CLEARANCE,
    height: count.y * GRIDFINITY_HEIGHT_UNIT + (lip ? GRIDFINITY_LIP_HEIGHT : 0),
  };
}

/**
 * The size belongs to the grid: a drag on a handle writes width, depth and
 * height directly, so they are turned back into whole units here and the box
 * sits exactly on the body again. A tray's size is free, only kept to its limits.
 */
export function gridfinityFootprintPatch(shape: GridfinityShapeFields) {
  if (normalizeGridfinityType(shape.gridfinityType) === "tray") return gridfinityTraySize(shape);
  return gridfinitySize(normalizeGridfinityType(shape.gridfinityType), gridfinityUnits(shape), shape.gridfinityLip !== false, gridfinityPitch(shape), gridfinityPadding(shape));
}

/**
 * What a change of type, units, lip or grid writes to the shape: the settings
 * and the box their units make. A baseplate keeps no height units, so a
 * baseplate turned into a bin gets the default 3. A change of type or grid
 * counts the units again on the new grid, so the outline stays where it can
 * (2 whole units are 4 cells) and is rounded to the nearest units where it
 * cannot. A tray keeps the box it is given, and a baseplate turned into one
 * gets a tray's default height; a tray turned into a bin or baseplate is read
 * on the grid, its height counted in height units as a bin's.
 */
export function gridfinityShapePatch(shape: GridfinityShapeFields, next: { type?: GridfinityType; x?: number; z?: number; y?: number; lip?: boolean; halfGrid?: boolean }) {
  const current = gridfinityUnits(shape);
  const currentType = normalizeGridfinityType(shape.gridfinityType);
  const type = next.type ?? currentType;
  const lip = next.lip ?? shape.gridfinityLip !== false;
  const halfGrid = next.halfGrid ?? shape.gridfinityHalfGrid === true;
  if (type === "tray") {
    const box = { width: shape.width, depth: shape.depth ?? shape.width, height: currentType === "baseplate" ? DEFAULT_GRIDFINITY_TRAY_SIZE.height : shape.height };
    return { gridfinityType: type, gridfinityLip: lip, ...(next.halfGrid !== undefined ? { gridfinityHalfGrid: halfGrid } : {}), ...gridfinityTraySize(box) };
  }
  const grid = { gridfinityType: type, gridfinityHalfGrid: halfGrid };
  const pitch = gridfinityPitch(grid);
  const max = gridfinityMaxUnits(grid);
  // The current size read on the new grid as the new type, as canonicalizeShape reads a size given through the MCP.
  const margin = type === "bin" ? 2 * GRIDFINITY_CLEARANCE : 0;
  const regrid = pitch !== gridfinityPitch(shape) || currentType === "tray";
  // A padded baseplate's box is read less its padding.
  const padding = gridfinityPadding(shape);
  const count = {
    x: units(next.x ?? (regrid ? (shape.width + margin - padding.left - padding.right) / pitch : current.x), DEFAULT_GRIDFINITY_UNITS.x, max),
    z: units(next.z ?? (regrid ? ((shape.depth ?? shape.width) + margin - padding.back - padding.front) / pitch : current.z), DEFAULT_GRIDFINITY_UNITS.z, max),
    y: units(next.y ?? (currentType === "bin" ? current.y : currentType === "tray" ? (shape.height - GRIDFINITY_LIP_HEIGHT / 2) / GRIDFINITY_HEIGHT_UNIT : DEFAULT_GRIDFINITY_UNITS.y), DEFAULT_GRIDFINITY_UNITS.y, MAX_GRIDFINITY_HEIGHT_UNITS),
  };
  // A bin turned into a baseplate takes back the padding it kept.
  const size = gridfinitySize(type, count, lip, pitch, gridfinityPadding({ ...shape, ...grid }));
  return { gridfinityType: type, gridfinityLip: lip, ...(next.halfGrid !== undefined ? { gridfinityHalfGrid: halfGrid } : {}), ...size };
}

/** Each side's padding on a baseplate (#455). */
export const GRIDFINITY_PADDING_KEYS = { back: "gridfinityPaddingBack", front: "gridfinityPaddingFront", left: "gridfinityPaddingLeft", right: "gridfinityPaddingRight" } as const;
const NO_GRIDFINITY_PADDING: Record<GridfinityWall, number> = { back: 0, front: 0, left: 0, right: 0 };

/** A side's padding as stored: none for anything but a number, at most 41 mm, rounded to 0.01 mm. */
export function normalizeGridfinityPadding(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? clamp(Math.round(value * 100) / 100, 0, MAX_GRIDFINITY_PADDING) : 0;
}

/** A baseplate's padding on each side (#455); a bin has none and keeps the settings it is given. */
export function gridfinityPadding(shape: Pick<GridfinityShapeFields, "gridfinityType" | "gridfinityPaddingBack" | "gridfinityPaddingFront" | "gridfinityPaddingLeft" | "gridfinityPaddingRight">): Record<GridfinityWall, number> {
  if (normalizeGridfinityType(shape.gridfinityType) !== "baseplate") return NO_GRIDFINITY_PADDING;
  return { back: normalizeGridfinityPadding(shape.gridfinityPaddingBack), front: normalizeGridfinityPadding(shape.gridfinityPaddingFront), left: normalizeGridfinityPadding(shape.gridfinityPaddingLeft), right: normalizeGridfinityPadding(shape.gridfinityPaddingRight) };
}

/**
 * What a change of padding writes to a baseplate: the paddings and the box
 * they make with the same units. The box takes the padding in, so a new
 * padding read against the old box would lose a unit once it passes half of one.
 */
export function gridfinityPaddingPatch(shape: GridfinityShapeFields, next: Partial<Record<GridfinityWall, unknown>>) {
  const fields = Object.fromEntries((Object.keys(next) as GridfinityWall[]).map((wall) => [GRIDFINITY_PADDING_KEYS[wall], normalizeGridfinityPadding(next[wall])])) as Partial<Record<(typeof GRIDFINITY_PADDING_KEYS)[GridfinityWall], number>>;
  const { width, depth } = gridfinitySize("baseplate", gridfinityUnits(shape), false, GRIDFINITY_GRID, gridfinityPadding({ ...shape, ...fields }));
  return { ...fields, width, depth };
}

/** The drawer a baseplate fills (#455): its size and the 0.5 mm it leaves. */
export function gridfinityDrawerSize(shape: GridfinityShapeFields) {
  return { width: Math.round((shape.width + GRIDFINITY_DRAWER_CLEARANCE) * 100) / 100, depth: Math.round(((shape.depth ?? shape.width) + GRIDFINITY_DRAWER_CLEARANCE) * 100) / 100 };
}

/**
 * What fitting a baseplate to a drawer's inside writes on one axis: as many
 * units as fit, up to 6, and the rest split evenly into the two paddings of that
 * axis, up to 41 mm a side. A drawer that one plate cannot fill gets what it can;
 * the other axis is left as it is.
 */
export function gridfinityDrawerPatch(shape: GridfinityShapeFields, axis: "x" | "z", drawer: number) {
  const [first, second] = axis === "x" ? (["left", "right"] as const) : (["back", "front"] as const);
  // In whole hundredths, as the padding is stored, so the units and the rest are read alike.
  const unit = GRIDFINITY_GRID * 100;
  const inside = Math.round((drawer - GRIDFINITY_DRAWER_CLEARANCE) * 100);
  const count = clamp(Math.floor(inside / unit), MIN_GRIDFINITY_UNITS, MAX_GRIDFINITY_UNITS);
  const rest = Math.max(0, inside - count * unit);
  const most = MAX_GRIDFINITY_PADDING * 100;
  // An odd hundredth goes to the first side.
  const half = Math.ceil(rest / 2);
  const sides = { [GRIDFINITY_PADDING_KEYS[first]]: Math.min(most, half) / 100, [GRIDFINITY_PADDING_KEYS[second]]: Math.min(most, rest - half) / 100 } as Partial<Record<(typeof GRIDFINITY_PADDING_KEYS)[GridfinityWall], number>>;
  const { width, depth } = gridfinitySize("baseplate", { ...gridfinityUnits(shape), [axis]: count }, false, GRIDFINITY_GRID, gridfinityPadding({ ...shape, ...sides }));
  return { ...sides, width, depth };
}

/** An inside narrower than this (mm) would not print: the bin is solid instead. */
const MIN_GRIDFINITY_INSIDE = 1;

/** Everything the body is built from, in the shape's own frame: x across, z deep, y up from 0, centred on x and z. */
export function gridfinityPlan(shape: GridfinityShapeFields) {
  const type = normalizeGridfinityType(shape.gridfinityType);
  const count = gridfinityUnits(shape);
  const lip = type === "bin" && shape.gridfinityLip !== false;
  const magnets = type === "bin" && Boolean(shape.gridfinityMagnets);
  const pitch = gridfinityPitch(shape);
  const padding = gridfinityPadding(shape);
  const tray = type === "tray";
  const size = tray ? gridfinityTraySize(shape) : gridfinitySize(type, count, lip, pitch, padding);
  // The grid moves away from the padded sides: its middle is half the difference off the box's.
  const centre = { x: (padding.left - padding.right) / 2, z: (padding.back - padding.front) / 2 };
  // A tray stands on a flat bottom, with no grid of feet under it.
  const cells: Array<{ x: number; z: number; i: number; j: number }> = [];
  if (!tray) {
    for (let i = 0; i < count.x; i += 1) {
      for (let j = 0; j < count.z; j += 1) {
        cells.push({ i, j, x: centre.x + (i - (count.x - 1) / 2) * pitch, z: centre.z + (j - (count.z - 1) / 2) * pitch });
      }
    }
  }
  // On the half-size grid one hole a foot, towards its cell's corner on the 42 mm grid, as far from it as on a whole unit.
  const halfOffset = pitch / 2 - (GRIDFINITY_GRID / 2 - GRIDFINITY_MAGNET_OFFSET);
  const magnetHoles = magnets
    ? pitch === GRIDFINITY_GRID
      ? cells.flatMap((cell) => [-1, 1].flatMap((sx) => [-1, 1].map((sz) => ({ x: cell.x + sx * GRIDFINITY_MAGNET_OFFSET, z: cell.z + sz * GRIDFINITY_MAGNET_OFFSET }))))
      : cells.map((cell) => ({ x: cell.x + (cell.i % 2 === 0 ? -1 : 1) * halfOffset, z: cell.z + (cell.j % 2 === 0 ? -1 : 1) * halfOffset }))
    : [];
  const top = tray ? size.height : count.y * GRIDFINITY_HEIGHT_UNIT;
  const base = gridfinityBase(type);
  const dividerTop = gridfinityDividerTop(type, top);
  // The wall's inside face, set in from the outline; the outside never changes. Walls that leave an inside narrower
  // than MIN_GRIDFINITY_INSIDE make the bin solid: the floor goes up to the highest it takes.
  // A bin open on every side has no wall to set, nor walls left to meet; a side opened only partly keeps one (#455).
  const openings = normalizeGridfinityOpenings(shape.gridfinityOpenings) ?? [];
  // To 0.01 mm: a chamfer of a millionth of a millimetre left the exact body's cut with no solid.
  const lipChamfer = lip ? Math.round(clampLabel(shape.gridfinityLipChamfer, 0, 0, MAX_GRIDFINITY_LIP_CHAMFER) * 100) / 100 : 0;
  const closedSide = LABEL_WALLS.some((wall) => shape[GRIDFINITY_OPEN_WALL_KEYS[wall]] !== true);
  const walled = closedSide || partlyOpen(shape, { type, top, lip, size, openings, lipChamfer });
  const wallThickness = type !== "baseplate" && walled ? clampLabel(shape.gridfinityWallThickness, DEFAULT_GRIDFINITY_WALL_THICKNESS, MIN_GRIDFINITY_WALL_THICKNESS, wallMaxThickness(size)) : DEFAULT_GRIDFINITY_WALL_THICKNESS;
  // Only a side switched shut makes walls meet: a bin switched open on all four sides never goes solid, as a wall too
  // thick for its opening leaves that side open in full.
  const solid = type !== "baseplate" && closedSide && Math.min(size.width, size.depth) / 2 - wallThickness < MIN_GRIDFINITY_INSIDE / 2;
  const floor = solid ? floorMaxHeight({ type, top, lip, wallThickness }) : floorHeight(shape.gridfinityFloorHeight, { type, top, lip, wallThickness });
  // Any bin but a solid block can be open on a side (#682), with no wall there above the floor.
  const fits = openFits({ type, top, lip, floor });
  // A side switched open is open in full, or partly with a notch cut out of its wall (#455); shelves and scoops follow the switch.
  const switched = Object.fromEntries(LABEL_WALLS.map((wall) => [wall, fits && shape[GRIDFINITY_OPEN_WALL_KEYS[wall]] === true])) as Record<GridfinityWall, boolean>;
  const { open, notches } = openingStates({ switched, openings, size, top, dividerTop, lip, floor, wallThickness, lipChamfer, solid });
  // A bin with a finger scoop has every inner floor edge rounded, and the scoop is the rounding made large on its wall.
  const scooped = scoopFits({ type, top, lip, floor, wallThickness }) && LABEL_WALLS.some((wall) => shape[GRIDFINITY_SCOOP_WALL_KEYS[wall]] === true && !switched[wall]);
  const innerRadius = gridfinityInnerRadius(wallThickness);
  const floorRounding = scooped ? innerRadius : 0;
  // The notches' corners, seen from outside the wall: each takes as much of the size as it has room for (gridfinityOpeningCorners).
  const openingCorner: GridfinityLabelCorner = shape.gridfinityOpeningCorner === "chamfer" ? "chamfer" : DEFAULT_GRIDFINITY_LABEL_CORNER;
  const openingCornerSize = Math.round(clampLabel(shape.gridfinityOpeningCornerSize, 0, 0, MAX_GRIDFINITY_LABEL_CORNER_SIZE) * 100) / 100;
  // The baseplate's outer corners (#856), to 0.01 mm; within CORNER_SNAP of 4 they are built as 4. A bin's and a tray's stay 3.75.
  const setRadius = Math.round(clampLabel(shape.gridfinityCornerRadius, GRIDFINITY_BASEPLATE_RADIUS, 0, GRIDFINITY_BASEPLATE_RADIUS) * 100) / 100;
  const cornerRadius = type !== "baseplate" ? GRIDFINITY_BIN_RADIUS : GRIDFINITY_BASEPLATE_RADIUS - setRadius < CORNER_SNAP ? GRIDFINITY_BASEPLATE_RADIUS : setRadius;
  // A bin's outer wall above the feet (#856), to 0.01 mm; within CORNER_SNAP of 3.75 it is built as 3.75. Anything else's wall is its outline.
  const setWallRadius = Math.round(clampLabel(shape.gridfinityBinCornerRadius, GRIDFINITY_BIN_RADIUS, 0, GRIDFINITY_BIN_RADIUS) * 100) / 100;
  const wallRadius = type !== "bin" || GRIDFINITY_BIN_RADIUS - setWallRadius < CORNER_SNAP ? cornerRadius : setWallRadius;
  return { type, count, lip, magnets, halfGrid: pitch !== GRIDFINITY_GRID, pitch, size, cells, magnetHoles, top, base, dividerTop, floor, floorRounding, open, switched, notches, openingCorner, openingCornerSize, padding, centre, cornerRadius, wallRadius, lipChamfer, wallThickness, innerRadius, solid, reach: gridfinityOpenReach(wallThickness) };
}

/** A notch cut out of a side's wall, partly open (#455): from and to along the side (x across, z deep), its bottom's height. */
export type GridfinityNotch = { side: GridfinityWall; from: number; to: number; bottom: number };

/** The walls at a side's two ends: towards -x on a back or front side, towards -z on a left or right one, first. */
const OPENING_ENDS: Record<GridfinityWall, [GridfinityWall, GridfinityWall]> = { back: ["left", "right"], front: ["left", "right"], left: ["back", "front"], right: ["back", "front"] };

/** To a millionth of a millimetre, so an opening's numbers read as they are typed. */
function openingRound(value: number) {
  return Math.round(value * 1e6) / 1e6;
}

/** Where an opening's depth is measured from: the lip's top after its chamfer, or the bin's top without the lip. */
function openingTop({ top, lip, lipChamfer }: { top: number; lip: boolean; lipChamfer: number }) {
  return lip ? top + GRIDFINITY_LIP_HEIGHT - lipChamfer * Math.SQRT1_2 : top;
}

/**
 * Which sides switched open are open in full, as before (#682), and the notches of those opened only partly (#455). A
 * side's straight part runs between its corners, kept as wide as the wall is thick, or to the outline beside a side
 * open in full. Whether a set width is the full wall is judged with the corners kept, so it does not change with its
 * neighbours, and a side whose straight part has no room for the narrowest opening is open in full. A bin built solid
 * takes no notch.
 */
function openingStates(plan: { switched: Record<GridfinityWall, boolean>; openings: GridfinityOpening[]; size: { width: number; depth: number }; top: number; dividerTop: number; lip: boolean; floor: number; wallThickness: number; lipChamfer: number; solid: boolean }) {
  const corner = Math.max(GRIDFINITY_BIN_RADIUS, plan.wallThickness);
  const shut: Record<GridfinityWall, boolean> = { back: false, front: false, left: false, right: false };
  const straight = (side: GridfinityWall, open: Record<GridfinityWall, boolean>) => {
    const half = (side === "back" || side === "front" ? plan.size.width : plan.size.depth) / 2;
    const [start, end] = OPENING_ENDS[side];
    return [-half + (open[start] ? 0 : corner), half - (open[end] ? 0 : corner)];
  };
  const entryOf = (side: GridfinityWall) => plan.openings.find((entry) => entry.side === side);
  const fullWidth = (side: GridfinityWall) => {
    const width = entryOf(side)?.width;
    const [a0, a1] = straight(side, shut);
    return width === undefined || a1 - a0 < MIN_GRIDFINITY_OPENING_WIDTH || width >= a1 - a0 - OPENING_SNAP;
  };
  const room = (side: GridfinityWall) => {
    const [a0, a1] = straight(side, shut);
    return a1 - a0 >= MIN_GRIDFINITY_OPENING_WIDTH;
  };
  const bottomOf = (side: GridfinityWall) => {
    const depth = entryOf(side)?.depth;
    if (depth === undefined) return plan.floor;
    const height = openingTop(plan);
    const bottom = height - clamp(depth, MIN_GRIDFINITY_OPENING_DEPTH, Math.max(MIN_GRIDFINITY_OPENING_DEPTH, height - plan.floor));
    if (bottom <= plan.floor + OPENING_SNAP) return plan.floor;
    const ledge = plan.dividerTop;
    if (Math.abs(bottom - ledge) >= OPENING_LEDGE_CLEAR) return openingRound(bottom);
    return Math.max(plan.floor, openingRound(bottom < ledge - 1e-9 ? ledge - OPENING_LEDGE_CLEAR : ledge + OPENING_LEDGE_CLEAR));
  };
  const open = Object.fromEntries(LABEL_WALLS.map((side) => [side, plan.switched[side] && (plan.solid || !room(side) || (fullWidth(side) && bottomOf(side) === plan.floor))])) as Record<GridfinityWall, boolean>;
  const notches = plan.solid ? [] : LABEL_WALLS.filter((side) => plan.switched[side] && !open[side]).flatMap((side): GridfinityNotch[] => {
    const entry = entryOf(side)!;
    const [a0, a1] = straight(side, open);
    const length = a1 - a0;
    const width = fullWidth(side) ? length : clamp(entry.width!, MIN_GRIDFINITY_OPENING_WIDTH, length);
    const distance = clamp(entry.distance ?? 0, 0, length - width);
    const from = entry.align === "start" ? a0 + distance : entry.align === "end" ? a1 - distance - width : (a0 + a1) / 2 - width / 2;
    return [{ side, from: openingRound(from), to: openingRound(from + width), bottom: bottomOf(side) }];
  });
  return { open, notches };
}

/**
 * Whether a bin switched open on every side still has a wall, a side opened only partly: judged with the wall's own
 * 0.95 mm, as the wall's setting is what this decides.
 */
function partlyOpen(shape: GridfinityShapeFields, plan: { type: GridfinityType; top: number; lip: boolean; size: { width: number; depth: number }; openings: GridfinityOpening[]; lipChamfer: number }) {
  if (plan.type === "baseplate" || plan.openings.length === 0) return false;
  const wallThickness = DEFAULT_GRIDFINITY_WALL_THICKNESS;
  const floor = floorHeight(shape.gridfinityFloorHeight, { ...plan, wallThickness });
  if (!openFits({ ...plan, floor })) return false;
  const switched = Object.fromEntries(LABEL_WALLS.map((wall) => [wall, shape[GRIDFINITY_OPEN_WALL_KEYS[wall]] === true])) as Record<GridfinityWall, boolean>;
  return openingStates({ ...plan, dividerTop: gridfinityDividerTop(plan.type, plan.top), switched, floor, wallThickness, solid: false }).notches.length > 0;
}

/** The radius of the inside's corners: the outline's, set in by the wall with its centres kept; square from a wall of 3.75 mm. */
function gridfinityInnerRadius(wallThickness: number) {
  return Math.max(0, GRIDFINITY_BIN_RADIUS - wallThickness);
}

/** The thickest wall a bin of this size takes: where its walls meet. */
function wallMaxThickness(size: { width: number; depth: number }) {
  return Math.max(MIN_GRIDFINITY_WALL_THICKNESS, Math.min(size.width, size.depth) / 2);
}

export type GridfinityPlan = ReturnType<typeof gridfinityPlan>;

/**
 * The highest floor (#455): with the lip, where the lip's support leaves the wall, at most the ledge 0.85 mm under the
 * top, so a stacked bin's feet keep at least 0.5 mm clear; without it the top, a solid block. Within FLOOR_SNAP of the
 * 1.2 mm floor there is nothing to raise.
 */
function floorMaxHeight({ type, top, lip, wallThickness }: { type: GridfinityType; top: number; lip: boolean; wallThickness: number }) {
  const min = floorMinHeight(type);
  if (type === "baseplate") return min;
  const max = lip ? Math.min(top - (LIP[0][0] - wallThickness), top - LABEL_DROP) : top;
  return max < min + FLOOR_SNAP + 1e-9 ? min : max;
}

/** The floor as it is built: its own height within what the bin takes, raised onto the highest within FLOOR_SNAP of it. */
function floorHeight(value: number | undefined, plan: { type: GridfinityType; top: number; lip: boolean; wallThickness: number }) {
  const max = floorMaxHeight(plan);
  const min = floorMinHeight(plan.type);
  const height = clampLabel(value, min, min, max);
  // A little over FLOOR_SNAP, as 21 - 20.95 comes out as 0.05000000000000071.
  return max - height < FLOOR_SNAP + 1e-9 ? max : height;
}

/** The highest floor this bin takes. */
export function gridfinityFloorMaxHeight(shape: GridfinityShapeFields) {
  return floorMaxHeight(gridfinityPlan(shape));
}

/** The floor's height inside the bin as it is built, measured from the underside. */
export function gridfinityFloorHeight(shape: GridfinityShapeFields) {
  return gridfinityPlan(shape).floor;
}

/** The chamfer on the lip's top as it is built (#780): none without the lip, at most 1 mm, to 0.01 mm. */
export function gridfinityLipChamfer(shape: GridfinityShapeFields) {
  return gridfinityPlan(shape).lipChamfer;
}

/** The radius of a baseplate's outer corners as it is built (#856): 4 mm unless it is set, from 0 (square) to 4, to 0.01 mm, and 4 within CORNER_SNAP of it. */
export function gridfinityCornerRadius(shape: GridfinityShapeFields) {
  return gridfinityPlan(shape).cornerRadius;
}

/** The radius of a bin's outer corners above its feet as it is built (#856): 3.75 mm unless it is set, from 0 (square), to 0.01 mm, and 3.75 within CORNER_SNAP of it. */
export function gridfinityBinCornerRadius(shape: GridfinityShapeFields) {
  return gridfinityPlan(shape).wallRadius;
}

/** Whether a bin has an outer corner to round (#856): not where every corner is square on an open side, nor on a baseplate or a tray. */
export function gridfinityBinCornerFits(shape: GridfinityShapeFields) {
  const plan = gridfinityPlan(shape);
  return plan.type === "bin" && Object.values(gridfinityOpenCorners(plan.open)).some((square) => !square);
}

/** The lowest floor the bin takes: 5.95 mm on its feet, 1.2 mm in a tray (#837). */
export function gridfinityFloorMinHeight(shape: GridfinityShapeFields) {
  return floorMinHeight(normalizeGridfinityType(shape.gridfinityType));
}

/** Whether the bin's floor can be raised at all: not in a bin of 1 height unit with the lip, whose support reaches the floor. */
export function gridfinityFloorFits(shape: GridfinityShapeFields) {
  return gridfinityFloorMaxHeight(shape) > gridfinityFloorMinHeight(shape);
}

/** The thickest wall the bin takes, for its slider. */
export function gridfinityWallMaxThickness(shape: GridfinityShapeFields) {
  return wallMaxThickness(gridfinityPlan(shape).size);
}

/** The bin's wall thickness as it is built. */
export function gridfinityWallThickness(shape: GridfinityShapeFields) {
  return gridfinityPlan(shape).wallThickness;
}

/** Whether the bin's walls leave no inside, so it is built solid. */
export function gridfinityWallSolid(shape: GridfinityShapeFields) {
  return gridfinityPlan(shape).solid;
}

/**
 * Whether the bin has a wall to set: a bin with a side closed that is not a solid block. Worked out without the wall's own
 * setting, so the row stays at the thickest wall, which builds the bin solid.
 */
export function gridfinityWallFits(shape: GridfinityShapeFields) {
  const fields = { ...shape, gridfinityWallThickness: undefined };
  return gridfinityOpenFits(fields) && !Object.values(gridfinityPlan(fields).open).every(Boolean);
}

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
/** How far the lip's 45 degree support leans into the bin past the wall at the shelf's top: 0.8 mm with a wall of 0.95, none from 1.75. */
function labelLipLean(wallThickness: number) {
  return Math.max(0, GRIDFINITY_LEDGE_INSET - wallThickness);
}

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

/** A closed outline without the points that fall on the next one, which would be edges of no length. */
function distinctPoints<T extends { x: number; z: number }>(outline: T[]) {
  return outline.filter((p, i) => {
    const q = outline[(i + 1) % outline.length];
    return Math.hypot(p.x - q.x, p.z - q.z) > 1e-9;
  });
}

/** The corner piece's outline over the plan, and for a round one the circle taken out of it. */
export function gridfinityLabelCornerOutline(c: GridfinityLabelCornerShape) {
  const point = (u: number, v: number) => ({ x: c.at.x + c.a.x * u + c.b.x * v, z: c.at.z + c.a.z * u + c.b.z * v });
  const ra = c.reachA;
  const rb = c.reachB;
  // Both shapes stay within `size` along a and b, beyond `at` only by the reach; a reach of 0 leaves a
  // point twice, which the kernel would take for an edge of no length.
  if (!c.round) {
    const outline = [point(-ra, -rb), point(c.size, -rb), point(c.size, 0), point(0, c.size), point(-ra, c.size)];
    return { outline: distinctPoints(outline), circle: null };
  }
  return { outline: [point(-ra, -rb), point(c.size, -rb), point(c.size, c.size), point(-ra, c.size)], circle: { centre: point(c.size, c.size), radius: c.size } };
}

export type GridfinityLabelPieces = {
  top: number;
  floor: number;
  /**
   * The bin's inside the pieces are cut to: half sizes and corner radius of the inner wall, and the open sides it reaches
   * out through to the outline, the wall's thickness further (the exact body cuts them to that; the display mesh runs the
   * inside on and cuts them off at the outline); only when a side is open, so a closed bin's pieces are as before.
   */
  inside: { hx: number; hz: number; radius: number; open?: Record<GridfinityWall, boolean>; wallThickness?: number };
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
  return { hx: plan.size.width / 2 - plan.wallThickness, hz: plan.size.depth / 2 - plan.wallThickness };
}

/**
 * The largest rounding or chamfer the shelves take: 10 mm, but never so much that a shelf of the
 * smallest width with its corner reaches within 1 mm of the middle, which happens in a bin one cell of
 * the half-size grid wide or deep, or with a thick wall.
 */
export function gridfinityLabelMaxCornerSize(plan: GridfinityPlan) {
  const { hx, hz } = labelInside(plan);
  return Math.max(0, Math.min(MAX_GRIDFINITY_LABEL_CORNER_SIZE, Math.min(hx, hz) - 1 - MIN_GRIDFINITY_LABEL_WIDTH));
}

/** The rounding or chamfer the shelves are set to, in mm, as it is built. */
export function gridfinityLabelCornerSize(shape: GridfinityShapeFields) {
  return clampLabel(shape.gridfinityLabelCornerSize, DEFAULT_GRIDFINITY_LABEL_CORNER_SIZE, 0, gridfinityLabelMaxCornerSize(gridfinityPlan(shape)));
}

/** The widest a shelf can be for its underside to end LABEL_FLOOR_CLEARANCE above the floor. */
function labelFloorWidth(plan: GridfinityPlan) {
  return (plan.dividerTop - LABEL_LAND - plan.floor - LABEL_FLOOR_CLEARANCE) / LABEL_RISE;
}

/** Whether a bin can have label shelves: 3 height units or more (any tray), room above the floor for the narrowest shelf, and across the inside for it and 1 mm. */
export function gridfinityLabelFits(shape: GridfinityShapeFields) {
  const plan = gridfinityPlan(shape);
  const { hx, hz } = labelInside(plan);
  return plan.type !== "baseplate" && (plan.type === "tray" || plan.count.y >= MIN_GRIDFINITY_LABEL_HEIGHT_UNITS) && labelFloorWidth(plan) >= MIN_GRIDFINITY_LABEL_WIDTH && Math.min(hx, hz) >= 1 + MIN_GRIDFINITY_LABEL_WIDTH;
}

/**
 * The widest shelf a wall takes: its underside ends above the floor, and across the bin the
 * shelves and their corner pieces leave at least 2 mm open, between two shelves facing each
 * other or between a shelf and the wall opposite it, so the bin is never closed off.
 */
export function gridfinityLabelMaxWidth(shape: GridfinityShapeFields, wall: GridfinityWall) {
  const plan = gridfinityPlan(shape);
  const { hx, hz } = labelInside(plan);
  const size = gridfinityLabelCornerSize(shape);
  const max = labelFloorWidth(plan);
  // A shelf set on a side switched open is not built, so it faces nothing.
  const on = (side: GridfinityWall) => shape[GRIDFINITY_LABEL_WALL_KEYS[side].on] === true && !plan.switched[side];
  const [half, facing] = wall === "back" || wall === "front" ? [hz, on(wall === "back" ? "front" : "back")] : [hx, on(wall === "left" ? "right" : "left")];
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
 * where the lip's support leans into the bin by up to 0.8 mm, less as the wall grows.
 */
function labelEndSnap(plan: { lip: boolean; wallThickness: number }) {
  return LABEL_END_SNAP + (plan.lip ? labelLipLean(plan.wallThickness) : 0);
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
  // A bin with dividers has labels in its compartments instead (#554); its shelves' settings are kept for a bin without.
  if (!gridfinityLabelFits(shape) || gridfinityCompartments(shape)) return null;
  const plan = gridfinityPlan(shape);
  // A side switched open has no shelf, its wall gone (#682) or only notched (#455); the setting is kept for when it is closed again.
  const walls = LABEL_WALLS.filter((wall) => shape[GRIDFINITY_LABEL_WALL_KEYS[wall].on] === true && !plan.switched[wall]);
  if (walls.length === 0) return null;
  const size = gridfinityLabelCornerSize(shape);
  const round = (shape.gridfinityLabelCorner ?? DEFAULT_GRIDFINITY_LABEL_CORNER) !== "chamfer";
  const { hx, hz } = labelInside(plan);
  const widthOf = (wall: GridfinityWall) => gridfinityLabelWidth(shape, wall);
  const snap = labelEndSnap(plan);
  const spanOf = (wall: GridfinityWall, along: number): LabelSpan => {
    const length = gridfinityLabelLength(shape, wall);
    if (labelFull(length, along, snap)) return { centre: 0, length: 2 * along, short: [false, false] };
    const setOffset = shape[GRIDFINITY_LABEL_WALL_KEYS[wall].offset];
    const offset = Number.isFinite(setOffset) ? (setOffset as number) : 0;
    // The offset is along the editor's axes: right on the back and front walls, towards the front on the sides.
    const sign = wall === "back" || wall === "right" ? 1 : -1;
    const centre = clamp(sign * offset, -along + length / 2, along - length / 2);
    return { centre, length, short: [centre - length / 2 > -along + snap, centre + length / 2 < along - snap] };
  };
  return labelPiecesIn({ hx, hz, walls, widthOf, spanOf, size, round, top: plan.dividerTop, floor: plan.floor, open: plan.open, wallThickness: plan.wallThickness });
}

/** A shelf's middle and length along its wall, and whether each end (0 at u = -along, 1 at u = along) stops short of the wall there. */
type LabelSpan = { centre: number; length: number; short: boolean[] };

/**
 * The shelves on the given walls of an inside of these half sizes as pieces, each with its span and width: how they
 * end, meet one another and the walls, and the corner pieces between them. An end at an open side runs out through it
 * as into a wall, and is cut off at the outline.
 */
function labelPiecesIn({ hx, hz, walls, widthOf, spanOf, size, round, top, floor, open, wallThickness }: {
  hx: number;
  hz: number;
  walls: GridfinityWall[];
  widthOf: (wall: GridfinityWall) => number;
  spanOf: (wall: GridfinityWall, along: number) => LabelSpan;
  size: number;
  round: boolean;
  top: number;
  floor: number;
  open?: Record<GridfinityWall, boolean>;
  wallThickness: number;
}): GridfinityLabelPieces {
  const alongOf = (wall: GridfinityWall) => (wall === "back" || wall === "front" ? hx : hz);
  const spans = new Map(walls.map((wall) => [wall, spanOf(wall, alongOf(wall))]));
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
      // An open side has no wall to meet.
      if (open?.[LABEL_SIDE_WALLS[wall][end]]) return;
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
  return { top, floor, inside: { hx, hz, radius: gridfinityInnerRadius(wallThickness), ...(open && LABEL_WALLS.some((wall) => open[wall]) ? { open, wallThickness } : {}) }, shelves, corners };
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

/** Each wall's finger scoop switch. */
export const GRIDFINITY_SCOOP_WALL_KEYS = { back: "gridfinityScoopBack", front: "gridfinityScoopFront", left: "gridfinityScoopLeft", right: "gridfinityScoopRight" } as const;
/**
 * A scoop's circle is moved this far towards the floor and the wall, so that it crosses them at a
 * slight angle rather than touching them along a line.
 */
const SCOOP_SINK = 0.02;
/** Segments in a scoop's quarter circle in the mesh: four times the segments of the bin's corners, as a scoop is a much larger curve. */
const SCOOP_STEPS = 4 * CORNER_STEPS;
/** The straight wall kept above the largest scoop, so it does not run out in a sliver at the top of a bin without the lip. */
const SCOOP_WALL_ABOVE = 0.5;
/**
 * The radius whose sunk circle runs, on the end walls, through the point where the inner corner's rounding meets the
 * floor's, the floor's rounding (the inner corners' radius) out from the scoop's wall and up from the floor (9.63 mm
 * with a wall of 0.95). A radius within SCOOP_CORNER_CLEAR of it leaves edges shorter than 0.01 mm in the exact body,
 * and very close the kernel's cut leaves the scoop out, so it is drawn that far below.
 */
function scoopCornerRadius(rounding: number) {
  return (rounding + SCOOP_SINK) / (1 - Math.SQRT1_2);
}
const SCOOP_CORNER_CLEAR = 0.03;

/** How high a scoop can rise: from the floor up to the highest floor, where the lip's support leaves the wall, or the top without the lip. */
function scoopDepth(plan: { type: GridfinityType; top: number; lip: boolean; floor: number; wallThickness: number }) {
  return floorMaxHeight(plan) - plan.floor;
}

/** Whether a scoop of the smallest radius fits under the lip's support, or under the top without the lip. */
function scoopFits(plan: { type: GridfinityType; top: number; lip: boolean; floor: number; wallThickness: number }) {
  return plan.type !== "baseplate" && scoopDepth(plan) - SCOOP_WALL_ABOVE >= MIN_GRIDFINITY_SCOOP_RADIUS;
}

/**
 * The largest radius the bin's scoops take: that depth less SCOOP_WALL_ABOVE, and across the bin at
 * least 2 mm of floor left, between two scoops facing each other or between a scoop and the wall
 * opposite it, as for the shelves.
 */
export function gridfinityScoopMaxRadius(shape: GridfinityShapeFields) {
  const plan = gridfinityPlan(shape);
  const on = (wall: GridfinityWall) => shape[GRIDFINITY_SCOOP_WALL_KEYS[wall]] === true && !plan.switched[wall];
  const rooms = LABEL_WALLS.filter(on).map((wall) => scoopRoom(plan, on, wall)).filter((room) => room >= MIN_GRIDFINITY_SCOOP_RADIUS - 1e-9);
  return Math.min(scoopDepth(plan) - SCOOP_WALL_ABOVE, ...rooms);
}

/** The room a wall's scoop has across the bin: up to 1 mm from the middle with a scoop facing it, else up to 2 mm from the far wall. */
function scoopRoom(plan: GridfinityPlan, on: (wall: GridfinityWall) => boolean, wall: GridfinityWall) {
  const { hx, hz } = labelInside(plan);
  const [half, facing] = wall === "back" || wall === "front" ? [hz, on(wall === "back" ? "front" : "back")] : [hx, on(wall === "left" ? "right" : "left")];
  return facing ? half - 1 : 2 * half - 2;
}

/** Whether a bin of this size can have a scoop at all. */
export function gridfinityScoopFits(shape: GridfinityShapeFields) {
  return scoopFits(gridfinityPlan(shape));
}

/** The scoops' radius as it is built: its own, else half the height a scoop can rise, within what the bin takes. */
export function gridfinityScoopRadius(shape: GridfinityShapeFields) {
  const max = gridfinityScoopMaxRadius(shape);
  const plan = gridfinityPlan(shape);
  return clampLabel(shape.gridfinityScoopRadius, clamp(scoopDepth(plan) / 2, MIN_GRIDFINITY_SCOOP_RADIUS, max), MIN_GRIDFINITY_SCOOP_RADIUS, Math.max(MIN_GRIDFINITY_SCOOP_RADIUS, max));
}

/** A scoop along a wall, from u = from to u = to. */
export type GridfinityScoop = { wall: GridfinityWall; from: number; to: number };

export type GridfinityScoopPieces = {
  floor: number;
  radius: number;
  /** The scoops' circle centre in a wall's own section (v out from the wall, y up). */
  centre: [v: number, y: number];
  /** The bin's inside the scoops are cut to, as for the shelves. */
  inside: { hx: number; hz: number; radius: number };
  scoops: GridfinityScoop[];
};

/** The bin's finger scoops as pieces for the mesh and the exact body, or null when it has none. */
export function gridfinityScoopPieces(shape: GridfinityShapeFields): GridfinityScoopPieces | null {
  if (!gridfinityScoopFits(shape)) return null;
  const plan = gridfinityPlan(shape);
  const { open } = plan;
  // A side switched open has no scoop, its wall gone (#682) or only notched (#455); the setting is kept for when it is closed again.
  const { hx, hz } = labelInside(plan);
  // A wall whose scoop would leave less than 2 mm of floor even at the smallest radius has none, as in a compartment.
  const on = (wall: GridfinityWall) => shape[GRIDFINITY_SCOOP_WALL_KEYS[wall]] === true && !plan.switched[wall];
  const walls = LABEL_WALLS.filter((wall) => on(wall) && scoopRoom(plan, on, wall) >= MIN_GRIDFINITY_SCOOP_RADIUS - 1e-9);
  if (walls.length === 0) return null;
  const floor = plan.floor;
  const chosen = gridfinityScoopRadius(shape);
  const corner = scoopCornerRadius(plan.innerRadius);
  const radius = Math.abs(chosen - corner) < SCOOP_CORNER_CLEAR ? corner - SCOOP_CORNER_CLEAR : chosen;
  const scoops = walls.map((wall): GridfinityScoop => {
    const along = wall === "back" || wall === "front" ? hx : hz;
    // An end at an open side runs as far past the outline as the other runs into the wall.
    const [start, end] = LABEL_SIDE_WALLS[wall].map((side) => (open[side] ? plan.wallThickness : 0));
    return { wall, from: -along - start - LABEL_PAST, to: along + end + LABEL_PAST };
  });
  return { floor, radius, centre: [radius - SCOOP_SINK, floor + radius - SCOOP_SINK], inside: { hx, hz, radius: plan.innerRadius }, scoops };
}

/**
 * The scoops' cross-section in a wall's own (v, y), counter-clockwise: from inside the wall and the
 * floor out to under the circle's lowest point, round the quarter circle in SCOOP_STEPS to its point
 * nearest the wall, and back into the wall; `arc` gives the arc's three points for an exact edge.
 */
export function gridfinityScoopSection(pieces: GridfinityScoopPieces) {
  const [cv, cy] = pieces.centre;
  const r = pieces.radius;
  const at = (angle: number): [number, number] => [cv + r * Math.cos(angle), cy + r * Math.sin(angle)];
  const low = pieces.floor - LABEL_PAST;
  const outline: Array<[number, number]> = [[-LABEL_PAST, low], [cv, low]];
  for (let k = 0; k <= SCOOP_STEPS; k += 1) outline.push(at(-Math.PI / 2 - (k / SCOOP_STEPS) * (Math.PI / 2)));
  outline.push([-LABEL_PAST, cy]);
  return { outline, arc: [at(-Math.PI / 2), at((-3 * Math.PI) / 4), at(Math.PI)] as Array<[number, number]> };
}

/** A point of a scoop's wall section in the shape's frame (x, y, z), at u along the wall. */
export function gridfinityScoopPoint(pieces: GridfinityScoopPieces, scoop: GridfinityScoop, u: number, [v, y]: [number, number]): Vec3 {
  const p = labelPoint(scoop.wall, pieces.inside.hx, pieces.inside.hz, u, v);
  return [p.x, y, p.z];
}

/** Each side's open switch (#682). */
export const GRIDFINITY_OPEN_WALL_KEYS = { back: "gridfinityOpenBack", front: "gridfinityOpenFront", left: "gridfinityOpenLeft", right: "gridfinityOpenRight" } as const;
/** How far a cutter that runs out through an open side stays straight past the outline before its rounding starts. */
const OPEN_CLEAR = 2;
/**
 * How far the inside's cutter and a compartment's run out through an open side, for a wall up to 3.75 mm; a thicker
 * wall takes gridfinityOpenReach. Far enough that their 3.75 mm corners and the floor's rounding lie OPEN_CLEAR beyond the
 * outline, where the bin is not. Scoops reach 1 mm past it (LABEL_PAST) and shelves 1 mm past the inside, as into a
 * wall, so none of them ends on a rounding of the cutter.
 */
const GRIDFINITY_OPEN_REACH = GRIDFINITY_BIN_RADIUS + OPEN_CLEAR;

/** How far the cutters run out through an open side for a wall this thick: never less than OPEN_CLEAR past the outline. */
function gridfinityOpenReach(wallThickness: number) {
  return Math.max(GRIDFINITY_OPEN_REACH, wallThickness + OPEN_CLEAR);
}

/** Whether a bin has sides to open: every bin but a solid block, one without the lip whose floor is raised to the top. */
function openFits({ type, top, lip, floor }: { type: GridfinityType; top: number; lip: boolean; floor: number }) {
  return type !== "baseplate" && floor < (lip ? top + GRIDFINITY_LIP_HEIGHT : top);
}

/** Whether a bin of these settings has sides to open, for the settings window. */
export function gridfinityOpenFits(shape: GridfinityShapeFields) {
  return openFits(gridfinityPlan(shape));
}

/** Which of a rectangle's corners are square: those touching an open side, where it runs straight out. */
export function gridfinityOpenCorners(open: Partial<Record<GridfinityWall, boolean>> = {}) {
  return { backLeft: Boolean(open.back || open.left), backRight: Boolean(open.back || open.right), frontLeft: Boolean(open.front || open.left), frontRight: Boolean(open.front || open.right) };
}

/**
 * A rounded rectangle's half sizes and middle when it runs `reach` further out through its open sides and keeps the
 * others where they are: the inside's cutter, a compartment's, or the inside the pieces are cut to.
 */
export function gridfinityOpenGrown(hx: number, hz: number, open: Partial<Record<GridfinityWall, boolean>>, reach: number) {
  const [left, right, back, front] = (["left", "right", "back", "front"] as const).map((wall) => (open[wall] ? reach : 0));
  return { hx: hx + (left + right) / 2, hz: hz + (back + front) / 2, x: (right - left) / 2, z: (front - back) / 2 };
}

/** Across (x) or deep (z), for the compartments and the dividers between them. */
export type GridfinityAxis = "x" | "z";

/** Whether a bin has room for dividers: their top, 0.85 mm under the top like the label shelves' (in a tray, at its top), at least 3 mm above the floor. */
export function gridfinityDividerFits(shape: GridfinityShapeFields) {
  const plan = gridfinityPlan(shape);
  return plan.type !== "baseplate" && plan.dividerTop - plan.floor >= MIN_GRIDFINITY_DIVIDER_HEIGHT - 1e-9;
}

/** The most compartments a bin takes along an axis: 4 a grid unit of 42 mm, so 2 a cell of the half-size grid; a tray, with no grid, up to 24. */
export function gridfinityUnitCompartments(shape: GridfinityShapeFields, axis: GridfinityAxis) {
  const plan = gridfinityPlan(shape);
  if (plan.type === "tray") return MAX_GRIDFINITY_DIVIDERS + 1;
  return (GRIDFINITY_COMPARTMENTS_PER_UNIT * plan.count[axis] * plan.pitch) / GRIDFINITY_GRID;
}

/**
 * The compartments as built: 1 each way unless dividers fit, at most 4 a grid unit each way (24 in a tray), and at most
 * 40 in all. Over that the number across is lowered to fit beside the number deep, always in that order,
 * so a file or an MCP call over it builds the same every time.
 */
function compartmentCounts(shape: GridfinityShapeFields) {
  if (!gridfinityDividerFits(shape)) return { x: 1, z: 1 };
  const along = (value: number | undefined, max: number) => (Number.isFinite(value) ? clamp(Math.round(value as number), 1, max) : 1);
  const z = along(shape.gridfinityCompartmentsZ, compartmentRoom(shape, "z"));
  const x = along(shape.gridfinityCompartmentsX, Math.min(compartmentRoom(shape, "x"), Math.floor(MAX_GRIDFINITY_COMPARTMENTS / z)));
  return { x, z };
}

/** The most compartments along an axis: 4 a grid unit (24 in a tray), and no more than leave each 6 mm wide between dividers, which a thick wall can bring down. */
function compartmentRoom(shape: GridfinityShapeFields, axis: GridfinityAxis) {
  const thickness = gridfinityDividerThickness(shape);
  return Math.max(1, Math.min(gridfinityUnitCompartments(shape, axis), Math.floor((insideLength(gridfinityPlan(shape), axis) + thickness) / (MIN_GRIDFINITY_COMPARTMENT + thickness))));
}

/** The compartments along an axis as they are built. */
export function gridfinityCompartmentCount(shape: GridfinityShapeFields, axis: GridfinityAxis) {
  return compartmentCounts(shape)[axis];
}

/** The most compartments the settings window offers along an axis, beside those built along the other: 40 in all are never crossed by hand. */
export function gridfinityCompartmentMax(shape: GridfinityShapeFields, axis: GridfinityAxis) {
  const counts = compartmentCounts(shape);
  return Math.min(compartmentRoom(shape, axis), Math.floor(MAX_GRIDFINITY_COMPARTMENTS / counts[axis === "x" ? "z" : "x"]));
}

/** The dividers' thickness as it is built: its own, else 1.2 mm, between 0.8 and 3. */
export function gridfinityDividerThickness(shape: GridfinityShapeFields) {
  return clampLabel(shape.gridfinityDividerThickness, DEFAULT_GRIDFINITY_DIVIDER_THICKNESS, MIN_GRIDFINITY_DIVIDER_THICKNESS, MAX_GRIDFINITY_DIVIDER_THICKNESS);
}

/** The bin's inside along an axis, from wall to wall. */
function insideLength(plan: GridfinityPlan, axis: GridfinityAxis) {
  const { hx, hz } = labelInside(plan);
  return 2 * (axis === "x" ? hx : hz);
}

/**
 * Each divider's middle along an axis as it is built, in mm from the inside of the left or the back wall.
 * Unset, or a list that does not have one fewer than the compartments, they are evenly spaced. Moved ones
 * keep their place, in order from the wall, only pushed far enough from the walls and one another for every
 * compartment to stay 6 mm wide; so they also keep it when the bin is resized.
 */
export function gridfinityDividerPositions(shape: GridfinityShapeFields, axis: GridfinityAxis) {
  const n = gridfinityCompartmentCount(shape, axis);
  if (n < 2) return [];
  const length = insideLength(gridfinityPlan(shape), axis);
  const thickness = gridfinityDividerThickness(shape);
  const stored = axis === "x" ? shape.gridfinityDividerPositionsX : shape.gridfinityDividerPositionsZ;
  if (!Array.isArray(stored) || stored.length !== n - 1 || !stored.every(Number.isFinite)) {
    const width = (length - (n - 1) * thickness) / n;
    return Array.from({ length: n - 1 }, (_, i) => (i + 1) * width + i * thickness + thickness / 2);
  }
  const step = MIN_GRIDFINITY_COMPARTMENT + thickness;
  const positions: number[] = [];
  // Each within the room the walls leave it with all the others at their closest, and past the one before it;
  // that one is at most its own room's end, a step before this one's, so pushing on never crosses the far wall.
  [...stored].sort((a, b) => a - b).forEach((p, i) => {
    const low = MIN_GRIDFINITY_COMPARTMENT + thickness / 2 + i * step;
    const high = length - MIN_GRIDFINITY_COMPARTMENT - thickness / 2 - (n - 2 - i) * step;
    positions.push(Math.max(clamp(p, low, high), i === 0 ? low : positions[i - 1] + step));
  });
  return positions;
}

/**
 * How far one divider can be moved with the others where they are, for its slider: rounded inwards onto
 * steps of 0.1 mm, as a slider whose end is off its steps steps off them, but never past where the divider
 * is, so the slider shows it and a range too narrow for a step keeps it. Null for a divider the bin does not have.
 */
export function gridfinityDividerLimits(shape: GridfinityShapeFields, axis: GridfinityAxis, index: number) {
  const positions = gridfinityDividerPositions(shape, axis);
  if (!Number.isInteger(index) || index < 0 || index >= positions.length) return null;
  const length = insideLength(gridfinityPlan(shape), axis);
  const thickness = gridfinityDividerThickness(shape);
  const min = index === 0 ? MIN_GRIDFINITY_COMPARTMENT + thickness / 2 : positions[index - 1] + thickness + MIN_GRIDFINITY_COMPARTMENT;
  const max = index === positions.length - 1 ? length - MIN_GRIDFINITY_COMPARTMENT - thickness / 2 : positions[index + 1] - thickness - MIN_GRIDFINITY_COMPARTMENT;
  const position = positions[index];
  return { min: Math.min(position, Math.ceil(min * 10 - 1e-6) / 10), max: Math.max(position, Math.floor(max * 10 + 1e-6) / 10) };
}

/** One compartment in the shape's frame: its sides, middle and half sizes, and which of the bin's walls it lies against. */
export type GridfinityCompartment = {
  column: number;
  row: number;
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  centre: FlatPoint;
  hx: number;
  hz: number;
  onWall: Record<GridfinityWall, boolean>;
  /** The bin's open sides it lies against (#682). */
  open: Record<GridfinityWall, boolean>;
  /** The bin's sides switched open it lies against, in full or partly (#455): no label there. */
  switched: Record<GridfinityWall, boolean>;
};

/**
 * The bin's compartments, counted from the back left row by row, with the dividers' top and thickness and
 * their middles in the shape's frame (centred, xs across and zs deep); null for a bin of one compartment.
 */
export function gridfinityCompartments(shape: GridfinityShapeFields) {
  const counts = compartmentCounts(shape);
  if (counts.x === 1 && counts.z === 1) return null;
  const plan = gridfinityPlan(shape);
  const { hx, hz } = labelInside(plan);
  const thickness = gridfinityDividerThickness(shape);
  const xs = gridfinityDividerPositions(shape, "x").map((p) => p - hx);
  const zs = gridfinityDividerPositions(shape, "z").map((p) => p - hz);
  // A compartment runs from the wall's inside or a divider's face to the next.
  const sides = (dividers: number[], half: number) => ({ from: [-half, ...dividers.map((d) => d + thickness / 2)], to: [...dividers.map((d) => d - thickness / 2), half] });
  const across = sides(xs, hx);
  const deep = sides(zs, hz);
  const cells: GridfinityCompartment[] = [];
  for (let row = 0; row < counts.z; row += 1) {
    for (let column = 0; column < counts.x; column += 1) {
      const [x0, x1, z0, z1] = [across.from[column], across.to[column], deep.from[row], deep.to[row]];
      cells.push({
        column, row, x0, x1, z0, z1,
        centre: { x: (x0 + x1) / 2, z: (z0 + z1) / 2 },
        hx: (x1 - x0) / 2,
        hz: (z1 - z0) / 2,
        onWall: { back: row === 0, front: row === counts.z - 1, left: column === 0, right: column === counts.x - 1 },
        open: { back: row === 0 && plan.open.back, front: row === counts.z - 1 && plan.open.front, left: column === 0 && plan.open.left, right: column === counts.x - 1 && plan.open.right },
        switched: { back: row === 0 && plan.switched.back, front: row === counts.z - 1 && plan.switched.front, left: column === 0 && plan.switched.left, right: column === counts.x - 1 && plan.switched.right },
      });
    }
  }
  return { top: plan.dividerTop, thickness, xs, zs, cells };
}

/** How far each compartment's cutter reaches up into the cutter over the dividers' top, so their faces do not coincide. */
export const GRIDFINITY_DIVIDER_CUTTER_OVERLAP = 0.3;

export type GridfinityCompartmentPieces = {
  /** The dividers' top. */
  top: number;
  floor: number;
  thickness: number;
  /** Every compartment's floor edges are rounded as the inner corners, with a scoop or without, so the dividers meet the floor in a curve. */
  floorRounding: number;
  /** How far a compartment's cutter runs out through an open side (gridfinityOpenReach). */
  reach: number;
  /** Each compartment, its inside, its scoops and its label in its own frame, centred on its middle. */
  cells: Array<{ column: number; row: number; centre: FlatPoint; onWall: Record<GridfinityWall, boolean>; open: Record<GridfinityWall, boolean>; inside: { hx: number; hz: number; radius: number }; scoops: GridfinityScoopPieces | null; labels: GridfinityLabelPieces | null }>;
};

/**
 * A compartment's finger scoops in its own frame: the bin's, each against the wall or the divider on its side, with
 * the radius made smaller where it would leave less than 2 mm of floor, as the bin's is. Where even the smallest
 * radius would leave less, that way's scoops are left out, both of a facing pair, as a bin too low has none.
 */
function compartmentScoops(pieces: GridfinityScoopPieces, hx: number, hz: number, wallThickness: number, open?: Record<GridfinityWall, boolean>): GridfinityScoopPieces | null {
  const walls = pieces.scoops.map((scoop) => scoop.wall);
  const ways = ([[hz, ["back", "front"]], [hx, ["left", "right"]]] as const).map(([half, pair]) => {
    const on = pair.filter((wall) => walls.includes(wall));
    return { on, room: on.length === 2 ? half - 1 : 2 * half - 2 };
  }).filter((way) => way.on.length > 0 && way.room >= MIN_GRIDFINITY_SCOOP_RADIUS - 1e-9);
  if (ways.length === 0) return null;
  const chosen = Math.min(pieces.radius, ...ways.map((way) => way.room));
  const corner = scoopCornerRadius(pieces.inside.radius);
  const radius = Math.abs(chosen - corner) < SCOOP_CORNER_CLEAR ? corner - SCOOP_CORNER_CLEAR : chosen;
  const scoops = walls.filter((wall) => ways.some((way) => (way.on as readonly GridfinityWall[]).includes(wall))).map((wall): GridfinityScoop => {
    const along = wall === "back" || wall === "front" ? hx : hz;
    // An end at the bin's open side runs past the outline, as the bin's own scoops do.
    const [start, end] = LABEL_SIDE_WALLS[wall].map((side) => (open?.[side] ? wallThickness : 0));
    return { wall, from: -along - start - LABEL_PAST, to: along + end + LABEL_PAST };
  });
  return { floor: pieces.floor, radius, centre: [radius - SCOOP_SINK, pieces.floor + radius - SCOOP_SINK], inside: { hx, hz, radius: pieces.inside.radius }, scoops };
}

/** A compartment label's shortest length, in per cent of its side. */
export const MIN_GRIDFINITY_COMPARTMENT_LABEL_LENGTH = 10;
/** A compartment label shorter than this (mm) would be a nub in the corner, and is not built. */
export const MIN_GRIDFINITY_COMPARTMENT_LABEL_MM = 4;
/** What a compartment label leaves open in front of it (mm), so it never closes the compartment off. */
const COMPARTMENT_LABEL_OPEN = 6;
/**
 * A label end, or its end piece's outer edge, this close to where the compartment's corner starts to round goes onto it:
 * a few thousandths of a millimetre off it left edges shorter than 0.01 mm in the exact body.
 */
const COMPARTMENT_LABEL_SNAP = 0.05;

/** The rounding or chamfer of a compartment's label, in mm: the bin's, at most what keeps its narrowest label 1 mm from the middle, as the bin's own cap. */
export function gridfinityCompartmentCornerSize(shape: GridfinityShapeFields, cell: { hx: number; hz: number }) {
  return clamp(gridfinityLabelCornerSize(shape), 0, Math.max(0, Math.min(MAX_GRIDFINITY_LABEL_CORNER_SIZE, Math.min(cell.hx, cell.hz) - 1 - MIN_GRIDFINITY_LABEL_WIDTH)));
}

/**
 * The widest label a compartment takes on a side: its underside above the floor, and 6 mm of the compartment left open
 * in front of it and its corner. None on a side switched open, in full or in part, as on the bin's other shelves.
 */
export function gridfinityCompartmentLabelMaxWidth(shape: GridfinityShapeFields, cell: { hx: number; hz: number; switched?: Record<GridfinityWall, boolean> }, side: GridfinityWall) {
  if (cell.switched?.[side]) return 0;
  const across = 2 * (side === "back" || side === "front" ? cell.hz : cell.hx);
  return Math.min(labelFloorWidth(gridfinityPlan(shape)), across - COMPARTMENT_LABEL_OPEN - gridfinityCompartmentCornerSize(shape, cell));
}

/**
 * A compartment's label as it is built, null when it has none or the compartment has no room for it: its side, its
 * length in per cent of that side (10 to 100), where it sits along the side and its width (14 mm unless set, within what
 * the compartment takes). The first label for a compartment counts.
 */
export function gridfinityCompartmentLabel(shape: GridfinityShapeFields, column: number, row: number) {
  if (!gridfinityLabelFits(shape)) return null;
  const cell = gridfinityCompartments(shape)?.cells.find((c) => c.column === column && c.row === row);
  const label = shape.gridfinityCompartmentLabels?.find((l) => l.column === column && l.row === row);
  if (!cell || !label || !LABEL_WALLS.includes(label.side)) return null;
  const max = gridfinityCompartmentLabelMaxWidth(shape, cell, label.side);
  if (max < MIN_GRIDFINITY_LABEL_WIDTH) return null;
  return {
    side: label.side,
    length: clampLabel(label.length, 100, MIN_GRIDFINITY_COMPARTMENT_LABEL_LENGTH, 100),
    align: label.align ?? "middle",
    width: clampLabel(label.width, Math.min(DEFAULT_GRIDFINITY_LABEL_WIDTH, max), MIN_GRIDFINITY_LABEL_WIDTH, max),
  };
}

/**
 * A compartment's label as pieces in its own frame, as a bin's shelf on one wall: run into the corners where it nearly
 * reaches them, its free ends moved onto the corner's rounding when they land within COMPARTMENT_LABEL_SNAP of it, and
 * left out under MIN_GRIDFINITY_COMPARTMENT_LABEL_MM.
 */
function compartmentLabelPieces(shape: GridfinityShapeFields, cell: GridfinityCompartment): GridfinityLabelPieces | null {
  const label = gridfinityCompartmentLabel(shape, cell.column, cell.row);
  if (!label) return null;
  const plan = gridfinityPlan(shape);
  const { side, width } = label;
  const size = gridfinityCompartmentCornerSize(shape, cell);
  const round = (shape.gridfinityLabelCorner ?? DEFAULT_GRIDFINITY_LABEL_CORNER) !== "chamfer";
  const along = side === "back" || side === "front" ? cell.hx : cell.hz;
  const length = (label.length / 100) * 2 * along;
  if (length < MIN_GRIDFINITY_COMPARTMENT_LABEL_MM) return null;
  // The lip's support leans into the bin only where the end meets the bin's wall, not a divider.
  const snapAt = (end: number) => LABEL_END_SNAP + (plan.lip && cell.onWall[LABEL_SIDE_WALLS[side][end]] ? labelLipLean(plan.wallThickness) : 0);
  const rounding = plan.innerRadius;
  // The end piece beside a free end, as labelPiecesIn makes it on a wall alone.
  const piece = Math.min(size, width - (round ? Math.min(size, width / 2, (length - LABEL_MIN_FRONT) / 2) : 0) - LABEL_CLEARANCE);
  const snapped = (gap: number) => {
    if (Math.abs(gap - rounding) < COMPARTMENT_LABEL_SNAP) return rounding;
    if (piece > 0 && gap - LABEL_CLEARANCE >= piece && Math.abs(gap - piece - rounding) < COMPARTMENT_LABEL_SNAP) return rounding + piece;
    return gap;
  };
  const spanOf = (wall: GridfinityWall, half: number): LabelSpan => {
    if (label.length >= 100 || length >= 2 * half - snapAt(0) - snapAt(1)) return { centre: 0, length: 2 * half, short: [false, false] };
    // Start and end are along the editor's axes: towards -x on the back and front sides, towards the back on the others.
    const sign = wall === "back" || wall === "right" ? 1 : -1;
    const centre = sign * (label.align === "start" ? -(half - length / 2) : label.align === "end" ? half - length / 2 : 0);
    const short = [centre - length / 2 > -half + snapAt(0), centre + length / 2 < half - snapAt(1)];
    const from = short[0] ? -half + snapped(half + centre - length / 2) : centre - length / 2;
    const to = short[1] ? half - snapped(half - centre - length / 2) : centre + length / 2;
    return { centre: (from + to) / 2, length: to - from, short };
  };
  return labelPiecesIn({ hx: cell.hx, hz: cell.hz, walls: [side], widthOf: () => width, spanOf, size, round, top: plan.dividerTop, floor: plan.floor, open: cell.open, wallThickness: plan.wallThickness });
}

/**
 * The compartments as pieces for the exact body and the mesh: each with the inner wall's corners and a rounded floor,
 * and the bin's finger scoops repeated against every divider that runs the same way as their wall; null for a bin of
 * one compartment.
 */
export function gridfinityCompartmentPieces(shape: GridfinityShapeFields): GridfinityCompartmentPieces | null {
  const compartments = gridfinityCompartments(shape);
  if (!compartments) return null;
  const plan = gridfinityPlan(shape);
  const scoops = gridfinityScoopPieces(shape);
  return {
    top: compartments.top,
    floor: plan.floor,
    thickness: compartments.thickness,
    floorRounding: plan.innerRadius,
    reach: plan.reach,
    cells: compartments.cells.map((cell) => ({
      column: cell.column,
      row: cell.row,
      centre: cell.centre,
      onWall: cell.onWall,
      open: cell.open,
      inside: { hx: cell.hx, hz: cell.hz, radius: plan.innerRadius },
      scoops: scoops && compartmentScoops(scoops, cell.hx, cell.hz, plan.wallThickness, cell.open),
      labels: compartmentLabelPieces(shape, cell),
    })),
  };
}

/** Whether a compartment is too narrow for some of the bin's finger scoops and is built without them, which the settings window says under the radius. */
export function gridfinityScoopsLeftOut(shape: GridfinityShapeFields) {
  const scoops = gridfinityScoopPieces(shape);
  const compartments = scoops && gridfinityCompartments(shape);
  if (!scoops || !compartments) return false;
  const { wallThickness } = gridfinityPlan(shape);
  return compartments.cells.some((cell) => (compartmentScoops(scoops, cell.hx, cell.hz, wallThickness)?.scoops.length ?? 0) < scoops.scoops.length);
}

/**
 * The least volume the cutter over the dividers' top fused with the compartments' cutters can have, from their own
 * volumes: each compartment's cutter overlaps the one above by at most its section times the height it reaches over
 * the top, with the length it runs out through an open side. Less is a compartment the kernel's fuse lost.
 */
export function gridfinityCompartmentCutBound(pieces: GridfinityCompartmentPieces, volumes: { box: number; cutters: number[] }) {
  return pieces.cells.reduce((sum, { inside: { hx, hz, radius }, open }, i) => {
    const grown = gridfinityOpenGrown(hx, hz, open, pieces.reach);
    return sum + volumes.cutters[i] - (4 * grown.hx * grown.hz - (4 - Math.PI) * radius ** 2) * GRIDFINITY_DIVIDER_CUTTER_OVERLAP;
  }, volumes.box);
}

/**
 * The least volume the dividers add to a bin cut to its whole inside: the inside less the compartments, each with its
 * rounded corners, standing from the floor to where the lip's support leaves the wall, and from there up to their top
 * where they are clear of the support, which leans in as far as it rises. Less is a divider the kernel's cut took
 * away. A lost stretch between two others is caught only where the scoops add little.
 */
export function gridfinityDividerBound(plan: GridfinityPlan, pieces: GridfinityCompartmentPieces) {
  const { hx, hz } = labelInside(plan);
  const support = floorMaxHeight(plan);
  // A corner touching an open side is square: the inside's cutter and a compartment's run straight out there. What the
  // dividers add between the inner wall's line and the outline is left out.
  const rounded = (x: number, z: number, open: Record<GridfinityWall, boolean>) => 4 * x * z - ((4 - Math.PI) * plan.innerRadius ** 2 * Object.values(gridfinityOpenCorners(open)).filter((square) => !square).length) / 4;
  const area = pieces.cells.reduce((rest, cell) => rest - rounded(cell.inside.hx, cell.inside.hz, cell.open), rounded(hx, hz, plan.open));
  const lean = Math.max(0, pieces.top - support);
  // Above the support's foot: the inside kept clear of it less each compartment's rectangle there, and back the rounded
  // corners where two dividers meet, 6 mm or more from the walls.
  const span = (from: number, to: number, half: number) => Math.max(0, Math.min(to, half - lean) - Math.max(from, lean - half));
  const corner = ((4 - Math.PI) * plan.innerRadius ** 2) / 4;
  const inner: Array<[GridfinityWall, GridfinityWall]> = [["back", "left"], ["back", "right"], ["front", "left"], ["front", "right"]];
  const clear = pieces.cells.reduce((rest, { centre, inside, onWall }) => rest
    - span(centre.x - inside.hx, centre.x + inside.hx, hx) * span(centre.z - inside.hz, centre.z + inside.hz, hz)
    + inner.filter(([a, b]) => !onWall[a] && !onWall[b]).length * corner, 4 * (hx - lean) * (hz - lean));
  return area * (Math.min(pieces.top, support) - plan.floor) + clear * lean;
}

/**
 * What notches down near the floor take of a divided bin's floor rounding (#455), at most its whole section along each
 * notch, along the wall and at the dividers' ends alike; the bound for the dividers' check is lowered by it. The
 * section draws the rounding in CORNER_STEPS chords, which take a little more than the arc.
 */
export function gridfinityOpeningFloorCut(plan: GridfinityPlan, pieces: GridfinityCompartmentPieces) {
  const r = pieces.floorRounding;
  const section = r * r * (1 - (CORNER_STEPS / 2) * Math.sin(Math.PI / (2 * CORNER_STEPS)));
  return plan.notches.reduce((sum, notch) => sum + (notch.bottom < pieces.floor + r ? section * (notch.to - notch.from) : 0), 0);
}

/** How much of a floor fillet's section of radius r lies under the height h above the floor. */
function filletUnder(r: number, h: number) {
  if (r <= 0) return 0;
  const a = r - Math.min(h, r);
  // r h less the part of a quarter circle from a up to r: the fillet's width at y is r - sqrt(r² - (r - y)²).
  return r * Math.min(h, r) - ((Math.PI * r * r) / 4 - (a * Math.sqrt(r * r - a * a) + r * r * Math.asin(a / r)) / 2);
}

/**
 * The least volume the compartments' floors add to a bin cut to its whole inside with a sharp floor: each compartment's
 * floor rounding, along the bin's walls only up to where the lip's support leaves them, and each scoop at least its
 * square less a quarter circle along its straight part, clear of the corners and of a scoop beside it. With the
 * dividers' bound, a divider the kernel's cut took away comes out under it, unless large scoops leave more in the
 * corners than the divider held.
 */
export function gridfinityCompartmentFloorBound(plan: GridfinityPlan, pieces: GridfinityCompartmentPieces) {
  const r = pieces.floorRounding;
  const under = floorMaxHeight(plan) - plan.floor;
  const fillet = filletUnder(r, r);
  const atWall = filletUnder(r, under);
  const corners: Array<[GridfinityWall, GridfinityWall]> = [["back", "left"], ["back", "right"], ["front", "left"], ["front", "right"]];
  return pieces.cells.reduce((sum, cell) => {
    // Along each side a fillet's section; in each corner a quarter column less an eighth of a ball, at a wall only the
    // part under the support's foot, where its section at y above the floor is a quarter circle of r - y.
    // An open side has a flat floor, rounded only beyond the outline, along it and in its corners.
    const sides = LABEL_WALLS.reduce((total, side) => total + (cell.open[side] ? 0 : cell.onWall[side] ? atWall : fillet) * (2 * (side === "back" || side === "front" ? cell.inside.hx : cell.inside.hz) - 2 * r), 0);
    const rounding = corners.reduce((total, [a, b]) => total + (cell.open[a] || cell.open[b] ? 0 : (Math.PI * (r ** 3 - (r - (cell.onWall[a] || cell.onWall[b] ? Math.min(under, r) : r)) ** 3)) / 12), sides);
    const scoops = cell.scoops;
    if (!scoops) return sum + rounding;
    const [cv, cy] = scoops.centre;
    const section = Math.max(0, cv * (Math.min(cy, pieces.top) - scoops.floor) - (Math.PI * scoops.radius ** 2) / 4 - fillet);
    const walls = scoops.scoops.map((scoop) => scoop.wall);
    const clear = (side: GridfinityWall) => Math.max(r, walls.includes(side) ? cv : 0);
    return scoops.scoops.reduce((total, { wall }) => {
      const along = wall === "back" || wall === "front" ? cell.inside.hx : cell.inside.hz;
      return total + section * Math.max(0, 2 * along - clear(LABEL_SIDE_WALLS[wall][0]) - clear(LABEL_SIDE_WALLS[wall][1]));
    }, sum + rounding);
  }, 0);
}

/** What a change of the compartments along an axis writes: 1 as unset, so a bin taken back to one compartment saves as before, and that axis's dividers evenly spaced again. */
export function gridfinityCompartmentCountPatch(axis: GridfinityAxis, count: number) {
  return axis === "x"
    ? { gridfinityCompartmentsX: count > 1 ? count : undefined, gridfinityDividerPositionsX: undefined }
    : { gridfinityCompartmentsZ: count > 1 ? count : undefined, gridfinityDividerPositionsZ: undefined };
}

/**
 * What moving one divider writes: its axis's whole list, the others where they are built and this one within the
 * room they leave it. From then on that axis keeps its places in mm when the bin is resized; nothing for a divider
 * the bin does not have.
 */
export function gridfinityDividerPositionPatch(shape: GridfinityShapeFields, axis: GridfinityAxis, index: number, value: number): Pick<GridfinityShapeFields, "gridfinityDividerPositionsX" | "gridfinityDividerPositionsZ"> {
  const limits = gridfinityDividerLimits(shape, axis, index);
  if (!limits || !Number.isFinite(value)) return {};
  const positions = gridfinityDividerPositions(shape, axis).map((p, i) => (i === index ? clamp(value, limits.min, limits.max) : p));
  return axis === "x" ? { gridfinityDividerPositionsX: positions } : { gridfinityDividerPositionsZ: positions };
}

/** The largest number a saved project takes in a setting; what the MCP gives is kept within it, so the project opens again. */
const MAX_SAVED_SETTING = 1e6;
/** The most dividers along an axis: 4 compartments a grid unit across the largest bin's 6 units. */
const MAX_GRIDFINITY_DIVIDERS = GRIDFINITY_COMPARTMENTS_PER_UNIT * MAX_GRIDFINITY_UNITS - 1;
/**
 * The most labels kept: one for each compartment any count could give (24 x 24), so labels of compartments a smaller
 * count leaves out come back with it; at most 40 of them are built.
 */
const MAX_GRIDFINITY_COMPARTMENT_LABELS = (MAX_GRIDFINITY_DIVIDERS + 1) ** 2;

/** Dividers' places from outside: a list's finite numbers, at most as many as the largest bin has dividers, within what a project saves; [] for evenly spaced, undefined for no list. */
export function normalizeGridfinityDividerPositions(value: unknown): number[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((p): p is number => typeof p === "number" && Number.isFinite(p)).slice(0, MAX_GRIDFINITY_DIVIDERS).map((p) => clamp(p, 0, MAX_SAVED_SETTING));
}

/**
 * Compartment labels from outside, a list of them: each with its compartment and a known side, its own length,
 * position and width where they are numbers or known words; at most 576, one for each compartment any count could give.
 */
export function normalizeGridfinityCompartmentLabels(value: unknown): GridfinityCompartmentLabel[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const number = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);
  const labels: GridfinityCompartmentLabel[] = [];
  (value as unknown[]).forEach((entry) => {
    if (!entry || typeof entry !== "object") return;
    const { column, row, side, length, align, width } = entry as Record<string, unknown>;
    // No bin has a column or row past MAX_GRIDFINITY_DIVIDERS.
    if (!number(column) || !number(row) || !LABEL_WALLS.includes(side as GridfinityWall)) return;
    const [c, r] = [Math.round(column), Math.round(row)];
    if (c < 0 || r < 0 || c > MAX_GRIDFINITY_DIVIDERS || r > MAX_GRIDFINITY_DIVIDERS) return;
    const label: GridfinityCompartmentLabel = { column: c, row: r, side: side as GridfinityWall };
    // Length and width within what the label is built with, so they are saved as they are built.
    if (number(length)) label.length = clamp(length, MIN_GRIDFINITY_COMPARTMENT_LABEL_LENGTH, 100);
    if (align === "start" || align === "middle" || align === "end") label.align = align;
    if (number(width)) label.width = clamp(width, MIN_GRIDFINITY_LABEL_WIDTH, MAX_SAVED_SETTING);
    labels.push(label);
  });
  return labels.slice(0, MAX_GRIDFINITY_COMPARTMENT_LABELS);
}

/**
 * The dividers' places and the labels an MCP action gives, each list it has as it is kept; an empty one unsets it.
 * A count it gives is written as the settings window writes it, at most the 24 the largest bin builds, which puts
 * that axis's dividers back evenly spaced unless the same action places them.
 */
export function gridfinityListPatch(params: Record<string, unknown>): Pick<GridfinityShapeFields, "gridfinityCompartmentsX" | "gridfinityCompartmentsZ" | "gridfinityDividerPositionsX" | "gridfinityDividerPositionsZ" | "gridfinityCompartmentLabels" | "gridfinityOpenings"> {
  const patch: Pick<GridfinityShapeFields, "gridfinityCompartmentsX" | "gridfinityCompartmentsZ" | "gridfinityDividerPositionsX" | "gridfinityDividerPositionsZ" | "gridfinityCompartmentLabels" | "gridfinityOpenings"> = {};
  for (const [axis, key] of [["x", "gridfinityCompartmentsX"], ["z", "gridfinityCompartmentsZ"]] as const) {
    const count = params[key];
    if (typeof count === "number" && Number.isFinite(count)) Object.assign(patch, gridfinityCompartmentCountPatch(axis, clamp(Math.round(count), 1, MAX_GRIDFINITY_DIVIDERS + 1)));
  }
  for (const key of ["gridfinityDividerPositionsX", "gridfinityDividerPositionsZ"] as const) {
    const positions = normalizeGridfinityDividerPositions(params[key]);
    if (positions) patch[key] = positions.length > 0 ? positions : undefined;
  }
  const labels = normalizeGridfinityCompartmentLabels(params.gridfinityCompartmentLabels);
  if (labels) patch.gridfinityCompartmentLabels = labels.length > 0 ? labels : undefined;
  const openings = normalizeGridfinityOpenings(params.gridfinityOpenings);
  if (openings) patch.gridfinityOpenings = openings.length > 0 ? openings : undefined;
  return patch;
}

export function gridfinityDividerPositionsEqual(a: readonly number[] | undefined, b: readonly number[] | undefined) {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  return a.every((p, i) => p === b[i]);
}

/**
 * Partial openings from outside (#455): one for each known side, the first counting, with its depth, width and distance
 * where they are numbers, kept within what a saved project takes, and its place where it is a known word; the plan
 * keeps them on the wall.
 */
export function normalizeGridfinityOpenings(value: unknown): GridfinityOpening[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const number = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);
  const openings: GridfinityOpening[] = [];
  (value as unknown[]).forEach((entry) => {
    if (!entry || typeof entry !== "object") return;
    const { side, depth, width, align, distance } = entry as Record<string, unknown>;
    if (!LABEL_WALLS.includes(side as GridfinityWall) || openings.some((opening) => opening.side === side)) return;
    const opening: GridfinityOpening = { side: side as GridfinityWall };
    if (number(depth)) opening.depth = clamp(depth, 0, MAX_SAVED_SETTING);
    if (number(width)) opening.width = clamp(width, 0, MAX_SAVED_SETTING);
    if (align === "start" || align === "middle" || align === "end") opening.align = align;
    if (number(distance)) opening.distance = clamp(distance, 0, MAX_SAVED_SETTING);
    openings.push(opening);
  });
  return openings;
}

export function gridfinityOpeningsEqual(a: readonly GridfinityOpening[] | undefined, b: readonly GridfinityOpening[] | undefined) {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  return a.every((opening, i) => {
    const other = b[i];
    return opening.side === other.side && opening.depth === other.depth && opening.width === other.width && opening.align === other.align && opening.distance === other.distance;
  });
}

/**
 * A side's opening as the settings window shows it (#455): its depth from the lip's top, its width, its place and its
 * distance from that end, as built; the full depth and the full wall for a side open in full.
 */
export function gridfinityOpening(shape: GridfinityShapeFields, side: GridfinityWall) {
  const plan = gridfinityPlan(shape);
  const entry = normalizeGridfinityOpenings(shape.gridfinityOpenings)?.find((opening) => opening.side === side);
  const notch = plan.notches.find((n) => n.side === side);
  const { depth, width, distance } = gridfinityOpeningLimits(shape, side);
  return {
    depth: notch ? openingRound(openingTop(plan) - notch.bottom) : depth.max,
    // The whole wall reads as the row's highest, also where it runs out beside a side open in full.
    width: notch ? Math.min(openingRound(notch.to - notch.from), width.max) : width.max,
    align: entry?.align ?? "middle",
    // Clamped as the plan clamps it, to the straight part that runs out to the outline beside a side open in full.
    distance: notch && entry?.align && entry.align !== "middle" ? clamp(entry.distance ?? 0, 0, distance) : 0,
  };
}

/**
 * What a side's opening takes: its depth down to the floor, its width along the wall's straight part between its two
 * corners (the whole side within 0.5 mm of it, as the plan judges it), and how far it can move, out to the outline
 * beside a side open in full.
 */
export function gridfinityOpeningLimits(shape: GridfinityShapeFields, side: GridfinityWall) {
  const plan = gridfinityPlan(shape);
  const notch = plan.notches.find((n) => n.side === side);
  const corner = Math.max(GRIDFINITY_BIN_RADIUS, plan.wallThickness);
  const half = (side === "back" || side === "front" ? plan.size.width : plan.size.depth) / 2;
  const [start, end] = OPENING_ENDS[side];
  const length = 2 * half - (plan.open[start] ? 0 : corner) - (plan.open[end] ? 0 : corner);
  return {
    depth: { min: MIN_GRIDFINITY_OPENING_DEPTH, max: Math.max(MIN_GRIDFINITY_OPENING_DEPTH, openingRound(openingTop(plan) - plan.floor)) },
    width: { min: MIN_GRIDFINITY_OPENING_WIDTH, max: Math.max(MIN_GRIDFINITY_OPENING_WIDTH, openingRound(2 * half - 2 * corner)) },
    distance: notch ? openingRound(length - (notch.to - notch.from)) : 0,
  };
}

/** Whether a side switched open takes a partial opening (#455): not on a bin built solid, nor where the straight part between its corners has no room for the narrowest. */
export function gridfinityOpeningFits(shape: GridfinityShapeFields, side: GridfinityWall) {
  const plan = gridfinityPlan(shape);
  const corner = Math.max(GRIDFINITY_BIN_RADIUS, plan.wallThickness);
  const length = (side === "back" || side === "front" ? plan.size.width : plan.size.depth) - 2 * corner;
  return plan.type !== "baseplate" && plan.switched[side] && !plan.solid && length >= MIN_GRIDFINITY_OPENING_WIDTH;
}

/**
 * Why a compartment's label shelf on a side is left out (#455): the side is open in full and has no wall, or it is only
 * switched open, a partial opening that keeps its wall; nothing when the shelf is built.
 */
export function gridfinityCompartmentLabelLeftOut(cell: { open: Record<GridfinityWall, boolean>; switched: Record<GridfinityWall, boolean> }, side: GridfinityWall): "open" | "switched" | null {
  if (cell.open[side]) return "open";
  return cell.switched[side] ? "switched" : null;
}

/** What a change to one side's opening writes (#455): that side's entry with the change, the other sides' as they are. */
export function gridfinityOpeningPatch(shape: GridfinityShapeFields, side: GridfinityWall, changes: Partial<Omit<GridfinityOpening, "side">>) {
  const openings = normalizeGridfinityOpenings(shape.gridfinityOpenings) ?? [];
  const entry = { ...openings.find((opening) => opening.side === side), ...changes, side };
  return { gridfinityOpenings: [...openings.filter((opening) => opening.side !== side), entry] };
}

/**
 * A notch's section across its wall (#455), in insets from the outline and heights: from 2 mm outside up to the wall's
 * own inside, the lip, its support or the ledge, above the notch's bottom, then out over the top. With the floor's
 * rounding the inside follows it, so a notch down to the floor leaves no rounding standing across it. Both the display
 * mesh and the exact body cut this section along the notch, so they agree.
 */
export function gridfinityOpeningSection(plan: GridfinityPlan, notch: GridfinityNotch, rounding: number): Array<[number, number]> {
  // The inside from the floor up to the top, the highest point reached first: the lip's apex, its chamfer or the flat top.
  const inside = gridfinityWallProfile(plan, rounding).slice(1).reverse();
  const highest = inside.reduce((best, [, y], i) => (y > inside[best][1] + 1e-9 ? i : best), 0);
  const rising = inside.slice(0, highest + 1);
  const bottom = notch.bottom;
  let at = rising[0][0];
  for (let i = 0; i + 1 < rising.length; i += 1) {
    const [[u0, y0], [u1, y1]] = [rising[i], rising[i + 1]];
    if (y0 <= bottom && bottom <= y1 && y1 > y0) {
      at = u0 + ((u1 - u0) * (bottom - y0)) / (y1 - y0);
      break;
    }
  }
  const [uTop, yTop] = rising[highest];
  return [[-OPEN_CLEAR, bottom], [at, bottom], ...rising.filter(([, y]) => y > bottom + 1e-9), [uTop, yTop + 1], [-OPEN_CLEAR, yTop + 1]];
}

/**
 * Where a notch's section stands and runs (#455), in the shape's frame: its corner at the outline and the notch's start,
 * the way in from the wall and the way along it, turned so the three make a right-handed frame with up.
 */
export function gridfinityOpeningFrame(plan: GridfinityPlan, notch: GridfinityNotch) {
  const hx = plan.size.width / 2;
  const hz = plan.size.depth / 2;
  const across = notch.side === "back" || notch.side === "front";
  const inward = { back: { x: 0, z: 1 }, front: { x: 0, z: -1 }, left: { x: 1, z: 0 }, right: { x: -1, z: 0 } }[notch.side];
  const along = across ? { x: 1, z: 0 } : { x: 0, z: 1 };
  // inward x up . along > 0 keeps a mirror out of the transform: up x along is (along.z, 0, -along.x).
  const flip = inward.x * along.z - inward.z * along.x < 0;
  const start = flip ? notch.to : notch.from;
  const wallAt = { back: { x: 0, z: -hz }, front: { x: 0, z: hz }, left: { x: -hx, z: 0 }, right: { x: hx, z: 0 } }[notch.side];
  const origin = across ? { x: start, z: wallAt.z } : { x: wallAt.x, z: start };
  return { origin, inward, along: flip ? { x: -along.x, z: -along.z } : along, length: notch.to - notch.from };
}

/** What a notch's section and corners follow inside the bin (#455): the floor's rounding, a divided bin's, a scooped bin's, or none. */
export function gridfinityOpeningInside(plan: GridfinityPlan, compartments: GridfinityCompartmentPieces | null) {
  return { rounding: compartments ? compartments.floorRounding : plan.floorRounding };
}

export type GridfinityOpeningInside = ReturnType<typeof gridfinityOpeningInside>;

/**
 * How far a notch's corners are rounded or chamfered (#455), seen from outside the wall, at the end it starts from and
 * the one it runs to. The top corners take the size first, at most the straight part of the wall beyond that end and
 * the depth, and stay above the floor's rounding where the section has one, which the dividers' check counts on; the
 * bottom ones then take at most half the width and what the depth leaves. A wall lowered between the corners has no top
 * corners, and a notch run out to the outline beside a side open in full has no corners at that end. A corner set
 * OPENING_CORNER_SNAP under what the notch leaves takes all of it. Where a corner would end within OPENING_CORNER_CLEAR
 * of another corner or of the wall's end, or a crease of the wall's section would cross it that close to one of them,
 * it comes down 0.01 mm at a time, at most OPENING_CORNER_GIVE, and keeps its size if nothing within that is clear.
 * Under 0.5 mm a corner is square.
 */
export function gridfinityOpeningCorners(plan: GridfinityPlan, notch: GridfinityNotch, inside: GridfinityOpeningInside, size = plan.openingCornerSize) {
  const corner = Math.max(GRIDFINITY_BIN_RADIUS, plan.wallThickness);
  const half = (notch.side === "back" || notch.side === "front" ? plan.size.width : plan.size.depth) / 2;
  const [start, end] = OPENING_ENDS[notch.side];
  const top = openingTop(plan);
  const { bottom } = notch;
  const depth = top - bottom;
  const reach = depth - (bottom < plan.floor + inside.rounding ? inside.rounding : 0);
  const round = plan.openingCorner !== "chamfer";
  // A crease that close to the notch's bottom or top leaves a sliver with square corners as well, so it is not counted.
  const creases = gridfinityWallProfile(plan, inside.rounding).map(([, y]) => y).filter((y) => y - bottom > OPENING_CORNER_CLEAR && top - y > OPENING_CORNER_CLEAR);
  const ends = [
    { at: notch.from, out: -1, wall: start, room: notch.from + half - (plan.open[start] ? 0 : corner) },
    { at: notch.to, out: 1, wall: end, room: half - (plan.open[end] ? 0 : corner) - notch.to },
  ];
  // Where the wall's straight part ends beyond each end of the notch.
  const marks = ends.map(({ at, out, room }) => at + out * room);
  type Feature = { s: number; y: number; ours: boolean };
  // An end's corners: their ends, and where each crease of the section crosses them, the arcs or chamfers being ours.
  const features = ({ at, out }: (typeof ends)[number], upper: number, lower: number, ours: boolean) => {
    // How far from the end a corner of size r runs at dy from its centre's height: its arc, or its chamfer at 45 degrees.
    const offset = (r: number, dy: number) => (round ? r - Math.sqrt(Math.max(0, r * r - dy * dy)) : dy);
    const points: Feature[] = [];
    // A square corner is the one point where the end meets the top or the bottom.
    points.push(...(upper > 0 ? [{ s: at, y: top - upper, ours }, { s: at + out * upper, y: top, ours }] : [{ s: at, y: top, ours: false }]));
    points.push(...(lower > 0 ? [{ s: at, y: bottom + lower, ours }, { s: at - out * lower, y: bottom, ours }] : [{ s: at, y: bottom, ours: false }]));
    const crossings = creases.flatMap((h): Feature[] => {
      if (upper > 0 && h > top - upper + 1e-9 && h < top - 1e-9) return [{ s: at + out * offset(upper, h - top + upper), y: h, ours }];
      if (lower > 0 && h > bottom + 1e-9 && h < bottom + lower - 1e-9) return [{ s: at - out * offset(lower, bottom + lower - h), y: h, ours }];
      // Up the notch's straight end between them, as with square corners.
      return h >= bottom + lower - 1e-9 && h <= top - upper + 1e-9 ? [{ s: at, y: h, ours: false }] : [];
    });
    return { points, crossings };
  };
  type Drawn = ReturnType<typeof features>;
  const clash = (fixed: Drawn[], tried: Drawn) => {
    const points = [...fixed.flatMap((f) => f.points), ...tried.points];
    const crossings = [...fixed.flatMap((f) => f.crossings), ...tried.crossings];
    // Exactly the limit is too close too: the kernel measures it a hair under.
    const near = (d: number) => d > 1e-9 && d < OPENING_CORNER_CLEAR + 1e-6;
    return tried.points.some((p) => points.some((q) => q !== p && near(Math.hypot(p.s - q.s, p.y - q.y))) || marks.some((m) => near(Math.abs(p.s - m))))
      || crossings.some((c) => (c.ours && marks.some((m) => near(Math.abs(c.s - m))))
        || points.some((p) => (c.ours || p.ours) && near(Math.hypot(c.s - p.s, c.y - p.y)))
        || crossings.some((d) => d !== c && d.y === c.y && (c.ours || d.ours) && near(Math.abs(c.s - d.s))));
  };
  // The largest size within OPENING_CORNER_GIVE under what the corner takes that clashes with nothing, or that size.
  const fit = (build: (r: number) => Drawn, fixed: Drawn[], ...limits: number[]) => {
    const least = openingRound(Math.min(...limits));
    const largest = least - size > 0 && least - size < OPENING_CORNER_SNAP ? least : Math.min(size, least);
    if (largest < OPENING_CORNER_MIN - 1e-9) return 0;
    const lowest = Math.max(OPENING_CORNER_MIN, largest - OPENING_CORNER_GIVE) - 1e-9;
    for (let k = 0, r = largest; r >= lowest; k += 1, r = (Math.ceil(largest * 100 - 1e-6) - k) / 100) {
      if (!clash(fixed, build(r))) return r;
    }
    return largest;
  };
  const fixed: Drawn[] = [];
  const [first, last] = ends.map((e) => {
    if (plan.open[e.wall] && e.room < 1e-9) return { top: 0, bottom: 0 };
    const upper = e.room > 1e-9 ? fit((r) => features(e, r, 0, true), fixed, e.room, reach) : 0;
    const lower = fit((r) => features(e, upper, r, true), fixed, (notch.to - notch.from) / 2, depth - upper);
    fixed.push(features(e, upper, lower, false));
    return { top: upper, bottom: lower };
  });
  return { fromTop: first.top, fromBottom: first.bottom, toTop: last.top, toBottom: last.bottom };
}

/** The largest rounding or chamfer any corner of the bin's notches takes (#455), what the settings window offers. */
export function gridfinityOpeningMaxCornerSize(shape: GridfinityShapeFields) {
  const plan = gridfinityPlan(shape);
  const inside = gridfinityOpeningInside(plan, gridfinityCompartmentPieces(shape));
  return plan.notches.reduce((most, notch) => Math.max(most, ...Object.values(gridfinityOpeningCorners(plan, notch, inside, MAX_GRIDFINITY_LABEL_CORNER_SIZE))), 0);
}

/** The size set on the notches' corners, in mm to 0.01, within what the largest of them takes. */
export function gridfinityOpeningCornerSize(shape: GridfinityShapeFields) {
  return Math.min(gridfinityPlan(shape).openingCornerSize, gridfinityOpeningMaxCornerSize(shape));
}

/**
 * A notch with rounded or chamfered corners (#455), seen from outside the wall: the notch run on past the ends its top
 * corners reach, and the outline that cuts it, in its frame (along the notch from its start, and up), counter-clockwise,
 * with how far across the wall to run it. `outline` is the mesh's polygon; `segments` is the same outline for the
 * exact body, one line or one true arc (through its middle) each. Both kernels take the section along the longer notch
 * where it meets this outline run across the wall. Nothing for square corners, so a bin without them is built as
 * before. With the lip, the top corners are rounded or chamfered in full on the outer wall only (a little less under a
 * chamfered lip); further in, where the lip slopes down, less.
 */
export function gridfinityOpeningOutline(plan: GridfinityPlan, notch: GridfinityNotch, inside: GridfinityOpeningInside) {
  const { fromTop, fromBottom, toTop, toBottom } = gridfinityOpeningCorners(plan, notch, inside);
  if (fromTop + fromBottom + toTop + toBottom === 0) return null;
  const round = plan.openingCorner !== "chamfer";
  // A quarter about (cx, cy) from one angle to the other in `steps` straight pieces: a chamfer is its two ends, a square
  // corner its centre.
  const point = (r: number, cx: number, cy: number, angle: number): [number, number] => [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  const arc = (steps: number, r: number, cx: number, cy: number, a0: number, a1: number) => Array.from({ length: r > 0 ? steps + 1 : 1 }, (_, k) => point(r, cx, cy, a0 + ((a1 - a0) * k) / steps));
  const top = openingTop(plan);
  const over = top + 2;
  const { from, to, bottom } = notch;
  const longer: GridfinityNotch = { ...notch, from: from - fromTop, to: to + toTop };
  // A top corner that takes all the depth the bottom one leaves, rounded to 1e-6 as the notch is, may reach a hair past
  // it: it is drawn that hair smaller, so the outline never dips under the notch's bottom nor rises over the top.
  const [upperFrom, upperTo] = [Math.min(fromTop, top - bottom - fromBottom), Math.min(toTop, top - bottom - toBottom)];
  const corners = [
    ...(fromTop > 0 ? [[upperFrom, from - upperFrom, top - upperFrom, Math.PI / 2, 0]] : []),
    [fromBottom, from + fromBottom, bottom + fromBottom, Math.PI, 1.5 * Math.PI],
    [toBottom, to - toBottom, bottom + toBottom, 1.5 * Math.PI, 2 * Math.PI],
    ...(toTop > 0 ? [[upperTo, to + upperTo, top - upperTo, Math.PI, Math.PI / 2]] : []),
  ] as Array<[number, number, number, number, number]>;
  // Corners that meet, the top's arc ending where the bottom's starts, give one point: closer than openingRound keeps.
  const apart = (a: [number, number], b: [number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1]) > 1e-6;
  const polygon = [[longer.from, over] as [number, number], ...corners.flatMap(([r, cx, cy, a0, a1]) => arc(round ? CORNER_STEPS : 1, r, cx, cy, a0, a1)), [longer.to, over] as [number, number]]
    .filter((at, i, all) => i === 0 || apart(at, all[i - 1]));
  // For the exact body: lines between the corners, a rounded corner as one arc through its middle.
  type Segment = { from: [number, number]; to: [number, number]; middle?: [number, number] };
  const segments: Segment[] = [];
  let last: [number, number] = [longer.from, over];
  // A point as good as the last one is left out, so the next piece starts exactly where the last one ended.
  const lineTo = (at: [number, number]) => {
    if (!apart(at, last)) return;
    segments.push({ from: last, to: at });
    last = at;
  };
  corners.forEach(([r, cx, cy, a0, a1]) => {
    if (r > 0 && round) {
      lineTo(point(r, cx, cy, a0));
      segments.push({ from: last, middle: point(r, cx, cy, (a0 + a1) / 2), to: point(r, cx, cy, a1) });
      last = point(r, cx, cy, a1);
    } else arc(1, r, cx, cy, a0, a1).forEach(lineTo);
  });
  lineTo([longer.to, over]);
  lineTo([longer.from, over]);
  // A side whose frame runs against the side's own direction has the outline turned round, still counter-clockwise.
  const frame = gridfinityOpeningFrame(plan, longer);
  const reversed = frame.along.x + frame.along.z < 0;
  const place = ([t, y]: [number, number]): [number, number] => [reversed ? longer.to - t : t - longer.from, y];
  const outline = polygon.map(place);
  const placed = segments.map(({ from, to, middle }) => (reversed ? { from: place(to), to: place(from), middle: middle && place(middle) } : { from: place(from), to: place(to), middle: middle && place(middle) }));
  const section = gridfinityOpeningSection(plan, longer, inside.rounding);
  const across = Math.max(...section.map(([u]) => u)) + 1;
  return { notch: longer, outline: reversed ? outline.reverse() : outline, segments: reversed ? placed.reverse() : placed, across: [-OPEN_CLEAR - 1, across] as [number, number] };
}

export function gridfinityCompartmentLabelsEqual(a: readonly GridfinityCompartmentLabel[] | undefined, b: readonly GridfinityCompartmentLabel[] | undefined) {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  return a.every((label, i) => {
    const other = b[i];
    return label.column === other.column
      && label.row === other.row
      && label.side === other.side
      && label.length === other.length
      && label.align === other.align
      && label.width === other.width;
  });
}

/** Whether the bin has pieces joined to it, label shelves, finger scoops or dividers, or a side opened partly, which need Manifold for the display mesh. */
export function gridfinityHasPieces(shape: GridfinityShapeFields) {
  return Boolean(gridfinityLabelPieces(shape) || gridfinityScoopPieces(shape) || gridfinityCompartments(shape) || gridfinityPlan(shape).notches.length > 0);
}

/**
 * The bin's wall from the outside over the top to the floor inside, as insets
 * from the outline: up the outer wall, over the lip (or the flat top of a bin
 * without one), down the inside to the floor. The lip rests on a 45 degree
 * support that grows out of the wall below it; a wall thicker than 1.75 mm
 * stops at a flat ledge 0.85 mm under the top, where the support starts. A
 * chamfer on the lip's top takes `chamfer` off the outer wall and off the
 * slope, as the edge tool does.
 */
export function gridfinityWallProfile(plan: GridfinityPlan, floorRounding = plan.floorRounding, chamfer = plan.lipChamfer): GridfinityStep[] {
  const floor = plan.floor;
  const top = plan.top;
  const wallThickness = plan.wallThickness;
  // The wall down to the floor, with the floor's edge rounded along a quarter circle when there is a rounding.
  const toFloor = (): GridfinityStep[] => {
    if (floorRounding <= 0) return [[wallThickness, floor]];
    const r = floorRounding;
    return Array.from({ length: CORNER_STEPS + 1 }, (_, k): GridfinityStep => {
      const angle = (k / CORNER_STEPS) * (Math.PI / 2);
      return [wallThickness + r - r * Math.cos(angle), floor + r - r * Math.sin(angle)];
    });
  };
  if (!plan.lip) {
    // A solid bin's top ends half the smallest inside from the middle, so it is never a line.
    if (plan.solid) return [[0, plan.base], [0, top], [Math.min(wallThickness, Math.min(plan.size.width, plan.size.depth) / 2 - MIN_GRIDFINITY_INSIDE / 2), top]];
    return [[0, plan.base], [0, top], [wallThickness, top], ...toFloor()];
  }
  const profile: GridfinityStep[] = [[0, GRIDFINITY_FOOT_HEIGHT]];
  [...LIP].reverse().forEach(([inset, y]) => profile.push([inset, top + y]));
  if (chamfer > 0) profile.splice(1, 1, [0, top + GRIDFINITY_LIP_HEIGHT - chamfer], [chamfer * Math.SQRT1_2, top + GRIDFINITY_LIP_HEIGHT - chamfer * Math.SQRT1_2]);
  const support = LIP[0][0] - wallThickness;
  const ledge = top - LABEL_DROP;
  // A low bin has no straight wall inside: the support runs down to the floor, also within FLOOR_SNAP of it, and never
  // thinner than the wall. A wall over 1.75 mm stops at the ledge; a floor at the ledge ends the support on it.
  if (support >= LABEL_DROP) {
    if (top - support > floor + FLOOR_SNAP) profile.push([wallThickness, top - support], ...toFloor());
    else {
      const end = LIP[0][0] - (top - floor);
      profile.push([end < wallThickness - 1e-9 ? wallThickness : end, floor]);
    }
  } else if (floor < ledge) profile.push([GRIDFINITY_LEDGE_INSET, ledge], [wallThickness, ledge], ...toFloor());
  else profile.push([GRIDFINITY_LEDGE_INSET, floor]);
  return profile;
}

type LoopPoint = { x: number; z: number; nx: number; nz: number; wall?: GridfinityWall };

/**
 * A rounded rectangle centred on (cx, cz), half sizes hx and hz, corner
 * radius `radius`, set in by `inset` with its corner centres kept. The points
 * on the straight sides are the corner ends plus `breaksX` (on the two sides
 * along x) and `breaksZ`, so that outlines of one family match point for
 * point. With `open`, an open side stays on the outline at every inset and the
 * corners it touches are square, each point says which side it is on, and a
 * closed side keeps the same points at every inset, as its ends do not move
 * along it (#682).
 */
function roundedLoop(cx: number, cz: number, hx: number, hz: number, radius: number, inset: number, breaksX: number[] = [], breaksZ: number[] = [], open?: Record<GridfinityWall, boolean>): LoopPoint[] {
  // Set in past its radius, the rectangle has square corners and shorter sides: they keep every point of the outlines
  // of their family, those beyond the ends moved onto them, so neighbouring outlines still match point for point.
  const ax = Math.min(hx - radius, hx - inset);
  const az = Math.min(hz - radius, hz - inset);
  const r = Math.max(0, radius - inset);
  const shrink = Math.max(0, inset - radius);
  const points: LoopPoint[] = [];
  const side = (fromX: number, fromZ: number, toX: number, toZ: number, nx: number, nz: number, breaks: number[], wall: GridfinityWall) => {
    const tag = open ? { wall } : {};
    points.push({ x: fromX, z: fromZ, nx, nz, ...tag });
    const along = fromX !== toX;
    const [low, high] = along ? [Math.min(fromX, toX), Math.max(fromX, toX)] : [Math.min(fromZ, toZ), Math.max(fromZ, toZ)];
    const ordered = breaks.filter((b) => b > low - shrink + 1e-9 && b < high + shrink - 1e-9).map((b) => clamp(b, low, high));
    ordered.sort((a, b) => (along ? (toX > fromX ? a - b : b - a) : toZ > fromZ ? a - b : b - a));
    ordered.forEach((b) => points.push(along ? { x: b, z: fromZ, nx, nz, ...tag } : { x: fromX, z: b, nx, nz, ...tag }));
    points.push({ x: toX, z: toZ, nx, nz, ...tag });
  };
  const corner = (ox: number, oz: number, from: number) => {
    for (let k = 1; k < CORNER_STEPS; k += 1) {
      const angle = from + (k / CORNER_STEPS) * (Math.PI / 2);
      points.push({ x: ox + r * Math.cos(angle), z: oz + r * Math.sin(angle), nx: Math.cos(angle), nz: Math.sin(angle) });
    }
  };
  const [x0, x1, z0, z1] = [open?.left ? cx - hx : cx - ax - r, open?.right ? cx + hx : cx + ax + r, open?.back ? cz - hz : cz - az - r, open?.front ? cz + hz : cz + az + r];
  const square = gridfinityOpenCorners(open);
  side(square.backLeft ? x0 : cx - ax, z0, square.backRight ? x1 : cx + ax, z0, 0, -1, breaksX, "back");
  if (!square.backRight) corner(cx + ax, cz - az, -Math.PI / 2);
  side(x1, square.backRight ? z0 : cz - az, x1, square.frontRight ? z1 : cz + az, 1, 0, breaksZ, "right");
  if (!square.frontRight) corner(cx + ax, cz + az, 0);
  side(square.frontRight ? x1 : cx + ax, z1, square.frontLeft ? x0 : cx - ax, z1, 0, 1, breaksX, "front");
  if (!square.frontLeft) corner(cx - ax, cz + az, Math.PI / 2);
  side(x0, square.frontLeft ? z1 : cz + az, x0, square.backLeft ? z0 : cz - az, -1, 0, breaksZ, "left");
  if (!square.backLeft) corner(cx - ax, cz - az, Math.PI);
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
  const sweep = (loop: (inset: number) => LoopPoint[], profile: GridfinityStep[], outside: 1 | -1, wrap = true) => {
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
        // A run of walls between open sides ends at its last point.
        if (!wrap && k + 1 === a.length) return;
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
   * A body corner made square by an open side is fanned like any other, and
   * one beside a padded side, or rounded less than the cell (#856), is filled
   * by paddedCorner.
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
      if (box.edge(sx, "x") && box.edge(sz, "z") && !plan.open[sx > 0 ? "right" : "left"] && !plan.open[sz > 0 ? "front" : "back"]) {
        if (plan.padding[sx > 0 ? "right" : "left"] > 0 || plan.padding[sz > 0 ? "front" : "back"] > 0 || plan.cornerRadius !== radius) {
          paddedCorner(arc, project(end), project(next), y, up);
          continue;
        }
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
  /**
   * A body corner of a padded baseplate (#455), or of one whose corners are
   * rounded less (#856), where the corner of the cell's rounded square no
   * longer meets the body's: the flat face from where the square's sides meet
   * the cell's box, along the body's outline round its corner, and back round
   * the square's arc. Also a bin's wall above its band (#856), against the
   * wall's outline (`body`).
   */
  const paddedCorner = (arc: LoopPoint[], from: { x: number; z: number }, to: { x: number; z: number }, y: number, up: 1 | -1, body = outline(0)) => {
    const same = (p: { x: number; z: number }, q: { x: number; z: number }) => Math.abs(p.x - q.x) < 1e-9 && Math.abs(p.z - q.z) < 1e-9;
    const start = body.findIndex((p) => same(p, from));
    const stop = body.findIndex((p) => same(p, to));
    const along: Array<{ x: number; z: number }> = [];
    for (let k = start; k !== stop; k = (k + 1) % body.length) along.push(body[k]);
    along.push(body[stop]);
    cap(distinctPoints([...along, ...[...arc].reverse()]), [], y, up);
  };
  const circle = (c: { x: number; z: number }) => Array.from({ length: MAGNET_SIDES }, (_, k) => {
    const angle = (2 * Math.PI * k) / MAGNET_SIDES;
    return { x: c.x + (GRIDFINITY_MAGNET_DIAMETER / 2) * Math.cos(angle), z: c.z + (GRIDFINITY_MAGNET_DIAMETER / 2) * Math.sin(angle) };
  });

  const { size, cells, count, pitch } = plan;
  const half = (n: number) => (n * pitch) / 2;
  const cellHalf = plan.type === "bin" ? pitch / 2 - GRIDFINITY_CLEARANCE : pitch / 2;
  const radius = plan.type === "bin" ? GRIDFINITY_BIN_RADIUS : GRIDFINITY_BASEPLATE_RADIUS;
  // Points on the long sides: every grid line inside, and where each foot or socket's corner begins; off the middle with the grid of a padded baseplate.
  const breaks = (n: number, centre: number) => {
    const values: number[] = [];
    for (let i = 0; i < n; i += 1) {
      const c = centre + (i - (n - 1) / 2) * pitch;
      values.push(c - cellHalf + radius, c + cellHalf - radius);
      if (i < n - 1) values.push(c + pitch / 2);
    }
    return values;
  };
  // A tray has no feet whose corners the outline must match.
  const breaksX = plan.type === "tray" ? [] : breaks(count.x, plan.centre.x);
  const breaksZ = plan.type === "tray" ? [] : breaks(count.z, plan.centre.z);
  const outline = (inset: number) => roundedLoop(0, 0, size.width / 2, size.depth / 2, plan.cornerRadius, inset, breaksX, breaksZ);
  const openOutline = (inset: number) => roundedLoop(0, 0, size.width / 2, size.depth / 2, plan.cornerRadius, inset, breaksX, breaksZ, plan.open);
  // A bin's outer wall above the band over its feet, rounded less (#856); it keeps the outline's points along the sides.
  const wallOutline = (inset: number) => roundedLoop(0, 0, size.width / 2, size.depth / 2, plan.wallRadius, inset, breaksX, breaksZ, plan.open);
  const cornered = plan.wallRadius !== plan.cornerRadius;
  const bandTop = plan.base + GRIDFINITY_BIN_CORNER_BAND;
  /** Each closed corner's flat face between the outline's rounding and the wall's above the band, at height y. */
  const wallCorners = (y: number, up: 1 | -1) => {
    const loop = openOutline(0);
    const body = wallOutline(0);
    const rounded = (p: LoopPoint) => Math.abs(p.nx) > 1e-9 && Math.abs(p.nz) > 1e-9;
    loop.forEach((p, k) => {
      if (rounded(p) || !rounded(loop[(k + 1) % loop.length])) return;
      let end = (k + 1) % loop.length;
      while (rounded(loop[end])) end = (end + 1) % loop.length;
      const arc = end > k ? loop.slice(k, end + 1) : [...loop.slice(k), ...loop.slice(0, end + 1)];
      paddedCorner(arc, p, loop[end], y, up, body);
    });
  };
  /** A bin's wall swept from its foot to the floor: up the band, the outer wall above it and the rest on the outline. */
  const sweepWall = (loop: (inset: number) => LoopPoint[], wallLoop: (inset: number) => LoopPoint[], wall: GridfinityStep[], wrap = true) => {
    if (!cornered) return sweep(loop, wall, 1, wrap);
    sweep(loop, [wall[0], [0, bandTop]], 1, wrap);
    sweep(wallLoop, [[0, bandTop], wall[1]], 1, wrap);
    sweep(loop, wall.slice(1), 1, wrap);
  };
  const cellOf = (cell: (typeof cells)[number], inset: number) => roundedLoop(cell.x, cell.z, cellHalf, cellHalf, radius, inset);
  // A cell's box, cut back to the body's outline at the edge; edge() says whether a side is the body's own.
  const cellBox = (cell: (typeof cells)[number]): Box => ({
    x0: cell.i === 0 ? -size.width / 2 : cell.x - pitch / 2,
    x1: cell.i === count.x - 1 ? size.width / 2 : cell.x + pitch / 2,
    z0: cell.j === 0 ? -size.depth / 2 : cell.z - pitch / 2,
    z1: cell.j === count.z - 1 ? size.depth / 2 : cell.z + pitch / 2,
    edge: (sign, axis) => (axis === "x" ? (sign > 0 ? cell.i === count.x - 1 : cell.i === 0) : sign > 0 ? cell.j === count.z - 1 : cell.j === 0),
  });

  /**
   * A bin with a side open (#682): the wall swept along each run of closed sides from a square corner on one open side
   * to one on the next, its end in the open side's plane together with the floor's edge there, and the floor out to
   * the open sides' outline.
   */
  const openBin = (wall: GridfinityStep[]) => {
    const closed = (p: LoopPoint) => !(p.wall && plan.open[p.wall]);
    const runsOf = (loop: LoopPoint[]) => {
      const start = loop.findIndex((p, k) => !closed(p) && closed(loop[(k + 1) % loop.length]));
      const turned = [...loop.slice(start + 1), ...loop.slice(0, start + 1)];
      const runs: LoopPoint[][] = [];
      turned.forEach((p, k) => {
        if (!closed(p)) return;
        if (k === 0 || !closed(turned[k - 1])) runs.push([]);
        runs[runs.length - 1].push(p);
      });
      return runs;
    };
    const runs = runsOf(openOutline(0)).length;
    for (let n = 0; n < runs; n += 1) sweepWall((inset) => runsOf(openOutline(inset))[n], (inset) => runsOf(wallOutline(inset))[n], wall, false);
    const [floorInset, floorY] = wall[wall.length - 1];
    const along = (inset: number, side: GridfinityWall) => openOutline(inset).filter((p) => p.wall === side);
    LABEL_WALLS.filter((side) => plan.open[side]).forEach((side) => {
      // From the foot's top along the open side, up the end of the wall beside it, over the top and down to the floor,
      // back along the floor's edge and down the other wall's end; straight up where the side beside it is open too.
      const steps: GridfinityStep[] = cornered ? [wall[0], [0, bandTop], ...wall.slice(1)] : wall;
      const end = (k: 0 | 1) => (plan.open[LABEL_SIDE_WALLS[side][k]] ? [] : steps.map(([inset, y]) => {
        const points = along(inset, side);
        return at(points[k === 0 ? 0 : points.length - 1], y);
      }));
      const points = [...along(0, side).map((p) => at(p, plan.base)), ...end(1), ...along(floorInset, side).map((p) => at(p, floorY)).reverse(), ...end(0).reverse()];
      const face = points.filter((p, k) => {
        const q = points[(k + 1) % points.length];
        return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) > 1e-9;
      });
      const across = side === "back" || side === "front";
      const outward: Vec3 = across ? [0, 0, side === "front" ? 1 : -1] : [side === "right" ? 1 : -1, 0, 0];
      THREE.ShapeUtils.triangulateShape(face.map((p) => new THREE.Vector2(across ? p[0] : p[2], p[1])), []).forEach(([a, b, c]) => push(face[a], face[b], face[c], outward));
    });
    cap(distinctPoints(openOutline(floorInset)), [], floorY, 1);
  };

  if (plan.type !== "baseplate") {
    const wall = gridfinityWallProfile(plan);
    const opened = LABEL_WALLS.some((side) => plan.open[side]);
    if (opened) openBin(wall);
    else sweepWall(outline, wallOutline, wall);
    if (cornered) {
      wallCorners(bandTop, -1);
      wallCorners(wall[1][1], 1);
    }
    const [floorInset, floorY] = wall[wall.length - 1];
    // A floor rounded as far as the inner corners' radius has corners of no radius, whose points coincide.
    if (!opened) cap(distinctPoints(outline(floorInset)), [], floorY, 1);
    // A tray's flat bottom, on the very points the wall starts on.
    if (plan.type === "tray") cap(distinctPoints(opened ? openOutline(0) : outline(0)), [], plan.base, -1);
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

/** Segments round a full circle in the shelves' corners and in the bin's inside the pieces are cut to. */
const LABEL_CIRCLE_SEGMENTS = 32;
/** The inside the pieces are cut to reaches this far into the wall, below the floor and above the top, so no sliver is left between the two polygons of a round corner. */
const LABEL_INSIDE_OVERLAP = 0.05;
/**
 * In the display mesh the shelf and scoop pieces are moved together by this much, differently along each axis
 * (down, so the stacking gap only grows): whole-millimetre settings put a piece's edge exactly on an
 * edge or vertex of the bin's polygon (where the wall starts to curve, the top of the lip's support,
 * or a crease on the corner's 45 degree line, where two scoops meet), which Manifold resolves into a
 * pinch. Far below anything printed; the exact body has true arcs and is not moved. A tray's dividers end 0.0017 mm
 * under its top.
 */
const LABEL_MESH_NUDGE: Vec3 = [1.1e-3, -1.7e-3, 0.5e-3];
/**
 * A notch's section follows the bin's own inside, ledge and corners exactly, so in the display mesh it is moved in from
 * the wall, up and along it by this much (#455), into the air: faces lying on the bin's leave degenerate slivers.
 */
const OPENING_MESH_NUDGE: Vec3 = [1.3e-3, 0.9e-3, 0.7e-3];
/**
 * At an open side (#682) the pieces are cut off this far inside the outline: cut exactly at it, a moved piece's end
 * lies in the plane of the bin's open end and Manifold leaves a sliver between them.
 */
const LABEL_OPEN_TRIM = 1e-3;
/** Slivers thinner than this, left where pieces meet exactly on the bin's own vertices, are removed. */
const LABEL_SLIVER = 1e-4;

/**
 * The bin with its label shelves and finger scoops as closed triangles: the bin's own mesh, and the
 * shelves' convex pieces and the scoops' prisms joined to it by Manifold, which keeps the result
 * closed. Without any of them it is gridfinityTriangles. A bin with dividers is filled up to their top
 * and each compartment taken out of the fill, rounded and with its scoops, as the exact body is cut.
 */
export function gridfinityLabelledTriangles(runtime: ManifoldToplevel, shape: GridfinityShapeFields): Vec3[][] {
  const base = gridfinityTriangles(shape);
  const pieces = gridfinityLabelPieces(shape);
  const compartments = gridfinityCompartmentPieces(shape);
  // A bin with dividers has its scoops in its compartments.
  const scoopPieces = compartments ? null : gridfinityScoopPieces(shape);
  const { notches } = gridfinityPlan(shape);
  if (!pieces && !scoopPieces && !compartments && notches.length === 0) return base;
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
    // The shelves, the scoops and the dividers are cut to the same inside, from the floor up past the highest of them.
    const { floor, inside: { hx, hz, radius } } = pieces ?? scoopPieces ?? { floor: compartments?.floor ?? gridfinityPlan(shape).floor, inside: { ...labelInside(gridfinityPlan(shape)), radius: gridfinityPlan(shape).innerRadius } };
    const y0 = floor - LABEL_INSIDE_OVERLAP;
    const height = Math.max(pieces?.top ?? 0, scoopPieces?.centre[1] ?? 0, compartments?.top ?? 0) - y0 + LABEL_INSIDE_OVERLAP;
    // A cylinder standing on y = y0 at (x, z).
    const post = (x: number, z: number, radius: number) => {
      const lying = keep(Manifold.cylinder(height, radius, radius, LABEL_CIRCLE_SEGMENTS));
      const standing = keep(lying.rotate([-90, 0, 0]));
      return keep(standing.translate([x, y0, z]));
    };
    const r = radius + LABEL_INSIDE_OVERLAP;
    // Through an open side the inside runs out as the exact body's cutter does, and every piece is cut off at the outline (#682).
    const { open, size, reach } = gridfinityPlan(shape);
    const grown = gridfinityOpenGrown(hx, hz, open, reach);
    const inside = keep(Manifold.hull([[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => post(grown.x + sx * (grown.hx - radius), grown.z + sz * (grown.hz - radius), r))));
    const trim = LABEL_WALLS.some((wall) => open[wall]) ? keep(Manifold.cube([size.width - 2 * LABEL_OPEN_TRIM, 4 * size.height, size.depth - 2 * LABEL_OPEN_TRIM], true)) : null;
    const profileOf = (of: GridfinityLabelPieces) => (p: GridfinityLabelProfile) => {
      const { start, end } = gridfinityLabelProfileEnds(of, p);
      return keep(Manifold.hull([...start, ...end]));
    };
    const cornerShape = (c: GridfinityLabelCornerShape) => {
      const { outline, circle } = gridfinityLabelCornerOutline(c);
      const block = keep(Manifold.hull(outline.flatMap((p): Vec3[] => [[p.x, y0, p.z], [p.x, y0 + height, p.z]])));
      return circle ? keep(block.subtract(post(circle.centre.x, circle.centre.z, circle.radius))) : block;
    };
    const scoopPrism = (of: GridfinityScoopPieces, scoop: GridfinityScoop) => {
      // The section is extruded along z and turned into the wall's frame: x out from the wall, z along it.
      const origin = gridfinityScoopPoint(of, scoop, scoop.from, [0, 0]);
      const outward = gridfinityScoopPoint(of, scoop, scoop.from, [1, 0]);
      const along = gridfinityScoopPoint(of, scoop, scoop.from + 1, [0, 0]);
      const prism = keep(Manifold.extrude(gridfinityScoopSection(of).outline, scoop.to - scoop.from));
      return keep(prism.transform([outward[0] - origin[0], 0, outward[2] - origin[2], 0, 0, 1, 0, 0, along[0] - origin[0], 0, along[2] - origin[2], 0, origin[0], 0, origin[2], 1]));
    };
    // The inside up to the dividers' top less each compartment: the hull of a ball in each bottom corner, so its floor is
    // rounded as much as its corners, and a post above each up past the top, less its scoops, moved into place.
    const dividers = (c: GridfinityCompartmentPieces) => {
      const r = c.floorRounding;
      const reach = c.top + GRIDFINITY_DIVIDER_CUTTER_OVERLAP - (c.floor + r);
      const cutters = c.cells.map((cell) => {
        const grown = gridfinityOpenGrown(cell.inside.hx, cell.inside.hz, cell.open, c.reach);
        const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]): Vec3 => [grown.x + sx * (grown.hx - r), c.floor + r, grown.z + sz * (grown.hz - r)]);
        const ball = (at: Vec3) => keep(keep(Manifold.sphere(r, LABEL_CIRCLE_SEGMENTS)).translate(at));
        const column = (at: Vec3) => keep(keep(keep(Manifold.cylinder(reach, r, r, LABEL_CIRCLE_SEGMENTS)).rotate([-90, 0, 0])).translate(at));
        // Square inner corners (a wall of 3.75 mm or more) have no rounding: the hull of the corners' points.
        const cutter = keep(r > 0 ? Manifold.hull([...corners.map(ball), ...corners.map(column)]) : Manifold.hull([...corners, ...corners.map(([x, y, z]): Vec3 => [x, y + reach, z])]));
        const scooped = cell.scoops ? keep(cutter.subtract(keep(Manifold.union(cell.scoops.scoops.map((scoop) => scoopPrism(cell.scoops!, scoop)))))) : cutter;
        return keep(scooped.translate([cell.centre.x, 0, cell.centre.z]));
      });
      return keep(keep(inside.trimByPlane([0, -1, 0], -c.top)).subtract(keep(Manifold.union(cutters))));
    };
    const labelParts = (of: GridfinityLabelPieces) => {
      const profile = profileOf(of);
      return [
        ...of.shelves.map(({ profile: p, notches }) => notches.reduce((solid, notch) => keep(solid.subtract(cornerShape(notch))), profile(p))),
        ...of.corners.map((c) => keep(cornerShape(c).intersect(c.under.length === 1 ? profile(c.under[0]) : keep(Manifold.union(c.under.map(profile)))))),
      ];
    };
    // Each compartment's label, cut to its compartment's inside as the shelves are to the bin's, moved into place.
    const compartmentLabels = (c: GridfinityCompartmentPieces) => c.cells.flatMap((cell) => {
      if (!cell.labels) return [];
      const { radius: cr } = cell.inside;
      const { hx: cx, hz: cz, x: ox, z: oz } = gridfinityOpenGrown(cell.inside.hx, cell.inside.hz, cell.open, c.reach);
      const own = keep(Manifold.hull([[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => post(ox + sx * (cx - cr), oz + sz * (cz - cr), cr + LABEL_INSIDE_OVERLAP))));
      return labelParts(cell.labels).map((part) => keep(keep(part.intersect(own)).translate([cell.centre.x, 0, cell.centre.z])));
    });
    const parts = [
      ...(pieces ? labelParts(pieces) : []),
      ...(scoopPieces?.scoops ?? []).map((scoop) => scoopPrism(scoopPieces!, scoop)),
      ...(compartments ? [dividers(compartments), ...compartmentLabels(compartments)] : []),
    ].map((part) => {
      const kept = keep(keep(part.intersect(inside)).translate(LABEL_MESH_NUDGE));
      return trim ? keep(kept.intersect(trim)) : kept;
    });
    // A side opened partly has its notch's section cut out along it, as the exact body has (#455).
    const plan = gridfinityPlan(shape);
    const opening = gridfinityOpeningInside(plan, compartments);
    const notchPrisms = notches.map((notch) => {
      const outline = gridfinityOpeningOutline(plan, notch, opening);
      const cut = outline ? outline.notch : notch;
      const { origin, inward, along, length } = gridfinityOpeningFrame(plan, cut);
      let section = keep(Manifold.extrude(gridfinityOpeningSection(plan, cut, opening.rounding), length));
      if (outline) {
        // Its rounded or chamfered corners: the outline seen from outside the wall, run across the wall in the section's frame.
        const [u0, u1] = outline.across;
        section = keep(section.intersect(keep(keep(Manifold.extrude(outline.outline, u1 - u0)).transform([0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, 0, u1, 0, 0, 1]))));
      }
      const prism = keep(section.translate(OPENING_MESH_NUDGE));
      return keep(prism.transform([inward.x, 0, inward.z, 0, 0, 1, 0, 0, along.x, 0, along.z, 0, origin.x, 0, origin.z, 1]));
    });
    const joined = keep(Manifold.union([bin, ...parts]));
    const notched = notchPrisms.length > 0 ? keep(joined.subtract(keep(Manifold.union(notchPrisms)))) : joined;
    const result = keep(notched.simplify(LABEL_SLIVER));
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
    // The bin is drawn without its shelves, scoops and notches rather than not at all.
    return base;
  } finally {
    new Set(made).forEach((value) => value.delete());
  }
}

/**
 * The bin's triangles with its label shelves and finger scoops. They need Manifold: until it has
 * loaded the bin is drawn without them and asks for it, and the viewport draws it again once it is
 * there (manifoldRevision in its cache key).
 */
function gridfinityDisplayTriangles(shape: GridfinityShapeFields) {
  if (!gridfinityHasPieces(shape)) return gridfinityTriangles(shape);
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
