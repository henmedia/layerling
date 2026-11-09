"use client";

import { useSyncExternalStore } from "react";

/**
 * The order of the 3D ribbon's groups a person set (Discussion #1519, #1502): kept in this browser, like the buttons they
 * took out. Every group but Shapes can stand anywhere; Shapes keeps its place after the first two groups, because it is
 * where a design grows and must be found again. The order is a list of the group names; a name the list lacks (a group a
 * later version adds) stands at its usual place, a name it no longer knows is dropped.
 */
export const RIBBON_ORDER_STORAGE_KEY = "layerling.ribbonOrder";

/** The groups a person can move, in the order the ribbon ships them. */
export const RIBBON_GROUP_ORDER = ["clipboard", "history", "visibility", "combine", "modify", "arrange", "manage"] as const;
export type RibbonGroupName = (typeof RIBBON_GROUP_ORDER)[number];

/** Where Shapes stands among the groups as shipped: after the first two, before the rest. */
const SHAPES_SLOT = 2;

export function normalizeRibbonOrder(value: unknown): RibbonGroupName[] {
  const known = new Set<string>(RIBBON_GROUP_ORDER);
  const seen = new Set<string>();
  const order: RibbonGroupName[] = [];
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (typeof entry !== "string" || !known.has(entry) || seen.has(entry)) continue;
      seen.add(entry);
      order.push(entry as RibbonGroupName);
    }
  }
  for (const group of RIBBON_GROUP_ORDER) if (!seen.has(group)) order.push(group);
  return order;
}

export function isDefaultRibbonOrder(order: readonly string[]) {
  return order.length === RIBBON_GROUP_ORDER.length && order.every((group, index) => group === RIBBON_GROUP_ORDER[index]);
}

/**
 * The CSS `order` of every section of the ribbon: the movable groups take the places the shipped ribbon has, one after
 * the other, and Shapes keeps the one between the second and the third.
 */
export function ribbonSectionOrders(order: readonly RibbonGroupName[]): Record<RibbonGroupName | "shapes", number> {
  const orders = { shapes: SHAPES_SLOT } as Record<RibbonGroupName | "shapes", number>;
  let slot = 0;
  for (const group of order) {
    if (slot === SHAPES_SLOT) slot += 1;
    orders[group] = slot;
    slot += 1;
  }
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
