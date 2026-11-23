// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { allowBackupFolderForSave } from "@/lib/fileBackups";
import { backupFileBeforeOverwrite } from "@/components/workplane/fileBackupEditor";
import type { LylFileHandle } from "@/lib/lylFileAccess";

const never = <T,>() => new Promise<T>(() => undefined);

/** A database whose only content is the chosen folder. */
function databaseWith(folder: unknown) {
  return {
    open: () => {
      const request: Record<string, unknown> = {};
      queueMicrotask(() => {
        request.result = {
          close: () => undefined,
          transaction: () => {
            const transaction: Record<string, unknown> = {
              objectStore: () => ({
                get: () => {
                  const get: Record<string, unknown> = { result: folder };
                  queueMicrotask(() => {
                    (get.onsuccess as () => void)();
                    (transaction.oncomplete as () => void)();
                  });
                  return get;
                },
              }),
            };
            return transaction;
          },
        };
        (request.onsuccess as () => void)();
      });
      return request;
    },
  };
}

beforeEach(() => void vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] }));
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("a backup never holds a save up (Discussion #1987)", () => {
  it("goes on when the permission question is never answered", async () => {
    vi.stubGlobal("indexedDB", databaseWith({ name: "Backups", queryPermission: async () => "prompt", requestPermission: () => never() }));
    const answer = allowBackupFolderForSave();
    await vi.advanceTimersByTimeAsync(20_000);
    expect(await answer).toBe("noPermission");
  });

  it("tells a granted, a refused and no folder apart", async () => {
    vi.stubGlobal("indexedDB", databaseWith({ name: "Backups", queryPermission: async () => "granted" }));
    expect(await allowBackupFolderForSave()).toBe("allowed");
    vi.stubGlobal("indexedDB", databaseWith({ name: "Backups", queryPermission: async () => "prompt", requestPermission: async () => "denied" }));
    expect(await allowBackupFolderForSave()).toBe("noPermission");
    vi.stubGlobal("indexedDB", databaseWith(undefined));
    expect(await allowBackupFolderForSave()).toBe("none");
  });

  it("goes on when the old file cannot be read in time", async () => {
    const handle = { name: "design.lyl", getFile: () => never<File>() } as unknown as LylFileHandle;
    const backup = backupFileBeforeOverwrite(handle, { projectId: "p", projectName: "design" });
    await vi.advanceTimersByTimeAsync(20_000);
    expect(await backup).toEqual({ kept: false, failed: false, folder: "none" });
  });

  it("goes on and says so when the backup itself hangs", async () => {
    vi.stubGlobal("indexedDB", { open: () => ({}) });
    const file = { size: 3, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer };
    const handle = { name: "design.lyl", getFile: async () => file } as unknown as LylFileHandle;
    const backup = backupFileBeforeOverwrite(handle, { projectId: "p", projectName: "design" });
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(await backup).toEqual({ kept: false, failed: true, folder: "none" });
  });
});
