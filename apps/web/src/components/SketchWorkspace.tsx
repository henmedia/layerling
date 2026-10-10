"use client";

import { AlignCenterHorizontal, AlignCenterVertical, Check, ChevronUp, CornerDownRight, Crop, Crosshair, Home, Link, Link2Off, LockKeyhole, LockKeyholeOpen, Minus, Plus, Ruler, RulerDimensionLine, Slash, Spline, Split, Trash2, Waves, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FocusEvent as ReactFocusEvent, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";
import { SnapGridControl } from "@/components/workplane/ShapeInspector";
import { SketchRevolvePreview } from "@/components/SketchRevolvePreview";
import { canApplySketchCornerTreatment } from "@/lib/sketchFilletChamfer";
import { t } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";
import { useMovablePanel, type MovablePanelOptions } from "@/lib/useMovablePanel";
import { parseMeasurementInput, resolveMeasurementInput } from "@/lib/measurementUnits";
import { applySegmentDimension, SEGMENT_DIMENSION_CENTER } from "@/lib/sketchDimensions";
import { applyCornerAngle, sketchCornerAt, type CornerTurn, type SketchCorner } from "@/lib/sketchAngles";
import { isSegmentCurved } from "@/lib/sketchSegmentCurve";
import { DEFAULT_SKETCH_BACKGROUND, DEFAULT_SKETCH_GRID_COLOR, DEFAULT_SKETCH_PLATE_COLOR, workplaneGridLayout } from "@/lib/workplaneGrid";
import { closestPointOnSketchSegment, type SketchSegmentPlacement } from "@/lib/sketchPointRefinement";
import { isSketchPanGesture, SKETCH_MANUAL_MAX_ZOOM, SKETCH_MAX_ZOOM, SKETCH_WHEEL_ZOOM_BOOST, SKETCH_MIN_ZOOM, sketchWheelZoomFactor, zoomSketchViewAt, type SketchView } from "@/lib/sketchPointerControls";
import { isSketchPrimitive, type SketchPrimitive } from "@/lib/sketchPrimitives";
import { mirrorSign, resizedImportedMeshPositions } from "@/lib/workplaneShapes";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE, keyboardNudgeStep, normalizeSnapGrid, normalizeWorkspaceSettings, snapGridStep as snapStep, orbitControlsZoomSpeed, zoomDistanceScale } from "@/lib/workplaneSettings";
import type { GridSize, SketchImage, SketchOperation, SketchPoint, SketchProfile, SketchSegment, SketchStroke, SketchStrokeAlign, SketchStrokeCap, SketchStrokeJoin, WorkplaneShape, WorkplaneWorkspaceSettings } from "@/types/layerling";
import { calibrateImage, centreImage, cropImage, imageAngleTo, imageCorners, imageCropViewBox, imageHandlePositions, imageRotateHandle, imageToWorld, normalizeImageRotation, resizeImage, rotateImage, uncropImage } from "@/lib/sketchImageTransform";
import { DEFAULT_SKETCH_STROKE, SKETCH_STROKE_ALIGNS, SKETCH_STROKE_CAPS, SKETCH_STROKE_JOINS } from "@/lib/sketchStroke";
import { selectWholeValue } from "@/lib/numberField";
import { GuideHelpLink } from "@/components/GuideHelpLink";
import { clampNudge, constrainToAxis, sketchSegmentDragPointIds, sketchSelectionMovePointIds, type SketchSelectableEntity, type SketchSelection } from "@/lib/sketchSelection";
import { closedPathAt, cubicPoint, curveControls, isInsideEdges, orderedPaths, pathEdges, type DisplayPath, type PlaneEdge } from "@/lib/sketchPaths";
import { capturePointer } from "@/lib/pointerCapture";
import { constrainToAngle, sketchLineAngle, sketchPolarPoint, splitTypedLine } from "@/lib/sketchPolar";

export type { SketchPrimitive } from "@/lib/sketchPrimitives";
export type SketchTool = "line" | "bezier" | "smooth" | SketchPrimitive | "select" | "refine" | "erase" | "measure";
export type { SketchSelection } from "@/lib/sketchSelection";
export type SketchMeasurement = { start: SketchPoint; end: SketchPoint } | null;

type SketchWorkspaceProps = {
  profile: SketchProfile;
  operation?: SketchOperation;
  revolvePreviewPositions?: number[] | null;
  referenceShapes: WorkplaneShape[];
  /** Where a workplane inside a body cuts it: the outline of the cut per body (id), as an SVG path of loops. */
  referenceSlices?: Record<string, string>;
  tool: SketchTool;
  activePointId: string | null;
  selected: SketchSelection;
  measurement: SketchMeasurement;
  pendingMeasurementStart: SketchPoint | null;
  initialSnap?: GridSize;
  initialWorkspace?: WorkplaneWorkspaceSettings;
  onPlanePoint: (point: { x: number; z: number }, handles?: { handleIn: { x: number; z: number }; handleOut: { x: number; z: number } }) => void;
  onAddPrimitive: (primitive: SketchPrimitive, center: { x: number; z: number }) => void;
  onPointPress: (id: string) => void;
  onSelectSegment: (id: string) => void;
  onSelectMany: (pointIds: string[], segmentIds: string[], imageIds: string[]) => void;
  /** Shift+click with Select: adds the point or line to the selection, or takes it out. */
  onToggleSelect: (entity: SketchSelectableEntity) => void;
  onSelectImage: (id: string) => void;
  onUpdateImage: (id: string, patch: Partial<SketchImage>, message?: string) => void;
  onDeleteImage: (id: string) => void;
  onDeletePoint: (id: string) => void;
  onDeleteSegment: (id: string) => void;
  onMovePoint: (id: string, point: { x: number; z: number }) => void;
  onTransformPoints: (points: SketchPoint[], message?: string) => void;
  onMoveHandle: (id: string, handle: "in" | "out", point: { x: number; z: number }) => void;
  onInsertPoint: (segmentId: string, point: { x: number; z: number }, amount: number) => void;
  onSetPointMode: (id: string, mode: "corner" | "smooth" | "split") => void;
  /** Bends a straight side into a curve with handles, or makes a curved side straight again. */
  onCurveSegment?: (id: string) => void;
  onStraightenSegment?: (id: string) => void;
  onApplyFillet?: (id: string, radius: number) => void;
  onApplyChamfer?: (id: string, distance: number) => void;
  onClearMeasurement: () => void;
  onMeasureTool: () => void;
  cornerDialog?: "fillet" | "chamfer" | null;
  onCornerDialogChange?: (dialog: "fillet" | "chamfer" | null) => void;
  /** The stroke panel (#154): open, its changes, and the stroked outline to show (an SVG path). */
  strokePanelOpen?: boolean;
  onCloseStrokePanel?: () => void;
  onStrokeChange?: (stroke: SketchStroke | undefined) => void;
  /** Leave the holes out (#197), set in the same panel. */
  onSilhouetteChange?: (silhouette: boolean) => void;
  strokePreview?: string | null;
};

type SketchReferenceFootprint = { fillD: string | null; outlineD: string | null };
type PointerAction =
  | { kind: "bezier"; pointerId: number; origin: { x: number; z: number }; current: { x: number; z: number } }
  | { kind: "move-point"; pointerId: number; pointId: string; origin: { x: number; z: number }; current: { x: number; z: number } }
  | { kind: "move-selection"; pointerId: number; origin: { x: number; z: number }; current: { x: number; z: number }; startPoints: SketchPoint[] }
  | { kind: "resize-selection"; pointerId: number; handle: ResizeHandle; current: { x: number; z: number }; startPoints: SketchPoint[]; bounds: SelectionBounds; proportional?: boolean; grab?: { x: number; z: number } }
  | { kind: "move-handle"; pointerId: number; pointId: string; handle: "in" | "out"; current: { x: number; z: number } }
  | { kind: "pan"; pointerId: number; clientX: number; clientY: number }
  | { kind: "marquee"; pointerId: number; origin: { x: number; z: number }; current: { x: number; z: number }; clientX: number; clientY: number }
  | { kind: "move-image"; pointerId: number; imageId: string; origin: { x: number; z: number }; current: { x: number; z: number }; start: SketchImage }
  | { kind: "resize-image"; pointerId: number; imageId: string; handle: ResizeHandle; current: { x: number; z: number }; start: SketchImage }
  | { kind: "rotate-image"; pointerId: number; imageId: string; startAngle: number; current: { x: number; z: number }; start: SketchImage; snap: boolean }
  | { kind: "crop-image"; pointerId: number; imageId: string; handle: ResizeHandle; current: { x: number; z: number }; start: SketchImage };

type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
type SelectionBounds = { minX: number; maxX: number; minZ: number; maxZ: number; width: number; depth: number; cx: number; cz: number };

const SKETCH_MEASUREMENTS_STORAGE_KEY = "layerling.sketch.measurements";

function snapValue(value: number, step: number) {
  return step > 0 ? Math.round(value / step) * step : value;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function boundsForSketchPoints(points: SketchPoint[]): SelectionBounds | null {
  if (points.length < 2) return null;
  const xs = points.map((point) => point.x);
  const zs = points.map((point) => point.z);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);
  return {
    minX,
    maxX,
    minZ,
    maxZ,
    width: maxX - minX,
    depth: maxZ - minZ,
    cx: (minX + maxX) / 2,
    cz: (minZ + maxZ) / 2,
  };
}

function translateSketchPoints(points: SketchPoint[], dx: number, dz: number) {
  return points.map((point) => ({
    ...point,
    x: point.x + dx,
    z: point.z + dz,
    handleIn: point.handleIn ? { x: point.handleIn.x + dx, z: point.handleIn.z + dz } : undefined,
    handleOut: point.handleOut ? { x: point.handleOut.x + dx, z: point.handleOut.z + dz } : undefined,
  }));
}

// The edge follows the pointer minus the gap the handle stands off it.
function resizeTarget(action: { current: { x: number; z: number }; grab?: { x: number; z: number } }) {
  return action.grab ? { x: action.current.x - action.grab.x, z: action.current.z - action.grab.z } : action.current;
}

function resizeSketchPoints(points: SketchPoint[], bounds: SelectionBounds, handle: ResizeHandle, current: { x: number; z: number }, proportional = false) {
  const minimum = 0.5;
  let minX = bounds.minX;
  let maxX = bounds.maxX;
  let minZ = bounds.minZ;
  let maxZ = bounds.maxZ;
  if (handle.includes("w")) minX = Math.min(current.x, bounds.maxX - minimum);
  if (handle.includes("e")) maxX = Math.max(current.x, bounds.minX + minimum);
  if (handle.includes("n")) minZ = Math.min(current.z, bounds.maxZ - minimum);
  if (handle.includes("s")) maxZ = Math.max(current.z, bounds.minZ + minimum);
  const width = Math.max(minimum, bounds.width);
  const depth = Math.max(minimum, bounds.depth);
  let scaleX = (maxX - minX) / width;
  let scaleZ = (maxZ - minZ) / depth;
  // Shift on a corner keeps the proportions (#168): both sides take the larger stretch, from the opposite corner.
  if (proportional && handle.length === 2) {
    const scale = Math.max(scaleX, scaleZ);
    scaleX = scale;
    scaleZ = scale;
    if (handle.includes("w")) minX = bounds.maxX - width * scale;
    else maxX = bounds.minX + width * scale;
    if (handle.includes("n")) minZ = bounds.maxZ - depth * scale;
    else maxZ = bounds.minZ + depth * scale;
  }
  const map = (value: { x: number; z: number }) => ({
    x: minX + (value.x - bounds.minX) * scaleX,
    z: minZ + (value.z - bounds.minZ) * scaleZ,
  });
  return points.map((point) => ({
    ...point,
    ...map(point),
    handleIn: point.handleIn ? map(point.handleIn) : undefined,
    handleOut: point.handleOut ? map(point.handleOut) : undefined,
  }));
}

function sketchSelectionBounds(selected: SketchSelection, profile: SketchProfile, images: SketchImage[], pointById: Map<string, SketchPoint>) {
  if (!selected) return null;
  const pointIds = selected.kind === "point" ? [selected.id] : selected.kind === "multiple" ? selected.pointIds : [];
  const segmentIds = selected.kind === "segment" ? [selected.id] : selected.kind === "multiple" ? selected.segmentIds : [];
  const imageIds = selected.kind === "image" ? [selected.id] : selected.kind === "multiple" ? selected.imageIds ?? [] : [];
  const extent: Array<{ x: number; z: number }> = [];
  pointIds.forEach((id) => {
    const point = pointById.get(id);
    if (point) extent.push(point);
  });
  segmentIds.forEach((id) => {
    const segment = profile.segments.find((entry) => entry.id === id);
    const start = segment && pointById.get(segment.startId);
    const end = segment && pointById.get(segment.endId);
    if (!segment || !start || !end) return;
    extent.push(start, end);
    if (segment.kind !== "line" && start.handleOut && end.handleIn) {
      for (let index = 1; index < 16; index += 1) extent.push(cubicPoint(start, start.handleOut, end.handleIn, end, index / 16));
    }
  });
  imageIds.forEach((id) => {
    const image = images.find((entry) => entry.id === id);
    if (!image) return;
    extent.push({ x: image.x - image.width / 2, z: image.z - image.depth / 2 }, { x: image.x + image.width / 2, z: image.z + image.depth / 2 });
  });
  if (extent.length === 0) return null;
  const xs = extent.map((point) => point.x);
  const zs = extent.map((point) => point.z);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs) };
}

/** Am rechten Rand angedockt wie die Einstellungen im 3D-Editor; weggezogen schweben sie. */
const IMAGE_SETTINGS_PANEL: MovablePanelOptions = {
  floatingStyle: { right: "auto", bottom: "auto" },
  dockedAt: (area, panel) => ({ left: area.width - panel.width, top: 0 }),
};

function formatDimension(value: number, accuracy: 1 | 2 | 3) {
  const threshold = 0.5 * 10 ** -accuracy;
  return (Math.abs(value) < threshold ? 0 : value).toFixed(accuracy);
}

function dimensionPillSize(label: string, screenUnit: number, extra = 24) {
  return {
    width: Math.max(48, label.length * 7.5 + extra) * screenUnit,
    height: 26 * screenUnit,
    radius: 5 * screenUnit,
  };
}

function segmentDimension(segment: SketchSegment, pointById: Map<string, SketchPoint>) {
  const start = pointById.get(segment.startId);
  const end = pointById.get(segment.endId);
  if (!start || !end) return null;
  const first = start.handleOut;
  const second = end.handleIn;
  if (segment.kind === "line" || !first || !second) {
    return {
      length: Math.hypot(end.x - start.x, end.z - start.z),
      midpoint: { x: (start.x + end.x) / 2, z: (start.z + end.z) / 2 },
      tangent: { x: end.x - start.x, z: end.z - start.z },
    };
  }
  let length = 0;
  let previous = start;
  for (let index = 1; index <= 32; index += 1) {
    const point = cubicPoint(start, first, second, end, index / 32);
    length += Math.hypot(point.x - previous.x, point.z - previous.z);
    previous = { ...point, id: "curve-sample" };
  }
  // Cubic derivative at t = 0.5.
  const tangent = {
    x: 0.75 * (first.x - start.x) + 1.5 * (second.x - first.x) + 0.75 * (end.x - second.x),
    z: 0.75 * (first.z - start.z) + 1.5 * (second.z - first.z) + 0.75 * (end.z - second.z),
  };
  return { length, midpoint: cubicPoint(start, first, second, end, 0.5), tangent };
}

function segmentsCross(a: { x: number; z: number }, b: { x: number; z: number }, c: { x: number; z: number }, d: { x: number; z: number }) {
  const side = (origin: { x: number; z: number }, to: { x: number; z: number }, point: { x: number; z: number }) =>
    (to.x - origin.x) * (point.z - origin.z) - (to.z - origin.z) * (point.x - origin.x);
  return (side(c, d, a) > 0) !== (side(c, d, b) > 0) && (side(a, b, c) > 0) !== (side(a, b, d) > 0);
}

// Unit normal at `midpoint` pointing away from the sketch body: out of a closed
// shape when one side is inside it, otherwise away from the sketch's centre.
function outwardNormal(
  midpoint: { x: number; z: number },
  tangent: { x: number; z: number },
  edges: PlaneEdge[],
  centroid: { x: number; z: number },
  probe: number,
) {
  const length = Math.hypot(tangent.x, tangent.z);
  if (length < 1e-9) return null;
  const normal = { x: -tangent.z / length, z: tangent.x / length };
  const plusInside = isInsideEdges({ x: midpoint.x + normal.x * probe, z: midpoint.z + normal.z * probe }, edges);
  const minusInside = isInsideEdges({ x: midpoint.x - normal.x * probe, z: midpoint.z - normal.z * probe }, edges);
  const flip = plusInside !== minusInside
    ? plusInside
    : (midpoint.x - centroid.x) * normal.x + (midpoint.z - centroid.z) * normal.z < 0;
  return flip ? { x: -normal.x, z: -normal.z } : normal;
}

