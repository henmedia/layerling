import { updateSketchOffsets } from "@/lib/sketchOffsets";
import { cubicPoint } from "@/lib/sketchPaths";
import { orderedSketchPaths } from "@/lib/sketchSmoothHandles";
import type { SketchConstraint, SketchPoint, SketchProfile } from "@/types/layerling";

/**
 * A deliberately small, dependency-free 2D constraint projector. Each relation
 * adjusts only its referenced points. Running the projections repeatedly
 * handles ordinary connected chains; conflicting or immovable constraints are
 * *rejected*, rather than silently saving an invalid sketch.
 *
 * Failure diagnostics include unsatisfied equations and directly provable
 * contradictions. General nonlinear conflict analysis remains unsupported.
 */
const EPSILON = 0.00001; // mm
const ANGLE_EPSILON = 1e-8; // radians
const MAX_PASSES = 160;

type LineRelation = Exclude<Extract<SketchConstraint, { d: string }>, { kind: "line-distance" }>;

export function sketchRayAngle(first: { x: number; z: number }, second: { x: number; z: number }) {
  return Math.atan2(first.x * second.z - first.z * second.x, first.x * second.x + first.z * second.z);
}

/** Perpendicular projection onto the supporting line, including past its endpoints. */
export function sketchLineProjection(a: { x: number; z: number }, b: { x: number; z: number }, point: { x: number; z: number }) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const length = Math.hypot(dx, dz);
  if (length < EPSILON) return null;
  const nx = -dz / length;
  const nz = dx / length;
  const along = ((point.x - a.x) * dx + (point.z - a.z) * dz) / length ** 2;
  const distance = (point.x - a.x) * nx + (point.z - a.z) * nz;
  return { nx, nz, along, distance };
}

type OutlineGap = Extract<SketchConstraint, { kind: "outline-line-distance" }>;

export function sketchOutlineSegments(profile: SketchProfile, outline: readonly string[]) {
  const ids = new Set(outline);
  if (ids.size !== outline.length || outline.length < 3) return null;
  const segments = profile.segments.filter((segment) => ids.has(segment.startId) && ids.has(segment.endId));
  if (segments.some((segment) => segment.construction) || segments.length !== outline.length) return null;
  // A whole outline must be independent of all other edges.
  if (profile.segments.some((segment) => ids.has(segment.startId) !== ids.has(segment.endId))) return null;
  const paths = orderedSketchPaths({ ...profile, segments });
  return paths.length === 1 && paths[0].closed ? segments : null;
}

/** Recognize Layerling's four quarter-circle Béziers, including rotated circles. */
export function sketchCircleGeometry(points: ReadonlyMap<string, SketchPoint>, segments: SketchProfile["segments"]) {
  if (segments.length !== 4 || segments.some((segment) => segment.kind !== "bezier")) return null;
  const vertices = [...new Set(segments.flatMap((segment) => [segment.startId, segment.endId]))]
    .map((id) => points.get(id));
  if (vertices.length !== 4 || vertices.some((point) => !point)) return null;
  const center = {
    x: vertices.reduce((sum, point) => sum + point!.x / 4, 0),
    z: vertices.reduce((sum, point) => sum + point!.z / 4, 0),
  };
  const radius = Math.hypot(vertices[0]!.x - center.x, vertices[0]!.z - center.z);
  if (radius < EPSILON) return null;
  const tolerance = Math.max(1e-8, radius * 1e-6);
  const kappa = (4 / 3) * (Math.SQRT2 - 1);
  const close = (point: { x: number; z: number }, x: number, z: number) =>
    Math.hypot(point.x - x, point.z - z) <= tolerance;
  for (const segment of segments) {
    const a = points.get(segment.startId)!;
    const b = points.get(segment.endId)!;
    const ax = a.x - center.x;
    const az = a.z - center.z;
    const bx = b.x - center.x;
    const bz = b.z - center.z;
    if (Math.abs(Math.hypot(ax, az) - radius) > tolerance ||
      Math.abs(ax * bx + az * bz) > radius * tolerance ||
      !a.handleOut || !b.handleIn ||
      !close(a.handleOut, a.x + kappa * bx, a.z + kappa * bz) ||
      !close(b.handleIn, b.x + kappa * ax, b.z + kappa * az)) return null;
  }
  return { center, radius };
}

