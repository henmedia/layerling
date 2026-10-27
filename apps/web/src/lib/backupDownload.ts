import { listServerCustomShapes, readServerCustomShape } from "@/lib/customShapesServer";
import { importLylProject } from "@/lib/lylProject";
import { packCustomShapesBackup, type CustomShapeBackupItem } from "@/lib/myShapes";
import { backupEntryPaths, backupFolderPaths, backupThumbnailPath, createBackupWriter, type BackupEntry } from "@/lib/projectBackup";
import { SHARED_PROJECTS_ENDPOINT } from "@/lib/sharedProjectsEndpoint";

/*
 * The browser side of a backup: card pictures as PNG bytes, the ZIP handed over as a download, and
 * the designs of the server gathered into the same kind of ZIP as the browser's own.
 */

/** The card picture as a PNG the server will take, or nothing. */
export async function projectThumbnailBlob(thumbnailUrl: string | null | undefined): Promise<Blob | null> {
  if (!thumbnailUrl) return null;
  try {
    const blob = await (await fetch(thumbnailUrl)).blob();
    if (blob.type !== "image/png" || blob.size === 0 || blob.size > 5 * 1024 * 1024) return null;
    return blob;
  } catch {
    return null;
  }
}

/**
 * The card picture as PNG bytes for a backup, or nothing. A picture kept as a data address is
 * read without fetching it.
 */
export async function projectThumbnailPngBytes(thumbnailUrl: string | null | undefined): Promise<Uint8Array | null> {
  if (!thumbnailUrl) return null;
  const inline = /^data:image\/png;base64,(.+)$/.exec(thumbnailUrl);
  if (inline) {
    try {
      const text = atob(inline[1]);
      const bytes = new Uint8Array(text.length);
      for (let index = 0; index < text.length; index += 1) bytes[index] = text.charCodeAt(index);
      return bytes;
    } catch {
      return null;
    }
  }
  if (thumbnailUrl.startsWith("data:")) return null;
  const blob = await projectThumbnailBlob(thumbnailUrl);
  return blob ? new Uint8Array(await blob.arrayBuffer()) : null;
}

/** PNG bytes from a backup as the data address a card picture is handed over with. */
export function pngDataUrl(bytes: Uint8Array) {
  let text = "";
  for (let index = 0; index < bytes.length; index += 0x8000) text += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  return `data:image/png;base64,${btoa(text)}`;
}

/** Hands a backup ZIP to the browser as a download. */
export function downloadBackup(zip: Blob, fileName: string) {
  const url = URL.createObjectURL(zip);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

type BackupWriter = ReturnType<typeof createBackupWriter>;

type StoreDesign = { fileName: string; name: string; path?: string; thumbnailUrl?: string };

/**
 * Every design of the server, in its folders, with its card picture, and the folders with nothing
 * in them, written into `writer`: a ZIP that "Restore backup" brings back. `onProgress` hears of
 * each design before it is fetched; one that cannot be read is left out and named in `skipped`,
 * as in the browser's backup.
 */
export async function writeServerBackup(writer: BackupWriter, fallbackName: string, onProgress: (index: number, total: number, name: string) => void) {
  const response = await fetch(`${SHARED_PROJECTS_ENDPOINT}?all=1`, { cache: "no-store" });
  const payload = await response.json() as { projects?: StoreDesign[]; emptyFolders?: string[]; error?: string };
  if (!response.ok) throw new Error(payload.error ?? `HTTP ${response.status}`);
  // An older server answers `all=1` with the top folder only: a backup of that would quietly leave out the folders.
  if (!Array.isArray(payload.emptyFolders)) throw new Error("This server cannot list all of its designs yet");
  const designs = Array.isArray(payload.projects) ? payload.projects : [];
  const folderNames = (path: string | undefined) => (path ?? "").split("/").filter(Boolean);
  const names = backupEntryPaths(designs.map((design) => ({ name: design.name, folder: folderNames(design.path) })), fallbackName);
  const skipped: string[] = [];
  for (let index = 0; index < designs.length; index += 1) {
    onProgress(index + 1, designs.length, designs[index].name);
    const query = new URLSearchParams({ fileName: designs[index].fileName });
    if (designs[index].path) query.set("path", designs[index].path!);
    const file = await fetch(`${SHARED_PROJECTS_ENDPOINT}?${query.toString()}`, { cache: "no-store" }).catch(() => null);
    if (!file?.ok) {
      skipped.push(designs[index].name);
      continue;
    }
    writer.add(names[index], new Uint8Array(await file.arrayBuffer()));
    const thumbnail = await projectThumbnailPngBytes(designs[index].thumbnailUrl).catch(() => null);
    if (thumbnail) writer.add(backupThumbnailPath(names[index]), thumbnail);
  }
  backupFolderPaths((payload.emptyFolders ?? []).map(folderNames)).forEach((name) => writer.add(name, new Uint8Array()));
  return { count: designs.length - skipped.length, skipped };
}

/**
 * The custom shapes of the server, in the same folder and list as the browser's in a backup, so
 * "Restore backup" puts them among the custom shapes of a browser. The server keeps no body count
 * or fingerprint beside a shape, so each one is read to work them out, as for a loose shape file.
 */
export async function serverCustomShapesBackupEntries() {
  const listed = await listServerCustomShapes();
  if (!listed || listed.shapes.length === 0) return { entries: [] as BackupEntry[], count: 0 };
  // The fingerprint needs the mesh code, which the start page does not load otherwise.
  const { customShapeFingerprint } = await import("@/lib/customShapePackage");
  const shapes: CustomShapeBackupItem[] = [];
  for (const shape of listed.shapes) {
    const bytes = await readServerCustomShape(shape);
    const bodies = (await importLylProject(bytes)).shapes;
    const thumbnail = await projectThumbnailPngBytes(shape.thumbnailUrl);
    shapes.push({
      bytes,
      name: shape.name,
      createdAt: shape.updatedAt,
      thumbnail: thumbnail ? pngDataUrl(thumbnail) : "",
      bodyCount: bodies.length,
      fingerprint: bodies.length ? customShapeFingerprint(bodies) : undefined,
      ...(shape.folder ? { folder: shape.folder } : {}),
    });
  }
  return { entries: packCustomShapesBackup(shapes, listed.folders), count: shapes.length };
}
