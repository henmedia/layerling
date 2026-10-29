import { describe, expect, it, vi } from "vitest";
import { type ShapeHandle } from "occt-wasm";
import type { CadModifierGridfinityPart } from "@/lib/cadModifierTypes";
import { GRIDFINITY_LIP_HEIGHT, gridfinityCompartmentPieces, gridfinityDividerBound, gridfinityPlan, gridfinityTriangles } from "@/lib/gridfinityGeometry";
import { gridfinityPartSolid } from "@/lib/gridfinitySolid";
import { cad, bin, meshVolume, trianglesVolume, meshBounds, material } from "./helpers/gridfinityHarness";


/*
 * Gridfinity bins and baseplates as exact bodies, held to the mesh the editor
 * draws, and to each other: a bin stands in the baseplate and on another bin
 * without the two overlapping, and moved a little sideways it would.
 */

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
