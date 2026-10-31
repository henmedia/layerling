import { describe, expect, it } from "vitest";
import { missingForTool } from "@/components/workplane/SecondaryToolbar";
import { MESSAGES_EN } from "@/lib/messages.en";

const idle = { historyViewActive: false, selectionLocked: false, selectionCount: 0 };

describe("a greyed-out tool says what it waits for", () => {
  it("names nothing for a tool that is on", () => {
    expect(missingForTool({ id: "fillet", enabled: true, needs: "oneBody" }, idle)).toBeNull();
  });

  it("names what the tool needs", () => {
    expect(missingForTool({ id: "fillet", enabled: false, needs: "oneBody" }, idle)).toBe(MESSAGES_EN["editor.needs.oneBody"]);
    expect(missingForTool({ id: "loftSketches", enabled: false, needs: "loft" }, idle)).toBe(MESSAGES_EN["status.loftNeedsSketches"]);
  });

  it("names the lock when a locked object is what stops it", () => {
    const locked = { ...idle, selectionLocked: true, selectionCount: 1 };
    expect(missingForTool({ id: "fillet", enabled: false, needs: "oneBody" }, locked)).toBe(MESSAGES_EN["editor.needs.locked"]);
    expect(missingForTool({ id: "group", enabled: false, needs: "twoBodies" }, { ...locked, selectionCount: 3 })).toBe(MESSAGES_EN["editor.needs.locked"]);
  });

  it("names the count, not the lock, for a one-body tool with several selected", () => {
    const state = { ...idle, selectionLocked: true, selectionCount: 3 };
    expect(missingForTool({ id: "fillet", enabled: false, needs: "oneBody" }, state)).toBe(MESSAGES_EN["editor.needs.oneBody"]);
  });

  it("names the history view while it is open", () => {
    const state = { ...idle, historyViewActive: true, selectionCount: 1 };
    expect(missingForTool({ id: "fillet", enabled: false, needs: "oneBody" }, state)).toBe(MESSAGES_EN["editor.needs.historyView"]);
    expect(missingForTool({ id: "undo", enabled: false }, state)).toBe(MESSAGES_EN["editor.needs.historyView"]);
    expect(missingForTool({ id: "history", enabled: false }, state)).toBeNull();
  });

  it("names nothing for a tool without a need", () => {
    expect(missingForTool({ id: "undo", enabled: false }, idle)).toBeNull();
  });
});
