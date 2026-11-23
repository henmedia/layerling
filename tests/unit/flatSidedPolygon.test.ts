import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { flatSidedPrismGeometry } from "@/components/workplane/viewportShapeObjects";

describe("polygon sides shaded flat (#1956)", () => {
  it("gives every triangle of the three-sided prism one normal, square to its face", () => {
    const geometry = flatSidedPrismGeometry(3, 1, 0);
    const position = geometry.getAttribute("position");
    const normal = geometry.getAttribute("normal");
    expect(geometry.index).toBeNull();
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    for (let i = 0; i < position.count; i += 3) {
      a.fromBufferAttribute(position, i);
      b.fromBufferAttribute(position, i + 1);
      c.fromBufferAttribute(position, i + 2);
      const face = new THREE.Vector3().subVectors(c, b).cross(new THREE.Vector3().subVectors(a, b));
      if (face.lengthSq() < 1e-12) continue;
      face.normalize();
      for (let k = 0; k < 3; k += 1) {
        const n = new THREE.Vector3().fromBufferAttribute(normal, i + k);
        expect(n.dot(face)).toBeCloseTo(1, 6);
      }
    }
  });

  it("keeps the side and cap groups for the materials", () => {
    const geometry = flatSidedPrismGeometry(3, 1, 0);
    expect(geometry.groups.length).toBe(3);
  });
});
