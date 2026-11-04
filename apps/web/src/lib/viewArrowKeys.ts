import * as THREE from "three";

declare global {
  interface Window {
    /** Turns the view about its centre: azimuth around the vertical, polar towards or away from straight down. */
    layerlingOrbitView?: (azimuthDegrees: number, polarDegrees: number) => void;
    /** Slides the view across the screen, in parts of the height it shows: the model moves right and up. */
    layerlingPanView?: (rightFraction: number, upFraction: number) => void;
  }
}

type ArrowKeyEvent = { key: string; shiftKey: boolean; ctrlKey: boolean; metaKey: boolean; altKey: boolean };

export type ViewCamera = {
  camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  controls: { target: THREE.Vector3; minPolarAngle: number; maxPolarAngle: number; update: () => unknown };
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** A press of Ctrl+arrow moves the model a tenth of the view's height, with Shift half of it. */
export const VIEW_PAN_STEP = 0.1;
export const VIEW_PAN_COARSE_STEP = 0.5;

/**
 * With nothing selected the arrow keys move the view instead of a body. They
 * move the model as they would a body: plain arrows turn it 15 degrees a press
 * (Shift: 90) - right turns its front to the right, up tilts its front upwards -
 * and Ctrl+arrows slide it across the screen that way. Returns whether the key
 * was taken.
 */
export function handleViewArrowKey(event: ArrowKeyEvent, hasSelection: boolean): boolean {
  if (hasSelection) return false;
  const step = viewArrowStep(event);
  if (!step) return false;
  if (step.pan) {
    if (!window.layerlingPanView) return false;
    window.layerlingPanView(...step.pan);
    return true;
  }
  if (!window.layerlingOrbitView) return false;
  window.layerlingOrbitView(...step.orbit);
  return true;
}

/**
 * What an arrow key does to the view: a turn (azimuth, polar in degrees) or, with Ctrl or Cmd, a
 * slide (right, up in parts of the view's height). Null for any other key, or with Alt.
 */
export function viewArrowStep(event: ArrowKeyEvent): { orbit: [number, number]; pan?: undefined } | { pan: [number, number]; orbit?: undefined } | null {
  if (event.altKey) return null;
  const x = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
  const y = event.key === "ArrowUp" ? 1 : event.key === "ArrowDown" ? -1 : 0;
  if (!x && !y) return null;
  if (event.ctrlKey || event.metaKey) {
    const step = event.shiftKey ? VIEW_PAN_COARSE_STEP : VIEW_PAN_STEP;
    return { pan: [x * step, y * step] };
  }
  const angle = event.shiftKey ? 90 : 15;
  return { orbit: [-x * angle, y * angle] };
}

export function orbitViewBy({ camera, controls }: ViewCamera, azimuthDegrees: number, polarDegrees: number) {
  const target = controls.target;
  const offset = camera.position.clone().sub(target);
  const spherical = new THREE.Spherical().setFromVector3(offset);
  spherical.theta += THREE.MathUtils.degToRad(azimuthDegrees);
  // Stops short of straight down or up, where the turn would flip over.
  const minPolar = Math.max(controls.minPolarAngle, 1e-3);
  const maxPolar = Math.min(controls.maxPolarAngle, Math.PI - 1e-3);
  spherical.phi = clamp(spherical.phi + THREE.MathUtils.degToRad(polarDegrees), minPolar, maxPolar);
  offset.setFromSpherical(spherical);
  camera.up.set(0, 1, 0);
  camera.position.copy(target).add(offset);
  camera.lookAt(target);
  camera.updateProjectionMatrix();
  controls.update();
}

/** The height the view shows at the depth of its centre, in millimetres. */
export function visibleViewHeight({ camera, controls }: ViewCamera) {
  if (camera instanceof THREE.OrthographicCamera) return (camera.top - camera.bottom) / camera.zoom;
  const distance = camera.position.distanceTo(controls.target);
  return 2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) / camera.zoom;
}

/**
 * Camera and centre move together, so the view only slides and does not turn.
 * They move against the key, so the model on screen goes with it.
 */
export function panViewBy(view: ViewCamera, rightFraction: number, upFraction: number) {
  const { camera, controls } = view;
  camera.updateMatrixWorld();
  const height = visibleViewHeight(view);
  const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
  const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
  const step = right.multiplyScalar(-rightFraction * height).addScaledVector(up, -upFraction * height);
  camera.position.add(step);
  controls.target.add(step);
  controls.update();
}
