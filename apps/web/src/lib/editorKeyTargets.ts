/** A field that takes typed text keeps its keys from the editor's shortcuts. */
export function isTypingTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
}

/**
 * A slider, checkbox or list keeps the focus after it was used but has no text to undo, so
 * Ctrl+Z there is meant for the project (#243). A slider holds the current action while it has
 * the focus: leave it first (that closes the history step), then run the key as if nothing had it.
 */
export function isNonTextControl(target: EventTarget | null) {
  return target instanceof HTMLSelectElement ||
    (target instanceof HTMLInputElement && ["range", "checkbox", "radio", "color", "button"].includes(target.type));
}
