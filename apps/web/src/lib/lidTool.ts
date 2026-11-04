import type { CrossSection, ManifoldToplevel, Mat4 } from "manifold-3d";
import { shapeToManifoldSolid, disposeManifold, type GroupBuildResult } from "@/lib/editorBooleans";
import { getManifoldRuntime, type ManifoldSolid } from "@/lib/editorMeshCore";
import { numberLocale, t } from "@/lib/i18n";
import { createLocalId } from "@/lib/localIds";
import { splitShapeFromWorldPositions } from "@/lib/modelSplit";
import { sceneShape } from "@/lib/shapeCatalog";
import { canonicalizeShape, isNonSolidShape } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

/**
 * A lid for a body that is open at the top (#1009): a box hollowed with its top open, a pot, a tray. The body is cut just
 * below its rim; the outline of that cut is the body seen from above, the empty part inside it the opening. From these:
 * - plug: a plate as large as the body with a lip below it that goes into the opening, the gap smaller all round;
 * - cap: a plate a wall wider than the body with a rim below it that goes over the outside, the gap larger all round;
 * - both: the lip of the plug and the rim of the cap on one plate, so the body's wall sits in a groove between them (#1062);
 * - flat: only the plate, as large as the body, to glue on or lay on top.
 * With magnets, the lid holds by four round magnets in the corners: a pocket for each in the body's rim and one facing
 * it in the lid's plate. A wall too thin for a pocket gets a post in that corner, from the bottom up to the rim, which
 * the lid's lip then goes round.
 * With a hinge, the lid swings open about an axis along a straight side of the body (the back, or the side picked), flush
 * with the lid's top, behind that side (outside) or in its wall (flush, see `LidHingeStyle`); or, as a pivot lid, it lies
 * in the opening and turns on two pins through the side walls. Outside and flush: knuckles
 * take turns along it, the outer ones the body's, those between the lid's, a gap apart, and a pin goes through them all
 * (a piece of filament, or a pin printed apart). The body's knuckles stand out from its back wall on a 45 degree slope,
 * so the body prints upright without support; the lid's lie on the plate when it is printed turned over.
 * The lid comes out as a body of its own beside the one it closes, turned over with its plate on the plate, ready to
 * print. Everything is worked out with Manifold, in a frame where z is up (the scene's y).
 */

export type LidType = "plug" | "cap" | "both" | "flat";

/** The side of the body a hinge goes along, as seen in the starting view (the back faces away, -z). */
export type LidHingeSide = "back" | "right" | "front" | "left";

/**
 * Where the hinge sits: `outside` behind the back wall (the lid opens all the way), `flush` in the back wall (the box
 * keeps its size; each part notched round the other's knuckles), or `pivot`: the lid lies in the opening and turns on
 * two pins through the side walls, held up by a ledge inside.
 */
export type LidHingeStyle = "outside" | "flush" | "pivot";

/**
 * The kind of lid; the plate's thickness, the gap per side, how deep the lip or rim reaches down and how thick its wall
 * is, in mm. With `magnets`, pockets for four round magnets of that diameter and height, with `magnetGap` of play per
 * side (a little to press them in, more to glue them). With `hinge`, a hinge along the `hingeSide` (the back unless
 * another is picked) for a pin of `hingePin` mm, `hingeGap` between its knuckles, `hingeKnuckles` of them (0: as many as
 * suit its length), and the pin printed apart with `hingePrintPin`. `hingePinPlay` is the pin's play in its holes, per
 * side. With `hingeTeardrop` (the default) the pin's holes have a point on top as each part is printed, so they do not droop.
 */
export type LidOptions = {
  type: LidType;
  thickness: number;
  gap: number;
  depth: number;
  wall: number;
  magnets: boolean;
  magnetDiameter: number;
  magnetHeight: number;
  magnetGap: number;
  hinge: boolean;
  hingePin: number;
  hingeGap: number;
  hingePinPlay: number;
  hingeKnuckles: number;
  hingePrintPin: boolean;
  hingeSide: LidHingeSide;
  hingeTeardrop: boolean;
  hingeStyle: LidHingeStyle;
};

export const LID_TYPES: readonly LidType[] = ["plug", "cap", "both", "flat"];
export const LID_DEFAULTS: LidOptions = {
  type: "plug", thickness: 2, gap: 0.2, depth: 4, wall: 1.6, magnets: false, magnetDiameter: 6, magnetHeight: 2, magnetGap: 0.1,
  hinge: false, hingePin: 1.75, hingeGap: 0.3, hingePinPlay: 0.2, hingeKnuckles: 0, hingePrintPin: false, hingeSide: "back", hingeTeardrop: true, hingeStyle: "outside",
};
export const LID_FITS = [0.1, 0.2, 0.3] as const;
export const MIN_LID_THICKNESS = 0.4;
export const MAX_LID_THICKNESS = 10;
export const MAX_LID_GAP = 1;
export const MIN_LID_DEPTH = 1;
export const MAX_LID_DEPTH = 50;
export const MIN_LID_WALL = 0.4;
export const MAX_LID_WALL = 10;
/** Common round magnets, diameter by height in mm. */
export const LID_MAGNET_SIZES = [{ diameter: 6, height: 2 }, { diameter: 8, height: 3 }, { diameter: 10, height: 3 }] as const;
export const MIN_MAGNET_DIAMETER = 2;
export const MAX_MAGNET_DIAMETER = 25;
export const MIN_MAGNET_HEIGHT = 0.5;
export const MAX_MAGNET_HEIGHT = 10;
export const MAX_MAGNET_GAP = 0.5;
/** How much deeper a pocket is than its magnet, so the magnet never stands proud and the lid closes flat, in mm. */
const MAGNET_DEPTH_EXTRA = 0.2;
/** How much the plate keeps above a pocket in the lid, in mm: about three layers. */
const MAGNET_SKIN = 0.6;
/** How much material is kept round a pocket, and below it in the body, in mm. */
const MAGNET_WALL = 1.2;
/** How many sides a pocket's circle has, in the lid and in the body. */
const MAGNET_SIDES = 48;
/** How far a pocket reaches beyond the face it opens in, so the cut leaves no sheet of no thickness. */
const MAGNET_OVERCUT = 1;
/** The lid types a hinge goes with: a rim round the outside would hit the back wall as the lid swings open. */
export const LID_HINGE_TYPES: readonly LidType[] = ["plug", "flat"];
export const LID_HINGE_SIDES: readonly LidHingeSide[] = ["back", "right", "front", "left"];
export const LID_HINGE_STYLES: readonly LidHingeStyle[] = ["outside", "flush", "pivot"];
/** How wide the ledge is that holds a pivot lid up inside the opening, in mm; its underside steps back at 45 degrees. */
const PIVOT_LEDGE = 1.2;
/** How deep a pivot pin goes into the lid's bar at most, in mm. */
const PIVOT_PIN_DEPTH = 6;
/** The thinnest side wall a pivot pin goes through, in mm. */
const PIVOT_MIN_WALL = 0.8;
/**
 * The turn about the up axis, in degrees, that brings each side to the back, where the hinge is worked out: the frame's
 * +y is the scene's -z (the back), +x the scene's +x (the right).
 */
