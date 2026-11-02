import * as THREE from "three";
import type { ThreeState } from "@/components/workplane/ViewportOverlays";
import { orthographicFramingZoom, perspectiveFramingDistance } from "@/lib/cameraFraming";
import { orbitOffsetByDrag, viewCubeAngles, viewFaceDirection, type ViewCubeFace } from "@/lib/viewCubeDrag";
import { cameraTurn, cameraTurnOffset, pivotSlide, pivotSlidePoint, prefersReducedMotion, type CameraTurn } from "@/lib/viewCubeTransition";
import { readStartView, type DesignView } from "@/lib/designView";
import { zoomDistanceScale } from "@/lib/workplaneSettings";

/**
 * The camera of a 3D view and the moves it makes: home, a face of the view cube, a zoom step,
 * framing the selection, a slide to a spot, the switch between the normal and the flat view. The 3D view and the
 * second view's window each have a camera of their own and share these.
 */

/** How far the camera may back off from what it looks at, in mm. */
export const CAMERA_MAX_DISTANCE = 9000;
/** How close the camera may come to what it looks at, in mm. */
export const CAMERA_MIN_DISTANCE = 3;
export const CAMERA_FOV = 38;
export const CAMERA_HOME = new THREE.Vector3(118, 96, 118);
export const CAMERA_TARGET = new THREE.Vector3(0, 0, 0);

/**
 * A camera that looks at the scene with its own controls: the 3D view's, or the second view's in
 * its own window. The helpers below turn either.
 */
export type CameraRig = Pick<ThreeState, "renderer" | "camera" | "controls" | "needsRender" | "focusReach"> & {
  /** The view cube turn under way: the camera eases to the clicked face instead of jumping. */
  cameraTurn?: CameraTurn | null;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/**
 * The flat (orthographic) view's zoom range, so that it frames exactly what
 * the normal view frames between its closest and farthest distance: its zoom
 * divides the frame it was made with, the normal view's frame grows with the
 * distance. Before, the flat view had a fixed 0.02 to 100 and went much closer.
 */
export function orthographicZoomRange(camera: THREE.OrthographicCamera) {
  const frameHalfHeight = Math.max(0.001, (camera.top - camera.bottom) / 2);
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV / 2));
  return { min: frameHalfHeight / (CAMERA_MAX_DISTANCE * tanHalf), max: frameHalfHeight / (CAMERA_MIN_DISTANCE * tanHalf) };
}

/**
 * Near and far planes that follow the distance: up close a near plane of
 * 0.1 mm would cut into a 3 mm view, far out a fixed one would leave the
 * depth buffer too coarse and faces would flicker into each other.
 *
 * The flat view draws the same picture wherever the camera stands on its line
 * of sight, but the camera stays where the standard view (F) or the switch
 * left it, often closer than the parts in front of the pivot: tilted towards
 * the front, everything nearer than the camera was cut off. Its depth range
 * reaches behind the camera as far as in front, so nothing in the picture is.
 */
export function fitCameraDepthRange(camera: THREE.Camera, target: THREE.Vector3) {
  if (camera instanceof THREE.OrthographicCamera) {
    const far = camera.position.distanceTo(target) + CAMERA_MAX_DISTANCE;
    if (camera.near === -CAMERA_MAX_DISTANCE && Math.abs(camera.far - far) <= camera.far * 0.05) return;
    camera.near = -CAMERA_MAX_DISTANCE;
    camera.far = far;
    camera.updateProjectionMatrix();
    return;
  }
  if (!(camera instanceof THREE.PerspectiveCamera)) return;
  const distance = camera.position.distanceTo(target);
  const near = Math.min(5, Math.max(0.01, distance / 2000));
  const far = Math.max(6000, distance * 2 + 3000);
  if (Math.abs(camera.near - near) <= camera.near * 0.05 && Math.abs(camera.far - far) <= camera.far * 0.05) return;
  camera.near = near;
  camera.far = far;
  camera.updateProjectionMatrix();
}

/**
 * The view as it is now, to start new designs in and to go Home to (#853). It is kept as the normal
 * camera would show it: the flat view's zoom becomes the distance that shows as much, so the start
 * view looks the same whichever projection the editor starts in.
 */
