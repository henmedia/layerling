import { describe, expect, it } from "vitest";
import { editorHistoryEntry } from "@/lib/editorHistory";
import { MAX_GEAR_TEETH } from "@/lib/gearGeometry";
import { exportLylProject, importLylProject } from "@/lib/lylProject";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE, normalizeShapeCustomizations } from "@/lib/workplaneSettings";
import type { WorkplaneShape } from "@/types/layerling";

const save = (shapes: WorkplaneShape[]) => exportLylProject({
  projectId: "gear",
  projectName: "Gear",
  createdAt: 1,
  modifiedAt: 2,
  shapes,
  history: [editorHistoryEntry(shapes, [])],
  historyIndex: 0,
  assets: [],
  workspace: DEFAULT_WORKPLANE_WORKSPACE,
  snapGrid: DEFAULT_SNAP_GRID,
  placementElevation: 0,
});

describe("gears with as many teeth as the editor allows (#1141)", () => {
  it("loads a saved project whose gear has more than 150 teeth", async () => {
    const asset = toolbarShapeAssets.find((entry) => entry.kind === "gear")!;
    for (const teeth of [338, MAX_GEAR_TEETH]) {
      const gear = makeShapeFromAsset(asset, { x: 0, z: 0 }, { teeth });
      const [loaded] = (await importLylProject(await save([gear]))).shapes;
      expect(loaded.teeth).toBe(teeth);
    }
  });

  it("keeps a gear default of more than 150 teeth", () => {
    expect(normalizeShapeCustomizations({ gear: { teeth: 338 } }, {}).gear?.teeth).toBe(338);
  });
});