function pathData(path: DisplayPath) {
  const first = path.points[0];
  if (!first) return "";
  const commands = [`M ${first.x} ${first.z}`];
  path.steps.forEach((step) => {
    const controls = curveControls(step);
    if (step.segment.kind !== "line" && controls.first && controls.second) {
      commands.push(`C ${controls.first.x} ${controls.first.z} ${controls.second.x} ${controls.second.z} ${step.to.x} ${step.to.z}`);
    } else {
      commands.push(`L ${step.to.x} ${step.to.z}`);
    }
  });
  if (path.closed) commands.push("Z");
  return commands.join(" ");
}

function segmentData(segment: SketchSegment, pointById: Map<string, SketchPoint>) {
  const from = pointById.get(segment.startId);
  const to = pointById.get(segment.endId);
  if (!from || !to) return "";
  const step = { segment, from, to };
  const controls = curveControls(step);
  return segment.kind !== "line" && controls.first && controls.second
    ? `M ${from.x} ${from.z} C ${controls.first.x} ${controls.first.z} ${controls.second.x} ${controls.second.z} ${to.x} ${to.z}`
    : `M ${from.x} ${from.z} L ${to.x} ${to.z}`;
}

const REFERENCE_SNAP_PX = 10;

/** The corner points of an SVG path made of M, L and Z only - as the reference outlines are. */
function svgPathPoints(d: string) {
  const numbers = (d.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? []).map(Number);
  const points: Array<{ x: number; z: number }> = [];
  for (let index = 0; index + 1 < numbers.length; index += 2) points.push({ x: numbers[index], z: numbers[index + 1] });
  return points;
}

/** A point turned as SVG's rotate(degrees cx cz) turns it. */
function rotateAround(point: { x: number; z: number }, degrees: number, cx: number, cz: number) {
  if (!degrees) return point;
  const angle = (degrees * Math.PI) / 180;
  const dx = point.x - cx;
  const dz = point.z - cz;
  return { x: cx + dx * Math.cos(angle) - dz * Math.sin(angle), z: cz + dx * Math.sin(angle) + dz * Math.cos(angle) };
}

function isRoundReference(shape: WorkplaneShape) {
  return ["cylinder", "sphere", "cone", "torus", "tube", "ring", "halfSphere"].includes(shape.kind);
}

function sketchReferencePoint(shape: WorkplaneShape, x: number, z: number) {
  return {
    x: shape.x + x * mirrorSign(shape.mirrorX),
    z: shape.z + z * mirrorSign(shape.mirrorZ),
  };
}

function pointKey(point: { x: number; z: number }, tolerance: number) {
  return `${Math.round(point.x / tolerance)},${Math.round(point.z / tolerance)}`;
}

function triangleArea2d(a: { x: number; z: number }, b: { x: number; z: number }, c: { x: number; z: number }) {
  return Math.abs((b.x - a.x) * (c.z - a.z) - (c.x - a.x) * (b.z - a.z)) / 2;
}

function trianglePath(points: Array<{ x: number; z: number }>) {
  return `M ${points[0].x} ${points[0].z} L ${points[1].x} ${points[1].z} L ${points[2].x} ${points[2].z} Z`;
}

function convexHull(points: Array<{ x: number; z: number }>) {
  const unique = new Map<string, { x: number; z: number }>();
  points.forEach((point) => unique.set(pointKey(point, 0.001), point));
  const sorted = [...unique.values()].sort((a, b) => a.x === b.x ? a.z - b.z : a.x - b.x);
  if (sorted.length <= 2) return sorted;
  const cross = (origin: { x: number; z: number }, a: { x: number; z: number }, b: { x: number; z: number }) =>
    (a.x - origin.x) * (b.z - origin.z) - (a.z - origin.z) * (b.x - origin.x);
  const lower: Array<{ x: number; z: number }> = [];
  sorted.forEach((point) => {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) lower.pop();
    lower.push(point);
  });
  const upper: Array<{ x: number; z: number }> = [];
  [...sorted].reverse().forEach((point) => {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) upper.pop();
    upper.push(point);
  });
  lower.pop();
  upper.pop();
  return [...lower, ...upper];
}

function boundaryPath(points: Array<{ x: number; z: number }>, triangles: number[][], tolerance: number) {
  const pointByKey = new Map<string, { x: number; z: number }>();
  const edgeCounts = new Map<string, { count: number; a: string; b: string }>();
  const addEdge = (aIndex: number, bIndex: number) => {
    const a = points[aIndex];
    const b = points[bIndex];
    const aKey = pointKey(a, tolerance);
    const bKey = pointKey(b, tolerance);
    pointByKey.set(aKey, a);
    pointByKey.set(bKey, b);
    const key = aKey < bKey ? `${aKey}|${bKey}` : `${bKey}|${aKey}`;
    const current = edgeCounts.get(key);
    edgeCounts.set(key, current ? { ...current, count: current.count + 1 } : { count: 1, a: aKey, b: bKey });
  };
  triangles.forEach(([a, b, c]) => {
    addEdge(a, b);
    addEdge(b, c);
    addEdge(c, a);
  });

  const boundaryEdges = [...edgeCounts.values()].filter((edge) => edge.count === 1);
  if (boundaryEdges.length === 0) return null;
  const adjacency = new Map<string, string[]>();
  boundaryEdges.forEach(({ a, b }) => {
    adjacency.set(a, [...(adjacency.get(a) ?? []), b]);
    adjacency.set(b, [...(adjacency.get(b) ?? []), a]);
  });
  const unused = new Set(boundaryEdges.map(({ a, b }) => (a < b ? `${a}|${b}` : `${b}|${a}`)));
  const takeEdge = (a: string, b: string) => unused.delete(a < b ? `${a}|${b}` : `${b}|${a}`);
  const hasEdge = (a: string, b: string) => unused.has(a < b ? `${a}|${b}` : `${b}|${a}`);
  const commands: string[] = [];

  while (unused.size > 0) {
    const firstKey = unused.values().next().value as string;
    const [start, firstNext] = firstKey.split("|");
    const chain = [start, firstNext];
    takeEdge(start, firstNext);
    while (chain.length <= boundaryEdges.length + 1) {
      const current = chain[chain.length - 1];
      const previous = chain[chain.length - 2];
      const next = (adjacency.get(current) ?? []).find((candidate) => candidate !== previous && hasEdge(current, candidate))
        ?? (adjacency.get(current) ?? []).find((candidate) => hasEdge(current, candidate));
      if (!next) break;
      takeEdge(current, next);
      chain.push(next);
      if (next === start) break;
    }
    const startPoint = pointByKey.get(chain[0]);
    if (!startPoint) continue;
    const pointsD = chain
      .slice(1)
      .map((key) => pointByKey.get(key))
      .filter((point): point is { x: number; z: number } => Boolean(point))
      .map((point) => `L ${point.x} ${point.z}`);
    commands.push(`M ${startPoint.x} ${startPoint.z} ${pointsD.join(" ")}${chain[chain.length - 1] === chain[0] ? " Z" : ""}`);
  }

  return commands.join(" ");
}

function importedMeshFootprint(shape: WorkplaneShape): SketchReferenceFootprint | null {
  if (!shape.importedMesh) return null;
  const positions = resizedImportedMeshPositions(shape);
  if (positions.length < 9) return null;
  let minY = Number.POSITIVE_INFINITY;
  for (let index = 1; index < positions.length; index += 3) {
    minY = Math.min(minY, positions[index]);
  }
  if (!Number.isFinite(minY)) return null;

  const tolerance = Math.max(0.001, Math.max(shape.width, shape.depth, shape.height) / 100000);
  const bottomTolerance = Math.max(0.025, shape.height * 0.003);
  const points: Array<{ x: number; z: number }> = [];
  const triangles: number[][] = [];
  const allProjected: Array<{ x: number; z: number }> = [];

  for (let index = 0; index + 8 < positions.length; index += 9) {
    const ys = [positions[index + 1], positions[index + 4], positions[index + 7]];
    const projected = [
      sketchReferencePoint(shape, positions[index], positions[index + 2]),
      sketchReferencePoint(shape, positions[index + 3], positions[index + 5]),
      sketchReferencePoint(shape, positions[index + 6], positions[index + 8]),
    ];
    allProjected.push(...projected);
    if (!ys.every((value) => value <= minY + bottomTolerance) || triangleArea2d(projected[0], projected[1], projected[2]) <= tolerance) {
      continue;
    }
    const offset = points.length;
    points.push(...projected);
    triangles.push([offset, offset + 1, offset + 2]);
  }

  if (triangles.length > 0) {
    return {
      fillD: triangles.length <= 5000 ? triangles.map((triangle) => trianglePath(triangle.map((index) => points[index]))).join(" ") : null,
      outlineD: boundaryPath(points, triangles, tolerance),
    };
  }

  const hull = convexHull(allProjected);
  if (hull.length < 3) return null;
  const d = `M ${hull[0].x} ${hull[0].z} ${hull.slice(1).map((point) => `L ${point.x} ${point.z}`).join(" ")} Z`;
  return { fillD: d, outlineD: d };
}

