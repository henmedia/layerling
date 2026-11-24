"use client";

import * as THREE from "three";
import { type ShapeInspectorUpdateOptions } from "@/components/workplane/ShapeInspector";
import { cadModifierPrimitiveForBakedShape, cadTransformFromMatrix, cadTransformToMatrix } from "@/lib/cadBakeMetadata";
import { starSettingsForSize } from "@/lib/starGeometry";
import { gridfinityFootprintPatch, normalizeGridfinityOutline, normalizeGridfinityType } from "@/lib/gridfinityGeometry";
import { pulleyFootprint, pulleyFromSize, pulleySizedPatch } from "@/lib/pulleyGeometry";
import { type SelectionFrame } from "@/lib/liftGeometry";
import { edgeSnapGuide, snapResizeEdge, type EdgeSnapTarget, type MoveWallSnap, type ObjectSnapGuide, type SnapBox } from "@/lib/objectSnap";
import { scaledHorizontalShapePatch, worldBoxOfShapes } from "@/lib/scaleByPercent";
import { POSITION_TYPED_LIMIT } from "@/lib/workplaneSettings";
import { heightPatchKeepingBase, shapeIsTurned } from "@/lib/rotationPivot";
import { cleanNearZero, proportionalResizeScale, resizedImportedMeshPositions, resizedShapeSize, shapeDepth, shapeHasTaper, shapeWidth } from "@/lib/workplaneShapes";
import { type DimensionMark, type RotationAxis, type RotationPlaneView, type RotationWheelView, type TransformHandleKind } from "@/components/workplane/TransformOverlay";
import type { WorkplaneShape } from "@/types/layerling";
import { directionIsOwnShapeAxis } from "@/lib/geometryRotation";
import { quaternionForShape, shapeCenter } from "@/components/workplane/ViewportOverlays";
import { MIN_SHAPE_SIZE, boxDimensionsAlongAxes, clamp, selectionFrameForShapes } from "./viewportShapeObjects";
import { framePoint, frameLocalPoint, selectionFrameCorners } from "./viewportTransformOverlays";

export const MIN_ELEVATION = -POSITION_TYPED_LIMIT;
export const MAX_ELEVATION = POSITION_TYPED_LIMIT;
export type ResizeSigns = { x: number; z: number };
export type ResizeAnchorMemory = {
  shapeId: string;
  handleKey: string;
  signs: ResizeSigns;
  pressedY: "top" | "bottom" | null;
};
/**
 * One dragged side of a side or corner handle: it stops at the edges and middles of other bodies and at the walls it
 * runs into. `frameAxis` is the selection's own axis the side moves along, `worldAxis` the scene axis it lies on and
 * `worldDirection` the way the side moves along it as the body grows; `movingFrom`/`movingTo` its stretch across, for a
 * side handle's guide line.
 */
export type ResizeSnapSide = {
  frameAxis: "x" | "z";
  worldAxis: "x" | "z";
  worldDirection: 1 | -1;
  targets: EdgeSnapTarget[];
  movingFrom: number;
  movingTo: number;
};
export type TransformDragState = {
  id: string;
  ids: string[];
  kind: TransformHandleKind;
  handleKey: string;
  rotationAxis: RotationAxis;
  pointerId: number;
  startShape: WorkplaneShape;
  items: TransformDragItem[];
  selectionFrame: SelectionFrame;
  startScreenAngle: number;
  startClientX: number;
  startClientY: number;
  scalePlaneY: number;
  scalePlane?: THREE.Plane;
  scaleSigns?: ResizeSigns;
  scaleAnchorPoint?: THREE.Vector3;
  scaleStartPoint?: THREE.Vector3;
  liftAxis?: THREE.Vector3;
  liftPlane?: THREE.Plane;
  liftStartPoint?: THREE.Vector3;
  liftHandlePoint?: THREE.Vector3;
  liftStartValue?: number;
  /** A lift or slide arrow along the shape's own axes (J held, or the setting): whole grid steps from the start. */
  alongShape?: boolean;
  /** Alt was held when a lift began: the shapes stand in for a copy that is made on release (#865). */
  duplicate?: { standIns: THREE.Object3D[] };
  /**
   * An X or Y arrow on the flat workplane (Discussion #1434): the footprints and walls it snaps to, as a drag does;
   * guideY: where its lines are drawn.
   */
  slideSnap?: { moving: SnapBox; targets: SnapBox[]; walls?: MoveWallSnap; guideY: number };
  /** A side or corner handle on the flat workplane (Discussion #1647): one side for a side handle, two for a corner; guideY: where its lines are drawn. */
  resizeSnap?: { sides: ResizeSnapSide[]; guideY: number };
  rotationAxisVector?: THREE.Vector3;
  rotationPivot?: THREE.Vector3;
  /** A pivot the user set; the shapes then move around it instead of spinning in place. */
  customPivot?: boolean;
  rotationPlaneCenter?: THREE.Vector3;
  rotationPlaneView?: RotationPlaneView;
  rotationStartPointerAngle?: number;
  rotationStartVector?: THREE.Vector3;
  rotationScreenCenter?: { x: number; y: number };
  rotationScreenSign?: number;
  rotationStartQuaternion?: THREE.Quaternion;
  rotationWheelAppliedDelta?: number;
  rotationWheelAppliedPointerAngle?: number;
  rotationWheelDeltaOffset?: number;
  rotationWheelPointerOffset?: number;
  rotationWheelSnapDegrees?: number;
  wheelCenter?: RotationWheelView;
  hasMoved?: boolean;
};

export type TransformDragItem = {
  id: string;
  startShape: WorkplaneShape;
  startCenter: THREE.Vector3;
  startQuaternion: THREE.Quaternion;
};

export function snapValue(value: number, step: number) {
  return step > 0 ? Math.round(value / step) * step : value;
}

