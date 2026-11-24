import type { CrossSection, ManifoldToplevel, Mat4 } from "manifold-3d";
import * as THREE from "three";
import { MeshBVH } from "three-mesh-bvh";
import type { ClearanceVec3 } from "@/lib/clearanceCheck";
import { boxAround, type Finding, type FindingLevel } from "@/lib/findings";
import { shapeToManifoldSolid } from "@/lib/editorBooleans";
import { getManifoldRuntime, type ManifoldSolid } from "@/lib/editorMeshCore";
import { numberLocale, t } from "@/lib/i18n";
import { createLocalId } from "@/lib/localIds";
import { splitShapeFromWorldPositions } from "@/lib/modelSplit";
import { canonicalizeShape, isNonSolidShape } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

/**
 * Molds and dies made from a part, the master, in one step (asked for in the Layerling User Group on Facebook):
 * - twoPart: a rigid two-part mold printed directly, for resin, plaster, wax, soap, chocolate or concrete: a block round
 *   the master, `wall` thick, parted level at `parting` % of the master's height. Cones on the lower half's parting face
 *   go into holes in the upper half (the fourth smaller, so the halves close only one way), a funnel and sprue lead in at
 *   the master's highest point, thin vents at the other high points, pry slots on the seam to get the halves apart, and
 *   clamp ears with bolt holes if asked. With `ownOpenings` the sprue and the vents are not placed by the tool: the mold
 *   gets the `openings` the user set, each a channel straight down from the top at its spot (Discussion #1806). Both
 *   halves are laid out with the parting face up, as they print: the cavity is then open upward, the keys and the funnel
 *   need no support.
 * - box: a pour box for silicone round a printed master: a base plate with a shallow recess the master sits in and a
 *   groove the frame stands in (so it seals), and the frame `gap` away from the master, `above` mm higher than it.
 * - tray: an open one-part mold, the master's flat underside at the top, poured to the brim.
 * - die: a punch and die pair for forming, embossing or cutting thin sheet (leather, card, foil, thin aluminium): the
 *   punch is the master's outline seen from above standing on a base plate, its top edge rounded; the die is a plate with
 *   the outline as a cavity, the clearance larger all round (the material's thickness for forming, a few per cent of it for
 *   cutting, then the cavity goes through so the slug falls out), mirrored so it fits once turned over onto the punch.
 *   Guide pins on the punch's plate go into holes in the die's.
 * - skin: a thin silicone mold with a printed shell that holds it in shape (a "glove" or "matrix" mold): the master
 *   stands on a base plate, the shell stands over it `gap` away all round, and the silicone is poured through the shell's
 *   top into that gap. It takes a fraction of the silicone a pour box takes. The shell's inside never widens upward, so it
 *   lifts off the cured silicone; it prints roof down, as a cup, and stands on that flat roof when it is cast in.
 * - core: a mold for a vessel (a planter, a cup, a vase): a base plate with the core that fills the vessel's inside, and
 *   an outer sleeve in one piece or in two halves. It is cast upside down, the rim on the plate, poured to the brim.
 * - halves: two open cases, each with one half of the master standing on its plate inside a frame. Silicone or plaster
 *   poured into each gives one half of a two-part mold (plaster halves for slip casting), with natches that fit and a
 *   pour channel between them, and without bedding the master in clay.
 * A two-part mold can also be poured standing, through a sprue in the seam (`pour` seam), take a wick for a candle, a
 * sealing lip round the cavity, or be made in four parts round the pour axis where two would stick (`pieces` four).
 * Warnings tell where a cast would stick (an undercut against the way it comes out) or the wall is thin. The volume of the
 * cavity (or of the silicone in a pour box) is returned in ml, and with it what to mix (`moldMix`): the weight with an
 * allowance, split by the mixing ratio, and what it costs. Everything is worked out with Manifold, z up.
 */

export type MoldKind = "twoPart" | "box" | "skin" | "core" | "halves" | "tray" | "die";
export const MOLD_KINDS: readonly MoldKind[] = ["twoPart", "box", "skin", "core", "halves", "tray", "die"];
export type MoldDieMode = "form" | "cut" | "relief";
export const MOLD_DIE_MODES: readonly MoldDieMode[] = ["form", "cut", "relief"];
/** The way a two-part mold opens: along X (left/right), Y (front/back) or Z (up/down), or the best of them, found. */
/** "free": any direction, tilted `openTilt` degrees from straight up and turned `openTurn` degrees about the upright. */
export type MoldDirection = "auto" | "x" | "y" | "z" | "free";
export type MoldAxis = Exclude<MoldDirection, "auto">;
export const MOLD_DIRECTIONS: readonly MoldDirection[] = ["auto", "z", "x", "y", "free"];
/** The three directions every analysis rates side by side; a free one is rated besides when it is asked for. */
export const MOLD_AXES: readonly MoldAxis[] = ["z", "x", "y"];
/** What is cast: silicone gives way a little, resin, plaster and the rest are rigid in a rigid mold. */
export type MoldCastMaterial = "silicone" | "resin" | "plaster" | "wax" | "soap" | "concrete" | "clay" | "other";
export const MOLD_CAST_MATERIALS: readonly MoldCastMaterial[] = ["silicone", "resin", "plaster", "wax", "soap", "concrete", "clay", "other"];
/** A two-part mold in two halves, or in four parts round the pour axis (each pulled off sideways, for undercuts all round). */
export type MoldPieces = "two" | "four";
export const MOLD_PIECES: readonly MoldPieces[] = ["two", "four"];
/** Where a two-part mold is poured: through its upper half lying down, or standing, through a sprue in the seam. */
export type MoldPour = "top" | "seam";
export const MOLD_POURS: readonly MoldPour[] = ["top", "seam"];
/** A pour box's frame: a rectangle, or following the master's outline (less silicone). */
export type MoldBoxShape = "rect" | "contour";
export const MOLD_BOX_SHAPES: readonly MoldBoxShape[] = ["rect", "contour"];
/** What the two halves of the `halves` kind are poured from. */
export type MoldMaterial = "silicone" | "plaster";
export const MOLD_MATERIALS: readonly MoldMaterial[] = ["silicone", "plaster"];
/** The outside of a two-part mold: a block, or a shell that follows the master and saves filament. */
export type MoldOuter = "block" | "shell";
export const MOLD_OUTERS: readonly MoldOuter[] = ["block", "shell"];
/** The parts laid out beside the master as they print, or closed round it, to look at. */
export type MoldOutput = "print" | "assembled";
export const MOLD_OUTPUTS: readonly MoldOutput[] = ["print", "assembled"];
/** What an opening the user sets is for: the material goes in through a sprue (with a funnel), the air out through a vent. */
export type MoldOpeningKind = "sprue" | "vent";
export const MOLD_OPENING_KINDS: readonly MoldOpeningKind[] = ["sprue", "vent"];
/**
 * An opening of a two-part mold set by the user (Discussion #1806): a channel straight along the opening direction from
 * the mold's top down into the cavity. `x` and `y` say where, in mm across the parting face from the middle of the
 * master's bounding box, along the two level axes of the opening's frame (the frame `sprueShiftX`/`sprueShiftY` move the
 * sprue in, and the one the analysis gives as `across`). Measured from the master's own middle, an opening stays on the
 * same spot of the master when the master is moved; it belongs to one opening direction, as the vents switched off do.
 */
export type MoldOpening = { x: number; y: number; kind: MoldOpeningKind };

/**
 * What each casting material starts with: how much it shrinks as it sets (%) and how heavy it is (g/cm³). Assumptions
 * from makers' data sheets, to be checked against the material in hand: addition-cure silicone shrinks about 0.1 %,
 * polyurethane and epoxy resin 0.2 to 1 %, plaster swells a little as it sets (taken as 0).
 */
export const MOLD_CAST_MATERIAL_DATA: Readonly<Record<MoldCastMaterial, {
  shrinkage: number; density: number; rigid: boolean;
  /** The usual mixing ratio by weight, A to B; B 0 for a material that is not mixed from two. */
  mix: readonly [number, number];
  /** Poured hot, or heating up as it sets: a mold printed in PLA softens. */
  hot?: boolean;
}>> = {
  silicone: { shrinkage: 0.1, density: 1.1, rigid: false, mix: [100, 100] },
  resin: { shrinkage: 0.5, density: 1.15, rigid: true, mix: [100, 100], hot: true },
  // Plaster to water, as most casting plasters are mixed (about 1.4 to 1); the wet mix weighs about 1.6 g/cm³.
  plaster: { shrinkage: 0, density: 1.6, rigid: true, mix: [100, 70] },
  // Wax sinks at the open top as it sets rather than coming away from the mold: topped up, not allowed for.
  wax: { shrinkage: 0, density: 0.9, rigid: true, mix: [100, 0], hot: true },
  soap: { shrinkage: 0, density: 1.05, rigid: true, mix: [100, 0], hot: true },
  // Ready-mixed dry concrete to water.
  concrete: { shrinkage: 0, density: 2.3, rigid: true, mix: [100, 12] },
  // Casting slip: the piece shrinks about a tenth as it dries and is fired, so its mold is made that much larger.
  clay: { shrinkage: 10, density: 1.75, rigid: true, mix: [100, 0] },
  other: { shrinkage: 0, density: 1, rigid: true, mix: [100, 0] },
};
/** An undercut smaller than this (mm², 0.05 cm²) is not worth a word. */
export const MOLD_UNDERCUT_TRIFLE_MM2 = 5;
/** In silicone, undercuts under this share of the surface (%) only get a hint: the cast gives way. */
export const MOLD_SILICONE_UNDERCUT_PERCENT = 2;

export type MoldOptions = {
  kind: MoldKind;
  /** twoPart and tray: the mold's wall round the cavity; box: the frame's wall. */
  wall: number;
  /** box: the room between the master and the frame, filled with silicone. */
  gap: number;
  /** twoPart: where the halves part, in % of the master's height from its bottom. */
  parting: number;
  /** twoPart: the parting found: where the master is widest and neither half has an undercut, if there is such a level. */
  autoParting: boolean;
  keys: boolean;
  keySize: number;
  keyFit: number;
  sprue: boolean;
  sprueDiameter: number;
  vents: boolean;
  ventDiameter: number;
  ears: boolean;
  boltDiameter: number;
  prySlots: boolean;
  /** tray: the floor under the cavity; box: the base plate. */
  floor: number;
  /** box: how much higher than the master the frame is. */
  above: number;
  dieMode: MoldDieMode;
  /** die: the sheet's thickness. */
  material: number;
  /** die: how high the punch stands over its plate (and how deep the die's cavity is). */
  depth: number;
  /** die: the plates' thickness. */
  base: number;
  pins: boolean;
  pinDiameter: number;
  pinFit: number;
  /** die: the radius the punch's top edge is rounded to (forming tears at a sharp edge). */
  rounding: number;
  /** twoPart: the way the halves open; "auto" takes the one with the least undercut. */
  direction: MoldDirection;
  /** direction "free": degrees from straight up (0) to level (90), and about the upright from the right (+X, 0) towards the back (90). */
  openTilt: number;
  openTurn: number;
  castMaterial: MoldCastMaterial;
  /** How much the cast shrinks as it sets, %: the cavity is made that much larger round the master's centre of mass. */
  shrinkage: number;
  /** The cast's density, g/cm³, for its weight. */
  density: number;
  /** twoPart: faces closer than this to the opening direction (degrees) get a hint in a rigid material. */
  draftLimit: number;
  outer: MoldOuter;
  /** twoPart: bolt holes through both halves beside the cavity, and their diameter. */
  screws: boolean;
  screwDiameter: number;
  /** twoPart, block: grooves round the outside for rubber bands. */
  bands: boolean;
  /** twoPart: the high points (numbered as the analysis finds them) whose vent is switched off. */
  ventsOff: number[];
  /** twoPart: the sprue moved from the highest point by this much across the parting face, mm. */
  sprueShiftX: number;
  sprueShiftY: number;
  output: MoldOutput;
  /**
   * twoPart: the user sets the openings (Discussion #1806). The sprue at the highest point and the vents the analysis
   * finds are then not made; the mold gets exactly the `openings`, whatever `sprue`, `vents`, `ventsOff` and the sprue's
   * shift say.
   */
  ownOpenings: boolean;
  openings: MoldOpening[];
  /** twoPart: two halves, or four parts round the pour axis. */
  pieces: MoldPieces;
  /** twoPart, two halves opening left/right or front/back: poured lying through the upper half, or standing through the seam. */
  pour: MoldPour;
  /** twoPart: a hole for a candle's wick through the mold opposite each sprue, and a notch across the funnel for the rod it hangs on. */
  wick: boolean;
  wickDiameter: number;
  /** twoPart, two halves: a low ridge round the cavity on one half and a groove for it in the other, against flash. */
  seal: boolean;
  /** box: the frame a rectangle or following the master's outline. */
  boxShape: MoldBoxShape;
  /** skin and core: the shell (the sleeve) in two halves rather than in one piece. */
  shellSplit: boolean;
  /** core: a pin on the core that leaves a drain hole in the vessel's bottom, and its diameter. */
  drain: boolean;
  drainDiameter: number;
  /** halves: what the two halves are poured from. */
  moldMaterial: MoldMaterial;
  /** What is mixed more than the volume asks for, %: what stays in the cup and on the stick. */
  allowance: number;
  /** The mixing ratio by weight, A to B (100 to 100 is 1:1); B 0 for a material that is not mixed from two. */
  mixA: number;
  mixB: number;
  /** What a kilogram of the material costs, in the user's own money; 0 leaves the cost out. */
  price: number;
};

export const MOLD_DEFAULTS: MoldOptions = {
  kind: "twoPart", wall: 5, gap: 10, parting: 50, autoParting: true, keys: true, keySize: 8, keyFit: 0.2, sprue: true, sprueDiameter: 8, vents: true,
  ventDiameter: 2.5, ears: false, boltDiameter: 4.5, prySlots: true, floor: 3, above: 12,
  dieMode: "form", material: 1, depth: 5, base: 5, pins: true, pinDiameter: 6, pinFit: 0.25, rounding: 1,
  direction: "auto", openTilt: 45, openTurn: 0, castMaterial: "silicone", shrinkage: 0.1, density: 1.1, draftLimit: 1, outer: "block", screws: false, screwDiameter: 3.4, bands: false,
  ventsOff: [], sprueShiftX: 0, sprueShiftY: 0, output: "print", ownOpenings: false, openings: [],
  pieces: "two", pour: "top", wick: false, wickDiameter: 2, seal: false, boxShape: "rect", shellSplit: true, drain: false, drainDiameter: 8, moldMaterial: "silicone",
  allowance: 10, mixA: 100, mixB: 100, price: 0,
};

/** The ranges each setting is kept to, in mm (parting in %). */
export const MOLD_LIMITS = {
  wall: [2, 20], gap: [3, 50], parting: [5, 95], keySize: [4, 20], keyFit: [0, 0.6], sprueDiameter: [4, 20], ventDiameter: [1.5, 5],
  boltDiameter: [2, 8], floor: [1.2, 10], above: [3, 40], material: [0.1, 5], depth: [1, 30], base: [3, 15], pinDiameter: [3, 10],
  pinFit: [0, 0.6], rounding: [0, 5], shrinkage: [0, 20], density: [0.3, 4], draftLimit: [0, 10], screwDiameter: [2, 8], sprueShiftX: [-100, 100], sprueShiftY: [-100, 100],
  openTilt: [0, 90], openTurn: [-180, 180], wickDiameter: [1, 5], drainDiameter: [3, 30], allowance: [0, 50], mixA: [1, 1000], mixB: [0, 1000], price: [0, 100000],
} as const;
type Limited = keyof typeof MOLD_LIMITS;

/** Millilitres in a US fluid ounce. */
export const MOLD_ML_PER_US_FL_OZ = 29.5735;
/** A wall thinner than this warps or breaks under a pour, in mm. */
export const MOLD_MIN_STRONG_WALL = 3;
/** At most this many sprues, one per separate cavity, the largest first. */
export const MOLD_MAX_SPRUES = 24;
/** At most this many openings set by the user; more than a mold's top has room for is a slip of the hand. */
export const MOLD_MAX_OPENINGS = 24;
/** An opening set by the user lies at most this far from the master's middle, in mm (further out there is no master). */
export const MOLD_OPENING_REACH = 1000;
/** Two openings closer together than this, in mm, are one: a second click on the same spot. */
export const MOLD_OPENING_APART = 0.5;
/** A pour box's frame stands this deep in the base's groove, with this play per side, in mm. */
const BOX_GROOVE = 2;
const BOX_GROOVE_PLAY = 0.3;
/** The recess in the base the master sits in, in mm deep, and its play. */
const BOX_SEAT = 0.6;
const BOX_SEAT_PLAY = 0.2;
/** Pry slots: this wide along the side, deep into it and tall across the seam, in mm. */
const PRY_WIDTH = 10;
const PRY_DEPTH = 3;
const PRY_TALL = 2.4;
/** Clamp ears: this wide, reaching this far out, this thick on each half, in mm. */
const EAR_WIDTH = 14;
const EAR_REACH = 12;
const EAR_THICK = 5;
/** Rubber band grooves: this wide and deep, in mm. */
const BAND_WIDTH = 5;
const BAND_DEPTH = 1.5;
/** The sealing lip: this far from the cavity, this wide at its foot and this high, in steps, with this play in its groove, in mm. */
const SEAL_OFFSET = 1.5;
const SEAL_WIDTH = 2.4;
const SEAL_HEIGHT = 0.9;
const SEAL_STEPS = 3;
const SEAL_PLAY = 0.15;
/** Parts laid out beside the master this far apart, in mm. */
const LAYOUT_GAP = 15;
const SIDES = 64;

function clamp(value: unknown, [min, max]: readonly [number, number], fallback: number) {
  const number = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : Number.NaN;
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}
function flag(value: unknown, fallback: boolean) {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return fallback;
}

/**
 * The openings set by the user kept to what a mold can take: each needs a place in finite numbers (kept within
 * `MOLD_OPENING_REACH` of the master's middle) and a kind that exists, or it is left out; one within
 * `MOLD_OPENING_APART` of an earlier one is the same spot and left out too, and after `MOLD_MAX_OPENINGS` the rest is.
 * The order stays as given, so an opening keeps its number in the panel's list.
 */
export function normalizeMoldOpenings(value: unknown): MoldOpening[] {
  if (!Array.isArray(value)) return [];
  const openings: MoldOpening[] = [];
  for (const entry of value as unknown[]) {
    if (openings.length >= MOLD_MAX_OPENINGS) break;
    if (!entry || typeof entry !== "object") continue;
    const raw = entry as Record<string, unknown>;
    const x = clamp(raw.x, [-MOLD_OPENING_REACH, MOLD_OPENING_REACH], Number.NaN);
    const y = clamp(raw.y, [-MOLD_OPENING_REACH, MOLD_OPENING_REACH], Number.NaN);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    if (typeof raw.kind !== "string" || !(MOLD_OPENING_KINDS as readonly string[]).includes(raw.kind)) continue;
    if (openings.some((other) => Math.hypot(other.x - x, other.y - y) < MOLD_OPENING_APART)) continue;
    openings.push({ x, y, kind: raw.kind as MoldOpeningKind });
  }
  return openings;
}

