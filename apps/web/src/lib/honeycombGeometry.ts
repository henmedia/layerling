import * as THREE from "three";
import { toCreasedNormals } from "@/lib/creasedNormals";

export const DEFAULT_HONEYCOMB_WIDTH = 60;
export const DEFAULT_HONEYCOMB_DEPTH = 60;
export const DEFAULT_HONEYCOMB_HEIGHT = 3;
export const DEFAULT_HONEYCOMB_CELL_SIZE = 8;
export const DEFAULT_HONEYCOMB_WALL_THICKNESS = 1.6;
export const DEFAULT_HONEYCOMB_FRAME_WIDTH = 3;

export function normalizeHoneycombCellSize(value: unknown): number {
  if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) {
    return DEFAULT_HONEYCOMB_CELL_SIZE;
  }
  return Math.max(2, Math.min(100, Math.round(value * 10) / 10));
}

export function normalizeHoneycombWallThickness(value: unknown): number {
  if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) {
    return DEFAULT_HONEYCOMB_WALL_THICKNESS;
  }
  return Math.max(0.4, Math.min(50, Math.round(value * 10) / 10));
}

export function normalizeHoneycombFrameWidth(value: unknown): number {
  if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) {
    return DEFAULT_HONEYCOMB_FRAME_WIDTH;
  }
  return Math.max(0, Math.min(100, Math.round(value * 10) / 10));
}

export type HoneycombGeometryOptions = {
  width?: number;
  depth?: number;
  height?: number;
  honeycombCellSize?: number;
  honeycombWallThickness?: number;
  honeycombFrameWidth?: number;
};

/**
 * Erzeugt die 2D-Polygonpunkte der hexagonalen Aussparungen für das Wabengitter.
 * Jede Wabe ist ein regelmäßiges Sechseck (pointy-topped) oder an den seitlichen
 * Rändern bei Bedarf eine halbe Wabe (Trapez mit gerader Kante zum Rahmen).
 */
export function buildHoneycombHoles(
  width: number,
  depth: number,
  cellSize: number,
  wallThickness: number,
  frameWidth: number,
): THREE.Vector2[][] {
  const S = Math.max(1, cellSize);
  const T = Math.max(0.2, wallThickness);
  const maxFrame = Math.max(0, Math.min(width, depth) / 2 - 0.5);
  const F = Math.min(Math.max(0, frameWidth), maxFrame);

  // Mindestabstand zur Außenkontur (mindestens 0.1 mm auch bei frameWidth = 0)
  const effectiveF = Math.max(0.1, F);

  const innerMinX = -width / 2 + effectiveF;
  const innerMaxX = width / 2 - effectiveF;
  const innerMinZ = -depth / 2 + effectiveF;
  const innerMaxZ = depth / 2 - effectiveF;

  if (innerMaxX <= innerMinX || innerMaxZ <= innerMinZ) {
    return [];
  }

  // Hexagonales Bravais-Gitter mit exakt gleichmäßiger Stegbreite T
  const v1x = S + T;
  const v1z = 0;
  const v2x = 0.5 * (S + T);
  const v2z = (Math.sqrt(3) / 2) * (S + T);

  // Radius der Sechseck-Eckpunkte für lichte Weite (Schlüsselweite) S
  const R = S / Math.sqrt(3);

  const maxI = Math.ceil(width / (S + T)) + 2;
  const maxJ = Math.ceil(depth / v2z) + 2;

  const roundCoord = (val: number): number => Math.round(val * 1e5) / 1e5;

  const holes: THREE.Vector2[][] = [];

  for (let j = -maxJ; j <= maxJ; j += 1) {
    for (let i = -maxI; i <= maxI; i += 1) {
      const cx = i * v1x + j * v2x;
      const cz = i * v1z + j * v2z;

      // 1. Prüfen, ob ein ganzes Sechseck vollständig hineinpasst
      const fullVerts: THREE.Vector2[] = [];
      let fullFits = true;
      for (let k = 0; k < 6; k += 1) {
        // Pointy-topped Sechseck (Winkel 30°, 90°, 150°, 210°, 270°, 330°)
        const angle = (Math.PI / 6) + k * (Math.PI / 3);
        const vx = roundCoord(cx + R * Math.cos(angle));
        const vz = roundCoord(cz + R * Math.sin(angle));
        if (vx < innerMinX || vx > innerMaxX || vz < innerMinZ || vz > innerMaxZ) {
          fullFits = false;
          break;
        }
        fullVerts.push(new THREE.Vector2(vx, vz));
      }

      if (fullFits) {
        holes.push(fullVerts);
      } else {
        // 2. An den seitlichen Rändern prüfen, ob ein halbes Sechseck Platz findet
        // Linke Hälfte (am rechten Rand: ebener vertikaler Schnitt bei x = cx zum Rahmen)
        if (
          cz - R >= innerMinZ && cz + R <= innerMaxZ &&
          cx - S / 2 >= innerMinX && cx <= innerMaxX
        ) {
          holes.push([
            new THREE.Vector2(roundCoord(cx), roundCoord(cz + R)),
            new THREE.Vector2(roundCoord(cx - S / 2), roundCoord(cz + R / 2)),
            new THREE.Vector2(roundCoord(cx - S / 2), roundCoord(cz - R / 2)),
            new THREE.Vector2(roundCoord(cx), roundCoord(cz - R)),
          ]);
        }
        // Rechte Hälfte (am linken Rand: ebener vertikaler Schnitt bei x = cx zum Rahmen)
        else if (
          cz - R >= innerMinZ && cz + R <= innerMaxZ &&
          cx >= innerMinX && cx + S / 2 <= innerMaxX
        ) {
          holes.push([
            new THREE.Vector2(roundCoord(cx), roundCoord(cz - R)),
            new THREE.Vector2(roundCoord(cx + S / 2), roundCoord(cz - R / 2)),
            new THREE.Vector2(roundCoord(cx + S / 2), roundCoord(cz + R / 2)),
            new THREE.Vector2(roundCoord(cx), roundCoord(cz + R)),
          ]);
        }
      }
    }
  }

  // Löcher im Uhrzeigersinn (CW) für ShapeUtils.triangulateShape ausrichten
  return holes.map((pts) => {
    if (!THREE.ShapeUtils.isClockWise(pts)) {
      pts.reverse();
    }
    return pts;
  });
}

