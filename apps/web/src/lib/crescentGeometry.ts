import * as THREE from "three";
import { toCreasedNormals } from "@/lib/creasedNormals";
import type { WorkplaneShape } from "@/types/layerling";

export const DEFAULT_CRESCENT_WIDTH = 40;
export const DEFAULT_CRESCENT_DEPTH = 40;
export const DEFAULT_CRESCENT_HEIGHT = 10;
export const DEFAULT_CRESCENT_THICKNESS = 14;
export const DEFAULT_CRESCENT_TIP_FILLET = 0.5;
export const DEFAULT_CRESCENT_QUALITY = 32;

export const MIN_CRESCENT_QUALITY = 16;
export const MAX_CRESCENT_QUALITY = 64;
export const MIN_CRESCENT_FILLET = 0;
export const MAX_CRESCENT_FILLET = 8;
export const MIN_CRESCENT_THICKNESS = 1;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeCrescentQuality(value?: number) {
  return clamp(Math.round(Number.isFinite(value) ? (value as number) : DEFAULT_CRESCENT_QUALITY), MIN_CRESCENT_QUALITY, MAX_CRESCENT_QUALITY);
}

export function normalizeCrescentTipFillet(value?: number) {
  return clamp(Number.isFinite(value) ? (value as number) : DEFAULT_CRESCENT_TIP_FILLET, MIN_CRESCENT_FILLET, MAX_CRESCENT_FILLET);
}

export function normalizeCrescentThickness(value: number | undefined, width: number) {
  const maxThick = Math.max(MIN_CRESCENT_THICKNESS, width * 0.85);
  const defaultThick = width * 0.35;
  return clamp(Number.isFinite(value) ? (value as number) : defaultThick, MIN_CRESCENT_THICKNESS, maxThick);
}

export function crescentSettings(shape: Pick<WorkplaneShape, "width" | "depth" | "crescentThickness" | "crescentTipFillet" | "crescentQuality">) {
  const width = Math.max(0.01, shape.width);
  return {
    thickness: normalizeCrescentThickness(shape.crescentThickness, width),
    tipFillet: normalizeCrescentTipFillet(shape.crescentTipFillet),
    quality: normalizeCrescentQuality(shape.crescentQuality),
  };
}

export type CrescentGeometryOptions = {
  width: number;
  depth: number;
  height: number;
  crescentThickness?: number;
  crescentTipFillet?: number;
  crescentQuality?: number;
};

type Point2D = { x: number; y: number };

function cornerAngles(pPrev: Point2D, pCurr: Point2D, pNext: Point2D) {
  const dx1 = pPrev.x - pCurr.x;
  const dy1 = pPrev.y - pCurr.y;
  const len1 = Math.hypot(dx1, dy1) || 1;
  const dx2 = pNext.x - pCurr.x;
  const dy2 = pNext.y - pCurr.y;
  const len2 = Math.hypot(dx2, dy2) || 1;

  const dot = (dx1 * dx2 + dy1 * dy2) / (len1 * len2);
  const clampedDot = Math.max(-1, Math.min(1, dot));

  const cosAlpha = Math.max(1e-4, Math.sqrt((1 + clampedDot) / 2));
  const sinAlpha = Math.max(1e-4, Math.sqrt((1 - clampedDot) / 2));
  return { sinAlpha, cosAlpha, tanAlpha: sinAlpha / cosAlpha };
}

function shortestAngleDelta(from: number, to: number): number {
  let delta = to - from;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}

/**
 * Erzeugt die 2D-Kontur einer Mondsichel (im Uhrzeigersinn in der X-Z-Ebene).
 */
