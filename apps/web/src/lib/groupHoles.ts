import type { WorkplaneShape } from "@/types/layerling";
import { restoreGroupedChildren } from "@/lib/editorBooleans";
import { shapeDepth, shapeWidth } from "@/lib/workplaneShapes";

/**
 * The round holes of a group, for changing their diameter all at once or one by one from the group's panel: a round
 * hole is a cylinder (as wide as it is deep) that cuts, in the group itself or in a group inside it. A part's place in
 * the group is its path of part numbers, outermost first. A tag, QR code or board keeps its holes as its card made
 * them, so its parts are not looked into; nor is a bundle's, whose parts do not cut one another.
 */
export type GroupHole = { path: number[]; diameter: number; middle: Point3 };

type Point3 = [number, number, number];

/** A hole's middle, where the group puts it. */
function middleOf(part: WorkplaneShape): Point3 {
  return [part.x, (part.elevation ?? 0) + part.height / 2, part.z];
}

/** A cylinder hole that is round, not stretched into an ellipse. */
export function isRoundHole(part: WorkplaneShape) {
  return part.kind === "cylinder" && Boolean(part.hole) && Math.abs(shapeWidth(part) - shapeDepth(part)) < 1e-3;
}

/** Whether the holes inside this part may be changed through the group around it. */
export function opensForHoles(part: WorkplaneShape) {
  return Boolean(part.groupedShapes?.length) && part.groupOperation !== "bundle" && !part.sbcBoard && !part.fan && !part.qrCode && !part.layeredText && !part.layeredIcon;
}

export function groupRoundHoles(group: WorkplaneShape, prefix: number[] = []): GroupHole[] {
  if (!opensForHoles(group)) return [];
  return restoreGroupedChildren(group).flatMap((part, index) => {
    const path = [...prefix, index];
    if (isRoundHole(part)) return [{ path, diameter: Math.round(shapeWidth(part) * 1e4) / 1e4, middle: middleOf(part) }];
    return opensForHoles(part) ? groupRoundHoles(part, path) : [];
  });
}

export function samePath(a: readonly number[], b: readonly number[]) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

/**
 * Holes of one size spaced evenly on one circle, such as the bolt holes of a flange (Discussion #2102), all round it
 * (three or more) or on an arc of it (four or more), as Pattern's circle lays them: their circle's middle and diameter,
 * and how close it may come, the closest two holes then just touching. A hole in the middle, or one of another size, is
 * not on it; nor are the corners of an oblong rectangle, which lie on a circle too but not evenly (those of a square
 * do), nor holes that are part of a grid.
 */
export type HoleCircle = { paths: number[][]; holeDiameter: number; centre: Point3; diameter: number; minDiameter: number };

