import { getLanguage, t } from "@/lib/i18n";
import { LANGUAGE_INFO } from "@/lib/languages";

/**
 * Whether the keyboard is an Apple one - a Mac, or an iPad with a keyboard,
 * which reports itself as a Mac. Browsers do not say "Darwin"; the user agent
 * says Macintosh. The editor takes Cmd wherever it takes Ctrl, and Option is
 * Alt, so the list shows the keys under the names on that keyboard.
 */
export function appleKeyboard() {
  return typeof navigator !== "undefined" && /Macintosh|Mac OS X|iPhone|iPad|iPod/.test(navigator.userAgent);
}

const APPLE_KEY_NAMES: Record<string, string> = { Ctrl: "Cmd", Alt: "Option" };
/** The short names of the shortcut list and the ones the languages know. */
const LONG_NAMES: Record<string, string> = { PgUp: "Page Up", PgDn: "Page Down" };

/**
 * A key as the keyboard in the chosen language names it: Strg in German, Maj in French (Discussion #1993). "Home / End"
 * is two keys side by side, each named on its own. The names are those of the guide (scripts/build-guide.mjs).
 */
export function keyLabel(key: string, apple = appleKeyboard()): string {
  if (key.includes(" / ")) return key.split(" / ").map((part) => keyLabel(part.trim(), apple)).join(" / ");
  if (key === "Click") return t("shortcuts.click");
  if (key === "RightClick") return t("shortcuts.rightClick");
  if (key === "MiddleClick") return t("shortcuts.middleClick");
  if (key === "Drag") return t("shortcuts.drag");
  if (key === "Wheel") return t("shortcuts.wheel");
  // The names are those of PC keyboards; on an Apple one Strg, Entf and Pos1 do not exist.
  if (apple) return APPLE_KEY_NAMES[key] ?? key;
  const names = LANGUAGE_INFO[getLanguage()]?.keyNames ?? {};
  return names[key] ?? names[LONG_NAMES[key] ?? ""] ?? key;
}

/** A whole combo, "Ctrl+Shift+F", in those names. */
export function comboLabel(combo: string, apple = appleKeyboard()): string {
  return combo.split("+").map((key) => keyLabel(key, apple)).join("+");
}
