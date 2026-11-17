import { describe, expect, it } from "vitest";
import {
  childFolders,
  createDesignFolder,
  deleteDesignFolder,
  designFolderNameProblem,
  ensureFolderPath,
  folderAndDescendants,
  foldersEmptiedByMove,
  folderContents,
  folderOfDesign,
  folderPathFrom,
  folderPathNames,
  folderTrail,
  moveDesignFolder,
  moveDesignsToFolder,
  normalizeDesignFolders,
  renameDesignFolder,
  suggestDesignFolderName,
  type DesignFolder,
} from "@/lib/designFolders";
import { backupEntryPaths, backupFolderPaths, packBackup, unpackBackup, unpackBackupFolders } from "@/lib/projectBackup";

/* Folders for the designs of this browser (#496). */

const folders: DesignFolder[] = [
  { id: "a", name: "Brackets", parentId: null, createdAt: 1 },
  { id: "b", name: "Shelf", parentId: "a", createdAt: 2 },
  { id: "c", name: "Garden", parentId: null, createdAt: 3 },
];
const designs = [
  { id: "d1", name: "Hook", folderId: "a" },
  { id: "d2", name: "Plate", folderId: "b" },
  { id: "d3", name: "Cup", folderId: null },
];

describe("the stored list of folders", () => {
  it("keeps what is a folder and drops the rest", () => {
    const list = normalizeDesignFolders([
      { id: "a", name: " Brackets ", parentId: null, createdAt: 1 },
      { id: "a", name: "Twice", parentId: null },
      { id: "x", name: "" },
      { name: "No id" },
      "nonsense",
      null,
    ]);
    expect(list).toEqual([{ id: "a", name: "Brackets", parentId: null, createdAt: 1 }]);
    expect(normalizeDesignFolders("not a list")).toEqual([]);
  });

  it("moves a folder whose parent is gone to the top level and cuts a loop", () => {
    const list = normalizeDesignFolders([
      { id: "o", name: "Orphan", parentId: "gone" },
      { id: "p", name: "P", parentId: "q" },
      { id: "q", name: "Q", parentId: "p" },
    ]);
    expect(list.find((folder) => folder.id === "o")?.parentId).toBeNull();
    // Somewhere the loop is cut, and every folder is reachable from the top again.
    for (const folder of list) expect(folderTrail(list, folder.id)[0].parentId).toBeNull();
  });
});

describe("finding one's way", () => {
  it("lists the folders in a folder by name", () => {
    expect(childFolders(folders, null).map((folder) => folder.name)).toEqual(["Brackets", "Garden"]);
    expect(childFolders(folders, "a").map((folder) => folder.id)).toEqual(["b"]);
  });

  it("knows the way down to a folder", () => {
    expect(folderTrail(folders, "b").map((folder) => folder.name)).toEqual(["Brackets", "Shelf"]);
    expect(folderTrail(folders, null)).toEqual([]);
    expect(folderPathNames(folders, "b")).toEqual(["Brackets", "Shelf"]);
  });

  it("counts what lies directly in a folder", () => {
    expect(folderContents(folders, designs, "a")).toEqual({ designs: 1, folders: 1 });
    expect(folderContents(folders, designs, "c")).toEqual({ designs: 0, folders: 0 });
  });

  it("treats a design in a folder that is gone as one at the top level", () => {
    expect(folderOfDesign(folders, "a")).toBe("a");
    expect(folderOfDesign(folders, "gone")).toBeNull();
    expect(folderOfDesign(folders, undefined)).toBeNull();
  });

  it("finds a folder with everything inside it", () => {
    expect([...folderAndDescendants(folders, "a")].sort()).toEqual(["a", "b"]);
  });
});

describe("names", () => {
  it("wants a name that is free next to it, whatever the case", () => {
    expect(designFolderNameProblem(folders, "garden", null)).toBe("taken");
    expect(designFolderNameProblem(folders, "Garden", "a")).toBeNull();
    expect(designFolderNameProblem(folders, "  ", null)).toBe("empty");
    expect(designFolderNameProblem(folders, "a/b", null)).toBe("chars");
    // Renaming a folder to its own name is no clash.
    expect(designFolderNameProblem(folders, "Brackets", null, "a")).toBeNull();
  });

  it("suggests a free name", () => {
    expect(suggestDesignFolderName(folders, "Brackets", null)).toBe("Brackets 2");
    expect(suggestDesignFolderName(folders, "New folder", null)).toBe("New folder");
  });
});