/** The settings kept to what is offered; anything missing or out of range takes the default or the nearest end. */
export function normalizeMoldOptions(value?: Partial<Record<keyof MoldOptions, unknown>> | null, defaults: MoldOptions = MOLD_DEFAULTS): MoldOptions {
  const raw = value ?? {};
  const kind = typeof raw.kind === "string" && (MOLD_KINDS as readonly string[]).includes(raw.kind) ? (raw.kind as MoldKind) : defaults.kind;
  const dieMode = typeof raw.dieMode === "string" && (MOLD_DIE_MODES as readonly string[]).includes(raw.dieMode) ? (raw.dieMode as MoldDieMode) : defaults.dieMode;
  const numbers = Object.fromEntries((Object.keys(MOLD_LIMITS) as Limited[]).map((key) => [key, clamp(raw[key], MOLD_LIMITS[key], defaults[key])])) as Pick<MoldOptions, Limited>;
  const pickOne = <T extends string>(value: unknown, list: readonly T[], fallback: T): T => (typeof value === "string" && (list as readonly string[]).includes(value) ? (value as T) : fallback);
  const ventsOff = Array.isArray(raw.ventsOff)
    ? [...new Set(raw.ventsOff.map(Number).filter((value) => Number.isInteger(value) && value >= 0 && value < 64))].sort((a, b) => a - b)
    : defaults.ventsOff;
  return {
    ...defaults,
    ...numbers,
    kind,
    dieMode,
    direction: pickOne(raw.direction, MOLD_DIRECTIONS, defaults.direction),
    castMaterial: pickOne(raw.castMaterial, MOLD_CAST_MATERIALS, defaults.castMaterial),
    outer: pickOne(raw.outer, MOLD_OUTERS, defaults.outer),
    output: pickOne(raw.output, MOLD_OUTPUTS, defaults.output),
    pieces: pickOne(raw.pieces, MOLD_PIECES, defaults.pieces),
    pour: pickOne(raw.pour, MOLD_POURS, defaults.pour),
    boxShape: pickOne(raw.boxShape, MOLD_BOX_SHAPES, defaults.boxShape),
    moldMaterial: pickOne(raw.moldMaterial, MOLD_MATERIALS, defaults.moldMaterial),
    wick: flag(raw.wick, defaults.wick),
    seal: flag(raw.seal, defaults.seal),
    shellSplit: flag(raw.shellSplit, defaults.shellSplit),
    drain: flag(raw.drain, defaults.drain),
    screws: flag(raw.screws, defaults.screws),
    bands: flag(raw.bands, defaults.bands),
    ventsOff,
    ownOpenings: flag(raw.ownOpenings, defaults.ownOpenings),
    openings: raw.openings === undefined ? defaults.openings.map((opening) => ({ ...opening })) : normalizeMoldOpenings(raw.openings),
    autoParting: flag(raw.autoParting, defaults.autoParting),
    keys: flag(raw.keys, defaults.keys),
    sprue: flag(raw.sprue, defaults.sprue),
    vents: flag(raw.vents, defaults.vents),
    ears: flag(raw.ears, defaults.ears),
    prySlots: flag(raw.prySlots, defaults.prySlots),
    pins: flag(raw.pins, defaults.pins),
  };
}

/**
 * The clearance per side between punch and die, in mm: forming and embossing need the sheet's thickness (less and the
 * sheet is squeezed and tears); cutting a few per cent of it, at least 0.05 mm, so the edges shear.
 */
export function moldDieClearance(mode: MoldDieMode, material: number) {
  return mode !== "cut" ? material : Math.max(0.05, Math.round(material * 0.07 * 100) / 100);
}

/** What each part is, for its name. */
export type MoldPartRole = "lower" | "upper" | "left" | "right" | "front" | "back" | "base" | "frame" | "tray" | "punch" | "die"
  | "quarter" | "skinBase" | "skinShell" | "skinShellHalf" | "coreBase" | "sleeve" | "sleeveHalf" | "caseFirst" | "caseSecond";
export type MoldWarning = "undercut" | "thinWall" | "sprueLow" | "pinsLeftOut" | "airTrap" | "fineDetails" | "sprueMissed" | "openingMissed" | "noSprue"
  | "hotCast" | "coreUndercut" | "rimCut" | "footFilled" | "smallOpening" | "clayNeedsPlaster" | "seamFallback";
/** A part and what it is; `number` tells the parts of one role apart (the quarters, the halves of a shell or a sleeve). */
export type MoldPart = { role: MoldPartRole; solid: ManifoldSolid; number?: number };

/** What is poured into what a kind makes: the cast itself, or the silicone or plaster the mold is made of. */
export function moldPouredMaterial(options: Pick<MoldOptions, "kind" | "castMaterial" | "moldMaterial">): MoldCastMaterial {
  if (options.kind === "box" || options.kind === "skin") return "silicone";
  if (options.kind === "halves") return options.moldMaterial;
  return options.castMaterial;
}

/** What to mix for a pour of `volume` ml. */
export type MoldMix = {
  material: MoldCastMaterial;
  /** The volume with the allowance, ml, and its weight, g. */
  volume: number;
  totalG: number;
  /** The two parts by the mixing ratio, g; `bG` 0 for a material that is not mixed from two. */
  aG: number;
  bG: number;
  /** In the user's money, when a price per kilogram is set. */
  cost: number | null;
  /** The allowance the figures hold, %. */
  allowance: number;
};

/**
 * The mixing sheet for a pour: the volume with the allowance, its weight by the material's density (the cast's own
 * `density` where the cast is poured, the data sheet's assumption for the silicone or plaster of a mold), split by the
 * mixing ratio, and what it costs at the price per kilogram.
 */
export function moldMix(volume: number, options: Pick<MoldOptions, "kind" | "castMaterial" | "moldMaterial" | "density" | "allowance" | "mixA" | "mixB" | "price">): MoldMix {
  const material = moldPouredMaterial(options);
  const cast = options.kind === "twoPart" || options.kind === "tray" || options.kind === "core";
  const density = cast ? options.density : MOLD_CAST_MATERIAL_DATA[material].density;
  const withAllowance = Math.max(0, volume) * (1 + options.allowance / 100);
  const totalG = withAllowance * density;
  const share = options.mixA + options.mixB > 0 ? options.mixA / (options.mixA + options.mixB) : 1;
  return { material, volume: withAllowance, totalG, aG: totalG * share, bG: totalG * (1 - share), cost: options.price > 0 ? (totalG / 1000) * options.price : null, allowance: options.allowance };
}

/** How one opening direction does: the parting found (or set) and how much undercut and too-steep surface it leaves. */
export type MoldDirectionRating = {
  axis: MoldAxis;
  /** Where the halves part, % along the direction. */
  parting: number;
  partingFound: boolean;
  undercutMm2: number;
  /** The undercut as a share of the master's surface, %. */
  undercutPercent: number;
  draftMm2: number;
  /** The master's cross-section at the parting, mm²: of equally good directions the larger one gives flatter halves. */
  partingArea: number;
};

/**
 * A high point of the cavity, as poured: where air gathers. `vented` when it gets a vent (or the sprue is there). With
 * the openings set by the user, each opening made is one of these too, where it meets the master, and `opening` is its
 * place in the settings' `openings`, so a click on its post in the view can take it away again.
 */
export type MoldHighPoint = { point: ClearanceVec3; vented: boolean; sprue: boolean; opening?: number };

/** What the analysis of a two-part mold found, for the panel, the preview and the list of findings. */
export type MoldAnalysis = {
  axis: MoldAxis;
  ratings: MoldDirectionRating[];
  rating: MoldDirectionRating;
  /** The undercut faces and the faces with too little draft, as triangles in the scene's frame (nine numbers each). */
  undercutPositions: number[];
  draftPositions: number[];
  /** The parting face as four corners in the scene's frame, round the master with the wall. */
  partingCorners: ClearanceVec3[];
  highPoints: MoldHighPoint[];
  findings: Finding[];
  /** The cavity's volume (with the sprue's channel), ml. */
  volume: number;
  weightG: number;
  /** The mold's outside size, mm (X, Y, Z as the user reads them). */
  outer: [number, number, number];
  /** The direction it opens in (scene frame, unit), and the master's middle and half its diagonal, for the drag handle. */
  up: ClearanceVec3;
  centre: ClearanceVec3;
  reach: number;
  /**
   * The two level directions of the opening's frame in the scene's (unit): an opening set by the user lies `x` along the
   * first and `y` along the second from `centre`, so a point picked in the view can be turned into one (`moldOpeningAt`).
   */
  across: [ClearanceVec3, ClearanceVec3];
  /**
   * The openings the automatic placement makes for this master: a sprue at each separate cavity's highest point (moved
   * by the sprue's shift) and a vent at each other high point that is not switched off. What "Take over the suggested
   * ones" fills the user's list with; the same whether the user sets the openings or not.
   */
  suggested: MoldOpening[];
  /** With the openings set by the user: those (by their place in the list) that lie beside the master and were left out. */
  missedOpenings?: number[];
  /**
   * For a mold in two halves whose cast would stick: how four parts would do, the best way round found (its axis is the
   * pour axis, the parts come off sideways). Left out where two halves do, or four would do no better.
   */
  fourParts?: { axis: MoldAxis; undercutPercent: number };
  /** Poured standing through the seam: the way up as the mold then stands (scene frame, unit); the sprue and vents run along it. */
  pourUp?: ClearanceVec3;
};

/** Where a point of the scene (picked on the master in the view) lies as an opening: across the parting face from the master's middle. */
export function moldOpeningAt(analysis: Pick<MoldAnalysis, "centre" | "across">, point: readonly number[]): { x: number; y: number } {
  const from = [0, 1, 2].map((k) => point[k] - analysis.centre[k]);
  const along = (axis: ClearanceVec3) => from[0] * axis[0] + from[1] * axis[1] + from[2] * axis[2];
  return { x: along(analysis.across[0]), y: along(analysis.across[1]) };
}

export type MoldResult =
  | {
    parts: MoldPart[]; volume: number; warnings: MoldWarning[]; keys: number; vents: number; sprues: number; clearance?: number; parting?: number; partingFound?: boolean;
    analysis?: MoldAnalysis; keysShrunk?: boolean;
    /** With the openings set by the user: how many of them lie beside the master and were left out (`vents` and `sprues` count those made). */
    ownOpenings?: { missed: number };
    /** What to mix for the pour (every kind but the die). */
    mix?: MoldMix;
    /** skin and a contour pour box: how much less silicone it takes than a rectangular pour box with the same gap, ml. */
    saved?: number;
    /** core: how much was cut off the rim to make it level, mm. */
    rimCut?: number;
    /** The mold's outside size, mm (X, Y, Z as the user reads them), closed as it is cast in. */
    outer?: [number, number, number];
  }
  | { error: "notClosed" | "tooSmall" | "empty" | "kernel" | "noHollow"; message?: string };

const SCENE_TO_UP: Mat4 = [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1];
const UP_TO_SCENE: Mat4 = [1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1];
/**
 * From the frame z up to the frame of an opening direction (that direction up), and back. For X the master is turned so
 * its +x points up, for Y its +y (backwards): the mold is then made as for Z, and its "upper" half is the right or the
 * back one.
 */
const TO_OPENING: Record<Exclude<MoldAxis, "free">, Mat4> = {
  z: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  x: [0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 0, 1],
  y: [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1],
};
const FROM_OPENING: Record<Exclude<MoldAxis, "free">, Mat4> = {
  z: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  x: [0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1],
  y: [1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1],
};

/**
 * The free opening direction as a unit vector in the scene's frame (y up). Tilted `tilt` degrees from straight up and
 * turned `turn` degrees about the upright: 90 and 0 is +X (as "x"), 90 and 90 points to the back (-Z, as "y").
 */
export function moldOpeningVector(tilt: number, turn: number): ClearanceVec3 {
  const a = (tilt * Math.PI) / 180;
  const b = (turn * Math.PI) / 180;
  // In the frame z up: (sin a cos b, sin a sin b, cos a); the scene's is (x, z, -y) of it.
  return [Math.sin(a) * Math.cos(b), Math.cos(a), -Math.sin(a) * Math.sin(b)];
}

/**
 * The tilt and turn of a direction in the scene's frame, the way that points up (a mold opens both ways), in whole
 * degrees: what the drag handle sets.
 */
export function moldOpeningAngles(direction: readonly number[]): { tilt: number; turn: number } {
  let [x, y, z] = direction;
  const length = Math.hypot(x, y, z) || 1;
  [x, y, z] = [x / length, y / length, z / length];
  if (y < 0) [x, y, z] = [-x, -y, -z];
  const tilt = Math.round((Math.acos(Math.min(1, Math.max(-1, y))) * 180) / Math.PI);
  const turn = tilt === 0 ? 0 : Math.round((Math.atan2(-z, x) * 180) / Math.PI);
  return { tilt, turn: turn === -180 ? 180 : turn };
}

/** From the frame z up to the frame with the free direction up (a turn that takes it onto z), and back. */
function freeOpening(tilt: number, turn: number): { to: Mat4; from: Mat4 } {
  const a = (tilt * Math.PI) / 180;
  const b = (turn * Math.PI) / 180;
  const v = [Math.sin(a) * Math.cos(b), Math.sin(a) * Math.sin(b), Math.cos(a)];
  // About k = v x z, normalized, by the tilt: Rodrigues' formula.
  const kx = v[1];
  const ky = -v[0];
  const kl = Math.hypot(kx, ky);
  if (kl < 1e-9) return { to: TO_OPENING.z, from: FROM_OPENING.z };
  const [x, y] = [kx / kl, ky / kl];
  const c = Math.cos(a);
  const s = Math.sin(a);
  const t = 1 - c;
  // Rows of R (k has no z part).
  const r = [
    [c + t * x * x, t * x * y, s * y],
    [t * x * y, c + t * y * y, -s * x],
    [-s * y, s * x, c],
  ];
  const to: Mat4 = [r[0][0], r[1][0], r[2][0], 0, r[0][1], r[1][1], r[2][1], 0, r[0][2], r[1][2], r[2][2], 0, 0, 0, 0, 1];
  const from: Mat4 = [r[0][0], r[0][1], r[0][2], 0, r[1][0], r[1][1], r[1][2], 0, r[2][0], r[2][1], r[2][2], 0, 0, 0, 0, 1];
  return { to, from };
}

/** The turns into and out of an opening direction's frame. */
function openingFrame(axis: MoldAxis, options: Pick<MoldOptions, "openTilt" | "openTurn">): { to: Mat4; from: Mat4 } {
  return axis === "free" ? freeOpening(options.openTilt, options.openTurn) : { to: TO_OPENING[axis], from: FROM_OPENING[axis] };
}

/** A point through a column-major matrix. */
function through(matrix: Mat4, [x, y, z]: readonly number[]): ClearanceVec3 {
  return [
    matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12],
    matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13],
    matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14],
  ];
}

/** A point of the opening's frame in the scene's (y up). */
function openingToScene(from: Mat4, point: readonly number[]) {
  return through(UP_TO_SCENE, through(from, point));
}

/** The halves' names for the way they open. */
export function moldHalfRoles(axis: MoldAxis): [MoldPartRole, MoldPartRole] {
  return axis === "x" ? ["left", "right"] : axis === "y" ? ["front", "back"] : ["lower", "upper"];
}

/** Whether an undercut is a hint, a problem or not worth a word, for the material cast. */
export function moldUndercutLevel(material: MoldCastMaterial, percent: number, mm2: number): FindingLevel | null {
  if (mm2 < MOLD_UNDERCUT_TRIFLE_MM2) return null;
  if (!MOLD_CAST_MATERIAL_DATA[material].rigid && percent < MOLD_SILICONE_UNDERCUT_PERCENT) return "hint";
  return "problem";
}

type FaceRating = {
  rating: MoldDirectionRating;
  zp: number;
  /** Per triangle: 1 an undercut, 2 too little draft. */
  flags: Uint8Array;
  corners: Float32Array;
};

/**
 * How a master (turned so the opening points up, z) comes out of its two halves. A face is free in the lower half when
 * it does not face up and nothing of the master lies straight below it (the half is pulled down), free in the upper half
 * when it does not face down and nothing lies straight above it: the sign of its normal alone would miss a face hidden
 * under an overhang. Each face is rated once for each half; the undercut of any parting is then the area of the faces
 * not free in the half they lie in, which finds the best parting quickly (`parting` null) among levels 2.5 % apart:
 * least undercut, then the widest cross-section, then the nearest the middle.
 */
function rateFaces(runtime: ManifoldToplevel, master: ManifoldSolid, axis: MoldAxis, parting: number | null, draftLimit: number, created: { delete?: () => void }[]): FaceRating {
  const mesh = master.getMesh();
  const triangles = mesh.triVerts.length / 3;
  const corners = new Float32Array(triangles * 9);
  for (let corner = 0; corner < mesh.triVerts.length; corner += 1) {
    const offset = mesh.triVerts[corner] * mesh.numProp;
    corners[corner * 3] = mesh.vertProperties[offset];
    corners[corner * 3 + 1] = mesh.vertProperties[offset + 1];
    corners[corner * 3 + 2] = mesh.vertProperties[offset + 2];
  }
  const box = master.boundingBox();
  const [z0, z1] = [box.min[2], box.max[2]];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(corners, 3));
  const bvh = new MeshBVH(geometry);
  const centreZ = new Float32Array(triangles);
  const area = new Float32Array(triangles);
  const normalZ = new Float32Array(triangles);
  const lowerFree = new Uint8Array(triangles);
  const upperFree = new Uint8Array(triangles);
  let surface = 0;
  try {
    const ray = new THREE.Ray();
    const ab = new THREE.Vector3();
    const ac = new THREE.Vector3();
    const normal = new THREE.Vector3();
    const blocked = (tri: number, x: number, y: number, z: number, up: boolean) => {
      ray.origin.set(x, y, z);
      ray.direction.set(0, 0, up ? 1 : -1);
      const hit = bvh.raycastFirst(ray, THREE.DoubleSide);
      return Boolean(hit && hit.faceIndex !== tri && hit.distance > 1e-4);
    };
    for (let tri = 0; tri < triangles; tri += 1) {
      const o = tri * 9;
      ab.set(corners[o + 3] - corners[o], corners[o + 4] - corners[o + 1], corners[o + 5] - corners[o + 2]);
      ac.set(corners[o + 6] - corners[o], corners[o + 7] - corners[o + 1], corners[o + 8] - corners[o + 2]);
      normal.crossVectors(ab, ac);
      const length = normal.length();
      if (length < 1e-12) {
        lowerFree[tri] = 1;
        upperFree[tri] = 1;
        continue;
      }
      normal.divideScalar(length);
      area[tri] = length / 2;
      surface += length / 2;
      normalZ[tri] = normal.z;
      const cx = (corners[o] + corners[o + 3] + corners[o + 6]) / 3;
      const cy = (corners[o + 1] + corners[o + 4] + corners[o + 7]) / 3;
      const cz = (corners[o + 2] + corners[o + 5] + corners[o + 8]) / 3;
      centreZ[tri] = cz;
      // Just off the face, outside, so the face does not block itself.
      const [x, y, z] = [cx + normal.x * 0.01, cy + normal.y * 0.01, cz + normal.z * 0.01];
      lowerFree[tri] = normal.z <= 0.02 && !blocked(tri, x, y, z, false) ? 1 : 0;
      upperFree[tri] = normal.z >= -0.02 && !blocked(tri, x, y, z, true) ? 1 : 0;
    }
  } finally {
    geometry.boundsTree = undefined;
    geometry.dispose();
  }
  const height = Math.max(1e-9, z1 - z0);
  const undercutAt = (zp: number) => {
    let sum = 0;
    for (let tri = 0; tri < triangles; tri += 1) {
      if (!area[tri]) continue;
      if (centreZ[tri] < zp ? !lowerFree[tri] : !upperFree[tri]) sum += area[tri];
    }
    return sum;
  };
  const sliceArea = (zp: number) => {
    const cut = master.slice(Math.min(z1 - 0.05, Math.max(z0 + 0.05, zp)));
    created.push(cut);
    return cut.area();
  };
  let zp: number;
  let found = true;
  if (parting === null) {
    const levels = Array.from({ length: 41 }, (_, index) => z0 + (height * index * 2.5) / 100);
    const rated = levels.map((z) => ({ z, undercut: undercutAt(Math.min(z1 - 0.02, Math.max(z0 + 0.02, z))) }));
    const least = Math.min(...rated.map((level) => level.undercut));
    const tolerance = Math.max(1, surface * 0.002);
    const best = rated.filter((level) => level.undercut <= least + tolerance).map((level) => ({ ...level, area: sliceArea(level.z) }));
    const widest = Math.max(...best.map((level) => level.area), 1e-9);
    // Within 1 % of each other counts as equally wide, so a prism parts in its middle.
    const width = (value: number) => Math.round((value / widest) * 100);
    best.sort((a, b) => width(b.area) - width(a.area) || Math.abs(a.z - (z0 + z1) / 2) - Math.abs(b.z - (z0 + z1) / 2));
    zp = best[0].z;
    found = least < MOLD_UNDERCUT_TRIFLE_MM2;
  } else {
    zp = z0 + (height * parting) / 100;
  }
  const at = Math.min(z1 - 0.02, Math.max(z0 + 0.02, zp));
  const flags = new Uint8Array(triangles);
  const sine = Math.sin((draftLimit * Math.PI) / 180);
  let undercut = 0;
  let draft = 0;
  for (let tri = 0; tri < triangles; tri += 1) {
    if (!area[tri]) continue;
    if (centreZ[tri] < at ? !lowerFree[tri] : !upperFree[tri]) {
      flags[tri] = 1;
      undercut += area[tri];
    } else if (Math.abs(normalZ[tri]) < sine) {
      flags[tri] = 2;
      draft += area[tri];
    }
  }
  void runtime;
  return {
    zp,
    flags,
    corners,
    rating: {
      axis, parting: Math.round(((zp - z0) / height) * 1000) / 10, partingFound: found, undercutMm2: undercut, undercutPercent: surface > 0 ? (undercut / surface) * 100 : 0,
      draftMm2: draft, partingArea: sliceArea(zp),
    },
  };
}

