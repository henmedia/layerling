"use client";

import { useSyncExternalStore } from "react";

/**
 * Which bars lie over the 3D view (Discussion #2073), kept in this browser like the ribbon's order: the view bar can be
 * left out altogether, and the measuring tools can stand in a bar of their own instead of inside it. The sketch keeps
 * its own view bar either way.
 */
export const VIEW_BARS_STORAGE_KEY = "layerling.viewBars";

export type ViewBars = Readonly<{
  /** The view bar of the 3D editor is shown. */
  viewBar: boolean;
  /** The measuring tools stand in a bar of their own. */
  measureBar: boolean;
}>;

export const DEFAULT_VIEW_BARS: ViewBars = { viewBar: true, measureBar: false };

export function normalizeViewBars(value: unknown): ViewBars {
  const candidate = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    viewBar: typeof candidate.viewBar === "boolean" ? candidate.viewBar : DEFAULT_VIEW_BARS.viewBar,
    measureBar: typeof candidate.measureBar === "boolean" ? candidate.measureBar : DEFAULT_VIEW_BARS.measureBar,
  };
}

// The store: read once, kept in memory, written through. Another tab's change comes in with the storage event.
let cache: ViewBars | null = null;
const listeners = new Set<() => void>();

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readViewBars(): ViewBars {
  if (cache) return cache;
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(storage()?.getItem(VIEW_BARS_STORAGE_KEY) ?? "null");
  } catch {
    parsed = null;
  }
  cache = normalizeViewBars(parsed);
  return cache;
}

export function writeViewBars(next: unknown) {
  cache = normalizeViewBars(next);
  try {
    storage()?.setItem(VIEW_BARS_STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Without storage the choice lasts as long as the page.
  }
  listeners.forEach((listener) => listener());
}

function subscribeViewBars(listener: () => void): () => void {
  listeners.add(listener);
  const fromOtherTab = (event: StorageEvent) => {
    if (event.key !== VIEW_BARS_STORAGE_KEY && event.key !== null) return;
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
export function forgetViewBarsCache() {
  cache = null;
}

export function useViewBars(): ViewBars {
  return useSyncExternalStore(subscribeViewBars, readViewBars, () => DEFAULT_VIEW_BARS);
}
