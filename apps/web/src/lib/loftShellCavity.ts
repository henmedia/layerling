import type { WorkplaneShape } from "@/types/layerling";
import type { CadModifierProfilePart } from "@/lib/cadModifierTypes";
import { cadModifierProfileForShape } from "@/lib/cadProfileExtrusion";
import { createLoftGeometry, loftMeasures, maxLoftWall } from "@/lib/loftGeometry";

/** From this widening of the wall (seen from above, by the lean) on, a wall of one width would be too uneven. */
const MAX_WIDENING = 1.5;

/** What lies flatter than this is an end, not a side. */
const END_NORMAL = 0.999;

/** Whether the kernel hollows this transition by itself: alike ends without rounded corners, straight between them. */
function kernelHollows(shape: WorkplaneShape) {
  const measures = loftMeasures(shape);
  if (measures.middles.length || measures.smooth > 1e-9 || Math.abs(measures.twist) > 1e-9) return false;
  if (measures.bottomOutline !== measures.topOutline) return false;
  if (measures.bottomOutline === "rectangle") return measures.bottomCorner < 1e-6 && measures.topCorner < 1e-6;
  if (measures.bottomOutline === "polygon") return measures.bottomSides === measures.topSides && measures.bottomCorner < 1e-6 && measures.topCorner < 1e-6;
  return true;
}

/**
 * The inside of a hollowed transition (Making Layers, mail): where its ends differ (a rounded rectangle below, a
 * circle above) its sides are surfaces the kernel's thick solid cannot move inward by 1 mm or more. The transition's
 * own wall can: the inside is a transition too, each end drawn in by the wall. That wall is measured level, so it is
 * widened by the steepest lean: nowhere thinner than asked for, a little thicker where the side stands more upright.
 * It runs from the bottom to the top; the worker cuts it off before a closed end. Null where the kernel does it by
 * itself, or where this would be no even wall (a strong lean, a tilted top, a body lying on its side).
 */
export function loftShellCavity(shape: WorkplaneShape, thickness: number): CadModifierProfilePart | null {
  if (shape.kind !== "loft" || kernelHollows(shape)) return null;
  const measures = loftMeasures(shape);
  if (measures.wall > 0 || Math.abs(measures.tiltX) > 1e-9 || Math.abs(measures.tiltZ) > 1e-9) return null;
  if (Math.abs(shape.rotationX ?? 0) > 1e-6 || Math.abs(shape.rotationZ ?? 0) > 1e-6 || shape.mirrorY) return null;
  const widening = wallWidening(shape);
  if (!(widening <= MAX_WIDENING)) return null;
  const wall = thickness * widening;
  if (wall >= maxLoftWall(measures)) return null;
  const walled = cadModifierProfileForShape({ ...shape, loftWall: wall, loftTopWall: undefined });
  if (!walled || walled.loops.length !== 2 || walled.topLoops?.length !== 2) return null;
  return {
    ...walled,
    loops: [walled.loops[1]],
    topLoops: [walled.topLoops[1]],
    ...(walled.through ? { through: walled.through.map((section) => ({ ...section, loops: [section.loops[1]] })) } : {}),
  };
}

/** How much wider than square to the surface the wall is seen from above, at its steepest lean; 1 for upright sides. */
function wallWidening(shape: WorkplaneShape) {
  const geometry = createLoftGeometry(shape);
  const position = geometry.getAttribute("position");
  const index = geometry.getIndex();
  const count = index ? index.count : position.count;
  const at = (i: number) => (index ? index.getX(i) : i);
  let widest = 1;
  for (let i = 0; i + 2 < count; i += 3) {
    const [a, b, c] = [at(i), at(i + 1), at(i + 2)];
    const ux = position.getX(b) - position.getX(a), uy = position.getY(b) - position.getY(a), uz = position.getZ(b) - position.getZ(a);
    const vx = position.getX(c) - position.getX(a), vy = position.getY(c) - position.getY(a), vz = position.getZ(c) - position.getZ(a);
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const length = Math.hypot(nx, ny, nz);
    if (length < 1e-9 || Math.abs(ny) > END_NORMAL * length) continue;
    widest = Math.max(widest, length / Math.hypot(nx, nz));
  }
  geometry.dispose();
  return widest;
}
