"use client";

import { AlignCenterHorizontal, AlignCenterVertical, AlignEndHorizontal, AlignEndVertical, AlignStartHorizontal, AlignStartVertical, Check, ChevronUp, CornerDownRight, Crop, Crosshair, Eye, EyeOff, FlipHorizontal2, FlipVertical2, Home, Layers, Link, Link2Off, LockKeyhole, LockKeyholeOpen, Magnet, Minus, Plus, Ruler, RulerDimensionLine, Scissors, Slash, Spline, Split, Trash2, WandSparkles, Waves, X } from "lucide-react";
import { displayedHandle } from "@/lib/sketchBezierHandles";
import { curveStretches } from "@/lib/sketchCurveThroughPoints";
import { markEscapeHandled } from "@/lib/escapeHandled";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type Dispatch, type SetStateAction, type FocusEvent as ReactFocusEvent, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";
import { SnapGridControl } from "@/components/workplane/ShapeInspector";
import { SketchRevolvePreview } from "@/components/SketchRevolvePreview";
import { SketchNotes } from "@/components/SketchNotes";
import { SketchLockBadge, SketchRotateHandles, SketchTurnRing } from "@/components/SketchHandles";
import { lockBadgeSpot, rotateHandleSpots } from "@/lib/sketchHandleSpots";
import { SKETCH_DOUBLE_CLICK_PIXELS, useSketchViewSlide } from "@/lib/useSketchViewSlide";
import { ToolbarConstructionLineIcon, ToolbarNoteIcon } from "@/components/toolbarIcons";
import { CAMERA_BAR_PANEL, CameraBarHandle } from "@/components/workplane/CameraBarHandle";
import { constructionCrossings } from "@/lib/sketchConstruction";
import { outlineSideMiddles, sketchSnapPoints } from "@/lib/sketchSnapPoints";
import { openEndPoints } from "@/lib/sketchPointJoin";
import { canApplySketchCornerTreatment } from "@/lib/sketchFilletChamfer";
import { t } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";
import { useMovablePanel, type MovablePanelOptions } from "@/lib/useMovablePanel";
import { currentLengthUnitLabel, formatLengthMm, lengthDisplayUnit, parseLengthMm, parseMeasurementInput, resolveLengthMm, setLengthUnit } from "@/lib/measurementUnits";
import { applySegmentDimension, SEGMENT_DIMENSION_CENTER } from "@/lib/sketchDimensions";
import { applyCornerAngle, sketchCornerAt, type CornerTurn, type SketchCorner } from "@/lib/sketchAngles";
import { isSegmentCurved } from "@/lib/sketchSegmentCurve";
import { DEFAULT_SKETCH_BACKGROUND, DEFAULT_SKETCH_GRID_COLOR, DEFAULT_SKETCH_PLATE_COLOR, workplaneGridLayout } from "@/lib/workplaneGrid";
import { closestPointOnSketchSegment, type SketchSegmentPlacement } from "@/lib/sketchPointRefinement";
import { isChainDrawingTool, isSketchPanGesture, rightClickEndsChain, SKETCH_MANUAL_MAX_ZOOM, SKETCH_MAX_ZOOM, SKETCH_WHEEL_ZOOM_BOOST, SKETCH_MIN_ZOOM, sketchPinchZoomFactor, sketchWheelZoomFactor, zoomSketchViewAt, type SketchView } from "@/lib/sketchPointerControls";
import { pickTouchTarget, type TouchCandidate } from "@/lib/sketchTouch";
import { isSketchPrimitive, type SketchPrimitive } from "@/lib/sketchPrimitives";
import { meshForShape } from "@/lib/editorMeshCore";
import { mirrorSign, resizedImportedMeshPositions } from "@/lib/workplaneShapes";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE, keyboardNudgeCoarseFactor, keyboardNudgeStep, normalizeSnapGrid, normalizeWorkspaceSettings, snapGridForShortcut, snapGridOptions, snapGridStep as snapStep, orbitControlsZoomSpeed, zoomDistanceScale, ZOOM_STEP_IN, ZOOM_STEP_OUT } from "@/lib/workplaneSettings";
import type { GridSize, SketchImage, SketchNote, SketchOperation, SketchPoint, SketchProfile, SketchSegment, SketchStroke, SketchStrokeAlign, SketchStrokeCap, SketchStrokeJoin, SweepAnchor, WorkplaneShape, WorkplaneWorkspaceSettings } from "@/types/layerling";
import { resizePointerOnGrid } from "@/lib/sketchFrameResize";
import { viewArrowStep } from "@/lib/viewArrowKeys";
import { resizeSketchPoints, resizeSketchPointsToSize, type ResizeHandle, type SelectionBounds } from "@/lib/sketchSelectionResize";
import { alignSketchSelection, canAlignSketchSelection, type SketchAlignMode } from "@/lib/sketchAlign";
import { changesLockedOutline, sketchLockState } from "@/lib/sketchLock";
import { dragRotationDegrees, rotateSketchPointsAbout, sketchPointsPivot, sketchTurnRing, sketchTurnStep, SKETCH_TURN_RING_STEP } from "@/lib/sketchRotation";
import { calibrateImage, centreImage, cropImage, imageAngleTo, imageCorners, imageCropViewBox, imageHandlePositions, normalizeImageRotation, resizeImage, rotateImage, uncropImage } from "@/lib/sketchImageTransform";
import { MAX_TRACE_CORNER_ANGLE, MIN_TRACE_CORNER_ANGLE, type PictureTrace, type TracePart } from "@/lib/pictureTrace";
import { planePointToTraced, tracedLinePath, tracedPixelSize, tracedPointOnPlane, tracePreviewPath, type TracedSize } from "@/lib/sketchImageTrace";
import { useSketchImageTrace, type SketchImageTraceState } from "@/lib/useSketchImageTrace";
import { DEFAULT_SKETCH_STROKE, SKETCH_STROKE_ALIGNS, SKETCH_STROKE_CAPS, SKETCH_STROKE_JOINS } from "@/lib/sketchStroke";
import { selectWholeValue } from "@/lib/numberField";
import { GuideHelpLink } from "@/components/GuideHelpLink";
import { displayY, insideZ } from "@/lib/displayAxes";
import { clampNudge, constrainToAxis, sketchSegmentDragPointIds, sketchSelectedPointIds, sketchSelectedSegmentIds, sketchSelectionMovePointIds, type SketchSelectableEntity, type SketchSelection } from "@/lib/sketchSelection";
import { closedPathAt, closedPathRegions, cubicPoint, curveControls, isInsideEdges, orderedPaths, pathEdges, type DisplayPath, type PlaneEdge } from "@/lib/sketchPaths";
import { capturePointer } from "@/lib/pointerCapture";
import { arcPreviewPoints, arcThroughThreePoints, type SketchArcEnd } from "@/lib/sketchArc";
import { constrainToAngle, sketchLineAngle, sketchPolarPoint, splitTypedLine } from "@/lib/sketchPolar";

export type { SketchPrimitive } from "@/lib/sketchPrimitives";
export type SketchTool = "line" | "arc" | "bezier" | "smooth" | SketchPrimitive | "select" | "refine" | "erase" | "measure";
/** The keys 1 to 4 and the drawing tool each picks, in the order of the tools on the left (#347). */
export const SKETCH_TOOL_KEYS: Readonly<Record<string, SketchTool>> = { "1": "line", "2": "bezier", "3": "smooth", "4": "refine" };
/** With the Select tool and something selected, the same keys change it instead (#347): 1 straight / corner, 2 curve, 3 smooth. */
export const SKETCH_EDIT_KEYS: Readonly<Record<string, "straight" | "curve" | "smooth">> = { "1": "straight", "2": "curve", "3": "smooth" };
export type { SketchSelection } from "@/lib/sketchSelection";
export type SketchMeasurement = { start: SketchPoint; end: SketchPoint } | null;

type SketchWorkspaceProps = {
  profile: SketchProfile;
  operation?: SketchOperation;
  /** What the sketch becomes changed from the badge at the top (#655). */
  onOperationChange?: (operation: SketchOperation) => void;
  /** Which edge of a swept section runs along the path, from the badge at the top (#732). */
  onSweepAnchorChange?: (anchor: SweepAnchor) => void;
  revolvePreviewPositions?: number[] | null;
  referenceShapes: WorkplaneShape[];
  /** Where a workplane inside a body cuts it: the outline of the cut per body (id), as an SVG path of loops. */
  referenceSlices?: Record<string, string>;
  /** All edges of the bodies seen through, projected onto the sketch plane, as one SVG path (#354). */
  referenceEdges?: string;
  showReferenceEdges?: boolean;
  onToggleReferenceEdges?: () => void;
  tool: SketchTool;
  activePointId: string | null;
  selected: SketchSelection;
  measurement: SketchMeasurement;
  pendingMeasurementStart: SketchPoint | null;
  initialSnap?: GridSize;
  /** The snap grid picked in the sketch; the editor keeps one grid for the sketch and the 3D view. */
  onSnapChange?: (snap: GridSize) => void;
  initialWorkspace?: WorkplaneWorkspaceSettings;
  /** Lines run from their middle (#624): the preview shows the far half too. */
  fromMiddle?: boolean;
  onPlanePoint: (point: { x: number; z: number }, handles?: { handleIn: { x: number; z: number }; handleOut: { x: number; z: number } }) => void;
  onAddPrimitive: (primitive: SketchPrimitive, center: { x: number; z: number }) => void;
  /** The three-point arc (#643): first the two ends, then a point the arc runs through. */
  onAddArc?: (start: SketchArcEnd, through: { x: number; z: number }, end: SketchArcEnd) => void;
  onPointPress: (id: string) => void;
  /** Ends the chain of points being drawn, keeping the tool: a right click on the plane or a double click on the last point (#520). */
  onFinishLine?: () => void;
  onSelectSegment: (id: string) => void;
  onSelectMany: (pointIds: string[], segmentIds: string[], imageIds: string[]) => void;
  /** A window dragged with the Erase tool: takes away the points and lines inside it (#519). */
  onEraseMany?: (pointIds: string[], segmentIds: string[]) => void;
  /** Shift+click with Select: adds the point or line to the selection, or takes it out. */
  onToggleSelect: (entity: SketchSelectableEntity) => void;
  onSelectImage: (id: string) => void;
  onUpdateImage: (id: string, patch: Partial<SketchImage>, message?: string, keyRunKey?: string) => void;
  onDeleteImage: (id: string) => void;
  /** Trace (#1060): the reference image's outlines, traced in the pixels of the part it shows, become sketch points. */
  onTraceImage?: (imageId: string, trace: PictureTrace, size: TracedSize) => void;
  onDeletePoint: (id: string) => void;
  onDeleteSegment: (id: string) => void;
  onMovePoint: (id: string, point: { x: number; z: number }) => void;
  /** Locks the selected outline, or unlocks it when all of it is locked (#653). */
  onToggleOutlineLock?: () => void;
  onTransformPoints: (points: SketchPoint[], message?: string, keyRunKey?: string) => void;
  onMoveHandle: (id: string, handle: "in" | "out", point: { x: number; z: number }, keyRunKey?: string) => void;
  /** The keys 1 to 4 pick Line, Bezier, Smooth Curve and Add or Remove Points, as in Tinkercad (#347). */
  onSelectTool?: (tool: SketchTool) => void;
  onInsertPoint: (segmentId: string, point: { x: number; z: number }, amount: number) => void;
  onSetPointMode: (id: string, mode: "corner" | "smooth" | "split") => void;
  /** Several points at once, one undo step: the keys 1 and 3 on a selection (#347). */
  onSetPointsMode?: (ids: string[], mode: "corner" | "smooth") => void;
  /** One smooth curve from the first selected point to the last, through those between (3 or more points). */
  onCurveThroughPoints?: (ids: string[]) => void;
  /** Bends a straight side into a curve with handles, or makes a curved side straight again. */
  onCurveSegment?: (id: string) => void;
  /** Curve or straighten all the selected lines at once (#283). */
  onCurveSegments?: (ids: string[]) => void;
  /** Copies the selection to the other side of the vertical or the horizontal axis through the middle of the plate, or of a straight line (#512). */
  onMirror?: (across: "vertical" | "horizontal" | { segmentId: string }) => void;
  onStraightenSegments?: (ids: string[]) => void;
  onStraightenSegment?: (id: string) => void;
  /** Makes a line a construction line (#229), or a normal line again. */
  onSetSegmentConstruction?: (id: string, construction: boolean) => void;
  onApplyFillet?: (ids: string[], radius: number) => void;
  onApplyChamfer?: (ids: string[], distance: number) => void;
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
  /** The sketch body's notes: pins and cards as in the 3D view; with `noteMode`, the next click puts one there. */
  notes?: readonly SketchNote[];
  noteNumbers?: ReadonlyMap<string, number>;
  noteMode?: boolean;
  /** The note buttons of the camera bar (Stefan, 31.10.2026: they moved here from Manage). */
  notesVisible?: boolean;
  noteCount?: number;
  onNoteTool?: () => void;
  onToggleNotes?: () => void;
  /** Puts a note on the spot and gives its id, or null when there is no room for another. */
  onAddNote?: (spot: { x: number; z: number }) => string | null;
  onUpdateNote?: (id: string, patch: Partial<SketchNote>) => void;
  onRemoveNote?: (id: string) => void;
};

type SketchReferenceFootprint = {
  fillD: string | null;
  outlineD: string | null;
  /** The outline is in the plate's own coordinates already: not to be turned about the body's middle (#596). */
  world?: boolean;
};
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
  | { kind: "rotate-selection"; pointerId: number; pivot: { x: number; z: number }; start: { x: number; z: number }; current: { x: number; z: number }; startPoints: SketchPoint[]; snap: boolean; ring: number; corner: number }
  | { kind: "rotate-image"; pointerId: number; imageId: string; startAngle: number; current: { x: number; z: number }; start: SketchImage; snap: boolean; ring: number; corner: number }
  | { kind: "crop-image"; pointerId: number; imageId: string; handle: ResizeHandle; current: { x: number; z: number }; start: SketchImage };

/** The step a turn of a selection or a picture snaps to, by where the pointer is against the ring it shows. */
/**
 * A Bezier handle (#1008): lit up and with the hand under the pointer like a point, and catching a press a little around
 * it, so a near miss while tracing does not grab the reference image underneath.
 */