function cubicStationaryParameters(p0: number, p1: number, p2: number, p3: number) {
  const a = p3 - 3 * p2 + 3 * p1 - p0;
  const b = 2 * (p2 - 2 * p1 + p0);
  const c = p1 - p0;
  if (Math.abs(a) < 1e-12) return Math.abs(b) < 1e-12 ? [] : [-c / b];
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return [];
  const root = Math.sqrt(discriminant);
  return [(-b - root) / (2 * a), (-b + root) / (2 * a)];
}

export function sketchOutlineClearance(
  points: ReadonlyMap<string, SketchPoint>, segments: SketchProfile["segments"], a: SketchPoint, b: SketchPoint,
  side?: OutlineGap["side"],
) {
  const projection = sketchLineProjection(a, b, a);
  if (!projection) return null;
  const { nx, nz } = projection;
  const project = (point: { x: number; z: number }) => (point.x - a.x) * nx + (point.z - a.z) * nz;
  let nearest = { distance: Infinity, point: a as { x: number; z: number } };
  let farthest = { distance: -Infinity, point: nearest.point };
  const visit = (point: { x: number; z: number }) => {
    const distance = project(point);
    if (distance < nearest.distance) nearest = { distance, point };
    if (distance > farthest.distance) farthest = { distance, point };
  };
  for (const segment of segments) {
    const start = points.get(segment.startId);
    const end = points.get(segment.endId);
    if (!start || !end) return null;
    visit(start);
    visit(end);
    if ((segment.kind ?? "line") === "line" || !start.handleOut || !end.handleIn) continue;
    for (const t of cubicStationaryParameters(project(start), project(start.handleOut), project(end.handleIn), project(end))) {
      if (t > 0 && t < 1) visit(cubicPoint(start, start.handleOut, end.handleIn, end, t));
    }
  }
  const chosenSide = side ?? (nearest.distance + farthest.distance < 0 ? -1 : 1);
  const support = chosenSide === 1 ? nearest : farthest;
  return { ...support, side: chosenSide, nx, nz };
}

export type SketchConstraintFailure = {
  offsetError?: { message: string; pointIds: string[]; offsetId: string };
  unsatisfied: SketchConstraint[];
  conflicting: SketchConstraint[];
  attempted: SketchConstraint[];
};

type SolveResult = { ok: true; profile: SketchProfile } | {
  ok: false;
  profile: SketchProfile;
  failure: SketchConstraintFailure;
};

/** Reference groups distinguish edges and outlines from individual points. */
export function sketchConstraintReferences(rule: SketchConstraint): string[][] {
  if (rule.kind === "concentric") return rule.circles;
  if (rule.kind === "circle-diameter") return [rule.outline];
  const first = [rule.a, rule.b];
  if ("outline" in rule) return [first, rule.outline];
  if ("d" in rule) return [first, [rule.c, rule.d]];
  if ("c" in rule) return [first, [rule.c]];
  return [first];
}

/** Sketches retain point/edge topology, so connected geometry supplies each shape group. */
export function sketchConstraintGroups(profile: SketchProfile, constraints = profile.constraints ?? []) {
  const points = new Map(profile.points.map((point) => [point.id, point]));
  const neighbors = new Map(profile.points.map((point) => [point.id, new Set<string>()]));
  for (const segment of profile.segments) {
    neighbors.get(segment.startId)?.add(segment.endId);
    neighbors.get(segment.endId)?.add(segment.startId);
  }
  const shapeByPoint = new Map<string, string>();
  const shapes = new Map<string, { id: string; name: string; pointIds: string[]; segmentIds: string[] }>();
  for (const point of profile.points) {
    if (shapeByPoint.has(point.id)) continue;
    const ids = new Set<string>();
    const pending = [point.id];
    while (pending.length) {
      const id = pending.pop()!;
      if (ids.has(id) || !points.has(id)) continue;
      ids.add(id);
      shapeByPoint.set(id, point.id);
      pending.push(...neighbors.get(id) ?? []);
    }
    const segments = profile.segments.filter((segment) => ids.has(segment.startId) && ids.has(segment.endId));
    const kind = !segments.length ? "Point" : sketchCircleGeometry(points, segments) ? "Circle" : "Shape";
    const name = [...ids].map((id) => points.get(id)?.shapeName?.trim()).find(Boolean) ?? `${kind} ${shapes.size + 1}`;
    shapes.set(point.id, { id: point.id, name, pointIds: [...ids], segmentIds: segments.map((segment) => segment.id) });
  }
  const grouped = new Map<string, { id: string; label: string; shapes: Array<{ id: string; name: string; pointIds: string[]; segmentIds: string[] }>; constraints: SketchConstraint[] }>();
  for (const shape of shapes.values()) {
    grouped.set(shape.id, { id: shape.id, label: shape.name, shapes: [shape], constraints: [] });
  }
  for (const constraint of constraints) {
    const affected = new Set(sketchConstraintReferences(constraint).flat().map((id) => shapeByPoint.get(id)));
    const shapeIds = [...shapes.keys()].filter((id) => affected.has(id));
    for (const shapeId of shapeIds.length ? shapeIds : [undefined]) {
      const shape = shapeId === undefined ? undefined : shapes.get(shapeId);
      const id = shapeId ?? "unassigned";
      const group = grouped.get(id) ?? {
        id, label: shape?.name ?? "Other geometry", shapes: shape ? [shape] : [], constraints: [],
      };
      group.constraints.push(constraint);
      grouped.set(id, group);
    }
  }
  return [...grouped.values()];
}