const HINGE_SIDE_TURN: Record<LidHingeSide, number> = { back: 0, right: 90, front: 180, left: -90 };
export const MIN_HINGE_PIN = 1;
export const MAX_HINGE_PIN = 8;
export const MIN_HINGE_GAP = 0.1;
export const MAX_HINGE_GAP = 1;
export const MAX_HINGE_KNUCKLES = 15;
/** How much play the pin may have in its hole, per side, in mm (0.2 to begin with: a 3 mm pin went in hard at 0.15, #1220). */
export const MIN_HINGE_PIN_PLAY = 0.05;
export const MAX_HINGE_PIN_PLAY = 0.5;
/** How much a knuckle keeps round the pin's hole, in mm. */
const HINGE_KNUCKLE_WALL = 1.6;
/** A knuckle is at least this wide along the axis, in mm. */
const MIN_KNUCKLE_WIDTH = 3;
/** How far the hinge stays from the ends of the straight back side, in mm (its corners may be rounded). */
const HINGE_END_MARGIN = 0.5;
/** How much of a knuckle a teardrop hole leaves above its point, in mm: a point that would reach closer is cut flat. */
const TEARDROP_WALL = 0.8;
/** How much of a printed pin's diameter is taken off underneath, so it lies on a flat and does not roll. */
const PIN_FLAT = 0.1;
/** How far a body's knuckles reach into a straight wall, in mm; on a round one, as far again as the wall falls away. */
const HINGE_WALL_REACH = 0.4;
/** How many sides a knuckle's and a pin's circle has. */
const HINGE_SIDES = 48;
/** How far the lid lies from a pin printed apart, in mm. */
const PIN_SPACING = 5;
/** How far apart the lid lies from the body it closes, in mm. */
const LID_SPACING = 10;
/** An opening smaller than this, in mm², is no opening: the body is closed at the top. */
const MIN_OPENING_AREA = 1;

