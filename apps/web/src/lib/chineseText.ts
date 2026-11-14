import { commonJapaneseCharacters, isJapaneseCharacter, level2JapaneseCharacters } from "@/lib/japaneseText";

/**
 * What Chinese text needs from a typeface (Issue #1757). The Japanese face (japaneseText.ts) has
 * the kanji of JIS X 0208, which leaves out most simplified characters (说, 书, 测, 试) and many
 * traditional ones. Resource Han Rounded CN, cut by scripts/build-japanese-typeface.mjs, brings the
 * rest in four more files beside the Japanese ones, each fetched the first time a text needs it:
 *
 * - `zh1`: the symbols of GB2312 rows 1-9 and its 3,755 level-1 characters (rows 16-55),
 * - `zh2`: the 3,008 level-2 characters of GB2312 (rows 56-87),
 * - `zht1`: the 5,401 common traditional characters of Big5 level 1,
 * - `zht2`: the 7,652 less common ones of Big5 level 2,
 *
 * each without what the Japanese face or an earlier file has already, so a character comes from
 * exactly one file. The interface reads this, and so does the build script in Node.
 */

export type ChineseFile = "zh1" | "zh2" | "zht1" | "zht2";
export const CHINESE_FILES: readonly ChineseFile[] = ["zh1", "zh2", "zht1", "zht2"];

function decoder(label: string): TextDecoder | null {
  try {
    return new TextDecoder(label);
  } catch {
    return null;
  }
}

/** The characters of GB2312 rows `from` to `to`, by way of GBK; empty where the platform cannot decode it. */
function gbRows(from: number, to: number): string[] {
  const gbk = decoder("gbk");
  if (!gbk) return [];
  const characters: string[] = [];
  for (let row = from; row <= to; row++) {
    for (let cell = 1; cell <= 94; cell++) {
      const char = gbk.decode(Uint8Array.from([0xa0 + row, 0xa0 + cell]));
      if (char && char !== "�" && [...char].length === 1) characters.push(char);
    }
  }
  return characters;
}

/** The characters of Big5 from lead byte `from` to `to`, up to `last` (lead and trail as one number). */
function big5Range(from: number, to: number, last: number): string[] {
  const big5 = decoder("big5");
  if (!big5) return [];
  const characters: string[] = [];
  for (let lead = from; lead <= to; lead++) {
    for (let trail = 0x40; trail <= 0xfe; trail++) {
      if (trail > 0x7e && trail < 0xa1) continue;
      if (lead * 256 + trail > last) break;
      const char = big5.decode(Uint8Array.from([lead, trail]));
      if (char && char !== "�" && [...char].length === 1) characters.push(char);
    }
  }
  return characters;
}

const isHan = (char: string) => {
  const code = char.codePointAt(0) ?? 0;
  return (code >= 0x3400 && code <= 0x9fff) || (code >= 0xf900 && code <= 0xfaff);
};

let sets: { gbSymbols: string[]; gb1: string[]; gb2: string[]; big51: string[]; big52: string[] } | null = null;

function standardSets() {
  return (sets ??= {
    gbSymbols: gbRows(1, 9),
    gb1: gbRows(16, 55),
    gb2: gbRows(56, 87),
    // Big5 level 1 runs from A440 to C67E, level 2 from C940 to F9D5.
    big51: big5Range(0xa4, 0xc6, 0xc67e).filter(isHan),
    big52: big5Range(0xc9, 0xf9, 0xf9d5).filter(isHan),
  });
}

/** All characters of GB2312 (symbols, level 1, level 2), in that order: what a simplified-Chinese font keeps first. */
export function gb2312Characters(): { symbols: readonly string[]; level1: readonly string[]; level2: readonly string[] } {
  const { gbSymbols, gb1, gb2 } = standardSets();
  return { symbols: gbSymbols, level1: gb1, level2: gb2 };
}

/** The Han characters of Big5 levels 1 and 2: what a traditional-Chinese font keeps first. */
export function big5Characters(): { level1: readonly string[]; level2: readonly string[] } {
  const { big51, big52 } = standardSets();
  return { level1: big51, level2: big52 };
}

let byFile: Map<ChineseFile, string[]> | null = null;
let fileOf: Map<string, ChineseFile> | null = null;

function assign() {
  if (byFile && fileOf) return;
  const { gbSymbols, gb1, gb2, big51, big52 } = standardSets();
  const taken = new Set<string>(commonJapaneseCharacters());
  for (const char of level2JapaneseCharacters()) taken.add(char);
  const files = new Map<ChineseFile, string[]>();
  const owner = new Map<string, ChineseFile>();
  const sources: [ChineseFile, string[]][] = [["zh1", [...gbSymbols, ...gb1]], ["zh2", gb2], ["zht1", big51], ["zht2", big52]];
  for (const [file, characters] of sources) {
    const own: string[] = [];
    for (const char of characters) {
      // Only what the built-in faces lack: Greek and Cyrillic of the symbol rows come from Sans as everywhere.
      if (taken.has(char) || !isJapaneseCharacter(char)) continue;
      taken.add(char);
      own.push(char);
      owner.set(char, file);
    }
    files.set(file, own);
  }
  byFile = files;
  fileOf = owner;
}

/** The characters one Chinese file holds: none that the Japanese face or an earlier file has. */
export function chineseFileCharacters(file: ChineseFile): readonly string[] {
  assign();
  return byFile?.get(file) ?? [];
}

/** The Chinese file a character comes from, or null when the Japanese face has it or no file does. */
export function chineseFileFor(char: string): ChineseFile | null {
  if (!isJapaneseCharacter(char)) return null;
  assign();
  return fileOf?.get(char) ?? null;
}

/** The Chinese files a text needs, in their order; empty for a text the Japanese face covers. */
export function chineseFilesFor(text: string): ChineseFile[] {
  const needed = new Set<ChineseFile>();
  for (const char of text) {
    const file = chineseFileFor(char);
    if (file) needed.add(file);
  }
  return CHINESE_FILES.filter((file) => needed.has(file));
}
