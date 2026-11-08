import { describe, expect, it } from "vitest";
import { editorHistoryEntry } from "@/lib/editorHistory";
import { exportLylProject, importLylProject, type LylProjectExportInput } from "@/lib/lylProject";
import { projectAssetFromBytes } from "@/lib/projectAssets";
import { importedShapeFromStl, stlReadBeforeZUp } from "@/lib/stlImport";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import type { WorkplaneShape } from "@/types/layerling";

function boxStl(width: number, ySize: number, zSize: number) {
  const vertices = [
    [0, 0, 0], [width, 0, 0], [width, ySize, 0], [0, ySize, 0],
    [0, 0, zSize], [width, 0, zSize], [width, ySize, zSize], [0, ySize, zSize],
  ];
  const faces = [
    [0, 2, 1], [0, 3, 2], [4, 5, 6], [4, 6, 7],
    [0, 1, 5], [0, 5, 4], [1, 2, 6], [1, 6, 5],
    [2, 3, 7], [2, 7, 6], [3, 0, 4], [3, 4, 7],
  ];
  const facets = faces.map(([a, b, c]) => `facet normal 0 0 0
  outer loop
    vertex ${vertices[a].join(" ")}
    vertex ${vertices[b].join(" ")}
    vertex ${vertices[c].join(" ")}
  endloop
endfacet`).join("\n");
  return new TextEncoder().encode(`solid part\n${facets}\nendsolid part`);
}

function input(shapes: WorkplaneShape[], assets: LylProjectExportInput["assets"]): LylProjectExportInput {
  return {
    projectId: "project-1518",
    projectName: "Reactor Vent Cannon",
    createdAt: 1_700_000_000_000,
    modifiedAt: 1_700_000_100_000,
    shapes,
    history: [editorHistoryEntry(shapes, [])],
    historyIndex: 0,
    assets,
    workspace: DEFAULT_WORKPLANE_WORKSPACE,
    snapGrid: DEFAULT_SNAP_GRID,
    placementElevation: 0,
  };
}

/** A part imported from `bytes`, read as given, scaled by `scale` on all three axes. */
async function savedPart(bytes: Uint8Array, readYUp: boolean, scale = 1) {
  const asset = await projectAssetFromBytes("armour.stl", "stl", bytes);
  const read = importedShapeFromStl("armour.stl", bytes.slice().buffer, { yUp: readYUp });
  const mesh = read.importedMesh!;
  const shape: WorkplaneShape = {
    ...read,
    id: "armour",
    width: mesh.baseWidth * scale,
    depth: mesh.baseDepth * scale,
    height: mesh.baseHeight * scale,
    importedMesh: { ...mesh, assetId: asset.id },
  };
  return { asset, shape };
}

describe("STL parts saved before every STL was read Z-up (Issue #1518)", () => {
  // Thin in Y (20 of 58): before 1.151.0 this file was taken for Y-up, so it stood 20 mm high and 58 mm deep.
  const thinInY = boxStl(80, 20, 58);

  it("open as they were imported, not turned and stretched", async () => {
    const { asset, shape } = await savedPart(thinInY, true, 1.5);
    const restored = await importLylProject(await exportLylProject(input([shape], [asset])));
    const part = restored.shapes[0];

    expect(part.importedMesh?.baseWidth).toBeCloseTo(80);
    expect(part.importedMesh?.baseHeight).toBeCloseTo(20);
    expect(part.importedMesh?.baseDepth).toBeCloseTo(58);
    expect(part.importedMesh?.positions).toEqual(shape.importedMesh?.positions);
    expect(part).toMatchObject({ width: 120, height: 30, depth: 87 });
  });

  it("come back even when the design was saved again after opening wrongly", async () => {
    const { asset, shape } = await savedPart(thinInY, true);
    // Opened in 1.151.0 to 1.153.0: the mesh read Z-up, the part's own size still the old one, and saved like that.
    const zUp = importedShapeFromStl("armour.stl", thinInY.slice().buffer).importedMesh!;
    const broken = { ...shape, importedMesh: { ...zUp, assetId: asset.id } };
    const restored = await importLylProject(await exportLylProject(input([broken], [asset])));

    expect(restored.shapes[0].importedMesh?.baseHeight).toBeCloseTo(20);
    expect(restored.shapes[0].importedMesh?.baseDepth).toBeCloseTo(58);
  });

  it("leave a part imported Z-up since 1.151.0 standing as it was made (Discussion #1450)", async () => {
    // A knife standing on its back: thin in Y as well, but imported the new way.
    const { asset, shape } = await savedPart(boxStl(306, 30, 70), false);
    const restored = await importLylProject(await exportLylProject(input([shape], [asset])));

    expect(restored.shapes[0].importedMesh?.baseHeight).toBeCloseTo(70);
    expect(restored.shapes[0].importedMesh?.baseDepth).toBeCloseTo(30);
  });

  it("only looks at files the old rule read Y-up", () => {
    // Read Z-up: 80 wide, 20 deep, 58 high - the old rule read it Y-up, and the saved size is that reading's.
    expect(stlReadBeforeZUp({ baseWidth: 80, baseDepth: 20, baseHeight: 58 }, { baseWidth: 80, baseDepth: 58, baseHeight: 20 }, {})).toBe(true);
    // Not thin in Y: the old rule read it Z-up too.
    expect(stlReadBeforeZUp({ baseWidth: 80, baseDepth: 60, baseHeight: 20 }, { baseWidth: 80, baseDepth: 20, baseHeight: 60 }, {})).toBe(false);
    // A part stretched on purpose that fits the new reading stays with it.
    expect(stlReadBeforeZUp({ baseWidth: 80, baseDepth: 20, baseHeight: 58 }, { baseWidth: 80, baseDepth: 20, baseHeight: 58 }, { width: 160, depth: 40, height: 116 })).toBe(false);
  });
});
