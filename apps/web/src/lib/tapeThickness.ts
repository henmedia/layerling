import * as THREE from "three";

/** Closer than this to the point, in mm, a crossing is the face the point lies on itself, not the other side. */
const SAME_FACE = 1e-3;

export type WallThickness = {
  /** Where the straight line into the body comes out again. */
  exit: THREE.Vector3;
  /** How much material lies between the point and there, in mm. */
  thickness: number;
};

/**
 * How thick a body is at a point on its surface (Discussion #1820): the way from the point straight in, square to
 * the face it lies on, to where the material ends. On a hollowed box that is the wall, on a solid block all of the
 * block, on a cylinder's side its diameter.
 *
 * The line is looked along from the far side, towards the point: there the other side of the wall faces the ray, so
 * it is found whether the surfaces are drawn from one side or from both. Only surfaces count, not the edge lines.
 *
 * `layer`: the render layer the body's surfaces are on, when the scene sorts its objects into layers.
 */
export function wallThicknessAt(body: THREE.Object3D, point: THREE.Vector3, outwardNormal: THREE.Vector3, layer?: number): WallThickness | null {
  if (outwardNormal.lengthSq() < 1e-12) return null;
  const outward = outwardNormal.clone().normalize();
  body.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(body);
  if (box.isEmpty()) return null;
  // Far enough back to start outside the body wherever the point lies on it.
  const reach = box.getSize(new THREE.Vector3()).length() + 1;
  const raycaster = new THREE.Raycaster(point.clone().addScaledVector(outward, -reach), outward, 0, reach - SAME_FACE);
  if (layer !== undefined) raycaster.layers.set(layer);
  let nearest: THREE.Intersection | null = null;
  for (const hit of raycaster.intersectObject(body, true)) {
    if (!(hit.object instanceof THREE.Mesh)) continue;
    if (!nearest || hit.distance > nearest.distance) nearest = hit;
  }
  if (!nearest) return null;
  const thickness = reach - nearest.distance;
  return thickness > SAME_FACE ? { exit: nearest.point.clone(), thickness } : null;
}
