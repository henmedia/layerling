"use client";

import { useSyncExternalStore } from "react";
import { LEGACY_MODIFY_GROUP, MODIFY_GROUPS, RIBBON_GROUP_ORDER } from "@/lib/ribbonOrder";

/**
 * How each group of the 3D ribbon folds (Discussion #1551), kept in this browser like the order and the buttons taken out.
 * A group the map does not name folds when the window has no room for it, the ones used least first. "always" keeps it
 * folded into its one button, so it takes little room and is still at hand; "keep" lets it fold only after every other
 * group, when nothing else is left to fold.
 */
export const RIBBON_FOLD_STORAGE_KEY = "layerling.ribbonFold";

export type RibbonFold = "auto" | "always" | "keep";
export type RibbonFoldMap = Readonly<Record<string, Exclude<RibbonFold, "auto">>>;

/** Groups without a fold of their own: Shapes is a single button already. */
const UNFOLDABLE = new Set<string>(["shapes"]);

export function ribbonGroupFolds(group: string) {
  return !UNFOLDABLE.has(group);
}

export function normalizeRibbonFold(value: unknown): RibbonFoldMap {
  const folds: Record<string, Exclude<RibbonFold, "auto">> = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return folds;
  const known = new Set<string>(RIBBON_GROUP_ORDER);
  for (const [group, fold] of Object.entries(value as Record<string, unknown>)) {
    if (fold !== "always" && fold !== "keep") continue;
    // A choice for Modify, from a file of a later version, would hold for the four groups it became.
    const groups = group === LEGACY_MODIFY_GROUP ? [...MODIFY_GROUPS] : [group];
    for (const name of groups) {
      if (known.has(name) && ribbonGroupFolds(name) && !(name in folds)) folds[name] = fold;
    }
  }
  return folds;
}

export function ribbonFoldOf(folds: RibbonFoldMap, group: string): RibbonFold {
  return folds[group] ?? "auto";
}

/** The map with one group's choice set; "auto" is stored as nothing. */
export function withRibbonFold(folds: RibbonFoldMap, group: string, fold: RibbonFold): RibbonFoldMap {
  const next: Record<string, string> = { ...folds };
  if (fold === "auto") delete next[group];
  else next[group] = fold;
  return normalizeRibbonFold(next);
}

/**
 * The `data-collapse` a group carries in the ribbon: its usual place in the folding order (lower folds first), moved
 * behind every other group when it is to be kept open.
 */
export const KEEP_OPEN_PRIORITY_OFFSET = 100;
export function ribbonCollapsePriority(base: number, fold: RibbonFold) {
  return fold === "keep" ? base + KEEP_OPEN_PRIORITY_OFFSET : base;
}

// The store: read once, kept in memory, written through. Another tab's change comes in with the storage event.
const EMPTY: RibbonFoldMap = {};
let cache: RibbonFoldMap | null = null;
const listeners = new Set<() => void>();

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readRibbonFold(): RibbonFoldMap {
  if (cache) return cache;
  let parsed: unknown = {};
  try {
    parsed = JSON.parse(storage()?.getItem(RIBBON_FOLD_STORAGE_KEY) ?? "{}");
  } catch {
    parsed = {};
  }
  const folds = normalizeRibbonFold(parsed);
  cache = Object.keys(folds).length ? folds : EMPTY;
  return cache;
}

export function writeRibbonFold(next: unknown) {
  const folds = normalizeRibbonFold(next);
  cache = Object.keys(folds).length ? folds : EMPTY;
  try {
    if (cache === EMPTY) storage()?.removeItem(RIBBON_FOLD_STORAGE_KEY);
    else storage()?.setItem(RIBBON_FOLD_STORAGE_KEY, JSON.stringify(folds));
  } catch {
    // Without storage the choice lasts as long as the page.
  }
  listeners.forEach((listener) => listener());
}

export function subscribeRibbonFold(listener: () => void): () => void {
  listeners.add(listener);
  const fromOtherTab = (event: StorageEvent) => {
    if (event.key !== RIBBON_FOLD_STORAGE_KEY && event.key !== null) return;
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
export function forgetRibbonFoldCache() {
  cache = null;
}

export function useRibbonFold(): RibbonFoldMap {
  return useSyncExternalStore(subscribeRibbonFold, readRibbonFold, () => EMPTY);
}
