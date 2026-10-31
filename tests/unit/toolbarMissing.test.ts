import { describe, expect, it } from "vitest";
import { missingForTool, type SelectionFacts } from "@/components/workplane/SecondaryToolbar";
import { MESSAGES_EN } from "@/lib/messages.en";

const nothing: SelectionFacts = { count: 0, locked: false, hasGroup: false, isMesh: false, loftable: false };
const lockedBoxes = (count: number): SelectionFacts => ({ ...nothing, count, locked: true });

describe("a greyed-out tool says what it waits for", () => {
  it("names nothing for a tool that is on", () => {
    expect(missingForTool({ id: "fillet", enabled: true, needs: "oneBody" }, false, nothing)).toBeNull();
  });

  it("names what the tool needs", () => {
    expect(missingForTool({ id: "fillet", enabled: false, needs: "oneBody" }, false, nothing)).toBe(MESSAGES_EN["editor.needs.oneBody"]);
    expect(missingForTool({ id: "loftSketches", enabled: false, needs: "loft" }, false, nothing)).toBe(MESSAGES_EN["status.loftNeedsSketches"]);
  });

  it("names the lock when it is all that is missing", () => {
    expect(missingForTool({ id: "fillet", enabled: false, needs: "oneBody" }, false, lockedBoxes(1))).toBe(MESSAGES_EN["editor.needs.locked"]);
    expect(missingForTool({ id: "group", enabled: false, needs: "twoBodies" }, false, lockedBoxes(3))).toBe(MESSAGES_EN["editor.needs.locked"]);
    expect(missingForTool({ id: "ungroup", enabled: false, needs: "group" }, false, { ...lockedBoxes(1), hasGroup: true })).toBe(MESSAGES_EN["editor.needs.locked"]);
  });

  it("names what else is missing, not the lock, when unlocking would not help", () => {
    expect(missingForTool({ id: "fillet", enabled: false, needs: "oneBody" }, false, lockedBoxes(3))).toBe(MESSAGES_EN["editor.needs.oneBody"]);
    expect(missingForTool({ id: "group", enabled: false, needs: "twoBodies" }, false, lockedBoxes(1))).toBe(MESSAGES_EN["editor.needs.twoBodies"]);
    expect(missingForTool({ id: "cutOut", enabled: false, needs: "twoSolids" }, false, lockedBoxes(3))).toBe(MESSAGES_EN["editor.needs.twoSolids"]);
    expect(missingForTool({ id: "ungroup", enabled: false, needs: "group" }, false, lockedBoxes(1))).toBe(MESSAGES_EN["editor.needs.group"]);
    expect(missingForTool({ id: "simplify", enabled: false, needs: "mesh" }, false, lockedBoxes(1))).toBe(MESSAGES_EN["editor.needs.mesh"]);
    expect(missingForTool({ id: "loftSketches", enabled: false, needs: "loft" }, false, lockedBoxes(2))).toBe(MESSAGES_EN["status.loftNeedsSketches"]);
  });

  it("names the history view while it is open", () => {
    expect(missingForTool({ id: "fillet", enabled: false, needs: "oneBody" }, true, lockedBoxes(1))).toBe(MESSAGES_EN["editor.needs.historyView"]);
    expect(missingForTool({ id: "undo", enabled: false }, true, nothing)).toBe(MESSAGES_EN["editor.needs.historyView"]);
    expect(missingForTool({ id: "history", enabled: false }, true, nothing)).toBeNull();
  });

  it("names nothing for a tool without a need", () => {
    expect(missingForTool({ id: "undo", enabled: false }, false, nothing)).toBeNull();
  });
});
