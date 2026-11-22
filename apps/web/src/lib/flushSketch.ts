import type { CrossSection, ManifoldToplevel } from "manifold-3d";
import { flushLayerSolid } from "@/lib/flushLayers";
import { orderedCadSketchPaths, silhouetteSketchProfile } from "@/lib/sketchCadProfile";
import { keyringSketchProfile } from "@/lib/sketchKeyring";
import { sampledPath, strokedSketchProfile } from "@/lib/sketchStroke";
import type { SketchProfile } from "@/types/layerling";

/**
 * An icon tag's layer laid in flush (#215), as the name tag's (textFill.ts): the layer's area with a pocket in its top,
 * the shape of the layer above it, built by the 2D kernel as a mesh. The kernel's exact extrusion has no pocket.
 */

/** The outline a sketch layer fills - its silhouette, its "Wider" line, its key ring ear and hole - as straight lines; null when nothing is left. */
function filledOutline(runtime: ManifoldToplevel, profile: SketchProfile): SketchProfile | null {
  if (profile.keyring) return keyringSketchProfile(runtime, profile);
  let outline: SketchProfile = profile.silhouette ? silhouetteSketchProfile(profile) : profile;
  if (profile.stroke) {
    const stroked = strokedSketchProfile(runtime, outline);
    if (!stroked) return null;
    outline = profile.silhouette ? silhouetteSketchProfile(stroked) : stroked;
  }
  return outline;
}

/** A sketch's closed outlines as a region of the 2D kernel, holes by the even-odd rule; null without any. */
function outlineRegion(runtime: ManifoldToplevel, keep: (section: CrossSection) => CrossSection, profile: SketchProfile): CrossSection | null {
  const loops = orderedCadSketchPaths(profile).filter((path) => path.closed).map(sampledPath).filter((loop) => loop.length >= 3);
  if (!loops.length) return null;
  const region = keep(new runtime.CrossSection(loops.map((loop) => loop.map(({ x, z }) => [x, z] as [number, number])), "EvenOdd"));
  return region.isEmpty() ? null : region;
}

/**
 * The layer `profile` with its flush pocket (`profile.flush`) as one closed body `height` high: positions with y up in the
 * sketch's own frame, as the kernel's extrusion stands. Null for a layer without a pocket, or when nothing is left.
 */
export function flushSketchSolid(runtime: ManifoldToplevel, profile: SketchProfile, height: number): { positions: Float32Array; indices: Uint32Array } | null {
  const flush = profile.flush;
  if (!flush?.pocket) return null;
  const { flush: _flush, keyring: _keyring, stroke: _stroke, silhouette: _silhouette, inset: _inset, ...area } = profile;
  const own = filledOutline(runtime, { ...profile, flush: undefined });
  const above = filledOutline(runtime, {
    ...area,
    ...(flush.pocket.grow > 0 ? { stroke: { width: flush.pocket.grow, align: "grow" as const, join: flush.pocket.join ?? "round", cap: "flat" as const } } : {}),
    ...(flush.pocket.silhouette ? { silhouette: true } : {}),
  });
  if (!own || !above) return null;
  const made: CrossSection[] = [];
  const keep = (section: CrossSection) => {
    made.push(section);
    return section;
  };
  try {
    const region = outlineRegion(runtime, keep, own);
    const pocket = outlineRegion(runtime, keep, above);
    if (!region || !pocket) return null;
    return flushLayerSolid(runtime, region, pocket, height, flush.depth);
  } finally {
    new Set(made).forEach((section) => section.delete());
  }
}
