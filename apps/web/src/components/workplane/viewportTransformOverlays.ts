"use client";

import { type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import * as THREE from "three";
import { spreadAlignHandles } from "@/lib/alignHandleSpread";
import { type AlignOverlayState, type MirrorOverlayState } from "@/components/workplane/ActionOverlays";
import { type ResolvedAppTheme } from "@/lib/appTheme";
import { t } from "@/lib/i18n";
import { horizontalPlacementWorkplane, type PlacementWorkplane } from "@/lib/placementWorkplane";
import { liftGeometryForFrame, type SelectionFrame } from "@/lib/liftGeometry";
import { liftHandleScreenPoint } from "@/components/workplane/transformOverlayTypes";
import { dimensionMarkNeedsScreenLayout, dimensionMarkScreenPush, isPointInsideTransformBounds, screenSpaceDimensionMark, rotateHandleArrow, rotationPlaneDirectionSign, transformBoundsIntersectClipVolume, transformOverlayScreenPoint, type DimensionMark, type RotationAxis, type RotationPlaneView, type TransformOverlayState } from "@/components/workplane/TransformOverlay";
import { cuboidCorners, pointAlongAxes } from "@/lib/alignFrame";
import type { AlignAxis, AlignHandleStatus, AlignTarget, MeasurementAccuracy, WorkplaneShape } from "@/types/layerling";
import { outwardFaceNormal } from "@/lib/layFlat";
import { JOINED_FACE_REACH, nearestFaceTriangle, planarFaceTriangles } from "@/lib/rotationPivot";
import { roundFaceTriangles } from "@/lib/roundFaceAxis";
import { isReferenceImage, referenceImageFacingAxis } from "@/lib/referenceImage";
import { aimPickRay, firstShapeHit, RENDER_LAYER_SHAPES } from "@/components/workplane/viewportPicking";
import { type ThreeState, type RotationHandleSide, type RotationHandleSides, syncTransformGuideWorldLines, formatMeasure, findShapeObject, disposeChildren } from "@/components/workplane/ViewportOverlays";
import { MIN_SHAPE_SIZE, RENDER_LAYER_PREVIEWS, clamp, selectionFrameForShapes, shapeResourceId } from "./viewportShapeObjects";

/** World-space offset from the height handle to the lift handle, as a fraction of selection height. */
export const LIFT_HANDLE_HEIGHT_OFFSET_FRACTION = 0.30;
/** The lift arrow stands this far over a tall body at most, so it does not fly away from it. */
export const LIFT_HANDLE_MAX_OFFSET = 12;
/** How far the line of alignment handles stands beside the selection, in mm. It used to grow with the
 *  selection (16 % of its largest side), which put it 15 mm and more away from a larger body; it stays
 *  close now, as in Tinkercad. Handles that land on one spot are still pushed apart on the screen. */
export const ALIGN_HANDLE_OFFSET = 3;

/** How far the lift arrow stands over the face it belongs to; the overlay and the drag plane both use this. */
/**
 * The marks a lone selection shows without a handle hovered, by the handles they belong to: width, depth (not for a
 * round footprint) and height, and the height above the workplane when the body does not stand on it, as Tinkercad
 * shows it (#979); on the workplane that would only be a 0.
 */
export function alwaysVisibleDimensionKeysFor(circular: boolean, elevation: number, keys: { width: string; depth: string; height: string; lift: string }) {
  return [
    ...(circular ? [keys.width, keys.height] : [keys.width, keys.depth, keys.height]),
    ...(Math.abs(elevation) > 0.005 ? [keys.lift] : []),
  ];
}

export function liftHandleOffset(liftHeight: number) {
  return Math.max(2, Math.min(liftHeight * LIFT_HANDLE_HEIGHT_OFFSET_FRACTION, LIFT_HANDLE_MAX_OFFSET));
}

export function screenAngle(clientX: number, clientY: number, center: { x: number; y: number }) {
  return Math.atan2(clientY - center.y, clientX - center.x);
}

export function framePoint(frame: SelectionFrame, x: number, y: number, z: number) {
  return frame.center
    .clone()
    .add(frame.xAxis.clone().multiplyScalar(x))
    .add(frame.yAxis.clone().multiplyScalar(y))
    .add(frame.zAxis.clone().multiplyScalar(z));
}

export function frameLocalPoint(frame: SelectionFrame, point: THREE.Vector3) {
  const offset = point.clone().sub(frame.center);
  return new THREE.Vector3(offset.dot(frame.xAxis), offset.dot(frame.yAxis), offset.dot(frame.zAxis));
}

export function selectionFrameCorners(frame: SelectionFrame) {
  const corners: THREE.Vector3[] = [];
  [-1, 1].forEach((xSign) => {
    [-1, 1].forEach((ySign) => {
      [-1, 1].forEach((zSign) => {
        corners.push(framePoint(frame, (xSign * frame.width) / 2, (ySign * frame.height) / 2, (zSign * frame.depth) / 2));
      });
    });
  });
  return corners;
}

export function workplaneYForFrame(frame: SelectionFrame, workplane: PlacementWorkplane) {
  const origin = new THREE.Vector3(workplane.origin.x, workplane.origin.y, workplane.origin.z);
  return origin.sub(frame.center).dot(frame.yAxis);
}

export function workplaneFootprintY(frame: SelectionFrame, workplane: PlacementWorkplane) {
  return clamp(workplaneYForFrame(frame, workplane), frame.min.y, frame.max.y);
}

export const ROTATION_HANDLE_SIDE_HYSTERESIS = 0.22;
export const ROTATION_HANDLE_DOMINANCE_HYSTERESIS = 0.18;
export function signedRotationSide(value: number, previous: RotationHandleSide | undefined, positiveSide: RotationHandleSide, negativeSide: RotationHandleSide) {
  if (previous === positiveSide && value > -ROTATION_HANDLE_SIDE_HYSTERESIS) {
    return previous;
  }
  if (previous === negativeSide && value < ROTATION_HANDLE_SIDE_HYSTERESIS) {
    return previous;
  }
  return value >= 0 ? positiveSide : negativeSide;
}

export function rotationSideScore(side: RotationHandleSide, viewX: number, viewZ: number) {
  if (side === "right") {
    return viewX;
  }
  if (side === "left") {
    return -viewX;
  }
  if (side === "near") {
    return viewZ;
  }
  return -viewZ;
}

export function dominantRotationSide(viewX: number, viewZ: number, previous: RotationHandleSide | undefined) {
  const sides: RotationHandleSide[] = ["near", "right", "far", "left"];
  const best = sides.reduce(
    (current, side) => {
      const score = rotationSideScore(side, viewX, viewZ);
      return score > current.score ? { side, score } : current;
    },
    { side: "near" as RotationHandleSide, score: Number.NEGATIVE_INFINITY },
  );

  if (previous && rotationSideScore(previous, viewX, viewZ) >= best.score - ROTATION_HANDLE_DOMINANCE_HYSTERESIS) {
    return previous;
  }
  return best.side;
}

export function rotationHandleSidesForCamera(
  state: ThreeState,
  center: THREE.Vector3,
  xAxis = new THREE.Vector3(1, 0, 0),
  zAxis = new THREE.Vector3(0, 0, 1),
) {
  const view = state.camera.position.clone().sub(center);
  const viewXRaw = view.dot(xAxis);
  const viewZRaw = view.dot(zAxis);
  const length = Math.hypot(viewXRaw, viewZRaw);
  if (length < 0.0001) {
    return state.rotationHandleSides ?? { x: "right", y: "near", z: "near" };
  }

  const viewX = viewXRaw / length;
  const viewZ = viewZRaw / length;
  const previous = state.rotationHandleSides ?? undefined;
  const next: RotationHandleSides = {
    // Keep the two upper rotation handles on the faces opposite the camera.
    x: signedRotationSide(viewX, previous?.x, "left", "right"),
    y: dominantRotationSide(viewX, viewZ, previous?.y),
    z: signedRotationSide(viewZ, previous?.z, "far", "near"),
  };
  state.rotationHandleSides = next;
  return next;
}

export function makeDimensionMark(
  key: string,
  handleKey: string,
  axis: DimensionMark["axis"],
  label: string,
  fromWorld: THREE.Vector3,
  toWorld: THREE.Vector3,
  outwardWorld: THREE.Vector3,
  project: (point: THREE.Vector3) => { x: number; y: number; visible?: boolean },
): DimensionMark {
  const from = project(fromWorld);
  const to = project(toWorld);
  const outwardAxis = outwardWorld.clone();
  outwardAxis.normalize();

  const railOffset = 5.8;
  const extensionOverrun = 1.4;
  const labelOffset = 3.2;
  const midpointWorld = fromWorld.clone().lerp(toWorld, 0.5);
  const edgeMidpoint = project(midpointWorld);
  let railFrom: { x: number; y: number; visible?: boolean } = project(fromWorld.clone().add(outwardAxis.clone().multiplyScalar(railOffset)));
  let railTo: { x: number; y: number; visible?: boolean } = project(toWorld.clone().add(outwardAxis.clone().multiplyScalar(railOffset)));
  let extensionFrom: { x: number; y: number; visible?: boolean } = project(fromWorld.clone().add(outwardAxis.clone().multiplyScalar(railOffset + extensionOverrun)));
  let extensionTo: { x: number; y: number; visible?: boolean } = project(toWorld.clone().add(outwardAxis.clone().multiplyScalar(railOffset + extensionOverrun)));
  let labelPoint: { x: number; y: number; visible?: boolean } = project(midpointWorld.clone().add(outwardAxis.clone().multiplyScalar(railOffset + labelOffset)));
  // Zoomed far in on a tiny part, the same world offset lands the mark off screen
  // or behind the camera, where it flips back across the body (#989). Then take
  // only the outward direction from a tiny world step and place the mark in pixels.
  const offsetPointsVisible = [railFrom, railTo, extensionFrom, extensionTo, labelPoint].every((point) => point.visible !== false);
  if (dimensionMarkNeedsScreenLayout(edgeMidpoint, labelPoint, offsetPointsVisible)) {
    const step = Math.max(fromWorld.distanceTo(toWorld), 0.01) * 0.01;
    const probe = project(midpointWorld.clone().add(outwardAxis.clone().multiplyScalar(step)));
    const length = Math.hypot(probe.x - edgeMidpoint.x, probe.y - edgeMidpoint.y);
    if (Number.isFinite(length) && length > 1e-6) {
      const direction = { x: (probe.x - edgeMidpoint.x) / length, y: (probe.y - edgeMidpoint.y) / length };
      ({ railFrom, railTo, extensionFrom, extensionTo, labelPoint } = screenSpaceDimensionMark(
        from, to, edgeMidpoint, direction, { rail: railOffset, overrun: extensionOverrun, label: labelOffset },
      ));
    }
  }
  // The world offset above shrinks to a few pixels when zoomed out, which puts
  // the label under a rotate handle. Lift the whole mark together so the label
  // keeps its distance without tearing away from its own rail.
  const push = dimensionMarkScreenPush(edgeMidpoint, labelPoint);

  return {
    key,
    handleKey,
    axis,
    label,
    x1: railFrom.x + push.x,
    y1: railFrom.y + push.y,
    x2: railTo.x + push.x,
    y2: railTo.y + push.y,
    e1x1: from.x,
    e1y1: from.y,
    e1x2: extensionFrom.x + push.x,
    e1y2: extensionFrom.y + push.y,
    e2x1: to.x,
    e2y1: to.y,
    e2x2: extensionTo.x + push.x,
    e2y2: extensionTo.y + push.y,
    labelX: labelPoint.x + push.x,
    labelY: labelPoint.y + push.y,
  };
}

export function updateTransformOverlayIfChanged(
  overlayRef: MutableRefObject<TransformOverlayState | null>,
  setOverlay: Dispatch<SetStateAction<TransformOverlayState | null>>,
  next: TransformOverlayState,
) {
  if (overlayRef.current && JSON.stringify(overlayRef.current) === JSON.stringify(next)) {
    return;
  }
  overlayRef.current = next;
  setOverlay(next);
}

export function updateTransformOverlayDom(state: ThreeState, next: TransformOverlayState) {
  const root = state.renderer.domElement.closest(".workplane-plane");
  if (!root) {
    return;
  }
  const guideLines = root.querySelectorAll<SVGLineElement>(".transform-guides > line");
  next.guides.forEach((guide, index) => {
    const line = guideLines[index];
    if (!line) {
      return;
    }
    line.setAttribute("x1", String(guide.x1));
    line.setAttribute("y1", String(guide.y1));
    line.setAttribute("x2", String(guide.x2));
    line.setAttribute("y2", String(guide.y2));
  });
  const handles = root.querySelectorAll<HTMLElement>(".transform-overlay .transform-handle");
  next.handles.forEach((handle, index) => {
    const element = handles[index];
    if (!element) {
      return;
    }
    element.style.setProperty("--overlay-x", `${handle.x}px`);
    element.style.setProperty("--overlay-y", `${handle.y}px`);
    element.style.setProperty("--transform-handle-angle", `${handle.angle ?? 0}deg`);
  });
  const pivotMarker = root.querySelector<HTMLElement>(".transform-overlay .rotation-pivot-marker");
  if (pivotMarker && next.pivotMarker) {
    pivotMarker.style.setProperty("--overlay-x", `${next.pivotMarker.x}px`);
    pivotMarker.style.setProperty("--overlay-y", `${next.pivotMarker.y}px`);
  }
  const rotateHandles = root.querySelectorAll<HTMLElement>(".transform-overlay .rotate-handle");
  next.rotateHandles.forEach((handle, index) => {
    const element = rotateHandles[index];
    if (!element) {
      return;
    }
    element.style.setProperty("--overlay-x", `${handle.x}px`);
    element.style.setProperty("--overlay-y", `${handle.y}px`);
    element.querySelector(".rotate-arrow-arc")?.setAttribute("d", handle.arc);
    element.querySelector(".rotate-arrow-heads")?.setAttribute("d", handle.heads);
  });
}

export function syncTransformOverlay(
  state: ThreeState,
  shapes: WorkplaneShape[],
  selectedIds: string[],
  overlayRef: MutableRefObject<TransformOverlayState | null>,
  setOverlay: Dispatch<SetStateAction<TransformOverlayState | null>>,
  accuracy: MeasurementAccuracy,
  keepVisibleDuringInteraction = false,
  updateDomImmediately = false,
  workplane: PlacementWorkplane = horizontalPlacementWorkplane(),
  theme: ResolvedAppTheme = "light",
  dimensionsAlwaysVisible = true,
) {
  if (selectedIds.length < 1) {
    syncTransformGuideWorldLines(state, null, theme);
    if (overlayRef.current) {
      overlayRef.current = null;
      setOverlay(null);
    }
    return;
  }

  const activeWorkplane = workplane;
  const frame = selectionFrameForShapes(shapes, selectedIds, activeWorkplane);
  if (!frame) {
    syncTransformGuideWorldLines(state, null, theme);
    if (overlayRef.current) {
      overlayRef.current = null;
      setOverlay(null);
    }
    return;
  }

  const rect = state.renderer.domElement.getBoundingClientRect();
  // Future edits: do not remove this. The transform overlay is projected with
  // Vector3.project(), outside Three's renderer. With OrbitControls damping, the
  // camera matrix can otherwise be one frame stale, making handles/lines trail.
  state.camera.updateMatrixWorld();
  const corners = selectionFrameCorners(frame);
  const viewProjection = new THREE.Matrix4().multiplyMatrices(state.camera.projectionMatrix, state.camera.matrixWorldInverse);
  const selectionIntersectsView = transformBoundsIntersectClipVolume(corners.map((corner) => {
    const clip = new THREE.Vector4(corner.x, corner.y, corner.z, 1).applyMatrix4(viewProjection);
    return { x: clip.x, y: clip.y, z: clip.z, w: clip.w };
  }));
  if (!selectionIntersectsView && !keepVisibleDuringInteraction) {
    syncTransformGuideWorldLines(state, null, theme);
    if (overlayRef.current) {
      overlayRef.current = null;
      setOverlay(null);
    }
    return;
  }
  const cameraDistance = state.camera.position.distanceTo(frame.center);
  const cameraInSelectionFrame = frameLocalPoint(frame, state.camera.position);
  // The flat view's camera stands anywhere on its line of sight and sees behind itself too.
  const flatView = state.camera instanceof THREE.OrthographicCamera;
  const cameraInsideSelection = !flatView && isPointInsideTransformBounds(cameraInSelectionFrame, frame.min, frame.max);
  const project = (point: THREE.Vector3) => {
    const cameraSpace = point.clone().applyMatrix4(state.camera.matrixWorldInverse);
    const projected = cameraSpace.clone().applyMatrix4(state.camera.projectionMatrix);
    return transformOverlayScreenPoint(projected, flatView ? -1 : cameraSpace.z, rect.width, rect.height);
  };

  const xFootAxis = frame.xAxis.clone().normalize();
  const yFootAxis = frame.yAxis.clone().normalize();
  const zFootAxis = frame.zAxis.clone().normalize();
  const showLowerHandles = state.camera.position.clone().sub(frame.center).dot(yFootAxis) < 0;
  const footprintY = workplaneFootprintY(frame, activeWorkplane);
  const oppositeY = Math.abs(footprintY - frame.min.y) <= Math.abs(footprintY - frame.max.y)
    ? frame.max.y
    : frame.min.y;
  const footprintWorld = {
    nearLeft: framePoint(frame, frame.min.x, footprintY, frame.max.z),
    nearRight: framePoint(frame, frame.max.x, footprintY, frame.max.z),
    farRight: framePoint(frame, frame.max.x, footprintY, frame.min.z),
    farLeft: framePoint(frame, frame.min.x, footprintY, frame.min.z),
    near: framePoint(frame, 0, footprintY, frame.max.z),
    right: framePoint(frame, frame.max.x, footprintY, 0),
    far: framePoint(frame, 0, footprintY, frame.min.z),
    left: framePoint(frame, frame.min.x, footprintY, 0),
  };
  const bottomCenterWorld = framePoint(frame, 0, footprintY, 0);
  const topCenterWorld = framePoint(frame, 0, oppositeY, 0);
  syncTransformGuideWorldLines(state, [
    [topCenterWorld, bottomCenterWorld],
    [footprintWorld.nearLeft, footprintWorld.nearRight],
    [footprintWorld.nearRight, footprintWorld.farRight],
    [footprintWorld.farRight, footprintWorld.farLeft],
    [footprintWorld.farLeft, footprintWorld.nearLeft],
  ], theme);
  const lowerCenterWorld = framePoint(frame, 0, frame.min.y, 0);
  const upperCenterWorld = framePoint(frame, 0, frame.max.y, 0);
  const lift = liftGeometryForFrame(frame, activeWorkplane);
  const showLowerLiftHandle = state.camera.position.clone().sub(frame.center).dot(lift.axis) < 0;
  const liftOffset = liftHandleOffset(lift.height);
  const liftBaseWorld = lift.pointAt(showLowerLiftHandle ? lift.low : lift.high);
  const liftHandle = liftBaseWorld
    .clone()
    .addScaledVector(lift.axis, showLowerLiftHandle ? -liftOffset : liftOffset);
  const bottom = {
    nearLeft: project(footprintWorld.nearLeft),
    nearRight: project(footprintWorld.nearRight),
    farRight: project(footprintWorld.farRight),
    farLeft: project(footprintWorld.farLeft),
  };
  const mid = {
    near: project(footprintWorld.near),
    right: project(footprintWorld.right),
    far: project(footprintWorld.far),
    left: project(footprintWorld.left),
  };
  const heightPoint = project(showLowerHandles ? lowerCenterWorld : upperCenterWorld);
  const liftBasePoint = project(liftBaseWorld);
  // A thin body puts the arrow a few pixels from the height handle; it keeps its distance on the screen.
  const liftPoint = liftHandleScreenPoint(liftBasePoint, project(liftHandle), showLowerLiftHandle);
  const liftTargetAngle = THREE.MathUtils.radToDeg(
    Math.atan2(liftPoint.y - liftBasePoint.y, liftPoint.x - liftBasePoint.x),
  );
  const liftHandleAngle = liftTargetAngle - (showLowerLiftHandle ? 90 : -90);
  const centerPoint = project(frame.center);
  const widthLabel = formatMeasure(frame.width, accuracy);
  const depthLabel = formatMeasure(frame.depth, accuracy);
  const heightLabel = formatMeasure(frame.height, accuracy);
  const nearOut = zFootAxis;
  const farOut = zFootAxis.clone().multiplyScalar(-1);
  const rightOut = xFootAxis;
  const leftOut = xFootAxis.clone().multiplyScalar(-1);
  const heightHandleKey = showLowerHandles ? "bottom-height" : "top-height";
  const liftHandleKey = showLowerLiftHandle ? "lower-shape" : "lift-shape";
  const liftAnchor = lift.pointAt(0);
  const liftTarget = lift.pointAt(lift.elevation);
  const liftLabel = formatMeasure(lift.elevation, accuracy);
  const liftCameraView = state.camera.position.clone().sub(frame.center);
  const liftOutward = new THREE.Vector3().crossVectors(lift.axis, liftCameraView).normalize();
  const liftDimensionOutward = liftOutward.lengthSq() > 0.5 ? liftOutward : rightOut;
  const makeFootprintDimensionMark = (handleKey: string, axis: "width" | "depth") => {
    if (axis === "width") {
      const useFarSide = handleKey.includes("far") || handleKey.includes("left");
      return makeDimensionMark(
        `${handleKey}-width`,
        handleKey,
        "width",
        widthLabel,
        useFarSide ? footprintWorld.farLeft : footprintWorld.nearLeft,
        useFarSide ? footprintWorld.farRight : footprintWorld.nearRight,
        useFarSide ? farOut : nearOut,
        project,
      );
    }
    const useLeftSide = handleKey.includes("left") || handleKey.includes("far");
    return makeDimensionMark(
      `${handleKey}-depth`,
      handleKey,
      "depth",
      depthLabel,
      useLeftSide ? footprintWorld.nearLeft : footprintWorld.nearRight,
      useLeftSide ? footprintWorld.farLeft : footprintWorld.farRight,
      useLeftSide ? leftOut : rightOut,
      project,
    );
  };
  const footprintHandleKeys = ["near-left", "near-right", "far-right", "far-left", "near-mid", "right-mid", "far-mid", "left-mid"];
  // A cylinder only has one horizontal measurement - its diameter - so every
  // handle shows that single mark instead of a separate width and depth line
  // (which used to appear together at a corner handle, and independently
  // editable at all, letting the two drift apart).
  const isCircularFootprint = frame.singleShape?.kind === "cylinder" || frame.singleShape?.kind === "star";
  const footprintDimensionMarks = Object.fromEntries(
    footprintHandleKeys.map((handleKey) => {
      if (isCircularFootprint) {
        return [handleKey, [makeFootprintDimensionMark(handleKey, "width")]];
      }
      const axes = new Set<"width" | "depth">();
      if (handleKey.includes("left") || handleKey.includes("right")) {
        axes.add("width");
      }
      if (handleKey.includes("near") || handleKey.includes("far")) {
        axes.add("depth");
      }
      return [handleKey, Array.from(axes).map((axis) => makeFootprintDimensionMark(handleKey, axis))];
    }),
  );
  // The height runs along the vertical edge that stands furthest right on the screen, outside the
  // body, not through its middle, where its number sits on the shape (DrJones, forum).
  let heightEdge: { low: THREE.Vector3; high: THREE.Vector3; outward: THREE.Vector3; screenX: number } | null = null;
  for (const [cornerX, cornerZ] of [[frame.min.x, frame.min.z], [frame.max.x, frame.min.z], [frame.max.x, frame.max.z], [frame.min.x, frame.max.z]]) {
    const low = framePoint(frame, cornerX, frame.min.y, cornerZ);
    const high = framePoint(frame, cornerX, frame.max.y, cornerZ);
    const screenX = project(low.clone().lerp(high, 0.5)).x;
    if (heightEdge && screenX <= heightEdge.screenX) continue;
    const outward = xFootAxis.clone().multiplyScalar(Math.sign(cornerX)).addScaledVector(zFootAxis, Math.sign(cornerZ));
    heightEdge = { low, high, outward: outward.lengthSq() > 1e-9 ? outward.normalize() : rightOut, screenX };
  }
  const heightMark = makeDimensionMark("height", heightHandleKey, "height", heightLabel, heightEdge?.low ?? lowerCenterWorld, heightEdge?.high ?? upperCenterWorld, heightEdge?.outward ?? rightOut, project);
  // The height value stands at the edge, off the body (DrJones). Pulling the handle far from that edge - or zoomed
  // in so that the edge is out of view - left the value somewhere else or nowhere (#488), so it stands at the
  // handle too, above it (below, for the lower handle), and can be clicked and typed there as well.
  const heightAtHandle: DimensionMark = {
    ...heightMark,
    key: "height-at-handle",
    labelOnly: true,
    labelX: heightPoint.x,
    labelY: heightPoint.y + (showLowerHandles ? 30 : -30),
  };
  const dimensionMarks = {
    ...footprintDimensionMarks,
    [heightHandleKey]: [heightMark, heightAtHandle],
    [liftHandleKey]: [makeDimensionMark("elevation", liftHandleKey, "elevation", liftLabel, liftAnchor, liftTarget, liftDimensionOutward, project)],
  };
  const rotationSides = rotationHandleSidesForCamera(state, frame.center, xFootAxis, zFootAxis);
  const sidePoint = (side: RotationHandleSide, y: number) => {
    if (side === "right") {
      return framePoint(frame, frame.max.x, y, 0);
    }
    if (side === "left") {
      return framePoint(frame, frame.min.x, y, 0);
    }
    if (side === "near") {
      return framePoint(frame, 0, y, frame.max.z);
    }
    return framePoint(frame, 0, y, frame.min.z);
  };
  const rotateLeftSource = project(sidePoint(rotationSides.x, frame.max.y));
  const rotateRightSource = project(sidePoint(rotationSides.z, frame.max.y));
  const rotateBottomSource = project(sidePoint(rotationSides.y, footprintY));
  // With a pivot set, each wheel slides along its face onto the axis through
  // the pivot, so the wheel shows where the selection really turns.
  const customPivot = state.rotationPivot ?? null;
  const onPivotAxis = (faceCenter: THREE.Vector3, axis: THREE.Vector3) => (
    customPivot ? customPivot.clone().addScaledVector(axis, faceCenter.clone().sub(customPivot).dot(axis)) : faceCenter
  );
  const xFaceCenter = onPivotAxis(sidePoint(rotationSides.x, 0), xFootAxis);
  const zFaceCenter = onPivotAxis(sidePoint(rotationSides.z, 0), zFootAxis);
  const yFaceCenter = onPivotAxis(bottomCenterWorld, yFootAxis);
  const pivotScreen = customPivot ? project(customPivot) : null;
  const planeRadius = 154;
  const planeWorldStep = Math.max(0.1, cameraDistance * 0.01);
  const makePlaneView = (centerWorld: THREE.Vector3, uAxis: THREE.Vector3, vAxis: THREE.Vector3, axisVector: THREE.Vector3): RotationPlaneView => {
    const directionSign = rotationPlaneDirectionSign(axisVector, uAxis, vAxis);
    const screenCenter = project(centerWorld);
    const uOffset = uAxis.clone().multiplyScalar(planeWorldStep);
    const vOffset = vAxis.clone().multiplyScalar(planeWorldStep);
    const uStart = project(centerWorld.clone().sub(uOffset));
    const uEnd = project(centerWorld.clone().add(uOffset));
    const vStart = project(centerWorld.clone().sub(vOffset));
    const vEnd = project(centerWorld.clone().add(vOffset));
    const du = { x: (uEnd.x - uStart.x) / 2, y: (uEnd.y - uStart.y) / 2 };
    const dv = { x: (vEnd.x - vStart.x) / 2, y: (vEnd.y - vStart.y) / 2 };
    const longest = Math.max(Math.hypot(du.x, du.y), Math.hypot(dv.x, dv.y));
    if (!Number.isFinite(longest) || longest < 0.000001) {
      return { x: screenCenter.x, y: screenCenter.y, a: 1, b: 0, c: 0, d: 1, directionSign };
    }
    const scale = planeRadius / longest / 100;
    return {
      x: screenCenter.x,
      y: screenCenter.y,
      a: du.x * scale,
      b: du.y * scale,
      c: dv.x * scale,
      d: dv.y * scale,
      directionSign,
    };
  };
  const makeWheel = (centerWorld: THREE.Vector3) => {
    const screenCenter = project(centerWorld);
    return { x: screenCenter.x, y: screenCenter.y, radius: planeRadius };
  };
  const makeWorldPoint = (point: THREE.Vector3) => ({ x: point.x, y: point.y, z: point.z });
  const rotationWheels: Record<RotationAxis, { x: number; y: number; radius: number }> = {
    x: makeWheel(xFaceCenter),
    y: makeWheel(yFaceCenter),
    z: makeWheel(zFaceCenter),
  };
  const rotationPlaneCenters: Record<RotationAxis, { x: number; y: number; z: number }> = {
    x: makeWorldPoint(xFaceCenter),
    y: makeWorldPoint(yFaceCenter),
    z: makeWorldPoint(zFaceCenter),
  };
  const rotationPlanes: Record<RotationAxis, RotationPlaneView> = {
    x: makePlaneView(xFaceCenter, zFootAxis, yFootAxis, xFootAxis),
    y: makePlaneView(yFaceCenter, xFootAxis, zFootAxis, yFootAxis),
    z: makePlaneView(zFaceCenter, xFootAxis, yFootAxis, zFootAxis),
  };

  const handles = [
    { point: bottom.nearLeft, handle: { key: "near-left", className: "corner", kind: "scale" as const, x: bottom.nearLeft.x, y: bottom.nearLeft.y, title: t("transform.resize") } },
    { point: bottom.nearRight, handle: { key: "near-right", className: "corner", kind: "scale" as const, x: bottom.nearRight.x, y: bottom.nearRight.y, title: t("transform.resize") } },
    { point: bottom.farRight, handle: { key: "far-right", className: "corner", kind: "scale" as const, x: bottom.farRight.x, y: bottom.farRight.y, title: t("transform.resize") } },
    { point: bottom.farLeft, handle: { key: "far-left", className: "corner", kind: "scale" as const, x: bottom.farLeft.x, y: bottom.farLeft.y, title: t("transform.resize") } },
    { point: mid.near, handle: { key: "near-mid", className: "edge dark", kind: "scale" as const, x: mid.near.x, y: mid.near.y, title: t("transform.resize") } },
    { point: mid.right, handle: { key: "right-mid", className: "edge dark", kind: "scale" as const, x: mid.right.x, y: mid.right.y, title: t("transform.resize") } },
    { point: mid.far, handle: { key: "far-mid", className: "edge dark", kind: "scale" as const, x: mid.far.x, y: mid.far.y, title: t("transform.resize") } },
    { point: mid.left, handle: { key: "left-mid", className: "edge dark", kind: "scale" as const, x: mid.left.x, y: mid.left.y, title: t("transform.resize") } },
    { point: heightPoint, handle: { key: heightHandleKey, className: "height-top", kind: "height" as const, x: heightPoint.x, y: heightPoint.y, title: t("transform.height") } },
    { point: liftPoint, handle: { key: liftHandleKey, className: showLowerLiftHandle ? "height-lift lower" : "height-lift", kind: "lift" as const, x: liftPoint.x, y: liftPoint.y, title: t("transform.lift"), angle: liftHandleAngle } },
  ].filter(({ point }) => point.visible).map(({ handle }) => handle);
  const rotationChromeVisible = !cameraInsideSelection && centerPoint.visible;
  // Each arrow is a piece of the circle its axis turns on, built in space so it sits in perspective on the selection.
  const rotateArrowHandle = (
    key: string,
    className: string,
    axisVector: THREE.Vector3,
    faceCenter: THREE.Vector3,
    sideWorld: THREE.Vector3,
    fallbackRadial: THREE.Vector3,
  ) => {
    const offset = sideWorld.clone().sub(faceCenter);
    const radial = offset.clone().addScaledVector(axisVector, -offset.dot(axisVector));
    const radialLength = radial.length();
    const direction = radialLength > 1e-6 ? radial.clone().divideScalar(radialLength) : fallbackRadial.clone();
    const base = faceCenter.clone().addScaledVector(direction, radialLength);
    const tangent = new THREE.Vector3().crossVectors(axisVector, direction);
    const step = Math.max(0.1, cameraDistance * 0.01);
    const origin = project(base);
    const screenPerWorld = Math.max(
      0.0001,
      ...[direction, tangent, axisVector].map((vector) => {
        const moved = project(base.clone().addScaledVector(vector, step));
        return Math.hypot(moved.x - origin.x, moved.y - origin.y) / step;
      }),
    );
    // Far enough out to clear the dimension labels, and big enough to hit without touching one (#898).
    const mid = base.clone().addScaledVector(direction, 38 / screenPerWorld);
    const arrow = rotateHandleArrow(
      (point) => {
        const screen = project(new THREE.Vector3(point.x, point.y, point.z));
        return { x: screen.x, y: screen.y };
      },
      mid,
      direction,
      axisVector,
      (36 / screenPerWorld) * 0.6,
    );
    return { key, className, x: arrow.x, y: arrow.y, arc: arrow.arc, heads: arrow.heads };
  };
  const rotateHandles = rotationChromeVisible ? [
    rotateLeftSource.visible ? rotateArrowHandle("rotate-left", "screen-left axis-x", xFootAxis, xFaceCenter, sidePoint(rotationSides.x, frame.max.y), yFootAxis) : null,
    rotateRightSource.visible ? rotateArrowHandle("rotate-right", "screen-right axis-y", zFootAxis, zFaceCenter, sidePoint(rotationSides.z, frame.max.y), yFootAxis) : null,
    rotateBottomSource.visible ? rotateArrowHandle("rotate-bottom", "screen-bottom axis-z", yFootAxis, yFaceCenter, sidePoint(rotationSides.y, footprintY), xFootAxis) : null,
  ].filter((handle): handle is NonNullable<typeof handle> => Boolean(handle)) : [];

  // Which mid-edge handle sits on the side of the shape currently facing the
  // camera - same sign convention as showLowerHandles above, so always-visible
  // dimension labels for a lone selection land on a readable, visible face.
  const cameraView = state.camera.position.clone().sub(frame.center);
  const widthMidHandleKey = cameraView.dot(xFootAxis) >= 0 ? "right-mid" : "left-mid";
  const depthMidHandleKey = cameraView.dot(zFootAxis) >= 0 ? "near-mid" : "far-mid";
  const alwaysVisibleDimensionKeys = dimensionsAlwaysVisible && frame.singleShape
    ? alwaysVisibleDimensionKeysFor(isCircularFootprint, lift.elevation, { width: widthMidHandleKey, depth: depthMidHandleKey, height: heightHandleKey, lift: liftHandleKey })
    : [];

  const next = {
    id: frame.ids.join("|"),
    width: rect.width,
    height: rect.height,
    guides: [],
    handles,
    rotateHandles,
    dimensions: dimensionMarks,
    alwaysVisibleDimensionKeys,
    rotationWheel: rotationWheels.y,
    rotationWheels,
    rotationPlaneCenters,
    rotationPlanes,
    pivotMarker: pivotScreen?.visible ? { x: pivotScreen.x, y: pivotScreen.y } : null,
  };

  if (updateDomImmediately) {
    updateTransformOverlayDom(state, next);
  }
  updateTransformOverlayIfChanged(overlayRef, setOverlay, next);
}

// The exact box of a drawn surface, kept until it moves or changes: the align overlay asks for
// it on every frame, and walking every point of a large mesh each time would stall the view.
export const drawnSurfaceBoundsCache = new WeakMap<THREE.Mesh, { key: string; box: THREE.Box3 }>();

export function drawnSurfaceBounds(mesh: THREE.Mesh) {
  const key = `${mesh.geometry.uuid}:${mesh.matrixWorld.elements.join(",")}`;
  const cached = drawnSurfaceBoundsCache.get(mesh);
  if (cached?.key === key) return cached.box;
  const box = new THREE.Box3().expandByObject(mesh, true);
  drawnSurfaceBoundsCache.set(mesh, { key, box });
  return box;
}

/** The box round the surfaces drawn for these shapes, in the world; null when none is drawn. */
export function drawnShapesBounds(state: ThreeState, ids: string[]): THREE.Box3 | null {
  const bounds = new THREE.Box3();
  ids.forEach((id) => {
    const object = findShapeObject(state, id);
    if (!object) return;
    object.updateWorldMatrix(true, true);
    object.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData.shapeSurface && child.visible) bounds.union(drawnSurfaceBounds(child));
    });
  });
  return bounds.isEmpty() ? null : bounds;
}

