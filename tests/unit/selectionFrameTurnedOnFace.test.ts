import { describe, expect, it } from "vitest";
import { selectionFrameForShapes } from "@/components/workplane/viewportShapeObjects";
import type { PlacementWorkplane } from "@/lib/placementWorkplane";
import type { WorkplaneShape } from "@/lib/workplaneShapes";

// A workplane on a raised flat face, as after "Workplane set to selected face" on a box top.
const raisedFace: PlacementWorkplane = {
  origin: { x: -50, y: 82, z: 0 },
  normal: { x: 0, y: 1, z: 0 },
  xAxis: { x: 1, y: 0, z: 0 },
  zAxis: { x: 0, y: 0, z: 1 },
};

function box(rotation: number): WorkplaneShape {
  return { id: "box", name: "Box", kind: "box", color: "#d41721", x: 0, z: 0, elevation: 82, size: 50, width: 50, depth: 20, height: 4, rotation, rotationX: 0, rotationZ: 0 } as WorkplaneShape;
}

describe("resize handles of a box turned on a face workplane (#1163)", () => {
  it("follow the box turned 90°, so its width stays its width", () => {
    const frame = selectionFrameForShapes([box(90)], ["box"], raisedFace)!;
    expect(frame.width).toBeCloseTo(50);
    expect(frame.depth).toBeCloseTo(20);
  });

  it("follow the box turned 30° too", () => {
    const frame = selectionFrameForShapes([box(30)], ["box"], raisedFace)!;
    expect(frame.width).toBeCloseTo(50);
    expect(frame.depth).toBeCloseTo(20);
  });

  it("still take the workplane's axes for a box not turned on it", () => {
    const frame = selectionFrameForShapes([box(0)], ["box"], raisedFace)!;
    expect(frame.width).toBeCloseTo(50);
    expect(frame.depth).toBeCloseTo(20);
    expect(frame.xAxis.x).toBeCloseTo(1);
  });
});
