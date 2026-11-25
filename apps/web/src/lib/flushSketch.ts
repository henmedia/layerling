import type { CrossSection, ManifoldToplevel } from "manifold-3d";
import { flushLayerSolid } from "@/lib/flushLayers";
import { backInsideOutline, tagBackRegion, tagLayerSolid } from "@/lib/tagBack";
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
 * An icon tag's back text in the sketch's frame (tagBack.ts): centred on the layer's outline without its key ring ear,
 * which is the icon's middle, and kept inside that outline (`region`, the layer's own, when it has none). `clipped`
 * when letters were cut off.
 */
function sketchBackRegion(runtime: ManifoldToplevel, keep: (section: CrossSection) => CrossSection, profile: SketchProfile, region: CrossSection) {
  const plain = filledOutline(runtime, { ...profile, keyring: undefined, flush: undefined, back: undefined, backFill: undefined });
  const plainRegion = plain ? outlineRegion(runtime, keep, plain) : null;
  const { min, max } = (plainRegion ?? region).bounds();
  const middle = { x: (min[0] + max[0]) / 2, z: (min[1] + max[1]) / 2 };
  // Kept inside the outline without the ear, so no letter runs into the tab or round the hole.
  return { ...backInsideOutline(keep, profile.back ? tagBackRegion(runtime, keep, profile.back, middle) : null, plainRegion ?? region), middle };
}

/**
 * Where an icon tag's back fill stands against the icon's middle, in the sketch's frame (its body is the letters' box,
 * which is off the middle where letters were cut off), and whether letters were cut off. Null without back text.
 */
export function sketchBackInfo(runtime: ManifoldToplevel, profile: SketchProfile): { offset: { x: number; z: number }; clipped: boolean } | null {
  if (!profile.back) return null;
  const made: CrossSection[] = [];
  const keep = (section: CrossSection) => {
    made.push(section);
    return section;
  };
  try {
    const own = filledOutline(runtime, { ...profile, flush: undefined, back: undefined, backFill: undefined });
    const region = own ? outlineRegion(runtime, keep, own) : null;
    if (!region) return null;
    const back = sketchBackRegion(runtime, keep, profile, region);
    if (!back.region) return { offset: { x: 0, z: 0 }, clipped: back.clipped };
    const { min, max } = back.region.bounds();
    return { offset: { x: (min[0] + max[0]) / 2 - back.middle.x, z: (min[1] + max[1]) / 2 - back.middle.z }, clipped: back.clipped };
  } finally {
    new Set(made).forEach((section) => section.delete());
  }
}

/**
 * The layer `profile` with its flush pocket (`profile.flush`) as one closed body `height` high: positions with y up in the
 * sketch's own frame, as the kernel's extrusion stands. Null for a layer without a pocket, or when nothing is left.
 */
export function flushSketchSolid(runtime: ManifoldToplevel, profile: SketchProfile, height: number): { positions: Float32Array; indices: Uint32Array } | null {
  const flush = profile.flush;
  if (!flush?.pocket && !profile.back) return null;
  const { flush: _flush, keyring: _keyring, stroke: _stroke, silhouette: _silhouette, inset: _inset, back: _back, backFill: _backFill, ...area } = profile;
  const own = filledOutline(runtime, { ...profile, flush: undefined, back: undefined, backFill: undefined });
  const above = flush?.pocket ? filledOutline(runtime, {
    ...area,
    ...(flush.pocket.grow > 0 ? { stroke: { width: flush.pocket.grow, align: "grow" as const, join: flush.pocket.join ?? "round", cap: "flat" as const } } : {}),
    ...(flush.pocket.silhouette ? { silhouette: true } : {}),
  }) : null;
  if (!own || (flush?.pocket && !above)) return null;
  const made: CrossSection[] = [];
  const keep = (section: CrossSection) => {
    made.push(section);
    return section;
  };
  try {
    const region = outlineRegion(runtime, keep, own);
    const pocket = above ? outlineRegion(runtime, keep, above) : null;
    if (!region || (above && !pocket)) return null;
    if (!profile.back) return flushLayerSolid(runtime, region, pocket!, height, flush!.depth);
    // Text on the back (tagBack.ts), centred on the icon, kept inside the layer's outline.
    const back = sketchBackRegion(runtime, keep, profile, region).region;
    // The fill part is the back text alone, as high as the text is deep.
    if (profile.backFill) return tagLayerSolid(runtime, null, null, 0, 0, back, height);
    return tagLayerSolid(runtime, region, pocket, height, pocket && flush ? flush.depth : 0, back, profile.back.depth);
  } finally {
    new Set(made).forEach((section) => section.delete());
  }
}
