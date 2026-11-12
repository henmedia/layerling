"use client";

import { GuideHelpLink } from "@/components/GuideHelpLink";
import { useMemo, useState, useRef, useEffect, type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactElement } from "react";
import { ArrowDownAZ, ChevronDown, ChevronRight, ChevronUp, Eye, EyeOff, FolderOpen, GripVertical, ListTree, Lock, Pencil, Search, Shield, ShieldCheck, Unlock, X } from "lucide-react";
import { ToolbarBundleIcon, ToolbarGroupIcon } from "@/components/toolbarIcons";
import { useLanguage } from "@/lib/useLanguage";
import { useMovablePanel, type MovablePanelOptions } from "@/lib/useMovablePanel";
import { getLanguage, t, type MessageKey } from "@/lib/i18n";
import { displayShapeName, hasOwnShapeName } from "@/lib/shapeCatalog";
import { stepSourceForShape } from "@/lib/stepExport";
import {
  hasMatchingPart as partMatchesSearch,
  isObjectListOrder,
  normalizeObjectListQuery,
  shapeMatchesSearch,
  showInObjectList,
  sortObjectList,
  type ObjectListOrder,
} from "@/lib/objectListSearch";
import type { WorkplaneShape } from "@/types/layerling";

export interface ObjectListPanelProps {
  /** Schlaeft: nichts darin laesst sich anklicken oder per Tastatur erreichen (Verlaufsblick). */
  inert?: boolean;
  shapes: WorkplaneShape[];
  selectedIds: string[];
  onSelectShape: (id: string | string[], mode?: "replace" | "toggle") => void;
  onToggleLock: (id: string) => void;
  /** Puts the shape lock on a part or takes it off with the shield in its row (#1277). */
  onToggleShapeLock?: (id: string) => void;
  onToggleHidden: (id: string) => void;
  onRenameShape?: (id: string, name: string) => void;
  /** Starts editing a group, so its parts can be changed one by one. */
  onOpenGroup?: (id: string) => void;
  /** Opens the group and selects this one of its parts (Discussion #1316): a click on a part in the expanded list. */
  onOpenGroupPart?: (groupId: string, partId: string) => void;
  /** Moves a shape in front of another one, or to the end when `beforeId` is null (#1233). */
  onMoveShape?: (id: string, beforeId: string | null) => void;
  /** Puts loose shapes into a group, dropped on it while it is expanded (Discussion #1338). */
  onAddToGroup?: (shapeIds: string[], groupId: string, joinPreviousStep?: boolean) => Promise<unknown> | void;
  /** Takes a part out of an expanded group, in front of `beforeId` (null: last); `partIds` names it loose (#1338). */
  onTakeOutOfGroup?: (groupId: string, partId: string, beforeId: string | null) => Promise<{ ok: boolean; partIds?: string[] }>;
  /** The loose parts of the innermost group being edited; only groups among them can be edited next. */
  openGroupPartIds?: string[];
  onClose: () => void;
}

/** Where a dragged row would land: in front of a shape (null: last), or into an expanded group. */
type DropTarget = { before: string | null } | { into: string };

const COLLAPSED_STORAGE_KEY = "layerling.editor.objectListCollapsed";
const ORDER_STORAGE_KEY = "layerling.editor.objectListOrder";

const WIDTH_STORAGE_KEY = "layerling.editor.objectListWidth";
/** The width the panel can be dragged to at its lower right corner (Discussion #1636); min-width in globals.css. */
const MIN_PANEL_WIDTH = 240;
const MAX_PANEL_WIDTH = 600;

/**
 * Solid or hole as one letter, the first of the word, with the word as its tooltip (Discussion #1636): the
 * whole word took the room the name needed. The first letters differ in every language.
 */
