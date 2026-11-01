/*
 * The sketch that is still open in a design, kept in this browser in a database of its own (#1146). A reload took it:
 * the design saves its bodies, but a sketch that is not finished is no body yet, so the image traced over and the
 * line drawn were gone after an update. The picture of a sketch can be large, which is why it is not kept in
 * localStorage. A draft that cannot be kept is no loss beyond what there was before: the sketch simply does not come back.
 */
import type { SketchOperation, SketchProfile } from "@/types/layerling";
import type { PlacementWorkplane } from "@/lib/placementWorkplane";
import type { SketchEditTurn } from "@/lib/sketchEditTurn";
import type { SketchAnchor } from "@/lib/sketchPlacement";

const DB_NAME = "layerling-sketch-drafts";
const DB_VERSION = 1;
const STORE = "drafts";

export type SketchDraft = {
  /** The design the sketch belongs to. */
  id: string;
  operation: SketchOperation;
  profile: SketchProfile;
  workplane: PlacementWorkplane;
  /** The body whose sketch is edited, or null for a new sketch. */
  editingId: string | null;
  revolve?: unknown;
  turn: SketchEditTurn | null;
  anchor: SketchAnchor | null;
  savedAt: number;
};

/** Whether a sketch holds anything worth bringing back: a line, a point or a picture. */
export function sketchHasWork(profile: SketchProfile): boolean {
  return profile.segments.length > 0 || profile.points.length > 0 || (profile.images?.length ?? 0) > 0;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("This browser keeps no local database"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open the sketch drafts"));
    request.onblocked = () => reject(new Error("The sketch drafts are busy in another tab"));
  });
}

async function withStore<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await openDatabase();
  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      let result: T | undefined;
      const request = work(transaction.objectStore(STORE));
      if (request) request.onsuccess = () => { result = request.result; };
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(transaction.error ?? new Error("The sketch draft could not be written"));
      transaction.onabort = () => reject(transaction.error ?? new Error("The sketch draft could not be written"));
    });
  } finally {
    db.close();
  }
}

/** Keeps the open sketch of a design, in place of the one kept before. Never fails: a draft that cannot be written is left out. */
export async function saveSketchDraft(draft: SketchDraft): Promise<void> {
  try {
    await withStore("readwrite", (store) => {
      store.put(draft);
    });
  } catch {
    // The sketch stays open as it is; only its way back through a reload is missing.
  }
}

/** The open sketch kept for a design, or null. Never fails. */
export async function loadSketchDraft(id: string): Promise<SketchDraft | null> {
  try {
    const draft = await withStore<SketchDraft>("readonly", (store) => store.get(id) as IDBRequest<SketchDraft>);
    if (!draft || typeof draft !== "object" || draft.id !== id || !draft.profile || !Array.isArray(draft.profile.segments) || !Array.isArray(draft.profile.points)) return null;
    if (draft.operation !== "extrude" && draft.operation !== "revolve" && draft.operation !== "sweep") return null;
    return draft;
  } catch {
    return null;
  }
}

export async function deleteSketchDraft(id: string): Promise<void> {
  try {
    await withStore("readwrite", (store) => {
      store.delete(id);
    });
  } catch {
    // A draft left behind comes back as a sketch the next time the design opens; it can be cancelled.
  }
}
