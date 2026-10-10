import * as THREE from "three";
import { taperedSlotOutline } from "@/lib/slotGeometry";
import type { WorkplaneShape } from "@/types/layerling";
import type { CadModifierProfileLoop, CadModifierProfilePart, CadModifierProfileSegment, CadModifierHelicalGearPart, CadModifierSpringPart, CadModifierSweepPiece, CadModifierThreadPart } from "@/lib/cadModifierTypes";
import { profileArcPoint, profileLoopBounds, validateCadProfile } from "@/lib/cadProfileSolid";
import { cadTransformFromMatrix } from "@/lib/cadBakeMetadata";
import { CAD_MODIFIER_EXACT_SEGMENT_LIMIT } from "@/lib/cadModifierRuntime";
import { meshYawDegrees, mirrorSign, shapeDepth, shapeHasShapeDeform, shapeTaperDimensions, shapeWidth } from "@/lib/workplaneShapes";
import { regularPolygonFootprintScale } from "@/lib/regularPolygonFootprint";
import { roundSideCount } from "@/lib/roundSideCount";
import { drawnRound, ROUND_FROM_BENT_TUBE_QUALITY, ROUND_FROM_HALF_SPHERE_STEPS, ROUND_FROM_ROOF_SIDES, ROUND_FROM_SIDES, ROUND_FROM_SPHERE_STEPS } from "@/lib/roundness";
import { bentTubeLocalPlacement, bentTubePathPieces, bentTubeProfileRadii, bentTubeSelfIntersects, bentTubeSettings, profilePoints as bentTubeProfilePoints } from "@/lib/bentTubeGeometry";
import { sphereTessellation } from "@/lib/sphereTessellation";
import { normalizeStarInnerFillet, normalizeStarInnerSize, normalizeStarOuterFillet, normalizeStarPoints } from "@/lib/starGeometry";
import { normalizeHeartTipFillet } from "@/lib/heartGeometry";
import { buildCrescentContourPoints, normalizeCrescentQuality, normalizeCrescentThickness, normalizeCrescentTipFillet } from "@/lib/crescentGeometry";
import { buildHoneycombHoles, normalizeHoneycombCellSize, normalizeHoneycombFrameWidth, normalizeHoneycombWallThickness } from "@/lib/honeycombGeometry";
import { dovetailOutlineForShape } from "@/lib/dovetailGeometry";
import { loftProfileLoops } from "@/lib/loftGeometry";
import { teardropExactSection } from "@/lib/teardropGeometry";
import { screwHoleProfile } from "@/lib/screwHoleGeometry";
import { DEFAULT_ROUNDED_BOX_CORNER_FILLET, DEFAULT_ROUNDED_BOX_TOP_BOTTOM_FILLET, normalizeCornerFillet, normalizeTopBottomFillet } from "@/lib/roundedBoxGeometry";
import { textGlyphShapes } from "@/lib/textGeometry";
import { textFillComponents, textFillPieceGeometry, textHasFill } from "@/lib/textFill";
import { loadedManifoldRuntime } from "@/lib/manifoldHandle";
import { threadBuildPlan, WHITWORTH_PROFILE_CONSTANTS } from "@/lib/threadGeometry";
import { springBuildPlan, springRingSectionShare } from "@/lib/springGeometry";
import { knurlCorners, knurlSettings, roundKnurlWave } from "@/lib/knurlGeometry";
import { BEVEL_GEAR_TOP_SCALE, gearHelixTwist, gearOutlineCorners, internalGearMeasures, internalGearOutline, involuteFlankPoint, involuteGearMeasures, involuteOutlineStretch, involuteToothCentre, normalizeGearCenterHoleSize, normalizeGearProfile, normalizeGearToothSize, normalizeGearType, rackMeasures, rackOutlinePoints, rackToothArcs, roundGearMeasures, roundInternalMeasures, roundToothArcs, type GearOutlineOptions, type InternalGearOptions, type InvoluteGearMeasures, type RackOptions, type RoundWave } from "@/lib/gearGeometry";

/*
 * The outlines below follow the display geometry of each shape
 * (starGeometry.ts, heartGeometry.ts, ...) step by step, with one difference:
 * where the display mesh samples an arc into short chords, the outline keeps
 * the arc itself. Nothing is stored - the outline is rebuilt from the shape's
 * own parameters every time the edge tool starts.
 */

type Point = { x: number; z: number };
type Arc = { cx: number; cz: number; rx: number; rz: number; start: number; end: number };
type Corner = { start: Point; end: Point; arc?: Arc };

export const CAD_PROFILE_SHAPE_KINDS = new Set<WorkplaneShape["kind"]>(["polygon", "star", "heart", "crescent", "slot", "honeycomb", "gear", "knurl", "dovetail", "teardrop", "counterbore", "countersink", "ellipse", "cylinder", "tube", "ring", "halfSphere", "sphere", "cone", "roundRoof", "roundedBox", "text", "bentTube", "loft"]);

function shortestAngleDelta(from: number, to: number) {
  let delta = to - from;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}

/** Same corner measure as the display geometry: half the angle between the two edges. */
function cornerAngles(previous: Point, corner: Point, next: Point) {
  const dx1 = previous.x - corner.x;
  const dz1 = previous.z - corner.z;
  const length1 = Math.hypot(dx1, dz1) || 1;
  const dx2 = next.x - corner.x;
  const dz2 = next.z - corner.z;
  const length2 = Math.hypot(dx2, dz2) || 1;
  const dot = Math.max(-1, Math.min(1, (dx1 * dx2 + dz1 * dz2) / (length1 * length2)));
  const cosAlpha = Math.max(1e-4, Math.sqrt((1 + dot) / 2));
  const sinAlpha = Math.max(1e-4, Math.sqrt((1 - dot) / 2));
  return { sinAlpha, tanAlpha: sinAlpha / cosAlpha };
}

/** The circular arc that rounds a corner between two straight edges, tangent distance t, radius r. */
function roundedCorner(previous: Point, corner: Point, next: Point, t: number, r: number, sinAlpha: number): Corner {
  const length1 = Math.hypot(previous.x - corner.x, previous.z - corner.z) || 1;
  const length2 = Math.hypot(next.x - corner.x, next.z - corner.z) || 1;
  const u1 = { x: (previous.x - corner.x) / length1, z: (previous.z - corner.z) / length1 };
  const u2 = { x: (next.x - corner.x) / length2, z: (next.z - corner.z) / length2 };
  const bisectorLength = Math.hypot(u1.x + u2.x, u1.z + u2.z) || 1;
  const bisector = { x: (u1.x + u2.x) / bisectorLength, z: (u1.z + u2.z) / bisectorLength };
  const distance = r / sinAlpha;
  const center = { x: corner.x + distance * bisector.x, z: corner.z + distance * bisector.z };
  const t1 = { x: corner.x + t * u1.x, z: corner.z + t * u1.z };
  const t2 = { x: corner.x + t * u2.x, z: corner.z + t * u2.z };
  const start = Math.atan2(t1.z - center.z, t1.x - center.x);
  const end = start + shortestAngleDelta(start, Math.atan2(t2.z - center.z, t2.x - center.x));
  return { start: t1, end: t2, arc: { cx: center.x, cz: center.z, rx: r, rz: r, start, end } };
}

function arcSegment(arc: Arc): CadModifierProfileSegment {
  return { kind: "arc", ...profileArcPoint(arc, arc.end), ...arc };
}

/** A closed loop through the corners; each corner is either a point or an arc, joined by straight lines. */
function loopFromCorners(corners: Corner[]): CadModifierProfileLoop {
  const first = corners[0];
  const start = first.arc ? profileArcPoint(first.arc, first.arc.start) : first.start;
  const segments: CadModifierProfileSegment[] = [];
  let current = start;
  corners.forEach((corner, index) => {
    if (index > 0) {
      const target = corner.arc ? profileArcPoint(corner.arc, corner.arc.start) : corner.start;
      if (Math.hypot(target.x - current.x, target.z - current.z) > 1e-9) segments.push({ kind: "line", ...target });
      current = target;
    }
    if (corner.arc) {
      segments.push(arcSegment(corner.arc));
      current = profileArcPoint(corner.arc, corner.arc.end);
    }
  });
  if (Math.hypot(start.x - current.x, start.z - current.z) > 1e-9) segments.push({ kind: "line", ...start });
  return { ...start, segments };
}

/** A loop of straight lines only. */
function polygonLoop(points: Point[]): CadModifierProfileLoop {
  return loopFromCorners(points.map((point) => ({ start: point, end: point })));
}

/**
 * Scale and move a loop: x' = x * sx + ox, z' = z * sz + oz. A circle turns
 * into an axis-aligned ellipse, which the kernel builds exactly as well.
 */
function mapLoop(loop: CadModifierProfileLoop, sx: number, ox: number, sz: number, oz: number): CadModifierProfileLoop {
  const map = (point: Point) => ({ x: point.x * sx + ox, z: point.z * sz + oz });
  const segments = loop.segments.map((segment): CadModifierProfileSegment => {
    if (segment.kind === "line") return { kind: "line", ...map(segment) };
    if (segment.kind === "bezier") return { kind: "bezier", ...map(segment), controls: segment.controls.map(map) };
    return arcSegment({ cx: segment.cx * sx + ox, cz: segment.cz * sz + oz, rx: segment.rx * sx, rz: segment.rz * sz, start: segment.start, end: segment.end });
  });
  // Keep every joint exactly where the arc beside it starts or ends.
  const startArc = segments[0].kind === "arc" ? segments[0] : null;
  const start = startArc ? profileArcPoint(startArc, startArc.start) : map(loop);
  segments.forEach((segment, index) => {
    const next = segments[index + 1];
    if (segment.kind === "line" && next?.kind === "arc") Object.assign(segment, profileArcPoint(next, next.start));
  });
  const last = segments[segments.length - 1];
  if (last.kind === "line") Object.assign(last, start);
  return { ...start, segments };
}

/** The stretch and shift that fit a loop's true extent into [-width/2, width/2] x [-depth/2, depth/2]. */
function fitTransform(loop: CadModifierProfileLoop, width: number, depth: number) {
  const [minX, minZ, maxX, maxZ] = profileLoopBounds(loop);
  const sx = width / Math.max(1e-5, maxX - minX);
  const sz = depth / Math.max(1e-5, maxZ - minZ);
  return { sx, ox: -((minX + maxX) / 2) * sx, sz, oz: -((minZ + maxZ) / 2) * sz };
}

function fitLoop(loop: CadModifierProfileLoop, width: number, depth: number) {
  const fit = fitTransform(loop, width, depth);
  return mapLoop(loop, fit.sx, fit.ox, fit.sz, fit.oz);
}

