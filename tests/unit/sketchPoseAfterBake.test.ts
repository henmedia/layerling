import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { shapeFromCadMesh } from "@/lib/editorSketchCad";
import { placedLikeExisting, sketchBodyAnchor, sketchPoseOf, sketchToWorldMatrix } from "@/lib/sketchPlacement";
import type { SketchProfile, WorkplaneShape } from "@/types/layerling";

/*
 * #1006: a chamfer on an imported SVG body turned by -90° bakes the turn and the place into the exact body. Its sketch
 * then opened turned back and moved, as the SVG's own coordinates are far from where the body stands. The body now
 * keeps where its sketch lay, and Edit sketch opens it there.
 */
const square = (cx: number, cz: number, w: number, d: number): SketchProfile => {
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  return {
    points: corners.map(([sx, sz], index) => ({ id: `p${index}`, x: cx + (sx * w) / 2, z: cz + (sz * d) / 2 })),
    segments: corners.map((_, index) => ({ id: `s${index}`, startId: `p${index}`, endId: `p${(index + 1) % 4}` })),
  };
};

// An SVG drawn round (100, 40) in its own coordinates, standing turned at (10, 20).
const svgBody: WorkplaneShape = {
  id: "svg", name: "S", kind: "mesh", color: "#2bbbef", x: 10, z: 20, elevation: 0, rotation: -90,
  width: 20, depth: 10, height: 4, size: 20,
  sketchProfile: square(100, 40, 20, 10),
  sketchOperation: "extrude",
  cadBrep: "exact body",
  cadBrepFrame: { x: 100, z: 40, elevation: 0, width: 20, depth: 10, height: 4 },
};

/** The kernel's result: the body as it stands in the world, a box over the sketch's outline. */
function bakedMesh(shape: WorkplaneShape) {
  const toWorld = sketchToWorldMatrix(shape);
  const positions: number[] = [];
  for (const y of [0, shape.height]) {
    for (const point of shape.sketchProfile!.points) {
      const world = new THREE.Vector3(point.x, y, point.z).applyMatrix4(toWorld);
      positions.push(world.x, world.y, world.z);
    }
  }
  const indices = [0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6, 0, 4, 5, 0, 5, 1, 1, 5, 6, 1, 6, 2, 2, 6, 7, 2, 7, 3, 3, 7, 4, 3, 4, 0];
  return { positions: new Float32Array(positions), indices: new Uint32Array(indices) };
}

function expectSameMatrix(a: THREE.Matrix4, b: THREE.Matrix4) {
  a.elements.forEach((value, index) => expect(value).toBeCloseTo(b.elements[index], 6));
}

describe("a sketch body baked by an edge treatment keeps where its sketch lay (#1006)", () => {
  const mesh = bakedMesh(svgBody);
  const baked = shapeFromCadMesh(svgBody, mesh.positions, new Float32Array(0), mesh.indices, "chamfered body")!;

  it("bakes the turn and place into the body, as before", () => {
    expect(baked.rotation).toBe(0);
    expect(baked.x).toBeCloseTo(10, 6);
    expect(baked.z).toBeCloseTo(20, 6);
    expect(baked.width).toBeCloseTo(10, 6);
    expect(baked.depth).toBeCloseTo(20, 6);
  });

  it("opens its sketch where it was drawn, turned as it was", () => {
    const posed = sketchPoseOf(baked);
    expect(posed.rotation).toBe(270);
    expect(posed.x).toBeCloseTo(10, 6);
    expect(posed.z).toBeCloseTo(20, 6);
    expect(posed.height).toBe(4);
    expect(sketchBodyAnchor(posed)).toEqual({ x: 100, z: 40 });
    expectSameMatrix(sketchToWorldMatrix(posed), sketchToWorldMatrix(svgBody));
  });

  it("follows the body when it is moved after the chamfer", () => {
    const moved = { ...baked, x: baked.x + 5, z: baked.z - 3 };
    const posed = sketchPoseOf(moved);
    expect(posed.x).toBeCloseTo(15, 6);
    expect(posed.z).toBeCloseTo(17, 6);
    expect(posed.rotation).toBe(270);
  });

  it("keeps it through a second edge treatment", () => {
    const again = bakedMesh(sketchPoseOf(baked));
    const twice = shapeFromCadMesh(baked, again.positions, new Float32Array(0), again.indices, "filleted too")!;
    expectSameMatrix(sketchToWorldMatrix(sketchPoseOf(twice)), sketchToWorldMatrix(svgBody));
  });

  it("is built again from its sketch where it stood, without the pose", () => {
    const rebuilt: WorkplaneShape = { ...svgBody, id: "new", x: 100, z: 40, rotation: 0, cadBrep: "rebuilt", sketchPose: undefined };
    const placed = placedLikeExisting(rebuilt, sketchPoseOf(baked));
    expect(placed.rotation).toBe(270);
    expect(placed.x).toBeCloseTo(10, 6);
    expect(placed.z).toBeCloseTo(20, 6);
    expect(placed.sketchPose).toBeUndefined();
  });

  it("leaves bodies without a pose as they are", () => {
    expect(sketchPoseOf(svgBody)).toBe(svgBody);
    const box: WorkplaneShape = { id: "b", name: "Box", kind: "box", color: "#fff", x: 0, z: 0, elevation: 0, rotation: 30, width: 10, depth: 10, height: 10, size: 10 };
    const boxMesh = bakedMesh({ ...svgBody, rotation: 30 });
    expect(shapeFromCadMesh(box, boxMesh.positions, new Float32Array(0), boxMesh.indices, "box")!.sketchPose).toBeUndefined();
  });
});
