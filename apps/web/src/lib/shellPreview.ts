/**
 * The Hollow panel's preview (Discussion #1811): the body is shown hollowed while the panel is open, and follows the
 * wall, the open sides and the rest a moment after they change.
 *
 * The CAD worker hollows one body after another and cannot be called off, so the panel keeps at most one hollowing at
 * work. What is asked for meanwhile waits, and only the newest of it is ever built - the same idea as the edge tool's
 * queue (lib/cadPreviewQueue.ts), here for whole jobs that prepare a body and then hollow it. Apply asks through the
 * same runner: settings the preview has built already are laid in at once, and a hollowing still at work for them is
 * waited for instead of started a second time.
 */

/** The settings of the Hollow panel that decide what the hollowed body looks like. */
export type ShellPreviewSettings = {
  thickness: number;
  openings: unknown;
  edges: string;
  stack?: number;
  stackFoot?: unknown;
  gridCells?: number;
  gridFit?: boolean;
  gridMagnets?: boolean;
  gridColumns?: number;
  gridRows?: number;
  dividers?: unknown;
  shelf?: number;
  shelfHeight?: number;
};

/**
 * One text for a body (its fingerprint) hollowed with these settings: the same text means the same result. What the
 * panel only shows about itself (busy, an error) is not part of it.
 */
export function shellPreviewKey(fingerprint: string, settings: ShellPreviewSettings): string {
  return JSON.stringify([
    fingerprint,
    settings.thickness,
    settings.openings,
    settings.edges,
    settings.stack ?? 0,
    settings.stackFoot ?? null,
    settings.gridCells ?? 0,
    settings.gridFit === true,
    settings.gridMagnets === true,
    settings.gridColumns ?? 0,
    settings.gridRows ?? 0,
    settings.dividers ?? null,
    settings.shelf ?? 0,
    settings.shelfHeight ?? null,
  ]);
}

export type LatestJobRunner<T> = {
  /** Whether a job is at work right now. */
  readonly working: boolean;
  /**
   * The result for `key`: the one built last if it was built for this key, the job at work if it builds this key, or a
   * new job - started at once, or when the job at work has come back. A request that a newer one overtakes while it
   * waits gives null. A job that failed fails again for the same key without being run again, unless `retryFailed`.
   */
  request: (key: string, make: () => Promise<T>, options?: { retryFailed?: boolean }) => Promise<T | null>;
  /** Drops what waits and comes back when the job at work has come back, however it ended. */
  settled: () => Promise<void>;
  /** Forgets the last result and what waits; a job still at work is let finish, and its result is not kept. */
  reset: () => void;
};

export function createLatestJobRunner<T>(): LatestJobRunner<T> {
  let generation = 0;
  let running: { key: string; promise: Promise<T> } | null = null;
  let last: { key: string; ok: true; value: T } | { key: string; ok: false; error: unknown } | null = null;
  let waiting: { start: () => void; drop: () => void } | null = null;

  const dropWaiting = () => {
    const dropped = waiting;
    waiting = null;
    dropped?.drop();
  };

  const start = (key: string, make: () => Promise<T>): Promise<T> => {
    const startedIn = generation;
    let promise: Promise<T>;
    try {
      promise = make();
    } catch (error) {
      promise = Promise.reject(error);
    }
    const job = { key, promise };
    running = job;
    const done = (result: { ok: true; value: T } | { ok: false; error: unknown }) => {
      if (startedIn === generation) last = { key, ...result };
      if (running === job) running = null;
      const next = waiting;
      waiting = null;
      next?.start();
    };
    promise.then((value) => done({ ok: true, value }), (error: unknown) => done({ ok: false, error }));
    return promise;
  };

  return {
    get working() {
      return running !== null;
    },
    request(key, make, options) {
      dropWaiting();
      if (running?.key === key) return running.promise;
      if (last?.key === key) {
        if (last.ok) return Promise.resolve(last.value);
        if (!options?.retryFailed) return Promise.reject(last.error);
      }
      if (!running) return start(key, make);
      return new Promise<T | null>((resolve, reject) => {
        waiting = {
          start: () => start(key, make).then(resolve, reject),
          drop: () => resolve(null),
        };
      });
    },
    settled() {
      dropWaiting();
      return running ? running.promise.then(() => undefined, () => undefined) : Promise.resolve();
    },
    reset() {
      generation += 1;
      last = null;
      dropWaiting();
    },
  };
}