export function syncAlignOverlay(
  state: ThreeState,
  shapes: WorkplaneShape[],
  selectedIds: string[],
  alignMode: boolean,
  alignAnchorId: string | null,
  statuses: AlignHandleStatus[],
  overlayRef: MutableRefObject<AlignOverlayState | null>,
  setOverlay: Dispatch<SetStateAction<AlignOverlayState | null>>,
) {
  const clear = () => {
    if (overlayRef.current) {
      overlayRef.current = null;
      setOverlay(null);
    }
  };

  if (!alignMode || selectedIds.length < 2) {
    clear();
    return;
  }

  // With a workplane set on a face the handles stand on its axes, on the box the editor measured (#232).
  const info = state.alignFrameInfo ?? null;
  const selectedFrame = info ? null : selectionFrameForShapes(shapes, selectedIds);
  const anchorFrame = !info && alignAnchorId && selectedIds.includes(alignAnchorId) ? selectionFrameForShapes(shapes, [alignAnchorId]) : null;
  const frame = anchorFrame ?? selectedFrame;
  if (!info && !frame) {
    clear();
    return;
  }

  const rect = state.renderer.domElement.getBoundingClientRect();
  state.camera.updateMatrixWorld();
  const corners = info
    ? cuboidCorners(info.bounds, info.axes).map((corner) => new THREE.Vector3(corner.x, corner.y, corner.z))
    : selectionFrameCorners(frame!);
  // The flat view draws what is behind its camera too: nothing there is out of sight. Close up, in the
  // perspective view, one corner of the selection can come to lie at or behind the camera while the
  // handles are still in front of it; one such corner used to take all nine handles away (#486), so each
  // handle is judged by its own place.
  const nearPlane = state.camera instanceof THREE.PerspectiveCamera ? state.camera.near : -Infinity;
  const project = (point: THREE.Vector3) => {
    const cameraSpace = point.clone().applyMatrix4(state.camera.matrixWorldInverse);
    if (cameraSpace.z > -nearPlane * 1.5) return null;
    const projected = point.clone().project(state.camera);
    if (!Number.isFinite(projected.x) || !Number.isFinite(projected.y)) return null;
    return {
      x: ((projected.x + 1) / 2) * rect.width,
      y: ((1 - projected.y) / 2) * rect.height,
    };
  };
  // The handles stand where the parts will line up: at the box round what is drawn, as the
  // alignment measures it. The corners of a turned part's own box stick out past a cylinder or
  // a star, so handles placed there promised an edge the parts then did not move to (#187).
  // While a handle shows its preview the parts are drawn where they would go; the handles must not
  // follow them there, or they jump from under the pointer, the preview ends, they jump back, and
  // so on (#235). So they keep the box the parts had before the preview.
  const boundsIds = anchorFrame && alignAnchorId ? [alignAnchorId] : selectedIds;
  const boundsKey = boundsIds.join(",");
  const cached = state.alignBoundsCache;
  const drawn = info ? null : state.alignPreviewActive && cached && cached.key === boundsKey && cached.shapes === shapes
    ? cached.bounds
    : drawnShapesBounds(state, boundsIds);
  if (!info && !state.alignPreviewActive) state.alignBoundsCache = { key: boundsKey, shapes, bounds: drawn };
  // The min and max of the box along each axis: the world's, or the workplane's.
  const worldMinY = info ? info.bounds.minY : drawn ? drawn.min.y : Math.min(...corners.map((corner) => corner.y));
  const worldMaxY = info ? info.bounds.maxY : drawn ? drawn.max.y : Math.max(...corners.map((corner) => corner.y));
  const worldMinX = info ? info.bounds.minX : drawn ? drawn.min.x : Math.min(...corners.map((corner) => corner.x));
  const worldMaxX = info ? info.bounds.maxX : drawn ? drawn.max.x : Math.max(...corners.map((corner) => corner.x));
  const worldMinZ = info ? info.bounds.minZ : drawn ? drawn.min.z : Math.min(...corners.map((corner) => corner.z));
  const worldMaxZ = info ? info.bounds.maxZ : drawn ? drawn.max.z : Math.max(...corners.map((corner) => corner.z));
  // A point at (x, y, z) measured along the axes in use.
  const at = (x: number, y: number, z: number) => {
    if (!info) return new THREE.Vector3(x, y, z);
    const point = pointAlongAxes(info.axes, x, y, z);
    return new THREE.Vector3(point.x, point.y, point.z);
  };
  const worldCenterX = (worldMinX + worldMaxX) / 2;
  const worldCenterY = (worldMinY + worldMaxY) / 2;
  const worldCenterZ = (worldMinZ + worldMaxZ) / 2;
  const offset = ALIGN_HANDLE_OFFSET;
  const statusByKey = new Map(statuses.map((status) => [`${status.axis}:${status.target}`, status]));

  // The three handles of an axis, minimum, middle and maximum, stand on one line. Where they land close
  // together on the screen they are pushed apart (alignHandleSpread.ts), so each can still be picked.
  const groups: Array<{ axis: AlignAxis; points: [THREE.Vector3, THREE.Vector3, THREE.Vector3]; along: THREE.Vector3 }> = [
    {
      axis: "x",
      points: [at(worldMinX, worldMinY, worldMaxZ + offset), at(worldCenterX, worldMinY, worldMaxZ + offset), at(worldMaxX, worldMinY, worldMaxZ + offset)],
      along: at(1, 0, 0),
    },
    {
      axis: "z",
      points: [at(worldMaxX + offset, worldMinY, worldMinZ), at(worldMaxX + offset, worldMinY, worldCenterZ), at(worldMaxX + offset, worldMinY, worldMaxZ)],
      along: at(0, 0, 1),
    },
    {
      axis: "y",
      points: [at(worldMinX - offset, worldMinY, worldMaxZ + offset), at(worldMinX - offset, worldCenterY, worldMaxZ + offset), at(worldMinX - offset, worldMaxY, worldMaxZ + offset)],
      along: at(0, 1, 0),
    },
  ];
  const targets: AlignTarget[] = ["min", "center", "max"];
  const handles: AlignOverlayState["handles"] = [];
  const guides: AlignOverlayState["guides"] = [];
  groups.forEach(({ axis, points, along }) => {
    const screen = points.map(project);
    if (screen.some((point) => !point)) return;
    const [lo, mid, hi] = screen as Array<{ x: number; y: number }>;
    // Which way the axis runs on the screen, from a point a unit further along it.
    const ahead = project(points[1].clone().add(along));
    const direction = ahead ? { x: ahead.x - mid.x, y: ahead.y - mid.y } : { x: 1, y: 0 };
    const spread = spreadAlignHandles(lo, mid, hi, direction);
    guides.push({ key: axis, x1: spread[0].x, y1: spread[0].y, x2: spread[2].x, y2: spread[2].y });
    targets.forEach((target, index) => {
      const status = statusByKey.get(`${axis}:${target}`);
      if (!status) return;
      handles.push({ ...status, key: `${axis}-${target}`, x: spread[index].x, y: spread[index].y });
    });
  });
  if (handles.length === 0) {
    clear();
    return;
  }

  const next = { guides, handles };

  overlayRef.current = next;
  setOverlay(next);
}

