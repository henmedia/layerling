import { describe, expect, it } from "vitest";
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
});
