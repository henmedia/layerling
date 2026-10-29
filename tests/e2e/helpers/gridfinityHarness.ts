import { beforeAll, expect } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import manifoldModule, { type ManifoldToplevel } from "manifold-3d";
import { OcctKernel, type ShapeHandle } from "occt-wasm";
import type { CadModifierGridfinityPart } from "@/lib/cadModifierTypes";
import { GRIDFINITY_LIP_HEIGHT, gridfinityLabelledTriangles } from "@/lib/gridfinityGeometry";
import { gridfinityPartSolid } from "@/lib/gridfinitySolid";

/*
 * What the Gridfinity e2e files share: the CAD kernel and Manifold, set up once per file, a standard bin and baseplate, and
 * the checks that hold a body to the mesh the editor draws. The tests were one file of 270 s, which alone set how long the
 * whole e2e run took; split in four they run side by side.
 */

export let cad: OcctKernel;
export let runtime: ManifoldToplevel;

beforeAll(async () => {
  const wasm = join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm");
  cad = await OcctKernel.init({ wasm });
  runtime = await manifoldModule();
  runtime.setup();
});

export function bin(extra: Partial<CadModifierGridfinityPart> = {}): CadModifierGridfinityPart {
  return { width: 83.5, depth: 41.5, height: 21 + GRIDFINITY_LIP_HEIGHT, gridfinityType: "bin", gridfinityLip: true, gridfinityMagnets: false, ...extra };
}

export function plate(extra: Partial<CadModifierGridfinityPart> = {}): CadModifierGridfinityPart {
  return { width: 84, depth: 42, height: 5, gridfinityType: "baseplate", gridfinityLip: false, gridfinityMagnets: false, ...extra };
}

export function meshVolume(part: CadModifierGridfinityPart) {
  return trianglesVolume(gridfinityLabelledTriangles(runtime, part));
}

export function trianglesVolume(triangles: number[][][]) {
  return triangles.reduce((sum, [a, b, c]) => sum + (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6, 0);
}

export function meshBounds(part: CadModifierGridfinityPart) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  gridfinityLabelledTriangles(runtime, part).flat().forEach((v) => v.forEach((n, i) => { min[i] = Math.min(min[i], n); max[i] = Math.max(max[i], n); }));
  return { min, max };
}

export function overlap(a: ShapeHandle, b: ShapeHandle) {
  return Math.abs(cad.getVolume(cad.common(a, b)));
}

/** The solid's volume in a 0.3 mm column at (x, z) from y0 to y1. */
export function material(solid: ShapeHandle, x: number, z: number, y0: number, y1: number) {
  return overlap(solid, cad.translate(cad.makeBox(0.3, y1 - y0, 0.3), x - 0.15, y0, z - 0.15));
}


/** One valid solid with the mesh's volume and box, and no edge shorter than the kernel keeps. */
export function expectBuilt(part: CadModifierGridfinityPart, tolerance = 0.002) {
  const context = JSON.stringify(part);
  const solid = gridfinityPartSolid(cad, part);
  expect(cad.isValid(solid), context).toBe(true);
  expect(cad.isSolid(solid) ? 1 : cad.getSubShapes(solid, "solid").length, context).toBe(1);
  const exact = Math.abs(cad.getVolume(solid));
  expect(Math.abs(exact - meshVolume(part)) / exact, context).toBeLessThan(tolerance);
  const box = cad.getBoundingBox(solid);
  const { min, max } = meshBounds(part);
  [box.xmin - min[0], box.ymin - min[1], box.zmin - min[2], box.xmax - max[0], box.ymax - max[1], box.zmax - max[2]].forEach((d) => expect(Math.abs(d), context).toBeLessThan(0.01));
  expect(cad.getSubShapes(solid, "edge").filter((edge) => cad.getLength(edge) > 1e-9 && cad.getLength(edge) < 0.01), context).toHaveLength(0);
  return solid;
}

