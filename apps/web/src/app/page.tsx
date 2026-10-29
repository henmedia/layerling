"use client";

import { requestPersistentStorage } from "@/lib/persistentStorage";
import { keepShownSelection, localDesignKey, selectionHasStale, serverDesignKey, toggleDesignSelection } from "@/lib/designSelection";
import { Archive, ArchiveRestore, Check, CheckSquare, Clock3, Copy, EllipsisVertical, Folder, FolderInput, FolderKanban, FolderPlus, FolderUp, Grid3X3, List, LoaderCircle, Pencil, Plus, RefreshCw, Search, Server, Shapes, SlidersHorizontal, Sparkles, Trash2, X } from "lucide-react";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { AppFooter } from "@/components/AppFooter";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { ThemeSwitch } from "@/components/ThemeSwitch";
import { useAppUpdate } from "@/lib/useAppUpdate";
import { sharedProjectSaveTarget } from "@/lib/sharedProjectTarget";
import { storeFolderNameProblem, suggestStoreFolderName } from "@/lib/storeFolderName";
import {
  DESIGN_FOLDERS_STORAGE_KEY,
  childFolders,
  createDesignFolder,
  deleteDesignFolder,
  designFolderNameProblem,
  ensureFolderPath,
  folderAndDescendants,
  folderContents,
  folderOfDesign,
  folderPathNames,
  folderTrail,
  moveDesignFolder,
  moveDesignsToFolder,
  normalizeDesignFolders,
  renameDesignFolder,
  suggestDesignFolderName,
  type DesignFolder,
} from "@/lib/designFolders";
import dynamic from "next/dynamic";
import { importFailureSummary, importModelFiles } from "@/lib/modelImport";
import { loadTextFonts } from "@/lib/textFonts";
import { loadStoredCustomFonts } from "@/lib/customFontStore";
import { fetchServerDefaults, type NewDesignsOnServerSetting } from "@/lib/serverDefaults";
import { setServerSimpleMode } from "@/lib/simpleMode";
import { useSimpleMode } from "@/lib/useSimpleMode";
import { applyAppTheme, getAppThemePreference, hasStoredAppTheme, readStoredAppTheme, resolveAppTheme, setAppTheme, storeAppTheme, subscribeToAppTheme, type AppThemePreference, type ResolvedAppTheme } from "@/lib/appTheme";
import { hydrateEditorHistoryState, notesForHistoryIndex, type EditorHistoryEntry } from "@/lib/editorHistory";
import { detectLanguage, setLanguage, t, translate, type Language } from "@/lib/i18n";
import { localizedError } from "@/lib/userErrors";
import { historyTrimSteps, isProjectTooLargeError, isStorageFullError, trimHistoryWindow } from "@/lib/historyTrim";
import { GuideHelpLink } from "@/components/GuideHelpLink";
import { WelcomeGuideBody } from "@/components/WelcomeGuide";
import { DashboardWelcome, useWelcomeHidden } from "@/components/DashboardWelcome";
import { BrowserBackupNote, DesignTabs, type DesignTab } from "@/components/DesignTabs";
import { useOfflineAvailable } from "@/lib/offlineSupport";
import { InstallAppHint } from "@/components/InstallAppHint";
import { TabletHint } from "@/components/TabletHint";
import { WhatsNewCard } from "@/components/WhatsNewCard";
import { UpdatePreview } from "@/components/UpdatePreview";
import { useWhatsNew } from "@/lib/useWhatsNew";
import { TabPresenceNotice } from "@/components/TabPresenceNotice";
import { SafeModeErrorBoundary } from "@/components/SafeModeErrorBoundary";
import { duplicateName, type DuplicateNamePatterns } from "@/lib/duplicateName";
import { migrateLegacyProjectShapes, migrateLegacyStorageKeys, PROJECT_SHAPES_DB_NAME } from "@/lib/storageMigration";
import { useLanguage } from "@/lib/useLanguage";
import { waitForInputPause, watchUserInput } from "@/lib/inputPause";
import { createLocalId } from "@/lib/localIds";
import type { HistoryProjectRequest } from "@/components/LayerlingEditor";
import {
  horizontalPlacementWorkplane,
  normalizePlacementWorkplane,
  placementWorkplaneFingerprint,
  type PlacementWorkplane,
} from "@/lib/placementWorkplane";
import { dedupeProjectAssets } from "@/lib/projectAssets";
import { formatFileSize } from "@/lib/formatFileSize";
import { hydrateProjectShapeState, reconcileLoadedProjectShapeCacheEntry, type ImportedMeshResource } from "@/lib/projectShapePersistence";
import { ToolbarImportIcon } from "@/components/toolbarIcons";
import { writeDesignView, writeSavedViews } from "@/lib/designView";
import { writeCornerRulers } from "@/lib/cornerRulerStore";
import { readTape, writeTape } from "@/lib/tapeStore";
import { useFileAccept } from "@/lib/fileAccept";
import { lylFileAccessSupported, onLylFilesLaunched, pickFilesToImport, rememberLylFile, type LylFileHandle } from "@/lib/lylFileAccess";
import { exportLylProject, importLylProject, inspectLylProjectPackage, LYL_CREATED_WITH_VERSION, LYL_MEDIA_TYPE, withLylProjectName } from "@/lib/lylProject";
import { backupDesignAlreadyThere, backupEntryPaths, backupFileName, backupFolderPaths, backupThumbnailPath, unpackBackupFolders, isBackupFileName, createBackupWriter, unpackBackup, zipHoldsDesigns } from "@/lib/projectBackup";
import { CUSTOM_SHAPES_FOLDER } from "@/lib/customShapesServer";
import { downloadBackup, pngDataUrl, projectThumbnailBlob, projectThumbnailPngBytes, serverCustomShapesBackupEntries, writeServerBackup } from "@/lib/backupDownload";
import { customShapesBackupEntries, restoreCustomShapesFromBackup } from "@/lib/myShapes";
import { SHARED_PROJECTS_ENDPOINT } from "@/lib/sharedProjectsEndpoint";
import { sendSavedWorkspaceDefaultsToServer, syncWorkspaceDefaultWithServer } from "@/lib/serverWorkspaceDefault";
import { PICTURE_FILE_ACCEPT } from "@/lib/pictureIcon";
import { designsToRecover, hiddenCopiesOf, isInlineThumbnail, LOST_DESIGNS_RECOVERED_KEY, orphanedProjectIds, projectListForLocalStorage, withStoredThumbnails, writeProjectList } from "@/lib/designListStorage";
import { deleteDesignThumbnail, loadDesignThumbnails, saveDesignThumbnail } from "@/lib/designThumbnailStore";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE, normalizeSnapGrid, normalizeWorkspaceSettings, readWorkspaceDefault, workplaneSettingsFingerprint } from "@/lib/workplaneSettings";
import type { GridSize, ProjectAsset, ProjectAttachment, WorkplaneShape, WorkplaneWorkspaceSettings } from "@/types/layerling";

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
  /** The folder of this browser the design is in (#496); none at the top level. */
  folderId?: string | null;
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
  /** The files kept with the design (#820). They travel in the stored package, like the assets. */
  attachments: ProjectAttachment[];
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
  /** Read from the stored package when a project is loaded; never written to the record itself. */
  attachments?: ProjectAttachment[];
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
/** Whether a new design starts in the server folder when there is one (#316). Kept in this browser. */
const NEW_DESIGNS_ON_SERVER_KEY = "layerling.newDesignsOnServer";
/**
 * Where "Back up all" is, noted before each design (#887). When the browser runs out of memory on a large design,
 * Safari reloads the page and the backup never gets to say anything; the start page reads this afterwards and
 * names the design it stopped at. Cleared when the backup ends, either way.
 */
const BACKUP_PROGRESS_KEY = "layerling.backupInProgress";
type BackupProgress = { index: number; total: number; name: string };

function writeBackupProgress(progress: BackupProgress | null) {
  try {
    if (progress) window.localStorage.setItem(BACKUP_PROGRESS_KEY, JSON.stringify(progress));
    else window.localStorage.removeItem(BACKUP_PROGRESS_KEY);
  } catch {
    // Without storage the backup still works; only the note after a reload is missing.
  }
}

/** A backup that was cut off by a reload, read once: the note goes with it. */
function takeInterruptedBackup(): BackupProgress | null {
  try {
    const raw = window.localStorage.getItem(BACKUP_PROGRESS_KEY);
    window.localStorage.removeItem(BACKUP_PROGRESS_KEY);
    const value = raw ? JSON.parse(raw) as Partial<BackupProgress> : null;
    return value && typeof value.name === "string" && typeof value.index === "number" && typeof value.total === "number" ? value as BackupProgress : null;
  } catch {
    return null;
  }
}

/** How long a new design waits for the server's answer before it goes where the start page says. */
const SERVER_ANSWER_WAIT_MS = 8000;

/**
 * The answers the start page waits for before it knows where a new design goes and how it starts: the
 * server's defaults, the first look at its folder and the "Make default" kept in its store. `wait()` holds
 * until each has come, or for SERVER_ANSWER_WAIT_MS at most.
 */
function serverAnswerGate() {
  let defaults = () => {};
  let listing = () => {};
  let settings = () => {};
  const answered = Promise.all([
    new Promise<void>((resolve) => { defaults = resolve; }),
    new Promise<void>((resolve) => { listing = resolve; }),
    new Promise<void>((resolve) => { settings = resolve; }),
  ]);
  const wait = () => Promise.race([answered, new Promise((resolve) => setTimeout(resolve, SERVER_ANSWER_WAIT_MS))]).then(() => undefined);
  return { defaults: () => defaults(), listing: () => listing(), settings: () => settings(), wait };
}
/** So lang darf ein Entwurfsname werden - so lang kuerzt auch das Umbenennen. */
const PROJECT_NAME_LIMIT = 80;
/** Und so lang der Dateiname auf dem Server, ohne Endung: beide Speicher kuerzen dort. */
const SHARED_PROJECT_NAME_LIMIT = 115;
const PROJECT_SHAPES_STORE_NAME = "projectShapes";
const PROJECT_SHAPE_RESOURCES_STORE_NAME = "projectShapeResources";
const PROJECT_ACCENTS: DashboardProject["accent"][] = ["cyan", "green", "gold", "red"];
const STATIC_EXPORT_BUILD = process.env.NEXT_PUBLIC_STATIC_EXPORT === "true";
const EDITOR_SKELETON_MIN_DURATION_MS = 320;

/**
 * The editor - three.js, CSG, the CAD tooling and the text typefaces - is its
 * own chunk, so the dashboard does not download and parse it before it can
 * show a single project card. The typefaces are awaited with it because text
 * geometry is built synchronously inside the editor. A failed attempt is
 * dropped so the next one fetches again.
 */
let editorModulePromise: Promise<typeof import("@/components/LayerlingEditor")> | null = null;

function loadEditorModule() {
  // Fonts of one's own kept in this browser come along; without them the built-in ones still work.
  editorModulePromise ??= Promise.all([
    import("@/components/LayerlingEditor"),
    loadTextFonts(),
    loadStoredCustomFonts(),
    // The 2D kernel builds the wider layers of a name tag and every text fill (#215); drawn before
    // it is there, such a text stands as plain letters for a moment. It comes with the editor
    // (0.6 MB, kept by the browser); should it fail, the editor opens and texts ask for it again.
    import("@/lib/editorMeshCore").then((core) => core.getManifoldRuntime()).catch(() => undefined),
  ])
    .then(([editorModule]) => editorModule)
    .catch((error) => {
      editorModulePromise = null;
      throw error;
    });
  return editorModulePromise;
}

const LayerlingEditor = dynamic(() => loadEditorModule().then((editorModule) => editorModule.LayerlingEditor), {
  ssr: false,
  loading: () => <EditorLoadingSkeleton />,
});
const knownProjectResourceKeys = new Map<string, Set<string>>();

function formatUpdated(timestamp: number, language: Language) {
  const age = Date.now() - timestamp;
  if (age < 60_000) return t("dashboard.justNow");
  if (age < 3_600_000) return t("dashboard.minutesAgo", { count: Math.max(1, Math.round(age / 60_000)) });
  if (age < 86_400_000) return t("dashboard.today");
  return new Intl.DateTimeFormat(language, { month: "short", day: "numeric" }).format(new Date(timestamp));
}

function projectShapeCacheEntry(
  revision: number,
  shapes: WorkplaneShape[],
  history?: EditorHistoryEntry[],
  historyIndex?: number,
  assets: ProjectAsset[] = [],
  attachments: ProjectAttachment[] = [],
): ProjectShapeCacheEntry {
  const hydrated = hydrateEditorHistoryState(shapes, history, historyIndex, "unlimited", notesForHistoryIndex(history, historyIndex));
  return {
    revision,
    shapes: hydrated.entries[hydrated.index]?.shapes ?? shapes,
    history: hydrated.entries,
    historyIndex: hydrated.index,
    assets: dedupeProjectAssets(assets),
    attachments,
  };
}

