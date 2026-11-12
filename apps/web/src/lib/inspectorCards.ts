"use client";

import { useCallback, useState } from "react";

/** One entry in this browser for all the folding cards of the shape settings: which of them stay open (#632). */
export const INSPECTOR_CARDS_KEY = "layerling.editor.inspectorCards";

/** The saved states by card name; an empty list when nothing is saved or the browser keeps nothing. */
export function readInspectorCards(storage: Pick<Storage, "getItem"> | null | undefined): Record<string, boolean> {
  try {
    const parsed: unknown = JSON.parse(storage?.getItem(INSPECTOR_CARDS_KEY) ?? "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const cards: Record<string, boolean> = {};
    for (const [name, open] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof open === "boolean") cards[name] = open;
    }
    return cards;
  } catch {
    return {};
  }
}

export function writeInspectorCard(storage: Pick<Storage, "getItem" | "setItem"> | null | undefined, name: string, open: boolean) {
  try {
    storage?.setItem(INSPECTOR_CARDS_KEY, JSON.stringify({ ...readInspectorCards(storage), [name]: open }));
  } catch {
    // A browser that keeps nothing (private window, full storage): the card works, it just forgets.
  }
}

function browserStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Whether the surface texture card - which is the texture tool - stays open when the selected body changes from
 * `before` to `after` (ids, null for none or several). It is not kept like the other cards: kept, it stayed on for
 * every body chosen later and after a reload, so the tool looked switched on by itself. Choosing another body or none
 * closes it; a body an edit replaced under a new id (a texture made or changed, undo) keeps it, as it is the same
 * body to the user. `present` says which ids are still in the design.
 */
export function surfaceTextureCardStaysOpen(before: string | null, after: string | null, present: (id: string) => boolean) {
  if (before === after) return true;
  return before !== null && after !== null && !present(before);
}

/**
 * Open or closed, like useState, but kept in this browser: a card that was left open stays open for the next
 * shape and the next visit. `initial` is what a card shows until somebody has opened or closed it.
 */
export function useInspectorCard(name: string, initial: boolean): [boolean, (next: boolean | ((open: boolean) => boolean)) => void] {
  const [open, setOpenState] = useState(() => readInspectorCards(browserStorage())[name] ?? initial);
  const setOpen = useCallback((next: boolean | ((open: boolean) => boolean)) => {
    setOpenState((current) => {
      const value = typeof next === "function" ? next(current) : next;
      writeInspectorCard(browserStorage(), name, value);
      return value;
    });
  }, [name]);
  return [open, setOpen];
}
