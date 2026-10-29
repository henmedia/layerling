import * as THREE from "three";
import { toCreasedNormals } from "@/lib/creasedNormals";
import type { CadModifierProfileLoop } from "@/lib/cadModifierTypes";
import { loftEaseShare } from "@/lib/loftEase";
import { regularPolygonFootprintScale } from "@/lib/regularPolygonFootprint";
import { meshYawDegrees, mirrorSign } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

/**
 * The transition ("Übergang", a loft, #188): one outline at the bottom, another at the top,
 * joined by a straight-ruled wall - a hose adapter, a square fan onto a round duct, a stand.
 * With a wall thickness it is a tube open at both ends.
 *
 * Both outlines are cut into the same number of pieces at the same angles round their own
 * middles, so piece i at the bottom faces piece i at the top: the exact body (a ruled loft,
 * edge by edge) and the display mesh (sampled piece by piece along the same parameter) are
 * the same surface, and nothing twists.
 */

export type LoftOutline = "round" | "rectangle" | "polygon";

export const DEFAULT_LOFT = {
  bottomOutline: "rectangle" as LoftOutline,
  topOutline: "round" as LoftOutline,
  bottomWidth: 40,
  bottomDepth: 40,
  topWidth: 30,
  topDepth: 30,
  bottomCorner: 3,
  topCorner: 3,
  bottomSides: 6,
  topSides: 6,
  offsetX: 0,
  offsetZ: 0,
  wall: 0,
  twist: 0,
  tiltX: 0,
  tiltZ: 0,
  smooth: 0,
  segments: 96,
  height: 30,
};

/** How far the top may turn against the bottom, in degrees either way (#205). */
export const MAX_LOFT_TWIST = 360;
/** How far the top end may tilt about each horizontal axis, in degrees either way (#205). */
export const MAX_LOFT_TILT = 45;

export const MIN_LOFT_SIZE = 1;
export const MIN_LOFT_SIDES = 3;
export const MAX_LOFT_SIDES = 24;
/** How many straight pieces a full circle of a round end or a rounded corner is drawn with (#755). */
export const MIN_LOFT_SEGMENTS = 16;
export const MAX_LOFT_SEGMENTS = 360;
/** What a wall leaves at least of the opening, so the inner outline stays a real outline. */
const MIN_LOFT_OPENING = 0.4;

type Point = { x: number; z: number };

/** One end of the transition: an outline of a kind and size, centred on (cx, cz). */
export type LoftSection = {
  outline: LoftOutline;
  width: number;
  depth: number;
  corner: number;
  sides: number;
  cx: number;
  cz: number;
};

/** The values a person sets, in millimetres: the two ends, how far the top is moved, the wall. */
export type LoftMeasures = {
  bottomOutline: LoftOutline;
  topOutline: LoftOutline;
  bottomWidth: number;
  bottomDepth: number;
  topWidth: number;
  topDepth: number;
  bottomCorner: number;
  topCorner: number;
  bottomSides: number;
  topSides: number;
  offsetX: number;
  offsetZ: number;
  wall: number;
  /** Degrees the section turns from bottom to top about the vertical, evenly on the way up (#205). */
  twist: number;
  /** Degrees the top end tilts about the x axis (its front rising) and about the z axis (its right side rising). */
  tiltX: number;
  tiltZ: number;
  /** 0 to 1: how much of an S-curve the sides take between the two ends instead of a straight line (#271). */
  smooth: number;
  /** Straight pieces of a full circle in the mesh of the view and of the exports (#755). */
  segments: number;
};

export type LoftShapeFields = Pick<WorkplaneShape,
  "width" | "depth" | "size" | "height"
  | "loftBottomOutline" | "loftTopOutline" | "loftBottomWidth" | "loftBottomDepth" | "loftTopWidth" | "loftTopDepth"
  | "loftBottomCorner" | "loftTopCorner" | "loftBottomSides" | "loftTopSides" | "loftOffsetX" | "loftOffsetZ" | "loftWall"
  | "loftTwist" | "loftTiltX" | "loftTiltZ" | "loftSmooth" | "loftSegments">;

export function normalizeLoftOutline(value: unknown, fallback: LoftOutline = "round"): LoftOutline {
  return value === "round" || value === "rectangle" || value === "polygon" ? value : fallback;
}

const finite = (value: unknown, fallback: number) => (typeof value === "number" && Number.isFinite(value) ? value : fallback);

export function normalizeLoftSides(value: unknown, fallback = DEFAULT_LOFT.bottomSides) {
  return Math.min(MAX_LOFT_SIDES, Math.max(MIN_LOFT_SIDES, Math.round(finite(value, fallback))));
}

/** A corner rounding fits into the smaller half of its rectangle. */
export function normalizeLoftCorner(value: unknown, width: number, depth: number) {
  return Math.min(Math.min(width, depth) / 2, Math.max(0, finite(value, 0)));
}

/** The thickest wall that still leaves both openings. */
export function maxLoftWall(measures: Pick<LoftMeasures, "bottomWidth" | "bottomDepth" | "topWidth" | "topDepth">) {
  return Math.max(0, Math.min(measures.bottomWidth, measures.bottomDepth, measures.topWidth, measures.topDepth) / 2 - MIN_LOFT_OPENING);
}

