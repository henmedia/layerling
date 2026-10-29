import { describe, expect, it, vi } from "vitest";
import { type ShapeHandle } from "occt-wasm";
import type { CadModifierGridfinityPart } from "@/lib/cadModifierTypes";
import { GRIDFINITY_LIP_HEIGHT, GRIDFINITY_OPEN_WALL_KEYS } from "@/lib/gridfinityGeometry";
import { gridfinityPartSolid } from "@/lib/gridfinitySolid";
import { cad, bin, plate, meshVolume, meshBounds, overlap, material, expectBuilt } from "./helpers/gridfinityHarness";


/*
 * Gridfinity bins and baseplates as exact bodies, held to the mesh the editor
 * draws, and to each other: a bin stands in the baseplate and on another bin
 * without the two overlapping, and moved a little sideways it would.
 */

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

describe("exact Gridfinity baseplates with a corner radius", () => {
  /** A baseplate of x by z units, its box the grid and these paddings together, its outer corners rounded by r. */
  const cornered = (x: number, z: number, r: number, [back, front, left, right] = [0, 0, 0, 0]) => plate({ width: x * 42 + left + right, depth: z * 42 + back + front, gridfinityPaddingBack: back, gridfinityPaddingFront: front, gridfinityPaddingLeft: left, gridfinityPaddingRight: right, gridfinityCornerRadius: r });

  it("builds a baseplate with any corner radius, padded or not, as one valid solid with the mesh's volume and box", () => {
    for (const [x, z, p] of [[2, 1, [0, 0, 0, 0]], [1, 1, [0, 0, 0, 0]], [2, 1, [0, 16.2, 0, 14.2]], [1, 1, [5, 5, 5, 5]]] as const) {
      const base = Math.abs(cad.getVolume(gridfinityPartSolid(cad, cornered(x, z, 4, [...p]))));
      for (const r of [0, 0.5, 2, 3.9, 3.94, 4]) {
        const part = cornered(x, z, r, [...p]);
        const context = JSON.stringify({ x, z, p, r });
        const solid = gridfinityPartSolid(cad, part);
        expect(cad.isValid(solid), context).toBe(true);
        expect(cad.isSolid(solid) ? 1 : cad.getSubShapes(solid, "solid").length, context).toBe(1);
        const exact = Math.abs(cad.getVolume(solid));
        expect(Math.abs(exact - meshVolume(part)) / exact, context).toBeLessThan(0.002);
        // Each corner gains the plate's 5 mm over the area between its rounding and the specification's 4 mm one.
        expect(exact - base, context).toBeCloseTo(4 * 5 * (16 - r * r) * (1 - Math.PI / 4), 3);
        const box = cad.getBoundingBox(solid);
        const { min, max } = meshBounds(part);
        [box.xmin - min[0], box.ymin - min[1], box.zmin - min[2], box.xmax - max[0], box.ymax - max[1], box.zmax - max[2]].forEach((d) => expect(Math.abs(d), context).toBeLessThan(0.01));
        expect(cad.getSubShapes(solid, "edge").filter((edge) => cad.getLength(edge) > 1e-9 && cad.getLength(edge) < 0.01), context).toHaveLength(0);
      }
    }
  });

  it("seats a bin in the corner socket of a square-cornered baseplate as before, 0.25 mm up", () => {
    const p = gridfinityPartSolid(cad, cornered(2, 1, 0));
    const seated = cad.translate(gridfinityPartSolid(cad, bin({ width: 41.5, depth: 41.5 })), -21, 0.25, 0);
    expect(overlap(seated, p)).toBeLessThan(0.01);
    expect(overlap(cad.translate(seated, 0.3, 0, 0), p)).toBeGreaterThan(1);
  });
});

