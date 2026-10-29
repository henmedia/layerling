import { describe, expect, it } from "vitest";
import type { WorkplaneShape } from "@/types/layerling";
import {
  canonicalizeShape,
  cloneWorkplaneShapeTreeWithFreshIds,
  cleanNearZero,
  cleanRotationDegrees,
  fallbackSolidColor,
  meshYawDegrees,
  mirroredAxisCount,
  mirrorSign,
  normalizeDegrees,
  proportionalResizeScale,
  preservesEdgeTreatmentSize,
  resizedImportedCoordinates,
  resizedImportedMeshPositions,
  resizedShapeSize,
  serializeShapesForSync,
  shapeDepth,
  shapeExtrudeDeformAt,
  shapeHasExtrudeDeform,
  shapeHasShapeDeform,
  shapeHasTaper,
  shapeSupportsTaper,
  shapeOverallFootprintDimensions,
  shapeTransformShouldRemainEditable,
  shapeWithParametricSource,
  shellNeedingRebuild,
  hollowStretchSincePicture,
  shellRebuildEntry,
  shellRebuildReference,
  edgeTreatmentsAfterShell,
  patchTouchesBodyParameters,
  shapeTaperDimensions,
  shapeTaperScaleAt,
  shapeWidth,
  withHoleMode,
  workplaneShapesEqual,
} from "@/lib/workplaneShapes";

function shape(overrides: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return {
    id: "box-1",
    name: "Box",
    kind: "box",
    color: "#d41721",
    x: 0,
    z: 0,
    elevation: 0,
    size: 20,
    width: 20,
    depth: 20,
    height: 20,
    rotation: 0,
    locked: false,
    hidden: false,
    ...overrides,
  };
}

