import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { selectionFrameForShapes } from "@/components/workplane/viewportShapeObjects";
import { resizeAnchorPointForFrame, resizeShapeFromFrameHandle, resizeShapeAlongFrameNormal, resizeSignsForHandle, type TransformDragState } from "@/components/workplane/viewportResize";
import { ownHeightSidePressed, ownSideForMark } from "@/lib/dimensionSides";
import { horizontalPlacementWorkplane, type PlacementWorkplane } from "@/lib/placementWorkplane";
import { worldBoxOfShapes } from "@/lib/scaleByPercent";
import type { WorkplaneShape } from "@/lib/workplaneShapes";

const plate = horizontalPlacementWorkplane();

// A wedge 30 wide (X), 20 high and 10 long, turned a quarter about X: its own height now runs along the plate (Z),
// its own length stands upright. It rests on the plate: 30 along X, 10 high, 20 along Z (Discussion #1838).
function wedge(patch: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return { id: "wedge", name: "Wedge", kind: "wedge", color: "#3fa34d", x: 0, z: 0, elevation: -5, size: 30, width: 30, depth: 10, height: 20, rotation: 0, rotationX: 90, rotationZ: 0, ...patch } as WorkplaneShape;
}

function drag(handleKey: string, delta: THREE.Vector3, shape = wedge(), workplane: PlacementWorkplane = plate, shiftKey = false) {
  const frame = selectionFrameForShapes([shape], [shape.id], workplane)!;
  const signs = resizeSignsForHandle(handleKey);
  const start = frame.center.clone();
  const transform = {
    startShape: shape,
    selectionFrame: frame,
    scaleStartPoint: start,
    scaleSigns: signs,
    scaleAnchorPoint: resizeAnchorPointForFrame(frame, signs),
  } as unknown as TransformDragState;
  return { frame, patch: resizeShapeFromFrameHandle(transform, start.clone().add(delta), handleKey, shiftKey, false, 0, 220) };
}

const box = (shape: WorkplaneShape, patch: Partial<WorkplaneShape> = {}) => worldBoxOfShapes([{ ...shape, ...patch } as WorkplaneShape]);

