import type { CrossSection, ManifoldToplevel, Mat4 } from "manifold-3d";
import { shapeToManifoldSolid, disposeManifold, type GroupBuildResult } from "@/lib/editorBooleans";
import { getManifoldRuntime, type ManifoldSolid } from "@/lib/editorMeshCore";
import { numberLocale, t } from "@/lib/i18n";
import { createLocalId } from "@/lib/localIds";
import { splitShapeFromWorldPositions } from "@/lib/modelSplit";
import { printerPlayStart } from "@/lib/printerPlay";
import { sceneShape } from "@/lib/shapeCatalog";
import { canonicalizeShape, isNonSolidShape } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

/**
 * A lid for a body that is open at the top (#1009): a box hollowed with its top open, a pot, a tray. The body is cut just
 * below its rim; the outline of that cut is the body seen from above, the empty part inside it the opening. From these:
 * - plug: a plate as large as the body with a lip below it that goes into the opening, the gap smaller all round;
 * - cap: a plate a wall wider than the body with a rim below it that goes over the outside, the gap larger all round;
 * - both: the lip of the plug and the rim of the cap on one plate, so the body's wall sits in a groove between them (#1062);
 * - flat: only the plate, as large as the body, to glue on or lay on top;
 * - screw: like a jar (Discussion #1393), for a round body: a thread on the outside of its top, grouped with it, and a
 *   cap whose rim has the matching thread inside, the gap all round (see `screwPlan`).
 * With magnets, the lid holds by four round magnets in the corners: a pocket for each in the body's rim and one facing
 * it in the lid's plate. A wall too thin for a pocket gets a post in that corner, from the bottom up to the rim, which
 * the lid's lip then goes round.
 * With click bumps (#1234), small round bumps on the lip's outer face (a cap: its rim's inner face) snap into dimples cut
 * into the body's wall at the same places; how far they reach into it is a setting (#1220): less for a small box or a
 * stiff lip, more for a firmer click. A handle (#1230) is a pull tab on the plate's front edge, or a finger notch in
 * the body's front wall below the lid's edge: the front, or the side opposite the hinge.
 * With a hinge, the lid swings open about an axis along a straight side of the body (the back, or the side picked), flush
 * with the lid's top, behind that side (outside) or in its wall (flush, see `LidHingeStyle`); or, as a pivot lid, it lies
 * in the opening and turns on two pins through the side walls. Outside and flush: knuckles
 * take turns along it, the outer ones the body's, those between the lid's, a gap apart, and a pin goes through them all
 * (a piece of filament, or a pin printed apart). The pin sits tight in the body's holes (a pivot lid's: in the side
 * walls) and turns in the lid's, which alone have its play (#1220): with the play in every hole, a piece of filament slid
 * out. The body's knuckles stand out from its back wall on a 45 degree slope, so the body prints upright without
 * support; the lid's lie on the plate when it is printed turned over. A flush hinge can have end plugs (Discussion #1387):
 * the last few millimetres of the pin's hole at each end are a square pocket, and a square plug in each, its outer end
 * cut to the body's outline, closes the hole flush with the outside, so the pin is hidden and cannot slide out. On a box
 * with rounded corners a flush hinge's end knuckles run on into the corners, with end plugs or without, and the pin's
 * hole ends in the corners' round faces.
 * The lid comes out as a body of its own beside the one it closes, turned over with its plate on the plate, ready to
 * print. Everything is worked out with Manifold, in a frame where z is up (the scene's y).
 */

export type LidType = "plug" | "cap" | "both" | "flat" | "screw";

/** The side of the body a hinge goes along, as seen in the starting view (the back faces away, -z). */
export type LidHingeSide = "back" | "right" | "front" | "left";

/**
 * Where the hinge sits: `outside` behind the back wall (the lid opens all the way), `flush` in the back wall (the box
 * keeps its size; each part notched round the other's knuckles), or `pivot`: the lid lies in the opening and turns on
 * two pins through the side walls, held up by a ledge inside.
 */
export type LidHingeStyle = "outside" | "flush" | "pivot";

/**
 * A handle on the side the lid opens at (the front, or the side opposite the hinge): `tab` a pull tab on the plate's edge,
 * as thick as the plate; `notch` a finger recess in the body's outer wall just below the lid's edge.
 */
export type LidHandle = "none" | "tab" | "notch";

/**
 * The kind of lid; the plate's thickness, the gap per side, how deep the lip or rim reaches down and how thick its wall
 * is, in mm. With `magnets`, pockets for four round magnets of that diameter and height, with `magnetGap` of play per
 * side (a little to press them in, more to glue them). With `hinge`, a hinge along the `hingeSide` (the back unless
 * another is picked) for a pin of `hingePin` mm, `hingeGap` between its knuckles, `hingeKnuckles` of them (0: as many as
 * suit its length), and the pin printed apart with `hingePrintPin`. `hingePinPlay` is the pin's play per side in the
 * lid's holes, where it turns; in the body's it sits tight (HINGE_PIN_GRIP). With `hingeTeardrop` (the default) the pin's
 * holes have a point on top as each part is printed, so they do not droop. With `hingeEndPlugs`, a flush hinge's pin hole
 * ends in a square pocket at each end, for a plug that closes it flush with the body's outside; the pin is shorter by them.
 * With `clickBumps`, bumps on the lip or rim and dimples for them in the body, so the lid clicks into place, each reaching
 * `clickBumpHeight` into the body's wall past the gap; `handle` a pull tab or a finger notch.
 * A screw lid's thread climbs `threadPitch` mm a turn and goes `threadTurns` times round: that is how far its cap's rim
 * reaches down. The gap is then the thread's room per side, measured across the radius as a nut's clearance is (on the
 * 45 degree flanks that leaves about 0.7 of it), and the wall what the cap's rim keeps outside the thread.
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
  hingeEndPlugs: boolean;
  clickBumps: boolean;
  clickBumpHeight: number;
  handle: LidHandle;
  threadPitch: number;
  threadTurns: number;
};

export const LID_TYPES: readonly LidType[] = ["plug", "cap", "both", "flat", "screw"];
export const LID_DEFAULTS: LidOptions = {
  type: "plug", thickness: 2, gap: 0.2, depth: 4, wall: 1.6, magnets: false, magnetDiameter: 6, magnetHeight: 2, magnetGap: 0.1,
  hinge: false, hingePin: 1.75, hingeGap: 0.3, hingePinPlay: 0.2, hingeKnuckles: 0, hingePrintPin: false, hingeSide: "back", hingeTeardrop: true, hingeStyle: "outside", hingeEndPlugs: false,
  clickBumps: false, clickBumpHeight: 0.4, handle: "none", threadPitch: 3, threadTurns: 2,
};
/**
 * What a lid starts from with this printer's play (printerPlay.ts): the gap per side and the hinge pin's play take it,
 * held within their fields; without a play, or for everything else, the built-in values.
 */
export function lidDefaults(play: number | null): LidOptions {
  const gap = printerPlayStart("lid.gap", play);
  const hingePinPlay = printerPlayStart("lid.hingePinPlay", play);
  return normalizeLidOptions({ ...LID_DEFAULTS, ...(gap === null ? {} : { gap }), ...(hingePinPlay === null ? {} : { hingePinPlay }) });
}
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
/**
 * How much play the pin may have in the lid's holes, where it turns, per side, in mm (0.2 to begin with: a 3 mm pin went
 * in hard at 0.15, #1220).
 */
export const MIN_HINGE_PIN_PLAY = 0.05;
export const MAX_HINGE_PIN_PLAY = 0.5;
/**
 * How much larger than the pin the body's holes are, per side, in mm, whatever the play: the pin sits tight in the body's
 * part of the hinge and only the lid turns on it, so a piece of filament does not slide out (#1220). A printed hole comes
 * out a little smaller than drawn, so this presses filament in. The same as the least play, so the body's knuckles keep
 * at least HINGE_KNUCKLE_WALL round their hole.
 */
export const HINGE_PIN_GRIP = 0.05;
/**
 * How much a knuckle keeps round the lid's hole, in mm; round the body's tighter one it keeps the play less the grip more.
 * The knuckles' size stays that of the lid's.
 */
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
/**
 * A flush hinge's end plugs (Discussion #1387): how far each reaches into the pin's hole from where the hinge's line
 * leaves the body, in mm, and how short it may become where an end knuckle is short. Its pocket stops END_PLUG_KEEP
 * short of the end knuckle's inner side, so the pin still runs into that knuckle and the lid's beside it turns on the
 * pin all along.
 */
const END_PLUG_DEPTH = 4;
const MIN_END_PLUG_DEPTH = 2;
const END_PLUG_KEEP = 1.5;
export const LID_HANDLES: readonly LidHandle[] = ["none", "tab", "notch"];
/** A click bump's radius, in mm: a piece of a ball standing out of the lip's or the rim's face. */
const BUMP_RADIUS = 1.5;
/**
 * How far a click bump may reach into the body's wall, past the gap, in mm: how firmly it holds (`clickBumpHeight`, 0.4 to
 * begin with). The walls of a small box and a stiff lip give way less, so there a bump reaching as far snaps in hard (#1220).
 * The dimple is DIMPLE_PLAY deeper whatever the height, and the checks for room below follow it.
 */
