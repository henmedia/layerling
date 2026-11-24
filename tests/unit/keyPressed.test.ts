import { afterEach, describe, expect, it } from "vitest";
import { pressedDigit, pressedKey } from "@/lib/keyPressed";
import { comboLabel, keyLabel } from "@/lib/keyNames";
import { comboFromKeyPress } from "@/lib/customShortcuts";
import { setLanguage } from "@/lib/i18n";

describe("the key a press means (Discussion #1993)", () => {
  it("keeps the letter of a Latin keyboard, wherever it lies", () => {
    expect(pressedKey({ key: "z", code: "KeyY" })).toBe("z");
    expect(pressedKey({ key: "A", code: "KeyQ" })).toBe("a");
    expect(pressedKey({ key: ",", code: "KeyM" })).toBe(",");
    expect(pressedKey({ key: "é", code: "KeyW" })).toBe("é");
    expect(pressedKey({ key: "'", code: "KeyQ" })).toBe("'");
    expect(pressedKey({ key: "Enter", code: "Enter" })).toBe("enter");
    expect(pressedKey({})).toBe("");
  });

  it("goes by the place on a keyboard of another script", () => {
    expect(pressedKey({ key: "с", code: "KeyC" })).toBe("c");
    expect(pressedKey({ key: "Я", code: "KeyZ" })).toBe("z");
    expect(pressedKey({ key: "ψ", code: "KeyC" })).toBe("c");
    expect(pressedKey({ key: ";", code: "KeyQ" })).toBe("q");
    expect(pressedKey({ key: "'", code: "KeyW" })).toBe("w");
    expect(pressedKey({ key: "ז", code: "KeyZ" })).toBe("z");
    expect(pressedKey({ key: "لا", code: "KeyB" })).toBe("b");
    expect(pressedKey({ key: "х", code: "BracketLeft" })).toBe("х");
  });

  it("finds a digit that needs Shift by its place, and leaves the editor's own signs alone", () => {
    expect(pressedDigit({ key: "1", code: "Digit1" })).toBe("1");
    expect(pressedDigit({ key: "&", code: "Digit1" })).toBe("1");
    expect(pressedDigit({ key: "à", code: "Digit0" })).toBe("0");
    expect(pressedDigit({ key: "-", code: "Digit6" })).toBeNull();
    expect(pressedDigit({ key: "+", code: "Digit1" })).toBeNull();
    expect(pressedDigit({ key: "a", code: "KeyQ" })).toBeNull();
  });

  it("records a key of your own from a Russian keyboard", () => {
    const press = { key: "п", code: "KeyG", ctrlKey: false, metaKey: false, altKey: false, shiftKey: false };
    expect(comboFromKeyPress(press)).toBe("G");
    expect(comboFromKeyPress({ ...press, shiftKey: true, key: "П" })).toBe("Shift+G");
  });
});

describe("the names of the keys (Discussion #1993)", () => {
  afterEach(async () => { await setLanguage("en"); });

  it("names them as the keyboard in the chosen language does", async () => {
    await setLanguage("de");
    expect(comboLabel("Ctrl+Shift+Z", false)).toBe("Strg+Umschalt+Z");
    expect(keyLabel("Home / End", false)).toBe("Pos1 / Ende");
    await setLanguage("fr");
    expect(comboLabel("Shift+F", false)).toBe("Maj+F");
    await setLanguage("en");
    expect(comboLabel("Ctrl+Shift+Z", false)).toBe("Ctrl+Shift+Z");
  });

  it("keeps the Mac's names", async () => {
    await setLanguage("de");
    expect(comboLabel("Ctrl+Alt+K", true)).toBe("Cmd+Option+K");
    expect(keyLabel("Delete", true)).toBe("Delete");
  });
});
