/**
 * Saving a design into a file of the user's own choosing (#251). Chrome and Edge let a page ask for a
 * file once and write into it again later, so "Save" can replace the file in its folder instead of
 * adding another copy to Downloads. Firefox and Safari have no such thing; there everything stays a
 * download, as before.
 */

import { LYL_MEDIA_TYPE } from "@/lib/lylProject";

/** What of a file handle is used here - the browser's type is not in the TypeScript library yet. */
export interface LylFileHandle {
  readonly name: string;
  getFile(): Promise<File>;
  createWritable(): Promise<{ write(data: Blob | ArrayBuffer | Uint8Array): Promise<void>; close(): Promise<void>; abort(): Promise<void> }>;
  queryPermission?(descriptor: { mode: "read" | "readwrite" }): Promise<PermissionState>;
  requestPermission?(descriptor: { mode: "read" | "readwrite" }): Promise<PermissionState>;
  remove?(): Promise<void>;
}

interface FilePickerWindow {
  showSaveFilePicker?: (options: Record<string, unknown>) => Promise<LylFileHandle>;
  showOpenFilePicker?: (options: Record<string, unknown>) => Promise<LylFileHandle[]>;
}

/** One id for all pickers: the browser reopens the folder used last. */
const PICKER_ID = "layerling-designs";

const filePickerWindow = () => (typeof window === "undefined" ? {} : window) as FilePickerWindow;

export function lylFileAccessSupported() {
  const picker = filePickerWindow();
  return typeof picker.showSaveFilePicker === "function" && typeof picker.showOpenFilePicker === "function";
}

/** The browser reports a closed dialog as an AbortError. */
export function isPickerCancelled(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

/** The file a design was last saved to or opened from, per design. Gone when the page is reloaded. */
const linkedFiles = new Map<string, LylFileHandle>();

export const rememberLylFile = (projectId: string, handle: LylFileHandle) => void linkedFiles.set(projectId, handle);
export const linkedLylFile = (projectId: string) => linkedFiles.get(projectId) ?? null;
export const forgetLylFile = (projectId: string) => void linkedFiles.delete(projectId);

const lylTypes = [{ description: "layerling design", accept: { [LYL_MEDIA_TYPE]: [".lyl"] } }];

/** Asks where to save; null when the dialog is closed without a choice. */
export async function pickLylFileToSave(suggestedName: string): Promise<LylFileHandle | null> {
  const picker = filePickerWindow().showSaveFilePicker;
  if (!picker) return null;
  try {
    return await picker({ id: PICKER_ID, suggestedName, types: lylTypes });
  } catch (error) {
    if (isPickerCancelled(error)) return null;
    throw error;
  }
}

/** The STL a design was last exported to, per design: later STL exports write into it without asking. */
const linkedStlFiles = new Map<string, LylFileHandle>();

export const rememberStlFile = (projectId: string, handle: LylFileHandle) => void linkedStlFiles.set(projectId, handle);
export const linkedStlFile = (projectId: string) => linkedStlFiles.get(projectId) ?? null;
export const forgetStlFile = (projectId: string) => void linkedStlFiles.delete(projectId);

/** Slicer files usually live apart from the designs, so their dialog remembers its own folder. */
const EXPORT_PICKER_ID = "layerling-exports";

/** Asks where an STL goes; null when the dialog is closed without a choice. */
export async function pickStlFileToSave(suggestedName: string): Promise<LylFileHandle | null> {
  const picker = filePickerWindow().showSaveFilePicker;
  if (!picker) return null;
  try {
    return await picker({ id: EXPORT_PICKER_ID, suggestedName, types: [{ description: "STL mesh", accept: { "model/stl": [".stl"] } }] });
  } catch (error) {
    if (isPickerCancelled(error)) return null;
    throw error;
  }
}

/** Asks for one design file; null when the dialog is closed without a choice. */
export async function pickLylFileToOpen(): Promise<{ file: File; handle: LylFileHandle } | null> {
  const picker = filePickerWindow().showOpenFilePicker;
  if (!picker) return null;
  try {
    const [handle] = await picker({ id: PICKER_ID, multiple: false, types: [{ description: "layerling design", accept: { [LYL_MEDIA_TYPE]: [".lyl", ".skf"] } }] });
    return handle ? { file: await handle.getFile(), handle } : null;
  } catch (error) {
    if (isPickerCancelled(error)) return null;
    throw error;
  }
}

/**
 * Whether a file can be written to. A file taken from the open dialog starts with read rights only,
 * and the browser asks for the rest on the spot - which needs a click or a key press, so this has to
 * run before anything slow.
 */
export async function ensureLylFileWritable(handle: LylFileHandle): Promise<boolean> {
  if (!handle.queryPermission) return true;
  if ((await handle.queryPermission({ mode: "readwrite" })) === "granted") return true;
  return handle.requestPermission ? (await handle.requestPermission({ mode: "readwrite" })) === "granted" : false;
}

/** How long writing a file may take before it counts as stuck, in ms: this, and a second more for every megabyte. */
const FILE_STUCK_MS = 20_000;
const FILE_STUCK_MS_PER_BYTE = 1000 / (1024 * 1024);

/** Gives up on a step that never answers: a virus scanner can hold a file without an error (Discussion #1987). */
function withinTime<T>(step: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("The file did not answer in time")), ms);
    step.then(resolve, reject).finally(() => clearTimeout(timer));
  });
}

