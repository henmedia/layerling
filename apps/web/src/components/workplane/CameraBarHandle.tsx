"use client";

import { ChevronLeft, ChevronRight, GripHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { t } from "@/lib/i18n";
import type { MovablePanelOptions, useMovablePanel } from "@/lib/useMovablePanel";

/**
 * The view bar (once the camera bar) moves by its first button, which also folds it away: a click folds, a drag moves, a double click puts
 * the bar back where the stylesheet has it. It stays inside the editor area whole, so none of its buttons is lost.
 */
export const CAMERA_BAR_PANEL: MovablePanelOptions = {
  area: (panel) => panel.closest<HTMLElement>(".workplane-stage, .sketch-workspace-stage"),
  handleIgnores: "a, input, select, textarea",
  keepInside: true,
};

/** How far the pointer may wander over the fold button and still count as a click. */
const CLICK_SLOP = 4;

/** How long the pointer may be off a bar opened by hovering before it folds again, so a short slip does not fold it. */
const PEEK_FOLD_DELAY_MS = 400;

/**
 * "Open the view bar on hover" (Discussion #1552): a folded bar opens while the mouse is over its arrow and folds again
 * once the mouse has left it. A click on the arrow meanwhile keeps it open, as a click on a folded bar always did. It
 * stays open while `keepOpen` says one of its tools is in use. Mouse only: a touch or a pen opens it with a tap as before.
 */
export function useCameraBarPeek(options: { enabled: boolean; collapsed: boolean; onOpen: () => void; onFold: () => void; keepOpen?: () => boolean }) {
  const [peeking, setPeeking] = useState(false);
  const peekingRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const clearTimer = () => {
    if (timerRef.current === null) return;
    window.clearTimeout(timerRef.current);
    timerRef.current = null;
  };
  const setPeek = (next: boolean) => {
    peekingRef.current = next;
    setPeeking(next);
  };
  useEffect(() => clearTimer, []);
  // Switched off, or folded some other way (the arrow, a key): nothing left to fold.
  useEffect(() => {
    if (options.enabled && !options.collapsed) return;
    clearTimer();
    if (peekingRef.current) setPeek(false);
  }, [options.enabled, options.collapsed]);
  const onPointerEnter = (event: ReactPointerEvent) => {
    clearTimer();
    const current = optionsRef.current;
    if (!current.enabled || !current.collapsed || event.pointerType !== "mouse" || event.buttons !== 0) return;
    setPeek(true);
    current.onOpen();
  };
  const onPointerLeave = (event: ReactPointerEvent) => {
    if (!peekingRef.current || event.pointerType !== "mouse") return;
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      const current = optionsRef.current;
      if (!peekingRef.current || current.keepOpen?.()) return;
      setPeek(false);
      current.onFold();
    }, PEEK_FOLD_DELAY_MS);
  };
  /** The arrow's click: on a bar opened by hovering it keeps the bar open; otherwise it folds or opens as before. */
  const toggle = (otherwise: () => void) => {
    if (!peekingRef.current) {
      otherwise();
      return;
    }
    clearTimer();
    setPeek(false);
  };
  return { peeking, barProps: { onPointerEnter, onPointerLeave }, toggle };
}

/**
 * One button for two jobs, in the 3D view and in a sketch alike. The handle takes the press; the click comes up to it
 * from the button too, so the keyboard folds the bar as well.
 */
export function CameraBarHandle({ move, collapsed, onToggle }: { move: ReturnType<typeof useMovablePanel>; collapsed: boolean; onToggle: () => void }) {  const pressRef = useRef<{ x: number; y: number } | null>(null);
  return (
    <div
      className="camera-controls-handle"
      // The bar's name, so the word the guide and the forum use can be found in the editor (#1080).
      title={`${t("camera.controls")}: ${collapsed ? t("camera.showShort") : t("camera.hideShort")} - ${t("camera.moveHint")}`}
      {...move.handleProps}
      onPointerDownCapture={(event) => { pressRef.current = { x: event.clientX, y: event.clientY }; }}
      onClick={(event) => {
        const press = pressRef.current;
        pressRef.current = null;
        if (press && Math.hypot(event.clientX - press.x, event.clientY - press.y) > CLICK_SLOP) return;
        onToggle();
      }}
    >
      <button className="camera-controls-toggle" type="button" aria-label={collapsed ? t("camera.show") : t("camera.hide")} aria-expanded={!collapsed}>
        <GripHorizontal size={14} strokeWidth={2.4} aria-hidden="true" />
        {collapsed ? <ChevronRight size={22} strokeWidth={2.25} aria-hidden="true" /> : <ChevronLeft size={22} strokeWidth={2.25} aria-hidden="true" />}
      </button>
    </div>
  );
}
