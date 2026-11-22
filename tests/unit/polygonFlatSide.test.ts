import { describe, expect, it } from "vitest";
import { shapeGeometrySignature } from "@/components/workplane/viewportShapeObjects";
import { alignNaturalCenter } from "@/lib/alignCenter";
import { cadModifierProfileForShape, polygonProfileLoops } from "@/lib/cadProfileExtrusion";
import { editorHistoryEntry } from "@/lib/editorHistory";
import { meshForShape } from "@/lib/editorMeshCore";
import { exportLylProject, importLylProject } from "@/lib/lylProject";
import { nutPocketFields, nutPocketSizeFor } from "@/lib/nutPocketSizes";
import { createPrismGeometry } from "@/lib/prismGeometry";
import { polygonFlatAngle, regularPolygonAspect, regularPolygonFootprintScale } from "@/lib/regularPolygonFootprint";
import { maxPolygonCornerRadius, polygonCornerDot, polygonCornerDragPatch, polygonCorners } from "@/lib/roundedPolygonGeometry";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { shapeDefaultsFromShape } from "@/lib/shapeDefaults";
import { MCP_SHAPE_SETTING_KEYS } from "@/lib/mcpShapeSettings";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE, normalizeShapeCustomizations } from "@/lib/workplaneSettings";
import { workplaneShapesEqual } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * A Polygon with a flat side in front (Discussion #1787). The polygon stands with a corner in front, so an octagon
 * touches its frame with four corners and length and width read from corner to corner; nobody could set the width
 * across flats, the measure a wrench has. Turned by half a side it touches the frame with four flat sides.
 */

function polygon(extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return { id: "polygon", name: "Polygon", kind: "polygon", color: "#888888", x: 0, z: 0, elevation: 0, size: 26, width: 26, depth: 26, height: 10, rotation: 0, sides: 8, ...extra } as WorkplaneShape;
}

/** The corners of the mesh on the plate: x and z of every vertex at the bottom, each once. */
function floorCorners(source: WorkplaneShape) {
  const seen = new Map<string, { x: number; z: number }>();
  const middle = regularPolygonFootprintScale(source.width ?? source.size, source.depth ?? source.size, source.sides ?? 6, polygonFlatAngle(source.sides, source.polygonFlat));
  meshForShape(source).vertices.forEach(([x, y, z]) => {
    // The middle of the cap is no corner; in an odd polygon it lies beside the middle of the frame.
    if (Math.abs(y) > 1e-6 || Math.hypot(x - middle.offsetX, z - middle.offsetZ) < 1e-6) return;
    // No "-0.0000" beside "0.0000": one corner, one entry.
    seen.set(`${(Math.round(x * 1e4) + 0) / 1e4}/${(Math.round(z * 1e4) + 0) / 1e4}`, { x, z });
  });
  return [...seen.values()];
}

function extent(points: Array<{ x: number; z: number }>) {
  return {
    width: Math.max(...points.map((point) => point.x)) - Math.min(...points.map((point) => point.x)),
    depth: Math.max(...points.map((point) => point.z)) - Math.min(...points.map((point) => point.z)),
  };
}

describe("the turn of a polygon with a flat side in front", () => {
  it("is half a side step, and none without the setting", () => {
    expect(polygonFlatAngle(8, true)).toBeCloseTo(Math.PI / 8, 12);
    expect(polygonFlatAngle(6, true)).toBeCloseTo(Math.PI / 6, 12);
    expect(polygonFlatAngle(undefined, true)).toBeCloseTo(Math.PI / 6, 12);
    expect(polygonFlatAngle(8, false)).toBe(0);
    expect(polygonFlatAngle(8, undefined)).toBe(0);
  });

  it("lets an octagon measure from flat to flat instead of from corner to corner", () => {
    // Corner in front: four corners on the frame, 26 is the distance between opposite corners.
    const pointed = floorCorners(polygon());
    expect(pointed).toHaveLength(8);
    expect(pointed.filter((corner) => Math.abs(Math.abs(corner.x) - 13) < 1e-4)).toHaveLength(2);
    expect(Math.max(...pointed.map((corner) => Math.hypot(corner.x, corner.z)))).toBeCloseTo(13, 4);

    // Flat side in front: two corners on each side of the frame, 26 is the distance between opposite flats.
    const flat = floorCorners(polygon({ polygonFlat: true }));
    expect(flat).toHaveLength(8);
    expect(extent(flat).width).toBeCloseTo(26, 4);
    expect(extent(flat).depth).toBeCloseTo(26, 4);
    expect(flat.filter((corner) => Math.abs(corner.x - 13) < 1e-4)).toHaveLength(2);
    expect(flat.filter((corner) => Math.abs(corner.z - 13) < 1e-4)).toHaveLength(2);
    // Its corners lie further out: 26 across flats is 28.14 across corners.
    flat.forEach((corner) => expect(Math.hypot(corner.x, corner.z)).toBeCloseTo(13 / Math.cos(Math.PI / 8), 4));
  });

  it("swaps a hexagon's flats and corners, and fills the frame for every number of sides", () => {
    const pointed = regularPolygonAspect(6);
    const flat = regularPolygonAspect(6, polygonFlatAngle(6, true));
    expect(flat.width).toBeCloseTo(pointed.depth, 12);
    expect(flat.depth).toBeCloseTo(pointed.width, 12);
    for (let sides = 3; sides <= 24; sides += 1) {
      const corners = floorCorners(polygon({ sides, width: 30, depth: 18, polygonFlat: true }));
      expect(corners).toHaveLength(sides);
      expect(extent(corners).width).toBeCloseTo(30, 4);
      expect(extent(corners).depth).toBeCloseTo(18, 4);
      // A flat side in front: the two foremost corners stand at the same depth.
      expect(corners.filter((corner) => Math.abs(corner.z - 9) < 1e-4)).toHaveLength(2);
    }
  });

  it("is the same body in the view, in the mesh and as the exact outline", () => {
    [3, 5, 6, 8, 12].forEach((sides) => {
      [[26, 26], [40, 22]].forEach(([width, depth]) => {
        const source = polygon({ sides, width, depth, polygonFlat: true });
        const outline = polygonProfileLoops(width, depth, sides, 0, true)[0].segments.map((segment) => ({ x: segment.x, z: segment.z }));
        const key = (point: { x: number; z: number }) => `${(Math.round(point.x * 1e4) + 0) / 1e4}/${(Math.round(point.z * 1e4) + 0) / 1e4}`;
        expect(outline.map(key).sort()).toEqual(floorCorners(source).map(key).sort());
        expect(polygonCorners(width, depth, sides, true).map((corner) => key({ x: corner.x, z: corner.y })).sort()).toEqual(outline.map(key).sort());
        const prism = createPrismGeometry(width, 10, depth, sides, 1, 0, polygonFlatAngle(sides, true));
        prism.computeBoundingBox();
        expect(prism.boundingBox!.max.x - prism.boundingBox!.min.x).toBeCloseTo(width, 4);
        expect(prism.boundingBox!.max.z - prism.boundingBox!.min.z).toBeCloseTo(depth, 4);
      });
    });
    expect(cadModifierProfileForShape(polygon({ polygonFlat: true }))).not.toEqual(cadModifierProfileForShape(polygon()));
  });

  it("keeps the middle of an odd polygon for Align", () => {
    // A pentagon's middle is not the middle of its frame (#268); turned by half a side it lies on the other side.
    const pointed = alignNaturalCenter(polygon({ sides: 5 }));
    const flat = alignNaturalCenter(polygon({ sides: 5, polygonFlat: true }));
    expect(pointed).not.toBeNull();
    expect(flat).not.toBeNull();
    expect(flat!.z - 0).toBeCloseTo(-(pointed!.z - 0), 6);
    expect(Math.abs(flat!.z)).toBeGreaterThan(0.5);
  });
});

describe("rounded corners and the nut pocket with a flat side in front", () => {
  it("rounds the turned corners and moves the dot along the front side", () => {
    expect(maxPolygonCornerRadius(26, 26, 8, true)).toBeGreaterThan(maxPolygonCornerRadius(26, 26, 8));
    // A square with a flat side in front is a plain square: the dot sits on its front side, right of the middle.
    const { point, gain } = polygonCornerDot(20, 20, 4, 2, true);
    expect(point.y).toBeCloseTo(10, 6);
    expect(point.x).toBeCloseTo(8, 6);
    expect(gain).toBeCloseTo(-1, 6);
    // A pull towards the middle makes the rounding larger.
    expect(polygonCornerDragPatch({ ...polygon({ sides: 4, width: 20, depth: 20, cornerFillet: 2, polygonFlat: true }) }, -1).cornerFillet).toBeCloseTo(3, 6);
    const rounded = floorCorners(polygon({ cornerFillet: 3, polygonFlat: true }));
    expect(extent(rounded).width).toBeCloseTo(26, 3);
    expect(rounded.length).toBeGreaterThan(8);
  });

  it("gives the pocket of a nut with its width across flats along the depth", () => {
    const pointed = nutPocketFields("M5");
    const flat = nutPocketFields("M5", true);
    expect(pointed.width).toBeCloseTo(8.4, 9);
    expect(flat.depth).toBeCloseTo(8.4, 9);
    expect(flat.width).toBeCloseTo(pointed.depth, 9);
    expect(nutPocketSizeFor(6, flat.width, flat.depth, flat.height, true)).toBe("M5");
    expect(nutPocketSizeFor(6, flat.width, flat.depth, flat.height)).toBeNull();
    // The hexagon the pocket is: regular, 8.4 between its flats in front and behind.
    const corners = floorCorners(polygon({ sides: 6, width: flat.width, depth: flat.depth, polygonFlat: true }));
    const side = Math.hypot(corners[0].x, corners[0].z);
    corners.forEach((corner) => expect(Math.hypot(corner.x, corner.z)).toBeCloseTo(side, 4));
  });
});

describe("the setting in the view, in a new shape and in a saved design", () => {
  it("is built again when it changes, and counts as a change", () => {
    expect(shapeGeometrySignature(polygon({ polygonFlat: true }))).not.toBe(shapeGeometrySignature(polygon()));
    expect(shapeGeometrySignature(polygon({ polygonFlat: true, cornerFillet: 2 }))).not.toBe(shapeGeometrySignature(polygon({ cornerFillet: 2 })));
    expect(workplaneShapesEqual(polygon({ polygonFlat: true }), polygon())).toBe(false);
    expect(workplaneShapesEqual(polygon({ polygonFlat: false }), polygon())).toBe(true);
    // Without the setting nothing changes: the body a design from before has.
    expect(meshForShape(polygon({ polygonFlat: false }))).toEqual(meshForShape(polygon()));
  });

  it("reaches a shape made through the AI bridge and one saved as default, regular from the start", () => {
    const asset = toolbarShapeAssets.find((entry) => entry.kind === "polygon")!;
    const settings = normalizeShapeCustomizations({ polygon: { polygonFlat: true, sides: 8 } }).polygon ?? {};
    const made = makeShapeFromAsset(asset, { x: 0, z: 0 }, settings);
    expect(made.polygonFlat).toBe(true);
    expect(made.width).toBeCloseTo(made.depth ?? 0, 9);
    const hexagon = makeShapeFromAsset(asset, { x: 0, z: 0 }, { polygonFlat: true });
    expect(hexagon.width).toBeCloseTo(20, 9);
    expect(hexagon.depth).toBeCloseTo(20 * Math.cos(Math.PI / 6), 9);
    expect(makeShapeFromAsset(asset, { x: 0, z: 0 }, {})).not.toHaveProperty("polygonFlat", true);
    expect(makeShapeFromAsset(asset, { x: 0, z: 0 }, {}).polygonFlat).toBeUndefined();
    expect(shapeDefaultsFromShape(polygon({ polygonFlat: true }))).toMatchObject({ polygonFlat: true });
    expect(MCP_SHAPE_SETTING_KEYS).toContain("polygonFlat");
  });

  it("keeps it through a saved design, and a design without it opens with a corner in front", async () => {
    const flat = { ...polygon({ polygonFlat: true }), id: "flat" };
    const plain = { ...polygon(), id: "plain" };
    const project = (list: WorkplaneShape[]) => exportLylProject({
      projectId: "flat", projectName: "Flat side in front", createdAt: 1_700_000_000_000, modifiedAt: 1_700_000_100_000,
      shapes: list, history: [editorHistoryEntry(list, [])], historyIndex: 0, assets: [],
      workspace: DEFAULT_WORKPLANE_WORKSPACE, snapGrid: DEFAULT_SNAP_GRID, placementElevation: 0,
    });
    const restored = new Map((await importLylProject(await project([flat, plain]))).shapes.map((entry) => [entry.id, entry]));
    expect(restored.get("flat")?.polygonFlat).toBe(true);
    expect(restored.get("plain")).not.toHaveProperty("polygonFlat");
    expect(meshForShape(restored.get("flat")!)).toEqual(meshForShape(flat));
    const broken = [{ ...flat, polygonFlat: "yes" }] as unknown as WorkplaneShape[];
    await expect(importLylProject(await project(broken))).rejects.toThrow(/polygonFlat/);
  });
});
