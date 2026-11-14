import type { WorkplaneNote, WorkplaneShape } from "@/types/layerling";
import { canonicalizeShape } from "@/lib/workplaneShapes";
import { normalizeNotes, notesSignature } from "@/lib/workplaneNotes";
import {
  normalizePlacementWorkplane,
  placementWorkplaneFingerprint,
  placementWorkplaneIsBase,
  type PlacementWorkplane,
} from "@/lib/placementWorkplane";

export const MAX_EDITOR_HISTORY_ENTRIES = 5000;
export type EditorHistoryExportLimit = "unlimited" | number;

export type EditorHistoryEntry = {
  shapes: WorkplaneShape[];
  selectedIds: string[];
  /**
   * Die Notizen dieses Standes. Sie liegen im selben Eintrag wie die Koerper,
   * damit Rueckgaengig sie mitnimmt und jeder Weg, der schon einen Verlauf
   * traegt - Projektspeicher, Paketformat -, sie ohne Zutun mittraegt.
   */
  notes?: WorkplaneNote[];
  /**
   * Die Arbeitsebene dieses Standes, damit auch das Setzen oder Zuruecksetzen
   * einer Arbeitsebene rueckgaengig gemacht werden kann.
   */
  placementWorkplane?: PlacementWorkplane;
  /**
   * Wann dieser Stand entstanden ist, in Millisekunden seit 1970. Neue Staende
   * bekommen die Zeit beim Anlegen; aeltere Projekte tragen sie nicht, und der
   * Verlaufsblick zeigt dann nur die Nummer des Standes.
   */
  at?: number;
  fingerprint: string;
  estimatedBytes: number;
};

export type EditorHistoryState = {
  entries: EditorHistoryEntry[];
  index: number;
};

type ResourceSignature = {
  fingerprint: string;
  estimatedBytes: number;
};

const resourceSignatureCache = new WeakMap<object, ResourceSignature>();
const stringSignatureCache = new Map<string, ResourceSignature>();
const MAX_CACHED_STRING_SIGNATURES = 64;
const STREAMED_NUMERIC_ARRAY_LENGTH = 10_000;
const STREAMED_NUMERIC_ARRAY_MARKER = "$layerlingFloat64Array";
const COMPACT_RESOURCE_KEYS = new Set([
  "cadDisplayEdges",
  "edgeTreatmentHistory",
  "imagePlate",
  "importedMesh",
  "sketchProfile",
]);
const COMPACT_STRING_KEYS = new Set(["cadBrep"]);

function signatureFromSerialized(serialized: string): ResourceSignature {
  let hashA = 2166136261;
  let hashB = 5381;
  for (let index = 0; index < serialized.length; index += 1) {
    const code = serialized.charCodeAt(index);
    hashA = Math.imul(hashA ^ code, 16777619);
    hashB = Math.imul(hashB, 33) ^ code;
  }
  return {
    fingerprint: `${serialized.length}:${hashA >>> 0}:${hashB >>> 0}`,
    estimatedBytes: serialized.length * 2,
  };
}

type StreamingHashState = {
  hashA: number;
  hashB: number;
  units: number;
  estimatedBytes: number;
};

function streamingHashState(): StreamingHashState {
  return { hashA: 2166136261, hashB: 5381, units: 0, estimatedBytes: 0 };
}

function appendHashUnit(state: StreamingHashState, unit: number) {
  state.hashA = Math.imul(state.hashA ^ unit, 16777619);
  state.hashB = Math.imul(state.hashB, 33) ^ unit;
  state.units += 1;
}

function appendHashText(state: StreamingHashState, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    appendHashUnit(state, value.charCodeAt(index));
  }
  state.estimatedBytes += value.length * 2;
}

function appendHashNumber(state: StreamingHashState, value: number, view: DataView) {
  view.setFloat64(0, value, true);
  appendHashUnit(state, view.getUint32(0, true));
  appendHashUnit(state, view.getUint32(4, true));
  state.estimatedBytes += 8;
}

function signatureFromStreamingState(state: StreamingHashState, prefix: string): ResourceSignature {
  return {
    fingerprint: `${prefix}:${state.units}:${state.hashA >>> 0}:${state.hashB >>> 0}`,
    estimatedBytes: state.estimatedBytes,
  };
}

