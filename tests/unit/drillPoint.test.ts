import manifoldModule from "manifold-3d";
import { beforeAll, describe, expect, it } from "vitest";
import { DEFAULT_DRILL_POINT_ANGLE, drillPointLength, normalizeDrillPointAngle, shapeDrillPointAngle, shapeDrillPointLength, shapeTakesDrillPoint } from "@/lib/drillPoint";
import { createScrewHoleGeometry, screwHoleProfile } from "@/lib/screwHoleGeometry";
import { meshForShape } from "@/lib/editorMeshCore";
import { cadModifierPrimitiveForAnalyticShape } from "@/lib/cadBakeMetadata";
import { cadModifierProfileForShape } from "@/lib/cadProfileExtrusion";
import { stepSourceForShape, worldAabb } from "@/lib/stepExport";
import { buildGroupedShapeFromSelection, shapeToManifoldSolid } from "@/lib/editorBooleans";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";
import { shapeGeometrySignature } from "@/components/workplane/viewportShapeObjects";
import { analyzeTriangleSoup } from "@/lib/svgImport";
import { makeShapeFromAsset, sceneShape, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { shapeDefaultsFromShape } from "@/lib/shapeDefaults";
import { editorHistoryEntry } from "@/lib/editorHistory";
import { exportLylProject, importLylProject } from "@/lib/lylProject";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE, normalizeShapeCustomizations } from "@/lib/workplaneSettings";
import { workplaneShapesEqual } from "@/lib/workplaneShapes";
import { SHAPE_KEYWORDS } from "@/lib/commandKeywords";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * The drill point (Discussion #621): a blind hole that ends in the cone a drill's tip leaves, below the depth, as a
 * drawing measures it. The mesh, the exact section and the cut must all put the tip in the same place.
 */

let kernel: Awaited<ReturnType<typeof manifoldModule>>;

beforeAll(async () => {
  kernel = await manifoldModule();
  kernel.setup();
  rememberManifoldRuntime(kernel);
});

function shape(kind: WorkplaneShape["kind"], extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return { id: `test-${kind}`, name: kind, kind, color: "#888888", x: 0, z: 0, elevation: 0, size: 6, width: 6, depth: 6, height: 10, rotation: 0, ...extra } as WorkplaneShape;
}

const hole = (extra: Partial<WorkplaneShape> = {}) => shape("cylinder", { hole: true, sides: 96, ...extra });

function soup(source: WorkplaneShape) {
  const mesh = meshForShape(source);
  return analyzeTriangleSoup(mesh.faces.flatMap((face) => face.flatMap((index) => mesh.vertices[index])));
}

function lowest(source: WorkplaneShape) {
  return meshForShape(source).vertices.reduce((low, vertex) => (vertex[1] < low[1] ? vertex : low));
}

/** The area of the 96-cornered outline the mesh draws a circle of this radius with. */
const polygonArea = (radius: number, corners = 96) => (corners / 2) * radius * radius * Math.sin((2 * Math.PI) / corners);

describe("the drill point's angle and tip", () => {
  it("keeps the angle between 60 and 150 degrees, and none or 0 is a flat bottom", () => {
    expect(normalizeDrillPointAngle(undefined)).toBeUndefined();
    expect(normalizeDrillPointAngle(0)).toBeUndefined();
    expect(normalizeDrillPointAngle(-5)).toBeUndefined();
    expect(normalizeDrillPointAngle(Number.NaN)).toBeUndefined();
    expect(normalizeDrillPointAngle(118)).toBe(118);
    expect(normalizeDrillPointAngle(20)).toBe(60);
    expect(normalizeDrillPointAngle(179)).toBe(150);
    expect(DEFAULT_DRILL_POINT_ANGLE).toBe(118);
  });

  it.each([
    [90, 3],
    [118, 3 / Math.tan((59 * Math.PI) / 180)],
    [135, 3 * Math.tan((22.5 * Math.PI) / 180)],
  ])("reaches half the diameter over the tangent of half of %s degrees past the shoulder", (angle, tip) => {
    expect(drillPointLength(6, angle)).toBeCloseTo(tip, 9);
    // 0.3 diameters at 118 degrees, as a drawing reckons it.
    if (angle === 118) expect(tip / 6).toBeCloseTo(0.3, 2);
  });

  it("is taken by a cylinder, counterbore and countersink while they are holes, and by nothing else", () => {
    expect(shapeTakesDrillPoint(hole())).toBe(true);
    expect(shapeTakesDrillPoint(shape("counterbore", { hole: true }))).toBe(true);
    expect(shapeTakesDrillPoint(shape("countersink", { hole: true }))).toBe(true);
    // A solid, the double countersink that goes through, other kinds, a tapered or a twisted cylinder: a flat end.
    expect(shapeTakesDrillPoint(shape("cylinder"))).toBe(false);
    expect(shapeTakesDrillPoint(shape("doubleCountersink", { hole: true }))).toBe(false);
    expect(shapeTakesDrillPoint(shape("ellipse", { hole: true }))).toBe(false);
    expect(shapeTakesDrillPoint(shape("box", { hole: true }))).toBe(false);
    expect(shapeTakesDrillPoint(hole({ taperTopWidth: 3, taperTopDepth: 3 }))).toBe(false);
    expect(shapeTakesDrillPoint(hole({ extrudeTwist: 30 }))).toBe(false);
    expect(shapeDrillPointAngle(shape("cylinder", { drillPointAngle: 118 }))).toBeUndefined();
    expect(shapeDrillPointAngle(hole({ drillPointAngle: 118 }))).toBe(118);
    expect(shapeDrillPointAngle(hole({ drillPointAngle: 0 }))).toBeUndefined();
  });
});

describe("a cylinder set as a hole with a drill point", () => {
  it.each([90, 118, 135])("ends %s degrees deep below its height, closed and as big as its cylinder and cone", (angle) => {
    const drilled = hole({ x: 4, z: -2, elevation: 5, drillPointAngle: angle });
    const tip = drillPointLength(6, angle);
    expect(shapeDrillPointLength(drilled)).toBeCloseTo(tip, 9);
    const measured = soup(drilled);
    expect(measured.boundaryEdges).toBe(0);
    expect(measured.nonManifoldEdges).toBe(0);
    const area = polygonArea(3);
    expect(measured.volume).toBeCloseTo(area * 10 + (area * tip) / 3, 4);
    // The height counts to the shoulder, the tip lies below it on the axis.
    const [x, y, z] = lowest(drilled);
    expect(y).toBeCloseTo(5 - tip, 5);
    expect(x).toBeCloseTo(4, 5);
    expect(z).toBeCloseTo(-2, 5);
    expect(Math.max(...meshForShape(drilled).vertices.map((vertex) => vertex[1]))).toBeCloseTo(15, 5);
  });

  it("finds its bottom at a height 32-bit floats cannot hold exactly, as a cut's padding makes it", () => {
    const tip = drillPointLength(6.002, 118);
    expect(lowest(hole({ width: 6.002, depth: 6.002, height: 10.002, elevation: 10.999, drillPointAngle: 118 }))[1]).toBeCloseTo(10.999 - tip, 4);
  });

  it("keeps a flat bottom, vertex for vertex, when it is solid, flat or has no setting", () => {
    const plain = meshForShape(hole());
    expect(meshForShape(hole({ drillPointAngle: 0 }))).toEqual(plain);
    expect(meshForShape(shape("cylinder", { sides: 96, drillPointAngle: 118 }))).toEqual(meshForShape(shape("cylinder", { sides: 96 })));
    expect(lowest(hole())[1]).toBeCloseTo(0, 9);
  });

  it("keeps a hexagon's corners and points it in the middle", () => {
    const drilled = hole({ sides: 6, drillPointAngle: 90 });
    const flat = meshForShape(hole({ sides: 6 }));
    const corners = (vertices: Array<readonly number[]>) => vertices.filter((vertex) => vertex[1] > 9.99).map((vertex) => vertex.map((value) => value.toFixed(6)).join()).sort();
    expect(corners(meshForShape(drilled).vertices)).toEqual(corners(flat.vertices));
    expect(soup(drilled).boundaryEdges).toBe(0);
    expect(lowest(drilled)[1]).toBeCloseTo(-3, 5);
  });

  it("is drawn at its size, so a new height or diameter builds it again", () => {
    const plain = shapeGeometrySignature(hole());
    const drilled = shapeGeometrySignature(hole({ drillPointAngle: 118 }));
    expect(drilled).not.toBe(plain);
    expect(shapeGeometrySignature(hole({ drillPointAngle: 118, height: 12 }))).not.toBe(drilled);
    expect(shapeGeometrySignature(hole({ drillPointAngle: 135 }))).not.toBe(drilled);
    // A flat cylinder stays the unit body it always was, whatever its height.
    expect(shapeGeometrySignature(hole({ height: 12 }))).toBe(plain);
    expect(shapeGeometrySignature(shape("cylinder", { sides: 96, drillPointAngle: 118 }))).toBe(shapeGeometrySignature(shape("cylinder", { sides: 96 })));
  });

  it("is no analytic cylinder for the edge tool or STEP but a turned section, from the tip on the axis", () => {
    expect(cadModifierPrimitiveForAnalyticShape(hole())).toMatchObject({ kind: "cylinder" });
    expect(cadModifierPrimitiveForAnalyticShape(hole({ drillPointAngle: 118 }))).toBeNull();
    const part = cadModifierProfileForShape(hole({ drillPointAngle: 90 }));
    expect(part?.kind).toBe("revolution");
    const loop = part!.loops[0];
    expect(loop.x).toBe(0);
    expect(loop.z).toBeCloseTo(-3, 9);
    const corners = loop.segments.map((segment) => (segment.kind === "line" ? [segment.x, segment.z] : [Number.NaN, Number.NaN]));
    [[3, 0], [3, 10], [0, 10], [0, -3]].forEach((corner, index) => {
      expect(corners[index][0]).toBeCloseTo(corner[0], 9);
      expect(corners[index][1]).toBeCloseTo(corner[1], 9);
    });
    // Drawn with few corners it keeps its mesh, a pyramid's flat faces.
    expect(cadModifierProfileForShape(hole({ sides: 6, drillPointAngle: 90 }))).toBeNull();
    expect(stepSourceForShape(hole())).toBe("primitive");
    expect(stepSourceForShape(hole({ drillPointAngle: 118 }))).toBe("profile");
  });

  it("reaches down by its tip when STEP asks which bodies it cuts", () => {
    const tip = drillPointLength(6, 118);
    const box = worldAabb(hole({ elevation: 5, drillPointAngle: 118 }));
    expect(box.min[1]).toBeCloseTo(5 - tip, 9);
    expect(box.max[1]).toBeCloseTo(15, 9);
    expect(worldAabb(hole({ elevation: 5 })).min[1]).toBeCloseTo(5, 9);
    expect(worldAabb(hole({ elevation: 5, mirrorY: true, drillPointAngle: 118 })).max[1]).toBeCloseTo(15 + tip, 9);
  });

  it("goes to the kernel as its mesh, cone and all, not as the kernel's own cylinder", () => {
    const created: Parameters<typeof shapeToManifoldSolid>[2] = [];
    const area = polygonArea(3);
    const tip = drillPointLength(6, 118);
    const drilled = shapeToManifoldSolid(kernel, hole({ elevation: 11, drillPointAngle: 118 }), created, true);
    expect(drilled?.volume()).toBeCloseTo(area * 10 + (area * tip) / 3, 3);
    expect(drilled?.boundingBox().min[1]).toBeCloseTo(11 - tip, 4);
    expect(shapeToManifoldSolid(kernel, hole({ elevation: 11 }), created, true)?.volume()).toBeCloseTo(area * 10, 3);
    created.forEach((solid) => solid.delete());
  });

  it("cuts its cone into a block, the tip as deep as it is drawn", async () => {
    const block = shape("box", { id: "block", width: 20, depth: 20, height: 20, size: 20 });
    // Its top a millimetre above the block: 9 mm deep to the shoulder, the tip below.
    const drilled = hole({ id: "drill", elevation: 11, drillPointAngle: 118 });
    const tip = drillPointLength(6, 118);
    const result = await buildGroupedShapeFromSelection([block, drilled], 200_000);
    const mesh = result.group?.importedMesh;
    expect(mesh).toBeTruthy();
    const positions = Array.from(mesh!.positions);
    // A cutter stands out a thousandth on every side, so one flush with a face leaves no skin (paddedCutterShape).
    const area = polygonArea(3.001);
    expect(analyzeTriangleSoup(positions).volume).toBeCloseTo(8000 - area * 9.001 - (area * drillPointLength(6.002, 118)) / 3, 2);
    // The lowest point on the axis: the tip, inside the block. The group's mesh stands on 0 round its middle.
    let deepest = Infinity;
    for (let offset = 0; offset < positions.length; offset += 3) {
      if (Math.hypot(positions[offset], positions[offset + 2]) < 0.01 && positions[offset + 1] > 0.5) deepest = Math.min(deepest, positions[offset + 1]);
    }
    expect(deepest).toBeCloseTo(10.999 - drillPointLength(6.002, 118), 4);
    expect(deepest).toBeCloseTo(11 - tip, 2);
  });
});

describe("a part the drill point swallows", () => {
  it("is cut away whole, as a part inside the hole's wall is", async () => {
    // A small block in the cone, between 0.1 and 0.6 mm below the shoulder at 10: inside the tip, outside the frame.
    const crumb = shape("box", { id: "crumb", width: 1, depth: 1, size: 1, height: 0.5, elevation: 9.4 });
    const result = await buildGroupedShapeFromSelection([crumb, hole({ id: "drill", elevation: 10, drillPointAngle: 118 })], 200_000);
    expect(result.group).toBeNull();
    expect(result.consumed).toBe(true);
    // Flat, the hole ends above it and leaves it be.
    expect((await buildGroupedShapeFromSelection([crumb, hole({ id: "drill", elevation: 10 })], 200_000)).consumed).toBe(false);
  });
});

describe("counterbore and countersink with a drill point", () => {
  it.each(["counterbore", "countersink"] as const)("puts the %s's tip below its shaft and leaves the rest as it was", (kind) => {
    const fields = { kind, width: 6.6, height: 10, screwHoleShaft: 3.4, screwHoleHeadDepth: 3.2, screwHoleAngle: 90 };
    const flat = screwHoleProfile(fields);
    const drilled = screwHoleProfile({ ...fields, drillPointAngle: 118 });
    expect(drilled.slice(1)).toEqual(flat);
    expect(drilled[0].r).toBe(0);
    expect(drilled[0].y).toBeCloseTo(-drillPointLength(3.4, 118), 9);
    // The double countersink goes through: it takes none.
    expect(screwHoleProfile({ ...fields, kind: "doubleCountersink", drillPointAngle: 118 })).toEqual(screwHoleProfile({ ...fields, kind: "doubleCountersink" }));
  });

  it.each([90, 118, 135])("builds a closed countersink whose cone adds a third of the shaft's cylinder at %s degrees", (angle) => {
    const options = { kind: "countersink" as const, width: 6.6, depth: 6.6, height: 8, screwHoleShaft: 3.4, screwHoleAngle: 90 };
    const volume = (geometry: ReturnType<typeof createScrewHoleGeometry>) => {
      const position = geometry.getAttribute("position");
      const positions: number[] = [];
      for (let index = 0; index < position.count; index += 1) positions.push(position.getX(index), position.getY(index), position.getZ(index));
      return analyzeTriangleSoup(positions);
    };
    const flat = volume(createScrewHoleGeometry(options));
    const geometry = createScrewHoleGeometry({ ...options, drillPointAngle: angle });
    const drilled = volume(geometry);
    expect(drilled.boundaryEdges).toBe(0);
    expect(drilled.nonManifoldEdges).toBe(0);
    const tip = drillPointLength(3.4, angle);
    expect(drilled.volume - flat.volume).toBeCloseTo((polygonArea(1.7, 48) * tip) / 3, 6);
    expect(geometry.boundingBox?.min.y).toBeCloseTo(-tip, 6);
    expect(geometry.boundingBox?.max.y).toBeCloseTo(8, 6);
    // Set down on the plate, it would stand on its tip: it keeps its height instead.
    expect(geometry.userData.keepsItsHeight).toBe(true);
    expect(createScrewHoleGeometry(options).userData.keepsItsHeight).toBeUndefined();
  });

  it("follows the shape's place, and only while it is a hole", () => {
    const counterbore = shape("counterbore", { hole: true, width: 6.4, depth: 6.4, height: 12, screwHoleShaft: 3.4, screwHoleHeadDepth: 3.2, elevation: 2, drillPointAngle: 90 });
    expect(lowest(counterbore)[1]).toBeCloseTo(2 - 1.7, 5);
    expect(soup(counterbore).boundaryEdges).toBe(0);
    expect(lowest({ ...counterbore, hole: false })[1]).toBeCloseTo(2, 5);
    const part = cadModifierProfileForShape(counterbore);
    expect(part?.kind).toBe("revolution");
    // The section starts at the tip and goes straight to the shaft, without an edge of no length on the axis.
    expect([part!.loops[0].x, part!.loops[0].z]).toEqual([0, expect.closeTo(-1.7, 9)]);
    expect(part!.loops[0].segments[0]).toMatchObject({ kind: "line", x: expect.closeTo(1.7, 9), z: expect.closeTo(0, 9) });
  });
});

describe("the drill point in the catalogue, the saved defaults and a saved design", () => {
  const asset = (kind: WorkplaneShape["kind"]) => toolbarShapeAssets.find((entry) => entry.kind === kind)!;

  it("starts with a flat bottom, and takes one from the saved defaults", () => {
    for (const kind of ["cylinder", "counterbore", "countersink"] as const) {
      expect(makeShapeFromAsset(asset(kind)).drillPointAngle).toBeUndefined();
      expect(makeShapeFromAsset(asset(kind), undefined, { drillPointAngle: 135 }).drillPointAngle).toBe(135);
      expect(makeShapeFromAsset(asset(kind), undefined, { drillPointAngle: 0 }).drillPointAngle).toBeUndefined();
    }
    expect(makeShapeFromAsset(asset("box"), undefined, { drillPointAngle: 135 }).drillPointAngle).toBeUndefined();
    // The defaults clamp it, keep 0 so a command can switch it off again, and leave it out of kinds without a bottom.
    const normalized = normalizeShapeCustomizations({ countersink: { drillPointAngle: 200 }, cylinder: { drillPointAngle: 0 }, box: { drillPointAngle: 118 } });
    expect(normalized.countersink?.drillPointAngle).toBe(150);
    expect(normalized.cylinder?.drillPointAngle).toBe(0);
    expect(normalized.box?.drillPointAngle).toBeUndefined();
    const saved = shapeDefaultsFromShape({ ...makeShapeFromAsset(asset("counterbore")), drillPointAngle: 118 });
    expect(saved?.drillPointAngle).toBe(118);
    expect(sceneShape({ name: "Hole", kind: "cylinder", color: "#888888", hole: true, drillPointAngle: 90 }).drillPointAngle).toBe(90);
    // A changed angle is a change of the design, which undo and the history see.
    expect(workplaneShapesEqual(hole(), hole({ drillPointAngle: 118 }))).toBe(false);
    expect(workplaneShapesEqual(hole({ drillPointAngle: 118 }), hole({ drillPointAngle: 118 }))).toBe(true);
    // The command search finds the shapes that take one by the word.
    for (const kind of ["cylinder", "counterbore", "countersink"]) expect(SHAPE_KEYWORDS[kind]).toContain("drill point");
    expect(SHAPE_KEYWORDS.cylinder).toContain("sackloch");
  });

  it("keeps it through a saved design, and a design without one opens flat", async () => {
    const drilled = { ...hole({ drillPointAngle: 118 }), id: "drilled" };
    const countersink = { ...shape("countersink", { hole: true, drillPointAngle: 135 }), id: "countersink" };
    const plain = { ...hole(), id: "plain" };
    const shapes = [drilled, countersink, plain];
    const project = (list: WorkplaneShape[]) => exportLylProject({
      projectId: "drill", projectName: "Drill point", createdAt: 1_700_000_000_000, modifiedAt: 1_700_000_100_000,
      shapes: list, history: [editorHistoryEntry(list, [])], historyIndex: 0, assets: [],
      workspace: DEFAULT_WORKPLANE_WORKSPACE, snapGrid: DEFAULT_SNAP_GRID, placementElevation: 0,
    });
    const restored = new Map((await importLylProject(await project(shapes))).shapes.map((entry) => [entry.id, entry]));
    expect(restored.get("drilled")?.drillPointAngle).toBe(118);
    expect(restored.get("countersink")?.drillPointAngle).toBe(135);
    expect(restored.get("plain")).not.toHaveProperty("drillPointAngle");
    expect(meshForShape(restored.get("drilled")!)).toEqual(meshForShape(drilled));
    // An angle that is no number is refused, as any other nonsense in a design file.
    const broken = [{ ...drilled, drillPointAngle: "steep" }] as unknown as WorkplaneShape[];
    await expect(importLylProject(await project(broken))).rejects.toThrow(/drillPointAngle/);
  });
});