export function sketchConstraintValueError(rule: SketchConstraint, value: number): string | undefined {
  if (!Number.isFinite(value)) return "Enter a finite number.";
  if (Math.abs(value) > 1e6) return "Enter a value within ±1,000,000.";
  if (rule.kind === "concentric" && value <= 0) return "Enter a radial gap greater than zero.";
  if (rule.kind === "angle" && (value <= 0 || value >= 180)) return "Enter an angle between 0° and 180°, exclusive.";
  if (rule.kind === "circle-diameter" && value <= 0.001) return "Enter a diameter greater than 0.001 mm.";
  if ((rule.kind === "distance" || rule.kind === "outline-line-distance") && value < 0) return "Enter a distance of zero or more.";
}

/** Report only pairs whose equations directly impose incompatible values. */
function directlyConflicting(first: SketchConstraint, second: SketchConstraint) {
  if (!sameSketchEndpoints(first.a, first.b, second.a, second.b)) return false;
  const distance = first.kind === "distance" ? first : second.kind === "distance" ? second : null;
  const other = distance === first ? second : first;
  if (distance && other.kind === "coincident") return distance.value >= 2 * EPSILON;
  if (distance && other.kind === "distance") return Math.abs(distance.value - other.value) >= 2 * EPSILON;

  const axisEquation = (rule: SketchConstraint) => {
    const sameDirection = rule.a === first.a;
    switch (rule.kind) {
      case "vertical": return { axis: "x", value: 0 };
      case "horizontal": return { axis: "z", value: 0 };
      case "offset-x": return { axis: "x", value: sameDirection ? rule.value : -rule.value };
      case "offset-z": return { axis: "z", value: sameDirection ? rule.value : -rule.value };
    }
  };
  const a = axisEquation(first);
  const b = axisEquation(second);
  if (!a || !b || a.axis !== b.axis) return false;
  const firstFrame = first.frameX ?? { x: 1, z: 0 };
  const secondFrame = second.frameX ?? { x: 1, z: 0 };
  return firstFrame.x === secondFrame.x && firstFrame.z === secondFrame.z &&
    Math.abs(a.value - b.value) >= 2 * EPSILON;
}

export function sameSketchEndpoints(a: string, b: string, c: string, d: string) {
  return (a === c && b === d) || (a === d && b === c);
}