export function startViewOf(state: CameraRig): DesignView {
  const target = state.controls.target.clone();
  const offset = state.camera.position.clone().sub(target);
  const direction = offset.lengthSq() > 0 ? offset.normalize() : CAMERA_HOME.clone().sub(CAMERA_TARGET).normalize();
  const distance = state.camera instanceof THREE.OrthographicCamera
    ? (state.camera.top - state.camera.bottom) / 2 / Math.max(state.camera.zoom, 1e-6) / Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV / 2))
    : state.camera.position.distanceTo(target);
  const position = target.clone().add(direction.multiplyScalar(clamp(distance, CAMERA_MIN_DISTANCE, CAMERA_MAX_DISTANCE)));
  return {
    orthographic: false,
    position: position.toArray() as [number, number, number],
    target: target.toArray() as [number, number, number],
    up: state.camera.up.toArray() as [number, number, number],
    zoom: 1,
  };
}

/** Home: the start view the user chose (#853), else the standard one. */
export function resetCamera(state: CameraRig) {
  state.cameraTurn = null;
  state.focusReach = null;
  const start = readStartView();
  const home = start ? new THREE.Vector3().fromArray(start.position) : CAMERA_HOME;
  const target = start ? new THREE.Vector3().fromArray(start.target) : CAMERA_TARGET;
  if (start) state.camera.up.fromArray(start.up);
  else state.camera.up.set(0, 1, 0);
  state.camera.position.copy(home);
  state.controls.target.copy(target);
  if (state.camera instanceof THREE.OrthographicCamera) {
    state.camera.zoom = 1;
    const distance = home.distanceTo(target);
    const halfHeight = distance * Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV / 2));
    const canvas = state.renderer.domElement;
    updateOrthographicFrustum(state.camera, canvas.clientWidth / Math.max(1, canvas.clientHeight), halfHeight);
  } else {
    state.camera.zoom = 1;
  }
  state.camera.lookAt(target);
  state.camera.updateProjectionMatrix();
  state.controls.update();
}

export function updateCameraViewport(
  camera: THREE.PerspectiveCamera | THREE.OrthographicCamera,
  width: number,
  height: number,
) {
  const aspect = width / Math.max(1, height);
  if (camera instanceof THREE.PerspectiveCamera) {
    camera.aspect = aspect;
  } else {
    const halfHeight = Math.max(0.001, (camera.top - camera.bottom) / 2);
    updateOrthographicFrustum(camera, aspect, halfHeight);
    return;
  }
  camera.updateProjectionMatrix();
}

export function updateOrthographicFrustum(camera: THREE.OrthographicCamera, aspect: number, halfHeight: number) {
  camera.left = -halfHeight * aspect;
  camera.right = halfHeight * aspect;
  camera.top = halfHeight;
  camera.bottom = -halfHeight;
  camera.updateProjectionMatrix();
}

export function toggleCameraProjection(state: CameraRig) {
  state.cameraTurn = null;
  const current = state.camera;
  const target = state.controls.target;
  const canvas = state.renderer.domElement;
  const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
  const offset = current.position.clone().sub(target);
  const direction = offset.lengthSq() > 0
    ? offset.clone().normalize()
    : CAMERA_HOME.clone().sub(CAMERA_TARGET).normalize();
  let next: THREE.PerspectiveCamera | THREE.OrthographicCamera;

  if (current instanceof THREE.PerspectiveCamera) {
    const visibleHalfHeight = Math.max(
      0.001,
      offset.length() * Math.tan(THREE.MathUtils.degToRad(current.getEffectiveFOV() / 2)),
    );
    next = new THREE.OrthographicCamera(
      -visibleHalfHeight * aspect,
      visibleHalfHeight * aspect,
      visibleHalfHeight,
      -visibleHalfHeight,
      current.near,
      current.far,
    );
    next.position.copy(current.position);
  } else {
    const visibleHalfHeight = Math.max(0.001, (current.top - current.bottom) / (2 * current.zoom));
    const distance = clamp(
      visibleHalfHeight / Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV / 2)),
      CAMERA_MIN_DISTANCE,
      CAMERA_MAX_DISTANCE,
    );
    next = new THREE.PerspectiveCamera(CAMERA_FOV, aspect, 0.1, 6000);
    next.position.copy(target).addScaledVector(direction, distance);
  }

  if (next instanceof THREE.OrthographicCamera) {
    const range = orthographicZoomRange(next);
    state.controls.minZoom = range.min;
    state.controls.maxZoom = range.max;
  }
  next.up.copy(current.up);
  next.layers.mask = current.layers.mask;
  next.lookAt(target);
  next.updateProjectionMatrix();
  fitCameraDepthRange(next, target);
  next.updateMatrixWorld();
  state.camera = next;
  state.controls.object = next;
  state.controls.update();
  state.needsRender = true;
}

