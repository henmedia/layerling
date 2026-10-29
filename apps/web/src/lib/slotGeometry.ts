import * as THREE from "three";
import { toCreasedNormals } from "@/lib/creasedNormals";
import { roundSideCount } from "@/lib/roundSideCount";

export const DEFAULT_SLOT_WIDTH = 40;
export const DEFAULT_SLOT_DEPTH = 20;
export const DEFAULT_SLOT_HEIGHT = 20;

export type SlotGeometryOptions = {
  width: number;
  depth: number;
  height: number;
  sides?: number;
  /** The small end's diameter as a share of the large one, 1 for the plain capsule (#206). */
  slotEndRatio?: number;
};

type Point2D = { x: number; y: number };

/** The smallest small end: a tenth of the large one. */
export const MIN_SLOT_END_RATIO = 0.1;

export function normalizeSlotEndRatio(value: number | undefined) {
  return Number.isFinite(value) ? Math.min(1, Math.max(MIN_SLOT_END_RATIO, value as number)) : 1;
}

/**
 * A capsule with a smaller second end (#206, a belt guard): along its long axis the large
 * circle (radius R) sits at the start, the small one (radius r) at the end, both touching the
 * frame's ends, and the sides run as the two outer tangents. Measured along the long axis `u`
 * from the frame's middle, across it `v`. `angle` is where the tangents touch, from the long
 * axis: the small end's arc runs from -angle to +angle, the large one's from angle round to
 * 2 pi - angle. Null for the plain capsule.
 */
export function taperedSlotOutline(width: number, depth: number, ratio: number | undefined) {
  const share = normalizeSlotEndRatio(ratio);
  if (share > 1 - 1e-6) return null;
  const alongX = width >= depth;
  const length = Math.max(0.01, alongX ? width : depth);
  const R = Math.max(0.005, (alongX ? depth : width) / 2);
  let r = R * share;
  // The circles must not overlap so far that the small one sits inside: keep the centres apart.
  const centreDistance = () => length - R - r;
  if (centreDistance() <= (R - r) * 1.001) r = Math.max(R * MIN_SLOT_END_RATIO, R - (length - 2 * R) / 2);
  const c = Math.max(1e-6, centreDistance());
  const tilt = Math.asin(Math.min(0.999, (R - r) / c));
  return { alongX, R, r, largeU: -length / 2 + R, smallU: length / 2 - r, angle: Math.PI / 2 - tilt, centreDistance: c };
}

/** The tapered capsule's outline as points, counter-clockwise in (u, v) and mapped to (x, y). */
function taperedSlotContourPoints(width: number, depth: number, ratio: number | undefined, arcSteps: number): Point2D[] | null {
  const outline = taperedSlotOutline(width, depth, ratio);
  if (!outline) return null;
  const { alongX, R, r, largeU, smallU, angle } = outline;
  const points: Point2D[] = [];
  const push = (u: number, v: number) => points.push(alongX ? { x: u, y: v } : { x: v, y: u });
  const smallSteps = Math.max(2, Math.round((arcSteps * 2 * angle) / Math.PI));
  const largeSteps = Math.max(4, Math.round((arcSteps * (2 * Math.PI - 2 * angle)) / Math.PI));
  for (let i = 0; i <= smallSteps; i += 1) {
    const phi = -angle + (2 * angle * i) / smallSteps;
    push(smallU + r * Math.cos(phi), r * Math.sin(phi));
  }
  for (let i = 0; i <= largeSteps; i += 1) {
    const phi = angle + ((2 * Math.PI - 2 * angle) * i) / largeSteps;
    push(largeU + R * Math.cos(phi), R * Math.sin(phi));
  }
  // Along z the mapping mirrors the turn; the outline is still one closed ring.
  return points;
}

