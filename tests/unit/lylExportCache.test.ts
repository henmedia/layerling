import { describe, expect, it } from "vitest";
import { editorHistoryEntry, hydrateEditorHistoryState, type EditorHistoryEntry } from "@/lib/editorHistory";
import { exportLylProject, importLylProject, type LylProjectExportInput } from "@/lib/lylProject";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import type { WorkplaneShape } from "@/types/layerling";

function box(id: string, x: number, overrides: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return {
    id,
    name: id,
    kind: "box",
    color: "#12a4cc",
    x,
    z: 2,
    elevation: 0,
    size: 20,
    width: 20,
    depth: 18,
    height: 16,
    rotation: 0,
    locked: false,
    hidden: false,
    ...overrides,
  };
}

/** A history of states that each differ from the one before, the way undo steps do. */
function history(): { entries: EditorHistoryEntry[]; shapes: WorkplaneShape[] } {
  const entries: EditorHistoryEntry[] = [];
  let shapes: WorkplaneShape[] = [];
  for (let step = 0; step < 6; step += 1) {
    shapes = [...shapes, box(`box-${step}`, step * 25, step === 3 ? { cadBrep: "BREP-TEXT-OF-A-BODY\nsecond line" } : {})];
    entries.push(editorHistoryEntry(shapes, [shapes[shapes.length - 1].id], [], undefined, 1_700_000_000_000 + step));
  }
  return { entries, shapes };
}

function exportInput(entries: EditorHistoryEntry[], shapes: WorkplaneShape[]): LylProjectExportInput {
  return {
    projectId: "project-cache",
    projectName: "Cache check",
    createdAt: 1_700_000_000_000,
    modifiedAt: 1_700_000_100_000,
    shapes,
    history: entries,
    historyIndex: entries.length - 1,
    assets: [],
    workspace: DEFAULT_WORKPLANE_WORKSPACE,
    snapGrid: DEFAULT_SNAP_GRID,
    placementElevation: 0,
    compressionLevel: 1,
  };
}

describe("exporting a project again", () => {
  it("gives the same package when the history was seen before as when it is new", async () => {
    const { entries, shapes } = history();
    const first = await exportLylProject(exportInput(entries, shapes));
    // The same entry objects: every state now comes from what the first export remembered.
    const again = await exportLylProject(exportInput(entries, shapes));
    // Copies of everything: nothing can be remembered, so every state is built from scratch.
    const fresh = await exportLylProject(exportInput(structuredClone(entries), structuredClone(shapes)));
    expect(Buffer.from(again).equals(Buffer.from(first))).toBe(true);
    expect(Buffer.from(fresh).equals(Buffer.from(first))).toBe(true);
  });

  // After an undo the active state is one kept from an earlier save; its indexes are kept with it instead of parsed again.
  it("gives the same package after an undo whether the active state was kept or is new", async () => {
    const { entries, shapes } = history();
    const undone = { ...exportInput(entries, shapes), historyIndex: 3, shapes: entries[3].shapes };
    await exportLylProject(exportInput(entries, shapes));
    const first = await exportLylProject(undone);
    const again = await exportLylProject(undone);
    const fresh = await exportLylProject({ ...undone, history: structuredClone(entries), shapes: structuredClone(entries[3].shapes) });
    expect(Buffer.from(again).equals(Buffer.from(first))).toBe(true);
    expect(Buffer.from(fresh).equals(Buffer.from(first))).toBe(true);
    const restored = await importLylProject(again);
    expect(restored.shapes.map((shape) => shape.id)).toEqual(["box-0", "box-1", "box-2", "box-3"]);
  });

  // An autosave walks the bodies of a state in the same order each time; seven or more exact bodies used to push each other out.
  it("keeps the exact bodies of a design with many of them in one package as before", async () => {
    const many = Array.from({ length: 12 }, (_, index) => box(`exact-${index}`, index * 25, { cadBrep: `BREP-${index}\n${"x".repeat(200)}` }));
    const entries = [editorHistoryEntry(many, [], [], undefined, 1_700_000_000_000)];
    const first = await exportLylProject(exportInput(entries, many));
    const fresh = await exportLylProject(exportInput(structuredClone(entries), structuredClone(many)));
    expect(Buffer.from(fresh).equals(Buffer.from(first))).toBe(true);
    const restored = await importLylProject(first);
    expect(restored.shapes.map((shape) => shape.cadBrep?.slice(0, 7))).toEqual(many.map((shape) => shape.cadBrep?.slice(0, 7)));
  });

  it("picks up a new state added after the last export and keeps the old ones intact", async () => {
    const { entries, shapes } = history();
    await exportLylProject(exportInput(entries, shapes));
    const grown = [...shapes, box("box-late", 400)];
    const moreEntries = [...entries, editorHistoryEntry(grown, ["box-late"], [], undefined, 1_700_000_000_099)];
    const exported = await exportLylProject(exportInput(moreEntries, grown));
    const restored = await importLylProject(exported);
    expect(restored.history).toHaveLength(7);
    expect(restored.shapes.map((shape) => shape.id)).toEqual(grown.map((shape) => shape.id));
    // An old state still has its own shapes.
    expect(restored.history[2].shapes.map((shape) => shape.id)).toEqual(["box-0", "box-1", "box-2"]);
    expect(restored.history[3].shapes[3].cadBrep).toBe("BREP-TEXT-OF-A-BODY\nsecond line");
    expect(restored.history[4].shapes[3].cadBrep).toBe("BREP-TEXT-OF-A-BODY\nsecond line");
  });

  it("notices a changed workplane for an entry that takes the current one", () => {
    const { entries, shapes } = history();
    const flat = hydrateEditorHistoryState(shapes, entries, entries.length - 1, "unlimited", []);
    const raised = hydrateEditorHistoryState(shapes, entries, entries.length - 1, "unlimited", [], {
      kind: "surface",
      origin: { x: 0, y: 10, z: 0 },
      normal: { x: 0, y: 1, z: 0 },
      elevation: 10,
    } as never);
    // Without a workplane of its own an entry takes the current one, so the two results differ.
    expect(flat.entries[0]).not.toBe(raised.entries[0]);
    // With the same inputs a repeated call hands back the remembered entries.
    const again = hydrateEditorHistoryState(shapes, entries, entries.length - 1, "unlimited", []);
    expect(again.entries[0]).toBe(flat.entries[0]);
  });
});