function projectShapeCacheEntryFromEditor(
  revision: number,
  shapes: WorkplaneShape[],
  history: EditorHistoryEntry[],
  historyIndex: number,
  assets: ProjectAsset[],
  attachments: ProjectAttachment[],
): ProjectShapeCacheEntry {
  if (history.length === 0) {
    return projectShapeCacheEntry(revision, shapes, history, historyIndex, assets, attachments);
  }
  return {
    revision,
    shapes,
    history,
    historyIndex: Math.min(Math.max(0, historyIndex), history.length - 1),
    assets: dedupeProjectAssets(assets),
    attachments,
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
      attachments: restored.attachments,
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
  // Under the card's name: a rename on the start page leaves the old one in the saved package (#689).
  if (stored) return withLylProjectName(stored, project.name);
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

/** What a save did besides saving: the stored copy keeps a part of the history only, because the whole one was too big (#475). */
type ProjectShapesSaveResult = { historyTrimmed?: { kept: number; total: number } };

async function saveProjectShapes(projectId: string, entry: ProjectShapeCacheEntry, context: ProjectShapeSaveContext): Promise<ProjectShapesSaveResult> {
  const pack = (history: ProjectShapeCacheEntry["history"], historyIndex: number) => exportLylProject({
    projectId,
    projectName: context.projectName,
    createdAt: context.createdAt,
    modifiedAt: entry.revision,
    shapes: entry.shapes,
    notes: notesForHistoryIndex(history, historyIndex),
    history,
    historyIndex,
    assets: entry.assets,
    attachments: entry.attachments,
    workspace: context.workspace,
    snapGrid: context.snapGrid,
    placementElevation: context.placementElevation,
    placementWorkplane: context.placementWorkplane,
    sketchPlacementWorkplane: context.sketchPlacementWorkplane,
    compressionLevel: 1,
  });
  let lylPackage: Awaited<ReturnType<typeof exportLylProject>>;
  let historyTrimmed: ProjectShapesSaveResult["historyTrimmed"];
  try {
    lylPackage = await pack(entry.history, entry.historyIndex);
  } catch (error) {
    if (!isProjectTooLargeError(error) || entry.history.length <= 1) throw error;
    // Too big with the whole history: keep the newest steps that fit, so the design is saved all the same.
    let packed: Awaited<ReturnType<typeof exportLylProject>> | null = null;
    for (const keep of historyTrimSteps(entry.history.length)) {
      const trimmed = trimHistoryWindow(entry.history, entry.historyIndex, keep);
      try {
        packed = await pack(trimmed.history, trimmed.historyIndex);
        historyTrimmed = { kept: trimmed.history.length, total: entry.history.length };
        break;
      } catch (retryError) {
        if (!isProjectTooLargeError(retryError)) throw retryError;
      }
    }
    if (!packed) throw error;
    lylPackage = packed;
  }
  const database = await openProjectShapesDb();
  return new Promise<ProjectShapesSaveResult>((resolve, reject) => {
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
      resolve({ historyTrimmed });
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

/** The newest revision of each project that the editor has asked to be saved. */
const newestRequestedRevision = new Map<string, number>();

function saveProjectShapesWhenIdle(projectId: string, entry: ProjectShapeCacheEntry, context: ProjectShapeSaveContext): Promise<ProjectShapesSaveResult | void> {
  // Saves of one project run one after another. Each change queues one, so a
  // run of quick changes would otherwise be written once per change, and a
  // dense design takes over a second to write. An older state whose newer one
  // is already waiting is skipped: the newer save holds everything it has.
  const superseded = () => (newestRequestedRevision.get(projectId) ?? 0) > entry.revision;
  return new Promise<ProjectShapesSaveResult | void>((resolve, reject) => {
    const save = () => {
      if (superseded()) {
        resolve();
        return;
      }
      void saveProjectShapes(projectId, entry, context).then(resolve, reject);
    };
    if (superseded()) {
      resolve();
      return;
    }
    // A hidden window may be frozen or closed before it is ever idle again.
    if (typeof window === "undefined" || document.visibilityState === "hidden") {
      save();
      return;
    }
    // Hold back while someone is dragging or typing; a click that comes in during a save has to wait for it.
    watchUserInput();
    void waitForInputPause().then(() => {
      if ("requestIdleCallback" in window && document.visibilityState !== "hidden") {
        window.requestIdleCallback(save, { timeout: 1200 });
        return;
      }
      globalThis.setTimeout(save, 32);
    });
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

/** The ids of every design whose shapes are kept in this browser. */
async function storedProjectShapeIds(): Promise<string[]> {
  const database = await openProjectShapesDb();
  try {
    return await new Promise<string[]>((resolve, reject) => {
      const transaction = database.transaction(PROJECT_SHAPES_STORE_NAME, "readonly");
      const request = transaction.objectStore(PROJECT_SHAPES_STORE_NAME).getAllKeys();
      request.onsuccess = () => resolve(request.result.filter((key): key is string => typeof key === "string"));
      request.onerror = () => reject(request.error ?? new Error("Could not list project shapes"));
    });
  } finally {
    database.close();
  }
}

async function loadProjectShapeRecord(projectId: string): Promise<ProjectShapeRecord | null> {
  const database = await openProjectShapesDb();
  try {
    return await new Promise<ProjectShapeRecord | null>((resolve, reject) => {
      const transaction = database.transaction(PROJECT_SHAPES_STORE_NAME, "readonly");
      const request = transaction.objectStore(PROJECT_SHAPES_STORE_NAME).get(projectId);
      request.onsuccess = () => resolve((request.result as ProjectShapeRecord | undefined) ?? null);
      request.onerror = () => reject(request.error ?? new Error("Could not load project shapes"));
    });
  } finally {
    database.close();
  }
}

/**
 * Cards for the designs whose shapes are still here although the list lost them - a full storage could wipe the
 * list before 1.95.0 (#656). Name, dates and settings come from the stored package; one that cannot be read is
 * left where it is, and so is a second copy of a design that is already back.
 */
async function recoverOrphanedProjects(listed: DashboardProject[]): Promise<DashboardProject[]> {
  const candidates = await orphanedProjectRecords(listed.map((project) => project.id));
  const recovered: DashboardProject[] = [];
  for (const { id: projectId, record, bytes } of designsToRecover(listed, candidates)) {
    try {
      const restored = await importLylProject(bytes);
      const updatedAt = Number.isFinite(restored.modifiedAt) ? restored.modifiedAt : (record.updatedAt ?? Date.now());
      recovered.push({
        id: projectId,
        name: restored.projectName,
        createdAt: Number.isFinite(restored.createdAt) ? restored.createdAt : updatedAt,
        updatedAt,
        shapes: restored.shapes.length,
        accent: PROJECT_ACCENTS[(listed.length + recovered.length) % PROJECT_ACCENTS.length],
        thumbnailUrl: null,
        revision: record.revision,
        workspace: restored.workspace,
        snapGrid: restored.snapGrid,
        placementElevation: restored.placementElevation,
        placementWorkplane: restored.placementWorkplane,
        sketchPlacementWorkplane: restored.sketchPlacementWorkplane,
        folderId: null,
      });
    } catch {
      // Unreadable: it stays in the database untouched, nothing is lost by leaving it.
    }
  }
  return recovered;
}

/** Deletes the copies of a design a restore left behind without a card, so none of them comes back as it (#656). */
async function deleteHiddenCopies(design: Pick<DashboardProject, "name" | "createdAt">, listedIds: string[]) {
  for (const projectId of hiddenCopiesOf(design, await orphanedProjectRecords(listedIds))) {
    await deleteProjectShapes(projectId);
    void deleteDesignThumbnail(projectId);
  }
}

/** The stored designs no card points to, with name and creation time read from their package. */
async function orphanedProjectRecords(listedIds: string[]) {
  const orphans = orphanedProjectIds(listedIds, await storedProjectShapeIds());
  const candidates: Array<{ id: string; name: string; createdAt: number; revision: number; record: ProjectShapeRecord; bytes: Uint8Array }> = [];
  for (const projectId of orphans) {
    try {
      const record = await loadProjectShapeRecord(projectId);
      const stored = record?.lylPackage ?? record?.skfPackage;
      if (!record || !stored) continue;
      const bytes = new Uint8Array(stored);
      const summary = await inspectLylProjectPackage(bytes);
      candidates.push({ id: projectId, name: summary.projectName, createdAt: summary.createdAt, revision: record.revision, record, bytes });
    } catch {
      // Unreadable: it stays in the database untouched, nothing is lost by leaving it.
    }
  }
  return candidates;
}

/** The card pictures read from their own database, so a list read again from localStorage gets them back. */
const knownDesignThumbnails = new Map<string, string>();

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
          thumbnailUrl: typeof project.thumbnailUrl === "string" && project.thumbnailUrl ? project.thumbnailUrl : (knownDesignThumbnails.get(id) ?? null),
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
          folderId: typeof project.folderId === "string" && project.folderId ? project.folderId : null,
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
    ...(project.folderId ? { folderId: project.folderId } : {}),
  };
}

function mergeProjectsForStorage(projects: DashboardProject[]) {
  const storedProjects = readProjects();
  const storedById = new Map(storedProjects.map((project) => [project.id, project]));
  return projects.map((project) => projectForStorage(mergeProjectForStorage(project, storedById.get(project.id))));
}

function readDesignFolders(): DesignFolder[] {
  if (typeof window === "undefined") return [];
  try {
    return normalizeDesignFolders(JSON.parse(window.localStorage.getItem(DESIGN_FOLDERS_STORAGE_KEY) ?? "[]"));
  } catch {
    return [];
  }
}

function newProject(name: string, index: number, shapeCount = 0, folderId: string | null = null): DashboardProject {
  const now = Date.now();
  const savedDefault = readWorkspaceDefault();
  return {
    id: createLocalId("project"),
    name,
    createdAt: now,
    updatedAt: now,
    shapes: shapeCount,
    accent: PROJECT_ACCENTS[index % PROJECT_ACCENTS.length],
    revision: now,
    workspace: savedDefault?.workspace ?? DEFAULT_WORKPLANE_WORKSPACE,
    snapGrid: savedDefault?.snap ?? DEFAULT_SNAP_GRID,
    placementElevation: 0,
    placementWorkplane: horizontalPlacementWorkplane(),
    sketchPlacementWorkplane: horizontalPlacementWorkplane(),
    ...(folderId ? { folderId } : {}),
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
  // Folders for the designs of this browser (#496), and the one that is open on the start page.
  const [designFolders, setDesignFolders] = useState<DesignFolder[]>([]);
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const designFoldersJsonRef = useRef<string | null>(null);
  const [dashboardSection, setDashboardSection] = useState<DashboardSection>("home");
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortMode, setSortMode] = useState("recent");
  // What the person chose (null: nothing yet) and what the server says (LAYERLING_NEW_DESIGNS_ON_SERVER):
  // "on" is the start for whoever has not chosen, "always" holds for everyone.
  const [newDesignsChoice, setNewDesignsChoice] = useState<boolean | null>(null);
  const [serverNewDesigns, setServerNewDesigns] = useState<NewDesignsOnServerSetting | null>(null);
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(NEW_DESIGNS_ON_SERVER_KEY);
      setNewDesignsChoice(stored === "1" ? true : stored === "0" ? false : null);
    } catch {
      // A browser that refuses storage keeps the answer for this visit only.
    }
  }, []);
  const newDesignsOnServerLocked = serverNewDesigns === "always";
  const newDesignsOnServer = newDesignsOnServerLocked || (newDesignsChoice ?? serverNewDesigns === "on");
  const changeNewDesignsOnServer = useCallback((on: boolean) => {
    setNewDesignsChoice(on);
    try {
      window.localStorage.setItem(NEW_DESIGNS_ON_SERVER_KEY, on ? "1" : "0");
    } catch {
      // See above.
    }
  }, []);
  const [themePreference, setThemePreference] = useState<AppThemePreference>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedAppTheme>("light");
  const [dashboardNotice, setDashboardNotice] = useState("");
  // A design left with nothing in it, waiting for an answer on whether it stays.
  const [emptyProjectPromptId, setEmptyProjectPromptId] = useState<string | null>(null);
  const [sharedProjects, setSharedProjects] = useState<SharedProject[]>([]);
  const [sharedFolders, setSharedFolders] = useState<SharedFolder[]>([]);
  const [sharedPath, setSharedPath] = useState("");
  /** Designs in the whole server store, for the server's tab; null until it has answered. */
  const [sharedTotal, setSharedTotal] = useState<number | null>(null);
  /** Decided once, when both counts are first known, so the tabs do not swap places under the pointer. */
  const [serverTabFirst, setServerTabFirst] = useState<boolean | null>(null);
  /** A tab was picked, or a design was left, before that: the open tab stays as it is. */
  const tabChosenRef = useRef(false);
  const [sharedProjectsEnabled, setSharedProjectsEnabled] = useState(false);
  const [sharedProjectsLoading, setSharedProjectsLoading] = useState(false);
  const [sharedSearch, setSharedSearch] = useState<SharedSearchResult | null>(null);
  const [sharedSearchLoading, setSharedSearchLoading] = useState(false);
  const [openingSharedKey, setOpeningSharedKey] = useState<string | null>(null);
  // Hochgezaehlt, wenn sich am Server etwas geaendert hat: Eine Trefferliste
  // muss dann neu gefragt werden, sie haengt an keinem Ordner.
  const [sharedSearchNonce, setSharedSearchNonce] = useState(0);
  const [projectShapesById, setProjectShapesById] = useState<Record<string, ProjectShapeCacheEntry>>({});
  const projectsJsonRef = useRef("");
  const sharedPathRef = useRef("");
  // Where a new design goes is known only once the server has answered: its defaults (LAYERLING_NEW_DESIGNS_ON_SERVER)
  // and whether it has a folder at all. A design made before that, right after a container start, would land in this
  // browser behind the setting's back. The answers are kept in refs as they come, since the work that waits for them
  // runs before the next render.
  const [serverAnswer] = useState(serverAnswerGate);
  const serverNewDesignsRef = useRef<NewDesignsOnServerSetting | null>(null);
  const sharedEnabledRef = useRef(false);
  const newDesignsChoiceRef = useRef(newDesignsChoice);
  newDesignsChoiceRef.current = newDesignsChoice;
  const sharedProjectsRef = useRef(sharedProjects);
  sharedProjectsRef.current = sharedProjects;
  /** Whether a design made now starts in the server folder: "Create new 3D design", and every other way too. */
  const newDesignsGoToServer = useCallback(() => sharedEnabledRef.current && (
    serverNewDesignsRef.current === "always" || (newDesignsChoiceRef.current ?? serverNewDesignsRef.current === "on")
  ), []);
  // Left open on an iPad, which greys out files of types it does not know (#219).
  const dashboardImportAccept = useFileAccept(`.lyl,.skf,.zip,.stl,.obj,.mtl,.3mf,.step,.stp,.svg,.dxf,image/svg+xml,${PICTURE_FILE_ACCEPT}`);
  const dashboardImportInputRef = useRef<HTMLInputElement | null>(null);
  const backupRestoreInputRef = useRef<HTMLInputElement | null>(null);
  const nextProjectRevisionRef = useRef(0);
  const projectShapeSaveQueuesRef = useRef<Record<string, Promise<ProjectShapesSaveResult | void>>>({});
  /** Designs whose stored history was cut for size and that were told so already (#475). */
  const trimmedHistoryToldRef = useRef<Set<string>>(new Set());
  /** The upload to the server still running per design, so removing it can wait for its revision. */
  const sharedSavesRef = useRef<Record<string, Promise<SharedProject | undefined>>>({});
  /** The newest list, for work that resumes after waiting on a save. */
  const projectsRef = useRef(projects);
  projectsRef.current = projects;
  const [projectSaveFailure, setProjectSaveFailure] = useState<{ message: string; at: number } | null>(null);
  const editorLoadingStartedAtRef = useRef(0);

  // Warm the editor chunk once the dashboard is idle, so opening a project
  // does not wait for the download the first page load skipped.
  useEffect(() => {
    const warm = () => void loadEditorModule().catch(() => undefined);
    if ("requestIdleCallback" in window) {
      const handle = window.requestIdleCallback(warm, { timeout: 4000 });
      return () => window.cancelIdleCallback(handle);
    }
    const timer = globalThis.setTimeout(warm, 1500);
    return () => globalThis.clearTimeout(timer);
  }, []);

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
      const payload = await response.json() as { enabled?: boolean; path?: string; total?: number; folders?: SharedFolder[]; projects?: SharedProject[]; error?: string };
      sharedEnabledRef.current = Boolean(payload.enabled);
      setSharedProjectsEnabled(Boolean(payload.enabled));
      if (typeof payload.total === "number") setSharedTotal(payload.total);
      setSharedProjects(Array.isArray(payload.projects) ? payload.projects : []);
      setSharedFolders(Array.isArray(payload.folders) ? payload.folders : []);
      // A folder that is gone takes us back to where it was, not to an error.
      const landed = typeof payload.path === "string" ? payload.path : "";
      sharedPathRef.current = response.ok ? landed : parentStorePath(wanted);
      setSharedPath(sharedPathRef.current);
      if (!response.ok && payload.enabled) setDashboardNotice(payload.error ? localizedError(payload.error) : t("notice.sharedLoadFailed"));
    } catch {
      sharedEnabledRef.current = false;
      setSharedProjectsEnabled(false);
      setSharedProjects([]);
      setSharedFolders([]);
      setSharedTotal(null);
    } finally {
      setSharedProjectsLoading(false);
      serverAnswer.listing();
    }
  }, [serverAnswer]);

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
    // The design name stays in the toolbar; the old switch is gone.
    window.localStorage.removeItem("layerling.showProjectNameInToolbar");
    const storedTheme = readStoredAppTheme(window.localStorage);
    // A first visit takes the theme the server suggests (LAYERLING_DEFAULT_THEME), if it has one;
    // a browser that already has a theme on record keeps it. A static copy has no server to ask.
    const themeOnRecord = hasStoredAppTheme(window.localStorage);
    if (!STATIC_EXPORT_BUILD) {
      void fetchServerDefaults().then((defaults) => {
        serverNewDesignsRef.current = defaults.newDesignsOnServer;
        setServerNewDesigns(defaults.newDesignsOnServer);
        setServerSimpleMode(defaults.simpleMode);
        if (!themeOnRecord && defaults.theme && getAppThemePreference() === "system") setAppTheme(defaults.theme);
      }).finally(serverAnswer.defaults);
    } else {
      serverAnswer.defaults();
    }
    // "Make default" kept in the server store comes back to a browser that forgot it.
    void syncWorkspaceDefaultWithServer(window.localStorage).finally(serverAnswer.settings);
    setAppTheme(storedTheme, false);
    setThemePreference(storedTheme);
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setResolvedTheme(resolveAppTheme(storedTheme, systemPrefersDark));
    const { projects: storedProjects, legacyShapes } = readStoredProjects();
    setProjects(storedProjects);
    // A backup the page did not live to finish says where it stopped (#887).
    const interruptedBackup = takeInterruptedBackup();
    if (interruptedBackup) setDashboardNotice(t("notice.backupInterrupted", { ...interruptedBackup }));
    void (async () => {
      const thumbnails = await loadDesignThumbnails();
      thumbnails.forEach((dataUrl, projectId) => {
        if (!knownDesignThumbnails.has(projectId)) knownDesignThumbnails.set(projectId, dataUrl);
      });
      // Designs whose card the list lost come back from their stored shapes (#656), looked for once per browser.
      let recovered: DashboardProject[] = [];
      let recoveredBefore = true;
      try {
        recoveredBefore = window.localStorage.getItem(LOST_DESIGNS_RECOVERED_KEY) !== null;
      } catch {
        // Without localStorage there is no list to have lost either.
      }
      if (!recoveredBefore) {
        recovered = await recoverOrphanedProjects(storedProjects).catch(() => []);
        try {
          window.localStorage.setItem(LOST_DESIGNS_RECOVERED_KEY, String(Date.now()));
        } catch {
          // Then it looks again next time, which is what it did before.
        }
      }
      setProjects((current) => {
        const listed = new Set(current.map((project) => project.id));
        const added = recovered.filter((project) => !listed.has(project.id));
        return withStoredThumbnails(added.length ? [...current, ...added] : current, knownDesignThumbnails);
      });
    })();
    const storedFolders = readDesignFolders();
    designFoldersJsonRef.current = JSON.stringify(storedFolders);
    setDesignFolders(storedFolders);
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

  // And a default saved here goes to the store, for the other browsers.
  useEffect(() => sendSavedWorkspaceDefaultsToServer(window.localStorage), []);

  useEffect(() => {
    return subscribeToAppTheme(() => {
      const nextPref = getAppThemePreference();
      setThemePreference(nextPref);
      const systemPrefersDark = typeof window !== "undefined" && typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
        : false;
      setResolvedTheme(resolveAppTheme(nextPref, systemPrefersDark));
    });
  }, []);

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

  // The place with more designs gets the first tab, and opens first unless a tab was already picked.
  useEffect(() => {
    if (!mounted || serverTabFirst !== null || !sharedProjectsEnabled || sharedTotal === null) return;
    const first = sharedTotal > projects.filter((project) => !project.sharedProject).length;
    setServerTabFirst(first);
    if (first && !tabChosenRef.current) setDashboardSection("shared");
  }, [mounted, projects, serverTabFirst, sharedProjectsEnabled, sharedTotal]);

  useEffect(() => {
    if (!mounted) return;
    const localSerialized = JSON.stringify(projects);
    const storageProjects = mergeProjectsForStorage(projects);
    // The card pictures go to their own database; the list in localStorage stays small (#656).
    storageProjects.forEach((project) => {
      if (!isInlineThumbnail(project.thumbnailUrl) || knownDesignThumbnails.get(project.id) === project.thumbnailUrl) return;
      knownDesignThumbnails.set(project.id, project.thumbnailUrl);
      void saveDesignThumbnail(project.id, project.thumbnailUrl).catch(() => undefined);
    });
    const serialized = JSON.stringify(projectListForLocalStorage(storageProjects));
    if (projectsJsonRef.current === serialized) return;
    // A list that does not fit leaves the one before it in place (#656). The browser's own text
    // ("QuotaExceededError ... exceeded the quota") helps nobody.
    if (!writeProjectList(window.localStorage, PROJECTS_STORAGE_KEY, serialized)) {
      setDashboardNotice(t("notice.projectListSaveFailed"));
      return;
    }
    projectsJsonRef.current = serialized;
    if (JSON.stringify(storageProjects) !== localSerialized) {
      setProjects(storageProjects);
    }
  }, [mounted, projects]);

  // With a design to keep, ask the browser once not to clear the storage first (lib/persistentStorage.ts).
  useEffect(() => {
    if (mounted && projects.length > 0) void requestPersistentStorage();
  }, [mounted, projects.length]);

  // Closing the window while a save is still being written would lose it; the
  // browser asks first. A save takes well under a second, so this rarely shows.
  useEffect(() => {
    const warnWhileSaving = (event: BeforeUnloadEvent) => {
      if (Object.keys(projectShapeSaveQueuesRef.current).length === 0) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnWhileSaving);
    return () => window.removeEventListener("beforeunload", warnWhileSaving);
  }, []);

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

  // The folders are kept beside the list of designs, and another tab sees a change at once.
  useEffect(() => {
    if (!mounted) return;
    const serialized = JSON.stringify(designFolders);
    if (designFoldersJsonRef.current === serialized) return;
    try {
      window.localStorage.setItem(DESIGN_FOLDERS_STORAGE_KEY, serialized);
      designFoldersJsonRef.current = serialized;
    } catch {
      setDashboardNotice(t("notice.projectListSaveFailed"));
    }
  }, [designFolders, mounted]);

  useEffect(() => {
    if (!mounted) return;
    const onStorage = (event: StorageEvent) => {
      if (event.key !== DESIGN_FOLDERS_STORAGE_KEY) return;
      designFoldersJsonRef.current = event.newValue ?? "[]";
      setDesignFolders(readDesignFolders());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [mounted]);

  // A folder that is gone (deleted here or in another tab) is no place to stand in.
  useEffect(() => {
    if (openFolderId && !designFolders.some((folder) => folder.id === openFolderId)) setOpenFolderId(null);
  }, [designFolders, openFolderId]);

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
        const loadedEntry = projectShapeCacheEntry(Math.max(loadedRevision, 1), record?.shapes ?? [], record?.history, record?.historyIndex, record?.assets, record?.attachments);
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
          setDashboardNotice(error instanceof Error ? localizedError(error.message) : t("notice.projectShapesLoadFailed"));
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

  const visibleProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    // A project that lives on the server belongs in the folder, not twice in
    // one view. If the server is out of reach the local copy is all there is,
    // so then it does appear here rather than vanishing with the folder.
    const byLocation = sharedProjectsEnabled ? projects.filter((project) => !project.sharedProject) : projects;
    // A search looks through every folder; otherwise the open folder shows what is in it.
    const filtered = normalizedQuery
      ? byLocation.filter((project) => project.name.toLowerCase().includes(normalizedQuery))
      : byLocation.filter((project) => folderOfDesign(designFolders, project.folderId) === openFolderId);
    return sortMode === "name" ? [...filtered].sort((a, b) => a.name.localeCompare(b.name)) : [...filtered].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [designFolders, openFolderId, projects, query, sharedProjectsEnabled, sortMode]);

  const visibleFolders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery) return designFolders.filter((folder) => folder.name.toLowerCase().includes(normalizedQuery)).sort((a, b) => a.name.localeCompare(b.name));
    return childFolders(designFolders, openFolderId);
  }, [designFolders, openFolderId, query]);

  // The designs of this browser that the folder counts, without the ones that live on the server.
  const localDesigns = useMemo(() => (sharedProjectsEnabled ? projects.filter((project) => !project.sharedProject) : projects), [projects, sharedProjectsEnabled]);

  const createFolder = (name: string) => {
    // With new designs on the server, a folder belongs there too: one in the browser would only ever stay empty.
    if (newDesignsGoToServer()) {
      void createStoreFolderRef.current(name).then((made) => {
        if (made) setDashboardNotice(t("notice.folderMadeOnServer", { name: name.trim() }));
      });
      return;
    }
    setDesignFolders((current) => createDesignFolder(current, name, openFolderId, createLocalId("folder"), Date.now()));
  };
  const renameFolder = (folderId: string, name: string) => {
    setDesignFolders((current) => renameDesignFolder(current, folderId, name));
  };
  const deleteFolder = (folderId: string) => {
    const folder = designFolders.find((entry) => entry.id === folderId);
    if (!folder) return;
    const result = deleteDesignFolder(designFolders, projects, folderId);
    setDesignFolders(result.folders);
    setProjects(result.designs);
    if (openFolderId === folderId) setOpenFolderId(folder.parentId);
    setDashboardNotice(t("notice.folderDeleted", { name: folder.name }));
  };
  const moveDesign = (projectId: string, folderId: string | null) => {
    const project = projects.find((entry) => entry.id === projectId);
    if (!project || folderOfDesign(designFolders, project.folderId) === folderId) return;
    setProjects((current) => moveDesignsToFolder(current, [projectId], folderId));
    const target = folderId ? designFolders.find((folder) => folder.id === folderId) : null;
    setDashboardNotice(target ? t("notice.movedToFolder", { name: project.name, folder: target.name }) : t("notice.movedToRoot", { name: project.name }));
  };
  const moveFolder = (folderId: string, targetId: string | null) => {
    setDesignFolders((current) => moveDesignFolder(current, folderId, targetId));
  };

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

  /**
   * Whether the card of a design has no picture to show. A design that never had one, or one whose
   * picture is gone from the server - a Docker container created again, or designs brought back
   * from a backup - stayed blank until something in it changed; the editor now takes a picture
   * as soon as such a design is open.
   */
  const isProjectThumbnailMissing = useCallback(async (projectId: string) => {
    const project = projectsRef.current.find((candidate) => candidate.id === projectId);
    if (!project) return false;
    if (!project.thumbnailUrl) return true;
    if (project.thumbnailUrl.startsWith("data:")) return false;
    try {
      const response = await fetch(project.thumbnailUrl, { cache: "no-store" });
      return response.status === 404;
    } catch {
      return false;
    }
  }, []);

  const updateProjectShapes = useCallback((snapshot: {
    projectId: string;
    shapes: WorkplaneShape[];
    history: EditorHistoryEntry[];
    historyIndex: number;
    assets: ProjectAsset[];
    attachments: ProjectAttachment[];
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
    newestRequestedRevision.set(snapshot.projectId, revision);
    const entry = projectShapeCacheEntryFromEditor(revision, snapshot.shapes, snapshot.history, snapshot.historyIndex, snapshot.assets, snapshot.attachments);
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
      .then((result) => {
        setProjectSaveFailure(null);
        // Said once per design and session: the stored copy keeps only the newest steps of a very large history (#475).
        const trimmed = result?.historyTrimmed;
        if (trimmed && !trimmedHistoryToldRef.current.has(snapshot.projectId)) {
          trimmedHistoryToldRef.current.add(snapshot.projectId);
          setProjectSaveFailure({ message: t("notice.projectHistoryTrimmed", { kept: trimmed.kept, total: trimmed.total }), at: Date.now() });
        }
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
          setDashboardNotice(error instanceof Error ? localizedError(error.message) : t("notice.projectShapesSaveFailed"));
          // The dashboard is not on screen while someone works; the editor has to say it too.
          // With the reason when it is one a person can act on: too big for the project file, or no room left (#475).
          const known = isProjectTooLargeError(error) || isStorageFullError(error);
          setProjectSaveFailure({
            message: known && error instanceof Error ? t("notice.projectShapesSaveFailedWhy", { reason: localizedError(error.message) }) : t("notice.projectShapesSaveFailed"),
            at: Date.now(),
          });
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
        const serialized = JSON.stringify(projectListForLocalStorage(storageProjects));
        window.localStorage.setItem(PROJECTS_STORAGE_KEY, serialized);
        projectsJsonRef.current = serialized;
        return next;
      } catch {
        return next;
      }
    });
  }, []);

  const createAndOpenProject = (name?: string) => {
    const project = newProject(name ?? t("dashboard.untitledDesign", { number: projects.length + 1 }), projects.length, 0, openFolderId);
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

  const openLylProjectFromFile = useCallback(async (file: File, sharedProject?: SharedProject, fileHandle?: LylFileHandle) => {
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
        ...(existing ?? newProject(sharedProject?.name ?? restored.projectName, projects.length, restored.shapes.length, sharedProject ? null : openFolderId)),
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
      const entry = projectShapeCacheEntry(now, restored.shapes, restored.history, restored.historyIndex, restored.assets, restored.attachments);
      await saveProjectShapes(project.id, entry, projectShapeSaveContext(project));
      // A file opened as a new design goes where new designs go; a server design is there already.
      const { project: placed, problem } = sharedProject || existing ? { project } : await placeNewDesignRef.current(project);
      if (placed.sharedProject && !sharedProject) void refreshSharedProjects();
      // A file saved with a view opens in it; the working copy of a server design keeps its own.
      if (restored.view && !existing) writeDesignView(project.id, restored.view);
      if (restored.savedViews && !existing) writeSavedViews(project.id, restored.savedViews);
      if (restored.cornerRulers && !existing) writeCornerRulers(project.id, restored.cornerRulers);
      if (restored.tapeMeasurements && !existing) writeTape(project.id, restored.tapeMeasurements);
      setProjectShapesById((current) => ({ ...current, [project.id]: entry }));
      // Saving later writes into the file it came from (#251).
      if (fileHandle) rememberLylFile(project.id, fileHandle);
      setProjects((current) => existing
        ? current.map((entryProject) => (entryProject.id === project.id ? project : entryProject))
        : [placed, ...current]);
      const openedMessage = sharedProject
        ? t("notice.openedServerProject", { name: sharedProject.name })
        : t("notice.openedLocalProject", { name: file.name });
      // Saved by a newer layerling: say so, what it added may look different here.
      const versionMessage = restored.savedWithNewerVersion
        ? `${openedMessage}. ${t("notice.newerDesignOpened", { saved: restored.savedWithNewerVersion, current: LYL_CREATED_WITH_VERSION })}`
        : openedMessage;
      const message = problem ? `${versionMessage}. ${problem}` : versionMessage;
      setDashboardNotice(message);
      openEditor(project.id, { allowMissingFromStorage: true });
      return { ok: true, message };
    } catch (error) {
      const message = error instanceof Error ? localizedError(error.message) : "Could not open layerling project";
      setDashboardNotice(message);
      return { ok: false, message };
    }
  }, [openFolderId, projects, refreshSharedProjects]);

  // A .lyl opened from the file manager with the installed app (#605). Only the first file: a design
  // opens the editor, so a second one could not be shown anyway.
  const openLaunchedFileRef = useRef(openLylProjectFromFile);
  openLaunchedFileRef.current = openLylProjectFromFile;
  useEffect(() => {
    if (!mounted) return;
    let taken = false;
    onLylFilesLaunched((file, handle) => {
      if (taken) return;
      taken = true;
      void openLaunchedFileRef.current(file, undefined, handle).finally(() => { taken = false; });
    });
  }, [mounted]);

  const openSharedProject = useCallback(async (sharedProject: SharedProject) => {
    const key = sharedProjectKey(sharedProject);
    setOpeningSharedKey(key);
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
      setDashboardNotice(error instanceof Error ? localizedError(error.message) : t("notice.openSharedFailed"));
    } finally {
      setOpeningSharedKey(null);
    }
  }, [openLylProjectFromFile]);

  /** Takes designs out of this browser for good: the card, the shapes and the thumbnail. */
  const removeWorkingCopies = useCallback(async (projectIds: string[]) => {
    if (!projectIds.length) return;
    // A save on its way out may still be writing; removing first would let it bring the design back.
    await Promise.all(projectIds.map((projectId) => (projectShapeSaveQueuesRef.current[projectId] ?? Promise.resolve()).catch(() => undefined)));
    setProjects((current) => current.filter((project) => !projectIds.includes(project.id)));
    setProjectShapesById((current) => {
      const next = { ...current };
      projectIds.forEach((projectId) => delete next[projectId]);
      return next;
    });
    projectIds.forEach((projectId) => {
      if (!STATIC_EXPORT_BUILD) void fetch(`/api/project-thumbnail?projectId=${encodeURIComponent(projectId)}`, { method: "DELETE" });
      knownDesignThumbnails.delete(projectId);
      void deleteDesignThumbnail(projectId);
      void deleteProjectShapes(projectId).catch(() => setDashboardNotice(t("notice.projectShapesDeleteFailed")));
    });
  }, []);

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
      // The working copy in this browser is only a mirror of the server file, and the file was
      // deleted on purpose: the copy goes too, or it would turn up again among the browser designs
      // without a thumbnail (#265).
      await removeWorkingCopies(projects
        .filter((project) => project.sharedProject?.fileName === sharedProject.fileName && (project.sharedProject?.path ?? "") === (sharedProject.path ?? ""))
        .map((project) => project.id));
      setDashboardNotice(t("notice.deletedShared", { name: sharedProject.name }));
    } catch (error) {
      setDashboardNotice(error instanceof Error ? localizedError(error.message) : t("notice.deleteSharedFailed"));
      await refreshSharedProjects();
    }
  }, [projects, refreshSharedProjects, removeWorkingCopies]);

  /** Several designs of the server folder, chosen together on the start page (#886): one after the other, as each asks for its own revision. */
  const deleteSharedProjectsInTurn = useCallback(async (sharedList: SharedProject[]) => {
    for (const sharedProject of sharedList) {
      await deleteSharedProject(sharedProject);
    }
    if (sharedList.length > 1) setDashboardNotice(t("notice.deletedDesigns", { count: sharedList.length }));
  }, [deleteSharedProject]);

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
      setDashboardNotice(error instanceof Error ? localizedError(error.message) : t("notice.moveSharedFailed"));
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
      setDashboardNotice(error instanceof Error ? localizedError(error.message) : t("notice.duplicateFailed"));
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
    const upload = (async () => {
      const response = await fetch(`${SHARED_PROJECTS_ENDPOINT}?${storeQuery(targetPath, fileName)}`, { method: "POST", headers, body: formData });
      const payload = await response.json().catch(() => ({})) as { error?: string; project?: SharedProject };
      return { response, payload };
    })();
    const tracked = upload.then(({ response, payload }) => (response.ok ? payload.project : undefined), () => undefined);
    sharedSavesRef.current[activeProject.id] = tracked;
    void tracked.then(() => {
      if (sharedSavesRef.current[activeProject.id] === tracked) delete sharedSavesRef.current[activeProject.id];
    });
    const { response, payload } = await upload;
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

  /**
   * An export file - STL, 3MF, STEP, SVG ... - into the folder of the open design, or the open folder of the
   * store for one that is not on the server (#779). A name that is taken is refused unless `overwrite` is set,
   * and the refusal carries `exists` so the editor can ask for a second press.
   */
  const saveExportFileToShared = useCallback(async ({ fileName, blob, overwrite }: { fileName: string; blob: Blob; overwrite?: boolean }) => {
    const activeProject = projects.find((project) => project.id === activeProjectId);
    const targetPath = activeProject?.sharedProject?.path ?? sharedPathRef.current;
    const query = new URLSearchParams({ exportFile: fileName });
    if (targetPath) query.set("path", targetPath);
    if (overwrite) query.set("overwrite", "1");
    const response = await fetch(`${SHARED_PROJECTS_ENDPOINT}?${query.toString()}`, { method: "POST", body: blob });
    const payload = await response.json().catch(() => ({})) as { error?: string; exists?: boolean; file?: { fileName: string; path: string } };
    if (!response.ok || !payload.file) {
      const failure = new Error(payload.error ?? t("notice.saveSharedFailed"));
      (failure as Error & { exists?: boolean }).exists = response.status === 409 && payload.exists === true;
      throw failure;
    }
    return t("notice.exportSavedToServer", { name: payload.file.fileName, folder: payload.file.path || "/" });
  }, [activeProjectId, projects]);

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
   * A design just made here - opened from a file, imported, restored from a backup, duplicated or taken from the
   * history - goes into the server folder when new designs start there, not only one from "Create new 3D design".
   * Otherwise exactly these stayed behind in the browser, where Safari clears them after seven days without a visit.
   * The design has to be stored here already. A name that is taken in the folder becomes a copy's name; without the
   * server, or if the upload fails, the design stays in this browser and `problem` says why, for the caller's message.
   */
  const placeNewDesign = useCallback(async (project: DashboardProject, path = sharedPathRef.current): Promise<{ project: DashboardProject; problem?: string }> => {
    await serverAnswer.wait();
    if (!newDesignsGoToServer()) return { project };
    // The names of the folder on screen are known; a name taken in another folder shows when the server refuses it.
    const taken = path === sharedPathRef.current ? sharedProjectsRef.current.map((entry) => entry.name) : [];
    const nameFor = (name: string) => duplicateName(name, taken, duplicateNamePatterns(), PROJECT_NAME_LIMIT);
    let named = taken.some((name) => name.trim().toLowerCase() === project.name.trim().toLowerCase()) ? { ...project, name: nameFor(project.name) } : project;
    for (let attempt = 0; ; attempt += 1) {
      try {
        const saved = await putProjectOnServer(named, path);
        return { project: { ...named, folderId: null, sharedProject: { fileName: saved.fileName, revision: saved.revision, path: saved.path ?? path } } };
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message === t("notice.serverNameTaken", { name: named.name }) && attempt < 3) {
          taken.push(named.name);
          named = { ...project, name: nameFor(project.name) };
          continue;
        }
        return { project, problem: message ? localizedError(message) : t("notice.saveSharedFailed") };
      }
    }
  }, [newDesignsGoToServer, putProjectOnServer, serverAnswer]);
  // For the ways in that are set up above this point.
  const placeNewDesignRef = useRef(placeNewDesign);
  placeNewDesignRef.current = placeNewDesign;

  /** A folder path below `base` on the server, made where it is missing; where a name is not allowed, the folder above. */
  const storeFolderPath = useCallback(async (base: string, names: string[]) => {
    let path = base;
    for (const name of names) {
      const query = new URLSearchParams({ folder: name });
      if (path) query.set("path", path);
      const response = await fetch(`${SHARED_PROJECTS_ENDPOINT}?${query.toString()}`, { method: "POST" }).catch(() => null);
      if (!response || (!response.ok && response.status !== 409)) return path;
      path = path ? `${path}/${name}` : name;
    }
    return path;
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
      setDashboardNotice(error instanceof Error ? localizedError(error.message) : t("notice.saveSharedFailed"));
    }
  }, [projects, refreshSharedProjects]);

  /**
   * Every design of this browser that is not on the server yet, put there one after the other (#316).
   * A move like the single one: each card is bound to its file, and the editor's automatic save writes
   * there from then on. One that cannot go - the name is taken, or the server hiccups - stays in the
   * browser, and the notice says how many.
   */
  const sendAllProjectsToServer = useCallback(async () => {
    const targets = projects.filter((project) => !project.sharedProject);
    if (targets.length === 0) return;
    let done = 0;
    let failed = 0;
    let firstFailure = "";
    for (const project of targets) {
      setDashboardNotice(t("notice.sendingAllToServer", { done: done + failed + 1, count: targets.length }));
      try {
        const saved = await putProjectOnServer(project, sharedPathRef.current);
        setProjects((current) => current.map((candidate) => candidate.id === project.id
          ? { ...candidate, sharedProject: { fileName: saved.fileName, revision: saved.revision, path: saved.path ?? sharedPathRef.current } }
          : candidate));
        done += 1;
      } catch (error) {
        failed += 1;
        if (!firstFailure) firstFailure = error instanceof Error ? localizedError(error.message) : t("notice.saveSharedFailed");
      }
    }
    await refreshSharedProjects();
    if (failed > 0) setDashboardNotice(`${t("notice.sentAllPartial", { done, failed })} ${firstFailure}`);
    else setDashboardNotice(done === 1 ? t("notice.sentAllOne") : t("notice.sentAllMany", { count: done }));
  }, [projects, putProjectOnServer, refreshSharedProjects]);

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
      setDashboardNotice(error instanceof Error ? localizedError(error.message) : t("notice.saveSharedFailed"));
    }
    setProjects((current) => [{ ...project, sharedProject: binding }, ...current]);
    if (binding) void refreshSharedProjects();
    openEditor(project.id, { allowMissingFromStorage: true });
  }, [projects, putProjectOnServer, refreshSharedProjects, sharedProjects]);

  /** "Create new 3D design": in the server folder when new designs start there, decided once the server has answered. */
  const createNewDesign = async () => {
    await serverAnswer.wait();
    // On the server's tab a new design goes into the server folder that is open.
    if ((dashboardSection === "shared" && sharedEnabledRef.current) || newDesignsGoToServer()) await createProjectInStoreFolder();
    else createAndOpenProject();
  };

  const openStoreFolder = useCallback((path: string) => {
    void refreshSharedProjects(path);
  }, [refreshSharedProjects]);

  const createStoreFolder = useCallback(async (name: string) => {
    if (!name.trim()) return false;
    try {
      const query = new URLSearchParams({ folder: name.trim() });
      if (sharedPathRef.current) query.set("path", sharedPathRef.current);
      const response = await fetch(`${SHARED_PROJECTS_ENDPOINT}?${query.toString()}`, { method: "POST" });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? t("notice.folderCreateFailed"));
      await refreshSharedProjects();
      return true;
    } catch (error) {
      setDashboardNotice(error instanceof Error ? localizedError(error.message) : t("notice.folderCreateFailed"));
      return false;
    }
  }, [refreshSharedProjects]);
  // For "New folder" on the start page, set up above this point.
  const createStoreFolderRef = useRef(createStoreFolder);
  createStoreFolderRef.current = createStoreFolder;

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
      setDashboardNotice(error instanceof Error ? localizedError(error.message) : t("notice.folderRenameFailed"));
      await refreshSharedProjects();
    }
  }, [refreshSharedProjects]);

  /**
   * Removing a folder from the server. What was inside is gone from there, and
   * so is every working copy that pointed into it.
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
      // What was inside is gone from the server, and so are the working copies of it here (#265).
      await removeWorkingCopies(projects
        .filter((project) => {
          const where = project.sharedProject?.path ?? "";
          return Boolean(project.sharedProject) && (where === folderPath || where.startsWith(`${folderPath}/`));
        })
        .map((project) => project.id));
      await refreshSharedProjects();
      setDashboardNotice(t("notice.deletedFolder", { name: folderName }));
    } catch (error) {
      setDashboardNotice(error instanceof Error ? localizedError(error.message) : t("notice.folderDeleteFailed"));
      await refreshSharedProjects();
    }
  }, [projects, refreshSharedProjects, removeWorkingCopies]);

  // Designs of this browser, each as its own .lyl, together in one ZIP. "Back up all" takes every design
  // and the custom shapes of this browser in a folder beside them; the chosen designs or one folder (#991)
  // go without the shapes. Empty folders go along when all or a folder is backed up.
  const backupProjects = useCallback(async (scope: { designIds: string[] } | { folderId: string } | null) => {
    // The browser's own designs: a design of the server kept here while open is the server's to back up.
    const inFolder = (folderId: string, id: string | null | undefined) => folderTrail(designFolders, folderOfDesign(designFolders, id)).some((folder) => folder.id === folderId);
    const designs = !scope
      ? localDesigns
      : "designIds" in scope
        ? localDesigns.filter((project) => scope.designIds.includes(project.id))
        : localDesigns.filter((project) => inFolder(scope.folderId, project.folderId));
    const shapeEntries = scope ? [] : await customShapesBackupEntries().catch(() => []);
    const shapeCount = Math.max(0, shapeEntries.length - 1);
    if (designs.length === 0 && shapeCount === 0) {
      setDashboardNotice(t("notice.backupEmpty"));
      return;
    }
    try {
      // A design in a folder goes into the ZIP in that folder, so a restore puts it back there (#496).
      const names = backupEntryPaths(designs.map((project) => ({ name: project.name, folder: folderPathNames(designFolders, project.folderId) })), t("dashboard.backupFallbackName"));
      // Each design goes into the file as it comes and is let go, instead of all of them and then the whole ZIP once
      // more in memory, where large designs made Safari reload the page without a word (#887).
      const writer = createBackupWriter();
      const skipped: string[] = [];
      for (let index = 0; index < designs.length; index += 1) {
        setDashboardNotice(t("notice.backingUp", { index: index + 1, total: designs.length }));
        // Noted before the design is read, so a page that is gone in the middle can say afterwards where it stopped.
        writeBackupProgress({ index: index + 1, total: designs.length, name: designs[index].name });
        try {
          writer.add(names[index], await projectPackageBytes(designs[index]));
        } catch (error) {
          // One design that cannot be read does not cost the backup of the others; the message names it.
          skipped.push(`${designs[index].name} (${error instanceof Error ? localizedError(error.message) : String(error)})`);
          continue;
        }
        // The card picture goes along, so a restore shows it at once.
        const thumbnail = await projectThumbnailPngBytes(designs[index].thumbnailUrl).catch(() => null);
        if (thumbnail) writer.add(backupThumbnailPath(names[index]), thumbnail);
      }
      shapeEntries.forEach((entry) => writer.add(entry.name, entry.bytes));
      // Folders with no design anywhere inside them go along as empty folders.
      const holding = new Set(designs.flatMap((project) => folderTrail(designFolders, folderOfDesign(designFolders, project.folderId)).map((folder) => folder.id)));
      const foldersAlong = !scope ? designFolders : "folderId" in scope ? designFolders.filter((folder) => inFolder(scope.folderId, folder.id)) : [];
      const emptyFolders = foldersAlong.filter((folder) => !holding.has(folder.id) && !designFolders.some((other) => other.parentId === folder.id));
      backupFolderPaths(emptyFolders.map((folder) => folderPathNames(designFolders, folder.id))).forEach((name) => writer.add(name, new Uint8Array()));
      // A folder's backup is named after it, so several of them stay apart in the downloads.
      const folder = scope && "folderId" in scope ? designFolders.find((entry) => entry.id === scope.folderId) : undefined;
      const fileName = backupFileName(new Date(), folder ? `layerling-${folder.name.replace(/[\\/:*?"<>|\s]+/g, "-")}` : undefined);
      downloadBackup(writer.finish(), fileName);
      writeBackupProgress(null);
      const saved = designs.length - skipped.length;
      const done = shapeCount
        ? t("notice.backupDoneWithShapes", { count: saved, shapes: shapeCount, name: fileName })
        : t("notice.backupDone", { count: saved, name: fileName });
      setDashboardNotice(skipped.length ? `${done} ${t("notice.backupSkipped", { count: skipped.length, names: skipped.join("; ") })}` : done);
    } catch (error) {
      writeBackupProgress(null);
      setDashboardNotice(t("notice.backupFailed", { reason: error instanceof Error ? localizedError(error.message) : String(error) }));
    }
  }, [designFolders, localDesigns]);
  const backupAllProjects = useCallback(() => backupProjects(null), [backupProjects]);

  // Every design of the server, in its folders, and its custom shapes, as the same kind of ZIP:
  // "Restore backup" brings it back, on this computer or another.
  const backupAllServerDesigns = useCallback(async () => {
    try {
      const writer = createBackupWriter();
      const { count, skipped } = await writeServerBackup(writer, t("dashboard.backupFallbackName"), (index, total, name) => {
        setDashboardNotice(t("notice.backingUp", { index, total }));
        writeBackupProgress({ index, total, name });
      });
      // As in the browser's backup, a shape that cannot be read does not cost the designs.
      const shapes = await serverCustomShapesBackupEntries().catch(() => ({ entries: [], count: 0 }));
      shapes.entries.forEach((entry) => writer.add(entry.name, entry.bytes));
      writeBackupProgress(null);
      if (count === 0 && skipped.length === 0 && shapes.count === 0) {
        setDashboardNotice(t("notice.backupEmpty"));
        return;
      }
      const fileName = backupFileName(new Date(), "layerling-server-backup");
      downloadBackup(writer.finish(), fileName);
      const done = shapes.count
        ? t("notice.backupDoneWithShapes", { count, shapes: shapes.count, name: fileName })
        : t("notice.backupDone", { count, name: fileName });
      setDashboardNotice(skipped.length ? `${done} ${t("notice.backupSkipped", { count: skipped.length, names: skipped.join("; ") })}` : done);
    } catch (error) {
      writeBackupProgress(null);
      setDashboardNotice(t("notice.backupFailed", { reason: error instanceof Error ? localizedError(error.message) : String(error) }));
    }
  }, []);

  // A backup brings every design back as a new design of this browser; the
  // editor stays closed, so the whole set lands on the start page at once.
  const restoreBackup = useCallback(async (file: File) => {
    setDashboardNotice(t("notice.validatingFile", { name: file.name }));
    let entries;
    let emptyFolderPaths: string[][] = [];
    let shapes = { added: 0, skipped: 0 };
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      entries = unpackBackup(bytes);
      emptyFolderPaths = unpackBackupFolders(bytes);
      const restoredShapes = await restoreCustomShapesFromBackup(bytes).catch(() => null);
      if (restoredShapes) shapes = { added: restoredShapes.added, skipped: restoredShapes.skipped };
    } catch {
      setDashboardNotice(t("notice.backupNotReadable", { name: file.name }));
      return;
    }
    const shapesNote = shapes.added + shapes.skipped > 0 ? ` ${t("notice.backupShapesRestored", { count: shapes.added, skipped: shapes.skipped })}` : "";
    if (entries.length === 0 && shapesNote) {
      setDashboardNotice(shapesNote.trim());
      return;
    }
    if (entries.length === 0) {
      setDashboardNotice(t("notice.backupNoDesigns", { name: file.name }));
      return;
    }
    const restoredProjects: DashboardProject[] = [];
    const restoredEntries: Record<string, ProjectShapeCacheEntry> = {};
    let restoredFolders = designFolders;
    let failed = 0;
    let alreadyThere = 0;
    // On the server's tab, or with new designs on the server, the backup goes there, into the open folder, its folders made below it.
    await serverAnswer.wait();
    const toServer = (dashboardSection === "shared" && sharedEnabledRef.current) || newDesignsGoToServer();
    const serverBase = sharedPathRef.current;
    let serverProblem = "";
    const restoredThumbnails: { projectId: string; image: string; shapes: number }[] = [];
    for (let index = 0; index < entries.length; index += 1) {
      setDashboardNotice(t("notice.restoringBackup", { index: index + 1, total: entries.length }));
      try {
        const restored = await importLylProject(entries[index].bytes);
        // A restore keeps the creation time of a design, so the same name and creation time means it is already here (#407).
        const restoredName = restored.projectName || projectNameFromFileName(entries[index].name);
        if (backupDesignAlreadyThere(projects, { name: restoredName, createdAt: restored.createdAt })) {
          alreadyThere += 1;
          continue;
        }
        const now = Date.now() + index;
        const placed = toServer ? { folders: restoredFolders, folderId: null } : ensureFolderPath(restoredFolders, entries[index].folder, () => createLocalId("folder"), now);
        restoredFolders = placed.folders;
        const local: DashboardProject = {
          ...newProject(restored.projectName || projectNameFromFileName(entries[index].name), projects.length + index, restored.shapes.length, placed.folderId),
          createdAt: restored.createdAt,
          updatedAt: now,
          revision: now,
          workspace: restored.workspace,
          snapGrid: restored.snapGrid,
          placementElevation: restored.placementElevation,
          placementWorkplane: restored.placementWorkplane,
          sketchPlacementWorkplane: restored.sketchPlacementWorkplane,
        };
        const entry = projectShapeCacheEntry(now, restored.shapes, restored.history, restored.historyIndex, restored.assets, restored.attachments);
        await saveProjectShapes(local.id, entry, projectShapeSaveContext(local));
        let project = local;
        const thumbnail = entries[index].thumbnail;
        if (toServer) {
          const where = await storeFolderPath(serverBase, entries[index].folder ?? []);
          // The picture from the backup goes up with the design: the server's card showed none until the design was
          // next saved from the editor (Jürgen Keller, a browser backup restored into the Docker version).
          const outcome = await placeNewDesign(thumbnail ? { ...local, thumbnailUrl: pngDataUrl(thumbnail) } : local, where);
          project = outcome.project;
          if (outcome.problem && !serverProblem) serverProblem = outcome.problem;
        }
        if (restored.view) writeDesignView(project.id, restored.view);
        if (restored.savedViews) writeSavedViews(project.id, restored.savedViews);
        if (restored.cornerRulers) writeCornerRulers(project.id, restored.cornerRulers);
        if (restored.tapeMeasurements) writeTape(project.id, restored.tapeMeasurements);
        restoredProjects.push(project);
        restoredEntries[project.id] = entry;
        if (thumbnail) restoredThumbnails.push({ projectId: project.id, image: pngDataUrl(thumbnail), shapes: restored.shapes.length });
      } catch {
        failed += 1;
      }
    }
    setProjectShapesById((current) => ({ ...current, ...restoredEntries }));
    setProjects((current) => [...restoredProjects, ...current]);
    // The pictures the backup holds go back on their cards; a design without one gets it when opened.
    for (const snapshot of restoredThumbnails) await updateProjectSnapshot(snapshot).catch(() => undefined);
    // Only the folders a restored design is in are made, and the empty folders the backup holds;
    // a folder of designs that were already here is not.
    const usedFolders = new Set(restoredProjects.map((project) => project.folderId).filter(Boolean) as string[]);
    for (const path of emptyFolderPaths) {
      if (toServer) {
        await storeFolderPath(serverBase, path);
        continue;
      }
      const placed = ensureFolderPath(restoredFolders, path, () => createLocalId("folder"), Date.now());
      restoredFolders = placed.folders;
      if (placed.folderId) usedFolders.add(placed.folderId);
    }
    if (toServer) void refreshSharedProjects();
    const keptFolders = restoredFolders.filter((folder) => designFolders.some((existing) => existing.id === folder.id)
      || [...usedFolders].some((used) => folderTrail(restoredFolders, used).some((onTheWay) => onTheWay.id === folder.id)));
    if (keptFolders.length !== designFolders.length) setDesignFolders(keptFolders);
    const skippedNote = alreadyThere > 0 && restoredProjects.length > 0 ? ` ${t("notice.backupAlreadyThere", { count: alreadyThere })}` : "";
    if (restoredProjects.length === 0 && failed === 0 && alreadyThere > 0) {
      setDashboardNotice(t("notice.backupAllThere", { count: alreadyThere, name: file.name }) + shapesNote);
      return;
    }
    setDashboardNotice((failed
      ? t("notice.backupRestoredPartly", { count: restoredProjects.length, failed, name: file.name })
      : t("notice.backupRestored", { count: restoredProjects.length, name: file.name })) + skippedNote + shapesNote + (serverProblem ? ` ${serverProblem}` : ""));
  }, [dashboardSection, designFolders, newDesignsGoToServer, placeNewDesign, projects, refreshSharedProjects, serverAnswer, storeFolderPath, updateProjectSnapshot]);

  const importFilesFromDashboard = useCallback(
    async (files: File[], fileHandle?: LylFileHandle) => {
      if (!files.length) return;
      const zips = files.filter((file) => isBackupFileName(file.name));
      const zipContents = await Promise.all(zips.map(async (file) => zipHoldsDesigns(new Uint8Array(await file.arrayBuffer()))));
      const backups = zips.filter((_, index) => zipContents[index]);
      if (backups.length) {
        if (files.length !== 1) {
          setDashboardNotice(t("notice.oneBackupAtATime"));
          return;
        }
        await restoreBackup(backups[0]);
        return;
      }
      const projectFiles = files.filter((file) => /\.(lyl|skf)$/i.test(file.name));
      if (projectFiles.length) {
        if (files.length !== 1) {
          setDashboardNotice(t("notice.oneLylAtATime"));
          return;
        }
        await openLylProjectFromFile(projectFiles[0], undefined, fileHandle);
        return;
      }
      const result = await importModelFiles(files, {
        onProgress: (index, total, file) => setDashboardNotice(t("notice.importing", { index: index + 1, total, name: file.name })),
        // A DXF becomes sketch bodies of its outlines and loose holes (#774); the kernel that builds it loads only then.
        sketchFromProfile: async (profile, height) => {
          const [{ cadShapeFromSketchProfile }, { canonicalizeShape }] = await Promise.all([import("@/lib/editorSketchCad"), import("@/lib/workplaneShapes")]);
          return canonicalizeShape(await cadShapeFromSketchProfile(profile, height));
        },
      });
      if (!result) return;
      const { shapes: importedShapes, assets: importedAssets, importedFileNames, failures, notes } = result;
      const failureSummary = importFailureSummary(failures);

      if (!importedShapes.length) {
        setDashboardNotice(result.mtlOnly
          ? t("status.importMtlAlone")
          : failures.length === 1 && result.files.length <= 1
            ? failures[0].reason
            : t("status.importNoneFailed", { total: Math.max(result.files.length, failures.length), summary: failureSummary }));
        return;
      }

      try {
        // Eine farbige Datei bringt mehrere Koerper, ist aber ein Entwurf mit ihrem Namen.
        const projectName = importedFileNames.length === 1
          ? projectNameFromFileName(importedFileNames[0])
          : t("notice.importedDesignName", { count: importedFileNames.length });
        const project = newProject(projectName, projects.length, importedShapes.length, openFolderId);
        const revision = project.revision ?? project.updatedAt;
        const entry = projectShapeCacheEntry(revision, importedShapes, undefined, undefined, dedupeProjectAssets(importedAssets));
        await saveProjectShapes(project.id, entry, projectShapeSaveContext(project));
        setProjectShapesById((current) => ({
          ...current,
          [project.id]: entry,
        }));
        const successSummary = result.files.length === 1
          ? t("status.importedFile", { name: result.files[0].name })
          : t("status.importedFiles", { count: importedFileNames.length, total: result.files.length });
        const { project: placed, problem } = await placeNewDesign(project);
        if (placed.sharedProject) void refreshSharedProjects();
        setDashboardNotice([successSummary, ...notes, ...(problem ? [problem] : [])].join(" ") + failureSummary);
        setProjects((current) => [placed, ...current]);
        openEditor(project.id, { allowMissingFromStorage: true });
      } catch (error) {
        setDashboardNotice(error instanceof Error ? localizedError(error.message) : t("notice.importProjectFailed"));
      }
    },
    [openFolderId, openLylProjectFromFile, placeNewDesign, projects.length, refreshSharedProjects, restoreBackup],
  );

  /** Chrome and Edge: a file dialog that hands over the file's place, so Save can write back into it (#251). */
  const pickDashboardImport = async () => {
    if (lylFileAccessSupported()) {
      try {
        const picked = await pickFilesToImport([".lyl", ".skf", ".zip", ".stl", ".obj", ".mtl", ".3mf", ".step", ".stp", ".svg", ".dxf", ".png", ".jpg", ".jpeg"]);
        if (picked?.length) await importFilesFromDashboard(picked.map((entry) => entry.file), picked.length === 1 ? picked[0].handle : undefined);
        return;
      } catch {
        // Fall through to the file field.
      }
    }
    dashboardImportInputRef.current?.click();
  };

  const openLatestProject = () => {
    const latest = [...projects].sort((a, b) => b.updatedAt - a.updatedAt)[0];
    if (latest) {
      openEditor(latest.id);
      return;
    }
    createAndOpenProject();
  };

  const openDashboard = (leaving?: { itemCount: number }) => {
    const leavingProject = activeProjectId ? projects.find((project) => project.id === activeProjectId) : undefined;
    if (leavingProject && leaving?.itemCount === 0) {
      setEmptyProjectPromptId(leavingProject.id);
    }
    if (activeProjectId) {
      setProjects((current) => current.map((project) => (project.id === activeProjectId ? { ...project, updatedAt: Date.now() } : project)));
    }
    // Back where you came from: a project opened from the folder returns to it.
    tabChosenRef.current = true;
    setDashboardSection(leavingProject?.sharedProject ? "shared" : "home");
    setEditorLoading(false);
    setView("dashboard");
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", "/");
    }
  };

  /** Deleting designs of this browser: one, or several that were chosen together on the start page (#886). */
  const deleteProjects = (projectIds: string[]) => {
    const ids = new Set(projectIds);
    const deleted = projects.filter((project) => ids.has(project.id));
    const remainingIds = projects.filter((project) => !ids.has(project.id)).map((project) => project.id);
    setProjects((current) => current.filter((project) => !ids.has(project.id)));
    setProjectShapesById((current) => {
      const next = { ...current };
      ids.forEach((projectId) => delete next[projectId]);
      return next;
    });
    if (activeProjectId && ids.has(activeProjectId)) {
      setActiveProjectId(null);
    }
    deleted.forEach((project) => {
      const projectId = project.id;
      if (!STATIC_EXPORT_BUILD) {
        void fetch(`/api/project-thumbnail?projectId=${encodeURIComponent(projectId)}`, { method: "DELETE" });
      }
      knownDesignThumbnails.delete(projectId);
      void deleteDesignThumbnail(projectId);
      void deleteProjectShapes(projectId)
        .then(() => deleteHiddenCopies(project, remainingIds))
        .catch(() => {
          setDashboardNotice(t("notice.projectShapesDeleteFailed"));
        });
    });
    if (deleted.length > 1) setDashboardNotice(t("notice.deletedDesigns", { count: deleted.length }));
  };

  const deleteProject = (projectId: string) => deleteProjects([projectId]);

  const emptyProjectPrompt = view === "dashboard" && emptyProjectPromptId ? projects.find((project) => project.id === emptyProjectPromptId) ?? null : null;

  const removeEmptyProject = () => {
    if (!emptyProjectPrompt) return;
    const projectId = emptyProjectPrompt.id;
    setEmptyProjectPromptId(null);
    if (emptyProjectPrompt.sharedProject) {
      // Leaving the editor sends it to the server once more; the removal waits for that upload,
      // or it would ask for a revision the file no longer has.
      const pendingUpload = sharedSavesRef.current[projectId] ?? Promise.resolve(undefined);
      void pendingUpload.then((uploaded) => {
        const project = projectsRef.current.find((candidate) => candidate.id === projectId);
        const binding = project?.sharedProject;
        if (!project || !binding) return;
        void deleteSharedProject({
          fileName: binding.fileName,
          path: binding.path ?? "",
          name: project.name,
          revision: uploaded?.revision ?? binding.revision,
          updatedAt: project.updatedAt,
          size: 0,
        });
      });
      return;
    }
    // The last save on the way out may still be writing; removing first would let it bring the design back.
    const pendingSave = projectShapeSaveQueuesRef.current[projectId] ?? Promise.resolve();
    void pendingSave.catch(() => undefined).then(() => deleteProject(projectId));
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
      const entry = projectShapeCacheEntry(now, stored.shapes ?? [], stored.history, stored.historyIndex, stored.assets ?? [], stored.attachments);
      await saveProjectShapes(copy.id, entry, projectShapeSaveContext(copy));
      // The bodies keep their ids in the copy, so the measurements of the tape measure fit it as they did the original (#881).
      writeTape(copy.id, readTape(source.id));
      // With new designs on the server, the copy goes there too, beside a server original or into the open folder.
      const { project: placed, problem } = await placeNewDesign(copy, source.sharedProject?.path ?? sharedPathRef.current);
      setProjectShapesById((current) => ({ ...current, [placed.id]: entry }));
      setProjects((current) => [placed, ...current]);
      if (placed.sharedProject) void refreshSharedProjects();
      const picture = await projectThumbnailDataUrl(source.thumbnailUrl);
      // Das Bild ist Beiwerk: Bleibt es aus, steht die Kopie eben mit der
      // Ersatzflaeche da, statt dass das Duplizieren als gescheitert gilt.
      if (picture) {
        await updateProjectSnapshot({ image: picture, projectId: placed.id, shapes: placed.shapes }).catch(() => undefined);
      }
      setDashboardNotice(t("notice.duplicated", { name: placed.name }) + (problem ? ` ${problem}` : ""));
    } catch (error) {
      setDashboardNotice(error instanceof Error ? localizedError(error.message) : t("notice.duplicateFailed"));
    }
  };

  /**
   * Ein neues Projekt aus einem frueheren Stand, den der Verlaufsblick zeigt.
   * Es entsteht wie ein Duplikat - in der Uebersicht, mit eigener Karte -, nur
   * dass Koerper und Verlauf aus diesem Stand kommen. Der Editor bleibt im
   * Projekt, in dem er ist; der Satz, der zurueckgeht, sagt, wo das neue liegt.
   */
  const createProjectFromHistoryState = useCallback(async (request: HistoryProjectRequest) => {
    const source = request.sourceProjectId ? projects.find((project) => project.id === request.sourceProjectId) : undefined;
    const taken = projects.map((project) => project.name);
    const isTaken = (name: string) => taken.some((candidate) => candidate.trim().toLowerCase() === name.trim().toLowerCase());
    const wished = request.name?.trim().slice(0, PROJECT_NAME_LIMIT);
    // Der Wunschname traegt die Zeit des Standes. Steht er schon in der
    // Uebersicht - derselbe Stand ein zweites Mal -, wird er zur Kopie.
    const name = wished && !isTaken(wished)
      ? wished
      : duplicateName(wished || source?.name || t("dashboard.untitledDesign", { number: projects.length + 1 }), taken, duplicateNamePatterns(), PROJECT_NAME_LIMIT);
    const now = Date.now();
    const { sharedProject: _bound, ...carried } = source ?? newProject(name, projects.length, request.shapes.length);
    const copy: DashboardProject = {
      ...carried,
      id: createLocalId("project"),
      name,
      createdAt: now,
      updatedAt: now,
      revision: now,
      shapes: request.shapes.length,
      thumbnailUrl: null,
      thumbnailVersion: undefined,
      workspace: request.workspace,
      snapGrid: request.snapGrid,
      placementElevation: request.placementElevation,
      placementWorkplane: request.placementWorkplane,
      sketchPlacementWorkplane: request.placementWorkplane,
    };
    const entry = projectShapeCacheEntryFromEditor(now, request.shapes, request.history, request.historyIndex, request.assets, request.attachments);
    await saveProjectShapes(copy.id, entry, projectShapeSaveContext(copy));
    // With new designs on the server, the state goes there too, beside a server original or into the open folder.
    const { project: placed, problem } = await placeNewDesign(copy, source?.sharedProject?.path ?? sharedPathRef.current);
    setProjectShapesById((current) => ({ ...current, [placed.id]: entry }));
    setProjects((current) => [placed, ...current]);
    if (placed.sharedProject) void refreshSharedProjects();
    if (request.thumbnailDataUrl) {
      // Das Bild ist Beiwerk, wie beim Duplizieren: ohne steht die Karte mit
      // der Ersatzflaeche da, das Projekt ist trotzdem angelegt.
      await updateProjectSnapshot({ image: request.thumbnailDataUrl, projectId: placed.id, shapes: placed.shapes }).catch(() => undefined);
    }
    return t("notice.createdFromHistory", { name: placed.name }) + (problem ? ` ${problem}` : "");
  }, [placeNewDesign, projects, refreshSharedProjects, updateProjectSnapshot]);

  const renameProject = (projectId: string, name: string) => {
    const nextName = name.trim().slice(0, PROJECT_NAME_LIMIT);
    if (!nextName) return;
    setProjects((current) =>
      current.map((project) => (project.id === projectId ? { ...project, name: nextName, updatedAt: Date.now() } : project)),
    );
    const binding = projects.find((project) => project.id === projectId)?.sharedProject;
    if (binding && nextName !== binding.fileName.replace(/\.(lyl|skf)$/i, "")) void renameSharedProjectFile(projectId, binding, nextName);
  };

  /**
   * A design on the server is shown under its file name, so renaming it renames the file too, and
   * the working copy follows with the file's new name and revision (#265). A name that is taken
   * leaves the file as it is; the name inside the design still changes.
   */
  const renameSharedProjectFile = async (projectId: string, binding: NonNullable<DashboardProject["sharedProject"]>, name: string) => {
    try {
      const query = new URLSearchParams(storeQuery(binding.path ?? "", binding.fileName));
      query.set("renameFileTo", name);
      const response = await fetch(`${SHARED_PROJECTS_ENDPOINT}?${query.toString()}`, {
        method: "POST",
        headers: { "If-Match": `"${binding.revision}"` },
      });
      const payload = await response.json().catch(() => ({})) as { project?: SharedProject; error?: string };
      if (!response.ok || !payload.project) throw new Error(payload.error ?? "Could not rename the shared project");
      const renamed = payload.project;
      setProjects((current) => current.map((project) => (
        project.id === projectId && project.sharedProject
          ? { ...project, sharedProject: { ...project.sharedProject, fileName: renamed.fileName, revision: renamed.revision } }
          : project
      )));
      setSharedProjects((current) => current.map((project) => (
        project.fileName === binding.fileName && (project.path ?? "") === (binding.path ?? "") ? { ...project, ...renamed } : project
      )));
    } catch (error) {
      setDashboardNotice(error instanceof Error ? localizedError(error.message) : t("notice.renameSharedFailed"));
    }
  };

  if (!mounted) {
    return <StaticIntro />;
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
        accept={dashboardImportAccept}
        onChange={(event) => {
          const files = event.currentTarget.files ? Array.from(event.currentTarget.files) : [];
          if (files.length) {
            void importFilesFromDashboard(files);
          }
          event.currentTarget.value = "";
        }}
      />
      {/* The backup button in the storage notice: the same restore as "Open a design or import geometry", but asks for a ZIP only. */}
      <input
        ref={backupRestoreInputRef}
        className="hidden-file-input"
        type="file"
        accept=".zip,application/zip"
        aria-label={t("dashboard.restoreBackup")}
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
          designFolders={designFolders}
          visibleFolders={visibleFolders}
          openFolderId={openFolderId}
          localDesigns={localDesigns}
          onOpenFolder={(folderId) => {
            setOpenFolderId(folderId);
            setDashboardNotice("");
          }}
          onCreateFolder={createFolder}
          onRenameFolder={renameFolder}
          onDeleteFolder={deleteFolder}
          onMoveDesign={moveDesign}
          onMoveFolder={moveFolder}
          query={query}
          sharedFolders={sharedFolders}
          sharedPath={sharedPath}
          sharedProjects={visibleSharedProjects}
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
          onCreate={() => void createNewDesign()}
          newDesignsOnServer={newDesignsOnServer}
          newDesignsOnServerLocked={newDesignsOnServerLocked}
          onNewDesignsOnServerChange={changeNewDesignsOnServer}
          localOnlyProjects={projects.filter((project) => !project.sharedProject).length}
          onSendAllToServer={() => void sendAllProjectsToServer()}
          onDeleteProject={deleteProject}
          onDeleteProjects={deleteProjects}
          onDeleteSharedProject={(project) => void deleteSharedProject(project)}
          onDeleteSharedProjects={(sharedList) => void deleteSharedProjectsInTurn(sharedList)}
          onDuplicateProject={(projectId) => void duplicateProject(projectId)}
          onDuplicateSharedProject={(project) => void duplicateSharedProject(project)}
          onImportFile={() => void pickDashboardImport()}
          onBackupAll={() => void backupAllProjects()}
          onBackupProjects={(designIds) => void backupProjects({ designIds })}
          onBackupFolder={(folderId) => void backupProjects({ folderId })}
          onBackupAllServer={() => void backupAllServerDesigns()}
          onRestoreBackup={() => backupRestoreInputRef.current?.click()}
          openingSharedKey={openingSharedKey}
          onOpenSharedProject={(project) => void openSharedProject(project)}
          onOpenProject={openEditor}
          onQueryChange={setQuery}
          onRenameProject={renameProject}
          onRefreshSharedProjects={() => void refreshSharedProjects()}
          sharedTotal={sharedTotal}
          serverTabFirst={Boolean(serverTabFirst)}
          onSelectSection={(section) => {
            tabChosenRef.current = true;
            setDashboardSection(section);
            setDashboardNotice("");
            if (section === "shared") void refreshSharedProjects();
          }}
          onSortModeChange={setSortMode}
          onViewModeChange={setViewMode}
          onWorkspace={openLatestProject}
          latestThumbnailUrl={[...projects].sort((a, b) => b.updatedAt - a.updatedAt)[0]?.thumbnailUrl ?? null}
        />
      ) : null}
      {emptyProjectPrompt ? (
        <section
          className="dashboard-confirm-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="empty-project-title"
          onKeyDown={(event) => {
            if (event.key === "Escape") setEmptyProjectPromptId(null);
          }}
        >
          <div className="dashboard-confirm-dialog">
            <header>
              <strong id="empty-project-title">{t("confirm.emptyProjectTitle")}</strong>
            </header>
            <p>{t("confirm.emptyProjectBody", { name: emptyProjectPrompt.name })}</p>
            <div className="dashboard-confirm-actions">
              <button className="dashboard-confirm-cancel" type="button" onClick={removeEmptyProject}>
                {t("confirm.no")}
              </button>
              {/* Focused, so Enter keeps the design. */}
              <button className="dashboard-confirm-save" type="button" autoFocus onClick={() => setEmptyProjectPromptId(null)}>
                {t("confirm.yes")}
              </button>
            </div>
          </div>
        </section>
      ) : null}
      {editorStarted && canRenderEditor ? (
        <SafeModeErrorBoundary
          // One per design: opening another starts clean.
          key={activeProjectId ?? "none"}
          projectId={activeProjectId}
          projectName={activeProject?.name}
          onGoToDashboard={() => {
            // The editor normally stays mounted behind the overview; a broken one is taken down,
            // or it would draw the same design and stop again.
            setEditorStarted(false);
            openDashboard();
          }}
          onNewEmptyProject={() => createAndOpenProject()}
        >
          <div className={view === "editor" ? "editor-stage active" : "editor-stage"} aria-hidden={view !== "editor"}>
            <LayerlingEditor
              initialAssets={activeProjectShapeEntry?.assets ?? []}
              initialAttachments={activeProjectShapeEntry?.attachments}
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
              onSaveExportFile={saveExportFileToShared}
              serverFileName={activeProject?.sharedProject?.fileName ?? null}
              onProjectShapesChange={updateProjectShapes}
              onProjectSnapshot={updateProjectSnapshot}
              isProjectThumbnailMissing={isProjectThumbnailMissing}
              projectSaveFailure={projectSaveFailure}
              onProjectWorkspaceChange={updateProjectWorkspace}
              onProjectNameChange={(name) => {
                if (activeProjectId) renameProject(activeProjectId, name);
              }}
              onCreateProjectFromState={createProjectFromHistoryState}
              projectId={activeProjectId}
              projectName={activeProject?.name}
              projectCreatedAt={activeProject?.createdAt}
              projectModifiedAt={activeProject?.updatedAt}
              projectRevision={activeProjectShapeEntry?.revision ?? activeProject?.revision ?? 0}
              editorOpen={view === "editor"}
              sharedProjectsEnabled={sharedProjectsEnabled}
              themePreference={themePreference}
              resolvedTheme={resolvedTheme}
              onThemePreferenceChange={setAppTheme}
            />
          </div>
        </SafeModeErrorBoundary>
      ) : null}
      {view === "editor" && (editorLoading || !canRenderEditor) ? <EditorLoadingSkeleton /> : null}
      <TabPresenceNotice version={LYL_CREATED_WITH_VERSION} projectId={view === "editor" ? activeProjectId : null} />
    </>
  );
}