export function snapDimension(value: number, step: number, min = MIN_SHAPE_SIZE, max = 220) {
  const snapped = step > 0 ? snapValue(value, step) : value;
  const effectiveMin = step > 0 ? Math.max(min, Math.min(step, max)) : min;
  return clamp(snapped, effectiveMin, max);
}

export function frameLocalDelta(frame: SelectionFrame, start: THREE.Vector3, current: THREE.Vector3) {
  const offset = current.clone().sub(start);
  return new THREE.Vector3(offset.dot(frame.xAxis), offset.dot(frame.yAxis), offset.dot(frame.zAxis));
}

export function selectionWorldYBounds(frame: SelectionFrame) {
  const corners = selectionFrameCorners(frame);
  const min = cleanNearZero(Math.min(...corners.map((corner) => corner.y)));
  const max = cleanNearZero(Math.max(...corners.map((corner) => corner.y)));
  return { min, max, height: Math.max(MIN_SHAPE_SIZE, max - min) };
}

export function resizeSignsForHandle(handleKey: string): ResizeSigns {
  const key = handleKey.toLowerCase();
  return {
    x: key.includes("right") ? 1 : key.includes("left") ? -1 : 0,
    z: key.includes("near") ? 1 : key.includes("far") ? -1 : 0,
  };
}

export function resizeAnchorPointForFrame(frame: SelectionFrame, signs: ResizeSigns) {
  return framePoint(
    frame,
    signs.x ? (-signs.x * frame.width) / 2 : 0,
    frame.min.y,
    signs.z ? (-signs.z * frame.depth) / 2 : 0,
  );
}

export function resizeCenterFromAnchor(frame: SelectionFrame, anchor: THREE.Vector3, signs: ResizeSigns, width: number, depth: number) {
  return anchor
    .clone()
    .add(frame.yAxis.clone().multiplyScalar(frame.height / 2))
    .add(frame.xAxis.clone().multiplyScalar(signs.x ? (signs.x * width) / 2 : 0))
    .add(frame.zAxis.clone().multiplyScalar(signs.z ? (signs.z * depth) / 2 : 0));
}

export function resizedShapePatchFromFrame(shape: WorkplaneShape, center: THREE.Vector3, width: number, depth: number): Partial<WorkplaneShape> {
  const patch: Partial<WorkplaneShape> = {
    x: cleanNearZero(center.x, 0.0005),
    z: cleanNearZero(center.z, 0.0005),
    elevation: cleanNearZero(center.y - shape.height / 2, 0.0005),
    width,
    depth,
    size: resizedShapeSize(width, depth),
  };
  if (shape.kind === "cone") {
    patch.baseRadius = width / 2;
  }
  if (shape.kind === "star") {
    Object.assign(patch, starSettingsForSize({ ...shape, width: shapeWidth(shape), depth: shapeDepth(shape) }, width, depth));
  }
  return patch;
}

export function patchWithPreservedWorldYEdge(shape: WorkplaneShape, patch: Partial<WorkplaneShape>, edge: "bottom" | "top") {
  const startFrame = selectionFrameForShapes([shape], [shape.id]);
  if (!startFrame) {
    return patch;
  }
  const startBounds = selectionWorldYBounds(startFrame);
  const draftShape = { ...shape, ...patch };
  const draftFrame = selectionFrameForShapes([draftShape], [shape.id]);
  if (!draftFrame) {
    return patch;
  }
  const draftBounds = selectionWorldYBounds(draftFrame);
  const delta = edge === "bottom" ? startBounds.min - draftBounds.min : startBounds.max - draftBounds.max;
  return {
    ...patch,
    elevation: cleanNearZero(clamp((draftShape.elevation ?? 0) + delta, MIN_ELEVATION, MAX_ELEVATION), 0.0005),
  };
}

export function patchWithPreservedWorldBottom(shape: WorkplaneShape, patch: Partial<WorkplaneShape>) {
  return patchWithPreservedWorldYEdge(shape, patch, "bottom");
}

export function resizeSignsForDimension(signs: ResizeSigns, axis: "width" | "depth") {
  return axis === "width" ? { x: signs.x, z: 0 } : { x: 0, z: signs.z };
}

export function patchWithResizeAnchor(
  shape: WorkplaneShape,
  patch: Partial<WorkplaneShape>,
  axis: ShapeInspectorUpdateOptions["resizeAxis"] | DimensionMark["axis"],
  anchor: ResizeAnchorMemory | null,
) {
  // Eine eingetippte Position ist selbst der Wunsch; die Unterkante
  // festzuhalten wuerde die neue Hoehe gleich wieder zuruecksetzen.
  if ("elevation" in patch || "x" in patch || "z" in patch) {
    return patch;
  }
  // A new name, hiding or locking leaves the body as it is; an added elevation
  // would make a locked shape refuse the change.
  if (Object.keys(patch).every((key) => key === "name" || key === "hidden" || key === "locked")) {
    return patch;
  }
  if (axis === "height") {
    const keep = anchor?.shapeId === shape.id && anchor.pressedY === "bottom" ? "top" : "bottom";
    // A turned body grows along its own up axis from the middle of its base, as with the handle; keeping only its
    // lowest point at the same height let the base slide along a sloped face (#808).
    if (shapeIsTurned(shape)) return heightPatchKeepingBase(shape, patch, keep === "top" ? "top" : "base");
    return patchWithPreservedWorldYEdge(shape, patch, keep);
  }

  if (axis !== "width" && axis !== "depth") {
    return patchWithPreservedWorldBottom(shape, patch);
  }
  if (!anchor || anchor.shapeId !== shape.id) {
    return patchWithPreservedWorldBottom(shape, patch);
  }

  const signs = resizeSignsForDimension(anchor.signs, axis);
  if (!signs.x && !signs.z) {
    return patchWithPreservedWorldBottom(shape, patch);
  }

  const frame = selectionFrameForShapes([shape], [shape.id]);
  if (!frame) {
    return patchWithPreservedWorldBottom(shape, patch);
  }

  const draftShape = { ...shape, ...patch };
  const draftFrame = selectionFrameForShapes([draftShape], [shape.id]);
  const width = Math.max(MIN_SHAPE_SIZE, draftFrame?.width ?? patch.width ?? shapeWidth(shape));
  const depth = Math.max(MIN_SHAPE_SIZE, draftFrame?.depth ?? patch.depth ?? shapeDepth(shape));
  const center = resizeCenterFromAnchor(frame, resizeAnchorPointForFrame(frame, signs), signs, width, depth);
  return patchWithPreservedWorldBottom(shape, {
    ...patch,
    x: cleanNearZero(center.x, 0.0005),
    z: cleanNearZero(center.z, 0.0005),
    elevation: cleanNearZero(center.y - shape.height / 2, 0.0005),
  });
}

