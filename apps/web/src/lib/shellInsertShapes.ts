import { disposeManifold, shapeToManifoldSolid } from "@/lib/editorBooleans";
import { getManifoldRuntime, type ManifoldSolid } from "@/lib/editorMeshCore";
import { createLocalId } from "@/lib/localIds";
import { splitShapeFromWorldPositions } from "@/lib/modelSplit";
import { shellInsertForSolids, type ShellInsertError } from "@/lib/shellInsert";
import { canonicalizeShape, shapeDepth } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

/** How far in front of its box a loose insert is laid, in mm. */
export const SHELL_INSERT_SPACING = 10;

/**
 * The loose insert (shellInsert.ts) for the box `smooth`, hollowed without its dividers, from `divided`, the same box
 * hollowed with them: a body of its own in the box's colour that remembers its box (`insertFor`), sitting in the box
 * where it goes. `shellInsertLaid` lays it in front of the box to print.
 */
export async function shellInsertForShapes(divided: WorkplaneShape, smooth: WorkplaneShape, options: { play?: number; name: string; also?: WorkplaneShape; wall?: number; lidRoom?: number }): Promise<{ insert: WorkplaneShape; height: number; plate: number; play: number } | { error: ShellInsertError | "kernel" }> {
  const created: ManifoldSolid[] = [];
  try {
    const runtime = await getManifoldRuntime();
    const withWalls = shapeToManifoldSolid(runtime, divided, created);
    const without = shapeToManifoldSolid(runtime, smooth, created);
    // The box as it stands in the design, where a lid put posts for its magnets into its corners since.
    const also = options.also ? shapeToManifoldSolid(runtime, options.also, created) : null;
    if (!withWalls || !without) return { error: "kernel" };
    const result = shellInsertForSolids(runtime, withWalls, without, { play: options.play, also, wall: options.wall, lidRoom: options.lidRoom });
    if ("error" in result) return result;
    created.push(result.insert);
    const mesh = result.insert.getMesh();
    const positions: number[] = [];
    for (let index = 0; index < mesh.triVerts.length; index += 1) {
      const offset = mesh.triVerts[index] * mesh.numProp;
      positions.push(mesh.vertProperties[offset], mesh.vertProperties[offset + 1], mesh.vertProperties[offset + 2]);
    }
    const shape = splitShapeFromWorldPositions(smooth, positions, createLocalId(`${smooth.id}-insert`), options.name);
    if (!shape) return { error: "tooSmall" };
    return { insert: canonicalizeShape({ ...shape, hidden: false, insertFor: { body: smooth.id } }), height: result.height, plate: result.plate, play: result.play };
  } catch {
    return { error: "kernel" };
  } finally {
    Array.from(new Set(created)).forEach(disposeManifold);
  }
}

/** The insert laid in front of its box (`box`: the box's bounds), on the plate at the box's foot, ready to print. */
export function shellInsertLaid(insert: WorkplaneShape, box: { minX: number; maxX: number; minY: number; maxZ: number }): WorkplaneShape {
  return { ...insert, x: (box.minX + box.maxX) / 2, z: box.maxZ + SHELL_INSERT_SPACING + shapeDepth(insert) / 2, elevation: box.minY };
}