describe("changing folders", () => {
  it("makes and renames a folder", () => {
    const made = createDesignFolder(folders, " Toys ", "c", "t", 9);
    expect(made.find((folder) => folder.id === "t")).toEqual({ id: "t", name: "Toys", parentId: "c", createdAt: 9 });
    // A parent that does not exist means the top level.
    expect(createDesignFolder(folders, "X", "gone", "x", 9).find((folder) => folder.id === "x")?.parentId).toBeNull();
    expect(renameDesignFolder(folders, "c", "Balcony").find((folder) => folder.id === "c")?.name).toBe("Balcony");
    expect(renameDesignFolder(folders, "c", "  ").find((folder) => folder.id === "c")?.name).toBe("Garden");
  });

  it("puts designs into a folder and back to the top", () => {
    const moved = moveDesignsToFolder(designs, ["d3"], "c");
    expect(moved.find((design) => design.id === "d3")?.folderId).toBe("c");
    expect(moveDesignsToFolder(moved, ["d3"], null).find((design) => design.id === "d3")?.folderId).toBeNull();
    // The others stay where they are.
    expect(moved.find((design) => design.id === "d1")?.folderId).toBe("a");
  });

  it("moves a folder, but never into itself or a folder inside it", () => {
    expect(moveDesignFolder(folders, "c", "a").find((folder) => folder.id === "c")?.parentId).toBe("a");
    expect(moveDesignFolder(folders, "a", "b")).toEqual(folders);
    expect(moveDesignFolder(folders, "a", "a")).toEqual(folders);
    expect(moveDesignFolder(folders, "b", null).find((folder) => folder.id === "b")?.parentId).toBeNull();
    // A name that is taken where it lands gets a number.
    const clash = [...folders, { id: "s", name: "Shelf", parentId: null, createdAt: 4 }];
    expect(moveDesignFolder(clash, "b", null).find((folder) => folder.id === "b")?.name).toBe("Shelf 2");
  });

  it("deletes a folder and nothing in it: designs and folders move one level up", () => {
    const { folders: left, designs: kept } = deleteDesignFolder(folders, designs, "a");
    expect(left.map((folder) => folder.id).sort()).toEqual(["b", "c"]);
    expect(left.find((folder) => folder.id === "b")?.parentId).toBeNull();
    expect(kept).toHaveLength(3);
    expect(kept.find((design) => design.id === "d1")?.folderId).toBeNull();
    expect(kept.find((design) => design.id === "d2")?.folderId).toBe("b");
  });

  it("gives a folder that moves up a number when its name is taken there", () => {
    const clash = [...folders, { id: "s", name: "Shelf", parentId: null, createdAt: 4 }];
    const { folders: left } = deleteDesignFolder(clash, designs, "a");
    expect(left.find((folder) => folder.id === "b")?.name).toBe("Shelf 2");
  });
});

