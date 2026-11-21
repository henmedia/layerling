import { isOutOfMemoryError, isProjectTooLargeError, isStorageFullError } from "@/lib/historyTrim";

/**
 * Why a design could not be stored in the browser, told so that a screenshot of the editor answers it (#1639). One
 * person's Chrome on a Mac refused every save, even of a design of a few plates, with an error that carried no text,
 * so the red note said "Could not save design shapes:" and nothing more. The note now carries a line with the error's
 * own name and text, the browser's storage figures and whether a tiny test write goes through.
 */

/** What kind of failure it is; it decides the reason in the note and the advice under it. */
export type SaveFailureKind = "storageFull" | "outOfMemory" | "tooLarge" | "other";

export function saveFailureKind(error: unknown): SaveFailureKind {
  if (isStorageFullError(error)) return "storageFull";
  if (isProjectTooLargeError(error)) return "tooLarge";
  if (isOutOfMemoryError(error)) return "outOfMemory";
  return "other";
}

function errorText(error: unknown): string {
  if (error && typeof error === "object") {
    const { name, message } = error as { name?: unknown; message?: unknown };
    const type = (error as object).constructor?.name;
    const label = typeof name === "string" && name ? name : type || "Error";
    const kind = type && type !== label ? ` (${type})` : "";
    const text = typeof message === "string" && message.trim() ? message.trim() : "(no message)";
    return `${label}${kind}: ${text}`;
  }
  if (error === undefined || error === null || error === "") return "(no error given)";
  return String(error);
}

/** The error as one line: its name and type, its text, and what it was caused by, if it says. */
export function describeSaveError(error: unknown): string {
  const parts = [errorText(error)];
  let cause = error && typeof error === "object" ? (error as { cause?: unknown }).cause : undefined;
  for (let depth = 0; cause !== undefined && cause !== null && depth < 3; depth += 1) {
    parts.push(`cause ${errorText(cause)}`);
    cause = typeof cause === "object" ? (cause as { cause?: unknown }).cause : undefined;
  }
  return parts.join(" · ").slice(0, 400);
}

/** What the browser says about its storage for this site, and whether a tiny write gets through. */
export type StorageProbe = {
  usage?: number;
  quota?: number;
  indexedDb?: number;
  persisted?: boolean;
  indexedDbWrite: string;
  localStorageWrite: string;
};

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "?";
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

export function storageProbeText(probe: StorageProbe): string {
  const parts: string[] = [];
  if (probe.usage !== undefined && probe.quota !== undefined) {
    const share = probe.quota > 0 ? ` (${Math.round((probe.usage / probe.quota) * 100)} %)` : "";
    parts.push(`storage ${formatBytes(probe.usage)} of ${formatBytes(probe.quota)} used${share}`);
  } else {
    parts.push("storage size unknown");
  }
  if (probe.indexedDb !== undefined) parts.push(`IndexedDB ${formatBytes(probe.indexedDb)}`);
  if (probe.persisted !== undefined) parts.push(`persistent ${probe.persisted ? "yes" : "no"}`);
  parts.push(`test write IndexedDB ${probe.indexedDbWrite}`);
  parts.push(`localStorage ${probe.localStorageWrite}`);
  return parts.join(" · ");
}

/**
 * Whether the browser's storage for this site looks broken rather than full: a tiny test write is refused although
 * most of the room is free. Two people's Chrome on a Mac did this, at 3 % of 10 GB (#1639, Facebook); deleting the
 * site's data in the browser and restoring a backup was the cure, deleting designs was not.
 */
export function storageLooksBroken(probe: StorageProbe): boolean {
  if (!probe.indexedDbWrite.startsWith("failed")) return false;
  if (probe.usage === undefined || !probe.quota) return false;
  return probe.usage / probe.quota < 0.5 && probe.quota - probe.usage > 100 * 1024 * 1024;
}

const PROBE_DB = "layerling-storage-probe";
const PROBE_TIMEOUT_MS = 5000;

function withTimeout<T>(promise: Promise<T>, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    const timer = setTimeout(() => resolve(fallback), PROBE_TIMEOUT_MS);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(fallback);
      },
    );
  });
}

/** Writes one small record into a database of its own: "ok", or what the browser said instead. */
function probeIndexedDbWrite(): Promise<string> {
  if (typeof indexedDB === "undefined") return Promise.resolve("not available");
  const attempt = new Promise<string>((resolve) => {
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(PROBE_DB, 1);
    } catch (error) {
      resolve(`failed, ${errorText(error)}`);
      return;
    }
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains("probe")) request.result.createObjectStore("probe");
    };
    request.onblocked = () => resolve("blocked");
    request.onerror = () => resolve(`failed to open, ${errorText(request.error)}`);
    request.onsuccess = () => {
      const database = request.result;
      try {
        const transaction = database.transaction("probe", "readwrite");
        transaction.objectStore("probe").put({ at: Date.now(), bytes: new Uint8Array(1024) }, "probe");
        transaction.oncomplete = () => {
          database.close();
          resolve("ok");
        };
        transaction.onerror = () => {
          database.close();
          resolve(`failed, ${errorText(transaction.error)}`);
        };
        transaction.onabort = () => {
          database.close();
          resolve(`failed, ${errorText(transaction.error)}`);
        };
      } catch (error) {
        database.close();
        resolve(`failed, ${errorText(error)}`);
      }
    };
  });
  return withTimeout(attempt, `no answer within ${PROBE_TIMEOUT_MS / 1000} s`);
}

function probeLocalStorageWrite(): string {
  try {
    const key = "layerling.storageProbe";
    window.localStorage.setItem(key, String(Date.now()));
    window.localStorage.removeItem(key);
    return "ok";
  } catch (error) {
    return `failed, ${errorText(error)}`;
  }
}

export async function probeBrowserStorage(): Promise<StorageProbe> {
  const probe: StorageProbe = { indexedDbWrite: "not tried", localStorageWrite: "not tried" };
  const storage = typeof navigator !== "undefined" ? navigator.storage : undefined;
  if (storage?.estimate) {
    const estimate = await withTimeout(storage.estimate(), null);
    if (estimate) {
      probe.usage = estimate.usage;
      probe.quota = estimate.quota;
      const details = (estimate as StorageEstimate & { usageDetails?: { indexedDB?: number } }).usageDetails;
      if (details?.indexedDB !== undefined) probe.indexedDb = details.indexedDB;
    }
  }
  if (storage?.persisted) {
    const persisted = await withTimeout(storage.persisted(), null);
    if (persisted !== null) probe.persisted = persisted;
  }
  probe.indexedDbWrite = await probeIndexedDbWrite();
  probe.localStorageWrite = typeof window !== "undefined" ? probeLocalStorageWrite() : "not available";
  return probe;
}
