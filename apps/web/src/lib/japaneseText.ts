/**
 * What Japanese text needs from a typeface. Plain data and functions with no imports: the
 * interface reads it, and so does scripts/build-japanese-typeface.mjs in Node, which cuts the
 * Japanese face down to these characters.
 */

/** The characters of JIS X 0208 rows `from` to `to`, by way of EUC-JP; empty where the platform cannot decode it. */
function jisRows(from: number, to: number): string[] {
  let decoder: TextDecoder;
  try {
    decoder = new TextDecoder("euc-jp");
  } catch {
    return [];
  }
  const characters: string[] = [];
  for (let row = from; row <= to; row++) {
    for (let cell = 1; cell <= 94; cell++) {
      const char = decoder.decode(Uint8Array.from([0xa0 + row, 0xa0 + cell]));
      if (char && char !== "�") characters.push(char);
    }
  }
  return characters;
}

let common: Set<string> | null = null;

/**
 * The characters the Japanese face keeps, and the ones a font of one's own keeps first when it
 * has more than fit: ASCII and Latin-1, the symbols, kana, Greek and Cyrillic of JIS X 0208
 * rows 1-8, and the 2,965 level-1 kanji of rows 16-47.
 */
export function commonJapaneseCharacters(): ReadonlySet<string> {
  if (common) return common;
  const set = new Set<string>();
  for (let code = 0x20; code <= 0x7e; code++) set.add(String.fromCharCode(code));
  for (let code = 0xa0; code <= 0xff; code++) set.add(String.fromCharCode(code));
  for (const char of jisRows(1, 8)) set.add(char);
  for (const char of jisRows(16, 47)) set.add(char);
  common = set;
  return set;
}

let level2: string[] | null = null;

/** The 3,390 level-2 kanji of JIS X 0208 rows 48-84 (rare names and places: 澤, 槇, 檜), which the Japanese face brings in a second file. */
export function level2JapaneseCharacters(): readonly string[] {
  return (level2 ??= jisRows(48, 84));
}

/**
 * Whether a character is one the built-in faces lack and the Japanese face or its Chinese files
 * (chineseText.ts) bring: kana, kanji and hanzi, their punctuation, bopomofo, the compatibility
 * ideographs and the full-width forms.
 */
export function isJapaneseCharacter(char: string): boolean {
  const code = char.codePointAt(0) ?? 0;
  return (
    (code >= 0x3000 && code <= 0x30ff) ||
    (code >= 0x3100 && code <= 0x312f) ||
    (code >= 0x31a0 && code <= 0x31bf) ||
    (code >= 0x3400 && code <= 0x9fff) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xfe30 && code <= 0xfe4f) ||
    (code >= 0xff01 && code <= 0xff9f) ||
    (code >= 0xffe0 && code <= 0xffe6)
  );
}

/** Whether a text has a character the Japanese face is needed for. */
export function textNeedsJapanese(text: string): boolean {
  for (const char of text) if (isJapaneseCharacter(char)) return true;
  return false;
}

let level2Set: Set<string> | null = null;

/** Whether a text has a level-2 kanji, so the second file is needed; a character neither file has (a simplified hanzi) does not ask for it. */
export function textNeedsJapaneseLevel2(text: string): boolean {
  level2Set ??= new Set(level2JapaneseCharacters());
  for (const char of text) if (level2Set.has(char)) return true;
  return false;
}
