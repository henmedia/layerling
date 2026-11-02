import type { OcctKernel, ShapeHandle, Vec3 } from "occt-wasm";

export const CONCAVE_FILLET_STRAIGHT_MESSAGE = "A concave fillet works on straight edges only";

// The 3x4 row-major matrix that turns the Z axis onto `dir` and moves the origin to `origin` (Rodrigues, axis Z x dir).
function zToDirectionMatrix(dir: [number, number, number], origin: Vec3): number[] | null {
  const length = Math.hypot(dir[0], dir[1], dir[2]);
  if (length < 1e-9) return null;
  const [x, y, z] = [dir[0] / length, dir[1] / length, dir[2] / length];
  // For a turn from (0,0,1) onto (x,y,z): R = I + K + K^2 / (1 + z), K the cross-product matrix of Z x d = (-y, x, 0).
  if (z < -1 + 1e-9) return [1, 0, 0, origin.x, 0, -1, 0, origin.y, 0, 0, -1, origin.z];
  const k = 1 / (1 + z);
  return [
    1 - x * x * k, -x * y * k, x, origin.x,
    -x * y * k, 1 - y * y * k, y, origin.y,
    -x, -y, 1 - (x * x + y * y) * k, origin.z,
  ];
}

/**
 * A "negative" fillet (Discussion #1160): instead of rounding an outer edge off, a quarter-round scoop is cut out of it,
 * a cylinder of the given radius lying on the edge as its axis. Works on any dihedral angle, straight edges only.
 */
export function concaveFilletSolid(cad: OcctKernel, solid: ShapeHandle, edges: ShapeHandle[], radius: number): ShapeHandle {
  let current = cad.copy(solid);
  try {
    for (const edge of edges) {
      if (cad.curveType(edge) !== "line") throw new Error(CONCAVE_FILLET_STRAIGHT_MESSAGE);
      const { first, last } = cad.curveParameters(edge);
      const start = cad.curvePointAtParam(edge, first);
      const end = cad.curvePointAtParam(edge, last);
      const dir: [number, number, number] = [end.x - start.x, end.y - start.y, end.z - start.z];
      const length = Math.hypot(dir[0], dir[1], dir[2]);
      const matrix = zToDirectionMatrix(dir, start);
      if (!matrix) continue;
      const raw = cad.makeCylinder(radius, length);
      const placed = cad.transform(raw, matrix);
      const next = cad.cut(current, placed);
      cad.release(raw);
      cad.release(placed);
      cad.release(current);
      current = next;
    }
    return current;
  } catch (error) {
    cad.release(current);
    throw error;
  }
}
