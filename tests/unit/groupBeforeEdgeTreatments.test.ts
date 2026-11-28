import { describe, expect, it } from "vitest";
import { groupBeforeEdgeTreatments, wasGroupBeforeEdgeTreatments } from "@/lib/edgeTreatmentHistory";
import type { EdgeTreatmentHistoryEntry, WorkplaneShape } from "@/types/layerling";

const box = (id: string, x: number): WorkplaneShape => ({ id, name: id, kind: "box", x, z: 0, size: 20, width: 20, depth: 20, height: 20, rotation: 0 }) as WorkplaneShape;
const group = (): WorkplaneShape => ({ ...box("group", 0), kind: "mesh", width: 36, depth: 20, groupedShapes: [box("a", -8), box("b", 8)] }) as WorkplaneShape;
const entry = (before: WorkplaneShape, id = "e1"): EdgeTreatmentHistoryEntry => ({ id, createdAt: 1, feature: { kind: "chamfer", amount: 1, edgeCount: 4 }, before, appliedFrame: { x: 0, z: 0, elevation: 0, width: 36, depth: 20, height: 20, rotation: 0, rotationX: 0, rotationZ: 0, mirrorX: false, mirrorY: false, mirrorZ: false } }) as EdgeTreatmentHistoryEntry;
/** What a group is after a chamfer: one mesh, no parts, the history that remembers the group. */
const chamfered = (history: EdgeTreatmentHistoryEntry[]): WorkplaneShape => ({ ...box("group", 0), kind: "mesh", width: 36, depth: 20, edgeTreatmentHistory: history }) as WorkplaneShape;

describe("a group that got an edge feature (#514)", () => {
  it("is known as a group while its first feature remembers one", () => {
    expect(wasGroupBeforeEdgeTreatments(chamfered([entry(group())]))).toBe(true);
    expect(wasGroupBeforeEdgeTreatments(chamfered([entry(group()), entry(chamfered([entry(group())]), "e2")]))).toBe(true);
  });

  it("is not one when it was a single body, has no history, or is a group with its parts", () => {
    expect(wasGroupBeforeEdgeTreatments(chamfered([entry(box("solo", 0))]))).toBe(false);
    expect(wasGroupBeforeEdgeTreatments(chamfered([]))).toBe(false);
    expect(wasGroupBeforeEdgeTreatments(group())).toBe(false);
  });

  it("comes back as the group with its parts, at the place the body has now", () => {
    const moved = { ...chamfered([entry(group())]), x: 30 };
    const restored = groupBeforeEdgeTreatments(moved)!;
    expect(restored.groupedShapes?.map((part) => part.id)).toEqual(["a", "b"]);
    expect(restored.x).toBe(30);
    expect(restored.edgeTreatmentHistory).toBeUndefined();
    expect(groupBeforeEdgeTreatments(chamfered([entry(box("solo", 0))]))).toBeNull();
  });

  // A hexagon 40 mm across its points: a 3 mm fillet on its upright edges rounds the points and leaves it 39.072 deep.
  const hexagonGroup = (): WorkplaneShape => ({ ...box("group", 0), kind: "mesh", width: 34.641, depth: 40, size: 40, height: 120, groupedShapes: [box("a", 0)] }) as WorkplaneShape;
  const frame = (depth: number, z = 0) => ({ x: 0, z, elevation: 0, width: 34.641, depth, height: 120, rotation: 0, rotationX: 0, rotationZ: 0, mirrorX: false, mirrorY: false, mirrorZ: false });
  const filletedHexagon = (depth: number, z = 0): WorkplaneShape => {
    const chamferEntry = { ...entry(hexagonGroup()), appliedFrame: frame(40) } as EdgeTreatmentHistoryEntry;
    const afterChamfer = { ...hexagonGroup(), groupedShapes: undefined, edgeTreatmentHistory: [chamferEntry] } as WorkplaneShape;
    const filletEntry = { id: "e2", createdAt: 2, feature: { kind: "fillet", amount: 3, edgeCount: 6 }, before: afterChamfer, appliedFrame: frame(39.072, 0.2) } as EdgeTreatmentHistoryEntry;
    return { ...afterChamfer, depth, z, edgeTreatmentHistory: [chamferEntry, filletEntry] } as WorkplaneShape;
  };

  it("keeps its proportions when a later fillet made the body's box smaller (#1760)", () => {
    const restored = groupBeforeEdgeTreatments(filletedHexagon(39.072, 0.2))!;
    expect(restored.width).toBeCloseTo(34.641, 6);
    expect(restored.depth).toBeCloseTo(40, 6);
    expect(restored.z).toBeCloseTo(0, 6);
  });

  it("still takes on a resize made after the fillets (#1760)", () => {
    const restored = groupBeforeEdgeTreatments(filletedHexagon(39.072 * 2, 5.2))!;
    expect(restored.depth).toBeCloseTo(80, 6);
    expect(restored.width).toBeCloseTo(34.641, 6);
    expect(restored.z).toBeCloseTo(5, 6);
  });
});

