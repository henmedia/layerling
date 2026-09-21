"use client";

import { Clock3, Copy, EllipsisVertical, FileUp, FolderInput, FolderKanban, FolderPlus, FolderUp, Grid3X3, List, Pencil, Plus, RefreshCw, Search, SlidersHorizontal, Sparkles, Trash2, X } from "lucide-react";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { AppFooter } from "@/components/AppFooter";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { useAppUpdate } from "@/lib/useAppUpdate";
import { sharedProjectSaveTarget } from "@/lib/sharedProjectTarget";
import { storeFolderNameProblem, suggestStoreFolderName } from "@/lib/storeFolderName";
import { LayerlingEditor, importedShapeFromObj, importedShapeFromStl, importedShapeFromSvg } from "@/components/LayerlingEditor";
import { applyAppTheme, readStoredAppTheme, resolveAppTheme, storeAppTheme, type AppThemePreference, type ResolvedAppTheme } from "@/lib/appTheme";
import { hydrateEditorHistoryState, notesForHistoryIndex, type EditorHistoryEntry } from "@/lib/editorHistory";
import { detectLanguage, setLanguage, t, type Language } from "@/lib/i18n";
import { duplicateName, type DuplicateNamePatterns } from "@/lib/duplicateName";
import { migrateLegacyProjectShapes, migrateLegacyStorageKeys, PROJECT_SHAPES_DB_NAME } from "@/lib/storageMigration";
import { useLanguage } from "@/lib/useLanguage";
import { createLocalId } from "@/lib/localIds";
import {
  horizontalPlacementWorkplane,
  normalizePlacementWorkplane,
  placementWorkplaneFingerprint,
  type PlacementWorkplane,
} from "@/lib/placementWorkplane";
import { attachProjectAsset, dedupeProjectAssets, projectAssetFromBytes, sourceFormatForFileName } from "@/lib/projectAssets";
import { hydrateProjectShapeState, reconcileLoadedProjectShapeCacheEntry, type ImportedMeshResource } from "@/lib/projectShapePersistence";
import { exportLylProject, importLylProject, LYL_CREATED_WITH_VERSION, LYL_MEDIA_TYPE } from "@/lib/lylProject";
import { importExtensionSupported } from "@/lib/importExtensions";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE, normalizeSnapGrid, normalizeWorkspaceSettings, workplaneSettingsFingerprint } from "@/lib/workplaneSettings";
import type { GridSize, ProjectAsset, WorkplaneShape, WorkplaneWorkspaceSettings } from "@/types/layerling";

type AppView = "dashboard" | "editor";
type ViewMode = "grid" | "list";
type DashboardSection = "home" | "shared";

type DashboardProject = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  shapes: number;
  accent: "cyan" | "green" | "gold" | "red";
  thumbnailUrl?: string | null;
  thumbnailVersion?: number;
  revision?: number;
  workspace?: WorkplaneWorkspaceSettings;
  snapGrid?: GridSize;
  placementElevation?: number;
  placementWorkplane?: PlacementWorkplane;
  sketchPlacementWorkplane?: PlacementWorkplane;
  sharedProject?: { fileName: string; revision: string; path?: string };
};

type SharedProject = {
  fileName: string;
  /** Folder inside the store, "" at the top. Projects saved before folders existed have none. */
  path?: string;
  name: string;
  updatedAt: number;
  size: number;
  revision: string;
  thumbnailUrl?: string;
};

/** Counts come with the listing, so a confirmation can say what is at stake. */
/** `path` traegt nur ein Suchtreffer: der Ordner, in dem dieser Ordner liegt. */
type SharedFolder = { name: string; path?: string; projects?: number; folders?: number };

/**
 * Was die Suche ueber den ganzen Serverspeicher gefunden hat. `query` steht
 * dabei, damit die Anzeige weiss, ob die Treffer noch zum Suchfeld passen -
 * getippt wird schneller, als geantwortet wird.
 */
type SharedSearchResult = {
  query: string;
  projects: SharedProject[];
  folders: SharedFolder[];
  truncated: boolean;
};

/** The query both endpoints expect: the file, and the folder when there is one. */
function storeQuery(path: string, fileName?: string) {
  const query = new URLSearchParams();
  if (fileName) query.set("fileName", fileName);
  if (path) query.set("path", path);
  return query.toString();
}

/**
 * Ein Entwurf auf dem Server, eindeutig benannt. Der Dateiname allein reicht
 * nicht: In einer Trefferliste stehen Entwuerfe aus mehreren Ordnern
 * nebeneinander, und zwei davon duerfen durchaus gleich heissen.
 */
function sharedProjectKey(project: Pick<SharedProject, "fileName" | "path">) {
  return `${project.path ?? ""}/${project.fileName}`;
}

/** Joins a folder path with a name, without leaving a stray slash at the front. */
function joinStorePath(path: string, name: string) {
  return path ? `${path}/${name}` : name;
}

/** The folder one level up, or "" when already at the top. */
function parentStorePath(path: string) {
  const cut = path.lastIndexOf("/");
  return cut === -1 ? "" : path.slice(0, cut);
}

type StoredDashboardProject = Partial<DashboardProject> & {
  designShapes?: unknown;
};

type ProjectShapeCacheEntry = {
  revision: number;
  shapes: WorkplaneShape[];
  history: EditorHistoryEntry[];
  historyIndex: number;
  assets: ProjectAsset[];
};

type ProjectShapeRecord = {
  id: string;
  revision: number;
  lylPackage?: Uint8Array;
  /** The same package under the field name used before the rename. Read, never written. */
  skfPackage?: Uint8Array;
  shapes?: WorkplaneShape[];
  history?: EditorHistoryEntry[];
  historyIndex?: number;
  assets?: ProjectAsset[];
  meshResourceIds?: string[];
  assetResourceIds?: string[];
  updatedAt: number;
};

type ProjectShapeSaveContext = {
  projectName: string;
  createdAt: number;
  workspace: WorkplaneWorkspaceSettings;
  snapGrid: GridSize;
  placementElevation: number;
  placementWorkplane: PlacementWorkplane;
  sketchPlacementWorkplane: PlacementWorkplane;
};

type ProjectShapeResourceRecord =
  | {
      id: string;
      projectId: string;
      resourceId: string;
      kind: "mesh";
      mesh: ImportedMeshResource;
    }
  | {
      id: string;
      projectId: string;
      resourceId: string;
      kind: "asset";
      asset: ProjectAsset;
    };

const PROJECTS_STORAGE_KEY = "layerling.projects";
/** So lang darf ein Entwurfsname werden - so lang kuerzt auch das Umbenennen. */
const PROJECT_NAME_LIMIT = 80;
/** Und so lang der Dateiname auf dem Server, ohne Endung: beide Speicher kuerzen dort. */
const SHARED_PROJECT_NAME_LIMIT = 115;
const PROJECT_SHAPES_STORE_NAME = "projectShapes";
const PROJECT_SHAPE_RESOURCES_STORE_NAME = "projectShapeResources";
const PROJECT_NAME_TOOLBAR_STORAGE_KEY = "layerling.showProjectNameInToolbar";
const PROJECT_ACCENTS: DashboardProject["accent"][] = ["cyan", "green", "gold", "red"];
const STATIC_EXPORT_BUILD = process.env.NEXT_PUBLIC_STATIC_EXPORT === "true";
// Two ways to the same shared folder. The Node build answers on its own route;
// an installation served as plain files has no route, so it asks store.php,
// which speaks the same JSON. The path stays relative because the app may be
// served from a sub-directory.
const SHARED_PROJECTS_ENDPOINT = STATIC_EXPORT_BUILD ? "store.php" : "/api/shared-projects";
const EDITOR_SKELETON_MIN_DURATION_MS = 320;
const knownProjectResourceKeys = new Map<string, Set<string>>();

function formatUpdated(timestamp: number, language: Language) {
  const age = Date.now() - timestamp;
  if (age < 60_000) return t("dashboard.justNow");
  if (age < 3_600_000) return t("dashboard.minutesAgo", { count: Math.max(1, Math.round(age / 60_000)) });
  if (age < 86_400_000) return t("dashboard.today");
  return new Intl.DateTimeFormat(language, { month: "short", day: "numeric" }).format(new Date(timestamp));
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

function projectShapeCacheEntry(
  revision: number,
  shapes: WorkplaneShape[],
  history?: EditorHistoryEntry[],
  historyIndex?: number,
  assets: ProjectAsset[] = [],
): ProjectShapeCacheEntry {
  const hydrated = hydrateEditorHistoryState(shapes, history, historyIndex, "unlimited", notesForHistoryIndex(history, historyIndex));
  return {
    revision,
    shapes: hydrated.entries[hydrated.index]?.shapes ?? shapes,
    history: hydrated.entries,
    historyIndex: hydrated.index,
    assets: dedupeProjectAssets(assets),
  };
}

function projectShapeCacheEntryFromEditor(
  revision: number,
  shapes: WorkplaneShape[],
  history: EditorHistoryEntry[],
  historyIndex: number,
  assets: ProjectAsset[],
): ProjectShapeCacheEntry {
  if (history.length === 0) {
    return projectShapeCacheEntry(revision, shapes, history, historyIndex, assets);
  }
  return {
    revision,
    shapes,
    history,
    historyIndex: Math.min(Math.max(0, historyIndex), history.length - 1),
    assets: dedupeProjectAssets(assets),
  };
}

function projectShapeSaveContext(project: Pick<DashboardProject, "name" | "createdAt" | "workspace" | "snapGrid" | "placementElevation" | "placementWorkplane" | "sketchPlacementWorkplane">): ProjectShapeSaveContext {
  const placementElevation = Number.isFinite(project.placementElevation) ? project.placementElevation ?? 0 : 0;
  return {
    projectName: project.name,
    createdAt: project.createdAt,
    workspace: normalizeWorkspaceSettings(project.workspace),
    snapGrid: normalizeSnapGrid(project.snapGrid),
    placementElevation,
    placementWorkplane: normalizePlacementWorkplane(project.placementWorkplane, placementElevation),
    sketchPlacementWorkplane: normalizePlacementWorkplane(project.sketchPlacementWorkplane),
  };
}

function openProjectShapesConnection() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("Project shape storage is unavailable"));
      return;
    }

    const request = window.indexedDB.open(PROJECT_SHAPES_DB_NAME, 3);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(PROJECT_SHAPES_STORE_NAME)) {
        database.createObjectStore(PROJECT_SHAPES_STORE_NAME, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(PROJECT_SHAPE_RESOURCES_STORE_NAME)) {
        database.createObjectStore(PROJECT_SHAPE_RESOURCES_STORE_NAME, { keyPath: "id" });
      }
    };
    request.onerror = () => reject(request.error ?? new Error("Could not open project shape storage"));
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * The projects written before the rename live in a database of the old name.
 * They are carried over once per session, before the first read, so nobody
 * meets an empty dashboard.
 */
let projectShapesMigration: Promise<unknown> | null = null;

async function openProjectShapesDb() {
  if (typeof window !== "undefined" && window.indexedDB) {
    projectShapesMigration ??= migrateLegacyProjectShapes(window.indexedDB, openProjectShapesConnection, [
      PROJECT_SHAPES_STORE_NAME,
      PROJECT_SHAPE_RESOURCES_STORE_NAME,
    ]).catch(() => undefined);
    await projectShapesMigration;
  }
  return openProjectShapesConnection();
}

function projectResourceKey(kind: ProjectShapeResourceRecord["kind"], resourceId: string) {
  return `${kind}:${resourceId}`;
}

function projectResourceRecordId(projectId: string, kind: ProjectShapeResourceRecord["kind"], resourceId: string) {
  return `${projectId}:${projectResourceKey(kind, resourceId)}`;
}

async function loadProjectShapes(projectId: string) {
  const database = await openProjectShapesDb();
  const record = await new Promise<ProjectShapeRecord | null>((resolve, reject) => {
    const transaction = database.transaction(PROJECT_SHAPES_STORE_NAME, "readonly");
    const request = transaction.objectStore(PROJECT_SHAPES_STORE_NAME).get(projectId);
    request.onerror = () => reject(request.error ?? new Error("Could not load project shapes"));
    request.onsuccess = () => resolve((request.result as ProjectShapeRecord | undefined) ?? null);
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not load project shapes"));
  });
  if (!record) {
    database.close();
    return null;
  }
  const storedPackage = record.lylPackage ?? record.skfPackage;
  if (storedPackage) {
    database.close();
    const restored = await importLylProject(storedPackage);
    return {
      ...record,
      shapes: restored.shapes,
      history: restored.history,
      historyIndex: restored.historyIndex,
      assets: restored.assets,
    };
  }

  const meshResourceIds = record.meshResourceIds ?? [];
  const assetResourceIds = record.assetResourceIds ?? [];
  if (meshResourceIds.length === 0 && assetResourceIds.length === 0) {
    database.close();
    return {
      ...record,
      shapes: record.shapes ?? [],
    };
  }

  const resourceRecords = await new Promise<ProjectShapeResourceRecord[]>((resolve, reject) => {
    const transaction = database.transaction(PROJECT_SHAPE_RESOURCES_STORE_NAME, "readonly");
    const store = transaction.objectStore(PROJECT_SHAPE_RESOURCES_STORE_NAME);
    const records: ProjectShapeResourceRecord[] = [];
    const requests = [
      ...meshResourceIds.map((resourceId) => store.get(projectResourceRecordId(projectId, "mesh", resourceId))),
      ...assetResourceIds.map((resourceId) => store.get(projectResourceRecordId(projectId, "asset", resourceId))),
    ];
    requests.forEach((request) => {
      request.onsuccess = () => {
        if (request.result) records.push(request.result as ProjectShapeResourceRecord);
      };
      request.onerror = () => {
        transaction.abort();
      };
    });
    transaction.oncomplete = () => resolve(records);
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not load project shape resources"));
    transaction.onabort = () => reject(transaction.error ?? new Error("Could not load project shape resources"));
  });
  database.close();

  const meshResources = new Map<string, ImportedMeshResource>();
  const assets: ProjectAsset[] = [];
  resourceRecords.forEach((resource) => {
    if (resource.kind === "mesh") meshResources.set(resource.resourceId, resource.mesh);
    else assets.push(resource.asset);
  });
  if (meshResources.size !== meshResourceIds.length || assets.length !== assetResourceIds.length) {
    throw new Error("Project shape resources are incomplete");
  }
  knownProjectResourceKeys.set(projectId, new Set([
    ...meshResourceIds.map((resourceId) => projectResourceKey("mesh", resourceId)),
    ...assetResourceIds.map((resourceId) => projectResourceKey("asset", resourceId)),
  ]));
  const hydrated = hydrateProjectShapeState(record.shapes ?? [], record.history, meshResources);
  return {
    ...record,
    shapes: hydrated.shapes,
    history: hydrated.history,
    assets,
  };
}

/** The .lyl bytes of a project: the stored package, or a freshly packed one. */
async function projectPackageBytes(project: DashboardProject) {
  const stored = await loadProjectPackage(project.id);
  if (stored) return stored;
  const context = projectShapeSaveContext(project);
  return exportLylProject({
    projectId: project.id,
    projectName: context.projectName,
    createdAt: context.createdAt,
    modifiedAt: project.updatedAt,
    shapes: [],
    history: [],
    historyIndex: 0,
    assets: [],
    workspace: context.workspace,
    snapGrid: context.snapGrid,
    placementElevation: context.placementElevation,
    placementWorkplane: context.placementWorkplane,
    sketchPlacementWorkplane: context.sketchPlacementWorkplane,
    compressionLevel: 1,
  });
}