/**
 * Scales a shape's height by `scale` while the world height `anchorY` stays
 * put, so a corner drag with Shift can grow all three axes at once. `patch` is
 * what the width/depth part of the drag already decided; the height step is
 * applied on top of that result, so rotated and tapered shapes work out which
 * of their own axes is the vertical one.
 */
export function patchWithUniformHeightScale(
  shape: WorkplaneShape,
  patch: Partial<WorkplaneShape>,
  scale: number,
  anchorY: number,
): Partial<WorkplaneShape> {
  if (!Number.isFinite(scale) || Math.abs(scale - 1) < 1e-6) {
    return patch;
  }
  const base = { ...shape, ...patch } as WorkplaneShape;
  const frame = selectionFrameForShapes([base], [base.id]);
  if (!frame) {
    return patch;
  }
  const startBottom = selectionWorldYBounds(frame).min;
  const merged: Partial<WorkplaneShape> = {
    ...patch,
    ...resizeShapeAlongFrameNormal(base, frame, Math.max(MIN_SHAPE_SIZE, frame.height * scale), false),
  };
  const scaledFrame = selectionFrameForShapes([{ ...shape, ...merged } as WorkplaneShape], [shape.id]);
  if (!scaledFrame) {
    return merged;
  }
  const wantedBottom = anchorY + (startBottom - anchorY) * scale;
  const delta = wantedBottom - selectionWorldYBounds(scaledFrame).min;
  return {
    ...merged,
    elevation: cleanNearZero(clamp(((merged.elevation ?? shape.elevation) ?? 0) + delta, MIN_ELEVATION, MAX_ELEVATION), 0.0005),
  };
}

export function resizeShapeFromFrameHandle(
  transform: TransformDragState,
  point: THREE.Vector3,
  handleKey: string,
  shiftKey: boolean,
  altKey: boolean,
  step: number,
  maxSize: number,
  freeAxes: readonly ("x" | "z")[] = [],
): Partial<WorkplaneShape> {
  // A GT2 pulley (Discussion #1319) takes the size as teeth and belt width.
  return pulleySizedPatch(transform.startShape, resizeShapeFromFrameHandleBox(transform, point, handleKey, shiftKey, altKey, step, maxSize, freeAxes));
}

