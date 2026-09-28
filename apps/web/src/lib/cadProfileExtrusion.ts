import * as THREE from "three";
import type { WorkplaneShape } from "@/types/layerling";
import type { CadModifierProfileLoop, CadModifierProfilePart, CadModifierProfileSegment } from "@/lib/cadModifierTypes";
import { profileArcPoint, profileLoopBounds, validateCadProfile } from "@/lib/cadProfileSolid";
import { cadTransformFromMatrix } from "@/lib/cadBakeMetadata";
import { CAD_MODIFIER_EXACT_SEGMENT_LIMIT } from "@/lib/cadModifierRuntime";
import { meshYawDegrees, mirrorSign, shapeDepth, shapeHasShapeDeform, shapeWidth } from "@/lib/workplaneShapes";
import { regularPolygonFootprintScale } from "@/lib/regularPolygonFootprint";
import { normalizeStarInnerFillet, normalizeStarInnerSize, normalizeStarOuterFillet, normalizeStarPoints } from "@/lib/starGeometry";
import { normalizeHeartTipFillet } from "@/lib/heartGeometry";
import { buildCrescentContourPoints, normalizeCrescentQuality, normalizeCrescentThickness, normalizeCrescentTipFillet } from "@/lib/crescentGeometry";
import { buildHoneycombHoles, normalizeHoneycombCellSize, normalizeHoneycombFrameWidth, normalizeHoneycombWallThickness } from "@/lib/honeycombGeometry";
import { gearToothPitch, normalizeGearCenterHoleSize, normalizeGearToothSize, normalizeGearToothWidth, normalizeGearTeeth, normalizeGearType } from "@/lib/gearGeometry";

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

