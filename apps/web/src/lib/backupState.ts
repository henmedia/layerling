/*
 * When this browser's designs were last backed up as a whole (with "Back up all", not one folder or design), so the
 * notice over them says where they stand instead of the same warning every time (Jürgen Keller by mail, 10.11.2026):
 * not yet backed up, backed up but changed since, or all backed up.
 */
const LAST_FULL_BACKUP_KEY = "layerling.lastFullBackupAt";

export function readLastFullBackup(): number | null {
  try {
    const value = Number(window.localStorage.getItem(LAST_FULL_BACKUP_KEY));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

export function rememberFullBackup(at: number) {
  try {
    window.localStorage.setItem(LAST_FULL_BACKUP_KEY, String(at));
  } catch {
    // Without storage the notice keeps saying "not backed up yet", which errs on the safe side.
  }
}

export type BackupNoteState =
  | { kind: "never" }
  | { kind: "changed"; at: number; count: number }
  | { kind: "current"; at: number };

/** A design changed or added after the backup is not in it; one deleted since needs nothing. */
export function backupNoteState(designs: ReadonlyArray<{ updatedAt: number }>, lastFullBackup: number | null): BackupNoteState {
  if (lastFullBackup === null) return { kind: "never" };
  const count = designs.filter((design) => design.updatedAt > lastFullBackup).length;
  return count > 0 ? { kind: "changed", at: lastFullBackup, count } : { kind: "current", at: lastFullBackup };
}
