import { orderedCadSketchPaths } from "@/lib/sketchCadProfile";
import { sampledPath } from "@/lib/sketchStroke";
import type { SketchProfile, WorkplaneShape } from "@/types/layerling";

/*
 * A body extruded from a sketch carries its exact CAD body as it was built.
 * Resized afterwards, only its mesh followed; the stored body was stretched on
 * demand, and stretching curved sides unevenly gives the kernel an invalid
 * solid ("The stored CAD feature could not be restored", #115). So a resized
 * sketch body is built again from its sketch, stretched to the new size -
 * lines and Bézier curves stay exactly what they were when stretched - and the
 * sketch keeps the size the body has, for the next time it is edited.
 */

/** How much wider and deeper the sketch's closed outlines reach than the body that was built from them. */
function sketchMargin(profile: SketchProfile, frame: { width: number; depth: number }) {
  const points = orderedCadSketchPaths(profile).filter((path) => path.closed).flatMap(sampledPath);
  if (!points.length) return { x: 0, z: 0 };
  const xs = points.map((point) => point.x);
  const zs = points.map((point) => point.z);
  return {
    x: Math.max(0, Math.max(...xs) - Math.min(...xs) - frame.width),
    z: Math.max(0, Math.max(...zs) - Math.min(...zs) - frame.depth),
  };
}

/** How much the body was stretched since its exact body was built, or null when it was not. */
export function sketchBodyStretch(shape: WorkplaneShape) {
  if (!shape.sketchProfile || shape.sketchOperation === "revolve" || shape.sketchOperation === "sweep" || !shape.cadBrep || !shape.cadBrepFrame) return null;
  if (shape.groupedShapes?.length || shape.edgeTreatments?.length || shape.locked) return null;
  const frame = shape.cadBrepFrame;
  const width = shape.width;
  const depth = shape.depth;
  const changed = Math.abs(width - frame.width) > 0.005 || Math.abs(depth - frame.depth) > 0.005 || Math.abs(shape.height - frame.height) > 0.005;
  if (!changed) return null;
  // A body set in from its sketch (the face tool) is narrower than the sketch by what the inset took off,
  // which depends on its corners: the sketch stretches so that the body, set in again, takes the new size.
  const margin = shape.sketchProfile.inset ? sketchMargin(shape.sketchProfile, frame) : { x: 0, z: 0 };
  return {
    x: (width + margin.x) / Math.max(0.001, frame.width + margin.x),
    z: (depth + margin.z) / Math.max(0.001, frame.depth + margin.z),
    height: shape.height,
  };
}

/** The sketch stretched about the middle of its points by `x` across and `z` along. */
export function stretchedSketchProfile(profile: SketchProfile, x: number, z: number): SketchProfile {
  const xs = profile.points.map((point) => point.x);
  const zs = profile.points.map((point) => point.z);
  const centerX = xs.length ? (Math.min(...xs) + Math.max(...xs)) / 2 : 0;
  const centerZ = zs.length ? (Math.min(...zs) + Math.max(...zs)) / 2 : 0;
  const map = (point: { x: number; z: number }) => ({ x: centerX + (point.x - centerX) * x, z: centerZ + (point.z - centerZ) * z });
  return {
    points: profile.points.map((point) => ({
      ...point,
      ...map(point),
      handleIn: point.handleIn ? map(point.handleIn) : undefined,
      handleOut: point.handleOut ? map(point.handleOut) : undefined,
    })),
    segments: profile.segments.map((segment) => ({ ...segment })),
    images: (profile.images ?? []).map((image) => ({ ...image })),
    // The stroke keeps its width: a stretched frame keeps its wall.
    ...(profile.stroke ? { stroke: { ...profile.stroke } } : {}),
    ...(profile.silhouette ? { silhouette: true } : {}),
    // The hole keeps its size and moves with the outline it sits beside.
    ...(profile.keyring ? { keyring: { ...profile.keyring, ...map(profile.keyring) } } : {}),
    // A layer laid in flush (#215) keeps its depth; its pocket follows the outline.
    ...(profile.flush ? { flush: { ...profile.flush } } : {}),
    // The inset keeps its distance and radius.
    ...(profile.inset ? { inset: { ...profile.inset } } : {}),
    // Text on a tag's back keeps its letter size and stays centred (tagBack.ts).
    ...(profile.back ? { back: { ...profile.back } } : {}),
    ...(profile.backFill ? { backFill: true } : {}),
  };
}