export const MIN_CLICK_BUMP_HEIGHT = 0.2;
export const MAX_CLICK_BUMP_HEIGHT = 0.8;
/** How much larger a dimple's ball is than its bump's, in mm, so the bump sits in it without pressing. */
const DIMPLE_PLAY = 0.1;
/** How much of the body's wall a dimple always leaves, in mm. */
const DIMPLE_SKIN = 0.4;
/** A straight side of the lip or rim at least this long gets a bump in its middle; one longer than BUMP_TWO_FROM two. */
const BUMP_MIN_SIDE = 12;
const BUMP_TWO_FROM = 80;
/** How many bumps go round a lip or rim without straight sides (a round pot). */
const BUMP_ROUND_COUNT = 4;
/** How far inside the lip or rim a bump's cut-off back lies, in mm, so it does not lie in the lip's or rim's own face. */
const FACE_HAIR = 0.05;
/** How many sides a bump's and a dimple's ball has round. */
const BUMP_SIDES = 32;
/** A pull tab: how wide (at most half its side), how far it reaches beyond the plate and how round its outer corners are, in mm. */
const TAB_WIDTH = 20;
const TAB_REACH = 6;
const TAB_CORNER = 3;
/** A pull tab narrower than this is refused, in mm. */
const MIN_TAB_WIDTH = 8;
/** A finger notch: the radius of its round, how wide it is (at most the side less 2 mm at each end), in mm. */
const NOTCH_RADIUS = 5;
const NOTCH_WIDTH = 16;
/** How much of the wall a finger notch always leaves, in mm. */
const NOTCH_SKIN = 0.8;
/** A finger notch shallower than this on average is no notch, in mm. */
const MIN_NOTCH_DEPTH = 0.4;
/**
 * A screw lid's thread pitch, in mm: 3 to begin with, as on a jar or a bottle (a PCO 1881 bottle neck has 2.7), within
 * the range the vase's screw lid takes.
 */
export const MIN_LID_THREAD_PITCH = 2;
export const MAX_LID_THREAD_PITCH = 8;
/** How many times a screw lid's thread goes round; two to begin with, enough for a cap that stays on. */
export const MIN_LID_THREAD_TURNS = 1;
export const MAX_LID_THREAD_TURNS = 8;
/** The deepest a screw lid's thread gets, in mm, however coarse its pitch: the vase's screw lid's limit too. */
const MAX_THREAD_DEPTH = 1.5;
/**
 * How far a round outline may stray from a circle and still take a screw lid, in mm: the largest distance from its middle
 * less the smallest. A cylinder of the editor's is round to a few thousandths; a pot squeezed out of round is not.
 */
const SCREW_ROUND = 0.2;
/** The thinnest wall a screw lid's thread goes on, in mm: two lines of a 0.4 mm nozzle. */
export const SCREW_MIN_WALL = 0.8;
/** How far the thread on the body reaches into its wall, in mm (at most half the wall), so the two print as one. */
const SCREW_REACH = 0.8;
/** How far inside the body's outer face the thread's root lies, in mm, so no face of it lies on the body's. */
const SCREW_ROOT_INSET = 0.1;
/** How far below the rim the thread on the body ends, in mm, so its top lies inside the wall and not on the rim. */
const SCREW_TOP_INSET = 0.2;
/** How much of the body a screw lid's thread leaves below it, in mm. */
const SCREW_FLOOR = 0.4;
/** A screw lid's thread and cap are drawn round with a point every so many millimetres, at least 96 and at most 512. */
const SCREW_STEP = 0.5;
/** How many rows of points a pitch of the thread has, up the wall: as many as the vase's screw lid. */
const SCREW_ROWS_PER_PITCH = 16;
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

/**
 * The options with a mistyped or out-of-range value replaced by the nearest allowed one, and a missing one by that of
 * `defaults` (the built-in ones, or `lidDefaults` with the printer's play).
 */
export function normalizeLidOptions(value?: Partial<Record<keyof LidOptions, unknown>> | null, defaults: LidOptions = LID_DEFAULTS): LidOptions {
  const result: LidOptions = { ...defaults };
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
  if (value?.hingeEndPlugs === true || value?.hingeEndPlugs === "true") result.hingeEndPlugs = true;
  if (value?.clickBumps === true || value?.clickBumps === "true") result.clickBumps = true;
  const clickBumpHeight = finiteNumber(value?.clickBumpHeight);
  if (clickBumpHeight !== null) result.clickBumpHeight = clamp(clickBumpHeight, MIN_CLICK_BUMP_HEIGHT, MAX_CLICK_BUMP_HEIGHT);
  const handle = typeof value?.handle === "string" ? value.handle.trim().toLowerCase() : "";
  if ((LID_HANDLES as readonly string[]).includes(handle)) result.handle = handle as LidHandle;
  const threadPitch = finiteNumber(value?.threadPitch);
  if (threadPitch !== null) result.threadPitch = clamp(threadPitch, MIN_LID_THREAD_PITCH, MAX_LID_THREAD_PITCH);
  const threadTurns = finiteNumber(value?.threadTurns);
  if (threadTurns !== null) result.threadTurns = clamp(threadTurns, MIN_LID_THREAD_TURNS, MAX_LID_THREAD_TURNS);
  return result;
}

/**
 * Whether magnets, a hinge, click bumps and a handle go with this kind of lid: a screw lid holds by its thread and is
 * turned to close, so none of them does.
 */
export function lidTakesExtras(options: Pick<LidOptions, "type">) {
  return options.type !== "screw";
}

/**
 * A screw lid's thread, in mm, as the vase's screw lid has it (`threadSize` and `threadProfile` in vase-geometry.mjs): a
 * trapezoid with flanks at 45 degrees, so it prints without support, 0.3 of the pitch deep and at most MAX_THREAD_DEPTH;
 * crest and root are as wide as each other, and the flanks take the rest of the pitch. `height` is how far the cap's
 * rim reaches down, and the thread on the body with it: the pitch times the turns.
 */
export function lidThread(options: Pick<LidOptions, "threadPitch" | "threadTurns">) {
  const pitch = options.threadPitch;
  const depth = Math.min(MAX_THREAD_DEPTH, 0.3 * pitch);
  return { pitch, depth, crest: (pitch - 2 * depth) / 2, height: pitch * options.threadTurns };
}

/**
 * Whether click bumps go with these options: they need a lip or a rim, and a pivot lid has neither; a screw lid holds by
 * its thread.
 */
export function lidClickBumpsFit(options: Pick<LidOptions, "type" | "hinge" | "hingeStyle">) {
  return options.type !== "flat" && lidTakesExtras(options) && !(options.hinge && LID_HINGE_TYPES.includes(options.type) && options.hingeStyle === "pivot");
}

/**
 * Whether a pull tab or a finger notch goes with these options: a pivot lid lies in the opening, with no edge to take,
 * and a screw lid is turned, not lifted.
 */
export function lidHandleFits(options: Pick<LidOptions, "type" | "hinge" | "hingeStyle">) {
  return lidTakesExtras(options) && !(options.hinge && LID_HINGE_TYPES.includes(options.type) && options.hingeStyle === "pivot");
}

/**
 * A knuckle's radius for this pin: the lid's hole with the pin's play (the default's unless given) and a wall round it, in
 * mm. The body's knuckles are as large, round a tighter hole.
 */
export function hingeKnuckleRadius(options: Pick<LidOptions, "hingePin"> & Partial<Pick<LidOptions, "hingePinPlay">>) {
  return options.hingePin / 2 + (options.hingePinPlay ?? LID_DEFAULTS.hingePinPlay) + HINGE_KNUCKLE_WALL;
}

/**
 * The radius of the pin's hole in mm: in the lid's part of the hinge with the pin's play, so the lid turns on it; in the
 * body's only HINGE_PIN_GRIP larger than the pin, so it sits tight there and does not slide out (#1220).
 */
export function hingePinHoles(options: Pick<LidOptions, "hingePin" | "hingePinPlay">) {
  return { lidHole: options.hingePin / 2 + options.hingePinPlay, bodyHole: options.hingePin / 2 + HINGE_PIN_GRIP };
}

/**
 * Where the hinge goes along the back side (the outline's largest y) of an outline seen from above: its axis (y along
 * the frame, z the height), the radius of the pin's hole in the lid's knuckles (with the pin's play, `lidHole`) and in
 * the body's (tight, `bodyHole`), its knuckles from end to end (even ones the body's, odd ones the lid's), how low the
 * body's knuckles reach down its back wall, and how far they reach into it (`reach`). Along a straight stretch long
 * enough for three knuckles, that is where it goes. A round back (a pot, a tube) has none: then the hinge runs along
 * the part of the outline that stays within a knuckle's radius of the back (`curved`), and the body's knuckles and the
 * lid's web reach as far in as the wall falls away there. An error when even that is too short for three knuckles, or
 * the body is too low for the slope under them.
 */
export function hingePlan(polygons: readonly (readonly Point[])[], options: LidOptions, top: number, bottom: number, innerBack?: number):
  | { backY: number; axisY: number; axisZ: number; radius: number; lidHole: number; bodyHole: number; segments: [number, number][]; low: number; start: number; end: number; reach: number; curved: boolean; innerBack: number }
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
  return { backY: back, axisY, axisZ, radius, ...hingePinHoles(options), segments, low, start, end, reach, curved, innerBack: inner };
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
 * must run straight there for the bar's whole radius. The pins sit tight in the side walls (`bodyHole`) and the bar turns
 * on them (`lidHole`, with the pin's play). An error when there are no such walls or the body is too low.
 */
export function pivotPlan(outline: readonly (readonly Point[])[], opening: readonly (readonly Point[])[], options: LidOptions, top: number, bottom: number):
  | { axisY: number; axisZ: number; radius: number; lidHole: number; bodyHole: number; outer: [number, number]; inner: [number, number]; barFrom: number; barTo: number; depth: number; innerBack: number }
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
  return { axisY, axisZ, radius, ...hingePinHoles(options), outer, inner, barFrom, barTo, depth, innerBack };
}

/**
 * Where a flush hinge's end plugs go (Discussion #1387), worked out with the hinge at the back (its line along x): `outer`,
 * where the hinge's line leaves the body at each end (`across`, the outline crossed at the axis's height: past the
 * knuckles where the back runs on into rounded corners, which the end knuckles then fill), how far each plug reaches in
 * from there (`depth`: END_PLUG_DEPTH, less where an end knuckle is short), and how long the pin is between them, half a
 * millimetre short of each, as a pin printed apart is of the hinge's ends. An error when an end knuckle leaves less than
 * MIN_END_PLUG_DEPTH.
 */