describe("a group filleted, then turned and filleted again (#2190)", () => {
  // The values of the reported design: two fillets laid unturned, then a chamfillet on the body turned 270 deg about X.
  // The kernel baked that turn into the mesh: the body has no turn left, and its depth and height are swapped.
  const frame = (o: Partial<NonNullable<EdgeTreatmentHistoryEntry["appliedFrame"]>>) => ({ x: -14.25, z: -0.5, elevation: 0, width: 58.2, depth: 115, height: 78, rotation: 0, rotationX: 0, rotationZ: 0, mirrorX: false, mirrorY: false, mirrorZ: false, ...o });
  const part = (id: string, z: number, depth: number, height: number) => ({ id, name: id, kind: "box", x: 0, z, elevation: 0, size: 58.2, width: 58.2, depth, height, rotation: 0 }) as WorkplaneShape;
  const solids = { id: "g", name: "Group", kind: "mesh", x: -14.25, z: -0.5, elevation: 0, size: 115, width: 58.2, depth: 115, height: 78, rotation: 0, groupedBaseWidth: 58.2, groupedBaseDepth: 115, groupedBaseHeight: 78, groupedShapes: [part("a", -12, 91, 78), part("b", 45.5, 24, 10)] } as WorkplaneShape;
  const e1 = { id: "e1", createdAt: 1, feature: { kind: "fillet", amount: 10, edgeCount: 1, edgeIds: [6] }, before: solids, appliedFrame: frame({}) } as EdgeTreatmentHistoryEntry;
  const afterE1 = { ...solids, groupedShapes: undefined, groupedBaseWidth: undefined, groupedBaseDepth: undefined, groupedBaseHeight: undefined, edgeTreatmentHistory: [e1] } as WorkplaneShape;
  const e2 = { id: "e2", createdAt: 2, feature: { kind: "fillet", amount: 0.8, edgeCount: 6, edgeIds: [2] }, before: afterE1, appliedFrame: frame({}) } as EdgeTreatmentHistoryEntry;
  const afterE2 = { ...afterE1, edgeTreatmentHistory: [e1, e2] } as WorkplaneShape;
  const e3 = { id: "e3", createdAt: 3, feature: { kind: "chamfillet", amount: 2, edgeCount: 1, edgeIds: [2], chamferAngle: 45 }, before: { ...afterE2, rotationX: 270 } as WorkplaneShape, appliedFrame: frame({ elevation: -18.5, depth: 78, height: 115 }) } as EdgeTreatmentHistoryEntry;
  const body = { ...afterE2, x: -2.35, z: -1.5, elevation: -18.5, depth: 78, height: 115, size: 78, rotation: 0, rotationX: 0, rotationZ: 0, edgeTreatmentHistory: [e1, e2, e3] } as WorkplaneShape;

  it("comes back as the group turned as the body is, not unturned and squashed", () => {
    const restored = groupBeforeEdgeTreatments(body)!;
    expect(restored.groupedShapes).toHaveLength(2);
    expect(restored.rotationX).toBeCloseTo(270, 6);
    expect(restored.depth).toBeCloseTo(115, 6);
    expect(restored.height).toBeCloseTo(78, 6);
    expect(restored.edgeTreatmentHistory).toBeUndefined();
  });
});
