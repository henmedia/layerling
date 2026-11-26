/* What the shelf ledge of a hollowed box offers; no kernel in here, so the panel can use it. */

/** How thick the ledge is, in mm. */
export const SHELL_SHELF_RIB = 2;
export const SHELL_SHELF_MIN_WIDTH = 0.5;
export const SHELL_SHELF_MAX_WIDTH = 5;
export const DEFAULT_SHELL_SHELF_WIDTH = 1.5;
/** The height of the top of the ledge above the inside of the floor, in mm. */
export const SHELL_SHELF_MIN_HEIGHT = 4;
export const SHELL_SHELF_MAX_HEIGHT = 200;
export const DEFAULT_SHELL_SHELF_HEIGHT = 20;
/** The ledge keeps this far below the rim, in mm. */
export const SHELL_SHELF_RIM_GAP = 1;

/** With the slope underneath (#1981): the least height in mm of the straight front edge the slope starts from. */
export const SHELL_SHELF_SLOPE_FRONT = 0.5;

/**
 * How far in mm the ledge reaches down the wall from its top. Without the slope it is `SHELL_SHELF_RIB` everywhere.
 * With the slope its underside falls at 45 degrees from the front edge to the wall, so a wide ledge reaches further
 * down; a narrow one keeps a taller front edge, so it is never thinner at the wall than a ledge without the slope.
 */
export function shellShelfDrop(width: number, slope: boolean) {
  if (!slope) return SHELL_SHELF_RIB;
  return Math.max(SHELL_SHELF_RIB, SHELL_SHELF_SLOPE_FRONT + clampShellShelfWidth(width));
}

/** The width of the ledge kept to what is offered. */
export function clampShellShelfWidth(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_SHELL_SHELF_WIDTH;
  return Math.min(SHELL_SHELF_MAX_WIDTH, Math.max(SHELL_SHELF_MIN_WIDTH, Math.round(value * 10) / 10));
}

/** The height of the ledge kept to what is offered. */
export function clampShellShelfHeight(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_SHELL_SHELF_HEIGHT;
  return Math.min(SHELL_SHELF_MAX_HEIGHT, Math.max(SHELL_SHELF_MIN_HEIGHT, Math.round(value * 10) / 10));
}

/*
 * More ledges up the wall (Discussion #2065), say for the floors of a model railway building: the first lies where the
 * height says, each further one `spacing` higher. Each ledge above is `SHELL_SHELF_STEP` narrower than the one below
 * it, so the plate for a lower floor, cut to lie on its own ledge, still passes the ledges above it on its way in from
 * the open top.
 */
export const SHELL_SHELF_STEP = 1;
export const SHELL_SHELF_MAX_COUNT = 5;
/** How far in mm the top of one ledge lies above the top of the one below it. */
export const SHELL_SHELF_MIN_SPACING = 10;
export const SHELL_SHELF_MAX_SPACING = 200;
export const DEFAULT_SHELL_SHELF_SPACING = 40;

/** How many ledges a lowest ledge of this width leaves room for, each one above `SHELL_SHELF_STEP` narrower and none narrower than the least width. */
export function shellShelfMaxCount(width: number) {
  const steps = Math.floor((clampShellShelfWidth(width) - SHELL_SHELF_MIN_WIDTH) / SHELL_SHELF_STEP + 1e-6);
  return Math.min(SHELL_SHELF_MAX_COUNT, steps + 1);
}

/** The number of ledges kept to what a lowest ledge of `width` leaves room for; missing or nonsense is one. */
export function clampShellShelfCount(value: number | undefined, width: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 1;
  return Math.min(shellShelfMaxCount(width), Math.max(1, Math.round(value)));
}

/** The spacing of the ledges kept to what is offered. */
export function clampShellShelfSpacing(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_SHELL_SHELF_SPACING;
  return Math.min(SHELL_SHELF_MAX_SPACING, Math.max(SHELL_SHELF_MIN_SPACING, Math.round(value * 10) / 10));
}

/** Each ledge's width and the height of its top above the inside of the floor, from the lowest up. */
export function shellShelfLevels(width: number, height: number, count?: number, spacing?: number) {
  const lowest = clampShellShelfWidth(width);
  const first = clampShellShelfHeight(height);
  const gap = clampShellShelfSpacing(spacing);
  return Array.from({ length: clampShellShelfCount(count, lowest) }, (_, index) => ({
    width: Math.round((lowest - index * SHELL_SHELF_STEP) * 10) / 10,
    height: Math.round((first + index * gap) * 10) / 10,
  }));
}
