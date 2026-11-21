import { describe, expect, it } from "vitest";
import { historyViewMcpCommand, type HistoryViewMcpContext } from "@/components/workplane/historyViewMcp";
import { editorHistoryEntry } from "@/lib/editorHistory";
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

function context(): HistoryViewMcpContext {
  const entries = [
    editorHistoryEntry([], [], []),
    editorHistoryEntry([box()], [], []),
    editorHistoryEntry([box({ x: 15 })], [], []),
  ];
  return {
    entries: () => entries,
    current: () => 2,
    showing: () => null,
    openView: () => {},
    closeView: () => {},
    showState: () => {},
    busy: () => false,
    clearHistory: () => 0,
    deleteSteps: (indices) => indices.length,
    bringBack: () => [],
    openGroups: () => 0,
    summary: (shape) => shape.id,
  };
}

describe("set_history_view steps (#1023)", () => {
  it("lists every state with the step that led to it when asked", () => {
    const answer = historyViewMcpCommand("set_history_view", { steps: true }, context()) as { steps: { index: number; step: string; freesBytes: number }[]; historyBytes: number };
    expect(answer.steps.map(({ index, step }) => ({ index, step }))).toEqual([
      { index: 0, step: "Start of the history" },
      { index: 1, step: "Added Box" },
      { index: 2, step: "Moved Box (15 mm)" },
    ]);
    // What deleting each state would free comes along, and the whole history's size.
    answer.steps.forEach((step) => expect(step.freesBytes).toBeGreaterThan(0));
    expect(answer.historyBytes).toBe(answer.steps.reduce((sum, step) => sum + step.freesBytes, 0));
  });

  it("leaves the list out unless asked", () => {
    const answer = historyViewMcpCommand("set_history_view", {}, context()) as Record<string, unknown>;
    expect(answer.steps).toBeUndefined();
    expect(answer.undoStep).toBe("Moved Box (15 mm)");
  });
});

describe("delete_history_steps (memory 14.11.2026, #1728)", () => {
  it("deletes the states asked for, with what that frees", () => {
    let asked: readonly number[] = [];
    const answer = historyViewMcpCommand("delete_history_steps", { steps: [1], confirm: true }, { ...context(), deleteSteps: (indices) => { asked = indices; return indices.length; } }) as Record<string, unknown>;
    expect(asked).toEqual([1]);
    expect(answer.removedSteps).toBe(1);
    expect(answer.freedBytes).toBeGreaterThan(0);
  });

  it("needs confirm, real states and never the current one", () => {
    expect(() => historyViewMcpCommand("delete_history_steps", { steps: [1] }, context())).toThrow(/confirm: true/);
    expect(() => historyViewMcpCommand("delete_history_steps", { steps: [], confirm: true }, context())).toThrow(/steps/);
    expect(() => historyViewMcpCommand("delete_history_steps", { steps: [5], confirm: true }, context())).toThrow(/no state 5/);
    expect(() => historyViewMcpCommand("delete_history_steps", { steps: [2], confirm: true }, context())).toThrow(/stands at/);
  });
});