/** createPrismGeometry: THREE.CylinderGeometry corners (sin, cos) fitted with regularPolygonFootprintScale. */
export function polygonProfileLoops(width: number, depth: number, sides = 6) {
  const count = Math.max(3, Math.round(sides));
  const fit = regularPolygonFootprintScale(width, depth, count);
  const points = Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2;
    return { x: Math.sin(angle) * fit.x + fit.offsetX, z: Math.cos(angle) * fit.z + fit.offsetZ };
  });
  return [polygonLoop(points)];
}

/** createStarGeometry / buildStarContourPoints, with the corner roundings as true arcs. */
export function starProfileLoops(
  width: number,
  depth: number,
  options: Pick<WorkplaneShape, "starPoints" | "starInnerSize" | "starOuterFillet" | "starInnerFillet">,
) {
  const safeWidth = Math.max(0.01, width);
  const safeDepth = Math.max(0.01, depth);
  const outerSize = Math.max(safeWidth, safeDepth);
  const count = normalizeStarPoints(options.starPoints);
  const innerSize = normalizeStarInnerSize(options.starInnerSize, outerSize);
  const outerFillet = normalizeStarOuterFillet(options.starOuterFillet);
  const innerFillet = normalizeStarInnerFillet(options.starInnerFillet);

  const outerRadius = Math.max(0.01, outerSize / 2);
  const innerRadius = Math.max(0.005, Math.min(outerRadius - 0.05, innerSize / 2));
  const total = count * 2;
  const base: Point[] = Array.from({ length: total }, (_, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI) / count;
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    return { x: radius * Math.cos(angle), z: radius * Math.sin(angle) };
  });
  const edgeLength = Math.hypot(base[1].x - base[0].x, base[1].z - base[0].z);
  const { tanAlpha: tanOuter } = cornerAngles(base[total - 1], base[0], base[1]);
  const { tanAlpha: tanInner } = cornerAngles(base[0], base[1], base[2]);
  let tOuter = outerFillet > 0 ? outerFillet / tanOuter : 0;
  let tInner = innerFillet > 0 ? innerFillet / tanInner : 0;
  const maxTangent = edgeLength * 0.96;
  if (tOuter + tInner > maxTangent && tOuter + tInner > 0) {
    const scale = maxTangent / (tOuter + tInner);
    tOuter *= scale;
    tInner *= scale;
  }
  const rOuter = tOuter * tanOuter;
  const rInner = tInner * tanInner;

  const corners = base.map((corner, index): Corner => {
    const isOuter = index % 2 === 0;
    const t = isOuter ? tOuter : tInner;
    const r = isOuter ? rOuter : rInner;
    if (t <= 1e-4 || r <= 1e-4) return { start: corner, end: corner };
    const previous = base[(index - 1 + total) % total];
    const next = base[(index + 1) % total];
    return roundedCorner(previous, corner, next, t, r, cornerAngles(previous, corner, next).sinAlpha);
  });
  return [mapLoop(loopFromCorners(corners), safeWidth / outerSize, 0, safeDepth / outerSize, 0)];
}

/** createHeartGeometry / buildHeartContourPoints: two lobes as true arcs, the tip rounded after fitting. */
export function heartProfileLoops(width: number, depth: number, options: Pick<WorkplaneShape, "heartTipFillet">) {
  const safeWidth = Math.max(0.01, width);
  const safeDepth = Math.max(0.01, depth);
  const fillet = normalizeHeartTipFillet(options.heartTipFillet);
  const R = 0.28;
  const xc = 0.22;
  const yc = 0.18;
  const yTip = 0.5;
  const phiBase = Math.atan2(-yc - yTip, -xc);
  const phiTangent = phiBase + Math.acos(Math.min(1, Math.max(-1, R / Math.hypot(xc, yc + yTip))));
  const yCleft = yc + Math.sqrt(Math.max(0, R * R - xc * xc));
  const phiCleft = Math.atan2(yCleft - yc, -xc);
  let sweep = phiCleft - phiTangent;
  while (sweep < 0) sweep += Math.PI * 2;
  const rightLobe: Arc = { cx: xc, cz: yc, rx: R, rz: R, start: phiTangent, end: phiTangent + sweep };
  const leftLobe: Arc = { cx: -xc, cz: yc, rx: R, rz: R, start: Math.PI - phiCleft, end: Math.PI - phiCleft + sweep };
  const tip = { x: 0, z: -yTip };
  const raw = loopFromCorners([
    { start: tip, end: tip },
    { start: profileArcPoint(rightLobe, rightLobe.start), end: profileArcPoint(rightLobe, rightLobe.end), arc: rightLobe },
    { start: profileArcPoint(leftLobe, leftLobe.start), end: profileArcPoint(leftLobe, leftLobe.end), arc: leftLobe },
  ]);
  const fitted = fitLoop(raw, safeWidth, safeDepth);
  if (fillet <= 0.01) return [fitted];

  // The tip lies between the two straight flanks: the loop starts at the tip,
  // its first segment is the right flank, its last one the left flank.
  const tipPoint = { x: fitted.x, z: fitted.z };
  const rightEnd = fitted.segments[0];
  const leftStart = fitted.segments[fitted.segments.length - 2];
  const edgeLength = Math.hypot(rightEnd.x - tipPoint.x, rightEnd.z - tipPoint.z);
  const { sinAlpha, tanAlpha } = cornerAngles(leftStart, tipPoint, rightEnd);
  const t = Math.min(edgeLength * 0.45, fillet / tanAlpha);
  const r = t * tanAlpha;
  if (t <= 0.01 || r <= 0.01) return [fitted];
  const rounded = roundedCorner(leftStart, tipPoint, rightEnd, t, r, sinAlpha);
  const arcs = fitted.segments.filter((segment): segment is Extract<CadModifierProfileSegment, { kind: "arc" }> => segment.kind === "arc");
  return [loopFromCorners([
    rounded,
    ...arcs.map((arc) => ({ start: profileArcPoint(arc, arc.start), end: profileArcPoint(arc, arc.end), arc })),
  ])];
}

/**
 * How far the display mesh cuts a crescent horn back: crescentGeometry rounds
 * the horn between its two neighbouring chords (applyFilletAt), and the middle
 * of that rounding lies on the bisector, r / sin(alpha) - r from the horn.
 * 0 when the display leaves the horn sharp.
 */
function crescentHornCut(chords: Array<{ x: number; y: number }>, index: number, fillet: number) {
  const count = chords.length;
  const horn = { x: chords[index].x, z: chords[index].y };
  const previous = { x: chords[(index - 1 + count) % count].x, z: chords[(index - 1 + count) % count].y };
  const next = { x: chords[(index + 1) % count].x, z: chords[(index + 1) % count].y };
  const length1 = Math.hypot(previous.x - horn.x, previous.z - horn.z);
  const length2 = Math.hypot(next.x - horn.x, next.z - horn.z);
  const { sinAlpha, tanAlpha } = cornerAngles(previous, horn, next);
  const t = Math.min(Math.min(length1, length2) * 0.4, fillet / tanAlpha);
  const r = t * tanAlpha;
  if (t <= 0.01 || r <= 0.01) return 0;
  return r / sinAlpha - r;
}

/**
 * createCrescentGeometry: the outer and inner circle as true arcs. Where the
 * display rounds a horn, the outline gets a circle that touches both true
 * circles (tangent, so the kernel sees one smooth wall), sized so the horn is
 * cut back exactly as far as on screen - measured after the crescent is
 * stretched to its width and depth, like the display's own rounding.
 */
export function crescentProfile(
  width: number,
  depth: number,
  options: Pick<WorkplaneShape, "crescentThickness" | "crescentTipFillet" | "crescentQuality">,
) {
  const safeWidth = Math.max(0.01, width);
  const safeDepth = Math.max(0.01, depth);
  const thickness = normalizeCrescentThickness(options.crescentThickness, safeWidth);
  const fillet = normalizeCrescentTipFillet(options.crescentTipFillet);
  const quality = normalizeCrescentQuality(options.crescentQuality);
  const halfW = safeWidth / 2;
  const halfD = safeDepth / 2;
  const xo = (safeDepth * safeDepth) / (8 * safeWidth);
  const Ro = halfW + xo;
  const xin = -halfW + thickness;
  const xi = (safeWidth * safeWidth / 4 + safeDepth * safeDepth / 4 - xin * xin) / (2 * (safeWidth - thickness));
  const Ri = xi - xin;
  const phiO1 = Math.atan2(-halfD, halfW - xo);
  const phiO2 = Math.atan2(halfD, halfW - xo);
  const phiI1 = Math.atan2(-halfD, halfW - xi);
  const phiI2 = Math.atan2(halfD, halfW - xi);
  let deltaOuter = phiO2 - phiO1;
  if (deltaOuter > 0) deltaOuter -= Math.PI * 2;
  let deltaInner = phiI1 - phiI2;
  if (deltaInner < 0) deltaInner += Math.PI * 2;
  const outer: Arc = { cx: xo, cz: 0, rx: Ro, rz: Ro, start: phiO1, end: phiO1 + deltaOuter };
  const inner: Arc = { cx: xi, cz: 0, rx: Ri, rz: Ri, start: phiI2, end: phiI2 + deltaInner };
  // The display fits the sharp crescent into width x depth first and rounds
  // the horns afterwards; the same stretch applies to the rounded outline.
  const sharp: CadModifierProfileLoop = { ...profileArcPoint(outer, outer.start), segments: [arcSegment(outer), arcSegment(inner)] };
  const fit = fitTransform(sharp, safeWidth, safeDepth);

  const chords = fillet > 0.01 ? buildCrescentContourPoints(safeWidth, safeDepth, thickness, 0, quality) : [];
  const outerSteps = Math.max(8, Math.round(quality / 2));
  const TWO_PI = Math.PI * 2;
  const distance = Math.abs(xi - xo);
  const direction = Math.sign(xi - xo) || 1;
  /** Centre of the circle of radius rho inside the crescent that touches both circles, on this horn's side. */
  const touchingCenter = (rho: number, side: number) => {
    const r1 = Ro - rho;
    const r2 = Ri + rho;
    const along = (r1 * r1 - r2 * r2 + distance * distance) / (2 * distance);
    const across = r1 * r1 - along * along;
    return across > 0 ? { x: xo + direction * along, z: side * Math.sqrt(across) } : null;
  };
  /** The horn, sharp or rounded: where the outer circle ends, where the inner one starts, and the rounding between. */
  const horn = (side: number, cut: number) => {
    const sharpOuter = side > 0 ? phiO2 : phiO1;
    const sharpInner = side > 0 ? phiI2 : phiI1;
    if (cut <= 0) return { outerAngle: sharpOuter, innerAngle: sharpInner, rounding: null };
    const point = { x: halfW, z: side * halfD };
    const stretchedCut = (rho: number) => {
      const center = touchingCenter(rho, side);
      if (!center) return Number.POSITIVE_INFINITY;
      const toHorn = Math.hypot(point.x - center.x, point.z - center.z) || 1;
      const nearest = { x: center.x + (rho * (point.x - center.x)) / toHorn, z: center.z + (rho * (point.z - center.z)) / toHorn };
      return Math.hypot((nearest.x - point.x) * fit.sx, (nearest.z - point.z) * fit.sz);
    };
    // The cut grows from 0 as the circle grows; find where it first reaches the display's.
    const largest = (Ro - Ri + distance) / 2;
    let low = 0;
    let high = 0;
    for (let step = 1; step <= 400; step += 1) {
      const rho = (largest * step) / 401;
      if (stretchedCut(rho) >= cut) {
        high = rho;
        break;
      }
      low = rho;
    }
    if (high <= 0) throw new Error("The crescent horn rounding does not fit this crescent");
    for (let iteration = 0; iteration < 80; iteration += 1) {
      const middle = (low + high) / 2;
      if (stretchedCut(middle) >= cut) high = middle;
      else low = middle;
    }
    const rho = high;
    const center = touchingCenter(rho, side) as Point;
    const outerAngle = Math.atan2(center.z, center.x - xo);
    const innerAngle = Math.atan2(center.z, center.x - xi);
    // Seen from the rounding's centre the outer circle lies straight away from
    // the outer centre, the inner circle straight towards the inner centre.
    const atOuter = outerAngle;
    const atInner = innerAngle + Math.PI;
    const rounding = side > 0
      ? { cx: center.x, cz: center.z, rx: rho, rz: rho, start: atOuter, end: atOuter + shortestAngleDelta(atOuter, atInner) }
      : { cx: center.x, cz: center.z, rx: rho, rz: rho, start: atInner, end: atInner + shortestAngleDelta(atInner, atOuter) };
    return { outerAngle, innerAngle, rounding };
  };
  const upper = horn(1, chords.length ? crescentHornCut(chords, outerSteps, fillet) : 0);
  const lower = horn(-1, chords.length ? crescentHornCut(chords, 0, fillet) : 0);
  const outerArc: Arc = {
    cx: xo, cz: 0, rx: Ro, rz: Ro,
    start: lower.outerAngle,
    end: lower.outerAngle - ((((lower.outerAngle - upper.outerAngle) % TWO_PI) + TWO_PI) % TWO_PI),
  };
  const innerArc: Arc = {
    cx: xi, cz: 0, rx: Ri, rz: Ri,
    start: upper.innerAngle,
    end: upper.innerAngle + ((((lower.innerAngle - upper.innerAngle) % TWO_PI) + TWO_PI) % TWO_PI),
  };
  const segments = [outerArc, upper.rounding, innerArc, lower.rounding]
    .filter((arc): arc is Arc => arc !== null)
    .map(arcSegment);
  const rounded: CadModifierProfileLoop = { ...profileArcPoint(outerArc, outerArc.start), segments };
  return { loops: [mapLoop(rounded, fit.sx, fit.ox, fit.sz, fit.oz)] };
}

