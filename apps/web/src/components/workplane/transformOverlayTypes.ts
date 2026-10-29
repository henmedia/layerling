import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from "react";

export type TransformHandleKind = "scale" | "height" | "lift" | "rotate";
export type RotationAxis = "x" | "y" | "z";
export type RotationWheelView = { x: number; y: number; radius: number };

export type RotationPlaneView = {
  x: number;
  y: number;
  a: number;
  b: number;
  c: number;
  d: number;
  directionSign?: number;
};

export type RotationPlaneBasis = Pick<RotationPlaneView, "a" | "b" | "c" | "d">;

export type TransformOverlayPoint = { x: number; y: number };
export type TransformOverlayPoint3D = TransformOverlayPoint & { z: number };
export type TransformOverlayClipPoint = TransformOverlayPoint3D & { w: number };

export function isPointInsideTransformBounds(
  point: TransformOverlayPoint3D,
  min: TransformOverlayPoint3D,
  max: TransformOverlayPoint3D,
) {
  return point.x >= min.x
    && point.x <= max.x
    && point.y >= min.y
    && point.y <= max.y
    && point.z >= min.z
    && point.z <= max.z;
}

export function transformBoundsIntersectClipVolume(points: TransformOverlayClipPoint[]) {
  if (points.length === 0 || points.some((point) => ![point.x, point.y, point.z, point.w].every(Number.isFinite))) {
    return false;
  }

  // A convex selection box is outside the camera frustum only when every one
  // of its corners is beyond the same homogeneous clip plane. Checking the
  // planes before dividing by w also handles boxes behind the camera and boxes
  // that surround the camera during close zoom.
  const outsidePlanes = [
    (point: TransformOverlayClipPoint) => point.x < -point.w,
    (point: TransformOverlayClipPoint) => point.x > point.w,
    (point: TransformOverlayClipPoint) => point.y < -point.w,
    (point: TransformOverlayClipPoint) => point.y > point.w,
    (point: TransformOverlayClipPoint) => point.z < -point.w,
    (point: TransformOverlayClipPoint) => point.z > point.w,
  ];
  return !outsidePlanes.some((isOutside) => points.every(isOutside));
}

export function transformOverlayScreenPoint(
  projectedNdc: TransformOverlayPoint,
  cameraSpaceZ: number,
  width: number,
  height: number,
) {
  const x = ((projectedNdc.x + 1) / 2) * width;
  const y = ((1 - projectedNdc.y) / 2) * height;
  return {
    x,
    y,
    visible: cameraSpaceZ < -0.0001 && Number.isFinite(x) && Number.isFinite(y),
  };
}

/**
 * Smallest screen distance between the lift arrow and the height handle it stands above.
 * The arrow sits a world distance (2 mm at least) over the handle, which is a few pixels for
 * a thin body and nothing at all when looking straight down, so it would cover the handle.
 */
export const LIFT_HANDLE_MIN_SCREEN_DISTANCE = 30;

/** Keeps the lift arrow at least that far from the height handle on the screen, along the way it already points. */
export function liftHandleScreenPoint<T extends { x: number; y: number }>(base: { x: number; y: number }, lifted: T, below: boolean): T {
  const dx = lifted.x - base.x;
  const dy = lifted.y - base.y;
  const length = Math.hypot(dx, dy);
  if (length >= LIFT_HANDLE_MIN_SCREEN_DISTANCE) return lifted;
  // Straight along the view the axis has no direction on the screen: up (or down, for the lower arrow).
  const unitX = length > 1e-6 ? dx / length : 0;
  const unitY = length > 1e-6 ? dy / length : below ? 1 : -1;
  return { ...lifted, x: base.x + unitX * LIFT_HANDLE_MIN_SCREEN_DISTANCE, y: base.y + unitY * LIFT_HANDLE_MIN_SCREEN_DISTANCE };
}

/** Inside the wheel the turn snaps to the drawn ticks, one every 22.5°; Shift halves the step. */
export const ROTATION_WHEEL_SNAP_DEGREES = 22.5;
export const ROTATION_WHEEL_SHIFT_SNAP_DEGREES = 11.25;
/** Outside the wheel the turn is free (1°); Shift snaps it to this step. */
export const ROTATION_FREE_SHIFT_SNAP_DEGREES = 45;

/**
 * Smallest screen distance between a measured edge and its dimension label.
 *
 * Rotate handles sit up to 28px outside the silhouette and their hit area
 * reaches 20px further, so a label centre closer than 28 + 20 + half a label
 * (13px) lands under one. Labels are placed at a fixed *world* offset, which
 * shrinks to nothing as you zoom out, so that distance has to be enforced in
 * screen space instead.
 */
