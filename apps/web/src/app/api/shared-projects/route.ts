import { randomUUID } from "crypto";
import { constants as fsConstants, promises as fs, createReadStream } from "fs";
import { Readable } from "stream";
import path from "path";
import { NextResponse } from "next/server";
import { inspectLylProjectPackage, LYL_LIMITS, LYL_MEDIA_TYPE } from "@/lib/lylProject";
import { originMatchesRequest } from "@/lib/sameOrigin";
import { CUSTOM_SHAPES_FOLDER } from "@/lib/customShapesServer";
import { storeFolderNameProblem } from "@/lib/storeFolderName";

export const runtime = "nodejs";
export const revalidate = false;

const SHARED_PROJECTS_ENV = "LAYERLING_SHARED_PROJECTS_DIR";
const USER_HEADER_ENV = "LAYERLING_USER_HEADER";
const SHARED_THUMBNAILS_DIR = ".thumbnails";
const MAX_THUMBNAIL_BYTES = 5 * 1024 * 1024;
const MAX_MULTIPART_OVERHEAD_BYTES = 1024 * 1024;
const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
/** Grenzen der Suche: so viele Treffer, so tief, so viele Ordner. */
const SEARCH_RESULT_LIMIT = 200;
const SEARCH_DEPTH_LIMIT = 12;
const SEARCH_FOLDER_LIMIT = 2000;
/** What an export can be called on the server (#779): the files a slicer or a laser software opens. */
const EXPORT_FILE_EXTENSIONS = ["stl", "3mf", "obj", "step", "stp", "svg", "dxf", "png", "pdf"];

type SharedProjectFile = {
  fileName: string;
  path: string;
  name: string;
  updatedAt: number;
  size: number;
  revision: string;
  thumbnailUrl?: string;
};

/** A refusal with the status it deserves, so handlers can simply throw. */
class RequestFailure extends Error {
  constructor(message: string, readonly status: number, readonly extra: Record<string, unknown> = {}) {
    super(message);
  }
}

function failureResponse(error: unknown, fallback: string, fallbackStatus = 500) {
  if (error instanceof RequestFailure) {
    return NextResponse.json({ error: error.message, ...error.extra }, { status: error.status });
  }
  return NextResponse.json({ error: error instanceof Error ? error.message : fallback }, { status: fallbackStatus });
}

/**
 * Detects the authenticated user when configured with LAYERLING_USER_HEADER.
 * If the setting is unset or empty, header-based user isolation is disabled.
 *
 * Returns a sanitized folder name if authenticated, or null if disabled / unauthenticated.
 */
function authenticatedUserFolder(request: Request): string | null {
  const headerName = process.env[USER_HEADER_ENV]?.trim();
  if (!headerName) {
    return null;
  }

  const identity = request.headers.get(headerName);
  if (typeof identity === "string" && identity.trim() !== "") {
    let safe = identity.trim().toLowerCase().replace(/@/g, "_at_");
    safe = safe.replace(/[^a-z0-9_.-]/g, "_");
    safe = safe.replace(/^[._-]+|[._-]+$/g, "");
    return safe !== "" ? safe : null;
  }

  return null;
}

function sharedProjectsDirectory(request?: Request) {
  const configured = (process.env[SHARED_PROJECTS_ENV])?.trim();
  if (!configured) return null;
  const base = path.resolve(configured);
  if (!request) return base;
  const userFolder = authenticatedUserFolder(request);
  if (userFolder) {
    return path.join(base, ".users", userFolder);
  }
  return base;
}

/**
 * The store's own folder, made if it is missing. When that fails, the bare
 * system error ("EACCES: permission denied, mkdir '/data'") leaves people
 * guessing where the path came from (#114); say which setting it is and what
 * to mount.
 */
async function ensureSharedRoot(root: string) {
  try {
    await fs.mkdir(root, { recursive: true });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new RequestFailure(
      `The shared folder ${root} from ${SHARED_PROJECTS_ENV} cannot be created (${reason}). Mount a writable folder at ${root}, or set ${SHARED_PROJECTS_ENV} to the folder you mounted. In Docker, apply a changed setting with "docker compose up -d"; "restart" keeps the old one.`,
      500,
      // The store is switched on, only not usable: the start page shows the error, as before.
      { enabled: true, projects: [] },
    );
  }
}

function sharedProjectStem(requestedName: string) {
  return path.basename(requestedName.replace(/\.(lyl|skf)$/i, ""))
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 115) || "Untitled project";
}

/** The name a new shared project is written under. Saving always writes .lyl. */
function safeProjectFileName(requestedName: string) {
  return `${sharedProjectStem(requestedName)}.lyl`;
}

/**
 * The name of a file that is already in the folder. A project saved before the
 * rename is an .skf and keeps that name - it is downloaded and deleted under it.
 */
function existingProjectFileName(requestedName: string) {
  const extension = /\.(lyl|skf)$/i.exec(requestedName)?.[0].toLowerCase() ?? ".lyl";
  return `${sharedProjectStem(requestedName)}${extension}`;
}

/**
 * Turns the path from the query into a real directory inside the store.
 *
 * This is the one place where something from the network chooses a location on
 * disk, so it is deliberately narrow: every segment is judged on its own by the
 * rules the dialog uses (`storeFolderNameProblem`, shared with store.php), and
 * the resolved result must still sit inside the store.
 */
