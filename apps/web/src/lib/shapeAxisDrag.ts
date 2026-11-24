import type { DragAxis } from "@/lib/dragAxisLatch";
import { shapeMoveWorkplane, shapeOwnAxes, type ShapeTurn } from "@/lib/keyboardNudge";
import type { SnapBox } from "@/lib/objectSnap";
import type { PlacementWorkplane } from "@/lib/placementWorkplane";

/**
 * Dragging a shape along its own axes (J held, or the setting "Move along the shape's own axes"): the plane it slides
 * on, the move held to one of its axes, and the pink guides measured in its frame. Plain functions, no scene.
 */

type Direction = { x: number; y: number; z: number };

const dot = (a: Direction, b: Direction) => a.x * b.x + a.y * b.y + a.z * b.z;
const length = (a: Direction) => Math.hypot(a.x, a.y, a.z);

/** A drag plane whose normal is further than this from the view is seen nearly edge-on: the pointer's hit would jump. */
export const SHAPE_DRAG_MAX_TILT_DEGREES = 75;

/** Whether the plane with this normal faces the view enough to drag on it (within 75° of the view direction). */
export function shapeDragPlaneFacesView(normal: Direction, viewDirection: Direction): boolean {
  const size = length(normal) * length(viewDirection);
  if (!(size > 0)) return false;
  return Math.abs(dot(normal, viewDirection)) / size >= Math.cos((SHAPE_DRAG_MAX_TILT_DEGREES * Math.PI) / 180) - 1e-12;
}

/**
 * The plane a shape slides on when dragged along its own axes: across its own "up", through `start`, where the pointer
 * met that plane as the drag began. Counted from there, the grid's steps are whole steps from where the drag started.
 * Null when the plane is seen nearly edge-on: the drag then stays on the workplane.
 */
export function shapeDragFrame(shape: ShapeTurn, workplane: PlacementWorkplane, start: Direction, viewDirection: Direction): PlacementWorkplane | null {
  const frame = shapeMoveWorkplane(shape, workplane, start);
  return shapeDragPlaneFacesView(frame.normal, viewDirection) ? frame : null;
}

/**
 * A move held to one axis of the plane it is dragged on: of the plane's two directions, the one the move has gone
 * further along. On the flat workplane those are X and Z; on a tilted one, or along a shape's own axes, the plane's own.
 */
export function dragAxisLock(workplane: PlacementWorkplane, deltaX: number, deltaY: number, deltaZ: number, forced?: DragAxis): { along: DragAxis; delta: Direction; still?: boolean } {
  const alongX = deltaX * workplane.xAxis.x + deltaY * workplane.xAxis.y + deltaZ * workplane.xAxis.z;
  const alongZ = deltaX * workplane.zAxis.x + deltaY * workplane.zAxis.y + deltaZ * workplane.zAxis.z;
  const along: DragAxis = forced ?? (Math.abs(alongX) >= Math.abs(alongZ) ? "x" : "z");
  const axis = along === "x" ? workplane.xAxis : workplane.zAxis;
  const distance = along === "x" ? alongX : alongZ;
  return { along, delta: { x: axis.x * distance, y: axis.y * distance, z: axis.z * distance } };
}

/** Rotations closer than this count as the same, give or take quarter turns. */
export const PARALLEL_TURN_TOLERANCE_DEGREES = 0.01;

/**
 * Whether two shapes are turned alike: each axis of one lies along an axis of the other, either way round. So turns
 * that differ by quarter turns count - a box at 45° and one at 135° have parallel sides - and a tilted shape matches
 * one whose three axes line up with its own, swapped or flipped. Read from the stored rotation: a part whose turn was
 * baked into its mesh (stored as 0°) does not match.
 */
export function turnedAlike(a: ShapeTurn, b: ShapeTurn, toleranceDegrees = PARALLEL_TURN_TOLERANCE_DEGREES): boolean {
  const limit = Math.cos((toleranceDegrees * Math.PI) / 180);
  const own = shapeOwnAxes(a);
  const other = shapeOwnAxes(b);
  return own.every((axis) => other.some((candidate) => Math.abs(dot(axis, candidate)) >= limit));
}

/** A point in the frame's own coordinates: along its X, its normal (up) and its Z, from its origin. */
export function frameCoordinates(frame: PlacementWorkplane, point: Direction): Direction {
  const relative = { x: point.x - frame.origin.x, y: point.y - frame.origin.y, z: point.z - frame.origin.z };
  return { x: dot(relative, frame.xAxis), y: dot(relative, frame.normal), z: dot(relative, frame.zAxis) };
}

