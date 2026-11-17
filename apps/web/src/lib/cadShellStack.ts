import type { OcctKernel, ShapeHandle } from "occt-wasm";
import { block, moved, rimFaces, tracking } from "@/lib/cadLid";
import { DEFAULT_SHELL_STACK_HEIGHT, SHELL_STACK_EXTRA, SHELL_STACK_MAX_HEIGHT, SHELL_STACK_MIN_HEIGHT, SHELL_STACK_MIN_PART, SHELL_STACK_MIN_WALL, SHELL_STACK_PLAY, clampShellStackHeight } from "@/lib/shellStackLimits";
import { STACK_FAILED_MESSAGE, STACK_NEEDS_TOP_MESSAGE, STACK_NOT_STRAIGHT_MESSAGE, STACK_TOO_LOW_MESSAGE, STACK_WALL_THIN_MESSAGE } from "@/lib/shellStackMessages";

export { DEFAULT_SHELL_STACK_HEIGHT, SHELL_STACK_EXTRA, SHELL_STACK_MAX_HEIGHT, SHELL_STACK_MIN_HEIGHT, SHELL_STACK_MIN_PART, SHELL_STACK_MIN_WALL, SHELL_STACK_PLAY, clampShellStackHeight };
export { STACK_FAILED_MESSAGE, STACK_NEEDS_TOP_MESSAGE, STACK_NOT_STRAIGHT_MESSAGE, STACK_TOO_LOW_MESSAGE, STACK_WALL_THIN_MESSAGE };

/*
 * Stacking for a hollowed box with its top open, so one box stands on the next. The outer half of the wall rises above
 * the top as a collar, `height` high and flush with the outside, and the underside has a groove the same width and a
 * millimetre deeper, open to the outside, that takes the collar of the box below. The inner half of the wall, the floor
 * and the bottom stay flat, so the box prints standing on its floor with nothing hanging in the air, and the floor stays
 * joined to the wall. The play between collar and groove sits on the inside of the collar. Everything here is in the
 * scene's frame, y up.
 */

/** The area of what the outlines of the faces at the rim enclose, in mm². */
function outerArea(cad: OcctKernel, faces: Array<{ outer: ShapeHandle }>) {
  return faces.reduce((sum, { outer }) => sum + cad.getSurfaceArea(cad.makeFace(outer)), 0);
}

/**
 * The hollowed `solid` with the collar round its top and the groove under its wall. Throws an error with one of the
 * messages above where it cannot be done; the caller shows it.
 */
export function shellStackSolid(kernel: OcctKernel, solid: ShapeHandle, height: number, wall: number): ShapeHandle {
  const made: ShapeHandle[] = [];
  const cad = tracking(kernel, made);
  let result: ShapeHandle | null = null;
  try {
    const stack = clampShellStackHeight(height);
    if (wall < SHELL_STACK_MIN_WALL - 1e-9) throw new Error(STACK_WALL_THIN_MESSAGE);
    const box = cad.getBoundingBox(solid);
    const top = box.ymax;
    const bottom = box.ymin;
    const total = top - bottom;
    // The collar and the groove (and a millimetre) both fit into the wall's height, with the floor between.
    if (total < 2 * stack + SHELL_STACK_EXTRA + wall + 1) throw new Error(STACK_TOO_LOW_MESSAGE);
    const rim = top - Math.min(0.3, total * 0.02);
    const faces = rimFaces(cad, solid, rim);
    if (!faces || faces.length === 0 || faces.every(({ openings }) => openings.length === 0)) throw new Error(STACK_NEEDS_TOP_MESSAGE);
    // The foot of the box above must be as wide as the rim of the box below: a slice just above the floor.
    const footPlane = bottom + Math.min(0.3, total * 0.02);
    const foot = rimFaces(cad, solid, footPlane);
    if (!foot) throw new Error(STACK_NOT_STRAIGHT_MESSAGE);
    const top2 = outerArea(cad, faces);
    const foot2 = outerArea(cad, foot);
    if (Math.abs(top2 - foot2) > 0.01 * top2) throw new Error(STACK_NOT_STRAIGHT_MESSAGE);
    const collarIn = wall / 2 - SHELL_STACK_PLAY / 2;
    const grooveIn = wall / 2 + SHELL_STACK_PLAY / 2;
    const collars: ShapeHandle[] = [];
    const grooves: ShapeHandle[] = [];
    for (const { outer } of faces) {
      const outerFace = cad.makeFace(outer);
      const collarInner = moved(cad, outer, -collarIn);
      const grooveInner = moved(cad, outer, -grooveIn);
      const wide = moved(cad, outer, 1);
      if (!collarInner || !grooveInner || !wide) throw new Error(STACK_FAILED_MESSAGE);
      // Down into the wall by half a millimetre, so the collar is one with it.
      collars.push(cad.cut(block(cad, outerFace, rim, top - 0.5, top + stack), block(cad, collarInner, rim, top - 1, top + stack + 1)));
      const depth = stack + SHELL_STACK_EXTRA;
      grooves.push(cad.cut(block(cad, wide, rim, bottom - 1, bottom + depth), block(cad, grooveInner, rim, bottom - 2, bottom + depth + 1)));
    }
    let body = cad.fuseAll([solid, ...collars]);
    body = cad.cutAll(body, grooves);
    body = cad.simplify(body);
    const solids = cad.isSolid(body) ? [body] : cad.getSubShapes(body, "solid");
    if (solids.length !== 1 || !cad.isValid(solids[0]) || cad.getVolume(solids[0]) <= 0) throw new Error(STACK_FAILED_MESSAGE);
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
