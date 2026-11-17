import { describe, expect, it } from "vitest";
import { LID_THREAD_STANDARD_SPECS, NECK_LARGER, NECK_SMALLER, lidNeckDiameter, lidNeckFit, lidNeckFitPatch, lidStandardThread, type LidThreadStandard } from "@/lib/lidTool";
import type { WorkplaneShape } from "@/types/layerling";

type Standard = Exclude<LidThreadStandard, "own">;
const STANDARDS = Object.keys(LID_THREAD_STANDARD_SPECS) as Standard[];

function shape(overrides: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return { id: "jar", name: "Jar", kind: "cylinder", color: "#d97813", x: 0, z: 0, elevation: 0, size: 40, width: 40, depth: 40, height: 60, rotation: 0, ...overrides } as WorkplaneShape;
}

/** A cylinder hollowed with its top open, as the Hollow tool leaves it: a mesh that remembers the cylinder it was. */
function hollowed(before: Partial<WorkplaneShape> = {}, extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  const frame = { x: 0, z: 0, elevation: 0, width: 40, depth: 40, height: 60, rotation: 0, rotationX: 0, rotationZ: 0, mirrorX: false, mirrorY: false, mirrorZ: false };
  const feature = { kind: "shell" as const, amount: 2, edgeCount: 0, openings: "top" as const };
  return shape({
    kind: "mesh",
    edgeTreatments: [feature],
    edgeTreatmentHistory: [{ id: "h", createdAt: 1, feature, before: shape(before), appliedFrame: frame }],
    importedMesh: { positions: [-20, 0, 0, 20, 60, 0, 0, 60, 20], baseWidth: 40, baseDepth: 40, baseHeight: 60, triangleCount: 1, sourceFormat: "json" },
    ...extra,
  });
}

