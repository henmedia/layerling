import type { ManifoldToplevel } from "manifold-3d";
import type { CylinderWrapBender } from "@/lib/cylinderWrap";
import { disposeManifold, meshDataToManifoldMesh } from "@/lib/editorBooleans";

type Solid = InstanceType<ManifoldToplevel["Manifold"]>;

/** How far a point may move when flat pieces are joined, at most, and as a share of the radius: far below the 0.015 % by which a strip's chord misses the circle. */
const MAX_TOLERANCE_MM = 2e-4;
const TOLERANCE_PER_RADIUS = 1e-5;
/** The bent body must have the volume of its strips, up to this share, or it is not taken. */
const MAX_VOLUME_CHANGE = 1e-3;

/**
 * Bends a closed body strip by strip with the solid kernel: cut across the arc into strips by halving, each strip
 * bent, and the strips joined again. Cutting triangle by triangle made the long triangles of a plate with many
 * holes into very many: a Patties plate of 8,672 went to 656,052 (Discussion #1975), this way to 16,106 and
 * faster. Answers null when the kernel does not take the mesh (an open imported one) or the result does not check out;
 * the triangle cut then does it as before.
 */
export function solidWrapBender(runtime: ManifoldToplevel): CylinderWrapBender {
  return ({ vertices, faces, step, first, last, innerRadius, bend }) => {
    const created: unknown[] = [];
    const keep = <T>(value: T) => {
      created.push(value);
      return value;
    };
    try {
      const source = keep(meshDataToManifoldMesh(runtime, { name: "wrapped", vertices, faces }));
      // The helper's own tolerance is meant for booleans; on a small radius it would join the strips themselves.
      source.tolerance = 0;
      const flat = keep(runtime.Manifold.ofMesh(source));
      if (flat.status() !== "NoError" || flat.isEmpty()) return null;

      const strips: Solid[] = [];
      const halve = (body: Solid, from: number, to: number) => {
        if (body.isEmpty()) return;
        if (from > to) {
          strips.push(body);
          return;
        }
        const middle = Math.floor((from + to) / 2);
        const [above, below] = body.splitByPlane([1, 0, 0], middle * step);
        keep(above);
        keep(below);
        halve(below, from, middle - 1);
        halve(above, middle + 1, to);
      };
      halve(flat, first, last);

      // A point of a cut lies on it exactly, so neighbouring strips meet in the same places.
      const snap = Math.min(1e-5, step * 1e-3);
      const bent = strips.map((strip) => keep(strip.warp((point) => {
        const cut = Math.round(point[0] / step) * step;
        const [x, y, z] = bend([Math.abs(point[0] - cut) < snap ? cut : point[0], point[1], point[2]]);
        point[0] = x;
        point[1] = y;
        point[2] = z;
      })));
      const volume = bent.reduce((sum, strip) => sum + strip.volume(), 0);
      const joined = keep(runtime.Manifold.union(bent));
      const body = keep(joined.simplify(Math.min(MAX_TOLERANCE_MM, Math.max(0.1, innerRadius) * TOLERANCE_PER_RADIUS)));
      if (body.status() !== "NoError" || body.isEmpty() || !(volume > 0) || Math.abs(body.volume() - volume) > volume * MAX_VOLUME_CHANGE) return null;

      const { vertProperties, triVerts, numProp } = body.getMesh();
      const positions = new Array<number>(triVerts.length * 3);
      for (let index = 0; index < triVerts.length; index += 1) {
        const at = triVerts[index] * numProp;
        positions[index * 3] = vertProperties[at];
        positions[index * 3 + 1] = vertProperties[at + 1];
        positions[index * 3 + 2] = vertProperties[at + 2];
      }
      return positions;
    } catch {
      return null;
    } finally {
      [...new Set(created)].reverse().forEach(disposeManifold);
    }
  };
}
