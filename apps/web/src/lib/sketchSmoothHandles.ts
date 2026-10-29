import type { SketchPoint, SketchProfile } from "@/types/layerling";

export function cloneSketchProfile(profile: SketchProfile): SketchProfile {
  return {
    points: profile.points.map((point) => ({
      ...point,
      handleIn: point.handleIn ? { ...point.handleIn } : undefined,
      handleOut: point.handleOut ? { ...point.handleOut } : undefined,
    })),
    segments: profile.segments.map((segment) => ({ ...segment })),
    images: (profile.images ?? []).map((image) => ({ ...image })),
    ...(profile.stroke ? { stroke: { ...profile.stroke } } : {}),
    ...(profile.silhouette ? { silhouette: true } : {}),
    ...(profile.keyring ? { keyring: { ...profile.keyring } } : {}),
    ...(profile.inset ? { inset: { ...profile.inset } } : {}),
    ...(profile.sweepAnchor && profile.sweepAnchor !== "center" ? { sweepAnchor: profile.sweepAnchor } : {}),
    ...(profile.notes ? { notes: profile.notes.map((note) => ({ ...note })) } : {}),
  };
}

export type OrderedSketchStep = { segment: SketchProfile["segments"][number]; from: SketchPoint; to: SketchPoint };
export type OrderedSketchPath = { points: SketchPoint[]; steps: OrderedSketchStep[]; closed: boolean };

export function orderedSketchPaths(profile: SketchProfile): OrderedSketchPath[] {
  const pointById = new Map(profile.points.map((point) => [point.id, point]));
  const adjacency = new Map<string, Array<{ pointId: string; segment: SketchProfile["segments"][number] }>>();
  profile.points.forEach((point) => adjacency.set(point.id, []));
  const validSegments = profile.segments.filter((segment) => {
    if (!pointById.has(segment.startId) || !pointById.has(segment.endId) || segment.startId === segment.endId) return;
    adjacency.get(segment.startId)?.push({ pointId: segment.endId, segment });
    adjacency.get(segment.endId)?.push({ pointId: segment.startId, segment });
    return true;
  });
  const unvisited = new Set(validSegments.map((segment) => segment.id));
  const paths: OrderedSketchPath[] = [];
  while (unvisited.size > 0) {
    const seedId = unvisited.values().next().value as string | undefined;
    const seed = validSegments.find((segment) => segment.id === seedId);
    if (!seed) break;
    const componentIds = new Set<string>();
    const queue = [seed.startId, seed.endId];
    while (queue.length > 0) {
      const id = queue.pop();
      if (!id || componentIds.has(id)) continue;
      componentIds.add(id);
      adjacency.get(id)?.forEach((entry) => queue.push(entry.pointId));
    }
    const startId = [...componentIds].find((id) => (adjacency.get(id)?.filter((entry) => unvisited.has(entry.segment.id)).length ?? 0) === 1) ?? seed.startId;
    const first = pointById.get(startId);
    if (!first) {
      unvisited.delete(seed.id);
      continue;
    }
    const points = [first];
    const steps: OrderedSketchStep[] = [];
    let currentId = startId;
    for (let guard = 0; guard <= validSegments.length; guard += 1) {
      const edge = adjacency.get(currentId)?.find((entry) => unvisited.has(entry.segment.id));
      if (!edge) break;
      const from = pointById.get(currentId);
      const to = pointById.get(edge.pointId);
      if (!from || !to) break;
      unvisited.delete(edge.segment.id);
      steps.push({ segment: edge.segment, from, to });
      currentId = to.id;
      if (currentId === startId) break;
      points.push(to);
    }
    paths.push({ points, steps, closed: currentId === startId && steps.length >= 3 });
  }
  return paths;
}

/**
 * Whether the walk passes point `index` in the direction its segments are stored: the step
 * leaving it starts there, or (at the end of an open path) the step arriving ends there.
 */
function pathRunsWithSegments(steps: readonly OrderedSketchStep[], index: number, closed: boolean) {
  const leaving = closed ? steps[index % steps.length] : steps[index];
  if (leaving) return leaving.segment.startId === leaving.from.id;
  const arriving = steps[index - 1];
  return arriving ? arriving.segment.endId === arriving.to.id : true;
}

/**
 * Lays the handles of every point that sits on a smooth curve through its neighbours. Points
 * that only touch lines and Bezier curves keep what they have: a circle, an arc or a line
 * drawn earlier must not change when another smooth curve is added elsewhere.
 */
export function withSmoothSketchHandles(profile: SketchProfile, onlyPointIds?: ReadonlySet<string>) {
  const next = cloneSketchProfile(profile);
  const points = new Map(next.points.map((point) => [point.id, point]));
  orderedSketchPaths(next).forEach((path) => {
    // Which points: the ones asked for (the point button), or those on a smooth curve being drawn.
    const smoothPointIds = new Set<string>(onlyPointIds ?? []);
    if (!onlyPointIds) {
      path.steps.forEach((step) => {
        if (step.segment.kind !== "smooth") return;
        smoothPointIds.add(step.from.id);
        smoothPointIds.add(step.to.id);
      });
    }
    path.points.forEach((sourcePoint, index) => {
      if (!smoothPointIds.has(sourcePoint.id)) return;
      const point = points.get(sourcePoint.id);
      if (!point) return;
      const previous = path.closed ? path.points[(index - 1 + path.points.length) % path.points.length] : path.points[Math.max(0, index - 1)];
      const following = path.closed ? path.points[(index + 1) % path.points.length] : path.points[Math.min(path.points.length - 1, index + 1)];
      // The tangent runs the way the path is walked. A handle, though, belongs to a segment as it
      // is stored: the out handle to the one that starts at the point, the in handle to the one
      // that ends there (curveControls). The walk often starts at the last point drawn, so its
      // direction is turned around and the handles must be too - otherwise every point of a
      // smooth curve made a loop (#199).
      const walkedForward = pathRunsWithSegments(path.steps, index, path.closed);
      const sign = walkedForward ? 1 : -1;
      const tangentX = (sign * (following.x - previous.x)) / 6;
      const tangentZ = (sign * (following.z - previous.z)) / 6;
      point.handleIn = { x: point.x - tangentX, z: point.z - tangentZ };
      point.handleOut = { x: point.x + tangentX, z: point.z + tangentZ };
      point.mode = "smooth";
    });
  });
  return next;
}