/** The master scaled by `percent` round its centre of mass, so a cast that shrinks by that much comes out at size. */
function grownForShrinkage(master: ManifoldSolid, percent: number, created: { delete?: () => void }[]) {
  if (!(percent > 0)) return master;
  const mesh = master.getMesh();
  let volume = 0;
  const centre = [0, 0, 0];
  for (let index = 0; index < mesh.triVerts.length; index += 3) {
    const p = [0, 1, 2].map((k) => {
      const offset = mesh.triVerts[index + k] * mesh.numProp;
      return [mesh.vertProperties[offset], mesh.vertProperties[offset + 1], mesh.vertProperties[offset + 2]];
    });
    const v = (p[0][0] * (p[1][1] * p[2][2] - p[1][2] * p[2][1]) - p[0][1] * (p[1][0] * p[2][2] - p[1][2] * p[2][0]) + p[0][2] * (p[1][0] * p[2][1] - p[1][1] * p[2][0])) / 6;
    volume += v;
    for (let axis = 0; axis < 3; axis += 1) centre[axis] += (v * (p[0][axis] + p[1][axis] + p[2][axis])) / 4;
  }
  if (Math.abs(volume) < 1e-9) return master;
  const [cx, cy, cz] = centre.map((value) => value / volume);
  const factor = 1 + percent / 100;
  const moved = master.translate([-cx, -cy, -cz]);
  const scaled = moved.scale([factor, factor, factor]);
  const back = scaled.translate([cx, cy, cz]);
  created.push(moved, scaled, back);
  return back;
}

/**
 * The outside of one half as a shell that follows the master (the "contour" outer form): layer by layer from the parting
 * face outward, each `step` thick, the master's cross-sections there grown by the wall, joined with the layer before
 * shrunk by the step, so the outside never overhangs more than 45 degrees as the half prints (parting face up, its back on
 * the plate). Next to the parting face lies a flange as wide as the block, `flange` thick, for the keys, bolts and pry slots;
 * `bosses` are circles the layers keep round the sprue and the vents above the master.
 */
function contourHalf(
  runtime: ManifoldToplevel, master: ManifoldSolid, zp: number, end: number, wall: number, flangeRect: CrossSection, flange: number,
  bosses: CrossSection | null, created: { delete?: () => void }[],
) {
  const keep = <T extends { delete?: () => void }>(value: T): T => (created.push(value), value);
  const up = end > zp;
  const length = Math.abs(end - zp);
  const step = Math.min(2, Math.max(0.6, wall / 3));
  const count = Math.max(1, Math.ceil(length / step));
  const bands: ManifoldSolid[] = [];
  let previous: CrossSection | null = null;
  const box = master.boundingBox();
  for (let index = 0; index < count; index += 1) {
    const near = zp + (up ? 1 : -1) * index * (length / count);
    const far = zp + (up ? 1 : -1) * (index + 1) * (length / count);
    const cuts = [near, (near + far) / 2, far]
      .map((z) => Math.min(box.max[2] - 0.01, Math.max(box.min[2] + 0.01, z)))
      .filter((z) => z > box.min[2] && z < box.max[2])
      .map((z) => keep(master.slice(z)));
    let area: CrossSection = cuts.length ? keep(keep(runtime.CrossSection.union(cuts)).offset(wall, "Round", 2, 32)) : keep(runtime.CrossSection.square([0, 0]));
    if (Math.min(Math.abs(near - zp), Math.abs(far - zp)) < flange) area = keep(area.add(flangeRect));
    if (previous) area = keep(area.add(keep(previous.offset(-(length / count), "Round", 2, 32))));
    if (bosses && (up ? far > box.max[2] - 1 : false)) area = keep(area.add(bosses));
    if (area.area() > 1e-3) bands.push(keep(keep(area.extrude(length / count + 0.01)).translate([0, 0, Math.min(near, far) - (up ? 0.005 : 0.005)])));
    previous = area;
  }
  return bands.length === 1 ? bands[0] : keep(runtime.Manifold.union(bands));
}


function keep<T extends { delete?: () => void }>(created: { delete?: () => void }[], value: T): T {
  created.push(value);
  return value;
}

/** The points of a mesh, z up. */
function pointsOf(solid: ManifoldSolid): [number, number, number][] {
  const mesh = solid.getMesh();
  const points: [number, number, number][] = [];
  for (let index = 0; index < mesh.vertProperties.length; index += mesh.numProp) {
    points.push([mesh.vertProperties[index], mesh.vertProperties[index + 1], mesh.vertProperties[index + 2]]);
  }
  return points;
}

/**
 * Whether a cast would stick: cut at `steps` heights between `low` and `high`, each cut must fit within the next one
 * the way the cast comes out (`upward`: the cut above; else the one below). More than 1 mm² sticking out is an undercut.
 */
function hasUndercut(runtime: ManifoldToplevel, solid: ManifoldSolid, low: number, high: number, upward: boolean, created: { delete?: () => void }[]) {
  const steps = 16;
  if (high - low < 0.5) return false;
  let previous: CrossSection | null = null;
  for (let step = 0; step <= steps; step += 1) {
    const z = low + 0.15 + ((high - low - 0.3) * (upward ? step : steps - step)) / steps;
    const cut = keep(created, solid.slice(z));
    if (previous && keep(created, previous.subtract(cut)).area() > 1) return true;
    previous = cut;
  }
  void runtime;
  return false;
}

/**
 * How low a channel `r` wide coming down at (x, y) onto the master's top at `top` must reach before the master is wider
 * than it all round: stopped higher, it leaves a thin ring of the mold and a flat ceiling under it where the master's top
 * is round. Not below `floor`.
 */
function channelBottom(runtime: ManifoldToplevel, solid: ManifoldSolid, x: number, y: number, top: number, r: number, floor: number, created: { delete?: () => void }[]) {
  const circle = keep(created, keep(created, runtime.CrossSection.circle(r + 0.1, 48)).translate([x, y]));
  for (let z = top - 0.3; z > floor; z -= 0.25) {
    const cut = keep(created, solid.slice(z));
    if (keep(created, circle.subtract(cut)).area() < 0.01) return z;
  }
  return Math.max(floor, top - 0.3);
}

/** The height of the master's top over (x, y), searched down from its top in steps of 0.25 mm; null where it is not. */
function topAt(runtime: ManifoldToplevel, solid: ManifoldSolid, x: number, y: number, low: number, high: number, created: { delete?: () => void }[]) {
  const dot = keep(created, keep(created, runtime.CrossSection.circle(0.2, 12)).translate([x, y]));
  for (let z = high - 0.05; z > low; z -= 0.25) {
    const cut = keep(created, solid.slice(z));
    if (keep(created, dot.intersect(cut)).area() > 0.05) return z;
  }
  return null;
}

/**
 * The height of the master's top straight over (x, y), read off its faces: the highest of them there, null beside the
 * master. For an opening set by the user; exact where `topAt` searches in steps, so that the suggested openings taken
 * over as they are give the very mold the automatic placement makes (the funnel's depth hangs on this height).
 */
function heightOver(mesh: { triVerts: Uint32Array; vertProperties: Float32Array; numProp: number }, x: number, y: number) {
  let top: number | null = null;
  const at = (index: number) => {
    const offset = mesh.triVerts[index] * mesh.numProp;
    return [mesh.vertProperties[offset], mesh.vertProperties[offset + 1], mesh.vertProperties[offset + 2]];
  };
  for (let index = 0; index < mesh.triVerts.length; index += 3) {
    const [a, b, c] = [at(index), at(index + 1), at(index + 2)];
    if (x < Math.min(a[0], b[0], c[0]) - 1e-6 || x > Math.max(a[0], b[0], c[0]) + 1e-6 || y < Math.min(a[1], b[1], c[1]) - 1e-6 || y > Math.max(a[1], b[1], c[1]) + 1e-6) continue;
    const area = (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]);
    // An upright face has no height of its own over a point: the faces it joins have.
    if (Math.abs(area) < 1e-9) continue;
    const u = ((b[0] - x) * (c[1] - y) - (c[0] - x) * (b[1] - y)) / area;
    const v = ((c[0] - x) * (a[1] - y) - (a[0] - x) * (c[1] - y)) / area;
    const w = 1 - u - v;
    if (u < -1e-6 || v < -1e-6 || w < -1e-6) continue;
    const z = u * a[2] + v * b[2] + w * c[2];
    if (top === null || z > top) top = z;
  }
  return top;
}

/**
 * The master's top as heights above its bottom over a grid of `cell` from (x0, y0) to (x1, y1): for a relief stamp. Each
 * node takes the highest of the cells round it, so the relief is never lower than the master; `grown(t)` gives it grown
 * by `t` all round as a ball rolled over it would (the sheet lying on it), node by node.
 */
function reliefField(solid: ManifoldSolid, cell: number, x0: number, y0: number, x1: number, y1: number, bottom: number) {
  const nx = Math.max(1, Math.ceil((x1 - x0) / cell));
  const ny = Math.max(1, Math.ceil((y1 - y0) / cell));
  const shifted = heightMap(solid, cell, x0, y0);
  const cells = new Float32Array(nx * ny);
  for (let i = 0; i < nx; i += 1) for (let j = 0; j < ny; j += 1) cells[i * ny + j] = Math.max(0, (shifted.get(`${i},${j}`) ?? bottom) - bottom);
  const cellAt = (i: number, j: number) => (i < 0 || j < 0 || i >= nx || j >= ny ? 0 : cells[i * ny + j]);
  const node = (i: number, j: number) => Math.max(cellAt(i - 1, j - 1), cellAt(i, j - 1), cellAt(i - 1, j), cellAt(i, j));
  return {
    x0, y0, nx, ny, y1: y0 + ny * cell,
    node,
    grown(t: number) {
      const reach = Math.ceil(t / cell);
      const out = new Float32Array((nx + 1) * (ny + 1));
      for (let i = 0; i <= nx; i += 1) {
        for (let j = 0; j <= ny; j += 1) {
          let best = t;
          for (let di = -reach; di <= reach; di += 1) {
            for (let dj = -reach; dj <= reach; dj += 1) {
              const d = Math.hypot(di, dj) * cell;
              if (d > t) continue;
              const ii = i + di;
              const jj = j + dj;
              if (ii < 0 || jj < 0 || ii > nx || jj > ny) continue;
              best = Math.max(best, node(ii, jj) + Math.sqrt(t * t - d * d));
            }
          }
          out[i * (ny + 1) + j] = best;
        }
      }
      return (i: number, j: number) => out[Math.min(nx, Math.max(0, i)) * (ny + 1) + Math.min(ny, Math.max(0, j))];
    },
  };
}

/**
 * A closed solid between two surfaces over a grid of nodes `cell` apart from (x0, y0): `lower(i, j)` and `upper(i, j)`
 * give each node's heights (upper kept at least 0.01 above lower), the sides close it all round.
 */
function terrain(runtime: ManifoldToplevel, x0: number, y0: number, cell: number, nx: number, ny: number, lower: (i: number, j: number) => number, upper: (i: number, j: number) => number, created: { delete?: () => void }[]) {
  const nodes = (nx + 1) * (ny + 1);
  const vertProperties = new Float32Array(nodes * 2 * 3);
  const at = (i: number, j: number) => i * (ny + 1) + j;
  for (let i = 0; i <= nx; i += 1) {
    for (let j = 0; j <= ny; j += 1) {
      const low = lower(i, j);
      const high = Math.max(low + 0.01, upper(i, j));
      const index = at(i, j);
      vertProperties.set([x0 + i * cell, y0 + j * cell, low], index * 3);
      vertProperties.set([x0 + i * cell, y0 + j * cell, high], (nodes + index) * 3);
    }
  }
  const tris: number[] = [];
  const top = (i: number, j: number) => nodes + at(i, j);
  const bottom = (i: number, j: number) => at(i, j);
  for (let i = 0; i < nx; i += 1) {
    for (let j = 0; j < ny; j += 1) {
      tris.push(top(i, j), top(i + 1, j), top(i + 1, j + 1), top(i, j), top(i + 1, j + 1), top(i, j + 1));
      tris.push(bottom(i, j), bottom(i + 1, j + 1), bottom(i + 1, j), bottom(i, j), bottom(i, j + 1), bottom(i + 1, j + 1));
    }
  }
  for (let i = 0; i < nx; i += 1) {
    // Front (y0) and back.
    tris.push(bottom(i, 0), bottom(i + 1, 0), top(i + 1, 0), bottom(i, 0), top(i + 1, 0), top(i, 0));
    tris.push(bottom(i, ny), top(i + 1, ny), bottom(i + 1, ny), bottom(i, ny), top(i, ny), top(i + 1, ny));
  }
  for (let j = 0; j < ny; j += 1) {
    // Left (x0) and right.
    tris.push(bottom(0, j), top(0, j + 1), bottom(0, j + 1), bottom(0, j), top(0, j), top(0, j + 1));
    tris.push(bottom(nx, j), bottom(nx, j + 1), top(nx, j + 1), bottom(nx, j), top(nx, j + 1), top(nx, j));
  }
  const mesh = new runtime.Mesh({ numProp: 3, vertProperties, triVerts: Uint32Array.from(tris) });
  return keep(created, new runtime.Manifold(mesh));
}

/** A level solid: `area` from `low` to `high`. */
function prismOf(created: { delete?: () => void }[], area: CrossSection, low: number, high: number) {
  return keep(created, keep(created, area.extrude(high - low)).translate([0, 0, low]));
}

/** A box from corner to corner. */
function block(runtime: ManifoldToplevel, created: { delete?: () => void }[], [x0, y0, z0]: number[], [x1, y1, z1]: number[]) {
  return keep(created, keep(created, runtime.Manifold.cube([x1 - x0, y1 - y0, z1 - z0])).translate([x0, y0, z0]));
}

/** An upright cylinder or cone round (x, y) from `low` up `height`, `r0` wide at the bottom and `r1` at the top. */
function upright(runtime: ManifoldToplevel, created: { delete?: () => void }[], x: number, y: number, low: number, height: number, r0: number, r1 = r0) {
  return keep(created, keep(created, runtime.Manifold.cylinder(height, r0, r1, SIDES)).translate([x, y, low]));
}

function unionOf(runtime: ManifoldToplevel, created: { delete?: () => void }[], parts: ManifoldSolid[]) {
  return parts.length === 1 ? parts[0] : keep(created, runtime.Manifold.union(parts));
}

/** The master's top surface seen from above: the highest point of it over each cell of a grid `cell` mm wide. */
function heightMap(solid: ManifoldSolid, cell: number, ox = 0, oy = 0) {
  const mesh = solid.getMesh();
  const heights = new Map<string, number>();
  const put = (i: number, j: number, z: number) => {
    const key = `${i},${j}`;
    const current = heights.get(key);
    if (current === undefined || z > current) heights.set(key, z);
  };
  const at = (index: number) => {
    const offset = mesh.triVerts[index] * mesh.numProp;
    return [mesh.vertProperties[offset] - ox, mesh.vertProperties[offset + 1] - oy, mesh.vertProperties[offset + 2]];
  };
  for (let index = 0; index < mesh.triVerts.length; index += 3) {
    const [a, b, c] = [at(index), at(index + 1), at(index + 2)];
    for (const point of [a, b, c]) put(Math.floor(point[0] / cell), Math.floor(point[1] / cell), point[2]);
    const area = (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]);
    if (Math.abs(area) < 1e-9) continue;
    const i0 = Math.floor(Math.min(a[0], b[0], c[0]) / cell);
    const i1 = Math.floor(Math.max(a[0], b[0], c[0]) / cell);
    const j0 = Math.floor(Math.min(a[1], b[1], c[1]) / cell);
    const j1 = Math.floor(Math.max(a[1], b[1], c[1]) / cell);
    for (let i = i0; i <= i1; i += 1) {
      for (let j = j0; j <= j1; j += 1) {
        const x = (i + 0.5) * cell;
        const y = (j + 0.5) * cell;
        const u = ((b[0] - x) * (c[1] - y) - (c[0] - x) * (b[1] - y)) / area;
        const v = ((c[0] - x) * (a[1] - y) - (a[0] - x) * (c[1] - y)) / area;
        const w = 1 - u - v;
        if (u >= -1e-9 && v >= -1e-9 && w >= -1e-9) put(i, j, u * a[2] + v * b[2] + w * c[2]);
      }
    }
  }
  return heights;
}

/**
 * Where air is trapped under the mold's ceiling, as (x, y, z), the highest first: the level patches of the master's top
 * surface (within 0.2 mm) that nothing higher touches, each at the middle of its patch. A patch over `above` only.
 */
function airTraps(solid: ManifoldSolid, cell: number, above: number) {
  const heights = heightMap(solid, cell);
  const seen = new Set<string>();
  const traps: [number, number, number][] = [];
  const order = [...heights.entries()].sort((a, b) => b[1] - a[1]);
  for (const [start, level] of order) {
    if (seen.has(start) || level <= above) continue;
    const patch: string[] = [start];
    const inPatch = new Set(patch);
    seen.add(start);
    let trapped = true;
    for (let index = 0; index < patch.length; index += 1) {
      const [i, j] = patch[index].split(",").map(Number);
      for (let di = -1; di <= 1; di += 1) {
        for (let dj = -1; dj <= 1; dj += 1) {
          const key = `${i + di},${j + dj}`;
          const z = heights.get(key);
          if (z === undefined || inPatch.has(key)) continue;
          if (z > level + 0.2) trapped = false;
          else if (z >= level - 0.2 && !seen.has(key)) {
            seen.add(key);
            inPatch.add(key);
            patch.push(key);
          }
        }
      }
    }
    if (!trapped) continue;
    const cells = patch.map((key) => key.split(",").map(Number));
    const mx = cells.reduce((sum, [i]) => sum + i, 0) / cells.length;
    const my = cells.reduce((sum, [, j]) => sum + j, 0) / cells.length;
    // The patch's cell nearest its middle, so the vent stands on it even when the patch is a ring.
    const [i, j] = cells.reduce((best, here) => (Math.hypot(here[0] - mx, here[1] - my) < Math.hypot(best[0] - mx, best[1] - my) ? here : best));
    traps.push([(i + 0.5) * cell, (j + 0.5) * cell, heights.get(`${i},${j}`) ?? level]);
  }
  return traps;
}

/** Where the master is highest: of its points within 0.2 mm of its top the one nearest their middle. */
function topSpot(points: [number, number, number][]) {
  // A loop, not Math.max(...): a fine master has hundreds of thousands of points, more than a call takes arguments.
  let top = Number.NEGATIVE_INFINITY;
  for (const point of points) if (point[2] > top) top = point[2];
  const near = points.filter((point) => point[2] >= top - 0.2);
  const mx = near.reduce((sum, point) => sum + point[0], 0) / near.length;
  const my = near.reduce((sum, point) => sum + point[1], 0) / near.length;
  // On the master itself: the middle of a ring (a torus lying flat) is not.
  const [x, y, z] = near.reduce((best, point) => (Math.hypot(point[0] - mx, point[1] - my) < Math.hypot(best[0] - mx, best[1] - my) ? point : best));
  return { x, y, z };
}

/**
 * A cylinder or cone along a level axis (0 x, 1 y): from `from` on that axis `length` on (negative: the other way),
 * `r0` wide at `from` and `r1` at its end, at `other` on the other level axis and `z` high.
 */