/** Every value in its range: sizes at least 1 mm, corners inside their rectangle, the wall leaving an opening. */
export function normalizeLoftMeasures(raw: Partial<LoftMeasures>): LoftMeasures {
  const bottomWidth = Math.max(MIN_LOFT_SIZE, finite(raw.bottomWidth, DEFAULT_LOFT.bottomWidth));
  const bottomDepth = Math.max(MIN_LOFT_SIZE, finite(raw.bottomDepth, DEFAULT_LOFT.bottomDepth));
  const topWidth = Math.max(MIN_LOFT_SIZE, finite(raw.topWidth, DEFAULT_LOFT.topWidth));
  const topDepth = Math.max(MIN_LOFT_SIZE, finite(raw.topDepth, DEFAULT_LOFT.topDepth));
  const sizes = { bottomWidth, bottomDepth, topWidth, topDepth };
  return {
    bottomOutline: normalizeLoftOutline(raw.bottomOutline, DEFAULT_LOFT.bottomOutline),
    topOutline: normalizeLoftOutline(raw.topOutline, DEFAULT_LOFT.topOutline),
    ...sizes,
    bottomCorner: normalizeLoftCorner(raw.bottomCorner ?? DEFAULT_LOFT.bottomCorner, bottomWidth, bottomDepth),
    topCorner: normalizeLoftCorner(raw.topCorner ?? DEFAULT_LOFT.topCorner, topWidth, topDepth),
    bottomSides: normalizeLoftSides(raw.bottomSides, DEFAULT_LOFT.bottomSides),
    topSides: normalizeLoftSides(raw.topSides, DEFAULT_LOFT.topSides),
    offsetX: finite(raw.offsetX, 0),
    offsetZ: finite(raw.offsetZ, 0),
    wall: Math.min(maxLoftWall(sizes), Math.max(0, finite(raw.wall, 0))),
    twist: Math.min(MAX_LOFT_TWIST, Math.max(-MAX_LOFT_TWIST, finite(raw.twist, 0))),
    tiltX: Math.min(MAX_LOFT_TILT, Math.max(-MAX_LOFT_TILT, finite(raw.tiltX, 0))),
    tiltZ: Math.min(MAX_LOFT_TILT, Math.max(-MAX_LOFT_TILT, finite(raw.tiltZ, 0))),
    smooth: Math.min(1, Math.max(0, finite(raw.smooth, 0))),
    segments: Math.min(MAX_LOFT_SEGMENTS, Math.max(MIN_LOFT_SEGMENTS, Math.round(finite(raw.segments, DEFAULT_LOFT.segments)))),
  };
}

/** Whether the sections turn or tilt on the way up, so the sides are no longer ruled lines. */
export function loftIsTurned(measures: Pick<LoftMeasures, "twist" | "tiltX" | "tiltZ">) {
  return Math.abs(measures.twist) > 1e-9 || Math.abs(measures.tiltX) > 1e-9 || Math.abs(measures.tiltZ) > 1e-9;
}

/** The stored values of a shape, as set (before the frame stretches them). */
export function loftStoredMeasures(shape: LoftShapeFields): LoftMeasures {
  return normalizeLoftMeasures({
    bottomOutline: shape.loftBottomOutline,
    topOutline: shape.loftTopOutline,
    bottomWidth: shape.loftBottomWidth,
    bottomDepth: shape.loftBottomDepth,
    topWidth: shape.loftTopWidth,
    topDepth: shape.loftTopDepth,
    bottomCorner: shape.loftBottomCorner,
    topCorner: shape.loftTopCorner,
    bottomSides: shape.loftBottomSides,
    topSides: shape.loftTopSides,
    offsetX: shape.loftOffsetX,
    offsetZ: shape.loftOffsetZ,
    wall: shape.loftWall,
    twist: shape.loftTwist,
    tiltX: shape.loftTiltX,
    tiltZ: shape.loftTiltZ,
    smooth: shape.loftSmooth,
    segments: shape.loftSegments,
  });
}

/** Both ends side by side: [minX, minZ, maxX, maxZ] with the bottom's middle at the origin. */
export function loftMeasuresBounds(measures: LoftMeasures) {
  // Turned or tilted sections reach out differently: measured on the sections themselves.
  if (loftIsTurned(measures)) return turnedLoftBounds(measures);
  return [
    Math.min(-measures.bottomWidth / 2, measures.offsetX - measures.topWidth / 2),
    Math.min(-measures.bottomDepth / 2, measures.offsetZ - measures.topDepth / 2),
    Math.max(measures.bottomWidth / 2, measures.offsetX + measures.topWidth / 2),
    Math.max(measures.bottomDepth / 2, measures.offsetZ + measures.topDepth / 2),
  ];
}

/**
 * The values as the body shows them. Like every body the transition fills its frame: when the
 * frame was dragged bigger, the stored ends are stretched along with it (corners and wall
 * keep their size), and this is what they measure now.
 */
