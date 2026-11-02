// @ts-expect-error the tool list is a plain .mjs module
import { tools } from "../../scripts/layerling-mcp-tools.mjs";
import { describe, expect, it } from "vitest";
import { exportLylProject, importLylProject } from "@/lib/lylProject";
import { editorHistoryEntry } from "@/lib/editorHistory";
import { MESSAGES_EN } from "@/lib/messages.en";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import { normalizeNotes, notesSignature, NOTE_TEXT_LIMIT, patchNote } from "@/lib/workplaneNotes";
import type { WorkplaneNote } from "@/types/layerling";

/*
 * A note can be a request for the AI agent on the MCP bridge (#1191): the user
 * ticks "For the AI", the agent reads it, does the work and answers under the
 * text. Both the tick and the answer belong to the note, so they have to survive
 * what every note survives: cleaning, undo (the fingerprint) and the file.
 */

const note = (overrides: Partial<WorkplaneNote> = {}): WorkplaneNote => ({ id: "n1", text: "Make a 5 mm hole here", x: 1, y: 2, z: 3, ...overrides });

describe("notes for the AI", () => {
  it("keeps the request and the answer when a note is cleaned", () => {
    const [kept] = normalizeNotes([note({ forAi: true, reply: "Hole placed, 15 mm deep." })]);
    expect(kept.forAi).toBe(true);
    expect(kept.reply).toBe("Hole placed, 15 mm deep.");
  });

  it("drops a request that is not true and an empty answer", () => {
    const [kept] = normalizeNotes([{ ...note(), forAi: "yes", reply: "" }]);
    expect(kept).not.toHaveProperty("forAi");
    expect(kept).not.toHaveProperty("reply");
  });

  it("shortens an answer to what a note may hold", () => {
    const [kept] = normalizeNotes([note({ reply: "x".repeat(NOTE_TEXT_LIMIT + 50) })]);
    expect(kept.reply).toHaveLength(NOTE_TEXT_LIMIT);
  });

  it("answers a request and closes it", () => {
    const next = patchNote([note({ forAi: true })], "n1", { reply: "Done", forAi: false });
    expect(next?.[0].reply).toBe("Done");
    expect(next?.[0]).not.toHaveProperty("forAi");
  });

  it("takes an answer away with an empty string", () => {
    const next = patchNote([note({ reply: "Done" })], "n1", { reply: "" });
    expect(next?.[0]).not.toHaveProperty("reply");
  });

  it("tells a note with a request or an answer from one without in the fingerprint", () => {
    const plain = notesSignature([note()]);
    expect(notesSignature([note({ forAi: true })])).not.toBe(plain);
    expect(notesSignature([note({ reply: "Done" })])).not.toBe(plain);
  });

  it("travels in a .lyl file", async () => {
    const notes = [note({ forAi: true, reply: "Placed." })];
    const exported = await exportLylProject({
      projectId: "ai",
      projectName: "AI",
      createdAt: 1_700_000_000_000,
      modifiedAt: 1_700_000_100_000,
      shapes: [],
      notes,
      history: [editorHistoryEntry([], [], notes)],
      historyIndex: 0,
      assets: [],
      workspace: DEFAULT_WORKPLANE_WORKSPACE,
      snapGrid: DEFAULT_SNAP_GRID,
      placementElevation: 0,
    });
    const loaded = await importLylProject(exported);
    const restored = normalizeNotes(loaded.notes);
    expect(restored[0]?.forAi).toBe(true);
    expect(restored[0]?.reply).toBe("Placed.");
  });
});

describe("MCP tools for notes", () => {
  const byName = (name: string) => tools.find((tool: { name: string }) => tool.name === name);

  it("has the four tools", () => {
    for (const name of ["layerling_list_notes", "layerling_add_note", "layerling_update_note", "layerling_remove_notes"]) {
      expect(byName(name), name).toBeTruthy();
    }
  });

  it("asks for the note's words, its id and its ids", () => {
    expect(byName("layerling_add_note").inputSchema.required).toContain("text");
    expect(byName("layerling_update_note").inputSchema.required).toContain("id");
    expect(byName("layerling_remove_notes").inputSchema.required).toContain("ids");
  });

  it("has the texts of the note card", () => {
    for (const key of ["note.forAi", "note.forAiHint", "note.reply"]) expect(MESSAGES_EN).toHaveProperty([key]);
  });
});
