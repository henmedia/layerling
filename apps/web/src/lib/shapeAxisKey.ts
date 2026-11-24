"use client";

import { useEffect, useSyncExternalStore } from "react";
import { pressedKey } from "@/lib/keyPressed";
import { isNonTextControl, isTypingTarget } from "@/lib/editorKeyTargets";

/**
 * J held: the selection moves along the shape's own axes instead of along the grid, or along the grid when the setting
 * "Move along the shape's own axes" makes the shape's axes normal. The one place that knows whether J is down; the
 * editor's keys, the viewport's drag and its handles all read it here.
 */
let held = false;
const listeners = new Set<() => void>();

export function shapeAxisKeyHeld(): boolean {
  return held;
}

export function setShapeAxisKeyHeld(next: boolean) {
  if (held === next) return;
  held = next;
  listeners.forEach((listener) => listener());
}

export function subscribeShapeAxisKey(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Whether J is held, for a component that redraws when it changes (the handles turn at once). */
export function useShapeAxisKeyHeld(): boolean {
  return useSyncExternalStore(subscribeShapeAxisKey, shapeAxisKeyHeld, () => false);
}

type KeyPress = { key?: string; code?: string; altKey?: boolean; ctrlKey?: boolean; metaKey?: boolean };

/**
 * Whether a key press is J. The letter on the key on a Latin keyboard (QWERTZ too), the key's place on Hebrew, Cyrillic,
 * Greek and Arabic ones (`pressedKey`). On a Mac, Option+J types "∆", no letter at all: with Alt the key's place counts too.
 */
export function isShapeAxisKey(event: KeyPress): boolean {
  const key = pressedKey(event);
  if (key === "j") return true;
  return Boolean(event.altKey) && !/^\p{L}$/u.test(key) && event.code === "KeyJ";
}

/**
 * Whether a J press starts the hold. Shift and Alt (the big and the small step) may be down; Ctrl may follow J but not
 * come first - Ctrl+J opens the browser's downloads.
 */
export function startsShapeAxisHold(event: KeyPress & { repeat?: boolean }): boolean {
  return !event.repeat && !event.ctrlKey && !event.metaKey && isShapeAxisKey(event);
}

/** Whether the keyboard writes into a field right now. */
const fieldHasKeys = () => isTypingTarget(document.activeElement) && !isNonTextControl(document.activeElement);

/**
 * Listens for J held. Its repeats are kept from anything else while held; letting go - the key that went down, matched
 * by its code, so a modifier changing what it reports does not matter - leaving the window or hiding the tab ends the
 * hold. A key of your own on J (Discussion #1399) takes the press first and stops it, so the hold never starts.
 */
export function useShapeAxisKey() {
  useEffect(() => {
    let heldCode: string | null = null;
    const onHeldKey = (event: KeyboardEvent) => {
      if (heldCode !== null && event.repeat && event.code === heldCode) event.preventDefault();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (!startsShapeAxisHold(event)) return;
      if (event.defaultPrevented || (isTypingTarget(event.target) && !isNonTextControl(event.target)) || fieldHasKeys()) return;
      heldCode = event.code || "KeyJ";
      setShapeAxisKeyHeld(true);
    };
    const release = () => {
      heldCode = null;
      setShapeAxisKeyHeld(false);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (heldCode === null) return;
      if (event.code === heldCode || (!event.code && isShapeAxisKey(event))) release();
    };
    const onVisibility = () => {
      if (document.hidden) release();
    };
    window.addEventListener("keydown", onHeldKey, true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp, true);
    window.addEventListener("blur", release);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("keydown", onHeldKey, true);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp, true);
      window.removeEventListener("blur", release);
      document.removeEventListener("visibilitychange", onVisibility);
      release();
    };
  }, []);
}