function resizeShapeFromFrameHandleBox(
  transform: TransformDragState,
  point: THREE.Vector3,
  handleKey: string,
  shiftKey: boolean,
  altKey: boolean,
  step: number,
  maxSize: number,
  freeAxes: readonly ("x" | "z")[] = [],
): Partial<WorkplaneShape> {
  const shape = transform.startShape;
  const frame = transform.selectionFrame;
  const width = frame.width;
  const depth = frame.depth;
  const localDelta = transform.scaleStartPoint ? frameLocalDelta(frame, transform.scaleStartPoint, point) : new THREE.Vector3();

  const signs = transform.scaleSigns ?? resizeSignsForHandle(handleKey);
  // A handle dragged past the opposite side keeps growing there, as in Tinkercad: the size is the
  // distance from that side and the body stands on the other side of it.
  // A side that snapped to another body (Discussion #1647) keeps that size off the grid.
  const axisResize = (current: number, delta: number, sign: number, free: boolean) => {
    if (!sign) {
      return { size: current, flipped: false };
    }
    const raw = current + sign * delta * (altKey ? 2 : 1);
    return { size: snapDimension(Math.abs(raw), free ? 0 : step, MIN_SHAPE_SIZE, maxSize), flipped: raw < 0 && !altKey };
  };

  const resizedX = axisResize(width, localDelta.x, signs.x, freeAxes.includes("x"));
  const resizedZ = axisResize(depth, localDelta.z, signs.z, freeAxes.includes("z"));
  let nextWidth = resizedX.size;
  let nextDepth = resizedZ.size;
  let flipX = resizedX.flipped;
  let flipZ = resizedZ.flipped;

  // A cylinder is always circular - every horizontal handle (side or corner)
  // drives the one shared diameter instead of stretching width and depth
  // independently into an ellipse.
  // A Hirth joint too: stretched, its teeth no longer interlock all round (#1016).
  // Not for a body lying on its side (Discussion #1838): its footprint is then its length and one diameter (see below).
  const lying = Boolean(frame.lying);
  if (!lying && (shape.kind === "cylinder" || shape.kind === "star" || shape.kind === "hirth" || shape.kind === "pulley" || shape.kind === "finishingWasher") && (signs.x || signs.z)) {
    const diameter = signs.x && signs.z ? (nextWidth + nextDepth) / 2 : signs.x ? nextWidth : nextDepth;
    nextWidth = diameter;
    nextDepth = diameter;
  }
  // A GT2 pulley is whole teeth: its width is rounded to them before the middle is placed.
  if (!lying && shape.kind === "pulley" && (signs.x || signs.z)) {
    nextWidth = pulleyFootprint({ ...shape, ...pulleyFromSize(shape, { width: nextWidth }) }).width;
    nextDepth = nextWidth;
  }

  // Shift on a corner keeps every proportion, height included.
  let uniformScale = 1;
  if (shiftKey && signs.x && signs.z) {
    const scale = proportionalResizeScale(width, depth, nextWidth, nextDepth);
    const limitedScale = clamp(scale, MIN_SHAPE_SIZE / Math.max(MIN_SHAPE_SIZE, Math.min(width, depth)), maxSize / Math.max(width, depth));
    nextWidth = snapDimension(width * limitedScale, step, MIN_SHAPE_SIZE, maxSize);
    nextDepth = snapDimension(depth * limitedScale, step, MIN_SHAPE_SIZE, maxSize);
    uniformScale = nextWidth / Math.max(MIN_SHAPE_SIZE, width);
    // Past the opposite corner both sides cross together.
    flipX = flipZ = flipX || flipZ;
  }
  // A Gridfinity bin or baseplate is whole grid units (a tray's size is free): the box is rounded to them before the
  // middle is placed, so the side that is not dragged stays where it is.
  if (!lying && shape.kind === "gridfinity" && (signs.x || signs.z)) {
    const footprint = gridfinityFootprintPatch({ ...shape, width: nextWidth, depth: nextDepth });
    nextWidth = footprint.width;
    nextDepth = footprint.depth;
  }
  const heightAnchorY = altKey ? frame.center.y : selectionWorldYBounds(frame).min;

  const centerSigns = { x: flipX ? -signs.x : signs.x, z: flipZ ? -signs.z : signs.z };
  const nextCenter = altKey
    ? frame.center.clone()
    : resizeCenterFromAnchor(frame, transform.scaleAnchorPoint ?? resizeAnchorPointForFrame(frame, signs), centerSigns, nextWidth, nextDepth);
  // A box on a workplane that stands on one of its side faces (Discussion #1351): the handles run along the
  // workplane's axes, so each size goes to the box's own dimension that lies along its axis.
  const boxDimensions = boxDimensionsAlongAxes(shape, { x: frame.xAxis, y: frame.yAxis, z: frame.zAxis });
  if (boxDimensions && (boxDimensions.x !== "width" || boxDimensions.y !== "height" || boxDimensions.z !== "depth")) {
    const dims = { width: shapeWidth(shape), height: shape.height, depth: shapeDepth(shape) };
    dims[boxDimensions.x] = nextWidth;
    dims[boxDimensions.z] = nextDepth;
    const center = nextCenter.clone();
    if (uniformScale !== 1) {
      // Shift on a corner keeps every proportion: the third size grows from the face the workplane stands on.
      dims[boxDimensions.y] = Math.max(MIN_SHAPE_SIZE, frame.height * uniformScale);
      if (!altKey) center.addScaledVector(frame.yAxis, (dims[boxDimensions.y] - frame.height) / 2);
    }
    return {
      x: cleanNearZero(center.x, 0.0005),
      z: cleanNearZero(center.z, 0.0005),
      elevation: cleanNearZero(center.y - dims.height / 2, 0.0005),
      width: dims.width,
      depth: dims.depth,
      height: dims.height,
      size: resizedShapeSize(dims.width, dims.depth),
    };
  }
  // A body lying on its side on a level workplane (Discussion #1838): its handles stand upright on the workplane,
  // so each size goes to the body's own measure that runs along the handle's axis, as for a turned body of a
  // selection (#1645). The side that is not dragged and the bottom stay where they are.
  if (lying) {
    return turnedItemScalePatch(
      shape,
      frame,
      nextWidth / Math.max(MIN_SHAPE_SIZE, width),
      nextDepth / Math.max(MIN_SHAPE_SIZE, depth),
      uniformScale,
      nextCenter,
      heightAnchorY,
      // Rounded, for the frame is measured from the turned body and 38 came out as 37.99999999999999.
      (size) => Math.round(clamp(size, MIN_SHAPE_SIZE, maxSize) * 1e6) / 1e6,
    );
  }
  if (shapeHasTaper(shape)) {
    const scaleX = nextWidth / Math.max(MIN_SHAPE_SIZE, width);
    const scaleZ = nextDepth / Math.max(MIN_SHAPE_SIZE, depth);
    const scaled = scaledHorizontalShapePatch(shape, scaleX, scaleZ);
    return patchWithUniformHeightScale(shape, {
      ...scaled,
      x: cleanNearZero(nextCenter.x, 0.0005),
      z: cleanNearZero(nextCenter.z, 0.0005),
      elevation: cleanNearZero(nextCenter.y - shape.height / 2, 0.0005),
    }, uniformScale, heightAnchorY);
  }
  return patchWithUniformHeightScale(shape, resizedShapePatchFromFrame(shape, nextCenter, nextWidth, nextDepth), uniformScale, heightAnchorY);
}

export function axisScaleMatrix(axis: THREE.Vector3, scale: number, anchor: number) {
  const normal = axis.clone().normalize();
  const factor = scale - 1;
  const translation = normal.clone().multiplyScalar((1 - scale) * anchor);
  return new THREE.Matrix4().set(
    1 + factor * normal.x * normal.x,
    factor * normal.x * normal.y,
    factor * normal.x * normal.z,
    translation.x,
    factor * normal.y * normal.x,
    1 + factor * normal.y * normal.y,
    factor * normal.y * normal.z,
    translation.y,
    factor * normal.z * normal.x,
    factor * normal.z * normal.y,
    1 + factor * normal.z * normal.z,
    translation.z,
    0, 0, 0, 1,
  );
}

