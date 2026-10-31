"use client";

import { GuideHelpLink } from "@/components/GuideHelpLink";
import { useMemo, useState, useRef, useEffect, type KeyboardEvent, type MouseEvent, type ReactElement } from "react";
import { ArrowDownAZ, ChevronDown, ChevronRight, ChevronUp, Eye, EyeOff, FolderOpen, ListTree, Lock, Pencil, Search, Unlock, X } from "lucide-react";
import { ToolbarBundleIcon, ToolbarGroupIcon } from "@/components/toolbarIcons";
import { useLanguage } from "@/lib/useLanguage";
import { useMovablePanel, type MovablePanelOptions } from "@/lib/useMovablePanel";
import { getLanguage, t, type MessageKey } from "@/lib/i18n";
import { displayShapeName, hasOwnShapeName } from "@/lib/shapeCatalog";
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
  onToggleHidden: (id: string) => void;
  onRenameShape?: (id: string, name: string) => void;
  /** Starts editing a group, so its parts can be changed one by one. */
  onOpenGroup?: (id: string) => void;
  /** The loose parts of the innermost group being edited; only groups among them can be edited next. */
  openGroupPartIds?: string[];
  onClose: () => void;
}

const COLLAPSED_STORAGE_KEY = "layerling.editor.objectListCollapsed";
const ORDER_STORAGE_KEY = "layerling.editor.objectListOrder";

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
  onToggleHidden,
  onRenameShape,
  onOpenGroup,
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

  // Remembered in this browser, like the panel's position; read after mounting so the first render matches the server's.
  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === "true");
      const storedOrder = window.localStorage.getItem(ORDER_STORAGE_KEY);
      if (isObjectListOrder(storedOrder)) setOrder(storedOrder);
    } catch {
      // Blocked storage: the panel starts expanded, in the order the shapes were added.
    }
  }, []);

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

  /**
   * A group's parts; while searching, only the matches and the groups that lead to them, nested as deep as needed.
   * A group found by its own name shows all its parts, or opening it would show nothing.
   */
  const renderGroupParts = (parts: WorkplaneShape[], depth: number, showAll: boolean): ReactElement[] =>
    sortShapes(parts).flatMap((child, index) => {
      const leadsToMatch = hasMatchingPart(child);
      if (!showAll && !shapeMatches(child) && !leadsToMatch) return [];
      const childDisplayName = getShapeDisplayName(child);
      const row = (
        <li
          key={child.id || `${depth}-${index}`}
          className="outliner-child-item"
          style={depth ? { paddingLeft: depth * 14 } : undefined}
        >
          <span
            className={`outliner-swatch small ${child.hole ? "swatch-hole" : ""}`}
            style={{ backgroundColor: child.hole ? undefined : child.color }}
          />
          <span className="outliner-child-name" title={childDisplayName}>
            {childDisplayName}
          </span>
          <span className={`outliner-badge small ${child.hole ? "badge-hole" : "badge-solid"}`}>
            {child.hole ? t("outliner.hole") : t("outliner.solid")}
          </span>
        </li>
      );
      return leadsToMatch && child.groupedShapes ? [row, ...renderGroupParts(child.groupedShapes, depth + 1, false)] : [row];
    });

  return (
    <div
      ref={movable.panelRef}
      className={`outliner-panel ${movable.dragging ? "moving" : ""} ${collapsed ? "collapsed" : ""}`}
      style={movable.style}
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
            <ul className="outliner-list" role="listbox" aria-multiselectable="true">
              {listedShapes.map((shape) => {
                const isSelected = selectedSet.has(shape.id);
                const isGroup = Boolean(shape.groupedShapes && shape.groupedShapes.length > 0);
                // A search that finds parts inside a group opens it to show them.
                const isExpanded = query
                  ? (searchExpandedGroups[shape.id] ?? hasMatchingPart(shape))
                  : Boolean(expandedGroups[shape.id]);
                const displayName = getShapeDisplayName(shape);
                const subtitle = getShapeKindSubtitle(shape);

                return (
                  <li
                    key={shape.id}
                    className={`outliner-item ${isSelected ? "selected" : ""} ${shape.hidden ? "hidden-shape" : ""} ${shape.locked ? "locked-shape" : ""} ${openParts.has(shape.id) ? "open-group-part" : ""}`}
                    role="option"
                    aria-selected={isSelected}
                    onMouseDown={(e) => {
                      // Shift-click would otherwise highlight text across the rows.
                      if (e.shiftKey && !(e.target instanceof HTMLInputElement)) e.preventDefault();
                    }}
                    onClick={(e) => handleRowClick(shape.id, e)}
                  >
                    <div className="outliner-row-main">
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
                        <span className={`outliner-badge ${shape.hole ? "badge-hole" : "badge-solid"}`}>
                          {shape.hole ? t("outliner.hole") : t("outliner.solid")}
                        </span>
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
                        {renderGroupParts(shape.groupedShapes, 0, !query || shapeMatches(shape))}
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