async function resolveFolder(root: string, requested: string | null, mustExist = true) {
  const trimmed = (requested ?? "").replace(/\\/g, "/").trim().replace(/^\/+|\/+$/g, "");
  if (!trimmed) return root;
  const segments = trimmed.split("/").map((segment) => segment.trim());
  for (const segment of segments) {
    if (storeFolderNameProblem(segment, []) !== null) throw new RequestFailure("That folder name is not allowed", 400);
  }
  const candidate = path.join(root, ...segments);
  if (!mustExist) return candidate;
  const resolved = await fs.realpath(candidate).catch(() => null);
  const rootReal = await fs.realpath(root);
  if (!resolved) throw new RequestFailure("That folder is not on the server", 404);
  // realpath has followed every link by now, so this catches the ways out.
  if (resolved !== rootReal && !resolved.startsWith(rootReal + path.sep)) {
    throw new RequestFailure("That folder is not allowed", 400);
  }
  const stat = await fs.lstat(resolved);
  if (!stat.isDirectory()) throw new RequestFailure("That folder is not on the server", 404);
  return resolved;
}

/** The part of a path that goes back to the browser, always with forward slashes. */
function folderKey(root: string, folder: string) {
  if (folder === root) return "";
  return path.relative(root, folder).split(path.sep).join("/");
}

function revisionForStat(stat: { size: number; mtimeMs: number }) {
  return `${stat.size.toString(16)}-${Math.round(stat.mtimeMs * 1000).toString(16)}`;
}

function sharedThumbnailPath(folder: string, fileName: string, revision: string) {
  return path.join(folder, SHARED_THUMBNAILS_DIR, `${fileName}.${revision}.png`);
}

/** Relative on purpose: the app may be served from a sub-directory. */
function sharedThumbnailUrl(fileName: string, revision: string, folderPath: string) {
  const query = new URLSearchParams({ fileName, thumbnail: "1", v: revision });
  if (folderPath) query.set("path", folderPath);
  return `/api/shared-projects?${query.toString()}`;
}

function projectRecord(fileName: string, stat: { size: number; mtimeMs: number }, hasThumbnail = false, folderPath = ""): SharedProjectFile {
  const revision = revisionForStat(stat);
  return {
    fileName,
    path: folderPath,
    name: fileName.replace(/\.(lyl|skf)$/i, ""),
    updatedAt: stat.mtimeMs,
    size: stat.size,
    revision,
    ...(hasThumbnail ? { thumbnailUrl: sharedThumbnailUrl(fileName, revision, folderPath) } : {}),
  };
}

function isPng(bytes: Uint8Array) {
  return bytes.byteLength >= PNG_SIGNATURE.byteLength
    && PNG_SIGNATURE.every((value, index) => bytes[index] === value);
}

async function sharedProjectRequestBytes(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
    return { projectBytes: new Uint8Array(await request.arrayBuffer()), thumbnailBytes: null as Uint8Array | null };
  }

  const formData = await request.formData();
  const project = formData.get("project");
  const thumbnail = formData.get("thumbnail");
  if (!(project instanceof Blob)) throw new Error("Shared project upload is missing its project file");
  if (!(thumbnail instanceof Blob)) throw new Error("Shared project upload is missing its thumbnail");
  const projectBytes = new Uint8Array(await project.arrayBuffer());
  const thumbnailBytes = new Uint8Array(await thumbnail.arrayBuffer());
  if (thumbnailBytes.byteLength > MAX_THUMBNAIL_BYTES) throw new Error("Shared project thumbnail exceeds the 5 MB size limit");
  if (!isPng(thumbnailBytes)) throw new Error("Shared project thumbnail must be a PNG image");
  return { projectBytes, thumbnailBytes };
}