function level(runtime: ManifoldToplevel, created: { delete?: () => void }[], axis: 0 | 1, from: number, length: number, other: number, z: number, r0: number, r1 = r0) {
  const forward = length >= 0;
  const rod = keep(created, runtime.Manifold.cylinder(Math.abs(length), forward ? r0 : r1, forward ? r1 : r0, SIDES));
  const turned = keep(created, rod.rotate(axis === 0 ? [0, 90, 0] : [-90, 0, 0]));
  const start = forward ? from : from + length;
  return keep(created, turned.translate(axis === 0 ? [start, other, z] : [other, start, z]));
}

/** A box given along a level axis (`u` along it, `v` across), so the same part can sit on a left/right or a front/back face. */
function blockOn(runtime: ManifoldToplevel, created: { delete?: () => void }[], axis: 0 | 1, [u0, v0, z0]: number[], [u1, v1, z1]: number[]) {
  const [a0, a1] = [Math.min(u0, u1), Math.max(u0, u1)];
  const [b0, b1] = [Math.min(v0, v1), Math.max(v0, v1)];
  return axis === 0 ? block(runtime, created, [a0, b0, z0], [a1, b1, z1]) : block(runtime, created, [b0, a0, z0], [b1, a1, z1]);
}

/** A cone hanging from `top` down `height` to its point, `radius` wide at the top. */
function hanging(runtime: ManifoldToplevel, created: { delete?: () => void }[], x: number, y: number, top: number, height: number, radius: number) {
  return keep(created, keep(created, keep(created, runtime.Manifold.cylinder(height, radius, 0, SIDES)).rotate([180, 0, 0])).translate([x, y, top]));
}

/** An area with nothing in it. */
function nothing(runtime: ManifoldToplevel, created: { delete?: () => void }[]) {
  return keep(created, runtime.CrossSection.square([0, 0]));
}

/** An area without its holes: the outer outlines only (a ring's hole is filled). */
function withoutHoles(runtime: ManifoldToplevel, created: { delete?: () => void }[], area: CrossSection) {
  const outer = area.toPolygons().filter((polygon) => {
    let twice = 0;
    for (let index = 0; index < polygon.length; index += 1) {
      const [x0, y0] = polygon[index];
      const [x1, y1] = polygon[(index + 1) % polygon.length];
      twice += x0 * y1 - x1 * y0;
    }
    return twice > 0;
  });
  return outer.length ? keep(created, runtime.CrossSection.ofPolygons(outer, "Positive")) : nothing(runtime, created);
}

/**
 * How a master (turned so the pour axis points up, z) comes out of a mold in four parts: a part on each side, right,
 * left, back and front, meeting on the two upright planes through the block's middle and its corners (`width` and
 * `depth` are the block's size across), each coming off straight sideways. A face is free when it does not face against
 * the way its part comes off and nothing of the master lies beyond it that way. Recesses and undercuts on all four
 * sides, which stick in any two halves, come free like this.
 */
function rateSides(master: ManifoldSolid, axis: MoldAxis, margin: number): FaceRating {
  const mesh = master.getMesh();
  const triangles = mesh.triVerts.length / 3;
  const corners = new Float32Array(triangles * 9);
  for (let corner = 0; corner < mesh.triVerts.length; corner += 1) {
    const offset = mesh.triVerts[corner] * mesh.numProp;
    corners[corner * 3] = mesh.vertProperties[offset];
    corners[corner * 3 + 1] = mesh.vertProperties[offset + 1];
    corners[corner * 3 + 2] = mesh.vertProperties[offset + 2];
  }
  const box = master.boundingBox();
  const mx = (box.min[0] + box.max[0]) / 2;
  const my = (box.min[1] + box.max[1]) / 2;
  const width = box.max[0] - box.min[0] + 2 * margin;
  const depth = box.max[1] - box.min[1] + 2 * margin;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(corners, 3));
  const bvh = new MeshBVH(geometry);
  const flags = new Uint8Array(triangles);
  let surface = 0;
  let undercut = 0;
  try {
    const ray = new THREE.Ray();
    const ab = new THREE.Vector3();
    const ac = new THREE.Vector3();
    const normal = new THREE.Vector3();
    for (let tri = 0; tri < triangles; tri += 1) {
      const o = tri * 9;
      ab.set(corners[o + 3] - corners[o], corners[o + 4] - corners[o + 1], corners[o + 5] - corners[o + 2]);
      ac.set(corners[o + 6] - corners[o], corners[o + 7] - corners[o + 1], corners[o + 8] - corners[o + 2]);
      normal.crossVectors(ab, ac);
      const length = normal.length();
      if (length < 1e-12) continue;
      normal.divideScalar(length);
      const area = length / 2;
      surface += area;
      const cx = (corners[o] + corners[o + 3] + corners[o + 6]) / 3;
      const cy = (corners[o + 1] + corners[o + 4] + corners[o + 7]) / 3;
      const cz = (corners[o + 2] + corners[o + 5] + corners[o + 8]) / 3;
      const [dx, dy] = moldSideOf((cx - mx) / width, (cy - my) / depth);
      let free = normal.x * dx + normal.y * dy >= -0.02;
      if (free) {
        ray.origin.set(cx + normal.x * 0.01, cy + normal.y * 0.01, cz + normal.z * 0.01);
        ray.direction.set(dx, dy, 0);
        const hit = bvh.raycastFirst(ray, THREE.DoubleSide);
        free = !(hit && hit.faceIndex !== tri && hit.distance > 1e-4);
      }
      if (!free) {
        flags[tri] = 1;
        undercut += area;
      }
    }
  } finally {
    geometry.boundsTree = undefined;
    geometry.dispose();
  }
  return {
    zp: (box.min[2] + box.max[2]) / 2,
    flags,
    corners,
    rating: { axis, parting: 50, partingFound: true, undercutMm2: undercut, undercutPercent: surface > 0 ? (undercut / surface) * 100 : 0, draftMm2: 0, partingArea: 0 },
  };
}

/** The way the side part comes off that a point lies in, `u` and `v` being its place across the block from the middle (-0.5 to 0.5). */
function moldSideOf(u: number, v: number): [number, number] {
  return Math.abs(u) >= Math.abs(v) ? [u < 0 ? -1 : 1, 0] : [0, v < 0 ? -1 : 1];
}

/** A cone lying level, its foot at (x, y, z), `radius` wide there, pointing `height` far along the level direction (dx, dy). */
function levelCone(runtime: ManifoldToplevel, created: { delete?: () => void }[], x: number, y: number, z: number, dx: number, dy: number, radius: number, height: number) {
  const cone = keep(created, keep(created, runtime.Manifold.cylinder(height, radius, 0, SIDES)).rotate([0, 90, 0]));
  return keep(created, keep(created, cone.rotate([0, 0, (Math.atan2(dy, dx) * 180) / Math.PI])).translate([x, y, z]));
}

/** The middle of an outline's points furthest towards the low end of a level axis (within 0.2 mm of it), as [along, across]. */
function seamSpot(area: CrossSection, axis: 0 | 1): [number, number] | null {
  const points = area.toPolygons().flat();
  if (!points.length) return null;
  let low = Number.POSITIVE_INFINITY;
  for (const point of points) if (point[axis] < low) low = point[axis];
  const near = points.filter((point) => point[axis] <= low + 0.2);
  const across = near.map((point) => point[1 - axis]);
  return [low, (Math.min(...across) + Math.max(...across)) / 2];
}

/** A part turned for printing: degrees about X, Y and Z. */
type Turn = [number, number, number];

type KindParts = {
  parts: { role: MoldPartRole; solid: ManifoldSolid; number?: number }[];
  /** How each part is turned to print (those not named stand as they are made). */
  turned: Map<unknown, Turn>;
  /** What is poured, ml. */
  volume: number;
  saved?: number;
  rimCut?: number;
  keys?: number;
  vents?: number;
  sprues?: number;
};

/** The flange a shell in two halves is bolted together at: this thick on each half and this far out, in mm. */
const SHELL_FLANGE_THICK = 4;
const SHELL_FLANGE_REACH = 12;
/** A base plate reaches this far beyond what stands on it, and its notches for rubber bands are this wide and deep, in mm. */
const BASE_MARGIN = 6;
const BASE_NOTCH_WIDTH = 6;
const BASE_NOTCH_DEPTH = 3;

/**
 * The silicone skin mold (`skin`): a base plate the master sits on, and a shell over it that leaves `gap` for the
 * silicone all round. Worked out in layers from the bottom up. The shell's inside at a layer is everything of the master
 * at or above it grown by the gap (so it never widens upward and lifts off the cured silicone), and a cap over what lies
 * just below; its outside is the wall round that and never grows faster than 45 degrees towards the bottom, because the
 * shell prints roof down, as a cup. The roof is flat: the shell stands on it when the finished mold is cast in. Where the
 * roof is much smaller than the shell's foot, a ring round it gives it the footing. The silicone goes in through a
 * sprue over the master's highest point; every other high point of the inside gets a vent. A shell in two halves has a
 * flange with bolt holes at the seam.
 */
function skinMold(runtime: ManifoldToplevel, created: { delete?: () => void }[], master: ManifoldSolid, options: MoldOptions): KindParts {
  const k = <T extends { delete?: () => void }>(value: T): T => keep(created, value);
  const box = master.boundingBox();
  const [bx0, by0, bz0] = box.min;
  const [bx1, by1, bz1] = box.max;
  const g = options.gap;
  const w = options.wall;
  const top = bz1 + g;
  const count = Math.max(2, Math.ceil((top - bz0) / Math.min(2, Math.max(0.5, g / 4))));
  const dz = (top - bz0) / count;
  // Every outline is thinned to what 0.02 mm tells apart: joined and grown again layer upon layer, they would
  // otherwise gather thousands of points each.
  const thin = (area: CrossSection) => k(area.simplify(0.02));
  const round = (area: CrossSection, by: number) => thin(k(area.offset(by, "Round", 2, 32)));
  // The master's cross-section over each layer: at its bottom, middle and top, nothing above the master.
  const cuts: CrossSection[] = [];
  for (let index = 0; index < count; index += 1) {
    const z0 = bz0 + index * dz;
    const levels = [z0, z0 + dz / 2, z0 + dz].filter((z) => z < bz1 + 1e-6).map((z) => Math.min(bz1 - 0.01, Math.max(bz0 + 0.01, z)));
    cuts.push(levels.length ? thin(k(runtime.CrossSection.union(levels.map((z) => k(master.slice(z)))))) : nothing(runtime, created));
  }
  const above: CrossSection[] = new Array(count);
  let gathered = nothing(runtime, created);
  for (let index = count - 1; index >= 0; index -= 1) {
    gathered = thin(k(gathered.add(cuts[index])));
    above[index] = gathered;
  }
  const inner: CrossSection[] = [];
  for (let index = 0; index < count; index += 1) {
    let area = round(above[Math.max(0, index - 1)], g);
    for (let down = 2; (down - 1) * dz < g && index - down >= 0; down += 1) {
      const radius = Math.sqrt(g * g - (down - 1) * dz * ((down - 1) * dz));
      if (radius > 0.05 && !cuts[index - down].isEmpty()) area = k(area.add(round(cuts[index - down], radius)));
    }
    inner.push(thin(area));
  }
  const outer: CrossSection[] = [];
  for (let index = 0; index < count; index += 1) {
    let area = round(inner[index], w);
    if (index > 0) area = k(area.add(round(outer[index - 1], -dz)));
    outer.push(thin(area));
  }
  // In two halves: parted across the longer side unless a direction is asked for, with a flange at the seam.
  const split = options.shellSplit;
  const across: 0 | 1 = options.direction === "x" ? 0 : options.direction === "y" ? 1 : bx1 - bx0 >= by1 - by0 ? 0 : 1;
  const middle = across === 0 ? (bx0 + bx1) / 2 : (by0 + by1) / 2;
  const far = Math.max(bx1 - bx0, by1 - by0) + 4 * (g + w + SHELL_FLANGE_REACH) + 20;
  const strip = split
    ? k(runtime.CrossSection.square(across === 0 ? [2 * SHELL_FLANGE_THICK, 2 * far] : [2 * far, 2 * SHELL_FLANGE_THICK])
      .translate(across === 0 ? [middle - SHELL_FLANGE_THICK, (by0 + by1) / 2 - far] : [(bx0 + bx1) / 2 - far, middle - SHELL_FLANGE_THICK]))
    : null;
  const walls = outer.map((area) => (strip ? thin(k(area.add(k(round(area, SHELL_FLANGE_REACH).intersect(strip))))) : area));
  const slab = (area: CrossSection, low: number, high: number) => k(k(area.extrude(high - low + 0.01)).translate([0, 0, low - 0.005]));
  const layers: ManifoldSolid[] = [];
  const blanketLayers: ManifoldSolid[] = [];
  for (let index = 0; index < count; index += 1) {
    const z0 = bz0 + index * dz;
    const ring = k(walls[index].subtract(inner[index]));
    // The foot stands BOX_GROOVE deep in the base's groove, and ends exactly there.
    if (ring.area() > 1e-3) layers.push(index === 0 ? prismOf(created, ring, z0 - BOX_GROOVE, z0 + dz + 0.005) : slab(ring, z0, z0 + dz));
    if (inner[index].area() > 1e-3) blanketLayers.push(slab(inner[index], z0, z0 + dz));
  }
  const roofTop = top + w;
  layers.push(slab(walls[count - 1], top, roofTop));
  // A small roof under a wide shell: a ring from the highest wide layer up to the roof's level, to stand on.
  const foot = outer[0].area();
  if (outer[count - 1].area() < 0.5 * foot) {
    let wide = 0;
    for (let index = count - 1; index >= 0; index -= 1) {
      if (outer[index].area() >= 0.5 * foot) {
        wide = index;
        break;
      }
    }
    const ring = k(walls[wide].subtract(round(walls[wide], -Math.max(1.6, w / 2))));
    if (ring.area() > 1e-3) layers.push(slab(ring, bz0 + wide * dz, roofTop));
  }
  let shell = unionOf(runtime, created, layers);
  const blanket = unionOf(runtime, created, blanketLayers);
  // The sprue over the master's highest point, countersunk into the roof as a funnel.
  const r = options.sprueDiameter / 2;
  const spot = topMiddle(master);
  const cutters: ManifoldSolid[] = [upright(runtime, created, spot.x, spot.y, top - dz - 0.5, w + dz + 2, r)];
  const funnel = Math.min(w - 1.2, Math.max(r + 3, 10) - r);
  if (funnel > 0.3) cutters.push(upright(runtime, created, spot.x, spot.y, roofTop - funnel, funnel + 0.01, r, r + funnel));
  // A vent at every other high point of the inside: the air under a lower roof has no other way out. A high point is
  // a piece of a layer's inside with nothing of the inside over it.
  let vents = 0;
  if (options.vents) {
    const peaks: [number, number, number][] = [];
    for (let index = count - 1; index >= 0 && peaks.length < 24; index -= 1) {
      for (const piece of inner[index].decompose().map((part) => k(part))) {
        if (piece.area() < 0.5 || (index < count - 1 && k(piece.intersect(inner[index + 1])).area() > 1e-3)) continue;
        const bounds = piece.bounds();
        let [x, y] = [(bounds.min[0] + bounds.max[0]) / 2, (bounds.min[1] + bounds.max[1]) / 2];
        // A piece that is a ring or a hook does not hold its own middle: one of its own points then.
        if (k(piece.intersect(k(runtime.CrossSection.circle(0.3, 12).translate([x, y])))).area() < 0.05) [x, y] = piece.toPolygons()[0][0];
        peaks.push([x, y, bz0 + (index + 1) * dz]);
      }
    }
    const kept: [number, number, number][] = [];
    for (const peak of peaks) {
      if (Math.hypot(peak[0] - spot.x, peak[1] - spot.y) <= r + g + options.ventDiameter * 2) continue;
      if (kept.every(([x, y]) => Math.hypot(peak[0] - x, peak[1] - y) > options.ventDiameter * 3)) kept.push(peak);
      if (kept.length >= 8) break;
    }
    for (const [x, y, z] of kept) cutters.push(upright(runtime, created, x, y, z - dz - 0.5, roofTop - z + dz + 1.5, options.ventDiameter / 2));
    vents = kept.length;
  }
  if (split) {
    // Bolt holes through both flanges, on either side of the shell, at one or two heights.
    const tall = top - bz0;
    const heights = tall >= 40 ? [bz0 + tall * 0.25, bz0 + tall * 0.75] : [bz0 + tall / 2];
    for (const z of heights) {
      const index = Math.min(count - 1, Math.max(0, Math.floor((z - bz0) / dz)));
      const bounds = k(outer[index].intersect(strip!)).bounds();
      const other = 1 - across;
      if (!(bounds.max[other] > bounds.min[other])) continue;
      for (const at of [bounds.min[other] - SHELL_FLANGE_REACH / 2, bounds.max[other] + SHELL_FLANGE_REACH / 2]) {
        cutters.push(level(runtime, created, across, middle - SHELL_FLANGE_THICK - 1, 2 * SHELL_FLANGE_THICK + 2, at, z, options.screwDiameter / 2));
      }
    }
  }
  shell = k(shell.subtract(unionOf(runtime, created, cutters)));
  // The base: a plate round the shell's foot with a groove the shell stands in and a shallow seat for the master.
  const footprint = walls[0];
  const plate = round(footprint, BASE_MARGIN);
  let base = prismOf(created, plate, bz0 - options.floor - BOX_GROOVE, bz0);
  const groove = k(round(footprint, BOX_GROOVE_PLAY).subtract(round(inner[0], -BOX_GROOVE_PLAY)));
  base = k(base.subtract(prismOf(created, groove, bz0 - BOX_GROOVE, bz0 + 1)));
  const seat = k(master.slice(bz0 + Math.min(0.3, (bz1 - bz0) / 4)));
  if (seat.area() > 1) base = k(base.subtract(prismOf(created, round(seat, BOX_SEAT_PLAY), bz0 - BOX_SEAT, bz0 + 1)));
  // Notches in the plate's edge for rubber bands over the shell: the silicone lifts a shell that is not held down.
  const edge = plate.bounds();
  const [mx, my] = [(edge.min[0] + edge.max[0]) / 2, (edge.min[1] + edge.max[1]) / 2];
  const low = bz0 - options.floor - BOX_GROOVE - 1;
  const notches = [
    block(runtime, created, [edge.min[0] - 1, my - BASE_NOTCH_WIDTH / 2, low], [edge.min[0] + BASE_NOTCH_DEPTH, my + BASE_NOTCH_WIDTH / 2, bz0 + 1]),
    block(runtime, created, [edge.max[0] - BASE_NOTCH_DEPTH, my - BASE_NOTCH_WIDTH / 2, low], [edge.max[0] + 1, my + BASE_NOTCH_WIDTH / 2, bz0 + 1]),
    block(runtime, created, [mx - BASE_NOTCH_WIDTH / 2, edge.min[1] - 1, low], [mx + BASE_NOTCH_WIDTH / 2, edge.min[1] + BASE_NOTCH_DEPTH, bz0 + 1]),
    block(runtime, created, [mx - BASE_NOTCH_WIDTH / 2, edge.max[1] - BASE_NOTCH_DEPTH, low], [mx + BASE_NOTCH_WIDTH / 2, edge.max[1] + 1, bz0 + 1]),
  ];
  base = k(base.subtract(unionOf(runtime, created, notches)));
  const volume = Math.max(0, blanket.volume() - master.volume()) / 1000;
  const boxed = ((bx1 - bx0 + 2 * g) * (by1 - by0 + 2 * g) * (bz1 - bz0 + g) - master.volume()) / 1000;
  const parts: KindParts["parts"] = [{ role: "skinBase", solid: base }];
  const turned = new Map<unknown, Turn>();
  if (split) {
    const normal: [number, number, number] = across === 0 ? [1, 0, 0] : [0, 1, 0];
    const halves = [k(shell.trimByPlane([-normal[0], -normal[1], 0], -middle)), k(shell.trimByPlane(normal, middle))];
    halves.forEach((half, index) => {
      parts.push({ role: "skinShellHalf", solid: half, number: index + 1 });
      turned.set(half, [180, 0, 0]);
    });
  } else {
    parts.push({ role: "skinShell", solid: shell });
    turned.set(shell, [180, 0, 0]);
  }
  return { parts, turned, volume, saved: Math.max(0, boxed - volume), sprues: 1, vents };
}

