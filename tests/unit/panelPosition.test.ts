import { describe, expect, it } from "vitest";
import { clampPanelPosition, isNearDock, PANEL_DOCK_DISTANCE, PANEL_GRAB_HEIGHT, parsePanelPosition } from "@/lib/panelPosition";

const area = { width: 1000, height: 700 };
const panel = { width: 300 };

describe("where a moved panel may sit", () => {
  it("stays where it was dropped inside the area", () => {
    expect(clampPanelPosition({ left: 200, top: 150 }, panel, area)).toEqual({ left: 200, top: 150 });
  });

  it("cannot leave the area to the left or the top", () => {
    expect(clampPanelPosition({ left: -40, top: -10 }, panel, area)).toEqual({ left: 0, top: 0 });
  });

  it("keeps its whole width inside the area", () => {
    expect(clampPanelPosition({ left: 900, top: 100 }, panel, area).left).toBe(700);
  });

  it("keeps its title bar inside the area at the bottom", () => {
    expect(clampPanelPosition({ left: 100, top: 690 }, panel, area).top).toBe(700 - PANEL_GRAB_HEIGHT);
  });

  it("is pulled back in when the area has shrunk", () => {
    expect(clampPanelPosition({ left: 700, top: 600 }, panel, { width: 800, height: 500 })).toEqual({ left: 500, top: 500 - PANEL_GRAB_HEIGHT });
  });

  it("sits at the left edge when the area is narrower than the panel", () => {
    expect(clampPanelPosition({ left: 50, top: 10 }, panel, { width: 200, height: 500 }).left).toBe(0);
  });

  it("lands on whole pixels", () => {
    expect(clampPanelPosition({ left: 120.6, top: 80.2 }, panel, area)).toEqual({ left: 121, top: 80 });
  });

  // The shape library moves in the whole editor, and the toolbar lies over its top (#1418).
  it("stays below a bar over the top of the area, where its title bar can be grabbed", () => {
    expect(clampPanelPosition({ left: 283, top: 0 }, panel, area, 121)).toEqual({ left: 283, top: 121 });
    expect(clampPanelPosition({ left: 283, top: 300 }, panel, area, 121)).toEqual({ left: 283, top: 300 });
  });

  it("keeps below the bar even in an area too low for the title bar under it", () => {
    expect(clampPanelPosition({ left: 0, top: 400 }, panel, { width: 1000, height: 150 }, 121).top).toBe(121);
  });
});

describe("a remembered panel position", () => {
  it("reads back what was stored", () => {
    expect(parsePanelPosition(JSON.stringify({ left: 240, top: 96 }))).toEqual({ left: 240, top: 96 });
  });

  it("ignores nothing stored, broken text and missing numbers", () => {
    expect(parsePanelPosition(null)).toBeNull();
    expect(parsePanelPosition("{not json")).toBeNull();
    expect(parsePanelPosition(JSON.stringify({ left: 10 }))).toBeNull();
    expect(parsePanelPosition(JSON.stringify({ left: "10", top: 5 }))).toBeNull();
    expect(parsePanelPosition("null")).toBeNull();
  });
});

describe("docking a panel again", () => {
  const dock = { left: 104, top: 64 };

  it("docks when dropped close to its spot", () => {
    expect(isNearDock({ left: 120, top: 80 }, dock)).toBe(true);
    expect(isNearDock(dock, dock)).toBe(true);
  });

  it("stays where it was dropped when that is further away", () => {
    expect(isNearDock({ left: 104 + PANEL_DOCK_DISTANCE, top: 64 + 1 }, dock)).toBe(false);
    expect(isNearDock({ left: 400, top: 300 }, dock)).toBe(false);
  });
});