export async function writeLylFile(handle: LylFileHandle, bytes: Uint8Array | Blob) {
  const size = bytes instanceof Blob ? bytes.size : bytes.byteLength;
  let gaveUp = false;
  const write = async () => {
    const writable = await handle.createWritable();
    try {
      if (gaveUp) throw new Error("The file answered too late");
      await writable.write(bytes);
      if (gaveUp) throw new Error("The file answered too late");
      // Closing is what puts the data into the file; until then the old content stays.
      await writable.close();
    } catch (error) {
      await writable.abort().catch(() => undefined);
      throw error;
    }
  };
  try {
    await withinTime(write(), FILE_STUCK_MS + size * FILE_STUCK_MS_PER_BYTE);
  } catch (error) {
    gaveUp = true;
    throw error;
  }
  // A virus scanner or a drive can drop what was written without an error, and the file stays empty (Discussion #1987).
  const written = await withinTime(handle.getFile(), FILE_STUCK_MS).then((file) => file.size, () => size);
  if (written !== size) throw new Error(`Wrote ${size} bytes, the file has ${written}`);
}

/** The save dialog makes the file before anything is in it: one that stayed empty is removed again, where the browser can. */
export async function dropEmptyFile(handle: LylFileHandle) {
  try {
    if ((await withinTime(handle.getFile(), 5000)).size === 0 && handle.remove) await withinTime(handle.remove(), 5000);
  } catch {
    // Gone already, not ours to remove, or held by something else.
  }
}

/** Backups often go somewhere else again - onto a cloud drive, say - so their dialog remembers its own folder. */
const BACKUP_PICKER_ID = "layerling-backups";

/** Where a backup ZIP goes: its file name, and in Chrome and Edge the file picked for it. */
export interface BackupTarget {
  fileName: string;
  handle?: LylFileHandle;
}

/**
 * Asks where a backup goes. In Chrome and Edge that is a save dialog that remembers its folder, so backups can go
 * straight into a folder of one's own, on a cloud drive say, instead of Downloads (asked in the Facebook group,
 * 07.11.2026). Other browsers, or a dialog that will not open, keep the download. null when the dialog is closed
 * without a choice: then there is no backup. The dialog needs the click that started it, so this comes before
 * anything slow. `asDownload` leaves the dialog out: on some PCs it hands back no file for any folder, and the
 * "Download instead" button of the message that follows makes the backup a download (Facebook group, 12.11.2026).
 */
export async function pickBackupTarget(suggestedName: string, asDownload = false): Promise<BackupTarget | null> {
  const picker = filePickerWindow().showSaveFilePicker;
  if (!picker || asDownload) return { fileName: suggestedName };
  try {
    const handle = await picker({ id: BACKUP_PICKER_ID, suggestedName, types: [{ description: "layerling backup", accept: { "application/zip": [".zip"] } }] });
    return { fileName: handle.name, handle };
  } catch (error) {
    if (isPickerCancelled(error)) return null;
    return { fileName: suggestedName };
  }
}

/** Puts a backup where `pickBackupTarget` said: into the picked file, or as a download. */
export async function writeBackupTarget(target: BackupTarget, zip: Blob, download: (fileName: string, zip: Blob) => unknown) {
  if (target.handle) await writeLylFile(target.handle, zip);
  else await download(target.fileName, zip);
}

/** A picked file that is left empty after all (nothing to back up) is removed again, where the browser can. */
export async function dropBackupTarget(target: BackupTarget) {
  await target.handle?.remove?.().catch(() => undefined);
}

/** The import dialog of the overview: any of the listed endings, and the handles of what was chosen. */
export async function pickFilesToImport(extensions: string[]): Promise<Array<{ file: File; handle: LylFileHandle }> | null> {
  const picker = filePickerWindow().showOpenFilePicker;
  if (!picker) return null;
  try {
    const handles = await picker({ id: PICKER_ID, multiple: true, types: [{ description: "layerling designs and 3D files", accept: { "application/octet-stream": extensions } }] });
    return await Promise.all(handles.map(async (handle) => ({ file: await handle.getFile(), handle })));
  } catch (error) {
    if (isPickerCancelled(error)) return null;
    throw error;
  }
}

interface LaunchQueueWindow {
  launchQueue?: { setConsumer(consumer: (params: { files?: LylFileHandle[] }) => void): void };
}

/**
 * A .lyl double-clicked in the file manager reaches the installed app through the manifest's
 * file_handlers (#605). The browser queues what was opened; this takes it from there, file by file.
 * Browsers without the launch queue (Firefox, Safari, a plain tab) never call back.
 */
export function onLylFilesLaunched(consumer: (file: File, handle: LylFileHandle) => void) {
  if (typeof window === "undefined") return;
  const queue = (window as unknown as LaunchQueueWindow).launchQueue;
  if (!queue) return;
  queue.setConsumer((params) => {
    for (const handle of params.files ?? []) {
      void handle.getFile().then((file) => consumer(file, handle)).catch(() => undefined);
    }
  });
}
