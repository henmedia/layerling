import { BooleanOp, type OcctKernel, type ShapeHandle } from "occt-wasm";
import { isCadModifierWasmMemoryFault } from "@/lib/cadModifierRuntime";

/**
 * How near two faces or edges may lie to count as one in the cut of a hole from a body: a hole whose end meets a face of the
 * body exactly - the snap grid sets a hole's depth to 5.000, and it then ends on the slope it was pulled through - made
 * a skin as thin as a rounding error that a chamfer then could not get round (forum, DrJones). A thousandth of a
 * millimetre is far below anything printed and above the rounding of a size typed or dragged.
 */
export const HOLE_CUT_FUZZY = 1e-3;

/** The body less the hole, with nearly coincident faces and edges within HOLE_CUT_FUZZY taken as one. The plain cut when that fails. */
export function fuzzyCut(cad: OcctKernel, body: ShapeHandle, hole: ShapeHandle): ShapeHandle {
  try {
    const cut = cad.booleanOp(BooleanOp.Cut, [body], [hole], { fuzzyValue: HOLE_CUT_FUZZY }).result;
    if (cad.isSolid(cut) || cad.getSubShapes(cut, "solid").length > 0) return cut;
  } catch (error) {
    // A kernel that has run out of memory is no case for a second try; the worker restarts it.
    if (isCadModifierWasmMemoryFault(error instanceof Error ? error.message : String(error ?? ""), error instanceof Error ? error.name : "")) throw error;
  }
  return cad.cut(body, hole);
}

/**
 * A cut body with its faces merged (simplify, then unifySameDomain). That tidying can turn a valid
 * cut into an invalid body: a tapped hole whose chamfer is as long as its pitch (M6, 1 mm, the
 * defaults of a threaded hole) came out of it with a broken shell, and the group could then not be
 * filleted at all ("The grouped body could not be repaired", #938). When it does, the cut as it
 * was is kept.
 */
export function tidiedIfValid(cad: OcctKernel, cut: ShapeHandle, isValid: (cad: OcctKernel, shape: ShapeHandle) => boolean = (kernel, shape) => kernel.isValid(shape)) {
  try {
    const tidied = cad.unifySameDomain(cad.simplify(cut));
    if (isValid(cad, tidied) || !isValid(cad, cut)) return tidied;
  } catch (error) {
    if (isCadModifierWasmMemoryFault(error instanceof Error ? error.message : String(error ?? ""), error instanceof Error ? error.name : "")) throw error;
    // The tidying itself failed; the cut stands.
  }
  return cut;
}
