import { beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import manifoldModule, { type ManifoldToplevel } from "manifold-3d";
import { OcctKernel, type ShapeHandle } from "occt-wasm";
import type { CadModifierGridfinityPart } from "@/lib/cadModifierTypes";
import { GRIDFINITY_LIP_HEIGHT, gridfinityLabelledTriangles, gridfinityTriangles } from "@/lib/gridfinityGeometry";
import { gridfinityPartSolid } from "@/lib/gridfinitySolid";

/*
 * Gridfinity bins and baseplates as exact bodies, held to the mesh the editor
 * draws, and to each other: a bin stands in the baseplate and on another bin
 * without the two overlapping, and moved a little sideways it would.
 */

let cad: OcctKernel;
let runtime: ManifoldToplevel;

beforeAll(async () => {
  const wasm = join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm");
  cad = await OcctKernel.init({ wasm });
  runtime = await manifoldModule();
  runtime.setup();
});

function bin(extra: Partial<CadModifierGridfinityPart> = {}): CadModifierGridfinityPart {
  return { width: 83.5, depth: 41.5, height: 21 + GRIDFINITY_LIP_HEIGHT, gridfinityType: "bin", gridfinityLip: true, gridfinityMagnets: false, ...extra };
}

function plate(extra: Partial<CadModifierGridfinityPart> = {}): CadModifierGridfinityPart {
  return { width: 84, depth: 42, height: 5, gridfinityType: "baseplate", gridfinityLip: false, gridfinityMagnets: false, ...extra };
}

function meshVolume(part: CadModifierGridfinityPart) {
  return gridfinityLabelledTriangles(runtime, part).reduce((sum, [a, b, c]) => sum + (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6, 0);
}

function meshBounds(part: CadModifierGridfinityPart) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  gridfinityLabelledTriangles(runtime, part).flat().forEach((v) => v.forEach((n, i) => { min[i] = Math.min(min[i], n); max[i] = Math.max(max[i], n); }));
  return { min, max };
}

function overlap(a: ShapeHandle, b: ShapeHandle) {
  return Math.abs(cad.getVolume(cad.common(a, b)));
}

/** The solid's volume in a 0.3 mm column at (x, z) from y0 to y1. */
function material(solid: ShapeHandle, x: number, z: number, y0: number, y1: number) {
  return overlap(solid, cad.translate(cad.makeBox(0.3, y1 - y0, 0.3), x - 0.15, y0, z - 0.15));
}

describe("exact Gridfinity bodies", () => {
  it("builds bins and baseplates as one valid solid with the mesh's volume and box", () => {
    for (const part of [bin(), bin({ gridfinityLip: false }), bin({ gridfinityMagnets: true }), bin({ width: 41.5, depth: 41.5, height: 7 + GRIDFINITY_LIP_HEIGHT }), bin({ width: 125.5, depth: 125.5, height: 42 + GRIDFINITY_LIP_HEIGHT, gridfinityMagnets: true }), plate(), plate({ width: 126, depth: 126 })]) {
      const solid = gridfinityPartSolid(cad, part);
      expect(cad.isValid(solid)).toBe(true);
      const exact = Math.abs(cad.getVolume(solid));
      // The mesh draws the arcs as polygons inside them, so it is a little smaller.
      expect(Math.abs(exact - meshVolume(part)) / exact).toBeLessThan(0.002);
      const box = cad.getBoundingBox(solid);
      const { min, max } = meshBounds(part);
      [box.xmin - min[0], box.ymin - min[1], box.zmin - min[2], box.xmax - max[0], box.ymax - max[1], box.zmax - max[2]].forEach((d) => expect(Math.abs(d)).toBeLessThan(0.01));
    }
  });

  it("fits bins in baseplates 0.25 mm up, where a bigger bin rests on the ridges, and 0.3 mm sideways they overlap", () => {
    for (const [binSize, plateSize] of [[41.5, 42], [83.5, 84]]) {
      const b = gridfinityPartSolid(cad, bin({ width: binSize, depth: binSize }));
      const p = gridfinityPartSolid(cad, plate({ width: plateSize, depth: plateSize }));
      const seated = cad.translate(b, 0, 0.25, 0);
      expect(overlap(seated, p)).toBeLessThan(0.01);
      expect(overlap(cad.translate(seated, 0.3, 0, 0), p)).toBeGreaterThan(1);
    }
    // On the plate's floor a bin of 2 x 2 units would stand in the ridges between its feet.
    expect(overlap(gridfinityPartSolid(cad, bin({ width: 83.5, depth: 83.5 })), gridfinityPartSolid(cad, plate({ width: 84, depth: 84 })))).toBeGreaterThan(1);
  });

  it("stacks a bin on another: it sinks 0.35 mm into the lip until the slopes meet", () => {
    const lower = gridfinityPartSolid(cad, bin({ width: 41.5, depth: 41.5 }));
    const upper = gridfinityPartSolid(cad, bin({ width: 41.5, depth: 41.5 }));
    expect(overlap(lower, cad.translate(upper, 0, 21, 0))).toBeLessThan(0.01);
    expect(overlap(lower, cad.translate(upper, 0, 21 - 0.34, 0))).toBeLessThan(0.01);
    expect(overlap(lower, cad.translate(upper, 0, 21 - 0.5, 0))).toBeGreaterThan(1);
  });

  it("takes a fillet and a chamfer on the sharp top of the lip", () => {
    const solid = gridfinityPartSolid(cad, bin());
    const top = cad.getBoundingBox(solid).ymax;
    const edges = cad.getSubShapes(solid, "edge").filter((edge) => {
      const box = cad.getBoundingBox(edge);
      return box.ymin > top - 1e-6;
    });
    expect(edges.length).toBeGreaterThan(0);
    const filleted = cad.fillet(solid, edges, 0.5);
    expect(cad.isValid(filleted)).toBe(true);
    expect(Math.abs(cad.getVolume(filleted))).toBeLessThan(Math.abs(cad.getVolume(solid)));
    expect(cad.isValid(cad.chamfer(solid, edges, 0.5))).toBe(true);
  });

  it("joins label shelves to a bin as one valid solid with the mesh's volume and box", () => {
    const big = { width: 125.5, depth: 83.5, height: 42 + GRIDFINITY_LIP_HEIGHT };
    for (const part of [
      bin({ gridfinityLabelBack: true }),
      bin({ gridfinityLabelBack: true, gridfinityLabelLeft: true, gridfinityLabelRight: true }),
      bin({ gridfinityLabelBack: true, gridfinityLabelLeft: true, gridfinityLabelRight: true, gridfinityLabelCorner: "chamfer", gridfinityLabelCornerSize: 2 }),
      bin({ gridfinityLabelFront: true, gridfinityLabelFrontLength: 36, gridfinityLabelFrontOffset: -10 }),
      bin({ gridfinityLabelFront: true, gridfinityLabelFrontLength: 36, gridfinityLabelFrontOffset: -10, gridfinityLabelCorner: "chamfer" }),
      bin({ gridfinityLabelBack: true, gridfinityLabelLeft: true, gridfinityLabelBackWidth: 6, gridfinityLabelLeftWidth: 16 }),
      bin({ gridfinityLabelBack: true, gridfinityLabelLeft: true, gridfinityLabelBackWidth: 6, gridfinityLabelLeftWidth: 16, gridfinityLabelCorner: "chamfer" }),
      bin({ gridfinityLabelBack: true, gridfinityLabelCornerSize: 0, gridfinityLip: false }),
      bin({ ...big, gridfinityLabelBack: true, gridfinityLabelFront: true, gridfinityLabelLeft: true, gridfinityLabelRight: true, gridfinityLabelCornerSize: 2, gridfinityMagnets: true }),
    ]) {
      const solid = gridfinityPartSolid(cad, part);
      expect(cad.isValid(solid)).toBe(true);
      const exact = Math.abs(cad.getVolume(solid));
      expect(exact).toBeGreaterThan(Math.abs(cad.getVolume(gridfinityPartSolid(cad, { ...part, gridfinityLabelBack: false, gridfinityLabelFront: false, gridfinityLabelLeft: false, gridfinityLabelRight: false }))));
      expect(Math.abs(exact - meshVolume(part)) / exact).toBeLessThan(0.002);
      const box = cad.getBoundingBox(solid);
      const { min, max } = meshBounds(part);
      [box.xmin - min[0], box.ymin - min[1], box.zmin - min[2], box.xmax - max[0], box.ymax - max[1], box.zmax - max[2]].forEach((d) => expect(Math.abs(d)).toBeLessThan(0.01));
      // No sliver edges that the STEP file would carry: the mesh's nudge stays out of the exact body.
      expect(cad.getSubShapes(solid, "edge").filter((edge) => cad.getLength(edge) < 0.01)).toHaveLength(0);
    }
  });

  it("has the corner pieces and rounded ends in the exact body, kept to the 1.2 mm strip", () => {
    // A bin of 2 x 1 x 3 units: the top at 21 - 0.85 = 20.15, the strip down to 18.95. Columns 0.4 mm out from both faces.
    for (const [fields, x, z] of [
      [{ gridfinityLabelBack: true, gridfinityLabelLeft: true, gridfinityLabelRight: true }, -26.4, -5.4],
      [{ gridfinityLabelBack: true, gridfinityLabelLeft: true, gridfinityLabelRight: true, gridfinityLabelCorner: "chamfer" }, 26.4, -5.4],
      [{ gridfinityLabelBack: true, gridfinityLabelLeft: true, gridfinityLabelBackWidth: 6, gridfinityLabelLeftWidth: 16 }, -24.4, -13.4],
    ] as const) {
      const solid = gridfinityPartSolid(cad, bin(fields));
      expect(material(solid, x, z, 19.05, 20.05)).toBeCloseTo(0.09, 3);
      expect(material(solid, x, z, 15.9, 18.9)).toBe(0);
    }
    // A 36 mm front shelf from x -28 to 8: its front corner at x 8 is rounded away, the piece beside its end is there.
    const short = gridfinityPartSolid(cad, bin({ gridfinityLabelFront: true, gridfinityLabelFrontLength: 36, gridfinityLabelFrontOffset: -10 }));
    expect(material(short, 7.6, 6.2, 19.05, 20.05)).toBe(0);
    expect(material(short, 8.4, 19.4, 19.05, 20.05)).toBeCloseTo(0.09, 3);
  });

  it("keeps a label shelf 0.5 mm under the feet of a bin stacked on it", () => {
    const plain = gridfinityPartSolid(cad, bin({ width: 41.5, depth: 41.5 }));
    const shelved = gridfinityPartSolid(cad, bin({ width: 41.5, depth: 41.5, gridfinityLabelBack: true, gridfinityLabelLeft: true }));
    expect(overlap(shelved, cad.translate(plain, 0, 21 - 0.34, 0))).toBeLessThan(0.01);
    // Pushed 0.45 mm further down the feet cut into the lip only, as much as without shelves; 0.55 mm down they reach the shelves.
    const clear = cad.translate(plain, 0, 21 - 0.35 - 0.45, 0);
    expect(overlap(shelved, clear)).toBeCloseTo(overlap(plain, clear), 2);
    const sunk = cad.translate(plain, 0, 21 - 0.35 - 0.55, 0);
    expect(overlap(shelved, sunk)).toBeGreaterThan(overlap(plain, sunk) + 1);
  });
});