function largeNumericArraySignature(value: unknown) {
  if (!Array.isArray(value) || value.length <= STREAMED_NUMERIC_ARRAY_LENGTH) return null;
  const state = streamingHashState();
  const view = new DataView(new ArrayBuffer(8));
  appendHashText(state, `float64-array:${value.length}:`);
  for (let index = 0; index < value.length; index += 1) {
    const number = value[index];
    if (typeof number !== "number") return null;
    appendHashNumber(state, number, view);
  }
  return signatureFromStreamingState(state, "float64-v1");
}

function signatureFromStreamedValue(resource: object) {
  const state = streamingHashState();
  const view = new DataView(new ArrayBuffer(8));
  const active = new WeakSet<object>();

  const appendValue = (value: unknown, arrayValue = false): void => {
    if (value === null || (arrayValue && (value === undefined || typeof value === "function" || typeof value === "symbol"))) {
      appendHashText(state, "null;");
      return;
    }
    if (typeof value === "string") {
      appendHashText(state, `string:${value.length}:`);
      appendHashText(state, value);
      return;
    }
    if (typeof value === "number") {
      appendHashText(state, "number:");
      appendHashNumber(state, value, view);
      return;
    }
    if (typeof value === "boolean") {
      appendHashText(state, value ? "true;" : "false;");
      return;
    }
    if (typeof value === "bigint") {
      throw new TypeError("Cannot serialize a BigInt resource");
    }
    if (value === undefined || typeof value === "function" || typeof value === "symbol") {
      appendHashText(state, "undefined;");
      return;
    }

    if (active.has(value)) throw new TypeError("Cannot fingerprint a circular resource");
    active.add(value);
    if (Array.isArray(value)) {
      appendHashText(state, `array:${value.length}:`);
      for (let index = 0; index < value.length; index += 1) appendValue(value[index], true);
    } else {
      const record = value as Record<string, unknown>;
      const keys = Object.keys(record).filter((key) => {
        const item = record[key];
        return item !== undefined && typeof item !== "function" && typeof item !== "symbol";
      });
      appendHashText(state, `object:${keys.length}:`);
      for (const key of keys) {
        appendHashText(state, `key:${key.length}:`);
        appendHashText(state, key);
        appendValue(record[key]);
      }
    }
    active.delete(value);
  };

  appendValue(resource);
  return signatureFromStreamingState(state, "stream-v1");
}

function signatureWithStreamedNumericArrays(resource: object) {
  let streamedBytes = 0;
  const serialized = JSON.stringify(resource, (_key, value: unknown) => {
    const signature = largeNumericArraySignature(value);
    if (!signature) return value;
    streamedBytes += signature.estimatedBytes;
    return { [STREAMED_NUMERIC_ARRAY_MARKER]: signature.fingerprint };
  });
  const signature = signatureFromSerialized(serialized);
  return { ...signature, estimatedBytes: signature.estimatedBytes + streamedBytes };
}

function objectResourceSignature(resource: object) {
  const cached = resourceSignatureCache.get(resource);
  if (cached) return cached;
  let signature: ResourceSignature;
  try {
    signature = signatureWithStreamedNumericArrays(resource);
  } catch (error) {
    if (!(error instanceof RangeError) || !/string length/i.test(error.message)) throw error;
    signature = signatureFromStreamedValue(resource);
  }
  resourceSignatureCache.set(resource, signature);
  return signature;
}

export function immutableResourceFingerprint(resource: object) {
  return objectResourceSignature(resource).fingerprint;
}

function stringResourceSignature(resource: string) {
  const cached = stringSignatureCache.get(resource);
  if (cached) {
    stringSignatureCache.delete(resource);
    stringSignatureCache.set(resource, cached);
    return cached;
  }
  const signature = signatureFromSerialized(resource);
  stringSignatureCache.set(resource, signature);
  while (stringSignatureCache.size > MAX_CACHED_STRING_SIGNATURES) {
    const oldest = stringSignatureCache.keys().next().value;
    if (oldest === undefined) break;
    stringSignatureCache.delete(oldest);
  }
  return signature;
}