export function SketchWorkspace({
  profile,
  operation = "extrude",
  revolvePreviewPositions = null,
  referenceShapes,
  referenceSlices,
  tool,
  activePointId,
  selected,
  measurement,
  pendingMeasurementStart,
  initialSnap,
  initialWorkspace,
  onPlanePoint,
  onAddPrimitive,
  onPointPress,
  onSelectSegment,
  onSelectMany,
  onToggleSelect,
  onSelectImage,
  onUpdateImage,
  onDeleteImage,
  onDeletePoint,
  onDeleteSegment,
  onMovePoint,
  onTransformPoints,
  onMoveHandle,
  onInsertPoint,
  onSetPointMode,
  onCurveSegment,
  onStraightenSegment,
  onApplyFillet,
  onApplyChamfer,
  onClearMeasurement,
  onMeasureTool,
  cornerDialog: propCornerDialog,
  onCornerDialogChange,
  strokePanelOpen = false,
  onCloseStrokePanel,
  onStrokeChange,
  onSilhouetteChange,
  strokePreview = null,
}: SketchWorkspaceProps) {
  useLanguage();
  const workspace = useMemo(() => normalizeWorkspaceSettings(initialWorkspace, DEFAULT_WORKPLANE_WORKSPACE), [initialWorkspace]);
  const [snap, setSnap] = useState<GridSize>(() => normalizeSnapGrid(initialSnap, DEFAULT_SNAP_GRID));
  const [snapOpen, setSnapOpen] = useState(false);
  const [view, setView] = useState<SketchView>({ zoom: 1, pan: { x: 0, z: 0 } });
  const { zoom, pan } = view;
  const [hover, setHover] = useState<{ x: number; z: number } | null>(null);
  const lastPointerRef = useRef<{ clientX: number; clientY: number } | null>(null);
  const [refinePreview, setRefinePreview] = useState<{ segmentId: string; placement: SketchSegmentPlacement } | null>(null);
  const [pointerAction, setPointerAction] = useState<PointerAction | null>(null);
  // The reference image's crop mode and calibration (#216): both belong to the selected image.
  const [cropMode, setCropMode] = useState(false);
  const [calibration, setCalibration] = useState<{ imageId: string; points: Array<{ x: number; z: number }> } | null>(null);
  const [showMeasurements, setShowMeasurements] = useState(true);
  useEffect(() => {
    try {
      if (window.localStorage.getItem(SKETCH_MEASUREMENTS_STORAGE_KEY) === "off") setShowMeasurements(false);
    } catch {
      // Without storage the switch simply starts on.
    }
  }, []);
  const toggleMeasurements = () => {
    setShowMeasurements((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(SKETCH_MEASUREMENTS_STORAGE_KEY, next ? "on" : "off");
      } catch {
        // Not remembered, but it applies now.
      }
      return next;
    });
  };
  const [svgSize, setSvgSize] = useState({ width: 0, height: 0 });
  const svgRef = useRef<SVGSVGElement | null>(null);
  const wrapRef = useRef<HTMLElement | null>(null);
  // Width or height of the selected shape, while its value is typed (#168).
  const [editingBoxSize, setEditingBoxSize] = useState<{ axis: "x" | "z"; value: string; sketchPos: { x: number; z: number } } | null>(null);
  const boxSizeEditDoneRef = useRef(false);
  const [editingDimension, setEditingDimension] = useState<{
    segmentId: string;
    value: string;
    sketchPos: { x: number; z: number };
  } | null>(null);
  // The angle at the selected corner, while its value is typed: which line turns is shown and can be switched.
  const [editingAngle, setEditingAngle] = useState<{
    pointId: string;
    value: string;
    turn: CornerTurn;
    sketchPos: { x: number; z: number };
  } | null>(null);
  // Length and angle typed while a line is drawn (#194): a digit opens the two fields at the
  // line, "<" or Tab moves between them, Enter sets the next point there.
  const [typedLine, setTypedLine] = useState<{
    length: string;
    angle: string;
    field: "length" | "angle";
    sketchPos: { x: number; z: number };
  } | null>(null);
  const typedLineLengthRef = useRef<HTMLInputElement>(null);
  const typedLineAngleRef = useRef<HTMLInputElement>(null);
  const hoverRef = useRef(hover);
  const width = workspace.width / zoom;
  const depth = workspace.depth / zoom;
  const screenUnit = useMemo(() => {
    const fittedScale = Math.min(
      svgSize.width > 0 ? svgSize.width / width : 0,
      svgSize.height > 0 ? svgSize.height / depth : 0,
    );
    return fittedScale > 0 ? 1 / fittedScale : Math.max(width, depth) / 720;
  }, [depth, svgSize.height, svgSize.width, width]);
  const displayProfile = useMemo(() => {
    if (pointerAction?.kind === "move-selection") {
      const moved = translateSketchPoints(
        pointerAction.startPoints,
        pointerAction.current.x - pointerAction.origin.x,
        pointerAction.current.z - pointerAction.origin.z,
      );
      const movedById = new Map(moved.map((point) => [point.id, point]));
      return { ...profile, points: profile.points.map((point) => movedById.get(point.id) ?? point) };
    }
    if (pointerAction?.kind === "resize-selection") {
      const resized = resizeSketchPoints(pointerAction.startPoints, pointerAction.bounds, pointerAction.handle, resizeTarget(pointerAction), pointerAction.proportional);
      const resizedById = new Map(resized.map((point) => [point.id, point]));
      return { ...profile, points: profile.points.map((point) => resizedById.get(point.id) ?? point) };
    }
    if (pointerAction?.kind === "move-point") {
      const source = profile.points.find((point) => point.id === pointerAction.pointId);
      if (!source) return profile;
      const deltaX = pointerAction.current.x - source.x;
      const deltaZ = pointerAction.current.z - source.z;
      return {
        ...profile,
        points: profile.points.map((point) => point.id === source.id ? {
          ...point,
          ...pointerAction.current,
          handleIn: point.handleIn ? { x: point.handleIn.x + deltaX, z: point.handleIn.z + deltaZ } : undefined,
          handleOut: point.handleOut ? { x: point.handleOut.x + deltaX, z: point.handleOut.z + deltaZ } : undefined,
        } : point),
      };
    }
    if (pointerAction?.kind === "move-handle") {
      return {
        ...profile,
        points: profile.points.map((point) => {
          if (point.id !== pointerAction.pointId) return point;
          const next = { ...point, handleIn: point.handleIn ? { ...point.handleIn } : undefined, handleOut: point.handleOut ? { ...point.handleOut } : undefined };
          if (pointerAction.handle === "in") next.handleIn = { ...pointerAction.current };
          else next.handleOut = { ...pointerAction.current };
          if (point.mode === "smooth") {
            const opposite = { x: point.x * 2 - pointerAction.current.x, z: point.z * 2 - pointerAction.current.z };
            if (pointerAction.handle === "in") next.handleOut = opposite;
            else next.handleIn = opposite;
          }
          return next;
        }),
      };
    }
    return profile;
  }, [pointerAction, profile]);
  const displayImages = useMemo(() => {
    const images = profile.images ?? [];
    if (pointerAction?.kind === "move-image") {
      const deltaX = pointerAction.current.x - pointerAction.origin.x;
      const deltaZ = pointerAction.current.z - pointerAction.origin.z;
      return images.map((image) => image.id === pointerAction.imageId ? { ...image, x: pointerAction.start.x + deltaX, z: pointerAction.start.z + deltaZ } : image);
    }
    if (pointerAction?.kind === "resize-image") {
      return images.map((image) => image.id === pointerAction.imageId ? { ...image, ...resizeImage(pointerAction.start, pointerAction.handle, pointerAction.current) } : image);
    }
    if (pointerAction?.kind === "rotate-image") {
      return images.map((image) => image.id === pointerAction.imageId ? { ...image, ...rotateImage(pointerAction.start, pointerAction.startAngle, pointerAction.current, pointerAction.snap) } : image);
    }
    if (pointerAction?.kind === "crop-image") {
      return images.map((image) => image.id === pointerAction.imageId ? { ...image, ...cropImage(pointerAction.start, pointerAction.handle, pointerAction.current) } : image);
    }
    return images;
  }, [pointerAction, profile.images]);
  const pointById = useMemo(() => new Map(displayProfile.points.map((point) => [point.id, point])), [displayProfile.points]);
  const paths = useMemo(() => orderedPaths(displayProfile), [displayProfile]);
  const closedEdges = useMemo(() => pathEdges(paths.filter((path) => path.closed)), [paths]);
  const allEdges = useMemo(() => pathEdges(paths), [paths]);
  const profileCentroid = useMemo(() => {
    const count = Math.max(1, displayProfile.points.length);
    return {
      x: displayProfile.points.reduce((sum, point) => sum + point.x, 0) / count,
      z: displayProfile.points.reduce((sum, point) => sum + point.z, 0) / count,
    };
  }, [displayProfile.points]);
  const activePoint = activePointId ? pointById.get(activePointId) ?? null : null;
  const selectedPoint = selected?.kind === "point"
    ? pointById.get(selected.id) ?? null
    : selected?.kind === "multiple" && selected.pointIds.length === 1 && selected.segmentIds.length === 0
      ? pointById.get(selected.pointIds[0]) ?? null
      : null;
  // A single side that is selected: it can be curved, and a curved one shows its two handles.
  const selectedSegment = selected?.kind === "segment" ? displayProfile.segments.find((segment) => segment.id === selected.id) ?? null : null;
  const selectedSegmentCurved = selectedSegment ? isSegmentCurved(displayProfile, selectedSegment) : false;
  const selectedImage = selected?.kind === "image" ? displayImages.find((image) => image.id === selected.id) ?? null : null;
  const selectedImageId = selectedImage?.id ?? null;
  useEffect(() => {
    setCropMode(false);
    setCalibration(null);
  }, [selectedImageId]);
  useEffect(() => {
    if (!cropMode && !calibration) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setCalibration(null);
      setCropMode(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [calibration, cropMode]);
  const selectedGeometryPoints = selected?.kind === "multiple"
    ? selected.pointIds.map((id) => pointById.get(id)).filter((point): point is SketchPoint => Boolean(point))
    : [];
  const selectedGeometryBounds = boundsForSketchPoints(selectedGeometryPoints);
  const isPointSelected = (id: string) => selected?.kind === "point" ? selected.id === id : selected?.kind === "multiple" ? selected.pointIds.includes(id) : false;
  const isSegmentSelected = (id: string) => selected?.kind === "segment" ? selected.id === id : selected?.kind === "multiple" ? selected.segmentIds.includes(id) : false;
  const [localCornerDialog, setLocalCornerDialog] = useState<"fillet" | "chamfer" | null>(null);
  const activeCornerDialog = propCornerDialog !== undefined ? propCornerDialog : localCornerDialog;
  const setCornerDialog = useCallback((dialog: "fillet" | "chamfer" | null) => {
    setLocalCornerDialog(dialog);
    onCornerDialogChange?.(dialog);
  }, [onCornerDialogChange]);
  const [cornerValue, setCornerValue] = useState("2");

  useEffect(() => {
    setCornerDialog(null);
    setCornerValue("2");
  }, [selectedPoint?.id, setCornerDialog]);

  const handleApplyCorner = () => {
    if (!selectedPoint || !activeCornerDialog) return;
    const val = parseMeasurementInput(cornerValue);
    if (!Number.isFinite(val) || val <= 0) return;
    if (activeCornerDialog === "fillet") {
      onApplyFillet?.(selectedPoint.id, val);
    } else if (activeCornerDialog === "chamfer") {
      onApplyChamfer?.(selectedPoint.id, val);
    }
    setCornerDialog(null);
  };

  // Ein Enter, dem das Verschwinden des Felds noch ein blur hinterherschickt,
  // darf die Laenge nicht zweimal setzen - und Escape gar nicht.
  const dimensionEditDoneRef = useRef(false);
  const startDimensionEdit = useCallback((segmentId: string, value: string, sketchPos: { x: number; z: number }) => {
    dimensionEditDoneRef.current = false;
    setEditingDimension({ segmentId, value, sketchPos });
  }, []);

  const cancelDimensionEdit = useCallback(() => {
    dimensionEditDoneRef.current = true;
    setEditingDimension(null);
  }, []);

  /**
   * Die Laenge steht in der Skizze immer in Millimetern, also wird sie auch so
   * gelesen - bei Zoll machte "40" sonst 40 Zoll daraus. Es bleibt der
   * Anfangspunkt stehen, oder - ist ein Endpunkt markiert - der andere Punkt,
   * so dass der markierte wandert. Mit Alt waechst die Linie zu beiden Seiten.
   */
  const commitDimensionEdit = useCallback((symmetric = false) => {
    if (!editingDimension || dimensionEditDoneRef.current) return;
    dimensionEditDoneRef.current = true;
    const length = parseMeasurementInput(editingDimension.value);
    const segment = profile.segments.find((entry) => entry.id === editingDimension.segmentId);
    if (segment && Number.isFinite(length) && length > 0.001) {
      const anchor = symmetric
        ? SEGMENT_DIMENSION_CENTER
        : selectedPoint?.id === segment.endId ? segment.startId
        : selectedPoint?.id === segment.startId ? segment.endId
        : segment.startId;
      const updatedPoints = applySegmentDimension(segment, profile.points, length, anchor);
      if (updatedPoints !== profile.points) onTransformPoints(updatedPoints, t("sketch.dimensionUpdated"));
    }
    setEditingDimension(null);
  }, [editingDimension, profile.segments, profile.points, selectedPoint, onTransformPoints]);

  // A typed width or height stretches the selection along that axis only, from its left or top edge.
  const commitBoxSizeEdit = useCallback(() => {
    if (!editingBoxSize || boxSizeEditDoneRef.current) return;
    boxSizeEditDoneRef.current = true;
    if (selected?.kind === "multiple") {
      const startPoints = selected.pointIds.map((id) => profile.points.find((entry) => entry.id === id)).filter((entry): entry is SketchPoint => Boolean(entry));
      const bounds = boundsForSketchPoints(startPoints);
      if (bounds) {
        const current = editingBoxSize.axis === "x" ? bounds.width : bounds.depth;
        const size = resolveMeasurementInput(editingBoxSize.value, current);
        if (Number.isFinite(size) && size > 0) {
          const target = editingBoxSize.axis === "x" ? { x: bounds.minX + size, z: bounds.maxZ } : { x: bounds.maxX, z: bounds.minZ + size };
          onTransformPoints(resizeSketchPoints(startPoints, bounds, editingBoxSize.axis === "x" ? "e" : "s", target), t("sketch.shapeResized"));
        }
      }
    }
    setEditingBoxSize(null);
  }, [editingBoxSize, onTransformPoints, profile.points, selected]);

  const angleEditDoneRef = useRef(false);
  const startAngleEdit = useCallback((pointId: string, value: string, sketchPos: { x: number; z: number }) => {
    angleEditDoneRef.current = false;
    setEditingAngle({ pointId, value, turn: "after", sketchPos });
  }, []);
  const cancelAngleEdit = useCallback(() => {
    angleEditDoneRef.current = true;
    setEditingAngle(null);
  }, []);
  // The typed angle turns one of the corner's two lines about the corner; the other stays.
  const commitAngleEdit = useCallback((turnOverride?: CornerTurn) => {
    if (!editingAngle || angleEditDoneRef.current) return;
    angleEditDoneRef.current = true;
    const degrees = parseMeasurementInput(editingAngle.value);
    const corner = sketchCornerAt(profile, editingAngle.pointId);
    if (corner && Number.isFinite(degrees)) {
      const updatedPoints = applyCornerAngle(profile.points, corner, degrees, turnOverride ?? editingAngle.turn);
      if (updatedPoints !== profile.points) onTransformPoints(updatedPoints, t("sketch.angleUpdated"));
    }
    setEditingAngle(null);
  }, [editingAngle, profile, onTransformPoints]);

  const getOverlayPos = useCallback((sketchPos: { x: number; z: number }) => {
    const svg = svgRef.current;
    const wrap = wrapRef.current;
    if (!svg || !wrap) return null;
    const matrix = svg.getScreenCTM();
    if (!matrix) return null;
    const pt = svg.createSVGPoint();
    pt.x = sketchPos.x;
    pt.y = sketchPos.z;
    const screenPt = pt.matrixTransform(matrix);
    const wrapRect = wrap.getBoundingClientRect();
    return {
      x: screenPt.x - wrapRect.left,
      y: screenPt.y - wrapRect.top,
    };
  }, []);

  useEffect(() => {
    setEditingDimension(null);
    setEditingAngle(null);
  }, [selected, tool]);
  useEffect(() => {
    setTypedLine(null);
  }, [activePointId, tool]);
  useEffect(() => {
    hoverRef.current = hover;
  }, [hover]);
  useEffect(() => {
    if (!typedLine) return;
    (typedLine.field === "angle" ? typedLineAngleRef : typedLineLengthRef).current?.focus();
  }, [typedLine?.field, typedLine !== null]); // eslint-disable-line react-hooks/exhaustive-deps
  const gridLayout = workplaneGridLayout(workspace);
  const gridStep = gridLayout.step;
  // Counted from the origin, like the plate's own grid: a stronger line every
  // fifth millimetre step, or on every whole inch.
  const gridLineClass = (value: number) => (Math.abs(value) < 0.0001 ? "axis" : Math.round(value / gridStep) % gridLayout.majorInterval === 0 ? "major" : "minor");
  const verticalLines = useMemo(() => {
    const lines: number[] = [];
    const start = Math.ceil((-workspace.width / 2) / gridStep) * gridStep;
    for (let x = start; x <= workspace.width / 2 + 0.0001; x += gridStep) lines.push(Number(x.toFixed(6)));
    return lines;
  }, [gridStep, workspace.width]);
  const horizontalLines = useMemo(() => {
    const lines: number[] = [];
    const start = Math.ceil((-workspace.depth / 2) / gridStep) * gridStep;
    for (let z = start; z <= workspace.depth / 2 + 0.0001; z += gridStep) lines.push(Number(z.toFixed(6)));
    return lines;
  }, [gridStep, workspace.depth]);

  const unsnappedPointFromEvent = (event: { clientX: number; clientY: number }) => {
    const svg = svgRef.current;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return null;
    const screenPoint = svg.createSVGPoint();
    screenPoint.x = event.clientX;
    screenPoint.y = event.clientY;
    const local = screenPoint.matrixTransform(matrix.inverse());
    return { x: local.x, z: local.y };
  };

  // Shift while drawing turns the new line to the nearest 15°, horizontal and vertical among
  // them (#194); dragging with Shift still keeps to one axis.
  const constrainDrawing = (origin: { x: number; z: number }, point: { x: number; z: number }) =>
    constrainToAngle(origin, point, 15, snapStep(snap));

  const pointFromEvent = (event: { clientX: number; clientY: number }) => {
    const local = unsnappedPointFromEvent(event);
    if (!local) return null;
    // Near a corner of another body shown underneath, a drawn or dragged point takes that
    // corner instead of the grid (#189). Not while a whole selection moves: its grip is
    // wherever it was taken, so the corner would only make it jump.
    if (!pointerAction || pointerAction.kind === "move-point") {
      const reach = REFERENCE_SNAP_PX * screenUnit;
      let nearest: { x: number; z: number } | null = null;
      let nearestDistance = reach;
      referenceSnapPoints.forEach((candidate) => {
        const distance = Math.hypot(candidate.x - local.x, candidate.z - local.z);
        if (distance <= nearestDistance) {
          nearest = candidate;
          nearestDistance = distance;
        }
      });
      if (nearest) return { ...(nearest as { x: number; z: number }) };
    }
    const step = snapStep(snap);
    return {
      x: clamp(snapValue(local.x, step), -workspace.width / 2, workspace.width / 2),
      z: clamp(snapValue(local.z, step), -workspace.depth / 2, workspace.depth / 2),
    };
  };

  useEffect(() => {
    if (tool !== "refine") setRefinePreview(null);
  }, [tool]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const updateSize = () => {
      const bounds = svg.getBoundingClientRect();
      setSvgSize({ width: bounds.width, height: bounds.height });
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);

  const beginPan = (event: ReactPointerEvent<SVGElement>) => {
    event.preventDefault();
    event.stopPropagation();
    capturePointer(svgRef.current, event.pointerId);
    setPointerAction({ kind: "pan", pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY });
  };

  const handlePanPointerDownCapture = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (isSketchPanGesture(event)) beginPan(event);
  };

  const handlePlanePointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button === 1) {
      beginPan(event);
      return;
    }
    if (event.button !== 0 || (event.target !== event.currentTarget && (event.target as Element).closest("[data-sketch-entity]"))) return;
    const point = pointFromEvent(event);
    if (!point) return;
    event.preventDefault();
    if (tool === "bezier") {
      capturePointer(event.currentTarget, event.pointerId);
      const startPoint = event.shiftKey && activePoint ? constrainDrawing(activePoint, point) : point;
      setPointerAction({ kind: "bezier", pointerId: event.pointerId, origin: startPoint, current: startPoint });
    } else if (tool === "select") {
      capturePointer(event.currentTarget, event.pointerId);
      setPointerAction({ kind: "marquee", pointerId: event.pointerId, origin: point, current: point, clientX: event.clientX, clientY: event.clientY });
    } else if (tool === "line" || tool === "smooth" || tool === "measure") {
      const clickPoint = event.shiftKey && activePoint && ["line", "smooth"].includes(tool)
        ? constrainDrawing(activePoint, point)
        : event.shiftKey && pendingMeasurementStart && tool === "measure"
        ? constrainDrawing(pendingMeasurementStart, point)
        : point;
      onPlanePoint(clickPoint);
    }
  };

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    lastPointerRef.current = { clientX: event.clientX, clientY: event.clientY };
    if (pointerAction?.kind === "pan") {
      const matrix = svgRef.current?.getScreenCTM();
      const scaleX = matrix ? Math.max(0.0001, Math.hypot(matrix.a, matrix.b)) : 1;
      const scaleY = matrix ? Math.max(0.0001, Math.hypot(matrix.c, matrix.d)) : 1;
      const deltaX = event.clientX - pointerAction.clientX;
      const deltaY = event.clientY - pointerAction.clientY;
      setView((current) => ({
        ...current,
        pan: {
          x: clamp(current.pan.x - deltaX / scaleX, -workspace.width / 2, workspace.width / 2),
          z: clamp(current.pan.z - deltaY / scaleY, -workspace.depth / 2, workspace.depth / 2),
        },
      }));
      setPointerAction({ ...pointerAction, clientX: event.clientX, clientY: event.clientY });
      return;
    }
    const point = pointFromEvent(event);
    const drawingOrigin =
      !pointerAction && activePoint && ["line", "bezier", "smooth"].includes(tool)
        ? activePoint
        : !pointerAction && pendingMeasurementStart && tool === "measure"
        ? pendingMeasurementStart
        : null;
    const hoverPoint = event.shiftKey && drawingOrigin && point ? constrainDrawing(drawingOrigin, point) : point;
    setHover(hoverPoint);
    if (point && pointerAction) {
      // Shift held while a point, a line or a selection is being dragged keeps the
      // move on one axis, as on the workplane. Pressing it only starts a drag
      // from selecting, so it is looked at here, while the pointer moves.
      const lockOrigin = pointerAction.kind === "move-point" || pointerAction.kind === "move-selection" || pointerAction.kind === "bezier"
        ? pointerAction.origin
        : null;
      setPointerAction({
        ...pointerAction,
        current: event.shiftKey && lockOrigin ? constrainToAxis(lockOrigin, point) : point,
        ...(pointerAction.kind === "resize-selection" ? { proportional: event.shiftKey } : {}),
        ...(pointerAction.kind === "rotate-image" ? { snap: event.shiftKey } : {}),
      } as PointerAction);
    }
  };

  const finishPointerAction = (event: ReactPointerEvent<SVGSVGElement>) => {
    const action = pointerAction;
    if (!action || action.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (action.kind === "pan") {
      setPointerAction(null);
      return;
    }
    if (action.kind === "marquee") {
      // A click without dragging inside a closed shape selects the whole shape.
      const clicked = Math.hypot(event.clientX - action.clientX, event.clientY - action.clientY) < 4;
      const clickPoint = clicked ? unsnappedPointFromEvent(event) : null;
      const shape = clickPoint ? closedPathAt(clickPoint, paths) : null;
      if (shape) {
        onSelectMany(shape.points.map((point) => point.id), shape.steps.map((step) => step.segment.id), []);
        setPointerAction(null);
        return;
      }
      const minX = Math.min(action.origin.x, action.current.x);
      const maxX = Math.max(action.origin.x, action.current.x);
      const minZ = Math.min(action.origin.z, action.current.z);
      const maxZ = Math.max(action.origin.z, action.current.z);
      const contains = (point: { x: number; z: number }) => point.x >= minX && point.x <= maxX && point.z >= minZ && point.z <= maxZ;
      const pointIds = profile.points.filter(contains).map((point) => point.id);
      const segmentIds = profile.segments.filter((segment) => {
        const start = pointById.get(segment.startId);
        const end = pointById.get(segment.endId);
        return Boolean(start && end && (contains(start) || contains(end) || contains({ x: (start.x + end.x) / 2, z: (start.z + end.z) / 2 })));
      }).map((segment) => segment.id);
      onSelectMany(pointIds, segmentIds, []);
      setPointerAction(null);
      return;
    }
    if (action.kind === "bezier") {
      const dx = action.current.x - action.origin.x;
      const dz = action.current.z - action.origin.z;
      onPlanePoint(action.origin, {
        handleIn: { x: action.origin.x - dx, z: action.origin.z - dz },
        handleOut: { x: action.origin.x + dx, z: action.origin.z + dz },
      });
    } else if (action.kind === "move-selection") {
      // A click on a line, without dragging, only selects it.
      if (action.current.x === action.origin.x && action.current.z === action.origin.z) {
        setPointerAction(null);
        return;
      }
      onTransformPoints(
        translateSketchPoints(action.startPoints, action.current.x - action.origin.x, action.current.z - action.origin.z),
        t("sketch.shapeMoved"),
      );
    } else if (action.kind === "resize-selection") {
      onTransformPoints(resizeSketchPoints(action.startPoints, action.bounds, action.handle, resizeTarget(action), action.proportional), t("sketch.shapeResized"));
    } else if (action.kind === "move-point") {
      onMovePoint(action.pointId, action.current);
    } else if (action.kind === "move-handle") {
      onMoveHandle(action.pointId, action.handle, action.current);
    } else if (action.kind === "move-image") {
      onUpdateImage(action.imageId, {
        x: action.start.x + action.current.x - action.origin.x,
        z: action.start.z + action.current.z - action.origin.z,
      }, t("sketch.imageMoved"));
    } else if (action.kind === "resize-image") {
      onUpdateImage(action.imageId, resizeImage(action.start, action.handle, action.current), t("sketch.imageResized"));
    } else if (action.kind === "rotate-image") {
      onUpdateImage(action.imageId, rotateImage(action.start, action.startAngle, action.current, action.snap), t("sketch.imageRotated"));
    } else if (action.kind === "crop-image") {
      onUpdateImage(action.imageId, cropImage(action.start, action.handle, action.current), t("sketch.imageCropped"));
    }
    setPointerAction(null);
  };

  const handleWheel = (event: ReactWheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    const offset = { x: event.clientX - (bounds.left + bounds.width / 2), y: event.clientY - (bounds.top + bounds.height / 2) };
    const pixelsPerUnit = Math.min(bounds.width / workspace.width, bounds.height / workspace.depth);
    const factor = sketchWheelZoomFactor(event, orbitControlsZoomSpeed(workspace.zoomSpeed) * SKETCH_WHEEL_ZOOM_BOOST);
    setView((current) => zoomSketchViewAt(current, factor, offset, pixelsPerUnit, workspace));
  };

  // Matches the 3D editor's buttons: a fixed step raised by the configured zoom speed.
  const zoomByButton = (distanceStep: number) => {
    const scaled = zoomDistanceScale(distanceStep, workspace.zoomSpeed);
    setView((current) => ({ ...current, zoom: clamp(current.zoom / scaled, SKETCH_MIN_ZOOM, SKETCH_MANUAL_MAX_ZOOM) }));
  };

  const resetView = useCallback(() => setView({ zoom: 1, pan: { x: 0, z: 0 } }), []);

  const focusBounds = useMemo(
    () => sketchSelectionBounds(selected, displayProfile, displayImages, pointById),
    [displayImages, displayProfile, pointById, selected],
  );

  // Like the 3D editor's Shift+F: frame the selection with a little room around it.
  const focusSelection = useCallback(() => {
    if (!focusBounds) return;
    const margin = 1.3;
    // A lone point or a tiny selection has next to no extent; a quarter of the
    // plate keeps it in context instead of diving straight to the maximum zoom.
    const minimumSpan = Math.max(workspace.width, workspace.depth) / 4;
    const spanX = Math.max((focusBounds.maxX - focusBounds.minX) * margin, minimumSpan);
    const spanZ = Math.max((focusBounds.maxZ - focusBounds.minZ) * margin, minimumSpan);
    setView({
      zoom: clamp(Math.min(workspace.width / spanX, workspace.depth / spanZ), SKETCH_MIN_ZOOM, SKETCH_MAX_ZOOM),
      pan: {
        x: clamp((focusBounds.minX + focusBounds.maxX) / 2, -workspace.width / 2, workspace.width / 2),
        z: clamp((focusBounds.minZ + focusBounds.maxZ) / 2, -workspace.depth / 2, workspace.depth / 2),
      },
    });
  }, [focusBounds, workspace.depth, workspace.width]);

  useEffect(() => {
    const syncShiftConstrain = (shiftKey: boolean) => {
      if (!lastPointerRef.current) return;
      const point = pointFromEvent(lastPointerRef.current);
      if (!point) return;
      const drawingOrigin =
        !pointerAction && activePoint && ["line", "bezier", "smooth"].includes(tool)
          ? activePoint
          : !pointerAction && pendingMeasurementStart && tool === "measure"
          ? pendingMeasurementStart
          : null;
      const hoverPoint = shiftKey && drawingOrigin ? constrainDrawing(drawingOrigin, point) : point;
      setHover(hoverPoint);
      if (pointerAction) {
        const lockOrigin = pointerAction.kind === "move-point" || pointerAction.kind === "move-selection" || pointerAction.kind === "bezier"
          ? pointerAction.origin
          : null;
        if (lockOrigin) {
          setPointerAction((prev) => prev ? { ...prev, current: shiftKey ? constrainToAxis(lockOrigin, point) : point } : null);
        } else if (pointerAction.kind === "resize-selection") {
          setPointerAction((prev) => prev?.kind === "resize-selection" ? { ...prev, proportional: shiftKey } : prev);
        }
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Shift") {
        syncShiftConstrain(true);
      }
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (activePoint && !pointerAction && (tool === "line" || tool === "smooth") && /^[0-9.,<]$/.test(event.key)) {
        event.preventDefault();
        const pointer = hoverRef.current;
        setTypedLine({
          length: event.key === "<" ? "" : event.key,
          angle: "",
          field: event.key === "<" ? "angle" : "length",
          sketchPos: pointer ? { x: (activePoint.x + pointer.x) / 2, z: (activePoint.z + pointer.z) / 2 } : activePoint,
        });
        return;
      }
      if (event.key.toLowerCase() === "f" && event.shiftKey) {
        event.preventDefault();
        focusSelection();
      } else if (event.key.toLowerCase() === "f" || event.key === "Home") {
        event.preventDefault();
        resetView();
      } else if (tool === "select" && !pointerAction && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
        // Fine moves, as on the workplane: one grid step, or a coarser one with
        // Shift. What moves is the selection - points, the ends of lines, an image.
        const step = keyboardNudgeStep(snap, event.shiftKey);
        const dx = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
        const dz = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
        if (selected?.kind === "image") {
          const image = (profile.images ?? []).find((entry) => entry.id === selected.id);
          if (!image || image.locked) return;
          event.preventDefault();
          onUpdateImage(image.id, {
            x: clamp(image.x + dx, -workspace.width / 2, workspace.width / 2),
            z: clamp(image.z + dz, -workspace.depth / 2, workspace.depth / 2),
          }, t("sketch.imageMoved"));
          return;
        }
        const moving = new Set(sketchSelectionMovePointIds(profile, selected));
        const startPoints = profile.points.filter((point) => moving.has(point.id));
        if (!startPoints.length) return;
        event.preventDefault();
        const allowed = clampNudge(startPoints, dx, dz, workspace.width / 2, workspace.depth / 2);
        if (allowed.dx === 0 && allowed.dz === 0) return;
        onTransformPoints(translateSketchPoints(startPoints, allowed.dx, allowed.dz), t("sketch.shapeMoved"));
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Shift") {
        syncShiftConstrain(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [activePoint, focusSelection, onTransformPoints, onUpdateImage, pendingMeasurementStart, pointerAction, profile, resetView, selected, snap, tool, workspace.depth, workspace.width]);

  const beginEntityDrag = (event: ReactPointerEvent<SVGElement>, action: PointerAction) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    capturePointer(svgRef.current, event.pointerId);
    setPointerAction(action);
  };

  const measurementLength = measurement ? Math.hypot(measurement.end.x - measurement.start.x, measurement.end.z - measurement.start.z) : 0;
  const measurementLabel = formatDimension(measurementLength, workspace.accuracy);
  // What the typed fields make of the next line: the angle left empty follows the pointer.
  const pointerAngle = activePoint && hover ? sketchLineAngle(activePoint, hover) : 0;
  const typedLineTarget = (() => {
    if (!typedLine || !activePoint) return null;
    const length = parseMeasurementInput(typedLine.length);
    if (!Number.isFinite(length) || length <= 0.001) return null;
    const typedAngle = typedLine.angle.trim() ? parseMeasurementInput(typedLine.angle) : pointerAngle;
    return Number.isFinite(typedAngle) ? sketchPolarPoint(activePoint, length, typedAngle) : null;
  })();
  const typedLineOffPlate = Boolean(typedLineTarget && (Math.abs(typedLineTarget.x) > workspace.width / 2 + 1e-6 || Math.abs(typedLineTarget.z) > workspace.depth / 2 + 1e-6));
  const commitTypedLine = () => {
    if (!typedLineTarget || typedLineOffPlate) return;
    setTypedLine(null);
    onPlanePoint(typedLineTarget);
  };
  const previewEnd = typedLineTarget ?? hover;
  const previewLength = activePoint && previewEnd ? Math.hypot(previewEnd.x - activePoint.x, previewEnd.z - activePoint.z) : 0;
  const previewAngle = activePoint && previewEnd ? sketchLineAngle(activePoint, previewEnd) : 0;
  const previewLabel = `${formatDimension(previewLength, workspace.accuracy)}  ${Math.round(previewAngle * 10) / 10}°`;
  const labelOffset = 22 * screenUnit;
  const pointRadius = 5 * screenUnit;
  const controlPointRadius = 6 * screenUnit;
  const hoverPointRadius = 5 * screenUnit;
  const handleSize = 12 * screenUnit;
  const handleRadius = 2 * screenUnit;
  // A turned picture (#216): its frame is the turned rectangle, the box round it only places the labels.
  const selectedImageCorners = selectedImage ? imageCorners(selectedImage) : null;
  const selectedImageBounds = selectedImageCorners ? {
    minX: Math.min(...selectedImageCorners.map((corner) => corner.x)),
    maxX: Math.max(...selectedImageCorners.map((corner) => corner.x)),
    minZ: Math.min(...selectedImageCorners.map((corner) => corner.z)),
    maxZ: Math.max(...selectedImageCorners.map((corner) => corner.z)),
  } : null;
  const imageResizeHandles: Array<{ id: ResizeHandle; x: number; z: number }> = selectedImage && !selectedImage.locked ? imageHandlePositions(selectedImage) : [];
  const imageRotateHandlePoint = selectedImage && !selectedImage.locked && !cropMode ? imageRotateHandle(selectedImage, 22 * screenUnit) : null;
  const imageTopMiddle = selectedImage ? imageToWorld(selectedImage, { x: 0, z: -selectedImage.depth / 2 }) : null;
  const imageCalibration = calibration && selectedImage && calibration.imageId === selectedImage.id ? calibration : null;
  // The frame stands a little off the shape, so a corner handle never sits on the
  // corner point of a rectangle and hides behind it (#168).
  const selectionFrameGap = handleSize;
  const selectionFrame = selectedGeometryBounds ? {
    minX: selectedGeometryBounds.minX - selectionFrameGap,
    maxX: selectedGeometryBounds.maxX + selectionFrameGap,
    minZ: selectedGeometryBounds.minZ - selectionFrameGap,
    maxZ: selectedGeometryBounds.maxZ + selectionFrameGap,
  } : null;
  const selectionResizeHandles: Array<{ id: ResizeHandle; x: number; z: number; grab: { x: number; z: number } }> = selectedGeometryBounds && selectionFrame ? ([
    // Corners stretch both ways (Shift keeps the proportions), the sides one way only (#168).
    { id: "nw", x: selectionFrame.minX, z: selectionFrame.minZ },
    { id: "n", x: selectedGeometryBounds.cx, z: selectionFrame.minZ },
    { id: "ne", x: selectionFrame.maxX, z: selectionFrame.minZ },
    { id: "e", x: selectionFrame.maxX, z: selectedGeometryBounds.cz },
    { id: "se", x: selectionFrame.maxX, z: selectionFrame.maxZ },
    { id: "s", x: selectedGeometryBounds.cx, z: selectionFrame.maxZ },
    { id: "sw", x: selectionFrame.minX, z: selectionFrame.maxZ },
    { id: "w", x: selectionFrame.minX, z: selectedGeometryBounds.cz },
  ] as Array<{ id: ResizeHandle; x: number; z: number }>).map((handle) => ({
    ...handle,
    // How far the handle stands off the edge it moves; taken off the pointer while dragging.
    grab: {
      x: handle.id.includes("w") ? -selectionFrameGap : handle.id.includes("e") ? selectionFrameGap : 0,
      z: handle.id.includes("n") ? -selectionFrameGap : handle.id.includes("s") ? selectionFrameGap : 0,
    },
  })) : [];
  // Dimensions of the selected line, or of the lines meeting at the selected point.
  // Each label starts just off its segment; one that would cover a label placed
  // before it moves further out along its extension lines until it is clear.
  const placedPills: Array<{ minX: number; maxX: number; minZ: number; maxZ: number }> = [];
  const dimensionLayouts = displayProfile.segments.filter((segment) => !showMeasurements ? false : selected?.kind === "segment"
    ? segment.id === selected.id
    : selectedPoint ? segment.startId === selectedPoint.id || segment.endId === selectedPoint.id : false,
  ).flatMap((segment) => {
    const dimension = segmentDimension(segment, pointById);
    const start = pointById.get(segment.startId);
    const end = pointById.get(segment.endId);
    if (!dimension || !start || !end) return [];
    const preferred = outwardNormal(dimension.midpoint, dimension.tangent, closedEdges, profileCentroid, 2 * screenUnit);
    if (!preferred) return [];
    const curved = segment.kind !== "line" && Boolean(start.handleOut && end.handleIn);
    const label = formatDimension(dimension.length, workspace.accuracy);
    const pill = dimensionPillSize(label, screenUnit, 18);
    const anchor = curved ? dimension.midpoint : { x: (start.x + end.x) / 2, z: (start.z + end.z) / 2 };
    // Far enough out that the level pill clears the segment it measures.
    const pillReach = Math.abs(preferred.x) * pill.width / 2 + Math.abs(preferred.z) * pill.height / 2;
    const baseOffset = Math.max(34 * screenUnit, pillReach + 14 * screenUnit);
    const gap = 4 * screenUnit;
    const overshoot = 10 * screenUnit;
    // Where the dimension runs: both ends of a line, or points along a curve, each
    // with the normal there on the chosen side, so a curve's dimension follows it.
    type Vector = { x: number; z: number };
    const curvePoints = curved && start.handleOut && end.handleIn
      ? Array.from({ length: 33 }, (_, index) => cubicPoint(start, start.handleOut!, end.handleIn!, end, index / 32))
      : null;
    const samplesFor = (normal: Vector): Array<{ point: Vector; normal: Vector }> => {
      if (!curvePoints) return [{ point: start, normal }, { point: end, normal }];
      const side = -dimension.tangent.z * normal.x + dimension.tangent.x * normal.z >= 0 ? 1 : -1;
      return curvePoints.map((point, index) => {
        const before = curvePoints[Math.max(0, index - 1)];
        const after = curvePoints[Math.min(curvePoints.length - 1, index + 1)];
        const length = Math.hypot(after.x - before.x, after.z - before.z);
        return {
          point,
          normal: length > 1e-9 ? { x: (-(after.z - before.z) / length) * side, z: ((after.x - before.x) / length) * side } : normal,
        };
      });
    };
    // How badly a side is obstructed: sketch lines crossed by the extension lines
    // (and the midpoint's), and a curve offset past its own centre, which turns the
    // dimension inside out - a small hole has no room for a dimension inside it.
    const obstruction = (normal: Vector) => {
      const samples = samplesFor(normal);
      const rays = [samples[0], { point: anchor, normal }, samples[samples.length - 1]].map(({ point, normal: direction }) => [
        { x: point.x + direction.x * gap, z: point.z + direction.z * gap },
        { x: point.x + direction.x * (baseOffset + overshoot), z: point.z + direction.z * (baseOffset + overshoot) },
      ]);
      let crossings = 0;
      rays.forEach(([from, to]) => allEdges.forEach((edge) => {
        if (segmentsCross(from, to, edge.from, edge.to)) crossings += 1;
      }));
      const inverted = samples.slice(1).some((sample, index) => {
        const previous = samples[index];
        const along = { x: sample.point.x - previous.point.x, z: sample.point.z - previous.point.z };
        const offsetAlong = {
          x: along.x + (sample.normal.x - previous.normal.x) * baseOffset,
          z: along.z + (sample.normal.z - previous.normal.z) * baseOffset,
        };
        return along.x * offsetAlong.x + along.z * offsetAlong.z < 0;
      });
      return crossings + (inverted ? 1000 : 0);
    };
    const opposite = { x: -preferred.x, z: -preferred.z };
    const preferredObstruction = obstruction(preferred);
    const normal = preferredObstruction > 0 && obstruction(opposite) < preferredObstruction ? opposite : preferred;
    const padding = 3 * screenUnit;
    const pillRect = (distance: number) => {
      const x = anchor.x + normal.x * distance;
      const z = anchor.z + normal.z * distance;
      return { minX: x - pill.width / 2 - padding, maxX: x + pill.width / 2 + padding, minZ: z - pill.height / 2 - padding, maxZ: z + pill.height / 2 + padding };
    };
    const overlaps = (rect: ReturnType<typeof pillRect>) =>
      placedPills.some((other) => rect.minX < other.maxX && rect.maxX > other.minX && rect.minZ < other.maxZ && rect.maxZ > other.minZ);
    let offset = baseOffset;
    for (let guard = 0; guard < 60 && overlaps(pillRect(offset)); guard += 1) offset += 4 * screenUnit;
    placedPills.push(pillRect(offset));
    const labelPosition = { x: anchor.x + normal.x * offset, z: anchor.z + normal.z * offset };
    const samples = samplesFor(normal);
    return [{ segment, label, pill, offset, labelPosition, samples, curved }];
  });
  // The angle at a corner, drawn as an arc between its two lines with the degrees beside it.
  const angleDisplay = (corner: SketchCorner) => {
    const lengths = [corner.before.far, corner.after.far].map((far) => Math.hypot(far.x - corner.point.x, far.z - corner.point.z));
    const radius = Math.max(8 * screenUnit, Math.min(34 * screenUnit, Math.min(...lengths) * 0.4));
    const steps = 28;
    const arc = Array.from({ length: steps + 1 }, (_, index) => {
      const angle = corner.startAngle + (corner.sweep * index) / steps;
      return { x: corner.point.x + Math.cos(angle) * radius, z: corner.point.z + Math.sin(angle) * radius };
    });
    const middle = corner.startAngle + corner.sweep / 2;
    const rounded = Math.round(corner.degrees * 10) / 10;
    const label = `${rounded}°`;
    const pill = dimensionPillSize(label, screenUnit, 18);
    const reach = radius + Math.max(pill.width, pill.height) / 2 + 6 * screenUnit;
    return {
      corner,
      arc,
      label,
      pill,
      labelPosition: { x: corner.point.x + Math.cos(middle) * reach, z: corner.point.z + Math.sin(middle) * reach },
    };
  };
  // The selected corner, and the corners at the far ends of its two lines: moving the point
  // changes all three angles, so all three are shown and can be typed (#149).
  const cornerAngles = (() => {
    if (!showMeasurements || !selectedPoint) return [];
    const corner = sketchCornerAt(displayProfile, selectedPoint.id);
    if (!corner) return [];
    const neighbours = [corner.before.far, corner.after.far]
      .map((far) => sketchCornerAt(displayProfile, far.id))
      .filter((entry): entry is SketchCorner => Boolean(entry));
    return [{ ...angleDisplay(corner), primary: true }, ...neighbours.map((entry) => ({ ...angleDisplay(entry), primary: false }))];
  })();
  // The corner whose angle is being typed, for the line that will turn.
  const editingCorner = editingAngle ? sketchCornerAt(displayProfile, editingAngle.pointId) : null;
  const referenceFootprints = useMemo(
    () => new Map(referenceShapes.map((shape) => [shape.id, importedMeshFootprint(shape)])),
    [referenceShapes],
  );
  // The corners of the bodies shown underneath, in sketch coordinates: where a point snaps to them.
  const referenceSnapPoints = useMemo(() => {
    const points: Array<{ x: number; z: number }> = [];
    referenceShapes.filter((shape) => !shape.hidden).forEach((shape) => {
      const slice = referenceSlices?.[shape.id];
      if (slice) {
        points.push(...svgPathPoints(slice));
        return;
      }
      const turn = (point: { x: number; z: number }) => rotateAround(point, shape.rotation ?? 0, shape.x, shape.z);
      const footprint = referenceFootprints.get(shape.id);
      const halfWidth = shape.width / 2;
      const halfDepth = shape.depth / 2;
      const local = footprint?.outlineD
        ? svgPathPoints(footprint.outlineD)
        : isRoundReference(shape)
          ? [{ x: shape.x, z: shape.z }, { x: shape.x - halfWidth, z: shape.z }, { x: shape.x + halfWidth, z: shape.z }, { x: shape.x, z: shape.z - halfDepth }, { x: shape.x, z: shape.z + halfDepth }]
          : [{ x: shape.x, z: shape.z }, { x: shape.x - halfWidth, z: shape.z - halfDepth }, { x: shape.x + halfWidth, z: shape.z - halfDepth }, { x: shape.x + halfWidth, z: shape.z + halfDepth }, { x: shape.x - halfWidth, z: shape.z + halfDepth }];
      points.push(...local.map(turn));
    });
    // Rounded, so a corner at 0 is 0 and not 7e-15.
    return points.map((point) => ({ x: Number(point.x.toFixed(4)) || 0, z: Number(point.z.toFixed(4)) || 0 }));
  }, [referenceFootprints, referenceShapes, referenceSlices]);
  const hoverOnReference = hover ? referenceSnapPoints.some((point) => point.x === hover.x && point.z === hover.z) : false;

  // Colours picked in the settings reach the light theme through variables; the stylesheet
  // falls back to its own colours for what was not changed, and the dark themes ignore them.
  const sketchColorStyle = {
    ...(workspace.sketchBackground !== DEFAULT_SKETCH_BACKGROUND ? { "--sketch-bg": workspace.sketchBackground } : {}),
    // The area under the grid, which had no setting of its own (#143).
    ...(workspace.sketchPlateColor && workspace.sketchPlateColor !== DEFAULT_SKETCH_PLATE_COLOR ? { "--sketch-plate": workspace.sketchPlateColor } : {}),
    ...(workspace.sketchGridColor !== DEFAULT_SKETCH_GRID_COLOR
      ? {
          "--sketch-grid-minor": `color-mix(in srgb, ${workspace.sketchGridColor} 46%, transparent)`,
          "--sketch-grid-major": `color-mix(in srgb, ${workspace.sketchGridColor} 68%, transparent)`,
          "--sketch-grid-axis": workspace.sketchGridColor,
        }
      : {}),
  } as CSSProperties;

  return (
    <main className="sketch-workspace-stage" style={sketchColorStyle}>
      <div className="sketch-mode-badge">{operation === "revolve" ? t("sketch.modeBadgeRevolve") : t("sketch.modeBadge")}</div>
      {operation === "revolve" ? <SketchRevolvePreview positions={revolvePreviewPositions} /> : null}
      <div className="camera-controls sketch-camera-controls" aria-label={t("sketch.viewControls")}>
        <button aria-label={t("sketch.resetView")} aria-keyshortcuts="F" title={t("camera.shortcut", { label: t("sketch.resetView"), keys: "F" })} onClick={resetView}><Home size={28} /></button>
        <button
          aria-label={t("camera.focusSelection")}
          aria-keyshortcuts="Shift+F"
          title={t("camera.shortcut", { label: t("camera.focusSelection"), keys: "Shift+F" })}
          disabled={!focusBounds}
          onClick={focusSelection}
        >
          <Crosshair size={28} />
        </button>
        <button aria-label={t("sketch.zoomIn")} onClick={() => zoomByButton(0.8)}><Plus size={33} /></button>
        <button aria-label={t("sketch.zoomOut")} onClick={() => zoomByButton(1.25)}><Minus size={33} /></button>
        <button
          className={tool === "measure" ? "active" : ""}
          aria-label={t("camera.tapeTools")}
          title={t("camera.tapeTools")}
          aria-pressed={tool === "measure"}
          onClick={onMeasureTool}
        >
          <RulerDimensionLine size={26} strokeWidth={2.2} aria-hidden="true" />
        </button>
        <button
          className={showMeasurements ? "active" : ""}
          aria-label={t("sketch.showMeasurements")}
          title={t("sketch.showMeasurements")}
          aria-pressed={showMeasurements}
          onClick={toggleMeasurements}
        >
          <Ruler size={26} strokeWidth={2.2} aria-hidden="true" />
        </button>
      </div>
      <section ref={wrapRef} className="sketch-plate-wrap" aria-label="2D sketch plate">
        <svg
          ref={svgRef}
          className={`sketch-plate tool-${tool} ${pointerAction?.kind === "pan" ? "panning" : ""}`}
          viewBox={`${pan.x - width / 2} ${pan.z - depth / 2} ${width} ${depth}`}
          preserveAspectRatio="xMidYMid meet"
          onPointerDownCapture={handlePanPointerDownCapture}
          onPointerDown={handlePlanePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishPointerAction}
          onPointerCancel={() => setPointerAction(null)}
          onPointerLeave={() => {
            lastPointerRef.current = null;
            if (!pointerAction) setHover(null);
            setRefinePreview(null);
          }}
          onWheel={handleWheel}
          onContextMenu={(event) => event.preventDefault()}
          onDragOver={(event) => {
            if (!event.dataTransfer.types.includes("application/x-layerling-sketch-primitive")) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = "copy";
          }}
          onDrop={(event) => {
            const primitive = event.dataTransfer.getData("application/x-layerling-sketch-primitive");
            if (!isSketchPrimitive(primitive)) return;
            event.preventDefault();
            const point = pointFromEvent(event);
            if (point) onAddPrimitive(primitive, point);
          }}
        >
          <rect className="sketch-plate-background" x={-workspace.width / 2} y={-workspace.depth / 2} width={workspace.width} height={workspace.depth} />
          {workspace.showGrid ? (
            <g className="sketch-grid" pointerEvents="none">
              {verticalLines.map((x) => <line className={gridLineClass(x)} key={`x-${x}`} x1={x} y1={-workspace.depth / 2} x2={x} y2={workspace.depth / 2} />)}
              {horizontalLines.map((z) => <line className={gridLineClass(z)} key={`z-${z}`} x1={-workspace.width / 2} y1={z} x2={workspace.width / 2} y2={z} />)}
            </g>
          ) : null}
          {operation === "revolve" ? (
            <g className="sketch-revolve-guide" pointerEvents="none">
              <rect x={0} y={-workspace.depth / 2} width={workspace.width / 2} height={workspace.depth} />
              <line x1={0} y1={-workspace.depth / 2} x2={0} y2={workspace.depth / 2} />
              <text x={-5 * screenUnit} y={-workspace.depth / 2 + 18 * screenUnit} fontSize={12 * screenUnit}>{t("sketch.revolveAxis")}</text>
            </g>
          ) : null}
          <g className="sketch-reference-images">
            {displayImages.map((image) => (
              // Turned about its centre and, when cropped, shown through a window onto the part that is left (#216).
              <g key={image.id} transform={image.rotation ? `rotate(${-image.rotation} ${image.x} ${image.z})` : undefined}>
              <svg
                x={image.x - image.width / 2}
                y={image.z - image.depth / 2}
                width={image.width}
                height={image.depth}
                viewBox={imageCropViewBox(image).join(" ")}
                preserveAspectRatio="none"
                overflow="hidden"
                pointerEvents="none"
              >
              <image
                data-sketch-entity={image.locked ? undefined : "image"}
                className={image.locked ? "locked" : undefined}
                aria-label={image.name}
                href={image.dataUrl}
                x={0}
                y={0}
                width={Math.max(1, image.pixelWidth)}
                height={Math.max(1, image.pixelHeight)}
                opacity={image.opacity ?? 0.55}
                preserveAspectRatio="none"
                pointerEvents={tool === "select" ? "auto" : "none"}
                onPointerDown={(event) => {
                  // Calibrating (#216): the next two clicks on the picture mark the distance to type.
                  if (calibration && calibration.imageId === image.id && event.button === 0 && tool === "select") {
                    event.preventDefault();
                    event.stopPropagation();
                    const mark = unsnappedPointFromEvent(event);
                    if (mark && calibration.points.length < 2) setCalibration({ ...calibration, points: [...calibration.points, mark] });
                    return;
                  }
                  // A locked image is out of the way: a click goes through to the plate
                  // below, so lines and points on it can be picked and a frame can be
                  // dragged. Alt+click still selects it, to unlock it again.
                  if (image.locked && event.button === 0 && !event.altKey) return;
                  event.preventDefault();
                  event.stopPropagation();
                  if (event.button === 1) {
                    beginPan(event);
                    return;
                  }
                  if (event.button !== 0 || tool !== "select") return;
                  onSelectImage(image.id);
                  if (image.locked) return;
                  const point = pointFromEvent(event);
                  if (!point) return;
                  beginEntityDrag(event, {
                    kind: "move-image",
                    pointerId: event.pointerId,
                    imageId: image.id,
                    origin: point,
                    current: point,
                    start: { ...image },
                  });
                }}
              />
              </svg>
              </g>
            ))}
          </g>
          <g className="sketch-reference-shapes" pointerEvents="none">
            {referenceShapes.filter((shape) => !shape.hidden).map((shape) => {
              const footprint = referenceFootprints.get(shape.id);
              const slice = referenceSlices?.[shape.id];
              if (slice) {
                return (
                  <g key={shape.id}>
                    <path className="sketch-reference-mesh-face" fillRule="evenodd" d={slice} />
                    <path className="sketch-reference-mesh-outline" d={slice} />
                  </g>
                );
              }
              return (
                <g key={shape.id} transform={`rotate(${shape.rotation ?? 0} ${shape.x} ${shape.z})`}>
                  {footprint?.fillD || footprint?.outlineD ? (
                    <>
                      {footprint.fillD ? <path className="sketch-reference-mesh-face" d={footprint.fillD} /> : null}
                      {footprint.outlineD ? <path className="sketch-reference-mesh-outline" d={footprint.outlineD} /> : null}
                    </>
                  ) : isRoundReference(shape) ? (
                    <ellipse cx={shape.x} cy={shape.z} rx={shape.width / 2} ry={shape.depth / 2} />
                  ) : (
                    <rect x={shape.x - shape.width / 2} y={shape.z - shape.depth / 2} width={shape.width} height={shape.depth} />
                  )}
                </g>
              );
            })}
          </g>
          <rect className="sketch-plate-border" x={-workspace.width / 2} y={-workspace.depth / 2} width={workspace.width} height={workspace.depth} pointerEvents="none" />
          {pointerAction?.kind === "marquee" ? (
            <rect
              className="sketch-selection-marquee"
              x={Math.min(pointerAction.origin.x, pointerAction.current.x)}
              y={Math.min(pointerAction.origin.z, pointerAction.current.z)}
              width={Math.abs(pointerAction.current.x - pointerAction.origin.x)}
              height={Math.abs(pointerAction.current.z - pointerAction.origin.z)}
              pointerEvents="none"
            />
          ) : null}
          <g className={`sketch-profile-fills ${profile.stroke ? "stroked" : ""}`} pointerEvents="none">
            {paths.some((path) => path.closed) ? <path d={paths.filter((path) => path.closed).map(pathData).join(" ")} /> : null}
          </g>
          {profile.stroke && strokePreview ? (
            // What the body will be: the drawn line with its width (#154).
            <path className="sketch-stroke-preview" d={strokePreview} fillRule="evenodd" pointerEvents="none" />
          ) : null}
          <g className="sketch-segments">
            {displayProfile.segments.map((segment) => (
              <path
                data-sketch-entity="segment"
                data-segment-id={segment.id}
                className={isSegmentSelected(segment.id) ? "selected" : ""}
                key={segment.id}
                d={segmentData(segment, pointById)}
                onPointerMove={(event) => {
                  if (tool !== "refine") return;
                  const target = pointFromEvent(event);
                  const start = pointById.get(segment.startId);
                  const end = pointById.get(segment.endId);
                  if (!target || !start || !end) return;
                  setRefinePreview({ segmentId: segment.id, placement: closestPointOnSketchSegment(segment, start, end, target) });
                }}
                onPointerLeave={() => {
                  if (tool === "refine") setRefinePreview((current) => current?.segmentId === segment.id ? null : current);
                }}
                onPointerDown={(event) => {
                  const point = pointFromEvent(event);
                  event.preventDefault();
                  event.stopPropagation();
                  if (event.button === 1) beginPan(event);
                  else if (tool === "erase") onDeleteSegment(segment.id);
                  else if (event.button === 0 && tool === "refine" && point) {
                    const start = pointById.get(segment.startId);
                    const end = pointById.get(segment.endId);
                    if (start && end) {
                      const placement = closestPointOnSketchSegment(segment, start, end, point);
                      onInsertPoint(segment.id, placement.point, placement.amount);
                    }
                  }
                  else if (event.button === 0 && tool === "select" && event.shiftKey) {
                    onToggleSelect({ kind: "segment", id: segment.id });
                  }
                  else if (event.button === 0 && tool === "select" && point) {
                    // A line is moved by its two ends; one that belongs to a larger
                    // selection moves all of it. The line is selected as it is grabbed.
                    const moving = new Set(sketchSegmentDragPointIds(profile, selected, segment.id));
                    if (!(selected?.kind === "multiple" && selected.segmentIds.includes(segment.id))) onSelectSegment(segment.id);
                    const startPoints = profile.points
                      .filter((entry) => moving.has(entry.id))
                      .map((entry) => ({ ...entry, handleIn: entry.handleIn ? { ...entry.handleIn } : undefined, handleOut: entry.handleOut ? { ...entry.handleOut } : undefined }));
                    beginEntityDrag(event, { kind: "move-selection", pointerId: event.pointerId, origin: point, current: point, startPoints });
                  } else if (event.button === 0) onSelectSegment(segment.id);
                }}
              />
            ))}
          </g>
          {tool === "refine" && refinePreview ? (
            <circle
              className="sketch-cursor-point"
              cx={refinePreview.placement.point.x}
              cy={refinePreview.placement.point.z}
              r={hoverPointRadius}
              opacity={0.72}
              pointerEvents="none"
            />
          ) : null}
          <g className="sketch-segment-dimensions" pointerEvents="none">
            {dimensionLayouts.map(({ segment, label, pill, offset, labelPosition, samples, curved }) => {
              const shift = ({ point, normal }: (typeof samples)[number], distance: number) => ({ x: point.x + normal.x * distance, z: point.z + normal.z * distance });
              const gap = 4 * screenUnit;
              const overshoot = 10 * screenUnit;
              const arrowLength = 9 * screenUnit;
              const arrowWidth = 3.5 * screenUnit;
              const arrowhead = (tip: { x: number; z: number }, from: { x: number; z: number }) => {
                const length = Math.max(1e-9, Math.hypot(tip.x - from.x, tip.z - from.z));
                const direction = { x: (tip.x - from.x) / length, z: (tip.z - from.z) / length };
                const base = { x: tip.x - direction.x * arrowLength, z: tip.z - direction.z * arrowLength };
                return `M ${tip.x} ${tip.z} L ${base.x - direction.z * arrowWidth} ${base.z + direction.x * arrowWidth} L ${base.x + direction.z * arrowWidth} ${base.z - direction.x * arrowWidth} Z`;
              };
              const dimensionLine = samples.map((sample) => shift(sample, offset));
              const first = samples[0];
              const last = samples[samples.length - 1];
              const extensions = [first, last].map((sample) => [shift(sample, gap), shift(sample, offset + overshoot)]);
              return (
                <g key={`dimension-${segment.id}`}>
                  {extensions.map(([from, to], index) => (
                    <line key={index} className="sketch-dimension-extension" x1={from.x} y1={from.z} x2={to.x} y2={to.z} />
                  ))}
                  <path className="sketch-dimension-line" d={`M ${dimensionLine.map((point) => `${point.x} ${point.z}`).join(" L ")}`} />
                  <path className="sketch-dimension-arrow" d={`${arrowhead(dimensionLine[0], dimensionLine[1])} ${arrowhead(dimensionLine[dimensionLine.length - 1], dimensionLine[dimensionLine.length - 2])}`} />
                  <g
                    className={curved ? "sketch-dimension-pill" : "sketch-dimension-pill clickable"}
                    {...(curved ? {} : {
                      role: "button",
                      tabIndex: 0,
                      "aria-label": `${t("sketch.clickToEditDimension")}: ${label}`,
                      onPointerDown: (event: ReactPointerEvent<SVGGElement>) => event.stopPropagation(),
                      onClick: (event: ReactMouseEvent<SVGGElement>) => {
                        event.stopPropagation();
                        startDimensionEdit(segment.id, label, labelPosition);
                      },
                      onKeyDown: (event: ReactKeyboardEvent<SVGGElement>) => {
                        if (event.key !== "Enter" && event.key !== " ") return;
                        event.preventDefault();
                        startDimensionEdit(segment.id, label, labelPosition);
                      },
                    })}
                    transform={`translate(${labelPosition.x} ${labelPosition.z})`}
                  >
                    {curved ? null : <title>{t("sketch.clickToEditDimension")}</title>}
                    <rect x={-pill.width / 2} y={-pill.height / 2} width={pill.width} height={pill.height} rx={pill.radius} />
                    <text y={5 * screenUnit} fontSize={13 * screenUnit}>{label}</text>
                  </g>
                </g>
              );
            })}
          </g>
          {cornerAngles.length > 0 ? (
            <g className="sketch-segment-dimensions sketch-corner-angle" pointerEvents="none">
              {editingAngle && editingCorner ? (() => {
                const turning = editingAngle.turn === "after" ? editingCorner.after.far : editingCorner.before.far;
                return <line className="sketch-angle-turn" x1={editingCorner.point.x} y1={editingCorner.point.z} x2={turning.x} y2={turning.z} />;
              })() : null}
              {cornerAngles.map((angle) => (
                <g key={angle.corner.point.id} className={angle.primary ? undefined : "sketch-neighbour-angle"}>
                  <path className="sketch-dimension-line" d={`M ${angle.arc.map((point) => `${point.x} ${point.z}`).join(" L ")}`} />
                  <g
                    className="sketch-dimension-pill clickable"
                    role="button"
                    tabIndex={0}
                    aria-label={`${t("sketch.clickToEditAngle")}: ${angle.label}`}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      startAngleEdit(angle.corner.point.id, String(Math.round(angle.corner.degrees * 10) / 10), angle.labelPosition);
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      startAngleEdit(angle.corner.point.id, String(Math.round(angle.corner.degrees * 10) / 10), angle.labelPosition);
                    }}
                    transform={`translate(${angle.labelPosition.x} ${angle.labelPosition.z})`}
                  >
                    <title>{t("sketch.clickToEditAngle")}</title>
                    <rect x={-angle.pill.width / 2} y={-angle.pill.height / 2} width={angle.pill.width} height={angle.pill.height} rx={angle.pill.radius} />
                    <text y={5 * screenUnit} fontSize={13 * screenUnit}>{angle.label}</text>
                  </g>
                </g>
              ))}
            </g>
          ) : null}
          {selectedGeometryBounds && tool === "select" ? (() => {
            const widthLabel = formatDimension(selectedGeometryBounds.width, workspace.accuracy);
            const depthLabel = formatDimension(selectedGeometryBounds.depth, workspace.accuracy);
            const widthPill = dimensionPillSize(widthLabel, screenUnit, 18);
            const depthPill = dimensionPillSize(depthLabel, screenUnit, 18);
            return (
              <g className="sketch-geometry-selection">
                <rect
                  data-sketch-entity="selection-box"
                  className="sketch-geometry-selection-box"
                  x={selectedGeometryBounds.minX - selectionFrameGap}
                  y={selectedGeometryBounds.minZ - selectionFrameGap}
                  width={selectedGeometryBounds.width + 2 * selectionFrameGap}
                  height={selectedGeometryBounds.depth + 2 * selectionFrameGap}
                  onPointerDown={(event) => {
                    if (event.button === 1) {
                      beginPan(event);
                      return;
                    }
                    if (event.button === 0 && event.shiftKey) {
                      // The box covers the lines inside it (points sit above it), so a
                      // Shift+click looks underneath for the line that was meant.
                      event.preventDefault();
                      event.stopPropagation();
                      const segmentId = document.elementsFromPoint(event.clientX, event.clientY)
                        .find((element) => element.getAttribute("data-sketch-entity") === "segment")
                        ?.getAttribute("data-segment-id");
                      if (segmentId) onToggleSelect({ kind: "segment", id: segmentId });
                      return;
                    }
                    if (event.button !== 0 || selected?.kind !== "multiple") return;
                    const point = pointFromEvent(event);
                    if (!point) return;
                    const startPoints = selected.pointIds.map((id) => profile.points.find((entry) => entry.id === id)).filter((entry): entry is SketchPoint => Boolean(entry)).map((entry) => ({ ...entry, handleIn: entry.handleIn ? { ...entry.handleIn } : undefined, handleOut: entry.handleOut ? { ...entry.handleOut } : undefined }));
                    beginEntityDrag(event, { kind: "move-selection", pointerId: event.pointerId, origin: point, current: point, startPoints });
                  }}
                />
                {([
                  { axis: "x" as const, label: widthLabel, pill: widthPill, at: { x: selectedGeometryBounds.cx, z: selectedGeometryBounds.minZ - selectionFrameGap - labelOffset } },
                  { axis: "z" as const, label: depthLabel, pill: depthPill, at: { x: selectedGeometryBounds.maxX + selectionFrameGap + 34 * screenUnit, z: selectedGeometryBounds.cz } },
                ]).map(({ axis, label, pill, at }) => {
                  const editable = selected?.kind === "multiple";
                  return (
                    <g
                      key={`box-size-${axis}`}
                      className={editable ? "sketch-geometry-dimension clickable" : "sketch-geometry-dimension"}
                      display={showMeasurements ? undefined : "none"}
                      pointerEvents={editable ? undefined : "none"}
                      role={editable ? "button" : undefined}
                      tabIndex={editable ? 0 : undefined}
                      aria-label={editable ? `${t("sketch.clickToEditDimension")}: ${label}` : undefined}
                      onPointerDown={editable ? (event) => event.stopPropagation() : undefined}
                      onClick={editable ? (event) => {
                        event.stopPropagation();
                        boxSizeEditDoneRef.current = false;
                        setEditingBoxSize({ axis, value: label, sketchPos: at });
                      } : undefined}
                      transform={`translate(${at.x} ${at.z})`}
                    >
                      {editable ? <title>{t("sketch.clickToEditDimension")}</title> : null}
                      <rect x={-pill.width / 2} y={-pill.height / 2} width={pill.width} height={pill.height} rx={pill.radius} />
                      <text y={5 * screenUnit} fontSize={13 * screenUnit}>{label}</text>
                    </g>
                  );
                })}
                {selectionResizeHandles.map((handle) => (
                  <rect
                    key={`selection-handle-${handle.id}`}
                    data-sketch-entity="selection-handle"
                    className={`sketch-geometry-resize-handle handle-${handle.id}`}
                    x={handle.x - handleSize / 2}
                    y={handle.z - handleSize / 2}
                    width={handleSize}
                    height={handleSize}
                    rx={handleRadius}
                    onPointerDown={(event) => {
                      if (event.button === 1) {
                        beginPan(event);
                        return;
                      }
                      if (event.button !== 0 || selected?.kind !== "multiple") return;
                      const startPoints = selected.pointIds.map((id) => profile.points.find((entry) => entry.id === id)).filter((entry): entry is SketchPoint => Boolean(entry)).map((entry) => ({ ...entry, handleIn: entry.handleIn ? { ...entry.handleIn } : undefined, handleOut: entry.handleOut ? { ...entry.handleOut } : undefined }));
                      const bounds = boundsForSketchPoints(startPoints);
                      if (!bounds) return;
                      beginEntityDrag(event, { kind: "resize-selection", pointerId: event.pointerId, handle: handle.id, current: { x: handle.x, z: handle.z }, grab: handle.grab, startPoints, bounds });
                    }}
                  />
                ))}
              </g>
            );
          })() : null}
          {hover && hoverOnReference ? <circle className="sketch-reference-snap" cx={hover.x} cy={hover.z} r={7 * screenUnit} pointerEvents="none" /> : null}
          {activePoint && previewEnd && pointerAction?.kind !== "bezier" && ["line", "bezier", "smooth"].includes(tool) ? <line className="sketch-preview-line" x1={activePoint.x} y1={activePoint.z} x2={previewEnd.x} y2={previewEnd.z} pointerEvents="none" /> : null}
          {activePoint && pointerAction?.kind === "bezier" ? (() => {
            // While a Bézier point is dragged out, the stretch to it bends live, exactly as it will
            // once let go: its handle on this side mirrors the drag (#196). Before, a straight line
            // ran to the pointer - not even to the point being placed.
            const end = pointerAction.origin;
            const handleIn = { x: 2 * end.x - pointerAction.current.x, z: 2 * end.z - pointerAction.current.z };
            const d = activePoint.handleOut
              ? `M ${activePoint.x} ${activePoint.z} C ${activePoint.handleOut.x} ${activePoint.handleOut.z} ${handleIn.x} ${handleIn.z} ${end.x} ${end.z}`
              : `M ${activePoint.x} ${activePoint.z} L ${end.x} ${end.z}`;
            return <path className="sketch-preview-line" d={d} fill="none" pointerEvents="none" />;
          })() : null}
          {activePoint && previewEnd && !typedLine && pointerAction?.kind !== "bezier" && ["line", "bezier", "smooth"].includes(tool) ? (
            <g className="sketch-segment-dimensions preview" pointerEvents="none" transform={`translate(${(activePoint.x + previewEnd.x) / 2} ${(activePoint.z + previewEnd.z) / 2 - labelOffset})`}>
              {(() => {
                const pill = dimensionPillSize(previewLabel, screenUnit, 18);
                return (
                  <>
                    <rect x={-pill.width / 2} y={-pill.height / 2} width={pill.width} height={pill.height} rx={pill.radius} />
                    <text y={5 * screenUnit} fontSize={13 * screenUnit}>{previewLabel}</text>
                  </>
                );
              })()}
            </g>
          ) : null}
          {pointerAction?.kind === "bezier" ? (
            <g className="sketch-drag-handles" pointerEvents="none">
              <line x1={pointerAction.origin.x * 2 - pointerAction.current.x} y1={pointerAction.origin.z * 2 - pointerAction.current.z} x2={pointerAction.current.x} y2={pointerAction.current.z} />
              <circle cx={pointerAction.origin.x} cy={pointerAction.origin.z} r={controlPointRadius} />
            </g>
          ) : null}
          {measurement ? (
            <g className="sketch-measurement">
              <line x1={measurement.start.x} y1={measurement.start.z} x2={measurement.end.x} y2={measurement.end.z} />
              <circle className="sketch-measurement-point" cx={measurement.start.x} cy={measurement.start.z} r={pointRadius} pointerEvents="none" />
              <circle className="sketch-measurement-point" cx={measurement.end.x} cy={measurement.end.z} r={pointRadius} pointerEvents="none" />
              <g
                className="sketch-measurement-pill"
                role="button"
                aria-label={t("sketch.removeMeasurement")}
                transform={`translate(${(measurement.start.x + measurement.end.x) / 2} ${(measurement.start.z + measurement.end.z) / 2 - labelOffset})`}
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onClearMeasurement();
                }}
              >
                <rect x={-dimensionPillSize(measurementLabel, screenUnit, 30).width / 2} y={-dimensionPillSize(measurementLabel, screenUnit, 30).height / 2} width={dimensionPillSize(measurementLabel, screenUnit, 30).width} height={dimensionPillSize(measurementLabel, screenUnit, 30).height} rx={dimensionPillSize(measurementLabel, screenUnit, 30).radius} />
                <text x={-5 * screenUnit} y={5 * screenUnit} fontSize={13 * screenUnit}>{measurementLabel}</text>
                <text className="remove" x={dimensionPillSize(measurementLabel, screenUnit, 30).width / 2 - 8 * screenUnit} y={5 * screenUnit} fontSize={14 * screenUnit}>x</text>
              </g>
            </g>
          ) : null}
          {pendingMeasurementStart ? (
            <g className="sketch-measurement pending" pointerEvents="none">
              {hover ? <line x1={pendingMeasurementStart.x} y1={pendingMeasurementStart.z} x2={hover.x} y2={hover.z} /> : null}
              <circle className="sketch-measurement-point pending" cx={pendingMeasurementStart.x} cy={pendingMeasurementStart.z} r={pointRadius} />
              {hover ? <circle className="sketch-measurement-point hover" cx={hover.x} cy={hover.z} r={pointRadius} /> : null}
            </g>
          ) : null}
          {selectedSegment && selectedSegmentCurved && tool === "select" ? (() => {
            const start = pointById.get(selectedSegment.startId);
            const end = pointById.get(selectedSegment.endId);
            if (!start?.handleOut || !end?.handleIn) return null;
            return (
              <g className="sketch-curve-handles">
                <line x1={start.x} y1={start.z} x2={start.handleOut.x} y2={start.handleOut.z} />
                <circle data-sketch-entity="handle" cx={start.handleOut.x} cy={start.handleOut.z} r={controlPointRadius} onPointerDown={(event) => event.button === 1 ? beginPan(event) : beginEntityDrag(event, { kind: "move-handle", pointerId: event.pointerId, pointId: start.id, handle: "out", current: start.handleOut! })} />
                <line x1={end.x} y1={end.z} x2={end.handleIn.x} y2={end.handleIn.z} />
                <circle data-sketch-entity="handle" cx={end.handleIn.x} cy={end.handleIn.z} r={controlPointRadius} onPointerDown={(event) => event.button === 1 ? beginPan(event) : beginEntityDrag(event, { kind: "move-handle", pointerId: event.pointerId, pointId: end.id, handle: "in", current: end.handleIn! })} />
              </g>
            );
          })() : null}
          {selectedPoint && tool === "select" ? (
            <g className="sketch-curve-handles">
              {selectedPoint.handleIn ? <><line x1={selectedPoint.x} y1={selectedPoint.z} x2={selectedPoint.handleIn.x} y2={selectedPoint.handleIn.z} /><circle data-sketch-entity="handle" cx={selectedPoint.handleIn.x} cy={selectedPoint.handleIn.z} r={controlPointRadius} onPointerDown={(event) => event.button === 1 ? beginPan(event) : beginEntityDrag(event, { kind: "move-handle", pointerId: event.pointerId, pointId: selectedPoint.id, handle: "in", current: selectedPoint.handleIn! })} /></> : null}
              {selectedPoint.handleOut ? <><line x1={selectedPoint.x} y1={selectedPoint.z} x2={selectedPoint.handleOut.x} y2={selectedPoint.handleOut.z} /><circle data-sketch-entity="handle" cx={selectedPoint.handleOut.x} cy={selectedPoint.handleOut.z} r={controlPointRadius} onPointerDown={(event) => event.button === 1 ? beginPan(event) : beginEntityDrag(event, { kind: "move-handle", pointerId: event.pointerId, pointId: selectedPoint.id, handle: "out", current: selectedPoint.handleOut! })} /></> : null}
            </g>
          ) : null}
          <g className="sketch-points">
            {displayProfile.points.map((point) => (
              <circle
                data-sketch-entity="point"
                className={`${isPointSelected(point.id) ? "selected" : ""} ${activePointId === point.id ? "active" : ""}`}
                key={point.id}
                cx={point.x}
                cy={point.z}
                r={pointRadius}
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (event.button === 1) {
                    beginPan(event);
                  } else if (tool === "erase" || tool === "refine") {
                    onDeletePoint(point.id);
                  } else if (event.button === 0 && tool === "select" && event.shiftKey) {
                    // No drag here: Shift only changes what is selected.
                    onToggleSelect({ kind: "point", id: point.id });
                  } else if (event.button === 0 && tool === "select") {
                    onPointPress(point.id);
                    beginEntityDrag(event, { kind: "move-point", pointerId: event.pointerId, pointId: point.id, origin: { x: point.x, z: point.z }, current: { x: point.x, z: point.z } });
                  } else if (event.button === 0) {
                    onPointPress(point.id);
                  }
                }}
              />
            ))}
          </g>
          {selectedImage && selectedImageBounds && tool === "select" ? (
            <g className="sketch-image-selection">
              <polygon
                className={`sketch-image-selection-box ${cropMode ? "cropping" : ""}`}
                points={(selectedImageCorners ?? []).map((corner) => `${corner.x},${corner.z}`).join(" ")}
                pointerEvents="none"
              />
              <g className="sketch-image-dimension width" display={showMeasurements ? undefined : "none"} pointerEvents="none" transform={`translate(${selectedImage.x} ${selectedImageBounds.minZ - labelOffset})`}>
                {(() => {
                  const label = formatDimension(selectedImage.width, workspace.accuracy);
                  const pill = dimensionPillSize(label, screenUnit, 18);
                  return (
                    <>
                      <rect x={-pill.width / 2} y={-pill.height / 2} width={pill.width} height={pill.height} rx={pill.radius} />
                      <text y={5 * screenUnit} fontSize={13 * screenUnit}>{label}</text>
                    </>
                  );
                })()}
              </g>
              <g className="sketch-image-dimension depth" display={showMeasurements ? undefined : "none"} pointerEvents="none" transform={`translate(${selectedImageBounds.maxX + 34 * screenUnit} ${selectedImage.z})`}>
                {(() => {
                  const label = formatDimension(selectedImage.depth, workspace.accuracy);
                  const pill = dimensionPillSize(label, screenUnit, 18);
                  return (
                    <>
                      <rect x={-pill.width / 2} y={-pill.height / 2} width={pill.width} height={pill.height} rx={pill.radius} />
                      <text y={5 * screenUnit} fontSize={13 * screenUnit}>{label}</text>
                    </>
                  );
                })()}
              </g>
              {imageResizeHandles.map((handle) => (
                <rect
                  key={handle.id}
                  data-sketch-entity="image-handle"
                  className={`sketch-image-resize-handle handle-${handle.id} ${cropMode ? "crop" : ""}`}
                  // The handles sit on the turned frame; their cursors stay the plain ones, the picture shows the direction.
                  transform={selectedImage.rotation ? `rotate(${-selectedImage.rotation} ${handle.x} ${handle.z})` : undefined}
                  x={handle.x - handleSize / 2}
                  y={handle.z - handleSize / 2}
                  width={handleSize}
                  height={handleSize}
                  rx={cropMode ? 0 : handleRadius}
                  onPointerDown={(event) => {
                    if (event.button === 1) {
                      beginPan(event);
                      return;
                    }
                    if (event.button !== 0) return;
                    const point = pointFromEvent(event);
                    if (!point) return;
                    beginEntityDrag(event, {
                      kind: cropMode ? "crop-image" : "resize-image",
                      pointerId: event.pointerId,
                      imageId: selectedImage.id,
                      handle: handle.id,
                      current: point,
                      start: { ...selectedImage },
                    });
                  }}
                />
              ))}
              {imageRotateHandlePoint && imageTopMiddle ? (
                <g className="sketch-image-rotate">
                  <line x1={imageTopMiddle.x} y1={imageTopMiddle.z} x2={imageRotateHandlePoint.x} y2={imageRotateHandlePoint.z} pointerEvents="none" />
                  <circle
                    data-sketch-entity="image-handle"
                    className="sketch-image-rotate-handle"
                    cx={imageRotateHandlePoint.x}
                    cy={imageRotateHandlePoint.z}
                    r={handleSize / 2}
                    onPointerDown={(event) => {
                      if (event.button === 1) {
                        beginPan(event);
                        return;
                      }
                      if (event.button !== 0) return;
                      const point = unsnappedPointFromEvent(event);
                      if (!point) return;
                      beginEntityDrag(event, {
                        kind: "rotate-image",
                        pointerId: event.pointerId,
                        imageId: selectedImage.id,
                        startAngle: imageAngleTo(selectedImage, point),
                        current: point,
                        start: { ...selectedImage },
                        snap: event.shiftKey,
                      });
                    }}
                  />
                </g>
              ) : null}
              {imageCalibration ? (
                <g className="sketch-image-calibration" pointerEvents="none">
                  {imageCalibration.points.length === 2 ? (
                    <line x1={imageCalibration.points[0].x} y1={imageCalibration.points[0].z} x2={imageCalibration.points[1].x} y2={imageCalibration.points[1].z} />
                  ) : null}
                  {imageCalibration.points.map((mark, index) => (
                    <g key={index} transform={`translate(${mark.x} ${mark.z})`}>
                      <circle r={6 * screenUnit} />
                      <line x1={-9 * screenUnit} x2={9 * screenUnit} y1={0} y2={0} />
                      <line y1={-9 * screenUnit} y2={9 * screenUnit} x1={0} x2={0} />
                    </g>
                  ))}
                </g>
              ) : null}
            </g>
          ) : null}
          {hover && ["line", "bezier", "smooth", "measure"].includes(tool) ? <circle className="sketch-cursor-point" cx={hover.x} cy={hover.z} r={hoverPointRadius} pointerEvents="none" /> : null}
        </svg>
        {typedLine && activePoint ? (() => {
          const overlayPos = getOverlayPos(typedLine.sketchPos);
          if (!overlayPos) return null;
          const fieldKeys = (event: ReactKeyboardEvent<HTMLInputElement>) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitTypedLine();
            } else if (event.key === "Tab") {
              event.preventDefault();
              setTypedLine((prev) => prev ? { ...prev, field: prev.field === "length" ? "angle" : "length" } : null);
            } else if (event.key === "Escape") {
              event.preventDefault();
              setTypedLine(null);
            }
          };
          // Leaving both fields, e.g. for a click on the sheet, puts them away.
          const leave = (event: ReactFocusEvent<HTMLInputElement>) => {
            if (event.relatedTarget !== typedLineLengthRef.current && event.relatedTarget !== typedLineAngleRef.current) setTypedLine(null);
          };
          const lengthInvalid = !typedLineTarget && typedLine.length.trim() !== "";
          return (
            <div
              className="sketch-typed-line"
              role="group"
              aria-label={t("sketch.typedLineHint")}
              title={t("sketch.typedLineHint")}
              style={{ "--overlay-x": `${overlayPos.x}px`, "--overlay-y": `${overlayPos.y}px` } as CSSProperties}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <label>
                <span>{t("sketch.typedLength")}</span>
                <input
                  ref={typedLineLengthRef}
                  value={typedLine.length}
                  inputMode="decimal"
                  aria-invalid={lengthInvalid || typedLineOffPlate}
                  onFocus={(event) => event.currentTarget.setSelectionRange(event.currentTarget.value.length, event.currentTarget.value.length)}
                  onChange={(event) => {
                    const { length, angle } = splitTypedLine(event.target.value);
                    setTypedLine((prev) => prev ? angle === null
                      ? { ...prev, length }
                      : { ...prev, length, angle: angle || prev.angle, field: "angle" } : null);
                  }}
                  onKeyDown={fieldKeys}
                  onBlur={leave}
                />
                <span>mm</span>
              </label>
              <label>
                <span>{t("sketch.typedAngle")}</span>
                <input
                  ref={typedLineAngleRef}
                  value={typedLine.angle}
                  placeholder={String(Math.round(pointerAngle * 10) / 10)}
                  inputMode="decimal"
                  onFocus={(event) => event.currentTarget.select()}
                  onChange={(event) => setTypedLine((prev) => prev ? { ...prev, angle: event.target.value.replace("<", "") } : null)}
                  onKeyDown={fieldKeys}
                  onBlur={leave}
                />
                <span>°</span>
              </label>
              {typedLineOffPlate ? <p className="sketch-typed-line-warning" role="alert">{t("sketch.typedLineOffPlate")}</p> : null}
            </div>
          );
        })() : null}
        {editingAngle ? (() => {
          const overlayPos = getOverlayPos(editingAngle.sketchPos);
          if (!overlayPos) return null;
          return (
            <input
              className="dimension-input sketch-dimension-input"
              style={{
                "--overlay-x": `${overlayPos.x}px`,
                "--overlay-y": `${overlayPos.y}px`,
              } as CSSProperties}
              value={editingAngle.value}
              autoFocus
              inputMode="decimal"
              title={t("sketch.angleEditHint")}
              aria-label={t("sketch.angleEditHint")}
              onPointerDown={(event) => event.stopPropagation()}
              onFocus={(event) => event.currentTarget.select()}
              onChange={(event) => setEditingAngle((prev) => prev ? { ...prev, value: event.target.value } : null)}
              onBlur={() => commitAngleEdit()}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitAngleEdit(event.altKey ? (editingAngle.turn === "after" ? "before" : "after") : undefined);
                }
                if (event.key === "Tab") {
                  event.preventDefault();
                  setEditingAngle((prev) => prev ? { ...prev, turn: prev.turn === "after" ? "before" : "after" } : null);
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  cancelAngleEdit();
                }
              }}
            />
          );
        })() : null}
        {editingBoxSize ? (() => {
          const overlayPos = getOverlayPos(editingBoxSize.sketchPos);
          if (!overlayPos) return null;
          return (
            <input
              className="dimension-input sketch-dimension-input"
              style={{ "--overlay-x": `${overlayPos.x}px`, "--overlay-y": `${overlayPos.y}px` } as CSSProperties}
              value={editingBoxSize.value}
              autoFocus
              inputMode="decimal"
              aria-label={t(editingBoxSize.axis === "x" ? "sketch.boxWidth" : "sketch.boxDepth")}
              onPointerDown={(event) => event.stopPropagation()}
              onFocus={(event) => event.currentTarget.select()}
              onChange={(event) => setEditingBoxSize((prev) => prev ? { ...prev, value: event.target.value } : null)}
              onBlur={() => commitBoxSizeEdit()}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitBoxSizeEdit();
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  boxSizeEditDoneRef.current = true;
                  setEditingBoxSize(null);
                }
              }}
            />
          );
        })() : null}
        {editingDimension ? (() => {
          const overlayPos = getOverlayPos(editingDimension.sketchPos);
          if (!overlayPos) return null;
          return (
            <input
              className="dimension-input sketch-dimension-input"
              style={{
                "--overlay-x": `${overlayPos.x}px`,
                "--overlay-y": `${overlayPos.y}px`,
              } as CSSProperties}
              value={editingDimension.value}
              autoFocus
              inputMode="decimal"
              onPointerDown={(event) => event.stopPropagation()}
              onFocus={(event) => event.currentTarget.select()}
              onChange={(event) => setEditingDimension((prev) => prev ? { ...prev, value: event.target.value } : null)}
              onBlur={() => commitDimensionEdit()}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitDimensionEdit(event.altKey);
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  cancelDimensionEdit();
                }
              }}
            />
          );
        })() : null}
      </section>
      {strokePanelOpen ? (
        <SketchStrokePanel
          stroke={profile.stroke}
          hasClosed={paths.some((path) => path.closed)}
          hasOpen={paths.some((path) => !path.closed)}
          accuracy={workspace.accuracy}
          onChange={(stroke) => onStrokeChange?.(stroke)}
          silhouette={Boolean(profile.silhouette)}
          onSilhouetteChange={(silhouette) => onSilhouetteChange?.(silhouette)}
          onClose={() => onCloseStrokePanel?.()}
        />
      ) : null}
      {selectedImage && tool === "select" ? (
        <SketchImageInspector
          image={selectedImage}
          accuracy={workspace.accuracy}
          revolve={operation === "revolve"}
          cropMode={cropMode}
          onCropMode={(on) => { setCropMode(on); if (on) setCalibration(null); }}
          calibration={imageCalibration}
          onCalibrate={(step) => {
            if (step.type === "start") {
              setCropMode(false);
              setCalibration({ imageId: selectedImage.id, points: [] });
            } else if (step.type === "cancel") {
              setCalibration(null);
            } else if (imageCalibration?.points.length === 2) {
              const patch = calibrateImage(selectedImage, imageCalibration.points[0], imageCalibration.points[1], step.length);
              if (patch) onUpdateImage(selectedImage.id, patch, t("sketch.imageCalibrated"));
              setCalibration(null);
            }
          }}
          onClose={() => onSelectMany([], [], [])}
          onUpdate={(patch, message) => onUpdateImage(selectedImage.id, patch, message)}
          onDelete={() => onDeleteImage(selectedImage.id)}
        />
      ) : null}
      {selectedPoint && tool === "select" ? (
        <div className="sketch-point-actions" aria-label={t("sketch.pointActions")}>
          {activeCornerDialog ? (
            <div className="sketch-corner-dialog">
              <span className="sketch-corner-label">
                {activeCornerDialog === "fillet" ? t("sketch.filletRadius") : t("sketch.chamferDistance")}
              </span>
              {/* Text, not a number input: such a field reads the decimal mark by the browser's
                  language, and a German one refused "2.5" (#210). Comma, point and sums all work. */}
              <input
                type="text"
                inputMode="decimal"
                className="sketch-corner-input"
                value={cornerValue}
                onChange={(e) => setCornerValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleApplyCorner();
                  if (e.key === "Escape") setCornerDialog(null);
                }}
                autoFocus
              />
              <span className="sketch-corner-unit">mm</span>
              <button
                type="button"
                className="sketch-corner-submit"
                title={t("sketch.apply")}
                aria-label={t("sketch.apply")}
                onClick={handleApplyCorner}
              >
                <Check />
              </button>
              <button
                type="button"
                className="sketch-corner-cancel"
                title={t("common.cancel")}
                aria-label={t("common.cancel")}
                onClick={() => setCornerDialog(null)}
              >
                <X />
              </button>
              <GuideHelpLink section="sketchCorners" className="sketch-corner-help" iconSize={17} />
            </div>
          ) : (
            <>
              <button type="button" title={t("sketch.makeCorner")} onClick={() => onSetPointMode(selectedPoint.id, "corner")}><CornerDownRight /><span>{t("sketch.corner")}</span></button>
              <button type="button" title={t("sketch.makeSmooth")} onClick={() => onSetPointMode(selectedPoint.id, "smooth")}><Waves /><span>{t("sketch.smooth")}</span></button>
              <button type="button" title={t("sketch.splitHandles")} onClick={() => onSetPointMode(selectedPoint.id, "split")}><Split /><span>{t("sketch.split")}</span></button>
              {canApplySketchCornerTreatment(displayProfile, selectedPoint.id) ? (
                <>
                  <span className="sketch-point-divider" />
                  <button
                    type="button"
                    title={t("sketch.filletCorner")}
                    onClick={() => {
                      setCornerDialog("fillet");
                      setCornerValue("2");
                    }}
                  >
                    <Spline />
                    <span>{t("sketch.fillet")}</span>
                  </button>
                  <button
                    type="button"
                    title={t("sketch.chamferCorner")}
                    onClick={() => {
                      setCornerDialog("chamfer");
                      setCornerValue("2");
                    }}
                  >
                    <Slash />
                    <span>{t("sketch.chamfer")}</span>
                  </button>
                </>
              ) : null}
              <GuideHelpLink section="sketchCurve" className="sketch-corner-help" iconSize={17} />
            </>
          )}
        </div>
      ) : null}
      {selectedSegment && tool === "select" && onCurveSegment && onStraightenSegment ? (
        <div className="sketch-point-actions" aria-label={t("sketch.segmentActions")}>
          <button type="button" title={t("sketch.curveLineHint")} disabled={selectedSegmentCurved} onClick={() => onCurveSegment(selectedSegment.id)}><Spline /><span>{t("sketch.curveLine")}</span></button>
          <button type="button" title={t("sketch.straightenLineHint")} disabled={!selectedSegmentCurved && (selectedSegment.kind ?? "line") === "line"} onClick={() => onStraightenSegment(selectedSegment.id)}><Minus /><span>{t("sketch.straightenLine")}</span></button>
          <GuideHelpLink section="sketchCurve" className="sketch-corner-help" iconSize={17} />
        </div>
      ) : null}
      <div className="grid-settings">
        <SnapGridControl units={workspace.units} customGrids={workspace.customSnapGrids} snap={snap} snapOpen={snapOpen} onSnapChange={setSnap} onSnapOpenChange={setSnapOpen} />
      </div>
    </main>
  );
}

