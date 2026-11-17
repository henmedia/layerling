/*
 * What the editor does with the automatic backups: before Save writes over a file it keeps the file as it was, and
 * while a design is worked on it keeps a state of it every few minutes. Neither may stop or slow a save: a backup
 * that fails says so in the status line, and the save goes on.
 */

import { addFileBackup, readFileBackupSettings, type FolderOutcome } from "@/lib/fileBackups";
import { editorBackupReminderDue, localDay } from "@/lib/fileBackupRules";
import { readLastFullBackup } from "@/lib/backupState";
import type { LylFileHandle } from "@/lib/lylFileAccess";

export type OverwriteBackupOutcome = { kept: boolean; failed: boolean; folder: FolderOutcome };

const NOTHING: OverwriteBackupOutcome = { kept: false, failed: false, folder: "none" };

/**
 * Keeps the file as it is on the disk before it is written over. A new, empty file - one just made by "Save as" -
 * has nothing to keep, and a file the same as its newest backup is not kept twice.
 */
export async function backupFileBeforeOverwrite(handle: LylFileHandle, design: { projectId: string | null; projectName: string }): Promise<OverwriteBackupOutcome> {
  const settings = readFileBackupSettings();
  if (settings.overwriteCount <= 0) return NOTHING;
  let bytes: Uint8Array;
  try {
    const file = await handle.getFile();
    if (file.size === 0) return NOTHING;
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch {
    // A file that is gone or cannot be read is written anew; there is nothing to keep.
    return NOTHING;
  }
  try {
    const result = await addFileBackup({ kind: "overwrite", bytes, projectId: design.projectId, projectName: design.projectName, fileName: handle.name, fileHandle: handle, settings });
    return { kept: Boolean(result.backup), failed: false, folder: result.folder };
  } catch {
    return { kept: false, failed: true, folder: "none" };
  }
}

const FIRST_USE_KEY = "layerling.backupReminder.firstUse";
const LAST_SHOWN_KEY = "layerling.backupReminder.lastShown";

function storedNumber(key: string) {
  try {
    const value = Number(window.localStorage.getItem(key));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

/** The first time layerling ran in this browser with reminders, kept so a new user is not reminded on day one. */
function firstUse(now: number) {
  const stored = storedNumber(FIRST_USE_KEY);
  if (stored !== null) return stored;
  try {
    window.localStorage.setItem(FIRST_USE_KEY, String(now));
  } catch {
    // Without storage every day is the first: no reminder, which errs on the quiet side only here.
  }
  return now;
}

/**
 * Whether the editor reminds of "Back up all" now, and how many days it has been; the day is noted, so the reminder
 * comes once a day at most.
 */
export function takeEditorBackupReminder(now = Date.now()): { days: number; never: boolean } | null {
  const settings = readFileBackupSettings();
  const lastFullBackup = readLastFullBackup();
  const since = firstUse(now);
  let lastShownDay: string | null = null;
  try {
    lastShownDay = window.localStorage.getItem(LAST_SHOWN_KEY);
  } catch {
    lastShownDay = null;
  }
  // The design is being changed right now: that is when the reminder is asked for.
  if (!editorBackupReminderDue({ lastFullBackup, firstUse: since, designModifiedAt: now, now, reminderDays: settings.reminderDays, lastShownDay })) return null;
  try {
    window.localStorage.setItem(LAST_SHOWN_KEY, localDay(now));
  } catch {
    // Without storage it may come again tomorrow too, which is what it does anyway.
  }
  const from = lastFullBackup ?? since;
  return { days: Math.max(1, Math.floor((now - from) / (24 * 60 * 60 * 1000))), never: lastFullBackup === null };
}