export function serializedSceneSignature(shapes: WorkplaneShape[]) {
  const countedObjects = new Set<object>();
  const countedStrings = new Set<string>();
  let resourceBytes = 0;
  const serialized = JSON.stringify(shapes.map(canonicalizeShape), (key, value: unknown) => {
    if (COMPACT_RESOURCE_KEYS.has(key) && value !== null && typeof value === "object") {
      const signature = objectResourceSignature(value);
      if (!countedObjects.has(value)) {
        countedObjects.add(value);
        resourceBytes += signature.estimatedBytes;
      }
      return { $resource: key, fingerprint: signature.fingerprint };
    }
    if (COMPACT_STRING_KEYS.has(key) && typeof value === "string" && value.length > 0) {
      const signature = stringResourceSignature(value);
      if (!countedStrings.has(value)) {
        countedStrings.add(value);
        resourceBytes += signature.estimatedBytes;
      }
      return { $resource: key, fingerprint: signature.fingerprint };
    }
    return value;
  });
  const signature = signatureFromSerialized(serialized);
  return {
    fingerprint: signature.fingerprint,
    estimatedBytes: signature.estimatedBytes + resourceBytes,
  };
}

/**
 * What a state of the history holds, as the stored design keeps it: the scene itself, written once per state, and the
 * large parts (meshes, exact bodies, sketch profiles, picture plates) that are stored once however many states share
 * them, each under its fingerprint with its estimated size. The History view counts with it what deleting a step
 * would free (memory 14.11.2026, after #1728).
 */
export function historyEntryResources(shapes: WorkplaneShape[]): { sceneBytes: number; resources: Map<string, number> } {
  const resources = new Map<string, number>();
  const serialized = JSON.stringify(shapes.map(canonicalizeShape), (key, value: unknown) => {
    if (COMPACT_RESOURCE_KEYS.has(key) && value !== null && typeof value === "object") {
      const signature = objectResourceSignature(value);
      resources.set(`${key}:${signature.fingerprint}`, signature.estimatedBytes);
      return { $resource: key, fingerprint: signature.fingerprint };
    }
    if (COMPACT_STRING_KEYS.has(key) && typeof value === "string" && value.length > 0) {
      const signature = stringResourceSignature(value);
      resources.set(`${key}:${signature.fingerprint}`, signature.estimatedBytes);
      return { $resource: key, fingerprint: signature.fingerprint };
    }
    return value;
  });
  return { sceneBytes: serialized.length * 2, resources };
}

export function projectShapesFingerprint(shapes: WorkplaneShape[]) {
  return serializedSceneSignature(shapes).fingerprint;
}

/** Koerper, Notizen und Arbeitsebene in einem Fingerabdruck - ein Stand ist alles zusammen. */
function sceneFingerprint(shapeFingerprint: string, notes: WorkplaneNote[], workplane?: PlacementWorkplane) {
  const text = notesSignature(notes);
  const base = text ? `${shapeFingerprint}#${signatureFromSerialized(text).fingerprint}` : shapeFingerprint;
  if (!workplane || placementWorkplaneIsBase(workplane)) {
    return base;
  }
  return `${base}@${placementWorkplaneFingerprint(workplane)}`;
}

/**
 * Der Fingerabdruck dessen, was in einem Entwurf steht. Wer nur wissen will, ob
 * sich die Koerper geaendert haben, nimmt `projectShapesFingerprint`; wer
 * entscheidet, **ob gespeichert werden muss**, nimmt diesen hier - eine getippte
 * Notiz oder gewechselte Arbeitsebene ist eine Aenderung.
 */
export function projectSceneFingerprint(shapes: WorkplaneShape[], notes: WorkplaneNote[] = [], workplane?: PlacementWorkplane) {
  return sceneFingerprint(
    projectShapesFingerprint(shapes),
    normalizeNotes(notes),
    workplane ? normalizePlacementWorkplane(workplane) : undefined,
  );
}

