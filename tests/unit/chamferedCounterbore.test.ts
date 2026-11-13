import { describe, expect, it } from "vitest";
import { maxScrewHoleChamfer, normalizeScrewHoleChamfer, screwHoleProfile } from "@/lib/screwHoleGeometry";
import { meshForShape } from "@/lib/editorMeshCore";
import { shapeGeometrySignature } from "@/components/workplane/viewportShapeObjects";
import { analyzeTriangleSoup } from "@/lib/svgImport";
import { editorHistoryEntry } from "@/lib/editorHistory";
import { exportLylProject, importLylProject } from "@/lib/lylProject";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE, normalizeShapeCustomizations } from "@/lib/workplaneSettings";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { workplaneShapesEqual } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * A chamfered counterbore (Discussion #1632): the rim of the pocket opens at 45 degrees, outside the head's diameter,
 * so the screw head still fits; the chamfer stays shallower than the pocket.
 */

function shape(kind: WorkplaneShape["kind"], extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return { id: `test-${kind}`, name: kind, kind, color: "#888888", x: 0, z: 0, elevation: 0, size: 6.4, width: 6.4, depth: 6.4, height: 12, rotation: 0, hole: true, screwHoleShaft: 3.4, screwHoleHeadDepth: 3.2, screwHoleChamfer: 1, sides: 96, ...extra } as WorkplaneShape;
}

function soup(source: WorkplaneShape) {
  const mesh = meshForShape(source);
  return analyzeTriangleSoup(mesh.faces.flatMap((face) => face.flatMap((index) => mesh.vertices[index])));
}

/** The area of the 96-cornered outline the mesh draws a circle of this radius with. */
const polygonArea = (radius: number, corners = 96) => (corners / 2) * radius * radius * Math.sin((2 * Math.PI) / corners);
/** A frustum between two 96-cornered outlines. */
const frustum = (r1: number, r2: number, height: number) => (height / 3) * (polygonArea(r1) + polygonArea(r2) + Math.sqrt(polygonArea(r1) * polygonArea(r2)));

const rounded = (points: Array<{ r: number; y: number }>) => points.map(({ r, y }) => [Number(r.toFixed(4)), Number(y.toFixed(4))]);

describe("the rim chamfer", () => {
  it("is 0 when left out, stays shallower than the pocket, and only the counterbore takes it", () => {
    expect(normalizeScrewHoleChamfer(undefined, 12, 3.2)).toBe(0);
    expect(normalizeScrewHoleChamfer(-1, 12, 3.2)).toBe(0);
    expect(normalizeScrewHoleChamfer(1, 12, 3.2)).toBe(1);
    expect(normalizeScrewHoleChamfer(50, 12, 3.2)).toBeCloseTo(3.1, 9);
    // The pocket is the default 3.2 deep when its depth is left out.
    expect(maxScrewHoleChamfer(12, undefined)).toBeCloseTo(3.1, 9);
    expect(maxScrewHoleChamfer(12, 3.2, "countersink")).toBe(0);
    expect(maxScrewHoleChamfer(12, 3.2, "doubleCountersink")).toBe(0);
  });

  it("opens the rim outside the head's diameter, and the length stays the whole hole", () => {
    const points = screwHoleProfile({ kind: "counterbore", width: 6.4, height: 12, screwHoleShaft: 3.4, screwHoleHeadDepth: 3.2, screwHoleChamfer: 1 });
    expect(rounded(points)).toEqual([[1.7, 0], [1.7, 8.8], [3.2, 8.8], [3.2, 11], [4.2, 12]]);
    // At 0 it is the plain counterbore, point for point.
    const plain = { kind: "counterbore" as const, width: 6.4, height: 12, screwHoleShaft: 3.4, screwHoleHeadDepth: 3.2 };
    expect(screwHoleProfile({ ...plain, screwHoleChamfer: 0 })).toEqual(screwHoleProfile(plain));
  });

  it("leaves the countersinks as they are", () => {
    const fields = { width: 6.6, height: 12, screwHoleShaft: 3.4, screwHoleAngle: 90 };
    for (const kind of ["countersink", "doubleCountersink"] as const) {
      expect(screwHoleProfile({ ...fields, kind, screwHoleChamfer: 1 })).toEqual(screwHoleProfile({ ...fields, kind }));
    }
  });

  it("keeps the drill point at the shaft's end", () => {
    const points = screwHoleProfile({ kind: "counterbore", width: 6.4, height: 12, screwHoleShaft: 3.4, screwHoleHeadDepth: 3.2, screwHoleChamfer: 1, drillPointAngle: 118 });
    expect(points[0].r).toBe(0);
    expect(points[0].y).toBeLessThan(0);
    expect(rounded(points.slice(-2))).toEqual([[3.2, 11], [4.2, 12]]);
  });
});

describe("a chamfered counterbore's mesh", () => {
  it("is closed, and holds the shaft, the pocket and the chamfer", () => {
    const chamfered = soup(shape("counterbore"));
    expect(chamfered.boundaryEdges).toBe(0);
    expect(chamfered.nonManifoldEdges).toBe(0);
    expect(chamfered.volume).toBeCloseTo(polygonArea(1.7) * 8.8 + polygonArea(3.2) * 2.2 + frustum(3.2, 4.2, 1), 2);
  });

  it("works with a slot", () => {
    const slotted = soup(shape("counterbore", { width: 14, screwHoleSlot: true }));
    expect(slotted.boundaryEdges).toBe(0);
    expect(slotted.nonManifoldEdges).toBe(0);
    expect(slotted.volume).toBeGreaterThan(soup(shape("counterbore", { width: 14, screwHoleSlot: true, screwHoleChamfer: undefined })).volume);
  });

  it("is built again when the chamfer changes, and counts as a change", () => {
    const chamfered = shape("counterbore");
    const sharp = { ...chamfered, screwHoleChamfer: undefined };
    expect(shapeGeometrySignature(chamfered)).not.toBe(shapeGeometrySignature(sharp));
    expect(workplaneShapesEqual(chamfered, sharp)).toBe(false);
    expect(workplaneShapesEqual(sharp, { ...sharp, screwHoleChamfer: 0 })).toBe(true);
  });

  it("keeps it through a saved design", async () => {
    const chamfered = { ...shape("counterbore"), id: "chamfered" };
    const project = (list: WorkplaneShape[]) => exportLylProject({
      projectId: "chamfer", projectName: "Chamfered counterbore", createdAt: 1_700_000_000_000, modifiedAt: 1_700_000_100_000,
      shapes: list, history: [editorHistoryEntry(list, [])], historyIndex: 0, assets: [],
      workspace: DEFAULT_WORKPLANE_WORKSPACE, snapGrid: DEFAULT_SNAP_GRID, placementElevation: 0,
    });
    const restored = (await importLylProject(await project([chamfered]))).shapes[0];
    expect(restored.screwHoleChamfer).toBe(1);
    expect(meshForShape(restored)).toEqual(meshForShape(chamfered));
    const broken = [{ ...chamfered, screwHoleChamfer: "wide" }] as unknown as WorkplaneShape[];
    await expect(importLylProject(await project(broken))).rejects.toThrow(/screwHoleChamfer/);
  });
});

describe("a counterbore made from its settings, as the AI bridge makes it", () => {
  const make = (kind: WorkplaneShape["kind"], params: Record<string, unknown>) => {
    const asset = toolbarShapeAssets.find((entry) => entry.kind === kind)!;
    const settings = normalizeShapeCustomizations({ [kind]: params })[kind] ?? {};
    return makeShapeFromAsset(asset, { x: 0, z: 0 }, { ...settings, width: 6.4, depth: 6.4, height: 12 });
  };

  it("keeps the chamfer, leaves it out when off, and the countersink takes none", () => {
    expect(make("counterbore", { screwHoleChamfer: 1 }).screwHoleChamfer).toBe(1);
    expect(make("counterbore", {}).screwHoleChamfer).toBeUndefined();
    expect(make("counterbore", { screwHoleChamfer: 0 }).screwHoleChamfer).toBeUndefined();
    expect(make("countersink", { screwHoleChamfer: 1 }).screwHoleChamfer).toBeUndefined();
  });
});
