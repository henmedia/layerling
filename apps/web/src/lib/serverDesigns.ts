import { LYL_MEDIA_TYPE } from "@/lib/lylProject";
import { SHARED_PROJECTS_ENDPOINT } from "@/lib/sharedProjectsEndpoint";

/**
 * The designs kept on the server, for "Insert from the server" (Discussion #1378): one folder at a time, the way the
 * start page lists them, and a design's file fetched to be inserted like a file picked on the computer.
 */
export type ServerDesignEntry = { fileName: string; name: string; updatedAt: number };
export type ServerDesignFolder = { path: string; folders: string[]; designs: ServerDesignEntry[] };

function storeQuery(path: string, fileName?: string) {
  const query = new URLSearchParams();
  if (fileName) query.set("fileName", fileName);
  if (path) query.set("path", path);
  return query.toString();
}

/** The folder one level up, or "" at the top. */
export function parentServerFolder(path: string) {
  const cut = path.lastIndexOf("/");
  return cut === -1 ? "" : path.slice(0, cut);
}

/** The path of a folder inside another. */
export function joinServerFolder(path: string, name: string) {
  return path ? `${path}/${name}` : name;
}

/** One folder of the server's store, or null when this installation keeps nothing on a server or it did not answer. */
export async function listServerDesigns(path: string): Promise<ServerDesignFolder | null> {
  const query = storeQuery(path);
  const response = await fetch(`${SHARED_PROJECTS_ENDPOINT}${query ? `?${query}` : ""}`, { cache: "no-store" }).catch(() => null);
  if (!response?.ok) return null;
  const payload = await response.json().catch(() => null) as { enabled?: boolean; path?: string; folders?: Array<{ name: string }>; projects?: Array<{ fileName: string; name: string; updatedAt: number }> } | null;
  if (!payload?.enabled) return null;
  return {
    path: typeof payload.path === "string" ? payload.path : path,
    folders: (payload.folders ?? []).map((folder) => folder.name).sort((a, b) => a.localeCompare(b)),
    designs: (payload.projects ?? []).map(({ fileName, name, updatedAt }) => ({ fileName, name, updatedAt })).sort((a, b) => a.name.localeCompare(b.name)),
  };
}

/** A design's file as it lies on the server, or null when it could not be fetched. */
export async function fetchServerDesignFile(path: string, fileName: string): Promise<File | null> {
  const response = await fetch(`${SHARED_PROJECTS_ENDPOINT}?${storeQuery(path, fileName)}`, { cache: "no-store" }).catch(() => null);
  if (!response?.ok) return null;
  return new File([await response.blob()], fileName, { type: LYL_MEDIA_TYPE });
}