function finiteNumber(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** The options with a missing, mistyped or out-of-range value replaced by the nearest allowed one. */
export function normalizeLidOptions(value?: Partial<Record<keyof LidOptions, unknown>> | null): LidOptions {
  const result: LidOptions = { ...LID_DEFAULTS };
  const type = typeof value?.type === "string" ? value.type.trim().toLowerCase() : "";
  if ((LID_TYPES as readonly string[]).includes(type)) result.type = type as LidType;
  const thickness = finiteNumber(value?.thickness);
  if (thickness !== null) result.thickness = clamp(thickness, MIN_LID_THICKNESS, MAX_LID_THICKNESS);
  const gap = finiteNumber(value?.gap);
  if (gap !== null) result.gap = clamp(gap, 0, MAX_LID_GAP);
  const depth = finiteNumber(value?.depth);
  if (depth !== null) result.depth = clamp(depth, MIN_LID_DEPTH, MAX_LID_DEPTH);
  const wall = finiteNumber(value?.wall);
  if (wall !== null) result.wall = clamp(wall, MIN_LID_WALL, MAX_LID_WALL);
  if (value?.magnets === true || value?.magnets === "true") result.magnets = true;
  const magnetDiameter = finiteNumber(value?.magnetDiameter);
  if (magnetDiameter !== null) result.magnetDiameter = clamp(magnetDiameter, MIN_MAGNET_DIAMETER, MAX_MAGNET_DIAMETER);
  const magnetHeight = finiteNumber(value?.magnetHeight);
  if (magnetHeight !== null) result.magnetHeight = clamp(magnetHeight, MIN_MAGNET_HEIGHT, MAX_MAGNET_HEIGHT);
  const magnetGap = finiteNumber(value?.magnetGap);
  if (magnetGap !== null) result.magnetGap = clamp(magnetGap, 0, MAX_MAGNET_GAP);
  if (value?.hinge === true || value?.hinge === "true") result.hinge = true;
  const hingePin = finiteNumber(value?.hingePin);
  if (hingePin !== null) result.hingePin = clamp(hingePin, MIN_HINGE_PIN, MAX_HINGE_PIN);
  const hingeGap = finiteNumber(value?.hingeGap);
  if (hingeGap !== null) result.hingeGap = clamp(hingeGap, MIN_HINGE_GAP, MAX_HINGE_GAP);
  const hingePinPlay = finiteNumber(value?.hingePinPlay);
  if (hingePinPlay !== null) result.hingePinPlay = clamp(hingePinPlay, MIN_HINGE_PIN_PLAY, MAX_HINGE_PIN_PLAY);
  // An odd number, so the body holds both ends; 0 leaves it to the hinge's length.
  const hingeKnuckles = finiteNumber(value?.hingeKnuckles);
  if (hingeKnuckles !== null) {
    const whole = Math.round(clamp(hingeKnuckles, 0, MAX_HINGE_KNUCKLES));
    result.hingeKnuckles = whole === 0 ? 0 : Math.max(3, whole % 2 ? whole : whole + 1);
  }
  if (value?.hingePrintPin === true || value?.hingePrintPin === "true") result.hingePrintPin = true;
  const hingeSide = typeof value?.hingeSide === "string" ? value.hingeSide.trim().toLowerCase() : "";
  if ((LID_HINGE_SIDES as readonly string[]).includes(hingeSide)) result.hingeSide = hingeSide as LidHingeSide;
  if (value?.hingeTeardrop === false || value?.hingeTeardrop === "false") result.hingeTeardrop = false;
  const hingeStyle = typeof value?.hingeStyle === "string" ? value.hingeStyle.trim().toLowerCase() : "";
  if ((LID_HINGE_STYLES as readonly string[]).includes(hingeStyle)) result.hingeStyle = hingeStyle as LidHingeStyle;
  return result;
}

/** A knuckle's radius for this pin: its hole with the pin's play (the default's unless given) and a wall round it, in mm. */
export function hingeKnuckleRadius(options: Pick<LidOptions, "hingePin"> & Partial<Pick<LidOptions, "hingePinPlay">>) {
  return options.hingePin / 2 + (options.hingePinPlay ?? LID_DEFAULTS.hingePinPlay) + HINGE_KNUCKLE_WALL;
}

/**
 * Where the hinge goes along the back side (the outline's largest y) of an outline seen from above: its axis (y along
 * the frame, z the height), its knuckles from end to end (even ones the body's, odd ones the lid's), how low the
 * body's knuckles reach down its back wall, and how far they reach into it (`reach`). Along a straight stretch long
 * enough for three knuckles, that is where it goes. A round back (a pot, a tube) has none: then the hinge runs along
 * the part of the outline that stays within a knuckle's radius of the back (`curved`), and the body's knuckles and the
 * lid's web reach as far in as the wall falls away there. An error when even that is too short for three knuckles, or
 * the body is too low for the slope under them.
 */
export function hingePlan(polygons: readonly (readonly Point[])[], options: LidOptions, top: number, bottom: number, innerBack?: number):
  | { backY: number; axisY: number; axisZ: number; radius: number; hole: number; segments: [number, number][]; low: number; start: number; end: number; reach: number; curved: boolean; innerBack: number }
  | { error: LidError } {
  const back = Math.max(...polygons.flat().map(([, y]) => y));
  // The straight stretches along the back: edges whose both ends lie on it, joined where they meet.
  const stretches: [number, number][] = [];
  for (const polygon of polygons) {
    polygon.forEach((point, index) => {
      const next = polygon[(index + 1) % polygon.length];
      if (point[1] >= back - 0.05 && next[1] >= back - 0.05) stretches.push([Math.min(point[0], next[0]), Math.max(point[0], next[0])]);
    });
  }
  stretches.sort((a, b) => a[0] - b[0]);
  const joined: [number, number][] = [];
  for (const stretch of stretches) {
    const last = joined[joined.length - 1];
    if (last && stretch[0] <= last[1] + 1e-6) last[1] = Math.max(last[1], stretch[1]);
    else joined.push([...stretch]);
  }
  const longest = joined.reduce<[number, number] | null>((best, stretch) => (!best || stretch[1] - stretch[0] > best[1] - best[0] ? stretch : best), null);
  const gap = options.hingeGap;
  const radius = hingeKnuckleRadius(options);
  // In the wall, the knuckles run right into the corners: a strip of plate or wall left at an end would stand in the
  // other part's way as the lid turns.
  const margin = options.hingeStyle === "flush" ? 0 : HINGE_END_MARGIN;
  // How many knuckles a stretch takes, and how wide they are; none when not even three fit.
  const knuckles = (range: [number, number] | null) => {
    if (!range) return null;
    const length = range[1] - range[0] - 2 * margin;
    const width = (count: number) => (length - (count - 1) * gap) / count;
    let count = options.hingeKnuckles || Math.min(MAX_HINGE_KNUCKLES, Math.max(3, 2 * Math.round((length / 10 - 1) / 2) + 1));
    while (count > 3 && width(count) < MIN_KNUCKLE_WIDTH) count -= 2;
    return width(count) < MIN_KNUCKLE_WIDTH ? null : { count, width: width(count), start: range[0] + margin, end: range[1] - margin };
  };
  const straight = knuckles(longest);
  const cap = straight ? null : outlineCapAtBack(polygons, back, radius);
  const fit = straight ?? knuckles(cap);
  if (!fit) return { error: { code: "hingeNoBack" } };
  const { count, start, end } = fit;
  const curved = !straight;
  const reach = curved ? radius + HINGE_WALL_REACH : HINGE_WALL_REACH;
  // Flush with the lid's top: outside, behind the back side by the gap; flush, inside it, flush with its outer face.
  const flush = options.hingeStyle === "flush";
  const axisY = flush ? back - radius : back + radius + gap;
  const axisZ = top + options.thickness - radius;
  // A 45 degree slope from the wall to the bottom of the knuckle: outside, from the back face; flush, from the wall's
  // inner face, where a knuckle reaches into the opening past a wall thinner than it.
  const inner = innerBack ?? back - 2 * radius;
  const low = flush ? axisZ - radius * Math.SQRT2 + (axisY - inner) : axisZ - (radius + gap) - radius * Math.SQRT2;
  if (low < bottom + 0.4) return { error: { code: "hingeTooLow" } };
  const w = fit.width;
  const segments = Array.from({ length: count }, (_, index): [number, number] => [start + index * (w + gap), start + index * (w + gap) + w]);
  return { backY: back, axisY, axisZ, radius, hole: options.hingePin / 2 + options.hingePinPlay, segments, low, start, end, reach, curved, innerBack: inner };
}

/** Where a level line at `y` crosses the outline: its leftmost and rightmost crossing, or null when it does not. */
function acrossAt(polygons: readonly (readonly Point[])[], y: number): [number, number] | null {
  let left = Infinity;
  let right = -Infinity;
  for (const polygon of polygons) {
    polygon.forEach((point, index) => {
      const next = polygon[(index + 1) % polygon.length];
      if ((point[1] - y) * (next[1] - y) > 0 || point[1] === next[1]) return;
      const x = point[0] + ((y - point[1]) / (next[1] - point[1])) * (next[0] - point[0]);
      left = Math.min(left, x);
      right = Math.max(right, x);
    });
  }
  return Number.isFinite(left) && Number.isFinite(right) ? [left, right] : null;
}

/**
 * A pivot lid, worked out with the hinge's side at the back (largest y): the lid lies in the opening, its back edge a
 * round bar under the plate, turning about an axis just in front of the back wall; a pin goes through each side wall
 * into the bar's end. The side walls are where the opening and the outline are crossed level with the axis, and they
 * must run straight there for the bar's whole radius. An error when there are no such walls or the body is too low.
 */
export function pivotPlan(outline: readonly (readonly Point[])[], opening: readonly (readonly Point[])[], options: LidOptions, top: number, bottom: number):
  | { axisY: number; axisZ: number; radius: number; hole: number; outer: [number, number]; inner: [number, number]; barFrom: number; barTo: number; depth: number; innerBack: number }
  | { error: LidError } {
  if (!opening.length) return { error: { code: "pivotNoSides" } };
  const radius = hingeKnuckleRadius(options);
  const innerBack = Math.max(...opening.flat().map(([, y]) => y));
  const axisY = innerBack - options.hingeGap - radius;
  const axisZ = top - radius;
  const outer = acrossAt(outline, axisY);
  const inner = acrossAt(opening, axisY);
  if (!outer || !inner) return { error: { code: "pivotNoSides" } };
  // Straight walls: the outline's and the opening's sides are crossed in the same place a bar's radius in front of the
  // axis and behind it, so the bar turns along them and the pins go through them square.
  for (const y of [axisY - radius, axisY + radius]) {
    const o = acrossAt(outline, y);
    const i = acrossAt(opening, y);
    if (!o || !i || [o[0] - outer[0], o[1] - outer[1], i[0] - inner[0], i[1] - inner[1]].some((d) => Math.abs(d) > 0.05)) return { error: { code: "pivotNoSides" } };
  }
  if (inner[0] - outer[0] < PIVOT_MIN_WALL || outer[1] - inner[1] < PIVOT_MIN_WALL) return { error: { code: "pivotNoSides" } };
  const barFrom = inner[0] + options.hingeGap;
  const barTo = inner[1] - options.hingeGap;
  if (barTo - barFrom < 4 * radius) return { error: { code: "pivotNoSides" } };
  if (axisZ - radius < bottom + 0.4 + PIVOT_LEDGE) return { error: { code: "hingeTooLow" } };
  const depth = Math.min(PIVOT_PIN_DEPTH, (barTo - barFrom) / 4);
  return { axisY, axisZ, radius, hole: options.hingePin / 2 + options.hingePinPlay, outer, inner, barFrom, barTo, depth, innerBack };
}

/**
 * The stretch of x round the outline's backmost point where the outline stays within `dip` of the back: where it
 * crosses the line `dip` in front of it, to either side of that point. Null when it does not cross on both sides.
 */
function outlineCapAtBack(polygons: readonly (readonly Point[])[], back: number, dip: number): [number, number] | null {
  const level = back - dip;
  const backmost = polygons.flat().reduce<Point | null>((best, point) => (!best || point[1] > best[1] ? point : best), null);
  if (!backmost) return null;
  let left = -Infinity;
  let right = Infinity;
  for (const polygon of polygons) {
    polygon.forEach((point, index) => {
      const next = polygon[(index + 1) % polygon.length];
      if ((point[1] - level) * (next[1] - level) >= 0) return;
      const x = point[0] + ((level - point[1]) / (next[1] - point[1])) * (next[0] - point[0]);
      if (x <= backmost[0]) left = Math.max(left, x);
      else right = Math.min(right, x);
    });
  }
  return Number.isFinite(left) && Number.isFinite(right) ? [left, right] : null;
}

/** How deep a magnet's pocket is, in the body and in the lid, in mm. */
export function magnetPocketDepth(options: Pick<LidOptions, "magnetHeight">) {
  return options.magnetHeight + MAGNET_DEPTH_EXTRA;
}

/** The thinnest plate that holds a magnet's pocket with a skin above it, in mm (to a tenth, up). */
export function lidThicknessForMagnets(options: Pick<LidOptions, "magnetHeight">) {
  return Math.ceil((magnetPocketDepth(options) + MAGNET_SKIN) * 10 - 1e-6) / 10;
}

export type LidError =
  | { code: "notClosed" | "notOpen" | "tooSmall" | "tooShallow" | "empty" | "magnetsNoRoom" | "hingeLidType" | "hingeNoBack" | "hingeTooLow" | "hingeStyleStraight" | "hingeStyleMagnets" | "pivotNoSides" }
  | { code: "magnetsThinLid"; thickness: number }
  | { code: "kernel"; message?: string };

/** The scene (y up) turned so that y points along z, Manifold's up; a turn about x, so nothing is mirrored. */
const SCENE_TO_UP: Mat4 = [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1];
const UP_TO_SCENE: Mat4 = [1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1];

function signedArea(polygon: readonly (readonly [number, number])[]) {
  let area = 0;
  polygon.forEach(([x, y], index) => {
    const [nx, ny] = polygon[(index + 1) % polygon.length];
    area += x * ny - nx * y;
  });
  return area / 2;
}

/** The outline's points turned by `degrees` (whole quarter turns) about the up axis, counterclockwise seen from above. */
function turnedPolygons(polygons: readonly (readonly Point[])[], degrees: number): Point[][] {
  const cos = Math.round(Math.cos((degrees * Math.PI) / 180));
  const sin = Math.round(Math.sin((degrees * Math.PI) / 180));
  return polygons.map((polygon) => polygon.map(([x, y]): Point => [x * cos - y * sin, x * sin + y * cos]));
}

/** The outline round a cut with every hole in it filled: the body as seen from above at that height. */
function filled(runtime: ManifoldToplevel, section: CrossSection, created: { delete?: () => void }[]) {
  const outer = section.toPolygons().filter((polygon) => signedArea(polygon as [number, number][]) > 0);
  const result = new runtime.CrossSection(outer as [number, number][][], "Positive");
  created.push(result);
  return result;
}

function keep<T extends { delete?: () => void }>(created: { delete?: () => void }[], value: T): T {
  created.push(value);
  return value;
}

type Point = readonly [number, number];

/** The point of the outlines nearest `spot`, and how far it is. */
function nearestOnOutline(polygons: readonly (readonly Point[])[], spot: Point) {
  let best: { point: Point; distance: number } = { point: spot, distance: Infinity };
  for (const polygon of polygons) {
    polygon.forEach((start, index) => {
      const end = polygon[(index + 1) % polygon.length];
      const dx = end[0] - start[0];
      const dy = end[1] - start[1];
      const length = dx * dx + dy * dy;
      const along = length > 1e-18 ? clamp(((spot[0] - start[0]) * dx + (spot[1] - start[1]) * dy) / length, 0, 1) : 0;
      const point: Point = [start[0] + along * dx, start[1] + along * dy];
      const distance = Math.hypot(point[0] - spot[0], point[1] - spot[1]);
      if (distance < best.distance) best = { point, distance };
    });
  }
  return best;
}

/** Whether `spot` lies inside the outlines (even-odd, so a hole in them is outside). */
function insideOutline(polygons: readonly (readonly Point[])[], [x, y]: Point) {
  let inside = false;
  for (const polygon of polygons) {
    polygon.forEach((start, index) => {
      const end = polygon[(index + 1) % polygon.length];
      if ((start[1] > y) !== (end[1] > y) && x < start[0] + ((y - start[1]) * (end[0] - start[0])) / (end[1] - start[1])) inside = !inside;
    });
  }
  return inside;
}

/** The points' convex hull, anticlockwise (Andrew's monotone chain). */
function convexHull(points: readonly Point[]): Point[] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (sorted.length < 3) return sorted;
  const cross = (o: Point, a: Point, b: Point) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Point[] = [];
  for (const point of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) lower.pop();
    lower.push(point);
  }
  const upper: Point[] = [];
  for (const point of [...sorted].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) upper.pop();
    upper.push(point);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/**
 * The turn (in radians, 0 to a quarter turn) of the smallest rectangle round the points: a side of it lies along a side of
 * their hull. A body standing square has none, so a box turned on the plate gets its magnets in its own corners. Of the
 * turns whose rectangle is hardly larger (a round pot has many), the one nearest none.
 */
