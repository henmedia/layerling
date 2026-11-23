/**
 * The key a press means for the editor's shortcuts, whatever keyboard it comes from (Discussion #1993). Plain
 * functions, no React.
 */

type Press = { key?: string; code?: string };

/** A letter or sign of another script - Cyrillic, Greek, Hebrew, Arabic - with no Latin letter in it. */
const OTHER_SCRIPT = /^(?=.*[\p{L}\p{M}])[^\p{Script=Latin}]+$/u;

/**
 * Keys in a letter's place that carry no letter of their own: the Hebrew keyboard writes "/" on Q and "'" on W, the
 * Greek one ";" (with Shift ":") on Q. No Latin keyboard puts these signs in these places.
 */
const SIGNS_ON_LETTER_KEYS: Readonly<Record<string, string>> = { KeyQ: "/;:", KeyW: "'" };

/**
 * The key in lower case. A Latin keyboard's letter is the letter on the key, so Z stays Z on a German keyboard and A
 * on a French one. A keyboard of another script has no Latin letters to go by: there the key's place names the letter.
 */
export function pressedKey(event: Press): string {
  // Chrome sends keydown without a key when an autofill suggestion is picked.
  const key = event.key ?? "";
  const letter = /^Key([A-Z])$/.exec(event.code ?? "")?.[1];
  const byPlace = OTHER_SCRIPT.test(key) || (key.length === 1 && SIGNS_ON_LETTER_KEYS[event.code ?? ""]?.includes(key));
  return letter && byPlace ? letter.toLowerCase() : key.toLowerCase();
}

/** Signs the editor has a use for (zoom, the snap step, the typed angle); on a digit's key they stay what they are. */
const SIGNS_IN_USE = new Set(["+", "=", "-", "_", ",", ".", "<"]);

/**
 * The digit a press means, or null: the digit typed, or else the one of the key's place, since a French or Czech
 * keyboard writes digits only with Shift. A sign the editor uses itself stays that sign.
 */
export function pressedDigit(event: Press): string | null {
  const key = event.key ?? "";
  if (/^[0-9]$/.test(key)) return key;
  if (SIGNS_IN_USE.has(key)) return null;
  return /^Digit([0-9])$/.exec(event.code ?? "")?.[1] ?? null;
}