/** createSlotGeometry: two straight sides and two half circles (or one circle when the slot is round). */
export function slotProfileLoops(width: number, depth: number, slotEndRatio?: number) {
  const safeW = Math.max(0.01, width);
  const safeD = Math.max(0.01, depth);
  const corners: Corner[] = [];
  const half = (arc: Arc): Corner => ({ start: profileArcPoint(arc, arc.start), end: profileArcPoint(arc, arc.end), arc });
  // A smaller second end (#206): two arcs on their circles, the tangents between them added as lines.
  const tapered = taperedSlotOutline(safeW, safeD, slotEndRatio);
  if (tapered) {
    const { alongX, R, r, largeU, smallU, angle } = tapered;
    if (alongX) {
      corners.push(half({ cx: smallU, cz: 0, rx: r, rz: r, start: -angle, end: angle }));
      corners.push(half({ cx: largeU, cz: 0, rx: R, rz: R, start: angle, end: 2 * Math.PI - angle }));
    } else {
      // Along z the long axis turns a quarter: the same outline, its angles turned to run from +z.
      const turn = Math.PI / 2;
      corners.push(half({ cx: 0, cz: smallU, rx: r, rz: r, start: turn - angle, end: turn + angle }));
      corners.push(half({ cx: 0, cz: largeU, rx: R, rz: R, start: turn + angle, end: turn + 2 * Math.PI - angle }));
    }
    return [loopFromCorners(corners)];
  }
  if (safeW >= safeD) {
    const R = safeD / 2;
    const hx = (safeW - safeD) / 2 > 1e-4 ? (safeW - safeD) / 2 : 0;
    corners.push(half({ cx: hx, cz: 0, rx: R, rz: R, start: -Math.PI / 2, end: Math.PI / 2 }));
    corners.push(half({ cx: -hx, cz: 0, rx: R, rz: R, start: Math.PI / 2, end: (3 * Math.PI) / 2 }));
  } else {
    const R = safeW / 2;
    const hz = (safeD - safeW) / 2 > 1e-4 ? (safeD - safeW) / 2 : 0;
    corners.push(half({ cx: 0, cz: hz, rx: R, rz: R, start: 0, end: Math.PI }));
    corners.push(half({ cx: 0, cz: -hz, rx: R, rz: R, start: Math.PI, end: Math.PI * 2 }));
  }
  return [loopFromCorners(corners)];
}

/** createHoneycombGeometry: a rectangle with the same hexagon (and half-hexagon) holes. */
export function honeycombProfileLoops(
  width: number,
  depth: number,
  options: Pick<WorkplaneShape, "honeycombCellSize" | "honeycombWallThickness" | "honeycombFrameWidth">,
) {
  const safeWidth = Math.max(0.001, width);
  const safeDepth = Math.max(0.001, depth);
  const round = (value: number) => Math.round(value * 1e5) / 1e5;
  const holes = buildHoneycombHoles(
    safeWidth,
    safeDepth,
    normalizeHoneycombCellSize(options.honeycombCellSize),
    normalizeHoneycombWallThickness(options.honeycombWallThickness),
    normalizeHoneycombFrameWidth(options.honeycombFrameWidth),
  );
  const outer = polygonLoop([
    { x: round(-safeWidth / 2), z: round(-safeDepth / 2) },
    { x: round(safeWidth / 2), z: round(-safeDepth / 2) },
    { x: round(safeWidth / 2), z: round(safeDepth / 2) },
    { x: round(-safeWidth / 2), z: round(safeDepth / 2) },
  ]);
  return [outer, ...holes.map((hole) => polygonLoop(hole.map((point) => ({ x: point.x, z: point.y }))))];
}

/** Shortest distance from the origin to the segment a-b. */
function originDistanceToSegment(a: Point, b: Point) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const lengthSquared = dx * dx + dz * dz;
  const t = lengthSquared > 0 ? Math.max(0, Math.min(1, -(a.x * dx + a.z * dz) / lengthSquared)) : 0;
  return Math.hypot(a.x + t * dx, a.z + t * dz);
}

/**
 * createGearGeometry for the spur gear: four corners per tooth (root, tip,
 * tip, root) on the root and tip ellipses, the ring then stretched to exactly
 * width x depth - all straight lines, as on screen. The bore is a true circle
 * of the centre hole's diameter, where the display draws it as a polygon of
 * teeth x 4 sides (at 12 teeth the polygon lies 0.2 % inside the circle) - one
 * round face to fillet or chamfer instead of dozens of flat ones, like the
 * exact cylinder the edge tool already uses for a faceted cylinder.
 * A bevel gear lofts this outline (bevelGearProfile), a helical gear turns it
 * as it rises (cadModifierHelicalGearForShape).
 */
export function gearProfileLoops(
  width: number,
  depth: number,
  options: GearProfileOptions,
) {
  const { outline, loop, boreRadius } = gearOutline(width, depth, options);
  const loops = [loop];
  if (boreRadius > 0) loops.push(boreLoop(outline, boreRadius));
  return loops;
}

type GearProfileOptions = GearOutlineOptions & Pick<WorkplaneShape, "centerHoleSize">;

/** Cubic pieces along each involute flank; two keep the curve within a thousandth of a module. */
const INVOLUTE_FLANK_PIECES = 2;
/** The shortest handle a flank piece gets, as a share of its chord. */
const INVOLUTE_BASE_HANDLE = 0.02;

/**
 * Involute teeth (#201) as the kernel builds them: each flank as cubic Bezier pieces that
 * match the involute's position and direction at both ends, the tip and the root on their
 * circles, and below the base circle a straight line down to the root. The display draws
 * the same curve through its corners (gearOutlineCorners).
 */
export function involuteGearLoop(measures: InvoluteGearMeasures): CadModifierProfileLoop {
  const { teeth, rootRadius, flankRadius, tipRadius, rollStart, rollEnd } = measures;
  const radial = rootRadius < flankRadius - 1e-9;
  const polar = (angle: number, radius: number) => ({ x: Math.cos(angle) * radius, z: Math.sin(angle) * radius });
  const flankAngle = (centre: number, side: -1 | 1, roll: number) => centre + side * (measures.flankTurn - (roll - Math.atan(roll)));
  const segments: CadModifierProfileSegment[] = [];
  // Hermite pieces by the roll angle, which follow the involute closely. At the base circle
  // its derivative is zero, and a curve that stands still there fails a fillet: that end
  // gets a short tangent straight outwards, the way the flank leaves the base circle.
  const flank = (centre: number, side: -1 | 1, from: number, to: number) => {
    const handle = (point: ReturnType<typeof involuteFlankPoint>, span: number, chord: number) => {
      const x = point.dx * span;
      const z = point.dz * span;
      const least = chord * INVOLUTE_BASE_HANDLE;
      if (Math.hypot(x, z) >= least) return { x, z };
      const radius = Math.hypot(point.x, point.z);
      return { x: (point.x / radius) * least * Math.sign(span), z: (point.z / radius) * least * Math.sign(span) };
    };
    for (let piece = 0; piece < INVOLUTE_FLANK_PIECES; piece += 1) {
      const a = from + ((to - from) * piece) / INVOLUTE_FLANK_PIECES;
      const b = from + ((to - from) * (piece + 1)) / INVOLUTE_FLANK_PIECES;
      const start = involuteFlankPoint(measures, centre, side, a);
      const end = involuteFlankPoint(measures, centre, side, b);
      const span = (b - a) / 3;
      const chord = Math.hypot(end.x - start.x, end.z - start.z);
      const out = handle(start, span, chord);
      const into = handle(end, span, chord);
      segments.push({
        kind: "bezier",
        x: end.x,
        z: end.z,
        controls: [
          { x: start.x + out.x, z: start.z + out.z },
          { x: end.x - into.x, z: end.z - into.z },
        ],
      });
    }
  };
  const firstCentre = involuteToothCentre(teeth, 0);
  const start = polar(flankAngle(firstCentre, -1, rollStart), rootRadius);
  for (let tooth = 0; tooth < teeth; tooth += 1) {
    const centre = involuteToothCentre(teeth, tooth);
    if (radial) segments.push({ kind: "line", ...polar(flankAngle(centre, -1, rollStart), flankRadius) });
    flank(centre, -1, rollStart, rollEnd);
    segments.push(arcSegment({ cx: 0, cz: 0, rx: tipRadius, rz: tipRadius, start: flankAngle(centre, -1, rollEnd), end: flankAngle(centre, 1, rollEnd) }));
    flank(centre, 1, rollEnd, rollStart);
    if (radial) segments.push({ kind: "line", ...polar(flankAngle(centre, 1, rollStart), rootRadius) });
    const nextCentre = centre + (Math.PI * 2) / teeth;
    segments.push(arcSegment({ cx: 0, cz: 0, rx: rootRadius, rz: rootRadius, start: flankAngle(centre, 1, rollStart), end: flankAngle(nextCentre, -1, rollStart) }));
  }
  return { ...start, segments };
}

