import * as THREE from "three";
import { toCreasedNormals } from "@/lib/creasedNormals";

export const DEFAULT_ROUNDED_BOX_WIDTH = 40;
export const DEFAULT_ROUNDED_BOX_DEPTH = 30;
export const DEFAULT_ROUNDED_BOX_HEIGHT = 20;
export const DEFAULT_ROUNDED_BOX_CORNER_FILLET = 5;
export const DEFAULT_ROUNDED_BOX_TOP_BOTTOM_FILLET = 0;
export const DEFAULT_ROUNDED_BOX_QUALITY = 8;

// 1 is a chamfered corner: one straight piece instead of the arc (#239).
export const MIN_ROUNDED_BOX_QUALITY = 1;
export const MAX_ROUNDED_BOX_QUALITY = 32;

export function normalizeCornerFillet(val: unknown, maxFillet = 50): number {
  const n = typeof val === "number" && Number.isFinite(val) ? val : DEFAULT_ROUNDED_BOX_CORNER_FILLET;
  return Math.max(0, Math.min(maxFillet, Math.round(n * 100) / 100));
}

export function normalizeTopBottomFillet(val: unknown, maxFillet = 50): number {
  const n = typeof val === "number" && Number.isFinite(val) ? val : DEFAULT_ROUNDED_BOX_TOP_BOTTOM_FILLET;
  return Math.max(0, Math.min(maxFillet, Math.round(n * 100) / 100));
}

export function normalizeRoundedBoxQuality(val: unknown): number {
  const n = typeof val === "number" && Number.isFinite(val) ? Math.round(val) : DEFAULT_ROUNDED_BOX_QUALITY;
  return Math.max(MIN_ROUNDED_BOX_QUALITY, Math.min(MAX_ROUNDED_BOX_QUALITY, n));
}

export type RoundedBoxGeometryOptions = {
  width: number;
  depth: number;
  height: number;
  cornerFillet?: number;
  topBottomFillet?: number;
  roundedBoxQuality?: number;
};

type Point2D = { x: number; z: number };

/**
 * Erzeugt die 2D-Perimeterkontur eines abgerundeten Rechtecks im Uhrzeigersinn (CCW von oben betrachtet).
 */
export function buildRoundedRectContour(
  width: number,
  depth: number,
  cornerFillet: number,
  quality: number,
): Point2D[] {
  const safeW = Math.max(0.01, width);
  const safeD = Math.max(0.01, depth);
  const maxR = Math.min(safeW / 2, safeD / 2);
  const r = Math.max(0, Math.min(maxR, cornerFillet));
  const q = Math.max(1, quality);

  if (r <= 1e-5) {
    const hw = safeW / 2;
    const hd = safeD / 2;
    return [
      { x: hw, z: -hd },
      { x: hw, z: hd },
      { x: -hw, z: hd },
      { x: -hw, z: -hd },
    ];
  }

  const cx = safeW / 2 - r;
  const cz = safeD / 2 - r;
  const pts: Point2D[] = [];

  // Ecke 1: +X, -Z nach +X, +Z (im Gegenuhrzeigersinn von oben: 0° bis 90° etc.)
  // Quadrant 1: X > 0, Z > 0 (Winkel 0 bis PI/2)
  for (let i = 0; i <= q; i += 1) {
    const a = (i / q) * (Math.PI / 2);
    pts.push({ x: cx + r * Math.cos(a), z: cz + r * Math.sin(a) });
  }
  // Quadrant 2: X < 0, Z > 0 (Winkel PI/2 bis PI)
  for (let i = 0; i <= q; i += 1) {
    const a = Math.PI / 2 + (i / q) * (Math.PI / 2);
    pts.push({ x: -cx + r * Math.cos(a), z: cz + r * Math.sin(a) });
  }
  // Quadrant 3: X < 0, Z < 0 (Winkel PI bis 3PI/2)
  for (let i = 0; i <= q; i += 1) {
    const a = Math.PI + (i / q) * (Math.PI / 2);
    pts.push({ x: -cx + r * Math.cos(a), z: -cz + r * Math.sin(a) });
  }
  // Quadrant 4: X > 0, Z < 0 (Winkel 3PI/2 bis 2PI)
  for (let i = 0; i <= q; i += 1) {
    const a = 1.5 * Math.PI + (i / q) * (Math.PI / 2);
    pts.push({ x: cx + r * Math.cos(a), z: -cz + r * Math.sin(a) });
  }

  // Konsekutive Duplikate filtern
  const clean: Point2D[] = [];
  for (let i = 0; i < pts.length; i += 1) {
    const curr = pts[i];
    const prev = clean[clean.length - 1];
    if (!prev || Math.hypot(curr.x - prev.x, curr.z - prev.z) > 1e-5) {
      clean.push(curr);
    }
  }
  if (clean.length > 2) {
    const first = clean[0];
    const last = clean[clean.length - 1];
    if (Math.hypot(first.x - last.x, first.z - last.z) < 1e-5) {
      clean.pop();
    }
  }

  return clean;
}

