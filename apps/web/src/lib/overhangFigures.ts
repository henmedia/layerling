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

/**
 * A body's overhangs, read from its triangles in the world: a bundle's parts together, without its holes. A part on a
 * breakaway base is read on its own, without the foot that hangs over the socket on purpose (#1633). With
 * `startsWithinMm` only the faces that begin no higher than this above the plate are read.
 */
export function bodyOverhang(shape: WorkplaneShape, angle: number, startsWithinMm = Infinity): BodyOverhang {
  const parts = expandBundles([shape]).filter((part) => !part.hole && !part.hidden);
  const onBase = parts.filter(standsOnBreakawayBase);
  const rest = parts.filter((part) => !standsOnBreakawayBase(part));
  const meshes: Array<{ vertices: Vec3[]; faces: [number, number, number][]; footMm: number }> = onBase.map((part) => ({ ...meshForShape(part), footMm: BREAKAWAY_FOOT_MM }));
  if (rest.length === 1) meshes.push({ ...meshForShape(rest[0]), footMm: 0 });
  else if (rest.length > 1) {
    const vertices: Vec3[] = [];
    const faces: [number, number, number][] = [];
    rest.forEach((part) => appendMeshData(vertices, faces, meshForShape(part)));
    meshes.push({ vertices, faces, footMm: 0 });
  }
  let areaMm2 = 0;
  let lowestY: number | null = null;
  let steepestDegrees: number | null = null;
  for (const mesh of meshes) {
    const found = overhangArea(mesh.vertices, mesh.faces, angle, 0, mesh.footMm, startsWithinMm);
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

export function overhangFigures(shapes: readonly WorkplaneShape[], angle: number): OverhangFigures {
  let areaMm2 = 0;
  let steepest: OverhangFigures["steepest"] = null;
  for (const shape of overhangBodies(shapes)) {
    const body = bodyOverhang(shape, angle);
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
