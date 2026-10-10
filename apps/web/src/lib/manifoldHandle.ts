import type { ManifoldToplevel } from "manifold-3d";

/**
 * The Manifold runtime once the editor has loaded it, for code that has to run without
 * awaiting - a text's display geometry is built on the spot (#215). Until then the text draws
 * plain, asks for the runtime, and is drawn again when it arrives (onManifoldReady).
 */
let loaded: ManifoldToplevel | null = null;
let loader: (() => Promise<ManifoldToplevel>) | null = null;
let requested = false;
const listeners = new Set<() => void>();

export function rememberManifoldRuntime(runtime: ManifoldToplevel) {
  if (loaded === runtime) return;
  loaded = runtime;
  listeners.forEach((listener) => listener());
}

/** The editor says how the runtime is loaded; the request below goes through it. */
export function setManifoldLoader(load: () => Promise<ManifoldToplevel>) {
  loader = load;
}

export function loadedManifoldRuntime(): ManifoldToplevel | null {
  return loaded;
}

/** Starts loading the runtime once; the listeners hear when it is there. */
export function requestManifoldRuntime() {
  if (loaded || requested || !loader) return;
  requested = true;
  void loader().then(rememberManifoldRuntime).catch(() => {
    requested = false;
  });
}

export function onManifoldReady(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** For cache keys: 0 before the runtime is there, 1 after - a text with a fill is drawn again then. */
export function manifoldRevision() {
  return loaded ? 1 : 0;
}
