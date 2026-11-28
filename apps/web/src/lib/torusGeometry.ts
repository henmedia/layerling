import * as THREE from "three";
import { torusSectionPoints } from "@/lib/torusShape";

/**
 * The torus about the y axis, before it is brought to its width, depth and height. A tube wider than
 * the ring would run through the axis and the surface through itself, so then only the part of the
 * tube outside the axis is turned (a spindle torus, #2187): each end of it meets the axis in one point,
 * the dimple's tip, where the triangles of all sides close up.
 */
export function torusBaseGeometry(majorRadius: number, tubeRadius: number, tubeSteps: number, ringSides: number) {
  const section = torusSectionPoints(majorRadius, tubeRadius, tubeSteps);
  if (!section) {
    const geometry = new THREE.TorusGeometry(majorRadius, tubeRadius, tubeSteps, ringSides);
    geometry.rotateX(Math.PI / 2);
    return geometry;
  }
  const positions: number[] = [];
  const normals: number[] = [];
  const at = (index: number, side: number) => {
    const angle = (side / ringSides) * Math.PI * 2;
    const { r, y } = section[index];
    return [Math.cos(angle) * r, y, -Math.sin(angle) * r];
  };
  // The normal of the tube's circle about the ring at that height and side.
  const normalAt = (index: number, side: number) => {
    const angle = (side / ringSides) * Math.PI * 2;
    const { r, y } = section[index];
    const radial = r - majorRadius;
    const length = Math.hypot(radial, y) || 1;
    return [Math.cos(angle) * radial / length, y / length, -Math.sin(angle) * radial / length];
  };
  const push = (index: number, side: number) => {
    positions.push(...at(index, side));
    normals.push(...normalAt(index, side));
  };
  const last = section.length - 1;
  for (let side = 0; side < ringSides; side += 1) {
    const next = side + 1;
    for (let index = 0; index < last; index += 1) {
      // Outward, seen with y up: the section runs up the outside, the sides turn anticlockwise from above.
      if (index > 0) {
        push(index, side);
        push(index, next);
        push(index + 1, side);
      }
      if (index + 1 < last) {
        push(index, next);
        push(index + 1, next);
        push(index + 1, side);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  return geometry;
}
