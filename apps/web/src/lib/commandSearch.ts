/**
 * The search behind the command palette (Ctrl+K). Plain functions, no React, so
 * the ranking can be tested on its own.
 */

/** What the search needs to know about a command. */
export type SearchableCommand = {
  label: string;
  /** The toolbar group the command lives in, searchable too ("Messen", "Modify"). */
  group: string;
  /** Extra words people may type - synonyms in both languages. */
  keywords?: readonly string[];
  /** A command that cannot run right now still shows up, just after equal hits. */
  enabled?: boolean;
};

/** How many recently used commands the empty search lists first. */
export const RECENT_COMMAND_LIMIT = 5;

/** The list of recently used command ids after running `id`: newest first, no duplicates, capped. */
export function rememberCommand(recent: readonly string[], id: string, limit = RECENT_COMMAND_LIMIT): string[] {
  return [id, ...recent.filter((entry) => entry !== id)].slice(0, limit);
}

/**
 * Lower case, without accents, so "aushöhlen", "AUSHOEHLEN" and "aushohlen"
 * find the same thing. Two spellings of every word are searched: umlauts
 * spelled out (ö -> oe, the way the guide writes them) and umlauts reduced to
 * their base letter (ö -> o, the way most people type on a foreign keyboard).
 *
 * Every script is searched, not only the Latin one: a label is found by what
 * it says in the language it is shown in ("円柱", "Цилиндр", "أسطوانة", "圆柱").
 * What a keyboard or an input method writes differently counts as the same:
 * full-width and half-width forms, katakana and hiragana (so the list already
 * follows while the kana are still being typed, before they are converted),
 * and the Arabic letters with and without their marks.
 */

/** Letters that are a letter of their own to Unicode but an accented one to whoever types them. */
const PLAIN_LETTERS: Readonly<Record<string, string>> = {
  ß: "ss",
  ł: "l",
  ø: "o",
  đ: "d",
  ı: "i",
  æ: "ae",
  œ: "oe",
  // Arabic: the two spellings of a final ya and of a final ha, which are typed one for the other.
  "\u0649": "\u064a",
  "\u0629": "\u0647",
};
const PLAIN_LETTER_PATTERN = new RegExp(`[${Object.keys(PLAIN_LETTERS).join("")}]`, "g");

/**
 * The marks that are accents: the combining diacritics of the Latin, Greek and
 * Cyrillic letters, the Hebrew points, the Arabic vowel signs and the Arabic
 * lengthening stroke. The marks of other scripts stay, they are part of the
 * letter there - the voiced kana ("が" is not "か"), the vowel signs of Indic scripts.
 */
const ACCENT_MARKS = /[\u0300-\u036f\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0640\u064b-\u065f\u0670]/g;

function fold(text: string) {
  return text
    .normalize("NFKD")
    .toLowerCase()
    .replace(PLAIN_LETTER_PATTERN, (letter) => PLAIN_LETTERS[letter])
    .replace(ACCENT_MARKS, "")
    .normalize("NFKC")
    // Katakana to hiragana, the same sound written in the other syllabary.
    .replace(/[\u30a1-\u30f6\u30fd\u30fe]/g, (kana) => String.fromCharCode(kana.charCodeAt(0) - 0x60));
}

function foldUmlautsOut(text: string) {
  return fold(
    text
      .normalize("NFC")
      .toLowerCase()
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue"),
  );
}

function foldAccents(text: string) {
  return fold(text);
}

/** Everything that is not a letter, a digit or a mark belonging to a letter separates words. */
const WORD_BREAK = /[^\p{L}\p{N}\p{M}]+/u;

function words(text: string) {
  return text.split(WORD_BREAK).filter(Boolean);
}

/** The words of a text in both spellings, de-duplicated. */
export function searchWords(text: string): string[] {
  return [...new Set([...words(foldUmlautsOut(text)), ...words(foldAccents(text))])];
}

/**
 * The tokens of a typed query, in both spellings of every token. A query is cut into words the way a label is, so a
 * name typed as it is written finds its entry: "USB-C", "QR-kode", "ねじ（頭付き）".
 */
function queryTokens(query: string): string[][] {
  const spelledOut = words(foldUmlautsOut(query));
  // Both spellings change letters only, never what separates them, so the words stand at the same places.
  return words(foldAccents(query)).map((word, index) => [...new Set([spelledOut[index] ?? word, word])]);
}

/**
 * The scripts written without spaces between the words. A group name is one long word there ("ミラーとパターン",
 * "边缘与壁"), so what is typed may stand anywhere in it, not only at its start.
 */
const UNSPACED_SCRIPT = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;

function tokenScore(spellings: string[], labelWords: string[], keywordWords: string[], groupWords: string[]) {
  let best = 0;
  for (const token of spellings) {
    for (const word of labelWords) {
      if (word === token) best = Math.max(best, 6);
      else if (word.startsWith(token)) best = Math.max(best, 5);
      else if (word.includes(token)) best = Math.max(best, 3);
    }
    for (const word of keywordWords) {
      if (word === token) best = Math.max(best, 5);
      else if (word.startsWith(token)) best = Math.max(best, 4);
      else if (word.includes(token)) best = Math.max(best, 2);
    }
    const anywhere = UNSPACED_SCRIPT.test(token);
    for (const word of groupWords) {
      if (word.startsWith(token) || (anywhere && word.includes(token))) best = Math.max(best, 1);
    }
  }
  return best;
}

/**
 * The commands that match every word of the query, best first: a word that a
 * label starts with beats one that merely appears inside it, a keyword beats a
 * group name, and among equal scores a command that can run comes first and the
 * original order (the order of the toolbar) decides the rest. An empty query
 * returns everything in the original order; one of nothing but punctuation
 * ("?", "---") has no word to look for and finds nothing.
 */
export function searchCommands<T extends SearchableCommand>(commands: readonly T[], query: string): T[] {
  if (!query.trim()) return [...commands];
  const tokens = queryTokens(query);
  if (tokens.length === 0) return [];
  const scored: { command: T; score: number; index: number }[] = [];
  commands.forEach((command, index) => {
    const labelWords = searchWords(command.label);
    const keywordWords = searchWords((command.keywords ?? []).join(" "));
    const groupWords = searchWords(command.group);
    let total = 0;
    for (const spellings of tokens) {
      const score = tokenScore(spellings, labelWords, keywordWords, groupWords);
      if (score === 0) return;
      total += score;
    }
    scored.push({ command, score: total, index });
  });
  return scored
    .sort((a, b) => b.score - a.score || Number(b.command.enabled !== false) - Number(a.command.enabled !== false) || a.index - b.index)
    .map((entry) => entry.command);
}
