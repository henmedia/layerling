import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { carriedOntoFace } from "@/lib/carryOntoFace";
import { quaternionForShape } from "@/lib/geometryRotation";
import { placementPatchForNewShape, placementWorkplaneFromSurface } from "@/lib/placementWorkplane";
import type { WorkplaneShape } from "@/types/layerling";

function box(id: string, extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return { id, name: id, kind: "box", color: "#888", x: 0, z: 0, elevation: 0, size: 10, width: 10, depth: 10, height: 10, rotation: 0, rotationX: 0, rotationZ: 0, ...extra } as WorkplaneShape;
}

const up = (shape: Partial<WorkplaneShape> & WorkplaneShape) => new THREE.Vector3(0, 1, 0).applyQuaternion(quaternionForShape(shape));
const bottomCenter = (shape: WorkplaneShape) =>
  new THREE.Vector3(shape.x, (shape.elevation ?? 0) + shape.height / 2, shape.z).addScaledVector(up(shape), -shape.height / 2);

describe("setting parts down on a face (#195)", () => {
  it("stands a part on top of another, its foot on the point", () => {
    const part = box("a", { x: 30, z: 5 });
    const patch = carriedOntoFace([part], ["a"], { point: { x: 2, y: 20, z: -3 }, normal: { x: 0, y: 1, z: 0 } }).get("a")!;
    expect(patch).toMatchObject({ x: 2, z: -3, elevation: 20 });
    expect(patch.rotationX ?? 0).toBeCloseTo(0, 9);
  });

  it("tilts a part onto a sloped face: its underside lies on the face, its foot on the point", () => {
    const part = box("a", { x: 30 });
    const normal = new THREE.Vector3(1, 1, 0).normalize();
    const point = { x: 5, y: 5, z: 0 };
    const patch = carriedOntoFace([part], ["a"], { point, normal })!.get("a")!;
    const placed = { ...part, ...patch } as WorkplaneShape;
    expect(up(placed).dot(normal)).toBeCloseTo(1, 9);
    const foot = bottomCenter(placed);
    expect(foot.x).toBeCloseTo(5, 6);
    expect(foot.y).toBeCloseTo(5, 6);
    expect(foot.z).toBeCloseTo(0, 6);
  });

  it("moves a selection together and keeps the parts where they are to each other", () => {
    const a = box("a", { x: 0 });
    const b = box("b", { x: 20, height: 4 });
    const patches = carriedOntoFace([a, b], ["a", "b"], { point: { x: 100, y: 0, z: 50 }, normal: { x: 0, y: 1, z: 0 } }, "a");
    const pa = patches.get("a")!;
    const pb = patches.get("b")!;
    expect((pb.x as number) - (pa.x as number)).toBeCloseTo(20, 6);
    expect(pa.elevation).toBeCloseTo(0, 6);
    expect(pb.elevation).toBeCloseTo(0, 6);
    // The foot is the middle of both together: x 0..20 plus half the widths, so -5..25 -> 10.
    expect(pa.x).toBeCloseTo(90, 6);
  });

  it("puts a tilted part back upright on the plate", () => {
    const tilted = box("a", { rotationX: 30, elevation: 8 });
    const patch = carriedOntoFace([tilted], ["a"], { point: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 } }).get("a")!;
    const placed = { ...tilted, ...patch } as WorkplaneShape;
    expect(up(placed).y).toBeCloseTo(1, 9);
    expect(placed.elevation).toBeCloseTo(0, 6);
  });

  it("keeps a part's own turn about its up axis when it moves on the plate", () => {
    const turned = box("a", { rotation: 30 });
    const patch = carriedOntoFace([turned], ["a"], { point: { x: 40, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 } }).get("a")!;
    const placed = { ...turned, ...patch } as WorkplaneShape;
    expect(placed.rotation).toBeCloseTo(30, 6);
    expect(placed.rotationX ?? 0).toBeCloseTo(0, 6);
    expect(placed.rotationZ ?? 0).toBeCloseTo(0, 6);
    expect(placed.x).toBeCloseTo(40, 6);
  });

  it("keeps the roof lying on a flat side with its corner on top when it is carried again (#1956)", () => {
    const plate = placementWorkplaneFromSurface({ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 1, y: 0, z: 0 }, false, true);
    const base = { ...box("roof"), kind: "polygon", sides: 3, polygonRoof: true, width: 20, depth: 20, height: 20 } as WorkplaneShape;
    const roof = { ...base, ...placementPatchForNewShape(base, plate, plate.origin, false, 270) } as WorkplaneShape;
    // The polygon's own axis lies flat, its local +Z (the corner) points up, its side on the plate.
    const cornerUp = (shape: WorkplaneShape) => new THREE.Vector3(0, 0, 1).applyQuaternion(quaternionForShape(shape));
    expect(cornerUp(roof).y).toBeCloseTo(1, 6);
    const patch = carriedOntoFace([roof], ["roof"], { point: { x: 40, y: 0, z: 10 }, normal: { x: 0, y: 1, z: 0 } }).get("roof")!;
    const placed = { ...roof, ...patch } as WorkplaneShape;
    expect(cornerUp(placed).y).toBeCloseTo(1, 6);
    expect(Math.abs(up(placed).y)).toBeCloseTo(0, 6);
    expect(placed.x).toBeCloseTo(40, 6);
    expect(placed.z).toBeCloseTo(10, 6);
    expect(placed.elevation).toBeCloseTo(roof.elevation ?? 0, 6);
  });

  it("from one sloped face to another, the part's edges stay level with the face", () => {
    const front = placementWorkplaneFromSurface({ x: 0, y: 10, z: 15 }, { x: 0, y: 3, z: 4 }, { x: 1, y: 0, z: 0 }, false, true);
    const onFront = { ...box("a"), ...placementPatchForNewShape(box("a"), front) } as WorkplaneShape;
    const right = placementWorkplaneFromSurface({ x: 15, y: 10, z: 0 }, { x: 4, y: 3, z: 0 }, { x: 0, y: 0, z: -1 }, false, true);
    const patch = carriedOntoFace([onFront], ["a"], { point: right.origin, normal: right.normal, workplane: right }).get("a")!;
    const placed = { ...onFront, ...patch } as WorkplaneShape;
    const turn = quaternionForShape(placed);
    const normal = new THREE.Vector3(4, 3, 0).normalize();
    // The angles are kept to a hundredth of a degree, so "lies on" is within a few millionths.
    expect(new THREE.Vector3(0, 1, 0).applyQuaternion(turn).dot(normal)).toBeCloseTo(1, 5);
    // One edge of the box runs level, along the face.
    const edges = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1)].map((axis) => axis.applyQuaternion(turn));
    expect(Math.min(...edges.map((edge) => Math.abs(edge.y)))).toBeCloseTo(0, 3);
  });
});
