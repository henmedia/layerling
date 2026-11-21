import { MOLD_DEFAULTS, normalizeMoldOptions, type MoldOptions } from "@/lib/moldTool";

const MOLD_SETTINGS_KEY = "layerling.moldTool";

/**
 * The mold tool's settings as last used to make a mold in this browser, the defaults when there are none (or storage is
 * blocked). The vents switched off belong to one master and are not kept, nor the sprue moved for it, nor the openings
 * the user set on it (Discussion #1806); that the user sets the openings is kept, as the other switches are.
 */
export function readMoldSettings(): MoldOptions {
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(MOLD_SETTINGS_KEY) ?? "null");
    const stored = raw && typeof raw === "object" ? (raw as Partial<Record<keyof MoldOptions, unknown>>) : {};
    return { ...normalizeMoldOptions(stored, MOLD_DEFAULTS), ventsOff: [], sprueShiftX: 0, sprueShiftY: 0, openings: [] };
  } catch {
    return { ...MOLD_DEFAULTS };
  }
}

export function writeMoldSettings(settings: MoldOptions) {
  try {
    const { ventsOff: _vents, sprueShiftX: _x, sprueShiftY: _y, openings: _openings, ...kept } = settings;
    window.localStorage.setItem(MOLD_SETTINGS_KEY, JSON.stringify(kept));
  } catch {
    // Blocked storage: the defaults again next time.
  }
}
