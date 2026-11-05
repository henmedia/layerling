/**
 * Guards against a design that takes the page down while it opens (#1157).
 *
 * The address of an open design (`?editor=1&project=…`) brings it straight back when the page is
 * reloaded. A design so large that the browser runs out of memory opening it would then crash the
 * page again on every reload, and the start page with "Open without history" would be out of
 * reach. So opening leaves a mark that is taken away once the design has opened; a mark still there
 * at the next start means the last opening never finished, and the start page is shown instead.
 */
export const OPENING_DESIGN_KEY = "layerling.openingDesign";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function readMark(storage: StorageLike | null | undefined): string | null {
  try {
    const raw = storage?.getItem(OPENING_DESIGN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { id?: unknown } | null;
    return typeof parsed?.id === "string" ? parsed.id : null;
  } catch {
    return null;
  }
}

/** The design is about to be read and opened. */
export function markDesignOpening(storage: StorageLike | null | undefined, projectId: string) {
  try {
    storage?.setItem(OPENING_DESIGN_KEY, JSON.stringify({ id: projectId, at: Date.now() }));
  } catch {
    // Without storage there is no guard; the design opens as before.
  }
}

/** The design has opened; only its own mark is taken away. */
export function clearDesignOpening(storage: StorageLike | null | undefined, projectId: string) {
  if (readMark(storage) !== projectId) return;
  try {
    storage?.removeItem(OPENING_DESIGN_KEY);
  } catch {
    // Nothing to do: the mark stays and costs one trip over the start page at most.
  }
}

/**
 * The page is left in the usual way (closed, reloaded, navigated away): whatever was opening did not
 * crash it. A page the browser killed for running out of memory never gets here, so its mark stays.
 */
export function forgetDesignOpening(storage: StorageLike | null | undefined) {
  try {
    storage?.removeItem(OPENING_DESIGN_KEY);
  } catch {
    // See clearDesignOpening.
  }
}

/**
 * Whether the last opening of this design never finished. The mark is taken away by asking, so a
 * second try from the start page opens the design as usual.
 */
export function takeUnfinishedOpening(storage: StorageLike | null | undefined, projectId: string) {
  if (readMark(storage) !== projectId) return false;
  try {
    storage?.removeItem(OPENING_DESIGN_KEY);
  } catch {
    // The answer stands even when the mark cannot be removed.
  }
  return true;
}
