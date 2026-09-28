/**
 * Everything this project stores in a browser used to carry the name it had
 * before: settings under a `sketchForge.` prefix, the projects themselves in a
 * database of the same name. This file is the one place that still knows those
 * names - it copies both across once, so a rename does not cost anyone their
 * work. It can be deleted as soon as every browser in use has opened the app
 * once; nothing else reads the old names.
 */
const RENAMED_KEYS = [
  "projects",
  "downloadMode",
  "downloadFolder",
  "clipboard",
  "theme",
  "language",
  "editor.moveDimensionsEnabled",
  "mcp.editorIdentity",
] as const;

const RENAMED_PREFIXES = ["workspaceDefault."] as const;

const LEGACY_PREFIX = "sketchForge.";
const LEGACY_LOWER_PREFIX = "sketchforge.";
const CURRENT_PREFIX = "layerling.";

/**
 * Copies, never deletes. Removing the old key would make this a one-way trip:
 * if anything about the new key is wrong, the setting is simply gone. A few
 * stale strings cost nothing by comparison.
 */
function copy(storage: Storage, legacyKey: string, currentKey: string) {
  const legacyValue = storage.getItem(legacyKey);
  if (legacyValue === null) return;
  if (storage.getItem(currentKey) === null) storage.setItem(currentKey, legacyValue);
}

export function migrateLegacyStorageKeys(storage: Storage) {
  try {
    for (const key of RENAMED_KEYS) {
      copy(storage, `${LEGACY_PREFIX}${key}`, `${CURRENT_PREFIX}${key}`);
      copy(storage, `${LEGACY_LOWER_PREFIX}${key}`, `${CURRENT_PREFIX}${key}`);
    }
    for (const prefix of RENAMED_PREFIXES) {
      const legacy = `${LEGACY_PREFIX}${prefix}`;
      const stale = Object.keys(storage).filter((key) => key.startsWith(legacy));
      for (const key of stale) {
        copy(storage, key, `${CURRENT_PREFIX}${key.slice(LEGACY_PREFIX.length)}`);
      }
    }
  } catch {
    // A browser that refuses storage has nothing to migrate either.
  }
}

export const PROJECT_SHAPES_DB_NAME = "layerling.projectShapes";
const LEGACY_PROJECT_SHAPES_DB_NAME = "sketchForge.projectShapes";

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

/** Opens a database only if it is already there, so no empty one is left behind. */
async function openExistingDatabase(factory: IDBFactory, name: string) {
  if (typeof factory.databases === "function") {
    const known = await factory.databases().catch(() => []);
    if (!known.some((entry) => entry.name === name)) return null;
  }
  const database = await requestResult(factory.open(name));
  if (database.objectStoreNames.length === 0) {
    // There was nothing: this call just created it. Undo that.
    database.close();
    factory.deleteDatabase(name);
    return null;
  }
  return database;
}

type StoredProjectRecord = {
  id?: string;
  revision?: number;
  lylPackage?: { byteLength: number };
  skfPackage?: { byteLength: number };
  shapes?: unknown[];
};

/** How much project there is in a record: the package, or the plain shape list. */
function projectWeight(record: StoredProjectRecord | undefined) {
  if (!record) return -1;
  return (record.lylPackage?.byteLength ?? record.skfPackage?.byteLength ?? 0) + (record.shapes?.length ?? 0);
}

/**
 * Whether the record from the old database should be written into the new one.
 * A newer revision in the new database is a real edit and always wins. At the
 * same revision the fuller record wins, which repairs the case where a build
 * read the package under the wrong field name and saved an empty project over
 * the copy.
 */
export function shouldCarryOverProjectRecord(legacy: StoredProjectRecord, current: StoredProjectRecord | undefined) {
  if (!current) return true;
  if ((current.revision ?? 0) > (legacy.revision ?? 0)) return false;
  return projectWeight(current) < projectWeight(legacy);
}

/**
 * Copies the projects out of the database written before the rename, record by
 * record, following the rule above. A project edited since keeps its newer
 * state, and the old database is never touched: it stays as the safety net.
 */
export async function migrateLegacyProjectShapes(
  factory: IDBFactory,
  openTarget: () => Promise<IDBDatabase>,
  stores: readonly string[],
) {
  const legacy = await openExistingDatabase(factory, LEGACY_PROJECT_SHAPES_DB_NAME).catch(() => null);
  if (!legacy) return;
  let target: IDBDatabase | null = null;
  try {
    target = await openTarget();
    for (const store of stores) {
      if (!legacy.objectStoreNames.contains(store) || !target.objectStoreNames.contains(store)) continue;
      const records = await requestResult(legacy.transaction(store, "readonly").objectStore(store).getAll()) as StoredProjectRecord[];
      if (records.length === 0) continue;
      const current = await requestResult(target.transaction(store, "readonly").objectStore(store).getAll()) as StoredProjectRecord[];
      const currentById = new Map(current.map((record) => [record.id, record]));
      const missing = records.filter((record) => shouldCarryOverProjectRecord(record, currentById.get(record.id)));
      if (missing.length === 0) continue;
      const transaction = target.transaction(store, "readwrite");
      const objectStore = transaction.objectStore(store);
      for (const record of missing) objectStore.put(record);
      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error ?? new Error("Could not copy project shapes"));
        transaction.onabort = () => reject(transaction.error ?? new Error("Copying project shapes was aborted"));
      });
    }
  } finally {
    legacy.close();
    target?.close();
  }
}
