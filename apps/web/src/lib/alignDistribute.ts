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
 * Parts in several rows (the puzzle's three rows of animals, spread from left to right) spread row by row:
 * two parts are in one row when their boxes overlap across the axis, on both other axes. Where that finds
 * no rows to spread (every part a row of its own, or a row whose parts overlap along the axis while they
 * stand beside each other across it, as when the same puzzle is spread from front to back and its animals
 * stand in no clean columns), the parts that overlap along the axis side by side move together as one
 * block - a whole row of the puzzle - and the blocks are spread instead; a staggered line is then simply one
 * part per block. Parts that lie in each other, dropped in a heap, are never a block: they are spread apart.
 *
 * With a gap typed in (Alt on the dot) the parts line up that far apart instead: the anchor or a locked
 * part in a row stays and the others line up from it, otherwise the first part stays; in a frame the row
 * comes to the frame's middle. A locked part or the anchor never moves, so one between the outer parts of
 * a row stops equal gaps; and where the parts are longer than the room between the outer ones, or than
 * the frame, nothing moves.
 */

const EPSILON = 0.0005;

/**
 * The plate as the align tool's reference: a click on empty space in Align mode makes it the fixed part.
 * It joins the selection as a thin locked box of the plate's size round the origin, so equal gaps take it
 * as the frame and spread the parts over the whole plate, and the other dots line them up on its edges or
 * its middle. It is never in the design, so nothing ever moves it or draws it.
 */
export const ALIGN_PLATE_ID = "align-plate";

export function alignPlateShape(width: number, depth: number): WorkplaneShape {
  return { id: ALIGN_PLATE_ID, name: "plate", kind: "box", color: "#000000", x: 0, z: 0, elevation: 0, size: Math.max(width, depth), width, depth, height: 0.001, rotation: 0, locked: true } as WorkplaneShape;
}

type Range = { min: number; max: number };
type Member = { shape: WorkplaneShape; bounds: Cuboid; along: Range; fixed: boolean };
/** What moves as one along the axis: a part, or a block of parts that overlap along it. */
type Unit = { members: Member[]; along: Range; fixed: boolean };

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

/** The groups of parts joined, directly or through others, by `linked`. */
function clusters(members: Member[], linked: (a: Member, b: Member) => boolean): Member[][] {
  const parent = members.map((_, index) => index);
  const root = (index: number): number => (parent[index] === index ? index : (parent[index] = root(parent[index])));
  for (let a = 0; a < members.length; a += 1) {
    for (let b = a + 1; b < members.length; b += 1) {
      if (linked(members[a], members[b])) parent[root(a)] = root(b);
    }
  }
  const byRoot = new Map<number, Member[]>();
  members.forEach((member, index) => {
    const key = root(index);
    byRoot.set(key, [...(byRoot.get(key) ?? []), member]);
  });
  return Array.from(byRoot.values());
}

const single = (member: Member): Unit => ({ members: [member], along: member.along, fixed: member.fixed });

/** The rows to spread, each a list of what moves as one, as described above. */
function rowsOf(members: Member[], axis: AlignAxis): Unit[][] {
  const [first, second] = otherAxes(axis);
  const across = (a: Member, b: Member) =>
    overlap(rangeAlong(a.bounds, first), rangeAlong(b.bounds, first)) && overlap(rangeAlong(a.bounds, second), rangeAlong(b.bounds, second));
  const rows = clusters(members, across);
  // Parts that lie in each other (dropped in a heap) are simply spread; a row is muddled when two of its
  // parts overlap along the axis while standing beside each other across it - they belong to two rows that
  // a third part joined.
  const muddled = rows.some((row) => row.some((a, i) => row.some((b, j) => j > i && overlap(a.along, b.along) && !across(a, b))));
  if (!muddled && rows.some((row) => row.length > 1)) return rows.map((row) => row.map(single));
  const blocks = clusters(members, (a, b) => overlap(a.along, b.along) && !across(a, b)).map((block): Unit => ({
    members: block,
    along: { min: Math.min(...block.map((member) => member.along.min)), max: Math.max(...block.map((member) => member.along.max)) },
    fixed: block.some((member) => member.fixed),
  }));
  return [blocks];
}

const sizeOf = (unit: Unit) => unit.along.max - unit.along.min;
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

/** Where each unit of one row starts along the axis, the row in order; or a problem. */
function placeRow(row: Unit[], frame: Range | null, gap: number | null): { starts: number[]; gap: number } | DistributeProblem {
  const count = row.length;
  const sizes = row.map(sizeOf);
  const total = sum(sizes);
  const fixed = row.map((unit, index) => (unit.fixed ? index : -1)).filter((index) => index >= 0);
  // Units laid one after the other from a start, `step` apart.
  const laidFrom = (start: number, step: number) => {
    const starts: number[] = [];
    let cursor = start;
    sizes.forEach((size) => {
      starts.push(cursor);
      cursor += size + step;
    });
    return starts;
  };
  // Units laid out round the one at `pivot`, which keeps its place.
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
    if (count < 3) return { starts: row.map((unit) => unit.along.min), gap: 0 };
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
  const least = frame ? 1 : gap !== null ? 2 : 3;
  if (parts.length < least) return none("tooFew");

  const rows = rowsOf(parts, axis)
    .map((row) => [...row].sort((a, b) => (a.along.min + a.along.max) - (b.along.min + b.along.max) || a.along.min - b.along.min))
    .filter((row) => row.length >= least);
  if (rows.length === 0) return none("tooFew");

  const deltas = new Map<string, number>();
  const gaps: number[] = [];
  for (const row of rows) {
    const placed = placeRow(row, frame ? frame.along : null, gap);
    if (typeof placed === "string") return { ...none(placed), frameId: frame?.shape.id ?? null };
    gaps.push(Math.max(0, placed.gap));
    row.forEach((unit, index) => {
      const delta = placed.starts[index] - unit.along.min;
      if (unit.fixed || Math.abs(delta) <= EPSILON) return;
      unit.members.forEach((member) => deltas.set(member.shape.id, delta));
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
