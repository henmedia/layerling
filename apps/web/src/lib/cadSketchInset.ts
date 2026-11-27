import { JoinType, type OcctKernel, type ShapeHandle } from "occt-wasm";
import { isKernelMemoryFault } from "@/lib/kernelFault";
import { cadSketchRegions, type OrderedCadSketchPath } from "@/lib/sketchCadProfile";
import { pathWire } from "@/lib/sketchCadWire";
import type { SketchInset, SketchProfile } from "@/types/layerling";

type Move = { delta: number; join: JoinType };

/**
 * The moves that set an outline in by `distance` and round its corners to `radius`, the same steps
 * as insetFaceProfile in faceTool.ts.
 */
function insetMoves(inset: SketchInset): Move[] {
  const { distance, radius } = inset;
  const moves: Move[] = [];
  if (distance + radius > 0) moves.push({ delta: -(distance + radius), join: JoinType.Intersection });
  if (radius > 0) {
    moves.push({ delta: radius, join: JoinType.Arc }, { delta: radius, join: JoinType.Arc }, { delta: -radius, join: JoinType.Arc });
  }
  return moves;
}

/** One outline moved by each step in turn; a hole's outline moves the other way, so the material does the same. Null when the kernel cannot. */
function movedLoop(cad: OcctKernel, path: OrderedCadSketchPath, moves: Move[], sign: 1 | -1): ShapeHandle | null {
  const base = cad.getSurfaceArea(cad.makeFace(pathWire(cad, path)));
  let wire = pathWire(cad, path);
  for (const move of moves) wire = cad.offsetWire2D(wire, move.delta * sign, move.join);
  const face = cad.makeFace(wire);
  const area = cad.getSurfaceArea(face);
  // An outline set in shrinks and an opening grows; a collapsed or turned-inside-out offset is no result.
  return area > 1e-9 && (sign > 0 ? area <= base + 1e-6 : area >= base - 1e-6) ? face : null;
}

/**
 * A sketch whose outlines are set in by an inset (the outline the face tool keeps) as an exact
 * solid `height` tall: the kernel moves the outlines, so a line stays a plane, an arc a cylinder
 * and a curve one spline face. Null whenever the polygon route has to do it: an outline the moves
 * split in two or wipe out, or any failure of the kernel. Open lines are left out, as in the polygon route.
 */
export function buildInsetSketchSolid(cad: OcctKernel, profile: SketchProfile, inset: SketchInset, height: number): ShapeHandle | null {
  let regions: ReturnType<typeof cadSketchRegions>;
  try {
    regions = cadSketchRegions(profile);
  } catch {
    return null;
  }
  if (!regions.length) return null;
  // Rounding each outline on its own is not rounding the area: next to an opening or another area the polygon route does it.
  if (inset.radius > 0 && (regions.length > 1 || regions.some((region) => region.holes.length > 0))) return null;
  const moves = insetMoves(inset);
  try {
    let result: ShapeHandle | null = null;
    for (const region of regions) {
      const outer = movedLoop(cad, region.outer, moves, 1);
      if (!outer) return null;
      let piece = cad.extrude(outer, 0, height, 0);
      for (const hole of region.holes) {
        const opening = movedLoop(cad, hole, moves, -1);
        if (!opening) return null;
        piece = cad.cut(piece, cad.translate(cad.extrude(opening, 0, height + 2, 0), 0, -1, 0));
      }
      result = result ? cad.fuse(result, piece) : piece;
    }
    if (!result || !cad.isValid(result) || !(cad.getVolume(result) > 1e-9)) return null;
    return result;
  } catch (error) {
    // A kernel that has crashed is for the caller to reset; any other failure is the polygon route's to handle.
    if (isKernelMemoryFault(error)) throw error;
    return null;
  }
}
