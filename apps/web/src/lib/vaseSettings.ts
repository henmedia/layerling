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

/** The body shapes offered per use: a vase's, a plant pot's and a lampshade's; the drawn one is always there. */
export const VASE_PURPOSE_PROFILES: Record<string, readonly string[]> = {
  vase: ["flasche", "bauchig", "schale", "fass", "zylinder", "trichter", "gezeichnet"],
  topf: ["topfKlassik", "topfKuebel", "topfSchale", "zylinder", "trichter", "gezeichnet"],
  lampe: ["schirmKegel", "schirmGlocke", "schirmKuppel", "schirmLaterne", "schirmTrommel", "zylinder", "gezeichnet"],
};

/**
 * What choosing a use sets: the settings that make the body that thing (a lampshade is hollow, hangs and has a carrier
 * for the socket; a plant pot is hollow with drain holes and a saucer), a body shape of that kind where the vase still
 * has one of another kind, and a size that suits it where the vase still has the size a new vase comes with. What one
 * has set oneself beyond that stays.
 */
export function vasePurposeChoice(vase: VaseSettings, purpose: string, frame: { width: number; depth: number; height: number }) {
  const patch: Partial<VaseSettings> = { purpose };
  const shapes = VASE_PURPOSE_PROFILES[purpose] ?? VASE_PURPOSE_PROFILES.vase;
  if (vase.profile !== "gezeichnet" && !shapes.includes(vase.profile)) patch.profile = shapes[0];
  const untouched = Math.abs(Math.max(frame.width, frame.depth) - DEFAULT_VASE_SIZE.width) < 0.5 && Math.abs(frame.height - DEFAULT_VASE_SIZE.height) < 0.5;
  let size: { width: number; height: number } | null = null;
  if (purpose === "lampe") {
    Object.assign(patch, { body: "hohl", lamp: vase.lamp === "keine" ? "haengend" : vase.lamp, lampSpokes: vase.lampSpokes >= 2 ? vase.lampSpokes : 3, drainHoles: 0, watertight: "nein", lidMode: "keiner", insertMode: "keine", saucerMode: "keine" });
    // A shade lets light through: a thin wall where the vase still has the one it came with.
    if (vase.wall === 2) patch.wall = 1.2;
    if (untouched) size = { width: 180, height: 160 };
  } else if (purpose === "topf") {
    Object.assign(patch, { body: "hohl", lamp: "keine", drainHoles: vase.drainHoles > 0 ? vase.drainHoles : 3, saucerMode: vase.saucerMode === "keine" ? "schale" : vase.saucerMode });
    if (untouched) size = { width: 140, height: 120 };
  } else {
    patch.lamp = "keine";
  }
  return { patch, size };
}