export const CAD_PROFILE_SHAPE_KINDS = new Set<WorkplaneShape["kind"]>(["polygon", "star", "heart", "crescent", "slot", "honeycomb", "gear"]);

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
export function slotProfileLoops(width: number, depth: number) {
  const safeW = Math.max(0.01, width);
  const safeD = Math.max(0.01, depth);
  const corners: Corner[] = [];
  const half = (arc: Arc): Corner => ({ start: profileArcPoint(arc, arc.start), end: profileArcPoint(arc, arc.end), arc });
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
 * Helical and bevel gears change their outline along the height and keep the
 * mesh path.
 */
export function gearProfileLoops(
  width: number,
  depth: number,
  options: Pick<WorkplaneShape, "teeth" | "toothSize" | "toothWidth" | "centerHoleSize">,
) {
  const safeWidth = Math.max(0.01, width);
  const safeDepth = Math.max(0.01, depth);
  const teeth = normalizeGearTeeth(options.teeth);
  const toothSize = normalizeGearToothSize(options.toothSize, safeWidth, safeDepth);
  const toothPitch = gearToothPitch(safeWidth, safeDepth, teeth);
  const toothWidth = normalizeGearToothWidth(options.toothWidth, safeWidth, safeDepth, teeth);
  const toothFraction = toothWidth / toothPitch;
  const centerHoleSize = normalizeGearCenterHoleSize(options.centerHoleSize, safeWidth, safeDepth, toothSize);
  const outerX = safeWidth / 2;
  const outerZ = safeDepth / 2;
  const rootX = Math.max(outerX * 0.34, outerX - toothSize);
  const rootZ = Math.max(outerZ * 0.34, outerZ - toothSize);
  const toothPhases = [0.05, (1 - toothFraction) / 2, (1 + toothFraction) / 2, 0.95];
  const raw: Point[] = [];
  for (let tooth = 0; tooth < teeth; tooth += 1) {
    toothPhases.forEach((phase, phaseIndex) => {
      const angle = ((tooth + phase) / teeth) * Math.PI * 2;
      const isOuter = phaseIndex === 1 || phaseIndex === 2;
      raw.push({ x: Math.cos(angle) * (isOuter ? outerX : rootX), z: Math.sin(angle) * (isOuter ? outerZ : rootZ) });
    });
  }
  // The display stretches the ring about the origin until it spans width x depth.
  const xs = raw.map((point) => point.x);
  const zs = raw.map((point) => point.z);
  const scaleX = safeWidth / Math.max(Number.EPSILON, Math.max(...xs) - Math.min(...xs));
  const scaleZ = safeDepth / Math.max(Number.EPSILON, Math.max(...zs) - Math.min(...zs));
  const outline = raw.map((point) => ({ x: point.x * scaleX, z: point.z * scaleZ }));
  const loops = [polygonLoop(outline)];
  if (centerHoleSize > 0) {
    const radius = centerHoleSize / 2;
    // A bore reaching the teeth cuts the outline; the display mesh then folds
    // over itself and the shape stays on its old path.
    const clearance = Math.min(...outline.map((point, index) => originDistanceToSegment(point, outline[(index + 1) % outline.length])));
    if (!(radius < clearance * 0.999)) throw new Error("The gear's centre hole reaches its teeth");
    const half = (start: number): Corner => {
      const arc: Arc = { cx: 0, cz: 0, rx: radius, rz: radius, start, end: start + Math.PI };
      return { start: profileArcPoint(arc, arc.start), end: profileArcPoint(arc, arc.end), arc };
    };
    loops.push(loopFromCorners([half(0), half(Math.PI)]));
  }
  return loops;
}

/** Outline loops (and horn roundings) of a supported shape in its local frame, or null. */
export function cadProfileForShapeKind(shape: WorkplaneShape) {
  const width = shapeWidth(shape);
  const depth = shapeDepth(shape);
  switch (shape.kind) {
    case "polygon":
      return { loops: polygonProfileLoops(width, depth, shape.sides ?? 6) };
    case "star":
      return { loops: starProfileLoops(width, depth, shape) };
    case "heart":
      return { loops: heartProfileLoops(width, depth, shape) };
    case "crescent":
      return crescentProfile(width, depth, shape);
    case "slot":
      return { loops: slotProfileLoops(width, depth) };
    case "honeycomb":
      return { loops: honeycombProfileLoops(width, depth, shape) };
    case "gear":
      return normalizeGearType(shape.gearType) === "spur" ? { loops: gearProfileLoops(width, depth, shape) } : null;
    default:
      return null;
  }
}

/**
 * The same placement cadModifierPrimitiveForAnalyticShape gives a box, and the
 * same one transformMesh gives the display mesh: turned about the centre,
 * standing on the shape's elevation.
 */
function profileTransformForShape(shape: WorkplaneShape) {
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
export function cadModifierProfileForShape(shape: WorkplaneShape): CadModifierProfilePart | null {
  if (!CAD_PROFILE_SHAPE_KINDS.has(shape.kind)) return null;
  if (shape.importedMesh || shape.groupedShapes?.length || shape.cadBrep || shape.imagePlate || shapeHasShapeDeform(shape)) return null;
  const width = shapeWidth(shape);
  const depth = shapeDepth(shape);
  if (![width, depth, shape.height].every((value) => Number.isFinite(value) && value > 0)) return null;
  try {
    const profile = cadProfileForShapeKind(shape);
    if (!profile) return null;
    const part: CadModifierProfilePart = {
      kind: "extrusion",
      loops: profile.loops,
      height: shape.height,
      transform: profileTransformForShape(shape),
    };
    validateCadProfile(part);
    return part;
  } catch {
    // Whatever goes wrong here, the shape still has its display mesh.
    return null;
  }
}

/** Outline pieces of a profile, the measure its kernel cost grows with. */
export function cadProfileSegmentCount(profile: CadModifierProfilePart) {
  return profile.loops.reduce((total, loop) => total + loop.segments.length, 0);
}

/**
 * Past CAD_MODIFIER_EXACT_SEGMENT_LIMIT outline pieces in one request the
 * exact bodies would outgrow the preview timeout; then every profile part goes
 * back to its display mesh and meets the triangle limit, exactly as before.
 */
export function withinExactProfileLimit<M, T extends { profile?: CadModifierProfilePart; profileMesh?: M; mesh?: M }>(parts: T[], limit = CAD_MODIFIER_EXACT_SEGMENT_LIMIT): T[] {
  const segments = parts.reduce((total, part) => total + (part.profile ? cadProfileSegmentCount(part.profile) : 0), 0);
  if (segments <= limit) return parts;
  return parts.map((part) => (part.profile ? { ...part, profile: undefined, profileMesh: undefined, mesh: part.profileMesh } : part));
}

/**
 * Volume enclosed by a closed triangle mesh whatever way its triangles are
 * wound. The triangles are first turned to agree with their neighbours
 * (across shared edges, vertices welded by position), then each connected
 * piece counts with its own sign. Display meshes are not always consistent -
 * the crescent's caps, for one, are wound the other way round from its walls.
 */
export function closedMeshVolume(vertices: ReadonlyArray<readonly [number, number, number]>, faces: ReadonlyArray<readonly [number, number, number]>) {
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
  let total = 0;
  for (let seed = 0; seed < faces.length; seed += 1) {
    if (orientation[seed] !== 0) continue;
    orientation[seed] = 1;
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
          queue.push(neighbour);
        });
      }
    }
    total += Math.abs(piece);
  }
  return total;
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
