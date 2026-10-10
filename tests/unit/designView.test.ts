import { describe, expect, it } from "vitest";
import { editorHistoryEntry } from "@/lib/editorHistory";
import { normalizeDesignView, type DesignView } from "@/lib/designView";
import { exportLylProject, importLylProject } from "@/lib/lylProject";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import type { WorkplaneShape } from "@/types/layerling";

// #220: a design opens the way it was left, so its view travels with it.
const view: DesignView = { orthographic: true, position: [10, 80, 40], target: [0, 5, 0], up: [0, 1, 0], zoom: 1.5 };
const box: WorkplaneShape = { id: "b", name: "Box", kind: "box", color: "#123456", x: 0, z: 0, size: 20, width: 20, depth: 20, height: 10, rotation: 0 };

function pack(extra: { view?: DesignView | null }) {
  return exportLylProject({
    projectName: "Viewed",
    createdAt: 1_700_000_000_000,
    modifiedAt: 1_700_000_100_000,
    shapes: [box],
    history: [editorHistoryEntry([box], [])],
    historyIndex: 0,
    assets: [],
    workspace: DEFAULT_WORKPLANE_WORKSPACE,
    snapGrid: DEFAULT_SNAP_GRID,
    placementElevation: 0,
    ...extra,
  });
}

describe("the view of a design (#220)", () => {
  it("only takes a camera that can look at something", () => {
    expect(normalizeDesignView(view)).toEqual(view);
    expect(normalizeDesignView({ ...view, orthographic: "yes" })).toEqual({ ...view, orthographic: false });
    expect(normalizeDesignView(null)).toBeNull();
    expect(normalizeDesignView({ ...view, position: [0, 0] })).toBeNull();
    expect(normalizeDesignView({ ...view, position: [0, Number.NaN, 0] })).toBeNull();
    expect(normalizeDesignView({ ...view, position: view.target })).toBeNull();
    expect(normalizeDesignView({ ...view, up: [0, 0, 0] })).toBeNull();
    expect(normalizeDesignView({ ...view, zoom: 0 })).toBeNull();
  });

  it("comes back out of a saved file", async () => {
    const restored = await importLylProject(await pack({ view }));
    expect(restored.view).toEqual(view);
  });

  it("is simply absent from a file saved without one", async () => {
    const restored = await importLylProject(await pack({ view: null }));
    expect(restored.view).toBeUndefined();
  });
});
