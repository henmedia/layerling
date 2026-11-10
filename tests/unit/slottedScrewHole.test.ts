import { describe, expect, it } from "vitest";
import { createScrewHoleGeometry, screwHoleSlotMeasures } from "@/lib/screwHoleGeometry";
import { shapeDrillPointAngle, shapeTakesDrillPoint } from "@/lib/drillPoint";
import { meshForShape } from "@/lib/editorMeshCore";
import { cadModifierProfileForShape } from "@/lib/cadProfileExtrusion";
import { shapeGeometrySignature } from "@/components/workplane/viewportShapeObjects";
import { analyzeTriangleSoup } from "@/lib/svgImport";
import { editorHistoryEntry } from "@/lib/editorHistory";
import { exportLylProject, importLylProject } from "@/lib/lylProject";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import { workplaneShapesEqual } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * A slotted screw hole (Discussion #1531): the counterbore, countersink and double countersink with their head and
 * shaft running round the two ends of a slot, so the part can still be lined up before the screw is tightened. The
 * shorter of width and depth is the head, the difference the slot along the longer one.
 */

function shape(kind: WorkplaneShape["kind"], extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return { id: `test-${kind}`, name: kind, kind, color: "#888888", x: 0, z: 0, elevation: 0, size: 14, width: 14, depth: 6.6, height: 8, rotation: 0, hole: true, screwHoleShaft: 3.4, screwHoleAngle: 90, screwHoleSlot: true, ...extra } as WorkplaneShape;
}

function soup(source: WorkplaneShape) {
  const mesh = meshForShape(source);
  return analyzeTriangleSoup(mesh.faces.flatMap((face) => face.flatMap((index) => mesh.vertices[index])));
}

function bounds(source: WorkplaneShape) {
  const vertices = meshForShape(source).vertices;
  const axis = (index: number) => [Math.min(...vertices.map((vertex) => vertex[index])), Math.max(...vertices.map((vertex) => vertex[index]))];
  return { x: axis(0), y: axis(1), z: axis(2) };
}

/** The area of the 96-cornered outline the mesh draws a circle of this radius with. */
const polygonArea = (radius: number, corners = 96) => (corners / 2) * radius * radius * Math.sin((2 * Math.PI) / corners);

describe("the slot's measures", () => {
  it("takes the shorter side as the head and the difference as the slot, along the longer side", () => {
    expect(screwHoleSlotMeasures(14, 6.6)).toEqual({ head: 6.6, length: expect.closeTo(7.4, 9), alongX: true });
    expect(screwHoleSlotMeasures(6.6, 10)).toEqual({ head: 6.6, length: expect.closeTo(3.4, 9), alongX: false });
    expect(screwHoleSlotMeasures(6.6, 6.6)).toEqual({ head: 6.6, length: 0, alongX: true });
  });
});

describe("a slotted countersink's mesh", () => {
  it("is closed and fills the slot between the two ends: the round hole plus its section times the slot", () => {
    const slotted = soup(shape("countersink", { sides: 96 }));
    expect(slotted.boundaryEdges).toBe(0);
    expect(slotted.nonManifoldEdges).toBe(0);
    // The shaft 3.4 wide and 6.4 high, the cone from 3.4 to 6.6 over 1.6: the section pushed 7.4 along the slot.
    const section = 3.4 * 6.4 + ((3.4 + 6.6) / 2) * 1.6;
    const round = soup(shape("countersink", { sides: 96, width: 6.6, screwHoleSlot: false }));
    expect(slotted.volume).toBeCloseTo(round.volume + section * 7.4, 1);
  });

  it("runs along the width, or along the depth when that is the longer side", () => {
    expect(bounds(shape("countersink"))).toEqual({ x: [expect.closeTo(-7, 4), expect.closeTo(7, 4)], y: [expect.closeTo(0, 4), expect.closeTo(8, 4)], z: [expect.closeTo(-3.3, 4), expect.closeTo(3.3, 4)] });
    expect(bounds(shape("countersink", { width: 6.6, depth: 12 }))).toEqual({ x: [expect.closeTo(-3.3, 4), expect.closeTo(3.3, 4)], y: [expect.closeTo(0, 4), expect.closeTo(8, 4)], z: [expect.closeTo(-6, 4), expect.closeTo(6, 4)] });
  });

  it("keeps the shaft's width along the slot instead of stretching it as the oval does", () => {
    // Halfway up the shaft, the mesh's corners off the ends' centres stand the shaft's radius from the slot's middle line.
    const geometry = createScrewHoleGeometry({ kind: "countersink", width: 14, depth: 6.6, height: 8, screwHoleShaft: 3.4, screwHoleAngle: 90, slot: true, sides: 96 });
    const position = geometry.getAttribute("position");
    const across: number[] = [];
    for (let index = 0; index < position.count; index += 1) {
      // The bottom cap's centre lies on the middle line: it is no corner of the wall.
      const centre = Math.hypot(position.getX(index), position.getZ(index)) < 1e-6;
      if (!centre && Math.abs(position.getY(index)) < 1e-6 && Math.abs(position.getX(index)) <= 3.7 + 1e-5) across.push(Math.abs(position.getZ(index)));
    }
    expect(across.length).toBeGreaterThan(0);
    across.forEach((distance) => expect(distance).toBeCloseTo(1.7, 4));
  });

  it("works the same for the counterbore and the double countersink", () => {
    for (const kind of ["counterbore", "doubleCountersink"] as const) {
      const extra = kind === "counterbore" ? { width: 12.4, depth: 6.4, height: 12, screwHoleHeadDepth: 3.2 } : { height: 6 };
      const slotted = soup(shape(kind, { sides: 96, ...extra }));
      expect(slotted.boundaryEdges).toBe(0);
      const round = soup(shape(kind, { sides: 96, ...extra, width: extra.depth ?? 6.6, screwHoleSlot: false }));
      expect(slotted.volume).toBeGreaterThan(round.volume);
    }
    // The counterbore: the round one, and its section - shaft 3.4 by 8.8, head 6.4 by 3.2 - pushed 6 along the slot.
    const counterbore = soup(shape("counterbore", { sides: 96, width: 12.4, depth: 6.4, height: 12, screwHoleHeadDepth: 3.2 }));
    expect(counterbore.volume).toBeCloseTo(polygonArea(1.7) * 8.8 + polygonArea(3.2) * 3.2 + (3.4 * 8.8 + 6.4 * 3.2) * 6, 1);
  });

  it("is an oval as before while the setting is off, vertex for vertex", () => {
    const oval = shape("countersink", { screwHoleSlot: undefined });
    expect(meshForShape({ ...oval, screwHoleSlot: false })).toEqual(meshForShape(oval));
  });
});

describe("a slotted hole and the drill point", () => {
  it("takes none: a drill leaves no slot", () => {
    const slotted = shape("countersink", { drillPointAngle: 118 });
    expect(shapeTakesDrillPoint(slotted)).toBe(false);
    expect(shapeDrillPointAngle(slotted)).toBeUndefined();
    expect(bounds(slotted).y[0]).toBeCloseTo(0, 6);
    expect(shapeDrillPointAngle({ ...slotted, screwHoleSlot: false, width: 6.6 })).toBe(118);
  });
});

describe("a slotted hole as an exact body, in the view and in a saved design", () => {
  it("is the turned section with its slot along the right side", () => {
    expect(cadModifierProfileForShape(shape("countersink"))).toMatchObject({ kind: "revolution", slot: { length: expect.closeTo(7.4, 6), alongX: true } });
    expect(cadModifierProfileForShape(shape("counterbore", { width: 6.4, depth: 10, height: 12 }))).toMatchObject({ kind: "revolution", slot: { length: expect.closeTo(3.6, 6), alongX: false } });
    // Width and depth alike: the plain turned body, no slot.
    expect(cadModifierProfileForShape(shape("countersink", { width: 6.6 }))).not.toHaveProperty("slot");
    // An oval without the setting stays a mesh, as always.
    expect(cadModifierProfileForShape(shape("countersink", { screwHoleSlot: undefined }))).toBeNull();
  });

  it("is built again when the setting changes, and counts as a change", () => {
    const slotted = shape("countersink");
    const oval = { ...slotted, screwHoleSlot: undefined };
    expect(shapeGeometrySignature(slotted)).not.toBe(shapeGeometrySignature(oval));
    expect(workplaneShapesEqual(slotted, oval)).toBe(false);
    expect(workplaneShapesEqual(oval, { ...oval, screwHoleSlot: false })).toBe(true);
  });

  it("keeps it through a saved design, and a design without it opens round", async () => {
    const slotted = { ...shape("countersink"), id: "slotted" };
    const plain = { ...shape("counterbore", { width: 6.4, depth: 6.4, screwHoleSlot: undefined }), id: "plain" };
    const project = (list: WorkplaneShape[]) => exportLylProject({
      projectId: "slot", projectName: "Slotted hole", createdAt: 1_700_000_000_000, modifiedAt: 1_700_000_100_000,
      shapes: list, history: [editorHistoryEntry(list, [])], historyIndex: 0, assets: [],
      workspace: DEFAULT_WORKPLANE_WORKSPACE, snapGrid: DEFAULT_SNAP_GRID, placementElevation: 0,
    });
    const restored = new Map((await importLylProject(await project([slotted, plain]))).shapes.map((entry) => [entry.id, entry]));
    expect(restored.get("slotted")?.screwHoleSlot).toBe(true);
    expect(restored.get("plain")).not.toHaveProperty("screwHoleSlot");
    expect(meshForShape(restored.get("slotted")!)).toEqual(meshForShape(slotted));
    const broken = [{ ...slotted, screwHoleSlot: "yes" }] as unknown as WorkplaneShape[];
    await expect(importLylProject(await project(broken))).rejects.toThrow(/screwHoleSlot/);
  });
});
