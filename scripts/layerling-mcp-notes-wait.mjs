/**
 * Waiting for the user's notes (#1191). The user ticks For the AI on a note in the editor; an agent that
 * waits with layerling_wait_for_notes gets it as soon as it is there, so nobody has to go back to the
 * agent's window and tell it to look. The editor is asked every few seconds - it is the page that holds
 * the notes, and the bridge only passes commands to it.
 *
 * A request is handed over once. What the agent itself wrote into a note (an answer, a question back)
 * counts as seen too, so a note it keeps open with a question comes back only when the user changes it.
 */

export const NOTES_WAIT_DEFAULT_SECONDS = 50;
export const NOTES_WAIT_MAX_SECONDS = 600;
const POLL_MS = 2000;

/** What a note says, so a change to its words, its answer or its tick shows. */
export function noteSignature(note) {
  return JSON.stringify([note.text ?? "", note.reply ?? "", Boolean(note.forAi)]);
}

/** How long to wait, ms: the seconds asked for, within 1 s and the most, or the default. */
export function notesWaitMs(seconds) {
  const value = typeof seconds === "number" && Number.isFinite(seconds) ? seconds : NOTES_WAIT_DEFAULT_SECONDS;
  return Math.round(Math.min(NOTES_WAIT_MAX_SECONDS, Math.max(1, value)) * 1000);
}

/** The notes handed over or written by the agent, by id, with what they said then. */
export function createNotesSeen() {
  const seen = new Map();
  return {
    /** Remembers a note as it is now (one handed over, or one the agent added or answered). */
    mark(note) {
      if (note && typeof note.id === "string") seen.set(note.id, noteSignature(note));
    },
    /** The requests that are new or changed since the agent last had them. */
    fresh(notes) {
      return notes.filter((note) => note.forAi && seen.get(note.id) !== noteSignature(note));
    },
  };
}

/**
 * Waits until there are requests the agent has not had yet, and returns them, marked as had; after
 * `timeoutMs` with none it returns an empty list, and the agent asks again.
 */
export async function waitForNotes({ listNotes, seen, timeoutMs, pollMs = POLL_MS, sleep = (ms) => new Promise((done) => setTimeout(done, ms)), now = Date.now }) {
  const until = now() + timeoutMs;
  for (;;) {
    const { notes = [] } = (await listNotes()) ?? {};
    const fresh = seen.fresh(notes);
    if (fresh.length > 0) {
      fresh.forEach((note) => seen.mark(note));
      return { notes: fresh, timedOut: false };
    }
    const left = until - now();
    if (left <= 0) return { notes: [], timedOut: true };
    await sleep(Math.min(pollMs, left));
  }
}