export function loftMeasures(shape: LoftShapeFields): LoftMeasures {
  const stored = loftStoredMeasures(shape);
  const [minX, minZ, maxX, maxZ] = loftMeasuresBounds(stored);
  const width = shape.width ?? shape.size;
  const depth = shape.depth ?? shape.size;
  const sx = Number.isFinite(width) && width > 0 ? width / (maxX - minX) : 1;
  const sz = Number.isFinite(depth) && depth > 0 ? depth / (maxZ - minZ) : 1;
  if (Math.abs(sx - 1) < 1e-9 && Math.abs(sz - 1) < 1e-9) return stored;
  return normalizeLoftMeasures({
    ...stored,
    bottomWidth: stored.bottomWidth * sx,
    bottomDepth: stored.bottomDepth * sz,
    topWidth: stored.topWidth * sx,
    topDepth: stored.topDepth * sz,
    offsetX: stored.offsetX * sx,
    offsetZ: stored.offsetZ * sz,
  });
}

/** The frame the measures need: the width and depth of both ends together. */
export function loftFrameSize(measures: LoftMeasures) {
  const [minX, minZ, maxX, maxZ] = loftMeasuresBounds(measures);
  return { width: maxX - minX, depth: maxZ - minZ, centerX: (minX + maxX) / 2, centerZ: (minZ + maxZ) / 2 };
}

/**
 * The shape fields for changed measures, and how far the frame's middle moves in the shape's
 * own frame (x, z) so the bottom stays where it is - a top moved sideways should not drag the
 * foot along.
 */
export function loftMeasuresPatch(shape: LoftShapeFields, change: Partial<LoftMeasures>) {
  const before = loftMeasures(shape);
  const next = normalizeLoftMeasures({ ...before, ...change });
  const oldFrame = loftFrameSize(before);
  const newFrame = loftFrameSize(next);
  return {
    patch: {
      width: newFrame.width,
      depth: newFrame.depth,
      ...loftFieldsFromMeasures(next),
    } satisfies Partial<WorkplaneShape>,
    shift: { x: newFrame.centerX - oldFrame.centerX, z: newFrame.centerZ - oldFrame.centerZ },
  };
}

/**
 * The whole change for a placed shape: the fields, the new frame, and the frame's middle moved
 * in the world - turned and mirrored as the shape is - so the bottom stays put.
 */
export function loftShapePatch(shape: WorkplaneShape, change: Partial<LoftMeasures>): Partial<WorkplaneShape> {
  const { patch, shift } = loftMeasuresPatch(shape, change);
  const offset = new THREE.Vector3(shift.x * mirrorSign(shape.mirrorX), 0, shift.z * mirrorSign(shape.mirrorZ)).applyEuler(new THREE.Euler(
    THREE.MathUtils.degToRad(shape.rotationX ?? 0),
    THREE.MathUtils.degToRad(meshYawDegrees(shape)),
    THREE.MathUtils.degToRad(shape.rotationZ ?? 0),
    "XYZ",
  ));
  return { ...patch, size: Math.max(patch.width, patch.depth), x: shape.x + offset.x, z: shape.z + offset.z };
}

export function loftFieldsFromMeasures(measures: LoftMeasures): Partial<WorkplaneShape> {
  return {
    loftBottomOutline: measures.bottomOutline,
    loftTopOutline: measures.topOutline,
    loftBottomWidth: measures.bottomWidth,
    loftBottomDepth: measures.bottomDepth,
    loftTopWidth: measures.topWidth,
    loftTopDepth: measures.topDepth,
    loftBottomCorner: measures.bottomCorner,
    loftTopCorner: measures.topCorner,
    loftBottomSides: measures.bottomSides,
    loftTopSides: measures.topSides,
    loftOffsetX: measures.offsetX,
    loftOffsetZ: measures.offsetZ,
    loftWall: measures.wall,
    loftTwist: measures.twist,
    loftTiltX: measures.tiltX,
    loftTiltZ: measures.tiltZ,
    loftSmooth: measures.smooth,
    loftSegments: measures.segments,
  };
}

/** The two ends in the shape's own frame, the frame's middle at the origin. */
export function loftSections(shape: LoftShapeFields): { bottom: LoftSection; top: LoftSection; wall: number; measures: LoftMeasures } {
  const measures = loftMeasures(shape);
  const frame = loftFrameSize(measures);
  return { ...sectionsAt(measures, -frame.centerX, -frame.centerZ), wall: measures.wall, measures };
}

/** The two ends with the bottom's box centred on (cx, cz). */
function sectionsAt(measures: LoftMeasures, cx: number, cz: number): { bottom: LoftSection; top: LoftSection } {
  return {
    bottom: {
      outline: measures.bottomOutline,
      width: measures.bottomWidth,
      depth: measures.bottomDepth,
      corner: measures.bottomCorner,
      sides: measures.bottomSides,
      cx,
      cz,
    },
    top: {
      outline: measures.topOutline,
      width: measures.topWidth,
      depth: measures.topDepth,
      corner: measures.topCorner,
      sides: measures.topSides,
      cx: cx + measures.offsetX,
      cz: cz + measures.offsetZ,
    },
  };
}

// --- Outlines as pieces ----------------------------------------------------------------------

type LinePiece = { kind: "line"; a: Point; b: Point };
/** An arc of the ellipse (cx + rx cos t, cz + rz sin t), t running from t0 up to t1. */
type ArcPiece = { kind: "arc"; cx: number; cz: number; rx: number; rz: number; t0: number; t1: number };
type Piece = LinePiece | ArcPiece;

