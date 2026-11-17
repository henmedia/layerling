"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * Focus mode (Discussion #1554): the editor gives its title row and its footer to the work. On a small laptop screen
 * they take about a tenth of the height. The tabs, Home, the command search and the settings stay at hand in a small
 * bar over the view. It is switched on by a button, a key (Ctrl+Shift+F) or the command search, and comes by itself
 * while the browser fills the screen (F11). The browser's own full screen request is not used: there the browser keeps
 * Esc for itself, and Esc is what cancels a tool in layerling (Discussion #99).
 */

export const FOCUS_MODE_STORAGE_KEY = "layerling.editor.focusMode";
/** Tells the toolbar to measure its height again: the title row it counts in comes and goes. */
export const FOCUS_MODE_CHANGE_EVENT = "layerling:focus-mode-change";
export const FOCUS_MODE_SHORTCUT = "Ctrl+Shift+F";

/** Whether the key is the focus mode's: Ctrl+Shift+F, or Cmd+Shift+F on a Mac. */
export function isFocusModeKey(event: { key: string; code?: string; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean; altKey: boolean }) {
  if (!(event.ctrlKey || event.metaKey) || !event.shiftKey || event.altKey) return false;
  return event.key.toLowerCase() === "f" || event.code === "KeyF";
}

type ScreenLike = { width: number; height: number };
type WindowLike = { innerWidth: number; innerHeight: number; outerWidth?: number; screen?: ScreenLike | null; matchMedia?: (query: string) => { matches: boolean } };

/**
 * Whether the browser fills the screen by its own full screen, as F11 does. A maximised window still has the task bar
 * and the browser's own bars; one pixel of slack covers rounding.
 *
 * The page's size is counted in the screen's own pixels: the browser's zoom makes the page larger in its pixels while
 * the screen stays as it is, so a page zoomed out to 80 % looked as large as the screen and switched the mode on in an
 * ordinary window (Discussion #1738). The zoom is the window's outer width over the page's own.
 */
export function browserFillsScreen(win: WindowLike): boolean {
  try {
    if (win.matchMedia?.("(display-mode: fullscreen)").matches) return true;
  } catch {
    // An old browser without display-mode: the size decides.
  }
  const screen = win.screen;
  if (!screen || !(screen.width > 0) || !(screen.height > 0)) return false;
  const outer = win.outerWidth;
  const zoom = outer && outer > 0 && win.innerWidth > 0 && outer / win.innerWidth > 0.2 && outer / win.innerWidth < 5 ? outer / win.innerWidth : 1;
  return win.innerWidth * zoom >= screen.width - 1 && win.innerHeight * zoom >= screen.height - 1;
}

/** Shown when it was switched on, or while the browser fills the screen unless it was switched off in that full screen. */
export function focusModeShown(chosen: boolean, fullScreen: boolean, declinedInFullScreen: boolean) {
  return chosen || (fullScreen && !declinedInFullScreen);
}

function readChosen() {
  try {
    return window.localStorage.getItem(FOCUS_MODE_STORAGE_KEY) === "on";
  } catch {
    return false;
  }
}

function storeChosen(on: boolean) {
  try {
    if (on) window.localStorage.setItem(FOCUS_MODE_STORAGE_KEY, "on");
    else window.localStorage.removeItem(FOCUS_MODE_STORAGE_KEY);
  } catch {
    // Private windows and blocked storage: it still works for this visit.
  }
}

/**
 * The focus mode of the open editor: whether it shows, and `set` to switch it. The choice is kept in this browser.
 * While it shows, the page's root carries data-focus-mode="on", which takes the title row and the footer out of the
 * editor's measures; the attribute goes when the editor closes, so the start page keeps its own.
 */
export function useFocusMode() {
  const [chosen, setChosen] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  const [declined, setDeclined] = useState(false);

  useEffect(() => {
    setChosen(readChosen());
    const check = () => setFullScreen(browserFillsScreen(window));
    check();
    window.addEventListener("resize", check);
    let query: MediaQueryList | null = null;
    try {
      query = window.matchMedia("(display-mode: fullscreen)");
      query.addEventListener?.("change", check);
    } catch {
      query = null;
    }
    return () => {
      window.removeEventListener("resize", check);
      query?.removeEventListener?.("change", check);
    };
  }, []);

  // Leaving the full screen forgets that the mode was switched off in it: the next F11 brings it again.
  useEffect(() => {
    if (!fullScreen) setDeclined(false);
  }, [fullScreen]);

  const active = focusModeShown(chosen, fullScreen, declined);
  const activeRef = useRef(active);
  activeRef.current = active;
  const fullScreenRef = useRef(fullScreen);
  fullScreenRef.current = fullScreen;

  useLayoutEffect(() => {
    const root = document.documentElement;
    if (active) root.setAttribute("data-focus-mode", "on");
    else root.removeAttribute("data-focus-mode");
    window.dispatchEvent(new Event(FOCUS_MODE_CHANGE_EVENT));
  }, [active]);
  useLayoutEffect(() => () => {
    document.documentElement.removeAttribute("data-focus-mode");
    window.dispatchEvent(new Event(FOCUS_MODE_CHANGE_EVENT));
  }, []);

  /** Switches it on or off (left out: the other way), and says how it is now. */
  const set = useCallback((next?: boolean) => {
    const on = next ?? !activeRef.current;
    if (on) {
      setChosen(true);
      storeChosen(true);
      setDeclined(false);
    } else {
      setChosen(false);
      storeChosen(false);
      if (fullScreenRef.current) setDeclined(true);
    }
    return on;
  }, []);

  return { active, fullScreen, set };
}
