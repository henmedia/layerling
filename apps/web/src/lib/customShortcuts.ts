/**
 * Keys of your own for the commands of the command search (Discussion #1399): "Center on workplane" on Shift+C,
 * the shapes panel on G, a cylinder on Alt+1. Plain functions and a small store, no React, so the rules can be
 * tested on their own. The keys are a choice of this browser, kept in its storage like the theme.
 */

export const CUSTOM_SHORTCUTS_STORAGE_KEY = "layerling.customShortcuts";
/** Far more than anyone puts on keys; a stored value beyond it is not one of ours. */
export const MAX_CUSTOM_SHORTCUTS = 200;

/** One key of your own: the keys as the shortcut list spells them ("Shift+C") and the command's name when it was set. */
export type CustomShortcut = { combo: string; label: string };
/** By the command's id in the command search. */
export type CustomShortcuts = Record<string, CustomShortcut>;

/** What a key event says about the keys pressed; a DOM KeyboardEvent fits. */
export type KeyPress = Pick<KeyboardEvent, "key" | "code" | "ctrlKey" | "metaKey" | "altKey" | "shiftKey">;

const MODIFIER_KEYS = new Set(["Control", "Meta", "Alt", "AltGraph", "Shift", "CapsLock", "OS", "Hyper", "Super", "Fn"]);
const MODIFIER_ORDER = ["Ctrl", "Alt", "Shift"] as const;
const KEY_NAMES: Record<string, string> = {
  Escape: "Esc",
  " ": "Space",
  ArrowLeft: "←",
  ArrowRight: "→",
  ArrowUp: "↑",
  ArrowDown: "↓",
  PageUp: "PgUp",
  PageDown: "PgDn",
};

/** A letter, a digit or F1 to F12: the keys a command of your own can go on. */
export function isAssignableKey(key: string) {
  return /^[A-Z0-9]$/.test(key) || /^F([1-9]|1[0-2])$/.test(key);
}

/**
 * The keys of a key press as the shortcut list writes them, modifiers first ("Ctrl+Alt+Shift+K"), or null for a
 * modifier alone (the key that will follow is the one that counts). Cmd counts as Ctrl, as everywhere in the editor.
 * A letter is the letter on the key, so it stays the same on a German or French keyboard; a digit is taken from the
 * key's place, so Shift+1 stays Shift+1 instead of "!". When Alt turns a letter into another character (Option on a
 * Mac), the key's place names it.
 */
export function comboFromKeyPress(event: KeyPress): string | null {
  const key = event.key ?? "";
  if (!key || MODIFIER_KEYS.has(key) || key === "Dead" || key === "Unidentified" || key === "Process") return null;
  let name: string;
  if (/^[a-z]$/i.test(key)) name = key.toUpperCase();
  else if (/^Digit[0-9]$/.test(event.code ?? "")) name = event.code.slice(5);
  else if (/^Key[A-Z]$/.test(event.code ?? "") && (event.altKey || event.ctrlKey || event.metaKey)) name = event.code.slice(3);
  else if (/^F([1-9]|1[0-2])$/.test(key)) name = key;
  else name = KEY_NAMES[key] ?? (key.length === 1 ? key.toUpperCase() : key);
  const modifiers = [
    event.ctrlKey || event.metaKey ? "Ctrl" : null,
    event.altKey ? "Alt" : null,
    event.shiftKey ? "Shift" : null,
  ].filter((part): part is string => part !== null);
  return [...modifiers, name].join("+");
}

/** The modifiers and the key of a combo; a combo that ends in "+" names the plus key. */
export function splitCombo(combo: string): { modifiers: string[]; key: string } {
  const parts = combo.split("+");
  if (combo.endsWith("+")) return { modifiers: parts.slice(0, -2).filter(Boolean), key: "+" };
  return { modifiers: parts.slice(0, -1).filter(Boolean), key: parts[parts.length - 1] ?? "" };
}

