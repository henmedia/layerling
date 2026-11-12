/*
 * "Ask before closing the tab" (a setting, off by default) puts the browser's own "Leave site?" question in the way of
 * a closed or reloaded tab. A reload layerling starts itself - after "Save and reload" for a new version - must not
 * run into it, so those places release the guard first.
 */
let released = false;

export function releaseLeaveGuard() {
  released = true;
}

export function leaveGuardReleased() {
  return released;
}

/**
 * Whether designs are still being written to the browser, and whether one could not be (#1639). The start page tells
 * it; a reload layerling starts itself asks first, so "Save and reload" waits for the save it asked for and does not
 * throw away a design the browser refused to store.
 */
export type DesignSaveState = { saving: boolean; unsaved: boolean };

let saveState: () => DesignSaveState = () => ({ saving: false, unsaved: false });

export function provideDesignSaveState(read: () => DesignSaveState) {
  saveState = read;
}

export function designSaveState(): DesignSaveState {
  return saveState();
}

/** How long "Save and reload" waits at least, so the save it asked for has been queued, and at most. */
export const SAVE_SETTLE_MIN_MS = 800;
export const SAVE_SETTLE_MAX_MS = 30000;
const SAVE_SETTLE_POLL_MS = 200;

/**
 * Waits until no design is being written any more (or the longest wait is over), then says whether every design is
 * stored: false while one is not, or still being written after the wait.
 */
export async function designsSettled(
  read: () => DesignSaveState = designSaveState,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  minMs = SAVE_SETTLE_MIN_MS,
  maxMs = SAVE_SETTLE_MAX_MS,
): Promise<boolean> {
  await sleep(minMs);
  let waited = minMs;
  while (read().saving && waited < maxMs) {
    await sleep(SAVE_SETTLE_POLL_MS);
    waited += SAVE_SETTLE_POLL_MS;
  }
  const state = read();
  return !state.saving && !state.unsaved;
}
