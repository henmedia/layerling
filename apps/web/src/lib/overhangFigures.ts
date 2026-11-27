import * as THREE from "three";
import { MeshBVH } from "three-mesh-bvh";
import { BREAKAWAY_FOOT_MM, standsOnBreakawayBase } from "@/lib/breakawayBase";
import { appendMeshData, meshForShape, type Vec3 } from "@/lib/editorMeshCore";
import { expandBundles } from "@/lib/editorBooleans";
import { numberLocale, t } from "@/lib/i18n";
import { OVERHANG_PLATE_TOLERANCE, overhangArea } from "@/lib/overhang";
import { displayShapeName } from "@/lib/shapeCatalog";
import { isNonSolidShape } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

/** What "Show overhangs" finds on one body: the area that needs supports and its steepest overhang. */
export type BodyOverhang = {
  id: string;
  name: string;
  areaMm2: number;
  lowestY: number | null;
  steepestDegrees: number | null;
};

/** The bodies "Show overhangs" hatches: visible solids, or only the given ids. */
export function overhangBodies(shapes: readonly WorkplaneShape[], ids: readonly string[] = []) {
  return shapes.filter((shape) => !shape.hidden && !shape.hole && !isNonSolidShape(shape) && (ids.length === 0 || ids.includes(shape.id)));
}

/** A point of a face as overhangArea hands it over. */
type Point = readonly [number, number, number];

/** A face is looked at in pieces about this long (mm), so a face only partly covered counts with its open part. */
const COVER_SAMPLE_MM = 1;
/** At most this many pieces along an edge of one face: 8 is 64 pieces for a big floor. */
const COVER_SAMPLE_STEPS = 8;
/**
 * A piece is tested this far (mm) out of its own body: inside another body there, it lies in that body or rests on it.
 * Two parts printed in place keep at least a tenth of a millimetre apart, so their faces still count.
 */
const COVER_STEP_MM = 0.01;
/** Rays cast in three directions, none along an axis, and the majority counts: one that grazes an edge is outvoted. */
const COVER_RAYS: ReadonlyArray<THREE.Vector3> = [
  new THREE.Vector3(0.5773, 0.6123, 0.5401).normalize(),
  new THREE.Vector3(-0.6411, 0.3149, 0.6999).normalize(),
  new THREE.Vector3(0.2903, -0.7013, -0.6511).normalize(),
];

/** One visible part another body's faces may lie in or rest on: its box at once, its search tree when first needed. */
type CoveringPart = { key: string; min: Point; max: Point; vertices: Vec3[]; faces: [number, number, number][]; bvh: MeshBVH | null };

/**
 * The visible bodies together, for telling which faces of a body lie in another body or rest on one (#2139): a text
 * sunk into a plate, or a plate printed upside down on its letters. Such a face becomes the inside of what prints and
 * needs no supports. Each part of a bundle counts on its own, so a group of a plate and its text reads the same.
 */
export type OverhangCover = { parts: CoveringPart[] };

function partKeys(shape: WorkplaneShape) {
  return expandBundles([shape]).filter((part) => !part.hole && !part.hidden).map((part, index) => ({ part, key: `${shape.id}/${index}` }));
}

/** The cover the given bodies give each other; `overhangBodies` picks the visible solids. */
export function overhangCover(shapes: readonly WorkplaneShape[]): OverhangCover {
  const parts: CoveringPart[] = [];
  for (const shape of overhangBodies(shapes)) {
    for (const { part, key } of partKeys(shape)) {
      const mesh = meshForShape(part);
      if (!mesh.faces.length) continue;
      const min: [number, number, number] = [Infinity, Infinity, Infinity];
      const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
      for (const vertex of mesh.vertices) {
        for (let axis = 0; axis < 3; axis += 1) {
          min[axis] = Math.min(min[axis], vertex[axis]);
          max[axis] = Math.max(max[axis], vertex[axis]);
        }
      }
      parts.push({ key, min, max, vertices: mesh.vertices, faces: mesh.faces, bvh: null });
    }
  }
  return { parts };
}

function coveringTree(part: CoveringPart) {
  if (!part.bvh) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(Float32Array.from(part.vertices.flat()), 3));
    geometry.setIndex(part.faces.flat());
    part.bvh = new MeshBVH(geometry);
  }
  return part.bvh;
}

const coverRay = new THREE.Ray();

