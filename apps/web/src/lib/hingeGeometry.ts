import * as THREE from "three";
import { toCreasedNormals } from "@/lib/creasedNormals";
import type { WorkplaneShape } from "@/types/layerling";
import { automaticSideCount, roundSideCount } from "@/lib/roundSideCount";

/*
 * Das druckbare Scharnier (print-in-place): zwei Blaetter, die flach
 * aufgeklappt auf der Platte liegen, abwechselnde Knoechel auf der Achse und
 * ein Stift, der mit dem ersten Blatt verwachsen ist und mit Spiel durch die
 * Knoechel des zweiten laeuft. Gedruckt wird es in einem Stueck und bewegt
 * sich danach.
 *
 * Breite ist die Laenge entlang der Achse (x), Tiefe beide Blaetter zusammen
 * (z, Blatt A hinten bei -z, Blatt B vorn bei +z), Hoehe der Durchmesser der
 * Knoechel. Die Blaetter liegen unten (y = 0) mit ihrer Staerke. Knoechel
 * Nummer 0, 2, 4 ... gehoeren zu A, 1, 3 ... zu B; die Zahl ist ungerade, so
 * sitzt A an beiden Enden und haelt den Stift.
 *
 * Damit die Teile nicht verwachsen, hat B um den Stift eine Bohrung mit
 * Spiel, zwischen den Knoecheln bleibt ein Spalt in Spielbreite, und jedes
 * Blatt endet unter den Knoecheln des anderen um das Spiel vor ihnen. Die
 * Blattstaerke ist so begrenzt, dass ein Blatt unter der Bohrung bleibt.
 *
 * Die Blaetter koennen Schraubenloecher tragen, gerade oder oben angesenkt
 * (oben ist die Seite, die beim Zuklappen zum anderen Blatt zeigt), und ihre
 * aeusseren Ecken koennen gerundet sein.
 *
 * Abnehmbar (Fahnenscharnier) hat es zwei Knoechel: Der untere traegt den
 * Stift bis ans Ende, der obere ist eine Huelse, die man nach oben abzieht.
 * Statt Senkungen koennen die Schraubenloecher Sechskant-Taschen fuer Muttern
 * haben, auf beiden Blaettern oder auf B allein.
 *
 * Statt zweier Blaetter gibt es auch Finger: Jeder Knoechel traegt seinen
 * eigenen, so breit wie er, und die Finger beider Seiten wechseln sich ab wie
 * zwei Kaemme. Keiner liegt unter einem Knoechel der anderen Seite, so klappt
 * das Scharnier ganz herum; mit Kegeln duerfen die Finger so dick sein wie der
 * Knoechel und liegen zugeklappt in einer Ebene. Die Finger einer Seite haengen
 * nicht aneinander: Sie werden mit dem Modell verbunden, etwa Kasten und Deckel.
 */

export const DEFAULT_HINGE_WIDTH = 40;
export const DEFAULT_HINGE_DEPTH = 40;
export const DEFAULT_HINGE_HEIGHT = 8;
export const DEFAULT_HINGE_KNUCKLES = 5;
export const DEFAULT_HINGE_PIN_DIAMETER = 3;
export const DEFAULT_HINGE_LEAF_THICKNESS = 2;
export const DEFAULT_HINGE_CLEARANCE = 0.4;
export const MIN_HINGE_KNUCKLES = 3;
export const MAX_HINGE_KNUCKLES = 15;
/** With a knuckle width given the count follows it, up to this many. */
export const MAX_HINGE_KNUCKLES_BY_WIDTH = 31;
export const MIN_HINGE_CLEARANCE = 0.1;
export const MAX_HINGE_CLEARANCE = 1;
export const MAX_HINGE_ANGLE = 180;
const MIN_LEAF = 0.4;
const MIN_KNUCKLE_LENGTH = 1;
/** The cone hinge needs a cone at least this big to hold; knuckles that are too short for it are made fewer. */
const MIN_CONE_RADIUS = 0.8;
/** A wall at least this thick stays in a knuckle between the two recesses. */
const CONE_WALL = 0.4;
export const DEFAULT_HINGE_SCREW_DIAMETER = 3.5;
export const MIN_HINGE_SCREW_DIAMETER = 1;
export const MAX_HINGE_SCREW_DIAMETER = 12;
export const MAX_HINGE_SCREW_HOLES = 6;
/** A screw hole keeps at least this much leaf to the edge, a rounded corner, the knuckles and the next hole. */
const SCREW_WALL = 0.5;
/** A countersink leaves at least this much straight hole below it. */
const MIN_SCREW_SHAFT = 0.2;
/** The exact cutters reach this far past both faces of the leaf, so no face of the cut lies on one of the leaf's. */
const SCREW_OVERCUT = 0.05;
/** A nut's pocket is this much wider across the flats than the nut, so it goes in. */
const NUT_PLAY = 0.3;
/** Under a nut's pocket this much leaf stays; a pocket that would be shallower than MIN_NUT_DEPTH is left out. */
const NUT_FLOOR = 0.6;
const MIN_NUT_DEPTH = 0.4;
export const MAX_HINGE_NUT_WIDTH = 40;

export type HingeStyle = "pin" | "pinless" | "cone" | "liftOff";

/**
 * The hinge's style (#907): a printed pin through the knuckles (default), a bore for a pin of one's own ("pinless", which
 * `hingePinless` used to switch on and still does for designs that have it), cones on every other knuckle nesting into the
 * others, or lift-off: two knuckles, the lower one carrying the pin to the end, the upper one a sleeve that lifts off it.
 */
export function normalizeHingeStyle(value?: string, pinless?: boolean): HingeStyle {
  if (value === "cone" || value === "pinless" || value === "pin" || value === "liftOff") return value;
  return pinless === true ? "pinless" : "pin";
}

/**
 * What the screw holes are on top: countersunk at 90 degrees, straight, a hexagonal pocket for a nut, or a countersink on
 * leaf A and a nut's pocket on leaf B. Left out, `hingeScrewCountersink` decides, as it did before the nuts.
 */
