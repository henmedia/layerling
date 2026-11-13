"use client";

import { GripVertical, Minimize2, Search } from "lucide-react";
import type { ReactNode } from "react";
import { GuideHelpLink } from "@/components/GuideHelpLink";
import { t } from "@/lib/i18n";
import { FOCUS_MODE_SHORTCUT } from "@/lib/focusMode";
import { useMovablePanel, type MovablePanelOptions } from "@/lib/useMovablePanel";
import { ToolbarHomeIcon, ToolbarSettingsIcon } from "../icons";

/**
 * In focus mode (Discussion #1554) the title row and the footer give their room to the work, and what of them is
 * needed while designing comes along in this small bar over the view: Home, the 3D editor and Sketch tabs, the command
 * search, the settings, and the way back; and the design's name, so a new design can be named without leaving focus mode
 * (Discussion #1678). It hangs below the ribbon in the middle; its grip moves it anywhere in the
 * editor, a double click on the grip puts it back.
 */
const FOCUS_BAR_PANEL: MovablePanelOptions = {
  area: (panel) => panel.closest<HTMLElement>(".layerling-editor"),
  below: (panel) => panel.closest<HTMLElement>(".secondary-toolbar"),
  keepInside: true,
  // Docked, the stylesheet centres it by its margins; moved, it stands where it was dropped.
  floatingStyle: { right: "auto", margin: 0 },
};

export function FocusModeBar({
  toolbarMode,
  sketchDisabled,
  onSelectMode,
  onHome,
  homeDisabled,
  onSearch,
  onSettings,
  onLeave,
  showSearch,
  nameField,
}: {
  toolbarMode: "geometry" | "sketch";
  sketchDisabled: boolean;
  onSelectMode: (mode: "geometry" | "sketch") => void;
  onHome?: () => void;
  homeDisabled: boolean;
  onSearch: () => void;
  onSettings: () => void;
  onLeave: () => void;
  showSearch: boolean;
  /** The design's name, editable as in the title row. */
  nameField?: ReactNode;
}) {
  const move = useMovablePanel<HTMLDivElement>("layerling.editor.focusBarPosition", FOCUS_BAR_PANEL);
  return (
    <div
      ref={move.panelRef}
      className={`focus-mode-bar ${move.moved ? "moved" : ""} ${move.dragging ? "moving" : ""}`}
      style={move.style}
      role="toolbar"
      aria-label={t("focusMode.bar")}
      data-help-exempt
    >
      <span className="focus-mode-bar-grip movable" title={t("panel.moveHint")} aria-hidden="true" {...move.handleProps}>
        <GripVertical size={16} />
      </span>
      {onHome ? (
        <button
          className="action-icon-button editor-home-control"
          type="button"
          aria-label={t("editor.homeDashboard")}
          title={t("editor.homeDashboard")}
          disabled={homeDisabled}
          onClick={onHome}
        >
          <ToolbarHomeIcon />
        </button>
      ) : null}
      <div className="toolbar-workspace-tabs focus-mode-bar-tabs" role="tablist" aria-label={t("editor.modeLabel")}>
        <button
          className={toolbarMode === "geometry" ? "active" : ""}
          type="button"
          role="tab"
          aria-selected={toolbarMode === "geometry"}
          onClick={() => onSelectMode("geometry")}
        >
          {t("editor.modeGeometry")}
        </button>
        <button
          className={toolbarMode === "sketch" ? "active" : ""}
          type="button"
          role="tab"
          aria-selected={toolbarMode === "sketch"}
          disabled={sketchDisabled}
          onClick={() => onSelectMode("sketch")}
        >
          {t("editor.modeSketch")}
        </button>
      </div>
      {nameField}
      {showSearch ? (
        <button className="action-icon-button" type="button" aria-label={t("palette.open")} title={t("palette.open")} aria-haspopup="dialog" onClick={onSearch}>
          <Search className="toolbar-search-icon" aria-hidden="true" />
        </button>
      ) : null}
      <button className="action-icon-button" type="button" aria-label={t("editor.workspaceSettings")} title={t("editor.workspaceSettings")} onClick={onSettings}>
        <ToolbarSettingsIcon />
      </button>
      <GuideHelpLink section="focusMode" iconSize={17} />
      <button
        className="action-icon-button focus-mode-leave"
        type="button"
        aria-label={t("focusMode.leave")}
        title={`${t("focusMode.leave")} (${FOCUS_MODE_SHORTCUT})`}
        onClick={onLeave}
      >
        <Minimize2 size={17} aria-hidden="true" />
      </button>
    </div>
  );
}
