import { curveOffsetGeometry, offsetPathCrosses as crossing } from "@/lib/sketchCurveOffsets";
import { orderedSketchPaths } from "@/lib/sketchSmoothHandles";
import { sketchCircleGeometry } from "@/lib/sketchConstraints";
import { findSketchOutlineIntersection } from "@/lib/sketchProfileValidation";
import type { SketchOffset, SketchPoint, SketchProfile, SketchSegment } from "@/types/layerling";

const EPS = 1e-6;
type Vec = { x: number; z: number };
type Node = Vec & { handleIn?: Vec; handleOut?: Vec; incoming?: "line" | "bezier" };
export type OffsetGeometry = { points: Node[]; closed: boolean; kinds: Array<"line" | "bezier">; approximate?: boolean };
const cross = (a: Vec, b: Vec) => a.x * b.z - a.z * b.x;
const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, z: a.z - b.z });
const shifted = (p: Vec, v: Vec, d: number): Vec => ({ x: p.x - v.z * d, z: p.z + v.x * d });
const area = (points: Vec[]) => points.reduce((sum, p, i) => sum + cross(p, points[(i + 1) % points.length]), 0) / 2;

export function sketchOffsetSource(profile: SketchProfile, segmentIds: readonly string[]) {
  const ids = new Set(segmentIds);
  const segments = profile.segments.filter((segment) => ids.has(segment.id));
  if (!segments.length || segments.length !== ids.size) throw Error("Select an existing line or connected path.");
  const degrees = new Map<string, number>();
  for (const segment of segments) {
    for (const id of [segment.startId, segment.endId]) degrees.set(id, (degrees.get(id) ?? 0) + 1);
  }
  if ([...degrees.values()].some((degree) => degree > 2)) throw Error("Branching paths cannot be offset. Select one continuous chain.");
  const paths = orderedSketchPaths({ ...profile, segments });
  if (paths.length !== 1 || paths[0].steps.length !== segments.length) throw Error("Select one connected path at a time.");
  const path = paths[0];
  // Keep left/right stable relative to the stored direction of the first source edge.
  const seed = path.steps.find((step) => step.segment.id === segments[0].id)!;
  if (!path.closed && seed.from.id !== seed.segment.startId) return {
    ...path, points: [...path.points].reverse(),
    steps: [...path.steps].reverse().map((step) => ({ ...step, from: step.to, to: step.from })),
  };
  return path;
}