export function validSketchConstraints(profile: SketchProfile): SketchConstraint[] {
  const ids = new Set(profile.points.map((point) => point.id));
  const hasLine = (a: string, b: string) => profile.segments.some((segment) =>
    (segment.kind ?? "line") === "line" && sameSketchEndpoints(a, b, segment.startId, segment.endId));
  return (profile.constraints ?? []).filter((rule) => {
    if (!ids.has(rule.a) || !ids.has(rule.b) || rule.a === rule.b) return false;
    if (rule.kind === "concentric") {
      const [first, second] = rule.circles;
      return (rule.radialGap === undefined || Number.isFinite(rule.radialGap)) && first.length === 4 && second.length === 4 && first.includes(rule.a) && second.includes(rule.b) &&
        first.every((id) => !second.includes(id)) &&
        Boolean(sketchOutlineSegments(profile, first) && sketchOutlineSegments(profile, second));
    }
    if (rule.kind === "circle-diameter") {
      return rule.value > 0 && rule.outline.length === 4 && rule.outline.includes(rule.a) && rule.outline.includes(rule.b) &&
        Boolean(sketchOutlineSegments(profile, rule.outline));
    }
    if (rule.kind === "outline-line-distance" || rule.kind === "circle-center-distance") {
      return !rule.outline.includes(rule.a) && !rule.outline.includes(rule.b) &&
        hasLine(rule.a, rule.b) && Boolean(sketchOutlineSegments(profile, rule.outline));
    }
    if (rule.kind === "point-line-distance") {
      return ids.has(rule.c) && rule.c !== rule.a && rule.c !== rule.b && hasLine(rule.a, rule.b);
    }
    if (rule.kind === "line-distance" && [rule.a, rule.b].some((id) => id === rule.c || id === rule.d)) return false;
    return !("c" in rule) || (
      ids.has(rule.c) && ids.has(rule.d) && rule.c !== rule.d &&
      !sameSketchEndpoints(rule.a, rule.b, rule.c, rule.d) &&
      hasLine(rule.a, rule.b) && hasLine(rule.c, rule.d) &&
      (rule.kind !== "angle" || (rule.a === rule.c && rule.value > 0 && rule.value < 180))
    );
  });
}

