export type SketchPointerModifiers = {
  button: number;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
};

/** Whether a press shifts the sketch: the middle button, or the right one with a modifier - or alone in the slicer scheme, where the right button shifts the 3D view too (#1013). */
export function isSketchPanGesture(event: SketchPointerModifiers, scheme: "layerling" | "slicer" = "layerling") {
  return event.button === 1 || (event.button === 2 && (scheme === "slicer" || event.ctrlKey || event.metaKey || event.shiftKey));
}

export type SketchView = { zoom: number; pan: { x: number; z: number } };

export const SKETCH_MIN_ZOOM = 0.75;
// Cap for Shift+F framing, so focusing a small selection keeps some context.
export const SKETCH_MAX_ZOOM = 6;
// Manual zoom (wheel, buttons) can go much further, like the 3D editor; the
// cap only guards against runaway values.
export const SKETCH_MANUAL_MAX_ZOOM = 10000;

// The 3D editor's wheel step moves the camera toward its orbit target, which
// usually magnifies nearby geometry more than the step itself. A flat 2D scale
// by the same step feels sluggish next to it, so the sketch wheel runs faster.
export const SKETCH_WHEEL_ZOOM_BOOST = 2;

export type SketchWheelInput = {
  deltaY: number;
  deltaMode: number;
  ctrlKey: boolean;
};

/**
 * Zoom multiplier for one wheel event, using the same curve as the 3D
 * editor's OrbitControls: 0.95^(zoomSpeed * deltaY / 100), with line/page
 * deltas and trackpad pinches (Ctrl + wheel) scaled the way OrbitControls does.
 */
export function sketchWheelZoomFactor(event: SketchWheelInput, orbitZoomSpeed: number) {
  let deltaY = event.deltaY;
  if (event.deltaMode === 1) deltaY *= 16;
  else if (event.deltaMode === 2) deltaY *= 100;
  if (event.ctrlKey) deltaY *= 10;
  return 0.95 ** (orbitZoomSpeed * deltaY * 0.01);
}

/**
 * Zoom multiplier for one change of a trackpad pinch that Safari on a Mac reports as a gesture (#439 forum): it sends
 * no Ctrl wheel steps, only a scale that has grown since the last event. At the default zoom speed the plate follows
 * the fingers one to one; a faster or slower setting speeds up or slows down the pinch the way it does the wheel.
 */
export function sketchPinchZoomFactor(ratio: number, orbitZoomSpeed: number, defaultOrbitZoomSpeed: number) {
  if (!Number.isFinite(ratio) || ratio <= 0 || !(orbitZoomSpeed > 0) || !(defaultOrbitZoomSpeed > 0)) return 1;
  return ratio ** (orbitZoomSpeed / defaultOrbitZoomSpeed);
}

/**
 * Scales the view zoom by `factor` while keeping the plate point under
 * `offset` (screen pixels from the view center) fixed on screen.
 * `pixelsPerUnit` is the fitted screen scale at zoom 1.
 */
export function zoomSketchViewAt(
  view: SketchView,
  factor: number,
  offset: { x: number; y: number },
  pixelsPerUnit: number,
  bounds: { width: number; depth: number },
): SketchView {
  const zoom = Math.min(SKETCH_MANUAL_MAX_ZOOM, Math.max(SKETCH_MIN_ZOOM, view.zoom * factor));
  if (!(pixelsPerUnit > 0) || zoom === view.zoom) return { zoom, pan: view.pan };
  const shift = 1 / view.zoom - 1 / zoom;
  return {
    zoom,
    pan: {
      x: Math.min(bounds.width / 2, Math.max(-bounds.width / 2, view.pan.x + (offset.x / pixelsPerUnit) * shift)),
      z: Math.min(bounds.depth / 2, Math.max(-bounds.depth / 2, view.pan.z + (offset.y / pixelsPerUnit) * shift)),
    },
  };
}

/** The tools that draw a chain of points: a line, a curve, a smooth line. */
export function isChainDrawingTool(tool: string) {
  return tool === "line" || tool === "bezier" || tool === "smooth";
}

/** How far the pointer may wander between pressing and releasing the right button and still count as a click, in screen pixels. */
const RIGHT_CLICK_REACH = 5;

/**
 * Whether a right click on the plane ends the chain being drawn (#520): one that did not move. A right button
 * that was dragged is a pan of the view and leaves the chain alone.
 */
export function rightClickEndsChain(press: { x: number; y: number } | null, release: { x: number; y: number }) {
  if (!press) return false;
  return Math.hypot(release.x - press.x, release.y - press.y) <= RIGHT_CLICK_REACH;
}