/**
 * Round teeth and the round knurl (#201) as the kernel builds them: per tooth its convex arc over
 * the tip and the concave arc over the root of the gap after it, true circles touching smoothly.
 */
export function roundGearLoop(measures: RoundWave): CadModifierProfileLoop {
  const segments: CadModifierProfileSegment[] = [];
  for (let tooth = 0; tooth < measures.teeth; tooth += 1) {
    const { tooth: crest, gap } = roundToothArcs(measures, tooth);
    segments.push(arcSegment({ cx: crest.x, cz: crest.z, rx: crest.radius, rz: crest.radius, start: crest.start, end: crest.end }));
    segments.push(arcSegment({ cx: gap.x, cz: gap.z, rx: gap.radius, rz: gap.radius, start: gap.start, end: gap.end }));
  }
  const first = roundToothArcs(measures, 0).tooth;
  return { x: first.x + first.radius * Math.cos(first.start), z: first.z + first.radius * Math.sin(first.start), segments };
}

/** The gear's outline stretched to width x depth (createGearGeometry), its loop for the kernel and its bore radius. */
function gearOutline(width: number, depth: number, options: GearProfileOptions) {
  const safeWidth = Math.max(0.01, width);
  const safeDepth = Math.max(0.01, depth);
  const toothSize = normalizeGearToothSize(options.toothSize, safeWidth, safeDepth);
  const centerHoleSize = normalizeGearCenterHoleSize(options.centerHoleSize, safeWidth, safeDepth, toothSize, options);
  const raw: Point[] = gearOutlineCorners(safeWidth, safeDepth, options).map((corner) => ({ x: Math.cos(corner.angle) * corner.radiusX, z: Math.sin(corner.angle) * corner.radiusZ }));
  const involute = involuteOutlineStretch(safeWidth, safeDepth, options);
  if (involute) {
    const outline = raw.map((point) => ({ x: point.x * involute.x, z: point.z * involute.z }));
    const exact = normalizeGearProfile(options.gearProfile) === "round"
      ? roundGearLoop(roundGearMeasures(safeWidth, safeDepth, options))
      : involuteGearLoop(involuteGearMeasures(safeWidth, safeDepth, options));
    const loop = mapLoop(exact, involute.x, 0, involute.z, 0);
    return { outline, loop, boreRadius: centerHoleSize / 2 };
  }
  // The display stretches the ring about the origin until it spans width x depth.
  const xs = raw.map((point) => point.x);
  const zs = raw.map((point) => point.z);
  const scaleX = safeWidth / Math.max(Number.EPSILON, Math.max(...xs) - Math.min(...xs));
  const scaleZ = safeDepth / Math.max(Number.EPSILON, Math.max(...zs) - Math.min(...zs));
  const outline = raw.map((point) => ({ x: point.x * scaleX, z: point.z * scaleZ }));
  return { outline, loop: polygonLoop(outline), boreRadius: centerHoleSize / 2 };
}

/** How near the outline comes to the axis. */
function outlineClearance(outline: Point[]) {
  return Math.min(...outline.map((point, index) => originDistanceToSegment(point, outline[(index + 1) % outline.length])));
}

/** A circle (or an axis-aligned ellipse) about the origin as a loop, in two halves. */
function circleLoop(radiusX: number, radiusZ = radiusX) {
  const half = (start: number): Corner => {
    const arc: Arc = { cx: 0, cz: 0, rx: radiusX, rz: radiusZ, start, end: start + Math.PI };
    return { start: profileArcPoint(arc, arc.start), end: profileArcPoint(arc, arc.end), arc };
  };
  return loopFromCorners([half(0), half(Math.PI)]);
}

/** The bore as a true circle, in two halves; it has to stay clear of the outline. */
function boreLoop(outline: Point[], radius: number) {
  // A bore reaching the teeth cuts the outline; the display mesh then folds
  // over itself and the shape stays on its old path.
  if (!(radius < outlineClearance(outline) * 0.999)) throw new Error("The gear's centre hole reaches its teeth");
  return circleLoop(radius);
}

/**
 * A ring gear (#201) as the kernel builds it: the rim's circle round the teeth of a gear turned
 * inside out - the same involute curves or true arcs as the external gear's - both stretched to
 * width x depth as the display stretches them.
 */
export function internalGearLoops(width: number, depth: number, options: InternalGearOptions) {
  const safeWidth = Math.max(0.01, width);
  const safeDepth = Math.max(0.01, depth);
  const teeth = normalizeGearProfile(options.gearProfile) === "round"
    ? roundGearLoop(roundInternalMeasures(safeWidth, safeDepth, options))
    : involuteGearLoop(internalGearMeasures(safeWidth, safeDepth, options));
  const { rimRadius, stretch } = internalGearOutline(safeWidth, safeDepth, options);
  return [circleLoop(rimRadius * stretch.x, rimRadius * stretch.z), mapLoop(teeth, stretch.x, 0, stretch.z, 0)];
}

/**
 * A rack (#201) as the kernel builds it: straight flanks at the pressure angle, all lines as
 * drawn - or the round wave's true arcs on the bar.
 */
export function rackLoop(width: number, depth: number, options: RackOptions): CadModifierProfileLoop {
  const measures = rackMeasures(Math.max(0.01, width), Math.max(0.01, depth), options);
  if (measures.profile === "involute") return polygonLoop(rackOutlinePoints(measures));
  const { length, backZ, rootZ, gapRadius, touchAngle } = measures;
  const arcCorner = (arc: { x: number; z: number; radius: number; start: number; end: number }): Corner => {
    const shape: Arc = { cx: arc.x, cz: arc.z, rx: arc.radius, rz: arc.radius, start: arc.start, end: arc.end };
    return { start: profileArcPoint(shape, shape.start), end: profileArcPoint(shape, shape.end), arc: shape };
  };
  const corners: Corner[] = [
    { start: { x: -length / 2, z: backZ }, end: { x: -length / 2, z: backZ } },
    { start: { x: length / 2, z: backZ }, end: { x: length / 2, z: backZ } },
    arcCorner({ x: length / 2, z: rootZ + gapRadius, radius: gapRadius, start: -Math.PI / 2, end: -Math.PI + touchAngle }),
  ];
  for (let tooth = measures.teeth - 1; tooth >= 0; tooth -= 1) {
    const arcs = rackToothArcs(measures, tooth);
    corners.push(arcCorner(arcs.tooth), arcCorner(arcs.gap));
  }
  return loopFromCorners(corners);
}

/**
 * A bevel gear: the spur gear's outline at the foot and the same outline
 * shrunk to BEVEL_GEAR_TOP_SCALE at the top, every corner joined to its
 * partner by a straight line (createGearGeometry's two rings), round the
 * straight bore. Shrinking about the axis while rising is a scaling about
 * the apex where those lines meet, so every side is a flat face - the loft
 * builds them as planes.
 */
function bevelGearProfile(shape: WorkplaneShape, width: number, depth: number): CadModifierProfilePart {
  const { outline, loop, boreRadius } = gearOutline(width, depth, shape);
  const top = outline.map((point) => ({ x: point.x * BEVEL_GEAR_TOP_SCALE, z: point.z * BEVEL_GEAR_TOP_SCALE }));
  const loops = [loop];
  const topLoops = [mapLoop(loop, BEVEL_GEAR_TOP_SCALE, 0, BEVEL_GEAR_TOP_SCALE, 0)];
  if (boreRadius > 0) {
    // The bore keeps its size up the gear, so it has to clear the smaller top.
    loops.push(boreLoop(top, boreRadius));
    topLoops.push(boreLoop(top, boreRadius));
  }
  const part: CadModifierProfilePart = { kind: "loft", loops, topLoops, height: shape.height, transform: profileTransformForShape(shape) };
  validateCadProfile(part);
  return part;
}

/** Straight text is laid out at this size and then scaled into its frame (createTextGeometry). */
/**
 * The transition (#188): its bottom and top outline, cut into partner pieces, joined by a
 * ruled loft; with a wall the opening is a second pair of loops, lofted and taken away.
 */
function loftShapeProfile(shape: WorkplaneShape): CadModifierProfilePart {
  // A turned or tilted transition (#205) also brings its turn, its tilt and its top's middle height.
  const { loops, topLoops, height, ...turn } = loftProfileLoops(shape);
  const part: CadModifierProfilePart = { kind: "loft", loops, topLoops, height: height ?? shape.height, ...turn, transform: profileTransformForShape(shape) };
  validateCadProfile(part);
  return part;
}

type GlyphPath = { curves: Array<THREE.Curve<THREE.Vector2>> };

/**
 * One closed outline of a glyph with the font's own curves: straight lines and
 * quadratic or cubic Bezier curves, mapped by `map`. With `straight` (the
 * Stencil face, drawn with one segment per curve) every curve becomes the line
 * between its ends, as on screen. Null when the outline has nothing to build.
 */
function glyphLoop(path: GlyphPath, map: (point: THREE.Vector2) => Point, straight: boolean): CadModifierProfileLoop | null {
  const segments: CadModifierProfileSegment[] = [];
  let start: Point | null = null;
  let current: Point | null = null;
  const same = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.z - b.z) <= 1e-9;
  const lineTo = (point: Point) => {
    if (current && same(current, point)) return;
    segments.push({ kind: "line", ...point });
    current = point;
  };
  for (const curve of path.curves) {
    let points: THREE.Vector2[];
    if (curve instanceof THREE.LineCurve) points = [curve.v1, curve.v2];
    else if (curve instanceof THREE.QuadraticBezierCurve) points = [curve.v0, curve.v1, curve.v2];
    else if (curve instanceof THREE.CubicBezierCurve) points = [curve.v0, curve.v1, curve.v2, curve.v3];
    else throw new Error("A glyph uses a curve the exact outline does not know");
    const mapped = points.map(map);
    if (!start || !current) {
      start = mapped[0];
      current = mapped[0];
    } else if (!same(current, mapped[0])) {
      lineTo(mapped[0]);
    }
    const end = mapped[mapped.length - 1];
    const controls = mapped.slice(1, -1);
    if (straight || controls.length === 0) {
      lineTo(end);
    } else if (!(same(current as Point, end) && controls.every((control) => same(current as Point, control)))) {
      segments.push({ kind: "bezier", ...end, controls });
      current = end;
    }
  }
  if (!start || !current) return null;
  if (!same(current, start)) lineTo(start);
  const last = segments[segments.length - 1];
  // Close exactly on the start point, whichever piece ends the outline.
  if (last) Object.assign(last, start);
  return segments.length >= 2 ? { ...(start as Point), segments } : null;
}

