import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { projectShapeExtent } from "@/components/workplane/ViewportOverlays";
import { wrapMeshAroundCylinder } from "@/lib/cylinderWrap";
import type { WorkplaneShape } from "@/types/layerling";

/** A flat strip lying on the plate, as vertices and faces. */
function strip(width: number, thickness: number, depth: number) {
  const [x0, x1, z0, z1] = [-width / 2, width / 2, -depth / 2, depth / 2];
  const vertices: [number, number, number][] = [[x0, 0, z0], [x1, 0, z0], [x1, 0, z1], [x0, 0, z1], [x0, thickness, z0], [x1, thickness, z0], [x1, thickness, z1], [x0, thickness, z1]];
  const faces: [number, number, number][] = [[0, 1, 2], [0, 2, 3], [4, 6, 5], [4, 7, 6], [0, 4, 5], [0, 5, 1], [3, 2, 6], [3, 6, 7], [0, 3, 7], [0, 7, 4], [1, 5, 6], [1, 6, 2]];
  return { vertices, faces };
}

// #987: a strip of 275 mm engraved into a 92.2 mm cylinder covers only part of the circle and reaches 0.05 mm past it.
// The handles measured its points, 92.30 by 91.72, while the properties said 92.2, so typing 92.2 did nothing.
describe("the size shown on a body wrapped round a cylinder (#987)", () => {
  const result = wrapMeshAroundCylinder(strip(275, 0.4, 53.1), { diameter: 92.2, inward: true });
  if ("error" in result) throw new Error(result.error);
  const shape: WorkplaneShape = {
    id: "lamp", name: "Pattern", kind: "mesh", color: "#1e9bd7", x: 0, z: 0, size: 92.2, width: 92.2, depth: 92.2, height: 53.1, rotation: 0,
    cylinderWrap: { diameter: 92.2, inward: true },
    importedMesh: { positions: result.positions, baseWidth: 92.2, baseDepth: 92.2, baseHeight: 53.1, triangleCount: result.positions.length / 9, sourceFormat: "json" },
  };

  it("is the cylinder's, as in the properties", () => {
    const { min, max } = projectShapeExtent(shape, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3());
    expect(max.x - min.x).toBeCloseTo(92.2, 6);
    expect(max.z - min.z).toBeCloseTo(92.2, 6);
    expect(max.y - min.y).toBeCloseTo(53.1, 6);
  });
});
