/*
 * The automatic backups of designs: the file as it was before Save wrote over it, and a state of the design every few
 * minutes while it is worked on. They are kept in a database of this browser, and when a backup folder is chosen
 * (Chrome and Edge), as .lyl files in that folder too. The rules - how many stay, the names in the folder, when the
 * notices grow louder - are in fileBackupRules.ts.
 *
 * A backup that cannot be made never stops a save: it says so and the save goes on.
 */

import { unzipSync } from "fflate";
import {
  BACKUP_STORE_LIMIT_BYTES,
  backupsKeptFor,
  backupsToDrop,
  designContentOf,
  folderBackupName,
  folderBackupsToRemove,
  newestInGroup,
  normalizeFileBackupSettings,
  type FileBackupKind,
  type FileBackupMeta,
  type FileBackupSettings,
} from "@/lib/fileBackupRules";
import { LYL_THUMBNAIL_FILE } from "@/lib/lylProject";
import type { LylFileHandle } from "@/lib/lylFileAccess";

const DB_NAME = "layerling-file-backups";
const DB_VERSION = 1;
const META = "meta";
const BYTES = "bytes";
const HANDLES = "handles";
const FOLDER_KEY = "folder";

const SETTINGS_KEY = "layerling.fileBackups.settings";
/** Fired on the window when the settings changed, so an open editor and the start page follow. */
export const FILE_BACKUP_SETTINGS_EVENT = "layerling:file-backup-settings";
/** Fired on the window when a backup was added or deleted, so an open list shows it. */
export const FILE_BACKUPS_CHANGED_EVENT = "layerling:file-backups-changed";
/** Fired on the window to open "Earlier versions" in the editor. */
export const OPEN_FILE_BACKUPS_EVENT = "layerling:open-file-backups";

// ---------------------------------------------------------------------------------------------------------------
// Settings, for the whole browser: the design's own settings travel inside its file, these do not.

export function readFileBackupSettings(): FileBackupSettings {
  try {
    return normalizeFileBackupSettings(JSON.parse(window.localStorage.getItem(SETTINGS_KEY) ?? "null"));
  } catch {
    return normalizeFileBackupSettings(null);
  }
}

export function writeFileBackupSettings(settings: FileBackupSettings) {
  const normalized = normalizeFileBackupSettings(settings);
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(normalized));
  } catch {
    // Without storage the defaults stay; nothing else depends on it.
  }
  window.dispatchEvent(new CustomEvent(FILE_BACKUP_SETTINGS_EVENT, { detail: normalized }));
  return normalized;
}

// ---------------------------------------------------------------------------------------------------------------
// The database.

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("This browser keeps no local database"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META, { keyPath: "id" });
      if (!db.objectStoreNames.contains(BYTES)) db.createObjectStore(BYTES);
      if (!db.objectStoreNames.contains(HANDLES)) db.createObjectStore(HANDLES);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open the backups"));
    request.onblocked = () => reject(new Error("The backups are busy in another tab"));
  });
}

async function transact<T>(stores: string[], mode: IDBTransactionMode, work: (transaction: IDBTransaction) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await openDatabase();
  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const transaction = db.transaction(stores, mode);
      let result: T | undefined;
      const request = work(transaction);
      if (request) request.onsuccess = () => { result = request.result; };
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(transaction.error ?? new Error("The backups could not be written"));
      transaction.onabort = () => reject(transaction.error ?? new Error("The backups could not be written"));
    });
  } finally {
    db.close();
  }
}

function changed() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(FILE_BACKUPS_CHANGED_EVENT));
}

