import { describe, expect, it } from "vitest";
import { editorHistoryEntry } from "@/lib/editorHistory";
import { deleteHistoryEntries, formatHistoryBytes, historyFreedBytes, historyIndexAfterDelete, historyStepSizes, largestHistorySteps } from "@/lib/historyStepSizes";
import type { WorkplaneShape } from "@/types/layerling";

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

/** A baked mesh as a turn leaves it: `seed` makes each one different, `triangles` sets its size. */
function turned(seed: number, triangles = 2000, overrides: Partial<WorkplaneShape> = {}): WorkplaneShape {
  const positions = Array.from({ length: triangles * 9 }, (_value, index) => ((index * 7 + seed * 13) % 97) / 3 + seed);
  return box({
    kind: "mesh",
    importedMesh: { positions, baseWidth: 20, baseDepth: 20, baseHeight: 20, triangleCount: triangles, sourceFormat: "json" },
    ...overrides,
  });
}

describe("what the steps of the history take (memory 14.11.2026, #1728)", () => {
  it("counts a mesh once, for the step that alone holds it", () => {
    const meshA = turned(1);
    const meshB = turned(2);
    const entries = [
      editorHistoryEntry([box()], []),
      editorHistoryEntry([meshA], []),
      // Moving the turned body keeps its mesh: this step holds no mesh of its own.
      editorHistoryEntry([{ ...meshA, x: 30 }], []),
      editorHistoryEntry([{ ...meshB, x: 30 }], []),
    ];
    const sizes = historyStepSizes(entries);
    // The mesh of the first turn is shared by two steps: neither frees it alone.
    expect(sizes.own[1]).toBeLessThan(10_000);
    expect(sizes.own[2]).toBeLessThan(10_000);
    // The second turn's mesh is its own.
    expect(sizes.own[3]).toBeGreaterThan(100_000);
    // Two meshes in the whole history, not three.
    const meshBytes = sizes.own[3];
    expect(sizes.total).toBeGreaterThan(meshBytes * 1.9);
    expect(sizes.total).toBeLessThan(meshBytes * 2.2);
  });

  it("frees a shared mesh only when every step that holds it goes", () => {
    const meshA = turned(1);
    const entries = [
      editorHistoryEntry([box()], []),
      editorHistoryEntry([meshA], []),
      editorHistoryEntry([{ ...meshA, x: 30 }], []),
      editorHistoryEntry([box({ x: 50 })], []),
    ];
    const alone = historyFreedBytes(entries, [1]);
    const together = historyFreedBytes(entries, [1, 2]);
    expect(alone).toBeLessThan(10_000);
    expect(together).toBeGreaterThan(100_000);
    expect(historyFreedBytes(entries, [])).toBe(0);
    expect(historyFreedBytes(entries, [9, -1])).toBe(0);
  });

  it("picks the large steps, never the one the design stands at", () => {
    const entries = [
      editorHistoryEntry([box()], []),
      editorHistoryEntry([turned(1, 20_000)], []),
      editorHistoryEntry([turned(2, 20_000)], []),
      editorHistoryEntry([turned(3, 20_000)], []),
    ];
    const sizes = historyStepSizes(entries);
    expect(largestHistorySteps(sizes, 3)).toEqual([1, 2]);
    expect(largestHistorySteps(sizes, 1)).toEqual([2, 3]);
  });
});

describe("deleting single steps of the history", () => {
  const steps = ["a", "b", "c", "d", "e"];

  it("takes the steps out and moves the index with them", () => {
    expect(deleteHistoryEntries(steps, 3, [1])).toEqual({ entries: ["a", "c", "d", "e"], index: 2, removed: [1] });
    expect(deleteHistoryEntries(steps, 3, [4])).toEqual({ entries: ["a", "b", "c", "d"], index: 3, removed: [4] });
    expect(deleteHistoryEntries(steps, 3, [0, 2, 4, 2])).toEqual({ entries: ["b", "d"], index: 1, removed: [0, 2, 4] });
  });

  it("keeps the state the design stands at, and does nothing when nothing would go", () => {
    expect(deleteHistoryEntries(steps, 3, [3])).toBeNull();
    expect(deleteHistoryEntries(steps, 3, [3, 1])?.entries).toEqual(["a", "c", "d", "e"]);
    expect(deleteHistoryEntries(steps, 3, [])).toBeNull();
    expect(deleteHistoryEntries(steps, 3, [7, -1, 1.5])).toBeNull();
  });

  it("moves a shown state to its place after the delete", () => {
    expect(historyIndexAfterDelete(4, [1])).toBe(3);
    expect(historyIndexAfterDelete(0, [1])).toBe(0);
    // A deleted state shows the nearest earlier one left.
    expect(historyIndexAfterDelete(2, [1, 2])).toBe(0);
    expect(historyIndexAfterDelete(3, [2, 3])).toBe(1);
    expect(historyIndexAfterDelete(1, [0, 1])).toBe(0);
  });

  it("writes sizes as people read them", () => {
    expect(formatHistoryBytes(512)).toBe("512 B");
    expect(formatHistoryBytes(820 * 1024)).toBe("820 KB");
    expect(formatHistoryBytes(3.25 * 1024 * 1024)).toBe("3.3 MB");
    expect(formatHistoryBytes(3.25 * 1024 * 1024, "de")).toBe("3,3 MB");
    expect(formatHistoryBytes(25 * 1024 * 1024)).toBe("25 MB");
  });
});