export function editorHistoryEntry(
  shapes: WorkplaneShape[],
  selectedIds: string[],
  notes: WorkplaneNote[] = [],
  workplane?: PlacementWorkplane,
  at?: number,
): EditorHistoryEntry {
  const canonicalShapes = shapes.map(canonicalizeShape);
  const validSelection = selectedIds.filter((id, index) => selectedIds.indexOf(id) === index && canonicalShapes.some((shape) => shape.id === id));
  const canonicalNotes = normalizeNotes(notes);
  const normalizedWorkplane = workplane ? normalizePlacementWorkplane(workplane) : undefined;
  const signature = serializedSceneSignature(canonicalShapes);
  // Die Notizen gehen in den Fingerabdruck ein, sonst haelt das Paketformat
  // zwei Staende, die sich nur in einer Notiz unterscheiden, fuer denselben und
  // legt sie zusammen - die Notiz waere dann beim naechsten Oeffnen weg.
  const noteText = notesSignature(canonicalNotes);
  const entry: EditorHistoryEntry = {
    shapes: canonicalShapes,
    selectedIds: validSelection,
    fingerprint: sceneFingerprint(signature.fingerprint, canonicalNotes, normalizedWorkplane),
    estimatedBytes: signature.estimatedBytes + noteText.length * 2 + (normalizedWorkplane ? 96 : 0),
  };
  if (canonicalNotes.length > 0) entry.notes = canonicalNotes;
  if (normalizedWorkplane && !placementWorkplaneIsBase(normalizedWorkplane)) {
    entry.placementWorkplane = normalizedWorkplane;
  }
  if (typeof at === "number" && Number.isFinite(at)) entry.at = at;
  return entry;
}

/**
 * Ein Stand des Verlaufs, so wie der Editor ihn braucht: Koerper, Auswahl,
 * Notizen, Arbeitsebene und die Hoehe, die zu ihr gehoert. Rueckgaengig,
 * Wiederherstellen und der Verlaufsblick lesen alle denselben Eintrag so.
 */
export type ResolvedHistoryState = {
  entry: EditorHistoryEntry;
  index: number;
  shapes: WorkplaneShape[];
  selectedIds: string[];
  notes: WorkplaneNote[];
  placementWorkplane: PlacementWorkplane;
  placementElevation: number;
};

export function historyStateAt(entries: EditorHistoryEntry[], requestedIndex: number): ResolvedHistoryState | null {
  if (entries.length === 0) return null;
  const index = Math.min(Math.max(0, Math.round(requestedIndex)), entries.length - 1);
  const entry = entries[index];
  const shapes = (entry?.shapes ?? []).map(canonicalizeShape);
  const selectedIds = (entry?.selectedIds ?? []).filter((id) => shapes.some((shape) => shape.id === id));
  const placementWorkplane = normalizePlacementWorkplane(entry?.placementWorkplane);
  const horizontal = Math.abs(placementWorkplane.normal.x) < 1e-6
    && Math.abs(placementWorkplane.normal.y - 1) < 1e-6
    && Math.abs(placementWorkplane.normal.z) < 1e-6;
  return {
    entry,
    index,
    shapes,
    selectedIds,
    notes: normalizeNotes(entry?.notes),
    placementWorkplane,
    placementElevation: horizontal ? placementWorkplane.origin.y : 0,
  };
}

/**
 * Der Verlauf eines Projekts, das aus einem frueheren Stand hervorgeht: alles
 * bis zu diesem Stand, nichts danach. Was hinter ihm lag, waere im neuen
 * Projekt ein Wiederherstellen in eine Zukunft, die es dort nie gab.
 */
export function editorHistoryBranch(
  entries: EditorHistoryEntry[],
  requestedIndex: number,
  limit: EditorHistoryExportLimit = "unlimited",
): EditorHistoryState {
  if (entries.length === 0) return { entries: [], index: 0 };
  const index = Math.min(Math.max(0, requestedIndex), entries.length - 1);
  return editorHistoryForExport(entries.slice(0, index + 1), index, limit);
}

/**
 * Die Notizen des Standes, auf den ein Verlauf gerade zeigt. Sie sind die
 * Antwort auf „welche Notizen gehoeren zu diesen Koerpern" - ein gespeicherter
 * Verlauf traegt sie, und wer ihn wieder aufsetzt, muss sie mitgeben, sonst
 * haelt `hydrateEditorHistoryState` den Stand fuer einen anderen und wirft den
 * ganzen Verlauf weg.
 */
export function notesForHistoryIndex(entries: EditorHistoryEntry[] | undefined, index: number | undefined): WorkplaneNote[] {
  if (!Array.isArray(entries) || entries.length === 0) return [];
  const bounded = Number.isInteger(index) ? Math.min(Math.max(0, index as number), entries.length - 1) : entries.length - 1;
  return normalizeNotes(entries[bounded]?.notes);
}

