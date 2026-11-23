import * as THREE from "three";

/** How far a press on the view cube moves before it is a drag rather than a click. */
export const VIEW_CUBE_DRAG_THRESHOLD_PX = 4;
/** Turn per pixel dragged; about 80 px turns the view half way round. */
export const VIEW_CUBE_DRAG_RADIANS_PER_PX = 0.04;
/** Keeps the camera a hair off the poles, where lookAt has no defined up. */
export const VIEW_CUBE_POLE_EPSILON = 0.0001;

export type ViewCubeDrag = {
  pointerId: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  dragging: boolean;
};

export function beginViewCubeDrag(pointerId: number, x: number, y: number): ViewCubeDrag {
  return { pointerId, startX: x, startY: y, lastX: x, lastY: y, dragging: false };
}

/**
 * Feeds one pointer move into the gesture. Until the pointer leaves the
 * threshold it reports nothing, so a plain click stays a click; after that it
 * reports the pixels moved since the last move. `started` is true on the move
 * that turns the press into a drag.
 */
export function moveViewCubeDrag(drag: ViewCubeDrag, x: number, y: number): { started: boolean; dx: number; dy: number } | null {
  let started = false;
  if (!drag.dragging) {
    if (Math.hypot(x - drag.startX, y - drag.startY) < VIEW_CUBE_DRAG_THRESHOLD_PX) {
      return null;
    }
    drag.dragging = true;
    started = true;
  }
  const dx = x - drag.lastX;
  const dy = y - drag.lastY;
  drag.lastX = x;
  drag.lastY = y;
  return { started, dx, dy };
}

/**
 * The camera offset from the orbit target after dragging the cube by
 * (dx, dy) pixels. It turns the same way a right-drag on the canvas does:
 * dragging right swings the camera left around the vertical axis, so the scene
 * and the cube follow the pointer, and dragging down tips the camera up
 * towards the top view. The distance to the target stays the same.
 */
export function orbitOffsetByDrag(offset: THREE.Vector3, dx: number, dy: number): THREE.Vector3 {
  const spherical = new THREE.Spherical().setFromVector3(offset);
  spherical.theta -= dx * VIEW_CUBE_DRAG_RADIANS_PER_PX;
  spherical.phi = THREE.MathUtils.clamp(
    spherical.phi - dy * VIEW_CUBE_DRAG_RADIANS_PER_PX,
    VIEW_CUBE_POLE_EPSILON,
    Math.PI - VIEW_CUBE_POLE_EPSILON,
  );
  spherical.makeSafe();
  return new THREE.Vector3().setFromSpherical(spherical);
}

/** Pitch and yaw in degrees of a camera offset, as the view cube shows them. */
export function viewCubeAngles(offset: THREE.Vector3): { pitch: number; yaw: number } {
  const horizontalDistance = Math.max(0.001, Math.hypot(offset.x, offset.z));
  return {
    pitch: THREE.MathUtils.radToDeg(Math.atan2(offset.y, horizontalDistance)),
    yaw: THREE.MathUtils.radToDeg(Math.atan2(offset.x, offset.z)),
  };
}

export type ViewCubeFace = "top" | "bottom" | "front" | "back" | "right" | "left";

/** Keys 1 to 6 jump to the straight views, in the order the shortcut list names them. */
export const VIEW_FACE_SHORTCUTS: Readonly<Record<string, ViewCubeFace>> = {
  "1": "front",
  "2": "back",
  "3": "left",
  "4": "right",
  "5": "top",
  "6": "bottom",
};

/**
 * The view a key press jumps to: the digit itself, or with Shift the digit key
 * it sits on (`Digit1`), because Shift+1 types "!" on most layouts.
 */
export function viewFaceForKey(key: string, code: string, shiftKey: boolean): ViewCubeFace | undefined {
  if (Object.hasOwn(VIEW_FACE_SHORTCUTS, key)) return VIEW_FACE_SHORTCUTS[key];
  if (!shiftKey) return undefined;
  const digit = /^Digit([1-6])$/.exec(code)?.[1];
  return digit ? VIEW_FACE_SHORTCUTS[digit] : undefined;
}

/**
 * Each face as the cube draws it: its outward normal, and the world directions of the
 * face's own right and down, which carry its corner and edge zones (#202). The cube's CSS
 * runs Y downwards, which is why the button styled .cube-top shows the bottom.
 */
