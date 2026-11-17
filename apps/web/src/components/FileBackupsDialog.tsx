"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, FolderOpen, History, Trash2, X } from "lucide-react";
import { GuideHelpLink } from "@/components/GuideHelpLink";
import { formatFileSize } from "@/lib/formatFileSize";
import { t } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";
import { useMovablePanel } from "@/lib/useMovablePanel";
import { folderBackupName, type FileBackupMeta } from "@/lib/fileBackupRules";
import {
  deleteFileBackups,
  FILE_BACKUPS_CHANGED_EVENT,
  fileBackupsOfDesign,
  listFileBackups,
  readFileBackupBytes,
} from "@/lib/fileBackups";
import { LYL_MEDIA_TYPE } from "@/lib/lylProject";
import type { LylFileHandle } from "@/lib/lylFileAccess";

/** The design whose backups are shown; without one, every backup of this browser. */
export type FileBackupsScope = { projectId: string | null; fileHandle: LylFileHandle | null; name: string } | null;

function saveBytes(fileName: string, bytes: Uint8Array) {
  const url = URL.createObjectURL(new Blob([bytes as unknown as ArrayBuffer], { type: LYL_MEDIA_TYPE }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** The name a backup is shown and opened under: the file's, or the design's for a snapshot. */
export function fileBackupName(backup: FileBackupMeta) {
  return (backup.kind === "overwrite" && backup.fileName ? backup.fileName : backup.projectName).replace(/\.(lyl|skf)$/i, "");
}

/**
 * "Earlier versions": the backups of a design, or of every design, kept by Save before it wrote over a file and every
 * few minutes while the design was worked on. Each opens as a new design - the design that is open now is never
 * replaced - or is saved as a file of its own.
 */
export function FileBackupsDialog({ scope, onOpen, onClose }: {
  scope: FileBackupsScope;
  /** Opens the backup as a new design, under the name given. */
  onOpen: (file: File, name: string) => Promise<unknown> | unknown;
  onClose: () => void;
}) {
  const language = useLanguage();
  const movable = useMovablePanel<HTMLDivElement>("layerling.fileBackupsPosition", { floatingStyle: { position: "absolute", margin: 0 } });
  const cardRef = movable.panelRef;
  const [backups, setBackups] = useState<FileBackupMeta[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [problem, setProblem] = useState("");
  const scopeRef = useRef(scope);
  scopeRef.current = scope;

  const load = useCallback(async () => {
    const current = scopeRef.current;
    setBackups(current ? await fileBackupsOfDesign(current.projectId, current.fileHandle) : await listFileBackups());
  }, []);

  useEffect(() => {
    void load();
    const reload = () => void load();
    window.addEventListener(FILE_BACKUPS_CHANGED_EVENT, reload);
    return () => window.removeEventListener(FILE_BACKUPS_CHANGED_EVENT, reload);
  }, [load]);

  useEffect(() => {
    cardRef.current?.focus();
  }, [cardRef]);

  const when = (at: number) => new Date(at).toLocaleString(language, { dateStyle: "medium", timeStyle: "short" });

  const withBytes = async (backup: FileBackupMeta, work: (bytes: Uint8Array) => Promise<unknown> | unknown) => {
    setBusy(backup.id);
    setProblem("");
    try {
      const bytes = await readFileBackupBytes(backup.id);
      if (!bytes) throw new Error(t("backups.missing"));
      await work(bytes);
    } catch (error) {
      setProblem(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(null);
    }
  };

  const open = (backup: FileBackupMeta) => withBytes(backup, async (bytes) => {
    const name = t("backups.openedName", { name: fileBackupName(backup), when: when(backup.createdAt) });
    const file = new File([bytes as unknown as ArrayBuffer], `${name}.lyl`, { type: LYL_MEDIA_TYPE });
    onClose();
    await onOpen(file, name);
  });

  const save = (backup: FileBackupMeta) => withBytes(backup, (bytes) => saveBytes(folderBackupName(fileBackupName(backup), new Date(backup.createdAt), backup.kind), bytes));

  const remove = async (backup: FileBackupMeta) => {
    if (!window.confirm(t("backups.deleteConfirm", { name: fileBackupName(backup), when: when(backup.createdAt) }))) return;
    await deleteFileBackups([backup.id]).catch((error) => setProblem(String(error)));
  };

  const total = (backups ?? []).reduce((sum, backup) => sum + backup.size, 0);

  return (
    <div
      className="workspace-modal file-backups-modal"
      role="dialog"
      aria-modal="true"
      aria-label={t("backups.title")}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
        }
      }}
    >
      <div
        className={`workspace-modal-card file-backups-card ${movable.moved ? "floating" : ""} ${movable.dragging ? "moving" : ""}`}
        ref={cardRef}
        style={movable.style}
        tabIndex={-1}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <header className="workspace-modal-header movable" title={t("panel.moveHint")} {...movable.handleProps}>
          <strong>
            <History size={18} aria-hidden="true" />
            {scope ? t("backups.titleOf", { name: scope.name }) : t("backups.title")}
          </strong>
          <GuideHelpLink section="fileBackups" />
          <button aria-label={t("backups.close")} onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        <div className="workspace-modal-content">
          <div className="workspace-modal-body file-backups-body">
            <p className="file-backups-intro">{t("backups.intro", { button: t("dashboard.backupAll") })}</p>
            {problem ? <p className="file-backups-problem" role="alert">{problem}</p> : null}
            {backups === null ? null : backups.length === 0 ? (
              <p className="file-backups-empty">{scope ? t("backups.emptyDesign") : t("backups.empty")}</p>
            ) : (
              <ul className="file-backups-list">
                {backups.map((backup) => (
                  <li key={backup.id} className="file-backup-row">
                    {backup.thumbnail
                      ? <img className="file-backup-picture" src={backup.thumbnail} alt="" />
                      : <span className="file-backup-picture" aria-hidden="true" />}
                    <span className="file-backup-text">
                      <strong>{when(backup.createdAt)}</strong>
                      <span>
                        {backup.kind === "overwrite" ? t("backups.kindOverwrite") : t("backups.kindSnapshot")}
                        {" · "}
                        {fileBackupName(backup)}
                        {" · "}
                        {formatFileSize(backup.size)}
                      </span>
                    </span>
                    <span className="file-backup-actions">
                      <button type="button" className="file-backup-open" disabled={busy !== null} title={t("backups.openHint")} onClick={() => void open(backup)}>
                        <FolderOpen size={16} aria-hidden="true" />
                        <span>{t("backups.open")}</span>
                      </button>
                      <button type="button" disabled={busy !== null} aria-label={t("backups.save")} title={t("backups.save")} onClick={() => void save(backup)}>
                        <Download size={16} aria-hidden="true" />
                      </button>
                      <button type="button" disabled={busy !== null} aria-label={t("backups.delete")} title={t("backups.delete")} onClick={() => void remove(backup)}>
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="workspace-modal-footer">
            <span>{backups && backups.length > 0 ? t("backups.usage", { count: backups.length, size: formatFileSize(total) }) : ""}</span>
            <span className="file-backups-settings-hint">{t("backups.settingsHint")}</span>
          </div>
        </div>
      </div>
      <button className="workspace-modal-backdrop" aria-label={t("backups.close")} onClick={onClose} />
    </div>
  );
}
