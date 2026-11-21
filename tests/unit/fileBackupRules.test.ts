import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import {
  BACKUP_STORE_LIMIT_BYTES,
  backupNameStem,
  backupStamp,
  backupsToDrop,
  backupUrgency,
  designContentOf,
  DAY_MS,
  DEFAULT_FILE_BACKUP_SETTINGS,
  editorBackupReminderDue,
  folderBackupName,
  folderBackupsToRemove,
  localDay,
  newestInGroup,
  normalizeFileBackupSettings,
  SNAPSHOT_COUNT,
  type FileBackupMeta,
} from "@/lib/fileBackupRules";

let next = 0;
const backup = (patch: Partial<FileBackupMeta>): FileBackupMeta => ({
  id: `b${(next += 1)}`,
  kind: "overwrite",
  createdAt: next * 1000,
  projectId: "p1",
  projectName: "Bracket",
  fileName: "Bracket.lyl",
  groupKey: "file:a",
  size: 1000,
  hash: `h${next}`,
  thumbnail: null,
  ...patch,
});

describe("normalizeFileBackupSettings", () => {
  it("starts with 5 earlier versions, a state every 10 minutes and a reminder after 7 days", () => {
    expect(normalizeFileBackupSettings(null)).toEqual({ overwriteCount: 5, snapshotMinutes: 10, reminderDays: 7 });
  });

  it("keeps the choices the settings offer and drops anything else", () => {
    expect(normalizeFileBackupSettings({ overwriteCount: 0, snapshotMinutes: 30, reminderDays: 0 })).toEqual({ overwriteCount: 0, snapshotMinutes: 30, reminderDays: 0 });
    expect(normalizeFileBackupSettings({ overwriteCount: 7, snapshotMinutes: "10", reminderDays: -1 })).toEqual(DEFAULT_FILE_BACKUP_SETTINGS);
  });
});

describe("backupsToDrop", () => {
  it("lets the oldest of a file go beyond the number kept", () => {
    const old = [1, 2, 3, 4, 5].map((n) => backup({ id: `o${n}`, createdAt: n }));
    const added = backup({ id: "new", createdAt: 10 });
    expect(backupsToDrop([...old, added], added, { ...DEFAULT_FILE_BACKUP_SETTINGS, overwriteCount: 5 })).toEqual(["o1"]);
    expect(backupsToDrop([...old, added], added, { ...DEFAULT_FILE_BACKUP_SETTINGS, overwriteCount: 3 }).sort()).toEqual(["o1", "o2", "o3"]);
  });

  it("counts each file and each design on its own, and states apart from files", () => {
    const other = [1, 2, 3].map((n) => backup({ id: `x${n}`, groupKey: "file:b", createdAt: n }));
    const snapshots = Array.from({ length: SNAPSHOT_COUNT }, (_, n) => backup({ id: `s${n}`, kind: "snapshot", groupKey: "project:p1", createdAt: n }));
    const added = backup({ id: "new", groupKey: "file:a", createdAt: 100 });
    expect(backupsToDrop([...other, ...snapshots, added], added, { ...DEFAULT_FILE_BACKUP_SETTINGS, overwriteCount: 1 })).toEqual([]);
    const addedSnapshot = backup({ id: "snap", kind: "snapshot", groupKey: "project:p1", createdAt: 100 });
    expect(backupsToDrop([...snapshots, addedSnapshot], addedSnapshot, DEFAULT_FILE_BACKUP_SETTINGS)).toEqual(["s0"]);
  });

  it("keeps all of them under the size limit, the oldest states going first and the new one never", () => {
    const big = BACKUP_STORE_LIMIT_BYTES / 4;
    const file = backup({ id: "file", createdAt: 1, size: big, groupKey: "file:x" });
    const stateOld = backup({ id: "stateOld", kind: "snapshot", groupKey: "project:a", createdAt: 2, size: big });
    const stateNew = backup({ id: "stateNew", kind: "snapshot", groupKey: "project:b", createdAt: 3, size: big });
    const added = backup({ id: "added", createdAt: 4, size: big * 2.5, groupKey: "file:y" });
    expect(backupsToDrop([file, stateOld, stateNew, added], added, DEFAULT_FILE_BACKUP_SETTINGS)).toEqual(["stateOld", "stateNew"]);
  });
});

describe("newestInGroup", () => {
  it("finds the newest backup of one file to leave out a copy that is the same", () => {
    const a = backup({ id: "a", createdAt: 5 });
    const b = backup({ id: "b", createdAt: 9 });
    const elsewhere = backup({ id: "c", createdAt: 20, groupKey: "file:z" });
    expect(newestInGroup([a, b, elsewhere], "file:a", "overwrite")?.id).toBe("b");
    expect(newestInGroup([a, b], "file:a", "snapshot")).toBeNull();
  });
});

