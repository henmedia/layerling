/**
 * Surface texture: a computed relief - grooves, knurling, honeycomb, bumps -
 * laid onto the surface of any closed body, as a modification of its mesh.
 *
 * How: the body's triangles are welded into a closed mesh, refined until it
 * is fine enough for the pattern, and every point is moved along its normal
 * by depth × pattern value × weight. The weight keeps faces smooth (the
 * bottom, the top, a height band, sharp edges, inner or outer walls) and
 * fades the pattern in over a few millimetres at their border.
 *
 * Refining is what makes the relief clean, so it follows the pattern:
 * - Grooves: every triangle is cut into thin strips along the grooves, at
 *   fixed places of the groove profile (its edge, M places on the flank, its
 *   middle). Then every groove is equally deep everywhere, with a quarter of
 *   the triangles an even refinement needed.
 * - Knurling: split finely across the grooves and coarsely along them.
 * - Honeycomb: cut along the cell borders, the corner lines and M levels of
 *   the joint profile, so the joints are straight instead of jagged.
 * - Bumps: cut along spokes through every bump's middle and rings at the
 *   levels of its profile (a half ball, a cone, a soft or a flat top).
 * - Cells (Voronoi): cut like honeycomb, along the borders between cells of
 *   irregular shape; another seed, another arrangement.
 * - Bricks: cut in strips along the joints between the bricks of a wall laid
 *   in a bond (running, stack, English, English cross, Flemish) and along the
 *   creases where two joints meet; the faces of the bricks stay as coarse as
 *   the body's own grid.
 * - Knitting, rope, basket weave, carbon (twill), grain and an image (a grey
 *   height map, see surfaceTextureImages.ts): refined evenly, finer where the
 *   value jumps; round the axis a weave and carbon are cut along their bands too.
 * - Bark and wood grain (see surfaceTextureWood.ts): refined evenly too. The
 *   grain is a solid, like grain: a piece of wood with its annual rings round
 *   a pith, so the ends of a log show the rings that match its sides.
 * - Cracks (kintsugi, see surfaceTextureCracks.ts): lines that grow across the surface,
 *   with kinks, branches and a tapering width; only the band round them is
 *   refined. Their notch can be filled by a body of its own (gold, a second
 *   filament), its top a little below the surface.
 * - Text, stuck on (see surfaceTextureUnfold.ts): the surface round an anchor is rolled
 *   out like a label pressed on, and the letters' outlines are laid onto it -
 *   engraved or raised, along a vase's belly or over a box's edge. Only the
 *   window round the text is refined, and the mesh is cut along both sides of
 *   every letter's wall: the edges follow the outlines, not the grid.
 *
 * Around a cylinder the spacing is rounded so that a whole number of grooves
 * or cells goes round: the pattern closes at the seam. The axis of a round
 * body is fitted to its walls (a handle does not pull it aside).
 *
 * Millimetres. The pattern works in the frame the editor shows (z up, see
 * displayAxes.ts); positions come in and go out in the editor's inside frame.
 */

import {
  adjacency,
  baseMesh,
  EdgeTable,
  clampToBed,
  collapseShortEdges,
  dropFins,
  fadeWeights,
  freeBorder,
  nearBorder,
  faceCross,
  fixCaps,
  creaseMeet,
  creaseMoves,
  creaseSides,
  interpolatedNormals,
  mergeFlatPoints,
  normalsAndCreases,
  prepareSurfaceBase,
  hasNeedles,
  refinePlanar,
  SURFACE_MIN_EDGE,
  sliceByField,
  subdivide,
  type Adjacency,
  type SurfaceBase,
  type SurfaceMesh,
} from "@/lib/surfaceTextureMesh";
import { crackEdgeNear, crackFillBody, crackNetwork, crackValue, surfaceIndex, type CrackNetwork, type CrackSurfaceIndex } from "@/lib/surfaceTextureCracks";
import { nearestSurfacePoint, unfoldSurface } from "@/lib/surfaceTextureUnfold";
import { BARK_KINDS, BARK_STARTS, BARK_WOOD, barkValue, WOOD_CUTS, WOOD_KINDS, WOOD_RINGS, woodFrame, woodValue, type WoodFrame } from "@/lib/surfaceTextureWood";
import { nearestOnOutline, outlineAngle, outlineRing, prismOutline, type SurfaceOutline } from "@/lib/surfaceTextureOutline";
import {
  blurGreyImage,
  normalizeSurfaceTextureOwnImage,
  ownGreyImage,
  ownImageKey,
  sampleGreyImage,
  SURFACE_TEXTURE_IMAGE_PRESETS,
  SURFACE_TEXTURE_IMAGE_TILE,
  surfaceTexturePresetImage,
  type GreyImage,
  type SurfaceTextureOwnImage,
} from "@/lib/surfaceTextureImages";

export const SURFACE_TEXTURE_PATTERNS = ["grooves", "knurl", "honeycomb", "bumps", "cells", "bricks", "knit", "rope", "weave", "bark", "wood", "carbon", "grain", "image", "cracks", "text"] as const;
export type SurfaceTexturePattern = (typeof SURFACE_TEXTURE_PATTERNS)[number];
/** Cross-section of a groove or joint: round (cosine), pointed (V) or flat (a flat floor with steep flanks). */
/** round: a soft bell; pointed: a V (a cone on a bump); flat: a flat floor or top; dome: a half circle (half a ball on a bump). */
export const SURFACE_TEXTURE_PROFILES = ["round", "pointed", "flat", "dome"] as const;
export type SurfaceTextureProfile = (typeof SURFACE_TEXTURE_PROFILES)[number];
/**
 * How the pattern comes onto the body. Cylinder: around an axis, closing at the seam. All round:
 * from three sides, blended by the normal (triplanar) - for bodies that are not round. Flat: seen
 * along the axis, like a stamp.
 */
/** auto: around the axis on a round body, all round on an angular one (decided per body, see isRoundBody). */
export const SURFACE_TEXTURE_PROJECTIONS = ["auto", "cylinder", "allRound", "flat"] as const;
export type SurfaceTextureProjection = (typeof SURFACE_TEXTURE_PROJECTIONS)[number];
export const SURFACE_TEXTURE_DIRECTIONS = ["inward", "outward", "both"] as const;
export type SurfaceTextureDirection = (typeof SURFACE_TEXTURE_DIRECTIONS)[number];
export const SURFACE_TEXTURE_DETAILS = ["coarse", "medium", "fine"] as const;
export type SurfaceTextureDetail = (typeof SURFACE_TEXTURE_DETAILS)[number];
/** Axes as the editor shows them: X right, Y back, Z up. */
/** Cracks: a crack wanders, a lightning bolt zigzags round its way. */
export const SURFACE_TEXTURE_CRACK_STYLES = ["crack", "lightning"] as const;
export type SurfaceTextureCrackStyle = (typeof SURFACE_TEXTURE_CRACK_STYLES)[number];
/** Where cracks begin: at the top rim (a vase, a cup), at the bottom, at the rim towards the middle (a plate), anywhere. */
export const SURFACE_TEXTURE_CRACK_STARTS = ["top", "bottom", "rim", "anywhere"] as const;
export type SurfaceTextureCrackStart = (typeof SURFACE_TEXTURE_CRACK_STARTS)[number];

/**
 * How carbon fibre is woven: twill 2/2 (a band over two crossing bands, then under two - the even diagonal of most carbon
 * parts), 2/1 and 3/1 (over two or three, under one: long floats one way, short ones the other).
 */
export const SURFACE_TEXTURE_CARBON_WEAVES = ["twill22", "twill21", "twill31"] as const;
export type SurfaceTextureCarbonWeave = (typeof SURFACE_TEXTURE_CARBON_WEAVES)[number];

/**
 * How bricks are laid: running (every course half a brick along), stack (the joints in one line), English (courses of
 * stretchers and of headers in turn), English cross (as English, every other course of stretchers half a brick along)
 * and Flemish (stretchers and headers in turn in every course). A header is half a stretcher long.
 */
export const SURFACE_TEXTURE_BRICK_BONDS = ["running", "stack", "english", "englishCross", "flemish"] as const;
export type SurfaceTextureBrickBond = (typeof SURFACE_TEXTURE_BRICK_BONDS)[number];

/** Bark: oak, pine, spruce, birch or beech (see surfaceTextureWood.ts). */
export const SURFACE_TEXTURE_BARK_TYPES = BARK_KINDS;
export type SurfaceTextureBarkType = (typeof SURFACE_TEXTURE_BARK_TYPES)[number];
/** Wood grain: oak, ash, beech, pine or walnut, cut as a log, a flat-sawn or a quarter-sawn board. */
export const SURFACE_TEXTURE_WOOD_TYPES = WOOD_KINDS;
export type SurfaceTextureWoodType = (typeof SURFACE_TEXTURE_WOOD_TYPES)[number];
export const SURFACE_TEXTURE_WOOD_CUTS = WOOD_CUTS;
export type SurfaceTextureWoodCut = (typeof SURFACE_TEXTURE_WOOD_CUTS)[number];

/** Image: a ready image (see surfaceTextureImages.ts) or one's own. */
export const SURFACE_TEXTURE_IMAGES = [...SURFACE_TEXTURE_IMAGE_PRESETS, "own"] as const;
export type SurfaceTextureImage = (typeof SURFACE_TEXTURE_IMAGES)[number];
/** Image tiles: repeated, mirrored (no seam at their borders) or every other row half a tile along. */
export const SURFACE_TEXTURE_TILINGS = ["repeat", "mirror", "staggered"] as const;
export type SurfaceTextureTiling = (typeof SURFACE_TEXTURE_TILINGS)[number];
/** Bumps: every other row half a spacing along (a hexagon grid), or in straight rows and columns (issue #1030). */
export const SURFACE_TEXTURE_BUMP_GRIDS = ["staggered", "straight"] as const;
export type SurfaceTextureBumpGrid = (typeof SURFACE_TEXTURE_BUMP_GRIDS)[number];
/** Grooves, rope and knitting on a top or bottom round the axis: in rows (turned by faceTurn) or in rings following the outline; auto: rings on a round body, rows on an angular one. */
export const SURFACE_TEXTURE_CAP_STYLES = ["auto", "rows", "rings"] as const;
export type SurfaceTextureCapStyle = (typeof SURFACE_TEXTURE_CAP_STYLES)[number];
/**
 * Where a side round the axis meets a top or bottom with the pattern: sharp (each ends at the edge), over (the side's
 * pattern bends round the edge and takes the top - grooves, rope and knitting: rows as rings all over, upright or slanted
 * grooves as rays almost to the middle), fold (the same in a band round the rim only, the top's own pattern inside),
 * bead (a border in the pattern's style runs round the edge, both end under it); auto: over with rings on top, fold
 * with rows, where it can - else sharp.
 */
export const SURFACE_TEXTURE_CAP_EDGES = ["auto", "sharp", "over", "fold", "bead"] as const;
export type SurfaceTextureCapEdge = (typeof SURFACE_TEXTURE_CAP_EDGES)[number];

export const SURFACE_TEXTURE_AXES = ["x", "y", "z"] as const;
export type SurfaceTextureAxis = (typeof SURFACE_TEXTURE_AXES)[number];
/** A mask keeps the texture away from what lies inside it, or is the only place the texture goes. */
export const SURFACE_TEXTURE_MASK_MODES = ["exclude", "only"] as const;
export type SurfaceTextureMaskMode = (typeof SURFACE_TEXTURE_MASK_MODES)[number];
export const SURFACE_TEXTURE_MAX_MASKS = 20;
/**
 * A face the texture goes on, picked on the body: where (a share of the body's box per axis, 0 to 1, in the inside frame:
 * x right, y up, z to the viewer) and which way it faces there. The face is the region round that point bounded by the
 * body's sharp edges (bending by more than `edgeAngle`): a box's side, a cylinder's mantle or its top.
 */
export type SurfaceTextureFace = { at: [number, number, number]; normal: [number, number, number] };
/** The faces of a body's box by name, as an assistant may give them: the middle of each side of the box. */
export const SURFACE_TEXTURE_FACE_NAMES = ["top", "bottom", "front", "back", "left", "right"] as const;
export type SurfaceTextureFaceName = (typeof SURFACE_TEXTURE_FACE_NAMES)[number];
const FACE_BY_NAME: Record<SurfaceTextureFaceName, SurfaceTextureFace> = {
  top: { at: [0.5, 1, 0.5], normal: [0, 1, 0] },
  bottom: { at: [0.5, 0, 0.5], normal: [0, -1, 0] },
  front: { at: [0.5, 0.5, 1], normal: [0, 0, 1] },
  back: { at: [0.5, 0.5, 0], normal: [0, 0, -1] },
  left: { at: [0, 0.5, 0.5], normal: [-1, 0, 0] },
  right: { at: [1, 0.5, 0.5], normal: [1, 0, 0] },
};
export const SURFACE_TEXTURE_MAX_FACES = 64;
export const SURFACE_TEXTURE_MAX_MASK_PLANES = 2048;

/**
 * A helper body for the texture: a convex body (a box, a cylinder, a sphere, a cone) given by the
 * planes of its faces, four numbers each - the normal and the offset d, with the inside where
 * normal · point <= d - in the editor's inside frame. `box` (min x, y, z, max x, y, z), when given,
 * lets the test pass over the points far from the mask quickly.
 */
export type SurfaceTextureMask = { mode: SurfaceTextureMaskMode; planes: number[]; box?: number[] };

export type SurfaceTextureSettings = {
  pattern: SurfaceTexturePattern;
  /** Distance between grooves or cell centres, in mm (around a cylinder rounded so the pattern closes). */
  spacing: number;
  /** How far the surface moves at the deepest place, in mm. */
  depth: number;
  /** Share of the spacing a groove, joint or bump takes (0.1 to 1). */
  width: number;
  profile: SurfaceTextureProfile;
  /** Bumps: staggered rows (a hexagon grid) or straight rows and columns, `spacing` apart both ways. */
  bumpGrid: SurfaceTextureBumpGrid;
  /** Grooves and knurling: slant against the axis in degrees (0 = along the axis). */
  angle: number;
  /**
   * The pattern on the faces seen along the axis (a box's top and bottom) turned round it, degrees: 0 = rows parallel to
   * the front edge, 90 = to the side edge. Round tops and bottoms take grooves, rope and knitting in rings (see ringValue).
   */
  faceTurn: number;
  capStyle: SurfaceTextureCapStyle;
  capEdge: SurfaceTextureCapEdge;
  direction: SurfaceTextureDirection;
  projection: SurfaceTextureProjection;
  axis: SurfaceTextureAxis;
  /** Faces pointing down within this many degrees stay smooth (0 = the bottom gets the pattern too). */
  bottomFree: number;
  /** Faces pointing up within this many degrees stay smooth. */
  topFree: number;
  /** Height band with the pattern, in % of the body's height. */
  zoneFrom: number;
  zoneTo: number;
  /** Sharp edges (bending by more than `edgeAngle` degrees) stay smooth. */
  keepEdges: boolean;
  edgeAngle: number;
  /** The pattern fades in over this many mm next to everything that stays smooth. */
  fade: number;
  /** And keeps this many mm away from it first. */
  margin: number;
  /** Walls facing away from the axis (outside) and towards it (inside, like the inner wall of a cup). */
  outside: boolean;
  inside: boolean;
  detail: SurfaceTextureDetail;
  /** Helper bodies: the texture stays out of every "exclude" mask and, with any "only" mask, goes only into those. */
  masks: SurfaceTextureMask[];
  /**
   * The faces the texture goes on (see SurfaceTextureFace); none: everywhere the settings above allow. Picked faces go
   * before the top and bottom kept smooth, the walls and the height band.
   */
  faces: SurfaceTextureFace[];
  /** Cracks: style, where they begin and how many. */
  crackStyle: SurfaceTextureCrackStyle;
  crackStart: SurfaceTextureCrackStart;
  crackCount: number;
  /** In % of the body's height (from the rim to the middle: of its radius). */
  crackLength: number;
  /** Width at the start, mm; the crack tapers to its end. */
  crackWidth: number;
  /** Branching, zigzag and chipped edges, each 0 to 1. */
  crackBranch: number;
  crackJag: number;
  crackRough: number;
  /** The same number, the same cracks. */
  crackSeed: number;
  /** Fill the notch with a body of its own (gold, a second filament), its top `crackRecess` mm below the surface. */
  crackGold: boolean;
  crackRecess: number;
  /** Text stuck on: the words, the font (as a text shape names it) and the height of the text's box, mm. */
  textContent: string;
  textFont: string;
  textSize: number;
  /** The letters stacked top to bottom instead of side by side (#981). */
  textVertical: boolean;
  /** Where it sits: round the axis (degrees, 0 = the front, 90 = the right) and up it (% of the body's height). */
  textAround: number;
  textHeight: number;
  /** Turned on the surface, degrees. */
  textTurn: number;
  /** Cells, grain, bark and wood: another number, another arrangement; bricks: other bricks lie deeper. */
  seed: number;
  /** Carbon: the weave (the spacing is the width of the upright bands). */
  carbonWeave: SurfaceTextureCarbonWeave;
  /** Carbon: the width of the crossing bands, mm (0: as wide as the upright ones; else an uneven weave). */
  carbonCross: number;
  /**
   * Bricks: the height of a course, mm, from joint to joint (the spacing is a brick's length). The courses are fitted to
   * the height the texture covers, so whole courses go from its bottom to its top.
   */
  brickHeight: number;
  /** Bricks: the joint's width, mm. */
  brickJoint: number;
  brickBond: SurfaceTextureBrickBond;
  /** Bricks: how unevenly they lie, 0 to 1 - at 1 a brick sinks by up to half the depth, each its own way. */
  brickVary: number;
  /** Bark: which tree's (the spacing is the size of its pieces or marks). */
  barkType: SurfaceTextureBarkType;
  /** Wood grain: which wood, and how the piece was cut from the trunk. */
  woodType: SurfaceTextureWoodType;
  woodCut: SurfaceTextureWoodCut;
  /** Wood grain, and the ends of a log with bark: an annual ring's width, mm - fine grain or coarse. */
  ringWidth: number;
  /** Wood grain: how many knots, and how unevenly the tree grew (0 to 1). */
  woodKnots: number;
  woodWobble: number;
  /** Image: which one (light = the full depth); "own" is `imageOwn`. The tile's width is the spacing. */
  image: SurfaceTextureImage;
  /** One's own image: its grey values, at most SURFACE_TEXTURE_OWN_IMAGE_SIZE points a side. */
  imageOwn: SurfaceTextureOwnImage | null;
  /** The tile's height, mm (0: as high as the image is for its width). */
  tileHeight: number;
  /** The tiles turned on the surface, degrees. */
  imageTurn: number;
  /** Light and dark swapped. */
  imageInvert: boolean;
  /** Softened over this many points of the image. */
  imageBlur: number;
  imageTiling: SurfaceTextureTiling;
  /**
   * The letters' outlines, made from the words and the font where fonts are at hand (see surfaceTextOutline.ts):
   * rings [x0, y0, x1, y1, ...] in mm, y up, the text's box centred on 0, 0. Inside by the even-odd rule.
   */
  textOutline: number[][];
};

export const SURFACE_TEXTURE_DEFAULTS: Readonly<SurfaceTextureSettings> = Object.freeze({
  pattern: "knurl",
  spacing: 3,
  depth: 0.6,
  width: 0.6,
  profile: "pointed",
  bumpGrid: "staggered",
  angle: 30,
  faceTurn: 0,
  capStyle: "auto",
  capEdge: "auto",
  direction: "inward",
  projection: "auto",
  axis: "z",
  bottomFree: 30,
  // Around a cylinder, grooves on a level face would become rays to the middle (the inside
  // of a cup's bottom): the top stays smooth up to 30 degrees too.
  topFree: 30,
  zoneFrom: 0,
  zoneTo: 100,
  keepEdges: true,
  edgeAngle: 30,
  fade: 1,
  margin: 0,
  outside: true,
  inside: false,
  detail: "medium",
  masks: [],
  faces: [],
  crackStyle: "crack",
  crackStart: "top",
  crackCount: 5,
  crackLength: 60,
  crackWidth: 1.5,
  crackBranch: 0.4,
  crackJag: 0.5,
  crackRough: 0.3,
  crackSeed: 1,
  crackGold: false,
  crackRecess: 0.3,
  textContent: "Layerling",
  textFont: "Multilanguage",
  textSize: 10,
  textVertical: false,
  textAround: 0,
  textHeight: 50,
  textTurn: 0,
  textOutline: [],
  seed: 1,
  carbonWeave: "twill22",
  carbonCross: 0,
  brickHeight: 4,
  brickJoint: 0.8,
  brickBond: "running",
  brickVary: 0,
  barkType: "oak",
  woodType: "oak",
  woodCut: "log",
  ringWidth: 3,
  woodKnots: 0,
  woodWobble: 0.5,
  image: "topography",
  imageOwn: null,
  tileHeight: 0,
  imageTurn: 0,
  imageInvert: false,
  imageBlur: 0,
  imageTiling: "repeat",
});

type NumberKey = { [K in keyof SurfaceTextureSettings]: SurfaceTextureSettings[K] extends number ? K : never }[keyof SurfaceTextureSettings];

export const SURFACE_TEXTURE_LIMITS: Record<NumberKey, [number, number]> = {
  spacing: [0.5, 200],
  depth: [0.05, 5],
  width: [0.1, 1],
  angle: [-90, 90],
  faceTurn: [-180, 180],
  bottomFree: [0, 90],
  topFree: [0, 90],
  zoneFrom: [0, 100],
  zoneTo: [0, 100],
  edgeAngle: [5, 90],
  fade: [0, 10],
  margin: [0, 30],
  crackCount: [0, 24],
  crackLength: [5, 300],
  crackWidth: [0.2, 8],
  crackBranch: [0, 1],
  crackJag: [0, 1],
  crackRough: [0, 1],
  crackSeed: [0, 99999],
  crackRecess: [0, 3],
  textSize: [2, 200],
  textAround: [-180, 180],
  textHeight: [0, 100],
  textTurn: [-180, 180],
  seed: [1, 9999],
  carbonCross: [0, 50],
  brickHeight: [0.5, 100],
  brickJoint: [0.1, 10],
  brickVary: [0, 1],
  ringWidth: [0.3, 20],
  woodKnots: [0, 12],
  woodWobble: [0, 1],
  tileHeight: [0, 200],
  imageTurn: [-180, 180],
  imageBlur: [0, 8],
};

const CHOICES = {
  pattern: SURFACE_TEXTURE_PATTERNS,
  profile: SURFACE_TEXTURE_PROFILES,
  direction: SURFACE_TEXTURE_DIRECTIONS,
  projection: SURFACE_TEXTURE_PROJECTIONS,
  axis: SURFACE_TEXTURE_AXES,
  detail: SURFACE_TEXTURE_DETAILS,
  crackStyle: SURFACE_TEXTURE_CRACK_STYLES,
  crackStart: SURFACE_TEXTURE_CRACK_STARTS,
  carbonWeave: SURFACE_TEXTURE_CARBON_WEAVES,
  brickBond: SURFACE_TEXTURE_BRICK_BONDS,
  barkType: SURFACE_TEXTURE_BARK_TYPES,
  woodType: SURFACE_TEXTURE_WOOD_TYPES,
  woodCut: SURFACE_TEXTURE_WOOD_CUTS,
  image: SURFACE_TEXTURE_IMAGES,
  imageTiling: SURFACE_TEXTURE_TILINGS,
  bumpGrid: SURFACE_TEXTURE_BUMP_GRIDS,
  capStyle: SURFACE_TEXTURE_CAP_STYLES,
  capEdge: SURFACE_TEXTURE_CAP_EDGES,
} as const;

/** Points per half crack width, by detail. */
const CRACK_STEPS: Record<SurfaceTextureDetail, number> = { coarse: 1.5, medium: 2.5, fine: 4 };
/** Text: points per height of the text's box, by detail. */
const TEXT_STEPS: Record<SurfaceTextureDetail, number> = { coarse: 16, medium: 28, fine: 45 };
/** Settings that are free words rather than a choice, and how long they may be. */
const FREE_TEXT: Partial<Record<keyof SurfaceTextureSettings, number>> = { textContent: 200, textFont: 120 };
/** At most this many points in a text's outlines. */
export const SURFACE_TEXTURE_MAX_TEXT_POINTS = 60_000;

/** Points per groove width or joint across (grooves, knurling, honeycomb). */
const CROSS_STEPS: Record<SurfaceTextureDetail, number> = { coarse: 6, medium: 10, fine: 16 };
/**
 * On the straight faces of an angular body the pattern does not fade out towards a smooth edge but ends at a straight
 * border, the fade's width away, in a short steep wall this wide (mm). Faded, a groove's or a bump's end is curved, and
 * the long cut triangles there showed it in teeth; this way everything up to the border is flat or the pattern itself.
 */
const BORDER_WALL = 0.15;
/**
 * A pattern standing out of the body runs out over the fade right up to the edge of what stays smooth, not cut off at a
 * border with a wall (see BORDER_WALL): a flat frame stayed round it. The run-out is refined to this share of the fade,
 * or rope 3 mm high came down over a few long triangles, frayed.
 */
const RUN_OUT_STEPS = 4;

/** In how many steps a pattern standing out is cut round a corner of an outline (see cornerCuts). */
const CORNER_STEPS = 4;
/** Where a weave's stakes are cut across (see weaveCuts): shares of the stake's half width from its middle. */
const WEAVE_STAKE_PLACES = [0.4, 0.7, 0.87, 0.95, 0.99];
/** Where its weavers' bands are cut along: shares of the band's half height from its middle (its joints too). */
const WEAVE_BAND_PLACES = [0.4, 0.7, 0.9];
/** How far past the fade the distance to a smooth edge is known: the longest triangle on a straight face reaching into it. */
const FADE_BEYOND = 10;
/**
 * Straight smooth edges at least this long (mm) are cut along on their own, at most this many on one flat face (a box, a
 * plate, a prism); a round rim of many short sides is cut along the distance to the nearest of them.
 */
const BORDER_LINE_MIN = 3;
const BORDER_LINES_MAX = 16;
/** Points per spacing for the patterns refined evenly. */
const DETAIL_STEPS: Record<SurfaceTextureDetail, number> = { coarse: 3, medium: 5, fine: 8 };
/**
 * Default triangle budget of a result. The textured body is kept as a mesh in the design and in
 * every undo step, so it stays well below what a slicer would take; a preview uses less and a
 * coarser grid.
 */
export const SURFACE_TEXTURE_MAX_TRIANGLES = 600_000;
export const SURFACE_TEXTURE_PREVIEW_TRIANGLES = 200_000;

/** Cut along their cell borders (see sliceCells; bricks: sliceBricks). */
const CELL_PATTERNS: readonly SurfaceTexturePattern[] = ["honeycomb", "bumps", "cells", "bricks"];
/** Around a cylinder a whole number of cells, stitches, strands, stakes or tiles goes round. */
const ROUND_PATTERNS: readonly SurfaceTexturePattern[] = ["honeycomb", "bumps", "cells", "knit", "rope", "weave", "carbon", "bark", "image"];
const SQRT3 = Math.sqrt(3);

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Settings completed and kept within their limits; anything unknown or not a plain value falls
 * back to the default. Safe for whatever a saved file, a link or an assistant brings.
 */
export function normalizeSurfaceTexture(input: unknown): SurfaceTextureSettings {
  const source = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const out: SurfaceTextureSettings = { ...SURFACE_TEXTURE_DEFAULTS };
  const target = out as Record<string, unknown>;
  (Object.keys(SURFACE_TEXTURE_DEFAULTS) as (keyof SurfaceTextureSettings)[]).forEach((key) => {
    const value = source[key];
    if (typeof value !== "number" && typeof value !== "string" && typeof value !== "boolean") return;
    const fallback = SURFACE_TEXTURE_DEFAULTS[key];
    if (typeof fallback === "number") {
      const n = typeof value === "string" && value.trim() === "" ? NaN : Number(value);
      if (Number.isFinite(n)) target[key] = n;
    } else if (FREE_TEXT[key] !== undefined) {
      if (typeof value === "string") target[key] = value.slice(0, FREE_TEXT[key]);
    } else if (typeof fallback === "boolean") {
      if (typeof value === "boolean") target[key] = value;
      else if (value === "true" || value === "false") target[key] = value === "true";
    } else if ((CHOICES[key as keyof typeof CHOICES] as readonly string[] | undefined)?.includes(String(value))) {
      // Lists and objects (masks, outlines, one's own image) have their own checks below.
      target[key] = String(value);
    }
  });
  (Object.keys(SURFACE_TEXTURE_LIMITS) as NumberKey[]).forEach((key) => {
    out[key] = clamp(out[key], ...SURFACE_TEXTURE_LIMITS[key]);
  });
  if (out.zoneTo < out.zoneFrom) [out.zoneFrom, out.zoneTo] = [out.zoneTo, out.zoneFrom];
  out.crackCount = Math.round(out.crackCount);
  out.crackSeed = Math.round(out.crackSeed);
  out.seed = Math.round(out.seed);
  out.woodKnots = Math.round(out.woodKnots);
  // What a pattern is not told starts as it looks right (see SURFACE_TEXTURE_STARTERS), not as the knurling would.
  const starter = SURFACE_TEXTURE_STARTERS[out.pattern];
  if (starter) {
    (Object.keys(starter) as (keyof SurfaceTextureSettings)[]).forEach((key) => {
      if (source[key] === undefined) (target as Record<string, unknown>)[key] = starter[key];
    });
  }
  out.imageOwn = normalizeSurfaceTextureOwnImage(source.imageOwn);
  // One's own image asked for without one: the first ready image.
  if (out.image === "own" && !out.imageOwn) out.image = SURFACE_TEXTURE_IMAGE_PRESETS[0];
  if (out.pattern === "image" && source.spacing === undefined) out.spacing = surfaceTextureImageTile(out.image);
  // A bark starts at its own size and depth, a wood at its own ring width.
  if (out.pattern === "bark") {
    if (source.spacing === undefined) out.spacing = BARK_STARTS[out.barkType].spacing;
    if (source.depth === undefined) out.depth = BARK_STARTS[out.barkType].depth;
  }
  if (out.pattern === "wood" && source.ringWidth === undefined) out.ringWidth = WOOD_RINGS[out.woodType];
  out.masks = normalizeSurfaceTextureMasks(source.masks);
  out.faces = normalizeSurfaceTextureFaces(source.faces);
  out.textOutline = normalizeSurfaceTextOutline(source.textOutline);
  return out;
}

/**
 * Where a pattern starts when it is chosen, for what it is not told: bumps as half balls (the V a groove gets by default
 * would make them cones), knitting, rope and weave raised and round as their models, at the size those were measured
 * at, and bricks three times as long as a course is high, with the joints' flat floor sunk in as mortar.
 */
export const SURFACE_TEXTURE_STARTERS: Partial<Record<SurfaceTexturePattern, Partial<SurfaceTextureSettings>>> = {
  // Grooves upright, along the axis; knurling keeps its slant (its two families cross at it).
  grooves: { angle: 0 },
  bumps: { profile: "dome" },
  cells: { spacing: 9, depth: 0.8, width: 0.22, profile: "round" },
  // Bricks run into a box's corners: kept smooth there, the corner stood in a strip of its own between two walls.
  bricks: { spacing: 12, depth: 0.6, profile: "flat", keepEdges: false },
  knit: { spacing: 5, depth: 1.2, width: 0.85, profile: "round", direction: "outward" },
  rope: { spacing: 6, depth: 3, width: 0.6, profile: "round", direction: "outward" },
  weave: { spacing: 10, depth: 1.6, width: 0.6, profile: "round", direction: "outward" },
  // Carbon: bands as fine as a print still shows them, raised a little, a narrow gap between.
  carbon: { spacing: 2.5, depth: 0.4, width: 0.95, profile: "round", direction: "outward" },
  grain: { spacing: 1.2, depth: 0.25 },
  // A piece of a trunk shows its annual rings on its ends: the top and the bottom take the pattern (inward, the bottom
  // stays flat on the bed).
  // Bark and wood go up to the edges: kept smooth, the rim stood out round the log like a column's.
  bark: { topFree: 0, bottomFree: 0, keepEdges: false },
  wood: { depth: 0.8, topFree: 0, bottomFree: 0, keepEdges: false },
  image: { depth: 0.6 },
};

/** A fitting tile width for an image, mm (one's own: 40). */
export function surfaceTextureImageTile(image: SurfaceTextureImage) {
  return image === "own" ? 40 : SURFACE_TEXTURE_IMAGE_TILE[image];
}

/** A text's outlines kept to what can be used: rings of at least three finite points, within the limit on points. */
export function normalizeSurfaceTextOutline(input: unknown): number[][] {
  if (!Array.isArray(input)) return [];
  const out: number[][] = [];
  let budget = SURFACE_TEXTURE_MAX_TEXT_POINTS * 2;
  for (const ring of input) {
    if (!Array.isArray(ring) || ring.length < 6 || ring.length % 2 !== 0 || ring.length > budget) continue;
    if (!ring.every((value) => typeof value === "number" && Number.isFinite(value) && Math.abs(value) < 1e5)) continue;
    out.push(ring.slice());
    budget -= ring.length;
  }
  return out;
}

/** Picked faces, or faces by name (see SURFACE_TEXTURE_FACE_NAMES); at most SURFACE_TEXTURE_MAX_FACES, each once. */
export function normalizeSurfaceTextureFaces(input: unknown): SurfaceTextureFace[] {
  if (!Array.isArray(input)) return [];
  const out: SurfaceTextureFace[] = [];
  const seen = new Set<string>();
  for (const entry of input) {
    if (out.length >= SURFACE_TEXTURE_MAX_FACES) break;
    let face: SurfaceTextureFace | null = null;
    if (typeof entry === "string") {
      const named = FACE_BY_NAME[entry as SurfaceTextureFaceName];
      if (named) face = { at: [...named.at], normal: [...named.normal] };
    } else if (entry && typeof entry === "object") {
      const { at, normal } = entry as { at?: unknown; normal?: unknown };
      const numbers = (value: unknown) => Array.isArray(value) && value.length === 3 && value.every((n) => typeof n === "number" && Number.isFinite(n));
      if (numbers(at) && numbers(normal)) {
        const [nx, ny, nz] = normal as number[];
        const length = Math.hypot(nx, ny, nz);
        if (length > 1e-9) {
          const [ax, ay, az] = (at as number[]).map((value) => clamp(value, -0.05, 1.05));
          face = { at: [ax, ay, az], normal: [nx / length, ny / length, nz / length] };
        }
      }
    }
    if (!face) continue;
    const key = [...face.at, ...face.normal].map((value) => value.toFixed(4)).join(",");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(face);
  }
  return out;
}

/** Masks kept to what can be used: a known mode, whole planes of finite numbers with a normal, within the limits. */
export function normalizeSurfaceTextureMasks(input: unknown): SurfaceTextureMask[] {
  if (!Array.isArray(input)) return [];
  const out: SurfaceTextureMask[] = [];
  for (const entry of input.slice(0, SURFACE_TEXTURE_MAX_MASKS)) {
    if (!entry || typeof entry !== "object") continue;
    const { mode, planes, box } = entry as { mode?: unknown; planes?: unknown; box?: unknown };
    if (!SURFACE_TEXTURE_MASK_MODES.includes(mode as SurfaceTextureMaskMode) || !Array.isArray(planes)) continue;
    if (planes.length === 0 || planes.length % 4 !== 0 || planes.length > SURFACE_TEXTURE_MAX_MASK_PLANES * 4) continue;
    if (!planes.every((value) => typeof value === "number" && Number.isFinite(value))) continue;
    const clean: number[] = [];
    for (let k = 0; k < planes.length; k += 4) {
      const length = Math.hypot(planes[k], planes[k + 1], planes[k + 2]);
      if (length < 1e-9) continue;
      clean.push(planes[k] / length, planes[k + 1] / length, planes[k + 2] / length, planes[k + 3] / length);
    }
    const usableBox = Array.isArray(box) && box.length === 6 && box.every((value) => typeof value === "number" && Number.isFinite(value)) ? (box as number[]) : null;
    if (clean.length) out.push({ mode: mode as SurfaceTextureMaskMode, planes: clean, ...(usableBox ? { box: [...usableBox] } : {}) });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Frames                                                              */
/* ------------------------------------------------------------------ */

/** Positions from the editor's inside frame (y up, z to the viewer) into the screen frame (z up, y back). A turn, so winding stays. */
export function insideToScreenPositions(positions: ArrayLike<number>) {
  const out = new Float64Array(positions.length - (positions.length % 3));
  for (let i = 0; i < out.length; i += 3) {
    out[i] = positions[i];
    out[i + 1] = -positions[i + 2];
    out[i + 2] = positions[i + 1];
  }
  return out;
}

/** And back. */
export function screenToInsidePositions(positions: ArrayLike<number>) {
  const out = new Float64Array(positions.length - (positions.length % 3));
  for (let i = 0; i < out.length; i += 3) {
    out[i] = positions[i];
    out[i + 1] = positions[i + 2];
    out[i + 2] = -positions[i + 1] || 0;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Patterns                                                            */
/* ------------------------------------------------------------------ */

const AXIS_INDEX: Record<SurfaceTextureAxis, number> = { x: 0, y: 1, z: 2 };

/** The two axes across `axis`, in order. */
function acrossAxes(axis: SurfaceTextureAxis): [number, number] {
  const ax = AXIS_INDEX[axis];
  return ax === 0 ? [1, 2] : ax === 1 ? [0, 2] : [0, 1];
}

/** Falls from the middle (t = 0, value 1) to the edge (t = 1, value 0). */
export function surfaceFalloff(t: number, profile: SurfaceTextureProfile) {
  if (t >= 1) return 0;
  if (t <= 0) return 1;
  if (profile === "pointed") return 1 - t;
  if (profile === "flat") return clamp((1 - t) / 0.25, 0, 1);
  if (profile === "dome") return Math.sqrt(1 - t * t);
  return 0.5 * (1 + Math.cos(Math.PI * t));
}

function stripe(u: number, v: number, angleDeg: number, period: number, s: SurfaceTextureSettings) {
  const a = (angleDeg * Math.PI) / 180;
  const x = (u * Math.cos(a) - v * Math.sin(a)) / period;
  return surfaceFalloff(Math.abs(x - Math.floor(x) - 0.5) / (s.width / 2), s.profile);
}

/** Hexagon grid with centre spacing `size` (a corner up): distance to the cell's middle and to its border. */
function hexCell(u: number, v: number, size: number) {
  const c = hexSite(u, v, size);
  const ou = u - c.x, ov = v - c.y;
  const hex = Math.max(Math.abs(ou), Math.abs(ou * 0.5 + ov * (SQRT3 / 2)), Math.abs(-ou * 0.5 + ov * (SQRT3 / 2)));
  return { center: Math.hypot(ou, ov), edge: size / 2 - hex };
}

/** The middle of the hexagon at (u, v): its key and place. */
function hexSite(u: number, v: number, spacing: number) {
  const size = spacing / SQRT3;
  const q = ((SQRT3 / 3) * u - v / 3) / size;
  const r = ((2 / 3) * v) / size;
  const x = q, z = r, y = -q - r;
  let rx = Math.round(x), ry = Math.round(y), rz = Math.round(z);
  const dx = Math.abs(rx - x), dy = Math.abs(ry - y), dz = Math.abs(rz - z);
  if (dx > dy && dx > dz) rx = -ry - rz;
  else if (dy > dz) ry = -rx - rz;
  else rz = -rx - ry;
  return { key: (rx + 50000) * 100000 + (rz + 50000), x: size * SQRT3 * (rx + rz / 2), y: size * 1.5 * rz };
}

/** The bump nearest (u, v): its key and middle, on the hexagon grid or (straight) on a square one, `spacing` apart. */
function bumpSite(u: number, v: number, spacing: number, grid: SurfaceTextureBumpGrid) {
  if (grid === "staggered") return hexSite(u, v, spacing);
  const qx = Math.round(u / spacing), qy = Math.round(v / spacing);
  return { key: (qx + 50000) * 100000 + (qy + 50000), x: qx * spacing, y: qy * spacing };
}

/** Normals of the hexagon's six sides (as hexCell: a corner up). */
const HEX_NORMALS = [1, 0, 0.5, SQRT3 / 2, -0.5, SQRT3 / 2, -1, 0, -0.5, -SQRT3 / 2, 0.5, -SQRT3 / 2];

function hash3(i: number, j: number, k: number) {
  let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(k, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

/** Cells: the points of the 5 × 5 grid cells round (u, v), their key and the squared distance (see cellSites). */
const CELL_PTS = new Float64Array(50);
const CELL_D = new Float64Array(25);
const CELL_KEY = new Float64Array(25);

/**
 * Cells (Voronoi) in the pattern's plane: one point in every grid cell of `cell` mm, set off by the seed. With `around`
 * (around a cylinder) the grid repeats exactly after that many cells: no seam. Fills CELL_PTS, CELL_D and CELL_KEY with
 * the 25 points round (u, v); returns how many and which is nearest.
 */
function cellSites(u: number, v: number, cell: number, around: number | null, seed: number) {
  const ci = Math.floor(u / cell), cj = Math.floor(v / cell);
  let d1 = Infinity, k1 = 0, n = 0;
  for (let dj = -2; dj <= 2; dj += 1) {
    for (let di = -2; di <= 2; di += 1) {
      const i = ci + di, j = cj + dj;
      const wi = around ? ((i % around) + around) % around : i;
      const px = (i + 0.1 + 0.8 * hash3(wi, j, seed)) * cell;
      const py = (j + 0.1 + 0.8 * hash3(wi, j, seed + 7919)) * cell;
      const d = (px - u) ** 2 + (py - v) ** 2;
      CELL_PTS[n * 2] = px;
      CELL_PTS[n * 2 + 1] = py;
      CELL_D[n] = d;
      CELL_KEY[n] = (wi + 50000) * 100000 + (j + 50000);
      if (d < d1) {
        d1 = d;
        k1 = n;
      }
      n += 1;
    }
  }
  return { n, k1 };
}

/** Distance at (x, y) to the border between cell points A (sx, sy) and B (bx, by): (|x - B|² - |x - A|²) / 2 |A - B|. */
function bisectorDistance(sx: number, sy: number, bx: number, by: number, x: number, y: number) {
  return ((bx - x) ** 2 + (by - y) ** 2 - (sx - x) ** 2 - (sy - y) ** 2) / (2 * (Math.hypot(bx - sx, by - sy) || 1));
}

/**
 * Distance to the nearest cell border, mm: exactly, the smallest distance to the borders between the nearest point and
 * every other - the second nearest point alone jumped at the corners (steps in the joint where it changes).
 */
function cellEdge(u: number, v: number, cell: number, around: number | null, seed: number) {
  const { n, k1 } = cellSites(u, v, cell, around, seed);
  const sx = CELL_PTS[k1 * 2], sy = CELL_PTS[k1 * 2 + 1];
  let best = Infinity;
  for (let k = 0; k < n; k += 1) {
    if (k === k1) continue;
    const d = bisectorDistance(sx, sy, CELL_PTS[k * 2], CELL_PTS[k * 2 + 1], u, v);
    if (d < best) best = d;
  }
  return best;
}

/** The cross-section of a yarn or strand: round (and dome) a half circle, else as the other patterns. */
function yarn(e2: number, profile: SurfaceTextureProfile) {
  if (e2 >= 1) return 0;
  return profile === "round" || profile === "dome" ? Math.sqrt(1 - e2) : surfaceFalloff(Math.sqrt(e2), profile);
}

/**
 * Stockinette: columns of stitches `W` wide, each stitch a V of two slanted loops of yarn that meet at the bottom in
 * the middle and reach into the next row. `width` is the yarn's thickness. Fine ripples across hint at the twisted fibres.
 * With `rowU`, each row has its own u (in rings, see ringValue: fewer stitches round the inner rows); NaN: no such row.
 */
function knit(u: number, v: number, W: number, s: SurfaceTextureSettings, rowU: ((row: number) => number) | null = null) {
  const H = W * 0.75;
  const row = Math.floor(v / H);
  // A loop: from the bottom middle up and out, steeper than 45 degrees and into the next row; a narrow gutter stays
  // between the columns.
  const sx = W * 0.42, sy = H * 1.3;
  const len = Math.hypot(sx, sy);
  const half = len * 0.5;
  const b = (W / 4) * clamp(s.width, 0.3, 1) * 0.95;
  let best = 0;
  for (let k = -1; k <= 1; k += 1) {
    const uk = rowU ? rowU(row + k) : u;
    if (Number.isNaN(uk)) continue;
    const x = uk - (Math.floor(uk / W) + 0.5) * W;
    const y = v - (row + k) * H;
    for (const side of [-1, 1]) {
      const ax = (side * sx) / len, ay = sy / len;
      const dx = x - (side * sx) / 2, dy = y - 0.2 * H - sy / 2;
      const t = (dx * ax + dy * ay) / half;
      const nn = (-dx * ay + dy * ax) / b;
      const e2 = t * t + nn * nn;
      if (e2 >= 1) continue;
      const fiber = 1 - 0.1 * (0.5 + 0.5 * Math.cos((2 * Math.PI * t * half) / (b * 1.1)));
      best = Math.max(best, yarn(e2, s.profile) * fiber);
    }
  }
  return best;
}

/**
 * A wound rope as a real three-strand rope: rings one above the other `spacing` apart that grip into each other - the
 * rope is a circle of radius R = spacing × (0.5 + 0.5 × width), of which the part above the joint shows, so the joint
 * stays flat (width 0.6: R = 0.8 spacing). On it three strands (radius 0.46 R) as slanted ridges, about 40 degrees to the
 * rope, flatter to the ring's edge. One strand per cell round, so the pattern closes at the seam. In mm, then 0 to 1.
 */
function rope(u: number, v: number, cellU: number, s: SurfaceTextureSettings) {
  const P = s.spacing;
  const y = v - (Math.floor(v / P) + 0.5) * P;
  const R = P * (0.5 + 0.5 * clamp(s.width, 0.1, 1));
  const rim = Math.sqrt(R * R - (P * P) / 4);
  const groove = R - rim;
  const strandR = 0.46 * R;
  // The ring: the rope circle's height above the joint.
  const ringHeight = Math.sqrt(Math.max(0, R * R - y * y)) - rim;
  // The strands: phase across the slanted ridges, 0 on the crest, 1 in the gutter between two strands.
  const q = u / cellU - (1.15 * y) / P;
  const d = Math.abs(q - Math.floor(q) - 0.5) * 2;
  const tilt = Math.sqrt(Math.max(0, 1 - (y * y) / (R * R)));
  const strand = strandR * tilt * yarn(d * d, s.profile);
  return (ringHeight + strand) / (groove + strandR);
}

/**
 * Basket weave: upright stakes `S` apart and weavers in rows of 2/3 S, over and under the stakes in turn - row j lies over
 * stake i when i + j is even. The height is the larger of weaver and stake: the weaver a band with a soft cross-section
 * (1 in the middle, 0.45 at its edge, shaped by `profile`), rising from 0.25 under a stake to 1 over one (a cosine
 * between); the stake a round rod 0.7 high and width × S / 2 across, showing where the weaver runs under it and in the
 * joints between the rows. Soft cross-sections, so nothing overhangs by more than 45 degrees. Around a cylinder it needs
 * an even number of stakes (see makeSurfaceTextureLayout), or two "over"s would meet at the seam.
 */
function weave(u: number, v: number, S: number, s: SurfaceTextureSettings) {
  const rowH = (2 / 3) * S;
  const j = Math.floor(v / rowH);
  const y = v - (j + 0.5) * rowH;
  const over = 0.5 + 0.5 * Math.cos((Math.PI * u) / S + Math.PI * j);
  const band = 0.45 + 0.55 * surfaceFalloff(Math.abs((2 * y) / rowH), s.profile);
  const weaver = (0.25 + 0.75 * over) * band;
  const r = (clamp(s.width, 0.1, 1) * S) / 4;
  const x = Math.abs(u - Math.round(u / S) * S);
  // A round rod, 0 at its edge: the weaver covers the stake's foot, a wide back stays where the weaver runs under it.
  const stake = x < r ? 0.7 * yarn((x / r) * (x / r), s.profile) : 0;
  return Math.max(weaver, stake);
}

/** Carbon: how many crossing bands a band lies over, then under (see SURFACE_TEXTURE_CARBON_WEAVES). */
const CARBON_FLOATS: Record<SurfaceTextureCarbonWeave, [number, number]> = { twill22: [2, 2], twill21: [2, 1], twill31: [3, 1] };
/** A carbon band's flat middle, as a share of its half width; its edges fall off by the profile beyond. */
const CARBON_FLAT = 0.6;
/** How much a band swells over its float: at its ends, where it dives under, it is this much lower than in the middle. */
const CARBON_SWELL = 0.6;
/** And under a crossing band it sinks by this share further (seen only in the gaps between the crossing bands). */
const CARBON_DIP = 0.3;
/**
 * Where the two bands are about as high, the higher is taken softly over this much of the height: a sharp crease there
 * runs aslant to the cuts and came out in teeth.
 */
const CARBON_BLEND = 0.12;
/**
 * Where carbon bands are cut along round the axis (see carbonCuts): places on a band's falling edge, from the end of its
 * flat middle (0) over half way down to its border (1).
 */
const CARBON_PLACES = [0, 0.5, 1];

/** The crossing bands' width, mm: as asked, or as wide as the upright bands (as fitted round the axis). */
function carbonCrossWidth(s: SurfaceTextureSettings, layout: SurfaceTextureLayout) {
  return s.carbonCross > 0 ? s.carbonCross : layout.cell;
}

/**
 * Carbon fibre in twill: upright bands `Su` apart and crossing bands `Sv` apart. An upright band lies over `over` crossing
 * bands and under `under`, and the next one does the same one band higher - the diagonal of a twill, rising to the right.
 * A band is a flat tape with soft edges (`width` its share of the spacing, `profile` its edges) that swells over each
 * float and comes down where it dives under the crossing band; the height is the higher of the two (taken softly where
 * they are about as high, see CARBON_BLEND). Both are continuous everywhere, so the relief has no steps. Around a
 * cylinder the number of upright bands is a multiple of over + under (see makeSurfaceTextureLayout), or the diagonal
 * would break at the seam.
 */
function carbon(u: number, v: number, Su: number, Sv: number, s: SurfaceTextureSettings) {
  const [over, under] = CARBON_FLOATS[s.carbonWeave];
  const period = over + under;
  const i = Math.floor(u / Su), j = Math.floor(v / Sv);
  const fu = u / Su - i, fv = v / Sv - j;
  // Where the upright band is in its repeat (it lies over while k < over), and the crossing band in its own.
  const k = (((j - i) % period) + period) % period;
  const kc = period - 1 - k;
  const w = clamp(s.width, 0.1, 1);
  const tape = (f: number) => {
    const a = Math.abs(2 * f - 1) / w;
    return a >= 1 ? 0 : surfaceFalloff((a - CARBON_FLAT) / (1 - CARBON_FLAT), s.profile);
  };
  // Along a band, p from 0 to 1 over a float or the stretch beneath the crossing bands.
  const onTop = (p: number) => 1 - CARBON_SWELL + CARBON_SWELL * Math.sin(Math.PI * p);
  const beneath = (p: number) => (1 - CARBON_SWELL) * (1 - CARBON_DIP * Math.sin(Math.PI * p));
  const upright = tape(fu) * (k < over ? onTop((k + fv) / over) : beneath((k - over + fv) / under));
  const crossing = tape(fv) * (kc < under ? onTop((kc + fu) / under) : beneath((kc - under + fu) / over));
  const h = Math.max(0, CARBON_BLEND - Math.abs(upright - crossing)) / CARBON_BLEND;
  return Math.min(1, Math.max(upright, crossing) + (h * h * CARBON_BLEND) / 4);
}

/**
 * The courses of a bond, repeating from the bottom up: the lengths of their bricks in a stretcher's length (a header is
 * half one), repeating along the course, and how far along the course begins.
 */
const BRICK_COURSES: Record<SurfaceTextureBrickBond, { lengths: number[]; offset: number }[]> = {
  running: [{ lengths: [1], offset: 0 }, { lengths: [1], offset: 0.5 }],
  stack: [{ lengths: [1], offset: 0 }],
  // Headers centred over the stretchers' joints and middles.
  english: [{ lengths: [1], offset: 0 }, { lengths: [0.5], offset: 0.25 }],
  englishCross: [{ lengths: [1], offset: 0 }, { lengths: [0.5], offset: 0.25 }, { lengths: [1], offset: 0.5 }, { lengths: [0.5], offset: 0.25 }],
  // Every header over the middle of a stretcher below, every stretcher's middle over a header.
  flemish: [{ lengths: [1, 0.5], offset: 0 }, { lengths: [1, 0.5], offset: 0.75 }],
};
/** How far a bond repeats along a course, in stretcher lengths: around a cylinder a whole number of these goes round. */
const BRICK_PERIOD: Record<SurfaceTextureBrickBond, number> = { running: 1, stack: 1, english: 1, englishCross: 1, flemish: 1.5 };
/** The shortest brick of a bond, in stretcher lengths. */
const BRICK_SHORTEST: Record<SurfaceTextureBrickBond, number> = { running: 1, stack: 1, english: 0.5, englishCross: 0.5, flemish: 0.5 };
/** Bricks lying unevenly sink by up to this share of the depth. */
const BRICK_VARY_DEPTH = 0.5;

/**
 * A brick's length and where the bricks begin along `axis` (x, y or z: what u is, flat or all round; 3 to 5 the same on a
 * top or bottom, see SurfaceTextureLayout.capBricks), as fitted.
 */
function brickAlong(layout: SurfaceTextureLayout, axis: number): { origin: number; cell: number } {
  if (axis >= 3) return layout.capBricks?.along ?? brickAlong(layout, axis - 3);
  return (axis >= 0 ? layout.brickAxes?.[axis] : undefined) ?? { origin: 0, cell: layout.cell };
}

/** A course's height and where the first one begins (`axis` as for brickAlong). */
function brickRows(s: SurfaceTextureSettings, layout: SurfaceTextureLayout, axis: number) {
  if (axis >= 3 && layout.capBricks) return { H: layout.capBricks.rowHeight, v0: layout.capBricks.rowOrigin };
  return { H: layout.rowHeight ?? s.brickHeight, v0: layout.rowOrigin ?? 0 };
}

/**
 * The brick at (u, v): its key (its number along the course, the same from both sides of a cylinder's seam, and the
 * course), its middle and half its length and height, the distance to its nearest side (the middle of the joint) and which
 * side that is (0 right, 1 top, 2 left, 3 bottom). `axis`: the axis u runs along (-1 round a cylinder).
 */
function brickAt(u: number, v: number, s: SurfaceTextureSettings, layout: SurfaceTextureLayout, axis: number) {
  const { origin, cell: L } = brickAlong(layout, axis);
  const { H, v0 } = brickRows(s, layout, axis);
  const courses = BRICK_COURSES[s.brickBond];
  const j = Math.floor((v - v0) / H);
  const course = courses[((j % courses.length) + courses.length) % courses.length];
  const lengths = course.lengths;
  let period = 0;
  for (const length of lengths) period += length;
  const x = (u - origin) / L - course.offset;
  const p = Math.floor(x / period);
  const rest = x - p * period;
  let k = 0, left = 0;
  while (k < lengths.length - 1 && rest >= left + lengths[k]) {
    left += lengths[k];
    k += 1;
  }
  const hl = (lengths[k] * L) / 2, hh = H / 2;
  const cx = origin + (course.offset + p * period + left) * L + hl;
  const cy = v0 + (j + 0.5) * H;
  let n = p * lengths.length + k;
  if (layout.around) {
    const perRound = Math.round(((layout.around * BRICK_PERIOD[s.brickBond]) / period) * lengths.length);
    n = ((n % perRound) + perRound) % perRound;
  }
  const right = cx + hl - u, top = cy + hh - v, leftSide = u - (cx - hl), bottom = v - (cy - hh);
  let edge = right, side = 0;
  if (top < edge) [edge, side] = [top, 1];
  if (leftSide < edge) [edge, side] = [leftSide, 2];
  if (bottom < edge) [edge, side] = [bottom, 3];
  return { key: (n + 50000) * 100000 + (j + 50000), n, j, cx, cy, hl, hh, edge, side };
}

/** Half a brick joint's width, mm: as asked, but at most 45 % of the shortest brick or the course, so a brick stays. */
function brickJointHalf(s: SurfaceTextureSettings, layout: SurfaceTextureLayout, axis: number) {
  const { H } = brickRows(s, layout, axis);
  return Math.min(s.brickJoint / 2, 0.45 * Math.min(H, BRICK_SHORTEST[s.brickBond] * brickAlong(layout, axis).cell));
}

/** Bricks: 1 in the middle of a joint, 0 on a brick's face - or, laid unevenly, as deep as that brick lies. */
function brickValue(u: number, v: number, s: SurfaceTextureSettings, layout: SurfaceTextureLayout, axis: number) {
  const brick = brickAt(u, v, s, layout, axis);
  const hw = brickJointHalf(s, layout, axis);
  // A point closer to the joint's edge than the cuts come to a point (SURFACE_MIN_EDGE, see sliceByField) lies on it: a
  // brick's face is often one long triangle, and the least depth at one of its corners tilted it.
  const joint = brick.edge >= hw - SURFACE_MIN_EDGE ? 0 : surfaceFalloff(brick.edge / hw, s.profile);
  if (!(s.brickVary > 0)) return joint;
  const sunk = s.brickVary * BRICK_VARY_DEPTH * hash3(brick.n, brick.j, s.seed);
  return sunk + (1 - sunk) * joint;
}

function valueNoise(x: number, y: number, z: number) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const f = (t: number) => t * t * (3 - 2 * t);
  const fx = f(x - xi), fy = f(y - yi), fz = f(z - zi);
  let sum = 0;
  for (let dz = 0; dz < 2; dz += 1) {
    for (let dy = 0; dy < 2; dy += 1) {
      for (let dx = 0; dx < 2; dx += 1) {
        const w = (dx ? fx : 1 - fx) * (dy ? fy : 1 - fy) * (dz ? fz : 1 - fz);
        sum += w * hash3(xi + dx, yi + dy, zi + dz);
      }
    }
  }
  return sum;
}

/** Grain: noise in space (no projection, so no seam and no stretching anywhere), grains about `size` mm, 0 to 1. */
function grain(x: number, y: number, z: number, size: number, seed: number) {
  // Another seed: the same noise further along (a whole number of its cells, so seed 1 is where it began).
  const ox = 7919 * (seed - 1);
  const n =
    0.55 * valueNoise(x / size + ox, y / size, z / size) +
    0.3 * valueNoise((2 * x) / size + 17 + ox, (2 * y) / size, (2 * z) / size) +
    0.15 * valueNoise((4 * x) / size + ox, (4 * y) / size + 31, (4 * z) / size);
  return clamp((n - 0.2) / 0.6, 0, 1);
}

/** Mirrored tiles: 0 to 1, then back to 0, and so on. */
function mirrorTile(t: number) {
  const f = t - 2 * Math.floor(t / 2);
  return f <= 1 ? f : 2 - f;
}

/** An image's grey value at (u, v) mm, its tiles `layout.cell` wide and `layout.tileHeight` high. */
function imageValue(u: number, v: number, s: SurfaceTextureSettings, layout: SurfaceTextureLayout) {
  const image = layout.image;
  if (!image) return 0;
  let uu = u, vv = v;
  if (s.imageTurn) {
    const a = (s.imageTurn * Math.PI) / 180;
    const ru = uu * Math.cos(a) + vv * Math.sin(a);
    vv = -uu * Math.sin(a) + vv * Math.cos(a);
    uu = ru;
  }
  let tu = uu / layout.cell, tv = vv / (layout.tileHeight || layout.cell);
  const mirror = s.imageTiling === "mirror";
  if (mirror) {
    tu = mirrorTile(tu);
    tv = mirrorTile(tv);
  } else if (s.imageTiling === "staggered" && Math.floor(tv) % 2) tu += 0.5;
  const grey = sampleGreyImage(image, tu, tv, mirror);
  return s.imageInvert ? 1 - grey : grey;
}

/**
 * The image a texture samples, softened as asked (kept for the last few) - and at least to the mesh: given the triangles'
 * edge and the tile's width (mm), over a quarter of an edge. The mesh cannot follow an edge of the picture that is sharper
 * than its own triangles: terrazzo's chips came out in steps of the grid, about 0.6 mm each, which a printer prints too
 * (cutting along the picture's contour lines did not help: the facets next to the cut still followed the grid). Softened,
 * their walls slope over about a triangle and run smoothly; a 0.4 mm nozzle could not print them sharper anyway.
 */
const imageCache = new Map<string, GreyImage>();
const SOFTEN_TO_MESH = 0.25;
function textureImage(s: SurfaceTextureSettings, edge = 0, tileWidth = 1): GreyImage | null {
  const own = s.image === "own" ? s.imageOwn : null;
  if (s.image === "own" && !own) return null;
  const plain = own ? ownGreyImage(own) : surfaceTexturePresetImage(s.image as Exclude<SurfaceTextureImage, "own">, 512);
  // Softening counts in points of an image 256 wide, so it softens a ready image (512 wide) as much as one's own.
  const asked = s.imageBlur * Math.max(1, plain.width / 256);
  const radius = Math.min(16, Math.round(Math.max(asked, (SOFTEN_TO_MESH * edge * plain.width) / tileWidth)));
  const key = `${own ? ownImageKey(own) : s.image}|${radius}`;
  const cached = imageCache.get(key);
  if (cached) return cached;
  const image = blurGreyImage(plain, radius);
  if (imageCache.size > 8) imageCache.clear();
  imageCache.set(key, image);
  return image;
}

/** Where the pattern lies on the body: axis, radius, and spacing after rounding (see makeLayout). */
export type SurfaceTextureLayout = {
  /** How the pattern lies on this body ("auto" decided). */
  projection: Exclude<SurfaceTextureProjection, "auto">;
  /** Grooves: distance between two grooves across them. */
  period: number;
  /** Honeycomb, bumps and cells: centre spacing; knitting: a stitch's width; rope: a strand's; weave: between stakes; image: a tile's width. */
  cell: number;
  /** Around a cylinder: how many grooves or cells go round, else null. */
  around: number | null;
  /** Grooves and knurling: the slant, adjusted when they lie almost level so they meet after one round. */
  angle: number;
  /** The axis' place across it (the two other coordinates). */
  center: [number, number];
  /** Mean radius of the walls with the pattern, and the smallest and largest. */
  radius: number;
  rMin: number;
  rMax: number;
  /** Cracks: their lines on the surface (set by the session, which knows the body). */
  crack?: CrackNetwork | null;
  /** Text: where it is stuck on and the window round it (set by the session). */
  text?: SurfaceTextPlacement | null;
  /** Image: the grey values and a tile's height, mm. */
  image?: GreyImage | null;
  tileHeight?: number;
  /** Bricks: a course's height as fitted (mm), where the bottom course begins along the courses' axis, and how many fit. */
  rowHeight?: number;
  rowOrigin?: number;
  rows?: number;
  /** Bricks flat or all round: per axis x, y, z a brick's length as fitted to the body's size along it, and where they begin. */
  brickAxes?: { origin: number; cell: number }[];
  /**
   * Bricks on a top or bottom (all round: seen along z; round a body: along its axis): their length and courses fitted
   * to its own size, ending in a brick at an edge to a side with bricks (see fitBrickCourses).
   */
  capBricks?: { along: { origin: number; cell: number }; rowHeight: number; rowOrigin: number };
  /** Wood grain, and the ends of a log with bark: where the pith runs, and the knots. */
  wood?: WoodFrame | null;
  /**
   * Around a cylinder with a top or bottom that gets the pattern (set by the session): there it lies flat, across the
   * axis, or runs in rings (RING_PATTERNS) - round the axis it would run together into rays.
   */
  flatCaps?: boolean;
  /**
   * Round an angular body standing along the axis (a box, a prism): its outline, along which the pattern runs instead of
   * round a circle - no seam at the corners. `radius` is then its length over 2π.
   */
  outline?: SurfaceOutline | null;
  /**
   * Where a side meets a top or bottom with the pattern (set by the session, see SurfaceTextureSettings.capEdge): the
   * side's rows run over the edge, or a border runs round it - at these rims.
   */
  capEdge?: "over" | "fold" | "bead" | null;
  rims?: SurfaceRim[];
  /** Every patterned top's or bottom's rim round a patterned side, whatever capEdge says: a pattern cut in meets in a mitre there (see edgeRounding). */
  inRims?: SurfaceRim[];
};

/**
 * The edge round a top (`sign` 1) or bottom (-1) with the pattern: its place along the axis, round a round body its
 * radius there, and how far either side of it the pattern bends round it (see edgeRounding).
 */
export type SurfaceRim = { level: number; sign: 1 | -1; radius: number; reach: number };

/** The move (mm, out positive) the pattern makes at a point for a normal there; NaN where only the point's own is known. */
type SurfaceFootDepth = (foot: number[], normal: number[]) => number;

/**
 * A text stuck on: the anchor on the surface (the middle of the text's box), the box (mm), the window round it (half
 * width and height with a margin) and how far the unrolling reaches.
 */
export type SurfaceTextPlacement = { point: number[]; face: number; width: number; height: number; halfW: number; halfH: number; reach: number };

/** The box round a text's outlines. */
function outlineBox(rings: number[][]) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const ring of rings) {
    for (let k = 0; k < ring.length; k += 2) {
      minX = Math.min(minX, ring[k]); maxX = Math.max(maxX, ring[k]);
      minY = Math.min(minY, ring[k + 1]); maxY = Math.max(maxY, ring[k + 1]);
    }
  }
  return Number.isFinite(minX) ? { minX, maxX, minY, maxY } : null;
}

/**
 * The signed distance of a point of a text's plane to its outlines, mm: below 0 inside the letters (even-odd), above
 * 0 outside, held to -`cap` .. `cap` further away. Edges are kept in rows (for the inside test) and in cells (for the
 * distance), so only the few near a point are looked at.
 */
function textDistance(rings: number[][], cap: number) {
  const box = outlineBox(rings);
  if (!box) return () => cap;
  const edges: number[] = [];
  for (const ring of rings) {
    const n = ring.length / 2;
    for (let k = 0; k < n; k += 1) {
      const j = (k + 1) % n;
      if (ring[k * 2] === ring[j * 2] && ring[k * 2 + 1] === ring[j * 2 + 1]) continue;
      edges.push(ring[k * 2], ring[k * 2 + 1], ring[j * 2], ring[j * 2 + 1]);
    }
  }
  const E = edges.length / 4;
  const cell = Math.max(cap, (box.maxY - box.minY) / 48, 0.05);
  const cols = Math.max(1, Math.ceil((box.maxX - box.minX + 2 * cap) / cell) + 1);
  const rows = Math.max(1, Math.ceil((box.maxY - box.minY + 2 * cap) / cell) + 1);
  const x0 = box.minX - cap, y0 = box.minY - cap;
  const byRow: number[][] = Array.from({ length: rows }, () => []);
  const byCell = new Map<number, number[]>();
  for (let e = 0; e < E; e += 1) {
    const ax = edges[e * 4], ay = edges[e * 4 + 1], bx = edges[e * 4 + 2], by = edges[e * 4 + 3];
    const r0 = Math.max(0, Math.floor((Math.min(ay, by) - y0) / cell)), r1 = Math.min(rows - 1, Math.floor((Math.max(ay, by) - y0) / cell));
    for (let r = r0; r <= r1; r += 1) byRow[r].push(e);
    const c0 = Math.max(0, Math.floor((Math.min(ax, bx) - cap - x0) / cell)), c1 = Math.min(cols - 1, Math.floor((Math.max(ax, bx) + cap - x0) / cell));
    const s0 = Math.max(0, Math.floor((Math.min(ay, by) - cap - y0) / cell)), s1 = Math.min(rows - 1, Math.floor((Math.max(ay, by) + cap - y0) / cell));
    for (let r = s0; r <= s1; r += 1) for (let c = c0; c <= c1; c += 1) {
      const key = r * cols + c;
      const list = byCell.get(key);
      if (list) list.push(e);
      else byCell.set(key, [e]);
    }
  }
  return (x: number, y: number) => {
    if (x < x0 || y < y0 || x > box.maxX + cap || y > box.maxY + cap) return cap;
    const r = Math.min(rows - 1, Math.floor((y - y0) / cell)), c = Math.min(cols - 1, Math.floor((x - x0) / cell));
    let inside = false;
    for (const e of byRow[r]) {
      const ay = edges[e * 4 + 1], by = edges[e * 4 + 3];
      if (ay > y === by > y) continue;
      const ax = edges[e * 4], bx = edges[e * 4 + 2];
      if (x < ax + ((y - ay) * (bx - ax)) / (by - ay)) inside = !inside;
    }
    let d = cap;
    for (const e of byCell.get(r * cols + c) ?? []) {
      const ax = edges[e * 4], ay = edges[e * 4 + 1], dx = edges[e * 4 + 2] - ax, dy = edges[e * 4 + 3] - ay;
      const l2 = dx * dx + dy * dy;
      const t = l2 > 0 ? clamp(((x - ax) * dx + (y - ay) * dy) / l2, 0, 1) : 0;
      d = Math.min(d, Math.hypot(ax + t * dx - x, ay + t * dy - y));
    }
    return inside ? -d : d;
  };
}

/**
 * A text's signed distance per point (see textDistance) from its place in the unrolled plane, the letters turned by
 * `turn` degrees; a point the unrolling did not reach lies outside.
 */
function textField(U: Float64Array, V: Float64Array, rings: number[][], turn: number, cap: number) {
  const distance = textDistance(rings, cap);
  const a = (turn * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a);
  const out = new Float64Array(U.length).fill(cap);
  for (let i = 0; i < U.length; i += 1) if (Number.isFinite(U[i])) out[i] = distance(U[i] * c + V[i] * sn, -U[i] * sn + V[i] * c);
  return out;
}

/** Half the width of a letter's wall, mm: the mesh is cut this far either side of the outline, the wall between. */
const TEXT_WALL = 0.05;

/** A hash of a text's outlines, for knowing when they changed. */
function outlineKey(rings: number[][]) {
  let h = 2166136261;
  for (const ring of rings) {
    h = Math.imul(h ^ ring.length, 16777619);
    for (const value of ring) h = Math.imul(h ^ Math.round(value * 1000), 16777619);
  }
  return h >>> 0;
}

/** The first face a ray meets, from `from` along the unit direction `dir` (Möller–Trumbore); null when it meets none. */
function firstHit(mesh: { vertices: Float64Array; indices: Uint32Array }, from: number[], dir: number[]) {
  const v = mesh.vertices, I = mesh.indices;
  let best = Infinity, face = -1;
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
    const e1x = v[b] - v[a], e1y = v[b + 1] - v[a + 1], e1z = v[b + 2] - v[a + 2];
    const e2x = v[c] - v[a], e2y = v[c + 1] - v[a + 1], e2z = v[c + 2] - v[a + 2];
    const px = dir[1] * e2z - dir[2] * e2y, py = dir[2] * e2x - dir[0] * e2z, pz = dir[0] * e2y - dir[1] * e2x;
    const det = e1x * px + e1y * py + e1z * pz;
    if (Math.abs(det) < 1e-12) continue;
    const sx = from[0] - v[a], sy = from[1] - v[a + 1], sz = from[2] - v[a + 2];
    const u = (sx * px + sy * py + sz * pz) / det;
    if (u < 0 || u > 1) continue;
    const qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x;
    const w = (dir[0] * qx + dir[1] * qy + dir[2] * qz) / det;
    if (w < 0 || u + w > 1) continue;
    const distance = (e2x * qx + e2y * qy + e2z * qz) / det;
    if (distance > 0 && distance < best) {
      best = distance;
      face = t / 3;
    }
  }
  return face < 0 ? null : { face, point: [from[0] + dir[0] * best, from[1] + dir[1] * best, from[2] + dir[2] * best] };
}

/** Which way 0 degrees round the axis and 90 degrees look: the front and the right upright, the top lying (x or y). */
const TEXT_FRONT: Record<SurfaceTextureAxis, [number[], number[]]> = {
  z: [[0, -1, 0], [1, 0, 0]],
  y: [[0, 0, 1], [1, 0, 0]],
  x: [[0, 0, 1], [0, -1, 0]],
};

/** On a round body's top and bottom these run in rings round the middle, like a tree's year rings (see ringValue). */
const RING_PATTERNS: readonly SurfaceTexturePattern[] = ["grooves", "rope", "knit"];

/**
 * Grooves, rope and knitting on a top or bottom in rings: `r` across them (round a circle: from the middle out; following
 * an outline: from it in), `turn` round them (0 to 1), `lengthAt` a ring's length at r. Rings lie `period` (grooves) or
 * `spacing` (rope; knitting: its rows) apart, the first half a ring from where r starts. Each ring of rope or knitting has
 * a whole number of strands or stitches of about the cell round it, so it closes; shorter rings have fewer.
 */
function ringValue(r: number, turn: number, lengthAt: (r: number) => number, s: SurfaceTextureSettings, layout: SurfaceTextureLayout) {
  if (s.pattern === "grooves") return stripe(r, 0, 0, layout.period, s);
  const W = layout.cell;
  const round = (middle: number) => Math.max(1, Math.round(lengthAt(middle) / W)) * W;
  if (s.pattern === "rope") return rope(turn * round((Math.floor(r / s.spacing) + 0.5) * s.spacing), r, W, s);
  const H = 0.75 * W;
  return knit(0, r, W, s, (row) => (row < 0 ? NaN : turn * round((row + 0.5) * H)));
}

/** Ring patterns on a top or bottom (see ringValue): round a circle about the middle, or following an angular body's outline. */
function capRingValue(a: number, b: number, s: SurfaceTextureSettings, layout: SurfaceTextureLayout) {
  if (layout.outline) {
    const ring = outlineRing(layout.outline, a, b);
    return ringValue(ring.depth, ring.turn, ring.lengthAt, s, layout);
  }
  const du = a - layout.center[0], dv = b - layout.center[1];
  return ringValue(Math.hypot(du, dv), Math.atan2(dv, du) / (2 * Math.PI), (r) => 2 * Math.PI * r, s, layout);
}

/** Whether a top or bottom round the axis takes the pattern in rings (see SurfaceTextureSettings.capStyle). */
function ringsOnCaps(s: SurfaceTextureSettings, layout: SurfaceTextureLayout) {
  if (!layout.flatCaps || !RING_PATTERNS.includes(s.pattern)) return false;
  if (layout.outline) return s.capStyle === "rings" && layout.outline.ringable;
  return s.capStyle !== "rows";
}

/** The rim of the top or bottom a point at `h` along the axis lies on (`sign`: which way its face looks), if it has one. */
function rimAt(layout: SurfaceTextureLayout, h: number, sign: number) {
  if (!layout.capEdge || !layout.rims) return null;
  for (const rim of layout.rims) if (rim.sign === sign && Math.abs(rim.level - h) <= RIM_LEVEL) return rim;
  return null;
}

/** A point on a top or bottom this close to its rim's level (mm) lies on it. */
const RIM_LEVEL = 1e-3;

/**
 * A point of a top or bottom in rings from its rim inwards: how far in (`depth`), how far round (`turn`, 0 to 1), the
 * length of the ring at a depth, and the outward direction to the rim (across the axis). Following the outline, or round
 * a circle of the rim's radius.
 */
function rimRing(a: number, b: number, rim: SurfaceRim, layout: SurfaceTextureLayout) {
  if (layout.outline) return outlineRing(layout.outline, a, b);
  const du = a - layout.center[0], dv = b - layout.center[1];
  const r = Math.hypot(du, dv);
  const turn = Math.atan2(dv, du) / (2 * Math.PI);
  const normal: [number, number] = r > 1e-9 ? [du / r, dv / r] : [1, 0];
  return { depth: Math.max(0, rim.radius - r), turn: turn - Math.floor(turn), lengthAt: (d: number) => 2 * Math.PI * Math.max(rim.radius - d, 1e-6), normal };
}

/** The distance between two rows of a ring pattern: rope's rings, knitting's rows, grooves. */
function rowPeriod(s: SurfaceTextureSettings, layout: SurfaceTextureLayout) {
  return s.pattern === "rope" ? s.spacing : s.pattern === "knit" ? 0.75 * layout.cell : layout.period;
}

/**
 * The side's rows run over the edge onto a top or bottom (capEdge "over"): there each point lies as far round the axis
 * as on the side, and as far "up" as the rim plus its depth in from it - the rows go on as rings, one after the other
 * (see ringValue; the side's rows lie along the axis from 0 as well). In rings all over, or (capEdge "fold") in a band
 * of one to two rows, ending in a joint, the top's own pattern inside running under its last ring.
 */
function overValue(a: number, b: number, h: number, rim: SurfaceRim, s: SurfaceTextureSettings, layout: SurfaceTextureLayout) {
  const ring = rimRing(a, b, rim, layout);
  if (!levelGrooves(s, layout)) return rayValue(a, b, h, rim, ring, s, layout);
  const ringed = () => ringValue(h + rim.sign * ring.depth, ring.turn, (r) => ring.lengthAt(Math.max(0, rim.sign * (r - h))), s, layout);
  if (layout.capEdge === "over") return ringed();
  const P = rowPeriod(s, layout);
  const band = overBand(rim, P);
  const inner = ring.depth > band - P / 2 ? topValue(a, b, s, layout) : 0;
  return ring.depth < band ? Math.max(ringed(), inner) : inner;
}

/** A top's or bottom's own pattern round the axis: in rings or in rows (see SurfaceTextureSettings.capStyle). */
function topValue(a: number, b: number, s: SurfaceTextureSettings, layout: SurfaceTextureLayout) {
  return ringsOnCaps(s, layout) ? capRingValue(a, b, s, layout) : patternValue(...turnOnFace(a, b, s, layout), s, layout, acrossAxes(s.axis)[0]);
}

/** Grooves running level round the axis (or another ring pattern): their rows go on over a rim as rings. */
function levelGrooves(s: SurfaceTextureSettings, layout: SurfaceTextureLayout) {
  return s.pattern !== "grooves" || Math.abs(layout.angle) > 89.5;
}

/**
 * Upright or slanted grooves running over a rim (capEdge "over"): each goes on inwards from where it reaches the rim, as
 * far round as there - upright ones as rays towards the middle, meeting at an angular top's diagonals as in a mitred
 * frame, slanted ones turning on. Inwards they draw together with the shorter rings: running over (capEdge "over") they
 * run in until they lie at RAY_SHARE of their spacing on the side and fade out there, the middle staying smooth; folded
 * over (capEdge "fold") they run in a band of RAY_BAND spacings, fading out over its last half spacing as the top's own
 * pattern inside fades in.
 */
function rayValue(a: number, b: number, h: number, rim: SurfaceRim, ring: ReturnType<typeof rimRing>, s: SurfaceTextureSettings, layout: SurfaceTextureLayout) {
  const length = ring.lengthAt(0);
  const P = layout.period;
  const rays = stripe(ring.turn * length, h + rim.sign * ring.depth, layout.angle, P, s);
  const end = rayReach(rim, s, layout);
  const fade = clamp((end - ring.depth) / (P / 2), 0, 1);
  if (layout.capEdge === "over") return rays * fade;
  // The pattern inside fades in where the rays fade out: neither ends at a wall.
  const inner = ring.depth > end - P / 2 ? topValue(a, b, s, layout) * (1 - fade) : 0;
  return Math.max(rays * fade, inner);
}

/** How far in from a rim upright or slanted grooves run (see rayValue). */
function rayReach(rim: SurfaceRim, _s: SurfaceTextureSettings, layout: SurfaceTextureLayout) {
  if (layout.capEdge !== "over") return RAY_BAND * layout.period;
  // Where the ring is RAY_SHARE as long as the rim.
  if (layout.outline) {
    const loop = layout.outline.loops[layout.outline.main];
    return ((1 - RAY_SHARE) * loop.length) / Math.max(loop.ringAll, 1e-9);
  }
  return (1 - RAY_SHARE) * rim.radius;
}

/** Grooves running in from a rim: as far as their spacing shrinks to this share, or in a band of this many spacings. */
const RAY_SHARE = 0.4;
const RAY_BAND = 2;

/** How far the side's rows run in onto a top with rows (see overValue): to the first joint at least a row in. */
function overBand(rim: SurfaceRim, P: number) {
  return rim.sign > 0 ? Math.ceil((rim.level + P) / P - 1e-9) * P - rim.level : rim.level - Math.floor((rim.level - P) / P + 1e-9) * P;
}

/** Half the width of the border round a rim (capEdge "bead"), mm: rope's cord thicker than its rings, a stitch's width. */
function beadHalf(s: SurfaceTextureSettings, layout: SurfaceTextureLayout) {
  if (s.pattern === "rope") return 0.75 * s.spacing;
  if (s.pattern === "knit") return layout.cell / 2;
  return Math.max(0.5, s.spacing / 2);
}

/**
 * The border round a rim (capEdge "bead"), 0 to 1: `c` across it (mm from the edge, the side's way along the axis
 * negative), `along` round it (mm) of `length` all round. Rope: a cord with its strands; knitting: a chain of stitches
 * lying along the edge, as cast off; the rest a round bead with the pattern's profile.
 */
function beadValue(c: number, along: number, length: number, s: SurfaceTextureSettings, layout: SurfaceTextureLayout) {
  const half = beadHalf(s, layout);
  if (Math.abs(c) >= half) return 0;
  if (s.pattern === "rope") {
    const cord = { ...s, spacing: 2 * half };
    const strands = Math.max(1, Math.round(length / (1.5 * layout.cell)));
    return rope(along, c + half, length / strands, cord);
  }
  if (s.pattern === "knit") {
    const H = 0.75 * layout.cell;
    const rows = Math.max(1, Math.round(length / H));
    return knit(c + half, (along * rows * H) / length, layout.cell, s);
  }
  return yarn((c / half) ** 2, s.profile);
}

/**
 * What happens at the rims of a top or bottom with the pattern round the axis (see SurfaceTextureSettings.capEdge): the
 * side's pattern runs over or folds over (ring patterns, round a circle or a single outline; automatically over a top in
 * rings, folded over one in rows), a border, or nothing (null: sharp).
 */
function capEdgeMode(s: SurfaceTextureSettings, layout: SurfaceTextureLayout): "over" | "fold" | "bead" | null {
  if (!layout.flatCaps || s.pattern === "text" || s.pattern === "cracks" || s.pattern === "grain" || s.pattern === "wood") return null;
  const canRunOver = RING_PATTERNS.includes(s.pattern) && (!layout.outline || layout.outline.ringable);
  if (s.capEdge === "bead") return "bead";
  if (!canRunOver || s.capEdge === "sharp") return null;
  if (s.capEdge === "auto") return ringsOnCaps(s, layout) ? "over" : "fold";
  return s.capEdge;
}

/** The angle round the axis, radians: round a circle, or along an angular body's outline (see SurfaceTextureLayout.outline). */
function aroundAngle(layout: SurfaceTextureLayout, a: number, b: number) {
  return layout.outline ? outlineAngle(layout.outline, a, b) : Math.atan2(b - layout.center[1], a - layout.center[0]);
}

/** (u, v) on a face seen along the axis, the pattern turned there by `faceTurn` degrees round the layout's middle (`back`: undone). */
function turnOnFace(u: number, v: number, s: SurfaceTextureSettings, layout: SurfaceTextureLayout, back = false): [number, number] {
  // Bricks lie in courses fitted to the body's edges (see fitBrickCourses), not turned.
  if (!s.faceTurn || s.pattern === "bricks") return [u, v];
  const a = ((back ? -s.faceTurn : s.faceTurn) * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a);
  const [c1, c2] = layout.center;
  const du = u - c1, dv = v - c2;
  return [c1 + du * c + dv * sn, c2 - du * sn + dv * c];
}

/** The pattern's value at (u, v) of its plane; `axis`: the axis u runs along, x, y or z (-1 round a cylinder). */
function patternValue(u: number, v: number, s: SurfaceTextureSettings, layout: SurfaceTextureLayout, axis: number) {
  switch (s.pattern) {
    case "grooves":
      return stripe(u, v, layout.angle, layout.period, s);
    case "knurl":
      return Math.max(stripe(u, v, layout.angle, layout.period, s), stripe(u, v, -layout.angle, layout.period, s));
    case "honeycomb":
      return surfaceFalloff(hexCell(u, v, layout.cell).edge / ((layout.cell / 2) * s.width), s.profile);
    case "bumps": {
      const c = bumpSite(u, v, layout.cell, s.bumpGrid);
      return surfaceFalloff(Math.hypot(u - c.x, v - c.y) / ((layout.cell / 2) * s.width), s.profile);
    }
    case "cells":
      return surfaceFalloff(cellEdge(u, v, layout.cell, layout.around, s.seed) / ((layout.cell / 2) * s.width), s.profile);
    case "bricks":
      return brickValue(u, v, s, layout, axis);
    case "knit":
      return knit(u, v, layout.cell, s);
    case "rope":
      return rope(u, v, layout.cell, s);
    case "weave":
      return weave(u, v, layout.cell, s);
    case "carbon":
      return carbon(u, v, layout.cell, carbonCrossWidth(s, layout), s);
    case "bark":
      return barkValue(s.barkType, u, v, layout.cell, layout.around, s.seed);
    case "image":
      return imageValue(u, v, s, layout);
    default:
      return 0;
  }
}

/** The rings on the ends of a log with bark lie this much as deep as the bark. */
const BARK_END_DEPTH = 0.4;

/**
 * The border round a rim at a point (capEdge "bead", see beadValue), 0 where there is none: on a top or bottom (`nAx`,
 * its normal along the axis, more than 0.8) from its rim in, on a side from the rim above or below. With it, how much of
 * the pattern stays there: none under the border's middle, all from just beyond its foot on - the pattern ends under it
 * (taken the higher of the two, the side's rows hid the cord's strands at the edge).
 */
export function surfaceTextureBeadAt(x: number, y: number, z: number, nAx: number, s: SurfaceTextureSettings, layout: SurfaceTextureLayout): [number, number] {
  if (layout.capEdge !== "bead" || !layout.rims) return [0, 1];
  const pos = [x, y, z];
  const ax = AXIS_INDEX[s.axis];
  const [i1, i2] = acrossAxes(s.axis);
  const half = beadHalf(s, layout);
  const keep = (c: number) => {
    const t = clamp((Math.abs(c) / half - BEAD_KEEP[0]) / (BEAD_KEEP[1] - BEAD_KEEP[0]), 0, 1);
    return t * t * (3 - 2 * t);
  };
  if (layout.flatCaps && Math.abs(nAx) > 0.8) {
    const rim = rimAt(layout, pos[ax], Math.sign(nAx));
    if (!rim) return [0, 1];
    const ring = rimRing(pos[i1], pos[i2], rim, layout);
    if (ring.depth >= BEAD_KEEP[1] * half) return [0, 1];
    const length = ring.lengthAt(0);
    return [beadValue(rim.sign * ring.depth, ring.turn * length, length, s, layout), keep(ring.depth)];
  }
  const length = 2 * Math.PI * layout.radius;
  const turn = aroundAngle(layout, pos[i1], pos[i2]) / (2 * Math.PI);
  let bead = 0, kept = 1;
  for (const rim of layout.rims) {
    const c = pos[ax] - rim.level;
    if (Math.abs(c) >= BEAD_KEEP[1] * half) continue;
    bead = Math.max(bead, beadValue(c, (turn - Math.floor(turn)) * length, length, s, layout));
    kept = Math.min(kept, keep(c));
  }
  return [bead, kept];
}

/** How many edges are not shared by exactly two triangles. */
function badEdges(indices: Uint32Array) {
  const count = new Map<number, number>();
  for (let t = 0; t < indices.length; t += 3) {
    for (let k = 0; k < 3; k += 1) {
      const a = indices[t + k], b = indices[t + ((k + 1) % 3)];
      const key = Math.min(a, b) * 67108864 + Math.max(a, b);
      count.set(key, (count.get(key) ?? 0) + 1);
    }
  }
  let bad = 0;
  for (const n of count.values()) if (n !== 2) bad += 1;
  return bad;
}

/** The pattern's value with a border over it (see surfaceTextureBeadAt). */
function beadOver(value: number, [bead, keep]: [number, number]) {
  return Math.max(value * keep, bead);
}

/** Under a border round a rim the pattern fades out between these shares of its half width (see surfaceTextureBeadAt). */
const BEAD_KEEP = [0.5, 1.15];

/** Pattern value 0 to 1 at a point with its normal. */
export function surfaceTextureValueAt(x: number, y: number, z: number, nx: number, ny: number, nz: number, s: SurfaceTextureSettings, layout: SurfaceTextureLayout) {
  // Cracks lie on the surface itself, not in a projection.
  if (s.pattern === "cracks") return layout.crack ? crackValue(layout.crack, x, y, z, nx, ny, nz, s.profile) : 0;
  // Grain is noise in space: no projection. So is wood, a piece cut from a trunk.
  if (s.pattern === "grain") return grain(x, y, z, s.spacing, s.seed);
  if (s.pattern === "wood") return layout.wood ? woodValue(s.woodType, layout.wood, x, y, z, s.ringWidth, s.woodWobble, s.seed, [nx, ny, nz]) : 0;
  // A log with bark shows the annual rings of its wood on its ends, less deep than the bark.
  if (s.pattern === "bark" && layout.wood && Math.abs([nx, ny, nz][AXIS_INDEX[s.axis]]) > 0.7) {
    return BARK_END_DEPTH * woodValue(BARK_WOOD[s.barkType], layout.wood, x, y, z, s.ringWidth, 0.5, s.seed, [nx, ny, nz]);
  }
  const pos = [x, y, z];
  const projection = s.projection === "auto" ? layout.projection : s.projection;
  if (projection === "cylinder") {
    const ax = AXIS_INDEX[s.axis];
    const [i1, i2] = acrossAxes(s.axis);
    const nAx = [nx, ny, nz][ax];
    let value: number;
    if (layout.flatCaps && Math.abs(nAx) > 0.8) {
      const rim = rimAt(layout, pos[ax], Math.sign(nAx));
      if (rim && (layout.capEdge === "over" || layout.capEdge === "fold")) return overValue(pos[i1], pos[i2], pos[ax], rim, s, layout);
      value = ringsOnCaps(s, layout) ? capRingValue(pos[i1], pos[i2], s, layout) : patternValue(...turnOnFace(pos[i1], pos[i2], s, layout), s, layout, i1 + 3);
    } else value = patternValue(aroundAngle(layout, pos[i1], pos[i2]) * layout.radius, pos[ax], s, layout, -1);
    if (layout.capEdge !== "bead") return value;
    return beadOver(value, surfaceTextureBeadAt(x, y, z, nAx, s, layout));
  }
  if (projection === "flat") {
    const [i1, i2] = acrossAxes(s.axis);
    return patternValue(...turnOnFace(pos[i1], pos[i2], s, layout), s, layout, i1);
  }
  // All round: three projections, weighted by the normal; the one along the axis turned (see faceTurn).
  const wx = nx ** 4, wy = ny ** 4, wz = nz ** 4;
  const sum = wx + wy + wz || 1;
  const ax = AXIS_INDEX[s.axis];
  const along = (k: number, u: number, v: number, uAxis: number) => (k === ax ? patternValue(...turnOnFace(u, v, s, layout), s, layout, uAxis) : patternValue(u, v, s, layout, uAxis));
  // Seen along z, a top or bottom: its bricks fitted of its own (see SurfaceTextureLayout.capBricks).
  // A projection without weight is not asked for (on a box's face two of three).
  return ((wx > 0 ? wx * along(0, y, z, 1) : 0) + (wy > 0 ? wy * along(1, x, z, 0) : 0) + (wz > 0 ? wz * along(2, x, y, 3) : 0)) / sum;
}

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

/**
 * Centre of a circle through weighted points (algebraic fit after Kasa), robust: points far off
 * the circle (a handle, a spout) lose their weight over three rounds - measured by the weighted
 * median of the deviation, at least 2 % of the radius, so a bulging or conical body (all points
 * deviate, but evenly) loses nothing. null when the points do not make a circle.
 */
function robustCircleCenter(x: number[], y: number[], w0: number[]): [number, number] | null {
  const m = x.length;
  let w = Float64Array.from(w0);
  let total = 0;
  for (let k = 0; k < m; k += 1) total += w0[k];
  let center: [number, number] | null = null;
  for (let iter = 0; iter < 3; iter += 1) {
    let W = 0, mx = 0, my = 0;
    for (let k = 0; k < m; k += 1) {
      W += w[k];
      mx += w[k] * x[k];
      my += w[k] * y[k];
    }
    if (!(W > 0.05 * total)) break;
    mx /= W;
    my /= W;
    // About the centroid the constant term drops out and a 2×2 system is left.
    let Sxx = 0, Sxy = 0, Syy = 0, Sxz = 0, Syz = 0;
    for (let k = 0; k < m; k += 1) {
      const dx = x[k] - mx, dy = y[k] - my, z = dx * dx + dy * dy;
      Sxx += w[k] * dx * dx;
      Sxy += w[k] * dx * dy;
      Syy += w[k] * dy * dy;
      Sxz += w[k] * dx * z;
      Syz += w[k] * dy * z;
    }
    const det = Sxx * Syy - Sxy * Sxy;
    if (!(det > 1e-9 * (Sxx + Syy) ** 2)) break;
    const D = (-Sxz * Syy + Syz * Sxy) / det;
    const E = (-Syz * Sxx + Sxz * Sxy) / det;
    const cx = mx - D / 2, cy = my - E / 2;
    center = [cx, cy];
    if (iter === 2) break;
    // Deviation from the circle per point; points far off fade out (Tukey).
    const r = new Float64Array(m);
    let R = 0;
    for (let k = 0; k < m; k += 1) {
      r[k] = Math.hypot(x[k] - cx, y[k] - cy);
      R += (w[k] / W) * r[k];
    }
    const order = Array.from({ length: m }, (_, k) => k).sort((a, b) => Math.abs(r[a] - R) - Math.abs(r[b] - R));
    let acc = 0, median = 0;
    for (const k of order) {
      acc += w[k];
      if (acc >= W / 2) {
        median = Math.abs(r[k] - R);
        break;
      }
    }
    const scale = 4.685 * Math.max(1.4826 * median, 0.02 * R);
    const next = new Float64Array(m);
    for (let k = 0; k < m; k += 1) {
      const e = Math.abs(r[k] - R) / scale;
      next[k] = e < 1 ? w0[k] * (1 - e * e) ** 2 : 0;
    }
    w = next;
  }
  return center;
}

/**
 * Where the pattern goes on the body. Around a cylinder: u = arc length round on the radius of the
 * walls with the pattern, v = along the axis; spacing and groove count are rounded so the pattern
 * closes exactly at the seam.
 *
 * Axis: a circle fitted through the centroids of the side faces (weighted by area, outliers like
 * a handle faded out) - the middle of the box lay 11 mm off the axis on a cup with a handle.
 * Radius: area-weighted over the side faces that really get the pattern (outside or inside, not
 * bottom and top) - the mean over all points also counted inner walls, bottoms and densely
 * meshed roundings. `skipVertex`: points that stay smooth anyway and do not count.
 */
export function makeSurfaceTextureLayout(base: SurfaceBase, asked: SurfaceTextureSettings, skipVertex: Uint8Array | null = null, outline?: SurfaceOutline | null): SurfaceTextureLayout {
  // Round a body (automatic or asked for): round a circle, or along an angular body's outline (see layout.outline) -
  // found here unless it comes along.
  let s = asked;
  let shape = asked.projection === "cylinder" ? (outline ?? null) : null;
  if (outline === undefined && (asked.projection === "auto" || asked.projection === "cylinder")) {
    const round = isRoundBody(base, asked.axis);
    shape = round ? null : surfaceTextureOutline(base, asked);
    if (asked.projection === "auto") s = { ...asked, projection: round || (shape && wrapsOutline(asked, shape)) ? "cylinder" : "allRound" };
    if (s.projection !== "cylinder") shape = null;
  }
  const [i1, i2] = acrossAxes(s.axis);
  const v = base.vertices;
  const I = base.indices;
  const n = v.length / 3;
  const kept = new Uint8Array(n);
  let anyKept = false;
  for (let i = 0; i < n; i += 1) {
    if (skipVertex && skipVertex[i]) continue;
    kept[i] = 1;
    anyKept = true;
  }
  if (!anyKept) kept.fill(1);
  let lo1 = Infinity, hi1 = -Infinity, lo2 = Infinity, hi2 = -Infinity;
  for (let i = 0; i < n; i += 1) {
    if (!kept[i]) continue;
    lo1 = Math.min(lo1, v[i * 3 + i1]);
    hi1 = Math.max(hi1, v[i * 3 + i1]);
    lo2 = Math.min(lo2, v[i * 3 + i2]);
    hi2 = Math.max(hi2, v[i * 3 + i2]);
  }
  // The middle of the box when nothing better is found (a single flat plate makes no circle).
  let c1 = (lo1 + hi1) / 2;
  let c2 = (lo2 + hi2) / 2;
  // Side faces: normal mostly across the axis, not bottom or top, all points kept.
  const cosBottom = Math.cos((s.bottomFree * Math.PI) / 180), cosTop = Math.cos((s.topFree * Math.PI) / 180);
  const sx: number[] = [], sy: number[] = [], sw: number[] = [], snx: number[] = [], sny: number[] = [];
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t], b = I[t + 1], c = I[t + 2];
    if (!kept[a] || !kept[b] || !kept[c]) continue;
    const [x, y, z] = faceCross(v, a, b, c);
    const l = Math.hypot(x, y, z);
    if (l === 0) continue;
    const fn = [x / l, y / l, z / l];
    if ((s.bottomFree > 0 && -fn[2] >= cosBottom) || (s.topFree > 0 && fn[2] >= cosTop)) continue;
    const h = Math.hypot(fn[i1], fn[i2]);
    if (h < 0.5) continue;
    sx.push((v[a * 3 + i1] + v[b * 3 + i1] + v[c * 3 + i1]) / 3);
    sy.push((v[a * 3 + i2] + v[b * 3 + i2] + v[c * 3 + i2]) / 3);
    sw.push(l / 2);
    snx.push(fn[i1] / h);
    sny.push(fn[i2] / h);
  }
  const fit = sx.length >= 3 ? robustCircleCenter(sx, sy, sw) : null;
  if (fit) [c1, c2] = fit;
  let areaSum = 0, rSum = 0, rMin = Infinity, rMax = 0;
  for (let k = 0; k < sx.length; k += 1) {
    const dx = sx[k] - c1, dy = sy[k] - c2;
    const rl = Math.hypot(dx, dy);
    if (rl < 1e-6) continue;
    const isInside = (snx[k] * dx + sny[k] * dy) / rl < -0.3;
    if (isInside ? !s.inside : !s.outside) continue;
    areaSum += sw[k];
    rSum += sw[k] * rl;
    rMin = Math.min(rMin, rl);
    rMax = Math.max(rMax, rl);
  }
  let radius: number;
  if (areaSum > 0) radius = rSum / areaSum;
  else {
    // No side face gets the pattern: the mean over the points.
    let sum = 0, count = 0;
    for (let i = 0; i < n; i += 1) {
      if (!kept[i]) continue;
      const r = Math.hypot(v[i * 3 + i1] - c1, v[i * 3 + i2] - c2);
      if (r > 1e-6) {
        sum += r;
        count += 1;
      }
    }
    radius = count ? sum / count : 1;
    rMin = rMax = radius;
  }
  if (shape) {
    // Along the outline: its length is the circle's, the same spacing on every side.
    [c1, c2] = shape.center;
    radius = rMin = rMax = shape.loops[shape.main].length / (2 * Math.PI);
  }
  const layout: SurfaceTextureLayout = { projection: s.projection as SurfaceTextureLayout["projection"], period: s.spacing, cell: s.spacing, around: null, angle: s.angle, center: [c1, c2], radius, rMin, rMax, outline: shape };
  if (s.pattern === "image") layout.image = textureImage(s);
  if (s.pattern === "bricks") fitBrickCourses(base, s, kept, layout);
  if (s.pattern === "wood" || s.pattern === "bark") {
    const cut = s.pattern === "wood" ? s.woodCut : "log";
    layout.wood = woodFrame(cut, AXIS_INDEX[s.axis], [c1, c2], base.min, base.max, s.ringWidth, s.pattern === "wood" ? s.woodKnots : 0, s.seed);
  }
  const tileHeight = () => (s.tileHeight > 0 ? s.tileHeight : layout.image ? (layout.cell * layout.image.height) / layout.image.width : layout.cell);
  if (s.projection !== "cylinder") {
    layout.tileHeight = tileHeight();
    return layout;
  }
  const C = 2 * Math.PI * radius;
  if (s.pattern === "grooves" || s.pattern === "knurl") {
    const cos = Math.abs(Math.cos((s.angle * Math.PI) / 180));
    if (cos > 0.05) {
      const k = Math.max(1, Math.round((C * cos) / s.spacing));
      layout.period = (C * cos) / k;
      layout.around = k;
    } else {
      // Almost level: after one round the groove must meet a groove, or a seam stays. The spacing
      // stays and the slant is adjusted a little (k = 0: level rings).
      const k = Math.round((C * cos) / s.spacing);
      layout.angle = ((s.angle < 0 ? -1 : 1) * (Math.acos(Math.min(1, (k * s.spacing) / C)) * 180)) / Math.PI;
    }
  } else if (s.pattern === "bricks") {
    // A whole number of the bond's repeats goes round, so the courses close at the seam.
    const repeat = BRICK_PERIOD[s.brickBond];
    const k = Math.max(1, Math.round(C / (repeat * s.spacing)));
    layout.cell = C / (repeat * k);
    layout.around = k;
  } else if (ROUND_PATTERNS.includes(s.pattern)) {
    // Weave: an even number of stakes, or two weavers "over" would meet at the seam; carbon: a whole number of its
    // repeats, or the twill's diagonal would break there.
    const repeat = s.pattern === "weave" ? 2 : s.pattern === "carbon" ? CARBON_FLOATS[s.carbonWeave][0] + CARBON_FLOATS[s.carbonWeave][1] : 1;
    const k = Math.max(repeat, repeat * Math.round(C / (repeat * s.spacing)));
    layout.cell = C / k;
    layout.around = k;
  }
  layout.tileHeight = tileHeight();
  return layout;
}

/**
 * Bricks: the courses fitted to the height the texture covers along their axis (round a cylinder its axis, flat the
 * second axis across it, all round z), so whole courses go from its bottom to its top - the course height rounded as the
 * spacing is round a cylinder. The height band counts when the courses run up z. Flat and all round, the bricks' length
 * is fitted the same way along every axis (round a cylinder: see makeSurfaceTextureLayout), so a box's side holds whole
 * bricks, not a sliver of one. A top or bottom gets bricks of its own (see SurfaceTextureLayout.capBricks), fitted to its
 * size the same way: with the sides' length and courses, its joints ran along its edges.
 *
 * At every edge a brick ends, its joint just beyond the edge, as at a wall's corner. A joint along the edge was cut in
 * there: next to a smooth face it ran out in a slope along the whole edge, next to a face with bricks it was a notch the
 * other face slid into (see edgeRounding), in splinters over its coarse brick faces.
 */
function fitBrickCourses(base: SurfaceBase, s: SurfaceTextureSettings, kept: Uint8Array, layout: SurfaceTextureLayout) {
  const along = s.projection === "cylinder" ? AXIS_INDEX[s.axis] : s.projection === "flat" ? acrossAxes(s.axis)[1] : 2;
  const v = base.vertices;
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < kept.length; i += 1) {
    if (!kept[i]) continue;
    lo = Math.min(lo, v[i * 3 + along]);
    hi = Math.max(hi, v[i * 3 + along]);
  }
  if (along === 2 && Number.isFinite(lo)) {
    const zH = base.size[2] || 1;
    lo = Math.max(lo, base.min[2] + (s.zoneFrom / 100) * zH);
    hi = Math.min(hi, base.min[2] + (s.zoneTo / 100) * zH);
  }
  // Half a joint (see brickJointHalf), as the courses will come out about: how far beyond an edge a joint lies.
  const half = Math.min(s.brickJoint / 2, 0.45 * Math.min(s.brickHeight, BRICK_SHORTEST[s.brickBond] * s.spacing));
  const repeat = BRICK_PERIOD[s.brickBond] * s.spacing;
  /** Along axis k: where the kept points begin, widened by a joint's half at both ends; null without a width. */
  const range = (k: number) => {
    let from = Infinity, to = -Infinity;
    for (let i = 0; i < kept.length; i += 1) {
      if (!kept[i]) continue;
      from = Math.min(from, v[i * 3 + k]);
      to = Math.max(to, v[i * 3 + k]);
    }
    return to - from > 1e-6 ? { from: from - half, to: to + half } : null;
  };
  const bricksAlong = (r: { from: number; to: number }) => {
    const width = r.to - r.from;
    return { origin: r.from, cell: (width / Math.max(1, Math.round(width / repeat)) / repeat) * s.spacing };
  };
  if (s.projection !== "cylinder") {
    layout.brickAxes = [0, 1, 2].map((k) => {
      const r = range(k);
      return r ? bricksAlong(r) : { origin: 0, cell: s.spacing };
    });
  }
  if (!(hi - lo > 1e-6)) {
    layout.rowHeight = s.brickHeight;
    layout.rowOrigin = Number.isFinite(lo) ? lo : 0;
    layout.rows = 1;
    return;
  }
  lo -= half;
  hi += half;
  const rows = Math.max(1, Math.round((hi - lo) / s.brickHeight));
  layout.rows = rows;
  layout.rowHeight = (hi - lo) / rows;
  layout.rowOrigin = lo;
  if (s.projection !== "allRound" && s.projection !== "cylinder") return;
  // A top or bottom: seen along z all round, along the axis round a body.
  const [u, w] = acrossAxes(s.projection === "allRound" ? "z" : s.axis);
  const across = range(u), up = range(w);
  if (!across || !up) return;
  const courses = Math.max(1, Math.round((up.to - up.from) / s.brickHeight));
  layout.capBricks = { along: bricksAlong(across), rowHeight: (up.to - up.from) / courses, rowOrigin: up.from };
}

/**
 * Whether a body is round about `axis`: on its side faces the normal points away from the fitted axis at every corner of
 * the triangle (a cylinder of 16 segments: 11 degrees off; an octagon 22, a hexagon 30, a cube's face 45 at its corners).
 * Round when that holds within 25 degrees on three quarters of the side area. A body without side faces (a plate lying
 * flat) is not round.
 */
export function isRoundBody(base: SurfaceBase, axis: SurfaceTextureAxis) {
  const layout = makeSurfaceTextureLayout(base, { ...SURFACE_TEXTURE_DEFAULTS, projection: "cylinder", axis, outside: true, inside: true }, null, null);
  const [i1, i2] = acrossAxes(axis);
  const [c1, c2] = layout.center;
  const v = base.vertices, I = base.indices;
  const cosLimit = Math.cos((25 * Math.PI) / 180);
  let side = 0, round = 0;
  for (let t = 0; t < I.length; t += 3) {
    const [x, y, z] = faceCross(v, I[t], I[t + 1], I[t + 2]);
    const l = Math.hypot(x, y, z);
    if (l === 0) continue;
    const n = [x / l, y / l, z / l];
    const h = Math.hypot(n[i1], n[i2]);
    if (h < 0.5) continue;
    side += l;
    let ok = true;
    for (let k = 0; k < 3 && ok; k += 1) {
      const p = I[t + k];
      const dx = v[p * 3 + i1] - c1, dy = v[p * 3 + i2] - c2;
      const r = Math.hypot(dx, dy);
      // A corner on the axis (a cone's tip) says nothing.
      if (r < 1e-6) continue;
      if (Math.abs(n[i1] * dx + n[i2] * dy) / (h * r) < cosLimit) ok = false;
    }
    if (ok) round += l;
  }
  return side > 0 && round >= 0.75 * side;
}

/** An angular body standing along the settings' axis (a box, a prism): its outline (see surfaceTextureOutline.ts), or null. */
export function surfaceTextureOutline(base: SurfaceBase, s: SurfaceTextureSettings) {
  const [i1, i2] = acrossAxes(s.axis);
  return prismOutline(base, AXIS_INDEX[s.axis], i1, i2, s.edgeAngle);
}

/** Patterns laid round an angular body along its outline when the projection is automatic; the others go all round there. */
function wrapsOutline(s: SurfaceTextureSettings, outline: SurfaceOutline) {
  // Bricks are fitted to each face's edges (see fitBrickCourses) - where the sides face along x and y, as a box's do.
  // Any other side (a hexagon's slanted ones) saw them projected from aside, stretched, and their joints cut in teeth:
  // there they go round the outline. Bark and wood belong to a log or a board.
  if (s.pattern === "bricks") return !sidesAlongAxes(outline);
  return !["text", "cracks", "grain", "bark", "wood"].includes(s.pattern);
}

/** Whether every side of an outline runs along one of the two axes across (within about 2 degrees). */
function sidesAlongAxes(outline: SurfaceOutline) {
  return outline.loops.every(({ points }) => {
    const m = points.length / 2;
    for (let k = 0; k < m; k += 1) {
      const dx = points[((k + 1) % m) * 2] - points[k * 2], dy = points[((k + 1) % m) * 2 + 1] - points[k * 2 + 1];
      const l = Math.hypot(dx, dy);
      if (l > 1e-9 && Math.min(Math.abs(dx), Math.abs(dy)) > 0.035 * l) return false;
    }
    return true;
  });
}

/* ------------------------------------------------------------------ */
/* Refining for the pattern                                            */
/* ------------------------------------------------------------------ */

/**
 * All round: the input faces that look straight along an axis (|normal| within 2 degrees of it, like a box's sides),
 * by axis (0, 1, 2) - there the pattern is that axis' flat projection alone and can be cut like a flat one. 255 for the
 * rest and for faces that stay smooth; null when no face is straight.
 */
function straightFaces(base: SurfaceBase, smoothFace: Uint8Array) {
  const v = base.vertices, I = base.indices;
  const axisOf = new Uint8Array(I.length / 3).fill(255);
  let any = false;
  for (let t = 0; t < I.length; t += 3) {
    if (smoothFace[t / 3]) continue;
    const n = faceCross(v, I[t], I[t + 1], I[t + 2]);
    const l = Math.hypot(n[0], n[1], n[2]);
    if (l === 0) continue;
    for (let k = 0; k < 3; k += 1) {
      if (Math.abs(n[k]) / l >= 0.9994) {
        axisOf[t / 3] = k;
        any = true;
      }
    }
  }
  return any ? axisOf : null;
}

/** The straight faces along axis `ax` (a cylinder's top and bottom), as straightFaces gives them; null when there is none. */
function capFaces(base: SurfaceBase, smoothFace: Uint8Array, ax: number) {
  const all = straightFaces(base, smoothFace);
  if (!all) return null;
  const caps = all.map((k) => (k === ax ? k : 255));
  return caps.includes(ax) ? caps : null;
}

/** Whether the pattern stands out of the body and so runs out right up to the edge (see RUN_OUT_STEPS); bumps are left off whole at a border instead. */
function standsOut(s: SurfaceTextureSettings) {
  return s.direction !== "inward" && s.pattern !== "bumps" && s.pattern !== "text" && s.pattern !== "cracks";
}

/**
 * Grooves and knurling cut in round a body (a cylinder, along an angular body's outline) end at a border with a short
 * wall too (see BORDER_WALL), as on the straight faces of a body all round: faded out over the fade, a V groove's end
 * was a ramp of two twisted halves, and came out as a crooked arrow. So does an image cut in: its dark places ran out
 * at the rim over the grid's triangles, in notches with teeth along their top.
 */
function endsInWall(s: SurfaceTextureSettings) {
  return !standsOut(s) && s.projection === "cylinder" && (s.pattern === "grooves" || s.pattern === "knurl" || s.pattern === "image");
}

/** Grooves and knurling around a cylinder or flat are cut into strips along the grooves (see sliceStripes). */
function stripesAreCut(s: SurfaceTextureSettings) {
  return (s.pattern === "grooves" || s.pattern === "knurl") && s.projection !== "allRound";
}

/**
 * What else shapes the pattern and so its refining: the cells' and the grain's seed, the image and its tiles, the carbon's
 * weave and crossing bands, the bricks' bond, joint and courses (not how unevenly they lie: that only moves their faces).
 */
function patternExtras(s: SurfaceTextureSettings, layout: SurfaceTextureLayout) {
  if (s.pattern === "cells" || s.pattern === "grain") return [s.seed];
  if (s.pattern === "bumps") return [s.bumpGrid];
  if (s.pattern === "carbon") return [s.carbonWeave, s.carbonCross];
  if (s.pattern === "bricks") return [s.brickBond, s.brickJoint, layout.rowHeight ?? s.brickHeight, layout.rowOrigin ?? 0, layout.brickAxes ?? null, layout.capBricks ?? null];
  if (s.pattern === "bark") return [s.barkType, s.seed, s.ringWidth];
  if (s.pattern === "wood") return [s.woodType, s.woodCut, s.ringWidth, s.woodKnots, s.woodWobble, s.seed];
  if (s.pattern === "image") return [s.image === "own" && s.imageOwn ? ownImageKey(s.imageOwn) : s.image, s.tileHeight, s.imageTurn, s.imageInvert, s.imageBlur, s.imageTiling];
  return null;
}

/** Edge length at which the pattern is cleanly resolved. */
function targetEdge(s: SurfaceTextureSettings) {
  // Honeycomb, cells and bumps that are cut (see sliceCells) get their detail from the cuts: the grid only has to follow
  // the body's roundness (a 1.2 mm chord on 30 mm radius: 0.006 mm). Bricks' faces are flat: their cuts are all they need.
  if (cellsAreCut(s)) return s.pattern === "bricks" ? 10 : s.spacing / 2.5;
  const steps = DETAIL_STEPS[s.detail];
  // An image: about 14 points per tile and step of detail (its tile has 256 image points and more).
  if (s.pattern === "image") return Math.min(s.spacing, s.tileHeight > 0 ? s.tileHeight : s.spacing) / (steps * 14);
  const narrow = s.width < 0.35 && s.pattern !== "grain" && s.pattern !== "bricks" && s.pattern !== "bark" && s.pattern !== "wood" ? 0.65 : 1;
  // Knitting: a stitch has two loops of about a quarter of its width each; a rope's strands, the weave's rows and a carbon
  // band's edges are narrower than the spacing too (round the axis those are cut along, see carbonCuts).
  // Bark: its marks are a share of its size (a birch's lenticels are thin); wood: a ring (flanks refined after).
  const size = s.pattern === "bricks" ? Math.min(s.spacing, s.brickHeight) : s.pattern === "bark" ? s.spacing / BARK_STARTS[s.barkType].detail : s.pattern === "wood" ? s.ringWidth : s.pattern === "grain" ? s.spacing / 2 : s.pattern === "knit" ? s.spacing / 2.2 : s.pattern === "rope" ? s.spacing / 1.5 : s.pattern === "weave" ? s.spacing / 2 : s.pattern === "carbon" ? Math.min(s.spacing, s.carbonCross || s.spacing) * (s.projection === "cylinder" ? 2 : 0.5) : s.spacing;
  return (size / steps) * narrow;
}

function cellsAreCut(s: SurfaceTextureSettings) {
  return CELL_PATTERNS.includes(s.pattern) && s.projection !== "allRound";
}

/**
 * The groove measure per point: across (as stripe() measures it) and along (turned by 90
 * degrees), with functions for the difference between two points that bring the angle round
 * back within half a turn first - so the difference holds across the seam too.
 */
function stripeFields(mesh: { vertices: Float64Array }, s: SurfaceTextureSettings, layout: SurfaceTextureLayout) {
  const ax = AXIS_INDEX[s.axis];
  const [i1, i2] = acrossAxes(s.axis);
  const cyl = s.projection === "cylinder";
  const iv = cyl ? ax : i2;
  const a = (layout.angle * Math.PI) / 180;
  const ca = Math.cos(a), sa = Math.sin(a);
  const R = layout.radius;
  const [c1, c2] = layout.center;
  const v = mesh.vertices;
  const n0 = v.length / 3;
  const U = new Float64Array(n0), V = new Float64Array(n0), cross = new Float64Array(n0), along = new Float64Array(n0);
  // Points on the axis have no angle: triangles at them are not cut.
  const pole = new Uint8Array(n0);
  for (let i = 0; i < n0; i += 1) {
    if (cyl && !layout.outline && Math.hypot(v[i * 3 + i2] - c2, v[i * 3 + i1] - c1) < 1e-6) pole[i] = 1;
    if (cyl) {
      U[i] = aroundAngle(layout, v[i * 3 + i1], v[i * 3 + i2]);
      V[i] = v[i * 3 + iv];
    } else [U[i], V[i]] = turnOnFace(v[i * 3 + i1], v[i * 3 + i2], s, layout);
    const u = cyl ? U[i] * R : U[i];
    cross[i] = u * ca - V[i] * sa;
    along[i] = u * sa + V[i] * ca;
  }
  const du = (i: number, j: number) => {
    if (!cyl) return U[j] - U[i];
    let d = U[j] - U[i];
    if (d > Math.PI) d -= 2 * Math.PI;
    else if (d < -Math.PI) d += 2 * Math.PI;
    return d * R;
  };
  return {
    cross,
    along,
    pole,
    crossDiff: (i: number, j: number) => du(i, j) * ca - (V[j] - V[i]) * sa,
    alongDiff: (i: number, j: number) => du(i, j) * sa + (V[j] - V[i]) * ca,
  };
}

/**
 * Places on the profile, as t (0 in the middle of a groove or joint, 1 at its edge), where the
 * mesh needs a line of points for the profile to come out exactly: the V of "pointed" is straight
 * from its middle to its edge and "flat" only bends where its floor ends, so one or two lines
 * are exact; "round" gets `steps` lines per flank.
 */
function profileLevels(profile: SurfaceTextureProfile, steps: number) {
  if (profile === "pointed") return [1];
  if (profile === "flat") return [0.75, 1];
  const count = Math.max(1, Math.round(steps));
  // A half circle is steep at its edge: the levels lie closer there (equal steps of the angle).
  if (profile === "dome") return Array.from({ length: count }, (_, j) => Math.sin(((j + 1) / count) * (Math.PI / 2)));
  return Array.from({ length: count }, (_, j) => (j + 1) / count);
}

/**
 * Grooves: every triangle cut along the groove into thin strips whose borders lie on fixed places
 * of the groove profile (its middle, its edges and the places between, see profileLevels) - fine
 * across, along as coarse as the mesh. Triangles of faces that surely stay smooth (`smoothFace`)
 * stay whole.
 */
function sliceStripes(mesh: SurfaceMesh, s: SurfaceTextureSettings, layout: SurfaceTextureLayout, steps: number, smoothFace: Uint8Array, first: SurfaceTextureLayout | null = null) {
  const P = layout.period;
  const F = stripeFields(mesh, s, layout);
  const offsets = stripeOffsets(P, s, steps);
  const I = mesh.indices;
  const sliced = new Uint8Array(I.length / 3);
  for (let f = 0; f < sliced.length; f += 1) sliced[f] = smoothFace[mesh.parents[f]] || F.pole[I[f * 3]] || F.pole[I[f * 3 + 1]] || F.pole[I[f * 3 + 2]] ? 0 : 1;
  // Knurling's second family: two triangles over an edge along the first one's lines stay apart, or the quad's new
  // triangles reached across a line of the first family (its profile bent inside them: lumps in the diamonds).
  const A = first ? stripeFields(mesh, s, first) : null;
  const keep = A ? (p: number, q: number) => Math.abs(A.crossDiff(p, q)) < 1e-6 : null;
  return sliceByField(mesh, F.cross, F.crossDiff, P, offsets, sliced, F.alongDiff, false, keep);
}

/** A groove's places of the profile within a period P: its middle at P/2 (stripe: |x - floor(x) - 0.5|), edges at P/2 ± w P/2. */
function stripeOffsets(P: number, s: SurfaceTextureSettings, steps: number) {
  const w = clamp(s.width, 0.05, 1);
  const offsets: number[] = [];
  [0, ...profileLevels(s.profile, steps)].forEach((t) => {
    [P * (0.5 - (t * w) / 2), P * (0.5 + (t * w) / 2)].forEach((o) => {
      if (o >= 0 && o < P - 1e-9 * P && !offsets.some((known) => Math.abs(known - o) < 1e-9 * P)) offsets.push(o);
    });
  });
  return offsets.sort((a, b) => a - b);
}

/** Along an edge on a round top, the distance to the middle may stray from a straight line by this share of the spacing. */
const RING_STRAY = 0.01;
/** Within a triangle of a top following an outline, the distance to it may stray from a plane by this share of the spacing. */
const OUTLINE_STRAY = 0.05;

/**
 * Halve the triangles not in `skip` until the distance to the outline is about linear in each: it bends where the nearest
 * side changes (along the corners' bisectors), also inside a triangle whose corners all lie on the outline - a box's top of
 * two triangles has distance 0 at every corner. A triangle whose distance strays from a plane by more than `tolerance` at
 * its middle or the middles of its edges gets its longest edge halved, round by round.
 */
function refineOutlineDistance(mesh: SurfaceMesh, outline: SurfaceOutline, i1: number, i2: number, skip: Uint8Array, tolerance: number, maxTriangles: number): SurfaceMesh {
  let cur = mesh;
  const near = (x: number, y: number) => nearestOnOutline(outline, x, y).distance;
  for (let round = 0; round < 40 && !cur.limited; round += 1) {
    const v = cur.vertices, I = cur.indices;
    const known = new Float64Array(v.length / 3).fill(NaN);
    const at = (i: number) => (Number.isNaN(known[i]) ? (known[i] = near(v[i * 3 + i1], v[i * 3 + i2])) : known[i]);
    const marks = new EdgeTable(1024);
    for (let f = 0; f < I.length / 3; f += 1) {
      if (skip[cur.parents[f]]) continue;
      const c = [I[f * 3], I[f * 3 + 1], I[f * 3 + 2]];
      const x = c.map((i) => v[i * 3 + i1]), y = c.map((i) => v[i * 3 + i2]), d = c.map(at);
      let worst = Math.abs(near((x[0] + x[1] + x[2]) / 3, (y[0] + y[1] + y[2]) / 3) - (d[0] + d[1] + d[2]) / 3);
      let longest = -1, length = 0;
      for (let k = 0; k < 3; k += 1) {
        const j = (k + 1) % 3;
        worst = Math.max(worst, Math.abs(near((x[k] + x[j]) / 2, (y[k] + y[j]) / 2) - (d[k] + d[j]) / 2));
        const l = Math.hypot(x[j] - x[k], y[j] - y[k]);
        if (l > length) [length, longest] = [l, k];
      }
      if (worst > tolerance && length > tolerance) marks.set(c[longest], c[(longest + 1) % 3], 1);
    }
    if (!marks.size) break;
    const split = subdivide(cur, 0, maxTriangles, null, null, (_, a, b) => marks.has(a, b));
    if (split.indices.length === I.length) break;
    const before = cur;
    cur = { vertices: split.vertices, indices: split.indices, parents: Uint32Array.from(split.parents, (f) => before.parents[f]), limited: Boolean(before.limited || split.limited) };
  }
  return cur;
}

/**
 * Halve the triangles `inside` says until `field` (of the place across the axis) is about linear in each: a triangle whose
 * field strays from a plane by more than `tolerance` at its middle or the middles of its edges gets its longest edge
 * halved, round by round. A field that jumps by `wrap` (round the axis) is compared across the jump.
 */
function refineLinear(mesh: SurfaceMesh, field: (a: number, b: number) => number, wrap: number, i1: number, i2: number, inside: (f: number, corners: number[], m: SurfaceMesh) => boolean, tolerance: number, maxTriangles: number): SurfaceMesh {
  let cur = mesh;
  const diff = (from: number, to: number) => (wrap ? to - from - wrap * Math.round((to - from) / wrap) : to - from);
  for (let round = 0; round < 40 && !cur.limited; round += 1) {
    const v = cur.vertices, I = cur.indices;
    const known = new Float64Array(v.length / 3).fill(NaN);
    const at = (i: number) => (Number.isNaN(known[i]) ? (known[i] = field(v[i * 3 + i1], v[i * 3 + i2])) : known[i]);
    const marks = new EdgeTable(1024);
    for (let f = 0; f < I.length / 3; f += 1) {
      const c = [I[f * 3], I[f * 3 + 1], I[f * 3 + 2]];
      if (!inside(f, c, cur)) continue;
      const x = c.map((i) => v[i * 3 + i1]), y = c.map((i) => v[i * 3 + i2]), d = c.map(at);
      const d1 = diff(d[0], d[1]), d2 = diff(d[0], d[2]);
      let worst = Math.abs(diff(d[0], field((x[0] + x[1] + x[2]) / 3, (y[0] + y[1] + y[2]) / 3)) - (d1 + d2) / 3);
      let longest = -1, length = 0;
      for (let k = 0; k < 3; k += 1) {
        const j = (k + 1) % 3;
        worst = Math.max(worst, Math.abs(diff(d[k], field((x[k] + x[j]) / 2, (y[k] + y[j]) / 2)) - diff(d[k], d[j]) / 2));
        const l = Math.hypot(x[j] - x[k], y[j] - y[k]);
        if (l > length) [length, longest] = [l, k];
      }
      if (worst > tolerance && length > SURFACE_MIN_EDGE * 4) marks.set(c[longest], c[(longest + 1) % 3], 1);
    }
    if (!marks.size) break;
    const split = subdivide(cur, 0, maxTriangles, null, null, (_, a, b) => marks.has(a, b));
    if (split.indices.length === I.length) break;
    const before = cur;
    cur = { vertices: split.vertices, indices: split.indices, parents: Uint32Array.from(split.parents, (f) => before.parents[f]), limited: Boolean(before.limited || split.limited) };
  }
  return cur;
}

/**
 * Rings on a top or bottom (see ringValue) cut along their lines, at `m P + offset`: the grooves' places of the profile
 * (as sliceStripes), the joints between rings of rope. Round a circle the field is the distance to the middle, which is
 * not linear along an edge - a chord across the middle has the same distance at both ends - so edges where it strays from
 * a straight line by more than RING_STRAY of P are halved first (only on the faces cut: not `skip`). Following an outline
 * it is the distance to the outline, linear but for edges reaching from one side's nearest to another's: those are halved.
 * The cuts are straight chords between the edges. With `band` (from - to of the field) only triangles reaching into it
 * are cut; `scale` (the spacing's stead for the tolerance and the shaping, when P is no spacing) - see beadCuts.
 */
function sliceRings(mesh: SurfaceMesh, s: SurfaceTextureSettings, layout: SurfaceTextureLayout, P: number, offsets: number[], skip: Uint8Array, maxTriangles: number, band: [number, number] | null = null, scale = P): SurfaceMesh {
  const ax = AXIS_INDEX[s.axis];
  const [i1, i2] = acrossAxes(s.axis);
  const [c1, c2] = layout.center;
  const outline = layout.outline ?? null;
  const tolerance = RING_STRAY * scale;
  // Long strips across the top (as CAD gives it) made into well-shaped triangles about a spacing long first.
  const free = Uint8Array.from(skip, (k) => (k ? 0 : 1));
  const shaped = !band && hasNeedles(mesh, free) ? refinePlanar(mesh, free, scale, maxTriangles) : mesh;
  const n0 = shaped.vertices.length / 3;
  const onFace = new Uint8Array(n0);
  for (let f = 0; f < shaped.indices.length / 3; f += 1) {
    if (skip[shaped.parents[f]]) continue;
    for (let k = 0; k < 3; k += 1) onFace[shaped.indices[f * 3 + k]] = 1;
  }
  // New points come from edges halved here, so they lie on such faces too.
  const strays = (verts: ArrayLike<number>, a: number, b: number) => {
    if ((a < n0 && !onFace[a]) || (b < n0 && !onFace[b]) || Math.abs(verts[a * 3 + ax] - verts[b * 3 + ax]) > 1e-6) return false;
    const pu = verts[a * 3 + i1] - c1, pv = verts[a * 3 + i2] - c2;
    const du = verts[b * 3 + i1] - verts[a * 3 + i1], dv = verts[b * 3 + i2] - verts[a * 3 + i2];
    const l2 = du * du + dv * dv;
    if (l2 === 0) return false;
    // The place nearest the middle is where the distance strays most.
    const t = clamp(-(pu * du + pv * dv) / l2, 0, 1);
    const ra = Math.hypot(pu, pv), rb = Math.hypot(pu + du, pv + dv);
    return ra + t * (rb - ra) - Math.hypot(pu + t * du, pv + t * dv) > tolerance;
  };
  let fine: SurfaceMesh;
  if (outline) fine = refineOutlineDistance(shaped, outline, i1, i2, skip, OUTLINE_STRAY * scale, maxTriangles);
  else {
    const split = subdivide(shaped, tolerance, maxTriangles, null, null, strays);
    fine = { vertices: split.vertices, indices: split.indices, parents: Uint32Array.from(split.parents, (f) => shaped.parents[f]), limited: Boolean(shaped.limited || split.limited) };
  }
  const v = fine.vertices;
  const r = new Float64Array(v.length / 3);
  for (let i = 0; i < r.length; i += 1) r[i] = outline ? nearestOnOutline(outline, v[i * 3 + i1], v[i * 3 + i2]).distance : Math.hypot(v[i * 3 + i1] - c1, v[i * 3 + i2] - c2);
  const I = fine.indices;
  const sliced = Uint8Array.from({ length: I.length / 3 }, (_, f) => {
    if (skip[fine.parents[f]]) return 0;
    if (!band) return 1;
    const a = r[I[f * 3]], b = r[I[f * 3 + 1]], c = r[I[f * 3 + 2]];
    return Math.max(a, b, c) >= band[0] && Math.min(a, b, c) <= band[1] ? 1 : 0;
  });
  const cut = sliceByField(fine, r, (i, j) => r[j] - r[i], P, offsets, sliced);
  return { ...cut, limited: Boolean(fine.limited || cut.indices.length / 3 > maxTriangles) };
}

/**
 * Knurling is the higher of two groove families, so after both are cut into strips the surface
 * still folds where the two are equally deep - along lines through every diamond. Cut there too:
 * then the pattern is linear in every triangle and a pointed profile comes out exact. The field
 * is the difference of the two values in mm across (value × half the groove width).
 */
function sliceKnurlCrease(mesh: SurfaceMesh, s: SurfaceTextureSettings, layout: SurfaceTextureLayout, smoothFace: Uint8Array) {
  const A = stripeFields(mesh, s, layout);
  const B = stripeFields(mesh, s, { ...layout, angle: -layout.angle });
  const n = mesh.vertices.length / 3;
  const halfWidth = (layout.period * s.width) / 2;
  const value = (cross: number) => {
    const x = cross / layout.period;
    return surfaceFalloff(Math.abs(x - Math.floor(x) - 0.5) / (s.width / 2), s.profile);
  };
  const h = new Float64Array(n);
  for (let i = 0; i < n; i += 1) h[i] = (value(A.cross[i]) - value(B.cross[i])) * halfWidth;
  const I = mesh.indices;
  const sliced = new Uint8Array(I.length / 3);
  for (let f = 0; f < sliced.length; f += 1) sliced[f] = smoothFace[mesh.parents[f]] || A.pole[I[f * 3]] || A.pole[I[f * 3 + 1]] || A.pole[I[f * 3 + 2]] ? 0 : 1;
  return sliceByField(mesh, h, (i, j) => h[j] - h[i], 1e6, [0], sliced);
}

/** Cuts closer than this (mm) to a point fall onto it. */
const SNAP = 0.05;
/** The same for a bump's rim, which has to stay round (short edges there are pulled together afterwards). */
const RIM_SNAP = 0.004;
/**
 * A point this close to its bump's circle (mm, either side) is a rim point itself: the edges at it are not cut again.
 * Cut 0.02 mm beside a grid point 0.005 mm outside, the sliver between them counted as inside on both sides of the
 * point - the rim touched itself there, and the bump kept its cut grid.
 */
const RIM_NEAR = 1.5 * RIM_SNAP;

/** Bumps: points on a rim per radius, and rings inwards (fewer for a cone and a flat top, see sliceBumps). */
const BUMP_RIM_STEPS: Record<SurfaceTextureDetail, number> = { coarse: 1.6, medium: 2, fine: 3 };
/** Points on a bump's outer ring at most (the rim keeps all of its own). */
const BUMP_RING_POINTS: Record<SurfaceTextureDetail, number> = { coarse: 20, medium: 32, fine: 48 };
const BUMP_RINGS: Record<SurfaceTextureDetail, number> = { coarse: 3, medium: 5, fine: 8 };

/**
 * Honeycomb, cells and bumps: cut instead of refining evenly - otherwise the triangles lie at any slant to
 * the joint and their edges look jagged (flat shaded in a slicer even more). Bumps: after the cell
 * borders (step 1 below), straight spokes through every bump's middle - there they meet, so the tip
 * of a cone or a ball is a point of the mesh - and rings at the profile levels, each point exactly on
 * its circle. Then every bump is a fan of facets round its middle, as round as its spokes. In a cell the distance
 * to the joint is the smallest of a few distances that are linear in the unrolled surface (one per
 * side of a hexagon; for cells, one per neighbour cell: the border halfway to its point). So, in three steps:
 * 1. Cut at the cell borders (between two cell middles, the middle of the joint). Then every
 *    triangle lies in one cell.
 * 2. Cut at the corner lines, where next to the joint the nearest side changes. Then the
 *    distance is linear in every triangle.
 * 3. Cut at the profile levels (see profileLevels; a round profile gets `steps` of them, fewer
 *    down to 2 when the triangles would not fit `maxTriangles` - counted before cutting, since
 *    the cut is the dear part). Every flank gets rows of points exactly on its contour lines.
 * `skipBase`: input triangles that surely stay smooth. Parents point at the input mesh.
 */
function sliceCells(mesh: SurfaceMesh, s: SurfaceTextureSettings, layout: SurfaceTextureLayout, steps: number, maxTriangles: number, skipBase: Uint8Array): { mesh: SurfaceMesh; reduced: boolean; fixed?: Float32Array | null } {
  const ax = AXIS_INDEX[s.axis];
  const [i1, i2] = acrossAxes(s.axis);
  const cyl = s.projection === "cylinder";
  const R = layout.radius, [c1, c2] = layout.center;
  const period = cyl ? 2 * Math.PI * R : 0;
  const cell = layout.cell;
  const hw = (cell / 2) * clamp(s.width, 0.02, 1);
  // Cells (Voronoi): the joint lies on the borders between irregular cell points instead of a hexagon's sides.
  const voronoi = s.pattern === "cells";
  // The same grid as the values (see cellEdge): a top of a body the cells run round takes them from there too, and the
  // half of it left of the middle (u below 0) lay in other cells than its cuts.
  const around = layout.around;
  // Per point ten numbers: distance to the joint, cell key, nearest side (honeycomb: 0 to 5; cells: the key of the cell
  // behind it), cell middle u and v, the point's own u, v and whether it lies on the axis (1), and - cells - the point of
  // the cell behind the nearest border, u and v.
  const REC = 10;
  const describe = (u: number, v: number, rec: Float64Array, o: number) => {
    if (voronoi) {
      const { n, k1 } = cellSites(u, v, cell, around, s.seed);
      const sx = CELL_PTS[k1 * 2], sy = CELL_PTS[k1 * 2 + 1];
      let best = Infinity, kb = 0;
      for (let k = 0; k < n; k += 1) {
        if (k === k1) continue;
        const d = (CELL_D[k] - CELL_D[k1]) / (2 * (Math.hypot(CELL_PTS[k * 2] - sx, CELL_PTS[k * 2 + 1] - sy) || 1));
        if (d < best) {
          best = d;
          kb = k;
        }
      }
      rec[o] = best;
      rec[o + 1] = CELL_KEY[k1];
      rec[o + 2] = CELL_KEY[kb];
      rec[o + 3] = sx;
      rec[o + 4] = sy;
      rec[o + 8] = CELL_PTS[kb * 2];
      rec[o + 9] = CELL_PTS[kb * 2 + 1];
      return;
    }
    if (s.pattern === "bumps" && s.bumpGrid === "straight") {
      // Straight rows: square cells, the border the nearer of their sides (bumps need no more of a cell than that).
      const c = bumpSite(u, v, cell, "straight");
      rec[o] = cell / 2 - Math.max(Math.abs(u - c.x), Math.abs(v - c.y));
      rec[o + 1] = c.key;
      rec[o + 2] = 0;
      rec[o + 3] = c.x;
      rec[o + 4] = c.y;
      return;
    }
    const c = hexSite(u, v, cell);
    let lo = Infinity, kb = 0;
    for (let k = 0; k < 6; k += 1) {
      const d = cell / 2 - HEX_NORMALS[k * 2] * (u - c.x) - HEX_NORMALS[k * 2 + 1] * (v - c.y);
      if (d < lo) {
        lo = d;
        kb = k;
      }
    }
    rec[o] = lo;
    rec[o + 1] = c.key;
    rec[o + 2] = kb;
    rec[o + 3] = c.x;
    rec[o + 4] = c.y;
  };
  // Distance to the joint at (x, y) over a border of the cell with middle (sx, sy): its side k (honeycomb), or the border
  // towards the cell point (bx, by) (cells).
  const g = (sx: number, sy: number, k: number, bx: number, by: number, x: number, y: number) =>
    voronoi ? bisectorDistance(sx, sy, bx, by, x, y) : cell / 2 - HEX_NORMALS[k * 2] * (x - sx) - HEX_NORMALS[k * 2 + 1] * (y - sy);
  const uvOf = (verts: ArrayLike<number>, i: number): [number, number, boolean] => {
    const pos = [verts[i * 3], verts[i * 3 + 1], verts[i * 3 + 2]];
    if (!cyl) return [...turnOnFace(pos[i1], pos[i2], s, layout), false];
    const r = Math.hypot(pos[i1] - c1, pos[i2] - c2);
    return [aroundAngle(layout, pos[i1], pos[i2]) * R, pos[ax], !layout.outline && r < 1e-6];
  };
  const unwrap = (u: number, ref: number) => (period ? u + Math.round((ref - u) / period) * period : u);
  // Not cut: faces that surely stay smooth, triangles at the axis and - around a cylinder - top and bottom.
  const skipOf = (verts: Float64Array, rec: Float64Array, I: Uint32Array, parents: Uint32Array) => {
    const T = I.length / 3;
    const skip = new Uint8Array(T);
    for (let f = 0; f < T; f += 1) {
      const a = I[f * 3], b = I[f * 3 + 1], c = I[f * 3 + 2];
      if (skipBase[parents[f]]) {
        skip[f] = 1;
        continue;
      }
      if (cyl && (rec[a * REC + 7] || rec[b * REC + 7] || rec[c * REC + 7])) {
        skip[f] = 1;
        continue;
      }
      const fn = faceCross(verts, a, b, c);
      const l = Math.hypot(fn[0], fn[1], fn[2]);
      if (l === 0 || (cyl && Math.abs(fn[ax]) / l > 0.8)) skip[f] = 1;
    }
    return skip;
  };
  const recordsOf = (v: Float64Array) => {
    const n = v.length / 3;
    const rec = new Float64Array(n * REC);
    for (let i = 0; i < n; i += 1) {
      const [u, w, pole] = uvOf(v, i);
      describe(u, w, rec, i * REC);
      rec[i * REC + 5] = u;
      rec[i * REC + 6] = w;
      rec[i * REC + 7] = pole ? 1 : 0;
    }
    return rec;
  };
  type CutAt = (rec: Float64Array, a: number, b: number, ua: number, va: number, ub: number, vb: number, shift: number) => number;
  type Meet = (rec: Float64Array, A: number, B: number, C: number) => [number, number, number] | null;
  // Cut edges where `cutT` gives a share t (0 to 1, else -1) - once per edge, the same for both triangles - then lay every
  // triangle anew (one, two or three cuts). `shift`: how far b lies off its own record in the unrolled surface (across the
  // seam). With three cuts the middle point goes where `meet` puts it (shares of the corners), else into the middle of the cuts.
  const split = (cur: SurfaceMesh, cutT: CutAt, meet: Meet | null = null, snap = SNAP): SurfaceMesh => {
    const v = cur.vertices, I = cur.indices, T = I.length / 3;
    const rec = recordsOf(v);
    const skip = skipOf(v, rec, I, cur.parents);
    const verts = Array.from(v);
    const cuts = new EdgeTable(T * 2);
    const cutOn = (p: number, q: number) => {
      const a = Math.min(p, q), b = Math.max(p, q);
      if (cuts.has(a, b)) return;
      const ua = rec[a * REC + 5], va = rec[a * REC + 6];
      const ub0 = rec[b * REC + 5], vb = rec[b * REC + 6];
      const ub = unwrap(ub0, ua);
      const t = cutT(rec, a, b, ua, va, ub, vb, ub - ub0);
      let id = -1;
      // Closer than `snap` (mm) to an end: the end counts as on the line - no slivers, no short edges.
      const len = Math.hypot(v[a * 3] - v[b * 3], v[a * 3 + 1] - v[b * 3 + 1], v[a * 3 + 2] - v[b * 3 + 2]);
      if (t >= 0 && t * len > snap && (1 - t) * len > snap) {
        id = verts.length / 3;
        verts.push(v[a * 3] + t * (v[b * 3] - v[a * 3]), v[a * 3 + 1] + t * (v[b * 3 + 1] - v[a * 3 + 1]), v[a * 3 + 2] + t * (v[b * 3 + 2] - v[a * 3 + 2]));
      }
      cuts.set(a, b, id);
    };
    for (let f = 0; f < T; f += 1) {
      if (skip[f]) continue;
      for (let k = 0; k < 3; k += 1) cutOn(I[f * 3 + k], I[f * 3 + ((k + 1) % 3)]);
    }
    const known = (p: number, q: number) => cuts.get(p, q);
    const out: number[] = [], outParents: number[] = [];
    const put = (a: number, b: number, c: number, parent: number) => {
      out.push(a, b, c);
      outParents.push(parent);
    };
    const d2 = (a: number, b: number) => (verts[a * 3] - verts[b * 3]) ** 2 + (verts[a * 3 + 1] - verts[b * 3 + 1]) ** 2 + (verts[a * 3 + 2] - verts[b * 3 + 2]) ** 2;
    for (let f = 0; f < T; f += 1) {
      const A = I[f * 3], B = I[f * 3 + 1], C = I[f * 3 + 2], parent = cur.parents[f];
      const X = known(A, B), Y = known(B, C), Z = known(C, A);
      const n = (X >= 0 ? 1 : 0) + (Y >= 0 ? 1 : 0) + (Z >= 0 ? 1 : 0);
      if (n === 0) put(A, B, C, parent);
      else if (n === 1) {
        // A fan from the corner opposite the cut edge.
        if (X >= 0) {
          put(C, A, X, parent);
          put(C, X, B, parent);
        } else if (Y >= 0) {
          put(A, B, Y, parent);
          put(A, Y, C, parent);
        } else {
          put(B, C, Z, parent);
          put(B, Z, A, parent);
        }
      } else if (n === 2) {
        // The corner between the two cuts lies alone on its side; the quad opposite over its shorter diagonal.
        const [r0, r1, r2, r3, r4] = Y < 0 ? [A, X, B, C, Z] : Z < 0 ? [B, Y, C, A, X] : [C, Z, A, B, Y];
        put(r0, r1, r4, parent);
        if (d2(r1, r3) <= d2(r2, r4)) {
          put(r1, r2, r3, parent);
          put(r1, r3, r4, parent);
        } else {
          put(r1, r2, r4, parent);
          put(r2, r3, r4, parent);
        }
      } else {
        // Three sides cut in one triangle: a point in the middle of the three cuts, fanned all round.
        const G = verts.length / 3;
        const w = meet ? meet(rec, A, B, C) : null;
        if (w) for (let k = 0; k < 3; k += 1) verts.push(w[0] * v[A * 3 + k] + w[1] * v[B * 3 + k] + w[2] * v[C * 3 + k]);
        else verts.push((verts[X * 3] + verts[Y * 3] + verts[Z * 3]) / 3, (verts[X * 3 + 1] + verts[Y * 3 + 1] + verts[Z * 3 + 1]) / 3, (verts[X * 3 + 2] + verts[Y * 3 + 2] + verts[Z * 3 + 2]) / 3);
        const ring = [A, X, B, Y, C, Z];
        for (let k = 0; k < 6; k += 1) put(G, ring[k], ring[(k + 1) % 6], parent);
      }
    }
    return { vertices: Float64Array.from(verts), indices: Uint32Array.from(out), parents: Uint32Array.from(outParents), limited: Boolean(mesh.limited) };
  };
  // 1. Cell borders: the cut lies on the line halfway between the two cell middles. Twice: an edge across two borders
  // (near a corner of three cells) was cut at the wrong one in the first round; its pieces then lie right.
  const border: CutAt = (rec, a, b, ua, va, ub, vb, shift) => {
    const oa = a * REC, ob = b * REC;
    if (rec[oa + 1] === rec[ob + 1]) return -1;
    // An edge only reaches over a border when both ends together are not further from it than it is long.
    if (rec[oa] + rec[ob] > Math.hypot(ub - ua, vb - va) * 1.001 + 1e-9) return -1;
    const Ax = rec[oa + 3], Ay = rec[oa + 4], Bx = rec[ob + 3] + shift, By = rec[ob + 4];
    const fa = (ua - Bx) ** 2 + (va - By) ** 2 - (ua - Ax) ** 2 - (va - Ay) ** 2;
    const fb = (ub - Bx) ** 2 + (vb - By) ** 2 - (ub - Ax) ** 2 - (vb - Ay) ** 2;
    const t = fa / (fa - fb);
    return t > 0.02 && t < 0.98 ? t : -1;
  };
  // Three cells in one triangle: the middle point on their common corner (circumcentre of the cell middles), when it lies inside.
  const triple: Meet = (rec, A, B, C) => {
    const oa = A * REC, ob = B * REC, oc = C * REC;
    if (rec[oa + 1] === rec[ob + 1] || rec[ob + 1] === rec[oc + 1] || rec[oa + 1] === rec[oc + 1]) return null;
    const ua = rec[oa + 5], va = rec[oa + 6], ub0 = rec[ob + 5], vb = rec[ob + 6], uc0 = rec[oc + 5], vc = rec[oc + 6];
    const ub = unwrap(ub0, ua), uc = unwrap(uc0, ua);
    const px = rec[oa + 3], py = rec[oa + 4], qx = rec[ob + 3] + ub - ub0, qy = rec[ob + 4], rx = rec[oc + 3] + uc - uc0, ry = rec[oc + 4];
    const D = 2 * (px * (qy - ry) + qx * (ry - py) + rx * (py - qy));
    if (Math.abs(D) < 1e-12) return null;
    const P2 = px * px + py * py, Q2 = qx * qx + qy * qy, R2 = rx * rx + ry * ry;
    const ox = (P2 * (qy - ry) + Q2 * (ry - py) + R2 * (py - qy)) / D;
    const oy = (P2 * (rx - qx) + Q2 * (px - rx) + R2 * (qx - px)) / D;
    const det = (vb - vc) * (ua - uc) + (uc - ub) * (va - vc);
    if (Math.abs(det) < 1e-12) return null;
    const wa = ((vb - vc) * (ox - uc) + (uc - ub) * (oy - vc)) / det;
    const wb = ((vc - va) * (ox - uc) + (ua - uc) * (oy - vc)) / det;
    const wc = 1 - wa - wb;
    return wa > 0.01 && wb > 0.01 && wc > 0.01 ? [wa, wb, wc] : null;
  };
  // Bumps after the borders. Every bump is cut out along its rim - each point exactly on the circle - and its inside laid
  // anew: rings round a point in its middle at the levels of the profile, joined in even strips. The triangles that were
  // inside only tell where on the body a new point lies. So the tip of a cone or a ball is a point of the mesh, and no
  // sliver of the grid runs over the steep rim of a half ball. The new points carry their value (the rim 0, the middle 1).
  function sliceBumps(start: SurfaceMesh): { mesh: SurfaceMesh; reduced: boolean; fixed: Float32Array | null } {
    const own = new Float64Array(REC);
    const middleOf = (rec: Float64Array, a: number, b: number, ua: number, va: number, ub: number, vb: number): [number, number] => {
      if (rec[a * REC + 1] === rec[b * REC + 1]) return [rec[a * REC + 3], rec[a * REC + 4]];
      describe((ua + ub) / 2, (va + vb) / 2, own, 0);
      return [own[3], own[4]];
    };
    // The rim: where an edge crosses the circle, exactly (not where the distance would cross it in a straight line). An
    // edge running through the circle with both ends outside is cut in the middle of its chord first, in a pass of its
    // own; its halves then cross once each. (Both in one pass, a triangle could be cut on all three sides, and its middle
    // point would land off the circle.)
    const rim = (chords: boolean): CutAt => (rec, a, b, ua, va, ub, vb) => {
      const [cx, cy] = middleOf(rec, a, b, ua, va, ub, vb);
      const px = ua - cx, py = va - cy, dx = ub - ua, dy = vb - va;
      const fa = px * px + py * py - hw * hw, fb = (px + dx) ** 2 + (py + dy) ** 2 - hw * hw;
      const offA = Math.hypot(px, py) - hw, offB = Math.hypot(px + dx, py + dy) - hw;
      const A = dx * dx + dy * dy, B = 2 * (px * dx + py * dy);
      const disc = B * B - 4 * A * fa;
      if (Math.abs(offA) < RIM_NEAR || Math.abs(offB) < RIM_NEAR) {
        // From a rim point to one outside, an edge almost along the rim may dip in and leave the circle again further on
        // (a cylinder's facet edge 0.014 mm inside a bump's rim): it is cut there too, or the sliver between it and the
        // rim is left out and the bump touches itself at the rim point - and keeps its grid (issue #1030).
        if (chords || !(A > 0) || disc <= 0 || Math.abs(offA) < RIM_NEAR === Math.abs(offB) < RIM_NEAR) return -1;
        if (Math.max(offA, offB) <= RIM_NEAR) return -1;
        const root = Math.sqrt(disc);
        const t1 = (-B - root) / (2 * A), t2 = (-B + root) / (2 * A);
        // The crossing away from the rim point, far enough from it not to be the same one.
        const t = Math.abs(offA) < RIM_NEAR ? t2 : t1;
        const from = Math.abs(offA) < RIM_NEAR ? 0 : 1;
        return t > 0 && t < 1 && Math.abs(t - from) * Math.sqrt(A) > 4 * RIM_SNAP ? t : -1;
      }
      if (!(A > 0) || disc <= 0) return -1;
      const root = Math.sqrt(disc);
      const t1 = (-B - root) / (2 * A), t2 = (-B + root) / (2 * A);
      let t: number;
      if (!chords && (fa > 0) !== (fb > 0)) t = t1 >= 0 && t1 <= 1 ? t1 : t2;
      else if (chords && fa > 0 && fb > 0 && t1 > 0 && t2 < 1) t = (t1 + t2) / 2;
      else return -1;
      return t > 0 && t < 1 ? t : -1;
    };
    // How many bumps (the cells the texturable triangles reach) and what they may cost: a rim of B points and rings
    // of fewer points inwards make about 2 B (1 + sum of the levels) triangles.
    const rec0 = recordsOf(start.vertices);
    const skip0 = skipOf(start.vertices, rec0, start.indices, start.parents);
    const cells = new Set<number>();
    for (let f = 0; f < skip0.length; f += 1) if (!skip0[f]) cells.add(rec0[start.indices[f * 3] * REC + 1]);
    const room = Math.max(0, maxTriangles - 2 * start.indices.length / 3);
    const wanted = s.profile === "pointed" ? 1 : s.profile === "flat" ? 2 : steps;
    let rings = wanted;
    let rimEdge = hw / BUMP_RIM_STEPS[s.detail];
    const cost = () => {
      const levels = profileLevels(s.profile, rings);
      return cells.size * 2 * ((2 * Math.PI * hw) / rimEdge) * (1 + levels.reduce((sum, t) => sum + t, 0) - 1) * 1.3;
    };
    while (cost() > room && rings > Math.min(2, wanted)) rings -= 1;
    while (cost() > room && rimEdge < hw) rimEdge *= 1.4;
    // 1. Finer near the rims, so a rim gets its points: edges whose middle lies near one, at most rimEdge long - only on
    // faces a bump can be laid anew on (not smooth, not turned away from the projection). New points come from such
    // edges, so they count as such too.
    const n0 = start.vertices.length / 3;
    const open = new Uint8Array(n0);
    for (let f = 0; f < skip0.length; f += 1) {
      if (skip0[f]) continue;
      const a = start.indices[f * 3], b = start.indices[f * 3 + 1], c = start.indices[f * 3 + 2];
      const n = faceCross(start.vertices, a, b, c);
      const ox = (start.vertices[a * 3 + i1] + start.vertices[b * 3 + i1] + start.vertices[c * 3 + i1]) / 3 - c1;
      const oy = (start.vertices[a * 3 + i2] + start.vertices[b * 3 + i2] + start.vertices[c * 3 + i2]) / 3 - c2;
      const facing = cyl ? (n[i1] * ox + n[i2] * oy) / (Math.hypot(ox, oy) || 1) : n[ax];
      if (Math.abs(facing) < 0.5 * Math.hypot(n[0], n[1], n[2])) continue;
      open[a] = 1;
      open[b] = 1;
      open[c] = 1;
    }
    const nearRim = (verts: ArrayLike<number>, p: number, q: number) => {
      const a = Math.min(p, q), b = Math.max(p, q);
      if ((a < n0 && !open[a]) || (b < n0 && !open[b])) return false;
      const [ua, va] = uvOf(verts, a);
      const [ub0, vb] = uvOf(verts, b);
      const ub = unwrap(ub0, ua);
      const mu = (ua + ub) / 2, mv = (va + vb) / 2;
      describe(mu, mv, own, 0);
      return Math.abs(Math.hypot(mu - own[3], mv - own[4]) - hw) < 0.25 * hw;
    };
    const fine = subdivide(start, rimEdge, maxTriangles, null, null, nearRim);
    let cur: SurfaceMesh = { vertices: fine.vertices, indices: fine.indices, parents: Uint32Array.from(fine.parents, (f) => start.parents[f]), limited: Boolean(fine.limited) };
    // 2. The rims (chords first, see rim). Cut finely: a rim point snapped onto a grid line flattened the rim
    // there, and the next ring inwards stuck out of it.
    cur = split(cur, rim(true), null, RIM_SNAP);
    cur = split(cur, rim(false), null, RIM_SNAP);
    // 3. Every bump's inside anew.
    const v = cur.vertices, I = cur.indices, T = I.length / 3;
    const rec = recordsOf(v);
    const skip = skipOf(v, rec, I, cur.parents);
    // A rim point may lie this far off its circle (see RIM_NEAR); the ring inwards keeps more room than that.
    const near = RIM_NEAR;
    type Bump = { cx: number; cy: number; faces: number[]; bad: boolean; at: number[] };
    // Triangles squeezed to a line face no way: they go to the bump on their side of the body afterwards.
    const flat: [number, number][] = [];
    const bumps = new Map<number, Bump>();
    const uvAt = (i: number, ref: number): [number, number] => [unwrap(rec[i * REC + 5], ref), rec[i * REC + 6]];
    for (let f = 0; f < T; f += 1) {
      const a = I[f * 3], b = I[f * 3 + 1], c = I[f * 3 + 2];
      const ref = rec[a * REC + 5];
      const [ua, va] = uvAt(a, ref), [ub, vb] = uvAt(b, ref), [uc, vc] = uvAt(c, ref);
      describe((ua + ub + uc) / 3, (va + vb + vc) / 3, own, 0);
      let cx = own[3];
      const cy = own[4];
      if (Math.hypot((ua + ub + uc) / 3 - cx, (va + vb + vc) / 3 - cy) >= hw) continue;
      // Around a cylinder a bump on the seam is one bump from both sides: named by its middle brought round to the front.
      if (period) {
        const front = cx - period * Math.round(cx / period);
        if (front !== cx) {
          describe(front, cy, own, 0);
          cx = own[3];
        }
      }
      // Two walls on the same place of the unrolled surface (a box's opposite sides, a cup's inner and outer wall) are
      // told apart by the way they face.
      const n = faceCross(v, a, b, c);
      const size = Math.hypot(n[0], n[1], n[2]);
      const ox = (v[a * 3 + i1] + v[b * 3 + i1] + v[c * 3 + i1]) / 3 - c1, oy = (v[a * 3 + i2] + v[b * 3 + i2] + v[c * 3 + i2]) / 3 - c2;
      const facing = cyl ? (n[i1] * ox + n[i2] * oy) / (Math.hypot(ox, oy) || 1) : n[ax];
      const longest = Math.max(...[[a, b], [b, c], [c, a]].map(([p, q]) => (v[p * 3] - v[q * 3]) ** 2 + (v[p * 3 + 1] - v[q * 3 + 1]) ** 2 + (v[p * 3 + 2] - v[q * 3 + 2]) ** 2));
      if (size < 1e-6 * longest) {
        flat.push([f, own[1]]);
        continue;
      }
      const key = own[1] * 2 + (facing > 0 ? 1 : 0);
      // A face turned away from the projection (the side of a cylinder seen flat from above) unrolls into a sliver: the
      // bump there keeps its cut grid.
      const steep = Math.abs(facing) < 0.5 * size;
      let bump = bumps.get(key);
      const at = [0, 1, 2].map((k) => (v[a * 3 + k] + v[b * 3 + k] + v[c * 3 + k]) / 3);
      if (!bump) bumps.set(key, (bump = { cx, cy, faces: [], bad: false, at }));
      // A bump reaching a face that stays smooth (or the axis) keeps its cut grid. A triangle between two rim points and one point just outside lies outside: only the rim's bulge puts its middle
      // in. One reaching from well inside to outside was not cut - the bump keeps its grid.
      // Measured from the middle brought to the front, the corners brought along (round a box's outline u runs from 0 to
      // the whole way round: the far half of its bumps found no triangle of their own and kept their grid).
      const off = [[ua, va], [ub, vb], [uc, vc]].map(([u, w]) => Math.hypot(unwrap(u, cx) - cx, w - cy) - hw);
      if (skip[f] || steep || (Math.max(...off) > near && Math.min(...off) < -near)) bump.bad = true;
      else if (Math.max(...off) <= near) bump.faces.push(f);
    }
    for (const [f, cell] of flat) {
      // The bump of that cell on this side: the nearer of the two walls (a box's opposite sides share their cells).
      const centre = [0, 1, 2].map((k) => (v[I[f * 3] * 3 + k] + v[I[f * 3 + 1] * 3 + k] + v[I[f * 3 + 2] * 3 + k]) / 3);
      const options = [bumps.get(cell * 2), bumps.get(cell * 2 + 1)].filter((b): b is Bump => Boolean(b));
      if (!options.length) continue;
      const dist = (b: Bump) => Math.hypot(b.at[0] - centre[0], b.at[1] - centre[1], b.at[2] - centre[2]);
      const bump = options.reduce((x, y) => (dist(y) < dist(x) ? y : x));
      const [ua, va] = uvAt(I[f * 3], bump.cx), [ub, vb] = uvAt(I[f * 3 + 1], bump.cx), [uc, vc] = uvAt(I[f * 3 + 2], bump.cx);
      const off = [[ua, va], [ub, vb], [uc, vc]].map(([u, w]) => Math.hypot(u - bump.cx, w - bump.cy) - hw);
      if (skip[f] || (Math.max(...off) > near && Math.min(...off) < -near)) bump.bad = true;
      else if (Math.max(...off) <= near) bump.faces.push(f);
    }
    const verts = Array.from(v);
    const fixed: number[] = new Array(v.length / 3).fill(NaN);
    const drop = new Uint8Array(T);
    const out: number[] = [], outParents: number[] = [];
    const levels = profileLevels(s.profile, rings).filter((t) => t < 1 - 1e-9);
    for (const bump of bumps.values()) {
      if (bump.bad || bump.faces.length < 3) continue;
      const { cx, cy, faces } = bump;
      // The rim as one closed loop of edges that only one of the bump's triangles has.
      const edges = new Map<string, [number, number]>();
      for (const f of faces) for (let k = 0; k < 3; k += 1) edges.set(`${I[f * 3 + k]},${I[f * 3 + ((k + 1) % 3)]}`, [I[f * 3 + k], I[f * 3 + ((k + 1) % 3)]]);
      const next = new Map<number, number>();
      let ok = true;
      for (const [a, b] of edges.values()) {
        if (edges.has(`${b},${a}`)) continue;
        // Two rim edges from one point: the bump touches itself there (half on a face kept smooth) - it keeps its grid.
        if (next.has(a)) ok = false;
        next.set(a, b);
      }
      if (!ok || next.size < 6) continue;
      const loop: number[] = [];
      const first = next.keys().next().value as number;
      for (let p = first; loop.length <= next.size; ) {
        loop.push(p);
        const q = next.get(p);
        if (q === undefined) break;
        p = q;
        if (p === first) break;
      }
      if (loop.length !== next.size || next.get(loop[loop.length - 1]) !== first) continue;
      const rimUv = loop.map((p) => uvAt(p, cx));
      // A rim that leaves its circle runs over the body's edge (half a bump at the top or the bottom): it keeps its grid.
      if (rimUv.some(([u, w]) => Math.abs(Math.hypot(u - cx, w - cy) - hw) > near)) continue;
      // Which way round the loop runs in the unrolled surface; angles are counted that way.
      let area = 0;
      for (let k = 0; k < loop.length; k += 1) {
        const [u0, w0] = rimUv[k], [u1, w1] = rimUv[(k + 1) % loop.length];
        area += u0 * w1 - u1 * w0;
      }
      const dir = area > 0 ? 1 : -1;
      const rimAngle: number[] = [];
      for (let k = 0; k < loop.length; k += 1) {
        let a = dir * Math.atan2(rimUv[k][1] - cy, rimUv[k][0] - cx);
        // A point a hair behind the one before (snapped onto the rim) counts as level with it.
        if (k > 0) {
          while (a < rimAngle[k - 1] - 0.2) a += 2 * Math.PI;
          a = Math.max(a, rimAngle[k - 1]);
        }
        rimAngle.push(a);
      }
      // Not around the middle once (a rim folded back): leave it as cut.
      if (rimAngle[rimAngle.length - 1] - rimAngle[0] >= 2 * Math.PI) continue;
      // Where on the body a point of the unrolled surface lies: in one of the old triangles (the one it lies in, or the
      // nearest when it lies on a border). Its place there and the old triangle's own triangle of the body.
      const corners = faces.map((f) => [I[f * 3], I[f * 3 + 1], I[f * 3 + 2]].map((p) => uvAt(p, cx)));
      const find = (u: number, w: number): [number, number[]] => {
        let best = 0, bestScore = -Infinity, bw: number[] = [1, 0, 0];
        for (let k = 0; k < faces.length; k += 1) {
          const [[u0, w0], [u1, w1], [u2, w2]] = corners[k];
          const det = (w1 - w2) * (u0 - u2) + (u2 - u1) * (w0 - w2);
          // A triangle squeezed to a line (where cuts met) holds no place: a point "in" it would land on the line.
          const longest = Math.max((u1 - u0) ** 2 + (w1 - w0) ** 2, (u2 - u1) ** 2 + (w2 - w1) ** 2, (u0 - u2) ** 2 + (w0 - w2) ** 2);
          if (Math.abs(det) < 1e-6 * longest) continue;
          const l0 = ((w1 - w2) * (u - u2) + (u2 - u1) * (w - w2)) / det;
          const l1 = ((w2 - w0) * (u - u2) + (u0 - u2) * (w - w2)) / det;
          const l2 = 1 - l0 - l1;
          const score = Math.min(l0, l1, l2);
          if (score > bestScore) {
            bestScore = score;
            best = k;
            bw = [l0, l1, l2].map((x) => Math.max(0, x));
          }
          if (score >= 0) break;
        }
        return [best, bw];
      };
      // The unrolled place of every point of the new bump, for the triangles' own old triangle below.
      const uvOfPoint = new Map<number, [number, number]>();
      loop.forEach((p, k) => uvOfPoint.set(p, rimUv[k]));
      const place = (u: number, w: number): number => {
        const [k, bw] = find(u, w);
        const total = bw[0] + bw[1] + bw[2] || 1;
        const f = faces[k];
        const id = verts.length / 3;
        for (let axis = 0; axis < 3; axis += 1) {
          let x = 0;
          for (let j = 0; j < 3; j += 1) x += (bw[j] / total) * v[I[f * 3 + j] * 3 + axis];
          verts.push(x);
        }
        uvOfPoint.set(id, [u, w]);
        return id;
      };
      // A coarse rim (few points, to stay within the triangle budget) cuts into its circle with its chords: a ring further
      // out than the nearest chord would poke through the rim. Such rings go; the rim takes their place.
      let chord = hw;
      for (let k = 0; k < loop.length; k += 1) {
        const [u0, w0] = rimUv[k], [u1, w1] = rimUv[(k + 1) % loop.length];
        const du = u1 - u0, dw = w1 - w0, l = Math.hypot(du, dw);
        if (l > 0) chord = Math.min(chord, Math.abs(du * (cy - w0) - dw * (cx - u0)) / l);
      }
      // Rings inwards: as many points as keep their spacing, at least six; the first point at the angle of the rim's first.
      const ringsIn = levels.filter((t) => t * hw < chord - near).reverse().map((t) => {
        const count = Math.max(6, Math.round(Math.min(loop.length, BUMP_RING_POINTS[s.detail]) * t));
        const ids: number[] = [], angles: number[] = [];
        for (let k = 0; k < count; k += 1) {
          const a = rimAngle[0] + (2 * Math.PI * k) / count;
          const real = dir * a;
          ids.push(place(cx + t * hw * Math.cos(real), cy + t * hw * Math.sin(real)));
          angles.push(a);
          fixed.push(surfaceFalloff(t, s.profile));
        }
        return { ids, angles };
      });
      const middle = place(cx, cy);
      fixed.push(1);
      // A new triangle belongs to the triangle of the body its middle lies on: the direction each point moves along is
      // interpolated over it (on a cylinder of 64 sides the neighbour's is 6 degrees off).
      const tri = (a: number, b: number, c: number) => {
        out.push(a, b, c);
        const [ua, wa] = uvOfPoint.get(a)!, [ub, wb] = uvOfPoint.get(b)!, [uc, wc] = uvOfPoint.get(c)!;
        outParents.push(cur.parents[faces[find((ua + ub + uc) / 3, (wa + wb + wc) / 3)[0]]]);
      };
      const zip = (O: number[], oa: number[], In: number[], ia: number[]) => {
        const m = O.length, n = In.length;
        const angO = (k: number) => oa[k % m] + 2 * Math.PI * Math.floor(k / m);
        const angI = (k: number) => ia[k % n] + 2 * Math.PI * Math.floor(k / n);
        // Whether a new triangle runs the loop's way round in the unrolled surface (is not turned over).
        const upright = (a: number, b: number, c: number) => {
          const [ua, wa] = uvOfPoint.get(a)!, [ub, wb] = uvOfPoint.get(b)!, [uc, wc] = uvOfPoint.get(c)!;
          return dir * ((ub - ua) * (wc - wa) - (uc - ua) * (wb - wa)) > 0;
        };
        let i = 0, j = 0;
        while (i < m || j < n) {
          let outward = j >= n || (i < m && angO(i + 1) <= angI(j + 1));
          // Across a wide gap of a coarse rim, a fan from one rim point to the ring turned its last triangle over: the
          // edge it made in the flat side counted as a sharp one, and the bumps round it were left out. Then the other
          // way on.
          if (i < m && j < n) {
            const alongRim = upright(O[i % m], O[(i + 1) % m], In[j % n]);
            if (alongRim !== upright(O[i % m], In[(j + 1) % n], In[j % n])) outward = alongRim;
          }
          if (outward) {
            tri(O[i % m], O[(i + 1) % m], In[j % n]);
            i += 1;
          } else {
            tri(O[i % m], In[(j + 1) % n], In[j % n]);
            j += 1;
          }
        }
      };
      let outer = loop, outerAngles = rimAngle;
      for (const ring of ringsIn) {
        zip(outer, outerAngles, ring.ids, ring.angles);
        outer = ring.ids;
        outerAngles = ring.angles;
      }
      for (let k = 0; k < outer.length; k += 1) tri(outer[k], outer[(k + 1) % outer.length], middle);
      for (const p of loop) fixed[p] = 0;
      for (const f of faces) drop[f] = 1;
    }
    for (let f = 0; f < T; f += 1) {
      if (drop[f]) continue;
      out.push(I[f * 3], I[f * 3 + 1], I[f * 3 + 2]);
      outParents.push(cur.parents[f]);
    }
    let result: SurfaceMesh = { vertices: Float64Array.from(verts), indices: Uint32Array.from(out), parents: Uint32Array.from(outParents) };
    for (let pass = 0; pass < 12; pass += 1) {
      const c = collapseShortEdges(result.vertices, result.indices, SURFACE_MIN_EDGE);
      if (c.merged === 0 || !c.faces) break;
      const parents = result.parents;
      result = { vertices: result.vertices, indices: c.indices, parents: Uint32Array.from(c.faces, (f) => parents[f]) };
    }
    result.limited = Boolean(mesh.limited || cur.limited);
    return { mesh: result, reduced: rings < wanted || rimEdge > hw / BUMP_RIM_STEPS[s.detail], fixed: Float32Array.from(fixed) };
  }
  // 2. Corner lines: edges whose ends are nearest to different sides are cut exactly where both are equally far, when an
  // end lies in the joint - also where that place lies in the cell's flat middle: an edge from one arm of a joint's corner
  // to the other ran over the middle uncut, and its triangles bent (up to a quarter of the depth). An end on the cell
  // border may count to the neighbour cell; then (rarely) it is measured again in the cell of the edge's middle.
  const scratch = new Float64Array(REC * 3);
  const kink: CutAt = (rec, a, b, ua, va, ub, vb, shift) => {
    let oa = a * REC, ob = b * REC;
    if (rec[oa] >= hw * 1.02 && rec[ob] >= hw * 1.02) return -1;
    if (rec[oa + 1] === rec[ob + 1] && rec[oa + 2] === rec[ob + 2]) return -1;
    let R0 = rec;
    // b's cell point behind its border lies in b's own unrolled place: across the seam it is brought round.
    let sh = shift;
    if (rec[oa + 1] !== rec[ob + 1]) {
      describe((ua + ub) / 2, (va + vb) / 2, scratch, 0);
      const sx = scratch[3], sy = scratch[4];
      const relabel = (u: number, v: number, o: number) => {
        let lo = Infinity;
        if (voronoi) {
          // The nearest border of this cell, its point fixed (as describe, the cell given).
          const { n } = cellSites(u, v, cell, around, s.seed);
          for (let k = 0; k < n; k += 1) {
            const px = CELL_PTS[k * 2], py = CELL_PTS[k * 2 + 1];
            if (Math.abs(px - sx) < 1e-9 && Math.abs(py - sy) < 1e-9) continue;
            const d = bisectorDistance(sx, sy, px, py, u, v);
            if (d < lo) {
              lo = d;
              scratch[o + 2] = CELL_KEY[k];
              scratch[o + 8] = px;
              scratch[o + 9] = py;
            }
          }
        } else {
          for (let k = 0; k < 6; k += 1) {
            const d = g(sx, sy, k, 0, 0, u, v);
            if (d < lo) {
              lo = d;
              scratch[o + 2] = k;
            }
          }
        }
        scratch[o] = lo;
        scratch[o + 3] = sx;
        scratch[o + 4] = sy;
      };
      relabel(ua, va, REC);
      relabel(ub, vb, REC * 2);
      R0 = scratch;
      oa = REC;
      ob = REC * 2;
      sh = 0;
      if (scratch[oa + 2] === scratch[ob + 2]) return -1;
    }
    const sx = R0[oa + 3], sy = R0[oa + 4];
    const ka = R0[oa + 2], kb = R0[ob + 2];
    const gA = (x: number, y: number) => g(sx, sy, ka, R0[oa + 8], R0[oa + 9], x, y);
    const gB = (x: number, y: number) => g(sx, sy, kb, R0[ob + 8] + sh, R0[ob + 9], x, y);
    const ha = gA(ua, va) - gB(ua, va), hb = gA(ub, vb) - gB(ub, vb);
    const t = ha / (ha - hb);
    return t > 0.02 && t < 0.98 ? t : -1;
  };
  let cur = split(mesh, border, triple);
  cur = split(cur, border, triple);
  if (s.pattern === "bumps") return sliceBumps(cur);
  cur = split(cur, kink);
  cur = split(cur, kink);
  // 3. Profile levels. Points just off a level count as on it (a fifth of the gap between levels, at most SNAP): otherwise
  // cuts would lie close to them - many short edges and slivers that would have to be merged again.
  const v = cur.vertices, n = v.length / 3;
  const rec = recordsOf(v);
  const I = cur.indices;
  const T = I.length / 3;
  const skip = skipOf(v, rec, I, cur.parents);
  const levelsFor = (count: number) => profileLevels(s.profile, count).map((t) => t * hw);
  // A triangle crossing c levels becomes a strip of about 2c + 1 triangles.
  const estimate = (levels: number[]) => {
    let count = 0;
    for (let f = 0; f < T; f += 1) {
      const da = rec[I[f * 3] * REC], db = rec[I[f * 3 + 1] * REC], dc = rec[I[f * 3 + 2] * REC];
      const lo = Math.min(da, db, dc), hi = Math.max(da, db, dc);
      let crossings = 0;
      if (!skip[f]) for (const level of levels) if (level > lo && level < hi) crossings += 1;
      count += 1 + 2 * crossings;
    }
    return count;
  };
  let count = Math.max(2, steps);
  let levels = levelsFor(count);
  while (s.profile === "round" && count > 2 && estimate(levels) > maxTriangles) levels = levelsFor((count -= 1));
  let gap = levels[0];
  for (let k = 1; k < levels.length; k += 1) gap = Math.min(gap, levels[k] - levels[k - 1]);
  const snap = Math.min(0.2 * gap, SNAP);
  const dField = new Float64Array(n);
  for (let i = 0; i < n; i += 1) {
    const d = rec[i * REC];
    dField[i] = d;
    for (const level of levels) {
      if (Math.abs(d - level) < snap) {
        dField[i] = level;
        break;
      }
    }
  }
  const sliced = new Uint8Array(T);
  for (let f = 0; f < T; f += 1) {
    if (skip[f]) continue;
    if (Math.min(dField[I[f * 3]], dField[I[f * 3 + 1]], dField[I[f * 3 + 2]]) < hw * 1.001) sliced[f] = 1;
  }
  let out = sliceByField(cur, dField, (i, j) => dField[j] - dField[i], 1e6, levels, sliced);
  // Short edges (levels close to a corner, narrow triangles at border and corner line) are pulled together here
  // already, once for all depths - otherwise the output would do it again after every move.
  for (let pass = 0; pass < 12; pass += 1) {
    const c = collapseShortEdges(out.vertices, out.indices, SURFACE_MIN_EDGE);
    if (c.merged === 0 || !c.faces) break;
    const parents = out.parents;
    out = { vertices: out.vertices, indices: c.indices, parents: Uint32Array.from(c.faces, (f) => parents[f]) };
  }
  out.limited = Boolean(mesh.limited);
  return { mesh: out, reduced: count < Math.max(2, steps) };
}

/**
 * Bricks: cut along their joints in strips (see sliceByField) rather than cell by cell as honeycomb - their joints are
 * straight lines, and a brick's face is flat, so the body's own coarse grid is all a face needs. In three steps:
 * 1. Along the courses: every joint between two courses, at its middle and at the profile's levels either side.
 * 2. Across, course by course: a course's own joints the same way. Every triangle lies in one course after step 1;
 *    those of the other courses take the points on the edges they share.
 * 3. Where a course's joint meets the joint between the courses, the depth follows the nearer of the two: cut along the
 *    line where both are equally far (every other course at a time, so a point on the border between two courses is
 *    measured in the course being cut). Then the depth is linear in every triangle.
 * A round profile gets half of `steps` levels per flank (as grooves), fewer down to 2 when the triangles would not fit
 * `maxTriangles`.
 * `skipBase`: input triangles that surely stay smooth. Parents point at the input mesh.
 */
function sliceBricks(mesh: SurfaceMesh, s: SurfaceTextureSettings, layout: SurfaceTextureLayout, steps: number, maxTriangles: number, skipBase: Uint8Array): { mesh: SurfaceMesh; reduced: boolean; fixed: null } {
  const ax = AXIS_INDEX[s.axis];
  const [i1, i2] = acrossAxes(s.axis);
  const cyl = s.projection === "cylinder";
  const R = layout.radius, [c1, c2] = layout.center;
  const round = cyl ? 2 * Math.PI * R : 0;
  // A top or bottom cut as a flat face (all round: seen along z; round a body: along its axis) has bricks of its own.
  const cap = !cyl && (layout.projection === "allRound" ? ax === 2 : layout.projection === "cylinder");
  const uAxis = cyl ? -1 : cap ? i1 + 3 : i1;
  const { origin, cell: L } = brickAlong(layout, uAxis);
  const { H, v0 } = brickRows(s, layout, uAxis);
  const hw = brickJointHalf(s, layout, uAxis);
  const courses = BRICK_COURSES[s.brickBond];
  // Every point's place in the unrolled surface, the change from one point to another across the seam too.
  const unrolled = (m: SurfaceMesh) => {
    const v = m.vertices, n = v.length / 3;
    const U = new Float64Array(n), V = new Float64Array(n), pole = new Uint8Array(n);
    for (let i = 0; i < n; i += 1) {
      if (cyl) {
        const x = v[i * 3 + i1] - c1, y = v[i * 3 + i2] - c2;
        if (Math.hypot(x, y) < 1e-6) pole[i] = 1;
        U[i] = aroundAngle(layout, v[i * 3 + i1], v[i * 3 + i2]) * R;
        V[i] = v[i * 3 + ax];
      } else {
        U[i] = v[i * 3 + i1];
        V[i] = v[i * 3 + i2];
      }
    }
    const du = (i: number, j: number) => {
      const d = U[j] - U[i];
      return round ? d - round * Math.round(d / round) : d;
    };
    return { U, V, pole, du, dv: (i: number, j: number) => V[j] - V[i] };
  };
  // Not cut: faces that surely stay smooth, triangles at the axis and - around a cylinder - top and bottom.
  const cuttable = (m: SurfaceMesh, F: ReturnType<typeof unrolled>) => {
    const I = m.indices, T = I.length / 3;
    const out = new Uint8Array(T);
    for (let f = 0; f < T; f += 1) {
      const a = I[f * 3], b = I[f * 3 + 1], c = I[f * 3 + 2];
      if (skipBase[m.parents[f]] || F.pole[a] || F.pole[b] || F.pole[c]) continue;
      if (cyl) {
        const n = faceCross(m.vertices, a, b, c);
        const l = Math.hypot(n[0], n[1], n[2]);
        if (l === 0 || Math.abs(n[ax]) / l > 0.8) continue;
      }
      out[f] = 1;
    }
    return out;
  };
  const courseOf = (V: Float64Array, I: Uint32Array, f: number) => Math.floor(((V[I[f * 3]] + V[I[f * 3 + 1]] + V[I[f * 3 + 2]]) / 3 - v0) / H);
  const modulo = (x: number, m: number) => ((x % m) + m) % m;
  // The joint's middle and its levels either side, at `at` along a field repeating every `P`.
  const placesOf = (at: number[], levels: number[], P: number) => {
    const out: number[] = [];
    for (const middle of at) {
      for (const d of [0, ...levels.flatMap((level) => [-level, level])]) {
        const o = modulo(middle + d, P);
        if (!out.some((known) => Math.abs(known - o) < 1e-9 * P || Math.abs(known - o) > P * (1 - 1e-9))) out.push(o);
      }
    }
    return out.sort((a, b) => a - b);
  };
  const cut = (levels: number[]) => {
    // 1. The joints between the courses.
    let F = unrolled(mesh);
    let cur: SurfaceMesh = sliceByField(mesh, F.V, F.dv, H, placesOf([v0], levels, H), cuttable(mesh, F), F.du);
    // 2. Each course's joints. A quad over an edge along a joint between courses stays two triangles.
    for (let c = 0; c < courses.length; c += 1) {
      F = unrolled(cur);
      const I = cur.indices;
      const sliced = cuttable(cur, F);
      for (let f = 0; f < sliced.length; f += 1) if (sliced[f] && modulo(courseOf(F.V, I, f), courses.length) !== c) sliced[f] = 0;
      const { lengths, offset } = courses[c];
      const length = lengths.reduce((sum, value) => sum + value, 0);
      const ends: number[] = [];
      let along = offset;
      for (const value of lengths) {
        ends.push(origin + along * L);
        along += value;
      }
      const V = F.V;
      cur = sliceByField(cur, F.U, F.du, length * L, placesOf(ends, levels, length * L), sliced, F.dv, false, (p, q) => Math.abs(V[p] - V[q]) < 1e-9);
    }
    // 3. The creases at the corners: nearer to the joint between the courses, or to the course's own.
    for (let parity = 0; parity < 2; parity += 1) {
      F = unrolled(cur);
      const I = cur.indices, n = F.U.length;
      const crease = new Float64Array(n);
      const near = new Uint8Array(n);
      for (let i = 0; i < n; i += 1) {
        // The course of this parity the point lies in, or on the border of.
        const at = (F.V[i] - v0) / H;
        let j = Math.floor(at);
        if (modulo(j, 2) !== parity) j += at - j < 0.5 ? -1 : 1;
        const bottom = v0 + j * H;
        const brick = brickAt(F.U[i], bottom + H / 2, s, layout, uAxis);
        const across = Math.max(0, Math.min(F.V[i] - bottom, bottom + H - F.V[i]));
        const along = Math.max(0, Math.min(F.U[i] - (brick.cx - brick.hl), brick.cx + brick.hl - F.U[i]));
        crease[i] = across - along;
        near[i] = (across < hw * 1.02 ? 1 : 0) | (along < hw * 1.02 ? 2 : 0);
      }
      const sliced = cuttable(cur, F);
      for (let f = 0; f < sliced.length; f += 1) {
        if (!sliced[f]) continue;
        const a = I[f * 3], b = I[f * 3 + 1], c = I[f * 3 + 2];
        if (modulo(courseOf(F.V, I, f), 2) !== parity || ((near[a] | near[b] | near[c]) & 3) !== 3) sliced[f] = 0;
      }
      cur = sliceByField(cur, crease, (p, q) => crease[q] - crease[p], 1e6, [0], sliced);
    }
    return cur;
  };
  const wanted = s.profile === "round" || s.profile === "dome" ? Math.max(2, Math.round(steps / 2)) : steps;
  let count = wanted;
  let out = cut(profileLevels(s.profile, count).map((t) => t * hw));
  while ((s.profile === "round" || s.profile === "dome") && count > 2 && out.indices.length / 3 > maxTriangles) {
    count = Math.max(2, Math.floor(count / 2));
    out = cut(profileLevels(s.profile, count).map((t) => t * hw));
  }
  // Short edges (levels close to a corner) are pulled together here already, once for all depths.
  for (let pass = 0; pass < 12; pass += 1) {
    const c = collapseShortEdges(out.vertices, out.indices, SURFACE_MIN_EDGE);
    if (c.merged === 0 || !c.faces) break;
    const parents = out.parents;
    out = { vertices: out.vertices, indices: c.indices, parents: Uint32Array.from(c.faces, (f) => parents[f]) };
  }
  out.limited = Boolean(mesh.limited || out.indices.length / 3 > maxTriangles);
  return { mesh: out, reduced: count < wanted, fixed: null };
}

const FLANK_JUMP = 0.3;
const FLANK_ROUNDS = 3;

/**
 * Refine the flanks: where the pattern value jumps by more than FLANK_JUMP along an edge (the rim
 * of a bump or a joint), split further down to `fineEdge`, over a few rounds, each time only at
 * the points still on a flank. Faces whose normal points along a cylinder's axis (top, bottom)
 * stay out: the pattern runs together into rays there and stays smooth anyway - unless they were
 * picked, and the pattern lies flat on them (SurfaceTextureLayout.flatCaps).
 */
function refineFlanks(mesh: SurfaceMesh, s: SurfaceTextureSettings, layout: SurfaceTextureLayout, fineEdge: number, maxTriangles: number, skipBase: Uint8Array | null = null): SurfaceMesh {
  let cur = mesh;
  const fine2 = (fineEdge * 1.01) ** 2;
  const ax = AXIS_INDEX[s.axis];
  for (let round = 0; round < FLANK_ROUNDS; round += 1) {
    const v = cur.vertices;
    const I = cur.indices;
    const n = v.length / 3;
    const { normals } = normalsAndCreases(v, I, 90);
    const values = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
      // Wood and bark show their rings on the ends: those are refined too.
      if (s.projection === "cylinder" && !layout.flatCaps && s.pattern !== "wood" && s.pattern !== "bark" && Math.abs(normals[i * 3 + ax]) > 0.8) values[i] = NaN;
      else values[i] = surfaceTextureValueAt(v[i * 3], v[i * 3 + 1], v[i * 3 + 2], normals[i * 3], normals[i * 3 + 1], normals[i * 3 + 2], s, layout);
    }
    const flags = new Uint8Array(n);
    let any = false;
    for (let t = 0; t < I.length; t += 3) {
      // Faces cut already (all round on a straight face) are exact.
      if (skipBase && skipBase[cur.parents[t / 3]]) continue;
      for (const [a, b] of [[I[t], I[t + 1]], [I[t + 1], I[t + 2]], [I[t + 2], I[t]]]) {
        const dx = v[a * 3] - v[b * 3], dy = v[a * 3 + 1] - v[b * 3 + 1], dz = v[a * 3 + 2] - v[b * 3 + 2];
        if (dx * dx + dy * dy + dz * dz <= fine2) continue;
        if (Math.abs(values[a] - values[b]) > FLANK_JUMP) {
          flags[a] = 1;
          flags[b] = 1;
          any = true;
        }
      }
    }
    if (!any) break;
    const next = subdivide(cur, fineEdge, maxTriangles, null, flags);
    if (next.indices.length === cur.indices.length) break;
    const parents = Uint32Array.from(next.parents, (f) => cur.parents[f]);
    cur = { vertices: next.vertices, indices: next.indices, parents, limited: cur.limited || next.limited };
    if (next.limited) break;
  }
  return cur;
}

/**
 * Bark and wood: their furrows, marks and rings cross the grid at any slant, and a vertex is either in a furrow or not:
 * its rim came out in steps of the grid. Their values are smoothed over each point's neighbours this many times
 * (half its own, half its neighbours' mean) - softened to the mesh, as an image is (see textureImage). Bark cut along its
 * levels (see barkLevelCuts) is not: only where the budget left it uncut.
 */
const SMOOTHED_PASSES: Partial<Record<SurfaceTexturePattern, number>> = { bark: 3, wood: 1 };

/**
 * When the triangle budget made the grid coarser than the edge the pattern asked for (see refined), its finest marks
 * fall between the points and the grid's rows show through - where the rows were split the other way round, as a line
 * across the body. Smoothing over the neighbours follows the rows too; instead each point takes the mean of the pattern on
 * a small circle round it in the surface, this share of the grid's edge wide, the same in every direction.
 */
const LIMITED_BLUR = 0.5;
/**
 * Bark: its finest marks (a crack across a ridge, a lenticel) are about as fine as the grid. Taken at the points
 * alone, a mark fell on one point and missed the next, and the furrows' rims came out in steps and spikes: each point
 * takes the mean on a circle this share of the grid's edge wide (see circleValue), always - the same wherever the grid
 * was refined, unlike smoothing over the neighbours.
 */
const BARK_BLUR = 0.5;

/** The pattern's value at a point for a normal: the mean on a circle `blur` mm wide round it in the surface, and at it. */
function circleValue(x: number, y: number, z: number, nx: number, ny: number, nz: number, s: SurfaceTextureSettings, layout: SurfaceTextureLayout, blur: number) {
  let value = surfaceTextureValueAt(x, y, z, nx, ny, nz, s, layout);
  if (!(blur > 0)) return value;
  // Two directions in the surface, then six points round the circle.
  const h = Math.abs(nx) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  let ax = ny * h[2] - nz * h[1], ay = nz * h[0] - nx * h[2], az = nx * h[1] - ny * h[0];
  const al = Math.hypot(ax, ay, az) || 1;
  ax /= al; ay /= al; az /= al;
  const bx = ny * az - nz * ay, by = nz * ax - nx * az, bz = nx * ay - ny * ax;
  for (let k = 0; k < 6; k += 1) {
    const c = Math.cos((k * Math.PI) / 3) * blur, sn = Math.sin((k * Math.PI) / 3) * blur;
    value += surfaceTextureValueAt(x + c * ax + sn * bx, y + c * ay + sn * by, z + c * az + sn * bz, nx, ny, nz, s, layout);
  }
  return value / 7;
}

/**
 * Each point's value on its circle (see circleValue) - or as `known` has it, for its first points - then smoothed over its
 * neighbours `passes` times - only those facing about its way: over a sharp edge a log's end took its bark's deep
 * furrows, and its rim came out in teeth.
 */
function smoothedValues(state: RefinedState, s: SurfaceTextureSettings, layout: SurfaceTextureLayout, passes: number, blur = 0, known: Float32Array | null = null) {
  const v = state.mesh.vertices, d = state.directions, n = v.length / 3;
  let cur = new Float32Array(n);
  for (let i = 0; i < n; i += 1) cur[i] = known && i < known.length ? known[i] : circleValue(v[i * 3], v[i * 3 + 1], v[i * 3 + 2], d[i * 3], d[i * 3 + 1], d[i * 3 + 2], s, layout, blur);
  const { start, nb } = state.adj;
  for (let pass = 0; pass < passes; pass += 1) {
    const next = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
      let sum = 0, count = 0;
      for (let k = start[i]; k < start[i + 1]; k += 1) {
        const j = nb[k];
        if (d[i * 3] * d[j * 3] + d[i * 3 + 1] * d[j * 3 + 1] + d[i * 3 + 2] * d[j * 3 + 2] < SMOOTH_ALONG) continue;
        sum += cur[j];
        count += 1;
      }
      next[i] = count ? 0.5 * cur[i] + (0.5 * sum) / count : cur[i];
    }
    cur = next;
  }
  return cur;
}

/** Neighbours smoothed over face about the same way: the cosine between their directions (about 35 degrees). */
const SMOOTH_ALONG = 0.82;

/**
 * Whether the masks keep a point smooth (screen frame), or null without masks. A point on a mask's
 * face counts as inside it. Inside any "exclude" mask it stays smooth; with any "only" mask, it
 * stays smooth unless it lies in one of those.
 */
function maskTest(masks: SurfaceTextureMask[]) {
  if (!masks.length) return null;
  // Into the screen frame: (x, y, z) -> (x, -z, y), for the normal as for a point; the offset stays.
  const screen = masks.map(({ mode, planes, box }) => {
    const out = new Float64Array(planes.length);
    for (let k = 0; k < planes.length; k += 4) {
      out[k] = planes[k];
      out[k + 1] = -planes[k + 2];
      out[k + 2] = planes[k + 1];
      out[k + 3] = planes[k + 3];
    }
    // The box turns the same way: x stays, the inside z becomes minus y, the inside y becomes z.
    const bounds = box ? [box[0], -box[5], box[1], box[3], -box[2], box[4]] : [-Infinity, -Infinity, -Infinity, Infinity, Infinity, Infinity];
    return { mode, planes: out, bounds };
  });
  const hasOnly = screen.some((mask) => mask.mode === "only");
  const inside = ({ planes, bounds }: (typeof screen)[number], x: number, y: number, z: number) => {
    const tolerance = 1e-6;
    if (x < bounds[0] - tolerance || y < bounds[1] - tolerance || z < bounds[2] - tolerance || x > bounds[3] + tolerance || y > bounds[4] + tolerance || z > bounds[5] + tolerance) return false;
    for (let k = 0; k < planes.length; k += 4) if (planes[k] * x + planes[k + 1] * y + planes[k + 2] * z - planes[k + 3] > tolerance) return false;
    return true;
  };
  return (x: number, y: number, z: number) => {
    let inOnly = false;
    for (const mask of screen) {
      if (!inside(mask, x, y, z)) continue;
      if (mask.mode === "exclude") return true;
      inOnly = true;
    }
    return hasOnly && !inOnly;
  };
}

/* ------------------------------------------------------------------ */
/* Applying                                                            */
/* ------------------------------------------------------------------ */

type RefinedState = {
  key: string;
  mesh: SurfaceMesh;
  normals: Float64Array;
  /** The direction each point moves along (see interpolatedNormals). */
  directions: Float64Array;
  /** How far and where it moves for a depth of 1: the direction, on a sharp edge where the moved faces meet (see creaseMoves). */
  moves: Float64Array;
  crease: Uint8Array;
  down: Float64Array;
  up: Float64Array;
  adj: Adjacency;
  edge: number;
  crossMax: number;
  limited: boolean;
  slice: { smoothFace: Uint8Array } | null;
  /** Text: the value per point (0 smooth, 1 the full depth), the mesh cut along the letters' walls, and the points torn. */
  text?: { values: Float32Array; torn: number } | null;
  /** Bumps laid anew: the value of their points (NaN: from the pattern), by point number; points added later have none. */
  fixed?: Float32Array | null;
  /** Per input triangle: the axis (0, 1, 2) of the straight face it was cut on as flat (all round on an angular body), else 255. */
  straightAxis?: Uint8Array | null;
};

export type SurfaceTextureStats = {
  triangles: number;
  /** The triangle budget made the grid coarser than the detail asked for. */
  limited: boolean;
  /** Around a cylinder: how many grooves or cells go round. */
  around: number | null;
  /** The spacing as made (rounded around a cylinder), and how far it differs on the narrowest and widest wall. */
  spacing: number;
  spacingMin: number | null;
  spacingMax: number | null;
  /** Nothing got the pattern: mostly a side is switched off that makes up the body. */
  nothing: boolean;
  /** Inward from both sides: a plate thinner than twice the depth is pierced. */
  tooDeep: boolean;
  /** Points held on the bed instead of sinking below it. */
  bedClamped: number;
  /** What was dropped or repaired while reading the body. */
  removed: SurfaceBase["removed"];
  /** Cracks: how many lines (branches count) and how long they are together, mm; null for the other patterns. */
  cracks: { lines: number; length: number } | null;
  /**
   * Text: whether letters came onto the body, and how many points of them lie where two ways round a corner met and do
   * not agree (the text tears there, as a label would); null for the other patterns.
   */
  text: { placed: boolean; torn: number } | null;
  /** Bricks: how many courses fit the height and how high each is as made, mm; null for the other patterns. */
  bricks: { courses: number; height: number } | null;
  /** How the pattern was laid on: what "auto" chose, or what was asked for. */
  projection: Exclude<SurfaceTextureProjection, "auto">;
};

export type SurfaceTextureResult = {
  /** Points in the editor's inside frame (unused points may be among them), and triangles over them. */
  vertices: Float64Array;
  indices: Uint32Array;
  stats: SurfaceTextureStats;
  /** Cracks with gold: the closed body filling their notch, in the same frame; null otherwise. */
  fill: { vertices: Float64Array; indices: Uint32Array } | null;
};

export type SurfaceTextureOptions = {
  /** A quicker, coarser result for showing while the settings change. */
  preview?: boolean;
  maxTriangles?: number;
};

/* ------------------------------------------------------------------ */
/* Picked faces                                                        */
/* ------------------------------------------------------------------ */

/** The closest point of triangle a-b-c to p (Ericson, Real-Time Collision Detection 5.1.5), as its squared distance. */
function triangleDistance2(p: number[], a: number[], b: number[], c: number[]) {
  const sub = (u: number[], w: number[]) => [u[0] - w[0], u[1] - w[1], u[2] - w[2]];
  const dot = (u: number[], w: number[]) => u[0] * w[0] + u[1] * w[1] + u[2] * w[2];
  const ab = sub(b, a), ac = sub(c, a), ap = sub(p, a);
  const d1 = dot(ab, ap), d2 = dot(ac, ap);
  let q: number[];
  if (d1 <= 0 && d2 <= 0) q = a;
  else {
    const bp = sub(p, b), d3 = dot(ab, bp), d4 = dot(ac, bp);
    const cp = sub(p, c), d5 = dot(ab, cp), d6 = dot(ac, cp);
    const vc = d1 * d4 - d3 * d2, vb = d5 * d2 - d1 * d6, va = d3 * d6 - d5 * d4;
    if (d3 >= 0 && d4 <= d3) q = b;
    else if (d6 >= 0 && d5 <= d6) q = c;
    else if (vc <= 0 && d1 >= 0 && d3 <= 0) {
      const t = d1 / (d1 - d3);
      q = [a[0] + t * ab[0], a[1] + t * ab[1], a[2] + t * ab[2]];
    } else if (vb <= 0 && d2 >= 0 && d6 <= 0) {
      const t = d2 / (d2 - d6);
      q = [a[0] + t * ac[0], a[1] + t * ac[1], a[2] + t * ac[2]];
    } else if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
      const t = (d4 - d3) / (d4 - d3 + (d5 - d6));
      q = [b[0] + t * (c[0] - b[0]), b[1] + t * (c[1] - b[1]), b[2] + t * (c[2] - b[2])];
    } else {
      const denom = 1 / (va + vb + vc), v = vb * denom, w = vc * denom;
      q = [a[0] + ab[0] * v + ac[0] * w, a[1] + ab[1] * v + ac[1] * w, a[2] + ab[2] * v + ac[2] * w];
    }
  }
  const d = sub(p, q);
  return dot(d, d);
}

/**
 * How tightly the body bends at each input triangle: the largest bend per mm from it to the triangles sharing a
 * corner with it over smooth edges (bending by less than `cosLimit`), from middle to middle. A cylinder's mantle of
 * radius r gives about 1/r, a fillet of 1 mm about 1, a flat face 0. Corners rather than edges: in a row of a round
 * split into triangles, every other one has no edge to the next row and would pass for flat.
 */
function triangleCurvatures(base: SurfaceBase, normals: Float64Array, cosLimit: number) {
  const v = base.vertices, I = base.indices, T = I.length / 3;
  const centers = new Float64Array(T * 3);
  const byCorner = new Map<number, number[]>();
  for (let t = 0; t < T; t += 1) {
    for (let k = 0; k < 3; k += 1) {
      centers[t * 3 + k] = (v[I[t * 3] * 3 + k] + v[I[t * 3 + 1] * 3 + k] + v[I[t * 3 + 2] * 3 + k]) / 3;
      const list = byCorner.get(I[t * 3 + k]);
      if (list) list.push(t);
      else byCorner.set(I[t * 3 + k], [t]);
    }
  }
  const curvatures = new Float64Array(T);
  for (let t = 0; t < T; t += 1) {
    for (let k = 0; k < 3; k += 1) {
      for (const u of byCorner.get(I[t * 3 + k])!) {
        if (u === t) continue;
        const cos = normals[t * 3] * normals[u * 3] + normals[t * 3 + 1] * normals[u * 3 + 1] + normals[t * 3 + 2] * normals[u * 3 + 2];
        if (cos < cosLimit) continue;
        const distance = Math.hypot(centers[t * 3] - centers[u * 3], centers[t * 3 + 1] - centers[u * 3 + 1], centers[t * 3 + 2] - centers[u * 3 + 2]);
        if (distance > 1e-9) curvatures[t] = Math.max(curvatures[t], Math.acos(Math.min(1, cos)) / distance);
      }
    }
  }
  return curvatures;
}

/**
 * The body's faces: every input triangle (screen frame) numbered by the face it lies on - the region reached from it
 * over edges that bend by less than `edgeAngle` (a box's side, a cylinder's mantle or its top). A fillet bends softly
 * but tightly: where a round of a radius under a tenth of the body's size meets a face more than four times flatter,
 * that is an edge too, so a filleted cup's mantle stays apart from its rim, its inside and its bottom (#1043).
 * `count` faces.
 */
export function surfaceTextureFaceIds(base: SurfaceBase, edgeAngle: number) {
  const v = base.vertices, I = base.indices, T = I.length / 3;
  const normals = new Float64Array(T * 3);
  for (let t = 0; t < T; t += 1) {
    const [x, y, z] = faceCross(v, I[t * 3], I[t * 3 + 1], I[t * 3 + 2]);
    const l = Math.hypot(x, y, z) || 1;
    normals[t * 3] = x / l;
    normals[t * 3 + 1] = y / l;
    normals[t * 3 + 2] = z / l;
  }
  // Triangles by edge, for walking over to the neighbours.
  const byEdge = new Map<number, number[]>();
  const edge = (a: number, b: number) => (a < b ? a * 67108864 + b : b * 67108864 + a);
  for (let t = 0; t < T; t += 1) {
    for (let k = 0; k < 3; k += 1) {
      const key = edge(I[t * 3 + k], I[t * 3 + ((k + 1) % 3)]);
      const list = byEdge.get(key);
      if (list) list.push(t);
      else byEdge.set(key, [t]);
    }
  }
  const cosLimit = Math.cos((edgeAngle * Math.PI) / 180);
  const curvatures = triangleCurvatures(base, normals, cosLimit);
  const tight = 10 / Math.max(base.size[0], base.size[1], base.size[2], 1e-9);
  const rounded = (t: number, u: number) => {
    const high = Math.max(curvatures[t], curvatures[u]), low = Math.min(curvatures[t], curvatures[u]);
    return high > tight && high > 4 * low;
  };
  const ids = new Int32Array(T).fill(-1);
  let count = 0;
  for (let first = 0; first < T; first += 1) {
    if (ids[first] >= 0) continue;
    ids[first] = count;
    const queue = [first];
    while (queue.length) {
      const t = queue.pop()!;
      for (let k = 0; k < 3; k += 1) {
        for (const u of byEdge.get(edge(I[t * 3 + k], I[t * 3 + ((k + 1) % 3)])) ?? []) {
          if (ids[u] >= 0) continue;
          if (normals[t * 3] * normals[u * 3] + normals[t * 3 + 1] * normals[u * 3 + 1] + normals[t * 3 + 2] * normals[u * 3 + 2] < cosLimit) continue;
          if (rounded(t, u)) continue;
          ids[u] = count;
          queue.push(u);
        }
      }
    }
    count += 1;
  }
  return mergeSmallRoundedPatches(base, ids, count, normals, byEdge, cosLimit);
}

/**
 * Faces split off only by the rounding rule that stay small all round (a box under a quarter of the body's size) are
 * no fillet but bumps on a rough or scanned body: each goes back to the face it shares most smooth edge with, so a
 * picked face does not leave specks without pattern. A fillet runs along its edge and keeps its own face.
 */
function mergeSmallRoundedPatches(base: SurfaceBase, ids: Int32Array, count: number, normals: Float64Array, byEdge: Map<number, number[]>, cosLimit: number) {
  const v = base.vertices, I = base.indices, T = I.length / 3;
  const lo = new Float64Array(count * 3).fill(Infinity), hi = new Float64Array(count * 3).fill(-Infinity);
  const sizes = new Int32Array(count);
  for (let t = 0; t < T; t += 1) {
    const f = ids[t];
    sizes[f] += 1;
    for (let c = 0; c < 3; c += 1) {
      for (let k = 0; k < 3; k += 1) {
        const value = v[I[t * 3 + c] * 3 + k];
        lo[f * 3 + k] = Math.min(lo[f * 3 + k], value);
        hi[f * 3 + k] = Math.max(hi[f * 3 + k], value);
      }
    }
  }
  const limit = 0.25 * Math.max(base.size[0], base.size[1], base.size[2]);
  const small = (f: number) => Math.hypot(hi[f * 3] - lo[f * 3], hi[f * 3 + 1] - lo[f * 3 + 1], hi[f * 3 + 2] - lo[f * 3 + 2]) < limit;
  // Smooth edge length shared between two faces.
  const shared = new Map<number, Map<number, number>>();
  for (const [key, list] of byEdge) {
    if (list.length !== 2) continue;
    const [t, u] = list, f = ids[t], g = ids[u];
    if (f === g) continue;
    if (normals[t * 3] * normals[u * 3] + normals[t * 3 + 1] * normals[u * 3 + 1] + normals[t * 3 + 2] * normals[u * 3 + 2] < cosLimit) continue;
    const a = Math.floor(key / 67108864), b = key % 67108864;
    const length = Math.hypot(v[a * 3] - v[b * 3], v[a * 3 + 1] - v[b * 3 + 1], v[a * 3 + 2] - v[b * 3 + 2]);
    for (const [x, y] of [[f, g], [g, f]]) {
      const row = shared.get(x) ?? new Map<number, number>();
      row.set(y, (row.get(y) ?? 0) + length);
      shared.set(x, row);
    }
  }
  const parent = Int32Array.from({ length: count }, (_, f) => f);
  const root = (f: number): number => (parent[f] === f ? f : (parent[f] = root(parent[f])));
  const order = Array.from({ length: count }, (_, f) => f).filter((f) => shared.has(f) && small(f)).sort((f, g) => sizes[f] - sizes[g]);
  for (const f of order) {
    let best = -1, longest = 0;
    for (const [g, length] of shared.get(f)!) {
      if (length > longest && root(g) !== root(f)) {
        longest = length;
        best = g;
      }
    }
    if (best >= 0) parent[root(f)] = root(best);
  }
  // Numbered again from 0.
  const renumber = new Int32Array(count).fill(-1);
  let merged = 0;
  for (let t = 0; t < T; t += 1) {
    const r = root(ids[t]);
    if (renumber[r] < 0) renumber[r] = merged++;
    ids[t] = renumber[r];
  }
  return { ids, normals, count: merged };
}

/** The body's box in the inside frame (x, y up, z to the viewer), from the screen frame's (x, y back, z up). */
function insideBox(base: SurfaceBase) {
  return { lo: [base.min[0], base.min[2], -base.max[1]], size: [base.size[0], base.size[2], base.size[1]] };
}

/**
 * The input triangle each picked face starts from: the one nearest the face's point among those facing its way (when
 * none does - a face picked on a body since turned - the nearest of all); -1 on a body without triangles.
 */
function pickedFaceSeeds(base: SurfaceBase, normals: Float64Array, faces: readonly SurfaceTextureFace[]) {
  const v = base.vertices, I = base.indices, T = I.length / 3;
  const point = (i: number) => [v[i * 3], v[i * 3 + 1], v[i * 3 + 2]];
  const { lo, size } = insideBox(base);
  return faces.map((face) => {
    const inside = [0, 1, 2].map((k) => lo[k] + face.at[k] * size[k]);
    const p = [inside[0], -inside[2], inside[1]];
    const n = [face.normal[0], -face.normal[2], face.normal[1]];
    let seed = -1, best = Infinity;
    for (let pass = 0; pass < 2 && seed < 0; pass += 1) {
      for (let t = 0; t < T; t += 1) {
        if (pass === 0 && normals[t * 3] * n[0] + normals[t * 3 + 1] * n[1] + normals[t * 3 + 2] * n[2] < 0.5) continue;
        const d = triangleDistance2(p, point(I[t * 3]), point(I[t * 3 + 1]), point(I[t * 3 + 2]));
        if (d < best) {
          best = d;
          seed = t;
        }
      }
    }
    return seed;
  });
}

/** Per input triangle whether it lies on one of the picked faces. */
export function surfaceTextureChosenTriangles(base: SurfaceBase, faces: readonly SurfaceTextureFace[], edgeAngle: number) {
  const { ids, normals } = surfaceTextureFaceIds(base, edgeAngle);
  const wanted = new Set(pickedFaceSeeds(base, normals, faces).filter((seed) => seed >= 0).map((seed) => ids[seed]));
  return Uint8Array.from(ids, (id) => (wanted.has(id) ? 1 : 0));
}

/**
 * A body's faces to pick with clicks: its triangles as the texture takes them (welded, back in the inside frame, for
 * the viewport), the face of each triangle, and what is needed to name a face again.
 */
export function surfaceTextureFacePick(positions: ArrayLike<number>, edgeAngle = SURFACE_TEXTURE_DEFAULTS.edgeAngle) {
  const base = prepareSurfaceBase(insideToScreenPositions(positions));
  const { ids, normals } = surfaceTextureFaceIds(base, edgeAngle);
  return { base, normals, positions: Float32Array.from(screenToInsidePositions(base.vertices)), indices: base.indices, triangleFaces: ids };
}

export type SurfaceTextureFacePick = ReturnType<typeof surfaceTextureFacePick>;

/** The face (as numbered in the pick) each of the picked faces lies on; -1 for one on no triangle. */
export function surfaceTexturePickedFaceIds(pick: SurfaceTextureFacePick, faces: readonly SurfaceTextureFace[]) {
  return pickedFaceSeeds(pick.base, pick.normals, faces).map((seed) => (seed >= 0 ? pick.triangleFaces[seed] : -1));
}

/**
 * A click on face `faceId` of the pick: a face picked already is taken out again, another one added - named by the
 * middle of its largest triangle and that triangle's normal, which finds that triangle again.
 */
export function toggleSurfaceTexturePickedFace(pick: SurfaceTextureFacePick, faces: readonly SurfaceTextureFace[], faceId: number) {
  const ids = surfaceTexturePickedFaceIds(pick, faces);
  if (ids.includes(faceId)) return faces.filter((_, k) => ids[k] !== faceId);
  const v = pick.base.vertices, I = pick.base.indices;
  let largest = -1, area = 0;
  for (let t = 0; t < pick.triangleFaces.length; t += 1) {
    if (pick.triangleFaces[t] !== faceId) continue;
    const a = Math.hypot(...faceCross(v, I[t * 3], I[t * 3 + 1], I[t * 3 + 2]));
    if (a > area) {
      area = a;
      largest = t;
    }
  }
  if (largest < 0) return [...faces];
  const middle = [0, 1, 2].map((k) => (v[I[largest * 3] * 3 + k] + v[I[largest * 3 + 1] * 3 + k] + v[I[largest * 3 + 2] * 3 + k]) / 3);
  const n = [pick.normals[largest * 3], pick.normals[largest * 3 + 1], pick.normals[largest * 3 + 2]];
  const { lo, size } = insideBox(pick.base);
  const inside = [middle[0], middle[2], -middle[1]];
  const face: SurfaceTextureFace = {
    at: [0, 1, 2].map((k) => (size[k] > 1e-9 ? (inside[k] - lo[k]) / size[k] : 0.5)) as [number, number, number],
    normal: [n[0], n[2], -n[1]],
  };
  return normalizeSurfaceTextureFaces([...faces, face]);
}

/**
 * A pattern standing out of the body bends round its convex edges in an arc, as a rope round a box's edge would, instead
 * of meeting in a sharp mitre: round the sharp corners between an angular body's sides (see SurfaceOutline.corners) and,
 * where the side's rows run over a rim or a border runs round it (see SurfaceTextureLayout.capEdge), round the rims. The
 * points of either face within `reach` of an edge spread over their face's half of an arc of the point's own height
 * round the edge, so the arc's flank comes from points on the faces (a point on the edge goes out along the bisector);
 * where two edges meet (a box's corner) the arcs make a round corner. The way out is the faces' normals added up, each
 * edge's other face weighted so the way turns evenly along the arc. Gives a function that places point i (moved `d` > 0)
 * into `out` and says whether it did: only points on side faces near an edge, or on a top or bottom near its rim.
 */
function edgeRounding(layout: SurfaceTextureLayout, s: SurfaceTextureSettings, kinds: Uint8Array, directions: Float64Array) {
  const ax = AXIS_INDEX[s.axis];
  const [i1, i2] = acrossAxes(s.axis);
  const rims = layout.capEdge ? (layout.rims ?? []) : [];
  // Cut in, every patterned top's or bottom's rim (see cutIn), how far its mitre's slide runs out.
  const inRims = (layout.inRims ?? []).map((rim) => ({ ...rim, inReach: Math.min(Math.max(1, 2 * s.depth), 2 * rim.reach) }));
  const corners = (layout.outline?.corners ?? []).map((c) => {
    const cos = clamp(c.before[0] * c.after[0] + c.before[1] * c.after[1], -1, 1);
    const angle = Math.acos(cos), sin = Math.sin(angle);
    return {
      ...c,
      angle,
      // Where a side runs away from the corner, across the axis: the incoming side backwards, the outgoing one forwards.
      awayBefore: [c.before[1], -c.before[0]],
      awayAfter: [-c.after[1], c.after[0]],
      // Towards the other side's normal, perpendicular to one's own (along the face to the corner).
      towardAfter: [(c.after[0] - cos * c.before[0]) / sin, (c.after[1] - cos * c.before[1]) / sin],
      towardBefore: [(c.before[0] - cos * c.after[0]) / sin, (c.before[1] - cos * c.after[1]) / sin],
      reach: Math.min(c.reach, Math.max(1, s.depth)),
      // Cut in (see below): how far the mitre's slide runs out, and its share per depth on the corner (tan of half the bend).
      cos,
      sin,
      inReach: Math.min(c.reach, Math.max(1, 2 * s.depth * Math.max(1, Math.tan(angle / 2)))),
    };
  });
  /**
   * A point `t` from an edge whose faces' normals stand `angle` apart: half the arc on this side, stretched over `reach`.
   * How far the way out leans to the other face (`lean`: the other normal's weight) and how far from the edge the point's
   * foot stays on its face (0 on the arc).
   */
  const bend = (t: number, reach: number, angle: number, d: number) => {
    const half = (d * angle) / 2;
    const sigma = (t * (reach + half)) / reach;
    const theta = Math.max(0, angle / 2 - sigma / d);
    return { lean: Math.sin(theta) / Math.sin(angle - theta), foot: Math.max(0, sigma - half) };
  };
  const rimOf = (h: number, sign: number) => rims.find((rim) => rim.sign === sign && Math.abs(rim.level - h) <= RIM_LEVEL);
  /**
   * Cut in (`d` < 0), round a convex edge - a corner between two sides, a rim between a side and a patterned top or
   * bottom - the faces moved in meet in a mitre (see creaseMoves). A point near the edge moved in along its own normal
   * alone stood out of the other face moved in, and the cut folded over itself there in little triangles. Its foot
   * slides away from the edge along its face instead, so that it lies as deep under the other face as that face is cut
   * in at the edge (`footDepth`: the move at a point for a normal), running out over `inReach`.
   */
  const slideFrom = (other: number, own: number, cos: number, sin: number, t: number, reach: number) =>
    Math.max(0, (-(Number.isFinite(other) ? other : own) + own * cos) / sin) * Math.max(0, 1 - t / reach);
  const cutIn = (i: number, kind: number, p: number[], d: number, out: Float64Array, footDepth: SurfaceFootDepth) => {
    const slide = [0, 0, 0];
    const normal = [0, 0, 0];
    let moved = false;
    if (kind === 1) {
      // A corner between two sides.
      for (const c of corners) {
        const qx = p[i1] - c.at[0], qy = p[i2] - c.at[1];
        for (const [n0, away, to, n1] of [[c.before, c.awayBefore, c.towardAfter, c.after], [c.after, c.awayAfter, c.towardBefore, c.before]]) {
          if (Math.abs(qx * n0[0] + qy * n0[1]) > 1e-4) continue;
          const along = qx * away[0] + qy * away[1];
          if (along < -1e-6 || along >= c.inReach) continue;
          const t = Math.max(0, along);
          const foot = p.slice();
          foot[i1] += t * to[0];
          foot[i2] += t * to[1];
          const across = [0, 0, 0];
          across[i1] = n1[0];
          across[i2] = n1[1];
          const shift = slideFrom(footDepth(foot, across), d, c.cos, c.sin, t, c.inReach);
          normal[i1] = n0[0];
          normal[i2] = n0[1];
          slide[i1] -= shift * to[0];
          slide[i2] -= shift * to[1];
          moved = true;
          break;
        }
        if (moved) break;
      }
      // A rim above or below, round a patterned top or bottom.
      for (const rim of inRims) {
        const t = rim.sign * (rim.level - p[ax]);
        if (t < -RIM_LEVEL || t >= rim.inReach) continue;
        const foot = p.slice();
        foot[ax] = rim.level;
        const up = [0, 0, 0];
        up[ax] = rim.sign;
        slide[ax] -= rim.sign * slideFrom(footDepth(foot, up), d, 0, 1, Math.max(0, t), rim.inReach);
        moved = true;
        break;
      }
      if (!moved) return false;
      if (normal[i1] === 0 && normal[i2] === 0) {
        const h1 = directions[i * 3 + i1], h2 = directions[i * 3 + i2], l = Math.hypot(h1, h2);
        if (l < 1e-6) return false;
        normal[i1] = h1 / l;
        normal[i2] = h2 / l;
      }
    } else {
      // On a top or bottom near its rim, or on the rim itself.
      const sign = directions[i * 3 + ax] > 0 ? 1 : -1;
      const rim = inRims.find((r) => r.sign === sign && Math.abs(r.level - p[ax]) <= RIM_LEVEL);
      if (!rim) return false;
      if (kind === 3) {
        // On the rim, not at a corner of sides (there three faces meet: the plain mitre stays): as deep under either face
        // as the other is cut in there.
        if (corners.some((c) => Math.hypot(p[i1] - c.at[0], p[i2] - c.at[1]) < 1e-4)) return false;
        const h1 = directions[i * 3 + i1], h2 = directions[i * 3 + i2], l = Math.hypot(h1, h2);
        if (l < 1e-6) return false;
        const side = [0, 0, 0];
        side[i1] = h1 / l;
        side[i2] = h2 / l;
        const up = [0, 0, 0];
        up[ax] = sign;
        const along = footDepth(p, side), across = footDepth(p, up);
        if (!Number.isFinite(along) || !Number.isFinite(across)) return false;
        for (let k = 0; k < 3; k += 1) out[i * 3 + k] = p[k] + Math.min(0, along) * side[k] + Math.min(0, across) * up[k];
        return true;
      }
      normal[ax] = sign;
      const away = (n: number[], t: number) => {
        const foot = p.slice();
        foot[i1] += t * n[0];
        foot[i2] += t * n[1];
        const side = [0, 0, 0];
        side[i1] = n[0];
        side[i2] = n[1];
        const shift = slideFrom(footDepth(foot, side), d, 0, 1, Math.max(0, t), rim.inReach);
        slide[i1] -= shift * n[0];
        slide[i2] -= shift * n[1];
      };
      let cornered = false;
      for (const c of corners) {
        const tb = (c.at[0] - p[i1]) * c.before[0] + (c.at[1] - p[i2]) * c.before[1];
        const ta = (c.at[0] - p[i1]) * c.after[0] + (c.at[1] - p[i2]) * c.after[1];
        if (tb < -1e-6 || ta < -1e-6 || tb >= rim.inReach || ta >= rim.inReach) continue;
        away(c.before, tb);
        away(c.after, ta);
        cornered = true;
        break;
      }
      if (!cornered) {
        const ring = rimRing(p[i1], p[i2], rim, layout);
        if (ring.depth >= rim.inReach) return false;
        away(ring.normal, ring.depth);
      }
    }
    for (let k = 0; k < 3; k += 1) out[i * 3 + k] = p[k] + d * normal[k] + slide[k];
    return true;
  };
  return (i: number, x: number, y: number, z: number, d: number, out: Float64Array, footDepth?: SurfaceFootDepth) => {
    const kind = kinds[i];
    if (d < 0) return (kind === 1 || kind === 2 || kind === 3) && Boolean(footDepth) && (corners.length > 0 || inRims.length > 0) && cutIn(i, kind, [x, y, z], d, out, footDepth!);
    // Without rims, only points on the sides alone (as before a top or bottom had a say).
    if (!(kind === 1 || (rims.length && (kind === 3 || kind === 2)))) return false;
    const p = [x, y, z];
    const way = [0, 0, 0];
    const foot = p.slice();
    let bent = false;
    if (kind & 1) {
      // A corner between two sides.
      let own: number[] | null = null;
      for (const c of corners) {
        const qx = p[i1] - c.at[0], qy = p[i2] - c.at[1];
        let t = -1, normal: number[] = [], toward: number[] = [], other: number[] = [];
        for (const [n0, away, to, n1] of [[c.before, c.awayBefore, c.towardAfter, c.after], [c.after, c.awayAfter, c.towardBefore, c.before]]) {
          if (Math.abs(qx * n0[0] + qy * n0[1]) > 1e-4) continue;
          const along = qx * away[0] + qy * away[1];
          if (along < -1e-6 || along > c.reach) continue;
          t = Math.max(0, along);
          [normal, toward, other] = [n0, to, n1];
          break;
        }
        if (t < 0) continue;
        const b = bend(t, c.reach, c.angle, d);
        own = normal;
        way[i1] += normal[0] + b.lean * other[0];
        way[i2] += normal[1] + b.lean * other[1];
        foot[i1] += (t - b.foot) * toward[0];
        foot[i2] += (t - b.foot) * toward[1];
        bent = true;
        break;
      }
      // A rim above or below.
      let rimmed = false;
      for (const rim of rims) {
        const t = rim.sign * (rim.level - p[ax]);
        if (t < -RIM_LEVEL || t >= rim.reach) continue;
        const b = bend(Math.max(0, t), rim.reach, Math.PI / 2, d);
        way[ax] += rim.sign * b.lean;
        foot[ax] = rim.level - rim.sign * b.foot;
        rimmed = true;
        break;
      }
      if (!bent && !rimmed) return false;
      if (!own) {
        // Not at a corner: the side's own way out, across the axis.
        const h1 = directions[i * 3 + i1], h2 = directions[i * 3 + i2], l = Math.hypot(h1, h2);
        if (l < 1e-6) return false;
        way[i1] += h1 / l;
        way[i2] += h2 / l;
      }
    } else {
      // A top or bottom near its rim: its own normal, and the side's (or two sides' at a corner) leaning in.
      const sign = directions[i * 3 + ax] > 0 ? 1 : -1;
      const rim = rimOf(p[ax], sign);
      if (!rim) return false;
      let cornered = false;
      for (const c of corners) {
        const tb = (c.at[0] - p[i1]) * c.before[0] + (c.at[1] - p[i2]) * c.before[1];
        const ta = (c.at[0] - p[i1]) * c.after[0] + (c.at[1] - p[i2]) * c.after[1];
        const reach = Math.min(rim.reach, c.reach);
        if (tb < -1e-6 || ta < -1e-6 || tb >= reach || ta >= reach) continue;
        const bb = bend(Math.max(0, tb), reach, Math.PI / 2, d), ba = bend(Math.max(0, ta), reach, Math.PI / 2, d);
        way[i1] = bb.lean * c.before[0] + ba.lean * c.after[0];
        way[i2] = bb.lean * c.before[1] + ba.lean * c.after[1];
        // The foot: as far from either side's line as is left of its arc.
        const det = c.before[0] * c.after[1] - c.before[1] * c.after[0];
        if (Math.abs(det) < 1e-9) return false;
        const ox = (bb.foot * c.after[1] - ba.foot * c.before[1]) / det, oy = (c.before[0] * ba.foot - c.after[0] * bb.foot) / det;
        foot[i1] = c.at[0] - ox;
        foot[i2] = c.at[1] - oy;
        cornered = true;
        break;
      }
      if (!cornered) {
        const ring = rimRing(p[i1], p[i2], rim, layout);
        if (ring.depth >= rim.reach) return false;
        const b = bend(ring.depth, rim.reach, Math.PI / 2, d);
        way[i1] = b.lean * ring.normal[0];
        way[i2] = b.lean * ring.normal[1];
        foot[i1] += (ring.depth - b.foot) * ring.normal[0];
        foot[i2] += (ring.depth - b.foot) * ring.normal[1];
      }
      way[ax] += sign;
    }
    const l = Math.hypot(way[0], way[1], way[2]);
    if (l < 1e-9) return false;
    for (let k = 0; k < 3; k += 1) out[i * 3 + k] = foot[k] + (d * way[k]) / l;
    return true;
  };
}

/**
 * Holds the welded body and the last refinement: when only the depth, the direction or what stays
 * smooth changes, the mesh is not refined again. `positions`: the body as triangles (nine numbers
 * each), in the editor's inside frame.
 */
export function createSurfaceTextureSession(positions: ArrayLike<number>) {
  const base = prepareSurfaceBase(insideToScreenPositions(positions));
  let cache: RefinedState | null = null;
  let chosenCache: { key: string; chosen: Uint8Array | null } | null = null;

  /** Per input triangle whether it lies on a picked face (see SurfaceTextureSettings.faces); null: none picked, all go. */
  function chosenFaces(s: SurfaceTextureSettings) {
    if (!s.faces.length) return null;
    const key = JSON.stringify([s.faces, s.edgeAngle]);
    if (chosenCache?.key === key) return chosenCache.chosen;
    const chosen = surfaceTextureChosenTriangles(base, s.faces, s.edgeAngle);
    chosenCache = { key, chosen };
    return chosen;
  }
  let fadeCache: { key: string; state: RefinedState } | null = null;
  // Per input triangle what kind of face it is round the axis (see pointKindsFor), by axis.
  const faceKinds = new Map<number, Uint8Array>();
  /**
   * Per point of the mesh the kinds of faces it lies on round the axis, as bits: 1 a side (normal across the axis), 2 a
   * top or bottom (normal along it), 4 any other. A point on a side only is 1, one on a rim between side and top 3.
   */
  function pointKindsFor(mesh: SurfaceMesh, ax: number) {
    const kinds = baseFaceKinds(ax);
    const out = new Uint8Array(mesh.vertices.length / 3);
    const I = mesh.indices;
    for (let t = 0; t < I.length / 3; t += 1) {
      const k = kinds[mesh.parents[t]];
      out[I[t * 3]] |= k;
      out[I[t * 3 + 1]] |= k;
      out[I[t * 3 + 2]] |= k;
    }
    return out;
  }
  /** Per input triangle its kind round the axis (see pointKindsFor). */
  function baseFaceKinds(ax: number) {
    let kinds = faceKinds.get(ax);
    if (!kinds) {
      const v = base.vertices, I = base.indices;
      kinds = new Uint8Array(I.length / 3);
      for (let f = 0; f < kinds.length; f += 1) {
        const n = faceCross(v, I[f * 3], I[f * 3 + 1], I[f * 3 + 2]);
        const l = Math.hypot(n[0], n[1], n[2]);
        kinds[f] = Math.abs(n[ax]) < 0.1 * l ? 1 : Math.abs(n[ax]) > 0.99 * l ? 2 : 4;
      }
      faceKinds.set(ax, kinds);
    }
    return kinds;
  }

  /** Per input triangle whether it is not one of `rim`'s top or bottom with the pattern: what cuts there skip. */
  function notOnRim(rim: SurfaceRim, smoothFace: Uint8Array, ax: number) {
    const v = base.vertices, I = base.indices;
    const kinds = baseFaceKinds(ax);
    return Uint8Array.from({ length: I.length / 3 }, (_, f) => {
      if (smoothFace[f] || kinds[f] !== 2 || faceCross(v, I[f * 3], I[f * 3 + 1], I[f * 3 + 2])[ax] * rim.sign <= 0) return 1;
      return [0, 1, 2].every((k) => Math.abs(v[I[f * 3 + k] * 3 + ax] - rim.level) <= RIM_LEVEL) ? 0 : 1;
    });
  }

  /**
   * Tops and bottoms in rings (see ringValue) cut along them at `offsets` within `P`: their own rings where they show (not
   * where the side's rows take the whole top). Where the side's rows run over a rim (capEdge "over" or "fold"), each top's
   * or bottom's rings go on from the side's rows, which lie at those offsets along the axis: cut there too - all over, or
   * in the band folded over (see overValue).
   */
  function capRingCuts(mesh: SurfaceMesh, s: SurfaceTextureSettings, layout: SurfaceTextureLayout, P: number, offsets: number[], skip: Uint8Array, maxTriangles: number, smoothFace: Uint8Array) {
    const over = layout.capEdge === "over", fold = layout.capEdge === "fold";
    let out = !over && ringsOnCaps(s, layout) ? sliceRings(mesh, s, layout, P, offsets, skip, maxTriangles) : mesh;
    if ((!over && !fold) || !layout.rims || out.limited) return out;
    const ax = AXIS_INDEX[s.axis];
    const mod = (x: number) => {
      const m = ((x % P) + P) % P;
      return m > P - 1e-9 * P ? 0 : m;
    };
    for (const rim of layout.rims) {
      const own = notOnRim(rim, smoothFace, ax);
      const sk = Uint8Array.from(skip, (k, f) => (k || own[f] ? 1 : 0));
      // A row at o along the axis lies on the top at a depth of sign × (o - level), round a circle at the radius less that.
      const depths = offsets.map((o) => mod(rim.sign * (o - rim.level)));
      const field = layout.outline ? depths : depths.map((d) => mod(rim.radius - d));
      const unique = [...new Set(field.map((o) => Math.round(o * 1e9) / 1e9))].sort((a, b) => a - b);
      const band = overBand(rim, rowPeriod(s, layout)) + P / 2;
      out = sliceRings(out, s, layout, P, unique, sk, maxTriangles, over ? null : layout.outline ? [0, band] : [rim.radius - band, rim.radius]);
      if (out.limited) break;
    }
    return out;
  }

  /**
   * Upright or slanted grooves running in from each rim (see rayValue) cut along them: the place across the grooves is
   * not linear on the top (the rings shorten inwards), so the triangles where they run are halved until it nearly is,
   * then cut at the profile's places (as sliceStripes), and along the rim's distance where they fade out.
   */
  function rayCuts(mesh: SurfaceMesh, s: SurfaceTextureSettings, layout: SurfaceTextureLayout, maxTriangles: number, smoothFace: Uint8Array, skip: Uint8Array) {
    const ax = AXIS_INDEX[s.axis];
    const [i1, i2] = acrossAxes(s.axis);
    const P = layout.period;
    const a = (layout.angle * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a);
    const offsets = stripeOffsets(P, s, CROSS_STEPS[s.detail] / 2).map((o) => o / P);
    let out = mesh;
    for (const rim of layout.rims ?? []) {
      const own = notOnRim(rim, smoothFace, ax);
      const sk = Uint8Array.from(skip, (k, f) => (k || own[f] ? 1 : 0));
      const length = rimRing(layout.center[0], layout.center[1], rim, layout).lengthAt(0);
      const end = rayReach(rim, s, layout);
      const across = (x: number, y: number) => {
        const ring = rimRing(x, y, rim, layout);
        return (ring.turn * length * ca - (rim.level + rim.sign * ring.depth) * sa) / P;
      };
      const depthAt = (x: number, y: number) => rimRing(x, y, rim, layout).depth;
      const wrap = (length * ca) / P;
      const inZone = (f: number, c: number[], m: SurfaceMesh) => !sk[m.parents[f]] && Math.min(...c.map((i) => depthAt(m.vertices[i * 3 + i1], m.vertices[i * 3 + i2]))) < end + P;
      const fine = refineLinear(out, across, wrap, i1, i2, inZone, 0.03, maxTriangles);
      const v = fine.vertices, I = fine.indices;
      const X = new Float64Array(v.length / 3);
      for (let i = 0; i < X.length; i += 1) X[i] = across(v[i * 3 + i1], v[i * 3 + i2]);
      const sliced = Uint8Array.from({ length: I.length / 3 }, (_, f) => (inZone(f, [I[f * 3], I[f * 3 + 1], I[f * 3 + 2]], fine) ? 1 : 0));
      const diff = (p: number, q: number) => {
        const d = X[q] - X[p];
        return wrap ? d - wrap * Math.round(d / wrap) : d;
      };
      out = soundOr(out, sliceByField(fine, X, diff, 1, offsets, sliced));
      // Where they fade out.
      const fade = layout.outline ? [end - P / 2, end] : [rim.radius - end, rim.radius - end + P / 2];
      out = soundOr(out, sliceRings(out, s, layout, 1e6, fade.filter((r) => r > 0), sk, maxTriangles, layout.outline ? [0, end + P] : [rim.radius - end - P, rim.radius], P));
      if (out.limited || out.indices.length / 3 > maxTriangles) {
        out.limited = true;
        break;
      }
    }
    return out;
  }

  /**
   * The cut mesh, or the one before when cutting left an edge open or shared by more than two triangles: slivers left
   * by cutting bumps' rims (three corners on a line) came out folded when cut again along the border.
   */
  function soundOr(before: SurfaceMesh, after: SurfaceMesh) {
    return badEdges(after.indices) > badEdges(before.indices) ? before : after;
  }

  /**
   * A border round the rims (capEdge "bead", see beadValue): cut along lines of equal distance to each rim at the places
   * of its round cross-section, closer to its foot where it is steep - on the sides along the axis, on the top or bottom
   * in rings (see sliceRings).
   */
  function beadCuts(mesh: SurfaceMesh, s: SurfaceTextureSettings, layout: SurfaceTextureLayout, maxTriangles: number, smoothFace: Uint8Array) {
    const ax = AXIS_INDEX[s.axis];
    const half = beadHalf(s, layout);
    const steps = Math.max(2, Math.round(CROSS_STEPS[s.detail] / 2));
    // The cross-section, and where the pattern under it has faded in again.
    const levels = [...Array.from({ length: steps }, (_, j) => half * Math.sin(((j + 1) / steps) * (Math.PI / 2))), BEAD_KEEP[1] * half];
    const reach = BEAD_KEEP[1] * half;
    const kinds = baseFaceKinds(ax);
    let out = mesh;
    for (const rim of layout.rims ?? []) {
      const v = out.vertices, I = out.indices;
      const F = new Float64Array(v.length / 3);
      for (let i = 0; i < F.length; i += 1) F[i] = rim.sign * (rim.level - v[i * 3 + ax]);
      const sliced = Uint8Array.from({ length: I.length / 3 }, (_, f) => {
        const parent = out.parents[f];
        if (smoothFace[parent] || kinds[parent] !== 1) return 0;
        const a = F[I[f * 3]], b = F[I[f * 3 + 1]], c = F[I[f * 3 + 2]];
        return Math.max(a, b, c) > 0 && Math.min(a, b, c) < reach ? 1 : 0;
      });
      out = soundOr(out, sliceByField(out, F, (i, j) => F[j] - F[i], 1e6, levels, sliced));
      const field = layout.outline ? levels : levels.map((t) => rim.radius - t).filter((r) => r > 0).sort((a, b) => a - b);
      const band: [number, number] = layout.outline ? [0, reach] : [rim.radius - reach, rim.radius];
      out = soundOr(out, sliceRings(out, s, layout, 1e6, field, notOnRim(rim, smoothFace, ax), maxTriangles, band, half));
      if (out.indices.length / 3 > maxTriangles) {
        out.limited = true;
        break;
      }
    }
    return out;
  }
  /**
   * The long strips CAD gives a round side in (a cylinder's: 40 mm along the axis, 1 mm round it) cut across at levels
   * `edge` apart along the axis, two strips' halves together as one (see sliceByField): halved in their own shape they
   * came out in slivers by the hundred thousand - the budget ran out before the grid was even, and the pattern showed the
   * strips as streaks. Only needles (see hasNeedles) on faces that do not stay smooth, reaching over more than two levels.
   */
  function cutStrips(mesh: SurfaceMesh, s: SurfaceTextureSettings, layout: SurfaceTextureLayout, edge: number, smoothFace: Uint8Array) {
    const ax = AXIS_INDEX[s.axis];
    const [i1, i2] = acrossAxes(s.axis);
    const v = mesh.vertices, I = mesh.indices;
    const F = new Float64Array(v.length / 3), A = new Float64Array(v.length / 3);
    for (let i = 0; i < F.length; i += 1) {
      F[i] = v[i * 3 + ax];
      A[i] = Math.atan2(v[i * 3 + i2] - layout.center[1], v[i * 3 + i1] - layout.center[0]) * layout.radius;
    }
    const turn = 2 * Math.PI * layout.radius;
    const sliced = new Uint8Array(I.length / 3);
    let any = false;
    for (let f = 0; f < sliced.length; f += 1) {
      if (smoothFace[mesh.parents[f]]) continue;
      const a = I[f * 3], b = I[f * 3 + 1], c = I[f * 3 + 2];
      if (Math.max(F[a], F[b], F[c]) - Math.min(F[a], F[b], F[c]) <= 2 * edge) continue;
      const area2 = Math.hypot(...faceCross(v, a, b, c));
      let longest = 0;
      for (const [p, q] of [[a, b], [b, c], [c, a]]) longest = Math.max(longest, (v[p * 3] - v[q * 3]) ** 2 + (v[p * 3 + 1] - v[q * 3 + 1]) ** 2 + (v[p * 3 + 2] - v[q * 3 + 2]) ** 2);
      if (area2 > 0 && longest > 8 * area2) {
        sliced[f] = 1;
        any = true;
      }
    }
    if (!any) return mesh;
    const around = (i: number, j: number) => {
      const d = A[j] - A[i];
      return d - turn * Math.round(d / turn);
    };
    return soundOr(mesh, sliceByField(mesh, F, (i, j) => F[j] - F[i], edge, [0], sliced, around));
  }

  /**
   * Bark: cut along lines of equal value (each point's on its circle, see circleValue) at a few heights, so the furrows'
   * steep flanks run along the edges. Taken at the grid's points alone, a flank crossing the grid at a slant came out as
   * a zip of small triangles along each furrow, and smoothing over the neighbours (see smoothedValues) only blurred it.
   * The values come back with the mesh (every point's), to be taken as they are: a point on a cut has its level - its
   * value taken afresh strayed a little from the line's, and the flanks came out crinkled along the cuts. Faces in `skip`
   * stay as they are; over the budget nothing is cut and no values come back.
   */
  function barkLevelCuts(mesh: SurfaceMesh, s: SurfaceTextureSettings, layout: SurfaceTextureLayout, blur: number, maxTriangles: number, skip: Uint8Array) {
    const v = mesh.vertices, I = mesh.indices;
    const { normals, crease } = normalsAndCreases(v, I, s.edgeAngle);
    const F = new Float64Array(v.length / 3);
    for (let i = 0; i < F.length; i += 1) F[i] = circleValue(v[i * 3], v[i * 3 + 1], v[i * 3 + 2], normals[i * 3], normals[i * 3 + 1], normals[i * 3 + 2], s, layout, blur);
    const steps = CROSS_STEPS[s.detail] / 2;
    const levels = Array.from({ length: steps }, (_, k) => (k + 0.5) / steps);
    // Not at a sharp edge (a log's rim): a point there has a value for either face, and the cuts towards it took the
    // bark's levels onto the end - which turned over there.
    const sliced = Uint8Array.from({ length: I.length / 3 }, (_, f) => (skip[mesh.parents[f]] || crease[I[f * 3]] || crease[I[f * 3 + 1]] || crease[I[f * 3 + 2]] ? 0 : 1));
    const cut = sliceByField(mesh, F, (i, j) => F[j] - F[i], 1e6, levels, sliced, null, true);
    if (cut.indices.length / 3 > maxTriangles || badEdges(cut.indices) > badEdges(mesh.indices)) return { mesh, values: null };
    return { mesh: cut, values: Float32Array.from(cut.field!) };
  }

  /**
   * A weave round the axis cut along its stakes and rows (see weave): upright at places across each stake's round back,
   * steepest by its edges, and level at the joints between the rows and across the weavers' bands. Its stakes rise from
   * the weaver at a slant to the grid, and their sides and the rows' joints came out in a sawtooth over its diagonals.
   * Only on the sides round the axis (not on a top or bottom, nor on faces staying smooth).
   */
  function weaveCuts(mesh: SurfaceMesh, s: SurfaceTextureSettings, layout: SurfaceTextureLayout, maxTriangles: number, smoothFace: Uint8Array) {
    const ax = AXIS_INDEX[s.axis];
    const [i1, i2] = acrossAxes(s.axis);
    const S = layout.cell, rowH = (2 / 3) * S;
    const r = (clamp(s.width, 0.1, 1) * S) / 4;
    const kinds = baseFaceKinds(ax);
    const sides = (m: SurfaceMesh) => Uint8Array.from({ length: m.indices.length / 3 }, (_, f) => (!smoothFace[m.parents[f]] && kinds[m.parents[f]] === 1 ? 1 : 0));
    const turn = 2 * Math.PI * layout.radius;
    let v = mesh.vertices;
    const U = Float64Array.from({ length: v.length / 3 }, (_, i) => aroundAngle(layout, v[i * 3 + i1], v[i * 3 + i2]) * layout.radius);
    const du = (i: number, j: number) => {
      const d = U[j] - U[i];
      return d - turn * Math.round(d / turn);
    };
    const across = WEAVE_STAKE_PLACES.flatMap((t) => [t * r, S - t * r]);
    let out = soundOr(mesh, sliceByField(mesh, U, du, S, across, sides(mesh)));
    v = out.vertices;
    const V = Float64Array.from({ length: v.length / 3 }, (_, i) => v[i * 3 + ax]);
    const along = [0, ...WEAVE_BAND_PLACES.flatMap((t) => [rowH * (0.5 - 0.5 * t), rowH * (0.5 + 0.5 * t)])];
    out = soundOr(out, sliceByField(out, V, (i, j) => V[j] - V[i], rowH, along, sides(out)));
    return out.indices.length / 3 > maxTriangles ? mesh : out;
  }

  /**
   * Carbon round the axis cut along its bands (see carbon): upright at places across the edges of the upright bands, level
   * at the same places of the crossing bands - where a band falls off to the gap beside it. Over the grid's diagonals the
   * gaps came out in a sawtooth. Only on the sides round the axis, as a weave's cuts.
   */
  function carbonCuts(mesh: SurfaceMesh, s: SurfaceTextureSettings, layout: SurfaceTextureLayout, maxTriangles: number, smoothFace: Uint8Array) {
    const ax = AXIS_INDEX[s.axis];
    const [i1, i2] = acrossAxes(s.axis);
    const Su = layout.cell, Sv = carbonCrossWidth(s, layout);
    const w = clamp(s.width, 0.1, 1);
    const kinds = baseFaceKinds(ax);
    const sides = (m: SurfaceMesh) => Uint8Array.from({ length: m.indices.length / 3 }, (_, f) => (!smoothFace[m.parents[f]] && kinds[m.parents[f]] === 1 ? 1 : 0));
    // Both edges of a band, its middle half a spacing in; at full width the two outermost meet in the gap, once.
    const places = (S: number) => {
      const half = CARBON_PLACES.map((t) => ((CARBON_FLAT + t * (1 - CARBON_FLAT)) * w * S) / 2);
      return [...new Set(half.flatMap((h) => [S / 2 - h, S / 2 + h]).map((x) => Number((x % S).toFixed(6))))];
    };
    const turn = 2 * Math.PI * layout.radius;
    let v = mesh.vertices;
    const U = Float64Array.from({ length: v.length / 3 }, (_, i) => aroundAngle(layout, v[i * 3 + i1], v[i * 3 + i2]) * layout.radius);
    const du = (i: number, j: number) => {
      const d = U[j] - U[i];
      return d - turn * Math.round(d / turn);
    };
    let out = soundOr(mesh, sliceByField(mesh, U, du, Su, places(Su), sides(mesh)));
    v = out.vertices;
    const V = Float64Array.from({ length: v.length / 3 }, (_, i) => v[i * 3 + ax]);
    out = soundOr(out, sliceByField(out, V, (i, j) => V[j] - V[i], Sv, places(Sv), sides(out)));
    return out.indices.length / 3 > maxTriangles ? mesh : out;
  }

  /**
   * A pattern standing out round an angular body's outline bends round its corners in an arc (see edgeRounding), over
   * `reach` either side of each: cut upright at its steps there, so the arc is made of strips along the corner. Over the
   * grid's diagonals it came out as a column of teeth down every corner.
   */
  function cornerCuts(mesh: SurfaceMesh, s: SurfaceTextureSettings, layout: SurfaceTextureLayout, maxTriangles: number, smoothFace: Uint8Array) {
    const ax = AXIS_INDEX[s.axis];
    const [i1, i2] = acrossAxes(s.axis);
    const kinds = baseFaceKinds(ax);
    const turn = 2 * Math.PI * layout.radius;
    const around = (a: number, b: number) => {
      const u = aroundAngle(layout, a, b) * layout.radius;
      return u - turn * Math.floor(u / turn);
    };
    const levels: number[] = [];
    for (const c of layout.outline?.corners ?? []) {
      const reach = Math.min(c.reach, Math.max(1, s.depth));
      for (const away of [[c.before[1], -c.before[0]], [-c.after[1], c.after[0]]]) {
        for (let k = 1; k <= CORNER_STEPS; k += 1) levels.push(around(c.at[0] + ((k * reach) / CORNER_STEPS) * away[0], c.at[1] + ((k * reach) / CORNER_STEPS) * away[1]));
      }
    }
    if (!levels.length) return mesh;
    const v = mesh.vertices;
    const U = Float64Array.from({ length: v.length / 3 }, (_, i) => around(v[i * 3 + i1], v[i * 3 + i2]));
    const du = (i: number, j: number) => {
      const d = U[j] - U[i];
      return d - turn * Math.round(d / turn);
    };
    const sliced = Uint8Array.from({ length: mesh.indices.length / 3 }, (_, f) => (!smoothFace[mesh.parents[f]] && kinds[mesh.parents[f]] === 1 ? 1 : 0));
    const out = soundOr(mesh, sliceByField(mesh, U, du, turn, levels, sliced));
    return out.indices.length / 3 > maxTriangles ? mesh : out;
  }

  /** Points of the mesh lying on side faces round the axis only (not on a top or bottom too). */
  function sidePointsFor(mesh: SurfaceMesh, ax: number) {
    return pointKindsFor(mesh, ax).map((k) => (k === 1 ? 1 : 0));
  }
  let crackIndex: CrackSurfaceIndex | null = null;
  let crackCache: { key: string; net: CrackNetwork } | null = null;

  /**
   * The cracks' lines on the body (see surfaceTextureCracks.ts). A crack grows only over faces that can get the pattern:
   * not over the bottom or the top kept smooth, a wall switched off, outside the height band or in a mask.
   */
  function crackLines(s: SurfaceTextureSettings, layout: SurfaceTextureLayout, maskFree: ((x: number, y: number, z: number) => boolean) | null) {
    const ax = AXIS_INDEX[s.axis];
    const [i1, i2] = acrossAxes(s.axis);
    const key = JSON.stringify([s.crackStyle, s.crackStart, s.crackCount, s.crackLength, s.crackWidth, s.crackBranch, s.crackJag, s.crackRough, s.crackSeed, s.axis,
      s.bottomFree, s.topFree, s.inside, s.outside, s.zoneFrom, s.zoneTo, s.masks, s.faces, layout.center]);
    if (crackCache?.key === key) return crackCache.net;
    crackIndex ??= surfaceIndex(base);
    const N = crackIndex.normals;
    const v = base.vertices;
    const cosBottom = Math.cos((s.bottomFree * Math.PI) / 180), cosTop = Math.cos((s.topFree * Math.PI) / 180);
    const zFrom = base.min[2] + (s.zoneFrom / 100) * (base.size[2] || 1), zTo = base.min[2] + (s.zoneTo / 100) * (base.size[2] || 1);
    const chosen = chosenFaces(s);
    const allowed = (t: number, q: number[]) => {
      const nz = N[t * 3 + 2];
      if (chosen) {
        if (!chosen[t]) return false;
      } else if ((s.bottomFree > 0 && -nz >= cosBottom) || (s.topFree > 0 && nz >= cosTop)) return false;
      if (q[2] < zFrom - 1e-9 || q[2] > zTo + 1e-9) return false;
      if ((!s.outside || !s.inside) && Math.hypot(N[t * 3 + i1], N[t * 3 + i2]) >= 0.5) {
        const r1 = q[i1] - layout.center[0], r2 = q[i2] - layout.center[1];
        const rl = Math.hypot(r1, r2);
        const isInside = rl > 1e-9 && (N[t * 3 + i1] * r1 + N[t * 3 + i2] * r2) / rl < -0.3;
        if (isInside ? !s.inside : !s.outside) return false;
      }
      return !(maskFree && maskFree(q[0], q[1], q[2]));
    };
    let maxRadius = 0;
    for (let i = 0; i < v.length; i += 3) maxRadius = Math.max(maxRadius, Math.hypot(v[i + i1] - layout.center[0], v[i + i2] - layout.center[1]));
    const settings = {
      style: s.crackStyle,
      start: s.crackStart,
      count: s.crackCount,
      length: s.crackLength,
      width: s.crackWidth,
      branch: s.crackBranch,
      jag: s.crackJag,
      rough: s.crackRough,
      seed: s.crackSeed,
    };
    const net = crackNetwork(base, settings, { index: crackIndex, axis: ax, center: layout.center, lo: base.min[ax], hi: base.max[ax], maxRadius: maxRadius || 1, allowed });
    crackCache = { key, net };
    return net;
  }

  /**
   * Where a text is stuck on: a ray from far out, `textAround` degrees round the axis (0 the front, 90 the right; lying
   * along x or y, 0 the top) and `textHeight` % up it, towards the axis - the first face it meets is the middle of the
   * text. The window round the text gets a margin: the unrolling and the finer grid reach a little beyond the letters.
   */
  function textPlacement(s: SurfaceTextureSettings, layout: SurfaceTextureLayout): SurfaceTextPlacement | null {
    const box = outlineBox(s.textOutline);
    if (!box) return null;
    const ax = AXIS_INDEX[s.axis];
    const [i1, i2] = acrossAxes(s.axis);
    const [front, right] = TEXT_FRONT[s.axis];
    const a = (s.textAround * Math.PI) / 180;
    const dir = front.map((f, k) => Math.cos(a) * f + Math.sin(a) * right[k]);
    const middle = [0, 0, 0];
    middle[ax] = base.min[ax] + clamp(s.textHeight / 100, 0.001, 0.999) * base.size[ax];
    middle[i1] = layout.center[0];
    middle[i2] = layout.center[1];
    const far = Math.hypot(...base.size) + 10;
    const hit = firstHit(base, middle.map((m, k) => m + dir[k] * far), dir.map((d) => -d)) ?? nearestSurfacePoint(base, middle.map((m, k) => m + dir[k] * layout.rMax));
    if (!hit) return null;
    const width = box.maxX - box.minX, height = box.maxY - box.minY;
    const margin = Math.max(0.05 * Math.max(width, height), 1) + 1;
    const halfW = width / 2 + margin, halfH = height / 2 + margin;
    return { point: hit.point, face: hit.face, width, height, halfW, halfH, reach: Math.hypot(halfW, halfH) + 0.5 };
  }

  /**
   * Unroll the surface round a text's anchor, only in its window (see surfaceTextureUnfold.ts). The face under the anchor is
   * looked for anew in a refined mesh: its triangles are numbered differently.
   */
  function unrolled(mesh: { vertices: Float64Array; indices: Uint32Array }, place: SurfaceTextPlacement, s: SurfaceTextureSettings, face = -1) {
    return unfoldSurface(mesh, place.point, { axis: s.axis, face, reach: place.reach, window: { halfW: place.halfW, halfH: place.halfH, turn: s.textTurn } });
  }

  /**
   * Input points that surely stay smooth after the layout: inside or outside walls, top, bottom, as
   * set. They need no fine grid. Decided per face first, and a point is smooth only when all its
   * faces are - a point on the rim belongs to the wall too and needs the grid there. The decision
   * per face comes along (`faces`): cut into groove strips, a bottom stays whole.
   */
  function smoothBaseVertices(s: SurfaceTextureSettings, layout: SurfaceTextureLayout) {
    const v = base.vertices;
    const I = base.indices;
    const cosBottom = Math.cos((s.bottomFree * Math.PI) / 180);
    const cosTop = Math.cos((s.topFree * Math.PI) / 180);
    const [i1, i2] = acrossAxes(s.axis);
    const points = new Uint8Array(v.length / 3).fill(1);
    const faces = new Uint8Array(I.length / 3);
    const chosen = chosenFaces(s);
    for (let t = 0; t < I.length; t += 3) {
      const [x, y, z] = faceCross(v, I[t], I[t + 1], I[t + 2]);
      const l = Math.hypot(x, y, z);
      if (l === 0) continue;
      const fn = [x / l, y / l, z / l];
      let smooth = false;
      // Picked faces go before the top and bottom kept smooth and the walls.
      if (chosen) smooth = !chosen[t / 3];
      else if (s.bottomFree > 0 && -fn[2] >= cosBottom) smooth = true;
      else if (s.topFree > 0 && fn[2] >= cosTop) smooth = true;
      else if ((!s.outside || !s.inside) && Math.hypot(fn[i1], fn[i2]) >= 0.5) {
        const cx = (v[I[t] * 3 + i1] + v[I[t + 1] * 3 + i1] + v[I[t + 2] * 3 + i1]) / 3 - layout.center[0];
        const cy = (v[I[t] * 3 + i2] + v[I[t + 1] * 3 + i2] + v[I[t + 2] * 3 + i2]) / 3 - layout.center[1];
        const rl = Math.hypot(cx, cy);
        const isInside = rl > 1e-9 && (fn[i1] * cx + fn[i2] * cy) / rl < -0.3;
        smooth = isInside ? !s.inside : !s.outside;
      }
      if (smooth) faces[t / 3] = 1;
      else for (let k = 0; k < 3; k += 1) points[I[t + k]] = 0;
    }
    return { points, faces };
  }

  /**
   * The rims of the top and bottom that get the pattern, round the side's ends (see SurfaceRim): flat faces across the
   * axis at the body's ends, not kept smooth - and only when a side gets it too. Their pattern bends round the edge as
   * far as its depth, at least 1 mm, at most half the body's height.
   */
  function capRims(s: SurfaceTextureSettings, layout: SurfaceTextureLayout): SurfaceRim[] {
    const ax = AXIS_INDEX[s.axis];
    const [i1, i2] = acrossAxes(s.axis);
    const v = base.vertices, I = base.indices;
    const chosen = chosenFaces(s);
    const smooth = chosen ? null : smoothBaseVertices(s, layout).faces;
    const reach = Math.min(Math.max(1, s.depth), base.size[ax] / 2);
    const rims: SurfaceRim[] = [];
    const kinds = baseFaceKinds(ax);
    if (!kinds.some((k, f) => k === 1 && (chosen ? chosen[f] : !smooth![f]))) return rims;
    for (const sign of [1, -1] as const) {
      const level = sign > 0 ? base.max[ax] : base.min[ax];
      let radius = 0, found = false;
      for (let f = 0; f < I.length / 3; f += 1) {
        if (chosen ? !chosen[f] : smooth![f]) continue;
        const n = faceCross(v, I[f * 3], I[f * 3 + 1], I[f * 3 + 2]);
        if (n[ax] * sign < 0.99 * Math.hypot(n[0], n[1], n[2])) continue;
        const corners = [I[f * 3], I[f * 3 + 1], I[f * 3 + 2]];
        if (corners.some((i) => Math.abs(v[i * 3 + ax] - level) > RIM_LEVEL)) continue;
        found = true;
        for (const i of corners) radius = Math.max(radius, Math.hypot(v[i * 3 + i1] - layout.center[0], v[i * 3 + i2] - layout.center[1]));
      }
      if (found) rims.push({ level, sign, radius, reach });
    }
    return rims;
  }

  /** Area (mm²) of the input triangles that can get the pattern (a point not surely smooth). */
  function texturableArea(smooth: Uint8Array) {
    const I = base.indices;
    let area = 0;
    for (let t = 0; t < I.length; t += 3) {
      if (smooth[I[t]] && smooth[I[t + 1]] && smooth[I[t + 2]]) continue;
      area += Math.hypot(...faceCross(base.vertices, I[t], I[t + 1], I[t + 2])) / 2;
    }
    return area;
  }

  function withNormals(key: string, mesh: SurfaceMesh, edge: number, crossMax: number, limited: boolean, slice: RefinedState["slice"], edgeAngle: number): RefinedState {
    const { normals, crease, down, up } = normalsAndCreases(mesh.vertices, mesh.indices, edgeAngle, base, mesh.parents);
    const directions = interpolatedNormals(base, mesh, edgeAngle);
    const moves = creaseMoves(base, mesh, directions, edgeAngle);
    return { key, mesh, normals, directions, moves, crease, down, up, adj: adjacency(mesh.vertices.length / 3, mesh.indices), edge, crossMax, limited, slice };
  }

  /** Refine for the pattern (see the top of this file). `scale` > 1 makes a preview coarser. */
  function refined(s: SurfaceTextureSettings, layout: SurfaceTextureLayout, maxTriangles: number, scale: number): RefinedState {
    const slice = stripesAreCut(s);
    const smooth = smoothBaseVertices(s, layout);
    // All round on straight faces (a box's sides): cut per axis as flat, the rest refined as before.
    const striped = s.pattern === "grooves" || s.pattern === "knurl";
    const cutsFlat = striped || CELL_PATTERNS.includes(s.pattern);
    // Around a cylinder, a picked top or bottom lies flat (see SurfaceTextureLayout.flatCaps): cut like a straight face.
    const caps = layout.flatCaps ? capFaces(base, smooth.faces, AXIS_INDEX[s.axis]) : null;
    const straight = s.projection === "allRound" && cutsFlat ? straightFaces(base, smooth.faces) : cutsFlat ? caps : null;
    // Faces the pattern is not cut into round the axis: those staying smooth and the flat top and bottom.
    const roundSkip = caps ? Uint8Array.from(smooth.faces, (sm, f) => (sm || caps[f] !== 255 ? 1 : 0)) : smooth.faces;
    // Each axis' straight faces as flat ones: turned (faceTurn) only on those seen along the body's axis.
    const axisSettings = (k: number): SurfaceTextureSettings => ({ ...s, projection: "flat", axis: SURFACE_TEXTURE_AXES[k], faceTurn: k === AXIS_INDEX[s.axis] ? s.faceTurn : 0 });
    const notOnAxis = (k: number) => Uint8Array.from(smooth.faces, (sm, f) => (sm || straight![f] !== k ? 1 : 0));
    let edge: number;
    // Grooves: the finest step across, for refining where the pattern fades in (see refineTransitions).
    let crossMax = 0;
    let raised = false;
    const cracks = s.pattern === "cracks";
    const text = s.pattern === "text";
    if (cracks) {
      // Cracks: the body's own grid, refined only in the band round the lines (below).
      edge = Math.max(0.06, s.crackWidth / 2 / CRACK_STEPS[s.detail]) * scale;
    } else if (text) {
      // Text: the body's own grid, refined only in the window round the letters (below).
      edge = Math.max(0.05, (layout.text?.height ?? s.textSize) / TEXT_STEPS[s.detail]) * scale;
    } else if (slice) {
      // Across: the places of the profile, while cutting. Along, the pattern does not change, and the body's roundness is in
      // its own rows already - at most 6 mm (a 6 mm chord on 80 mm radius strays 0.06 mm), so refining where the pattern
      // fades in does not run over huge triangles either.
      crossMax = (layout.period * clamp(s.width, 0.2, 1)) / CROSS_STEPS[s.detail];
      edge = 6 * scale;
    } else {
      edge = Math.min(targetEdge(s), 10) * scale;
      // Estimate first and rather get coarser than stop at the budget. Smooth faces stay coarse and do not count.
      const minEdge = Math.sqrt(texturableArea(smooth.points) / (0.15 * maxTriangles));
      raised = edge < minEdge;
      if (raised) edge = minEdge;
      if (s.pattern === "image") layout.image = textureImage(s, edge, layout.cell);
    }
    let smoothKey = 2166136261;
    for (let i = 0; i < smooth.points.length; i += 1) smoothKey = Math.imul(smoothKey ^ smooth.points[i] ^ (i & 0xff), 16777619);
    const layoutKey = cracks
      ? JSON.stringify([s.pattern, crackCache?.key ?? null])
      : text
        ? JSON.stringify([s.pattern, layout.text ? [layout.text.point, layout.text.face] : null, s.axis, s.textTurn, outlineKey(s.textOutline)])
        : JSON.stringify([s.pattern, s.spacing, s.width, s.profile, s.projection, s.axis, layout.cell, layout.period, layout.angle, layout.radius, layout.center, s.faceTurn, Boolean(layout.flatCaps), s.capStyle, layout.capEdge ?? null, layout.rims ?? null, patternExtras(s, layout)]);
    // A raised pattern round an outline's corners is cut along arcs as deep as the pattern stands out (cornerCuts).
    const cornerReach = s.projection === "cylinder" && layout.outline?.corners.length && standsOut(s) ? Math.max(1, s.depth) : 0;
    const key = `${edge.toFixed(5)}|${smoothKey}|${JSON.stringify(s.faces)}|${maxTriangles}|${s.edgeAngle}|${s.detail}|${scale}|${cornerReach}|${layoutKey}`;
    if (cache?.key === key) return cache;
    let mesh: SurfaceMesh;
    const net = layout.crack;
    const place = layout.text;
    let unrolledText: RefinedState["text"] = null;
    if (text) {
      mesh = baseMesh(base);
      if (place) {
        // Only where the window reaches, not the inner wall of a thin vase behind it: an edge at a point of the body
        // the window does not reach is not split (new points come from edges split already, so they belong to it).
        // Not split at either end, as with smooth points: an edge never split while its neighbours are would pull
        // them into slivers.
        const first = unrolled(base, place, s, place.face);
        const nBase = base.vertices.length / 3;
        // Estimate first: the circle round the window over a triangle's area; too many - coarser.
        const budget = Math.max(1, maxTriangles - mesh.indices.length / 3);
        const estimate = (1.6 * Math.PI * place.reach ** 2) / (0.433 * edge * edge);
        if (estimate > budget) {
          edge *= Math.sqrt(estimate / budget);
          raised = true;
        }
        const [px, py, pz] = place.point;
        const reach2 = place.reach ** 2;
        // Asked the same way from both triangles of an edge, or they would split it differently.
        const near = (verts: ArrayLike<number>, p: number, q: number) => {
          const a = Math.min(p, q), b = Math.max(p, q);
          if ((a < nBase && !Number.isFinite(first.U[a])) || (b < nBase && !Number.isFinite(first.U[b]))) return false;
          const ox = verts[a * 3] - px, oy = verts[a * 3 + 1] - py, oz = verts[a * 3 + 2] - pz;
          const dx = verts[b * 3] - verts[a * 3], dy = verts[b * 3 + 1] - verts[a * 3 + 1], dz = verts[b * 3 + 2] - verts[a * 3 + 2];
          const l2 = dx * dx + dy * dy + dz * dz;
          const t = l2 > 0 ? clamp(-(ox * dx + oy * dy + oz * dz) / l2, 0, 1) : 0;
          return (ox + t * dx) ** 2 + (oy + t * dy) ** 2 + (oz + t * dz) ** 2 <= reach2;
        };
        const split = subdivide(mesh, edge, maxTriangles, null, null, near);
        mesh = { ...split, parents: Uint32Array.from(split.parents, (f) => mesh.parents[f]) };
        // The letters' edges: finer where an edge crosses a letter's wall (as at the flanks of bumps), unrolled anew each
        // round. The distance is exact up to `cap`, beyond the longest edge crossing a wall.
        const fineEdge = edge / 2.5;
        const fine2 = (fineEdge * 1.01) ** 2;
        const cap = Math.max(1.5 * edge, 4 * TEXT_WALL);
        const crosses = (F: Float64Array, a: number, b: number) => (F[a] < TEXT_WALL) !== (F[b] < TEXT_WALL) || (F[a] > -TEXT_WALL) !== (F[b] > -TEXT_WALL);
        let uv = unrolled(mesh, place, s);
        for (let round = 0; round < FLANK_ROUNDS && !mesh.limited; round += 1) {
          const F = textField(uv.U, uv.V, s.textOutline, s.textTurn, cap);
          const v = mesh.vertices, I = mesh.indices;
          const flags = new Uint8Array(v.length / 3);
          let any = false;
          for (let t = 0; t < I.length; t += 3) {
            for (const [a, b] of [[I[t], I[t + 1]], [I[t + 1], I[t + 2]], [I[t + 2], I[t]]]) {
              if (!crosses(F, a, b)) continue;
              const dx = v[a * 3] - v[b * 3], dy = v[a * 3 + 1] - v[b * 3 + 1], dz = v[a * 3 + 2] - v[b * 3 + 2];
              if (dx * dx + dy * dy + dz * dz <= fine2) continue;
              flags[a] = 1;
              flags[b] = 1;
              any = true;
            }
          }
          if (!any) break;
          const next = subdivide(mesh, fineEdge, maxTriangles, null, flags);
          if (next.indices.length === mesh.indices.length) break;
          const parents = Uint32Array.from(next.parents, (f) => mesh.parents[f]);
          mesh = { vertices: next.vertices, indices: next.indices, parents, limited: Boolean(mesh.limited || next.limited) };
          uv = unrolled(mesh, place, s);
        }
        // Then cut along both sides of every wall: the letters' edges become edges of the mesh, following the outlines
        // instead of the grid (on the grid they came out as steps). Between the cuts the wall rises; points carry the
        // distance they were cut at.
        const F = textField(uv.U, uv.V, s.textOutline, s.textTurn, cap);
        const I = mesh.indices;
        const sliced = new Uint8Array(I.length / 3);
        for (let f = 0; f < sliced.length; f += 1) {
          const a = F[I[f * 3]], b = F[I[f * 3 + 1]], c = F[I[f * 3 + 2]];
          if (Math.min(a, b, c) <= TEXT_WALL && Math.max(a, b, c) >= -TEXT_WALL) sliced[f] = 1;
        }
        const cut = sliceByField(mesh, F, (i, j) => F[j] - F[i], 1e6, [-TEXT_WALL, TEXT_WALL], sliced, null, true);
        const field = cut.field ?? F;
        // A point closer to a cut than SURFACE_MIN_EDGE is not cut beside but counts as on it: it gets the cut's depth
        // too, or it pulled a little tooth into the letter's edge.
        const slope = 2 * (TEXT_WALL - SURFACE_MIN_EDGE);
        const values = new Float32Array(field.length);
        for (let i = 0; i < field.length; i += 1) values[i] = clamp(0.5 - field[i] / slope, 0, 1);
        mesh = { vertices: cut.vertices, indices: cut.indices, parents: cut.parents, limited: mesh.limited };
        unrolledText = { values, torn: uv.torn };
      }
    } else if (cracks) {
      mesh = baseMesh(base);
      if (net && net.count) {
        // Estimate first: the band (length × width and the margin) over a triangle's area; too many - coarser.
        const band = net.length * 2 * (net.maxHw + edge);
        const budget = Math.max(1, maxTriangles - mesh.indices.length / 3);
        const estimate = (1.6 * band) / (0.433 * edge * edge);
        if (estimate > budget) {
          edge *= Math.sqrt(estimate / budget);
          raised = true;
        }
        // Each edge is asked once: edges not split come back in every pass.
        const memo = new Map<number, boolean>();
        const near = (verts: ArrayLike<number>, a: number, b: number) => {
          const k = a < b ? a * 67108864 + b : b * 67108864 + a;
          let hit = memo.get(k);
          if (hit === undefined) {
            hit = crackEdgeNear(net, verts, a, b, edge);
            memo.set(k, hit);
          }
          return hit;
        };
        const split = subdivide(mesh, edge, maxTriangles, null, null, near);
        mesh = { ...split, parents: Uint32Array.from(split.parents, (f) => mesh.parents[f]) };
      }
    } else if (slice) {
      // Along first, coarse (only triangles reaching further than `edge`, smooth faces not), at contour lines rather than by
      // halving edges: the middles of diagonals would lie on chords inside the roundness. Then across.
      const F0 = stripeFields(base, s, layout);
      const I = base.indices;
      const alongSliced = new Uint8Array(I.length / 3);
      for (let t = 0; t < I.length; t += 3) {
        const a = I[t], b = I[t + 1], c = I[t + 2];
        if (roundSkip[t / 3] || F0.pole[a] || F0.pole[b] || F0.pole[c]) continue;
        const reach = Math.max(Math.abs(F0.alongDiff(a, b)), Math.abs(F0.alongDiff(b, c)), Math.abs(F0.alongDiff(c, a)));
        if (reach > edge) alongSliced[t / 3] = 1;
      }
      const coarse = sliceByField(baseMesh(base), F0.along, F0.alongDiff, edge, [0], alongSliced, F0.crossDiff);
      // A round profile gets half the places across per flank; too many triangles: fewer, at least one.
      let steps = CROSS_STEPS[s.detail] / 2;
      for (;;) {
        mesh = sliceStripes(coarse, s, layout, steps, roundSkip);
        if (s.pattern === "knurl") {
          mesh = sliceStripes(mesh, s, { ...layout, angle: -layout.angle }, steps, roundSkip, layout);
          mesh = sliceKnurlCrease(mesh, s, layout, roundSkip);
        }
        if (mesh.indices.length / 3 <= maxTriangles || s.profile !== "round" || steps <= 1) break;
        steps = Math.max(1, Math.floor(steps / 2));
        crossMax = (layout.period * clamp(s.width, 0.2, 1)) / (2 * steps);
        raised = true;
      }
      mesh.limited = mesh.indices.length / 3 > maxTriangles;
    } else {
      // Honeycomb is cut along its joints afterwards and bumps get their flanks refined: they leave half the budget for that.
      const budget = Math.floor(maxTriangles / 2);
      // A flat top or bottom round the axis that is not cut: refined in the plane with flips (see refinePlanar), not
      // by halving the strips CAD gives it in.
      const capFree = caps && !straight ? Uint8Array.from(caps, (k) => (k === 255 ? 0 : 1)) : null;
      let start = capFree && hasNeedles(baseMesh(base), capFree) ? refinePlanar(baseMesh(base), capFree, edge, budget) : baseMesh(base);
      // Rope in rings: cut along the joints between them, or the notch frayed over the grid.
      if (caps && s.pattern === "rope") start = capRingCuts(start, s, layout, s.spacing, [0], Uint8Array.from(caps, (k) => (k === 255 ? 1 : 0)), budget, smooth.faces);
      // Bark's side round a cylinder in long strips: cut across first (see cutStrips). Not yet the other patterns': halving
      // the strips gave them a grid finer than asked for along the axis, and a weave's strands lost their straight edges
      // on the even one.
      if (s.pattern === "bark" && s.projection === "cylinder" && !layout.outline) start = cutStrips(start, s, layout, edge, smooth.faces);
      // Grooves and bricks on straight faces are cut, not refined: points only on such faces (or smooth ones) stay as they are.
      let keep = smooth.points;
      if (straight && (striped || s.pattern === "bricks")) {
        const other = new Uint8Array(smooth.points.length);
        for (let f = 0; f < straight.length; f += 1) {
          if (straight[f] !== 255 || smooth.faces[f]) continue;
          for (let k = 0; k < 3; k += 1) other[base.indices[f * 3 + k]] = 1;
        }
        keep = Uint8Array.from(smooth.points, (sm, i) => (sm || !other[i] ? 1 : 0));
      }
      // Points made on a flat top are not smooth.
      if (keep.length < start.vertices.length / 3) {
        const longer = new Uint8Array(start.vertices.length / 3);
        longer.set(keep);
        keep = longer;
      }
      const even = (e: number): SurfaceMesh => {
        const split = subdivide(start, e, budget, keep);
        return { ...split, parents: Uint32Array.from(split.parents, (f) => start.parents[f]) };
      };
      mesh = even(edge);
      // Halving takes up to four times the triangles in one pass: when the budget stopped it half way, the grid would be
      // uneven and the pattern neither cut nor refined. Rather a little coarser all over.
      for (let tries = 0; mesh.limited && tries < 8; tries += 1) {
        edge *= 1.25;
        raised = true;
        mesh = even(edge);
      }
      // Carefully coarser but far under the budget: once more, finer.
      const goal = 0.6 * budget;
      if (raised && !mesh.limited && mesh.indices.length / 3 < 0.7 * goal) {
        const f = Math.sqrt(mesh.indices.length / 3 / goal);
        const again = even(edge * f);
        if (!again.limited) {
          mesh = again;
          edge *= f;
        }
      }
    }
    // Honeycomb and bumps (cylinder or flat): cut at cell borders and profile levels instead of refining the flanks. The
    // preview with half as many levels: each level cuts along the whole joint or round every bump.
    let cellSliced = false;
    let fixed: Float32Array | null = null;
    const cellSteps = () => {
      const full = s.pattern === "bumps" ? BUMP_RINGS[s.detail] : CROSS_STEPS[s.detail];
      return scale > 1 ? Math.ceil(full / 2) : full;
    };
    if (cellsAreCut(s) && !mesh.limited) {
      const cut = s.pattern === "bricks" ? sliceBricks(mesh, s, layout, cellSteps(), maxTriangles, roundSkip) : sliceCells(mesh, s, layout, cellSteps(), maxTriangles, roundSkip);
      if (cut.reduced) raised = true;
      fixed = cut.fixed ?? null;
      mesh = { ...cut.mesh, limited: Boolean(mesh.limited || cut.mesh.indices.length / 3 > maxTriangles) };
      cellSliced = true;
    }
    // All round on straight faces: each axis' faces cut as flat ones. Points keep their numbers from cut to cut, so the
    // bumps' values of one axis stay right after the next.
    let straightCut = false;
    /** Grooves and knurling on one axis' straight faces: cut along them coarsely, then across at the profile's places. */
    const cutRows = (from: SurfaceMesh, sk: SurfaceTextureSettings, skip: Uint8Array) => {
      crossMax = (layout.period * clamp(s.width, 0.2, 1)) / CROSS_STEPS[s.detail];
      const F0 = stripeFields(from, sk, layout);
      const I = from.indices;
      const alongSliced = new Uint8Array(I.length / 3);
      for (let t = 0; t < I.length; t += 3) {
        if (skip[from.parents[t / 3]]) continue;
        const a = I[t], b = I[t + 1], c = I[t + 2];
        if (Math.max(Math.abs(F0.alongDiff(a, b)), Math.abs(F0.alongDiff(b, c)), Math.abs(F0.alongDiff(c, a))) > 6 * scale) alongSliced[t / 3] = 1;
      }
      let cut: SurfaceMesh = sliceByField(from, F0.along, F0.alongDiff, 6 * scale, [0], alongSliced, F0.crossDiff);
      const steps = CROSS_STEPS[s.detail] / 2;
      cut = sliceStripes(cut, sk, layout, steps, skip);
      if (s.pattern === "knurl") {
        cut = sliceStripes(cut, sk, { ...layout, angle: -layout.angle }, steps, skip, layout);
        cut = sliceKnurlCrease(cut, sk, layout, skip);
      }
      return cut;
    };
    if (straight && !mesh.limited) {
      straightCut = true;
      for (let k = 0; k < 3; k += 1) {
        if (!straight.includes(k)) continue;
        const sk = axisSettings(k);
        const skip = notOnAxis(k);
        // A top or bottom with grooves in rings, or the side's grooves running over its rim: cut in rings (with rows inside
        // a band of them, as rows first).
        // A top or bottom: grooves in rows or rings of its own, and where the side's grooves run or fold over its rim,
        // those - as rings when they run level, else as rays.
        const onCap = striped && k === AXIS_INDEX[s.axis];
        const runs = onCap && (layout.capEdge === "over" || layout.capEdge === "fold");
        const rays = runs && !levelGrooves(s, layout);
        if (onCap) {
          crossMax = (layout.period * clamp(s.width, 0.2, 1)) / CROSS_STEPS[s.detail];
          if (layout.capEdge !== "over" && !ringsOnCaps(s, layout)) mesh = cutRows(mesh, sk, skip);
          if (rays) {
            if (layout.capEdge === "fold" && ringsOnCaps(s, layout)) mesh = sliceRings(mesh, sk, layout, layout.period, stripeOffsets(layout.period, s, CROSS_STEPS[s.detail] / 2), skip, maxTriangles);
            mesh = rayCuts(mesh, s, layout, maxTriangles, smooth.faces, skip);
          } else mesh = capRingCuts(mesh, sk, layout, layout.period, stripeOffsets(layout.period, s, CROSS_STEPS[s.detail] / 2), skip, maxTriangles, smooth.faces);
        } else if (striped) mesh = cutRows(mesh, sk, skip);
        else if (s.pattern === "bricks") {
          const cut = sliceBricks(mesh, sk, layout, cellSteps(), maxTriangles, skip);
          if (cut.reduced) raised = true;
          mesh = cut.mesh;
        } else {
          const cut = sliceCells(mesh, sk, layout, cellSteps(), maxTriangles, skip);
          if (cut.reduced) raised = true;
          if (cut.fixed) {
            const merged = new Float32Array(cut.fixed.length);
            for (let i = 0; i < merged.length; i += 1) merged[i] = Number.isNaN(cut.fixed[i]) && fixed && i < fixed.length ? fixed[i] : cut.fixed[i];
            fixed = merged;
          }
          mesh = cut.mesh;
        }
        mesh.limited = mesh.indices.length / 3 > maxTriangles;
        if (mesh.limited) break;
      }
    }
    // A border round the rims: cut along it (see beadCuts).
    if (layout.capEdge === "bead" && !mesh.limited && !cracks && !text) mesh = beadCuts(mesh, s, layout, maxTriangles, smooth.faces);
    // Not refined at the flanks: faces cut exactly already, and faces that stay smooth (the top of a box: its grid only
    // went finer and finer along the pattern's lines, and no point there moves).
    const cutFaces = straight ? Uint8Array.from(straight, (k, f) => (k === 255 && !smooth.faces[f] ? 0 : 1)) : smooth.faces;
    if (s.pattern === "weave" && s.projection === "cylinder" && !mesh.limited) mesh = weaveCuts(mesh, s, layout, maxTriangles, smooth.faces);
    if (s.pattern === "carbon" && s.projection === "cylinder" && !mesh.limited) mesh = carbonCuts(mesh, s, layout, maxTriangles, smooth.faces);
    if (s.projection === "cylinder" && layout.outline?.corners.length && standsOut(s) && !mesh.limited) mesh = cornerCuts(mesh, s, layout, maxTriangles, smooth.faces);
    if (!slice && !cracks && !text && !mesh.limited && !cellSliced) mesh = refineFlanks(mesh, s, layout, edge / 2.5, maxTriangles, cutFaces);
    // Cut even where the budget stopped refining (a long log): as long as the cuts still fit in (see barkLevelCuts).
    if (s.pattern === "bark") {
      const cut = barkLevelCuts(mesh, s, layout, BARK_BLUR * edge, maxTriangles, cutFaces);
      mesh = cut.mesh;
      fixed = cut.values;
    }
    // Only when they were cut: over the budget they were not.
    const straightAxis = straightCut ? straight : null;
    cache = { ...withNormals(key, mesh, edge, crossMax, raised || Boolean(mesh.limited), slice ? { smoothFace: smooth.faces } : null, s.edgeAngle), text: unrolledText, fixed, straightAxis };
    return cache;
  }

  /**
   * The long straight smooth edges of the flat faces cut along their pattern (see refineTransitions): input edges between
   * such a face and a face that stays smooth, or (sharp edges kept smooth) one bending away by more than the edge angle,
   * joined where they lie on one line. Each with the face's axis and its place along it, and from where to where along
   * the line through a and b it runs; none for a face with many of them (a round rim).
   */
  function borderLines(s: SurfaceTextureSettings, layout: SurfaceTextureLayout, axisOf: Uint8Array) {
    const v = base.vertices, I = base.indices;
    const smooth = smoothBaseVertices(s, layout).faces;
    const limit = Math.cos((s.edgeAngle * Math.PI) / 180);
    const unit = (f: number) => {
      const [x, y, z] = faceCross(v, I[f * 3], I[f * 3 + 1], I[f * 3 + 2]);
      const l = Math.hypot(x, y, z) || 1;
      return [x / l, y / l, z / l];
    };
    const byEdge = new Map<number, number[]>();
    for (let f = 0; f < I.length / 3; f += 1) {
      for (let k = 0; k < 3; k += 1) {
        const p = I[f * 3 + k], q = I[f * 3 + ((k + 1) % 3)];
        const key = Math.min(p, q) * 67108864 + Math.max(p, q);
        const list = byEdge.get(key);
        if (list) list.push(f);
        else byEdge.set(key, [f]);
      }
    }
    // Per flat face (axis and place along it), its smooth edges; edges on one line are one line, from - to along it.
    const planes = new Map<string, { axis: number; plane: number; a: number; b: number; from: number; to: number }[]>();
    const seen = new Set<string>();
    for (let f = 0; f < I.length / 3; f += 1) {
      const axis = axisOf[f];
      if (axis === 255) continue;
      const nf = unit(f);
      const ax = AXIS_INDEX[SURFACE_TEXTURE_AXES[axis]];
      const plane = v[I[f * 3] * 3 + ax];
      const planeKey = `${axis}|${plane.toFixed(6)}`;
      for (let k = 0; k < 3; k += 1) {
        const p = I[f * 3 + k], q = I[f * 3 + ((k + 1) % 3)];
        const others = (byEdge.get(Math.min(p, q) * 67108864 + Math.max(p, q)) ?? []).filter((g) => g !== f);
        const free = others.some((g) => {
          if (smooth[g]) return true;
          const ng = unit(g);
          return s.keepEdges && nf[0] * ng[0] + nf[1] * ng[1] + nf[2] * ng[2] < limit;
        });
        const key = `${planeKey}|${Math.min(p, q)}|${Math.max(p, q)}`;
        if (!free || seen.has(key)) continue;
        seen.add(key);
        let list = planes.get(planeKey);
        if (!list) planes.set(planeKey, (list = []));
        const dx = v[q * 3] - v[p * 3], dy = v[q * 3 + 1] - v[p * 3 + 1], dz = v[q * 3 + 2] - v[p * 3 + 2];
        const dl = Math.hypot(dx, dy, dz);
        if (dl === 0) continue;
        // On a line already found: it reaches further.
        const on = list.find((line) => {
          const ex = v[line.b * 3] - v[line.a * 3], ey = v[line.b * 3 + 1] - v[line.a * 3 + 1], ez = v[line.b * 3 + 2] - v[line.a * 3 + 2];
          const el = Math.hypot(ex, ey, ez);
          const distanceTo = (i: number) => {
            const px = v[i * 3] - v[line.a * 3], py = v[i * 3 + 1] - v[line.a * 3 + 1], pz = v[i * 3 + 2] - v[line.a * 3 + 2];
            return Math.hypot(py * ez - pz * ey, pz * ex - px * ez, px * ey - py * ex) / el;
          };
          return distanceTo(p) < 1e-6 && distanceTo(q) < 1e-6;
        });
        if (on) {
          const ex = v[on.b * 3] - v[on.a * 3], ey = v[on.b * 3 + 1] - v[on.a * 3 + 1], ez = v[on.b * 3 + 2] - v[on.a * 3 + 2];
          const el = Math.hypot(ex, ey, ez);
          const at = (i: number) => ((v[i * 3] - v[on.a * 3]) * ex + (v[i * 3 + 1] - v[on.a * 3 + 1]) * ey + (v[i * 3 + 2] - v[on.a * 3 + 2]) * ez) / el;
          on.from = Math.min(on.from, at(p), at(q));
          on.to = Math.max(on.to, at(p), at(q));
        } else list.push({ axis, plane, a: p, b: q, from: 0, to: dl });
      }
    }
    const lines: { axis: number; plane: number; a: number; b: number; from: number; to: number }[] = [];
    for (const list of planes.values()) {
      const long = list.filter((line) => line.to - line.from >= BORDER_LINE_MIN);
      if (long.length <= BORDER_LINES_MAX) lines.push(...long);
    }
    return lines;
  }

  /**
   * Refine more finely where the pattern fades in or out: points with 0 < weight < 1 and the
   * neighbours at the border. Grooves are cut along at contour lines (halving would also halve
   * across); otherwise edges at those points are split. The old state when there is nothing to do.
   */
  function refineTransitions(state: RefinedState, s: SurfaceTextureSettings, layout: SurfaceTextureLayout, w: Float32Array, distance: Float64Array | null, maxEdge: number, maxTriangles: number): RefinedState {
    const { mesh, adj } = state;
    const n = w.length;
    const flags = new Uint8Array(n);
    let any = false;
    for (let i = 0; i < n; i += 1) {
      let mark = w[i] > 0 && w[i] < 1;
      for (let e = adj.start[i]; !mark && w[i] === 0 && e < adj.start[i + 1]; e += 1) if (w[adj.nb[e]] > 0) mark = true;
      if (mark) {
        flags[i] = 1;
        any = true;
      }
    }
    if (!any) return state;
    let fine: SurfaceMesh;
    let cutMesh: SurfaceMesh = mesh;
    let pointFlags = flags;
    const axisOf = state.straightAxis;
    if (axisOf && distance) {
      // Straight faces cut along their pattern end at a border (see BORDER_WALL): cut along it and the foot of its wall.
      // Halving their long triangles cut across the grooves' profile, and the pattern ran out in teeth. First along the
      // distance to the nearest smooth place - right where it changes linearly over a triangle, as along a round rim.
      // Then each long straight smooth edge of a flat face on its own: the distance to one line is exactly linear on
      // the face. The nearest of several lines is not: over a long fan from a box's corner to its edge the border came
      // out in the wrong place, and the grooves ran up to the edge there.
      // A pattern standing out runs out up to the edge instead (see RUN_OUT_STEPS): cut where its run-out begins and ends.
      const reach = s.fade + s.margin;
      const wall = Math.min(BORDER_WALL, s.fade);
      const levels = standsOut(s) ? [s.margin, reach].filter((level) => level > 0) : wall > 0 ? [reach - wall, reach] : [reach];
      {
        const I = mesh.indices;
        const sliced = new Uint8Array(I.length / 3);
        let any = false;
        // Round the axis the side next to a flat top or bottom ends at the same border (see weightsFor): cut along it too.
        // Its triangles there (not halved, see below) ran from the rim far down, and the pattern ran out over them in
        // teeth and splinters. Faces staying smooth have no distance to cut at.
        const round = s.projection === "cylinder";
        for (let f = 0; f < sliced.length; f += 1) {
          if (axisOf[mesh.parents[f]] === 255 && !round) continue;
          if (Math.min(distance[I[f * 3]], distance[I[f * 3 + 1]], distance[I[f * 3 + 2]]) >= reach) continue;
          sliced[f] = 1;
          any = true;
        }
        if (any) {
          const known = reach + FADE_BEYOND;
          const field = Float64Array.from(distance, (d) => Math.min(d, known));
          cutMesh = sliceByField(mesh, field, (i, j) => field[j] - field[i], 1e6, levels, sliced);
        }
      }
      const bv = base.vertices;
      for (const { axis, plane, a, b, from, to } of borderLines(s, layout, axisOf)) {
        const ax = AXIS_INDEX[SURFACE_TEXTURE_AXES[axis]];
        const v = cutMesh.vertices, I = cutMesh.indices;
        const n0 = v.length / 3;
        // Distance to the line through a and b (input points), and the place along it.
        const dx = bv[b * 3] - bv[a * 3], dy = bv[b * 3 + 1] - bv[a * 3 + 1], dz = bv[b * 3 + 2] - bv[a * 3 + 2];
        const dl = Math.hypot(dx, dy, dz) || 1;
        const field = new Float64Array(n0);
        const along = new Float64Array(n0);
        for (let i = 0; i < n0; i += 1) {
          const px = v[i * 3] - bv[a * 3], py = v[i * 3 + 1] - bv[a * 3 + 1], pz = v[i * 3 + 2] - bv[a * 3 + 2];
          field[i] = Math.hypot(py * dz - pz * dy, pz * dx - px * dz, px * dy - py * dx) / dl;
          along[i] = (px * dx + py * dy + pz * dz) / dl;
        }
        const sliced = new Uint8Array(I.length / 3);
        let any = false;
        for (let f = 0; f < sliced.length; f += 1) {
          if (axisOf[cutMesh.parents[f]] !== axis || Math.abs(v[I[f * 3] * 3 + ax] - plane) > 1e-6) continue;
          const c = [I[f * 3], I[f * 3 + 1], I[f * 3 + 2]];
          if (Math.min(field[c[0]], field[c[1]], field[c[2]]) >= reach) continue;
          // Only by the edge itself, not along its line beyond its ends.
          if (Math.max(along[c[0]], along[c[1]], along[c[2]]) < from - reach || Math.min(along[c[0]], along[c[1]], along[c[2]]) > to + reach) continue;
          sliced[f] = 1;
          any = true;
        }
        if (any) cutMesh = sliceByField(cutMesh, field, (i, j) => field[j] - field[i], 1e6, levels, sliced);
      }
      if (cutMesh.indices.length / 3 > maxTriangles) cutMesh.limited = true;
      // The other faces are split as before, but not at a point of a straight face: its edges into the cut band would
      // be halved across the pattern again (a smooth bottom shares the box's edge with the face above it).
      const onCut = new Uint8Array(cutMesh.vertices.length / 3);
      const J = cutMesh.indices;
      for (let f = 0; f < J.length / 3; f += 1) {
        if (axisOf[cutMesh.parents[f]] === 255) continue;
        onCut[J[f * 3]] = 1;
        onCut[J[f * 3 + 1]] = 1;
        onCut[J[f * 3 + 2]] = 1;
      }
      pointFlags = new Uint8Array(onCut.length);
      for (let i = 0; i < flags.length; i += 1) pointFlags[i] = flags[i] && !onCut[i] ? 1 : 0;
    } else if (distance && (endsInWall(s) || (s.projection === "cylinder" && standsOut(s)))) {
      // Round the axis the grooves end at a border with a wall too (see endsInWall): cut along it and the foot of the wall,
      // on the faces that get the pattern (the distance to a rim changes linearly over a triangle there). A pattern
      // standing out runs out up to the rim (see RUN_OUT_STEPS): cut at its steps.
      const reach = s.fade + s.margin;
      const wall = Math.min(BORDER_WALL, s.fade);
      const levels = standsOut(s) ? Array.from({ length: RUN_OUT_STEPS }, (_, k) => s.margin + ((k + 1) * s.fade) / RUN_OUT_STEPS) : wall > 0 ? [reach - wall, reach] : [reach];
      const I = mesh.indices;
      const sliced = new Uint8Array(I.length / 3);
      let any = false;
      for (let f = 0; f < sliced.length; f += 1) {
        if (state.slice?.smoothFace[mesh.parents[f]]) continue;
        if (Math.min(distance[I[f * 3]], distance[I[f * 3 + 1]], distance[I[f * 3 + 2]]) >= reach) continue;
        sliced[f] = 1;
        any = true;
      }
      if (any) {
        const known = reach + FADE_BEYOND;
        const field = Float64Array.from(distance, (d) => Math.min(d, known));
        cutMesh = sliceByField(mesh, field, (i, j) => field[j] - field[i], 1e6, levels, sliced);
        if (cutMesh.indices.length / 3 > maxTriangles) cutMesh.limited = true;
        // Cut exactly, not halved as well: halving the band's triangles round the side made teeth along a wall's top and
        // a run-out's rim. On a top or bottom a run-out is still halved (the points on its cuts too): its cuts follow the
        // rim in long steps there, and rope frayed along it.
        if (!state.slice) {
          const kinds = standsOut(s) ? pointKindsFor(cutMesh, AXIS_INDEX[s.axis]) : null;
          pointFlags = Uint8Array.from({ length: cutMesh.vertices.length / 3 }, (_, i) => (kinds && kinds[i] === 2 && (i >= flags.length || flags[i]) ? 1 : 0));
        }
      }
    }
    if (state.slice) {
      // Round the axis (straight faces lying flat are cut above).
      const F = stripeFields(cutMesh, s, layout);
      const I = cutMesh.indices;
      const sliced = new Uint8Array(I.length / 3);
      for (let f = 0; f < sliced.length; f += 1) {
        if (!(flags[I[f * 3]] || flags[I[f * 3 + 1]] || flags[I[f * 3 + 2]])) continue;
        // Smooth faces (bottom, top) and triangles at the axis only as neighbours: they take in the points on the rim.
        const parent = cutMesh.parents[f];
        if (state.slice.smoothFace[parent] || (axisOf && axisOf[parent] !== 255) || F.pole[I[f * 3]] || F.pole[I[f * 3 + 1]] || F.pole[I[f * 3 + 2]]) continue;
        sliced[f] = 1;
      }
      // Cutting passes the input triangles through.
      fine = sliceByField(cutMesh, F.along, F.alongDiff, maxEdge, [0], sliced, F.crossDiff);
      if (cutMesh.limited || fine.indices.length / 3 > maxTriangles) fine.limited = true;
    } else if (pointFlags.includes(1)) {
      // Splitting names the triangles it split: fine -> grid -> input.
      const split = subdivide(cutMesh, maxEdge, maxTriangles, null, pointFlags);
      fine = { ...split, parents: Uint32Array.from(split.parents, (f) => cutMesh.parents[f]) };
    } else fine = cutMesh;
    if (fine.indices.length === mesh.indices.length) return state;
    // Splitting and cutting add points behind the others: the bumps' values keep their numbers.
    return { ...withNormals(state.key, fine, state.edge, state.crossMax, state.limited || Boolean(fine.limited), state.slice, s.edgeAngle), fixed: state.fixed, straightAxis: state.straightAxis };
  }

  // Whether the body is round, per axis: asked once, not on every change of a setting.
  const roundness = new Map<SurfaceTextureAxis, boolean>();
  // An angular body's outline round each axis (see SurfaceTextureLayout.outline), by axis and edge angle.
  const outlines = new Map<string, SurfaceOutline | null>();
  function apply(input: unknown, options: SurfaceTextureOptions = {}): SurfaceTextureResult {
    const asked = normalizeSurfaceTexture(input);
    const roundAxis = asked.projection === "auto" || asked.projection === "cylinder";
    if (roundAxis && !roundness.has(asked.axis)) roundness.set(asked.axis, isRoundBody(base, asked.axis));
    const round = Boolean(roundness.get(asked.axis));
    const outlineKey = `${asked.axis}|${asked.edgeAngle}`;
    if (roundAxis && !round && !outlines.has(outlineKey)) outlines.set(outlineKey, surfaceTextureOutline(base, asked));
    const outline = roundAxis && !round ? (outlines.get(outlineKey) ?? null) : null;
    // "auto" decided for this body: round the axis on a round body, along the outline on an angular one standing along it,
    // else all round. Everything below sees the choice.
    const s: SurfaceTextureSettings = asked.projection === "auto" ? { ...asked, projection: round || (outline && wrapsOutline(asked, outline)) ? "cylinder" : "allRound" } : asked;
    const preview = Boolean(options.preview);
    const maxTriangles = Math.max(1000, Math.round(options.maxTriangles ?? (preview ? SURFACE_TEXTURE_PREVIEW_TRIANGLES : SURFACE_TEXTURE_MAX_TRIANGLES)));
    const maskFree = maskTest(s.masks);
    // Points the masks keep smooth do not count for the axis: a masked handle does not pull it aside.
    let baseSkip: Uint8Array | null = null;
    if (maskFree) {
      baseSkip = new Uint8Array(base.vertices.length / 3);
      for (let i = 0; i < baseSkip.length; i += 1) baseSkip[i] = maskFree(base.vertices[i * 3], base.vertices[i * 3 + 1], base.vertices[i * 3 + 2]) ? 1 : 0;
    }
    const layout = makeSurfaceTextureLayout(base, s, baseSkip, s.projection === "cylinder" ? outline : null);
    // A top or bottom round the axis with the pattern (picked, or not kept smooth): the pattern lies flat there or runs
    // in rings (see SurfaceTextureLayout.flatCaps). With only such faces picked, nothing goes round the axis.
    let goesRound = layout.around !== null;
    if (s.projection === "cylinder" && s.pattern !== "text") {
      const chosen = chosenFaces(s);
      layout.flatCaps = Boolean(capFaces(base, chosen ? chosen.map((c) => (c ? 0 : 1)) : smoothBaseVertices(s, layout).faces, AXIS_INDEX[s.axis]));
      if (chosen && layout.flatCaps) {
        const ax = AXIS_INDEX[s.axis];
        goesRound = chosen.some((c, f) => {
          if (!c) return false;
          const n = faceCross(base.vertices, base.indices[f * 3], base.indices[f * 3 + 1], base.indices[f * 3 + 2]);
          return Math.abs(n[ax]) <= 0.8 * Math.hypot(n[0], n[1], n[2]);
        });
      }
    }
    if (layout.flatCaps) {
      layout.inRims = capRims(s, layout);
      layout.capEdge = capEdgeMode(s, layout);
      if (layout.capEdge) {
        layout.rims = capRims(s, layout);
        if (!layout.rims.length) layout.capEdge = null;
      }
    }
    if (s.pattern === "cracks") layout.crack = crackLines(s, layout, maskFree);
    if (s.pattern === "text") layout.text = textPlacement(s, layout);
    const r = refined(s, layout, maxTriangles, preview ? 1.5 : 1);

    // A text goes where it was put: what stays smooth for a pattern all over (bottom, top, a wall, the height band, sharp
    // edges) does not hold it back - masks do.
    const placed = s.pattern === "text";
    const sidePoints = (mesh: SurfaceMesh) => sidePointsFor(mesh, AXIS_INDEX[s.axis]);
    /** Weight per point: 0 = smooth, 1 = the full pattern, faded in over `fade` mm (straight faces: see BORDER_WALL). */
    const weightsFor = (state: RefinedState) => {
      const { mesh, normals, crease, down, up, adj } = state;
      const v = mesh.vertices;
      const n = v.length / 3;
      const zMin = base.min[2];
      const zH = base.size[2] || 1;
      const zFrom = zMin + (s.zoneFrom / 100) * zH;
      const zTo = zMin + (s.zoneTo / 100) * zH;
      const cosBottom = Math.cos((s.bottomFree * Math.PI) / 180);
      const cosTop = Math.cos((s.topFree * Math.PI) / 180);
      const [i1, i2] = acrossAxes(s.axis);
      // Picked faces: a point on any face not picked stays smooth, so the pattern ends at the faces' edges.
      const chosen = placed ? null : chosenFaces(s);
      let notChosen: Uint8Array | null = null;
      if (chosen) {
        notChosen = new Uint8Array(n);
        const I = mesh.indices;
        for (let f = 0; f < I.length / 3; f += 1) {
          if (chosen[mesh.parents[f]]) continue;
          notChosen[I[f * 3]] = 1;
          notChosen[I[f * 3 + 1]] = 1;
          notChosen[I[f * 3 + 2]] = 1;
        }
      }
      // Along an angular body's outline the pattern runs round the edges between its sides (see SurfaceTextureLayout.outline):
      // those are not kept smooth.
      const wrapped = layout.outline ? sidePoints(mesh) : null;
      // Where the side's rows run over a rim, or a border runs round it (see SurfaceTextureSettings.capEdge), neither.
      const kinds = layout.capEdge ? pointKindsFor(mesh, AXIS_INDEX[s.axis]) : null;
      const overRim = (i: number) => Boolean(kinds && kinds[i] === 3 && layout.rims!.some((rim) => Math.abs(v[i * 3 + AXIS_INDEX[s.axis]] - rim.level) <= RIM_LEVEL));
      // Bark all round (a board, a box) keeps its edges smooth anyway: its furrows pulled an edge in past the points beside
      // it on the other face, which turned over in spikes there. Round a log its ends' rims slide along (see edgeRounding).
      const keepsEdges = s.keepEdges || (s.pattern === "bark" && s.projection === "allRound");
      const kept = (i: number) => keepsEdges && crease[i] === 1 && !(wrapped && wrapped[i]) && !overRim(i);
      const w0 = new Uint8Array(n);
      for (let i = 0; i < n; i += 1) {
        const z = v[i * 3 + 2];
        let free = false;
        if (maskFree && maskFree(v[i * 3], v[i * 3 + 1], z)) free = true;
        else if (placed) free = false;
        else if (notChosen) free = notChosen[i] === 1 || kept(i);
        else if (kept(i)) free = true;
        else if (s.bottomFree > 0 && down[i] >= cosBottom) free = true;
        else if (s.topFree > 0 && up[i] >= cosTop) free = true;
        else if ((s.zoneFrom > 0 && z < zFrom - 1e-9) || (s.zoneTo < 100 && z > zTo + 1e-9)) free = true;
        else if (!s.outside || !s.inside) {
          // A side wall (normal mostly across the axis): when it faces the axis, it is inside.
          const h1 = normals[i * 3 + i1], h2 = normals[i * 3 + i2];
          if (Math.hypot(h1, h2) >= 0.5) {
            const r1 = v[i * 3 + i1] - layout.center[0], r2 = v[i * 3 + i2] - layout.center[1];
            const rl = Math.hypot(r1, r2);
            const isInside = rl > 1e-9 && (h1 * r1 + h2 * r2) / rl < -0.3;
            if (isInside ? !s.inside : !s.outside) free = true;
          }
        }
        w0[i] = free ? 0 : 1;
      }
      // Round the axis with a flat top or bottom (cut as a straight face), the side ends at a border with a wall as well.
      const walled = endsInWall(s) || (Boolean(state.straightAxis) && s.projection === "cylinder");
      const faded = fadeWeights(v, mesh.indices, adj, w0, s.fade, s.margin, state.straightAxis || walled ? FADE_BEYOND : 0);
      // Straight faces cut along their pattern: a border with a short wall instead of the fade (see BORDER_WALL) - unless
      // the pattern stands out, which runs out up to the edge. Grooves and knurling round the axis likewise (see endsInWall).
      const axisOf = state.straightAxis;
      if ((axisOf || walled) && faded.distance && !standsOut(s)) {
        const reach = s.fade + s.margin;
        const wall = Math.min(BORDER_WALL, s.fade);
        // Per point the axis of a straight face it lies on (255: none).
        const axisAt = new Uint8Array(n).fill(255);
        const I = mesh.indices;
        for (let f = 0; axisOf && f < I.length / 3; f += 1) {
          const k = axisOf[mesh.parents[f]];
          if (k === 255) continue;
          axisAt[I[f * 3]] = k;
          axisAt[I[f * 3 + 1]] = k;
          axisAt[I[f * 3 + 2]] = k;
        }
        for (let i = 0; i < n; i += 1) {
          // Round the axis with a flat top or bottom, the side keeps its wall too (not only the flat faces).
          if ((axisOf && axisAt[i] === 255 && !walled) || w0[i] === 0) continue;
          const d = faded.distance[i];
          faded.weights[i] = d >= reach ? 1 : wall > 0 && d > reach - wall ? (d - (reach - wall)) / wall : 0;
        }
        // Bumps the border would cut stay off whole: a half bump at the frame looked like a mistake.
        if (axisOf && s.pattern === "bumps") {
          const radius = (layout.cell / 2) * s.width;
          const near = nearBorder(v, freeBorder(I, w0), reach + radius);
          const off = new Map<string, boolean>();
          for (let i = 0; i < n; i += 1) {
            const k = axisAt[i];
            if (k === 255 || faded.weights[i] === 0) continue;
            const ax = AXIS_INDEX[SURFACE_TEXTURE_AXES[k]];
            const [i1, i2] = acrossAxes(SURFACE_TEXTURE_AXES[k]);
            const p = [v[i * 3], v[i * 3 + 1], v[i * 3 + 2]];
            // Faces seen along the body's axis have the pattern turned (see faceTurn).
            const turned = k === AXIS_INDEX[s.axis];
            const [pu, pv] = turned ? turnOnFace(p[i1], p[i2], s, layout) : [p[i1], p[i2]];
            const site = bumpSite(pu, pv, layout.cell, s.bumpGrid);
            if (Math.hypot(pu - site.x, pv - site.y) >= radius) continue;
            // Opposite faces share their sites: the face's place along its axis tells them apart.
            const key = `${site.key}|${k}|${Math.round(p[ax] * 1000)}`;
            let drop = off.get(key);
            if (drop === undefined) {
              const middle = p.slice();
              [middle[i1], middle[i2]] = turned ? turnOnFace(site.x, site.y, s, layout, true) : [site.x, site.y];
              drop = near(middle);
              off.set(key, drop);
            }
            if (drop) faded.weights[i] = 0;
          }
        }
      }
      // Round an angular body's outline, a bump cut in right on a corner was folded round it into a heart, half on either
      // side: such bumps stay off whole, as at a border.
      if (s.pattern === "bumps" && !standsOut(s) && s.projection === "cylinder" && layout.outline?.corners.length) {
        const radius = (layout.cell / 2) * s.width;
        const turn = 2 * Math.PI * layout.radius;
        const ax = AXIS_INDEX[s.axis];
        const cornerU = layout.outline.corners.map((c) => aroundAngle(layout, c.at[0], c.at[1]) * layout.radius);
        for (let i = 0; i < n; i += 1) {
          if (faded.weights[i] === 0 || Math.abs(normals[i * 3 + ax]) > 0.8) continue;
          const u = aroundAngle(layout, v[i * 3 + i1], v[i * 3 + i2]) * layout.radius, w = v[i * 3 + ax];
          const site = bumpSite(u, w, layout.cell, s.bumpGrid);
          if (Math.hypot(u - site.x, w - site.y) >= radius) continue;
          if (cornerU.some((at) => Math.abs(site.x - at - turn * Math.round((site.x - at) / turn)) < radius)) faded.weights[i] = 0;
        }
      }
      // Round the axis, a bump the border would cut (at the rim of a top kept smooth, at a band's edge) stays off whole
      // too, as on straight faces: cut off by the border's wall, a half hole along an angular body's rim looked like a
      // mistake (issue #955).
      if (s.pattern === "bumps" && s.projection === "cylinder") {
        const radius = (layout.cell / 2) * s.width;
        const turn = 2 * Math.PI * layout.radius;
        const ax = AXIS_INDEX[s.axis];
        // Per point in a bump the bump's place round the axis and up it, the same on both sides of the seam.
        const siteKey = (i: number) => {
          if (Math.abs(normals[i * 3 + ax]) > 0.8) return -1;
          const u = aroundAngle(layout, v[i * 3 + i1], v[i * 3 + i2]) * layout.radius, w = v[i * 3 + ax];
          const site = bumpSite(u, w, layout.cell, s.bumpGrid);
          if (Math.hypot(u - site.x, w - site.y) >= radius) return -1;
          const round = Math.max(1, Math.round((2 * turn) / layout.cell));
          const kx = ((Math.round((2 * site.x) / layout.cell) % round) + round) % round;
          return kx * 1e6 + Math.round((2 * site.y) / layout.cell) + 5e5;
        };
        const keys = new Float64Array(n);
        const cut = new Set<number>();
        for (let i = 0; i < n; i += 1) {
          keys[i] = siteKey(i);
          if (keys[i] >= 0 && faded.weights[i] < 1 - 1e-9) cut.add(keys[i]);
        }
        if (cut.size) for (let i = 0; i < n; i += 1) if (keys[i] >= 0 && cut.has(keys[i])) faded.weights[i] = 0;
      }
      return faded;
    };

    let state = r;
    let faded = weightsFor(state);
    let weights = faded.weights;
    // The groove grid: triangles along it are up to a few mm long. Where the pattern fades out (rim, smooth faces), the
    // fade over such a long triangle would smear and look restless. There - only there - it is refined finely; on the
    // straight faces of an angular body cut along lines of equal distance to the edge.
    // A pattern standing out: its run-out, finer still (see RUN_OUT_STEPS).
    // Bark all round fades out at the edges it keeps (see weightsFor): over its grid's triangles there in teeth.
    if (r.crossMax > 0 || r.straightAxis || standsOut(s) || endsInWall(s) || (s.pattern === "bark" && s.projection === "allRound")) {
      const weightKey = JSON.stringify([r.key, s.bottomFree, s.topFree, s.zoneFrom, s.zoneTo, s.keepEdges, s.edgeAngle, s.fade, s.direction, s.margin, s.outside, s.inside, layout.center, s.masks, s.faces]);
      const runOut = standsOut(s) ? Math.min(0.5, Math.max(s.fade, 0.25) / RUN_OUT_STEPS) : Math.min(0.5, Math.max(s.fade, 0.25) / 2);
      if (fadeCache?.key === weightKey) state = fadeCache.state;
      else {
        state = refineTransitions(r, s, layout, weights, faded.distance, Math.max(2 * r.crossMax, runOut), maxTriangles);
        fadeCache = { key: weightKey, state };
      }
      if (state !== r) {
        faded = weightsFor(state);
        weights = faded.weights;
      }
    }

    const { mesh, directions, moves } = state;
    const v = mesh.vertices;
    const n = v.length / 3;
    const out = new Float64Array(v.length);
    // Cutting and merging can leave points no triangle uses: they do not count as textured.
    const used = new Uint8Array(n);
    for (let t = 0; t < mesh.indices.length; t += 1) used[mesh.indices[t]] = 1;
    let textured = 0;
    // Cracks with gold: how deep the notch is at each point; the points moved along `moves`.
    const gold = s.pattern === "cracks" && s.crackGold && s.direction === "inward" && Boolean(layout.crack?.count);
    const notch = gold ? new Float64Array(n) : null;
    // Text: the values come from the unrolled plane, not from a projection.
    const textValue = s.pattern === "text" && state.text ? state.text.values : null;
    const fixedValue = state.fixed ?? null;
    // Bark cut along its levels comes with its values (see barkLevelCuts): smoothed over neighbours, they would leave the
    // cuts. Over the budget it was not cut and is smoothed as wood is.
    const barkCut = s.pattern === "bark" && fixedValue ? fixedValue : null;
    const passes = barkCut ? 0 : (SMOOTHED_PASSES[s.pattern] ?? 0);
    const coarse = passes > 0 && state.limited && state.edge > 1.5 * targetEdge(s);
    const blur = coarse ? LIMITED_BLUR * state.edge : s.pattern === "bark" ? BARK_BLUR * state.edge : 0;
    const smoothedValue = passes || blur > 0 ? smoothedValues(state, s, layout, passes, blur, barkCut) : null;
    let lettered = 0;
    // Bark round a log with its ends: the end's rim slides in with the bark's furrows (see edgeRounding), or the furrows
    // pulled the rim in past the end's points beside it, and its triangles there turned over in spikes.
    const logRims = s.pattern === "bark" && Boolean(layout.inRims?.length);
    const roundCorner = (layout.outline && layout.outline.corners.length) || layout.capEdge || logRims ? edgeRounding(layout, s, pointKindsFor(mesh, AXIS_INDEX[s.axis]), directions) : null;
    const moveFor = (value: number) => (s.direction === "outward" ? s.depth * value : s.direction === "inward" ? -s.depth * value : s.depth * (value - 0.5));
    // The move at a point on an edge, for the point now moved (its weight) and a face's normal: a text's values are not
    // known there - the point's own move stands in.
    let footW = 0;
    // Smoothed values (bark, wood) there as on a circle round the foot (see circleValue), unsmoothed over neighbours.
    const footDepth: SurfaceFootDepth = textValue ? () => NaN : (foot, normal) => footW * moveFor(circleValue(foot[0], foot[1], foot[2], normal[0], normal[1], normal[2], s, layout, smoothedValue ? blur : 0));
    // Bricks, bark and wood on a sharp edge: each side moved as deep as its own pattern lies there, the point where they
    // meet. With one move for both (see creaseMoves), a joint on the top beside a brick on the side pulled the edge into
    // the top, and its brick faces down into fans; a log's rim took the bark's deep furrows for its end too, in spikes.
    const sides = s.pattern === "bricks" || s.pattern === "bark" || s.pattern === "wood" ? creaseSides(base, mesh, s.edgeAngle) : null;
    for (let i = 0; i < n; i += 1) {
      const x = v[i * 3], y = v[i * 3 + 1], z = v[i * 3 + 2];
      const nx = directions[i * 3], ny = directions[i * 3 + 1], nz = directions[i * 3 + 2];
      let d = 0;
      const wi = weights[i];
      if (wi > 0) {
        textured += used[i];
        const known = fixedValue && i < fixedValue.length ? fixedValue[i] : NaN;
        // Values known from cutting (cells, bumps) are the pattern's alone: a border round a rim goes over them.
        const value = textValue
          ? textValue[i]
          : smoothedValue
            ? smoothedValue[i]
            : !Number.isNaN(known)
              ? layout.capEdge === "bead" ? beadOver(known, surfaceTextureBeadAt(x, y, z, [nx, ny, nz][AXIS_INDEX[s.axis]], s, layout)) : known
              : surfaceTextureValueAt(x, y, z, nx, ny, nz, s, layout);
        if (textValue && value > 0.5) lettered += used[i];
        d = wi * moveFor(value);
        if (notch) notch[i] = wi * s.depth * value;
      }
      if (roundCorner && d !== 0) {
        footW = wi;
        if (roundCorner(i, x, y, z, d, out, footDepth)) continue;
      }
      const meet = wi > 0 && sides?.get(i);
      if (meet) {
        const m = creaseMeet(meet, Array.from({ length: meet.length / 3 }, (_, k) => wi * moveFor(circleValue(x, y, z, meet[k * 3], meet[k * 3 + 1], meet[k * 3 + 2], s, layout, smoothedValue ? blur : 0))));
        if (m) {
          out[i * 3] = x + m[0];
          out[i * 3 + 1] = y + m[1];
          out[i * 3 + 2] = z + m[2];
          continue;
        }
      }
      out[i * 3] = x + moves[i * 3] * d;
      out[i * 3 + 1] = y + moves[i * 3 + 1] * d;
      out[i * 3 + 2] = z + moves[i * 3 + 2] * d;
    }
    // With the bottom kept smooth, nothing belongs below the bed (the slicer would cut it off, or the first layer stick
    // badly). With a patterned bottom it sinks on purpose, as does a text put on the bottom itself - and a picked face
    // pointing down (the bottom picked: a raised rope there was pressed flat again).
    const onBottom = placed && Boolean(layout.text && layout.text.point[2] <= base.min[2] + 1e-6);
    const picked = placed ? null : chosenFaces(s);
    let bottomPicked = false;
    if (picked) {
      for (let f = 0; f < picked.length && !bottomPicked; f += 1) {
        if (!picked[f]) continue;
        const n = faceCross(base.vertices, base.indices[f * 3], base.indices[f * 3 + 1], base.indices[f * 3 + 2]);
        bottomPicked = n[2] < -0.5 * Math.hypot(n[0], n[1], n[2]);
      }
    }
    const keepOnBed = placed ? !onBottom : picked ? !bottomPicked : s.bottomFree > 0;
    const bedClamped = keepOnBed ? clampToBed(out, v, mesh.indices, base.min[2]) : 0;
    // Tiny edges (left over from fitting to the profile) are pulled together: slicers merge such close points themselves
    // and throw away the triangles without area - which tore edges open.
    let indices = mesh.indices;
    let capped = false;
    for (let round = 0; round < 3; round += 1) {
      for (let pass = 0; pass < 12; pass += 1) {
        const c = collapseShortEdges(out, indices, SURFACE_MIN_EDGE);
        indices = c.indices;
        if (c.merged === 0) break;
      }
      const fixed = fixCaps(out, indices);
      if (fixed === indices) break;
      indices = fixed;
      capped = true;
    }
    if (capped) indices = dropFins(indices);
    // The gold: a closed body on the bottom of the notch, its top `crackRecess` mm below the surface.
    const fillBody = notch ? crackFillBody(out, indices, notch, moves, s.crackRecess) : null;
    const fill = fillBody && fillBody.indices.length ? { vertices: screenToInsidePositions(fillBody.vertices), indices: fillBody.indices } : null;
    // Flat pieces (faces kept smooth, the flats between bumps) need no fine grid: their inner points are merged away.
    indices = mergeFlatPoints(out, indices).indices;
    const inwardDepth = s.direction === "inward" ? s.depth : s.direction === "both" ? s.depth / 2 : 0;
    const smallest = Math.min(...base.size.filter((size) => size > 0));
    const spacing = s.projection === "cylinder" ? (CELL_PATTERNS.includes(s.pattern) ? layout.cell : layout.period) : s.spacing;
    return {
      vertices: screenToInsidePositions(out),
      indices,
      stats: {
        triangles: indices.length / 3,
        limited: r.limited || state.limited,
        around: goesRound ? layout.around : null,
        spacing,
        spacingMin: goesRound && layout.around ? (spacing * layout.rMin) / layout.radius : null,
        spacingMax: goesRound && layout.around ? (spacing * layout.rMax) / layout.radius : null,
        nothing: textured === 0,
        tooDeep: 2 * inwardDepth > smallest,
        bedClamped,
        removed: base.removed,
        cracks: layout.crack ? { lines: layout.crack.lines.length, length: layout.crack.length } : null,
        text: s.pattern === "text" ? { placed: lettered > 0, torn: state.text?.torn ?? 0 } : null,
        bricks: s.pattern === "bricks" && layout.rows && layout.rowHeight ? { courses: layout.rows, height: layout.rowHeight } : null,
        projection: s.projection as Exclude<SurfaceTextureProjection, "auto">,
      },
      fill,
    };
  }

  return { base, apply };
}

/** Texture a body once: its triangles (inside frame) in, the textured triangles out. */
export function applySurfaceTexture(positions: ArrayLike<number>, settings: unknown, options: SurfaceTextureOptions = {}) {
  return createSurfaceTextureSession(positions).apply(settings, options);
}

/** A result as a flat list of triangles (nine numbers each), as an imported mesh keeps it. */
export function surfaceTexturePositions(result: Pick<SurfaceTextureResult, "vertices" | "indices">) {
  const { vertices, indices } = result;
  const out = new Array<number>(indices.length * 3);
  for (let t = 0; t < indices.length; t += 1) {
    const s = indices[t] * 3;
    out[t * 3] = vertices[s];
    out[t * 3 + 1] = vertices[s + 1];
    out[t * 3 + 2] = vertices[s + 2];
  }
  return out;
}
