import { useCallback, useEffect, useState } from "react";
import { t } from "@/lib/i18n";
import {
  freeSelectionSetName,
  MAX_SELECTION_SETS,
  normalizeSelectionSetName,
  readSelectionSets,
  SELECTION_SETS_EVENT,
  selectionSetIds,
  withRenamedSelectionSet,
  withSelectionSet,
  writeSelectionSets,
  type SelectionSet,
} from "@/lib/selectionSets";

/** The named selections of the open design (Discussion #1472), for the object list, the menus and the AI bridge. */
export function useSelectionSets({
  projectId,
  currentShapes,
  currentSelection,
  select,
  onNotice,
}: {
  projectId: string | null | undefined;
  currentShapes: () => readonly { id: string; hidden?: boolean }[];
  currentSelection: () => string[];
  select: (ids: string[]) => void;
  onNotice: (message: string) => void;
}) {
  const [sets, setSets] = useState<SelectionSet[]>([]);
  /** The set whose name opens for typing in the object list. */
  const [renaming, setRenaming] = useState<string | null>(null);
  useEffect(() => {
    const read = () => setSets(readSelectionSets(projectId));
    read();
    setRenaming(null);
    const changed = (event: Event) => {
      if ((event as CustomEvent).detail === projectId) read();
    };
    const stored = (event: StorageEvent) => {
      if (event.key === null || (projectId && event.key.endsWith(projectId))) read();
    };
    window.addEventListener(SELECTION_SETS_EVENT, changed);
    window.addEventListener("storage", stored);
    return () => {
      window.removeEventListener(SELECTION_SETS_EVENT, changed);
      window.removeEventListener("storage", stored);
    };
  }, [projectId]);

  /** Keeps these objects (without ids: the selection); returns the set's name, or null when nothing was kept. */
  const save = useCallback((name?: string, ids?: string[]): string | null => {
    const kept = readSelectionSets(projectId);
    const members = ids ?? currentSelection();
    const wanted = normalizeSelectionSetName(name) || freeSelectionSetName(kept, (number) => t("selectionSets.numbered", { number }));
    if (members.length === 0) return null;
    if (kept.length >= MAX_SELECTION_SETS && !kept.some((set) => set.name === wanted)) {
      onNotice(t("selectionSets.full", { count: MAX_SELECTION_SETS }));
      return null;
    }
    if (!writeSelectionSets(projectId, withSelectionSet(kept, wanted, members))) {
      onNotice(t("selectionSets.notKept"));
      return null;
    }
    onNotice(t("selectionSets.saved", { name: wanted, count: members.length }));
    return wanted;
  }, [projectId, currentSelection, onNotice]);

  /** Selects the set's objects that are in the design and not hidden; null when there is no such set. */
  const pick = useCallback((name: string, add = false): string[] | null => {
    const set = readSelectionSets(projectId).find((entry) => entry.name === name);
    if (!set) return null;
    const found = selectionSetIds(set, currentShapes().filter((shape) => !shape.hidden));
    if (found.length === 0) {
      onNotice(t("selectionSets.nothing", { name }));
      return [];
    }
    const next = add ? [...currentSelection().filter((id) => !found.includes(id)), ...found] : found;
    select(next);
    onNotice(t("selectionSets.selected", { name, count: found.length }));
    return next;
  }, [projectId, currentShapes, currentSelection, select, onNotice]);

  const rename = useCallback((name: string, next: string) => {
    writeSelectionSets(projectId, withRenamedSelectionSet(readSelectionSets(projectId), name, next));
  }, [projectId]);

  const remove = useCallback((name: string): boolean => {
    const kept = readSelectionSets(projectId);
    if (!kept.some((set) => set.name === name)) return false;
    return writeSelectionSets(projectId, kept.filter((set) => set.name !== name));
  }, [projectId]);

  const renameStarted = useCallback(() => setRenaming(null), []);
  return { sets, renaming, setRenaming, renameStarted, save, pick, rename, remove };
}
