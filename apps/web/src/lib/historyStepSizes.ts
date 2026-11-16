import { historyEntryResources, type EditorHistoryEntry } from "@/lib/editorHistory";

/**
 * How much room the steps of the history take, and deleting single steps of it (memory 14.11.2026, after #1728: a
 * design too large to store, where the only way out was to delete the whole history).
 *
 * Every state of the history is a whole snapshot of the design, but the stored design keeps a mesh, an exact body or
 * a picture only once, however many states share it. So a state costs room only for the scene it writes and for the
 * large parts no other state holds: a turned body, baked into a new mesh at each turn, brings a whole mesh with every
 * change of its angle, while moving a body brings next to nothing. What a step "frees" is that: the room the stored
 * design would lose if the step went. The sizes are estimates (the text of the data, two bytes a character), close
 * to what the browser stores before packing.
 */

type EntryResources = { sceneBytes: number; resources: Map<string, number> };

const entryResourceCache = new WeakMap<EditorHistoryEntry, EntryResources>();

function resourcesOf(entry: EditorHistoryEntry): EntryResources {
  const cached = entryResourceCache.get(entry);
  if (cached) return cached;
  const counted = historyEntryResources(entry.shapes);
  const notesBytes = entry.notes?.length ? JSON.stringify(entry.notes).length * 2 : 0;
  const result = { sceneBytes: counted.sceneBytes + notesBytes, resources: counted.resources };
  entryResourceCache.set(entry, result);
  return result;
}

/** How many states hold each large part. */
function referenceCounts(table: readonly EntryResources[]) {
  const counts = new Map<string, number>();
  table.forEach(({ resources }) => {
    resources.forEach((_bytes, key) => counts.set(key, (counts.get(key) ?? 0) + 1));
  });
  return counts;
}

export type HistoryStepSizes = {
  /** What deleting each state alone would free, in bytes: its scene and the large parts only it holds. */
  own: number[];
  /** The whole history, in bytes, each large part counted once. */
  total: number;
};

export function historyStepSizes(entries: readonly EditorHistoryEntry[]): HistoryStepSizes {
  const table = entries.map(resourcesOf);
  const counts = referenceCounts(table);
  let total = 0;
  const counted = new Set<string>();
  const own = table.map(({ sceneBytes, resources }) => {
    total += sceneBytes;
    let bytes = sceneBytes;
    resources.forEach((size, key) => {
      if (!counted.has(key)) {
        counted.add(key);
        total += size;
      }
      if (counts.get(key) === 1) bytes += size;
    });
    return bytes;
  });
  return { own, total };
}

/**
 * What deleting several states together would free: a large part goes once every state that holds it is among
 * them, which adding up what each would free alone misses (two steps sharing one mesh free it only together).
 */
export function historyFreedBytes(entries: readonly EditorHistoryEntry[], indices: Iterable<number>): number {
  const chosen = new Set([...indices].filter((index) => Number.isInteger(index) && index >= 0 && index < entries.length));
  if (chosen.size === 0) return 0;
  const table = entries.map(resourcesOf);
  const counts = referenceCounts(table);
  const inChosen = new Map<string, number>();
  let bytes = 0;
  chosen.forEach((index) => {
    bytes += table[index].sceneBytes;
    table[index].resources.forEach((_size, key) => inChosen.set(key, (inChosen.get(key) ?? 0) + 1));
  });
  inChosen.forEach((count, key) => {
    if (count === counts.get(key)) {
      const size = table.find(({ resources }) => resources.has(key))?.resources.get(key) ?? 0;
      bytes += size;
    }
  });
  return bytes;
}

/** A step frees at least this much to count among the largest: one mesh of some thousand triangles. */
export const LARGE_HISTORY_STEP_BYTES = 1024 * 1024;

/**
 * The states "Delete the largest steps" picks: each frees at least LARGE_HISTORY_STEP_BYTES alone. The state the
 * design stands at is never among them.
 */
export function largestHistorySteps(sizes: HistoryStepSizes, liveIndex: number, threshold = LARGE_HISTORY_STEP_BYTES): number[] {
  return sizes.own.flatMap((bytes, index) => (index !== liveIndex && bytes >= threshold ? [index] : []));
}

/**
 * The history without the states in `remove`. The state the design stands at stays (deleting it would change the
 * design), and so does one state at least; the index moves with the states taken out before it. Undo from the state
 * after a deleted one then goes straight to the one before it. Null when nothing would go.
 */
export function deleteHistoryEntries<T>(entries: readonly T[], liveIndex: number, remove: Iterable<number>): { entries: T[]; index: number; removed: number[] } | null {
  const live = Math.min(Math.max(0, Math.round(liveIndex)), Math.max(0, entries.length - 1));
  const removed = [...new Set(remove)]
    .filter((index) => Number.isInteger(index) && index >= 0 && index < entries.length && index !== live)
    .sort((a, b) => a - b);
  if (removed.length === 0) return null;
  const gone = new Set(removed);
  return {
    entries: entries.filter((_entry, index) => !gone.has(index)),
    index: live - removed.filter((index) => index < live).length,
    removed,
  };
}

/** Where a state stands after `removed` went: shifted down, or for a deleted one the nearest earlier state left. */
export function historyIndexAfterDelete(index: number, removed: readonly number[]): number {
  const gone = new Set(removed);
  let at = index;
  while (at > 0 && gone.has(at)) at -= 1;
  if (gone.has(at)) {
    // Everything from the oldest up to it went: the oldest state left.
    return 0;
  }
  return at - removed.filter((removedIndex) => removedIndex < at).length;
}

/** A size as people read it: "820 KB", "3.2 MB", with the decimal mark of the language. */
export function formatHistoryBytes(bytes: number, language = "en"): string {
  const units = ["B", "KB", "MB", "GB"];
  let value = Math.max(0, bytes);
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = unit >= 2 && value < 10 ? 1 : 0;
  let text: string;
  try {
    text = new Intl.NumberFormat(language, { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value);
  } catch {
    text = value.toFixed(digits);
  }
  return `${text} ${units[unit]}`;
}