/** Rubber band grooves round a block's four sides, level, at a quarter and three quarters of its height. */
function levelBands(runtime: ManifoldToplevel, created: { delete?: () => void }[], lo: number[], hi: number[]) {
  const tall = hi[2] - lo[2];
  const heights = tall >= 4 * BAND_WIDTH ? [lo[2] + tall / 4, hi[2] - tall / 4] : [(lo[2] + hi[2]) / 2];
  return unionOf(runtime, created, heights.map((z) => keep(created, block(runtime, created, [lo[0] - 1, lo[1] - 1, z - BAND_WIDTH / 2], [hi[0] + 1, hi[1] + 1, z + BAND_WIDTH / 2])
    .subtract(block(runtime, created, [lo[0] + BAND_DEPTH, lo[1] + BAND_DEPTH, z - BAND_WIDTH], [hi[0] - BAND_DEPTH, hi[1] - BAND_DEPTH, z + BAND_WIDTH])))));
}

/** The heights of the keys on an upright seam between `low` and `high`: two where there is room, else one in the middle. */
function seamKeyHeights(low: number, high: number, radius: number) {
  return high - low >= 4 * radius + 8 ? [low + (high - low) / 4, high - (high - low) / 4] : [(low + high) / 2];
}

/**
 * The core mold (`core`) for a vessel that stands open at the top: what is cast is the vessel's wall, so the mold needs
 * a core for the inside. The hollow is found by closing the vessel at its rim and under its foot: what is then shut in
 * and reaches the rim is the inside (a drain hole through the bottom comes with it, as a pin on the core). A rim that
 * is not level is cut a little lower, as little as closes it. The parts: a base plate at the rim with the core on it,
 * and a sleeve round the outside, in one piece or in two halves that part left/right or front/back. It is cast upside
 * down, the plate at the bottom, and poured to the brim, which is the vessel's foot; a hollow under the foot is
 * therefore cast full. Cone keys set the sleeve on the plate and the halves on each other.
 */
function coreMold(
  runtime: ManifoldToplevel, created: { delete?: () => void }[], master: ManifoldSolid, options: MoldOptions, warnings: MoldWarning[],
): KindParts | { error: "noHollow" } {
  const k = <T extends { delete?: () => void }>(value: T): T => keep(created, value);
  const grown = grownForShrinkage(master, options.shrinkage, created);
  const box = grown.boundingBox();
  const [x0, y0, z0] = box.min;
  const [x1, y1, z1] = box.max;
  const tall = z1 - z0;
  const pad = 2;
  // The vessel cut level at `cut` below its top, in a block of its height: what the block has left round it falls into
  // the outside, which reaches the block's sides, and what is shut in, the hollows. One that reaches the rim is the inside.
  const closedAt = (cut: number) => {
    const rim = z1 - cut;
    const body = k(grown.trimByPlane([0, 0, -1], -rim));
    const around = k(block(runtime, created, [x0 - pad - 1, y0 - pad - 1, z0], [x1 + pad + 1, y1 + pad + 1, rim]).subtract(body));
    const pieces = around.decompose().map((piece) => k(piece)).filter((piece) => piece.volume() > 1);
    const shutIn = (piece: ManifoldSolid) => {
      const own = piece.boundingBox();
      return own.min[0] > x0 - pad - 0.99 && own.max[0] < x1 + pad + 0.99 && own.min[1] > y0 - pad - 0.99 && own.max[1] < y1 + pad + 0.99;
    };
    const hollows = pieces.filter(shutIn);
    return { rim, outside: pieces.filter((piece) => !shutIn(piece)), hollows, open: hollows.filter((piece) => piece.boundingBox().max[2] > rim - 0.01) };
  };
  const enough = (x1 - x0) * (y1 - y0) * tall * 0.005;
  let found: ReturnType<typeof closedAt> | null = null;
  let rimCut = 0;
  // The plate lies a hair into the rim, so that it and the core are one body: no cut is 0.02 mm.
  for (const cut of [0.02, tall * 0.02, tall * 0.05, tall * 0.1, tall * 0.2]) {
    const tried = closedAt(cut);
    if (tried.open.reduce((sum, piece) => sum + piece.volume(), 0) >= enough) {
      found = tried;
      rimCut = cut > 0.05 ? cut : 0;
      break;
    }
  }
  if (!found) return { error: "noHollow" };
  if (rimCut > 0) warnings.push("rimCut");
  const { rim, outside, hollows, open } = found;
  let core = unionOf(runtime, created, open);
  if (hollows.some((piece) => !open.includes(piece) && piece.boundingBox().min[2] < z0 + 0.01 && piece.volume() > 10)) warnings.push("footFilled");
  // The vessel with every hollow filled: a block a little higher than it less the outside, cut back to its height.
  const tallBlock = block(runtime, created, [x0 - pad, y0 - pad, z0 - 1], [x1 + pad, y1 + pad, rim + 1]);
  const filled = k(k(k(outside.length ? tallBlock.subtract(unionOf(runtime, created, outside)) : tallBlock).trimByPlane([0, 0, 1], z0)).trimByPlane([0, 0, -1], -rim));
  const coreBox = core.boundingBox();
  if (hasUndercut(runtime, core, coreBox.min[2], rim, true, created)) warnings.push("coreUndercut");
  if (options.drain && coreBox.min[2] > z0 + 0.5) {
    // A pin from the core's far end to the brim, a little thinner there, so it comes out of the cast with the core.
    const end = k(core.slice(coreBox.min[2] + Math.min(0.3, (rim - coreBox.min[2]) / 4))).bounds();
    const radius = options.drainDiameter / 2;
    core = k(core.add(upright(runtime, created, (end.min[0] + end.max[0]) / 2, (end.min[1] + end.max[1]) / 2, z0, coreBox.min[2] - z0 + 0.5, Math.max(0.5, radius - 0.4), radius)));
  }
  const cast = k(filled.subtract(core));
  if (k(cast.slice(z0 + Math.min(0.1, tall / 10))).area() < 80) warnings.push("smallOpening");
  const w = options.wall;
  if (w < MOLD_MIN_STRONG_WALL) warnings.push("thinWall");
  const m = Math.max(w, options.keys ? options.keySize + 4 : 0);
  const lo = [x0 - m, y0 - m, z0];
  // The plate begins 0.02 mm below the rim, inside the core's end, so the two are one body; the sleeve ends on it.
  const plate = rim - 0.02;
  const hi = [x1 + m, y1 + m, plate];
  let sleeve = k(block(runtime, created, lo, hi).subtract(filled));
  let base = k(block(runtime, created, [lo[0], lo[1], plate], [hi[0], hi[1], plate + options.floor]).add(core));
  let keys = 0;
  const kr = options.keySize / 2;
  if (options.keys) {
    // Cones on the plate, one in each corner, the fourth smaller, into holes in the sleeve's end.
    const corners: [number, number, number][] = [[lo[0] + m / 2, lo[1] + m / 2, kr], [hi[0] - m / 2, lo[1] + m / 2, kr], [hi[0] - m / 2, hi[1] - m / 2, kr], [lo[0] + m / 2, hi[1] - m / 2, kr * 0.6]];
    base = k(base.add(unionOf(runtime, created, corners.map(([x, y, radius]) => hanging(runtime, created, x, y, plate + 0.01, radius + 0.01, radius)))));
    sleeve = k(sleeve.subtract(unionOf(runtime, created, corners.map(([x, y, radius]) => hanging(runtime, created, x, y, plate + 0.01, radius + options.keyFit * Math.SQRT2 + 0.01, radius + options.keyFit)))));
    keys += corners.length;
  }
  if (options.bands) sleeve = k(sleeve.subtract(levelBands(runtime, created, lo, hi)));
  const parts: KindParts["parts"] = [{ role: "coreBase", solid: base }];
  const turned = new Map<unknown, Turn>([[base, [180, 0, 0]]]);
  if (options.shellSplit) {
    // Parted where less of the outside sticks: left/right or front/back, through the middle.
    const rate = (candidate: "x" | "y") => rateFaces(runtime, k(filled.transform(TO_OPENING[candidate])), candidate, 50, options.draftLimit, created).rating;
    const ratings = { x: rate("x"), y: rate("y") };
    const way: "x" | "y" = options.direction === "x" || options.direction === "y" ? options.direction
      : ratings.y.undercutMm2 + Math.max(1, 0.002 * ratings.x.undercutMm2) < ratings.x.undercutMm2 ? "y" : "x";
    if (ratings[way].undercutMm2 >= MOLD_UNDERCUT_TRIFLE_MM2) warnings.push("undercut");
    const across: 0 | 1 = way === "x" ? 0 : 1;
    const middle = (lo[across] + hi[across]) / 2;
    const normal: [number, number, number] = across === 0 ? [1, 0, 0] : [0, 1, 0];
    let near = k(sleeve.trimByPlane([-normal[0], -normal[1], 0], -middle));
    let far = k(sleeve.trimByPlane(normal, middle));
    if (options.keys) {
      const other = 1 - across;
      const spots = [lo[other] + m / 2, hi[other] - m / 2].flatMap((at) => seamKeyHeights(z0, plate, kr).map((z) => [at, z]));
      near = k(near.add(unionOf(runtime, created, spots.map(([at, z]) => level(runtime, created, across, middle - 0.01, kr + 0.01, at, z, kr, 0)))));
      far = k(far.subtract(unionOf(runtime, created, spots.map(([at, z]) => level(runtime, created, across, middle - 0.01, kr + options.keyFit * Math.SQRT2 + 0.01, at, z, kr + options.keyFit, 0)))));
      keys += spots.length;
    }
    parts.push({ role: "sleeveHalf", solid: near, number: 1 }, { role: "sleeveHalf", solid: far, number: 2 });
    // Each half lies on its outside to print, the seam face up, the cavity open upward.
    turned.set(near, across === 0 ? [0, -90, 0] : [90, 0, 0]);
    turned.set(far, across === 0 ? [0, 90, 0] : [-90, 0, 0]);
  } else {
    if (hasUndercut(runtime, filled, z0, plate, true, created)) warnings.push("undercut");
    parts.push({ role: "sleeve", solid: sleeve });
    turned.set(sleeve, [180, 0, 0]);
  }
  return { parts, turned, volume: cast.volume() / 1000, keys, ...(rimCut > 0 ? { rimCut } : {}) };
}

/**
 * Where a channel comes down onto the master's top: the middle of its highest points where the master lies under that
 * middle (the centre of a flat top, not a corner of it), else the highest point nearest it (`topSpot`).
 */
function topMiddle(solid: ManifoldSolid) {
  const points = pointsOf(solid);
  const spot = topSpot(points);
  const near = points.filter((point) => point[2] >= spot.z - 0.2);
  const mx = near.reduce((sum, point) => sum + point[0], 0) / near.length;
  const my = near.reduce((sum, point) => sum + point[1], 0) / near.length;
  const over = heightOver(solid.getMesh(), mx, my);
  return over !== null && over >= spot.z - 0.2 ? { x: mx, y: my, z: over } : spot;
}

/**
 * The mold or die for `body` (in the scene's frame, y up). The parts come back in the scene's frame, laid out beside the
 * body on the workplane as they print; the body itself is not changed.
 */
