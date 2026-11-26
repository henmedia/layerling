/**
 * What the browser keeps beside a design under its id: its view, its saved views, its named selections, its
 * measurements, its drawing's title block. Deleting a design left all of that behind for good, and the named
 * selections alone can be large, so over time the browser's small store for settings filled up with the
 * leftovers of designs that no longer exist.
 */
export const PER_DESIGN_STORAGE_PREFIXES = [
  "layerling.designView.",
  "layerling.savedViews.",
  "layerling.selectionSets.",
  "layerling.cornerRulers.",
  "layerling.tapeMeasurements.",
  "layerling.drawingInfo.",
] as const;

/** Removes what the browser kept beside these designs. Storage that cannot be reached is left as it is. */
export function removeDesignStorage(projectIds: readonly string[], storage?: Pick<Storage, "removeItem"> | null) {
  let target = storage;
  if (target === undefined) {
    try {
      target = window.localStorage;
    } catch {
      target = null;
    }
  }
  if (!target) return;
  for (const projectId of projectIds) {
    if (!projectId) continue;
    for (const prefix of PER_DESIGN_STORAGE_PREFIXES) {
      try {
        target.removeItem(prefix + projectId);
      } catch {
        // A browser that refuses keeps the leftover; the design is gone all the same.
      }
    }
  }
}
