import { shiftAlongAxis, type AlignAxes } from "@/lib/alignFrame";
import { roundedAlignedValue } from "@/lib/alignRounding";
import { alignBounds } from "@/lib/alignSize";
import type { Cuboid } from "@/lib/editorMeshCore";
import { cleanNearZero } from "@/lib/workplaneShapes";
import type { AlignAxis, WorkplaneShape } from "@/types/layerling";

/**
 * Equal gaps (Sam Phillips, Facebook group, 04.11.2026). A fourth dot on each axis of the align tool spreads
 * parts of different sizes so that the space between neighbouring edges is the same everywhere, as
 * "Distribute" does in a slide program. The first and the last part along the axis stay where they are and
 * the ones between move.
 *
 * A board under the parts - a tray with the recesses of a peg puzzle - is a frame: a part whose box runs
 * past every other part's along the axis. It is found by itself, clicked as the anchor or not, and then the
 * parts spread inside it with the same gap at its edges as between them; a single part comes to its middle.
 *
 * Parts in several rows (the puzzle's three rows of animals) spread row by row: two parts are in one row
 * when their boxes overlap across the axis, on both other axes. Where that finds nothing to spread (every
 * part a row of its own, as in a staggered line) or a row whose parts overlap along the axis (one tall
 * part joining two rows), all the parts are one row.
 *
 * With a gap typed in (Alt on the dot) the parts line up that far apart instead: the anchor or a locked
 * part in a row stays and the others line up from it, otherwise the first part stays; in a frame the row
 * comes to the frame's middle. A locked part or the anchor never moves, so one between the outer parts of
 * a row stops equal gaps; and where the parts are longer than the room between the outer ones, or than
 * the frame, nothing moves.
 */

const EPSILON = 0.0005;

type Range = { min: number; max: number };
type Member = { shape: WorkplaneShape; bounds: Cuboid; along: Range; fixed: boolean };

export type DistributeProblem = "tooFew" | "noRoom" | "lockedBetween";

export type DistributeResult = {
  nextShapes: WorkplaneShape[];
  moved: number;
  /** The rows that were spread, each with the gap it got. */
  gaps: number[];
  /** The board the parts were spread in, if one was found. */
  frameId: string | null;
  problem: DistributeProblem | null;
};

export function rangeAlong(bounds: Cuboid, axis: AlignAxis): Range {
  return axis === "x" ? { min: bounds.minX, max: bounds.maxX } : axis === "y" ? { min: bounds.minY, max: bounds.maxY } : { min: bounds.minZ, max: bounds.maxZ };
}

const otherAxes = (axis: AlignAxis): [AlignAxis, AlignAxis] => (axis === "x" ? ["y", "z"] : axis === "y" ? ["x", "z"] : ["x", "y"]);

const overlap = (a: Range, b: Range) => a.max > b.min + EPSILON && b.max > a.min + EPSILON;

/** The part moved by `delta` along the axis: the world's, or a workplane's (#232). */
export function shiftedShape(shape: WorkplaneShape, axis: AlignAxis, delta: number, axes: AlignAxes | null): WorkplaneShape {
  if (axes) {
    const shift = shiftAlongAxis(axes, axis, delta);
    return {
      ...shape,
      x: cleanNearZero(roundedAlignedValue(shape.x + shift.x), EPSILON),
      z: cleanNearZero(roundedAlignedValue(shape.z + shift.z), EPSILON),
      elevation: cleanNearZero(roundedAlignedValue((shape.elevation ?? 0) + shift.y), EPSILON),
    };
  }
  if (axis === "x") return { ...shape, x: cleanNearZero(roundedAlignedValue(shape.x + delta), EPSILON) };
  if (axis === "z") return { ...shape, z: cleanNearZero(roundedAlignedValue(shape.z + delta), EPSILON) };
  return { ...shape, elevation: cleanNearZero(roundedAlignedValue((shape.elevation ?? 0) + delta), EPSILON) };
}

/** The part that runs past all the others along the axis and is longer than each: the board they lie on. */
function frameOf(members: Member[], anchorId: string | null): Member | null {
  if (members.length < 2) return null;
  const encloses = (candidate: Member) =>
    members.every((other) => other === candidate || (
      candidate.along.min <= other.along.min + EPSILON
      && candidate.along.max >= other.along.max - EPSILON
      && candidate.along.max - candidate.along.min > other.along.max - other.along.min + EPSILON
    ));
  const anchor = anchorId ? members.find((member) => member.shape.id === anchorId) : undefined;
  if (anchor && encloses(anchor)) return anchor;
  return members.find(encloses) ?? null;
}

/** The rows across the axis, as described above. */
function rowsOf(members: Member[], axis: AlignAxis): Member[][] {
  if (members.length < 2) return [members];
  const [first, second] = otherAxes(axis);
  const parent = members.map((_, index) => index);
  const root = (index: number): number => (parent[index] === index ? index : (parent[index] = root(parent[index])));
  for (let a = 0; a < members.length; a += 1) {
    for (let b = a + 1; b < members.length; b += 1) {
      if (overlap(rangeAlong(members[a].bounds, first), rangeAlong(members[b].bounds, first))
        && overlap(rangeAlong(members[a].bounds, second), rangeAlong(members[b].bounds, second))) {
        parent[root(a)] = root(b);
      }
    }
  }
  const byRoot = new Map<number, Member[]>();
  members.forEach((member, index) => {
    const key = root(index);
    byRoot.set(key, [...(byRoot.get(key) ?? []), member]);
  });
  const rows = Array.from(byRoot.values());
  const crowded = rows.some((row) => row.some((a, i) => row.some((b, j) => j > i && overlap(a.along, b.along))));
  if (crowded || rows.every((row) => row.length === 1)) return [members];
  return rows;
}