function snugTurn(points: readonly Point[]) {
  const hull = convexHull(points);
  const quarter = Math.PI / 2;
  const turns = [0, ...hull.map((start, index) => {
    const end = hull[(index + 1) % hull.length];
    return ((Math.atan2(end[1] - start[1], end[0] - start[0]) % quarter) + quarter) % quarter;
  })];
  const sized = turns.map((turn) => {
    const cos = Math.cos(turn);
    const sin = Math.sin(turn);
    const us = hull.map(([x, y]) => x * cos + y * sin);
    const vs = hull.map(([x, y]) => -x * sin + y * cos);
    return { turn, area: (Math.max(...us) - Math.min(...us)) * (Math.max(...vs) - Math.min(...vs)) };
  });
  const smallest = Math.min(...sized.map(({ area }) => area));
  const offSquare = (turn: number) => Math.min(turn, quarter - turn);
  return sized
    .filter(({ area }) => area <= smallest * 1.01)
    .reduce((best, entry) => (offSquare(entry.turn) < offSquare(best.turn) ? entry : best)).turn;
}

/**
 * Where the magnets go, in the frame where z is up: one in each corner of the body as seen from above, as near the
 * corner as a circle of `reach` fits inside the outline. A corner is the point of the outline nearest a corner of the
 * smallest rectangle round it, and the magnet moves in from it at 45 degrees to that rectangle's sides, so in a box,
 * turned or not, it keeps the same distance to both sides and in a round pot it sits on a diagonal. Each comes with the
 * corner it was found from and the rectangle's turn. Null when four do not fit `apart` from one another.
 */
export function magnetPlaces(polygons: readonly (readonly Point[])[], reach: number, apart: number): { centre: Point; corner: Point; turn: number }[] | null {
  const points = polygons.flat();
  if (points.length < 3) return null;
  // Worked out with the rectangle square to the axes, then turned back.
  const turn = snugTurn(points);
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  const square = (point: Point): Point => [point[0] * cos + point[1] * sin, -point[0] * sin + point[1] * cos];
  const back = (point: Point): Point => [point[0] * cos - point[1] * sin, point[0] * sin + point[1] * cos];
  const squared = polygons.map((polygon) => polygon.map(square));
  const xs = squared.flat().map(([x]) => x);
  const ys = squared.flat().map(([, y]) => y);
  const min: Point = [Math.min(...xs), Math.min(...ys)];
  const max: Point = [Math.max(...xs), Math.max(...ys)];
  const furthest = Math.hypot(max[0] - min[0], max[1] - min[1]) / 2;
  const places: { centre: Point; corner: Point; turn: number }[] = [];
  for (const [cornerX, cornerY, signX, signY] of [[min[0], min[1], 1, 1], [max[0], min[1], -1, 1], [max[0], max[1], -1, -1], [min[0], max[1], 1, -1]] as const) {
    const corner = nearestOnOutline(squared, [cornerX, cornerY]).point;
    let found: Point | null = null;
    for (let step = 0; step * 0.05 <= furthest + reach; step += 1) {
      const along = (step * 0.05) / Math.SQRT2;
      const centre: Point = [corner[0] + signX * along, corner[1] + signY * along];
      if (insideOutline(squared, centre) && nearestOnOutline(squared, centre).distance >= reach - 1e-6) {
        found = centre;
        break;
      }
    }
    if (!found) return null;
    places.push({ centre: back(found), corner: back(corner), turn });
  }
  for (let first = 0; first < places.length; first += 1) {
    for (let second = first + 1; second < places.length; second += 1) {
      if (Math.hypot(places[first].centre[0] - places[second].centre[0], places[first].centre[1] - places[second].centre[1]) < apart) return null;
    }
  }
  return places;
}

/** A pocket for a magnet in the body, in the scene's frame: a hole cylinder of this diameter whose bottom lies at `elevation`. */
export type MagnetPocket = { x: number; z: number; elevation: number; height: number; diameter: number };

/**
 * A piece of a post, in the scene's frame, as a shape the CAD kernel knows exactly: the cylinder round a pocket, or the
 * box from it to its corner, turned by `rotation` degrees about the vertical.
 */
export type MagnetPostPart = { kind: "cylinder" | "box"; x: number; z: number; elevation: number; height: number; width: number; depth: number; rotation: number };

/**
 * With magnets: the pockets the body needs, and its posts - as exact pieces (`postParts`) where a cylinder and a box
 * fill each corner within the body, or else as one mesh (`posts`) cut to the body's hull, for a tapering pot or an
 * inner corner.
 */
export type LidMagnets = { posts: ManifoldSolid | null; postParts: MagnetPostPart[]; pockets: MagnetPocket[] };

/**
 * With a hinge: the body's knuckles with their slope (to be grouped with it), a pin printed apart if asked for, lying
 * beside the lid, both in the scene's frame, and how many knuckles the hinge has.
 */
export type LidHinge = { knuckles: ManifoldSolid; pin: ManifoldSolid | null; count: number; cuts: ManifoldSolid | null; style: LidHingeStyle };

export type LidResult = { lid: ManifoldSolid; magnets?: LidMagnets; hinge?: LidHinge } | { error: LidError };

/**
 * The lid for `body` (in the scene's frame, y up), lying turned over beside it: its plate on the workplane at the
 * height of the body's bottom, the lip or rim pointing up. With magnets, also the pockets the body needs, and the posts
 * for the corners where its wall is too thin to hold one (both in the scene's frame, where the body stands).
 */
