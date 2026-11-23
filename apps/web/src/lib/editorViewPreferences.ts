// View preferences of the app, not of a design: they hold for every design, including ones saved before they existed.
// Shared by the 3D view and the settings window of the sketch, where there is no 3D view (Discussion #1990).
export const MOVE_DIMENSIONS_ENABLED_STORAGE_KEY = "layerling.editor.moveDimensionsEnabled";
export const ORIGIN_DIMENSIONS_ENABLED_STORAGE_KEY = "layerling.editor.originDimensionsEnabled";
/** How the editor opens a design: perspective (default) or orthographic. */
export const START_IN_PERSPECTIVE_STORAGE_KEY = "layerling.editor.startInPerspective";

function readPreference(key: string) {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(key) !== "false";
  } catch {
    return true;
  }
}

export const readMoveDimensionsEnabled = () => readPreference(MOVE_DIMENSIONS_ENABLED_STORAGE_KEY);
export const readOriginDimensionsEnabled = () => readPreference(ORIGIN_DIMENSIONS_ENABLED_STORAGE_KEY);
export const readStartInPerspective = () => readPreference(START_IN_PERSPECTIVE_STORAGE_KEY);

export function writeEditorViewPreference(key: string, on: boolean) {
  try {
    window.localStorage.setItem(key, String(on));
  } catch {
    // Without storage the preference still applies to this editor session.
  }
}