describe("names in the backup folder", () => {
  const at = new Date(2026, 10, 11, 20, 31, 5);

  it("names a copy after the design and the time, a state with auto", () => {
    expect(backupStamp(at)).toBe("2026-11-11 20-31-05");
    expect(folderBackupName("Bracket.lyl", at, "overwrite")).toBe("Bracket 2026-11-11 20-31-05.lyl");
    expect(folderBackupName("Bracket", at, "snapshot")).toBe("Bracket 2026-11-11 20-31-05 auto.lyl");
  });

  it("leaves out what a file name may not hold", () => {
    expect(backupNameStem('a/b:c*?"<>|d. ')).toBe("a_b_c_d");
    expect(backupNameStem("   ")).toBe("layerling");
  });

  it("removes only its own older copies of that design and kind", () => {
    const names = [
      "Bracket 2026-11-01 10-00-00.lyl",
      "Bracket 2026-11-03 10-00-00.lyl",
      "Bracket 2026-11-02 10-00-00.lyl",
      "Bracket 2026-11-02 11-00-00 auto.lyl",
      "Bracket 2.lyl",
      "Bracket (copy) 2026-11-01 10-00-00.lyl",
      "Other 2026-10-01 10-00-00.lyl",
      "notes.txt",
    ];
    expect(folderBackupsToRemove(names, "Bracket", "overwrite", 2)).toEqual(["Bracket 2026-11-01 10-00-00.lyl"]);
    expect(folderBackupsToRemove(names, "Bracket", "snapshot", 0)).toEqual(["Bracket 2026-11-02 11-00-00 auto.lyl"]);
    expect(folderBackupsToRemove(names, "Bracket", "overwrite", 5)).toEqual([]);
  });
});

describe("backupUrgency", () => {
  const now = Date.UTC(2026, 10, 11);
  const designs = (count: number, updatedAt: number) => Array.from({ length: count }, () => ({ updatedAt }));

  it("stays calm when everything is in the last backup, and as it always was soon after one", () => {
    expect(backupUrgency({ lastFullBackup: now - 40 * DAY_MS, designs: designs(5, now - 50 * DAY_MS), now, reminderDays: 7 })).toBe("current");
    expect(backupUrgency({ lastFullBackup: now - 2 * DAY_MS, designs: designs(5, now), now, reminderDays: 7 })).toBe("changed");
  });

  it("grows louder after the reminder's days, and urgent after a month", () => {
    expect(backupUrgency({ lastFullBackup: now - 7 * DAY_MS, designs: designs(1, now), now, reminderDays: 7 })).toBe("overdue");
    expect(backupUrgency({ lastFullBackup: now - 30 * DAY_MS, designs: designs(1, now), now, reminderDays: 7 })).toBe("urgent");
  });

  it("is urgent with more than three designs and no backup at all, not with a few", () => {
    expect(backupUrgency({ lastFullBackup: null, designs: designs(4, now), now, reminderDays: 7 })).toBe("urgent");
    expect(backupUrgency({ lastFullBackup: null, designs: designs(3, now), now, reminderDays: 7 })).toBe("changed");
  });

  it("never grows louder with reminders switched off", () => {
    expect(backupUrgency({ lastFullBackup: now - 90 * DAY_MS, designs: designs(9, now), now, reminderDays: 0 })).toBe("changed");
    expect(backupUrgency({ lastFullBackup: null, designs: designs(9, now), now, reminderDays: 0 })).toBe("changed");
  });
});

describe("editorBackupReminderDue", () => {
  const now = new Date(2026, 10, 11, 15).getTime();
  const base = { lastFullBackup: now - 8 * DAY_MS, firstUse: now - 100 * DAY_MS, designModifiedAt: now, now, reminderDays: 7, lastShownDay: null };

  it("reminds when the last full backup is older than the days set and the design changed since", () => {
    expect(editorBackupReminderDue(base)).toBe(true);
    expect(editorBackupReminderDue({ ...base, lastFullBackup: now - 3 * DAY_MS })).toBe(false);
    expect(editorBackupReminderDue({ ...base, designModifiedAt: base.lastFullBackup - 1 })).toBe(false);
  });

  it("comes once a day at most, and not at all when switched off", () => {
    expect(editorBackupReminderDue({ ...base, lastShownDay: localDay(now) })).toBe(false);
    expect(editorBackupReminderDue({ ...base, lastShownDay: localDay(now - DAY_MS) })).toBe(true);
    expect(editorBackupReminderDue({ ...base, reminderDays: 0 })).toBe(false);
  });

  it("without any backup, counts from the first day layerling was used here", () => {
    expect(editorBackupReminderDue({ ...base, lastFullBackup: null, firstUse: now - 2 * DAY_MS })).toBe(false);
    expect(editorBackupReminderDue({ ...base, lastFullBackup: null, firstUse: now - 7 * DAY_MS })).toBe(true);
  });
});

describe("designContentOf", () => {
  const pack = (modifiedAt: string, picture: number[], shapes = "[1]") => zipSync({
    "project.json": strToU8(JSON.stringify({ metadata: { projectName: "Bracket", modifiedAt }, shapes })),
    "thumbnail.png": new Uint8Array(picture),
  });
  const same = (a: Uint8Array, b: Uint8Array) => Buffer.from(designContentOf(a)).equals(Buffer.from(designContentOf(b)));

  it("takes two saves of the same design as the same, whatever their picture and time", () => {
    expect(same(pack("2026-11-11T10:00:00Z", [1, 2, 3]), pack("2026-11-11T11:00:00Z", [9, 9]))).toBe(true);
  });

  it("tells a changed design apart", () => {
    expect(same(pack("2026-11-11T10:00:00Z", [1]), pack("2026-11-11T10:00:00Z", [1], "[1,2]"))).toBe(false);
  });

  it("takes a package that is no ZIP as it is", () => {
    const json = strToU8("{\"shapes\":[]}");
    expect(designContentOf(json)).toBe(json);
  });
});
