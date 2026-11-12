/**
 * A click on a row of the object list, as in a file manager (Discussion #1683): a plain click selects the one
 * entry, Ctrl (Cmd on a Mac) adds it or takes it away, Shift selects every entry from the last clicked one to
 * this one, and Ctrl+Shift adds that run to what is selected already.
 */

export interface ObjectListClick {
  /** Ctrl or Cmd held. */
  toggle: boolean;
  /** Shift held. */
  range: boolean;
}

export type ObjectListSelection = { ids: string | string[]; mode: "replace" | "toggle" };

/**
 * Where a Shift-click starts: the entry last clicked in the list while it is still selected, else the shape
 * selected last that the list shows (a part picked in the view), else none.
 */
export function objectListAnchor(listedIds: readonly string[], selectedIds: readonly string[], lastClicked: string | null): string | null {
  if (lastClicked && listedIds.includes(lastClicked) && selectedIds.includes(lastClicked)) return lastClicked;
  for (let index = selectedIds.length - 1; index >= 0; index -= 1) {
    if (listedIds.includes(selectedIds[index])) return selectedIds[index];
  }
  return null;
}

/**
 * What a click on `clickedId` selects, given the entries in the order the list shows them. `anchor` is the
 * result of `objectListAnchor`. A Shift-click with nothing to start from adds the one entry, as Shift did before.
 */
export function objectListClickSelection(
  listedIds: readonly string[],
  selectedIds: readonly string[],
  anchor: string | null,
  clickedId: string,
  click: ObjectListClick,
): ObjectListSelection {
  if (click.range) {
    const from = anchor ? listedIds.indexOf(anchor) : -1;
    const to = listedIds.indexOf(clickedId);
    if (from >= 0 && to >= 0) {
      const run = listedIds.slice(Math.min(from, to), Math.max(from, to) + 1);
      if (!click.toggle) return { ids: run, mode: "replace" };
      // Ctrl+Shift adds the run and takes nothing away: the toggle only gets what is not selected yet.
      const added = run.filter((id) => !selectedIds.includes(id));
      return { ids: added, mode: "toggle" };
    }
    // No start: nothing the list shows is selected, so this adds the one entry.
    return { ids: clickedId, mode: "toggle" };
  }
  if (click.toggle) return { ids: clickedId, mode: "toggle" };
  return { ids: clickedId, mode: "replace" };
}
