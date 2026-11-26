"use client";

import { useEffect, useState } from "react";
import { BookmarkPlus, Pencil, Trash2 } from "lucide-react";
import { t } from "@/lib/i18n";
import { MAX_SELECTION_SET_NAME, MAX_SELECTION_SETS, selectionSetIds, type SelectionSet } from "@/lib/selectionSets";

/** The named selections of the design at the top of the object list (Discussion #1472). */
export function SelectionSetsSection({
  sets,
  shapes,
  selectedIds,
  renaming,
  onSave,
  onSelect,
  onRename,
  onRemove,
  onRenameStarted,
}: {
  sets: SelectionSet[];
  shapes: readonly { id: string }[];
  selectedIds: string[];
  /** A set just saved from the menu or the command search: its name opens for typing. */
  renaming?: string | null;
  onSave: () => void;
  onSelect: (name: string, add: boolean) => void;
  onRename: (name: string, next: string) => void;
  onRemove: (name: string) => void;
  onRenameStarted?: () => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const start = (name: string) => {
    setEditing(name);
    setDraft(name);
  };
  useEffect(() => {
    if (!renaming) return;
    start(renaming);
    onRenameStarted?.();
  }, [renaming, onRenameStarted]);
  const commit = () => {
    if (editing !== null && draft.trim() !== editing) onRename(editing, draft);
    setEditing(null);
  };
  if (sets.length === 0 && selectedIds.length === 0) return null;
  const full = sets.length >= MAX_SELECTION_SETS;
  return (
    <div className="outliner-sets" data-testid="selection-sets">
      {sets.map((set) => {
        const count = selectionSetIds(set, shapes).length;
        return (
          <div key={set.name} className={`outliner-set ${count === 0 ? "empty" : ""}`}>
            {editing === set.name ? (
              <input
                className="outliner-set-input"
                aria-label={t("common.rename")}
                value={draft}
                maxLength={MAX_SELECTION_SET_NAME}
                autoFocus
                onFocus={(event) => event.currentTarget.select()}
                onChange={(event) => setDraft(event.target.value)}
                onBlur={commit}
                onKeyDown={(event) => {
                  event.stopPropagation();
                  if (event.key === "Enter") commit();
                  else if (event.key === "Escape") setEditing(null);
                }}
              />
            ) : (
              <button
                type="button"
                className="outliner-set-name"
                disabled={count === 0}
                title={count === 0 ? t("selectionSets.emptyHint") : t("selectionSets.selectHint")}
                onClick={(event) => onSelect(set.name, event.ctrlKey || event.metaKey || event.shiftKey)}
              >
                <span>{set.name}</span>
                <small>{count === set.ids.length ? count : `${count}/${set.ids.length}`}</small>
              </button>
            )}
            <button type="button" className="outliner-action-btn" title={t("common.rename")} aria-label={t("common.rename")} onClick={() => start(set.name)}>
              <Pencil size={13} />
            </button>
            <button type="button" className="outliner-action-btn" title={t("selectionSets.remove")} aria-label={t("selectionSets.remove")} onClick={() => onRemove(set.name)}>
              <Trash2 size={13} />
            </button>
          </div>
        );
      })}
      <button
        type="button"
        className="outliner-set-save"
        disabled={selectedIds.length === 0 || full}
        title={full ? t("selectionSets.full", { count: MAX_SELECTION_SETS }) : t("selectionSets.saveHint")}
        onClick={onSave}
      >
        <BookmarkPlus size={14} aria-hidden="true" /> {t("selectionSets.save")}
      </button>
    </div>
  );
}
