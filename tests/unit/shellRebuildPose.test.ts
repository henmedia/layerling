import { describe, expect, it } from "vitest";
import { restoreShapeBeforeEdgeTreatment } from "@/lib/edgeTreatmentHistory";
import { rebuiltInPoseOf, shapeInHollowingPose } from "@/lib/shellRebuildPose";
import { shellNeedingRebuild, shellRebuildReference } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

const shape = (patch: Partial<WorkplaneShape>): WorkplaneShape => ({
  id: "a", name: "A", kind: "box", color: "#888888", x: 0, z: 0, elevation: 0, size: 40, width: 40, depth: 30, height: 20, rotation: 0, rotationX: 0, rotationZ: 0, locked: false, hidden: false, ...patch,
} as WorkplaneShape);
const feature = { kind: "shell" as const, amount: 2, edgeCount: 0, openings: "top-bottom" as const };
const frame = { x: 4, z: 35, elevation: 0, width: 40, depth: 30, height: 20, rotation: 0, rotationX: 0, rotationZ: 0, mirrorX: false, mirrorY: false, mirrorZ: false };
const hollow = (patch: Partial<WorkplaneShape>, before: Partial<WorkplaneShape> = {}) => shape({
  kind: "mesh",
  x: 4,
  z: 35,
  edgeTreatments: [feature],
  edgeTreatmentHistory: [{ id: "h", createdAt: 1, feature, before: shape({ kind: "roundedBox", x: 4, z: 35, ...before }), appliedFrame: frame }],
  importedMesh: { positions: [-20, 0, 0, 20, 20, 0], baseWidth: 40, baseDepth: 30, baseHeight: 20, triangleCount: 1, sourceFormat: "json" },
  ...patch,
});
const beforeOf = (stale: WorkplaneShape) => {
  const reference = shellRebuildReference(stale, shellNeedingRebuild(stale)!);
  return restoreShapeBeforeEdgeTreatment(shapeInHollowingPose(stale, reference.appliedFrame), reference);
};

describe("the pose a resized hollow body is hollowed again in (#2024)", () => {
  it("hollows a tube laid down after its hollowing upright, and lays it down again", () => {
    const stale = hollow({ rotationX: 273, height: 60, elevation: -16 });
    const before = beforeOf(stale);
    expect([before.rotationX, before.width, before.depth, before.height]).toEqual([0, 40, 30, 60]);
    expect((before.elevation ?? 0) + before.height / 2).toBeCloseTo(14, 9);
    const rebuilt = rebuiltInPoseOf(shape({ kind: "mesh", x: 4, z: 35, elevation: -16, height: 60 }), stale, frame);
    expect(rebuilt).toMatchObject({ x: 4, z: 35, rotationX: 273, rotation: 0, rotationZ: 0, height: 60 });
    expect(rebuilt.elevation).toBeCloseTo(-16, 9);
  });

  it("keeps the turn a body had before its hollowing", () => {
    const before = beforeOf(hollow({ rotation: 30, width: 60 }, { rotationX: 90 }));
    expect([before.rotationX, before.rotation]).toEqual([90, 0]);
  });

  it("turns and mirrors what the hollowing moved the middle by", () => {
    const stale = hollow({ rotationX: 90, mirrorX: true, height: 60 });
    const rebuilt = rebuiltInPoseOf(shape({ kind: "mesh", x: 7, z: 35, elevation: 5, height: 60 }), stale, frame);
    // 3 along x comes out mirrored, 5 up lies along z after the quarter turn.
    expect(rebuilt.x).toBeCloseTo(1, 9);
    expect(rebuilt.z).toBeCloseTo(40, 9);
    expect(rebuilt.elevation).toBeCloseTo(0, 9);
    expect(rebuilt).toMatchObject({ rotationX: 90, mirrorX: true });
  });

  it("puts the difference on top of a rebuilt body that stands turned itself", () => {
    const rebuilt = rebuiltInPoseOf(shape({ kind: "mesh", x: 4, z: 35, rotation: 45, height: 60 }), hollow({ rotation: 30, height: 60 }), frame);
    expect(rebuilt.rotation).toBeCloseTo(75, 6);
  });

  it("leaves a body alone that was not turned", () => {
    const stale = hollow({ height: 60 });
    expect(shapeInHollowingPose(stale, frame)).toBe(stale);
    const made = shape({});
    expect(rebuiltInPoseOf(made, stale, frame)).toBe(made);
  });
});