export type HingeScrewHead = "countersunk" | "straight" | "nut" | "countersunkNut";

export function normalizeHingeScrewHead(value?: string, countersink?: boolean): HingeScrewHead {
  if (value === "countersunk" || value === "straight" || value === "nut" || value === "countersunkNut") return value;
  return countersink === false ? "straight" : "countersunk";
}

/** Across the flats of the nut for a hole this wide, with play: M2 to M8 by the standard sizes, larger ones in proportion. */
export function hingeNutWidthFor(holeDiameter: number) {
  const sizes = [[2.6, 4], [3.2, 5], [3.9, 5.5], [4.9, 7], [5.9, 8], [7, 10], [9, 13]];
  const size = sizes.find(([hole]) => holeDiameter < hole);
  return (size ? size[1] : 1.6 * holeDiameter) + NUT_PLAY;
}

/** A nut's width across the flats in mm; 0 or left out takes it from the hole's diameter. Always wider than the hole. */
export function normalizeHingeNutWidth(value: number | undefined, holeDiameter: number) {
  return Number.isFinite(value) && (value as number) > 0 ? clamp(value as number, holeDiameter + 0.6, MAX_HINGE_NUT_WIDTH) : hingeNutWidthFor(holeDiameter);
}

/** Whether the hinge is made of parts the CAD kernel knows (boxes, cylinders, tubes): the pin hinge is, the cone hinge is a mesh. */
export function hingeHasExactParts(shape: Pick<HingeShapeFields, "hingeStyle" | "hingePinless">) {
  return normalizeHingeStyle(shape.hingeStyle, shape.hingePinless) !== "cone";
}

/** The radial gap that leaves `clearance` between two 45 degree cones measured across the surfaces. */
function coneGap(clearance: number) {
  return clearance * Math.SQRT2;
}

/**
 * The radius of the cone at the root on a knuckle `length` long: the cone is as long as it is wide at the root (45 degrees,
 * which prints without bridges lying flat), it fits the knuckle's round end, and the knuckle that takes two cones keeps a wall.
 */
