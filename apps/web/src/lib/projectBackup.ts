import { Zip, ZipPassThrough, unzipSync, zipSync } from "fflate";

/*
 * "Back up all designs": every design of this browser as its own .lyl file,
 * together in one ZIP. The ZIP is opened again through the start page's
 * "open" tile and brings every design back - into this browser or another.
 * The .lyl files are already compressed, so the ZIP only stores them.
 */

export type BackupEntry = { name: string; bytes: Uint8Array };
/**
 * A design of a backup, with the folders it was in (#496); empty at the top level. The picture of its
 * card comes along when the backup holds one; a backup made before 1.95.0 has none.
 */
export type BackupDesign = BackupEntry & { folder: string[]; thumbnail?: Uint8Array };

/**
 * The picture of a design's card lies next to its .lyl, under the same name as a .png, so a restore
 * puts it back on the card at once instead of waiting until the design is opened.
 */
export function backupThumbnailPath(designPath: string) {
  return designPath.replace(/\.(lyl|skf)$/i, "") + ".png";
}

/**
 * The designs that sit in a folder go into the ZIP under this folder, in their folders. A folder of
 * one's own may be called anything, even "Custom shapes", and still not be taken for the shapes.
 */
export const DESIGN_FOLDERS_BACKUP_ROOT = "Folders";

/**
 * The custom shapes of this browser travel in the same ZIP, in a folder of
 * their own - the same name as their folder on the server - so a restore
 * tells them apart from the designs.
 */
export const CUSTOM_SHAPES_BACKUP_FOLDER = "Custom shapes";
export const CUSTOM_SHAPES_MANIFEST = "custom-shapes.json";
const inCustomShapesFolder = (path: string) => path.startsWith(`${CUSTOM_SHAPES_BACKUP_FOLDER}/`);

