"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Check, ChevronDown, ChevronRight, CloudUpload, Download, Folder, FolderInput, FolderPlus, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import { GuideHelpLink } from "@/components/GuideHelpLink";
import { t } from "@/lib/i18n";
import { canHoldSubfolder, folderChildren, folderDescendantIds, folderLabel, foldersInTreeOrder } from "@/lib/customShapeFolders";
import { cleanMyShapeName, MY_SHAPE_NAME_MAX } from "@/lib/myShapes";
import { STORE_FOLDER_NAME_LIMIT, storeFolderNameProblem } from "@/lib/storeFolderName";

const COLLAPSED_STORAGE_KEY = "layerling.myShapesCollapsed";
const OPEN_FOLDERS_STORAGE_KEY = "layerling.myShapesOpenFolders";

export type CustomShapeLocation = "browser" | "server";
export type CustomShapeEntry = { id: string; name: string; thumbnail: string; location: CustomShapeLocation; folderId: string | null };
/** `parentId` is the folder it sits in, on the same side; null at the top. */
export type CustomShapeFolder = { id: string; name: string; location: CustomShapeLocation; parentId: string | null };

export interface MyShapesSectionProps {
  shapes: CustomShapeEntry[];
  folders: CustomShapeFolder[];
  /** True where the shared store is on; then shapes can go to the server too. */
  serverAvailable: boolean;
  canSave: boolean;
  defaultName: string;
  onInsert: (id: string) => void;
  onSave: (name: string, location: CustomShapeLocation, folderId: string | null) => Promise<boolean>;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onMoveToServer: (id: string) => void;
  onMoveToFolder: (id: string, folderId: string | null) => void;
  /** A folder at the top or inside `parentId`; resolves to its id, or null when it could not be made. */
  onCreateFolder: (name: string, location: CustomShapeLocation, parentId: string | null) => Promise<string | null>;
  /** Resolves to the folder's id after the rename (a server folder's changes with its name), or null when it failed. */
  onRenameFolder: (id: string, name: string) => Promise<string | null>;
  /** Deletes the folder with the folders and shapes in it. */
  onDeleteFolder: (id: string) => void;
  onBackup: () => void;
  onLoad: () => void;
  /** Asks the server again when the menu opens: another device may have added shapes. */
  onShown: () => void;
  /** The menu closes once a tile was dragged out onto the workplane. */
  onDragDone: () => void;
}

/** The message for a folder name that cannot be used, or "" when it can (or is still empty). */
function folderProblemMessage(name: string, taken: string[]) {
  const problem = storeFolderNameProblem(name, taken);
  return problem === "start"
    ? t("shared.folderNameBadStart")
    : problem === "chars"
      ? t("shared.folderNameBadChars")
      : problem === "taken"
        ? t("shared.folderNameTaken")
        : "";
}

/**
 * Custom shapes on top of the shape library (#109): a fold-away row of the
 * bodies someone kept, in this browser and - with the shared store on - on
 * the server, each tile inserted with a click or dragged onto the workplane.
 * Each side can sort its shapes into folders, up to three levels deep.
 */
