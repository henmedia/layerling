"use client";

import { useEffect, useSyncExternalStore } from "react";
import { pressedKey } from "@/lib/keyPressed";
import { detailSnapshot, fullDetailSnapshot, setDetailPeek, subscribeDetail, type DetailFlags, type DetailView, type EditorDetail, type SketchDetail } from "@/lib/detailLevel";
import { isNonTextControl, isTypingTarget } from "@/lib/editorKeyTargets";

/** The detail level of a view, and which aids it draws right now. */
export function useDetailLevel(view: "editor"): { state: ReturnType<typeof detailSnapshot>["state"]; peeking: boolean; flags: DetailFlags<EditorDetail> };
export function useDetailLevel(view: "sketch"): { state: ReturnType<typeof detailSnapshot>["state"]; peeking: boolean; flags: DetailFlags<SketchDetail> };
export function useDetailLevel(view: DetailView): ReturnType<typeof detailSnapshot>;
export function useDetailLevel(view: DetailView) {
  return useSyncExternalStore(subscribeDetail, () => detailSnapshot(view), () => fullDetailSnapshot(view));
}

/** V held shows everything of the view; letting go, or leaving the window, puts it away again. */
export function useDetailPeekKey(view: DetailView) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (pressedKey(event) !== "v" || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      if (event.defaultPrevented || (isTypingTarget(event.target) && !isNonTextControl(event.target))) return;
      setDetailPeek(view, true);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (pressedKey(event) === "v") setDetailPeek(view, false);
    };
    const release = () => setDetailPeek(view, false);
    const onVisibility = () => {
      if (document.hidden) release();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", release);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", release);
      document.removeEventListener("visibilitychange", onVisibility);
      release();
    };
  }, [view]);
}
