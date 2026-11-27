import { isConstructionSegment } from "@/lib/sketchConstruction";
import { nestOutlines, polygonInside } from "@/lib/sketchContainment";
import type { SketchPoint, SketchProfile, SketchSegment } from "@/types/layerling";

export type OrderedCadSketchStep = { segment: SketchSegment; from: SketchPoint; to: SketchPoint };
export type OrderedCadSketchPath = { id: string; points: SketchPoint[]; steps: OrderedCadSketchStep[]; closed: boolean };
export type CadSketchRegion = { outer: OrderedCadSketchPath; holes: OrderedCadSketchPath[] };

/** A straight side shorter than this has no length: the kernel refuses to make an edge of it, in mm. */
const EMPTY_SIDE = 1e-4;

/**
 * The sketch without sides of no length - a point dragged onto its neighbour - whose two ends become one point, so
 * the outline stays closed and the kernel is never asked for an edge it cannot make (it answered
 * "makeLineEdge: construction failed").
 */
function withoutEmptySides(profile: SketchProfile): SketchProfile {
  const pointById = new Map(profile.points.map((point) => [point.id, point]));
  const mergedInto = new Map<string, string>();
  const kept = (id: string) => {
    let at = id;
    while (mergedInto.has(at)) at = mergedInto.get(at)!;
    return at;
  };
  const dropped = new Set<string>();
  for (const segment of profile.segments) {
    if (isConstructionSegment(segment) || (segment.kind ?? "line") !== "line") continue;
    const from = kept(segment.startId);
    const to = kept(segment.endId);
    const a = pointById.get(from);
    const b = pointById.get(to);
    if (!a || !b || Math.hypot(a.x - b.x, a.z - b.z) > EMPTY_SIDE) continue;
    dropped.add(segment.id);
    if (from !== to) mergedInto.set(to, from);
  }
  if (!dropped.size) return profile;
  return {
    ...profile,
    points: profile.points.filter((point) => !mergedInto.has(point.id)),
    segments: profile.segments.filter((segment) => !dropped.has(segment.id)).map((segment) => ({ ...segment, startId: kept(segment.startId), endId: kept(segment.endId) })),
  };
}

/** What the sides of a sketch with junctions are: closed loops, loose lines, and junctions no loop can be told from. */
export type SketchJunctions = {
  /** Loops that are plainly outlines: every point on them has two of their sides. Each a list of segment ids. */
  loops: string[][];
  /** Sides on no loop: ends that stick out, and lines between two loops. */
  loose: Set<string>;
  /** Points where three or more sides meet in a way that leaves it open which of them are the outline. */
  ambiguous: string[];
};

/**
 * Sorts the sides of a sketch where three or more meet somewhere (reported by Making Layers): the sketch is cut into
 * the parts that hang together by more than one point. Such a part that is a plain ring is an outline, also where it
 * shares one point with another, like a figure eight. A part of one side is a loose line. Any other part - two corners
 * of a rectangle joined by a second way round, say - could be read as several outlines, so its junctions are
 * ambiguous.
 */
export function sketchJunctions(sides: ReadonlyArray<Pick<SketchSegment, "id" | "startId" | "endId">>): SketchJunctions {
  const at = new Map<string, number[]>();
  sides.forEach((side, index) => {
    for (const end of [side.startId, side.endId]) {
      const list = at.get(end);
      if (list) list.push(index);
      else at.set(end, [index]);
    }
  });
  const found: SketchJunctions = { loops: [], loose: new Set(), ambiguous: [] };
  const ambiguous = new Set<string>();
  const order = new Map<string, number>();
  const low = new Map<string, number>();
  const stack: number[] = [];
  const used = new Array<boolean>(sides.length).fill(false);
  const take = (block: number[]) => {
    if (block.length === 1) {
      found.loose.add(sides[block[0]].id);
      return;
    }
    const degree = new Map<string, number>();
    for (const index of block) {
      for (const end of [sides[index].startId, sides[index].endId]) degree.set(end, (degree.get(end) ?? 0) + 1);
    }
    const junctions = [...degree].filter(([, count]) => count > 2).map(([point]) => point);
    if (junctions.length) junctions.forEach((point) => ambiguous.add(point));
    else found.loops.push(block.map((index) => sides[index].id));
  };
  // Tarjan's search for the parts held together by more than one point, without recursion: a traced drawing is long.
  for (const root of at.keys()) {
    if (order.has(root)) continue;
    order.set(root, order.size);
    low.set(root, order.get(root)!);
    const walk: Array<{ point: string; via: number; next: number }> = [{ point: root, via: -1, next: 0 }];
    while (walk.length) {
      const here = walk[walk.length - 1];
      const index = at.get(here.point)![here.next];
      if (index !== undefined) {
        here.next += 1;
        if (used[index]) continue;
        used[index] = true;
        const side = sides[index];
        const there = side.startId === here.point ? side.endId : side.startId;
        stack.push(index);
        if (!order.has(there)) {
          order.set(there, order.size);
          low.set(there, order.get(there)!);
          walk.push({ point: there, via: index, next: 0 });
        } else {
          low.set(here.point, Math.min(low.get(here.point)!, order.get(there)!));
        }
        continue;
      }
      walk.pop();
      const parent = walk[walk.length - 1];
      if (!parent) continue;
      low.set(parent.point, Math.min(low.get(parent.point)!, low.get(here.point)!));
      if (low.get(here.point)! >= order.get(parent.point)!) take(stack.splice(stack.lastIndexOf(here.via)));
    }
  }
  found.ambiguous = [...ambiguous];
  return found;
}

