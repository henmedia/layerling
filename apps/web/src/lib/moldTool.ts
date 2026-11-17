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
 *   clamp ears with bolt holes if asked. Both halves are laid out with the parting face up, as they print: the cavity is
 *   then open upward, the keys and the funnel need no support.
 * - box: a pour box for silicone round a printed master: a base plate with a shallow recess the master sits in and a
 *   groove the frame stands in (so it seals), and the frame `gap` away from the master, `above` mm higher than it.
 * - tray: an open one-part mold, the master's flat underside at the top, poured to the brim.
 * - die: a punch and die pair for forming, embossing or cutting thin sheet (leather, card, foil, thin aluminium): the
 *   punch is the master's outline seen from above standing on a base plate, its top edge rounded; the die is a plate with
 *   the outline as a cavity, the clearance larger all round (the material's thickness for forming, a few per cent of it for
 *   cutting, then the cavity goes through so the slug falls out), mirrored so it fits once turned over onto the punch.
 *   Guide pins on the punch's plate go into holes in the die's.
 * Warnings tell where a cast would stick (an undercut against the way it comes out) or the wall is thin. The volume of the
 * cavity (or of the silicone in a pour box) is returned in ml. Everything is worked out with Manifold, z up.
 */

export type MoldKind = "twoPart" | "box" | "tray" | "die";
export const MOLD_KINDS: readonly MoldKind[] = ["twoPart", "box", "tray", "die"];
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
export type MoldCastMaterial = "silicone" | "resin" | "plaster" | "other";
export const MOLD_CAST_MATERIALS: readonly MoldCastMaterial[] = ["silicone", "resin", "plaster", "other"];
/** The outside of a two-part mold: a block, or a shell that follows the master and saves filament. */
export type MoldOuter = "block" | "shell";
export const MOLD_OUTERS: readonly MoldOuter[] = ["block", "shell"];
/** The parts laid out beside the master as they print, or closed round it, to look at. */
export type MoldOutput = "print" | "assembled";
export const MOLD_OUTPUTS: readonly MoldOutput[] = ["print", "assembled"];

/**
 * What each casting material starts with: how much it shrinks as it sets (%) and how heavy it is (g/cm³). Assumptions
 * from makers' data sheets, to be checked against the material in hand: addition-cure silicone shrinks about 0.1 %,
 * polyurethane and epoxy resin 0.2 to 1 %, plaster swells a little as it sets (taken as 0).
 */
export const MOLD_CAST_MATERIAL_DATA: Readonly<Record<MoldCastMaterial, { shrinkage: number; density: number; rigid: boolean }>> = {
  silicone: { shrinkage: 0.1, density: 1.1, rigid: false },
  resin: { shrinkage: 0.5, density: 1.15, rigid: true },
  plaster: { shrinkage: 0, density: 1.6, rigid: true },
  other: { shrinkage: 0, density: 1, rigid: true },
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
};

export const MOLD_DEFAULTS: MoldOptions = {
  kind: "twoPart", wall: 5, gap: 10, parting: 50, autoParting: true, keys: true, keySize: 8, keyFit: 0.2, sprue: true, sprueDiameter: 8, vents: true,
  ventDiameter: 2.5, ears: false, boltDiameter: 4.5, prySlots: true, floor: 3, above: 12,
  dieMode: "form", material: 1, depth: 5, base: 5, pins: true, pinDiameter: 6, pinFit: 0.25, rounding: 1,
  direction: "auto", openTilt: 45, openTurn: 0, castMaterial: "silicone", shrinkage: 0.1, density: 1.1, draftLimit: 1, outer: "block", screws: false, screwDiameter: 3.4, bands: false,
  ventsOff: [], sprueShiftX: 0, sprueShiftY: 0, output: "print",
};