/** Die beiden Muster, aus denen der Name einer Kopie entsteht. */
function duplicateNamePatterns(): DuplicateNamePatterns {
  return { copy: t("dashboard.copyOf"), numbered: t("dashboard.copyOfNumbered") };
}

/** The card picture as a PNG the server will take, or nothing. */
async function projectThumbnailBlob(thumbnailUrl: string | null | undefined): Promise<Blob | null> {
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
 * Das Kartenbild als Datenadresse, egal wie es abgelegt ist: im statischen
 * Export steht es schon so da, sonst liegt es hinter einer Adresse und wird
 * dafuer einmal geholt. So bekommt eine Kopie ihr eigenes Bild, statt auf das
 * des Originals zu zeigen - das mit dem Original verschwaende.
 */
async function projectThumbnailDataUrl(thumbnailUrl: string | null | undefined): Promise<string | null> {
  if (!thumbnailUrl) return null;
  if (thumbnailUrl.startsWith("data:")) return thumbnailUrl;
  const blob = await projectThumbnailBlob(thumbnailUrl);
  if (!blob) return null;
  return new Promise<string | null>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

/**
 * The finished .lyl package of a project, straight out of the browser's own
 * storage. The editor writes it there on every change, so nothing has to be
 * exported again just to hand the project to the server.
 */
async function loadProjectPackage(projectId: string): Promise<Uint8Array | null> {
  const database = await openProjectShapesDb();
  const record = await new Promise<ProjectShapeRecord | null>((resolve, reject) => {
    const transaction = database.transaction(PROJECT_SHAPES_STORE_NAME, "readonly");
    const request = transaction.objectStore(PROJECT_SHAPES_STORE_NAME).get(projectId);
    request.onerror = () => reject(request.error ?? new Error("Could not load project shapes"));
    request.onsuccess = () => resolve((request.result as ProjectShapeRecord | undefined) ?? null);
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not load project shapes"));
  });
  database.close();
  const stored = record?.lylPackage ?? record?.skfPackage ?? null;
  return stored ? new Uint8Array(stored) : null;
}

async function saveProjectShapes(projectId: string, entry: ProjectShapeCacheEntry, context: ProjectShapeSaveContext) {
  const lylPackage = await exportLylProject({
    projectId,
    projectName: context.projectName,
    createdAt: context.createdAt,
    modifiedAt: entry.revision,
    shapes: entry.shapes,
    notes: notesForHistoryIndex(entry.history, entry.historyIndex),
    history: entry.history,
    historyIndex: entry.historyIndex,
    assets: entry.assets,
    workspace: context.workspace,
    snapGrid: context.snapGrid,
    placementElevation: context.placementElevation,
    placementWorkplane: context.placementWorkplane,
    sketchPlacementWorkplane: context.sketchPlacementWorkplane,
    compressionLevel: 1,
  });
  const database = await openProjectShapesDb();
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(PROJECT_SHAPES_STORE_NAME, "readwrite");
    const store = transaction.objectStore(PROJECT_SHAPES_STORE_NAME);
    const existingRequest = store.get(projectId);
    existingRequest.onerror = () => {
      transaction.abort();
    };
    existingRequest.onsuccess = () => {
      const existing = existingRequest.result as ProjectShapeRecord | undefined;
      if (existing && existing.revision > entry.revision) {
        return;
      }
      store.put({
        id: projectId,
        revision: entry.revision,
        lylPackage,
        updatedAt: Date.now(),
      } satisfies ProjectShapeRecord);
    };
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("Could not save project shapes"));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error("Could not save project shapes"));
    };
  });
}

function saveProjectShapesWhenIdle(projectId: string, entry: ProjectShapeCacheEntry, context: ProjectShapeSaveContext) {
  return new Promise<void>((resolve, reject) => {
    const save = () => {
      void saveProjectShapes(projectId, entry, context).then(resolve, reject);
    };
    if (typeof window === "undefined") {
      save();
      return;
    }
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(save, { timeout: 1200 });
      return;
    }
    globalThis.setTimeout(save, 32);
  });
}

async function deleteProjectShapes(projectId: string) {
  const database = await openProjectShapesDb();
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(PROJECT_SHAPES_STORE_NAME, "readwrite");
    transaction.objectStore(PROJECT_SHAPES_STORE_NAME).delete(projectId);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("Could not delete project shapes"));
    };
  });
}

function readStoredProjects() {
  const legacyShapes: Record<string, ProjectShapeCacheEntry> = {};
  if (typeof window === "undefined") return { projects: [] as DashboardProject[], legacyShapes };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PROJECTS_STORAGE_KEY) ?? "[]") as StoredDashboardProject[];
    const projects = parsed
      .filter((project) => typeof project.id === "string" && typeof project.name === "string")
      .map((project, index) => {
        const id = project.id as string;
        const updatedAt = typeof project.updatedAt === "number" ? project.updatedAt : Date.now();
        const revision = typeof project.revision === "number" ? project.revision : updatedAt;
        const designShapes = Array.isArray(project.designShapes) ? (project.designShapes as WorkplaneShape[]) : null;
        if (designShapes) {
          legacyShapes[id] = projectShapeCacheEntry(revision, designShapes);
        }
        return {
          id,
          name: project.name as string,
          createdAt: typeof project.createdAt === "number" ? project.createdAt : Date.now(),
          updatedAt,
          shapes: typeof project.shapes === "number" ? project.shapes : (designShapes?.length ?? 0),
          accent: PROJECT_ACCENTS.includes(project.accent as DashboardProject["accent"]) ? (project.accent as DashboardProject["accent"]) : PROJECT_ACCENTS[index % PROJECT_ACCENTS.length],
          thumbnailUrl: typeof project.thumbnailUrl === "string" ? project.thumbnailUrl : null,
          thumbnailVersion: typeof project.thumbnailVersion === "number" ? project.thumbnailVersion : undefined,
          revision,
          workspace: normalizeWorkspaceSettings(project.workspace),
          snapGrid: normalizeSnapGrid(project.snapGrid),
          placementElevation: typeof project.placementElevation === "number" && Number.isFinite(project.placementElevation) ? project.placementElevation : 0,
          placementWorkplane: normalizePlacementWorkplane(project.placementWorkplane, project.placementElevation),
          sketchPlacementWorkplane: normalizePlacementWorkplane(project.sketchPlacementWorkplane),
          sharedProject: typeof project.sharedProject?.fileName === "string" && typeof project.sharedProject.revision === "string"
            ? {
              fileName: project.sharedProject.fileName,
              revision: project.sharedProject.revision,
              path: typeof project.sharedProject.path === "string" ? project.sharedProject.path : "",
            }
            : undefined,
        };
      });
    return { projects, legacyShapes };
  } catch {
    return { projects: [], legacyShapes };
  }
}

function readProjects() {
  return readStoredProjects().projects;
}

function mergeProjectForStorage(project: DashboardProject, storedProject?: DashboardProject) {
  if (!storedProject) {
    return project;
  }
  const projectRevision = project.revision ?? 0;
  const storedRevision = storedProject.revision ?? 0;
  if (storedRevision <= projectRevision) {
    return project;
  }
  return {
    ...project,
    revision: storedProject.revision,
    shapes: storedProject.shapes || project.shapes,
    thumbnailUrl: project.thumbnailUrl ?? storedProject.thumbnailUrl,
    thumbnailVersion: project.thumbnailVersion ?? storedProject.thumbnailVersion,
    updatedAt: Math.max(project.updatedAt, storedProject.updatedAt),
    workspace: storedProject.workspace ?? project.workspace,
    snapGrid: storedProject.snapGrid ?? project.snapGrid,
    placementElevation: storedProject.placementElevation ?? project.placementElevation,
    placementWorkplane: storedProject.placementWorkplane ?? project.placementWorkplane,
    sketchPlacementWorkplane: storedProject.sketchPlacementWorkplane ?? project.sketchPlacementWorkplane,
    sharedProject: project.sharedProject ?? storedProject.sharedProject,
  };
}

function projectForStorage(project: DashboardProject): DashboardProject {
  return {
    id: project.id,
    name: project.name,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    shapes: project.shapes,
    accent: project.accent,
    thumbnailUrl: project.thumbnailUrl ?? null,
    thumbnailVersion: project.thumbnailVersion,
    revision: project.revision,
    workspace: normalizeWorkspaceSettings(project.workspace),
    snapGrid: normalizeSnapGrid(project.snapGrid),
    placementElevation: typeof project.placementElevation === "number" && Number.isFinite(project.placementElevation) ? project.placementElevation : 0,
    placementWorkplane: normalizePlacementWorkplane(project.placementWorkplane, project.placementElevation),
    sketchPlacementWorkplane: normalizePlacementWorkplane(project.sketchPlacementWorkplane),
    sharedProject: project.sharedProject,
  };
}

function mergeProjectsForStorage(projects: DashboardProject[]) {
  const storedProjects = readProjects();
  const storedById = new Map(storedProjects.map((project) => [project.id, project]));
  return projects.map((project) => projectForStorage(mergeProjectForStorage(project, storedById.get(project.id))));
}

function newProject(name: string, index: number, shapeCount = 0): DashboardProject {
  const now = Date.now();
  return {
    id: createLocalId("project"),
    name,
    createdAt: now,
    updatedAt: now,
    shapes: shapeCount,
    accent: PROJECT_ACCENTS[index % PROJECT_ACCENTS.length],
    revision: now,
    workspace: DEFAULT_WORKPLANE_WORKSPACE,
    snapGrid: DEFAULT_SNAP_GRID,
    placementElevation: 0,
    placementWorkplane: horizontalPlacementWorkplane(),
    sketchPlacementWorkplane: horizontalPlacementWorkplane(),
  };
}

function projectNameFromFileName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "").trim() || "Imported design";
}