/**
 * Erzeugt die geschlossene 2D-Kontur eines Langlochs / einer Kapsel
 * (zwei parallele Geraden mit zwei tangentialen Halbkreisbögen an den Enden).
 * Füllt die Bounding-Box [-width/2, width/2] x [-depth/2, depth/2] exakt aus.
 */
export function buildSlotContourPoints(
  width: number,
  depth: number,
  sides?: number,
  slotEndRatio?: number,
): Point2D[] {
  const safeW = Math.max(0.01, width);
  const safeD = Math.max(0.01, depth);
  const minDim = Math.min(safeW, safeD);
  const effectiveSides = roundSideCount(sides, minDim, minDim);
  const arcSteps = Math.max(4, Math.round(effectiveSides / 2));
  const tapered = taperedSlotContourPoints(safeW, safeD, slotEndRatio, arcSteps);
  // The ring closes by itself: from the large arc's end the lower tangent runs back to the start.
  if (tapered) return tapered;
  const pts: Point2D[] = [];

  if (safeW >= safeD) {
    // Horizontales Langloch entlang der X-Achse
    const R = safeD / 2;
    const hx = (safeW - safeD) / 2;

    if (hx > 1e-4) {
      pts.push({ x: -hx, y: -R });
      pts.push({ x: hx, y: -R });
    } else {
      pts.push({ x: 0, y: -R });
    }

    // Rechter Halbkreis von -PI/2 bis +PI/2
    for (let i = 1; i <= arcSteps; i += 1) {
      const phi = -Math.PI / 2 + (i / arcSteps) * Math.PI;
      pts.push({ x: hx + R * Math.cos(phi), y: R * Math.sin(phi) });
    }

    // Untere Gerade nach links
    if (hx > 1e-4) {
      pts.push({ x: -hx, y: R });
    }

    // Linker Halbkreis von +PI/2 bis +3PI/2
    for (let i = 1; i < arcSteps; i += 1) {
      const phi = Math.PI / 2 + (i / arcSteps) * Math.PI;
      pts.push({ x: -hx + R * Math.cos(phi), y: R * Math.sin(phi) });
    }
  } else {
    // Vertikales Langloch entlang der Z-Achse (Tiefe)
    const R = safeW / 2;
    const hz = (safeD - safeW) / 2;

    if (hz > 1e-4) {
      pts.push({ x: R, y: -hz });
      pts.push({ x: R, y: hz });
    } else {
      pts.push({ x: R, y: 0 });
    }

    // Hinterer / unterer Halbkreis von 0 bis PI
    for (let i = 1; i <= arcSteps; i += 1) {
      const phi = (i / arcSteps) * Math.PI;
      pts.push({ x: R * Math.cos(phi), y: hz + R * Math.sin(phi) });
    }

    // Linke Gerade nach oben
    if (hz > 1e-4) {
      pts.push({ x: -R, y: -hz });
    }

    // Vorderer / oberer Halbkreis von PI bis 2PI
    for (let i = 1; i < arcSteps; i += 1) {
      const phi = Math.PI + (i / arcSteps) * Math.PI;
      pts.push({ x: R * Math.cos(phi), y: -hz + R * Math.sin(phi) });
    }
  }

  return pts;
}

/**
 * Erzeugt einen geschlossenen, wasserdichten 3D-Langlochkörper (2-Mannigfaltigkeit).
 */
export function createSlotGeometry({
  width,
  depth,
  height,
  sides,
  slotEndRatio,
}: SlotGeometryOptions): THREE.BufferGeometry {
  const safeWidth = Math.max(0.01, width);
  const safeDepth = Math.max(0.01, depth);
  const safeHeight = Math.max(0.01, height);

  const minDim = Math.min(safeWidth, safeDepth);
  const effectiveSides = roundSideCount(sides, minDim, minDim);
  const contour2D = buildSlotContourPoints(safeWidth, safeDepth, effectiveSides, slotEndRatio);
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

  // 1. Deckel- und Bodentriangulierung
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