export function backupFileName(date: Date, prefix = "layerling-backup") {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${prefix}-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.zip`;
}

/** File names for the designs: readable, safe on every system, never twice the same. */
export function backupEntryNames(projectNames: string[], fallback = "design") {
  const used = new Set<string>();
  return projectNames.map((projectName) => {
    const base = projectName
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^\.+/, "")
      .slice(0, 120) || fallback;
    let name = `${base}.lyl`;
    for (let number = 2; used.has(name.toLowerCase()); number += 1) name = `${base} (${number}).lyl`;
    used.add(name.toLowerCase());
    return name;
  });
}

/** One part of a path in the ZIP: a name made safe, as a design's name is. */
function safeSegment(name: string, fallback: string) {
  return name
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "")
    .slice(0, 120) || fallback;
}

/**
 * Paths in the ZIP for designs that may sit in folders: a design at the top level is a file at the
 * top as before, one in a folder lies under `Folders/` in the same folders. Never twice the same
 * path, whatever the names.
 */
export function backupEntryPaths(designs: ReadonlyArray<{ name: string; folder: readonly string[] }>, fallback = "design", folderFallback = "folder") {
  const used = new Set<string>();
  return designs.map((design) => {
    const directory = design.folder.length ? `${[DESIGN_FOLDERS_BACKUP_ROOT, ...design.folder.map((part) => safeSegment(part, folderFallback))].join("/")}/` : "";
    const base = safeSegment(design.name, fallback);
    let path = `${directory}${base}.lyl`;
    for (let number = 2; used.has(path.toLowerCase()); number += 1) path = `${directory}${base} (${number}).lyl`;
    used.add(path.toLowerCase());
    return path;
  });
}

/**
 * A folder of one's own with no design anywhere inside it still goes into the ZIP, as an empty
 * folder under `Folders/`, so a restore brings it back too.
 */
export function backupFolderPaths(folders: ReadonlyArray<readonly string[]>, folderFallback = "folder") {
  return folders.map((folder) => `${[DESIGN_FOLDERS_BACKUP_ROOT, ...folder.map((part) => safeSegment(part, folderFallback))].join("/")}/`);
}

/** The empty folders a backup holds, as paths of names below `Folders/`. */
export function unpackBackupFolders(bytes: Uint8Array): string[][] {
  const found: string[][] = [];
  try {
    unzipSync(bytes, {
      filter: (file) => {
        if (file.name.endsWith("/") && file.name.startsWith(`${DESIGN_FOLDERS_BACKUP_ROOT}/`)) {
          const parts = file.name.split("/").filter(Boolean).slice(1);
          if (parts.length) found.push(parts);
        }
        return false;
      },
    });
  } catch {
    return [];
  }
  return found;
}

export function packBackup(entries: BackupEntry[], modified = new Date()): Uint8Array {
  const files: Record<string, [Uint8Array, { level: 0; mtime: Date }]> = {};
  for (const entry of entries) files[entry.name] = [entry.bytes, { level: 0, mtime: modified }];
  return zipSync(files);
}

/**
 * A backup written entry by entry (#887). packBackup holds every design and then the whole ZIP once
 * more in one block, so a browser with 23 large designs ran out of memory and Safari reloaded the
 * page without a word. Here each entry goes into the file as it comes, and what is written so far
 * is handed to a Blob after each one, which the browser may keep outside the page's memory; the
 * design's own bytes can go as soon as add() returns. The ZIP is the same as packBackup's: stored,
 * not compressed (a .lyl is compressed already), read back by unpackBackup.
 */
export function createBackupWriter(modified = new Date()) {
  let written: Blob = new Blob([]);
  let pending: Uint8Array[] = [];
  let failure: Error | null = null;
  const zip = new Zip((error, chunk) => {
    if (error) failure = error;
    else pending.push(chunk);
  });
  const settle = () => {
    if (failure) throw failure;
    if (!pending.length) return;
    written = new Blob([written, ...(pending as BlobPart[])]);
    pending = [];
  };
  return {
    add(name: string, bytes: Uint8Array) {
      const file = new ZipPassThrough(name);
      file.mtime = modified;
      zip.add(file);
      file.push(bytes, true);
      settle();
    },
    finish(type = "application/zip") {
      zip.end();
      settle();
      return new Blob([written], { type });
    },
  };
}

/**
 * The designs inside a backup, in the order they were packed, each with the folders it was in.
 * Other files, and the custom shapes, are left out. A design elsewhere in the ZIP than under
 * `Folders/` - every backup made before there were folders - comes back at the top level.
 */
export function unpackBackup(bytes: Uint8Array): BackupDesign[] {
  const files = unzipSync(bytes, { filter: (file) => /\.(lyl|skf|png)$/i.test(file.name) && !inCustomShapesFolder(file.name) });
  return Object.entries(files).filter(([path]) => /\.(lyl|skf)$/i.test(path)).map(([path, data]) => {
    const parts = path.split("/").filter(Boolean);
    const name = parts.pop() ?? path;
    const folder = parts[0] === DESIGN_FOLDERS_BACKUP_ROOT ? parts.slice(1) : [];
    const thumbnail = files[backupThumbnailPath(path)];
    return thumbnail?.length ? { name, bytes: data, folder, thumbnail } : { name, bytes: data, folder };
  });
}

/** The custom shapes inside a backup: their packages by file name, and the list that names them. */
export function unpackCustomShapes(bytes: Uint8Array): { entries: BackupEntry[]; manifest: unknown } {
  const files = unzipSync(bytes, { filter: (file) => inCustomShapesFolder(file.name) });
  let manifest: unknown = null;
  const entries: BackupEntry[] = [];
  for (const [path, data] of Object.entries(files)) {
    const name = path.slice(CUSTOM_SHAPES_BACKUP_FOLDER.length + 1);
    if (name === CUSTOM_SHAPES_MANIFEST) {
      try {
        manifest = JSON.parse(new TextDecoder().decode(data));
      } catch {
        manifest = null;
      }
    } else if (/\.(lyl|skf)$/i.test(name) && !name.includes("/")) {
      entries.push({ name, bytes: data });
    }
  }
  return { entries, manifest };
}

export function isBackupFileName(fileName: string) {
  return /\.zip$/i.test(fileName);
}

/**
 * Ein ZIP ist nur dann eine Sicherung, wenn Entwuerfe darin liegen. similar tools
 * gibt seine OBJ ebenfalls als ZIP heraus (mit der .mtl), und die ist ein
 * Import. Gelesen werden dafuer nur die Namen, nichts wird entpackt.
 */
export function zipHoldsDesigns(bytes: Uint8Array) {
  let found = false;
  try {
    unzipSync(bytes, {
      filter: (file) => {
        if (/\.(lyl|skf)$/i.test(file.name)) found = true;
        return false;
      },
    });
  } catch {
    return false;
  }
  return found;
}

/**
 * Ein Entwurf aus der Sicherung ist schon da, wenn ein vorhandener Name und
 * Erstellzeit teilt: Das Wiederherstellen behaelt die Erstellzeit bei, ein
 * Duplikat aus dem Menue bekommt eine neue (#407).
 */
export function backupDesignAlreadyThere(existing: ReadonlyArray<{ name: string; createdAt: number }>, restored: { name: string; createdAt: number }) {
  return existing.some((project) => project.createdAt === restored.createdAt && project.name === restored.name);
}