export function hingeConeRadius(length: number, height: number, clearance: number) {
  const reach = (length - CONE_WALL) / 2 - coneGap(clearance) + clearance;
  // The recess keeps a wall of 0.6 mm round it in the round end of the knuckle.
  const room = height / 2 - 0.6 - (coneGap(clearance) - clearance);
  return Math.max(0, Math.min(room, reach));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function finite(value: number | undefined, fallback: number) {
  return Number.isFinite(value) ? (value as number) : fallback;
}

export function normalizeHingeClearance(value?: number) {
  return clamp(finite(value, DEFAULT_HINGE_CLEARANCE), MIN_HINGE_CLEARANCE, MAX_HINGE_CLEARANCE);
}

/** How far the second leaf is folded up from lying flat, in degrees: 0 is open, 180 is closed. */
export function normalizeHingeAngle(value?: number) {
  return clamp(finite(value, 0), 0, MAX_HINGE_ANGLE);
}

/** An odd count between 3 and 15, fewer when the knuckles would get shorter than 1 mm. */
export function normalizeHingeKnuckles(value: number | undefined, width = DEFAULT_HINGE_WIDTH, clearance = DEFAULT_HINGE_CLEARANCE, max = MAX_HINGE_KNUCKLES) {
  let count = Math.round(finite(value, DEFAULT_HINGE_KNUCKLES));
  if (count % 2 === 0) count += 1;
  count = clamp(count, MIN_HINGE_KNUCKLES, max);
  while (count > MIN_HINGE_KNUCKLES && (width - (count - 1) * clearance) / count < MIN_KNUCKLE_LENGTH) count -= 2;
  return count;
}

/** A knuckle width given in mm: at least 1, or undefined when there is none (0 or less leaves the count to `hingeKnuckles`). */
export function normalizeHingeKnuckleWidth(value?: number) {
  return Number.isFinite(value) && (value as number) > 0 ? Math.max(1, value as number) : undefined;
}

/** The fewest knuckles (odd) that are no wider than `maxWidth`, for a hinge `width` long: what a knuckle width asks for. */
export function hingeKnucklesForWidth(width: number, maxWidth: number, clearance = DEFAULT_HINGE_CLEARANCE) {
  let count = MIN_HINGE_KNUCKLES;
  while (count < MAX_HINGE_KNUCKLES_BY_WIDTH && (width - (count - 1) * clearance) / count > maxWidth) count += 2;
  return normalizeHingeKnuckles(count, width, clearance, MAX_HINGE_KNUCKLES_BY_WIDTH);
}

/** The pin keeps a wall of at least 0.4 mm around its bore in B's knuckles. */
export function normalizeHingePinDiameter(value: number | undefined, height: number, clearance = DEFAULT_HINGE_CLEARANCE) {
  const radius = Math.max(0.5, height / 2);
  const max = Math.max(0.2, 2 * (radius - clearance - MIN_LEAF));
  return clamp(finite(value, Math.min(DEFAULT_HINGE_PIN_DIAMETER, height * 0.4)), Math.min(0.2, max), max);
}

/**
 * A leaf stays below B's bore: no thicker than the knuckle's radius less bore radius. The cone hinge has no bore, so its
 * leaf may be as thick as the whole knuckle: flush with it (#907).
 */
export function normalizeHingeLeafThickness(value: number | undefined, height: number, pinDiameter: number, clearance = DEFAULT_HINGE_CLEARANCE, style: HingeStyle = "pin") {
  const radius = Math.max(0.5, height / 2);
  const max = style === "cone" ? Math.max(0.1, height) : Math.max(0.1, radius - pinDiameter / 2 - clearance);
  return clamp(finite(value, DEFAULT_HINGE_LEAF_THICKNESS), Math.min(MIN_LEAF, max), max);
}

/**
 * How far from the axis a leaf ends beside the other part's knuckle, so that the clearance holds: where its top corner comes
 * closest to the round knuckle, or, for a leaf thicker than the radius, its edge level with the axis.
 */
function leafReach(radius: number, leaf: number, clearance: number) {
  if (leaf > radius) return radius + clearance;
  return Math.sqrt((radius + clearance) * (radius + clearance) - (radius - leaf) * (radius - leaf));
}

/** The depth below which a leaf would not reach past the other part's knuckles. */
export function minimumHingeDepth(height: number, leaf: number, clearance: number) {
  return 2 * (leafReach(height / 2, leaf, clearance) + 0.5);
}

/** The largest cone diameter that fits knuckles `length` long on a hinge `height` high, for the size field. */
export function hingeLargestConeSize(length: number, height: number, clearance: number) {
  return 2 * Math.max(0.3, hingeConeRadius(length, height, clearance));
}

export type HingeLeafStyle = "plate" | "fingers";

/** The leaves as one plate each (default), or as fingers: each knuckle carries its own, the two sides' alternating like two combs. */
export function normalizeHingeLeafStyle(value?: string): HingeLeafStyle {
  return value === "fingers" ? "fingers" : "plate";
}

/** How many screw holes each leaf gets along the axis: 0 (none) to 6. */
export function normalizeHingeScrewHoles(value?: number) {
  return Math.round(clamp(finite(value, 0), 0, MAX_HINGE_SCREW_HOLES));
}

export function normalizeHingeScrewDiameter(value?: number) {
  return clamp(finite(value, DEFAULT_HINGE_SCREW_DIAMETER), MIN_HINGE_SCREW_DIAMETER, MAX_HINGE_SCREW_DIAMETER);
}

/** The largest radius for the leaves' (or fingers') outer corners: as deep as a leaf reaches past the knuckles, half its length (`width`). */
export function hingeLargestCornerRadius(width: number, depth: number, leafStart: number) {
  return Math.max(0, Math.min(depth / 2 - leafStart, width / 2) - 0.05);
}

/**
 * Where the screw holes go: `xs` along the axis, `z` their distance from it (A's at -z, B's at +z). Each keeps a wall to
 * the leaf's edge, its rounded corner, the knuckles and the next hole. Where fewer fit, there are fewer, and none on a
 * leaf too small for one. Without a spacing they share the length evenly; without a distance across they sit in the
 * middle of the leaf beside the knuckles.
 */
function screwHolePlaces(count: number, width: number, half: number, leafStart: number, corner: number, head: number, spacing: number, across: number) {
  const keep = head + SCREW_WALL;
  const near = leafStart + keep;
  const far = half - keep;
  if (count < 1 || far < near || width / 2 < keep) return { z: 0, xs: [] as number[] };
  const z = across > 0 ? clamp(across / 2, near, far) : (near + far) / 2;
  // Beside a rounded corner a hole keeps its wall to the arc as well.
  let reach = width / 2 - keep;
  const arcZ = half - corner;
  if (corner > keep && z > arcZ) reach = Math.min(reach, width / 2 - corner + Math.sqrt(Math.max(0, (corner - keep) ** 2 - (z - arcZ) ** 2)));
  const gap = 2 * head + SCREW_WALL;
  for (let n = count; n >= 1; n -= 1) {
    const step = n === 1 ? 0 : spacing > 0 ? Math.min(Math.max(spacing, gap), (2 * reach) / (n - 1)) : width / n;
    const xs = Array.from({ length: n }, (_, k) => clamp((k - (n - 1) / 2) * step, -reach, reach));
    if (xs.every((x, k) => k === 0 || x - xs[k - 1] >= gap - 1e-9)) return { z, xs };
  }
  return { z, xs: [] as number[] };
}

export type HingeShapeFields = Pick<WorkplaneShape, "width" | "height"> & {
  depth?: number;
  hingeKnuckles?: number;
  /** The knuckles are at most this wide and their number follows it. */
  hingeKnuckleWidth?: number;
  hingePinDiameter?: number;
  hingeLeafThickness?: number;
  hingeClearance?: number;
  /** No printed pin: the bore runs through every knuckle, for a pin of one's own. */
  hingePinless?: boolean;
  /** "pin" (default), "pinless" (a bore for a pin of one's own), "cone" (cones on every other knuckle nesting into the others) or "liftOff" (two knuckles, the upper one lifts off the pin). */
  hingeStyle?: string;
  /** The cone hinge: the diameter of a cone where it grows from its knuckle, in mm; left out, the largest that fits. */
  hingeConeSize?: number;
  /** Part B folded up about the pin's axis, in degrees (0 = lying flat, 180 = closed). */
  hingeAngle?: number;
  /** Screw holes in each leaf along the axis; 0 or left out, none. */
  hingeScrewHoles?: number;
  /** The screw holes' diameter in mm. */
  hingeScrewDiameter?: number;
  /** From one screw hole's middle to the next along the axis, in mm; left out, they share the length evenly. */
  hingeScrewSpacing?: number;
  /** From the hole in one leaf to the hole in the other, across the axis, in mm; left out, each in the middle of its leaf. */
  hingeScrewAcross?: number;
  /** false: straight holes; otherwise countersunk at 90 degrees on the top, the side that faces the other leaf when closed. */
  hingeScrewCountersink?: boolean;
  /** What the holes are on top (see HingeScrewHead); left out, `hingeScrewCountersink` decides. */
  hingeScrewHead?: string;
  /** A nut's width across the flats in mm, for the nut's pockets; 0 or left out, from the hole's diameter. */
  hingeNutWidth?: number;
  /** The leaves' four outer corners rounded with this radius in mm; with fingers, each finger's two. */
  hingeCornerRadius?: number;
  /** "plate" (default): a leaf each side; "fingers": each knuckle carries its own finger, the two sides' alternating. No screw holes on fingers. */
  hingeLeafStyle?: string;
  sides?: number;
};

/** Everything the body is built from, in the shape's own frame (x along the axis, y up from 0, z across). */
export function hingePlan(shape: HingeShapeFields) {
  const width = Math.max(1, shape.width);
  const height = Math.max(1, shape.height);
  const radius = height / 2;
  const clearance = normalizeHingeClearance(shape.hingeClearance);
  const pinDiameter = normalizeHingePinDiameter(shape.hingePinDiameter, height, clearance);
  const pinRadius = pinDiameter / 2;
  const boreRadius = pinRadius + clearance;
  const style = normalizeHingeStyle(shape.hingeStyle, shape.hingePinless);
  const leaf = normalizeHingeLeafThickness(shape.hingeLeafThickness, height, pinDiameter, clearance, style);
  const knuckleWidth = normalizeHingeKnuckleWidth(shape.hingeKnuckleWidth);
  // A lift-off hinge has two knuckles: the lower one with the pin, the upper one that comes off it.
  let knuckles = style === "liftOff" ? 2 : knuckleWidth ? hingeKnucklesForWidth(width, knuckleWidth, clearance) : normalizeHingeKnuckles(shape.hingeKnuckles, width, clearance);
  const lengthFor = (count: number) => (width - (count - 1) * clearance) / count;
  // Knuckles too short to carry a cone are made fewer, the way ones shorter than 1 mm are.
  if (style === "cone") while (knuckles > MIN_HINGE_KNUCKLES && hingeConeRadius(lengthFor(knuckles), height, clearance) < MIN_CONE_RADIUS) knuckles -= 2;
  const knuckleLength = lengthFor(knuckles);
  const largestCone = Math.max(0.3, hingeConeRadius(knuckleLength, height, clearance));
  const coneRadius = style === "cone"
    ? Number.isFinite(shape.hingeConeSize) && (shape.hingeConeSize as number) > 0 ? clamp((shape.hingeConeSize as number) / 2, 0.3, largestCone) : largestCone
    : 0;
  const gap = coneGap(clearance);
  // The recess takes the cone with the gap all round: its opening where the knuckles meet, and how deep it goes into the knuckle.
  const recessRadius = coneRadius - clearance + gap;
  const recessDepth = coneRadius + gap - clearance;
  // Where the top of a leaf meets the knuckle's outside, and where the other leaf may end.
  const chord = Math.sqrt(Math.max(0, radius * radius - (radius - leaf) * (radius - leaf)));
  // The leaf's top corner is where it comes closest to the round knuckle:
  // the clearance has to hold there, not just level with the leaf.
  const leafStart = leafReach(radius, leaf, clearance);
  // Each leaf keeps at least half a millimetre beyond the other's knuckles.
  const depth = Math.max(minimumHingeDepth(height, leaf, clearance), shape.depth ?? shape.width);
  const segments = Array.from({ length: knuckles }, (_, index) => {
    const x0 = -width / 2 + index * (knuckleLength + clearance);
    return { x0, x1: x0 + knuckleLength, owner: index % 2 === 0 ? "a" as const : "b" as const };
  });
  // A multiple of four puts a corner exactly at the bottom of every circle.
  const sides = Math.max(16, Math.ceil(roundSideCount(shape.sides, height, height) / 4) * 4);
  const pinless = style === "pinless";
  const angle = normalizeHingeAngle(shape.hingeAngle);
  const fingers = normalizeHingeLeafStyle(shape.hingeLeafStyle) === "fingers";
  const cornerRadius = clamp(finite(shape.hingeCornerRadius, 0), 0, hingeLargestCornerRadius(fingers ? knuckleLength : width, depth, leafStart));
  // A countersink at 90 degrees is as deep as it widens; it leaves some straight hole, and one too shallow to hold a head is left out.
  const screwRadius = normalizeHingeScrewDiameter(shape.hingeScrewDiameter) / 2;
  const screwHead = normalizeHingeScrewHead(shape.hingeScrewHead, shape.hingeScrewCountersink);
  const sink = screwHead === "countersunk" || screwHead === "countersunkNut" ? Math.min(screwRadius, leaf - MIN_SCREW_SHAFT) : 0;
  const screwSink = sink >= Math.max(0.15, 0.08 * screwRadius) ? sink : 0;
  const screwHeadRadius = screwRadius + screwSink;
  // A nut's pocket is as deep as a nut is high, about half its width, but leaves a floor under it; too shallow, it is left out.
  const nutWidth = normalizeHingeNutWidth(shape.hingeNutWidth, 2 * screwRadius);
  const pocket = Math.min(0.5 * nutWidth + 0.3, leaf - NUT_FLOOR);
  const nutDepth = (screwHead === "nut" || screwHead === "countersunkNut") && pocket >= MIN_NUT_DEPTH ? pocket : 0;
  const nutRadius = nutWidth / Math.sqrt(3);
  const top = (wanted: "countersunk" | "straight" | "nut"): "countersunk" | "straight" | "nut" => wanted === "countersunk" && screwSink > 0 ? wanted : wanted === "nut" && nutDepth > 0 ? wanted : "straight";
  const screwTops = {
    a: top(screwHead === "nut" ? "nut" : screwHead === "straight" ? "straight" : "countersunk"),
    b: top(screwHead === "countersunk" ? "countersunk" : screwHead === "straight" ? "straight" : "nut"),
  };
  // The holes lie alike on both leaves, so they keep their walls by the wider top of the two.
  const footprint = Math.max(...[screwTops.a, screwTops.b].map((kind) => (kind === "countersunk" ? screwHeadRadius : kind === "nut" ? nutRadius : screwRadius)));
  const screws = screwHolePlaces(fingers ? 0 : normalizeHingeScrewHoles(shape.hingeScrewHoles), width, depth / 2, leafStart, cornerRadius, footprint, finite(shape.hingeScrewSpacing, 0), finite(shape.hingeScrewAcross, 0));
  return {
    width, depth, height, radius, clearance, pinless, angle, style, coneRadius, recessRadius, recessDepth, pinRadius, boreRadius, leaf, knuckles, knuckleLength, chord, leafStart, segments, sides,
    fingers, cornerRadius, screwRadius, screwSink, screwHeadRadius, screwHead, screwTops, nutWidth, nutDepth, nutRadius, screwZ: screws.z, screwXs: screws.xs,
  };
}

/**
 * The leaves, each a plate on one side (-1 for A, 1 for B) from x0 to x1, and where its own knuckles stand on it (`joins`):
 * one along the whole length each side, or with fingers one under every knuckle, as wide as it.
 */
export function hingeLeaves(plan: HingePlan) {
  type Leaf = { side: 1 | -1; x0: number; x1: number; joins: Array<[number, number]> };
  const own = (owner: "a" | "b") => plan.segments.filter((segment) => segment.owner === owner);
  if (plan.fingers) return plan.segments.map((segment): Leaf => ({ side: segment.owner === "a" ? -1 : 1, x0: segment.x0, x1: segment.x1, joins: [[segment.x0, segment.x1]] }));
  return (["a", "b"] as const).map((owner): Leaf => ({ side: owner === "a" ? -1 : 1, x0: -plan.width / 2, x1: plan.width / 2, joins: own(owner).map((segment): [number, number] => [segment.x0, segment.x1]) }));
}

export type HingePlan = ReturnType<typeof hingePlan>;

type P = { u: number; v: number };

function circle(plan: HingePlan, r: number): P[] {
  return Array.from({ length: plan.sides }, (_, k) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * k) / plan.sides;
    return { u: r * Math.cos(angle), v: plan.radius + r * Math.sin(angle) };
  });
}

