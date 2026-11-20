import { orderedSketchPaths } from "@/lib/sketchSmoothHandles";
import type { SketchProfile } from "@/types/layerling";

/** A single connected shape; ambiguous multi-shape selections leave the inspector alone. */
export function sketchOffsetForSelection(profile: SketchProfile, pointIds: readonly string[], segmentIds: readonly string[], preferredId?: string | null) {
  const points = new Set(pointIds), segments = new Set(segmentIds);
  const paths = orderedSketchPaths(profile).filter(path => path.points.some(p => points.has(p.id)) || path.steps.some(s => segments.has(s.segment.id)));
  if (paths.length !== 1) return undefined;
  const ids = paths[0].steps.map(s => s.segment.id);
  const offsets = profile.offsets ?? [];
  // A derived boundary belongs to its own offset, even if another offset uses it as a source.
  const owner = offsets.find(offset => offset.segmentIds.some(id => ids.includes(id)));
  const candidates = offsets.filter(offset => offset.sourceSegmentIds.some(id => ids.includes(id)));
  return { offset: owner ?? candidates.find(offset => offset.id === preferredId) ?? candidates[0], segmentIds: ids };
}

/** Stable slider range from the source size. Exact distances outside it remain typeable. */
export function sketchOffsetSliderLimit(profile: SketchProfile, segmentIds: readonly string[]) {
  const segments = new Set(segmentIds), ids = new Set(profile.segments.filter(s => segments.has(s.id)).flatMap(s => [s.startId, s.endId]));
  const points = profile.points.filter(p => ids.has(p.id)).flatMap(p => [p, ...(p.handleIn ? [p.handleIn] : []), ...(p.handleOut ? [p.handleOut] : [])]);
  if (!points.length) return 10;
  const extent = Math.max(Math.max(...points.map(p => p.x)) - Math.min(...points.map(p => p.x)), Math.max(...points.map(p => p.z)) - Math.min(...points.map(p => p.z)));
  const target = Math.max(1, Math.min(100, extent / 2));
  const magnitude = 10 ** Math.floor(Math.log10(target));
  return Math.min(100, Math.ceil(target / magnitude) * magnitude);
}
