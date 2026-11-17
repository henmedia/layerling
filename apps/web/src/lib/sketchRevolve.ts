import type { ManifoldToplevel } from "manifold-3d";
import type { SketchPoint, SketchProfile, SketchRevolveSettings, SketchSegment } from "@/types/layerling";
import { MAX_HIGH_RESOLUTION_SIDES } from "@/lib/workplaneSettings";

export const DEFAULT_SKETCH_REVOLVE_SETTINGS: SketchRevolveSettings = {
  startAngle: 0,
  sweepAngle: 360,
  sides: 64,
  quality: 6,
};

/** The most turns a helical revolve (one with a pitch) may wind. */
export const MAX_SKETCH_REVOLVE_TURNS = 200;
/** The highest pitch a helical revolve takes, in mm per turn. */
export const MAX_SKETCH_REVOLVE_PITCH = 1000;

type OrderedStep = { segment: SketchSegment; from: SketchPoint; to: SketchPoint };
type OrderedPath = { steps: OrderedStep[]; closed: boolean };
type Point2 = [number, number];
type SampledPoint = { x: number; z: number };

export type SketchRevolveMesh = {
  positions: number[];
  width: number;
  depth: number;
  height: number;
  triangleCount: number;
  /** Where the revolve axis lies from the middle of the body. */
  axis: { x: number; z: number };
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function finiteOr(value: number | undefined, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function normalizeSketchRevolveSettings(settings?: Partial<SketchRevolveSettings>): SketchRevolveSettings {
  const pitch = clamp(finiteOr(settings?.pitch, 0), 0, MAX_SKETCH_REVOLVE_PITCH);
  // Rings close after one turn; a helix may wind on.
  const maxSweep = pitch > 0 ? 360 * MAX_SKETCH_REVOLVE_TURNS : 360;
  const rawSweep = clamp(finiteOr(settings?.sweepAngle, DEFAULT_SKETCH_REVOLVE_SETTINGS.sweepAngle), -maxSweep, maxSweep);
  const sweepAngle = Math.abs(rawSweep) < 1 ? (rawSweep < 0 ? -1 : 1) : rawSweep;
  return {
    startAngle: ((finiteOr(settings?.startAngle, DEFAULT_SKETCH_REVOLVE_SETTINGS.startAngle) % 360) + 360) % 360,
    sweepAngle,
    sides: Math.round(clamp(finiteOr(settings?.sides, DEFAULT_SKETCH_REVOLVE_SETTINGS.sides), 3, MAX_HIGH_RESOLUTION_SIDES)),
    quality: Math.round(clamp(finiteOr(settings?.quality, DEFAULT_SKETCH_REVOLVE_SETTINGS.quality), 1, 10)),
    // Only a helix carries a pitch, so rings keep the settings they always had.
    ...(pitch > 0 ? { pitch } : {}),
    ...(settings?.smoothness === "fine" || settings?.smoothness === "extraFine" ? { smoothness: settings.smoothness } : {}),
  };
}

function orderedPaths(profile: SketchProfile): OrderedPath[] {
  const pointById = new Map(profile.points.map((point) => [point.id, point]));
  const adjacency = new Map<string, Array<{ pointId: string; segment: SketchSegment }>>();
  profile.points.forEach((point) => adjacency.set(point.id, []));
  const validSegments = profile.segments.filter((segment) => {
    if (segment.construction || !pointById.has(segment.startId) || !pointById.has(segment.endId)) return false;
    adjacency.get(segment.startId)?.push({ pointId: segment.endId, segment });
    adjacency.get(segment.endId)?.push({ pointId: segment.startId, segment });
    return true;
  });
  const unvisited = new Set(validSegments.map((segment) => segment.id));
  const paths: OrderedPath[] = [];
  while (unvisited.size > 0) {
    const seed = validSegments.find((segment) => unvisited.has(segment.id));
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
    const steps: OrderedStep[] = [];
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
    }
    if (steps.length > 0) paths.push({ steps, closed: currentId === startId && steps.length >= 3 });
  }
  return paths;
}

function cubicPoint(start: SketchPoint, first: { x: number; z: number }, second: { x: number; z: number }, end: SketchPoint, amount: number) {
  const inverse = 1 - amount;
  return {
    x: inverse ** 3 * start.x + 3 * inverse ** 2 * amount * first.x + 3 * inverse * amount ** 2 * second.x + amount ** 3 * end.x,
    z: inverse ** 3 * start.z + 3 * inverse ** 2 * amount * first.z + 3 * inverse * amount ** 2 * second.z + amount ** 3 * end.z,
  };
}

function samplePath(path: OrderedPath, quality: number) {
  const first = path.steps[0]?.from;
  if (!first) return [];
  const sampled = [{ x: first.x, z: first.z }];
  const curveSamples = 4 + quality * 6;
  path.steps.forEach(({ segment, from, to }) => {
    const forward = segment.startId === from.id;
    const firstControl = forward ? from.handleOut : from.handleIn;
    const secondControl = forward ? to.handleIn : to.handleOut;
    if (segment.kind !== "line" && firstControl && secondControl) {
      for (let index = 1; index <= curveSamples; index += 1) {
        sampled.push(cubicPoint(from, firstControl, secondControl, to, index / curveSamples));
      }
    } else {
      sampled.push({ x: to.x, z: to.z });
    }
  });
  if (path.closed && sampled.length > 1) sampled.pop();
  return sampled;
}

function compactSampledPath(points: SampledPoint[]) {
  const compact: SampledPoint[] = [];
  points.forEach((point) => {
    const previous = compact[compact.length - 1];
    if (!previous || Math.hypot(point.x - previous.x, point.z - previous.z) > 1e-7) compact.push(point);
  });
  if (compact.length > 2) {
    const first = compact[0];
    const last = compact[compact.length - 1];
    if (Math.hypot(first.x - last.x, first.z - last.z) <= 1e-7) compact.pop();
  }
  return compact;
}

function axisIntersection(from: SampledPoint, to: SampledPoint): SampledPoint {
  const deltaX = to.x - from.x;
  const amount = Math.abs(deltaX) <= 1e-12 ? 0 : clamp(-from.x / deltaX, 0, 1);
  return { x: 0, z: from.z + (to.z - from.z) * amount };
}

function clipClosedPathToRevolveSide(points: SampledPoint[]) {
  if (points.length < 3) return [];
  const clipped: SampledPoint[] = [];
  for (let index = 0; index < points.length; index += 1) {
    const from = points[index];
    const to = points[(index + 1) % points.length];
    const fromInside = from.x <= 0;
    const toInside = to.x <= 0;
    if (fromInside && toInside) {
      clipped.push(to);
    } else if (fromInside) {
      clipped.push(axisIntersection(from, to));
    } else if (toInside) {
      clipped.push(axisIntersection(from, to), to);
    }
  }
  return compactSampledPath(clipped);
}

function distance(a: Point2, b: Point2) {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

function compactPolygon(points: Point2[]) {
  const compact: Point2[] = [];
  points.forEach((point) => {
    if (!compact.length || distance(compact[compact.length - 1], point) > 1e-7) compact.push(point);
  });
  if (compact.length > 2 && distance(compact[0], compact[compact.length - 1]) <= 1e-7) compact.pop();
  return compact;
}

export function sketchProfileToRevolvePolygons(profile: SketchProfile, settings?: Partial<SketchRevolveSettings>) {
  const normalized = normalizeSketchRevolveSettings(settings);
  const paths = orderedPaths(profile).filter((path) => path.closed).flatMap((path) => {
    const sampled = samplePath(path, normalized.quality);
    const clipped = clipClosedPathToRevolveSide(sampled);
    return clipped.length >= 3 ? [clipped] : [];
  });
  if (paths.length === 0) return [];
  const maxZ = Math.max(...paths.flatMap((points) => points.map((point) => point.z)));
  const toSectionPoint = (point: SampledPoint): Point2 => [-point.x, maxZ - point.z];
  return paths.flatMap((points) => {
    const sectionPoints = compactPolygon(points.map(toSectionPoint));
    return sectionPoints.length >= 3 ? [sectionPoints] : [];
  });
}

function manifoldMeshPositions(mesh: InstanceType<ManifoldToplevel["Mesh"]>) {
  const positions: number[] = [];
  for (let index = 0; index < mesh.triVerts.length; index += 1) {
    const offset = mesh.triVerts[index] * mesh.numProp;
    positions.push(mesh.vertProperties[offset], mesh.vertProperties[offset + 1], mesh.vertProperties[offset + 2]);
  }
  return positions;
}

function dispose(value: unknown) {
  (value as { delete?: () => void } | null)?.delete?.();
}

/**
 * The section wound up along a helix about z, as `revolve` turns it about z: the section is
 * extruded straight, one slice per side of each turn, and the slices are bent round the axis and
 * lifted by the pitch as they go. The extrusion runs down from z = 0 for a positive sweep, up for
 * a negative one, and the angle is minus z: that bend keeps the faces pointing out (a bend the
 * other way would turn the body inside out).
 *
 * **Turns closer than the section is high** (a solid spool core with a 2 mm pitch) run into each
 * other, and one bent extrusion would pass through itself: it looks right, but a boolean takes
 * such a body for garbage and the next cut leaves open edges. So the overlap is taken out in the
 * plane first. Seen at one angle round the axis, the body is the section stacked once per turn
 * that passes there, a pitch apart, and that stack is the same at every angle; only where the
 * winding starts and ends does one more copy pass. Those stacks are united as cross-sections,
 * exactly, and wound no more than half a turn at a time - half a turn can never meet itself. The
 * pieces only touch at their ends, so uniting them is cheap.
 */
function helicalRevolve(runtime: ManifoldToplevel, section: InstanceType<ManifoldToplevel["CrossSection"]>, settings: SketchRevolveSettings, disposable: unknown[]) {
  const turn = 2 * Math.PI;
  const total = (turn * Math.abs(settings.sweepAngle)) / 360;
  const pitch = settings.pitch ?? 0;
  const direction = settings.sweepAngle > 0 ? 1 : -1;
  // Whole turns, and the part of a turn left: up to that angle one more copy passes.
  const wholeTurns = Math.floor(total / turn + 1e-9);
  const rest = Math.max(0, total - wholeTurns * turn);
  const spans: Array<{ from: number; to: number; copies: number }> = [];
  if (rest > 1e-9) spans.push({ from: 0, to: rest, copies: wholeTurns + 1 });
  if (wholeTurns > 0) spans.push({ from: rest > 1e-9 ? rest : 0, to: turn, copies: wholeTurns });
  const stacks = new Map<number, InstanceType<ManifoldToplevel["CrossSection"]>>();
  const stack = (copies: number) => {
    let stacked = stacks.get(copies);
    if (!stacked) {
      const layers = Array.from({ length: copies }, (_value, index) => section.translate([0, index * pitch]));
      disposable.push(...layers);
      stacked = layers.length === 1 ? layers[0] : runtime.CrossSection.union(layers);
      disposable.push(stacked);
      stacks.set(copies, stacked);
    }
    return stacked;
  };
  const pieces: Array<InstanceType<ManifoldToplevel["Manifold"]>> = [];
  spans.forEach((span) => {
    const count = Math.ceil((span.to - span.from) / Math.PI - 1e-9);
    for (let index = 0; index < count; index += 1) {
      const from = span.from + ((span.to - span.from) * index) / count;
      const to = index === count - 1 ? span.to : span.from + ((span.to - span.from) * (index + 1)) / count;
      const length = to - from;
      const straight = stack(span.copies).extrude(length, Math.max(1, Math.ceil((settings.sides * length) / turn)));
      disposable.push(straight);
      const oriented = direction > 0 ? straight.mirror([0, 0, 1]) : straight;
      if (oriented !== straight) disposable.push(oriented);
      pieces.push(oriented.warp((vertex) => {
        // The ends land exactly where the neighbouring piece starts, a whole turn on the axis.
        const along = -vertex[2] * direction;
        const angle = along >= length - 1e-12 ? to : from + along;
        const [radius, height] = vertex;
        const onAxis = Math.abs(angle - turn) < 1e-12 ? 0 : angle;
        vertex[0] = radius * Math.cos(onAxis);
        vertex[1] = direction * radius * Math.sin(onAxis);
        vertex[2] = height + (pitch * angle) / turn;
      }));
    }
  });
  if (pieces.length === 1) return pieces[0];
  disposable.push(...pieces);
  return runtime.Manifold.union(pieces);
}

export function buildSketchRevolveMesh(runtime: ManifoldToplevel, profile: SketchProfile, requestedSettings?: Partial<SketchRevolveSettings>): SketchRevolveMesh {
  const settings = normalizeSketchRevolveSettings(requestedSettings);
  const polygons = sketchProfileToRevolvePolygons(profile, settings);
  if (polygons.length === 0) throw new Error("Draw at least one closed profile on the left side of the revolve axis");
  const disposable: unknown[] = [];
  try {
    const section = new runtime.CrossSection(polygons, "EvenOdd");
    disposable.push(section);
    const scale = polygons.reduce((largest, polygon) => polygon.reduce((current, point) => Math.max(current, Math.abs(point[0]), Math.abs(point[1])), largest), 1);
    const simplified = section.simplify(Math.max(1e-7, scale * 1e-8));
    disposable.push(simplified);
    if (simplified.toPolygons().length === 0) throw new Error("The revolve profile has no filled area");
    const sweep = Math.abs(settings.sweepAngle);
    const solid = settings.pitch ? helicalRevolve(runtime, simplified, settings, disposable) : simplified.revolve(settings.sides, sweep);
    disposable.push(solid);
    // A helix starts at the start angle and winds either way from there; rings are turned to
    // cover the same span.
    const rotation = settings.sweepAngle < 0 && !settings.pitch ? settings.startAngle + settings.sweepAngle : settings.startAngle;
    const revolved = Math.abs(rotation) > 1e-8 ? solid.rotate([0, 0, rotation]) : solid;
    if (revolved !== solid) disposable.push(revolved);
    if (revolved.status() !== "NoError" || revolved.numTri() < 1) throw new Error("The profile could not be revolved into a valid solid");

    const manifoldPositions = manifoldMeshPositions(revolved.getMesh());
    const positions = new Array<number>(manifoldPositions.length);
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let minZ = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    let maxZ = Number.NEGATIVE_INFINITY;
    for (let index = 0; index + 2 < manifoldPositions.length; index += 3) {
      const x = manifoldPositions[index];
      const y = manifoldPositions[index + 2];
      const z = -manifoldPositions[index + 1];
      positions[index] = x;
      positions[index + 1] = y;
      positions[index + 2] = z;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      minZ = Math.min(minZ, z);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      maxZ = Math.max(maxZ, z);
    }
    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;
    for (let index = 0; index + 2 < positions.length; index += 3) {
      positions[index] -= centerX;
      positions[index + 1] -= minY;
      positions[index + 2] -= centerZ;
    }
    return {
      positions,
      width: Math.max(0.01, maxX - minX),
      depth: Math.max(0.01, maxZ - minZ),
      height: Math.max(0.01, maxY - minY),
      triangleCount: Math.floor(positions.length / 9),
      axis: { x: -centerX, z: -centerZ },
    };
  } finally {
    [...new Set(disposable)].reverse().forEach(dispose);
  }
}
