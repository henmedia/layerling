import { describe, expect, it, vi } from "vitest";
import { handleSketchEditorKey, type SketchEditorKeyActions } from "@/lib/sketchEditorKeys";

const actions = () => {
  const names: Array<keyof SketchEditorKeyActions> = ["escape", "deleteSelection", "undo", "redo", "copy", "cut", "paste", "duplicate", "selectAll", "toggleLock", "addImage", "rotate45", "toggleNotes", "toggleNoteTool"];
  return Object.fromEntries(names.map((name) => [name, vi.fn()])) as unknown as Record<keyof SketchEditorKeyActions, ReturnType<typeof vi.fn>>;
};
const press = (key: string, modifiers: Partial<KeyboardEvent> = {}) => {
  const event = { key, code: /^[a-z]$/i.test(key) ? `Key${key.toUpperCase()}` : key, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, preventDefault: vi.fn(), ...modifiers };
  return event as unknown as KeyboardEvent & { preventDefault: ReturnType<typeof vi.fn> };
};
const called = (spies: ReturnType<typeof actions>) => Object.entries(spies).filter(([, spy]) => spy.mock.calls.length).map(([name]) => name);

describe("sketch editor keys", () => {
  it("locks with Ctrl+L (Cmd+L on a Mac), as in 3D, and leaves plain L alone", () => {
    const spies = actions();
    handleSketchEditorKey(press("l", { ctrlKey: true }), spies);
    handleSketchEditorKey(press("l", { metaKey: true }), spies);
    expect(spies.toggleLock).toHaveBeenCalledTimes(2);
    const plain = press("l");
    handleSketchEditorKey(plain, spies);
    expect(spies.toggleLock).toHaveBeenCalledTimes(2);
    expect(plain.preventDefault).not.toHaveBeenCalled();
  });

  it("selects all with Ctrl+A and adds an image with Ctrl+I", () => {
    const spies = actions();
    handleSketchEditorKey(press("a", { ctrlKey: true }), spies);
    handleSketchEditorKey(press("i", { ctrlKey: true }), spies);
    expect(called(spies)).toEqual(["selectAll", "addImage"]);
  });

  it("keeps Ctrl+H, Ctrl+G and Ctrl+E from the browser without doing anything", () => {
    for (const key of ["h", "g", "e"]) {
      const spies = actions();
      const event = press(key, { ctrlKey: true });
      handleSketchEditorKey(event, spies);
      expect(event.preventDefault).toHaveBeenCalled();
      expect(called(spies)).toEqual([]);
    }
  });

  it("goes by the letter typed for Ctrl keys, so another keyboard layout keeps its own", () => {
    // On AZERTY the key in the Z position types "w": Ctrl+W there must not undo.
    const spies = actions();
    handleSketchEditorKey(press("w", { ctrlKey: true, code: "KeyZ" }), spies);
    expect(called(spies)).toEqual([]);
  });

  it("ignores a keydown without a key, as Chrome sends when an autofill suggestion is picked", () => {
    const spies = actions();
    handleSketchEditorKey({ ...press("a"), key: undefined } as unknown as KeyboardEvent, spies);
    expect(called(spies)).toEqual([]);
  });
});