export function endPlugPlan(segments: readonly (readonly [number, number])[], across: readonly [number, number] | null):
  | { outer: [number, number]; depth: number; pinLength: number }
  | { error: LidError } {
  const first = segments[0];
  const last = segments[segments.length - 1];
  const outer = hingeLineEnds(segments, across);
  // Both alike: as deep as the shorter end allows.
  const depth = Math.min(END_PLUG_DEPTH, first[1] - outer[0] - END_PLUG_KEEP, outer[1] - last[0] - END_PLUG_KEEP);
  if (depth < MIN_END_PLUG_DEPTH - 1e-9) return { error: { code: "endPlugsShort" } };
  return { outer, depth, pinLength: outer[1] - outer[0] - 2 * depth - 1 };
}

/**
 * A flush hinge without end plugs on a box with rounded corners (Discussion #1387), worked out with the hinge at the back
 * (its line along x): where the outline crossed at the axis's height runs on past the end knuckles by more than the gap,
 * which used to be cut round the axis and left a notch in each corner, the end knuckles fill the corners as they do with
 * end plugs, out to where the hinge's line leaves the body (`outer`), and the pin's hole runs out through the corners'
 * round faces. A pin as long as that hole would stand out of the round behind the axis, where the corner falls away
 * soonest; so it ends half a millimetre inside where its hole is still whole, its circle (`hole` round) within the
 * outline both behind and in front of the axis, as a pin printed apart ends half a millimetre short of the hinge's ends
 * (`pinLength`). Null where the knuckles reach the ends of the back, as on a box with square corners: that hinge stays
 * as it was.
 */
export function cornerKnucklePlan(polygons: readonly (readonly Point[])[], segments: readonly (readonly [number, number])[], axisY: number, hole: number, gap: number):
  | { outer: [number, number]; pinLength: number }
  | null {
  const across = acrossAt(polygons, axisY);
  if (!across) return null;
  // Within the gap and a hundredth of the knuckles, the plate's room round the end knuckle already reaches past the
  // outline: no notch to fill.
  if (segments[0][0] - across[0] < gap + 0.01 && across[1] - segments[segments.length - 1][1] < gap + 0.01) return null;
  const outer = hingeLineEnds(segments, across);
  let [left, right] = outer;
  for (const y of [axisY - hole, axisY + hole]) {
    const crossed = acrossAt(polygons, y);
    if (!crossed) continue;
    left = Math.max(left, crossed[0]);
    right = Math.min(right, crossed[1]);
  }
  return { outer, pinLength: right - left - 1 };
}

/**
 * Where a flush hinge's line leaves the body at each end: where the outline is crossed at the axis's height (`across`),
 * past the knuckles where the back runs on into rounded corners, or else the knuckles' own ends.
 */
