import { describe, expect, it } from "vitest";
import { applySurfaceTexture, normalizeSurfaceTexture } from "@/lib/surfaceTexture";
import { surfaceMeshReport } from "@/lib/surfaceTextureMesh";

type Vec3 = [number, number, number];

/** A closed box standing on the plate, inside frame (y up), faces wound outward. */
function box(w: number, h: number, d: number): number[] {
  const [x0, x1, y0, y1, z0, z1] = [-w / 2, w / 2, 0, h, -d / 2, d / 2];
  const p: Vec3[] = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]];
  const faces = [[0, 1, 2], [0, 2, 3], [4, 6, 5], [4, 7, 6], [0, 4, 5], [0, 5, 1], [3, 2, 6], [3, 6, 7], [0, 3, 7], [0, 7, 4], [1, 5, 6], [1, 6, 2]];
  return faces.flatMap((face) => face.flatMap((i) => p[i]));
}

function circle(cx: number, cy: number, r: number, n = 48): [number, number][] {
  return Array.from({ length: n }, (_, k) => [cx + r * Math.cos((2 * Math.PI * k) / n), cy + r * Math.sin((2 * Math.PI * k) / n)] as [number, number]);
}

describe("explore", () => {
  it("knurls a circle on a plate's top", () => {
    const plate = box(60, 4, 40);
    const region = { normal: [0, 1, 0], points: circle(-12, 0, 10) };
    const result = applySurfaceTexture(plate, normalizeSurfaceTexture({ pattern: "knurl", region }));
    const v = result.vertices;
    let movedInside = 0, movedOutside = 0, nearest = Infinity;
    const used = new Uint8Array(v.length / 3);
    for (const i of result.indices) used[i] = 1;
    for (let i = 0; i < v.length / 3; i += 1) {
      if (!used[i]) continue;
      const [x, y, z] = [v[i * 3], v[i * 3 + 1], v[i * 3 + 2]];
      if (y > 3.999 || y < 0.001) continue;
      // Not on the sides.
      if (Math.abs(x) > 29.99 || Math.abs(z) > 19.99) continue;
      const r = Math.hypot(x + 12, -z);
      nearest = Math.min(nearest, 10 - r);
      if (r < 10) movedInside += 1;
      else movedOutside += 1;
    }
    expect({ movedInside, movedOutside, t: result.stats.triangles, r: surfaceMeshReport(result.indices, v.length / 3), nothing: result.stats.nothing, nearest }).toEqual(null);
    expect(movedInside).toBeGreaterThan(0);
  }, 30000);
});
