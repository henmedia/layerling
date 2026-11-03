// @ts-expect-error the waiting is a plain .mjs module
import { createNotesSeen, notesWaitMs, NOTES_WAIT_DEFAULT_SECONDS, NOTES_WAIT_MAX_SECONDS, waitForNotes } from "../../scripts/layerling-mcp-notes-wait.mjs";
// @ts-expect-error the tool list is a plain .mjs module
import { tools } from "../../scripts/layerling-mcp-tools.mjs";
import { describe, expect, it } from "vitest";

/*
 * Waiting for the user's notes (#1191): an agent told to watch the notes waits with
 * layerling_wait_for_notes and gets every request as soon as the user ticks For the AI,
 * once, and a note it answered or asked back in only when the user changes it again.
 */

type Note = { id: string; text: string; reply?: string; forAi: boolean };

/** A clock that only moves when the waiting sleeps, and an editor whose notes change at set times. */
function editor(timeline: { at: number; notes: Note[] }[]) {
  let time = 0;
  let asked = 0;
  return {
    now: () => time,
    sleep: async (ms: number) => {
      time += ms;
    },
    listNotes: async () => {
      asked += 1;
      const state = [...timeline].reverse().find((entry) => entry.at <= time);
      return { notes: (state?.notes ?? []).filter((note) => note.forAi) };
    },
    asked: () => asked,
  };
}

const request = (id: string, text: string, more: Partial<Note> = {}): Note => ({ id, text, forAi: true, ...more });

describe("waiting for notes for the AI", () => {
  it("hands over a request that is there already, at once", async () => {
    const view = editor([{ at: 0, notes: [request("a", "5 mm hole here")] }]);
    const result = await waitForNotes({ ...view, seen: createNotesSeen(), timeoutMs: 50000 });
    expect(result).toEqual({ notes: [request("a", "5 mm hole here")], timedOut: false });
    expect(view.asked()).toBe(1);
  });

  it("waits until the user ticks a note, and hands over only the new one", async () => {
    const view = editor([
      { at: 0, notes: [{ id: "x", text: "just a remark", forAi: false }] },
      { at: 7000, notes: [{ id: "x", text: "just a remark", forAi: false }, request("b", "round this edge")] },
    ]);
    const result = await waitForNotes({ ...view, seen: createNotesSeen(), timeoutMs: 50000 });
    expect(result.notes.map((note: Note) => note.id)).toEqual(["b"]);
    expect(view.now()).toBeGreaterThanOrEqual(7000);
    expect(view.now()).toBeLessThan(10000);
  });

  it("comes back empty when the time is up, and does not wait longer", async () => {
    const view = editor([{ at: 0, notes: [] }]);
    const result = await waitForNotes({ ...view, seen: createNotesSeen(), timeoutMs: 5000 });
    expect(result).toEqual({ notes: [], timedOut: true });
    expect(view.now()).toBe(5000);
  });

  it("hands a request over once, and again only when the user changes it", async () => {
    const seen = createNotesSeen();
    const first = editor([{ at: 0, notes: [request("a", "5 mm hole here")] }]);
    expect((await waitForNotes({ ...first, seen, timeoutMs: 4000 })).notes).toHaveLength(1);
    expect(await waitForNotes({ ...first, seen, timeoutMs: 4000 })).toEqual({ notes: [], timedOut: true });
    const changed = editor([{ at: 0, notes: [request("a", "6 mm hole here")] }]);
    expect((await waitForNotes({ ...changed, seen, timeoutMs: 4000 })).notes).toEqual([request("a", "6 mm hole here")]);
  });

  it("does not hand back a note the agent kept open with a question, until the user answers in it", async () => {
    const seen = createNotesSeen();
    // The agent asked back and left the request open: what update_note returned is marked as seen.
    seen.mark(request("a", "hole here", { reply: "How deep?" }));
    const asked = editor([{ at: 0, notes: [request("a", "hole here", { reply: "How deep?" })] }]);
    expect(await waitForNotes({ ...asked, seen, timeoutMs: 4000 })).toEqual({ notes: [], timedOut: true });
    const answered = editor([{ at: 0, notes: [request("a", "hole here, 15 mm deep", { reply: "How deep?" })] }]);
    expect((await waitForNotes({ ...answered, seen, timeoutMs: 4000 })).notes).toHaveLength(1);
  });

  it("waits the seconds asked for, within its limits", () => {
    expect(notesWaitMs(undefined)).toBe(NOTES_WAIT_DEFAULT_SECONDS * 1000);
    expect(notesWaitMs(5)).toBe(5000);
    expect(notesWaitMs(0)).toBe(1000);
    expect(notesWaitMs(99999)).toBe(NOTES_WAIT_MAX_SECONDS * 1000);
    expect(notesWaitMs(Number.NaN)).toBe(NOTES_WAIT_DEFAULT_SECONDS * 1000);
  });

  it("is offered to the AI client, with the same limit for the seconds", () => {
    const tool = (tools as { name: string; inputSchema: { properties: Record<string, { maximum?: number }> } }[]).find((entry) => entry.name === "layerling_wait_for_notes");
    expect(tool).toBeDefined();
    expect(tool!.inputSchema.properties.seconds.maximum).toBe(NOTES_WAIT_MAX_SECONDS);
  });
});
