import type { WorkplaneShape } from "@/types/layerling";

/*
 * layerling is made first of all for exact CAD bodies. Imported meshes work, but very large ones - scans, sculpts,
 * models from Blender with hundreds of thousands of triangles each - make the editor slow, take a lot of memory and
 * make saving slow (Discussion #1652). After an import that brings such meshes in, the editor says so once.
 */

/** One imported mesh from this many triangles on is called large. */
export const LARGE_MESH_TRIANGLES = 400_000;
/** The imported meshes of a design together from this many triangles on are called large. */
export const LARGE_DESIGN_MESH_TRIANGLES = 1_000_000;

const MESH_FORMATS = new Set(["stl", "obj", "3mf"]);

/** The triangles of the meshes a shape holds from an STL, OBJ or 3MF file, the parts inside a group included. */
export function importedMeshTriangles(shape: WorkplaneShape): number {
  const own = shape.importedMesh && MESH_FORMATS.has(shape.importedMesh.sourceFormat) ? Math.max(0, shape.importedMesh.triangleCount || 0) : 0;
  return own + (shape.groupedShapes ?? []).reduce((sum, part) => sum + importedMeshTriangles(part), 0);
}

/**
 * The triangles to warn about after an import, or null when the import brought in no large mesh and the design
 * stays below the limit for all its meshes together. `design` is the whole design after the import.
 */
export function largeMeshWarningTriangles(imported: readonly WorkplaneShape[], design: readonly WorkplaneShape[]): number | null {
  const importedTriangles = imported.map(importedMeshTriangles);
  if (!importedTriangles.some((count) => count > 0)) return null;
  const total = design.reduce((sum, shape) => sum + importedMeshTriangles(shape), 0);
  if (importedTriangles.some((count) => count >= LARGE_MESH_TRIANGLES) || total >= LARGE_DESIGN_MESH_TRIANGLES) return total;
  return null;
}
