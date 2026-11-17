import { describe, expect, it } from "vitest";
import { describeSaveError, formatBytes, saveFailureKind, storageLooksBroken, storageProbeText } from "@/lib/saveFailureDiagnosis";
import { designsSettled, type DesignSaveState } from "@/lib/leaveGuard";

// #1639: a Chrome on a Mac refused every save with an error that carried no text, and the note said only
// "Could not save design shapes:". The kind gives the reason, the detail line keeps the error's own name.
describe("save failure diagnosis (#1639)", () => {
  it("names a storage error without a text by its kind and keeps its name", () => {
    const quota = new Error("");
    quota.name = "QuotaExceededError";
    expect(saveFailureKind(quota)).toBe("storageFull");
    expect(describeSaveError(quota)).toBe("QuotaExceededError (Error): (no message)");
  });

  it("tells memory, size and other failures apart", () => {
    expect(saveFailureKind(new RangeError(""))).toBe("outOfMemory");
    expect(saveFailureKind(new Error("Project exceeds the 64 MB project file limit"))).toBe("tooLarge");
    expect(saveFailureKind(new Error("Could not save project shapes"))).toBe("other");
    expect(saveFailureKind(undefined)).toBe("other");
  });

  it("describes errors that are no Error, and a cause", () => {
    expect(describeSaveError(null)).toBe("(no error given)");
    expect(describeSaveError("broken")).toBe("broken");
    const outer = new Error("Write failed", { cause: new TypeError("bad value") });
    expect(describeSaveError(outer)).toBe("Error: Write failed · cause TypeError: bad value");
  });

  it("puts the storage figures and the test writes in one line", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(60 * 1024 ** 3)).toBe("60 GB");
    expect(
      storageProbeText({ usage: 30 * 1024 ** 3, quota: 60 * 1024 ** 3, indexedDb: 29 * 1024 ** 3, persisted: false, indexedDbWrite: "ok", localStorageWrite: "ok" }),
    ).toBe("storage 30 GB of 60 GB used (50 %) · IndexedDB 29 GB · persistent no · test write IndexedDB ok · localStorage ok");
    expect(storageProbeText({ indexedDbWrite: "failed, QuotaExceededError: (no message)", localStorageWrite: "ok" })).toBe(
      "storage size unknown · test write IndexedDB failed, QuotaExceededError: (no message) · localStorage ok",
    );
  });
});

describe("Save and reload waits for the save (#1639)", () => {
  const run = async (states: DesignSaveState[]) => {
    let call = 0;
    let slept = 0;
    const read = () => states[Math.min(call++, states.length - 1)];
    const settled = await designsSettled(read, async (ms) => {
      slept += ms;
    }, 800, 2000);
    return { settled, slept };
  };

  it("reloads once the save has gone through", async () => {
    const result = await run([{ saving: true, unsaved: false }, { saving: true, unsaved: false }, { saving: false, unsaved: false }]);
    expect(result.settled).toBe(true);
    expect(result.slept).toBe(1200);
  });

  it("does not reload while a design could not be stored", async () => {
    expect((await run([{ saving: false, unsaved: true }])).settled).toBe(false);
  });

  it("gives up waiting after the longest wait and does not reload", async () => {
    const result = await run([{ saving: true, unsaved: false }]);
    expect(result.settled).toBe(false);
    expect(result.slept).toBe(2000);
  });
});

// Facebook, 12.11.2026, and #1639: Chrome on a Mac refused even a tiny test write at 285 MB of 10 GB. That is broken
// storage, not a full one, and the note says how to clear it instead of "delete designs".
describe("storage that looks broken rather than full", () => {
  const MB = 1024 * 1024;
  const failed = "failed, QuotaExceededError (DOMException): (no message)";
  it("is broken when a tiny write fails with most of the room free", () => {
    expect(storageLooksBroken({ usage: 285 * MB, quota: 10240 * MB, indexedDbWrite: failed, localStorageWrite: "ok" })).toBe(true);
  });
  it("is full, not broken, when the room is nearly used up or the write goes through", () => {
    expect(storageLooksBroken({ usage: 9800 * MB, quota: 10240 * MB, indexedDbWrite: failed, localStorageWrite: "ok" })).toBe(false);
    expect(storageLooksBroken({ usage: 40 * MB, quota: 120 * MB, indexedDbWrite: failed, localStorageWrite: "ok" })).toBe(false);
    expect(storageLooksBroken({ usage: 285 * MB, quota: 10240 * MB, indexedDbWrite: "ok", localStorageWrite: "ok" })).toBe(false);
    expect(storageLooksBroken({ indexedDbWrite: failed, localStorageWrite: "ok" })).toBe(false);
  });
});