export function buildCrescentContourPoints(
  width: number,
  depth: number,
  requestedThickness?: number,
  requestedTipFillet?: number,
  quality = DEFAULT_CRESCENT_QUALITY,
): Point2D[] {
  const safeWidth = Math.max(0.01, width);
  const safeDepth = Math.max(0.01, depth);
  const thickness = normalizeCrescentThickness(requestedThickness, safeWidth);
  const fillet = normalizeCrescentTipFillet(requestedTipFillet);
  const steps = normalizeCrescentQuality(quality);

  const halfW = safeWidth / 2;
  const halfD = safeDepth / 2;

  // 1. Außenkreis durch (+halfW, -halfD), (-halfW, 0) und (+halfW, +halfD)
  const xo = (safeDepth * safeDepth) / (8 * safeWidth);
  const Ro = halfW + xo;

  // 2. Innenkreis durch (+halfW, -halfD), (-halfW + thickness, 0) und (+halfW, +halfD)
  const xin = -halfW + thickness;
  const xi = (safeWidth * safeWidth / 4 + safeDepth * safeDepth / 4 - xin * xin) / (2 * (safeWidth - thickness));
  const Ri = xi - xin;

  // Winkelgrenzen ermitteln
  const phiO1 = Math.atan2(-halfD, halfW - xo); // untere Spitze am Außenkreis
  const phiO2 = Math.atan2(+halfD, halfW - xo); // obere Spitze am Außenkreis

  const phiI1 = Math.atan2(-halfD, halfW - xi); // untere Spitze am Innenkreis
  const phiI2 = Math.atan2(+halfD, halfW - xi); // obere Spitze am Innenkreis

  // Punkte im Uhrzeigersinn aufbauen:
  // Start: untere Spitze (+halfW, -halfD)
  // Außenbogen: von phiO1 über x = -halfW nach phiO2
  const outerSteps = Math.max(8, Math.round(steps / 2));
  let deltaOuter = phiO2 - phiO1;
  if (deltaOuter > 0) deltaOuter -= Math.PI * 2; // Uhrzeigersinn (durch PI / Rücken)

  const rawPoints: Point2D[] = [];
  for (let i = 0; i < outerSteps; i += 1) {
    const frac = i / outerSteps;
    const phi = phiO1 + frac * deltaOuter;
    rawPoints.push({
      x: xo + Ro * Math.cos(phi),
      y: Ro * Math.sin(phi),
    });
  }

  // Obere Spitze
  rawPoints.push({ x: halfW, y: halfD });

  // Innenbogen: von phiI2 über x = xin zurück nach phiI1
  const innerSteps = Math.max(8, Math.round(steps / 2));
  let deltaInner = phiI1 - phiI2;
  if (deltaInner < 0) deltaInner += Math.PI * 2; // Gegen den Uhrzeigersinn relativ zu xi, um im Gesamtsinn im Uhrzeigersinn zu laufen

  for (let i = 1; i < innerSteps; i += 1) {
    const frac = i / innerSteps;
    const phi = phiI2 + frac * deltaInner;
    rawPoints.push({
      x: xi + Ri * Math.cos(phi),
      y: Ri * Math.sin(phi),
    });
  }

  // Bounding-Box ermitteln und exakt auf [-safeWidth/2, safeWidth/2] und [-safeDepth/2, safeDepth/2] einpassen
  let minX = Number.POSITIVE_INFINITY, maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY, maxY = Number.NEGATIVE_INFINITY;
  rawPoints.forEach((p) => {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  });

  const spanX = Math.max(1e-5, maxX - minX);
  const spanY = Math.max(1e-5, maxY - minY);
  const scaledPoints = rawPoints.map((p) => ({
    x: ((p.x - (minX + maxX) / 2) / spanX) * safeWidth,
    y: ((p.y - (minY + maxY) / 2) / spanY) * safeDepth,
  }));

  if (fillet <= 0.01) {
    return scaledPoints;
  }

  // Spitzenverrundung an den beiden Hörnern anwenden:
  // Horn 1: Index 0 (untere Spitze)
  // Horn 2: Index outerSteps (obere Spitze)
  const applyFilletAt = (points: Point2D[], idx: number, rFillet: number): Point2D[] => {
    const N = points.length;
    const P = points[idx];
    const prev = points[(idx - 1 + N) % N];
    const next = points[(idx + 1) % N];

    const len1 = Math.hypot(prev.x - P.x, prev.y - P.y);
    const len2 = Math.hypot(next.x - P.x, next.y - P.y);
    const { sinAlpha, tanAlpha } = cornerAngles(prev, P, next);

    const maxT = Math.min(len1, len2) * 0.4;
    const t = Math.min(maxT, rFillet / tanAlpha);
    const r = t * tanAlpha;
    if (t <= 0.01 || r <= 0.01) return points;

    const u1 = { x: (prev.x - P.x) / len1, y: (prev.y - P.y) / len1 };
    const u2 = { x: (next.x - P.x) / len2, y: (next.y - P.y) / len2 };
    const bx = u1.x + u2.x;
    const by = u1.y + u2.y;
    const bLen = Math.hypot(bx, by) || 1;
    const b = { x: bx / bLen, y: by / bLen };

    const distToCenter = r / sinAlpha;
    const C = { x: P.x + distToCenter * b.x, y: P.y + distToCenter * b.y };

    const T1 = { x: P.x + t * u1.x, y: P.y + t * u1.y };
    const T2 = { x: P.x + t * u2.x, y: P.y + t * u2.y };

    const phi1 = Math.atan2(T1.y - C.y, T1.x - C.x);
    const phi2 = Math.atan2(T2.y - C.y, T2.x - C.x);
    const deltaPhi = shortestAngleDelta(phi1, phi2);

    const fSteps = Math.max(3, Math.round(steps / 6));
    const arc: Point2D[] = [];
    for (let s = 0; s <= fSteps; s += 1) {
      const frac = s / fSteps;
      const phi = phi1 + frac * deltaPhi;
      arc.push({ x: C.x + r * Math.cos(phi), y: C.y + r * Math.sin(phi) });
    }

    return [...points.slice(0, idx), ...arc, ...points.slice(idx + 1)];
  };

  const filletedUpper = applyFilletAt(scaledPoints, outerSteps, fillet);
  return applyFilletAt(filletedUpper, 0, fillet);
}