/** The knuckle's outside from angle `from` to `to` (radians, increasing), its corners in between. */
function arc(plan: HingePlan, from: number, to: number): P[] {
  const points: P[] = [];
  for (let k = 0; k <= plan.sides * 2; k += 1) {
    const angle = -Math.PI / 2 + (2 * Math.PI * k) / plan.sides;
    if (angle > from + 1e-9 && angle < to - 1e-9) points.push({ u: plan.radius * Math.cos(angle), v: plan.radius + plan.radius * Math.sin(angle) });
  }
  return points;
}

/** The sections every body is made of, counter-clockwise in (u = z, v = y). */
export function hingeSections(plan: HingePlan) {
  const { depth, leaf, chord, leafStart: e } = plan;
  const half = depth / 2;
  const right = Math.asin((leaf - plan.radius) / plan.radius); // where a leaf top meets the knuckle on +z
  const left = Math.PI - right;
  const bottom = { u: 0, v: 0 };
  const arcA = arc(plan, -Math.PI / 2, left);
  const arcB = arc(plan, right, (3 * Math.PI) / 2);
  return {
    // A's knuckle with its leaf, the pin inside it.
    aFull: [{ u: -half, v: 0 }, { u: -e, v: 0 }, bottom, ...arcA, { u: -chord, v: leaf }, { u: -e, v: leaf }, { u: -half, v: leaf }],
    aCap: [{ u: -e, v: 0 }, bottom, ...arcA, { u: -chord, v: leaf }, { u: -e, v: leaf }],
    aLeaf: [{ u: -half, v: 0 }, { u: -e, v: 0 }, { u: -e, v: leaf }, { u: -half, v: leaf }],
    pin: circle(plan, plan.pinRadius),
    coneBase: circle(plan, plan.coneRadius),
    recess: circle(plan, plan.recessRadius),
    bFull: [bottom, { u: e, v: 0 }, { u: half, v: 0 }, { u: half, v: leaf }, { u: e, v: leaf }, { u: chord, v: leaf }, ...arcB],
    bCap: [bottom, { u: e, v: 0 }, { u: e, v: leaf }, { u: chord, v: leaf }, ...arcB],
    // B's knuckle as bCap, starting so that the side towards the leaf (u = e) closes the loop, as aCap's does.
    bKnuckle: [{ u: e, v: leaf }, { u: chord, v: leaf }, ...arcB, bottom, { u: e, v: 0 }],
    bLeaf: [{ u: e, v: 0 }, { u: half, v: 0 }, { u: half, v: leaf }, { u: e, v: leaf }],
    bore: circle(plan, plan.boreRadius),
  };
}