export function syncMirrorOverlay(
  state: ThreeState,
  shapes: WorkplaneShape[],
  selectedIds: string[],
  mirrorMode: boolean,
  overlayRef: MutableRefObject<MirrorOverlayState | null>,
  setOverlay: Dispatch<SetStateAction<MirrorOverlayState | null>>,
) {
  const clear = () => {
    if (overlayRef.current) {
      overlayRef.current = null;
      setOverlay(null);
    }
  };

  if (!mirrorMode || selectedIds.length < 1) {
    clear();
    return;
  }

  const frame = selectionFrameForShapes(shapes, selectedIds);
  if (!frame) {
    clear();
    return;
  }

  const rect = state.renderer.domElement.getBoundingClientRect();
  state.camera.updateMatrixWorld();
  const corners = selectionFrameCorners(frame);
  const projectedCorners = corners.map((corner) => {
    const cameraSpace = corner.clone().applyMatrix4(state.camera.matrixWorldInverse);
    const projected = corner.clone().project(state.camera);
    return { cameraSpace, projected };
  });
  // The flat view draws what is behind its camera too: nothing there is out of sight.
  const nearPlane = state.camera instanceof THREE.PerspectiveCamera ? state.camera.near : -Infinity;
  if (projectedCorners.some(({ cameraSpace, projected }) => cameraSpace.z > -nearPlane * 1.5 || !Number.isFinite(projected.x) || !Number.isFinite(projected.y))) {
    clear();
    return;
  }

  const project = (point: THREE.Vector3) => {
    const projected = point.clone().project(state.camera);
    return {
      x: ((projected.x + 1) / 2) * rect.width,
      y: ((1 - projected.y) / 2) * rect.height,
    };
  };
  const screenAngle = (from: THREE.Vector3, to: THREE.Vector3) => {
    const a = project(from);
    const b = project(to);
    return THREE.MathUtils.radToDeg(Math.atan2(b.y - a.y, b.x - a.x));
  };
  const worldMinY = Math.min(...corners.map((corner) => corner.y));
  const worldMaxY = Math.max(...corners.map((corner) => corner.y));
  const worldMinX = Math.min(...corners.map((corner) => corner.x));
  const worldMaxX = Math.max(...corners.map((corner) => corner.x));
  const worldMinZ = Math.min(...corners.map((corner) => corner.z));
  const worldMaxZ = Math.max(...corners.map((corner) => corner.z));
  const worldCenterX = (worldMinX + worldMaxX) / 2;
  const worldCenterY = (worldMinY + worldMaxY) / 2;
  const worldCenterZ = (worldMinZ + worldMaxZ) / 2;
  const width = Math.max(MIN_SHAPE_SIZE, worldMaxX - worldMinX);
  const height = Math.max(MIN_SHAPE_SIZE, worldMaxY - worldMinY);
  const depth = Math.max(MIN_SHAPE_SIZE, worldMaxZ - worldMinZ);
  const offset = Math.max(10, Math.max(width, height, depth) * 0.2);
  const step = Math.max(10, Math.max(width, height, depth) * 0.28);

  const xWorld = new THREE.Vector3(worldCenterX, worldMinY, worldMaxZ + offset);
  const zWorld = new THREE.Vector3(worldMaxX + offset, worldMinY, worldCenterZ);
  const yWorld = new THREE.Vector3(worldMinX - offset, worldCenterY, worldMaxZ + offset);
  const xScreen = project(xWorld);
  const zScreen = project(zWorld);
  const yScreen = project(yWorld);
  const xGuideA = new THREE.Vector3(worldMinX, worldMinY, worldMaxZ + offset);
  const xGuideB = new THREE.Vector3(worldMaxX, worldMinY, worldMaxZ + offset);
  const zGuideA = new THREE.Vector3(worldMaxX + offset, worldMinY, worldMinZ);
  const zGuideB = new THREE.Vector3(worldMaxX + offset, worldMinY, worldMaxZ);
  const yGuideA = new THREE.Vector3(worldMinX - offset, worldMinY, worldMaxZ + offset);
  const yGuideB = new THREE.Vector3(worldMinX - offset, worldMaxY, worldMaxZ + offset);
  const xA = project(xGuideA);
  const xB = project(xGuideB);
  const zA = project(zGuideA);
  const zB = project(zGuideB);
  const yA = project(yGuideA);
  const yB = project(yGuideB);

  const next = {
    guides: [
      { key: "x", x1: xA.x, y1: xA.y, x2: xB.x, y2: xB.y },
      { key: "z", x1: zA.x, y1: zA.y, x2: zB.x, y2: zB.y },
      { key: "y", x1: yA.x, y1: yA.y, x2: yB.x, y2: yB.y },
    ],
    handles: [
      {
        axis: "x" as const,
        key: "mirror-x",
        x: xScreen.x,
        y: xScreen.y,
        angle: screenAngle(xWorld.clone().add(new THREE.Vector3(-step, 0, 0)), xWorld.clone().add(new THREE.Vector3(step, 0, 0))),
        title: `${t("editor.tool.mirror")}: ${t("mirror.leftRight")}`,
      },
      {
        axis: "z" as const,
        key: "mirror-z",
        x: zScreen.x,
        y: zScreen.y,
        angle: screenAngle(zWorld.clone().add(new THREE.Vector3(0, 0, -step)), zWorld.clone().add(new THREE.Vector3(0, 0, step))),
        title: `${t("editor.tool.mirror")}: ${t("mirror.frontBack")}`,
      },
      {
        axis: "y" as const,
        key: "mirror-y",
        x: yScreen.x,
        y: yScreen.y,
        angle: screenAngle(yWorld.clone().add(new THREE.Vector3(0, -step, 0)), yWorld.clone().add(new THREE.Vector3(0, step, 0))),
        title: `${t("editor.tool.mirror")}: ${t("mirror.topBottom")}`,
      },
    ],
  };
  // A reference image is not mirrored across the axis it faces along: that would turn its picture to the back.
  const selectedSet = new Set(selectedIds);
  const blocked = new Set<string>(shapes.filter((shape) => selectedSet.has(shape.id) && isReferenceImage(shape)).map((shape) => referenceImageFacingAxis(shape)));
  if (blocked.size > 0) {
    next.guides = next.guides.filter((guide) => !blocked.has(guide.key));
    next.handles = next.handles.filter((handle) => !blocked.has(handle.axis));
  }

  overlayRef.current = next;
  setOverlay(next);
}

