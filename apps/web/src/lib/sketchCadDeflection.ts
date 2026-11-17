import { SKETCH_CAD_DEFLECTION } from "@/lib/cadModifierRuntime";
import type { CadModifierDeflection } from "@/lib/cadModifierTypes";
import type { SketchProfile, SketchRevolveSmoothness } from "@/types/layerling";

/**
 * A sketch with this many curves is a drawing, traced or imported (an SVG), not an outline drawn by hand.
 * #573: a traced drawing of about 900 curves, 60 mm wide, came out of the kernel as 353,000 triangles, and a few copies
 * of it could not be joined (the limit is 250,000). Its small curves were cut into pieces of 9 degrees each, where the
 * 0.05 mm of the linear deflection was long met.
 */
export const DENSE_SKETCH_CURVES = 200;
/** The angle for such a drawing: the linear deflection of 0.05 mm still holds, only the extra pieces on tiny curves go (35,000 triangles). */
export const DENSE_SKETCH_ANGULAR_DEFLECTION = 0.5;

/**
 * The finer cuts of an exact revolved body (Discussion #1426). The usual 0.05 mm and 0.16 rad left a pot 120 mm across
 * with facets 4.5 mm wide that showed on a glossy print; extraFine is a quarter of that in the angle. Both stay above the
 * 0.005 mm under which a body counts as over-fine and is lightened when a design opens (lib/cadMeshRelief.ts).
 */
export const SKETCH_REVOLVE_SMOOTHNESS: Record<SketchRevolveSmoothness, CadModifierDeflection> = {
  fine: { linear: 0.02, angular: 0.08 },
  extraFine: { linear: 0.01, angular: 0.04 },
};

/** How finely the kernel cuts a revolved sketch body: the usual for its sketch, or finer as its smoothness asks. */
export function sketchRevolveCadDeflection(profile: Pick<SketchProfile, "segments">, smoothness: SketchRevolveSmoothness | undefined): CadModifierDeflection {
  const usual = sketchCadDeflection(profile);
  const finer = smoothness ? SKETCH_REVOLVE_SMOOTHNESS[smoothness] : undefined;
  return finer ? { linear: Math.min(usual.linear, finer.linear), angular: Math.min(usual.angular, finer.angular) } : usual;
}

/** How finely the kernel cuts the surfaces of this sketch's body: the usual, or coarser in the angle for a drawing with very many curves. */
export function sketchCadDeflection(profile: Pick<SketchProfile, "segments">): CadModifierDeflection {
  const curves = profile.segments.filter((segment) => !segment.construction && segment.kind !== undefined && segment.kind !== "line").length;
  return curves > DENSE_SKETCH_CURVES ? { linear: SKETCH_CAD_DEFLECTION.linear, angular: DENSE_SKETCH_ANGULAR_DEFLECTION } : SKETCH_CAD_DEFLECTION;
}