export function resizeImportedShapeAlongFrameNormal(
  shape: WorkplaneShape,
  frame: SelectionFrame,
  nextFrameHeight: number,
  resizingFromBottom: boolean,
): Partial<WorkplaneShape> | null {
  if (!shape.importedMesh?.positions.length) {
    return null;
  }
  // Zieht der Griff entlang einer eigenen Achse des Koerpers, reicht das Mass
  // dieser Achse, und die Drehung bleibt. Einbacken wuerde sie auf 0 setzen -
  // ein Skizzenkoerper landete dann beim Bearbeiten auf der Grundebene
  // (Forum 617212).
  if (directionIsOwnShapeAxis(shape, frame.yAxis)) {
    return null;
  }

  const positions = resizedImportedMeshPositions(shape);
  const scale = nextFrameHeight / Math.max(MIN_SHAPE_SIZE, frame.height);
  const axis = frame.yAxis.clone().normalize();
  const anchorLocal = resizingFromBottom ? frame.max.y : frame.min.y;
  const anchorWorld = frame.center.dot(axis) + anchorLocal;
  const deformation = axisScaleMatrix(axis, scale, anchorWorld);
  const shapeCenterWorld = shapeCenter(shape);
  const quaternion = quaternionForShape(shape);
  const worldPositions: number[] = [];
  const point = new THREE.Vector3();
  const min = new THREE.Vector3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
  const max = new THREE.Vector3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);

  for (let index = 0; index + 2 < positions.length; index += 3) {
    point
      .set(positions[index], positions[index + 1] - shape.height / 2, positions[index + 2])
      .applyQuaternion(quaternion)
      .add(shapeCenterWorld)
      .applyMatrix4(deformation);
    worldPositions.push(point.x, point.y, point.z);
    min.min(point);
    max.max(point);
  }

  if (![min.x, min.y, min.z, max.x, max.y, max.z].every(Number.isFinite)) {
    return null;
  }

  const centerX = (min.x + max.x) / 2;
  const centerZ = (min.z + max.z) / 2;
  const width = Math.max(MIN_SHAPE_SIZE, max.x - min.x);
  const height = Math.max(MIN_SHAPE_SIZE, max.y - min.y);
  const depth = Math.max(MIN_SHAPE_SIZE, max.z - min.z);
  const localPositions = worldPositions.map((value, index) => {
    if (index % 3 === 0) return value - centerX;
    if (index % 3 === 1) return value - min.y;
    return value - centerZ;
  });
  const primitive = cadModifierPrimitiveForBakedShape(shape);
  const primitiveTransform = primitive
    ? deformation.clone().multiply(cadTransformToMatrix(primitive.transform))
    : null;
  const cadPrimitiveFrame = primitive && primitiveTransform
    ? {
        kind: primitive.kind,
        width: primitive.width,
        depth: primitive.depth,
        height: primitive.height,
        ...(primitive.kind === "cylinder" ? { radius: primitive.radius } : {}),
        ...(primitive.kind === "cone" ? { baseRadius: primitive.baseRadius, topRadius: primitive.topRadius } : {}),
        frame: {
          x: centerX,
          z: centerZ,
          elevation: min.y,
          width,
          depth,
          height,
          sourceTransform: cadTransformFromMatrix(primitiveTransform),
        },
      }
    : undefined;

  return {
    kind: "mesh",
    x: cleanNearZero(centerX, 0.0005),
    z: cleanNearZero(centerZ, 0.0005),
    elevation: cleanNearZero(min.y, 0.0005),
    width,
    depth,
    height,
    size: Math.max(width, depth),
    rotation: 0,
    rotationX: 0,
    rotationZ: 0,
    mirrorX: undefined,
    mirrorY: undefined,
    mirrorZ: undefined,
    importedMesh: {
      positions: localPositions,
      baseWidth: width,
      baseDepth: depth,
      baseHeight: height,
      triangleCount: Math.floor(localPositions.length / 9),
      sourceFormat: "json",
    },
    cadPrimitiveFrame,
    cadBrep: undefined,
    cadBrepFrame: undefined,
    cadDisplayEdges: undefined,
    cadDisplayEdgesVersion: undefined,
    edgeTreatments: undefined,
    edgeTreatmentHistory: undefined,
    edgeResizeMode: undefined,
    // Schraeg gestreckt passt die Skizze nicht mehr zum Koerper, und ihre
    // Ebene ist mit der Drehung weg: "Skizze bearbeiten" baute sonst einen
    // flach liegenden Koerper ohne die Streckung.
    sketchProfile: undefined,
    sketchOperation: undefined,
    sketchRevolve: undefined,
  };
}

export function resizeShapeAlongFrameNormal(
  shape: WorkplaneShape,
  frame: SelectionFrame,
  nextFrameHeight: number,
  resizingFromBottom: boolean,
): Partial<WorkplaneShape> {
  // A GT2 pulley (Discussion #1319) standing up takes its height as the belt width, rounded to what it allows.
  if (shape.kind === "pulley" && !shape.rotationX && !shape.rotationZ) {
    const height = pulleyFootprint({ ...shape, ...pulleyFromSize(shape, { height: Math.abs(nextFrameHeight) }) }).height;
    return pulleySizedPatch(shape, resizeShapeAlongFrameNormalBox(shape, frame, Math.sign(nextFrameHeight || 1) * height, resizingFromBottom));
  }
  return pulleySizedPatch(shape, resizeShapeAlongFrameNormalBox(shape, frame, nextFrameHeight, resizingFromBottom));
}

