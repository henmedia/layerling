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
 *   cap whose rim has the matching thread inside, the gap all round (see `screwPlan`); or a standard bottle's or jar's
 *   thread (`LID_THREAD_STANDARD_SPECS`), whose cap fits that bottle, the body getting the neck's thread only if it is
 *   one (`lidNeckFit`);
 * - screwIn: the other way round (Discussion #1432), for a round body with a round opening: the same thread standing in
 *   from the wall inside the opening, grouped with the body, and a plate as large as the body with a threaded plug
 *   below it that screws into it, the gap all round (see `screwInPlan`);
 * - bayonet: a twist lock (Discussion #1424), for a round body too: lugs standing out of the outside of its top, grouped
 *   with it, and a cap with an L-shaped slot inside its rim for each, pushed down over them and turned to lock, where a
 *   rib behind each lug makes it click (see `bayonetPlan`).
 * - slide: a plate that slides in through one wall of a box (Discussion #1443), like a wooden pencil box's: its edges are
 *   tongues that run in grooves in the other three walls, and the wall it slides in through is cut down to its
 *   underside, so it goes in over that wall; its end then fills the cut, flush with that wall's outside, and its top is
 *   flush with the rim (see `slidePlan`).
 * A screw or bayonet cap can have a tether (asked in the Layerling User Group on Facebook), so it stays with the body
 * when it is off, as a drinks bottle's cap does: two open rings joined by a strap, printed flat beside the cap, one
 * turning round the cap under a collar, the other round the body below the cap on a bead (see `tetherPlan`).
 * Either cap can be a flip-top, as on a bottle of shampoo or ketchup: the cap stays on, and a flap in its plate opens a
 * round opening to pour from (see `flipTopPlan`).
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
 * out. A printed pin has a little more room in the body's holes than filament, or it would not go in at all. The body's knuckles stand out from its back wall on a 45 degree slope, so the body prints upright without
 * support; the lid's lie on the plate when it is printed turned over. A flush hinge can have end plugs (Discussion #1387):
 * the last few millimetres of the pin's hole at each end are a square pocket, and a square plug in each, its outer end
 * cut to the body's outline, closes the hole flush with the outside, so the pin is hidden and cannot slide out. On a box
 * with rounded corners a flush hinge's end knuckles run on into the corners, with end plugs or without, and the pin's
 * hole ends in the corners' round faces.
 * The lid comes out as a body of its own beside the one it closes, turned over with its plate on the plate, ready to
 * print. Everything is worked out with Manifold, in a frame where z is up (the scene's y).
 */

export type LidType = "plug" | "cap" | "both" | "flat" | "screw" | "screwIn" | "bayonet" | "slide";

/**
 * The side of the body a hinge goes along, or a slide-in lid slides in through, as seen in the starting view (the back
 * faces away, -z).
 */
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
 * lid's holes, where it turns; in the body's it sits tight (hingePinGrip). With `hingeTeardrop` (the default) the pin's
 * holes have a point on top as each part is printed, so they do not droop. With `hingeEndPlugs`, a flush hinge's pin hole
 * ends in a square pocket at each end, for a plug that closes it flush with the body's outside; the pin is shorter by them.
 * With `clickBumps`, bumps on the lip or rim and dimples for them in the body, so the lid clicks into place, each reaching
 * `clickBumpHeight` into the body's wall past the gap; `handle` a pull tab or a finger notch.
 * A screw lid's thread climbs `threadPitch` mm a turn and goes `threadTurns` times round: that is how far its cap's rim
 * reaches down. The gap is then the thread's room per side, measured across the radius as a nut's clearance is (on the
 * 45 degree flanks that leaves about 0.7 of it), and the wall what the cap's rim keeps outside the thread. With a
 * `threadStandard` other than `own`, the thread is that standard's and pitch and turns do not count; the gap is then the
 * room all round the thread, square to its faces as well, and the body gets the thread only if its top is that
 * standard's neck (`lidNeckFit`): otherwise the cap is made alone.
 * lid takes the same thread, on a plug that reaches as far down into the opening; its wall is the plug's, inside its
 * thread, SCREW_MIN_WALL at least.
 * A bayonet lid has `bayonetLugs` lugs round the body's top, and its cap's rim reaches `bayonetDepth` down. The gap is the
 * room per side across the radius, round the lugs and along the body's wall; `bayonetAxialGap` is the room along the
 * axis between the lugs' undersides and the ledge of the cap under them, how far the locked cap lifts before it holds;
 * `bayonetDetent` how far the rib behind each locked lug reaches past the gap (0: none). The wall is the cap's rim's.
 * A slide-in lid slides in through the `slideSide` wall, the front unless another is picked; its gap is the play per side
 * in the grooves and in the cut it slides in through, its thickness the plate's, and depth and wall do not count. Its
 * click bumps are one bump under its end at that wall, which clicks past the wall's inner edge, and its finger notch is
 * a row of grooves across its top there, for a thumb.
 * `bayonetTurn` is how far the cap turns to lock, in degrees: 0 leaves it to the lugs (the function `bayonetTurn`), a
 * turn set by hand is held to what fits round the body (`bayonetPlan`).
 * With `tether`, a screw or bayonet cap comes with a tether that keeps it on the body (see `tetherPlan`).
 * With `flipTop`, a screw or bayonet cap's plate has a round opening `flipTopOpening` mm across, closed by a flap printed
 * in it, the gap round it, and joined to the plate by a thin strip that bends as a hinge.
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
  threadStandard: LidThreadStandard;
  bayonetLugs: number;
  bayonetDepth: number;
  bayonetAxialGap: number;
  bayonetDetent: number;
  bayonetTurn: number;
  tether: boolean;
  flipTop: boolean;
  flipTopOpening: number;
  slideSide: LidHingeSide;
};

export const LID_TYPES: readonly LidType[] = ["plug", "cap", "both", "flat", "screw", "screwIn", "bayonet", "slide"];
export const LID_DEFAULTS: LidOptions = {
  type: "plug", thickness: 2, gap: 0.2, depth: 4, wall: 1.6, magnets: false, magnetDiameter: 6, magnetHeight: 2, magnetGap: 0.1,
  hinge: false, hingePin: 1.75, hingeGap: 0.3, hingePinPlay: 0.2, hingeKnuckles: 0, hingePrintPin: false, hingeSide: "back", hingeTeardrop: true, hingeStyle: "outside", hingeEndPlugs: false,
  clickBumps: false, clickBumpHeight: 0.4, handle: "none", threadPitch: 3, threadTurns: 2, threadStandard: "own",
  bayonetLugs: 3, bayonetDepth: 8, bayonetAxialGap: 0.3, bayonetDetent: 0.3, bayonetTurn: 0, tether: false,
  flipTop: false, flipTopOpening: 8, slideSide: "front",
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
 * How much larger than a piece of filament as the pin the body's holes are, per side, in mm, whatever the play: the pin
 * sits tight in the body's part of the hinge and only the lid turns on it, so the filament does not slide out (#1220). A
 * printed hole comes out a little smaller than drawn, so this presses filament in. The same as the least play, so the
 * body's knuckles keep at least HINGE_KNUCKLE_WALL round their hole.
 */
export const HINGE_PIN_GRIP = 0.05;
/**
 * How much larger than the pin the body's holes are, per side, in mm, when the pin is printed apart: a printed pin comes
 * out at its full diameter and the holes a little smaller than drawn, so at HINGE_PIN_GRIP it hardly ever went in (a
 * 3 mm pin went in hard even at 0.15 in #1220). At this it still sits tight but can be pressed in. A piece of filament
 * keeps HINGE_PIN_GRIP.
 */
export const HINGE_PRINTED_PIN_GRIP = 0.15;
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

/**
 * A screw lid's thread: its own (`own`, sized by `threadPitch` and `threadTurns`), or a standard neck's, so that the cap
 * fits a bottle or jar from the shop and a body made as that neck takes a cap from the shop (see `LID_THREAD_STANDARD_SPECS`).
 */
export type LidThreadStandard = "own" | "pco1881" | "pco1810" | "gl45" | "mason70" | "mason86";
export const LID_THREAD_STANDARDS: readonly LidThreadStandard[] = ["own", "pco1881", "pco1810", "gl45", "mason70", "mason86"];

/**
 * A standard neck's thread and the cap for it, in mm. All of them are single-start right-hand threads, and their profile
 * is a trapezoid as the own thread's, but with the standard's flanks, which are steeper than 45 degrees.
 * - `name`: what the standard is called, the same in every language.
 * - `major`: the thread's outside diameter on the neck (T), `minor`: the neck's diameter under the thread (E). Where the
 *   standard gives tolerances, the largest it allows: a cap that clears these clears every neck of the standard, and a
 *   neck made to them fits every cap.
 * - `clear`: how close to the axis the cap's ridges may come, across, before the gap: the neck under the thread, or what
 *   the cap must pass above the thread when it is wider.
 * - `pitch`; `flank`: each flank's angle from the plane square to the axis, in degrees (half the angle between them);
 *   `crest`: how wide the thread is at its outside, along the axis.
 * - `start`: how far below the rim the thread on the neck begins; `turns`: how far it goes round there.
 * - `capDepth`: how far the cap reaches down from the rim, inside; no standard here sets it, it follows the caps sold.
 *
 * The standards' drawings are not free (ISBT, DIN, GPI), so the numbers are taken from where they are quoted, and where
 * none is published they are measured ones; each entry says which.
 */
export type LidThreadStandardSpec = {
  name: string;
  major: number;
  minor: number;
  clear: number;
  pitch: number;
  flank: number;
  crest: number;
  start: number;
  turns: number;
  capDepth: number;
};

export const LID_THREAD_STANDARD_SPECS: Record<Exclude<LidThreadStandard, "own">, LidThreadStandardSpec> = {
  /**
   * PCO 1881, the 28 mm neck of most water and soft-drink bottles (ISBT voluntary guideline, drawing 3784253; the
   * drawing itself is for members). The patents WO2016019321A1 and US20170210503A1 describe "the standard 28 mm PCO 1881
   * finish" as single-start, the thread starting 1.70 mm below the top, 2.70 mm pitch, 650 degrees of thread, 27.40 mm
   * across it (T); the OpenSCAD library BOSL2 (`pco1881_neck` in bottlecaps.scad) draws the same, its 15 degree flanks,
   * a lip 25.07 mm across above the thread and the tamper ring's bead from 11.2 mm down. Under the thread the neck is
   * 24.94 mm across (E), as the OpenSCAD threads library thread_profile.scad (`bottle_pco1881_neck_thread_dia`) and the
   * alpaco.it blog give it; BOSL2 draws the thread's root at 24.2, deeper than the cap's ridges go (25.5 in BOSL2's
   * `pco1881_cap`, 25.5 in thread_profile.scad), so it does not change what fits. Approximations: the flanks (BOSL2's 15
   * degrees; thread_profile.scad's thread has about 10) and the crest, as wide as the root's gap as BOSL2 draws it,
   * 1.02 mm (thread_profile.scad: 1.0). The cap reaches 10 mm down, above the bead.
   */
  pco1881: { name: "PCO 1881", major: 27.4, minor: 24.94, clear: 25.07, pitch: 2.7, flank: 15, crest: 1.02, start: 1.7, turns: 650 / 360, capDepth: 10 },
  /**
   * PCO 1810, the older 28 mm drinks bottle neck with a taller thread, which PCO 1881 replaced (ISBT). BOSL2's
   * `pco1810_neck`: 27.43 mm across the thread, 3.18 mm pitch, 810 degrees of thread from 1.70 mm below the top, 20
   * degree flanks, the thread's root 24.51 mm across, the lip above it 25.07 mm, the tamper ring's bead from 14.1 mm down;
   * the diameter and pitch as imajeenyus.com and alpaco.it give them. Approximations: the root (BOSL2's only) and the crest,
   * drawn as BOSL2 does, 1.06 mm. The cap reaches 13 mm down.
   */
  pco1810: { name: "PCO 1810", major: 27.43, minor: 24.51, clear: 25.07, pitch: 3.18, flank: 20, crest: 1.06, start: 1.7, turns: 810 / 360, capDepth: 13 },
  /**
   * GL 45, the thread of laboratory bottles (DIN 168-1:1998-04, as the bottles of ISO 4796-1 have it). Tabelle 1 and Bild
   * 1 as the OpenSCAD library din168-thread-scad records them from the standard (its docs/references.md), and the
   * tables of gewindebohrer.de and gewinde-normen.de: single-start, 4 mm pitch; on the glass 45.00 mm across the thread
   * (down to 44.30) and 42.30 under it (down to 41.60), in the cap 45.15 to 45.55 and 42.45 to 42.85; 60 degrees between
   * the glass's flanks, its tooth 0.675 of the pitch wide at the core, 2.7 mm. Approximation: the standard rounds the
   * crest (R 0.99), the trapezoid ends it flat, 1.14 mm wide, a little fuller, which only gives the cap more room. The
   * standard sets neither the thread's place on the neck nor the cap: the thread starts 3 mm down and goes round twice,
   * and the cap reaches 20 mm down, as DURAN's GL 45 cap (DWK: 25 mm high) less its top, which din168-thread-scad's
   * printed cap found to thread on cleanly.
   */
  gl45: { name: "GL 45", major: 45, minor: 42.3, clear: 42.3, pitch: 4, flank: 30, crest: 1.14, start: 3, turns: 2, capDepth: 20 },
  /**
   * The mason jar's regular mouth, 70-450 (Ball, Kerr). The Glass Packaging Institute does not publish its drawing, so
   * these are approximations from measured jars and a cap maker's drawing: BOSL2's `mason_neck` (70-450: 69.85 mm across
   * the thread, 4 threads per inch, the thread 3 mm below the top, 3.6 mm wide at its root and 1.8 deep with 60 degrees
   * between its flanks), Comet Tool's drawing of a 70-450 cap (1340-0109: 0.250 in pitch, 4 per inch, 1 1/4 turns, 13.4 mm
   * high, its ridges 68.6 mm across) and a printed cap tried on jars (canning_jar_lids.scad, a Thingiverse model: 1/4 in
   * pitch, its ridges best at about 67.2 mm across). The cap's ridges keep a millimetre more room than the neck under the
   * thread, as that cap's did; the thread on a neck goes round once, and the cap reaches 13 mm down, as a ring does.
   */
  mason70: { name: "Mason 70", major: 69.85, minor: 66.25, clear: 67.25, pitch: 6.35, flank: 30, crest: 1.52, start: 3, turns: 1, capDepth: 13 },
  /**
   * The mason jar's wide mouth, 86 mm (86-400 in BOSL2, 86-450 elsewhere): BOSL2's 85.85 mm across the thread, the same
   * thread as the regular mouth; the printed cap above went on best at 83.3 to 83.8 mm across its ridges. Approximations
   * as for the regular mouth.
   */
  mason86: { name: "Mason 86", major: 85.85, minor: 82.25, clear: 83.25, pitch: 6.35, flank: 30, crest: 1.52, start: 3, turns: 1, capDepth: 13 },
};

/**
 * How far a body's top may be from a standard's neck under the thread (`minor`) and still get its thread, across, in
 * mm: a millimetre smaller (the thread's ring then fills up to the neck), or a fifth of a millimetre larger, as round as
 * an editor's cylinder of the neck's size. A larger one would come near the cap's ridges, which keep the gap from the
 * standard's neck, not the body's.
 */
export const NECK_SMALLER = 1;
export const NECK_LARGER = 0.2;
/**
 * A screw-in lid's plug across at its thread's root, in mm, at least: a thinner one would twist off as it is turned. An
 * opening too small for that with the gap and the thread round it is refused.
 */
const SCREW_IN_MIN_PLUG = 4;
/**
 * A screw-in lid's plug is a ring, its wall inside the thread's root as thick as the lid's wall and SCREW_MIN_WALL at
 * least, which saves the filament of a solid one; where the hole in it would be narrower than this, in mm, it stays solid.
 */
const SCREW_IN_MIN_HOLE = 4;
/**
 * Under a rim that is rounded or chamfered (Discussion #1426), where a screw lid's thread or a bayonet's lugs go instead:
 * how far apart two heights are compared in looking for the straight wall below the rounding, in mm, and how much they may
 * differ, outside and inside, and still both lie on it (a slope of a tenth: a wall leaning more is no wall for a thread
 * anyway); how near the wall's outline must come at the height where the rounding begins (within the thread's root
 * inset, so the thread's top end still lies inside the wall there); and how closely that height is found.
 */
const SHOULDER_STEP = 0.5;
const SHOULDER_FLAT = 0.05;
const SHOULDER_FULL = 0.05;
const SHOULDER_PRECISION = 0.05;
/**
 * A bayonet lid's lugs (Discussion #1424): two to four round the body, three to begin with, which hold the cap evenly
 * and leave it a turn of 40 degrees between them.
 */
export const MIN_BAYONET_LUGS = 2;
export const MAX_BAYONET_LUGS = 4;
/**
 * How far a bayonet's cap reaches down the body, in mm: 8 to begin with, enough for the lugs and the ledge under them on
 * a pot of 60 to 100 mm, the rest a collar along the wall that keeps the cap straight; joined sections of a lamp take more.
 */
export const MIN_BAYONET_DEPTH = 3;
export const MAX_BAYONET_DEPTH = 30;
/**
 * The room along the axis between a lug's underside and the cap's ledge under it, in mm: how far the locked cap lifts
 * before it holds. Both faces slope at 45 degrees, so they are 0.7 of it apart, as much as the gap of 0.2 keeps round the
 * lugs. It keeps its own 0.3 rather than the printer's play: both faces are overhangs as they print, which sag a little.
 */
export const MIN_BAYONET_AXIAL_GAP = 0.05;
export const MAX_BAYONET_AXIAL_GAP = 1;
/**
 * How far the rib behind each locked lug reaches past the gap, in mm (0.3 to begin with, 0 for none): to pass it, the lug
 * pushes the body's rim in by as much, so the cap clicks shut and does not turn back by itself, and opens with a firm
 * turn. At most half a millimetre, so the rib always stands on the ledge, however large the gap.
 */
export const MAX_BAYONET_DETENT = 0.5;
/**
 * How far a bayonet's cap turns to lock when the turn is set by hand, in whole degrees (0 leaves it to the lugs): at
 * least 15, short of which the cap hardly moves from where it goes on to where it holds, and at most a quarter turn, as
 * far as a wrist turns in one go, like a cap that goes on with a 90 degree twist (asked in the Layerling User Group on
 * Facebook). Two lugs leave room for that on all but the smallest bodies; with more, or on a small body, the slots and
 * the stops between them leave less, and `bayonetPlan` holds it to what fits: four lugs turn 63 degrees at most on a pot
 * 40 mm across, 68 on one of 80.
 */
export const MIN_BAYONET_TURN = 15;
export const MAX_BAYONET_TURN = 90;
/** The thinnest wall a bayonet's lugs go on, in mm: as for a screw lid's thread. */
export const BAYONET_MIN_WALL = 0.8;
/**
 * How long the cap's ring stays at least between the stop at the end of one lug's turn and the next lug's slot, in mm
 * where it is nearest the axis: that piece of ring is the stop, and a turn set by hand that would leave less is cut back.
 */
const BAYONET_MIN_STOP = 3;
/** How far below the rim a lug's top lies, in mm, so it stays clear of the cap's plate resting on the rim. */
const LUG_TOP_INSET = 0.2;
/** How tall the cap's ledge is at least below its slope, at its inner edge, in mm. */
const BAYONET_MIN_LEDGE = 1;
/** How far the ledge's inner edge is cut back at 45 degrees at the cap's mouth, in mm, so the cap finds the body. */
const BAYONET_MOUTH = 0.4;
/** How much wider a slot is than its lug on each side, in mm, so the cap goes down over the lugs set on by eye. */
const BAYONET_ENTRY_PLAY = 0.5;
/** How much of the ledge a turned lug has past its slot at least, beyond the rib, in mm. */
const BAYONET_LEDGE_MARGIN = 0.5;
/** A lug narrower than this along the wall holds too little, in mm: the body is then refused for so many lugs. */
const MIN_LUG_WIDTH = 4;
/** How much deeper a slot reaches into the cap's rim than the channel the lug turns in, so their faces never lie together, in mm. */
const SLOT_EXTRA = 0.1;
/** The radius of the round rib behind a locked lug, seen from above, in mm: its flanks meet the lug's corner gently. */
const DETENT_RADIUS = 3;
/** How far the rib reaches into the cap round it, in mm, so the two are one. */
const DETENT_OVERLAP = 0.1;
/**
 * A slide-in lid's grooves (Discussion #1443): how deep they go into the walls from their inner faces at most, in mm, and
 * how much of a wall they leave behind them at least (two lines of a 0.4 mm nozzle, as SCREW_MIN_WALL). Within that, a
 * groove goes as deep as the plate allows (SLIDE_EDGE, SLIDE_LIP).
 */
export const SLIDE_MAX_GROOVE = 1.5;
export const SLIDE_WALL_KEEP = 0.8;
/** How tall a tongue's outer face is, at its tip, in mm: two layers, so its 45 degree top does not end in a knife edge. */
export const SLIDE_EDGE = 0.4;
/** How much of the wall stays above a groove at its inner face, in mm: three layers, so the rim is no knife edge there. */
export const SLIDE_LIP = 0.6;
/** How far a tongue reaches into its wall past the gap at least, in mm: less does not hold the lid. */
export const SLIDE_MIN_HOLD = 0.4;
/**
 * How far the walls may stray from upright between the rim and the grooves' floor, in mm, at the outline's and the
 * opening's sides: a box hollowed in the editor does not at all.
 */
const SLIDE_UPRIGHT = 0.1;
/** How far below the grooves' floor the opening must still be whole, in mm, so the lid's underside does not lie on it. */
const SLIDE_BELOW = 0.05;
/**
 * How much further than the gap the cut for a slide-in lid reaches into the walls, in mm, so that none of its faces lies
 * in the walls' inner faces: at a rounded corner the two are drawn alike but not quite the same, which left slivers.
 */
const SLIDE_HAIR = 0.01;
/** A tongue may fall short of SLIDE_MIN_HOLD by this much, in mm: what a mesh's corners in single precision stray by. */
const SLIDE_MESH_SLACK = 1e-5;
/**
 * A slide-in lid's finger grip: so many grooves across its top near its end at the slot, at 45 degrees to both sides so
 * they print on the plate without support, SLIDE_GRIP_DEPTH deep (a third of the plate at most) and a millimetre apart at
 * the top; SLIDE_GRIP_WIDTH long, or the plate less 2 mm at each end; shorter than MIN_SLIDE_GRIP_WIDTH is refused.
 */
const SLIDE_GRIP_GROOVES = 4;
const SLIDE_GRIP_DEPTH = 0.6;
const SLIDE_GRIP_WIDTH = 24;
const MIN_SLIDE_GRIP_WIDTH = 10;
/** How far behind the lid's end the grip's first groove starts, in mm. */
const SLIDE_GRIP_START = 2;

/**
 * A tether's rings, in mm: how wide across the radius (three lines of a 0.4 mm nozzle) and how tall along the axis, as
 * they are printed lying flat. Thin enough to open a little and snap over a bead in PETG or TPU, and to bend back.
 */
const TETHER_RING_WIDTH = 1.2;
const TETHER_RING_HEIGHT = 2;
/** The strap between them, in mm: as wide as a finger's nail is long, and three layers of 0.2 mm thick, so it bends. */
const TETHER_STRAP_WIDTH = 5;
const TETHER_STRAP_THICKNESS = 0.6;
/** How far a bead reaches past the inner face of the ring it holds, in mm: how far the ring must open to pass it. */
const TETHER_HOLD = 0.5;
/** How tall the upright face of a bead is, between its flat top (the cap's: its crest) and its 45 degree slope, in mm. */
const TETHER_BEAD_FACE = 0.4;
/** How tall the collar round the cap's top is, in mm: the cap's ring sits under it. */
const TETHER_COLLAR = 1;
/** How wide the opening in each ring is, in mm, so its ends are not printed together. */
const TETHER_SLOT = 1.5;
/**
 * The least room a ring keeps round what it turns on, in mm, however tight the lid's gap: with none it would not turn.
 */
const TETHER_MIN_PLAY = 0.1;
/**
 * How far above the body's rim the cap's mouth is lifted before it tips aside, and how much longer than that reach the
 * strap is, in mm, for its bends at the rings and so the open cap hangs loose.
 */
const TETHER_LIFT = 1;
const TETHER_SLACK = 3;
/**
 * A flip-top's opening, in mm across where it is narrowest, at the plate's underside: 8 to begin with, enough to pour a
 * sauce or a shampoo; the body's opening must hold it and the flap's hinge (`flipTopPlan`).
 */
export const MIN_FLIP_TOP_OPENING = 4;
export const MAX_FLIP_TOP_OPENING = 40;
/**
 * How deep the flap's seat reaches into the plate, in mm: the flap narrows at 45 degrees from the plate's top down to the
 * opening, the plate's edge round it alike the gap further out, so pressed down it rests there and cannot be pushed in.
 */
const FLIP_SEAT = 0.6;
/**
 * How far the catch at the flap's front still reaches past the plate's edge above it when the flap is pushed back as far
 * as the slit under its hinge lets it, in mm: it clicks past that as the flap is lifted open or pressed shut, and holds
 * it shut.
 */
const FLIP_SNAP = 0.2;
/** How far the catch reaches round the flap's front to each side, in degrees. */
const FLIP_CATCH_HALF = 40;
/** A flip-top's flap and its room are drawn round with a point every so many millimetres, at least 128 and at most 512. */
const FLIP_STEP = 0.2;
/**
 * The hinge: a strip at the plate's top, flat on the bed as the cap prints, as wide as the flap's straight back, 0.4 mm
 * (two layers of 0.2) thick and 3 mm long between flap and plate. It bends over its whole length, so its faces stretch
 * and squeeze by about a seventh with the flap open upright and a fifth laid right back: PETG and PP take that many
 * times, PLA breaks after a few.
 */
export const FLIP_HINGE_THICKNESS = 0.4;
export const FLIP_HINGE_LENGTH = 3;
/** The flap's back is at least this much of its radius behind its middle, so the strip is not wider than the flap. */
const FLIP_MIN_BACK = 0.3;
/** How far behind the opening's back at the plate's underside the slit at the hinge lies at least, in mm. */
const FLIP_BACK_MARGIN = 0.1;
/**
 * The groove across the flap's top for a fingernail to lift it by: how deep (and as wide), and how far in front of the
 * flap's middle its upright front lies, as a share of the flap's radius, so a small flap still has a groove long enough.
 */
const FLIP_GROOVE = 0.8;
const FLIP_GROOVE_AT = 0.4;
/** How much of the flap the groove leaves at its ends, in mm. */
const FLIP_GROOVE_SKIN = 0.4;
/** How far inside the body's opening everything cut through the plate stays, in mm, so the cap still rests on the rim. */
const FLIP_RIM_MARGIN = 0.5;
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
  // In any case: "screwin" is the screw-in lid as well.
  const type = typeof value?.type === "string" ? value.type.trim().toLowerCase() : "";
  const kind = LID_TYPES.find((option) => option.toLowerCase() === type);
  if (kind) result.type = kind;
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
  // Written as the standard is ("PCO 1881", "GL45", "mason-70") or as the list has it.
  const threadStandard = typeof value?.threadStandard === "string" ? value.threadStandard.toLowerCase().replace(/[\s_-]+/g, "") : "";
  if ((LID_THREAD_STANDARDS as readonly string[]).includes(threadStandard)) result.threadStandard = threadStandard as LidThreadStandard;
  const bayonetLugs = finiteNumber(value?.bayonetLugs);
  if (bayonetLugs !== null) result.bayonetLugs = Math.round(clamp(bayonetLugs, MIN_BAYONET_LUGS, MAX_BAYONET_LUGS));
  const bayonetDepth = finiteNumber(value?.bayonetDepth);
  if (bayonetDepth !== null) result.bayonetDepth = clamp(bayonetDepth, MIN_BAYONET_DEPTH, MAX_BAYONET_DEPTH);
  const bayonetAxialGap = finiteNumber(value?.bayonetAxialGap);
  if (bayonetAxialGap !== null) result.bayonetAxialGap = clamp(bayonetAxialGap, MIN_BAYONET_AXIAL_GAP, MAX_BAYONET_AXIAL_GAP);
  const bayonetDetent = finiteNumber(value?.bayonetDetent);
  if (bayonetDetent !== null) result.bayonetDetent = clamp(bayonetDetent, 0, MAX_BAYONET_DETENT);
  const slideSide = typeof value?.slideSide === "string" ? value.slideSide.trim().toLowerCase() : "";
  if ((LID_HINGE_SIDES as readonly string[]).includes(slideSide)) result.slideSide = slideSide as LidHingeSide;
  // Whole degrees; 0 leaves the turn to the lugs, and one set by hand is MIN_BAYONET_TURN at least.
  const turn = finiteNumber(value?.bayonetTurn);
  if (turn !== null) {
    const whole = Math.round(clamp(turn, 0, MAX_BAYONET_TURN));
    result.bayonetTurn = whole === 0 ? 0 : Math.max(MIN_BAYONET_TURN, whole);
  }
  if (value?.tether === true || value?.tether === "true") result.tether = true;
  if (value?.flipTop === true || value?.flipTop === "true") result.flipTop = true;
  const flipTopOpening = finiteNumber(value?.flipTopOpening);
  if (flipTopOpening !== null) result.flipTopOpening = clamp(flipTopOpening, MIN_FLIP_TOP_OPENING, MAX_FLIP_TOP_OPENING);
  return result;
}

/**
 * Whether magnets, a hinge, click bumps and a handle go with this kind of lid: a screw lid (screwed on or in) holds by its
 * thread and a bayonet lid by its lugs, all turned to close, so none of them does.
 */
export function lidTakesExtras(options: Pick<LidOptions, "type">) {
  return options.type !== "screw" && options.type !== "screwIn" && options.type !== "bayonet";
}

/** Whether a tether goes with this kind of lid: it keeps a cap that is turned off the body, a screw or a bayonet cap. */
export function lidTetherFits(options: Pick<LidOptions, "type">) {
  return options.type === "screw" || options.type === "bayonet";
}

/**
 * Whether magnets go with this kind of lid: not where the extras do not (`lidTakesExtras`), nor with a slide-in lid, whose
 * plate lies between the walls with no rim under it for their pockets and slides out rather than lifting off. A hinge
 * goes only with the kinds in LID_HINGE_TYPES; click bumps and a handle do go with a slide-in lid.
 */
export function lidTakesMagnets(options: Pick<LidOptions, "type">) {
  return lidTakesExtras(options) && options.type !== "slide";
}


/**
 * Whether a flip-top goes with this kind of lid: a cap that stays on while the flap in its plate opens, a screw lid's or
 * a bayonet lid's. A lid that is lifted off has no need of one.
 */
export function lidFlipTopFits(options: Pick<LidOptions, "type">) {
  return options.type === "screw" || options.type === "bayonet";
}

/**
 * How far a bayonet's cap is turned to lock, in degrees, unless the turn is set by hand (`bayonetTurn` in the options): a
 * third of the way to the next lug and 45 at most, so one twist of the wrist does it - 45 for two lugs, 40 for three, 30
 * for four.
 */
export function bayonetTurn(lugs: number) {
  return Math.min(45, 120 / lugs);
}

/**
 * A bayonet lug's size for a body `diameter` mm across, in mm: how far it stands out of the wall (`height`, a fortieth of
 * the diameter to a tenth, 1.2 to 2.5) and how wide it is along it at most (`width`, 0.15 of the diameter, 6 to 20); a
 * turn too short for that width makes it narrower (`bayonetPlan`). Its outer face is as tall as it stands out.
 */
export function bayonetLugSize(diameter: number) {
  return { height: clamp(Math.round(diameter / 4) / 10, 1.2, 2.5), width: clamp(0.15 * diameter, 6, 20) };
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
 * A standard's thread as the lid draws it, in mm: its spec, how deep it is (`depth`, from the neck under it to its
 * outside), how wide its tooth is at the root (`root`), how much of the neck it takes up (`length`: its turns times the
 * pitch, and the tooth), where it ends below the rim (`end`), and which sizes of a body's top count as its neck
 * (`neckFrom` to `neckTo`, across).
 */
export function lidStandardThread(standard: Exclude<LidThreadStandard, "own">) {
  const spec = LID_THREAD_STANDARD_SPECS[standard];
  const depth = (spec.major - spec.minor) / 2;
  const root = spec.crest + 2 * depth * Math.tan((spec.flank * Math.PI) / 180);
  const length = spec.turns * spec.pitch + root;
  return { ...spec, depth, root, length, end: spec.start + length, neckFrom: spec.minor - NECK_SMALLER, neckTo: spec.minor + NECK_LARGER };
}

/** Why a body takes no standard's thread, and the cap is made alone: its top is not round, or not the neck's size. */
export type LidCapOnly = { reason: "notRound" } | { reason: "size"; diameter: number };

/**
 * Whether a body's top, as `roundOutline` finds it at the rim (null: not round), is the neck of `standard`: across it,
 * from `neckFrom` at its nearest to `neckTo` at its farthest. Null if it is; otherwise why not, with the top's diameter
 * (its farthest, to a tenth) when it is round.
 */
export function lidNeckFit(standard: Exclude<LidThreadStandard, "own">, round: { outer: number; inner: number } | null): LidCapOnly | null {
  if (!round) return { reason: "notRound" };
  const { neckFrom, neckTo } = lidStandardThread(standard);
  if (2 * round.inner >= neckFrom - 1e-9 && 2 * round.outer <= neckTo + 1e-9) return null;
  return { reason: "size", diameter: Math.round(20 * round.outer) / 10 };
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
 * How much larger than the pin the body's holes are, per side, in mm: HINGE_PIN_GRIP for a piece of filament,
 * HINGE_PRINTED_PIN_GRIP for a pin printed apart. Never more than the pin's play, so the body's holes are never looser
 * than the lid's and its knuckles keep at least HINGE_KNUCKLE_WALL round them.
 */
export function hingePinGrip(options: Pick<LidOptions, "hingePinPlay"> & Partial<Pick<LidOptions, "hingePrintPin">>) {
  return options.hingePrintPin ? Math.min(HINGE_PRINTED_PIN_GRIP, options.hingePinPlay) : HINGE_PIN_GRIP;
}

/**
 * The radius of the pin's hole in mm: in the lid's part of the hinge with the pin's play, so the lid turns on it; in the
 * body's only the grip larger than the pin (hingePinGrip), so it sits tight there and does not slide out (#1220).
 */
export function hingePinHoles(options: Pick<LidOptions, "hingePin" | "hingePinPlay"> & Partial<Pick<LidOptions, "hingePrintPin">>) {
  return { lidHole: options.hingePin / 2 + options.hingePinPlay, bodyHole: options.hingePin / 2 + hingePinGrip(options) };
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
  | { code: "screwTooLow" | "screwRimRound"; height: number }
  | { code: "screwGapDeep" | "screwStandardGapDeep"; gap: number }
  | { code: "screwStandardTooLow"; standard: Exclude<LidThreadStandard, "own">; height: number }
  | { code: "screwStandardNeck"; standard: Exclude<LidThreadStandard, "own">; depth: number }
  | { code: "screwInNotRound" }
  | { code: "screwInShallow"; height: number }
  | { code: "screwInSmallOpening"; diameter: number }
  | { code: "bayonetExtras" | "bayonetNotRound" | "bayonetThinWall" | "bayonetNoRoom" }
  | { code: "bayonetTooLow" | "bayonetRimRound"; height: number }
  | { code: "bayonetGapDeep"; gap: number }
  | { code: "bayonetShallow"; depth: number }
  | { code: "slideExtras" | "slideNotBox" }
  | { code: "slideThinWall"; wall: number }
  | { code: "slideThinLid"; thickness: number }
  | { code: "slideShallow"; depth: number }
  | { code: "tetherType" | "tetherThinWall" }
  | { code: "tetherNoNeck"; length: number }
  | { code: "tetherCapShort"; depth: number }
  | { code: "flipTopType" | "flipTopNoRoom" }
  | { code: "flipTopThin"; thickness: number }
  | { code: "flipTopTooLarge"; opening: number }
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
  /**
   * Where the thread on the body starts and ends. The own thread's start is the height the cap's rim reaches down to
   * when screwed on, its end just below the rim; a standard's lies where the standard has it on its neck.
   */
  from: number;
  to: number;
  /**
   * How high the straight wall reaches, which the thread ends SCREW_TOP_INSET below: the top, or under a rim rounded or
   * chamfered where the rounding begins (Discussion #1426). The cap's plate rests on the top all the same.
   */
  wallTop: number;
  pitch: number;
  /** How many times the thread goes round: the turns asked for, or the standard's on its neck. */
  turns: number;
  depth: number;
  crest: number;
  /** How steeply the flanks fall from the crest: across the radius per mm along the axis, 1 at 45 degrees. */
  slope: number;
  /** The radius the thread stands on: the body's outer face (`radius`), or a standard's neck under its thread. */
  base: number;
  /** Where the cap's mouth is: the height its rim reaches down to. */
  mouth: number;
  /** How close to the axis the cap's ridges come: the gap outside the body, or outside a standard's `clear`. */
  clear: number;
  /**
   * How much wider each of the cap's grooves is than the thread at its crest, along the axis, each side, beyond what the
   * gap across the radius gives: 0 for the own thread, whose gap is a nut's, across the radius; for a standard's, whose
   * flanks are steep, as much more as keeps the gap square to them too.
   */
  widen: number;
  /** How far the cap's rim reaches from the axis: the thread, the gap and the wall. */
  capRadius: number;
  standard: LidThreadStandard;
  /** Null when the body gets the thread; otherwise why a standard's cap is made alone. */
  neck: LidCapOnly | null;
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
 * threads still overlap by as much as they keep apart. With a standard's thread, see `standardScrewPlan`.
 * A rim rounded or chamfered, outside, inside or both, is no circle as large as the wall below it (Discussion #1426): a
 * vessel revolved from a stroke with round ends has one. Then the thread goes on the straight wall below the rounding,
 * as it would below a square rim there (`roundWall`), and the cap reaches over the rounding, its plate on the top.
 */
export function screwPlan(sliceAt: LidSlicer, options: LidOptions, top: number, bottom: number, rim: number): ScrewPlan | { error: LidError } {
  if (options.threadStandard !== "own") return standardScrewPlan(sliceAt, options, options.threadStandard, top, bottom, rim);
  const thread = lidThread(options);
  if (options.gap > thread.depth / 2 + 1e-9) return { error: { code: "screwGapDeep", gap: Math.floor((thread.depth / 2) * 100 + 1e-6) / 100 } };
  const height = Math.round(thread.height * 10) / 10;
  if (top - thread.height < bottom + SCREW_FLOOR) return { error: { code: "screwTooLow", height } };
  const found = roundWall(sliceAt, top, rim, thread.height, bottom + SCREW_FLOOR, SCREW_MIN_WALL);
  if ("error" in found) return { error: found.error === "notRound" ? { code: "screwNotRound" } : found.error === "thinWall" ? { code: "screwThinWall" } : { code: "screwRimRound", height } };
  const { centre, radius, inner, wall } = found.body;
  return {
    centre, radius, inner, reach: Math.min(SCREW_REACH, wall / 2), from: found.wallTop - thread.height, to: found.wallTop - SCREW_TOP_INSET, wallTop: found.wallTop,
    pitch: thread.pitch, turns: options.threadTurns, depth: thread.depth, crest: thread.crest, slope: 1, base: radius, mouth: found.wallTop - thread.height, clear: radius + options.gap, widen: 0,
    capRadius: radius + options.gap + thread.depth + options.wall, standard: "own", neck: null,
  };
}

/**
 * A screw lid with a standard's thread (`LID_THREAD_STANDARD_SPECS`): the cap is made to the standard whatever the body,
 * so it fits a bottle or jar from the shop. Its inside is the standard neck's thread moved the gap away all round:
 * square to the steep flanks too, not only across the radius as the own thread's cap (`widen`), its ridges no nearer the
 * axis than the standard's `clear` and the gap, its grooves the standard's outside diameter and the gap; its rim reaches
 * the standard's `capDepth` down and its mouth widens at 45 degrees, as the own cap's does.
 * The body gets the neck's thread, at the standard's sizes and place, only if its top is that neck (`lidNeckFit`): round
 * and as wide as the neck under the thread. Otherwise it stays as it is and the cap is made alone (`neck` says why): a
 * stand-in for the bottle a cap is wanted for, or any other body. A body that is the neck must stay so - round and as
 * wide - as far down as the cap reaches (or to its bottom, for a ring shorter than that), have SCREW_FLOOR below the thread
 * and a wall of SCREW_MIN_WALL; else it is refused with a message. A body a little thinner than the neck gets the
 * thread's ring filled up to the neck's size; its ends, as the own thread's, are cut back at 45 degrees from the body's face.
 */
function standardScrewPlan(sliceAt: LidSlicer, options: LidOptions, standard: Exclude<LidThreadStandard, "own">, top: number, bottom: number, rim: number): ScrewPlan | { error: LidError } {
  const thread = lidStandardThread(standard);
  const gap = options.gap;
  if (gap > thread.depth / 2 + 1e-9) return { error: { code: "screwStandardGapDeep", gap: Math.floor((thread.depth / 2) * 100 + 1e-6) / 100 } };
  const flank = (thread.flank * Math.PI) / 180;
  const base = thread.minor / 2;
  const from = top - thread.end;
  const shared = {
    from, to: top - thread.start, wallTop: top, pitch: thread.pitch, turns: thread.turns, depth: thread.depth, crest: thread.crest, slope: 1 / Math.tan(flank), base,
    mouth: top - thread.capDepth, clear: thread.clear / 2 + gap, widen: gap * (1 / Math.cos(flank) - Math.tan(flank)), capRadius: thread.major / 2 + gap + options.wall, standard,
  };
  const atRim = sliceAt(rim);
  const round = roundOutline(atRim.outline);
  const neck = lidNeckFit(standard, round);
  if (neck) {
    // The cap alone: round a round top's middle, else the middle of the top's box; it is laid beside the body anyway.
    const points = atRim.outline.flat();
    const centre: Point = round?.centre ?? (points.length ? [(Math.min(...points.map(([x]) => x)) + Math.max(...points.map(([x]) => x))) / 2, (Math.min(...points.map(([, y]) => y)) + Math.max(...points.map(([, y]) => y))) / 2] : [0, 0]);
    return { ...shared, centre, radius: base, inner: base, reach: 0, neck };
  }
  if (from < bottom + SCREW_FLOOR) return { error: { code: "screwStandardTooLow", standard, height: Math.round(thread.end * 10) / 10 } };
  const lowest = Math.max(top - thread.capDepth, bottom + SCREW_FLOOR);
  const body = roundBody(sliceAt, rim, lowest + 0.05);
  if (!body || lidNeckFit(standard, { outer: body.radius, inner: body.inner })) return { error: { code: "screwStandardNeck", standard, depth: Math.round((top - Math.max(top - thread.capDepth, bottom)) * 10) / 10 } };
  if (body.wall < SCREW_MIN_WALL - 1e-9) return { error: { code: "screwThinWall" } };
  const { centre, radius, inner, wall } = body;
  return { ...shared, centre, radius, inner, reach: Math.min(SCREW_REACH, wall / 2), neck: null };
}

/** The body seen from above at a height, as lidForSolid slices it: its outer contours and the openings in them. */
export type LidSlicer = (z: number) => { outline: readonly (readonly Point[])[]; opening: readonly (readonly Point[])[] };

/**
 * The round body a screw lid's thread or a bayonet's lugs go on: at the rim and at four heights down to `lowest` it must
 * be one circle round the same middle, as large each time, within SCREW_ROUND. Its middle, how far its outer face
 * reaches from the axis at most (`radius`) and how near it comes (`inner`), and how thick its wall is where it is
 * thinnest: from the farthest point of an opening to the nearest of the outline. Null for a box, an oval, a pot that
 * tapers there. With it the opening (`hole`), where it is a circle round the same middle at all those heights too, as
 * large each time: how far its face lies from the axis at most (`radius`) and how near it comes (`inner`); null for a
 * square opening, two side by side, one off the middle, one that narrows or ends.
 */
function roundBody(sliceAt: LidSlicer, rim: number, lowest: number): (RoundBody & { hole: { radius: number; inner: number } | null }) | null {
  const atRim = sliceAt(rim);
  const round = roundOutline(atRim.outline);
  if (!round) return null;
  let radius = round.outer;
  let inner = round.inner;
  let opening = 0;
  const holeAtRim = roundOutline(atRim.opening, round.centre);
  let hole = holeAtRim ? { radius: holeAtRim.outer, inner: holeAtRim.inner } : null;
  for (const z of [rim, ...Array.from({ length: 4 }, (_, index) => lowest + ((rim - lowest) * index) / 4)]) {
    const level = z === rim ? atRim : sliceAt(z);
    const here = roundOutline(level.outline, round.centre);
    if (!here || Math.abs(here.outer - round.outer) > SCREW_ROUND || Math.abs(here.inner - round.inner) > SCREW_ROUND) return null;
    radius = Math.max(radius, here.outer);
    inner = Math.min(inner, here.inner);
    for (const point of level.opening.flat()) opening = Math.max(opening, Math.hypot(point[0] - round.centre[0], point[1] - round.centre[1]));
    const holeHere = holeAtRim && hole ? roundOutline(level.opening, round.centre) : null;
    hole = holeAtRim && hole && holeHere && Math.abs(holeHere.outer - holeAtRim.outer) <= SCREW_ROUND && Math.abs(holeHere.inner - holeAtRim.inner) <= SCREW_ROUND
      ? { radius: Math.max(hole.radius, holeHere.outer), inner: Math.min(hole.inner, holeHere.inner) }
      : null;
  }
  return { centre: round.centre, radius, inner, wall: inner - opening, hole };
}

/** A screw-in lid as `screwInPlan` works it out, in the frame where z is up and the body's rim is at `top`. */
export type ScrewInPlan = {
  centre: Point;
  /** How far the body's outer face reaches from the axis at most: the lid's plate is as large. */
  radius: number;
  /** How near the opening's face comes to the axis: the thread's crest stands the depth further in, the plug the gap. */
  opening: number;
  /** How far the opening's face lies from the axis at most: the thread in the body starts a little beyond it, in the wall. */
  openingFar: number;
  /** How far the thread in the body reaches into its wall, from `openingFar`. */
  reach: number;
  /** Where the thread starts: the height the plug's end reaches down to when screwed in. */
  from: number;
  pitch: number;
  depth: number;
  crest: number;
  /** How far the plug reaches from the axis, between the body's thread: the opening less the gap. */
  plugRadius: number;
  /** The hole in the plug, its wall inside the thread's root; 0 where the plug stays solid. */
  holeRadius: number;
};

/**
 * A screw-in lid for a round body (Discussion #1432), the other way round from `screwPlan`: the thread inside the body's
 * opening, like a nut's, and the lid a plate as large as the body, lying on its rim, with a plug below it that has the
 * same thread outside and screws into it, the gap further in. The thread is added inside the wall, standing in from the
 * opening's face, not cut into it: the wall keeps its strength, a thin one takes it as well as a thick one, and the
 * body's outside stays as it is; the opening is the thread's depth narrower over its height. The body must be round as
 * for a screw lid, from the rim down to where the thread starts (the pitch times the turns below the top), and so must
 * its opening, round the same middle, with SCREW_MIN_WALL of wall where it is thinnest. The opening must go on
 * SCREW_FLOOR below the plug's end, so the plug stays clear of a floor, and be wide enough for a plug SCREW_IN_MIN_PLUG
 * across at its thread's root. The plug is a ring with the lid's wall inside its thread's root, SCREW_MIN_WALL at least,
 * where the hole that leaves is SCREW_IN_MIN_HOLE across or more, and solid where it is not. The gap may be at most half
 * the thread's depth, as for a screw lid.
 */
export function screwInPlan(sliceAt: LidSlicer, options: LidOptions, top: number, bottom: number, rim: number): ScrewInPlan | { error: LidError } {
  const thread = lidThread(options);
  if (options.gap > thread.depth / 2 + 1e-9) return { error: { code: "screwGapDeep", gap: Math.floor((thread.depth / 2) * 100 + 1e-6) / 100 } };
  const from = top - thread.height;
  const height = Math.round(thread.height * 10) / 10;
  if (from < bottom + SCREW_FLOOR) return { error: { code: "screwTooLow", height } };
  const body = roundBody(sliceAt, rim, from + 0.05);
  if (!body) return { error: { code: "screwInNotRound" } };
  // The plug's end stays SCREW_FLOOR above a floor: below it, the opening is still there.
  if (!sliceAt(Math.max(from - SCREW_FLOOR, bottom + 0.01)).opening.length) return { error: { code: "screwInShallow", height } };
  if (!body.hole) return { error: { code: "screwInNotRound" } };
  if (body.wall < SCREW_MIN_WALL - 1e-9) return { error: { code: "screwThinWall" } };
  const opening = body.hole.inner;
  const plugRadius = opening - options.gap;
  const root = plugRadius - thread.depth;
  if (2 * root < SCREW_IN_MIN_PLUG - 1e-9) {
    return { error: { code: "screwInSmallOpening", diameter: Math.ceil((SCREW_IN_MIN_PLUG + 2 * (options.gap + thread.depth)) * 10 - 1e-6) / 10 } };
  }
  const hole = root - Math.max(options.wall, SCREW_MIN_WALL);
  return {
    centre: body.centre, radius: body.radius, opening, openingFar: body.hole.radius, reach: Math.min(SCREW_REACH, body.wall / 2), from,
    pitch: thread.pitch, depth: thread.depth, crest: thread.crest, plugRadius, holeRadius: 2 * hole >= SCREW_IN_MIN_HOLE - 1e-9 ? hole : 0,
  };
}

/** The round body as `roundBody` finds it. */
type RoundBody = { centre: Point; radius: number; inner: number; wall: number };

/** How far the farthest point of these contours lies from `centre`: 0 for none. */
function farthestFrom(polygons: readonly (readonly Point[])[], centre: Point) {
  return polygons.flat().reduce((farthest, [x, y]) => Math.max(farthest, Math.hypot(x - centre[0], y - centre[1])), 0);
}

/**
 * Where the straight wall ends under a rim that is rounded or chamfered, outside, inside or both (Discussion #1426): a
 * vessel revolved from a stroke with round ends has such a rim, and so has a pot whose top edge was filleted. Its ring
 * seen from above is narrower than the wall's: the outline smaller, the opening larger. Two heights SHOULDER_STEP apart are
 * compared further and further down, SHOULDER_STEP under the rim and twice as far each time, until they are as large
 * within SHOULDER_FLAT, outside and inside: there is the straight wall, as large as the lower of them. Between it and the
 * last height above still in the rounding, the highest height whose outline comes within SHOULDER_FULL of the wall's,
 * outside and inside, found to SHOULDER_PRECISION: there the rounding begins. Null where there is none: the rim is no
 * round outline or as large as the wall (a rim that flares out is one too, and `roundBody` refuses it from there), or no
 * straight wall is found down to `lowest` or the opening's bottom.
 */
function rimShoulder(sliceAt: LidSlicer, rim: number, lowest: number): number | null {
  const atRim = sliceAt(rim);
  const round = roundOutline(atRim.outline);
  if (!round) return null;
  const size = (z: number) => {
    const level = z === rim ? atRim : sliceAt(z);
    const here = roundOutline(level.outline, round.centre);
    return here && level.opening.length ? { outer: here.outer, opening: farthestFrom(level.opening, round.centre) } : null;
  };
  const rimSize = size(rim);
  if (!rimSize) return null;
  // The last height known to lie in the rounding.
  let above = rim;
  for (let depth = SHOULDER_STEP; rim - depth - SHOULDER_STEP >= lowest; depth *= 2) {
    const high = size(rim - depth);
    const wall = size(rim - depth - SHOULDER_STEP);
    if (!high || !wall) return null;
    if (Math.abs(high.outer - wall.outer) <= SHOULDER_FLAT && Math.abs(high.opening - wall.opening) <= SHOULDER_FLAT) {
      const full = (here: { outer: number; opening: number } | null) => here !== null && here.outer >= wall.outer - SHOULDER_FULL && here.opening <= wall.opening + SHOULDER_FULL;
      if (full(rimSize)) return null;
      let lower = rim - depth - SHOULDER_STEP;
      let upper = above;
      while (upper - lower > SHOULDER_PRECISION) {
        const middle = (lower + upper) / 2;
        if (full(size(middle))) lower = middle;
        else upper = middle;
      }
      return lower;
    }
    above = rim - depth;
  }
  return null;
}

/**
 * The round body a screw lid's thread or a bayonet's lugs go on, `reach` down from the top of its straight wall, and that
 * top (`wallTop`): as `roundBody` finds it from the rim down, with a wall of at least `minWall`; or else, under a rim
 * rounded or chamfered (`rimShoulder`), the same from where the rounding begins (Discussion #1426). What is refused says
 * why: not round, a wall too thin, or a rounding that leaves too little straight wall below it, down to `lowest`.
 */
function roundWall(sliceAt: LidSlicer, top: number, rim: number, reach: number, lowest: number, minWall: number):
  { body: RoundBody; wallTop: number } | { error: "notRound" | "thinWall" | "rimRound" } {
  const atRim = roundBody(sliceAt, rim, top - reach + 0.05);
  if (atRim && atRim.wall >= minWall - 1e-9) return { body: atRim, wallTop: top };
  const shoulder = rimShoulder(sliceAt, rim, lowest);
  if (shoulder === null) return { error: atRim ? "thinWall" : "notRound" };
  if (shoulder - reach < lowest) return { error: "rimRound" };
  const below = roundBody(sliceAt, shoulder, shoulder - reach + 0.05);
  if (!below) return { error: "notRound" };
  if (below.wall < minWall - 1e-9) return { error: "thinWall" };
  return { body: below, wallTop: shoulder };
}

/** A bayonet lid as `bayonetPlan` works it out, in the frame where z is up and the body's rim is at `top`. */
export type BayonetPlan = {
  centre: Point;
  /** How far the body's outer face reaches from the axis at most: the lugs stand out from it, the cap keeps the gap. */
  radius: number;
  /** How near it comes: the lugs start a little inside it. */
  inner: number;
  /** How far the lugs reach into the wall, from `inner`. */
  reach: number;
  /** Where the lugs' middles are with the cap locked, in degrees anticlockwise from the x axis seen from above. */
  angles: number[];
  /**
   * How far the cap turns clockwise from where it goes down over the lugs to where it is locked, in degrees: as the lugs
   * give, or as set by hand and held to what fits.
   */
  turn: number;
  /** How far a lug stands out of the wall, and how wide it is along it at its outer face. */
  height: number;
  width: number;
  /**
   * In degrees round the axis: half a lug, half a slot (the entry play wider each side), and how far the stop lies past
   * the locked lug; each play is kept where the cap's ring begins, nearest the axis, so it is no less anywhere.
   */
  half: number;
  slotHalf: number;
  stop: number;
  /** With a detent: how far from the axis the rib's round has its middle, and how far behind the locked lug, in degrees. */
  rib: { middle: number; behind: number } | null;
  /** The height of a lug's top, and of the bottom of its outer face, where its underside starts. */
  lugTop: number;
  lugLow: number;
  /** Where the cap's mouth is: the height its rim reaches down to. */
  from: number;
  /**
   * How high the straight wall reaches, which the lugs' tops stay LUG_TOP_INSET below: the top, or under a rim rounded or
   * chamfered where the rounding begins (Discussion #1426). The cap's plate rests on the top all the same.
   */
  wallTop: number;
  /** How far the cap's rim reaches from the axis: the lugs, the gap and the wall. */
  capRadius: number;
};

/**
 * A bayonet lid for a round body (Discussion #1424), a twist lock as on a lamp's bulb or a camera's lens: lugs on the
 * outside of the body's top, and a cap whose rim has an L-shaped slot inside for each. The cap goes down with its slots
 * over the lugs and is turned clockwise; a ledge in its rim then lies under each lug and holds the cap down, a stop
 * at the slot's end ends the turn, and a rib behind the lug keeps it there.
 * The body must be round from the rim down as far as the cap reaches (`bayonetDepth`), as for a screw lid, with a wall of
 * at least BAYONET_MIN_WALL; below the cap, SCREW_FLOOR of it stays. The lugs are sized from its diameter
 * (`bayonetLugSize`) and stand out of the wall, reaching into it as a screw lid's thread does, their tops LUG_TOP_INSET
 * below the rim, their outer faces as tall as they stand out and their undersides sloping at 45 degrees into the wall, so
 * the body prints upright without support. The ledge under them slopes alike, the axial gap lower; with
 * BAYONET_MIN_LEDGE of it below, that is how far the cap must reach down at least. The gap may be at most half a lug's
 * height, so the ledge still reaches under the lugs by as much as it keeps from them.
 * The turn is `bayonetTurn` for the lugs: the first lug at the front (the least y), the others evenly round. A lug is
 * narrowed to what the turn leaves past its slot (the slot's play, the rib with the gap before it, and
 * BAYONET_LEDGE_MARGIN); one narrower than MIN_LUG_WIDTH refuses the body for so many lugs. The stop after it is then
 * always a few millimetres long at least, for the turn is at most a third of the way to the next lug.
 * A turn set by hand (`bayonetTurn` in the options) is held to what fits round this body, in whole degrees: at least
 * what leaves a lug MIN_LUG_WIDTH wide, and at most what leaves BAYONET_MIN_STOP of the ring between the stop and the
 * next lug's slot - each lug's slot, its turn, the lug and the stop's gap take the rest of the way to the next lug. So
 * the slots never run into each other, and the rib and the stop go with the turn as they go with the lugs' own.
 * Under a rim rounded or chamfered (Discussion #1426), the lugs go below the rounding as below a square rim there, the
 * cap's rim reaching `bayonetDepth` down the straight wall from where it begins (`roundWall`), and over the rounding.
 */
export function bayonetPlan(sliceAt: LidSlicer, options: LidOptions, top: number, bottom: number, rim: number): BayonetPlan | { error: LidError } {
  const depth = options.bayonetDepth;
  if (top - depth < bottom + SCREW_FLOOR) return { error: { code: "bayonetTooLow", height: Math.round(depth * 10) / 10 } };
  const found = roundWall(sliceAt, top, rim, depth, bottom + SCREW_FLOOR, BAYONET_MIN_WALL);
  if ("error" in found) return { error: found.error === "notRound" ? { code: "bayonetNotRound" } : found.error === "thinWall" ? { code: "bayonetThinWall" } : { code: "bayonetRimRound", height: Math.round(depth * 10) / 10 } };
  const { centre, radius, inner, wall } = found.body;
  const wallTop = found.wallTop;
  const from = wallTop - depth;
  const size = bayonetLugSize(2 * radius);
  const height = size.height;
  const gap = options.gap;
  if (gap > height / 2 + 1e-9) return { error: { code: "bayonetGapDeep", gap: Math.floor((height / 2) * 100 + 1e-6) / 100 } };
  const lugTop = wallTop - LUG_TOP_INSET;
  const lugLow = lugTop - height;
  // The ledge's slope is the axial gap under the lugs' and reaches in to the gap from the wall, height lower than out at
  // the lugs' outer faces.
  const needed = wallTop - (lugLow - options.bayonetAxialGap + gap - height - BAYONET_MIN_LEDGE);
  if (depth < needed - 1e-9) return { error: { code: "bayonetShallow", depth: Math.ceil(needed * 10 - 1e-6) / 10 } };
  const count = options.bayonetLugs;
  // Round the axis, in radians: the lugs' outer faces at `outer`, the cap's ring from `inside` out to its rim's inner face.
  const outer = radius + height;
  const inside = radius + gap;
  const rimInside = outer + gap;
  const entry = BAYONET_ENTRY_PLAY / inside;
  const stop = gap / inside;
  // The rib's round stands `detent` past the gap into the lugs' way; it lies behind the locked lug so that the lug's
  // outer corner keeps the gap from it, and reaches on to where it meets the rim's inner face.
  const detent = options.bayonetDetent;
  const rib = detent > 0 ? (() => {
    const middle = outer - detent + DETENT_RADIUS;
    const behind = Math.acos((outer ** 2 + middle ** 2 - (DETENT_RADIUS + gap) ** 2) / (2 * outer * middle));
    return { middle, behind, far: behind + Math.acos((rimInside ** 2 + middle ** 2 - DETENT_RADIUS ** 2) / (2 * rimInside * middle)) };
  })() : null;
  // A locked lug's back is the turn less its width and the slot's play past the slot; there lie the rib and the margin.
  const lugWidth = (turn: number) => Math.min(size.width, outer * ((turn * Math.PI) / 180 - entry - (rib?.far ?? 0)) - BAYONET_LEDGE_MARGIN);
  const degrees = (radians: number) => (radians * 180) / Math.PI;
  let turn = bayonetTurn(count);
  if (options.bayonetTurn > 0) {
    // What a turn leaves of the ring between the end of a lug's channel and the next lug's slot, where the ring is
    // nearest the axis: the way to the next lug less the turn, the lug, the slot's play and the stop's gap.
    const stopLength = (turn: number) => inside * ((2 * Math.PI) / count - (turn * Math.PI) / 180 - lugWidth(turn) / outer - entry - stop);
    const least = Math.ceil(degrees(entry + (rib?.far ?? 0) + (MIN_LUG_WIDTH + BAYONET_LEDGE_MARGIN) / outer) - 1e-9);
    let most = MAX_BAYONET_TURN;
    while (most > least && stopLength(most) < BAYONET_MIN_STOP - 1e-9) most -= 1;
    if (stopLength(most) < BAYONET_MIN_STOP - 1e-9) return { error: { code: "bayonetNoRoom" } };
    turn = clamp(options.bayonetTurn, least, most);
  }
  const width = lugWidth(turn);
  if (width < MIN_LUG_WIDTH - 1e-9) return { error: { code: "bayonetNoRoom" } };
  const half = degrees(width / 2 / outer);
  return {
    centre, radius, inner, reach: Math.min(SCREW_REACH, wall / 2), angles: Array.from({ length: count }, (_, index) => -90 + (360 * index) / count), turn,
    height, width, half, slotHalf: half + degrees(entry), stop: degrees(stop), rib: rib ? { middle: rib.middle, behind: degrees(rib.behind) } : null,
    lugTop, lugLow, from, wallTop, capRadius: rimInside + options.wall,
  };
}

/**
 * A tether as `tetherPlan` works it out, in the frame where z is up and the body's rim is at `top`: heights, and
 * distances from the axis of the cap it keeps. The rings are where they sit with the cap closed.
 */
export type TetherPlan = {
  centre: Point;
  /** How far the body's outer face reaches from the axis below the cap at most, and how near it comes. */
  radius: number;
  inner: number;
  /** How far the bead reaches into the body's wall, from `inner`. */
  reach: number;
  /** The room a ring keeps round what it turns on, across the radius and along the axis. */
  play: number;
  /** The body's ring: from `neckInner` to `neckOuter` from the axis, from `neckLow` up to `neckHigh`, below the cap. */
  neckInner: number;
  neckOuter: number;
  neckLow: number;
  neckHigh: number;
  /** The bead under it: a flat top at `beadTop` out to `beadOuter`, an upright face down to `beadLow`, then a slope. */
  beadTop: number;
  beadOuter: number;
  beadLow: number;
  /** How far the cap reaches from the axis, and how far into its wall its collar and bead reach (to `capRoot`). */
  capRadius: number;
  capRoot: number;
  /** The collar round the cap's top, from `collarLow` up to the plate's top, standing out as far as the cap's bead. */
  collarLow: number;
  capBeadOuter: number;
  /** The cap's ring: from `capInner` to `capOuter` from the axis, from `capLow` up to `capHigh`, under the collar. */
  capInner: number;
  capOuter: number;
  capLow: number;
  capHigh: number;
  /** The cap's bead below its ring: its crest from `crestLow` to `crestHigh`, both flanks at 45 degrees. */
  crestLow: number;
  crestHigh: number;
  /** How long the strap is between the rings, in whole millimetres. */
  strap: number;
};

/**
 * A tether for a screw or bayonet cap (asked in the Layerling User Group on Facebook), as on a drinks bottle, where the
 * cap stays with the bottle when it is open: one part, two open rings joined by a strap, printed lying flat beside the
 * cap. A hinge does not do for a cap that turns, so each ring turns freely where it sits, and the cap screws or twists
 * on and off as it did without one.
 * - The body's ring goes round it just below the cap's mouth, above a bead round the body: the bead's top is flat, so
 *   the ring does not slide down off it, and its underside slopes into the wall at 45 degrees, as a lug's does, so the
 *   body prints upright without support. Above, the thread or the lugs stand in its way, so it stays on the neck; it goes
 *   on over them, opened a little, or from below over the bead.
 * - The cap's ring goes round the cap under a collar round its top, which stands out as far as a bead below the ring;
 *   the bead's flanks slope at 45 degrees both ways, so the ring snaps over it from the mouth, and the cap, turned over
 *   on its plate, still prints without support. Both reach into the cap's wall, half of it at most, outside the thread
 *   or the bayonet's slots, and above the cap's mouth: a cap whose rim is too short for them is refused.
 * Each ring keeps the play round what it turns on (the lid's gap, TETHER_MIN_PLAY at least), and above and below it
 * (on the cap's bead's slope, 0.7 of it); each bead stands TETHER_HOLD past its ring's inner face. The body must be
 * round, as wide as at its top, and its wall at least SCREW_MIN_WALL thick, as far down as the bead can reach (with the
 * most the bead's slope can need, before the body is known), and SCREW_FLOOR of it must stay below.
 * The strap joins the cap's ring at its lower edge and the body's ring at its upper edge, on the same side. It is as long
 * as the way between them with the cap lifted until its mouth is TETHER_LIFT above the body's rim, where it can tip
 * aside, and TETHER_SLACK more, so the open cap hangs beside the neck; with the cap on it bows out in a loop.
 */
export function tetherPlan(sliceAt: LidSlicer, options: LidOptions, top: number, bottom: number, rim: number, cap: { from: number; capRadius: number }): TetherPlan | { error: LidError } {
  const play = Math.max(options.gap, TETHER_MIN_PLAY);
  const { from, capRadius } = cap;
  const capRoot = capRadius - Math.min(SCREW_REACH, options.wall / 2);
  const capInner = capRadius + play;
  const capBeadOuter = capInner + TETHER_HOLD;
  const collarLow = top + options.thickness - TETHER_COLLAR;
  const capHigh = collarLow - play;
  const capLow = capHigh - TETHER_RING_HEIGHT;
  // The bead's upper flank is the play below the ring where it meets the ring's inner edge.
  const crestHigh = capLow - play - TETHER_HOLD;
  const crestLow = crestHigh - TETHER_BEAD_FACE;
  const capBeadBottom = crestLow - (capBeadOuter - capRoot);
  if (capBeadBottom < from - 1e-9) return { error: { code: "tetherCapShort", depth: Math.ceil((top - capBeadBottom) * 10 - 1e-6) / 10 } };
  const neckHigh = from - play;
  const neckLow = neckHigh - TETHER_RING_HEIGHT;
  const beadTop = neckLow - play;
  const beadLow = beadTop - TETHER_BEAD_FACE;
  // The bead's slope reaches from its outer face (the play and the hold out of the body) into the wall: at most so far.
  const lowest = beadLow - (play + TETHER_HOLD + SCREW_ROUND + SCREW_REACH);
  const noNeck = { error: { code: "tetherNoNeck" as const, length: Math.ceil((from - lowest) * 10 - 1e-6) / 10 } };
  if (lowest < bottom + SCREW_FLOOR) return noNeck;
  const body = roundBody(sliceAt, rim, lowest);
  if (!body) return noNeck;
  if (body.wall < SCREW_MIN_WALL - 1e-9) return { error: { code: "tetherThinWall" } };
  const { centre, radius, inner, wall } = body;
  const neckInner = radius + play;
  const neckOuter = neckInner + TETHER_RING_WIDTH;
  const capOuter = capInner + TETHER_RING_WIDTH;
  // The strap's ends lie in the middle of its thickness, at the rings' outer faces.
  const lifted = capLow + TETHER_STRAP_THICKNESS / 2 + (top - from) + TETHER_LIFT;
  const reach = Math.hypot(capOuter - neckOuter, lifted - (neckHigh - TETHER_STRAP_THICKNESS / 2));
  return {
    centre, radius, inner, reach: Math.min(SCREW_REACH, wall / 2), play,
    neckInner, neckOuter, neckLow, neckHigh, beadTop, beadOuter: neckInner + TETHER_HOLD, beadLow,
    capRadius, capRoot, collarLow, capBeadOuter, capInner, capOuter, capLow, capHigh, crestLow, crestHigh,
    strap: Math.ceil(reach + TETHER_SLACK - 1e-6),
  };
}

/**
 * A flip-top as `flipTopPlan` works it out, in the frame where z is up, round the cap's axis (`centre`): the flap lies in
 * the plate, its top flush with the plate's, its hinge at its back (+y) and its catch at its front. Sizes in mm.
 */
export type FlipTopPlan = {
  centre: Point;
  /** The opening across where it is narrowest, at the plate's underside. */
  opening: number;
  /** The flap's radius at the plate's top; its seat narrows it by FLIP_SEAT at 45 degrees below. */
  radius: number;
  /** How much wider the catch at the flap's front makes it below the seat. */
  catchWidth: number;
  /** How far behind the middle the flap's straight back is at the plate's top, and how far it leans back below the strip. */
  back: number;
  lean: number;
  /** The strip that is the hinge: as wide as the flap's straight back, as long as the room behind it, and how thick. */
  hingeWidth: number;
  hingeLength: number;
  hingeThickness: number;
  /** How far from the axis what is cut out of the plate reaches. */
  reach: number;
};

/**
 * How a flip-top's flap and hinge lie for an opening `opening` mm across with the lid's `gap`, round its middle, in mm:
 * see `flipTopPlan`. The flap's back is far enough back that the plate's top behind the strip is clear of the round
 * opening, the slit under the strip clear of the opening at the plate's underside, and at least FLIP_MIN_BACK of the
 * radius behind the middle; how far everything cut out of the plate reaches grows with the opening.
 */
function flipTopLayout(opening: number, gap: number) {
  const radius = opening / 2 + FLIP_SEAT - gap;
  const lean = (FLIP_HINGE_LENGTH - gap) / 2;
  const back = Math.max(radius + gap * Math.SQRT2 - FLIP_HINGE_LENGTH, opening / 2 + FLIP_BACK_MARGIN - lean - gap, FLIP_MIN_BACK * radius);
  const half = Math.sqrt(radius ** 2 - back ** 2);
  const catchWidth = gap * Math.SQRT2 + gap + FLIP_SNAP;
  // The round opening at the plate's top, the catch's room below the seat, and the slot's back corners at the top.
  const reach = Math.max(radius + gap * Math.SQRT2, opening / 2 + catchWidth, Math.hypot(half + gap, back + FLIP_HINGE_LENGTH));
  return { radius, lean, back, half, catchWidth, reach };
}

/**
 * The thinnest plate a flip-top goes in with this gap, in mm (to a tenth, up): it holds the V under the strip down to the
 * slit, the seat and the catch below it, and the flap under its groove.
 */
export function flipTopThickness(options: Pick<LidOptions, "gap">) {
  const gap = options.gap;
  const needed = Math.max(FLIP_HINGE_THICKNESS + (FLIP_HINGE_LENGTH - gap) / 2, FLIP_SEAT + gap * Math.SQRT2 + gap + FLIP_SNAP, FLIP_GROOVE + FLIP_GROOVE_SKIN);
  return Math.ceil(needed * 10 - 1e-6) / 10;
}

/**
 * A flip-top for a screw or bayonet cap (as on a bottle of shampoo or ketchup): a round opening in the cap's plate, round
 * the cap's axis (`centre`), `flipTopOpening` across at the plate's underside, and a flap that closes it, joined to the
 * plate by a strip that bends as a hinge, so the cap stays on and the flap never comes off.
 * The cap prints on its plate. Whatever stood out of the flap's underside towards the opening - a plug, a ring - would
 * then lie against the bed, however it were hinged: a flap folded over from beside the cap lands upside down on the plate.
 * So the flap is printed where it closes, in the opening itself, flush with the plate's top, the gap round it, and it is
 * its own plug: its edge narrows at 45 degrees for FLIP_SEAT below the top (the seat), so it rests on the plate's edge
 * round the opening and cannot be pushed in; at its front a catch widens it again at 45 degrees below the seat, under the
 * plate's edge, so it clicks shut and stays shut (`catchWidth`: the gap at 45 degrees, the gap it may slide back, and
 * FLIP_SNAP). Every face slopes at 45 degrees or less, so it all prints without support.
 * Its back is straight, `back` behind the middle; the strip, FLIP_HINGE_THICKNESS thick at the plate's top, spans the
 * FLIP_HINGE_LENGTH from there to the plate. Under it flap and plate lean towards each other at 45 degrees, a V down to a
 * slit as wide as the gap, which keeps the flap from sliding back and its catch from slipping out; lifted at its front by
 * a fingernail in the groove across its top, it swings up about the strip, clear of the plate all the way, until it lies
 * on the plate behind the hinge. Nothing is cut through the plate where it rests on the body's rim: everything stays FLIP_RIM_MARGIN inside the
 * body's `opening` round the axis. An error when the plate is too thin for flap and hinge (`flipTopThickness`), or the
 * opening too large for the body (with the largest that fits, in half millimetres), or no opening fits at all.
 */
export function flipTopPlan(options: LidOptions, centre: Point, opening: readonly (readonly Point[])[]): FlipTopPlan | { error: LidError } {
  const thickness = flipTopThickness(options);
  if (options.thickness < thickness - 1e-9) return { error: { code: "flipTopThin", thickness } };
  const room = opening.length && insideOutline(opening, centre) ? nearestOnOutline(opening, centre).distance - FLIP_RIM_MARGIN : 0;
  const layout = flipTopLayout(options.flipTopOpening, options.gap);
  if (layout.reach > room + 1e-9) {
    for (let size = Math.floor(options.flipTopOpening * 2) / 2; size >= MIN_FLIP_TOP_OPENING; size -= 0.5) {
      if (flipTopLayout(size, options.gap).reach <= room + 1e-9) return { error: { code: "flipTopTooLarge", opening: size } };
    }
    return { error: { code: "flipTopNoRoom" } };
  }
  return {
    centre, opening: options.flipTopOpening, radius: layout.radius, catchWidth: layout.catchWidth, back: layout.back, lean: layout.lean,
    hingeWidth: 2 * layout.half, hingeLength: FLIP_HINGE_LENGTH, hingeThickness: FLIP_HINGE_THICKNESS, reach: layout.reach,
  };
}

/**
 * A slide-in lid as `slidePlan` works it out, in the frame where z is up, turned so that the wall it slides in through is
 * at the front (the least y), the body's rim at `top`.
 */
export type SlidePlan = {
  /** The body seen from above at the rim, its outer contours: the lid's end is cut to them, flush with the wall's outside. */
  outline: Point[][];
  /**
   * The opening seen from above at the rim, as its convex hull, anticlockwise: the plate is that, the gap smaller all
   * round, so walls inside the box are cut down under the lid as the front one is.
   */
  opening: Point[];
  /** How thick the thinnest of the three walls with grooves is, and how deep the grooves go into them from their inner faces. */
  wall: number;
  depth: number;
  /** The lid's underside, flat under its plate and tongues alike; and the grooves' floor, the gap lower: the cut wall's top. */
  underside: number;
  floor: number;
};

/** The least and largest x and y of the outlines: [left, front, right, back]. */
function boundsOf(polygons: readonly (readonly Point[])[]): [number, number, number, number] {
  const points = polygons.flat();
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

/** Whether the segments from `a` to `b` and from `c` to `d` cross (touching counts). */
function segmentsCross(a: Point, b: Point, c: Point, d: Point) {
  const side = (p: Point, q: Point, r: Point) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  return side(a, b, c) * side(a, b, d) <= 0 && side(c, d, a) * side(c, d, b) <= 0;
}

/**
 * The thinnest wall between a convex opening (`hull`) and the outline behind the opening's front (`front`, its least y):
 * the least distance from the hull to the outline's edges there, so that neither the wall in front of the opening nor
 * the outline before it counts. 0 where the hull does not lie within the outline: a corner of it outside, an edge of the
 * outline through it (an L-shaped box, two boxes side by side).
 */
export function slideWall(outline: readonly (readonly Point[])[], hull: readonly Point[], front: number) {
  if (hull.some((point) => !insideOutline(outline, point))) return 0;
  let least = Infinity;
  for (const polygon of outline) {
    polygon.forEach((start, index) => {
      const end = polygon[(index + 1) % polygon.length];
      if (start[1] < front && end[1] < front) return;
      // The part of the edge behind the front.
      const behind = (from: Point, to: Point): Point => (from[1] >= front ? from : [from[0] + ((front - from[1]) / (to[1] - from[1])) * (to[0] - from[0]), front]);
      const a = behind(start, end);
      const b = behind(end, start);
      if (hull.some((point, corner) => segmentsCross(a, b, point, hull[(corner + 1) % hull.length]))) least = 0;
      least = Math.min(least, nearestOnOutline([hull], a).distance, nearestOnOutline([hull], b).distance, ...hull.map((point) => nearestOnOutline([[a, b]], point).distance));
    });
  }
  return Number.isFinite(least) ? least : 0;
}

/**
 * A slide-in lid for a box (Discussion #1443), like a wooden pencil box's, worked out with the wall it slides in through
 * at the front (the least y; `sliceAt` gives the body turned so). The lid is a plate in the opening, its top flush with
 * the rim, the gap from the walls; along its sides and back its lower part reaches on into the walls as a tongue, which
 * runs in a groove there. Seen across a wall, the groove has a level floor the gap under the lid's underside, a short
 * upright end, and a top that slopes up at 45 degrees towards the opening, so the body prints upright without support;
 * the tongue is the same, the gap smaller all round: its underside level with the plate's, an upright tip SLIDE_EDGE
 * tall, and its top sloping up at 45 degrees to the plate's edge, so the lid prints turned over on its top. Above the
 * groove the wall keeps SLIDE_LIP at its inner face. The front wall is cut down to the grooves' floor where the lid passes
 * (`slideSolids`), and the lid's end fills that cut.
 * The body must be a box. Its opening is taken as its convex hull, so walls inside it are cut down under the lid too;
 * that must be as wide as it gets from at most a quarter of its length behind its front on to its back, so the walls the
 * lid slides along run straight (rounded corners at the front are filled by the lid's end, and round ones at the back
 * take the grooves round them; a round pot is refused), and lie within the outline. Outline and opening stand upright
 * from the rim down to below the grooves' floor, which the opening must reach. A groove goes SLIDE_MAX_GROOVE into the
 * thinnest of the three walls at most, leaving SLIDE_WALL_KEEP of it, and only as deep as the plate allows with the
 * tongue's tip and the lip above it; a tongue that would reach less than SLIDE_MIN_HOLD past the gap into the wall refuses
 * the body for its walls, or if they are thick enough, for the plate.
 */
export function slidePlan(sliceAt: LidSlicer, options: LidOptions, top: number, rim: number): SlidePlan | { error: LidError } {
  const atRim = sliceAt(rim);
  const points = atRim.opening.flat();
  if (points.length < 3) return { error: { code: "notOpen" } };
  const opening = convexHull(points);
  const gap = options.gap;
  const underside = top - options.thickness;
  const floor = underside - gap;
  const low = sliceAt(floor - SLIDE_BELOW);
  const lowPoints = low.opening.flat();
  if (lowPoints.length < 3) return { error: { code: "slideShallow", depth: Math.ceil((top - floor + SLIDE_BELOW) * 10 - 1e-6) / 10 } };
  const near = (a: readonly number[], b: readonly number[]) => a.every((value, index) => Math.abs(value - b[index]) <= SLIDE_UPRIGHT);
  if (!near(boundsOf([opening]), boundsOf([convexHull(lowPoints)])) || !near(boundsOf(atRim.outline), boundsOf(low.outline))) return { error: { code: "slideNotBox" } };
  const [left, front, right, back] = boundsOf([opening]);
  // How far behind the front the opening first reaches as wide as it gets, on the left and on the right.
  const wideFrom = (x: number) => Math.min(...opening.filter(([px]) => Math.abs(px - x) <= 0.05).map(([, y]) => y));
  if (Math.max(wideFrom(left), wideFrom(right)) - front > (back - front) / 4 + 1e-9) return { error: { code: "slideNotBox" } };
  const wall = slideWall(atRim.outline, opening, front);
  if (wall < 1e-6) return { error: { code: "slideNotBox" } };
  // At the wall's inner face, from the lid's underside up: the tongue's tip, its slope the depth less the gap, and the gap
  // above it upright on the 45 degree slope (the square root of 2 times it) to the groove's top; then the lip.
  const onSlope = gap * (Math.SQRT2 - 1);
  const fromWall = wall - SLIDE_WALL_KEEP;
  const fromPlate = options.thickness - SLIDE_EDGE - onSlope - SLIDE_LIP;
  const tenthUp = (value: number) => Math.ceil(value * 10 - 1e-6) / 10;
  // The walls first: a thicker plate does not help them.
  if (fromWall - gap < SLIDE_MIN_HOLD - SLIDE_MESH_SLACK) return { error: { code: "slideThinWall", wall: tenthUp(gap + SLIDE_MIN_HOLD + SLIDE_WALL_KEEP) } };
  if (fromPlate - gap < SLIDE_MIN_HOLD - SLIDE_MESH_SLACK) return { error: { code: "slideThinLid", thickness: tenthUp(gap + SLIDE_MIN_HOLD + SLIDE_EDGE + onSlope + SLIDE_LIP) } };
  const depth = Math.min(SLIDE_MAX_GROOVE, fromWall, fromPlate);
  return { outline: atRim.outline.map((polygon) => [...polygon]), opening, wall, depth, underside, floor };
}

/**
 * A closed mesh round the up axis through `centre`, `sides` points round, as a Manifold: an outer face through the
 * heights `outer.rows` at `outer.radius(angle, z)` from the axis, and an inner one through `inner.rows`, joined to it by
 * a ring at the bottom (both start at the same height). At the top a ring as well where both end at the same height (a
 * tube), or else a disc closing each: a cup upside down, as a screw lid's cap is, its plate on top. Without an inner
 * face, a disc closes each end of the outer one: a round post, as a screw-in lid's plug too narrow for a hole is. The
 * angle runs anticlockwise seen from above from the x axis; every radius must keep the inner face inside the outer.
 */
function roundMesh(runtime: ManifoldToplevel, centre: Point, sides: number, outer: { rows: readonly number[]; radius: (angle: number, z: number) => number }, inner: { rows: readonly number[]; radius: (angle: number, z: number) => number } | null, created: { delete?: () => void }[]) {
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
  const innerRings = inner ? inner.rows.map((z) => ring(z, inner.radius)) : [];
  for (let row = 0; row + 1 < outerRings.length; row += 1) {
    for (let side = 0; side < sides; side += 1) quad(outerRings[row] + side, outerRings[row] + next(side), outerRings[row + 1] + next(side), outerRings[row + 1] + side);
  }
  for (let row = 0; row + 1 < innerRings.length; row += 1) {
    for (let side = 0; side < sides; side += 1) quad(innerRings[row] + side, innerRings[row + 1] + side, innerRings[row + 1] + next(side), innerRings[row] + next(side));
  }
  const [outerLow, innerLow] = [outerRings[0], innerRings[0]];
  const [outerHigh, innerHigh] = [outerRings[outerRings.length - 1], innerRings[innerRings.length - 1]];
  if (!inner) {
    const floor = point(outer.rows[0]);
    const plate = point(outer.rows[outer.rows.length - 1]);
    for (let side = 0; side < sides; side += 1) {
      triangles.push(floor, outerLow + next(side), outerLow + side);
      triangles.push(plate, outerHigh + side, outerHigh + next(side));
    }
  } else {
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
 *   prints upright without support; at the top it stays SCREW_TOP_INSET below the rim, inside the wall: below where a
 *   rounded rim's rounding begins (`wallTop`), so it stands on the straight wall.
 * - The cap is the plate on the rim and a rim reaching down to where the thread starts, its inside the body's thread
 *   moved the gap further out all round, so the two never meet, its outside the wall further out. Its mouth widens at 45
 *   degrees to clear the thread's crest, so it finds the thread; turned over, it prints on its plate without support.
 * A standard's thread and cap are drawn otherwise (`standardScrewSolids`).
 *   Over a rounded rim its thread goes on up to the plate, the rounding inside it nearer the axis than the wall.
 */
function screwSolids(runtime: ManifoldToplevel, plan: ScrewPlan, options: LidOptions, top: number, created: { delete?: () => void }[]) {
  if (plan.standard !== "own") return standardScrewSolids(runtime, plan, options, top, created);
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
  const to = plan.to;
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

/**
 * A solid that winds round the up axis through `centre` as a thread does, rising `pitch` a turn anticlockwise seen from
 * above, a crest's middle at `top` on the x axis: between `inner` from the axis and `outer(s)`, where s is how far along
 * the axis a point lies from the middle of the nearest crest, -pitch/2 to pitch/2. Its rows of points wind with it, one
 * at each of `corners` (values of s where the profile bends) in every pitch, so the profile is drawn exactly at every
 * angle; rows at fixed heights, as `roundMesh` draws, would cut its corners as they wind past them, by as much as a
 * steep flank falls between two rows. It reaches from below `low` to above `high` by more than a pitch, its two ends
 * winding as well, and is cut to length by the caller. Each sheet's points lie at the same angles, `sides` round.
 */
function windingMesh(runtime: ManifoldToplevel, centre: Point, sides: number, pitch: number, top: number, corners: readonly number[], outer: (s: number) => number, inner: number, low: number, high: number, created: { delete?: () => void }[]) {
  const offsets = Array.from(new Set([-pitch / 2, ...corners.filter((s) => s > -pitch / 2 + 1e-6 && s < pitch / 2 - 1e-6)])).sort((a, b) => a - b);
  const perPitch = offsets.length;
  // The rows, from more than two pitches below `low` to more than one above `high`: where each starts on the x axis and
  // where in the profile it lies.
  const rows: { start: number; s: number }[] = [];
  for (let turn = Math.floor((low - top) / pitch) - 2; turn <= Math.ceil((high - top) / pitch) + 2; turn += 1) {
    for (const s of offsets) rows.push({ start: top + turn * pitch + s, s });
  }
  const count = rows.length;
  const positions: number[] = [];
  for (const radius of [(s: number) => outer(s), () => inner]) {
    for (const row of rows) {
      for (let side = 0; side < sides; side += 1) {
        const angle = (2 * Math.PI * side) / sides;
        const distance = radius(row.s);
        positions.push(centre[0] + distance * Math.cos(angle), centre[1] + distance * Math.sin(angle), row.start + (pitch * side) / sides);
      }
    }
  }
  const at = (sheet: 0 | 1, side: number, row: number) => (sheet * count + row) * sides + side;
  const triangles: number[] = [];
  const outerEdges = new Set<string>();
  const quad = (a: number, b: number, c: number, d: number) => triangles.push(a, b, c, a, c, d);
  for (let row = 0; row + 1 < count; row += 1) {
    for (let side = 0; side < sides; side += 1) {
      // Past the last side the row goes on as the row a pitch higher, at the first side again.
      const last = side === sides - 1;
      if (last && row + 1 + perPitch >= count) continue;
      const corners4 = [[side, row], last ? [0, row + perPitch] : [side + 1, row], last ? [0, row + 1 + perPitch] : [side + 1, row + 1], [side, row + 1]];
      const [a, b, c, d] = corners4.map(([s, r]) => at(0, s, r));
      quad(a, b, c, d);
      [[a, b], [b, c], [c, a], [a, c], [c, d], [d, a]].forEach(([from, to]) => outerEdges.add(`${from},${to}`));
      const [ia, ib, ic, id] = corners4.map(([s, r]) => at(1, s, r));
      quad(ia, id, ic, ib);
    }
  }
  // The edges of the outer sheet that no other triangle of it shares are its two winding ends: a wall joins each to the
  // inner sheet's.
  for (const edge of outerEdges) {
    const [from, to] = edge.split(",").map(Number);
    if (outerEdges.has(`${to},${from}`)) continue;
    quad(from, from + count * sides, to + count * sides, to);
  }
  const mesh = new runtime.Mesh({ numProp: 3, vertProperties: new Float32Array(positions), triVerts: new Uint32Array(triangles) });
  return keep(created, runtime.Manifold.ofMesh(mesh));
}

/**
 * A screw lid's thread and cap with a standard's thread (`standardScrewPlan`), in the frame where z is up, as they sit
 * screwed together. Its flanks are steeper than 45 degrees, so both are drawn as `windingMesh`es, whose rows of points
 * follow the thread round, and cut to shape with the kernel; that keeps the gap square to the flanks to a few thousandths.
 * - The thread on the body (none when the cap is made alone) stands on the standard's neck under it (`base`), the
 *   standard's profile out to its outside, and reaches `reach` into the wall from the body's face; a body a little
 *   thinner than the neck has it filled up to the neck. From `from` to `to` it is cut back at 45 degrees from a hair
 *   inside the body's face at both ends, as the own thread is, so it begins and ends gently.
 * - The cap is the plate on the rim and a rim reaching down to `mouth`, `wall` thick outside the standard's outside and
 *   the gap. Inside, the standard's thread moved the gap away all round, square to the flanks too (`widen`), its ridges
 *   no nearer the axis than `clear`; its mouth widens at 45 degrees to clear the thread's crest, as the own cap's does.
 * Both overhang more than the own thread as they print: the thread's underside on the body, upright, and the ridges'
 * undersides in the cap, turned over, lie at the standard's flank angle.
 */
function standardScrewSolids(runtime: ManifoldToplevel, plan: ScrewPlan, options: LidOptions, top: number, created: { delete?: () => void }[]) {
  const sides = Math.min(512, Math.max(96, 4 * Math.ceil((2 * Math.PI * plan.capRadius) / SCREW_STEP / 4)));
  const gap = options.gap;
  const { pitch, depth, crest, slope, base, widen } = plan;
  // A revolved profile of (distance from the axis, height) points, `sides` round as the winding solids.
  const revolved = (points: [number, number][]) => {
    const profile = keep(created, new runtime.CrossSection([points], "NonZero"));
    return keep(created, keep(created, profile.revolve(sides)).translate([plan.centre[0], plan.centre[1], 0]));
  };
  let thread: ManifoldSolid | null = null;
  if (!plan.neck) {
    const foot = crest / 2 + depth / slope;
    const tooth = (s: number) => base + Math.max(0, depth - Math.max(0, Math.abs(s) - crest / 2) * slope);
    const inner = plan.inner - plan.reach;
    const winding = windingMesh(runtime, plan.centre, sides, pitch, top, [-foot, -crest / 2, crest / 2, foot], tooth, inner, plan.from, plan.to, created);
    // Cut to length, its ends cut back at 45 degrees from a hair inside the body's face, reaching up to a peak halfway.
    const root = plan.inner - SCREW_ROOT_INSET;
    const half = (plan.to - plan.from) / 2;
    const length = revolved([[inner - 1, plan.from], [root, plan.from], [root + half, plan.from + half], [root, plan.to], [inner - 1, plan.to]]);
    thread = keep(created, winding.intersect(length));
  }
  // The cap's inside: the thread's grooves, `widen` wider each side, and its ridges' tips at `clear`.
  const groove = crest / 2 + widen;
  const tip = groove + (base + gap + depth - plan.clear) / slope;
  const inside = (s: number) => Math.max(plan.clear, base + gap + depth - Math.max(0, Math.abs(s) - groove) * slope);
  const core = plan.clear - 0.5;
  const winding = windingMesh(runtime, plan.centre, sides, pitch, top, [-tip, -groove, groove, tip], inside, core, plan.mouth, top, created);
  const outside = base + gap + depth;
  const below = plan.mouth - 1;
  const lip = outside - core;
  const hollow = keep(created, runtime.Manifold.union([
    keep(created, winding.intersect(revolved([[0, below], [plan.capRadius + 1, below], [plan.capRadius + 1, top], [0, top]]))),
    revolved([[0, below], [core + 0.25, below], [core + 0.25, top], [0, top]]),
    // The mouth, widening at 45 degrees from inside the ridges out to clear the crest.
    revolved([[0, below], [outside + 1, below], [core, plan.mouth + lip], [0, plan.mouth + lip]]),
  ]));
  const cap = keep(created, revolved([[0, plan.mouth], [plan.capRadius, plan.mouth], [plan.capRadius, top + options.thickness], [0, top + options.thickness]]).subtract(hollow));
  return { thread, cap };
}

/**
 * The two parts of a screw-in lid, in the frame where z is up, as they sit screwed together: the thread in the body and
 * the lid. Drawn as `screwSolids` draws a screw lid's, on the same points, the same right-hand thread turned inside out:
 * the lid goes down as it is turned clockwise seen from above.
 * - The thread in the body is a ring reaching `reach` into the wall beyond the opening's face, to be grouped with the
 *   body. Its crest stands the depth in from the opening's face; its flanks run at 45 degrees on out to its root, a hair
 *   inside the wall, so no face of it lies on the opening's. At both ends it is cut back at 45 degrees towards the root,
 *   so it begins and ends gently and the body prints upright without support, the thread's undersides sloping at 45
 *   degrees; at the top it stays SCREW_TOP_INSET below the rim.
 * - The lid is a plate as large as the body, lying on the rim, and a plug below it down to where the thread starts, its
 *   outside the body's thread moved the gap further in all round, so the two never meet: a nut's bolt. Its end narrows
 *   at 45 degrees to clear the thread's crest, so it finds the thread. It is a ring with a hole up to the plate, or
 *   solid where the hole would be too narrow. Turned over, the lid prints on its plate with the plug standing up,
 *   without support.
 */
function screwInSolids(runtime: ManifoldToplevel, plan: ScrewInPlan, options: LidOptions, top: number, created: { delete?: () => void }[]) {
  const sides = Math.min(512, Math.max(96, 4 * Math.ceil((2 * Math.PI * plan.radius) / SCREW_STEP / 4)));
  const step = plan.pitch / SCREW_ROWS_PER_PITCH;
  // How far the crest stands in at this angle and height, as on a screw lid's thread: the depth on the crest, less along
  // the flanks; below 0 in the root.
  const crestHeight = (angle: number, z: number) => {
    const turns = (z - top) / plan.pitch - angle / (2 * Math.PI);
    const along = Math.abs(turns - Math.round(turns)) * plan.pitch;
    return plan.depth - Math.max(0, along - plan.crest / 2);
  };
  const root = plan.openingFar + SCREW_ROOT_INSET;
  const to = top - SCREW_TOP_INSET;
  const thread = roundMesh(runtime, plan.centre, sides, { rows: [plan.from, to], radius: () => plan.openingFar + plan.reach }, {
    rows: rowsFrom(plan.from, to, step),
    radius: (angle, z) => Math.min(root, Math.max(plan.opening - crestHeight(angle, z), root - (z - plan.from), root - (to - z))),
  }, created);
  // The plug reaches up into the plate by half its thickness, so the two are one.
  const into = top + options.thickness / 2;
  const plug = roundMesh(runtime, plan.centre, sides, {
    rows: rowsFrom(plan.from, into, step),
    radius: (angle, z) => plan.plugRadius - Math.max(0, crestHeight(angle, z), plan.depth - (z - plan.from)),
  }, plan.holeRadius > 0 ? { rows: [plan.from, into], radius: () => plan.holeRadius } : null, created);
  const plate = keep(created, keep(created, runtime.Manifold.cylinder(options.thickness, plan.radius, plan.radius, sides)).translate([plan.centre[0], plan.centre[1], top]));
  return { thread, lid: keep(created, plate.add(plug)) };
}

/**
 * The two parts of a bayonet lid, in the frame where z is up, as they sit locked: the lugs for the body and the cap.
 * Each is a profile seen from the side (distance from the axis, height) turned about the axis, with a point every
 * SCREW_STEP or so round the cap, so the faces that come close keep their gap everywhere.
 * - Each lug stands from `reach` inside the wall out to `height` beyond it: a flat top, an outer face as tall as the lug
 *   stands out, and an underside at 45 degrees from that face's bottom back into the wall, so the body prints upright
 *   without support. All the lugs are one solid, to be grouped with the body.
 * - The cap is its plate on the rim and a rim reaching down to `from`, the gap outside the lugs, `wall` thick, with a
 *   ring inside it down to the cap's mouth that comes within the gap of the body's wall: there it is a collar that keeps
 *   the cap straight, its inner edge cut back at 45 degrees at the mouth. In the ring, for each lug, a slot from the mouth
 *   up to the plate, the entry play wider than the lug each side, and from it a channel the lug turns in, clockwise as
 *   the cap closes, ending the gap past the locked lug in the ring's full height: the stop. The channel's floor is the
 *   ledge, sloping at 45 degrees as the lug's underside does, the axial gap lower; turned over, the cap prints on its
 *   plate without support, the ledge an overhang of 45 degrees and every other face upright or level.
 * - With a detent, a round rib on the rim's inner face, standing upright from the ledge to the plate, just behind each
 *   locked lug, the gap behind it: it reaches the detent past the gap into the lug's way.
 */
function bayonetSolids(runtime: ManifoldToplevel, plan: BayonetPlan, options: LidOptions, top: number, created: { delete?: () => void }[]) {
  const sides = Math.min(512, Math.max(96, 4 * Math.ceil((2 * Math.PI * plan.capRadius) / SCREW_STEP / 4)));
  // A profile of (distance from the axis, height) points turned about the body's axis from `start` degrees on by
  // `degrees`, anticlockwise seen from above: the profile's x is the distance, its y the height.
  const turned = (points: [number, number][], start: number, degrees: number) => {
    const profile = keep(created, new runtime.CrossSection([points], "NonZero"));
    const solid = keep(created, profile.revolve(Math.max(2, Math.ceil((sides * degrees) / 360)), degrees));
    return keep(created, keep(created, solid.rotate([0, 0, start])).translate([plan.centre[0], plan.centre[1], 0]));
  };
  const unionOf = (solids: ManifoldSolid[]) => (solids.length === 1 ? solids[0] : keep(created, runtime.Manifold.union(solids)));
  const gap = options.gap;
  const outer = plan.radius + plan.height;
  const inside = plan.radius + gap;
  const rimInside = outer + gap;
  const half = plan.half;
  const root = plan.inner - plan.reach;
  const lugs = unionOf(plan.angles.map((angle) => turned([[root, plan.lugTop], [root, plan.lugLow - (outer - root)], [outer, plan.lugLow], [outer, plan.lugTop]], angle - half, 2 * half)));
  // The ledge's slope at a distance from the axis: the lugs' underside, the axial gap lower.
  const ledge = (distance: number) => plan.lugLow - options.bayonetAxialGap + (distance - outer);
  const ring = turned([[inside, top], [inside, plan.from + BAYONET_MOUTH], [inside + BAYONET_MOUTH, plan.from], [plan.capRadius, plan.from], [plan.capRadius, top]], 0, 360);
  // The slot a lug goes down through, and the channel it turns in: from the slot's middle, inside the slot, to the stop
  // past the locked lug. The slot reaches a little further into the rim, so the two never share a face there.
  const cuts = plan.angles.flatMap((angle) => {
    const slot = angle - plan.turn;
    return [
      turned([[inside - 1, plan.from - 1], [rimInside + SLOT_EXTRA, plan.from - 1], [rimInside + SLOT_EXTRA, top + 1], [inside - 1, top + 1]], slot - plan.slotHalf, 2 * plan.slotHalf),
      turned([[inside - 1, ledge(inside - 1)], [rimInside, ledge(rimInside)], [rimInside, top + 1], [inside - 1, top + 1]], slot, plan.turn + half + plan.stop),
    ];
  });
  const plate = turned([[0, top], [plan.capRadius, top], [plan.capRadius, top + options.thickness], [0, top + options.thickness]], 0, 360);
  const parts = [keep(created, ring.subtract(unionOf(cuts))), plate];
  const { rib } = plan;
  if (rib) {
    // Upright, so it prints as it stands on the plate; kept to the channel, reaching DETENT_OVERLAP into the cap round it.
    const ribs = plan.angles.map((angle) => {
      const at = ((angle - half - rib.behind) * Math.PI) / 180;
      const disc = keep(created, keep(created, runtime.CrossSection.circle(DETENT_RADIUS, 48)).translate([plan.centre[0] + rib.middle * Math.cos(at), plan.centre[1] + rib.middle * Math.sin(at)]));
      return keep(created, keep(created, disc.extrude(top - plan.from + 2)).translate([0, 0, plan.from - 1]));
    });
    const room = turned([[inside, ledge(inside) - DETENT_OVERLAP], [rimInside + DETENT_OVERLAP, ledge(rimInside + DETENT_OVERLAP) - DETENT_OVERLAP], [rimInside + DETENT_OVERLAP, top + DETENT_OVERLAP], [inside, top + DETENT_OVERLAP]], 0, 360);
    parts.push(keep(created, unionOf(ribs).intersect(room)));
  }
  return { lugs, cap: keep(created, runtime.Manifold.union(parts)) };
}

/**
 * The two parts of a slide-in lid, in the frame where z is up, turned as `slidePlan` works it out (the wall it slides in
 * through at the front, the least y): the lid where it sits closed, and the cut for the body. Each is made of pieces that
 * are convex, each swept towards the front, out past the body: the hull of it where it is and moved that far.
 * - The lid: its plate, the opening the gap smaller all round, from its underside up to the rim; under it the tongue, the
 *   plate grown by the grooves' depth (round at the corners, so its 45 degree top is a cone there and nowhere flatter),
 *   SLIDE_EDGE upright, then sloping in at 45 degrees to the plate's edge. Swept to the front, the plate fills the cut in
 *   the front wall and the tongue the grooves' ends there; cut to the outline, its end is flush with the wall's outside.
 * - The cut: the same, the gap larger all round (the opening itself, and grown by the grooves' depth; each SLIDE_HAIR
 *   larger still), from the grooves' floor up past the rim. Within the walls it is the grooves; swept to the front, it cuts the front wall down to the
 *   floor where the lid passes, and walls inside the box under the lid. It ends a millimetre in front of the body.
 * - With click bumps, one bump under the lid's end, in the middle across, just behind the front wall's inner face: a piece
 *   of a ball standing the gap and `clickBumpHeight` out of the underside, the gap from the wall's top inner edge. To come
 *   out, the lid must go up over that edge, which the plate gives by bending a little, and in it clicks back down. The
 *   ball is at least as large as it stands out, so it narrows all the way and prints on the lid turned over.
 * - With a finger notch, SLIDE_GRIP_GROOVES grooves across the plate's top near its end, at 45 degrees to both sides, so
 *   they print on the plate without support; with a pull tab, the tab on its end, as thick as the plate.
 */
function slideSolids(runtime: ManifoldToplevel, plan: SlidePlan, options: LidOptions, top: number, created: { delete?: () => void }[]):
  | { lid: ManifoldSolid; cuts: ManifoldSolid; bumps: number }
  | { error: LidError } {
  const gap = options.gap;
  const { underside, floor, depth } = plan;
  const opening = keep(created, new runtime.CrossSection([plan.opening as [number, number][]], "Positive"));
  const plate = keep(created, opening.offset(-gap, "Miter", 2, 48));
  const tongue = keep(created, plate.offset(depth, "Round", 2, 48));
  // The cut's: the opening, and grown by the grooves' depth, each a hair larger.
  const room = keep(created, opening.offset(SLIDE_HAIR, "Round", 2, 48));
  const groove = keep(created, room.offset(depth, "Round", 2, 48));
  const outline = keep(created, new runtime.CrossSection(plan.outline as [number, number][][], "Positive"));
  const outlineFront = outline.bounds().min[1];
  const grooveBounds = groove.bounds();
  // Far enough that every piece, its back included, comes out past the body's front.
  const along = grooveBounds.max[1] - outlineFront + 2;
  // A convex piece given as areas at heights, swept to the front: the hull of their corners where they are and moved.
  const swept = (levels: readonly (readonly [CrossSection, number])[]) => {
    const points: [number, number, number][] = [];
    for (const [area, z] of levels) {
      for (const polygon of area.toPolygons()) for (const [x, y] of polygon) points.push([x, y, z], [x, y - along, z]);
    }
    return keep(created, runtime.Manifold.hull(points));
  };
  // An area standing upright from `low` to `high`, swept to the front. It starts SLIDE_HAIR down inside the sloping piece
  // under it: the hull may leave out a corner of an arc that is all but straight, and where the two met level it left a
  // ledge too thin to see.
  const sweptUpright = (area: CrossSection, low: number, high: number) => {
    const reach = keep(created, runtime.CrossSection.hull([area, keep(created, area.translate([0, -along]))]));
    return keep(created, keep(created, reach.extrude(high - low + SLIDE_HAIR)).translate([0, 0, low - SLIDE_HAIR]));
  };
  // The tongue's tip, and where its slope meets the plate's edge; the groove's end, the gap upright on the slope taller,
  // and where its slope meets the wall's inner face.
  const tip = underside + SLIDE_EDGE;
  const shoulder = tip + depth;
  const grooveEnd = floor + SLIDE_EDGE + gap * Math.SQRT2;
  const ceiling = grooveEnd + depth;
  const column = keep(created, keep(created, outline.extrude(top - floor + 2)).translate([0, 0, floor - 1]));
  let lid = keep(created, keep(created, runtime.Manifold.union([swept([[tongue, underside], [tongue, tip], [plate, shoulder]]), sweptUpright(plate, shoulder, top)])).intersect(column));
  const front = keep(created, keep(created, runtime.Manifold.cube([grooveBounds.max[0] - grooveBounds.min[0] + 2, grooveBounds.max[1] - outlineFront + 2, top - floor + 3])).translate([grooveBounds.min[0] - 1, outlineFront - 1, floor - 1]));
  const cuts = keep(created, keep(created, runtime.Manifold.union([swept([[groove, floor], [groove, grooveEnd], [room, ceiling]]), sweptUpright(room, ceiling, top + 1)])).intersect(front));
  const openingBounds = opening.bounds();
  const middle = (openingBounds.min[0] + openingBounds.max[0]) / 2;
  let bumps = 0;
  if (options.clickBumps) {
    const inner = frontAt([plan.opening], middle) ?? openingBounds.min[1];
    const height = options.clickBumpHeight;
    const radius = Math.max(BUMP_RADIUS, gap + height);
    const centre: [number, number, number] = [middle, inner + Math.sqrt((radius + gap) ** 2 - (radius - height) ** 2), underside + radius - gap - height];
    const ball = keep(created, keep(created, runtime.Manifold.sphere(radius, BUMP_SIDES)).translate(centre));
    // What stands out of the underside, reaching FACE_HAIR into the plate, so the two are one.
    const below = keep(created, keep(created, runtime.Manifold.cube([2 * radius + 2, 2 * radius + 2, 2 * radius + 2])).translate([centre[0] - radius - 1, centre[1] - radius - 1, underside + FACE_HAIR - 2 * radius - 2]));
    lid = keep(created, lid.add(keep(created, ball.intersect(below))));
    bumps = 1;
  }
  if (options.handle === "notch") {
    const plateBounds = plate.bounds();
    const width = Math.min(SLIDE_GRIP_WIDTH, plateBounds.max[0] - plateBounds.min[0] - 4);
    const grip = Math.min(SLIDE_GRIP_DEPTH, options.thickness / 3);
    const pitch = 2 * grip + 1;
    const first = (frontAt(plan.outline, middle) ?? outlineFront) + SLIDE_GRIP_START;
    if (width < MIN_SLIDE_GRIP_WIDTH || first + SLIDE_GRIP_GROOVES * pitch > plateBounds.max[1] - SLIDE_GRIP_START) return { error: { code: "handleSideShort" } };
    // Each a (y, z) profile drawn out along x over the grip's width: extruded along its own z, then turned so that z runs
    // along x (its x becomes -z, its y stays y).
    const grooves = Array.from({ length: SLIDE_GRIP_GROOVES }, (_, index) => {
      const y = first + grip + index * pitch;
      const points: [number, number][] = [[y - grip - 1, top + 1], [y, top - grip], [y + grip + 1, top + 1]];
      const profile = keep(created, new runtime.CrossSection([points.map(([py, pz]): [number, number] => [-pz, py])], "NonZero"));
      return keep(created, keep(created, keep(created, profile.extrude(width)).rotate([0, 90, 0])).translate([middle - width / 2, 0, 0]));
    });
    lid = keep(created, lid.subtract(keep(created, runtime.Manifold.union(grooves))));
  } else if (options.handle === "tab") {
    // On the lid's end, as thick as the plate: the plate as it reaches the front, seen from above.
    const reach = keep(created, keep(created, runtime.CrossSection.hull([plate, keep(created, plate.translate([0, -along]))])).intersect(outline));
    const tab = pullTabArea(runtime, reach, created);
    if ("error" in tab) return { error: tab.error };
    lid = keep(created, lid.add(keep(created, keep(created, tab.area.extrude(options.thickness)).translate([0, 0, underside]))));
  }
  return { lid, cuts, bumps };
}

/**
 * The pieces of a tether, in the frame where z is up: the bead for the body (to be grouped with it) and the collar and
 * bead for the cap (to be joined to it), each a profile turned about the axis as a bayonet's cap is, as they sit with the
 * cap closed; and the tether itself as it is printed, lying flat with its lowest face at 0: the cap's ring, the strap
 * along x, then the body's ring, the cap's ring's middle at its outer radius in x and y. The strap lies along the bottom
 * of the rings, its ends reaching in to their inner faces; each ring's opening is on the side away from the strap.
 * Mounted, the cap's ring keeps that face down and the body's is turned over, so the strap leaves both on the same side,
 * from the cap's ring's lower edge to the body's ring's upper edge.
 */
function tetherSolids(runtime: ManifoldToplevel, plan: TetherPlan, options: LidOptions, top: number, created: { delete?: () => void }[]) {
  const sides = (radius: number) => Math.min(512, Math.max(96, 4 * Math.ceil((2 * Math.PI * radius) / SCREW_STEP / 4)));
  const turned = (points: [number, number][], radius: number) => {
    const profile = keep(created, new runtime.CrossSection([points], "NonZero"));
    return keep(created, keep(created, profile.revolve(sides(radius), 360)).translate([plan.centre[0], plan.centre[1], 0]));
  };
  const root = plan.inner - plan.reach;
  const bead = turned([[root, plan.beadTop], [root, plan.beadLow - (plan.beadOuter - root)], [plan.beadOuter, plan.beadLow], [plan.beadOuter, plan.beadTop]], plan.beadOuter);
  const plateTop = top + options.thickness;
  const slope = plan.capBeadOuter - plan.capRoot;
  const collar = turned([[plan.capRoot, plan.collarLow], [plan.capBeadOuter, plan.collarLow], [plan.capBeadOuter, plateTop], [plan.capRoot, plateTop]], plan.capBeadOuter);
  const capBead = turned([[plan.capRoot, plan.crestLow - slope], [plan.capBeadOuter, plan.crestLow], [plan.capBeadOuter, plan.crestHigh], [plan.capRoot, plan.crestHigh + slope]], plan.capBeadOuter);
  const capMiddle: Point = [plan.capOuter, plan.capOuter];
  const neckMiddle: Point = [2 * plan.capOuter + plan.strap + plan.neckOuter, plan.capOuter];
  const disc = (radius: number, [x, y]: Point) => keep(created, keep(created, runtime.CrossSection.circle(radius, sides(radius))).translate([x, y]));
  const box = (x0: number, x1: number, y: number, width: number) => keep(created, keep(created, runtime.CrossSection.square([x1 - x0, width])).translate([x0, y - width / 2]));
  const holes = keep(created, runtime.CrossSection.union([disc(plan.capInner, capMiddle), disc(plan.neckInner, neckMiddle)]));
  const openings = keep(created, runtime.CrossSection.union([
    box(capMiddle[0] - plan.capOuter - 1, capMiddle[0] - plan.capInner + 1, capMiddle[1], TETHER_SLOT),
    box(neckMiddle[0] + plan.neckInner - 1, neckMiddle[0] + plan.neckOuter + 1, neckMiddle[1], TETHER_SLOT),
  ]));
  const rings = keep(created, keep(created, keep(created, runtime.CrossSection.union([disc(plan.capOuter, capMiddle), disc(plan.neckOuter, neckMiddle)])).subtract(holes)).subtract(openings));
  const strap = keep(created, box(capMiddle[0], neckMiddle[0], capMiddle[1], TETHER_STRAP_WIDTH).subtract(holes));
  const part = keep(created, runtime.Manifold.union([keep(created, rings.extrude(TETHER_RING_HEIGHT)), keep(created, strap.extrude(TETHER_STRAP_THICKNESS))]));
  return { bead, collar, capBead, part };
}

/**
 * A flip-top's parts, in the frame where z is up, the cap's plate from `top` to its thickness above, as `flipTopPlan`
 * lays them out:
 * - `cut`, what comes out of the plate: round the flap the gap further out (at 45 degrees along its seat and its catch,
 *   and level with the seat's foot below), and behind it the slot the strip spans, the plate's side of the V under it;
 * - `flap`, lying in it: its seat, the catch round its front, its straight back with the flap's side of the V, and a
 *   groove across its top for a fingernail, upright at the front and sloping at 45 degrees behind;
 * - `strip`, the hinge, at the plate's top from a millimetre inside the flap to a millimetre inside the plate.
 */
function flipTopSolids(runtime: ManifoldToplevel, plan: FlipTopPlan, options: LidOptions, top: number, created: { delete?: () => void }[]) {
  const [x, y] = plan.centre;
  const gap = options.gap;
  const high = top + options.thickness;
  // Every turned part has its points at the same angles round the axis, a point every FLIP_STEP or so, so flap and plate
  // keep their gap between the points too.
  const sides = Math.min(512, Math.max(128, 4 * Math.ceil((2 * Math.PI * (plan.radius + 2)) / FLIP_STEP / 4)));
  const step = 360 / sides;
  // A profile of (distance from the axis, height) points turned about the axis from `start` degrees on to `end`,
  // anticlockwise seen from above, both whole steps.
  const turned = (points: [number, number][], start: number, end: number) => {
    const profile = keep(created, new runtime.CrossSection([points], "NonZero"));
    const solid = keep(created, profile.revolve(Math.round((end - start) / step), end - start));
    return keep(created, keep(created, solid.rotate([0, 0, start])).translate([x, y, 0]));
  };
  // A profile of (y, height) points drawn out along x from `from` to `to`: x of the profile becomes y, its y the height.
  const alongX = (from: number, to: number, points: [number, number][]) => {
    const profile = keep(created, new runtime.CrossSection([points], "NonZero"));
    return keep(created, keep(created, profile.extrude(to - from)).transform([0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, from, 0, 0, 1]));
  };
  const box = (from: [number, number, number], to: [number, number, number]) =>
    keep(created, keep(created, runtime.Manifold.cube([to[0] - from[0], to[1] - from[1], to[2] - from[2]])).translate(from));
  const shank = plan.radius - FLIP_SEAT;
  const foot = high - FLIP_SEAT;
  const catchWidth = plan.catchWidth;
  const slope = gap * Math.SQRT2;
  const strip = FLIP_HINGE_THICKNESS;
  const back = y + plan.back;
  const lean = plan.lean;
  const half = plan.hingeWidth / 2;
  const reach = plan.radius + 5;
  // The catch round the front, the least y (-90 degrees round the axis); its room reaches the gap and a little more past
  // its ends.
  const catchFrom = step * Math.round((-90 - FLIP_CATCH_HALF) / step);
  const catchTo = step * Math.round((-90 + FLIP_CATCH_HALF) / step);
  const ends = (((gap + 0.05) / shank) * 180) / Math.PI;
  const flapRound = turned([[0, top], [shank, top], [shank, foot], [plan.radius, high], [0, high]], 0, 360);
  const flapCatch = turned([[shank - 0.2, top], [shank + catchWidth, top], [shank + catchWidth, foot - catchWidth], [shank, foot], [shank - 0.2, foot]], catchFrom, catchTo);
  // Behind its middle the flap is as wide as its straight back all the way down, and its back stops where the V begins:
  // upright through the strip, then leaning back at 45 degrees, then upright again.
  const flapBack = box([x - half, y, top], [x + half, back + lean + 1, high]);
  const behind = alongX(x - reach, x + reach, [[y - reach, top - 1], [back + lean, top - 1], [back + lean, high - strip - lean], [back, high - strip], [back, high + 1], [y - reach, high + 1]]);
  let flap = keep(created, keep(created, runtime.Manifold.union([flapRound, flapCatch, flapBack])).intersect(behind));
  // The groove for a fingernail: across the flap, at FLIP_GROOVE_AT of its radius in front of its middle, ending
  // FLIP_GROOVE_SKIN inside the flap's edge below the seat.
  const grooveAt = y - FLIP_GROOVE_AT * plan.radius;
  const grooveHalf = Math.sqrt(Math.max(0, (shank - FLIP_GROOVE_SKIN) ** 2 - (FLIP_GROOVE_AT * plan.radius) ** 2));
  if (grooveHalf > 0.5) flap = keep(created, flap.subtract(alongX(x - grooveHalf, x + grooveHalf, [[grooveAt, high + 1], [grooveAt, high - FLIP_GROOVE], [grooveAt + FLIP_GROOVE + 1, high + 1]])));
  const roundRoom = turned([[0, top - 1], [shank + gap, top - 1], [shank + gap, foot - slope + gap], [plan.radius + slope + 1, high + 1], [0, high + 1]], 0, 360);
  const catchRoom = turned([[shank, foot], [shank + slope, foot], [shank + catchWidth + gap, foot - catchWidth - gap + slope], [shank + catchWidth + gap, top - 1], [shank, top - 1]], step * Math.floor((catchFrom - ends) / step), step * Math.ceil((catchTo + ends) / step));
  const slot = alongX(x - half - gap, x + half + gap, [[y - gap, top - 1], [back + lean + gap, top - 1], [back + lean + gap, high - strip - lean], [back + FLIP_HINGE_LENGTH, high - strip], [back + FLIP_HINGE_LENGTH, high + 1], [y - gap, high + 1]]);
  return {
    cut: keep(created, runtime.Manifold.union([roundRoom, catchRoom, slot])),
    flap,
    strip: box([x - half, back - 1, high - strip], [x + half, back + FLIP_HINGE_LENGTH + 1, high]),
  };
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
 * how wide the cap is across, in mm; which thread it is, and for a standard's cap made alone (no thread, `capOnly`) why.
 * A screw-in lid's (`inside`) the same, with the thread inside the body's opening, how wide the plug is across its
 * thread, and whether the plug is a ring (`hollow`); a cap never is.
 * `rimRounding` is how far down a rounded or chamfered rim reaches, 0 for a square one: the thread sits that much lower, on the
 * straight wall, and the cap reaches that much further down (Discussion #1426).
 */
export type LidScrew = { thread: ManifoldSolid | null; pitch: number; turns: number; depth: number; diameter: number; standard: LidThreadStandard; capOnly: LidCapOnly | null; inside: boolean; hollow: boolean; rimRounding: number };

/**
 * A bayonet lid's: the lugs for the body (one solid, to be grouped with it, in the scene's frame), how many, how far the
 * cap turns to lock in degrees, how far a lug stands out and how wide it is, and how wide the cap is across, in mm;
 * `rimRounding` as for a screw lid.
 */
export type LidBayonet = { lugs: ManifoldSolid; count: number; turn: number; height: number; width: number; diameter: number; rimRounding: number };

/**
 * A slide-in lid's: the cut for the body (the grooves and where its wall is cut down, one solid to cut out of it, in the
 * scene's frame), the side the lid slides in through, how deep the grooves go into the walls and how thick the thinnest
 * of those is, in mm, and how many click bumps the lid has (one, or none).
 */
export type LidSlide = { cuts: ManifoldSolid; side: LidHingeSide; depth: number; wall: number; bumps: number };

/**
 * With a tether: the tether itself, lying flat beside the cap, and the bead for the body, standing where it goes (to be
 * grouped with it), both in the scene's frame; how long its strap is, and how wide its rings are inside, the body's
 * (`neckRing`) and the cap's (`capRing`), in mm.
 */
export type LidTether = { part: ManifoldSolid; bead: ManifoldSolid; strap: number; neckRing: number; capRing: number };

/**
 * A flip-top's (part of the cap, nothing for the body): the opening across, the flap across at the plate's top, and the
 * strip that is its hinge, how wide, long and thick, in mm.
 */
export type LidFlipTop = { opening: number; flap: number; hingeWidth: number; hingeLength: number; hingeThickness: number };

export type LidResult = { lid: ManifoldSolid; magnets?: LidMagnets; hinge?: LidHinge; clickBumps?: LidClickBumps; handle?: LidHandleResult; screw?: LidScrew; bayonet?: LidBayonet; slide?: LidSlide; tether?: LidTether; flipTop?: LidFlipTop } | { error: LidError };

/**
 * The lid for `body` (in the scene's frame, y up), lying turned over beside it: its plate on the workplane at the
 * height of the body's bottom, the lip or rim pointing up. With magnets, also the pockets the body needs, and the posts
 * for the corners where its wall is too thin to hold one (both in the scene's frame, where the body stands). A screw
 * lid comes with the thread for the body, standing where it goes (a screw-in lid's in the body's opening), a bayonet lid with its lugs, a slide-in lid with the grooves and the cut wall to take out of the body; with a tether, also its
 * bead for the body, and the tether lying beside the cap.
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
    // A standard's cap is made to the standard whatever the body: a stand-in for a bottle from the shop may be solid.
    const standardCap = options.type === "screw" && options.threadStandard !== "own";
    if (options.type !== "flat" && !hasOpening && !standardCap) return { error: { code: "notOpen" } };
    // A screw lid's rim and a screw-in lid's plug reach down as far as their thread does, a bayonet's by its own depth, not by `depth`; a slide-in lid has neither lip nor rim.
    if (options.type !== "flat" && options.type !== "screw" && options.type !== "screwIn" && options.type !== "bayonet" && options.type !== "slide" && options.depth >= height) return { error: { code: "tooShallow" } };
    // A screw lid holds by its thread alone, screwed on or in, and a bayonet lid by its lugs, all turned to close.
    if (!lidTakesExtras(options) && (options.magnets || options.hinge || options.clickBumps || options.handle !== "none")) return { error: { code: options.type === "bayonet" ? "bayonetExtras" : "screwExtras" } };
    // A slide-in lid holds in its grooves and slides out: no rim under its plate for magnets, nor a side to hinge on.
    if (!lidTakesMagnets(options) && lidTakesExtras(options) && (options.magnets || options.hinge)) return { error: { code: "slideExtras" } };
    // A tether keeps a cap that is turned off the body.
    if (options.tether && !lidTetherFits(options)) return { error: { code: "tetherType" } };
    // A flip-top's flap opens in a cap that stays on.
    if (options.flipTop && !lidFlipTopFits(options)) return { error: { code: "flipTopType" } };
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
    // A screw lid: the cap, and the thread for the body beside it; a screw-in lid: the plate with its plug, and the thread
    // for the body's opening; a bayonet lid: the cap, and the lugs for the body; a slide-in lid: the lid, and the cut for the body.
    let screw: { plan: ScrewPlan; thread: ManifoldSolid | null } | null = null;
    let screwIn: { plan: ScrewInPlan; thread: ManifoldSolid } | null = null;
    let bayonet: { plan: BayonetPlan; lugs: ManifoldSolid } | null = null;
    let slide: { plan: SlidePlan; cuts: ManifoldSolid; bumps: number } | null = null;
    const sliceAt: LidSlicer = (z) => {
      const cut = keep(created, up.slice(z));
      const around = filled(runtime, cut, created);
      return { outline: around.toPolygons() as Point[][], opening: keep(created, around.subtract(cut)).toPolygons() as Point[][] };
    };
    if (options.type === "screw") {
      const plan = screwPlan(sliceAt, options, top, box.min[2], rim);
      if ("error" in plan) return { error: plan.error };
      const solids = screwSolids(runtime, plan, options, top, created);
      parts.push(solids.cap);
      screw = { plan, thread: solids.thread };
    } else if (options.type === "screwIn") {
      const plan = screwInPlan(sliceAt, options, top, box.min[2], rim);
      if ("error" in plan) return { error: plan.error };
      const solids = screwInSolids(runtime, plan, options, top, created);
      parts.push(solids.lid);
      screwIn = { plan, thread: solids.thread };
    } else if (options.type === "bayonet") {
      const plan = bayonetPlan(sliceAt, options, top, box.min[2], rim);
      if ("error" in plan) return { error: plan.error };
      const solids = bayonetSolids(runtime, plan, options, top, created);
      parts.push(solids.cap);
      bayonet = { plan, lugs: solids.lugs };
    } else if (options.type === "slide") {
      // Worked out with the wall it slides in through at the front, then turned back: the side's turn to the back, and
      // half a turn more.
      const slideTurn = (HINGE_SIDE_TURN[options.slideSide] + 180) % 360;
      const turnedSlice: LidSlicer = (z) => {
        const level = sliceAt(z);
        return { outline: turnedPolygons(level.outline, slideTurn), opening: turnedPolygons(level.opening, slideTurn) };
      };
      const plan = slidePlan(turnedSlice, options, top, rim);
      if ("error" in plan) return { error: plan.error };
      const solids = slideSolids(runtime, plan, options, top, created);
      if ("error" in solids) return { error: solids.error };
      const back = (solid: ManifoldSolid) => (slideTurn ? keep(created, solid.rotate([0, 0, -slideTurn])) : solid);
      parts.push(back(solids.lid));
      slide = { plan, cuts: back(solids.cuts), bumps: solids.bumps };
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
    // A tether: the collar and the bead its ring sits between are joined to the cap; the bead for the body comes with it.
    let tether: { plan: TetherPlan; bead: ManifoldSolid; part: ManifoldSolid } | null = null;
    const turnedCap = screw?.plan ?? bayonet?.plan;
    if (options.tether && turnedCap) {
      const plan = tetherPlan(sliceAt, options, top, box.min[2], rim, turnedCap);
      if ("error" in plan) return { error: plan.error };
      const solids = tetherSolids(runtime, plan, options, top, created);
      parts.push(solids.collar, solids.capBead);
      tether = { plan, bead: solids.bead, part: solids.part };
    }
    let made = parts.length === 1 ? parts[0] : keep(created, runtime.Manifold.union(parts));
    // A flip-top: the opening and the flap's room cut out of the cap's plate, the flap and its hinge put in.
    let flipTop: FlipTopPlan | null = null;
    const capPlan = screw?.plan ?? bayonet?.plan;
    if (options.flipTop && capPlan) {
      const plan = flipTopPlan(options, capPlan.centre, opening.toPolygons() as Point[][]);
      if ("error" in plan) return { error: plan.error };
      const solids = flipTopSolids(runtime, plan, options, top, created);
      made = keep(created, keep(created, made.subtract(solids.cut)).add(keep(created, runtime.Manifold.union([solids.flap, solids.strip]))));
      flipTop = plan;
    }
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
        // before the plugs; each plug is that square HINGE_PIN_GRIP smaller all round (as thick as a piece of filament, a
        // little thicker for a printed pin's roomier hole), so it sits tight and cannot turn, and its outer end is cut to the
        // body's outline, flush with it.
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
    // A finger notch's recess, its footprint seen from above and its heights: the click bumps keep clear of it. A slide-in
    // lid has its own tab, grip and bump (`slideSolids`).
    let notch: { solid: ManifoldSolid; area: CrossSection; low: number; high: number } | null = null;
    if (options.handle === "tab" && !slide) {
      // In the plate, as thick as it, so the lid still prints turned over without support.
      const plate = keep(created, (options.type === "plug" || options.type === "flat" ? outline : outer).rotate(handleTurn));
      const tab = pullTabArea(runtime, plate, created);
      if ("error" in tab) return { error: tab.error };
      made = keep(created, made.add(handleUnturned(prism(tab.area, top, top + options.thickness))));
    } else if (options.handle === "notch" && !slide) {
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
    if (options.clickBumps && !slide) {
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
    // How wide the cap is across: its rim, or with a tether its collar.
    const capWidth = (capRadius: number) => 2 * (tether ? tether.plan.capBeadOuter : capRadius);
    let screwResult: LidScrew | undefined;
    if (screw) {
      const thread = screw.thread ? screw.thread.transform(UP_TO_SCENE) : null;
      if (thread) handed.add(thread);
      const { plan } = screw;
      screwResult = { thread, pitch: plan.pitch, turns: plan.turns, depth: plan.depth, diameter: capWidth(plan.capRadius), standard: plan.standard, capOnly: plan.neck, inside: false, hollow: false, rimRounding: top - plan.wallTop };
    }
    if (screwIn) {
      const thread = screwIn.thread.transform(UP_TO_SCENE);
      handed.add(thread);
      const { plan } = screwIn;
      screwResult = { thread, pitch: plan.pitch, turns: options.threadTurns, depth: plan.depth, diameter: 2 * plan.plugRadius, inside: true, hollow: plan.holeRadius > 0, standard: "own", capOnly: null, rimRounding: 0 };
    }
    let bayonetResult: LidBayonet | undefined;
    if (bayonet) {
      const lugs = bayonet.lugs.transform(UP_TO_SCENE);
      handed.add(lugs);
      const { plan } = bayonet;
      bayonetResult = { lugs, count: plan.angles.length, turn: plan.turn, height: plan.height, width: plan.width, diameter: capWidth(plan.capRadius), rimRounding: top - plan.wallTop };
    }
    const flipTopResult: LidFlipTop | undefined = flipTop
      ? { opening: flipTop.opening, flap: 2 * flipTop.radius, hingeWidth: flipTop.hingeWidth, hingeLength: flipTop.hingeLength, hingeThickness: flipTop.hingeThickness }
      : undefined;
    // The tether lies in a row of its own beside the cap, beyond its back edge, as a printed hinge pin does.
    let tetherResult: LidTether | undefined;
    if (tether) {
      const placedBox = placed.boundingBox();
      const laid = keep(created, tether.part.translate([placedBox.min[0], placedBox.max[1] + PIN_SPACING, box.min[2]]));
      const part = laid.transform(UP_TO_SCENE);
      const bead = tether.bead.transform(UP_TO_SCENE);
      handed.add(part);
      handed.add(bead);
      const { plan } = tether;
      tetherResult = { part, bead, strap: plan.strap, neckRing: 2 * plan.neckInner, capRing: 2 * plan.capInner };
    }
    let slideResult: LidSlide | undefined;
    if (slide) {
      const cuts = slide.cuts.transform(UP_TO_SCENE);
      handed.add(cuts);
      slideResult = { cuts, side: options.slideSide, depth: slide.plan.depth, wall: slide.plan.wall, bumps: slide.bumps };
    }
    const extras = { ...(hinge ? { hinge } : {}), ...(clickBumps ? { clickBumps } : {}), ...(handle ? { handle } : {}), ...(screwResult ? { screw: screwResult } : {}), ...(bayonetResult ? { bayonet: bayonetResult } : {}), ...(slideResult ? { slide: slideResult } : {}), ...(tetherResult ? { tether: tetherResult } : {}), ...(flipTopResult ? { flipTop: flipTopResult } : {}) };
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
    case "screwRimRound":
      return t("lid.error.screwRimRound", { height: error.height.toLocaleString(numberLocale()) });
    case "screwGapDeep":
      return t("lid.error.screwGapDeep", { gap: error.gap.toLocaleString(numberLocale()) });
    case "screwStandardGapDeep":
      return t("lid.error.screwStandardGapDeep", { gap: error.gap.toLocaleString(numberLocale()) });
    case "screwStandardTooLow":
      return t("lid.error.screwStandardTooLow", { standard: LID_THREAD_STANDARD_SPECS[error.standard].name, height: error.height.toLocaleString(numberLocale()) });
    case "screwStandardNeck": {
      const thread = lidStandardThread(error.standard);
      return t("lid.error.screwStandardNeck", { standard: thread.name, neck: thread.minor.toLocaleString(numberLocale()), depth: error.depth.toLocaleString(numberLocale()) });
    }
    case "screwInNotRound":
      return t("lid.error.screwInNotRound");
    case "screwInShallow":
      return t("lid.error.screwInShallow", { height: error.height.toLocaleString(numberLocale()) });
    case "screwInSmallOpening":
      return t("lid.error.screwInSmallOpening", { diameter: error.diameter.toLocaleString(numberLocale()) });
    case "bayonetExtras":
      return t("lid.error.bayonetExtras");
    case "bayonetNotRound":
      return t("lid.error.bayonetNotRound");
    case "bayonetThinWall":
      return t("lid.error.bayonetThinWall", { wall: BAYONET_MIN_WALL.toLocaleString(numberLocale()) });
    case "bayonetTooLow":
      return t("lid.error.bayonetTooLow", { height: error.height.toLocaleString(numberLocale()) });
    case "bayonetRimRound":
      return t("lid.error.bayonetRimRound", { height: error.height.toLocaleString(numberLocale()) });
    case "bayonetGapDeep":
      return t("lid.error.bayonetGapDeep", { gap: error.gap.toLocaleString(numberLocale()) });
    case "bayonetShallow":
      return t("lid.error.bayonetShallow", { depth: error.depth.toLocaleString(numberLocale()) });
    case "bayonetNoRoom":
      return t("lid.error.bayonetNoRoom");
    case "slideExtras":
      return t("lid.error.slideExtras");
    case "slideNotBox":
      return t("lid.error.slideNotBox");
    case "slideThinWall":
      return t("lid.error.slideThinWall", { wall: error.wall.toLocaleString(numberLocale()) });
    case "slideThinLid":
      return t("lid.error.slideThinLid", { thickness: error.thickness.toLocaleString(numberLocale()) });
    case "slideShallow":
      return t("lid.error.slideShallow", { depth: error.depth.toLocaleString(numberLocale()) });
    case "tetherType":
      return t("lid.error.tetherType");
    case "tetherThinWall":
      return t("lid.error.tetherThinWall", { wall: SCREW_MIN_WALL.toLocaleString(numberLocale()) });
    case "tetherNoNeck":
      return t("lid.error.tetherNoNeck", { length: error.length.toLocaleString(numberLocale()) });
    case "tetherCapShort":
      return t("lid.error.tetherCapShort", { depth: error.depth.toLocaleString(numberLocale()) });
    case "flipTopType":
      return t("lid.error.flipTopType");
    case "flipTopThin":
      return t("lid.error.flipTopThin", { thickness: error.thickness.toLocaleString(numberLocale()) });
    case "flipTopTooLarge":
      return t("lid.error.flipTopTooLarge", { opening: error.opening.toLocaleString(numberLocale()) });
    case "flipTopNoRoom":
      return t("lid.error.flipTopNoRoom", { opening: MIN_FLIP_TOP_OPENING.toLocaleString(numberLocale()) });
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

/**
 * With a screw lid, the thread for the body (grouped with it, as the hinge's knuckles are) and its sizes, in mm; with a
 * standard's thread, which, and null for the thread when the cap is made alone (`capOnly` says why).
 * A screw-in lid's (`inside`) is the thread for its opening, the plug's size and whether it is hollow.
 */
export type LidShapeScrew = { thread: WorkplaneShape | null; pitch: number; turns: number; depth: number; diameter: number; standard: LidThreadStandard; capOnly: LidCapOnly | null; inside: boolean; hollow: boolean; rimRounding: number };

/** With a bayonet lid, the lugs for the body (one mesh, grouped with it as a screw lid's thread is), the turn and the sizes. */
export type LidShapeBayonet = { lugs: WorkplaneShape; count: number; turn: number; height: number; width: number; diameter: number; rimRounding: number };

/**
 * With a slide-in lid, the cut for the body (a hole grouped with it, as a flush hinge's slots are), the side the lid slides
 * in through, the grooves' depth and the thinnest wall they are in, and how many click bumps the lid has.
 */
export type LidShapeSlide = { cuts: WorkplaneShape; side: LidHingeSide; depth: number; wall: number; bumps: number };

/**
 * With a tether, the tether (a body of its own beside the cap, as a hinge pin printed apart is) and the bead for the body
 * (grouped with it, as the thread is), the strap's length and the rings' inner diameters, in mm.
 */
export type LidShapeTether = { part: WorkplaneShape; bead: WorkplaneShape; strap: number; neckRing: number; capRing: number };

export type LidShapeResult = { lid: WorkplaneShape; magnets?: LidShapeMagnets; hinge?: LidShapeHinge; clickBumps?: LidShapeClickBumps; handle?: LidShapeHandle; screw?: LidShapeScrew; bayonet?: LidShapeBayonet; slide?: LidShapeSlide; tether?: LidShapeTether; flipTop?: LidFlipTop } | { lid: null; error: string };

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
    if (result.screw?.thread) created.push(result.screw.thread);
    if (result.bayonet) created.push(result.bayonet.lugs);
    if (result.slide) created.push(result.slide.cuts);
    if (result.tether) created.push(result.tether.part, result.tether.bead);
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
      const thread = result.screw.thread ? splitShapeFromWorldPositions(source, positionsOf(result.screw.thread.getMesh()), createLocalId(`${source.id}-thread`), t("lid.screwThreadName", { name: source.name })) : null;
      if (result.screw.thread && !thread) return { lid: null, error: lidErrorMessage({ code: "empty" }) };
      const { pitch, turns, depth, diameter, standard, capOnly, inside, hollow, rimRounding } = result.screw;
      screw = { thread: thread ? canonicalizeShape({ ...thread, hidden: false }) : null, pitch, turns, depth, diameter, standard, capOnly, inside, hollow, rimRounding };
    }
    let bayonet: LidShapeBayonet | undefined;
    if (result.bayonet) {
      const lugs = splitShapeFromWorldPositions(source, positionsOf(result.bayonet.lugs.getMesh()), createLocalId(`${source.id}-lugs`), t("lid.bayonetLugsName", { name: source.name }));
      if (!lugs) return { lid: null, error: lidErrorMessage({ code: "empty" }) };
      const { count, turn, height, width, diameter, rimRounding } = result.bayonet;
      bayonet = { lugs: canonicalizeShape({ ...lugs, hidden: false }), count, turn, height, width, diameter, rimRounding };
    }
    let tether: LidShapeTether | undefined;
    if (result.tether) {
      const part = splitShapeFromWorldPositions(source, positionsOf(result.tether.part.getMesh()), createLocalId(`${source.id}-tether`), t("lid.tetherName", { name: source.name }));
      const bead = splitShapeFromWorldPositions(source, positionsOf(result.tether.bead.getMesh()), createLocalId(`${source.id}-tether-bead`), t("lid.tetherBeadName", { name: source.name }));
      if (!part || !bead) return { lid: null, error: lidErrorMessage({ code: "empty" }) };
      const { strap, neckRing, capRing } = result.tether;
      tether = { part: canonicalizeShape({ ...part, hidden: false }), bead: canonicalizeShape({ ...bead, hidden: false }), strap, neckRing, capRing };
    }
    let slide: LidShapeSlide | undefined;
    if (result.slide) {
      const cuts = holeShape(result.slide.cuts, "slide-grooves", t("lid.slideGroovesName", { name: source.name }));
      if (!cuts) return { lid: null, error: lidErrorMessage({ code: "empty" }) };
      const { side, depth, wall, bumps } = result.slide;
      slide = { cuts, side, depth, wall, bumps };
    }
    const extras = { ...(hinge ? { hinge } : {}), ...(clickBumps ? { clickBumps } : {}), ...(handle ? { handle } : {}), ...(screw ? { screw } : {}), ...(bayonet ? { bayonet } : {}), ...(slide ? { slide } : {}), ...(tether ? { tether } : {}), ...(result.flipTop ? { flipTop: result.flipTop } : {}) };
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
