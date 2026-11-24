import * as THREE from "three";
import { quaternionForShape } from "@/lib/geometryRotation";
import type { PlacementWorkplane } from "@/lib/placementWorkplane";

type Direction = { x: number; y: number; z: number };

const dot = (a: Direction, b: Direction) => a.x * b.x + a.y * b.y + a.z * b.z;

/**
 * Which workplane axis an arrow key moves along, given how the view is
 * turned. Left and right go along the axis that points most to the right on
 * the screen, up and down along the other one - up away from the viewer, as
 * on the screen. Without a view (no camera yet) the keys keep the plane's own
 * axes: right is +x, up is -z.
 *
 * `deltaX` is the step of the left/right keys (right positive), `deltaZ` of
 * the up/down keys (down positive, towards the viewer). The result is the
 * step along the workplane's x and z axis.
 */
export function screenAlignedNudge(
  workplane: { xAxis: Direction; zAxis: Direction },
  deltaX: number,
  deltaZ: number,
  screen?: { right: Direction; away: Direction },
): { xStep: number; zStep: number } {
  if (!screen) return { xStep: deltaX, zStep: deltaZ };
  const rightOnX = dot(screen.right, workplane.xAxis);
  const rightOnZ = dot(screen.right, workplane.zAxis);
  // With a tolerance: a shape turned exactly 45° and seen square on would otherwise let rounding noise pick the axis.
  const rightIsX = Math.abs(rightOnX) >= Math.abs(rightOnZ) - 1e-9;
  const rightSign = Math.sign(rightIsX ? rightOnX : rightOnZ) || 1;
  // The up/down keys use the other axis; which way along it is "away".
  const awayOnOther = dot(screen.away, rightIsX ? workplane.zAxis : workplane.xAxis);
  const awaySign = Math.sign(awayOnOther) || (rightIsX ? -1 : 1);
  let xStep = 0;
  let zStep = 0;
  if (rightIsX) {
    xStep += rightSign * deltaX;
    zStep += -awaySign * deltaZ;
  } else {
    zStep += rightSign * deltaX;
    xStep += -awaySign * deltaZ;
  }
  return { xStep, zStep };
}

/** The rotation a shape keeps in its record: turned about Y (`rotation`), tilted about X and Z, in degrees. */
export type ShapeTurn = { rotation: number; rotationX?: number; rotationZ?: number };

/** A later axis has to beat an earlier one by this much, so an exact 45° settles the same way every time (X, then Y, then Z). */
const AXIS_TIE = 1e-6;

const toDirection = (vector: THREE.Vector3): Direction => ({
  x: Math.abs(vector.x) < 1e-12 ? 0 : vector.x,
  y: Math.abs(vector.y) < 1e-12 ? 0 : vector.y,
  z: Math.abs(vector.z) < 1e-12 ? 0 : vector.z,
});

/** The shape's own X, Y and Z in the scene: its rotation (Euler XYZ, so the X tilt comes last) applied to the three axes. */
export function shapeOwnAxes(shape: ShapeTurn): [Direction, Direction, Direction] {
  const turn = quaternionForShape(shape);
  return [
    toDirection(new THREE.Vector3(1, 0, 0).applyQuaternion(turn)),
    toDirection(new THREE.Vector3(0, 1, 0).applyQuaternion(turn)),
    toDirection(new THREE.Vector3(0, 0, 1).applyQuaternion(turn)),
  ];
}

/** The index of the axis lying most along `towards` (largest |dot|); a later one must win by more than the tie margin. */
function mostAlong(axes: Direction[], towards: Direction): number {
  let best = 0;
  for (let index = 1; index < axes.length; index += 1) {
    if (Math.abs(dot(axes[index], towards)) > Math.abs(dot(axes[best], towards)) + AXIS_TIE) best = index;
  }
  return best;
}

const flipped = (direction: Direction): Direction => ({ x: -direction.x || 0, y: -direction.y || 0, z: -direction.z || 0 });

/**
 * The frame a shape moves in when it moves along its own axes (hold J): a workplane whose normal is the shape's "up" -
 * its axis lying most along the workplane's normal, turned to point away from the workplane so Ctrl+↑ always raises
 * it - and whose X and Z are its other two axes. X is the one of those two lying most along the workplane's X, pointed
 * the same way, so the red arrow stays near where it was; Z follows from X and up, as on every workplane. A shape only
 * spun flat on the plate gets the plate's normal and its own sides. The origin is `origin`, the workplane's by default.
 */
export function shapeMoveWorkplane(shape: ShapeTurn, workplane: PlacementWorkplane, origin: Direction = workplane.origin): PlacementWorkplane {
  const axes = shapeOwnAxes(shape);
  const upIndex = mostAlong(axes, workplane.normal);
  const up = dot(axes[upIndex], workplane.normal) < 0 ? flipped(axes[upIndex]) : axes[upIndex];
  const others = axes.filter((_, index) => index !== upIndex);
  const sideIndex = mostAlong(others, workplane.xAxis);
  const side = dot(others[sideIndex], workplane.xAxis) < 0 ? flipped(others[sideIndex]) : others[sideIndex];
  const zAxis = toDirection(new THREE.Vector3(side.x, side.y, side.z).cross(new THREE.Vector3(up.x, up.y, up.z)).normalize());
  return { origin: { ...origin }, normal: up, xAxis: side, zAxis };
}

/**
 * Whether a move goes along the shape's own axes: J held swaps whatever the setting "Move along the shape's own axes"
 * makes normal.
 */
export function movesAlongShapeAxes(settingOn: boolean, keyHeld: boolean): boolean {
  return settingOn !== keyHeld;
}

/** Which selected shape gives the axes: the last selected one that is not locked. A group gives its own. */
export function shapeGivingAxes<T extends { id: string; locked?: boolean }>(selectedIds: readonly string[], shapes: readonly T[]): T | null {
  const byId = new Map(shapes.map((shape) => [shape.id, shape]));
  for (let index = selectedIds.length - 1; index >= 0; index -= 1) {
    const shape = byId.get(selectedIds[index]);
    if (shape && !shape.locked) return shape;
  }
  return null;
}

/**
 * The frame the keys and the mouse move the selection in: the shape's own when moving along it and a shape gives axes,
 * the workplane otherwise.
 */
export function moveFrame<T extends ShapeTurn & { id: string; locked?: boolean }>(
  workplane: PlacementWorkplane,
  alongShape: boolean,
  selectedIds: readonly string[],
  shapes: readonly T[],
): PlacementWorkplane {
  if (!alongShape) return workplane;
  const shape = shapeGivingAxes(selectedIds, shapes);
  return shape ? shapeMoveWorkplane(shape, workplane) : workplane;
}
