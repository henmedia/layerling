import { describe, expect, it } from "vitest";
import {
  canonicalCombo,
  comboFromKeyPress,
  commandForCombo,
  expandShortcutCombo,
  isAssignableCombo,
  keyRefusal,
  normalizeCustomShortcuts,
  takenKeys,
  type KeyPress,
} from "@/lib/customShortcuts";

// Keys of your own (Discussion #1399): how a key press is written, which keys are free, and what a stored value may hold.
const press = (key: string, code: string, modifiers: Partial<KeyPress> = {}): KeyPress => ({
  key,
  code,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  ...modifiers,
});

describe("a key press as the shortcut list writes it", () => {
  it("names a letter by the letter on the key, in capitals, modifiers first in a fixed order", () => {
    expect(comboFromKeyPress(press("g", "KeyG"))).toBe("G");
    expect(comboFromKeyPress(press("C", "KeyC", { shiftKey: true }))).toBe("Shift+C");
    expect(comboFromKeyPress(press("k", "KeyK", { shiftKey: true, altKey: true, ctrlKey: true }))).toBe("Ctrl+Alt+Shift+K");
    // On a German keyboard the key marked Z sends code KeyY: the letter counts, not the place.
    expect(comboFromKeyPress(press("z", "KeyY"))).toBe("Z");
  });

  it("takes Cmd for Ctrl and a digit from its place, so Shift+1 stays Shift+1", () => {
    expect(comboFromKeyPress(press("j", "KeyJ", { metaKey: true }))).toBe("Ctrl+J");
    expect(comboFromKeyPress(press("!", "Digit1", { shiftKey: true }))).toBe("Shift+1");
    expect(comboFromKeyPress(press("1", "Numpad1"))).toBe("1");
  });

  it("names the key by its place when Alt makes another character of it (Option on a Mac)", () => {
    expect(comboFromKeyPress(press("ç", "KeyC", { altKey: true }))).toBe("Alt+C");
  });

  it("waits for the real key while only a modifier is down", () => {
    expect(comboFromKeyPress(press("Shift", "ShiftLeft", { shiftKey: true }))).toBeNull();
    expect(comboFromKeyPress(press("Control", "ControlLeft", { ctrlKey: true }))).toBeNull();
    expect(comboFromKeyPress(press("Dead", "Quote"))).toBeNull();
  });

  it("names the keys that cannot carry a command, so the refusal can say which", () => {
    expect(comboFromKeyPress(press("Escape", "Escape"))).toBe("Esc");
    expect(comboFromKeyPress(press(" ", "Space"))).toBe("Space");
    expect(comboFromKeyPress(press("F8", "F8", { altKey: true }))).toBe("Alt+F8");
  });
});

describe("which keys can carry a command", () => {
  it("allows letters, digits and F1 to F12, alone or with modifiers", () => {
    for (const combo of ["G", "Shift+C", "Ctrl+Alt+K", "Alt+7", "F8", "Shift+F12"]) expect(isAssignableCombo(combo)).toBe(true);
    for (const combo of ["Esc", "Space", "Tab", "Enter", "←", "Shift+Tab", "F13", "+", "Ctrl+"]) expect(isAssignableCombo(combo)).toBe(false);
  });

  it("writes modifiers one way only", () => {
    expect(canonicalCombo("Shift+Ctrl+K")).toBe("Ctrl+Shift+K");
    expect(canonicalCombo("Cmd+Option+K")).toBe("Ctrl+Alt+K");
    expect(canonicalCombo("Hyper+K")).toBeNull();
  });
});