function EditorLoadingSkeleton() {
  const leftToolbarSections = [
    { className: "home", controls: 1 },
    { className: "clipboard", controls: 4 },
    { className: "history", controls: 3 },
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
  designFolders,
  visibleFolders,
  openFolderId,
  localDesigns,
  onOpenFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveDesign,
  onMoveFolder,
  query,
  sharedFolders,
  sharedPath,
  sharedProjects,
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
  onDeleteProjects,
  onDeleteSharedProject,
  onDeleteSharedProjects,
  onDuplicateProject,
  onDuplicateSharedProject,
  onImportFile,
  onBackupAll,
  onBackupProjects,
  onBackupFolder,
  onBackupAllServer,
  onRestoreBackup,
  openingSharedKey = null,
  newDesignsOnServer,
  newDesignsOnServerLocked,
  onNewDesignsOnServerChange,
  localOnlyProjects,
  onSendAllToServer,
  onOpenSharedProject,
  onOpenProject,
  onQueryChange,
  onRenameProject,
  onRefreshSharedProjects,
  sharedTotal,
  serverTabFirst,
  onSelectSection,
  onSortModeChange,
  onViewModeChange,
  onWorkspace,
  latestThumbnailUrl,
}: {
  dashboardSection: DashboardSection;
  dashboardNotice: string;
  hasProjects: boolean;
  projects: DashboardProject[];
  /** Every folder of this browser, the ones to show here, and the folder that is open (null: the top level). */
  designFolders: DesignFolder[];
  visibleFolders: DesignFolder[];
  openFolderId: string | null;
  /** The designs a folder counts. */
  localDesigns: DashboardProject[];
  onOpenFolder: (folderId: string | null) => void;
  onCreateFolder: (name: string) => void;
  onRenameFolder: (folderId: string, name: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onMoveDesign: (projectId: string, folderId: string | null) => void;
  onMoveFolder: (folderId: string, targetId: string | null) => void;
  query: string;
  sharedFolders: SharedFolder[];
  sharedPath: string;
  sharedProjects: SharedProject[];
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
  onDeleteProjects: (projectIds: string[]) => void;
  onDeleteSharedProject: (project: SharedProject) => void;
  onDeleteSharedProjects: (projects: SharedProject[]) => void;
  onDuplicateProject: (projectId: string) => void;
  onDuplicateSharedProject: (project: SharedProject) => void;
  onImportFile: () => void;
  onBackupAll: () => void;
  onBackupProjects: (designIds: string[]) => void;
  onBackupFolder: (folderId: string) => void;
  onBackupAllServer: () => void;
  onRestoreBackup: () => void;
  openingSharedKey?: string | null;
  newDesignsOnServer: boolean;
  newDesignsOnServerLocked: boolean;
  onNewDesignsOnServerChange: (on: boolean) => void;
  localOnlyProjects: number;
  onSendAllToServer: () => void;
  onOpenSharedProject: (project: SharedProject) => void;
  onOpenProject: (projectId: string) => void;
  onQueryChange: (value: string) => void;
  onRenameProject: (projectId: string, name: string) => void;
  onRefreshSharedProjects: (path?: string) => void;
  /** Designs in the whole server store, for its tab; null until the server has answered. */
  sharedTotal: number | null;
  /** The server tab comes first when the server held more designs than the browser. */
  serverTabFirst: boolean;
  onSelectSection: (section: DashboardSection) => void;
  onSortModeChange: (value: string) => void;
  onViewModeChange: (value: ViewMode) => void;
  onWorkspace: () => void;
  /** The card picture of the design "Continue workplane" opens. */
  latestThumbnailUrl: string | null;
}) {
  const language = useLanguage();
  // Without a server there are only the browser's designs. When every new design must go to the server and this
  // browser holds none of its own, there are only the server's.
  const showBrowserTab = !sharedProjectsEnabled || !newDesignsOnServerLocked || localDesigns.length > 0;
  const activeSection: DashboardSection = !sharedProjectsEnabled ? "home" : showBrowserTab ? dashboardSection : "shared";
  const offlineOk = useOfflineAvailable();
  const { update, isDismissed, dismiss: dismissUpdate } = useAppUpdate(LYL_CREATED_WITH_VERSION);
  const whatsNew = useWhatsNew(LYL_CREATED_WITH_VERSION);
  const simpleMode = useSimpleMode();
  const [openProjectMenuId, setOpenProjectMenuId] = useState<string | null>(null);
  const [openSharedProjectMenuKey, setOpenSharedProjectMenuKey] = useState<string | null>(null);
  const [projectPendingDeleteId, setProjectPendingDeleteId] = useState<string | null>(null);
  const [sharedProjectPendingDeleteKey, setSharedProjectPendingDeleteKey] = useState<string | null>(null);
  // Choosing several designs to delete them together (#886): the keys of what is chosen (designSelection.ts).
  const [selecting, setSelecting] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set());
  const [selectionDeletePending, setSelectionDeletePending] = useState(false);
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
  // The folders of this browser (#496): their dialog, menu, deletion, moving and dragging.
  const [localFolderDialog, setLocalFolderDialog] = useState<{ mode: "create" } | { mode: "rename"; id: string; current: string } | null>(null);
  const [localFolderNameDraft, setLocalFolderNameDraft] = useState("");
  const [openLocalFolderMenuId, setOpenLocalFolderMenuId] = useState<string | null>(null);
  const [localFolderPendingDeleteId, setLocalFolderPendingDeleteId] = useState<string | null>(null);
  const [designPendingMoveId, setDesignPendingMoveId] = useState<string | null>(null);
  const [draggedFolderId, setDraggedFolderId] = useState<string | null>(null);
  // The folder a design or folder is dragged over; "" is the top level, null nothing.
  const [localDropTarget, setLocalDropTarget] = useState<string | null>(null);
  // Solange etwas im Suchfeld steht, tritt die Trefferliste an die Stelle der
  // Ordneransicht. Sie kommt vom Server und umfasst den ganzen Speicher, nicht
  // nur den Ordner, der gerade offen steht.
  const searchTerm = query.trim();
  const searchResults = sharedProjectsEnabled && searchTerm ? sharedSearch : null;
  const searchHits = searchResults ? searchResults.projects.length + searchResults.folders.length : 0;
  const shownSharedProjects = searchResults ? searchResults.projects : sharedProjects;
  // The store's own folder for custom shapes, at its top level: drawn apart, and always first.
  const isShapesFolder = (folder: SharedFolder) => folder.name === CUSTOM_SHAPES_FOLDER && !(folder.path ?? sharedPath);
  const shownSharedFolders = [...(searchResults ? searchResults.folders : sharedFolders)].sort((a, b) => Number(isShapesFolder(b)) - Number(isShapesFolder(a)));

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

  // What can be chosen is what the open list shows: the designs of this browser, or those of the server folder.
  const selectableKeys = activeSection === "shared"
    ? shownSharedProjects.map((project) => serverDesignKey(sharedProjectKey(project)))
    : projects.map((project) => localDesignKey(project.id));
  const selectableSignature = selectableKeys.join("\n");
  const selectedLocal = projects.filter((project) => selectedKeys.has(localDesignKey(project.id)));
  const selectedShared = shownSharedProjects.filter((project) => selectedKeys.has(serverDesignKey(sharedProjectKey(project))));
  const selectedCount = activeSection === "shared" ? selectedShared.length : selectedLocal.length;
  const toggleSelected = (key: string) => setSelectedKeys((current) => toggleDesignSelection(current, key));
  const endSelecting = () => {
    setSelecting(false);
    setSelectedKeys(new Set());
    setSelectionDeletePending(false);
  };
  const startSelecting = () => {
    setOpenProjectMenuId(null);
    setOpenSharedProjectMenuKey(null);
    setSelecting(true);
  };
  const confirmSelectionDelete = () => {
    if (activeSection === "shared") onDeleteSharedProjects(selectedShared);
    else onDeleteProjects(selectedLocal.map((project) => project.id));
    endSelecting();
  };

  // A design that was deleted, moved away or filtered out leaves the selection; a change of list ends it.
  useEffect(() => {
    const shown = selectableSignature ? selectableSignature.split("\n") : [];
    setSelectedKeys((current) => (selectionHasStale(current, shown) ? keepShownSelection(current, shown) : current));
  }, [selectableSignature]);
  useEffect(() => {
    setSelecting(false);
    setSelectedKeys(new Set());
    setSelectionDeletePending(false);
  }, [activeSection, openFolderId, sharedPath]);
  useEffect(() => {
    if (!selecting || selectionDeletePending) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") endSelecting();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selecting, selectionDeletePending]);

  const selectionBar = selecting ? (
    <div className="dashboard-select-bar" role="toolbar" aria-label={t("dashboard.select")}>
      <strong role="status">{t("dashboard.selectedCount", { count: selectedCount })}</strong>
      <button type="button" onClick={() => setSelectedKeys(new Set(selectableKeys))}>{t("dashboard.selectAll")}</button>
      <button type="button" disabled={selectedCount === 0} onClick={() => setSelectedKeys(new Set())}>{t("dashboard.selectNone")}</button>
      {activeSection === "shared" ? null : (
        <button
          type="button"
          disabled={selectedCount === 0}
          title={t("dashboard.backupSelectedTitle")}
          onClick={() => onBackupProjects(selectedLocal.map((project) => project.id))}
        >
          {t("dashboard.backupSelected")}
        </button>
      )}
      <button className="delete" type="button" disabled={selectedCount === 0} onClick={() => setSelectionDeletePending(true)}>{t("common.delete")}</button>
      <button type="button" onClick={endSelecting}>{t("dashboard.selectDone")}</button>
    </div>
  ) : null;

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

  const localSearch = query.trim().length > 0;
  const openTrail = folderTrail(designFolders, openFolderId);
  const openParentId = openTrail.length ? openTrail[openTrail.length - 1].parentId : null;
  const folderName = (folderId: string | null) => designFolders.find((folder) => folder.id === folderId)?.name ?? "";
  const folderProblemText = (problem: ReturnType<typeof storeFolderNameProblem>) => (problem === "start"
    ? t("shared.folderNameBadStart")
    : problem === "chars"
      ? t("shared.folderNameBadChars")
      : problem === "taken"
        ? t("shared.folderNameTaken")
        : "");
  const localFolderProblem = localFolderDialog
    ? designFolderNameProblem(
      designFolders,
      localFolderNameDraft,
      localFolderDialog.mode === "create" ? openFolderId : designFolders.find((folder) => folder.id === localFolderDialog.id)?.parentId ?? null,
      localFolderDialog.mode === "rename" ? localFolderDialog.id : undefined,
    )
    : null;
  const localFolderProblemMessage = folderProblemText(localFolderProblem);
  const localFolderPendingDelete = designFolders.find((folder) => folder.id === localFolderPendingDeleteId) ?? null;
  const designPendingMove = projects.find((project) => project.id === designPendingMoveId) ?? null;
  // Every folder once, each under the folder it is in, for the move dialog.
  const folderTree = (() => {
    const rows: { folder: DesignFolder; depth: number }[] = [];
    const walk = (parentId: string | null, depth: number) => {
      childFolders(designFolders, parentId).forEach((folder) => {
        rows.push({ folder, depth });
        walk(folder.id, depth + 1);
      });
    };
    walk(null, 0);
    return rows;
  })();

  const closeLocalFolderDialog = () => {
    setLocalFolderDialog(null);
    setLocalFolderNameDraft("");
  };
  const confirmLocalFolderDialog = () => {
    if (!localFolderDialog || localFolderProblem) return;
    const name = localFolderNameDraft.trim();
    if (localFolderDialog.mode === "create") onCreateFolder(name);
    else if (name !== localFolderDialog.current) onRenameFolder(localFolderDialog.id, name);
    closeLocalFolderDialog();
  };
  const clearLocalDrag = () => {
    setDraggedProjectId(null);
    setDraggedFolderId(null);
    setLocalDropTarget(null);
    setDropFolderPath(null);
  };
  // A folder card, the way back and the steps of the trail all take a dropped design or folder.
  const localDropTargetProps = (targetId: string | null) => {
    const key = targetId ?? "";
    const accepts = () => {
      if (draggedProjectId) return true;
      if (!draggedFolderId || draggedFolderId === targetId) return false;
      return !(targetId && folderAndDescendants(designFolders, draggedFolderId).has(targetId));
    };
    return {
      onDragOver: (event: DragEvent<HTMLElement>) => {
        if (!accepts()) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        setLocalDropTarget(key);
      },
      onDragLeave: () => setLocalDropTarget((current) => (current === key ? null : current)),
      onDrop: (event: DragEvent<HTMLElement>) => {
        event.preventDefault();
        const projectId = draggedProjectId;
        const folderId = draggedFolderId;
        clearLocalDrag();
        if (projectId) onMoveDesign(projectId, targetId);
        else if (folderId) onMoveFolder(folderId, targetId);
      },
    };
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

  const welcome = useWelcomeHidden();
  // Brought back from the footer: open, and scrolled into view.
  const [welcomeReopened, setWelcomeReopened] = useState(false);
  const showWelcome = () => {
    welcome.show();
    setWelcomeReopened(true);
    window.requestAnimationFrame(() => document.getElementById("welcome")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  // The counts are of the whole place, or of what the search found there.
  const browserCount = localSearch ? projects.length : localDesigns.length;
  const serverCount = searchResults ? searchResults.projects.length : sharedTotal ?? sharedProjects.length;
  const browserTab: DesignTab<DashboardSection> = { id: "home", label: t("dashboard.tabBrowser", { count: browserCount }), count: browserCount };
  const serverTab: DesignTab<DashboardSection> = {
    id: "shared",
    label: t("dashboard.tabServer", { count: serverCount }),
    count: serverCount,
    // A design of this browser dropped on the server's tab goes onto the server.
    dropTarget: dropFolderPath === "server",
    dropProps: {
      onDragOver: (event) => {
        if (!draggedProjectId) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        setDropFolderPath("server");
      },
      onDragLeave: () => setDropFolderPath((current) => (current === "server" ? null : current)),
      onDrop: (event) => {
        event.preventDefault();
        const projectId = draggedProjectId;
        clearLocalDrag();
        if (projectId) onSendProjectToServer(projectId);
      },
    },
  };
  const designTabs = !sharedProjectsEnabled ? [browserTab] : !showBrowserTab ? [serverTab] : serverTabFirst ? [serverTab, browserTab] : [browserTab, serverTab];

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
        <div className="dashboard-topbar-actions">
          <ThemeSwitch />
          <LanguageSwitch />
        </div>
      </header>

      <div className="dashboard-layout">
        <section className={`dashboard-main${hasProjects ? " has-projects" : ""}`} aria-label={activeSection === "shared" ? t("shared.title") : t("dashboard.projects")}>
          {update && !isDismissed && !simpleMode ? (
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
              <UpdatePreview update={update} currentVersion={LYL_CREATED_WITH_VERSION} />
            </aside>
          ) : null}
          {welcome.hidden === false && !simpleMode ? (
            <DashboardWelcome open={(!hasProjects && !sharedTotal) || welcomeReopened} offline={offlineOk} onHide={welcome.hide} />
          ) : null}
          {/* Order follows what someone actually does: start something new,
              pick up where they left off, open something that exists. The
              same three on both tabs: they do not depend on where designs live. */}
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
              {latestThumbnailUrl ? <img className="dashboard-action-thumb" src={latestThumbnailUrl} alt="" /> : null}
            </button>
            <button className="dashboard-action-tile" type="button" onClick={onImportFile}>
              <span className="dashboard-action-icon">
                {/* The same picture as the import button in the editor. */}
                <ToolbarImportIcon width={30} height={30} />
              </span>
              <span>{t("dashboard.importGeometry")}</span>
            </button>
          </div>
          {dashboardNotice ? (
            <div className="dashboard-import-notice" role="status">
              {dashboardNotice}
            </div>
          ) : null}
          {whatsNew.view && !simpleMode ? <WhatsNewCard view={whatsNew.view} current={LYL_CREATED_WITH_VERSION} onClose={whatsNew.dismiss} /> : null}
          {simpleMode ? null : <InstallAppHint />}
          {simpleMode ? null : <TabletHint />}
          <DesignTabs tabs={designTabs} active={activeSection} onSelect={onSelectSection}>
            {activeSection === "shared" ? (
              <button className="dashboard-select dashboard-backup-button" type="button" onClick={() => onRefreshSharedProjects()} disabled={sharedProjectsLoading}>
                <RefreshCw size={17} className={sharedProjectsLoading ? "spinning" : undefined} />
                <span>{t("shared.refresh")}</span>
              </button>
            ) : (
              <>
                {sharedProjectsEnabled ? (
                  <label className="dashboard-select dashboard-new-on-server" title={t(newDesignsOnServerLocked ? "dashboard.newOnServerLockedTitle" : "dashboard.newOnServerTitle")}>
                    <Server size={17} />
                    <input type="checkbox" checked={newDesignsOnServer} disabled={newDesignsOnServerLocked} onChange={(event) => onNewDesignsOnServerChange(event.currentTarget.checked)} />
                    <span>{t("dashboard.newOnServer")}</span>
                  </label>
                ) : null}
                {sharedProjectsEnabled && localOnlyProjects > 0 ? (
                  <button className="dashboard-select dashboard-backup-button" type="button" title={t("dashboard.sendAllToServerTitle")} onClick={onSendAllToServer}>
                    <FolderUp size={17} />
                    <span>{t("dashboard.sendAllToServer")}</span>
                  </button>
                ) : null}
              </>
            )}
            {/* From here on the same on both tabs. A new folder goes into the open one; while
                searching, the way back to the folder stands there instead. */}
            {localSearch ? (
              <button className="dashboard-select dashboard-backup-button" type="button" onClick={() => onQueryChange("")}>
                <X size={17} />
                <span>{t("shared.searchClear")}</span>
              </button>
            ) : (
              <button
                className="dashboard-select dashboard-backup-button"
                type="button"
                title={t(activeSection === "shared" || newDesignsOnServer ? "dashboard.newFolderOnServerTitle" : "dashboard.newFolderTitle")}
                onClick={() => {
                  if (activeSection === "shared") {
                    setFolderNameDraft(suggestStoreFolderName(t("shared.newFolderSuggestion"), sharedFolders.map((folder) => folder.name)));
                    setFolderDialog({ mode: "create" });
                    return;
                  }
                  setLocalFolderNameDraft(suggestDesignFolderName(designFolders, t("shared.newFolderSuggestion"), openFolderId));
                  setLocalFolderDialog({ mode: "create" });
                }}
              >
                <FolderPlus size={17} />
                <span>{t("shared.newFolder")}</span>
              </button>
            )}
            {selectableKeys.length > 0 ? (
              <button
                className={`dashboard-select dashboard-backup-button${selecting ? " active" : ""}`}
                type="button"
                aria-pressed={selecting}
                title={t("dashboard.selectTitle")}
                onClick={() => (selecting ? endSelecting() : startSelecting())}
              >
                <CheckSquare size={17} />
                <span>{t("dashboard.select")}</span>
              </button>
            ) : null}
            <button
              className="dashboard-select dashboard-backup-button"
              type="button"
              title={t(activeSection === "shared" ? "dashboard.downloadAllServerTitle" : "dashboard.backupAllTitle")}
              onClick={activeSection === "shared" ? onBackupAllServer : onBackupAll}
            >
              <Archive size={17} />
              <span>{t("dashboard.backupAll")}</span>
            </button>
            {/* Also there with no designs yet: a new computer is where a backup is restored. */}
            <button className="dashboard-select dashboard-backup-button" type="button" title={t("dashboard.restoreBackupTitle")} onClick={onRestoreBackup}>
              <ArchiveRestore size={17} />
              <span>{t("dashboard.restoreBackup")}</span>
            </button>
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
          </DesignTabs>
          {activeSection === "shared" ? (
            <>
              <div className="design-tab-trail">
                {/* Beim Suchen sagt diese Zeile, was gefunden wurde; sonst
                    ist sie die Adresse: Jeder Schritt zurueck ist ein
                    Schritt, den man gehen kann, und der letzte nennt den
                    Ordner, in dem man steht. Ganz oben sagt das der Reiter. */}
                {searchResults && searchHits > 0 ? (
                  <p className="dashboard-section-subtitle store-search-line" role="status">
                    {searchHits === 1
                      ? t("shared.searchCountOne", { query: searchResults.query })
                      : t("shared.searchCountMany", { count: searchHits, query: searchResults.query })}
                    {searchResults.truncated ? ` ${t("shared.searchTruncated")}` : ""}
                  </p>
                ) : searchResults || !sharedPath ? null : (
                <nav className="store-trail" aria-label={t("shared.trailLabel")}>
                  <button
                    type="button"
                    onClick={() => onOpenStoreFolder("")}
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
              {selectionBar}
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
                        <span className="project-card-title" translate="no">..</span>
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
                          {isShapesFolder(folder) ? <Shapes aria-hidden="true" /> : <FolderKanban aria-hidden="true" />}
                        </span>
                        <span className="project-card-title" translate="no">{folder.name}</span>
                        <span className="project-card-meta">{searchResults
                          ? (folder.path ? t("shared.searchFolderIn", { name: folder.path }) : t("shared.searchFolderRoot"))
                          : t("shared.folderMeta")}</span>
                      </button>
                      {/* Umbenennen und Loeschen eines Ordners gehoeren dorthin,
                          wo er steht - in der Trefferliste fuehrt die Kachel
                          erst einmal hin. */}
                      {/* The custom shapes folder is found by its name: it is not renamed or deleted. */}
                      {searchResults || isShapesFolder(folder) ? null : (
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
                    const isOpening = openingSharedKey === key;
                    return (
                    <article
                      className={`project-card shared-project-card${isOpening ? " is-opening" : ""}${draggedSharedKey === key ? " dragging" : ""}${selecting ? " selectable" : ""}${selecting && selectedKeys.has(serverDesignKey(key)) ? " selected" : ""}`}
                      key={key}
                      draggable={!searchResults && !selecting && !isOpening}
                      title={searchResults ? undefined : t("shared.dragHint")}
                      onDragStart={(event) => {
                        if (isOpening) return;
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", project.fileName);
                        setDraggedSharedKey(key);
                      }}
                      onDragEnd={() => {
                        setDraggedSharedKey(null);
                        setDropFolderPath(null);
                      }}
                    >
                      <button
                        className="project-card-open"
                        type="button"
                        disabled={Boolean(openingSharedKey)}
                        aria-busy={isOpening ? "true" : undefined}
                        aria-pressed={selecting ? selectedKeys.has(serverDesignKey(key)) : undefined}
                        aria-label={selecting ? t("dashboard.selectDesign", { name: project.name }) : undefined}
                        onClick={() => {
                          if (openingSharedKey) return;
                          if (selecting) {
                            toggleSelected(serverDesignKey(key));
                          } else {
                            onOpenSharedProject(project);
                          }
                        }}
                      >
                        <ProjectPreview accent={PROJECT_ACCENTS[index % PROJECT_ACCENTS.length]} thumbnailUrl={project.thumbnailUrl} loading={isOpening} />
                        <span className="project-card-title" translate="no">{project.name}</span>
                        <span className="project-card-meta">
                          {isOpening ? (
                            <span className="project-card-meta-loading">
                              <LoaderCircle size={13} className="project-preview-spinner" />
                              <span>{t("notice.openingShared", { name: project.name })}</span>
                            </span>
                          ) : (
                            `${formatUpdated(project.updatedAt, language)} - ${formatFileSize(project.size)}`
                          )}
                        </span>
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
                      {selecting ? (
                        <span className="project-card-check" aria-hidden="true"><Check size={16} strokeWidth={3} /></span>
                      ) : (
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
                      )}
                      {!selecting && openSharedProjectMenuKey === key ? (
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
              {localDesigns.length > 0 ? <BrowserBackupNote /> : null}
              <div className="design-tab-trail">
                {/* Inside a folder the line under the tabs is the way back: every step a
                    button, and a place to drop a design or a folder on (#496). */}
                {openFolderId && !localSearch ? (
                  <nav className="store-trail" aria-label={t("dashboard.folderTrailLabel")}>
                    <button
                      type="button"
                      onClick={() => onOpenFolder(null)}
                      className={localDropTarget === "" ? "drop-target" : undefined}
                      {...localDropTargetProps(null)}
                    >
                      {t(sharedProjectsEnabled ? "dashboard.trailBrowserRoot" : "dashboard.projects")}
                    </button>
                    {openTrail.map((folder, index) => {
                      const here = index === openTrail.length - 1;
                      return (
                        <Fragment key={folder.id}>
                          <span className="store-trail-separator" aria-hidden="true">/</span>
                          <button
                            type="button"
                            onClick={() => onOpenFolder(folder.id)}
                            disabled={here}
                            className={localDropTarget === folder.id ? "drop-target" : undefined}
                            {...localDropTargetProps(folder.id)}
                          >
                            <span translate="no">{folder.name}</span>
                          </button>
                        </Fragment>
                      );
                    })}
                  </nav>
                ) : null}
              </div>
              {selectionBar}
              {projects.length > 0 || visibleFolders.length > 0 || (openFolderId && !localSearch) ? (
                <div className={viewMode === "grid" ? "project-grid" : "project-list"}>
                  {/* The way back out of a folder, first in the row like in the server folder. */}
                  {openFolderId && !localSearch ? (
                    <article
                      className={`project-card server-folder-card store-parent-card${localDropTarget === (openParentId ?? "") ? " drop-target" : ""}`}
                      {...localDropTargetProps(openParentId)}
                    >
                      <button className="project-card-open" type="button" onClick={() => onOpenFolder(openParentId)}>
                        <span className="project-preview server-folder-preview">
                          <FolderUp aria-hidden="true" />
                        </span>
                        <span className="project-card-title" translate="no">..</span>
                        <span className="project-card-meta">
                          {openParentId ? t("shared.parentFolderIn", { name: folderName(openParentId) }) : t("dashboard.parentFolderRoot")}
                        </span>
                      </button>
                    </article>
                  ) : null}
                  {visibleFolders.map((folder) => {
                    const contents = folderContents(designFolders, localDesigns, folder.id);
                    const where = folderPathNames(designFolders, folder.parentId);
                    return (
                      <article
                        className={`project-card server-folder-card local-folder-card${localDropTarget === folder.id ? " drop-target" : ""}${draggedFolderId === folder.id ? " dragging" : ""}`}
                        key={`local-folder-${folder.id}`}
                        draggable={!localSearch}
                        title={localSearch ? undefined : t("dashboard.folderDragHint")}
                        onDragStart={(event) => {
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", folder.name);
                          setDraggedFolderId(folder.id);
                        }}
                        onDragEnd={clearLocalDrag}
                        {...localDropTargetProps(folder.id)}
                      >
                        <button
                          className="project-card-open"
                          type="button"
                          onClick={() => {
                            if (localSearch) onQueryChange("");
                            onOpenFolder(folder.id);
                          }}
                        >
                          <span className="project-preview server-folder-preview">
                            <Folder aria-hidden="true" />
                          </span>
                          <span className="project-card-title" translate="no">{folder.name}</span>
                          <span className="project-card-meta">{localSearch && where.length
                            ? t("shared.searchFolderIn", { name: where.join(" / ") })
                            : contents.designs === 0 && contents.folders === 0
                              ? t("dashboard.folderEmpty")
                              : contents.designs === 1
                                ? t("dashboard.folderDesignsOne")
                                : t("dashboard.folderDesignsMany", { count: contents.designs })}</span>
                        </button>
                        {localSearch ? null : (
                          <>
                            <button
                              className="project-menu-trigger"
                              type="button"
                              aria-label={t("shared.folderOptionsFor", { name: folder.name })}
                              aria-expanded={openLocalFolderMenuId === folder.id}
                              title={t("shared.folderOptions")}
                              onClick={() => {
                                setOpenProjectMenuId(null);
                                setOpenSharedProjectMenuKey(null);
                                setOpenFolderMenuName(null);
                                setOpenLocalFolderMenuId((current) => (current === folder.id ? null : folder.id));
                              }}
                            >
                              <EllipsisVertical size={19} strokeWidth={2.5} />
                            </button>
                            {openLocalFolderMenuId === folder.id ? (
                              <div className="project-card-menu" role="menu" aria-label={t("shared.folderMenuFor", { name: folder.name })}>
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    setOpenLocalFolderMenuId(null);
                                    setLocalFolderNameDraft(folder.name);
                                    setLocalFolderDialog({ mode: "rename", id: folder.id, current: folder.name });
                                  }}
                                >
                                  <Pencil size={16} />
                                  <span>{t("common.rename")}</span>
                                </button>
                                <button
                                  type="button"
                                  role="menuitem"
                                  title={t("dashboard.backupFolderTitle")}
                                  onClick={() => {
                                    setOpenLocalFolderMenuId(null);
                                    onBackupFolder(folder.id);
                                  }}
                                >
                                  <Archive size={16} />
                                  <span>{t("dashboard.backupSelected")}</span>
                                </button>
                                <button
                                  className="delete"
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    setOpenLocalFolderMenuId(null);
                                    setLocalFolderPendingDeleteId(folder.id);
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
                  {projects.map((project) => (
                    <article
                      className={`project-card${draggedProjectId === project.id ? " dragging" : ""}${selecting ? " selectable" : ""}${selecting && selectedKeys.has(localDesignKey(project.id)) ? " selected" : ""}`}
                      key={project.id}
                      draggable={!selecting}
                      title={sharedProjectsEnabled ? t("dashboard.dragHintServerTab") : t("shared.dragHint")}
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", project.name);
                        setDraggedProjectId(project.id);
                      }}
                      onDragEnd={clearLocalDrag}
                    >
                      <button
                        className="project-card-open"
                        type="button"
                        aria-pressed={selecting ? selectedKeys.has(localDesignKey(project.id)) : undefined}
                        aria-label={selecting ? t("dashboard.selectDesign", { name: project.name }) : undefined}
                        onClick={() => (selecting ? toggleSelected(localDesignKey(project.id)) : onOpenProject(project.id))}
                      >
                        <ProjectPreview accent={project.accent} thumbnailUrl={project.thumbnailUrl} />
                        <span className="project-card-title" translate="no">{project.name}</span>
                        <span className="project-card-meta">
                          {formatUpdated(project.updatedAt, language)} - {t("dashboard.shapeCount", { count: project.shapes })}
                        </span>
                      </button>
                      {/* A design found by the search says which folder it is in, and takes you there. */}
                      {localSearch && folderOfDesign(designFolders, project.folderId) ? (
                        <button
                          className="project-card-folder"
                          type="button"
                          aria-label={t("shared.openFolderOf", { name: folderPathNames(designFolders, project.folderId).join(" / ") })}
                          onClick={() => {
                            onQueryChange("");
                            onOpenFolder(folderOfDesign(designFolders, project.folderId));
                          }}
                        >
                          <Folder size={14} />
                          <span>{folderPathNames(designFolders, project.folderId).join(" / ")}</span>
                        </button>
                      ) : null}
                      {selecting ? (
                        <span className="project-card-check" aria-hidden="true"><Check size={16} strokeWidth={3} /></span>
                      ) : (
                      <button
                        className="project-menu-trigger"
                        type="button"
                        aria-label={t("dashboard.projectOptionsFor", { name: project.name })}
                        aria-expanded={openProjectMenuId === project.id}
                        title={t("dashboard.projectOptions")}
                        onClick={() => {
                          setOpenSharedProjectMenuKey(null);
                          setOpenFolderMenuName(null);
                          setOpenLocalFolderMenuId(null);
                          setOpenProjectMenuId((current) => (current === project.id ? null : project.id));
                        }}
                      >
                        <EllipsisVertical size={19} strokeWidth={2.5} />
                      </button>
                      )}
                      {!selecting && openProjectMenuId === project.id ? (
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
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setOpenProjectMenuId(null);
                              setDesignPendingMoveId(project.id);
                            }}
                          >
                            <FolderInput size={16} />
                            <span>{t("shared.moveTo")}</span>
                          </button>
                          {sharedProjectsEnabled ? (
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                setOpenProjectMenuId(null);
                                onSendProjectToServer(project.id);
                              }}
                            >
                              <Server size={16} />
                              <span>{t("dashboard.sendToServer")}</span>
                            </button>
                          ) : null}
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
              ) : (
                <div className="project-empty">
                  <strong>{t("dashboard.emptyTitle")}</strong>
                  <span>{t("dashboard.emptyHint")}</span>
                </div>
              )}
              {openFolderId && !localSearch && projects.length === 0 && visibleFolders.length === 0 ? (
                <div className="project-empty">
                  <strong>{t("dashboard.folderEmptyTitle")}</strong>
                  <span>{t("dashboard.folderEmptyHint")}</span>
                </div>
              ) : null}
            </>
          )}
          <AppFooter version={LYL_CREATED_WITH_VERSION} updateInfo={update} onShowWelcome={welcome.hidden && !simpleMode ? showWelcome : undefined} />
        </section>
      </div>

      {selectionDeletePending && selectedCount > 0 ? (
        <section className="dashboard-confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-designs-title">
          <div className="dashboard-confirm-dialog">
            <header>
              <strong id="delete-designs-title">{selectedCount === 1 ? t("confirm.deleteProjectTitle") : t("confirm.deleteDesignsTitle")}</strong>
              <button type="button" aria-label={t("confirm.deleteProjectCancel")} onClick={() => setSelectionDeletePending(false)}>
                <X size={18} />
              </button>
            </header>
            <p>{selectedCount === 1
              ? t("confirm.deleteProjectBody", { name: (activeSection === "shared" ? selectedShared[0] : selectedLocal[0]).name })
              : t("confirm.deleteDesignsBody", { count: selectedCount })}</p>
            <div className="dashboard-confirm-actions">
              <button className="dashboard-confirm-cancel" type="button" onClick={() => setSelectionDeletePending(false)}>
                {t("confirm.cancel")}
              </button>
              <button className="dashboard-confirm-delete" type="button" onClick={confirmSelectionDelete}>
                {t("confirm.delete")}
              </button>
            </div>
          </div>
        </section>
      ) : null}

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
                    <span translate="no">{folder.name}</span>
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

      {/* The folders of this browser (#496): the same dialogs as the server folders. Deleting a
          folder deletes no design; the dialog says where its contents go. */}
      {localFolderDialog ? (
        <section className="dashboard-confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="local-folder-title">
          <form
            className="dashboard-confirm-dialog dashboard-rename-dialog"
            onSubmit={(event) => {
              event.preventDefault();
              confirmLocalFolderDialog();
            }}
          >
            <header>
              <strong id="local-folder-title">{localFolderDialog.mode === "create" ? t("shared.newFolderTitle") : t("shared.renameFolderTitle")}</strong>
              <GuideHelpLink chapter="files" section="designFolders" iconSize={16} />
              <button type="button" aria-label={localFolderDialog.mode === "create" ? t("shared.newFolderCancel") : t("shared.renameFolderCancel")} onClick={closeLocalFolderDialog}>
                <X size={18} />
              </button>
            </header>
            <label>
              <span>{t("shared.folderName")}</span>
              <input
                autoFocus
                maxLength={80}
                value={localFolderNameDraft}
                onChange={(event) => setLocalFolderNameDraft(event.currentTarget.value)}
                onFocus={(event) => event.currentTarget.select()}
                onKeyDown={(event) => {
                  if (event.key === "Escape") closeLocalFolderDialog();
                }}
                aria-label={t("shared.folderName")}
                aria-invalid={localFolderProblem && localFolderProblem !== "empty" ? true : undefined}
                aria-describedby={localFolderProblemMessage ? "local-folder-problem" : undefined}
              />
              {localFolderProblemMessage ? (
                <span className="dashboard-dialog-problem" id="local-folder-problem" role="status">{localFolderProblemMessage}</span>
              ) : null}
            </label>
            <div className="dashboard-confirm-actions">
              <button className="dashboard-confirm-cancel" type="button" onClick={closeLocalFolderDialog}>
                {t("confirm.cancel")}
              </button>
              <button className="dashboard-confirm-save" type="submit" disabled={Boolean(localFolderProblem)}>
                {localFolderDialog.mode === "create" ? t("shared.createFolder") : t("common.save")}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {localFolderPendingDelete ? (
        <section className="dashboard-confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-local-folder-title">
          <div className="dashboard-confirm-dialog">
            <header>
              <strong id="delete-local-folder-title">{t("shared.deleteFolderTitle")}</strong>
              <button type="button" aria-label={t("shared.deleteFolderCancel")} onClick={() => setLocalFolderPendingDeleteId(null)}>
                <X size={18} />
              </button>
            </header>
            <p>{localFolderPendingDelete.parentId
              ? t("dashboard.deleteFolderBodyIn", { name: localFolderPendingDelete.name, parent: folderName(localFolderPendingDelete.parentId) })
              : t("dashboard.deleteFolderBodyRoot", { name: localFolderPendingDelete.name })}</p>
            <div className="dashboard-confirm-actions">
              <button className="dashboard-confirm-cancel" type="button" onClick={() => setLocalFolderPendingDeleteId(null)}>
                {t("confirm.cancel")}
              </button>
              <button
                className="dashboard-confirm-delete"
                type="button"
                onClick={() => {
                  onDeleteFolder(localFolderPendingDelete.id);
                  setLocalFolderPendingDeleteId(null);
                }}
              >
                {t("confirm.delete")}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {/* Every folder of this browser in one list, each under its own: one step, wherever it is. */}
      {designPendingMove ? (
        <section className="dashboard-confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="move-design-title">
          <div className="dashboard-confirm-dialog">
            <header>
              <strong id="move-design-title">{t("shared.moveToTitle", { name: designPendingMove.name })}</strong>
              <button type="button" aria-label={t("shared.moveToCancel")} onClick={() => setDesignPendingMoveId(null)}>
                <X size={18} />
              </button>
            </header>
            {folderTree.length > 0 ? (
              <div className="store-move-targets">
                {[{ folder: null as DesignFolder | null, depth: 0 }, ...folderTree].map(({ folder, depth }) => {
                  const targetId = folder?.id ?? null;
                  const here = folderOfDesign(designFolders, designPendingMove.folderId) === targetId;
                  return (
                    <button
                      key={`move-local-${targetId ?? "top"}`}
                      type="button"
                      disabled={here}
                      aria-current={here ? "location" : undefined}
                      style={{ paddingInlineStart: `${12 + depth * 18}px` }}
                      onClick={() => {
                        onMoveDesign(designPendingMove.id, targetId);
                        setDesignPendingMoveId(null);
                      }}
                    >
                      {folder ? <Folder size={18} /> : <FolderUp size={18} />}
                      <span>{folder ? folder.name : t("dashboard.moveToRoot")}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p>{t("dashboard.moveNoFolders")}</p>
            )}
            <div className="dashboard-confirm-actions">
              <button className="dashboard-confirm-cancel" type="button" onClick={() => setDesignPendingMoveId(null)}>
                {t("confirm.cancel")}
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

function ProjectPreview({ accent, thumbnailUrl, loading = false }: { accent: DashboardProject["accent"]; thumbnailUrl?: string | null; loading?: boolean }) {
  const [failedThumbnailUrl, setFailedThumbnailUrl] = useState<string | null>(null);
  const showThumbnail = Boolean(thumbnailUrl && thumbnailUrl !== failedThumbnailUrl);

  useEffect(() => {
    setFailedThumbnailUrl(null);
  }, [thumbnailUrl]);

  return (
    <span className={`project-preview accent-${accent}${loading ? " is-loading" : ""}`} aria-hidden="true">
      {showThumbnail ? (
        <img className="project-thumbnail-image" src={thumbnailUrl ?? ""} alt="" onError={() => setFailedThumbnailUrl(thumbnailUrl ?? null)} />
      ) : (
        <>
          <span className="preview-grid" />
          <span className="preview-empty-mark">{t("dashboard.noSnapshot")}</span>
        </>
      )}
      {loading ? (
        <span className="project-preview-loading">
          <LoaderCircle size={28} className="project-preview-spinner" />
        </span>
      ) : null}
    </span>
  );
}

/**
 * What the exported HTML holds before the app starts: the welcome guide in
 * both languages. The start page draws nothing until it has read the browser's
 * storage, so without this a search engine or link preview that does not run
 * JavaScript found nothing but the title. It is the same text a first-time
 * visitor sees open on the page, kept out of sight only for the moment until
 * the app replaces it.
 */
function StaticIntro() {
  return (
    // Hidden text for search engines and link previews, in both languages. Chrome read the German
    // half as a page to translate and offered it on every load, even in English (#191). Kept out
    // of translation, it still counted when Chrome guessed the page's language - so the German
    // half sits in <noscript>: crawlers and link previews without JavaScript read it as text, a
    // browser never draws it and Chrome's guess no longer sees it.
    <main className="visually-hidden notranslate" translate="no">
      <h1>layerling - Free 3D CAD for 3D printing in your browser</h1>
      <section lang="en">
        <h2>{translate("en", "welcome.teaserTitle")}</h2>
        <WelcomeGuideBody tr={(key) => translate("en", key)} />
      </section>
      <noscript>
        <section lang="de">
          <h2>{translate("de", "welcome.teaserTitle")}</h2>
          <WelcomeGuideBody tr={(key) => translate("de", key)} />
        </section>
      </noscript>
    </main>
  );
}
