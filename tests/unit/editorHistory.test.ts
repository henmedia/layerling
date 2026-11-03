import { describe, expect, it } from "vitest";
import { appendEditorHistorySnapshot, boundedEditorHistory, continuesKeyRun, KEY_RUN_GAP_MS, editorHistoryBranch, editorHistoryEntry, editorHistoryForExport, historyStateAt, hydrateEditorHistoryState, immutableResourceFingerprint, projectShapesFingerprint } from "@/lib/editorHistory";
import type { WorkplaneShape } from "@/types/layerling";
import { canonicalizeShape } from "@/lib/workplaneShapes";

function box(overrides: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return {
    id: "box-1",
    name: "Box",
    kind: "box",
    color: "#d41721",
    x: 0,
    z: 0,
    elevation: 0,
    size: 20,
    width: 20,
    depth: 20,
    height: 20,
    rotation: 0,
    locked: false,
    hidden: false,
    ...overrides,
  };
}

describe("editor history snapshots", () => {
  it("seeds history with the real loaded scene and valid selection", () => {
    const shape = box();
    const entry = editorHistoryEntry([shape], [shape.id, "missing", shape.id]);

    expect(entry.shapes).toHaveLength(1);
    expect(entry.shapes[0].id).toBe(shape.id);
    expect(entry.selectedIds).toEqual([shape.id]);
  });

  it("detects persistence-relevant fields that the old fingerprint omitted", () => {
    const shape = box({ kind: "cylinder", sides: 32 });
    const baseline = projectShapesFingerprint([shape]);

    expect(projectShapesFingerprint([{ ...shape, locked: true }])).not.toBe(baseline);
    expect(projectShapesFingerprint([{ ...shape, hidden: true }])).not.toBe(baseline);
    expect(projectShapesFingerprint([{ ...shape, sides: 64 }])).not.toBe(baseline);
  });

  it("detects mesh coordinate changes even when array lengths are unchanged", () => {
    const shape = box({
      kind: "mesh",
      importedMesh: {
        positions: [0, 0, 0, 1, 0, 0, 0, 1, 0],
        baseWidth: 1,
        baseDepth: 1,
        baseHeight: 1,
        triangleCount: 1,
        sourceFormat: "json",
      },
    });
    const changed = {
      ...shape,
      importedMesh: { ...shape.importedMesh!, positions: [0, 0, 0, 2, 0, 0, 0, 1, 0] },
    };

    expect(projectShapesFingerprint([changed])).not.toBe(projectShapesFingerprint([shape]));
  });

  it("reuses an immutable mesh signature for transform-only history snapshots", () => {
    let coordinateReads = 0;
    const positions = new Proxy([0, 0, 0, 1, 0, 0, 0, 1, 0], {
      get(target, property, receiver) {
        if (typeof property === "string" && /^\d+$/.test(property)) coordinateReads += 1;
        return Reflect.get(target, property, receiver);
      },
    });
    const shape = box({
      kind: "mesh",
      importedMesh: {
        positions,
        baseWidth: 1,
        baseDepth: 1,
        baseHeight: 1,
        triangleCount: 1,
        sourceFormat: "stl",
      },
    });

    const baseline = projectShapesFingerprint([shape]);
    expect(coordinateReads).toBeGreaterThan(0);
    coordinateReads = 0;

    expect(projectShapesFingerprint([{ ...shape, x: 25 }])).not.toBe(baseline);
    expect(coordinateReads).toBe(0);
    expect(projectShapesFingerprint([{
      ...shape,
      importedMesh: { ...shape.importedMesh!, positions: [...positions] },
    }])).toBe(baseline);
  });

  it("stream-hashes large mesh arrays and detects changes at the end", () => {
    const positions = Array.from({ length: 10_001 }, (_, index) => Math.fround(Math.sin(index) * 100));
    const resource = {
      positions,
      normals: positions.map((value) => Math.fround(value / 100)),
      baseWidth: 200,
      baseDepth: 150,
      baseHeight: 80,
      triangleCount: Math.floor(positions.length / 9),
      sourceFormat: "stl",
    };
    const changedPositions = [...positions];
    changedPositions[changedPositions.length - 1] += 1;

    expect(immutableResourceFingerprint({ ...resource, positions: [...positions], normals: [...resource.normals] }))
      .toBe(immutableResourceFingerprint(resource));
    expect(immutableResourceFingerprint({ ...resource, positions: changedPositions }))
      .not.toBe(immutableResourceFingerprint(resource));
  });

  it("falls back to direct field hashing when serialization exceeds the string limit", () => {
    const resource = {
      positions: [0, 0, 0, 1, 0, 0, 0, 1, 0],
      toJSON() {
        throw new RangeError("Invalid string length");
      },
    };

    expect(immutableResourceFingerprint(resource)).toMatch(/^stream-v1:/);
  });

  it("keeps unlimited history and applies preset or custom action limits", () => {
    const entries = Array.from({ length: 140 }, (_, index) => ({
      ...editorHistoryEntry([box({ id: `box-${index}`, x: index })], []),
      estimatedBytes: 2 * 1024 * 1024,
    }));
    const unlimited = boundedEditorHistory(entries);
    const lastThirty = boundedEditorHistory(entries, 30);
    const custom = boundedEditorHistory(entries, 7);

    expect(unlimited).toHaveLength(140);
    expect(lastThirty).toHaveLength(31);
    expect(lastThirty[0].shapes[0].id).toBe("box-109");
    expect(custom).toHaveLength(8);
    expect(custom.at(-1)?.shapes[0].id).toBe("box-139");
  });

  it("trims redo only for a real new edit and preserves it for a no-op", () => {
    const entries = [0, 1, 2].map((x) => editorHistoryEntry([box({ x })], []));
    const noOp = appendEditorHistorySnapshot(entries, 1, editorHistoryEntry([box({ x: 1 })], ["box-1"]));

    expect(noOp.changed).toBe(false);
    expect(noOp.entries).toHaveLength(3);
    expect(noOp.entries[1].selectedIds).toEqual(["box-1"]);

    const branch = appendEditorHistorySnapshot(noOp.entries, 1, editorHistoryEntry([box({ x: 5 })], []));
    expect(branch.changed).toBe(true);
    expect(branch.entries).toHaveLength(3);
    expect(branch.entries.at(-1)?.shapes[0].x).toBe(5);
  });

  it("records placement workplane changes in history fingerprints and snapshots", () => {
    const baseEntry = editorHistoryEntry([box()], []);
    const elevatedEntry = editorHistoryEntry(
      [box()],
      [],
      [],
      {
        origin: { x: 0, y: 25, z: 0 },
        normal: { x: 0, y: 1, z: 0 },
        xAxis: { x: 1, y: 0, z: 0 },
        yAxis: { x: 0, y: 0, z: -1 },
      },
    );

    expect(elevatedEntry.fingerprint).not.toBe(baseEntry.fingerprint);
    expect(elevatedEntry.placementWorkplane?.origin.y).toBe(25);

    const snapshot = appendEditorHistorySnapshot([baseEntry], 0, elevatedEntry);
    expect(snapshot.changed).toBe(true);
    expect(snapshot.entries).toHaveLength(2);
    expect(snapshot.entries[1].placementWorkplane?.origin.y).toBe(25);
  });

  it("restores a persisted undo and redo stack at its saved index", () => {
    const entries = [0, 5, 10].map((x) => editorHistoryEntry([box({ x })], []));
    const restored = hydrateEditorHistoryState([box({ x: 5 })], entries, 1);

    expect(restored.index).toBe(1);
    expect(restored.entries).toHaveLength(3);
    expect(restored.entries[restored.index].shapes[0].x).toBe(5);
    expect(restored.entries[0].shapes[0].x).toBe(0);
    expect(restored.entries[2].shapes[0].x).toBe(10);
  });

  it("restores only the configured number of saved actions without losing the active state", () => {
    const entries = Array.from({ length: 80 }, (_, x) => editorHistoryEntry([box({ x })], []));
    const restored = hydrateEditorHistoryState([box({ x: 60 })], entries, 60, 30);

    expect(restored.entries).toHaveLength(31);
    expect(restored.index).toBe(30);
    expect(restored.entries[0].shapes[0].x).toBe(30);
    expect(restored.entries[restored.index].shapes[0].x).toBe(60);
  });

  it("keeps the history of a design whose last step was made on a face workplane when no workplane is given (#390)", () => {
    const face = { origin: { x: 0, y: 20, z: 0 }, normal: { x: 0, y: 1, z: 0 }, xAxis: { x: 1, y: 0, z: 0 }, zAxis: { x: 0, y: 0, z: 1 } };
    const entries = [
      editorHistoryEntry([box({ x: 0 })], []),
      editorHistoryEntry([box({ x: 5 })], [], [], face),
    ];
    // The start page builds its cache from a loaded design and knows no workplane.
    const restored = hydrateEditorHistoryState([box({ x: 5 })], entries, 1);

    expect(restored.entries).toHaveLength(2);
    expect(restored.index).toBe(1);
    expect(restored.entries[1].placementWorkplane?.origin.y).toBe(20);
  });

  it("still drops a history whose last entry belongs to another workplane than the one given", () => {
    const face = { origin: { x: 0, y: 20, z: 0 }, normal: { x: 0, y: 1, z: 0 }, xAxis: { x: 1, y: 0, z: 0 }, zAxis: { x: 0, y: 0, z: 1 } };
    const entries = [
      editorHistoryEntry([box({ x: 0 })], []),
      editorHistoryEntry([box({ x: 5 })], [], [], face),
    ];
    const restored = hydrateEditorHistoryState([box({ x: 5 })], entries, 1, "unlimited", [], { ...face, origin: { x: 0, y: 40, z: 0 } });

    expect(restored.entries).toHaveLength(1);
  });

  it("falls back to the loaded scene when persisted history is stale", () => {
    const stale = [editorHistoryEntry([box({ x: 1 })], [])];
    const restored = hydrateEditorHistoryState([box({ x: 9 })], stale, 0);

    expect(restored.index).toBe(0);
    expect(restored.entries).toHaveLength(1);
    expect(restored.entries[0].shapes[0].x).toBe(9);
  });

  it("selects all history or the requested number of recent undo actions for project export", () => {
    const entries = Array.from({ length: 140 }, (_, x) => editorHistoryEntry([box({ x })], []));

    const unlimited = editorHistoryForExport(entries, 120, "unlimited");
    expect(unlimited.entries).toBe(entries);
    expect(unlimited.index).toBe(120);

    const lastThirty = editorHistoryForExport(entries, 120, 30);
    expect(lastThirty.entries).toHaveLength(31);
    expect(lastThirty.index).toBe(30);
    expect(lastThirty.entries[0].shapes[0].x).toBe(90);
    expect(lastThirty.entries[30].shapes[0].x).toBe(120);
  });

  it("keeps only the current state for a project export without history (the None stop, #246)", () => {
    const entries = Array.from({ length: 140 }, (_, x) => editorHistoryEntry([box({ x })], []));
    const none = editorHistoryForExport(entries, 120, 0);
    expect(none.entries).toHaveLength(1);
    expect(none.index).toBe(0);
    expect(none.entries[0].shapes[0].x).toBe(120);
  });
});