export default function Home() {
  useLanguage();
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<AppView>("dashboard");
  const [editorStarted, setEditorStarted] = useState(false);
  const [editorLoading, setEditorLoading] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<DashboardProject[]>([]);
  const [dashboardSection, setDashboardSection] = useState<DashboardSection>("home");
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortMode, setSortMode] = useState("recent");
  const [themePreference, setThemePreference] = useState<AppThemePreference>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedAppTheme>("light");
  const [showProjectNameInToolbar, setShowProjectNameInToolbar] = useState(true);
  const [dashboardNotice, setDashboardNotice] = useState("");
  const [sharedProjects, setSharedProjects] = useState<SharedProject[]>([]);
  const [sharedFolders, setSharedFolders] = useState<SharedFolder[]>([]);
  const [sharedPath, setSharedPath] = useState("");
  const [sharedProjectsEnabled, setSharedProjectsEnabled] = useState(false);
  const [sharedProjectsLoading, setSharedProjectsLoading] = useState(false);
  const [sharedSearch, setSharedSearch] = useState<SharedSearchResult | null>(null);
  const [sharedSearchLoading, setSharedSearchLoading] = useState(false);
  // Hochgezaehlt, wenn sich am Server etwas geaendert hat: Eine Trefferliste
  // muss dann neu gefragt werden, sie haengt an keinem Ordner.
  const [sharedSearchNonce, setSharedSearchNonce] = useState(0);
  const [projectShapesById, setProjectShapesById] = useState<Record<string, ProjectShapeCacheEntry>>({});
  const projectsJsonRef = useRef("");
  const sharedPathRef = useRef("");
  const dashboardImportInputRef = useRef<HTMLInputElement | null>(null);
  const nextProjectRevisionRef = useRef(0);
  const projectShapeSaveQueuesRef = useRef<Record<string, Promise<void>>>({});
  const editorLoadingStartedAtRef = useRef(0);

  const startEditorTransition = useCallback(() => {
    editorLoadingStartedAtRef.current = Date.now();
    setEditorLoading(true);
  }, []);

  const refreshSharedProjects = useCallback(async (path?: string) => {
    const wanted = path ?? sharedPathRef.current;
    setSharedSearchNonce((current) => current + 1);
    setSharedProjectsLoading(true);
    try {
      const query = wanted ? `?path=${encodeURIComponent(wanted)}` : "";
      const response = await fetch(`${SHARED_PROJECTS_ENDPOINT}${query}`, { cache: "no-store" });
      const payload = await response.json() as { enabled?: boolean; path?: string; folders?: SharedFolder[]; projects?: SharedProject[]; error?: string };
      setSharedProjectsEnabled(Boolean(payload.enabled));
      setSharedProjects(Array.isArray(payload.projects) ? payload.projects : []);
      setSharedFolders(Array.isArray(payload.folders) ? payload.folders : []);
      // A folder that is gone takes us back to where it was, not to an error.
      const landed = typeof payload.path === "string" ? payload.path : "";
      sharedPathRef.current = response.ok ? landed : parentStorePath(wanted);
      setSharedPath(sharedPathRef.current);
      if (!response.ok && payload.enabled) setDashboardNotice(payload.error ?? t("notice.sharedLoadFailed"));
    } catch {
      setSharedProjectsEnabled(false);
      setSharedProjects([]);
      setSharedFolders([]);
    } finally {
      setSharedProjectsLoading(false);
    }
  }, []);

  /**
   * Was im Suchfeld steht, gilt fuer den **ganzen** Serverspeicher, nicht nur
   * fuer den Ordner, in dem man gerade steht - sonst blieben Treffer in
   * Unterordnern unsichtbar, und genau die sucht man ja.
   *
   * Gefragt wird erst nach einer kurzen Ruhe und immer nur einmal: Der Lauf
   * davor wird abgebrochen, damit nicht die Antwort auf ein halbes Wort die auf
   * das ganze ueberholt.
   */
  useEffect(() => {
    const term = query.trim();
    if (!sharedProjectsEnabled || !term) {
      setSharedSearch(null);
      setSharedSearchLoading(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setSharedSearchLoading(true);
      void (async () => {
        try {
          const response = await fetch(`${SHARED_PROJECTS_ENDPOINT}?search=${encodeURIComponent(term)}`, {
            cache: "no-store",
            signal: controller.signal,
          });
          const payload = await response.json() as { projects?: SharedProject[]; folders?: SharedFolder[]; truncated?: boolean };
          if (controller.signal.aborted) return;
          setSharedSearch({
            query: term,
            projects: Array.isArray(payload.projects) ? payload.projects : [],
            folders: Array.isArray(payload.folders) ? payload.folders : [],
            truncated: Boolean(payload.truncated),
          });
        } catch {
          // Eine Suche, die nicht durchkommt, ist keine Meldung wert - die
          // Liste bleibt leer und die Kurzmeldung dem Speichern vorbehalten.
          if (!controller.signal.aborted) setSharedSearch({ query: term, projects: [], folders: [], truncated: false });
        } finally {
          if (!controller.signal.aborted) setSharedSearchLoading(false);
        }
      })();
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, sharedProjectsEnabled, sharedSearchNonce]);

  useEffect(() => {
    // Vor allem anderen: Einstellungen aus der Zeit vor der Umbenennung holen.
    migrateLegacyStorageKeys(window.localStorage);
    // Die erste Darstellung ist immer englisch, damit sie zum ausgelieferten
    // HTML passt; die gespeicherte oder erkannte Sprache greift direkt danach.
    setLanguage(detectLanguage(), false);
    // Left behind by the retired Challenges tutorials; nothing reads it now.
    window.localStorage.removeItem("layerling.activeChallengeTutorial");
    const storedTheme = readStoredAppTheme(window.localStorage);
    setThemePreference(storedTheme);
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setResolvedTheme(resolveAppTheme(storedTheme, systemPrefersDark));
    applyAppTheme(storedTheme, systemPrefersDark);
    const { projects: storedProjects, legacyShapes } = readStoredProjects();
    setProjects(storedProjects);
    if (Object.keys(legacyShapes).length > 0) {
      setProjectShapesById(legacyShapes);
      Object.entries(legacyShapes).forEach(([projectId, entry]) => {
        const project = storedProjects.find((candidate) => candidate.id === projectId);
        if (!project) return;
        void saveProjectShapes(projectId, entry, projectShapeSaveContext(project)).catch(() => {
          setDashboardNotice(t("notice.projectShapesMigrateFailed"));
        });
      });
    }
    setShowProjectNameInToolbar(window.localStorage.getItem(PROJECT_NAME_TOOLBAR_STORAGE_KEY) !== "false");

    const params = new URLSearchParams(window.location.search);
    if (params.has("codexBooleanCase") || params.get("editor") === "1") {
      const requestedProjectId = params.get("project");
      if (requestedProjectId && storedProjects.some((project) => project.id === requestedProjectId)) {
        setActiveProjectId(requestedProjectId);
      }
      startEditorTransition();
      setEditorStarted(true);
      setView("editor");
    }
    setMounted(true);
  }, [startEditorTransition]);

  useEffect(() => {
    if (!mounted) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applyCurrentTheme = () => {
      setResolvedTheme(resolveAppTheme(themePreference, media.matches));
      applyAppTheme(themePreference, media.matches);
    };
    storeAppTheme(window.localStorage, themePreference);
    applyCurrentTheme();
    if (themePreference !== "system") return;
    media.addEventListener("change", applyCurrentTheme);
    return () => media.removeEventListener("change", applyCurrentTheme);
  }, [mounted, themePreference]);

  useEffect(() => {
    if (!mounted) return;
    void refreshSharedProjects();
  }, [mounted, refreshSharedProjects]);

  useEffect(() => {
    if (!mounted) return;
    const localSerialized = JSON.stringify(projects);
    const storageProjects = mergeProjectsForStorage(projects);
    const serialized = JSON.stringify(storageProjects);
    if (projectsJsonRef.current === serialized) return;
    try {
      window.localStorage.setItem(PROJECTS_STORAGE_KEY, serialized);
    } catch (error) {
      try {
        window.localStorage.removeItem(PROJECTS_STORAGE_KEY);
        window.localStorage.setItem(PROJECTS_STORAGE_KEY, serialized);
      } catch {
        setDashboardNotice(error instanceof Error ? error.message : t("notice.projectListSaveFailed"));
        return;
      }
    }
    projectsJsonRef.current = serialized;
    if (serialized !== localSerialized) {
      setProjects(storageProjects);
    }
  }, [mounted, projects]);

  useEffect(() => {
    if (!mounted) return;
    const onStorage = (event: StorageEvent) => {
      if (event.key !== PROJECTS_STORAGE_KEY) return;
      projectsJsonRef.current = event.newValue ?? "[]";
      setProjects(readProjects());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [mounted]);

  useEffect(() => {
    if (!activeProjectId) return;
    if (projects.some((project) => project.id === activeProjectId)) return;
    setActiveProjectId(null);
    setView("dashboard");
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", "/");
    }
  }, [activeProjectId, projects]);

  useEffect(() => {
    if (!mounted || !activeProjectId) return;
    const activeProject = projects.find((project) => project.id === activeProjectId);
    if (!activeProject) return;
    const cached = projectShapesById[activeProjectId];
    if (cached && cached.revision >= (activeProject.revision ?? 0)) return;

    let canceled = false;
    void loadProjectShapes(activeProjectId)
      .then((record) => {
        if (canceled) return;
        const loadedRevision = record?.revision ?? 0;
        const revision = Math.max(activeProject.revision ?? 0, loadedRevision, 1);
        const loadedEntry = projectShapeCacheEntry(Math.max(loadedRevision, 1), record?.shapes ?? [], record?.history, record?.historyIndex, record?.assets);
        const entry = loadedEntry.revision === revision ? loadedEntry : { ...loadedEntry, revision };
        setProjectShapesById((current) => {
          // IndexedDB reads are asynchronous. A local edit/import can update the live
          // cache while this older read is still in flight; never let that stale read
          // replace newer in-memory shapes. Bump the preserved entry to the requested
          // project revision so this effect does not immediately retry the same load.
          const existing = current[activeProjectId];
          const reconciled = reconcileLoadedProjectShapeCacheEntry(existing, entry, loadedRevision);
          if (reconciled === existing) return current;
          return {
            ...current,
            [activeProjectId]: reconciled,
          };
        });
        if (record && !record.lylPackage && !record.skfPackage && loadedRevision > 0) {
          // Migrate the data at the revision it was actually read from disk. Using the
          // newer project metadata revision here can let stale shapes outrank a live edit.
          void saveProjectShapesWhenIdle(activeProjectId, loadedEntry, projectShapeSaveContext(activeProject)).catch(() => {
            // The legacy record remains readable and migration can retry on the next load.
          });
        }
      })
      .catch((error) => {
        if (!canceled) {
          setDashboardNotice(error instanceof Error ? error.message : t("notice.projectShapesLoadFailed"));
          setProjectShapesById((current) => {
            // A failed background read must not erase a project that has already
            // received live editor changes while the read was pending.
            if (current[activeProjectId]) return current;
            return {
              ...current,
              [activeProjectId]: projectShapeCacheEntry(activeProject.revision ?? Date.now(), []),
            };
          });
        }
      });
    return () => {
      canceled = true;
    };
  }, [activeProjectId, mounted, projectShapesById, projects]);

  useEffect(() => {
    if (!editorLoading || view !== "editor") return;
    if (activeProjectId) {
      const activeProject = projects.find((project) => project.id === activeProjectId);
      const activeEntry = projectShapesById[activeProjectId];
      if (!activeProject || !activeEntry) return;
    }

    const elapsed = Date.now() - editorLoadingStartedAtRef.current;
    const remaining = Math.max(0, EDITOR_SKELETON_MIN_DURATION_MS - elapsed);
    const timer = window.setTimeout(() => {
      window.requestAnimationFrame(() => setEditorLoading(false));
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [activeProjectId, editorLoading, projectShapesById, projects, view]);

  useEffect(() => {
    if (!mounted) return;
    window.localStorage.setItem(PROJECT_NAME_TOOLBAR_STORAGE_KEY, String(showProjectNameInToolbar));
  }, [mounted, showProjectNameInToolbar]);

  const visibleProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    // A project that lives on the server belongs in the folder, not twice in
    // one view. If the server is out of reach the local copy is all there is,
    // so then it does appear here rather than vanishing with the folder.
    const byLocation = sharedProjectsEnabled ? projects.filter((project) => !project.sharedProject) : projects;
    const filtered = normalizedQuery ? byLocation.filter((project) => project.name.toLowerCase().includes(normalizedQuery)) : byLocation;
    return sortMode === "name" ? [...filtered].sort((a, b) => a.name.localeCompare(b.name)) : [...filtered].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [projects, query, sharedProjectsEnabled, sortMode]);

  const visibleSharedProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = normalizedQuery ? sharedProjects.filter((project) => project.name.toLowerCase().includes(normalizedQuery)) : sharedProjects;
    return sortMode === "name" ? [...filtered].sort((a, b) => a.name.localeCompare(b.name)) : [...filtered].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [query, sharedProjects, sortMode]);

  const openEditor = (projectId: string | null, options: { allowMissingFromStorage?: boolean } = {}) => {
    if (projectId && typeof window !== "undefined" && !options.allowMissingFromStorage) {
      const storedProjects = readProjects();
      const storedProject = storedProjects.find((project) => project.id === projectId);
      if (!storedProject) {
        setProjects(storedProjects);
        setActiveProjectId(null);
        setView("dashboard");
        window.history.replaceState(null, "", "/");
        return;
      }
      setProjects(storedProjects.map((project) => (project.id === projectId ? { ...project, updatedAt: Date.now() } : project)));
    } else if (projectId) {
      setProjects((current) => current.map((project) => (project.id === projectId ? { ...project, updatedAt: Date.now() } : project)));
    }
    startEditorTransition();
    setActiveProjectId(projectId);
    setEditorStarted(true);
    setView("editor");
    if (typeof window !== "undefined") {
      const nextUrl = projectId ? `/?editor=1&project=${encodeURIComponent(projectId)}` : "/?editor=1";
      window.history.replaceState(null, "", nextUrl);
    }
  };

  const updateProjectSnapshot = useCallback(async (snapshot: { image: string; projectId: string; shapes: number }, signal?: AbortSignal) => {
    const version = Date.now();
    if (signal?.aborted) throw new DOMException("Thumbnail upload aborted", "AbortError");
    if (STATIC_EXPORT_BUILD) {
      setProjects((current) =>
        current.map((project) =>
          project.id === snapshot.projectId
            ? { ...project, shapes: snapshot.shapes, thumbnailUrl: snapshot.image, thumbnailVersion: version, updatedAt: version }
            : project,
        ),
      );
      return;
    }

    setProjects((current) =>
      current.map((project) => (project.id === snapshot.projectId ? { ...project, shapes: snapshot.shapes, updatedAt: version } : project)),
    );
    try {
      const response = await fetch("/api/project-thumbnail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl: snapshot.image, projectId: snapshot.projectId }),
        signal,
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? "Could not save project thumbnail");
      }
      const payload = await response.json() as { version?: number };
      if (signal?.aborted) throw new DOMException("Thumbnail upload aborted", "AbortError");
      const nextVersion = payload?.version ?? Date.now();
      const thumbnailUrl = `/api/project-thumbnail?projectId=${encodeURIComponent(snapshot.projectId)}&v=${nextVersion}`;
      setProjects((current) =>
        current.map((project) =>
          project.id === snapshot.projectId
            ? { ...project, shapes: snapshot.shapes, thumbnailUrl, thumbnailVersion: nextVersion, updatedAt: nextVersion }
            : project,
        ),
      );
    } catch (error) {
      if (signal?.aborted || (error instanceof DOMException && error.name === "AbortError")) throw error;
      setProjects((current) =>
        current.map((project) => (project.id === snapshot.projectId ? { ...project, shapes: snapshot.shapes, updatedAt: version } : project)),
      );
      throw error;
    }
  }, []);

  const updateProjectShapes = useCallback((snapshot: {
    projectId: string;
    shapes: WorkplaneShape[];
    history: EditorHistoryEntry[];
    historyIndex: number;
    assets: ProjectAsset[];
    projectName: string;
    projectCreatedAt: number;
    workspace: WorkplaneWorkspaceSettings;
    snapGrid: GridSize;
    placementElevation: number;
    placementWorkplane: PlacementWorkplane;
    sketchPlacementWorkplane: PlacementWorkplane;
  }) => {
    const revision = Math.max(Date.now(), nextProjectRevisionRef.current + 1);
    nextProjectRevisionRef.current = revision;
    const entry = projectShapeCacheEntryFromEditor(revision, snapshot.shapes, snapshot.history, snapshot.historyIndex, snapshot.assets);
    setProjectShapesById((current) => {
      const existing = current[snapshot.projectId];
      if (existing && existing.revision > revision) {
        return current;
      }
      return {
        ...current,
        [snapshot.projectId]: entry,
      };
    });

    const previousSave = projectShapeSaveQueuesRef.current[snapshot.projectId] ?? Promise.resolve();
    const saveContext: ProjectShapeSaveContext = {
      projectName: snapshot.projectName,
      createdAt: snapshot.projectCreatedAt,
      workspace: normalizeWorkspaceSettings(snapshot.workspace),
      snapGrid: normalizeSnapGrid(snapshot.snapGrid),
      placementElevation: Number.isFinite(snapshot.placementElevation) ? snapshot.placementElevation : 0,
      placementWorkplane: normalizePlacementWorkplane(snapshot.placementWorkplane, snapshot.placementElevation),
      sketchPlacementWorkplane: normalizePlacementWorkplane(snapshot.sketchPlacementWorkplane),
    };
    const queuedSave = previousSave.catch(() => undefined).then(() => saveProjectShapesWhenIdle(snapshot.projectId, entry, saveContext));
    projectShapeSaveQueuesRef.current[snapshot.projectId] = queuedSave;

    void queuedSave
      .then(() => {
        setProjects((current) =>
          current.map((project) =>
            project.id === snapshot.projectId && (project.revision ?? 0) <= revision
              ? { ...project, shapes: snapshot.shapes.length, updatedAt: revision, revision }
              : project,
          ),
        );
      })
      .catch((error) => {
        if (projectShapeSaveQueuesRef.current[snapshot.projectId] === queuedSave) {
          setDashboardNotice(error instanceof Error ? error.message : t("notice.projectShapesSaveFailed"));
        }
      })
      .finally(() => {
        if (projectShapeSaveQueuesRef.current[snapshot.projectId] === queuedSave) {
          delete projectShapeSaveQueuesRef.current[snapshot.projectId];
        }
      });
  }, []);

  const updateProjectWorkspace = useCallback((snapshot: {
    projectId: string;
    workspace: WorkplaneWorkspaceSettings;
    snap: GridSize;
    placementElevation?: number;
    placementWorkplane?: PlacementWorkplane;
    sketchPlacementWorkplane?: PlacementWorkplane;
  }) => {
    const version = Math.max(Date.now(), nextProjectRevisionRef.current + 1);
    nextProjectRevisionRef.current = version;
    const workspace = normalizeWorkspaceSettings(snapshot.workspace);
    const snapGrid = normalizeSnapGrid(snapshot.snap);
    const placementElevation = typeof snapshot.placementElevation === "number" && Number.isFinite(snapshot.placementElevation)
      ? snapshot.placementElevation
      : 0;
    const placementWorkplane = normalizePlacementWorkplane(snapshot.placementWorkplane, placementElevation);
    const sketchPlacementWorkplane = normalizePlacementWorkplane(snapshot.sketchPlacementWorkplane);
    const nextFingerprint = `${workplaneSettingsFingerprint(workspace, snapGrid)}:${placementElevation}:${placementWorkplaneFingerprint(placementWorkplane)}:${placementWorkplaneFingerprint(sketchPlacementWorkplane)}`;
    setProjects((current) => {
      let changed = false;
      const next = current.map((project) => {
        if (project.id !== snapshot.projectId) return project;
        const currentFingerprint = `${workplaneSettingsFingerprint(
          normalizeWorkspaceSettings(project.workspace),
          normalizeSnapGrid(project.snapGrid),
        )}:${project.placementElevation ?? 0}:${placementWorkplaneFingerprint(normalizePlacementWorkplane(project.placementWorkplane, project.placementElevation))}:${placementWorkplaneFingerprint(normalizePlacementWorkplane(project.sketchPlacementWorkplane))}`;
        if (currentFingerprint === nextFingerprint) return project;
        changed = true;
        // `revision` tracks the IndexedDB shape snapshot. Advancing it for a
        // workspace-only change can make the loader replace newer live shapes
        // with an older persisted snapshot while autosave is still pending.
        return {
          ...project,
          workspace,
          snapGrid,
          placementElevation,
          placementWorkplane,
          sketchPlacementWorkplane,
          updatedAt: version,
        };
      });
      if (!changed) return current;
      try {
        const storageProjects = mergeProjectsForStorage(next);
        const serialized = JSON.stringify(storageProjects);
        window.localStorage.setItem(PROJECTS_STORAGE_KEY, serialized);
        projectsJsonRef.current = serialized;
        return next;
      } catch {
        return next;
      }
    });
  }, []);

  const createAndOpenProject = (name?: string) => {
    const project = newProject(name ?? t("dashboard.untitledDesign", { number: projects.length + 1 }), projects.length);
    setProjectShapesById((current) => ({
      ...current,
      [project.id]: projectShapeCacheEntry(project.revision ?? project.updatedAt, []),
    }));
    void saveProjectShapes(
      project.id,
      projectShapeCacheEntry(project.revision ?? project.updatedAt, []),
      projectShapeSaveContext(project),
    ).catch(() => {
      setDashboardNotice(t("notice.projectShapesPrepareFailed"));
    });
    setProjects((current) => [project, ...current]);
    openEditor(project.id, { allowMissingFromStorage: true });
  };

  const openLylProjectFromFile = useCallback(async (file: File, sharedProject?: SharedProject) => {
    setDashboardNotice(t("notice.validatingFile", { name: file.name }));
    try {
      const restored = await importLylProject(await file.arrayBuffer());
      const now = Date.now();
      // A project on the server has one working copy here, not one per opening.
      // Without this, every visit to the folder left another namesake behind.
      const existing = sharedProject
        ? projects.find((project) => project.sharedProject?.fileName === sharedProject.fileName
          && (project.sharedProject?.path ?? "") === (sharedProject.path ?? ""))
        : undefined;
      const project: DashboardProject = {
        // Der Dateiname sticht den Namen im Paket: Auf der Karte steht der
        // Dateiname, und eine Kopie traegt den des Originals im Paket, bis der
        // erste Speicherlauf ihn nachzieht.
        ...(existing ?? newProject(sharedProject?.name ?? restored.projectName, projects.length, restored.shapes.length)),
        createdAt: restored.createdAt,
        updatedAt: now,
        revision: now,
        shapes: restored.shapes.length,
        workspace: restored.workspace,
        snapGrid: restored.snapGrid,
        placementElevation: restored.placementElevation,
        placementWorkplane: restored.placementWorkplane,
        sketchPlacementWorkplane: restored.sketchPlacementWorkplane,
        sharedProject: sharedProject ? { fileName: sharedProject.fileName, revision: sharedProject.revision, path: sharedProject.path ?? "" } : undefined,
      };
      const entry = projectShapeCacheEntry(now, restored.shapes, restored.history, restored.historyIndex, restored.assets);
      await saveProjectShapes(project.id, entry, projectShapeSaveContext(project));
      setProjectShapesById((current) => ({ ...current, [project.id]: entry }));
      setProjects((current) => existing
        ? current.map((entryProject) => (entryProject.id === project.id ? project : entryProject))
        : [project, ...current]);
      setDashboardNotice(sharedProject
        ? t("notice.openedServerProject", { name: sharedProject.name })
        : t("notice.openedLocalProject", { name: file.name }));
      openEditor(project.id, { allowMissingFromStorage: true });
      return { ok: true, message: sharedProject
        ? t("notice.openedServerProject", { name: sharedProject.name })
        : t("notice.openedLocalProject", { name: file.name }) };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not open layerling project";
      setDashboardNotice(message);
      return { ok: false, message };
    }
  }, [projects.length]);

  const openSharedProject = useCallback(async (sharedProject: SharedProject) => {
    setDashboardNotice(t("notice.openingShared", { name: sharedProject.name }));
    try {
      const response = await fetch(`${SHARED_PROJECTS_ENDPOINT}?${storeQuery(sharedProject.path ?? "", sharedProject.fileName)}`, { cache: "no-store" });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(payload.error ?? "Could not download shared project");
      }
      const revision = response.headers.get("etag")?.replace(/^W\//, "").replace(/^"|"$/g, "") || sharedProject.revision;
      const file = new File([await response.blob()], sharedProject.fileName, { type: LYL_MEDIA_TYPE });
      await openLylProjectFromFile(file, { ...sharedProject, revision });
    } catch (error) {
      setDashboardNotice(error instanceof Error ? error.message : t("notice.openSharedFailed"));
    }
  }, [openLylProjectFromFile]);

  const deleteSharedProject = useCallback(async (sharedProject: SharedProject) => {
    setDashboardNotice(t("notice.deletingShared", { name: sharedProject.name }));
    try {
      const response = await fetch(`${SHARED_PROJECTS_ENDPOINT}?${storeQuery(sharedProject.path ?? "", sharedProject.fileName)}`, {
        method: "DELETE",
        headers: { "If-Match": `"${sharedProject.revision}"` },
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(payload.error ?? "Could not delete shared project");
      }
      setSharedProjects((current) => current.filter((project) => project.fileName !== sharedProject.fileName));
      // The working copy in this browser outlives the file on the server, so it
      // is let go of its binding - otherwise it would stay hidden for good.
      setProjects((current) => current.map((project) => {
        const binding = project.sharedProject;
        if (!binding || binding.fileName !== sharedProject.fileName || (binding.path ?? "") !== (sharedProject.path ?? "")) return project;
        const { sharedProject: _gone, ...rest } = project;
        return rest;
      }));
      setDashboardNotice(t("notice.deletedShared", { name: sharedProject.name }));
    } catch (error) {
      setDashboardNotice(error instanceof Error ? error.message : t("notice.deleteSharedFailed"));
      await refreshSharedProjects();
    }
  }, [refreshSharedProjects]);

  /** Dropping a project on a folder: the file changes place, nothing else. */
  const moveSharedProject = useCallback(async (sharedProject: SharedProject, targetPath: string) => {
    const from = sharedProject.path ?? "";
    if (targetPath === from) return;
    setDashboardNotice(t("notice.movingShared", { name: sharedProject.name }));
    try {
      const query = new URLSearchParams({ fileName: sharedProject.fileName, moveTo: targetPath });
      if (from) query.set("path", from);
      const response = await fetch(`${SHARED_PROJECTS_ENDPOINT}?${query.toString()}`, {
        method: "POST",
        headers: { "If-Match": `"${sharedProject.revision}"` },
      });
      const payload = await response.json().catch(() => ({})) as { error?: string; project?: SharedProject; currentRevision?: string };
      if (!response.ok || !payload.project) {
        // Both refusals are a 409; only the one about a changed file names the
        // revision it found, which is what tells the two apart.
        const nameTaken = response.status === 409 && payload.currentRevision === undefined;
        throw new Error(nameTaken ? t("notice.moveNameTaken", { name: sharedProject.name }) : payload.error ?? t("notice.moveSharedFailed"));
      }
      const moved = payload.project;
      // A working copy in this browser follows its file, so the next automatic
      // save still writes where the project now lives.
      setProjects((current) => current.map((project) => {
        const binding = project.sharedProject;
        if (!binding || binding.fileName !== moved.fileName || (binding.path ?? "") !== from) return project;
        return { ...project, sharedProject: { ...binding, path: moved.path ?? targetPath, revision: moved.revision } };
      }));
      await refreshSharedProjects();
      // "in Server" reads like a folder nobody named that way, so the top of
      // the store gets a sentence of its own.
      setDashboardNotice(targetPath
        ? t("notice.movedShared", { name: moved.name, folder: targetPath.split("/").slice(-1)[0] })
        : t("notice.movedSharedRoot", { name: moved.name }));
    } catch (error) {
      setDashboardNotice(error instanceof Error ? error.message : t("notice.moveSharedFailed"));
      await refreshSharedProjects();
    }
  }, [refreshSharedProjects]);

  /**
   * Eine Kopie eines Serverentwurfs, im selben Ordner.
   *
   * Der Server kopiert die Datei, es wird nichts neu gepackt - die Kopie traegt
   * also genau die Geometrie des Originals. Den freien Namen sucht der Browser
   * aus der Liste, die er ohnehin vor sich hat; ist er in der Zwischenzeit
   * vergeben, weist der Server ihn ab, statt etwas zu ueberschreiben.
   */
  const duplicateSharedProject = useCallback(async (sharedProject: SharedProject) => {
    const name = duplicateName(
      sharedProject.name,
      sharedProjects.map((project) => project.name),
      duplicateNamePatterns(),
      SHARED_PROJECT_NAME_LIMIT,
    );
    setDashboardNotice(t("notice.duplicating", { name: sharedProject.name }));
    try {
      const query = new URLSearchParams({ fileName: sharedProject.fileName, copyTo: name });
      if (sharedProject.path) query.set("path", sharedProject.path);
      const response = await fetch(`${SHARED_PROJECTS_ENDPOINT}?${query.toString()}`, {
        method: "POST",
        headers: { "If-Match": `"${sharedProject.revision}"` },
      });
      const payload = await response.json().catch(() => ({})) as { error?: string; project?: SharedProject; currentRevision?: string };
      if (!response.ok || !payload.project) {
        // Wie beim Verschieben: nur die Abweisung wegen eines geaenderten
        // Standes nennt eine Revision, daran sind die beiden 409 zu trennen.
        const nameTaken = response.status === 409 && payload.currentRevision === undefined;
        throw new Error(nameTaken ? t("notice.moveNameTaken", { name }) : payload.error ?? t("notice.duplicateFailed"));
      }
      const copy = payload.project;
      await refreshSharedProjects();
      setDashboardNotice(t("notice.duplicated", { name: copy.name }));
    } catch (error) {
      setDashboardNotice(error instanceof Error ? error.message : t("notice.duplicateFailed"));
      await refreshSharedProjects();
    }
  }, [refreshSharedProjects, sharedProjects]);

  const saveActiveProjectToShared = useCallback(async ({ exportName, bytes, thumbnailDataUrl, targetFileName }: { exportName: string; bytes: Uint8Array; thumbnailDataUrl: string; targetFileName?: string }) => {
    const activeProject = projects.find((project) => project.id === activeProjectId);
    if (!activeProject) throw new Error(t("status.sharedNoProject"));
    const { fileName, saveBackToSource } = sharedProjectSaveTarget({
      projectName: activeProject.name,
      exportName,
      binding: activeProject.sharedProject,
      targetFileName,
    });
    // Back into its own folder, or into the one currently open in the store.
    const targetPath = saveBackToSource ? (activeProject.sharedProject?.path ?? "") : sharedPathRef.current;
    const headers: Record<string, string> = {};
    if (saveBackToSource && activeProject.sharedProject) headers["If-Match"] = `"${activeProject.sharedProject.revision}"`;
    else headers["If-None-Match"] = "*";
    const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const thumbnailResponse = await fetch(thumbnailDataUrl);
    const thumbnail = await thumbnailResponse.blob();
    if (thumbnail.type !== "image/png" || thumbnail.size === 0) throw new Error("Could not prepare the shared project thumbnail");
    const formData = new FormData();
    formData.append("project", new Blob([body], { type: LYL_MEDIA_TYPE }), fileName);
    formData.append("thumbnail", thumbnail, `${fileName}.png`);
    const response = await fetch(`${SHARED_PROJECTS_ENDPOINT}?${storeQuery(targetPath, fileName)}`, { method: "POST", headers, body: formData });
    const payload = await response.json().catch(() => ({})) as { error?: string; project?: SharedProject };
    if (!response.ok || !payload.project) {
      const failure = new Error(payload.error ?? t("notice.saveSharedFailed"));
      // 409 and 412 mean somebody else changed the file; retrying would either
      // overwrite their work or fail again. Everything else may be temporary.
      (failure as Error & { conflict?: boolean }).conflict = response.status === 409 || response.status === 412;
      throw failure;
    }
    const savedProject = payload.project;
    setProjects((current) => current.map((project) => project.id === activeProject.id
      ? { ...project, sharedProject: { fileName: savedProject.fileName, revision: savedProject.revision, path: savedProject.path ?? targetPath } }
      : project));
    await refreshSharedProjects();
    return t("notice.savedToServer", { name: savedProject.name });
  }, [activeProjectId, projects, refreshSharedProjects]);

  /** Puts a project into a folder of the store as a file that is not there yet. */
  const putProjectOnServer = useCallback(async (project: DashboardProject, targetPath: string) => {
    const bytes = await projectPackageBytes(project);
    const { fileName } = sharedProjectSaveTarget({ projectName: project.name, exportName: project.name, binding: undefined });
    const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const projectBlob = new Blob([body], { type: LYL_MEDIA_TYPE });
    // The card keeps its picture when it has one. Without a picture the upload
    // is the bare package, which both endpoints accept.
    const thumbnail = await projectThumbnailBlob(project.thumbnailUrl);
    let payload: BodyInit = projectBlob;
    if (thumbnail) {
      const formData = new FormData();
      formData.append("project", projectBlob, fileName);
      formData.append("thumbnail", thumbnail, `${fileName}.png`);
      payload = formData;
    }
    const response = await fetch(`${SHARED_PROJECTS_ENDPOINT}?${storeQuery(targetPath, fileName)}`, {
      method: "POST",
      headers: { "If-None-Match": "*" },
      body: payload,
    });
    const answer = await response.json().catch(() => ({})) as { error?: string; project?: SharedProject };
    if (!response.ok || !answer.project) {
      throw new Error(response.status === 409 ? t("notice.serverNameTaken", { name: project.name }) : answer.error ?? t("notice.saveSharedFailed"));
    }
    return answer.project;
  }, []);

  /**
   * A project from this browser, dropped on the server folder. It is a move,
   * not a copy: once the file is on the server the local card is bound to it
   * and the project is shown in the folder instead of beside it.
   */
  const sendProjectToServer = useCallback(async (projectId: string) => {
    const project = projects.find((candidate) => candidate.id === projectId);
    if (!project || project.sharedProject) return;
    setDashboardNotice(t("notice.sendingToServer", { name: project.name }));
    try {
      const saved = await putProjectOnServer(project, sharedPathRef.current);
      setProjects((current) => current.map((candidate) => candidate.id === projectId
        ? { ...candidate, sharedProject: { fileName: saved.fileName, revision: saved.revision, path: saved.path ?? sharedPathRef.current } }
        : candidate));
      await refreshSharedProjects();
      setDashboardNotice(t("notice.savedToServer", { name: saved.name }));
    } catch (error) {
      setDashboardNotice(error instanceof Error ? error.message : t("notice.saveSharedFailed"));
    }
  }, [projects, refreshSharedProjects]);

  /**
   * A new design started inside a folder of the store. It is put there right
   * away - an empty file, but a real one - so the editor's automatic save has
   * somewhere to write from the first change on.
   */
  const createProjectInStoreFolder = useCallback(async () => {
    const targetPath = sharedPathRef.current;
    // The name has to be free in both places, or the upload would collide with
    // a file this browser cannot see in its own list.
    const taken = new Set([
      ...projects.map((project) => project.name.toLowerCase()),
      ...sharedProjects.map((project) => project.name.toLowerCase()),
    ]);
    let number = projects.length + 1;
    let name = t("dashboard.untitledDesign", { number });
    while (taken.has(name.toLowerCase())) {
      number += 1;
      name = t("dashboard.untitledDesign", { number });
    }

    const project = newProject(name, projects.length);
    const entry = projectShapeCacheEntry(project.revision ?? project.updatedAt, []);
    setProjectShapesById((current) => ({ ...current, [project.id]: entry }));
    await saveProjectShapes(project.id, entry, projectShapeSaveContext(project)).catch(() => {
      setDashboardNotice(t("notice.projectShapesPrepareFailed"));
    });

    let binding: DashboardProject["sharedProject"];
    try {
      const saved = await putProjectOnServer(project, targetPath);
      binding = { fileName: saved.fileName, revision: saved.revision, path: saved.path ?? targetPath };
    } catch (error) {
      // The design still exists, it just stays in this browser for now.
      setDashboardNotice(error instanceof Error ? error.message : t("notice.saveSharedFailed"));
    }
    setProjects((current) => [{ ...project, sharedProject: binding }, ...current]);
    if (binding) void refreshSharedProjects();
    openEditor(project.id, { allowMissingFromStorage: true });
  }, [projects, putProjectOnServer, refreshSharedProjects, sharedProjects]);

  const openStoreFolder = useCallback((path: string) => {
    void refreshSharedProjects(path);
  }, [refreshSharedProjects]);

  const createStoreFolder = useCallback(async (name: string) => {
    if (!name.trim()) return;
    try {
      const query = new URLSearchParams({ folder: name.trim() });
      if (sharedPathRef.current) query.set("path", sharedPathRef.current);
      const response = await fetch(`${SHARED_PROJECTS_ENDPOINT}?${query.toString()}`, { method: "POST" });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? t("notice.folderCreateFailed"));
      await refreshSharedProjects();
    } catch (error) {
      setDashboardNotice(error instanceof Error ? error.message : t("notice.folderCreateFailed"));
    }
  }, [refreshSharedProjects]);

  /**
   * Renaming a folder on the server. Everything inside travels with it, so the
   * working copies in this browser have to be told where their file went - a
   * binding that still points at the old folder would save into thin air.
   */
  const renameStoreFolder = useCallback(async (folderPath: string, name: string) => {
    const wanted = name.trim();
    if (!wanted || !folderPath) return;
    setDashboardNotice(t("notice.renamingFolder", { name: folderPath.split("/").slice(-1)[0] }));
    try {
      const query = new URLSearchParams({ path: folderPath, renameTo: wanted });
      const response = await fetch(`${SHARED_PROJECTS_ENDPOINT}?${query.toString()}`, { method: "POST" });
      const payload = await response.json().catch(() => ({})) as { error?: string; path?: string };
      if (!response.ok || typeof payload.path !== "string") throw new Error(payload.error ?? t("notice.folderRenameFailed"));
      const renamedTo = payload.path;
      setProjects((current) => current.map((project) => {
        const binding = project.sharedProject;
        const where = binding?.path ?? "";
        if (!binding || (where !== folderPath && !where.startsWith(`${folderPath}/`))) return project;
        return { ...project, sharedProject: { ...binding, path: renamedTo + where.slice(folderPath.length) } };
      }));
      // Standing inside the folder that was renamed means following it.
      if (sharedPathRef.current === folderPath || sharedPathRef.current.startsWith(`${folderPath}/`)) {
        await refreshSharedProjects(renamedTo + sharedPathRef.current.slice(folderPath.length));
      } else {
        await refreshSharedProjects();
      }
      setDashboardNotice(t("notice.renamedFolder", { name: renamedTo.split("/").slice(-1)[0] }));
    } catch (error) {
      setDashboardNotice(error instanceof Error ? error.message : t("notice.folderRenameFailed"));
      await refreshSharedProjects();
    }
  }, [refreshSharedProjects]);

  /**
   * Removing a folder from the server. What was inside is gone from there, so
   * every working copy that pointed into it becomes an ordinary browser
   * project again rather than a card nobody can see.
   */
  const deleteStoreFolder = useCallback(async (folderPath: string, recursive: boolean) => {
    if (!folderPath) return;
    const folderName = folderPath.split("/").slice(-1)[0];
    setDashboardNotice(t("notice.deletingFolder", { name: folderName }));
    try {
      const query = new URLSearchParams({ path: folderPath, deleteFolder: "1" });
      if (recursive) query.set("recursive", "1");
      const response = await fetch(`${SHARED_PROJECTS_ENDPOINT}?${query.toString()}`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({})) as { error?: string; deleted?: boolean };
      if (!response.ok || !payload.deleted) throw new Error(payload.error ?? t("notice.folderDeleteFailed"));
      setProjects((current) => current.map((project) => {
        const binding = project.sharedProject;
        const where = binding?.path ?? "";
        if (!binding || (where !== folderPath && !where.startsWith(`${folderPath}/`))) return project;
        const { sharedProject: _gone, ...rest } = project;
        return rest;
      }));
      await refreshSharedProjects();
      setDashboardNotice(t("notice.deletedFolder", { name: folderName }));
    } catch (error) {
      setDashboardNotice(error instanceof Error ? error.message : t("notice.folderDeleteFailed"));
      await refreshSharedProjects();
    }
  }, [refreshSharedProjects]);

  const importFilesFromDashboard = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      const projectFiles = files.filter((file) => /\.(lyl|skf)$/i.test(file.name));
      if (projectFiles.length) {
        if (files.length !== 1) {
          setDashboardNotice(t("notice.oneLylAtATime"));
          return;
        }
        await openLylProjectFromFile(projectFiles[0]);
        return;
      }
      const importedShapes: WorkplaneShape[] = [];
      const importedAssets: ProjectAsset[] = [];
      const importedFileNames: string[] = [];
      const failures: Array<{ fileName: string; reason: string }> = [];

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const sourceFormat = sourceFormatForFileName(file.name) ?? (file.type === "image/svg+xml" ? "svg" : null);
        const isObj = sourceFormat === "obj";
        const isSvg = sourceFormat === "svg";
        const isStep = sourceFormat === "step";
        if (!sourceFormat || (!isSvg && !isStep && !importExtensionSupported(file.name))) {
          failures.push({ fileName: file.name, reason: "Unsupported file type" });
          continue;
        }

        setDashboardNotice(t("notice.importing", { index: index + 1, total: files.length, name: file.name }));
        try {
          const bytes = new Uint8Array(await file.arrayBuffer());
          const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
          const parsedShape = isStep
            ? await import("@/lib/stepImport").then(({ importedShapeFromStep }) => importedShapeFromStep(file.name, buffer))
            : isObj
              ? importedShapeFromObj(file.name, new TextDecoder().decode(bytes))
              : isSvg
                ? importedShapeFromSvg(file.name, new TextDecoder().decode(bytes))
                : importedShapeFromStl(file.name, buffer);
          const asset = await projectAssetFromBytes(file.name, sourceFormat, bytes, file.type);
          importedShapes.push(attachProjectAsset(parsedShape, asset.id));
          importedAssets.push(asset);
          importedFileNames.push(file.name);
        } catch (error) {
          failures.push({
            fileName: file.name,
            reason: error instanceof Error ? error.message : "Could not read file",
          });
        }
      }

      const failureDetails = failures
        .slice(0, 3)
        .map((failure) => `${failure.fileName}: ${failure.reason}`)
        .join("; ");
      const remainingFailureCount = Math.max(0, failures.length - 3);
      const failureSummary = failures.length
        ? ` Failed: ${failureDetails}${remainingFailureCount ? `; plus ${remainingFailureCount} more` : ""}`
        : "";

      if (!importedShapes.length) {
        setDashboardNotice(files.length === 1 && failures[0] ? failures[0].reason : `Could not import any of the ${files.length} selected files.${failureSummary}`);
        return;
      }

      try {
        const projectName = importedShapes.length === 1
          ? projectNameFromFileName(importedFileNames[0])
          : `Imported design (${importedShapes.length} files)`;
        const project = newProject(projectName, projects.length, importedShapes.length);
        const revision = project.revision ?? project.updatedAt;
        const entry = projectShapeCacheEntry(revision, importedShapes, undefined, undefined, dedupeProjectAssets(importedAssets));
        await saveProjectShapes(project.id, entry, projectShapeSaveContext(project));
        setProjectShapesById((current) => ({
          ...current,
          [project.id]: entry,
        }));
        const successSummary = importedShapes.length === 1 && files.length === 1
          ? `Imported ${files[0].name}`
          : `Imported ${importedShapes.length} of ${files.length} files`;
        setDashboardNotice(`${successSummary}.${failureSummary}`.trim());
        setProjects((current) => [project, ...current]);
        openEditor(project.id, { allowMissingFromStorage: true });
      } catch (error) {
        setDashboardNotice(error instanceof Error ? error.message : t("notice.importProjectFailed"));
      }
    },
    [openLylProjectFromFile, projects.length],
  );

  const openLatestProject = () => {
    const latest = [...projects].sort((a, b) => b.updatedAt - a.updatedAt)[0];
    if (latest) {
      openEditor(latest.id);
      return;
    }
    createAndOpenProject();
  };

  const openDashboard = () => {
    const leavingProject = activeProjectId ? projects.find((project) => project.id === activeProjectId) : undefined;
    if (activeProjectId) {
      setProjects((current) => current.map((project) => (project.id === activeProjectId ? { ...project, updatedAt: Date.now() } : project)));
    }
    // Back where you came from: a project opened from the folder returns to it.
    setDashboardSection(leavingProject?.sharedProject ? "shared" : "home");
    setEditorLoading(false);
    setView("dashboard");
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", "/");
    }
  };

  const deleteProject = (projectId: string) => {
    setProjects((current) => current.filter((project) => project.id !== projectId));
    setProjectShapesById((current) => {
      const next = { ...current };
      delete next[projectId];
      return next;
    });
    if (activeProjectId === projectId) {
      setActiveProjectId(null);
    }
    if (!STATIC_EXPORT_BUILD) {
      void fetch(`/api/project-thumbnail?projectId=${encodeURIComponent(projectId)}`, { method: "DELETE" });
    }
    void deleteProjectShapes(projectId).catch(() => {
      setDashboardNotice(t("notice.projectShapesDeleteFailed"));
    });
  };

  /**
   * Eine Kopie eines Entwurfs in diesem Browser.
   *
   * Kopiert wird der ganze Stand samt Verlauf, Notizen und eingelesener
   * Geometrie - also das, was `loadProjectShapes` hergibt, unter einer neuen
   * Kennung neu gepackt. Zwei Dinge erbt die Kopie ausdruecklich **nicht**: die
   * Bindung an eine Serverdatei, denn die gehoert dem Original, und das
   * Kartenbild als blosse Adresse - das bekommt sie als eigenes Bild.
   */
  const duplicateProject = async (projectId: string) => {
    const source = projects.find((project) => project.id === projectId);
    if (!source) return;
    setDashboardNotice(t("notice.duplicating", { name: source.name }));
    try {
      const stored = projectShapesById[projectId] ?? await loadProjectShapes(projectId);
      if (!stored) throw new Error(t("notice.projectShapesLoadFailed"));
      const now = Date.now();
      const { sharedProject: _bound, ...carried } = source;
      const copy: DashboardProject = {
        ...carried,
        id: createLocalId("project"),
        name: duplicateName(source.name, projects.map((project) => project.name), duplicateNamePatterns(), PROJECT_NAME_LIMIT),
        createdAt: now,
        updatedAt: now,
        revision: now,
        thumbnailUrl: null,
        thumbnailVersion: undefined,
      };
      const entry = projectShapeCacheEntry(now, stored.shapes ?? [], stored.history, stored.historyIndex, stored.assets ?? []);
      await saveProjectShapes(copy.id, entry, projectShapeSaveContext(copy));
      setProjectShapesById((current) => ({ ...current, [copy.id]: entry }));
      setProjects((current) => [copy, ...current]);
      const picture = await projectThumbnailDataUrl(source.thumbnailUrl);
      // Das Bild ist Beiwerk: Bleibt es aus, steht die Kopie eben mit der
      // Ersatzflaeche da, statt dass das Duplizieren als gescheitert gilt.
      if (picture) {
        await updateProjectSnapshot({ image: picture, projectId: copy.id, shapes: copy.shapes }).catch(() => undefined);
      }
      setDashboardNotice(t("notice.duplicated", { name: copy.name }));
    } catch (error) {
      setDashboardNotice(error instanceof Error ? error.message : t("notice.duplicateFailed"));
    }
  };

  const renameProject = (projectId: string, name: string) => {
    const nextName = name.trim().slice(0, PROJECT_NAME_LIMIT);
    if (!nextName) return;
    setProjects((current) =>
      current.map((project) => (project.id === projectId ? { ...project, name: nextName, updatedAt: Date.now() } : project)),
    );
  };

  if (!mounted) {
    return null;
  }

  const activeProject = activeProjectId ? projects.find((project) => project.id === activeProjectId) ?? null : null;
  const activeProjectShapeEntry = activeProjectId ? projectShapesById[activeProjectId] : null;
  const canRenderEditor = !activeProjectId || (Boolean(activeProject) && Boolean(activeProjectShapeEntry));
  const projectDebugSummary = projects.map((project) => ({
    id: project.id,
    revision: project.revision,
    shapes: project.shapes,
    designShapes: projectShapesById[project.id]?.shapes.length ?? null,
    thumbnail: Boolean(project.thumbnailUrl),
    workspace: Boolean(project.workspace),
    snapGrid: project.snapGrid ?? null,
  }));

  return (
    <>
      <pre data-codex-projects hidden>
        {JSON.stringify(projectDebugSummary)}
      </pre>
      <input
        ref={dashboardImportInputRef}
        className="hidden-file-input"
        type="file"
        multiple
        accept=".lyl,.skf,.stl,.obj,.step,.stp,.svg,image/svg+xml"
        onChange={(event) => {
          const files = event.currentTarget.files ? Array.from(event.currentTarget.files) : [];
          if (files.length) {
            void importFilesFromDashboard(files);
          }
          event.currentTarget.value = "";
        }}
      />
      {view === "dashboard" ? (
        <Dashboard
          dashboardSection={dashboardSection}
          dashboardNotice={dashboardNotice}
          hasProjects={projects.length > 0}
          projects={visibleProjects}
          query={query}
          sharedFolders={sharedFolders}
          sharedPath={sharedPath}
          sharedProjects={visibleSharedProjects}
          onCreateInStoreFolder={() => void createProjectInStoreFolder()}
          onCreateStoreFolder={(name) => void createStoreFolder(name)}
          onRenameStoreFolder={(folderPath, name) => void renameStoreFolder(folderPath, name)}
          onDeleteStoreFolder={(folderPath, recursive) => void deleteStoreFolder(folderPath, recursive)}
          onOpenStoreFolder={openStoreFolder}
          onMoveSharedProject={(project, targetPath) => void moveSharedProject(project, targetPath)}
          onSendProjectToServer={(projectId) => void sendProjectToServer(projectId)}
          sharedProjectsEnabled={sharedProjectsEnabled}
          sharedProjectsLoading={sharedProjectsLoading}
          sharedSearch={sharedSearch}
          sharedSearchLoading={sharedSearchLoading}
          sortMode={sortMode}
          viewMode={viewMode}
          onCreate={() => createAndOpenProject()}
          onDeleteProject={deleteProject}
          onDeleteSharedProject={(project) => void deleteSharedProject(project)}
          onDuplicateProject={(projectId) => void duplicateProject(projectId)}
          onDuplicateSharedProject={(project) => void duplicateSharedProject(project)}
          onImportFile={() => dashboardImportInputRef.current?.click()}
          onOpenSharedProject={(project) => void openSharedProject(project)}
          onOpenProject={openEditor}
          onQueryChange={setQuery}
          onRenameProject={renameProject}
          onRefreshSharedProjects={() => void refreshSharedProjects()}
          onSharedProjects={() => {
            setDashboardSection("shared");
            setDashboardNotice("");
            void refreshSharedProjects();
          }}
          onSortModeChange={setSortMode}
          onViewModeChange={setViewMode}
          onWorkspace={openLatestProject}
        />
      ) : null}
      {editorStarted && canRenderEditor ? (
        <div className={view === "editor" ? "editor-stage active" : "editor-stage"} aria-hidden={view !== "editor"}>
          <LayerlingEditor
            initialAssets={activeProjectShapeEntry?.assets ?? []}
            initialShapes={activeProjectShapeEntry?.shapes ?? []}
            initialHistory={activeProjectShapeEntry?.history}
            initialHistoryIndex={activeProjectShapeEntry?.historyIndex}
            initialSnap={activeProject?.snapGrid ?? DEFAULT_SNAP_GRID}
            initialWorkspace={activeProject?.workspace ?? DEFAULT_WORKPLANE_WORKSPACE}
            initialPlacementElevation={activeProject?.placementElevation ?? 0}
            initialPlacementWorkplane={activeProject?.placementWorkplane}
            onHome={openDashboard}
            onOpenLylProjectFile={openLylProjectFromFile}
            onSaveSharedProject={saveActiveProjectToShared}
            serverFileName={activeProject?.sharedProject?.fileName ?? null}
            onProjectShapesChange={updateProjectShapes}
            onProjectSnapshot={updateProjectSnapshot}
            onProjectWorkspaceChange={updateProjectWorkspace}
            onProjectNameChange={(name) => {
              if (activeProjectId) renameProject(activeProjectId, name);
            }}
            projectId={activeProjectId}
            projectName={activeProject?.name}
            showProjectNameInToolbar={showProjectNameInToolbar}
            onShowProjectNameInToolbarChange={setShowProjectNameInToolbar}
            projectCreatedAt={activeProject?.createdAt}
            projectModifiedAt={activeProject?.updatedAt}
            projectRevision={activeProjectShapeEntry?.revision ?? activeProject?.revision ?? 0}
            sharedProjectsEnabled={sharedProjectsEnabled}
            themePreference={themePreference}
            resolvedTheme={resolvedTheme}
            onThemePreferenceChange={setThemePreference}
          />
        </div>
      ) : null}
      {view === "editor" && (editorLoading || !canRenderEditor) ? <EditorLoadingSkeleton /> : null}
    </>
  );
}

