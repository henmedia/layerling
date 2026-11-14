import { describe, expect, it } from "vitest";
import { COMMAND_KEYWORDS } from "@/lib/commandKeywords";
import { rememberCommand, searchCommands, searchWords, type SearchableCommand } from "@/lib/commandSearch";

type Cmd = SearchableCommand & { id: string };

const COMMANDS: Cmd[] = [
  { id: "copy", label: "Kopieren", group: "Zwischenablage", keywords: ["copy"] },
  { id: "fillet", label: "Verrunden", group: "Anpassen", keywords: ["fillet", "abrunden", "radius"], enabled: false },
  { id: "chamfer", label: "Fase", group: "Anpassen", keywords: ["chamfer", "abschraegen"] },
  { id: "hollow", label: "Aushöhlen", group: "Anpassen", keywords: ["hollow", "shell"] },
  { id: "cylinder", label: "Form hinzufügen: Zylinder", group: "Formen", keywords: ["cylinder", "rohr"] },
  { id: "cone", label: "Form hinzufügen: Kegel", group: "Formen" },
  { id: "measure", label: "Lineal", group: "Messen" },
];

const ids = (query: string) => searchCommands(COMMANDS, query).map((command) => command.id);

describe("searchCommands", () => {
  it("returns everything in toolbar order for an empty query", () => {
    expect(ids("")).toEqual(COMMANDS.map((command) => command.id));
    expect(ids("   ")).toEqual(COMMANDS.map((command) => command.id));
  });

  it("finds by label, keyword in the other language, and group", () => {
    expect(ids("kopier")).toEqual(["copy"]);
    expect(ids("shell")).toEqual(["hollow"]);
    expect(ids("messen")).toEqual(["measure"]);
    expect(ids("cylinder")).toEqual(["cylinder"]);
  });

  it("does not care about case, umlauts or their spelled-out form", () => {
    expect(ids("AUSHÖHLEN")).toEqual(["hollow"]);
    expect(ids("aushoehlen")).toEqual(["hollow"]);
    expect(ids("aushohlen")).toEqual(["hollow"]);
    expect(ids("zylinder")).toEqual(["cylinder"]);
    expect(ids("verrunden")).toEqual(["fillet"]);
    expect(ids("hinzufuegen kegel")).toEqual(["cone"]);
  });

  it("needs every word of the query to match", () => {
    expect(ids("form kegel")).toEqual(["cone"]);
    expect(ids("form lineal")).toEqual([]);
  });

  it("ranks the whole word above a word start, and that above a hit inside a word", () => {
    const ranked = searchCommands(
      [
        { id: "inside", label: "Verfasen", group: "x" },
        { id: "start", label: "Fasenwerkzeug", group: "x" },
        { id: "whole", label: "Fase", group: "x" },
      ],
      "fase",
    ).map((command) => command.id);
    expect(ranked).toEqual(["whole", "start", "inside"]);
  });

  it("ranks a hit in the label above one in a keyword, and that above the group", () => {
    const ranked = searchCommands(
      [
        { id: "group", label: "Nichts", group: "Spiegeln" },
        { id: "keyword", label: "Anderes", group: "x", keywords: ["spiegeln"] },
        { id: "label", label: "Spiegeln", group: "x" },
      ],
      "spiegeln",
    ).map((command) => command.id);
    expect(ranked).toEqual(["label", "keyword", "group"]);
  });

  it("lists a command that cannot run after an equal hit that can", () => {
    expect(ids("anpassen")).toEqual(["chamfer", "hollow", "fillet"]);
  });

  it("remembers the newest command first, once, and only a few", () => {
    expect(rememberCommand([], "copy")).toEqual(["copy"]);
    expect(rememberCommand(["copy", "paste"], "paste")).toEqual(["paste", "copy"]);
    expect(rememberCommand(["a", "b", "c", "d", "e"], "f")).toEqual(["f", "a", "b", "c", "d"]);
    expect(rememberCommand(["a", "b"], "c", 2)).toEqual(["c", "a"]);
  });

  it("splits words in both spellings", () => {
    expect(searchWords("Aushöhlen")).toEqual(expect.arrayContaining(["aushoehlen", "aushohlen"]));
  });

  it("finds a Polish label by its word without the ł", () => {
    const commands: Cmd[] = [{ id: "flat", label: "Połóż płasko na ścianie", group: "Edycja" }];
    const found = (query: string) => searchCommands(commands, query).map((command) => command.id);
    expect(found("polóz")).toEqual(["flat"]);
    expect(found("poloz plasko")).toEqual(["flat"]);
    expect(found("połóż")).toEqual(["flat"]);
  });

  it("finds a label in a script that is not Latin: Japanese, Chinese, Russian, Arabic", () => {
    const commands: Cmd[] = [
      { id: "ja-cylinder", label: "シェイプを追加: 円柱", group: "シェイプ" },
      { id: "ja-fillet", label: "フィレット", group: "修正" },
      { id: "ja-ungroup", label: "グループ化を解除", group: "結合" },
      { id: "zh-cylinder", label: "添加形状：圆柱", group: "形状" },
      { id: "ru-cylinder", label: "Добавить фигуру: Цилиндр", group: "Фигуры" },
      { id: "ru-hollow", label: "Сделать полым", group: "Изменить" },
      { id: "ar-cylinder", label: "إضافة شكل: أسطوانة", group: "الأشكال" },
    ];
    const found = (query: string) => searchCommands(commands, query).map((command) => command.id);
    expect(found("円柱")).toEqual(["ja-cylinder"]);
    expect(found("フィレ")).toEqual(["ja-fillet"]);
    // Japanese writes no spaces: a word in the middle of a label is found too, and so is the group.
    expect(found("解除")).toEqual(["ja-ungroup"]);
    expect(found("追加 円柱")).toEqual(["ja-cylinder"]);
    expect(found("修正")).toEqual(["ja-fillet"]);
    expect(found("圆柱")).toEqual(["zh-cylinder"]);
    expect(found("цилиндр")).toEqual(["ru-cylinder"]);
    expect(found("ПОЛЫМ")).toEqual(["ru-hollow"]);
    expect(found("أسطوانة")).toEqual(["ar-cylinder"]);
    expect(found("xyzzy")).toEqual([]);
    expect(found("球")).toEqual([]);
  });

  it("takes what the Japanese input writes differently as the same: kana, full width, half width", () => {
    const commands: Cmd[] = [
      { id: "fillet", label: "フィレット", group: "修正" },
      { id: "group", label: "グループ化", group: "結合", keywords: ["group"] },
      { id: "stl", label: "STLを書き出す", group: "ファイル" },
    ];
    const found = (query: string) => searchCommands(commands, query).map((command) => command.id);
    // Hiragana, as the field holds it while the word is still being typed.
    expect(found("ふぃれ")).toEqual(["fillet"]);
    expect(found("ぐるーぷ")).toEqual(["group"]);
    expect(found("ｸﾞﾙｰﾌﾟ")).toEqual(["group"]);
    expect(found("ＳＴＬ")).toEqual(["stl"]);
    expect(found("ｇｒｏｕｐ")).toEqual(["group"]);
    // A full-width space separates the words like a plain one.
    expect(found("書き出す　ＳＴＬ")).toEqual(["stl"]);
    // The voiced kana is another letter, not an accent.
    expect(found("くるーぷ")).toEqual([]);
  });

  it("does not care about the accents and marks of other alphabets either", () => {
    const commands: Cmd[] = [
      { id: "da", label: "Sløjfe på æsken", group: "x" },
      { id: "tr", label: "Işık ve Çizgi", group: "x" },
      { id: "ru", label: "Жёлтый слой", group: "x" },
      { id: "ar", label: "أَسْطُوَانَة", group: "x" },
      { id: "cs", label: "Zkosení hrany", group: "x" },
    ];
    const found = (query: string) => searchCommands(commands, query).map((command) => command.id);
    expect(found("sløjfe")).toEqual(["da"]);
    expect(found("slojfe aesken")).toEqual(["da"]);
    expect(found("isik cizgi")).toEqual(["tr"]);
    expect(found("IŞIK")).toEqual(["tr"]);
    expect(found("желтый")).toEqual(["ru"]);
    expect(found("اسطوانه")).toEqual(["ar"]);
    expect(found("zkoseni")).toEqual(["cs"]);
  });

  it("cuts a query into words the way a label is cut, so a name typed with its hyphen or brackets is found", () => {
    const commands: Cmd[] = [
      { id: "port", label: "Port opening", group: "Shapes", keywords: ["usb-c", "micro-usb"] },
      { id: "qr", label: "QR-kode", group: "Former" },
      { id: "thread", label: "ねじ（頭付き）", group: "シェイプ" },
    ];
    const found = (query: string) => searchCommands(commands, query).map((command) => command.id);
    expect(found("usb-c")).toEqual(["port"]);
    expect(found("QR-kode")).toEqual(["qr"]);
    expect(found("ねじ（頭付き）")).toEqual(["thread"]);
  });

  it("finds nothing for a query of nothing but punctuation, and everything for an empty one", () => {
    expect(ids("")).toEqual(COMMANDS.map((command) => command.id));
    expect(ids("  \u3000 ")).toEqual(COMMANDS.map((command) => command.id));
    expect(ids("?")).toEqual([]);
    expect(ids("---")).toEqual([]);
    expect(ids("（）")).toEqual([]);
  });

  it("finds a word anywhere in a group name that is written without spaces", () => {
    const commands: Cmd[] = [
      { id: "fillet", label: "フィレット", group: "エッジと壁" },
      { id: "array", label: "パターン", group: "ミラーとパターン" },
      { id: "mirror", label: "ミラー", group: "ミラーとパターン" },
      { id: "zh-fillet", label: "圆角", group: "边缘与壁" },
      { id: "measure", label: "Ruler", group: "Measure" },
    ];
    const found = (query: string) => searchCommands(commands, query).map((command) => command.id);
    // The label that says it comes before the one that is only in the group of that name.
    expect(found("パターン")).toEqual(["array", "mirror"]);
    expect(found("ぱたーん")).toEqual(["array", "mirror"]);
    expect(found("壁")).toEqual(["fillet", "zh-fillet"]);
    // A group name with spaces between its words is still found by how a word starts only.
    expect(found("meas")).toEqual(["measure"]);
    expect(found("sure")).toEqual([]);
  });

  it("finds Delete face by the words other programs use, in both languages", () => {
    const commands: Cmd[] = [
      { id: "delete", label: "Delete", group: "Edit", keywords: COMMAND_KEYWORDS.delete },
      { id: "deleteFace", label: "Delete face", group: "Modify", keywords: COMMAND_KEYWORDS.deleteFace },
    ];
    const found = (query: string) => searchCommands(commands, query).map((command) => command.id);
    expect(found("defeature")).toEqual(["deleteFace"]);
    expect(found("remove fillet")).toEqual(["deleteFace"]);
    expect(found("Fläche löschen")).toEqual(["deleteFace"]);
  });
});