export function lidForSolid(runtime: ManifoldToplevel, body: ManifoldSolid, given: LidOptions): LidResult {
  const created: { delete?: () => void }[] = [];
  // What is handed back is not deleted with the rest.
  const handed = new Set<unknown>();
  try {
    const options = normalizeLidOptions(given);
    const up = keep(created, body.transform(SCENE_TO_UP));
    const box = up.boundingBox();
    const top = box.max[2];
    const height = top - box.min[2];
    // Just below the rim, so a rim that is a hair uneven still counts as the top.
    const rim = top - Math.min(0.3, height * 0.02);
    let section = keep(created, up.slice(rim));
    const outline = filled(runtime, section, created);
    let opening = keep(created, outline.subtract(section));
    const hasOpening = opening.area() >= MIN_OPENING_AREA;
    if (options.type !== "flat" && !hasOpening) return { error: { code: "notOpen" } };
    if (options.type !== "flat" && options.depth >= height) return { error: { code: "tooShallow" } };
    if (options.hinge && !LID_HINGE_TYPES.includes(options.type)) return { error: { code: "hingeLidType" } };
    // A flush hinge's slots and a pivot lid's pins go where magnets' pockets would sit, in the corners.
    const style: LidHingeStyle = options.hinge ? options.hingeStyle : "outside";
    if (style !== "outside" && options.magnets) return { error: { code: "hingeStyleMagnets" } };
    // A hinge on another side is worked out with that side turned to the back, and its pieces turned back after.
    const turn = HINGE_SIDE_TURN[options.hingeSide];
    const turnedOutline = turnedPolygons(outline.toPolygons() as Point[][], turn);
    const turnedOpening = hasOpening ? turnedPolygons(opening.toPolygons() as Point[][], turn) : [];
    const innerBack = turnedOpening.length ? Math.max(...turnedOpening.flat().map(([, y]) => y)) : undefined;
    const plan = options.hinge && style !== "pivot" ? hingePlan(turnedOutline, options, top, box.min[2], innerBack) : null;
    if (plan && "error" in plan) return { error: plan.error };
    // In the wall, a knuckle needs the wall to run straight along it.
    if (plan && style === "flush" && plan.curved) return { error: { code: "hingeStyleStraight" } };
    const pivot = options.hinge && style === "pivot" ? pivotPlan(turnedOutline, turnedOpening, options, top, box.min[2]) : null;
    if (pivot && "error" in pivot) return { error: pivot.error };

    // The magnets: a pocket in each corner with a wall round it, and a post where the body's wall cannot hold that.
    const pocketRadius = options.magnetDiameter / 2 + options.magnetGap;
    const pocketDepth = magnetPocketDepth(options);
    let magnetCentres: Point[] = [];
    let posts: ManifoldSolid | null = null;
    let postParts: MagnetPostPart[] = [];
    if (options.magnets) {
      if (options.thickness < lidThicknessForMagnets(options) - 1e-9) return { error: { code: "magnetsThinLid", thickness: lidThicknessForMagnets(options) } };
      if (height < pocketDepth + MAGNET_WALL) return { error: { code: "magnetsNoRoom" } };
      const reach = pocketRadius + MAGNET_WALL;
      const polygons = outline.toPolygons() as Point[][];
      const places = magnetPlaces(polygons, reach, 2 * pocketRadius + MAGNET_WALL);
      if (!places) return { error: { code: "magnetsNoRoom" } };
      magnetCentres = places.map(({ centre }) => centre);
      // Each post is the round wall of its pocket and the square from it to the corner, square to the box round the
      // body: a cylinder and a box, exact for the kernel, as long as they stay within the body.
      const pieces = places.map(({ centre, corner, turn }) => {
        const along = (point: Point) => point[0] * Math.cos(turn) + point[1] * Math.sin(turn);
        const across = (point: Point) => -point[0] * Math.sin(turn) + point[1] * Math.cos(turn);
        const square = { width: Math.abs(along(centre) - along(corner)), depth: Math.abs(across(centre) - across(corner)), middle: [(centre[0] + corner[0]) / 2, (centre[1] + corner[1]) / 2] as Point, turn };
        return { centre, square };
      });
      const exactAreas = pieces.flatMap(({ centre, square }) => [
        keep(created, keep(created, runtime.CrossSection.circle(reach, MAGNET_SIDES)).translate([centre[0], centre[1]])),
        ...(square.width > 0.01 && square.depth > 0.01
          ? [keep(created, keep(created, keep(created, runtime.CrossSection.square([square.width, square.depth], true)).rotate((square.turn * 180) / Math.PI)).translate([square.middle[0], square.middle[1]]))]
          : []),
      ]);
      const exactFootprint = keep(created, runtime.CrossSection.union(exactAreas));
      const exactInside = keep(created, exactFootprint.subtract(outline)).area() < 0.01;
      // Where they would not (an inner corner), the round wall drawn out to its corner and cut to the outline.
      const footprint = exactInside ? exactFootprint : keep(created, keep(created, runtime.CrossSection.union(places.map(({ centre, corner }) => keep(created, runtime.CrossSection.hull([
        keep(created, keep(created, runtime.CrossSection.circle(reach, MAGNET_SIDES)).translate([centre[0], centre[1]])),
        [[[corner[0], corner[1]]]],
      ]))))).intersect(outline));
      const added = keep(created, footprint.subtract(section));
      if (added.area() > 0.01) {
        section = keep(created, section.add(footprint));
        opening = keep(created, outline.subtract(section));
        const column = keep(created, keep(created, footprint.extrude(height)).translate([0, 0, box.min[2]]));
        const hull = keep(created, up.hull());
        // Straight up from the bottom, the column stays within a body with upright walls; a pot that tapers cuts it.
        if (exactInside && keep(created, column.subtract(hull)).volume() < 0.01) {
          const toScene = ([x, y]: Point) => ({ x, z: -y });
          postParts = pieces.flatMap(({ centre, square }) => [
            { kind: "cylinder" as const, ...toScene(centre), elevation: box.min[2], height, width: 2 * reach, depth: 2 * reach, rotation: 0 },
            ...(square.width > 0.01 && square.depth > 0.01
              ? [{ kind: "box" as const, ...toScene(square.middle), elevation: box.min[2], height, width: square.width, depth: square.depth, rotation: (square.turn * 180) / Math.PI }]
              : []),
          ]);
        } else {
          const within = keep(created, column.intersect(hull));
          if (!within.isEmpty()) posts = keep(created, within.transform(UP_TO_SCENE));
        }
      }
    }

    const prism = (area: CrossSection, low: number, high: number) => keep(created, keep(created, area.extrude(high - low)).translate([0, 0, low]));
    const parts: ManifoldSolid[] = [];
    if (options.type === "flat") {
      parts.push(prism(outline, top, top + options.thickness));
    } else {
      const inner = keep(created, outline.offset(options.gap, "Round", 2, 48));
      const outer = keep(created, outline.offset(options.gap + options.wall, "Round", 2, 48));
      parts.push(prism(options.type === "plug" ? outline : outer, top, top + options.thickness));
      if (options.type !== "cap") {
        const lip = keep(created, opening.offset(-options.gap, "Round", 2, 48));
        if (lip.area() < MIN_OPENING_AREA) return { error: { code: "tooSmall" } };
        const inside = keep(created, opening.offset(-(options.gap + options.wall), "Round", 2, 48));
        const ring = inside.area() >= MIN_OPENING_AREA ? keep(created, lip.subtract(inside)) : lip;
        parts.push(prism(ring, top - options.depth, top));
      }
      if (options.type !== "plug") parts.push(prism(keep(created, outer.subtract(inner)), top - options.depth, top));
    }
    let made = parts.length === 1 ? parts[0] : keep(created, runtime.Manifold.union(parts));
    // A pivot lid is only a plate lying in the opening, the gap all round, its top level with the rim.
    if (pivot) {
      const inset = keep(created, opening.offset(-options.gap, "Round", 2, 48));
      if (inset.area() < MIN_OPENING_AREA) return { error: { code: "tooSmall" } };
      made = prism(inset, top - options.thickness, top);
    }
    if (made.isEmpty()) return { error: { code: "empty" } };
    // The hinge: the lid's knuckles join its plate by a web as thick as the plate; the body's stand on a slope from its
    // back wall (the hull of the knuckle and a strip of the wall), kept below the plate by the gap. The pin's hole goes
    // through them all.
    let bodyKnuckles: ManifoldSolid | null = null;
    // What a flush hinge or a pivot lid takes out of the body: the slots for the lid's knuckles, the pins' holes.
    let bodyCuts: ManifoldSolid | null = null;
    const along = (from: number, to: number, radius: number, y: number, z: number) =>
      keep(created, keep(created, keep(created, runtime.Manifold.cylinder(to - from, radius, radius, HINGE_SIDES)).rotate([0, 90, 0])).translate([from, y, z]));
    // A profile given as (y, z) points drawn out along x from `from` to `to`: extruded along its own z, then turned so
    // that z runs along x (its x becomes -z, its y stays y).
    const acrossAlong = (from: number, to: number, points: [number, number][]) => {
      const profile = keep(created, new runtime.CrossSection([points.map(([y, z]): [number, number] => [-z, y])], "NonZero"));
      if (profile.area() < 1e-6) return null;
      return keep(created, keep(created, keep(created, profile.extrude(to - from)).rotate([0, 90, 0])).translate([from, 0, 0]));
    };
    // A round hole with a point on the `tip` side (+1 up, -1 down) at 45 degrees, cut flat at `reach` from its middle.
    const teardropAlong = (from: number, to: number, radius: number, tip: 1 | -1, reach: number, y: number, z: number) => {
      const height = Math.max(radius, Math.min(radius * Math.SQRT2, reach));
      const half = radius * Math.SQRT2 - height;
      const point: [number, number][] = half > 1e-6 ? [[-tip * height, -half], [-tip * height, half]] : [[-tip * height, 0]];
      const profile = keep(created, runtime.CrossSection.hull([keep(created, runtime.CrossSection.circle(radius, HINGE_SIDES)), point]));
      return keep(created, keep(created, keep(created, profile.extrude(to - from)).rotate([0, 90, 0])).translate([from, y, z]));
    };
    const unturned = (solid: ManifoldSolid) => (turn ? keep(created, solid.rotate([0, 0, -turn])) : solid);
    const unionOf = (solids: ManifoldSolid[]) => (solids.length === 1 ? solids[0] : keep(created, runtime.Manifold.union(solids)));
    if (plan && style === "flush") {
      // In the wall: the knuckles take turns as outside, flush with the back face and the lid's top. The body's grow out
      // of the wall's inner face on a 45 degree slope where they reach into the opening; the wall is cut round the lid's
      // and the lid's plate round the body's, by the gap, and behind the axis only the round knuckles stay. The lid's lip
      // stops short of the body's knuckles.
      const clearance = plan.radius + options.hingeGap;
      const lidPieces: ManifoldSolid[] = [];
      const bodyPieces: ManifoldSolid[] = [];
      const notches: ManifoldSolid[] = [];
      const slots: ManifoldSolid[] = [];
      plan.segments.forEach(([from, to], index) => {
        const round = along(from, to, plan.radius, plan.axisY, plan.axisZ);
        const room = along(from - options.hingeGap + 0.01, to + options.hingeGap - 0.01, clearance, plan.axisY, plan.axisZ);
        if (index % 2) {
          lidPieces.push(round);
          slots.push(room);
        } else {
          const strip = keep(created, keep(created, runtime.Manifold.cube([to - from, 0.4, plan.axisZ - plan.low])).translate([from, plan.innerBack, plan.low]));
          bodyPieces.push(keep(created, runtime.Manifold.hull([round, strip])));
          notches.push(room);
        }
      });
      // Where the back runs on past the straight stretch into rounded corners, plate and wall are both cut round the axis
      // there, so neither stands in the other's way.
      const across = acrossAt(turnedOutline, plan.axisY);
      if (across) {
        for (const [from, to] of [[across[0] - 1, plan.start - options.hingeGap], [plan.end + options.hingeGap, across[1] + 1]] as const) {
          if (to - from < 1.01) continue;
          const room = along(from, to, clearance, plan.axisY, plan.axisZ);
          slots.push(room);
          notches.push(room);
        }
      }
      const lipCut = keep(created, keep(created, runtime.Manifold.cube([plan.end - plan.start + 2 * options.hingeGap + 1, plan.backY - (plan.axisY - clearance) + 1, top - box.min[2] + 1])).translate([plan.start - options.hingeGap - 0.5, plan.axisY - clearance, box.min[2] - 1]));
      const holeFor = (tip: 1 | -1) => unturned(options.hingeTeardrop ? teardropAlong(plan.start - 1, plan.end + 1, plan.hole, tip, plan.radius - TEARDROP_WALL, plan.axisY, plan.axisZ) : along(plan.start - 1, plan.end + 1, plan.hole, plan.axisY, plan.axisZ));
      // Behind the axis only the knuckles stay, round about it: a square corner of the plate there would swing down into
      // the wall as the lid opens.
      const behind = keep(created, keep(created, runtime.Manifold.cube([(across ? across[1] - across[0] : plan.end - plan.start) + 20, plan.backY - plan.axisY + 1, options.thickness + 2])).translate([(across ? across[0] : plan.start) - 10, plan.axisY, top - 1]));
      made = keep(created, keep(created, made.subtract(unturned(lipCut))).subtract(unturned(behind)));
      made = keep(created, keep(created, keep(created, made.add(unturned(unionOf(lidPieces)))).subtract(unturned(unionOf(notches)))).subtract(holeFor(-1)));
      bodyKnuckles = keep(created, unturned(unionOf(bodyPieces)).subtract(holeFor(1)));
      // The pin's hole runs through the wall too, where the knuckles reach into it.
      bodyCuts = keep(created, unturned(unionOf(slots)).add(holeFor(1)));
    } else if (pivot) {
      // The plate's back edge becomes a round bar the plate turns about, clear of the back wall by the gap; a pin from
      // outside through each side wall into the bar's end (teardrops, each pointing up as its part is printed). A ledge
      // round the opening's other sides, a plate's thickness down, holds the lid level; its underside steps back at
      // 45 degrees, so the body still prints upright without support.
      const back = keep(created, keep(created, runtime.Manifold.cube([pivot.outer[1] - pivot.outer[0] + 20, 100, top - box.min[2] + 20])).translate([pivot.outer[0] - 10, pivot.axisY, box.min[2] - 10]));
      const bar = along(pivot.barFrom, pivot.barTo, pivot.radius, pivot.axisY, pivot.axisZ);
      const pinHole = (from: number, to: number, tip: 1 | -1) => (options.hingeTeardrop ? teardropAlong(from, to, pivot.hole, tip, pivot.radius - TEARDROP_WALL, pivot.axisY, pivot.axisZ) : along(from, to, pivot.hole, pivot.axisY, pivot.axisZ));
      const barHoles = unionOf([pinHole(pivot.barFrom - 1, pivot.barFrom + pivot.depth, -1), pinHole(pivot.barTo - pivot.depth, pivot.barTo + 1, -1)]);
      made = keep(created, keep(created, keep(created, made.subtract(unturned(back))).add(unturned(bar))).subtract(unturned(barHoles)));
      bodyCuts = unturned(unionOf([pinHole(pivot.outer[0] - 1, pivot.inner[0] + 0.5, 1), pinHole(pivot.inner[1] - 0.5, pivot.outer[1] + 1, 1)]));
      // The ledge, in three steps of a third of its width each, kept clear of the bar's turn at the back.
      const ledgeTop = top - options.thickness;
      const steps: ManifoldSolid[] = [];
      for (let step = 0; step < 3; step += 1) {
        const width = PIVOT_LEDGE * (3 - step) / 3;
        const ring = keep(created, opening.subtract(keep(created, opening.offset(-width, "Miter", 2, 48))));
        steps.push(prism(ring, ledgeTop - PIVOT_LEDGE * (step + 1) / 3, ledgeTop - PIVOT_LEDGE * step / 3));
      }
      const barRoom = keep(created, keep(created, runtime.Manifold.cube([pivot.outer[1] - pivot.outer[0] + 20, 100, top - box.min[2] + 20])).translate([pivot.outer[0] - 10, pivot.axisY - pivot.radius - options.hingeGap, box.min[2] - 10]));
      bodyKnuckles = keep(created, unionOf(steps).subtract(unturned(barRoom)));
    } else if (plan) {
      const lidPieces: ManifoldSolid[] = [];
      const bodyPieces: ManifoldSolid[] = [];
      const stripTop = Math.min(plan.axisZ, top - options.hingeGap);
      // On a round side the wall falls away from the hinge's line: the lid's web reaches in to its plate's edge, and
      // under each of the body's knuckles a block reaches in to the wall, its underside on the same 45 degree slope.
      const webReach = plan.curved ? plan.reach : 0.3;
      const blockLow = Math.max(box.min[2] + 0.4, plan.low - plan.reach);
      plan.segments.forEach(([from, to], index) => {
        const round = along(from, to, plan.radius, plan.axisY, plan.axisZ);
        if (index % 2) {
          const web = keep(created, keep(created, runtime.Manifold.cube([to - from, plan.axisY - plan.backY + webReach, options.thickness])).translate([from, plan.backY - webReach, top]));
          lidPieces.push(round, web);
        } else {
          if (plan.curved) {
            const block = acrossAlong(from, to, [[plan.backY - plan.reach, blockLow], [plan.backY, plan.low], [plan.backY, stripTop], [plan.backY - plan.reach, stripTop]]);
            if (block) bodyPieces.push(block);
          }
          const strip = keep(created, keep(created, runtime.Manifold.cube([to - from, 0.4, stripTop - plan.low])).translate([from, plan.backY - 0.4, plan.low]));
          // The hull rises steeply from the strip to the knuckle, close past the plate's back edge: what lies within
          // the gap behind the back and above the gap below the plate is taken off, so the gap is kept there too.
          const clear = keep(created, keep(created, runtime.Manifold.cube([to - from + 2, options.hingeGap + 1, options.thickness + options.hingeGap + 2 * plan.radius])).translate([from - 1, plan.backY - 1, top - options.hingeGap]));
          bodyPieces.push(keep(created, keep(created, runtime.Manifold.hull([round, strip])).subtract(clear)));
        }
      });
      // A teardrop hole points up as each part is printed: the body stands upright, the lid lies turned over, so its
      // point faces the lid's inside. The pin turns in the round part, with the same play.
      const holeFor = (tip: 1 | -1) => unturned(options.hingeTeardrop ? teardropAlong(plan.start - 1, plan.end + 1, plan.hole, tip, plan.radius - TEARDROP_WALL, plan.axisY, plan.axisZ) : along(plan.start - 1, plan.end + 1, plan.hole, plan.axisY, plan.axisZ));
      made = keep(created, keep(created, made.add(unturned(keep(created, runtime.Manifold.union(lidPieces))))).subtract(holeFor(-1)));
      let knuckleBody = unturned(keep(created, runtime.Manifold.union(bodyPieces)));
      // A block reaching in past a thin round wall is kept out of the opening.
      if (plan.curved) knuckleBody = keep(created, knuckleBody.subtract(keep(created, keep(created, opening.extrude(top - box.min[2] + 2)).translate([0, 0, box.min[2] - 1]))));
      bodyKnuckles = keep(created, knuckleBody.subtract(holeFor(1)));
    }
    // The lid's pockets face the body's: they open in the plate's underside, where it lies on the rim.
    if (magnetCentres.length) {
      const pockets = magnetCentres.map(([x, y]) => keep(created, keep(created, runtime.Manifold.cylinder(pocketDepth + MAGNET_OVERCUT, pocketRadius, pocketRadius, MAGNET_SIDES)).translate([x, y, top - MAGNET_OVERCUT])));
      made = keep(created, made.subtract(keep(created, runtime.Manifold.union(pockets))));
    }
    // Turned over about the x axis (y and z change sign, nothing is mirrored), then laid beside the body on its bottom.
    const turned = keep(created, made.transform([1, 0, 0, 0, 0, -1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1]));
    const lidBox = turned.boundingBox();
    const shift: [number, number, number] = [
      box.max[0] + LID_SPACING - lidBox.min[0],
      (box.min[1] + box.max[1]) / 2 - (lidBox.min[1] + lidBox.max[1]) / 2,
      box.min[2] - lidBox.min[2],
    ];
    const placed = keep(created, turned.translate(shift));
    const lid = placed.transform(UP_TO_SCENE);
    handed.add(lid);
    let hinge: LidHinge | undefined;
    if ((plan || pivot) && bodyKnuckles) {
      const knuckles = bodyKnuckles.transform(UP_TO_SCENE);
      handed.add(knuckles);
      const cuts = bodyCuts ? bodyCuts.transform(UP_TO_SCENE) : null;
      if (cuts) handed.add(cuts);
      let pin: ManifoldSolid | null = null;
      // A pin printed apart lies beside the lid, a millimetre shorter than the hinge, so it does not stand out; a pivot
      // lid's two lie side by side, each half a millimetre shorter than wall, gap and the bar's hole together.
      if (options.hingePrintPin) {
        const placedBox = placed.boundingBox();
        const radius = options.hingePin / 2;
        const lengths = pivot
          ? [pivot.inner[0] - pivot.outer[0], pivot.outer[1] - pivot.inner[1]].map((wall) => wall + options.hingeGap + pivot.depth - 0.5)
          : [plan!.end - plan!.start - 1];
        // Lying on a flat a tenth of its diameter wide, so it does not roll and its underside prints clean.
        const flat = PIN_FLAT * 2 * radius;
        const pins = lengths.map((length, index) => {
          const y = placedBox.max[1] + PIN_SPACING + radius + index * (2 * radius + PIN_SPACING);
          const round = along(placedBox.min[0], placedBox.min[0] + length, radius, y, box.min[2] + radius - flat);
          const above = keep(created, keep(created, runtime.Manifold.cube([length + 2, 2 * radius + 2, 2 * radius + 1])).translate([placedBox.min[0] - 1, y - radius - 1, box.min[2]]));
          return keep(created, round.intersect(above));
        });
        pin = unionOf(pins).transform(UP_TO_SCENE);
        handed.add(pin);
      }
      hinge = { knuckles, pin, count: pivot ? 2 : plan!.segments.length, cuts, style };
    }
    if (!options.magnets) return hinge ? { lid, hinge } : { lid };
    handed.add(posts);
    // Back in the scene's frame: up is y, and the frame's y is the scene's z turned round.
    const pockets = magnetCentres.map(([x, y]): MagnetPocket => ({
      x,
      z: -y,
      elevation: top - pocketDepth,
      height: pocketDepth + MAGNET_OVERCUT,
      diameter: 2 * pocketRadius,
    }));
    return { lid, magnets: { posts, postParts, pockets }, ...(hinge ? { hinge } : {}) };
  } catch (error) {
    return { error: { code: "kernel", message: error instanceof Error ? error.message : String(error ?? "") } };
  } finally {
    Array.from(new Set(created)).forEach((value) => {
      if (!handed.has(value)) value.delete?.();
    });
  }
}