export const DIMENSION_LABEL_MIN_SCREEN_OFFSET = 62;

/**
 * Extra screen-space offset that lifts a whole dimension mark — rail,
 * extension lines and label together — off the selection when the projected
 * world offset alone would leave it too close. Returns a zero push once the
 * mark already clears `minOffset`, so zoomed-in views are untouched.
 */
export function dimensionMarkScreenPush(
  edgeMidpoint: TransformOverlayPoint,
  labelPoint: TransformOverlayPoint,
  minOffset = DIMENSION_LABEL_MIN_SCREEN_OFFSET,
): TransformOverlayPoint {
  const dx = labelPoint.x - edgeMidpoint.x;
  const dy = labelPoint.y - edgeMidpoint.y;
  const distance = Math.hypot(dx, dy);
  if (!Number.isFinite(distance) || distance < 0.001 || distance >= minOffset) {
    return { x: 0, y: 0 };
  }
  const scale = (minOffset - distance) / distance;
  return { x: dx * scale, y: dy * scale };
}

/**
 * Largest screen distance between a measured edge and its dimension label.
 *
 * The same fixed world offset grows without bound as you zoom in: on a part
 * below a millimetre that fills the view, the label landed many screen widths
 * away and you had to zoom out to read it (#989).
 */
export const DIMENSION_LABEL_MAX_SCREEN_OFFSET = 120;

/**
 * Whether a dimension mark has to be laid out in screen space: its label lands
 * further than `maxOffset` from the edge, or one of its world offset points lies
 * behind the camera, where the projection flips it back across the body.
 */
export function dimensionMarkNeedsScreenLayout(
  edgeMidpoint: TransformOverlayPoint,
  labelPoint: TransformOverlayPoint,
  offsetPointsVisible: boolean,
  maxOffset = DIMENSION_LABEL_MAX_SCREEN_OFFSET,
) {
  const distance = Math.hypot(labelPoint.x - edgeMidpoint.x, labelPoint.y - edgeMidpoint.y);
  return !offsetPointsVisible || !Number.isFinite(distance) || distance > maxOffset;
}

/**
 * Lays a dimension mark out along a screen direction, with the label exactly
 * `maxOffset` from the edge and rail and extension lines at the same ratios as
 * their world offsets, so it looks like the world-placed mark, only closer.
 */
export function screenSpaceDimensionMark(
  from: TransformOverlayPoint,
  to: TransformOverlayPoint,
  edgeMidpoint: TransformOverlayPoint,
  direction: TransformOverlayPoint,
  offsets: { rail: number; overrun: number; label: number },
  maxOffset = DIMENSION_LABEL_MAX_SCREEN_OFFSET,
) {
  const pixelsPerUnit = maxOffset / (offsets.rail + offsets.label);
  const along = (point: TransformOverlayPoint, distance: number) => ({
    x: point.x + direction.x * distance * pixelsPerUnit,
    y: point.y + direction.y * distance * pixelsPerUnit,
  });
  return {
    railFrom: along(from, offsets.rail),
    railTo: along(to, offsets.rail),
    extensionFrom: along(from, offsets.rail + offsets.overrun),
    extensionTo: along(to, offsets.rail + offsets.overrun),
    labelPoint: along(edgeMidpoint, offsets.rail + offsets.label),
  };
}

type RotationDirectionVector = { x: number; y: number; z: number };

export function rotationPlaneDirectionSign(
  axis: RotationDirectionVector,
  uAxis: RotationDirectionVector,
  vAxis: RotationDirectionVector,
) {
  const crossX = uAxis.y * vAxis.z - uAxis.z * vAxis.y;
  const crossY = uAxis.z * vAxis.x - uAxis.x * vAxis.z;
  const crossZ = uAxis.x * vAxis.y - uAxis.y * vAxis.x;
  const alignment = axis.x * crossX + axis.y * crossY + axis.z * crossZ;
  return alignment < 0 ? -1 : 1;
}

export type RotateArrowVector = { x: number; y: number; z: number };

const ROTATE_ARROW_HALF_SPAN = (58 * Math.PI) / 180;
const ROTATE_ARROW_STEPS = 14;
const ROTATE_ARROW_HEAD_LENGTH = 7;
const ROTATE_ARROW_HEAD_HALF_WIDTH = 3.6;
/** The curve is never flatter than this many pixels, so a plane seen edge-on is still an arrow, not a bar. */
const ROTATE_ARROW_MIN_SAGITTA = 3;