describe("history view", () => {
  it("stamps a new state with the time it was recorded and keeps it through hydration", () => {
    const first = editorHistoryEntry([box()], []);
    const second = editorHistoryEntry([box({ x: 10 })], []);
    const appended = appendEditorHistorySnapshot([first], 0, second, "unlimited", 1_700_000_000_000);

    expect(appended.changed).toBe(true);
    expect(appended.entries[1].at).toBe(1_700_000_000_000);
    expect(appended.entries[1].fingerprint).toBe(second.fingerprint);

    const hydrated = hydrateEditorHistoryState([box({ x: 10 })], appended.entries, 1);
    expect(hydrated.entries).toHaveLength(2);
    expect(hydrated.entries[1].at).toBe(1_700_000_000_000);
    expect(hydrated.entries[0].at).toBeUndefined();
  });

  it("does not stamp an unchanged state or alter a fingerprint", () => {
    const first = editorHistoryEntry([box()], []);
    const again = appendEditorHistorySnapshot([first], 0, editorHistoryEntry([box()], ["box-1"]), "unlimited", 5);

    expect(again.changed).toBe(false);
    expect(again.entries[0].at).toBeUndefined();
    expect(editorHistoryEntry([box()], [], [], undefined, 42).fingerprint).toBe(first.fingerprint);
  });

  it("resolves a state with its bodies, notes and workplane elevation", () => {
    const entries = [
      editorHistoryEntry([box()], []),
      editorHistoryEntry([box({ x: 5 }), box({ id: "box-2", x: 30 })], ["box-2", "gone"], [{ id: "n1", text: "hi", x: 1, y: 2, z: 3 }]),
    ];

    const resolved = historyStateAt(entries, 1);
    expect(resolved?.index).toBe(1);
    expect(resolved?.shapes.map((shape) => shape.id)).toEqual(["box-1", "box-2"]);
    expect(resolved?.selectedIds).toEqual(["box-2"]);
    expect(resolved?.notes.map((note) => note.text)).toEqual(["hi"]);
    expect(resolved?.placementElevation).toBe(0);

    expect(historyStateAt(entries, 99)?.index).toBe(1);
    expect(historyStateAt(entries, -3)?.index).toBe(0);
    expect(historyStateAt([], 0)).toBeNull();
  });

  it("branches the history at a state, leaving later states behind", () => {
    const entries = [0, 1, 2, 3, 4].map((step) => editorHistoryEntry([box({ x: step })], []));

    const branch = editorHistoryBranch(entries, 2);
    expect(branch.entries).toHaveLength(3);
    expect(branch.index).toBe(2);
    expect(branch.entries[2].shapes[0].x).toBe(2);

    const limited = editorHistoryBranch(entries, 3, 1);
    expect(limited.entries.map((entry) => entry.shapes[0].x)).toEqual([2, 3]);
    expect(limited.index).toBe(1);

    expect(editorHistoryBranch([], 0)).toEqual({ entries: [], index: 0 });
  });
});

