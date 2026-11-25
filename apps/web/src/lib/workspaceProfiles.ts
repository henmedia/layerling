import { DEFAULT_SNAP_GRID, normalizeSnapGrid, normalizeWorkspaceSettings } from "@/lib/workplaneSettings";
import type { GridSize, WorkplaneWorkspaceSettings } from "@/types/layerling";

/**
 * Named workspace profiles (#850, TinkerBarn): several sets of settings beside the one of "Make default", one for each
 * printer for example. A profile holds what "Make default" holds - colours, grid, shadows, camera, shape starts, the
 * printer with its plate and the snap - and is put on an open design the same way "Use my default" is. Kept in this
 * browser.
 */
export type WorkspaceProfile = { name: string; workspace: WorkplaneWorkspaceSettings; snap: GridSize };

export const WORKSPACE_PROFILES_STORAGE_KEY = "layerling.workspaceProfiles";
export const MAX_WORKSPACE_PROFILES = 12;
export const MAX_WORKSPACE_PROFILE_NAME = 40;

export function normalizeWorkspaceProfileName(value: unknown): string {
  return typeof value === "string" ? Array.from(value.replace(/\s+/g, " ").trim()).slice(0, MAX_WORKSPACE_PROFILE_NAME).join("") : "";
}

function ownSettings(workspace: unknown): WorkplaneWorkspaceSettings {
  // A design's plates are its own, as with "Make default" (#456).
  return { ...normalizeWorkspaceSettings(workspace), plates: undefined, platesPerRow: undefined };
}

export function normalizeWorkspaceProfiles(value: unknown): WorkspaceProfile[] {
  if (!Array.isArray(value)) return [];
  const profiles: WorkspaceProfile[] = [];
  for (const entry of value) {
    if (profiles.length >= MAX_WORKSPACE_PROFILES) break;
    if (!entry || typeof entry !== "object") continue;
    const raw = entry as { name?: unknown; workspace?: unknown; snap?: unknown };
    const name = normalizeWorkspaceProfileName(raw.name);
    if (!name || !raw.workspace || typeof raw.workspace !== "object" || profiles.some((profile) => profile.name === name)) continue;
    profiles.push({ name, workspace: ownSettings(raw.workspace), snap: normalizeSnapGrid(raw.snap, DEFAULT_SNAP_GRID) });
  }
  return profiles;
}

export function readWorkspaceProfiles(storage: Pick<Storage, "getItem"> | null): WorkspaceProfile[] {
  try {
    return normalizeWorkspaceProfiles(JSON.parse(storage?.getItem(WORKSPACE_PROFILES_STORAGE_KEY) ?? "[]"));
  } catch {
    return [];
  }
}

/** False when the browser refuses to keep them. */
export function writeWorkspaceProfiles(profiles: WorkspaceProfile[], storage: Pick<Storage, "setItem" | "removeItem"> | null): boolean {
  if (!storage) return false;
  try {
    if (profiles.length) storage.setItem(WORKSPACE_PROFILES_STORAGE_KEY, JSON.stringify(normalizeWorkspaceProfiles(profiles)));
    else storage.removeItem(WORKSPACE_PROFILES_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

/** The profiles with this one saved; one of the same name takes the new settings and stays where it is. Null when there are too many. */
export function withWorkspaceProfile(profiles: readonly WorkspaceProfile[], name: string, workspace: WorkplaneWorkspaceSettings, snap: GridSize): WorkspaceProfile[] | null {
  const wanted = normalizeWorkspaceProfileName(name);
  if (!wanted) return null;
  const profile = { name: wanted, workspace: ownSettings(workspace), snap: normalizeSnapGrid(snap, DEFAULT_SNAP_GRID) };
  if (profiles.some((entry) => entry.name === wanted)) return profiles.map((entry) => (entry.name === wanted ? profile : entry));
  return profiles.length >= MAX_WORKSPACE_PROFILES ? null : [...profiles, profile];
}