export function setCameraToViewFace(state: CameraRig, face: ViewCubeFace) {
  setCameraToViewDirection(state, viewFaceDirection(face));
}

/** Looks at the orbit target from a unit direction, keeping the distance: a face, an edge or a corner of the view cube. */
export function setCameraToViewDirection(state: CameraRig, direction: THREE.Vector3, animate = true) {
  const offset = state.camera.position.clone().sub(state.controls.target);
  const distance = clamp(offset.length(), CAMERA_MIN_DISTANCE, CAMERA_MAX_DISTANCE);

  if (animate && !prefersReducedMotion()) {
    // A click on the cube turns the view; the render loop eases the camera there and keeps
    // drawing while it does. A second click starts from wherever the first has got to.
    state.cameraTurn = cameraTurn(offset, direction.clone().normalize().multiplyScalar(distance), performance.now());
    state.needsRender = true;
    return;
  }

  state.cameraTurn = null;
  state.camera.up.set(0, 1, 0);
  state.camera.position.copy(state.controls.target).add(direction.multiplyScalar(distance));
  state.camera.lookAt(state.controls.target);
  state.camera.updateProjectionMatrix();
  state.controls.update();
  state.needsRender = true;
}

/**
 * Looks straight onto a plane from the side its normal points to, with a point of it in the middle
 * (#1128): a workplane on a face seen square, as the top view shows the base plate. The distance stays.
 */
export function setCameraOntoPlane(state: CameraRig, point: THREE.Vector3, normal: THREE.Vector3, animate = true) {
  state.focusReach = (state.focusReach?.clone() ?? new THREE.Box3()).expandByPoint(point);
  const offset = state.camera.position.clone().sub(state.controls.target);
  const distance = clamp(offset.length(), CAMERA_MIN_DISTANCE, CAMERA_MAX_DISTANCE);
  const toOffset = normal.clone().normalize().multiplyScalar(distance);

  if (animate && !prefersReducedMotion()) {
    const now = performance.now();
    state.cameraTurn = { ...cameraTurn(offset, toOffset, now), slide: pivotSlide(state.controls.target, point, now) };
    state.needsRender = true;
    return;
  }

  state.cameraTurn = null;
  state.controls.target.copy(point);
  state.camera.up.set(0, 1, 0);
  state.camera.position.copy(point).add(toOffset);
  state.camera.lookAt(point);
  state.camera.updateProjectionMatrix();
  state.controls.update();
  state.needsRender = true;
}

/** Slides the view so that a point comes to the middle of the screen and becomes the pivot, from the same angle and distance. */
export function panCameraTo(state: CameraRig, point: THREE.Vector3, animate = true) {
  // constrainCamera holds the pivot on the plate; a spot beside it may be centred too, as with
  // "Center view" (#352), until the house button takes the allowance back.
  state.focusReach = (state.focusReach?.clone() ?? new THREE.Box3()).expandByPoint(point);
  if (animate && !prefersReducedMotion()) {
    state.cameraTurn = pivotSlide(state.controls.target, point, performance.now());
    state.needsRender = true;
    return;
  }
  state.cameraTurn = null;
  state.camera.position.add(point.clone().sub(state.controls.target));
  state.controls.target.copy(point);
  state.controls.update();
  state.needsRender = true;
}

/** One frame of the view cube turn or the slide of the pivot, before OrbitControls orients the camera. */
export function stepCameraTurn(state: CameraRig, now: number): boolean {
  const turn = state.cameraTurn;
  if (!turn) return false;
  if ("pivotTo" in turn) {
    // The camera moves as far as the pivot, so the angle and the distance stay exactly as they were.
    const { pivot, done } = pivotSlidePoint(turn, now);
    state.camera.position.add(pivot.clone().sub(state.controls.target));
    state.controls.target.copy(pivot);
    if (done) state.cameraTurn = null;
    return true;
  }
  const { offset, done } = cameraTurnOffset(turn, now);
  if (turn.slide) state.controls.target.copy(pivotSlidePoint(turn.slide, now).pivot);
  state.camera.up.set(0, 1, 0);
  state.camera.position.copy(state.controls.target).add(offset);
  state.camera.lookAt(state.controls.target);
  state.camera.updateProjectionMatrix();
  if (done) state.cameraTurn = null;
  return true;
}

