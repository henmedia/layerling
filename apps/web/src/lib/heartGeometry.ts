import * as THREE from "three";
import { toCreasedNormals } from "@/lib/creasedNormals";
import type { WorkplaneShape } from "@/types/layerling";

export const DEFAULT_HEART_WIDTH = 40;
export const DEFAULT_HEART_DEPTH = 40;
export const DEFAULT_HEART_HEIGHT = 10;
export const DEFAULT_HEART_TIP_FILLET = 0;
export const DEFAULT_HEART_QUALITY = 32;

export const MIN_HEART_QUALITY = 16;
export const MAX_HEART_QUALITY = 64;
export const MIN_HEART_FILLET = 0;
export const MAX_HEART_FILLET = 20;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeHeartQuality(value?: number) {
  return clamp(Math.round(Number.isFinite(value) ? (value as number) : DEFAULT_HEART_QUALITY), MIN_HEART_QUALITY, MAX_HEART_QUALITY);
}

export function normalizeHeartTipFillet(value?: number) {
  return clamp(Number.isFinite(value) ? (value as number) : DEFAULT_HEART_TIP_FILLET, MIN_HEART_FILLET, MAX_HEART_FILLET);
}

export function heartSettings(shape: Pick<WorkplaneShape, "width" | "depth" | "heartTipFillet" | "heartQuality">) {
  return {
    tipFillet: normalizeHeartTipFillet(shape.heartTipFillet),
    quality: normalizeHeartQuality(shape.heartQuality),
  };
}

export type HeartGeometryOptions = {
  width: number;
  depth: number;
  height: number;
  heartTipFillet?: number;
  heartQuality?: number;
};

type Point2D = { x: number; y: number };

/**
 * Berechnet Winkel und Tangente an einer Ecke per Vektor-Skalarprodukt.
 */
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
 * Erzeugt die geschlossene 2D-Herzkontur (skaliert exakt auf width x depth).
 * Die Ausrichtung erfolgt im Uhrzeigersinn in der X-Z-Ebene (Z entspricht y).
 */