/**
 * Erzeugt einen extrudierten Quader mit 4 verrundeten Ecken (flacher Boden und Deckel).
 */
function createExtrudedRoundedBox(
  width: number,
  depth: number,
  height: number,
  cornerFillet: number,
  quality: number,
): THREE.BufferGeometry {
  const contour = buildRoundedRectContour(width, depth, cornerFillet, quality);
  const n = contour.length;

  const shapeVecs = contour.map((p) => new THREE.Vector2(p.x, p.z));
  const triIndices = THREE.ShapeUtils.triangulateShape(shapeVecs, []);

  const vertices: number[] = [];

  // Boden: y = 0, Normal (0, -1, 0).
  // shapeVecs triangulated in (x, z) has negative Y component with (p0, p1, p2).
  for (const tri of triIndices) {
    const [i0, i1, i2] = tri;
    const p0 = contour[i0];
    const p1 = contour[i1];
    const p2 = contour[i2];
    vertices.push(p0.x, 0, p0.z);
    vertices.push(p1.x, 0, p1.z);
    vertices.push(p2.x, 0, p2.z);
  }

  // Deckel: y = height, Normal (0, 1, 0).
  // Reverse order (p0, p2, p1) for positive Y component.
  for (const tri of triIndices) {
    const [i0, i1, i2] = tri;
    const p0 = contour[i0];
    const p1 = contour[i1];
    const p2 = contour[i2];
    vertices.push(p0.x, height, p0.z);
    vertices.push(p2.x, height, p2.z);
    vertices.push(p1.x, height, p1.z);
  }

  // Seitenwände: Quads zwischen y=0 und y=height mit Normalen nach außen
  for (let i = 0; i < n; i += 1) {
    const j = (i + 1) % n;
    const pi = contour[i];
    const pj = contour[j];

    // Dreieck 1
    vertices.push(pi.x, 0, pi.z);
    vertices.push(pj.x, height, pj.z);
    vertices.push(pj.x, 0, pj.z);

    // Dreieck 2
    vertices.push(pi.x, 0, pi.z);
    vertices.push(pi.x, height, pi.z);
    vertices.push(pj.x, height, pj.z);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();

  const creased = toCreasedNormals(geometry, THREE.MathUtils.degToRad(30));
  geometry.dispose();

  creased.computeBoundingBox();
  creased.computeBoundingSphere();
  return creased;
}

/**
 * Quality 1 with the top and bottom edges rounded too (#239): every one of the twelve edges is
 * one flat 45 degree chamfer and every corner one triangle. The grid of the full box cannot
 * give that - its arcs always have twice the pieces of the quality, so 1 became two.
 *
 * Built as the box's inner core pushed out by an octahedron: per octant the three points where
 * the axes leave it (A along x, B along y, C along z), joined by a triangle across each corner,
 * a quad along each edge and a quad on each face.
 */
function createChamferedBox(width: number, depth: number, height: number, rc: number, rtb: number): THREE.BufferGeometry {
  const innerX = width / 2 - rc;
  const innerY = height / 2 - rtb;
  const innerZ = depth / 2 - rc;
  const signs = [1, -1];
  const point = (kind: "A" | "B" | "C", sx: number, sy: number, sz: number) => new THREE.Vector3(
    (innerX + (kind === "A" ? rc : 0)) * sx,
    (innerY + (kind === "B" ? rtb : 0)) * sy + height / 2,
    (innerZ + (kind === "C" ? rc : 0)) * sz,
  );

  const centre = new THREE.Vector3(0, height / 2, 0);
  const vertices: number[] = [];
  const triangle = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => {
    const normal = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
    // A fully rounded side leaves slivers of no area; they would only confuse the normals.
    if (normal.lengthSq() < 1e-14) return;
    const middle = new THREE.Vector3().add(a).add(b).add(c).divideScalar(3);
    // The body is convex, so a triangle faces outward when it points away from the centre.
    const outward = normal.dot(middle.sub(centre)) >= 0;
    (outward ? [a, b, c] : [a, c, b]).forEach((p) => vertices.push(p.x, p.y, p.z));
  };
  const quad = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3) => {
    triangle(a, b, c);
    triangle(a, c, d);
  };

  for (const sx of signs) {
    for (const sy of signs) {
      for (const sz of signs) {
        triangle(point("A", sx, sy, sz), point("B", sx, sy, sz), point("C", sx, sy, sz));
      }
    }
  }
  for (const s1 of signs) {
    for (const s2 of signs) {
      // The edges along z (between A and B), along x (B and C) and along y (A and C).
      quad(point("A", s1, s2, 1), point("B", s1, s2, 1), point("B", s1, s2, -1), point("A", s1, s2, -1));
      quad(point("B", 1, s1, s2), point("C", 1, s1, s2), point("C", -1, s1, s2), point("B", -1, s1, s2));
      quad(point("A", s1, 1, s2), point("C", s1, 1, s2), point("C", s1, -1, s2), point("A", s1, -1, s2));
    }
  }
  for (const s of signs) {
    quad(point("A", s, 1, 1), point("A", s, 1, -1), point("A", s, -1, -1), point("A", s, -1, 1));
    quad(point("B", 1, s, 1), point("B", 1, s, -1), point("B", -1, s, -1), point("B", -1, s, 1));
    quad(point("C", 1, 1, s), point("C", 1, -1, s), point("C", -1, -1, s), point("C", -1, 1, s));
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  const creased = toCreasedNormals(geometry, THREE.MathUtils.degToRad(30));
  geometry.dispose();
  creased.computeBoundingBox();
  creased.computeBoundingSphere();
  return creased;
}

/**
 * Erzeugt einen allseitig verrundeten Quader (sowohl vertikale Ecken als auch Deckel/Boden-Kanten).
 */
function createFullRoundedBox(
  width: number,
  depth: number,
  height: number,
  rc: number,
  rtb: number,
  q: number,
): THREE.BufferGeometry {
  const segX = q * 2 + 1;
  const segZ = q * 2 + 1;
  const segY = q * 2 + 1;

  const baseGeo = new THREE.BoxGeometry(1, 1, 1, segX, segY, segZ);
  const nonIndexed = baseGeo.toNonIndexed();
  baseGeo.dispose();

  const pos = nonIndexed.attributes.position.array;

  const innerX = width / 2 - rc;
  const innerY = height / 2 - rtb;
  const innerZ = depth / 2 - rc;

  const halfSegX = 0.5 / segX;
  const halfSegY = 0.5 / segY;
  const halfSegZ = 0.5 / segZ;

  const normal = new THREE.Vector3();
  const v = new THREE.Vector3();

  for (let i = 0; i < pos.length; i += 3) {
    v.set(pos[i], pos[i + 1], pos[i + 2]);
    normal.copy(v);
    normal.x -= Math.sign(normal.x) * halfSegX;
    normal.y -= Math.sign(normal.y) * halfSegY;
    normal.z -= Math.sign(normal.z) * halfSegZ;

    normal.normalize();

    pos[i] = innerX * Math.sign(v.x) + normal.x * rc;
    pos[i + 1] = innerY * Math.sign(v.y) + normal.y * rtb + height / 2;
    pos[i + 2] = innerZ * Math.sign(v.z) + normal.z * rc;
  }

  nonIndexed.computeVertexNormals();
  const creased = toCreasedNormals(nonIndexed, THREE.MathUtils.degToRad(30));
  nonIndexed.dispose();

  creased.computeBoundingBox();
  creased.computeBoundingSphere();
  return creased;
}

/**
 * Erzeugt einen wasserdichten 2-Mannigfaltigkeits-Quader mit separat einstellbaren,
 * größenunabhängig konstanten Verrundungen für:
 * 1. Eckenradius (4 aufrechte vertikale Kanten, ideal für Gehäuse & 3D-Druck)
 * 2. Kantenradius (Deckel- und Bodenkanten)
 *
 * Im Gegensatz zu vielen anderen Programmen bleiben die Radien bei Änderungen von Breite, Tiefe
 * oder Höhe absolut konstant und verzerren nicht zu Ellipsen.
 */
export function createRoundedBoxGeometry({
  width,
  depth,
  height,
  cornerFillet = DEFAULT_ROUNDED_BOX_CORNER_FILLET,
  topBottomFillet = DEFAULT_ROUNDED_BOX_TOP_BOTTOM_FILLET,
  roundedBoxQuality = DEFAULT_ROUNDED_BOX_QUALITY,
}: RoundedBoxGeometryOptions): THREE.BufferGeometry {
  const safeW = Math.max(0.01, width);
  const safeD = Math.max(0.01, depth);
  const safeH = Math.max(0.01, height);

  const maxCorner = Math.min(safeW / 2, safeD / 2);
  const maxTopBottom = safeH / 2;

  const rc = Math.max(0, Math.min(maxCorner, cornerFillet));
  const rtb = Math.max(0, Math.min(maxTopBottom, topBottomFillet));
  const q = normalizeRoundedBoxQuality(roundedBoxQuality);

  if (rtb <= 1e-4) {
    return createExtrudedRoundedBox(safeW, safeD, safeH, rc, q);
  }

  if (q === 1) {
    return createChamferedBox(safeW, safeD, safeH, rc, rtb);
  }

  return createFullRoundedBox(safeW, safeD, safeH, rc, rtb, q);
}