/** Lightweight analytic offset calculation, also used for the live preview. */
export function sketchOffsetGeometry(profile: SketchProfile, segmentIds: readonly string[], distance: number,
  join: SketchOffset["join"] = "miter", miterLimit = 4): OffsetGeometry {
  if (!Number.isFinite(distance) || Math.abs(distance) < EPS || Math.abs(distance) > 1e6) throw Error("Enter a nonzero offset distance within ±1,000,000 mm.");
  if (!Number.isFinite(miterLimit) || miterLimit < 1 || miterLimit > 100) throw Error("Miter limit must be between 1 and 100.");
  const path = sketchOffsetSource(profile, segmentIds);
  const map = new Map(profile.points.map((point) => [point.id, point]));
  const circle = path.closed && sketchCircleGeometry(map, path.steps.map((step) => step.segment));
  if (circle) {
    const radius = circle.radius + distance;
    if (radius <= EPS) throw Error("This inset collapses the circle. Reduce the inset distance.");
    const scale = (p: Vec): Vec => ({
      x: circle.center.x + (p.x - circle.center.x) * radius / circle.radius,
      z: circle.center.z + (p.z - circle.center.z) * radius / circle.radius,
    });
    // The ordered traversal may run backwards through a stored Bézier.
    const points = path.steps.map((step) => {
      const forward = step.segment.startId === step.from.id;
      return { ...scale(step.from), handleIn: scale((forward ? step.from.handleIn : step.from.handleOut)!),
        handleOut: scale((forward ? step.from.handleOut : step.from.handleIn)!) };
    });
    return { points, closed: true, kinds: points.map(() => "bezier") };
  }
  if (path.steps.some((step) => (step.segment.kind ?? "line") !== "line")) return curveOffsetGeometry(path, distance, join, miterLimit);
  const vertices = path.points;
  const count = path.steps.length;
  const vectors = path.steps.map((step) => {
    const v = sub(step.to, step.from), length = Math.hypot(v.x, v.z);
    if (length < EPS) throw Error("A source edge has zero length. Repair the source before offsetting.");
    return { x: v.x / length, z: v.z / length };
  });
  if (crossing(vertices, path.closed)) throw Error("The source path intersects itself. Repair it before offsetting.");
  const signedArea = path.closed ? area(vertices) : 0;
  if (path.closed && Math.abs(signedArea) < EPS) throw Error("The source profile has no usable area.");
  if (join === "round" && path.closed && vectors.some((v, i) => cross(v, vectors[(i + 1) % vectors.length]) * signedArea < -EPS)) {
    throw Error("Round joins on concave profiles are not supported yet. Choose miter or bevel joins.");
  }
  const d = path.closed ? -Math.sign(signedArea) * distance : distance;
  const corners: Node[][] = vertices.map((point, index) => {
    if (!path.closed && index === 0) return [{ ...shifted(point, vectors[0], d), incoming: "line" }];
    if (!path.closed && index === vertices.length - 1) return [{ ...shifted(point, vectors[count - 1], d), incoming: "line" }];
    const before = vectors[(index - 1 + count) % count], after = vectors[index % count];
    const first = shifted(point, before, d), second = shifted(point, after, d);
    const turn = cross(before, after);
    if (Math.abs(turn) < EPS) {
      if (before.x * after.x + before.z * after.z < 0) throw Error("A reversing corner cannot be offset.");
      return [{ ...first, incoming: "line" }];
    }
    const parameter = cross(sub(second, first), after) / turn;
    const intersection = { x: first.x + before.x * parameter, z: first.z + before.z * parameter };
    const outer = turn * d < 0;
    if (!outer || join === "miter") {
      if (Math.hypot(intersection.x - point.x, intersection.z - point.z) > Math.abs(distance) * miterLimit + EPS) {
        throw Error("A corner exceeds the miter limit. Increase the limit or choose bevel/round joins.");
      }
      return [{ ...intersection, incoming: "line" }];
    }
    if (join === "bevel") return [{ ...first, incoming: "line" }, { ...second, incoming: "line" }];
    const a = sub(first, point), b = sub(second, point);
    const sweep = Math.atan2(cross(a, b), a.x * b.x + a.z * b.z);
    const k = 4 / 3 * Math.tan(sweep / 4);
    return [
      { ...first, incoming: "line", handleOut: { x: first.x - k * a.z, z: first.z + k * a.x } },
      { ...second, incoming: "bezier", handleIn: { x: second.x + k * b.z, z: second.z - k * b.x } },
    ];
  });
  // A source edge must retain positive length after its adjacent corners are joined.
  for (let i = 0; i < count; i++) {
    const from = corners[i].at(-1)!, to = corners[(i + 1) % corners.length][0];
    const v = sub(to, from);
    if (v.x * vectors[i].x + v.z * vectors[i].z <= EPS) throw Error("The offset collapses an edge or splits the profile. Reduce the distance.");
  }
  const points = corners.flat();
  if (crossing(points, path.closed) || (path.closed && findSketchOutlineIntersection([points.map((p) => ({ x: p.x, y: p.z }))]))) {
    throw Error("The offset intersects itself. Reduce the distance or change the corner style.");
  }
  if (path.closed && area(points) * signedArea <= EPS) throw Error("This inset collapses the profile. Reduce the distance.");
  return { points, closed: path.closed, kinds: points.slice(0, path.closed ? undefined : -1).map((_, i) => points[(i + 1) % points.length].incoming ?? "line") };
}

export function offsetGeometryProfile(feature: SketchOffset, geometry: OffsetGeometry): SketchProfile {
  const points: SketchPoint[] = geometry.points.map((point, i) => ({
    id: `${feature.id}-point-${i}`, x: point.x, z: point.z,
    shapeName: feature.name ?? "Offset",
    ...(point.handleIn ? { handleIn: { ...point.handleIn } } : {}),
    ...(point.handleOut ? { handleOut: { ...point.handleOut } } : {}),
  }));
  const segments: SketchSegment[] = geometry.kinds.map((kind, i) => ({
    id: `${feature.id}-segment-${i}`, kind, startId: points[i].id, endId: points[(i + 1) % points.length].id,
  }));
  return { points, segments };
}

export type OffsetUpdate = { ok: true; profile: SketchProfile } | { ok: false; message: string; pointIds: string[]; offsetId: string };

