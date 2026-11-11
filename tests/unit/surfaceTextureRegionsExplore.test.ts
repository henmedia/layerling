import { describe, expect, it } from "vitest";
import { applySurfaceTexture, normalizeSurfaceTexture, surfaceTexturePositions } from "@/lib/surfaceTexture";
import { surfaceTextureLayersToMake } from "@/lib/surfaceTextureShape";

type Vec3 = [number, number, number];
function box(w: number, h: number, d: number): number[] {
  const [x0, x1, y0, y1, z0, z1] = [-w / 2, w / 2, 0, h, -d / 2, d / 2];
  const p: Vec3[] = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]];
  const faces = [[0, 1, 2], [0, 2, 3], [4, 6, 5], [4, 7, 6], [0, 4, 5], [0, 5, 1], [3, 2, 6], [3, 6, 7], [0, 3, 7], [0, 7, 4], [1, 5, 6], [1, 6, 2]];
  return faces.flatMap((face) => face.flatMap((i) => p[i]));
}
function ellipse(cx: number, cy: number, rx: number, ry: number, n = 48): [number, number][] {
  return Array.from({ length: n }, (_, k) => [cx + rx * Math.cos((2 * Math.PI * k) / n), cy + ry * Math.sin((2 * Math.PI * k) / n)] as [number, number]);
}
function volume(p: ArrayLike<number>) {
  let v = 0;
  for (let t = 0; t < p.length; t += 9) {
    const [ax, ay, az, bx, by, bz, cx, cy, cz] = Array.from({ length: 9 }, (_, k) => p[t + k]);
    v += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
  }
  return v;
}
describe("explore", () => {
  it("bumps the same after a knurled region", () => {
    const plate = box(45, 4, 70);
    const knurl = normalizeSurfaceTexture({ pattern: "knurl", region: { points: ellipse(-8, 15, 8, 10) } });
    const bumps = normalizeSurfaceTexture({ pattern: "bumps", region: { points: ellipse(8, -15, 8, 12) } });
    const [l1, l2] = surfaceTextureLayersToMake(knurl, [bumps]);
    const v0 = volume(plate);
    const after1 = surfaceTexturePositions(applySurfaceTexture(plate, l1));
    const after2 = surfaceTexturePositions(applySurfaceTexture(after1, l2));
    const alone = surfaceTexturePositions(applySurfaceTexture(plate, bumps));
    expect({ knurl: v0 - volume(after1), bumpsAfter: volume(after1) - volume(after2), bumpsAlone: v0 - volume(alone) }).toEqual(null);
  }, 60000);
});
