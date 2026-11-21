"use client";

import { useCallback, useEffect, useState } from "react";
import { formatFileSize } from "@/lib/formatFileSize";
import { t } from "@/lib/i18n";
import {
  FILE_BACKUP_COUNT_OPTIONS,
  REMINDER_DAY_OPTIONS,
  SNAPSHOT_COUNT,
  SNAPSHOT_MINUTE_OPTIONS,
  type FileBackupSettings,
} from "@/lib/fileBackupRules";
import {
  allowBackupFolder,
  askToKeepBackups,
  backupFolderState,
  backupFolderSupported,
  chooseBackupFolder,
  deleteAllFileBackups,
  FILE_BACKUP_SETTINGS_EVENT,
  FILE_BACKUPS_CHANGED_EVENT,
  fileBackupsUsage,
  forgetBackupFolder,
  OPEN_FILE_BACKUPS_EVENT,
  readFileBackupSettings,
  writeFileBackupSettings,
  type BackupFolderState,
} from "@/lib/fileBackups";

/**
 * The page "Backups" in the settings: how many earlier versions of a file Save keeps, how often a state of the design
 * is kept while working, when to remind of "Back up all", the backup folder on the computer, and the room it all
 * takes. These settings belong to this browser, not to the design: a design's file does not carry them.
 */
export function FileBackupSettingsSection() {
  const [settings, setSettings] = useState<FileBackupSettings>(readFileBackupSettings);
  const [folder, setFolder] = useState<BackupFolderState>(null);
  const [usage, setUsage] = useState<{ count: number; bytes: number } | null>(null);
  const [problem, setProblem] = useState("");

  const refresh = useCallback(() => {
    void backupFolderState().then(setFolder).catch(() => setFolder(null));
    void fileBackupsUsage().then(setUsage).catch(() => setUsage(null));
  }, []);

  useEffect(() => {
    refresh();
    const follow = () => setSettings(readFileBackupSettings());
    window.addEventListener(FILE_BACKUPS_CHANGED_EVENT, refresh);
    window.addEventListener(FILE_BACKUP_SETTINGS_EVENT, follow);
    return () => {
      window.removeEventListener(FILE_BACKUPS_CHANGED_EVENT, refresh);
      window.removeEventListener(FILE_BACKUP_SETTINGS_EVENT, follow);
    };
  }, [refresh]);

  const patch = (change: Partial<FileBackupSettings>) => {
    askToKeepBackups();
    setSettings(writeFileBackupSettings({ ...settings, ...change }));
  };

  const pickFolder = async () => {
    setProblem("");
    askToKeepBackups();
    try {
      await chooseBackupFolder();
    } catch (error) {
      setProblem(error instanceof Error ? error.message : String(error));
    }
    refresh();
  };

  return (
    <>
      <div className="workspace-section-heading">
        <strong>{t("backups.settingsTitle")}</strong>
        <span>{t("backups.settingsIntro")}</span>
      </div>
      <div className="workspace-backup-settings">
        <label className="workspace-select" data-help={t("backups.overwriteCount")}>
          <span>{t("backups.overwriteCount")}</span>
          <select value={String(settings.overwriteCount)} onChange={(event) => patch({ overwriteCount: Number(event.currentTarget.value) })}>
            {FILE_BACKUP_COUNT_OPTIONS.map((count) => (
              <option key={count} value={String(count)}>{count === 0 ? t("backups.off") : String(count)}</option>
            ))}
          </select>
        </label>
        <p className="workspace-backup-hint">{t("backups.overwriteCountHint")}</p>

        <label className="workspace-select" data-help={t("backups.snapshotMinutes")}>
          <span>{t("backups.snapshotMinutes")}</span>
          <select value={String(settings.snapshotMinutes)} onChange={(event) => patch({ snapshotMinutes: Number(event.currentTarget.value) })}>
            {SNAPSHOT_MINUTE_OPTIONS.map((minutes) => (
              <option key={minutes} value={String(minutes)}>{minutes === 0 ? t("backups.off") : t("backups.everyMinutes", { minutes })}</option>
            ))}
          </select>
        </label>
        <p className="workspace-backup-hint">{t("backups.snapshotMinutesHint", { count: SNAPSHOT_COUNT })}</p>

        <label className="workspace-select" data-help={t("backups.reminderDays")}>
          <span>{t("backups.reminderDays")}</span>
          <select value={String(settings.reminderDays)} onChange={(event) => patch({ reminderDays: Number(event.currentTarget.value) })}>
            {REMINDER_DAY_OPTIONS.map((days) => (
              <option key={days} value={String(days)}>{days === 0 ? t("backups.never") : t("backups.afterDays", { days })}</option>
            ))}
          </select>
        </label>
        <p className="workspace-backup-hint">{t("backups.reminderDaysHint", { button: t("dashboard.backupAll") })}</p>

        <div className="workspace-backup-folder" data-help={t("backups.folder")}>
          <strong>{t("backups.folder")}</strong>
          {backupFolderSupported() ? (
            <>
              <span>
                {folder
                  ? folder.permission === "granted"
                    ? t("backups.folderChosen", { name: folder.name })
                    : t("backups.folderNeedsPermission", { name: folder.name })
                  : t("backups.folderNone")}
              </span>
              <span className="workspace-backup-buttons">
                <button type="button" onClick={() => void pickFolder()}>{folder ? t("backups.folderChange") : t("backups.folderChoose")}</button>
                {folder && folder.permission !== "granted" ? (
                  <button type="button" onClick={() => void allowBackupFolder().then(refresh)}>{t("backups.allowFolder")}</button>
                ) : null}
                {folder ? <button type="button" onClick={() => void forgetBackupFolder().then(refresh)}>{t("backups.folderForget")}</button> : null}
              </span>
              <p className="workspace-backup-hint">{t("backups.folderHint")}</p>
            </>
          ) : (
            <p className="workspace-backup-hint">{t("backups.folderUnsupported")}</p>
          )}
        </div>
        {problem ? <p className="workspace-backup-hint" role="alert">{problem}</p> : null}

        <div className="workspace-backup-usage">
          <span>{usage ? t("backups.usage", { count: usage.count, size: formatFileSize(usage.bytes) }) : ""}</span>
          <span className="workspace-backup-buttons">
            <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_FILE_BACKUPS_EVENT))}>{t("backups.show")}</button>
            <button
              type="button"
              disabled={!usage || usage.count === 0}
              onClick={() => {
                if (!window.confirm(t("backups.deleteAllConfirm"))) return;
                void deleteAllFileBackups().then(refresh);
              }}
            >
              {t("backups.deleteAll")}
            </button>
          </span>
        </div>
      </div>
    </>
  );
}
