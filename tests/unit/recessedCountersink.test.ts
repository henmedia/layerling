import { describe, expect, it } from "vitest";
import { maxScrewHoleRecess, normalizeScrewHoleRecess, screwHoleProfile } from "@/lib/screwHoleGeometry";
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
 * A recessed countersink (Discussion #1531): a straight pocket as wide as the head above the cone, so the screw head
 * sits below the face instead of flush with it; the double countersink has it at both ends.
 */

function shape(kind: WorkplaneShape["kind"], extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return { id: `test-${kind}`, name: kind, kind, color: "#888888", x: 0, z: 0, elevation: 0, size: 6.6, width: 6.6, depth: 6.6, height: 12, rotation: 0, hole: true, screwHoleShaft: 3.4, screwHoleAngle: 90, screwHoleRecess: 4, sides: 96, ...extra } as WorkplaneShape;
}

function soup(source: WorkplaneShape) {
  const mesh = meshForShape(source);
  return analyzeTriangleSoup(mesh.faces.flatMap((face) => face.flatMap((index) => mesh.vertices[index])));
}

/** The area of the 96-cornered outline the mesh draws a circle of this radius with. */
const polygonArea = (radius: number, corners = 96) => (corners / 2) * radius * radius * Math.sin((2 * Math.PI) / corners);
/** A frustum between two 96-cornered outlines. */
const frustum = (r1: number, r2: number, height: number) => (height / 3) * (polygonArea(r1) + polygonArea(r2) + Math.sqrt(polygonArea(r1) * polygonArea(r2)));

describe("the recess", () => {
  it("is 0 when left out, and leaves room for the cone and some shaft", () => {
    expect(normalizeScrewHoleRecess(undefined, 12)).toBe(0);
    expect(normalizeScrewHoleRecess(-2, 12)).toBe(0);
    expect(normalizeScrewHoleRecess(4, 12)).toBe(4);
    expect(normalizeScrewHoleRecess(50, 12)).toBeCloseTo(11.6, 9);
    expect(maxScrewHoleRecess(12, "doubleCountersink")).toBeCloseTo(5.8, 9);
    expect(maxScrewHoleRecess(12, "counterbore")).toBe(0);
  });

  it("puts a pocket as wide as the head above the cone, and the length still counts the whole hole", () => {
    // Shaft 3.4, head 6.6 at 90 degrees: a cone 1.6 deep, under the 4 mm pocket.
    const points = screwHoleProfile({ kind: "countersink", width: 6.6, height: 12, screwHoleShaft: 3.4, screwHoleAngle: 90, screwHoleRecess: 4 });
    expect(points.map(({ r, y }) => [Number(r.toFixed(4)), Number(y.toFixed(4))])).toEqual([[1.7, 0], [1.7, 6.4], [3.3, 8], [3.3, 12]]);
    // At 0 it is the flush countersink, point for point.
    expect(screwHoleProfile({ kind: "countersink", width: 6.6, height: 12, screwHoleShaft: 3.4, screwHoleAngle: 90, screwHoleRecess: 0 }))
      .toEqual(screwHoleProfile({ kind: "countersink", width: 6.6, height: 12, screwHoleShaft: 3.4, screwHoleAngle: 90 }));
  });

  it("sits at both ends of a double countersink", () => {
    const points = screwHoleProfile({ kind: "doubleCountersink", width: 6.6, height: 12, screwHoleShaft: 3.4, screwHoleAngle: 90, screwHoleRecess: 2 });
    expect(points.map(({ r, y }) => [Number(r.toFixed(4)), Number(y.toFixed(4))])).toEqual([[3.3, 0], [3.3, 2], [1.7, 3.6], [1.7, 8.4], [3.3, 10], [3.3, 12]]);
  });

  it("keeps the drill point at the shaft's end", () => {
    const points = screwHoleProfile({ kind: "countersink", width: 6.6, height: 12, screwHoleShaft: 3.4, screwHoleAngle: 90, screwHoleRecess: 4, drillPointAngle: 118 });
    expect(points[0].r).toBe(0);
    expect(points[0].y).toBeLessThan(0);
    expect(points[points.length - 1]).toEqual({ r: 3.3, y: 12 });
  });
});

describe("a recessed countersink's mesh", () => {
  it("is closed, and holds the shaft, the cone and the pocket", () => {
    const recessed = soup(shape("countersink"));
    expect(recessed.boundaryEdges).toBe(0);
    expect(recessed.nonManifoldEdges).toBe(0);
    expect(recessed.volume).toBeCloseTo(polygonArea(1.7) * 6.4 + frustum(1.7, 3.3, 1.6) + polygonArea(3.3) * 4, 2);
  });

  it("works with a slot and on the double countersink", () => {
    const slotted = soup(shape("countersink", { width: 14, screwHoleSlot: true }));
    expect(slotted.boundaryEdges).toBe(0);
    expect(slotted.nonManifoldEdges).toBe(0);
    const double = soup(shape("doubleCountersink", { screwHoleRecess: 2 }));
    expect(double.boundaryEdges).toBe(0);
    expect(double.volume).toBeCloseTo(polygonArea(1.7) * 4.8 + 2 * frustum(1.7, 3.3, 1.6) + 2 * polygonArea(3.3) * 2, 2);
  });

  it("is built again when the recess changes, and counts as a change", () => {
    const recessed = shape("countersink");
    const flush = { ...recessed, screwHoleRecess: undefined };
    expect(shapeGeometrySignature(recessed)).not.toBe(shapeGeometrySignature(flush));
    expect(workplaneShapesEqual(recessed, flush)).toBe(false);
    expect(workplaneShapesEqual(flush, { ...flush, screwHoleRecess: 0 })).toBe(true);
  });

  it("keeps it through a saved design", async () => {
    const recessed = { ...shape("countersink"), id: "recessed" };
    const project = (list: WorkplaneShape[]) => exportLylProject({
      projectId: "recess", projectName: "Recessed countersink", createdAt: 1_700_000_000_000, modifiedAt: 1_700_000_100_000,
      shapes: list, history: [editorHistoryEntry(list, [])], historyIndex: 0, assets: [],
      workspace: DEFAULT_WORKPLANE_WORKSPACE, snapGrid: DEFAULT_SNAP_GRID, placementElevation: 0,
    });
    const restored = (await importLylProject(await project([recessed]))).shapes[0];
    expect(restored.screwHoleRecess).toBe(4);
    expect(meshForShape(restored)).toEqual(meshForShape(recessed));
    const broken = [{ ...recessed, screwHoleRecess: "deep" }] as unknown as WorkplaneShape[];
    await expect(importLylProject(await project(broken))).rejects.toThrow(/screwHoleRecess/);
  });
});

describe("a screw hole made from its settings, as the AI bridge makes it", () => {
  // layerling_create_shape and layerling_update_object pass their settings through the shape defaults: the slot and
  // the recess have to come through there, or a hole made that way loses them.
  const make = (kind: WorkplaneShape["kind"], params: Record<string, unknown>) => {
    const asset = toolbarShapeAssets.find((entry) => entry.kind === kind)!;
    const settings = normalizeShapeCustomizations({ [kind]: params })[kind] ?? {};
    return makeShapeFromAsset(asset, { x: 0, z: 0 }, { ...settings, width: 14, depth: 6.6, height: 12 });
  };

  it("keeps the recess and the slot", () => {
    const made = make("countersink", { screwHoleRecess: 4, screwHoleSlot: true });
    expect(made.screwHoleRecess).toBe(4);
    expect(made.screwHoleSlot).toBe(true);
    expect(make("doubleCountersink", { screwHoleRecess: 2 }).screwHoleRecess).toBe(2);
    expect(make("counterbore", { screwHoleSlot: true }).screwHoleSlot).toBe(true);
  });

  it("leaves them out when off, and the counterbore takes no recess", () => {
    const plain = make("countersink", {});
    expect(plain.screwHoleRecess).toBeUndefined();
    expect(plain.screwHoleSlot).toBeUndefined();
    expect(make("countersink", { screwHoleRecess: 0, screwHoleSlot: false }).screwHoleRecess).toBeUndefined();
    expect(make("counterbore", { screwHoleRecess: 4 }).screwHoleRecess).toBeUndefined();
  });
});