/** Every backup of this browser, newest first. Never fails: without a database there are none. */
export async function listFileBackups(): Promise<FileBackupMeta[]> {
  try {
    const all = (await transact<FileBackupMeta[]>([META], "readonly", (transaction) => transaction.objectStore(META).getAll() as IDBRequest<FileBackupMeta[]>)) ?? [];
    return all.filter((entry) => typeof entry?.id === "string").sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export async function readFileBackupBytes(id: string): Promise<Uint8Array | null> {
  const value = await transact<Blob | Uint8Array>([BYTES], "readonly", (transaction) => transaction.objectStore(BYTES).get(id) as IDBRequest<Blob | Uint8Array>);
  if (!value) return null;
  return value instanceof Uint8Array ? value : new Uint8Array(await value.arrayBuffer());
}

export async function deleteFileBackups(ids: readonly string[]) {
  if (ids.length === 0) return;
  await transact([META, BYTES], "readwrite", (transaction) => {
    ids.forEach((id) => {
      transaction.objectStore(META).delete(id);
      transaction.objectStore(BYTES).delete(id);
    });
  });
  changed();
}

/**
 * Deletes every backup of this browser, and the files it remembered them by; the backup folder stays chosen, and the
 * copies in it stay where they are.
 */
export async function deleteAllFileBackups() {
  const folder = await storedFolder();
  await transact([META, BYTES, HANDLES], "readwrite", (transaction) => {
    transaction.objectStore(META).clear();
    transaction.objectStore(BYTES).clear();
    transaction.objectStore(HANDLES).clear();
    if (folder) transaction.objectStore(HANDLES).put(folder, FOLDER_KEY);
  });
  changed();
}

/** The room all backups of this browser take, and how many there are. */
export async function fileBackupsUsage() {
  const all = await listFileBackups();
  return { count: all.length, bytes: all.reduce((sum, entry) => sum + entry.size, 0) };
}

// ---------------------------------------------------------------------------------------------------------------
// Which file a backup belongs to. A file opened again becomes a new design with a new id, so the backups of a file
// are grouped by its handle, which the browser can compare with the one the design holds now.

type ComparableHandle = LylFileHandle & { isSameEntry?: (other: unknown) => Promise<boolean> };

async function sameEntry(a: ComparableHandle, b: ComparableHandle) {
  try {
    return typeof a.isSameEntry === "function" ? await a.isSameEntry(b) : false;
  } catch {
    return false;
  }
}

async function storedHandles(): Promise<Array<{ key: string; handle: ComparableHandle }>> {
  try {
    const db = await openDatabase();
    try {
      return await new Promise((resolve, reject) => {
        const entries: Array<{ key: string; handle: ComparableHandle }> = [];
        const request = db.transaction(HANDLES, "readonly").objectStore(HANDLES).openCursor();
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) {
            resolve(entries);
            return;
          }
          if (typeof cursor.key === "string" && cursor.key.startsWith("file:")) entries.push({ key: cursor.key, handle: cursor.value as ComparableHandle });
          cursor.continue();
        };
        request.onerror = () => reject(request.error);
      });
    } finally {
      db.close();
    }
  } catch {
    return [];
  }
}

/** The group of a file's backups; a new one is made, and its handle kept, the first time. */
async function groupKeyForFile(handle: ComparableHandle | null, fileName: string | null): Promise<string> {
  if (!handle) return `name:${fileName ?? ""}`;
  for (const entry of await storedHandles()) {
    if (await sameEntry(entry.handle, handle)) return entry.key;
  }
  const key = `file:${crypto.randomUUID()}`;
  try {
    await transact([HANDLES], "readwrite", (transaction) => {
      transaction.objectStore(HANDLES).put(handle, key);
    });
  } catch {
    // A handle that cannot be kept only means the next opening of the file starts a group of its own.
  }
  return key;
}

/** The group key of a file, without making one: null when this file has no backups yet. */
async function existingGroupKeyForFile(handle: ComparableHandle): Promise<string | null> {
  for (const entry of await storedHandles()) {
    if (await sameEntry(entry.handle, handle)) return entry.key;
  }
  return null;
}

export const snapshotGroupKey = (projectId: string) => `project:${projectId}`;

/**
 * The backups that belong to a design: its snapshots and the earlier versions of the file it is tied to, and of
 * any file it was saved into before, newest first.
 */
export async function fileBackupsOfDesign(projectId: string | null, fileHandle: LylFileHandle | null): Promise<FileBackupMeta[]> {
  const all = await listFileBackups();
  const groups = new Set<string>();
  if (fileHandle) {
    const key = await existingGroupKeyForFile(fileHandle as ComparableHandle);
    if (key) groups.add(key);
  }
  return all.filter((entry) => (projectId !== null && entry.projectId === projectId) || groups.has(entry.groupKey));
}

// ---------------------------------------------------------------------------------------------------------------
// Making a backup.

async function sha256(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", bytes as unknown as ArrayBuffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function base64(bytes: Uint8Array) {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  return btoa(binary);
}