describe("exact Gridfinity bins with a corner radius", () => {
  /** One valid solid with the mesh's volume and box, and no edge under 0.01 mm. */
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
  const one = { width: 41.5, depth: 41.5 };

  it("builds a bin with any corner radius as one valid solid with the mesh's volume and box", () => {
    for (const extra of [
      {},
      one,
      { gridfinityLipChamfer: 1 },
      { ...one, gridfinityLipChamfer: 0.5 },
      { gridfinityLip: false, height: 21 },
      { gridfinityOpenBack: true },
      { gridfinityOpenBack: true, gridfinityOpenLeft: true },
      { gridfinityOpenFront: true, gridfinityOpenings: [{ side: "front" as const, width: 20, depth: 10 }] },
      { width: 83.5, depth: 83.5, gridfinityCompartmentsX: 2, gridfinityCompartmentsZ: 2, gridfinityScoopFront: true },
      { gridfinityHalfGrid: true, width: 41.5, depth: 20.5 },
      { gridfinityWallThickness: 2.6, gridfinityLipChamfer: 0.5 },
      { ...one, gridfinityWallThickness: 20.5 },
      { gridfinityMagnets: true },
    ]) {
      for (const r of [0, 2, 3.69]) expectBuilt(bin({ ...extra, gridfinityBinCornerRadius: r }));
    }
  });

  it("adds (1 - pi/4) of the corner's square at each of a 1 x 1 x 3 bin's corners, from 0.5 mm over the feet to the lip's top", () => {
    const volume = (r?: number) => Math.abs(cad.getVolume(gridfinityPartSolid(cad, bin({ ...one, gridfinityBinCornerRadius: r }))));
    // 4 x 3.75² x (1 - pi/4) x (25.4 - 5.25) = 243.24 mm³.
    expect(volume(0) - volume()).toBeCloseTo(4 * 3.75 ** 2 * (1 - Math.PI / 4) * 20.15, 2);
    expect(volume(0) - volume()).toBeCloseTo(243.24, 1);
    expect(volume(2) - volume()).toBeCloseTo(4 * (3.75 ** 2 - 4) * (1 - Math.PI / 4) * 20.15, 2);
  });

  it("keeps a square corner whole under the lip's chamfer, as the mesh does", () => {
    // Square corners add the same to the exact body as to the mesh up to the chamfer's foot; the mesh's
    // corners are drawn in segments, so the two gains are a little apart.
    for (const extra of [{ ...one, gridfinityLipChamfer: 0.5 }, { gridfinityLipChamfer: 1 }]) {
      const exact = (r?: number) => Math.abs(cad.getVolume(gridfinityPartSolid(cad, bin({ ...extra, gridfinityBinCornerRadius: r }))));
      const mesh = (r?: number) => meshVolume(bin({ ...extra, gridfinityBinCornerRadius: r }));
      const gain = mesh(0) - mesh();
      expect(Math.abs(exact(0) - exact() - gain) / gain, JSON.stringify(extra)).toBeLessThan(0.05);
    }
  });

  it("seats a square-cornered bin within one socket down on its slopes, 0.25 mm clear of the plate's top", () => {
    const square = gridfinityPartSolid(cad, plate({ width: 84, depth: 84 }));
    const seated = cad.translate(gridfinityPartSolid(cad, bin({ ...one, gridfinityBinCornerRadius: 0 })), -21, 0, -21);
    expect(overlap(seated, square)).toBeLessThan(0.01);
    expect(overlap(cad.translate(seated, 0, -0.3, 0), square)).toBeGreaterThan(1);
    // What the 0.5 mm band keeps clear: square from the feet's top, the outline would stand 0.25 mm into the plate's top
    // over the posts at that cell's corners, about 1.8 mm³.
    const squareFromFeet = cad.translate(cad.makeBox(41.5, 0.25, 41.5), -21 - 20.75, 4.75, -21 - 20.75);
    expect(overlap(squareFromFeet, square)).toBeGreaterThan(1.5);
    // A half-grid bin of 2 x 2 cells stands within one socket too.
    const half = cad.translate(gridfinityPartSolid(cad, bin({ ...one, gridfinityHalfGrid: true, gridfinityBinCornerRadius: 0 })), -21, 0, -21);
    expect(overlap(half, square)).toBeLessThan(0.01);
  });

  it("seats a square-cornered bin of two units on the ridges, 0.25 mm up, as before", () => {
    const seated = cad.translate(gridfinityPartSolid(cad, bin({ gridfinityBinCornerRadius: 0 })), 0, 0.25, 0);
    expect(overlap(seated, gridfinityPartSolid(cad, plate()))).toBeLessThan(0.01);
  });

  it("stacks square-cornered and rounded bins on one another in every order", () => {
    const of = (r?: number) => gridfinityPartSolid(cad, bin({ ...one, gridfinityBinCornerRadius: r }));
    // The bin above stands with its underside on the lip's top: 21 - 0.35 mm up.
    for (const [lower, upper] of [[0, 0], [undefined, 0], [0, undefined], [2, 0]] as const) {
      expect(overlap(of(lower), cad.translate(of(upper), 0, 21 - 0.35, 0)), `${lower} under ${upper}`).toBeLessThan(0.01);
    }
  });
});