function CurveHandle({ at, radius, selected, onPointerDown }: { at: { x: number; z: number }; radius: number; selected: boolean; onPointerDown: (event: ReactPointerEvent<SVGElement>) => void }) {
  return (
    <g className="sketch-curve-handle" data-sketch-entity="handle" onPointerDown={onPointerDown}>
      <circle className="sketch-curve-handle-hit" cx={at.x} cy={at.z} r={radius * 2} />
      <circle className={selected ? "sketch-handle-selected" : undefined} cx={at.x} cy={at.z} r={radius} />
    </g>
  );
}

function turnStep(action: Extract<PointerAction, { kind: "rotate-selection" | "rotate-image" }>) {
  const pivot = action.kind === "rotate-selection" ? action.pivot : { x: action.start.x, z: action.start.z };
  return sketchTurnStep(pivot, action.ring, action.current, action.snap);
}


const SKETCH_MEASUREMENTS_STORAGE_KEY = "layerling.sketch.measurements";
const SKETCH_KEEP_PROPORTIONS_STORAGE_KEY = "layerling.sketch.keepProportions";

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

// Lengths read and type in the workspace unit (#757); the sketch itself stays in millimetres.
function formatDimension(value: number, accuracy: 1 | 2 | 3) {
  return formatLengthMm(value, accuracy);
}

function formatPlainNumber(value: number, accuracy: 1 | 2 | 3) {
  const threshold = 0.5 * 10 ** -accuracy;
  return (Math.abs(value) < threshold ? 0 : value).toFixed(accuracy);
}

function formatWholeNumber(value: number) {
  return String(Math.round(value));
}

