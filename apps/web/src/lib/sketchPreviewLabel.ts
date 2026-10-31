/**
 * Where the size label of a line being drawn sits: beside the middle of the line, on its upper side, far enough that the
 * label clears the line and both of its ends. Straight up from the middle covered the pointer's end of a short steep line (#1091).
 */
export function previewLabelSpot(from: { x: number; z: number }, to: { x: number; z: number }, pill: { width: number; height: number }, gap: number) {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const length = Math.hypot(dx, dz);
  const middle = { x: (from.x + to.x) / 2, z: (from.z + to.z) / 2 };
  if (length < 1e-9) return { x: middle.x, z: middle.z - pill.height / 2 - gap };
  // The normal on the upper side of the screen; a line along z leans to the right.
  let normal = { x: dz / length, z: -dx / length };
  if (normal.z > 1e-9 || (Math.abs(normal.z) <= 1e-9 && normal.x < 0)) normal = { x: -normal.x, z: -normal.z };
  const reach = Math.abs(normal.x) * pill.width / 2 + Math.abs(normal.z) * pill.height / 2 + gap;
  return { x: middle.x + normal.x * reach, z: middle.z + normal.z * reach };
}
