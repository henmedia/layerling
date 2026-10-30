import * as THREE from "three";

/**
 * A 3D mouse (3Dconnexion SpaceMouse and its kin, #1013) read straight from the browser over WebHID, which Chrome and Edge
 * have and Firefox and Safari do not. The device sends its six axes as little-endian 16-bit numbers of about ±350: newer
 * ones all six in report 1, older ones the three shifts in report 1 and the three turns in report 2. Report 3 carries the
 * buttons, which are left alone here.
 */

/** What a 3D mouse calls itself to HID: a multi-axis controller on the generic desktop page. */
export const SPACE_MOUSE_FILTERS = [{ usagePage: 0x01, usage: 0x08 }, { vendorId: 0x256f }, { vendorId: 0x046d, usagePage: 0x01, usage: 0x08 }];

/** The six axes: shift right, shift away, shift down, tilt forward, tilt sideways, twist - device units, about ±350. */
export type SpaceMouseAxes = { tx: number; ty: number; tz: number; rx: number; ry: number; rz: number };

export const SPACE_MOUSE_REST: SpaceMouseAxes = { tx: 0, ty: 0, tz: 0, rx: 0, ry: 0, rz: 0 };

/** The axes after one input report, from those before it; unchanged for a report that carries no axes. */
export function readSpaceMouseReport(axes: SpaceMouseAxes, reportId: number, data: DataView): SpaceMouseAxes {
  const at = (offset: number) => (data.byteLength >= offset + 2 ? data.getInt16(offset, true) : 0);
  if (reportId === 1 && data.byteLength >= 12) return { tx: at(0), ty: at(2), tz: at(4), rx: at(6), ry: at(8), rz: at(10) };
  if (reportId === 1 && data.byteLength >= 6) return { ...axes, tx: at(0), ty: at(2), tz: at(4) };
  if (reportId === 2 && data.byteLength >= 6) return { ...axes, rx: at(0), ry: at(2), rz: at(4) };
  return axes;
}

/** Below this the cap is taken as at rest: a 3D mouse never quite returns to zero. */
const DEAD_ZONE = 12;
/** Full deflection, in device units. */
const FULL = 350;

/** An axis as -1 to 1, with the rest band cut away and a gentle start, so small pushes give fine moves. */
export function spaceMouseAmount(value: number) {
  const size = Math.abs(value);
  if (size <= DEAD_ZONE) return 0;
  const share = Math.min(1, (size - DEAD_ZONE) / (FULL - DEAD_ZONE));
  return Math.sign(value) * share * share;
}

/** How far the view goes in one second at full deflection: turns in radians, shifts in view heights, zoom as a factor. */
const TURN_PER_SECOND = 2.2;
const SHIFT_PER_SECOND = 0.9;
const ZOOM_PER_SECOND = 3;

/**
 * Moves the camera for `seconds` of the cap held as `axes`, around `target`, the way a 3D mouse moves the model in CAD
 * programs: shifting the cap left, right, up or down shifts the view, pushing it away zooms in, tilting it forward or back
 * tilts the view, and twisting it turns the view about the up axis. Returns whether anything moved.
 */
export function moveCameraBySpaceMouse(
  camera: THREE.PerspectiveCamera | THREE.OrthographicCamera,
  target: THREE.Vector3,
  axes: SpaceMouseAxes,
  seconds: number,
): boolean {
  const shiftX = spaceMouseAmount(axes.tx);
  const shiftUp = -spaceMouseAmount(axes.tz);
  const push = spaceMouseAmount(axes.ty);
  const tilt = spaceMouseAmount(axes.rx);
  const twist = spaceMouseAmount(axes.rz);
  if (!shiftX && !shiftUp && !push && !tilt && !twist) return false;
  const offset = camera.position.clone().sub(target);
  const distance = offset.length();
  // Twist about the world's up axis, tilt about the camera's own sideways axis, kept short of the poles.
  if (twist) offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), -twist * TURN_PER_SECOND * seconds);
  if (tilt) {
    const side = new THREE.Vector3().crossVectors(offset, camera.up).normalize();
    const turned = offset.clone().applyAxisAngle(side, -tilt * TURN_PER_SECOND * seconds);
    const height = turned.clone().normalize().dot(camera.up);
    if (Math.abs(height) < 0.995) offset.copy(turned);
  }
  // Shifts move camera and target together, by a share of what the view shows.
  const viewHeight = camera instanceof THREE.OrthographicCamera
    ? (camera.top - camera.bottom) / camera.zoom
    : 2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
  const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
  const shift = right.multiplyScalar(shiftX * viewHeight * SHIFT_PER_SECOND * seconds)
    .add(up.multiplyScalar(shiftUp * viewHeight * SHIFT_PER_SECOND * seconds));
  target.add(shift);
  const factor = Math.exp(-push * ZOOM_PER_SECOND * seconds);
  if (camera instanceof THREE.OrthographicCamera) {
    camera.zoom = THREE.MathUtils.clamp(camera.zoom / factor, 0.01, 1000);
    camera.updateProjectionMatrix();
  } else {
    offset.multiplyScalar(factor);
  }
  camera.position.copy(target).add(offset);
  camera.lookAt(target);
  return true;
}