/** One dependency-ordered regeneration. The caller commits only the complete successful result. */
export function updateSketchOffsets(profile: SketchProfile, moved: ReadonlySet<string> = new Set()): OffsetUpdate {
  const features = profile.offsets ?? [];
  if (!features.length) return { ok: true, profile };
  const allPoints = new Set(features.flatMap((feature) => feature.pointIds));
  const allSegments = new Set(features.flatMap((feature) => feature.segmentIds));
  let result: SketchProfile = { ...profile, points: profile.points.filter((point) => !allPoints.has(point.id)),
    segments: profile.segments.filter((segment) => !allSegments.has(segment.id)), offsets: [] };
  const pending = [...features];
  const removed = new Set<string>();
  const owner = new Map(features.flatMap((feature) => feature.segmentIds.map((id) => [id, feature.id] as const)));
  const resolved = new Set<string>();
  while (pending.length) {
    const index = pending.findIndex((feature) => feature.sourceSegmentIds.every((id) => !owner.has(id) || resolved.has(owner.get(id)!)));
    if (index < 0) return { ok: false, message: "Offset dependencies contain a cycle. Detach one of the linked paths.", pointIds: pending.flatMap((f) => f.pointIds), offsetId: pending[0].id };
    let feature = pending.splice(index, 1)[0];
    // Adaptive fitting can change a parent's segment count. A whole-path child follows
    // the regenerated boundary; references to only part of that boundary need explicit repair.
    let sourceSegmentIds = [...feature.sourceSegmentIds];
    for (const parentId of new Set(sourceSegmentIds.map((id) => owner.get(id)).filter((id): id is string => Boolean(id)))) {
      const previous = features.find((entry) => entry.id === parentId)!;
      const current = result.offsets!.find((entry) => entry.id === parentId);
      if (!current || previous.segmentIds.join("|") === current.segmentIds.join("|")) continue;
      if (!previous.segmentIds.every((id) => sourceSegmentIds.includes(id))) return {
        ok: false, message: "The parent offset changed its segment layout. Detach the partial child offset before reshaping its source.",
        pointIds: feature.pointIds, offsetId: feature.id,
      };
      sourceSegmentIds = [...sourceSegmentIds.filter((id) => owner.get(id) !== parentId), ...current.segmentIds];
    }
    feature = { ...feature, sourceSegmentIds };
    const sourceSegments = profile.segments.filter((segment) => feature.sourceSegmentIds.includes(segment.id));
    const sourceIds = new Set(sourceSegments.flatMap((segment) => [segment.startId, segment.endId]));
    const fail = (message: string): OffsetUpdate => ({ ok: false, message, pointIds: [...sourceIds, ...feature.pointIds], offsetId: feature.id });
    if (profile.constraints?.some((rule) => {
      const references = [rule.a, rule.b, ...("c" in rule ? [rule.c] : []), ...("d" in rule ? [rule.d] : []),
        ...("outline" in rule ? rule.outline : []), ...(rule.kind === "concentric" ? rule.circles.flat() : [])];
      return references.some((id) => feature.pointIds.includes(id));
    })) return fail("Offset geometry is driven by its source. Detach it before adding constraints to the derived path.");
    if (feature.pointIds.some((id) => moved.has(id)) && ![...sourceIds].some((id) => moved.has(id))) {
      return fail("This path is controlled by an offset. Edit its distance or detach it before moving individual points.");
    }
    resolved.add(feature.id);
    if (feature.sourceSegmentIds.some((id) => removed.has(owner.get(id) ?? "") || !result.segments.some((segment) => segment.id === id))) {
      removed.add(feature.id);
      continue; // Deleting a source also removes all of its dependent geometry.
    }
    if (feature.pointIds.some((id) => !profile.points.some((point) => point.id === id)) ||
      feature.segmentIds.some((id) => !profile.segments.some((segment) => segment.id === id))) {
      return fail("Linked offset geometry cannot be deleted in parts. Use Delete offset in its settings, or detach it first.");
    }
    try {
      const geometry = sketchOffsetGeometry(result, feature.sourceSegmentIds, feature.distance, feature.join, feature.miterLimit);
      const generated = offsetGeometryProfile(feature, geometry);
      const existing = new Map(profile.points.map((point) => [point.id, point]));
      const points = generated.points.map((point) => ({ ...point, shapeName: feature.name ?? existing.get(point.id)?.shapeName ?? "Offset" }));
      result = { ...result, points: [...result.points, ...points], segments: [...result.segments, ...generated.segments],
        offsets: [...result.offsets!, { ...feature, pointIds: points.map((p) => p.id), segmentIds: generated.segments.map((s) => s.id) }] };
    } catch (error) {
      return fail(error instanceof Error ? error.message : "The offset could not be regenerated. Review the source and distance.");
    }
  }
  return { ok: true, profile: result };
}

/** Delete descendants as well; detaching removes only the link and preserves its geometry. */
export function removeSketchOffset(profile: SketchProfile, id: string, detach = false): SketchProfile {
  if (detach) return { ...profile, offsets: profile.offsets?.filter((feature) => feature.id !== id) };
  const removed = new Set([id]);
  let changed = true;
  while (changed) {
    changed = false;
    const segments = new Set(profile.offsets?.filter((feature) => removed.has(feature.id)).flatMap((feature) => feature.segmentIds));
    for (const feature of profile.offsets ?? []) if (!removed.has(feature.id) && feature.sourceSegmentIds.some((ref) => segments.has(ref))) {
      removed.add(feature.id);
      changed = true;
    }
  }
  const features = profile.offsets?.filter((feature) => removed.has(feature.id)) ?? [];
  const points = new Set(features.flatMap((feature) => feature.pointIds)), segments = new Set(features.flatMap((feature) => feature.segmentIds));
  return { ...profile, offsets: profile.offsets?.filter((feature) => !removed.has(feature.id)),
    points: profile.points.filter((point) => !points.has(point.id)), segments: profile.segments.filter((segment) => !segments.has(segment.id)) };
}