/**
 * Die Arbeitsebene des Standes, auf den ein Verlauf gerade zeigt.
 */
export function workplaneForHistoryIndex(
  entries: EditorHistoryEntry[] | undefined,
  index: number | undefined,
  fallback?: PlacementWorkplane,
): PlacementWorkplane | undefined {
  if (!Array.isArray(entries) || entries.length === 0) return fallback;
  const bounded = Number.isInteger(index) ? Math.min(Math.max(0, index as number), entries.length - 1) : entries.length - 1;
  const found = entries[bounded]?.placementWorkplane;
  return found ? normalizePlacementWorkplane(found) : fallback;
}

export function boundedEditorHistory(entries: EditorHistoryEntry[], limit: EditorHistoryExportLimit = "unlimited") {
  return boundedEditorHistoryState(entries, entries.length - 1, limit).entries;
}

export function boundedEditorHistoryState(
  entries: EditorHistoryEntry[],
  requestedIndex: number,
  limit: EditorHistoryExportLimit = "unlimited",
): EditorHistoryState {
  if (entries.length === 0) return { entries: [], index: 0 };
  const index = Math.min(Math.max(0, requestedIndex), entries.length - 1);
  const retainedActions = limit === "unlimited"
    ? MAX_EDITOR_HISTORY_ENTRIES - 1
    : Math.min(MAX_EDITOR_HISTORY_ENTRIES - 1, Math.max(1, Math.round(limit)));
  const maxEntries = retainedActions + 1;
  if (entries.length <= maxEntries) return { entries, index };
  let start = Math.max(0, index - retainedActions);
  const end = Math.min(entries.length, start + maxEntries);
  if (end - start < maxEntries) start = Math.max(0, end - maxEntries);
  const bounded = entries.slice(start, end);
  return { entries: bounded, index: index - start };
}

/** How long a pause between two arrow-key presses may be and still count as one run (#370). */
export const KEY_RUN_GAP_MS = 1500;

/**
 * The last step an arrow key made: what it moved, when, and the history entry it left (#370).
 * A press that comes soon after, on the same thing, and while that entry is still the newest,
 * replaces the entry instead of adding one, so a run of presses is one step of the history.
 */
export type KeyRun = { key: string; at: number; entry: unknown };

export function continuesKeyRun(run: KeyRun | null, key: string, now: number, currentEntry: unknown, currentIsNewest: boolean) {
  return run !== null && run.key === key && currentIsNewest && currentEntry !== undefined && run.entry === currentEntry && now - run.at <= KEY_RUN_GAP_MS;
}

/**
 * Puts a new state into the history after the current one. With `replaceCurrent` the newest entry
 * is replaced instead, for a run of arrow-key presses (#370); a run that ends where it started
 * leaves no entry at all.
 */
export function appendEditorHistorySnapshot(
  entries: EditorHistoryEntry[],
  requestedIndex: number,
  entry: EditorHistoryEntry,
  limit: EditorHistoryExportLimit = "unlimited",
  now: number = Date.now(),
  replaceCurrent = false,
) {
  const index = Math.min(Math.max(0, requestedIndex), Math.max(0, entries.length - 1));
  const current = entries[index];
  if (current?.fingerprint === entry.fingerprint) {
    const selectionChanged = current.selectedIds.join("\0") !== entry.selectedIds.join("\0");
    return {
      entries: selectionChanged ? entries.map((candidate, candidateIndex) => candidateIndex === index ? { ...candidate, selectedIds: entry.selectedIds } : candidate) : entries,
      index,
      changed: false,
    };
  }

  // Ein neuer Stand bekommt seine Zeit hier, wo er in den Verlauf kommt - und
  // nur hier, damit ein Eintrag, der bloss verglichen wird, keine traegt.
  const stamped: EditorHistoryEntry = typeof entry.at === "number" && Number.isFinite(entry.at) ? entry : { ...entry, at: now };
  if (replaceCurrent && index > 0 && index === entries.length - 1) {
    const before = entries[index - 1];
    const nextEntries = before.fingerprint === entry.fingerprint
      ? entries.slice(0, index)
      : [...entries.slice(0, index), stamped];
    return { entries: nextEntries, index: nextEntries.length - 1, changed: true };
  }
  const nextEntries = boundedEditorHistory([...entries.slice(0, index + 1), stamped], limit);
  return { entries: nextEntries, index: nextEntries.length - 1, changed: true };
}

