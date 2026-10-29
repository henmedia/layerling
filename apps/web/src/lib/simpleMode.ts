/**
 * The simple mode (#695): layerling cut down for children and beginners. The ribbon keeps the tools a workshop uses, the
 * shape library a short list, the start page shows the designs and nothing that leads out of layerling, and the buttons are
 * larger. It is a choice the browser remembers; a server can suggest it for everybody who has not chosen
 * (`LAYERLING_SIMPLE_MODE=true`) or fix it (`always`, nobody can switch it off in the program); and a link with
 * `?mode=simple` (or `?mode=full`) sets it on the device that opens it.
 */
export const SIMPLE_MODE_STORAGE_KEY = "layerling.simpleMode";
export const SIMPLE_MODE_PARAMETER = "mode";

export type SimpleModeChoice = "on" | "off";

export function normalizeSimpleModeChoice(value: unknown): SimpleModeChoice | null {
  return value === "on" || value === "off" ? value : null;
}

/** What a link's `mode` parameter asks for, or null when it asks for nothing of ours. */
export function simpleModeFromParameter(value: unknown): SimpleModeChoice | null {
  if (typeof value !== "string") return null;
  const wanted = value.trim().toLowerCase();
  if (wanted === "simple") return "on";
  return wanted === "full" ? "off" : null;
}

/** Ribbon tools the simple mode keeps, by their ids in the toolbar. */
export const SIMPLE_MODE_TOOLS: ReadonlySet<string> = new Set([
  "copy", "paste", "duplicate", "delete", "undo", "redo",
  "group", "ungroup",
  "mirror", "chamfer", "fillet", "hollow", "cookieCutter",
  "align",
]);

/** Library entries the simple mode keeps, by their ids in the shape catalogue. */
export const SIMPLE_MODE_SHAPES: ReadonlySet<string> = new Set([
  "box", "roundedBox", "cylinder", "sphere", "half-sphere", "cone", "pyramid", "wedge", "round-roof", "torus", "tube",
  "text", "nameTag", "star", "heart",
]);

export function simpleModeKeepsTool(id: string) {
  return SIMPLE_MODE_TOOLS.has(id);
}

export function simpleModeKeepsShape(id: string) {
  return SIMPLE_MODE_SHAPES.has(id);
}

/** The simple mode runs when it is chosen, or when nothing is chosen and the server suggested it; a fixed server setting wins over both. */
export function resolveSimpleMode(choice: SimpleModeChoice | null, server: "on" | "always" | null): boolean {
  if (server === "always") return true;
  if (choice) return choice === "on";
  return server === "on";
}

/**
 * Runs in <head> before the page paints, so the full start page does not flash up first. It also takes a `?mode=` link into
 * the stored choice (and drops the parameter from the address); the server's suggestion comes later, from the page.
 */
export const SIMPLE_MODE_BOOT_SCRIPT = `try{var k=${JSON.stringify(SIMPLE_MODE_STORAGE_KEY)};var u=new URL(location.href);var m=(u.searchParams.get(${JSON.stringify(SIMPLE_MODE_PARAMETER)})||"").toLowerCase();if(m==="simple"||m==="full"){localStorage.setItem(k,m==="simple"?"on":"off");u.searchParams.delete(${JSON.stringify(SIMPLE_MODE_PARAMETER)});history.replaceState(null,"",u.pathname+u.search+u.hash)}if(localStorage.getItem(k)==="on")document.documentElement.dataset.simpleMode="on"}catch(e){}`;

/** The choice of a browser that keeps nothing: it holds until the page is closed. */
let storedFallback: SimpleModeChoice | null = null;

function readStoredChoice(): SimpleModeChoice | null {
  try {
    return normalizeSimpleModeChoice(window.localStorage.getItem(SIMPLE_MODE_STORAGE_KEY)) ?? storedFallback;
  } catch {
    return storedFallback;
  }
}

type ServerSetting = "on" | "always" | null;

const listeners = new Set<() => void>();
let serverSetting: ServerSetting = null;
let simple = typeof window !== "undefined" ? resolveSimpleMode(readStoredChoice(), serverSetting) : false;

export function applySimpleMode(on: boolean) {
  if (typeof document === "undefined") return;
  if (on) document.documentElement.dataset.simpleMode = "on";
  else delete document.documentElement.dataset.simpleMode;
}

function publish() {
  simple = resolveSimpleMode(readStoredChoice(), serverSetting);
  applySimpleMode(simple);
  listeners.forEach((listener) => listener());
}

/** Switches the simple mode on or off for this browser; a server that fixes it ignores the switch. */
export function setSimpleMode(on: boolean) {
  try {
    window.localStorage.setItem(SIMPLE_MODE_STORAGE_KEY, on ? "on" : "off");
  } catch {
    // The choice still holds for this session when storage is unavailable.
  }
  storedFallback = on ? "on" : "off";
  publish();
}

/** What the server suggests (`on`) or fixes (`always`), as the start of the page learns it. */
export function setServerSimpleMode(setting: ServerSetting) {
  serverSetting = setting;
  publish();
}

export function isSimpleModeFixedByServer() {
  return serverSetting === "always";
}

export function getSimpleMode() {
  return simple;
}

export function subscribeToSimpleMode(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
