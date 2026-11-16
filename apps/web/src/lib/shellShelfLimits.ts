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