/**
 * The glyphs of a raised text as exact outlines, in the order createTextGeometry
 * extrudes them (font.generateShapes), each with the number of triangles its
 * display mesh gets - which is how the edge tool's glyph pieces are told
 * apart. Straight text takes its scale and centre from the same sampled
 * points the display measures; curved text puts each character through the
 * matrix its display glyph is placed with (curvedTextLayout) and the same fit
 * into the box. So every glyph lands exactly on its display mesh; only the
 * curves themselves are exact. Null for bevelled or deformed text (those stay on
 * the mesh path) or when the font cannot be read.
 */
export function textGlyphProfiles(shape: WorkplaneShape) {
  // Taper, twist and lean reshape the display mesh the outlines are matched
  // to; such a text, like a baked or already treated one, keeps its mesh.
  if (shape.kind !== "text" || shape.importedMesh || shape.cadBrep || shapeHasShapeDeform(shape)) return null;
  const bevel = Math.min(8, Math.max(0, shape.bevel ?? 0));
  if (bevel > 0) return null;
  const width = shapeWidth(shape);
  const depth = shapeDepth(shape);
  if (![width, depth, shape.height].every((value) => Number.isFinite(value) && value > 0)) return null;
  const transform = profileTransformForShape(shape);
  // A text with a fill mode (#215) is the loose pieces its stroke or widening left - letters
  // that run together are one piece - each with its outline as straight lines, as drawn.
  if (textHasFill(shape)) {
    const runtime = loadedManifoldRuntime();
    if (!runtime) return null;
    const components = textFillComponents(runtime, shape);
    if (!components) return null;
    const pointLoop = (points: Point[]): CadModifierProfileLoop => ({
      ...points[0],
      segments: [...points.slice(1), points[0]].map((point) => ({ kind: "line", x: point.x, z: point.z })),
    });
    return components.map((component) => {
      const geometry = textFillPieceGeometry(component, shape.height);
      const triangleCount = geometry.getAttribute("position").count / 3;
      geometry.dispose();
      let profile: CadModifierProfilePart | null = null;
      try {
        const candidate: CadModifierProfilePart = { kind: "extrusion", loops: [component.outer, ...component.holes].map(pointLoop), height: shape.height, transform };
        validateCadProfile(candidate);
        profile = candidate;
      } catch {
        profile = null;
      }
      return { profile, triangleCount };
    });
  }
  const shapes = textGlyphShapes(shape);
  if (!shapes) return null;
  const { glyphs, curveSegments } = shapes;
  return glyphs.map(({ glyph, map }) => {
    const extruded = new THREE.ExtrudeGeometry(glyph, { depth: shape.height, curveSegments, bevelEnabled: false });
    const triangleCount = extruded.getAttribute("position").count / 3;
    extruded.dispose();
    let profile: CadModifierProfilePart | null = null;
    try {
      const outer = glyphLoop(glyph, map, curveSegments === 1);
      const holes = glyph.holes.map((hole) => glyphLoop(hole, map, curveSegments === 1));
      if (outer && holes.every((hole) => hole !== null)) {
        const candidate: CadModifierProfilePart = { kind: "extrusion", loops: [outer, ...(holes as CadModifierProfileLoop[])], height: shape.height, transform };
        validateCadProfile(candidate);
        profile = candidate;
      }
    } catch {
      profile = null;
    }
    return { profile, triangleCount };
  });
}

/**
 * How a profile stands in the shape's own frame when it is not simply pushed
 * up from the bottom: a turned section, or an extrusion laid on its side.
 * `local` maps the solid the profile builds (extruded along +y from y = 0, or
 * turned around the Z axis) into the shape's local frame.
 */
type ProfileFrame = { kind: "extrusion" | "revolution" | "sweep"; height: number; local: THREE.Matrix4; path?: CadModifierSweepPiece[] };

/**
 * The bent tube: its cross-section swept along straight runs and true
 * circular bends (bentTubePathPieces), placed in the shape's frame the way
 * createBentTubeGeometry places the display mesh. A round profile drawn with
 * fewer corners than the tube's own default keeps the display mesh unless it
 * is still within EXACT_ROUND_TOLERANCE of the circle - the rule the round
 * catalog shapes follow (#57) - unless `designedRound` asks for the round
 * body anyway, as STEP export does.
 */
function bentTubeSweep(shape: WorkplaneShape, width: number, depth: number, designedRound = false): { loops: CadModifierProfileLoop[]; frame: ProfileFrame } | null {
  const settings = bentTubeSettings(shape);
  const hasRound = settings.profile === "round" || settings.innerProfile === "round";
  // Designed round (STEP): the circle through the drawn corners, placed where the drawn tube stands.
  if (hasRound && !designedRound && !drawnRound(shape.bentTubeQuality, ROUND_FROM_BENT_TUBE_QUALITY, settings.quality, settings.size, settings.size)) return null;
  // A tube that runs into itself overlaps its own pieces; fusing those can
  // take the kernel minutes (measured: a twelve-piece hexagon tube, still
  // running after six) - it keeps the display mesh, as before, and the
  // editor's warning.
  if (bentTubeSelfIntersects(shape)) return null;
  const radii = bentTubeProfileRadii(settings);
  // A profile point (a, b) in the tube's (u, v) section lies at x = b, z = a in the swept section.
  const section = (kind: typeof settings.profile, radius: number) => (kind === "round"
    ? ellipseLoop(radius, radius)
    : polygonLoop(bentTubeProfilePoints(kind, radius, settings.quality).map(([a, b]) => ({ x: b, z: a }))));
  const loops = [section(settings.profile, radii.outer)];
  if (settings.innerProfile !== "none" && radii.inner !== null) loops.push(section(settings.innerProfile, radii.inner));
  const path: CadModifierSweepPiece[] = bentTubePathPieces(settings).map((piece) => (piece.kind === "straight"
    ? { kind: "straight", frame: piece.frame, length: piece.length }
    : { kind: "bend", frame: piece.frame, center: [...piece.center], axis: [...piece.axis], angle: piece.angle }));
  if (!path.length) return null;
  const length = settings.segments.reduce((total, segment) => total + segment.length + (Math.abs(segment.bendAngle) * Math.PI / 180) * segment.bendRadius, 0);
  const { centre, factor } = bentTubeLocalPlacement({ ...shape, width, depth, height: shape.height });
  const local = new THREE.Matrix4().makeScale(factor[0], factor[1], factor[2])
    .multiply(new THREE.Matrix4().makeTranslation(-centre[0], -centre[1], -centre[2]));
  return { loops, frame: { kind: "sweep", height: length, local, path } };
}

/** Outline loops (and horn roundings) of a supported shape in its local frame, or null. */
/**
 * A full ellipse (or circle) around the origin, starting at (rx, 0): one arc
 * once round, which the kernel builds as one closed edge - one rim to pick,
 * as on the round cylinder, instead of two halves.
 */
function ellipseLoop(rx: number, rz: number): CadModifierProfileLoop {
  return { x: rx, z: 0, segments: [arcSegment({ cx: 0, cz: 0, rx, rz, start: 0, end: Math.PI * 2 })] };
}

/**
 * Stands a turned section's axis up (section z -> local y), then stretches
 * local z by `stretch`: a body round in plan made as wide in depth as the
 * display draws it. The worker applies a stretched placement with a general
 * transform.
 */
function upright(stretch = 1) {
  return new THREE.Matrix4().makeScale(1, 1, stretch).multiply(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
}

/** A rectangle with all four corners rounded by `radius`, counter-clockwise from the lower right. */
function roundedRectLoop(width: number, depth: number, radius: number): CadModifierProfileLoop {
  const hw = width / 2;
  const hd = depth / 2;
  if (radius <= 1e-4) return polygonLoop([{ x: hw, z: -hd }, { x: hw, z: hd }, { x: -hw, z: hd }, { x: -hw, z: -hd }]);
  const corner = (cx: number, cz: number, start: number): Corner => {
    const arc: Arc = { cx, cz, rx: radius, rz: radius, start, end: start + Math.PI / 2 };
    return { start: profileArcPoint(arc, arc.start), end: profileArcPoint(arc, arc.end), arc };
  };
  return loopFromCorners([
    corner(hw - radius, -(hd - radius), -Math.PI / 2),
    corner(hw - radius, hd - radius, 0),
    corner(-(hw - radius), hd - radius, Math.PI / 2),
    corner(-(hw - radius), -(hd - radius), Math.PI),
  ]);
}

/** Frame that lays an outline built in the profile's x/z plane along the shape's depth: solid (x, e, z) -> local (x, z, depth / 2 - e). */
function alongDepthFrame(depth: number): ProfileFrame {
  return { kind: "extrusion", height: depth, local: new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, depth / 2, 0, 0, 0, 1) };
}

