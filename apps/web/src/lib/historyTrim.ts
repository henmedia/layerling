/**
 * A design whose history and meshes make the stored package too big for the project format (#475)
 * is written again with fewer history steps, so it is saved at all instead of failing at every change.
 */

/** Whether a failed save was refused for the size of the package, not for another reason. */
export function isProjectTooLargeError(error: unknown): boolean {
  return error instanceof Error && /exceeds the 64 MB project file limit|too many stored assets for the project format/i.test(error.message);
}

/**
 * Whether packing the design ran the browser out of memory (Discussion #1652): with meshes of millions of triangles a
 * whole history can be more than the tab can hold while it is packed, so it is packed again with fewer steps, as a
 * package too big for the format is. The texts are those userErrors.ts turns into error.outOfMemory.
 */
export function isOutOfMemoryError(error: unknown): boolean {
  if (error instanceof RangeError) return true;
  return error instanceof Error && /Array buffer allocation failed|Invalid array length|Invalid typed array length|Out of memory|Cannot allocate memory|allocation failed/i.test(error.message);
}

/** Whether a smaller history may let the save through: the package was too big, or packing it ran out of memory. */
export function isRetriedWithLessHistory(error: unknown): boolean {
  return isProjectTooLargeError(error) || isOutOfMemoryError(error);
}

/** Whether the browser said it has no room left (the name is the standard one; the texts differ between browsers). */
export function isStorageFullError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const { name, message } = error as { name?: unknown; message?: unknown };
  return name === "QuotaExceededError" || (typeof message === "string" && /quota/i.test(message));
}

/**
 * The newest `keep` steps of a history, with the step the design stands at kept even when it lies further
 * back (so Redo stays where it was). The index moves with the cut.
 */
export function trimHistoryWindow<T>(history: readonly T[], historyIndex: number, keep: number): { history: T[]; historyIndex: number } {
  const total = history.length;
  const index = Math.min(Math.max(0, Math.round(historyIndex)), Math.max(0, total - 1));
  const wanted = Math.max(1, Math.round(keep));
  if (total <= wanted) return { history: [...history], historyIndex: index };
  const start = Math.min(total - wanted, index);
  return { history: history.slice(start), historyIndex: index - start };
}

/** The sizes to try, from half the history down to the current step alone: 42 gives 21, 11, 6, 3, 2, 1. */
export function historyTrimSteps(total: number): number[] {
  const steps: number[] = [];
  let keep = Math.ceil(total / 2);
  while (keep >= 1) {
    if (steps[steps.length - 1] !== keep) steps.push(keep);
    if (keep === 1) break;
    keep = Math.ceil(keep / 2);
  }
  return steps;
}
