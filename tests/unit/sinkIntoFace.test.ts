import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { carriedOntoFace } from "@/lib/carryOntoFace";
import { horizontalPlacementWorkplane, placementPatchForNewShape, placementWorkplaneFromSurface, translationToWorkplane } from "@/lib/placementWorkplane";
import type { WorkplaneShape } from "@/types/layerling";

function box(id: string, extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return { id, name: id, kind: "box", color: "#888", x: 0, z: 0, elevation: 0, size: 10, width: 10, depth: 10, height: 10, rotation: 0, rotationX: 0, rotationZ: 0, ...extra } as WorkplaneShape;
}

describe("sunk into a face, the top flush with it (#940)", () => {
  it("puts a new shape's top on the point, the body below it", () => {
    const flat = horizontalPlacementWorkplane();
    const onFace = { ...flat, origin: { x: 4, y: 20, z: -3 } };
    const sitting = placementPatchForNewShape({ height: 6 }, onFace, onFace.origin);
    const sunk = placementPatchForNewShape({ height: 6 }, onFace, onFace.origin, true);
    expect(sitting.elevation).toBeCloseTo(20, 9);
    expect(sunk.elevation).toBeCloseTo(14, 9);
    expect(sunk.x).toBeCloseTo(4, 9);
    expect(sunk.z).toBeCloseTo(-3, 9);
  });

  it("keeps the part upright on a sloped face: its top, not its foot, on the point", () => {
    const normal = new THREE.Vector3(1, 1, 0).normalize();
    const workplane = placementWorkplaneFromSurface({ x: 5, y: 5, z: 0 }, normal, { x: 0, y: 0, z: 1 });
    const patch = placementPatchForNewShape({ height: 10 }, workplane, workplane.origin, true);
    const center = new THREE.Vector3(patch.x, (patch.elevation ?? 0) + 5, patch.z);
    const top = center.clone().addScaledVector(normal, 5);
    expect(top.x).toBeCloseTo(5, 6);
    expect(top.y).toBeCloseTo(5, 6);
    expect(top.z).toBeCloseTo(0, 6);
  });

  it("carries a part into a face: its top at the face, as it stands", () => {
    const part = box("a", { x: 30, z: 5, height: 8 });
    const point = { x: 2, y: 20, z: -3 };
    const patch = carriedOntoFace([part], ["a"], { point, normal: { x: 0, y: 1, z: 0 } }, "a", true).get("a")!;
    expect(patch.x).toBeCloseTo(2, 9);
    expect(patch.z).toBeCloseTo(-3, 9);
    expect(patch.elevation).toBeCloseTo(12, 9);
    expect(patch.rotationX ?? 0).toBeCloseTo(0, 9);
  });

  it("drops a part with its top on the workplane, the body below", () => {
    const flat = horizontalPlacementWorkplane();
    const corners = [[0, 3, 0], [0, 9, 0], [2, 7, 1]].map(([x, y, z]) => ({ x, y, z }));
    expect(translationToWorkplane(flat, corners).y).toBeCloseTo(-3, 9);
    expect(translationToWorkplane(flat, corners, true).y).toBeCloseTo(-9, 9);
  });
});