const sub3 = (a: Point3, b: Point3): Point3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot3 = (a: Point3, b: Point3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross3 = (a: Point3, b: Point3): Point3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const length3 = (a: Point3) => Math.sqrt(dot3(a, a));

/** The circle through three points, or null when they lie on a line. */
function circleThrough(a: Point3, b: Point3, c: Point3): { centre: Point3; radius: number; normal: Point3 } | null {
  const ab = sub3(b, a);
  const ac = sub3(c, a);
  const normal = cross3(ab, ac);
  const area = dot3(normal, normal);
  if (area < 1e-9) return null;
  // The circumcentre: a + ((|ac|² (n × ab)) + (|ab|² (ac × n))) / (2 |n|²).
  const left = cross3(normal, ab).map((value) => value * dot3(ac, ac)) as Point3;
  const right = cross3(ac, normal).map((value) => value * dot3(ab, ab)) as Point3;
  const centre: Point3 = [0, 1, 2].map((axis) => a[axis] + (left[axis] + right[axis]) / (2 * area)) as Point3;
  return { centre, radius: length3(sub3(a, centre)), normal: normal.map((value) => value / Math.sqrt(area)) as Point3 };
}

/** How far apart a hole may lie from its circle and still count as on it: a hundredth of a millimetre. */
const ON_CIRCLE = 0.01;

/**
 * Whether the circle's holes are part of a grid: another hole of their size lies on the straight line through two
 * neighbours on the circle, between them or up to one spacing further on. Any square of four in a grid has one.
 */
function inGrid(ring: readonly GroupHole[], spacing: number, others: readonly GroupHole[]) {
  return ring.some((a, index) => ring.slice(index + 1).some((b) => {
    const along = sub3(b.middle, a.middle);
    const length = length3(along);
    if (Math.abs(length - spacing) > ON_CIRCLE) return false;
    return others.some((other) => {
      const offset = sub3(other.middle, a.middle);
      const at = dot3(offset, along) / (length * length);
      return at > -1 - 1e-3 && at < 2 + 1e-3 && length3(cross3(offset, along)) / length < ON_CIRCLE;
    });
  }));
}

/** A circle through holes that lie on it evenly: its holes, and the smallest angle between two of them. */
type EvenRing = { on: GroupHole[]; centre: Point3; radius: number; closest: number };

/**
 * Every circle through three or more of the holes that has them evenly spaced: every gap the same, or, from four holes
 * on, all but one, the rest of the circle past an arc. Three holes with two equal gaps are any L with equal legs.
 */
function evenRings(holes: readonly GroupHole[]): EvenRing[] {
  const seen = new Set<string>();
  const rings: EvenRing[] = [];
  for (let i = 0; i < holes.length - 2; i += 1) {
    for (let j = i + 1; j < holes.length - 1; j += 1) {
      for (let k = j + 1; k < holes.length; k += 1) {
        const circle = circleThrough(holes[i].middle, holes[j].middle, holes[k].middle);
        if (!circle || circle.radius < 1e-3) continue;
        const indices: number[] = [];
        holes.forEach((hole, index) => {
          const offset = sub3(hole.middle, circle.centre);
          if (Math.abs(dot3(offset, circle.normal)) < ON_CIRCLE && Math.abs(length3(offset) - circle.radius) < ON_CIRCLE) indices.push(index);
        });
        const key = indices.join(",");
        if (indices.length < 3 || seen.has(key)) continue;
        seen.add(key);
        const on = indices.map((index) => holes[index]);
        // The gaps between the holes, by their angle round the middle.
        const first = sub3(on[0].middle, circle.centre);
        const across = cross3(circle.normal, first);
        const angles = on.map((hole) => {
          const offset = sub3(hole.middle, circle.centre);
          return Math.atan2(dot3(offset, across), dot3(offset, first));
        }).sort((a, b) => a - b);
        const gaps = angles.map((angle, index) => (index + 1 < angles.length ? angles[index + 1] : angles[0] + 2 * Math.PI) - angle);
        const closest = Math.min(...gaps);
        const step = gaps.filter((gap) => Math.abs(gap - closest) < 1e-3).length;
        if (step < gaps.length && (gaps.length < 4 || step < gaps.length - 1)) continue;
        rings.push({ on, centre: circle.centre, radius: circle.radius, closest });
      }
    }
  }
  return rings;
}

/** The circles of holes in a group: at least three holes of one size each, the circle with the most holes first. */
export function holeCircles(holes: readonly GroupHole[]): HoleCircle[] {
  const bySize = new Map<number, GroupHole[]>();
  holes.forEach((hole) => {
    const key = Math.round(hole.diameter * 1e3);
    bySize.set(key, [...(bySize.get(key) ?? []), hole]);
  });
  const circles: HoleCircle[] = [];
  bySize.forEach((sameSize) => {
    const rings = evenRings(sameSize.slice(0, 48));
    // The holes of a grid first, so that no other circle through some of them is offered either.
    const taken = new Set<GroupHole>();
    rings.forEach((ring) => {
      // Whole squares and hexagons make grids; three holes at 120° turn up in any ring with a hole in its middle.
      const whole = Math.abs(ring.closest - (2 * Math.PI) / ring.on.length) < 1e-3;
      if (!whole || (ring.on.length !== 4 && ring.on.length !== 6)) return;
      const spacing = 2 * ring.radius * Math.sin(Math.min(ring.closest, Math.PI) / 2);
      if (inGrid(ring.on, spacing, sameSize.filter((hole) => !ring.on.includes(hole)))) ring.on.forEach((hole) => taken.add(hole));
    });
    // Then the circles with the most holes, each hole on one of them only.
    [...rings].sort((a, b) => b.on.length - a.on.length).forEach((ring) => {
      if (ring.on.some((hole) => taken.has(hole))) return;
      ring.on.forEach((hole) => taken.add(hole));
      const holeDiameter = ring.on[0].diameter;
      circles.push({
        paths: ring.on.map((hole) => hole.path),
        holeDiameter,
        centre: ring.centre,
        diameter: Math.round(ring.radius * 2 * 1e4) / 1e4,
        minDiameter: Math.ceil((holeDiameter / Math.sin(Math.min(ring.closest, Math.PI) / 2)) * 100 - 1e-6) / 100,
      });
    });
  });
  return circles.sort((a, b) => b.paths.length - a.paths.length);
}

/**
 * A change of the holes: `all` sets every round hole's diameter, `one` the hole at its path; `circle` moves the holes at
 * its paths in or out from the circle's middle, so the circle has the new diameter and the holes keep their size.
 */
export type GroupHoleChange =
  | { all: number }
  | { one: { path: number[]; diameter: number } }
  | { circle: { paths: number[][]; centre: Point3; from: number; to: number } };

export function holeDiameterFor(change: GroupHoleChange, path: readonly number[]) {
  if ("all" in change) return change.all;
  if ("circle" in change) return null;
  return samePath(change.one.path, path) ? change.one.diameter : null;
}

/** Where the hole at `path` goes for a change of its circle, or null when it stays. */
export function holeMiddleFor(change: GroupHoleChange, path: readonly number[], middle: Point3): Point3 | null {
  if (!("circle" in change) || !change.circle.paths.some((each) => samePath(each, path)) || change.circle.from <= 0) return null;
  const scale = change.circle.to / change.circle.from;
  const { centre } = change.circle;
  return [0, 1, 2].map((axis) => centre[axis] + (middle[axis] - centre[axis]) * scale) as Point3;
}

/** Whether a change reaches anything inside the part at `path`. */
export function changeReaches(change: GroupHoleChange, path: readonly number[]) {
  if ("all" in change) return true;
  const inside = (target: readonly number[]) => target.length > path.length && path.every((value, index) => target[index] === value);
  if ("circle" in change) return change.circle.paths.some(inside);
  return inside(change.one.path);
}

/**
 * The group with its round holes changed, built again from the inside out: a group inside it with a changed hole is
 * built first, then the group around it. Every hole keeps its depth and its turn; a new diameter keeps its middle too,
 * and a new circle keeps its diameter. `rebuild` puts a group together again from its parts, as Edit group's Done does.
 */
export async function withHoleDiameters(
  group: WorkplaneShape,
  change: GroupHoleChange,
  rebuild: (original: WorkplaneShape, parts: WorkplaneShape[]) => Promise<WorkplaneShape | null>,
  prefix: number[] = [],
): Promise<WorkplaneShape | null> {
  const parts = restoreGroupedChildren(group);
  let changed = false;
  const next: WorkplaneShape[] = [];
  for (const [index, part] of parts.entries()) {
    const path = [...prefix, index];
    if (isRoundHole(part)) {
      const diameter = holeDiameterFor(change, path);
      if (diameter !== null && diameter > 0 && Math.abs(diameter - shapeWidth(part)) > 1e-6) {
        next.push({ ...part, width: diameter, depth: diameter, size: diameter });
        changed = true;
        continue;
      }
      const middle = holeMiddleFor(change, path, middleOf(part));
      if (middle && length3(sub3(middle, middleOf(part))) > 1e-6) {
        next.push({ ...part, x: middle[0], elevation: middle[1] - part.height / 2, z: middle[2] });
        changed = true;
        continue;
      }
    } else if (opensForHoles(part) && changeReaches(change, path) && groupRoundHoles(part, path).length) {
      const inner = await withHoleDiameters(part, change, rebuild, path);
      if (inner === null) return null;
      if (inner !== part) {
        next.push(inner);
        changed = true;
        continue;
      }
    }
    next.push(part);
  }
  if (!changed) return group;
  return rebuild(group, next);
}
