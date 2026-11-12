import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { backupDesignAlreadyThere, backupEntryNames, backupFileName, backupNamePrefix, backupThumbnailPath, createBackupWriter, packBackup, SETTINGS_BACKUP_FILE, unpackBackup, unpackBackupFolders, unpackBackupSettingsText, zipHoldsDesigns } from "@/lib/projectBackup";
import { buildSettingsFile, parseSettingsFile, readBrowserSettings, settingsFileText } from "@/lib/settingsFile";
import { DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";

describe("backing up all designs", () => {
  it("names the backup after the day and the time, so two backups of one day do not replace each other (Discussion #1621)", () => {
    expect(backupFileName(new Date(2026, 8, 28, 23, 59))).toBe("layerling-backup-2026-09-28-2359.zip");
    expect(backupFileName(new Date(2026, 10, 11, 7, 5))).toBe("layerling-backup-2026-11-11-0705.zip");
  });

  it("names the backup of a folder or of one chosen design after it, safe for every system (Discussion #1317)", () => {
    expect(backupFileName(new Date(2026, 10, 5), backupNamePrefix("Lantern"))).toBe("layerling-Lantern-2026-11-05-0000.zip");
    expect(backupNamePrefix("My lantern: v2/final?")).toBe("layerling-My-lantern-v2-final");
    expect(backupNamePrefix("  ..hidden  ")).toBe("layerling-hidden");
    expect(backupNamePrefix(" /?* ")).toBe("layerling-backup");
    expect(backupNamePrefix("x".repeat(300))).toBe(`layerling-${"x".repeat(100)}`);
  });

  it("gives every design a safe, unique file name", () => {
    expect(backupEntryNames(["Halter", "Halter", "halter", "a/b: c?", "  ", "..versteckt"], "Entwurf")).toEqual([
      "Halter.lyl",
      "Halter (2).lyl",
      "halter (3).lyl",
      "a-b- c-.lyl",
      "Entwurf.lyl",
      "versteckt.lyl",
    ]);
  });

  it("brings back exactly what was packed", () => {
    const entries = [
      { name: "Eins.lyl", bytes: new Uint8Array([1, 2, 3]) },
      { name: "Zwei.lyl", bytes: new Uint8Array([4, 5]) },
    ];
    const restored = unpackBackup(packBackup(entries));
    expect(restored.map((entry) => entry.name)).toEqual(["Eins.lyl", "Zwei.lyl"]);
    expect([...restored[0].bytes]).toEqual([1, 2, 3]);
    expect([...restored[1].bytes]).toEqual([4, 5]);
  });

  it("reads designs from folders and ignores other files", () => {
    const zip = zipSync({ "Ordner/Alt.skf": new Uint8Array([9]), "liesmich.txt": strToU8("hallo") });
    expect(unpackBackup(zip).map((entry) => entry.name)).toEqual(["Alt.skf"]);
  });
});

describe("restoring a backup twice (#407)", () => {
  const here = [{ name: "Halter", createdAt: 1000 }, { name: "Dose", createdAt: 2000 }];

  it("knows a design that is already there by name and creation time", () => {
    expect(backupDesignAlreadyThere(here, { name: "Halter", createdAt: 1000 })).toBe(true);
  });

  it("adds a design that has another creation time or another name", () => {
    expect(backupDesignAlreadyThere(here, { name: "Halter", createdAt: 1001 })).toBe(false);
    expect(backupDesignAlreadyThere(here, { name: "Halter 2", createdAt: 1000 })).toBe(false);
    expect(backupDesignAlreadyThere([], { name: "Halter", createdAt: 1000 })).toBe(false);
  });
});

describe("the card pictures in a backup", () => {
  it("lie next to their design under the same name", () => {
    expect(backupThumbnailPath("Halter.lyl")).toBe("Halter.png");
    expect(backupThumbnailPath("Folders/Werkstatt/Halter (2).lyl")).toBe("Folders/Werkstatt/Halter (2).png");
    expect(backupThumbnailPath("Alt.SKF")).toBe("Alt.png");
  });

  it("come back with their design, and a design without one comes back without", () => {
    const picture = new Uint8Array([137, 80, 78, 71]);
    const restored = unpackBackup(packBackup([
      { name: "Folders/Werkstatt/Halter.lyl", bytes: strToU8("a") },
      { name: "Folders/Werkstatt/Halter.png", bytes: picture },
      { name: "Ohne.lyl", bytes: strToU8("b") },
    ]));
    expect(restored.map((entry) => entry.name)).toEqual(["Halter.lyl", "Ohne.lyl"]);
    expect(restored[0].thumbnail).toEqual(picture);
    expect(restored[0].folder).toEqual(["Werkstatt"]);
    expect("thumbnail" in restored[1]).toBe(false);
  });
});

describe("a backup written entry by entry (#887)", () => {
  it("holds the same as packBackup: designs in folders, their pictures and an empty folder", async () => {
    const entries = [
      { name: "Eins.lyl", bytes: new Uint8Array([1, 2, 3]) },
      { name: "Folders/Werkstatt/Zwei.lyl", bytes: new Uint8Array(70_000).fill(7) },
      { name: "Folders/Werkstatt/Zwei.png", bytes: new Uint8Array([9, 9]) },
      { name: "Folders/Leer/", bytes: new Uint8Array() },
    ];
    const writer = createBackupWriter(new Date(2026, 9, 26));
    for (const entry of entries) writer.add(entry.name, entry.bytes);
    const blob = writer.finish();
    expect(blob.type).toBe("application/zip");
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(unpackBackup(bytes).map((design) => [design.name, design.folder, design.bytes.length, design.thumbnail?.length])).toEqual(
      unpackBackup(packBackup(entries)).map((design) => [design.name, design.folder, design.bytes.length, design.thumbnail?.length]),
    );
    expect(unpackBackup(bytes).find((design) => design.name === "Zwei.lyl")!.bytes.every((value) => value === 7)).toBe(true);
    expect(unpackBackupFolders(bytes)).toEqual([["Leer"]]);
  });
});

describe("the settings in a backup of all designs (Discussion #1678)", () => {
  it("come back as the settings file they went in as, and are not taken for a design", () => {
    const file = buildSettingsFile({ ...DEFAULT_WORKPLANE_WORKSPACE, units: "in" }, "0.5 mm", readBrowserSettings(null), new Date(2026, 10, 12));
    const bytes = packBackup([
      { name: "Halter.lyl", bytes: strToU8("lyl") },
      { name: SETTINGS_BACKUP_FILE, bytes: strToU8(settingsFileText(file)) },
    ]);
    const parsed = parseSettingsFile(unpackBackupSettingsText(bytes)!);
    expect(parsed?.workspace.units).toBe("in");
    expect(parsed?.snap).toBe("0.5 mm");
    expect(unpackBackup(bytes).map((design) => design.name)).toEqual(["Halter.lyl"]);
    expect(zipHoldsDesigns(bytes)).toBe(true);
  });

  it("are missing from an older backup, and from a file that is no ZIP", () => {
    expect(unpackBackupSettingsText(packBackup([{ name: "Halter.lyl", bytes: strToU8("lyl") }]))).toBeNull();
    expect(unpackBackupSettingsText(strToU8("not a zip"))).toBeNull();
  });

  it("only count at the top of the ZIP, not a file of that name in a folder", () => {
    const bytes = packBackup([{ name: `Folders/Mine/${SETTINGS_BACKUP_FILE}`, bytes: strToU8("{}") }]);
    expect(unpackBackupSettingsText(bytes)).toBeNull();
  });
});
