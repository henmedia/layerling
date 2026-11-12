import { describe, expect, it } from "vitest";
import { compactEdgeTreatmentHistory, edgeTreatmentAppliedFrame, restoreShapeBeforeEdgeTreatment, shapeBeforeEdgeTreatments } from "@/lib/edgeTreatmentHistory";
import type { EdgeTreatmentHistoryEntry, WorkplaneShape } from "@/types/layerling";

function box(overrides: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return {
    id: "box",
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

function historyEntry(before: WorkplaneShape): EdgeTreatmentHistoryEntry {
  return {
    id: "history-1",
    createdAt: 1,
    feature: { kind: "chamfer", amount: 1, edgeCount: 1 },
    before,
  };
}

describe("edge treatment history restoration", () => {
  it("restores a grouped snapshot instead of retaining the treated mesh bounding box", () => {
    const before = box({
      id: "group-before",
      name: "Group",
      kind: "mesh",
      x: 8,
      width: 56,
      depth: 24,
      height: 60,
      size: 56,
      groupedBaseWidth: 56,
      groupedBaseDepth: 24,
      groupedBaseHeight: 60,
      groupedShapes: [
        box({ id: "normal-child", x: -18 }),
        box({ id: "tall-child", x: 14, width: 8, depth: 10, height: 60, size: 10 }),
      ],
    });
    const treated = box({
      id: "group-current",
      name: "Renamed group",
      kind: "mesh",
      color: "#12abef",
      x: 0,
      width: 80,
      depth: 40,
      height: 60,
      size: 80,
      importedMesh: {
        positions: [-40, 0, -20, 40, 0, -20, 40, 60, 20],
        baseWidth: 80,
        baseDepth: 40,
        baseHeight: 60,
        triangleCount: 1,
        sourceFormat: "json",
      },
      edgeTreatments: [{ kind: "chamfer", amount: 1, edgeCount: 1 }],
    });

    const restored = restoreShapeBeforeEdgeTreatment(treated, historyEntry(before));

    expect(restored).toMatchObject({
      id: "group-current",
      name: "Renamed group",
      color: "#12abef",
      kind: "mesh",
      x: 8,
      width: 56,
      depth: 24,
      height: 60,
    });
    expect(restored.importedMesh).toBeUndefined();
    expect(restored.edgeTreatments).toBeUndefined();
    expect(restored.groupedShapes?.map((child) => [child.width, child.depth, child.height])).toEqual([
      [20, 20, 20],
      [8, 10, 60],
    ]);
  });

  it("does not resize a restored child primitive to a combined component's bounds", () => {
    const before = box({ id: "thin-before", x: 18, width: 8, depth: 6, height: 50, size: 8 });
    const combinedComponent = box({
      id: "thin-current",
      kind: "mesh",
      x: 0,
      width: 54,
      depth: 30,
      height: 50,
      size: 54,
      importedMesh: {
        positions: [-27, 0, -15, 27, 0, -15, 27, 50, 15],
        baseWidth: 54,
        baseDepth: 30,
        baseHeight: 50,
        triangleCount: 1,
        sourceFormat: "json",
      },
    });

    const restored = restoreShapeBeforeEdgeTreatment(combinedComponent, historyEntry(before));

    expect(restored).toMatchObject({ kind: "box", x: 18, width: 8, depth: 6, height: 50, size: 8 });
    expect(restored.importedMesh).toBeUndefined();
  });

  it("keeps history snapshots flat instead of recursively nesting older history", () => {
    const first = historyEntry(box({ id: "before-first" }));
    const second = {
      ...historyEntry(box({ id: "before-second", edgeTreatmentHistory: [first] })),
      id: "history-2",
    };

    const compacted = compactEdgeTreatmentHistory([first, second]);

    expect(compacted).toHaveLength(2);
    expect(compacted[0].before.edgeTreatmentHistory).toBeUndefined();
    expect(compacted[1].before.edgeTreatmentHistory).toBeUndefined();
  });

  it("rebuilds a body stood up before its hollowing along the right axes and on the plate (Discussion #1150)", () => {
    // dlguess's teardrop hole: 62.4 wide, 208 long, 75.3 high, tipped up by 270 degrees about x and hollowed, so the
    // body stands 62.4 wide, 75.3 deep and 208 high on the plate.
    const before = box({ kind: "teardrop", width: 62.4, depth: 208, height: 75.296, rotationX: 270, elevation: 66.352 });
    const baked = box({ kind: "mesh", width: 62.395, depth: 75.271, height: 208, elevation: 0 });
    const entry: EdgeTreatmentHistoryEntry = { ...historyEntry(before), feature: { kind: "shell", amount: 2, edgeCount: 0 }, appliedFrame: edgeTreatmentAppliedFrame(baked) };
    const middle = (shape: WorkplaneShape) => (shape.elevation ?? 0) + shape.height / 2;

    // Made bigger by 1.432 all round, standing on the plate: the teardrop grows about the middle the body has now,
    // its length upright reaching down to the plate, not 28.65 mm into it.
    const bigger = restoreShapeBeforeEdgeTreatment(box({ ...baked, width: 89.402, depth: 107.86, height: 297.889, edgeTreatmentHistory: [entry] }), entry);
    expect(bigger.width).toBeCloseTo(89.41, 1);
    expect(bigger.depth).toBeCloseTo(297.89, 1);
    expect(bigger.height).toBeCloseTo(107.88, 1);
    expect(middle(bigger) - bigger.depth / 2).toBeCloseTo(0, 1);

    // Only pulled up to 312: the teardrop gets longer, its profile stays as it was instead of turning into an oval.
    const taller = restoreShapeBeforeEdgeTreatment(box({ ...baked, height: 312, edgeTreatmentHistory: [entry] }), entry);
    expect(taller.width).toBeCloseTo(62.4, 1);
    expect(taller.height).toBeCloseTo(75.296, 1);
    expect(taller.depth).toBeCloseTo(312, 1);
    expect(middle(taller) - taller.depth / 2).toBeCloseTo(0, 1);
  });

  it("preserves edits made after applying a feature while restoring the pre-feature geometry", () => {
    const before = box({ x: 8, z: 3, width: 40, depth: 20, height: 30, rotation: 15 });
    const applied = box({ kind: "mesh", x: 7.5, z: 3, width: 39, depth: 20, height: 30, rotation: 0 });
    const entry: EdgeTreatmentHistoryEntry = {
      ...historyEntry(before),
      appliedFrame: edgeTreatmentAppliedFrame(applied),
    };
    const current = box({
      ...applied,
      x: 17.5,
      z: -2,
      width: 78,
      depth: 30,
      height: 45,
      rotation: 20,
      edgeTreatmentHistory: [entry],
    });

    const restored = restoreShapeBeforeEdgeTreatment(current, entry);

    expect(restored).toMatchObject({
      kind: "box",
      x: 18,
      z: -2,
      width: 80,
      depth: 30,
      height: 45,
      rotation: 35,
    });
  });
});

describe("the shape a treated body was made from (#1689)", () => {
  const mesh = { meshAssetId: "m", baseWidth: 20, baseDepth: 20, baseHeight: 20, triangleCount: 12 } as WorkplaneShape["importedMesh"];
  it("names the Hirth joint a chamfered body was", () => {
    const hirth = box({ id: "h", kind: "hirth", teeth: 24 } as Partial<WorkplaneShape>);
    const treated = box({ id: "h", kind: "mesh", importedMesh: mesh, edgeTreatmentHistory: [historyEntry(hirth)] });
    expect(shapeBeforeEdgeTreatments(treated)?.kind).toBe("hirth");
  });
  it("has none for a group, an imported mesh or an untreated shape", () => {
    const group = box({ kind: "mesh", groupedShapes: [box()] });
    const imported = box({ kind: "mesh", importedMesh: mesh });
    expect(shapeBeforeEdgeTreatments(box({ kind: "mesh", importedMesh: mesh, edgeTreatmentHistory: [historyEntry(group)] }))).toBeNull();
    expect(shapeBeforeEdgeTreatments(box({ kind: "mesh", importedMesh: mesh, edgeTreatmentHistory: [historyEntry(imported)] }))).toBeNull();
    expect(shapeBeforeEdgeTreatments(box())).toBeNull();
  });
});
