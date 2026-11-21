import { LAYER_CHECK_DEFAULTS, normalizeLayerCheckOptions, type LayerCheckOptions } from "@/lib/layerCheck";

const LAYER_CHECK_SETTINGS_KEY = "layerling.layerCheck";

type Stored = Omit<LayerCheckOptions, "buildVolume">;

/**
 * The layer check's settings as last used in this browser; the nozzle of the print check when none were kept yet. Blocked
 * storage gives the defaults.
 */
export function readLayerCheckSettings(nozzle = LAYER_CHECK_DEFAULTS.nozzle): Stored {
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(LAYER_CHECK_SETTINGS_KEY) ?? "null");
    const given = raw && typeof raw === "object" ? raw as Partial<Stored> : { nozzle };
    const { buildVolume: _volume, ...settings } = normalizeLayerCheckOptions(given);
    return settings;
  } catch {
    const { buildVolume: _volume, ...settings } = normalizeLayerCheckOptions({ nozzle });
    return settings;
  }
}

export function writeLayerCheckSettings(settings: Stored) {
  try {
    window.localStorage.setItem(LAYER_CHECK_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Blocked storage: the settings hold until the page is closed.
  }
}
