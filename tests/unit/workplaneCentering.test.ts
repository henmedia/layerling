import { describe, expect, it } from "vitest";
import { plateCenterX, plateIndexAt } from "@/lib/buildPlates";
import { WORKPLANE_CENTER, faceWorkplaneCenteringShift, workplaneCenteringOffset, type WorkplanePlanarBounds } from "@/lib/workplaneCentering";

function bounds(minX: number, maxX: number, minZ: number, maxZ: number): WorkplanePlanarBounds {
  return { minX, maxX, minZ, maxZ };
}

describe("workplane centering offset", () => {
  it("moves an off-center bounding box onto the middle of the build plate", () => {
    const offset = workplaneCenteringOffset(bounds(10, 30, -50, -30));

    expect(offset).not.toBeNull();
    expect(offset?.x).toBeCloseTo(-20, 10);
    expect(offset?.z).toBeCloseTo(40, 10);
  });

  it("centers the bounding box itself, not the near corner", () => {
    // A 30 mm wide box sitting between 0 and 30 has to move back by half its width.
    const offset = workplaneCenteringOffset(bounds(0, 30, 0, 12));

    expect(offset?.x).toBeCloseTo(-15, 10);
    expect(offset?.z).toBeCloseTo(-6, 10);
  });

  it("reports no movement for a selection that already sits in the middle", () => {
    const offset = workplaneCenteringOffset(bounds(-12, 12, -8, 8));

    expect(offset).toEqual(WORKPLANE_CENTER);
  });

  it("leaves an asymmetric selection centered on its extents", () => {
    const offset = workplaneCenteringOffset(bounds(-40, 10, -5, 45));
    const centered = {
      minX: -40 + (offset?.x ?? 0),
      maxX: 10 + (offset?.x ?? 0),
      minZ: -5 + (offset?.z ?? 0),
      maxZ: 45 + (offset?.z ?? 0),
    };

    expect(centered.minX + centered.maxX).toBeCloseTo(0, 10);
    expect(centered.minZ + centered.maxZ).toBeCloseTo(0, 10);
  });

  it("refuses bounds that cannot be measured instead of moving objects by NaN", () => {
    expect(workplaneCenteringOffset(bounds(Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 0, 0))).toBeNull();
    expect(workplaneCenteringOffset(bounds(Number.NaN, 10, 0, 10))).toBeNull();
    expect(workplaneCenteringOffset(bounds(20, 10, 0, 10))).toBeNull();
    expect(workplaneCenteringOffset(bounds(0, 10, 20, 10))).toBeNull();
  });
});

describe("centering on a workplane laid on a face (#805)", () => {
  // The slope of a wedge: its x axis runs up the slope at 45 degrees, its z axis along the ridge.
  const r = Math.SQRT1_2;
  const xAxis = { x: r, y: r, z: 0 };
  const zAxis = { x: 0, y: 0, z: 1 };

  it("moves along the face only, onto the point picked as the workplane's origin", () => {
    // Measured from that point: 4 to 16 up the slope, -2 to 8 along the ridge, so the middle is 10 and 3 away.
    const shift = faceWorkplaneCenteringShift(bounds(4, 16, -2, 8), xAxis, zAxis);

    expect(shift?.x).toBeCloseTo(-10 * r, 9);
    expect(shift?.y).toBeCloseTo(-10 * r, 9);
    expect(shift?.z).toBeCloseTo(-3, 9);
    // Nothing along the face's normal: the part keeps standing on the slope.
    const normal = { x: -r, y: r, z: 0 };
    expect((shift?.x ?? 0) * normal.x + (shift?.y ?? 0) * normal.y + (shift?.z ?? 0) * normal.z).toBeCloseTo(0, 9);
  });

  it("does not move what cannot be measured", () => {
    expect(faceWorkplaneCenteringShift(bounds(Number.NaN, 1, 0, 1), xAxis, zAxis)).toBeNull();
  });
});

describe("centering on a later build plate", () => {
  it("goes to the middle of the plate the selection stands on, not the first plate (#1355)", () => {
    // Two plates 220 mm wide, 20 mm apart: the second one's middle lies 240 mm to the right.
    const workspace = { width: 220, depth: 220, plates: ["", ""] };
    const selection = bounds(250, 270, 10, 30);
    const plateX = plateCenterX(workspace, plateIndexAt(workspace, (selection.minX + selection.maxX) / 2));
    expect(plateX).toBe(240);
    const offset = workplaneCenteringOffset(selection, { x: plateX, z: 0 });
    expect(offset?.x).toBeCloseTo(-20, 10);
    expect(offset?.z).toBeCloseTo(-20, 10);
    // Without a plate given it still goes to the origin, the first plate's middle.
    expect(workplaneCenteringOffset(selection)?.x).toBeCloseTo(-260, 10);
  });
});
