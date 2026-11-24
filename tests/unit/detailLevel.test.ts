// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { detailFlags, detailItems, detailShows, isOwnDetail, normalizeDetailState, withDetail, type DetailLevel } from "@/lib/detailLevel";

const shown = (view: "editor" | "sketch", level: DetailLevel) =>
  detailItems(view).filter((item) => detailShows(view, { level, own: {} }, item));

describe("detail level", () => {
  it("puts the aids away step by step", () => {
    expect(shown("editor", 5)).toEqual(detailItems("editor"));
    expect(shown("editor", 4)).not.toContain("notes");
    expect(shown("editor", 4)).not.toContain("plateLabels");
    expect(shown("editor", 3)).toEqual(["dimensions", "snapGuides", "axes", "grid", "handles"]);
    expect(shown("editor", 2)).toEqual(["grid", "handles"]);
    expect(shown("editor", 1)).toEqual(["handles"]);
    expect(shown("sketch", 3)).toEqual(["measurements", "grid"]);
    expect(shown("sketch", 1)).toEqual([]);
  });

  it("a lower level never shows what a higher one hides", () => {
    for (const view of ["editor", "sketch"] as const) {
      for (const level of [1, 2, 3, 4] as const) {
        expect(shown(view, (level + 1) as DetailLevel)).toEqual(expect.arrayContaining(shown(view, level)));
      }
    }
  });

  it("a switch makes the level one's own, and switching back leaves the level", () => {
    const own = withDetail("editor", { level: 2, own: {} }, "axes", true);
    expect(isOwnDetail(own)).toBe(true);
    expect(own.level).toBe(2);
    expect(detailFlags("editor", own)).toMatchObject({ axes: true, grid: true, dimensions: false });
    expect(isOwnDetail(withDetail("editor", own, "axes", false))).toBe(false);
  });

  it("a held key shows everything", () => {
    expect(Object.values(detailFlags("editor", { level: 1, own: {} }, true)).every(Boolean)).toBe(true);
  });

  it("takes only what it knows from storage", () => {
    expect(normalizeDetailState("editor", { level: 9, own: { grid: "no", nonsense: false } })).toEqual({ level: 5, own: {} });
    expect(normalizeDetailState("sketch", { level: 1, own: { axes: true, grid: true } })).toEqual({ level: 1, own: { grid: true } });
    expect(normalizeDetailState("editor", null)).toEqual({ level: 5, own: {} });
  });
});

describe("the kept detail level", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
  });

  it("is kept apart for the editor and the sketch, and not at all at full detail", async () => {
    const store = await import("@/lib/detailLevel");
    store.setDetailLevel("sketch", 2);
    expect(store.detailSnapshot("sketch").flags).toMatchObject({ measurements: false, grid: true });
    expect(store.detailSnapshot("editor").state.level).toBe(5);
    expect(window.localStorage.getItem("layerling.detailLevel.editor")).toBeNull();
    vi.resetModules();
    const again = await import("@/lib/detailLevel");
    expect(again.detailSnapshot("sketch").state.level).toBe(2);
    again.setDetailLevel("sketch", 5);
    expect(window.localStorage.getItem("layerling.detailLevel.sketch")).toBeNull();
  });

  it("keeps the same object while nothing changes, and nothing of a held key", async () => {
    const store = await import("@/lib/detailLevel");
    store.setDetailLevel("editor", 1);
    const before = store.detailSnapshot("editor");
    expect(store.detailSnapshot("editor")).toBe(before);
    store.setDetail("editor", "grid", false);
    expect(store.detailSnapshot("editor")).toBe(before);
    store.setDetailPeek("editor", true);
    expect(store.detailSnapshot("editor").flags.grid).toBe(true);
    store.setDetailPeek("editor", false);
    expect(store.detailSnapshot("editor").flags.grid).toBe(false);
    expect(JSON.parse(window.localStorage.getItem("layerling.detailLevel.editor") ?? "")).toEqual({ level: 1, own: {} });
  });
});