/** The ranges each setting is kept to, in mm (parting in %). */
export const MOLD_LIMITS = {
  wall: [2, 20], gap: [3, 30], parting: [5, 95], keySize: [4, 20], keyFit: [0, 0.6], sprueDiameter: [4, 20], ventDiameter: [1.5, 5],
  boltDiameter: [2, 8], floor: [1.2, 10], above: [3, 40], material: [0.1, 5], depth: [1, 30], base: [3, 15], pinDiameter: [3, 10],
  pinFit: [0, 0.6], rounding: [0, 5], shrinkage: [0, 5], density: [0.3, 4], draftLimit: [0, 10], screwDiameter: [2, 8], sprueShiftX: [-100, 100], sprueShiftY: [-100, 100],
  openTilt: [0, 90], openTurn: [-180, 180],
} as const;
type Limited = keyof typeof MOLD_LIMITS;

/** Millilitres in a US fluid ounce. */
export const MOLD_ML_PER_US_FL_OZ = 29.5735;
/** A wall thinner than this warps or breaks under a pour, in mm. */
export const MOLD_MIN_STRONG_WALL = 3;
/** At most this many sprues, one per separate cavity, the largest first. */
export const MOLD_MAX_SPRUES = 24;
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
    screws: flag(raw.screws, defaults.screws),
    bands: flag(raw.bands, defaults.bands),
    ventsOff,
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
export type MoldPartRole = "lower" | "upper" | "left" | "right" | "front" | "back" | "base" | "frame" | "tray" | "punch" | "die";
export type MoldWarning = "undercut" | "thinWall" | "sprueLow" | "pinsLeftOut" | "airTrap" | "fineDetails" | "sprueMissed";
export type MoldPart = { role: MoldPartRole; solid: ManifoldSolid };

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

/** A high point of the cavity, as poured: where air gathers. `vented` when it gets a vent (or the sprue is there). */
export type MoldHighPoint = { point: ClearanceVec3; vented: boolean; sprue: boolean };

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
};