function applyBaseSketchConstraints(profile: SketchProfile, movedIds: ReadonlySet<string> = new Set(), holdReferences = true): SolveResult {
  const constraints = validSketchConstraints(profile);
  if (!constraints.length) {
    return { ok: true, profile: profile.constraints?.length ? { ...profile, constraints: [] } : profile };
  }

  const working = new Map(profile.points.map((point) => [point.id, { ...point }]));
  const preferred = new Set(movedIds);
  // When adding a constraint or editing its dimension, hold the first reference
  // steady by default. Explicit drag targets take precedence.
  if (holdReferences && !preferred.size) {
    for (const rule of constraints) if (!("c" in rule) && !("outline" in rule) && rule.kind !== "concentric") preferred.add(rule.a);
  }
  const strength = (point: SketchPoint) => point.locked || preferred.has(point.id) ? 0 : 1;
  const move = (point: SketchPoint, dx: number, dz: number) => {
    if (!dx && !dz) return;
    point.x += dx;
    point.z += dz;
    // Bezier handles are absolute, not offsets.
    if (point.handleIn) point.handleIn = { x: point.handleIn.x + dx, z: point.handleIn.z + dz };
    if (point.handleOut) point.handleOut = { x: point.handleOut.x + dx, z: point.handleOut.z + dz };
  };

  const direction = (a: SketchPoint, b: SketchPoint) => ({ x: b.x - a.x, z: b.z - a.z });
  const angleError = (first: { x: number; z: number }, second: { x: number; z: number }, rule: LineRelation) => {
    if (Math.hypot(first.x, first.z) < EPSILON || Math.hypot(second.x, second.z) < EPSILON) return Infinity;
    const angle = sketchRayAngle(first, second);
    if (rule.kind === "angle") return angle - (Math.sign(angle) || 1) * rule.value * Math.PI / 180;
    const delta = angle - (rule.kind === "perpendicular" ? Math.PI / 2 : 0);
    return delta - Math.round(delta / Math.PI) * Math.PI;
  };

  const projectLineRelation = (a: SketchPoint, b: SketchPoint, c: SketchPoint, d: SketchPoint, rule: LineRelation, firstPass: boolean) => {
    const first = direction(a, b);
    const second = direction(c, d);
    const equalLength = rule.kind === "equal-length";
    const firstLength = Math.hypot(first.x, first.z);
    const secondLength = Math.hypot(second.x, second.z);
    const residual = equalLength ? secondLength - firstLength : angleError(first, second, rule);
    if (!Number.isFinite(residual) || Math.abs(residual) < (equalLength ? EPSILON : ANGLE_EPSILON)) return;

    const unit = (vector: typeof first, length: number) =>
      length > 0 ? { x: vector.x / length, z: vector.z / length } : { x: 1, z: 0 };
    // First try adjusting the second line about its midpoint or shared/held endpoint.
    const wc = c === a || c === b ? 0 : strength(c);
    const wd = d === a || d === b ? 0 : strength(d);
    if (firstPass && !movedIds.size && wc + wd) {
      const orientation = unit(second, secondLength);
      const cos = Math.cos(residual);
      const sin = Math.sin(residual);
      const dx = equalLength ? -residual * orientation.x : second.x * cos + second.z * sin - second.x;
      const dz = equalLength ? -residual * orientation.z : second.z * cos - second.x * sin - second.z;
      move(c, -dx * wc / (wc + wd), -dz * wc / (wc + wd));
      move(d, dx * wd / (wc + wd), dz * wd / (wc + wd));
      return;
    }

    // Project the residual along its gradient. Sum a shared endpoint's
    // contributions so both line directions are accounted for when it moves.
    const gradients = new Map<SketchPoint, { x: number; z: number }>();
    const addGradient = (start: SketchPoint, end: SketchPoint, vector: { x: number; z: number }, sign: number) => {
      const lengthSq = vector.x ** 2 + vector.z ** 2;
      const orientation = unit(vector, Math.sqrt(lengthSq));
      const x = sign * (equalLength ? orientation.x : -vector.z / lengthSq);
      const z = sign * (equalLength ? orientation.z : vector.x / lengthSq);
      const from = gradients.get(start) ?? { x: 0, z: 0 };
      const to = gradients.get(end) ?? { x: 0, z: 0 };
      gradients.set(start, { x: from.x - x, z: from.z - z });
      gradients.set(end, { x: to.x + x, z: to.z + z });
    };
    addGradient(a, b, first, -1);
    addGradient(c, d, second, 1);
    let total = 0;
    for (const [point, gradient] of gradients) total += strength(point) * (gradient.x ** 2 + gradient.z ** 2);
    if (!total) return;
    for (const [point, gradient] of gradients) {
      const step = -residual * strength(point) / total;
      move(point, step * gradient.x, step * gradient.z);
    }
  };

  const projectGap = (a: SketchPoint, b: SketchPoint, point: SketchPoint, value: number, firstPass: boolean) => {
    const projection = sketchLineProjection(a, b, point);
    if (!projection) return;
    const { nx, nz, along, distance } = projection;
    const residual = distance - value;
    if (Math.abs(residual) < EPSILON) return;
    if (firstPass && !movedIds.size && strength(point)) {
      move(point, -residual * nx, -residual * nz);
      return;
    }

    // The projection parameter gives the derivative for each line endpoint.
    const references = [
      { point: a, derivative: along - 1 },
      { point: b, derivative: -along },
      { point, derivative: 1 },
    ];
    const total = references.reduce((sum, entry) => sum + strength(entry.point) * entry.derivative ** 2, 0);
    if (!total) return;
    for (const entry of references) {
      const step = -residual * strength(entry.point) * entry.derivative / total;
      move(entry.point, step * nx, step * nz);
    }
  };

  const outlineSegments = new Map(constraints.flatMap((rule) => "outline" in rule
    ? [[rule.id, sketchOutlineSegments(profile, rule.outline)!] as const] : []));

  const concentricOutlines = new Map(constraints.flatMap((rule) => rule.kind === "concentric"
    ? [[rule.id, rule.circles.map((ids) => sketchOutlineSegments(profile, ids)!)] as const] : []));
  const concentricDelta = (rule: Extract<SketchConstraint, { kind: "concentric" }>) => {
    const [first, second] = concentricOutlines.get(rule.id)!.map((segments) => sketchCircleGeometry(working, segments));
    return first && second ? { x: second.center.x - first.center.x, z: second.center.z - first.center.z } : null;
  };

  const outlineGap = (rule: Extract<SketchConstraint, { outline: string[] }>, a: SketchPoint, b: SketchPoint) => {
    const segments = outlineSegments.get(rule.id)!;
    if (rule.kind === "outline-line-distance") return sketchOutlineClearance(working, segments, a, b, rule.side);
    const circle = sketchCircleGeometry(working, segments);
    const projection = circle && sketchLineProjection(a, b, circle.center);
    return circle && projection ? { ...projection, point: circle.center } : null;
  };

  const error = (rule: SketchConstraint): number => {
    const a = working.get(rule.a)!;
    const b = working.get(rule.b)!;
    if (rule.kind === "concentric") {
      const delta = concentricDelta(rule);
      const [first, second] = concentricOutlines.get(rule.id)!.map((segments) => sketchCircleGeometry(working, segments));
      const gapError = rule.radialGap === undefined ? 0 : first && second ? Math.abs(second.radius - first.radius - rule.radialGap) : Infinity;
      return delta ? Math.max(Math.hypot(delta.x, delta.z), gapError) : Infinity;
    }
    const axis = rule.frameX ?? { x: 1, z: 0 };
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    if (rule.kind === "circle-diameter") {
      const circle = sketchCircleGeometry(working, outlineSegments.get(rule.id)!);
      return circle ? Math.abs(circle.radius * 2 - rule.value) : Infinity;
    }
    if ("outline" in rule) {
      const clearance = outlineGap(rule, a, b);
      const value = rule.kind === "outline-line-distance" ? rule.side * rule.value : rule.value;
      return clearance ? Math.abs(clearance.distance - value) : Infinity;
    }
    if (rule.kind === "point-line-distance" || rule.kind === "line-distance") {
      const errorAt = (id: string) => {
        const projection = sketchLineProjection(a, b, working.get(id)!);
        return projection ? Math.abs(projection.distance - rule.value) : Infinity;
      };
      if (rule.kind === "point-line-distance") return errorAt(rule.c);
      const second = direction(working.get(rule.c)!, working.get(rule.d)!);
      if (Math.hypot(second.x, second.z) < EPSILON) return Infinity;
      return Math.max(errorAt(rule.c), errorAt(rule.d));
    }
    if ("c" in rule) {
      const first = direction(a, b);
      const second = direction(working.get(rule.c)!, working.get(rule.d)!);
      if (rule.kind === "equal-length") return Math.abs(Math.hypot(second.x, second.z) - Math.hypot(first.x, first.z));
      return Math.abs(angleError(first, second, rule));
    }
    switch (rule.kind) {
      case "horizontal": return Math.abs(-axis.z * dx + axis.x * dz);
      case "vertical": return Math.abs(axis.x * dx + axis.z * dz);
      case "coincident": return Math.hypot(b.x - a.x, b.z - a.z);
      case "offset-x": return Math.abs(axis.x * dx + axis.z * dz - rule.value);
      case "offset-z": return Math.abs(-axis.z * dx + axis.x * dz - rule.value);
      case "distance": return Math.abs(Math.hypot(b.x - a.x, b.z - a.z) - rule.value);
    }
  };

  const satisfied = (rule: SketchConstraint) =>
    error(rule) < (rule.kind === "parallel" || rule.kind === "perpendicular" || rule.kind === "angle" ? ANGLE_EPSILON : EPSILON);

  for (let pass = 0; pass < MAX_PASSES; pass++) {
    for (const rule of constraints) {
      const a = working.get(rule.a)!;
      const b = working.get(rule.b)!;
      if (rule.kind === "concentric") {
        if (rule.radialGap !== undefined) {
          const shapes = concentricOutlines.get(rule.id)!.map((segments) => sketchCircleGeometry(working, segments));
          if (shapes.every(Boolean)) {
            const fixedDiameter = (ids: string[]) => constraints.some((entry) =>
              entry.kind === "circle-diameter" && entry.outline.every((id) => ids.includes(id)));
            const canScale = (ids: string[]) => !fixedDiameter(ids) &&
              ids.every((id) => !working.get(id)!.locked && !movedIds.has(id));
            const index = canScale(rule.circles[1]) ? 1 : canScale(rule.circles[0]) ? 0 : -1;
            if (index === 0 || index === 1) {
              const shape = shapes[index]!;
              const radius = index === 1 ? shapes[0]!.radius + rule.radialGap : shapes[1]!.radius - rule.radialGap;
              if (radius > EPSILON) {
                const scale = (point: { x: number; z: number }) => ({
                  x: shape.center.x + (point.x - shape.center.x) * radius / shape.radius,
                  z: shape.center.z + (point.z - shape.center.z) * radius / shape.radius,
                });
                for (const id of rule.circles[index]) {
                  const point = working.get(id)!;
                  Object.assign(point, scale(point), { handleIn: scale(point.handleIn!), handleOut: scale(point.handleOut!) });
                }
              }
            }
          }
        }
        const delta = concentricDelta(rule);
        if (!delta || Math.hypot(delta.x, delta.z) < EPSILON) continue;
        const [first, second] = rule.circles.map((ids) => ids.map((id) => working.get(id)!));
        const canTranslate = (points: SketchPoint[]) => points.every((point) => !point.locked && !movedIds.has(point.id));
        if (canTranslate(second)) {
          for (const point of second) move(point, -delta.x, -delta.z);
        } else if (canTranslate(first)) {
          for (const point of first) move(point, delta.x, delta.z);
        }
        continue;
      }
      if (rule.kind === "circle-diameter") {
        const circle = sketchCircleGeometry(working, outlineSegments.get(rule.id)!);
        const points = rule.outline.map((id) => working.get(id)!);
        if (!circle || Math.abs(circle.radius * 2 - rule.value) < EPSILON ||
          points.some((point) => point.locked || movedIds.has(point.id))) continue;
        const factor = rule.value / (2 * circle.radius);
        const scale = (point: { x: number; z: number }) => ({
          x: circle.center.x + (point.x - circle.center.x) * factor,
          z: circle.center.z + (point.z - circle.center.z) * factor,
        });
        for (const point of points) {
          Object.assign(point, scale(point), { handleIn: scale(point.handleIn!), handleOut: scale(point.handleOut!) });
        }
        continue;
      }
      if ("outline" in rule) {
        const clearance = outlineGap(rule, a, b);
        if (!clearance) continue;
        const value = rule.kind === "outline-line-distance" ? rule.side * rule.value : rule.value;
        const delta = value - clearance.distance;
        const outline = rule.outline.map((id) => working.get(id)!);
        if (outline.every((point) => !point.locked && !movedIds.has(point.id))) {
          for (const point of outline) move(point, delta * clearance.nx, delta * clearance.nz);
        } else {
          projectGap(a, b, { ...clearance.point, id: rule.id, locked: true }, value, false);
        }
        continue;
      }
      if (rule.kind === "point-line-distance" || rule.kind === "line-distance") {
        const c = working.get(rule.c)!;
        if (rule.kind === "line-distance") {
          const d = working.get(rule.d)!;
          if (pass === 0) projectLineRelation(a, b, c, d, { ...rule, kind: "parallel" }, true);
          projectGap(a, b, d, rule.value, pass === 0);
        }
        projectGap(a, b, c, rule.value, pass === 0);
        continue;
      }
      if ("c" in rule) {
        projectLineRelation(a, b, working.get(rule.c)!, working.get(rule.d)!, rule, pass === 0);
        continue;
      }
      const wa = strength(a);
      const wb = strength(b);
      const total = wa + wb;
      if (!total) continue;
      let dx = 0;
      let dz = 0;
      const axis = rule.frameX ?? { x: 1, z: 0 };
      // Local X and Z axes of the original sketch; for a rotated body these
      // axes turn with its geometry, instead of reverting to world X/Z.
      const vx = b.x - a.x;
      const vz = b.z - a.z;
      if (rule.kind === "horizontal") {
        const residual = -axis.z * vx + axis.x * vz;
        dx = -axis.z * residual;
        dz = axis.x * residual;
      } else if (rule.kind === "vertical") {
        const residual = axis.x * vx + axis.z * vz;
        dx = axis.x * residual;
        dz = axis.z * residual;
      } else if (rule.kind === "coincident") { dx = vx; dz = vz; }
      else if (rule.kind === "offset-x") {
        const residual = axis.x * vx + axis.z * vz - rule.value;
        dx = axis.x * residual;
        dz = axis.z * residual;
      } else if (rule.kind === "offset-z") {
        const residual = -axis.z * vx + axis.x * vz - rule.value;
        dx = -axis.z * residual;
        dz = axis.x * residual;
      }
      else if (rule.kind === "distance") {
        const vx = b.x - a.x;
        const vz = b.z - a.z;
        const length = Math.hypot(vx, vz);
        // For overlapping points there is no unique length direction.
        // Choose +X for a non-zero dimension instead of dividing by zero.
        const ux = length > EPSILON ? vx / length : 1;
        const uz = length > EPSILON ? vz / length : 0;
        dx = ux * (length - rule.value);
        dz = uz * (length - rule.value);
      }
      // Positive residual means b is too far ahead of a: move a forward
      // and b backward in proportion to their permitted movement.
      move(a, dx * wa / total, dz * wa / total);
      move(b, -dx * wb / total, -dz * wb / total);
    }
    if (constraints.every(satisfied)) {
      return { ok: true, profile: {
        ...profile,
        points: profile.points.map((point) => working.get(point.id)!),
        constraints,
      } };
    }
  }
  // Default reference anchors are conveniences, not persisted constraints. When they
  // block a solvable edit, retry without them; explicit locks and drag targets remain fixed.
  if (holdReferences && !movedIds.size && preferred.size) return applyBaseSketchConstraints(profile, movedIds, false);
  const unsatisfied = constraints.filter((rule) => !satisfied(rule));
  const conflicting = new Set<SketchConstraint>();
  for (const rule of unsatisfied) {
    for (const other of constraints) {
      if (directlyConflicting(rule, other)) {
        conflicting.add(rule);
        conflicting.add(other);
      }
    }
  }
  return { ok: false, profile, failure: { unsatisfied, conflicting: [...conflicting], attempted: [] } };
}

