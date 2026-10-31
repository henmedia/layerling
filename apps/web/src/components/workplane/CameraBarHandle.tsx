"use client";

import { ChevronLeft, ChevronRight, GripHorizontal } from "lucide-react";
import { useRef } from "react";
import { t } from "@/lib/i18n";
import type { MovablePanelOptions, useMovablePanel } from "@/lib/useMovablePanel";

/**
 * The camera bar moves by its first button, which also folds it away: a click folds, a drag moves, a double click puts
 * the bar back where the stylesheet has it. It stays inside the editor area whole, so none of its buttons is lost.
 */
export const CAMERA_BAR_PANEL: MovablePanelOptions = {
  area: (panel) => panel.closest<HTMLElement>(".workplane-stage, .sketch-workspace-stage"),
  handleIgnores: "a, input, select, textarea",
  keepInside: true,
};

/** How far the pointer may wander over the fold button and still count as a click. */
const CLICK_SLOP = 4;

/**
 * One button for two jobs, in the 3D view and in a sketch alike. The handle takes the press; the click comes up to it
 * from the button too, so the keyboard folds the bar as well.
 */
export function CameraBarHandle({ move, collapsed, onToggle }: { move: ReturnType<typeof useMovablePanel>; collapsed: boolean; onToggle: () => void }) {
  const pressRef = useRef<{ x: number; y: number } | null>(null);
  return (
    <div
      className="camera-controls-handle"
      title={`${collapsed ? t("camera.showShort") : t("camera.hideShort")} - ${t("camera.moveHint")}`}
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