/** Orbits the camera around the controls target for a drag on the view cube. */
export function orbitCameraByDrag(state: CameraRig, dx: number, dy: number) {
  state.cameraTurn = null;
  const offset = orbitOffsetByDrag(state.camera.position.clone().sub(state.controls.target), dx, dy);

  state.camera.up.set(0, 1, 0);
  state.camera.position.copy(state.controls.target).add(offset);
  state.camera.lookAt(state.controls.target);
  state.camera.updateProjectionMatrix();
  state.controls.update();
  state.needsRender = true;
}

export function syncViewCube(state: CameraRig, cube: HTMLDivElement | null) {
  if (!cube) {
    return;
  }

  const { pitch, yaw } = viewCubeAngles(state.camera.position.clone().sub(state.controls.target));
  cube.style.transform = `rotateX(${-pitch}deg) rotateY(${-yaw}deg)`;
}

/** A zoom step of the buttons or the + and - keys: the flat view enlarges, the normal view moves closer to its pivot. */
export function zoomCameraBy(state: CameraRig, scale: number) {
  state.cameraTurn = null;
  const scaled = zoomDistanceScale(scale);
  if (state.camera instanceof THREE.OrthographicCamera) {
    const range = orthographicZoomRange(state.camera);
    state.camera.zoom = clamp(state.camera.zoom / scaled, range.min, range.max);
  } else {
    const offset = state.camera.position.clone().sub(state.controls.target);
    const distance = clamp(offset.length() * scaled, CAMERA_MIN_DISTANCE, CAMERA_MAX_DISTANCE);
    offset.setLength(distance);
    state.camera.position.copy(state.controls.target).add(offset);
  }
  state.camera.updateProjectionMatrix();
  state.controls.update();
  state.needsRender = true;
}

/** The box around the bodies with these ids, or null when none of them is drawn. */
export function selectionBounds(state: Pick<ThreeState, "shapeRecords">, ids: readonly string[]) {
  const bounds = new THREE.Box3();
  ids.forEach((id) => {
    const record = state.shapeRecords.get(id);
    if (record) bounds.expandByObject(record.object);
  });
  return bounds.isEmpty() ? null : bounds;
}

/** Zooms to a box from the side the camera looks from now (F). */
export function frameBounds(state: CameraRig, bounds: THREE.Box3) {
  state.cameraTurn = null;
  const center = bounds.getCenter(new THREE.Vector3());
  const radius = Math.max(bounds.getSize(new THREE.Vector3()).length() / 2, 0.5);
  const canvas = state.renderer.domElement;
  const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
  const offset = state.camera.position.clone().sub(state.controls.target);
  const direction = offset.lengthSq() > 0
    ? offset.clone().normalize()
    : CAMERA_HOME.clone().sub(CAMERA_TARGET).normalize();

  if (state.camera instanceof THREE.OrthographicCamera) {
    const halfHeight = Math.max(0.001, (state.camera.top - state.camera.bottom) / 2);
    const zoom = orthographicFramingZoom(radius, halfHeight, aspect);
    const range = orthographicZoomRange(state.camera);
    if (zoom) state.camera.zoom = clamp(zoom, range.min, range.max);
    state.camera.position.copy(center).add(direction.multiplyScalar(clamp(offset.length(), CAMERA_MIN_DISTANCE, CAMERA_MAX_DISTANCE)));
  } else {
    const distance = clamp(perspectiveFramingDistance(radius, CAMERA_FOV, aspect), CAMERA_MIN_DISTANCE, CAMERA_MAX_DISTANCE);
    state.camera.position.copy(center).add(direction.multiplyScalar(distance));
  }

  // constrainCamera keeps the orbit target on the plate on every frame, as far out as this
  // part: one parked beyond the plate edge is centred too, as in Tinkercad (#352). The house
  // button takes the allowance back.
  state.focusReach = bounds.clone();
  state.controls.target.copy(center);
  state.camera.lookAt(center);
  state.camera.updateProjectionMatrix();
  state.controls.update();
  state.needsRender = true;
}