/**
 * The arrow of a rotate handle, built in space like the circle it stands for: an arc in the plane
 * perpendicular to `axis`, bulging away from the axis along `radial`, with `mid` as its middle, run
 * through the camera by `project`. So it sits in perspective on the selection and turns with the view,
 * as the arrows of similar tools do. Coordinates are relative to the projected `mid`, in pixels.
 */
export function rotateHandleArrow(
  project: (point: RotateArrowVector) => TransformOverlayPoint,
  mid: RotateArrowVector,
  radial: RotateArrowVector,
  axis: RotateArrowVector,
  glyphRadius: number,
) {
  const tangent = {
    x: axis.y * radial.z - axis.z * radial.y,
    y: axis.z * radial.x - axis.x * radial.z,
    z: axis.x * radial.y - axis.y * radial.x,
  };
  const centre = { x: mid.x - radial.x * glyphRadius, y: mid.y - radial.y * glyphRadius, z: mid.z - radial.z * glyphRadius };
  const origin = project(mid);
  const raw = Array.from({ length: ROTATE_ARROW_STEPS + 1 }, (_, index) => {
    const angle = -ROTATE_ARROW_HALF_SPAN + (2 * ROTATE_ARROW_HALF_SPAN * index) / ROTATE_ARROW_STEPS;
    const along = glyphRadius * Math.cos(angle);
    const across = glyphRadius * Math.sin(angle);
    const screen = project({
      x: centre.x + radial.x * along + tangent.x * across,
      y: centre.y + radial.y * along + tangent.y * across,
      z: centre.z + radial.z * along + tangent.z * across,
    });
    return { x: screen.x - origin.x, y: screen.y - origin.y };
  });
  // Bow a nearly straight arc, away from the axis as seen on screen.
  const first = raw[0];
  const last = raw[ROTATE_ARROW_STEPS];
  const chord = { x: last.x - first.x, y: last.y - first.y };
  const tangentOnScreen = project({ x: mid.x + tangent.x, y: mid.y + tangent.y, z: mid.z + tangent.z });
  // The way the arrow travels: its chord, or - when the arc folds back on itself - its projected tangent.
  const travel = Math.hypot(chord.x, chord.y) >= 4
    ? chord
    : { x: tangentOnScreen.x - origin.x, y: tangentOnScreen.y - origin.y };
  const travelLength = Math.hypot(travel.x, travel.y);
  const along = travelLength > 1e-6 ? { x: travel.x / travelLength, y: travel.y / travelLength } : { x: 1, y: 0 };
  const normal = { x: -along.y, y: along.x };
  const sag = raw.map((p) => (p.x - first.x) * normal.x + (p.y - first.y) * normal.y);
  const peak = sag.reduce((best, value) => (Math.abs(value) > Math.abs(best) ? value : best), 0);
  const outward = project({ x: mid.x + radial.x, y: mid.y + radial.y, z: mid.z + radial.z });
  const outwardSign = ((outward.x - origin.x) * normal.x + (outward.y - origin.y) * normal.y) >= 0 ? 1 : -1;
  const bowSign = Math.abs(peak) > 0.3 ? Math.sign(peak) : outwardSign;
  const bow = Math.max(0, ROTATE_ARROW_MIN_SAGITTA - Math.abs(peak));
  const arc = raw.map((p, index) => {
    const lift = bow * Math.sin((Math.PI * index) / ROTATE_ARROW_STEPS) * bowSign;
    return { x: p.x + normal.x * lift, y: p.y + normal.y * lift };
  });
  const direction = (from: TransformOverlayPoint, to: TransformOverlayPoint) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const size = Math.hypot(dx, dy) || 1;
    return { x: dx / size, y: dy / size };
  };
  const head = (base: TransformOverlayPoint, along: TransformOverlayPoint) => {
    const tip = { x: base.x + along.x * ROTATE_ARROW_HEAD_LENGTH, y: base.y + along.y * ROTATE_ARROW_HEAD_LENGTH };
    const side = { x: -along.y * ROTATE_ARROW_HEAD_HALF_WIDTH, y: along.x * ROTATE_ARROW_HEAD_HALF_WIDTH };
    return [tip, { x: base.x + side.x, y: base.y + side.y }, { x: base.x - side.x, y: base.y - side.y }];
  };
  const heads = [
    head(arc[0], direction(arc[1], arc[0])),
    head(arc[ROTATE_ARROW_STEPS], direction(arc[ROTATE_ARROW_STEPS - 1], arc[ROTATE_ARROW_STEPS])),
  ];
  const fmt = (p: TransformOverlayPoint) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
  return {
    x: origin.x,
    y: origin.y,
    arc: `M${arc.map(fmt).join(" L")}`,
    heads: heads.map((triangle) => `M${triangle.map(fmt).join(" L")}Z`).join(" "),
  };
}

