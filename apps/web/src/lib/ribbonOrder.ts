"use client";

import { useSyncExternalStore } from "react";

/**
 * The order of the 3D ribbon's groups a person set (Discussion #1519, #1502): kept in this browser, like the buttons they
 * took out. Every group can stand anywhere, Shapes too (Issue #1550). The order is a list of the group names; a name the
 * list lacks (a group a later version adds, or Shapes in an order kept before it could move) stands at its usual place,
 * a name it no longer knows is dropped.
 */
export const RIBBON_ORDER_STORAGE_KEY = "layerling.ribbonOrder";

/**
 * The four groups that were one, "Modify", with named sections until Discussion #1551: each now moves, folds and can be
 * taken out on its own. Kept orders, hidden groups and button orders that name "modify" stand for all four.
 */
export const MODIFY_GROUPS = ["mirrorPattern", "splitShape", "edgesWalls", "surface"] as const;
export const LEGACY_MODIFY_GROUP = "modify";

/** The groups of the ribbon, in the order it ships them. */
export const RIBBON_GROUP_ORDER = ["clipboard", "history", "shapes", "visibility", "combine", ...MODIFY_GROUPS, "arrange", "manage"] as const;
export type RibbonGroupName = (typeof RIBBON_GROUP_ORDER)[number];

export function normalizeRibbonOrder(value: unknown): RibbonGroupName[] {
  const known = new Set<string>(RIBBON_GROUP_ORDER);
  const seen = new Set<string>();
  const order: RibbonGroupName[] = [];
  const add = (entry: string) => {
    if (!known.has(entry) || seen.has(entry)) return;
    seen.add(entry);
    order.push(entry as RibbonGroupName);
  };
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (typeof entry !== "string") continue;
      // An order kept while Modify was one group gets its four groups where it stood (#1551).
      if (entry === LEGACY_MODIFY_GROUP) MODIFY_GROUPS.forEach(add);
      else add(entry);
    }
  }
  // A missing group goes back to the place it ships at: an order kept while Shapes stood fixed as the third group
  // gets Shapes third again, where the ribbon showed it.
  RIBBON_GROUP_ORDER.forEach((group, index) => {
    if (!seen.has(group)) order.splice(Math.min(index, order.length), 0, group);
  });
  return order;
}

export function isDefaultRibbonOrder(order: readonly string[]) {
  return order.length === RIBBON_GROUP_ORDER.length && order.every((group, index) => group === RIBBON_GROUP_ORDER[index]);
}

/** The CSS `order` of every section of the ribbon: its place in the order. */
export function ribbonSectionOrders(order: readonly RibbonGroupName[]): Record<RibbonGroupName, number> {
  const orders = {} as Record<RibbonGroupName, number>;
  order.forEach((group, slot) => {
    orders[group] = slot;
  });
  return orders;
}

/** The order after moving `group` one place up (-1) or down (1); the same order when it is already at that end. */
export function moveRibbonGroup(order: readonly RibbonGroupName[], group: RibbonGroupName, step: -1 | 1): RibbonGroupName[] {
  const index = order.indexOf(group);
  const target = index + step;
  if (index < 0 || target < 0 || target >= order.length) return [...order];
  const next = [...order];
  next[index] = order[target];
  next[target] = group;
  return next;
}

/** The order after putting `group` on the other side of `other`: above it when `step` is -1, below it when 1. */
export function moveRibbonGroupPast(order: readonly RibbonGroupName[], group: RibbonGroupName, other: RibbonGroupName, step: -1 | 1): RibbonGroupName[] {
  if (group === other) return [...order];
  const rest = order.filter((entry) => entry !== group);
  const at = rest.indexOf(other);
  if (at < 0) return [...order];
  rest.splice(step === -1 ? at : at + 1, 0, group);
  return rest;
}

// The store: read once, kept in memory, written through. Another tab's change comes in with the storage event.
const DEFAULT_ORDER: readonly RibbonGroupName[] = RIBBON_GROUP_ORDER;
let cache: readonly RibbonGroupName[] | null = null;
const listeners = new Set<() => void>();

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readRibbonOrder(): readonly RibbonGroupName[] {
  if (cache) return cache;
  let parsed: unknown = [];
  try {
    parsed = JSON.parse(storage()?.getItem(RIBBON_ORDER_STORAGE_KEY) ?? "[]");
  } catch {
    parsed = [];
  }
  const order = normalizeRibbonOrder(parsed);
  cache = isDefaultRibbonOrder(order) ? DEFAULT_ORDER : order;
  return cache;
}

export function writeRibbonOrder(next: readonly string[]) {
  const order = normalizeRibbonOrder(next);
  cache = isDefaultRibbonOrder(order) ? DEFAULT_ORDER : order;
  try {
    if (cache === DEFAULT_ORDER) storage()?.removeItem(RIBBON_ORDER_STORAGE_KEY);
    else storage()?.setItem(RIBBON_ORDER_STORAGE_KEY, JSON.stringify(order));
  } catch {
    // Without storage the order lasts as long as the page.
  }
  listeners.forEach((listener) => listener());
}

export function subscribeRibbonOrder(listener: () => void): () => void {
  listeners.add(listener);
  const fromOtherTab = (event: StorageEvent) => {
    if (event.key !== RIBBON_ORDER_STORAGE_KEY && event.key !== null) return;
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
export function forgetRibbonOrderCache() {
  cache = null;
}

export function useRibbonOrder(): readonly RibbonGroupName[] {
  return useSyncExternalStore(subscribeRibbonOrder, readRibbonOrder, () => DEFAULT_ORDER);
}
