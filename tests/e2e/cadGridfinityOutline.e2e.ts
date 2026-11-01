import { describe, expect, it } from "vitest";
import { GRIDFINITY_BASEPLATE_HEIGHT, gridfinityPlan } from "@/lib/gridfinityGeometry";
import { gridfinityPartSolid } from "@/lib/gridfinitySolid";
import { cad, bin, plate, expectBuilt, overlap } from "./helpers/gridfinityHarness";

/*
 * A baseplate fitted into a drawn outline (#1061) as an exact body: the
 * outline's slab less a socket for each whole cell, with the cells where the
 * plan puts them, so a bin stands in each.
 */

// An L of 168 mm, its inner corner at the middle: twelve cells, none in the missing quarter.
const l = [{ x: -84, z: -84 }, { x: 84, z: -84 }, { x: 84, z: 0 }, { x: 0, z: 0 }, { x: 0, z: 84 }, { x: -84, z: 84 }];

describe("exact Gridfinity outline plates", () => {
  it("builds an L-shaped plate as one valid solid: its slab less twelve sockets", () => {
    const solid = expectBuilt(plate({ width: 168, depth: 168, gridfinityOutline: l }));
    // One socket is what a 42 mm plate with square corners lacks of its block.
    const socket = 42 * 42 * GRIDFINITY_BASEPLATE_HEIGHT - Math.abs(cad.getVolume(gridfinityPartSolid(cad, plate({ width: 42, depth: 42, gridfinityCornerRadius: 0 }))));
    const slab = (168 * 168 - 84 * 84) * GRIDFINITY_BASEPLATE_HEIGHT;
    expect(Math.abs(cad.getVolume(solid))).toBeCloseTo(slab - 12 * socket, 1);
    const box = cad.getBoundingBox(solid);
    [box.xmin + 84, box.xmax - 84, box.zmin + 84, box.zmax - 84, box.ymin, box.ymax - GRIDFINITY_BASEPLATE_HEIGHT].forEach((d) => expect(Math.abs(d)).toBeLessThan(0.01));
  });

  it("draws the same plate: the display mesh has the exact body's volume and box", () => {
    // A circle 58 mm across holds one cell, whose square corners the drawn plate must not keep past it.
    const round = Array.from({ length: 72 }, (_, k) => ({ x: 29 * Math.cos((k * Math.PI) / 36), z: 29 * Math.sin((k * Math.PI) / 36) }));
    // A fine curve of the most points an outline keeps, many of them in a line once kept to 0.01 mm.
    const fine = Array.from({ length: 1000 }, (_, k) => ({ x: 100 * Math.cos((k * Math.PI) / 500), z: 100 * Math.sin((k * Math.PI) / 500) }));
    for (const outline of [l, [{ x: -126, z: -42 }, { x: 126, z: -42 }, { x: 126, z: 42 }, { x: -126, z: 42 }], round, fine]) {
      const xs = outline.map((p) => p.x);
      const zs = outline.map((p) => p.z);
      expectBuilt(plate({ width: Math.max(...xs) - Math.min(...xs), depth: Math.max(...zs) - Math.min(...zs), gridfinityOutline: outline }));
    }
  });

  it("puts each socket where the plan has its cell: a bin stands in it 0.25 mm up, and 0.3 mm sideways it overlaps", () => {
    const part = plate({ width: 168, depth: 168, gridfinityOutline: l });
    const solid = gridfinityPartSolid(cad, part);
    const one = gridfinityPartSolid(cad, bin({ width: 41.5, depth: 41.5 }));
    for (const cell of gridfinityPlan(part).cells) {
      const seated = cad.translate(one, cell.x, 0.25, cell.z);
      expect(overlap(seated, solid)).toBeLessThan(0.01);
      expect(overlap(cad.translate(seated, 0.3, 0, 0), solid)).toBeGreaterThan(1);
    }
    // In the missing quarter there is no plate at all.
    expect(overlap(cad.translate(one, 42, 0.25, 42), solid)).toBeLessThan(0.01);
  });
});
