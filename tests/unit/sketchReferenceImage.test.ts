import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { sketchReferenceImageTransform } from "@/components/SketchWorkspace";
import { sketchReferenceShapeOnWorkplane } from "@/lib/editorSketchCad";
import { horizontalPlacementWorkplane } from "@/lib/placementWorkplane";
import { referenceImageShape } from "@/lib/referenceImage";
import type { WorkplaneShape } from "@/types/layerling";

// #2085, #2090: a reference image under a sketch shows its picture as the 3D view shows it from above, turned and
// mirrored as it is there; tilted, or seen from a face's plane, it keeps its outline.
const image = (overrides: Partial<WorkplaneShape> = {}): WorkplaneShape => ({
  ...referenceImageShape({ dataUrl: "data:image/png;base64,AAAA", mimeType: "image/png", pixelWidth: 400, pixelHeight: 300 }, "Picture", "picture", 100),
  x: 12,
  z: -7,
  ...overrides,
});

/** A point of the picture (in the box's own x/z, from its middle) carried through the SVG transform into the sketch. */
function inSketch(transform: string, shape: WorkplaneShape, local: { x: number; z: number }) {
  let matrix = new THREE.Matrix3();
  for (const [, name, args] of transform.matchAll(/(\w+)\(([^)]*)\)/g)) {
    const [a = 0, b = 0, c = 0] = args.trim().split(/[\s,]+/).map(Number);
    const step = new THREE.Matrix3();
    if (name === "translate") step.set(1, 0, a, 0, 1, b, 0, 0, 1);
    if (name === "scale") step.set(a, 0, 0, 0, b, 0, 0, 0, 1);
    if (name === "rotate") {
      const turn = THREE.MathUtils.degToRad(a);
      const [cos, sin] = [Math.cos(turn), Math.sin(turn)];
      step.set(cos, -sin, b - cos * b + sin * c, sin, cos, c - sin * b - cos * c, 0, 0, 1);
    }
    matrix = matrix.multiply(step);
  }
  const point = new THREE.Vector3(shape.x + local.x, shape.z + local.z, 1).applyMatrix3(matrix);
  return { x: point.x, z: point.y };
}

/** The same point of the picture where the 3D view puts it: the box turned and mirrored as WorkplaneViewport sets it. */
function in3d(shape: WorkplaneShape, local: { x: number; z: number }) {
  const object = new THREE.Object3D();
  object.position.set(shape.x, 0, shape.z);
  object.rotation.set(0, THREE.MathUtils.degToRad(shape.rotation), 0);
  object.scale.set(shape.mirrorX ? -1 : 1, 1, shape.mirrorZ ? -1 : 1);
  object.updateMatrixWorld();
  const point = new THREE.Vector3(local.x, 0, local.z).applyMatrix4(object.matrixWorld);
  return { x: point.x, z: point.z };
}

describe("a reference image in the sketch (#2085, #2090)", () => {
  const corner = { x: 30, z: -20 };
  for (const [label, overrides] of [
    ["as it lies", {}],
    ["turned", { rotation: 30 }],
    ["mirrored left/right", { rotation: 30, mirrorX: true }],
    ["mirrored front/back", { rotation: 30, mirrorZ: true }],
    ["mirrored both ways", { rotation: 30, mirrorX: true, mirrorZ: true }],
  ] as const) {
    it(`puts its picture where the 3D view shows it: ${label}`, () => {
      const shape = image(overrides);
      const transform = sketchReferenceImageTransform(shape);
      expect(transform).not.toBeNull();
      const sketch = inSketch(transform!, shape, corner);
      const view = in3d(shape, corner);
      expect(sketch.x).toBeCloseTo(view.x, 6);
      expect(sketch.z).toBeCloseTo(view.z, 6);
    });
  }

  it("keeps the outline of a tilted picture: no picture stretched into the box around it", () => {
    const tilted = sketchReferenceShapeOnWorkplane(image({ rotation: 30, rotationX: 20 }), horizontalPlacementWorkplane());
    expect(tilted.imagePlate).toBeDefined();
    expect(sketchReferenceImageTransform(tilted)).toBeNull();
  });

  it("keeps the outline in a sketch on a face", () => {
    const face = { origin: { x: 0, y: 0, z: 5 }, normal: { x: 0, y: 0, z: 1 }, xAxis: { x: 1, y: 0, z: 0 }, zAxis: { x: 0, y: -1, z: 0 } };
    const seen = sketchReferenceShapeOnWorkplane(image({ rotation: 30, mirrorX: true }), face, true);
    expect(seen.imagePlate).toBeDefined();
    expect(sketchReferenceImageTransform(seen)).toBeNull();
  });

  it("keeps the outline of a picture mirrored up/down: its picture is underneath", () => {
    expect(sketchReferenceImageTransform(image({ mirrorY: true }))).toBeNull();
  });
});
