"use client";

import { ChevronLeft, ChevronRight, Crosshair, Cuboid, Home, Minus, Plus } from "lucide-react";
import { useState } from "react";
import { GridEyeIcon } from "@/components/GridEyeIcon";
import { t } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";

type SecondViewCameraBarProps = {
  orthographic: boolean;
  workplaneHidden: boolean;
  onHome: () => void;
  onFocusSelection: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleProjection: () => void;
  onToggleWorkplane: () => void;
};

/**
 * The camera bar of the second view's window: the buttons of the 3D view's bar that only move
 * the camera or change what it shows, and act on this window's view alone.
 */
export function SecondViewCameraBar(props: SecondViewCameraBarProps) {
  useLanguage();
  const { orthographic, workplaneHidden } = props;
  // Folded away as in the 3D view, and as there not kept for the next time the window opens.
  const [collapsed, setCollapsed] = useState(false);
  if (collapsed) {
    return (
      <div className="camera-controls collapsed" aria-label={t("camera.controls")}>
        <button type="button" className="camera-controls-toggle" aria-label={t("camera.show")} title={t("camera.showShort")} aria-expanded={false} onClick={() => setCollapsed(false)}>
          <ChevronRight size={24} strokeWidth={2.25} aria-hidden="true" />
        </button>
      </div>
    );
  }
  return (
    <div className="camera-controls" aria-label={t("camera.controls")}>
      <button type="button" className="camera-controls-toggle" aria-label={t("camera.hide")} title={t("camera.hideShort")} aria-expanded={true} onClick={() => setCollapsed(true)}>
        <ChevronLeft size={24} strokeWidth={2.25} aria-hidden="true" />
      </button>
      <button type="button" aria-label={t("camera.home")} aria-keyshortcuts="Home" title={t("camera.shortcut", { label: t("camera.home"), keys: "Home" })} onClick={props.onHome}>
        <Home size={24} strokeWidth={2.25} />
      </button>
      <button
        type="button"
        aria-label={t("camera.focusSelection")}
        aria-keyshortcuts="F Shift+F"
        title={t("camera.shortcut", { label: t("camera.focusSelection"), keys: "F" })}
        onClick={props.onFocusSelection}
      >
        <Crosshair size={24} strokeWidth={2.25} />
      </button>
      <button type="button" className="camera-zoom-button" aria-label={t("camera.zoomIn")} aria-keyshortcuts="+" title={t("camera.shortcut", { label: t("camera.zoomIn"), keys: "+" })} onClick={props.onZoomIn}>
        <Plus size={28} strokeWidth={2.15} />
      </button>
      <button type="button" className="camera-zoom-button" aria-label={t("camera.zoomOut")} aria-keyshortcuts="-" title={t("camera.shortcut", { label: t("camera.zoomOut"), keys: "−" })} onClick={props.onZoomOut}>
        <Minus size={28} strokeWidth={2.15} />
      </button>
      <button
        type="button"
        className={orthographic ? "active" : ""}
        aria-label={t("camera.orthographic")}
        aria-keyshortcuts="O"
        aria-pressed={orthographic}
        title={t("camera.shortcut", { label: orthographic ? t("camera.perspective") : t("camera.orthographic"), keys: "O" })}
        onClick={props.onToggleProjection}
      >
        <Cuboid size={24} strokeWidth={2.15} aria-hidden="true" />
      </button>
      <div className="workplane-display-control-group">
        <button
          type="button"
          className={workplaneHidden ? "active" : ""}
          aria-label={workplaneHidden ? t("camera.showWorkplane") : t("camera.hideWorkplane")}
          title={workplaneHidden ? t("camera.showWorkplane") : t("camera.hideWorkplane")}
          aria-pressed={workplaneHidden}
          onClick={props.onToggleWorkplane}
        >
          <GridEyeIcon size={25} strokeWidth={2.1} crossed={workplaneHidden} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