describe("handles of a body lying on its side (Discussion #1838)", () => {
  it("stand upright on the plate, with the height handle on top", () => {
    const frame = selectionFrameForShapes([wedge()], ["wedge"], plate)!;
    expect(frame.yAxis.y).toBeCloseTo(1);
    expect(frame.xAxis.x).toBeCloseTo(1);
    expect(frame.zAxis.z).toBeCloseTo(1);
    expect(frame.width).toBeCloseTo(30);
    expect(frame.height).toBeCloseTo(10);
    expect(frame.depth).toBeCloseTo(20);
    expect(frame.lying).toEqual({ x: "width", y: "depth", z: "height" });
    // The frame still sits round the body.
    expect(frame.center.y).toBeCloseTo(5);
  });

  it("leave the frame without a workplane the body's own, for the size fields", () => {
    const frame = selectionFrameForShapes([wedge()], ["wedge"])!;
    expect(frame.lying).toBeUndefined();
    expect(frame.height).toBeCloseTo(20);
    expect(Math.abs(frame.yAxis.z)).toBeCloseTo(1);
  });

  it("stand upright on a raised level workplane too", () => {
    const raised: PlacementWorkplane = { origin: { x: 0, y: 40, z: 0 }, normal: { x: 0, y: 1, z: 0 }, xAxis: { x: 1, y: 0, z: 0 }, zAxis: { x: 0, y: 0, z: 1 } };
    const frame = selectionFrameForShapes([wedge({ elevation: 35 })], ["wedge"], raised)!;
    expect(frame.yAxis.y).toBeCloseTo(1);
    expect(frame.lying?.y).toBe("depth");
  });

  it("keep the body's own axes when it stands, hangs upside down or is tilted", () => {
    for (const turn of [{ rotationX: 0 }, { rotationX: 180 }, { rotationX: 45 }, { rotationX: 85 }, { rotationX: 0, rotation: 90 }]) {
      const frame = selectionFrameForShapes([wedge(turn)], ["wedge"], plate)!;
      expect(frame.lying).toBeUndefined();
    }
  });

  it("keep the body's own axes on a workplane that stands on a side face (#933)", () => {
    const side: PlacementWorkplane = { origin: { x: 15, y: 5, z: 0 }, normal: { x: 1, y: 0, z: 0 }, xAxis: { x: 0, y: 1, z: 0 }, zAxis: { x: 0, y: 0, z: -1 } };
    const frame = selectionFrameForShapes([wedge()], ["wedge"], side)!;
    expect(frame.lying).toBeUndefined();
  });

  it("follow a body that lies and is turned about the upright, along its own sides", () => {
    // Laid on its side, then turned 30° about the upright.
    const turn = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(30))
      .multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)));
    const euler = new THREE.Euler().setFromQuaternion(turn, "XYZ");
    const shape = wedge({ rotationX: THREE.MathUtils.radToDeg(euler.x), rotation: THREE.MathUtils.radToDeg(euler.y), rotationZ: THREE.MathUtils.radToDeg(euler.z) });
    const frame = selectionFrameForShapes([shape], ["wedge"], plate)!;
    expect(frame.yAxis.y).toBeCloseTo(1);
    expect(frame.lying?.y).toBe("depth");
    expect(frame.width).toBeCloseTo(30);
    expect(frame.height).toBeCloseTo(10);
    expect(frame.depth).toBeCloseTo(20);
    expect(frame.xAxis.x).toBeCloseTo(Math.cos(Math.PI / 6));
  });

  it("make the height handle pull the body up, its bottom staying on the plate", () => {
    const shape = wedge();
    const frame = selectionFrameForShapes([shape], [shape.id], plate)!;
    const patch = resizeShapeAlongFrameNormal(shape, frame, 16, false);
    // The upright measure is the wedge's own length.
    expect(patch.depth).toBeCloseTo(16);
    expect(patch.height ?? 20).toBeCloseTo(20);
    expect(patch.width ?? 30).toBeCloseTo(30);
    const after = box(shape, patch);
    expect(after.min.y).toBeCloseTo(0);
    expect(after.max.y).toBeCloseTo(16);
    expect(after.max.z - after.min.z).toBeCloseTo(20);
  });

  it("write a side handle along the plate into the body's own height, the other side staying", () => {
    const shape = wedge();
    const before = box(shape);
    const { patch } = drag("near-mid", new THREE.Vector3(0, 0, 6));
    expect(patch.height).toBeCloseTo(26);
    expect(patch.width).toBeCloseTo(30);
    expect(patch.depth).toBeCloseTo(10);
    const after = box(shape, patch);
    expect(after.min.z).toBeCloseTo(before.min.z);
    expect(after.max.z).toBeCloseTo(before.max.z + 6);
    expect(after.min.y).toBeCloseTo(0);
    expect(after.max.y).toBeCloseTo(10);
  });

  it("write the other side handle into the body's own width", () => {
    const shape = wedge();
    const before = box(shape);
    const { patch } = drag("left-mid", new THREE.Vector3(-4, 0, 0));
    expect(patch.width).toBeCloseTo(34);
    expect(patch.height ?? 20).toBeCloseTo(20);
    const after = box(shape, patch);
    expect(after.max.x).toBeCloseTo(before.max.x);
    expect(after.min.x).toBeCloseTo(before.min.x - 4);
  });

  it("grow in every direction from a corner with Shift, standing on the plate", () => {
    const shape = wedge();
    const { patch } = drag("near-right", new THREE.Vector3(30, 0, 20), shape, plate, true);
    expect(patch.width).toBeCloseTo(60);
    expect(patch.height).toBeCloseTo(40);
    expect(patch.depth).toBeCloseTo(20);
    const after = box(shape, patch);
    expect(after.min.y).toBeCloseTo(0);
    expect(after.max.y).toBeCloseTo(20);
  });

  it("keep a lying cylinder round: the height handle and the handle across it set the diameter, the one along it the length", () => {
    // 12 across, 40 long, laid along Z.
    const cylinder = wedge({ kind: "cylinder", width: 12, depth: 12, size: 12, height: 40, elevation: -14 });
    const frame = selectionFrameForShapes([cylinder], [cylinder.id], plate)!;
    expect(frame.height).toBeCloseTo(12);
    expect(frame.depth).toBeCloseTo(40);

    const taller = resizeShapeAlongFrameNormal(cylinder, frame, 18, false);
    expect(taller.width).toBeCloseTo(18);
    expect(taller.depth).toBeCloseTo(18);
    expect(taller.height ?? 40).toBeCloseTo(40);
    expect(box(cylinder, taller).min.y).toBeCloseTo(0);

    const longer = drag("near-mid", new THREE.Vector3(0, 0, 10), cylinder).patch;
    expect(longer.height).toBeCloseTo(50);
    expect(longer.width).toBeCloseTo(12);
    expect(longer.depth).toBeCloseTo(12);

    const thicker = drag("right-mid", new THREE.Vector3(4, 0, 0), cylinder).patch;
    expect(thicker.width).toBeCloseTo(16);
    expect(thicker.depth).toBeCloseTo(16);
    expect(thicker.height ?? 40).toBeCloseTo(40);
    expect(box(cylinder, thicker).min.y).toBeCloseTo(0);
  });

  it("leave an upright body's handles as they were", () => {
    const upright = wedge({ rotationX: 0, elevation: 0 });
    const { frame, patch } = drag("right-mid", new THREE.Vector3(5, 0, 0), upright);
    expect(frame.lying).toBeUndefined();
    expect(patch.width).toBeCloseTo(35);
    expect(patch.height ?? 20).toBeCloseTo(20);
  });

  it("read a number on the plate as the body's own measure, held at the side across from its handle", () => {
    const shape = wedge();
    const markFrame = selectionFrameForShapes([shape], [shape.id], plate)!;
    const ownFrame = selectionFrameForShapes([shape], [shape.id])!;
    expect(ownSideForMark(markFrame, ownFrame, "height")?.axis).toBe("depth");
    expect(ownSideForMark(markFrame, ownFrame, "depth")?.axis).toBe("height");
    expect(ownSideForMark(markFrame, ownFrame, "width")?.axis).toBe("width");
    // The wedge's own up axis runs along +Z of the plate: the near handle stands at its top, the far one at its base.
    expect(ownHeightSidePressed(markFrame, ownFrame, "depth", { x: 0, z: 1 })).toBe("top");
    expect(ownHeightSidePressed(markFrame, ownFrame, "depth", { x: 0, z: -1 })).toBe("bottom");
    expect(ownHeightSidePressed(markFrame, ownFrame, "depth", { x: 1, z: 0 })).toBeNull();
    expect(ownHeightSidePressed(markFrame, ownFrame, "width", { x: 1, z: 0 })).toBeNull();
  });
});