const VIEW_CUBE_FACE_FRAMES: Readonly<Record<ViewCubeFace, { normal: [number, number, number]; right: [number, number, number]; down: [number, number, number] }>> = {
  front: { normal: [0, 0, 1], right: [1, 0, 0], down: [0, -1, 0] },
  back: { normal: [0, 0, -1], right: [-1, 0, 0], down: [0, -1, 0] },
  right: { normal: [1, 0, 0], right: [0, 0, -1], down: [0, -1, 0] },
  left: { normal: [-1, 0, 0], right: [0, 0, 1], down: [0, -1, 0] },
  top: { normal: [0, 1, 0], right: [1, 0, 0], down: [0, 0, 1] },
  bottom: { normal: [0, -1, 0], right: [1, 0, 0], down: [0, 0, -1] },
};

/** -1, 0 or 1 across a face: left/top edge, middle, right/bottom edge. */
export type ViewCubeZoneStep = -1 | 0 | 1;

/** The eight zones round a face's middle, which stays the face itself. */
export const VIEW_CUBE_ZONES: ReadonlyArray<readonly [ViewCubeZoneStep, ViewCubeZoneStep]> = [
  [-1, -1], [0, -1], [1, -1],
  [-1, 0], [1, 0],
  [-1, 1], [0, 1], [1, 1],
];
/** Where the three bands across a face start and how wide they are, in percent: a quarter at each side. */
export const VIEW_CUBE_ZONE_START = [0, 24, 76] as const;
export const VIEW_CUBE_ZONE_SIZE = [24, 52, 24] as const;

/**
 * The unit direction from the orbit target to the camera for a click on one zone of a
 * face: the middle is the face itself, a band along a side the edge it shares with the
 * next face, a corner the corner of three faces - so an edge or a corner gives the same
 * view from whichever face it is clicked.
 */
export function viewCubeZoneDirection(face: ViewCubeFace, column: ViewCubeZoneStep, row: ViewCubeZoneStep): THREE.Vector3 {
  const frame = VIEW_CUBE_FACE_FRAMES[face];
  return new THREE.Vector3(...frame.normal)
    .add(new THREE.Vector3(...frame.right).multiplyScalar(column))
    .add(new THREE.Vector3(...frame.down).multiplyScalar(row))
    .normalize();
}

const VIEW_FACES: readonly ViewCubeFace[] = ["top", "bottom", "front", "back", "right", "left"];

/**
 * A view named by one to three faces joined with "-": "front" a face, "front-right" the
 * edge between two, "front-right-top" the corner of three - what a click on the view cube
 * gives. Null for an unknown name, a face twice or two opposite faces.
 */
export function viewDirectionFromName(name: string): THREE.Vector3 | null {
  const parts = name.trim().toLowerCase().split("-");
  if (parts.length < 1 || parts.length > 3 || new Set(parts).size !== parts.length) return null;
  const sum = new THREE.Vector3();
  for (const part of parts) {
    if (!VIEW_FACES.includes(part as ViewCubeFace)) return null;
    sum.add(viewFaceDirection(part as ViewCubeFace));
  }
  // Opposite faces cancel out, leaving fewer axes than names.
  const axes = [sum.x, sum.y, sum.z].filter((value) => Math.abs(value) > 1e-9).length;
  return axes === parts.length ? sum.normalize() : null;
}

/**
 * Top or Bottom that keep the view's turn (Discussion #1967): the camera looks straight down (or up)
 * from the quarter turn nearest to where it stands now, so a view turned 30° comes to rest square to
 * the plate the way it was turned, rather than always with the front at the bottom. `offset` is the
 * camera's position from the orbit target; a camera right on the pole counts as turned 0°.
 */
export function poleDirectionKeepingTurn(face: "top" | "bottom", offset: THREE.Vector3): THREE.Vector3 {
  const turn = Math.hypot(offset.x, offset.z) > 1e-12 ? Math.atan2(offset.x, offset.z) : 0;
  const quarter = Math.PI / 2;
  const theta = Math.round(turn / quarter) * quarter;
  const phi = face === "top" ? VIEW_CUBE_POLE_EPSILON : Math.PI - VIEW_CUBE_POLE_EPSILON;
  return new THREE.Vector3().setFromSpherical(new THREE.Spherical(1, phi, theta));
}

/** The unit direction from the orbit target to the camera when looking at the given side. */
export function viewFaceDirection(face: ViewCubeFace): THREE.Vector3 {
  switch (face) {
    case "top": return new THREE.Vector3(0, 1, 0);
    case "bottom": return new THREE.Vector3(0, -1, 0);
    case "front": return new THREE.Vector3(0, 0, 1);
    case "back": return new THREE.Vector3(0, 0, -1);
    case "right": return new THREE.Vector3(1, 0, 0);
    case "left": return new THREE.Vector3(-1, 0, 0);
  }
}