describe("fitting a body to a standard's neck (issue #1482)", () => {
  it("makes the top the middle of what counts as the neck, so Make lid gives it the thread", () => {
    expect(STANDARDS.map((standard) => lidNeckDiameter(standard))).toEqual([24.54, 24.11, 41.9, 65.85, 81.85]);
    for (const standard of STANDARDS) {
      const { minor, neckFrom, neckTo } = lidStandardThread(standard);
      const diameter = lidNeckDiameter(standard);
      // As far from the smallest neck as from the largest, a millimetre and a fifth apart.
      expect(diameter - neckFrom).toBeCloseTo(neckTo - diameter, 9);
      expect(diameter).toBeCloseTo(minor - (NECK_SMALLER - NECK_LARGER) / 2, 9);
      expect(lidNeckFit(standard, { outer: diameter / 2, inner: diameter / 2 })).toBeNull();
    }
  });

  it("resizes a cylinder's width and depth to the neck and keeps its height", () => {
    // The cylinder of issue #1482: 40 mm across, much too narrow for a Mason 70 neck.
    expect(lidNeckFit("mason70", { outer: 20, inner: 20 })).toEqual({ reason: "size", diameter: 40 });
    expect(lidNeckFitPatch(shape(), "mason70")).toEqual({ width: 65.85, depth: 65.85, size: 65.85 });
    expect(lidNeckFitPatch(shape({ width: 100, depth: 100 }), "pco1881")).toEqual({ width: 24.54, depth: 24.54, size: 24.54 });
    // An elliptic cylinder comes out round; a tube and a ring keep their wall, which is their own setting.
    expect(lidNeckFitPatch(shape({ kind: "ellipse", width: 50, depth: 30 }), "gl45")).toEqual({ width: 41.9, depth: 41.9, size: 41.9 });
    expect(lidNeckFitPatch(shape({ kind: "tube", bevel: 3 }), "mason86")).toEqual({ width: 81.85, depth: 81.85, size: 81.85 });
    expect(lidNeckFitPatch(shape({ kind: "ring", height: 12 }), "mason70")).toEqual({ width: 65.85, depth: 65.85, size: 65.85 });
    // Turned about the vertical, or upside down, its top is still round.
    expect(lidNeckFitPatch(shape({ rotation: 37 }), "mason70")).not.toBeNull();
    expect(lidNeckFitPatch(shape({ rotationX: 180 }), "mason70")).not.toBeNull();
  });

  it("fits a hollowed cylinder too, which the editor hollows again at its new size", () => {
    expect(lidNeckFitPatch(hollowed(), "mason70")).toEqual({ width: 65.85, depth: 65.85, size: 65.85 });
    expect(lidNeckFitPatch(hollowed({ kind: "tube" }), "gl45")).toEqual({ width: 41.9, depth: 41.9, size: 41.9 });
    // A fillet laid after the hollowing would round the rim off the neck; a hollowed box is no neck.
    const fillet = { kind: "fillet" as const, amount: 1, edgeCount: 1, edgeIds: [0] };
    const filleted = hollowed();
    filleted.edgeTreatments = [...filleted.edgeTreatments!, fillet];
    filleted.edgeTreatmentHistory = [...filleted.edgeTreatmentHistory!, { id: "f", createdAt: 2, feature: fillet, before: shape({ kind: "mesh" }), appliedFrame: filleted.edgeTreatmentHistory![0].appliedFrame }];
    expect(lidNeckFitPatch(filleted, "mason70")).toBeNull();
    expect(lidNeckFitPatch(hollowed({ kind: "box" }), "mason70")).toBeNull();
    expect(lidNeckFitPatch(hollowed({ kind: "cone" }), "mason70")).toBeNull();
    // Hollowed lying on its side, or tipped over since: its top is no circle.
    expect(lidNeckFitPatch(hollowed({ rotationX: 90 }), "mason70")).toBeNull();
    expect(lidNeckFitPatch(hollowed({}, { rotationZ: 90 }), "mason70")).toBeNull();
    // A mesh that never was a cylinder - an STL - has nothing the editor can resize exactly.
    expect(lidNeckFitPatch(shape({ kind: "mesh", importedMesh: { positions: [0, 0, 0, 1, 0, 0, 0, 1, 0], baseWidth: 40, baseDepth: 40, baseHeight: 60, triangleCount: 1, sourceFormat: "json" } }), "mason70")).toBeNull();
  });

  it("leaves everything else to be measured only: other kinds, groups, holes, bodies on their side or tapered", () => {
    for (const kind of ["box", "cone", "sphere", "curvedCone", "slot", "star"] as const) expect(lidNeckFitPatch(shape({ kind }), "mason70"), kind).toBeNull();
    expect(lidNeckFitPatch(shape({ kind: "group", groupedShapes: [shape({ id: "a" }), shape({ id: "b", hole: true, width: 36, depth: 36, elevation: 2 })] }), "mason70")).toBeNull();
    expect(lidNeckFitPatch(shape({ hole: true }), "mason70")).toBeNull();
    expect(lidNeckFitPatch(shape({ rotationX: 90 }), "mason70")).toBeNull();
    expect(lidNeckFitPatch(shape({ rotationZ: 45 }), "mason70")).toBeNull();
    expect(lidNeckFitPatch(shape({ taperTopWidth: 30, taperTopDepth: 30 }), "mason70")).toBeNull();
    expect(lidNeckFitPatch(shape({ extrudeTwist: 30 }), "mason70")).toBeNull();
  });

  it("does not fit a cylinder whose sides leave it too coarse to be the neck at that size", () => {
    // Its corners on the circle, the middles of its sides inside it: six sides are a hexagon, no neck.
    expect(lidNeckFitPatch(shape({ sides: 6 }), "mason70")).toBeNull();
    // 32 sides of a 65.85 mm Mason 70 neck come 0.16 mm closer to the axis in the middle of each side: round enough.
    expect(lidNeckFitPatch(shape({ sides: 32 }), "mason70")).not.toBeNull();
    // 28 come 0.21 closer, more than Make lid counts as round; 20 would also be narrower than the neck's 65.25 mm.
    expect(lidNeckFitPatch(shape({ sides: 28 }), "mason70")).toBeNull();
    expect(lidNeckFitPatch(shape({ sides: 20 }), "mason70")).toBeNull();
    // A PCO neck is small: 24 sides are round enough there.
    expect(lidNeckFitPatch(shape({ sides: 24 }), "pco1881")).not.toBeNull();
    // Without sides of its own a cylinder takes as many as its size needs, always enough.
    for (const standard of STANDARDS) expect(lidNeckFitPatch(shape(), standard), standard).not.toBeNull();
  });
});