/** Whether the point lies inside a closed part: a ray from it crosses the surface an odd number of times. */
function insidePart(part: CoveringPart, point: Point) {
  for (let axis = 0; axis < 3; axis += 1) {
    if (point[axis] < part.min[axis] - COVER_STEP_MM || point[axis] > part.max[axis] + COVER_STEP_MM) return false;
  }
  const tree = coveringTree(part);
  let votes = 0;
  for (const direction of COVER_RAYS) {
    coverRay.origin.set(point[0], point[1], point[2]);
    coverRay.direction.copy(direction);
    if (tree.raycast(coverRay, THREE.DoubleSide).length % 2 === 1) votes += 1;
  }
  return votes >= 2;
}

/**
 * How much of a face is open to the air (0 to 1): the share of its pieces that do not lie in another part of the
 * cover, or rest on one. `own` names the face's part, which never covers itself.
 */
export function openShare(cover: OverhangCover, own: string, corners: readonly [Point, Point, Point], outward: Point) {
  const [a, b, c] = corners;
  const longest = Math.max(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), Math.hypot(c[0] - b[0], c[1] - b[1], c[2] - b[2]), Math.hypot(a[0] - c[0], a[1] - c[1], a[2] - c[2]));
  const near = cover.parts.filter((part) => part.key !== own && [0, 1, 2].every((axis) => (
    Math.max(a[axis], b[axis], c[axis]) >= part.min[axis] - COVER_STEP_MM && Math.min(a[axis], b[axis], c[axis]) <= part.max[axis] + COVER_STEP_MM
  )));
  if (!near.length) return 1;
  const steps = Math.min(COVER_SAMPLE_STEPS, Math.max(1, Math.ceil(longest / COVER_SAMPLE_MM)));
  let open = 0;
  // The face cut into steps² equal small triangles, each read at its middle.
  const read = (u: number, v: number) => {
    const w = 1 - u - v;
    const point: Point = [
      a[0] * w + b[0] * u + c[0] * v + outward[0] * COVER_STEP_MM,
      a[1] * w + b[1] * u + c[1] * v + outward[1] * COVER_STEP_MM,
      a[2] * w + b[2] * u + c[2] * v + outward[2] * COVER_STEP_MM,
    ];
    if (!near.some((part) => insidePart(part, point))) open += 1;
  };
  for (let i = 0; i < steps; i += 1) {
    for (let j = 0; i + j < steps; j += 1) {
      read((i + 1 / 3) / steps, (j + 1 / 3) / steps);
      if (i + j < steps - 1) read((i + 2 / 3) / steps, (j + 2 / 3) / steps);
    }
  }
  return open / (steps * steps);
}

/**
 * A body's overhangs, read from its triangles in the world: a bundle's parts together, without its holes. A part on a
 * breakaway base is read on its own, without the foot that hangs over the socket on purpose (#1633). With
 * `startsWithinMm` only the faces that begin no higher than this above the plate are read. With a `cover`, faces that
 * lie in another visible body or rest on one do not count (#2139).
 */
export function bodyOverhang(shape: WorkplaneShape, angle: number, startsWithinMm = Infinity, cover?: OverhangCover): BodyOverhang {
  const parts = partKeys(shape);
  const onBase = parts.filter(({ part }) => standsOnBreakawayBase(part));
  const rest = parts.filter(({ part }) => !standsOnBreakawayBase(part));
  // Which part each triangle comes from, as runs: the first triangle of each part and its key.
  type Mesh = { vertices: Vec3[]; faces: [number, number, number][]; footMm: number; owners: Array<{ from: number; key: string }> };
  const meshes: Mesh[] = onBase.map(({ part, key }) => ({ ...meshForShape(part), footMm: BREAKAWAY_FOOT_MM, owners: [{ from: 0, key }] }));
  if (rest.length === 1) meshes.push({ ...meshForShape(rest[0].part), footMm: 0, owners: [{ from: 0, key: rest[0].key }] });
  else if (rest.length > 1) {
    const vertices: Vec3[] = [];
    const faces: [number, number, number][] = [];
    const owners: Mesh["owners"] = [];
    rest.forEach(({ part, key }) => {
      owners.push({ from: faces.length, key });
      appendMeshData(vertices, faces, meshForShape(part));
    });
    meshes.push({ vertices, faces, footMm: 0, owners });
  }
  let areaMm2 = 0;
  let lowestY: number | null = null;
  let steepestDegrees: number | null = null;
  for (const mesh of meshes) {
    const ownerOf = (face: number) => {
      let key = mesh.owners[0].key;
      for (const run of mesh.owners) if (run.from <= face) key = run.key;
      return key;
    };
    const share = cover && cover.parts.length > 1
      ? (corners: readonly [Point, Point, Point], outward: Point, face: number) => openShare(cover, ownerOf(face), corners, outward)
      : undefined;
    const found = overhangArea(mesh.vertices, mesh.faces, angle, 0, mesh.footMm, startsWithinMm, share);
    areaMm2 += found.areaMm2;
    if (found.lowestY !== null) lowestY = lowestY === null ? found.lowestY : Math.min(lowestY, found.lowestY);
    if (found.steepestDegrees !== null) steepestDegrees = steepestDegrees === null ? found.steepestDegrees : Math.max(steepestDegrees, found.steepestDegrees);
  }
  return { id: shape.id, name: shape.name, areaMm2, lowestY, steepestDegrees };
}

