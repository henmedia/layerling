import { describe, expect, it } from "vitest";
import { gridfinityPartSolid } from "@/lib/gridfinitySolid";
import { cad, bin, plate, material, overlap, expectBuilt } from "./helpers/gridfinityHarness";

/*
 * A bin's overhang as an exact body, held to the mesh the editor draws, and standing in a baseplate padded as much
 * on that side: the overhang rests on the padding and ends flush with the plate.
 */

/** 2 x 1 x 3 with the lip, overhung 19.75 mm on the right. */
const right = (extra: Parameters<typeof bin>[0] = {}) => bin({ width: 103.5, gridfinityOverhangRight: 19.75, ...extra });

describe("exact Gridfinity bins with an overhang", { timeout: 300_000 }, () => {
  it("builds each kind of overhang as one solid with the mesh's volume and box", () => {
    expectBuilt(right());
    expectBuilt(right({ gridfinityOverhangSolid: true }));
    expectBuilt(right({ gridfinityOverhangLipOnGrid: true }));
    expectBuilt(right({ height: 32.4, gridfinityOverhangChamfer: 20 }));
    expectBuilt(right({ gridfinityOverhangSolid: true, height: 32.4, gridfinityOverhangChamfer: 20 }));
    expectBuilt(right({ gridfinityOverhangSolid: true, gridfinityOverhangChamfer: 99 }));
    expectBuilt(right({ gridfinityOverhangLipOnGrid: true, gridfinityOverhangChamfer: 99 }));
    expectBuilt(bin({ width: 90.55, gridfinityOverhangRight: 6.8, gridfinityOverhangChamfer: 99, gridfinityLipChamfer: 1 }));
    expectBuilt(bin({ depth: 82.75, height: 53.4, gridfinityHalfGrid: true, gridfinityOverhangBack: 41, gridfinityOverhangSolid: true, gridfinityLipChamfer: 1, gridfinityOverhangChamfer: 99 }));
    expectBuilt(right({ gridfinityOverhangSolid: true, gridfinityOpenRight: true }));
    expectBuilt(right({ gridfinityOverhangSolid: true, gridfinityLipChamfer: 0.5 }));
    // The lip's chamfer run on round the overhang's outer edge; at the back, with a chamfer under it, low and to the top.
    expectBuilt(right({ gridfinityOverhangSolid: true, gridfinityLipChamfer: 1 }));
    expectBuilt(bin({ depth: 57.35, height: 53.4, gridfinityHalfGrid: true, gridfinityOverhangBack: 15.6, gridfinityOverhangSolid: true, gridfinityLipChamfer: 1, gridfinityOverhangChamfer: 13.8 }));
    expectBuilt(bin({ depth: 57.35, height: 53.4, gridfinityHalfGrid: true, gridfinityOverhangBack: 15.6, gridfinityOverhangSolid: true, gridfinityLipChamfer: 1, gridfinityOverhangChamfer: 99 }));
    // 41 mm at the back from the foot line: solid almost to the lip's top, and low, hollow and solid.
    const back = { depth: 82.75, height: 53.4, gridfinityHalfGrid: true, gridfinityOverhangBack: 41 };
    expectBuilt(bin({ ...back, gridfinityOverhangSolid: true, gridfinityOverhangChamfer: 99 }));
    expectBuilt(bin({ ...back, gridfinityOverhangChamfer: 5 }));
    expectBuilt(bin({ ...back, gridfinityOverhangSolid: true, gridfinityOverhangChamfer: 5 }));
    expectBuilt(bin({ width: 124, gridfinityOverhangLeft: 20, gridfinityOverhangRight: 20, gridfinityOverhangSolid: true }));
    // A steep chamfer, its skin lifted more than the floor is thick.
    expectBuilt(bin({ width: 90.55, gridfinityOverhangRight: 6.8, gridfinityOverhangChamfer: 13.8 }));
    // Three sides of different reach rising as high, each at its own angle.
    expectBuilt(bin({ width: 104, depth: 57.35, gridfinityOverhangFront: 15.6, gridfinityOverhangLeft: 13.2, gridfinityOverhangRight: 6.8, gridfinityOverhangChamfer: 13.8 }));
    // Two sides of the same reach rising as high, meeting on the corner's diagonal.
    expectBuilt(bin({ width: 102.5, depth: 60.5, height: 32.4, gridfinityOverhangRight: 18.75, gridfinityOverhangBack: 18.75, gridfinityOverhangChamfer: 10 }));
    // Two sides at a corner, each chamfered.
    expectBuilt(bin({ width: 103.5, depth: 60.5, height: 32.4, gridfinityOverhangRight: 19.75, gridfinityOverhangBack: 18.75, gridfinityOverhangChamfer: 18 }));
  });

  it("builds a chamfered overhang with compartments, a scoop and a shelf on the overhung wall", () => {
    expectBuilt(right({ height: 32.4, gridfinityOverhangChamfer: 20, gridfinityCompartmentsX: 3, gridfinityScoopRight: true, gridfinityLabelRight: true }));
  });

  it("stands in a baseplate padded as much on that side, resting on the padding and flush with the plate", () => {
    const padded = gridfinityPartSolid(cad, plate({ width: 103.75, gridfinityPaddingRight: 19.75 }));
    // The plate's cells are 9.875 mm left of its middle, the bin's 10: seated 0.25 mm up and 0.125 mm right.
    const seated = cad.translate(gridfinityPartSolid(cad, right()), 0.125, 0.25, 0);
    expect(overlap(seated, padded)).toBeLessThan(0.01);
    const box = cad.getBoundingBox(seated);
    expect(box.xmax).toBeCloseTo(cad.getBoundingBox(padded).xmax, 6);
    // Over the padding, the plate's top and the overhang's underside meet at 5 mm.
    expect(material(padded, 45, 0, 4.9, 5)).toBeGreaterThan(0.008);
    expect(material(seated, 45, 0, 5, 5.1)).toBeGreaterThan(0.008);
  });
});