/** The picture in a .lyl package, as a data URL, or null for a package without one (or an old JSON design). */
export function thumbnailOfPackage(bytes: Uint8Array): string | null {
  try {
    const files = unzipSync(bytes, { filter: (file) => file.name === LYL_THUMBNAIL_FILE });
    const png = files[LYL_THUMBNAIL_FILE];
    return png && png.byteLength > 0 ? `data:image/png;base64,${base64(png)}` : null;
  } catch {
    return null;
  }
}

let persistAsked = false;

/**
 * Asks the browser once to keep this site's storage when space runs low; it may say no, and nothing changes then.
 * Firefox asks the user about it, so this is called only from a click about backups - never from a timer or a save.
 */
export function askToKeepBackups() {
  if (persistAsked || typeof navigator === "undefined") return;
  persistAsked = true;
  void navigator.storage?.persist?.().catch(() => undefined);
}

/** Above this a package is compared by its bytes: unpacking it on every save would hold the page up. */
const CONTENT_COMPARE_LIMIT = 16 * 1024 * 1024;

export type FolderOutcome = "none" | "written" | "noPermission" | "failed";

export type FileBackupResult = {
  /** The backup kept in the browser, or null when it was the same as the newest one or the kind is switched off. */
  backup: FileBackupMeta | null;
  folder: FolderOutcome;
};

export type FileBackupInput = {
  kind: FileBackupKind;
  bytes: Uint8Array;
  projectId: string | null;
  projectName: string;
  /** For an overwrite: the file written over. */
  fileName?: string | null;
  fileHandle?: LylFileHandle | null;
  settings?: FileBackupSettings;
  at?: Date;
};

/**
 * Keeps a backup: in the browser, and as a copy in the backup folder when there is one the browser may still write
 * to. Nothing is kept when the kind is switched off, the bytes are empty, or they are the same as the newest backup
 * of the same file or design.
 */
export async function addFileBackup(input: FileBackupInput): Promise<FileBackupResult> {
  const settings = input.settings ?? readFileBackupSettings();
  const keep = backupsKeptFor(input.kind, settings);
  if (keep <= 0 || (input.kind === "snapshot" && settings.snapshotMinutes <= 0) || input.bytes.byteLength === 0) return { backup: null, folder: "none" };
  const at = input.at ?? new Date();
  const fileName = input.fileName ?? null;
  const groupKey = input.kind === "overwrite"
    ? await groupKeyForFile((input.fileHandle as ComparableHandle | null | undefined) ?? null, fileName)
    : snapshotGroupKey(input.projectId ?? "");
  // The design, not the bytes: a save writes a new picture and time even when nothing else changed.
  const hash = await sha256(input.bytes.byteLength <= CONTENT_COMPARE_LIMIT ? designContentOf(input.bytes) : input.bytes);
  const all = await listFileBackups();
  const newest = newestInGroup(all, groupKey, input.kind);
  if (newest && newest.hash === hash) return { backup: null, folder: "none" };
  const meta: FileBackupMeta = {
    id: crypto.randomUUID(),
    kind: input.kind,
    createdAt: at.getTime(),
    projectId: input.projectId,
    projectName: input.projectName,
    fileName,
    groupKey,
    size: input.bytes.byteLength,
    hash,
    thumbnail: thumbnailOfPackage(input.bytes),
  };
  const folderName = input.kind === "overwrite" ? (fileName ?? input.projectName) : input.projectName;
  // A package larger than half of all the room the backups have would push out nearly every other one: it goes into
  // the backup folder only, when there is one.
  if (input.bytes.byteLength > BACKUP_STORE_LIMIT_BYTES / 2) {
    return { backup: null, folder: await copyIntoBackupFolder(folderName, input.kind, input.bytes, at, keep) };
  }
  const drop = backupsToDrop([...all, meta], meta, settings);
  await transact([META, BYTES], "readwrite", (transaction) => {
    transaction.objectStore(META).put(meta);
    transaction.objectStore(BYTES).put(new Blob([input.bytes as unknown as ArrayBuffer]), meta.id);
    drop.forEach((id) => {
      transaction.objectStore(META).delete(id);
      transaction.objectStore(BYTES).delete(id);
    });
  });
  changed();
  const folder = await copyIntoBackupFolder(folderName, input.kind, input.bytes, at, keep);
  return { backup: meta, folder };
}