describe("a run of arrow-key presses is one history step (#370)", () => {
  const entryAt = (x: number) => editorHistoryEntry([box({ x })], ["box-1"]);

  it("replaces the newest entry instead of adding one", () => {
    let state = { entries: [entryAt(0)], index: 0 };
    state = appendEditorHistorySnapshot(state.entries, state.index, entryAt(0.01));
    expect(state.entries).toHaveLength(2);
    for (const x of [0.02, 0.03, 0.04]) {
      state = appendEditorHistorySnapshot(state.entries, state.index, entryAt(x), "unlimited", Date.now(), true);
    }
    expect(state.entries).toHaveLength(2);
    expect(state.index).toBe(1);
    expect(state.entries[1].shapes[0].x).toBe(0.04);
    expect(state.entries[0].shapes[0].x).toBe(0);
  });

  it("leaves no step when the run ends where it started", () => {
    let state = { entries: [entryAt(0)], index: 0 };
    state = appendEditorHistorySnapshot(state.entries, state.index, entryAt(0.01));
    state = appendEditorHistorySnapshot(state.entries, state.index, entryAt(0), "unlimited", Date.now(), true);
    expect(state.entries).toHaveLength(1);
    expect(state.index).toBe(0);
    expect(state.entries[0].shapes[0].x).toBe(0);
  });

  it("never replaces the first entry or one that has redo behind it", () => {
    const first = appendEditorHistorySnapshot([entryAt(0)], 0, entryAt(1), "unlimited", Date.now(), true);
    expect(first.entries).toHaveLength(2);
    const entries = [0, 1, 2].map(entryAt);
    const middle = appendEditorHistorySnapshot(entries, 1, entryAt(9), "unlimited", Date.now(), true);
    expect(middle.entries).toHaveLength(3);
    expect(middle.entries.map((entry) => entry.shapes[0].x)).toEqual([0, 1, 9]);
  });

  it("continues a run only soon after, on the same thing, while its entry is the newest", () => {
    const entry = entryAt(1);
    const run = { key: "move:box-1", at: 10_000, entry };
    expect(continuesKeyRun(run, "move:box-1", 10_000 + KEY_RUN_GAP_MS, entry, true)).toBe(true);
    expect(continuesKeyRun(run, "move:box-1", 10_000 + KEY_RUN_GAP_MS + 1, entry, true)).toBe(false);
    expect(continuesKeyRun(run, "move:box-2", 10_100, entry, true)).toBe(false);
    expect(continuesKeyRun(run, "move:box-1", 10_100, entryAt(1), true)).toBe(false);
    expect(continuesKeyRun(run, "move:box-1", 10_100, entry, false)).toBe(false);
    expect(continuesKeyRun(null, "move:box-1", 10_100, entry, true)).toBe(false);
    expect(continuesKeyRun(run, "move:box-1", 10_100, undefined, true)).toBe(false);
  });
});

