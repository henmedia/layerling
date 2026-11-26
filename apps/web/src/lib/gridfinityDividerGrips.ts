import { gridfinityCompartments, gridfinityDividerPositionPatch, gridfinityDividerPositions, gridfinityDividerPositionsEqual, gridfinityPlan, type GridfinityAxis, type GridfinityShapeFields } from "@/lib/gridfinityGeometry";
import { bodyLocked } from "@/lib/shapeLock";
import { shapeOverallFootprintDimensions } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

/**
 * A Gridfinity bin's dividers dragged in the view (Discussion #1799), as Hollow's dividers by hand are: a grip on each
 * divider from wall to wall, and every compartment's size between the faces round it. The walls between the parts of a
 * split compartment stay evenly spaced, so they are drawn and measured but have no grip. All in the bin's own frame:
 * x across and z deep from the middle, y up from the bottom of its feet.
 */

type FlatPoint = { x: number; z: number };

/** One divider from wall to wall: where it runs, its place as the Position field shows it, and where its grip stands. */
type GridfinityDividerGrip = { axis: GridfinityAxis; index: number; position: number; from: FlatPoint; to: FlatPoint; grip: FlatPoint };

type GridfinityDividerGrips = {
  /** The dividers' top, where the grips stand: lower than the bin's when the dividers are set lower (#1560). */
  top: number;
  dividers: GridfinityDividerGrip[];
  /** The walls between the parts of the compartments split further. */
  parts: { from: FlatPoint; to: FlatPoint }[];
  compartments: { width: number; depth: number; centre: FlatPoint }[];
};

/** How far a dragged divider moves in one step, in mm, as a dragged wall in Hollow; Alt gives 0.1. */
const GRIDFINITY_DIVIDER_DRAG_STEP = 0.5;

const known = new WeakMap<WorkplaneShape, GridfinityDividerGrips | null>();

/** The fields the Compartments card works the dividers out from (its depth is the footprint's), so both agree. */
function fieldsOf(shape: WorkplaneShape): GridfinityShapeFields {
  return { ...shape, depth: shapeOverallFootprintDimensions(shape).depth };
}

/** A grip stands in the middle of the longest stretch between the walls that meet its divider, never on a crossing; of stretches as long, the one nearest the middle. */
function gripAlong(from: number, to: number, crossings: number[], thickness: number) {
  const ends = [from, ...crossings.sort((a, b) => a - b).flatMap((at) => [at - thickness / 2, at + thickness / 2]), to];
  const middle = (from + to) / 2;
  let best = { length: -1, at: middle };
  for (let i = 0; i < ends.length; i += 2) {
    const length = ends[i + 1] - ends[i];
    const at = (ends[i] + ends[i + 1]) / 2;
    if (length > best.length + 1e-6 || (Math.abs(length - best.length) <= 1e-6 && Math.abs(at - middle) < Math.abs(best.at - middle) - 1e-6)) best = { length, at };
  }
  return best.at;
}

/** The dividers, grips and compartments of a bin or tray as the view draws them; null without dividers, and for a bin hidden, locked or of locked shape. */
export function gridfinityDividerGrips(shape: WorkplaneShape): GridfinityDividerGrips | null {
  const cached = known.get(shape);
  if (cached !== undefined) return cached;
  const grips = shape.kind === "gridfinity" && !shape.hidden && !bodyLocked(shape) ? gripsOf(fieldsOf(shape)) : null;
  known.set(shape, grips);
  return grips;
}