function hingeLineEnds(segments: readonly (readonly [number, number])[], across: readonly [number, number] | null): [number, number] {
  const first = segments[0];
  const last = segments[segments.length - 1];
  return [Math.min(across?.[0] ?? first[0], first[0]), Math.max(across?.[1] ?? last[1], last[1])];
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

/**
 * The polygon with each straight stretch as one edge: a point that lies within `tolerance` of the line from where the
 * stretch began to the point after it is left out (a slice through a mesh has a point wherever it crosses a triangle's
 * edge, also along a flat wall). It begins at the sharpest corner, so no stretch runs on through the start.
 */
function straightened(polygon: readonly Point[], tolerance = 0.02): Point[] {
  const count = polygon.length;
  if (count < 4) return [...polygon];
  const turnAt = (index: number) => {
    const [px, py] = polygon[(index - 1 + count) % count];
    const [x, y] = polygon[index];
    const [nx, ny] = polygon[(index + 1) % count];
    const change = Math.atan2(ny - y, nx - x) - Math.atan2(y - py, x - px);
    return Math.abs(Math.atan2(Math.sin(change), Math.cos(change)));
  };
  let start = 0;
  for (let index = 1; index < count; index += 1) if (turnAt(index) > turnAt(start)) start = index;
  const ring = Array.from({ length: count + 1 }, (_, index) => polygon[(start + index) % count]);
  const onLine = (from: number, to: number) => {
    const [ax, ay] = ring[from];
    const [bx, by] = ring[to];
    const length = Math.hypot(bx - ax, by - ay);
    if (length < 1e-9) return true;
    for (let index = from + 1; index < to; index += 1) {
      if (Math.abs((bx - ax) * (ring[index][1] - ay) - (by - ay) * (ring[index][0] - ax)) / length > tolerance) return false;
    }
    return true;
  };
  const kept: Point[] = [ring[0]];
  for (let anchor = 0; anchor < count;) {
    let end = anchor + 1;
    while (end < count && onLine(anchor, end + 1)) end += 1;
    if (end < count) kept.push(ring[end]);
    anchor = end;
  }
  return kept;
}

/**
 * Where click bumps go on the face of a lip or a rim, given as the outline of what that face bounds seen from above (outer
 * contours anticlockwise, holes clockwise, as Manifold hands them): each place with the way out of that outline there.
 * One in the middle of each straight side of BUMP_MIN_SIDE mm or more, two (at a quarter and three quarters) on one longer
 * than BUMP_TWO_FROM. A side counts as straight where the outline turns sharply at both its ends or goes on there in pieces
 * much shorter than it: a box's sides do, with round corners too, a round pot's many short sides do not, however large
 * the pot. An outline without straight sides gets BUMP_ROUND_COUNT evenly round its largest contour, the first at its front
 * (the least y, in the middle across).
 */
export function clickBumpPlaces(polygons: readonly (readonly Point[])[]): { point: Point; outward: Point }[] {
  const places: { point: Point; outward: Point }[] = [];
  const sharp = (20 * Math.PI) / 180;
  const turn = (from: number, to: number) => Math.abs(Math.atan2(Math.sin(to - from), Math.cos(to - from)));
  const edgesOf = (points: readonly Point[]) => points.map((from, index) => {
    const to = points[(index + 1) % points.length];
    return { from, to, length: Math.hypot(to[0] - from[0], to[1] - from[1]), angle: Math.atan2(to[1] - from[1], to[0] - from[0]) };
  });
  // To the right along the outline: out of it, for an outer contour and a hole alike.
  const outwardOf = (angle: number): Point => [Math.sin(angle), -Math.cos(angle)];
  for (const polygon of polygons) {
    const edges = edgesOf(straightened(polygon));
    if (edges.length < 3) continue;
    edges.forEach((edge, index) => {
      const ends = (other: (typeof edges)[number]) => turn(other.angle, edge.angle) >= sharp || other.length <= edge.length / 3;
      if (edge.length < BUMP_MIN_SIDE || !ends(edges[(index - 1 + edges.length) % edges.length]) || !ends(edges[(index + 1) % edges.length])) return;
      for (const along of edge.length > BUMP_TWO_FROM ? [0.25, 0.75] : [0.5]) {
        places.push({ point: [edge.from[0] + along * (edge.to[0] - edge.from[0]), edge.from[1] + along * (edge.to[1] - edge.from[1])], outward: outwardOf(edge.angle) });
      }
    });
  }
  if (places.length) return places;
  const largest = polygons.reduce<readonly Point[] | null>((best, polygon) => (signedArea(polygon) > (best ? signedArea(best) : 0) ? polygon : best), null);
  if (!largest || largest.length < 3) return [];
  const edges = edgesOf(largest);
  const total = edges.reduce((sum, edge) => sum + edge.length, 0);
  // The first at the front: where the line along y through the middle across meets the contour at its least y.
  const xs = largest.map(([x]) => x);
  const middle = (Math.min(...xs) + Math.max(...xs)) / 2;
  let first = 0;
  let frontY = Infinity;
  let run = 0;
  for (const edge of edges) {
    if ((edge.from[0] - middle) * (edge.to[0] - middle) <= 0 && edge.from[0] !== edge.to[0]) {
      const along = (middle - edge.from[0]) / (edge.to[0] - edge.from[0]);
      const y = edge.from[1] + along * (edge.to[1] - edge.from[1]);
      if (y < frontY) {
        frontY = y;
        first = run + along * edge.length;
      }
    }
    run += edge.length;
  }
  for (let number = 0; number < BUMP_ROUND_COUNT; number += 1) {
    let distance = (first + (number * total) / BUMP_ROUND_COUNT) % total;
    for (const [index, edge] of edges.entries()) {
      if (distance <= edge.length || index === edges.length - 1) {
        const along = edge.length > 1e-9 ? Math.min(1, distance / edge.length) : 0;
        places.push({ point: [edge.from[0] + along * (edge.to[0] - edge.from[0]), edge.from[1] + along * (edge.to[1] - edge.from[1])], outward: outwardOf(edge.angle) });
        break;
      }
      distance -= edge.length;
    }
  }
  return places;
}

/** The front of an outline seen from above (its least y), the middle of its frontmost stretch, and how wide it is across. */
function frontOf(polygons: readonly (readonly Point[])[]) {
  const points = polygons.flat();
  const front = Math.min(...points.map(([, y]) => y));
  const near = points.filter(([, y]) => y <= front + 0.05).map(([x]) => x);
  const xs = points.map(([x]) => x);
  return { front, middle: (Math.min(...near) + Math.max(...near)) / 2, width: Math.max(...xs) - Math.min(...xs) };
}

/** Where the line along y at `x` first meets the outline from the front: the least y of its crossings, or null when it misses. */
function frontAt(polygons: readonly (readonly Point[])[], x: number) {
  let least = Infinity;
  for (const polygon of polygons) {
    polygon.forEach((point, index) => {
      const next = polygon[(index + 1) % polygon.length];
      if ((point[0] - x) * (next[0] - x) > 0 || point[0] === next[0]) return;
      least = Math.min(least, point[1] + ((x - point[0]) / (next[0] - point[0])) * (next[1] - point[1]));
    });
  }
  return Number.isFinite(least) ? least : null;
}

/**
 * A pull tab on the front (least y) of the lid's plate, seen from above: TAB_WIDTH wide, or half as wide as the plate if
 * that is less, reaching TAB_REACH beyond the plate's frontmost point, its outer corners rounded, and in past the plate's
 * edge over its whole width, so the two are one. An error when the plate is too narrow for one.
 */
function pullTabArea(runtime: ManifoldToplevel, plate: CrossSection, created: { delete?: () => void }[]): { area: CrossSection } | { error: LidError } {
  const polygons = plate.toPolygons() as Point[][];
  if (!polygons.length) return { error: { code: "handleSideShort" } };
  const { front, middle, width } = frontOf(polygons);
  const tabWidth = Math.min(TAB_WIDTH, width / 2);
  if (tabWidth < MIN_TAB_WIDTH) return { error: { code: "handleSideShort" } };
  const left = middle - tabWidth / 2;
  const right = middle + tabWidth / 2;
  const edges = [left, middle, right].map((x) => frontAt(polygons, x));
  if (edges.some((y) => y === null)) return { error: { code: "handleSideShort" } };
  const inward = Math.max(...(edges as number[])) + 1;
  const out = front - TAB_REACH;
  const corner = (x: number) => keep(created, keep(created, runtime.CrossSection.circle(TAB_CORNER, 32)).translate([x, out + TAB_CORNER]));
  const area = keep(created, runtime.CrossSection.hull([corner(left + TAB_CORNER), corner(right - TAB_CORNER), [[left, inward], [right, inward]]]));
  return { area };
}

/**
 * A finger notch in the body's outer wall at its front (least y): seen from the front, a half round of NOTCH_RADIUS drawn
 * out to NOTCH_WIDTH (less where the front is narrow), hanging from `edge`, the lid's lowest edge on the outside; cut in
 * along y as deep as the wall allows less NOTCH_SKIN, and NOTCH_RADIUS at most. `over` takes a millimetre above the edge
 * too, where the edge is the body's top, so the cut leaves no sheet of no thickness there. Its footprint from above comes
 * with it, and how deep it is on average. An error when the front is too narrow or the wall too thin for one.
 */
function fingerNotch(runtime: ManifoldToplevel, outline: CrossSection, opening: CrossSection | null, edge: number, over: boolean, created: { delete?: () => void }[]):
  | { solid: ManifoldSolid; area: CrossSection; depth: number }
  | { error: LidError } {
  const polygons = outline.toPolygons() as Point[][];
  if (!polygons.length) return { error: { code: "handleSideShort" } };
  const { front, middle, width } = frontOf(polygons);
  const notchWidth = Math.min(NOTCH_WIDTH, width - 4);
  if (notchWidth < 2 * NOTCH_RADIUS) return { error: { code: "handleSideShort" } };
  const left = middle - notchWidth / 2;
  // From above: from a millimetre in front of the wall in to NOTCH_RADIUS behind its front, less what lies within
  // NOTCH_SKIN of the opening, and of that only what opens to the front.
  const reach = keep(created, keep(created, runtime.CrossSection.square([notchWidth, NOTCH_RADIUS + 1])).translate([left, front - 1]));
  const clear = opening ? keep(created, reach.subtract(keep(created, opening.offset(NOTCH_SKIN, "Round", 2, 48)))) : reach;
  const pieces = clear.decompose().map((piece) => keep(created, piece)).filter((piece) => piece.bounds().min[1] < front - 0.5);
  if (!pieces.length) return { error: { code: "handleNotchNoRoom" } };
  const area = pieces.length === 1 ? pieces[0] : keep(created, runtime.CrossSection.union(pieces));
  const depth = keep(created, area.intersect(outline)).area() / notchWidth;
  if (depth < MIN_NOTCH_DEPTH) return { error: { code: "handleNotchNoRoom" } };
  // From the front (x across, then the height): the half round drawn out, below the edge.
  const round = (x: number) => keep(created, keep(created, runtime.CrossSection.circle(NOTCH_RADIUS, 48)).translate([x, edge]));
  const drawn = keep(created, runtime.CrossSection.hull([round(left + NOTCH_RADIUS), round(left + notchWidth - NOTCH_RADIUS)]));
  const below = keep(created, keep(created, runtime.CrossSection.square([notchWidth + 2, NOTCH_RADIUS + 1])).translate([left - 1, edge - NOTCH_RADIUS - 1]));
  let profile = keep(created, drawn.intersect(below));
  if (over) profile = keep(created, profile.add(keep(created, keep(created, runtime.CrossSection.square([notchWidth, 1])).translate([left, edge]))));
  // Drawn out along its own z and turned so that z runs along -y (its y becomes the height), from behind the reach to
  // in front of the wall.
  const along = NOTCH_RADIUS + 2;
  const cutter = keep(created, keep(created, keep(created, profile.extrude(along)).rotate([90, 0, 0])).translate([0, front + NOTCH_RADIUS + 0.5, 0]));
  const footprint = keep(created, keep(created, area.extrude(NOTCH_RADIUS + 4)).translate([0, 0, edge - NOTCH_RADIUS - 1]));
  return { solid: keep(created, cutter.intersect(footprint)), area, depth };
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
  | { code: "endPlugsFlush" | "endPlugsShort" }
  | { code: "clickBumpsNoLip" | "clickBumpsNoRoom" | "handlePivot" | "handleSideShort" | "handleNotchNoRoom" }
  | { code: "screwExtras" | "screwNotRound" | "screwThinWall" }
  | { code: "screwTooLow"; height: number }
  | { code: "screwGapDeep"; gap: number }
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

/** A polygon's centre of area. */
function centreOfArea(polygon: readonly Point[]): Point {
  let area = 0;
  let x = 0;
  let y = 0;
  polygon.forEach(([px, py], index) => {
    const [nx, ny] = polygon[(index + 1) % polygon.length];
    const cross = px * ny - nx * py;
    area += cross;
    x += (px + nx) * cross;
    y += (py + ny) * cross;
  });
  return Math.abs(area) > 1e-12 ? [x / (3 * area), y / (3 * area)] : polygon[0] ?? [0, 0];
}

/**
 * Whether an outline seen from above is round: one contour that stays within SCREW_ROUND of a circle round its middle,
 * or round `centre` when that is given (the rim's middle, for an outline further down). With it, how far its points lie
 * from that middle: `outer` the farthest (a corner of the polygon), `inner` the nearest (the middle of a side). A
 * contour's middle is its centre of area, which a regular polygon's is exactly, however many sides it has. Null for a
 * box, an oval, two pots side by side.
 */
export function roundOutline(polygons: readonly (readonly Point[])[], centre?: Point): { centre: Point; outer: number; inner: number } | null {
  if (polygons.length !== 1 || polygons[0].length < 3) return null;
  const middle = centre ?? centreOfArea(polygons[0]);
  const outer = Math.max(...polygons[0].map(([x, y]) => Math.hypot(x - middle[0], y - middle[1])));
  const inner = nearestOnOutline(polygons, middle).distance;
  return outer - inner <= SCREW_ROUND ? { centre: middle, outer, inner } : null;
}

/** A screw lid as `screwPlan` works it out, in the frame where z is up and the body's rim is at `top`. */
export type ScrewPlan = {
  centre: Point;
  /** How far the body's outer face reaches from the axis at most: the cap's thread keeps the gap from it. */
  radius: number;
  /** How near it comes: the thread on the body starts a little inside it. */
  inner: number;
  /** How far the thread on the body reaches into its wall, from `inner`. */
  reach: number;
  /** Where the thread starts: the height the cap's rim reaches down to when screwed on. */
  from: number;
  pitch: number;
  depth: number;
  crest: number;
  /** How far the cap's rim reaches from the axis: the thread, the gap and the wall. */
  capRadius: number;
};

/**
 * A screw lid for a round body (Discussion #1393), like a jar's: a thread on the outside of the body's top, and a cap
 * whose rim has the same thread inside, the gap further out. `sliceAt` gives the body seen from above at a height: its
 * outer contours and the openings in them. At the rim and at four heights down to where the thread starts (the pitch
 * times the turns below the top), it must be one circle round the same middle, as large each time, within SCREW_ROUND:
 * a box, an oval or a pot that tapers there is refused. The thread is added to the outside of the wall, not cut into it,
 * so the wall keeps its strength and a thin one takes a thread too; it reaches SCREW_REACH into the wall (half the wall at
 * most), which must be SCREW_MIN_WALL thick where it is thinnest: from the farthest point of an opening to the nearest of
 * the outline. Below the thread, SCREW_FLOOR of the body stays. The gap may be at most half the thread's depth, so the
 * threads still overlap by as much as they keep apart.
 */
export function screwPlan(sliceAt: (z: number) => { outline: readonly (readonly Point[])[]; opening: readonly (readonly Point[])[] }, options: LidOptions, top: number, bottom: number, rim: number): ScrewPlan | { error: LidError } {
  const thread = lidThread(options);
  if (options.gap > thread.depth / 2 + 1e-9) return { error: { code: "screwGapDeep", gap: Math.floor((thread.depth / 2) * 100 + 1e-6) / 100 } };
  const from = top - thread.height;
  if (from < bottom + SCREW_FLOOR) return { error: { code: "screwTooLow", height: Math.round(thread.height * 10) / 10 } };
  const atRim = sliceAt(rim);
  const round = roundOutline(atRim.outline);
  if (!round) return { error: { code: "screwNotRound" } };
  let radius = round.outer;
  let inner = round.inner;
  let opening = 0;
  const lowest = from + 0.05;
  for (const z of [rim, ...Array.from({ length: 4 }, (_, index) => lowest + ((rim - lowest) * index) / 4)]) {
    const level = z === rim ? atRim : sliceAt(z);
    const here = roundOutline(level.outline, round.centre);
    if (!here || Math.abs(here.outer - round.outer) > SCREW_ROUND || Math.abs(here.inner - round.inner) > SCREW_ROUND) return { error: { code: "screwNotRound" } };
    radius = Math.max(radius, here.outer);
    inner = Math.min(inner, here.inner);
    for (const point of level.opening.flat()) opening = Math.max(opening, Math.hypot(point[0] - round.centre[0], point[1] - round.centre[1]));
  }
  const wall = inner - opening;
  if (wall < SCREW_MIN_WALL - 1e-9) return { error: { code: "screwThinWall" } };
  return {
    centre: round.centre, radius, inner, reach: Math.min(SCREW_REACH, wall / 2), from,
    pitch: thread.pitch, depth: thread.depth, crest: thread.crest, capRadius: radius + options.gap + thread.depth + options.wall,
  };
}

/**
 * A closed mesh round the up axis through `centre`, `sides` points round, as a Manifold: an outer face through the
 * heights `outer.rows` at `outer.radius(angle, z)` from the axis, and an inner one through `inner.rows`, joined to it by
 * a ring at the bottom (both start at the same height). At the top a ring as well where both end at the same height (a
 * tube), or else a disc closing each: a cup upside down, as a screw lid's cap is, its plate on top. The angle runs
 * anticlockwise seen from above from the x axis; every radius must keep the inner face inside the outer.
 */
function roundMesh(runtime: ManifoldToplevel, centre: Point, sides: number, outer: { rows: readonly number[]; radius: (angle: number, z: number) => number }, inner: { rows: readonly number[]; radius: (angle: number, z: number) => number }, created: { delete?: () => void }[]) {
  const positions: number[] = [];
  const triangles: number[] = [];
  const ring = (z: number, radius: (angle: number, z: number) => number) => {
    const start = positions.length / 3;
    for (let side = 0; side < sides; side += 1) {
      const angle = (2 * Math.PI * side) / sides;
      const distance = radius(angle, z);
      positions.push(centre[0] + distance * Math.cos(angle), centre[1] + distance * Math.sin(angle), z);
    }
    return start;
  };
  const point = (z: number) => {
    positions.push(centre[0], centre[1], z);
    return positions.length / 3 - 1;
  };
  const next = (side: number) => (side + 1) % sides;
  // Four corners in order round the outside of the solid, as two triangles.
  const quad = (a: number, b: number, c: number, d: number) => triangles.push(a, b, c, a, c, d);
  const outerRings = outer.rows.map((z) => ring(z, outer.radius));
  const innerRings = inner.rows.map((z) => ring(z, inner.radius));
  for (let row = 0; row + 1 < outerRings.length; row += 1) {
    for (let side = 0; side < sides; side += 1) quad(outerRings[row] + side, outerRings[row] + next(side), outerRings[row + 1] + next(side), outerRings[row + 1] + side);
  }
  for (let row = 0; row + 1 < innerRings.length; row += 1) {
    for (let side = 0; side < sides; side += 1) quad(innerRings[row] + side, innerRings[row + 1] + side, innerRings[row + 1] + next(side), innerRings[row] + next(side));
  }
  const [outerLow, innerLow] = [outerRings[0], innerRings[0]];
  const [outerHigh, innerHigh] = [outerRings[outerRings.length - 1], innerRings[innerRings.length - 1]];
  for (let side = 0; side < sides; side += 1) quad(outerLow + side, innerLow + side, innerLow + next(side), outerLow + next(side));
  if (outer.rows[outer.rows.length - 1] === inner.rows[inner.rows.length - 1]) {
    for (let side = 0; side < sides; side += 1) quad(outerHigh + side, outerHigh + next(side), innerHigh + next(side), innerHigh + side);
  } else {
    const plate = point(outer.rows[outer.rows.length - 1]);
    const ceiling = point(inner.rows[inner.rows.length - 1]);
    for (let side = 0; side < sides; side += 1) {
      triangles.push(plate, outerHigh + side, outerHigh + next(side));
      triangles.push(ceiling, innerHigh + next(side), innerHigh + side);
    }
  }
  const mesh = new runtime.Mesh({ numProp: 3, vertProperties: new Float32Array(positions), triVerts: new Uint32Array(triangles) });
  return keep(created, runtime.Manifold.ofMesh(mesh));
}

/**
 * Heights from `low` to `high`, both included, and between them every `step` from `low` on. The thread on the body and
 * the cap take theirs from the same `low`, so where both are drawn their points lie at the same heights and angles and
 * the cap's are the gap further out than the body's, between them too.
 */
function rowsFrom(low: number, high: number, step: number) {
  const rows = [low];
  for (let index = 1; low + index * step < high - step * 1e-3; index += 1) rows.push(low + index * step);
  rows.push(high);
  return rows;
}

/**
 * The two parts of a screw lid, in the frame where z is up, as they sit screwed together: the thread on the body and the
 * cap. Each is drawn as the vase's screw lid is, by its distance from the axis at every angle and height. A right-hand
 * thread: the cap goes down as it is turned clockwise seen from above, its crest a pitch higher each turn anticlockwise.
 * - The thread on the body is a ring reaching `reach` into the wall, to be grouped with it. Its crest stands the depth
 *   out from the body's outer face; its flanks run at 45 degrees on down to its root, a hair inside that face, so no face
 *   of it lies on the body's. At both ends it is cut back at 45 degrees from the root, so it begins and ends gently and
 *   prints upright without support; at the top it stays SCREW_TOP_INSET below the rim, inside the wall.
 * - The cap is the plate on the rim and a rim reaching down to where the thread starts, its inside the body's thread
 *   moved the gap further out all round, so the two never meet, its outside the wall further out. Its mouth widens at 45
 *   degrees to clear the thread's crest, so it finds the thread; turned over, it prints on its plate without support.
 */
function screwSolids(runtime: ManifoldToplevel, plan: ScrewPlan, options: LidOptions, top: number, created: { delete?: () => void }[]) {
  const sides = Math.min(512, Math.max(96, 4 * Math.ceil((2 * Math.PI * plan.capRadius) / SCREW_STEP / 4)));
  const step = plan.pitch / SCREW_ROWS_PER_PITCH;
  // How far the crest stands out at this angle and height: the depth on the crest, less along the flanks; below 0 in
  // the root.
  const crestHeight = (angle: number, z: number) => {
    const turns = (z - top) / plan.pitch - angle / (2 * Math.PI);
    const along = Math.abs(turns - Math.round(turns)) * plan.pitch;
    return plan.depth - Math.max(0, along - plan.crest / 2);
  };
  const root = plan.inner - SCREW_ROOT_INSET;
  const to = top - SCREW_TOP_INSET;
  const thread = roundMesh(runtime, plan.centre, sides, {
    rows: rowsFrom(plan.from, to, step),
    radius: (angle, z) => Math.max(root, Math.min(plan.radius + crestHeight(angle, z), root + (z - plan.from), root + (to - z))),
  }, { rows: [plan.from, to], radius: () => plan.inner - plan.reach }, created);
  const gap = options.gap;
  const cap = roundMesh(runtime, plan.centre, sides, { rows: [plan.from, top + options.thickness], radius: () => plan.capRadius }, {
    rows: rowsFrom(plan.from, top, step),
    radius: (angle, z) => plan.radius + gap + Math.max(0, crestHeight(angle, z), plan.depth - (z - plan.from)),
  }, created);
  return { thread, cap };
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
 * beside the lid, both in the scene's frame, and how many knuckles the hinge has. With end plugs, the two plugs lying
 * beside the lid too, and how long the pin is between them; without them, where the end knuckles fill rounded corners,
 * how long the pin is within its hole (`pinLength`, otherwise null: the hinge's length less a millimetre).
 */
export type LidHinge = { knuckles: ManifoldSolid; pin: ManifoldSolid | null; count: number; cuts: ManifoldSolid | null; style: LidHingeStyle; plugs: ManifoldSolid | null; pinLength: number | null };

/** With click bumps: how many the lid has, and the dimples for them as one solid to cut out of the body, in the scene's frame. */
export type LidClickBumps = { count: number; dimples: ManifoldSolid };

/** With a handle: which, and for a finger notch the recess to cut out of the body, in the scene's frame. */
export type LidHandleResult = { style: Exclude<LidHandle, "none">; notch: ManifoldSolid | null };

/**
 * A screw lid's: the thread on the body (to be grouped with it, in the scene's frame), its pitch, turns and depth, and
 * how wide the cap is across, in mm.
 */
export type LidScrew = { thread: ManifoldSolid; pitch: number; turns: number; depth: number; diameter: number };

export type LidResult = { lid: ManifoldSolid; magnets?: LidMagnets; hinge?: LidHinge; clickBumps?: LidClickBumps; handle?: LidHandleResult; screw?: LidScrew } | { error: LidError };

/**
 * The lid for `body` (in the scene's frame, y up), lying turned over beside it: its plate on the workplane at the
 * height of the body's bottom, the lip or rim pointing up. With magnets, also the pockets the body needs, and the posts
 * for the corners where its wall is too thin to hold one (both in the scene's frame, where the body stands). A screw
 * lid comes with the thread for the body, standing where it goes.
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
    // A screw lid's rim reaches down as far as its thread does, not by `depth`.
    if (options.type !== "flat" && options.type !== "screw" && options.depth >= height) return { error: { code: "tooShallow" } };
    // A screw lid holds by its thread alone and is turned to close.
    if (!lidTakesExtras(options) && (options.magnets || options.hinge || options.clickBumps || options.handle !== "none")) return { error: { code: "screwExtras" } };
    if (options.hinge && !LID_HINGE_TYPES.includes(options.type)) return { error: { code: "hingeLidType" } };
    // A flush hinge's slots and a pivot lid's pins go where magnets' pockets would sit, in the corners.
    const style: LidHingeStyle = options.hinge ? options.hingeStyle : "outside";
    if (style !== "outside" && options.magnets) return { error: { code: "hingeStyleMagnets" } };
    // Click bumps stand on a lip or a rim; a pivot lid lies in the opening, with no edge for a tab or a finger to take.
    if (options.clickBumps && !lidClickBumpsFit(options)) return { error: { code: "clickBumpsNoLip" } };
    if (options.handle !== "none" && !lidHandleFits(options)) return { error: { code: "handlePivot" } };
    // A hinge on another side is worked out with that side turned to the back, and its pieces turned back after.
    const turn = HINGE_SIDE_TURN[options.hingeSide];
    const turnedOutline = turnedPolygons(outline.toPolygons() as Point[][], turn);
    const turnedOpening = hasOpening ? turnedPolygons(opening.toPolygons() as Point[][], turn) : [];
    const innerBack = turnedOpening.length ? Math.max(...turnedOpening.flat().map(([, y]) => y)) : undefined;
    const plan = options.hinge && style !== "pivot" ? hingePlan(turnedOutline, options, top, box.min[2], innerBack) : null;
    if (plan && "error" in plan) return { error: plan.error };
    // In the wall, a knuckle needs the wall to run straight along it.
    if (plan && style === "flush" && plan.curved) return { error: { code: "hingeStyleStraight" } };
    // End plugs close a flush hinge's pin hole at both ends, where its line leaves the body (Discussion #1387).
    if (options.hinge && options.hingeEndPlugs && style !== "flush") return { error: { code: "endPlugsFlush" } };
    const endPlugs = plan && style === "flush" && options.hingeEndPlugs ? endPlugPlan(plan.segments, acrossAt(turnedOutline, plan.axisY)) : null;
    if (endPlugs && "error" in endPlugs) return { error: endPlugs.error };
    // Without them, the end knuckles fill rounded corners all the same, and the pin's hole ends in their round faces.
    const cornerKnuckles = plan && style === "flush" && !options.hingeEndPlugs ? cornerKnucklePlan(turnedOutline, plan.segments, plan.axisY, plan.bodyHole, options.hingeGap) : null;
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
    // The rim's inside and outside, for a cap and both.
    const inner = keep(created, outline.offset(options.gap, "Round", 2, 48));
    const outer = keep(created, outline.offset(options.gap + options.wall, "Round", 2, 48));
    // A screw lid: the cap, and the thread for the body beside it.
    let screw: { plan: ScrewPlan; thread: ManifoldSolid } | null = null;
    if (options.type === "screw") {
      const sliceAt = (z: number) => {
        const cut = keep(created, up.slice(z));
        const around = filled(runtime, cut, created);
        return { outline: around.toPolygons() as Point[][], opening: keep(created, around.subtract(cut)).toPolygons() as Point[][] };
      };
      const plan = screwPlan(sliceAt, options, top, box.min[2], rim);
      if ("error" in plan) return { error: plan.error };
      const solids = screwSolids(runtime, plan, options, top, created);
      parts.push(solids.cap);
      screw = { plan, thread: solids.thread };
    } else if (options.type === "flat") {
      parts.push(prism(outline, top, top + options.thickness));
    } else {
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
    // through them all: with the pin's play through the lid's, where it turns, and tight through the body's, so it stays.
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
    // A flush hinge's end plugs, worked out with the hinge at the back: laid beside the lid further down.
    const plugPieces: ManifoldSolid[] = [];
    if (plan && style === "flush") {
      // In the wall: the knuckles take turns as outside, flush with the back face and the lid's top. The body's grow out
      // of the wall's inner face on a 45 degree slope where they reach into the opening; the wall is cut round the lid's
      // and the lid's plate round the body's, by the gap, and behind the axis only the round knuckles stay. The lid's lip
      // stops short of the body's knuckles.
      const clearance = plan.radius + options.hingeGap;
      // Where the end knuckles end when they run on past the straight back: with end plugs, and without them on a box with
      // rounded corners (Discussion #1387).
      const ends = endPlugs ?? cornerKnuckles;
      const lidPieces: ManifoldSolid[] = [];
      const bodyPieces: ManifoldSolid[] = [];
      const notches: ManifoldSolid[] = [];
      const slots: ManifoldSolid[] = [];
      // The body's outline standing from below the bottom to above the lid's top, with the hinge at the back.
      const outlineColumn = ends ? prism(keep(created, outline.rotate(turn)), box.min[2] - 1, top + options.thickness + 1) : null;
      plan.segments.forEach(([from, to], index) => {
        const round = along(from, to, plan.radius, plan.axisY, plan.axisZ);
        const room = along(from - options.hingeGap + 0.01, to + options.hingeGap - 0.01, clearance, plan.axisY, plan.axisZ);
        if (index % 2) {
          lidPieces.push(round);
          slots.push(room);
        } else {
          // With end plugs, and on a box with rounded corners without them, the end knuckles run on to where the hinge's
          // line leaves the body, cut to its outline, so the pin's hole (and the plugs' pockets) end in the body's own outer
          // face: on a box with rounded corners, the end knuckles fill the corners instead of the wall being cut round the
          // axis there, which left a notch in each corner.
          const start = ends && index === 0 ? ends.outer[0] - 1 : from;
          const end = ends && index === plan.segments.length - 1 ? ends.outer[1] + 1 : to;
          const knuckle = start === from && end === to ? round : along(start, end, plan.radius, plan.axisY, plan.axisZ);
          const strip = keep(created, keep(created, runtime.Manifold.cube([end - start, 0.4, plan.axisZ - plan.low])).translate([start, plan.innerBack, plan.low]));
          const piece = keep(created, runtime.Manifold.hull([knuckle, strip]));
          bodyPieces.push(outlineColumn && knuckle !== round ? keep(created, piece.intersect(outlineColumn)) : piece);
          notches.push(room);
        }
      });
      // Where the back runs on past the straight stretch into rounded corners, the end knuckles fill them, and the plate is
      // cut round them there too, wherever the outline runs on past the knuckle at all: on into the room round the knuckle
      // along the straight stretch, so no sliver of the plate stays standing between the two cuts.
      const across = acrossAt(turnedOutline, plan.axisY);
      if (across && ends) {
        for (const [outer, knuckle, toward] of [[across[0] - 1, plan.start, -1], [across[1] + 1, plan.end, 1]] as const) {
          if ((outer - knuckle) * toward <= 1) continue;
          const span = (end: number) => along(Math.min(outer, end), Math.max(outer, end), clearance, plan.axisY, plan.axisZ);
          notches.push(span(knuckle + toward * (options.hingeGap - 0.02)));
        }
      }
      // The lip stops short of the knuckles; where they run on into the corners, of the end knuckles' slopes there too.
      const lipFrom = ends ? ends.outer[0] - 1 : plan.start - options.hingeGap - 0.5;
      const lipTo = ends ? ends.outer[1] + 1 : plan.end + options.hingeGap + 0.5;
      const lipCut = keep(created, keep(created, runtime.Manifold.cube([lipTo - lipFrom, plan.backY - (plan.axisY - clearance) + 1, top - box.min[2] + 1])).translate([lipFrom, plan.axisY - clearance, box.min[2] - 1]));
      // The pin's hole along the whole hinge, `radius` round: the lid's with the play, the body's tight; where the end
      // knuckles run on into the corners, out through their outer faces.
      const holeFrom = (ends ? ends.outer[0] : plan.start) - 1;
      const holeTo = (ends ? ends.outer[1] : plan.end) + 1;
      const holeFor = (radius: number, tip: 1 | -1) => unturned(options.hingeTeardrop ? teardropAlong(holeFrom, holeTo, radius, tip, plan.radius - TEARDROP_WALL, plan.axisY, plan.axisZ) : along(holeFrom, holeTo, radius, plan.axisY, plan.axisZ));
      const bodyHole = holeFor(plan.bodyHole, 1);
      // Behind the axis only the knuckles stay, round about it: a square corner of the plate there would swing down into
      // the wall as the lid opens.
      const behind = keep(created, keep(created, runtime.Manifold.cube([(across ? across[1] - across[0] : plan.end - plan.start) + 20, plan.backY - plan.axisY + 1, options.thickness + 2])).translate([(across ? across[0] : plan.start) - 10, plan.axisY, top - 1]));
      made = keep(created, keep(created, made.subtract(unturned(lipCut))).subtract(unturned(behind)));
      made = keep(created, keep(created, keep(created, made.add(unturned(unionOf(lidPieces)))).subtract(unturned(unionOf(notches)))).subtract(holeFor(plan.lidHole, -1)));
      let knuckleHoles = bodyHole;
      if (endPlugs && outlineColumn) {
        // End plugs: over the plug's depth at each end the hole is a square instead, `half` from its middle to each side,
        // standing on a corner so its top is a point at 45 degrees, as the teardrop's (which lies within it), and it prints
        // without droop; its corners are cut flat where they would leave less than TEARDROP_WALL of the knuckle, as the
        // teardrop's point is. The body's square is as tight round the pin as its round holes, so the pin goes in through it
        // before the plugs; each plug is that square HINGE_PIN_GRIP smaller all round, as thick as the pin, so it sits as
        // tight as the pin does in the body and cannot turn, and its outer end is cut to the body's outline, flush with it.
        const squareAlong = (from: number, to: number, half: number, corner: number) => {
          const square = keep(created, keep(created, runtime.CrossSection.square([2 * half, 2 * half], true)).rotate(45));
          const profile = keep(created, square.intersect(keep(created, runtime.CrossSection.square([2 * corner, 2 * corner], true))));
          return keep(created, keep(created, keep(created, profile.extrude(to - from)).rotate([0, 90, 0])).translate([from, plan.axisY, plan.axisZ]));
        };
        const corner = plan.radius - TEARDROP_WALL;
        const [left, right] = endPlugs.outer;
        const pockets = unionOf([squareAlong(left - 1, left + endPlugs.depth, plan.bodyHole, corner), squareAlong(right - endPlugs.depth, right + 1, plan.bodyHole, corner)]);
        const plugHalf = plan.bodyHole - HINGE_PIN_GRIP;
        for (const [from, to] of [[left - 1, left + endPlugs.depth], [right - endPlugs.depth, right + 1]] as const) {
          plugPieces.push(keep(created, squareAlong(from, to, plugHalf, corner - HINGE_PIN_GRIP).intersect(outlineColumn)));
        }
        knuckleHoles = keep(created, bodyHole.add(unturned(pockets)));
      }
      bodyKnuckles = keep(created, unturned(unionOf(bodyPieces)).subtract(knuckleHoles));
      // The pin's hole runs through the wall too, where the knuckles reach into it: as tight, for these cuts are grouped
      // with the body and its knuckles and so cut them as well. So do the plugs' pockets.
      bodyCuts = keep(created, unturned(unionOf(slots)).add(knuckleHoles));
    } else if (pivot) {
      // The plate's back edge becomes a round bar the plate turns about, clear of the back wall by the gap; a pin from
      // outside through each side wall into the bar's end (teardrops, each pointing up as its part is printed), tight in
      // the wall and with the pin's play in the bar, so the bar turns on the pins and they stay in the walls. A ledge
      // round the opening's other sides, a plate's thickness down, holds the lid level; its underside steps back at
      // 45 degrees, so the body still prints upright without support.
      const back = keep(created, keep(created, runtime.Manifold.cube([pivot.outer[1] - pivot.outer[0] + 20, 100, top - box.min[2] + 20])).translate([pivot.outer[0] - 10, pivot.axisY, box.min[2] - 10]));
      const bar = along(pivot.barFrom, pivot.barTo, pivot.radius, pivot.axisY, pivot.axisZ);
      const pinHole = (from: number, to: number, radius: number, tip: 1 | -1) => (options.hingeTeardrop ? teardropAlong(from, to, radius, tip, pivot.radius - TEARDROP_WALL, pivot.axisY, pivot.axisZ) : along(from, to, radius, pivot.axisY, pivot.axisZ));
      const barHoles = unionOf([pinHole(pivot.barFrom - 1, pivot.barFrom + pivot.depth, pivot.lidHole, -1), pinHole(pivot.barTo - pivot.depth, pivot.barTo + 1, pivot.lidHole, -1)]);
      made = keep(created, keep(created, keep(created, made.subtract(unturned(back))).add(unturned(bar))).subtract(unturned(barHoles)));
      bodyCuts = unturned(unionOf([pinHole(pivot.outer[0] - 1, pivot.inner[0] + 0.5, pivot.bodyHole, 1), pinHole(pivot.inner[1] - 0.5, pivot.outer[1] + 1, pivot.bodyHole, 1)]));
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
      // point faces the lid's inside. The pin turns in the lid's round part, with its play; in the body's it sits tight
      // (#1220). The body's point is the lower for its smaller round, so it keeps more than TEARDROP_WALL above it.
      const holeFor = (radius: number, tip: 1 | -1) => unturned(options.hingeTeardrop ? teardropAlong(plan.start - 1, plan.end + 1, radius, tip, plan.radius - TEARDROP_WALL, plan.axisY, plan.axisZ) : along(plan.start - 1, plan.end + 1, radius, plan.axisY, plan.axisZ));
      made = keep(created, keep(created, made.add(unturned(keep(created, runtime.Manifold.union(lidPieces))))).subtract(holeFor(plan.lidHole, -1)));
      let knuckleBody = unturned(keep(created, runtime.Manifold.union(bodyPieces)));
      // A block reaching in past a thin round wall is kept out of the opening.
      if (plan.curved) knuckleBody = keep(created, knuckleBody.subtract(keep(created, keep(created, opening.extrude(top - box.min[2] + 2)).translate([0, 0, box.min[2] - 1]))));
      bodyKnuckles = keep(created, knuckleBody.subtract(holeFor(plan.bodyHole, 1)));
    }
    // The handle, on the side the lid opens at: worked out with that side turned to the front (least y), opposite the
    // hinge's, and turned back after.
    const handleTurn = options.hinge ? turn : 0;
    const handleUnturned = (solid: ManifoldSolid) => (handleTurn ? keep(created, solid.rotate([0, 0, -handleTurn])) : solid);
    // A finger notch's recess, its footprint seen from above and its heights: the click bumps keep clear of it.
    let notch: { solid: ManifoldSolid; area: CrossSection; low: number; high: number } | null = null;
    if (options.handle === "tab") {
      // In the plate, as thick as it, so the lid still prints turned over without support.
      const plate = keep(created, (options.type === "plug" || options.type === "flat" ? outline : outer).rotate(handleTurn));
      const tab = pullTabArea(runtime, plate, created);
      if ("error" in tab) return { error: tab.error };
      made = keep(created, made.add(handleUnturned(prism(tab.area, top, top + options.thickness))));
    } else if (options.handle === "notch") {
      // Below the lid's lowest edge on the outside: the plate's, lying on the rim, or a rim's that goes over the wall.
      const edge = options.type === "cap" || options.type === "both" ? top - options.depth : top;
      if (edge - NOTCH_RADIUS < box.min[2] + NOTCH_SKIN) return { error: { code: "handleNotchNoRoom" } };
      const cut = fingerNotch(runtime, keep(created, outline.rotate(handleTurn)), hasOpening ? keep(created, opening.rotate(handleTurn)) : null, edge, edge >= top, created);
      if ("error" in cut) return { error: cut.error };
      notch = { solid: handleUnturned(cut.solid), area: handleTurn ? keep(created, cut.area.rotate(-handleTurn)) : cut.area, low: edge - NOTCH_RADIUS, high: edge };
    }
    // Click bumps: balls standing out of the lip's outer face into the body's wall (a cap's out of its rim's inner face,
    // pointing in), by `clickBumpHeight` past the gap, halfway down the lip or rim; the body gets a dimple a little larger
    // round each (DIMPLE_PLAY), as deep as the bump reaches and that play more, which always leaves DIMPLE_SKIN of its
    // wall. Where the wall is too thin for that, bump and dimple stop short, the bump that play short of the dimple.
    let dimples: ManifoldSolid | null = null;
    let bumpCount = 0;
    if (options.clickBumps) {
      const onLip = options.type !== "cap";
      const middle = top - options.depth / 2;
      const reach = options.clickBumpHeight;
      const inward = options.gap + reach - BUMP_RADIUS;
      const hingeWay: Point = [Math.sin((turn * Math.PI) / 180), Math.cos((turn * Math.PI) / 180)];
      const round = (offset: number) => keep(created, opening.offset(offset, "Round", 2, 48));
      // The faces they stand on: the lip in each part of the opening, or the rim's inside. A bump facing a wall between two
      // parts is left out where that wall could not keep DIMPLE_SKIN with a dimple from the other side as well.
      const pieces = onLip ? opening.decompose().map((piece) => keep(created, piece)) : [];
      const faces: { contour: CrossSection; others: CrossSection | null }[] = !onLip
        ? [{ contour: inner, others: null }]
        : pieces.length > 1
          ? pieces.map((piece) => ({ contour: keep(created, piece.offset(-options.gap, "Round", 2, 48)), others: keep(created, keep(created, opening.subtract(piece)).offset(DIMPLE_SKIN + reach + DIMPLE_PLAY, "Round", 2, 48)) }))
          : [{ contour: round(-options.gap), others: null }];
      const clearOfNotch = notch ? keep(created, notch.area.offset(NOTCH_SKIN, "Round", 2, 48)) : null;
      const dimpleReach = BUMP_RADIUS + DIMPLE_PLAY;
      const besideNotch = notch ? middle - dimpleReach < notch.high && middle + dimpleReach > notch.low : false;
      const centres: Point[] = [];
      for (const face of faces) {
        for (const { point, outward } of clickBumpPlaces(face.contour.toPolygons() as Point[][])) {
          // The lid turns on the hinge's side, so none goes there.
          if (options.hinge && outward[0] * hingeWay[0] + outward[1] * hingeWay[1] > Math.SQRT1_2) continue;
          const way = onLip ? outward : [-outward[0], -outward[1]];
          const centre: Point = [point[0] + way[0] * inward, point[1] + way[1] * inward];
          const room = keep(created, keep(created, runtime.CrossSection.circle(dimpleReach, BUMP_SIDES)).translate([centre[0], centre[1]]));
          if (face.others && keep(created, room.intersect(face.others)).area() > 1e-3) continue;
          // A dimple in the wall behind a finger notch would leave less of it than either keeps.
          if (clearOfNotch && besideNotch && keep(created, room.intersect(clearOfNotch)).area() > 1e-3) continue;
          centres.push(centre);
        }
      }
      if (!centres.length) return { error: { code: "clickBumpsNoRoom" } };
      const balls = (radius: number) => unionOf(centres.map(([x, y]) => keep(created, keep(created, runtime.Manifold.sphere(radius, BUMP_SIDES)).translate([x, y, middle]))));
      const low = middle - dimpleReach - 1;
      const high = middle + dimpleReach + 1;
      let bumps = balls(BUMP_RADIUS);
      if (onLip) {
        // Within the lip's height, short of where a thin wall's dimple stops by the play, and out of the lid's inside (a
        // hair more, so the bump's back does not lie in the lip's inner face).
        bumps = keep(created, bumps.intersect(prism(keep(created, outline.offset(-(DIMPLE_SKIN + DIMPLE_PLAY), "Round", 2, 48)), top - options.depth, top)));
        const inside = round(-(options.gap + options.wall));
        if (inside.area() >= MIN_OPENING_AREA) bumps = keep(created, bumps.subtract(prism(keep(created, inside.offset(FACE_HAIR, "Round", 2, 48)), low, high)));
        dimples = keep(created, balls(dimpleReach).intersect(prism(keep(created, outline.offset(-DIMPLE_SKIN, "Round", 2, 48)), low, high)));
      } else {
        bumps = keep(created, keep(created, bumps.intersect(prism(keep(created, outer.offset(-FACE_HAIR, "Round", 2, 48)), top - options.depth, top))).subtract(prism(round(DIMPLE_SKIN + DIMPLE_PLAY), low, high)));
        dimples = keep(created, balls(dimpleReach).subtract(prism(round(DIMPLE_SKIN), low, high)));
      }
      made = keep(created, made.add(bumps));
      bumpCount = centres.length;
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
      const placedBox = placed.boundingBox();
      // The rows beside the lid, from its back edge out: the pins, then the end plugs.
      let row = placedBox.max[1] + PIN_SPACING;
      // With end plugs the pin is as long as the room between them less half a millimetre at each end; with the end
      // knuckles in rounded corners and no plugs, as long as its hole is whole, less half a millimetre at each end.
      const pinLength = (endPlugs ?? cornerKnuckles)?.pinLength ?? null;
      // A pin printed apart lies beside the lid, a millimetre shorter than the hinge, so it does not stand out; a pivot
      // lid's two lie side by side, each half a millimetre shorter than wall, gap and the bar's hole together.
      if (options.hingePrintPin) {
        const radius = options.hingePin / 2;
        const lengths = pivot
          ? [pivot.inner[0] - pivot.outer[0], pivot.outer[1] - pivot.inner[1]].map((wall) => wall + options.hingeGap + pivot.depth - 0.5)
          : [pinLength ?? plan!.end - plan!.start - 1];
        // Lying on a flat a tenth of its diameter wide, so it does not roll and its underside prints clean.
        const flat = PIN_FLAT * 2 * radius;
        const pins = lengths.map((length, index) => {
          const y = row + radius + index * (2 * radius + PIN_SPACING);
          const round = along(placedBox.min[0], placedBox.min[0] + length, radius, y, box.min[2] + radius - flat);
          const above = keep(created, keep(created, runtime.Manifold.cube([length + 2, 2 * radius + 2, 2 * radius + 1])).translate([placedBox.min[0] - 1, y - radius - 1, box.min[2]]));
          return keep(created, round.intersect(above));
        });
        row += lengths.length * (2 * radius + PIN_SPACING);
        pin = unionOf(pins).transform(UP_TO_SCENE);
        handed.add(pin);
      }
      // The end plugs lie beside the lid in a row of their own, along x as the pin, each turned an eighth about its length
      // onto the side that faced the front: its outer end, cut to a corner that rounds towards the back, then leans up
      // rather than over, and both print without support.
      let plugs: ManifoldSolid | null = null;
      if (plugPieces.length) {
        let x = placedBox.min[0];
        const laid = plugPieces.map((piece) => {
          const lying = keep(created, piece.rotate([45, 0, 0]));
          const lyingBox = lying.boundingBox();
          const moved = keep(created, lying.translate([x - lyingBox.min[0], row - lyingBox.min[1], box.min[2] - lyingBox.min[2]]));
          x += lyingBox.max[0] - lyingBox.min[0] + PIN_SPACING;
          return moved;
        });
        plugs = unionOf(laid).transform(UP_TO_SCENE);
        handed.add(plugs);
      }
      hinge = { knuckles, pin, count: pivot ? 2 : plan!.segments.length, cuts, style, plugs, pinLength };
    }
    let clickBumps: LidClickBumps | undefined;
    if (dimples) {
      clickBumps = { count: bumpCount, dimples: dimples.transform(UP_TO_SCENE) };
      handed.add(clickBumps.dimples);
    }
    let handle: LidHandleResult | undefined;
    if (options.handle !== "none") {
      handle = { style: options.handle, notch: notch ? notch.solid.transform(UP_TO_SCENE) : null };
      if (handle.notch) handed.add(handle.notch);
    }
    let screwResult: LidScrew | undefined;
    if (screw) {
      const thread = screw.thread.transform(UP_TO_SCENE);
      handed.add(thread);
      screwResult = { thread, pitch: screw.plan.pitch, turns: options.threadTurns, depth: screw.plan.depth, diameter: 2 * screw.plan.capRadius };
    }
    const extras = { ...(hinge ? { hinge } : {}), ...(clickBumps ? { clickBumps } : {}), ...(handle ? { handle } : {}), ...(screwResult ? { screw: screwResult } : {}) };
    if (!options.magnets) return { lid, ...extras };
    handed.add(posts);
    // Back in the scene's frame: up is y, and the frame's y is the scene's z turned round.
    const pockets = magnetCentres.map(([x, y]): MagnetPocket => ({
      x,
      z: -y,
      elevation: top - pocketDepth,
      height: pocketDepth + MAGNET_OVERCUT,
      diameter: 2 * pocketRadius,
    }));
    return { lid, magnets: { posts, postParts, pockets }, ...extras };
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
    case "endPlugsFlush":
      return t("lid.error.endPlugsFlush");
    case "endPlugsShort":
      return t("lid.error.endPlugsShort");
    case "clickBumpsNoLip":
      return t("lid.error.clickBumpsNoLip");
    case "clickBumpsNoRoom":
      return t("lid.error.clickBumpsNoRoom");
    case "handlePivot":
      return t("lid.error.handlePivot");
    case "handleSideShort":
      return t("lid.error.handleSideShort");
    case "handleNotchNoRoom":
      return t("lid.error.handleNotchNoRoom");
    case "screwExtras":
      return t("lid.error.screwExtras");
    case "screwNotRound":
      return t("lid.error.screwNotRound");
    case "screwThinWall":
      return t("lid.error.screwThinWall", { wall: SCREW_MIN_WALL.toLocaleString(numberLocale()) });
    case "screwTooLow":
      return t("lid.error.screwTooLow", { height: error.height.toLocaleString(numberLocale()) });
    case "screwGapDeep":
      return t("lid.error.screwGapDeep", { gap: error.gap.toLocaleString(numberLocale()) });
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

/**
 * With a hinge, the body's knuckles (grouped with it, as the posts are) and the pin printed apart, if asked for; with end
 * plugs, the plugs as one body and how long the pin is between them, or without them how long it is where the end knuckles
 * fill rounded corners.
 */
export type LidShapeHinge = { knuckles: WorkplaneShape; pin: WorkplaneShape | null; count: number; cuts: WorkplaneShape | null; style: LidHingeStyle; plugs: WorkplaneShape | null; pinLength: number | null };

/** With click bumps, how many the lid has and the dimples for them, a hole to group with the body. */
export type LidShapeClickBumps = { count: number; dimples: WorkplaneShape };

/** With a handle, which, and for a finger notch its recess, a hole to group with the body. */
export type LidShapeHandle = { style: Exclude<LidHandle, "none">; notch: WorkplaneShape | null };

/** With a screw lid, the thread for the body (grouped with it, as the hinge's knuckles are) and its sizes, in mm. */
export type LidShapeScrew = { thread: WorkplaneShape; pitch: number; turns: number; depth: number; diameter: number };

export type LidShapeResult = { lid: WorkplaneShape; magnets?: LidShapeMagnets; hinge?: LidShapeHinge; clickBumps?: LidShapeClickBumps; handle?: LidShapeHandle; screw?: LidShapeScrew } | { lid: null; error: string };

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
    if (result.hinge) created.push(result.hinge.knuckles, ...[result.hinge.pin, result.hinge.cuts, result.hinge.plugs].filter((part): part is ManifoldSolid => part !== null));
    if (result.clickBumps) created.push(result.clickBumps.dimples);
    if (result.handle?.notch) created.push(result.handle.notch);
    if (result.screw) created.push(result.screw.thread);
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
      // The end plugs are a body of their own beside the lid, as a pin printed apart is.
      const plugs = result.hinge.plugs ? splitShapeFromWorldPositions(source, positionsOf(result.hinge.plugs.getMesh()), createLocalId(`${source.id}-hinge-plugs`), t("lid.hingeEndPlugsName", { name: source.name })) : null;
      if (result.hinge.plugs && !plugs) return { lid: null, error: lidErrorMessage({ code: "empty" }) };
      hinge = {
        knuckles: canonicalizeShape({ ...knuckles, hidden: false }), pin: pin ? canonicalizeShape({ ...pin, hidden: false }) : null, count: result.hinge.count, cuts, style: result.hinge.style,
        plugs: plugs ? canonicalizeShape({ ...plugs, hidden: false }) : null, pinLength: result.hinge.pinLength,
      };
    }
    // The dimples and the finger notch are holes grouped with the body too.
    const holeShape = (solid: ManifoldSolid, suffix: string, name: string) => {
      const shape = splitShapeFromWorldPositions(source, positionsOf(solid.getMesh()), createLocalId(`${source.id}-${suffix}`), name);
      return shape ? canonicalizeShape({ ...shape, hole: true, hidden: false }) : null;
    };
    let clickBumps: LidShapeClickBumps | undefined;
    if (result.clickBumps) {
      const dimples = holeShape(result.clickBumps.dimples, "click-dimples", t("lid.clickDimplesName", { name: source.name }));
      if (!dimples) return { lid: null, error: lidErrorMessage({ code: "empty" }) };
      clickBumps = { count: result.clickBumps.count, dimples };
    }
    let handle: LidShapeHandle | undefined;
    if (result.handle) {
      const notch = result.handle.notch ? holeShape(result.handle.notch, "finger-notch", t("lid.fingerNotchName", { name: source.name })) : null;
      if (result.handle.notch && !notch) return { lid: null, error: lidErrorMessage({ code: "empty" }) };
      handle = { style: result.handle.style, notch };
    }
    let screw: LidShapeScrew | undefined;
    if (result.screw) {
      const thread = splitShapeFromWorldPositions(source, positionsOf(result.screw.thread.getMesh()), createLocalId(`${source.id}-thread`), t("lid.screwThreadName", { name: source.name }));
      if (!thread) return { lid: null, error: lidErrorMessage({ code: "empty" }) };
      const { pitch, turns, depth, diameter } = result.screw;
      screw = { thread: canonicalizeShape({ ...thread, hidden: false }), pitch, turns, depth, diameter };
    }
    const extras = { ...(hinge ? { hinge } : {}), ...(clickBumps ? { clickBumps } : {}), ...(handle ? { handle } : {}), ...(screw ? { screw } : {}) };
    if (!result.magnets) return { lid, ...extras };
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
    return { lid, magnets: { posts, pockets }, ...extras };
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