function pieceAt(piece: Piece, f: number): Point {
  if (piece.kind === "line") return { x: piece.a.x + (piece.b.x - piece.a.x) * f, z: piece.a.z + (piece.b.z - piece.a.z) * f };
  const t = piece.t0 + (piece.t1 - piece.t0) * f;
  return { x: piece.cx + piece.rx * Math.cos(t), z: piece.cz + piece.rz * Math.sin(t) };
}

function subPiece(piece: Piece, f0: number, f1: number): Piece {
  if (piece.kind === "line") return { kind: "line", a: pieceAt(piece, f0), b: pieceAt(piece, f1) };
  return { ...piece, t0: piece.t0 + (piece.t1 - piece.t0) * f0, t1: piece.t0 + (piece.t1 - piece.t0) * f1 };
}

/** A regular polygon fitted into width x depth like the polygon shape, running counter-clockwise (x towards z). */
function polygonPoints(section: LoftSection, scale = 1): Point[] {
  const count = section.sides;
  const fit = regularPolygonFootprintScale(section.width, section.depth, count);
  const middle = { x: section.cx + fit.offsetX, z: section.cz + fit.offsetZ };
  const points = Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2;
    return { x: middle.x + Math.sin(angle) * fit.x * scale, z: middle.z + Math.cos(angle) * fit.z * scale };
  });
  return signedArea(points) < 0 ? points.reverse() : points;
}

function signedArea(points: Point[]) {
  let sum = 0;
  points.forEach((point, index) => {
    const next = points[(index + 1) % points.length];
    sum += point.x * next.z - next.x * point.z;
  });
  return sum / 2;
}

/** The middle the polar angles are taken round: a polygon with an odd count is not centred in its box. */
function sectionMiddle(section: LoftSection): Point {
  if (section.outline !== "polygon") return { x: section.cx, z: section.cz };
  const fit = regularPolygonFootprintScale(section.width, section.depth, section.sides);
  return { x: section.cx + fit.offsetX, z: section.cz + fit.offsetZ };
}

/** The outline, counter-clockwise, as lines and arcs. */
function sectionPieces(section: LoftSection): Piece[] {
  const { cx, cz } = section;
  const hw = section.width / 2;
  const hd = section.depth / 2;
  if (section.outline === "round") return [{ kind: "arc", cx, cz, rx: hw, rz: hd, t0: 0, t1: Math.PI * 2 }];
  if (section.outline === "polygon") {
    const points = polygonPoints(section);
    return points.map((point, index) => ({ kind: "line", a: point, b: points[(index + 1) % points.length] }));
  }
  const r = Math.min(section.corner, hw, hd);
  if (r <= 1e-4) {
    const corners = [{ x: cx + hw, z: cz - hd }, { x: cx + hw, z: cz + hd }, { x: cx - hw, z: cz + hd }, { x: cx - hw, z: cz - hd }];
    return corners.map((point, index) => ({ kind: "line", a: point, b: corners[(index + 1) % 4] }));
  }
  const arc = (acx: number, acz: number, from: number): ArcPiece => ({ kind: "arc", cx: acx, cz: acz, rx: r, rz: r, t0: from, t1: from + Math.PI / 2 });
  const pieces: Piece[] = [];
  const corners = [
    arc(cx + hw - r, cz + hd - r, 0),
    arc(cx - hw + r, cz + hd - r, Math.PI / 2),
    arc(cx - hw + r, cz - hd + r, Math.PI),
    arc(cx + hw - r, cz - hd + r, Math.PI * 1.5),
  ];
  corners.forEach((corner, index) => {
    const previous = corners[(index + 3) % 4];
    const from = pieceAt(previous, 1);
    const to = pieceAt(corner, 0);
    // A side shrunk to nothing (a corner as big as the half side) leaves no line between two arcs.
    if (Math.hypot(to.x - from.x, to.z - from.z) > 1e-6) pieces.push({ kind: "line", a: from, b: to });
    pieces.push(corner);
  });
  return pieces;
}

const TWO_PI = Math.PI * 2;
const wrap = (angle: number) => ((angle % TWO_PI) + TWO_PI) % TWO_PI;
const polarOf = (point: Point, middle: Point) => wrap(Math.atan2(point.z - middle.z, point.x - middle.x));

