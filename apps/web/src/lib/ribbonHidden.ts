"use client";

import { useSyncExternalStore } from "react";
import { LEGACY_MODIFY_GROUP, MODIFY_GROUPS } from "@/lib/ribbonOrder";

/**
 * Buttons and groups of the 3D ribbon a person has taken out of it (Discussion #1519, #1087): kept in this browser, like
 * your own keys. Only the ribbon leaves them out; the command search (Ctrl+K) and the keys still run them. The order of the
 * groups and of the buttons in them is kept elsewhere (`ribbonOrder.ts`, `ribbonToolOrder.ts`). A group is stored as
 * "group:<name>", a button by its id in the ribbon.
 */
export const RIBBON_HIDDEN_STORAGE_KEY = "layerling.ribbonHidden";
const MAX_HIDDEN = 300;

export const ribbonGroupKey = (group: string) => `group:${group}`;

export function normalizeRibbonHidden(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const ids = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== "string") continue;
    const id = entry.trim();
    // Modify taken out while it was one group takes out the four groups it became (#1551).
    if (id === ribbonGroupKey(LEGACY_MODIFY_GROUP)) MODIFY_GROUPS.forEach((group) => ids.add(ribbonGroupKey(group)));
    else if (id.length > 0 && id.length <= 80) ids.add(id);
    if (ids.size >= MAX_HIDDEN) break;
  }
  return [...ids].sort();
}

/** The tools of `tools` the ribbon still shows. */
export function shownInRibbon<T extends { id: string }>(tools: readonly T[], hidden: ReadonlySet<string>): T[] {
  return hidden.size ? tools.filter((tool) => !hidden.has(tool.id)) : [...tools];
}

/** Whether a group appears at all: not taken out itself, and with a button left of those it shows (a group with a menu of its own passes none). */
export function ribbonGroupShown(group: string, hidden: ReadonlySet<string>, shown?: readonly unknown[]) {
  if (hidden.has(ribbonGroupKey(group))) return false;
  return !shown || shown.length > 0;
}

// The store: read once, kept in memory, written through. Another tab's change comes in with the storage event.
const EMPTY: ReadonlySet<string> = new Set();
let cache: ReadonlySet<string> | null = null;
const listeners = new Set<() => void>();

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readRibbonHidden(): ReadonlySet<string> {
  if (cache) return cache;
  let parsed: unknown = [];
  try {
    parsed = JSON.parse(storage()?.getItem(RIBBON_HIDDEN_STORAGE_KEY) ?? "[]");
  } catch {
    parsed = [];
  }
  const ids = normalizeRibbonHidden(parsed);
  cache = ids.length ? new Set(ids) : EMPTY;
  return cache;
}

export function writeRibbonHidden(next: Iterable<string>) {
  const ids = normalizeRibbonHidden([...next]);
  cache = ids.length ? new Set(ids) : EMPTY;
  try {
    if (ids.length === 0) storage()?.removeItem(RIBBON_HIDDEN_STORAGE_KEY);
    else storage()?.setItem(RIBBON_HIDDEN_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Without storage the choice lasts as long as the page.
  }
  listeners.forEach((listener) => listener());
}

/** Shows (`shown` true) or takes out one button or group. */
export function setRibbonEntryShown(id: string, shown: boolean) {
  const next = new Set(readRibbonHidden());
  if (shown) next.delete(id);
  else next.add(id);
  writeRibbonHidden(next);
}

export function subscribeRibbonHidden(listener: () => void): () => void {
  listeners.add(listener);
  const fromOtherTab = (event: StorageEvent) => {
    if (event.key !== RIBBON_HIDDEN_STORAGE_KEY && event.key !== null) return;
    cache = null;
    listener();
  };
  if (typeof window !== "undefined") window.addEventListener("storage", fromOtherTab);
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") window.removeEventListener("storage", fromOtherTab);
  };
}

/** Forgets what was read, so the next read asks the storage again (tests). */
export function forgetRibbonHiddenCache() {
  cache = null;
}

export function useRibbonHidden(): ReadonlySet<string> {
  return useSyncExternalStore(subscribeRibbonHidden, readRibbonHidden, () => EMPTY);
}

/**
 * What the ribbon holds, group by group, as the toolbar last drew it, for the list in the settings window: the names
 * there are the ones on the buttons, in the language shown, and a new tool turns up in the list by itself.
 */
export type RibbonLayoutGroup = { group: string; label: string; /** The ids of its buttons in the order the ribbon ships them. */ shipped?: string[]; tools: { id: string; label: string; /** The named section of the group a button stands in; a button moves only among the ones of its own. */ section?: string }[] };
let layout: RibbonLayoutGroup[] = [];
export function setRibbonLayout(next: RibbonLayoutGroup[]) {
  layout = next;
}
export function ribbonLayout(): RibbonLayoutGroup[] {
  return layout;
}
