import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { selectionFrameForShapes } from "@/components/workplane/viewportShapeObjects";
import { resizeAnchorPointForFrame, resizeSelectionFromHandle, resizeSignsForHandle, type TransformDragState } from "@/components/workplane/viewportResize";
import { shapeCenter } from "@/components/workplane/ViewportOverlays";
import { worldBoxOfShapes } from "@/lib/scaleByPercent";
import type { WorkplaneShape } from "@/lib/workplaneShapes";

// A box and a cylinder laid on its side, selected together: the handles on X left the cylinder as it was and those on
// Z squeezed it, because each stretch went to its own width and depth whatever way it lay (#1645).
const box = { id: "box", name: "box", kind: "box", color: "#d41721", x: 0, z: -30, elevation: 0, size: 100, width: 100, depth: 20, height: 20, rotation: 0, rotationX: 0, rotationZ: 0 } as WorkplaneShape;
// Its own up axis lies along X: 100 long, 20 across, resting on the plate.
const cylinder = { id: "cylinder", name: "cylinder", kind: "cylinder", color: "#d97813", x: 0, z: 0, elevation: -40, size: 20, width: 20, depth: 20, height: 100, rotation: 0, rotationX: 0, rotationZ: 90 } as WorkplaneShape;

function pull(shapes: WorkplaneShape[], handleKey: string, by: THREE.Vector3, shift = false) {
  const ids = shapes.map((shape) => shape.id);
  const frame = selectionFrameForShapes(shapes, ids)!;
  const signs = resizeSignsForHandle(handleKey);
  const start = frame.center.clone().add(new THREE.Vector3((signs.x * frame.width) / 2, 0, (signs.z * frame.depth) / 2));
  const transform = {
    items: shapes.map((shape) => ({ id: shape.id, startShape: shape, startCenter: shapeCenter(shape), startQuaternion: new THREE.Quaternion() })),
    selectionFrame: frame,
    scaleStartPoint: start,
    scaleSigns: signs,
    scaleAnchorPoint: resizeAnchorPointForFrame(frame, signs),
  } as unknown as TransformDragState;
  const result = resizeSelectionFromHandle(transform, start.clone().add(by), handleKey, shift, false, 0, 1000);
  return shapes.map((shape) => ({ ...shape, ...result.find((entry) => entry.id === shape.id)!.patch }) as WorkplaneShape);
}

describe("scaling a selection with a turned body", () => {
  it("lies on the plate to begin with", () => {
    const own = worldBoxOfShapes([cylinder]);
    expect(own.min.y).toBeCloseTo(0, 6);
    expect(own.max.x - own.min.x).toBeCloseTo(100, 6);
  });

  it("makes a cylinder lying along X longer with the handle on X", () => {
    const [grownBox, grownCylinder] = pull([box, cylinder], "right", new THREE.Vector3(50, 0, 0));
    expect(grownBox.width).toBeCloseTo(150, 6);
    expect(grownCylinder.height).toBeCloseTo(150, 6);
    expect(grownCylinder.width).toBeCloseTo(20, 6);
    expect(grownCylinder.depth).toBeCloseTo(20, 6);
    const own = worldBoxOfShapes([grownCylinder]);
    expect(own.min.y).toBeCloseTo(0, 6);
    expect(own.min.x).toBeCloseTo(-50, 6);
    expect(own.max.x).toBeCloseTo(100, 6);
  });

  it("makes it thicker and keeps it round with the handle on Z, still on the plate", () => {
    // The selection is 50 deep (box from -40, cylinder to 10); pulled 25 nearer it is 75, half as deep again.
    const [grownBox, grownCylinder] = pull([box, cylinder], "near", new THREE.Vector3(0, 0, 25));
    expect(grownBox.depth).toBeCloseTo(30, 6);
    expect(grownCylinder.width).toBeCloseTo(30, 6);
    expect(grownCylinder.depth).toBeCloseTo(30, 6);
    expect(grownCylinder.height).toBeCloseTo(100, 6);
    expect(worldBoxOfShapes([grownCylinder]).min.y).toBeCloseTo(0, 6);
  });

  it("grows every size alike with Shift on a corner", () => {
    const [, grownCylinder] = pull([box, cylinder], "near-right", new THREE.Vector3(50, 0, 25), true);
    expect(grownCylinder.height / cylinder.height).toBeCloseTo(grownCylinder.width / cylinder.width, 6);
    expect(grownCylinder.width).toBeGreaterThan(20);
    expect(worldBoxOfShapes([grownCylinder]).min.y).toBeCloseTo(0, 6);
  });

  it("leaves a body that is not turned as before", () => {
    const [grownBox] = pull([box], "right", new THREE.Vector3(50, 0, 0));
    expect(grownBox.width).toBeCloseTo(150, 6);
    expect(grownBox.height).toBe(20);
  });
});
