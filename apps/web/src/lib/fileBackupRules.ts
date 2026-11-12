/*
 * The rules of the automatic backups, without the browser storage they act on, so they can be tested on their own:
 * the settings, which backups go when there are too many, the names of the copies in a backup folder, and when the
 * notices about backing up grow more urgent.
 *
 * Two kinds of backup are kept: the file as it was on the disk just before Save wrote over it ("overwrite"), and a
 * state of the design taken every few minutes while it is worked on ("snapshot"). Neither replaces a backup on
 * another drive: they live in the same browser, or the folder chosen for them, on the same computer.
 */

import { strFromU8, strToU8, unzipSync } from "fflate";

export type FileBackupKind = "overwrite" | "snapshot";

/** What is kept about a backup besides its bytes. */
export type FileBackupMeta = {
  id: string;
  kind: FileBackupKind;
  createdAt: number;
  /** The design it belongs to; a file opened again becomes a new design, so overwrites are grouped by file too. */
  projectId: string | null;
  projectName: string;
  /** The file written over, for an overwrite. */
  fileName: string | null;
  /** The group of backups: one file for overwrites, one design for snapshots. */
  groupKey: string;
  size: number;
  hash: string;
  /** The design's picture as a data URL, when the package has one. */
  thumbnail: string | null;
};

export type FileBackupSettings = {
  /** How many earlier versions of a file Save keeps; 0 keeps none. */
  overwriteCount: number;
  /** Minutes between snapshots of a design being worked on; 0 takes none. */
  snapshotMinutes: number;
  /** Days without "Back up all" before the reminders grow louder; 0 never reminds. */
  reminderDays: number;
};

export const FILE_BACKUP_COUNT_OPTIONS = [0, 1, 3, 5, 10, 20] as const;
export const SNAPSHOT_MINUTE_OPTIONS = [0, 10, 30] as const;
export const REMINDER_DAY_OPTIONS = [0, 3, 7, 14] as const;
/** Snapshots kept per design. */
export const SNAPSHOT_COUNT = 6;
/** All backups of this browser together stay under this; the oldest snapshots go first. */
export const BACKUP_STORE_LIMIT_BYTES = 500 * 1024 * 1024;
/** Days after which an old backup, or none with several designs, makes the notice on the start page urgent. */
export const URGENT_BACKUP_DAYS = 30;
/** Designs without any backup above which the start page's notice is urgent from the first day. */
export const URGENT_DESIGN_COUNT = 3;

export const DAY_MS = 24 * 60 * 60 * 1000;

export const DEFAULT_FILE_BACKUP_SETTINGS: FileBackupSettings = { overwriteCount: 5, snapshotMinutes: 10, reminderDays: 7 };

function option(value: unknown, options: readonly number[], fallback: number): number {
  return typeof value === "number" && options.includes(value) ? value : fallback;
}

export function normalizeFileBackupSettings(raw: unknown): FileBackupSettings {
  const value = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    overwriteCount: option(value.overwriteCount, FILE_BACKUP_COUNT_OPTIONS, DEFAULT_FILE_BACKUP_SETTINGS.overwriteCount),
    snapshotMinutes: option(value.snapshotMinutes, SNAPSHOT_MINUTE_OPTIONS, DEFAULT_FILE_BACKUP_SETTINGS.snapshotMinutes),
    reminderDays: option(value.reminderDays, REMINDER_DAY_OPTIONS, DEFAULT_FILE_BACKUP_SETTINGS.reminderDays),
  };
}

/** How many backups a group keeps. */
export function backupsKeptFor(kind: FileBackupKind, settings: FileBackupSettings) {
  return kind === "overwrite" ? settings.overwriteCount : SNAPSHOT_COUNT;
}

/**
 * The backups to delete after `added` came in: the oldest of its group beyond what the settings keep, then, while
 * all of them together are larger than `limitBytes`, the oldest anywhere - snapshots before files written over.
 * The one just added always stays.
 */
export function backupsToDrop(records: readonly FileBackupMeta[], added: FileBackupMeta, settings: FileBackupSettings, limitBytes = BACKUP_STORE_LIMIT_BYTES): string[] {
  const drop = new Set<string>();
  const keep = Math.max(1, backupsKeptFor(added.kind, settings));
  const group = records
    .filter((record) => record.groupKey === added.groupKey && record.kind === added.kind)
    .sort((a, b) => b.createdAt - a.createdAt);
  group.slice(keep).forEach((record) => { if (record.id !== added.id) drop.add(record.id); });
  let total = records.reduce((sum, record) => (drop.has(record.id) ? sum : sum + record.size), 0);
  if (total <= limitBytes) return [...drop];
  const oldestFirst = records
    .filter((record) => !drop.has(record.id) && record.id !== added.id)
    .sort((a, b) => (a.kind === b.kind ? a.createdAt - b.createdAt : a.kind === "snapshot" ? -1 : 1));
  for (const record of oldestFirst) {
    if (total <= limitBytes) break;
    drop.add(record.id);
    total -= record.size;
  }
  return [...drop];
}

/** The newest backup of a group, to leave out a copy that is the same as it. */
export function newestInGroup(records: readonly FileBackupMeta[], groupKey: string, kind: FileBackupKind) {
  return records
    .filter((record) => record.groupKey === groupKey && record.kind === kind)
    .reduce<FileBackupMeta | null>((newest, record) => (!newest || record.createdAt > newest.createdAt ? record : newest), null);
}

