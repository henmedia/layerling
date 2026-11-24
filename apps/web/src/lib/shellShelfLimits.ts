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
