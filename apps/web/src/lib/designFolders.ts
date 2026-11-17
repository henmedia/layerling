import { storeFolderNameProblem, suggestStoreFolderName, STORE_FOLDER_NAME_LIMIT, type StoreFolderProblem } from "@/lib/storeFolderName";

/**
 * Folders for the designs of this browser (#496). A folder is a name and the folder it sits in; a
 * design names the folder it is in (`folderId`), or none for the top level. Folders nest. The list
 * is kept in this browser next to the list of designs, and a backup writes the folders as folders
 * of the ZIP, so a restore brings them back.
 *
 * Deleting a folder never deletes a design: what was in it moves one level up. This file is the
 * part without a screen - reading the stored list, the names, moving, deleting, the way to a folder.
 */

export type DesignFolder = {
  id: string;
  name: string;
  /** The folder it sits in; null at the top level. */
  parentId: string | null;
  createdAt: number;
};

export const DESIGN_FOLDERS_STORAGE_KEY = "layerling.designFolders";

/** Anything with a place in a folder: a design of this browser. */
export type InFolder = { id: string; folderId?: string | null };

/**
 * The folders as they were stored, made safe: anything that is not a folder goes, an id comes once,
 * a folder whose parent is gone moves to the top level, and a loop (which no action of the program
 * makes, but a hand-edited or half-written list could hold) is cut at the folder that closes it.
 */
export function normalizeDesignFolders(raw: unknown): DesignFolder[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const folders: DesignFolder[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const candidate = entry as Partial<DesignFolder>;
    if (typeof candidate.id !== "string" || !candidate.id || seen.has(candidate.id)) continue;
    const name = typeof candidate.name === "string" ? candidate.name.trim().slice(0, STORE_FOLDER_NAME_LIMIT) : "";
    if (!name) continue;
    seen.add(candidate.id);
    folders.push({
      id: candidate.id,
      name,
      parentId: typeof candidate.parentId === "string" && candidate.parentId ? candidate.parentId : null,
      createdAt: typeof candidate.createdAt === "number" && Number.isFinite(candidate.createdAt) ? candidate.createdAt : 0,
    });
  }
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  for (const folder of folders) {
    if (folder.parentId && !byId.has(folder.parentId)) folder.parentId = null;
  }
  for (const folder of folders) {
    const visited = new Set<string>([folder.id]);
    for (let parent = folder.parentId; parent; parent = byId.get(parent)?.parentId ?? null) {
      if (visited.has(parent)) {
        folder.parentId = null;
        break;
      }
      visited.add(parent);
    }
  }
  return folders;
}

/** The folder a design is in, or null when that folder does not exist (any more). */
export function folderOfDesign(folders: readonly DesignFolder[], folderId: string | null | undefined): string | null {
  return folderId && folders.some((folder) => folder.id === folderId) ? folderId : null;
}

/** The folders directly inside a folder (null: the top level), by name. */
export function childFolders(folders: readonly DesignFolder[], parentId: string | null): DesignFolder[] {
  return folders.filter((folder) => folder.parentId === parentId).sort((a, b) => a.name.localeCompare(b.name));
}

/** The way from the top level down to a folder, the folder itself last. Empty for the top level. */
export function folderTrail(folders: readonly DesignFolder[], folderId: string | null): DesignFolder[] {
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const trail: DesignFolder[] = [];
  for (let current = folderId ? byId.get(folderId) : undefined; current; current = current.parentId ? byId.get(current.parentId) : undefined) {
    trail.unshift(current);
    if (trail.length > folders.length) break;
  }
  return trail;
}

/** A folder and every folder somewhere inside it. */
export function folderAndDescendants(folders: readonly DesignFolder[], folderId: string): Set<string> {
  const found = new Set<string>([folderId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const folder of folders) {
      if (folder.parentId && found.has(folder.parentId) && !found.has(folder.id)) {
        found.add(folder.id);
        grew = true;
      }
    }
  }
  return found;
}

/** How many designs and folders lie directly in a folder. */
export function folderContents(folders: readonly DesignFolder[], designs: readonly InFolder[], folderId: string) {
  return {
    designs: designs.filter((design) => design.folderId === folderId).length,
    folders: folders.filter((folder) => folder.parentId === folderId).length,
  };
}

/** The names already taken next to a folder - one being renamed keeps its own name free. */
export function siblingFolderNames(folders: readonly DesignFolder[], parentId: string | null, exceptId?: string) {
  return folders.filter((folder) => folder.parentId === parentId && folder.id !== exceptId).map((folder) => folder.name);
}

/**
 * Why a name will not do, or null. The same rules as the folders on the server, so a folder of this
 * browser can become a folder there, and a folder of a backup ZIP, without a change.
 */
export function designFolderNameProblem(folders: readonly DesignFolder[], name: string, parentId: string | null, exceptId?: string): StoreFolderProblem | null {
  return storeFolderNameProblem(name, siblingFolderNames(folders, parentId, exceptId));
}

export function suggestDesignFolderName(folders: readonly DesignFolder[], base: string, parentId: string | null) {
  return suggestStoreFolderName(base, siblingFolderNames(folders, parentId));
}