function SolidHoleBadge({ hole, small = false }: { hole: boolean; small?: boolean }) {
  const word = hole ? t("outliner.hole") : t("outliner.solid");
  return (
    <span className={`outliner-badge ${small ? "small" : ""} ${hole ? "badge-hole" : "badge-solid"}`} title={word} aria-label={word}>
      {Array.from(word)[0]?.toLocaleUpperCase(getLanguage())}
    </span>
  );
}

/** Docked just right of the view cube - where .outliner-panel puts it in globals.css. */
const OBJECT_LIST_PANEL: MovablePanelOptions = {
  dockedAt: () => ({ left: 104, top: 64 }),
};

export function ObjectListPanel({
  inert = false,
  shapes,
  selectedIds,
  onSelectShape,
  onToggleLock,
  onToggleShapeLock,
  onToggleHidden,
  onRenameShape,
  onOpenGroup,
  onOpenGroupPart,
  onMoveShape,
  onAddToGroup,
  onTakeOutOfGroup,
  openGroupPartIds,
  onClose,
}: ObjectListPanelProps) {
  const openParts = useMemo(() => new Set(openGroupPartIds ?? []), [openGroupPartIds]);
  useLanguage();
  const [filterText, setFilterText] = useState("");
  const query = normalizeObjectListQuery(filterText);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  // Groups opened or closed by hand during a search; each new search starts from the groups its matches open.
  const [searchExpandedGroups, setSearchExpandedGroups] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);
  const movable = useMovablePanel("layerling.editor.objectListPosition", OBJECT_LIST_PANEL);
  const [collapsed, setCollapsed] = useState(false);
  const [order, setOrder] = useState<ObjectListOrder>("added");
  /** The width dragged at the lower right corner (Discussion #1636); null keeps the 300 px of globals.css. */
  const [width, setWidth] = useState<number | null>(null);
  const widthRef = useRef(width);
  widthRef.current = width;

  // Remembered in this browser, like the panel's position; read after mounting so the first render matches the server's.
  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === "true");
      const storedOrder = window.localStorage.getItem(ORDER_STORAGE_KEY);
      if (isObjectListOrder(storedOrder)) setOrder(storedOrder);
      const storedWidth = Number(window.localStorage.getItem(WIDTH_STORAGE_KEY));
      if (storedWidth >= MIN_PANEL_WIDTH && storedWidth <= MAX_PANEL_WIDTH) setWidth(Math.round(storedWidth));
    } catch {
      // Blocked storage: the panel starts expanded, in the order the shapes were added.
    }
  }, []);

  // The browser's own resize grip writes the new width into the panel's style; keep it from there. A window too
  // narrow for it only squeezes the panel (max-width) and leaves the wish as it was.
  useEffect(() => {
    const panel = movable.panelRef.current;
    if (!panel || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      const dragged = Number.parseFloat(panel.style.width);
      if (!Number.isFinite(dragged)) return;
      const next = Math.round(Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, dragged)));
      if (next === widthRef.current) return;
      setWidth(next);
      try {
        window.localStorage.setItem(WIDTH_STORAGE_KEY, String(next));
      } catch {
        // Blocked storage: the width holds until the panel closes.
      }
    });
    observer.observe(panel);
    return () => observer.disconnect();
  }, [movable.panelRef]);

  const toggleOrder = () => {
    const next: ObjectListOrder = order === "name" ? "added" : "name";
    setOrder(next);
    try {
      window.localStorage.setItem(ORDER_STORAGE_KEY, next);
    } catch {
      // Blocked storage: the choice holds until the panel closes.
    }
  };

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      window.localStorage.setItem(COLLAPSED_STORAGE_KEY, String(next));
    } catch {
      // Blocked storage: the choice holds until the panel closes.
    }
  };

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const toggleGroupExpand = (groupId: string, isExpanded: boolean, e: MouseEvent) => {
    e.stopPropagation();
    (query ? setSearchExpandedGroups : setExpandedGroups)((prev) => ({
      ...prev,
      [groupId]: !isExpanded,
    }));
  };

  const getShapeDisplayName = (shape: WorkplaneShape): string => {
    if (shape.name?.trim()) return displayShapeName(shape);
    if (shape.groupedShapes?.length) return t("shape.group");
    if (shape.importedMesh) return t("shape.importedMesh");
    const key = `shape.${shape.kind}` as MessageKey;
    const translated = t(key);
    return translated || shape.kind;
  };

  const getShapeKindSubtitle = (shape: WorkplaneShape): string => {
    if (shape.groupedShapes?.length) {
      // Says which it is even after a rename: a group (merged) or a bundle (parts stay what they are).
      const kindName = t(shape.groupOperation === "bundle" ? "shape.bundle" : "shape.group");
      return `${kindName} · ${t("outliner.children", { count: shape.groupedShapes.length })}`;
    }
    // A rounded, hollowed or imported body says whether the STEP export can write it exactly (#1237).
    if (shape.kind === "mesh") return t(stepSourceForShape(shape) === "unsupported" ? "shape.mesh" : "shape.exactBody");
    const key = `shape.${shape.kind}` as MessageKey;
    const translated = t(key);
    return translated || shape.kind;
  };

  const startRename = (shape: WorkplaneShape, e: MouseEvent) => {
    e.stopPropagation();
    setEditingId(shape.id);
    setEditingDraft(getShapeDisplayName(shape));
  };

  const commitRename = () => {
    const shape = editingId ? shapes.find((candidate) => candidate.id === editingId) : undefined;
    const trimmed = editingDraft.trim();
    if (shape && onRenameShape && trimmed !== getShapeDisplayName(shape)) {
      onRenameShape(shape.id, trimmed);
    }
    setEditingId(null);
  };

  const handleEditKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitRename();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setEditingId(null);
    }
  };

  const handleRowClick = (shapeId: string, e: MouseEvent) => {
    if (e.shiftKey) {
      onSelectShape(shapeId, "toggle");
    } else {
      onSelectShape(shapeId, "replace");
    }
  };

  useEffect(() => setSearchExpandedGroups({}), [query]);

  const searchLabels = (shape: WorkplaneShape) => [getShapeDisplayName(shape), getShapeKindSubtitle(shape)];
  const shapeMatches = (shape: WorkplaneShape) => shapeMatchesSearch(shape, query, searchLabels);
  const hasMatchingPart = (shape: WorkplaneShape) => partMatchesSearch(shape, query, searchLabels);

  const filteredShapes = useMemo(() => {
    if (!query) return shapes;
    return shapes.filter((shape) => showInObjectList(shape, query, searchLabels));
  }, [shapes, query]);

  // Sorted on every render, as the shown names follow the interface language.
  const sortShapes = (list: WorkplaneShape[]) => sortObjectList(list, order, hasOwnShapeName, getShapeDisplayName, getLanguage());
  const listedShapes = sortShapes(filteredShapes);

  // The handle on each row puts a shape elsewhere in the design's own order; a sorted or filtered list has no such order to change.
  const canReorder = Boolean(onMoveShape) && order === "added" && !query && listedShapes.length > 1;
  const [draggedId, setDraggedId] = useState<string | null>(null);
  // The group a dragged part comes from: dropped back on it, it stays where it is.
  const [draggedFrom, setDraggedFrom] = useState<string | undefined>(undefined);
  // Where the dragged one would go: in front of a shape (null is the end of the list) or into an expanded group.
  const [dropTarget, setDropTarget] = useState<DropTarget | undefined>(undefined);
  const dropBeforeId = dropTarget && "before" in dropTarget ? dropTarget.before : undefined;
  const dropIntoId = dropTarget && "into" in dropTarget ? dropTarget.into : undefined;
  // The same as a ref, so a quick press and release still finds it before the next render; `fromGroup` for a group's part.
  const draggedRef = useRef<{ id: string; fromGroup?: string } | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  /**
   * The upper half of a row's own line puts the dragged shape in front of it; below that, an expanded group
   * takes it in, down to its last part (Discussion #1338).
   */
  const dropTargetAt = (clientY: number): DropTarget => {
    const rows = Array.from(listRef.current?.querySelectorAll<HTMLElement>(":scope > li[data-shape-id]") ?? []);
    for (const row of rows) {
      const line = (row.querySelector<HTMLElement>(":scope > .outliner-row-main") ?? row).getBoundingClientRect();
      if (clientY < line.top + line.height / 2) return { before: row.dataset.shapeId ?? null };
      if (row.dataset.takesParts && clientY < row.getBoundingClientRect().bottom) return { into: row.dataset.shapeId ?? "" };
    }
    return { before: null };
  };

  const startDrag = (id: string, e: PointerEvent<HTMLElement>, fromGroup?: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    draggedRef.current = { id, fromGroup };
    setDraggedId(id);
    setDraggedFrom(fromGroup);
    setDropTarget(undefined);
  };

  const moveDrag = (e: PointerEvent<HTMLElement>) => {
    if (draggedRef.current) setDropTarget(dropTargetAt(e.clientY));
  };

  const endDrag = (e: PointerEvent<HTMLElement>, drop: boolean) => {
    const dragged = draggedRef.current;
    draggedRef.current = null;
    setDraggedId(null);
    setDraggedFrom(undefined);
    setDropTarget(undefined);
    if (!dragged || !drop) return;
    const target = dropTargetAt(e.clientY);
    const { id, fromGroup } = dragged;
    if (!fromGroup) {
      if ("into" in target) {
        if (target.into !== id) void onAddToGroup?.([id], target.into);
      } else {
        onMoveShape?.(id, target.before);
      }
      return;
    }
    // A part dropped back on its own group stays in it.
    if ("into" in target && target.into === fromGroup) return;
    if (!onTakeOutOfGroup) return;
    if ("before" in target) {
      void onTakeOutOfGroup(fromGroup, id, target.before);
      return;
    }
    // Onto another expanded group: out of the one, into the other.
    const into = target.into;
    void onTakeOutOfGroup(fromGroup, id, into).then((outcome) => {
      const loose = outcome.ok ? outcome.partIds?.[0] : undefined;
      // One step to undo for the whole move.
      if (loose) return onAddToGroup?.([loose], into, true);
    });
  };

  /**
   * Arrow keys on a focused handle move the shape one place. They stay with the handle: the editor
   * would otherwise move the selected part or turn the view at the same time (#1277).
   */
  const handleKeyDown = (id: string, e: KeyboardEvent<HTMLElement>) => {
    if (e.key.startsWith("Arrow")) e.stopPropagation();
    const index = listedShapes.findIndex((shape) => shape.id === id);
    if (e.key === "ArrowUp" && index > 0) {
      e.preventDefault();
      onMoveShape?.(id, listedShapes[index - 1].id);
    } else if (e.key === "ArrowDown" && index >= 0 && index < listedShapes.length - 1) {
      e.preventDefault();
      onMoveShape?.(id, listedShapes[index + 2]?.id ?? null);
    }
  };

  /**
   * A group's parts; while searching, only the matches and the groups that lead to them, nested as deep as needed.
   * A group found by its own name shows all its parts, or opening it would show nothing.
   */
  const renderGroupParts = (parts: WorkplaneShape[], depth: number, showAll: boolean, group?: WorkplaneShape): ReactElement[] =>
    sortShapes(parts).flatMap((child, index) => {
      const leadsToMatch = hasMatchingPart(child);
      if (!showAll && !shapeMatches(child) && !leadsToMatch) return [];
      const childDisplayName = getShapeDisplayName(child);
      // A part of a group in the list opens the group with that part selected (Discussion #1316); Done puts it back.
      const openPart = group && onOpenGroupPart && child.id ? () => onOpenGroupPart(group.id, child.id) : undefined;
      const openTitle = group ? t(group.groupOperation === "bundle" ? "group.editBundle" : "group.edit") : undefined;
      // A part of an editable group has a handle too: dragged out, it lies loose again (Discussion #1338).
      const canTakeOut = Boolean(group && order === "added" && !query && onTakeOutOfGroup && child.id && !depth && !openParts.size && !group.shapeLocked);
      const row = (
        <li
          key={child.id || `${depth}-${index}`}
          className={`outliner-child-item ${openPart ? "opens-group" : ""} ${draggedId && draggedId === child.id ? "dragging" : ""}`}
          style={depth ? { paddingLeft: depth * 14 } : undefined}
          {...(openPart ? {
            role: "button",
            tabIndex: 0,
            title: openTitle,
            "data-testid": "outliner-group-part",
            onClick: (event: MouseEvent) => { event.stopPropagation(); openPart(); },
            onKeyDown: (event: KeyboardEvent) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              event.stopPropagation();
              openPart();
            },
          } : {})}
        >
          {canTakeOut && group ? (
            <button
              type="button"
              className="outliner-drag-handle"
              title={t("outliner.takeOutOfGroup")}
              aria-label={t("outliner.takeOutOfGroup")}
              data-testid="outliner-part-handle"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => startDrag(child.id, e, group.id)}
              onPointerMove={moveDrag}
              onPointerUp={(e) => endDrag(e, true)}
              onPointerCancel={(e) => endDrag(e, false)}
            >
              <GripVertical size={12} />
            </button>
          ) : null}
          <span
            className={`outliner-swatch small ${child.hole ? "swatch-hole" : ""}`}
            style={{ backgroundColor: child.hole ? undefined : child.color }}
          />
          <span className="outliner-child-name" title={childDisplayName}>
            {childDisplayName}
          </span>
          <SolidHoleBadge hole={Boolean(child.hole)} small />
        </li>
      );
      return leadsToMatch && child.groupedShapes ? [row, ...renderGroupParts(child.groupedShapes, depth + 1, false)] : [row];
    });

  return (
    <div
      ref={movable.panelRef}
      className={`outliner-panel ${movable.dragging ? "moving" : ""} ${collapsed ? "collapsed" : ""}`}
      style={width === null ? movable.style : { ...movable.style, width }}
      inert={inert}
      role="region"
      aria-label={t("outliner.title")}
      data-help-section-all="objectList"
    >
      <header className="outliner-header" title={t("outliner.moveHint")} {...movable.handleProps}>
        <div className="outliner-title-wrap">
          <button
            className="outliner-close-button outliner-collapse-button"
            type="button"
            aria-label={collapsed ? t("outliner.expandPanel") : t("outliner.collapsePanel")}
            title={collapsed ? t("outliner.expandPanel") : t("outliner.collapsePanel")}
            aria-expanded={!collapsed}
            onClick={toggleCollapsed}
          >
            {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
          <ListTree size={16} aria-hidden="true" className="outliner-header-icon" />
          <strong>{t("outliner.title")}</strong>
          <span className="outliner-count-badge">{shapes.length}</span>
        </div>
        <div className="outliner-header-actions">
          {collapsed ? null : (
            <button
              className={`outliner-close-button outliner-sort-button ${order === "name" ? "active" : ""}`}
              type="button"
              aria-pressed={order === "name"}
              aria-label={t(order === "name" ? "outliner.sortAsAdded" : "outliner.sortByName")}
              title={t(order === "name" ? "outliner.sortAsAdded" : "outliner.sortByName")}
              onClick={toggleOrder}
            >
              <ArrowDownAZ size={16} />
            </button>
          )}
          <GuideHelpLink section="objectList" className="outliner-help-link" />
          <button
            className="outliner-close-button"
            type="button"
            aria-label={t("panel.close", { title: t("outliner.title") })}
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>
      </header>

      {!collapsed && shapes.length > 4 ? (
        <div className="outliner-search-wrap">
          <Search size={14} className="outliner-search-icon" aria-hidden="true" />
          <input
            className="outliner-search-input"
            type="text"
            placeholder={t("outliner.search")}
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
          {filterText ? (
            <button
              className="outliner-search-clear"
              type="button"
              onClick={() => setFilterText("")}
              aria-label={t("outliner.clearSearch")}
            >
              <X size={12} />
            </button>
          ) : null}
        </div>
      ) : null}

      {collapsed ? null : (
        <div className="outliner-list-wrap">
          {listedShapes.length === 0 ? (
            <div className="outliner-empty-state">
              <span>{filterText ? t("outliner.noMatches") : t("outliner.empty")}</span>
            </div>
          ) : (
            <ul ref={listRef} className="outliner-list" role="listbox" aria-multiselectable="true">
              {listedShapes.map((shape) => {
                const isSelected = selectedSet.has(shape.id);
                const isGroup = Boolean(shape.groupedShapes && shape.groupedShapes.length > 0);
                // A search that finds parts inside a group opens it to show them.
                const isExpanded = query
                  ? (searchExpandedGroups[shape.id] ?? hasMatchingPart(shape))
                  : Boolean(expandedGroups[shape.id]);
                const displayName = getShapeDisplayName(shape);
                const subtitle = getShapeKindSubtitle(shape);
                // An expanded group takes in a shape dropped on its parts (Discussion #1338); a collapsed one is only a place in the order.
                const takesParts = isGroup && isExpanded && canReorder && Boolean(onAddToGroup) && !openParts.size && !shape.locked && !shape.shapeLocked;

                return (
                  <li
                    key={shape.id}
                    data-shape-id={shape.id}
                    data-takes-parts={takesParts ? "true" : undefined}
                    className={`outliner-item ${draggedId === shape.id ? "dragging" : ""} ${draggedId && dropIntoId === shape.id && draggedId !== shape.id && draggedFrom !== shape.id ? "drop-into" : ""} ${draggedId && dropBeforeId === shape.id ? "drop-before" : ""} ${draggedId && dropBeforeId === null && shape.id === listedShapes[listedShapes.length - 1].id ? "drop-after" : ""} ${isSelected ? "selected" : ""} ${shape.hidden ? "hidden-shape" : ""} ${shape.locked ? "locked-shape" : ""} ${openParts.has(shape.id) ? "open-group-part" : ""}`}
                    role="option"
                    aria-selected={isSelected}
                    onMouseDown={(e) => {
                      // Shift-click would otherwise highlight text across the rows.
                      if (e.shiftKey && !(e.target instanceof HTMLInputElement)) e.preventDefault();
                    }}
                    onClick={(e) => handleRowClick(shape.id, e)}
                  >
                    <div className="outliner-row-main">
                      {canReorder ? (
                        <button
                          type="button"
                          className="outliner-drag-handle"
                          title={t("outliner.moveShape")}
                          aria-label={t("outliner.moveShape")}
                          onClick={(e) => e.stopPropagation()}
                          onPointerDown={(e) => startDrag(shape.id, e)}
                          onPointerMove={moveDrag}
                          onPointerUp={(e) => endDrag(e, true)}
                          onPointerCancel={(e) => endDrag(e, false)}
                          onKeyDown={(e) => handleKeyDown(shape.id, e)}
                        >
                          <GripVertical size={14} />
                        </button>
                      ) : null}
                      {isGroup ? (
                        <button
                          type="button"
                          className="outliner-expand-toggle"
                          onClick={(e) => toggleGroupExpand(shape.id, isExpanded, e)}
                          aria-label={isExpanded ? t("outliner.collapse") : t("outliner.expand")}
                        >
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      ) : (
                        <span className="outliner-expand-spacer" />
                      )}

                      <span
                        className={`outliner-swatch ${shape.hole ? "swatch-hole" : ""}`}
                        style={{ backgroundColor: shape.hole ? undefined : shape.color }}
                        title={shape.hole ? t("outliner.hole") : t("outliner.solid")}
                      />

                      <div className="outliner-info">
                        {editingId === shape.id ? (
                          <input
                            ref={editInputRef}
                            className="outliner-rename-input"
                            value={editingDraft}
                            onChange={(e) => setEditingDraft(e.target.value)}
                            onBlur={commitRename}
                            onKeyDown={handleEditKeyDown}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <div className="outliner-label-group" onDoubleClick={(e) => startRename(shape, e)}>
                            <span className="outliner-shape-name" title={displayName}>
                              {isGroup ? (
                                // The marks of the toolbar buttons that made it, so the list and the ribbon agree.
                                shape.groupOperation === "bundle"
                                  ? <ToolbarBundleIcon className="outliner-kind-icon" />
                                  : <ToolbarGroupIcon className="outliner-kind-icon" />
                              ) : null}
                              {displayName}
                            </span>
                            <span className="outliner-shape-kind">{subtitle}</span>
                          </div>
                        )}
                      </div>

                      <div className="outliner-badges">
                        <SolidHoleBadge hole={Boolean(shape.hole)} />
                      </div>

                      <div className="outliner-row-actions">
                        {isGroup && onOpenGroup && (!openParts.size || openParts.has(shape.id)) ? (
                          <button
                            type="button"
                            className="outliner-action-btn open-group-btn"
                            title={t(shape.groupOperation === "bundle" ? "group.editBundle" : "group.edit")}
                            aria-label={t(shape.groupOperation === "bundle" ? "group.editBundle" : "group.edit")}
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenGroup(shape.id);
                            }}
                          >
                            <FolderOpen size={13} />
                          </button>
                        ) : null}
                        {onRenameShape && editingId !== shape.id ? (
                          <button
                            type="button"
                            className="outliner-action-btn rename-btn"
                            title={t("outliner.rename")}
                            aria-label={t("outliner.rename")}
                            onClick={(e) => startRename(shape, e)}
                          >
                            <Pencil size={13} />
                          </button>
                        ) : null}
                        {shape.shapeLocked || onToggleShapeLock ? (
                          // The shield locks the shape and unlocks it, as in the settings (#1277). A locked shape always
                          // shows it; the open one only on the selected row and under the mouse, so the list stays narrow.
                          <button
                            type="button"
                            className={`outliner-action-btn ${shape.shapeLocked ? "active-locked" : "shape-lock-btn"}`}
                            title={shape.shapeLocked ? t("contextMenu.unlockShape") : t("contextMenu.lockShapeHint")}
                            aria-label={shape.shapeLocked ? t("contextMenu.unlockShape") : t("contextMenu.lockShape")}
                            aria-pressed={Boolean(shape.shapeLocked)}
                            data-testid="outliner-shape-lock"
                            disabled={!onToggleShapeLock}
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleShapeLock?.(shape.id);
                            }}
                          >
                            {shape.shapeLocked ? <ShieldCheck size={14} /> : <Shield size={14} />}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className={`outliner-action-btn ${shape.locked ? "active-locked" : ""}`}
                          title={shape.locked ? t("outliner.unlock") : t("outliner.lock")}
                          aria-label={shape.locked ? t("outliner.unlock") : t("outliner.lock")}
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleLock(shape.id);
                          }}
                        >
                          {shape.locked ? <Lock size={14} /> : <Unlock size={14} />}
                        </button>
                        <button
                          type="button"
                          className={`outliner-action-btn ${shape.hidden ? "active-hidden" : ""}`}
                          title={shape.hidden ? t("outliner.show") : t("outliner.hide")}
                          aria-label={shape.hidden ? t("outliner.show") : t("outliner.hide")}
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleHidden(shape.id);
                          }}
                        >
                          {shape.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>

                    {isGroup && isExpanded && shape.groupedShapes ? (
                      <ul className="outliner-children-list">
                        {renderGroupParts(shape.groupedShapes, 0, !query || shapeMatches(shape), (!openParts.size || openParts.has(shape.id)) && !shape.locked ? shape : undefined)}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