export function cadProfileForShapeKind(shape: WorkplaneShape, designedRound = false): { loops: CadModifierProfileLoop[]; frame?: ProfileFrame; capFillet?: number; capChamfer?: { radius: number; size: number } } | null {
  const width = shapeWidth(shape);
  const depth = shapeDepth(shape);
  switch (shape.kind) {
    case "bentTube":
      return bentTubeSweep(shape, width, depth, designedRound);
    case "polygon":
      return { loops: polygonProfileLoops(width, depth, shape.sides ?? 6) };
    case "star":
      return { loops: starProfileLoops(width, depth, shape) };
    case "heart":
      return { loops: heartProfileLoops(width, depth, shape) };
    case "crescent":
      return crescentProfile(width, depth, shape);
    case "slot":
      return { loops: slotProfileLoops(width, depth, shape.slotEndRatio) };
    case "honeycomb":
      return { loops: honeycombProfileLoops(width, depth, shape) };
    case "dovetail":
      return { loops: [polygonLoop(dovetailOutlineForShape(shape).map((point) => ({ x: point.x, z: point.y })))] };
    case "teardrop": {
      // The outline lives in the front view (x, y); pushed along z it needs the section in the profile's x/z plane, laid on its side.
      const section = teardropExactSection(width, shape.height);
      if (!section) return null;
      const corners: Corner[] = [
        { start: section.arc.start, end: section.arc.end, arc: section.arc.arc },
        { start: section.tip, end: section.tip },
      ];
      return {
        loops: [loopFromCorners(corners)],
        // solid (x, e, z) -> local (x, z, depth / 2 - e): the profile's z becomes the height, the extrusion runs along the depth
        frame: alongDepthFrame(depth),
      };
    }
    case "ellipse":
    case "cylinder": {
      // createPrismGeometry. Drawn with few sides (see drawnRound) it is the
      // display prism, corner for corner, like the polygon - a hexagon bar
      // stays one. Otherwise a round cylinder is an analytic primitive, and
      // only an oval one, or the ellipse, comes here.
      const count = Math.max(3, Math.round(roundSideCount(shape.sides, width, depth)));
      if (!drawnRound(shape.sides, ROUND_FROM_SIDES, count, width, depth)) return { loops: polygonProfileLoops(width, depth, count) };
      if (shape.kind === "cylinder" && Math.abs(width - depth) <= 1e-4) return null;
      return { loops: [ellipseLoop(width / 2, depth / 2)] };
    }
    case "tube":
    case "ring": {
      // createBooleanHollowCylinderGeometry: never fewer than 12 corners.
      const outerX = width / 2;
      const outerZ = depth / 2;
      const wall = Math.min(Math.max(shape.bevel ?? 4, 0.1), Math.max(0.1, Math.min(outerX, outerZ) - 0.1));
      const innerX = Math.max(0.1, outerX - wall);
      const innerZ = Math.max(0.1, outerZ - wall);
      const count = Math.max(12, Math.round(roundSideCount(shape.sides, width, depth)));
      if (drawnRound(shape.sides, ROUND_FROM_SIDES, count, width, depth)) return { loops: [ellipseLoop(outerX, outerZ), ellipseLoop(innerX, innerZ)] };
      const ring = (rx: number, rz: number) => polygonLoop(Array.from({ length: count }, (_, index) => {
        const angle = (index / count) * Math.PI * 2;
        return { x: Math.cos(angle) * rx, z: Math.sin(angle) * rz };
      }));
      return { loops: [ring(outerX, outerZ), ring(innerX, innerZ)] };
    }
    case "halfSphere": {
      // A dome: a quarter ellipse turned around the axis, stretched to the
      // depth when the footprint is oval (createBooleanHalfSphereGeometry).
      // Drawn with few steps (twice as many corners round) it is faceted and stays on its display mesh.
      const corners = Math.max(8, Math.round(shape.steps ?? ROUND_FROM_HALF_SPHERE_STEPS) * 2);
      if (!drawnRound(shape.steps, ROUND_FROM_HALF_SPHERE_STEPS, corners, Math.max(width, shape.height * 2), Math.max(depth, shape.height * 2))) return null;
      const rx = width / 2;
      const ry = shape.height;
      const loop: CadModifierProfileLoop = { x: 0, z: 0, segments: [{ kind: "line", x: rx, z: 0 }, arcSegment({ cx: 0, cz: 0, rx, rz: ry, start: 0, end: Math.PI / 2 }), { kind: "line", x: 0, z: 0 }] };
      return { loops: [loop], frame: { kind: "revolution", height: ry, local: upright(depth / width) } };
    }
    case "sphere": {
      // SphereGeometry scaled to width, height and depth, standing on y = 0: a
      // half ellipse from the bottom pole over the equator to the top one,
      // turned around the axis and stretched to the depth. A round one goes to
      // the analytic primitive first. Drawn with few steps it is faceted and
      // stays on its display mesh.
      if (!drawnRound(shape.steps, ROUND_FROM_SPHERE_STEPS, sphereTessellation(shape.steps).widthSegments, Math.max(width, shape.height), Math.max(depth, shape.height))) return null;
      const rx = width / 2;
      const ry = shape.height / 2;
      const loop: CadModifierProfileLoop = { x: 0, z: 0, segments: [arcSegment({ cx: 0, cz: ry, rx, rz: ry, start: -Math.PI / 2, end: Math.PI / 2 }), { kind: "line", x: 0, z: 0 }] };
      return { loops: [loop], frame: { kind: "revolution", height: shape.height, local: upright(depth / width) } };
    }
    case "cone": {
      // THREE.CylinderGeometry(topRadius, baseRadius) stretched along Z by
      // depth / width: its section turned around the axis and stretched the
      // same way. A round one stays the analytic primitive.
      if (Math.abs(width - depth) <= 1e-4) return null;
      // Either end may be a point on the axis (a cone on its tip is drawn too).
      const base = Math.max(0, shape.baseRadius ?? width / 2);
      const top = Math.max(0, shape.topRadius ?? 0);
      if (!(base > 1e-9 || top > 1e-9)) return null;
      // Drawn with few sides it is a pyramid of flat faces, which its display mesh already has exactly.
      const widest = Math.max(base, top) * 2;
      if (!drawnRound(shape.sides, ROUND_FROM_SIDES, Math.floor(roundSideCount(shape.sides, width, depth)), widest, widest * (depth / Math.max(0.001, width)))) return null;
      const segments: CadModifierProfileSegment[] = [];
      if (base > 1e-9) segments.push({ kind: "line", x: base, z: 0 });
      segments.push({ kind: "line", x: top, z: shape.height });
      if (top > 1e-9) segments.push({ kind: "line", x: 0, z: shape.height });
      segments.push({ kind: "line", x: 0, z: 0 });
      return { loops: [{ x: 0, z: 0, segments }], frame: { kind: "revolution", height: shape.height, local: upright(depth / Math.max(0.001, width)) } };
    }
    case "roundRoof": {
      // A half ellipse (radius = half the width, height = the shape's height) pushed along the depth.
      const radius = width / 2;
      // THREE draws the half arc with twice `sides` chords (CurvePath.getPoints
      // doubles an ellipse curve's resolution): four times `sides` corners round
      // the full circle. Drawn with few, it is that polygon.
      const chords = Math.max(4, Math.round(shape.sides ?? ROUND_FROM_ROOF_SIDES)) * 2;
      if (!drawnRound(shape.sides, ROUND_FROM_ROOF_SIDES, chords * 2, width, shape.height * 2)) {
        const points = Array.from({ length: chords + 1 }, (_, index) => {
          const angle = Math.PI - (index / chords) * Math.PI;
          return { x: Math.cos(angle) * radius, z: Math.sin(angle) * shape.height };
        });
        return { loops: [polygonLoop(points)], frame: alongDepthFrame(depth) };
      }
      const loop: CadModifierProfileLoop = { x: -radius, z: 0, segments: [arcSegment({ cx: 0, cz: 0, rx: radius, rz: shape.height, start: Math.PI, end: 0 }), { kind: "line", x: -radius, z: 0 }] };
      return { loops: [loop], frame: alongDepthFrame(depth) };
    }
    case "roundedBox": {
      const corner = normalizeCornerFillet(shape.cornerFillet ?? DEFAULT_ROUNDED_BOX_CORNER_FILLET, Math.min(width, depth) / 2);
      const ends = normalizeTopBottomFillet(shape.topBottomFillet ?? DEFAULT_ROUNDED_BOX_TOP_BOTTOM_FILLET, shape.height / 2);
      return { loops: [roundedRectLoop(width, depth, corner)], capFillet: ends > 1e-4 ? ends : undefined };
    }
    case "counterbore":
    case "countersink": {
      // Only a round hole is a body of revolution; stretched along z it stays a mesh.
      if (Math.abs(width - depth) > 1e-6) return null;
      const points = screwHoleProfile({ kind: shape.kind, width, height: shape.height, screwHoleShaft: shape.screwHoleShaft, screwHoleHeadDepth: shape.screwHoleHeadDepth, screwHoleAngle: shape.screwHoleAngle })
        .map(({ r, y }) => ({ x: r, z: y }));
      const section = [{ x: 0, z: points[0].z }, ...points, { x: 0, z: points[points.length - 1].z }];
      // solid (x, y, z) -> local (x, z, -y): the turned body stands along z, the shape's height runs along y
      return { loops: [polygonLoop(section)], frame: { kind: "revolution", height: shape.height, local: new THREE.Matrix4().makeRotationX(-Math.PI / 2) } };
    }
    case "gear": {
      const gearType = normalizeGearType(shape.gearType);
      if (gearType === "internal") return { loops: internalGearLoops(width, depth, shape) };
      if (gearType === "rack") return { loops: [rackLoop(width, depth, shape)] };
      return gearType === "spur" ? { loops: gearProfileLoops(width, depth, shape) } : null;
    }
    case "knurl": {
      // Crossed knurling stays a mesh: the kernel needs 40 s for what two
      // counter-turned rings of 30 grooves have in common, and fails at 60.
      const settings = knurlSettings({ ...shape, width });
      if (settings.pattern === "diamond") return null;
      return {
        // Round knurling (#201) as its true arcs.
        loops: [settings.pattern === "round"
          ? roundGearLoop(roundKnurlWave(settings.diameter, settings.count, settings.depth))
          : polygonLoop(knurlCorners(settings.diameter, settings.count, settings.depth).map(({ angle, radius }) => ({ x: Math.cos(angle) * radius, z: Math.sin(angle) * radius })))],
        capChamfer: settings.chamfer > 0 ? { radius: settings.diameter / 2, size: settings.chamfer } : undefined,
      };
    }
    case "text": {
      // A text is one body only when it is one glyph; otherwise the edge tool
      // cuts it into glyph pieces and each piece brings its own outline.
      const glyphs = textGlyphProfiles(shape);
      return glyphs?.length === 1 && glyphs[0].profile ? { loops: glyphs[0].profile.loops } : null;
    }
    default:
      return null;
  }
}

/**
 * The same placement cadModifierPrimitiveForAnalyticShape gives a box, and the
 * same one transformMesh gives the display mesh: turned about the centre,
 * standing on the shape's elevation.
 */
function profileTransformForShape(shape: WorkplaneShape, local?: THREE.Matrix4) {
  const centerY = shape.height / 2;
  const matrix = new THREE.Matrix4()
    .makeTranslation(shape.x, (shape.elevation ?? 0) + centerY, shape.z)
    .multiply(new THREE.Matrix4().makeRotationFromEuler(
      new THREE.Euler(
        THREE.MathUtils.degToRad(shape.rotationX ?? 0),
        THREE.MathUtils.degToRad(meshYawDegrees(shape)),
        THREE.MathUtils.degToRad(shape.rotationZ ?? 0),
        "XYZ",
      ),
    ))
    .multiply(new THREE.Matrix4().makeScale(mirrorSign(shape.mirrorX), mirrorSign(shape.mirrorY), mirrorSign(shape.mirrorZ)))
    .multiply(new THREE.Matrix4().makeTranslation(0, -centerY, 0));
  if (local) matrix.multiply(local);
  const transform = cadTransformFromMatrix(matrix);
  const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0];
  return transform.every((value, index) => Math.abs(value - identity[index]) < 1e-9) ? undefined : transform;
}

