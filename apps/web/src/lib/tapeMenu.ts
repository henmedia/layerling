/**
 * What the tape measure's buttons do to the tool itself (#1768): which state the tool is in after its menu is opened and
 * after a click on Add measurement. Kept apart from the viewport so the rules can be tested.
 */

/**
 * Opening the tape measure starts measuring at once: a click on the first point, a click on the second, done. Hidden
 * measurements stay hidden instead, because adding one shows them all - opening the menu alone must not undo the eye.
 */
export function tapeMenuOpensMeasuring(tape: { hidden?: boolean }): boolean {
  return !tape.hidden;
}

/**
 * A click on Add measurement: on when it was off, and off again when it was on, so the menu can stay open while a body
 * is selected or moved.
 */
export function tapeAddAfterClick(measuring: boolean): boolean {
  return !measuring;
}
