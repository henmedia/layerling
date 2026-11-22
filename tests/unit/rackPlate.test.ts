import { describe, expect, it } from "vitest";
import { editorHistoryEntry } from "@/lib/editorHistory";
import { importLylProject, exportLylProject } from "@/lib/lylProject";
import {
  DEFAULT_RACK_PLATE,
  RACK_PLATE_SLEEVE_DEPTH,
  RACK_PLATE_SLEEVE_INNER,
  RACK_PLATE_SLEEVE_OUTER,
  normalizeRackPlateSettings,
  rackPlateLayout,
  rackPlateMaxOffset,
  rackPlateMaxUnits,
  rackPlateSettingsEqual,
  rackPlateSleeveLength,
  type RackPlateBox,
} from "@/lib/rackPlate";
import { displayShapeName, libraryShapeAssets, makeShapeFromAsset, rackPlateAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { SHAPE_LIBRARY_SECTIONS } from "@/lib/shapeLibrarySections";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import { canonicalizeShape, workplaneShapesEqual } from "@/lib/workplaneShapes";
import type { RackPlateSettings, WorkplaneShape } from "@/types/layerling";

const settings = (patch: Partial<RackPlateSettings> = {}): RackPlateSettings => ({ ...DEFAULT_RACK_PLATE, ...patch });

function plateBody(id: string, rackPlate: RackPlateSettings = settings()): WorkplaneShape {
  const box = makeShapeFromAsset(toolbarShapeAssets.find((asset) => asset.id === "box")!);
  return canonicalizeShape({ ...box, id, name: "Rack plate", rackPlate });
}

function exported(shapes: WorkplaneShape[]) {
  return exportLylProject({
    projectId: "rack",
    projectName: "Rack",
    createdAt: 1_700_000_000_000,
    modifiedAt: 1_700_000_100_000,
    shapes,
    history: [editorHistoryEntry(shapes, [])],
    historyIndex: 0,
    assets: [],
    workspace: DEFAULT_WORKPLANE_WORKSPACE,
    snapGrid: DEFAULT_SNAP_GRID,
    placementElevation: 0,
  });
}

const minX = (box: RackPlateBox) => box.x - box.sizeX / 2;
const maxX = (box: RackPlateBox) => box.x + box.sizeX / 2;

describe("rack plate sleeve measures", () => {
  it("follow HomeRacker: 15.2 mm inside, 15.1 mm deep, 19.2 mm outside, n x 15 - 0.2 mm long", () => {
    expect(RACK_PLATE_SLEEVE_INNER).toBeCloseTo(15.2);
    expect(RACK_PLATE_SLEEVE_DEPTH).toBeCloseTo(15.1);
    expect(RACK_PLATE_SLEEVE_OUTER).toBeCloseTo(19.2);
    expect(rackPlateSleeveLength(5)).toBeCloseTo(74.8);
  });
});

describe("rack plate settings", () => {
  it("are read safely", () => {
    expect(normalizeRackPlateSettings(null)).toBeNull();
    expect(normalizeRackPlateSettings("plate")).toBeNull();
    expect(normalizeRackPlateSettings({})).toEqual(DEFAULT_RACK_PLATE);
    const odd = normalizeRackPlateSettings({ width: 5, depth: 9999, thickness: 0.2, sleeveAlong: "up", sleeveUnits: 2.6, holeClearance: 5, cornerRadius: -1 })!;
    expect(odd.width).toBe(20);
    expect(odd.depth).toBe(300);
    expect(odd.thickness).toBe(1.6);
    expect(odd.sleeveAlong).toBe("depth");
    expect(odd.sleeveUnits).toBe(3);
    expect(odd.holeClearance).toBe(1);
    expect(odd.cornerRadius).toBe(0);
  });

  it("keep the sleeve on the plate: no longer than the side it runs along, no further off the middle than fits", () => {
    expect(rackPlateMaxUnits(60)).toBe(4);
    expect(rackPlateMaxUnits(59.7)).toBe(3);
    expect(normalizeRackPlateSettings(settings({ depth: 40, sleeveUnits: 5 }))!.sleeveUnits).toBe(2);
    expect(normalizeRackPlateSettings(settings({ width: 40, sleeveAlong: "width", sleeveUnits: 5 }))!.sleeveUnits).toBe(2);
    expect(rackPlateMaxOffset(80, 60, "depth")).toBeCloseTo(30.4);
    expect(normalizeRackPlateSettings(settings({ width: 80, sleeveOffset: 100 }))!.sleeveOffset).toBeCloseTo(30.4);
    expect(normalizeRackPlateSettings(settings({ width: 80, sleeveOffset: -100 }))!.sleeveOffset).toBeCloseTo(-30.4);
  });

  it("tell plates apart", () => {
    expect(rackPlateSettingsEqual(settings(), settings())).toBe(true);
    expect(rackPlateSettingsEqual(settings(), settings({ width: 81 }))).toBe(false);
    expect(rackPlateSettingsEqual(undefined, undefined)).toBe(true);
    expect(rackPlateSettingsEqual(settings(), undefined)).toBe(false);
  });
});

describe("rack plate layout", () => {
  it("stands two 2 mm walls on the plate, 15.2 mm apart inside, 15.1 mm high above it", () => {
    const layout = rackPlateLayout(settings({ thickness: 3, sleeveUnits: 3 }));
    expect(layout.walls).toHaveLength(2);
    const [left, right] = [...layout.walls].sort((a, b) => a.x - b.x);
    expect(minX(right) - maxX(left)).toBeCloseTo(15.2);
    expect(maxX(right) - minX(left)).toBeCloseTo(19.2);
    for (const wall of layout.walls) {
      expect(wall.sizeX).toBeCloseTo(2);
      expect(wall.sizeY).toBeCloseTo(44.8);
      expect(wall.z + wall.sizeZ).toBeCloseTo(3 + 15.1);
      // Reaching a little into the plate, so the two are one body.
      expect(wall.z).toBeLessThan(3);
    }
    expect(layout.height).toBeCloseTo(18.1);
  });

  it("puts a 4 mm lock pin hole per unit through both walls, 15 mm apart about the middle, halfway up the support", () => {
    const layout = rackPlateLayout(settings({ thickness: 3, sleeveUnits: 3 }));
    expect(layout.pinHoles.map((hole) => hole.y)).toEqual([-15, 0, 15]);
    for (const hole of layout.pinHoles) {
      expect(hole.sizeY).toBeCloseTo(4);
      expect(hole.sizeZ).toBeCloseTo(4);
      expect(hole.z + hole.sizeZ / 2).toBeCloseTo(3 + 15.1 / 2);
      expect(hole.sizeX).toBeGreaterThan(19.2);
    }
    expect(rackPlateLayout(settings({ holeClearance: 0.2 })).pinHoles[0].sizeY).toBeCloseTo(4.2);
  });

  it("turns the sleeve along the width and moves it off the middle", () => {
    const layout = rackPlateLayout(settings({ sleeveAlong: "width", sleeveUnits: 2, sleeveOffset: 10 }));
    for (const wall of layout.walls) expect(wall.sizeX).toBeCloseTo(29.8);
    expect(layout.walls.map((wall) => wall.y).sort((a, b) => a - b)).toEqual([10 - 8.6, 10 + 8.6].map((value) => expect.closeTo(value)));
    expect(layout.pinHoles.map((hole) => hole.x)).toEqual([-7.5, 7.5]);
  });

  it("drills a screw hole in each corner the sleeve leaves free", () => {
    expect(rackPlateLayout(settings()).screwHoles).toHaveLength(0);
    const layout = rackPlateLayout(settings({ width: 80, depth: 60, screwHoles: true, screwInset: 6 }));
    expect(layout.screwHoles).toEqual([{ x: -34, y: -24 }, { x: 34, y: -24 }, { x: -34, y: 24 }, { x: 34, y: 24 }]);
    // A narrow plate whose sleeve covers the corners keeps none there.
    expect(rackPlateLayout(settings({ width: 24, depth: 60, sleeveUnits: 4, screwHoles: true, screwInset: 3 })).screwHoles).toHaveLength(0);
    // A short sleeve in the middle leaves the corners beyond its ends free.
    expect(rackPlateLayout(settings({ width: 24, depth: 60, sleeveUnits: 3, screwHoles: true, screwInset: 3 })).screwHoles).toHaveLength(4);
  });
});

describe("rack plate in the library", () => {
  it("is in the systems section and the library, after the SBC board", () => {
    expect(SHAPE_LIBRARY_SECTIONS.find((section) => section.id === "systems")!.shapes).toContain("rackPlate");
    const ids = libraryShapeAssets.map((asset) => asset.id);
    expect(ids.indexOf("rackPlate")).toBe(ids.indexOf("sbcBoard") + 1);
    expect(rackPlateAsset.src).toMatch(/rackPlate\.svg$/);
  });

  it("shows its name in the interface language", () => {
    expect(displayShapeName(plateBody("p"))).toBe("Rack plate");
  });

  it("keeps its settings through saving and loading", async () => {
    const plate = plateBody("plate", settings({ width: 120, sleeveUnits: 4, screwHoles: true, sleeveOffset: -5 }));
    const plain = canonicalizeShape({ ...plateBody("plain"), rackPlate: undefined });
    const restored = await importLylProject(await exported([plate, plain]));
    const byId = new Map(restored.shapes.map((shape) => [shape.id, shape]));
    expect(byId.get("plate")!.rackPlate).toEqual(plate.rackPlate);
    expect(workplaneShapesEqual(byId.get("plate")!, plate)).toBe(true);
    expect(byId.get("plain")!.rackPlate).toBeUndefined();
  });
});
