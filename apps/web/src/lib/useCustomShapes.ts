"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CustomShapeEntry, CustomShapeFolder, CustomShapeLocation } from "@/components/workplane/MyShapesSection";
import {
  createServerCustomShapeFolder,
  deleteServerCustomShape,
  deleteServerCustomShapeFolder,
  listServerCustomShapes,
  moveServerCustomShape,
  readServerCustomShape,
  renameServerCustomShape,
  renameServerCustomShapeFolder,
  saveServerCustomShape,
  serverCustomShapeId,
  type ServerCustomShapes,
} from "@/lib/customShapesServer";
import { customShapeFingerprint, packCustomShape, placeCustomShape, placeInsertedDesign, type PackedCustomShape } from "@/lib/customShapePackage";
import { t } from "@/lib/i18n";
import { createLocalId } from "@/lib/localIds";
import { importLylProject, type exportLylProject } from "@/lib/lylProject";
import {
  createMyShapeFolder,
  customShapesBackupEntries,
  deleteMyShape,
  deleteMyShapeFolder,
  listMyShapeFolders,
  listMyShapes,
  moveMyShape,
  myShapeNameFromFile,
  myShapesBackupFileName,
  onMyShapesChanged,
  readMyShapePackage,
  renameMyShape,
  renameMyShapeFolder,
  restoreCustomShapesFromBackup,
  saveMyShape,
  type MyShapeFolder,
  type MyShapeMeta,
} from "@/lib/myShapes";
import type { PlacementPoint, PlacementWorkplane } from "@/lib/placementWorkplane";
import { mcpShapeSummary } from "@/lib/editorMcpSummary";
import { dedupeProjectAssets } from "@/lib/projectAssets";
import { displayShapeName } from "@/lib/shapeCatalog";
import { packBackup, unpackBackup } from "@/lib/projectBackup";
import { dropBackupTarget, pickBackupTarget, writeBackupTarget } from "@/lib/lylFileAccess";
import { CUSTOM_SHAPE_FOLDER_DEPTH, FOLDER_PATH_SEPARATOR, folderAncestry, folderPathName, joinFolderPath, parentFolderPath } from "@/lib/customShapeFolders";
import { storeFolderNameProblem } from "@/lib/storeFolderName";
import { localizedError } from "@/lib/userErrors";
import { NOTE_COUNT_LIMIT } from "@/lib/workplaneNotes";
import type { ProjectAsset, WorkplaneNote, WorkplaneShape } from "@/types/layerling";

type LylExport = Parameters<typeof exportLylProject>[0];

/**
 * Server folders go by "server-folder:<path>" ("server-folder:Brackets/M3");
 * a path is unique there, like a browser folder's id. Renaming a folder
 * changes the ids of every folder below it.
 */
const SERVER_FOLDER_PREFIX = "server-folder:";
const serverFolderId = (path: string) => `${SERVER_FOLDER_PREFIX}${path}`;
const DEPTH_MESSAGE = `Folders go ${CUSTOM_SHAPE_FOLDER_DEPTH} levels deep; this one cannot hold another folder`;

export interface CustomShapesOptions {
  sharedProjectsEnabled: boolean;
  setNotice: (message: string, busy?: boolean) => void;
  commitShapes: (next: WorkplaneShape[], nextSelection?: string | string[] | null, message?: string) => void;
  setProjectAssets: (assets: ProjectAsset[]) => void;
  downloadBlob: (fileName: string, blob: Blob) => Promise<void>;
  shapesRef: { current: WorkplaneShape[] };
  selectedIdsRef: { current: string[] };
  notesRef: { current: WorkplaneNote[] };
  /** Set while the history view is open; then inserted notes are not added. */
  historyViewStateRef: { current: unknown };
  projectAssetsRef: { current: ProjectAsset[] };
  workspaceSettingsRef: { current: LylExport["workspace"] };
  snapGridRef: { current: LylExport["snapGrid"] };
  projectInfoRef: { current: { projectId: string | null } };
  placementWorkplaneRef: { current: PlacementWorkplane };
}