/** Where a piece reaches the polar angle `target` (between its ends), as a fraction along it. */
function fractionAtPolar(piece: Piece, middle: Point, start: number, target: number) {
  let low = 0;
  let high = 1 - 1e-12;
  const span = wrap(target - start);
  for (let step = 0; step < 64; step += 1) {
    const mid = (low + high) / 2;
    if (wrap(polarOf(pieceAt(piece, mid), middle) - start) < span) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

/**
 * The outline cut at every polar angle of `cuts` (round its own middle), starting at angle 0:
 * two outlines cut at the same angles have the same number of pieces, piece i of one facing
 * piece i of the other.
 */
function cutAtAngles(pieces: Piece[], middle: Point, cuts: number[]): Piece[] {
  const out: Array<{ piece: Piece; from: number }> = [];
  pieces.forEach((piece) => {
    const start = polarOf(pieceAt(piece, 0), middle);
    const whole = piece.kind === "arc" && Math.abs(Math.abs(piece.t1 - piece.t0) - TWO_PI) < 1e-9;
    const span = whole ? TWO_PI : wrap(polarOf(pieceAt(piece, 1), middle) - start) || TWO_PI;
    const inside = cuts
      .map((cut) => ({ cut, at: wrap(cut - start) }))
      .filter(({ at }) => at > 1e-7 && at < span - 1e-7)
      .sort((a, b) => a.at - b.at);
    const fractions = [0, ...inside.map(({ cut }) => fractionAtPolar(piece, middle, start, cut)), 1];
    for (let index = 0; index + 1 < fractions.length; index += 1) {
      const part = subPiece(piece, fractions[index], fractions[index + 1]);
      out.push({ piece: part, from: polarOf(pieceAt(part, 0), middle) });
    }
  });
  // Start at the piece that begins at angle 0.
  let first = 0;
  let nearest = Infinity;
  out.forEach((entry, index) => {
    const distance = Math.min(entry.from, TWO_PI - entry.from);
    if (distance < nearest) {
      nearest = distance;
      first = index;
    }
  });
  return [...out.slice(first), ...out.slice(0, first)].map((entry) => entry.piece);
}

/** The polar angles where an outline turns a corner or changes from line to arc. */
function cornerAngles(pieces: Piece[], middle: Point) {
  return pieces.map((piece) => polarOf(pieceAt(piece, 0), middle));
}

function uniqueAngles(angles: number[]) {
  const sorted = angles.map(wrap).sort((a, b) => a - b);
  const out: number[] = [];
  sorted.forEach((angle) => {
    if (!out.length || angle - out[out.length - 1] > 1e-7) out.push(angle);
  });
  if (out.length > 1 && TWO_PI - out[out.length - 1] + out[0] <= 1e-7) out.pop();
  return out;
}

/** The section shrunk inwards by the wall: the opening of a tube. */
function insetSection(section: LoftSection, wall: number): LoftSection {
  if (section.outline === "polygon") {
    // A regular polygon shrinks evenly: every side moves in by the wall when the apothem does.
    const points = polygonPoints(section);
    const middle = sectionMiddle(section);
    const apothem = Math.min(...points.map((point, index) => {
      const next = points[(index + 1) % points.length];
      const length = Math.hypot(next.x - point.x, next.z - point.z);
      return Math.abs((next.x - point.x) * (middle.z - point.z) - (next.z - point.z) * (middle.x - point.x)) / length;
    }));
    const scale = Math.max(0.01, (apothem - wall) / apothem);
    return {
      ...section,
      width: section.width * scale,
      depth: section.depth * scale,
      cx: middle.x + (section.cx - middle.x) * scale,
      cz: middle.z + (section.cz - middle.z) * scale,
    };
  }
  return {
    ...section,
    width: section.width - 2 * wall,
    depth: section.depth - 2 * wall,
    corner: Math.max(0, section.corner - wall),
  };
}

export type LoftPieces = { bottom: Piece[]; top: Piece[] };

/**
 * Two outlines cut alike. Angles 0, 90, 180 and 270 degrees are always cuts, so even two
 * circles meet in four pieces and start at the same point.
 */
function pairSections(lower: LoftSection, upper: LoftSection): LoftPieces {
  const lowerMiddle = sectionMiddle(lower);
  const upperMiddle = sectionMiddle(upper);
  const lowerPieces = sectionPieces(lower);
  const upperPieces = sectionPieces(upper);
  const cuts = uniqueAngles([
    0, Math.PI / 2, Math.PI, Math.PI * 1.5,
    ...cornerAngles(lowerPieces.filter((piece) => piece.kind === "line" || Math.abs(piece.t1 - piece.t0) < TWO_PI - 1e-9), lowerMiddle),
    ...cornerAngles(upperPieces.filter((piece) => piece.kind === "line" || Math.abs(piece.t1 - piece.t0) < TWO_PI - 1e-9), upperMiddle),
  ]);
  return { bottom: cutAtAngles(lowerPieces, lowerMiddle, cuts), top: cutAtAngles(upperPieces, upperMiddle, cuts) };
}

/** The outer pair of outlines and, with a wall, the inner pair (the opening), each pair cut alike. */
export function loftPieces(shape: LoftShapeFields): { outer: LoftPieces; inner: LoftPieces | null } {
  const { bottom, top, wall } = loftSections(shape);
  const outer = pairSections(bottom, top);
  const inner = wall > 1e-6 ? pairSections(insetSection(bottom, wall), insetSection(top, wall)) : null;
  return { outer, inner };
}

// --- Turning and tilting (#205) ------------------------------------------------------------

/** Degrees between two sections of a turned loft: the kernel's TWIST_SECTION_STEP, so the mesh follows the body's sections. */
const LOFT_SECTION_STEP = 7.5;

/** How many sections a turned or tilted loft is built through, ends included. */
export function loftSectionCount(measures: Pick<LoftMeasures, "twist" | "tiltX" | "tiltZ">) {
  const most = Math.max(Math.abs(measures.twist), Math.abs(measures.tiltX), Math.abs(measures.tiltZ));
  return Math.max(2, Math.ceil(most / LOFT_SECTION_STEP) + 1);
}

type Point3 = { x: number; y: number; z: number };

/**
 * Where a point of the section at height share t lands: turned about the vertical through the
 * section's middle by t x twist, then tilted by t x tiltX about the x axis (its front rising) and
 * by t x tiltZ about the z axis (its right side rising), and lifted to t x lift. The kernel
 * places its sections with the same turns (twistedLoftSolid).
 */
function placeTurned(point: Point, middle: Point, t: number, measures: Pick<LoftMeasures, "twist" | "tiltX" | "tiltZ">, lift: number): Point3 {
  const twist = THREE.MathUtils.degToRad(measures.twist * t);
  const a = THREE.MathUtils.degToRad(measures.tiltX * t);
  const b = THREE.MathUtils.degToRad(measures.tiltZ * t);
  const rx = point.x - middle.x;
  const rz = point.z - middle.z;
  const x1 = rx * Math.cos(twist) - rz * Math.sin(twist);
  const z1 = rx * Math.sin(twist) + rz * Math.cos(twist);
  const y2 = z1 * Math.sin(a);
  const z2 = z1 * Math.cos(a);
  return {
    x: middle.x + x1 * Math.cos(b) - y2 * Math.sin(b),
    y: lift * t + x1 * Math.sin(b) + y2 * Math.cos(b),
    z: middle.z + z2,
  };
}

const mix = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });

/** The footprint of a turned or tilted loft, bottom's box centred on the origin: [minX, minZ, maxX, maxZ]. */
function turnedLoftBounds(measures: LoftMeasures) {
  const { bottom, top } = sectionsAt(measures, 0, 0);
  const rings = sampledRings(pairSections(bottom, top));
  const bottomMiddle = sectionMiddle(bottom);
  const topMiddle = sectionMiddle(top);
  // Finer than the sections: the mesh draws rows between them, and the frame has to hold those too.
  const count = (loftSectionCount(measures) - 1) * 4 + 1;
  let minX = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxZ = -Infinity;
  for (let step = 0; step < count; step += 1) {
    const t = step / (count - 1);
    const share = loftEaseShare(t, measures.smooth);
    const middle = mix(bottomMiddle, topMiddle, share);
    rings.bottom.forEach((point, index) => {
      const placed = placeTurned(mix(point, rings.top[index], share), middle, t, measures, 0);
      minX = Math.min(minX, placed.x);
      maxX = Math.max(maxX, placed.x);
      minZ = Math.min(minZ, placed.z);
      maxZ = Math.max(maxZ, placed.z);
    });
  }
  return [minX, minZ, maxX, maxZ];
}

/**
 * How the sections turn and how high the top end's middle stands: a tilted top rises on one side,
 * so its middle sits lower and the highest point stays at the frame's height.
 */
export function loftTurn(shape: LoftShapeFields) {
  const { bottom, top, measures } = loftSections(shape);
  const bottomMiddle = sectionMiddle(bottom);
  const topMiddle = sectionMiddle(top);
  const height = Math.max(0.01, shape.height);
  if (!loftIsTurned(measures)) return { measures, bottomMiddle, topMiddle, lift: height, turned: false };
  const rings = sampledRings(pairSections(bottom, top));
  const liftFor = (tilted: LoftMeasures) => height - Math.max(0, ...rings.top.map((point) => placeTurned(point, topMiddle, 1, tilted, 0).y));
  // The lowest point of the wall: not only the top end, a section a little way up tilts too
  // while it has hardly risen, and with a steep tilt on a low frame it dips under the plate.
  const lowest = (tilted: LoftMeasures, lift: number) => {
    let low = 0;
    for (let step = 1; step <= 24; step += 1) {
      const t = step / 24;
      const share = loftEaseShare(t, tilted.smooth);
      const middle = mix(bottomMiddle, topMiddle, share);
      rings.bottom.forEach((point, index) => {
        low = Math.min(low, placeTurned(mix(point, rings.top[index], share), middle, t, tilted, lift).y);
      });
    }
    return low;
  };
  const fits = (tilted: LoftMeasures) => {
    const lift = liftFor(tilted);
    return lift >= height * 0.05 && lowest(tilted, lift) >= 0;
  };
  // A frame made lower after the tilt was set would push the wall under the plate: the tilt then
  // gives way until it fits.
  let turned = measures;
  if (!fits(turned)) {
    let low = 0;
    let high = 1;
    for (let step = 0; step < 30; step += 1) {
      const share = (low + high) / 2;
      if (fits({ ...measures, tiltX: measures.tiltX * share, tiltZ: measures.tiltZ * share })) low = share;
      else high = share;
    }
    turned = { ...measures, tiltX: measures.tiltX * low, tiltZ: measures.tiltZ * low };
  }
  return { measures: turned, bottomMiddle, topMiddle, lift: Math.max(height * 0.05, liftFor(turned)), turned: true };
}

/**
 * The steepest tilt about one axis that still keeps the top end above the plate: its rise and
 * drop together stay within nine tenths of the height. At most MAX_LOFT_TILT.
 */
export function loftTiltLimit(shape: LoftShapeFields, axis: "x" | "z") {
  const measures = loftMeasures(shape);
  const reach = axis === "x" ? measures.topDepth : measures.topWidth;
  const ratio = Math.min(1, (Math.max(0.01, shape.height) * 0.9) / Math.max(0.01, reach));
  return Math.min(MAX_LOFT_TILT, Math.floor(THREE.MathUtils.radToDeg(Math.asin(ratio))));
}