/** A combo spelled the one way this file uses: known modifiers in a fixed order, each once, then the key. */
export function canonicalCombo(combo: string): string | null {
  const { modifiers, key } = splitCombo(combo.trim());
  if (!key) return null;
  const known = new Set<string>();
  for (const modifier of modifiers) {
    const name = modifier === "Cmd" || modifier === "Meta" ? "Ctrl" : modifier === "Option" ? "Alt" : modifier;
    if (!(MODIFIER_ORDER as readonly string[]).includes(name)) return null;
    known.add(name);
  }
  return [...MODIFIER_ORDER.filter((name) => known.has(name)), key].join("+");
}

/** Whether a combo can carry a command of your own: an assignable key, alone or with modifiers. */
export function isAssignableCombo(combo: string) {
  const canonical = canonicalCombo(combo);
  return canonical !== null && isAssignableKey(splitCombo(canonical).key);
}

/**
 * Every single combo a line of the shortcut list stands for: "1 – 6" is the digits 1 to 6, "Alt+1 – 0" Alt with every
 * digit, "7 / 8 / 9 / 0" four keys, "0-9" all ten. Mouse actions ("Shift+Click") and plain modifiers are not keys.
 */
export function expandShortcutCombo(combo: string): string[] {
  const digitRange = (from: string, to: string) => {
    const start = Number(from);
    const end = to === "0" && start > 0 ? 10 : Number(to);
    const digits: string[] = [];
    for (let digit = start; digit <= end; digit += 1) digits.push(String(digit % 10));
    return digits;
  };
  const parts = combo.split("+").map((part) => part.trim());
  // "+" alone, or a combo that ends in "+": the plus key.
  if (combo.trim() === "+" || combo.trim().endsWith("++")) return [canonicalCombo(combo.trim()) ?? combo.trim()];
  const keyPart = parts[parts.length - 1] ?? "";
  const modifiers = parts.slice(0, -1);
  const keys = keyPart.split("/").map((key) => key.trim()).filter(Boolean).flatMap((key) => {
    const range = /^([0-9])\s*[–-]\s*([0-9])$/.exec(key);
    return range ? digitRange(range[1], range[2]) : [key];
  });
  return keys
    .filter((key) => !["Click", "RightClick", "Drag", "Wheel", "Shift", "Alt", "Ctrl"].includes(key))
    .map((key) => canonicalCombo([...modifiers, key].join("+")))
    .filter((value): value is string => value !== null);
}

/**
 * Keys the editor reacts to without the shortcut list naming them, read off its key handlers: a handler that asks
 * for the letter and not for Shift answers Shift+letter as well, and the Ctrl ones Ctrl+Shift too. A key of your own
 * would run ahead of them, so they are kept free.
 */
const EDITOR_KEYS: readonly string[] = [
  ..."BDEFHLMNORSTW".split("").flatMap((letter) => [letter, `Shift+${letter}`]),
  ..."CPQ".split(""),
  ..."ABCDEGHILOSVXYZ".split("").flatMap((letter) => [`Ctrl+${letter}`, `Ctrl+Shift+${letter}`]),
  "Alt+W",
  ..."0123456789".split("").flatMap((digit) => [digit, `Shift+${digit}`, `Alt+${digit}`]),
  "Shift+F1",
];

/** Keys the browser or the system keeps for itself, or that a page should not take away. */
const BROWSER_KEYS: readonly string[] = [
  "Ctrl+W", "Ctrl+T", "Ctrl+N", "Ctrl+Q", "Ctrl+R", "Ctrl+P", "Ctrl+F", "Ctrl+J", "Ctrl+U", "Ctrl+K",
  "Ctrl+Shift+N", "Ctrl+Shift+T", "Ctrl+Shift+W", "Ctrl+Shift+I", "Ctrl+Shift+J", "Ctrl+Shift+C", "Ctrl+Shift+R",
  "Ctrl+Shift+Q", "Ctrl+Shift+Delete",
  ..."123456789".split("").map((digit) => `Ctrl+${digit}`),
  "F1", "F3", "F5", "F6", "F7", "F10", "F11", "F12", "Ctrl+F4", "Ctrl+F5", "Shift+F5", "Alt+F4", "Shift+F10",
];