describe("edge history fingerprints (#1042)", () => {
  const feature = { kind: "chamfer" as const, amount: 1, edgeCount: 2, edgeIds: [3, 4], chamferAngle: 45 };
  const chamfered = () => box({
    kind: "mesh",
    edgeTreatments: [feature],
    edgeTreatmentHistory: [{ id: "h", createdAt: 1, feature, before: box({ id: "before" }) }],
    importedMesh: { positions: [-10, 0, 0, 10, 20, 0], baseWidth: 20, baseDepth: 20, baseHeight: 20, triangleCount: 1, sourceFormat: "json" },
  });

  it("keeps a moved body's canonical history, so its fingerprint comes from the cache", () => {
    const body = chamfered();
    const canonical = canonicalizeShape(body);
    const moved = { ...canonical, x: canonical.x + 1 };

    expect(canonicalizeShape(body).edgeTreatmentHistory).toBe(canonical.edgeTreatmentHistory);
    expect(canonicalizeShape(moved).edgeTreatmentHistory).toBe(canonical.edgeTreatmentHistory);
    expect(canonicalizeShape(canonical).edgeTreatmentHistory).toBe(canonical.edgeTreatmentHistory);
    expect(projectShapesFingerprint([moved])).not.toBe(projectShapesFingerprint([canonical]));
  });

  it("still tells a changed history apart", () => {
    const body = chamfered();
    const other = { ...body, edgeTreatmentHistory: [{ ...body.edgeTreatmentHistory![0], before: box({ id: "before", width: 30 }) }] };

    expect(projectShapesFingerprint([other])).not.toBe(projectShapesFingerprint([body]));
    expect(projectShapesFingerprint([{ ...body, edgeTreatmentHistory: [...body.edgeTreatmentHistory!] }])).toBe(projectShapesFingerprint([body]));
  });
});
