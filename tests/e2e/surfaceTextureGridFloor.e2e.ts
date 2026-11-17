import { beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { OcctKernel } from "occt-wasm";
import { shellSolid } from "@/lib/cadShell";
import { shellGridSolid } from "@/lib/cadShellGrid";
import { applySurfaceTexture } from "@/lib/surfaceTexture";

const R = [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0];
describe("a surface texture on the outside of a hollowed box with a Gridfinity floor", () => {
  let kernel: OcctKernel;
  beforeAll(async () => { kernel = await OcctKernel.init({ wasm: join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm") }); });
  it("leaves the sockets and the ridges between them alone", () => {
    const solid = kernel.transform(kernel.makeBox(124, 53, 14), R);
    const c = kernel.translate(solid, -62, 0, 26.5);
    const shelled = shellSolid(kernel, c, 2, "top");
    const grid = shellGridSolid(kernel, c, shelled, { cells: 99, fit: false });
    const mesh = kernel.tessellate(grid, { linearDeflection: 0.05 });
    const pos: number[] = [];
    const v = mesh.positions, idx = mesh.indices;
    for (let i = 0; i < idx.length; i++) pos.push(v[idx[i] * 3], v[idx[i] * 3 + 1], v[idx[i] * 3 + 2]);
    const base = new Float64Array(pos);
    const r = applySurfaceTexture(base, { pattern: "knurl", spacing: 3, depth: 0.6, outside: true, inside: false, axis: "z" } as never);
    const rv = r.vertices;
    // vertices near the ridge x in [-2,2], floor zone
    // Near the ridge between the two sockets, on the floor: the mesh stays as the kernel made it (about a hundred points); a
    // pattern laid there would refine it to some thousand.
    let near = 0;
    for (let i = 0; i < rv.length; i += 3) if (Math.abs(rv[i]) < 1.5 && rv[i + 1] < 6.4 && Math.abs(rv[i + 2]) < 18) near += 1;
    expect(near).toBeLessThan(400);
    // The outside walls do carry it.
    expect(r.indices.length / 3).toBeGreaterThan(5000);
  }, 120000);
});
