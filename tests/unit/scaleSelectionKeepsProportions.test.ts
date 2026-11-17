import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { selectionFrameForShapes } from "@/components/workplane/viewportShapeObjects";
import { resizeAnchorPointForFrame, resizeSelectionFromHandle, resizeSignsForHandle, type TransformDragState } from "@/components/workplane/viewportResize";
import { shapeCenter } from "@/components/workplane/ViewportOverlays";
import type { WorkplaneShape } from "@/lib/workplaneShapes";

// Six imported SVGs scaled down together with a 5 mm snap grid came out of step: each body's size was rounded to the
// grid on its own, so the layers no longer fitted into one another (Discussion #1416).
function body(id: string, width: number, depth: number, x = 0, z = 0): WorkplaneShape {
  return { id, name: id, kind: "box", color: "#d41721", x, z, elevation: 0, size: width, width, depth, height: 2, rotation: 0, rotationX: 0, rotationZ: 0 } as WorkplaneShape;
}

function scaleDown(shapes: WorkplaneShape[], step: number, pull: number) {
  const ids = shapes.map((shape) => shape.id);
  const frame = selectionFrameForShapes(shapes, ids)!;
  const signs = resizeSignsForHandle("near-right");
  const start = frame.center.clone().add(new THREE.Vector3(frame.width / 2, 0, frame.depth / 2));
  const transform = {
    items: shapes.map((shape) => ({ id: shape.id, startShape: shape, startCenter: shapeCenter(shape), startQuaternion: new THREE.Quaternion() })),
    selectionFrame: frame,
    scaleStartPoint: start,
    scaleSigns: signs,
    scaleAnchorPoint: resizeAnchorPointForFrame(frame, signs),
  } as unknown as TransformDragState;
  return resizeSelectionFromHandle(transform, start.clone().add(new THREE.Vector3(-pull, 0, -pull)), "near-right", true, false, step, 220);
}

describe("scaling several bodies together", () => {
  const shapes = [body("outline", 103, 41, 0, 0), body("fill", 97.3, 36.2, 1, 0.5), body("letters", 71.7, 28.4, -3, 2), body("star", 3.2, 3.2, 20, 4)];

  it("gives every body the same factor, whatever the snap grid", () => {
    for (const step of [0, 1, 5]) {
      const result = scaleDown(shapes, step, 20);
      const factors = result.map((entry, index) => ((entry.patch.width ?? shapes[index].width) as number) / (shapes[index].width as number));
      for (const factor of factors) expect(factor).toBeCloseTo(factors[0], 6);
      expect(factors[0]).toBeLessThan(1);
    }
  });

  it("keeps a body smaller than the grid step smaller than it", () => {
    const result = scaleDown(shapes, 5, 20);
    expect(result[3].patch.width as number).toBeLessThan(3.2);
  });
});
