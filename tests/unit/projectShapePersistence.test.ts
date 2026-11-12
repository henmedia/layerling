import { describe, expect, it } from "vitest";
import { editorHistoryEntry } from "@/lib/editorHistory";
import { compactProjectShapeState, hydrateProjectShapeState, nextProjectRevision, reconcileLoadedProjectShapeCacheEntry } from "@/lib/projectShapePersistence";
import type { WorkplaneShape } from "@/types/layerling";

function importedShape(): WorkplaneShape {
  return {
    id: "mesh-1",
    name: "Imported mesh",
    kind: "mesh",
    color: "#d41721",
    x: 0,
    z: 0,
    elevation: 0,
    size: 10,
    width: 10,
    depth: 10,
    height: 10,
    rotation: 0,
    importedMesh: {
      positions: [0, 0, 0, 1, 0, 0, 0, 1, 0],
      normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
      baseWidth: 1,
      baseDepth: 1,
      baseHeight: 1,
      triangleCount: 1,
      sourceFormat: "stl",
    },
  };
}

describe("project shape persistence resources", () => {
  it("preserves a newer live cache entry when an older IndexedDB read finishes late", () => {
    const live = { revision: 20, shapes: [importedShape()] };
    const staleLoaded = { revision: 30, shapes: [] as WorkplaneShape[] };

    const reconciled = reconcileLoadedProjectShapeCacheEntry(live, staleLoaded, 10);

    expect(reconciled.revision).toBe(30);
    expect(reconciled.shapes).toHaveLength(1);
    expect(reconciled.shapes[0]?.id).toBe("mesh-1");
  });

  it("accepts persisted shapes when the IndexedDB record is newer than the live cache", () => {
    const live = { revision: 20, shapes: [] as WorkplaneShape[] };
    const loaded = { revision: 40, shapes: [importedShape()] };

    const reconciled = reconcileLoadedProjectShapeCacheEntry(live, loaded, 40);

    expect(reconciled).toBe(loaded);
    expect(reconciled.shapes[0]?.id).toBe("mesh-1");
  });

  it("stores one immutable mesh resource across current shapes and history", () => {
    const mesh = importedShape();
    const group: WorkplaneShape = {
      ...mesh,
      id: "group-1",
      name: "Group",
      importedMesh: undefined,
      groupedShapes: [mesh],
      groupedBaseWidth: 10,
      groupedBaseDepth: 10,
      groupedBaseHeight: 10,
      groupOperation: "group",
    };
    const history = [
      editorHistoryEntry([{ ...group, x: 0 }], []),
      editorHistoryEntry([{ ...group, x: 5 }], [group.id]),
    ];

    const compact = compactProjectShapeState([{ ...group, x: 5 }], history);
    const currentStub = compact.shapes[0].groupedShapes?.[0].importedMesh;
    const historyStub = compact.history[0].shapes[0].groupedShapes?.[0].importedMesh;

    expect(compact.resources.size).toBe(1);
    expect(currentStub?.positions).toEqual([]);
    expect(currentStub?.normals).toBeUndefined();
    expect(currentStub?.storageResourceId).toBeTruthy();
    expect(historyStub?.storageResourceId).toBe(currentStub?.storageResourceId);

    const hydrated = hydrateProjectShapeState(compact.shapes, compact.history, compact.resources);
    const currentMesh = hydrated.shapes[0].groupedShapes?.[0].importedMesh;
    const historyMesh = hydrated.history?.[0].shapes[0].groupedShapes?.[0].importedMesh;

    expect(currentMesh?.positions).toEqual(mesh.importedMesh?.positions);
    expect(currentMesh?.normals).toEqual(mesh.importedMesh?.normals);
    expect(currentMesh?.storageResourceId).toBeUndefined();
    expect(historyMesh).toBe(currentMesh);
  });
});

describe("the revision of an edit (Discussion #1652)", () => {
  const now = 1_800_000_000_000;

  it("is the time when nothing is newer", () => {
    expect(nextProjectRevision(now, 0, now - 5_000, undefined)).toBe(now);
  });

  it("follows the last one given out within the same millisecond", () => {
    expect(nextProjectRevision(now, now, now - 5_000)).toBe(now + 1);
  });

  it("is newer than a stored revision ahead of the clock, also right after a reload", () => {
    const ahead = now + 86_400_000;
    const first = nextProjectRevision(now, 0, ahead, ahead);
    expect(first).toBeGreaterThan(ahead);
    // The next edit, a moment later, is newer again: every edit is kept.
    expect(nextProjectRevision(now + 50, first, first)).toBe(first + 1);
  });

  it("ignores revisions that are not numbers", () => {
    expect(nextProjectRevision(now, 0, Number.NaN, Number.POSITIVE_INFINITY, undefined)).toBe(now);
  });
});