/** Keep constraints attached by stable point IDs, dropping only deleted references. */
export function withSketchConstraint(profile: SketchProfile, rule: SketchConstraint): SketchProfile {
  const constraints = validSketchConstraints(profile).filter((existing) => existing.id !== rule.id);
  if (rule.kind === "distance" || rule.kind === "angle" || rule.kind === "point-line-distance" || rule.kind === "line-distance" || "outline" in rule) {
    const existing = constraints.find((entry) => {
      if (rule.kind === "angle") return entry.kind === "angle" && entry.a === rule.a &&
        sameSketchEndpoints(entry.b, entry.d, rule.b, rule.d);
      if ("outline" in rule) return "outline" in entry && entry.kind === rule.kind &&
        (rule.kind === "circle-diameter" || (entry.a === rule.a && entry.b === rule.b)) &&
        entry.outline.length === rule.outline.length &&
        entry.outline.every((id) => rule.outline.includes(id));
      if (rule.kind === "point-line-distance") return entry.kind === rule.kind && entry.c === rule.c &&
        entry.a === rule.a && entry.b === rule.b;
      if (rule.kind === "line-distance") return entry.kind === rule.kind && entry.a === rule.a && entry.b === rule.b &&
        sameSketchEndpoints(entry.c, entry.d, rule.c, rule.d);
      return entry.kind === "distance" && sameSketchEndpoints(entry.a, entry.b, rule.a, rule.b);
    });
    if (existing && "value" in existing) {
      if (existing.value === rule.value) return profile;
      return { ...profile, constraints: constraints.map((entry) => entry === existing ? { ...existing, value: rule.value } : entry) };
    }
  }
  if (rule.kind === "concentric" && rule.radialGap !== undefined) {
    const existing = constraints.find((entry) => entry.kind === "concentric" &&
      rule.circles.every((ids) => entry.circles.some((other) => ids.every((id) => other.includes(id)))));
    if (existing?.kind === "concentric") {
      const radialGap = existing.circles[0].includes(rule.a) ? rule.radialGap : -rule.radialGap;
      return { ...profile, constraints: constraints.map((entry) => entry.id === existing.id ? { ...existing, radialGap } : entry) };
    }
  }
  if (constraints.some((existing) => {
    if (existing.kind !== rule.kind) return false;
    const sameFirst = sameSketchEndpoints(existing.a, existing.b, rule.a, rule.b);
    if (existing.kind === "concentric" && rule.kind === "concentric") {
      const sameCircle = (first: string[], second: string[]) => first.every((id) => second.includes(id));
      return (sameCircle(existing.circles[0], rule.circles[0]) && sameCircle(existing.circles[1], rule.circles[1])) ||
        (sameCircle(existing.circles[0], rule.circles[1]) && sameCircle(existing.circles[1], rule.circles[0]));
    }
    if ("d" in existing && "d" in rule) {
      return (sameFirst && sameSketchEndpoints(existing.c, existing.d, rule.c, rule.d)) ||
        (sameSketchEndpoints(existing.a, existing.b, rule.c, rule.d) &&
          sameSketchEndpoints(existing.c, existing.d, rule.a, rule.b));
    }
    return !("value" in rule) && sameFirst;
  })) return profile;
  return { ...profile, constraints: [...constraints, rule] };
}

/** Derived paths update around the existing constraint solve in one atomic operation. */
export function applySketchConstraints(profile: SketchProfile, movedIds: ReadonlySet<string> = new Set()): SolveResult {
  const prepared = updateSketchOffsets(profile, movedIds);
  const failure = (offsetError: { message: string; pointIds: string[]; offsetId: string }): SolveResult =>
    ({ ok: false, profile, failure: { unsatisfied: [], conflicting: [], attempted: [], offsetError } });
  if (!prepared.ok) return failure(prepared);
  const solved = applyBaseSketchConstraints(prepared.profile, movedIds);
  if (!solved.ok) return { ...solved, profile };
  const updated = updateSketchOffsets(solved.profile);
  return updated.ok ? { ok: true, profile: updated.profile } : failure(updated);
}