function defaultCornerText() {
  return formatLengthMm(2, 2);
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

/** The middle, the four corners and the middles of the four sides of a rectangular body shown underneath (#624). */
function rectangleReferencePoints(x: number, z: number, halfWidth: number, halfDepth: number) {
  const corners = [
    { x: x - halfWidth, z: z - halfDepth },
    { x: x + halfWidth, z: z - halfDepth },
    { x: x + halfWidth, z: z + halfDepth },
    { x: x - halfWidth, z: z + halfDepth },
  ];
  return [{ x, z }, ...corners, ...outlineSideMiddles(corners)];
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

/** One triangle of a fill, always wound the same way: under the nonzero rule triangles wound against each other cancel where they overlap, as the parts of a group do (#778). */
function trianglePath(points: Array<{ x: number; z: number }>) {
  const [a, b, c] = (points[1].x - points[0].x) * (points[2].z - points[0].z) - (points[2].x - points[0].x) * (points[1].z - points[0].z) < 0
    ? [points[0], points[2], points[1]]
    : points;
  return `M ${a.x} ${a.z} L ${b.x} ${b.z} L ${c.x} ${c.z} Z`;
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

export function importedMeshFootprint(shape: WorkplaneShape): SketchReferenceFootprint | null {
  if (!shape.importedMesh) return null;
  const positions = resizedImportedMeshPositions(shape);
  const project = (x: number, z: number) => sketchReferencePoint(shape, x, z);
  const size = Math.max(shape.width, shape.depth, shape.height);
  const counts = shape.importedMesh.partTriangleCounts;
  if (!counts?.length) return footprintOfPositions(positions, project, size, shape.height);
  // On a workplane set on a face (#778) each part shows as it is seen from the plane: the face on the plane alone was a thin
  // strip when the plane stood a little askew, and a group left out its parts behind the plane.
  const fills: string[] = [];
  const outlines: string[] = [];
  let start = 0;
  for (const count of counts) {
    const part = footprintOfPositions(positions.slice(start * 9, (start + count) * 9), project, size, shape.height, true);
    if (part?.fillD) fills.push(part.fillD);
    if (part?.outlineD) outlines.push(part.outlineD);
    start += count;
  }
  if (!outlines.length) return null;
  return { fillD: fills.length === outlines.length ? fills.join(" ") : null, outlineD: outlines.join(" ") };
}

/** More triangles than this and a body is shown by its box, not by an outline made of its triangles. */
const REFERENCE_OUTLINE_TRIANGLE_LIMIT = 20000;

/**
 * The outline of a body that is neither an imported mesh nor a round or box shape, from its own mesh (#596): a polygon, a star,
 * a heart or a wedge was drawn as the rectangle of its width and depth, the same square for all of them.
 */
export function shapeMeshFootprint(shape: WorkplaneShape): SketchReferenceFootprint | null {
  if (shape.importedMesh || shape.kind === "box" || (isRoundReference(shape) && !shape.groupedShapes?.length)) return null;
  let mesh: ReturnType<typeof meshForShape>;
  try {
    mesh = meshForShape(shape);
  } catch {
    return null;
  }
  if (!mesh.faces.length) return null;
  // A group's limit counts per part (#834): a knurl and a bolt, each under it, were over it together, and the group fell
  // back to its box, one square for both.
  if (shape.groupedShapes?.length) return groupMeshFootprint(shape, mesh);
  if (mesh.faces.length > REFERENCE_OUTLINE_TRIANGLE_LIMIT) return null;
  const positions: number[] = [];
  mesh.faces.forEach((face) => face.forEach((index) => positions.push(...mesh.vertices[index])));
  // An edge treatment on the bottom takes the bottom face in from the body's wall: the outline is the body as seen from above,
  // or a 10 mm square with its bottom edges chamfered showed as 9 mm (#1006).
  const treated = Boolean(shape.edgeTreatments?.length || shape.edgeTreatmentHistory?.length);
  const footprint = footprintOfPositions(positions, (x, z) => ({ x, z }), Math.max(shape.width, shape.depth, shape.height), shape.height, treated);
  return footprint ? { ...footprint, world: true } : null;
}

/**
 * The outline of a group (#778): each visible member's own outline, in one path. A group's mesh holds its members one after
 * the other, so a member's triangles are the ones whose vertices lie in its range. Taken as one body, the group would show only
 * the bottom of its lowest member, and a group with a plate on top of a gear showed the gear, not the plate; without the mesh
 * it fell back to a box, the same square for every group.
 */
function groupMeshFootprint(shape: WorkplaneShape, mesh: ReturnType<typeof meshForShape>): SketchReferenceFootprint | null {
  const fills: string[] = [];
  const outlines: string[] = [];
  let start = 0;
  for (const child of (shape.groupedShapes ?? []).filter((entry) => !entry.hidden)) {
    let count: number;
    try {
      count = meshForShape(child).vertices.length;
    } catch {
      return null;
    }
    const end = start + count;
    const positions: number[] = [];
    let faces = 0;
    mesh.faces.forEach((face) => {
      if (face[0] >= start && face[0] < end) {
        face.forEach((index) => positions.push(...mesh.vertices[index]));
        faces += 1;
      }
    });
    // A part with more triangles than an outline is worked out from shows as its own box, the others keep their outline.
    const part = faces > REFERENCE_OUTLINE_TRIANGLE_LIMIT
      ? boxOfPositions(positions)
      : footprintOfPositions(positions, (x, z) => ({ x, z }), Math.max(child.width, child.depth, child.height), child.height);
    if (part?.fillD) fills.push(part.fillD);
    if (part?.outlineD) outlines.push(part.outlineD);
    start = end;
  }
  if (!outlines.length) return null;
  return { fillD: fills.length === outlines.length ? fills.join(" ") : null, outlineD: outlines.join(" "), world: true };
}

/** The rectangle round a part's points seen from above, for a part too fine to work its outline out from. */
function boxOfPositions(positions: ArrayLike<number>): SketchReferenceFootprint | null {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  for (let index = 0; index + 2 < positions.length; index += 3) {
    minX = Math.min(minX, positions[index]);
    maxX = Math.max(maxX, positions[index]);
    minZ = Math.min(minZ, positions[index + 2]);
    maxZ = Math.max(maxZ, positions[index + 2]);
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minZ)) return null;
  const d = `M ${minX} ${minZ} L ${maxX} ${minZ} L ${maxX} ${maxZ} L ${minX} ${maxZ} Z`;
  return { fillD: d, outlineD: d };
}

/**
 * The outline of a mesh seen from above: its bottom triangles, as a fill and as the boundary round them; as it is seen from
 * above when it has no flat bottom or `asSeen` asks for that (#778).
 */
export function footprintOfPositions(
  positions: ArrayLike<number>,
  project: (x: number, z: number) => { x: number; z: number },
  size: number,
  height: number,
  asSeen = false,
): SketchReferenceFootprint | null {
  if (positions.length < 9) return null;
  let minY = Number.POSITIVE_INFINITY;
  for (let index = 1; index < positions.length; index += 3) {
    minY = Math.min(minY, positions[index]);
  }
  if (!Number.isFinite(minY)) return null;

  const tolerance = Math.max(0.001, size / 100000);
  const bottomTolerance = Math.max(0.025, height * 0.003);
  const points: Array<{ x: number; z: number }> = [];
  const triangles: number[][] = [];
  const allProjected: Array<{ x: number; z: number }> = [];

  for (let index = 0; index + 8 < positions.length; index += 9) {
    const ys = [positions[index + 1], positions[index + 4], positions[index + 7]];
    const projected = [
      project(positions[index], positions[index + 2]),
      project(positions[index + 3], positions[index + 5]),
      project(positions[index + 6], positions[index + 8]),
    ];
    allProjected.push(...projected);
    if (!ys.every((value) => value <= minY + bottomTolerance) || triangleArea2d(projected[0], projected[1], projected[2]) <= tolerance) {
      continue;
    }
    const offset = points.length;
    points.push(...projected);
    triangles.push([offset, offset + 1, offset + 2]);
  }

  if (triangles.length > 0 && !asSeen) {
    return {
      fillD: triangles.length <= 5000 ? triangles.map((triangle) => trianglePath(triangle.map((index) => points[index]))).join(" ") : null,
      outlineD: boundaryPath(points, triangles, tolerance),
    };
  }

  // No face lies on the plane: the body as it is seen from the plane. The triangles turned towards it cover that outline once,
  // edge to edge, on a closed body; the hull round all points was drawn here before and showed a tower of a box, a cylinder, a
  // sphere and a cone as one rough polygon (#778). A body turned the other way round has the larger side the other way.
  const facing: number[][][] = [[], []];
  const facingArea = [0, 0];
  for (let index = 0; index + 2 < allProjected.length; index += 3) {
    const [a, b, c] = allProjected.slice(index, index + 3);
    const signed = (b.x - a.x) * (c.z - a.z) - (c.x - a.x) * (b.z - a.z);
    if (Math.abs(signed) / 2 <= tolerance) continue;
    const side = signed > 0 ? 0 : 1;
    facing[side].push([index, index + 1, index + 2]);
    facingArea[side] += Math.abs(signed) / 2;
  }
  const seen = facingArea[0] >= facingArea[1] ? facing[0] : facing[1];
  if (seen.length > 0 && seen.length <= REFERENCE_OUTLINE_TRIANGLE_LIMIT) {
    const outlineD = boundaryPath(allProjected, seen, tolerance);
    if (outlineD) return { fillD: seen.length <= 5000 ? seen.map((triangle) => trianglePath(triangle.map((index) => allProjected[index]))).join(" ") : null, outlineD };
  }

  const hull = convexHull(allProjected);
  if (hull.length < 3) return null;
  const d = `M ${hull[0].x} ${hull[0].z} ${hull.slice(1).map((point) => `L ${point.x} ${point.z}`).join(" ")} Z`;
  return { fillD: d, outlineD: d };
}

export function SketchWorkspace({
  profile,
  operation = "extrude",
  onOperationChange,
  onSweepAnchorChange,
  revolvePreviewPositions = null,
  referenceShapes,
  referenceSlices,
  referenceEdges,
  showReferenceEdges,
  onToggleReferenceEdges,
  tool,
  activePointId,
  selected,
  measurement,
  pendingMeasurementStart,
  initialSnap,
  onSnapChange,
  initialWorkspace,
  onPlanePoint,
  fromMiddle,
  onAddPrimitive,
  onAddArc,
  onPointPress,
  onFinishLine,
  onSelectSegment,
  onSelectMany,
  onEraseMany,
  onToggleSelect,
  onSelectImage,
  onUpdateImage,
  onDeleteImage,
  onTraceImage,
  onDeletePoint,
  onDeleteSegment,
  onMovePoint,
  onToggleOutlineLock,
  onTransformPoints,
  onMoveHandle,
  onSelectTool,
  onInsertPoint,
  onSetPointMode,
  onSetPointsMode,
  onCurveThroughPoints,
  onCurveSegment,
  onCurveSegments,
  onMirror,
  onStraightenSegment,
  onStraightenSegments,
  onSetSegmentConstruction,
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
  notes,
  noteNumbers,
  noteMode = false,
  notesVisible = true,
  noteCount = 0,
  onNoteTool,
  onToggleNotes,
  onAddNote,
  onUpdateNote,
  onRemoveNote,
}: SketchWorkspaceProps) {
  useLanguage();
  const cameraBarMove = useMovablePanel<HTMLDivElement>("layerling.sketch.cameraBarPosition", CAMERA_BAR_PANEL);
  const [cameraBarCollapsed, setCameraBarCollapsed] = useState(false);
  const workspace = useMemo(() => normalizeWorkspaceSettings(initialWorkspace, DEFAULT_WORKPLANE_WORKSPACE), [initialWorkspace]);
  setLengthUnit(workspace);
  const unitLabel = lengthDisplayUnit(workspace).label;
  const [snap, setSnap] = useState<GridSize>(() => normalizeSnapGrid(initialSnap, DEFAULT_SNAP_GRID));
  // One grid for the sketch and the 3D view: what the editor holds wins, and a pick here goes back to it.
  useEffect(() => {
    setSnap(normalizeSnapGrid(initialSnap, DEFAULT_SNAP_GRID));
  }, [initialSnap]);
  const snapRef = useRef(snap);
  snapRef.current = snap;
  const chooseSnap = useCallback<Dispatch<SetStateAction<GridSize>>>((value) => {
    const next = typeof value === "function" ? value(snapRef.current) : value;
    setSnap(next);
    onSnapChange?.(next);
  }, [onSnapChange]);
  const [snapOpen, setSnapOpen] = useState(false);
  const [view, setView] = useState<SketchView>({ zoom: 1, pan: { x: 0, z: 0 } });
  const { zoom, pan } = view;
  const viewSlide = useSketchViewSlide(setView);
  // Where the last left press on the empty plate began a selection frame; any other press clears it, so only a
  // double click there centres the view, as in the 3D view.
  const emptyPressRef = useRef<{ x: number; y: number } | null>(null);
  const [hover, setHover] = useState<{ x: number; z: number } | null>(null);
  // The three-point arc (#643): the two ends clicked so far; the third click sets the bend.
  const [arcPicks, setArcPicks] = useState<SketchArcEnd[]>([]);
  useEffect(() => {
    setArcPicks([]);
  }, [tool]);
  useEffect(() => {
    if (arcPicks.length === 0) return;
    const cancel = (event: KeyboardEvent) => {
      if (event.key === "Escape") setArcPicks([]);
    };
    window.addEventListener("keydown", cancel);
    return () => window.removeEventListener("keydown", cancel);
  }, [arcPicks.length]);
  const pickArcPoint = (spot: SketchArcEnd) => {
    if (arcPicks.length < 2) {
      const previous = arcPicks[0];
      if (previous && Math.hypot(previous.x - spot.x, previous.z - spot.z) < 1e-6) return;
      setArcPicks([...arcPicks, spot]);
      return;
    }
    onAddArc?.(arcPicks[0], { x: spot.x, z: spot.z }, arcPicks[1]);
    setArcPicks([]);
  };
  // A handle that was clicked (#347): the arrow keys then move it by one grid step, for a precise shape.
  const [selectedHandle, setSelectedHandle] = useState<{ pointId: string; handle: "in" | "out" } | null>(null);
  useEffect(() => {
    setSelectedHandle(null);
  }, [selected, tool]);
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
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
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
  // "Keep proportions" (#653): the frame's handles and typed sizes stretch both ways alike, as Shift does on a corner.
  const [keepProportions, setKeepProportions] = useState(false);
  const keepProportionsRef = useRef(false);
  keepProportionsRef.current = keepProportions;
  useEffect(() => {
    try {
      if (window.localStorage.getItem(SKETCH_KEEP_PROPORTIONS_STORAGE_KEY) === "true") setKeepProportions(true);
    } catch {
      // Without storage the switch simply starts off.
    }
  }, []);
  const toggleKeepProportions = () => {
    const next = !keepProportionsRef.current;
    keepProportionsRef.current = next;
    setKeepProportions(next);
    try {
      window.localStorage.setItem(SKETCH_KEEP_PROPORTIONS_STORAGE_KEY, String(next));
    } catch {
      // The switch still holds for this session.
    }
  };
  const previewProfile = useMemo(() => {
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
      const resized = resizeSketchPoints(pointerAction.startPoints, pointerAction.bounds, pointerAction.handle, resizeTarget(pointerAction), pointerAction.proportional || keepProportions);
      const resizedById = new Map(resized.map((point) => [point.id, point]));
      return { ...profile, points: profile.points.map((point) => resizedById.get(point.id) ?? point) };
    }
    if (pointerAction?.kind === "rotate-selection") {
      const turned = rotateSketchPointsAbout(pointerAction.startPoints, pointerAction.pivot, dragRotationDegrees(pointerAction.pivot, pointerAction.start, pointerAction.current, turnStep(pointerAction)));
      const turnedById = new Map(turned.map((point) => [point.id, point]));
      return { ...profile, points: profile.points.map((point) => turnedById.get(point.id) ?? point) };
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
  // A drag that would move a locked outline (#653) shows nothing moving: the editor refuses it on release.
  const displayProfile = useMemo(() => previewProfile !== profile && changesLockedOutline(profile, previewProfile) ? profile : previewProfile, [previewProfile, profile]);
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
      return images.map((image) => image.id === pointerAction.imageId ? { ...image, ...rotateImage(pointerAction.start, pointerAction.startAngle, pointerAction.current, turnStep(pointerAction)) } : image);
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
  // Trace (Nachzeichnen) belongs to the selected image too: its settings and the outlines it would give.
  const [traceImageId, setTraceImageId] = useState<string | null>(null);
  const tracing = traceImageId !== null && traceImageId === selectedImageId && tool === "select";
  const traceImage = tracing ? profile.images?.find((image) => image.id === traceImageId) ?? null : null;
  const imageTrace = useSketchImageTrace(traceImage, tracing);
  useEffect(() => {
    setCropMode(false);
    setCalibration(null);
    setTraceImageId(null);
  }, [selectedImageId]);
  const traceDraftLength = tracing ? imageTrace.anchors.length : 0;
  const traceRef = useRef(imageTrace);
  traceRef.current = imageTrace;
  useEffect(() => {
    if (!cropMode && !calibration && !tracing) return;
    const onKey = (event: KeyboardEvent) => {
      // Cut away and the magnetic lasso: Enter closes the line laid, Escape throws it away before it leaves Trace.
      if (event.key === "Enter" && traceDraftLength >= 3) {
        event.preventDefault();
        event.stopPropagation();
        traceRef.current.closeDraft();
        return;
      }
      if (event.key !== "Escape") return;
      // Ahead of the editor, which would otherwise also put the tool down (#664).
      markEscapeHandled(event);
      if (traceDraftLength) {
        traceRef.current.discardDraft();
        return;
      }
      setCalibration(null);
      setCropMode(false);
      setTraceImageId(null);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [calibration, cropMode, tracing, traceDraftLength]);
  const selectedGeometryPoints = selected?.kind === "multiple"
    ? selected.pointIds.map((id) => pointById.get(id)).filter((point): point is SketchPoint => Boolean(point))
    : [];
  const selectedGeometryBounds = boundsForSketchPoints(selectedGeometryPoints);
  // A selection with a locked outline in it (#653) keeps its handles, grey and inert, as a locked body in 3D.
  const selectionLock = selected?.kind === "multiple" ? sketchLockState(profile, selected.pointIds) : "none";
  // Two outlines or more selected: they can be lined up on each other (#836).
  const canAlignOutlines = selected?.kind === "multiple" && canAlignSketchSelection(profile, selected.pointIds);
  const alignOutlines = (mode: SketchAlignMode) => {
    if (selected?.kind !== "multiple") return;
    const moved = alignSketchSelection(profile, selected.pointIds, mode);
    if (moved) onTransformPoints(moved, t("sketch.aligned"));
  };
  const selectionLocked = selectionLock !== "none";
  // A typed X or Y moves the selection so its middle lies there, in mm from the sketch's origin (#1064); Y counts up the
  // screen, as the Y of the 3D editor counts towards the back.
  const moveSelectionBy = (dx: number, dz: number) => {
    if (selected?.kind !== "multiple" || selectionLocked) return;
    const moving = new Set(sketchSelectionMovePointIds(profile, selected));
    const startPoints = profile.points.filter((point) => moving.has(point.id));
    if (!startPoints.length) return;
    const allowed = clampNudge(startPoints, dx, dz, workspace.width / 2, workspace.depth / 2);
    if (Math.abs(allowed.dx) < 1e-9 && Math.abs(allowed.dz) < 1e-9) return;
    onTransformPoints(translateSketchPoints(startPoints, allowed.dx, allowed.dz), t("sketch.shapeMoved"));
  };
  const isPointSelected = (id: string) => selected?.kind === "point" ? selected.id === id : selected?.kind === "multiple" ? selected.pointIds.includes(id) : false;
  const isSegmentSelected = (id: string) => selected?.kind === "segment" ? selected.id === id : selected?.kind === "multiple" ? selected.segmentIds.includes(id) : false;
  const [localCornerDialog, setLocalCornerDialog] = useState<"fillet" | "chamfer" | null>(null);
  const activeCornerDialog = propCornerDialog !== undefined ? propCornerDialog : localCornerDialog;
  const setCornerDialog = useCallback((dialog: "fillet" | "chamfer" | null) => {
    setLocalCornerDialog(dialog);
    onCornerDialogChange?.(dialog);
  }, [onCornerDialogChange]);
  const [cornerValue, setCornerValue] = useState(defaultCornerText);
  // Mirror (#512): the bar with the choice of axis, and the step where a line is picked as the axis.
  const [mirrorOpen, setMirrorOpen] = useState(false);
  const [mirrorPicking, setMirrorPicking] = useState(false);
  useEffect(() => {
    if (selected) return;
    setMirrorOpen(false);
    setMirrorPicking(false);
  }, [selected]);
  useEffect(() => {
    if (!mirrorOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      markEscapeHandled(event);
      if (mirrorPicking) setMirrorPicking(false);
      else setMirrorOpen(false);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [mirrorOpen, mirrorPicking]);
  const closeMirror = () => {
    setMirrorOpen(false);
    setMirrorPicking(false);
  };
  const mirrorButton = onMirror ? (
    <>
      <span className="sketch-point-divider" />
      <button type="button" title={t("sketch.mirrorHint")} onClick={() => setMirrorOpen(true)}><FlipHorizontal2 /><span>{t("sketch.mirror")}</span></button>
    </>
  ) : null;

  useEffect(() => {
    setCornerDialog(null);
    setCornerValue(defaultCornerText());
  }, [selectedPoint?.id, setCornerDialog]);

  // One corner, or several selected ones that get the same radius or distance at once (#269).
  const selectedCornerIds = sketchSelectedPointIds(selected);
  // Points and lines selected together (a frame, a click inside a shape): one bar for both kinds of tool (#283).
  const selectedLines = sketchSelectedSegmentIds(selected)
    .map((id) => displayProfile.segments.find((segment) => segment.id === id))
    .filter((segment): segment is SketchSegment => Boolean(segment));
  const canCurveLines = selectedLines.some((segment) => !isSegmentCurved(displayProfile, segment));
  const canStraightenLines = selectedLines.some((segment) => isSegmentCurved(displayProfile, segment) || (segment.kind ?? "line") !== "line");
  const manyCorners = selected?.kind === "multiple" && selectedCornerIds.some((id) => canApplySketchCornerTreatment(displayProfile, id));
  const manyLines = selected?.kind === "multiple" && selectedLines.length > 0 && Boolean(onCurveSegments && onStraightenSegments);
  const canCurveThroughPoints = selected?.kind === "multiple" && Boolean(onCurveThroughPoints) && selectedCornerIds.length >= 3 && curveStretches(displayProfile, selectedCornerIds).length > 0;
  const handleApplyCorner = () => {
    if (selectedCornerIds.length === 0 || !activeCornerDialog) return;
    const val = parseLengthMm(cornerValue);
    if (!Number.isFinite(val) || val <= 0) return;
    if (activeCornerDialog === "fillet") {
      onApplyFillet?.(selectedCornerIds, val);
    } else if (activeCornerDialog === "chamfer") {
      onApplyChamfer?.(selectedCornerIds, val);
    }
    setCornerDialog(null);
  };

  const cornerDialogContent = (
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
      <span className="sketch-corner-unit">{unitLabel}</span>
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
  );

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
    const length = parseLengthMm(editingDimension.value);
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
        const size = resolveLengthMm(editingBoxSize.value, current);
        if (Number.isFinite(size) && size > 0) {
          onTransformPoints(resizeSketchPointsToSize(startPoints, bounds, editingBoxSize.axis, size, keepProportionsRef.current), t("sketch.shapeResized"));
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
      // A dragged point leaves out the middle of its own lines, which would move away under it.
      const targets = pointerAction?.kind === "move-point"
        ? [...referenceSnapPoints, ...crossingSnapPoints, ...sketchSnapPoints(displayProfile, pointerAction.pointId), ...openEndPoints(displayProfile, pointerAction.pointId)]
        : snapTargets;
      targets.forEach((candidate) => {
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

  // A finger lands beside the small point or the thin line it means. A press on the plate or on a line
  // that has a point, a handle or another line within reach goes to that part, as if it had been hit (#337).
  const touchRetargetingRef = useRef(false);
  const retargetTouchPress = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.pointerType !== "touch" || event.button !== 0 || touchRetargetingRef.current) return;
    const svg = svgRef.current;
    const at = unsnappedPointFromEvent(event);
    if (!svg || !at) return;
    const handleKinds = new Set(["handle", "selection-handle", "selection-rotate-handle", "image-handle"]);
    const hit = (event.target as Element).closest?.("[data-sketch-entity]")?.getAttribute("data-sketch-entity");
    // Right on a point or a handle: nothing to correct.
    if (hit && (hit === "point" || handleKinds.has(hit))) return;
    const candidates: Array<TouchCandidate<Element>> = [];
    svg.querySelectorAll("[data-sketch-entity]").forEach((element) => {
      const kind = element.getAttribute("data-sketch-entity") ?? "";
      const tier = kind === "point" ? "point" : handleKinds.has(kind) ? "handle" : null;
      if (!tier) return;
      const box = element.getBoundingClientRect();
      candidates.push({ target: element, tier, distance: Math.hypot(box.x + box.width / 2 - event.clientX, box.y + box.height / 2 - event.clientY) });
    });
    displayProfile.segments.forEach((segment) => {
      const start = pointById.get(segment.startId);
      const end = pointById.get(segment.endId);
      const element = svg.querySelector(`[data-segment-id="${segment.id}"]`);
      if (!start || !end || !element) return;
      const nearest = closestPointOnSketchSegment(segment, start, end, at).point;
      candidates.push({ target: element, tier: "segment", distance: Math.hypot(nearest.x - at.x, nearest.z - at.z) / screenUnit });
    });
    const best = pickTouchTarget(candidates);
    if (!best || best === event.target) return;
    event.preventDefault();
    event.stopPropagation();
    touchRetargetingRef.current = true;
    try {
      best.dispatchEvent(new PointerEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
        composed: true,
        pointerId: event.pointerId,
        pointerType: event.pointerType,
        isPrimary: event.isPrimary,
        button: 0,
        buttons: 1,
        clientX: event.clientX,
        clientY: event.clientY,
        pressure: event.pressure,
        shiftKey: event.shiftKey,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        metaKey: event.metaKey,
      }));
    } finally {
      touchRetargetingRef.current = false;
    }
  };

  // Where the right button went down: a right click that did not move ends the chain, one that did is a pan.
  const rightPressRef = useRef<{ x: number; y: number } | null>(null);

  const handlePanPointerDownCapture = (event: ReactPointerEvent<SVGSVGElement>) => {
    emptyPressRef.current = null;
    viewSlide.stop();
    // With the note tool, a click anywhere - on a line as well - puts the note there, and nothing else happens.
    const notePoint = noteMode && event.button === 0 && onAddNote ? unsnappedPointFromEvent(event) : null;
    if (notePoint) {
      event.preventDefault();
      event.stopPropagation();
      setEditingNoteId(onAddNote!(notePoint));
      return;
    }
    if (event.button === 2) rightPressRef.current = { x: event.clientX, y: event.clientY };
    if (isSketchPanGesture(event, workspace.mouseScheme)) beginPan(event);
    else retargetTouchPress(event);
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
    } else if (tool === "select" || (tool === "erase" && onEraseMany)) {
      capturePointer(event.currentTarget, event.pointerId);
      if (tool === "select") emptyPressRef.current = { x: event.clientX, y: event.clientY };
      setPointerAction({ kind: "marquee", pointerId: event.pointerId, origin: point, current: point, clientX: event.clientX, clientY: event.clientY });
    } else if (tool === "arc") {
      pickArcPoint(point);
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
      // A frame handle stands off its edge: the edge is what lands on the grid, not the pointer.
      const unsnapped = pointerAction.kind === "resize-selection" && pointerAction.grab ? unsnappedPointFromEvent(event) : null;
      // Turning measures an angle around the pivot: a pointer on the grid made it jump in uneven steps, so an
      // exact 90° was out of reach on a 1 mm grid (forum, 621358). The angle snaps by itself instead.
      const turning = pointerAction.kind === "rotate-selection" || pointerAction.kind === "rotate-image";
      const current = turning
        ? unsnappedPointFromEvent(event) ?? point
        : unsnapped && pointerAction.kind === "resize-selection" && pointerAction.grab
        ? resizePointerOnGrid(unsnapped, pointerAction.grab, snapStep(snap), workspace.width / 2, workspace.depth / 2)
        : event.shiftKey && lockOrigin ? constrainToAxis(lockOrigin, point) : point;
      setPointerAction({
        ...pointerAction,
        current,
        ...(pointerAction.kind === "resize-selection" ? { proportional: event.shiftKey } : {}),
        ...(pointerAction.kind === "rotate-image" || pointerAction.kind === "rotate-selection" ? { snap: event.shiftKey } : {}),
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
      if (tool === "erase") {
        // The Erase tool takes away what its window holds; a click on the empty plane does nothing.
        setPointerAction(null);
        if (clicked || !onEraseMany) return;
        const eraseContains = (point: { x: number; z: number }) => point.x >= Math.min(action.origin.x, action.current.x) && point.x <= Math.max(action.origin.x, action.current.x) && point.z >= Math.min(action.origin.z, action.current.z) && point.z <= Math.max(action.origin.z, action.current.z);
        onEraseMany(
          profile.points.filter(eraseContains).map((point) => point.id),
          profile.segments.filter((segment) => {
            const start = pointById.get(segment.startId);
            const end = pointById.get(segment.endId);
            return Boolean(start && end && (eraseContains(start) || eraseContains(end) || eraseContains({ x: (start.x + end.x) / 2, z: (start.z + end.z) / 2 })));
          }).map((segment) => segment.id),
        );
        return;
      }
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
      onTransformPoints(resizeSketchPoints(action.startPoints, action.bounds, action.handle, resizeTarget(action), action.proportional || keepProportionsRef.current), t("sketch.shapeResized"));
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
    } else if (action.kind === "rotate-selection") {
      const degrees = dragRotationDegrees(action.pivot, action.start, action.current, turnStep(action));
      if (Math.abs(degrees) > 1e-6) onTransformPoints(rotateSketchPointsAbout(action.startPoints, action.pivot, degrees), t("sketch.shapeRotated"));
    } else if (action.kind === "rotate-image") {
      onUpdateImage(action.imageId, rotateImage(action.start, action.startAngle, action.current, turnStep(action)), t("sketch.imageRotated"));
    } else if (action.kind === "crop-image") {
      onUpdateImage(action.imageId, cropImage(action.start, action.handle, action.current), t("sketch.imageCropped"));
    }
    setPointerAction(null);
  };

  const handleWheel = (event: ReactWheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    viewSlide.stop();
    const bounds = event.currentTarget.getBoundingClientRect();
    const offset = { x: event.clientX - (bounds.left + bounds.width / 2), y: event.clientY - (bounds.top + bounds.height / 2) };
    const pixelsPerUnit = Math.min(bounds.width / workspace.width, bounds.height / workspace.depth);
    const factor = sketchWheelZoomFactor(event, orbitControlsZoomSpeed(workspace.zoomSpeed) * SKETCH_WHEEL_ZOOM_BOOST);
    setView((current) => zoomSketchViewAt(current, factor, offset, pixelsPerUnit, workspace));
  };

  // Safari on a Mac sends no wheel steps for a pinch on the trackpad, only gestures with a scale, and zooms the whole
  // page if they are not refused (#439 forum). Each change of the scale zooms the plate under the fingers.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    let gestureScale = 1;
    const onGesture = (event: Event) => {
      if (event.cancelable) event.preventDefault();
      if (event.type === "gesturestart") {
        gestureScale = 1;
        return;
      }
      if (event.type !== "gesturechange") return;
      const gesture = event as Event & { scale?: number; clientX?: number; clientY?: number };
      if (typeof gesture.scale !== "number" || !(gesture.scale > 0)) return;
      const ratio = gesture.scale / gestureScale;
      gestureScale = gesture.scale;
      const bounds = wrap.getBoundingClientRect();
      const offset = {
        x: (gesture.clientX ?? bounds.left + bounds.width / 2) - (bounds.left + bounds.width / 2),
        y: (gesture.clientY ?? bounds.top + bounds.height / 2) - (bounds.top + bounds.height / 2),
      };
      const pixelsPerUnit = Math.min(bounds.width / workspace.width, bounds.height / workspace.depth);
      const factor = sketchPinchZoomFactor(ratio, orbitControlsZoomSpeed(workspace.zoomSpeed), orbitControlsZoomSpeed(DEFAULT_WORKPLANE_WORKSPACE.zoomSpeed));
      setView((current) => zoomSketchViewAt(current, factor, offset, pixelsPerUnit, workspace));
    };
    const names = ["gesturestart", "gesturechange", "gestureend"] as const;
    names.forEach((name) => wrap.addEventListener(name, onGesture, { passive: false }));
    return () => names.forEach((name) => wrap.removeEventListener(name, onGesture));
  }, [workspace]);

  // Matches the 3D editor's buttons: a fixed step at the slowest zoom speed, whatever the slider says.
  const zoomByButton = (distanceStep: number) => {
    const scaled = zoomDistanceScale(distanceStep);
    setView((current) => ({ ...current, zoom: clamp(current.zoom / scaled, SKETCH_MIN_ZOOM, SKETCH_MANUAL_MAX_ZOOM) }));
  };

  const resetView = useCallback(() => setView({ zoom: 1, pan: { x: 0, z: 0 } }), []);

  const focusBounds = useMemo(
    () => sketchSelectionBounds(selected, displayProfile, displayImages, pointById),
    [displayImages, displayProfile, pointById, selected],
  );

  // Like the 3D editor's Shift+F: frame the selection with a little room around it.
  const focusSelection = useCallback((): boolean => {
    if (!focusBounds) return false;
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
    return true;
  }, [focusBounds, workspace.depth, workspace.width]);

  // The keys 1 to 3 on a selection with the Select tool (#347). False when the selection has nothing to
  // change this way, so the key goes on to pick the drawing tool.
  const editSelectionByKey = (action: "straight" | "curve" | "smooth"): boolean => {
    if (tool !== "select") return false;
    const lineIds = selectedLines.map((segment) => segment.id);
    if (action === "curve") {
      if (!lineIds.length || !(onCurveSegments || onCurveSegment)) return false;
      if (canCurveLines) (onCurveSegments ?? ((ids: string[]) => ids.forEach((id) => onCurveSegment?.(id))))(lineIds);
      return true;
    }
    if (action === "straight" && lineIds.length && (onStraightenSegments || onStraightenSegment)) {
      if (canStraightenLines) (onStraightenSegments ?? ((ids: string[]) => ids.forEach((id) => onStraightenSegment?.(id))))(lineIds);
      return true;
    }
    if (!selectedCornerIds.length) return false;
    if (onSetPointsMode) onSetPointsMode(selectedCornerIds, action === "smooth" ? "smooth" : "corner");
    else if (selectedCornerIds.length === 1) onSetPointMode(selectedCornerIds[0], action === "smooth" ? "smooth" : "corner");
    else return false;
    return true;
  };

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
      // As in the 3D view: with nothing selected, Ctrl+arrows slide the sketch that way, a tenth of the
      // view a press (Shift: half).
      const panStep = !selected && !selectedHandle && !pointerAction ? viewArrowStep(event)?.pan : undefined;
      if (panStep && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        setView((current) => {
          const height = workspace.depth / current.zoom;
          return {
            ...current,
            pan: {
              x: clamp(current.pan.x - panStep[0] * height, -workspace.width / 2, workspace.width / 2),
              z: clamp(current.pan.z + panStep[1] * height, -workspace.depth / 2, workspace.depth / 2),
            },
          };
        });
        return;
      }
      const typingLength = !event.altKey && activePoint && !pointerAction && (tool === "line" || tool === "smooth") && /^[0-9.,<]$/.test(event.key);
      // Alt+digit and comma/period pick the snap step as in the 3D view (#748); while a line is drawn,
      // comma and period start its typed length instead.
      const nextSnap = typingLength ? null : snapGridForShortcut(event, snapGridOptions(workspace.units, workspace.customSnapGrids), snapRef.current);
      if (nextSnap) {
        event.preventDefault();
        chooseSnap(nextSnap);
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (typingLength) {
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
      } else if (event.key.toLowerCase() === "f") {
        // As in the 3D view: F looks at the selection, and at the whole sketch when nothing is selected (#465).
        event.preventDefault();
        if (!focusSelection()) resetView();
      } else if (event.key === "Home") {
        event.preventDefault();
        resetView();
      } else if (event.key === "+" || event.key === "=") {
        // The 3D view's key steps; with Ctrl or Cmd (returned above) they stay the browser's page zoom.
        event.preventDefault();
        zoomByButton(ZOOM_STEP_IN);
      } else if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        zoomByButton(ZOOM_STEP_OUT);
      } else if (!activePoint && !pointerAction && SKETCH_EDIT_KEYS[event.key] && editSelectionByKey(SKETCH_EDIT_KEYS[event.key])) {
        event.preventDefault();
      } else if (onSelectTool && !activePoint && !pointerAction && SKETCH_TOOL_KEYS[event.key]) {
        // 1 to 4 pick the drawing tools, as in Tinkercad (#347). While a line is being drawn the digits
        // are its length (above), so they only come here when no line is in progress.
        event.preventDefault();
        onSelectTool(SKETCH_TOOL_KEYS[event.key]);
      } else if (tool === "select" && !pointerAction && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
        // Fine moves, as on the workplane: one grid step, or a coarser one with
        // Shift. What moves is the selection - points, the ends of lines, an image.
        const step = keyboardNudgeStep(snap, event.shiftKey, keyboardNudgeCoarseFactor(workspace), event.altKey);
        const dx = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
        const dz = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
        // A clicked handle goes first (#347): it moves alone, a smooth point's other handle with it.
        const handlePoint = selectedHandle ? profile.points.find((point) => point.id === selectedHandle.pointId) : undefined;
        const handleAt = handlePoint && selectedHandle ? (selectedHandle.handle === "in" ? handlePoint.handleIn : handlePoint.handleOut) : undefined;
        if (selectedHandle && handleAt) {
          event.preventDefault();
          const moved = { x: clamp(handleAt.x + dx, -workspace.width / 2, workspace.width / 2), z: clamp(handleAt.z + dz, -workspace.depth / 2, workspace.depth / 2) };
          if (moved.x === handleAt.x && moved.z === handleAt.z) return;
          // A run of arrow presses is one step of the history, as for points (#370).
          onMoveHandle(selectedHandle.pointId, selectedHandle.handle, moved, `handle:${selectedHandle.pointId}:${selectedHandle.handle}`);
          return;
        }
        if (selected?.kind === "image") {
          const image = (profile.images ?? []).find((entry) => entry.id === selected.id);
          if (!image || image.locked) return;
          event.preventDefault();
          onUpdateImage(image.id, {
            x: clamp(image.x + dx, -workspace.width / 2, workspace.width / 2),
            z: clamp(image.z + dz, -workspace.depth / 2, workspace.depth / 2),
          }, t("sketch.imageMoved"), `image:${image.id}`);
          return;
        }
        const moving = new Set(sketchSelectionMovePointIds(profile, selected));
        const startPoints = profile.points.filter((point) => moving.has(point.id));
        if (!startPoints.length) return;
        event.preventDefault();
        const allowed = clampNudge(startPoints, dx, dz, workspace.width / 2, workspace.depth / 2);
        if (allowed.dx === 0 && allowed.dz === 0) return;
        // A run of arrow presses is one step of the history (#370).
        onTransformPoints(translateSketchPoints(startPoints, allowed.dx, allowed.dz), t("sketch.shapeMoved"), `points:${startPoints.map((point) => point.id).join(",")}`);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- editSelectionByKey is rebuilt from the selection, which is listed
  }, [activePoint, focusSelection, onMoveHandle, onSetPointMode, onSetPointsMode, onCurveSegment, onCurveSegments, onStraightenSegment, onStraightenSegments, selectedLines, selectedCornerIds, canCurveLines, canStraightenLines, onSelectTool, onTransformPoints, onUpdateImage, pendingMeasurementStart, pointerAction, profile, chooseSnap, resetView, selected, selectedHandle, snap, tool, workspace.customSnapGrids, workspace.depth, workspace.units, workspace.width]);

  const beginEntityDrag = (event: ReactPointerEvent<SVGElement>, action: PointerAction) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    capturePointer(svgRef.current, event.pointerId);
    setPointerAction(action);
  };

  const pressHandle = (event: ReactPointerEvent<SVGElement>, pointId: string, handle: "in" | "out", current: { x: number; z: number }) => {
    if (event.button === 1) {
      beginPan(event);
      return;
    }
    if (event.button === 0) setSelectedHandle({ pointId, handle });
    beginEntityDrag(event, { kind: "move-handle", pointerId: event.pointerId, pointId, handle, current });
  };

  const measurementLength = measurement ? Math.hypot(measurement.end.x - measurement.start.x, measurement.end.z - measurement.start.z) : 0;
  const measurementLabel = formatDimension(measurementLength, workspace.accuracy);
  // What the typed fields make of the next line: the angle left empty follows the pointer.
  const pointerAngle = activePoint && hover ? sketchLineAngle(activePoint, hover) : 0;
  const typedLineTarget = (() => {
    if (!typedLine || !activePoint) return null;
    const length = parseLengthMm(typedLine.length);
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
  // While it turns, the picture shows only the arrow being dragged: no resize handles.
  const imageResizeHandles: Array<{ id: ResizeHandle; x: number; z: number }> = selectedImage && !selectedImage.locked && pointerAction?.kind !== "rotate-image" ? imageHandlePositions(selectedImage) : [];
  // The part of the plate on screen: lock badges stay inside it, so a locked picture can be unlocked zoomed in.
  const visibleWidth = svgSize.width > 0 ? svgSize.width * screenUnit : width;
  const visibleDepth = svgSize.height > 0 ? svgSize.height * screenUnit : depth;
  const plateView = { minX: pan.x - visibleWidth / 2, maxX: pan.x + visibleWidth / 2, minZ: pan.z - visibleDepth / 2, maxZ: pan.z + visibleDepth / 2 };
  // As far out as the 3D editor's arrows stand from the frame; the one being dragged follows the pointer.
  const rotateHandleGap = 22 * screenUnit;
  const imageRotateSpots = selectedImage && selectedImageCorners && !selectedImage.locked && !cropMode
    ? rotateHandleSpots(selectedImageCorners, selectedImage, rotateHandleGap, pointerAction?.kind === "rotate-image" ? { corner: pointerAction.corner, at: pointerAction.current } : undefined)
    : [];
  const imageTurnLabel = pointerAction?.kind === "rotate-image" && selectedImage ? `${formatPlainNumber(selectedImage.rotation ?? 0, 1)}°` : null;
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
  const selectionResizeHandles: Array<{ id: ResizeHandle; x: number; z: number; grab: { x: number; z: number } }> = selectedGeometryBounds && selectionFrame && pointerAction?.kind !== "rotate-selection" ? ([
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
    () => new Map(referenceShapes.map((shape) => [shape.id, importedMeshFootprint(shape) ?? shapeMeshFootprint(shape)])),
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
      const footprint = referenceFootprints.get(shape.id);
      // An outline made from the body's own mesh stands in the plate's coordinates already.
      const turn = (point: { x: number; z: number }) => (footprint?.world ? point : rotateAround(point, shape.rotation ?? 0, shape.x, shape.z));
      const halfWidth = shape.width / 2;
      const halfDepth = shape.depth / 2;
      const local = footprint?.outlineD
        ? svgPathPoints(footprint.outlineD)
        : isRoundReference(shape)
          ? [{ x: shape.x, z: shape.z }, { x: shape.x - halfWidth, z: shape.z }, { x: shape.x + halfWidth, z: shape.z }, { x: shape.x, z: shape.z - halfDepth }, { x: shape.x, z: shape.z + halfDepth }]
          : rectangleReferencePoints(shape.x, shape.z, halfWidth, halfDepth);
      points.push(...local.map(turn));
    });
    // Rounded, so a corner at 0 is 0 and not 7e-15.
    return points.map((point) => ({ x: Number(point.x.toFixed(4)) || 0, z: Number(point.z.toFixed(4)) || 0 }));
  }, [referenceFootprints, referenceShapes, referenceSlices]);
  // Where construction lines cross other lines (#229): a point snaps there like to a corner of a body underneath.
  const crossingSnapPoints = useMemo(
    () => constructionCrossings(displayProfile).map((point) => ({ x: Number(point.x.toFixed(4)) || 0, z: Number(point.z.toFixed(4)) || 0 })),
    [displayProfile],
  );
  // The middles of the sketch's own lines and the centres of its circles (#624).
  const ownSnapPoints = useMemo(() => sketchSnapPoints(displayProfile), [displayProfile]);
  const snapTargets = useMemo(() => [...referenceSnapPoints, ...crossingSnapPoints, ...ownSnapPoints], [crossingSnapPoints, ownSnapPoints, referenceSnapPoints]);
  const hoverOnReference = hover ? snapTargets.some((point) => point.x === hover.x && point.z === hover.z) : false;

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
      {onOperationChange ? (
        <label className="sketch-mode-badge switchable" title={t("sketch.operationHint")}>
          <select
            aria-label={t("sketch.operationHint")}
            value={operation}
            onChange={(event) => onOperationChange(event.target.value as SketchOperation)}
          >
            <option value="extrude">{t("sketch.modeBadgeExtrude")}</option>
            <option value="revolve">{t("sketch.modeBadgeRevolve")}</option>
            <option value="sweep">{t("sketch.modeBadgeSweep")}</option>
          </select>
          {operation === "sweep" && onSweepAnchorChange ? (
            <select
              aria-label={t("sketch.sweepAnchorHint")}
              title={t("sketch.sweepAnchorHint")}
              value={profile.sweepAnchor ?? "center"}
              onChange={(event) => onSweepAnchorChange(event.target.value as SweepAnchor)}
            >
              <option value="center">{t("sketch.sweepAnchorCenter")}</option>
              <option value="left">{t("sketch.sweepAnchorLeft")}</option>
              <option value="right">{t("sketch.sweepAnchorRight")}</option>
            </select>
          ) : null}
        </label>
      ) : (
        <div className="sketch-mode-badge">{operation === "revolve" ? t("sketch.modeBadgeRevolve") : operation === "sweep" ? t("sketch.modeBadgeSweep") : t("sketch.modeBadge")}</div>
      )}
      {operation === "revolve" ? <SketchRevolvePreview positions={revolvePreviewPositions} /> : null}
      <div
        ref={cameraBarMove.panelRef}
        className={`camera-controls sketch-camera-controls ${cameraBarCollapsed ? "collapsed" : ""} ${cameraBarMove.dragging ? "moving" : ""}`}
        style={cameraBarMove.style}
        aria-label={t("sketch.viewControls")}
        data-help-section="cameraBar"
      >
        <CameraBarHandle move={cameraBarMove} collapsed={cameraBarCollapsed} onToggle={() => setCameraBarCollapsed((folded) => !folded)} />
        {cameraBarCollapsed ? null : (<>
        <div className="camera-group">
          <button aria-label={t("sketch.resetView")} aria-keyshortcuts="Home" title={t("camera.shortcut", { label: t("sketch.resetView"), keys: "Home" })} onClick={resetView}><Home size={24} strokeWidth={2.25} /></button>
          <button
            aria-label={t("camera.focusSelection")}
            aria-keyshortcuts="F Shift+F"
            title={t("camera.shortcut", { label: t("camera.focusSelection"), keys: "F" })}
            disabled={!focusBounds}
            onClick={() => focusSelection()}
          >
            <Crosshair size={24} strokeWidth={2.25} />
          </button>
        </div>
        <div className="camera-group">
          <button aria-label={t("sketch.zoomIn")} aria-keyshortcuts="+" title={t("camera.shortcut", { label: t("sketch.zoomIn"), keys: "+" })} onClick={() => zoomByButton(ZOOM_STEP_IN)}><Plus size={28} strokeWidth={2.15} /></button>
          <button aria-label={t("sketch.zoomOut")} aria-keyshortcuts="-" title={t("camera.shortcut", { label: t("sketch.zoomOut"), keys: "−" })} onClick={() => zoomByButton(ZOOM_STEP_OUT)}><Minus size={28} strokeWidth={2.15} /></button>
        </div>
        <div className="camera-group">
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
          {onToggleReferenceEdges ? (
            <button
              className={showReferenceEdges ? "active" : ""}
              aria-label={t("sketch.showPartEdges")}
              title={t("sketch.showPartEdges")}
              aria-pressed={Boolean(showReferenceEdges)}
              onClick={onToggleReferenceEdges}
            >
              <Layers size={26} strokeWidth={2.2} aria-hidden="true" />
            </button>
          ) : null}
        </div>
        {onNoteTool && onToggleNotes ? (
          <div className="camera-group note-control-group" role="group" aria-label={t("visibility.notes")}>
            <button className={noteMode ? "active" : ""} aria-label={t("editor.tool.note")} aria-pressed={noteMode} title={t("editor.tool.note")} onClick={onNoteTool}>
              <ToolbarNoteIcon />
            </button>
            <button
              className={`note-visibility-button ${notesVisible ? "" : "active"}`}
              aria-label={t("visibility.notes")}
              aria-pressed={!notesVisible}
              title={noteCount > 0 ? `${t("visibility.notes")} (${noteCount})` : t("visibility.notes")}
              disabled={noteCount === 0}
              onClick={onToggleNotes}
            >
              {notesVisible ? <Eye size={22} strokeWidth={2.1} aria-hidden="true" /> : <EyeOff size={22} strokeWidth={2.1} aria-hidden="true" />}
            </button>
          </div>
        ) : null}
        </>)}
      </div>
      <section ref={wrapRef} className="sketch-plate-wrap" aria-label="2D sketch plate">
        <svg
          ref={svgRef}
          className={`sketch-plate tool-${tool} ${pointerAction?.kind === "pan" ? "panning" : ""} ${noteMode ? "note-mode" : ""}`}
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
          onDoubleClick={(event) => {
            // A double click on the empty plate, with nothing selected, slides the view so that the spot comes to the middle.
            const press = emptyPressRef.current;
            if (event.button !== 0 || !press || noteMode || workspace.doubleClickCentersView === false) return;
            if (Math.hypot(event.clientX - press.x, event.clientY - press.y) > SKETCH_DOUBLE_CLICK_PIXELS) return;
            if (selected && (selected.kind !== "multiple" || selected.pointIds.length || selected.segmentIds.length || selected.imageIds?.length)) return;
            const spot = unsnappedPointFromEvent(event);
            if (!spot) return;
            viewSlide.slideTo(pan, {
              x: clamp(spot.x, -workspace.width / 2, workspace.width / 2),
              z: clamp(spot.z, -workspace.depth / 2, workspace.depth / 2),
            });
          }}
          onContextMenu={(event) => {
            event.preventDefault();
            if (onFinishLine && activePointId && isChainDrawingTool(tool) && rightClickEndsChain(rightPressRef.current, { x: event.clientX, y: event.clientY })) onFinishLine();
            rightPressRef.current = null;
          }}
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
                className={tracing && (imageTrace.picking || imageTrace.drawing) && image.id === traceImageId ? "trace-picking" : image.locked ? "locked" : calibration?.imageId === image.id ? "calibrating" : undefined}
                aria-label={image.name}
                href={image.dataUrl}
                x={0}
                y={0}
                width={Math.max(1, image.pixelWidth)}
                height={Math.max(1, image.pixelHeight)}
                opacity={image.opacity ?? 0.55}
                preserveAspectRatio="none"
                pointerEvents={tool === "select" || (tracing && (imageTrace.picking || imageTrace.drawing)) ? "auto" : "none"}
                onPointerMove={(event) => {
                  // The line on to the pointer, as the next click would lay it.
                  if (tracing && imageTrace.drawing && imageTrace.anchors.length && image.id === traceImageId && imageTrace.size) {
                    const spot = unsnappedPointFromEvent(event);
                    imageTrace.hoverDraft(spot ? planePointToTraced(image, imageTrace.size, spot) : null);
                  }
                }}
                onPointerLeave={() => {
                  if (tracing && imageTrace.drawing && image.id === traceImageId) imageTrace.hoverDraft(null);
                }}
                onPointerDown={(event) => {
                  // Trace's Cut away and magnetic lasso: clicks set the line's spots; a double click, or one on the first spot, closes it.
                  if (tracing && imageTrace.drawing && image.id === traceImageId && imageTrace.size && event.button === 0) {
                    event.preventDefault();
                    event.stopPropagation();
                    const spot = unsnappedPointFromEvent(event);
                    if (!spot) return;
                    const first = imageTrace.anchors[0] ? tracedPointOnPlane(image, imageTrace.size, imageTrace.anchors[0]) : null;
                    const onFirst = first && Math.hypot(first.x - spot.x, first.z - spot.z) <= 6 * screenUnit;
                    if (imageTrace.anchors.length >= 3 && (event.detail >= 2 || onFirst)) imageTrace.closeDraft();
                    else if (event.detail < 2) imageTrace.addDraftPoint(planePointToTraced(image, imageTrace.size, spot));
                    return;
                  }
                  // Trace's Pick areas: a click on the picture adds the area of like colour there.
                  if (tracing && imageTrace.picking && image.id === traceImageId && imageTrace.size && event.button === 0) {
                    event.preventDefault();
                    event.stopPropagation();
                    const spot = unsnappedPointFromEvent(event);
                    if (spot) imageTrace.addArea(planePointToTraced(image, imageTrace.size, spot));
                    return;
                  }
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
          {tracing && selectedImage && imageTrace.trace && imageTrace.size ? (
            // Trace: the outlines the settings give, over the picture, with their points - corners square, smooth points round.
            <g className="sketch-trace-preview" pointerEvents="none">
              {/* What falls away - outside the outlines, in the holes, what is cut away - is covered by the plate, so only what stays shows of the picture. */}
              <path
                className="background"
                fillRule="evenodd"
                d={`M${[{ x: 0, y: 0 }, { x: imageTrace.size.width, y: 0 }, { x: imageTrace.size.width, y: imageTrace.size.height }, { x: 0, y: imageTrace.size.height }].map((corner) => { const spot = tracedPointOnPlane(selectedImage, imageTrace.size!, corner); return `${spot.x} ${spot.z}`; }).join("L")}Z${tracePreviewPath({ rings: imageTrace.trace.rings.filter((ring) => !ring.line) }, selectedImage, imageTrace.size)}`}
              />
              <path d={tracePreviewPath({ rings: imageTrace.trace.rings.filter((ring) => !ring.line) }, selectedImage, imageTrace.size)} fillRule="evenodd" />
              {/* The regions drawn by hand - taken in or cut away - and the line being laid, on to the pointer. */}
              {(imageTrace.settings?.regions ?? []).map((region) => (
                <path
                  key={`region-${region.id}`}
                  className={`${region.add ? "taken" : "cut"}${`r:${region.id}` === imageTrace.highlight ? " highlight" : ""}`}
                  d={`${tracedLinePath(region.points, selectedImage, imageTrace.size!)}Z`}
                />
              ))}
              {imageTrace.draft.length > 1 ? (
                <path className={`${imageTrace.drawing === "lasso" ? "taken" : "cut"} draft`} d={tracedLinePath(imageTrace.draft, selectedImage, imageTrace.size)} />
              ) : null}
              {imageTrace.hover.length > 1 ? (
                <path className={`${imageTrace.drawing === "lasso" ? "taken" : "cut"} draft hover`} d={tracedLinePath(imageTrace.hover, selectedImage, imageTrace.size)} />
              ) : null}
              {imageTrace.anchors.map((point, index) => {
                const spot = tracedPointOnPlane(selectedImage, imageTrace.size!, point);
                return <circle key={`draft-${index}`} className={`draft${index === 0 ? " first" : ""}${imageTrace.drawing === "lasso" ? " lasso" : ""}`} cx={spot.x} cy={spot.z} r={(index === 0 ? 2.6 : 1.8) * screenUnit} />;
              })}
              {imageTrace.trace.rings.map((ring) => ring.source === "outline" || ring.source === "cut" ? null : (
                <path
                  key={ring.key}
                  className={`ring ${ring.source}${ring.line ? " line" : ""}${ring.key === imageTrace.highlight ? " highlight" : ""}`}
                  d={tracePreviewPath({ rings: [ring] }, selectedImage, imageTrace.size!)}
                />
              ))}
              {imageTrace.trace.rings.flatMap((ring, ringIndex) => ring.nodes.map((node, nodeIndex) => {
                const spot = tracedPointOnPlane(selectedImage, imageTrace.size!, node);
                const size = 1.7 * screenUnit;
                return node.corner
                  ? <rect key={`${ringIndex}-${nodeIndex}`} className="corner" x={spot.x - size} y={spot.z - size} width={2 * size} height={2 * size} />
                  : <circle key={`${ringIndex}-${nodeIndex}`} cx={spot.x} cy={spot.z} r={size} />;
              }))}
            </g>
          ) : null}
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
                <g key={shape.id} transform={footprint?.world ? undefined : `rotate(${shape.rotation ?? 0} ${shape.x} ${shape.z})`}>
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
          {showReferenceEdges && referenceEdges ? <path className="sketch-reference-edges" d={referenceEdges} fill="none" vectorEffect="non-scaling-stroke" pointerEvents="none" /> : null}
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
            {/* One body at a time, with its holes: pushed over each other, two shapes show as one body, not as a hole (#239). */}
            {closedPathRegions(paths).map((region) => (
              <path key={region.outer.id} d={[region.outer, ...region.holes].map(pathData).join(" ")} />
            ))}
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
                className={[isSegmentSelected(segment.id) ? "selected" : "", segment.construction ? "construction" : "", pointById.get(segment.startId)?.locked && pointById.get(segment.endId)?.locked ? "locked" : ""].filter(Boolean).join(" ")}
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
                  else if (mirrorPicking && event.button === 0 && onMirror) {
                    onMirror({ segmentId: segment.id });
                    closeMirror();
                  }
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
              // While a line is picked as the mirror axis (#512) the frame lets the click through to the lines.
              <g className="sketch-geometry-selection" pointerEvents={mirrorPicking ? "none" : undefined}>
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
                  const editable = selected?.kind === "multiple" && !selectionLocked;
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
                    className={`sketch-geometry-resize-handle handle-${handle.id} ${selectionLocked ? "locked" : ""}`}
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
                      if (event.button !== 0 || selected?.kind !== "multiple" || selectionLocked) return;
                      const startPoints = selected.pointIds.map((id) => profile.points.find((entry) => entry.id === id)).filter((entry): entry is SketchPoint => Boolean(entry)).map((entry) => ({ ...entry, handleIn: entry.handleIn ? { ...entry.handleIn } : undefined, handleOut: entry.handleOut ? { ...entry.handleOut } : undefined }));
                      const bounds = boundsForSketchPoints(startPoints);
                      if (!bounds) return;
                      beginEntityDrag(event, { kind: "resize-selection", pointerId: event.pointerId, handle: handle.id, current: { x: handle.x, z: handle.z }, grab: handle.grab, startPoints, bounds });
                    }}
                  >
                    {selectionLocked ? <title>{t("status.objectLocked")}</title> : null}
                  </rect>
                ))}
                {selectionFrame && selected?.kind === "multiple" && !selected.imageIds?.length ? (() => {
                  // A curved arrow beyond each corner turns the selection about its middle (#330), like a picture's.
                  const frameCorners = [
                    { x: selectionFrame.minX, z: selectionFrame.minZ }, { x: selectionFrame.maxX, z: selectionFrame.minZ },
                    { x: selectionFrame.maxX, z: selectionFrame.maxZ }, { x: selectionFrame.minX, z: selectionFrame.maxZ },
                  ];
                  const frameCentre = { x: (selectionFrame.minX + selectionFrame.maxX) / 2, z: (selectionFrame.minZ + selectionFrame.maxZ) / 2 };
                  const turning = pointerAction?.kind === "rotate-selection" ? pointerAction : null;
                  const turnLabel = turning ? `${Math.round(dragRotationDegrees(turning.pivot, turning.start, turning.current, turnStep(turning)) * 10) / 10}°` : null;
                  const pill = turnLabel ? dimensionPillSize(turnLabel, screenUnit, 18) : null;
                  return (
                    <>
                      <SketchRotateHandles
                        spots={rotateHandleSpots(frameCorners, frameCentre, rotateHandleGap, turning ? { corner: turning.corner, at: turning.current } : undefined)}
                        screenUnit={screenUnit}
                        entity="selection-rotate-handle"
                        locked={selectionLocked}
                        title={t(selectionLocked ? "status.objectLocked" : "sketch.rotateSelection")}
                        onPointerDown={(event, corner) => {
                          if (event.button === 1) {
                            beginPan(event);
                            return;
                          }
                          if (event.button !== 0 || selected?.kind !== "multiple" || selectionLocked) return;
                          const startPoints = selected.pointIds.map((id) => profile.points.find((entry) => entry.id === id)).filter((entry): entry is SketchPoint => Boolean(entry)).map((entry) => ({ ...entry }));
                          const point = unsnappedPointFromEvent(event);
                          if (!point || startPoints.length < 1) return;
                          beginEntityDrag(event, { kind: "rotate-selection", pointerId: event.pointerId, pivot: sketchPointsPivot(startPoints), start: point, current: point, startPoints, snap: event.shiftKey, ring: sketchTurnRing(sketchPointsPivot(startPoints), point), corner });
                        }}
                      />
                      {selectionLock === "all" && tool === "select" ? (() => {
                        // A locked outline wears the picture's padlock while selected: a click on it unlocks the outline.
                        const spot = lockBadgeSpot(frameCorners[0], frameCorners, plateView, 28 * screenUnit);
                        return spot ? (
                          <SketchLockBadge
                            spot={spot}
                            screenUnit={screenUnit}
                            title={t("sketch.unlockOutlineHint")}
                            onPointerDown={(event) => {
                              if (event.button !== 0) return;
                              event.preventDefault();
                              event.stopPropagation();
                              onToggleOutlineLock?.();
                            }}
                          />
                        ) : null;
                      })() : null}
                      {turning ? <SketchTurnRing pivot={turning.pivot} radius={turning.ring} active={turnStep(turning) === SKETCH_TURN_RING_STEP} screenUnit={screenUnit} /> : null}
                      {pill && turnLabel && turning ? (
                        // The angle rides above the pointer while turning.
                        <g className="sketch-geometry-dimension" pointerEvents="none" transform={`translate(${turning.current.x} ${turning.current.z - 40 * screenUnit})`}>
                          <rect x={-pill.width / 2} y={-pill.height / 2} width={pill.width} height={pill.height} rx={pill.radius} />
                          <text y={5 * screenUnit} fontSize={13 * screenUnit}>{turnLabel}</text>
                        </g>
                      ) : null}
                    </>
                  );
                })() : null}
              </g>
            );
          })() : null}
          {hover && hoverOnReference ? <circle className="sketch-reference-snap" cx={hover.x} cy={hover.z} r={7 * screenUnit} pointerEvents="none" /> : null}
          {activePoint && previewEnd && pointerAction?.kind !== "bezier" && ["line", "bezier", "smooth"].includes(tool) ? <line className="sketch-preview-line" x1={activePoint.x} y1={activePoint.z} x2={previewEnd.x} y2={previewEnd.z} pointerEvents="none" /> : null}
          {tool === "arc" && arcPicks.length === 1 && hover ? (
            <line className="sketch-preview-line" x1={arcPicks[0].x} y1={arcPicks[0].z} x2={hover.x} y2={hover.z} pointerEvents="none" />
          ) : null}
          {tool === "arc" && arcPicks.length === 2 && hover ? (() => {
            const arc = arcThroughThreePoints(arcPicks[0], hover, arcPicks[1]);
            if (!arc) return <line className="sketch-preview-line" x1={arcPicks[0].x} y1={arcPicks[0].z} x2={arcPicks[1].x} y2={arcPicks[1].z} pointerEvents="none" />;
            return <polyline className="sketch-preview-line" fill="none" points={arcPreviewPoints(arc).map((spot) => `${spot.x},${spot.z}`).join(" ")} pointerEvents="none" />;
          })() : null}
          {tool === "arc" ? arcPicks.map((pick, index) => (
            <circle key={`arc-pick-${index}`} className="sketch-cursor-point" cx={pick.x} cy={pick.z} r={hoverPointRadius} pointerEvents="none" />
          )) : null}
          {fromMiddle && tool === "line" && activePoint && previewEnd && pointerAction?.kind !== "bezier" ?<line className="sketch-preview-line" x1={activePoint.x} y1={activePoint.z} x2={2 * activePoint.x - previewEnd.x} y2={2 * activePoint.z - previewEnd.z} pointerEvents="none" /> : null}
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
            const outHandle = displayedHandle(displayProfile, start, "out") ?? start.handleOut;
            const inHandle = displayedHandle(displayProfile, end, "in") ?? end.handleIn;
            return (
              <g className="sketch-curve-handles">
                <line x1={start.x} y1={start.z} x2={outHandle.x} y2={outHandle.z} />
                <CurveHandle at={outHandle} radius={controlPointRadius} selected={selectedHandle?.pointId === start.id && selectedHandle.handle === "out"} onPointerDown={(event) => pressHandle(event, start.id, "out", outHandle)} />
                <line x1={end.x} y1={end.z} x2={inHandle.x} y2={inHandle.z} />
                <CurveHandle at={inHandle} radius={controlPointRadius} selected={selectedHandle?.pointId === end.id && selectedHandle.handle === "in"} onPointerDown={(event) => pressHandle(event, end.id, "in", inHandle)} />
              </g>
            );
          })() : null}
          {selectedPoint && tool === "select" && !mirrorOpen ? (() => {
            const inHandle = selectedPoint.handleIn ? displayedHandle(displayProfile, selectedPoint, "in") ?? selectedPoint.handleIn : null;
            const outHandle = selectedPoint.handleOut ? displayedHandle(displayProfile, selectedPoint, "out") ?? selectedPoint.handleOut : null;
            return (
              <g className="sketch-curve-handles">
                {inHandle ? <><line x1={selectedPoint.x} y1={selectedPoint.z} x2={inHandle.x} y2={inHandle.z} /><CurveHandle at={inHandle} radius={controlPointRadius} selected={selectedHandle?.pointId === selectedPoint.id && selectedHandle.handle === "in"} onPointerDown={(event) => pressHandle(event, selectedPoint.id, "in", inHandle)} /></> : null}
                {outHandle ? <><line x1={selectedPoint.x} y1={selectedPoint.z} x2={outHandle.x} y2={outHandle.z} /><CurveHandle at={outHandle} radius={controlPointRadius} selected={selectedHandle?.pointId === selectedPoint.id && selectedHandle.handle === "out"} onPointerDown={(event) => pressHandle(event, selectedPoint.id, "out", outHandle)} /></> : null}
              </g>
            );
          })() : null}
          <g className="sketch-points">
            {displayProfile.points.map((point) => (
              <circle
                data-sketch-entity="point"
                className={`${isPointSelected(point.id) ? "selected" : ""} ${activePointId === point.id ? "active" : ""} ${point.locked ? "locked" : ""}`}
                key={point.id}
                cx={point.x}
                cy={point.z}
                r={pointRadius}
                onDoubleClick={() => {
                  // A double click on the last point ends the chain (#520).
                  if (onFinishLine && activePointId === point.id && isChainDrawingTool(tool)) onFinishLine();
                }}
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (event.button === 1) {
                    beginPan(event);
                  } else if (event.button === 0 && tool === "arc") {
                    // An end on an existing point joins it; as the third click it only gives the bend.
                    pickArcPoint({ x: point.x, z: point.z, pointId: point.id });
                  } else if (tool === "erase" || tool === "refine") {
                    onDeletePoint(point.id);
                  } else if (event.button === 0 && tool === "select" && event.shiftKey) {
                    // No drag here: Shift only changes what is selected.
                    onToggleSelect({ kind: "point", id: point.id });
                  } else if (event.button === 0 && tool === "select") {
                    onPointPress(point.id);
                    beginEntityDrag(event, { kind: "move-point", pointerId: event.pointerId, pointId: point.id, origin: { x: point.x, z: point.z }, current: { x: point.x, z: point.z } });
                  } else if (event.button === 0 && tool === "bezier" && activePointId !== point.id) {
                    // A Bezier side may start or end on a point that is already there, and pulling handles out of it works as on empty plane (#635).
                    beginEntityDrag(event, { kind: "bezier", pointerId: event.pointerId, origin: { x: point.x, z: point.z }, current: { x: point.x, z: point.z } });
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
              {imageRotateSpots.length ? (
                // A curved arrow beyond each corner turns the picture about its middle, as in the 3D editor.
                <SketchRotateHandles
                  spots={imageRotateSpots}
                  screenUnit={screenUnit}
                  entity="image-handle"
                  title={t("sketch.rotateSelection")}
                  onPointerDown={(event, corner) => {
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
                      ring: sketchTurnRing(selectedImage, point),
                      corner,
                    });
                  }}
                />
              ) : null}
              {imageTurnLabel && pointerAction?.kind === "rotate-image" ? (() => {
                // The angle rides above the pointer while turning.
                const pill = dimensionPillSize(imageTurnLabel, screenUnit, 18);
                return (
                  <>
                    <SketchTurnRing pivot={{ x: pointerAction.start.x, z: pointerAction.start.z }} radius={pointerAction.ring} active={turnStep(pointerAction) === SKETCH_TURN_RING_STEP} screenUnit={screenUnit} />
                    <g className="sketch-geometry-dimension" pointerEvents="none" transform={`translate(${pointerAction.current.x} ${pointerAction.current.z - 40 * screenUnit})`}>
                      <rect x={-pill.width / 2} y={-pill.height / 2} width={pill.width} height={pill.height} rx={pill.radius} />
                      <text y={5 * screenUnit} fontSize={13 * screenUnit}>{imageTurnLabel}</text>
                    </g>
                  </>
                );
              })() : null}
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
          {tool === "select" ? displayImages.filter((image) => image.locked).map((image) => {
            // A locked picture lets clicks through, so its padlock is the way back: a click unlocks and selects it.
            const corners = imageCorners(image);
            const spot = lockBadgeSpot(corners[0], corners, plateView, 16 * screenUnit);
            return spot ? (
              <SketchLockBadge
                key={image.id}
                spot={spot}
                screenUnit={screenUnit}
                title={t("sketch.unlockImage")}
                onPointerDown={(event) => {
                  if (event.button !== 0) return;
                  event.preventDefault();
                  event.stopPropagation();
                  onUpdateImage(image.id, { locked: false }, t("sketch.imageUnlocked"));
                  onSelectImage(image.id);
                }}
              />
            ) : null;
          }) : null}
          {hover && ["line", "arc", "bezier", "smooth", "measure"].includes(tool) ? <circle className="sketch-cursor-point" cx={hover.x} cy={hover.z} r={hoverPointRadius} pointerEvents="none" /> : null}
        </svg>
        {notes?.length && onUpdateNote && onRemoveNote ? (
          <SketchNotes
            notes={notes}
            numbers={noteNumbers ?? new Map()}
            toScreen={(spot) => {
              // Where the plate's viewBox puts the spot, centred and kept in proportion (xMidYMid meet).
              const scale = Math.min(svgSize.width / width, svgSize.height / depth) || 0;
              return {
                x: (svgSize.width - width * scale) / 2 + (spot.x - pan.x + width / 2) * scale,
                y: (svgSize.height - depth * scale) / 2 + (spot.z - pan.z + depth / 2) * scale,
              };
            }}
            toSketch={unsnappedPointFromEvent}
            viewWidth={svgSize.width}
            editingId={editingNoteId}
            onEditingIdChange={setEditingNoteId}
            onChange={onUpdateNote}
            onRemove={onRemoveNote}
            workspace={workspace}
          />
        ) : null}
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
                <span>{unitLabel}</span>
              </label>
              <label>
                <span>{t("sketch.typedAngle")}</span>
                <input
                  ref={typedLineAngleRef}
                  value={typedLine.angle}
                  placeholder={String(Math.round(pointerAngle * 10) / 10)}
                  inputMode="text"
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
          trace={onTraceImage ? (tracing ? imageTrace : null) : undefined}
          onTrace={(on) => {
            setTraceImageId(on ? selectedImage.id : null);
            if (on) {
              setCropMode(false);
              setCalibration(null);
            }
          }}
          onApplyTrace={() => {
            // The trace for the settings as they are now, not the one still shown while a change waits for its pause.
            const trace = imageTrace.traceNow();
            if (!trace?.rings.length || !imageTrace.size) return;
            onTraceImage?.(selectedImage.id, trace, imageTrace.size);
            setTraceImageId(null);
          }}
        />
      ) : null}
      {selectedPoint && tool === "select" ? (
        <div className="sketch-point-actions" aria-label={t("sketch.pointActions")}>
          {activeCornerDialog ? (
            cornerDialogContent
          ) : (
            <>
              <button type="button" title={`${t("sketch.makeCorner")} (1)`} aria-keyshortcuts="1" onClick={() => onSetPointMode(selectedPoint.id, "corner")}><CornerDownRight /><span>{t("sketch.corner")}</span></button>
              <button type="button" title={`${t("sketch.makeSmooth")} (3)`} aria-keyshortcuts="3" onClick={() => onSetPointMode(selectedPoint.id, "smooth")}><Waves /><span>{t("sketch.smooth")}</span></button>
              <button type="button" title={t("sketch.splitHandles")} onClick={() => onSetPointMode(selectedPoint.id, "split")}><Split /><span>{t("sketch.split")}</span></button>
              {canApplySketchCornerTreatment(displayProfile, selectedPoint.id) ? (
                <>
                  <span className="sketch-point-divider" />
                  <button
                    type="button"
                    title={t("sketch.filletCorner")}
                    onClick={() => {
                      setCornerDialog("fillet");
                      setCornerValue(defaultCornerText());
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
                      setCornerValue(defaultCornerText());
                    }}
                  >
                    <Slash />
                    <span>{t("sketch.chamfer")}</span>
                  </button>
                </>
              ) : null}
              {mirrorButton}
              <GuideHelpLink section="sketchCurve" className="sketch-corner-help" iconSize={17} />
            </>
          )}
        </div>
      ) : null}
      {(manyCorners || manyLines || canCurveThroughPoints || (selected?.kind === "multiple" && onMirror)) && tool === "select" && !mirrorOpen ? (
        <div className="sketch-point-actions" aria-label={t("sketch.pointActions")}>
          {activeCornerDialog && manyCorners ? (
            cornerDialogContent
          ) : (
            <>
              {manyCorners ? (
              <>
              <button
                type="button"
                title={t("sketch.filletCorners", { count: selectedCornerIds.length })}
                onClick={() => {
                  setCornerDialog("fillet");
                  setCornerValue(defaultCornerText());
                }}
              >
                <Spline />
                <span>{t("sketch.fillet")}</span>
              </button>
              <button
                type="button"
                title={t("sketch.chamferCorners", { count: selectedCornerIds.length })}
                onClick={() => {
                  setCornerDialog("chamfer");
                  setCornerValue(defaultCornerText());
                }}
              >
                <Slash />
                <span>{t("sketch.chamfer")}</span>
              </button>
              </>
              ) : null}
              {manyCorners && manyLines ? <span className="sketch-point-divider" /> : null}
              {manyLines ? (
                <>
                  <button type="button" title={`${t("sketch.curveLineHint")} (2)`} aria-keyshortcuts="2" disabled={!canCurveLines} onClick={() => onCurveSegments?.(selectedLines.map((segment) => segment.id))}><Spline /><span>{t("sketch.curveLine")}</span></button>
                  <button type="button" title={`${t("sketch.straightenLineHint")} (1)`} aria-keyshortcuts="1" disabled={!canStraightenLines} onClick={() => onStraightenSegments?.(selectedLines.map((segment) => segment.id))}><Minus /><span>{t("sketch.straightenLine")}</span></button>
                </>
              ) : null}
              {canCurveThroughPoints ? (
                <>
                  {manyCorners || manyLines ? <span className="sketch-point-divider" /> : null}
                  <button type="button" title={t("sketch.curveThroughPointsHint")} onClick={() => onCurveThroughPoints?.(selectedCornerIds)}><Waves /><span>{t("sketch.curveThroughPoints")}</span></button>
                </>
              ) : null}
              {mirrorButton}
              {selected?.kind === "multiple" && selected.pointIds.length > 1 ? (
                <>
                  <span className="sketch-point-divider" />
                  <button
                    type="button"
                    className={keepProportions ? "active" : ""}
                    aria-pressed={keepProportions}
                    title={t("sketch.keepProportionsHint")}
                    onClick={toggleKeepProportions}
                  >
                    {keepProportions ? <Link /> : <Link2Off />}
                    <span>{t("sketch.keepProportions")}</span>
                  </button>
                  {onToggleOutlineLock ? (
                    <button
                      type="button"
                      className={selectionLock === "all" ? "active" : ""}
                      aria-pressed={selectionLock === "all"}
                      aria-keyshortcuts="L"
                      title={t(selectionLock === "all" ? "sketch.unlockOutlineHint" : "sketch.lockOutlineHint")}
                      onClick={onToggleOutlineLock}
                    >
                      {selectionLock === "all" ? <LockKeyhole /> : <LockKeyholeOpen />}
                      <span>{t(selectionLock === "all" ? "sketch.unlockOutline" : "sketch.lockOutline")}</span>
                    </button>
                  ) : null}
                  {selectedGeometryBounds ? (
                    <>
                      <span className="sketch-point-divider" />
                      <SketchImagePositionField
                        className="sketch-selection-position"
                        label={t("sketch.selectionX")}
                        title={t("sketch.selectionPositionHint")}
                        value={selectedGeometryBounds.cx}
                        accuracy={workspace.accuracy}
                        disabled={selectionLocked}
                        onChange={(x) => moveSelectionBy(x - selectedGeometryBounds.cx, 0)}
                      />
                      <SketchImagePositionField
                        className="sketch-selection-position"
                        label={t("sketch.selectionY")}
                        title={t("sketch.selectionPositionHint")}
                        value={displayY(selectedGeometryBounds.cz)}
                        accuracy={workspace.accuracy}
                        disabled={selectionLocked}
                        onChange={(y) => moveSelectionBy(0, insideZ(y) - selectedGeometryBounds.cz)}
                      />
                    </>
                  ) : null}
                  {canAlignOutlines ? (
                    <>
                      <span className="sketch-point-divider" />
                      {([
                        ["left", AlignStartVertical, "sketch.alignLeft"],
                        ["centerX", AlignCenterVertical, "sketch.alignCenterX"],
                        ["right", AlignEndVertical, "sketch.alignRight"],
                        ["top", AlignStartHorizontal, "sketch.alignTop"],
                        ["centerZ", AlignCenterHorizontal, "sketch.alignCenterZ"],
                        ["bottom", AlignEndHorizontal, "sketch.alignBottom"],
                      ] as const).map(([mode, Icon, label]) => (
                        <button key={mode} type="button" className="sketch-align-button" title={t(label)} aria-label={t(label)} onClick={() => alignOutlines(mode)}>
                          <Icon />
                        </button>
                      ))}
                    </>
                  ) : null}
                </>
              ) : null}
              <GuideHelpLink section={manyCorners ? "sketchCorners" : "sketchCurve"} className="sketch-corner-help" iconSize={17} />
            </>
          )}
        </div>
      ) : null}
      {selectedSegment && tool === "select" && onCurveSegment && onStraightenSegment && !mirrorOpen ? (
        <div className="sketch-point-actions" aria-label={t("sketch.segmentActions")}>
          <button type="button" title={`${t("sketch.curveLineHint")} (2)`} aria-keyshortcuts="2" disabled={selectedSegmentCurved} onClick={() => onCurveSegment(selectedSegment.id)}><Spline /><span>{t("sketch.curveLine")}</span></button>
          <button type="button" title={`${t("sketch.straightenLineHint")} (1)`} aria-keyshortcuts="1" disabled={!selectedSegmentCurved && (selectedSegment.kind ?? "line") === "line"} onClick={() => onStraightenSegment(selectedSegment.id)}><Minus /><span>{t("sketch.straightenLine")}</span></button>
          {onSetSegmentConstruction ? (
            <button
              type="button"
              className={selectedSegment.construction ? "active" : ""}
              aria-pressed={Boolean(selectedSegment.construction)}
              title={t(selectedSegment.construction ? "sketch.makeSolidHint" : "sketch.makeConstructionHint")}
              onClick={() => onSetSegmentConstruction(selectedSegment.id, !selectedSegment.construction)}
            >
              <ToolbarConstructionLineIcon />
              <span>{t(selectedSegment.construction ? "sketch.makeSolid" : "sketch.makeConstruction")}</span>
            </button>
          ) : null}
          {mirrorButton}
          <GuideHelpLink section="sketchCurve" className="sketch-corner-help" iconSize={17} />
        </div>
      ) : null}
      {mirrorOpen && selected && tool === "select" && onMirror ? (
        <div className="sketch-point-actions" aria-label={t("sketch.mirror")}>
          {mirrorPicking ? (
            <span className="sketch-corner-label">{t("sketch.mirrorPickLine")}</span>
          ) : (
            <>
              <button type="button" title={t("sketch.mirrorLeftRightHint")} onClick={() => { onMirror("vertical"); closeMirror(); }}><FlipHorizontal2 /><span>{t("sketch.mirrorLeftRight")}</span></button>
              <button type="button" title={t("sketch.mirrorTopBottomHint")} onClick={() => { onMirror("horizontal"); closeMirror(); }}><FlipVertical2 /><span>{t("sketch.mirrorTopBottom")}</span></button>
              <button type="button" title={t("sketch.mirrorAcrossLineHint")} onClick={() => setMirrorPicking(true)}><Slash /><span>{t("sketch.mirrorAcrossLine")}</span></button>
            </>
          )}
          <button type="button" className="sketch-corner-cancel" title={t("common.cancel")} aria-label={t("common.cancel")} onClick={closeMirror}><X /></button>
          <GuideHelpLink section="sketchMirror" className="sketch-corner-help" iconSize={17} />
        </div>
      ) : null}
      <div className="grid-settings">
        <SnapGridControl units={workspace.units} customGrids={workspace.customSnapGrids} snap={snap} snapOpen={snapOpen} onSnapChange={chooseSnap} onSnapOpenChange={setSnapOpen} />
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
  trace,
  onTrace,
  onApplyTrace,
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
  /** Trace: its state while it is on, null while it is off; left out where the sketch cannot take traced outlines. */
  trace?: SketchImageTraceState | null;
  onTrace: (on: boolean) => void;
  onApplyTrace: () => void;
}) {
  useLanguage();
  const measured = calibration?.points.length === 2 ? Math.hypot(calibration.points[1].x - calibration.points[0].x, calibration.points[1].z - calibration.points[0].z) : 0;
  const [calibrateDraft, setCalibrateDraft] = useState("");
  useEffect(() => setCalibrateDraft(measured > 0 ? formatDimension(measured, accuracy) : ""), [accuracy, measured]);
  const applyCalibration = () => {
    const length = parseLengthMm(calibrateDraft);
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
      <div className="property-card sketch-image-calibrate-card">
        <div className="property-list">
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
                <span>{currentLengthUnitLabel()}</span>
              </div>
              <button className="sketch-image-aspect-toggle active" type="button" onClick={applyCalibration}>
                <Check size={17} />
                <span>{t("sketch.calibrateApply")}</span>
              </button>
            </label>
          ) : null}
        </div>
      </div>
      {trace !== undefined ? (
        <SketchImageTraceCard image={image} trace={trace} onTrace={onTrace} onApply={onApplyTrace} />
      ) : null}
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

