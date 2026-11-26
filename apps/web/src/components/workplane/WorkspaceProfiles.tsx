"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { t } from "@/lib/i18n";
import { workspaceWithSavedDefault } from "@/lib/workplaneSettings";
import {
  MAX_WORKSPACE_PROFILE_NAME,
  MAX_WORKSPACE_PROFILES,
  normalizeWorkspaceProfileName,
  readWorkspaceProfiles,
  withWorkspaceProfile,
  writeWorkspaceProfiles,
  type WorkspaceProfile,
} from "@/lib/workspaceProfiles";
import type { GridSize, WorkplaneWorkspaceSettings } from "@/types/layerling";

function browserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** The row of named profiles above the footer of the settings window (#850). */
export function WorkspaceProfiles({
  workspace,
  snap,
  suggestedName,
  onWorkspaceChange,
  onSnapChange,
}: {
  workspace: WorkplaneWorkspaceSettings;
  snap: GridSize;
  /** The printer's name, when one is chosen. */
  suggestedName: string | null;
  onWorkspaceChange: (next: WorkplaneWorkspaceSettings) => void;
  onSnapChange: (next: GridSize) => void;
}) {
  const [profiles, setProfiles] = useState<WorkspaceProfile[]>([]);
  const [chosen, setChosen] = useState("");
  const [naming, setNaming] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => setProfiles(readWorkspaceProfiles(browserStorage())), []);

  const keep = (next: WorkspaceProfile[]) => {
    if (!writeWorkspaceProfiles(next, browserStorage())) {
      setMessage(t("selectionSets.notKept"));
      return false;
    }
    setProfiles(next);
    return true;
  };
  const apply = (name: string) => {
    const profile = profiles.find((entry) => entry.name === name);
    if (!profile) return;
    const next = workspaceWithSavedDefault(workspace, profile.workspace);
    onWorkspaceChange(next);
    if (next.units === profile.workspace.units) onSnapChange(profile.snap);
    setMessage(t("profiles.applied", { name }));
  };
  const save = () => {
    const name = normalizeWorkspaceProfileName(naming);
    if (!name) return;
    const next = withWorkspaceProfile(readWorkspaceProfiles(browserStorage()), name, workspace, snap);
    if (!next) {
      setMessage(t("selectionSets.full", { count: MAX_WORKSPACE_PROFILES }));
      return;
    }
    if (!keep(next)) return;
    setChosen(name);
    setNaming(null);
    setMessage(null);
  };
  const remove = () => {
    if (!keep(profiles.filter((profile) => profile.name !== chosen))) return;
    setMessage(null);
    setChosen("");
  };
  const replaces = naming !== null && profiles.some((profile) => profile.name === normalizeWorkspaceProfileName(naming));

  return (
    <div className="workspace-profiles" data-testid="workspace-profiles">
      <strong>{t("profiles.title")}</strong>
      {profiles.length ? (
        <>
          <select aria-label={t("profiles.title")} value={chosen} onChange={(event) => setChosen(event.target.value)}>
            <option value="">{t("profiles.choose")}</option>
            {profiles.map((profile) => <option key={profile.name} value={profile.name}>{profile.name}</option>)}
          </select>
          <button type="button" className="make-default-button" disabled={!chosen} title={t("profiles.applyHint")} onClick={() => apply(chosen)}>{t("profiles.apply")}</button>
          <button type="button" className="workspace-profiles-remove" disabled={!chosen} title={t("profiles.remove")} aria-label={t("profiles.remove")} onClick={remove}><Trash2 size={15} /></button>
        </>
      ) : null}
      {naming === null ? (
        <button type="button" className="make-default-button" title={t("profiles.saveHint")} onClick={() => { setMessage(null); setNaming(chosen || suggestedName || t("profiles.numbered", { number: profiles.length + 1 })); }}>{t("profiles.save")}</button>
      ) : (
        <>
          <input
            aria-label={t("profiles.title")}
            value={naming}
            maxLength={MAX_WORKSPACE_PROFILE_NAME}
            autoFocus
            onFocus={(event) => event.currentTarget.select()}
            onChange={(event) => setNaming(event.target.value)}
            onKeyDown={(event) => {
              event.stopPropagation();
              if (event.key === "Enter") save();
              else if (event.key === "Escape") setNaming(null);
            }}
          />
          <button type="button" className="make-default-button" disabled={!normalizeWorkspaceProfileName(naming)} onClick={save}>{replaces ? t("profiles.replace") : t("common.save")}</button>
          <button type="button" className="make-default-button" onClick={() => setNaming(null)}>{t("common.cancel")}</button>
        </>
      )}
      {message ? <span role="status">{message}</span> : null}
    </div>
  );
}