/** Where a taken key belongs: a line of the shortcut list (its text key), the editor's own handling, or the browser. */
export type KeyOwner = { kind: "list"; label: string } | { kind: "editor" } | { kind: "browser" };

/** Every key that is taken already, with what it is taken by; the shortcut list's lines first. */
export function takenKeys(listed: readonly { combos: readonly string[]; label: string }[]): Map<string, KeyOwner> {
  const taken = new Map<string, KeyOwner>();
  for (const line of listed) {
    for (const combo of line.combos) {
      for (const single of expandShortcutCombo(combo)) {
        if (!taken.has(single)) taken.set(single, { kind: "list", label: line.label });
      }
    }
  }
  for (const combo of EDITOR_KEYS) {
    const canonical = canonicalCombo(combo);
    if (canonical && !taken.has(canonical)) taken.set(canonical, { kind: "editor" });
  }
  for (const combo of BROWSER_KEYS) {
    const canonical = canonicalCombo(combo);
    if (canonical && !taken.has(canonical)) taken.set(canonical, { kind: "browser" });
  }
  return taken;
}

/** Why a key cannot go on a command, or null when it can. */
export type KeyRefusal =
  | { reason: "unusable" }
  | { reason: "taken"; owner: KeyOwner }
  | { reason: "own"; commandId: string; label: string };

export function keyRefusal(
  combo: string,
  commandId: string,
  taken: ReadonlyMap<string, KeyOwner>,
  own: CustomShortcuts,
): KeyRefusal | null {
  const canonical = canonicalCombo(combo);
  if (!canonical || !isAssignableCombo(canonical)) return { reason: "unusable" };
  const owner = taken.get(canonical);
  if (owner) return { reason: "taken", owner };
  for (const [id, shortcut] of Object.entries(own)) {
    if (id !== commandId && shortcut.combo === canonical) return { reason: "own", commandId: id, label: shortcut.label };
  }
  return null;
}

/** Commands whose id changes from design to design (a body of the design) cannot keep a key. */
export function isBindableCommandId(id: string) {
  return id.length > 0 && id.length <= 200 && !id.startsWith("object-");
}

/**
 * A stored or imported value brought into shape: only commands that can keep a key, only keys that can carry one,
 * each key once (the first wins), each name a short text.
 */
export function normalizeCustomShortcuts(value: unknown): CustomShortcuts {
  const result: CustomShortcuts = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return result;
  const used = new Set<string>();
  for (const [id, entry] of Object.entries(value as Record<string, unknown>)) {
    if (Object.keys(result).length >= MAX_CUSTOM_SHORTCUTS) break;
    if (!isBindableCommandId(id) || !entry || typeof entry !== "object") continue;
    const { combo, label } = entry as Record<string, unknown>;
    const canonical = typeof combo === "string" ? canonicalCombo(combo) : null;
    if (!canonical || !isAssignableCombo(canonical) || used.has(canonical)) continue;
    used.add(canonical);
    result[id] = { combo: canonical, label: typeof label === "string" ? label.slice(0, 200) : id };
  }
  return result;
}

/** The command a combo runs, if one of your own keys is that combo. */
export function commandForCombo(shortcuts: CustomShortcuts, combo: string): string | null {
  for (const [id, shortcut] of Object.entries(shortcuts)) {
    if (shortcut.combo === combo) return id;
  }
  return null;
}

/** What a key of your own needs to know about a command of the search. */
export type RunnableCommand = { id: string; label: string; enabled: boolean; run: () => void };

/** A field that takes typed text keeps its keys, as it does from the editor's own shortcuts. */
function isTextEntry(target: EventTarget | null) {
  return typeof HTMLElement !== "undefined" && target instanceof HTMLElement
    && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
}