// ---------------------------------------------------------------------------------------------------------------
// The backup folder (Chrome and Edge): a folder the user chose once, kept in the database. After a reload the browser
// usually asks again before a page may write there, and it asks only in answer to a click or a key - so Save asks at
// its start, and the timed snapshots write there only while the permission holds.

type DirectoryHandle = {
  readonly name: string;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<LylFileHandle>;
  removeEntry(name: string): Promise<void>;
  keys?(): AsyncIterable<string>;
  queryPermission?(descriptor: { mode: "readwrite" }): Promise<PermissionState>;
  requestPermission?(descriptor: { mode: "readwrite" }): Promise<PermissionState>;
};

type DirectoryPickerWindow = { showDirectoryPicker?: (options: Record<string, unknown>) => Promise<DirectoryHandle> };

export function backupFolderSupported() {
  return typeof window !== "undefined" && typeof (window as DirectoryPickerWindow).showDirectoryPicker === "function";
}

async function storedFolder(): Promise<DirectoryHandle | null> {
  try {
    return (await transact<DirectoryHandle>([HANDLES], "readonly", (transaction) => transaction.objectStore(HANDLES).get(FOLDER_KEY) as IDBRequest<DirectoryHandle>)) ?? null;
  } catch {
    return null;
  }
}

export type BackupFolderState = { name: string; permission: PermissionState } | null;

/** The chosen folder and whether the page may write there now, or null without one. */
export async function backupFolderState(): Promise<BackupFolderState> {
  const folder = await storedFolder();
  if (!folder) return null;
  const permission = folder.queryPermission ? await folder.queryPermission({ mode: "readwrite" }).catch(() => "prompt" as PermissionState) : "granted";
  return { name: folder.name, permission };
}

/**
 * Asks for the right to write into the backup folder again, when the browser wants to be asked: to be called at the
 * start of a click or a key press, before anything slow. True when there is a folder and the page may write there.
 */
export async function allowBackupFolder(): Promise<boolean> {
  const folder = await storedFolder();
  if (!folder) return false;
  if (!folder.queryPermission) return true;
  if ((await folder.queryPermission({ mode: "readwrite" })) === "granted") return true;
  return folder.requestPermission ? (await folder.requestPermission({ mode: "readwrite" })) === "granted" : false;
}

/** Lets the user choose the backup folder; null when the dialog was closed. */
export async function chooseBackupFolder(): Promise<string | null> {
  const picker = (window as DirectoryPickerWindow).showDirectoryPicker;
  if (!picker) return null;
  let folder: DirectoryHandle;
  try {
    folder = await picker({ id: "layerling-backup-folder", mode: "readwrite" });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return null;
    throw error;
  }
  await transact([HANDLES], "readwrite", (transaction) => {
    transaction.objectStore(HANDLES).put(folder, FOLDER_KEY);
  });
  changed();
  return folder.name;
}

/** Stops copying into the folder; what is in it stays. */
export async function forgetBackupFolder() {
  await transact([HANDLES], "readwrite", (transaction) => {
    transaction.objectStore(HANDLES).delete(FOLDER_KEY);
  });
  changed();
}

async function copyIntoBackupFolder(name: string, kind: FileBackupKind, bytes: Uint8Array, at: Date, keep: number): Promise<FolderOutcome> {
  const folder = await storedFolder();
  if (!folder) return "none";
  try {
    if (folder.queryPermission && (await folder.queryPermission({ mode: "readwrite" })) !== "granted") return "noPermission";
    const file = await folder.getFileHandle(folderBackupName(name, at, kind), { create: true });
    const writable = await file.createWritable();
    try {
      await writable.write(bytes);
      await writable.close();
    } catch (error) {
      await writable.abort().catch(() => undefined);
      throw error;
    }
    // Only names this pattern made are counted and removed; anything else in the folder stays.
    if (folder.keys) {
      const names: string[] = [];
      for await (const entry of folder.keys()) names.push(entry);
      for (const old of folderBackupsToRemove(names, name, kind, keep)) await folder.removeEntry(old).catch(() => undefined);
    }
    return "written";
  } catch {
    return "failed";
  }
}
