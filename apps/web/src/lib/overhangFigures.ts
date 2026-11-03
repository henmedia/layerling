import { appendMeshData, meshForShape, type Vec3 } from "@/lib/editorMeshCore";
import { expandBundles } from "@/lib/editorBooleans";
import { numberLocale, t } from "@/lib/i18n";
import { overhangArea } from "@/lib/overhang";
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

/** A body's overhangs, read from its triangles in the world: a bundle's parts together, without its holes. */
export function bodyOverhang(shape: WorkplaneShape, angle: number): BodyOverhang {
  const parts = expandBundles([shape]).filter((part) => !part.hole && !part.hidden);
  const mesh = parts.length === 1 ? meshForShape(parts[0]) : (() => {
    const vertices: Vec3[] = [];
    const faces: [number, number, number][] = [];
    parts.forEach((part) => appendMeshData(vertices, faces, meshForShape(part)));
    return { vertices, faces };
  })();
  const found = overhangArea(mesh.vertices, mesh.faces, angle);
  return { id: shape.id, name: shape.name, areaMm2: found.areaMm2, lowestY: found.lowestY, steepestDegrees: found.steepestDegrees };
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
