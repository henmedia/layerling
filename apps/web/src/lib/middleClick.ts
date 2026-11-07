"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * A short click with the middle mouse button, told apart from the middle drag that moves the view (Discussion #1439).
 * The press may wander a few pixels, as a wheel gives a little when it is pushed, and may last a moment. A press that
 * goes further or is held longer was meant as a pan, even one that did not move, and opens nothing.
 */
export const MIDDLE_CLICK_PIXELS = 5;
export const MIDDLE_CLICK_MS = 600;

export type MiddlePress = { pointerId: number; x: number; y: number; at: number; wandered: boolean };

type PointerAt = { pointerId: number; clientX: number; clientY: number };

/** In a text field the middle button belongs to the text (pasting on Linux), not to the view. */
export function pressLandsInTextField(target: EventTarget | null): boolean {
  const element = target as Element | null;
  return Boolean(element?.closest?.("input, textarea, select, [contenteditable=''], [contenteditable='true']"));
}

/** The press has gone further than a click may. */
export function middlePressWandered(press: MiddlePress, pointer: PointerAt): boolean {
  return pointer.pointerId === press.pointerId && Math.hypot(pointer.clientX - press.x, pointer.clientY - press.y) > MIDDLE_CLICK_PIXELS;
}

/** The middle button let go close to where and soon after it was pressed, with no drag in between. */
export function isMiddleClick(press: MiddlePress | null, release: PointerAt & { button: number }, now: number): boolean {
  if (!press || release.button !== 1 || release.pointerId !== press.pointerId || press.wandered) return false;
  return !middlePressWandered(press, release) && now - press.at <= MIDDLE_CLICK_MS;
}

/**
 * Calls `onClick` with the place of a short middle click that starts on the element. The press is followed on the
 * window, since the view takes the pointer for its pan; the pan itself goes on as before. Whether a press lands on
 * the element is asked when it happens, so an element that is built anew (the sketch plate) keeps the click.
 */
export function useMiddleClick(targetRef: RefObject<Element | null>, onClick: (x: number, y: number) => void, enabled = true) {
  const onClickRef = useRef(onClick);
  onClickRef.current = onClick;
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const view = window;
    let press: MiddlePress | null = null;
    const down = (event: PointerEvent) => {
      const target = event.target as Node | null;
      const onElement = Boolean(target && targetRef.current?.contains(target));
      press = event.button === 1 && onElement && !pressLandsInTextField(event.target)
        ? { pointerId: event.pointerId, x: event.clientX, y: event.clientY, at: view.performance.now(), wandered: false }
        : null;
    };
    const move = (event: PointerEvent) => {
      if (press && middlePressWandered(press, event)) press.wandered = true;
    };
    const up = (event: PointerEvent) => {
      if (!press || event.pointerId !== press.pointerId) return;
      const clicked = isMiddleClick(press, event, view.performance.now());
      press = null;
      if (clicked) onClickRef.current(event.clientX, event.clientY);
    };
    const forget = () => {
      press = null;
    };
    view.addEventListener("pointerdown", down, true);
    view.addEventListener("pointermove", move, true);
    view.addEventListener("pointerup", up, true);
    view.addEventListener("pointercancel", forget, true);
    view.addEventListener("blur", forget);
    return () => {
      view.removeEventListener("pointerdown", down, true);
      view.removeEventListener("pointermove", move, true);
      view.removeEventListener("pointerup", up, true);
      view.removeEventListener("pointercancel", forget, true);
      view.removeEventListener("blur", forget);
    };
  }, [targetRef, enabled]);
}
