import type { SketchLoftPlace, SketchLoftSection } from "@/lib/cadSketchLoft";
import { cloneAsGroupChild } from "@/lib/editorBooleans";
import { getManifoldRuntime } from "@/lib/editorMeshCore";
import { cadShapeFromSketchLoft } from "@/lib/editorSketchCad";
import { t } from "@/lib/i18n";
import { isIconLayerBody } from "@/lib/iconTag";
import { createLocalId } from "@/lib/localIds";
import { silhouetteSketchProfile } from "@/lib/sketchCadProfile";
import { keyringSketchProfile, sketchOutlineBounds } from "@/lib/sketchKeyring";
import { sketchBodyStretch, stretchedSketchProfile } from "@/lib/sketchResize";
import { strokedSketchProfile } from "@/lib/sketchStroke";
import { canonicalizeShape } from "@/lib/workplaneShapes";
import type { SketchProfile, WorkplaneShape } from "@/types/layerling";

/**
 * Loft between two sketches: two extruded sketch bodies - drawn here or imported from an SVG - become one body
 * whose bottom is the outline of the lower one and whose top is the outline of the upper one, with straight
 * walls between them. It reaches from the bottom of the lower body to the top of the upper one. The two
 * bodies stay inside it as a group does, so Edit group opens them again and builds the loft anew.
 */

/** About half a degree: a body tipped by less than that still lies flat. */
const FLAT = 0.5;

const tipped = (shape: WorkplaneShape) => Math.abs(shape.rotationX ?? 0) > FLAT || Math.abs(shape.rotationZ ?? 0) > FLAT;

export type SketchLoftPair = { ok: true; lower: WorkplaneShape; upper: WorkplaneShape } | { ok: false; reason: string };

/** The two bodies of a selection a loft is made of, lower one first, or why it cannot be. */
export function sketchLoftPair(shapes: readonly WorkplaneShape[]): SketchLoftPair {
  if (shapes.length !== 2 || !shapes.every(isIconLayerBody) || shapes.some((shape) => shape.hole)) return { ok: false, reason: t("status.loftNeedsSketches") };
  if (shapes.some(tipped)) return { ok: false, reason: t("status.loftTipped") };
  const [a, b] = shapes;
  const bottom = (shape: WorkplaneShape) => shape.elevation ?? 0;
  const lowerFirst = bottom(a) < bottom(b) - 1e-6 || (Math.abs(bottom(a) - bottom(b)) <= 1e-6 && bottom(a) + a.height <= bottom(b) + b.height);
  return lowerFirst ? { ok: true, lower: a, upper: b } : { ok: true, lower: b, upper: a };
}

/** Whether the selection can be lofted, for the button. */
export function canSketchLoft(shapes: readonly WorkplaneShape[]) {
  return sketchLoftPair(shapes).ok;
}

/**
 * The end a sketch body gives the loft, as the body shows it: stretched, without holes where it has none. A line
 * goes as it is drawn with its width, for the kernel to widen; `filled` is its area as straight pieces, which
 * also gives the middle the body stands on.
 */
async function loftSection(shape: WorkplaneShape & { sketchProfile: SketchProfile }, y: number): Promise<SketchLoftSection & { filled: SketchProfile }> {
  const stretch = sketchBodyStretch(shape);
  let profile = stretch ? stretchedSketchProfile(shape.sketchProfile, stretch.x, stretch.z) : shape.sketchProfile;
  if (profile.keyring) profile = keyringSketchProfile(await getManifoldRuntime(), profile) ?? profile;
  if (profile.silhouette) profile = silhouetteSketchProfile(profile);
  let filled = profile;
  if (profile.stroke) {
    const stroked = strokedSketchProfile(await getManifoldRuntime(), profile);
    if (!stroked) throw new Error(t("sketch.strokeEmpty"));
    filled = stroked;
  }
  const bounds = sketchOutlineBounds(filled);
  if (!bounds) throw new Error(t("status.loftOneOutline"));
  const { stroke, ...outline } = profile;
  const place: SketchLoftPlace = {
    centerX: (bounds.minX + bounds.maxX) / 2,
    centerZ: (bounds.minZ + bounds.maxZ) / 2,
    x: shape.x,
    z: shape.z,
    y,
    rotation: shape.rotation ?? 0,
    ...(shape.mirrorX ? { mirrorX: true } : {}),
    ...(shape.mirrorZ ? { mirrorZ: true } : {}),
  };
  // A "Wider" line is an area grown round the outline, not a wall: it goes as its area.
  return stroke && stroke.align !== "grow" ? { profile: outline, stroke, place, filled } : { profile: filled, place, filled };
}

export type SketchLoftResult = { group: WorkplaneShape; failureNotice?: undefined } | { group: null; failureNotice: string };

/** The loft of two sketch bodies, as a group holding them; the same for the button, Edit group and the MCP. */
export async function buildSketchLoftFromSelection(shapes: readonly WorkplaneShape[]): Promise<SketchLoftResult> {
  const pair = sketchLoftPair(shapes);
  if (!pair.ok) return { group: null, failureNotice: pair.reason };
  const { lower, upper } = pair;
  try {
    const body = await cadShapeFromSketchLoft(
      await loftSection(lower as WorkplaneShape & { sketchProfile: SketchProfile }, lower.elevation ?? 0),
      await loftSection(upper as WorkplaneShape & { sketchProfile: SketchProfile }, (upper.elevation ?? 0) + upper.height),
    );
    const group = canonicalizeShape({
      ...body,
      id: createLocalId("loft"),
      name: t("loft.name"),
      color: lower.color,
      hole: false,
      locked: false,
      hidden: false,
      groupOperation: "loft",
      groupedBaseWidth: body.width,
      groupedBaseDepth: body.depth,
      groupedBaseHeight: body.height,
      groupedShapes: [lower, upper].map((part) => cloneAsGroupChild(part, body.x, body.z, body.elevation ?? 0)),
    });
    return { group };
  } catch (error) {
    return { group: null, failureNotice: error instanceof Error && error.message ? error.message : t("status.loftFailed") };
  }
}