const TRACE_PARTS: readonly TracePart[] = ["dark", "light", "object", "lasso"];
const TRACE_PART_LABELS: Record<TracePart, "sketch.traceDark" | "sketch.traceLight" | "sketch.traceObject" | "sketch.traceLassoOnly"> = {
  dark: "sketch.traceDark",
  light: "sketch.traceLight",
  object: "sketch.traceObject",
  lasso: "sketch.traceLassoOnly",
};

/**
 * Trace (Nachzeichnen): the button that starts it and, while it is on, its settings - which part of the
 * picture is the shape (dark, light, or the object before its background), the threshold, how many
 * points, from what turn a point is a corner, how small a speck is left out, whether holes stay - and
 * Pick areas, with the list of holes and areas: each can be taken out (✕) or, with cut out off, drawn
 * as a construction line. The outlines show over the picture as the settings change; Apply makes them
 * sketch points.
 */
function SketchImageTraceCard({
  image,
  trace,
  onTrace,
  onApply,
}: {
  image: SketchImage;
  trace: SketchImageTraceState | null;
  onTrace: (on: boolean) => void;
  onApply: () => void;
}) {
  if (!trace) {
    return (
      <div className="property-card sketch-image-trace-card">
        <div className="property-list">
          <button className="sketch-image-aspect-toggle" type="button" title={t("sketch.traceImageHint")} onClick={() => onTrace(true)}>
            <WandSparkles size={17} />
            <span>{t("sketch.traceImage")}</span>
          </button>
        </div>
      </div>
    );
  }
  const { settings, range, size } = trace;
  const pixel = size ? tracedPixelSize(image, size) : null;
  // A speck by the side of a square of its area, in mm on the plate.
  const speckSide = settings && pixel ? Math.sqrt(settings.speck * pixel.x * pixel.z) : 0;
  const maxSpeckSide = Math.max(0.5, Math.min(image.width, image.depth) / 10);
  const outlines = trace.trace?.rings.length ?? 0;
  // The list: the holes in the order they come, then the clicked areas in the order they were clicked.
  const rings = trace.trace?.rings ?? [];
  const holes = rings.filter((ring) => ring.source === "hole");
  const areaRings = new Map(rings.filter((ring) => ring.source === "area").map((ring) => [ring.key, ring]));
  const areas = (settings?.areas ?? []).map((area) => areaRings.get(`a:${area.id}`)).filter((ring): ring is NonNullable<typeof ring> => Boolean(ring));
  const listed = [
    ...holes.map((ring, index) => ({ ring, name: t("sketch.traceHoleItem", { number: index + 1 }) })),
    ...areas.map((ring, index) => ({ ring, name: t("sketch.traceAreaItem", { number: index + 1 }) })),
  ];
  const removedHoles = (settings?.removed ?? []).length;
  // The regions drawn by hand, each named by what drew it: the lasso's, and the corners clicked (Cut away).
  const regions = settings?.regions ?? [];
  const regionNames = new Map<string, string>();
  let lassoCount = 0;
  let cornerCount = 0;
  for (const region of regions) {
    regionNames.set(region.id, region.lasso
      ? t("sketch.traceLassoItem", { number: (lassoCount += 1) })
      : t("sketch.traceTrimItem", { number: (cornerCount += 1) }));
  }
  const lassoOnly = settings?.part === "lasso";
  return (
    <div className="property-card sketch-image-trace-card">
      <div className="property-card-header static"><span>{t("sketch.traceImage")}</span></div>
      <div className="property-list">
        {trace.failed ? <p className="sketch-image-hint">{t("sketch.traceUnreadable")}</p> : null}
        {!settings && !trace.failed ? <p className="sketch-image-hint">{t("sketch.traceLoading")}</p> : null}
        {settings && range && pixel ? (
          <>
            <div className="edge-modifier-field shell-openings sketch-trace-parts" role="radiogroup" aria-label={t("sketch.tracePart")}>
              <span>{t("sketch.tracePart")}</span>
              <div className="shell-opening-options">
                {TRACE_PARTS.map((part) => (
                  <button key={part} type="button" role="radio" aria-checked={settings.part === part} className={settings.part === part ? "active" : ""} onClick={() => trace.change({ part })}>
                    {t(TRACE_PART_LABELS[part])}
                  </button>
                ))}
              </div>
              {settings.part === "object" ? <small className="sketch-stroke-note">{t("sketch.traceObjectHint")}</small> : null}
              {lassoOnly ? <small className="sketch-stroke-note">{t("sketch.traceLassoOnlyHint")}</small> : null}
            </div>
            {/* Lasso only has nothing of the picture's own to set a threshold for, nor holes of its own. */}
            {lassoOnly ? null : (
              <SketchImageRange label={t("sketch.traceThreshold")} value={settings.threshold * 100} min={2} max={98} accuracy={1} whole suffix="%" onChange={(value) => trace.change({ threshold: value / 100 })} />
            )}
            <SketchImageRange label={t("sketch.tracePoints")} value={settings.points} min={range.fewest} max={Math.max(range.fewest, range.most)} accuracy={1} whole suffix="" disabled={range.most <= range.fewest} onChange={(points) => trace.change({ points })} />
            <p className="sketch-image-hint">
              {outlines ? t("sketch.traceCount", { points: trace.trace?.points ?? 0, corners: trace.trace?.corners ?? 0 }) : t("sketch.traceNothing")}
            </p>
            {trace.trace?.refined ? <p className="sketch-image-hint">{t("sketch.traceRefined")}</p> : null}
            <SketchImageRange label={t("sketch.traceCorners")} value={settings.cornerAngle} min={MIN_TRACE_CORNER_ANGLE} max={MAX_TRACE_CORNER_ANGLE} accuracy={1} whole suffix="°" onChange={(cornerAngle) => trace.change({ cornerAngle })} />
            {settings.cornerAngle >= MAX_TRACE_CORNER_ANGLE ? <p className="sketch-image-hint">{t("sketch.traceNoCorners")}</p> : null}
            <SketchImageRange label={t("sketch.traceSpeck")} value={speckSide} min={0} max={maxSpeckSide} accuracy={2} onChange={(side) => trace.change({ speck: (side * side) / Math.max(1e-12, pixel.x * pixel.z) })} />
            {lassoOnly ? null : (
              <button className={`sketch-image-aspect-toggle ${settings.holes ? "active" : ""}`} type="button" aria-pressed={settings.holes} onClick={() => trace.change({ holes: !settings.holes })}>
                {settings.holes ? <Check size={17} /> : <X size={17} />}
                <span>{t("sketch.traceHoles")}</span>
              </button>
            )}
            <button className={`sketch-image-aspect-toggle ${trace.picking ? "active" : ""}`} type="button" aria-pressed={trace.picking} title={t("sketch.tracePickAreasHint")} onClick={() => trace.setPicking(!trace.picking)}>
              <Crosshair size={17} />
              <span>{t("sketch.tracePickAreas")}</span>
            </button>
            {trace.picking ? <p className="sketch-image-hint">{t("sketch.tracePickAreasHint")}</p> : null}
            {trace.areaRejected ? <p className="sketch-image-hint">{t("sketch.traceAreaAtEdge")}</p> : null}
            {trace.picking || areas.length ? (
              <SketchImageRange label={t("sketch.traceAreaTolerance")} value={(settings.areaTolerance ?? 0.12) * 100} min={1} max={50} accuracy={1} whole suffix="%" onChange={(value) => trace.change({ areaTolerance: value / 100 })} />
            ) : null}
            <button className={`sketch-image-aspect-toggle ${trace.drawing === "lasso" ? "active" : ""}`} type="button" aria-pressed={trace.drawing === "lasso"} title={t("sketch.traceLassoHint")} onClick={() => trace.setDrawing(trace.drawing === "lasso" ? null : "lasso")}>
              <Magnet size={17} />
              <span>{t("sketch.traceLasso")}</span>
            </button>
            {trace.drawing === "lasso" ? <p className="sketch-image-hint">{t("sketch.traceLassoHint")}</p> : null}
            <button className={`sketch-image-aspect-toggle ${trace.drawing === "cut" ? "active" : ""}`} type="button" aria-pressed={trace.drawing === "cut"} title={t("sketch.traceTrimHint")} onClick={() => trace.setDrawing(trace.drawing === "cut" ? null : "cut")}>
              <Scissors size={17} />
              <span>{t("sketch.traceTrim")}</span>
            </button>
            {trace.drawing === "cut" ? <p className="sketch-image-hint">{t("sketch.traceTrimHint")}</p> : null}
            {trace.drawing && trace.anchors.length ? (
              <div className="sketch-image-action-row">
                <button className="sketch-image-aspect-toggle active" type="button" disabled={trace.anchors.length < 3} onClick={() => trace.closeDraft()}>
                  <Check size={17} />
                  <span>{t("sketch.traceTrimClose")}</span>
                </button>
                <button className="sketch-image-aspect-toggle" type="button" onClick={() => trace.discardDraft()}>
                  <X size={17} />
                  <span>{t("sketch.traceTrimDiscard")}</span>
                </button>
              </div>
            ) : null}
            {listed.length || removedHoles || regions.length ? (
              <div className="sketch-trace-list" role="group" aria-label={t("sketch.traceList")}>
                <span className="sketch-trace-list-title">{t("sketch.traceList")}</span>
                <ul>
                  {listed.map(({ ring, name }) => {
                    const cut = !ring.line;
                    return (
                      <li
                        key={ring.key}
                        className={ring.key === trace.highlight ? "highlight" : undefined}
                        onPointerEnter={() => trace.setHighlight(ring.key)}
                        onPointerLeave={() => trace.setHighlight(null)}
                      >
                        <span className="sketch-trace-item-name">{name}</span>
                        <label className="sketch-trace-item-cut" title={t("sketch.traceCutHint")}>
                          <input type="checkbox" checked={cut} onChange={(event) => trace.setCut(ring.key, event.currentTarget.checked)} />
                          <span>{t("sketch.traceCut")}</span>
                        </label>
                        <button className="inspector-header-icon" type="button" aria-label={t("sketch.traceRemove", { name })} title={t("sketch.traceRemove", { name })} onClick={() => trace.remove(ring.key)}>
                          <X size={15} />
                        </button>
                      </li>
                    );
                  })}
                  {regions.map((region) => {
                    const name = regionNames.get(region.id) ?? "";
                    const highlightKey = `r:${region.id}`;
                    return (
                      <li
                        key={highlightKey}
                        className={`region-item${highlightKey === trace.highlight ? " highlight" : ""}`}
                        onPointerEnter={() => trace.setHighlight(highlightKey)}
                        onPointerLeave={() => trace.setHighlight(null)}
                      >
                        <span className="sketch-trace-item-name">{name}</span>
                        <select
                          className="sketch-trace-item-action"
                          aria-label={t("sketch.traceRegionAction", { name })}
                          title={t("sketch.traceRegionAction", { name })}
                          value={region.add ? "add" : "cut"}
                          onChange={(event) => trace.setRegionAdd(region.id, event.currentTarget.value === "add")}
                        >
                          <option value="add">{t("sketch.traceRegionAdd")}</option>
                          <option value="cut">{t("sketch.traceTrim")}</option>
                        </select>
                        <button className="inspector-header-icon" type="button" aria-label={t("sketch.traceRemove", { name })} title={t("sketch.traceRemove", { name })} onClick={() => trace.removeRegion(region.id)}>
                          <X size={15} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {listed.length ? <p className="sketch-image-hint">{t("sketch.traceCutHint")}</p> : null}
                {removedHoles ? (
                  <button className="sketch-image-aspect-toggle" type="button" onClick={() => trace.restoreHoles()}>
                    <span>{t("sketch.traceRestoreHoles", { count: removedHoles })}</span>
                  </button>
                ) : null}
              </div>
            ) : null}
            <p className="sketch-image-hint">{t("sketch.traceHint")}</p>
          </>
        ) : null}
        <div className="sketch-image-action-row">
          <button className="sketch-image-aspect-toggle active" type="button" disabled={!outlines} onClick={onApply}>
            <Check size={17} />
            <span>{t("sketch.traceApply")}</span>
          </button>
          <button className="sketch-image-aspect-toggle" type="button" onClick={() => onTrace(false)}>
            <X size={17} />
            <span>{t("common.cancel")}</span>
          </button>
        </div>
      </div>
    </div>
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
  whole = false,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  accuracy: 1 | 2 | 3;
  suffix?: string;
  disabled?: boolean;
  /** A count: whole numbers only, in steps of one. */
  whole?: boolean;
  onChange: (value: number) => void;
}) {
  const safeValue = clamp(Number.isFinite(value) ? value : min, min, max);
  const isLength = suffix === "mm";
  const formatValue = isLength ? formatDimension : whole ? formatWholeNumber : formatPlainNumber;
  const [draft, setDraft] = useState(formatValue(safeValue, accuracy));
  useEffect(() => setDraft(formatValue(safeValue, accuracy)), [accuracy, safeValue, formatValue]);
  const commit = () => {
    const parsed = isLength ? parseLengthMm(draft) : parseMeasurementInput(draft);
    const value = clamp(Number.isFinite(parsed) ? parsed : safeValue, min, max);
    onChange(whole ? Math.round(value) : value);
  };
  const position = ((safeValue - min) / Math.max(0.001, max - min)) * 100;
  return (
    <label className="range-property sketch-image-range" style={{ "--slider-pos": `${position}%` } as CSSProperties}>
      <span>{label}</span>
      <div className="sketch-image-range-row">
        <input
          className="sketch-image-number-input"
          type="text"
          inputMode={min < 0 ? "text" : "decimal"}
          onFocus={(event) => selectWholeValue(event.currentTarget)}
          value={draft}
          disabled={disabled}
          onChange={(event) => setDraft(event.currentTarget.value)}
          onBlur={commit}
          onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
        />
        <span>{isLength ? currentLengthUnitLabel() : suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={whole ? 1 : accuracy === 1 ? 0.1 : 0.01} value={safeValue} disabled={disabled} onChange={(event) => onChange(Number(event.currentTarget.value))} />
    </label>
  );
}

function SketchImagePositionField({
  label,
  value,
  accuracy,
  disabled = false,
  className = "sketch-image-position-field",
  title,
  onChange,
}: {
  label: string;
  value: number;
  accuracy: 1 | 2 | 3;
  disabled?: boolean;
  className?: string;
  title?: string;
  onChange: (value: number) => void;
}) {
  const formatted = formatDimension(value, accuracy);
  const [draft, setDraft] = useState(formatted);
  useEffect(() => setDraft(formatted), [formatted]);
  const commit = () => {
    const parsed = parseLengthMm(draft);
    const next = Number.isFinite(parsed) ? parsed : value;
    onChange(next);
    setDraft(formatDimension(next, accuracy));
  };

  return (
    <label className={className} title={title}>
      <span>{label}</span>
      <input
        type="text"
        inputMode="text"
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
