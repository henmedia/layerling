import { displayY } from "@/lib/displayAxes";

type PlanePoint = { x: number; z: number };

/**
 * How far the pointer has to travel, in screen pixels, before a pressed point follows it. A click is never
 * quite still: without this reach the smallest tremble sent the point to the pointer's place on the grid,
 * so a point lying off the grid moved a little each time it was only meant to be selected (Discussion #1801).
 */
export const SKETCH_POINT_DRAG_REACH = 4;

/** Whether a press on a point has become a drag: the pointer left the reach of a click. */
export function pointDragStarted(press: { x: number; y: number }, pointer: { x: number; y: number }, reach = SKETCH_POINT_DRAG_REACH) {
  return Math.hypot(pointer.x - press.x, pointer.y - press.y) > reach;
}

/**
 * What the small label beside a point under the pointer says: where the point lies from the sketch's origin, with the
 * numbers of the X and Y fields of a selected point - Y counts up the screen (#1064).
 */
export function pointCoordinateLabel(point: PlanePoint, names: { x: string; y: string }, format: (millimetres: number) => string) {
  return `${names.x} ${format(point.x)}  ${names.y} ${format(displayY(point.z))}`;
}

/** Where that label sits: up and to the right of the point, clear of the point and of the pointer on it. */
export function pointCoordinateLabelSpot(point: PlanePoint, pill: { width: number; height: number }, gap: number): PlanePoint {
  return { x: point.x + gap + pill.width / 2, z: point.z - gap - pill.height / 2 };
}