function unquoteEtag(value: string | null) {
  if (!value) return null;
  return value.trim().replace(/^W\//, "").replace(/^"|"$/g, "");
}

function sameOriginRequest(request: Request) {
  return originMatchesRequest(request);
}

async function regularFileStat(filePath: string) {
  try {
    const stat = await fs.lstat(filePath);
    if (stat.isSymbolicLink() || !stat.isFile()) return null;
    return stat;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

/** What is inside a folder, without looking any deeper. */
async function folderContentsCount(folder: string) {
  const entries = await fs.readdir(folder, { withFileTypes: true }).catch(() => []);
  let projects = 0;
  let folders = 0;
  let files = 0;
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    if (entry.isDirectory()) folders += 1;
    else if (entry.isFile() && /\.(lyl|skf)$/i.test(entry.name)) projects += 1;
    else if (entry.isFile()) files += 1;
  }
  return { projects, folders, files };
}

/** A folder and everything under it. Links are unlinked rather than followed. */
async function removeFolderTree(folder: string) {
  for (const entry of await fs.readdir(folder, { withFileTypes: true })) {
    const full = path.join(folder, entry.name);
    if (entry.isDirectory()) await removeFolderTree(full);
    else await fs.unlink(full);
  }
  await fs.rmdir(folder);
}

async function acquireLock(filePath: string) {
  const lockPath = `${filePath}.lock`;
  try {
    return { handle: await fs.open(lockPath, "wx"), lockPath };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      throw new RequestFailure("This shared project is currently being changed by someone else", 409);
    }
    throw error;
  }
}

function disabledResponse() {
  return NextResponse.json(
    { enabled: false, projects: [], error: `${SHARED_PROJECTS_ENV} is not configured` },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(request: Request) {
  const root = sharedProjectsDirectory(request);
  if (!root) return disabledResponse();
  try {
    await ensureSharedRoot(root);
    const requestUrl = new URL(request.url);
    const folder = await resolveFolder(root, requestUrl.searchParams.get("path"));
    const folderPath = folderKey(root, folder);
    // Eine Suche geht ueber den ganzen Speicher, nicht ueber einen Ordner -
    // `path` spielt dabei keine Rolle.
    const searchTerm = requestUrl.searchParams.get("search")?.trim();
    if (searchTerm) return await searchStore(root, searchTerm);
    const settings = requestUrl.searchParams.get("settings");
    if (settings) return await readSettings(root, settings);
    if (requestUrl.searchParams.get("all") === "1") return await allDesigns(root);
    const requestedFile = requestUrl.searchParams.get("fileName");
    if (requestedFile) {
      const fileName = existingProjectFileName(requestedFile);
      if (fileName !== requestedFile) return NextResponse.json({ error: "Invalid shared project name" }, { status: 400 });
      const filePath = path.join(folder, fileName);
      const stat = await regularFileStat(filePath);
      if (!stat) return NextResponse.json({ error: "Shared project was not found" }, { status: 404 });
      if (requestUrl.searchParams.get("thumbnail") === "1") {
        const revision = revisionForStat(stat);
        const requestedRevision = requestUrl.searchParams.get("v");
        if (requestedRevision && requestedRevision !== revision) {
          return new NextResponse("Shared project thumbnail revision is stale", { status: 404 });
        }
        const imagePath = sharedThumbnailPath(folder, fileName, revision);
        const imageStat = await regularFileStat(imagePath);
        if (!imageStat) return new NextResponse("Shared project thumbnail was not found", { status: 404 });
        const imageStream = Readable.toWeb(createReadStream(imagePath));
        return new Response(imageStream as BodyInit, {
          headers: {
            "Cache-Control": "public, max-age=31536000, immutable",
            "Content-Length": String(imageStat.size),
            "Content-Type": "image/png",
            ETag: `"${revision}"`,
          },
        });
      }
      const fileStream = Readable.toWeb(createReadStream(filePath));
      return new Response(fileStream as BodyInit, {
        headers: {
          "Cache-Control": "no-store",
          "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
          "Content-Length": String(stat.size),
          "Content-Type": LYL_MEDIA_TYPE,
          ETag: `"${revisionForStat(stat)}"`,
        },
      });
    }

    const entries = await fs.readdir(folder, { withFileTypes: true });
    const projects = await Promise.all(entries
      .filter((entry) => entry.isFile() && /\.(lyl|skf)$/i.test(entry.name))
      .map(async (entry) => {
        const stat = await regularFileStat(path.join(folder, entry.name));
        if (!stat) return null;
        const revision = revisionForStat(stat);
        const thumbnailStat = await regularFileStat(sharedThumbnailPath(folder, entry.name, revision));
        return projectRecord(entry.name, stat, Boolean(thumbnailStat), folderPath);
      }));
    const folders = await Promise.all(entries
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
      .map(async (entry) => ({ name: entry.name, ...(await folderContentsCount(path.join(folder, entry.name))) })));
    return NextResponse.json(
      {
        enabled: true,
        path: folderPath,
        // Every design in the store, not only this folder's: the number on the start page's tab.
        total: (await storeDesigns(root)).designs.length,
        folders: folders.sort((a, b) => a.name.localeCompare(b.name)),
        projects: projects.filter((entry): entry is SharedProjectFile => Boolean(entry)).sort((a, b) => b.updatedAt - a.updatedAt),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof RequestFailure) return failureResponse(error, "");
    return NextResponse.json({ enabled: true, projects: [], error: error instanceof Error ? error.message : "Could not read shared projects" }, { status: 500 });
  }
}

/**
 * Die Suche durch den ganzen Speicher, von oben.
 *
 * Eine Auflistung zeigt immer nur einen Ordner; wer etwas sucht, weiss aber
 * gerade nicht, in welchem es liegt. Deshalb laeuft die Suche ueber den ganzen
 * Baum und schreibt zu jedem Treffer den Ordner dazu, in dem er steht.
 *
 * Sie ist bewusst begrenzt - Treffer, Tiefe und Anzahl der Ordner -, damit ein
 * verirrter Baum die Antwort nicht aufhaelt; `truncated` sagt, dass abgebrochen
 * wurde. Verknuepfungen zaehlen nicht als Ordner, sonst liefe die Suche im
 * Kreis.
 */
async function searchStore(root: string, term: string) {
  const needle = term.trim().toLowerCase();
  const projects: SharedProjectFile[] = [];
  const folders: Array<{ name: string; path: string; projects: number; folders: number }> = [];
  let truncated = false;
  let visited = 0;

  const walk = async (folder: string, depth: number): Promise<void> => {
    if (depth > SEARCH_DEPTH_LIMIT || visited >= SEARCH_FOLDER_LIMIT) {
      truncated = true;
      return;
    }
    visited += 1;
    const entries = await fs.readdir(folder, { withFileTypes: true }).catch(() => []);
    const folderPath = folderKey(root, folder);
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      if (projects.length + folders.length >= SEARCH_RESULT_LIMIT) {
        truncated = true;
        return;
      }
      const full = path.join(folder, entry.name);
      if (entry.isDirectory()) {
        if (entry.name.toLowerCase().includes(needle)) {
          folders.push({ name: entry.name, path: folderPath, ...(await folderContentsCount(full)) });
        }
        await walk(full, depth + 1);
        continue;
      }
      if (!entry.isFile() || !/\.(lyl|skf)$/i.test(entry.name)) continue;
      const name = entry.name.replace(/\.(lyl|skf)$/i, "");
      if (!name.toLowerCase().includes(needle)) continue;
      const stat = await regularFileStat(full);
      if (!stat) continue;
      const revision = revisionForStat(stat);
      const thumbnail = await regularFileStat(sharedThumbnailPath(folder, entry.name, revision));
      projects.push(projectRecord(entry.name, stat, Boolean(thumbnail), folderPath));
    }
  };

  await walk(root, 0);
  return NextResponse.json(
    {
      enabled: true,
      search: term,
      truncated,
      folders: folders.sort((a, b) => a.name.localeCompare(b.name)),
      projects: projects.sort((a, b) => b.updatedAt - a.updatedAt),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * Every design in the store, from the top: the number on the start page's tab and what
 * "Download all" packs. The same bounds as the search, so a stray tree cannot hold the
 * answer up, and links are not followed as folders.
 */
async function storeDesigns(root: string) {
  const designs: Array<{ folder: string; fileName: string }> = [];
  const emptyFolders: string[] = [];
  let truncated = false;
  let visited = 0;
  const walk = async (folder: string, depth: number): Promise<void> => {
    if (depth > SEARCH_DEPTH_LIMIT || visited >= SEARCH_FOLDER_LIMIT) {
      truncated = true;
      return;
    }
    visited += 1;
    const entries = (await fs.readdir(folder, { withFileTypes: true }).catch(() => [])).filter((entry) => !entry.name.startsWith("."));
    if (depth > 0 && entries.length === 0) emptyFolders.push(folderKey(root, folder));
    for (const entry of entries) {
      // The custom shapes keep their own folder in the store; they are shapes, not designs.
      if (entry.isDirectory() && depth === 0 && entry.name === CUSTOM_SHAPES_FOLDER) continue;
      if (entry.isDirectory()) await walk(path.join(folder, entry.name), depth + 1);
      else if (entry.isFile() && /\.(lyl|skf)$/i.test(entry.name)) designs.push({ folder, fileName: entry.name });
    }
  };
  await walk(root, 0);
  return { designs, emptyFolders, truncated };
}

/** Every design with the folder it is in, and the folders with nothing in them, for "Download all". */
async function allDesigns(root: string) {
  const { designs, emptyFolders, truncated } = await storeDesigns(root);
  const projects = await Promise.all(designs.map(async ({ folder, fileName }) => {
    const stat = await regularFileStat(path.join(folder, fileName));
    if (!stat) return null;
    const thumbnail = await regularFileStat(sharedThumbnailPath(folder, fileName, revisionForStat(stat)));
    return projectRecord(fileName, stat, Boolean(thumbnail), folderKey(root, folder));
  }));
  return NextResponse.json(
    { enabled: true, truncated, emptyFolders, projects: projects.filter((entry): entry is SharedProjectFile => Boolean(entry)) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** Creating a folder is the one write that touches no project at all. */
async function createFolder(root: string, folder: string, name: string) {
  const wanted = name.trim();
  if (storeFolderNameProblem(wanted, []) !== null) throw new RequestFailure("That folder name is not allowed", 400);
  const target = path.join(folder, wanted);
  if (await fs.stat(target).then(() => true, () => false)) {
    throw new RequestFailure("A folder of that name is already there", 409);
  }
  await fs.mkdir(target);
  return NextResponse.json({ created: true, path: folderKey(root, target) }, { status: 201, headers: { "Cache-Control": "no-store" } });
}

/** The store's own folder for custom shapes, at its top level: the shapes are found by that name. */
function isCustomShapesFolder(root: string, folder: string) {
  return path.dirname(folder) === root && path.basename(folder) === CUSTOM_SHAPES_FOLDER;
}

/**
 * Renaming a folder. The projects inside travel with it, and so do their
 * pictures - they live in the folder, not in a register somewhere else.
 */
async function renameFolder(root: string, folder: string, name: string) {
  if (folder === root) throw new RequestFailure("The store folder itself cannot be renamed", 400);
  if (isCustomShapesFolder(root, folder)) throw new RequestFailure("The custom shapes folder cannot be renamed", 400);
  const wanted = name.trim();
  if (storeFolderNameProblem(wanted, []) !== null) throw new RequestFailure("That folder name is not allowed", 400);
  const current = path.basename(folder);
  if (wanted === current) throw new RequestFailure("That folder is already called that", 409);
  const target = path.join(path.dirname(folder), wanted);
  // A file system that ignores case reports the folder itself as being in the
  // way when only the spelling of the name changes. That one is allowed.
  const sameFolderInOtherCase = wanted.toLowerCase() === current.toLowerCase();
  if (!sameFolderInOtherCase && await fs.stat(target).then(() => true, () => false)) {
    throw new RequestFailure("A folder of that name is already there", 409);
  }
  await fs.rename(folder, target);
  return NextResponse.json(
    { renamed: true, from: folderKey(root, folder), path: folderKey(root, target) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * Moving a project into another folder.
 *
 * Only the file and its picture travel; nothing is rewritten. rename() keeps
 * the modification time, so the revision the browser holds - and with it the
 * thumbnail's name - survives the move.
 */
async function moveProject(root: string, folder: string, requestedTarget: string, request: Request) {
  const requestUrl = new URL(request.url);
  const requested = requestUrl.searchParams.get("fileName") ?? "";
  if (!requested) throw new RequestFailure("Shared project name is required", 400);
  const fileName = existingProjectFileName(requested);
  if (fileName !== requested) throw new RequestFailure("Invalid shared project name", 400);

  const target = await resolveFolder(root, requestedTarget);
  if (target === folder) throw new RequestFailure("That project is already in this folder", 409);

  const filePath = path.join(folder, fileName);
  const sourceLock = await acquireLock(filePath);
  try {
    const currentStat = await regularFileStat(filePath);
    if (!currentStat) throw new RequestFailure("Shared project was not found", 404);
    const currentRevision = revisionForStat(currentStat);
    const expectedRevision = unquoteEtag(request.headers.get("if-match"));
    if (!expectedRevision) {
      throw new RequestFailure("Reload shared projects before moving so the current revision can be verified", 428, { currentRevision });
    }
    if (expectedRevision !== currentRevision) {
      throw new RequestFailure("The shared project changed after you loaded it. Refresh the shared projects list and try again.", 409, { currentRevision });
    }

    const targetPath = path.join(target, fileName);
    if (await fs.stat(targetPath).then(() => true, () => false)) {
      throw new RequestFailure("A project of that name is already in that folder", 409);
    }
    await fs.rename(filePath, targetPath);

    const movedStat = await fs.stat(targetPath);
    const movedRevision = revisionForStat(movedStat);
    const thumbnail = sharedThumbnailPath(folder, fileName, currentRevision);
    let hasThumbnail = false;
    if (await regularFileStat(thumbnail)) {
      await fs.mkdir(path.join(target, SHARED_THUMBNAILS_DIR), { recursive: true });
      hasThumbnail = await fs.rename(thumbnail, sharedThumbnailPath(target, fileName, movedRevision)).then(() => true, () => false);
    }
    const record = projectRecord(fileName, movedStat, hasThumbnail, folderKey(root, target));
    return NextResponse.json(
      { project: record, movedFrom: folderKey(root, folder) },
      { headers: { "Cache-Control": "no-store", ETag: `"${record.revision}"` } },
    );
  } finally {
    await sourceLock.handle.close().catch(() => undefined);
    await fs.unlink(sourceLock.lockPath).catch(() => undefined);
  }
}

/**
 * Giving a project another file name inside its own folder (#265): the file is renamed, its picture
 * goes with it, and nothing else changes - the revision stays the file's own, the bytes stay as they are.
 */
async function renameProjectFile(root: string, folder: string, requestedName: string, request: Request) {
  const requestUrl = new URL(request.url);
  const requested = requestUrl.searchParams.get("fileName") ?? "";
  if (!requested) throw new RequestFailure("Shared project name is required", 400);
  const fileName = existingProjectFileName(requested);
  if (fileName !== requested) throw new RequestFailure("Invalid shared project name", 400);

  const newFileName = safeProjectFileName(requestedName);
  if (newFileName === fileName) throw new RequestFailure("The project already has that name", 409);

  const filePath = path.join(folder, fileName);
  const newPath = path.join(folder, newFileName);
  const sourceLock = await acquireLock(filePath);
  try {
    const currentStat = await regularFileStat(filePath);
    if (!currentStat) throw new RequestFailure("Shared project was not found", 404);
    const currentRevision = revisionForStat(currentStat);
    const expectedRevision = unquoteEtag(request.headers.get("if-match"));
    if (!expectedRevision) {
      throw new RequestFailure("Reload shared projects before renaming so the current revision can be verified", 428, { currentRevision });
    }
    if (expectedRevision !== currentRevision) {
      throw new RequestFailure("The shared project changed after you loaded it. Refresh the shared projects list and try again.", 409, { currentRevision });
    }
    if (await fs.stat(newPath).then(() => true, () => false)) {
      throw new RequestFailure("A project of that name is already in this folder", 409);
    }
    await fs.rename(filePath, newPath);

    const renamedStat = await fs.stat(newPath);
    const renamedRevision = revisionForStat(renamedStat);
    const thumbnail = sharedThumbnailPath(folder, fileName, currentRevision);
    let hasThumbnail = false;
    if (await regularFileStat(thumbnail)) {
      hasThumbnail = await fs.rename(thumbnail, sharedThumbnailPath(folder, newFileName, renamedRevision)).then(() => true, () => false);
    }
    const record = projectRecord(newFileName, renamedStat, hasThumbnail, folderKey(root, folder));
    return NextResponse.json(
      { project: record, renamedFrom: fileName },
      { headers: { "Cache-Control": "no-store", ETag: `"${record.revision}"` } },
    );
  } finally {
    await sourceLock.handle.close().catch(() => undefined);
    await fs.unlink(sourceLock.lockPath).catch(() => undefined);
  }
}

/**
 * Duplicating a project inside its own folder.
 *
 * The file is copied, not repacked: the duplicate carries exactly the geometry
 * of the original, down to the byte, and its picture travels with it under the
 * new file's revision. The name inside the package still says the original - it
 * is put right by the first save, and until then the file name is what the
 * dashboard shows.
 */
async function copyProject(root: string, folder: string, requestedName: string, request: Request) {
  const requestUrl = new URL(request.url);
  const requested = requestUrl.searchParams.get("fileName") ?? "";
  if (!requested) throw new RequestFailure("Shared project name is required", 400);
  const fileName = existingProjectFileName(requested);
  if (fileName !== requested) throw new RequestFailure("Invalid shared project name", 400);

  const copyFileName = safeProjectFileName(requestedName);
  if (copyFileName === fileName) throw new RequestFailure("The copy needs a name of its own", 409);

  const filePath = path.join(folder, fileName);
  const sourceLock = await acquireLock(filePath);
  let copyLock: Awaited<ReturnType<typeof acquireLock>> | null = null;
  try {
    const currentStat = await regularFileStat(filePath);
    if (!currentStat) throw new RequestFailure("Shared project was not found", 404);
    const currentRevision = revisionForStat(currentStat);
    const expectedRevision = unquoteEtag(request.headers.get("if-match"));
    if (!expectedRevision) {
      throw new RequestFailure("Reload shared projects before duplicating so the current revision can be verified", 428, { currentRevision });
    }
    if (expectedRevision !== currentRevision) {
      throw new RequestFailure("The shared project changed after you loaded it. Refresh the shared projects list and try again.", 409, { currentRevision });
    }

    const copyPath = path.join(folder, copyFileName);
    copyLock = await acquireLock(copyPath);
    // COPYFILE_EXCL rather than asking first: between a question and a write
    // somebody else could take the name.
    await fs.copyFile(filePath, copyPath, fsConstants.COPYFILE_EXCL).catch((error: unknown) => {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") {
        throw new RequestFailure("A project of that name is already in that folder", 409);
      }
      throw error;
    });

    const copyStat = await fs.stat(copyPath);
    const copyRevision = revisionForStat(copyStat);
    const thumbnail = sharedThumbnailPath(folder, fileName, currentRevision);
    let hasThumbnail = false;
    if (await regularFileStat(thumbnail)) {
      await fs.mkdir(path.join(folder, SHARED_THUMBNAILS_DIR), { recursive: true });
      hasThumbnail = await fs.copyFile(thumbnail, sharedThumbnailPath(folder, copyFileName, copyRevision)).then(() => true, () => false);
    }
    const record = projectRecord(copyFileName, copyStat, hasThumbnail, folderKey(root, folder));
    return NextResponse.json(
      { project: record, copiedFrom: fileName },
      { status: 201, headers: { "Cache-Control": "no-store", ETag: `"${record.revision}"` } },
    );
  } finally {
    for (const lock of [sourceLock, copyLock]) {
      if (!lock) continue;
      await lock.handle.close().catch(() => undefined);
      await fs.unlink(lock.lockPath).catch(() => undefined);
    }
  }
}

/**
 * Removing a folder. An empty one goes without further ado; one that still
 * holds something needs `recursive=1`, so a request that lost its way cannot
 * take a tree of projects with it.
 */
async function deleteFolder(root: string, folder: string, recursive: boolean) {
  if (folder === root) throw new RequestFailure("The store folder itself cannot be removed", 400);
  if (isCustomShapesFolder(root, folder)) throw new RequestFailure("The custom shapes folder cannot be removed", 400);
  const counts = await folderContentsCount(folder);
  if (!recursive && (counts.projects > 0 || counts.folders > 0 || counts.files > 0)) {
    throw new RequestFailure("That folder is not empty", 409, counts);
  }
  await removeFolderTree(folder);
  return NextResponse.json({ deleted: true, path: folderKey(root, folder), ...counts }, { headers: { "Cache-Control": "no-store" } });
}

/** The name an export is written under: a clean stem and one of the known extensions, or null. */
function exportFileName(requestedName: string) {
  const extension = /\.([a-z0-9]+)$/i.exec(requestedName)?.[1].toLowerCase() ?? "";
  if (!EXPORT_FILE_EXTENSIONS.includes(extension)) return null;
  const stem = path.basename(requestedName.slice(0, -(extension.length + 1)))
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
    .replace(/\s+/g, " ")
    .replace(/^[.\s]+/, "")
    .trim()
    .slice(0, 115) || "Untitled export";
  return `${stem}.${extension}`;
}

/**
 * An export file - STL, 3MF, OBJ, STEP, SVG, PNG or PDF - written into a folder of the store (#779), so a
 * slicer that shares the folder can open it. It is no project: the list does not show it. A file of that
 * name is replaced only when the request says so (`overwrite=1`); otherwise the answer is 409 with `exists`.
 */
async function saveExportFile(root: string, folder: string, requestedName: string, request: Request) {
  const fileName = exportFileName(requestedName);
  if (!fileName) throw new RequestFailure("That file type cannot be saved on the server", 400);
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > LYL_LIMITS.archiveBytes) {
    throw new RequestFailure("The file exceeds the shared storage size limit", 413);
  }
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength === 0) throw new RequestFailure("The file was empty", 400);
  if (bytes.byteLength > LYL_LIMITS.archiveBytes) throw new RequestFailure("The file exceeds the shared storage size limit", 413);

  const filePath = path.join(folder, fileName);
  const temporaryPath = path.join(folder, `.${fileName}.${randomUUID()}.tmp`);
  const lock = await acquireLock(filePath);
  try {
    const currentStat = await regularFileStat(filePath);
    if (currentStat && new URL(request.url).searchParams.get("overwrite") !== "1") {
      throw new RequestFailure(`${fileName} is already in that folder`, 409, { exists: true, fileName });
    }
    const handle = await fs.open(temporaryPath, "wx");
    try {
      await handle.writeFile(bytes);
      await handle.sync();
    } finally {
      await handle.close();
    }
    await fs.rename(temporaryPath, filePath);
    const savedStat = await fs.stat(filePath);
    return NextResponse.json(
      { file: { fileName, path: folderKey(root, folder), size: savedStat.size } },
      { status: currentStat ? 200 : 201, headers: { "Cache-Control": "no-store" } },
    );
  } finally {
    await fs.unlink(temporaryPath).catch(() => undefined);
    await lock.handle.close().catch(() => undefined);
    await fs.unlink(lock.lockPath).catch(() => undefined);
  }
}

/**
 * The settings kept for every browser that uses this store: what "Make default" saved, so a new design starts with it even after the browser forgot it. One JSON file in
 * a hidden folder - a listing skips names that begin with a dot - under a name the request picks from a
 * fixed list, never from what it sent. The server only checks that it is a JSON object; the app makes
 * sense of the values when it reads them, as it does with its own browser copy.
 */
const SETTINGS_DIR = ".settings";
const SETTINGS_NAMES = ["default"];
const MAX_SETTINGS_BYTES = 256 * 1024;

function settingsPath(root: string, requested: string) {
  if (!SETTINGS_NAMES.includes(requested)) throw new RequestFailure("Unknown settings", 400);
  return path.join(root, SETTINGS_DIR, `${requested}.json`);
}

async function readSettings(root: string, requested: string) {
  const filePath = settingsPath(root, requested);
  const stat = await regularFileStat(filePath);
  let settings: unknown = null;
  if (stat) {
    try {
      settings = JSON.parse(await fs.readFile(filePath, "utf8"));
    } catch {
      settings = null;
    }
  }
  return NextResponse.json(
    { enabled: true, settings: settings && typeof settings === "object" && !Array.isArray(settings) ? settings : null },
    { headers: { "Cache-Control": "no-store" } },
  );
}

async function saveSettings(root: string, requested: string, request: Request) {
  const filePath = settingsPath(root, requested);
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_SETTINGS_BYTES) throw new RequestFailure("The settings are too large", 413);
  const text = await request.text();
  if (text.length > MAX_SETTINGS_BYTES) throw new RequestFailure("The settings are too large", 413);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new RequestFailure("The settings are not JSON", 400);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new RequestFailure("The settings are not JSON", 400);
  const folder = path.dirname(filePath);
  await fs.mkdir(folder, { recursive: true });
  const temporaryPath = path.join(folder, `.${requested}.${randomUUID()}.tmp`);
  try {
    await fs.writeFile(temporaryPath, JSON.stringify(parsed), { flag: "wx" });
    await fs.rename(temporaryPath, filePath);
  } finally {
    await fs.unlink(temporaryPath).catch(() => undefined);
  }
  return NextResponse.json({ saved: true }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request: Request) {
  const root = sharedProjectsDirectory(request);
  if (!root) return NextResponse.json({ error: "Shared project storage is disabled" }, { status: 404 });
  if (!sameOriginRequest(request)) return NextResponse.json({ error: "Shared projects only accept same-origin deletes" }, { status: 403 });

  let lockHandle: Awaited<ReturnType<typeof fs.open>> | null = null;
  let lockPath = "";
  try {
    await ensureSharedRoot(root);
    const requestUrl = new URL(request.url);
    const folder = await resolveFolder(root, requestUrl.searchParams.get("path"));
    if (requestUrl.searchParams.get("deleteFolder") === "1") {
      return await deleteFolder(root, folder, requestUrl.searchParams.get("recursive") === "1");
    }

    const requestedFile = requestUrl.searchParams.get("fileName");
    if (!requestedFile) return NextResponse.json({ error: "Shared project name is required" }, { status: 400 });
    const fileName = existingProjectFileName(requestedFile);
    if (fileName !== requestedFile) return NextResponse.json({ error: "Invalid shared project name" }, { status: 400 });

    const filePath = path.join(folder, fileName);
    const lock = await acquireLock(filePath);
    lockHandle = lock.handle;
    lockPath = lock.lockPath;

    const currentStat = await regularFileStat(filePath);
    if (!currentStat) return NextResponse.json({ error: "Shared project was not found" }, { status: 404 });

    const currentRevision = revisionForStat(currentStat);
    const expectedRevision = unquoteEtag(request.headers.get("if-match"));
    if (!expectedRevision) {
      return NextResponse.json(
        { error: "Reload shared projects before deleting so the current revision can be verified", currentRevision },
        { status: 428 },
      );
    }
    if (expectedRevision !== currentRevision) {
      return NextResponse.json(
        { error: "The shared project changed after you loaded it. Refresh the shared projects list and try again.", currentRevision },
        { status: 409 },
      );
    }

    const thumbnailPath = sharedThumbnailPath(folder, fileName, currentRevision);
    await fs.unlink(filePath);
    await fs.unlink(thumbnailPath).catch((error) => {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    });
    return NextResponse.json(
      { deleted: true, fileName },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return failureResponse(error, "Could not delete shared project");
  } finally {
    if (lockHandle) await lockHandle.close().catch(() => undefined);
    if (lockPath) await fs.unlink(lockPath).catch(() => undefined);
  }
}

export async function POST(request: Request) {
  const root = sharedProjectsDirectory(request);
  if (!root) return NextResponse.json({ error: "Shared project storage is disabled" }, { status: 404 });
  if (!sameOriginRequest(request)) return NextResponse.json({ error: "Shared projects only accept same-origin saves" }, { status: 403 });

  let lockHandle: Awaited<ReturnType<typeof fs.open>> | null = null;
  let lockPath = "";
  let temporaryPath = "";
  let temporaryThumbnailPath = "";
  try {
    await ensureSharedRoot(root);
    const requestUrl = new URL(request.url);
    const folder = await resolveFolder(root, requestUrl.searchParams.get("path"));
    const folderPath = folderKey(root, folder);

    // The four writes that are not a project upload, in the order store.php
    // answers them. An empty moveTo is the store's own root, so that one is
    // asked for by presence rather than by value.
    const newFolder = requestUrl.searchParams.get("folder");
    if (newFolder) return await createFolder(root, folder, newFolder);
    const renameTo = requestUrl.searchParams.get("renameTo");
    if (renameTo) return await renameFolder(root, folder, renameTo);
    const moveTo = requestUrl.searchParams.get("moveTo");
    if (moveTo !== null) return await moveProject(root, folder, moveTo, request);
    const copyTo = requestUrl.searchParams.get("copyTo");
    if (copyTo) return await copyProject(root, folder, copyTo, request);
    const renameFileTo = requestUrl.searchParams.get("renameFileTo");
    if (renameFileTo) return await renameProjectFile(root, folder, renameFileTo, request);
    const exportFile = requestUrl.searchParams.get("exportFile");
    if (exportFile) return await saveExportFile(root, folder, exportFile, request);
    const settings = requestUrl.searchParams.get("settings");
    if (settings) return await saveSettings(root, settings, request);

    const declaredLength = Number(request.headers.get("content-length") ?? 0);
    const multipartRequest = request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data") ?? false;
    const requestLimit = LYL_LIMITS.archiveBytes + (multipartRequest ? MAX_THUMBNAIL_BYTES + MAX_MULTIPART_OVERHEAD_BYTES : 0);
    if (Number.isFinite(declaredLength) && declaredLength > requestLimit) {
      return NextResponse.json({ error: ".lyl file exceeds the shared storage size limit" }, { status: 413 });
    }

    const { projectBytes: bytes, thumbnailBytes } = await sharedProjectRequestBytes(request);
    if (bytes.byteLength > LYL_LIMITS.archiveBytes) return NextResponse.json({ error: ".lyl file exceeds the shared storage size limit" }, { status: 413 });
    const summary = await inspectLylProjectPackage(bytes);
    const fileName = safeProjectFileName(requestUrl.searchParams.get("fileName") ?? summary.projectName);
    const filePath = path.join(folder, fileName);
    temporaryPath = path.join(folder, `.${fileName}.${randomUUID()}.tmp`);

    const lock = await acquireLock(filePath);
    lockHandle = lock.handle;
    lockPath = lock.lockPath;

    const currentStat = await regularFileStat(filePath);
    const currentRevision = currentStat ? revisionForStat(currentStat) : null;
    const expectedRevision = unquoteEtag(request.headers.get("if-match"));
    const createOnly = request.headers.get("if-none-match") === "*";
    if (currentStat && (createOnly || !expectedRevision || expectedRevision !== currentRevision)) {
      return NextResponse.json(
        { error: "The shared project changed after you opened it. Reload it or save under a different name.", currentRevision },
        { status: 409 },
      );
    }
    if (!currentStat && expectedRevision) {
      return NextResponse.json({ error: "The shared project no longer exists. Save it under a different name." }, { status: 409 });
    }

    const temporaryHandle = await fs.open(temporaryPath, "wx");
    try {
      await temporaryHandle.writeFile(bytes);
      await temporaryHandle.sync();
    } finally {
      await temporaryHandle.close();
    }
    const pendingStat = await fs.stat(temporaryPath);
    const savedRevision = revisionForStat(pendingStat);
    if (thumbnailBytes) {
      const thumbnailsRoot = path.join(folder, SHARED_THUMBNAILS_DIR);
      await fs.mkdir(thumbnailsRoot, { recursive: true });
      temporaryThumbnailPath = path.join(thumbnailsRoot, `.${fileName}.${randomUUID()}.tmp`);
      const thumbnailHandle = await fs.open(temporaryThumbnailPath, "wx");
      try {
        await thumbnailHandle.writeFile(thumbnailBytes);
        await thumbnailHandle.sync();
      } finally {
        await thumbnailHandle.close();
      }
      await fs.rename(temporaryThumbnailPath, sharedThumbnailPath(folder, fileName, savedRevision));
      temporaryThumbnailPath = "";
    }
    await fs.rename(temporaryPath, filePath);
    temporaryPath = "";
    const savedStat = await fs.stat(filePath);
    const project = projectRecord(fileName, savedStat, Boolean(thumbnailBytes), folderPath);
    // Moving the file can change its modification time, so the thumbnail is
    // named after the revision the project ended up with.
    if (thumbnailBytes && savedRevision !== project.revision) {
      await fs.rename(sharedThumbnailPath(folder, fileName, savedRevision), sharedThumbnailPath(folder, fileName, project.revision)).catch(() => undefined);
    }
    if (currentRevision && currentRevision !== project.revision) {
      await fs.unlink(sharedThumbnailPath(folder, fileName, currentRevision)).catch(() => undefined);
    }
    return NextResponse.json(
      { project: { ...project, name: summary.projectName } },
      { status: currentStat ? 200 : 201, headers: { "Cache-Control": "no-store", ETag: `"${project.revision}"` } },
    );
  } catch (error) {
    return failureResponse(error, "Could not save shared project", 400);
  } finally {
    if (lockHandle) await lockHandle.close().catch(() => undefined);
    if (temporaryPath) await fs.unlink(temporaryPath).catch(() => undefined);
    if (temporaryThumbnailPath) await fs.unlink(temporaryThumbnailPath).catch(() => undefined);
    if (lockPath) await fs.unlink(lockPath).catch(() => undefined);
  }
}