function piecesToLoop(pieces: Piece[]): CadModifierProfileLoop {
  const start = pieceAt(pieces[0], 0);
  return {
    x: start.x,
    z: start.z,
    segments: pieces.map((piece) => {
      const end = pieceAt(piece, 1);
      if (piece.kind === "line") return { kind: "line" as const, x: end.x, z: end.z };
      return { kind: "arc" as const, x: end.x, z: end.z, cx: piece.cx, cz: piece.cz, rx: piece.rx, rz: piece.rz, start: piece.t0, end: piece.t1 };
    }),
  };
}

/**
 * The same loop with every piece a cubic Bezier curve: a line with its thirds as handles, an arc of
 * at most a quarter turn by the usual handle length (within 0.03 % of its radius). The kernel mixes
 * a turned loft's sections between bottom and top piece by piece, which needs pieces of one kind.
 */
function piecesToBezierLoop(pieces: Piece[]): CadModifierProfileLoop {
  const start = pieceAt(pieces[0], 0);
  return {
    x: start.x,
    z: start.z,
    segments: pieces.map((piece) => {
      const from = pieceAt(piece, 0);
      const end = pieceAt(piece, 1);
      if (piece.kind === "line") {
        return {
          kind: "bezier" as const,
          x: end.x,
          z: end.z,
          controls: [mix(from, end, 1 / 3), mix(from, end, 2 / 3)],
        };
      }
      const span = piece.t1 - piece.t0;
      const k = (4 / 3) * Math.tan(span / 4);
      const tangent = (t: number) => ({ x: -piece.rx * Math.sin(t), z: piece.rz * Math.cos(t) });
      const startTangent = tangent(piece.t0);
      const endTangent = tangent(piece.t1);
      return {
        kind: "bezier" as const,
        x: end.x,
        z: end.z,
        controls: [
          { x: from.x + startTangent.x * k, z: from.z + startTangent.z * k },
          { x: end.x - endTangent.x * k, z: end.z - endTangent.z * k },
        ],
      };
    }),
  };
}

/**
 * The loops of the exact body: outer first, the opening second, bottom and top piece for piece.
 * A turned or tilted loft also says how its sections turn and how high its top's middle stands.
 */
export type LoftProfileLoops = {
  loops: CadModifierProfileLoop[];
  topLoops: CadModifierProfileLoop[];
  smooth?: number;
  twist?: number;
  twistCenter?: Point;
  twistLean?: { x: number; z: number };
  tilt?: { x: number; z: number };
  height?: number;
};

export function loftProfileLoops(shape: LoftShapeFields): LoftProfileLoops {
  const { outer, inner } = loftPieces(shape);
  const turn = loftTurn(shape);
  const smooth = turn.measures.smooth;
  // A smooth transition is built through sections like a turned one, and the kernel mixes those piece by piece.
  const toLoop = turn.turned || smooth > 1e-9 ? piecesToBezierLoop : piecesToLoop;
  const loops = [toLoop(outer.bottom)];
  const topLoops = [toLoop(outer.top)];
  if (inner) {
    loops.push(toLoop(inner.bottom));
    topLoops.push(toLoop(inner.top));
  }
  if (!turn.turned && smooth <= 1e-9) return { loops, topLoops };
  return {
    loops,
    topLoops,
    ...(smooth > 1e-9 ? { smooth } : {}),
    twist: turn.measures.twist,
    twistCenter: turn.bottomMiddle,
    twistLean: { x: turn.topMiddle.x - turn.bottomMiddle.x, z: turn.topMiddle.z - turn.bottomMiddle.z },
    tilt: { x: turn.measures.tiltX, z: turn.measures.tiltZ },
    height: turn.lift,
  };
}

// --- Display mesh ----------------------------------------------------------------------------

/**
 * Steps along a piece pair: one for two lines, more for an arc, by how far it turns. A turned
 * loft winds even a straight side, so there every piece gets at least `least` steps - one long
 * twisted quad per row would fold, and its fold showed as a dark streak.
 */
function pieceSteps(a: Piece, b: Piece, least = 1, segments = DEFAULT_LOFT.segments) {
  const steps = (piece: Piece) => (piece.kind === "line" ? 1 : Math.max(2, Math.ceil(Math.abs(piece.t1 - piece.t0) / (TWO_PI / segments))));
  return Math.max(least, steps(a), steps(b));
}

/** Steps a straight side of a turned loft gets: more the further it winds. */
function turnedSideSteps(measures: Pick<LoftMeasures, "twist" | "tiltX" | "tiltZ">) {
  return loftIsTurned(measures) ? Math.min(24, Math.max(4, Math.ceil(Math.abs(measures.twist) / 10))) : 1;
}

/** Both outlines sampled at the same fractions of each piece: ring i of the bottom faces ring i of the top. */
function sampledRings(pair: LoftPieces, least = 1, segments = DEFAULT_LOFT.segments) {
  const bottom: Point[] = [];
  const top: Point[] = [];
  pair.bottom.forEach((piece, index) => {
    const partner = pair.top[index];
    const steps = pieceSteps(piece, partner, least, segments);
    for (let step = 0; step < steps; step += 1) {
      bottom.push(pieceAt(piece, step / steps));
      top.push(pieceAt(partner, step / steps));
    }
  });
  return { bottom, top };
}

