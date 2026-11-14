import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CHINESE_FILES, chineseFileCharacters, chineseFileFor, chineseFilesFor } from "@/lib/chineseText";
import { MAX_CUSTOM_FONT_CHARACTERS, customFontRanks, customFontScript } from "@/lib/customFonts";
import { commonJapaneseCharacters, level2JapaneseCharacters, textNeedsJapanese, textNeedsJapaneseLevel2 } from "@/lib/japaneseText";
import { JAPANESE_FONT, chineseFileLoaded, customFontRevision, loadGlyphsForText, loadTextFonts, resetJapaneseTypefaceForTests, setJapaneseTypefaceFetcherForTests, textFont } from "@/lib/textFonts";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { FontData } from "three/examples/jsm/loaders/FontLoader.js";

/*
 * Chinese text (Issue #1757): "中文测试" and "说明书" came out as question marks, in every built-in
 * face and even in a Chinese font of one's own. The Japanese face lacks the simplified hanzi; four
 * files cut from Resource Han Rounded CN bring them, and a font of one's own keeps the common
 * characters of its own language.
 */
const fontRoot = fileURLToPath(new URL("../../apps/web/public/fonts/japanese/", import.meta.url));
const generated = existsSync(`${fontRoot}version.txt`) && existsSync(`${fontRoot}${readFileSync(`${fontRoot}version.txt`, "utf8").trim()}/zh1.typeface.json`);
const readTypeface = async (file: string) => JSON.parse(readFileSync(`${fontRoot}${readFileSync(`${fontRoot}version.txt`, "utf8").trim()}/${file}.typeface.json`, "utf8")) as FontData;

describe("which file a Chinese character comes from", () => {
  it("needs the Chinese files for simplified hanzi, not for kanji the Japanese face has", () => {
    expect(textNeedsJapanese("中文测试")).toBe(true);
    expect(chineseFilesFor("中文测试")).toEqual(["zh1"]);
    expect(chineseFilesFor("说明书")).toEqual(["zh1"]);
    expect(chineseFilesFor("名前太郎")).toEqual([]);
    expect(chineseFilesFor("Anna")).toEqual([]);
    for (const char of "说书测试") expect(chineseFileFor(char), char).toBe("zh1");
    for (const char of "中文明") expect(chineseFileFor(char), char).toBeNull();
  });

  it("does not fetch the level-2 kanji for a simplified hanzi", () => {
    expect(textNeedsJapaneseLevel2("说明书")).toBe(false);
    expect(textNeedsJapaneseLevel2("澤")).toBe(true);
  });

  it("gives every character to one file only, and none the Japanese face has", () => {
    const japanese = new Set([...commonJapaneseCharacters(), ...level2JapaneseCharacters()]);
    const seen = new Set<string>();
    for (const file of CHINESE_FILES) {
      const characters = chineseFileCharacters(file);
      expect(characters.length, file).toBeGreaterThan(100);
      for (const char of characters) {
        expect(japanese.has(char), `${file}: ${char}`).toBe(false);
        expect(seen.has(char), `${file}: ${char}`).toBe(false);
        seen.add(char);
      }
    }
    // Traditional characters Japanese does not use, and bopomofo.
    for (const file of CHINESE_FILES) expect(chineseFileFor(chineseFileCharacters(file)[0]), file).toBe(file);
    expect(chineseFileFor("ㄅ")).toBe("zh1");
  });
});

describe("a Chinese font of one's own", () => {
  // A pan-CJK font: Latin and every character of the unified block, more than are kept.
  const everything = new Set<string>();
  for (let code = 0x20; code <= 0x7e; code++) everything.add(String.fromCharCode(code));
  for (let code = 0x4e00; code <= 0x9fff; code++) everything.add(String.fromCharCode(code));
  const kept = (has: Set<string>, language: string) => {
    const rank = customFontRanks(has, language);
    return new Set([...has].sort((a, b) => rank(a) - rank(b) || a.codePointAt(0)! - b.codePointAt(0)!).slice(0, MAX_CUSTOM_FONT_CHARACTERS));
  };

  it("is told apart from a Japanese one by what it has", () => {
    const japaneseOnly = new Set([...commonJapaneseCharacters(), ...level2JapaneseCharacters()]);
    expect(customFontScript(japaneseOnly, "en")).toBe("japanese");
    expect(customFontScript(everything, "zh-CN")).toBe("simplified");
    expect(customFontScript(everything, "zh-TW")).toBe("traditional");
    expect(customFontScript(everything, "ja")).toBe("japanese");
  });

  it("keeps the simplified hanzi, which came late by code point and were cut off", () => {
    const simplified = kept(everything, "zh-CN");
    for (const char of "说明书中文测试Ab") expect(simplified.has(char), char).toBe(true);
    const traditional = kept(everything, "zh-TW");
    for (const char of "說明書們測試") expect(traditional.has(char), char).toBe(true);
    // A Japanese font keeps its kanji as before.
    const japanese = kept(everything, "ja");
    for (const char of "郎高鈴澤") expect(japanese.has(char), char).toBe(true);
  });
});

describe.skipIf(!generated)("the Chinese files", () => {
  beforeEach(() => setJapaneseTypefaceFetcherForTests(readTypeface));
  afterEach(() => resetJapaneseTypefaceForTests());

  it("lend the simplified hanzi to every face when a text needs them", async () => {
    await loadTextFonts();
    const names = ["Multilanguage", "Sans", "Serif", "Script", "Monospace", "Rounded", JAPANESE_FONT];
    const before = customFontRevision(undefined);
    await loadGlyphsForText("说明书");
    expect(chineseFileLoaded("zh1")).toBe(true);
    expect(chineseFileLoaded("zht2")).toBe(false);
    expect(customFontRevision(undefined)).not.toBe(before);
    for (const name of names) {
      const glyphs = textFont(name).data.glyphs as Record<string, unknown>;
      for (const char of "说明书中文测试") expect(glyphs[char], `${name}: ${char}`).toBeDefined();
      expect(textFont(name).generateShapes("说", 10).length).toBeGreaterThan(0);
    }
  });
});
