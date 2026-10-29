import { describe, expect, it } from "vitest";
import { GRIDFINITY_LIP_HEIGHT, gridfinityTriangles } from "@/lib/gridfinityGeometry";
import { gridfinityPartSolid } from "@/lib/gridfinitySolid";
import { cad, bin, plate, meshVolume, trianglesVolume, meshBounds, overlap, material } from "./helpers/gridfinityHarness";


/*
 * Gridfinity bins and baseplates as exact bodies, held to the mesh the editor
 * draws, and to each other: a bin stands in the baseplate and on another bin
 * without the two overlapping, and moved a little sideways it would.
 */

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