/**
 * Custom shapes (#109): kept in this browser (IndexedDB) and, where the
 * shared store is on, in its "Custom shapes" folder - each side with folders
 * of its own, up to three levels deep. Shown on top of the shape library; server
 * entries carry the id "server:<folder>/<file name>" ("server:<file name>"
 * at the top).
 */
export function useCustomShapes(options: CustomShapesOptions) {
  const { sharedProjectsEnabled, setNotice, commitShapes, setProjectAssets, downloadBlob } = options;
  const { shapesRef, selectedIdsRef, notesRef, historyViewStateRef, projectAssetsRef, workspaceSettingsRef, snapGridRef, projectInfoRef, placementWorkplaneRef } = options;
  const [myShapes, setMyShapes] = useState<MyShapeMeta[]>([]);
  const myShapesRef = useRef<MyShapeMeta[]>([]);
  const [myFolders, setMyFolders] = useState<MyShapeFolder[]>([]);
  const myFoldersRef = useRef<MyShapeFolder[]>([]);
  const [serverShapes, setServerShapes] = useState<ServerCustomShapes | null>(null);
  const serverShapesRef = useRef<ServerCustomShapes | null>(null);
  const myShapesFileInputRef = useRef<HTMLInputElement | null>(null);

  const refreshMyShapes = useCallback(async () => {
    try {
      const [list, folders] = await Promise.all([listMyShapes(), listMyShapeFolders()]);
      myShapesRef.current = list;
      myFoldersRef.current = folders;
      setMyShapes(list);
      setMyFolders(folders);
      return list;
    } catch {
      return myShapesRef.current;
    }
  }, []);
  const refreshServerShapes = useCallback(async () => {
    if (!sharedProjectsEnabled) {
      serverShapesRef.current = null;
      setServerShapes(null);
      return null;
    }
    try {
      const list = await listServerCustomShapes();
      serverShapesRef.current = list;
      setServerShapes(list);
      return list;
    } catch {
      return serverShapesRef.current;
    }
  }, [sharedProjectsEnabled]);
  useEffect(() => {
    void refreshMyShapes();
    return onMyShapesChanged(() => void refreshMyShapes());
  }, [refreshMyShapes]);
  useEffect(() => {
    void refreshServerShapes();
  }, [refreshServerShapes]);

  const customShapeEntries = useMemo<CustomShapeEntry[]>(() => [
    ...myShapes.map((shape) => ({ id: shape.id, name: shape.name, thumbnail: shape.thumbnail, location: "browser" as const, folderId: shape.folderId && myFolders.some((folder) => folder.id === shape.folderId) ? shape.folderId : null })),
    ...(serverShapes?.shapes ?? []).map((shape) => ({ id: serverCustomShapeId(shape), name: shape.name, thumbnail: shape.thumbnailUrl ?? "", location: "server" as const, folderId: shape.folder ? serverFolderId(shape.folder) : null })),
  ], [myShapes, myFolders, serverShapes]);
  const customShapeFolders = useMemo<CustomShapeFolder[]>(() => [
    ...myFolders.map((folder) => ({ id: folder.id, name: folder.name, location: "browser" as const, parentId: folder.parentId })),
    ...(serverShapes?.folders ?? []).map((path) => {
      const parent = parentFolderPath(path);
      return { id: serverFolderId(path), name: folderPathName(path), location: "server" as const, parentId: parent ? serverFolderId(parent) : null };
    }),
  ], [myFolders, serverShapes]);

  const serverShapeFor = (id: string) => (id.startsWith("server:")
    ? serverShapesRef.current?.shapes.find((shape) => serverCustomShapeId(shape) === id) ?? null
    : null);
  const customShapeName = (id: string) => serverShapeFor(id)?.name ?? myShapesRef.current.find((shape) => shape.id === id)?.name ?? id;
  /** The server folder's path behind an id, null for none. */
  const serverFolderPath = (folderId: string | null) => (folderId?.startsWith(SERVER_FOLDER_PREFIX) ? folderId.slice(SERVER_FOLDER_PREFIX.length) : null);
  /** A browser folder's path of names, as the MCP tools and backups write it. */
  const browserFolderPath = (folderId: string | null | undefined) => (folderId
    ? folderAncestry(myFoldersRef.current, folderId).map((folder) => folder.name).join(FOLDER_PATH_SEPARATOR) || null
    : null);
  /** How many folders deep `folderId` sits; 0 for none. */
  const folderDepthOf = (folderId: string | null) => {
    const server = serverFolderPath(folderId);
    if (server !== null) return server.split(FOLDER_PATH_SEPARATOR).length;
    return folderAncestry(myFoldersRef.current, folderId).length;
  };
  /** A folder's own name, for the messages. */
  const folderName = (folderId: string | null) => {
    const server = serverFolderPath(folderId);
    return server !== null ? folderPathName(server) : myFoldersRef.current.find((folder) => folder.id === folderId)?.name ?? "";
  };

  const packCurrentCustomShape = (parts: WorkplaneShape[], name: string, assets: ProjectAsset[], notes: WorkplaneNote[]) => packCustomShape(
    parts, name, assets, notes, { workspace: workspaceSettingsRef.current, snapGrid: snapGridRef.current },
  );

  const keepInBrowser = useCallback(async (packed: PackedCustomShape, name: string, folderId: string | null = null) => {
    const meta: MyShapeMeta = {
      id: createLocalId("my-shape"),
      name,
      createdAt: packed.createdAt,
      thumbnail: packed.thumbnail,
      bodyCount: packed.bodyCount,
      byteLength: packed.bytes.byteLength,
      fingerprint: packed.fingerprint,
      ...(folderId ? { folderId } : {}),
    };
    await saveMyShape(meta, packed.bytes);
    return meta;
  }, []);

  /** Where a new custom shape goes when nobody says: the server, when there is one. */
  const defaultCustomShapeLocation = (): CustomShapeLocation => (serverShapesRef.current ? "server" : "browser");

  const saveSelectionAsMyShape = useCallback(async (name: string, ids?: string[], location: CustomShapeLocation = defaultCustomShapeLocation(), folderId: string | null = null) => {
    const wanted = new Set(ids ?? selectedIdsRef.current);
    const parts = shapesRef.current.filter((shape) => wanted.has(shape.id));
    if (parts.length === 0) throw new Error(t("myShapes.selectFirst"));
    const packed = await packCurrentCustomShape(parts, name, projectAssetsRef.current, notesRef.current);
    let entry: { id: string; name: string; location: CustomShapeLocation; folder: string | null; bodyCount: number; byteLength: number };
    if (location === "server") {
      const folder = serverFolderPath(folderId);
      const saved = await saveServerCustomShape(name, packed.bytes, packed.thumbnail, t("status.myShapeNameTaken", { name }), folder);
      await refreshServerShapes();
      entry = { id: serverCustomShapeId(saved), name: saved.name, location, folder, bodyCount: packed.bodyCount, byteLength: packed.bytes.byteLength };
    } else {
      const meta = await keepInBrowser(packed, name, folderId);
      await refreshMyShapes();
      entry = { id: meta.id, name, location, folder: browserFolderPath(folderId), bodyCount: meta.bodyCount, byteLength: meta.byteLength };
    }
    setNotice(t(location === "server" ? "status.myShapeSavedServer" : "status.myShapeSaved", { name: entry.name }));
    return entry;
  }, [keepInBrowser, refreshMyShapes, refreshServerShapes]); // eslint-disable-line react-hooks/exhaustive-deps

  const readCustomShapePackage = (id: string) => {
    const server = serverShapeFor(id);
    if (id.startsWith("server:")) {
      if (!server) throw new Error(t("status.myShapeGone"));
      return readServerCustomShape(server);
    }
    return readMyShapePackage(id);
  };

  /**
   * Bodies from a package into the design, selected, with their source files and their notes
   * after the ones already here (so numbered on from them), all in one undo step.
   */
  const addInsertedBodies = (assets: ProjectAsset[], placed: { shapes: WorkplaneShape[]; notes: WorkplaneNote[]; dropped: number }, message: string) => {
    if (assets.length > 0) {
      const nextAssets = dedupeProjectAssets([...projectAssetsRef.current, ...assets]);
      projectAssetsRef.current = nextAssets;
      setProjectAssets(nextAssets);
    }
    if (placed.notes.length > 0 && !historyViewStateRef.current) notesRef.current = [...notesRef.current, ...placed.notes];
    commitShapes([...shapesRef.current, ...placed.shapes], placed.shapes.map((shape) => shape.id), message);
    if (placed.dropped > 0 && !historyViewStateRef.current) setNotice(t("status.noteLimitReached", { count: NOTE_COUNT_LIMIT }));
    return placed.shapes;
  };

  const insertMyShape = useCallback(async (id: string, point?: PlacementPoint) => {
    const sourceProjectId = projectInfoRef.current.projectId;
    const name = customShapeName(id);
    const restored = await importLylProject(await readCustomShapePackage(id));
    if (projectInfoRef.current.projectId !== sourceProjectId) throw new Error(t("status.pasteCancelled"));
    if (restored.shapes.length === 0) throw new Error(t("status.insertDesignEmpty", { name }));
    const placed = placeCustomShape(restored, point ?? placementWorkplaneRef.current.origin, notesRef.current);
    return addInsertedBodies(restored.assets, placed, t("status.myShapeInserted", { name }));
  }, [commitShapes]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * A saved design's bodies into the open one ("Insert into this design") - for parts kept as
   * building blocks: where they were saved, with their notes. False when nothing went in.
   */
  const insertDesignFile = useCallback(async (file: File) => {
    const sourceProjectId = projectInfoRef.current.projectId;
    setNotice(t("status.validatingFile", { name: file.name }), true);
    try {
      const restored = await importLylProject(await file.arrayBuffer());
      if (projectInfoRef.current.projectId !== sourceProjectId) {
        setNotice(t("status.importCancelled", { count: 1 }));
        return false;
      }
      if (restored.shapes.length === 0) {
        setNotice(t("status.insertDesignEmpty", { name: file.name }));
        return false;
      }
      const placed = placeInsertedDesign(restored, notesRef.current);
      addInsertedBodies(restored.assets, placed, t("status.insertedDesign", { count: placed.shapes.length, name: file.name }));
      return true;
    } catch (error) {
      setNotice(error instanceof Error ? localizedError(error.message) : t("status.insertDesignFailed", { name: file.name }));
      return false;
    }
  }, [commitShapes]); // eslint-disable-line react-hooks/exhaustive-deps

  const renameMyShapeEntry = useCallback(async (id: string, name: string) => {
    const server = serverShapeFor(id);
    if (server) {
      await renameServerCustomShape(server, name, t("status.myShapeNameTaken", { name }));
      await refreshServerShapes();
      return;
    }
    await renameMyShape(id, name);
    await refreshMyShapes();
  }, [refreshMyShapes, refreshServerShapes]); // eslint-disable-line react-hooks/exhaustive-deps

  const deleteMyShapeEntry = useCallback(async (id: string) => {
    const name = customShapeName(id);
    const server = serverShapeFor(id);
    if (server) {
      await deleteServerCustomShape(server);
      await refreshServerShapes();
    } else {
      await deleteMyShape(id);
      await refreshMyShapes();
    }
    setNotice(t("status.myShapeDeleted", { name }));
  }, [refreshMyShapes, refreshServerShapes]); // eslint-disable-line react-hooks/exhaustive-deps

  /** A shape from this browser onto the server, at the top of its list. A move, as on the start page: it is not kept twice. */
  const moveMyShapeToServer = useCallback(async (id: string) => {
    const meta = myShapesRef.current.find((shape) => shape.id === id);
    if (!meta) throw new Error(t("status.myShapeGone"));
    const bytes = await readMyShapePackage(id);
    await saveServerCustomShape(meta.name, bytes, meta.thumbnail, t("status.myShapeNameTaken", { name: meta.name }));
    await deleteMyShape(id);
    await Promise.all([refreshMyShapes(), refreshServerShapes()]);
    setNotice(t("status.myShapeMovedToServer", { name: meta.name }));
  }, [refreshMyShapes, refreshServerShapes]);

  /** Into one of the folders on its own side, or with `null` back to the top of the list. */
  const moveMyShapeToFolder = useCallback(async (id: string, folderId: string | null) => {
    const name = customShapeName(id);
    const server = serverShapeFor(id);
    const target = folderId ? folderName(folderId) : null;
    if (server) {
      await moveServerCustomShape(server, serverFolderPath(folderId), t("status.myShapeNameTakenInFolder", { name, folder: target ?? t("myShapes.title") }));
      await refreshServerShapes();
    } else {
      await moveMyShape(id, folderId);
      await refreshMyShapes();
    }
    setNotice(target ? t("status.myShapeMovedToFolder", { name, folder: target }) : t("status.myShapeMovedOutOfFolder", { name }));
  }, [refreshMyShapes, refreshServerShapes]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * A new folder at the top or inside `parentId`, on the parent's side;
   * returns its id. The caller has checked the name against the folders
   * beside it.
   */
  const createShapeFolder = useCallback(async (name: string, location: CustomShapeLocation, parentId: string | null = null) => {
    if (folderDepthOf(parentId) >= CUSTOM_SHAPE_FOLDER_DEPTH) throw new Error(DEPTH_MESSAGE);
    const taken = t("shared.folderNameTaken");
    let id: string;
    if (location === "server") {
      const parent = serverFolderPath(parentId);
      await createServerCustomShapeFolder(name, taken, parent);
      await refreshServerShapes();
      id = serverFolderId(joinFolderPath(parent, name.trim()));
    } else {
      id = (await createMyShapeFolder(name, parentId)).id;
      await refreshMyShapes();
    }
    setNotice(t("status.myShapeFolderCreated", { name: name.trim() }));
    return id;
  }, [refreshMyShapes, refreshServerShapes]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Returns the folder's id afterwards: on the server it is its path, so it changes. */
  const renameShapeFolder = useCallback(async (folderId: string, name: string) => {
    const server = serverFolderPath(folderId);
    if (server !== null) {
      await renameServerCustomShapeFolder(server, name, t("shared.folderNameTaken"));
      await refreshServerShapes();
      return serverFolderId(joinFolderPath(parentFolderPath(server), name.trim()));
    }
    await renameMyShapeFolder(folderId, name);
    await refreshMyShapes();
    return folderId;
  }, [refreshMyShapes, refreshServerShapes]); // eslint-disable-line react-hooks/exhaustive-deps

  /** The folder with every folder and shape in it. */
  const deleteShapeFolder = useCallback(async (folderId: string) => {
    const name = folderName(folderId);
    const server = serverFolderPath(folderId);
    if (server !== null) {
      await deleteServerCustomShapeFolder(server);
      await refreshServerShapes();
    } else {
      await deleteMyShapeFolder(folderId);
      await refreshMyShapes();
    }
    setNotice(t("status.myShapeFolderDeleted", { name }));
  }, [refreshMyShapes, refreshServerShapes]); // eslint-disable-line react-hooks/exhaustive-deps

  const backUpMyShapes = useCallback(async () => {
    // Where it goes is asked first, while the click still counts: in Chrome and Edge a save dialog that remembers its
    // folder, elsewhere a download, as for the backups of the start page.
    const target = await pickBackupTarget(myShapesBackupFileName(new Date()));
    if (!target) return;
    const entries = await customShapesBackupEntries();
    const count = entries.length - 1;
    if (count <= 0) {
      await dropBackupTarget(target);
      setNotice(t("status.myShapesNoneToBackUp"));
      return;
    }
    const zipped = packBackup(entries);
    const buffer = zipped.buffer.slice(zipped.byteOffset, zipped.byteOffset + zipped.byteLength) as ArrayBuffer;
    await writeBackupTarget(target, new Blob([buffer], { type: "application/zip" }), downloadBlob);
    setNotice(t("status.myShapesBackedUp", { count }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Adds shapes to this browser: the custom shapes of a backup ZIP (from here
   * or from "Back up all" on the start page), the designs of a ZIP without
   * any, or single .lyl designs. One already kept is skipped.
   */
  const loadMyShapeFiles = useCallback(async (files: File[]) => {
    let added = 0;
    let skipped = 0;
    const failures: string[] = [];
    const packEntry = async (entry: { name: string; bytes: Uint8Array }) => {
      const restored = await importLylProject(entry.bytes);
      if (restored.shapes.length === 0) {
        failures.push(entry.name);
        return;
      }
      const name = myShapeNameFromFile(entry.name, t("myShapes.defaultName"));
      const fingerprint = customShapeFingerprint(restored.shapes);
      if (myShapesRef.current.some((shape) => shape.name === name && shape.fingerprint === fingerprint)) {
        skipped += 1;
        return;
      }
      const meta = await keepInBrowser(await packCurrentCustomShape(restored.shapes, name, restored.assets, restored.notes ?? []), name);
      myShapesRef.current = [...myShapesRef.current, meta];
      added += 1;
    };
    for (const file of files) {
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        if (!/\.zip$/i.test(file.name)) {
          await packEntry({ name: file.name, bytes });
          continue;
        }
        const fromBackup = await restoreCustomShapesFromBackup(bytes);
        added += fromBackup.added;
        skipped += fromBackup.skipped;
        await refreshMyShapes();
        const loose = fromBackup.added + fromBackup.skipped + fromBackup.unlisted.length > 0 ? fromBackup.unlisted : unpackBackup(bytes);
        if (loose.length === 0 && fromBackup.added + fromBackup.skipped === 0) failures.push(file.name);
        for (const entry of loose) {
          try {
            await packEntry(entry);
          } catch {
            failures.push(entry.name);
          }
        }
      } catch {
        failures.push(file.name);
      }
    }
    await refreshMyShapes();
    setNotice(failures.length
      ? t("status.myShapesLoadFailed", { count: added, names: failures.join(", ") })
      : skipped
        ? t("status.myShapesLoadedSkipped", { count: added, skipped })
        : t("status.myShapesLoaded", { count: added }));
  }, [keepInBrowser, refreshMyShapes]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Every custom shape as the MCP tools report it, after asking both sides again. */
  const listCustomShapesForMcp = useCallback(async () => {
    const [browser, server] = await Promise.all([refreshMyShapes(), refreshServerShapes()]);
    return {
      serverAvailable: server !== null,
      folders: [
        ...(server?.folders ?? []).map((path) => ({ path, location: "server" })),
        ...myFoldersRef.current.map((folder) => ({ path: browserFolderPath(folder.id), location: "browser" })),
      ],
      customShapes: [
        ...(server?.shapes ?? []).map((shape) => ({ id: serverCustomShapeId(shape), name: shape.name, location: "server", folder: shape.folder, byteLength: shape.size, savedAt: new Date(shape.updatedAt).toISOString() })),
        ...browser.map((shape) => ({ id: shape.id, name: shape.name, location: "browser", folder: browserFolderPath(shape.folderId), bodyCount: shape.bodyCount, byteLength: shape.byteLength, savedAt: new Date(shape.createdAt).toISOString() })),
      ],
    };
  }, [refreshMyShapes, refreshServerShapes]);

  /**
   * The folder id for an MCP save: the folder at that path ("Brackets/M3") on
   * that side, with each missing folder on the way made. No path, no folder.
   */
  const folderIdForMcp = useCallback(async (path: string | undefined, location: CustomShapeLocation) => {
    const names = (path ?? "").split(FOLDER_PATH_SEPARATOR).map((name) => name.trim()).filter(Boolean);
    if (names.length > CUSTOM_SHAPE_FOLDER_DEPTH) throw new Error(`"${path}" is ${names.length} folders deep; folders go ${CUSTOM_SHAPE_FOLDER_DEPTH} levels deep`);
    let parentId: string | null = null;
    for (const name of names) {
      const existing = location === "server"
        ? (serverShapesRef.current?.folders ?? []).find((folder) => folder.toLowerCase() === joinFolderPath(serverFolderPath(parentId), name).toLowerCase())
        : myFoldersRef.current.find((folder) => folder.parentId === parentId && folder.name.toLowerCase() === name.toLowerCase())?.id;
      if (existing) {
        parentId = location === "server" ? serverFolderId(existing) : existing;
        continue;
      }
      if (storeFolderNameProblem(name, []) !== null) throw new Error(`"${name}" cannot be a folder name: no leading dot, no slashes, quotation marks or < > : | ? *, at most 80 characters`);
      parentId = await createShapeFolder(name, location, parentId);
    }
    return parentId;
  }, [createShapeFolder]);

  /**
   * The MCP actions on custom shapes (save, list, insert, delete); undefined
   * for any other action, which the editor then handles itself.
   */
  const runCustomShapeMcp = useCallback(async (action: string, params: Record<string, unknown>): Promise<unknown> => {
    const text = (value: unknown) => (typeof value === "string" ? value : "");
    const number = (value: unknown, fallback: number) => (typeof value === "number" && Number.isFinite(value) ? value : fallback);
    if (action === "save_custom_shape") {
      const listed = params.ids ?? params.id;
      const requested = (Array.isArray(listed) ? listed : [listed]).filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
      const ids = requested.length ? requested : selectedIdsRef.current;
      const parts = shapesRef.current.filter((shape) => ids.includes(shape.id));
      if (parts.length === 0) throw new Error("Pass the ids of the bodies to keep, or select them first");
      if (params.location !== undefined && params.location !== "browser" && params.location !== "server") throw new Error("location must be \"browser\" or \"server\"");
      const servers = await refreshServerShapes();
      if (params.location === "server" && !servers) throw new Error("This installation keeps nothing on the server; save to the browser instead");
      const location: CustomShapeLocation = params.location === "browser" || params.location === "server" ? params.location : servers ? "server" : "browser";
      const fallback = parts.length === 1 ? displayShapeName(parts[0]) : t("myShapes.defaultName");
      const name = myShapeNameFromFile(text(params.name), fallback);
      const folderId = await folderIdForMcp(text(params.folder) || undefined, location);
      return { customShape: await saveSelectionAsMyShape(name, parts.map((shape) => shape.id), location, folderId) };
    }
    if (action === "list_custom_shapes") return listCustomShapesForMcp();
    if (action !== "insert_custom_shape" && action !== "delete_custom_shape") return undefined;
    const all = (await listCustomShapesForMcp()).customShapes;
    const wanted = text(params.id) || text(params.name);
    const byId = all.filter((shape) => shape.id === wanted);
    const found = byId.length ? byId : all.filter((shape) => shape.name.toLowerCase() === wanted.toLowerCase());
    if (found.length === 0) throw new Error(`No custom shape "${wanted}"; layerling_list_custom_shapes lists them`);
    if (found.length > 1) throw new Error(`Several custom shapes are called "${wanted}"; pass the id instead`);
    const entry = found[0];
    if (action === "delete_custom_shape") {
      await deleteMyShapeEntry(entry.id);
      return { deleted: entry.id };
    }
    const point = params.x !== undefined || params.z !== undefined
      ? { x: number(params.x, 0), y: placementWorkplaneRef.current.origin.y, z: number(params.z, 0) }
      : undefined;
    const inserted = await insertMyShape(entry.id, point);
    return { objects: inserted.map(mcpShapeSummary) };
  }, [deleteMyShapeEntry, folderIdForMcp, insertMyShape, listCustomShapesForMcp, refreshServerShapes, saveSelectionAsMyShape]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    customShapeEntries,
    customShapeFolders,
    serverAvailable: serverShapes !== null,
    myShapesFileInputRef,
    refreshMyShapes,
    refreshServerShapes,
    saveSelectionAsMyShape,
    insertMyShape,
    insertDesignFile,
    renameMyShapeEntry,
    deleteMyShapeEntry,
    moveMyShapeToServer,
    moveMyShapeToFolder,
    createShapeFolder,
    renameShapeFolder,
    deleteShapeFolder,
    backUpMyShapes,
    loadMyShapeFiles,
    runCustomShapeMcp,
  };
}
