import { useSyncExternalStore } from "react";
import { setVaseDraftBuild, type VaseSettings } from "@/lib/vaseSettings";
import { vaseShapePatch, vaseShapePatchOffThread } from "@/lib/vaseShape";

/**
 * Changing a vase from its panel so that it follows the hand.
 *
 * A relief vase has a few hundred thousand triangles; building it takes a few tenths of a second, and so does making
 * it ready to draw and to pick. Two things made dragging a slider feel stuck:
 *
 * - The panel showed the vase's value, and that changed only once a body was built. While the slider was dragged, a
 *   newer change always overtook the one being built, so nothing was handed on and the slider's knob stood still.
 *   Now the panel shows what was asked for last (usePendingVase), at once.
 * - Every step was built in the vase's own detail. Now, while a value is held (a slider dragged, a number being
 *   typed) and has been changed, the body is built coarse, as the Draft detail builds it, and each body that gets done
 *   is shown; when the hold is over, the last change is built once more in the vase's own detail.
 *
 * The vase's settings are not touched by the coarse build (see setVaseDraftBuild): nothing coarse can be saved,
 * undone to or exported.
 */

type Frame = { id?: string; width: number; depth: number; height: number };
type Patch = ReturnType<typeof vaseShapePatch>;

/** Per vase (its shape's id): the settings asked for last that are not on the vase yet. */
const pending = new Map<string, VaseSettings>();
const listeners = new Set<() => void>();

function tell() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The settings a vase's panel shows while a change is on its way: what was asked for last, or null. */
export function usePendingVase(id: string | undefined): VaseSettings | null {
  return useSyncExternalStore(subscribe, () => (id === undefined ? null : pending.get(id) ?? null), () => null);
}

/** The vase held just now, whether it was changed in the hold, and its last change. */
let heldId: string | null = null;
let coarse = false;
let last: { frame: Frame; vase: VaseSettings; onUpdate: (patch: Patch) => void } | null = null;
let watchdog: ReturnType<typeof setTimeout> | null = null;

/** A hold that is never let go (a lost event) must not leave a vase coarse: it ends by itself. */
const HOLD_LIMIT_MS = 20000;
/** How long the end of a hold waits for the full body before the vase is built here instead. */
const FULL_BUILD_LIMIT_MS = 8000;

function stopWatchdog() {
  if (watchdog !== null) clearTimeout(watchdog);
  watchdog = null;
}

function watch() {
  stopWatchdog();
  watchdog = setTimeout(() => endVaseDraft(() => {}), HOLD_LIMIT_MS);
}

/** A value of this vase is taken hold of. */
export function beginVaseDraft(id: string) {
  if (heldId !== null && heldId !== id) endVaseDraft(() => {});
  heldId = id;
  watch();
}

/**
 * The hold is over: the last change made during it is built in the vase's own detail, and `released` is called once
 * that is on the vase (at once where nothing was changed). The editor counts the hold as over only then, so the
 * coarse steps and the full body are one step to undo.
 */
export function endVaseDraft(released: () => void) {
  stopWatchdog();
  const id = heldId;
  const change = last;
  const wasCoarse = coarse;
  heldId = null;
  coarse = false;
  last = null;
  if (id === null || !wasCoarse || !change) {
    if (id !== null) setVaseDraftBuild(id, false);
    released();
    return;
  }
  let finished = false;
  let limit: ReturnType<typeof setTimeout> | null = null;
  const fine = () => setVaseDraftBuild(id, false);
  const settle = () => {
    // The change is on the vase now: the panel shows the vase again.
    if (pending.get(id) === change.vase) pending.delete(id);
    tell();
  };
  const finish = () => {
    if (finished) return;
    finished = true;
    if (limit !== null) clearTimeout(limit);
    released();
  };
  // The body stays the coarse one until the full one is there: drawn in between, the vase would be built in full
  // here, on the thread the editor runs on.
  limit = setTimeout(() => {
    if (finished) return;
    fine();
    change.onUpdate(vaseShapePatch(change.frame, change.vase));
    settle();
    finish();
  }, FULL_BUILD_LIMIT_MS);
  vaseShapePatchOffThread(change.frame, change.vase, (patch) => {
    if (finished) return;
    change.onUpdate(patch);
    settle();
    finish();
  }, { full: true, beforeApply: fine });
}

/**
 * New settings for a vase from its panel: the panel shows them at once, the body is built off the main thread and
 * handed to `onUpdate` when it is there.
 */
export function applyVaseChange(frame: Frame, vase: VaseSettings, onUpdate: (patch: Patch) => void) {
  const id = frame.id;
  const held = id !== undefined && id === heldId;
  if (held) {
    if (!coarse) {
      coarse = true;
      setVaseDraftBuild(id, true);
    }
    last = { frame, vase, onUpdate };
    watch();
  }
  if (id !== undefined) {
    pending.set(id, vase);
    tell();
  }
  vaseShapePatchOffThread(frame, vase, (patch) => {
    // The newest change is on the vase: the panel shows the vase again.
    if (id !== undefined && pending.get(id) === vase) pending.delete(id);
    onUpdate(patch);
    if (id !== undefined) tell();
  }, { steps: held });
}