/** The scene point of frame coordinates (along X, up, along Z). */
export function framePointInWorld(frame: PlacementWorkplane, x: number, up: number, z: number): Direction {
  return {
    x: frame.origin.x + frame.xAxis.x * x + frame.normal.x * up + frame.zAxis.x * z,
    y: frame.origin.y + frame.xAxis.y * x + frame.normal.y * up + frame.zAxis.y * z,
    z: frame.origin.z + frame.xAxis.z * x + frame.normal.z * up + frame.zAxis.z * z,
  };
}

/** A box in the frame: along its X and Z for the snap, and how far it reaches along up. */
export type FrameBox = SnapBox & { minUp: number; maxUp: number };

/** The box round these points (a shape's corners, a reference point) along the frame's axes. */
export function frameBox(frame: PlacementWorkplane, points: readonly Direction[]): FrameBox | null {
  if (points.length === 0) return null;
  const box: FrameBox = {
    minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity, minUp: Infinity, maxUp: -Infinity,
  };
  points.forEach((point) => {
    const local = frameCoordinates(frame, point);
    box.minX = Math.min(box.minX, local.x);
    box.maxX = Math.max(box.maxX, local.x);
    box.minZ = Math.min(box.minZ, local.z);
    box.maxZ = Math.max(box.maxZ, local.z);
    box.minUp = Math.min(box.minUp, local.y);
    box.maxUp = Math.max(box.maxUp, local.y);
  });
  return box;
}

/** The eight corners of a shape's box in the scene: its half sizes turned by its rotation round its centre. */
export function turnedBoxCorners(center: Direction, half: Direction, shape: ShapeTurn): Direction[] {
  const [ax, ay, az] = shapeOwnAxes(shape);
  const corners: Direction[] = [];
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) {
        corners.push({
          x: center.x + ax.x * sx * half.x + ay.x * sy * half.y + az.x * sz * half.z,
          y: center.y + ax.y * sx * half.x + ay.y * sy * half.y + az.y * sz * half.z,
          z: center.z + ax.z * sx * half.x + ay.z * sy * half.y + az.z * sz * half.z,
        });
      }
    }
  }
  return corners;
}

/**
 * The step that brings the dragged selection onto a target in the shape's frame, for the axes not held still: the
 * snapped coordinates along the frame's X and Z, from the unsnapped ones and the pull `objectSnapOffset` found.
 */
export function snappedFrameMove(
  raw: { x: number; z: number },
  current: { x: number; z: number },
  pull: { dx: number | null; dz: number | null },
  lock: DragAxis | null,
): { x: number; z: number; snapped: boolean } {
  const x = pull.dx !== null && lock !== "z" ? raw.x + pull.dx : current.x;
  const z = pull.dz !== null && lock !== "x" ? raw.z + pull.dz : current.z;
  return { x, z, snapped: (pull.dx !== null && lock !== "z") || (pull.dz !== null && lock !== "x") };
}

/** At most this many lines each way on the shape's workplane: a fine snap step on a large shape draws every n-th step. */
export const SHAPE_WORKPLANE_MAX_LINES = 60;

/**
 * The workplane shown while a shape moves along its own axes (setting "Show the shape's workplane while moving"): on
 * the selection's bottom along its own up, centred under it, about three times its footprint and at least six grid
 * blocks wide, with lines a snap step apart - or a whole number of steps, so there are not too many. Fixed where the
 * move began: the selection moves in whole steps, so its middle stays on the lines. `box` is the selection's box in
 * `frame`, whose axes it takes; its origin does not matter.
 */
export function shapeWorkplanePreview(
  frame: PlacementWorkplane,
  box: FrameBox,
  gridBlock: number,
  snapStep: number,
): { workplane: PlacementWorkplane; size: number; spacing: number } {
  const block = gridBlock > 0 ? gridBlock : 10;
  const footprint = Math.max(box.maxX - box.minX, box.maxZ - box.minZ, 0);
  const size = Math.min(Math.max(footprint * 3, block * 6), 1000);
  const step = snapStep > 0 ? snapStep : block;
  const spacing = step * Math.max(1, Math.ceil(size / 2 / step / SHAPE_WORKPLANE_MAX_LINES));
  const origin = framePointInWorld(frame, (box.minX + box.maxX) / 2, box.minUp, (box.minZ + box.maxZ) / 2);
  return { workplane: { ...frame, origin }, size, spacing };
}

/**
 * When the shape's workplane shows: only with its setting on, and only while a move along the shape's own axes is
 * going on - J held while the axes are not the normal way, or with them the normal way, an arrow key held or a drag running.
 */
export function showsShapeWorkplane(options: {
  setting: boolean;
  alongShapeNormally: boolean;
  keyHeld: boolean;
  arrowHeld: boolean;
  dragAlongShape: boolean;
}): boolean {
  if (!options.setting) return false;
  if (!options.alongShapeNormally) return options.keyHeld || options.dragAlongShape;
  return (!options.keyHeld && options.arrowHeld) || options.dragAlongShape;
}
