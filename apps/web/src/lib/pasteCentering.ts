import { meshForShape } from "@/lib/editorMeshCore";
import type { PlacementWorkplane } from "@/lib/placementWorkplane";
import type { WorkplaneShape } from "@/types/layerling";

/**
 * The move that sets pasted parts in the middle of the workplane and drops them onto it (#876): together, as one
 * body, so the parts keep their places to each other. The middle is measured along the workplane's own x and z
 * from its origin (the middle of the plate, or the point picked on a face), and the lowest point goes onto the plane.
 * Null for parts with nothing to measure, so they are pasted where they were.
 */
export function pasteCenteringShift(shapes: WorkplaneShape[], workplane: PlacementWorkplane): { x: number; y: number; z: number } | null {
  const unit = (v: { x: number; y: number; z: number }) => {
    const length = Math.hypot(v.x, v.y, v.z) || 1;
    return { x: v.x / length, y: v.y / length, z: v.z / length };
  };
  const xAxis = unit(workplane.xAxis);
  const yAxis = unit(workplane.normal);
  const zAxis = unit(workplane.zAxis);
  const origin = workplane.origin;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  shapes.forEach((shape) => {
    meshForShape(shape).vertices.forEach(([x, y, z]) => {
      const [dx, dy, dz] = [x - origin.x, y - origin.y, z - origin.z];
      const along = (axis: { x: number; y: number; z: number }) => dx * axis.x + dy * axis.y + dz * axis.z;
      const [px, py, pz] = [along(xAxis), along(yAxis), along(zAxis)];
      minX = Math.min(minX, px);
      maxX = Math.max(maxX, px);
      minY = Math.min(minY, py);
      minZ = Math.min(minZ, pz);
      maxZ = Math.max(maxZ, pz);
    });
  });
  if (![minX, maxX, minY, minZ, maxZ].every(Number.isFinite)) return null;
  const [moveX, moveY, moveZ] = [-(minX + maxX) / 2, -minY, -(minZ + maxZ) / 2];
  return {
    x: xAxis.x * moveX + yAxis.x * moveY + zAxis.x * moveZ,
    y: xAxis.y * moveX + yAxis.y * moveY + zAxis.y * moveZ,
    z: xAxis.z * moveX + yAxis.z * moveY + zAxis.z * moveZ,
  };
}

/** How far a plain paste sets the copies from the originals, along x and z, at most. */
export const PASTE_NUDGE = 12;
/** The least a plain paste moves the copies, so a copy never lies exactly on its original. */
export const PASTE_NUDGE_MIN = 1;

/**
 * How far a plain paste moves the copies (Discussion #1764): half the larger side of what was copied, seen from above,
 * between 1 and 12 mm. A fixed 12 mm set the copy of a 3 mm part far out of view while zoomed in on it; large parts still
 * move the full 12 mm.
 */
export function pasteNudgeFor(parts: { x: number; z: number; width?: number; depth?: number }[]) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  parts.forEach((part) => {
    const halfWidth = Math.max(0, part.width ?? 0) / 2;
    const halfDepth = Math.max(0, part.depth ?? 0) / 2;
    minX = Math.min(minX, part.x - halfWidth);
    maxX = Math.max(maxX, part.x + halfWidth);
    minZ = Math.min(minZ, part.z - halfDepth);
    maxZ = Math.max(maxZ, part.z + halfDepth);
  });
  const side = Math.max(maxX - minX, maxZ - minZ);
  if (!Number.isFinite(side) || side <= 0) return PASTE_NUDGE;
  return Math.round(Math.min(PASTE_NUDGE, Math.max(PASTE_NUDGE_MIN, side / 2)) * 10) / 10;
}

export function pasteNudged<T extends { x: number; z: number; width?: number; depth?: number }>(copies: T[], originals: { x: number; z: number }[]): T[] {
  const nudge = pasteNudgeFor(copies);
  return copies.map((copy, index) => ({ ...copy, x: (originals[index] ?? copy).x + nudge, z: (originals[index] ?? copy).z + nudge }));
}