export type MoldResult =
  | {
    parts: MoldPart[]; volume: number; warnings: MoldWarning[]; keys: number; vents: number; sprues: number; clearance?: number; parting?: number; partingFound?: boolean;
    analysis?: MoldAnalysis; keysShrunk?: boolean;
  }
  | { error: "notClosed" | "tooSmall" | "empty" | "kernel"; message?: string };

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
    const parts: { role: MoldPartRole; solid: ManifoldSolid }[] = [];
    let volume = master.volume() / 1000;
    let keyCount = 0;
    let ventCount = 0;
    let sprueCount = 0;
    let clearance: number | undefined;
    let parting: number | undefined;
    let partingFound: boolean | undefined;
    let axis: MoldAxis = "z";
    let analysis: MoldAnalysis | undefined;
    // The halves turned over to print with the parting face up.
    const flipped = new Set<unknown>();

    if (options.kind === "twoPart") {
      const w = options.wall;
      if (w < MOLD_MIN_STRONG_WALL) warnings.push("thinWall");
      // Every direction is rated, so the panel can show them side by side; the one asked for, or the best, is made.
      const parting0 = options.autoParting ? null : options.parting;
      const candidates: MoldAxis[] = options.direction === "free" ? [...MOLD_AXES, "free"] : [...MOLD_AXES];
      const rated = candidates.map((candidate) => {
        const oriented = keep(created, master.transform(openingFrame(candidate, options).to));
        return { axis: candidate, oriented, faces: rateFaces(runtime, oriented, candidate, parting0, options.draftLimit, created) };
      });
      const best = rated.filter((entry) => entry.axis !== "free").sort((a, b) => {
        const ua = a.faces.rating.undercutMm2;
        const ub = b.faces.rating.undercutMm2;
        if (Math.abs(ua - ub) > Math.max(1, 0.002 * Math.max(ua, ub))) return ua - ub;
        // Equally good: the larger parting face, flatter halves with room for the keys.
        return b.faces.rating.partingArea - a.faces.rating.partingArea;
      })[0];
      const chosen = options.direction === "auto" ? best : rated.find((entry) => entry.axis === options.direction)!;
      axis = chosen.axis;
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
      const m = Math.max(w, options.keys ? options.keySize + 4 : 0, options.screws ? options.screwDiameter + 6 : 0);
      const lo = [cx0 - m, cy0 - m, cz0 - w];
      const hi = [cx1 + m, cy1 + m, cz1 + w];
      // The parting found on the master as it is, kept at the same share of the height for the grown cavity.
      let zp = cz0 + (cheight * chosen.faces.rating.parting) / 100;
      parting = chosen.faces.rating.parting;
      partingFound = options.autoParting ? chosen.faces.rating.partingFound : undefined;
      // Never level with the master's bottom or top: the cut there leaves a film of no thickness over the cavity.
      zp = Math.min(cz1 - 0.02, Math.max(cz0 + 0.02, zp));

      // Where the sprue and the vents go: they decide where a contour shell needs its bosses.
      const r = options.sprueDiameter / 2;
      const funnelRoom = Math.max(r + 3, 10) - r;
      // Several masters (or one in separate pieces) leave cavities that do not meet: each needs a sprue of its own, or
      // only one of them fills. Crumbs under a cubic millimetre get none.
      const pieces = cavity.decompose().map((piece) => keep(created, piece)).filter((piece) => piece.volume() >= 1);
      const cavities = pieces.length > 1 ? pieces.sort((a, b) => b.volume() - a.volume()).slice(0, MOLD_MAX_SPRUES) : [cavity];
      const spots = cavities.map((piece) => {
        const spot = topSpot(pointsOf(piece));
        if (!options.sprueShiftX && !options.sprueShiftY) return spot;
        const x = spot.x + options.sprueShiftX;
        const y = spot.y + options.sprueShiftY;
        const top = topAt(runtime, piece, x, y, cz0, cz1, created);
        if (top === null && !warnings.includes("sprueMissed")) warnings.push("sprueMissed");
        return { x, y, z: top ?? zp };
      });
      const traps: Array<{ at: [number, number, number]; vented: boolean }> = [];
      if (options.sprue) {
        if (spots.some((spot) => spot.z <= zp + 0.5)) warnings.push("sprueLow");
        const cell = Math.max(1, Math.min(4, Math.max(cx1 - cx0, cy1 - cy0) / 60));
        const kept: [number, number, number][] = [];
        for (const peak of airTraps(cavity, cell, zp + 1)) {
          const [x, y] = peak;
          // The sprue lets the air out where it stands; peaks close together share one vent.
          if (spots.some((spot) => Math.hypot(x - spot.x, y - spot.y) <= r + options.ventDiameter * 2)) continue;
          if (kept.every(([kx, ky]) => Math.hypot(x - kx, y - ky) > options.ventDiameter * 3)) kept.push(peak);
          if (kept.length >= 24) break;
        }
        let drilled = 0;
        kept.forEach((peak, index) => {
          const vented = options.vents && !options.ventsOff.includes(index) && drilled < 8;
          if (vented) drilled += 1;
          traps.push({ at: peak, vented });
        });
        if (traps.some((trap) => !trap.vented)) warnings.push("airTrap");
      }

      // The outside: a block, or a shell round the master with a flange at the parting face.
      let lowerOuter: ManifoldSolid;
      let upperOuter: ManifoldSolid;
      if (options.outer === "shell") {
        const flange = Math.max(options.keySize / 2 + 3, w, options.ears ? EAR_THICK + EAR_REACH : 0, options.prySlots ? PRY_TALL / 2 + 2 : 0);
        const flangeRect = keep(created, runtime.CrossSection.square([hi[0] - lo[0], hi[1] - lo[1]]).translate([lo[0], lo[1]]));
        const circles: CrossSection[] = [];
        if (options.sprue) for (const spot of spots) circles.push(keep(created, runtime.CrossSection.circle(r + funnelRoom + 2.5, 48).translate([spot.x, spot.y])));
        for (const trap of traps) if (trap.vented) circles.push(keep(created, runtime.CrossSection.circle(options.ventDiameter / 2 + 2.5, 24).translate([trap.at[0], trap.at[1]])));
        const bosses = circles.length ? keep(created, runtime.CrossSection.union(circles)) : null;
        lowerOuter = keep(created, contourHalf(runtime, cavity, zp, lo[2], w, flangeRect, flange, null, created).trimByPlane([0, 0, -1], -zp));
        upperOuter = keep(created, contourHalf(runtime, cavity, zp, hi[2], w, flangeRect, flange, bosses, created).trimByPlane([0, 0, 1], zp));
      } else {
        const whole = block(runtime, created, lo, hi);
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
      if (options.screws) {
        // A bolt hole through both halves in the middle of the left and the right band, clear of the keys in the corners.
        const sr = options.screwDiameter / 2;
        const holes = [lo[0] + m / 2, hi[0] - m / 2].map((x) => upright(runtime, created, x, ccentre[1], lo[2] - 1, hi[2] - lo[2] + 2, sr));
        const both = unionOf(runtime, created, holes);
        lower = keep(created, lower.subtract(both));
        upper = keep(created, upper.subtract(both));
      }
      if (options.sprue) {
        // A sprue from the top down to each cavity's highest point, widening at 45 degrees into a funnel at the top.
        const channels = spots.map((spot, index) => {
          const room = hi[2] - spot.z - 0.5;
          const funnel = Math.max(0, Math.min(funnelRoom, room));
          const sprueLow = channelBottom(runtime, cavities[index], spot.x, spot.y, spot.z, r, zp, created);
          const sprue = upright(runtime, created, spot.x, spot.y, sprueLow, hi[2] - sprueLow + 1, r);
          const mouth = funnel > 0.2 ? upright(runtime, created, spot.x, spot.y, hi[2] - funnel, funnel + 0.01, r, r + funnel) : null;
          return mouth ? keep(created, sprue.add(mouth)) : sprue;
        });
        const channel = unionOf(runtime, created, channels);
        sprueCount = channels.length;
        // What is poured fills the sprue as well, up to the top.
        sprueVolume = keep(created, keep(created, channel.intersect(upperOuter)).subtract(cavity)).volume() / 1000;
        upper = keep(created, upper.subtract(channel));
        const vents = traps.filter((trap) => trap.vented).map(({ at: [x, y, z] }) => {
          const low = channelBottom(runtime, cavity, x, y, z, options.ventDiameter / 2, zp, created);
          return upright(runtime, created, x, y, low, hi[2] - low + 1, options.ventDiameter / 2);
        });
        if (vents.length) upper = keep(created, upper.subtract(unionOf(runtime, created, vents)));
        ventCount = vents.length;
      }
      if (options.prySlots) {
        // A notch across the seam in the middle of the front and the back, for a screwdriver to part the halves.
        const deep = Math.min(PRY_DEPTH, m - 1);
        if (deep > 0.5) {
          const slots = [lo[1] - 1, hi[1] - deep].map((y0) => block(runtime, created, [ccentre[0] - PRY_WIDTH / 2, y0, zp - PRY_TALL / 2], [ccentre[0] + PRY_WIDTH / 2, y0 + deep + 1, zp + PRY_TALL / 2]));
          const slot = unionOf(runtime, created, slots);
          lower = keep(created, lower.subtract(slot));
          upper = keep(created, upper.subtract(slot));
        }
      }
      if (options.ears) {
        // An ear on the left and the right on each half at the seam, with a hole for a bolt through both; on its outer
        // side a 45 degree slope back to the wall, so each half prints standing on its outside without support.
        const bolt = options.boltDiameter / 2;
        for (const side of [-1, 1]) {
          const face = side < 0 ? lo[0] : hi[0];
          const out = face + side * EAR_REACH;
          const xs = [Math.min(face, out), Math.max(face, out)];
          const ys = [ccentre[1] - EAR_WIDTH / 2, ccentre[1] + EAR_WIDTH / 2];
          const hole = upright(runtime, created, (face + out) / 2 + side * 1, ccentre[1], lo[2] - 1, hi[2] - lo[2] + 2, bolt);
          const strip = [Math.min(face, face - side * 0.5), Math.max(face, face - side * 0.5)];
          const lowEar = keep(created, runtime.Manifold.hull([
            block(runtime, created, [xs[0], ys[0], zp - EAR_THICK], [xs[1], ys[1], zp]),
            block(runtime, created, [strip[0], ys[0], Math.max(lo[2], zp - EAR_THICK - EAR_REACH)], [strip[1], ys[1], zp]),
          ]));
          const highEar = keep(created, runtime.Manifold.hull([
            block(runtime, created, [xs[0], ys[0], zp], [xs[1], ys[1], zp + EAR_THICK]),
            block(runtime, created, [strip[0], ys[0], zp], [strip[1], ys[1], Math.min(hi[2], zp + EAR_THICK + EAR_REACH)]),
          ]));
          lower = keep(created, keep(created, lower.add(lowEar)).subtract(hole));
          upper = keep(created, keep(created, upper.add(highEar)).subtract(hole));
        }
      }
      if (options.bands && options.outer === "block") {
        // Two grooves round the outside, across the seam, for rubber bands; clear of the ears and the pry slots.
        const spanY = hi[1] - lo[1];
        const offset = Math.max(spanY / 4, options.ears ? EAR_WIDTH / 2 + BAND_WIDTH : 0);
        for (const y of [ccentre[1] - offset, ccentre[1] + offset]) {
          if (y - BAND_WIDTH / 2 < lo[1] + 1 || y + BAND_WIDTH / 2 > hi[1] - 1) continue;
          const ring = keep(created, block(runtime, created, [lo[0] - 1, y - BAND_WIDTH / 2, lo[2] - 1], [hi[0] + 1, y + BAND_WIDTH / 2, hi[2] + 1])
            .subtract(block(runtime, created, [lo[0] + BAND_DEPTH, y - BAND_WIDTH, lo[2] + BAND_DEPTH], [hi[0] - BAND_DEPTH, y + BAND_WIDTH, hi[2] - BAND_DEPTH])));
          lower = keep(created, lower.subtract(ring));
          upper = keep(created, upper.subtract(ring));
        }
      }
      // The cast comes up out of the lower half and down out of the upper one: rated face by face above.
      if (chosen.faces.rating.undercutMm2 >= MOLD_UNDERCUT_TRIFLE_MM2) warnings.push("undercut");

      const [lowRole, highRole] = moldHalfRoles(axis);
      parts.push({ role: lowRole, solid: lower }, { role: highRole, solid: upper });
      flipped.add(upper);

      // The analysis: what the panel, the preview and the list of findings show.
      const frame = openingFrame(axis, options);
      const sceneOf = (point: readonly number[]) => openingToScene(frame.from, point);
      const undercutPositions: number[] = [];
      const draftPositions: number[] = [];
      chosen.faces.flags.forEach((flag, tri) => {
        if (!flag) return;
        const into = flag === 1 ? undercutPositions : draftPositions;
        for (let corner = 0; corner < 3; corner += 1) into.push(...sceneOf(Array.from(chosen.faces.corners.subarray(tri * 9 + corner * 3, tri * 9 + corner * 3 + 3))));
      });
      const assembled = [lower, upper].map((half) => keep(created, half.transform(frame.from)));
      const ab = assembled.map((half) => half.boundingBox());
      const outer: [number, number, number] = [0, 1, 2].map((k) => Math.max(...ab.map((b) => b.max[k])) - Math.min(...ab.map((b) => b.min[k]))) as [number, number, number];
      const highPoints: MoldHighPoint[] = [
        ...(options.sprue ? spots.map((spot) => ({ point: sceneOf([spot.x, spot.y, spot.z]), vented: true, sprue: true })) : []),
        ...traps.map((trap) => ({ point: sceneOf(trap.at), vented: trap.vented, sprue: false })),
      ];
      const findings: Finding[] = [];
      const rating = chosen.faces.rating;
      const level = moldUndercutLevel(options.castMaterial, rating.undercutPercent, rating.undercutMm2);
      const placeOf = (positions: number[]) => {
        const pts: ClearanceVec3[] = [];
        for (let index = 0; index < positions.length; index += 3) pts.push([positions[index], positions[index + 1], positions[index + 2]]);
        const box = boxAround(pts);
        return { box, point: [0, 1, 2].map((k) => (box.min[k] + box.max[k]) / 2) as ClearanceVec3 };
      };
      if (level) findings.push({ id: "mold-undercut", kind: "undercut", level, areaMm2: rating.undercutMm2, value: rating.undercutPercent, unit: "percent", ...placeOf(undercutPositions), partIds: [], partName: "" });
      traps.forEach((trap, index) => {
        if (trap.vented) return;
        const point = sceneOf(trap.at);
        findings.push({ id: `mold-air-${index}`, kind: "airTrap", level: "problem", areaMm2: 0, point, box: { min: point.map((v) => v - 3) as ClearanceVec3, max: point.map((v) => v + 3) as ClearanceVec3 }, partIds: [], partName: "" });
      });
      if (MOLD_CAST_MATERIAL_DATA[options.castMaterial].rigid && rating.draftMm2 >= MOLD_UNDERCUT_TRIFLE_MM2) {
        findings.push({ id: "mold-draft", kind: "draft", level: "hint", areaMm2: rating.draftMm2, value: options.draftLimit, unit: "deg", ...placeOf(draftPositions), partIds: [], partName: "" });
      }
      const pc = [[lo[0], lo[1], zp], [hi[0], lo[1], zp], [hi[0], hi[1], zp], [lo[0], hi[1], zp]].map(sceneOf);
      analysis = {
        axis, ratings: rated.map((entry) => entry.faces.rating), rating, undercutPositions, draftPositions, partingCorners: pc, highPoints, findings,
        volume: volume + sprueVolume, weightG: (volume + sprueVolume) * options.density, outer,
        up: openingToScene(frame.from, [0, 0, 1]).map((value, index) => value - openingToScene(frame.from, [0, 0, 0])[index]) as ClearanceVec3,
        centre: through(UP_TO_SCENE, [(bx0 + bx1) / 2, (by0 + by1) / 2, (bz0 + bz1) / 2]),
        reach: Math.hypot(bx1 - bx0, by1 - by0, bz1 - bz0) / 2,
      };
    } else if (options.kind === "box") {
      const g = options.gap;
      const w = options.wall;
      const f = options.floor;
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
      parts.push({ role: "base", solid: base }, { role: "frame", solid: frame });
    } else if (options.kind === "tray") {
      const w = options.wall;
      if (w < MOLD_MIN_STRONG_WALL) warnings.push("thinWall");
      // The master turned over about the left-right axis through its middle: its underside becomes the open top, and a
      // cast turned back over is the master again (not its mirror image).
      const turned = keep(created, keep(created, keep(created, master.translate([-centre[0], -centre[1], -(bz0 + bz1) / 2])).rotate([180, 0, 0])).translate([centre[0], centre[1], (bz0 + bz1) / 2]));
      const tray = keep(created, block(runtime, created, [bx0 - w, by0 - w, bz0 - options.floor], [bx1 + w, by1 + w, bz1]).subtract(turned));
      if (hasUndercut(runtime, turned, bz0, bz1, true, created)) warnings.push("undercut");
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
    const placed: MoldPart[] = parts.map(({ role, solid: made }) => {
      if (!layout || options.output === "assembled") {
        // Closed round the master, turned back from the opening's frame.
        const back = keep(created, made.transform(openingFrame(axis, options).from));
        const scene = back.transform(UP_TO_SCENE);
        handed.add(scene);
        return { role, solid: scene };
      }
      const solid = flipped.has(made) ? keep(created, made.rotate([180, 0, 0])) : made;
      if (solid.isEmpty()) return { role, solid };
      const own = solid.boundingBox();
      const moved = keep(created, solid.translate([x - own.min[0], centre[1] - (own.min[1] + own.max[1]) / 2, -own.min[2]]));
      x += own.max[0] - own.min[0] + LAYOUT_GAP;
      const scene = moved.transform(UP_TO_SCENE);
      handed.add(scene);
      return { role, solid: scene };
    });
    if (placed.some(({ solid }) => solid.isEmpty() || solid.status() !== "NoError")) return { error: "empty" };
    return {
      parts: placed, volume: Math.max(0, volume), warnings, keys: keyCount, vents: ventCount, sprues: sprueCount, ...(clearance !== undefined ? { clearance } : {}),
      ...(parting !== undefined ? { parting } : {}), ...(partingFound !== undefined ? { partingFound } : {}), ...(analysis ? { analysis } : {}),
    };
  } catch (error) {
    return { error: "kernel", message: error instanceof Error ? error.message : String(error ?? "") };
  } finally {
    Array.from(new Set(created)).forEach((value) => {
      if (!handed.has(value)) value.delete?.();
    });
  }
}

