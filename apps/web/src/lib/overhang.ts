import { closedMeshFaceOrientation } from "@/lib/cadProfileExtrusion";
import { DEFAULT_OVERHANG_ANGLE, OVERHANG_PLATE_TOLERANCE, overhangDownwardLimit } from "@/lib/overhangLimits";

export * from "@/lib/overhangLimits";

/**
 * Area of a closed mesh (world millimetres, y up) that overhangs more than
 * `angle`, and the steepest overhang of any face, in degrees from the vertical
 * (null when no face leans towards the plate at all). Faces lying on the plate
 * do not count. The triangles may be wound either way; they are turned
 * outwards first. `footMm` leaves out the faces that lie no higher than this above the mesh's own lowest point: the
 * foot of a pin on a breakaway base, which hangs over its socket on purpose (#1633).
 */
export function overhangArea(
  vertices: ReadonlyArray<readonly [number, number, number]>,
  faces: ReadonlyArray<readonly [number, number, number]>,
  angle = DEFAULT_OVERHANG_ANGLE,
  plateY = 0,
  footMm = 0,
) {
  const limit = overhangDownwardLimit(angle);
  const { flip } = closedMeshFaceOrientation(vertices, faces);
  let footY = -Infinity;
  if (footMm > 0) {
    let bottom = Infinity;
    for (const vertex of vertices) bottom = Math.min(bottom, vertex[1]);
    footY = bottom + footMm;
  }
  let area = 0;
  let lowest = Infinity;
  let steepest = 0;
  faces.forEach((face, index) => {
    const [ax, ay, az] = vertices[face[0]];
    const [bx, by, bz] = vertices[face[1]];
    const [cx, cy, cz] = vertices[face[2]];
    const top = Math.max(ay, by, cy);
    if (top <= plateY + OVERHANG_PLATE_TOLERANCE || top <= footY) return;
    const ux = bx - ax, uy = by - ay, uz = bz - az;
    const vx = cx - ax, vy = cy - ay, vz = cz - az;
    const nx = uy * vz - uz * vy;
    const ny = (uz * vx - ux * vz) * flip[index];
    const nz = ux * vy - uy * vx;
    const length = Math.hypot(nx, ny, nz);
    if (length < 1e-12) return;
    // A sliver a boolean leaves (a ten-thousandth of a square millimetre) may face anywhere; it is not what prints.
    if (length / 2 >= 1e-4) steepest = Math.max(steepest, -ny / length);
    if (-ny / length <= limit) return;
    area += length / 2;
    lowest = Math.min(lowest, ay, by, cy);
  });
  return {
    areaMm2: area,
    lowestY: Number.isFinite(lowest) ? lowest : null,
    // A wall's normal has a share of float noise downwards; from a thousandth on it leans.
    steepestDegrees: steepest > 1e-3 ? (Math.asin(Math.min(1, steepest)) * 180) / Math.PI : null,
  };
}