export function moldForSolid(runtime: ManifoldToplevel, body: ManifoldSolid, given: MoldOptions, layout = true): MoldResult {
  const created: { delete?: () => void }[] = [];
  const handed = new Set<unknown>();
  try {
    const options = normalizeMoldOptions(given);
    const master = keep(created, body.transform(SCENE_TO_UP));
    if (master.status() !== "NoError" || master.isEmpty()) return { error: "notClosed" };
    const box = master.boundingBox();
    const [bx0, by0, bz0] = box.min;
    const [bx1, by1, bz1] = box.max;
    const height = bz1 - bz0;
    if (bx1 - bx0 < 1 || by1 - by0 < 1 || height < 0.5) return { error: "tooSmall" };
    const centre: [number, number] = [(bx0 + bx1) / 2, (by0 + by1) / 2];
    const warnings: MoldWarning[] = [];
    const parts: { role: MoldPartRole; solid: ManifoldSolid; number?: number }[] = [];
    let volume = master.volume() / 1000;
    /** What is poured: the cavity with its sprues, or the silicone or plaster of a mold. */
    let poured: number | null = null;
    let keyCount = 0;
    let ventCount = 0;
    let sprueCount = 0;
    let clearance: number | undefined;
    let parting: number | undefined;
    let partingFound: boolean | undefined;
    let axis: MoldAxis = "z";
    let analysis: MoldAnalysis | undefined;
    let ownOpenings: { missed: number } | undefined;
    let saved: number | undefined;
    let rimCut: number | undefined;
    // How each part is turned to print: a half turned over, its parting face up; a part not named stands as it is made.
    const turned = new Map<unknown, Turn>();
    const cast = options.kind === "twoPart" || options.kind === "tray" || options.kind === "core";
    if (cast && MOLD_CAST_MATERIAL_DATA[options.castMaterial].hot) warnings.push("hotCast");
    if (cast && options.castMaterial === "clay") warnings.push("clayNeedsPlaster");

    // The band round the cavity of a two-part mold: the wall, and room for the keys.
    const sideMargin = Math.max(options.wall, options.keys ? options.keySize + 4 : 0);
    /** Every direction rated, and the one asked for or the best: for a mold in two halves, in four parts, or two cases. */
    const rateDirections = (free: boolean, four: boolean) => {
      const parting0 = options.autoParting ? null : options.parting;
      const candidates: MoldAxis[] = free ? [...MOLD_AXES, "free"] : [...MOLD_AXES];
      const rated = candidates.map((candidate) => {
        const oriented = keep(created, master.transform(openingFrame(candidate, options).to));
        return { axis: candidate, oriented, faces: four ? rateSides(oriented, candidate, sideMargin) : rateFaces(runtime, oriented, candidate, parting0, options.draftLimit, created) };
      });
      const best = rated.filter((entry) => entry.axis !== "free").sort((a, b) => {
        const ua = a.faces.rating.undercutMm2;
        const ub = b.faces.rating.undercutMm2;
        if (Math.abs(ua - ub) > Math.max(1, 0.002 * Math.max(ua, ub))) return ua - ub;
        // Equally good: the larger parting face, flatter halves with room for the keys.
        return b.faces.rating.partingArea - a.faces.rating.partingArea;
      })[0];
      const asked = options.direction === "auto" || (options.direction === "free" && !free) ? best : rated.find((entry) => entry.axis === options.direction)!;
      return { rated, chosen: asked };
    };
    type Rated = ReturnType<typeof rateDirections>;
    /** What the panel, the preview and the list of findings show of a mold made in an opening's frame. */
    const analysisOf = (input: {
      rated: Rated["rated"]; chosen: Rated["chosen"]; lo: number[]; hi: number[]; zp: number; made: ManifoldSolid[]; pourVolume: number; material: MoldCastMaterial;
      highPoints: Array<{ at: readonly number[]; vented: boolean; sprue: boolean; opening?: number }>; suggested: MoldOpening[]; missed?: number[];
      /** The way the pour runs in the opening's frame, where it is not the way the mold opens. */
      pourUp?: readonly number[]; fourParts?: MoldAnalysis["fourParts"];
    }): MoldAnalysis => {
      const frame = openingFrame(input.chosen.axis, options);
      const sceneOf = (point: readonly number[]) => openingToScene(frame.from, point);
      const turnOf = (direction: readonly number[]) => sceneOf(direction).map((value, index) => value - sceneOf([0, 0, 0])[index]) as ClearanceVec3;
      const undercutPositions: number[] = [];
      const draftPositions: number[] = [];
      const { faces } = input.chosen;
      faces.flags.forEach((flag, tri) => {
        if (!flag) return;
        const into = flag === 1 ? undercutPositions : draftPositions;
        for (let corner = 0; corner < 3; corner += 1) into.push(...sceneOf(Array.from(faces.corners.subarray(tri * 9 + corner * 3, tri * 9 + corner * 3 + 3))));
      });
      const assembled = input.made.map((part) => keep(created, part.transform(frame.from)));
      const ab = assembled.map((part) => part.boundingBox());
      const outer: [number, number, number] = [0, 1, 2].map((k) => Math.max(...ab.map((b) => b.max[k])) - Math.min(...ab.map((b) => b.min[k]))) as [number, number, number];
      const highPoints: MoldHighPoint[] = input.highPoints.map(({ at, vented, sprue, opening }) => ({ point: sceneOf(at), vented, sprue, ...(opening !== undefined ? { opening } : {}) }));
      const findings: Finding[] = [];
      const rating = faces.rating;
      const level = moldUndercutLevel(input.material, rating.undercutPercent, rating.undercutMm2);
      const placeOf = (positions: number[]) => {
        const pts: ClearanceVec3[] = [];
        for (let index = 0; index < positions.length; index += 3) pts.push([positions[index], positions[index + 1], positions[index + 2]]);
        const box = boxAround(pts);
        return { box, point: [0, 1, 2].map((k) => (box.min[k] + box.max[k]) / 2) as ClearanceVec3 };
      };
      if (level) findings.push({ id: "mold-undercut", kind: "undercut", level, areaMm2: rating.undercutMm2, value: rating.undercutPercent, unit: "percent", ...placeOf(undercutPositions), partIds: [], partName: "" });
      let trapIndex = 0;
      input.highPoints.forEach((spot) => {
        if (spot.sprue || spot.opening !== undefined) return;
        const index = trapIndex;
        trapIndex += 1;
        if (spot.vented) return;
        const point = sceneOf(spot.at);
        findings.push({ id: `mold-air-${index}`, kind: "airTrap", level: "problem", areaMm2: 0, point, box: { min: point.map((v) => v - 3) as ClearanceVec3, max: point.map((v) => v + 3) as ClearanceVec3 }, partIds: [], partName: "" });
      });
      if (MOLD_CAST_MATERIAL_DATA[input.material].rigid && rating.draftMm2 >= MOLD_UNDERCUT_TRIFLE_MM2) {
        findings.push({ id: "mold-draft", kind: "draft", level: "hint", areaMm2: rating.draftMm2, value: options.draftLimit, unit: "deg", ...placeOf(draftPositions), partIds: [], partName: "" });
      }
      const { lo, hi, zp } = input;
      return {
        axis: input.chosen.axis, ratings: input.rated.map((entry) => entry.faces.rating), rating, undercutPositions, draftPositions,
        partingCorners: [[lo[0], lo[1], zp], [hi[0], lo[1], zp], [hi[0], hi[1], zp], [lo[0], hi[1], zp]].map(sceneOf), highPoints, findings,
        volume: input.pourVolume, weightG: input.pourVolume * options.density, outer,
        up: turnOf([0, 0, 1]),
        centre: through(UP_TO_SCENE, [(bx0 + bx1) / 2, (by0 + by1) / 2, (bz0 + bz1) / 2]),
        reach: Math.hypot(bx1 - bx0, by1 - by0, bz1 - bz0) / 2,
        across: [turnOf([1, 0, 0]), turnOf([0, 1, 0])],
        suggested: input.suggested,
        ...(input.missed ? { missedOpenings: input.missed } : {}),
        ...(input.pourUp ? { pourUp: turnOf(input.pourUp) } : {}),
        ...(input.fourParts ? { fourParts: input.fourParts } : {}),
      };
    };

    if (options.kind === "twoPart") {
      const w = options.wall;
      if (w < MOLD_MIN_STRONG_WALL) warnings.push("thinWall");
      const four = options.pieces === "four";
      // Every direction is rated, so the panel can show them side by side; the one asked for, or the best, is made.
      const { rated, chosen } = rateDirections(options.direction === "free", four);
      axis = chosen.axis;
      // Poured standing through the seam: only two halves that open left/right or front/back have a seam that stands.
      const seam: 0 | 1 | null = !four && options.pour === "seam" ? (axis === "x" ? 0 : axis === "y" ? 1 : null) : null;
      if (!four && options.pour === "seam" && seam === null) warnings.push("seamFallback");
      // Openings set by the user run the way the mold opens: only where the pour does too.
      const own = options.ownOpenings && !four && seam === null;
      const shaped = chosen.oriented;
      const cavity = grownForShrinkage(shaped, options.shrinkage, created);
      const cbox = cavity.boundingBox();
      const [cx0, cy0, cz0] = cbox.min;
      const [cx1, cy1, cz1] = cbox.max;
      const cheight = cz1 - cz0;
      const ccentre: [number, number] = [(cx0 + cx1) / 2, (cy0 + cy1) / 2];
      volume = cavity.volume() / 1000;
      let sprueVolume = 0;
      // Round the cavity the wall; on the sides room for the keys and bolts too.
      const m = Math.max(w, options.keys ? options.keySize + 4 : 0, options.screws && !four ? options.screwDiameter + 6 : 0);
      const lo = [cx0 - m, cy0 - m, cz0 - w];
      const hi = [cx1 + m, cy1 + m, cz1 + w];
      // The parting found on the master as it is, kept at the same share of the height for the grown cavity.
      let zp = cz0 + (cheight * chosen.faces.rating.parting) / 100;
      if (!four) {
        parting = chosen.faces.rating.parting;
        partingFound = options.autoParting ? chosen.faces.rating.partingFound : undefined;
      }
      // Never level with the master's bottom or top: the cut there leaves a film of no thickness over the cavity.
      zp = Math.min(cz1 - 0.02, Math.max(cz0 + 0.02, zp));
      // Below this no channel from the top goes: the parting of two halves; four parts have none across the pour.
      const channelFloor = four ? cz0 : zp;

      // Where the sprue and the vents go: they decide where a contour shell needs its bosses.
      const r = options.sprueDiameter / 2;
      const funnelRoom = Math.max(r + 3, 10) - r;
      const shell = options.outer === "shell" && !four;
      const flange = Math.max(options.keySize / 2 + 3, w, options.ears ? EAR_THICK + EAR_REACH : 0, options.prySlots ? PRY_TALL / 2 + 2 : 0, seam !== null ? r + 2.5 : 0);
      // Several masters (or one in separate pieces) leave cavities that do not meet: each needs a sprue of its own, or
      // only one of them fills. Crumbs under a cubic millimetre get none.
      const pieces = cavity.decompose().map((piece) => keep(created, piece)).filter((piece) => piece.volume() >= 1);
      const cavities = pieces.length > 1 ? pieces.sort((a, b) => b.volume() - a.volume()).slice(0, MOLD_MAX_SPRUES) : [cavity];
      const cell = Math.max(1, Math.min(4, Math.max(cx1 - cx0, cy1 - cy0) / 60));
      // Openings are placed from the middle of the master's bounding box, turned into the opening's frame.
      const origin = through(openingFrame(axis, options).to, [(bx0 + bx1) / 2, (by0 + by1) / 2, (bz0 + bz1) / 2]);
      const traps: Array<{ at: [number, number, number]; vented: boolean }> = [];
      // Where a sprue comes down (and into which cavity), and where a vent goes up; `opening` with those the user set.
      const sprues: Array<{ x: number; y: number; z: number; piece: ManifoldSolid; opening?: number }> = [];
      const ventSpots: Array<{ at: [number, number, number]; opening?: number }> = [];
      const missed: number[] = [];
      let suggested: MoldOpening[] = [];
      // Channels that lie in a seam and are cut out of every part, and those through the upper half alone.
      const cutAll: ManifoldSolid[] = [];
      const cutUpper: ManifoldSolid[] = [];
      const whole = block(runtime, created, lo, hi);
      let pourUp: number[] | undefined;
      let seamFunnel = 0;

      if (seam !== null) {
        // The mold stands on the side opposite the master's top as it stands in the scene: the pour runs down the seam
        // from there, in the opening's frame towards the low end of the level axis `seam`.
        const tangent = (1 - seam) as 0 | 1;
        pourUp = seam === 0 ? [-1, 0, 0] : [0, -1, 0];
        const frameOf = (along: number, acrossAt: number, z: number): [number, number, number] => (seam === 0 ? [along, acrossAt, z] : [acrossAt, along, z]);
        if (options.sprue) {
          for (const piece of cavities) {
            const spot = seamSpot(keep(created, piece.slice(zp)), seam);
            if (!spot) {
              if (!warnings.includes("sprueMissed")) warnings.push("sprueMissed");
              continue;
            }
            const [x, y, z] = frameOf(spot[0], spot[1], zp);
            sprues.push({ x, y, z, piece });
          }
          const reach = Math.min(1.5 * r, (seam === 0 ? cx1 - cx0 : cy1 - cy0) / 2);
          // Clear of the keys in the corners, and inside a shell's flange.
          const fromKeys = options.keys ? Math.min(...sprues.map((spot) => Math.min(Math.abs((seam === 0 ? spot.y : spot.x) - (lo[tangent] + m / 2)), Math.abs((seam === 0 ? spot.y : spot.x) - (hi[tangent] - m / 2))) - options.keySize / 2 - 1.5 - r), funnelRoom) : funnelRoom;
          seamFunnel = Math.max(0, Math.min(funnelRoom, fromKeys, shell ? flange - 1.5 - r : funnelRoom, m - 1));
          for (const spot of sprues) {
            const [along, acrossAt] = seam === 0 ? [spot.x, spot.y] : [spot.y, spot.x];
            const channel = level(runtime, created, seam, along + reach, -(along + reach - lo[seam] + 1), acrossAt, zp, r);
            const mouth = seamFunnel > 0.2 ? level(runtime, created, seam, lo[seam] + seamFunnel, -(seamFunnel + 0.01), acrossAt, zp, r, r + seamFunnel) : null;
            cutAll.push(mouth ? keep(created, channel.add(mouth)) : channel);
          }
          sprueCount = sprues.length;
          // The high points as the mold stands: found on the cavity turned so the pour runs straight down.
          const standing = keep(created, cavity.rotate(seam === 0 ? [0, 90, 0] : [-90, 0, 0]));
          const kept: [number, number, number][] = [];
          for (const [X, Y, Z] of airTraps(standing, cell, Number.NEGATIVE_INFINITY)) {
            const peak: [number, number, number] = seam === 0 ? [-Z, Y, X] : [X, -Z, Y];
            const acrossAt = peak[tangent];
            if (sprues.some((spot) => Math.hypot(acrossAt - (seam === 0 ? spot.y : spot.x), peak[2] - zp) <= r + options.ventDiameter * 2)) continue;
            if (kept.every((other) => Math.hypot(acrossAt - other[tangent], peak[2] - other[2]) > options.ventDiameter * 3)) kept.push(peak);
            if (kept.length >= 24) break;
          }
          let drilled = 0;
          kept.forEach((peak, index) => {
            // Only a high point in the seam can have a vent that comes out of the mold with the cast.
            const inSeam = Math.abs(peak[2] - zp) <= options.ventDiameter / 2 + 0.5;
            const vented = options.vents && inSeam && !options.ventsOff.includes(index) && drilled < 8;
            if (vented) {
              drilled += 1;
              const along = peak[seam];
              cutAll.push(level(runtime, created, seam, along + options.ventDiameter, -(along + options.ventDiameter - lo[seam] + 1), peak[tangent], zp, options.ventDiameter / 2));
            }
            traps.push({ at: peak, vented });
          });
          ventCount = drilled;
          if (traps.some((trap) => !trap.vented)) warnings.push("airTrap");
          if (options.wick) {
            for (const spot of sprues) {
              const [along, acrossAt] = seam === 0 ? [spot.x, spot.y] : [spot.y, spot.x];
              cutAll.push(level(runtime, created, seam, along, hi[seam] + 1 - along, acrossAt, zp, options.wickDiameter / 2));
              const half = r + seamFunnel + 4;
              cutAll.push(blockOn(runtime, created, seam, [lo[seam] - 1, acrossAt - 1, zp - half], [lo[seam] + 1.5, acrossAt + 1, zp + half]));
            }
          }
        }
      } else {
        // Four parts meet on the two upright planes through the block's middle and its corners: the seams.
        const blockWidth = hi[0] - lo[0];
        const blockDepth = hi[1] - lo[1];
        /** A point moved level onto the nearer of the two seams, and how far that is. */
        const toSeam = (x: number, y: number): { x: number; y: number; far: number } => {
          const moved = [1, -1].map((sign) => {
            // The seam through the middle along (blockWidth, sign * blockDepth).
            const length = Math.hypot(blockWidth, blockDepth);
            const [ux, uy] = [blockWidth / length, (sign * blockDepth) / length];
            const along = (x - ccentre[0]) * ux + (y - ccentre[1]) * uy;
            const [px, py] = [ccentre[0] + along * ux, ccentre[1] + along * uy];
            return { x: px, y: py, far: Math.hypot(x - px, y - py) };
          });
          return moved[0].far <= moved[1].far ? moved[0] : moved[1];
        };
        const onSeam = (x: number, y: number, mesh: ReturnType<ManifoldSolid["getMesh"]>): { x: number; y: number; z: number } | null => {
          const moved = toSeam(x, y);
          for (const [sx, sy] of [[ccentre[0], ccentre[1]], [moved.x, moved.y]]) {
            const z = heightOver(mesh, sx, sy);
            if (z !== null) return { x: sx, y: sy, z };
          }
          return null;
        };
        const spots: Array<{ x: number; y: number; z: number } | null> = cavities.map((piece) => {
          const spot = topMiddle(piece);
          // Four parts: the sprue must lie in a seam, or the cast's sprue locks the part it runs through.
          if (four) {
            const moved = onSeam(spot.x, spot.y, piece.getMesh());
            if (!moved && !warnings.includes("sprueMissed")) warnings.push("sprueMissed");
            return moved;
          }
          if (!options.sprueShiftX && !options.sprueShiftY) return spot;
          const x = spot.x + options.sprueShiftX;
          const y = spot.y + options.sprueShiftY;
          const top = topAt(runtime, piece, x, y, cz0, cz1, created);
          if (top === null && !own && !warnings.includes("sprueMissed")) warnings.push("sprueMissed");
          return { x, y, z: top ?? zp };
        });
        const placed = spots.flatMap((spot, index) => (spot ? [{ ...spot, piece: cavities[index] }] : []));
        /**
         * The high points the automatic placement looks at besides the sprues, and whether each gets a vent: what it makes
         * when the user does not set the openings, and what it suggests when the user does.
         */
        const automaticTraps = (vents: boolean) => {
          const kept: [number, number, number][] = [];
          for (const peak of airTraps(cavity, cell, channelFloor + 1)) {
            const [x, y] = peak;
            // The sprue lets the air out where it stands; peaks close together share one vent.
            if (placed.some((spot) => Math.hypot(x - spot.x, y - spot.y) <= r + options.ventDiameter * 2)) continue;
            if (kept.every(([kx, ky]) => Math.hypot(x - kx, y - ky) > options.ventDiameter * 3)) kept.push(peak);
            if (kept.length >= 24) break;
          }
          let drilled = 0;
          return kept.map((peak, index) => {
            // In four parts a vent must lie in a seam, as the sprue must.
            const moved = four ? toSeam(peak[0], peak[1]) : null;
            const vented = vents && (!moved || moved.far <= options.ventDiameter) && !options.ventsOff.includes(index) && drilled < 8;
            if (vented) drilled += 1;
            const at: [number, number, number] = moved && vented ? [moved.x, moved.y, peak[2]] : peak;
            return { at, vented };
          });
        };
        if (own) {
          // The suggestion is what the automatic placement makes with the sprue and the vents on.
          suggested = [
            ...placed.map((spot) => ({ x: spot.x - origin[0], y: spot.y - origin[1], kind: "sprue" as const })),
            ...automaticTraps(true).filter((trap) => trap.vented).map((trap) => ({ x: trap.at[0] - origin[0], y: trap.at[1] - origin[1], kind: "vent" as const })),
          ];
          const surface = options.openings.length ? cavity.getMesh() : null;
          options.openings.forEach((opening, index) => {
            const x = origin[0] + opening.x;
            const y = origin[1] + opening.y;
            const z = surface ? heightOver(surface, x, y) : null;
            // Beside the master, or over a place that lies wholly in the other half: a channel there meets no cavity.
            if (z === null || z <= zp + 0.01) missed.push(index);
            else if (opening.kind === "sprue") sprues.push({ x, y, z, piece: cavity, opening: index });
            else ventSpots.push({ at: [x, y, z], opening: index });
          });
          if (missed.length) warnings.push("openingMissed");
          if (!sprues.length) warnings.push("noSprue");
          else if (sprues.some((spot) => spot.z <= zp + 0.5)) warnings.push("sprueLow");
          // A high point is aired by an opening within the reach the automatic placement gives a sprue and a vent; the
          // others stay as air traps, so the user sees where air would be left.
          const peaks: [number, number, number][] = [];
          for (const peak of airTraps(cavity, cell, zp + 1)) {
            if (peaks.every(([kx, ky]) => Math.hypot(peak[0] - kx, peak[1] - ky) > options.ventDiameter * 3)) peaks.push(peak);
            if (peaks.length >= 24) break;
          }
          for (const peak of peaks) {
            const aired = sprues.some((spot) => Math.hypot(peak[0] - spot.x, peak[1] - spot.y) <= r + options.ventDiameter * 2)
              || ventSpots.some((vent) => Math.hypot(peak[0] - vent.at[0], peak[1] - vent.at[1]) <= options.ventDiameter * 3);
            if (!aired) traps.push({ at: peak, vented: false });
          }
          if (traps.length) warnings.push("airTrap");
        } else {
          if (options.sprue) {
            if (!four && placed.some((spot) => spot.z <= zp + 0.5)) warnings.push("sprueLow");
            sprues.push(...placed);
            traps.push(...automaticTraps(options.vents));
            for (const trap of traps) if (trap.vented) ventSpots.push({ at: trap.at });
            if (traps.some((trap) => !trap.vented)) warnings.push("airTrap");
          }
          suggested = [
            ...placed.map((spot) => ({ x: spot.x - origin[0], y: spot.y - origin[1], kind: "sprue" as const })),
            ...(options.sprue && options.vents ? traps : automaticTraps(true)).filter((trap) => trap.vented).map((trap) => ({ x: trap.at[0] - origin[0], y: trap.at[1] - origin[1], kind: "vent" as const })),
          ];
        }
        if (sprues.length) {
          // A sprue from the top down to each cavity's highest point (or to where the user set one), widening at 45
          // degrees into a funnel at the top.
          const channels = sprues.map((spot) => {
            const room = hi[2] - spot.z - 0.5;
            const funnel = Math.max(0, Math.min(funnelRoom, room));
            const sprueLow = channelBottom(runtime, spot.piece, spot.x, spot.y, spot.z, r, channelFloor, created);
            const sprue = upright(runtime, created, spot.x, spot.y, sprueLow, hi[2] - sprueLow + 1, r);
            const mouth = funnel > 0.2 ? upright(runtime, created, spot.x, spot.y, hi[2] - funnel, funnel + 0.01, r, r + funnel) : null;
            return mouth ? keep(created, sprue.add(mouth)) : sprue;
          });
          cutUpper.push(...channels);
          sprueCount = channels.length;
          if (options.wick) {
            // The wick runs on from each sprue through the mold's floor, and hangs on a rod laid in a notch across the funnel.
            for (const spot of sprues) {
              cutAll.push(upright(runtime, created, spot.x, spot.y, lo[2] - 1, spot.z - lo[2] + 1, options.wickDiameter / 2));
              const half = r + Math.max(0, Math.min(funnelRoom, hi[2] - spot.z - 0.5)) + 4;
              cutUpper.push(block(runtime, created, [spot.x - half, spot.y - 1, hi[2] - 1.5], [spot.x + half, spot.y + 1, hi[2] + 1]));
            }
          }
        }
        if (ventSpots.length) {
          for (const { at: [x, y, z] } of ventSpots) {
            const low = channelBottom(runtime, cavity, x, y, z, options.ventDiameter / 2, channelFloor, created);
            cutUpper.push(upright(runtime, created, x, y, low, hi[2] - low + 1, options.ventDiameter / 2));
          }
          ventCount = ventSpots.length;
        }
      }
      // What is poured fills the sprues as well, up to the mold's outside.
      const sprueSolids = [...(seam !== null ? cutAll.slice(0, sprueCount) : cutUpper.slice(0, sprueCount))];
      if (sprueSolids.length) sprueVolume = keep(created, keep(created, unionOf(runtime, created, sprueSolids).intersect(whole)).subtract(cavity)).volume() / 1000;
      const made: ManifoldSolid[] = [];

      if (four) {
        // Four parts round the pour axis: one on each side, meeting on the two upright planes through the block's
        // middle and its corners, each coming off straight sideways.
        let hollowed = keep(created, whole.subtract(cavity));
        const cuts = [...cutAll, ...cutUpper];
        if (cuts.length) hollowed = keep(created, hollowed.subtract(unionOf(runtime, created, cuts)));
        if (options.bands) hollowed = keep(created, hollowed.subtract(levelBands(runtime, created, lo, hi)));
        const width = hi[0] - lo[0];
        const depth = hi[1] - lo[1];
        const scale = Math.hypot(1 / width, 1 / depth);
        // The two planes' normals: across the seam through the far right corner, and across the one through the far left.
        const n1: [number, number, number] = [1 / width / scale, -1 / depth / scale, 0];
        const n2: [number, number, number] = [1 / width / scale, 1 / depth / scale, 0];
        const offsetOf = (normal: number[]) => normal[0] * ccentre[0] + normal[1] * ccentre[1];
        const side = (s1: number, s2: number) => keep(created, keep(created, hollowed.trimByPlane([s1 * n1[0], s1 * n1[1], 0], s1 * offsetOf(n1))).trimByPlane([s2 * n2[0], s2 * n2[1], 0], s2 * offsetOf(n2)));
        // Right (towards +x), back (+y), left and front, and how each is turned to print: its outside on the bed.
        const sides: Record<string, ManifoldSolid> = { right: side(1, 1), back: side(-1, 1), left: side(-1, -1), front: side(1, -1) };
        const turns: Record<string, Turn> = { right: [0, 90, 0], back: [-90, 0, 0], left: [0, -90, 0], front: [90, 0, 0] };
        if (options.keys) {
          // Cones across each of the four seams, half way between the cavity and the block's corner.
          const kr = options.keySize / 2;
          const heights = seamKeyHeights(lo[2], hi[2], kr);
          const fit = options.keyFit;
          const seams: Array<{ sx: number; sy: number; from: string; into: string; normal: number[] }> = [
            { sx: 1, sy: 1, from: "right", into: "back", normal: [-n1[0], -n1[1]] }, { sx: -1, sy: 1, from: "back", into: "left", normal: [-n2[0], -n2[1]] },
            { sx: -1, sy: -1, from: "left", into: "front", normal: [n1[0], n1[1]] }, { sx: 1, sy: -1, from: "front", into: "right", normal: [n2[0], n2[1]] },
          ];
          for (const { sx, sy, from, into, normal } of seams) {
            const x = sx > 0 ? hi[0] - m / 2 : lo[0] + m / 2;
            const y = ccentre[1] + sy * depth * (0.5 - m / (2 * width));
            const back = (by: number) => [x - normal[0] * by, y - normal[1] * by];
            sides[from] = keep(created, sides[from].add(unionOf(runtime, created, heights.map((z) => levelCone(runtime, created, back(0.01)[0], back(0.01)[1], z, normal[0], normal[1], kr, kr + 0.01)))));
            sides[into] = keep(created, sides[into].subtract(unionOf(runtime, created, heights.map((z) => levelCone(runtime, created, back(0.01)[0], back(0.01)[1], z, normal[0], normal[1], kr + fit, kr + fit * Math.SQRT2 + 0.01)))));
            keyCount += heights.length;
          }
        }
        ["right", "back", "left", "front"].forEach((key, index) => {
          parts.push({ role: "quarter", solid: sides[key], number: index + 1 });
          turned.set(sides[key], turns[key]);
          made.push(sides[key]);
        });
      } else {
        // The outside: a block, or a shell round the master with a flange at the parting face.
        let lowerOuter: ManifoldSolid;
        let upperOuter: ManifoldSolid;
        const flangeRect = keep(created, runtime.CrossSection.square([hi[0] - lo[0], hi[1] - lo[1]]).translate([lo[0], lo[1]]));
        if (shell) {
          const circles: CrossSection[] = [];
          if (seam === null) {
            for (const spot of sprues) circles.push(keep(created, runtime.CrossSection.circle(r + funnelRoom + 2.5, 48).translate([spot.x, spot.y])));
            for (const vent of ventSpots) circles.push(keep(created, runtime.CrossSection.circle(options.ventDiameter / 2 + 2.5, 24).translate([vent.at[0], vent.at[1]])));
          }
          const bosses = circles.length ? keep(created, runtime.CrossSection.union(circles)) : null;
          lowerOuter = keep(created, contourHalf(runtime, cavity, zp, lo[2], w, flangeRect, flange, null, created).trimByPlane([0, 0, -1], -zp));
          upperOuter = keep(created, contourHalf(runtime, cavity, zp, hi[2], w, flangeRect, flange, bosses, created).trimByPlane([0, 0, 1], zp));
        } else {
          lowerOuter = keep(created, whole.trimByPlane([0, 0, -1], -zp));
          upperOuter = keep(created, whole.trimByPlane([0, 0, 1], zp));
        }
        let lower = keep(created, lowerOuter.subtract(cavity));
        let upper = keep(created, upperOuter.subtract(cavity));
        if (options.keys) {
          // Cones at 45 degrees on the lower half, one in each corner of the band round the cavity, the fourth smaller, so
          // the halves close only one way.
          const kr = options.keySize / 2;
          const corners: [number, number, number][] = [[lo[0] + m / 2, lo[1] + m / 2, kr], [hi[0] - m / 2, lo[1] + m / 2, kr], [hi[0] - m / 2, hi[1] - m / 2, kr], [lo[0] + m / 2, hi[1] - m / 2, kr * 0.6]];
          const cones = corners.map(([x, y, radius]) => upright(runtime, created, x, y, zp - 0.01, radius + 0.01, radius, 0));
          const holes = corners.map(([x, y, radius]) => upright(runtime, created, x, y, zp - 0.01, radius + options.keyFit * Math.SQRT2 + 0.01, radius + options.keyFit, 0));
          lower = keep(created, lower.add(unionOf(runtime, created, cones)));
          upper = keep(created, upper.subtract(unionOf(runtime, created, holes)));
          keyCount = corners.length;
        }
        if (options.seal) {
          // A low ridge round the cavity on the lower half and a groove for it in the upper: thin material that creeps
          // into the seam stops there. Its flanks slope, so it prints on the parting face without support.
          const outline = keep(created, cavity.slice(zp));
          if (outline.area() > 1) {
            const ring = (inner: number, outerBy: number) => keep(created, keep(created, keep(created, outline.offset(outerBy, "Round", 2, 48)).subtract(keep(created, outline.offset(inner, "Round", 2, 48)))).intersect(flangeRect));
            const ridge: ManifoldSolid[] = [];
            const groove: ManifoldSolid[] = [];
            for (let step = 0; step < SEAL_STEPS; step += 1) {
              const z0 = zp + (SEAL_HEIGHT * step) / SEAL_STEPS;
              const z1 = zp + (SEAL_HEIGHT * (step + 1)) / SEAL_STEPS;
              const inset = (SEAL_HEIGHT * step) / SEAL_STEPS;
              ridge.push(prismOf(created, ring(SEAL_OFFSET + inset, SEAL_OFFSET + SEAL_WIDTH - inset), z0 - 0.01, z1));
              groove.push(prismOf(created, ring(SEAL_OFFSET + inset - SEAL_PLAY, SEAL_OFFSET + SEAL_WIDTH - inset + SEAL_PLAY), z0 - 0.01, z1 + SEAL_PLAY));
            }
            lower = keep(created, lower.add(unionOf(runtime, created, ridge)));
            upper = keep(created, upper.subtract(unionOf(runtime, created, groove)));
          }
        }
        // Bolts and ears sit on the left and the right, the pry slots at the front and the back; poured through the
        // seam, the side the funnel is on is left free of all of them.
        const boltAxis: 0 | 1 = seam === 0 ? 1 : 0;
        if (options.screws) {
          // A bolt hole through both halves in the middle of two opposite bands, clear of the keys in the corners.
          const sr = options.screwDiameter / 2;
          const holes = [lo[boltAxis] + m / 2, hi[boltAxis] - m / 2].map((at) => (boltAxis === 0
            ? upright(runtime, created, at, ccentre[1], lo[2] - 1, hi[2] - lo[2] + 2, sr)
            : upright(runtime, created, ccentre[0], at, lo[2] - 1, hi[2] - lo[2] + 2, sr)));
          const both = unionOf(runtime, created, holes);
          lower = keep(created, lower.subtract(both));
          upper = keep(created, upper.subtract(both));
        }
        if (cutUpper.length) upper = keep(created, upper.subtract(unionOf(runtime, created, cutUpper)));
        if (cutAll.length) {
          const cut = unionOf(runtime, created, cutAll);
          lower = keep(created, lower.subtract(cut));
          upper = keep(created, upper.subtract(cut));
        }
        if (options.prySlots) {
          // A notch across the seam for a screwdriver to part the halves: in the middle of the front and the back, or,
          // poured through the seam, in the side opposite the funnel.
          const deep = Math.min(PRY_DEPTH, m - 1);
          if (deep > 0.5) {
            const pryAxis: 0 | 1 = seam ?? 1;
            const middle = ccentre[1 - pryAxis];
            const starts = seam !== null ? [hi[pryAxis] - deep] : [lo[pryAxis] - 1, hi[pryAxis] - deep];
            const slots = starts.map((from) => blockOn(runtime, created, pryAxis, [from, middle - PRY_WIDTH / 2, zp - PRY_TALL / 2], [from + deep + 1, middle + PRY_WIDTH / 2, zp + PRY_TALL / 2]));
            const slot = unionOf(runtime, created, slots);
            lower = keep(created, lower.subtract(slot));
            upper = keep(created, upper.subtract(slot));
          }
        }
        if (options.ears) {
          // An ear on two opposite sides on each half at the seam, with a hole for a bolt through both; on its outer
          // side a 45 degree slope back to the wall, so each half prints standing on its outside without support.
          const bolt = options.boltDiameter / 2;
          const middle = ccentre[1 - boltAxis];
          for (const side of [-1, 1]) {
            const face = side < 0 ? lo[boltAxis] : hi[boltAxis];
            const out = face + side * EAR_REACH;
            const us = [Math.min(face, out), Math.max(face, out)];
            const vs = [middle - EAR_WIDTH / 2, middle + EAR_WIDTH / 2];
            const at = (face + out) / 2 + side * 1;
            const hole = boltAxis === 0 ? upright(runtime, created, at, middle, lo[2] - 1, hi[2] - lo[2] + 2, bolt) : upright(runtime, created, middle, at, lo[2] - 1, hi[2] - lo[2] + 2, bolt);
            const strip = [Math.min(face, face - side * 0.5), Math.max(face, face - side * 0.5)];
            const lowEar = keep(created, runtime.Manifold.hull([
              blockOn(runtime, created, boltAxis, [us[0], vs[0], zp - EAR_THICK], [us[1], vs[1], zp]),
              blockOn(runtime, created, boltAxis, [strip[0], vs[0], Math.max(lo[2], zp - EAR_THICK - EAR_REACH)], [strip[1], vs[1], zp]),
            ]));
            const highEar = keep(created, runtime.Manifold.hull([
              blockOn(runtime, created, boltAxis, [us[0], vs[0], zp], [us[1], vs[1], zp + EAR_THICK]),
              blockOn(runtime, created, boltAxis, [strip[0], vs[0], zp], [strip[1], vs[1], Math.min(hi[2], zp + EAR_THICK + EAR_REACH)]),
            ]));
            lower = keep(created, keep(created, lower.add(lowEar)).subtract(hole));
            upper = keep(created, keep(created, upper.add(highEar)).subtract(hole));
          }
        }
        if (options.bands && options.outer === "block") {
          // Two grooves round the outside, across the seam, for rubber bands; clear of the ears and the pry slots.
          const ringAxis: 0 | 1 = (1 - boltAxis) as 0 | 1;
          const span = hi[ringAxis] - lo[ringAxis];
          const offset = Math.max(span / 4, options.ears ? EAR_WIDTH / 2 + BAND_WIDTH : 0);
          for (const at of [ccentre[ringAxis] - offset, ccentre[ringAxis] + offset]) {
            if (at - BAND_WIDTH / 2 < lo[ringAxis] + 1 || at + BAND_WIDTH / 2 > hi[ringAxis] - 1) continue;
            const ring = keep(created, blockOn(runtime, created, ringAxis, [at - BAND_WIDTH / 2, lo[boltAxis] - 1, lo[2] - 1], [at + BAND_WIDTH / 2, hi[boltAxis] + 1, hi[2] + 1])
              .subtract(blockOn(runtime, created, ringAxis, [at - BAND_WIDTH, lo[boltAxis] + BAND_DEPTH, lo[2] + BAND_DEPTH], [at + BAND_WIDTH, hi[boltAxis] - BAND_DEPTH, hi[2] - BAND_DEPTH])));
            lower = keep(created, lower.subtract(ring));
            upper = keep(created, upper.subtract(ring));
          }
        }
        const [lowRole, highRole] = moldHalfRoles(axis);
        parts.push({ role: lowRole, solid: lower }, { role: highRole, solid: upper });
        turned.set(upper, [180, 0, 0]);
        made.push(lower, upper);
      }
      // The cast comes up out of the lower half and down out of the upper one: rated face by face above.
      if (chosen.faces.rating.undercutMm2 >= MOLD_UNDERCUT_TRIFLE_MM2) warnings.push("undercut");
      // Two halves that would stick: how four parts would do, if clearly better.
      let fourParts: MoldAnalysis["fourParts"];
      if (!four && moldUndercutLevel(options.castMaterial, chosen.faces.rating.undercutPercent, chosen.faces.rating.undercutMm2) === "problem") {
        const tried = MOLD_AXES.map((candidate) => rateSides(rated.find((entry) => entry.axis === candidate)!.oriented, candidate, sideMargin).rating).sort((a, b) => a.undercutMm2 - b.undercutMm2)[0];
        if (tried.undercutMm2 < chosen.faces.rating.undercutMm2 * 0.5) fourParts = { axis: tried.axis, undercutPercent: tried.undercutPercent };
      }
      poured = volume + sprueVolume;
      analysis = analysisOf({
        rated, chosen, lo, hi, zp: four ? (lo[2] + hi[2]) / 2 : zp, made, pourVolume: poured, material: options.castMaterial,
        highPoints: own ? [
          ...sprues.map((spot) => ({ at: [spot.x, spot.y, spot.z], vented: true, sprue: true, opening: spot.opening })),
          ...ventSpots.map((vent) => ({ at: vent.at, vented: true, sprue: false, opening: vent.opening })),
          ...traps.map((trap) => ({ at: trap.at, vented: false, sprue: false })),
        ] : [
          ...sprues.map((spot) => ({ at: [spot.x, spot.y, spot.z], vented: true, sprue: true })),
          ...traps.map((trap) => ({ at: trap.at, vented: trap.vented, sprue: false })),
        ],
        suggested, ...(own ? { missed } : {}), ...(pourUp ? { pourUp } : {}), ...(fourParts ? { fourParts } : {}),
      });
      if (own) ownOpenings = { missed: missed.length };
    } else if (options.kind === "halves") {
      // Two cases, each with one half of the master on its plate: what is poured into them are the mold's two halves.
      const g = options.gap;
      const w = options.wall;
      const { rated, chosen } = rateDirections(false, false);
      axis = chosen.axis;
      const frame = openingFrame(axis, options);
      const grown = grownForShrinkage(master, options.shrinkage, created);
      const gbox = grown.boundingBox();
      // The pour channel the finished mold is filled through: a cone on the master's top as it stands in the scene, out
      // to where the mold's outside will be. It lies in the seam of halves that part sideways, half of it in each.
      let positive = grown;
      if (options.sprue) {
        const r = options.sprueDiameter / 2;
        const spot = topMiddle(grown);
        const low = channelBottom(runtime, grown, spot.x, spot.y, spot.z, r, gbox.min[2], created);
        positive = keep(created, grown.add(upright(runtime, created, spot.x, spot.y, low, gbox.max[2] + g - low + 0.5, r, r + Math.min(6, g / 2))));
        sprueCount = 1;
      }
      const cavity = keep(created, grown.transform(frame.to));
      const cbox = cavity.boundingBox();
      const lo = [cbox.min[0] - g, cbox.min[1] - g, cbox.min[2] - g];
      const hi = [cbox.max[0] + g, cbox.max[1] + g, cbox.max[2] + g];
      const inside = block(runtime, created, lo, hi);
      const shaped = keep(created, keep(created, positive.transform(frame.to)).intersect(inside));
      const zp = Math.min(cbox.max[2] - 0.02, Math.max(cbox.min[2] + 0.02, cbox.min[2] + ((cbox.max[2] - cbox.min[2]) * chosen.faces.rating.parting) / 100));
      parting = chosen.faces.rating.parting;
      partingFound = options.autoParting ? chosen.faces.rating.partingFound : undefined;
      // Natches: cones in the corners, on the first case's plate and sunk into the second's, the fourth smaller. The half
      // poured in the first case gets hollows, the other the knobs for them, a little smaller.
      const kr = options.keys ? Math.min(options.keySize / 2, g / 2 - 1) : 0;
      const natches: [number, number, number][] = kr >= 1.5
        ? [[lo[0] + g / 2, lo[1] + g / 2, kr], [hi[0] - g / 2, lo[1] + g / 2, kr], [hi[0] - g / 2, hi[1] - g / 2, kr], [lo[0] + g / 2, hi[1] - g / 2, kr * 0.6]]
        : [];
      const plate = Math.max(options.floor, kr + 1.2);
      const outerLo = [lo[0] - w, lo[1] - w];
      const outerHi = [hi[0] + w, hi[1] + w];
      const wallsOf = (low: number, high: number) => keep(created, block(runtime, created, [outerLo[0], outerLo[1], low], [outerHi[0], outerHi[1], high])
        .subtract(block(runtime, created, [lo[0], lo[1], low - 1], [hi[0], hi[1], high + 1])));
      const lowerPart = keep(created, shaped.trimByPlane([0, 0, -1], -zp));
      const upperPart = keep(created, shaped.trimByPlane([0, 0, 1], zp));
      let first = keep(created, runtime.Manifold.union([block(runtime, created, [outerLo[0], outerLo[1], zp - 0.01], [outerHi[0], outerHi[1], zp + plate]), wallsOf(lo[2], zp), lowerPart]));
      let second = keep(created, runtime.Manifold.union([block(runtime, created, [outerLo[0], outerLo[1], zp - plate], [outerHi[0], outerHi[1], zp + 0.01]), wallsOf(zp, hi[2]), upperPart]));
      if (natches.length) {
        first = keep(created, first.add(unionOf(runtime, created, natches.map(([x, y, radius]) => hanging(runtime, created, x, y, zp + 0.01, radius + 0.01, radius)))));
        second = keep(created, second.subtract(unionOf(runtime, created, natches.map(([x, y, radius]) => hanging(runtime, created, x, y, zp + 0.02, Math.max(0.5, radius - options.keyFit) + 0.02, Math.max(0.5, radius - options.keyFit))))));
        keyCount = natches.length;
      }
      const floorArea = (hi[0] - lo[0]) * (hi[1] - lo[1]);
      poured = Math.max(0, floorArea * (zp - lo[2]) - lowerPart.volume()) / 1000 + Math.max(0, floorArea * (hi[2] - zp) - upperPart.volume()) / 1000;
      volume = poured;
      if (chosen.faces.rating.undercutMm2 >= MOLD_UNDERCUT_TRIFLE_MM2) warnings.push("undercut");
      parts.push({ role: "caseFirst", solid: first }, { role: "caseSecond", solid: second });
      // The first case holds the master's lower part hanging from its plate: turned over, the plate lies on the bed.
      turned.set(first, [180, 0, 0]);
      analysis = analysisOf({
        rated, chosen, lo: [outerLo[0], outerLo[1], lo[2]], hi: [outerHi[0], outerHi[1], hi[2]], zp, made: [first, second], pourVolume: poured, material: options.moldMaterial,
        highPoints: [], suggested: [],
      });
    } else if (options.kind === "skin") {
      const result = skinMold(runtime, created, master, options);
      parts.push(...result.parts);
      result.turned.forEach((turn, part) => turned.set(part, turn));
      volume = result.volume;
      poured = result.volume;
      saved = result.saved;
      sprueCount = result.sprues ?? 0;
      ventCount = result.vents ?? 0;
      if (options.wall < MOLD_MIN_STRONG_WALL) warnings.push("thinWall");
    } else if (options.kind === "core") {
      const result = coreMold(runtime, created, master, options, warnings);
      if ("error" in result) return result;
      parts.push(...result.parts);
      result.turned.forEach((turn, part) => turned.set(part, turn));
      volume = result.volume;
      poured = result.volume;
      keyCount = result.keys ?? 0;
      rimCut = result.rimCut;
    } else if (options.kind === "box") {

      const g = options.gap;
      const w = options.wall;
      const f = options.floor;
      const boxed = ((bx1 - bx0 + 2 * g) * (by1 - by0 + 2 * g) * (height + options.above) - master.volume()) / 1000;
      if (options.boxShape === "contour") {
        // The frame follows the master's outline seen from above, the gap away, its hollows smoothed over: the silicone
        // is as thick as asked all round and not thicker in the corners of a rectangle.
        const round = (area: CrossSection, by: number) => keep(created, area.offset(by, "Round", 2, 64));
        const outline = withoutHoles(runtime, created, keep(created, master.project()));
        const inside = round(round(outline, g + 2 * g), -2 * g);
        const outside = round(inside, w);
        const top = bz1 + options.above;
        let base = prismOf(created, round(outside, 3), bz0 - f - BOX_GROOVE, bz0);
        const groove = keep(created, round(outside, BOX_GROOVE_PLAY).subtract(round(inside, -BOX_GROOVE_PLAY)));
        base = keep(created, base.subtract(prismOf(created, groove, bz0 - BOX_GROOVE, bz0 + 1)));
        const footprint = keep(created, master.slice(bz0 + Math.min(0.3, height / 4)));
        if (footprint.area() > 1) base = keep(created, base.subtract(prismOf(created, round(footprint, BOX_SEAT_PLAY), bz0 - BOX_SEAT, bz0 + 1)));
        const frame = prismOf(created, keep(created, outside.subtract(inside)), bz0 - BOX_GROOVE, top);
        volume = (inside.area() * (top - bz0) - master.volume()) / 1000;
        poured = volume;
        saved = Math.max(0, boxed - volume);
        parts.push({ role: "base", solid: base }, { role: "frame", solid: frame });
      } else {
      const inner = [bx0 - g, by0 - g, bx1 + g, by1 + g];
      const outer = [inner[0] - w, inner[1] - w, inner[2] + w, inner[3] + w];
      const top = bz1 + options.above;
      // The base: a plate a little wider than the frame, the groove the frame stands in, and a shallow seat for the master.
      let base = block(runtime, created, [outer[0] - 3, outer[1] - 3, bz0 - f - BOX_GROOVE], [outer[2] + 3, outer[3] + 3, bz0]);
      const groove = keep(created, block(runtime, created, [outer[0] - BOX_GROOVE_PLAY, outer[1] - BOX_GROOVE_PLAY, bz0 - BOX_GROOVE], [outer[2] + BOX_GROOVE_PLAY, outer[3] + BOX_GROOVE_PLAY, bz0 + 1])
        .subtract(block(runtime, created, [inner[0] + BOX_GROOVE_PLAY, inner[1] + BOX_GROOVE_PLAY, bz0 - BOX_GROOVE - 1], [inner[2] - BOX_GROOVE_PLAY, inner[3] - BOX_GROOVE_PLAY, bz0 + 2])));
      base = keep(created, base.subtract(groove));
      const footprint = keep(created, master.slice(bz0 + Math.min(0.3, height / 4)));
      if (footprint.area() > 1) base = keep(created, base.subtract(prismOf(created, keep(created, footprint.offset(BOX_SEAT_PLAY, "Round", 2, 48)), bz0 - BOX_SEAT, bz0 + 1)));
      const frame = keep(created, block(runtime, created, [outer[0], outer[1], bz0 - BOX_GROOVE], [outer[2], outer[3], top])
        .subtract(block(runtime, created, [inner[0], inner[1], bz0 - BOX_GROOVE - 1], [inner[2], inner[3], top + 1])));
      // The silicone: the inside of the frame up to its top less the master.
      volume = ((inner[2] - inner[0]) * (inner[3] - inner[1]) * (top - bz0) - master.volume()) / 1000;
      poured = volume;
      parts.push({ role: "base", solid: base }, { role: "frame", solid: frame });
      }
    } else if (options.kind === "tray") {
      const w = options.wall;
      if (w < MOLD_MIN_STRONG_WALL) warnings.push("thinWall");
      // The master turned over about the left-right axis through its middle: its underside becomes the open top, and a
      // cast turned back over is the master again (not its mirror image).
      const over = keep(created, keep(created, keep(created, master.translate([-centre[0], -centre[1], -(bz0 + bz1) / 2])).rotate([180, 0, 0])).translate([centre[0], centre[1], (bz0 + bz1) / 2]));
      const tray = keep(created, block(runtime, created, [bx0 - w, by0 - w, bz0 - options.floor], [bx1 + w, by1 + w, bz1]).subtract(over));
      if (hasUndercut(runtime, over, bz0, bz1, true, created)) warnings.push("undercut");
      poured = volume;
      parts.push({ role: "tray", solid: tray });
    } else {
      // The die: the outline seen from above.
      const outline = keep(created, master.project());
      if (outline.area() < 1) return { error: "tooSmall" };
      const c = moldDieClearance(options.dieMode, options.material);
      clearance = c;
      const relief = options.dieMode === "relief";
      // A relief stamp is as high as the master's relief; the others as high as asked.
      const h = relief ? Math.max(0.5, height) : options.depth;
      const b = options.base;
      const r = options.dieMode !== "form" ? 0 : Math.min(options.rounding, h);
      // Places narrower than twice the sheet tear in forming and do not cut cleanly.
      const narrow = keep(created, outline.subtract(keep(created, keep(created, outline.offset(-options.material, "Round", 2, 32)).offset(options.material + 0.02, "Round", 2, 32))));
      if (!relief && narrow.decompose().map((piece) => keep(created, piece)).some((piece) => piece.area() > Math.max(1, options.material * options.material * 2))) warnings.push("fineDetails");
      const pinRoom = options.pins ? options.pinDiameter * 1.5 + 2 : 0;
      const margin = 8 + pinRoom;
      const plate = [bx0 - margin, by0 - margin, bx1 + margin, by1 + margin];
      const plateArea = keep(created, runtime.CrossSection.square([plate[2] - plate[0], plate[3] - plate[1]]).translate([plate[0], plate[1]]));
      // The punch: the outline standing on its plate, its top edge rounded in steps along a quarter circle; for a relief
      // the master's top surface itself, as a height field over the plate.
      const punchParts: ManifoldSolid[] = [prismOf(created, plateArea, 0, b)];
      const cell = Math.max(0.2, Math.max(bx1 - bx0, by1 - by0) / 220);
      const field = relief ? reliefField(master, cell, bx0 - c - 2 * cell, by0 - c - 2 * cell, bx1 + c + 2 * cell, by1 + c + 2 * cell, bz0) : null;
      if (field) punchParts.push(terrain(runtime, field.x0, field.y0, cell, field.nx, field.ny, () => b - 0.01, (i, j) => b + field.node(i, j), created));
      else punchParts.push(prismOf(created, outline, b - 0.01, b + h - r));
      const steps = r > 0 ? 6 : 0;
      for (let step = 0; step < steps; step += 1) {
        const z0 = (r * step) / steps;
        const z1 = (r * (step + 1)) / steps;
        const inset = r - Math.sqrt(Math.max(0, r * r - z1 * z1));
        const layer = keep(created, outline.offset(-inset, "Round", 2, 48));
        if (layer.area() < 0.01) break;
        punchParts.push(prismOf(created, layer, b + h - r + z0 - 0.001, b + h - r + z1));
      }
      let punch = unionOf(runtime, created, punchParts);
      // The die's cavity: the outline grown by the clearance and mirrored front to back about the plate's middle, so it
      // fits once the die is turned over onto the punch; its rim chamfered a little at 45 degrees (forming), or straight
      // through (cutting, so the slug falls out).
      const middleY = (plate[1] + plate[3]) / 2;
      const mirrored = keep(created, keep(created, outline.mirror([0, 1])).translate([0, 2 * middleY]));
      const hollow = keep(created, mirrored.offset(c, "Round", 2, 48));
      const cavityParts: ManifoldSolid[] = [];
      if (field) {
        // The sheet lies on the relief `c` thick: the die's face follows the relief grown by that much all round, less the
        // gap where die and stamp meet flat, mirrored front to back.
        const grown = field.grown(c);
        const top = b + h;
        cavityParts.push(terrain(runtime, field.x0, 2 * middleY - field.y1, cell, field.nx, field.ny, (i, j) => top - Math.max(0, grown(i, field.ny - j) - c), () => top + 1, created));
      } else {
        cavityParts.push(prismOf(created, hollow, options.dieMode === "cut" ? -1 : b, b + h + 1));
      }
      const chamfer = options.dieMode !== "form" ? 0 : Math.min(1, r, h / 3);
      for (let step = 1; step <= 3 && chamfer > 0; step += 1) {
        const grow = (chamfer * step) / 3;
        cavityParts.push(prismOf(created, keep(created, mirrored.offset(c + grow, "Round", 2, 48)), b + h - chamfer + grow - chamfer / 3, b + h + 1));
      }
      let die = keep(created, prismOf(created, plateArea, 0, b + h).subtract(unionOf(runtime, created, cavityParts)));
      if (options.pins) {
        // A pin in each corner of the punch's plate, standing over the punch, and a hole through the die for it; the fourth
        // pin thinner, so the die goes on only one way round (a stamp that is not symmetric would press crooked turned).
        const pr = options.pinDiameter / 2;
        const inset = pinRoom / 2 + 1;
        const corners: [number, number, number][] = [[plate[0] + inset, plate[1] + inset, pr], [plate[2] - inset, plate[1] + inset, pr], [plate[2] - inset, plate[3] - inset, pr], [plate[0] + inset, plate[3] - inset, Math.max(1.2, pr * 0.65)]];
        // Only where the pin stays clear of the outline and its cavity.
        const clear = corners.filter(([x, y, radius]) => keep(created, keep(created, runtime.CrossSection.circle(radius + options.pinFit + 1, 32).translate([x, y])).intersect(keep(created, outline.offset(c + 1, "Round", 2, 48)))).area() < 1e-3
          && keep(created, keep(created, runtime.CrossSection.circle(radius + options.pinFit + 1, 32).translate([x, y])).intersect(hollow)).area() < 1e-3);
        if (clear.length < corners.length) warnings.push("pinsLeftOut");
        if (clear.length) {
          punch = keep(created, punch.add(unionOf(runtime, created, clear.map(([x, y, radius]) => upright(runtime, created, x, y, b - 0.01, h + 4, radius)))));
          die = keep(created, die.subtract(unionOf(runtime, created, clear.map(([x, y, radius]) => upright(runtime, created, x, 2 * middleY - y, -1, b + h + 2, radius + options.pinFit)))));
        }
      }
      volume = 0;
      parts.push({ role: "punch", solid: punch }, { role: "die", solid: die });
    }

    // Laid out beside the master, left to right, standing on the workplane as they print (the upper half turned over,
    // its parting face up). Left where they are, as they close round the master, for the tests (`layout` false).
    let x = bx1 + LAYOUT_GAP;
    // The mold's outside size closed, as it is cast in (the frame z up: X, Y and the height).
    const frameFrom = openingFrame(axis, options).from;
    const closed = parts.map(({ solid: made }) => keep(created, made.transform(frameFrom)).boundingBox());
    const outer: [number, number, number] | undefined = closed.length
      ? [0, 1, 2].map((k) => Math.max(...closed.map((b) => b.max[k])) - Math.min(...closed.map((b) => b.min[k]))) as [number, number, number]
      : undefined;
    const placed: MoldPart[] = parts.map(({ role, solid: made, number }) => {
      const named = number !== undefined ? { role, number } : { role };
      if (!layout || options.output === "assembled") {
        // Closed round the master, turned back from the opening's frame.
        const back = keep(created, made.transform(frameFrom));
        const scene = back.transform(UP_TO_SCENE);
        handed.add(scene);
        return { ...named, solid: scene };
      }
      const turn = turned.get(made);
      const solid = turn ? keep(created, made.rotate(turn)) : made;
      if (solid.isEmpty()) return { ...named, solid };
      const own = solid.boundingBox();
      const moved = keep(created, solid.translate([x - own.min[0], centre[1] - (own.min[1] + own.max[1]) / 2, -own.min[2]]));
      x += own.max[0] - own.min[0] + LAYOUT_GAP;
      const scene = moved.transform(UP_TO_SCENE);
      handed.add(scene);
      return { ...named, solid: scene };
    });
    if (placed.some(({ solid }) => solid.isEmpty() || solid.status() !== "NoError")) return { error: "empty" };
    return {
      parts: placed, volume: Math.max(0, volume), warnings, keys: keyCount, vents: ventCount, sprues: sprueCount, ...(clearance !== undefined ? { clearance } : {}),
      ...(parting !== undefined ? { parting } : {}), ...(partingFound !== undefined ? { partingFound } : {}), ...(analysis ? { analysis } : {}),
      ...(ownOpenings ? { ownOpenings } : {}),
      ...(poured !== null ? { mix: moldMix(poured, options) } : {}),
      ...(saved !== undefined ? { saved } : {}), ...(rimCut !== undefined ? { rimCut } : {}), ...(outer ? { outer } : {}),
    };
  } catch (error) {
    return { error: "kernel", message: error instanceof Error ? error.message : String(error ?? "") };
  } finally {
    Array.from(new Set(created)).forEach((value) => {
      if (!handed.has(value)) value.delete?.();
    });
  }
}

