import type { SketchProfile } from "@/types/layerling";

/** The plate never grows past this many workplanes, so a stray far point cannot fill the view with grid lines. */
const MAX_BOARD_FACTOR = 10;

/**
 * How large the sketch plate is drawn (#1177): the workplane at least, grown to hold every point, curve handle
 * and picture of the sketch with a margin, in whole steps of `step`, about the origin. A profile moved off the
 * workplane, for the wide radius of a revolve, then still lies on the grid and can be picked and dragged.
 */
export function sketchBoardSize(
  workspace: { width: number; depth: number },
  profile: Pick<SketchProfile, "points" | "images">,
  step: number,
) {
  let halfWidth = workspace.width / 2;
  let halfDepth = workspace.depth / 2;
  const margin = Math.max(step, Math.min(workspace.width, workspace.depth) / 10);
  const hold = (x: number, z: number, radius = 0) => {
    if (Number.isFinite(x)) halfWidth = Math.max(halfWidth, Math.abs(x) + radius + margin);
    if (Number.isFinite(z)) halfDepth = Math.max(halfDepth, Math.abs(z) + radius + margin);
  };
  for (const point of profile.points) {
    hold(point.x, point.z);
    if (point.handleIn) hold(point.handleIn.x, point.handleIn.z);
    if (point.handleOut) hold(point.handleOut.x, point.handleOut.z);
  }
  // A picture may be turned: its half diagonal holds it at any angle.
  for (const image of profile.images ?? []) hold(image.x, image.z, Math.hypot(image.width, image.depth) / 2);
  const whole = (half: number, workplaneHalf: number) => {
    if (half <= workplaneHalf) return workplaneHalf;
    const rounded = step > 0 ? Math.ceil(half / step) * step : half;
    return Math.min(rounded, workplaneHalf * MAX_BOARD_FACTOR);
  };
  return { width: 2 * whole(halfWidth, workspace.width / 2), depth: 2 * whole(halfDepth, workspace.depth / 2) };
}

/** As far out as the plate may grow: a typed position may take a profile there in one go. */
export function sketchFarthestReach(workspace: { width: number; depth: number }) {
  return { halfWidth: (workspace.width / 2) * MAX_BOARD_FACTOR, halfDepth: (workspace.depth / 2) * MAX_BOARD_FACTOR };
}

/** How far the view may zoom out: as far as before on the workplane, and further on a grown plate, so all of it fits. */
export function sketchMinZoom(workspace: { width: number; depth: number }, board: { width: number; depth: number }, workplaneMinZoom: number) {
  return workplaneMinZoom * Math.min(1, workspace.width / board.width, workspace.depth / board.depth);
}

/**
 * How far from the origin the pointer may set or drag a point: a workplane past the plate's edge, so one drag
 * can carry a profile out beyond it, and the plate grows to meet it once it is let go.
 */
export function sketchPointerReach(workspace: { width: number; depth: number }, board: { width: number; depth: number }) {
  return { halfWidth: (board.width + workspace.width) / 2, halfDepth: (board.depth + workspace.depth) / 2 };
}