/** The name of a part made from the master `name`. */
export function moldPartName(role: MoldPartRole, name: string) {
  return t(`mold.part.${role}`, { name });
}

/** The message for why no mold could be made. */
export function moldErrorMessage(error: "notClosed" | "tooSmall" | "empty" | "kernel", message?: string) {
  if (error === "kernel") return t("mold.error.kernel", { message: message ?? "" });
  return t(`mold.error.${error}`);
}

/** The warnings in words, and the volume, as the status line says them. */
export function moldNotes(result: Extract<MoldResult, { parts: unknown }>, kind: MoldKind) {
  const notes: string[] = [];
  // In ml and in US fluid ounces, the unit resin and silicone are sold by in the US.
  if (kind !== "die") notes.push(t(kind === "box" ? "mold.note.silicone" : "mold.note.volume", {
    ml: (Math.round(result.volume * 10) / 10).toLocaleString(numberLocale()),
    oz: (Math.round((result.volume / MOLD_ML_PER_US_FL_OZ) * 100) / 100).toLocaleString(numberLocale()),
  }));
  if (result.analysis) {
    const { analysis } = result;
    if (analysis.axis === "free") {
      const { tilt, turn } = moldOpeningAngles(analysis.up);
      notes.push(t("mold.note.directionFree", { tilt, turn }));
    } else notes.push(t("mold.note.direction", { direction: t(`mold.direction.${analysis.axis}`) }));
    notes.push(t("mold.note.weight", { g: Math.round(analysis.weightG).toLocaleString(numberLocale()) }));
  }
  if (result.sprues > 1) notes.push(t("mold.note.sprues", { count: result.sprues }));
  if (result.parting !== undefined) notes.push(t(result.partingFound ? "mold.note.partingFound" : "mold.note.parting", { percent: result.parting.toLocaleString(numberLocale()) }));
  if (result.clearance !== undefined) notes.push(t("mold.note.clearance", { mm: result.clearance.toLocaleString(numberLocale()) }));
  for (const warning of result.warnings) notes.push(t(`mold.warning.${warning}`));
  return notes;
}