/** The name of a part made from the master `name`; `number` tells the parts of one role apart. */
export function moldPartName(role: MoldPartRole, name: string, number?: number) {
  return t(`mold.part.${role}`, { name, number: number ?? 1 });
}

/** The message for why no mold could be made. */
export function moldErrorMessage(error: "notClosed" | "tooSmall" | "empty" | "kernel" | "noHollow", message?: string) {
  if (error === "kernel") return t("mold.error.kernel", { message: message ?? "" });
  return t(`mold.error.${error}`);
}

/** A warning in words; the one for openings left out says how many (`missed`), the one for a rim cut level by how much (`rimCut`, mm). */
export function moldWarningText(warning: MoldWarning, missed = 0, rimCut = 0) {
  if (warning === "openingMissed") return t("mold.warning.openingMissed", { count: missed });
  if (warning === "rimCut") return t("mold.warning.rimCut", { mm: (Math.round(rimCut * 10) / 10).toLocaleString(numberLocale()) });
  return t(`mold.warning.${warning}`);
}

/** What the two parts of a mix are called: powder and water for plaster and concrete, A and B for the rest. */
export function moldMixNames(material: MoldCastMaterial): [string, string] {
  return material === "plaster" || material === "concrete" ? [t("mold.mix.powder"), t("mold.mix.water")] : [t("mold.mix.partA"), t("mold.mix.partB")];
}