type Vec3 = [number, number, number];

/** A leaf's outline seen from above, in (x, w) with w the distance from the axis, counter-clockwise. */
type Q = { x: number; w: number };

/**
 * A leaf's outline from x0 to x1: along the axis at the leaf's start (w = `leafStart`, with a point at each of `breaks`),
 * out at both ends and along the outer edge, its two outer corners rounded.
 */
function leafOutline(plan: HingePlan, x0: number, x1: number, breaks: number[]): Q[] {
  const { leafStart: e, cornerRadius: r } = plan;
  const half = plan.depth / 2;
  const points: Q[] = [{ x: x0, w: e }];
  [...new Set(breaks)].filter((x) => x > x0 + 1e-9 && x < x1 - 1e-9).sort((p, q) => p - q).forEach((x) => points.push({ x, w: e }));
  points.push({ x: x1, w: e });
  if (r <= 0) return [...points, { x: x1, w: half }, { x: x0, w: half }];
  const steps = Math.max(2, Math.ceil(automaticSideCount(2 * r, 2 * r) / 4));
  const corner = (cx: number, from: number) => {
    for (let k = 0; k <= steps; k += 1) {
      const angle = from + (Math.PI / 2) * (k / steps);
      points.push({ x: cx + r * Math.cos(angle), w: half - r + r * Math.sin(angle) });
    }
  };
  corner(x1 - r, 0);
  corner(x0 + r, Math.PI / 2);
  return points;
}

/**
 * The display body: both parts as closed, watertight triangle meshes. The
 * knuckles are built in slices along the axis: each slice is a section pushed
 * from x0 to x1; where the section changes, the cap between them is the part
 * that ends. Each leaf is a plate over its outline, holes and all, open along
 * the axis where its own knuckles stand on it.
 */