export type MoldShapeResult = { parts: WorkplaneShape[]; notes: string[]; analysis?: MoldAnalysis | null } | { parts: null; error: string };

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

export type MoldAnalysisResult = { analysis: MoldAnalysis | null; notes: string[] } | { analysis: null; error: string };

/**
 * What a two-part mold of the selected master would be like, for the panel while its settings change: the directions
 * rated, the undercut and draft faces, the parting face, the high points and vents, the findings and the figures. The
 * mold is made as it would be, but nothing comes back of it but the analysis.
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
    if (options.kind !== "twoPart") return { analysis: null, notes: [] };
    const result = moldForSolid(runtime, master, { ...options, output: "assembled" }, false);
    if ("error" in result) return { analysis: null, error: moldErrorMessage(result.error, result.message) };
    created.push(...result.parts.map((part) => part.solid));
    return { analysis: result.analysis ?? null, notes: result.warnings.map((warning) => t(`mold.warning.${warning}`)) };
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
      const shape = splitShapeFromWorldPositions(source, positions, createLocalId(`${source.id}-mold-${part.role}`), moldPartName(part.role, source.name));
      if (!shape) return { parts: null, error: moldErrorMessage("empty") };
      // Each part knows its master and the settings, so "Make the mold again" can open the tool with them (one group id
      // for the parts of one mold, so all of them are replaced).
      shapes.push(canonicalizeShape({ ...shape, hidden: false, hole: false, locked: false, moldOf: { master: source.id, group, settings: { ...options } } }));
    }
    return { parts: shapes, notes: moldNotes(result, options.kind), analysis: result.analysis ?? null };
  } catch (error) {
    return { parts: null, error: moldErrorMessage("kernel", error instanceof Error ? error.message : String(error ?? "")) };
  } finally {
    Array.from(new Set(created)).forEach((value) => value.delete?.());
  }
}
