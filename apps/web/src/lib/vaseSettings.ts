import { DEFAULTS, normalizeParams, type VaseSettings } from "@/lib/vase/vase-geometry.mjs";
import { ownPictureKey } from "@/lib/vase/vase-own-picture.mjs";

/**
 * The vase's settings, apart from its mesh (vaseShape.ts), so that the lists
 * of shapes can compare and store them without three.js.
 */

export type { VaseSettings };

export const DEFAULT_VASE_SIZE = { width: DEFAULTS.diameter, depth: DEFAULTS.diameter, height: DEFAULTS.height } as const;

/** Complete and limited settings; what the core does not know falls away. */
export function normalizeVaseSettings(input: unknown): VaseSettings {
  return normalizeParams(input ?? {});
}

/**
 * The vases (by their shape's id) whose body is built coarse just now, as the Draft detail builds it: while a value
 * of the vase is held in its panel and has been changed (lib/vaseDraft.ts). It changes how a body is built, never
 * what the vase's settings say, so nothing coarse is saved, undone to or exported.
 */
const draftBuilds = new Set<string>();

export function setVaseDraftBuild(id: string, on: boolean) {
  if (on) draftBuilds.add(id);
  else draftBuilds.delete(id);
}

export function vaseDraftBuild(id: string | undefined) {
  return id !== undefined && draftBuilds.has(id);
}

/**
 * The settings a vase in this frame is built with: its height and widest diameter are the frame's.
 * Legs moulded on stand under the body, so the body is that much lower and the whole fills the frame.
 * `draft`: built coarse (see vaseDraftBuild), with the Draft detail whatever the vase's own is.
 */
export function vaseSettingsInFrame(settings: unknown, width: number, depth: number, height: number, draft = false): VaseSettings {
  const vase = normalizeVaseSettings(settings);
  const body = vase.legMode === "angeformt" ? Math.max(20, height - vase.legHeight) : height;
  return normalizeParams({ ...vase, height: body, diameter: Math.max(width, depth), ...(draft ? { quality: "entwurf" } : {}) });
}

/** The settings that differ from the defaults: what makes this vase this vase. */
export function vaseSettingsChanges(settings: unknown): Partial<VaseSettings> {
  const full = normalizeVaseSettings(settings);
  const changes: Record<string, unknown> = {};
  (Object.keys(full) as (keyof VaseSettings)[]).forEach((key) => {
    if (key === "height" || key === "diameter") return;
    // One's own picture is there or not; its grey values are not gone through for that.
    if (key === "patternImage" ? full[key] !== null : JSON.stringify(full[key]) !== JSON.stringify(DEFAULTS[key])) changes[key] = full[key];
  });
  return changes as Partial<VaseSettings>;
}

/** Settings sent as an object or as the JSON text the scene reports; anything else is none. */
export function parseVaseSettingsInput(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value !== "string") return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Vase settings (or anything that holds some) as a text that is the same for the same vase: for the keys of caches and
 * for comparing. One's own picture for a relief stands in it by a short name (ownPictureKey), not by its grey values,
 * which are up to a third of a megabyte of text.
 */
export function vaseSettingsKey(value: unknown): string {
  return JSON.stringify(value, (key, entry: unknown) => (key === "patternImage" && entry && typeof entry === "object" ? `picture:${ownPictureKey(entry)}` : entry)) ?? "";
}

/** Whether two vase settings build the same vase. */
export function vaseSettingsEqual(a: unknown, b: unknown) {
  if (a === b) return true;
  if (!a || !b) return false;
  return vaseSettingsKey(a) === vaseSettingsKey(b);
}