export function snappedRotationDelta(rawDelta: number, insideSnapWheel: boolean, shiftKey: boolean) {
  const step = insideSnapWheel
    ? (shiftKey ? ROTATION_WHEEL_SHIFT_SNAP_DEGREES : ROTATION_WHEEL_SNAP_DEGREES)
    : (shiftKey ? ROTATION_FREE_SHIFT_SNAP_DEGREES : 1);
  return Math.round(rawDelta / step) * step;
}

export function snappedWheelRotation(
  pointerAngle: number,
  startPointerAngle: number,
  directionSign = 1,
  snapDegrees = ROTATION_WHEEL_SNAP_DEGREES,
) {
  const snappedPointerAngle = Math.round(pointerAngle / snapDegrees) * snapDegrees;
  const snappedStartPointerAngle = Math.round(startPointerAngle / snapDegrees) * snapDegrees;
  let pointerDelta = snappedPointerAngle - snappedStartPointerAngle;
  while (pointerDelta > 180) pointerDelta -= 360;
  while (pointerDelta <= -180) pointerDelta += 360;
  const direction = directionSign < 0 ? -1 : 1;
  const delta = pointerDelta * direction;
  return {
    delta: delta === 0 ? 0 : delta,
    pointerAngle: snappedPointerAngle,
  };
}

export function continuousSnappedWheelRotation(
  rotation: { delta: number; pointerAngle: number },
  snapDegrees: number,
  previousSnapDegrees: number | undefined,
  previousDelta: number | undefined,
  previousPointerAngle: number | undefined,
  previousDeltaOffset = 0,
  previousPointerOffset = 0,
) {
  const snapModeChanged = previousSnapDegrees !== undefined && previousSnapDegrees !== snapDegrees;
  const deltaOffset = snapModeChanged && previousDelta !== undefined
    ? previousDelta - rotation.delta
    : previousDeltaOffset;
  const pointerOffset = snapModeChanged && previousPointerAngle !== undefined
    ? previousPointerAngle - rotation.pointerAngle
    : previousPointerOffset;
  let pointerAngle = rotation.pointerAngle + pointerOffset;
  while (pointerAngle > 180) pointerAngle -= 360;
  while (pointerAngle < -180) pointerAngle += 360;
  const delta = rotation.delta + deltaOffset;
  return {
    delta: delta === 0 ? 0 : delta,
    pointerAngle,
    deltaOffset,
    pointerOffset,
  };
}

export function normalizedRotationPlaneBasis(plane: RotationPlaneView, invertVerticalAxis = false): RotationPlaneBasis {
  const longestAxis = Math.max(Math.hypot(plane.a, plane.b), Math.hypot(plane.c, plane.d));
  if (!Number.isFinite(longestAxis) || longestAxis < 0.000001) {
    return { a: 1, b: 0, c: 0, d: 1 };
  }
  return {
    a: plane.a / longestAxis,
    b: plane.b / longestAxis,
    c: (plane.c / longestAxis) * (invertVerticalAxis ? -1 : 1),
    d: (plane.d / longestAxis) * (invertVerticalAxis ? -1 : 1),
  };
}

export type PinnedRotationWheelView = {
  axis: RotationAxis;
  wheel: RotationWheelView;
  plane: RotationPlaneView;
};

export type DimensionMark = {
  key: string;
  handleKey: string;
  axis: "width" | "depth" | "height" | "elevation";
  label: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  e1x1: number;
  e1y1: number;
  e1x2: number;
  e1y2: number;
  e2x1: number;
  e2y1: number;
  e2x2: number;
  e2y2: number;
  labelX: number;
  labelY: number;
  /**
   * Only the number, without rails: the second place of the height value, right at the height handle, shown
   * while the handle is hovered or pulled (#488). It is left out where marks stand on their own.
   */
  labelOnly?: boolean;
};