/** How many rows up the wall keep the two triangles of every quad within a few degrees of each other. */
function wallRows(rings: { bottom: Point[]; top: Point[] }, height: number) {
  const count = rings.bottom.length;
  const at = (point: Point, y: number) => new THREE.Vector3(point.x, y, point.z);
  let worst = 0;
  for (let i = 0; i < count; i += 1) {
    const j = (i + 1) % count;
    const [b0, b1, t0, t1] = [at(rings.bottom[i], 0), at(rings.bottom[j], 0), at(rings.top[i], height), at(rings.top[j], height)];
    const first = new THREE.Vector3().crossVectors(t1.clone().sub(b0), b1.clone().sub(b0));
    const second = new THREE.Vector3().crossVectors(t0.clone().sub(b0), t1.clone().sub(b0));
    if (first.lengthSq() < 1e-18 || second.lengthSq() < 1e-18) continue;
    worst = Math.max(worst, first.angleTo(second));
  }
  return Math.min(32, Math.max(1, Math.ceil(THREE.MathUtils.radToDeg(worst) / 6)));
}

export function createLoftGeometry(shape: LoftShapeFields): THREE.BufferGeometry {
  const height = Math.max(0.01, shape.height);
  const { outer, inner } = loftPieces(shape);
  const turn = loftTurn(shape);
  const positions: number[] = [];
  const indices: number[] = [];
  const addRing = (points: Point3[]) => {
    const first = positions.length / 3;
    points.forEach((point) => positions.push(point.x, point.y, point.z));
    return first;
  };
  // A turned or tilted loft is built through the kernel's sections: every row of the wall is a
  // section, mixed between bottom and top, turned and tilted by its share and lifted.
  const smooth = turn.measures.smooth;
  const place = (point: Point, v: number): Point3 => turn.turned
    ? placeTurned(point, mix(turn.bottomMiddle, turn.topMiddle, loftEaseShare(v, smooth)), v, turn.measures, turn.lift)
    : { x: point.x, y: height * v, z: point.z };
  // The outlines run counter-clockwise (x towards z); seen that way a wall triangle
  // (bottom i, top i+1, bottom i+1) faces outwards, the opening's the other way round.
  // Where a small corner below meets a long side above the wall is twisted, and one quad from
  // bottom to top folds into two triangles up to 60 degrees apart - drawn as a zigzag of edge
  // lines. The wall is then cut into rows up the height, as many as that twist needs.
  const addWall = (rings: { bottom: Point[]; top: Point[] }, outward: boolean) => {
    const count = rings.bottom.length;
    const turnedRows = turn.turned ? Math.max(wallRows(rings, height), (loftSectionCount(turn.measures) - 1) * 2) : wallRows(rings, height);
    // The S-curve of a smooth transition needs rows to follow it.
    const rows = smooth > 1e-9 ? Math.max(turnedRows, 24) : turnedRows;
    const starts: number[] = [];
    for (let row = 0; row <= rows; row += 1) {
      const v = row / rows;
      const share = loftEaseShare(v, smooth);
      starts.push(addRing(rings.bottom.map((b, i) => place(mix(b, rings.top[i], share), v))));
    }
    for (let row = 0; row < rows; row += 1) {
      const b = starts[row];
      const t = starts[row + 1];
      for (let i = 0; i < count; i += 1) {
        const j = (i + 1) % count;
        if (outward) indices.push(b + i, t + j, b + j, b + i, t + i, t + j);
        else indices.push(b + i, b + j, t + j, b + i, t + j, t + i);
      }
    }
    return { bottom: starts[0], top: starts[rows] };
  };
  const outerRings = sampledRings(outer, turnedSideSteps(turn.measures), turn.measures.segments);
  const innerRings = inner ? sampledRings(inner, turnedSideSteps(turn.measures), turn.measures.segments) : null;
  const outerStart = addWall(outerRings, true);
  const innerStart = innerRings ? addWall(innerRings, false) : null;
  // The two ends on the walls' own rim points, the opening as a hole: facing down at the bottom,
  // up at the top. A tilted top is triangulated flat, before its turn, and keeps its facing.
  const addCap = (contour: Point[], contourStart: number, hole: Point[] | null, holeStart: number, up: boolean) => {
    const all = hole ? [...contour, ...hole] : contour;
    const index = (k: number) => (k < contour.length ? contourStart + k : holeStart + k - contour.length);
    THREE.ShapeUtils.triangulateShape(contour.map((p) => new THREE.Vector2(p.x, p.z)), hole ? [hole.map((p) => new THREE.Vector2(p.x, p.z))] : [])
      .forEach(([a, b, c]) => {
        // A triangle running counter-clockwise (x towards z) faces down.
        const area = (all[b].x - all[a].x) * (all[c].z - all[a].z) - (all[c].x - all[a].x) * (all[b].z - all[a].z);
        const facesDown = area > 0;
        if (facesDown === !up) indices.push(index(a), index(b), index(c));
        else indices.push(index(a), index(c), index(b));
      });
  };
  addCap(outerRings.bottom, outerStart.bottom, innerRings?.bottom ?? null, innerStart?.bottom ?? 0, false);
  addCap(outerRings.top, outerStart.top, innerRings?.top ?? null, innerStart?.top ?? 0, true);

  const indexed = new THREE.BufferGeometry();
  indexed.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  indexed.setIndex(indices);
  const geometry = toCreasedNormals(indexed, THREE.MathUtils.degToRad(30));
  indexed.dispose();
  geometry.computeBoundingBox();
  return geometry;
}