export function hingeTriangles(shape: HingeShapeFields) {
  const plan = hingePlan(shape);
  const s = hingeSections(plan);
  const triangles: Vec3[][] = [];
  const at = (x: number, p: P): Vec3 => [x, p.v, p.u];
  const push = (a: Vec3, b: Vec3, c: Vec3, want: Vec3) => {
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
    triangles.push(n[0] * want[0] + n[1] * want[1] + n[2] * want[2] >= 0 ? [a, b, c] : [a, c, b]);
  };
  // `open`: the loop's last side (back to its first point) is left out, where a leaf joins the knuckle.
  const walls = (loop: P[], x0: number, x1: number, inward = false, open = false) => {
    loop.forEach((p, i) => {
      if (open && i === loop.length - 1) return;
      const q = loop[(i + 1) % loop.length];
      const du = q.u - p.u;
      const dv = q.v - p.v;
      const sign = inward ? -1 : 1;
      const want: Vec3 = [0, -du * sign, dv * sign];
      push(at(x0, p), at(x1, p), at(x1, q), want);
      push(at(x0, p), at(x1, q), at(x0, q), want);
    });
  };
  // A cone from the ring `r` at `x` to its point at `apexX`: the body's own (solid) or a recess in a knuckle (the other way round).
  const cone = (x: number, r: number, apexX: number, solid: boolean) => {
    const axis = at(apexX, { u: 0, v: plan.radius });
    const toward = Math.sign(apexX - x) * (solid ? 1 : -1);
    const sign = solid ? 1 : -1;
    for (let k = 0; k < plan.sides; k += 1) {
      const a0 = -Math.PI / 2 + (2 * Math.PI * k) / plan.sides;
      const a1 = -Math.PI / 2 + (2 * Math.PI * (k + 1)) / plan.sides;
      const p: P = { u: r * Math.cos(a0), v: plan.radius + r * Math.sin(a0) };
      const q: P = { u: r * Math.cos(a1), v: plan.radius + r * Math.sin(a1) };
      const mid = (a0 + a1) / 2;
      push(at(x, p), at(x, q), axis, [toward, sign * Math.sin(mid), sign * Math.cos(mid)]);
    }
  };
  const cap = (outer: P[], holes: P[][], x: number, direction: 1 | -1) => {
    const contour = outer.map((p) => new THREE.Vector2(p.u, p.v));
    const holeVectors = holes.map((hole) => hole.map((p) => new THREE.Vector2(p.u, p.v)));
    const all = [...outer, ...holes.flat()];
    THREE.ShapeUtils.triangulateShape(contour, holeVectors).forEach(([a, b, c]) => push(at(x, all[a]), at(x, all[b]), at(x, all[c]), [direction, 0, 0]));
  };
  const left = -plan.width / 2;
  const rightEnd = plan.width / 2;

  /**
   * A leaf or finger (`side` -1 for A, 1 for B, from x0 to x1): a plate from y = 0 up to its thickness over its outline,
   * with the screw holes through it, countersunk on top. Along the axis it is open where its own knuckles (`joins`)
   * stand on it: their sections close it there. The top and bottom are triangulated over the outline, which leaves out
   * points on a straight side; a triangle that passes such a point is split there, so the plate meets its walls and the
   * knuckles without gaps.
   */
  const plate = ({ side, x0, x1, joins }: ReturnType<typeof hingeLeaves>[number]) => {
    const outline = leafOutline(plan, x0, x1, joins.flat());
    const p3 = (q: Q, y: number): Vec3 => [q.x, y, side * q.w];
    const sides = automaticSideCount(2 * plan.screwHeadRadius, 2 * plan.screwHeadRadius);
    const ring = (x: number, r: number): Q[] => Array.from({ length: sides }, (_, k) => ({ x: x + r * Math.cos((2 * Math.PI * k) / sides), w: plan.screwZ + r * Math.sin((2 * Math.PI * k) / sides) }));
    // A nut's pocket: a hexagon with a corner towards the leaf's edge and the axis, as the polygon shape lies (its flats across the axis).
    const hexagon = (x: number): Q[] => Array.from({ length: 6 }, (_, k) => ({ x: x + plan.nutRadius * Math.sin((Math.PI * k) / 3), w: plan.screwZ + plan.nutRadius * Math.cos((Math.PI * k) / 3) }));
    const kind = side < 0 ? plan.screwTops.a : plan.screwTops.b;
    const topHole = (x: number) => (kind === "nut" ? hexagon(x) : ring(x, kind === "countersunk" ? plan.screwHeadRadius : plan.screwRadius));
    const face = (holes: Q[][], y: number, up: 1 | -1, outer: Q[] = outline) => {
      const all = [...outer, ...holes.flat()];
      const want: Vec3 = [0, up, 0];
      const between = (a: Q, b: Q) => {
        const dx = b.x - a.x, dw = b.w - a.w, length2 = dx * dx + dw * dw;
        return outer
          .map((p) => ({ p, t: ((p.x - a.x) * dx + (p.w - a.w) * dw) / length2 }))
          .filter(({ p, t }) => t > 1e-9 && t < 1 - 1e-9 && Math.abs((p.x - a.x) * dw - (p.w - a.w) * dx) / Math.sqrt(length2) < 1e-7)
          .sort((m, n) => m.t - n.t)
          .map(({ p }) => p);
      };
      THREE.ShapeUtils.triangulateShape(outer.map((q) => new THREE.Vector2(q.x, q.w)), holes.map((points) => points.map((q) => new THREE.Vector2(q.x, q.w)))).forEach(([i, j, k]) => {
        const corners = [all[i], all[j], all[k]];
        const loop = corners.flatMap((q, n) => [q, ...between(q, corners[(n + 1) % 3])]);
        if (loop.length === 3) return push(p3(corners[0], y), p3(corners[1], y), p3(corners[2], y), want);
        const middle: Q = { x: (corners[0].x + corners[1].x + corners[2].x) / 3, w: (corners[0].w + corners[1].w + corners[2].w) / 3 };
        loop.forEach((q, n) => push(p3(q, y), p3(loop[(n + 1) % loop.length], y), p3(middle, y), want));
      });
    };
    face(plan.screwXs.map(topHole), plan.leaf, 1);
    face(plan.screwXs.map((x) => ring(x, plan.screwRadius)), 0, -1);
    // A nut's pocket has a floor round the hole, facing up.
    if (kind === "nut") plan.screwXs.forEach((x) => face([ring(x, plan.screwRadius)], plan.leaf - plan.nutDepth, 1, hexagon(x)));
    outline.forEach((p, n) => {
      const q = outline[(n + 1) % outline.length];
      // Along the axis under its own knuckle, the leaf goes on into the knuckle.
      if (p.w === plan.leafStart && q.w === plan.leafStart && joins.some(([x0, x1]) => Math.min(p.x, q.x) >= x0 - 1e-9 && Math.max(p.x, q.x) <= x1 + 1e-9)) return;
      // Counter-clockwise in (x, w): outwards is to the right of the way round.
      const want: Vec3 = [q.w - p.w, 0, side * (p.x - q.x)];
      push(p3(p, 0), p3(q, 0), p3(q, plan.leaf), want);
      push(p3(p, 0), p3(q, plan.leaf), p3(p, plan.leaf), want);
    });
    // Each hole: straight up from the bottom, then, countersunk, widening to its head at the top, or for a nut up to the
    // pocket's floor, the pocket's six walls above it.
    const levels = kind === "countersunk"
      ? [{ r: plan.screwRadius, y: 0 }, { r: plan.screwRadius, y: plan.leaf - plan.screwSink }, { r: plan.screwHeadRadius, y: plan.leaf }]
      : [{ r: plan.screwRadius, y: 0 }, { r: plan.screwRadius, y: kind === "nut" ? plan.leaf - plan.nutDepth : plan.leaf }];
    const tube = (x: number, lower: Q[], y0: number, upper: Q[], y1: number) => {
      lower.forEach((p, k) => {
        const l = (k + 1) % lower.length;
        // Into the hole, towards its axis.
        const want: Vec3 = [x - p.x, 0, side * (plan.screwZ - p.w)];
        push(p3(p, y0), p3(lower[l], y0), p3(upper[l], y1), want);
        push(p3(p, y0), p3(upper[l], y1), p3(upper[k], y1), want);
      });
    };
    plan.screwXs.forEach((x) => {
      for (let level = 0; level + 1 < levels.length; level += 1) tube(x, ring(x, levels[level].r), levels[level].y, ring(x, levels[level + 1].r), levels[level + 1].y);
      if (kind === "nut") tube(x, hexagon(x), plan.leaf - plan.nutDepth, hexagon(x), plan.leaf);
    });
  };

  // Part A: knuckles with the pin, joined by the pin and the leaf in between (with fingers, by the pin alone).
  // Without the pin (a pin of one's own goes in) A's knuckles carry the same bore as B's, end to end.
  // In the cone style there is no pin and no bore: A's knuckles end in a cone towards each neighbour, which nests into B's recess.
  const coned = plan.style === "cone";
  const a = plan.segments.filter((segment) => segment.owner === "a");
  a.forEach((segment, index) => {
    walls(s.aCap, segment.x0, segment.x1, false, true);
    if (plan.pinless && !coned) walls(s.bore, segment.x0, segment.x1, true);
    const hole = coned ? s.coneBase : plan.pinless ? s.bore : s.pin;
    const endHoles = plan.pinless && !coned ? [s.bore] : [];
    if (index === 0) cap(s.aCap, endHoles, left, -1);
    else {
      cap(s.aCap, [hole], segment.x0, -1);
      if (coned) cone(segment.x0, plan.coneRadius, segment.x0 - plan.coneRadius, true);
    }
    if (index === a.length - 1 && plan.style === "liftOff") {
      // Lift-off: the pin goes on from A's only knuckle through B's sleeve to the end, where the sleeve comes off.
      cap(s.aCap, [s.pin], segment.x1, 1);
      walls(s.pin, segment.x1, rightEnd);
      cap(s.pin, [], rightEnd, 1);
    } else if (index === a.length - 1) cap(s.aCap, endHoles, rightEnd, 1);
    else {
      cap(s.aCap, [hole], segment.x1, 1);
      if (coned) cone(segment.x1, plan.coneRadius, segment.x1 + plan.coneRadius, true);
      const next = a[index + 1];
      if (!plan.pinless && !coned) walls(s.pin, segment.x1, next.x0);
    }
  });
  const leaves = hingeLeaves(plan);
  leaves.filter((leaf) => leaf.side < 0).forEach(plate);

  // Part B: its leaf runs the whole length (or a finger under each knuckle), its knuckles carry the bore.
  const firstOfB = triangles.length;
  const b = plan.segments.filter((segment) => segment.owner === "b");
  b.forEach((segment) => {
    walls(s.bKnuckle, segment.x0, segment.x1, false, true);
    if (coned) {
      // A blind conical recess in each end face, for the cones of the neighbours.
      cap(s.bCap, [s.recess], segment.x0, -1);
      cone(segment.x0, plan.recessRadius, segment.x0 + plan.recessDepth, false);
      cap(s.bCap, [s.recess], segment.x1, 1);
      cone(segment.x1, plan.recessRadius, segment.x1 - plan.recessDepth, false);
    } else {
      cap(s.bCap, [s.bore], segment.x0, -1);
      walls(s.bore, segment.x0, segment.x1, true);
      cap(s.bCap, [s.bore], segment.x1, 1);
    }
  });
  leaves.filter((leaf) => leaf.side > 0).forEach(plate);
  if (plan.angle > 0) {
    // B folds up about the axis through the middle of the pin (y = radius, z = 0).
    const turn = (plan.angle * Math.PI) / 180;
    const sin = Math.sin(turn);
    const cos = Math.cos(turn);
    for (let i = firstOfB; i < triangles.length; i += 1) {
      triangles[i] = triangles[i].map(([px, py, pz]): Vec3 => {
        const dy = py - plan.radius;
        return [px, plan.radius + dy * cos + pz * sin, -dy * sin + pz * cos];
      });
    }
  }
  return triangles;
}

