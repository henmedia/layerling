import * as THREE from "three";

/**
 * Aims a raycaster from the camera through a spot on the screen (coords from -1 to 1), as
 * Raycaster.setFromCamera does - with one difference for the flat (orthographic) view.
 *
 * There three.js starts the ray in the plane of the camera. But the flat view draws behind the
 * camera too (its near plane lies 9000 mm behind it, see fitCameraDepthRange), because the
 * camera often stands closer than the parts in front of the pivot. A ray from the camera's plane
 * then missed everything drawn in front of it: the workplane under the lower part of the screen
 * gave no point, and a part dragged there stopped at an invisible line (Discussion #1558).
 * So the ray starts where the picture starts, on the near plane.
 */
export function setPickRayFromCamera(raycaster: THREE.Raycaster, coords: THREE.Vector2, camera: THREE.Camera) {
  raycaster.setFromCamera(coords, camera);
  if (camera instanceof THREE.OrthographicCamera && camera.near < 0) {
    raycaster.ray.origin.addScaledVector(raycaster.ray.direction, camera.near);
  }
  return raycaster.ray;
}
