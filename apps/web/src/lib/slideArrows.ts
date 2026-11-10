import type { PlacementWorkplane } from "@/lib/placementWorkplane";

/**
 * The red and the green arrow beside the black lift arrow (Discussion #1434): pulling one moves the
 * selection along X or along Y of the workplane only. The way is measured along a line, not on the
 * workplane, so a low view does not throw the body far away with a small move of the mouse.
 */
export type SlideAxis = "x" | "y";

export const SLIDE_AXES: readonly SlideAxis[] = ["x", "y"];

export const SLIDE_HANDLE_KEYS: Record<SlideAxis, string> = { x: "slide-x", y: "slide-y" };

export function slideAxisForHandle(handleKey: string): SlideAxis | null {
  if (handleKey === SLIDE_HANDLE_KEYS.x) return "x";
  if (handleKey === SLIDE_HANDLE_KEYS.y) return "y";
  return null;
}

/**
 * The direction an arrow points in, in the scene: X along the workplane's own X, Y along the
 * other axis of the workplane but towards the back, as the Y arrow at the corner of the plate (#182).
 */
export function slideAxisVector(workplane: PlacementWorkplane, axis: SlideAxis): { x: number; y: number; z: number } {
  if (axis === "x") return { x: workplane.xAxis.x, y: workplane.xAxis.y, z: workplane.xAxis.z };
  return { x: -workplane.zAxis.x, y: -workplane.zAxis.y, z: -workplane.zAxis.z };
}

/** Screen pixels between the middle of the top (where the height dot sits) and the tail of an arrow. */
export const SLIDE_ARROW_GAP = 16;
/** Length of an arrow on the screen, tail to tip. */
export const SLIDE_ARROW_LENGTH = 30;
/**
 * An axis that shows less than this share of its length on the screen points almost at the viewer.
 * Pulling its arrow would throw the body far for a small move again, so the arrow is left out.
 */
export const SLIDE_ARROW_MIN_FORESHORTENING = 0.3;
/** Two arrows closer than this on the screen: the later one points the other way. */
export const SLIDE_ARROW_MIN_SEPARATION_DEGREES = 35;

export type SlideArrowDirection = {
  axis: SlideAxis;
  /** Where the axis points on the screen, any length. */
  dx: number;
  dy: number;
  /** Screen length of a step along the axis divided by that of the same step across the view (0 to about 1). */
  foreshortening: number;
};

export type SlideArrowPlacement = {
  axis: SlideAxis;
  /** Middle of the arrow on the screen. */
  x: number;
  y: number;
  /** Where the tip points, in degrees on the screen (0 = right, 90 = down). */
  angle: number;
  /** The arrow points against the axis, out of the way of another arrow; the move is the same. */
  flipped: boolean;
};

const angleBetween = (a: { x: number; y: number }, b: { x: number; y: number }) => {
  const cos = (a.x * b.x + a.y * b.y) / (Math.hypot(a.x, a.y) * Math.hypot(b.x, b.y));
  return (Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI;
};

/**
 * Where the arrows stand on the screen, around `base` (the projected middle of the top): each a
 * fixed number of pixels out along the way its axis runs on the screen. An axis seen end on gets
 * no arrow; one that would lie on the lift arrow or on the other arrow points the other way.
 */
export function slideArrowLayout(
  base: { x: number; y: number },
  directions: SlideArrowDirection[],
  liftDirection: { x: number; y: number } | null,
): SlideArrowPlacement[] {
  const taken: { x: number; y: number }[] = [];
  if (liftDirection && Math.hypot(liftDirection.x, liftDirection.y) > 1e-9) taken.push(liftDirection);
  const placements: SlideArrowPlacement[] = [];
  directions.forEach((direction) => {
    const length = Math.hypot(direction.dx, direction.dy);
    if (!(direction.foreshortening >= SLIDE_ARROW_MIN_FORESHORTENING) || !(length > 1e-9)) return;
    const along = { x: direction.dx / length, y: direction.dy / length };
    const against = { x: -along.x, y: -along.y };
    const nearest = (unit: { x: number; y: number }) => Math.min(180, ...taken.map((other) => angleBetween(unit, other)));
    const flipped = nearest(along) < SLIDE_ARROW_MIN_SEPARATION_DEGREES && nearest(against) > nearest(along);
    const unit = flipped ? against : along;
    taken.push(unit);
    const reach = SLIDE_ARROW_GAP + SLIDE_ARROW_LENGTH / 2;
    placements.push({
      axis: direction.axis,
      x: base.x + unit.x * reach,
      y: base.y + unit.y * reach,
      angle: (Math.atan2(unit.y, unit.x) * 180) / Math.PI,
      flipped,
    });
  });
  return placements;
}