/**
 * Runs the command on a key of your own, if the key is one: the editor's toolbar calls this for every key, before
 * anything else sees it. It keeps out of the way where the editor's own keys do - in a text field, behind a window
 * that holds the keys (any open dialog marked aria-modal), behind the project overview, while `blocked` (a body is
 * being split), while the shortcut list waits for a key - and for a key whose command is not there now (a command of
 * the other mode, a shape that is gone). Otherwise the key is stopped, so nothing else answers it as well, and the
 * command runs; one that cannot run right now says so through `unavailable`. True when the key was taken.
 */
export function runCustomShortcutKey(
  event: KeyboardEvent,
  commands: () => readonly RunnableCommand[],
  options: { blocked?: boolean; unavailable?: (command: RunnableCommand) => void } = {},
): boolean {
  if (event.repeat || event.isComposing || recording || options.blocked) return false;
  if (isTextEntry(event.target)) return false;
  if (typeof document !== "undefined") {
    if (document.querySelector('[aria-modal="true"]')) return false;
    const stage = document.querySelector(".editor-stage");
    if (stage && !stage.classList.contains("active")) return false;
  }
  const combo = comboFromKeyPress(event);
  const id = combo ? commandForCombo(readCustomShortcuts(), combo) : null;
  if (!id) return false;
  const command = commands().find((entry) => entry.id === id);
  if (!command) return false;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (command.enabled) command.run();
  else options.unavailable?.(command);
  return true;
}

// The store: read once, kept in memory, written through. Another tab's change comes in with the storage event.
let cache: CustomShortcuts | null = null;
const listeners = new Set<() => void>();

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readCustomShortcuts(): CustomShortcuts {
  if (cache) return cache;
  let parsed: unknown = {};
  try {
    parsed = JSON.parse(storage()?.getItem(CUSTOM_SHORTCUTS_STORAGE_KEY) ?? "{}");
  } catch {
    parsed = {};
  }
  cache = normalizeCustomShortcuts(parsed);
  return cache;
}

export function writeCustomShortcuts(next: CustomShortcuts) {
  cache = normalizeCustomShortcuts(next);
  try {
    if (Object.keys(cache).length === 0) storage()?.removeItem(CUSTOM_SHORTCUTS_STORAGE_KEY);
    else storage()?.setItem(CUSTOM_SHORTCUTS_STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Without storage the keys last as long as the page.
  }
  listeners.forEach((listener) => listener());
}

/** Calls back whenever the keys change, here or in another tab; returns the way to stop. */
export function subscribeCustomShortcuts(listener: () => void): () => void {
  listeners.add(listener);
  const fromOtherTab = (event: StorageEvent) => {
    if (event.key !== CUSTOM_SHORTCUTS_STORAGE_KEY && event.key !== null) return;
    cache = null;
    listener();
  };
  if (typeof window !== "undefined") window.addEventListener("storage", fromOtherTab);
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") window.removeEventListener("storage", fromOtherTab);
  };
}

/** Forgets what was read, so the next read asks the storage again (tests, and an import of the settings). */
export function forgetCustomShortcutsCache() {
  cache = null;
}

// While the shortcut list waits for a key to set, a key press must not run anything.
let recording = false;
export function setCustomShortcutRecording(value: boolean) {
  recording = value;
}
export function customShortcutRecording() {
  return recording;
}

/**
 * The commands of the command search as they are right now, for the shortcut list: the toolbar builds them, the
 * list only reads them. Null while no toolbar is there.
 */
type CommandSource<T> = () => T[];
let commandSource: CommandSource<unknown> | null = null;
export function setCustomShortcutCommandSource<T>(source: CommandSource<T> | null) {
  commandSource = source as CommandSource<unknown> | null;
}
export function customShortcutCommands<T>(): T[] {
  return commandSource ? (commandSource() as T[]) : [];
}
