import { describe, expect, it } from "vitest";
import {
  freeSelectionSetName,
  MAX_SELECTION_SETS,
  normalizeSelectionSets,
  selectionSetIds,
  withRenamedSelectionSet,
  withSelectionSet,
} from "@/lib/selectionSets";
import { exportLylProject, importLylProject } from "@/lib/lylProject";
import { DEFAULT_SNAP_GRID, normalizeWorkspaceSettings } from "@/lib/workplaneSettings";
import { MAX_WORKSPACE_PROFILES, normalizeWorkspaceProfiles, readWorkspaceProfiles, withWorkspaceProfile, WORKSPACE_PROFILES_STORAGE_KEY, writeWorkspaceProfiles, type WorkspaceProfile } from "@/lib/workspaceProfiles";
import { buildSettingsFile, parseSettingsFile, readBrowserSettings, settingsFileText } from "@/lib/settingsFile";

describe("named selections (Discussion #1472)", () => {
  it("takes only whole entries from storage or a file", () => {
    expect(normalizeSelectionSets("x")).toBeNull();
    expect(normalizeSelectionSets([])).toBeNull();
    expect(normalizeSelectionSets([{ name: "  a  b ", ids: ["1", "1", 2, ""] }, { name: "a b", ids: ["3"] }, { name: "", ids: ["4"] }, { name: "c", ids: [] }, null]))
      .toEqual([{ name: "a b", ids: ["1"] }]);
    expect(normalizeSelectionSets(Array.from({ length: 80 }, (_, index) => ({ name: `n${index}`, ids: ["1"] })))).toHaveLength(MAX_SELECTION_SETS);
  });

  it("saves, replaces and renames", () => {
    const numbered = (number: number) => `Selection ${number}`;
    let sets = withSelectionSet([], freeSelectionSetName([], numbered), ["a", "b", "a"]);
    expect(sets).toEqual([{ name: "Selection 1", ids: ["a", "b"] }]);
    sets = withSelectionSet(sets, freeSelectionSetName(sets, numbered), ["c"]);
    expect(sets[1].name).toBe("Selection 2");
    expect(withSelectionSet(sets, "Selection 1", ["z"])[0]).toEqual({ name: "Selection 1", ids: ["z"] });
    expect(withRenamedSelectionSet(sets, "Selection 1", "Lid")[0].name).toBe("Lid");
    expect(withRenamedSelectionSet(sets, "Selection 1", "Selection 2")).toEqual(sets);
    expect(withRenamedSelectionSet(sets, "Selection 1", "  ")).toEqual(sets);
  });

  it("finds only what is in the design now", () => {
    expect(selectionSetIds({ name: "a", ids: ["1", "2", "3"] }, [{ id: "3" }, { id: "9" }, { id: "1" }])).toEqual(["3", "1"]);
  });

  it("finds a part again after it was grouped and ungrouped", () => {
    const ids = ["box-1-ungroup-abc", "box-1-ungroup-x-bore-y", "box-12", "cone-2-group-child-q"];
    expect(selectionSetIds({ name: "a", ids: ["box-1", "cone-2-ungroup-old"] }, ids.map((id) => ({ id })))).toEqual(["box-1-ungroup-abc", "cone-2-group-child-q"]);
  });

  it("travels in a .lyl file", async () => {
    const pack = (selectionSets: { name: string; ids: string[] }[] | null) => exportLylProject({
      projectName: "Test", shapes: [], history: [], historyIndex: 0, notes: [], assets: [],
      workspace: normalizeWorkspaceSettings(undefined), snapGrid: DEFAULT_SNAP_GRID, placementElevation: 0,
      view: null, savedViews: null, drawingInfo: null, cornerRulers: null, tapeMeasurements: null, selectionSets,
    } as unknown as Parameters<typeof exportLylProject>[0]);
    const sets = [{ name: "Lid", ids: ["shape-1", "shape-2"] }];
    expect((await importLylProject(await pack(sets))).selectionSets).toEqual(sets);
    expect((await importLylProject(await pack(null))).selectionSets).toBeUndefined();
  });
});

describe("workspace profiles (#850)", () => {
  const workspace = normalizeWorkspaceSettings({ width: 180, depth: 180, showGrid: false });

  function memory() {
    const values = new Map<string, string>();
    return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => void values.set(key, value), removeItem: (key: string) => void values.delete(key) };
  }

  it("keeps a profile per name, without the plates of the design", () => {
    const storage = memory();
    const profiles = withWorkspaceProfile([], " A1  mini ", { ...workspace, platesPerRow: 2 }, DEFAULT_SNAP_GRID) as WorkspaceProfile[];
    expect(writeWorkspaceProfiles(profiles, storage)).toBe(true);
    const read = readWorkspaceProfiles(storage);
    expect(read).toHaveLength(1);
    expect(read[0].name).toBe("A1 mini");
    expect(read[0].workspace.showGrid).toBe(false);
    expect(read[0].workspace.platesPerRow).toBeUndefined();
    const replaced = withWorkspaceProfile(read, "A1 mini", normalizeWorkspaceSettings(undefined), DEFAULT_SNAP_GRID) as WorkspaceProfile[];
    expect(replaced).toHaveLength(1);
    expect(replaced[0].workspace.showGrid).toBe(true);
    writeWorkspaceProfiles([], storage);
    expect(storage.getItem(WORKSPACE_PROFILES_STORAGE_KEY)).toBeNull();
  });

  it("stops at the limit and reads broken storage as none", () => {
    let profiles: WorkspaceProfile[] = [];
    for (let index = 0; index < MAX_WORKSPACE_PROFILES; index += 1) profiles = withWorkspaceProfile(profiles, `P${index}`, workspace, DEFAULT_SNAP_GRID) as WorkspaceProfile[];
    expect(withWorkspaceProfile(profiles, "one more", workspace, DEFAULT_SNAP_GRID)).toBeNull();
    expect(withWorkspaceProfile(profiles, "P3", workspace, DEFAULT_SNAP_GRID)).toHaveLength(MAX_WORKSPACE_PROFILES);
    expect(normalizeWorkspaceProfiles([{ name: "x" }, 3, { workspace: {} }])).toEqual([]);
    expect(readWorkspaceProfiles({ getItem: () => "{" })).toEqual([]);
  });

  it("goes into the settings file and comes back", () => {
    const storage = memory();
    writeWorkspaceProfiles(withWorkspaceProfile([], "A1", workspace, DEFAULT_SNAP_GRID) as WorkspaceProfile[], storage);
    const file = buildSettingsFile(workspace, DEFAULT_SNAP_GRID, readBrowserSettings(storage), new Date(0));
    const parsed = parseSettingsFile(settingsFileText(file));
    expect(parsed?.browser.workspaceProfiles?.map((profile) => profile.name)).toEqual(["A1"]);
  });
});
