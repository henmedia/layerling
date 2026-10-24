import { beforeAll, describe, expect, it, vi } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import manifoldModule, { type ManifoldToplevel } from "manifold-3d";
import { OcctKernel, type ShapeHandle } from "occt-wasm";
import type { CadModifierGridfinityPart } from "@/lib/cadModifierTypes";
import { GRIDFINITY_LIP_HEIGHT, GRIDFINITY_OPEN_WALL_KEYS, gridfinityCompartmentPieces, gridfinityDividerBound, gridfinityLabelledTriangles, gridfinityPlan, gridfinityTriangles } from "@/lib/gridfinityGeometry";
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
  return trianglesVolume(gridfinityLabelledTriangles(runtime, part));
}

function trianglesVolume(triangles: number[][][]) {
  return triangles.reduce((sum, [a, b, c]) => sum + (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6, 0);
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

  it("joins finger scoops to a bin as one valid solid with the mesh's volume and box", () => {
    for (const part of [
      bin({ gridfinityScoopFront: true }),
      bin({ gridfinityScoopLeft: true, gridfinityLip: false }),
      bin({ gridfinityScoopFront: true, gridfinityScoopBack: true, gridfinityScoopLeft: true, gridfinityScoopRight: true }),
      bin({ gridfinityScoopFront: true, gridfinityScoopRadius: 5.9, height: 14 + GRIDFINITY_LIP_HEIGHT }),
      // At the smallest radius, 3.5 mm.
      bin({ gridfinityScoopFront: true, height: 14 + GRIDFINITY_LIP_HEIGHT }),
      bin({ gridfinityScoopFront: true, gridfinityLabelBack: true, gridfinityLabelFront: true, gridfinityLabelLeft: true }),
      bin({ width: 125.5, depth: 83.5, height: 42 + GRIDFINITY_LIP_HEIGHT, gridfinityScoopFront: true, gridfinityScoopRight: true, gridfinityMagnets: true }),
      // 9.628 mm runs the circle within 0.0001 mm of the corner of the floor's rounding, where the kernel's cut left the scoop out.
      bin({ height: 28 + GRIDFINITY_LIP_HEIGHT, gridfinityScoopBack: true, gridfinityScoopRadius: 9.628 }),
      // Three scoops and two shelves, which the kernel could not join into one solid.
      bin({ gridfinityMagnets: true, gridfinityScoopFront: true, gridfinityScoopLeft: true, gridfinityScoopRight: true, gridfinityScoopRadius: 8.311816090345383, gridfinityLabelBack: true, gridfinityLabelBackWidth: 6.03737735748291, gridfinityLabelRight: true, gridfinityLabelRightWidth: 19.5444598197937, gridfinityLabelRightOffset: 17.949329614639282, gridfinityLabelCorner: "chamfer" }),
    ]) {
      const solid = gridfinityPartSolid(cad, part);
      expect(cad.isValid(solid)).toBe(true);
      const exact = Math.abs(cad.getVolume(solid));
      // Over the bin's own mesh, floor rounding included, the scoops add at least half as much to the exact body as to the mesh;
      // the next line holds the two within 0.2 %.
      const plain = trianglesVolume(gridfinityTriangles(part));
      expect(exact - plain).toBeGreaterThan((meshVolume(part) - plain) / 2);
      expect(Math.abs(exact - meshVolume(part)) / exact).toBeLessThan(0.002);
      const box = cad.getBoundingBox(solid);
      const { min, max } = meshBounds(part);
      [box.xmin - min[0], box.ymin - min[1], box.zmin - min[2], box.xmax - max[0], box.ymax - max[1], box.zmax - max[2]].forEach((d) => expect(Math.abs(d)).toBeLessThan(0.01));
      // No sliver edges; the floor's rounded corners are spheres, whose poles are edges of no length in any exact body.
      expect(cad.getSubShapes(solid, "edge").filter((edge) => cad.getLength(edge) > 1e-9 && cad.getLength(edge) < 0.01)).toHaveLength(0);
    }
  });

  it("rounds the floor into the wall along the scoop's quarter circle", () => {
    // The front wall of a 2 x 1 x 3 bin with the lip: inside at z = 19.8, floor at 5.95, r 6.7 (centre 6.68 out and
    // 12.63 up). A column 1.35 to 1.65 mm out from the wall is full up to the circle at 1.65 mm, 12.63 - sqrt(6.7^2 - 5.03^2)
    // = 8.20, and empty above it at 1.35 mm, 12.63 - sqrt(6.7^2 - 5.33^2) = 8.57.
    const solid = gridfinityPartSolid(cad, bin({ gridfinityScoopFront: true }));
    expect(material(solid, 0, 18.3, 6, 8.1)).toBeCloseTo(0.09 * 2.1, 3);
    expect(material(solid, 0, 18.3, 8.7, 12)).toBe(0);
  });

  it("builds half-size bins as one valid solid with the mesh's volume, and four of their feet stand in one socket", () => {
    for (const part of [
      bin({ gridfinityHalfGrid: true, width: 20.5, depth: 20.5 }),
      bin({ gridfinityHalfGrid: true, width: 62.5, depth: 41.5, gridfinityMagnets: true }),
      bin({ gridfinityHalfGrid: true, width: 41.5, depth: 20.5, gridfinityLip: false, gridfinityMagnets: true, gridfinityScoopFront: true }),
    ]) {
      const solid = gridfinityPartSolid(cad, part);
      expect(cad.isValid(solid)).toBe(true);
      const exact = Math.abs(cad.getVolume(solid));
      expect(Math.abs(exact - meshVolume(part)) / exact).toBeLessThan(0.002);
    }
    // A bin of 2 x 2 half units in a baseplate of one unit: seated 0.25 mm up it touches nothing; 0.3 mm sideways it would.
    const quarters = cad.translate(gridfinityPartSolid(cad, bin({ gridfinityHalfGrid: true, width: 41.5, depth: 41.5 })), 0, 0.25, 0);
    const socket = gridfinityPartSolid(cad, plate({ width: 42, depth: 42 }));
    expect(overlap(quarters, socket)).toBeLessThan(0.01);
    expect(overlap(cad.translate(quarters, 0.3, 0, 0), socket)).toBeGreaterThan(1);
  });

  it("raises the floor as one valid solid with the mesh's volume and box, up to a solid block", () => {
    for (const part of [
      bin({ gridfinityFloorHeight: 10 }),
      // The highest with the lip, 21 - 1.65, and just under it, which is raised onto it.
      bin({ gridfinityFloorHeight: 19.35, gridfinityMagnets: true }),
      bin({ gridfinityFloorHeight: 19.33 }),
      // Without the lip up to the top: no inside at all.
      bin({ gridfinityLip: false, height: 21, gridfinityFloorHeight: 21 }),
      bin({ gridfinityLip: false, height: 21, gridfinityFloorHeight: 20.99 }),
      bin({ height: 42 + GRIDFINITY_LIP_HEIGHT, gridfinityFloorHeight: 20, gridfinityScoopFront: true, gridfinityScoopRight: true, gridfinityLabelBack: true }),
      bin({ gridfinityHalfGrid: true, width: 20.5, depth: 41.5, gridfinityFloorHeight: 12 }),
    ]) {
      const solid = gridfinityPartSolid(cad, part);
      expect(cad.isValid(solid)).toBe(true);
      const exact = Math.abs(cad.getVolume(solid));
      expect(Math.abs(exact - meshVolume(part)) / exact).toBeLessThan(0.002);
      const box = cad.getBoundingBox(solid);
      const { min, max } = meshBounds(part);
      [box.xmin - min[0], box.ymin - min[1], box.zmin - min[2], box.xmax - max[0], box.ymax - max[1], box.zmax - max[2]].forEach((d) => expect(Math.abs(d)).toBeLessThan(0.01));
      expect(cad.getSubShapes(solid, "edge").filter((edge) => cad.getLength(edge) > 1e-9 && cad.getLength(edge) < 0.01)).toHaveLength(0);
    }
    // The solid block has one flat top, with no seam where an inside would have been cut.
    const block = gridfinityPartSolid(cad, bin({ gridfinityLip: false, height: 21, gridfinityFloorHeight: 21 }));
    const tops = cad.getSubShapes(block, "face").filter((face) => { const b = cad.getBoundingBox(face); return Math.abs(b.ymin - 21) < 1e-6 && Math.abs(b.ymax - 21) < 1e-6; });
    expect(tops).toHaveLength(1);
    // A bin stacked on one raised to the highest sits as on a plain one, its feet 1.3 mm above the floor: pushed 1.25 mm
    // further down they cut into the lip only, as much as on a plain bin; 1.35 mm down they reach the floor.
    const plain = gridfinityPartSolid(cad, bin({ width: 41.5, depth: 41.5 }));
    const raised = gridfinityPartSolid(cad, bin({ width: 41.5, depth: 41.5, gridfinityFloorHeight: 19.35 }));
    expect(overlap(raised, cad.translate(plain, 0, 21 - 0.34, 0))).toBeLessThan(0.01);
    const clear = cad.translate(plain, 0, 21 - 0.35 - 1.25, 0);
    expect(overlap(raised, clear)).toBeCloseTo(overlap(plain, clear), 2);
    const sunk = cad.translate(plain, 0, 21 - 0.35 - 1.35, 0);
    expect(overlap(raised, sunk)).toBeGreaterThan(overlap(plain, sunk) + 1);
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

describe("exact Gridfinity bins with dividers", () => {
  /** A bin of 2 x 1 x 3 units, 3 compartments across and 2 deep, dividers at x = -13.8 and 13.8 and z = 0. */
  const divided = (extra: Partial<CadModifierGridfinityPart> = {}) => bin({ gridfinityCompartmentsX: 3, gridfinityCompartmentsZ: 2, ...extra });
  /** The mesh holds the dividers (the plain bin is what Manifold falls back on) and matches the exact body's volume and box. */
  const expectMeshOf = (part: CadModifierGridfinityPart, solid: ShapeHandle) => {
    const context = JSON.stringify(part);
    const exact = Math.abs(cad.getVolume(solid));
    const plain = trianglesVolume(gridfinityTriangles(part));
    expect(meshVolume(part), context).toBeGreaterThan(plain + gridfinityDividerBound(gridfinityPlan(part), gridfinityCompartmentPieces(part)!));
    expect(Math.abs(exact - meshVolume(part)) / exact, context).toBeLessThan(0.002);
    const box = cad.getBoundingBox(solid);
    const { min, max } = meshBounds(part);
    [box.xmin - min[0], box.ymin - min[1], box.zmin - min[2], box.xmax - max[0], box.ymax - max[1], box.zmax - max[2]].forEach((d) => expect(Math.abs(d), context).toBeLessThan(0.01));
  };
  const shortEdges = (solid: ShapeHandle) => cad.getSubShapes(solid, "edge").filter((edge) => cad.getLength(edge) > 1e-9 && cad.getLength(edge) < 0.01);

  it("builds a bin of 3 x 2 compartments with a front scoop in every row as one valid solid of the volume measured", () => {
    const solid = gridfinityPartSolid(cad, divided({ gridfinityScoopFront: true }));
    expect(cad.isValid(solid)).toBe(true);
    expect(cad.isSolid(solid) ? 1 : cad.getSubShapes(solid, "solid").length).toBe(1);
    // 28347.64 mm³, measured with OCCT when this was written.
    expect(Math.abs(Math.abs(cad.getVolume(solid)) - 28347.64)).toBeLessThan(0.05);
    expect(shortEdges(solid)).toHaveLength(0);
    expectMeshOf(divided({ gridfinityScoopFront: true }), solid);
  });

  it("draws bins with dividers as the exact body has them, within 0.2 % and 0.01 mm", () => {
    for (const part of [
      divided(),
      divided({ gridfinityLip: false, height: 21, gridfinityScoopFront: true, gridfinityScoopLeft: true }),
      divided({ gridfinityScoopFront: true, gridfinityScoopBack: true, gridfinityScoopLeft: true, gridfinityScoopRight: true }),
      divided({ gridfinityDividerPositionsX: [10, 60.3], gridfinityDividerPositionsZ: [25.5], gridfinityDividerThickness: 2, gridfinityScoopBack: true }),
      divided({ gridfinityMagnets: true, gridfinityFloorHeight: 10, gridfinityScoopFront: true }),
      bin({ gridfinityHalfGrid: true, width: 41.5, depth: 41.5, gridfinityCompartmentsX: 2, gridfinityCompartmentsZ: 2, gridfinityScoopFront: true }),
      bin({ gridfinityCompartmentsZ: 2, gridfinityDividerPositionsZ: [8.1], gridfinityScoopFront: true, gridfinityScoopBack: true }),
      bin({ width: 125.5, depth: 83.5, height: 28 + GRIDFINITY_LIP_HEIGHT, gridfinityCompartmentsX: 4, gridfinityCompartmentsZ: 3, gridfinityScoopFront: true }),
    ]) expectMeshOf(part, gridfinityPartSolid(cad, part));
  });

  it("repeats the front scoop against the middle divider and rounds every compartment's floor into the dividers", () => {
    const solid = gridfinityPartSolid(cad, divided({ gridfinityScoopFront: true }));
    // r 6.7, centre 6.68 out from the face and 12.63 up: full to 8.20 at 1.65 mm out and empty above 8.57 at 1.35 mm, against
    // the middle divider's back face (z -0.6) in the back row as against the front wall (z 19.8) in the front row.
    for (const z of [-2.1, 18.3]) {
      expect(material(solid, 0, z, 6, 8.1), `${z}`).toBeCloseTo(0.09 * 2.1, 3);
      expect(material(solid, 0, z, 8.7, 12), `${z}`).toBe(0);
    }
    // In the front row the floor's 2.8 mm rounding against the divider's front face (z 0.6): full to 7.02 at 0.6 mm out,
    // empty above 7.49 at 0.3 mm.
    expect(material(solid, 0, 1.05, 6, 7)).toBeCloseTo(0.09, 3);
    expect(material(solid, 0, 1.05, 7.5, 12)).toBe(0);
    // Where the dividers meet, outside the compartments' rounded corners, they are solid from the floor to their top.
    expect(material(solid, 12.9, -0.9, 6, 20)).toBeCloseTo(0.09 * 14, 3);
    expect(material(solid, 0, 0, 20.2, 21)).toBe(0);
  });

  it("makes a compartment's scoop smaller where the bin's would leave less than 2 mm of floor, and leaves out facing ones that do not fit", () => {
    // A back row 7.5 mm deep takes its front scoop at 7.5 - 2 = 5.5 mm (centre 5.48 out): full to 7.48 at 1.65 mm from
    // the divider and empty above 7.80 at 1.35 mm, where the bin's 6.7 mm would reach 8.57.
    const smaller = gridfinityPartSolid(cad, bin({ gridfinityCompartmentsZ: 2, gridfinityDividerPositionsZ: [8.1], gridfinityScoopFront: true }));
    // Facing scoops in that row would leave no floor even at 3.5 mm: only the floor's rounding is left, 6.36 high at 1.35 mm.
    const without = gridfinityPartSolid(cad, bin({ gridfinityCompartmentsZ: 2, gridfinityDividerPositionsZ: [8.1], gridfinityScoopFront: true, gridfinityScoopBack: true }));
    // In a row 9 mm deep both stay at 3.5 mm: full to 6.45 at 1.65 mm, where the rounding alone reaches 6.20.
    const facing = gridfinityPartSolid(cad, bin({ gridfinityCompartmentsZ: 2, gridfinityDividerPositionsZ: [9.6], gridfinityScoopFront: true, gridfinityScoopBack: true }));
    for (const solid of [smaller, without, facing]) {
      expect(cad.isValid(solid)).toBe(true);
      expect(cad.isSolid(solid) ? 1 : cad.getSubShapes(solid, "solid").length).toBe(1);
      expect(shortEdges(solid)).toHaveLength(0);
    }
    expect(material(smaller, 0, -13.8, 6, 7.45)).toBeCloseTo(0.09 * 1.45, 3);
    expect(material(smaller, 0, -13.8, 7.85, 12)).toBe(0);
    expect(material(without, 0, -13.8, 6.4, 12)).toBe(0);
    expect(material(without, 0, -16.2, 6.4, 12)).toBe(0);
    expect(material(facing, 0, -12.3, 6, 6.44)).toBeCloseTo(0.09 * 0.44, 3);
    // The front row keeps both of its scoops at the bin's 6.7 mm.
    expect(material(without, 0, 18.3, 6, 8.1)).toBeCloseTo(0.09 * 2.1, 3);
  });

  it("adds the dividers and every compartment's rounded floor to a bin without the lip, as calculated by hand", () => {
    // Without a scoop the plain bin's floor is sharp. The dividers: 3224.63 mm² of inside less six compartments of 500.15
    // mm², 14.2 mm high, 3176.96 mm³; each compartment's 2.8 mm floor rounding, 68.8 mm of straight edge at 1.6825 mm²
    // and four corners of pi r³ / 12, 138.743 mm³, 832.46 for six. 4009.42 mm³ in all.
    const plain = gridfinityPartSolid(cad, bin({ gridfinityLip: false, height: 21 }));
    const solid = gridfinityPartSolid(cad, divided({ gridfinityLip: false, height: 21 }));
    expect(cad.isValid(solid)).toBe(true);
    expect(Math.abs(Math.abs(cad.getVolume(solid)) - Math.abs(cad.getVolume(plain)) - 4009.42)).toBeLessThan(0.05);
    expect(shortEdges(solid)).toHaveLength(0);
    expectMeshOf(divided({ gridfinityLip: false, height: 21 }), solid);
  });

  it("builds a different label in each compartment with the label volume measured and the mesh's", () => {
    const labels = [
      { column: 0, row: 0, side: "back" as const },
      { column: 1, row: 0, side: "back" as const, length: 50 },
      { column: 2, row: 0, side: "back" as const, length: 30, align: "end" as const },
      { column: 0, row: 1, side: "back" as const, length: 30, align: "start" as const },
      { column: 1, row: 1, side: "back" as const },
      { column: 2, row: 1, side: "right" as const, length: 50 },
    ].map((label) => ({ ...label, width: 8 }));
    const part = divided({ gridfinityScoopFront: true, gridfinityCompartmentLabels: labels });
    const solid = gridfinityPartSolid(cad, part);
    expect(cad.isValid(solid)).toBe(true);
    expect(cad.isSolid(solid) ? 1 : cad.getSubShapes(solid, "solid").length).toBe(1);
    // The six labels add 2943.71 mm³ to the bin without them, measured with OCCT when this was written.
    const without = Math.abs(cad.getVolume(gridfinityPartSolid(cad, divided({ gridfinityScoopFront: true }))));
    expect(Math.abs(Math.abs(cad.getVolume(solid)) - without - 2943.7)).toBeLessThan(0.1);
    expect(shortEdges(solid)).toHaveLength(0);
    expectMeshOf(part, solid);
  });

  it("puts a label on a divider's face and on the end wall, as calculated by hand, and with its corners", () => {
    // Width 8, half its side long, no corners: a section of 1.2 x 8 + tan 36 x 8² / 2 = 32.8494 mm², its bottom at the face
    // 20.15 - 1.2 - 8 tan 36 = 13.14, clear of the floor's rounding. On the middle divider's back face 13.2 mm long, on the
    // left divider's right face 9.6; on the right wall the lip's support already holds 0.8 x 0.8 / 2 of the section.
    const section = 1.2 * 8 + Math.tan((36 * Math.PI) / 180) * 32;
    for (const [label, expected] of [
      [{ column: 1, row: 0, side: "front" }, section * 13.2],
      [{ column: 1, row: 0, side: "left" }, section * 9.6],
      [{ column: 2, row: 1, side: "right" }, (section - 0.32) * 9.6],
    ] as const) {
      const without = Math.abs(cad.getVolume(gridfinityPartSolid(cad, divided())));
      const flat = gridfinityPartSolid(cad, divided({ gridfinityLabelCornerSize: 0, gridfinityCompartmentLabels: [{ ...label, length: 50, width: 8 }] }));
      expect(Math.abs(Math.abs(cad.getVolume(flat)) - without - expected), label.side).toBeLessThan(0.05);
      for (const corner of [{ gridfinityLabelCornerSize: 2 }, { gridfinityLabelCornerSize: 2, gridfinityLabelCorner: "chamfer" as const }]) {
        const part = divided({ ...corner, gridfinityCompartmentLabels: [{ ...label, length: 50, width: 8 }] });
        const solid = gridfinityPartSolid(cad, part);
        expect(cad.isValid(solid), label.side).toBe(true);
        expect(cad.isSolid(solid) ? 1 : cad.getSubShapes(solid, "solid").length, label.side).toBe(1);
        expect(shortEdges(solid), label.side).toHaveLength(0);
        expectMeshOf(part, solid);
      }
    }
  });

  it("refuses a bin whose compartments, dividers or labels the kernel lost instead of building it without them", () => {
    // A fuse that drops a compartment, as a kernel that gets one wrong would: its volume is under the bound.
    const fuseAll = cad.fuseAll.bind(cad);
    const fuse = vi.spyOn(cad, "fuseAll").mockImplementation((shapes) => fuseAll(shapes.length === 7 ? shapes.slice(0, -1) : shapes));
    try {
      expect(() => gridfinityPartSolid(cad, divided({ gridfinityScoopFront: true }))).toThrow("The Gridfinity bin's compartments could not be cut");
    } finally {
      fuse.mockRestore();
    }
    // A cutter that comes back as the whole inside cuts the dividers away with it: what is left is under the bound.
    const common = vi.spyOn(cad, "common").mockImplementationOnce((_, inside) => inside);
    try {
      expect(() => gridfinityPartSolid(cad, divided({ gridfinityScoopFront: true }))).toThrow("The Gridfinity bin's dividers could not be cut");
    } finally {
      common.mockRestore();
    }
    // A cutter that takes one divider away with the compartments beside it: 753.6 mm³ less, over the 310 the bound leaves.
    const merged = vi.spyOn(cad, "fuseAll").mockImplementation((shapes) => fuseAll(shapes.length === 7 ? [...shapes, cad.makeBoxFromCorners({ x: -14.45, y: -19.85, z: 5 }, { x: -13.15, y: 19.85, z: 21 })] : shapes));
    try {
      expect(() => gridfinityPartSolid(cad, divided({ gridfinityScoopFront: true }))).toThrow("The Gridfinity bin's dividers could not be cut");
    } finally {
      merged.mockRestore();
    }
    // On a floor raised to 17.15 the dividers stand 3 mm: losing the stretch of one between the back wall and the other
    // divider, 1.2 x 19.2 x 3 mm less where the lip's support leans over it, is still more than the 24 mm³ the bounds leave.
    const stretch = vi.spyOn(cad, "fuseAll").mockImplementation((shapes) => fuseAll(shapes.length === 7 ? [...shapes, cad.makeBoxFromCorners({ x: -14.45, y: 0.65, z: 17 }, { x: -13.15, y: 19.85, z: 21 })] : shapes));
    try {
      expect(() => gridfinityPartSolid(cad, divided({ gridfinityFloorHeight: 17.15 }))).toThrow("The Gridfinity bin's dividers could not be cut");
    } finally {
      stretch.mockRestore();
    }
    // A shelf lost when it is cut to its compartment (the second common, after the cutter's).
    const meet = cad.common.bind(cad);
    let calls = 0;
    const clip = vi.spyOn(cad, "common").mockImplementation((shape, tool) => (++calls === 2 ? meet(shape, cad.translate(tool, 1000, 0, 0)) : meet(shape, tool)));
    try {
      expect(() => gridfinityPartSolid(cad, divided({ gridfinityCompartmentLabels: [{ column: 1, row: 0, side: "back" }] }))).toThrow("The Gridfinity bin's labels could not be joined");
    } finally {
      clip.mockRestore();
    }
    // A fuse of the bin with its one label, without corners a single shelf, that comes back as the bin alone.
    const joined = vi.spyOn(cad, "fuseAll").mockImplementation((shapes) => (shapes.length === 2 ? shapes[0] : fuseAll(shapes)));
    try {
      expect(() => gridfinityPartSolid(cad, divided({ gridfinityLabelCornerSize: 0, gridfinityCompartmentLabels: [{ column: 1, row: 0, side: "back" }] }))).toThrow("The Gridfinity bin's labels could not be joined");
    } finally {
      joined.mockRestore();
    }
    // The dividers' bound against the real volumes: the bin with them holds more than the plain bin by more than the
    // bound, while a bin cut to its whole inside holds at most the 0.01 mm the inside reaches over the top (83.5 x 41.5 x
    // 0.01, under 35 mm³) more than the check takes as cut away, far under the bound.
    const bound = gridfinityDividerBound(gridfinityPlan(divided()), gridfinityCompartmentPieces(divided())!);
    const whole = Math.abs(cad.getVolume(gridfinityPartSolid(cad, bin())));
    const kept = Math.abs(cad.getVolume(gridfinityPartSolid(cad, divided())));
    expect(kept - whole).toBeGreaterThan(bound);
    expect(bound).toBeGreaterThan(83.5 * 41.5 * 0.01);
  });
});

describe("exact Gridfinity bins with dividers, one of each hazard", () => {
  /** One valid solid without edges under 0.01 mm (a sphere's pole is an edge of no length in any exact body). */
  const expectClean = (part: CadModifierGridfinityPart) => {
    const context = JSON.stringify(part);
    const solid = gridfinityPartSolid(cad, part);
    expect(cad.isValid(solid), context).toBe(true);
    expect(cad.isSolid(solid) ? 1 : cad.getSubShapes(solid, "solid").length, context).toBe(1);
    expect(cad.getSubShapes(solid, "edge").filter((edge) => cad.getLength(edge) > 1e-9 && cad.getLength(edge) < 0.01), context).toHaveLength(0);
    return solid;
  };
  const divided = (extra: Partial<CadModifierGridfinityPart> = {}) => bin({ gridfinityCompartmentsX: 3, gridfinityCompartmentsZ: 2, ...extra });
  /** A bin of 3 x 2 x 4 units. */
  const big = { width: 125.5, depth: 83.5, height: 28 + GRIDFINITY_LIP_HEIGHT };

  it("builds 6 x 6 compartments in a bin of 3 x 2 x 4 units with a front scoop and a label in each", () => {
    const labels = Array.from({ length: 36 }, (_, i) => ({ column: i % 6, row: Math.floor(i / 6), side: "back" as const, length: 50 }));
    expectClean(bin({ ...big, gridfinityScoopFront: true, gridfinityScoopRadius: 10.2, gridfinityCompartmentsX: 6, gridfinityCompartmentsZ: 6, gridfinityCompartmentLabels: labels }));
  });

  it("builds label ends 0.005 mm from the compartment's corner rounding and from where its end piece's edge would meet it, round and chamfered", () => {
    // The middle compartment's rounding starts at 10.4 from its middle: an end there at 20.8 / 26.4 of the side, an end
    // piece's edge there with the end at 8.4 (start, 21.6 / 26.4). Unsnapped, 0.005 mm off left edges under 0.01 mm.
    for (const corner of ["round", "chamfer"] as const) {
      expectClean(divided({ gridfinityLabelCorner: corner, gridfinityCompartmentLabels: [{ column: 1, row: 0, side: "back", length: (20.81 / 26.4) * 100 }] }));
      expectClean(divided({ gridfinityLabelCorner: corner, gridfinityCompartmentLabels: [{ column: 1, row: 0, side: "back", length: (21.605 / 26.4) * 100, align: "start" }] }));
    }
  });

  it("builds every corner size with full, half and part labels in every compartment, round and chamfered", () => {
    // Width 8: at the widest, 12.7 with a 0.5 mm corner, the shelf's underside crosses the scoop
    // 0.014 mm from the end piece's edge, which leaves edges of 0.0002 mm, as a 1.92.2 wall shelf of that width does.
    const labels = [
      { column: 0, row: 0, side: "back" as const },
      { column: 1, row: 0, side: "front" as const, length: 50 },
      { column: 2, row: 0, side: "left" as const, length: 30, align: "start" as const },
      { column: 0, row: 1, side: "right" as const, length: 50 },
      { column: 1, row: 1, side: "back" as const, length: 30, align: "start" as const },
      { column: 2, row: 1, side: "right" as const },
    ];
    for (const [size, corner] of [[0.5, "round"], [2, "chamfer"], [5, "round"], [10, "chamfer"]] as const) {
      expectClean(divided({ gridfinityLabelCornerSize: size, gridfinityLabelCorner: corner, gridfinityCompartmentLabels: labels.map((label) => ({ ...label, width: 8 })), gridfinityScoopFront: true }));
    }
  });

  it("builds labels on 6 mm compartments, the shortest of 4 mm built and 10 % of 6 mm left out", () => {
    // The back row 6 mm deep: no back label fits, a left one along 6 mm does; 70 % of it is 4.2 mm, 10 % only 0.6.
    for (const length of [100, 70, 10]) expectClean(divided({ gridfinityDividerPositionsZ: [6.6], gridfinityCompartmentLabels: [{ column: 1, row: 0, side: "left", length }] }));
  });

  it("builds bins with dividers with magnets, on the half-size grid, on a raised floor, 2 units high and without the lip", () => {
    for (const part of [
      divided({ gridfinityMagnets: true, gridfinityScoopFront: true, gridfinityCompartmentLabels: [{ column: 0, row: 0, side: "back" }] }),
      bin({ gridfinityHalfGrid: true, width: 20.5, depth: 20.5, gridfinityCompartmentsX: 2, gridfinityCompartmentsZ: 2, gridfinityScoopFront: true }),
      divided({ gridfinityFloorHeight: 10, gridfinityScoopFront: true, gridfinityCompartmentLabels: [{ column: 1, row: 1, side: "back", width: 6 }] }),
      divided({ height: 14, gridfinityLip: false, gridfinityScoopFront: true }),
      divided({ gridfinityLip: false, height: 21, gridfinityScoopFront: true, gridfinityCompartmentLabels: [{ column: 2, row: 1, side: "right", length: 50 }] }),
    ]) expectClean(part);
  });

  it("builds scoops on all four walls of every compartment, and on the back and the right without the lip", () => {
    expectClean(divided({ gridfinityScoopFront: true, gridfinityScoopBack: true, gridfinityScoopLeft: true, gridfinityScoopRight: true }));
    expectClean(divided({ gridfinityLip: false, height: 21, gridfinityScoopBack: true, gridfinityScoopRight: true }));
  });

  it("builds facing scoops in rows 6, 7.5 and 9 mm deep, leaving them out of the first two", () => {
    for (const row of [6, 7.5, 9]) {
      const solid = expectClean(bin({ gridfinityCompartmentsZ: 2, gridfinityDividerPositionsZ: [row + 0.6], gridfinityScoopFront: true, gridfinityScoopBack: true }));
      // 1.5 mm from the divider the back row is filled to 6.44 by the 3.5 mm scoop, to only 6.20 by the floor's rounding.
      const z = -19.8 + row - 1.5;
      if (row === 9) expect(material(solid, 0, z, 6, 6.44)).toBeCloseTo(0.09 * 0.44, 3);
      else expect(material(solid, 0, z, 6.4, 12)).toBe(0);
    }
  });

  it("builds adjacent scoops in a square compartment 6 mm wide, at 3.5 mm with the lip and at the bin's largest radius without", () => {
    for (const [lip, radius] of [[{}, 3.5], [{ gridfinityLip: false, height: 21 }, 14.55]] as const) {
      expectClean(bin({ ...lip, gridfinityCompartmentsX: 2, gridfinityCompartmentsZ: 2, gridfinityDividerPositionsX: [6.6], gridfinityDividerPositionsZ: [6.6], gridfinityScoopFront: true, gridfinityScoopLeft: true, gridfinityScoopRadius: radius }));
    }
  });
});

describe("exact Gridfinity bins with every side closed, unchanged by open sides", () => {
  it("builds the same solids as before open sides came in, also with every side switched off", () => {
    // Taken before open sides came in (#682): volume, faces and edges of the one solid.
    const closed = { gridfinityOpenBack: false, gridfinityOpenFront: false, gridfinityOpenLeft: false, gridfinityOpenRight: false };
    for (const [part, volume, faces, edges] of [
      [bin(), 23248.7382, 100, 210],
      [bin({ gridfinityScoopFront: true }), 24249.8297, 108, 228],
      [bin({ gridfinityLabelBack: true, gridfinityLabelLeft: true, gridfinityLabelRight: true }), 35470.5361, 127, 285],
      [bin({ gridfinityCompartmentsX: 3, gridfinityCompartmentsZ: 2, gridfinityScoopFront: true, gridfinityCompartmentLabels: [{ column: 1, row: 1, side: "back" }] }), 29877.6412, 203, 481],
      [bin({ gridfinityLip: false, height: 21 }), 21312.6174, 69, 154],
    ] as const) {
      for (const each of [part, { ...part, ...closed }]) {
        const context = JSON.stringify(each);
        const solid = gridfinityPartSolid(cad, each);
        expect(Math.abs(Math.abs(cad.getVolume(solid)) - volume), context).toBeLessThan(1e-4);
        expect(cad.isSolid(solid) ? 1 : cad.getSubShapes(solid, "solid").length, context).toBe(1);
        expect(cad.getSubShapes(solid, "face"), context).toHaveLength(faces);
        expect(cad.getSubShapes(solid, "edge"), context).toHaveLength(edges);
      }
    }
  });
});

describe("exact Gridfinity bins with open sides", () => {
  const all = { gridfinityOpenBack: true, gridfinityOpenFront: true, gridfinityOpenLeft: true, gridfinityOpenRight: true };
  const keys = Object.values(GRIDFINITY_OPEN_WALL_KEYS);
  /** Every one of the 15 ways to open one side or more. */
  const openings = Array.from({ length: 15 }, (_, k) => Object.fromEntries(keys.filter((_, i) => (k + 1) & (1 << i)).map((key) => [key, true])) as Partial<CadModifierGridfinityPart>);
  /** One valid solid without edges under 0.01 mm, with the mesh's volume and box. */
  const expectOpen = (part: CadModifierGridfinityPart) => {
    const context = JSON.stringify(part);
    const solid = gridfinityPartSolid(cad, part);
    expect(cad.isValid(solid), context).toBe(true);
    expect(cad.isSolid(solid) ? 1 : cad.getSubShapes(solid, "solid").length, context).toBe(1);
    const exact = Math.abs(cad.getVolume(solid));
    expect(Math.abs(exact - meshVolume(part)) / exact, context).toBeLessThan(0.002);
    const box = cad.getBoundingBox(solid);
    const { min, max } = meshBounds(part);
    [box.xmin - min[0], box.ymin - min[1], box.zmin - min[2], box.xmax - max[0], box.ymax - max[1], box.zmax - max[2]].forEach((d) => expect(Math.abs(d), context).toBeLessThan(0.01));
    expect(cad.getSubShapes(solid, "edge").filter((edge) => cad.getLength(edge) > 1e-9 && cad.getLength(edge) < 0.01), context).toHaveLength(0);
    return solid;
  };

  it("builds every open bin as one valid solid with the mesh's volume and box, with the lip and without", () => {
    for (const opening of openings) {
      for (const extra of [{}, { gridfinityLip: false, height: 21 }, { gridfinityMagnets: true }]) expectOpen(bin({ ...opening, ...extra }));
    }
  });

  it("builds every open bin on the half-size grid, on a raised floor and 1 height unit high", () => {
    for (const opening of openings) {
      for (const extra of [{ gridfinityHalfGrid: true, width: 20.5, depth: 41.5 }, { gridfinityFloorHeight: 12.5 }, { height: 7 + GRIDFINITY_LIP_HEIGHT }]) expectOpen(bin({ ...opening, ...extra }));
    }
  });

  it("takes the wall and the lip off an open side, as calculated by hand", () => {
    // As for the mesh, with true arcs (k = 1 - pi / 4): open at the front, 124.6367 for the square outer corners less
    // 1815.2595 of wall and 57.9846 of the inner corners' rounding. All four open: the feet, 13729.1472, and the floor on them.
    for (const [fields, volume] of [
      [{}, 23248.7382],
      [{ gridfinityOpenFront: true }, 21500.1308],
      [{ gridfinityOpenLeft: true }, 22443.3983],
      [{ gridfinityOpenFront: true, gridfinityOpenBack: true }, 19751.5235],
      [{ gridfinityOpenFront: true, gridfinityOpenLeft: true }, 20631.4418],
      [all, 13729.1472 + 83.5 * 41.5 * 1.2],
    ] as const) {
      expect(Math.abs(cad.getVolume(gridfinityPartSolid(cad, bin(fields)))), JSON.stringify(fields)).toBeCloseTo(volume, 1);
    }
  });

  it("runs the walls beside an open side out to the outline, where they end square, and leaves only the floor between them", () => {
    const solid = gridfinityPartSolid(cad, bin({ gridfinityOpenFront: true }));
    // A column in the left wall 0.2 mm in from the outline at the front is full from the floor up to under the lip's top.
    expect(material(solid, -41.75 + 0.45, 20.75 - 0.2, 6, 24.5)).toBeCloseTo(0.09 * 18.5, 3);
    // Between the walls the same column holds only the floor, 1.2 mm on the feet.
    expect(material(solid, 0, 20.75 - 0.2, 4.75, 25.4)).toBeCloseTo(0.09 * 1.2, 3);
  });

  it("stands two open bins side by side 0.5 mm apart, as two closed bins stand", () => {
    for (const [a, b, along] of [[{ gridfinityOpenRight: true }, { gridfinityOpenLeft: true }, "x"], [{ gridfinityOpenFront: true }, { gridfinityOpenBack: true }, "z"]] as const) {
      const first = gridfinityPartSolid(cad, bin({ width: 41.5, ...a }));
      const second = gridfinityPartSolid(cad, bin({ width: 41.5, ...b }));
      const at = (d: number) => (along === "x" ? cad.translate(second, d, 0, 0) : cad.translate(second, 0, 0, d));
      expect(overlap(first, at(42)), along).toBeLessThan(0.01);
      expect(overlap(first, at(41)), along).toBeGreaterThan(1);
      // The walls' ends either side of the gap: the first bin's ends at 20.75, the second's start at 21.25.
      const column = (solid: ShapeHandle, d: number) => (along === "x" ? material(solid, d, -20.3, 6, 24) : material(solid, -20.3, d, 6, 24));
      expect(column(first, 20.6), along).toBeGreaterThan(0.5);
      expect(column(at(42), 21.4), along).toBeGreaterThan(0.5);
      expect(column(first, 21) + column(at(42), 21), along).toBe(0);
    }
  });

  it("seats an open bin in the baseplate 0.25 mm up, its square corners on the plate's top", () => {
    for (const [binSize, plateSize] of [[41.5, 42], [83.5, 84]]) {
      const b = gridfinityPartSolid(cad, bin({ width: binSize, depth: binSize, gridfinityOpenFront: true }));
      const p = gridfinityPartSolid(cad, plate({ width: plateSize, depth: plateSize }));
      expect(overlap(cad.translate(b, 0, 0.25, 0), p)).toBeLessThan(0.01);
    }
  });

  it("keeps the floor flat out to an open side beside a scoop, which runs out with its wall", () => {
    const solid = expectOpen(bin({ gridfinityScoopLeft: true, gridfinityOpenFront: true }));
    expect(material(solid, 0, 20.6, 4.75, 25.4)).toBeCloseTo(0.09 * 1.2, 3);
    // 1.35 to 1.65 mm out from the left wall the scoop is full to 8.20 and empty above 8.57, past the front wall's place too.
    expect(material(solid, -40.8 + 1.5, 20.6, 6, 8.1)).toBeCloseTo(0.09 * 2.1, 3);
    expect(material(solid, -40.8 + 1.5, 20.6, 8.7, 12)).toBe(0);
  });

  it("runs shelves and dividers out to an open side", () => {
    // The left shelf's 1.2 mm strip under its top at 20.15, at the front edge.
    const shelf = expectOpen(bin({ gridfinityLabelLeft: true, gridfinityOpenFront: true }));
    expect(material(shelf, -40.8 + 4, 20.6, 19.05, 20.05)).toBeCloseTo(0.09, 3);
    // The dividers at x = -13.8 and z = 0 stand to their top at 20.15 at the front edge; the front row's floors are flat there.
    const divided = expectOpen(bin({ gridfinityCompartmentsX: 3, gridfinityCompartmentsZ: 2, gridfinityOpenFront: true }));
    expect(material(divided, -13.8, 20.6, 6, 20)).toBeCloseTo(0.09 * 14, 3);
    expect(material(divided, -27.6, 20.6, 4.75, 25.4)).toBeCloseTo(0.09 * 1.2, 3);
  });

  it("builds open bins with scoops, shelves, compartments and their labels as one valid solid with the mesh's volume", () => {
    const labels = [{ column: 0, row: 0, side: "left" as const }, { column: 1, row: 1, side: "back" as const }, { column: 2, row: 1, side: "right" as const }, { column: 1, row: 0, side: "back" as const, length: 50 }];
    for (const opening of [{ gridfinityOpenFront: true }, { gridfinityOpenLeft: true }, { gridfinityOpenFront: true, gridfinityOpenBack: true }, { gridfinityOpenFront: true, gridfinityOpenRight: true }, { gridfinityOpenBack: true, gridfinityOpenFront: true, gridfinityOpenLeft: true }, all]) {
      expectOpen(bin({ ...opening, gridfinityScoopBack: true, gridfinityScoopFront: true, gridfinityScoopLeft: true, gridfinityScoopRight: true }));
      expectOpen(bin({ ...opening, gridfinityLabelBack: true, gridfinityLabelFront: true, gridfinityLabelLeft: true, gridfinityLabelRight: true }));
      expectOpen(bin({ ...opening, gridfinityLabelBack: true, gridfinityLabelLeftLength: 20, gridfinityLabelLeft: true, gridfinityLabelCorner: "chamfer" }));
      expectOpen(bin({ ...opening, gridfinityCompartmentsX: 3, gridfinityCompartmentsZ: 2, gridfinityScoopFront: true, gridfinityScoopLeft: true, gridfinityCompartmentLabels: labels }));
      expectOpen(bin({ ...opening, gridfinityCompartmentsX: 3, gridfinityCompartmentsZ: 2, gridfinityLip: false, height: 21, gridfinityMagnets: true }));
    }
  }, 300_000);

  it("takes a fillet and a chamfer on the sharp top of an open bin's lip", () => {
    const solid = gridfinityPartSolid(cad, bin({ gridfinityOpenFront: true }));
    const top = cad.getBoundingBox(solid).ymax;
    const edges = cad.getSubShapes(solid, "edge").filter((edge) => cad.getBoundingBox(edge).ymin > top - 1e-6);
    expect(edges.length).toBeGreaterThan(0);
    const filleted = cad.fillet(solid, edges, 0.5);
    expect(cad.isValid(filleted)).toBe(true);
    expect(Math.abs(cad.getVolume(filleted))).toBeLessThan(Math.abs(cad.getVolume(solid)));
    expect(cad.isValid(cad.chamfer(solid, edges, 0.5))).toBe(true);
  });

  it("refuses an open bin whose dividers the kernel lost instead of building it without them", () => {
    // A cutter that comes back as the whole inside cuts the dividers away with it. The inside runs out past the open side,
    // so only the bin cut to it is a sound measure of what is left without dividers.
    const common = vi.spyOn(cad, "common").mockImplementationOnce((_, inside) => inside);
    try {
      expect(() => gridfinityPartSolid(cad, bin({ gridfinityCompartmentsX: 3, gridfinityCompartmentsZ: 2, gridfinityOpenFront: true }))).toThrow("The Gridfinity bin's dividers could not be cut");
    } finally {
      common.mockRestore();
    }
  });
});

describe("exact Gridfinity baseplates with padding", () => {
  /** A baseplate of x by z units with these paddings, its box the grid and the padding together. */
  const padded = (x: number, z: number, back: number, front: number, left: number, right: number) => plate({ width: x * 42 + left + right, depth: z * 42 + back + front, gridfinityPaddingBack: back, gridfinityPaddingFront: front, gridfinityPaddingLeft: left, gridfinityPaddingRight: right });

  it("builds a padded baseplate as one valid solid with the mesh's volume and box, on any sides", () => {
    const base = Math.abs(cad.getVolume(gridfinityPartSolid(cad, plate())));
    for (let k = 1; k < 16; k += 1) {
      for (const amount of [0.01, 4, 14.2]) {
        const p = [0, 1, 2, 3].map((i) => (k & (1 << i) ? amount : 0)) as [number, number, number, number];
        const part = padded(2, 1, ...p);
        const context = JSON.stringify(p);
        const solid = gridfinityPartSolid(cad, part);
        expect(cad.isValid(solid), context).toBe(true);
        const exact = Math.abs(cad.getVolume(solid));
        expect(Math.abs(exact - meshVolume(part)) / exact, context).toBeLessThan(0.002);
        // The border is 5 mm over the area the padding adds; the corners keep their 4 mm rounding.
        expect(exact - base, context).toBeCloseTo(5 * (part.width * part.depth - 84 * 42), 3);
        const box = cad.getBoundingBox(solid);
        const { min, max } = meshBounds(part);
        [box.xmin - min[0], box.ymin - min[1], box.zmin - min[2], box.xmax - max[0], box.ymax - max[1], box.zmax - max[2]].forEach((d) => expect(Math.abs(d), context).toBeLessThan(0.01));
      }
    }
  });

  it("seats a bin in a socket of a padded baseplate 0.25 mm up, and 0.3 mm sideways they overlap", () => {
    // 6 x 6 units padded 14.2 mm on the right and 16.2 at the front: the corner socket at the back left is at (-133.1 + 21, -134.1 + 21).
    const p = gridfinityPartSolid(cad, padded(6, 6, 0, 16.2, 0, 14.2));
    expect(cad.isValid(p)).toBe(true);
    const seated = cad.translate(gridfinityPartSolid(cad, bin({ width: 41.5, depth: 41.5 })), -133.1 + 21, 0.25, -134.1 + 21);
    expect(overlap(seated, p)).toBeLessThan(0.01);
    expect(overlap(cad.translate(seated, 0.3, 0, 0), p)).toBeGreaterThan(1);
  });
});

describe("exact Gridfinity bins with a set wall", () => {
  /** One valid solid with the mesh's volume and box. */
  const expectBuilt = (part: CadModifierGridfinityPart, tolerance = 0.002) => {
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
  };

  it("builds thin, thick and square-cornered walls as one valid solid with the mesh's volume and box", () => {
    for (const part of [
      bin({ gridfinityWallThickness: 0.8 }),
      bin({ gridfinityWallThickness: 1.75, gridfinityOpenFront: true }),
      bin({ gridfinityWallThickness: 2.5 }),
      bin({ gridfinityWallThickness: 2.5, gridfinityScoopFront: true, gridfinityLabelBack: true, gridfinityMagnets: true }),
      bin({ gridfinityWallThickness: 3.7, gridfinityScoopFront: true }),
      bin({ gridfinityWallThickness: 3.75 }),
      bin({ gridfinityWallThickness: 6, gridfinityLip: false, height: 21 }),
      bin({ gridfinityWallThickness: 6, gridfinityHalfGrid: true, width: 20.5, depth: 41.5 }),
      bin({ width: 41.5, depth: 41.5, height: 7 + GRIDFINITY_LIP_HEIGHT, gridfinityWallThickness: 2.5 }),
    ]) expectBuilt(part);
  });

  it("builds compartments with their scoops and labels under a ledge and with square corners, the dividers flush with it", () => {
    for (const part of [
      bin({ gridfinityWallThickness: 2.5, gridfinityCompartmentsX: 3, gridfinityCompartmentsZ: 2, gridfinityScoopFront: true, gridfinityCompartmentLabels: [{ column: 1, row: 1, side: "back" }] }),
      bin({ gridfinityWallThickness: 4, gridfinityCompartmentsX: 2, gridfinityOpenRight: true }),
    ]) expectBuilt(part);
  });

  it("keeps an open side open with a 6 mm wall", () => {
    const solid = expectBuilt(bin({ gridfinityWallThickness: 6, gridfinityOpenFront: true }));
    // Above the floor, just inside the outline in the open side's middle, there is nothing.
    expect(material(solid, 0, 41.5 / 2 - 0.5, 8, 18)).toBeLessThan(1e-6);
  });

  it("builds a bin solid where its walls meet, with the lip's pocket kept on top", () => {
    const lipped = expectBuilt(bin({ width: 41.5, depth: 41.5, gridfinityWallThickness: 99 }));
    // Solid up to the ledge in the middle, open above it.
    expect(material(lipped, 0, 0, 6, 21 - 0.85 - 0.01)).toBeGreaterThan(0.3 * 0.3 * (21 - 0.85 - 6) * 0.99);
    expect(material(lipped, 0, 0, 21 - 0.85 + 0.01, 25)).toBeLessThan(1e-6);
    expectBuilt(bin({ width: 41.5, depth: 41.5, gridfinityLip: false, height: 21, gridfinityWallThickness: 99 }));
  });

  it("keeps a bin stacked on a thick wall's ledge 0.5 mm clear, as on the shelves", () => {
    const plain = gridfinityPartSolid(cad, bin({ width: 41.5, depth: 41.5 }));
    // From a wall of about 3 mm the ledge reaches in under the stacked bin's feet, which start 2.95 mm in.
    for (const part of [bin({ width: 41.5, depth: 41.5, gridfinityWallThickness: 4 }), bin({ width: 41.5, depth: 41.5, gridfinityWallThickness: 4, gridfinityFloorHeight: 30 })]) {
      const thick = gridfinityPartSolid(cad, part);
      expect(overlap(thick, cad.translate(plain, 0, 21 - 0.34, 0))).toBeLessThan(0.01);
      // Pushed 0.45 mm further down the feet cut into the lip only, as much as on a plain bin; 0.55 mm down they reach the ledge.
      const clear = cad.translate(plain, 0, 21 - 0.35 - 0.45, 0);
      expect(overlap(thick, clear)).toBeCloseTo(overlap(plain, clear), 2);
      const sunk = cad.translate(plain, 0, 21 - 0.35 - 0.55, 0);
      expect(overlap(thick, sunk)).toBeGreaterThan(overlap(plain, sunk) + 1);
    }
  });

  it("builds the tightest cases at the thinnest wall: 6 mm compartments, adjacent scoops and label ends near the rounding", () => {
    // Sixteen compartments' polygon corners in the mesh: 0.18 % off the exact body at 0.95 mm, 0.21 % at 0.8 with corners of 2.95.
    for (const part of [
      bin({ width: 41.5, depth: 41.5, gridfinityWallThickness: 0.8, gridfinityCompartmentsX: 4, gridfinityCompartmentsZ: 4, gridfinityScoopFront: true, gridfinityScoopLeft: true, gridfinityDividerPositionsX: [6.6, 13.8, 21], gridfinityDividerPositionsZ: [6.6, 13.8, 21] }),
      bin({ width: 41.5, depth: 41.5, gridfinityWallThickness: 0.8, gridfinityCompartmentsX: 2, gridfinityCompartmentLabels: [{ column: 0, row: 0, side: "back", length: 90, align: "start" }, { column: 1, row: 0, side: "left", length: 50, align: "end" }] }),
    ]) expectBuilt(part, 0.0025);
  });

  it("builds the smallest finger scoop at the thinnest wall, its floor rounded by 2.95 mm", () => {
    for (const part of [
      bin({ gridfinityWallThickness: 0.8, gridfinityScoopFront: true, gridfinityScoopRadius: 3.5 }),
      bin({ gridfinityWallThickness: 0.8, gridfinityScoopFront: true, gridfinityScoopBack: true, gridfinityScoopRadius: 3.5 }),
    ]) expectBuilt(part);
  });

  it("builds the same solid as before with a wall of 0.95 mm set", () => {
    for (const [part, volume, faces, edges] of [
      [bin({ gridfinityWallThickness: 0.95 }), 23248.7382, 100, 210],
      [bin({ gridfinityLip: false, height: 21, gridfinityWallThickness: 0.95 }), 21312.6174, 69, 154],
    ] as const) {
      const context = JSON.stringify(part);
      const solid = gridfinityPartSolid(cad, part);
      expect(Math.abs(Math.abs(cad.getVolume(solid)) - volume), context).toBeLessThan(1e-4);
      expect(cad.getSubShapes(solid, "face"), context).toHaveLength(faces);
      expect(cad.getSubShapes(solid, "edge"), context).toHaveLength(edges);
    }
  });
});

describe("exact Gridfinity bins with a lip chamfer", () => {
  /** The bin as the edge tool leaves it: its sharp lip's top edges chamfered by `size`. */
  const edgeTool = (part: CadModifierGridfinityPart, size: number) => {
    const solid = gridfinityPartSolid(cad, part);
    const top = cad.getBoundingBox(solid).ymax;
    return cad.chamfer(solid, cad.getSubShapes(solid, "edge").filter((edge) => cad.getBoundingBox(edge).ymin > top - 1e-6), size);
  };

  it("builds chamfered bins as one valid solid with the mesh's volume and box", () => {
    for (const fields of [
      {},
      { gridfinityOpenFront: true },
      { gridfinityOpenLeft: true, gridfinityOpenBack: true },
      { gridfinityOpenBack: true, gridfinityOpenFront: true, gridfinityOpenLeft: true, gridfinityOpenRight: true },
      { gridfinityHalfGrid: true, width: 20.5, depth: 41.5 },
      { gridfinityMagnets: true, gridfinityScoopFront: true, gridfinityLabelBack: true },
      { gridfinityCompartmentsX: 3, gridfinityCompartmentsZ: 2, gridfinityScoopFront: true, gridfinityCompartmentLabels: [{ column: 1, row: 1, side: "back" as const }] },
      { width: 41.5, depth: 41.5, height: 7 + GRIDFINITY_LIP_HEIGHT },
    ]) {
      for (const gridfinityLipChamfer of [0.25, 1]) {
        const part = bin({ ...fields, gridfinityLipChamfer });
        const context = JSON.stringify(part);
        const solid = gridfinityPartSolid(cad, part);
        expect(cad.isValid(solid), context).toBe(true);
        expect(cad.isSolid(solid) ? 1 : cad.getSubShapes(solid, "solid").length, context).toBe(1);
        const exact = Math.abs(cad.getVolume(solid));
        expect(Math.abs(exact - meshVolume(part)) / exact, context).toBeLessThan(0.002);
        const box = cad.getBoundingBox(solid);
        const { min, max } = meshBounds(part);
        [box.xmin - min[0], box.ymin - min[1], box.zmin - min[2], box.xmax - max[0], box.ymax - max[1], box.zmax - max[2]].forEach((d) => expect(Math.abs(d), context).toBeLessThan(0.01));
      }
    }
  });

  it("chamfers the lip as the edge tool does, closed and beside an open side, from the smallest chamfer kept", () => {
    for (const fields of [{}, { gridfinityOpenFront: true }, { gridfinityOpenLeft: true, gridfinityOpenBack: true }]) {
      for (const size of [0.01, 0.25, 1]) {
        const context = `${JSON.stringify(fields)} ${size}`;
        const built = gridfinityPartSolid(cad, bin({ ...fields, gridfinityLipChamfer: size }));
        const chamfered = edgeTool(bin(fields), size);
        expect(Math.abs(Math.abs(cad.getVolume(built)) - Math.abs(cad.getVolume(chamfered))), context).toBeLessThan(1e-3);
        expect(overlap(built, chamfered) / Math.abs(cad.getVolume(chamfered)), context).toBeGreaterThan(1 - 1e-6);
      }
    }
  });

  it("still stacks a bin 0.35 mm into a chamfered lip", () => {
    const lower = gridfinityPartSolid(cad, bin({ width: 41.5, depth: 41.5, gridfinityLipChamfer: 1 }));
    const upper = gridfinityPartSolid(cad, bin({ width: 41.5, depth: 41.5 }));
    expect(overlap(lower, cad.translate(upper, 0, 21 - 0.34, 0))).toBeLessThan(0.01);
    expect(overlap(lower, cad.translate(upper, 0, 21 - 0.5, 0))).toBeGreaterThan(1);
  });

  it("builds the same solid as before with no chamfer, and none without the lip", () => {
    // As in "builds the same solids as before open sides came in".
    for (const [part, volume, faces, edges] of [
      [bin({ gridfinityLipChamfer: 0 }), 23248.7382, 100, 210],
      [bin({ gridfinityLipChamfer: 1e-6 }), 23248.7382, 100, 210],
      [bin({ gridfinityLip: false, height: 21, gridfinityLipChamfer: 0.5 }), 21312.6174, 69, 154],
    ] as const) {
      const context = JSON.stringify(part);
      const solid = gridfinityPartSolid(cad, part);
      expect(Math.abs(Math.abs(cad.getVolume(solid)) - volume), context).toBeLessThan(1e-4);
      expect(cad.getSubShapes(solid, "face"), context).toHaveLength(faces);
      expect(cad.getSubShapes(solid, "edge"), context).toHaveLength(edges);
    }
  });
});

describe("exact Gridfinity bins with a lip chamfer on a set wall", () => {
  /** The bin as the edge tool leaves it: its sharp lip's top edges chamfered by `size`. */
  const edgeTool = (part: CadModifierGridfinityPart, size: number) => {
    const solid = gridfinityPartSolid(cad, part);
    const top = cad.getBoundingBox(solid).ymax;
    return cad.chamfer(solid, cad.getSubShapes(solid, "edge").filter((edge) => cad.getBoundingBox(edge).ymin > top - 1e-6), size);
  };

  it("builds a chamfered lip over a thick wall and its ledge as the edge tool does, with the mesh's volume and box", () => {
    for (const fields of [{ gridfinityWallThickness: 2.5 }, { gridfinityWallThickness: 4, gridfinityOpenFront: true }]) {
      const part = bin({ ...fields, gridfinityLipChamfer: 0.25 });
      const context = JSON.stringify(part);
      const solid = gridfinityPartSolid(cad, part);
      expect(cad.isValid(solid), context).toBe(true);
      expect(cad.isSolid(solid) ? 1 : cad.getSubShapes(solid, "solid").length, context).toBe(1);
      const exact = Math.abs(cad.getVolume(solid));
      expect(Math.abs(exact - meshVolume(part)) / exact, context).toBeLessThan(0.002);
      const box = cad.getBoundingBox(solid);
      const { min, max } = meshBounds(part);
      [box.xmin - min[0], box.ymin - min[1], box.zmin - min[2], box.xmax - max[0], box.ymax - max[1], box.zmax - max[2]].forEach((d) => expect(Math.abs(d), context).toBeLessThan(0.01));
      const chamfered = edgeTool(bin(fields), 0.25);
      expect(Math.abs(exact - Math.abs(cad.getVolume(chamfered))), context).toBeLessThan(1e-3);
      expect(overlap(solid, chamfered) / Math.abs(cad.getVolume(chamfered)), context).toBeGreaterThan(1 - 1e-6);
    }
  });

  it("still stacks a bin 0.35 mm into a chamfered lip over a thick wall, clear of its ledge", () => {
    const lower = gridfinityPartSolid(cad, bin({ width: 41.5, depth: 41.5, gridfinityWallThickness: 4, gridfinityLipChamfer: 1 }));
    const upper = gridfinityPartSolid(cad, bin({ width: 41.5, depth: 41.5 }));
    expect(overlap(lower, cad.translate(upper, 0, 21 - 0.34, 0))).toBeLessThan(0.01);
    expect(overlap(lower, cad.translate(upper, 0, 21 - 0.5, 0))).toBeGreaterThan(1);
  });
});

/** One valid solid with the mesh's volume and box, and no edge shorter than the kernel keeps. */
function expectBuilt(part: CadModifierGridfinityPart, tolerance = 0.002) {
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

describe("exact Gridfinity bins opened partly", () => {
  const front = (opening: Record<string, unknown>, extra: Partial<CadModifierGridfinityPart> = {}) => bin({ gridfinityOpenFront: true, gridfinityOpenings: [{ side: "front", ...opening }], ...extra });

  it("builds notches, slots and lowered walls as one valid solid with the mesh's volume and box", () => {
    for (const part of [
      front({ width: 30, depth: 10 }),
      front({ width: 20 }, { gridfinityWallThickness: 2.5, gridfinityMagnets: true }),
      front({ depth: 8 }, { gridfinityWallThickness: 4, gridfinityLipChamfer: 0.5 }),
      front({ width: 20, depth: 10 }, { gridfinityLip: false, height: 21 }),
      bin({ width: 41.5, depth: 41.5, height: 7 + GRIDFINITY_LIP_HEIGHT, gridfinityOpenFront: true, gridfinityOpenings: [{ side: "front", width: 10 }] }),
      bin({ gridfinityHalfGrid: true, width: 20.5, depth: 41.5, gridfinityOpenLeft: true, gridfinityOpenings: [{ side: "left", width: 12, depth: 6, align: "start", distance: 1.4 }] }),
      bin({ gridfinityOpenLeft: true, gridfinityOpenFront: true, gridfinityOpenBack: true, gridfinityScoopRight: true, gridfinityOpenings: [{ side: "front", width: 30, depth: 10, align: "end", distance: 3 }, { side: "back", depth: 5 }] }),
    ]) expectBuilt(part);
  });

  it("cuts a notch to the floor of a divided bin, under a ledge and with square corners", () => {
    for (const part of [
      front({ width: 40 }, { gridfinityCompartmentsX: 3 }),
      front({ width: 20, depth: 12 }, { gridfinityWallThickness: 2.5, gridfinityCompartmentsX: 3, gridfinityCompartmentsZ: 2, gridfinityScoopBack: true }),
      front({ width: 40 }, { gridfinityWallThickness: 4, gridfinityCompartmentsX: 3 }),
    ]) expectBuilt(part);
  });

  it("takes out only the wall over the notch: the wall under it and beside it stays", () => {
    const solid = expectBuilt(front({ width: 30, depth: 10 }));
    const wall = 41.5 / 2 - 0.5;
    expect(material(solid, 0, wall, 15.5, 26)).toBeLessThan(1e-6);
    expect(material(solid, 0, wall, 8, 15.3)).toBeGreaterThan(0.3 * 0.3 * 7.3 * 0.99);
    expect(material(solid, -16, wall, 15.5, 21)).toBeGreaterThan(0.3 * 0.3 * 5.5 * 0.99);
  });

  it("leaves no ridge of the floor's rounding across a slot to the floor", () => {
    // 1 mm in from the wall, inside the 2.8 mm rounding of a divided bin's floor.
    const at = 41.5 / 2 - 0.95 - 1;
    expect(material(gridfinityPartSolid(cad, bin({ gridfinityCompartmentsX: 3 })), 0, at, 5.96, 20)).toBeGreaterThan(1e-3);
    expect(material(expectBuilt(front({ width: 20 }, { gridfinityCompartmentsX: 3 })), 0, at, 5.96, 20)).toBeLessThan(1e-6);
  });

  it("stacks a bin 0.35 mm on one with a notch half its width or a lowered wall, and it does not drop", () => {
    const upper = gridfinityPartSolid(cad, bin({ width: 41.5, depth: 41.5 }));
    for (const opening of [{ width: 17, depth: 10 }, { depth: 10 }]) {
      const lower = gridfinityPartSolid(cad, bin({ width: 41.5, depth: 41.5, gridfinityOpenFront: true, gridfinityOpenings: [{ side: "front", ...opening }] }));
      expect(overlap(lower, cad.translate(upper, 0, 21 - 0.34, 0)), JSON.stringify(opening)).toBeLessThan(0.01);
      expect(overlap(lower, cad.translate(upper, 0, 21 - 0.5, 0)), JSON.stringify(opening)).toBeGreaterThan(1);
    }
  });

  it("refuses a notched bin whose dividers the kernel lost instead of building it without them", () => {
    const common = vi.spyOn(cad, "common").mockImplementationOnce((_, inside) => inside);
    try {
      expect(() => gridfinityPartSolid(cad, front({ width: 40 }, { gridfinityCompartmentsX: 3 }))).toThrow("The Gridfinity bin's dividers could not be cut");
    } finally {
      common.mockRestore();
    }
  });

  it("builds the same solid as an open side with an entry for the whole side", () => {
    const open = gridfinityPartSolid(cad, bin({ gridfinityOpenFront: true }));
    for (const part of [front({}), front({ width: 76, depth: 19.45 })]) {
      const solid = gridfinityPartSolid(cad, part);
      expect(Math.abs(cad.getVolume(solid) - cad.getVolume(open))).toBeLessThan(1e-6);
      expect(cad.getSubShapes(solid, "face")).toHaveLength(cad.getSubShapes(open, "face").length);
    }
  });
});

describe("exact Gridfinity bins with notch corners", () => {
  const front = (opening: Record<string, unknown>, extra: Partial<CadModifierGridfinityPart> = {}) => bin({ gridfinityOpenFront: true, gridfinityOpenings: [{ side: "front", ...opening }], gridfinityOpeningCornerSize: 2, ...extra });

  it("builds rounded and chamfered notch corners as one valid solid with the mesh's volume and box", () => {
    for (const gridfinityOpeningCorner of ["round", "chamfer"] as const) {
      for (const part of [
        front({ width: 30, depth: 10 }),
        front({ width: 20 }, { gridfinityWallThickness: 2.5, gridfinityMagnets: true, gridfinityOpeningCornerSize: 3 }),
        front({ depth: 8 }, { gridfinityWallThickness: 4, gridfinityLipChamfer: 0.5 }),
        front({ width: 20, depth: 10 }, { gridfinityLip: false, height: 21 }),
        front({ width: 20, depth: 10, align: "start", distance: 1 }, { gridfinityOpenLeft: true }),
        front({ width: 20, depth: 10, align: "end", distance: 0.5 }, { gridfinityLipChamfer: 1 }),
        // The top corner at the start takes 9.5 of the 10 mm depth and the bottom one the rest: the two meet.
        front({ width: 20, depth: 10, align: "end", distance: 3 }, { gridfinityLipChamfer: 1, gridfinityOpeningCornerSize: 9.5 }),
        bin({ width: 41.5, depth: 41.5, height: 7 + GRIDFINITY_LIP_HEIGHT, gridfinityOpenFront: true, gridfinityOpenings: [{ side: "front", width: 10, depth: 2 }], gridfinityOpeningCornerSize: 3 }),
        bin({ gridfinityHalfGrid: true, width: 20.5, depth: 41.5, gridfinityOpenLeft: true, gridfinityOpenings: [{ side: "left", width: 12, depth: 6, align: "start", distance: 1.4 }], gridfinityOpeningCornerSize: 1 }),
        bin({ gridfinityOpenBack: true, gridfinityOpenRight: true, gridfinityOpenings: [{ side: "back", width: 20, depth: 10 }, { side: "right", width: 10, depth: 6 }], gridfinityOpeningCornerSize: 1 }),
      ]) expectBuilt({ ...part, gridfinityOpeningCorner });
    }
  });

  it("builds notch corners on a divided bin's slot to the floor, under a ledge, its dividers checked", () => {
    for (const part of [
      front({ width: 40 }, { gridfinityCompartmentsX: 3, gridfinityOpeningCornerSize: 10 }),
      front({ width: 20, depth: 12 }, { gridfinityWallThickness: 2.5, gridfinityCompartmentsX: 3, gridfinityCompartmentsZ: 2, gridfinityScoopBack: true }),
      front({ width: 40 }, { gridfinityWallThickness: 4, gridfinityCompartmentsX: 3, gridfinityOpeningCorner: "chamfer" }),
    ]) expectBuilt(part);
    // A slot at the right end with its corner there, built clean (the unit test checks it is at the size set).
    for (const gridfinityOpeningCornerSize of [1, 2, 3.5]) {
      for (const gridfinityOpeningCorner of ["round", "chamfer"] as const) expectBuilt(front({ width: 20, align: "end", distance: 0 }, { gridfinityCompartmentsX: 3, gridfinityOpeningCorner, gridfinityOpeningCornerSize }));
    }
  });

  it("takes the wall off at a top corner and keeps it in a bottom corner, rounded or chamfered", () => {
    // A notch from -15 to 15 down to 15.4, its corners 2 mm; 0.5 mm in from the outside, the lip's top is at 24.9.
    const wall = 41.5 / 2 - 0.5;
    const sharp = expectBuilt(front({ width: 30, depth: 10 }, { gridfinityOpeningCornerSize: 0 }));
    expect(material(sharp, -15.3, wall, 24.7, 26)).toBeGreaterThan(1e-3);
    expect(material(sharp, -14.7, wall, 15.5, 16)).toBeLessThan(1e-6);
    for (const gridfinityOpeningCorner of ["round", "chamfer"] as const) {
      const solid = expectBuilt(front({ width: 30, depth: 10 }, { gridfinityOpeningCorner }));
      expect(material(solid, -15.3, wall, 24.7, 26), gridfinityOpeningCorner).toBeLessThan(1e-6);
      expect(material(solid, -14.7, wall, 15.5, 16), gridfinityOpeningCorner).toBeGreaterThan(1e-3);
      // Away from the corners the notch and the wall are as before.
      expect(material(solid, 0, wall, 15.5, 26), gridfinityOpeningCorner).toBeLessThan(1e-6);
      expect(material(solid, -20, wall, 15.5, 21), gridfinityOpeningCorner).toBeGreaterThan(0.3 * 0.3 * 5.5 * 0.99);
    }
  });

  it("puts each corner at its own end on a side that runs the other way, the back", () => {
    // A notch from 16 to 36 down to 15.4, 2 mm from the back's right end: its top corner there takes 2 mm, the others 3.
    const wall = -(41.5 / 2 - 0.5);
    const solid = expectBuilt(bin({ gridfinityOpenBack: true, gridfinityOpenings: [{ side: "back", width: 20, depth: 10, align: "end", distance: 2 }], gridfinityOpeningCornerSize: 3 }));
    // Just inside the notch at its right end, over the bottom corner's rounding; just outside it at its left end.
    expect(material(solid, 35.5, wall, 17.5, 20)).toBeLessThan(1e-6);
    expect(material(solid, 15.5, wall, 17.5, 20)).toBeGreaterThan(0.3 * 0.3 * 2.5 * 0.99);
  });

  it("leaves no edge under 0.01 mm where a corner nearly meets the wall's end or a crease of its section", () => {
    for (const gridfinityOpeningCorner of ["round", "chamfer"] as const) {
      // The top corner 0.005 mm short of the straight part's end, and with a size of 4 just under the lip's crease.
      expectBuilt(front({ width: 20, depth: 10, align: "end", distance: 1.905 }, { gridfinityOpeningCorner }));
      expectBuilt(front({ width: 20, depth: 10, align: "end", distance: 3.705 }, { gridfinityOpeningCorner, gridfinityOpeningCornerSize: 4 }));
    }
    // A wall lowered across the side: the bottom corners' arcs end on the corners' seams, crossing the support's foot just short of them.
    for (const side of ["front", "back"] as const) {
      expectBuilt(bin({ width: 41.5, depth: 41.5, height: 28 + GRIDFINITY_LIP_HEIGHT, [GRIDFINITY_OPEN_WALL_KEYS[side]]: true, gridfinityOpenings: [{ side, depth: 16 }], gridfinityOpeningCornerSize: 10 }));
    }
  });

  it("builds forty notches of any size, place and corner on any bin as one valid solid, no edge under 0.01 mm", () => {
    // The same forty each run: a small generator with a fixed seed (mulberry32).
    let seed = 455;
    const random = () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const pick = <T,>(options: readonly T[]) => options[Math.floor(random() * options.length)];
    const on = (low: number, high: number, step: number) => Math.round((low + random() * (high - low)) / step) * step;
    let built = 0;
    for (let i = 0; i < 40; i += 1) {
      const side = pick(["back", "front", "left", "right"] as const);
      const [width, depth] = pick([[41.5, 41.5], [83.5, 41.5], [41.5, 83.5]]);
      const units = pick([2, 3, 4]);
      const lip = random() < 0.85;
      const part = bin({
        width, depth, height: 7 * units + (lip ? GRIDFINITY_LIP_HEIGHT : 0), gridfinityLip: lip, [GRIDFINITY_OPEN_WALL_KEYS[side]]: true,
        ...(lip && random() < 0.3 ? { gridfinityLipChamfer: pick([0.25, 0.5, 1]) } : {}),
        ...(random() < 0.4 ? { gridfinityWallThickness: pick([0.8, 1.75, 2.5, 4]) } : {}),
        ...(random() < 0.2 ? { gridfinityScoopBack: true } : {}),
        gridfinityOpenings: [{ side, width: on(5, 60, 0.5), depth: on(2, 7 * units, 0.5), align: pick(["start", "middle", "end"] as const), distance: on(0, 8, 0.005) }],
        gridfinityOpeningCorner: pick(["round", "chamfer"] as const),
        gridfinityOpeningCornerSize: on(0.5, 10, 0.01),
      });
      if (gridfinityPlan(part).notches.length === 0) continue;
      expectBuilt(part);
      built += 1;
    }
    expect(built).toBeGreaterThan(30);
  });

  it("rounds the corners alike in the mesh and the exact body: within 3 % on a lowered wall, 0.01 mm³ at 1 mm", () => {
    // What the corners change in each, against the same notch with square corners.
    const change = (part: CadModifierGridfinityPart) => {
      const square = { ...part, gridfinityOpeningCornerSize: 0 };
      return [cad.getVolume(gridfinityPartSolid(cad, part)) - cad.getVolume(gridfinityPartSolid(cad, square)), meshVolume(part) - meshVolume(square)];
    };
    // A wall lowered across a 1 x 1 bin has bottom corners only, which keep wall.
    for (const gridfinityOpeningCorner of ["round", "chamfer"] as const) {
      const [exact, mesh] = change(bin({ width: 41.5, depth: 41.5, gridfinityOpenFront: true, gridfinityOpenings: [{ side: "front", depth: 10 }], gridfinityOpeningCorner, gridfinityOpeningCornerSize: 3 }));
      expect(exact, gridfinityOpeningCorner).toBeGreaterThan(1);
      expect(Math.abs(exact - mesh) / exact, gridfinityOpeningCorner).toBeLessThan(0.03);
    }
    const [exact, mesh] = change(front({ width: 20, depth: 10 }, { gridfinityOpeningCornerSize: 1 }));
    expect(Math.abs(exact - mesh)).toBeLessThan(0.01);
  });

  it("still stacks a bin 0.35 mm on one with rounded notch corners", () => {
    const upper = gridfinityPartSolid(cad, bin({ width: 41.5, depth: 41.5 }));
    const lower = gridfinityPartSolid(cad, bin({ width: 41.5, depth: 41.5, gridfinityOpenFront: true, gridfinityOpenings: [{ side: "front", width: 17, depth: 10 }], gridfinityOpeningCornerSize: 3 }));
    expect(overlap(lower, cad.translate(upper, 0, 21 - 0.34, 0))).toBeLessThan(0.01);
    expect(overlap(lower, cad.translate(upper, 0, 21 - 0.5, 0))).toBeGreaterThan(1);
  });

  it("builds the same solid as before with square corners", () => {
    const sharp = gridfinityPartSolid(cad, front({ width: 30, depth: 10 }, { gridfinityOpeningCornerSize: undefined }));
    for (const part of [front({ width: 30, depth: 10 }, { gridfinityOpeningCornerSize: 0 }), front({ width: 30, depth: 10 }, { gridfinityOpeningCornerSize: 0.45, gridfinityOpeningCorner: "chamfer" })]) {
      const solid = gridfinityPartSolid(cad, part);
      expect(Math.abs(cad.getVolume(solid) - cad.getVolume(sharp))).toBeLessThan(1e-9);
      expect(cad.getSubShapes(solid, "face")).toHaveLength(cad.getSubShapes(sharp, "face").length);
    }
  });
});
