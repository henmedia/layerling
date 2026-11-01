/** How long an ordinary message of the status line stays, in milliseconds. */
export const NOTICE_LINGER_MS = 4000;
/**
 * How long a message stays that wants something or waits for work. Even it goes in the end: a window that never
 * goes is a stain on the work area.
 */
export const NOTICE_PATIENT_MS = 30000;
/** Reading time for what a message says beyond a short line, per character. */
const NOTICE_MS_PER_CHARACTER = 70;
const NOTICE_FREE_CHARACTERS = 30;
/** After the pointer has rested on a message and leaves it, it stays this long. */
export const NOTICE_AFTER_HOVER_MS = 4000;

/**
 * The time a message stays: the usual few seconds for a short one, longer for a long one, so that an error text of
 * two lines can be read to the end (Mycraftymama, #422). A patient message is never shorter than its own time.
 */
export function noticeDurationMs(message: string, patient = false) {
  const reading = NOTICE_LINGER_MS + Math.max(0, message.length - NOTICE_FREE_CHARACTERS) * NOTICE_MS_PER_CHARACTER;
  return Math.min(NOTICE_PATIENT_MS, Math.max(patient ? NOTICE_PATIENT_MS : NOTICE_LINGER_MS, reading));
}

/** How close a message and a step of the design must come, in milliseconds, for the message to report that step: one that comes later reports something else, such as a selection right after the step. */
export const NOTICE_CHANGE_WINDOW_MS = 250;

/**
 * Whether a message reports the step the design just took, so that it can offer to take it back: it came within a
 * moment of the step, before or after, and the design still stands at that step (not undone, nothing done since).
 */
export function noticeReportsLastChange(noticeAt: number, lastChange: { at: number; index: number } | null, historyIndex: number) {
  return lastChange !== null
    && lastChange.index > 0
    && lastChange.index === historyIndex
    && Math.abs(noticeAt - lastChange.at) <= NOTICE_CHANGE_WINDOW_MS;
}