/** The sides an outline can be made of: not construction lines, with two ends that are points of the sketch. */
function outlineSides(profile: SketchProfile) {
  const ids = new Set(profile.points.map((point) => point.id));
  return profile.segments.filter((segment) => !isConstructionSegment(segment) && segment.startId !== segment.endId && ids.has(segment.startId) && ids.has(segment.endId));
}

/**
 * What finishing a sketch would not take as drawn: the points where it cannot tell the outline (the sketch is not
 * built then), and how many lines lie on no closed outline and would be left out of the body.
 */
export function sketchFinishProblems(profile: SketchProfile): { ambiguous: SketchPoint[]; leftOut: number } {
  const clean = withoutEmptySides(profile);
  if (takesEverySide(walkSketchPaths(clean, clean.segments))) return { ambiguous: [], leftOut: 0 };
  const junctions = sketchJunctions(outlineSides(clean));
  if (junctions.ambiguous.length) {
    const marked = new Set(junctions.ambiguous);
    return { ambiguous: clean.points.filter((point) => marked.has(point.id)), leftOut: 0 };
  }
  const paths = orderedCadSketchPaths(clean);
  // Only lines beside a closed outline count as left out; a sketch with none says so by itself.
  const leftOut = paths.some((path) => path.closed) ? paths.filter((path) => !path.closed).reduce((sum, path) => sum + path.steps.length, 0) : 0;
  return { ambiguous: [], leftOut };
}

/** Whether the plain walk put every line on a closed outline, so nothing goes missing. */
function takesEverySide(paths: OrderedCadSketchPath[]) {
  return paths.every((path) => path.closed);
}

export function orderedCadSketchPaths(drawn: SketchProfile): OrderedCadSketchPath[] {
  const profile = withoutEmptySides(drawn);
  // Where the plain walk loses nothing - outlines pushed over each other, say - it stays as it always was.
  const plain = walkSketchPaths(profile, profile.segments);
  if (takesEverySide(plain)) return plain;
  const sides = outlineSides(profile);
  const degree = new Map<string, number>();
  for (const side of sides) for (const end of [side.startId, side.endId]) degree.set(end, (degree.get(end) ?? 0) + 1);
  if (![...degree.values()].some((count) => count > 2)) return plain;
  // With junctions each plain ring is walked on its own, so an end that sticks out or a second ring at a shared point
  // does not lead the walk astray; whatever is left is walked as before.
  const { loops } = sketchJunctions(sides);
  const inLoop = new Set(loops.flat());
  const rings = loops.flatMap((loop) => {
    const own = new Set(loop);
    return walkSketchPaths(profile, profile.segments.filter((segment) => own.has(segment.id)));
  });
  return [...rings, ...walkSketchPaths(profile, profile.segments.filter((segment) => !inLoop.has(segment.id)))];
}