function gripsOf(fields: GridfinityShapeFields): GridfinityDividerGrips | null {
  const compartments = gridfinityCompartments(fields);
  if (!compartments) return null;
  const plan = gridfinityPlan(fields);
  // The mesh is built round the bin without a solid overhang and moved by it, as the body is.
  const dx = plan.overhang?.offset.x ?? 0;
  const dz = plan.overhang?.offset.z ?? 0;
  const { cells, thickness, xs, zs } = compartments;
  // The cells run from the back left to the front right, so the first and the last hold the inside's edges.
  const { x0: left, z0: back } = cells[0];
  const { x1: right, z1: front } = cells[cells.length - 1];

  // The walls between parts: one between each two parts of a compartment, across all of it.
  const parts: { from: FlatPoint; to: FlatPoint }[] = [];
  const split = new Map<string, typeof cells>();
  for (const cell of cells) {
    if (cell.parts.x === 1 && cell.parts.z === 1) continue;
    const key = `${cell.column},${cell.row}`;
    const own = split.get(key);
    if (own) own.push(cell);
    else split.set(key, [cell]);
  }
  split.forEach((own) => {
    const x0 = Math.min(...own.map((cell) => cell.x0));
    const x1 = Math.max(...own.map((cell) => cell.x1));
    const z0 = Math.min(...own.map((cell) => cell.z0));
    const z1 = Math.max(...own.map((cell) => cell.z1));
    own.filter((cell) => cell.part.row === 0 && cell.part.column > 0).forEach((cell) => parts.push({ from: { x: cell.x0 - thickness / 2, z: z0 }, to: { x: cell.x0 - thickness / 2, z: z1 } }));
    own.filter((cell) => cell.part.column === 0 && cell.part.row > 0).forEach((cell) => parts.push({ from: { x: x0, z: cell.z0 - thickness / 2 }, to: { x: x1, z: cell.z0 - thickness / 2 } }));
  });

  // What meets a divider: every divider the other way, and every wall between parts that ends on it.
  const meets = (at: number, low: number, high: number) => low <= at + thickness && high >= at - thickness;
  const dividers: GridfinityDividerGrip[] = [
    ...xs.map((x, index) => {
      const crossings = [...zs, ...parts.filter((part) => part.from.z === part.to.z && meets(x, part.from.x, part.to.x)).map((part) => part.from.z)];
      return { axis: "x" as const, index, position: x - left, from: { x, z: back }, to: { x, z: front }, grip: { x, z: gripAlong(back, front, crossings, thickness) } };
    }),
    ...zs.map((z, index) => {
      const crossings = [...xs, ...parts.filter((part) => part.from.x === part.to.x && meets(z, part.from.z, part.to.z)).map((part) => part.from.x)];
      return { axis: "z" as const, index, position: z - back, from: { x: left, z }, to: { x: right, z }, grip: { x: gripAlong(left, right, crossings, thickness), z } };
    }),
  ];
  const moved = (point: FlatPoint) => ({ x: point.x + dx, z: point.z + dz });
  return {
    top: compartments.top,
    dividers: dividers.map((divider) => ({ ...divider, from: moved(divider.from), to: moved(divider.to), grip: moved(divider.grip) })),
    parts: parts.map((part) => ({ from: moved(part.from), to: moved(part.to) })),
    compartments: cells.map((cell) => ({ width: cell.x1 - cell.x0, depth: cell.z1 - cell.z0, centre: moved(cell.centre) })),
  };
}

/** Where a dragged divider began: its place, and its axis's list as the bin kept it then, none while evenly spaced. */
export type GridfinityDividerStart = { position: number; kept: readonly number[] | undefined };

/**
 * What a divider dragged `offset` mm from `start` writes: its place on steps of `step` from the inside of the wall,
 * held 6 mm from its neighbours, or, back within half a step, the list its axis had, so a drag out and back changes
 * nothing. Null while the bin already has that.
 */
export function gridfinityDividerDragged(shape: WorkplaneShape, axis: GridfinityAxis, index: number, start: GridfinityDividerStart, offset: number, step = GRIDFINITY_DIVIDER_DRAG_STEP): Pick<GridfinityShapeFields, "gridfinityDividerPositionsX" | "gridfinityDividerPositionsZ"> | null {
  if (Math.abs(offset) < step / 2) {
    const kept = start.kept ? [...start.kept] : undefined;
    if (gridfinityDividerPositionsEqual(axis === "x" ? shape.gridfinityDividerPositionsX : shape.gridfinityDividerPositionsZ, kept)) return null;
    return axis === "x" ? { gridfinityDividerPositionsX: kept } : { gridfinityDividerPositionsZ: kept };
  }
  const fields = fieldsOf(shape);
  // In whole tenths, so a step lands on 32.3 and not on 32.300000000000004.
  const tenths = Math.round(step * 10);
  const patch = gridfinityDividerPositionPatch(fields, axis, index, (Math.round(((start.position + offset) * 10) / tenths) * tenths) / 10);
  const next = axis === "x" ? patch.gridfinityDividerPositionsX : patch.gridfinityDividerPositionsZ;
  return next && Math.abs(next[index] - gridfinityDividerPositions(fields, axis)[index]) >= 1e-9 ? patch : null;
}
