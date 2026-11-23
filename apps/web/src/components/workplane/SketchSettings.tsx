"use client";

import { useEffect, useState } from "react";
import { WorkspaceSettingsModal } from "./WorkspaceSettingsModal";
import type { AppThemePreference } from "@/lib/appTheme";
import { readStartView, writeStartView } from "@/lib/designView";
import { setDetail } from "@/lib/detailLevel";
import {
  MOVE_DIMENSIONS_ENABLED_STORAGE_KEY,
  ORIGIN_DIMENSIONS_ENABLED_STORAGE_KEY,
  readMoveDimensionsEnabled,
  readOriginDimensionsEnabled,
  readStartInPerspective,
  START_IN_PERSPECTIVE_STORAGE_KEY,
  writeEditorViewPreference,
} from "@/lib/editorViewPreferences";
import { setLengthUnit } from "@/lib/measurementUnits";
import { saveWorkspaceDefault } from "@/lib/workplaneSettings";
import type { GridSize, WorkplaneWorkspaceSettings } from "@/types/layerling";

/**
 * The settings window while a sketch is drawn (Discussion #1990). In 3D the 3D view holds it, and that is not there in a
 * sketch; here it changes the editor's settings directly, so the sketch takes new colours at once. What only a 3D view can
 * do - taking its view as the start view, putting the fit test on the plate - is left out.
 */
export function SketchSettings({ workspace, snap, themePreference, onThemePreferenceChange, onChange }: {
  workspace: WorkplaneWorkspaceSettings;
  snap: GridSize;
  themePreference: AppThemePreference;
  onThemePreferenceChange?: (preference: AppThemePreference) => void;
  /** Takes what changed; the rest stays as the editor has it, so two changes in a row do not undo each other. */
  onChange: (change: { workspace?: WorkplaneWorkspaceSettings; snap?: GridSize }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [moveDimensions, setMoveDimensions] = useState(readMoveDimensionsEnabled);
  const [originDimensions, setOriginDimensions] = useState(readOriginDimensionsEnabled);
  const [perspective, setPerspective] = useState(readStartInPerspective);
  const [hasStartView, setHasStartView] = useState(() => readStartView() !== null);

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener("layerling:open-workspace-settings", show);
    return () => window.removeEventListener("layerling:open-workspace-settings", show);
  }, []);

  // The sketch and the editor listen for keys on the window; while this is open, they must not draw or delete. On the
  // document, so that it holds wherever the focus is, and after the window's own fields have had the key.
  useEffect(() => {
    if (!open) return;
    const holdKeys = (event: KeyboardEvent) => {
      event.stopPropagation();
      if (event.key !== "Escape" || event.defaultPrevented) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      event.preventDefault();
      setOpen(false);
    };
    document.addEventListener("keydown", holdKeys);
    return () => document.removeEventListener("keydown", holdKeys);
  }, [open]);

  if (!open) return null;
  return (
    <WorkspaceSettingsModal
      workspace={workspace}
      snap={snap}
      themePreference={themePreference}
      moveDimensionsEnabled={moveDimensions}
      originDimensionsEnabled={originDimensions}
      startInPerspective={perspective}
      onWorkspaceChange={(next) => {
        // Something switched on here is wanted: the detail level does not keep it away.
        if (next.showAxes && !workspace.showAxes) setDetail("editor", "axes", true);
        if (next.showGrid && !workspace.showGrid) {
          setDetail("editor", "grid", true);
          setDetail("sketch", "grid", true);
        }
        if (next.showPlateLabels && !workspace.showPlateLabels) setDetail("editor", "plateLabels", true);
        if (next.dimensionsAlwaysVisible && !workspace.dimensionsAlwaysVisible) setDetail("editor", "dimensions", true);
        setLengthUnit(next);
        onChange({ workspace: next });
      }}
      onSnapChange={(next) => onChange({ snap: next })}
      onThemePreferenceChange={onThemePreferenceChange}
      onMoveDimensionsEnabledChange={(enabled) => {
        setMoveDimensions(enabled);
        writeEditorViewPreference(MOVE_DIMENSIONS_ENABLED_STORAGE_KEY, enabled);
        if (enabled) setDetail("editor", "distances", true);
      }}
      onOriginDimensionsEnabledChange={(enabled) => {
        setOriginDimensions(enabled);
        writeEditorViewPreference(ORIGIN_DIMENSIONS_ENABLED_STORAGE_KEY, enabled);
        if (enabled) setDetail("editor", "distances", true);
      }}
      onStartInPerspectiveChange={(on) => {
        setPerspective(on);
        writeEditorViewPreference(START_IN_PERSPECTIVE_STORAGE_KEY, on);
      }}
      hasStartView={hasStartView}
      onResetStartView={() => {
        writeStartView(null);
        setHasStartView(false);
      }}
      onMakeDefault={() => saveWorkspaceDefault(workspace, snap)}
      onClose={() => setOpen(false)}
    />
  );
}
