import { describe, expect, it } from "vitest";
import { editorHistoryEntry, historyEntryHoldsShapes, historyWithUnfinishedState, hydrateEditorHistoryState, projectShapesFingerprint } from "@/lib/editorHistory";
import { exportLylProject, importLylProject } from "@/lib/lylProject";
import type { WorkplaneShape } from "@/types/layerling";

function box(extra: Partial<WorkplaneShape> = {}) {
  return {
    id: "box-1",
    name: "Box",
    kind: "box",
    x: 0,
    y: 0,
    z: 0,
    size: 20,
    width: 20,
    depth: 10,
    height: 5,
    rotation: 0,
    color: "#d84a3a",
    ...extra,
  } as WorkplaneShape;
}

const FACE = { origin: { x: 0, y: 20, z: 0 }, normal: { x: 0, y: 1, z: 0 }, xAxis: { x: 1, y: 0, z: 0 }, zAxis: { x: 0, y: 0, z: 1 } };
const NOTE = { id: "note-1", text: "keep", x: 0, y: 0, z: 0 };

function pack(shapes: WorkplaneShape[], history: ReturnType<typeof editorHistoryEntry>[], historyIndex: number) {
  return exportLylProject({
    projectId: "design-1",
    projectName: "Bracket",
    createdAt: Date.UTC(2026, 10, 1),
    modifiedAt: Date.UTC(2026, 10, 2),
    shapes,
    notes: [],
    history,
    historyIndex,
    assets: [],
    compressionLevel: 1,
  });
}

// Discussion #1909: a design opened later had no history. A value set with the wheel or the arrow keys in a field
// that keeps the focus changes the body at once and writes its step only when the field is left.
describe("the history stored while a change has not left its step yet (Discussion #1909)", () => {
  const steps = [20, 30, 40].map((width) => editorHistoryEntry([box({ width })], []));
  // The hole made bigger in the focused field: the bodies moved on, the history still ends at 40.
  const unfinished = [box({ width: 44 })];

  it("was thrown away as a whole when the design was stored in that moment", async () => {
    const restored = await importLylProject(await pack(unfinished, steps, 2));
    expect(restored.shapes[0].width).toBe(44);
    expect(restored.history).toHaveLength(1);
  });

  it("keeps every step, with the unfinished state as the newest", async () => {
    const stored = historyWithUnfinishedState(steps, 2, projectShapesFingerprint(unfinished), () => editorHistoryEntry(unfinished, []), "unlimited", 1234);
    expect(stored.entries.map((entry) => entry.shapes[0].width)).toEqual([20, 30, 40, 44]);
    expect(stored.index).toBe(3);
    expect(stored.entries[3].at).toBe(1234);
    // The editor's own history is not touched: the step is written there when the field is left.
    expect(steps).toHaveLength(3);

    const restored = await importLylProject(await pack(unfinished, stored.entries, stored.index));
    expect(restored.history.map((entry) => entry.shapes[0].width)).toEqual([20, 30, 40, 44]);
    expect(restored.historyIndex).toBe(3);
    // What the editor does with it on opening.
    expect(hydrateEditorHistoryState(restored.shapes, restored.history, restored.historyIndex, 100).entries).toHaveLength(4);
  });

  it("hands a history that ends at the bodies back as it is, without measuring the state", () => {
    const stored = historyWithUnfinishedState(steps, 2, projectShapesFingerprint([box({ width: 40 })]), () => {
      throw new Error("not needed");
    });
    expect(stored.entries).toBe(steps);
    expect(stored.index).toBe(2);
  });

  it("puts the state after the step the design stands at, as a new step does after Undo", () => {
    const stored = historyWithUnfinishedState(steps, 1, projectShapesFingerprint(unfinished), () => editorHistoryEntry(unfinished, []));
    expect(stored.entries.map((entry) => entry.shapes[0].width)).toEqual([20, 30, 44]);
    expect(stored.index).toBe(2);
  });

  it("keeps to the number of steps the settings allow", () => {
    const stored = historyWithUnfinishedState(steps, 2, projectShapesFingerprint(unfinished), () => editorHistoryEntry(unfinished, []), 2);
    expect(stored.entries.map((entry) => entry.shapes[0].width)).toEqual([30, 40, 44]);
    expect(stored.index).toBe(2);
  });

  it("leaves an empty history alone", () => {
    expect(historyWithUnfinishedState([], 0, projectShapesFingerprint(unfinished), () => editorHistoryEntry(unfinished, []))).toEqual({ entries: [], index: 0 });
  });

  it("tells the bodies of a step by their fingerprint alone, with notes and on a face workplane too", () => {
    const shapes = [box({ width: 40 })];
    const fingerprint = projectShapesFingerprint(shapes);
    expect(historyEntryHoldsShapes(editorHistoryEntry(shapes, []), fingerprint)).toBe(true);
    expect(historyEntryHoldsShapes(editorHistoryEntry(shapes, [], [NOTE]), fingerprint)).toBe(true);
    expect(historyEntryHoldsShapes(editorHistoryEntry(shapes, [], [], FACE), fingerprint)).toBe(true);
    expect(historyEntryHoldsShapes(editorHistoryEntry(shapes, [], [NOTE], FACE), fingerprint)).toBe(true);
    expect(historyEntryHoldsShapes(editorHistoryEntry(unfinished, [], [NOTE], FACE), fingerprint)).toBe(false);
    expect(historyEntryHoldsShapes(undefined, fingerprint)).toBe(false);
  });
});