describe("the keys the editor and the browser use already", () => {
  it("reads the ranges and alternatives of the shortcut list", () => {
    expect(expandShortcutCombo("1 – 6")).toEqual(["1", "2", "3", "4", "5", "6"]);
    expect(expandShortcutCombo("Alt+1 – 0")).toEqual(["Alt+1", "Alt+2", "Alt+3", "Alt+4", "Alt+5", "Alt+6", "Alt+7", "Alt+8", "Alt+9", "Alt+0"]);
    expect(expandShortcutCombo("0-9")).toHaveLength(10);
    expect(expandShortcutCombo("Shift+7 / 8 / 9 / 0")).toEqual(["Shift+7", "Shift+8", "Shift+9", "Shift+0"]);
    expect(expandShortcutCombo("Ctrl+Shift+Z")).toEqual(["Ctrl+Shift+Z"]);
    expect(expandShortcutCombo("Shift+Click")).toEqual([]);
    expect(expandShortcutCombo("Alt+Drag")).toEqual([]);
  });

  const listed = [
    { combos: ["L"], label: "shortcuts.align" },
    { combos: ["Ctrl+G"], label: "shortcuts.group" },
  ];
  const taken = takenKeys(listed);

  it("refuses a key of the list with its line, one the editor answers unlisted, and the browser's own", () => {
    expect(keyRefusal("L", "x", taken, {})).toEqual({ reason: "taken", owner: { kind: "list", label: "shortcuts.align" } });
    expect(keyRefusal("Ctrl+G", "x", taken, {})).toEqual({ reason: "taken", owner: { kind: "list", label: "shortcuts.group" } });
    // H and S are answered with Shift as well, though the list only names the plain key.
    expect(keyRefusal("Shift+H", "x", taken, {})).toEqual({ reason: "taken", owner: { kind: "editor" } });
    expect(keyRefusal("Shift+S", "x", taken, {})).toEqual({ reason: "taken", owner: { kind: "editor" } });
    expect(keyRefusal("Ctrl+W", "x", taken, {})).toEqual({ reason: "taken", owner: { kind: "browser" } });
    expect(keyRefusal("F5", "x", taken, {})).toEqual({ reason: "taken", owner: { kind: "browser" } });
  });

  it("leaves free what nothing answers: the keys asked for in the discussion fit", () => {
    for (const combo of ["Shift+C", "G", "K", "U", "Shift+Q", "Alt+K", "F8", "Ctrl+Alt+J"]) expect(keyRefusal(combo, "x", taken, {})).toBeNull();
  });

  it("refuses a key that already runs another command of your own, but not the command's own key", () => {
    const own = { "shape-box": { combo: "G", label: "Add shape: Box" } };
    expect(keyRefusal("G", "align-center", taken, own)).toEqual({ reason: "own", commandId: "shape-box", label: "Add shape: Box" });
    expect(keyRefusal("G", "shape-box", taken, own)).toBeNull();
    expect(keyRefusal("Space", "x", taken, own)).toEqual({ reason: "unusable" });
  });
});

describe("a stored or imported set of keys", () => {
  it("keeps what is sound and drops the rest", () => {
    const stored = normalizeCustomShortcuts({
      "center-workplane": { combo: "Shift+C", label: "Center on workplane" },
      "shapes-panel": { combo: "Shift+Ctrl+K", label: "Open the shapes panel" },
      "shape-box": { combo: "Shift+C", label: "duplicate key" },
      "object-abc": { combo: "J", label: "a body of one design" },
      "shape-cylinder": { combo: "Space", label: "no key" },
      "shape-cone": { combo: "hyper+U", label: "unknown modifier" },
      broken: "G",
    });
    expect(stored).toEqual({
      "center-workplane": { combo: "Shift+C", label: "Center on workplane" },
      "shapes-panel": { combo: "Ctrl+Shift+K", label: "Open the shapes panel" },
    });
  });

  it("finds the command of a key", () => {
    const stored = normalizeCustomShortcuts({ "center-workplane": { combo: "Shift+C", label: "Center" }, "shapes-panel": { combo: "G", label: "Shapes" } });
    expect(stored["center-workplane"]).toEqual({ combo: "Shift+C", label: "Center" });
    expect(commandForCombo(stored, "G")).toBe("shapes-panel");
    expect(commandForCombo(stored, "K")).toBeNull();
  });

  it("is empty for anything that is not an object of keys", () => {
    expect(normalizeCustomShortcuts(null)).toEqual({});
    expect(normalizeCustomShortcuts([])).toEqual({});
    expect(normalizeCustomShortcuts("G")).toEqual({});
  });
});
