import type { ManifoldToplevel } from "manifold-3d";

/** One closed loop of an outline seen from above, in the plate's x and z. */
export type SilhouetteLoop = Array<{ x: number; z: number }>;

/** Points of the outline closer together than this (mm) are one point. */
const SILHOUETTE_SIMPLIFY = 0.005;

/**
 * The outline of a closed body of loose triangles (x, y up, z) seen from above, as the kernel works it out: the union of all
 * its triangles laid flat, holes and all (Discussion #1366). An imported Benchy showed under a sketch as the strip of keel it
 * stands on, a small piece of the boat, where the boat seen from above is what one draws round. Null when the kernel does not
 * take the triangles as a closed body, or nothing is left.
 */
export function meshTopSilhouette(runtime: ManifoldToplevel, positions: ArrayLike<number>): SilhouetteLoop[] | null {
  const count = positions.length - (positions.length % 9);
  if (count < 9) return null;
  const vertProperties = new Float32Array(count);
  for (let index = 0; index < count; index += 1) vertProperties[index] = positions[index];
  const triVerts = new Uint32Array(count / 3);
  for (let index = 0; index < triVerts.length; index += 1) triVerts[index] = index;
  const owned: Array<{ delete(): void }> = [];
  try {
    const mesh = new runtime.Mesh({ numProp: 3, vertProperties, triVerts, tolerance: 0.0001 });
    owned.push(mesh as unknown as { delete(): void });
    mesh.merge();
    const solid = runtime.Manifold.ofMesh(mesh);
    owned.push(solid);
    if (solid.status() !== "NoError" || solid.numTri() < 1) return null;
    // Turned so that up is the direction it is projected along; the plate's z becomes the outline's y (as the SVG export).
    const topView = solid.rotate([-90, 0, 0]);
    owned.push(topView);
    const projection = topView.project();
    owned.push(projection);
    const simplified = projection.simplify(SILHOUETTE_SIMPLIFY);
    owned.push(simplified);
    const loops = simplified
      .toPolygons()
      .filter((polygon) => polygon.length >= 3)
      .map((polygon) => polygon.map(([x, z]) => ({ x, z })));
    return loops.length ? loops : null;
  } catch {
    return null;
  } finally {
    [...new Set(owned)].reverse().forEach((object) => {
      try {
        object.delete();
      } catch {
        // Already gone.
      }
    });
  }
}

/** The loops as one SVG path, each closed. */
export function silhouettePath(loops: readonly SilhouetteLoop[]): string {
  return loops
    .map((loop) => `M ${loop[0].x} ${loop[0].z} ${loop.slice(1).map((point) => `L ${point.x} ${point.z}`).join(" ")} Z`)
    .join(" ");
}