function EditorLoadingSkeleton() {
  const leftToolbarSections = [
    { className: "home", controls: 1 },
    { className: "clipboard", controls: 4 },
    { className: "history", controls: 2 },
    { className: "shapes", controls: 1 },
  ];
  const rightToolbarSections = [
    { className: "visibility", controls: 2 },
    { className: "combine", controls: 3 },
    { className: "modify", controls: 5 },
    { className: "arrange", controls: 2 },
    { className: "manage", controls: 3 },
  ];

  const renderToolbarSection = ({ className, controls }: { className: string; controls: number }) => (
    <div className={`editor-loading-tool-section ${className}`} key={className}>
      <span className="editor-loading-section-label editor-skeleton-shimmer" />
      <div className="editor-loading-section-controls">
        {Array.from({ length: controls }, (_, index) => (
          <span className="editor-loading-tool editor-skeleton-shimmer" key={index} />
        ))}
      </div>
    </div>
  );

  return (
    <div className="editor-loading-screen" role="status" aria-label={t("editor.loading")} aria-live="polite">
      <div className="editor-loading-toolbar">
        <div className="editor-loading-tabs">
          <span className="editor-skeleton-shimmer" />
          <span className="editor-skeleton-shimmer" />
        </div>
        <div className="editor-loading-tool-groups">
          <div className="editor-loading-tool-cluster">
            {leftToolbarSections.map(renderToolbarSection)}
          </div>
          <span className="editor-loading-toolbar-spacer" />
          <div className="editor-loading-tool-cluster">
            {rightToolbarSections.map(renderToolbarSection)}
          </div>
        </div>
      </div>

      <div className="editor-loading-body">
        <div className="editor-loading-viewport">
          <div className="editor-loading-view-cube">
            <span className="editor-loading-cube-top editor-skeleton-shimmer" />
            <span className="editor-loading-cube-left editor-skeleton-shimmer" />
            <span className="editor-loading-cube-right editor-skeleton-shimmer" />
          </div>
          <div className="editor-loading-model" aria-hidden="true">
            <span className="editor-loading-model-top editor-skeleton-shimmer" />
            <span className="editor-loading-model-front editor-skeleton-shimmer" />
            <span className="editor-loading-model-side editor-skeleton-shimmer" />
          </div>
          <div className="editor-loading-viewport-controls">
            {Array.from({ length: 5 }, (_, index) => (
              <span className="editor-skeleton-shimmer" key={index} />
            ))}
          </div>
          <span className="editor-loading-status editor-skeleton-shimmer" />
          <span className="editor-loading-snap editor-skeleton-shimmer" />
        </div>
      </div>
    </div>
  );
}

