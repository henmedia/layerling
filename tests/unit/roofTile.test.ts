import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { editorHistoryEntry } from "@/lib/editorHistory";
import { exportLylProject, importLylProject } from "@/lib/lylProject";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import { canonicalizeShape } from "@/lib/workplaneShapes";
import { horizontalPlacementWorkplane, placementPatchForNewShape } from "@/lib/placementWorkplane";
import { libraryAssetCustomization, libraryAssetTurnX, libraryShapeAssets, makeShapeFromAsset, roofAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { SHAPE_LIBRARY_SECTIONS, searchShapeLibrary, shapeLibrarySections } from "@/lib/shapeLibrarySections";

describe("the roof tile (#1931)", () => {
  it("stands in the basic shapes before the round roof", () => {
    const ids = libraryShapeAssets.map((asset) => asset.id);
    expect(ids.indexOf("roof")).toBeGreaterThan(-1);
    expect(ids.indexOf("roof")).toBe(ids.indexOf("round-roof") - 1);
    const basic = SHAPE_LIBRARY_SECTIONS.find((section) => section.id === "basic")!.shapes;
    expect(basic.indexOf("roof")).toBe(basic.indexOf("round-roof") - 1);
  });

  it("is a three-sided polygon whatever the saved polygon defaults say", () => {
    const shape = makeShapeFromAsset(roofAsset, undefined, libraryAssetCustomization(roofAsset, { sides: 8, polygonFlat: true }));
    expect(shape.kind).toBe("polygon");
    expect(shape.sides).toBe(3);
    expect(shape.polygonFlat).toBeFalsy();
    expect(shape.polygonRoof).toBe(true);
    // Tinkercad's Roof: as high as it is wide.
    expect([shape.width, shape.depth, shape.height]).toEqual([20, 20, 20]);
  });

  it("is set down lying on one flat side with its foot on the plate; other shapes stand as before", () => {
    const shape = makeShapeFromAsset(roofAsset, undefined, libraryAssetCustomization(roofAsset));
    const workplane = horizontalPlacementWorkplane(0);
    const placed = placementPatchForNewShape(shape, workplane, workplane.origin, false, libraryAssetTurnX(roofAsset));
    expect(Math.abs(placed.rotationX ?? 0)).toBe(90);
    // The middle is half the depth above the plate, which the turned triangle stands on; elevation counts from
    // the middle less half the shape's own height.
    expect(placed.elevation + shape.height / 2).toBeCloseTo(shape.depth / 2, 6);
    const polygon = toolbarShapeAssets.find((asset) => asset.id === "polygon")!;
    expect(libraryAssetTurnX(polygon)).toBe(0);
    const box = makeShapeFromAsset(toolbarShapeAssets.find((asset) => asset.id === "box")!);
    expect(placementPatchForNewShape(box, workplane)).toEqual(placementPatchForNewShape(box, workplane, workplane.origin, false, 0));
  });

  it("is found by the words people type for it", () => {
    const sections = shapeLibrarySections(libraryShapeAssets);
    for (const word of ["roof", "Dach", "triangle", "Dreieck"]) {
      const found = searchShapeLibrary(sections, word, (shape) => shape.name).flatMap((section) => section.shapes.map((shape) => shape.id));
      expect(found, word).toContain("roof");
    }
  });

  it("keeps its three sides and its mark, also through a saved design; a plain polygon has no mark", async () => {
    const roof = { ...makeShapeFromAsset(roofAsset, undefined, libraryAssetCustomization(roofAsset)), id: "roof" };
    expect(canonicalizeShape({ ...roof, sides: 5, polygonFlat: true })).toMatchObject({ sides: 3, polygonRoof: true });
    expect(canonicalizeShape({ ...roof, polygonFlat: true }).polygonFlat).toBeUndefined();
    const polygon = makeShapeFromAsset(toolbarShapeAssets.find((asset) => asset.id === "polygon")!);
    expect(polygon.polygonRoof).toBeUndefined();
    expect(canonicalizeShape({ ...polygon, kind: "box", polygonRoof: true }).polygonRoof).toBeUndefined();
    const file = await exportLylProject({
      projectId: "roof", projectName: "Roof", createdAt: 1_700_000_000_000, modifiedAt: 1_700_000_100_000,
      shapes: [roof], history: [editorHistoryEntry([roof], [])], historyIndex: 0, assets: [],
      workspace: DEFAULT_WORKPLANE_WORKSPACE, snapGrid: DEFAULT_SNAP_GRID, placementElevation: 0,
    });
    const restored = (await importLylProject(file)).shapes.find((entry) => entry.id === "roof");
    expect(restored).toMatchObject({ kind: "polygon", sides: 3, polygonRoof: true });
  });

  it("offers no side count and no saving as polygon defaults in its panel", () => {
    const inspector = readFileSync(fileURLToPath(new URL("../../apps/web/src/components/workplane/ShapeInspector.tsx", import.meta.url)), "utf8");
    const roofBranch = inspector.slice(inspector.indexOf("if (shape.polygonRoof) {"), inspector.indexOf("const nutPocketProperty"));
    expect(roofBranch).not.toContain('id: "sides"');
    expect(roofBranch).not.toContain('id: "polygonFlat"');
    expect(inspector).toContain("onShapeDefaultsChange && propertyDefaults && !shape.polygonRoof ?");
  });
});
