import { describe, expect, it } from "vitest";
import { DEFAULT_SNAP_GRID, normalizeWorkspaceSettings } from "@/lib/workplaneSettings";
import { MAX_WORKSPACE_PROFILES, mergedWorkspaceProfiles, type WorkspaceProfile } from "@/lib/workspaceProfiles";

const profile = (name: string, width = 200): WorkspaceProfile => ({ name, workspace: { ...normalizeWorkspaceSettings(undefined), width }, snap: DEFAULT_SNAP_GRID });

// Importing a settings file dropped this browser's own profiles without a word when both lists together were
// more than the twelve the list holds (full audit, 26.11.2026).
describe("mergedWorkspaceProfiles", () => {
  it("keeps every own profile and lets the file's new ones be the ones that do not fit", () => {
    const own = Array.from({ length: 8 }, (_, index) => profile(`own ${index}`));
    const fromFile = Array.from({ length: 8 }, (_, index) => profile(`file ${index}`));
    const merged = mergedWorkspaceProfiles(own, fromFile);
    expect(merged).toHaveLength(MAX_WORKSPACE_PROFILES);
    expect(merged.slice(0, 8).map((entry) => entry.name)).toEqual(own.map((entry) => entry.name));
    expect(merged.slice(8).map((entry) => entry.name)).toEqual(["file 0", "file 1", "file 2", "file 3"]);
  });

  it("takes a profile of the same name from the file, where the own one stood", () => {
    const merged = mergedWorkspaceProfiles([profile("A"), profile("B", 200)], [profile("B", 350), profile("C")]);
    expect(merged.map((entry) => entry.name)).toEqual(["A", "B", "C"]);
    expect(merged[1].workspace.width).toBe(350);
  });
});