function resizeShapeAlongFrameNormalBox(
  shape: WorkplaneShape,
  frame: SelectionFrame,
  nextFrameHeight: number,
  resizingFromBottom: boolean,
): Partial<WorkplaneShape> {
  // A body made of a mesh keeps a positive height; past the other face it stops at the smallest size.
  const importedPatch = resizeImportedShapeAlongFrameNormal(shape, frame, Math.max(MIN_SHAPE_SIZE, nextFrameHeight), resizingFromBottom);
  if (importedPatch) {
    return importedPatch;
  }

  // A Gridfinity bin is whole height units (a tray's height is free): the height is rounded before the fixed face is kept.
  const frameHeight = shape.kind === "gridfinity" && !shape.rotationX && !shape.rotationZ
    ? gridfinityFootprintPatch({ ...shape, height: Math.abs(nextFrameHeight) }).height
    : nextFrameHeight;
  // Negative past the other face: the centre crosses the fixed face, the sizes stay positive.
  const scale = frameHeight / Math.max(MIN_SHAPE_SIZE, frame.height);
  const currentCenter = shapeCenter(shape);
  const currentCenterLocalY = frameLocalPoint(frame, currentCenter).y;
  const anchorLocal = resizingFromBottom ? frame.max.y : frame.min.y;
  const nextCenterLocalY = anchorLocal + (currentCenterLocalY - anchorLocal) * scale;
  const nextCenter = currentCenter.clone().addScaledVector(frame.yAxis, nextCenterLocalY - currentCenterLocalY);
  const quaternion = quaternionForShape(shape);
  const localAxes = [
    { axis: "width" as const, vector: new THREE.Vector3(1, 0, 0).applyQuaternion(quaternion) },
    { axis: "height" as const, vector: new THREE.Vector3(0, 1, 0).applyQuaternion(quaternion) },
    { axis: "depth" as const, vector: new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion) },
  ];
  const dimensionAxis = localAxes.reduce((best, candidate) =>
    Math.abs(candidate.vector.dot(frame.yAxis)) > Math.abs(best.vector.dot(frame.yAxis)) ? candidate : best,
  );
  const patch: Partial<WorkplaneShape> = {
    x: cleanNearZero(nextCenter.x, 0.0005),
    z: cleanNearZero(nextCenter.z, 0.0005),
  };
  // A body lying on its side (Discussion #1838): the height handle pulls one of its sideways measures. A round body
  // keeps its diameter round, and a cone, a star or a tapered body the settings that follow its width and length.
  if (frame.lying && dimensionAxis.axis !== "height") {
    const round = keepsRoundFootprint(shape);
    const scaleX = dimensionAxis.axis === "width" || round ? Math.abs(scale) : 1;
    const scaleZ = dimensionAxis.axis === "depth" || round ? Math.abs(scale) : 1;
    // The frame is measured from the turned body: without rounding a height of 21 came out as 20.999999999999993.
    const tidy = (value: number) => Math.round(value * 1e6) / 1e6;
    const sized = scaledHorizontalShapePatch(shape, scaleX, scaleZ);
    return {
      ...patch,
      ...sized,
      ...(typeof sized.width === "number" ? { width: tidy(sized.width) } : {}),
      ...(typeof sized.depth === "number" ? { depth: tidy(sized.depth) } : {}),
      ...(typeof sized.size === "number" ? { size: tidy(sized.size) } : {}),
      elevation: cleanNearZero(tidy(nextCenter.y - shape.height / 2), 0.0005),
    };
  }
  if (dimensionAxis.axis === "width") {
    patch.width = Math.max(MIN_SHAPE_SIZE, shapeWidth(shape) * Math.abs(scale));
    patch.size = resizedShapeSize(patch.width, shapeDepth(shape));
    patch.elevation = cleanNearZero(nextCenter.y - shape.height / 2, 0.0005);
  } else if (dimensionAxis.axis === "depth") {
    patch.depth = Math.max(MIN_SHAPE_SIZE, shapeDepth(shape) * Math.abs(scale));
    patch.size = resizedShapeSize(shapeWidth(shape), patch.depth);
    patch.elevation = cleanNearZero(nextCenter.y - shape.height / 2, 0.0005);
  } else {
    patch.height = Math.max(MIN_SHAPE_SIZE, shape.height * Math.abs(scale));
    patch.elevation = cleanNearZero(nextCenter.y - patch.height / 2, 0.0005);
  }
  return patch;
}

export function resizeSelectionFromHandle(
  transform: TransformDragState,
  point: THREE.Vector3,
  handleKey: string,
  shiftKey: boolean,
  altKey: boolean,
  step: number,
  maxSize: number,
  freeAxes: readonly ("x" | "z")[] = [],
) {
  const frame = transform.selectionFrame;
  const localDelta = transform.scaleStartPoint ? frameLocalDelta(frame, transform.scaleStartPoint, point) : new THREE.Vector3();
  const signs = transform.scaleSigns ?? resizeSignsForHandle(handleKey);
  // Past the opposite side the selection keeps growing there, mirrored: its scale is negative then
  // and the bodies in it change sides with it.
  const axisResize = (current: number, delta: number, sign: number, free: boolean) => {
    if (!sign) {
      return { size: current, scale: 1, flipped: false };
    }
    // A side that snapped to another body (Discussion #1647) keeps that size off the grid.
    const grid = free ? 0 : step;
    if (altKey) {
      const size = snapDimension(Math.abs(current + sign * delta * 2), grid, MIN_SHAPE_SIZE, maxSize);
      return { size, scale: size / Math.max(MIN_SHAPE_SIZE, current), flipped: false };
    }
    const rawSize = current + sign * delta;
    const size = snapDimension(Math.abs(rawSize), grid, MIN_SHAPE_SIZE, maxSize);
    const flipped = rawSize < 0;
    return {
      size,
      scale: (flipped ? -size : size) / Math.max(MIN_SHAPE_SIZE, current),
      flipped,
    };
  };

  let nextX = axisResize(frame.width, localDelta.x, signs.x, freeAxes.includes("x"));
  let nextZ = axisResize(frame.depth, localDelta.z, signs.z, freeAxes.includes("z"));
  let uniformScale = 1;
  if (shiftKey && signs.x && signs.z) {
    const scale = proportionalResizeScale(frame.width, frame.depth, nextX.size, nextZ.size);
    const limitedScale = clamp(scale, MIN_SHAPE_SIZE / Math.max(MIN_SHAPE_SIZE, Math.min(frame.width, frame.depth)), maxSize / Math.max(frame.width, frame.depth));
    const width = snapDimension(frame.width * limitedScale, step, MIN_SHAPE_SIZE, maxSize);
    const depth = snapDimension(frame.depth * limitedScale, step, MIN_SHAPE_SIZE, maxSize);
    // Past the opposite corner both sides cross together.
    const flipped = nextX.flipped || nextZ.flipped;
    nextX = {
      size: width,
      scale: (flipped ? -width : width) / Math.max(MIN_SHAPE_SIZE, frame.width),
      flipped,
    };
    nextZ = {
      size: depth,
      scale: (flipped ? -depth : depth) / Math.max(MIN_SHAPE_SIZE, frame.depth),
      flipped,
    };
    // Shift on a corner keeps every proportion, height included.
    uniformScale = Math.abs(nextX.scale);
  }
  const heightAnchorY = altKey ? frame.center.y : selectionWorldYBounds(frame).min;

  const centerSigns = { x: nextX.flipped ? -signs.x : signs.x, z: nextZ.flipped ? -signs.z : signs.z };
  const nextCenter = altKey
    ? frame.center.clone()
    : resizeCenterFromAnchor(frame, transform.scaleAnchorPoint ?? resizeAnchorPointForFrame(frame, signs), centerSigns, nextX.size, nextZ.size);

  return scaleSelectionItems(frame, transform.items, nextX, nextZ, uniformScale, nextCenter, heightAnchorY, step, maxSize);
}