describe("folders in a backup", () => {
  it("finds or makes the folders of a path", () => {
    let next = 0;
    const makeId = () => `n${(next += 1)}`;
    const found = ensureFolderPath(folders, ["brackets", "Shelf"], makeId, 5);
    expect(found.folderId).toBe("b");
    expect(found.folders).toHaveLength(3);
    const made = ensureFolderPath(folders, ["Brackets", "New", "Deeper"], makeId, 5);
    expect(folderPathNames(made.folders, made.folderId)).toEqual(["Brackets", "New", "Deeper"]);
    expect(ensureFolderPath(folders, [], makeId, 5).folderId).toBeNull();
  });

  it("writes designs in folders under Folders/ and reads the folders back", () => {
    const paths = backupEntryPaths([
      { name: "Cup", folder: [] },
      { name: "Hook", folder: ["Brackets"] },
      { name: "Hook", folder: ["Brackets"] },
      { name: "Plate", folder: ["Brackets", "Shelf"] },
      { name: "Odd", folder: ["Custom shapes"] },
    ]);
    expect(paths).toEqual([
      "Cup.lyl",
      "Folders/Brackets/Hook.lyl",
      "Folders/Brackets/Hook (2).lyl",
      "Folders/Brackets/Shelf/Plate.lyl",
      // A folder of one's own called "Custom shapes" is no folder of shapes.
      "Folders/Custom shapes/Odd.lyl",
    ]);
    const bytes = new Uint8Array([1, 2, 3]);
    const zip = packBackup(paths.map((name) => ({ name, bytes })));
    const back = unpackBackup(zip);
    expect(back.map((entry) => [entry.name, entry.folder])).toEqual([
      ["Cup.lyl", []],
      ["Hook.lyl", ["Brackets"]],
      ["Hook (2).lyl", ["Brackets"]],
      ["Plate.lyl", ["Brackets", "Shelf"]],
      ["Odd.lyl", ["Custom shapes"]],
    ]);
  });

  it("brings a design from an older backup, or from elsewhere in a ZIP, back at the top level", () => {
    const bytes = new Uint8Array([1]);
    const back = unpackBackup(packBackup([{ name: "Old.lyl", bytes }, { name: "Somewhere/Else.lyl", bytes }]));
    expect(back.map((entry) => entry.folder)).toEqual([[], []]);
  });

  it("keeps an empty folder as an empty folder of the ZIP", () => {
    const bytes = new Uint8Array([1]);
    const zip = packBackup([
      { name: "Cup.lyl", bytes },
      ...backupFolderPaths([["Brackets", "Shelf"], ["Garden"]]).map((name) => ({ name, bytes: new Uint8Array() })),
    ]);
    expect(unpackBackupFolders(zip)).toEqual([["Brackets", "Shelf"], ["Garden"]]);
    // They are no designs.
    expect(unpackBackup(zip).map((entry) => entry.name)).toEqual(["Cup.lyl"]);
  });

  it("makes a path safe however a folder is called", () => {
    expect(backupEntryPaths([{ name: "A", folder: ["x:y", ".hidden", ""] }])).toEqual(["Folders/x-y/hidden/folder/A.lyl"]);
  });
});

describe("design folders onto the server (Discussion #1572)", () => {
  const folders: DesignFolder[] = [
    { id: "alice", name: "Alice", parentId: null, createdAt: 1 },
    { id: "tmnt", name: "TMNT", parentId: null, createdAt: 1 },
    { id: "boxes", name: "Boxes", parentId: "tmnt", createdAt: 1 },
    { id: "empty", name: "Empty", parentId: "tmnt", createdAt: 1 },
  ];

  it("takes the whole way for all designs, and starts at the folder put on the server", () => {
    expect(folderPathFrom(folders, "boxes", null)).toEqual(["TMNT", "Boxes"]);
    expect(folderPathFrom(folders, null, null)).toEqual([]);
    expect(folderPathFrom(folders, "boxes", "tmnt")).toEqual(["TMNT", "Boxes"]);
    expect(folderPathFrom(folders, "boxes", "boxes")).toEqual(["Boxes"]);
    expect(folderPathFrom(folders, "alice", "tmnt")).toEqual([]);
    expect(folderPathFrom(folders, "gone", null)).toEqual([]);
  });

  it("leaves every folder of the scope empty when all went, empty ones too", () => {
    expect([...foldersEmptiedByMove(folders, [], new Set(folders.map((folder) => folder.id)))].sort()).toEqual(["alice", "boxes", "empty", "tmnt"]);
  });

  it("keeps a folder with a design that could not go, and the folders on the way to it", () => {
    const staying = [{ id: "d1", folderId: "boxes" }];
    expect([...foldersEmptiedByMove(folders, staying, new Set(folders.map((folder) => folder.id)))].sort()).toEqual(["alice", "empty"]);
  });

  it("only counts the folders of the scope", () => {
    expect([...foldersEmptiedByMove(folders, [{ id: "d1", folderId: null }], folderAndDescendants(folders, "tmnt"))].sort()).toEqual(["boxes", "empty", "tmnt"]);
  });

  it("counts a design in a folder that is gone as at the top level", () => {
    expect([...foldersEmptiedByMove(folders, [{ id: "d1", folderId: "gone" }], new Set(["alice"]))]).toEqual(["alice"]);
  });
});
