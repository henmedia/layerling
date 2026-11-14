/* What the stacking of a hollowed box offers; no kernel in here, so the panel can use it. */

/** How much room the collar leaves in its groove on its inner side, in mm. */
export const SHELL_STACK_PLAY = 0.2;
/** How much deeper than the collar is high the groove goes, in mm. */
export const SHELL_STACK_EXTRA = 1;
/** The collar and the groove each take half the wall less half the play: at least this wide, in mm. */
export const SHELL_STACK_MIN_PART = 0.5;
export const SHELL_STACK_MIN_HEIGHT = 1;
export const SHELL_STACK_MAX_HEIGHT = 10;
export const DEFAULT_SHELL_STACK_HEIGHT = 3;

/** The thinnest wall that stacks: half of it less half the play must still be a collar that holds. */
export const SHELL_STACK_MIN_WALL = 2 * SHELL_STACK_MIN_PART + SHELL_STACK_PLAY;


/** The height of the collar kept to what is offered. */
export function clampShellStackHeight(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_SHELL_STACK_HEIGHT;
  return Math.min(SHELL_STACK_MAX_HEIGHT, Math.max(SHELL_STACK_MIN_HEIGHT, Math.round(value * 10) / 10));
}