/** The mixing sheet in words: the weight to mix with the allowance, split in two where the material is mixed from two, and the cost. */
export function moldMixNotes(mix: MoldMix) {
  const grams = (value: number) => Math.round(value).toLocaleString(numberLocale());
  const [nameA, nameB] = moldMixNames(mix.material);
  const notes = [mix.bG > 0.5
    ? t("mold.note.mix", { g: grams(mix.totalG), percent: mix.allowance.toLocaleString(numberLocale()), a: grams(mix.aG), b: grams(mix.bG), nameA, nameB })
    : t("mold.note.mixOne", { g: grams(mix.totalG), percent: mix.allowance.toLocaleString(numberLocale()) })];
  if (mix.cost !== null) notes.push(t("mold.note.cost", { cost: (Math.round(mix.cost * 100) / 100).toLocaleString(numberLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }));
  return notes;
}

/** The warnings in words, and the volume, as the status line says them. */
export function moldNotes(result: Extract<MoldResult, { parts: unknown }>, kind: MoldKind) {
  const notes: string[] = [];
  // In ml and in US fluid ounces, the unit resin and silicone are sold by in the US.
  if (kind !== "die") notes.push(t(kind === "box" || kind === "skin" ? "mold.note.silicone" : kind === "halves" ? "mold.note.poured" : "mold.note.volume", {
    ml: (Math.round(result.volume * 10) / 10).toLocaleString(numberLocale()),
    oz: (Math.round((result.volume / MOLD_ML_PER_US_FL_OZ) * 100) / 100).toLocaleString(numberLocale()),
  }));
  if (result.saved !== undefined && result.saved >= 1 && result.volume > 0) notes.push(t("mold.note.saved", {
    ml: Math.round(result.saved).toLocaleString(numberLocale()),
    percent: Math.round((result.saved / (result.saved + result.volume)) * 100).toLocaleString(numberLocale()),
  }));
  if (result.analysis) {
    const { analysis } = result;
    if (analysis.axis === "free") {
      const { tilt, turn } = moldOpeningAngles(analysis.up);
      notes.push(t("mold.note.directionFree", { tilt, turn }));
    } else notes.push(t("mold.note.direction", { direction: t(`mold.direction.${analysis.axis}`) }));
    if (kind === "twoPart") notes.push(t("mold.note.weight", { g: Math.round(analysis.weightG).toLocaleString(numberLocale()) }));
    if (analysis.pourUp) notes.push(t("mold.note.seam"));
  }
  if (result.parts.some((part) => part.role === "quarter")) notes.push(t("mold.note.fourParts"));
  if (result.mix) notes.push(...moldMixNotes(result.mix));
  // Openings the user set are counted as they are; several sprues then need not mean several cavities.
  if (result.ownOpenings) notes.push(t("mold.note.openings", { sprues: result.sprues, vents: result.vents }));
  else if (result.sprues > 1) notes.push(t("mold.note.sprues", { count: result.sprues }));
  if (result.parting !== undefined) notes.push(t(result.partingFound ? "mold.note.partingFound" : "mold.note.parting", { percent: result.parting.toLocaleString(numberLocale()) }));
  if (result.clearance !== undefined) notes.push(t("mold.note.clearance", { mm: result.clearance.toLocaleString(numberLocale()) }));
  for (const warning of result.warnings) notes.push(moldWarningText(warning, result.ownOpenings?.missed, result.rimCut));
  return notes;
}

export type MoldShapeResult = { parts: WorkplaneShape[]; notes: string[]; analysis?: MoldAnalysis | null; figures?: MoldFigures | null } | { parts: null; error: string };

/** The master's solid from the shapes: the bodies joined, the holes among them taken off. */
function masterOf(runtime: ManifoldToplevel, targets: readonly WorkplaneShape[], created: ManifoldSolid[]) {
  const solids = targets.filter((shape) => !shape.hole && !isNonSolidShape(shape));
  const holes = targets.filter((shape) => shape.hole);
  const ok = (part: ManifoldSolid | null): part is ManifoldSolid => Boolean(part && part.status() === "NoError" && part.numTri() > 0);
  const built = solids.map((shape) => shapeToManifoldSolid(runtime, shape, created));
  const cutters = holes.map((shape) => shapeToManifoldSolid(runtime, shape, created));
  if (!built.length || !built.every(ok) || !cutters.every(ok)) return null;
  let body = built.length === 1 ? built[0] : runtime.Manifold.union(built as ManifoldSolid[]);
  created.push(body);
  if (cutters.length) {
    const together = runtime.Manifold.union(cutters as ManifoldSolid[]);
    created.push(together);
    body = body.subtract(together);
    created.push(body);
  }
  return body;
}

/** The figures of a mold made: what is poured (a two-part mold's cavity with its sprues), the mix, and the warnings. */
function moldFigures(result: Extract<MoldResult, { parts: unknown }>): MoldFigures {
  return {
    volume: result.analysis && result.parts.some((part) => part.role !== "caseFirst" && part.role !== "caseSecond") ? result.analysis.volume : result.volume, mix: result.mix ?? null, warnings: result.warnings,
    ...(result.saved !== undefined ? { saved: result.saved } : {}), ...(result.outer ? { outer: result.outer } : {}), ...(result.rimCut !== undefined ? { rimCut: result.rimCut } : {}),
  };
}

/** What the pour of any kind comes to, for the panel before the mold is made: the volume, the mix, and what there is to warn of. */
export type MoldFigures = { volume: number; mix: MoldMix | null; saved?: number; outer?: [number, number, number]; warnings: MoldWarning[]; rimCut?: number };
export type MoldAnalysisResult = { analysis: MoldAnalysis | null; notes: string[]; figures?: MoldFigures | null } | { analysis: null; error: string };

/**
 * What a mold of the selected master would be like, for the panel while its settings change: for a two-part mold and
 * the two cases the directions rated, the undercut and draft faces, the parting face, the high points and vents and the
 * findings; for every kind but the die the figures of the pour. The mold is made as it would be, but nothing comes back
 * of it but the analysis and the figures.
 */
export async function analyseMoldForShapes(targets: readonly WorkplaneShape[], given: MoldOptions): Promise<MoldAnalysisResult> {
  const solids = targets.filter((shape) => !shape.hole && !isNonSolidShape(shape));
  if (!solids.length) return { analysis: null, error: t("mold.error.needsBody") };
  const created: ManifoldSolid[] = [];
  try {
    const runtime = await getManifoldRuntime();
    const master = masterOf(runtime, targets, created);
    if (!master) return { analysis: null, error: moldErrorMessage("notClosed") };
    const options = normalizeMoldOptions(given);
    if (options.kind === "die") return { analysis: null, notes: [] };
    const result = moldForSolid(runtime, master, { ...options, output: "assembled" }, false);
    if ("error" in result) return { analysis: null, error: moldErrorMessage(result.error, result.message) };
    created.push(...result.parts.map((part) => part.solid));
    return {
      analysis: result.analysis ?? null,
      notes: result.warnings.map((warning) => moldWarningText(warning, result.ownOpenings?.missed, result.rimCut)),
      figures: moldFigures(result),
    };
  } catch (error) {
    return { analysis: null, error: moldErrorMessage("kernel", error instanceof Error ? error.message : String(error ?? "")) };
  } finally {
    Array.from(new Set(created)).forEach((value) => value.delete?.());
  }
}

/** The mold or die for the selected shapes, as new bodies beside them; the shapes stay as they are. */
export async function moldForShapes(targets: readonly WorkplaneShape[], given: MoldOptions): Promise<MoldShapeResult> {
  const solids = targets.filter((shape) => !shape.hole && !isNonSolidShape(shape));
  if (!solids.length) return { parts: null, error: t("mold.error.needsBody") };
  const created: ManifoldSolid[] = [];
  try {
    const runtime = await getManifoldRuntime();
    const master = masterOf(runtime, targets, created);
    if (!master) return { parts: null, error: moldErrorMessage("notClosed") };
    const options = normalizeMoldOptions(given);
    const result = moldForSolid(runtime, master, options);
    if ("error" in result) return { parts: null, error: moldErrorMessage(result.error, result.message) };
    created.push(...result.parts.map((part) => part.solid));
    const source = solids[0];
    const group = createLocalId(`${source.id}-mold`);
    const shapes: WorkplaneShape[] = [];
    for (const part of result.parts) {
      const mesh = part.solid.getMesh();
      const positions: number[] = [];
      for (let index = 0; index < mesh.triVerts.length; index += 1) {
        const offset = mesh.triVerts[index] * mesh.numProp;
        positions.push(mesh.vertProperties[offset], mesh.vertProperties[offset + 1], mesh.vertProperties[offset + 2]);
      }
      const shape = splitShapeFromWorldPositions(source, positions, createLocalId(`${source.id}-mold-${part.role}${part.number ?? ""}`), moldPartName(part.role, source.name, part.number));
      if (!shape) return { parts: null, error: moldErrorMessage("empty") };
      // Each part knows its master and the settings, so "Make the mold again" can open the tool with them (one group id
      // for the parts of one mold, so all of them are replaced).
      shapes.push(canonicalizeShape({ ...shape, hidden: false, hole: false, locked: false, moldOf: { master: source.id, group, settings: { ...options } } }));
    }
    return { parts: shapes, notes: moldNotes(result, options.kind), analysis: result.analysis ?? null, figures: options.kind === "die" ? null : moldFigures(result) };
  } catch (error) {
    return { parts: null, error: moldErrorMessage("kernel", error instanceof Error ? error.message : String(error ?? "")) };
  } finally {
    Array.from(new Set(created)).forEach((value) => value.delete?.());
  }
}
