"use client";

import { useRef, useState } from "react";
import { applySettingsFile } from "@/lib/applySettingsFile";
import { t } from "@/lib/i18n";
import {
  buildSettingsFile,
  parseSettingsFile,
  readBrowserSettings,
  SETTINGS_FILE_MAX_BYTES,
  settingsFileName,
  settingsFileText,
} from "@/lib/settingsFile";
import { workspaceWithSavedDefault } from "@/lib/workplaneSettings";
import type { GridSize, WorkplaneWorkspaceSettings } from "@/types/layerling";

/**
 * "Export settings" and "Import settings" in the footer of the settings window (Discussion #1407): the settings go
 * into a file and come back from one, on another computer or after the browser lost its data. An imported file is
 * saved as this browser's default for new designs and put on the open design the way "Use my default" does.
 */
export function SettingsFileButtons({
  workspace,
  snap,
  onWorkspaceChange,
  onSnapChange,
}: {
  workspace: WorkplaneWorkspaceSettings;
  snap: GridSize;
  onWorkspaceChange: (next: WorkplaneWorkspaceSettings) => void;
  onSnapChange: (next: GridSize) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  const exportSettings = () => {
    const now = new Date();
    const file = buildSettingsFile(workspace, snap, readBrowserSettings(window.localStorage), now);
    const url = URL.createObjectURL(new Blob([settingsFileText(file)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = settingsFileName(now);
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    setMessage(t("workspace.exportSettingsDone"));
  };

  const importSettings = async (chosen: File | undefined) => {
    if (!chosen) return;
    const parsed = chosen.size > SETTINGS_FILE_MAX_BYTES ? null : parseSettingsFile(await chosen.text());
    if (!parsed) {
      setMessage(t("workspace.importSettingsFailed"));
      return;
    }
    applySettingsFile(parsed);
    const next = workspaceWithSavedDefault(workspace, parsed.workspace);
    onWorkspaceChange(next);
    if (next.units === workspace.units) onSnapChange(parsed.snap);
    setMessage(t("workspace.importSettingsDone"));
  };

  return (
    <>
      <button className="make-default-button" title={t("workspace.exportSettingsHint")} onClick={exportSettings}>
        {t("workspace.exportSettings")}
      </button>
      <button className="make-default-button" title={t("workspace.importSettingsHint")} onClick={() => input.current?.click()}>
        {t("workspace.importSettings")}
      </button>
      <input
        ref={input}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(event) => {
          const chosen = event.target.files?.[0];
          event.target.value = "";
          void importSettings(chosen);
        }}
      />
      {message ? (
        <span role="status" className="workspace-footer-hint" style={{ flexBasis: "100%", textAlign: "right" }}>
          {message}
        </span>
      ) : null}
    </>
  );
}
