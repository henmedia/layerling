export type WorkplanePlanarBounds = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

export type WorkplaneCenteringOffset = {
  x: number;
  z: number;
};

// The workplane grid runs from -span/2 to +span/2 on both axes, so the middle of
// the build plate is the origin regardless of the configured workspace size.
export const WORKPLANE_CENTER: WorkplaneCenteringOffset = { x: 0, z: 0 };

/**
 * Offset that moves the given bounding box onto the middle of the workplane,
 * leaving elevation untouched. Returns null for a bounding box that cannot be
 * measured, so callers keep the scene untouched instead of moving objects by NaN. `center` is the middle to
 * go to: the origin, the first plate's, unless the selection stands on a later build plate (the middle of that one).
 */
export function workplaneCenteringOffset(bounds: WorkplanePlanarBounds, center: WorkplaneCenteringOffset = WORKPLANE_CENTER): WorkplaneCenteringOffset | null {
  const { minX, maxX, minZ, maxZ } = bounds;
  if (![minX, maxX, minZ, maxZ].every(Number.isFinite) || minX > maxX || minZ > maxZ) return null;
  return {
    x: center.x - (minX + maxX) / 2,
    z: center.z - (minZ + maxZ) / 2,
  };
}

type Direction = { x: number; y: number; z: number };

/**
 * On a workplane laid on a face (#805): the move in world coordinates that brings the middle of the
 * selection onto the workplane's origin, the point picked with W. `bounds` are measured along the
 * workplane's own x and z axes from that origin; the move runs only along those two axes, so the
 * selection keeps its distance from the plane and a part standing on the face stays on it.
 */
export function faceWorkplaneCenteringShift(bounds: WorkplanePlanarBounds, xAxis: Direction, zAxis: Direction): Direction | null {
  const offset = workplaneCenteringOffset(bounds);
  if (!offset) return null;
  return {
    x: xAxis.x * offset.x + zAxis.x * offset.z,
    y: xAxis.y * offset.x + zAxis.y * offset.z,
    z: xAxis.z * offset.x + zAxis.z * offset.z,
  };
}