const pad = (value: number) => String(value).padStart(2, "0");

/** "2026-11-11 20-31-05": sorts by time and is allowed in a file name everywhere. */
export function backupStamp(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
}

/** A design's name as the start of a file name: without characters Windows or macOS refuse, never empty. */
export function backupNameStem(name: string) {
  const stem = name.replace(/\.(lyl|skf)$/i, "").replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "_").replace(/\s+/g, " ").trim().replace(/[. ]+$/, "");
  return stem.slice(0, 120) || "layerling";
}

/** The copy in the backup folder: "Name 2026-11-11 20-31-05.lyl", a snapshot with " auto" before the ending. */
export function folderBackupName(name: string, date: Date, kind: FileBackupKind) {
  return `${backupNameStem(name)} ${backupStamp(date)}${kind === "snapshot" ? " auto" : ""}.lyl`;
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The copies of one design and kind in the backup folder that go, oldest first, so that `keep` stay. Only names
 * this very pattern made count: anything else in the folder is never touched.
 */
export function folderBackupsToRemove(fileNames: readonly string[], name: string, kind: FileBackupKind, keep: number) {
  const pattern = new RegExp(`^${escapeRegExp(backupNameStem(name))} (\\d{4}-\\d{2}-\\d{2} \\d{2}-\\d{2}-\\d{2})${kind === "snapshot" ? " auto" : ""}\\.lyl$`);
  const ours = fileNames
    .map((fileName) => ({ fileName, stamp: pattern.exec(fileName)?.[1] }))
    .filter((entry): entry is { fileName: string; stamp: string } => Boolean(entry.stamp))
    .sort((a, b) => b.stamp.localeCompare(a.stamp));
  return ours.slice(Math.max(0, keep)).map((entry) => entry.fileName);
}

/** Whole days between two moments, never below zero. */
export function daysBetween(from: number, to: number) {
  return Math.max(0, Math.floor((to - from) / DAY_MS));
}

/**
 * How loud the notice over the browser's designs is:
 * - "current": all in the last "Back up all", a calm grey line;
 * - "changed": not backed up yet, or changed since, as it always was;
 * - "overdue": changed since a backup older than the reminder's days - stronger, with a button;
 * - "urgent": no backup with more than a few designs, or none for a month - at the top, in red.
 * With reminders switched off it never grows past "changed".
 */
export type BackupUrgency = "current" | "changed" | "overdue" | "urgent";

export function backupUrgency(options: {
  lastFullBackup: number | null;
  /** When the designs were last changed, one entry per design. */
  designs: ReadonlyArray<{ updatedAt: number }>;
  now: number;
  reminderDays: number;
}): BackupUrgency {
  const { lastFullBackup, designs, now, reminderDays } = options;
  if (designs.length === 0) return "current";
  if (lastFullBackup === null) {
    return reminderDays > 0 && designs.length > URGENT_DESIGN_COUNT ? "urgent" : "changed";
  }
  if (!designs.some((design) => design.updatedAt > lastFullBackup)) return "current";
  if (reminderDays <= 0) return "changed";
  const days = daysBetween(lastFullBackup, now);
  if (days >= URGENT_BACKUP_DAYS) return "urgent";
  return days >= reminderDays ? "overdue" : "changed";
}

/** The day a moment falls on, as the editor's reminder counts them: once a day at most. */
export function localDay(at: number) {
  const date = new Date(at);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Whether the editor reminds of backing up now: reminders on, not yet today, the design changed since the last
 * "Back up all", and that backup - or, without one, the first day layerling was used here - at least the reminder's
 * days ago.
 */
export function editorBackupReminderDue(options: {
  lastFullBackup: number | null;
  firstUse: number;
  designModifiedAt: number;
  now: number;
  reminderDays: number;
  lastShownDay: string | null;
}) {
  const { lastFullBackup, firstUse, designModifiedAt, now, reminderDays, lastShownDay } = options;
  if (reminderDays <= 0 || lastShownDay === localDay(now)) return false;
  if (lastFullBackup !== null && designModifiedAt <= lastFullBackup) return false;
  return daysBetween(lastFullBackup ?? firstUse, now) >= reminderDays;
}

/** The picture a .lyl package carries; it is drawn anew on every save, so it says nothing about the design. */
const PACKAGE_PICTURE = "thumbnail.png";

/**
 * What a .lyl package holds of the design, to tell two saves apart: every file in it by name, without the picture
 * and without the time it was last changed, which a save writes anew even when nothing else changed. A package that
 * is no ZIP (an old JSON design) counts as it is. Its times (created, last changed) are left out too.
 */
export function designContentOf(bytes: Uint8Array): Uint8Array {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes, { filter: (file) => file.name !== PACKAGE_PICTURE });
  } catch {
    return bytes;
  }
  const parts: Uint8Array[] = [];
  for (const name of Object.keys(files).sort()) {
    let content = files[name];
    if (name.endsWith(".json")) {
      try {
        const parsed = JSON.parse(strFromU8(content)) as { metadata?: Record<string, unknown> };
        if (parsed && typeof parsed === "object" && parsed.metadata && typeof parsed.metadata === "object") {
          delete parsed.metadata.modifiedAt;
          delete parsed.metadata.createdAt;
          content = strToU8(JSON.stringify(parsed));
        }
      } catch {
        // Not JSON after all: it counts as it is.
      }
    }
    parts.push(strToU8(`${name} ${content.byteLength} `), content);
  }
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.byteLength;
  }
  return out;
}
