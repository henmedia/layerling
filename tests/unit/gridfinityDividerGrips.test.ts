import { describe, expect, it } from "vitest";
import { GRIDFINITY_LIP_HEIGHT } from "@/lib/gridfinityGeometry";
import { gridfinityDividerDragged, gridfinityDividerGrips } from "@/lib/gridfinityDividerGrips";
import { projectShapesFingerprint } from "@/lib/editorHistory";
import type { WorkplaneShape } from "@/types/layerling";

/**
 * A bin of 2 x 1 x 3 units as the editor keeps it: 83.5 x 41.5, a wall of 0.95, so 81.6 x 39.6 inside (40.8 and 19.8
 * from the middle to the wall), dividers 1.2 thick.
 */
function bin(fields: Record<string, unknown> = {}) {
  return { id: "g", name: "Bin", kind: "gridfinity", color: "#4f7fa8", x: 0, z: 0, elevation: 0, size: 83.5, width: 83.5, depth: 41.5, height: 21 + GRIDFINITY_LIP_HEIGHT, rotation: 0, gridfinityType: "bin", gridfinityLip: true, ...fields } as unknown as WorkplaneShape;
}
/** A bin of 2 x 2 x 3 units: 81.6 mm inside both ways. */
const square = { width: 83.5, depth: 83.5 };
const three = { gridfinityCompartmentsX: 3, gridfinityCompartmentsZ: 2 };

const point = (at: { x: number; z: number }) => [at.x, at.z].map((n) => Number(n.toFixed(6)) + 0);
/** A drag that began on the shape as it is: the divider where it is built, its axis's list as kept. */
const dragged = (shape: WorkplaneShape, axis: "x" | "z", index: number, position: number, offset: number, step?: number) =>
  gridfinityDividerDragged(shape, axis, index, { position, kept: axis === "x" ? shape.gridfinityDividerPositionsX : shape.gridfinityDividerPositionsZ }, offset, step);
const sizes = (shape: WorkplaneShape) => gridfinityDividerGrips(shape)!.compartments.map((cell) => [cell.width, cell.depth].map((n) => Number(n.toFixed(6))));