/**
 * Every save and every project snapshot runs the whole history through
 * `hydrateEditorHistoryState`, and rebuilding an entry means serializing and
 * hashing all of its shapes. A design with a long history and many bodies spent
 * over half a second on that for states that had not changed since the last
 * save. An entry that is the same object, with the same parts, comes out the
 * same - so the result is remembered on the entry itself.
 */
const hydratedEntryCache = new WeakMap<object, {
  shapes: unknown;
  selectedIds: unknown;
  notes: unknown;
  placementWorkplane: unknown;
  at: unknown;
  /** Only matters for an entry without a workplane of its own, which takes the current one. */
  inheritedWorkplane: string | null;
  result: EditorHistoryEntry;
}>();

export function hydrateEditorHistoryState(
  currentShapes: WorkplaneShape[],
  storedEntries: EditorHistoryEntry[] | undefined,
  requestedIndex: number | undefined,
  limit: EditorHistoryExportLimit = "unlimited",
  currentNotes: WorkplaneNote[] = [],
  currentWorkplane?: PlacementWorkplane,
): EditorHistoryState {
  const fallback = editorHistoryEntry(currentShapes, [], currentNotes, currentWorkplane);
  if (!Array.isArray(storedEntries) || storedEntries.length === 0) {
    return { entries: [fallback], index: 0 };
  }

  try {
    const inheritedWorkplane = currentWorkplane ? placementWorkplaneFingerprint(currentWorkplane) : "";
    const normalized = storedEntries.map((entry) => {
      const cacheable = entry !== null && typeof entry === "object";
      const cached = cacheable ? hydratedEntryCache.get(entry) : undefined;
      const inherited = entry?.placementWorkplane ? null : inheritedWorkplane;
      if (
        cached
        && cached.shapes === entry.shapes
        && cached.selectedIds === entry.selectedIds
        && cached.notes === entry.notes
        && cached.placementWorkplane === entry.placementWorkplane
        && cached.at === entry.at
        && cached.inheritedWorkplane === inherited
      ) {
        return cached.result;
      }
      const result = editorHistoryEntry(
        Array.isArray(entry?.shapes) ? entry.shapes : [],
        Array.isArray(entry?.selectedIds) ? entry.selectedIds.filter((id): id is string => typeof id === "string") : [],
        normalizeNotes(entry?.notes),
        entry?.placementWorkplane ?? currentWorkplane,
        typeof entry?.at === "number" && Number.isFinite(entry.at) ? entry.at : undefined,
      );
      if (cacheable) {
        hydratedEntryCache.set(entry, {
          shapes: entry.shapes,
          selectedIds: entry.selectedIds,
          notes: entry.notes,
          placementWorkplane: entry.placementWorkplane,
          at: entry.at,
          inheritedWorkplane: inherited,
          result,
        });
      }
      return result;
    });
    const index = Number.isInteger(requestedIndex)
      ? Math.min(Math.max(0, requestedIndex as number), normalized.length - 1)
      : normalized.length - 1;
    // A caller that knows no workplane (the start page building its cache from a loaded design) takes the one
    // the entry itself was recorded on; comparing it to the base plate threw away the whole history of any
    // design whose last step was made on a face workplane (#390).
    const stored = normalized[index];
    const expected = currentWorkplane === undefined && stored?.placementWorkplane
      ? editorHistoryEntry(currentShapes, [], currentNotes, stored.placementWorkplane)
      : fallback;
    if (stored?.fingerprint !== expected.fingerprint) {
      return { entries: [fallback], index: 0 };
    }

    return boundedEditorHistoryState(normalized, index, limit);
  } catch {
    return { entries: [fallback], index: 0 };
  }
}

export function editorHistoryForExport(
  entries: EditorHistoryEntry[],
  requestedIndex: number,
  limit: EditorHistoryExportLimit,
): EditorHistoryState {
  if (entries.length === 0) return { entries: [], index: 0 };
  const index = Math.min(Math.max(0, requestedIndex), entries.length - 1);
  if (limit === "unlimited") return { entries, index };
  const start = Math.max(0, index - limit);
  return {
    entries: entries.slice(start, index + 1),
    index: index - start,
  };
}
