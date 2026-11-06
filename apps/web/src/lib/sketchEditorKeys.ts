import { escapeWasHandled } from "@/lib/escapeHandled";

/** What the editor does for each key in sketch mode; the key handling itself lives here. */
export type SketchEditorKeyActions = {
  /** Esc: put the tool down, then clear the selection (#664). */
  escape: () => void;
  deleteSelection: () => void;
  undo: () => void;
  redo: () => void;
  copy: () => void;
  cut: () => void;
  paste: () => void;
  duplicate: () => void;
  selectAll: () => void;
  /** Ctrl+L: lock or unlock the selected outline or the template image, as Ctrl+L locks bodies in 3D. */
  toggleLock: () => void;
  addImage: () => void;
  rotate45: () => void;
  toggleNotes: () => void;
  toggleNoteTool: () => void;
};

/**
 * The 3D editor's Ctrl keys that have nothing to act on in a sketch: hide (H), group (G) and export (E).
 * They do nothing here, but they are kept from the browser, which would open its history, its search
 * or its address bar instead.
 */
const SKETCH_SWALLOWED_CTRL_KEYS = new Set(["h", "g", "e"]);

/** The editor's keys in sketch mode, as in the 3D editor where the two share a meaning. */
export function handleSketchEditorKey(event: KeyboardEvent, actions: SketchEditorKeyActions) {
  const key = (event.key ?? "").toLowerCase();
  const shortcut = event.ctrlKey || event.metaKey;
  const run = (action: () => void) => {
    event.preventDefault();
    action();
  };

  if (event.key === "Escape") {
    // A crop, a calibration or the mirror panel that closes with this key is all it does.
    if (!escapeWasHandled(event)) run(actions.escape);
  } else if (event.key === "Delete" || event.key === "Backspace") {
    run(actions.deleteSelection);
  } else if (shortcut && !event.altKey) {
    // Ctrl keys go by the letter typed, as everywhere in the editor, so they follow the keyboard layout.
    if (key === "z") run(event.shiftKey ? actions.redo : actions.undo);
    else if (key === "y") run(actions.redo);
    else if (key === "c") run(actions.copy);
    else if (key === "x") run(actions.cut);
    else if (key === "v") run(actions.paste);
    else if (key === "d") run(actions.duplicate);
    else if (key === "a" && !event.shiftKey) run(actions.selectAll);
    else if (key === "l" && !event.shiftKey) run(actions.toggleLock);
    else if (key === "i" && !event.shiftKey) run(actions.addImage);
    else if (SKETCH_SWALLOWED_CTRL_KEYS.has(key)) event.preventDefault();
  } else if (!shortcut && !event.altKey) {
    // Plain letters by their position as well, as before.
    if (event.code === "KeyR" || key === "r") run(actions.rotate45);
    // Shift+N shows or hides the notes, as in 3D; N alone places one.
    else if (event.code === "KeyN" || key === "n") run(event.shiftKey ? actions.toggleNotes : actions.toggleNoteTool);
  }
}