describe("gridfinity divider grips", () => {
  it("lays every divider from wall face to wall face, with the compartments' sizes between the faces", () => {
    // 3 across, 2 deep: compartments of (81.6 - 2 x 1.2) / 3 = 26.4 across and (39.6 - 1.2) / 2 = 19.2 deep, the
    // dividers' middles 27 and 54.6 from the left wall (-13.8 and 13.8 from the middle) and 19.8 from the back (0).
    const grips = gridfinityDividerGrips(bin(three))!;
    expect(grips.top).toBeCloseTo(20.15, 9);
    expect(grips.dividers.map((divider) => [divider.axis, divider.index, Number(divider.position.toFixed(6)), point(divider.from), point(divider.to)])).toEqual([
      ["x", 0, 27, [-13.8, -19.8], [-13.8, 19.8]],
      ["x", 1, 54.6, [13.8, -19.8], [13.8, 19.8]],
      ["z", 0, 19.8, [-40.8, 0], [40.8, 0]],
    ]);
    expect(sizes(bin(three))).toEqual(Array.from({ length: 6 }, () => [26.4, 19.2]));
    expect(grips.compartments.map((cell) => point(cell.centre))).toEqual([[-27.6, -10.2], [0, -10.2], [27.6, -10.2], [-27.6, 10.2], [0, 10.2], [27.6, 10.2]]);
    expect(grips.parts).toEqual([]);
  });

  it("puts each grip in the middle of the longest stretch of its divider between the dividers crossing it, the one nearest the middle", () => {
    // The divider deep is crossed twice; of its three stretches of 26.4 the middle one holds the grip. Each divider
    // across has two stretches of 19.2 either side of it, as near the middle, and takes the back one.
    expect(gridfinityDividerGrips(bin(three))!.dividers.map((divider) => point(divider.grip))).toEqual([[-13.8, -10.2], [13.8, -10.2], [0, 0]]);
  });

  it("keeps the grips of a 2 x 2 and a 4 x 4 bin off the crossings and apart", () => {
    // 2 x 2: both dividers cross in the middle, so each grip goes to the middle of its back or left half, 20.7 out.
    expect(gridfinityDividerGrips(bin({ ...square, gridfinityCompartmentsX: 2, gridfinityCompartmentsZ: 2 }))!.dividers.map((divider) => point(divider.grip))).toEqual([[0, -20.7], [-20.7, 0]]);
    // 4 x 4: compartments of (81.6 - 3 x 1.2) / 4 = 19.5, dividers at -20.7, 0 and 20.7; the two middle stretches are
    // as near the middle, and the back or left one is taken, 10.35 out.
    const grips = gridfinityDividerGrips(bin({ ...square, gridfinityCompartmentsX: 4, gridfinityCompartmentsZ: 4 }))!.dividers;
    expect(grips.map((divider) => point(divider.grip))).toEqual([[-20.7, -10.35], [0, -10.35], [20.7, -10.35], [-10.35, -20.7], [-10.35, 0], [-10.35, 20.7]]);
    for (const divider of grips) {
      for (const other of grips.filter((entry) => entry !== divider)) {
        expect(Math.hypot(divider.grip.x - other.grip.x, divider.grip.z - other.grip.z), `${divider.axis}${divider.index} ${other.axis}${other.index}`).toBeGreaterThan(10);
        // Never on a divider crossing this one.
        if (other.axis !== divider.axis) expect(Math.abs(other.axis === "x" ? divider.grip.x - other.from.x : divider.grip.z - other.from.z)).toBeGreaterThan(10);
      }
    }
  });

  it("keeps a grip off the end of a wall between the parts of a split compartment", () => {
    // 3 across, 1 deep, the left compartment split in two deep: the wall between its parts ends on the first divider at
    // its middle, so that divider's grip goes to the middle of its back half; the second divider has no wall on it.
    const grips = gridfinityDividerGrips(bin({ gridfinityCompartmentsX: 3, gridfinityCompartmentSplits: [{ column: 0, row: 0, z: 2 }] }))!;
    expect(grips.parts.map((part) => [point(part.from), point(part.to)])).toEqual([[[-40.8, 0], [-14.4, 0]]]);
    expect(grips.dividers.map((divider) => point(divider.grip))).toEqual([[-13.8, -10.2], [13.8, 0]]);
  });

  it("draws the walls between the parts of a split compartment without grips, and gives each part its size", () => {
    // The middle compartment, 26.4 across, split in two: parts of (26.4 - 1.2) / 2 = 12.6 with a wall at the middle.
    const grips = gridfinityDividerGrips(bin({ gridfinityCompartmentsX: 3, gridfinityCompartmentSplits: [{ column: 1, row: 0, x: 2 }] }))!;
    expect(grips.dividers).toHaveLength(2);
    expect(grips.parts.map((part) => [point(part.from), point(part.to)])).toEqual([[[0, -19.8], [0, 19.8]]]);
    expect(sizes(bin({ gridfinityCompartmentsX: 3, gridfinityCompartmentSplits: [{ column: 1, row: 0, x: 2 }] }))).toEqual([[26.4, 39.6], [12.6, 39.6], [12.6, 39.6], [26.4, 39.6]]);
  });

  it("sets everything off by the overhang a solid overhang moves the bin by, and spreads a plain overhang's inside", () => {
    // A solid overhang of 10 on the left: the body is 93.75 wide and the bin inside it sits 5.125 to the right.
    const ring = gridfinityDividerGrips(bin({ width: 93.75, gridfinityOverhangLeft: 10, gridfinityOverhangSolid: true, gridfinityCompartmentsX: 3 }))!;
    expect(ring.dividers.map((divider) => [Number(divider.position.toFixed(6)), point(divider.from)])).toEqual([[27, [-8.675, -19.8]], [54.6, [18.925, -19.8]]]);
    expect(ring.compartments.map((cell) => point(cell.centre))).toEqual([[-22.475, 0], [5.125, 0], [32.725, 0]]);
    // A plain one grows the bin: 93.75 - 1.9 = 91.85 inside, compartments of (91.85 - 2.4) / 3 = 29.816667 round its middle.
    const grown = gridfinityDividerGrips(bin({ width: 93.75, gridfinityOverhangLeft: 10, gridfinityCompartmentsX: 3 }))!;
    expect(grown.dividers.map((divider) => point(divider.from))).toEqual([[-15.508333, -19.8], [15.508333, -19.8]]);
    expect(grown.compartments.map((cell) => Number(cell.width.toFixed(6)))).toEqual([29.816667, 29.816667, 29.816667]);
  });

  it("takes the depth as the Compartments card does, from the footprint, for a shape that keeps only its size", () => {
    // No depth of its own and a size of 41.5: the footprint is 83.5 x 41.5, the bin of the other cases.
    const grips = gridfinityDividerGrips(bin({ ...three, depth: undefined, size: 41.5 }))!;
    expect(grips.dividers.map((divider) => [divider.axis, Number(divider.position.toFixed(6)), point(divider.from), point(divider.to)])).toEqual([
      ["x", 27, [-13.8, -19.8], [-13.8, 19.8]],
      ["x", 54.6, [13.8, -19.8], [13.8, 19.8]],
      ["z", 19.8, [-40.8, 0], [40.8, 0]],
    ]);
  });

  it("stands the grips on the dividers' top when the dividers are lower than the bin", () => {
    // 5 mm over the floor of 5.95.
    expect(gridfinityDividerGrips(bin({ gridfinityCompartmentsX: 3, gridfinityDividerHeight: 5 }))!.top).toBeCloseTo(10.95, 9);
  });

  it("has nothing for a bin of one compartment, a bin too low for dividers, a baseplate, another shape, or a bin locked, of locked shape or hidden", () => {
    for (const shape of [
      bin(),
      bin({ ...three, height: 7 + GRIDFINITY_LIP_HEIGHT }),
      bin({ ...three, gridfinityType: "baseplate", width: 84, depth: 42, height: 5 }),
      bin({ ...three, kind: "box" }),
      bin({ ...three, locked: true }),
      bin({ ...three, shapeLocked: true }),
      bin({ ...three, hidden: true }),
    ]) {
      expect(gridfinityDividerGrips(shape), JSON.stringify(shape)).toBeNull();
    }
    expect(gridfinityDividerGrips(bin({ ...three, gridfinityType: "tray", width: 80, depth: 40, height: 20 }))).not.toBeNull();
  });
});

