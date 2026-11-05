import type { CadModifierKind, CadModifierQuality } from "@/lib/cadModifierTypes";

/**
 * The edge tool's settings as last chosen in this browser, one set for chamfer, one for fillet and one for
 * chamfer-fillet (#1342). Before, every start of the tool set them back, and Apply and Undo start it anew on
 * the changed body, so a size or a threshold had to be set again after every step. Only what the user set
 * by hand is kept: the threshold the tool lowers by itself to reach an edge is not a choice.
 * The picked edges are not kept, and neither is the chain switch: it starts on for a first treatment and
 * off once there is one, so a chain does not run on into a rounding already made.
 */
export type EdgeModifierSettings = {
  amount?: number;
  sharpAngle?: number;
  chamferAngle?: number;
  quality?: CadModifierQuality;
  onlyVisibleEdges?: boolean;
  concave?: boolean;
};

type EdgeKind = Extract<CadModifierKind, "chamfer" | "chamfillet" | "fillet">;

export const EDGE_MODIFIER_SETTINGS_KEY = "layerling.edgeModifier.settings";
const KINDS: EdgeKind[] = ["chamfer", "chamfillet", "fillet"];
const QUALITIES: CadModifierQuality[] = ["draft", "standard", "fine"];

function edgeKind(kind: CadModifierKind): EdgeKind | null {
  return (KINDS as CadModifierKind[]).includes(kind) ? (kind as EdgeKind) : null;
}

const finite = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : undefined);

/** Only values the tool can take; anything else in storage is dropped, not guessed at. */
export function sanitizeEdgeModifierSettings(value: unknown, kind: CadModifierKind): EdgeModifierSettings {
  if (!value || typeof value !== "object") return {};
  const stored = value as Record<string, unknown>;
  const result: EdgeModifierSettings = {};
  const amount = finite(stored.amount);
  if (amount !== undefined && amount > 0) result.amount = amount;
  const sharpAngle = finite(stored.sharpAngle);
  if (sharpAngle !== undefined && sharpAngle >= 1 && sharpAngle <= 180) result.sharpAngle = sharpAngle;
  const chamferAngle = finite(stored.chamferAngle);
  const [low, high] = kind === "chamfillet" ? [15, 75] : [5, 85];
  if (chamferAngle !== undefined && chamferAngle >= low && chamferAngle <= high) result.chamferAngle = chamferAngle;
  if (QUALITIES.includes(stored.quality as CadModifierQuality)) result.quality = stored.quality as CadModifierQuality;
  if (typeof stored.onlyVisibleEdges === "boolean") result.onlyVisibleEdges = stored.onlyVisibleEdges;
  if (kind === "fillet" && typeof stored.concave === "boolean") result.concave = stored.concave;
  return result;
}

function readAll(): Record<string, unknown> {
  try {
    const stored: unknown = JSON.parse(window.localStorage.getItem(EDGE_MODIFIER_SETTINGS_KEY) ?? "{}");
    return stored && typeof stored === "object" ? (stored as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** The kept settings of one tool; blocked or empty storage gives none, and the tool's own defaults stand. */
export function readEdgeModifierSettings(kind: CadModifierKind): EdgeModifierSettings {
  const key = edgeKind(kind);
  return key ? sanitizeEdgeModifierSettings(readAll()[key], key) : {};
}

/** Keeps a changed setting of one tool, next to the ones kept before. */
export function rememberEdgeModifierSetting(kind: CadModifierKind, patch: EdgeModifierSettings) {
  const key = edgeKind(kind);
  if (!key) return;
  try {
    const all = readAll();
    const next = sanitizeEdgeModifierSettings({ ...sanitizeEdgeModifierSettings(all[key], key), ...patch }, key);
    window.localStorage.setItem(EDGE_MODIFIER_SETTINGS_KEY, JSON.stringify({ ...all, [key]: next }));
  } catch {
    // Blocked storage: the tool starts with its defaults, as before.
  }
}

/**
 * The size the tool starts with: the kept one where the body can take it (up to the largest size the
 * slider offers for it), else the size worked out from the body as before.
 */
export function startingEdgeModifierAmount(kept: EdgeModifierSettings, fallback: number, maxAmount: number) {
  return kept.amount !== undefined && kept.amount <= maxAmount ? kept.amount : fallback;
}
