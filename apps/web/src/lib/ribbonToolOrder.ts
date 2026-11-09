"use client";

import { useSyncExternalStore } from "react";
import { LEGACY_MODIFY_GROUP, MODIFY_GROUPS } from "@/lib/ribbonOrder";

/**
 * The order of the buttons inside each group of the 3D ribbon a person set (Discussion #1519): kept in this browser, like the
 * order of the groups (`ribbonOrder.ts`) and the buttons taken out (`ribbonHidden.ts`). It maps a group's name to the ids of
 * its buttons in the order they should stand. A button the list lacks (one a later version adds) stands after the ones it
 * has, in its usual order; an id no button has any more does no harm and is dropped when the list is next written.
 */
export const RIBBON_TOOL_ORDER_STORAGE_KEY = "layerling.ribbonToolOrder";
const MAX_TOOLS_PER_GROUP = 80;

export type RibbonToolOrder = Readonly<Record<string, readonly string[]>>;

// "modify" is the one list of the four groups Modify became (#1551), kept as it was saved: each of them takes its
// buttons' order from it until it gets a list of its own (`ribbonToolOrderFor`).
const GROUPS = ["clipboard", "history", "visibility", "combine", ...MODIFY_GROUPS, LEGACY_MODIFY_GROUP, "arrange", "manage"] as const;

/** The saved order of a group's buttons; one of Modify's four groups falls back to the list Modify had. */
export function ribbonToolOrderFor(order: RibbonToolOrder, group: string): readonly string[] | undefined {
  return order[group] ?? ((MODIFY_GROUPS as readonly string[]).includes(group) ? order[LEGACY_MODIFY_GROUP] : undefined);
}

export function normalizeRibbonToolOrder(value: unknown): RibbonToolOrder {
  const order: Record<string, string[]> = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return order;
  for (const group of GROUPS) {
    const entry = (value as Record<string, unknown>)[group];
    if (!Array.isArray(entry)) continue;
    const ids = new Set<string>();
    for (const id of entry) {
      if (typeof id !== "string") continue;
      const trimmed = id.trim();
      if (trimmed.length > 0 && trimmed.length <= 80) ids.add(trimmed);
      if (ids.size >= MAX_TOOLS_PER_GROUP) break;
    }
    if (ids.size > 0) order[group] = [...ids];
  }
  return order;
}

/** The tools in the order saved for the group: the ones the list names first, in its order, then the rest as they came. */
export function sortByRibbonToolOrder<T extends { id: string }>(tools: readonly T[], saved: readonly string[] | undefined): T[] {
  if (!saved || saved.length === 0) return [...tools];
  const rank = new Map(saved.map((id, index) => [id, index]));
  const named = tools.filter((tool) => rank.has(tool.id)).sort((one, other) => (rank.get(one.id) ?? 0) - (rank.get(other.id) ?? 0));
  const rest = tools.filter((tool) => !rank.has(tool.id));
  return [...named, ...rest];
}

/**
 * The ids of a group after `id` has moved past `other` (above it when `step` is -1, below it when 1). `current` is the
 * group's buttons as they stand now, hidden ones too.
 */
export function moveRibbonTool(current: readonly string[], id: string, other: string, step: -1 | 1): string[] {
  if (id === other) return [...current];
  const rest = current.filter((entry) => entry !== id);
  const at = rest.indexOf(other);
  if (at < 0) return [...current];
  rest.splice(step === -1 ? at : at + 1, 0, id);
  return rest;
}

/** The order with one group's list set; a list equal to the shipped order of that group is stored as nothing. */
export function withRibbonToolOrder(order: RibbonToolOrder, group: string, ids: readonly string[], shipped: readonly string[]): RibbonToolOrder {
  const next: Record<string, readonly string[]> = { ...order };
  const same = ids.length === shipped.length && ids.every((id, index) => id === shipped[index]);
  if (same) delete next[group];
  else next[group] = [...ids];
  return normalizeRibbonToolOrder(next);
}

// The store: read once, kept in memory, written through. Another tab's change comes in with the storage event.
const EMPTY: RibbonToolOrder = {};
let cache: RibbonToolOrder | null = null;
const listeners = new Set<() => void>();

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readRibbonToolOrder(): RibbonToolOrder {
  if (cache) return cache;
  let parsed: unknown = {};
  try {
    parsed = JSON.parse(storage()?.getItem(RIBBON_TOOL_ORDER_STORAGE_KEY) ?? "{}");
  } catch {
    parsed = {};
  }
  const order = normalizeRibbonToolOrder(parsed);
  cache = Object.keys(order).length ? order : EMPTY;
  return cache;
}

export function writeRibbonToolOrder(next: unknown) {
  const order = normalizeRibbonToolOrder(next);
  cache = Object.keys(order).length ? order : EMPTY;
  try {
    if (cache === EMPTY) storage()?.removeItem(RIBBON_TOOL_ORDER_STORAGE_KEY);
    else storage()?.setItem(RIBBON_TOOL_ORDER_STORAGE_KEY, JSON.stringify(order));
  } catch {
    // Without storage the order lasts as long as the page.
  }
  listeners.forEach((listener) => listener());
}

export function subscribeRibbonToolOrder(listener: () => void): () => void {
  listeners.add(listener);
  const fromOtherTab = (event: StorageEvent) => {
    if (event.key !== RIBBON_TOOL_ORDER_STORAGE_KEY && event.key !== null) return;
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
export function forgetRibbonToolOrderCache() {
  cache = null;
}

export function useRibbonToolOrder(): RibbonToolOrder {
  return useSyncExternalStore(subscribeRibbonToolOrder, readRibbonToolOrder, () => EMPTY);
}
