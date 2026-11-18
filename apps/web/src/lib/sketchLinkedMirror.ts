import { copySketchSelection, type SketchClipboardSelection } from "@/lib/sketchClipboard";
import { mirrorSketchSelection, sketchMirrorAxisThroughSegment, SKETCH_MIRROR_HORIZONTAL, SKETCH_MIRROR_VERTICAL } from "@/lib/sketchMirror";
import type { SketchConstraint, SketchProfile } from "@/types/layerling";

export type SketchMirrorReference = "vertical" | "horizontal" | { segmentId: string };

/** Build one candidate transaction. The editor's normal solver/history commit validates it atomically. */
export function linkedMirrorSketchSelection(profile: SketchProfile, selection: SketchClipboardSelection,
  across: SketchMirrorReference, createId: (prefix: string) => string) {
  const copied = copySketchSelection(profile, selection);
  if (!copied?.points.length) return { ok: false as const, message: "Select sketch points or straight lines to mirror." };
  if (copied.segments.some((segment) => (segment.kind ?? "line") !== "line") || copied.points.some((point) => point.handleIn || point.handleOut))
    return { ok: false as const, message: "Maintain Symmetry supports points and straight lines. Turn it off to mirror circles or curves independently." };
  const derived = new Set(profile.offsets?.flatMap((offset) => offset.pointIds));
  if (copied.points.some((point) => derived.has(point.id)))
    return { ok: false as const, message: "Detach the linked offset before creating symmetry from its generated geometry." };

  let working = profile;
  let axisIds: [string, string];
  if (typeof across === "object") {
    const segment = profile.segments.find((segment) => segment.id === across.segmentId);
    if (!segment || !sketchMirrorAxisThroughSegment(profile, segment.id))
      return { ok: false as const, message: "Choose a straight mirror axis with nonzero length." };
    axisIds = [segment.startId, segment.endId];
    if (axisIds.some((id) => derived.has(id))) return { ok: false as const, message: "Use an editable source line as the symmetry axis, or detach its offset first." };
  } else {
    // A persisted, editable construction line makes the ribbon's origin axes addressable.
    const vertical = across === "vertical";
    const byId = new Map(profile.points.map((point) => [point.id, point]));
    const existing = profile.segments.find((segment) => {
      const a = byId.get(segment.startId), b = byId.get(segment.endId);
      return segment.construction && (segment.kind ?? "line") === "line" && a?.shapeName === "Mirror axis" && b &&
        !derived.has(a.id) && !derived.has(b.id) &&
        (vertical ? Math.abs(a.x) < 1e-8 && Math.abs(b.x) < 1e-8 && Math.abs(a.z - b.z) > 1e-5
          : Math.abs(a.z) < 1e-8 && Math.abs(b.z) < 1e-8 && Math.abs(a.x - b.x) > 1e-5);
    });
    if (existing) axisIds = [existing.startId, existing.endId];
    else {
      const extent = Math.max(20, ...copied.points.map((point) => Math.abs(vertical ? point.z : point.x))) + 10;
      const a = { id: createId("sketch-point"), x: vertical ? 0 : -extent, z: vertical ? -extent : 0, shapeName: "Mirror axis" };
      const b = { id: createId("sketch-point"), x: vertical ? 0 : extent, z: vertical ? extent : 0, shapeName: "Mirror axis" };
      axisIds = [a.id, b.id];
      working = { ...profile, points: [...profile.points, a, b], segments: [...profile.segments,
        { id: createId("sketch-segment"), startId: a.id, endId: b.id, construction: true, kind: "line" }] };
    }
  }
  const axis = typeof across === "object" ? sketchMirrorAxisThroughSegment(working, across.segmentId)!
    : across === "vertical" ? SKETCH_MIRROR_VERTICAL : SKETCH_MIRROR_HORIZONTAL;
  const result = mirrorSketchSelection(working, selection, axis, createId, { preserveReferences: true });
  if (!result) return { ok: false as const, message: "The selected geometry lies on the mirror axis; nothing new was created." };
  const constraints: SketchConstraint[] = [];
  const relationshipId = createId("sketch-symmetry");
  const paired = new Set<string>();
  const addPair = (a: string, b: string, pair?: [string, string]) => {
    constraints.push({ id: createId("sketch-constraint"), kind: "symmetry", relationshipId, a, b, axis: [...axisIds], ...(pair ? { pair } : {}) });
    paired.add(a);
    if (pair) paired.add(pair[0]);
  };
  for (const segment of copied.segments) {
    const a = segment.startId, c = segment.endId;
    const b = result.pointIdMap.get(a)!, d = result.pointIdMap.get(c)!;
    if (a !== b && c !== d && !paired.has(a) && !paired.has(c)) addPair(a, b, [c, d]);
  }
  for (const point of copied.points) {
    const target = result.pointIdMap.get(point.id)!;
    if (paired.has(point.id)) continue;
    if (target !== point.id) addPair(point.id, target);
    else if (!axisIds.includes(point.id)) {
      // A shared on-axis endpoint is its own reflection; keep it on the axis with one scalar equation.
      const alreadyOnAxis = working.constraints?.some((rule) => (rule.kind === "point-on-line" || rule.kind === "midpoint") &&
        rule.c === point.id && axisIds.includes(rule.a) && axisIds.includes(rule.b));
      if (!alreadyOnAxis) constraints.push({ id: createId("sketch-constraint"), kind: "point-on-line", relationshipId, a: axisIds[0], b: axisIds[1], c: point.id });
    }
  }
  return { ok: true as const, profile: { ...result.profile, constraints: [...profile.constraints ?? [], ...constraints] },
    pointIds: result.pointIds, segmentIds: result.segmentIds };
}
