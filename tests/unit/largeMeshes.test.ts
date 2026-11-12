import { describe, expect, it } from "vitest";
import { importedMeshTriangles, largeMeshWarningTriangles, LARGE_DESIGN_MESH_TRIANGLES, LARGE_MESH_TRIANGLES } from "@/lib/largeMeshes";
import { guideHref } from "@/lib/guideLinks";
import { MESSAGES_EN as en } from "@/lib/messages.en";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * After an import that brings very large meshes in, the editor says once that layerling is made for exact CAD bodies
 * and that meshes this large make it slow (Discussion #1652).
 */

function mesh(id: string, triangles: number, sourceFormat: "stl" | "obj" | "3mf" | "step" | "json" = "stl", extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return {
    id, name: id, kind: "box", color: "#888888", x: 0, z: 0, elevation: 0, size: 10, width: 10, depth: 10, height: 10, rotation: 0,
    importedMesh: { positions: [], baseWidth: 10, baseDepth: 10, baseHeight: 10, triangleCount: triangles, sourceFormat },
    ...extra,
  } as WorkplaneShape;
}

function box(id: string): WorkplaneShape {
  return { id, name: id, kind: "box", color: "#888888", x: 0, z: 0, elevation: 0, size: 10, width: 10, depth: 10, height: 10, rotation: 0 } as WorkplaneShape;
}

describe("large meshes", () => {
  it("counts the triangles of STL, OBJ and 3MF meshes, the parts of a group included, not STEP or exact bodies", () => {
    expect(importedMeshTriangles(mesh("a", 1200))).toBe(1200);
    expect(importedMeshTriangles(mesh("b", 1200, "3mf"))).toBe(1200);
    expect(importedMeshTriangles(mesh("c", 1200, "step"))).toBe(0);
    expect(importedMeshTriangles(box("d"))).toBe(0);
    const group = { ...box("g"), groupedShapes: [mesh("p1", 300), mesh("p2", 400, "obj"), box("p3")] } as WorkplaneShape;
    expect(importedMeshTriangles(group)).toBe(700);
  });

  it("warns when one imported mesh is large, or when the design's meshes together are", () => {
    const big = mesh("big", LARGE_MESH_TRIANGLES);
    expect(largeMeshWarningTriangles([big], [big])).toBe(LARGE_MESH_TRIANGLES);
    // A 25 MB binary STL holds about 500,000 triangles, and is called large.
    expect(LARGE_MESH_TRIANGLES).toBeLessThan(499_000);
    // Three of 350,000 each: none large alone, 1.05 million together.
    const parts = [mesh("1", 350_000), mesh("2", 350_000), mesh("3", 350_000)];
    expect(largeMeshWarningTriangles([parts[2]], parts)).toBe(1_050_000);
    expect(largeMeshWarningTriangles([parts[1]], parts.slice(0, 2))).toBeNull();
    expect(LARGE_DESIGN_MESH_TRIANGLES).toBe(1_000_000);
  });

  it("says nothing for an import without meshes, however heavy the design already is", () => {
    const heavy = mesh("heavy", 2_000_000);
    expect(largeMeshWarningTriangles([box("new")], [heavy, box("new")])).toBeNull();
    expect(largeMeshWarningTriangles([mesh("step", 900_000, "step")], [mesh("step", 900_000, "step")])).toBeNull();
    // A small mesh that tips the design over the limit for all meshes together does say so.
    expect(largeMeshWarningTriangles([mesh("small", 1000)], [heavy, mesh("small", 1000)])).toBe(2_001_000);
  });

  it("names the count and leads to its section of the guide", () => {
    expect(en["status.largeMeshes"]).toContain("{count}");
    expect(en["status.largeMeshes"]).toMatch(/exact CAD bodies/);
    expect(guideHref("en", undefined, "largeMeshes")).toBe("/guide/files-and-saving.html#large-meshes");
    expect(guideHref("de", undefined, "largeMeshes")).toBe("/anleitung/dateien-und-speichern.html#grosse-netze");
  });
});