/** Every body of a selection scaled with its frame: the sizes and the spaces between them grow alike. */
export function scaleSelectionItems(
  frame: SelectionFrame,
  items: TransformDragItem[],
  nextX: { size: number; scale: number },
  nextZ: { size: number; scale: number },
  uniformScale: number,
  nextCenter: THREE.Vector3,
  heightAnchorY: number,
  step: number,
  maxSize: number,
) {
  return items.map((item) => {
    const localCenter = frameLocalPoint(frame, item.startCenter);
    const nextItemCenter = nextCenter
      .clone()
      .add(frame.xAxis.clone().multiplyScalar(localCenter.x * nextX.scale))
      .add(frame.yAxis.clone().multiplyScalar(localCenter.y))
      .add(frame.zAxis.clone().multiplyScalar(localCenter.z * nextZ.scale));
    // Only the selection as a whole lies on the grid. A body of several is not snapped on its own: each would round
    // to a different factor and the layers of an imported drawing no longer fitted into one another (Discussion #1416).
    const sized = (size: number) => (items.length === 1 ? snapDimension(size, step, MIN_SHAPE_SIZE, maxSize) : clamp(size, MIN_SHAPE_SIZE, maxSize));
    // A turned body (a cylinder laid on its side) grows along its own axes as far as the selection grows along them,
    // or the stretch along X went to its own width while its length ran along X (#1645).
    if (shapeIsTurned(item.startShape)) {
      return {
        id: item.id,
        patch: turnedItemScalePatch(item.startShape, frame, Math.abs(nextX.scale), Math.abs(nextZ.scale), uniformScale, nextItemCenter, heightAnchorY, sized),
      };
    }
    const width = sized(shapeWidth(item.startShape) * Math.abs(nextX.scale));
    const depth = sized(shapeDepth(item.startShape) * Math.abs(nextZ.scale));
    const actualScaleX = width / Math.max(MIN_SHAPE_SIZE, shapeWidth(item.startShape));
    const actualScaleZ = depth / Math.max(MIN_SHAPE_SIZE, shapeDepth(item.startShape));
    const patch = {
      ...scaledHorizontalShapePatch(item.startShape, actualScaleX, actualScaleZ),
      x: nextItemCenter.x,
      z: nextItemCenter.z,
      elevation: cleanNearZero(nextItemCenter.y - item.startShape.height / 2, 0.0005),
    } satisfies Partial<WorkplaneShape>;
    return {
      id: item.id,
      patch: patchWithUniformHeightScale(item.startShape, patch, uniformScale, heightAnchorY),
    };
  });
}

/** Bodies that are round across: their width and depth are one diameter, so they never become an oval. */
function keepsRoundFootprint(shape: WorkplaneShape) {
  if (shape.kind === "gear") return shape.gearType !== "rack" && (shape.gearProfile === "involute" || shape.gearProfile === "round");
  return shape.kind === "cylinder" || shape.kind === "star" || shape.kind === "knurl" || shape.kind === "hirth" || shape.kind === "pulley" || shape.kind === "finishingWasher";
}

/**
 * Whether a body keeps both sizes a corner handle pulls its sides to: not one that keeps one diameter, a thread, a
 * Gridfinity bin or a baseplate in whole units, or a text whose box can be rebuilt round its letters (only a straight,
 * stretched one fills its box), as gridfinityFootprintPatch and textFitScale decide.
 */
export function cornerKeepsBothSides(shape: WorkplaneShape) {
  if (keepsRoundFootprint(shape) || shape.kind === "thread") return false;
  if (shape.kind === "gridfinity") {
    const type = normalizeGridfinityType(shape.gridfinityType);
    return type === "tray" || (type === "baseplate" && Boolean(normalizeGridfinityOutline(shape.gridfinityOutline)));
  }
  if (shape.kind === "text") return Boolean(shape.textStretch) && !shape.textCurved;
  return true;
}

/**
 * Where the dragged sides of a side or corner handle snap to (Discussion #1647), each on its own along its frame axis:
 * the axes are square to each other, so pulling one side does not move the other. `pull` is the pointer's way from
 * where the drag began, `shape` the body when it is resized on its own. Gives the shift to add to the pointer, the axes
 * whose size goes off the grid, and a guide for each snapped side.
 */
