import * as THREE from "three";

/**
 * Whether this is a Mac (or an iPad with a trackpad, which reports itself as one). There a click with
 * Control held is the system's right click, so Control and drag is a right-button drag.
 */
export function isMacPointer() {
  return typeof navigator !== "undefined" && /Macintosh|Mac OS X/.test(navigator.userAgent);
}

/**
 * What the left button does in OrbitControls for a press with Ctrl or Cmd held. OrbitControls swaps rotate
 * and pan by itself while Ctrl, Cmd or Shift is down, so asking for ROTATE here is what makes it pan, and
 * asking for PAN makes it turn.
 *
 * - Ctrl or Cmd and drag moves the view (#654): a MacBook without a middle button had no other way to.
 * - On a Mac, Control alone turns it instead (#860): Control-click is the Mac's right click, and a right
 *   drag turns the view. Mac people turned the view that way until 1.95.0, and Cmd still moves it there.
 *
 * Any other left press belongs to the editor (null).
 */
/**
 * What the middle and right buttons do in the 3D view (#1013): in layerling's own scheme the right one turns the view
 * and the middle one shifts it; in the slicer scheme (Bambu Studio, OrcaSlicer) both shift it, and a left drag on empty
 * space turns it instead (handed over by the view, see `slicerLeftTurn`).
 */
export function cameraButtonsFor(scheme: "layerling" | "slicer" | undefined): { MIDDLE: THREE.MOUSE; RIGHT: THREE.MOUSE } {
  return scheme === "slicer" ? { MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.PAN } : { MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE };
}

/**
 * Whether a press on empty space turns the view instead of drawing a selection box: in the slicer scheme a plain left
 * drag of a mouse or a pen does (#1013); Shift keeps the box, as in Bambu Studio, and Alt (a box that takes what it
 * touches) too. A finger has its own way.
 */
export function slicerLeftTurn(scheme: "layerling" | "slicer" | undefined, event: Pick<PointerEvent, "button" | "pointerType" | "shiftKey" | "altKey" | "ctrlKey" | "metaKey">) {
  return scheme === "slicer" && event.pointerType !== "touch" && event.button === 0 && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey;
}

export function leftButtonCameraAction(event: Pick<PointerEvent, "button" | "ctrlKey" | "metaKey">, mac = isMacPointer()): THREE.MOUSE | null {
  if (event.button !== 0 || !(event.ctrlKey || event.metaKey)) return null;
  return mac && event.ctrlKey && !event.metaKey ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
}
