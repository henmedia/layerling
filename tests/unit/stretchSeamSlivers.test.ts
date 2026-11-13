import { pathToFileURL } from "node:url";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { stretchShapeByPlane } from "@/lib/editorBooleans";
import { meshForShape, setManifoldAssetBase } from "@/lib/editorMeshCore";
import type { WorkplaneShape } from "@/types/layerling";

function shape(kind: string): WorkplaneShape {
  return { id: kind, name: kind, kind, color: "#2f9bd8", x: 0, z: 0, elevation: 0, size: 30, width: 30, depth: 30, height: 20, rotation: 0, locked: false, hidden: false } as WorkplaneShape;
}

/** Triangles thinner than 0.01 mm: what the viewer draws as black lines. */
function slivers(target: WorkplaneShape) {
  const { vertices, faces } = meshForShape(target);
  let count = 0;
  for (const [a, b, c] of faces) {
    const [ax, ay, az] = vertices[a], [bx, by, bz] = vertices[b], [cx, cy, cz] = vertices[c];
    const ux = bx - ax, uy = by - ay, uz = bz - az, wx = cx - ax, wy = cy - ay, wz = cz - az;
    const doubleArea = Math.hypot(uy * wz - uz * wy, uz * wx - ux * wz, ux * wy - uy * wx);
    const longest = Math.max(Math.hypot(ux, uy, uz), Math.hypot(wx, wy, wz), Math.hypot(cx - bx, cy - by, cz - bz));
    if (longest > 0 && doubleArea / longest < 0.01) count++;
  }
  return count;
}

// Discussion #1569: stretched through a slanted or rounded wall, the filler's overlap left slivers along both seams.
describe("stretch leaves next to no slivers at its seams", () => {
  beforeAll(() => {
    // The stretch loads the kernel as the editor does, from the folder beside the page.
    setManifoldAssetBase(pathToFileURL(path.resolve("node_modules/manifold-3d") + path.sep).href);
  });

  for (const kind of ["cylinder", "cone"]) {
    // Before: 32 slivers on the cylinder, 268 on the cone; a ramp from the discussion went from 1196 back to the 27 it had.
    // A few stay on the cone's far seam, where the moved part's cut and the filler's end lie a thousandth apart.
    it(`a ${kind} made 20 mm longer keeps next to no thin triangles at its seams`, async () => {
      const before = shape(kind);
      const result = await stretchShapeByPlane(before, { axis: "x", normal: [1, 0, 0], position: 4 }, 20);
      expect("error" in result ? result.error : null).toBeNull();
      const [stretched] = result.parts!;
      expect(slivers(stretched)).toBeLessThanOrEqual(slivers(before) + 16);
    });
  }
});