export function createDesignFolder(folders: readonly DesignFolder[], name: string, parentId: string | null, id: string, now: number): DesignFolder[] {
  return [...folders, { id, name: name.trim().slice(0, STORE_FOLDER_NAME_LIMIT), parentId: folderOfDesign(folders, parentId), createdAt: now }];
}

export function renameDesignFolder(folders: readonly DesignFolder[], folderId: string, name: string): DesignFolder[] {
  const trimmed = name.trim().slice(0, STORE_FOLDER_NAME_LIMIT);
  if (!trimmed) return [...folders];
  return folders.map((folder) => (folder.id === folderId ? { ...folder, name: trimmed } : folder));
}

/**
 * Moves a folder into another one (null: to the top level). A folder cannot go into itself or into
 * a folder inside it; a name that is taken where it lands gets a number, as a new folder would.
 * Returns the list unchanged when the move is not possible.
 */
export function moveDesignFolder(folders: readonly DesignFolder[], folderId: string, targetId: string | null): DesignFolder[] {
  const folder = folders.find((entry) => entry.id === folderId);
  if (!folder) return [...folders];
  const target = folderOfDesign(folders, targetId);
  if (target === folder.parentId) return [...folders];
  if (target && folderAndDescendants(folders, folderId).has(target)) return [...folders];
  const name = suggestStoreFolderName(folder.name, siblingFolderNames(folders, target, folderId));
  return folders.map((entry) => (entry.id === folderId ? { ...entry, parentId: target, name } : entry));
}

/** Puts designs into a folder (null: the top level). */
export function moveDesignsToFolder<T extends InFolder>(designs: readonly T[], ids: readonly string[], folderId: string | null): T[] {
  const moving = new Set(ids);
  return designs.map((design) => (moving.has(design.id) ? { ...design, folderId } : design));
}

/**
 * Deletes a folder and nothing else: its designs and its folders move to the folder it was in. A
 * folder that meets one of the same name there gets a number.
 */
export function deleteDesignFolder<T extends InFolder>(folders: readonly DesignFolder[], designs: readonly T[], folderId: string): { folders: DesignFolder[]; designs: T[] } {
  const folder = folders.find((entry) => entry.id === folderId);
  if (!folder) return { folders: [...folders], designs: [...designs] };
  const parent = folder.parentId;
  let remaining = folders.filter((entry) => entry.id !== folderId);
  for (const child of folders.filter((entry) => entry.parentId === folderId)) {
    const name = suggestStoreFolderName(child.name, siblingFolderNames(remaining, parent, child.id));
    remaining = remaining.map((entry) => (entry.id === child.id ? { ...entry, parentId: parent, name } : entry));
  }
  return {
    folders: remaining,
    designs: designs.map((design) => (design.folderId === folderId ? { ...design, folderId: parent } : design)),
  };
}

/**
 * The folder at the end of a path of names, made where it is missing - for a backup that comes
 * back. An empty path is the top level (null).
 */
export function ensureFolderPath(
  folders: readonly DesignFolder[],
  names: readonly string[],
  makeId: () => string,
  now: number,
): { folders: DesignFolder[]; folderId: string | null } {
  let list = [...folders];
  let parent: string | null = null;
  for (const raw of names) {
    const name = raw.trim().slice(0, STORE_FOLDER_NAME_LIMIT);
    if (!name) continue;
    const existing = list.find((folder) => folder.parentId === parent && folder.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      parent = existing.id;
      continue;
    }
    const id = makeId();
    list = [...list, { id, name, parentId: parent, createdAt: now }];
    parent = id;
  }
  return { folders: list, folderId: parent };
}

/** The names of the folders on the way to a folder, for a backup ZIP. */
export function folderPathNames(folders: readonly DesignFolder[], folderId: string | null | undefined): string[] {
  return folderTrail(folders, folderId ?? null).map((folder) => folder.name);
}

/**
 * The names of the folders on the way to a folder, starting at `rootId` (null: at the top level), for designs that go
 * onto the server with their folders (Discussion #1572): "Put all on the server" takes the whole way, a folder put on
 * the server starts at itself, so it becomes a folder there. Empty for a folder that is not inside `rootId`.
 */
export function folderPathFrom(folders: readonly DesignFolder[], folderId: string | null | undefined, rootId: string | null): string[] {
  const trail = folderTrail(folders, folderId ?? null);
  if (!rootId) return trail.map((folder) => folder.name);
  const start = trail.findIndex((folder) => folder.id === rootId);
  return start < 0 ? [] : trail.slice(start).map((folder) => folder.name);
}

/**
 * The folders of `scope` that are left empty once their designs went onto the server (Discussion #1572): those with no
 * design of `staying` anywhere inside them. A folder with a design that could not go stays, and the folders on the way
 * to it; one outside `scope` is never counted.
 */
export function foldersEmptiedByMove(folders: readonly DesignFolder[], staying: readonly InFolder[], scope: ReadonlySet<string>): Set<string> {
  const holding = new Set<string>();
  for (const design of staying) {
    for (const folder of folderTrail(folders, folderOfDesign(folders, design.folderId))) holding.add(folder.id);
  }
  return new Set(folders.filter((folder) => scope.has(folder.id) && !holding.has(folder.id)).map((folder) => folder.id));
}
