import { BooleanOp, type OcctKernel, type ShapeHandle } from "occt-wasm";
import { HOLE_CUT_FAILED_MESSAGE, isCadModifierWasmMemoryFault } from "@/lib/cadModifierRuntime";

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
 * Two parts of a group joined, with faces and edges within HOLE_CUT_FUZZY taken as one, as a hole cuts (#1954): a hook
 * set onto a plate stood 0.00024 mm off it, the plain fuse kept two solids, and a fillet along the joint rounded the
 * hook's own edge inward. The plain fuse comes first and is kept whenever it already makes one body, so a group that
 * joined before keeps its body and the edge numbers its fillets and chamfers refer to; only when it leaves the parts
 * apart is the fuzzy fuse tried, and it is taken when it is valid and joins more of them.
 */
export function fuzzyFuse(cad: OcctKernel, body: ShapeHandle, part: ShapeHandle, isValid: (cad: OcctKernel, shape: ShapeHandle) => boolean = (kernel, shape) => kernel.isValid(shape)): ShapeHandle {
  const plain = cad.fuse(body, part);
  const apart = cad.getSubShapes(plain, "solid").length;
  if (apart <= 1) return plain;
  try {
    const fused = cad.booleanOp(BooleanOp.Fuse, [body], [part], { fuzzyValue: HOLE_CUT_FUZZY }).result;
    const solids = cad.getSubShapes(fused, "solid").length;
    if (solids > 0 && solids < apart && isValid(cad, fused)) return fused;
  } catch (error) {
    if (isCadModifierWasmMemoryFault(error instanceof Error ? error.message : String(error ?? ""), error instanceof Error ? error.name : "")) throw error;
  }
  return plain;
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

type Validity = (cad: OcctKernel, shape: ShapeHandle) => boolean;

/** How far a cut body may reach past the body it was cut from, and how much volume it may lose beyond the hole's, as a share. */
const CUT_BOX_SLACK = 0.01;
const CUT_VOLUME_SLACK = 1e-3;

/**
 * Whether a cut looks like one: valid, no larger than the body it came from, and lighter by no more than the hole (Discussion
 * #1523). A roller-skate plate held two nearly identical tilted holes in one spot; the second left the body invalid, and a later
 * hole cut into that body came back taller than the plate, with the hole standing on it as a solid cylinder.
 */
export function cutLooksRight(cad: OcctKernel, body: ShapeHandle, hole: ShapeHandle, cut: ShapeHandle, isValid: Validity) {
  try {
    if (!isValid(cad, cut)) return false;
    const before = cad.getBoundingBox(body);
    const after = cad.getBoundingBox(cut);
    const slack = CUT_BOX_SLACK + 1e-3 * Math.max(before.xmax - before.xmin, before.ymax - before.ymin, before.zmax - before.zmin);
    if (after.xmin < before.xmin - slack || after.ymin < before.ymin - slack || after.zmin < before.zmin - slack) return false;
    if (after.xmax > before.xmax + slack || after.ymax > before.ymax + slack || after.zmax > before.zmax + slack) return false;
    const bodyVolume = Math.abs(cad.getVolume(body));
    const holeVolume = Math.abs(cad.getVolume(hole));
    const cutVolume = Math.abs(cad.getVolume(cut));
    const volumeSlack = CUT_VOLUME_SLACK * Math.max(1, bodyVolume);
    return cutVolume <= bodyVolume + volumeSlack && bodyVolume - cutVolume <= holeVolume + volumeSlack;
  } catch (error) {
    if (isCadModifierWasmMemoryFault(error instanceof Error ? error.message : String(error ?? ""), error instanceof Error ? error.name : "")) throw error;
    return false;
  }
}

/**
 * The body less the hole, checked (Discussion #1523): the fuzzy cut first, as always; when that gives a body that is invalid,
 * larger than before or lighter by more than the hole, the plain cut, a looser fuzzy cut and the repaired cut are tried in turn.
 * When none of them comes out right, the error says so, and the edge tool refuses instead of handing on a body that is not
 * the one on screen.
 */
export function checkedHoleCut(cad: OcctKernel, body: ShapeHandle, hole: ShapeHandle, isValid: Validity): ShapeHandle {
  const attempts: (() => ShapeHandle)[] = [
    () => fuzzyCut(cad, body, hole),
    () => cad.cut(body, hole),
    () => cad.booleanOp(BooleanOp.Cut, [body], [hole], { fuzzyValue: HOLE_CUT_FUZZY * 10 }).result,
    () => cad.fixShape(fuzzyCut(cad, body, hole)),
  ];
  for (const attempt of attempts) {
    let cut: ShapeHandle;
    try {
      cut = attempt();
    } catch (error) {
      if (isCadModifierWasmMemoryFault(error instanceof Error ? error.message : String(error ?? ""), error instanceof Error ? error.name : "")) throw error;
      continue;
    }
    const tidied = tidiedIfValid(cad, cut, isValid);
    if (cutLooksRight(cad, body, hole, tidied, isValid)) return tidied;
    if (tidied !== cut && cutLooksRight(cad, body, hole, cut, isValid)) return cut;
  }
  throw new Error(HOLE_CUT_FAILED_MESSAGE);
}
