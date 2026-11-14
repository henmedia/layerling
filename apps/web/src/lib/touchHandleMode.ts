/**
 * Which handles a finger can reach on a touch screen (Discussion #1747). Around a selection the size
 * handles, the turn arrows, the lift arrow and the slide arrows lie close together, and the part itself
 * moves when a finger lands on it, so a finger easily does something else than meant. On a touch
 * device the camera bar picks one of them: everything as with the mouse, or only moving, only the size
 * or only turning. The others are hidden, and outside moving a finger on the part only selects it.
 */
import type { TransformHandleKind } from "@/components/workplane/transformOverlayTypes";

export type TouchHandleMode = "all" | "move" | "size" | "turn";

/** In the order the camera bar button goes through them. */
export const TOUCH_HANDLE_MODES: readonly TouchHandleMode[] = ["all", "move", "size", "turn"];

const STORAGE_KEY = "layerling.touchHandleMode";

export function nextTouchHandleMode(mode: TouchHandleMode): TouchHandleMode {
  return TOUCH_HANDLE_MODES[(TOUCH_HANDLE_MODES.indexOf(mode) + 1) % TOUCH_HANDLE_MODES.length];
}

/** Whether a handle of this kind shows in the mode: the lift and slide arrows move, the size and height handles size, the arrows around turn. */
export function touchModeShowsHandle(mode: TouchHandleMode, kind: TransformHandleKind): boolean {
  if (mode === "all") return true;
  if (mode === "move") return kind === "lift" || kind === "slide";
  if (mode === "size") return kind === "scale" || kind === "height";
  return kind === "rotate";
}

/** Whether a finger dragged on the part itself moves it. */
export function touchModeMovesBody(mode: TouchHandleMode): boolean {
  return mode === "all" || mode === "move";
}

export function isTouchHandleMode(value: unknown): value is TouchHandleMode {
  return typeof value === "string" && (TOUCH_HANDLE_MODES as readonly string[]).includes(value);
}

/** The mode this browser used last; "all" when none is kept or storage is shut. */
export function loadTouchHandleMode(): TouchHandleMode {
  try {
    const kept = window.localStorage.getItem(STORAGE_KEY);
    return isTouchHandleMode(kept) ? kept : "all";
  } catch {
    return "all";
  }
}

export function saveTouchHandleMode(mode: TouchHandleMode) {
  try {
    if (mode === "all") window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // A private window keeps no setting; the mode lasts until the page closes.
  }
}
