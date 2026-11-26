import { localIdBase } from "@/lib/localIds";

/**
 * Selections kept under a name (Discussion #1472): after ungrouping, the parts of a group are found again with one
 * click. A set only remembers which objects belong to it. It is kept like the design's saved views - per design,
 * beside it in the browser and in a `.lyl` file -, never in the undo history.
 */
export type SelectionSet = { name: string; ids: string[] };

export const MAX_SELECTION_SETS = 50;
export const MAX_SELECTION_SET_NAME = 60;
const MAX_IDS = 20_000;
const STORAGE_PREFIX = "layerling.selectionSets.";
/** Fired on the window when the sets of a design have changed; `detail` is its project id. */
export const SELECTION_SETS_EVENT = "layerling:selection-sets";

export function normalizeSelectionSetName(value: unknown): string {
  return typeof value === "string" ? Array.from(value.replace(/\s+/g, " ").trim()).slice(0, MAX_SELECTION_SET_NAME).join("") : "";
}

/** The sets read from storage or a file; null when there is none. */
export function normalizeSelectionSets(value: unknown): SelectionSet[] | null {
  if (!Array.isArray(value)) return null;
  const sets: SelectionSet[] = [];
  for (const entry of value) {
    if (sets.length >= MAX_SELECTION_SETS) break;
    if (!entry || typeof entry !== "object") continue;
    const { name: rawName, ids: rawIds } = entry as { name?: unknown; ids?: unknown };
    const name = normalizeSelectionSetName(rawName);
    if (!name || !Array.isArray(rawIds) || sets.some((set) => set.name === name)) continue;
    const ids = [...new Set(rawIds.filter((id): id is string => typeof id === "string" && id.length > 0 && id.length <= 200))].slice(0, MAX_IDS);
    if (ids.length) sets.push({ name, ids });
  }
  return sets.length ? sets : null;
}

export function readSelectionSets(projectId: string | null | undefined): SelectionSet[] {
  if (!projectId) return [];
  try {
    const stored = window.localStorage.getItem(STORAGE_PREFIX + projectId);
    return (stored ? normalizeSelectionSets(JSON.parse(stored)) : null) ?? [];
  } catch {
    return [];
  }
}

/** False when the browser refuses to keep them. */
export function writeSelectionSets(projectId: string | null | undefined, sets: SelectionSet[] | null): boolean {
  if (!projectId) return false;
  try {
    const kept = normalizeSelectionSets(sets);
    if (kept) window.localStorage.setItem(STORAGE_PREFIX + projectId, JSON.stringify(kept));
    else window.localStorage.removeItem(STORAGE_PREFIX + projectId);
    window.dispatchEvent(new CustomEvent(SELECTION_SETS_EVENT, { detail: projectId }));
    return true;
  } catch {
    return false;
  }
}

/** "Selection 1", "Selection 2" ...: the first number no set has yet. */
export function freeSelectionSetName(sets: readonly SelectionSet[], numbered: (number: number) => string): string {
  let number = 1;
  while (sets.some((set) => set.name === numbered(number))) number += 1;
  return numbered(number);
}

/** Keeps `ids` under `name`; a set of that name takes the new objects and stays where it is. */
export function withSelectionSet(sets: readonly SelectionSet[], name: string, ids: readonly string[]): SelectionSet[] {
  const set = { name: normalizeSelectionSetName(name), ids: [...new Set(ids)] };
  return sets.some((entry) => entry.name === set.name) ? sets.map((entry) => (entry.name === set.name ? set : entry)) : [...sets, set];
}

/** Gives a set another name; nothing changes when the name is empty or taken. */
export function withRenamedSelectionSet(sets: readonly SelectionSet[], name: string, next: string): SelectionSet[] {
  const wanted = normalizeSelectionSetName(next);
  if (!wanted || sets.some((set) => set.name === wanted)) return [...sets];
  return sets.map((set) => (set.name === name ? { ...set, name: wanted } : set));
}

/**
 * The set's objects that are in the design now, in its order. Objects inside a group are not; they come back when it
 * is ungrouped, under an id derived from their own (localIds.ts), so the ids are compared without that ending. The
 * holes a tool put into a body carry such an ending too and are not the body.
 */
export function selectionSetIds(set: SelectionSet, shapes: readonly { id: string }[]): string[] {
  const exact = new Set(set.ids);
  const bases = new Set(set.ids.map(localIdBase));
  return shapes.filter((shape) => exact.has(shape.id) || (bases.has(localIdBase(shape.id)) && !shape.id.includes("-bore-"))).map((shape) => shape.id);
}