/**
 * The exact extrusion for a catalog shape, or null when the shape has to keep
 * going through its display mesh: another kind, a taper, twist or lean (step 3
 * of the exact-body plan), an imported or grouped body, or a body that already
 * carries its own BREP.
 */
const SIDED_ROUND_KINDS = new Set<WorkplaneShape["kind"]>(["cylinder", "ellipse", "cone", "tube", "ring", "roundRoof", "sphere", "halfSphere"]);

/**
 * The shape as designed round: a round kind's side or step count left unset,
 * so the exact part is the true curve whatever the display draws. STEP export
 * uses this - it has always written these shapes round, and whether a polygon
 * drawn there should stay one is a question of its own. The bent tube's
 * quality also places the body (its box is the drawn tube's), so it is not
 * reset here; STEP asks for it with `designedRound` instead.
 */
export function asDesignedRound(shape: WorkplaneShape): WorkplaneShape {
  if (!SIDED_ROUND_KINDS.has(shape.kind)) return shape;
  return { ...shape, sides: undefined, steps: undefined };
}

/**
 * Kinds whose body is their outline pushed straight up the whole height. A
 * taper scales that outline linearly from bottom to top and a lean shifts it
 * linearly (transformMesh), so every straight line from a bottom point to its
 * top point stays straight: the body is the ruled loft between the two ends,
 * exactly. Text is left out - it reaches the edge tool glyph by glyph.
 */
const LOFTABLE_KINDS = new Set<WorkplaneShape["kind"]>(["box", "cylinder", "ellipse", "polygon", "tube", "ring", "slot", "star", "heart", "crescent", "honeycomb", "dovetail", "roundedBox"]);

/**
 * The tapered, leaning or twisted shape as a loft between its bottom and top
 * section, or null. A twist turns the section as it rises, so the sides
 * become twisted surfaces that no straight line between the ends follows:
 * those are lofted smoothly through sections a few degrees apart
 * (profileExtrusionSolid).
 */
function deformedLoftProfile(shape: WorkplaneShape, width: number, depth: number): CadModifierProfilePart | null {
  if (!LOFTABLE_KINDS.has(shape.kind)) return null;
  let loops: CadModifierProfileLoop[];
  if (shape.kind === "box") {
    // A box with a rounded radius (only older files carry one) is drawn round; its loft would not be.
    if ((shape.radius ?? 0) > 0) return null;
    loops = [polygonLoop([{ x: -width / 2, z: -depth / 2 }, { x: width / 2, z: -depth / 2 }, { x: width / 2, z: depth / 2 }, { x: -width / 2, z: depth / 2 }])];
  } else {
    // A round cylinder has no outline of its own (it is an analytic
    // primitive); as an ellipse it gets the same circle, or its drawn polygon.
    const base = cadProfileForShapeKind(shape.kind === "cylinder" ? { ...shape, kind: "ellipse" } : shape);
    if (!base || base.frame || base.capFillet || base.capChamfer) return null;
    loops = base.loops;
  }
  const taper = shapeTaperDimensions(shape);
  const offsetX = shape.extrudeTopOffsetX ?? 0;
  const offsetZ = shape.extrudeTopOffsetZ ?? 0;
  // The display mesh narrows towards the middle of its outline's extent, not
  // towards the origin; a star or a heart is not centred on it.
  const bounds = loops.map(profileLoopBounds);
  const centerX = (Math.min(...bounds.map((b) => b[0])) + Math.max(...bounds.map((b) => b[2]))) / 2;
  const centerZ = (Math.min(...bounds.map((b) => b[1])) + Math.max(...bounds.map((b) => b[3]))) / 2;
  const section = (loop: CadModifierProfileLoop, sx: number, sz: number, shiftX: number, shiftZ: number) =>
    mapLoop(loop, sx, centerX * (1 - sx) + shiftX, sz, centerZ * (1 - sz) + shiftZ);
  const part: CadModifierProfilePart = {
    kind: "loft",
    loops: loops.map((loop) => section(loop, taper.bottomWidth / width, taper.bottomDepth / depth, 0, 0)),
    topLoops: loops.map((loop) => section(loop, taper.topWidth / width, taper.topDepth / depth, offsetX, offsetZ)),
    height: shape.height,
    transform: profileTransformForShape(shape),
  };
  // A twist turns each section around the middle of the outline as it rises, as the display does.
  const twist = shape.extrudeTwist ?? 0;
  if (Math.abs(twist) > 1e-6) {
    part.twist = twist;
    part.twistCenter = { x: centerX, z: centerZ };
    part.twistLean = { x: offsetX, z: offsetZ };
  }
  validateCadProfile(part);
  return part;
}

export function cadModifierProfileForShape(shape: WorkplaneShape, options: { designedRound?: boolean } = {}): CadModifierProfilePart | null {
  if (!CAD_PROFILE_SHAPE_KINDS.has(shape.kind) && !LOFTABLE_KINDS.has(shape.kind)) return null;
  if (shape.importedMesh || shape.groupedShapes?.length || shape.cadBrep || shape.imagePlate) return null;
  const width = shapeWidth(shape);
  const depth = shapeDepth(shape);
  if (![width, depth, shape.height].every((value) => Number.isFinite(value) && value > 0)) return null;
  if (shapeHasShapeDeform(shape)) {
    try {
      return deformedLoftProfile(shape, width, depth);
    } catch {
      return null;
    }
  }
  if (!CAD_PROFILE_SHAPE_KINDS.has(shape.kind)) return null;
  try {
    if (shape.kind === "gear" && normalizeGearType(shape.gearType) === "bevel") return bevelGearProfile(shape, width, depth);
    if (shape.kind === "loft") return loftShapeProfile(shape);
    const profile = cadProfileForShapeKind(shape, options.designedRound);
    if (!profile) return null;
    const part: CadModifierProfilePart = {
      kind: profile.frame?.kind ?? "extrusion",
      loops: profile.loops,
      height: profile.frame?.height ?? shape.height,
      transform: profileTransformForShape(shape, profile.frame?.local),
    };
    if (profile.frame?.path) part.path = profile.frame.path;
    if (profile.capFillet) part.capFillet = profile.capFillet;
    if (profile.capChamfer) part.capChamfer = profile.capChamfer;
    validateCadProfile(part);
    return part;
  } catch {
    // Whatever goes wrong here, the shape still has its display mesh.
    return null;
  }
}

/**
 * A thread shape as the exact body its display mesh draws, or null: the
 * measures come from the same `threadBuildPlan` the mesh is built from, and
 * `threadSolid.ts` builds the body from them.
 */
export function cadModifierThreadForShape(shape: WorkplaneShape): CadModifierThreadPart | null {
  if (shape.kind !== "thread") return null;
  if (shape.importedMesh || shape.groupedShapes?.length || shape.cadBrep || shape.imagePlate || shapeHasShapeDeform(shape)) return null;
  const width = shapeWidth(shape);
  const depth = shapeDepth(shape);
  if (![width, depth, shape.height].every((value) => Number.isFinite(value) && value > 0)) return null;
  const plan = threadBuildPlan({
    width,
    depth,
    height: shape.height,
    threadRole: shape.threadRole,
    threadHead: shape.threadHead,
    threadHand: shape.threadHand,
    threadProfile: shape.threadProfile,
    threadDiameter: shape.threadDiameter,
    threadPitch: shape.threadPitch,
    threadClearance: shape.threadClearance,
    threadBoltClearance: shape.threadBoltClearance,
    threadQuality: shape.threadQuality,
    threadHeadHeight: shape.threadHeadHeight,
    threadChamfer: shape.threadChamfer,
    threadHeadChamfer: shape.threadHeadChamfer,
  });
  const { settings, spec } = plan;
  const part: CadModifierThreadPart = {
    role: settings.role,
    profile: plan.profile.points.map((point) => ({ u: point.u, level: point.level })),
    major: plan.major,
    minor: plan.minor,
    pitch: settings.pitch,
    hand: plan.handSign === -1 ? -1 : 1,
    height: plan.height,
    shaftBottom: plan.shaftBottom,
    chamfer: plan.chamfer > 0.001 ? plan.chamfer : 0,
    chamferBottom: plan.chamferBottom,
    // The mesh is drawn at its natural footprint and stretched to the shape's
    // width and depth; the body takes the same stretch.
    transform: profileTransformForShape(shape, new THREE.Matrix4().makeScale(plan.scaleX, 1, plan.scaleZ)),
  };
  // The Whitworth points sample arcs; the body takes the arcs themselves, five
  // faces per turn instead of one per chord. They are circles only at the
  // profile's full depth, which a very coarse pitch on a thin rod can cut
  // short - then the points stay the profile.
  if (settings.profile === "whitworth" && Math.abs(plan.major - plan.minor - settings.pitch * plan.profile.depthPerPitch) < 1e-9) {
    part.curve = { kind: "whitworth", radius: WHITWORTH_PROFILE_CONSTANTS.radiusPerPitch, halfAngle: (WHITWORTH_PROFILE_CONSTANTS.flankAngleDegrees / 2) * (Math.PI / 180) };
  }
  if (settings.role === "screw") {
    part.head = {
      kind: settings.head,
      height: plan.headHeight,
      radius: settings.head === "countersunk" ? plan.headCrown : spec.headDiameter / 2,
      acrossFlats: spec.acrossFlats,
      neckRadius: settings.diameter / 2,
      chamferFaceRadius: plan.headBroken ? plan.headFaceRadius : 0,
      socketAcrossFlats: spec.socket,
      socketDepth: plan.hasSocket ? plan.socketDepth : 0,
    };
  }
  if (settings.role === "nut") part.nut = { acrossFlats: spec.acrossFlats, chamferFaceRadius: plan.rimBroken ? plan.rimFaceRadius : 0 };
  return part;
}

/**
 * A spring shape as the exact body its display mesh draws, or null: the
 * measures come from the same `springBuildPlan` the mesh is built from, and
 * `springSolid.ts` builds the body from them.
 */
export function cadModifierSpringForShape(shape: WorkplaneShape): CadModifierSpringPart | null {
  if (shape.kind !== "spring") return null;
  if (shape.importedMesh || shape.groupedShapes?.length || shape.cadBrep || shape.imagePlate || shapeHasShapeDeform(shape)) return null;
  const width = shapeWidth(shape);
  const depth = shapeDepth(shape);
  if (![width, depth, shape.height].every((value) => Number.isFinite(value) && value > 0)) return null;
  const plan = springBuildPlan({
    width,
    depth,
    height: shape.height,
    springTurns: shape.springTurns,
    springWire: shape.springWire,
    springQuality: shape.springQuality,
    springHand: shape.springHand,
  });
  return {
    coilRadius: plan.coilRadius,
    wireRadius: plan.wireRadius,
    turns: plan.settings.turns,
    bottom: plan.bottom,
    span: plan.span,
    hand: plan.settings.hand,
    meshSectionShare: springRingSectionShare(plan.settings.quality),
    // The mesh is drawn round at the larger of width and depth and stretched
    // to the shape's footprint; the body takes the same stretch.
    transform: profileTransformForShape(shape, new THREE.Matrix4().makeScale(plan.scaleX, 1, plan.scaleZ)),
  };
}

