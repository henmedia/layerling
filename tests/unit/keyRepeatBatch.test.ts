import { describe, expect, it } from "vitest";
import { createKeyRepeatBatch, type KeyNudge } from "@/lib/keyRepeatBatch";

function manualScheduler() {
  const runs = new Map<number, () => void>();
  let next = 1;
  return {
    schedule: (run: () => void) => {
      runs.set(next, run);
      return next++;
    },
    cancel: (handle: number) => {
      runs.delete(handle);
    },
    frame: () => {
      const due = [...runs.values()];
      runs.clear();
      for (const run of due) run();
    },
    pending: () => runs.size,
  };
}

describe("keyRepeatBatch (#1042)", () => {
  it("moves a fresh press at once", () => {
    const moves: KeyNudge[] = [];
    const scheduler = manualScheduler();
    const batch = createKeyRepeatBatch((nudge) => moves.push(nudge), scheduler);
    batch.add({ x: 1, z: 0, rise: 0 }, false);
    expect(moves).toEqual([{ x: 1, z: 0, rise: 0 }]);
    expect(scheduler.pending()).toBe(0);
  });

  it("adds up the repeats of a frame and moves once by their sum", () => {
    const moves: KeyNudge[] = [];
    const scheduler = manualScheduler();
    const batch = createKeyRepeatBatch((nudge) => moves.push(nudge), scheduler);
    batch.add({ x: 1, z: 0, rise: 0 }, true);
    batch.add({ x: 1, z: 0, rise: 0 }, true);
    batch.add({ x: 0, z: -1, rise: 2 }, true);
    expect(moves).toEqual([]);
    scheduler.frame();
    expect(moves).toEqual([{ x: 2, z: -1, rise: 2 }]);
    batch.add({ x: 1, z: 0, rise: 0 }, true);
    scheduler.frame();
    expect(moves).toEqual([{ x: 2, z: -1, rise: 2 }, { x: 1, z: 0, rise: 0 }]);
  });

  it("hands over what is left when the key comes up, and nothing moves after", () => {
    const moves: KeyNudge[] = [];
    const scheduler = manualScheduler();
    const batch = createKeyRepeatBatch((nudge) => moves.push(nudge), scheduler);
    batch.add({ x: -1, z: 0, rise: 0 }, true);
    batch.add({ x: -1, z: 0, rise: 0 }, true);
    batch.flush();
    expect(moves).toEqual([{ x: -2, z: 0, rise: 0 }]);
    scheduler.frame();
    batch.flush();
    expect(moves).toHaveLength(1);
  });

  it("keeps the order when a fresh press follows repeats in the same frame", () => {
    const moves: KeyNudge[] = [];
    const scheduler = manualScheduler();
    const batch = createKeyRepeatBatch((nudge) => moves.push(nudge), scheduler);
    batch.add({ x: 1, z: 0, rise: 0 }, true);
    batch.add({ x: 0, z: 1, rise: 0 }, false);
    expect(moves).toEqual([{ x: 1, z: 0, rise: 0 }, { x: 0, z: 1, rise: 0 }]);
    expect(scheduler.pending()).toBe(0);
  });

  it("does not move when the repeats cancel out", () => {
    const moves: KeyNudge[] = [];
    const scheduler = manualScheduler();
    const batch = createKeyRepeatBatch((nudge) => moves.push(nudge), scheduler);
    batch.add({ x: 1, z: 0, rise: 0 }, true);
    batch.add({ x: -1, z: 0, rise: 0 }, true);
    scheduler.frame();
    expect(moves).toEqual([]);
  });
});