export function buildHeartContourPoints(
  width: number,
  depth: number,
  requestedTipFillet = DEFAULT_HEART_TIP_FILLET,
  quality = DEFAULT_HEART_QUALITY,
): Point2D[] {
  const safeWidth = Math.max(0.01, width);
  const safeDepth = Math.max(0.01, depth);
  const fillet = normalizeHeartTipFillet(requestedTipFillet);
  const steps = normalizeHeartQuality(quality);

  // 1. Mathematische CAD-Herzkurve: zwei obere Kreisbögen (Lappen)
  // und zwei konvergierende Tangenten zur unteren Spitze.
  // Geometrie im normierten Raum:
  // Spitze unten bei (0, -yTip).
  // Rechter Lappen: Kreis bei (xc, yc), Radius R.
  // Linker Lappen: Kreis bei (-xc, yc), Radius R.
  const R = 0.28;
  const xc = 0.22;
  const yc = 0.18;
  const yTip = 0.5;

  // Tangentenpunkt der geraden Flanke vom unteren Punkt (0, -yTip) zum rechten Kreis
  const vx = -xc;
  const vy = -yc - yTip;
  const dist = Math.hypot(vx, vy);
  const phiBase = Math.atan2(vy, vx);
  const alphaTangent = Math.acos(clamp(R / dist, -1, 1));
  const phiTangent = phiBase + alphaTangent;

  // Cleft (oberer Schnittpunkt der beiden Lappen bei x = 0):
  const yCleft = yc + Math.sqrt(Math.max(0, R * R - xc * xc));
  const phiCleftRight = Math.atan2(yCleft - yc, 0 - xc);

  // Punkte im Uhrzeigersinn (Blick von oben auf XZ):
  // Start: untere Spitze (0, -yTip)
  // -> rechte Tangente zu tRight
  // -> rechter Kreisbogen von phiTangent zu phiCleftRight
  // -> linker Kreisbogen von phiCleftLeft zu phiTangentLeft
  // -> linke Tangente zurück zur Spitze
  const rawPoints: Point2D[] = [];

  // Untere Spitze
  rawPoints.push({ x: 0, y: -yTip });

  // Rechter Kreisbogen (von phiTangent bis vor phiCleftRight)
  let deltaRight = phiCleftRight - phiTangent;
  while (deltaRight < 0) deltaRight += Math.PI * 2;
  const rightSteps = Math.max(4, Math.round(steps / 2));
  for (let i = 0; i < rightSteps; i += 1) {
    const frac = i / rightSteps;
    const phi = phiTangent + frac * deltaRight;
    rawPoints.push({
      x: xc + R * Math.cos(phi),
      y: yc + R * Math.sin(phi),
    });
  }

  // Oberer Cleft-Punkt
  rawPoints.push({ x: 0, y: yCleft });

  // Linker Kreisbogen (von kurz nach Cleft bis phiTangentLeft)
  for (let i = rightSteps - 1; i >= 0; i -= 1) {
    const frac = i / rightSteps;
    const phi = phiTangent + frac * deltaRight;
    rawPoints.push({
      x: -(xc + R * Math.cos(phi)),
      y: yc + R * Math.sin(phi),
    });
  }

  // 2. Bounding-Box ermitteln und exakt auf [-safeWidth/2, safeWidth/2] und [-safeDepth/2, safeDepth/2] einpassen
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

  // 3. Spitzenverrundung (Tip Fillet) anwenden, falls gefordert
  if (fillet <= 0.01) {
    return scaledPoints;
  }

  // Vertex 0 ist die Spitze. Vorheriger Punkt ist das Ende der linken Flanke, nächster Punkt ist Start der rechten Flanke.
  const P = scaledPoints[0];
  const prev = scaledPoints[scaledPoints.length - 1];
  const next = scaledPoints[1];

  const edgeLen = Math.hypot(next.x - P.x, next.y - P.y);
  const { sinAlpha, tanAlpha } = cornerAngles(prev, P, next);
  const maxTangent = edgeLen * 0.45;
  const t = Math.min(maxTangent, fillet / tanAlpha);
  const r = t * tanAlpha;

  if (t <= 0.01 || r <= 0.01) {
    return scaledPoints;
  }

  const u1 = { x: (prev.x - P.x) / Math.hypot(prev.x - P.x, prev.y - P.y), y: (prev.y - P.y) / Math.hypot(prev.x - P.x, prev.y - P.y) };
  const u2 = { x: (next.x - P.x) / Math.hypot(next.x - P.x, next.y - P.y), y: (next.y - P.y) / Math.hypot(next.x - P.x, next.y - P.y) };
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

  const filletSteps = Math.max(4, Math.round(steps / 4));
  const filletArc: Point2D[] = [];
  for (let s = 0; s <= filletSteps; s += 1) {
    const fraction = s / filletSteps;
    const phi = phi1 + fraction * deltaPhi;
    filletArc.push({
      x: C.x + r * Math.cos(phi),
      y: C.y + r * Math.sin(phi),
    });
  }

  return [...filletArc, ...scaledPoints.slice(1)];
}

/**
 * Erzeugt einen geschlossenen, wasserdichten 3D-Herzkörper (2-Mannigfaltigkeit).
 */
export function createHeartGeometry({
  width,
  depth,
  height,
  heartTipFillet,
  heartQuality,
}: HeartGeometryOptions): THREE.BufferGeometry {
  const safeWidth = Math.max(0.01, width);
  const safeDepth = Math.max(0.01, depth);
  const safeHeight = Math.max(0.01, height);

  const tipFillet = normalizeHeartTipFillet(heartTipFillet);
  const quality = normalizeHeartQuality(heartQuality);

  const contour2D = buildHeartContourPoints(safeWidth, safeDepth, tipFillet, quality);
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
  // Da das Herz an der oberen Kerbe konkav ist, verwenden wir Standard-Polygon-Triangulierung.
  const triPoints = contour2D.map((p) => new THREE.Vector2(p.x, p.y));
  const isClockwise = THREE.ShapeUtils.isClockWise(triPoints);
  const faces2D = THREE.ShapeUtils.triangulateShape(triPoints, []);

  faces2D.forEach(([a, b, c]) => {
    if (isClockwise) {
      indices.push(M + a, M + b, M + c);
      indices.push(a, c, b);
    } else {
      indices.push(M + a, M + c, M + b);
      indices.push(a, b, c);
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