/**
 * Erzeugt einen geschlossenen, wasserdichten 3D-Wabengitterkörper (2-Mannigfaltigkeit).
 * Das Gitter füllt den Begrenzungsrahmen [-width/2, width/2] x [0, height] x [-depth/2, depth/2] exakt aus
 * und eignet sich sowohl als solider Körper als auch als CSG-Aussparung für Durchbrüche.
 */
export function createHoneycombGeometry(options: HoneycombGeometryOptions = {}): THREE.BufferGeometry {
  const safeWidth = Math.max(0.001, options.width ?? DEFAULT_HONEYCOMB_WIDTH);
  const safeDepth = Math.max(0.001, options.depth ?? DEFAULT_HONEYCOMB_DEPTH);
  const safeHeight = Math.max(0.001, options.height ?? DEFAULT_HONEYCOMB_HEIGHT);
  const safeCellSize = normalizeHoneycombCellSize(options.honeycombCellSize);
  const safeWallThickness = normalizeHoneycombWallThickness(options.honeycombWallThickness);
  const safeFrameWidth = normalizeHoneycombFrameWidth(options.honeycombFrameWidth);

  const roundCoord = (val: number): number => Math.round(val * 1e5) / 1e5;

  const holes = buildHoneycombHoles(
    safeWidth,
    safeDepth,
    safeCellSize,
    safeWallThickness,
    safeFrameWidth,
  );

  // Äußere Rechteckkontur gegen den Uhrzeigersinn (CCW)
  const outer: THREE.Vector2[] = [
    new THREE.Vector2(roundCoord(-safeWidth / 2), roundCoord(-safeDepth / 2)),
    new THREE.Vector2(roundCoord(safeWidth / 2), roundCoord(-safeDepth / 2)),
    new THREE.Vector2(roundCoord(safeWidth / 2), roundCoord(safeDepth / 2)),
    new THREE.Vector2(roundCoord(-safeWidth / 2), roundCoord(safeDepth / 2)),
  ];

  const allPoints2D: THREE.Vector2[] = [...outer];
  const holeOffsets: { start: number; count: number }[] = [];
  holes.forEach((h) => {
    holeOffsets.push({ start: allPoints2D.length, count: h.length });
    allPoints2D.push(...h);
  });

  const M = allPoints2D.length;
  const positions: number[] = [];
  const indices: number[] = [];

  // 1. Vertizes erzeugen (0 .. M-1: Boden y=0; M .. 2M-1: Deckel y=safeHeight)
  for (let i = 0; i < M; i += 1) {
    positions.push(allPoints2D[i].x, 0, allPoints2D[i].y);
  }
  for (let i = 0; i < M; i += 1) {
    positions.push(allPoints2D[i].x, safeHeight, allPoints2D[i].y);
  }

  // 2. Deckel- und Bodentriangulierung (Ear-Clipping mit Lochunterstützung)
  const rawFaces2D = THREE.ShapeUtils.triangulateShape(outer, holes);
  const faces2D: [number, number, number][] = [];
  for (const [a, b, c] of rawFaces2D) {
    const pA = allPoints2D[a], pB = allPoints2D[b], pC = allPoints2D[c];
    const crossArea = (pB.x - pA.x) * (pC.y - pA.y) - (pB.y - pA.y) * (pC.x - pA.x);
    if (Math.abs(crossArea) > 1e-7) {
      faces2D.push([a, b, c]);
    }
  }

  faces2D.forEach(([a, b, c]) => {
    // Deckel y = safeHeight (Normale +Y)
    indices.push(M + a, M + c, M + b);
    // Boden y = 0 (Normale -Y)
    indices.push(a, b, c);
  });

  // 3. Äußere Seitenwände (outer ist CCW)
  for (let i = 0; i < outer.length; i += 1) {
    const next = (i + 1) % outer.length;
    const bi = i;
    const bNext = next;
    const ti = M + i;
    const tNext = M + next;
    indices.push(bi, tNext, bNext);
    indices.push(bi, ti, tNext);
  }

  // 4. Innere Waben-Seitenwände (holes sind CW -> Normale zeigt in das Loch)
  holeOffsets.forEach(({ start, count }) => {
    for (let i = 0; i < count; i += 1) {
      const next = (i + 1) % count;
      const bi = start + i;
      const bNext = start + next;
      const ti = M + start + i;
      const tNext = M + start + next;
      indices.push(bi, tNext, bNext);
      indices.push(bi, ti, tNext);
    }
  });

  const indexed = new THREE.BufferGeometry();
  indexed.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  indexed.setIndex(indices);

  // 30° Creased-Normals halten Deckel und Seitenkanten bei 90° und Sechskantkanten bei 60° scharf
  const geometry = toCreasedNormals(indexed, THREE.MathUtils.degToRad(30));
  indexed.dispose();
  geometry.computeBoundingBox();

  return geometry;
}