/**
 * Erzeugt einen geschlossenen, wasserdichten 3D-Sichelkörper (2-Mannigfaltigkeit).
 */
export function createCrescentGeometry({
  width,
  depth,
  height,
  crescentThickness,
  crescentTipFillet,
  crescentQuality,
}: CrescentGeometryOptions): THREE.BufferGeometry {
  const safeWidth = Math.max(0.01, width);
  const safeDepth = Math.max(0.01, depth);
  const safeHeight = Math.max(0.01, height);

  const thickness = normalizeCrescentThickness(crescentThickness, safeWidth);
  const tipFillet = normalizeCrescentTipFillet(crescentTipFillet);
  const quality = normalizeCrescentQuality(crescentQuality);

  const contour2D = buildCrescentContourPoints(safeWidth, safeDepth, thickness, tipFillet, quality);
  const M = contour2D.length;

  const positions: number[] = [];
  const indices: number[] = [];

  // Punkte erzeugen (0 .. M-1: Boden y=0; M .. 2M-1: Deckel y=safeHeight)
  for (let i = 0; i < M; i += 1) {
    const p = contour2D[i];
    positions.push(p.x, 0, p.y);
  }
  for (let i = 0; i < M; i += 1) {
    const p = contour2D[i];
    positions.push(p.x, safeHeight, p.y);
  }

  // 1. Deckel- und Boden-Triangulierung mittels THREE.ShapeUtils.triangulateShape
  // Da die Sichel konkav ist, verwenden wir Standard-Polygon-Triangulierung.
  const triPoints = contour2D.map((p) => new THREE.Vector2(p.x, p.y));
  const isClockwise = THREE.ShapeUtils.isClockWise(triPoints);
  const faces2D = THREE.ShapeUtils.triangulateShape(triPoints, []);

  // The lids are turned by where each triangle really lies, not by the turn of the contour: the
  // triangulation hands its triangles out in a fixed sense, so turning them by the contour's sense
  // left both lids inside out against the walls - the mesh then had edges that did not meet, a
  // boolean union with it failed and a slicer showed the overlap as hollow (#493).
  // In the x-z plane a triangle with a positive 2D cross faces down: the base takes it as it is.
  faces2D.forEach(([a, b, c]) => {
    const pa = contour2D[a];
    const pb = contour2D[b];
    const pc = contour2D[c];
    const cross = (pb.x - pa.x) * (pc.y - pa.y) - (pb.y - pa.y) * (pc.x - pa.x);
    if (cross > 0) {
      indices.push(a, b, c);
      indices.push(M + a, M + c, M + b);
    } else {
      indices.push(a, c, b);
      indices.push(M + a, M + b, M + c);
    }
  });

  // 2. Seitenwand-Quads
  for (let i = 0; i < M; i += 1) {
    const next = (i + 1) % M;
    const bi = i;
    const bNext = next;
    const ti = M + i;
    const tNext = M + next;

    if (isClockwise) {
      indices.push(bi, bNext, tNext);
      indices.push(bi, tNext, ti);
    } else {
      indices.push(bi, tNext, bNext);
      indices.push(bi, ti, tNext);
    }
  }

  const indexed = new THREE.BufferGeometry();
  indexed.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  indexed.setIndex(indices);

  const geometry = toCreasedNormals(indexed, THREE.MathUtils.degToRad(30));
  indexed.dispose();
  geometry.computeBoundingBox();

  return geometry;
}