export function snapResizeSides(
  snaps: readonly ResizeSnapSide[],
  frame: SelectionFrame,
  signs: ResizeSigns,
  pull: THREE.Vector3 | null,
  anchorPoint: THREE.Vector3,
  altKey: boolean,
  step: number,
  maxSize: number,
  threshold: number,
  shape?: WorkplaneShape,
) {
  const factor = altKey ? 2 : 1;
  const sides = snaps.map((side) => {
    const axisVector = side.frameAxis === "x" ? frame.xAxis : frame.zAxis;
    const sign = side.frameAxis === "x" ? signs.x : signs.z;
    const current = side.frameAxis === "x" ? frame.width : frame.depth;
    const delta = pull ? pull.dot(axisVector) : 0;
    const rawSize = current + sign * delta * factor;
    const hit = rawSize > 0
      ? snapResizeEdge({ anchor: anchorPoint[side.worldAxis], direction: side.worldDirection, size: rawSize, symmetric: altKey }, side.targets, threshold, MIN_SHAPE_SIZE)
      : null;
    // On a corner the other side's guide reaches over this side where the resize lands it: on the grid unless it snapped,
    // within the size limit, past its anchor too as the body flips, and a Gridfinity tray or outlined baseplate on its own
    // within its own limits, as resizeShapeFromFrameHandle keeps it.
    const limited = snapDimension(Math.abs(hit ? hit.size : rawSize), hit ? 0 : step, MIN_SHAPE_SIZE, maxSize);
    const dimension = side.frameAxis === "x" ? "width" : "depth";
    const kept = shape?.kind === "gridfinity" ? gridfinityFootprintPatch({ ...shape, [dimension]: limited })[dimension] : limited;
    const size = (rawSize < 0 ? -1 : 1) * kept;
    return { side, axisVector, hit, size, along: hit ? (hit.size - current) / (sign * factor) - delta : 0 };
  });
  const shift = new THREE.Vector3();
  const freeAxes: ("x" | "z")[] = [];
  const guides: ObjectSnapGuide[] = [];
  for (const { side, axisVector, hit, along } of sides) {
    if (!hit) continue;
    shift.addScaledVector(axisVector, along);
    freeAxes.push(side.frameAxis);
    const other = sides.find((candidate) => candidate.side !== side);
    let reach = [side.movingFrom, side.movingTo];
    if (other) {
      const at = anchorPoint[other.side.worldAxis];
      reach = altKey ? [at - other.size / 2, at + other.size / 2] : [at, at + other.side.worldDirection * other.size];
    }
    guides.push(edgeSnapGuide(side.worldAxis, hit.target, Math.min(...reach), Math.max(...reach)));
  }
  return { shift, freeAxes, guides };
}

/**
 * A turned body of a selection that is stretched along the selection's sideways axes (#1645). Each of its own sizes
 * grows by as much as the stretch lengthens the axis it runs along: a cylinder laid along X grows longer with the
 * handles on X and thicker with those on Z. A body turned at a slant gets the nearest it can: a slanting stretch
 * would be a shear, which no size of its own can show. It keeps its bottom where it was, so nothing sinks into the plate;
 * with Shift (`uniformScale`) the selection grows in height too and its bottom moves with it.
 */
export function turnedItemScalePatch(
  shape: WorkplaneShape,
  frame: SelectionFrame,
  scaleX: number,
  scaleZ: number,
  uniformScale: number,
  center: THREE.Vector3,
  heightAnchorY: number,
  sized: (size: number) => number,
): Partial<WorkplaneShape> {
  const turn = quaternionForShape(shape);
  const stretch = (own: THREE.Vector3) => {
    const axis = own.applyQuaternion(turn);
    return Math.hypot(axis.dot(frame.xAxis) * scaleX, axis.dot(frame.yAxis) * uniformScale, axis.dot(frame.zAxis) * scaleZ);
  };
  let widthScale = stretch(new THREE.Vector3(1, 0, 0));
  const heightScale = stretch(new THREE.Vector3(0, 1, 0));
  let depthScale = stretch(new THREE.Vector3(0, 0, 1));
  if (keepsRoundFootprint(shape)) {
    // The diameter takes the side that changes the most; the other one, across the stretch, keeps its size otherwise.
    const diameterScale = Math.abs(Math.log(widthScale)) >= Math.abs(Math.log(depthScale)) ? widthScale : depthScale;
    widthScale = depthScale = diameterScale;
  }
  const width = sized(shapeWidth(shape) * widthScale);
  const depth = sized(shapeDepth(shape) * depthScale);
  const height = Math.abs(heightScale - 1) < 1e-9 ? shape.height : sized(shape.height * heightScale);
  const patch: Partial<WorkplaneShape> = {
    ...scaledHorizontalShapePatch(shape, width / Math.max(MIN_SHAPE_SIZE, shapeWidth(shape)), depth / Math.max(MIN_SHAPE_SIZE, shapeDepth(shape))),
    ...(height !== shape.height ? { height } : {}),
    x: center.x,
    z: center.z,
    elevation: center.y - height / 2,
  };
  const startBottom = worldBoxOfShapes([shape]).min.y;
  const wantedBottom = heightAnchorY + (startBottom - heightAnchorY) * uniformScale;
  const delta = wantedBottom - worldBoxOfShapes([{ ...shape, ...patch } as WorkplaneShape]).min.y;
  return {
    ...patch,
    x: cleanNearZero(center.x, 0.0005),
    z: cleanNearZero(center.z, 0.0005),
    elevation: cleanNearZero(clamp((patch.elevation ?? 0) + delta, MIN_ELEVATION, MAX_ELEVATION), 0.0005),
  };
}