function walkSketchPaths(profile: SketchProfile, segments: readonly SketchSegment[]): OrderedCadSketchPath[] {
  const pointById = new Map(profile.points.map((point) => [point.id, point]));
  const adjacency = new Map<string, Array<{ pointId: string; segment: SketchSegment }>>();
  profile.points.forEach((point) => adjacency.set(point.id, []));
  const valid = segments.filter((segment) => {
    if (isConstructionSegment(segment) || segment.startId === segment.endId || !pointById.has(segment.startId) || !pointById.has(segment.endId)) return false;
    adjacency.get(segment.startId)?.push({ pointId: segment.endId, segment });
    adjacency.get(segment.endId)?.push({ pointId: segment.startId, segment });
    return true;
  });
  const unvisited = new Set(valid.map((segment) => segment.id));
  const paths: OrderedCadSketchPath[] = [];

  while (unvisited.size > 0) {
    const seedId = unvisited.values().next().value as string;
    const seed = valid.find((segment) => segment.id === seedId);
    if (!seed) break;
    const component = new Set<string>();
    const queue = [seed.startId, seed.endId];
    while (queue.length > 0) {
      const id = queue.pop();
      if (!id || component.has(id)) continue;
      component.add(id);
      adjacency.get(id)?.forEach((edge) => queue.push(edge.pointId));
    }
    const startId = [...component].find((id) => (adjacency.get(id)?.filter((edge) => unvisited.has(edge.segment.id)).length ?? 0) === 1) ?? seed.startId;
    const first = pointById.get(startId);
    if (!first) {
      unvisited.delete(seed.id);
      continue;
    }
    const points = [first];
    const steps: OrderedCadSketchStep[] = [];
    let currentId = startId;
    for (let guard = 0; guard <= valid.length; guard += 1) {
      const edge = adjacency.get(currentId)?.find((candidate) => unvisited.has(candidate.segment.id));
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
    paths.push({ id: seed.id, points, steps, closed: currentId === startId && steps.length >= 3 });
  }
  return paths;
}

function sampledPath(path: OrderedCadSketchPath) {
  const samples: Array<{ x: number; z: number }> = [];
  path.steps.forEach(({ segment, from, to }, stepIndex) => {
    if (stepIndex === 0) samples.push({ x: from.x, z: from.z });
    const forward = segment.startId === from.id;
    const first = forward ? from.handleOut : from.handleIn;
    const second = forward ? to.handleIn : to.handleOut;
    if (segment.kind === "line" || !first || !second) {
      samples.push({ x: to.x, z: to.z });
      return;
    }
    for (let index = 1; index <= 16; index += 1) {
      const amount = index / 16;
      const inverse = 1 - amount;
      samples.push({
        x: inverse ** 3 * from.x + 3 * inverse ** 2 * amount * first.x + 3 * inverse * amount ** 2 * second.x + amount ** 3 * to.x,
        z: inverse ** 3 * from.z + 3 * inverse ** 2 * amount * first.z + 3 * inverse * amount ** 2 * second.z + amount ** 3 * to.z,
      });
    }
  });
  return samples;
}

function signedArea(points: Array<{ x: number; z: number }>) {
  return points.reduce((area, point, index) => {
    const next = points[(index + 1) % points.length];
    return area + point.x * next.z - next.x * point.z;
  }, 0) / 2;
}

/**
 * The sketch without its holes (#197, the usual Silhouette): only the closed outlines no larger
 * one holds stay, with the open lines; every outline inside them - holes and islands in holes -
 * is left out.
 */
export function silhouetteSketchProfile(profile: SketchProfile): SketchProfile {
  const closed = orderedCadSketchPaths(profile)
    .filter((path) => path.closed)
    .map((path) => {
      const polygon = sampledPath(path);
      return { path, polygon, area: Math.abs(signedArea(polygon)) };
    })
    .filter((record) => record.polygon.length >= 3 && record.area > 1e-8);
  const dropped = new Set<string>();
  closed.forEach((record) => {
    const held = closed.some((other) => other !== record && other.area > record.area && polygonInside(record.polygon, other.polygon));
    if (held) record.path.steps.forEach((step) => dropped.add(step.segment.id));
  });
  if (!dropped.size) return profile;
  const segments = profile.segments.filter((segment) => !dropped.has(segment.id));
  const used = new Set(segments.flatMap((segment) => [segment.startId, segment.endId]));
  return { ...profile, points: profile.points.filter((point) => used.has(point.id)), segments };
}

export function cadSketchRegions(profile: SketchProfile): CadSketchRegion[] {
  const allPaths = orderedCadSketchPaths(profile);
  // A ring of two sides, left where a third had no length, is no outline, but it has no open end either.
  const openCount = allPaths.filter((path) => !path.closed && path.steps[path.steps.length - 1]?.to.id !== path.points[0]?.id).length;
  const records = allPaths
    .filter((path) => path.closed)
    .map((path) => {
      const polygon = sampledPath(path);
      return { item: path, polygon, area: Math.abs(signedArea(polygon)) };
    })
    .filter((record) => record.polygon.length >= 3 && record.area > 1e-8);

  // Even depth = solid (outer boundary), odd depth = hole; outlines that only overlap are all solids.
  const regions: CadSketchRegion[] = nestOutlines(records);

  if (regions.length === 0 && openCount > 0 && allPaths.length > 0) {
    throw new Error("All profile paths are open. Close at least one loop before finishing the sketch. Or switch on \"Build as a stroke\" to build the open line itself with a width.");
  }
  return regions;
}