/**
 * After a point was deleted: lays the handles again only of its former neighbours that sit on a smooth
 * curve. Every other point keeps its handles - handles dragged by hand elsewhere in the outline used to be
 * laid anew too, and the whole curve changed far from the deleted point (forum, 621213).
 */
export function withSmoothHandlesAfterRemoval(before: SketchProfile, after: SketchProfile, removedId: string) {
  const neighbours = new Set(before.segments.flatMap((segment) =>
    segment.startId === removedId ? [segment.endId] : segment.endId === removedId ? [segment.startId] : []));
  const onSmoothCurve = new Set(after.segments.flatMap((segment) => segment.kind === "smooth" ? [segment.startId, segment.endId] : []));
  const ids = new Set([...neighbours].filter((id) => onSmoothCurve.has(id)));
  return ids.size ? withSmoothSketchHandles(after, ids) : after;
}

/**
 * A curved segment is drawn only when both of its ends have the handle that faces it (the start's
 * out handle, the end's in handle). Gives each curved segment among `segmentIds` the ones it lacks,
 * a third of the way along the segment, so it first looks straight and the handles can be dragged.
 * Handles that exist stay as they are.
 */
export function withSegmentHandles(profile: SketchProfile, segmentIds: ReadonlySet<string>) {
  const next = cloneSketchProfile(profile);
  const points = new Map(next.points.map((point) => [point.id, point]));
  next.segments.forEach((segment) => {
    if (!segmentIds.has(segment.id) || (segment.kind ?? "line") === "line") return;
    const start = points.get(segment.startId);
    const end = points.get(segment.endId);
    if (!start || !end) return;
    const dx = (end.x - start.x) / 3;
    const dz = (end.z - start.z) / 3;
    if (!start.handleOut) start.handleOut = { x: start.x + dx, z: start.z + dz };
    if (!end.handleIn) end.handleIn = { x: end.x - dx, z: end.z - dz };
  });
  return next;
}

/**
 * Lines up a point's two handles for a smooth point (#347): both on one line through the point, each
 * keeping its own length, in the direction the two handles share (from the in handle to the out handle).
 * A corner with two broken handles then turns smooth on the spot instead of only changing its name.
 * Null when the handles point the same way from the point and give no direction to line up along.
 */
export function alignedSmoothHandles(point: Pick<SketchPoint, "x" | "z" | "handleIn" | "handleOut">) {
  if (!point.handleIn || !point.handleOut) return null;
  const inLength = Math.hypot(point.handleIn.x - point.x, point.handleIn.z - point.z);
  const outLength = Math.hypot(point.handleOut.x - point.x, point.handleOut.z - point.z);
  const dx = point.handleOut.x - point.handleIn.x;
  const dz = point.handleOut.z - point.handleIn.z;
  const length = Math.hypot(dx, dz);
  if (length < 1e-9 || inLength < 1e-9 || outLength < 1e-9) return null;
  const ux = dx / length;
  const uz = dz / length;
  return {
    handleIn: { x: point.x - ux * inLength, z: point.z - uz * inLength },
    handleOut: { x: point.x + ux * outLength, z: point.z + uz * outLength },
  };
}

/** One point turned corner, smooth or split; null when the point is gone. */
export function sketchWithPointMode(profile: SketchProfile, id: string, mode: "corner" | "smooth" | "split"): SketchProfile | null {
  let next = cloneSketchProfile(profile);
  const point = next.points.find((entry) => entry.id === id);
  if (!point) return null;
  point.mode = mode;
  if (mode === "corner") {
    point.handleIn = undefined;
    point.handleOut = undefined;
    next.segments = next.segments.map((segment) => segment.startId === id || segment.endId === id ? { ...segment, kind: "line" } : segment);
  } else {
    next.segments = next.segments.map((segment) => segment.startId === id || segment.endId === id ? { ...segment, kind: "bezier" } : segment);
    // The point's own handles along its neighbours; the segments around it then need the handle at
    // their other end too, or they would stay straight.
    // A point that already has two handles keeps their lengths; as a smooth point they are lined up (#347).
    const aligned = mode === "smooth" ? alignedSmoothHandles(point) : null;
    if (aligned) {
      point.handleIn = aligned.handleIn;
      point.handleOut = aligned.handleOut;
    } else if (!point.handleIn || !point.handleOut || mode === "smooth") next = withSmoothSketchHandles(next, new Set([id]));
    next = withSegmentHandles(next, new Set(next.segments.filter((segment) => segment.startId === id || segment.endId === id).map((segment) => segment.id)));
    const updated = next.points.find((entry) => entry.id === id);
    if (updated) updated.mode = mode;
  }
  return next;
}
