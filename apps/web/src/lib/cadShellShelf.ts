import type { OcctKernel, ShapeHandle } from "occt-wasm";
import { block, moved, rimFaces, tracking } from "@/lib/cadLid";
import { DEFAULT_SHELL_SHELF_HEIGHT, DEFAULT_SHELL_SHELF_WIDTH, SHELL_SHELF_MAX_HEIGHT, SHELL_SHELF_MAX_WIDTH, SHELL_SHELF_MIN_HEIGHT, SHELL_SHELF_MIN_WIDTH, SHELL_SHELF_RIB, SHELL_SHELF_RIM_GAP, SHELL_SHELF_SLOPE_FRONT, clampShellShelfHeight, clampShellShelfWidth, shellShelfDrop } from "@/lib/shellShelfLimits";
import { SHELF_FAILED_MESSAGE, SHELF_HEIGHT_MESSAGE, SHELF_NEEDS_TOP_MESSAGE, SHELF_NOT_STRAIGHT_MESSAGE } from "@/lib/shellShelfMessages";

export { DEFAULT_SHELL_SHELF_HEIGHT, DEFAULT_SHELL_SHELF_WIDTH, SHELL_SHELF_MAX_HEIGHT, SHELL_SHELF_MAX_WIDTH, SHELL_SHELF_MIN_HEIGHT, SHELL_SHELF_MIN_WIDTH, SHELL_SHELF_RIB, SHELL_SHELF_RIM_GAP, SHELL_SHELF_SLOPE_FRONT, clampShellShelfHeight, clampShellShelfWidth, shellShelfDrop };
export { SHELF_FAILED_MESSAGE, SHELF_HEIGHT_MESSAGE, SHELF_NEEDS_TOP_MESSAGE, SHELF_NOT_STRAIGHT_MESSAGE };

/*
 * A shelf ledge for a hollowed box with its top open: a ring all round the inside of the wall, `SHELL_SHELF_RIB` thick
 * and `width` wide, whose top lies `height` above the inside of the floor, for a plate to rest on. It is cut from the
 * outline of the cavity at that height, so it follows rounded corners and round boxes, and it reaches a little into the
 * wall so it is one with it. With `slope` (#1981) its underside falls at 45 degrees from a short straight front edge
 * down to the wall, so it prints without supports; that too is built from the outline, since a chamfer on the finished
 * ledge fails once it is as wide as the ledge. Everything here is in the scene's frame, y up.
 */

/** The area the cavities of the slice at `level` have together, in mm²; null where there is none. */
function cavityArea(cad: OcctKernel, solid: ShapeHandle, level: number) {
  const faces = rimFaces(cad, solid, level);
  if (!faces) return null;
  const area = faces.reduce((sum, { openings }) => sum + openings.reduce((inner, opening) => inner + cad.getSurfaceArea(cad.makeFace(opening)), 0), 0);
  return area > 0 ? area : null;
}

/**
 * The hollowed `solid` with the ledge round the inside of its wall. `wall` is the wall thickness it was hollowed with.
 * With `slope` the underside falls at 45 degrees to the wall instead of lying flat.
 * Throws an error with one of the messages above where it cannot be done; the caller shows it.
 */
export function shellShelfSolid(kernel: OcctKernel, solid: ShapeHandle, width: number, height: number, wall: number, slope = false): ShapeHandle {
  const made: ShapeHandle[] = [];
  const cad = tracking(kernel, made);
  let result: ShapeHandle | null = null;
  try {
    const ledge = clampShellShelfWidth(width);
    const box = cad.getBoundingBox(solid);
    const top = clampShellShelfHeight(height) + box.ymin + wall;
    const drop = shellShelfDrop(ledge, slope);
    const low = top - drop;
    if (top > box.ymax - SHELL_SHELF_RIM_GAP || low < box.ymin + wall) throw new Error(SHELF_HEIGHT_MESSAGE);
    const level = (top + low) / 2;
    const rim = rimFaces(cad, solid, box.ymax - 0.3);
    if (!rim || rim.length === 0 || rim.every(({ openings }) => openings.length === 0)) throw new Error(SHELF_NEEDS_TOP_MESSAGE);
    const faces = rimFaces(cad, solid, level);
    if (!faces || faces.length === 0 || faces.every(({ openings }) => openings.length === 0)) throw new Error(SHELF_NEEDS_TOP_MESSAGE);
    // The ledge is straight up and down: the cavity must be as wide at its top as at its bottom.
    const above = cavityArea(cad, solid, top - 0.1);
    const below = cavityArea(cad, solid, low + 0.1);
    if (above === null || below === null || Math.abs(above - below) > 0.01 * above) throw new Error(SHELF_NOT_STRAIGHT_MESSAGE);
    // Into the wall by a little, so the ledge is one with it; never through a thin wall.
    const reach = Math.min(0.4, wall / 2);
    const rings: ShapeHandle[] = [];
    for (const { openings } of faces) {
      for (const opening of openings) {
        const into = moved(cad, opening, reach);
        const free = moved(cad, opening, -ledge);
        if (!into || !free) throw new Error(SHELF_FAILED_MESSAGE);
        if (!slope) {
          rings.push(cad.cut(block(cad, into, level, low, top), block(cad, free, level, low - 1, top + 1)));
          continue;
        }
        // What stays free: straight down past the front edge, then widening at 45 degrees. The widening runs on past
        // the wall's face, into the wall as far as the ledge reaches, so no hair-thin ring is left where they meet.
        const front = top - (drop - ledge);
        const widening = cad.draftPrism(cad.translate(free, 0, front - level, 0), 0, -(ledge + reach + 0.5), 0, -45);
        made.push(widening);
        const room = cad.fuseAll([block(cad, free, level, front - 0.01, top + 1), widening]);
        rings.push(cad.cut(block(cad, into, level, low - reach, top), room));
      }
    }
    let body = cad.fuseAll([solid, ...rings]);
    body = cad.simplify(body);
    const solids = cad.isSolid(body) ? [body] : cad.getSubShapes(body, "solid");
    if (solids.length !== 1 || !cad.isValid(solids[0]) || cad.getVolume(solids[0]) <= cad.getVolume(solid)) throw new Error(SHELF_FAILED_MESSAGE);
    result = solids[0];
    return result;
  } finally {
    made.forEach((handle) => {
      if (handle === result) return;
      try {
        kernel.release(handle);
      } catch {
        // already gone
      }
    });
  }
}

/**
 * The hollowed `solid` with a ledge at each of `levels` (Discussion #2065), from the lowest up, each built as above.
 * Throws as `shellShelfSolid` does, for the first ledge that cannot be made.
 */
export function shellShelvesSolid(kernel: OcctKernel, solid: ShapeHandle, levels: { width: number; height: number }[], wall: number, slope = false): ShapeHandle {
  let body = solid;
  for (const level of levels) {
    let next: ShapeHandle;
    try {
      next = shellShelfSolid(kernel, body, level.width, level.height, wall, slope);
    } finally {
      // The bodies made on the way are this function's own; the one it was given stays the caller's.
      if (body !== solid) kernel.release(body);
    }
    body = next;
  }
  return body;
}