/** A closed, watertight hinge from y = 0 to y = height, centred on x and z. */
export function createHingeGeometry(shape: HingeShapeFields): THREE.BufferGeometry {
  const positions: number[] = [];
  hingeTriangles(shape).forEach((triangle) => triangle.forEach((vertex) => positions.push(...vertex)));
  const raw = new THREE.BufferGeometry();
  raw.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const geometry = toCreasedNormals(raw, THREE.MathUtils.degToRad(30));
  raw.dispose();
  geometry.computeBoundingBox();
  return geometry;
}

export type HingeLocalPart = Pick<WorkplaneShape, "kind" | "x" | "z" | "elevation" | "width" | "depth" | "height" | "rotationX" | "rotationZ" | "bevel" | "hole" | "screwHoleShaft" | "screwHoleAngle" | "sides">;

/**
 * The exact body in parts the CAD kernel already knows - boxes, lying
 * cylinders and lying tubes, upright cylinders for rounded leaf corners - in
 * the shape's own frame: x along the axis, `elevation` from the bottom of the
 * shape, before its own turn. Overlapping parts are fused into the two bodies;
 * the screw holes are parts marked `hole`, cut out of them afterwards.
 */
export function hingeLocalParts(shape: HingeShapeFields): HingeLocalPart[] {
  const plan = hingePlan(shape);
  const { width, depth, radius, leaf, leafStart: e, knuckleLength, pinRadius, boreRadius, cornerRadius: r } = plan;
  const half = depth / 2;
  // A cylinder or tube lies along x when turned 90 degrees about z; its height is then its length.
  const lying = (x: number, diameter: number, length: number) => ({ x, z: 0, elevation: radius - length / 2, width: diameter, depth: diameter, height: length, rotationZ: 90 });
  // A leaf or finger (`side` -1 for A, 1 for B, from x0 to x1) from the leaf's start out: one box, or with rounded corners
  // two boxes and a cylinder in each corner.
  const leafParts = ({ side, x0, x1 }: ReturnType<typeof hingeLeaves>[number]): HingeLocalPart[] => {
    const x = (x0 + x1) / 2, long = x1 - x0;
    return r <= 0
      ? [{ kind: "box", x, z: (side * (half + e)) / 2, elevation: 0, width: long, depth: half - e, height: leaf }]
      : [
        { kind: "box", x, z: (side * (half - r + e)) / 2, elevation: 0, width: long, depth: half - r - e, height: leaf },
        { kind: "box", x, z: side * (half - r / 2), elevation: 0, width: long - 2 * r, depth: r, height: leaf },
        ...[-1, 1].map((end): HingeLocalPart => ({ kind: "cylinder", x: x + end * (long / 2 - r), z: side * (half - r), elevation: 0, width: 2 * r, depth: 2 * r, height: leaf })),
      ];
  };
  // The screw holes as cutters reaching a little past both faces: countersunk with the head on top, or straight.
  // A nut's pocket is a six-sided prism from its floor up past the top, its flats across the axis, the hole a cylinder.
  const screwParts = (side: 1 | -1): HingeLocalPart[] => plan.screwXs.flatMap((x): HingeLocalPart[] => {
    const kind = side < 0 ? plan.screwTops.a : plan.screwTops.b;
    const z = side * plan.screwZ;
    if (kind === "countersunk") return [{ kind: "countersink", x, z, elevation: -SCREW_OVERCUT, width: 2 * (plan.screwHeadRadius + SCREW_OVERCUT), depth: 2 * (plan.screwHeadRadius + SCREW_OVERCUT), height: leaf + 2 * SCREW_OVERCUT, screwHoleShaft: 2 * plan.screwRadius, screwHoleAngle: 90, hole: true }];
    const hole: HingeLocalPart = { kind: "cylinder", x, z, elevation: -SCREW_OVERCUT, width: 2 * plan.screwRadius, depth: 2 * plan.screwRadius, height: leaf + 2 * SCREW_OVERCUT, hole: true };
    if (kind !== "nut") return [hole];
    return [hole, { kind: "polygon", sides: 6, x, z, elevation: leaf - plan.nutDepth, width: plan.nutWidth, depth: 2 * plan.nutRadius, height: plan.nutDepth + SCREW_OVERCUT, hole: true }];
  });
  const leaves = hingeLeaves(plan);
  const aLeaf = leaves.filter((one) => one.side < 0).flatMap(leafParts);
  const bLeaf = leaves.filter((one) => one.side > 0).flatMap(leafParts);
  const parts: HingeLocalPart[] = [...aLeaf, ...bLeaf];
  // B's parts that fold up with it; its tubes lie on the axis and only spin in place.
  const folding = new Set<HingeLocalPart>(bLeaf);
  if (!plan.pinless) parts.push({ kind: "cylinder", ...lying(0, pinRadius * 2, width) });
  plan.segments.forEach((segment) => {
    const center = (segment.x0 + segment.x1) / 2;
    if (segment.owner === "a") {
      // A pinless hinge has the same bore through A's knuckles as through B's.
      if (plan.pinless) parts.push({ kind: "tube", ...lying(center, radius * 2, knuckleLength), bevel: radius - boreRadius });
      else parts.push({ kind: "cylinder", ...lying(center, radius * 2, knuckleLength) });
      parts.push({ kind: "box", x: center, z: -e / 2, elevation: 0, width: knuckleLength, depth: e, height: leaf });
    } else {
      parts.push({ kind: "tube", ...lying(center, radius * 2, knuckleLength), bevel: radius - boreRadius });
      const under: HingeLocalPart = { kind: "box", x: center, z: e / 2, elevation: 0, width: knuckleLength, depth: e, height: leaf };
      parts.push(under);
      folding.add(under);
    }
  });
  const bScrews = screwParts(1);
  parts.push(...screwParts(-1), ...bScrews);
  bScrews.forEach((part) => folding.add(part));
  if (plan.angle > 0) {
    // B's leaf, holes and all, folds up about the axis and turns with it.
    const turn = (plan.angle * Math.PI) / 180;
    folding.forEach((part) => {
      const dy = (part.elevation ?? 0) + part.height / 2 - radius;
      const dz = part.z ?? 0;
      part.elevation = radius + dy * Math.cos(turn) + dz * Math.sin(turn) - part.height / 2;
      part.z = -dy * Math.sin(turn) + dz * Math.cos(turn);
      part.rotationX = -plan.angle;
    });
  }
  return parts;
}