type ImageCalibrationStep = { type: "start" } | { type: "cancel" } | { type: "apply"; length: number };

function SketchImageInspector({
  image,
  accuracy,
  revolve,
  cropMode,
  onCropMode,
  calibration,
  onCalibrate,
  onClose,
  onUpdate,
  onDelete,
}: {
  image: SketchImage;
  accuracy: 1 | 2 | 3;
  /** Revolving: x = 0 is the axis, so centring on it is the point. */
  revolve: boolean;
  cropMode: boolean;
  onCropMode: (on: boolean) => void;
  calibration: { points: Array<{ x: number; z: number }> } | null;
  onCalibrate: (step: ImageCalibrationStep) => void;
  onClose: () => void;
  onUpdate: (patch: Partial<SketchImage>, message?: string) => void;
  onDelete: () => void;
}) {
  useLanguage();
  const measured = calibration?.points.length === 2 ? Math.hypot(calibration.points[1].x - calibration.points[0].x, calibration.points[1].z - calibration.points[0].z) : 0;
  const [calibrateDraft, setCalibrateDraft] = useState("");
  useEffect(() => setCalibrateDraft(measured > 0 ? formatDimension(measured, accuracy) : ""), [accuracy, measured]);
  const applyCalibration = () => {
    const length = parseMeasurementInput(calibrateDraft);
    if (Number.isFinite(length) && length > 0) onCalibrate({ type: "apply", length });
  };
  const aspect = image.width / Math.max(0.5, image.depth);
  const updateWidth = (width: number) => onUpdate({
    width,
    ...(image.lockAspect !== false ? { depth: Math.max(0.5, width / aspect) } : {}),
  }, t("sketch.imageWidthUpdated"));
  const updateDepth = (depth: number) => onUpdate({
    depth,
    ...(image.lockAspect !== false ? { width: Math.max(0.5, depth * aspect) } : {}),
  }, t("sketch.imageHeightUpdated"));

  // Verdecken die Einstellungen das Bild, das man gerade nachzeichnet, zieht
  // man sie an der Titelleiste weg - wie die Einstellungen im 3D-Editor.
  const movable = useMovablePanel<HTMLElement>("layerling.sketch.imageSettingsPosition", IMAGE_SETTINGS_PANEL);

  return (
    <aside
      ref={movable.panelRef}
      className={`shape-inspector sketch-image-inspector ${movable.moved ? "floating" : ""} ${movable.dragging ? "moving" : ""}`}
      style={movable.style}
      aria-label={t("sketch.imageSettings", { name: image.name })}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="shape-inspector-header movable" title={t("panel.moveHint")} {...movable.handleProps}>
        <button className="inspector-header-icon" type="button" aria-label={t("sketch.closeImageSettings")} onClick={onClose}>
          <ChevronUp size={16} />
        </button>
        <strong>{image.name}</strong>
        <div className="inspector-header-actions">
          <GuideHelpLink section="sketchImage" className="inspector-help-link" />
          <button
            className={image.locked ? "inspector-header-icon active" : "inspector-header-icon"}
            type="button"
            aria-label={image.locked ? t("sketch.unlockImage") : t("sketch.lockImage")}
            title={image.locked ? t("sketch.unlockImageHint") : t("sketch.lockImageHint")}
            onClick={() => onUpdate({ locked: !image.locked }, image.locked ? t("sketch.imageUnlocked") : t("sketch.imageLocked"))}
          >
            {image.locked ? <LockKeyhole size={16} /> : <LockKeyholeOpen size={16} />}
          </button>
          <button className="inspector-header-icon danger" type="button" aria-label={t("sketch.deleteImage")} title={image.locked ? t("sketch.unlockBeforeDelete") : t("sketch.deleteImageHint")} onClick={onDelete} disabled={image.locked}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      <div className="sketch-image-preview-card">
        <img src={image.dataUrl} alt="" />
        <span>{image.pixelWidth} × {image.pixelHeight} px</span>
      </div>
      <div className="property-card">
        <div className="property-card-header static"><span>{t("sketch.imageProperties")}</span></div>
        <div className="property-list">
          <SketchImageRange label={t("sketch.imageWidth")} value={image.width} min={0.5} max={200} accuracy={accuracy} disabled={image.locked} onChange={updateWidth} />
          <SketchImageRange label={t("sketch.imageHeight")} value={image.depth} min={0.5} max={200} accuracy={accuracy} disabled={image.locked} onChange={updateDepth} />
          <SketchImageRange label={t("sketch.imageOpacity")} value={(image.opacity ?? 0.55) * 100} min={5} max={100} accuracy={1} suffix="%" disabled={image.locked} onChange={(opacity) => onUpdate({ opacity: opacity / 100 }, t("sketch.imageOpacityUpdated"))} />
          <SketchImagePositionField label={t("sketch.imagePositionX")} value={image.x} accuracy={accuracy} disabled={image.locked} onChange={(x) => onUpdate({ x }, t("sketch.imageMoved"))} />
          <SketchImagePositionField label={t("sketch.imagePositionY")} value={image.z} accuracy={accuracy} disabled={image.locked} onChange={(z) => onUpdate({ z }, t("sketch.imageMoved"))} />
          <button className={`sketch-image-aspect-toggle ${image.lockAspect !== false ? "active" : ""}`} type="button" disabled={image.locked} onClick={() => onUpdate({ lockAspect: image.lockAspect === false }, t("sketch.imageAspectUpdated"))}>
            {image.lockAspect !== false ? <Link size={17} /> : <Link2Off size={17} />}
            <span>{image.lockAspect !== false ? t("sketch.aspectLocked") : t("sketch.aspectUnlocked")}</span>
          </button>
        </div>
      </div>
      <div className="property-card">
        <div className="property-card-header static"><span>{t("sketch.imageAlign")}</span></div>
        <div className="property-list sketch-image-align">
          <SketchImageRange label={t("sketch.imageRotation")} value={image.rotation ?? 0} min={-180} max={180} accuracy={1} suffix="°" disabled={image.locked} onChange={(rotation) => onUpdate({ rotation: normalizeImageRotation(rotation) }, t("sketch.imageRotated"))} />
          <div className="sketch-image-action-row">
            <button className="sketch-image-aspect-toggle" type="button" disabled={image.locked} title={revolve ? t("sketch.centreImageAxisHint") : undefined} onClick={() => onUpdate(centreImage("x"), t("sketch.imageCentred"))}>
              <AlignCenterVertical size={17} />
              <span>{t("sketch.centreImageX")}</span>
            </button>
            <button className="sketch-image-aspect-toggle" type="button" disabled={image.locked} onClick={() => onUpdate(centreImage("z"), t("sketch.imageCentred"))}>
              <AlignCenterHorizontal size={17} />
              <span>{t("sketch.centreImageY")}</span>
            </button>
          </div>
          {revolve ? <p className="sketch-image-hint">{t("sketch.centreImageAxisHint")}</p> : null}
          <button className={`sketch-image-aspect-toggle ${calibration ? "active" : ""}`} type="button" disabled={image.locked} onClick={() => onCalibrate({ type: calibration ? "cancel" : "start" })}>
            <Ruler size={17} />
            <span>{calibration ? t("sketch.calibrateCancel") : t("sketch.calibrateImage")}</span>
          </button>
          {calibration && calibration.points.length < 2 ? (
            <p className="sketch-image-hint">{t(calibration.points.length === 0 ? "sketch.calibrateFirst" : "sketch.calibrateSecond")}</p>
          ) : null}
          {calibration && calibration.points.length === 2 ? (
            <label className="sketch-image-position-field sketch-image-calibrate-field">
              <span>{t("sketch.calibrateLength")}</span>
              <div className="sketch-image-range-row">
                <input
                  className="sketch-image-number-input"
                  type="text"
                  inputMode="decimal"
                  autoFocus
                  value={calibrateDraft}
                  onFocus={(event) => selectWholeValue(event.currentTarget)}
                  onChange={(event) => setCalibrateDraft(event.currentTarget.value)}
                  onKeyDown={(event) => { if (event.key === "Enter") applyCalibration(); if (event.key === "Escape") onCalibrate({ type: "cancel" }); }}
                />
                <span>mm</span>
              </div>
              <button className="sketch-image-aspect-toggle active" type="button" onClick={applyCalibration}>
                <Check size={17} />
                <span>{t("sketch.calibrateApply")}</span>
              </button>
            </label>
          ) : null}
          <button className={`sketch-image-aspect-toggle ${cropMode ? "active" : ""}`} type="button" disabled={image.locked} onClick={() => onCropMode(!cropMode)}>
            <Crop size={17} />
            <span>{cropMode ? t("sketch.cropImageDone") : t("sketch.cropImage")}</span>
          </button>
          {cropMode ? <p className="sketch-image-hint">{t("sketch.cropImageHint")}</p> : null}
          {image.crop ? (
            <button className="sketch-image-aspect-toggle" type="button" disabled={image.locked} onClick={() => onUpdate(uncropImage(image), t("sketch.imageUncropped"))}>
              <span>{t("sketch.uncropImage")}</span>
            </button>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

const STROKE_PANEL: MovablePanelOptions = {
  floatingStyle: { right: "auto", bottom: "auto" },
  dockedAt: (area, panel) => ({ left: area.width - panel.width, top: 0 }),
};

/**
 * Stroke (#154): the sketch becomes a line of a width instead of a filled area - a closed outline
 * a frame, an open line a stripe. Where the wall lies only matters for closed outlines, the ends
 * only for open lines; both are always shown, with a hint when nothing in the sketch uses them.
 */
function SketchStrokePanel({
  stroke,
  hasClosed,
  hasOpen,
  accuracy,
  onChange,
  silhouette,
  onSilhouetteChange,
  onClose,
}: {
  stroke: SketchStroke | undefined;
  hasClosed: boolean;
  hasOpen: boolean;
  accuracy: 1 | 2 | 3;
  onChange: (stroke: SketchStroke | undefined) => void;
  silhouette: boolean;
  onSilhouetteChange: (silhouette: boolean) => void;
  onClose: () => void;
}) {
  const movable = useMovablePanel<HTMLElement>("layerling.sketch.strokePanelPosition", STROKE_PANEL);
  const lastStroke = useRef<SketchStroke>(stroke ?? DEFAULT_SKETCH_STROKE);
  if (stroke) lastStroke.current = stroke;
  const current = stroke ?? lastStroke.current;
  const set = (patch: Partial<SketchStroke>) => onChange({ ...current, ...patch });
  const options = <T extends string>(label: string, values: readonly T[], value: T, labelOf: (option: T) => string, apply: (next: T) => void, note?: string) => (
    <div className="edge-modifier-field shell-openings" role="radiogroup" aria-label={label}>
      <span>{label}</span>
      <div className="shell-opening-options">
        {values.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={value === option}
            className={value === option ? "active" : ""}
            disabled={!stroke}
            onClick={() => apply(option)}
          >
            {labelOf(option)}
          </button>
        ))}
      </div>
      {note ? <small className="sketch-stroke-note">{note}</small> : null}
    </div>
  );
  return (
    <aside
      ref={movable.panelRef}
      className={`shape-inspector sketch-stroke-panel ${movable.moved ? "floating" : ""} ${movable.dragging ? "moving" : ""}`}
      style={movable.style}
      aria-label={t("sketch.strokeTitle")}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="shape-inspector-header movable" title={t("panel.moveHint")} {...movable.handleProps}>
        <button className="inspector-header-icon" type="button" aria-label={t("sketch.strokeClose")} onClick={onClose}>
          <ChevronUp size={16} />
        </button>
        <strong>{t("sketch.strokeTitle")}</strong>
        <div className="inspector-header-actions">
          <GuideHelpLink section="sketchStroke" className="inspector-help-link" />
        </div>
      </div>
      <div className="property-card">
        <div className="property-list">
          <label className="sketch-stroke-toggle">
            <input type="checkbox" checked={Boolean(stroke)} onChange={(event) => onChange(event.currentTarget.checked ? current : undefined)} />
            <span>{t("sketch.strokeOn")}</span>
          </label>
          <SketchImageRange label={t("sketch.strokeWidth")} value={current.width} min={0.05} max={20} accuracy={accuracy} disabled={!stroke} onChange={(width) => set({ width })} />
          {options<SketchStrokeAlign>(t("sketch.strokeAlign"), SKETCH_STROKE_ALIGNS, current.align, (option) => t(`sketch.strokeAlign.${option}`), (align) => set({ align }), hasClosed ? undefined : t("sketch.strokeAlignHint"))}
          {options<SketchStrokeJoin>(t("sketch.strokeJoin"), SKETCH_STROKE_JOINS, current.join, (option) => t(`sketch.strokeJoin.${option}`), (join) => set({ join }))}
          {options<SketchStrokeCap>(t("sketch.strokeCap"), SKETCH_STROKE_CAPS, current.cap, (option) => t(`sketch.strokeCap.${option}`), (cap) => set({ cap }), hasOpen ? undefined : t("sketch.strokeCapHint"))}
          <label className="sketch-stroke-toggle">
            <input type="checkbox" checked={silhouette} onChange={(event) => onSilhouetteChange(event.currentTarget.checked)} />
            <span>{t("prop.sketchSilhouette")}</span>
          </label>
          <small className="sketch-stroke-note">{t("sketch.silhouetteHint")}</small>
        </div>
      </div>
    </aside>
  );
}

function SketchImageRange({
  label,
  value,
  min,
  max,
  accuracy,
  suffix = "mm",
  disabled = false,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  accuracy: 1 | 2 | 3;
  suffix?: string;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  const safeValue = clamp(Number.isFinite(value) ? value : min, min, max);
  const [draft, setDraft] = useState(formatDimension(safeValue, accuracy));
  useEffect(() => setDraft(formatDimension(safeValue, accuracy)), [accuracy, safeValue]);
  const commit = () => {
    const parsed = parseMeasurementInput(draft);
    onChange(clamp(Number.isFinite(parsed) ? parsed : safeValue, min, max));
  };
  const position = ((safeValue - min) / Math.max(0.001, max - min)) * 100;
  return (
    <label className="range-property sketch-image-range" style={{ "--slider-pos": `${position}%` } as CSSProperties}>
      <span>{label}</span>
      <div className="sketch-image-range-row">
        <input
          className="sketch-image-number-input"
          type="text"
          inputMode="decimal"
          onFocus={(event) => selectWholeValue(event.currentTarget)}
          value={draft}
          disabled={disabled}
          onChange={(event) => setDraft(event.currentTarget.value)}
          onBlur={commit}
          onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
        />
        <span>{suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={accuracy === 1 ? 0.1 : 0.01} value={safeValue} disabled={disabled} onChange={(event) => onChange(Number(event.currentTarget.value))} />
    </label>
  );
}

function SketchImagePositionField({
  label,
  value,
  accuracy,
  disabled = false,
  onChange,
}: {
  label: string;
  value: number;
  accuracy: 1 | 2 | 3;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  const formatted = formatDimension(value, accuracy);
  const [draft, setDraft] = useState(formatted);
  useEffect(() => setDraft(formatted), [formatted]);
  const commit = () => {
    const parsed = parseMeasurementInput(draft);
    const next = Number.isFinite(parsed) ? parsed : value;
    onChange(next);
    setDraft(formatDimension(next, accuracy));
  };

  return (
    <label className="sketch-image-position-field">
      <span>{label}</span>
      <input
        type="text"
        inputMode="decimal"
        onFocus={(event) => selectWholeValue(event.currentTarget)}
        value={draft}
        disabled={disabled}
        onChange={(event) => setDraft(event.currentTarget.value)}
        onBlur={commit}
        onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
      />
    </label>
  );
}