/** The extremes of r cos(angle + t) for t from 0 to `twist`: a corner's reach along x as it turns (along z with angle - pi/2). */
function turningReach(radius: number, angle: number, twist: number) {
  const from = Math.min(angle, angle + twist);
  const to = Math.max(angle, angle + twist);
  const passes = (target: number) => Math.ceil((from - target) / (2 * Math.PI)) * 2 * Math.PI + target <= to;
  const ends = [Math.cos(from), Math.cos(to)];
  return {
    max: radius * (passes(0) ? 1 : Math.max(...ends)),
    min: radius * (passes(Math.PI) ? -1 : Math.min(...ends)),
  };
}

/**
 * A helical gear as the exact body its display mesh draws, or null. The mesh
 * turns the tooth ring by the helix angle from foot to top in `helixQuality`
 * steps and stretches all of it to width x depth; the body turns it evenly,
 * and stretches it by what the turning ring spans - the limit the steps
 * approach, so it is the same body at any quality. On an oval footprint the
 * mesh moves each corner along its own ellipse, which is no turn of the ring:
 * that gear stays a mesh.
 */
/**
 * Every corner of a helical ring becomes a twisted face of its own, so an involute ring -
 * about fifteen corners a tooth - is built exactly only up to this many; a bigger one stays
 * the display mesh.
 */
const HELICAL_GEAR_CORNER_LIMIT = 480;

export function cadModifierHelicalGearForShape(shape: WorkplaneShape): CadModifierHelicalGearPart | null {
  if (shape.kind !== "gear" || normalizeGearType(shape.gearType) !== "helical") return null;
  if (shape.importedMesh || shape.groupedShapes?.length || shape.cadBrep || shape.imagePlate || shapeHasShapeDeform(shape)) return null;
  const width = shapeWidth(shape);
  const depth = shapeDepth(shape);
  if (![width, depth, shape.height].every((value) => Number.isFinite(value) && value > 0)) return null;
  if (Math.abs(width - depth) > 1e-6) return null;
  const twist = gearHelixTwist(width, depth, shape.height, shape);
  const corners = gearOutlineCorners(width, depth, shape).map((corner) => ({ angle: corner.angle, radius: corner.radiusX }));
  // Involute teeth keep their tip circle on width x depth instead of what the turn spans (#201).
  const involute = involuteOutlineStretch(width, depth, shape);
  if (involute && corners.length > HELICAL_GEAR_CORNER_LIMIT) return null;
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const { angle, radius } of corners) {
    const x = turningReach(radius, angle, twist);
    const z = turningReach(radius, angle - Math.PI / 2, twist);
    minX = Math.min(minX, x.min);
    maxX = Math.max(maxX, x.max);
    minZ = Math.min(minZ, z.min);
    maxZ = Math.max(maxZ, z.max);
  }
  const stretch = involute ?? { x: width / (maxX - minX), z: depth / (maxZ - minZ) };
  const toothSize = normalizeGearToothSize(shape.toothSize, width, depth);
  const boreRadius = normalizeGearCenterHoleSize(shape.centerHoleSize, width, depth, toothSize, shape) / 2;
  if (boreRadius > 0) {
    // The bore has to clear the ring wherever it has turned to; stretched, the
    // ring comes no nearer than its narrower stretch allows.
    const ring = corners.map(({ angle, radius }) => ({ x: Math.cos(angle) * radius, z: Math.sin(angle) * radius }));
    if (!(boreRadius < outlineClearance(ring) * Math.min(stretch.x, stretch.z) * 0.999)) return null;
  }
  return { corners, twist, height: shape.height, stretch, boreRadius, transform: profileTransformForShape(shape) };
}

/** Outline pieces of a profile, the measure its kernel cost grows with. */
export function cadProfileSegmentCount(profile: CadModifierProfilePart) {
  // A sweep builds its section once per piece of the centre line.
  return profile.loops.reduce((total, loop) => total + loop.segments.length, 0) * Math.max(1, profile.path?.length ?? 1);
}

/**
 * Past CAD_MODIFIER_EXACT_SEGMENT_LIMIT outline pieces in one request the
 * exact bodies would outgrow the preview timeout. Then profile parts go back
 * to their display meshes - and meet the triangle limit, exactly as before -
 * until the rest fits: first those whose mesh is cheapest for the pieces it
 * saves, so a gear (few triangles per piece) goes before a glyph (many), and
 * one big honeycomb does not send every other shape of the group back too.
 */
export function withinExactProfileLimit<M extends { faces: { length: number } }, T extends { profile?: CadModifierProfilePart; profileMesh?: M; mesh?: M }>(parts: T[], limit = CAD_MODIFIER_EXACT_SEGMENT_LIMIT): T[] {
  let segments = parts.reduce((total, part) => total + (part.profile ? cadProfileSegmentCount(part.profile) : 0), 0);
  if (segments <= limit) return parts;
  const cost = (part: T) => (part.profileMesh?.faces.length ?? 0) / Math.max(1, cadProfileSegmentCount(part.profile as CadModifierProfilePart));
  const order = parts
    .map((part, index) => ({ part, index }))
    .filter(({ part }) => part.profile)
    .sort((a, b) => cost(a.part) - cost(b.part) || cadProfileSegmentCount(b.part.profile as CadModifierProfilePart) - cadProfileSegmentCount(a.part.profile as CadModifierProfilePart));
  const toMesh = new Set<number>();
  for (const { part, index } of order) {
    if (segments <= limit) break;
    segments -= cadProfileSegmentCount(part.profile as CadModifierProfilePart);
    toMesh.add(index);
  }
  return parts.map((part, index) => (toMesh.has(index) ? { ...part, profile: undefined, profileMesh: undefined, mesh: part.profileMesh } : part));
}

/**
 * Which way each triangle of a closed mesh has to run to face outwards. The
 * triangles are first turned to agree with their neighbours (across shared
 * edges, vertices welded by position), then each connected piece is turned so
 * it encloses a positive volume. Display meshes are not always consistent -
 * the crescent's caps, for one, are wound the other way round from its walls.
 * `flip[i]` is -1 where triangle i runs inwards as stored, and `pieceVolume`
 * holds the volume of each connected piece.
 */
export function closedMeshFaceOrientation(vertices: ReadonlyArray<readonly [number, number, number]>, faces: ReadonlyArray<readonly [number, number, number]>) {
  let extent = 0;
  vertices.forEach(([x, y, z]) => {
    extent = Math.max(extent, Math.abs(x), Math.abs(y), Math.abs(z));
  });
  const quantum = Math.max(1e-9, extent * 1e-7);
  const welded = new Map<string, number>();
  const ids = vertices.map(([x, y, z]) => {
    const key = `${Math.round(x / quantum)},${Math.round(y / quantum)},${Math.round(z / quantum)}`;
    let id = welded.get(key);
    if (id === undefined) {
      id = welded.size;
      welded.set(key, id);
    }
    return id;
  });
  const edgeFaces = new Map<string, number[]>();
  const edgeKey = (a: number, b: number) => (a < b ? `${a}:${b}` : `${b}:${a}`);
  faces.forEach((face, index) => {
    for (let corner = 0; corner < 3; corner += 1) {
      const key = edgeKey(ids[face[corner]], ids[face[(corner + 1) % 3]]);
      const list = edgeFaces.get(key);
      if (list) list.push(index);
      else edgeFaces.set(key, [index]);
    }
  });
  /** +1 when the face runs a -> b along one of its edges, -1 when b -> a, 0 when it has no such edge. */
  const runs = (faceIndex: number, a: number, b: number) => {
    const face = faces[faceIndex];
    for (let corner = 0; corner < 3; corner += 1) {
      const from = ids[face[corner]];
      const to = ids[face[(corner + 1) % 3]];
      if (from === a && to === b) return 1;
      if (from === b && to === a) return -1;
    }
    return 0;
  };
  const signedVolume = (faceIndex: number) => {
    const [ax, ay, az] = vertices[faces[faceIndex][0]];
    const [bx, by, bz] = vertices[faces[faceIndex][1]];
    const [cx, cy, cz] = vertices[faces[faceIndex][2]];
    return (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
  };
  const orientation = new Array<number>(faces.length).fill(0);
  const pieceOf = new Array<number>(faces.length).fill(-1);
  const pieceVolume: number[] = [];
  for (let seed = 0; seed < faces.length; seed += 1) {
    if (orientation[seed] !== 0) continue;
    const pieceIndex = pieceVolume.length;
    orientation[seed] = 1;
    pieceOf[seed] = pieceIndex;
    const queue = [seed];
    let piece = 0;
    while (queue.length) {
      const current = queue.pop() as number;
      piece += orientation[current] * signedVolume(current);
      const face = faces[current];
      for (let corner = 0; corner < 3; corner += 1) {
        const a = ids[face[corner]];
        const b = ids[face[(corner + 1) % 3]];
        if (a === b) continue;
        (edgeFaces.get(edgeKey(a, b)) ?? []).forEach((neighbour) => {
          if (orientation[neighbour] !== 0) return;
          // Agreeing neighbours run a shared edge in opposite directions.
          const direction = runs(neighbour, a, b);
          if (direction === 0) return;
          orientation[neighbour] = -direction * orientation[current];
          pieceOf[neighbour] = pieceIndex;
          queue.push(neighbour);
        });
      }
    }
    pieceVolume.push(piece);
  }
  const flip = orientation.map((value, index) => (pieceVolume[pieceOf[index]] < 0 ? -value : value));
  return { flip, pieceVolume: pieceVolume.map(Math.abs) };
}

/** Volume enclosed by a closed triangle mesh whatever way its triangles are wound. */
export function closedMeshVolume(vertices: ReadonlyArray<readonly [number, number, number]>, faces: ReadonlyArray<readonly [number, number, number]>) {
  return closedMeshFaceOrientation(vertices, faces).pieceVolume.reduce((sum, volume) => sum + volume, 0);
}

/** World bounds and volume of a closed display mesh, for the worker's plausibility check. */
export function cadProfileExpectation(vertices: ReadonlyArray<readonly [number, number, number]>, faces: ReadonlyArray<readonly [number, number, number]>) {
  const bounds = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  vertices.forEach(([x, y, z]) => {
    bounds[0] = Math.min(bounds[0], x);
    bounds[1] = Math.min(bounds[1], y);
    bounds[2] = Math.min(bounds[2], z);
    bounds[3] = Math.max(bounds[3], x);
    bounds[4] = Math.max(bounds[4], y);
    bounds[5] = Math.max(bounds[5], z);
  });
  return { bounds, volume: closedMeshVolume(vertices, faces) };
}