function Dashboard({
  dashboardSection,
  dashboardNotice,
  hasProjects,
  projects,
  query,
  sharedFolders,
  sharedPath,
  sharedProjects,
  onCreateInStoreFolder,
  onCreateStoreFolder,
  onRenameStoreFolder,
  onDeleteStoreFolder,
  onOpenStoreFolder,
  onMoveSharedProject,
  onSendProjectToServer,
  sharedProjectsEnabled,
  sharedProjectsLoading,
  sharedSearch,
  sharedSearchLoading,
  sortMode,
  viewMode,
  onCreate,
  onDeleteProject,
  onDeleteSharedProject,
  onDuplicateProject,
  onDuplicateSharedProject,
  onImportFile,
  onOpenSharedProject,
  onOpenProject,
  onQueryChange,
  onRenameProject,
  onRefreshSharedProjects,
  onSharedProjects,
  onSortModeChange,
  onViewModeChange,
  onWorkspace,
}: {
  dashboardSection: DashboardSection;
  dashboardNotice: string;
  hasProjects: boolean;
  projects: DashboardProject[];
  query: string;
  sharedFolders: SharedFolder[];
  sharedPath: string;
  sharedProjects: SharedProject[];
  onCreateInStoreFolder: () => void;
  onCreateStoreFolder: (name: string) => void;
  onRenameStoreFolder: (folderPath: string, name: string) => void;
  onDeleteStoreFolder: (folderPath: string, recursive: boolean) => void;
  onOpenStoreFolder: (path: string) => void;
  onMoveSharedProject: (project: SharedProject, targetPath: string) => void;
  onSendProjectToServer: (projectId: string) => void;
  sharedProjectsEnabled: boolean;
  sharedProjectsLoading: boolean;
  sharedSearch: SharedSearchResult | null;
  sharedSearchLoading: boolean;
  sortMode: string;
  viewMode: ViewMode;
  onCreate: () => void;
  onDeleteProject: (projectId: string) => void;
  onDeleteSharedProject: (project: SharedProject) => void;
  onDuplicateProject: (projectId: string) => void;
  onDuplicateSharedProject: (project: SharedProject) => void;
  onImportFile: () => void;
  onOpenSharedProject: (project: SharedProject) => void;
  onOpenProject: (projectId: string) => void;
  onQueryChange: (value: string) => void;
  onRenameProject: (projectId: string, name: string) => void;
  onRefreshSharedProjects: (path?: string) => void;
  onSharedProjects: () => void;
  onSortModeChange: (value: string) => void;
  onViewModeChange: (value: ViewMode) => void;
  onWorkspace: () => void;
}) {
  const language = useLanguage();
  const { update, isDismissed, dismiss: dismissUpdate } = useAppUpdate(LYL_CREATED_WITH_VERSION);
  const [openProjectMenuId, setOpenProjectMenuId] = useState<string | null>(null);
  const [openSharedProjectMenuKey, setOpenSharedProjectMenuKey] = useState<string | null>(null);
  const [projectPendingDeleteId, setProjectPendingDeleteId] = useState<string | null>(null);
  const [sharedProjectPendingDeleteKey, setSharedProjectPendingDeleteKey] = useState<string | null>(null);
  // Which project is being dragged, and which drop target it is hovering over.
  // The target is a store path, and "" is the store's own root - so null, not
  // the empty string, means "nothing under the pointer".
  const [draggedSharedKey, setDraggedSharedKey] = useState<string | null>(null);
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);
  const [dropFolderPath, setDropFolderPath] = useState<string | null>(null);
  const [projectPendingRenameId, setProjectPendingRenameId] = useState<string | null>(null);
  const [projectNameDraft, setProjectNameDraft] = useState("");
  // One dialog for both jobs: a new folder and a folder being renamed differ
  // in their heading and their button, not in what has to be typed.
  const [folderDialog, setFolderDialog] = useState<{ mode: "create" } | { mode: "rename"; path: string; current: string } | null>(null);
  const [folderNameDraft, setFolderNameDraft] = useState("");
  const [openFolderMenuName, setOpenFolderMenuName] = useState<string | null>(null);
  const [folderPendingDeleteName, setFolderPendingDeleteName] = useState<string | null>(null);
  const [projectPendingMoveKey, setProjectPendingMoveKey] = useState<string | null>(null);
  // Solange etwas im Suchfeld steht, tritt die Trefferliste an die Stelle der
  // Ordneransicht. Sie kommt vom Server und umfasst den ganzen Speicher, nicht
  // nur den Ordner, der gerade offen steht.
  const searchTerm = query.trim();
  const searchResults = sharedProjectsEnabled && searchTerm ? sharedSearch : null;
  const searchHits = searchResults ? searchResults.projects.length + searchResults.folders.length : 0;
  const shownSharedProjects = searchResults ? searchResults.projects : sharedProjects;
  const shownSharedFolders = searchResults ? searchResults.folders : sharedFolders;

  /**
   * Einem Treffer in seinen Ordner folgen.
   *
   * Dazu gehoert, das Suchfeld zu leeren: Sonst bliebe die Trefferliste
   * stehen, waehrend der Ordner darunter still wechselt - der Klick saehe
   * wirkungslos aus.
   */
  const openFolderFromSearch = (folderPath: string) => {
    onQueryChange("");
    onOpenStoreFolder(folderPath);
  };
  const projectPendingDelete = projects.find((project) => project.id === projectPendingDeleteId) ?? null;
  const sharedProjectPendingDelete = shownSharedProjects.find((project) => sharedProjectKey(project) === sharedProjectPendingDeleteKey) ?? null;
  const projectPendingRename = projects.find((project) => project.id === projectPendingRenameId) ?? null;

  useEffect(() => {
    if (!projectPendingDeleteId) return;
    if (projects.some((project) => project.id === projectPendingDeleteId)) return;
    setProjectPendingDeleteId(null);
  }, [projectPendingDeleteId, projects]);

  useEffect(() => {
    if (!sharedProjectPendingDeleteKey) return;
    if (shownSharedProjects.some((project) => sharedProjectKey(project) === sharedProjectPendingDeleteKey)) return;
    setSharedProjectPendingDeleteKey(null);
  }, [sharedProjectPendingDeleteKey, shownSharedProjects]);

  const confirmProjectDelete = () => {
    if (!projectPendingDelete) return;
    onDeleteProject(projectPendingDelete.id);
    setProjectPendingDeleteId(null);
  };

  const confirmSharedProjectDelete = () => {
    if (!sharedProjectPendingDelete) return;
    onDeleteSharedProject(sharedProjectPendingDelete);
    setSharedProjectPendingDeleteKey(null);
  };

  const startProjectRename = (project: DashboardProject) => {
    setOpenProjectMenuId(null);
    setProjectPendingRenameId(project.id);
    setProjectNameDraft(project.name);
  };

  // Folder cards and the steps of the trail are the same kind of target: they
  // only stand for different folders, so they share one set of handlers.
  const storeDropTarget = (targetPath: string) => ({
    onDragOver: (event: DragEvent<HTMLElement>) => {
      if (!draggedSharedKey) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      setDropFolderPath(targetPath);
    },
    onDragLeave: () => setDropFolderPath((current) => (current === targetPath ? null : current)),
    onDrop: (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      const dragged = sharedProjects.find((project) => sharedProjectKey(project) === draggedSharedKey);
      setDraggedSharedKey(null);
      setDropFolderPath(null);
      if (dragged) onMoveSharedProject(dragged, targetPath);
    },
  });

  // A folder keeps its own name while it is being renamed, so that name is not
  // one of the names that are taken.
  const folderNames = sharedFolders
    .map((folder) => folder.name)
    .filter((name) => !(folderDialog?.mode === "rename" && name === folderDialog.current));
  const folderProblem = folderDialog ? storeFolderNameProblem(folderNameDraft, folderNames) : null;
  const folderProblemMessage = folderProblem === "start"
    ? t("shared.folderNameBadStart")
    : folderProblem === "chars"
      ? t("shared.folderNameBadChars")
      : folderProblem === "taken"
        ? t("shared.folderNameTaken")
        : "";

  const projectPendingMove = sharedProjects.find((project) => sharedProjectKey(project) === projectPendingMoveKey) ?? null;
  const folderPendingDelete = sharedFolders.find((folder) => folder.name === folderPendingDeleteName) ?? null;
  const folderPendingDeleteProjects = folderPendingDelete?.projects ?? 0;
  const folderPendingDeleteFolders = folderPendingDelete?.folders ?? 0;

  const closeFolderDialog = () => {
    setFolderDialog(null);
    setFolderNameDraft("");
  };

  const confirmFolderDialog = () => {
    if (!folderDialog || folderProblem) return;
    const name = folderNameDraft.trim();
    if (folderDialog.mode === "create") onCreateStoreFolder(name);
    // Confirming an unchanged name is the same as closing the dialog.
    else if (name !== folderDialog.current) onRenameStoreFolder(folderDialog.path, name);
    closeFolderDialog();
  };

  const closeProjectRename = () => {
    setProjectPendingRenameId(null);
    setProjectNameDraft("");
  };

  const confirmProjectRename = () => {
    if (!projectPendingRename || !projectNameDraft.trim()) return;
    onRenameProject(projectPendingRename.id, projectNameDraft);
    closeProjectRename();
  };

  return (
    <main className="dashboard-shell">
      <header className="dashboard-topbar">
        <a className="dashboard-brand" href="./" aria-label={t("brand.home")}>
          <img src="/assets/layerling/layerling-logo.svg" alt="" />
          <span className="dashboard-brand-text">
            <span className="dashboard-brand-name">layerling</span>
            <span className="dashboard-tagline">{t("brand.tagline")}</span>
          </span>
        </a>
        <div className="dashboard-search">
          <Search size={18} strokeWidth={2.4} />
          <input value={query} onChange={(event) => onQueryChange(event.currentTarget.value)} placeholder={t("dashboard.searchPlaceholder")} aria-label={t("dashboard.searchLabel")} />
        </div>
        {/* Oben rechts, wo Webseiten ihre Sprachwahl haben. Die dritte Spalte
            der Kopfzeile war bisher leer. */}
        <LanguageSwitch />
      </header>

      <div className="dashboard-layout">
        <section className="dashboard-main" aria-label={dashboardSection === "shared" ? t("shared.title") : t("dashboard.projects")}>
          {update && !isDismissed ? (
            <aside
              className="dashboard-update-notice"
              role="status"
              aria-label={t("dashboard.updateAvailable", { version: update.latestVersion })}
            >
              <div className="dashboard-update-notice-content">
                <Sparkles size={18} className="dashboard-update-icon" aria-hidden="true" />
                <span>{t("dashboard.updateBannerText", { current: LYL_CREATED_WITH_VERSION, latest: update.latestVersion })}</span>
                <a href={update.releaseUrl} target="_blank" rel="noreferrer" className="dashboard-update-link">
                  {t("dashboard.updateBannerLink")}
                </a>
              </div>
              <button
                type="button"
                className="dashboard-update-dismiss"
                onClick={dismissUpdate}
                aria-label={t("dashboard.updateDismiss")}
                title={t("dashboard.updateDismiss")}
              >
                <X size={16} />
              </button>
            </aside>
          ) : null}
          {dashboardSection === "shared" ? (
            <>
              {dashboardNotice ? <div className="dashboard-import-notice" role="status">{dashboardNotice}</div> : null}
              <div className="dashboard-section-header shared-projects-header">
                <div>
                  <h1>{t("shared.title")}</h1>
                  {/* Beim Suchen sagt diese Zeile, was gefunden wurde; sonst
                      ist sie die Adresse: Jeder Schritt zurueck ist ein
                      Schritt, den man gehen kann, und der letzte nennt den
                      Ordner, in dem man steht. */}
                  {searchResults && searchHits > 0 ? (
                    <p className="dashboard-section-subtitle store-search-line" role="status">
                      {searchHits === 1
                        ? t("shared.searchCountOne", { query: searchResults.query })
                        : t("shared.searchCountMany", { count: searchHits, query: searchResults.query })}
                      {searchResults.truncated ? ` ${t("shared.searchTruncated")}` : ""}
                    </p>
                  ) : searchResults ? null : (
                  <nav className="store-trail" aria-label={t("shared.trailLabel")}>
                    <button
                      type="button"
                      onClick={() => onOpenStoreFolder("")}
                      disabled={!sharedPath}
                      className={dropFolderPath === "" ? "drop-target" : undefined}
                      {...storeDropTarget("")}
                    >
                      {t("shared.trailRoot")}
                    </button>
                    {sharedPath.split("/").filter(Boolean).map((segment, index, all) => {
                      const upTo = all.slice(0, index + 1).join("/");
                      const here = index === all.length - 1;
                      return (
                        <Fragment key={upTo}>
                          <span className="store-trail-separator" aria-hidden="true">/</span>
                          <button
                            type="button"
                            onClick={() => onOpenStoreFolder(upTo)}
                            disabled={here}
                            className={dropFolderPath === upTo ? "drop-target" : undefined}
                            {...storeDropTarget(upTo)}
                          >
                            {segment}
                          </button>
                        </Fragment>
                      );
                    })}
                  </nav>
                  )}
                </div>
                <div className="shared-projects-actions">
                  {/* Anlegen gehoert in einen Ordner. In einer Trefferliste
                      steht stattdessen der Weg zurueck in den Ordner. */}
                  {searchResults ? (
                    <button className="shared-projects-refresh" type="button" onClick={() => onQueryChange("")}>
                      <X size={16} />
                      <span>{t("shared.searchClear")}</span>
                    </button>
                  ) : (
                  <>
                  <button className="shared-projects-refresh" type="button" onClick={onCreateInStoreFolder}>
                    <Plus size={16} strokeWidth={2.6} />
                    <span>{t("shared.newDesign")}</span>
                  </button>
                  <button
                    className="shared-projects-refresh"
                    type="button"
                    onClick={() => {
                      setFolderNameDraft(suggestStoreFolderName(t("shared.newFolderSuggestion"), sharedFolders.map((folder) => folder.name)));
                      setFolderDialog({ mode: "create" });
                    }}
                  >
                    <FolderPlus size={16} />
                    <span>{t("shared.newFolder")}</span>
                  </button>
                  </>
                  )}
                  <button className="shared-projects-refresh" type="button" onClick={() => onRefreshSharedProjects()} disabled={sharedProjectsLoading}>
                    <RefreshCw size={16} className={sharedProjectsLoading ? "spinning" : undefined} />
                    <span>{t("shared.refresh")}</span>
                  </button>
                </div>
              </div>
              {/* Inside a folder the grid is drawn even when there is nothing in
                  it, because the way back is one of its tiles. */}
              {shownSharedProjects.length > 0 || shownSharedFolders.length > 0 || (sharedPath && !searchResults) ? (
                <div className={viewMode === "grid" ? "project-grid" : "project-list"}>
                  {/* The way back, where the file managers have always put it:
                      first in the row, called after the two dots. It takes a
                      dropped project too, which is how one moves a project up
                      a level. */}
                  {sharedPath && !searchResults ? (
                    <article
                      className={`project-card server-folder-card store-parent-card${dropFolderPath === parentStorePath(sharedPath) ? " drop-target" : ""}`}
                      {...storeDropTarget(parentStorePath(sharedPath))}
                    >
                      <button className="project-card-open" type="button" onClick={() => onOpenStoreFolder(parentStorePath(sharedPath))}>
                        <span className="project-preview server-folder-preview">
                          <FolderUp aria-hidden="true" />
                        </span>
                        <span className="project-card-title">..</span>
                        <span className="project-card-meta">
                          {parentStorePath(sharedPath)
                            ? t("shared.parentFolderIn", { name: parentStorePath(sharedPath).split("/").slice(-1)[0] })
                            : t("shared.parentFolderRoot")}
                        </span>
                      </button>
                    </article>
                  ) : null}
                  {shownSharedFolders.map((folder) => {
                    const folderPath = joinStorePath(folder.path ?? sharedPath, folder.name);
                    return (
                    <article
                      className={`project-card server-folder-card${dropFolderPath === folderPath ? " drop-target" : ""}`}
                      key={`folder-${folderPath}`}
                      {...storeDropTarget(folderPath)}
                    >
                      <button
                        className="project-card-open"
                        type="button"
                        onClick={() => (searchResults ? openFolderFromSearch(folderPath) : onOpenStoreFolder(folderPath))}
                      >
                        <span className="project-preview server-folder-preview">
                          <FolderKanban aria-hidden="true" />
                        </span>
                        <span className="project-card-title">{folder.name}</span>
                        <span className="project-card-meta">{searchResults
                          ? (folder.path ? t("shared.searchFolderIn", { name: folder.path }) : t("shared.searchFolderRoot"))
                          : t("shared.folderMeta")}</span>
                      </button>
                      {/* Umbenennen und Loeschen eines Ordners gehoeren dorthin,
                          wo er steht - in der Trefferliste fuehrt die Kachel
                          erst einmal hin. */}
                      {searchResults ? null : (
                      <>
                      <button
                        className="project-menu-trigger"
                        type="button"
                        aria-label={t("shared.folderOptionsFor", { name: folder.name })}
                        aria-expanded={openFolderMenuName === folder.name}
                        title={t("shared.folderOptions")}
                        onClick={() => {
                          setOpenProjectMenuId(null);
                          setOpenSharedProjectMenuKey(null);
                          setOpenFolderMenuName((current) => (current === folder.name ? null : folder.name));
                        }}
                      >
                        <EllipsisVertical size={19} strokeWidth={2.5} />
                      </button>
                      {openFolderMenuName === folder.name ? (
                        <div className="project-card-menu" role="menu" aria-label={t("shared.folderMenuFor", { name: folder.name })}>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setOpenFolderMenuName(null);
                              setFolderNameDraft(folder.name);
                              setFolderDialog({ mode: "rename", path: folderPath, current: folder.name });
                            }}
                          >
                            <Pencil size={16} />
                            <span>{t("common.rename")}</span>
                          </button>
                          <button
                            className="delete"
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setOpenFolderMenuName(null);
                              setFolderPendingDeleteName(folder.name);
                            }}
                          >
                            <Trash2 size={16} />
                            <span>{t("common.delete")}</span>
                          </button>
                        </div>
                      ) : null}
                      </>
                      )}
                    </article>
                    );
                  })}
                  {shownSharedProjects.map((project, index) => {
                    const key = sharedProjectKey(project);
                    const where = project.path ?? "";
                    return (
                    <article
                      className={`project-card shared-project-card${draggedSharedKey === key ? " dragging" : ""}`}
                      key={key}
                      draggable={!searchResults}
                      title={searchResults ? undefined : t("shared.dragHint")}
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", project.fileName);
                        setDraggedSharedKey(key);
                      }}
                      onDragEnd={() => {
                        setDraggedSharedKey(null);
                        setDropFolderPath(null);
                      }}
                    >
                      <button className="project-card-open" type="button" onClick={() => onOpenSharedProject(project)}>
                        <ProjectPreview accent={PROJECT_ACCENTS[index % PROJECT_ACCENTS.length]} thumbnailUrl={project.thumbnailUrl} />
                        <span className="project-card-title">{project.name}</span>
                        <span className="project-card-meta">{formatUpdated(project.updatedAt, language)} - {formatFileSize(project.size)}</span>
                      </button>
                      {/* Ein Treffer sagt, wo er liegt - und der Ordner ist ein
                          Knopf, der genau dorthin fuehrt. Ohne das waere die
                          Trefferliste eine Sackgasse. */}
                      {searchResults ? (
                        <button
                          className="project-card-folder"
                          type="button"
                          aria-label={t("shared.openFolderOf", { name: where || t("shared.trailRoot") })}
                          onClick={() => openFolderFromSearch(where)}
                        >
                          <FolderKanban size={14} />
                          <span>{where || t("shared.trailRoot")}</span>
                        </button>
                      ) : null}
                      <button
                        className="project-menu-trigger"
                        type="button"
                        aria-label={t("shared.optionsFor", { name: project.name })}
                        aria-expanded={openSharedProjectMenuKey === key}
                        title={t("shared.options")}
                        onClick={() => {
                          setOpenProjectMenuId(null);
                          setOpenFolderMenuName(null);
                          setOpenSharedProjectMenuKey((current) => (current === key ? null : key));
                        }}
                      >
                        <EllipsisVertical size={19} strokeWidth={2.5} />
                      </button>
                      {openSharedProjectMenuKey === key ? (
                        <div className="project-card-menu" role="menu" aria-label={t("shared.menuFor", { name: project.name })}>
                          {/* Verschieben bietet die Ordner an, die hier offen
                              stehen - in einer Trefferliste waeren das die
                              falschen. Dorthin fuehrt der Ordnerknopf. */}
                          {searchResults ? null : (
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setOpenSharedProjectMenuKey(null);
                              setProjectPendingMoveKey(key);
                            }}
                          >
                            <FolderInput size={16} />
                            <span>{t("shared.moveTo")}</span>
                          </button>
                          )}
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setOpenSharedProjectMenuKey(null);
                              onDuplicateSharedProject(project);
                            }}
                          >
                            <Copy size={16} />
                            <span>{t("common.duplicate")}</span>
                          </button>
                          <button
                            className="delete"
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setOpenSharedProjectMenuKey(null);
                              setSharedProjectPendingDeleteKey(key);
                            }}
                          >
                            <Trash2 size={16} />
                            <span>{t("common.delete")}</span>
                          </button>
                        </div>
                      ) : null}
                    </article>
                    );
                  })}
                </div>
              ) : null}
              {shownSharedProjects.length === 0 && shownSharedFolders.length === 0 ? (
                <div className="project-empty">
                  <strong>{searchTerm
                    ? (sharedSearchLoading || !searchResults ? t("shared.loadingTitle") : t("shared.searchEmptyTitle"))
                    : (sharedProjectsLoading ? t("shared.loadingTitle") : t("shared.emptyTitle"))}</strong>
                  <span>{searchTerm && searchResults ? t("shared.searchEmptyHint") : t("shared.emptyHint")}</span>
                </div>
              ) : null}
            </>
          ) : (
            <>
              {/* Order follows what someone actually does: start something new,
                  pick up where they left off, open something that exists, then
                  the shared folder beside it. Settings close the row. */}
              <div className="dashboard-actions-band">
                <button className="dashboard-action-tile create" type="button" onClick={onCreate}>
                  <span className="dashboard-action-icon">
                    <Plus size={25} strokeWidth={2.8} />
                  </span>
                  <span>{t("dashboard.createDesign")}</span>
                </button>
                <button className="dashboard-action-tile" type="button" onClick={onWorkspace}>
                  <span className="dashboard-action-icon">
                    <Clock3 size={24} strokeWidth={2.4} />
                  </span>
                  <span>{t("dashboard.continueWorkplane")}</span>
                </button>
                <button className="dashboard-action-tile" type="button" onClick={onImportFile}>
                  <span className="dashboard-action-icon">
                    <FileUp size={24} strokeWidth={2.4} />
                  </span>
                  <span>{t("dashboard.importGeometry")}</span>
                </button>
              </div>
              {dashboardNotice ? (
                <div className="dashboard-import-notice" role="status">
                  {dashboardNotice}
                </div>
              ) : null}

              <div className="dashboard-section-header">
                <div>
                  <h1>{t("dashboard.projects")}</h1>
                  <span className="dashboard-section-subtitle">{projects.length === 1
                    ? t("dashboard.projectsVisibleOne")
                    : t("dashboard.projectsVisibleMany", { count: projects.length })}</span>
                </div>
                <div className="dashboard-controls">
                  <label className="dashboard-select">
                    <SlidersHorizontal size={17} />
                    <select value={sortMode} onChange={(event) => onSortModeChange(event.currentTarget.value)} aria-label={t("dashboard.sortLabel")}>
                      <option value="recent">{t("dashboard.sortRecent")}</option>
                      <option value="name">{t("dashboard.sortName")}</option>
                    </select>
                  </label>
                  <div className="dashboard-segmented" aria-label={t("dashboard.viewLabel")}>
                    <button className={viewMode === "grid" ? "active" : ""} type="button" aria-label={t("dashboard.viewGrid")} onClick={() => onViewModeChange("grid")}>
                      <Grid3X3 size={17} />
                    </button>
                    <button className={viewMode === "list" ? "active" : ""} type="button" aria-label={t("dashboard.viewList")} onClick={() => onViewModeChange("list")}>
                      <List size={18} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Two places, one row: the folder on the left holds what is on the
                  server, the cards beside it what this browser holds. Side by
                  side they cannot be mistaken for one another - and the folder
                  stays visible even when the browser has nothing in it yet. */}
              {projects.length > 0 || sharedProjectsEnabled ? (
                <div className={viewMode === "grid" ? "project-grid" : "project-list"}>
                  {sharedProjectsEnabled ? (
                    <article
                      className={`project-card server-folder-card${dropFolderPath === "server" ? " drop-target" : ""}`}
                      onDragOver={(event) => {
                        if (!draggedProjectId) return;
                        event.preventDefault();
                        event.dataTransfer.dropEffect = "move";
                        setDropFolderPath("server");
                      }}
                      onDragLeave={() => setDropFolderPath((current) => (current === "server" ? null : current))}
                      onDrop={(event) => {
                        event.preventDefault();
                        const projectId = draggedProjectId;
                        setDraggedProjectId(null);
                        setDropFolderPath(null);
                        if (projectId) onSendProjectToServer(projectId);
                      }}
                    >
                      <button className="project-card-open" type="button" onClick={onSharedProjects}>
                        <span className="project-preview server-folder-preview">
                          <FolderKanban size={46} strokeWidth={1.5} aria-hidden="true" />
                        </span>
                        <span className="project-card-title">{t("dashboard.sharedProjects")}</span>
                        {/* Beim Suchen sagt die Kachel, wieviel auf dem Server
                            gefunden wurde - sonst wuesste niemand, dass es dort
                            ueberhaupt etwas zu holen gibt. */}
                        <span className="project-card-meta">{searchResults
                          ? (searchHits === 1 ? t("shared.searchHitsOne") : t("shared.searchHitsMany", { count: searchHits }))
                          : sharedProjects.length === 1
                            ? t("dashboard.serverFolderCountOne")
                            : t("dashboard.serverFolderCountMany", { count: sharedProjects.length })}</span>
                      </button>
                    </article>
                  ) : null}
                  {projects.map((project) => (
                    <article
                      className={`project-card${draggedProjectId === project.id ? " dragging" : ""}`}
                      key={project.id}
                      draggable={sharedProjectsEnabled}
                      title={sharedProjectsEnabled ? t("dashboard.dragToServerHint") : undefined}
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", project.name);
                        setDraggedProjectId(project.id);
                      }}
                      onDragEnd={() => {
                        setDraggedProjectId(null);
                        setDropFolderPath(null);
                      }}
                    >
                      <button className="project-card-open" type="button" onClick={() => onOpenProject(project.id)}>
                        <ProjectPreview accent={project.accent} thumbnailUrl={project.thumbnailUrl} />
                        <span className="project-card-title">{project.name}</span>
                        <span className="project-card-meta">
                          {formatUpdated(project.updatedAt, language)} - {t("dashboard.shapeCount", { count: project.shapes })}
                        </span>
                      </button>
                      <button
                        className="project-menu-trigger"
                        type="button"
                        aria-label={t("dashboard.projectOptionsFor", { name: project.name })}
                        aria-expanded={openProjectMenuId === project.id}
                        title={t("dashboard.projectOptions")}
                        onClick={() => {
                          setOpenSharedProjectMenuKey(null);
                          setOpenFolderMenuName(null);
                          setOpenProjectMenuId((current) => (current === project.id ? null : project.id));
                        }}
                      >
                        <EllipsisVertical size={19} strokeWidth={2.5} />
                      </button>
                      {openProjectMenuId === project.id ? (
                        <div className="project-card-menu" role="menu" aria-label={t("dashboard.optionsFor", { name: project.name })}>
                          <button type="button" role="menuitem" onClick={() => startProjectRename(project)}>
                            <Pencil size={16} />
                            <span>{t("common.rename")}</span>
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setOpenProjectMenuId(null);
                              onDuplicateProject(project.id);
                            }}
                          >
                            <Copy size={16} />
                            <span>{t("common.duplicate")}</span>
                          </button>
                          <button
                            className="delete"
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setOpenProjectMenuId(null);
                              setProjectPendingDeleteId(project.id);
                            }}
                          >
                            <Trash2 size={16} />
                            <span>{t("common.delete")}</span>
                          </button>
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              ) : query.trim().length > 0 ? (
                <div className="project-empty">
                  <strong>{t("dashboard.emptyTitle")}</strong>
                  <span>{t("dashboard.emptyHint")}</span>
                </div>
              ) : null}
              {/* Open on a first visit, when there is nothing else to look at,
                  and folded away to a single line once projects exist - still
                  there for anyone who wants to read it again. `open` is keyed
                  to the unfiltered count, so a fruitless search neither opens
                  nor closes it behind the reader's back. */}
              <details className="dashboard-welcome" open={!hasProjects}>
                <summary className="dashboard-welcome-summary">
                  <span className="dashboard-welcome-summary-title">{t("welcome.teaserTitle")}</span>
                  <span className="dashboard-welcome-summary-hint">{t("welcome.teaserHint")}</span>
                </summary>
                <div className="dashboard-welcome-body">
                  <p>{t("welcome.lead")}</p>
                  <p className="dashboard-welcome-switch">
                    <strong>{t("welcome.switchTitle")}</strong> {t("welcome.switchBody")}
                  </p>
                  <ol>
                    <li>
                      <strong>{t("welcome.step1Title")}</strong>
                      <span>{t("welcome.step1Body")}</span>
                    </li>
                    <li>
                      <strong>{t("welcome.step2Title")}</strong>
                      <span>{t("welcome.step2Body")}</span>
                    </li>
                    <li>
                      <strong>{t("welcome.step3Title")}</strong>
                      <span>{t("welcome.step3Body")}</span>
                    </li>
                    <li>
                      <strong>{t("welcome.step4Title")}</strong>
                      <span>{t("welcome.step4Body")}</span>
                    </li>
                  </ol>
                  <p className="dashboard-welcome-help">{t("welcome.help")}</p>
                </div>
              </details>
            </>
          )}
          <AppFooter version={LYL_CREATED_WITH_VERSION} updateInfo={update} />
        </section>
      </div>

      {projectPendingDelete ? (
        <section className="dashboard-confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-project-title">
          <div className="dashboard-confirm-dialog">
            <header>
              <strong id="delete-project-title">{t("confirm.deleteProjectTitle")}</strong>
              <button type="button" aria-label={t("confirm.deleteProjectCancel")} onClick={() => setProjectPendingDeleteId(null)}>
                <X size={18} />
              </button>
            </header>
            <p>{t("confirm.deleteProjectBody", { name: projectPendingDelete.name })}</p>
            <div className="dashboard-confirm-actions">
              <button className="dashboard-confirm-cancel" type="button" onClick={() => setProjectPendingDeleteId(null)}>
                {t("confirm.cancel")}
              </button>
              <button className="dashboard-confirm-delete" type="button" onClick={confirmProjectDelete}>
                {t("confirm.delete")}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {sharedProjectPendingDelete ? (
        <section className="dashboard-confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-shared-project-title">
          <div className="dashboard-confirm-dialog">
            <header>
              <strong id="delete-shared-project-title">{t("confirm.deleteSharedTitle")}</strong>
              <button type="button" aria-label={t("confirm.deleteSharedCancel")} onClick={() => setSharedProjectPendingDeleteKey(null)}>
                <X size={18} />
              </button>
            </header>
            <p>{t("confirm.deleteSharedBody", { name: sharedProjectPendingDelete.name })}</p>
            <div className="dashboard-confirm-actions">
              <button className="dashboard-confirm-cancel" type="button" onClick={() => setSharedProjectPendingDeleteKey(null)}>
                {t("confirm.cancel")}
              </button>
              <button className="dashboard-confirm-delete" type="button" onClick={confirmSharedProjectDelete}>
                {t("confirm.delete")}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {projectPendingRename ? (
        <section className="dashboard-confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="rename-project-title">
          <form
            className="dashboard-confirm-dialog dashboard-rename-dialog"
            onSubmit={(event) => {
              event.preventDefault();
              confirmProjectRename();
            }}
          >
            <header>
              <strong id="rename-project-title">{t("confirm.renameTitle")}</strong>
              <button type="button" aria-label={t("confirm.renameCancel")} onClick={closeProjectRename}>
                <X size={18} />
              </button>
            </header>
            <label>
              <span>{t("confirm.projectName")}</span>
              <input
                autoFocus
                maxLength={80}
                value={projectNameDraft}
                onChange={(event) => setProjectNameDraft(event.currentTarget.value)}
                aria-label={t("confirm.projectName")}
              />
            </label>
            <div className="dashboard-confirm-actions">
              <button className="dashboard-confirm-cancel" type="button" onClick={closeProjectRename}>
                {t("confirm.cancel")}
              </button>
              <button className="dashboard-confirm-save" type="submit" disabled={!projectNameDraft.trim()}>
                {t("common.save")}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {/* What can be reached by dragging, reachable without a mouse: the folder
          above and the folders in this one. Anything further away is two moves,
          exactly as it would be with the mouse. */}
      {projectPendingMove ? (
        <section className="dashboard-confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="move-project-title">
          <div className="dashboard-confirm-dialog">
            <header>
              <strong id="move-project-title">{t("shared.moveToTitle", { name: projectPendingMove.name })}</strong>
              <button type="button" aria-label={t("shared.moveToCancel")} onClick={() => setProjectPendingMoveKey(null)}>
                <X size={18} />
              </button>
            </header>
            {sharedPath || sharedFolders.length > 0 ? (
              <div className="store-move-targets">
                {sharedPath ? (
                  <button
                    type="button"
                    onClick={() => {
                      onMoveSharedProject(projectPendingMove, parentStorePath(sharedPath));
                      setProjectPendingMoveKey(null);
                    }}
                  >
                    <FolderUp size={18} />
                    <span>{parentStorePath(sharedPath)
                      ? t("shared.parentFolderIn", { name: parentStorePath(sharedPath).split("/").slice(-1)[0] })
                      : t("shared.parentFolderRoot")}</span>
                  </button>
                ) : null}
                {sharedFolders.map((folder) => (
                  <button
                    key={`move-${folder.name}`}
                    type="button"
                    onClick={() => {
                      onMoveSharedProject(projectPendingMove, joinStorePath(sharedPath, folder.name));
                      setProjectPendingMoveKey(null);
                    }}
                  >
                    <FolderKanban size={18} />
                    <span>{folder.name}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p>{t("shared.moveNoTargets")}</p>
            )}
            <div className="dashboard-confirm-actions">
              <button className="dashboard-confirm-cancel" type="button" onClick={() => setProjectPendingMoveKey(null)}>
                {t("confirm.cancel")}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {folderPendingDelete ? (
        <section className="dashboard-confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-folder-title">
          <div className="dashboard-confirm-dialog">
            <header>
              <strong id="delete-folder-title">{t("shared.deleteFolderTitle")}</strong>
              <button type="button" aria-label={t("shared.deleteFolderCancel")} onClick={() => setFolderPendingDeleteName(null)}>
                <X size={18} />
              </button>
            </header>
            <p>
              {t("confirm.deleteFolderBody", { name: folderPendingDelete.name })}
              {/* What is inside is named before it goes, not afterwards. */}
              {folderPendingDeleteProjects > 0 ? ` ${folderPendingDeleteProjects === 1
                ? t("confirm.deleteFolderProjectOne")
                : t("confirm.deleteFolderProjectMany", { count: folderPendingDeleteProjects })}` : ""}
              {folderPendingDeleteFolders > 0 ? ` ${t("confirm.deleteFolderSubfolders")}` : ""}
            </p>
            <div className="dashboard-confirm-actions">
              <button className="dashboard-confirm-cancel" type="button" onClick={() => setFolderPendingDeleteName(null)}>
                {t("confirm.cancel")}
              </button>
              <button
                className="dashboard-confirm-delete"
                type="button"
                onClick={() => {
                  const recursive = folderPendingDeleteProjects > 0 || folderPendingDeleteFolders > 0;
                  onDeleteStoreFolder(joinStorePath(sharedPath, folderPendingDelete.name), recursive);
                  setFolderPendingDeleteName(null);
                }}
              >
                {t("confirm.delete")}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {/* The folder dialog is the rename dialog's twin on purpose: same frame,
          same pair of buttons. It only adds the line that says why a name will
          not do, because the server refuses the same names a second later. */}
      {folderDialog ? (
        <section className="dashboard-confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="new-folder-title">
          <form
            className="dashboard-confirm-dialog dashboard-rename-dialog"
            onSubmit={(event) => {
              event.preventDefault();
              confirmFolderDialog();
            }}
          >
            <header>
              <strong id="new-folder-title">{folderDialog.mode === "create" ? t("shared.newFolderTitle") : t("shared.renameFolderTitle")}</strong>
              <button type="button" aria-label={folderDialog.mode === "create" ? t("shared.newFolderCancel") : t("shared.renameFolderCancel")} onClick={closeFolderDialog}>
                <X size={18} />
              </button>
            </header>
            <label>
              <span>{t("shared.folderName")}</span>
              <input
                autoFocus
                maxLength={80}
                value={folderNameDraft}
                onChange={(event) => setFolderNameDraft(event.currentTarget.value)}
                onFocus={(event) => event.currentTarget.select()}
                onKeyDown={(event) => {
                  if (event.key === "Escape") closeFolderDialog();
                }}
                aria-label={t("shared.folderName")}
                aria-invalid={folderProblem && folderProblem !== "empty" ? true : undefined}
                aria-describedby={folderProblemMessage ? "new-folder-problem" : undefined}
              />
              {/* Inside the label, so it stands right under the field it is
                  about instead of a dialog's worth of padding below it. */}
              {folderProblemMessage ? (
                <span className="dashboard-dialog-problem" id="new-folder-problem" role="status">{folderProblemMessage}</span>
              ) : null}
            </label>
            <div className="dashboard-confirm-actions">
              <button className="dashboard-confirm-cancel" type="button" onClick={closeFolderDialog}>
                {t("confirm.cancel")}
              </button>
              <button className="dashboard-confirm-save" type="submit" disabled={Boolean(folderProblem)}>
                {folderDialog.mode === "create" ? t("shared.createFolder") : t("common.save")}
              </button>
            </div>
          </form>
        </section>
      ) : null}

    </main>
  );
}

function ProjectPreview({ accent, thumbnailUrl }: { accent: DashboardProject["accent"]; thumbnailUrl?: string | null }) {
  const [failedThumbnailUrl, setFailedThumbnailUrl] = useState<string | null>(null);
  const showThumbnail = Boolean(thumbnailUrl && thumbnailUrl !== failedThumbnailUrl);

  useEffect(() => {
    setFailedThumbnailUrl(null);
  }, [thumbnailUrl]);

  return (
    <span className={`project-preview accent-${accent}`} aria-hidden="true">
      {showThumbnail ? (
        <img className="project-thumbnail-image" src={thumbnailUrl ?? ""} alt="" onError={() => setFailedThumbnailUrl(thumbnailUrl ?? null)} />
      ) : (
        <>
          <span className="preview-grid" />
          <span className="preview-empty-mark">{t("dashboard.noSnapshot")}</span>
        </>
      )}
    </span>
  );
}