describe("gridfinity divider dragged", () => {
  it("moves the divider by the pointer's way from where it began, onto steps of 0.5 mm from the wall, and writes its axis's list", () => {
    const shape = bin(three);
    const moved = dragged(shape, "x", 0, 27, 5)!;
    expect(moved.gridfinityDividerPositionsX!.map((p) => Number(p.toFixed(6)))).toEqual([32, 54.6]);
    expect(moved).not.toHaveProperty("gridfinityDividerPositionsZ");
    // The compartments beside it: 32 - 0.6 = 31.4 and 54.6 - 0.6 - 32.6 = 21.4; the third keeps 26.4.
    expect(sizes(bin({ ...three, ...moved })).slice(0, 3)).toEqual([[31.4, 19.2], [21.4, 19.2], [26.4, 19.2]]);
    expect(dragged(shape, "x", 0, 27, 5.2)!.gridfinityDividerPositionsX![0]).toBe(32);
    // In whole tenths: 27 + 5.3 lands on 32.3, not on 32.300000000000004.
    expect(dragged(shape, "x", 0, 27, 5.3, 0.1)!.gridfinityDividerPositionsX![0]).toBe(32.3);
    expect(dragged(shape, "z", 0, 19.8, -4.4)).toEqual({ gridfinityDividerPositionsZ: [15.5] });
  });

  it("measures the steps from the inside of the wall, not from the middle of the bin", () => {
    // Moved to 10 and 60.3 by hand; 60.3 - 0.26 = 60.04 lands on 60. From the middle it would be 19.24 -> 19 -> 59.8.
    const moved = dragged(bin({ ...three, gridfinityDividerPositionsX: [10, 60.3] }), "x", 1, 60.3, -0.26)!;
    expect(moved.gridfinityDividerPositionsX).toEqual([10, 60]);
  });

  it("stops 6 mm from the wall and from the next divider", () => {
    // At most 54.6 - 1.2 - 6 = 47.4, at least 6 + 0.6 = 6.6, which leaves the compartment beside it 6.0 wide.
    expect(dragged(bin(three), "x", 0, 27, 30)!.gridfinityDividerPositionsX![0]).toBeCloseTo(47.4, 9);
    const least = dragged(bin(three), "x", 0, 27, -30)!;
    expect(least.gridfinityDividerPositionsX![0]).toBeCloseTo(6.6, 9);
    expect(sizes(bin({ ...three, ...least }))[0][0]).toBe(6);
    // Already at its limit, dragged further: nothing to write.
    expect(dragged(bin({ ...three, gridfinityDividerPositionsX: [47.4, 54.6] }), "x", 0, 47.4, 10)).toBeNull();
  });

  it("moves the dividers of a tray as well", () => {
    // 80 x 40 tray, 78.1 inside, 2 across: the divider in the middle at (78.1 - 1.2) / 2 + 0.6 = 39.05.
    const tray = bin({ gridfinityType: "tray", width: 80, depth: 40, height: 20, gridfinityCompartmentsX: 2 });
    expect(dragged(tray, "x", 0, 39.05, 3.3)).toEqual({ gridfinityDividerPositionsX: [42.5] });
    // At most 78.1 - 6 - 0.6 = 71.5.
    expect(dragged(tray, "x", 0, 39.05, 100)!.gridfinityDividerPositionsX![0]).toBeCloseTo(71.5, 9);
  });

  it("gives the axis back the list it had when the pointer comes back within half a step, none if it was evenly spaced", () => {
    // A tray's evenly spaced divider at 39.05: 0.1 either way would land on 39, so nothing is written.
    const tray = bin({ gridfinityType: "tray", width: 80, depth: 40, height: 20, gridfinityCompartmentsX: 2 });
    const even = { position: 39.05, kept: undefined };
    expect(gridfinityDividerDragged(tray, "x", 0, even, 0.1)).toBeNull();
    expect(gridfinityDividerDragged(tray, "x", 0, even, -0.24)).toBeNull();
    // Out to 40 and back: the list goes again, the axis spaces evenly when the tray is resized, and the scene is as before.
    const out = { ...tray, ...gridfinityDividerDragged(tray, "x", 0, even, 0.95) };
    expect(out.gridfinityDividerPositionsX).toEqual([40]);
    const back = gridfinityDividerDragged(out, "x", 0, even, 0.1)!;
    expect(back).toHaveProperty("gridfinityDividerPositionsX", undefined);
    expect(projectShapesFingerprint([{ ...out, ...back }])).toBe(projectShapesFingerprint([tray]));
    expect(gridfinityDividerGrips({ ...out, ...back, width: 120 } as WorkplaneShape)!.dividers[0].position).toBeCloseTo((118.1 - 1.2) / 2 + 0.6, 9);
    // A list kept in mm comes back as it was, not the place the drag began on the steps.
    const kept = bin({ ...three, gridfinityDividerPositionsX: [10, 60.3] });
    const moved = { ...kept, ...dragged(kept, "x", 1, 60.3, 5) };
    expect(moved.gridfinityDividerPositionsX).toEqual([10, 65.5]);
    expect(gridfinityDividerDragged(moved, "x", 1, { position: 60.3, kept: [10, 60.3] }, -0.2)).toEqual({ gridfinityDividerPositionsX: [10, 60.3] });
  });
});
