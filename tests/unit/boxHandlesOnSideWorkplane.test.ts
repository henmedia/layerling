import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { selectionFrameForShapes } from "@/components/workplane/viewportShapeObjects";
import { resizeAnchorPointForFrame, resizeShapeFromFrameHandle, resizeShapeAlongFrameNormal, resizeSignsForHandle, type TransformDragState } from "@/components/workplane/viewportResize";
import type { PlacementWorkplane } from "@/lib/placementWorkplane";
import type { WorkplaneShape } from "@/lib/workplaneShapes";

// A box 40 wide (X), 20 high (Y) and 30 deep (Z) on the plate, and a workplane on its right-hand face (+X).
// The workplane's x axis runs up, its normal out to the right, its z axis back: so its "width" is the box's height,
// its "height" the box's width (Discussion #1351).
const rightFace: PlacementWorkplane = {
  origin: { x: 20, y: 10, z: 0 },
  normal: { x: 1, y: 0, z: 0 },
  xAxis: { x: 0, y: 1, z: 0 },
  zAxis: { x: 0, y: 0, z: -1 },
};

function box(): WorkplaneShape {
  return { id: "box", name: "Box", kind: "box", color: "#d41721", x: 0, z: 0, elevation: 0, size: 40, width: 40, depth: 30, height: 20, rotation: 0, rotationX: 0, rotationZ: 0 } as WorkplaneShape;
}

function drag(handleKey: string, delta: THREE.Vector3, shape = box(), workplane = rightFace) {
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
  return { frame, patch: resizeShapeFromFrameHandle(transform, start.clone().add(delta), handleKey, false, false, 0, 220) };
}

describe("resize handles of a box on a workplane on its side face (Discussion #1351)", () => {
  it("follow the workplane instead of the box's own axes", () => {
    const frame = selectionFrameForShapes([box()], ["box"], rightFace)!;
    expect(frame.xAxis.y).toBeCloseTo(1);
    expect(frame.yAxis.x).toBeCloseTo(1);
    // The workplane's width runs up the face: the box's height. Its height is the box's width.
    expect(frame.width).toBeCloseTo(20);
    expect(frame.height).toBeCloseTo(40);
    expect(frame.depth).toBeCloseTo(30);
  });

  it("write the width of the workplane into the box's height, keeping the other side where it is", () => {
    const { patch } = drag("right", new THREE.Vector3(0, 5, 0));
    expect(patch.height).toBeCloseTo(25);
    expect(patch.width).toBeCloseTo(40);
    expect(patch.depth).toBeCloseTo(30);
    expect(patch.elevation).toBeCloseTo(0);
    expect(patch.x).toBeCloseTo(0);
  });

  it("grow downwards from the left handle: the top stays", () => {
    const { patch } = drag("left", new THREE.Vector3(0, -5, 0));
    expect(patch.height).toBeCloseTo(25);
    expect(patch.elevation).toBeCloseTo(-5);
  });

  it("write the depth of the workplane into the box's depth", () => {
    // The workplane's z axis runs to -Z: its "far" side is the box's +Z end.
    const { patch } = drag("far", new THREE.Vector3(0, 0, 4));
    expect(patch.depth).toBeCloseTo(34);
    expect(patch.height).toBeCloseTo(20);
    expect(patch.width).toBeCloseTo(40);
  });

  it("make the height handle change the box's width, from the face the workplane is on", () => {
    const shape = box();
    const frame = selectionFrameForShapes([shape], [shape.id], rightFace)!;
    // Out along the workplane's normal by 10 from its face: the box grows 10 to the right, its left side stays.
    const patch = resizeShapeAlongFrameNormal(shape, frame, frame.height + 10, false);
    expect(patch.width).toBeCloseTo(50);
    expect(patch.x).toBeCloseTo(5);
    expect(patch.height ?? 20).toBeCloseTo(20);
  });

  it("leave a box on a workplane lying on its top as it was", () => {
    const top: PlacementWorkplane = { origin: { x: 0, y: 20, z: 0 }, normal: { x: 0, y: 1, z: 0 }, xAxis: { x: 1, y: 0, z: 0 }, zAxis: { x: 0, y: 0, z: 1 } };
    const { frame, patch } = drag("right", new THREE.Vector3(6, 0, 0), box(), top);
    expect(frame.width).toBeCloseTo(40);
    expect(patch.width).toBeCloseTo(46);
    expect(patch.height ?? 20).toBeCloseTo(20);
  });

  it("keep the box's own axes for a shape that is not a plain box", () => {
    const cylinder = { ...box(), kind: "cylinder" } as WorkplaneShape;
    const frame = selectionFrameForShapes([cylinder], ["box"], rightFace)!;
    expect(frame.xAxis.x).toBeCloseTo(1);
  });
});
