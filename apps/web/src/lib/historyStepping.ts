/**
 * Stepping through the history view without the slider (#688): Page Up and
 * Page Down jump ten states, Home goes to the oldest and End to the state the
 * design is at; the mouse wheel over the bar goes one state per notch, up to
 * an earlier one.
 */

export const HISTORY_PAGE_STEPS = 10;

/** The state a key takes the history view to, or null when the key is not one of these. */
export function historyKeyTarget(key: string, index: number, max: number, liveIndex: number): number | null {
  const clampIndex = (value: number) => Math.min(max, Math.max(0, value));
  switch (key) {
    case "PageUp":
      return clampIndex(index - HISTORY_PAGE_STEPS);
    case "PageDown":
      return clampIndex(index + HISTORY_PAGE_STEPS);
    case "Home":
      return 0;
    case "End":
      return clampIndex(liveIndex);
    default:
      return null;
  }
}

/**
 * Wheel travel in pixels that makes one step on a touchpad, which sends many small
 * deltas. A mouse notch (about 100 px, or lines or pages) is one step on its own.
 */
const WHEEL_STEP_PIXELS = 50;

/**
 * Adds one wheel event to what is left over from the last ones and says how many
 * states to go: negative is earlier (wheel up), positive later.
 */
export function historyWheelSteps(carry: number, deltaY: number, deltaMode: number): { steps: number; carry: number } {
  if (deltaY === 0) return { steps: 0, carry };
  if (deltaMode !== 0 || Math.abs(deltaY) >= WHEEL_STEP_PIXELS) return { steps: Math.sign(deltaY), carry: 0 };
  const total = carry + deltaY;
  const steps = Math.trunc(total / WHEEL_STEP_PIXELS);
  return { steps, carry: total - steps * WHEEL_STEP_PIXELS };
}

/** Playing the history like a film (#1210): how long each state stays on screen, per speed. */
export const HISTORY_PLAY_DELAYS = { slow: 1500, normal: 700, fast: 250 } as const;
export type HistoryPlaySpeed = keyof typeof HISTORY_PLAY_DELAYS;

/** Playing forwards is +1, backwards -1; 0 is stopped. */
export type HistoryPlayDirection = -1 | 0 | 1;

/**
 * Where playing starts: from the state shown, but at the end of the way it goes
 * (the newest state forwards, the oldest backwards) it starts again from the
 * other end, so one press always shows something moving.
 */
export function historyPlayStart(index: number, max: number, direction: -1 | 1): number {
  if (direction > 0 && index >= max) return 0;
  if (direction < 0 && index <= 0) return max;
  return index;
}

/** The state after the one shown while playing, or null when the end is reached and playing stops. */
export function historyPlayNext(index: number, max: number, direction: HistoryPlayDirection): number | null {
  if (direction === 0) return null;
  const target = index + direction;
  return target < 0 || target > max ? null : target;
}