export type TransformOverlayState = {
  id: string;
  width: number;
  height: number;
  guides: Array<{ x1: number; y1: number; x2: number; y2: number }>;
  handles: Array<{ key: string; className: string; kind: TransformHandleKind; x: number; y: number; title: string; angle?: number }>;
  /** arc/heads: the arrow's SVG paths, relative to x/y (see rotateHandleArrow). */
  rotateHandles: Array<{ key: string; className: string; x: number; y: number; arc: string; heads: string }>;
  dimensions: Record<string, DimensionMark[]>;
  /**
   * Handle keys whose dimension marks stay on screen for a single selected
   * shape as soon as it is selected. Filled when the workspace setting
   * dimensionsAlwaysVisible is on: width, depth and height (diameter and
   * height for a cylinder), each on the side of the shape facing the camera.
   * Empty when that setting is off, or when more than one shape is selected.
   */
  alwaysVisibleDimensionKeys: string[];
  rotationWheel: RotationWheelView | null;
  rotationWheels: Record<RotationAxis, RotationWheelView>;
  rotationPlaneCenters: Record<RotationAxis, { x: number; y: number; z: number }>;
  rotationPlanes: Record<RotationAxis, RotationPlaneView>;
  /** Screen position of the rotation pivot the user set; null without one. */
  pivotMarker: { x: number; y: number } | null;
};

export type RotationReadout = {
  x: number;
  y: number;
  text: string;
  angle?: number;
  pointerAngle?: number;
  /** Shift is held inside the wheel: the finer ticks show. */
  fine?: boolean;
} | null;

export type EditingDimension = {
  key: string;
  axis: "width" | "depth" | "height" | "elevation";
  x: number;
  y: number;
  value: string;
} | null;

/** Click on a corner handle: width and depth open together, like the usual X and Y boxes. */
export type EditingCorner = {
  entries: Array<{ key: string; axis: "width" | "depth"; x: number; y: number; value: string; original: string }>;
} | null;

export type EditingRotation = {
  axis: RotationAxis;
  handleKey: string;
  x: number;
  y: number;
  value: string;
} | null;

export type TransformOverlayProps = {
  box: TransformOverlayState;
  measureKey: string | null;
  editingDimension: EditingDimension;
  editingCorner: EditingCorner;
  editingRotation: EditingRotation;
  rotationReadout: RotationReadout;
  /** The turned body's angles, shown below it while it is selected; null hides it. */
  angleBadge?: string | null;
  /** The selection is locked: handles are greyed and only show dimensions on hover. */
  locked?: boolean;
  showRotationWheel: boolean;
  hideSelectionChrome: boolean;
  hideDimensionMarks: boolean;
  rotationWheelAxis: RotationAxis;
  pinnedRotationWheelView: PinnedRotationWheelView | null;
  onBeginCameraDrag: (event: ReactPointerEvent<Element>) => void;
  onCameraWheel: (event: ReactWheelEvent<Element>) => void;
  /** Drags the pivot marker to a new place (#140). */
  onBeginPivotDrag?: (event: ReactPointerEvent<HTMLElement>) => void;
  onBeginTransform: (kind: TransformHandleKind, handleKey: string, event: ReactPointerEvent<Element>) => void;
  onMoveTransform: (clientX: number, clientY: number, shiftKey?: boolean, altKey?: boolean) => boolean;
  onFinishTransform: (event: ReactPointerEvent<Element>) => void;
  onHoverMeasure: (key: string | null) => void;
  onPinMeasure: (key: string | null) => void;
  onBeginDimensionEdit: (mark: DimensionMark) => void;
  onBeginLiftEdit: (handleKey: string, x: number, y: number) => void;
  onBeginCornerEdit: (handleKey: string) => void;
  onEditingCornerChange: (axis: "width" | "depth", value: string) => void;
  /** Alt+Enter: the size grows round the middle instead of from the opposite edge. */
  onCommitCornerEdit: (aroundCenter?: boolean) => void;
  onCancelCornerEdit: () => void;
  onEditingDimensionChange: (value: string) => void;
  /** `aroundCenter` with Alt+Enter (#327), `proportional` with Shift+Enter (#899). */
  onCommitDimensionEdit: (aroundCenter?: boolean, proportional?: boolean) => void;
  /** Tab in a dimension box: keep the value and open the next one (Shift: the one before) (#300). */
  onTabDimensionEdit: (backwards: boolean) => void;
  onCancelDimensionEdit: () => void;
  onBeginRotationEdit: (handleKey: string, x: number, y: number) => void;
  onEditingRotationChange: (value: string) => void;
  onCommitRotationEdit: () => void;
  onCancelRotationEdit: () => void;
};

export function getElevationMeasureKey(overlay: TransformOverlayState | null) {
  return (
    Object.values(overlay?.dimensions ?? {})
      .flat()
      .find((mark) => mark.axis === "elevation")?.handleKey ?? null
  );
}

export function measureKeyForHandle(kind: TransformHandleKind, handleKey: string, overlay: TransformOverlayState | null) {
  if (kind === "lift") {
    return getElevationMeasureKey(overlay) ?? handleKey;
  }
  return handleKey;
}
