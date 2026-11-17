/** A move the arrow keys ask for: along the workplane (x right, z towards the viewer) and up from it. */
export type KeyNudge = { x: number; z: number; rise: number };

type Scheduler = { schedule: (run: () => void) => number; cancel: (handle: number) => void };

const frameScheduler: Scheduler = {
  schedule: (run) => requestAnimationFrame(run),
  cancel: (handle) => cancelAnimationFrame(handle),
};

/**
 * A held arrow key repeats about 30 times a second. Each press is a whole step
 * (the shapes, the history, the view drawn again), and on a slower computer a
 * step can take longer than the gap to the next repeat: the presses then queue
 * up, the body falls behind the key and goes on moving after it is let go
 * (#1042). So the repeats are added up and moved once a frame, by their sum. A
 * fresh press moves at once, as it always did, and `flush` hands over what is
 * left when the key comes up.
 */
/**
 * `live` tells `apply` the move belongs to a held key that is still going: only
 * the first press of a run and the last move before the key comes up are
 * committed to the history, the moves in between just show on the screen.
 */
export function createKeyRepeatBatch(apply: (nudge: KeyNudge, live: boolean) => void, scheduler: Scheduler = frameScheduler) {
  let pending: KeyNudge | null = null;
  let handle: number | null = null;

  const flush = () => {
    if (handle !== null) {
      scheduler.cancel(handle);
      handle = null;
    }
    const nudge = pending;
    pending = null;
    if (nudge && (nudge.x || nudge.z || nudge.rise)) apply(nudge, true);
  };

  const add = (nudge: KeyNudge, repeat: boolean) => {
    if (!repeat) {
      flush();
      apply(nudge, false);
      return;
    }
    pending = pending
      ? { x: pending.x + nudge.x, z: pending.z + nudge.z, rise: pending.rise + nudge.rise }
      : { ...nudge };
    if (handle === null) {
      handle = scheduler.schedule(() => {
        handle = null;
        flush();
      });
    }
  };

  /** Drops what is waiting, for an editor that goes away. */
  const cancel = () => {
    if (handle !== null) scheduler.cancel(handle);
    handle = null;
    pending = null;
  };

  return { add, flush, cancel };
}