/** The message for why the lid could not be made. */
export function lidErrorMessage(error: LidError) {
  switch (error.code) {
    case "notClosed":
      return t("lid.error.notClosed");
    case "notOpen":
      return t("lid.error.notOpen");
    case "tooSmall":
      return t("lid.error.tooSmall");
    case "tooShallow":
      return t("lid.error.tooShallow");
    case "empty":
      return t("lid.error.empty");
    case "magnetsNoRoom":
      return t("lid.error.magnetsNoRoom");
    case "magnetsThinLid":
      return t("lid.error.magnetsThinLid", { thickness: error.thickness.toLocaleString(numberLocale()) });
    case "hingeLidType":
      return t("lid.error.hingeLidType");
    case "hingeNoBack":
      return t("lid.error.hingeNoBack");
    case "hingeTooLow":
      return t("lid.error.hingeTooLow");
    case "hingeStyleStraight":
      return t("lid.error.hingeStyleStraight");
    case "hingeStyleMagnets":
      return t("lid.error.hingeStyleMagnets");
    case "pivotNoSides":
      return t("lid.error.pivotNoSides");
    default:
      return error.message ? t("lid.error.kernel", { message: error.message }) : t("lid.error.kernelUnknown");
  }
}

function positionsOf(mesh: ReturnType<ManifoldSolid["getMesh"]>) {
  const positions: number[] = [];
  for (let index = 0; index < mesh.triVerts.length; index += 1) {
    const offset = mesh.triVerts[index] * mesh.numProp;
    positions.push(mesh.vertProperties[offset], mesh.vertProperties[offset + 1], mesh.vertProperties[offset + 2]);
  }
  return positions;
}

