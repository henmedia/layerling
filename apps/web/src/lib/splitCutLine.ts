import * as THREE from "three";

/** More triangles than this are not walked for the cut line: the plane is drawn all the same, and the line is left out. */
export const SPLIT_OUTLINE_MAX_TRIANGLES = 600_000;

/** A corner this close to the plane (mm) lies on it. */
const ON_PLANE = 1e-5;

/**
 * Where a plane meets the surfaces of some meshes: pairs of points (x, y, z, x, y, z) in world space, one pair
 * for each triangle the plane crosses. The cut line of the split tool (#615). A plane laid exactly on a face - a
 * lid cut at its plate's thickness (#1263) - meets the walls along their edges: those edges are the line.
 */
export function planeCrossingSegments(meshes: readonly THREE.Mesh[], origin: readonly [number, number, number], planeNormal: readonly [number, number, number]): number[] {
  const points: number[] = [];
  let triangles = 0;
  for (const mesh of meshes) {
    const geometry = mesh.geometry as THREE.BufferGeometry;
    const position = geometry.getAttribute("position");
    if (position) triangles += geometry.index ? geometry.index.count / 3 : position.count / 3;
  }
  if (triangles > SPLIT_OUTLINE_MAX_TRIANGLES) return points;

  const normal = new THREE.Vector3(...planeNormal).normalize();
  const start = new THREE.Vector3(...origin);
  const corner = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const distance = [0, 0, 0];
  const crossing = new THREE.Vector3();
  for (const mesh of meshes) {
    const geometry = mesh.geometry as THREE.BufferGeometry;
    const position = geometry.getAttribute("position");
    if (!position) continue;
    mesh.updateWorldMatrix(true, false);
    const index = geometry.index;
    const count = index ? index.count / 3 : position.count / 3;
    for (let triangle = 0; triangle < count; triangle += 1) {
      for (let k = 0; k < 3; k += 1) {
        const vertex = index ? index.getX(triangle * 3 + k) : triangle * 3 + k;
        corner[k].fromBufferAttribute(position, vertex).applyMatrix4(mesh.matrixWorld);
        distance[k] = normal.dot(crossing.copy(corner[k]).sub(start));
        if (Math.abs(distance[k]) < ON_PLANE) distance[k] = 0;
      }
      if ((distance[0] > 0 && distance[1] > 0 && distance[2] > 0) || (distance[0] < 0 && distance[1] < 0 && distance[2] < 0)) continue;
      const onPlane = [0, 1, 2].filter((k) => distance[k] === 0);
      // A triangle lying in the plane draws nothing; its border is drawn by the walls round it.
      if (onPlane.length === 3) continue;
      if (onPlane.length === 2) {
        const [a, b] = onPlane;
        points.push(corner[a].x, corner[a].y, corner[a].z, corner[b].x, corner[b].y, corner[b].z);
        continue;
      }
      const found: number[] = [];
      for (let k = 0; k < 3; k += 1) {
        const next = (k + 1) % 3;
        const a = distance[k];
        const b = distance[next];
        if ((a < 0 && b > 0) || (a > 0 && b < 0)) {
          crossing.copy(corner[k]).lerp(corner[next], a / (a - b));
          found.push(crossing.x, crossing.y, crossing.z);
        } else if (a === 0 && b !== 0) {
          found.push(corner[k].x, corner[k].y, corner[k].z);
        }
      }
      if (found.length >= 6) points.push(found[0], found[1], found[2], found[3], found[4], found[5]);
    }
  }
  return points;
}