describe("workplane shape helpers", () => {
  it("normalizes and cleans rotations", () => {
    expect(normalizeDegrees(-90)).toBe(270);
    expect(normalizeDegrees(450)).toBe(90);
    expect(cleanRotationDegrees(Number.NaN)).toBe(0);
    expect(cleanRotationDegrees(-0.02)).toBe(0);
    expect(cleanRotationDegrees(359.98)).toBe(0);
    expect(cleanRotationDegrees(12.347)).toBe(12.35);
  });

  it("keeps an angle to two decimals, so half of 22.5 degrees stays 11.25 (#552)", () => {
    expect(cleanRotationDegrees(11.25)).toBe(11.25);
    expect(cleanRotationDegrees(-11.25)).toBe(348.75);
    expect(cleanRotationDegrees(22.5)).toBe(22.5);
    expect(canonicalizeShape({ id: "a", name: "A", kind: "box", color: "#ff0000", x: 0, z: 0, elevation: 0, size: 10, width: 10, depth: 10, height: 10, rotation: 11.25, locked: false, hidden: false }).rotation).toBe(11.25);
  });

  it("preserves the meaningful yaw of low-sided circular primitives", () => {
    // An octagon fills width and depth alike and turns into itself by 45 degrees.
    const octagonalPrism = shape({ kind: "cylinder", width: 10, depth: 10, sides: 8 });
    expect(meshYawDegrees({ ...octagonalPrism, rotation: 50 })).toBeCloseTo(5);
    expect(meshYawDegrees({ ...octagonalPrism, rotation: 30 })).toBeCloseTo(-15);
    expect(meshYawDegrees({ ...octagonalPrism, sides: 96, rotation: 90 })).toBe(0);
    // A triangle or hexagon is stretched to fill the footprint (regularPolygonFootprintScale),
    // so one side step no longer turns it into itself: it keeps the viewport's angle.
    const triangularPrism = shape({ kind: "cylinder", width: 10, depth: 10, sides: 3 });
    expect(meshYawDegrees({ ...triangularPrism, rotation: 150 })).toBe(150);
    expect(meshYawDegrees({ ...triangularPrism, sides: 6, rotation: 70 })).toBe(70);
    expect(meshYawDegrees({ ...triangularPrism, width: 12, rotation: 150 })).toBe(150);
    expect(meshYawDegrees({ ...triangularPrism, kind: "box", rotation: 30 })).toBe(30);
  });

  it("cleans near-zero values and derives dimensions", () => {
    const base = shape({ size: 30, width: 18, depth: 24 });
    expect(cleanNearZero(0.004)).toBe(0);
    expect(cleanNearZero(0.006)).toBe(0.006);
    expect(shapeWidth(base)).toBe(18);
    expect(shapeDepth(base)).toBe(24);
    expect(resizedShapeSize(18, 24)).toBe(24);
  });

  it("uses proportional scale instead of square dimensions while shift-resizing", () => {
    expect(proportionalResizeScale(50, 100, 100, 150)).toBe(2);
    expect(proportionalResizeScale(50, 100, 60, 200)).toBe(2);
    expect(proportionalResizeScale(50, 100, 25, 80)).toBe(0.5);
  });

  it("interpolates actual top and bottom taper dimensions while excluding gears", () => {
    const tapered = shape({
      taperBottomWidth: 10,
      taperBottomDepth: 5,
      taperTopWidth: 30,
      taperTopDepth: 40,
    });
    expect(shapeTaperDimensions(tapered)).toEqual({ topWidth: 30, topDepth: 40, bottomWidth: 10, bottomDepth: 5 });
    expect(shapeOverallFootprintDimensions(tapered)).toEqual({ width: 30, depth: 40 });
    expect(shapeHasTaper(tapered)).toBe(true);
    expect(shapeTaperScaleAt(tapered, 0, "width")).toBe(0.5);
    expect(shapeTaperScaleAt(tapered, 0.5, "width")).toBe(1);
    expect(shapeTaperScaleAt(tapered, 1, "width")).toBe(1.5);
    expect(shapeTaperScaleAt(tapered, 0, "depth")).toBe(0.25);
    expect(shapeTaperScaleAt(tapered, 0.5, "depth")).toBe(1.125);
    expect(shapeTaperScaleAt(tapered, 1, "depth")).toBe(2);

    const legacy = shape({ taperBottomScale: 0.5, taperTopScale: 1.5 });
    expect(shapeTaperDimensions(legacy)).toEqual({ topWidth: 30, topDepth: 30, bottomWidth: 10, bottomDepth: 10 });

    const gear = shape({ kind: "gear", taperBottomWidth: 10, taperTopWidth: 30 });
    expect(shapeHasTaper(gear)).toBe(false);
    expect(shapeTaperScaleAt(gear, 0.5, "width")).toBe(1);
    expect(shapeTaperScaleAt(gear, 0.5, "depth")).toBe(1);

    const thread = shape({ kind: "thread", taperBottomWidth: 10, taperTopWidth: 30 });
    expect(shapeHasTaper(thread)).toBe(false);
    expect(shapeTaperScaleAt(thread, 0.5, "width")).toBe(1);

    // The knurl takes a taper since #630.
    const knurl = shape({ kind: "knurl", taperBottomWidth: 10, taperTopWidth: 30 });
    expect(shapeHasTaper(knurl)).toBe(true);

    const pyramid = shape({ kind: "pyramid", taperBottomWidth: 10, taperTopWidth: 30 });
    expect(shapeHasTaper(pyramid)).toBe(false);
    expect(shapeTaperScaleAt(pyramid, 0.5, "width")).toBe(1);
  });

  it("treats a twisted or leaning extrusion as the same non-affine deformation category as taper", () => {
    const plain = shape();
    expect(shapeHasExtrudeDeform(plain)).toBe(false);
    expect(shapeHasShapeDeform(plain)).toBe(false);

    const twisted = shape({ extrudeTwist: 90 });
    expect(shapeHasExtrudeDeform(twisted)).toBe(true);
    expect(shapeHasShapeDeform(twisted)).toBe(true);
    expect(shapeExtrudeDeformAt(twisted, 0).twistRadians).toBe(0);
    expect(shapeExtrudeDeformAt(twisted, 1).twistRadians).toBeCloseTo(Math.PI / 2);
    expect(shapeExtrudeDeformAt(twisted, 0.5).twistRadians).toBeCloseTo(Math.PI / 4);

    const leaning = shape({ extrudeTopOffsetX: 10, extrudeTopOffsetZ: -4 });
    expect(shapeHasExtrudeDeform(leaning)).toBe(true);
    expect(shapeExtrudeDeformAt(leaning, 0.5)).toEqual({ twistRadians: 0, offsetX: 5, offsetZ: -2 });

    // A taper-only shape must keep signalling shapeHasShapeDeform even though
    // it has no extrude deform of its own - the CAD-primitive gate this backs
    // (LayerlingEditor.tsx's cadModifierPrimitiveForShape) needs either one.
    const tapered = shape({ taperTopWidth: 30, taperBottomWidth: 10 });
    expect(shapeHasExtrudeDeform(tapered)).toBe(false);
    expect(shapeHasShapeDeform(tapered)).toBe(true);

    // Twist/lean follow the same shape restriction list as taper (no gear, thread, spring, pyramid, ruler).
    const gearTwisted = shape({ kind: "gear", extrudeTwist: 45 });
    expect(shapeHasExtrudeDeform(gearTwisted)).toBe(false);
    expect(shapeHasShapeDeform(gearTwisted)).toBe(false);
  });

  it("treats a twist/lean-only change as a real difference, not a no-op patch", () => {
    // workplaneShapesEqual gates whether an inspector edit actually commits
    // (LayerlingEditor.tsx's updateShape returns the old shape untouched when
    // it reports true) - missing these three fields made every drag on the
    // Twist & Lean sliders silently revert, the slider looking unresponsive.
    const plain = shape();
    expect(workplaneShapesEqual(plain, shape({ extrudeTwist: 45 }))).toBe(false);
    expect(workplaneShapesEqual(plain, shape({ extrudeTopOffsetX: 5 }))).toBe(false);
    expect(workplaneShapesEqual(plain, shape({ extrudeTopOffsetZ: -5 }))).toBe(false);
    expect(workplaneShapesEqual(plain, shape())).toBe(true);
  });

  it("canonicalizes mirror flags and nested group rotations", () => {
    const canonical = canonicalizeShape(
      shape({
        rotation: 360,
        rotationX: -0.1,
        rotationZ: 45.04,
        mirrorX: false,
        mirrorY: true,
        groupedShapes: [shape({ id: "child", rotation: 720, mirrorZ: false })],
      }),
    );

    expect(canonical.rotation).toBe(0);
    expect(canonical.rotationX).toBe(0);
    expect(canonical.rotationZ).toBe(45.04);
    expect(canonical.mirrorX).toBeUndefined();
    expect(canonical.mirrorY).toBe(true);
    expect(canonical.groupedShapes?.[0].rotation).toBe(0);
    expect(canonical.groupedShapes?.[0].mirrorZ).toBeUndefined();
  });

  it("forces a cylinder to stay circular but leaves an ellipse independent", () => {
    const stretched = canonicalizeShape(shape({ kind: "cylinder", width: 12, depth: 8 }));
    expect(stretched.width).toBe(12);
    expect(stretched.depth).toBe(12);
    expect(stretched.size).toBe(12);

    const alreadyCircular = canonicalizeShape(shape({ kind: "cylinder", width: 10, depth: 10 }));
    expect(alreadyCircular.width).toBe(10);
    expect(alreadyCircular.depth).toBe(10);

    const ellipse = canonicalizeShape(shape({ kind: "ellipse", width: 12, depth: 8 }));
    expect(ellipse.width).toBe(12);
    expect(ellipse.depth).toBe(8);

    // A gear set by module stays round; the rack (#201) is a bar whose depth is its own.
    const ring = canonicalizeShape(shape({ kind: "gear", gearType: "internal", gearProfile: "involute", width: 71, depth: 50 }));
    expect(ring.depth).toBe(71);
    const rack = canonicalizeShape(shape({ kind: "gear", gearType: "rack", gearProfile: "involute", width: 75.4, depth: 7.5 }));
    expect(rack.width).toBe(75.4);
    expect(rack.depth).toBe(7.5);
  });

  it("rounds a Gridfinity bin or baseplate to whole grid units, however its box was dragged", () => {
    const bin = canonicalizeShape(shape({ kind: "gridfinity", gridfinityType: "bin", width: 100, depth: 30, height: 40 }));
    expect(bin).toMatchObject({ width: 83.5, depth: 41.5, height: 39.4, size: 83.5 });
    const plate = canonicalizeShape(shape({ kind: "gridfinity", gridfinityType: "baseplate", width: 130, depth: 90, height: 12 }));
    expect(plate).toMatchObject({ width: 126, depth: 84, height: 5, size: 126 });
  });

  it("keeps rotated groups editable so they can still be ungrouped", () => {
    const child = shape({ id: "child" });
    const group = shape({
      id: "group",
      kind: "mesh",
      rotation: 45,
      groupedBaseWidth: 20,
      groupedBaseDepth: 20,
      groupedBaseHeight: 20,
      groupedShapes: [child],
    });

    expect(shapeTransformShouldRemainEditable(group)).toBe(true);
    expect(shapeTransformShouldRemainEditable(shape({ rotation: 45 }))).toBe(true);
    expect(canonicalizeShape(group)).toMatchObject({
      rotation: 45,
      groupedBaseWidth: 20,
      groupedBaseDepth: 20,
      groupedBaseHeight: 20,
      groupedShapes: [{ id: "child" }],
    });
  });

  it("assigns fresh object IDs throughout duplicated group trees", () => {
    const original = shape({
      id: "outer-group",
      kind: "mesh",
      x: 14,
      z: -9,
      elevation: 3,
      groupedShapes: [
        shape({ id: "round-roof-child", kind: "roundRoof" }),
        shape({
          id: "nested-group",
          kind: "mesh",
          groupedShapes: [shape({ id: "nested-box" })],
        }),
      ],
    });

    const duplicate = cloneWorkplaneShapeTreeWithFreshIds(original, "copy");
    const collectIds = (entry: WorkplaneShape): string[] => [
      entry.id,
      ...(entry.groupedShapes ?? []).flatMap(collectIds),
    ];
    const originalIds = collectIds(original);
    const duplicateIds = collectIds(duplicate);

    expect(new Set(duplicateIds).size).toBe(duplicateIds.length);
    expect(duplicateIds.every((id) => !originalIds.includes(id))).toBe(true);
    expect(duplicate).toMatchObject({ x: 14, z: -9, elevation: 3 });
    expect(original.groupedShapes?.[0].id).toBe("round-roof-child");
    expect(duplicate.groupedShapes?.[0].kind).toBe("roundRoof");
  });

  it("keeps shallow equality strict for shape payload references", () => {
    const importedMesh = { positions: [0, 0, 0], baseWidth: 1, baseDepth: 1, baseHeight: 1, triangleCount: 0, sourceFormat: "json" as const };
    const first = shape({ importedMesh });
    const sameReference = shape({ importedMesh });
    const sameValues = shape({ importedMesh: { ...importedMesh, positions: [...importedMesh.positions] } });

    expect(workplaneShapesEqual(first, sameReference)).toBe(true);
    expect(workplaneShapesEqual(first, sameValues)).toBe(false);
  });

  it("serializes canonical shapes for sync", () => {
    expect(JSON.parse(serializeShapesForSync([shape({ rotation: 359.9, mirrorX: false })]))).toEqual([
      expect.objectContaining({
        id: "box-1",
        rotation: 0,
        rotationX: 0,
        rotationZ: 0,
      }),
    ]);
  });

  it("maps helper flags and fallback colors", () => {
    expect(mirrorSign(true)).toBe(-1);
    expect(mirrorSign(false)).toBe(1);
    expect(mirroredAxisCount(shape({ mirrorX: true, mirrorY: true }))).toBe(2);
    expect(fallbackSolidColor(shape({ kind: "sphere" }))).toBe("#0098c7");
    expect(fallbackSolidColor(shape({ kind: "box" }))).toBe("#d41721");
  });

  it("applies an explicitly selected group color to every nested child", () => {
    const grouped = shape({
      kind: "mesh",
      color: "#111111",
      groupedShapes: [
        shape({ id: "child-box", color: "#222222" }),
        shape({
          id: "child-group",
          kind: "mesh",
          color: "#333333",
          groupedShapes: [shape({ id: "grandchild", kind: "sphere", color: "#444444" })],
        }),
      ],
    });

    const recolored = withHoleMode(grouped, false, "#12abef");

    expect(recolored.color).toBe("#12abef");
    expect(recolored.groupedShapes?.map((child) => child.color)).toEqual(["#12abef", "#12abef"]);
    expect(recolored.groupedShapes?.[1].groupedShapes?.[0].color).toBe("#12abef");
    expect(grouped.groupedShapes?.[0].color).toBe("#222222");
  });

  it("preserves the selected solid color while toggling hole mode", () => {
    const colored = shape({ color: "#35a86b" });
    const hole = withHoleMode(colored, true);
    const solid = withHoleMode(hole, false);

    expect(hole.hole).toBe(true);
    expect(hole.color).toBe("#35a86b");
    expect(solid.hole).toBe(false);
    expect(solid.color).toBe("#35a86b");
  });

  it("behaelt innere Aussparungen und Koerper beim Umschalten einer Gruppe verlustfrei", () => {
    const group = shape({
      id: "group-composite",
      hole: false,
      color: "#d41721",
      groupedShapes: [
        shape({ id: "gear-solid", kind: "gear", hole: false, color: "#d41721" }),
        shape({ id: "thread-hole", kind: "thread", hole: true, color: "#b8c2cc" }),
      ],
    });

    // Umschalten auf Aussparung
    const groupAsHole = withHoleMode(group, true);
    expect(groupAsHole.hole).toBe(true);
    expect(groupAsHole.groupedShapes?.[0].hole).toBe(false); // Zahnrad bleibt Koerper
    expect(groupAsHole.groupedShapes?.[1].hole).toBe(true);  // Gewindebohrung bleibt Aussparung

    // Zurueckschalten auf Koerper
    const groupBackToSolid = withHoleMode(groupAsHole, false);
    expect(groupBackToSolid.hole).toBe(false);
    expect(groupBackToSolid.groupedShapes?.[0].hole).toBe(false);
    expect(groupBackToSolid.groupedShapes?.[1].hole).toBe(true);
  });

  it("macht aus einer reinen Aussparungsgruppe beim Umschalten auf Koerper auch koerperliche Teile", () => {
    const group = shape({
      id: "group-holes",
      hole: true,
      groupedShapes: [shape({ id: "a", hole: true }), shape({ id: "b", kind: "cylinder", hole: true })],
    });
    const solid = withHoleMode(group, false);
    expect(solid.groupedShapes?.map((child) => child.hole)).toEqual([false, false]);
    expect(withHoleMode(solid, true).groupedShapes?.map((child) => child.hole)).toEqual([true, true]);
  });

  it("can resize the body while preserving fillet and chamfer boundary distances", () => {
    const modified = shape({
      kind: "mesh",
      width: 40,
      depth: 20,
      height: 40,
      edgeResizeMode: "preserve",
      edgeTreatments: [{ kind: "fillet", amount: 1, edgeCount: 1 }],
      importedMesh: {
        positions: [-10, 0, 0, -9, 1, 0, 0, 10, 0, 9, 19, 0, 10, 20, 0],
        baseWidth: 20,
        baseDepth: 20,
        baseHeight: 20,
        triangleCount: 1,
        sourceFormat: "json",
      },
    });

    expect(preservesEdgeTreatmentSize(modified)).toBe(true);
    expect(resizedImportedMeshPositions(modified)).toEqual([
      -20, 0, 0,
      -19, 1, 0,
      0, 20, 0,
      19, 39, 0,
      20, 40, 0,
    ]);
    expect(resizedImportedMeshPositions({ ...modified, edgeResizeMode: "scale" })[3]).toBe(-18);
    expect(resizedImportedCoordinates(modified, [-9, 1, 0, 9, 19, 0])).toEqual([-19, 1, 0, 19, 39, 0]);
  });

  it("tapers and twists every shape but those with fixed measures or a top of their own (#111)", () => {
    for (const kind of ["box", "slot", "roundedBox", "star", "heart", "crescent", "honeycomb", "dovetail", "knurl"] as const) expect(shapeSupportsTaper(kind)).toBe(true);
    for (const kind of ["gear", "thread", "spring", "hinge", "pyramid", "bentTube", "teardrop", "counterbore", "countersink", "doubleCountersink", "ruler"] as const) expect(shapeSupportsTaper(kind)).toBe(false);
  });

  it("hollows a resized hollow body again instead of keeping bands at its sides", () => {
    const frame = { x: 0, z: 0, elevation: 0, width: 60, depth: 60, height: 40, rotation: 0, rotationX: 0, rotationZ: 0, mirrorX: false, mirrorY: false, mirrorZ: false };
    const feature = { kind: "shell" as const, amount: 2, edgeCount: 0, openings: "top" as const };
    const hollow = (kind: WorkplaneShape["kind"], width: number, depth: number) => shape({
      kind: "mesh",
      width,
      depth,
      height: 40,
      edgeResizeMode: "preserve",
      edgeTreatments: [feature],
      edgeTreatmentHistory: [{ id: "h", createdAt: 1, feature, before: shape({ kind, width: 60, depth: 60, height: 40 }), appliedFrame: frame }],
      importedMesh: { positions: [-30, 0, 0, 30, 40, 0], baseWidth: 60, baseDepth: 60, baseHeight: 40, triangleCount: 1, sourceFormat: "json" },
    });
    // Just hollowed: nothing to redo; resized: the walls are rebuilt, not banded.
    expect(shellNeedingRebuild(hollow("cylinder", 60, 60))).toBeNull();
    expect(shellNeedingRebuild(hollow("cylinder", 45, 50))?.id).toBe("h");
    expect(preservesEdgeTreatmentSize(hollow("cylinder", 45, 50))).toBe(false);
    // A star stretched unevenly has no round body to hollow again; it keeps the bands.
    expect(shellRebuildEntry(hollow("star", 45, 50))).toBeNull();
    expect(shellNeedingRebuild(hollow("star", 45, 45))?.id).toBe("h");
    // A fillet after the hollowing on edges it knows is laid again on the fresh walls (forum, 621213).
    const fillet = { kind: "fillet" as const, amount: 1, edgeCount: 1, edgeIds: [0] };
    const filleted = hollow("cylinder", 45, 50);
    const shellEntry = filleted.edgeTreatmentHistory![0];
    filleted.edgeTreatments = [feature, fillet];
    filleted.edgeTreatmentHistory = [shellEntry, { id: "f", createdAt: 2, feature: fillet, before: shape({ kind: "mesh", width: 60, depth: 60, height: 40 }), appliedFrame: frame }];
    expect(shellNeedingRebuild(filleted)?.id).toBe("h");
    expect(edgeTreatmentsAfterShell(filleted)?.map((entry) => entry.id)).toEqual(["f"]);
    expect(preservesEdgeTreatmentSize(filleted)).toBe(false);
    // One without its edges, or with no record of its own, keeps the old way.
    const unknownEdges = { ...filleted, edgeTreatments: [feature, { ...fillet, edgeIds: undefined }], edgeTreatmentHistory: [shellEntry, { ...filleted.edgeTreatmentHistory[1], feature: { ...fillet, edgeIds: undefined } }] };
    expect(shellRebuildEntry(unknownEdges)).toBeNull();
    expect(preservesEdgeTreatmentSize(unknownEdges)).toBe(true);
    const unrecorded = { ...filleted, edgeTreatmentHistory: [shellEntry] };
    expect(shellRebuildEntry(unrecorded)).toBeNull();
  });

  it("measures a filleted hollow body against the frame its last fillet left, not the hollowing's (forum, 621472)", () => {
    // Hollowed at 158.5 x 180, then filleted, which left the box 158.127 x 179.681 and its middle 0.158 further along x.
    const shellFrame = { x: 3.788, z: 0, elevation: 0, width: 158.5, depth: 180, height: 120, rotation: 0, rotationX: 0, rotationZ: 0, mirrorX: false, mirrorY: false, mirrorZ: false };
    const filletFrame = { ...shellFrame, x: 3.946, width: 158.127, depth: 179.681 };
    const shell = { kind: "shell" as const, amount: 3, edgeCount: 0, openings: "top-bottom" as const };
    const fillet = { kind: "fillet" as const, amount: 1.35, edgeCount: 8, edgeIds: [0, 2, 4, 5, 6, 7, 9, 11] };
    const body = (width: number, depth: number, x = 3.946) => shape({
      kind: "mesh",
      x,
      width,
      depth,
      height: 120,
      edgeResizeMode: "preserve",
      edgeTreatments: [shell, fillet],
      edgeTreatmentHistory: [
        { id: "h", createdAt: 1, feature: shell, before: shape({ kind: "ellipse", x: 2.538, width: 148.27, depth: 149.67, height: 120 }), appliedFrame: shellFrame },
        { id: "f", createdAt: 2, feature: fillet, before: shape({ kind: "mesh", x: 3.788, width: 158.5, depth: 180, height: 120 }), appliedFrame: filletFrame },
      ],
      importedMesh: { positions: [-79, 0, 0, 79, 120, 0], baseWidth: width, baseDepth: depth, baseHeight: 120, triangleCount: 1, sourceFormat: "json" },
    });
    // As the fillet left it: nothing to rebuild, so it is not hollowed again and again.
    expect(shellNeedingRebuild(body(158.127, 179.681))).toBeNull();
    // Resized since: rebuilt, stretched from the fillet's frame, and placed where the body now is.
    const resized = body(79.0635, 179.681, 13.946);
    const entry = shellNeedingRebuild(resized);
    expect(entry?.id).toBe("h");
    const reference = shellRebuildReference(resized, entry!);
    expect(reference.appliedFrame).toEqual(filletFrame);
    expect(hollowStretchSincePicture(resized, reference)).toEqual({ x: 0.5, z: 1, height: 1 });
  });

  it("reads the stretch of a hollow body in the axes of the shape it was hollowed from, a quarter turn apart (#729)", () => {
    const feature = { kind: "shell" as const, amount: 2, edgeCount: 0, openings: "top" as const };
    // Hollowed from a 60 x 20 box turned by 90 degrees, so the body stands 20 wide and 60 deep in the world.
    const applied = { x: 0, z: 0, elevation: 0, width: 20, depth: 60, height: 20, rotation: 0, rotationX: 0, rotationZ: 0, mirrorX: false, mirrorY: false, mirrorZ: false };
    const entry = { id: "h", createdAt: 1, feature, before: shape({ kind: "box", width: 60, depth: 20, height: 20, rotation: 90 }), appliedFrame: applied };
    const body = shape({ kind: "mesh", width: 20, depth: 30, height: 20, edgeTreatments: [feature], edgeTreatmentHistory: [entry] });
    // Its depth halved: that is the box's width (its own x axis lies along the world's z), not its depth.
    expect(hollowStretchSincePicture(body, entry)).toEqual({ x: 0.5, z: 1, height: 1 });
    // Without the quarter turn the axes keep their places.
    const straight = { ...entry, before: shape({ kind: "box", width: 20, depth: 60, height: 20 }) };
    expect(hollowStretchSincePicture(body, straight)).toEqual({ x: 1, z: 0.5, height: 1 });
  });

  it("uses child edge features when preserving the size of grouped treatments", () => {
    const grouped = shape({
      kind: "mesh",
      edgeResizeMode: "preserve",
      importedMesh: {
        positions: [-10, 0, 0, -8, 2, 0, 8, 18, 0, 10, 20, 0],
        baseWidth: 20,
        baseDepth: 20,
        baseHeight: 20,
        triangleCount: 1,
        sourceFormat: "json",
      },
      groupedShapes: [shape({ edgeTreatments: [{ kind: "fillet", amount: 2, edgeCount: 1 }] })],
      width: 40,
      height: 40,
    });

    expect(preservesEdgeTreatmentSize(grouped)).toBe(true);
    expect(resizedImportedMeshPositions(grouped)).toEqual([-20, 0, 0, -18, 2, 0, 18, 38, 0, 20, 40, 0]);
  });

  /*
   * Eine Drehung backt den Koerper in ein Netz - anders liesse sich sein
   * Rahmen nicht ehrlich neu aufsetzen. Damit seine Bauwerte danach nicht
   * unerreichbar sind, haelt `parametricSource` fest, was er war.
   */
  it("setzt den Koerper von vor der Drehung wieder zusammen", () => {
    const gebacken = shape({
      kind: "mesh",
      width: 20.8,
      depth: 20.8,
      height: 18,
      size: 20.8,
      threadDiameter: 12,
      threadRole: "nut",
      parametricSource: {
        kind: "thread",
        width: 20.8,
        depth: 18,
        height: 10,
        size: 20.8,
        rotation: 30,
        rotationX: 90,
        rotationZ: 0,
      },
    });
    const urform = shapeWithParametricSource(gebacken);
    expect(urform.kind).toBe("thread");
    expect(urform.height).toBe(10);
    expect(urform.depth).toBe(18);
    // Die Bauwerte selbst haben das Backen ohnehin ueberlebt.
    expect(urform.threadDiameter).toBe(12);
    // Was kein Gedaechtnis hat, bleibt unveraendert.
    const schlicht = shape({ kind: "cylinder" });
    expect(shapeWithParametricSource(schlicht)).toBe(schlicht);
  });

  it("merkt, wenn sich die aufgelaufene Drehung geaendert hat", () => {
    const quelle = { kind: "thread" as const, width: 20, depth: 20, height: 10, size: 20, rotation: 30, rotationX: 0, rotationZ: 0 };
    const a = shape({ kind: "mesh", parametricSource: quelle });
    const b = shape({ kind: "mesh", parametricSource: { ...quelle, rotation: 60 } });
    expect(workplaneShapesEqual(a, a)).toBe(true);
    expect(workplaneShapesEqual(a, b)).toBe(false);
  });

  it("erkennt Bauwert-Aenderungen wie Breite, Tiefe, Hoehe und Form-Parameter", () => {
    expect(patchTouchesBodyParameters({ width: 36 })).toBe(true);
    expect(patchTouchesBodyParameters({ depth: 10 })).toBe(true);
    expect(patchTouchesBodyParameters({ height: 2 })).toBe(true);
    expect(patchTouchesBodyParameters({ size: 36 })).toBe(true);
    expect(patchTouchesBodyParameters({ radius: 5 })).toBe(true);
    expect(patchTouchesBodyParameters({ sides: 64 })).toBe(true);
    expect(patchTouchesBodyParameters({ teeth: 24 })).toBe(true);
    expect(patchTouchesBodyParameters({ threadDiameter: 8 })).toBe(true);
    expect(patchTouchesBodyParameters({ starPoints: 5 })).toBe(true);
    expect(patchTouchesBodyParameters({ honeycombCellSize: 6 })).toBe(true);

    // Reine Positionsaenderungen sind keine Bauwert-Aenderungen:
    expect(patchTouchesBodyParameters({ x: 10, z: 20 })).toBe(false);
    expect(patchTouchesBodyParameters({ elevation: 5 })).toBe(false);
    expect(patchTouchesBodyParameters({ locked: true })).toBe(false);
    expect(patchTouchesBodyParameters({ hidden: true })).toBe(false);
  });

  it("keeps rotated shapes like wedge editable without swapping dimensions", () => {
    const wedge = shape({
      kind: "wedge",
      width: 30,
      depth: 10,
      height: 20,
      rotation: 90,
    });
    expect(shapeTransformShouldRemainEditable(wedge)).toBe(true);
    const canonical = canonicalizeShape(wedge);
    expect(canonical.kind).toBe("wedge");
    expect(canonical.rotation).toBe(90);
    expect(canonical.width).toBe(30);
    expect(canonical.depth).toBe(10);
    expect(canonical.height).toBe(20);
  });
});