/**
 * With magnets, what the body needs as well: the posts for its corners, if any (cylinders and boxes, or one mesh where
 * those would not fit) and the pockets (hole cylinders).
 */
export type LidShapeMagnets = { posts: WorkplaneShape[]; pockets: WorkplaneShape[] };

/** With a hinge, the body's knuckles (grouped with it, as the posts are) and the pin printed apart, if asked for. */
export type LidShapeHinge = { knuckles: WorkplaneShape; pin: WorkplaneShape | null; count: number; cuts: WorkplaneShape | null; style: LidHingeStyle };

export type LidShapeResult = { lid: WorkplaneShape; magnets?: LidShapeMagnets; hinge?: LidShapeHinge } | { lid: null; error: string };

/**
 * The lid for the selected bodies: the solids joined and the holes among them cut away, then the lid made for what is
 * left. It is a mesh named after the first body, in its colour. With magnets, the posts and pockets for the body come
 * with it, standing where they go: grouped with the bodies, they cut the pockets into them.
 */
export async function lidForShapes(targets: readonly WorkplaneShape[], given: LidOptions): Promise<LidShapeResult> {
  const solids = targets.filter((shape) => !shape.hole && !isNonSolidShape(shape));
  const holes = targets.filter((shape) => shape.hole);
  if (!solids.length) return { lid: null, error: t("lid.error.needsBody") };
  const created: ManifoldSolid[] = [];
  try {
    const runtime = await getManifoldRuntime();
    const closed = (part: ManifoldSolid | null): part is ManifoldSolid => Boolean(part && part.status() === "NoError" && part.numTri() > 0);
    const builtParts = solids.map((shape) => shapeToManifoldSolid(runtime, shape, created));
    const builtCutters = holes.map((shape) => shapeToManifoldSolid(runtime, shape, created));
    const parts = builtParts.filter(closed);
    const cutters = builtCutters.filter(closed);
    if (parts.length !== builtParts.length || cutters.length !== builtCutters.length) {
      return { lid: null, error: lidErrorMessage({ code: "notClosed" }) };
    }
    let body = parts.length === 1 ? parts[0] : runtime.Manifold.union(parts);
    created.push(body);
    if (cutters.length) {
      // The holes joined into one are a body of their own in the kernel's memory, let go with the rest.
      const holesTogether = runtime.Manifold.union(cutters);
      created.push(holesTogether);
      body = body.subtract(holesTogether);
      created.push(body);
    }
    const result = lidForSolid(runtime, body, given);
    if ("error" in result) return { lid: null, error: lidErrorMessage(result.error) };
    created.push(result.lid);
    if (result.magnets?.posts) created.push(result.magnets.posts);
    if (result.hinge) created.push(result.hinge.knuckles, ...(result.hinge.pin ? [result.hinge.pin] : []), ...(result.hinge.cuts ? [result.hinge.cuts] : []));
    const source = solids[0];
    const shape = splitShapeFromWorldPositions(source, positionsOf(result.lid.getMesh()), createLocalId(`${source.id}-lid`), t("lid.name", { name: source.name }));
    if (!shape) return { lid: null, error: lidErrorMessage({ code: "empty" }) };
    const lid = canonicalizeShape({ ...shape, hidden: false });
    let hinge: LidShapeHinge | undefined;
    if (result.hinge) {
      // A pivot lid's part for the body is the ledge it rests on.
      const knuckles = splitShapeFromWorldPositions(source, positionsOf(result.hinge.knuckles.getMesh()), createLocalId(`${source.id}-hinge`), t(result.hinge.style === "pivot" ? "lid.pivotLedgeName" : "lid.hingeKnucklesName", { name: source.name }));
      if (!knuckles) return { lid: null, error: lidErrorMessage({ code: "empty" }) };
      const pin = result.hinge.pin ? splitShapeFromWorldPositions(source, positionsOf(result.hinge.pin.getMesh()), createLocalId(`${source.id}-hinge-pin`), t("lid.hingePinName", { name: source.name })) : null;
      // The slots or pin holes are a hole grouped with the body, as the magnets' pockets are.
      const cutShape = result.hinge.cuts ? splitShapeFromWorldPositions(source, positionsOf(result.hinge.cuts.getMesh()), createLocalId(`${source.id}-hinge-cuts`), t("lid.hingeCutsName", { name: source.name })) : null;
      const cuts = cutShape ? canonicalizeShape({ ...cutShape, hole: true, hidden: false }) : null;
      hinge = { knuckles: canonicalizeShape({ ...knuckles, hidden: false }), pin: pin ? canonicalizeShape({ ...pin, hidden: false }) : null, count: result.hinge.count, cuts, style: result.hinge.style };
    }
    if (!result.magnets) return hinge ? { lid, hinge } : { lid };
    const postName = t("lid.magnetPosts", { name: source.name });
    const meshPost = result.magnets.posts
      ? splitShapeFromWorldPositions(source, positionsOf(result.magnets.posts.getMesh()), createLocalId(`${source.id}-magnet-posts`), postName)
      : null;
    const posts = meshPost
      ? [canonicalizeShape({ ...meshPost, hidden: false })]
      : result.magnets.postParts.map((part) => sceneShape({
        id: createLocalId(`${source.id}-magnet-post`),
        name: postName,
        kind: part.kind,
        color: source.color,
        x: part.x,
        z: part.z,
        elevation: part.elevation,
        width: part.width,
        depth: part.depth,
        height: part.height,
        rotation: part.rotation,
        ...(part.kind === "cylinder" ? { sides: MAGNET_SIDES } : {}),
      }));
    const pockets = result.magnets.pockets.map((pocket, index) => sceneShape({
      id: createLocalId(`${source.id}-magnet`),
      name: t("lid.magnetPocket", { number: index + 1 }),
      kind: "cylinder",
      color: source.color,
      hole: true,
      x: pocket.x,
      z: pocket.z,
      elevation: pocket.elevation,
      width: pocket.diameter,
      depth: pocket.diameter,
      height: pocket.height,
      sides: MAGNET_SIDES,
    }));
    return { lid, magnets: { posts, pockets }, ...(hinge ? { hinge } : {}) };
  } catch (error) {
    return { lid: null, error: lidErrorMessage({ code: "kernel", message: error instanceof Error ? error.message : String(error ?? "") }) };
  } finally {
    Array.from(new Set(created)).forEach(disposeManifold);
  }
}

/**
 * The body grouped with its pockets and posts, by `build` (the editor's grouping, on or off the page). A body made of
 * solids and holes - a box with a box hole in it - is grouped on its own first: in one group its holes would cut the
 * posts standing in its opening too.
 */
export async function groupedWithMagnets(targets: readonly WorkplaneShape[], magnets: LidShapeMagnets, build: (shapes: WorkplaneShape[]) => Promise<GroupBuildResult>): Promise<GroupBuildResult> {
  let body: WorkplaneShape[] = [...targets];
  if (targets.some((shape) => shape.hole)) {
    const inner = await build(body);
    if (!inner.group) return inner;
    body = [canonicalizeShape({ ...inner.group, groupOperation: "group", name: targets.find((shape) => !shape.hole)?.name ?? inner.group.name })];
  }
  return build([...body, ...magnets.posts, ...magnets.pockets]);
}
