// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { backupNoteState, readLastFullBackup, rememberFullBackup } from "@/lib/backupState";

describe("where the browser's designs stand against the last backup of them all", () => {
  afterEach(() => window.localStorage.clear());

  it("says not backed up yet, changed since, or all backed up", () => {
    const designs = [{ updatedAt: 1_000 }, { updatedAt: 5_000 }, { updatedAt: 9_000 }];
    expect(backupNoteState(designs, null)).toEqual({ kind: "never" });
    // Changed or added after the backup: not in it.
    expect(backupNoteState(designs, 4_000)).toEqual({ kind: "changed", at: 4_000, count: 2 });
    expect(backupNoteState(designs, 9_000)).toEqual({ kind: "current", at: 9_000 });
    // A design deleted since the backup leaves nothing to back up.
    expect(backupNoteState([], 9_000)).toEqual({ kind: "current", at: 9_000 });
  });

  it("remembers the time in this browser", () => {
    expect(readLastFullBackup()).toBeNull();
    rememberFullBackup(1_731_240_000_000);
    expect(readLastFullBackup()).toBe(1_731_240_000_000);
    window.localStorage.setItem("layerling.lastFullBackupAt", "rubbish");
    expect(readLastFullBackup()).toBeNull();
  });
});