/** The overhang an edge treatment makes right where the body lies on the plate: its steepest angle against the limit. */
export type PlateEdgeOverhang = {
  angle: number;
  degrees: number;
};

/**
 * The treated body is meshed anew, in finer or coarser steps than before, and only the lowest step of a curve begins
 * on the plate: a curve that hung over there anyway measures differently by as much as its steps differ. Less than
 * this more area, or less than twice the area, is that and not an overhang the treatment made.
 */
const PLATE_EDGE_AREA_NOISE = 0.01;
const PLATE_EDGE_AREA_GROWTH = 2;

/**
 * Whether a body prints without supports where it lies on the plate once its edges are treated. A fillet on an edge
 * the body stands on begins level with the plate and leans out from there, so its first layers hang in the air; a
 * chamfer at the limit does not. Read from the faces that begin on the plate, before and after: only what the
 * treatment adds counts, so a ball that overhangs there anyway says nothing about its edges. Null when the treated
 * edge prints as it is.
 */
export function plateEdgeOverhang(before: WorkplaneShape, after: WorkplaneShape, angle: number): PlateEdgeOverhang | null {
  const treated = bodyOverhang(after, angle, OVERHANG_PLATE_TOLERANCE);
  if (treated.steepestDegrees === null || treated.areaMm2 <= 0) return null;
  const untreated = bodyOverhang(before, angle, OVERHANG_PLATE_TOLERANCE);
  if (treated.areaMm2 <= untreated.areaMm2 * PLATE_EDGE_AREA_GROWTH + PLATE_EDGE_AREA_NOISE) return null;
  return { angle, degrees: treated.steepestDegrees };
}

/** All visible bodies together, as the line under the view shows them: the area to support and the steepest overhang. */
export type OverhangFigures = {
  angle: number;
  areaMm2: number;
  steepest: { degrees: number; name: string } | null;
};

/** Faces that lie in another visible body or rest on one are left out: they never print as a surface (#2139). */
export function overhangFigures(shapes: readonly WorkplaneShape[], angle: number): OverhangFigures {
  let areaMm2 = 0;
  let steepest: OverhangFigures["steepest"] = null;
  const cover = overhangCover(shapes);
  for (const shape of overhangBodies(shapes)) {
    const body = bodyOverhang(shape, angle, Infinity, cover);
    areaMm2 += body.areaMm2;
    if (body.steepestDegrees !== null && (!steepest || body.steepestDegrees > steepest.degrees)) {
      steepest = { degrees: body.steepestDegrees, name: displayShapeName(shape) };
    }
  }
  return { angle, areaMm2, steepest };
}

/** Square centimetres the way the line says them: two places below 1, one below 10, none above. */
function squareCentimetres(areaMm2: number) {
  const cm2 = areaMm2 / 100;
  return cm2.toLocaleString(numberLocale(), { maximumFractionDigits: cm2 < 1 ? 2 : cm2 < 10 ? 1 : 0 });
}

/**
 * The line under the view while overhangs are shown. The steepest angle is rounded down, so a face just past the limit
 * never reads as the limit itself; the area is what the hatching marks.
 */
export function overhangFiguresText(figures: OverhangFigures) {
  const { angle, areaMm2, steepest } = figures;
  if (!steepest) return t("overhang.figuresNone");
  const degrees = Math.floor(steepest.degrees);
  if (areaMm2 <= 0) return t("overhang.figuresBelow", { angle: degrees, name: steepest.name, limit: angle });
  return t("overhang.figures", { angle: degrees, name: steepest.name, area: squareCentimetres(areaMm2), limit: angle });
}
