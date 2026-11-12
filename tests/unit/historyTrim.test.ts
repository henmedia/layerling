import { describe, expect, it } from "vitest";
import { historyTrimSteps, isOutOfMemoryError, isProjectTooLargeError, isRetriedWithLessHistory, isStorageFullError, trimHistoryWindow } from "@/lib/historyTrim";
import { localizedError } from "@/lib/userErrors";

const steps = (count: number) => Array.from({ length: count }, (_, index) => `step-${index}`);

describe("a design too big to save keeps the newest steps of its history (#475)", () => {
  it("knows the two refusals of the project format by their text", () => {
    expect(isProjectTooLargeError(new Error("Project data exceeds the 64 MB project file limit. Export with fewer history steps or simplify the project."))).toBe(true);
    expect(isProjectTooLargeError(new Error("Project has too many stored assets for the project format. Export with fewer history steps."))).toBe(true);
    expect(isProjectTooLargeError(new Error("Could not save project shapes"))).toBe(false);
    expect(isProjectTooLargeError("Project data exceeds the 64 MB project file limit")).toBe(false);
  });

  it("knows a browser that has no room left, whatever its wording", () => {
    expect(isStorageFullError({ name: "QuotaExceededError", message: "" })).toBe(true);
    expect(isStorageFullError(new Error("The current transaction exceeded its quota limitations."))).toBe(true);
    expect(isStorageFullError(new Error("Could not save project shapes"))).toBe(false);
    expect(isStorageFullError(null)).toBe(false);
  });

  it("cuts to the newest steps and moves the index with the cut", () => {
    const cut = trimHistoryWindow(steps(10), 9, 4);
    expect(cut.history).toEqual(["step-6", "step-7", "step-8", "step-9"]);
    expect(cut.historyIndex).toBe(3);
  });

  it("keeps the step the design stands at when it lies further back, so Redo stays", () => {
    const cut = trimHistoryWindow(steps(10), 2, 4);
    expect(cut.history[cut.historyIndex]).toBe("step-2");
    expect(cut.history.at(-1)).toBe("step-9");
  });

  it("leaves a short history as it is, and never goes below one step", () => {
    expect(trimHistoryWindow(steps(3), 2, 5)).toEqual({ history: steps(3), historyIndex: 2 });
    expect(trimHistoryWindow(steps(5), 4, 0).history).toEqual(["step-4"]);
  });

  it("tries half of the history first, then half of that, down to the current step alone", () => {
    expect(historyTrimSteps(42)).toEqual([21, 11, 6, 3, 2, 1]);
    expect(historyTrimSteps(2)).toEqual([1]);
    expect(historyTrimSteps(1)).toEqual([1]);
  });

  it("tells a person what to do instead of 'Could not save design shapes'", () => {
    expect(localizedError("Project data exceeds the 64 MB project file limit. Export with fewer history steps or simplify the project.")).toMatch(/too big to save/i);
    expect(localizedError("The current transaction exceeded its quota limitations.")).toMatch(/no room left/i);
  });
});

// Discussion #1652: with meshes of millions of triangles, packing the whole history ran the tab out of memory, the save
// failed every time and a reload brought back a state hours old.
describe("a design that runs out of memory while it is saved", () => {
  it("is packed again with fewer history steps, as a package too big for the format is", () => {
    expect(isOutOfMemoryError(new RangeError("Array buffer allocation failed"))).toBe(true);
    expect(isOutOfMemoryError(new RangeError("Invalid typed array length: 4294967296"))).toBe(true);
    expect(isOutOfMemoryError(new Error("Out of memory"))).toBe(true);
    expect(isOutOfMemoryError(new Error("Could not save project shapes"))).toBe(false);
    expect(isRetriedWithLessHistory(new RangeError("Array buffer allocation failed"))).toBe(true);
    expect(isRetriedWithLessHistory(new Error("Project data exceeds the 64 MB project file limit."))).toBe(true);
    expect(isRetriedWithLessHistory(new Error("The current transaction exceeded its quota limitations."))).toBe(false);
  });

  it("says why when it fails all the same", () => {
    expect(localizedError("Array buffer allocation failed")).toMatch(/run out of memory/i);
  });
});
