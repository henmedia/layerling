import { describe, expect, it, vi } from "vitest";
import type { CadModifierGridfinityPart } from "@/lib/cadModifierTypes";
import { GRIDFINITY_LIP_HEIGHT, GRIDFINITY_OPEN_WALL_KEYS, gridfinityPlan } from "@/lib/gridfinityGeometry";
import { gridfinityPartSolid } from "@/lib/gridfinitySolid";
import { cad, bin, meshVolume, meshBounds, overlap, material, expectBuilt } from "./helpers/gridfinityHarness";


/*
 * Gridfinity bins and baseplates as exact bodies, held to the mesh the editor
 * draws, and to each other: a bin stands in the baseplate and on another bin
 * without the two overlapping, and moved a little sideways it would.
 */

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

describe("exact Gridfinity trays", () => {
  /** A tray of 80 x 40 x 20 mm (#837): walls of 0.95, a floor of 1.2, corners of 3.75 outside and 2.8 inside. */
  const tray = (extra: Partial<CadModifierGridfinityPart> = {}): CadModifierGridfinityPart => ({ width: 80, depth: 40, height: 20, gridfinityType: "tray", gridfinityLip: true, gridfinityMagnets: true, ...extra });
  const area = (w: number, d: number, r: number) => w * d - (4 - Math.PI) * r * r;
  /** The outline over the height less the inside over its depth, as calculated by hand. */
  const exact = (w: number, d: number, h: number, wall: number, floor: number) => area(w, d, 3.75) * h - area(w - 2 * wall, d - 2 * wall, Math.max(0, 3.75 - wall)) * (h - floor);

  it("builds a tray as one valid solid with the mesh's volume and box, and the volume calculated by hand", () => {
    for (const [extra, volume] of [
      [{}, exact(80, 40, 20, 0.95, 1.2)],
      [{ gridfinityWallThickness: 2 }, exact(80, 40, 20, 2, 1.2)],
      [{ gridfinityFloorHeight: 5 }, exact(80, 40, 20, 0.95, 5)],
      [{ gridfinityFloorHeight: 20 }, area(80, 40, 3.75) * 20],
      [{ gridfinityWallThickness: 99 }, area(80, 40, 3.75) * 20],
    ] as const) {
      const solid = expectBuilt(tray(extra));
      expect(Math.abs(cad.getVolume(solid)), JSON.stringify(extra)).toBeCloseTo(volume, 3);
    }
    expect(exact(80, 40, 20, 0.95, 1.2)).toBeCloseTo(7943.63, 2);
    // It stands on y = 0 with no feet, magnet holes or lip, whatever is stored: no baseplate and no bin.
    const solid = gridfinityPartSolid(cad, tray());
    expect(cad.getBoundingBox(solid)).toMatchObject({ ymin: expect.closeTo(0, 6), ymax: expect.closeTo(20, 6) });
    expect(material(solid, 0, 0, 0, 1.2)).toBeCloseTo(0.3 * 0.3 * 1.2, 6);
    expect(material(solid, 0, 0, 1.25, 20)).toBeLessThan(1e-6);
    expect(material(solid, -40 + 0.6, 0, 0, 20)).toBeCloseTo(0.3 * 0.3 * 20, 6);
  });

  it("builds trays with compartments, scoops, shelves, labels, open sides and openings, small and large", () => {
    for (const part of [
      tray({ gridfinityCompartmentsX: 3, gridfinityCompartmentsZ: 2, gridfinityScoopBack: true, gridfinityScoopFront: true, gridfinityScoopLeft: true, gridfinityScoopRight: true }),
      tray({ gridfinityCompartmentsX: 3, gridfinityCompartmentLabels: [{ column: 0, row: 0, side: "back" }, { column: 2, row: 0, side: "left" }] }),
      tray({ gridfinityScoopFront: true, gridfinityScoopBack: true }),
      tray({ gridfinityLabelBack: true, gridfinityLabelLeft: true }),
      tray({ gridfinityOpenFront: true }),
      tray({ gridfinityOpenBack: true, gridfinityOpenFront: true, gridfinityOpenLeft: true, gridfinityOpenRight: true }),
      tray({ gridfinityOpenFront: true, gridfinityCompartmentsX: 2, gridfinityLabelBack: true }),
      tray({ gridfinityOpenFront: true, gridfinityOpenBack: true, gridfinityOpenLeft: true, gridfinityOpenRight: true, gridfinityOpenings: [{ side: "front", width: 20, depth: 8 }, { side: "back", width: 20, depth: 8 }, { side: "left", width: 10, depth: 8 }, { side: "right", width: 10 }], gridfinityOpeningCornerSize: 2 }),
      tray({ gridfinityWallThickness: 2.5, gridfinityCompartmentsX: 2, gridfinityScoopFront: true }),
      tray({ gridfinityFloorHeight: 8, gridfinityScoopFront: true, gridfinityLabelBack: true }),
    ]) expectBuilt(part);
    // Small ones: the mesh's polygon corners are 0.57 of the smallest's 157.8 mm³ (0.36 %), and the compartments' floors,
    // drawn by the mesh as balls of 32 sides as in a bin, 16 of a low tray's 6223 mm³ (0.24 %).
    expectBuilt(tray({ width: 10, depth: 10, height: 3 }), 0.004);
    expectBuilt(tray({ width: 92.5, depth: 31.2, height: 7.3, gridfinityCompartmentsX: 4 }), 0.003);
    // Forty compartments: the same balls under each, on a tray with no feet to take up the difference, are 0.55 % (up to
    // 0.62 % on a smaller tray with scoops as well).
    expectBuilt(tray({ gridfinityCompartmentsX: 8, gridfinityCompartmentsZ: 5 }), 0.006);
  });

  it("builds a tray with compartments and an opening cut partly, as one solid", () => {
    // The compartments' cutters stand apart up to the top, so the box over them joins them to the notch.
    for (const part of [
      tray({ width: 120, depth: 60, height: 25, gridfinityCompartmentsX: 3, gridfinityCompartmentsZ: 2, gridfinityOpenFront: true, gridfinityOpenings: [{ side: "front", width: 20, depth: 10 }] }),
      tray({ gridfinityCompartmentsZ: 2, gridfinityOpenFront: true, gridfinityOpenings: [{ side: "front", width: 20, depth: 10 }] }),
      tray({ gridfinityCompartmentsX: 3, gridfinityOpenFront: true, gridfinityOpenings: [{ side: "front", width: 20 }] }),
      tray({ width: 120, depth: 60, height: 25, gridfinityCompartmentsX: 3, gridfinityCompartmentsZ: 2, gridfinityScoopFront: true, gridfinityScoopBack: true, gridfinityLabelBack: true, gridfinityCompartmentLabels: [{ column: 1, row: 1, side: "back" }], gridfinityOpenFront: true, gridfinityOpenLeft: true, gridfinityOpenings: [{ side: "front", width: 20, depth: 10 }], gridfinityOpeningCornerSize: 2, gridfinityWallThickness: 1.6 }),
    ]) expectBuilt(part);
  });

  it("builds a low tray with compartments and openings down to the floor", () => {
    // Each notch down to the floor takes the floor's rounding as the section draws it, in chords, a little more than the
    // arc: the dividers' check counts it so, or it would refuse these trays, whose short dividers leave it no slack.
    const four = { gridfinityOpenFront: true, gridfinityOpenBack: true, gridfinityOpenLeft: true, gridfinityOpenRight: true };
    for (const part of [
      tray({ width: 37.3, depth: 21.9, height: 4.2, ...four, gridfinityOpenings: [{ side: "front", width: 10, depth: 3 }, { side: "back", width: 10, depth: 3 }, { side: "left", width: 6, depth: 3 }, { side: "right", width: 6 }], gridfinityCompartmentsX: 5, gridfinityCompartmentsZ: 2 }),
      tray({ width: 57.4, depth: 89.1, height: 6.2, gridfinityOpenFront: true, gridfinityOpenBack: true, gridfinityOpenings: [{ side: "front", width: 8, align: "middle", distance: 3 }, { side: "back", width: 34, depth: 10.5, align: "start", distance: 4 }], gridfinityCompartmentsX: 7, gridfinityDividerThickness: 2.8, gridfinityLabelFront: true }),
      tray({ width: 45.3, depth: 70.5, height: 8.2, gridfinityOpenFront: true, gridfinityOpenBack: true, gridfinityOpenRight: true, gridfinityOpenings: [{ side: "front", width: 18, align: "end", distance: 3 }, { side: "back", width: 6, align: "middle", distance: 3 }, { side: "right", width: 32, depth: 8.5, align: "start", distance: 3 }], gridfinityOpeningCorner: "chamfer", gridfinityCompartmentsX: 8, gridfinityCompartmentsZ: 2, gridfinityLabelRight: true, gridfinityCompartmentLabels: [{ column: 0, row: 0, side: "front" }] }),
    ]) expectBuilt(part, 0.006);
  });

  it("builds a tray whose finger scoop ends under an opening's rounded corner, as one solid", () => {
    // The scoop runs out on the floor under the notch's rounded corners, which the kernel cannot fuse into the inside, so
    // the notch is cut after it. Edges under 0.01 mm are left where the three meet the floor, as on a notched bin.
    const part = tray({ width: 64.6, depth: 19.1, height: 39.6, gridfinityOpenBack: true, gridfinityOpenings: [{ side: "back", width: 10, align: "middle", distance: 1 }], gridfinityOpeningCornerSize: 2.5, gridfinityDividerThickness: 3, gridfinityLabelBack: true, gridfinityScoopFront: true, gridfinityFloorHeight: 1.89 });
    const solid = gridfinityPartSolid(cad, part);
    expect(cad.isValid(solid)).toBe(true);
    expect(cad.isSolid(solid) ? 1 : cad.getSubShapes(solid, "solid").length).toBe(1);
    const exact = Math.abs(cad.getVolume(solid));
    expect(Math.abs(exact - meshVolume(part)) / exact).toBeLessThan(0.002);
    const box = cad.getBoundingBox(solid);
    const { min, max } = meshBounds(part);
    [box.xmin - min[0], box.ymin - min[1], box.zmin - min[2], box.xmax - max[0], box.ymax - max[1], box.zmax - max[2]].forEach((d) => expect(Math.abs(d)).toBeLessThan(0.01));
  });

  it("runs the dividers and the shelves up to the top", () => {
    const solid = expectBuilt(tray({ gridfinityCompartmentsX: 2 }));
    // The divider stands in the middle from the floor right up to the top.
    expect(material(solid, 0, 0, 1.5, 20)).toBeCloseTo(0.3 * 0.3 * 18.5, 6);
    const shelf = expectBuilt(tray({ gridfinityLabelBack: true }));
    expect(material(shelf, 0, -20 + 0.95 + 2, 19.5, 20)).toBeCloseTo(0.3 * 0.3 * 0.5, 6);
  });

  it("takes a fillet and a chamfer on its flat bottom's edge", () => {
    const solid = gridfinityPartSolid(cad, tray());
    const edges = cad.getSubShapes(solid, "edge").filter((edge) => cad.getBoundingBox(edge).ymax < 1e-6);
    expect(edges.length).toBeGreaterThan(0);
    const filleted = cad.fillet(solid, edges, 0.4);
    expect(cad.isValid(filleted)).toBe(true);
    expect(Math.abs(cad.getVolume(filleted))).toBeLessThan(Math.abs(cad.getVolume(solid)));
    expect(cad.isValid(cad.chamfer(solid, edges, 0.4))).toBe(true);
  });
});