export function MyShapesSection(props: MyShapesSectionProps) {
  const { shapes, folders, serverAvailable, canSave, defaultName, onInsert, onSave, onRename, onDelete, onMoveToServer, onMoveToFolder } = props;
  const { onCreateFolder, onRenameFolder, onDeleteFolder, onBackup, onLoad, onShown, onDragDone } = props;
  // Folded or open as last chosen; never chosen, it is folded while it holds nothing (#1170): then it is one line with
  // its buttons, and the explanation shows on opening it or behind the question mark.
  const [choice, setCollapsed] = useState<boolean | null>(null);
  const empty = shapes.length === 0 && folders.length === 0;
  const collapsed = choice ?? empty;
  const [openFolders, setOpenFolders] = useState<string[]>([]);
  const [saveName, setSaveName] = useState<string | null>(null);
  const [saveLocation, setSaveLocation] = useState<CustomShapeLocation>(serverAvailable ? "server" : "browser");
  const [saveFolder, setSaveFolder] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [newFolder, setNewFolder] = useState<{ name: string; location: CustomShapeLocation; parentId: string | null } | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [renamingFolder, setRenamingFolder] = useState<{ id: string; name: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [moving, setMoving] = useState<string | null>(null);
  const saveInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(COLLAPSED_STORAGE_KEY);
      if (stored === "true" || stored === "false") setCollapsed(stored === "true");
      const open = JSON.parse(window.localStorage.getItem(OPEN_FOLDERS_STORAGE_KEY) ?? "[]") as unknown;
      if (Array.isArray(open)) setOpenFolders(open.filter((id): id is string => typeof id === "string"));
    } catch {
      // Blocked storage: the section starts folded while it holds nothing, the folders closed.
    }
    onShown();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (saveName !== null) saveInputRef.current?.select();
  }, [saveName !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      window.localStorage.setItem(COLLAPSED_STORAGE_KEY, String(next));
    } catch {
      // Blocked storage: the choice holds until the menu closes.
    }
  };

  const setFolderOpen = (id: string, open: boolean) => {
    setOpenFolders((current) => {
      const next = open ? [...current.filter((entry) => entry !== id), id] : current.filter((entry) => entry !== id);
      try {
        window.localStorage.setItem(OPEN_FOLDERS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Blocked storage: the folder stays open until the menu closes.
      }
      return next;
    });
  };

  const foldersAt = (location: CustomShapeLocation) => folders.filter((folder) => folder.location === location);
  /** The names a folder may not take: those of the folders beside it. */
  const siblingNames = (location: CustomShapeLocation, parentId: string | null, except?: string) => foldersAt(location)
    .filter((folder) => folder.parentId === parentId && folder.id !== except)
    .map((folder) => folder.name);
  const folderOptions = (location: CustomShapeLocation) => {
    const list = foldersAt(location);
    return foldersInTreeOrder(list).map((folder) => <option key={folder.id} value={folder.id}>{folderLabel(list, folder.id)}</option>);
  };

  /** Only one form at a time: starting one ends the others. */
  const endEdits = () => {
    setSaveName(null);
    setNewFolder(null);
    setRenaming(null);
    setRenamingFolder(null);
    setConfirmDelete(null);
    setMoving(null);
  };

  const startSave = () => {
    endEdits();
    setCollapsed(false);
    setSaveLocation(serverAvailable ? "server" : "browser");
    setSaveFolder(null);
    setSaveName(defaultName);
  };

  const submitSave = async (event: FormEvent) => {
    event.preventDefault();
    if (saveName === null || saving) return;
    const location = serverAvailable ? saveLocation : "browser";
    const folderId = saveFolder && foldersAt(location).some((folder) => folder.id === saveFolder) ? saveFolder : null;
    setSaving(true);
    try {
      if (await onSave(cleanMyShapeName(saveName, defaultName), location, folderId)) {
        setSaveName(null);
        if (folderId) setFolderOpen(folderId, true);
      }
    } finally {
      setSaving(false);
    }
  };

  /** A folder at the top (side chosen in the form), or inside `parent` (on its side). */
  const startNewFolder = (parent: CustomShapeFolder | null = null) => {
    endEdits();
    setCollapsed(false);
    if (parent) setFolderOpen(parent.id, true);
    setNewFolder({ name: "", location: parent?.location ?? (serverAvailable ? "server" : "browser"), parentId: parent?.id ?? null });
  };

  const newFolderProblem = newFolder ? folderProblemMessage(newFolder.name, siblingNames(newFolder.location, newFolder.parentId)) : "";
  const submitNewFolder = async (event: FormEvent) => {
    event.preventDefault();
    if (!newFolder || saving || newFolderProblem || !newFolder.name.trim()) return;
    setSaving(true);
    try {
      const id = await onCreateFolder(newFolder.name.trim(), serverAvailable ? newFolder.location : "browser", newFolder.parentId);
      if (id) {
        setNewFolder(null);
        setFolderOpen(id, true);
      }
    } finally {
      setSaving(false);
    }
  };

  const submitRename = (event: FormEvent) => {
    event.preventDefault();
    if (!renaming) return;
    const current = shapes.find((shape) => shape.id === renaming.id);
    const name = cleanMyShapeName(renaming.name, current?.name ?? defaultName);
    if (current && name !== current.name) onRename(renaming.id, name);
    setRenaming(null);
  };

  const renamingFolderEntry = renamingFolder ? folders.find((folder) => folder.id === renamingFolder.id) ?? null : null;
  const renameFolderProblem = renamingFolder && renamingFolderEntry
    ? folderProblemMessage(renamingFolder.name, siblingNames(renamingFolderEntry.location, renamingFolderEntry.parentId, renamingFolderEntry.id))
    : "";
  const submitRenameFolder = (event: FormEvent) => {
    event.preventDefault();
    if (!renamingFolder || !renamingFolderEntry || renameFolderProblem) return;
    const name = renamingFolder.name.trim();
    setRenamingFolder(null);
    if (!name || name === renamingFolderEntry.name) return;
    const oldId = renamingFolderEntry.id;
    void onRenameFolder(oldId, name).then((id) => {
      if (!id || id === oldId) return;
      // A server folder's id is its path, so the folders below it are renamed too; the open ones stay open.
      setOpenFolders((current) => {
        const next = current.map((entry) => (entry === oldId ? id : entry.startsWith(`${oldId}/`) ? `${id}${entry.slice(oldId.length)}` : entry));
        try {
          window.localStorage.setItem(OPEN_FOLDERS_STORAGE_KEY, JSON.stringify(next));
        } catch {
          // Blocked storage: the folders stay open until the menu closes.
        }
        return next;
      });
    });
  };

  // Escape ends the edit only; the menu stays open.
  const cancelOnEscape = (event: KeyboardEvent, cancel: () => void) => {
    if (event.key !== "Escape") return;
    event.stopPropagation();
    cancel();
  };

  const renderLocationChoice = (value: CustomShapeLocation, choose: (location: CustomShapeLocation) => void) => (serverAvailable ? (
    <div className="my-shapes-location" role="radiogroup" aria-label={t("myShapes.locationLabel")}>
      {(["server", "browser"] as const).map((location) => (
        <button
          key={location}
          type="button"
          role="radio"
          aria-checked={value === location}
          className={value === location ? "active" : undefined}
          onClick={() => choose(location)}
        >
          {t(location === "server" ? "myShapes.onServer" : "myShapes.inBrowser")}
        </button>
      ))}
    </div>
  ) : null);

  const renderMovePicker = (shape: CustomShapeEntry) => (
    <>
      <select
        className="my-shape-move-select"
        aria-label={t("myShapes.moveToFolder")}
        title={t("myShapes.moveToFolder")}
        autoFocus
        value={shape.folderId ?? ""}
        onChange={(event) => {
          setMoving(null);
          const target = event.target.value || null;
          if (target !== shape.folderId) onMoveToFolder(shape.id, target);
        }}
        onKeyDown={(event) => cancelOnEscape(event, () => setMoving(null))}
      >
        <option value="">{t("myShapes.noFolder")}</option>
        {folderOptions(shape.location)}
      </select>
      <button type="button" className="my-shape-tile-action" aria-label={t("common.cancel")} title={t("common.cancel")} onClick={() => setMoving(null)}>
        <X aria-hidden="true" />
      </button>
    </>
  );

  const renderTile = (shape: CustomShapeEntry) => {
    const canMoveToServer = serverAvailable && shape.location === "browser";
    // Moving needs somewhere to go: another folder, or out of the one it is in.
    const canMove = shape.folderId !== null || foldersAt(shape.location).length > 0;
    const actionCount = 2 + (canMoveToServer ? 1 : 0) + (canMove ? 1 : 0);
    return (
      <div className="my-shape-tile" key={shape.id}>
        {renaming?.id === shape.id ? (
          <form className="my-shape-rename" onSubmit={submitRename}>
            {shape.thumbnail ? <img src={shape.thumbnail} alt="" /> : <span className="my-shape-no-preview" />}
            <input
              aria-label={t("common.rename")}
              autoFocus
              onFocus={(event) => event.currentTarget.select()}
              value={renaming.name}
              maxLength={MY_SHAPE_NAME_MAX}
              onChange={(event) => setRenaming({ id: shape.id, name: event.target.value })}
              onKeyDown={(event) => cancelOnEscape(event, () => setRenaming(null))}
            />
            <button type="submit" className="my-shape-tile-action" aria-label={t("common.save")} title={t("common.save")}>
              <Check aria-hidden="true" />
            </button>
          </form>
        ) : (
          <>
            <button
              className="shape-menu-item my-shape-item"
              type="button"
              draggable
              title={`${shape.name}: ${t("myShapes.insertHint")}`}
              aria-label={shape.name}
              onClick={() => onInsert(shape.id)}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "copy";
                event.dataTransfer.setData("application/x-layerling-my-shape", shape.id);
              }}
              onDragEnd={onDragDone}
            >
              {shape.thumbnail ? <img src={shape.thumbnail} alt="" draggable={false} /> : <span className="my-shape-no-preview" />}
              <span translate="no">{shape.name}</span>
            </button>
            <div className="my-shape-tile-actions" data-count={actionCount}>
              {moving === shape.id ? renderMovePicker(shape) : confirmDelete === shape.id ? (
                <>
                  <button
                    type="button"
                    className="my-shape-tile-action danger"
                    onClick={() => {
                      setConfirmDelete(null);
                      onDelete(shape.id);
                    }}
                  >
                    {t("myShapes.deleteConfirm")}
                  </button>
                  <button type="button" className="my-shape-tile-action" aria-label={t("common.cancel")} title={t("common.cancel")} onClick={() => setConfirmDelete(null)}>
                    <X aria-hidden="true" />
                  </button>
                </>
              ) : (
                <>
                  {canMoveToServer ? (
                    <button type="button" className="my-shape-tile-action" aria-label={t("myShapes.moveToServer")} title={t("myShapes.moveToServer")} onClick={() => onMoveToServer(shape.id)}>
                      <CloudUpload aria-hidden="true" />
                    </button>
                  ) : null}
                  {canMove ? (
                    <button
                      type="button"
                      className="my-shape-tile-action"
                      aria-label={t("myShapes.moveToFolder")}
                      title={t("myShapes.moveToFolder")}
                      onClick={() => {
                        endEdits();
                        setMoving(shape.id);
                      }}
                    >
                      <FolderInput aria-hidden="true" />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="my-shape-tile-action"
                    aria-label={t("common.rename")}
                    title={t("common.rename")}
                    onClick={() => {
                      endEdits();
                      setRenaming({ id: shape.id, name: shape.name });
                    }}
                  >
                    <Pencil aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="my-shape-tile-action"
                    aria-label={t("common.delete")}
                    title={t("common.delete")}
                    onClick={() => {
                      endEdits();
                      setConfirmDelete(shape.id);
                    }}
                  >
                    <Trash2 aria-hidden="true" />
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  /** The form for a new folder: at the top of the section, or inside the folder it goes into. */
  const renderNewFolderForm = () => (newFolder ? (
    <form className="my-shapes-name-form" onSubmit={submitNewFolder}>
      <label htmlFor="my-shape-folder-name">{t("myShapes.folderNameLabel")}</label>
      <input
        id="my-shape-folder-name"
        autoFocus
        value={newFolder.name}
        maxLength={STORE_FOLDER_NAME_LIMIT}
        aria-invalid={newFolderProblem ? true : undefined}
        aria-describedby={newFolderProblem ? "my-shape-folder-problem" : undefined}
        onChange={(event) => setNewFolder({ ...newFolder, name: event.target.value })}
        onKeyDown={(event) => cancelOnEscape(event, () => setNewFolder(null))}
      />
      {newFolder.parentId === null ? renderLocationChoice(newFolder.location, (location) => setNewFolder({ ...newFolder, location })) : null}
      <button type="submit" disabled={saving || Boolean(newFolderProblem) || !newFolder.name.trim()}>{t("myShapes.createFolder")}</button>
      <button type="button" className="secondary" onClick={() => setNewFolder(null)}>{t("common.cancel")}</button>
      {newFolderProblem ? <span className="my-shapes-form-problem" id="my-shape-folder-problem" role="status">{newFolderProblem}</span> : null}
    </form>
  ) : null);

  /** A folder row, and when open the folders and shapes inside it. `list` holds every shape on its side. */
  const renderFolder = (folder: CustomShapeFolder, list: CustomShapeEntry[]) => {
    const open = openFolders.includes(folder.id);
    const deleteKey = `folder:${folder.id}`;
    const sideFolders = foldersAt(folder.location);
    const below = folderDescendantIds(sideFolders, folder.id);
    const shapeCount = list.filter((shape) => shape.folderId !== null && below.includes(shape.folderId)).length;
    // What deleting takes along: the shapes and the folders below.
    const contents = shapeCount + below.length - 1;
    const subfolders = folderChildren(sideFolders, folder.id);
    const own = list.filter((shape) => shape.folderId === folder.id);
    return (
      <div className="my-shapes-folder" key={folder.id}>
        <div className="my-shapes-folder-header">
          {renamingFolder?.id === folder.id ? (
            <form className="my-shapes-folder-rename" onSubmit={submitRenameFolder}>
              <Folder aria-hidden="true" />
              <input
                aria-label={t("myShapes.renameFolder")}
                autoFocus
                onFocus={(event) => event.currentTarget.select()}
                value={renamingFolder.name}
                maxLength={STORE_FOLDER_NAME_LIMIT}
                aria-invalid={renameFolderProblem ? true : undefined}
                title={renameFolderProblem || undefined}
                onChange={(event) => setRenamingFolder({ id: folder.id, name: event.target.value })}
                onKeyDown={(event) => cancelOnEscape(event, () => setRenamingFolder(null))}
              />
              <button type="submit" className="my-shape-tile-action" disabled={Boolean(renameFolderProblem)} aria-label={t("common.save")} title={t("common.save")}>
                <Check aria-hidden="true" />
              </button>
            </form>
          ) : (
            <>
              <button className="my-shapes-folder-toggle" type="button" aria-expanded={open} onClick={() => setFolderOpen(folder.id, !open)}>
                {open ? <ChevronDown aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
                <Folder aria-hidden="true" />
                <span className="my-shapes-folder-name" translate="no">{folder.name}</span>
                <span className="my-shapes-count">{shapeCount}</span>
              </button>
              <div className="my-shapes-folder-actions">
                {confirmDelete === deleteKey ? (
                  <>
                    <button
                      type="button"
                      className="my-shape-tile-action danger"
                      onClick={() => {
                        setConfirmDelete(null);
                        onDeleteFolder(folder.id);
                      }}
                    >
                      {contents ? t("myShapes.deleteFolderConfirm", { count: contents }) : t("myShapes.deleteConfirm")}
                    </button>
                    <button type="button" className="my-shape-tile-action" aria-label={t("common.cancel")} title={t("common.cancel")} onClick={() => setConfirmDelete(null)}>
                      <X aria-hidden="true" />
                    </button>
                  </>
                ) : (
                  <>
                    {canHoldSubfolder(sideFolders, folder.id) ? (
                      <button
                        type="button"
                        className="my-shape-tile-action"
                        aria-label={t("myShapes.newSubfolder")}
                        title={t("myShapes.newSubfolder")}
                        onClick={() => startNewFolder(folder)}
                      >
                        <FolderPlus aria-hidden="true" />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="my-shape-tile-action"
                      aria-label={t("myShapes.renameFolder")}
                      title={t("myShapes.renameFolder")}
                      onClick={() => {
                        endEdits();
                        setRenamingFolder({ id: folder.id, name: folder.name });
                      }}
                    >
                      <Pencil aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="my-shape-tile-action"
                      aria-label={t("myShapes.deleteFolder")}
                      title={t("myShapes.deleteFolder")}
                      onClick={() => {
                        endEdits();
                        setConfirmDelete(deleteKey);
                      }}
                    >
                      <Trash2 aria-hidden="true" />
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
        {open ? (
          <div className="my-shapes-folder-body">
            {newFolder?.parentId === folder.id ? renderNewFolderForm() : null}
            {subfolders.map((child) => renderFolder(child, list))}
            {own.length ? <div className="shape-menu-list my-shapes-list">{own.map(renderTile)}</div> : null}
            {own.length === 0 && subfolders.length === 0 ? <p className="my-shapes-empty">{t("myShapes.folderEmpty")}</p> : null}
          </div>
        ) : null}
      </div>
    );
  };

  /** One side: its folders first, as in a file browser, then the shapes in no folder. */
  const renderLocation = (location: CustomShapeLocation) => {
    const list = shapes.filter((shape) => shape.location === location);
    const locationFolders = foldersAt(location);
    const loose = list.filter((shape) => shape.folderId === null);
    return (
      <>
        {folderChildren(locationFolders, null).map((folder) => renderFolder(folder, list))}
        {loose.length ? <div className="shape-menu-list my-shapes-list">{loose.map(renderTile)}</div> : null}
        {list.length === 0 && locationFolders.length === 0 ? <p className="my-shapes-empty">{t("myShapes.groupEmpty")}</p> : null}
      </>
    );
  };

  const browserShapes = shapes.filter((shape) => shape.location === "browser");
  const formLocation = serverAvailable ? saveLocation : "browser";

  return (
    <section className="my-shapes-section" aria-label={t("myShapes.title")}>
      <div className="my-shapes-header">
        <button className="my-shapes-toggle" type="button" aria-expanded={!collapsed} title={collapsed && empty ? t("myShapes.empty") : undefined} onClick={toggleCollapsed}>
          {collapsed ? <ChevronRight aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
          <span>{t("myShapes.title")}</span>
          {shapes.length > 0 ? <span className="my-shapes-count">{shapes.length}</span> : null}
        </button>
        <div className="my-shapes-actions">
          <GuideHelpLink section="myShapes" iconSize={16} />
          <button
            className="my-shapes-save-button"
            type="button"
            disabled={!canSave}
            title={canSave ? t("myShapes.saveSelectionHint") : t("myShapes.selectFirst")}
            onClick={startSave}
          >
            <Plus aria-hidden="true" />
            <span>{t("myShapes.saveSelection")}</span>
          </button>
          <button className="my-shapes-icon-button" type="button" title={t("myShapes.newFolderHint")} aria-label={t("myShapes.newFolder")} onClick={() => startNewFolder()}>
            <FolderPlus aria-hidden="true" />
          </button>
          <button className="my-shapes-icon-button" type="button" disabled={browserShapes.length === 0} title={t("myShapes.backupHint")} aria-label={t("myShapes.backup")} onClick={onBackup}>
            <Download aria-hidden="true" />
          </button>
          <button className="my-shapes-icon-button" type="button" title={t("myShapes.loadHint")} aria-label={t("myShapes.load")} onClick={onLoad}>
            <Upload aria-hidden="true" />
          </button>
        </div>
      </div>
      {!collapsed ? (
        <div className="my-shapes-body">
          {saveName !== null ? (
            <form className="my-shapes-name-form" onSubmit={submitSave}>
              <label htmlFor="my-shape-save-name">{t("myShapes.nameLabel")}</label>
              <input
                id="my-shape-save-name"
                ref={saveInputRef}
                value={saveName}
                maxLength={MY_SHAPE_NAME_MAX}
                onChange={(event) => setSaveName(event.target.value)}
                onKeyDown={(event) => cancelOnEscape(event, () => setSaveName(null))}
              />
              {renderLocationChoice(saveLocation, (location) => {
                setSaveLocation(location);
                setSaveFolder(null);
              })}
              {foldersAt(formLocation).length > 0 ? (
                <select
                  className="my-shapes-folder-select"
                  aria-label={t("myShapes.folderLabel")}
                  title={t("myShapes.folderLabel")}
                  value={saveFolder ?? ""}
                  onChange={(event) => setSaveFolder(event.target.value || null)}
                  onKeyDown={(event) => cancelOnEscape(event, () => setSaveName(null))}
                >
                  <option value="">{t("myShapes.noFolder")}</option>
                  {folderOptions(formLocation)}
                </select>
              ) : null}
              <button type="submit" disabled={saving}>{t("common.save")}</button>
              <button type="button" className="secondary" onClick={() => setSaveName(null)}>{t("common.cancel")}</button>
            </form>
          ) : null}
          {newFolder !== null && newFolder.parentId === null ? renderNewFolderForm() : null}
          {shapes.length === 0 && folders.length === 0 ? (
            <p className="my-shapes-empty">{t("myShapes.empty")}</p>
          ) : serverAvailable ? (
            <>
              <div className="my-shapes-group">
                <div className="my-shapes-group-title">{t("myShapes.onServer")}</div>
                {renderLocation("server")}
              </div>
              <div className="my-shapes-group">
                <div className="my-shapes-group-title">{t("myShapes.inBrowser")}</div>
                {renderLocation("browser")}
              </div>
            </>
          ) : (
            renderLocation("browser")
          )}
        </div>
      ) : null}
    </section>
  );
}