const sizeOf = (member: Member) => member.along.max - member.along.min;
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

/** Where each part of one row starts along the axis, the row in order; or a problem. */
function placeRow(row: Member[], frame: Range | null, gap: number | null): { starts: number[]; gap: number } | DistributeProblem {
  const count = row.length;
  const sizes = row.map(sizeOf);
  const total = sum(sizes);
  const fixed = row.map((member, index) => (member.fixed ? index : -1)).filter((index) => index >= 0);
  // Parts laid one after the other from a start, `step` apart.
  const laidFrom = (start: number, step: number) => {
    const starts: number[] = [];
    let cursor = start;
    sizes.forEach((size) => {
      starts.push(cursor);
      cursor += size + step;
    });
    return starts;
  };
  // Parts laid out round the part at `pivot`, which keeps its place.
  const laidRound = (pivot: number, step: number) => {
    const shift = row[pivot].along.min - laidFrom(0, step)[pivot];
    return laidFrom(shift, step);
  };

  if (gap === null) {
    if (frame) {
      if (fixed.length > 0) return "lockedBetween";
      const even = (frame.max - frame.min - total) / (count + 1);
      if (even < -EPSILON) return "noRoom";
      return { starts: laidFrom(frame.min + even, even), gap: even };
    }
    if (count < 3) return { starts: row.map((member) => member.along.min), gap: 0 };
    if (fixed.some((index) => index > 0 && index < count - 1)) return "lockedBetween";
    const first = row[0];
    const last = row[count - 1];
    const even = (last.along.min - first.along.max - sum(sizes.slice(1, -1))) / (count - 1);
    if (even < -EPSILON) return "noRoom";
    return { starts: laidFrom(first.along.min, even), gap: even };
  }

  if (fixed.length > 1) return "lockedBetween";
  if (fixed.length === 1) return { starts: laidRound(fixed[0], gap), gap };
  if (frame) {
    const length = total + gap * (count - 1);
    if (length > frame.max - frame.min + EPSILON) return "noRoom";
    return { starts: laidFrom((frame.min + frame.max - length) / 2, gap), gap };
  }
  return { starts: laidRound(0, gap), gap };
}

/**
 * Spread the selected parts along the axis with equal gaps, or with `gap` between them. `anchorId` is the
 * part clicked as the reference (a locked one counts as such too); it and every locked part keep their place.
 */
export function distributedShapesForSelection(
  shapes: WorkplaneShape[],
  selectedShapes: WorkplaneShape[],
  anchorId: string | null,
  axis: AlignAxis,
  axes: AlignAxes | null = null,
  gap: number | null = null,
): DistributeResult {
  const none = (problem: DistributeProblem | null): DistributeResult => ({ nextShapes: shapes, moved: 0, gaps: [], frameId: null, problem });
  const members: Member[] = selectedShapes.map((shape) => {
    const bounds = alignBounds(shape, axes);
    return { shape, bounds, along: rangeAlong(bounds, axis), fixed: Boolean(shape.locked) || shape.id === anchorId };
  });
  const frame = frameOf(members, anchorId);
  const parts = frame ? members.filter((member) => member !== frame) : members;
  if (parts.length < (frame ? 1 : gap !== null ? 2 : 3)) return none("tooFew");

  const rows = rowsOf(parts, axis)
    .map((row) => [...row].sort((a, b) => (a.along.min + a.along.max) - (b.along.min + b.along.max) || a.along.min - b.along.min))
    .filter((row) => row.length >= (frame || gap !== null ? 1 : 3));
  if (rows.length === 0) return none("tooFew");

  const deltas = new Map<string, number>();
  const gaps: number[] = [];
  for (const row of rows) {
    const placed = placeRow(row, frame ? frame.along : null, gap);
    if (typeof placed === "string") return { ...none(placed), frameId: frame?.shape.id ?? null };
    gaps.push(Math.max(0, placed.gap));
    row.forEach((member, index) => {
      const delta = placed.starts[index] - member.along.min;
      if (!member.fixed && Math.abs(delta) > EPSILON) deltas.set(member.shape.id, delta);
    });
  }

  const nextShapes = shapes.map((shape) => {
    const delta = deltas.get(shape.id);
    return delta === undefined ? shape : shiftedShape(shape, axis, delta, axes);
  });
  return { nextShapes: deltas.size ? nextShapes : shapes, moved: deltas.size, gaps, frameId: frame?.shape.id ?? null, problem: null };
}

/** What the dot of an axis shows: whether it can spread the parts, and whether they already are. */
export function distributionState(selection: WorkplaneShape[], anchorId: string | null, axis: AlignAxis, axes: AlignAxes | null = null) {
  const result = distributedShapesForSelection(selection, selection, anchorId, axis, axes);
  return { problem: result.problem, equal: result.problem === null && result.moved === 0, wouldMove: result.moved > 0 };
}