/** The clicked face of any body, as the body's id and the face's outward normal in world space. */
/**
 * While "Lay flat" waits for a click, shows the face the click would turn
 * down: the flat face under the pointer, if it belongs to the selection. The
 * face is looked up again only when the pointer moves onto another triangle,
 * or when `joined` comes: a group's parts joined, whose face is lit in place of the part's.
 */
export function syncLayFlatHover(
  state: ThreeState | null,
  selectedIds: readonly string[],
  theme: ResolvedAppTheme,
  clientX: number | null,
  clientY: number | null,
  round = false,
  joined: ArrayLike<number> | null = null,
) {
  if (!state) return;
  let layer = state.layFlatHoverLayer;
  if (!layer) {
    layer = new THREE.Group();
    layer.name = "LayFlatHover";
    layer.layers.set(RENDER_LAYER_PREVIEWS);
    layer.visible = false;
    state.layFlatHoverLayer = layer;
    state.scene.add(layer);
  }
  const clear = () => {
    if (layer.userData.key === undefined) return;
    disposeChildren(layer);
    layer.userData.key = undefined;
    layer.userData.joinedLit = undefined;
    layer.visible = false;
    state.needsRender = true;
  };
  if (clientX === null || clientY === null) {
    clear();
    return;
  }

  aimPickRay(state, clientX, clientY, RENDER_LAYER_SHAPES);
  const hit = firstShapeHit(state, { needsFace: true });
  const mesh = hit?.object as THREE.Mesh<THREE.BufferGeometry> | undefined;
  if (!hit || !mesh || hit.faceIndex === undefined || hit.faceIndex === null || !selectedIds.includes(mesh.userData.shapeId as string)) {
    clear();
    return;
  }

  const key = `${mesh.uuid}:${hit.faceIndex}:${theme}:${round}:${shapeResourceId(joined)}`;
  if (layer.userData.key === key) return;

  mesh.updateWorldMatrix(true, false);
  const position = mesh.geometry.getAttribute("position");
  const index = mesh.geometry.getIndex();
  const cornerCount = index ? index.count : position.count;
  const corner = new THREE.Vector3();
  const worldCorner = (offset: number) =>
    corner.fromBufferAttribute(position, index ? index.getX(offset) : offset).applyMatrix4(mesh.matrixWorld);
  let triangles: number[] = [hit.faceIndex];
  let positions: ArrayLike<number>;
  // With a group's parts joined, the face runs on across them; where the joined body has no face there, the part's is lit.
  let joinedTriangle = -1;
  if (joined && !round && joined.length / 3 <= 600000) {
    const faceIndex = hit.faceIndex;
    const [a, b, c] = [0, 1, 2].map((offset) => worldCorner(faceIndex * 3 + offset).clone());
    const normal = outwardFaceNormal(a, b, c, state.raycaster.ray.direction);
    // Still on the joined face already lit: the whole body need not be searched again.
    const lit = layer.userData.joinedLit as { joined: ArrayLike<number>; theme: string; vertices: Float32Array } | undefined;
    if (normal && lit?.joined === joined && lit.theme === theme && nearestFaceTriangle(lit.vertices, hit.point, normal, JOINED_FACE_REACH) >= 0) {
      layer.userData.key = key;
      return;
    }
    if (normal) joinedTriangle = nearestFaceTriangle(joined, hit.point, normal, JOINED_FACE_REACH);
  }
  if (joined && joinedTriangle >= 0) {
    positions = joined;
    triangles = planarFaceTriangles(joined, joinedTriangle)?.triangles ?? [joinedTriangle];
  } else if (cornerCount <= 600000) {
    const world = new Float64Array(cornerCount * 3);
    for (let offset = 0; offset < cornerCount; offset += 1) {
      worldCorner(offset);
      world[offset * 3] = corner.x;
      world[offset * 3 + 1] = corner.y;
      world[offset * 3 + 2] = corner.z;
    }
    positions = world;
    triangles = (round ? roundFaceTriangles(world, hit.faceIndex) : planarFaceTriangles(world, hit.faceIndex))?.triangles ?? triangles;
  } else {
    // A very dense mesh is too slow to search on every move: show the one facet.
    const world = new Float64Array(9);
    for (let offset = 0; offset < 3; offset += 1) {
      worldCorner(hit.faceIndex * 3 + offset);
      world[offset * 3] = corner.x;
      world[offset * 3 + 1] = corner.y;
      world[offset * 3 + 2] = corner.z;
    }
    positions = world;
    triangles = [0];
  }

  const vertices = new Float32Array(triangles.length * 9);
  triangles.forEach((triangle, slot) => {
    for (let offset = 0; offset < 9; offset += 1) vertices[slot * 9 + offset] = positions[triangle * 9 + offset];
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  const highlight = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      color: theme === "dark" ? "#69d9ff" : "#079bc6",
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    }),
  );
  highlight.layers.set(RENDER_LAYER_PREVIEWS);
  highlight.renderOrder = 960;
  highlight.raycast = () => undefined;
  disposeChildren(layer);
  layer.add(highlight);
  layer.userData.key = key;
  layer.userData.joinedLit = joined && joinedTriangle >= 0 ? { joined, theme, vertices } : undefined;
  layer.visible = true;
  state.needsRender = true;
}
