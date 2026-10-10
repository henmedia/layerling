"use client";

import { ArrowDownToLine, ChevronLeft, ChevronRight, Crosshair, Cuboid, Download, Eye, EyeOff, FlipHorizontal, GripVertical, Home, Minus, MousePointer2, PanelsTopLeft, Plus, Rotate3d, RotateCcw, Rows3, Ruler, RulerDimensionLine, Slice, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type Dispatch, type DragEvent, type MouseEvent as ReactMouseEvent, type MutableRefObject, type PointerEvent as ReactPointerEvent, type ReactNode, type SetStateAction, type WheelEvent as ReactWheelEvent } from "react";
import { objectSnapOffset, shiftSnapBox, type ObjectSnapGuide, type SnapBox } from "@/lib/objectSnap";
import { useMovablePanel, type MovablePanelOptions } from "@/lib/useMovablePanel";
import { computeSectionPlaneVector, DEFAULT_SECTION_SETTINGS, getSectionBounds, SECTION_AXES_SHOWN, sectionAxisLetter, sectionFineWindow, type SectionPlaneAxis, type SectionPlaneSettings } from "@/lib/sectionView";
import { projectSectionPoint, type SectionLoop, type SectionPoint } from "@/lib/sectionSvg";
import { sectionMeasurement, sectionPointToWorld, snapSectionPoint, type SectionSnap } from "@/lib/sectionMeasure";
import * as THREE from "three";
import { acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from "three-mesh-bvh";
import { groupShowsPartColors } from "@/lib/groupColors";
import { triangleTouchesRect, type ScreenRect } from "@/lib/screenRectHit";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { FramingSquareIcon } from "@/components/FramingSquareIcon";
import { GridEyeIcon } from "@/components/GridEyeIcon";
import { AlignOverlay, MirrorOverlay, type AlignOverlayState, type MirrorOverlayState } from "@/components/workplane/ActionOverlays";
import { MoveDimensionOverlay } from "@/components/workplane/MoveDimensionOverlay";
import { OriginDimensionOverlay } from "@/components/workplane/OriginDimensionOverlay";
import { SelectionInspector, ShapeInspector, SnapGridControl, type ShapeInspectorUpdateOptions, type TextLayerPatch } from "@/components/workplane/ShapeInspector";
import type { NameTagStack } from "@/lib/nameTag";
import { WorkspaceSettingsModal } from "@/components/workplane/WorkspaceSettingsModal";
import { appThemePalette, type AppThemePalette, type AppThemePreference, type ResolvedAppTheme } from "@/lib/appTheme";
import { cadModifierPrimitiveForBakedShape, cadTransformFromMatrix, cadTransformToMatrix } from "@/lib/cadBakeMetadata";
import { t } from "@/lib/i18n";
import type { ModelSplitPlane } from "@/lib/modelSplit";
import { useLanguage } from "@/lib/useLanguage";
import { orthographicFramingZoom, perspectiveFramingDistance } from "@/lib/cameraFraming";
import {
  beginViewCubeDrag,
  moveViewCubeDrag,
  orbitOffsetByDrag,
  viewCubeAngles,
  VIEW_CUBE_ZONE_SIZE,
  VIEW_CUBE_ZONE_START,
  VIEW_CUBE_ZONES,
  viewCubeZoneDirection,
  viewDirectionFromName,
  viewFaceDirection,
  viewFaceForKey,
  type ViewCubeDrag,
  type ViewCubeFace,
} from "@/lib/viewCubeDrag";
import { createGearGeometry } from "@/lib/gearGeometry";
import { createStarGeometry } from "@/lib/starGeometry";
import { createHeartGeometry } from "@/lib/heartGeometry";
import { createCrescentGeometry } from "@/lib/crescentGeometry";
import { createSlotGeometry } from "@/lib/slotGeometry";
import { createDovetailGeometry } from "@/lib/dovetailGeometry";
import { createLoftGeometry } from "@/lib/loftGeometry";
import { carriedOntoFace } from "@/lib/carryOntoFace";
import { createHingeGeometry } from "@/lib/hingeGeometry";
import { createKnurlGeometry } from "@/lib/knurlGeometry";
import { visibleWorkArea } from "@/lib/visibleWorkArea";
import { createTeardropGeometry } from "@/lib/teardropGeometry";
import { createScrewHoleGeometry } from "@/lib/screwHoleGeometry";
import { createHoneycombGeometry } from "@/lib/honeycombGeometry";
import { createRoundedBoxGeometry } from "@/lib/roundedBoxGeometry";
import { createBentTubeGeometry, createBentTubeSegmentGeometry } from "@/lib/bentTubeGeometry";
import { createThreadGeometry } from "@/lib/threadGeometry";
import { createSpringGeometry } from "@/lib/springGeometry";
import { textDisplayGeometry } from "@/lib/textFill";
import { manifoldRevision } from "@/lib/manifoldHandle";
import { customFontRevision } from "@/lib/textFonts";
import { readDesignView, writeDesignView } from "@/lib/designView";
import { DIMENSION_FORMULA_FIELDS, formulaMatchesMillimeters, formulaToRemember, withFieldFormula } from "@/lib/fieldFormulas";
import { displayToMillimeters, formatLengthMm, formatMeasurementNumber, lengthDisplayUnit, millimetersToDisplay, parseLengthMm, parseMeasurementInput, resolveLengthMm, setLengthUnit } from "@/lib/measurementUnits";
import {
  computeCornerRulerRelativeCoordinates,
  cornerRulerDimensionMatchesFromCorner,
  cornerRulerFlatRotation,
  cornerRulerFrameForWorkplane,
  cornerRulerShiftVector,
  cornerRulerTicks,
  pointAlongRuler,
  rotateCornerRulerFrame,
  rulerDimensionMatch,
  type CornerRulerFrame,
  type CornerRulerMode,
  type RulerDimensionField,
  type RulerDimensionMatch,
} from "@/lib/rulerDimensions";
import { createMoveDimensionOverlay, type MoveDimensionAxis, type MoveDimensionOverlayData } from "@/lib/moveDimensionLines";
import { computeOriginAxisDistance, createOriginDimensionOverlay, type OriginDimensionOverlayData } from "@/lib/originDimensionLines";
import {
  horizontalPlacementWorkplane,
  placementPatchForNewShape,
  placementWorkplaneCoordinates,
  placementWorkplaneFromSurface,
  placementWorkplaneIsBase,
  placementWorkplaneLiesOnBase,
  placementWorkplanePoint,
  placementWorkplaneQuaternion,
  snapPlacementWorkplaneOrigin,
  type PlacementPoint,
  type PlacementWorkplane,
} from "@/lib/placementWorkplane";
import { capturePointer } from "@/lib/pointerCapture";
import { printerPresetById } from "@/lib/printBed";
import { GuideHelpLink } from "@/components/GuideHelpLink";
import { groundFootprintForFrame, liftGeometryForFrame, type SelectionFrame } from "@/lib/liftGeometry";
import { regularPolygonFootprintScale } from "@/lib/regularPolygonFootprint";
import { roundSideCount } from "@/lib/roundSideCount";
import { createPyramidGeometry } from "@/lib/pyramidGeometry";
import { projectThumbnailDimensions } from "@/lib/projectThumbnail";
import { makeShapeFromAsset, parseDroppedShapeAsset } from "@/lib/shapeCatalog";
import { scaledHorizontalShapePatch } from "@/lib/scaleByPercent";
import { displayY, displayYTurn, insideZ } from "@/lib/displayAxes";
import { positionsForTwist, twistBandCount } from "@/lib/heightSlices";
import { toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { canBeginShapeDrag, handleDimensionLimit, DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE, effectiveViewSettings, viewPixelRatio, normalizeSnapGrid, normalizeWorkspaceSettings, orbitControlsZoomSpeed, readWorkspaceDefault, saveWorkspaceDefault, snapGridForUnits, snapGridStep as snapStep, workplaneSettingsFingerprint, workspaceHydrationSyncDecision, zoomDistanceScale } from "@/lib/workplaneSettings";
import { withShapeDefaults } from "@/lib/shapeDefaults";
import { workplaneGridBandWidths, AXIS_ARROW_COLORS, axisArrowLayout, DEFAULT_EDGE_LINE_COLOR, fillLightPosition, keyLightPosition, sceneLightLevels, shadowBlurRadius, workplaneGridLayout, workplaneGridLines, workplaneGridPalette, workplaneLabelLayout, workplaneThemePalette, WORKPLANE_LABEL_ASPECT, WORKPLANE_LINE_ELEVATION, type WorkplaneGridLayout } from "@/lib/workplaneGrid";
import { cleanNearZero, cleanRotationDegrees, isNonSolidShapeKind, mirroredAxisCount, mirrorSign, preservesEdgeTreatmentSize, proportionalResizeScale, resizedImportedCoordinates, resizedImportedMeshPositions, resizedShapeSize, shapeDepth, shapeExtrudeDeformAt, shapeHasExtrudeDeform, shapeHasShapeDeform, shapeHasTaper, shapeOverallFootprintDimensions, shapeSupportsTaper, shapeTaperDimensions, shapeTaperScaleAt, shapeWidth, shapeWithParametricSource } from "@/lib/workplaneShapes";
import { sphereTessellation } from "@/lib/sphereTessellation";
import type { LayerlingMcpViewFace } from "@/lib/layerlingMcpProtocol";
import {
  TransformOverlay,
  continuousSnappedWheelRotation,
  dimensionMarkScreenPush,
  getElevationMeasureKey,
  isPointInsideTransformBounds,
  measureKeyForHandle,
  normalizedRotationPlaneBasis,
  rotationPlaneDirectionSign,
  transformBoundsIntersectClipVolume,
  transformOverlayScreenPoint,
  ROTATION_WHEEL_SHIFT_SNAP_DEGREES,
  ROTATION_WHEEL_SNAP_DEGREES,
  snappedRotationDelta,
  snappedWheelRotation,
  type DimensionMark,
  type EditingCorner,
  type EditingDimension,
  type EditingRotation,
  type PinnedRotationWheelView,
  type RotationAxis,
  type RotationPlaneView,
  type RotationReadout,
  type RotationWheelView,
  type TransformHandleKind,
  type TransformOverlayState,
} from "@/components/workplane/TransformOverlay";
import type { AlignAxis, AlignHandleStatus, AlignTarget, GridSize, MeasurementAccuracy, ShapeAsset, WorkplaneNote, WorkplaneNoteAnchor, WorkplaneShape, WorkplaneWorkspaceSettings } from "@/types/layerling";
import { NOTE_TEXT_LIMIT, referencePoints } from "@/lib/workplaneNotes";
import { planarFaceCentroid, planarFaceTriangles, type PivotPoint } from "@/lib/rotationPivot";
import { outwardFaceNormal } from "@/lib/layFlat";
import { OVERHANG_PLATE_TOLERANCE, overhangDownwardLimit } from "@/lib/overhangLimits";
import { directionIsOwnShapeAxis, rotatedGeometryShapePatch, rotationPatchFromQuaternion as sharedRotationPatchFromQuaternion, signedDegrees } from "@/lib/geometryRotation";
import type { CadModifierEdge } from "@/lib/cadModifierTypes";

const WORKPLANE_WIDTH = 200;
const WORKPLANE_DEPTH = 140;
const WORKSPACE_DEFAULTS_STORAGE_PREFIX = "layerling.workspaceDefault.";
const MOVE_DIMENSIONS_ENABLED_STORAGE_KEY = "layerling.editor.moveDimensionsEnabled";
const ORIGIN_DIMENSIONS_ENABLED_STORAGE_KEY = "layerling.editor.originDimensionsEnabled";
// How the editor opens a design: perspective (default) or orthographic. An app
// preference like the two above, not a design setting - it has to hold for
// every design, including ones saved before it existed.
const START_IN_PERSPECTIVE_STORAGE_KEY = "layerling.editor.startInPerspective";
/** Light-blue chrome for origin-distance lines, matching `.origin-dimension-value`. */
const ORIGIN_DIMENSION_LINE_COLOR = { light: "#6ec4e8", dark: "#8fd4f0" } as const;
/** Kreuzbreite und Vorgabe-Armlaengen des Winkellineal-Werkzeugs - kein Formen-Katalog-Eintrag mehr, siehe layerling-lineal.md. */
const CORNER_RULER_ARM_WIDTH = 12;
const CORNER_RULER_DEFAULT_ARM_X = 100;
const CORNER_RULER_DEFAULT_ARM_Z = 80;
const DEFAULT_WORKSPACE = DEFAULT_WORKPLANE_WORKSPACE;
const CAMERA_FOV = 38;
/** How close the camera may come to what it looks at, and how far it may back off, in mm. */
const CAMERA_MIN_DISTANCE = 3;
const CAMERA_MAX_DISTANCE = 9000;

/**
 * The normal view zooms towards its pivot and stops at the closest distance
 * to it - so with the pivot in the middle of the plate it could not come
 * close to a part at the edge, nor to one behind the pivot, while the flat
 * view, which only enlarges, went anywhere. Before a zoom-in, the pivot moves
 * along the line of sight - forward or back - to the depth of the body under
 * the pointer (the middle of the screen for the buttons), or of the plate
 * when no body is there. The picture stays put, and the zoom can go on right
 * up to what is under the pointer, as close as the flat view enlarges.
 */
function movePivotToDepthUnder(state: ThreeState, ndcX: number, ndcY: number) {
  if (!(state.camera instanceof THREE.PerspectiveCamera)) return;
  state.pointer.set(ndcX, ndcY);
  state.raycaster.setFromCamera(state.pointer, state.camera);
  const layers = state.raycaster.layers.mask;
  state.raycaster.layers.set(RENDER_LAYER_SHAPES);
  const hit = state.raycaster.intersectObjects(state.shapeLayer.children, true).find((entry) => (
    entry.object instanceof THREE.Mesh && entry.object.visible && !(state.sectionPlane && state.sectionPlane.distanceToPoint(entry.point) < -0.001)
  ));
  state.raycaster.layers.mask = layers;
  const point = hit?.point ?? state.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3());
  if (!point) return;
  const forward = state.camera.getWorldDirection(new THREE.Vector3());
  const depth = point.clone().sub(state.camera.position).dot(forward);
  if (!(depth > 0) || depth > CAMERA_MAX_DISTANCE) return;
  state.controls.target.copy(state.camera.position).addScaledVector(forward, depth);
}

/**
 * The flat (orthographic) view's zoom range, so that it frames exactly what
 * the normal view frames between its closest and farthest distance: its zoom
 * divides the frame it was made with, the normal view's frame grows with the
 * distance. Before, the flat view had a fixed 0.02 to 100 and went much closer.
 */
function orthographicZoomRange(camera: THREE.OrthographicCamera) {
  const frameHalfHeight = Math.max(0.001, (camera.top - camera.bottom) / 2);
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV / 2));
  return { min: frameHalfHeight / (CAMERA_MAX_DISTANCE * tanHalf), max: frameHalfHeight / (CAMERA_MIN_DISTANCE * tanHalf) };
}

/**
 * Near and far planes that follow the distance: up close a near plane of
 * 0.1 mm would cut into a 3 mm view, far out a fixed one would leave the
 * depth buffer too coarse and faces would flicker into each other.
 */
function fitCameraDepthRange(camera: THREE.Camera, target: THREE.Vector3) {
  if (!(camera instanceof THREE.PerspectiveCamera)) return;
  const distance = camera.position.distanceTo(target);
  const near = clamp(distance / 2000, 0.01, 5);
  const far = Math.max(6000, distance * 2 + 3000);
  if (Math.abs(camera.near - near) <= camera.near * 0.05 && Math.abs(camera.far - far) <= camera.far * 0.05) return;
  camera.near = near;
  camera.far = far;
  camera.updateProjectionMatrix();
}
const CAMERA_HOME = new THREE.Vector3(118, 96, 118);
const CAMERA_TARGET = new THREE.Vector3(0, 0, 0);
const MIN_SHAPE_SIZE = 0.01;
const MIN_ELEVATION = -180;
const MAX_ELEVATION = 220;
/** World-space offset from the height handle to the lift handle, as a fraction of selection height. */
const LIFT_HANDLE_HEIGHT_OFFSET_FRACTION = 0.30;
const CAMERA_MIN_TARGET_Y = -70;
const CAMERA_MAX_TARGET_Y = 120;
const ROTATION_PROTRACTOR_OUTER_RADIUS = 94;
const RENDER_LAYER_WORKPLANE = 0;
const RENDER_LAYER_SHAPES = 1;
/** How far beside a body a press may land and still mean it, in screen pixels: a fingertip covers more than a mouse pointer. */
const PICK_TOLERANCE_PIXELS = 6;
const PICK_TOLERANCE_PIXELS_TOUCH = 16;
const PICK_TOLERANCE_RAYS = 8;
const RENDER_LAYER_HELPERS = 2;
const RENDER_LAYER_MODIFIERS = 3;
const RENDER_LAYER_PREVIEWS = 4;
const BVH_PICKING_TRIANGLE_THRESHOLD = 512;
/** How far the pointer goes before a pressed shape starts to move, in screen pixels - as the marquee. */
const DRAG_START_PIXELS = 5;
const importedGeometryCache = new WeakMap<
  NonNullable<WorkplaneShape["importedMesh"]>,
  { geometry: THREE.BufferGeometry; edges: Map<number, THREE.EdgesGeometry> }
>();
const preservedImportedGeometryCache = new WeakMap<WorkplaneShape, THREE.BufferGeometry>();
const MAX_SHARED_SHAPE_GEOMETRIES = 192;
const MAX_SHARED_SHAPE_MATERIALS = 128;
const sharedShapeGeometryCache = new Map<string, { geometry: THREE.BufferGeometry; users: number }>();
const sharedEdgesGeometryCache = new WeakMap<THREE.BufferGeometry, Map<number, THREE.EdgesGeometry>>();
const sharedShapeMaterialCache = new Map<string, { material: THREE.MeshStandardMaterial; users: number }>();
/**
 * Shared by every solid's material: switching overhangs on or changing the
 * angle only changes these values, no material is rebuilt.
 */
const overhangUniforms = {
  uOverhangOn: { value: 0 },
  uOverhangLimit: { value: overhangDownwardLimit(45) },
  uOverhangPlateY: { value: OVERHANG_PLATE_TOLERANCE },
  uOverhangColor: { value: new THREE.Color("#e8322a") },
};
const sharedLineMaterialCache = new Map<string, THREE.LineBasicMaterial>();
const shapeResourceIds = new WeakMap<object, number>();
let nextShapeResourceId = 1;
const imageTextureLoader = new THREE.TextureLoader();
const IMPORTED_SELECTED_EDGE_TRIANGLE_LIMIT = 40000;
/** Edge lines on every body leave out an imported mesh with more triangles than this; finding its edges would cost too much. */
const ALL_EDGE_LINES_IMPORTED_TRIANGLE_LIMIT = 100_000;

/**
 * The "edge lines on all bodies" setting. Shapes are built outside React, so the
 * viewport hands the setting over here before it rebuilds them; it is part of
 * the material signature, which is how a change reaches shapes already on screen.
 */
let edgeLineStyle = { enabled: false, color: DEFAULT_EDGE_LINE_COLOR };

function setEdgeLineStyle(enabled: boolean, color: string) {
  const changed = edgeLineStyle.enabled !== enabled || (enabled && edgeLineStyle.color !== color);
  edgeLineStyle = { enabled, color };
  return changed;
}
const NORMAL_IMPORTED_SELECTION_EDGE_ANGLE = 60;
const MODIFIER_EDGE_PICK_RADIUS_PX = 14;

type WorkplaneViewportProps = {
  shapes: WorkplaneShape[];
  selectedIds: string[];
  alignMode: boolean;
  alignAnchorId: string | null;
  alignHandles: AlignHandleStatus[];
  alignReferenceShapes: WorkplaneShape[];
  mirrorMode: boolean;
  mirrorReferenceShapes: WorkplaneShape[];
  splitActive?: boolean;
  splitPlane?: ModelSplitPlane | null;
  /** Dragging the plane's arrow head moves the plane along its normal. */
  onSplitPositionChange?: (position: number) => void;
  /** The next click on a face sets the split plane there; a blue plane follows the faces under the pointer. */
  splitSurfacePick?: boolean;
  onSplitSurfacePick?: (point: [number, number, number], normal: [number, number, number]) => void;
  placementWorkplane: PlacementWorkplane;
  /** Die gesetzte Arbeitsebene gilt weiter, wird aber nicht gezeichnet. */
  workplaneHidden?: boolean;
  onToggleWorkplaneHidden?: () => void;
  workplaneMode: boolean;
  initialSnap?: GridSize;
  initialWorkspace?: WorkplaneWorkspaceSettings;
  workspaceSettingsKey?: string | null;
  /** A new shape at `point`; `workplane` is the face it was dropped on, when not the current workplane (#195). */
  onAddShape: (shape: ShapeAsset, point?: PlacementPoint, workplane?: PlacementWorkplane) => void;
  /** Parts picked up with C, following the pointer over faces until a click sets them down (#195). */
  carryIds?: string[] | null;
  onCarryDrop?: (target: { point: PlacementPoint; normal: PlacementPoint; workplane: PlacementWorkplane }) => void;
  /** A custom shape dropped on the workplane, by its id. */
  onDropMyShape?: (id: string, point: PlacementPoint) => void;
  /** Shape following the cursor until a click drops it. Null places immediately. */
  cruiseAsset?: ShapeAsset | null;
  /** Puts down the shape on the pointer when a tool here takes over the click. */
  onCancelCruise?: () => void;
  onAlignAnchorChange: (id: string) => void;
  onAlignPreview: (axis: AlignAxis, target: AlignTarget) => void;
  onAlignPreviewClear: () => void;
  onAlignSelection: (axis: AlignAxis, target: AlignTarget) => void;
  onMirrorPreview: (axis: AlignAxis) => void;
  onMirrorPreviewClear: () => void;
  onMirrorSelection: (axis: AlignAxis) => void;
  onSelectShape: (id: string | string[] | null, mode?: "replace" | "toggle") => void;
  /** A right click that did not turn the view: on a body (now selected) or on empty space. */
  onShapeContextMenu?: (request: { shapeId: string | null; clientX: number; clientY: number }) => void;
  onSetPlacementWorkplane: (workplane: PlacementWorkplane, source: "shape" | "base") => void;
  onToggleWorkplaneTool: () => void;
  onInteractionActiveChange?: (active: boolean) => void;
  onEditSketch?: () => void;
  onOpenGroup?: (id: string) => void;
  canSeparateParts?: boolean;
  onSeparateParts?: () => void;
  /** Several parts selected (#183): solid or hole, a colour and locking for all of them. */
  onSelectionHole?: (hole: boolean) => void;
  onSelectionColor?: (color: string) => void;
  onSelectionLock?: () => void;
  /** Wraps the selected body around a cylinder of this diameter (#106). */
  onWrapAroundCylinder?: (diameter: number, inward: boolean) => void;
  onLayerText?: (patch: TextLayerPatch) => void;
  onTextTags?: (names: string[], gap: number) => void;
  /** The selected name tag as its card shows it (#215). */
  textLayerStack?: NameTagStack | null;
  /** Turns a shape fresh from the library into what it places - a name tag's layers (#215) - for the ghost that follows the pointer too. */
  prepareNewShape?: (asset: ShapeAsset, shape: WorkplaneShape) => WorkplaneShape;
  onUpdateShape: (id: string, patch: ShapeUpdatePatch) => void;
  onDuplicateShapeAt?: (id: string, position: { x: number; z: number }) => void;
  /** A drag begun with Alt held: copies of these shapes land this far from them, the shapes themselves stay. */
  onDuplicateShapesMoved?: (ids: string[], delta: { dx: number; dz: number; delevation: number }) => void;
  notes?: WorkplaneNote[];
  notesVisible?: boolean;
  /** Tint faces red that overhang more steeply than workspace.overhangAngle. */
  showOverhangs?: boolean;
  noteMode?: boolean;
  /** A point the selection turns around instead of its own centre. */
  rotationPivot?: PivotPoint | null;
  /** The next click on a body sets the rotation pivot. */
  pivotPickMode?: boolean;
  onPivotPick?: (point: PivotPoint | null) => void;
  /** Waiting for a click on a face of the selection to lay it flat. */
  layFlatPickMode?: boolean;
  onLayFlatPick?: (pick: LayFlatPick | null) => void;
  /** "Align faces" waiting for a click on a face of one of these bodies. */
  mateFacePick?: { shapeIds: string[] } | null;
  onMateFacePick?: (pick: LayFlatPick | null) => void;
  onNoteAdd?: (note: { x: number; y: number; z: number; anchor?: WorkplaneNoteAnchor }) => string | null;
  onNoteUpdate?: (id: string, patch: Partial<WorkplaneNote>, transient?: boolean) => void;
  onNoteRemove?: (id: string) => void;
  onNoteModeChange?: (active: boolean) => void;
  onWorkspaceSettingsChange?: (settings: { workspace: WorkplaneWorkspaceSettings; snap: GridSize }) => void;
  projectName?: string;
  /** The design on screen, null behind the overview. The viewport outlives a design, so its tools reset when this changes. */
  projectId?: string | null;
  onWorkplaneModeChange: (active: boolean) => void;
  modifierActive?: boolean;
  modifierPreviewActive?: boolean;
  modifierEdges?: CadModifierEdge[];
  modifierHighlightedEdgeIds?: number[];
  selectedModifierEdgeIds?: number[];
  onModifierEdgeToggle?: (id: number, singleEdge: boolean) => void;
  themePreference?: AppThemePreference;
  resolvedTheme?: ResolvedAppTheme;
  onThemePreferenceChange?: (preference: AppThemePreference) => void;
  /** Der aktuelle Schnitt als SVG: rechnet der Editor, aus denselben Koerpern wie der Export. */
  onExportSectionSvg?: (axis: SectionPlaneAxis, offset: number) => void;
  /** The cut's outlines, from the same bodies as the SVG - what section measuring snaps to. */
  onSectionContours?: (axis: SectionPlaneAxis, offset: number) => Promise<SectionLoop[]>;
};

type WorkspaceSettings = WorkplaneWorkspaceSettings;
/** Keys a focused slider moves itself with; every other key may still reach the view. */
const SLIDER_KEYS: ReadonlySet<string> = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"]);

function readSavedWorkspaceDefault(key: string | null) {
  if (!key || typeof window === "undefined") {
    return null;
  }
  const globalDefault = readWorkspaceDefault();
  if (globalDefault) {
    return globalDefault;
  }
  // Defaults saved before they became global were filed under this key.
  try {
    const parsed = JSON.parse(window.localStorage.getItem(`${WORKSPACE_DEFAULTS_STORAGE_PREFIX}${key}`) ?? "null") as {
      workspace?: unknown;
      snap?: unknown;
    } | null;
    if (!parsed) {
      return null;
    }
    return {
      workspace: normalizeWorkspaceSettings(parsed.workspace),
      snap: normalizeSnapGrid(parsed.snap, DEFAULT_SNAP_GRID),
    };
  } catch {
    return null;
  }
}

function readMoveDimensionsEnabled() {
  if (typeof window === "undefined") {
    return true;
  }
  return window.localStorage.getItem(MOVE_DIMENSIONS_ENABLED_STORAGE_KEY) !== "false";
}

const PROPORTION_LOCK_STORAGE_KEY = "layerling.editor.keepProportions";
const POINT_CARD_OFFSET_STORAGE_KEY = "layerling.editor.pointCardOffset";

type PointCardOffset = { x: number; y: number };

/** The card of a reference point, as far as the person has moved it from its pin. */
function readPointCardOffset(): PointCardOffset {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(POINT_CARD_OFFSET_STORAGE_KEY) ?? "null") as Partial<PointCardOffset> | null;
    if (parsed && Number.isFinite(parsed.x) && Number.isFinite(parsed.y)) return { x: Number(parsed.x), y: Number(parsed.y) };
  } catch {
    // Without storage the card simply opens beside its pin.
  }
  return { x: 0, y: 0 };
}

function readProportionLock() {
  try {
    return window.localStorage.getItem(PROPORTION_LOCK_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

/**
 * Typing one measure with the proportion lock on: the other two follow by the
 * same factor. `patch` is what the inspector decided for the typed measure -
 * with all its shape-specific rules - and the remaining axes are scaled on top
 * of that, the bottom of the shape staying where it is.
 */
function patchWithKeptProportions(
  shape: WorkplaneShape,
  patch: Partial<WorkplaneShape>,
  axis: ShapeInspectorUpdateOptions["resizeAxis"],
): Partial<WorkplaneShape> {
  if (!axis || "x" in patch || "z" in patch || "elevation" in patch) return patch;
  const draft = { ...shape, ...patch } as WorkplaneShape;
  const before = axis === "width" ? shapeWidth(shape) : axis === "depth" ? shapeDepth(shape) : shape.height;
  const after = axis === "width" ? shapeWidth(draft) : axis === "depth" ? shapeDepth(draft) : draft.height;
  if (!(before > 0) || !(after > 0)) return patch;
  const factor = after / before;
  if (Math.abs(factor - 1) < 1e-6) return patch;
  const widthStep = factor * shapeWidth(shape) / Math.max(MIN_SHAPE_SIZE, shapeWidth(draft));
  const depthStep = factor * shapeDepth(shape) / Math.max(MIN_SHAPE_SIZE, shapeDepth(draft));
  const heightStep = factor * shape.height / Math.max(MIN_SHAPE_SIZE, draft.height);
  const horizontal = Math.abs(widthStep - 1) > 1e-6 || Math.abs(depthStep - 1) > 1e-6
    ? { ...patch, ...scaledHorizontalShapePatch(draft, widthStep, depthStep) }
    : patch;
  const frame = selectionFrameForShapes([shape], [shape.id]);
  if (!frame) return horizontal;
  return patchWithUniformHeightScale(shape, horizontal, heightStep, selectionWorldYBounds(frame).min);
}

function readOriginDimensionsEnabled() {
  if (typeof window === "undefined") {
    return true;
  }
  return window.localStorage.getItem(ORIGIN_DIMENSIONS_ENABLED_STORAGE_KEY) !== "false";
}

function readStartInPerspective() {
  if (typeof window === "undefined") {
    return true;
  }
  try {
    return window.localStorage.getItem(START_IN_PERSPECTIVE_STORAGE_KEY) !== "false";
  } catch {
    return true;
  }
}

type ShapeRenderRecord = {
  object: THREE.Group;
  shape: WorkplaneShape;
  transformSignature: string;
  materialSignature: string;
  geometrySignature: string;
  selected: boolean;
};

type ThreeState = {
  /** Colour set on top of light/dark; only the canvas reads it. */
  palette?: AppThemePalette;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  controls: OrbitControls;
  workplaneLayer: THREE.Group;
  workplanePreviewLayer: THREE.Group;
  /** The face "Lay flat" would turn down, drawn while the pointer is over it. */
  layFlatHoverLayer?: THREE.Group;
  /** The bent-tube segment the settings are about, drawn over the tube. */
  bentTubeSegmentLayer?: THREE.Group;
  shapeLayer: THREE.Group;
  helperLayer: THREE.Group;
  splitLayer: THREE.Group;
  transformGuideLayer: THREE.Group;
  moveDimensionLayer: THREE.Group;
  originDimensionLayer: THREE.Group;
  modifierLayer: THREE.Group;
  shapeRecords: Map<string, ShapeRenderRecord>;
  /** The pivot the user set for rotating; the rotation wheels sit on its axes. */
  rotationPivot?: THREE.Vector3 | null;
  officialShapeLayerActive: boolean;
  raycaster: THREE.Raycaster;
  pointer: THREE.Vector2;
  dragPlane: THREE.Plane;
  animationId: number;
  needsRender: boolean;
  wasCameraMoving: boolean;
  lastOverlaySync: number;
  lastViewCubeSync: number;
  rotationHandleSides: RotationHandleSides | null;
  sectionPlane: THREE.Plane | null;
  sectionPlaneHelper: THREE.Group | null;
  /** The scene's lights, so the settings can change how punchy the shading is. */
  lights: { ambient: THREE.HemisphereLight; key: THREE.DirectionalLight; fill: THREE.DirectionalLight };
  disposeInteractionListeners: () => void;
  resize: () => void;
};

type ViewportPerfStats = {
  fps: number;
  frameMs: number;
  maxFrameMs: number;
  drawCalls: number;
  triangles: number;
  points: number;
  lines: number;
  shapeCount: number;
};

declare global {
  interface Window {
    layerlingPerf?: {
      get: () => ViewportPerfStats;
    };
    layerlingCaptureCanvas?: () => string;
    layerlingCaptureCanvasAsync?: () => Promise<string>;
    layerlingCaptureView?: (face?: LayerlingMcpViewFace) => Promise<string> | string;
    /** Turns the view about its centre: azimuth around the vertical, polar towards or away from straight down. */
    layerlingOrbitView?: (azimuthDegrees: number, polarDegrees: number) => void;
    layerlingCaptureImage?: (options?: { plate?: boolean; transparent?: boolean; scale?: number }) => string;
    /** The section view for MCP: applies what is given, returns the settings it ends on and the plane's range. */
    layerlingSectionView?: (patch: Partial<SectionPlaneSettings> & { center?: boolean }) => { settings: SectionPlaneSettings; bounds: { min: number; max: number; center: number } };
    /** "Hide workplane" in the camera bar for MCP: sets it when given, returns whether the plate is shown. */
    layerlingWorkplaneDisplay?: (visible?: boolean) => { visible: boolean };
    /** Which way the screen points in the world: right, and away from the viewer (up on a view from above). */
    layerlingScreenDirections?: () => { right: { x: number; y: number; z: number }; away: { x: number; y: number; z: number } };
    /** Moves the view along when bodies moved by keyboard would leave it. */
    layerlingFollowMove?: (ids: string[], translation: { x: number; y: number; z: number }) => void;
  }
}

type DragState = {
  primaryId: string;
  offsetX: number;
  offsetZ: number;
  planeY: number;
  workplane: PlacementWorkplane;
  startPoint: PlacementPoint;
  pointerId: number;
  primaryStartX: number;
  primaryStartZ: number;
  items: DragItem[];
  /** Shift was held on a selected shape: if nothing moves, this was a click that takes it out of the selection. */
  toggleOnClick?: boolean;
  /** Where the pointer went down, in screen pixels: the shape stays put until it has really travelled (#150). */
  startClient: { x: number; y: number };
  started?: boolean;
  /**
   * Alt was held when the drag began: what moves is a copy. Until the drop
   * creates it, the dragged shapes stand for the copy and these stand-ins
   * hold the place the shapes never leave.
   */
  duplicate?: { standIns: THREE.Object3D[] };
  /** World footprint of the dragged shapes at the start, when snapping to other shapes is on. */
  snapMoving?: SnapBox | null;
  snapTargets?: SnapBox[];
};

type MoveDimensionSession = {
  active: boolean;
  originX: number;
  originZ: number;
  planeY: number;
  deltaX: number;
  deltaZ: number;
  items: Array<Pick<DragItem, "id" | "startX" | "startZ">>;
};

type MoveDimensionOverlayState = MoveDimensionOverlayData & {
  active: boolean;
};

type SplitPlaneDragState = {
  pointerId: number;
  axisOrigin: THREE.Vector3;
  axisNormal: THREE.Vector3;
  startParameter: number;
  startPosition: number;
};

type MarqueeState = {
  pointerId: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  additive: boolean;
  hasMoved: boolean;
};

/** Eine gleichbleibende leere Liste, damit die Eigenschaft nicht jedes Bild neu wird. */
const EMPTY_NOTES: WorkplaneNote[] = [];

/** Breite einer offenen Notizkarte samt Nadel und Abstand, in Bildpunkten. */
const NOTE_CARD_REACH = 260;

/** Weiter waechst das Textfeld nicht mit; darueber hinaus wird darin gerollt. */
const NOTE_TEXT_MAX_HEIGHT = 168;

type NoteOverlayItem = {
  id: string;
  index: number;
  text: string;
  collapsed: boolean;
  attached: boolean;
  /** A reference point, not a note: shown as a mark with its coordinates. */
  point: boolean;
  x: number;
  y: number;
  z: number;
  screenX: number;
  screenY: number;
  behind: boolean;
  /** Am rechten Rand oeffnet die Karte nach links, sonst stuende sie ausserhalb. */
  flipped: boolean;
};

type NoteOverlayState = {
  notes: NoteOverlayItem[];
};

type NoteDragState = {
  noteId: string;
  pointerId: number;
  moved: boolean;
};

type TapePoint = {
  id: string;
  x: number;
  y: number;
  z: number;
  attachment?: TapeAttachment;
};

type TapeAttachment = {
  shapeId: string;
  normalized: [number, number, number];
  kind?: "vertex" | "edge" | "surface";
  topologyKey?: string;
};

type TapeEdgeAttachment = {
  key: string;
  shapeId: string;
  normalizedPoints: Array<[number, number, number]>;
  topologyKey?: string;
};

type TapeSegment = {
  id: string;
  startId: string;
  endId: string;
  edge?: TapeEdgeAttachment;
};

type TapeModel = {
  points: TapePoint[];
  segments: TapeSegment[];
  startPointId: string | null;
  hover: TapeCandidate | null;
};

type TapeOverlayState = {
  points: Array<TapePoint & { screenX: number; screenY: number }>;
  segments: Array<TapeSegment & { x1: number; y1: number; x2: number; y2: number; screenPoints?: string; labelX: number; labelY: number; label: string }>;
  hover: { screenX: number; screenY: number; edgeScreenPoints?: string } | null;
};

type TapeCandidate = {
  x: number;
  y: number;
  z: number;
  pointId?: string;
  attachment?: TapeAttachment;
  edge?: TapeEdgeAttachment;
};

type TapePointDragState = {
  pointId: string;
  pointerId: number;
};

type RotationHandleSide = "near" | "right" | "far" | "left";
type RotationHandleSides = Record<RotationAxis, RotationHandleSide>;
type ShapeUpdatePatch = Partial<WorkplaneShape> & { bakeTransform?: boolean };
type ResizeSigns = { x: number; z: number };
type ResizeAnchorMemory = {
  shapeId: string;
  handleKey: string;
  signs: ResizeSigns;
  pressedY: "top" | "bottom" | null;
};
type TransformDragState = {
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

type TransformDragItem = {
  id: string;
  startShape: WorkplaneShape;
  startCenter: THREE.Vector3;
  startQuaternion: THREE.Quaternion;
};

type DragItem = {
  id: string;
  startX: number;
  startZ: number;
  startElevation: number;
  nextX: number;
  nextZ: number;
  nextElevation: number;
  startVisualY: number;
  visual: THREE.Object3D | null;
  helper: THREE.Box3Helper | null;
  helperBox: THREE.Box3 | null;
  hadPreviewSimplified: boolean;
};

function previewShapesForDrag(shapes: WorkplaneShape[], drag: DragState | null) {
  if (!drag) {
    return shapes;
  }
  const previewById = new Map(drag.items.map((item) => [item.id, item]));
  return shapes.map((shape) => {
    const preview = previewById.get(shape.id);
    return preview ? { ...shape, x: preview.nextX, z: preview.nextZ, elevation: preview.nextElevation } : shape;
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function snapValue(value: number, step: number) {
  return step > 0 ? Math.round(value / step) * step : value;
}

function snapDimension(value: number, step: number, min = MIN_SHAPE_SIZE, max = 220) {
  const snapped = step > 0 ? snapValue(value, step) : value;
  const effectiveMin = step > 0 ? Math.max(min, Math.min(step, max)) : min;
  return clamp(snapped, effectiveMin, max);
}

/** Wie weit ein gezogenes Teil ueber den Plattenrand hinaus darf, als Anteil der Plattengroesse je Seite. */
const PLATE_DRAG_REACH = 1;

function snapPositionValue(value: number, step: number, min: number, max: number) {
  return clamp(step > 0 ? snapValue(value, step) : value, min, max);
}

function screenAngle(clientX: number, clientY: number, center: { x: number; y: number }) {
  return Math.atan2(clientY - center.y, clientX - center.x);
}

function rotationPlanePointerLocal(
  plane: RotationPlaneView | undefined,
  screenX: number,
  screenY: number,
) {
  if (!plane) {
    return null;
  }
  const planeX = screenX - plane.x;
  const planeY = screenY - plane.y;
  const determinant = plane.a * plane.d - plane.b * plane.c;
  if (Math.abs(determinant) < 0.000001) {
    return null;
  }
  return {
    x: (plane.d * planeX - plane.c * planeY) / determinant,
    y: (-plane.b * planeX + plane.a * planeY) / determinant,
  };
}

function rotationPlanePointerAngle(
  plane: RotationPlaneView | undefined,
  screenX: number,
  screenY: number,
  fallbackCenter: { x: number; y: number },
) {
  const local = rotationPlanePointerLocal(plane, screenX, screenY);
  return THREE.MathUtils.radToDeg(
    local
      ? Math.atan2(local.y, local.x)
      : Math.atan2(screenY - fallbackCenter.y, screenX - fallbackCenter.x),
  );
}

function unwrapRadians(value: number) {
  if (value > Math.PI) {
    return value - Math.PI * 2;
  }
  if (value < -Math.PI) {
    return value + Math.PI * 2;
  }
  return value;
}

function rotationAxisForHandle(handleKey: string): RotationAxis {
  if (handleKey.endsWith("-x") || handleKey === "rotate-left") {
    return "x";
  }
  if (handleKey.endsWith("-z") || handleKey === "rotate-right") {
    return "z";
  }
  return "y";
}

function rotationValueForAxis(shape: WorkplaneShape, axis: RotationAxis) {
  if (axis === "x") {
    return shape.rotationX ?? 0;
  }
  if (axis === "z") {
    return shape.rotationZ ?? 0;
  }
  return shape.rotation;
}

function rotationPatchForAxis(axis: RotationAxis, value: number): Partial<WorkplaneShape> {
  const normalized = cleanRotationDegrees(value);
  if (axis === "x") {
    return { rotationX: normalized };
  }
  if (axis === "z") {
    return { rotationZ: normalized };
  }
  return { rotation: normalized };
}

function quaternionForShape(shape: WorkplaneShape) {
  return new THREE.Quaternion().setFromEuler(
    new THREE.Euler(
      THREE.MathUtils.degToRad(shape.rotationX ?? 0),
      THREE.MathUtils.degToRad(shape.rotation),
      THREE.MathUtils.degToRad(shape.rotationZ ?? 0),
      "XYZ",
    ),
  );
}

function rotationPatchFromQuaternion(quaternion: THREE.Quaternion): Partial<WorkplaneShape> {
  return sharedRotationPatchFromQuaternion(quaternion);
}

function canvasPngDataUrl(canvas: HTMLCanvasElement) {
  return new Promise<string>((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve("");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
      reader.onerror = () => resolve("");
      reader.readAsDataURL(blob);
    }, "image/png");
  });
}

function thumbnailPngDataUrl(source: HTMLCanvasElement) {
  const dimensions = projectThumbnailDimensions(source.width, source.height);
  const thumbnail = document.createElement("canvas");
  thumbnail.width = dimensions.width;
  thumbnail.height = dimensions.height;
  const context = thumbnail.getContext("2d", { alpha: false });
  if (!context) return Promise.resolve("");
  context.drawImage(source, 0, 0, dimensions.width, dimensions.height);
  return canvasPngDataUrl(thumbnail);
}

function rotationScreenSign(axisVector: THREE.Vector3, camera: THREE.Camera) {
  const cameraForward = camera.getWorldDirection(new THREE.Vector3());
  return axisVector.dot(cameraForward) >= 0 ? 1 : -1;
}

function projectToScreen(point: THREE.Vector3, state: ThreeState) {
  const rect = state.renderer.domElement.getBoundingClientRect();
  state.camera.updateMatrixWorld();
  const projected = point.clone().project(state.camera);
  return {
    x: ((projected.x + 1) / 2) * rect.width,
    y: ((1 - projected.y) / 2) * rect.height,
  };
}

function syncMoveDimensionOverlay(
  state: ThreeState,
  session: MoveDimensionSession | null,
  overlayRef: MutableRefObject<MoveDimensionOverlayState | null>,
  setOverlay: Dispatch<SetStateAction<MoveDimensionOverlayState | null>>,
  accuracy: MeasurementAccuracy,
  theme: ResolvedAppTheme,
) {
  syncMoveDimensionWorldLines(state, session, theme);
  const rect = state.renderer.domElement.getBoundingClientRect();
  const projected = session
    ? createMoveDimensionOverlay({
        originX: session.originX,
        originZ: session.originZ,
        planeY: session.planeY,
        deltaX: session.deltaX,
        deltaZ: session.deltaZ,
        accuracy,
        width: rect.width,
        height: rect.height,
        project: ({ x, y, z }) => projectToScreen(new THREE.Vector3(x, y, z), state),
      })
    : null;
  const next = projected && session ? { ...projected, active: session.active } : null;
  if (JSON.stringify(overlayRef.current) === JSON.stringify(next)) {
    return;
  }
  overlayRef.current = next;
  setOverlay(next);
}

function syncMoveDimensionWorldLines(
  state: ThreeState,
  session: MoveDimensionSession | null,
  theme: ResolvedAppTheme,
) {
  const layer = state.moveDimensionLayer;
  const signature = session
    ? [session.originX, session.originZ, session.planeY, session.deltaX, session.deltaZ, theme].join(":")
    : "";
  if (layer.userData.moveDimensionSignature === signature) {
    return;
  }
  layer.userData.moveDimensionSignature = signature;
  disposeChildren(layer);
  if (!session || (Math.abs(session.deltaX) < 1e-9 && Math.abs(session.deltaZ) < 1e-9)) {
    state.needsRender = true;
    return;
  }

  const y = session.planeY;
  const origin = new THREE.Vector3(session.originX, y, session.originZ);
  const xEnd = new THREE.Vector3(session.originX + session.deltaX, y, session.originZ);
  const zEnd = new THREE.Vector3(session.originX, y, session.originZ + session.deltaZ);
  const current = new THREE.Vector3(session.originX + session.deltaX, y, session.originZ + session.deltaZ);
  const solidColor = theme === "dark" ? "#f1f8fc" : "#111a21";
  const guideColor = theme === "dark" ? "#b8c9d2" : "#65737c";
  const solidPoints: number[] = [];
  const guidePoints: number[] = [];

  const addSegment = (points: number[], start: THREE.Vector3, end: THREE.Vector3) => {
    points.push(start.x, start.y, start.z, end.x, end.y, end.z);
  };
  const addWideSegments = (points: number[], color: string, linewidth: number, opacity: number, renderOrder: number) => {
    if (points.length === 0) {
      return;
    }
    const geometry = new LineSegmentsGeometry();
    geometry.setPositions(points);
    const material = new LineMaterial({
      color,
      linewidth,
      worldUnits: false,
      transparent: true,
      opacity,
      depthTest: false,
      depthWrite: false,
      alphaToCoverage: false,
    });
    material.toneMapped = false;
    const rect = state.renderer.domElement.getBoundingClientRect();
    material.resolution.set(Math.max(1, rect.width), Math.max(1, rect.height));
    const lines = new LineSegments2(geometry, material);
    lines.renderOrder = renderOrder;
    lines.frustumCulled = false;
    setObjectRenderLayer(lines, RENDER_LAYER_HELPERS);
    layer.add(lines);
  };
  const addArrow = (endpoint: THREE.Vector3, axisX: number, axisZ: number, movement: number) => {
    const direction = new THREE.Vector3(axisX * Math.sign(movement), 0, axisZ * Math.sign(movement));
    const arrowLength = Math.min(1.1, Math.max(0.26, Math.abs(movement) * 0.5));
    const arrowWidth = arrowLength * 0.72;
    const base = endpoint.clone().addScaledVector(direction, -arrowLength);
    const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x).multiplyScalar(arrowWidth / 2);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([
        endpoint.x, endpoint.y, endpoint.z,
        base.x + perpendicular.x, base.y, base.z + perpendicular.z,
        base.x - perpendicular.x, base.y, base.z - perpendicular.z,
      ], 3),
    );
    const arrowMaterial = new THREE.MeshBasicMaterial({
      color: solidColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 1,
      depthTest: false,
      depthWrite: false,
    });
    arrowMaterial.toneMapped = false;
    const arrow = new THREE.Mesh(geometry, arrowMaterial);
    arrow.renderOrder = 1002;
    arrow.frustumCulled = false;
    setObjectRenderLayer(arrow, RENDER_LAYER_HELPERS);
    layer.add(arrow);
  };

  if (Math.abs(session.deltaX) >= 1e-9) {
    const overrun = Math.min(2, Math.max(0.5, Math.abs(session.deltaX) * 0.15));
    const start = origin.clone().add(new THREE.Vector3(-Math.sign(session.deltaX) * overrun, 0, 0));
    addSegment(solidPoints, start, xEnd);
    addSegment(guidePoints, xEnd, current);
    addArrow(xEnd, 1, 0, session.deltaX);
  }
  if (Math.abs(session.deltaZ) >= 1e-9) {
    const overrun = Math.min(2, Math.max(0.5, Math.abs(session.deltaZ) * 0.15));
    const start = origin.clone().add(new THREE.Vector3(0, 0, -Math.sign(session.deltaZ) * overrun));
    addSegment(solidPoints, start, zEnd);
    addSegment(guidePoints, zEnd, current);
    addArrow(zEnd, 0, 1, session.deltaZ);
  }

  addWideSegments(solidPoints, solidColor, 1.45, 1, 1001);
  addWideSegments(guidePoints, guideColor, 1.05, 0.72, 1000);
  state.needsRender = true;
}

function syncTransformGuideWorldLines(
  state: ThreeState,
  segments: Array<readonly [THREE.Vector3, THREE.Vector3]> | null,
  theme: ResolvedAppTheme,
) {
  const layer = state.transformGuideLayer;
  const signature = segments
    ? [
        theme,
        ...segments.flatMap(([start, end]) => [start.x, start.y, start.z, end.x, end.y, end.z]),
      ].join(":")
    : "";
  if (layer.userData.transformGuideSignature === signature) {
    return;
  }

  layer.userData.transformGuideSignature = signature;
  disposeChildren(layer);
  if (!segments || segments.length === 0) {
    state.needsRender = true;
    return;
  }

  const positions = segments.flatMap(([start, end]) => [start.x, start.y, start.z, end.x, end.y, end.z]);
  const geometry = new LineSegmentsGeometry();
  geometry.setPositions(positions);
  const material = new LineMaterial({
    color: theme === "dark" ? "#cfe1ea" : "#1f272e",
    linewidth: 1.15,
    worldUnits: false,
    dashed: true,
    dashSize: 0.625,
    gapSize: 0.625,
    transparent: true,
    opacity: theme === "dark" ? 0.86 : 0.72,
    // Bodies hide the guides: the footprint lies under the selected body and must not shine
    // through it or through its neighbours (#219).
    depthTest: true,
    depthWrite: false,
    alphaToCoverage: false,
  });
  material.toneMapped = false;
  const rect = state.renderer.domElement.getBoundingClientRect();
  material.resolution.set(Math.max(1, rect.width), Math.max(1, rect.height));
  const lines = new LineSegments2(geometry, material);
  lines.computeLineDistances();
  lines.renderOrder = 999;
  lines.frustumCulled = false;
  setObjectRenderLayer(lines, RENDER_LAYER_HELPERS);
  freezeStaticObjectMatrices(lines);
  layer.add(lines);
  state.needsRender = true;
}

function tapeShapeDimensions(object: THREE.Object3D) {
  const dimensions = object.userData.tapeDimensions as [number, number, number] | undefined;
  return dimensions ?? [1, 1, 1];
}

function tapeShapeTopologyKey(shape: WorkplaneShape): string {
  const positions = shape.importedMesh?.positions ?? [];
  const positionSample = positions.length > 0
    ? Array.from({ length: Math.min(12, positions.length) }, (_, index) => positions[Math.floor(index * (positions.length - 1) / Math.max(1, Math.min(12, positions.length) - 1))]?.toFixed(4) ?? "0").join(",")
    : "";
  const brep = shape.cadBrep ?? "";
  const brepSample = brep.length > 0
    ? Array.from({ length: Math.min(8, brep.length) }, (_, index) => brep.charCodeAt(Math.floor(index * (brep.length - 1) / Math.max(1, Math.min(8, brep.length) - 1)))).join(",")
    : "";
  return JSON.stringify({
    kind: shape.kind,
    radius: shape.radius,
    steps: shape.steps,
    sides: shape.sides,
    bevel: shape.bevel,
    segments: shape.segments,
    topRadius: shape.topRadius,
    baseRadius: shape.baseRadius,
    topWidth: shape.topWidth,
    topDepth: shape.topDepth,
    taperTopWidth: shape.taperTopWidth,
    taperTopDepth: shape.taperTopDepth,
    taperBottomWidth: shape.taperBottomWidth,
    taperBottomDepth: shape.taperBottomDepth,
    taperTopScale: shape.taperTopScale,
    taperBottomScale: shape.taperBottomScale,
    extrudeTwist: shape.extrudeTwist,
    extrudeTopOffsetX: shape.extrudeTopOffsetX,
    extrudeTopOffsetZ: shape.extrudeTopOffsetZ,
    teeth: shape.teeth,
    toothSize: shape.toothSize,
    toothWidth: shape.toothWidth,
    centerHoleSize: shape.centerHoleSize,
    gearType: shape.gearType,
    gearRim: shape.gearRim,
    helixAngle: shape.helixAngle,
    threadRole: shape.threadRole,
    threadHead: shape.threadHead,
    threadHand: shape.threadHand,
    threadProfile: shape.threadProfile,
    threadDiameter: shape.threadDiameter,
    threadPitch: shape.threadPitch,
    threadClearance: shape.threadClearance,
    threadBoltClearance: shape.threadBoltClearance,
    threadQuality: shape.threadQuality,
    threadHeadHeight: shape.threadHeadHeight,
    threadChamfer: shape.threadChamfer,
    threadHeadChamfer: shape.threadHeadChamfer,
    springTurns: shape.springTurns,
    springWire: shape.springWire,
    springHand: shape.springHand,
    springQuality: shape.springQuality,
    helixQuality: shape.helixQuality,
    gearProfile: shape.gearProfile,
    gearPressureAngle: shape.gearPressureAngle,
    gearBacklash: shape.gearBacklash,
    starPoints: shape.starPoints,
    starInnerSize: shape.starInnerSize,
    starOuterFillet: shape.starOuterFillet,
    starInnerFillet: shape.starInnerFillet,
    starQuality: shape.starQuality,
    heartTipFillet: shape.heartTipFillet,
    heartQuality: shape.heartQuality,
    crescentThickness: shape.crescentThickness,
    crescentTipFillet: shape.crescentTipFillet,
    crescentQuality: shape.crescentQuality,
    honeycombCellSize: shape.honeycombCellSize,
    honeycombWallThickness: shape.honeycombWallThickness,
    honeycombFrameWidth: shape.honeycombFrameWidth,
    hingeKnuckles: shape.hingeKnuckles,
    hingePinDiameter: shape.hingePinDiameter,
    hingeLeafThickness: shape.hingeLeafThickness,
    hingeClearance: shape.hingeClearance,
    knurlPattern: shape.knurlPattern,
    knurlCount: shape.knurlCount,
    knurlDepth: shape.knurlDepth,
    knurlAngle: shape.knurlAngle,
    knurlChamfer: shape.knurlChamfer,
    dovetailNeckWidth: shape.dovetailNeckWidth,
    dovetailClearance: shape.dovetailClearance,
    loftBottomOutline: shape.loftBottomOutline,
    loftTopOutline: shape.loftTopOutline,
    loftBottomWidth: shape.loftBottomWidth,
    loftBottomDepth: shape.loftBottomDepth,
    loftTopWidth: shape.loftTopWidth,
    loftTopDepth: shape.loftTopDepth,
    loftBottomCorner: shape.loftBottomCorner,
    loftTopCorner: shape.loftTopCorner,
    loftBottomSides: shape.loftBottomSides,
    loftTopSides: shape.loftTopSides,
    loftOffsetX: shape.loftOffsetX,
    loftOffsetZ: shape.loftOffsetZ,
    loftWall: shape.loftWall,
    loftTwist: shape.loftTwist,
    slotEndRatio: shape.slotEndRatio,
    loftTiltX: shape.loftTiltX,
    loftTiltZ: shape.loftTiltZ,
    screwHoleShaft: shape.screwHoleShaft,
    screwHoleHeadDepth: shape.screwHoleHeadDepth,
    screwHoleAngle: shape.screwHoleAngle,
    // A dovetail cut-out grows by its clearance, so body and socket differ.
    dovetailHole: shape.kind === "dovetail" ? Boolean(shape.hole) : undefined,
    cornerFillet: shape.cornerFillet,
    topBottomFillet: shape.topBottomFillet,
    roundedBoxQuality: shape.roundedBoxQuality,
    bentTubeProfile: shape.bentTubeProfile,
    bentTubeInnerProfile: shape.bentTubeInnerProfile,
    bentTubeSize: shape.bentTubeSize,
    bentTubeWall: shape.bentTubeWall,
    bentTubeQuality: shape.bentTubeQuality,
    bentTubeSegments: shape.bentTubeSegments,
    text: shape.text,
    font: shape.font,
    // A font of one's own can gain letters (a design's few, then the whole file): draw again then.
    fontRevision: customFontRevision(shape.font),
    textStroke: shape.textStroke,
    textSilhouette: shape.textSilhouette,
    textKeyring: shape.textKeyring,
    // A fill is built by the 2D kernel; until it has loaded the text is drawn plain (#215).
    fillKernel: shape.textStroke || shape.textSilhouette || shape.textKeyring ? manifoldRevision() : undefined,
    textCurved: shape.textCurved,
    textRadius: shape.textRadius,
    textSize: shape.textSize,
    textInward: shape.textInward,
    textFlipped: shape.textFlipped,
    mesh: [positions.length, positionSample],
    brep: [brep.length, brepSample],
    treatments: shape.edgeTreatments,
    children: shape.groupedShapes?.map((child) => [child.id, tapeShapeTopologyKey(child)]),
  });
}

function shapeResourceId(value: object | null | undefined) {
  if (!value) return 0;
  const existing = shapeResourceIds.get(value);
  if (existing) return existing;
  const next = nextShapeResourceId;
  nextShapeResourceId += 1;
  shapeResourceIds.set(value, next);
  return next;
}

function shapeTransformSignature(shape: WorkplaneShape) {
  return [
    shape.x,
    shape.z,
    shape.elevation ?? 0,
    shape.rotation,
    shape.rotationX ?? 0,
    shape.rotationZ ?? 0,
    Boolean(shape.mirrorX),
    Boolean(shape.mirrorY),
    Boolean(shape.mirrorZ),
  ].join("|");
}

function shapeMaterialSignature(shape: WorkplaneShape): string {
  return JSON.stringify({
    edgeLines: edgeLineStyle.enabled ? edgeLineStyle.color : "",
    color: shape.color,
    hole: Boolean(shape.hole),
    transparent: Boolean(shape.transparent),
    multicolor: shape.groupedShapes?.length ? groupShowsPartColors(shape) : undefined,
    imagePlate: shapeResourceId(shape.imagePlate),
    imageData: shape.imagePlate?.dataUrl ?? "",
    sourceFormat: shape.importedMesh?.sourceFormat ?? "",
    mirrored: mirroredAxisCount(shape) % 2,
    cadEdges: shapeResourceId(shape.cadDisplayEdges),
    cadEdgesVersion: shape.cadDisplayEdgesVersion ?? 0,
    cadEdgeDimensions: shape.cadDisplayEdges?.length ? [shapeWidth(shape), shapeDepth(shape), shape.height] : null,
    groupedMaterials: shape.groupedShapes?.map((child) => [child.id, child.hidden, shapeMaterialSignature(groupChildAppearance(shape, child))]),
  });
}

/**
 * Die Seitenzahl der beiden Vielkoerper. Der Mehrkant ist eckig und bleibt bei
 * dem, was eingestellt ist; beim Zylinder waechst sie ohne eigene Angabe mit
 * dem Durchmesser mit.
 */
function polygonSidesForShape(shape: WorkplaneShape) {
  if (shape.kind === "polygon") return shape.sides ?? 6;
  return roundSideCount(shape.sides, shapeWidth(shape), shapeDepth(shape));
}

function shapeGeometrySignature(shape: WorkplaneShape): string {
  const taper = !shapeSupportsTaper(shape.kind) || !shapeHasTaper(shape)
    ? null
    : { ...shapeTaperDimensions(shape), baseWidth: shapeWidth(shape), baseDepth: shapeDepth(shape) };
  // Twist/lean reshape the mesh the same way taper does, so a change to
  // either has to bust this signature - otherwise the cached geometry from
  // before the twist stays on screen.
  const deform = shapeHasExtrudeDeform(shape)
    ? { twist: shape.extrudeTwist, offsetX: shape.extrudeTopOffsetX, offsetZ: shape.extrudeTopOffsetZ }
    : null;
  if (shape.groupedShapes?.length && !shape.importedMesh) {
    return JSON.stringify({
      kind: "group",
      width: shapeWidth(shape),
      depth: shapeDepth(shape),
      height: shape.height,
      taper,
      deform,
      children: shape.groupedShapes.map((child) => [
        child.id,
        child.hidden,
        shapeWidth(child),
        shapeDepth(child),
        child.height,
        shapeTransformSignature(child),
        shapeGeometrySignature(child),
      ]),
    });
  }

  if (shape.importedMesh) {
    return JSON.stringify({
      kind: "mesh",
      mesh: shapeResourceId(shape.importedMesh),
      // A cut group in its parts' colours carries them in the geometry.
      partColors: !shape.hole && groupShowsPartColors(shape) ? shapeResourceId(shape.groupedShapes) : 0,
      taper,
      deform,
      preserve: preservesEdgeTreatmentSize(shape)
        ? [shapeWidth(shape), shapeDepth(shape), shape.height, shape.edgeTreatments]
        : false,
    });
  }

  // These are unit bodies stretched by the mesh; a twist or lean is worked out in millimetres
  // (taperGeometryForShape), so then the size is part of the geometry too.
  const size = deform ? [shapeWidth(shape), shapeDepth(shape), shape.height] : undefined;
  if (shape.kind === "box" && !(shape.radius && shape.radius > 0)) {
    return JSON.stringify({ kind: "box", taper, deform, size });
  }
  if (shape.kind === "cylinder" || shape.kind === "ellipse") {
    return JSON.stringify({ kind: shape.kind, sides: polygonSidesForShape(shape), segments: shape.segments, taper, deform, size });
  }
  if (shape.kind === "polygon") {
    return JSON.stringify({ kind: "polygon", sides: shape.sides, segments: shape.segments, taper, deform, size });
  }
  if (shape.kind === "sphere") {
    return JSON.stringify({ kind: "sphere", steps: shape.steps, taper, deform, size });
  }

  return JSON.stringify({
    kind: shape.kind,
    geometryRevision: shape.kind === "pyramid" ? 2 : undefined,
    width: shapeWidth(shape),
    depth: shapeDepth(shape),
    height: shape.height,
    radius: shape.radius,
    steps: shape.steps,
    sides: shape.sides,
    bevel: shape.bevel,
    segments: shape.segments,
    topRadius: shape.topRadius,
    baseRadius: shape.baseRadius,
    topWidth: shape.topWidth,
    topDepth: shape.topDepth,
    taperTopWidth: shape.taperTopWidth,
    taperTopDepth: shape.taperTopDepth,
    taperBottomWidth: shape.taperBottomWidth,
    taperBottomDepth: shape.taperBottomDepth,
    taperTopScale: shape.taperTopScale,
    taperBottomScale: shape.taperBottomScale,
    extrudeTwist: shape.extrudeTwist,
    extrudeTopOffsetX: shape.extrudeTopOffsetX,
    extrudeTopOffsetZ: shape.extrudeTopOffsetZ,
    teeth: shape.teeth,
    toothSize: shape.toothSize,
    toothWidth: shape.toothWidth,
    centerHoleSize: shape.centerHoleSize,
    gearType: shape.gearType,
    gearRim: shape.gearRim,
    helixAngle: shape.helixAngle,
    threadRole: shape.threadRole,
    threadHead: shape.threadHead,
    threadHand: shape.threadHand,
    threadProfile: shape.threadProfile,
    threadDiameter: shape.threadDiameter,
    threadPitch: shape.threadPitch,
    threadClearance: shape.threadClearance,
    threadBoltClearance: shape.threadBoltClearance,
    threadQuality: shape.threadQuality,
    threadHeadHeight: shape.threadHeadHeight,
    threadChamfer: shape.threadChamfer,
    threadHeadChamfer: shape.threadHeadChamfer,
    springTurns: shape.springTurns,
    springWire: shape.springWire,
    springHand: shape.springHand,
    springQuality: shape.springQuality,
    helixQuality: shape.helixQuality,
    gearProfile: shape.gearProfile,
    gearPressureAngle: shape.gearPressureAngle,
    gearBacklash: shape.gearBacklash,
    starPoints: shape.starPoints,
    starInnerSize: shape.starInnerSize,
    starOuterFillet: shape.starOuterFillet,
    starInnerFillet: shape.starInnerFillet,
    starQuality: shape.starQuality,
    heartTipFillet: shape.heartTipFillet,
    heartQuality: shape.heartQuality,
    crescentThickness: shape.crescentThickness,
    crescentTipFillet: shape.crescentTipFillet,
    crescentQuality: shape.crescentQuality,
    honeycombCellSize: shape.honeycombCellSize,
    honeycombWallThickness: shape.honeycombWallThickness,
    honeycombFrameWidth: shape.honeycombFrameWidth,
    hingeKnuckles: shape.hingeKnuckles,
    hingePinDiameter: shape.hingePinDiameter,
    hingeLeafThickness: shape.hingeLeafThickness,
    hingeClearance: shape.hingeClearance,
    knurlPattern: shape.knurlPattern,
    knurlCount: shape.knurlCount,
    knurlDepth: shape.knurlDepth,
    knurlAngle: shape.knurlAngle,
    knurlChamfer: shape.knurlChamfer,
    dovetailNeckWidth: shape.dovetailNeckWidth,
    dovetailClearance: shape.dovetailClearance,
    loftBottomOutline: shape.loftBottomOutline,
    loftTopOutline: shape.loftTopOutline,
    loftBottomWidth: shape.loftBottomWidth,
    loftBottomDepth: shape.loftBottomDepth,
    loftTopWidth: shape.loftTopWidth,
    loftTopDepth: shape.loftTopDepth,
    loftBottomCorner: shape.loftBottomCorner,
    loftTopCorner: shape.loftTopCorner,
    loftBottomSides: shape.loftBottomSides,
    loftTopSides: shape.loftTopSides,
    loftOffsetX: shape.loftOffsetX,
    loftOffsetZ: shape.loftOffsetZ,
    loftWall: shape.loftWall,
    loftTwist: shape.loftTwist,
    slotEndRatio: shape.slotEndRatio,
    loftTiltX: shape.loftTiltX,
    loftTiltZ: shape.loftTiltZ,
    screwHoleShaft: shape.screwHoleShaft,
    screwHoleHeadDepth: shape.screwHoleHeadDepth,
    screwHoleAngle: shape.screwHoleAngle,
    // A dovetail cut-out grows by its clearance, so body and socket differ.
    dovetailHole: shape.kind === "dovetail" ? Boolean(shape.hole) : undefined,
    cornerFillet: shape.cornerFillet,
    topBottomFillet: shape.topBottomFillet,
    roundedBoxQuality: shape.roundedBoxQuality,
    bentTubeProfile: shape.bentTubeProfile,
    bentTubeInnerProfile: shape.bentTubeInnerProfile,
    bentTubeSize: shape.bentTubeSize,
    bentTubeWall: shape.bentTubeWall,
    bentTubeQuality: shape.bentTubeQuality,
    bentTubeSegments: shape.bentTubeSegments,
    text: shape.text,
    font: shape.font,
    // A font of one's own can gain letters (a design's few, then the whole file): draw again then.
    fontRevision: customFontRevision(shape.font),
    textStroke: shape.textStroke,
    textSilhouette: shape.textSilhouette,
    textKeyring: shape.textKeyring,
    // A fill is built by the 2D kernel; until it has loaded the text is drawn plain (#215).
    fillKernel: shape.textStroke || shape.textSilhouette || shape.textKeyring ? manifoldRevision() : undefined,
    textCurved: shape.textCurved,
    textRadius: shape.textRadius,
    textSize: shape.textSize,
    textInward: shape.textInward,
    textFlipped: shape.textFlipped,
  });
}

function tapeAttachmentWorld(state: ThreeState, attachment: TapeAttachment) {
  const object = findShapeObject(state, attachment.shapeId);
  if (!object) return null;
  const dimensions = tapeShapeDimensions(object);
  return object.localToWorld(new THREE.Vector3(
    attachment.normalized[0] * dimensions[0],
    attachment.normalized[1] * dimensions[1],
    attachment.normalized[2] * dimensions[2],
  ));
}

function tapeAttachmentFromWorld(state: ThreeState, shapeId: string, world: THREE.Vector3, kind: TapeAttachment["kind"] = "surface"): TapeAttachment | null {
  const object = findShapeObject(state, shapeId);
  if (!object) return null;
  const dimensions = tapeShapeDimensions(object);
  const local = object.worldToLocal(world.clone());
  return {
    shapeId,
    kind,
    topologyKey: object.userData.tapeTopologyKey as string | undefined,
    normalized: [
      local.x / Math.max(0.001, dimensions[0]),
      local.y / Math.max(0.001, dimensions[1]),
      local.z / Math.max(0.001, dimensions[2]),
    ],
  };
}

function tapePointWorld(state: ThreeState, point: Pick<TapePoint, "x" | "y" | "z" | "attachment">) {
  return point.attachment ? tapeAttachmentWorld(state, point.attachment) ?? new THREE.Vector3(point.x, point.y, point.z) : new THREE.Vector3(point.x, point.y, point.z);
}

function tapeEdgeWorldPoints(state: ThreeState, edge: TapeEdgeAttachment) {
  return edge.normalizedPoints.flatMap((normalized) => {
    const world = tapeAttachmentWorld(state, { shapeId: edge.shapeId, normalized });
    return world ? [world] : [];
  });
}

function tapePolylineLength(points: THREE.Vector3[]) {
  let length = 0;
  for (let index = 0; index + 1 < points.length; index += 1) length += points[index].distanceTo(points[index + 1]);
  return length;
}

function tapePolylineMidpoint(points: THREE.Vector3[]) {
  if (points.length === 0) return new THREE.Vector3();
  const half = tapePolylineLength(points) / 2;
  let traversed = 0;
  for (let index = 0; index + 1 < points.length; index += 1) {
    const length = points[index].distanceTo(points[index + 1]);
    if (traversed + length >= half && length > 1e-9) return points[index].clone().lerp(points[index + 1], (half - traversed) / length);
    traversed += length;
  }
  return points[points.length - 1].clone();
}

function tapeScreenPointList(points: THREE.Vector3[], state: ThreeState) {
  return points.map((point) => {
    const screen = projectToScreen(point, state);
    return `${screen.x},${screen.y}`;
  }).join(" ");
}

function chainTapeLineSegments(segments: Array<[THREE.Vector3, THREE.Vector3]>) {
  if (segments.length <= 1) return segments.map(([a, b]) => [a, b]);
  const bounds = new THREE.Box3();
  segments.forEach(([a, b]) => {
    bounds.expandByPoint(a);
    bounds.expandByPoint(b);
  });
  const tolerance = Math.max(1e-6, bounds.getSize(new THREE.Vector3()).length() * 1e-5);
  const tangentLimit = Math.cos(THREE.MathUtils.degToRad(20));
  const unused = new Set(segments.map((_, index) => index));
  const paths: THREE.Vector3[][] = [];

  while (unused.size > 0) {
    const firstIndex = unused.values().next().value as number;
    unused.delete(firstIndex);
    const path = [segments[firstIndex][0].clone(), segments[firstIndex][1].clone()];
    let extended = true;
    while (extended) {
      extended = false;
      for (const index of unused) {
        const [a, b] = segments[index];
        const end = path[path.length - 1];
        const endDirection = end.clone().sub(path[path.length - 2]).normalize();
        const endOther = a.distanceTo(end) <= tolerance ? b : b.distanceTo(end) <= tolerance ? a : null;
        if (endOther && Math.abs(endDirection.dot(endOther.clone().sub(end).normalize())) >= tangentLimit) {
          path.push(endOther.clone());
          unused.delete(index);
          extended = true;
          break;
        }
        const start = path[0];
        const startDirection = start.clone().sub(path[1]).normalize();
        const startOther = a.distanceTo(start) <= tolerance ? b : b.distanceTo(start) <= tolerance ? a : null;
        if (startOther && Math.abs(startDirection.dot(startOther.clone().sub(start).normalize())) >= tangentLimit) {
          path.unshift(startOther.clone());
          unused.delete(index);
          extended = true;
          break;
        }
      }
    }
    paths.push(path);
  }
  return paths;
}

function tapeNormalizedLineSegments(state: ThreeState, shapeId: string) {
  const object = findShapeObject(state, shapeId);
  if (!object) return [];
  object.updateWorldMatrix(true, true);
  const dimensions = tapeShapeDimensions(object);
  const normalizedFromWorld = (world: THREE.Vector3) => {
    const local = object.worldToLocal(world.clone());
    return new THREE.Vector3(
      local.x / Math.max(0.001, dimensions[0]),
      local.y / Math.max(0.001, dimensions[1]),
      local.z / Math.max(0.001, dimensions[2]),
    );
  };
  const segments: Array<[THREE.Vector3, THREE.Vector3]> = [];
  object.traverse((child) => {
    if (!(child instanceof THREE.Line) || !child.visible) return;
    const position = child.geometry.getAttribute("position");
    if (!position || position.count < 2) return;
    const points: THREE.Vector3[] = [];
    for (let index = 0; index < position.count; index += 1) {
      points.push(normalizedFromWorld(new THREE.Vector3().fromBufferAttribute(position, index).applyMatrix4(child.matrixWorld)));
    }
    if ((child as THREE.LineSegments).isLineSegments) {
      for (let index = 0; index + 1 < points.length; index += 2) segments.push([points[index], points[index + 1]]);
    } else {
      for (let index = 0; index + 1 < points.length; index += 1) segments.push([points[index], points[index + 1]]);
      if ((child as THREE.LineLoop).isLineLoop && points.length > 2) segments.push([points[points.length - 1], points[0]]);
    }
  });
  return segments;
}

function tapePointToSegmentDistance(point: THREE.Vector3, start: THREE.Vector3, end: THREE.Vector3) {
  const delta = end.clone().sub(start);
  const lengthSq = delta.lengthSq();
  const amount = lengthSq > 1e-12 ? clamp(point.clone().sub(start).dot(delta) / lengthSq, 0, 1) : 0;
  return point.distanceTo(start.clone().addScaledVector(delta, amount));
}

function tapeAttachmentMatchesTopology(state: ThreeState, attachment: TapeAttachment) {
  const object = findShapeObject(state, attachment.shapeId);
  if (!object) return false;
  const currentTopologyKey = object.userData.tapeTopologyKey as string | undefined;
  if (!attachment.topologyKey || attachment.topologyKey === currentTopologyKey || attachment.kind === "surface") return true;
  const target = new THREE.Vector3(...attachment.normalized);
  const segments = tapeNormalizedLineSegments(state, attachment.shapeId);
  if (attachment.kind === "vertex") {
    return segments.some(([start, end]) => start.distanceTo(target) <= 0.002 || end.distanceTo(target) <= 0.002);
  }
  return segments.some(([start, end]) => tapePointToSegmentDistance(target, start, end) <= 0.002);
}

function tapeEdgeMatchesTopology(state: ThreeState, edge: TapeEdgeAttachment) {
  const object = findShapeObject(state, edge.shapeId);
  if (!object) return false;
  const currentTopologyKey = object.userData.tapeTopologyKey as string | undefined;
  if (!edge.topologyKey || edge.topologyKey === currentTopologyKey) return true;
  const segments = tapeNormalizedLineSegments(state, edge.shapeId);
  if (segments.length === 0) return false;
  const samples = edge.normalizedPoints.filter((_, index) => (
    index === 0
    || index === edge.normalizedPoints.length - 1
    || index % Math.max(1, Math.floor(edge.normalizedPoints.length / 8)) === 0
  ));
  return samples.every((point) => {
    const target = new THREE.Vector3(...point);
    return segments.some(([start, end]) => tapePointToSegmentDistance(target, start, end) <= 0.002);
  });
}

function pickModelTapeCandidate(state: ThreeState, shapeIds: string[], clientX: number, clientY: number): TapeCandidate | null {
  const rect = state.renderer.domElement.getBoundingClientRect();
  const pointerX = clientX - rect.left;
  const pointerY = clientY - rect.top;
  const targets = shapeIds.flatMap((id) => {
    const object = findShapeObject(state, id);
    return object ? [object] : [];
  });
  if (targets.length === 0) return null;

  state.camera.updateMatrixWorld();
  targets.forEach((target) => target.updateWorldMatrix(true, true));
  const vertexCandidates: Array<{ distance: number; candidate: TapeCandidate }> = [];
  const edgeCandidates: Array<{ distance: number; candidate: TapeCandidate }> = [];

  targets.forEach((target) => {
    const shapeId = target.userData.shapeId as string;
    target.traverse((child) => {
      if (!(child instanceof THREE.Line) || !child.visible) return;
      const position = child.geometry.getAttribute("position");
      if (!position || position.count < 2) return;
      const paths: THREE.Vector3[][] = [];
      if ((child as THREE.LineSegments).isLineSegments) {
        const segments: Array<[THREE.Vector3, THREE.Vector3]> = [];
        for (let index = 0; index + 1 < position.count; index += 2) {
          segments.push([
            new THREE.Vector3().fromBufferAttribute(position, index).applyMatrix4(child.matrixWorld),
            new THREE.Vector3().fromBufferAttribute(position, index + 1).applyMatrix4(child.matrixWorld),
          ]);
        }
        paths.push(...chainTapeLineSegments(segments));
      } else {
        const path: THREE.Vector3[] = [];
        for (let index = 0; index < position.count; index += 1) path.push(new THREE.Vector3().fromBufferAttribute(position, index).applyMatrix4(child.matrixWorld));
        if ((child as THREE.LineLoop).isLineLoop && path.length > 2) path.push(path[0].clone());
        paths.push(path);
      }

      paths.forEach((worldPoints, pathIndex) => {
        if (worldPoints.length < 2) return;
        const attachments = worldPoints.map((point) => tapeAttachmentFromWorld(state, shapeId, point, "edge"));
        if (attachments.some((attachment) => !attachment)) return;
        const normalizedPoints = attachments.map((attachment) => (attachment as TapeAttachment).normalized);
        const edge: TapeEdgeAttachment = {
          key: `${shapeId}:${child.uuid}:${pathIndex}`,
          shapeId,
          normalizedPoints,
          topologyKey: target.userData.tapeTopologyKey as string | undefined,
        };
        const endpointIndexes = worldPoints[0].distanceToSquared(worldPoints[worldPoints.length - 1]) < 1e-10 ? [0] : [0, worldPoints.length - 1];
        endpointIndexes.forEach((index) => {
          const screen = projectToScreen(worldPoints[index], state);
          const distance = Math.hypot(pointerX - screen.x, pointerY - screen.y);
          if (distance <= 9) {
            vertexCandidates.push({
              distance,
              candidate: {
                x: worldPoints[index].x,
                y: worldPoints[index].y,
                z: worldPoints[index].z,
                attachment: { ...(attachments[index] as TapeAttachment), kind: "vertex" },
              },
            });
          }
        });

        for (let index = 0; index + 1 < worldPoints.length; index += 1) {
          const aScreen = projectToScreen(worldPoints[index], state);
          const bScreen = projectToScreen(worldPoints[index + 1], state);
          const dx = bScreen.x - aScreen.x;
          const dy = bScreen.y - aScreen.y;
          const amount = dx * dx + dy * dy > 0.001 ? clamp(((pointerX - aScreen.x) * dx + (pointerY - aScreen.y) * dy) / (dx * dx + dy * dy), 0, 1) : 0;
          const distance = Math.hypot(pointerX - (aScreen.x + dx * amount), pointerY - (aScreen.y + dy * amount));
          if (distance <= 12) {
            const world = worldPoints[index].clone().lerp(worldPoints[index + 1], amount);
            const normalizedA = normalizedPoints[index];
            const normalizedB = normalizedPoints[index + 1];
            edgeCandidates.push({
              distance,
              candidate: {
                x: world.x,
                y: world.y,
                z: world.z,
                attachment: {
                  shapeId,
                  kind: "edge",
                  topologyKey: target.userData.tapeTopologyKey as string | undefined,
                  normalized: [
                    normalizedA[0] + (normalizedB[0] - normalizedA[0]) * amount,
                    normalizedA[1] + (normalizedB[1] - normalizedA[1]) * amount,
                    normalizedA[2] + (normalizedB[2] - normalizedA[2]) * amount,
                  ],
                },
                edge,
              },
            });
          }
        }
      });
    });
  });

  vertexCandidates.sort((a, b) => a.distance - b.distance);
  edgeCandidates.sort((a, b) => a.distance - b.distance);
  if (vertexCandidates[0]) return vertexCandidates[0].candidate;
  if (edgeCandidates[0]) return edgeCandidates[0].candidate;

  state.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  state.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  state.raycaster.setFromCamera(state.pointer, state.camera);
  state.raycaster.layers.set(RENDER_LAYER_SHAPES);
  const surfaceHit = state.raycaster.intersectObjects(targets, true).find((entry) => entry.object instanceof THREE.Mesh);
  if (!surfaceHit) return null;
  const shapeId = surfaceHit.object.userData.shapeId as string;
  const attachment = tapeAttachmentFromWorld(state, shapeId, surfaceHit.point);
  return attachment ? { x: surfaceHit.point.x, y: surfaceHit.point.y, z: surfaceHit.point.z, attachment } : null;
}

function distanceToScreenSegment(x: number, y: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  const amount = lengthSq > 0.0001 ? clamp(((x - ax) * dx + (y - ay) * dy) / lengthSq, 0, 1) : 0;
  return Math.hypot(x - (ax + dx * amount), y - (ay + dy * amount));
}

function projectCadPointToCanvas(point: THREE.Vector3, state: ThreeState, rect: DOMRect) {
  const projected = point.clone().project(state.camera);
  if (!Number.isFinite(projected.x) || !Number.isFinite(projected.y) || projected.z < -1 || projected.z > 1) {
    return null;
  }
  return {
    x: ((projected.x + 1) / 2) * rect.width,
    y: ((1 - projected.y) / 2) * rect.height,
  };
}

function pickModifierEdgeFromScreen(state: ThreeState, edges: CadModifierEdge[], clientX: number, clientY: number) {
  const rect = state.renderer.domElement.getBoundingClientRect();
  const pointerX = clientX - rect.left;
  const pointerY = clientY - rect.top;
  const pointA = new THREE.Vector3();
  const pointB = new THREE.Vector3();
  let nearestId: number | null = null;
  let nearestDistance = MODIFIER_EDGE_PICK_RADIUS_PX;
  state.camera.updateMatrixWorld();
  edges.forEach((edge) => {
    for (let index = 0; index + 5 < edge.points.length; index += 3) {
      pointA.set(edge.points[index], edge.points[index + 1], edge.points[index + 2]);
      pointB.set(edge.points[index + 3], edge.points[index + 4], edge.points[index + 5]);
      const a = projectCadPointToCanvas(pointA, state, rect);
      const b = projectCadPointToCanvas(pointB, state, rect);
      if (!a || !b) continue;
      const distance = distanceToScreenSegment(pointerX, pointerY, a.x, a.y, b.x, b.y);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestId = edge.id;
      }
    }
  });
  return nearestId;
}

function syncTapeOverlay(
  state: ThreeState,
  model: TapeModel,
  overlayRef: MutableRefObject<TapeOverlayState | null>,
  setOverlay: Dispatch<SetStateAction<TapeOverlayState | null>>,
  accuracy: MeasurementAccuracy,
) {
  const projectedPoints = new Map<string, { screenX: number; screenY: number }>();
  const points = model.points.map((point) => {
    const screen = projectToScreen(tapePointWorld(state, point), state);
    const projected = { screenX: screen.x, screenY: screen.y };
    projectedPoints.set(point.id, projected);
    return { ...point, ...projected };
  });
  const segments = model.segments.flatMap((segment) => {
    const start = model.points.find((point) => point.id === segment.startId);
    const end = model.points.find((point) => point.id === segment.endId);
    const startScreen = projectedPoints.get(segment.startId);
    const endScreen = projectedPoints.get(segment.endId);
    if (!start || !end || !startScreen || !endScreen) {
      return [];
    }
    const startWorld = tapePointWorld(state, start);
    const endWorld = tapePointWorld(state, end);
    const attachedEdgePoints = segment.edge ? tapeEdgeWorldPoints(state, segment.edge) : [];
    const worldPoints = attachedEdgePoints.length >= 2 ? attachedEdgePoints : [startWorld, endWorld];
    const labelScreen = projectToScreen(tapePolylineMidpoint(worldPoints), state);
    return [
      {
        ...segment,
        x1: startScreen.screenX,
        y1: startScreen.screenY,
        x2: endScreen.screenX,
        y2: endScreen.screenY,
        screenPoints: segment.edge && worldPoints.length >= 2 ? tapeScreenPointList(worldPoints, state) : undefined,
        labelX: labelScreen.x,
        labelY: labelScreen.y - 18,
        label: formatMeasure(tapePolylineLength(worldPoints), accuracy),
      },
    ];
  });
  const hoverWorld = model.hover ? tapePointWorld(state, model.hover) : null;
  const hoverScreen = hoverWorld ? projectToScreen(hoverWorld, state) : null;
  const hoverEdgePoints = model.hover?.edge ? tapeEdgeWorldPoints(state, model.hover.edge) : [];
  const next: TapeOverlayState = {
    points,
    segments,
    hover: hoverScreen ? {
      screenX: hoverScreen.x,
      screenY: hoverScreen.y,
      edgeScreenPoints: hoverEdgePoints.length >= 2 ? tapeScreenPointList(hoverEdgePoints, state) : undefined,
    } : null,
  };
  const previous = overlayRef.current;
  const unchanged =
    previous &&
    previous.points.length === next.points.length &&
    previous.segments.length === next.segments.length &&
    previous.points.every((point, index) => {
      const candidate = next.points[index];
      return point.id === candidate.id && Math.abs(point.screenX - candidate.screenX) < 0.2 && Math.abs(point.screenY - candidate.screenY) < 0.2;
    }) &&
    previous.segments.every((segment, index) => {
      const candidate = next.segments[index];
      return segment.id === candidate.id
        && segment.label === candidate.label
        && segment.screenPoints === candidate.screenPoints
        && Math.abs(segment.x1 - candidate.x1) < 0.2
        && Math.abs(segment.y1 - candidate.y1) < 0.2
        && Math.abs(segment.x2 - candidate.x2) < 0.2
        && Math.abs(segment.y2 - candidate.y2) < 0.2
        && Math.abs(segment.labelX - candidate.labelX) < 0.2
        && Math.abs(segment.labelY - candidate.labelY) < 0.2;
    }) &&
    ((!previous.hover && !next.hover) ||
      (previous.hover && next.hover
        && previous.hover.edgeScreenPoints === next.hover.edgeScreenPoints
        && Math.abs(previous.hover.screenX - next.hover.screenX) < 0.2
        && Math.abs(previous.hover.screenY - next.hover.screenY) < 0.2));
  if (!unchanged) {
    overlayRef.current = next;
    setOverlay(next);
  }
}

/**
 * Wo eine Notiz gerade steht. Eine angeheftete rechnet sich aus dem Koerper,
 * an dem sie haengt - dieselbe Rechnung wie beim Massband, damit sie beim
 * Verschieben, Drehen und Groessenaendern mitfaehrt. Ist der Koerper nicht mehr
 * da, gilt die zuletzt bekannte Stelle.
 */
function noteWorldPosition(state: ThreeState, note: WorkplaneNote) {
  if (note.anchor) {
    const world = tapeAttachmentWorld(state, { shapeId: note.anchor.shapeId, normalized: note.anchor.normalized });
    if (world) return world;
  }
  return new THREE.Vector3(note.x, note.y, note.z);
}

/**
 * Die Nadeln auf den Bildschirm rechnen. Was hinter der Kamera liegt, bekommt
 * `behind` - dort ist die Projektion gespiegelt, und eine Nadel wuerde sonst auf
 * der falschen Seite auftauchen.
 */
function syncNoteOverlay(
  state: ThreeState,
  notes: WorkplaneNote[],
  visible: boolean,
  overlayRef: MutableRefObject<NoteOverlayState | null>,
  setOverlay: (overlay: NoteOverlayState | null) => void,
) {
  if (!visible || notes.length === 0) {
    if (overlayRef.current !== null) {
      overlayRef.current = null;
      setOverlay(null);
    }
    return;
  }
  const rect = state.renderer.domElement.getBoundingClientRect();
  state.camera.updateMatrixWorld();
  // Only notes are numbered; the reference points among them are not.
  let noteNumber = 0;
  const next: NoteOverlayState = {
    notes: notes.map((note) => {
      const projected = noteWorldPosition(state, note).project(state.camera);
      return {
        id: note.id,
        index: note.kind === "point" ? 0 : ++noteNumber,
        text: note.text,
        collapsed: Boolean(note.collapsed),
        attached: Boolean(note.anchor),
        point: note.kind === "point",
        x: note.x,
        y: note.y,
        z: note.z,
        screenX: ((projected.x + 1) / 2) * rect.width,
        screenY: ((1 - projected.y) / 2) * rect.height,
        behind: projected.z > 1,
        flipped: ((projected.x + 1) / 2) * rect.width + NOTE_CARD_REACH > rect.width,
      };
    }),
  };
  const previous = overlayRef.current;
  const unchanged = previous
    && previous.notes.length === next.notes.length
    && previous.notes.every((note, index) => {
      const candidate = next.notes[index];
      return note.id === candidate.id
        && note.index === candidate.index
        && note.text === candidate.text
        && note.collapsed === candidate.collapsed
        && note.attached === candidate.attached
        && note.point === candidate.point
        && note.x === candidate.x
        && note.y === candidate.y
        && note.z === candidate.z
        && note.behind === candidate.behind
        && note.flipped === candidate.flipped
        && Math.abs(note.screenX - candidate.screenX) < 0.2
        && Math.abs(note.screenY - candidate.screenY) < 0.2;
    });
  if (!unchanged) {
    overlayRef.current = next;
    setOverlay(next);
  }
}

/**
 * Eine Notiz ist so hoch wie das, was darin steht - eine Zeile bleibt eine
 * Zeile. Ohne das stuende unter jedem kurzen Satz ein leeres Feld, und der
 * Anfasser zum Kleinerziehen half nicht: Die Mindesthoehe war hoeher als eine
 * Zeile.
 */
function fitNoteHeight(area: HTMLTextAreaElement | null) {
  if (!area) return;
  area.style.height = "auto";
  // `scrollHeight` zaehlt den Innenabstand mit, den Rahmen nicht - und die
  // Hoehe hier ist ein Aussenmass. Ohne den Rahmen fehlen zwei Pixel, das Feld
  // laeuft ueber, und neben dem Text stuende ein Rollbalken, der ihn noch enger
  // umbricht.
  const frame = area.offsetHeight - area.clientHeight;
  area.style.height = `${Math.min(NOTE_TEXT_MAX_HEIGHT, area.scrollHeight + frame)}px`;
}

/**
 * Das Schreibfeld einer Notiz. Es misst sich nach jedem Wechsel des Textes neu -
 * auch wenn der von aussen kommt, etwa aus einem Rueckgaengig.
 */
function NoteText({
  value,
  focused,
  onChange,
  onFocus,
  onBlur,
}: {
  value: string;
  focused: boolean;
  onChange: (text: string) => void;
  onFocus: () => void;
  onBlur: () => void;
}) {
  const areaRef = useRef<HTMLTextAreaElement | null>(null);
  useLayoutEffect(() => {
    fitNoteHeight(areaRef.current);
  }, [value]);
  return (
    <textarea
      className="note-text"
      ref={areaRef}
      value={value}
      maxLength={NOTE_TEXT_LIMIT}
      rows={1}
      placeholder={t("note.placeholder")}
      autoFocus={focused}
      onFocus={onFocus}
      onBlur={onBlur}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

/** One coordinate of a reference point, typed in the workspace's unit; Enter or leaving the field applies it. */
function PointCoordinateField({ label, value, workspace, onCommit }: {
  label: string;
  value: number;
  workspace: WorkplaneWorkspaceSettings;
  onCommit: (millimeters: number) => void;
}) {
  const shown = formatMeasurementNumber(millimetersToDisplay(value, workspace), workspace.accuracy);
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    const parsed = parseMeasurementInput(draft ?? shown);
    if (Number.isFinite(parsed)) onCommit(displayToMillimeters(parsed, workspace));
    setDraft(null);
  };
  return (
    <label className="point-field">
      <span>{label}</span>
      <input
        type="text"
        inputMode="decimal"
        value={draft ?? shown}
        onFocus={(event) => {
          setDraft(shown);
          event.currentTarget.select();
        }}
        onChange={(event) => setDraft(event.currentTarget.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.stopPropagation();
            event.currentTarget.blur();
          } else if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            setDraft(null);
            event.currentTarget.blur();
          }
        }}
      />
      <small>{lengthDisplayUnit(workspace).label}</small>
    </label>
  );
}

/**
 * Die Notizen ueber der Leinwand. Sie sind bewusst HTML und keine Textur in der
 * Szene: So bleibt die Schrift bei jeder Zoomstufe scharf, laesst sich markieren
 * und kopieren, und das Ausblenden kostet nichts.
 */
function NoteOverlay({
  overlay,
  editingId,
  onPinPointerDown,
  onPinPointerMove,
  onPinPointerUp,
  onToggle,
  onTextChange,
  onTextCommit,
  onDetach,
  onRemove,
  onEditingIdChange,
  workspace,
  onPointChange,
  pointCardOffset,
  onPointCardOffsetChange,
}: {
  overlay: NoteOverlayState;
  pointCardOffset: PointCardOffset;
  onPointCardOffsetChange: (offset: PointCardOffset, final: boolean) => void;
  workspace: WorkplaneWorkspaceSettings;
  onPointChange: (noteId: string, patch: { x?: number; y?: number; z?: number }) => void;
  editingId: string | null;
  onPinPointerDown: (event: ReactPointerEvent<HTMLButtonElement>, noteId: string) => void;
  onPinPointerMove: (event: ReactPointerEvent<HTMLButtonElement>, noteId: string) => void;
  onPinPointerUp: (event: ReactPointerEvent<HTMLButtonElement>, noteId: string) => void;
  onToggle: (noteId: string) => void;
  onTextChange: (noteId: string, text: string) => void;
  onTextCommit: (noteId: string) => void;
  onDetach: (noteId: string) => void;
  onRemove: (noteId: string) => void;
  onEditingIdChange: (noteId: string | null) => void;
}) {
  const pointCardDrag = useRef<{ pointerId: number; startX: number; startY: number; origin: PointCardOffset } | null>(null);
  return (
    <div className="note-overlay" aria-label={t("editor.tool.note")}>
      {overlay.notes.map((note) => {
        if (note.behind) return null;
        const open = !note.collapsed;
        return (
          <div
            key={note.id}
            className={`note-pin-anchor ${open ? "open" : ""} ${note.flipped ? "flipped" : ""}`}
            style={{ left: note.screenX, top: note.screenY }}
          >
            <button
              type="button"
              className={`note-pin ${note.attached ? "attached" : ""} ${note.point ? "point-pin" : ""}`}
              title={note.point ? t("point.move") : t("note.move")}
              aria-label={note.point ? t("point.title") : `${t("editor.tool.note")} ${note.index}`}
              onPointerDown={(event) => onPinPointerDown(event, note.id)}
              onPointerMove={(event) => onPinPointerMove(event, note.id)}
              onPointerUp={(event) => onPinPointerUp(event, note.id)}
              onClick={() => onToggle(note.id)}
            >
              {note.point ? <Crosshair size={15} strokeWidth={2.6} aria-hidden="true" /> : note.index}
            </button>
            {open && note.point ? (
              <div
                className="note-card point-card"
                style={{ transform: `translate(${pointCardOffset.x}px, ${pointCardOffset.y}px)` }}
                onPointerDown={(event) => event.stopPropagation()}
              >
                <strong
                  className="point-card-handle"
                  title={t("panel.moveHint")}
                  onPointerDown={(event) => {
                    capturePointer(event.currentTarget, event.pointerId);
                    pointCardDrag.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, origin: pointCardOffset };
                  }}
                  onPointerMove={(event) => {
                    const drag = pointCardDrag.current;
                    if (!drag || drag.pointerId !== event.pointerId) return;
                    onPointCardOffsetChange({ x: drag.origin.x + event.clientX - drag.startX, y: drag.origin.y + event.clientY - drag.startY }, false);
                  }}
                  onPointerUp={(event) => {
                    const drag = pointCardDrag.current;
                    if (!drag || drag.pointerId !== event.pointerId) return;
                    pointCardDrag.current = null;
                    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
                    onPointCardOffsetChange({ x: drag.origin.x + event.clientX - drag.startX, y: drag.origin.y + event.clientY - drag.startY }, true);
                  }}
                  onDoubleClick={() => onPointCardOffsetChange({ x: 0, y: 0 }, true)}
                >
                  {t("point.title")}
                </strong>
                <PointCoordinateField label={t("prop.positionX")} value={note.x} workspace={workspace} onCommit={(x) => onPointChange(note.id, { x })} />
                <PointCoordinateField label={t("prop.positionY")} value={displayY(note.z)} workspace={workspace} onCommit={(y) => onPointChange(note.id, { z: insideZ(y) })} />
                <PointCoordinateField label={t("prop.positionZ")} value={note.y} workspace={workspace} onCommit={(y) => onPointChange(note.id, { y })} />
                <div className="note-card-actions">
                  <span className="note-hint">{t("point.hint")}</span>
                  <span className="note-card-end">
                    <GuideHelpLink section="referencePoints" className="note-help-link" iconSize={16} />
                    <button type="button" className="note-action danger" onClick={() => onRemove(note.id)}>{t("common.delete")}</button>
                  </span>
                </div>
              </div>
            ) : open ? (
              <div className="note-card" onPointerDown={(event) => event.stopPropagation()}>
                <NoteText
                  value={note.text}
                  focused={editingId === note.id}
                  onFocus={() => onEditingIdChange(note.id)}
                  onBlur={() => {
                    onEditingIdChange(null);
                    onTextCommit(note.id);
                  }}
                  onChange={(text) => onTextChange(note.id, text)}
                />
                <div className="note-card-actions">
                  {note.attached ? (
                    <button type="button" className="note-action" onClick={() => onDetach(note.id)}>{t("note.detach")}</button>
                  ) : <span className="note-hint">{t("note.free")}</span>}
                  <span className="note-card-end">
                    <GuideHelpLink section="notes" className="note-help-link" iconSize={16} />
                    <button type="button" className="note-action danger" onClick={() => onRemove(note.id)}>{t("common.delete")}</button>
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

type SectionMeasureModel = {
  axis: SectionPlaneAxis;
  offset: number;
  loops: SectionLoop[];
  a: SectionPoint | null;
  b: SectionPoint | null;
  hover: SectionSnap | null;
};

const EMPTY_SECTION_MEASURE: SectionMeasureModel = { axis: "x", offset: 0, loops: [], a: null, b: null, hover: null };

type SectionMeasureOverlayState = {
  signature: string;
  outlines: string[];
  a: { x: number; y: number } | null;
  b: { x: number; y: number } | null;
  hover: { x: number; y: number; kind: SectionSnap["kind"] } | null;
  label: { x: number; y: number; text: string } | null;
};

/** The parts of a measurement that lie in the cutting plane, named like the position fields. */
function sectionMeasureDeltas(result: ReturnType<typeof sectionMeasurement>, axis: SectionPlaneAxis, accuracy: MeasurementAccuracy) {
  const parts: Array<[string, number]> = axis === "x"
    ? [["Y", result.deltaDepth], ["Z", result.deltaHeight]]
    : axis === "y"
      ? [["X", result.deltaX], ["Y", result.deltaDepth]]
      : [["X", result.deltaX], ["Z", result.deltaHeight]];
  return parts.map(([name, value]) => `Δ${name} ${formatMeasure(Math.abs(value), accuracy)}`).join(" · ");
}

/** The cut's outlines and the measurement on screen; nothing in the scene itself. */
function syncSectionMeasureOverlay(
  state: ThreeState,
  active: boolean,
  model: SectionMeasureModel,
  overlayRef: MutableRefObject<SectionMeasureOverlayState | null>,
  setOverlay: Dispatch<SetStateAction<SectionMeasureOverlayState | null>>,
  accuracy: MeasurementAccuracy,
) {
  if (!active) {
    if (overlayRef.current) {
      overlayRef.current = null;
      setOverlay(null);
    }
    return;
  }
  const toScreen = (point: SectionPoint) => {
    const [x, y, z] = sectionPointToWorld(point, model.axis, model.offset);
    return projectToScreen(new THREE.Vector3(x, y, z), state);
  };
  const outlines = model.loops.map((loop) => {
    const screen = loop.points.map(toScreen);
    if (loop.closed && screen.length > 0) screen.push(screen[0]);
    return screen.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  });
  const a = model.a ? toScreen(model.a) : null;
  const b = model.b ? toScreen(model.b) : null;
  const hoverScreen = model.hover ? toScreen(model.hover.point) : null;
  const label = model.a && model.b && a && b
    ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 18, text: formatMeasure(sectionMeasurement(model.a, model.b, model.axis, model.offset).distance, accuracy) }
    : null;
  const next: SectionMeasureOverlayState = {
    signature: "",
    outlines,
    a,
    b,
    hover: hoverScreen && model.hover ? { ...hoverScreen, kind: model.hover.kind } : null,
    label,
  };
  next.signature = JSON.stringify([outlines.join("|").length, outlines[0]?.slice(0, 40), a, b, next.hover, label?.text, label?.x]);
  if (overlayRef.current?.signature === next.signature) return;
  overlayRef.current = next;
  setOverlay(next);
}

function SectionMeasureOverlay({ overlay }: { overlay: SectionMeasureOverlayState }) {
  return (
    <div className="section-measure-overlay" aria-hidden="true">
      <svg className="tape-guides" width="100%" height="100%">
        {overlay.outlines.map((points, index) => (
          <polyline key={index} className="section-measure-outline" points={points} fill="none" />
        ))}
        {overlay.a && overlay.b ? <line className="section-measure-line" x1={overlay.a.x} y1={overlay.a.y} x2={overlay.b.x} y2={overlay.b.y} /> : null}
        {overlay.a ? <circle className="section-measure-point" cx={overlay.a.x} cy={overlay.a.y} r="4.5" /> : null}
        {overlay.b ? <circle className="section-measure-point" cx={overlay.b.x} cy={overlay.b.y} r="4.5" /> : null}
        {overlay.hover ? (
          overlay.hover.kind === "perpendicular"
            ? <rect className="section-measure-hover square" x={overlay.hover.x - 5} y={overlay.hover.y - 5} width="10" height="10" />
            : <circle className={`section-measure-hover ${overlay.hover.kind}`} cx={overlay.hover.x} cy={overlay.hover.y} r="5" />
        ) : null}
      </svg>
      {overlay.label ? <span className="tape-label section-measure-label" style={{ left: overlay.label.x, top: overlay.label.y }}>{overlay.label.text}</span> : null}
    </div>
  );
}

function TapeOverlay({
  overlay,
  startPointId,
  active,
  deleteMode,
  moveMode,
  onPointPointerDown,
  onPointPointerMove,
  onPointPointerUp,
  onSegmentPointerDown,
}: {
  overlay: TapeOverlayState;
  startPointId: string | null;
  active: boolean;
  deleteMode: boolean;
  moveMode: boolean;
  onPointPointerDown: (event: ReactPointerEvent<SVGCircleElement>, pointId: string) => void;
  onPointPointerMove: (event: ReactPointerEvent<SVGCircleElement>, pointId: string) => void;
  onPointPointerUp: (event: ReactPointerEvent<SVGCircleElement>, pointId: string) => void;
  onSegmentPointerDown: (event: ReactPointerEvent<SVGElement>, segmentId: string) => void;
}) {
  return (
    <div className={`tape-overlay ${active ? "active" : ""} ${deleteMode ? "delete-mode" : ""} ${moveMode ? "move-mode" : ""}`} aria-label={t("aria.tapeMeasurements")}>
      <svg className="tape-guides" width="100%" height="100%" aria-hidden="true">
        {overlay.segments.map((segment) => (
          <g key={segment.id} className="tape-segment-group">
            {segment.screenPoints ? (
              <>
                <polyline className="tape-segment" points={segment.screenPoints} fill="none" />
                <polyline className="tape-segment-hit" points={segment.screenPoints} fill="none" onPointerDown={(event) => onSegmentPointerDown(event, segment.id)} />
              </>
            ) : (
              <>
                <line className="tape-segment" x1={segment.x1} y1={segment.y1} x2={segment.x2} y2={segment.y2} />
                <line
                  className="tape-segment-hit"
                  x1={segment.x1}
                  y1={segment.y1}
                  x2={segment.x2}
                  y2={segment.y2}
                  onPointerDown={(event) => onSegmentPointerDown(event, segment.id)}
                />
              </>
            )}
          </g>
        ))}
        {overlay.points.map((point) => (
          <circle
            key={point.id}
            className={`tape-point ${point.id === startPointId ? "pending" : ""}`}
            cx={point.screenX}
            cy={point.screenY}
            r="5"
            onPointerDown={(event) => onPointPointerDown(event, point.id)}
            onPointerMove={(event) => onPointPointerMove(event, point.id)}
            onPointerUp={(event) => onPointPointerUp(event, point.id)}
            onPointerCancel={(event) => onPointPointerUp(event, point.id)}
          />
        ))}
        {active && overlay.hover?.edgeScreenPoints ? <polyline className="tape-hover-edge" points={overlay.hover.edgeScreenPoints} fill="none" /> : null}
        {active && overlay.hover ? <circle className="tape-hover-point" cx={overlay.hover.screenX} cy={overlay.hover.screenY} r="5" /> : null}
      </svg>
      {overlay.segments.map((segment) => (
        <span key={`${segment.id}-label`} className="tape-label" style={{ left: segment.labelX, top: segment.labelY }}>
          {segment.label}
        </span>
      ))}
    </div>
  );
}

type RulerDimensionOverlayItem = {
  key: string;
  rulerId: string;
  shapeId: string;
  field: RulerDimensionField | null;
  value: number;
  label: string;
  labelX: number;
  labelY: number;
  handleX: number;
  handleY: number;
};

type RulerDimensionOverlayState = {
  items: RulerDimensionOverlayItem[];
};

/**
 * Wer neben einem Lineal steht, bekommt seine Ausdehnung entlang dessen Achse
 * eingeblendet - kein eigener Werkzeugmodus, das Lineal ist einfach ein
 * Koerper auf der Arbeitsflaeche. Rechnet ueber alle Lineale und alle anderen
 * Formen; bei der ueblichen Formenzahl ist das billig genug fuer jeden Sync.
 */
function syncRulerDimensionOverlay(
  state: ThreeState | null,
  shapes: WorkplaneShape[],
  overlayRef: MutableRefObject<RulerDimensionOverlayState | null>,
  setOverlay: Dispatch<SetStateAction<RulerDimensionOverlayState | null>>,
  accuracy: MeasurementAccuracy,
) {
  const items: RulerDimensionOverlayItem[] = [];
  if (state) {
    const rulers = shapes.filter((shape) => shape.kind === "ruler" && !shape.hidden);
    const topY = shapes.reduce((max, shape) => Math.max(max, (shape.elevation ?? 0) + shape.height), 0);
    rulers.forEach((ruler) => {
      const rulerPose = { x: ruler.x, z: ruler.z, rotation: ruler.rotation, length: shapeWidth(ruler), crossWidth: shapeDepth(ruler) };
      const axisAcross = new THREE.Vector3(0, 0, 1).applyQuaternion(quaternionForShape(ruler));
      shapes.forEach((candidate) => {
        if (candidate.id === ruler.id || isNonSolidShapeKind(candidate.kind) || candidate.hidden) return;
        const match = rulerDimensionMatch(rulerPose, {
          x: candidate.x,
          z: candidate.z,
          rotation: candidate.rotation,
          rotationX: candidate.rotationX,
          rotationZ: candidate.rotationZ,
          width: shapeWidth(candidate),
          height: candidate.height,
          depth: shapeDepth(candidate),
        });
        if (!match) return;
        const acrossSign = match.acrossOffset >= 0 ? 1 : -1;
        const labelAcross = acrossSign * (rulerPose.crossWidth / 2 + 16);
        const labelAlong = pointAlongRuler(rulerPose, match.alongOffset);
        const labelWorld = new THREE.Vector3(labelAlong.x + axisAcross.x * labelAcross, topY + 6, labelAlong.z + axisAcross.z * labelAcross);
        const handleAt = pointAlongRuler(rulerPose, match.alongOffset + match.extentAlong / 2);
        const handleWorld = new THREE.Vector3(handleAt.x, topY + 6, handleAt.z);
        const labelScreen = projectToScreen(labelWorld, state);
        const handleScreen = projectToScreen(handleWorld, state);
        items.push({
          key: `${ruler.id}:${candidate.id}`,
          rulerId: ruler.id,
          shapeId: candidate.id,
          field: match.alignedField,
          value: match.extentAlong,
          label: formatMeasure(match.extentAlong, accuracy),
          labelX: labelScreen.x,
          labelY: labelScreen.y,
          handleX: handleScreen.x,
          handleY: handleScreen.y,
        });
      });
    });
  }
  const previous = overlayRef.current;
  if (previous && previous.items.length === 0 && items.length === 0) {
    return;
  }
  const next = { items };
  overlayRef.current = next;
  setOverlay(next);
}

function RulerDimensionOverlay({
  overlay,
  onLabelClick,
  onHandlePointerDown,
  onHandlePointerMove,
  onHandlePointerUp,
}: {
  overlay: RulerDimensionOverlayState;
  onLabelClick: (item: RulerDimensionOverlayItem) => void;
  onHandlePointerDown: (event: ReactPointerEvent<HTMLButtonElement>, item: RulerDimensionOverlayItem) => void;
  onHandlePointerMove: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onHandlePointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => void;
}) {
  if (overlay.items.length === 0) {
    return null;
  }
  return (
    <div className="ruler-dimension-overlay" aria-label={t("aria.rulerDimensions")}>
      {overlay.items.map((item) => (
        <span key={item.key}>
          {item.field ? (
            <button
              type="button"
              className="ruler-dimension-label editable"
              style={{ left: item.labelX, top: item.labelY }}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => onLabelClick(item)}
            >
              {item.label}
            </button>
          ) : (
            <span className="ruler-dimension-label" style={{ left: item.labelX, top: item.labelY }}>
              {item.label}
            </span>
          )}
          <button
            type="button"
            className="ruler-duplicate-handle"
            aria-label={t("camera.duplicateAlongRuler")}
            title={t("camera.duplicateAlongRuler")}
            style={{ left: item.handleX, top: item.handleY }}
            onPointerDown={(event) => onHandlePointerDown(event, item)}
            onPointerMove={onHandlePointerMove}
            onPointerUp={onHandlePointerUp}
            onPointerCancel={onHandlePointerUp}
          >
            <Plus size={12} strokeWidth={3} aria-hidden="true" />
          </button>
        </span>
      ))}
    </div>
  );
}

/** Ein platziertes Winkellineal - reines Bildschirm-Werkzeug wie das Massband, kein Koerper, nicht gespeichert (siehe layerling-lineal.md). */
type CornerRulerInstance = {
  id: string;
  /** Die Ecke in Weltkoordinaten, immer in der Ebene von `workplane`. */
  corner: PlacementPoint;
  /** Die Arbeitsebene beim Ablegen - auf der Platte die Platte, sonst die Flaeche (#105). Ziehen bleibt in ihr. */
  workplane: PlacementWorkplane;
  /** Richtung der beiden Arme und der Hoehe; ein Klick auf den Griff dreht sie um die Normale. */
  frame: CornerRulerFrame;
  armLengthX: number;
  armLengthZ: number;
  mode?: CornerRulerMode;
};

/** So nah (in Bildpunkten) muss der Zeiger an einer Koerperecke sein, damit die Ecke des Winkellineals dort einrastet. */
const CORNER_RULER_SNAP_PX = 12;

type CornerRulerTickScreen = { x1: number; y1: number; x2: number; y2: number };
type CornerRulerLabelScreen = { x: number; y: number; text: string };
type CornerRulerNeighborLabel = { key: string; x: number; y: number; text: string };

type CornerRulerOverlayItem = {
  id: string;
  mode: CornerRulerMode;
  handleX: number;
  handleY: number;
  armXLine: { x1: number; y1: number; x2: number; y2: number };
  armZLine: { x1: number; y1: number; x2: number; y2: number };
  ticks: CornerRulerTickScreen[];
  labels: CornerRulerLabelScreen[];
  neighborLabels: CornerRulerNeighborLabel[];
  selectedCoordinate?: {
    shapeIds: string[];
    xValue: number;
    zValue: number;
    elevationValue: number;
    xLabel: { x: number; y: number; text: string };
    zLabel: { x: number; y: number; text: string };
    elevationLabel: { x: number; y: number; text: string };
    xArrowLine: { x1: number; y1: number; x2: number; y2: number };
    zArrowLine: { x1: number; y1: number; x2: number; y2: number };
    elevationArrowLine: { x1: number; y1: number; x2: number; y2: number };
    xGuideLine: { x1: number; y1: number; x2: number; y2: number };
    zGuideLine: { x1: number; y1: number; x2: number; y2: number };
  } | null;
};

type CornerRulerOverlayState = {
  items: CornerRulerOverlayItem[];
};

/** Bemassungslabel eines Nachbarn an einem Arm - reine Ablesung, kein Eintippen (siehe layerling-lineal.md). */
function cornerRulerNeighborLabel(
  key: string,
  armPose: { x: number; z: number; rotation: number; length: number; crossWidth: number },
  acrossAxis: THREE.Vector3,
  match: RulerDimensionMatch,
  topY: number,
  state: ThreeState,
  accuracy: MeasurementAccuracy,
): CornerRulerNeighborLabel {
  const acrossSign = match.acrossOffset >= 0 ? 1 : -1;
  const labelAcross = acrossSign * (CORNER_RULER_ARM_WIDTH / 2 + 16);
  const labelAlong = pointAlongRuler(armPose, match.alongOffset);
  const labelWorld = new THREE.Vector3(labelAlong.x + acrossAxis.x * labelAcross, topY + 6, labelAlong.z + acrossAxis.z * labelAcross);
  const labelScreen = projectToScreen(labelWorld, state);
  return { key, x: labelScreen.x, y: labelScreen.y, text: formatMeasure(match.extentAlong, accuracy) };
}

/**
 * Projiziert jede platzierte Winkellineal-Instanz auf den Bildschirm: die
 * Ecke, die beiden Arm-Endpunkte, jeden Teilstrich (`cornerRulerTicks`),
 * die relative Bemaßung des ausgewählten Körpers (wie in Tinkercad) sowie
 * die automatische Bemaßung weiterer Formen am Lineal.
 * Reine Bildschirm-Darstellung wie beim Massband - kein Three.js-Objekt.
 */
function syncCornerRulerToolOverlay(
  state: ThreeState | null,
  rulers: CornerRulerInstance[],
  shapes: WorkplaneShape[],
  selectedIds: string[],
  overlayRef: MutableRefObject<CornerRulerOverlayState | null>,
  setOverlay: Dispatch<SetStateAction<CornerRulerOverlayState | null>>,
  accuracy: MeasurementAccuracy,
) {
  const items: CornerRulerOverlayItem[] = [];
  if (state) {
    const topY = shapes.reduce((max, shape) => Math.max(max, (shape.elevation ?? 0) + shape.height), 0);
    // Mehrere markierte Koerper zaehlen zusammen wie einer: gemessen wird
    // ihre gemeinsame Umrissbox, wie beim Abstand zum Nullpunkt.
    const wanted = new Set(selectedIds);
    const selectedShapes = shapes.filter((s) => wanted.has(s.id) && !s.hidden && !isNonSolidShapeKind(s.kind));

    rulers.forEach((ruler) => {
      const armWidth = CORNER_RULER_ARM_WIDTH;
      const mode: CornerRulerMode = ruler.mode ?? "endpoint";
      const xAxis = new THREE.Vector3(ruler.frame.xAxis.x, ruler.frame.xAxis.y, ruler.frame.xAxis.z).normalize();
      const zAxis = new THREE.Vector3(ruler.frame.zAxis.x, ruler.frame.zAxis.y, ruler.frame.zAxis.z).normalize();
      const yAxis = new THREE.Vector3(ruler.frame.normal.x, ruler.frame.normal.y, ruler.frame.normal.z).normalize();
      const corner = new THREE.Vector3(ruler.corner.x, ruler.corner.y, ruler.corner.z);

      const handleScreen = projectToScreen(corner, state);
      const armXEndScreen = projectToScreen(corner.clone().addScaledVector(xAxis, ruler.armLengthX), state);
      const armZEndScreen = projectToScreen(corner.clone().addScaledVector(zAxis, ruler.armLengthZ), state);

      const ticks: CornerRulerTickScreen[] = [];
      const labels: CornerRulerLabelScreen[] = [];
      const buildTicks = (axisDir: THREE.Vector3, acrossDir: THREE.Vector3, length: number) => {
        cornerRulerTicks(length).forEach((tick) => {
          const base = corner.clone().addScaledVector(axisDir, tick.offset);
          const tickHeight = armWidth * (tick.isTen ? 0.62 : tick.isFive ? 0.42 : 0.26);
          const baseScreen = projectToScreen(base, state);
          const tipScreen = projectToScreen(base.clone().addScaledVector(acrossDir, tickHeight), state);
          ticks.push({ x1: baseScreen.x, y1: baseScreen.y, x2: tipScreen.x, y2: tipScreen.y });
          if (tick.isTen && tick.offset > 0) {
            const labelScreen = projectToScreen(base.clone().addScaledVector(acrossDir, armWidth * 0.95), state);
            labels.push({ x: labelScreen.x, y: labelScreen.y, text: String(tick.offset) });
          }
        });
      };
      // Die Teilstriche zeigen nach aussen (weg vom jeweils anderen Arm),
      // wie bei Tinkercad - nicht in die Ecke hinein, wo sonst platzierte
      // Formen sitzen wuerden.
      buildTicks(xAxis, zAxis.clone().negate(), ruler.armLengthX);
      buildTicks(zAxis, xAxis.clone().negate(), ruler.armLengthZ);

      let selectedCoordinate: CornerRulerOverlayItem["selectedCoordinate"] = null;
      if (selectedShapes.length) {
        const bounds = projectShapesExtent(selectedShapes, xAxis, yAxis, zAxis, corner);
        const coords = computeCornerRulerRelativeCoordinates({
          rulerCorner: ruler.corner,
          rulerRotation: 0,
          frame: ruler.frame,
          mode,
          bounds,
        });

        const xEndScreen = projectToScreen(new THREE.Vector3(coords.xEndpointOnAxis.x, coords.xEndpointOnAxis.y, coords.xEndpointOnAxis.z), state);
        const zEndScreen = projectToScreen(new THREE.Vector3(coords.zEndpointOnAxis.x, coords.zEndpointOnAxis.y, coords.zEndpointOnAxis.z), state);
        const xTargetScreen = projectToScreen(new THREE.Vector3(coords.xTargetPoint.x, coords.xTargetPoint.y, coords.xTargetPoint.z), state);
        const zTargetScreen = projectToScreen(new THREE.Vector3(coords.zTargetPoint.x, coords.zTargetPoint.y, coords.zTargetPoint.z), state);
        const elevBaseScreen = projectToScreen(new THREE.Vector3(coords.elevationBasePoint.x, coords.elevationBasePoint.y, coords.elevationBasePoint.z), state);
        const elevTargetScreen = projectToScreen(new THREE.Vector3(coords.elevationTargetPoint.x, coords.elevationTargetPoint.y, coords.elevationTargetPoint.z), state);

        const dxX = xEndScreen.x - handleScreen.x;
        const dyX = xEndScreen.y - handleScreen.y;
        const lenX = Math.hypot(dxX, dyX) || 1;
        const normX = { x: -dyX / lenX, y: dxX / lenX };
        const sideX = normX.y >= 0 ? 1 : -1;
        const xLabelPos = {
          x: (handleScreen.x + xEndScreen.x) / 2 + normX.x * 22 * sideX,
          y: (handleScreen.y + xEndScreen.y) / 2 + normX.y * 22 * sideX,
        };

        const dxZ = zEndScreen.x - handleScreen.x;
        const dyZ = zEndScreen.y - handleScreen.y;
        const lenZ = Math.hypot(dxZ, dyZ) || 1;
        const normZ = { x: -dyZ / lenZ, y: dxZ / lenZ };
        const sideZ = normZ.x <= 0 ? 1 : -1;
        const zLabelPos = {
          x: (handleScreen.x + zEndScreen.x) / 2 + normZ.x * 22 * sideZ,
          y: (handleScreen.y + zEndScreen.y) / 2 + normZ.y * 22 * sideZ,
        };

        const elevationLabelPos = {
          x: (elevBaseScreen.x + elevTargetScreen.x) / 2 + 28,
          y: (elevBaseScreen.y + elevTargetScreen.y) / 2,
        };

        selectedCoordinate = {
          shapeIds: selectedShapes.map((shape) => shape.id),
          xValue: coords.x,
          zValue: coords.z,
          elevationValue: coords.elevation,
          xLabel: { x: xLabelPos.x, y: xLabelPos.y, text: formatMeasure(coords.x, accuracy) },
          zLabel: { x: zLabelPos.x, y: zLabelPos.y, text: formatMeasure(coords.z, accuracy) },
          elevationLabel: { x: elevationLabelPos.x, y: elevationLabelPos.y, text: formatMeasure(coords.elevation, accuracy) },
          xArrowLine: { x1: handleScreen.x, y1: handleScreen.y, x2: xEndScreen.x, y2: xEndScreen.y },
          zArrowLine: { x1: handleScreen.x, y1: handleScreen.y, x2: zEndScreen.x, y2: zEndScreen.y },
          elevationArrowLine: { x1: elevBaseScreen.x, y1: elevBaseScreen.y, x2: elevTargetScreen.x, y2: elevTargetScreen.y },
          xGuideLine: { x1: xEndScreen.x, y1: xEndScreen.y, x2: xTargetScreen.x, y2: xTargetScreen.y },
          zGuideLine: { x1: zEndScreen.x, y1: zEndScreen.y, x2: zTargetScreen.x, y2: zTargetScreen.y },
        };
      }

      const neighborLabels: CornerRulerNeighborLabel[] = [];
      // Die Masse der Formen an den Armen gibt es nur auf der Platte; auf einer
      // Flaeche zeigt das Winkellineal nur die Abstaende der Auswahl (#105).
      const flatRotation = cornerRulerFlatRotation(ruler.frame);
      shapes.forEach((candidate) => {
        if (flatRotation === null) return;
        if (isNonSolidShapeKind(candidate.kind) || candidate.hidden) return;
        if (wanted.has(candidate.id)) return;
        const { armX, armZ } = cornerRulerDimensionMatchesFromCorner(
          { x: ruler.corner.x, z: ruler.corner.z },
          flatRotation,
          ruler.armLengthX,
          ruler.armLengthZ,
          armWidth,
          {
            x: candidate.x,
            z: candidate.z,
            rotation: candidate.rotation,
            rotationX: candidate.rotationX,
            rotationZ: candidate.rotationZ,
            width: shapeWidth(candidate),
            height: candidate.height,
            depth: shapeDepth(candidate),
          },
        );
        if (armX) {
          neighborLabels.push(cornerRulerNeighborLabel(
            `${ruler.id}:${candidate.id}:x`,
            { x: ruler.corner.x, z: ruler.corner.z, rotation: flatRotation, length: ruler.armLengthX, crossWidth: armWidth },
            zAxis, armX, topY, state, accuracy,
          ));
        }
        if (armZ) {
          neighborLabels.push(cornerRulerNeighborLabel(
            `${ruler.id}:${candidate.id}:z`,
            { x: ruler.corner.x, z: ruler.corner.z, rotation: flatRotation + 90, length: ruler.armLengthZ, crossWidth: armWidth },
            xAxis, armZ, topY, state, accuracy,
          ));
        }
      });

      items.push({
        id: ruler.id,
        mode,
        handleX: handleScreen.x,
        handleY: handleScreen.y,
        armXLine: { x1: handleScreen.x, y1: handleScreen.y, x2: armXEndScreen.x, y2: armXEndScreen.y },
        armZLine: { x1: handleScreen.x, y1: handleScreen.y, x2: armZEndScreen.x, y2: armZEndScreen.y },
        ticks,
        labels,
        neighborLabels,
        selectedCoordinate,
      });
    });
  }
  const previous = overlayRef.current;
  if (previous && previous.items.length === 0 && items.length === 0) {
    return;
  }
  const next = { items };
  overlayRef.current = next;
  setOverlay(next);
}

function CornerRulerToolOverlay({
  overlay,
  onHandlePointerDown,
  onHandlePointerMove,
  onHandlePointerUp,
  onDelete,
  onToggleMode,
  onCoordinateClick,
}: {
  overlay: CornerRulerOverlayState;
  onHandlePointerDown: (event: ReactPointerEvent<SVGCircleElement>, id: string) => void;
  onHandlePointerMove: (event: ReactPointerEvent<SVGCircleElement>, id: string) => void;
  onHandlePointerUp: (event: ReactPointerEvent<SVGCircleElement>, id: string) => void;
  onDelete: (id: string) => void;
  onToggleMode: (id: string) => void;
  onCoordinateClick: (rulerId: string, shapeIds: string[], axis: "x" | "z" | "elevation", value: number, x: number, y: number) => void;
}) {
  if (overlay.items.length === 0) {
    return null;
  }
  return (
    <div className="corner-ruler-overlay" aria-label={t("aria.cornerRulerTool")}>
      <svg className="corner-ruler-guides" width="100%" height="100%" aria-hidden="true">
        {overlay.items.map((item) => (
          <g key={item.id} className="corner-ruler-group">
            <line className="corner-ruler-arm" x1={item.armXLine.x1} y1={item.armXLine.y1} x2={item.armXLine.x2} y2={item.armXLine.y2} />
            <line className="corner-ruler-arm" x1={item.armZLine.x1} y1={item.armZLine.y1} x2={item.armZLine.x2} y2={item.armZLine.y2} />
            {item.ticks.map((tick, index) => (
              <line key={index} className="corner-ruler-tick" x1={tick.x1} y1={tick.y1} x2={tick.x2} y2={tick.y2} />
            ))}
            {item.selectedCoordinate ? (
              <g className="ruler-coordinate-visuals">
                <line className="ruler-coordinate-arrow" x1={item.selectedCoordinate.xArrowLine.x1} y1={item.selectedCoordinate.xArrowLine.y1} x2={item.selectedCoordinate.xArrowLine.x2} y2={item.selectedCoordinate.xArrowLine.y2} />
                <line className="ruler-coordinate-arrow" x1={item.selectedCoordinate.zArrowLine.x1} y1={item.selectedCoordinate.zArrowLine.y1} x2={item.selectedCoordinate.zArrowLine.x2} y2={item.selectedCoordinate.zArrowLine.y2} />
                <line className="ruler-coordinate-arrow" x1={item.selectedCoordinate.elevationArrowLine.x1} y1={item.selectedCoordinate.elevationArrowLine.y1} x2={item.selectedCoordinate.elevationArrowLine.x2} y2={item.selectedCoordinate.elevationArrowLine.y2} />
                <line className="ruler-coordinate-guide" x1={item.selectedCoordinate.xGuideLine.x1} y1={item.selectedCoordinate.xGuideLine.y1} x2={item.selectedCoordinate.xGuideLine.x2} y2={item.selectedCoordinate.xGuideLine.y2} />
                <line className="ruler-coordinate-guide" x1={item.selectedCoordinate.zGuideLine.x1} y1={item.selectedCoordinate.zGuideLine.y1} x2={item.selectedCoordinate.zGuideLine.x2} y2={item.selectedCoordinate.zGuideLine.y2} />
              </g>
            ) : null}
            <circle
              className="corner-ruler-handle"
              cx={item.handleX}
              cy={item.handleY}
              r="6"
              onPointerDown={(event) => onHandlePointerDown(event, item.id)}
              onPointerMove={(event) => onHandlePointerMove(event, item.id)}
              onPointerUp={(event) => onHandlePointerUp(event, item.id)}
              onPointerCancel={(event) => onHandlePointerUp(event, item.id)}
            />
          </g>
        ))}
      </svg>
      {overlay.items.map((item) => (
        <span key={`${item.id}-labels`}>
          {item.labels.map((label, index) => (
            <span key={index} className="corner-ruler-tick-label" style={{ left: label.x, top: label.y }}>
              {label.text}
            </span>
          ))}
          {item.neighborLabels.map((label) => (
            <span key={label.key} className="ruler-dimension-label" style={{ left: label.x, top: label.y }}>
              {label.text}
            </span>
          ))}
          {item.selectedCoordinate ? (
            <>
              <button
                type="button"
                className="ruler-coordinate-badge"
                style={{ left: item.selectedCoordinate.xLabel.x, top: item.selectedCoordinate.xLabel.y }}
                aria-label={t("aria.rulerCoordinateX")}
                title={t("ruler.coordinate.x")}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => onCoordinateClick(item.id, item.selectedCoordinate!.shapeIds, "x", item.selectedCoordinate!.xValue, item.selectedCoordinate!.xLabel.x, item.selectedCoordinate!.xLabel.y)}
              >
                {item.selectedCoordinate.xLabel.text}
              </button>
              <button
                type="button"
                className="ruler-coordinate-badge"
                style={{ left: item.selectedCoordinate.zLabel.x, top: item.selectedCoordinate.zLabel.y }}
                aria-label={t("aria.rulerCoordinateZ")}
                title={t("ruler.coordinate.z")}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => onCoordinateClick(item.id, item.selectedCoordinate!.shapeIds, "z", item.selectedCoordinate!.zValue, item.selectedCoordinate!.zLabel.x, item.selectedCoordinate!.zLabel.y)}
              >
                {item.selectedCoordinate.zLabel.text}
              </button>
              <button
                type="button"
                className="ruler-coordinate-badge"
                style={{ left: item.selectedCoordinate.elevationLabel.x, top: item.selectedCoordinate.elevationLabel.y }}
                aria-label={t("aria.rulerCoordinateElevation")}
                title={t("ruler.coordinate.elevation")}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => onCoordinateClick(item.id, item.selectedCoordinate!.shapeIds, "elevation", item.selectedCoordinate!.elevationValue, item.selectedCoordinate!.elevationLabel.x, item.selectedCoordinate!.elevationLabel.y)}
              >
                {item.selectedCoordinate.elevationLabel.text}
              </button>
            </>
          ) : null}
          <button
            type="button"
            className="corner-ruler-mode-toggle"
            style={{ left: item.handleX - 16, top: item.handleY - 14 }}
            aria-label={t("aria.toggleCornerRulerMode")}
            title={item.mode === "midpoint" ? t("ruler.mode.midpoint") : t("ruler.mode.endpoint")}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => onToggleMode(item.id)}
          >
            {item.mode === "midpoint" ? (
              <Crosshair size={11} strokeWidth={2.5} aria-hidden="true" />
            ) : (
              <Rows3 size={11} strokeWidth={2.5} aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            className="corner-ruler-delete"
            style={{ left: item.handleX + 16, top: item.handleY - 14 }}
            aria-label={t("aria.deleteCornerRuler")}
            title={t("aria.deleteCornerRuler")}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => onDelete(item.id)}
          >
            <X size={10} strokeWidth={3} aria-hidden="true" />
          </button>
        </span>
      ))}
    </div>
  );
}

function syncOriginDimensionWorldLines(state: ThreeState, frame: OriginDimensionFrame | null, theme: ResolvedAppTheme) {
  const layer = state.originDimensionLayer;
  const signature = frame
    ? [frame.origin.x, frame.origin.y, frame.origin.z, frame.distanceX, frame.distanceZ, theme].join(":")
    : "";
  if (layer.userData.originDimensionSignature === signature) {
    return;
  }
  layer.userData.originDimensionSignature = signature;
  disposeChildren(layer);
  if (!frame || (frame.distanceX === null && frame.distanceZ === null)) {
    state.needsRender = true;
    return;
  }

  const origin = frame.origin;
  const solidColor = ORIGIN_DIMENSION_LINE_COLOR[theme];
  const solidPoints: number[] = [];

  const addSegment = (points: number[], start: THREE.Vector3, end: THREE.Vector3) => {
    points.push(start.x, start.y, start.z, end.x, end.y, end.z);
  };
  const addWideSegments = (points: number[], color: string, linewidth: number, opacity: number, renderOrder: number) => {
    if (points.length === 0) {
      return;
    }
    const geometry = new LineSegmentsGeometry();
    geometry.setPositions(points);
    const material = new LineMaterial({
      color,
      linewidth,
      worldUnits: false,
      transparent: true,
      opacity,
      depthTest: false,
      depthWrite: false,
      alphaToCoverage: false,
    });
    material.toneMapped = false;
    const rect = state.renderer.domElement.getBoundingClientRect();
    material.resolution.set(Math.max(1, rect.width), Math.max(1, rect.height));
    const lines = new LineSegments2(geometry, material);
    lines.renderOrder = renderOrder;
    lines.frustumCulled = false;
    setObjectRenderLayer(lines, RENDER_LAYER_HELPERS);
    layer.add(lines);
  };
  const addArrow = (endpoint: THREE.Vector3, direction: THREE.Vector3, magnitude: number) => {
    const arrowLength = Math.min(1.1, Math.max(0.26, magnitude * 0.5));
    const arrowWidth = arrowLength * 0.72;
    const base = endpoint.clone().addScaledVector(direction, -arrowLength);
    const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x).multiplyScalar(arrowWidth / 2);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([
        endpoint.x, endpoint.y, endpoint.z,
        base.x + perpendicular.x, base.y, base.z + perpendicular.z,
        base.x - perpendicular.x, base.y, base.z - perpendicular.z,
      ], 3),
    );
    const arrowMaterial = new THREE.MeshBasicMaterial({
      color: solidColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 1,
      depthTest: false,
      depthWrite: false,
    });
    arrowMaterial.toneMapped = false;
    const arrow = new THREE.Mesh(geometry, arrowMaterial);
    arrow.renderOrder = 1002;
    arrow.frustumCulled = false;
    setObjectRenderLayer(arrow, RENDER_LAYER_HELPERS);
    layer.add(arrow);
  };

  const addLeg = (endpoint: THREE.Vector3 | null) => {
    if (!endpoint) return;
    const delta = endpoint.clone().sub(origin);
    const length = delta.length();
    if (length < 1e-9) return;
    const direction = delta.multiplyScalar(1 / length);
    const overrun = Math.min(2, Math.max(0.5, length * 0.15));
    const start = origin.clone().addScaledVector(direction, -overrun);
    addSegment(solidPoints, start, endpoint);
    addArrow(endpoint, direction, length);
  };

  addLeg(frame.xEndpoint);
  addLeg(frame.zEndpoint);

  addWideSegments(solidPoints, solidColor, 1.45, 1, 1001);
  state.needsRender = true;
}

function syncOriginDimensionOverlay(
  state: ThreeState | null,
  shapes: WorkplaneShape[] | null,
  workplane: PlacementWorkplane,
  accuracy: MeasurementAccuracy,
  theme: ResolvedAppTheme,
  overlayRef: MutableRefObject<OriginDimensionOverlayData | null>,
  setOverlay: Dispatch<SetStateAction<OriginDimensionOverlayData | null>>,
) {
  if (!state) {
    return;
  }
  const frame = shapes?.length ? originFrameForShapes(shapes, workplane, accuracy) : null;
  syncOriginDimensionWorldLines(state, frame, theme);
  const rect = state.renderer.domElement.getBoundingClientRect();
  const next = frame && (frame.distanceX !== null || frame.distanceZ !== null)
    ? createOriginDimensionOverlay({
        originWorld: { x: frame.origin.x, y: frame.origin.y, z: frame.origin.z },
        xEndpointWorld: frame.xEndpoint ? { x: frame.xEndpoint.x, y: frame.xEndpoint.y, z: frame.xEndpoint.z } : null,
        zEndpointWorld: frame.zEndpoint ? { x: frame.zEndpoint.x, y: frame.zEndpoint.y, z: frame.zEndpoint.z } : null,
        distanceX: frame.distanceX,
        distanceZ: frame.distanceZ,
        accuracy,
        width: rect.width,
        height: rect.height,
        project: ({ x, y, z }) => projectToScreen(new THREE.Vector3(x, y, z), state),
      })
    : null;
  if (JSON.stringify(overlayRef.current) === JSON.stringify(next)) {
    return;
  }
  overlayRef.current = next;
  setOverlay(next);
}

function shapeCenter(shape: WorkplaneShape) {
  return new THREE.Vector3(shape.x, (shape.elevation ?? 0) + shape.height / 2, shape.z);
}

function shapeLocalExtents(shape: WorkplaneShape) {
  const footprint = shapeOverallFootprintDimensions(shape);
  return {
    x: footprint.width / 2,
    y: shape.height / 2,
    z: footprint.depth / 2,
  };
}

type AxisProjectionBounds = {
  min: THREE.Vector3;
  max: THREE.Vector3;
};

// Walking every vertex of an imported mesh is too slow to do on each pointer
// move, and a drag hands in a fresh copy of the shape for every move. Moving a
// shape only shifts its bounds, so they are kept per mesh, measured from the
// shape's centre, for as long as nothing but the position changes.
// Copies of a shape share one mesh, hence a short list per mesh.
const importedShapeProjectionBoundsCache = new WeakMap<object, Array<{ shape: WorkplaneShape; byAxis: Map<string, AxisProjectionBounds> }>>();
const MAX_PROJECTION_BOUNDS_PER_MESH = 16;

function sameShapeApartFromPosition(a: WorkplaneShape, b: WorkplaneShape) {
  if (a === b) return true;
  const left = a as unknown as Record<string, unknown>;
  const right = b as unknown as Record<string, unknown>;
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  for (const key of keys) {
    if (key === "x" || key === "z" || key === "elevation") continue;
    if (left[key] !== right[key]) return false;
  }
  return true;
}

function importedShapeProjectionBounds(
  shape: WorkplaneShape,
  xAxis: THREE.Vector3,
  yAxis: THREE.Vector3,
  zAxis: THREE.Vector3,
) {
  if (!shape.importedMesh?.positions.length) {
    return null;
  }

  const axisKey = [...xAxis.toArray(), ...yAxis.toArray(), ...zAxis.toArray()].map((value) => value.toFixed(6)).join(":");
  let meshCache = importedShapeProjectionBoundsCache.get(shape.importedMesh);
  if (!meshCache) {
    meshCache = [];
    importedShapeProjectionBoundsCache.set(shape.importedMesh, meshCache);
  }
  let entry = meshCache.find((candidate) => sameShapeApartFromPosition(candidate.shape, shape));
  if (!entry) {
    entry = { shape, byAxis: new Map() };
    meshCache.push(entry);
    if (meshCache.length > MAX_PROJECTION_BOUNDS_PER_MESH) meshCache.shift();
  }
  const shapeCache = entry.byAxis;
  const center = shapeCenter(shape);
  const centerOffset = new THREE.Vector3(center.dot(xAxis), center.dot(yAxis), center.dot(zAxis));
  const cached = shapeCache.get(axisKey);
  if (cached) {
    return {
      min: cached.min.clone().add(centerOffset),
      max: cached.max.clone().add(centerOffset),
    };
  }

  const preserveSize = preservesEdgeTreatmentSize(shape);
  const positions = preserveSize ? resizedImportedMeshPositions(shape) : shape.importedMesh.positions;
  const scaleX = preserveSize ? 1 : shapeWidth(shape) / Math.max(0.001, shape.importedMesh.baseWidth);
  const scaleY = preserveSize ? 1 : shape.height / Math.max(0.001, shape.importedMesh.baseHeight);
  const scaleZ = preserveSize ? 1 : shapeDepth(shape) / Math.max(0.001, shape.importedMesh.baseDepth);
  const quaternion = quaternionForShape(shape);
  const min = new THREE.Vector3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
  const max = new THREE.Vector3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
  const point = new THREE.Vector3();
  const projected = new THREE.Vector3();
  const tapered = shapeHasTaper(shape);
  const deformed = shapeHasExtrudeDeform(shape);
  let taperMinY = Number.POSITIVE_INFINITY;
  let taperMaxY = Number.NEGATIVE_INFINITY;
  if (tapered || deformed) {
    for (let index = 1; index < positions.length; index += 3) {
      const localY = positions[index] * scaleY;
      taperMinY = Math.min(taperMinY, localY);
      taperMaxY = Math.max(taperMaxY, localY);
    }
  }
  const taperHeight = Math.max(1e-6, taperMaxY - taperMinY);

  for (let index = 0; index + 2 < positions.length; index += 3) {
    const localY = positions[index + 1] * scaleY;
    const normalizedHeight = (tapered || deformed) ? (localY - taperMinY) / taperHeight : 0;
    const widthScale = tapered ? shapeTaperScaleAt(shape, normalizedHeight, "width") : 1;
    const depthScale = tapered ? shapeTaperScaleAt(shape, normalizedHeight, "depth") : 1;
    let localX = positions[index] * scaleX * widthScale;
    let localZ = positions[index + 2] * scaleZ * depthScale;
    if (deformed) {
      const deform = shapeExtrudeDeformAt(shape, normalizedHeight);
      const cos = Math.cos(deform.twistRadians);
      const sin = Math.sin(deform.twistRadians);
      const twistedX = localX * cos - localZ * sin;
      const twistedZ = localX * sin + localZ * cos;
      localX = twistedX + deform.offsetX;
      localZ = twistedZ + deform.offsetZ;
    }
    point
      .set(localX, localY - shape.height / 2, localZ)
      .applyQuaternion(quaternion);
    projected.set(point.dot(xAxis), point.dot(yAxis), point.dot(zAxis));
    min.min(projected);
    max.max(projected);
  }

  if (![min.x, min.y, min.z, max.x, max.y, max.z].every(Number.isFinite)) {
    return null;
  }
  if (shapeCache.size >= 32) shapeCache.clear();
  shapeCache.set(axisKey, { min: min.clone(), max: max.clone() });
  return { min: min.add(centerOffset), max: max.add(centerOffset) };
}

const WORLD_X_AXIS = new THREE.Vector3(1, 0, 0);
const WORLD_Y_AXIS = new THREE.Vector3(0, 1, 0);
const WORLD_Z_AXIS = new THREE.Vector3(0, 0, 1);
/** How close (in screen pixels) an edge has to come before it snaps to another shape. */
const OBJECT_SNAP_PIXELS = 8;

/** The shape's footprint on the base plane, as the axis-parallel box Ausrichten also uses. */
function worldSnapBox(shape: WorkplaneShape): SnapBox {
  const { min, max } = projectShapeExtent(shape, WORLD_X_AXIS, WORLD_Y_AXIS, WORLD_Z_AXIS, new THREE.Vector3());
  return { minX: min.x, maxX: max.x, minZ: min.z, maxZ: max.z };
}

function unionSnapBox(boxes: SnapBox[]): SnapBox | null {
  if (boxes.length === 0) return null;
  return boxes.reduce((all, box) => ({
    minX: Math.min(all.minX, box.minX),
    maxX: Math.max(all.maxX, box.maxX),
    minZ: Math.min(all.minZ, box.minZ),
    maxZ: Math.max(all.maxZ, box.maxZ),
  }));
}

/** Converts OBJECT_SNAP_PIXELS into millimetres at `at`, so the pull feels the same at every zoom. */
function objectSnapThreshold(state: ThreeState, at: THREE.Vector3) {
  const rect = state.renderer.domElement.getBoundingClientRect();
  const origin = at.clone().project(state.camera);
  const pixels = (axis: THREE.Vector3) => {
    const moved = at.clone().add(axis).project(state.camera);
    return Math.hypot((moved.x - origin.x) * rect.width / 2, (moved.y - origin.y) * rect.height / 2);
  };
  const pixelsPerMm = Math.max(pixels(WORLD_X_AXIS), pixels(WORLD_Z_AXIS), 1e-6);
  return clamp(OBJECT_SNAP_PIXELS / pixelsPerMm, 0.05, 10);
}

const OBJECT_SNAP_GUIDE_OVERHANG = 6;

/** Draws (or clears, with an empty list) the guide lines of a snap on the plane at height `y`. */
function syncObjectSnapGuides(state: ThreeState, guides: ObjectSnapGuide[], y: number) {
  let lines = state.scene.getObjectByName("ObjectSnapGuides") as THREE.LineSegments | undefined;
  if (guides.length === 0) {
    if (lines?.visible) {
      lines.visible = false;
      state.needsRender = true;
    }
    return;
  }
  if (!lines) {
    lines = new THREE.LineSegments(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: "#e0347c", depthTest: false, transparent: true, opacity: 0.95 }),
    );
    lines.name = "ObjectSnapGuides";
    lines.renderOrder = 1000;
    lines.frustumCulled = false;
    state.scene.add(lines);
  }
  const positions: number[] = [];
  guides.forEach((guide) => {
    const from = guide.from - OBJECT_SNAP_GUIDE_OVERHANG;
    const to = guide.to + OBJECT_SNAP_GUIDE_OVERHANG;
    if (guide.axis === "x") positions.push(guide.value, y, from, guide.value, y, to);
    else positions.push(from, y, guide.value, to, y, guide.value);
  });
  lines.geometry.dispose();
  lines.geometry = new THREE.BufferGeometry();
  lines.geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  lines.visible = true;
  state.needsRender = true;
}

/** Bounding-Box einer Form auf drei vorgegebene Achsen projiziert, relativ zu `origin` - Kern sowohl fuer die Zieh-Griff-Rahmen als auch fuer die Abstands-zum-Ursprung-Anzeige. */
/** Die acht Ecken der Box einer Form in Weltkoordinaten, mit ihrer Drehung - Ankerpunkte fuer das Winkellineal (#105). */
const PLACEMENT_VERTEX_SNAP_PX = 10;
const PLACEMENT_EDGE_SNAP_PX = 8;

/**
 * A corner or an edge of the clicked face near the pointer (#189): a workplane laid on a
 * face starts there instead of on the snap grid, and on an edge it also lines up with it.
 * The edges come from the mesh itself (25° crease), so they are there even with the edge
 * lines switched off; only those lying in the face's plane count.
 */
function placementFeatureSnap(
  state: ThreeState,
  surface: THREE.Mesh<THREE.BufferGeometry>,
  facePoint: THREE.Vector3,
  normal: THREE.Vector3,
  pointerX: number,
  pointerY: number,
): { kind: "vertex"; point: THREE.Vector3 } | { kind: "edge"; point: THREE.Vector3; start: THREE.Vector3; end: THREE.Vector3; direction: THREE.Vector3 } | null {
  const geometry = surface.geometry;
  // A big imported mesh would stall the pointer while its edges are worked out.
  if ((geometry.index?.count ?? geometry.getAttribute("position").count) > 600_000) return null;
  let edges = surface.userData.placementFeatureEdges as { geometry: THREE.BufferGeometry; positions: Float32Array } | undefined;
  if (!edges || edges.geometry !== geometry) {
    const edgeGeometry = new THREE.EdgesGeometry(geometry, 25);
    edges = { geometry, positions: Float32Array.from(edgeGeometry.getAttribute("position").array as ArrayLike<number>) };
    edgeGeometry.dispose();
    surface.userData.placementFeatureEdges = edges;
  }
  const positions = edges.positions;
  const size = new THREE.Box3().setFromObject(surface).getSize(new THREE.Vector3()).length();
  const planeTolerance = Math.max(0.01, size * 1e-4);
  let vertex: { point: THREE.Vector3; distance: number } | null = null;
  let edge: { point: THREE.Vector3; start: THREE.Vector3; end: THREE.Vector3; direction: THREE.Vector3; distance: number } | null = null;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  for (let index = 0; index + 5 < positions.length; index += 6) {
    a.set(positions[index], positions[index + 1], positions[index + 2]).applyMatrix4(surface.matrixWorld);
    b.set(positions[index + 3], positions[index + 4], positions[index + 5]).applyMatrix4(surface.matrixWorld);
    if (Math.abs(a.clone().sub(facePoint).dot(normal)) > planeTolerance || Math.abs(b.clone().sub(facePoint).dot(normal)) > planeTolerance) continue;
    const aScreen = projectToScreen(a, state);
    const bScreen = projectToScreen(b, state);
    [[a, aScreen], [b, bScreen]].forEach(([world, screen]) => {
      const distance = Math.hypot((screen as { x: number }).x - pointerX, (screen as { y: number }).y - pointerY);
      if (distance <= PLACEMENT_VERTEX_SNAP_PX && (!vertex || distance < vertex.distance)) vertex = { point: (world as THREE.Vector3).clone(), distance };
    });
    const dx = bScreen.x - aScreen.x;
    const dy = bScreen.y - aScreen.y;
    const lengthSq = dx * dx + dy * dy;
    if (lengthSq < 1) continue;
    const amount = clamp(((pointerX - aScreen.x) * dx + (pointerY - aScreen.y) * dy) / lengthSq, 0, 1);
    const distance = Math.hypot(pointerX - (aScreen.x + dx * amount), pointerY - (aScreen.y + dy * amount));
    if (distance <= PLACEMENT_EDGE_SNAP_PX && (!edge || distance < edge.distance)) {
      edge = { point: a.clone().lerp(b, amount), start: a.clone(), end: b.clone(), direction: b.clone().sub(a).normalize(), distance };
    }
  }
  const foundVertex = vertex as { point: THREE.Vector3; distance: number } | null;
  if (foundVertex) return { kind: "vertex", point: foundVertex.point };
  const foundEdge = edge as { point: THREE.Vector3; start: THREE.Vector3; end: THREE.Vector3; direction: THREE.Vector3; distance: number } | null;
  return foundEdge ? { kind: "edge", point: foundEdge.point, start: foundEdge.start, end: foundEdge.end, direction: foundEdge.direction } : null;
}

function shapeBoxCornersWorld(shape: WorkplaneShape): THREE.Vector3[] {
  const center = shapeCenter(shape);
  const extents = shapeLocalExtents(shape);
  const shapeQuaternion = quaternionForShape(shape);
  const corners: THREE.Vector3[] = [];
  [-1, 1].forEach((xSign) => {
    [-1, 1].forEach((ySign) => {
      [-1, 1].forEach((zSign) => {
        corners.push(new THREE.Vector3(xSign * extents.x, ySign * extents.y, zSign * extents.z).applyQuaternion(shapeQuaternion).add(center));
      });
    });
  });
  return corners;
}

function projectShapeExtent(
  shape: WorkplaneShape,
  xAxis: THREE.Vector3,
  yAxis: THREE.Vector3,
  zAxis: THREE.Vector3,
  origin: THREE.Vector3,
): { min: THREE.Vector3; max: THREE.Vector3 } {
  const importedBounds = importedShapeProjectionBounds(shape, xAxis, yAxis, zAxis);
  if (importedBounds) {
    const originProjection = new THREE.Vector3(origin.dot(xAxis), origin.dot(yAxis), origin.dot(zAxis));
    return { min: importedBounds.min.sub(originProjection), max: importedBounds.max.sub(originProjection) };
  }
  const center = shapeCenter(shape);
  const extents = shapeLocalExtents(shape);
  const shapeQuaternion = quaternionForShape(shape);
  const min = new THREE.Vector3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
  const max = new THREE.Vector3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
  [-1, 1].forEach((xSign) => {
    [-1, 1].forEach((ySign) => {
      [-1, 1].forEach((zSign) => {
        const point = new THREE.Vector3(xSign * extents.x, ySign * extents.y, zSign * extents.z).applyQuaternion(shapeQuaternion).add(center);
        const local = point.sub(origin);
        local.set(local.dot(xAxis), local.dot(yAxis), local.dot(zAxis));
        min.min(local);
        max.max(local);
      });
    });
  });
  return { min, max };
}

/** Gemeinsame Umrissbox mehrerer Formen in denselben Achsen - mehrere markierte Koerper zaehlen am Lineal wie einer. */
function projectShapesExtent(
  shapes: WorkplaneShape[],
  xAxis: THREE.Vector3,
  yAxis: THREE.Vector3,
  zAxis: THREE.Vector3,
  origin: THREE.Vector3,
): { min: THREE.Vector3; max: THREE.Vector3 } {
  const min = new THREE.Vector3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
  const max = new THREE.Vector3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
  shapes.forEach((shape) => {
    const extent = projectShapeExtent(shape, xAxis, yAxis, zAxis, origin);
    min.min(extent.min);
    max.max(extent.max);
  });
  return { min, max };
}

function selectionFrameForShapes(
  shapes: WorkplaneShape[],
  selectedIds: string[],
  workplane?: PlacementWorkplane,
): SelectionFrame | null {
  const selected = selectedIds.map((id) => shapes.find((shape) => shape.id === id)).filter((shape): shape is WorkplaneShape => Boolean(shape && !shape.hidden));
  if (selected.length === 0) {
    return null;
  }

  const singleShape = selected.length === 1 ? selected[0] : null;
  // A workplane only wins over the shape's own rotation when it's a real,
  // user-picked plane - the always-present default (no plane ever chosen)
  // must not force a single rotated shape's resize/rotate handles onto world
  // axes, or a tilted cylinder distorts when dragged.
  const useWorkplane = Boolean(workplane) && !placementWorkplaneIsBase(workplane!);
  const quaternion = useWorkplane
    ? placementWorkplaneQuaternion(workplane!)
    : singleShape ? quaternionForShape(singleShape) : new THREE.Quaternion();
  const xAxis = useWorkplane
    ? new THREE.Vector3(workplane!.xAxis.x, workplane!.xAxis.y, workplane!.xAxis.z).normalize()
    : new THREE.Vector3(1, 0, 0).applyQuaternion(quaternion).normalize();
  const yAxis = useWorkplane
    ? new THREE.Vector3(workplane!.normal.x, workplane!.normal.y, workplane!.normal.z).normalize()
    : new THREE.Vector3(0, 1, 0).applyQuaternion(quaternion).normalize();
  const zAxis = useWorkplane
    ? new THREE.Vector3(workplane!.zAxis.x, workplane!.zAxis.y, workplane!.zAxis.z).normalize()
    : new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion).normalize();
  const localMin = new THREE.Vector3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
  const localMax = new THREE.Vector3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
  const origin = useWorkplane
    ? new THREE.Vector3(workplane!.origin.x, workplane!.origin.y, workplane!.origin.z)
    : singleShape ? shapeCenter(singleShape) : new THREE.Vector3();

  if (!useWorkplane && !singleShape) {
    selected.forEach((shape) => origin.add(shapeCenter(shape)));
    origin.multiplyScalar(1 / selected.length);
  }

  selected.forEach((shape) => {
    const { min, max } = projectShapeExtent(shape, xAxis, yAxis, zAxis, origin);
    localMin.min(min);
    localMax.max(max);
  });

  const localCenter = localMin.clone().add(localMax).multiplyScalar(0.5);
  const center = origin.clone()
    .addScaledVector(xAxis, localCenter.x)
    .addScaledVector(yAxis, localCenter.y)
    .addScaledVector(zAxis, localCenter.z);
  const width = Math.max(MIN_SHAPE_SIZE, localMax.x - localMin.x);
  const height = Math.max(MIN_SHAPE_SIZE, localMax.y - localMin.y);
  const depth = Math.max(MIN_SHAPE_SIZE, localMax.z - localMin.z);

  return {
    ids: selected.map((shape) => shape.id),
    center,
    quaternion,
    xAxis,
    yAxis,
    zAxis,
    width,
    height,
    depth,
    min: new THREE.Vector3(-width / 2, -height / 2, -depth / 2),
    max: new THREE.Vector3(width / 2, height / 2, depth / 2),
    singleShape,
  };
}

type OriginDimensionFrame = {
  origin: THREE.Vector3;
  distanceX: number | null;
  distanceZ: number | null;
  xEndpoint: THREE.Vector3 | null;
  zEndpoint: THREE.Vector3 | null;
};

/**
 * Abstand einer einzelnen Form zum Ursprung der Werkflaeche, immer entlang
 * deren eigener Achsen - anders als `selectionFrameForShapes` weicht das nie
 * auf die Drehung der Form selbst aus, weil der Abstand zum Nullpunkt am
 * Raster gemessen wird, nicht an der Neigung des Objekts.
 */
function originFrameForShapes(shapes: WorkplaneShape[], workplane: PlacementWorkplane, accuracy: MeasurementAccuracy): OriginDimensionFrame {
  const origin = new THREE.Vector3(workplane.origin.x, workplane.origin.y, workplane.origin.z);
  const xAxis = new THREE.Vector3(workplane.xAxis.x, workplane.xAxis.y, workplane.xAxis.z).normalize();
  const yAxis = new THREE.Vector3(workplane.normal.x, workplane.normal.y, workplane.normal.z).normalize();
  const zAxis = new THREE.Vector3(workplane.zAxis.x, workplane.zAxis.y, workplane.zAxis.z).normalize();
  // Several shapes measure as one: the box around all of them.
  const min = new THREE.Vector3(Infinity, Infinity, Infinity);
  const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
  shapes.forEach((shape) => {
    const extent = projectShapeExtent(shape, xAxis, yAxis, zAxis, origin);
    min.min(extent.min);
    max.max(extent.max);
  });
  const eps = 0.5 * 10 ** -accuracy;
  const distanceX = computeOriginAxisDistance((min.x + max.x) / 2, (max.x - min.x) / 2, eps);
  const distanceZ = computeOriginAxisDistance((min.z + max.z) / 2, (max.z - min.z) / 2, eps);
  return {
    origin,
    distanceX,
    distanceZ,
    xEndpoint: distanceX !== null ? origin.clone().addScaledVector(xAxis, distanceX) : null,
    zEndpoint: distanceZ !== null ? origin.clone().addScaledVector(zAxis, distanceZ) : null,
  };
}

function framePoint(frame: SelectionFrame, x: number, y: number, z: number) {
  return frame.center
    .clone()
    .add(frame.xAxis.clone().multiplyScalar(x))
    .add(frame.yAxis.clone().multiplyScalar(y))
    .add(frame.zAxis.clone().multiplyScalar(z));
}

function frameLocalPoint(frame: SelectionFrame, point: THREE.Vector3) {
  const offset = point.clone().sub(frame.center);
  return new THREE.Vector3(offset.dot(frame.xAxis), offset.dot(frame.yAxis), offset.dot(frame.zAxis));
}

function frameLocalDelta(frame: SelectionFrame, start: THREE.Vector3, current: THREE.Vector3) {
  const offset = current.clone().sub(start);
  return new THREE.Vector3(offset.dot(frame.xAxis), offset.dot(frame.yAxis), offset.dot(frame.zAxis));
}

function selectionFrameCorners(frame: SelectionFrame) {
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

function moveDimensionAnchorForCamera(state: ThreeState, frame: SelectionFrame) {
  const planeY = WORKPLANE_LINE_ELEVATION + 0.04;
  const footprint = [
    framePoint(frame, frame.min.x, frame.min.y, frame.max.z),
    framePoint(frame, frame.max.x, frame.min.y, frame.max.z),
    framePoint(frame, frame.max.x, frame.min.y, frame.min.z),
    framePoint(frame, frame.min.x, frame.min.y, frame.min.z),
  ].map((corner) => {
    const groundCorner = new THREE.Vector3(corner.x, planeY, corner.z);
    return { world: groundCorner, screen: projectToScreen(groundCorner, state) };
  });

  const leftVisibleCorner = footprint.reduce((leftmost, candidate) => {
    const horizontalDifference = candidate.screen.x - leftmost.screen.x;
    if (horizontalDifference < -0.75) {
      return candidate;
    }
    if (Math.abs(horizontalDifference) <= 0.75 && candidate.screen.y > leftmost.screen.y) {
      return candidate;
    }
    return leftmost;
  });
  return leftVisibleCorner.world;
}

function selectionWorldYBounds(frame: SelectionFrame) {
  const corners = selectionFrameCorners(frame);
  const min = cleanNearZero(Math.min(...corners.map((corner) => corner.y)));
  const max = cleanNearZero(Math.max(...corners.map((corner) => corner.y)));
  return { min, max, height: Math.max(MIN_SHAPE_SIZE, max - min) };
}

function workplaneYForFrame(frame: SelectionFrame, workplane: PlacementWorkplane) {
  const origin = new THREE.Vector3(workplane.origin.x, workplane.origin.y, workplane.origin.z);
  return origin.sub(frame.center).dot(frame.yAxis);
}

function workplaneFootprintY(frame: SelectionFrame, workplane: PlacementWorkplane) {
  return clamp(workplaneYForFrame(frame, workplane), frame.min.y, frame.max.y);
}

function localResizePlaneForFrame(frame: SelectionFrame, localY = frame.min.y) {
  return new THREE.Plane().setFromNormalAndCoplanarPoint(
    frame.yAxis.clone().normalize(),
    framePoint(frame, 0, localY, 0),
  );
}

function resizeSignsForHandle(handleKey: string): ResizeSigns {
  const key = handleKey.toLowerCase();
  return {
    x: key.includes("right") ? 1 : key.includes("left") ? -1 : 0,
    z: key.includes("near") ? 1 : key.includes("far") ? -1 : 0,
  };
}

function resizeAnchorPointForFrame(frame: SelectionFrame, signs: ResizeSigns) {
  return framePoint(
    frame,
    signs.x ? (-signs.x * frame.width) / 2 : 0,
    frame.min.y,
    signs.z ? (-signs.z * frame.depth) / 2 : 0,
  );
}

function resizeCenterFromAnchor(frame: SelectionFrame, anchor: THREE.Vector3, signs: ResizeSigns, width: number, depth: number) {
  return anchor
    .clone()
    .add(frame.yAxis.clone().multiplyScalar(frame.height / 2))
    .add(frame.xAxis.clone().multiplyScalar(signs.x ? (signs.x * width) / 2 : 0))
    .add(frame.zAxis.clone().multiplyScalar(signs.z ? (signs.z * depth) / 2 : 0));
}

function resizedShapePatchFromFrame(shape: WorkplaneShape, center: THREE.Vector3, width: number, depth: number): Partial<WorkplaneShape> {
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
  return patch;
}

function shapeScreenBounds(state: ThreeState, shape: WorkplaneShape) {
  const frame = selectionFrameForShapes([shape], [shape.id]);
  if (!frame) {
    return null;
  }
  const points = selectionFrameCorners(frame).map((corner) => projectToScreen(corner, state));
  return {
    minX: Math.min(...points.map((point) => point.x)),
    maxX: Math.max(...points.map((point) => point.x)),
    minY: Math.min(...points.map((point) => point.y)),
    maxY: Math.max(...points.map((point) => point.y)),
  };
}

function boundsIntersectRect(bounds: NonNullable<ReturnType<typeof shapeScreenBounds>>, rect: { left: number; top: number; right: number; bottom: number }) {
  return bounds.maxX >= rect.left && bounds.minX <= rect.right && bounds.maxY >= rect.top && bounds.minY <= rect.bottom;
}

/**
 * Whether any triangle of the body, as drawn, touches the rectangle (canvas
 * pixels). Null when the body has no surface to test - a measuring tool made
 * of lines - so the caller can fall back on its frame.
 */
function shapeGeometryTouchesScreenRect(state: ThreeState, shapeId: string, rect: ScreenRect): boolean | null {
  const object = state.shapeRecords.get(shapeId)?.object ?? findShapeObject(state, shapeId);
  if (!object) return null;
  const canvas = state.renderer.domElement.getBoundingClientRect();
  state.camera.updateMatrixWorld();
  const viewProjection = new THREE.Matrix4().multiplyMatrices(state.camera.projectionMatrix, state.camera.matrixWorldInverse);
  const matrix = new THREE.Matrix4();
  let tested = false;
  let touches = false;
  object.updateWorldMatrix(true, true);
  object.traverse((child) => {
    if (touches || !(child instanceof THREE.Mesh) || !child.visible || child.userData.cutPreview || typeof child.userData.shapeId !== "string") return;
    const geometry = child.geometry as THREE.BufferGeometry;
    const position = geometry.getAttribute("position");
    if (!position || position.count < 3) return;
    tested = true;
    const e = matrix.multiplyMatrices(viewProjection, child.matrixWorld).elements;
    // Every vertex once: screen x and y, and whether it is in front of the camera.
    const screen = new Float32Array(position.count * 2);
    const behind = new Uint8Array(position.count);
    for (let index = 0; index < position.count; index += 1) {
      const x = position.getX(index);
      const y = position.getY(index);
      const z = position.getZ(index);
      const w = e[3] * x + e[7] * y + e[11] * z + e[15];
      if (w <= 1e-9) {
        behind[index] = 1;
        continue;
      }
      screen[index * 2] = ((e[0] * x + e[4] * y + e[8] * z + e[12]) / w + 1) / 2 * canvas.width;
      screen[index * 2 + 1] = (1 - (e[1] * x + e[5] * y + e[9] * z + e[13]) / w) / 2 * canvas.height;
    }
    const index = geometry.index;
    const total = index ? index.count : position.count;
    const start = Math.max(0, Math.floor(geometry.drawRange.start || 0));
    const end = Math.min(total, Number.isFinite(geometry.drawRange.count) ? start + Math.floor(geometry.drawRange.count) : total);
    for (let corner = start; corner + 2 < end; corner += 3) {
      const a = index ? index.getX(corner) : corner;
      const b = index ? index.getX(corner + 1) : corner + 1;
      const c = index ? index.getX(corner + 2) : corner + 2;
      if (behind[a] || behind[b] || behind[c]) continue;
      if (triangleTouchesRect(screen[a * 2], screen[a * 2 + 1], screen[b * 2], screen[b * 2 + 1], screen[c * 2], screen[c * 2 + 1], rect)) {
        touches = true;
        return;
      }
    }
  });
  return tested ? touches : null;
}

function rotationAxisVectorForFrame(handleKey: string, frame: SelectionFrame) {
  const axis = rotationAxisForHandle(handleKey);
  if (axis === "x") {
    return frame.xAxis.clone().normalize();
  }
  if (axis === "z") {
    return frame.zAxis.clone().normalize();
  }
  return frame.yAxis.clone().normalize();
}

function rayPointOnRotationPlane(state: ThreeState, clientX: number, clientY: number, pivot: THREE.Vector3, axis: THREE.Vector3) {
  const rect = state.renderer.domElement.getBoundingClientRect();
  state.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  state.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  state.raycaster.setFromCamera(state.pointer, state.camera);
  const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(axis.clone().normalize(), pivot);
  return state.raycaster.ray.intersectPlane(plane, new THREE.Vector3());
}

function axisDragPlaneForCamera(state: ThreeState, axis: THREE.Vector3, point: THREE.Vector3) {
  const normalizedAxis = axis.clone().normalize();
  let normal = state.camera.getWorldDirection(new THREE.Vector3()).projectOnPlane(normalizedAxis);
  if (normal.lengthSq() < 0.000001) {
    normal = new THREE.Vector3(0, 1, 0).applyQuaternion(state.camera.quaternion).projectOnPlane(normalizedAxis);
  }
  if (normal.lengthSq() < 0.000001) {
    const fallback = Math.abs(normalizedAxis.y) < 0.9
      ? new THREE.Vector3(0, 1, 0)
      : new THREE.Vector3(1, 0, 0);
    normal = fallback.projectOnPlane(normalizedAxis);
  }
  return new THREE.Plane().setFromNormalAndCoplanarPoint(normal.normalize(), point);
}

function signedAngleAroundAxis(start: THREE.Vector3, current: THREE.Vector3, axis: THREE.Vector3) {
  const a = start.clone().normalize();
  const b = current.clone().normalize();
  return Math.atan2(axis.clone().normalize().dot(a.clone().cross(b)), clamp(a.dot(b), -1, 1));
}

const ROTATION_HANDLE_SIDE_HYSTERESIS = 0.22;
const ROTATION_HANDLE_DOMINANCE_HYSTERESIS = 0.18;
function signedRotationSide(value: number, previous: RotationHandleSide | undefined, positiveSide: RotationHandleSide, negativeSide: RotationHandleSide) {
  if (previous === positiveSide && value > -ROTATION_HANDLE_SIDE_HYSTERESIS) {
    return previous;
  }
  if (previous === negativeSide && value < ROTATION_HANDLE_SIDE_HYSTERESIS) {
    return previous;
  }
  return value >= 0 ? positiveSide : negativeSide;
}

function rotationSideScore(side: RotationHandleSide, viewX: number, viewZ: number) {
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

function dominantRotationSide(viewX: number, viewZ: number, previous: RotationHandleSide | undefined) {
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

function rotationHandleSidesForCamera(
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

function patchWithPreservedWorldYEdge(shape: WorkplaneShape, patch: Partial<WorkplaneShape>, edge: "bottom" | "top") {
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

function patchWithPreservedWorldBottom(shape: WorkplaneShape, patch: Partial<WorkplaneShape>) {
  return patchWithPreservedWorldYEdge(shape, patch, "bottom");
}

function resizeSignsForDimension(signs: ResizeSigns, axis: "width" | "depth") {
  return axis === "width" ? { x: signs.x, z: 0 } : { x: 0, z: signs.z };
}

function patchWithResizeAnchor(
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
  if (axis === "height") {
    return patchWithPreservedWorldYEdge(shape, patch, anchor?.shapeId === shape.id && anchor.pressedY === "bottom" ? "top" : "bottom");
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
function patchWithUniformHeightScale(
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

function resizeShapeFromFrameHandle(
  transform: TransformDragState,
  point: THREE.Vector3,
  handleKey: string,
  shiftKey: boolean,
  altKey: boolean,
  step: number,
  maxSize: number,
): Partial<WorkplaneShape> {
  const shape = transform.startShape;
  const frame = transform.selectionFrame;
  const width = frame.width;
  const depth = frame.depth;
  const localDelta = transform.scaleStartPoint ? frameLocalDelta(frame, transform.scaleStartPoint, point) : new THREE.Vector3();

  const signs = transform.scaleSigns ?? resizeSignsForHandle(handleKey);
  const axisResize = (current: number, delta: number, sign: number) => {
    if (!sign) {
      return current;
    }
    const signedDelta = sign * delta;
    if (altKey) {
      return snapDimension(current + signedDelta * 2, step, MIN_SHAPE_SIZE, maxSize);
    }
    return snapDimension(current + signedDelta, step, MIN_SHAPE_SIZE, maxSize);
  };

  let nextWidth = axisResize(width, localDelta.x, signs.x);
  let nextDepth = axisResize(depth, localDelta.z, signs.z);

  // A cylinder is always circular - every horizontal handle (side or corner)
  // drives the one shared diameter instead of stretching width and depth
  // independently into an ellipse.
  if ((shape.kind === "cylinder" || shape.kind === "star") && (signs.x || signs.z)) {
    const diameter = signs.x && signs.z ? (nextWidth + nextDepth) / 2 : signs.x ? nextWidth : nextDepth;
    nextWidth = diameter;
    nextDepth = diameter;
  }

  // Shift on a corner keeps every proportion, height included.
  let uniformScale = 1;
  if (shiftKey && signs.x && signs.z) {
    const scale = proportionalResizeScale(width, depth, nextWidth, nextDepth);
    const limitedScale = clamp(scale, MIN_SHAPE_SIZE / Math.max(MIN_SHAPE_SIZE, Math.min(width, depth)), maxSize / Math.max(width, depth));
    nextWidth = snapDimension(width * limitedScale, step, MIN_SHAPE_SIZE, maxSize);
    nextDepth = snapDimension(depth * limitedScale, step, MIN_SHAPE_SIZE, maxSize);
    uniformScale = nextWidth / Math.max(MIN_SHAPE_SIZE, width);
  }
  const heightAnchorY = altKey ? frame.center.y : selectionWorldYBounds(frame).min;

  const nextCenter = altKey
    ? frame.center.clone()
    : resizeCenterFromAnchor(frame, transform.scaleAnchorPoint ?? resizeAnchorPointForFrame(frame, signs), signs, nextWidth, nextDepth);
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

function axisScaleMatrix(axis: THREE.Vector3, scale: number, anchor: number) {
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

function resizeImportedShapeAlongFrameNormal(
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

function resizeShapeAlongFrameNormal(
  shape: WorkplaneShape,
  frame: SelectionFrame,
  nextFrameHeight: number,
  resizingFromBottom: boolean,
): Partial<WorkplaneShape> {
  const importedPatch = resizeImportedShapeAlongFrameNormal(shape, frame, nextFrameHeight, resizingFromBottom);
  if (importedPatch) {
    return importedPatch;
  }

  const scale = nextFrameHeight / Math.max(MIN_SHAPE_SIZE, frame.height);
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
  if (dimensionAxis.axis === "width") {
    patch.width = Math.max(MIN_SHAPE_SIZE, shapeWidth(shape) * scale);
    patch.size = resizedShapeSize(patch.width, shapeDepth(shape));
    patch.elevation = cleanNearZero(nextCenter.y - shape.height / 2, 0.0005);
  } else if (dimensionAxis.axis === "depth") {
    patch.depth = Math.max(MIN_SHAPE_SIZE, shapeDepth(shape) * scale);
    patch.size = resizedShapeSize(shapeWidth(shape), patch.depth);
    patch.elevation = cleanNearZero(nextCenter.y - shape.height / 2, 0.0005);
  } else {
    patch.height = Math.max(MIN_SHAPE_SIZE, shape.height * scale);
    patch.elevation = cleanNearZero(nextCenter.y - patch.height / 2, 0.0005);
  }
  return patch;
}

function resizeSelectionFromHandle(
  transform: TransformDragState,
  point: THREE.Vector3,
  handleKey: string,
  shiftKey: boolean,
  altKey: boolean,
  step: number,
  maxSize: number,
) {
  const frame = transform.selectionFrame;
  const localDelta = transform.scaleStartPoint ? frameLocalDelta(frame, transform.scaleStartPoint, point) : new THREE.Vector3();
  const signs = transform.scaleSigns ?? resizeSignsForHandle(handleKey);
  const axisResize = (current: number, delta: number, sign: number) => {
    if (!sign) {
      return { size: current, scale: 1 };
    }
    const signedDelta = sign * delta;
    if (altKey) {
      const size = snapDimension(current + signedDelta * 2, step, MIN_SHAPE_SIZE, maxSize);
      return { size, scale: size / Math.max(MIN_SHAPE_SIZE, current) };
    }
    const rawSize = current + signedDelta;
    const size = snapDimension(rawSize, step, MIN_SHAPE_SIZE, maxSize);
    return {
      size,
      scale: size / Math.max(MIN_SHAPE_SIZE, current),
    };
  };

  let nextX = axisResize(frame.width, localDelta.x, signs.x);
  let nextZ = axisResize(frame.depth, localDelta.z, signs.z);
  let uniformScale = 1;
  if (shiftKey && signs.x && signs.z) {
    const scale = proportionalResizeScale(frame.width, frame.depth, nextX.size, nextZ.size);
    const limitedScale = clamp(scale, MIN_SHAPE_SIZE / Math.max(MIN_SHAPE_SIZE, Math.min(frame.width, frame.depth)), maxSize / Math.max(frame.width, frame.depth));
    const width = snapDimension(frame.width * limitedScale, step, MIN_SHAPE_SIZE, maxSize);
    const depth = snapDimension(frame.depth * limitedScale, step, MIN_SHAPE_SIZE, maxSize);
    nextX = {
      size: width,
      scale: width / Math.max(MIN_SHAPE_SIZE, frame.width),
    };
    nextZ = {
      size: depth,
      scale: depth / Math.max(MIN_SHAPE_SIZE, frame.depth),
    };
    // Shift on a corner keeps every proportion, height included.
    uniformScale = nextX.scale;
  }
  const heightAnchorY = altKey ? frame.center.y : selectionWorldYBounds(frame).min;

  const nextCenter = altKey
    ? frame.center.clone()
    : resizeCenterFromAnchor(frame, transform.scaleAnchorPoint ?? resizeAnchorPointForFrame(frame, signs), signs, nextX.size, nextZ.size);

  return transform.items.map((item) => {
    const localCenter = frameLocalPoint(frame, item.startCenter);
    const nextItemCenter = nextCenter
      .clone()
      .add(frame.xAxis.clone().multiplyScalar(localCenter.x * nextX.scale))
      .add(frame.yAxis.clone().multiplyScalar(localCenter.y))
      .add(frame.zAxis.clone().multiplyScalar(localCenter.z * nextZ.scale));
    const width = snapDimension(shapeWidth(item.startShape) * nextX.scale, step, MIN_SHAPE_SIZE, maxSize);
    const depth = snapDimension(shapeDepth(item.startShape) * nextZ.scale, step, MIN_SHAPE_SIZE, maxSize);
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

/**
 * Die Massband-Werkzeuge: eine schmale Knopfleiste ohne Titelleiste, also
 * mit einem Griff links. Er zieht sie frei ueber die Arbeitsflaeche, ein
 * Doppelklick darauf oder das Ablegen am Knopf bringt sie zurueck.
 */
const TAPE_PANEL: MovablePanelOptions = {
  floatingStyle: { animation: "none" },
  area: (panel) => panel.closest<HTMLElement>(".workplane-stage"),
};

function MovableTapePanel({ children }: { children: ReactNode }) {
  const movable = useMovablePanel<HTMLDivElement>("layerling.editor.tapePanelPosition", TAPE_PANEL);
  return (
    <div
      id="tape-tool-popover"
      ref={movable.panelRef}
      className={`tape-tool-popover ${movable.moved ? "floating" : ""} ${movable.dragging ? "moving" : ""}`}
      style={movable.style}
      aria-label={t("camera.tapeActions")}
    >
      <span className="panel-grip" title={t("panel.moveHint")} aria-hidden="true" {...movable.handleProps}>
        <GripVertical size={16} strokeWidth={2.2} />
      </span>
      {children}
    </div>
  );
}

/**
 * Das Schnittfenster haengt an seinem Knopf in der Kameraleiste und laesst
 * sich an seiner Titelleiste frei ueber die Arbeitsflaeche ziehen, wie
 * Objektliste und Einstellungen. Ein Doppelklick auf die Titelleiste oder das
 * Ablegen am Knopf bringt es zurueck. Eigene Komponente, weil das Fenster nur
 * offen da ist - so liest es den gemerkten Platz bei jedem Oeffnen.
 */
const SECTION_PANEL: MovablePanelOptions = {
  floatingStyle: { bottom: "auto", animation: "none" },
  area: (panel) => panel.closest<HTMLElement>(".workplane-stage"),
};

function MovableSectionPanel({ children }: { children: (handleProps: ReturnType<typeof useMovablePanel>["handleProps"]) => ReactNode }) {
  const movable = useMovablePanel<HTMLDivElement>("layerling.editor.sectionPanelPosition", SECTION_PANEL);
  return (
    <div
      id="section-tool-popover"
      ref={movable.panelRef}
      className={`section-tool-popover ${movable.moved ? "floating" : ""} ${movable.dragging ? "moving" : ""}`}
      style={movable.style}
      aria-label={t("camera.sectionView")}
    >
      {children(movable.handleProps)}
    </div>
  );
}

export function WorkplaneViewport({
  shapes,
  selectedIds,
  alignMode,
  alignAnchorId,
  alignHandles,
  alignReferenceShapes,
  mirrorMode,
  mirrorReferenceShapes,
  splitActive = false,
  splitPlane = null,
  onSplitPositionChange,
  splitSurfacePick = false,
  onSplitSurfacePick,
  placementWorkplane,
  workplaneHidden = false,
  onToggleWorkplaneHidden,
  workplaneMode,
  initialSnap,
  initialWorkspace,
  workspaceSettingsKey,
  onAddShape,
  onDropMyShape,
  cruiseAsset = null,
  carryIds = null,
  onCarryDrop,
  onCancelCruise,
  onAlignAnchorChange,
  onAlignPreview,
  onAlignPreviewClear,
  onAlignSelection,
  onMirrorPreview,
  onMirrorPreviewClear,
  onMirrorSelection,
  onSelectShape,
  onShapeContextMenu,
  onSetPlacementWorkplane,
  onToggleWorkplaneTool,
  onInteractionActiveChange,
  onEditSketch,
  onOpenGroup,
  canSeparateParts = false,
  onSeparateParts,
  onSelectionHole,
  onSelectionColor,
  onSelectionLock,
  onWrapAroundCylinder,
  onLayerText,
  onTextTags,
  textLayerStack,
  prepareNewShape,
  onUpdateShape,
  onDuplicateShapeAt,
  onDuplicateShapesMoved,
  notes = EMPTY_NOTES,
  notesVisible = true,
  showOverhangs = false,
  noteMode = false,
  rotationPivot = null,
  pivotPickMode = false,
  onPivotPick,
  layFlatPickMode = false,
  onLayFlatPick,
  mateFacePick = null,
  onMateFacePick,
  onNoteAdd,
  onNoteUpdate,
  onNoteRemove,
  onNoteModeChange,
  onWorkspaceSettingsChange,
  projectName = "",
  projectId = null,
  onWorkplaneModeChange,
  modifierActive = false,
  modifierPreviewActive = false,
  modifierEdges = [],
  modifierHighlightedEdgeIds = [],
  selectedModifierEdgeIds = [],
  onModifierEdgeToggle,
  themePreference = "system",
  resolvedTheme = "light",
  onThemePreferenceChange,
  onExportSectionSvg,
  onSectionContours,
}: WorkplaneViewportProps) {
  const [snapOpen, setSnapOpen] = useState(false);
  // The inspector hands the snap grid control back to the workplane while collapsed or floating.
  const [inspectorSnapGridAway, setInspectorSnapGridAway] = useState(false);
  const [snap, setSnap] = useState<GridSize>(() => normalizeSnapGrid(initialSnap, DEFAULT_SNAP_GRID));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [workspace, setWorkspace] = useState<WorkspaceSettings>(() => normalizeWorkspaceSettings(initialWorkspace));
  const [transformOverlay, setTransformOverlay] = useState<TransformOverlayState | null>(null);
  const [alignOverlay, setAlignOverlay] = useState<AlignOverlayState | null>(null);
  const [mirrorOverlay, setMirrorOverlay] = useState<MirrorOverlayState | null>(null);
  const [marqueeRect, setMarqueeRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [hoverMeasureKey, setHoverMeasureKey] = useState<string | null>(null);
  const [pinnedMeasureKey, setPinnedMeasureKey] = useState<string | null>(null);
  const [rotationReadout, setRotationReadout] = useState<RotationReadout>(null);
  // A turned body's angles under it, named like its position: Y across the
  // plate, Z up.
  const angleBadge = useMemo(() => {
    if (!workspace.showRotationAngles || selectedIds.length !== 1) return null;
    const shape = shapes.find((candidate) => candidate.id === selectedIds[0]);
    if (!shape) return null;
    // Right-handed like the position (#182): the turn about Y is minus the inside turn about z.
    const angles = [shape.rotationX ?? 0, displayYTurn(shape.rotationZ ?? 0), shape.rotation ?? 0].map((angle) => Number(signedDegrees(angle).toFixed(1)));
    if (angles.every((angle) => angle === 0)) return null;
    return ["X", "Y", "Z"].map((axis, index) => `${axis} ${angles[index]}°`).join(" · ");
  }, [selectedIds, shapes, workspace.showRotationAngles]);
  const suppressNextRotationEditRef = useRef(false);
  const [activeRotationWheel, setActiveRotationWheel] = useState(false);
  const [activeTransformKind, setActiveTransformKind] = useState<TransformHandleKind | null>(null);
  const [rotationWheelAxis, setRotationWheelAxis] = useState<RotationAxis>("y");
  const [pinnedRotationWheelView, setPinnedRotationWheelView] = useState<PinnedRotationWheelView | null>(null);
  const [editingDimension, setEditingDimension] = useState<EditingDimension>(null);
  const [editingCorner, setEditingCorner] = useState<EditingCorner>(null);
  const [editingRotation, setEditingRotation] = useState<EditingRotation>(null);
  const [tapeMode, setTapeMode] = useState(false);
  const [tapeDeleteMode, setTapeDeleteMode] = useState(false);
  const [tapeMoveMode, setTapeMoveMode] = useState(false);
  const [tapeToolsOpen, setTapeToolsOpen] = useState(false);
  const [tapeClearPending, setTapeClearPending] = useState(false);
  const [cameraControlsCollapsed, setCameraControlsCollapsed] = useState(false);
  const language = useLanguage();
  const [orthographicView, setOrthographicView] = useState(false);
  // Hides the whole plate - grid, labels and any face workplane - for a clear
  // look at the underside. Only the view changes: shapes still land on it.
  const [workplaneLayerHidden, setWorkplaneLayerHidden] = useState(false);
  const workplaneLayerHiddenRef = useRef(workplaneLayerHidden);
  workplaneLayerHiddenRef.current = workplaneLayerHidden;
  const [tapeModel, setTapeModel] = useState<TapeModel>({ points: [], segments: [], startPointId: null, hover: null });
  const [tapeOverlay, setTapeOverlay] = useState<TapeOverlayState | null>(null);
  const [rulerDimensionOverlay, setRulerDimensionOverlay] = useState<RulerDimensionOverlayState | null>(null);
  const [cornerRulerMode, setCornerRulerMode] = useState(false);
  const [cornerRulerOverlay, setCornerRulerOverlay] = useState<CornerRulerOverlayState | null>(null);
  const [rulerDimensionEditing, setRulerDimensionEditing] = useState<{ shapeId: string; field: RulerDimensionField; x: number; y: number; value: string; base: number } | null>(null);
  const [rulerDuplicatePreview, setRulerDuplicatePreview] = useState<{ x: number; y: number; label: string } | null>(null);
  const [rulerDuplicateEditing, setRulerDuplicateEditing] = useState<{ rulerId: string; shapeId: string; baseAlong: number; x: number; y: number; value: string } | null>(null);
  const [rulerCoordinateEditing, setRulerCoordinateEditing] = useState<{ rulerId: string; shapeIds: string[]; axis: "x" | "z" | "elevation"; x: number; y: number; value: string } | null>(null);
  const [noteOverlay, setNoteOverlay] = useState<NoteOverlayState | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [moveDimensionOverlay, setMoveDimensionOverlay] = useState<MoveDimensionOverlayState | null>(null);
  const [moveDimensionsEnabled, setMoveDimensionsEnabled] = useState(true);
  const [originDimensionOverlay, setOriginDimensionOverlay] = useState<OriginDimensionOverlayData | null>(null);
  const [originDimensionsEnabled, setOriginDimensionsEnabled] = useState(true);
  const [startInPerspective, setStartInPerspective] = useState(true);
  const [sectionViewOpen, setSectionViewOpen] = useState(false);
  const [sectionSettings, setSectionSettings] = useState<SectionPlaneSettings>(DEFAULT_SECTION_SETTINGS);
  const sectionSettingsRef = useRef(sectionSettings);
  sectionSettingsRef.current = sectionSettings;
  const sectionViewOpenRef = useRef(sectionViewOpen);
  sectionViewOpenRef.current = sectionViewOpen;
  // Messen auf der Schnittebene: zwei Punkte, an den Umriss des Schnitts gerastet.
  const [sectionMeasureMode, setSectionMeasureMode] = useState(false);
  const sectionMeasureModeRef = useRef(false);
  sectionMeasureModeRef.current = sectionMeasureMode;
  const sectionMeasureRef = useRef<SectionMeasureModel>(EMPTY_SECTION_MEASURE);
  const [sectionMeasureResult, setSectionMeasureResult] = useState<ReturnType<typeof sectionMeasurement> | null>(null);
  const [sectionMeasureOverlay, setSectionMeasureOverlay] = useState<SectionMeasureOverlayState | null>(null);
  const sectionMeasureOverlayRef = useRef<SectionMeasureOverlayState | null>(null);
  // Mitte des Feinreglers: folgt jeder Aenderung, die nicht vom Feinregler selbst kommt.
  const [sectionFineAnchor, setSectionFineAnchor] = useState(DEFAULT_SECTION_SETTINGS.offset);
  // The section position as typed, until Enter or leaving the field takes it (#210); Escape drops it.
  const [sectionOffsetDraft, setSectionOffsetDraft] = useState<string | null>(null);
  const sectionOffsetCancelRef = useRef(false);
  const sectionFineDraggingRef = useRef(false);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const threeRef = useRef<ThreeState | null>(null);
  const shapesRef = useRef(shapes);
  const alignReferenceShapesRef = useRef(alignReferenceShapes);
  const mirrorReferenceShapesRef = useRef(mirrorReferenceShapes);
  const selectedIdsRef = useRef(selectedIds);
  const dragRef = useRef<DragState | null>(null);
  /**
   * Die Finger, die gerade auf der Arbeitsflaeche liegen.
   *
   * Ein Finger meldet sich dem Browser als **linke Maustaste**, und die
   * gehoert hier dem Auswaehlen und Ziehen. Drehen liegt auf der rechten,
   * Schieben auf der mittleren Taste - die es auf einem Tablet beide nicht
   * gibt. Deshalb zaehlen wir die Finger selbst: Beim zweiten geht die
   * Arbeitsflaeche an die Kamera, und dort heisst spreizen zoomen und
   * gemeinsam schieben verschieben.
   */
  const touchPointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const rightPressRef = useRef<{ x: number; y: number } | null>(null);
  /** Solange wahr, gehoert jeder Finger der Kamera und nichts wird ausgewaehlt. */
  const cameraTouchRef = useRef(false);
  const touchRotateRef = useRef(false);
  const moveDimensionSessionRef = useRef<MoveDimensionSession | null>(null);
  const moveDimensionOverlayRef = useRef<MoveDimensionOverlayState | null>(null);
  const moveDimensionsEnabledRef = useRef(true);
  const originDimensionOverlayRef = useRef<OriginDimensionOverlayData | null>(null);
  const originDimensionsEnabledRef = useRef(true);
  const marqueeRef = useRef<MarqueeState | null>(null);
  const transformRef = useRef<TransformDragState | null>(null);
  const lastResizeAnchorRef = useRef<ResizeAnchorMemory | null>(null);
  const [bentTubeSegment, setBentTubeSegment] = useState<{ shapeId: string; index: number } | null>(null);
  const changeBentTubeSegment = useCallback((shapeId: string, index: number | null) => {
    setBentTubeSegment((current) => {
      if (index === null) return current && current.shapeId === shapeId ? null : current;
      return current && current.shapeId === shapeId && current.index === index ? current : { shapeId, index };
    });
  }, []);
  const [pointCardOffset, setPointCardOffset] = useState<PointCardOffset>({ x: 0, y: 0 });
  const changePointCardOffset = useCallback((offset: PointCardOffset, final: boolean) => {
    setPointCardOffset(offset);
    if (!final) return;
    try {
      window.localStorage.setItem(POINT_CARD_OFFSET_STORAGE_KEY, JSON.stringify(offset));
    } catch {
      // The card keeps its place for this session when storage is unavailable.
    }
  }, []);
  const [proportionLock, setProportionLock] = useState(false);
  const proportionLockRef = useRef(false);
  useEffect(() => {
    setPointCardOffset(readPointCardOffset());
  }, []);
  useEffect(() => {
    const stored = readProportionLock();
    proportionLockRef.current = stored;
    setProportionLock(stored);
  }, []);
  const changeProportionLock = useCallback((locked: boolean) => {
    proportionLockRef.current = locked;
    setProportionLock(locked);
    try {
      window.localStorage.setItem(PROPORTION_LOCK_STORAGE_KEY, String(locked));
    } catch {
      // The lock still applies to this editor session when storage is unavailable.
    }
  }, []);
  const suppressNextLiftEditRef = useRef(false);
  const suppressNextCornerEditRef = useRef(false);
  const snapRef = useRef(snap);
  const workspaceRef = useRef(workspace);
  const workspaceSettingsKeyRef = useRef(workspaceSettingsKey ?? null);
  const lastWorkspaceSettingsSyncRef = useRef("");
  const pendingWorkspaceHydrationFingerprintRef = useRef<string | null>(null);
  const viewCubeRef = useRef<HTMLDivElement | null>(null);
  // Dragging the view cube orbits the camera; a press that never passes the
  // drag threshold stays a click so the faces keep snapping to their views.
  const viewCubeDragRef = useRef<ViewCubeDrag | null>(null);
  const suppressViewCubeClickRef = useRef(false);
  const [viewCubeDragging, setViewCubeDragging] = useState(false);
  // Der Umschalter fuer das Drehen mit einem Finger steht nur dort, wo er
  // gebraucht wird. Anfangs falsch, damit das ausgelieferte HTML passt.
  const [touchDevice, setTouchDevice] = useState(false);
  const [touchRotate, setTouchRotate] = useState(false);
  const transformOverlayRef = useRef<TransformOverlayState | null>(null);
  const alignOverlayRef = useRef<AlignOverlayState | null>(null);
  const mirrorOverlayRef = useRef<MirrorOverlayState | null>(null);
  const tapeModeRef = useRef(false);
  const tapeDeleteModeRef = useRef(false);
  const tapeMoveModeRef = useRef(false);
  const tapePointDragRef = useRef<TapePointDragState | null>(null);
  const tapeModelRef = useRef(tapeModel);
  const notesRef = useRef(notes);
  const noteModeRef = useRef(noteMode);
  const rotationPivotRef = useRef<PivotPoint | null>(rotationPivot);
  const pivotPickModeRef = useRef(pivotPickMode);
  const layFlatPickModeRef = useRef(layFlatPickMode);
  layFlatPickModeRef.current = layFlatPickMode;
  const mateFacePickRef = useRef(mateFacePick);
  mateFacePickRef.current = mateFacePick;
  const notesVisibleRef = useRef(notesVisible);
  const noteOverlayRef = useRef<NoteOverlayState | null>(null);
  const noteDragRef = useRef<NoteDragState | null>(null);
  const noteClickSuppressedRef = useRef<string | null>(null);
  const tapeOverlayRef = useRef<TapeOverlayState | null>(null);
  const tapeIdRef = useRef(0);
  const rulerDimensionOverlayRef = useRef<RulerDimensionOverlayState | null>(null);
  const cornerRulerModeRef = useRef(false);
  const cornerRulerModelRef = useRef<CornerRulerInstance[]>([]);
  const cornerRulerOverlayRef = useRef<CornerRulerOverlayState | null>(null);
  const cornerRulerIdRef = useRef(0);
  const cornerRulerDragRef = useRef<{ id: string; pointerId: number; moved: boolean } | null>(null);
  const rulerDuplicateDragRef = useRef<{ pointerId: number; rulerId: string; shapeId: string; baseAlong: number; planeY: number; sourceX: number; sourceZ: number } | null>(null);
  const alignModeRef = useRef(alignMode);
  const alignAnchorIdRef = useRef(alignAnchorId);
  const alignHandlesRef = useRef(alignHandles);
  const mirrorModeRef = useRef(mirrorMode);
  const modifierActiveRef = useRef(modifierActive);
  const modifierPreviewActiveRef = useRef(modifierPreviewActive);
  const modifierEdgesRef = useRef(modifierEdges);
  const [hoverModifierEdgeId, setHoverModifierEdgeId] = useState<number | null>(null);
  const selectedIdsKeyRef = useRef(selectedIds.join("|"));
  const placementWorkplaneRef = useRef(placementWorkplane);
  const prepareNewShapeRef = useRef(prepareNewShape);
  prepareNewShapeRef.current = prepareNewShape;
  const cruiseAssetRef = useRef<ShapeAsset | null>(cruiseAsset);
  const carryIdsRef = useRef<string[] | null>(carryIds);
  carryIdsRef.current = carryIds;
  const onCarryDropRef = useRef(onCarryDrop);
  onCarryDropRef.current = onCarryDrop;
  // The parts as they stood when C picked them up: the preview turns and moves these.
  const carryStartRef = useRef<WorkplaneShape[]>([]);
  const pickPlacementSurfaceRef = useRef<((clientX: number, clientY: number, reverse: boolean, skip?: ReadonlySet<string>) => {
    point: THREE.Vector3; normal: THREE.Vector3; workplane: PlacementWorkplane; shapeId: string;
  } | null) | null>(null);
  const cruisePreviewRef = useRef<{ object: THREE.Group; shape: WorkplaneShape } | null>(null);
  const cruisePointerRef = useRef<{ x: number; y: number } | null>(null);
  cruiseAssetRef.current = cruiseAsset;
  const projectNameRef = useRef(projectName);
  const projectIdRef = useRef(projectId);
  projectIdRef.current = projectId;
  const designViewRestoredRef = useRef(false);
  const designViewReadyRef = useRef(false);
  const workplaneModeRef = useRef(workplaneMode);
  const splitActiveRef = useRef(splitActive);
  const splitPlaneRef = useRef(splitPlane);
  placementWorkplaneRef.current = placementWorkplane;
  const workplaneHiddenRef = useRef(workplaneHidden);
  workplaneHiddenRef.current = workplaneHidden;
  // Ausgeblendet zeichnet die Szene nur die Grundplatte; Platzieren, Drehen
  // und Verschieben richten sich weiter nach der gesetzten Ebene.
  const drawnWorkplane = () => (workplaneHiddenRef.current ? horizontalPlacementWorkplane() : placementWorkplaneRef.current);
  workplaneModeRef.current = workplaneMode;
  splitActiveRef.current = splitActive;
  splitPlaneRef.current = splitPlane;
  const onSplitPositionChangeRef = useRef(onSplitPositionChange);
  onSplitPositionChangeRef.current = onSplitPositionChange;
  const splitSurfacePickRef = useRef(splitSurfacePick);
  splitSurfacePickRef.current = splitSurfacePick;
  const onSplitSurfacePickRef = useRef(onSplitSurfacePick);
  onSplitSurfacePickRef.current = onSplitSurfacePick;
  const [splitPickOverFace, setSplitPickOverFace] = useState(false);
  const splitDragRef = useRef<SplitPlaneDragState | null>(null);
  const [splitHandleState, setSplitHandleState] = useState<"hover" | "drag" | null>(null);
  const perfRef = useRef({
    fps: 0,
    frameMs: 0,
    maxFrameMs: 0,
    frames: 0,
    lastSample: 0,
  });

  const selectedShape = useMemo(() => (selectedIds.length === 1 ? shapes.find((shape) => shape.id === selectedIds[0]) ?? null : null), [selectedIds, shapes]);
  useEffect(() => {
    syncBentTubeSegment(threeRef.current, selectedShape, bentTubeSegment);
  }, [bentTubeSegment, selectedShape]);
  const renderSelectionIds = useCallback(
    (ids = selectedIdsRef.current) => (
      workplaneModeRef.current || splitActiveRef.current || (modifierActiveRef.current && !modifierPreviewActiveRef.current) ? [] : ids
    ),
    [],
  );
  /**
   * Die ausgewaehlten Formen, solange gerade nichts anderes den Bildschirm
   * belegt - siehe layerling-lineal.md. Mehrere zaehlen zusammen wie ein
   * Koerper: gemessen wird ihre gemeinsame Umrissbox, wie in Tinkercad.
   */
  const originDimensionShapeFor = useCallback(
    (shapesList: WorkplaneShape[], ids = selectedIdsRef.current) => {
      if (!originDimensionsEnabledRef.current) return null;
      const rendered = renderSelectionIds(ids);
      if (rendered.length === 0) return null;
      if (alignModeRef.current || mirrorModeRef.current) return null;
      if (tapeModeRef.current || tapeDeleteModeRef.current || tapeMoveModeRef.current) return null;
      if (transformRef.current || dragRef.current) return null;
      const wanted = new Set(rendered);
      const selected = shapesList.filter((shape) => wanted.has(shape.id) && !shape.hidden);
      return selected.length ? selected : null;
    },
    [renderSelectionIds],
  );

  useEffect(() => {
    modifierEdgesRef.current = modifierEdges;
    rebuildModifierEdges(threeRef.current, modifierEdges, selectedModifierEdgeIds, modifierPreviewActive, hoverModifierEdgeId, modifierHighlightedEdgeIds);
  }, [hoverModifierEdgeId, modifierEdges, modifierHighlightedEdgeIds, modifierPreviewActive, selectedModifierEdgeIds]);

  const resolvedThemeRef = useRef(resolvedTheme);
  resolvedThemeRef.current = resolvedTheme;
  const themePaletteRef = useRef(appThemePalette(themePreference));
  themePaletteRef.current = appThemePalette(themePreference);

  const clearMoveDimensions = useCallback(() => {
    moveDimensionSessionRef.current = null;
    moveDimensionOverlayRef.current = null;
    setMoveDimensionOverlay(null);
    if (threeRef.current) {
      syncMoveDimensionWorldLines(threeRef.current, null, resolvedThemeRef.current);
    }
  }, []);

  useEffect(() => {
    const applyStoredPreference = () => {
      const enabled = readMoveDimensionsEnabled();
      moveDimensionsEnabledRef.current = enabled;
      setMoveDimensionsEnabled(enabled);
      if (!enabled) {
        clearMoveDimensions();
      }
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === MOVE_DIMENSIONS_ENABLED_STORAGE_KEY) {
        applyStoredPreference();
      }
    };
    applyStoredPreference();
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [clearMoveDimensions]);

  const changeMoveDimensionsEnabled = useCallback((enabled: boolean) => {
    moveDimensionsEnabledRef.current = enabled;
    setMoveDimensionsEnabled(enabled);
    try {
      window.localStorage.setItem(MOVE_DIMENSIONS_ENABLED_STORAGE_KEY, String(enabled));
    } catch {
      // The preference still applies to this editor session when storage is unavailable.
    }
    if (!enabled) {
      clearMoveDimensions();
    }
  }, [clearMoveDimensions]);

  const clearOriginDimensions = useCallback(() => {
    originDimensionOverlayRef.current = null;
    setOriginDimensionOverlay(null);
    if (threeRef.current) {
      syncOriginDimensionWorldLines(threeRef.current, null, resolvedThemeRef.current);
    }
  }, []);

  /** Beim Wiedereinschalten soll eine bereits ausgewaehlte Form sofort wieder ihre Bemassung zeigen, nicht erst bei der naechsten Auswahl. */
  const refreshOriginDimensions = useCallback(() => {
    if (!threeRef.current) return;
    syncOriginDimensionOverlay(
      threeRef.current,
      originDimensionShapeFor(shapesRef.current),
      placementWorkplaneRef.current,
      workspaceRef.current.accuracy,
      resolvedThemeRef.current,
      originDimensionOverlayRef,
      setOriginDimensionOverlay,
    );
    threeRef.current.needsRender = true;
  }, [originDimensionShapeFor]);

  useEffect(() => {
    const applyStoredPreference = () => {
      const enabled = readOriginDimensionsEnabled();
      originDimensionsEnabledRef.current = enabled;
      setOriginDimensionsEnabled(enabled);
      if (!enabled) {
        clearOriginDimensions();
      } else {
        refreshOriginDimensions();
      }
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === ORIGIN_DIMENSIONS_ENABLED_STORAGE_KEY) {
        applyStoredPreference();
      }
    };
    applyStoredPreference();
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [clearOriginDimensions, refreshOriginDimensions]);

  const changeStartInPerspective = useCallback((perspective: boolean) => {
    setStartInPerspective(perspective);
    try {
      window.localStorage.setItem(START_IN_PERSPECTIVE_STORAGE_KEY, String(perspective));
    } catch {
      // Without storage the next design still opens the way it always did.
    }
  }, []);

  const changeOriginDimensionsEnabled = useCallback((enabled: boolean) => {
    originDimensionsEnabledRef.current = enabled;
    setOriginDimensionsEnabled(enabled);
    try {
      window.localStorage.setItem(ORIGIN_DIMENSIONS_ENABLED_STORAGE_KEY, String(enabled));
    } catch {
      // The preference still applies to this editor session when storage is unavailable.
    }
    if (!enabled) {
      clearOriginDimensions();
    } else {
      refreshOriginDimensions();
    }
  }, [clearOriginDimensions, refreshOriginDimensions]);

  const commitMoveDimension = useCallback(
    (axis: MoveDimensionAxis, rawValue: string) => {
      const session = moveDimensionSessionRef.current;
      // A typed Y move counts towards the back (#182); inside it moves along minus z.
      const typed = parseMeasureMm(rawValue);
      const value = axis === "z" ? insideZ(typed) : typed;
      if (!session || !Number.isFinite(value)) {
        return;
      }

      const workspaceNow = workspaceRef.current;
      const starts = session.items.map((item) => axis === "x" ? item.startX : item.startZ);
      const workspaceExtent = axis === "x" ? workspaceNow.width : workspaceNow.depth;
      const minimumDelta = Math.max(...starts.map((start) => -workspaceExtent / 2 + 6 - start));
      const maximumDelta = Math.min(...starts.map((start) => workspaceExtent / 2 - 6 - start));
      const nextValue = clamp(value, minimumDelta, maximumDelta);
      if (axis === "x") {
        session.deltaX = nextValue;
      } else {
        session.deltaZ = nextValue;
      }

      onInteractionActiveChange?.(true);
      session.items.forEach((item) => {
        onUpdateShape(item.id, {
          x: item.startX + session.deltaX,
          z: item.startZ + session.deltaZ,
        });
      });
      onInteractionActiveChange?.(false);
      if (threeRef.current) {
        syncMoveDimensionOverlay(
          threeRef.current,
          session,
          moveDimensionOverlayRef,
          setMoveDimensionOverlay,
          workspaceNow.accuracy,
          resolvedThemeRef.current,
        );
        threeRef.current.needsRender = true;
      }
    },
    [onInteractionActiveChange, onUpdateShape],
  );

  const rememberResizeAnchor = useCallback((shapeId: string, kind: TransformHandleKind, handleKey: string) => {
    if (kind === "scale") {
      const signs = resizeSignsForHandle(handleKey);
      if (signs.x || signs.z) {
        lastResizeAnchorRef.current = { shapeId, handleKey, signs, pressedY: null };
      }
      return;
    }
    if (kind === "height") {
      lastResizeAnchorRef.current = {
        shapeId,
        handleKey,
        signs: { x: 0, z: 0 },
        pressedY: handleKey === "bottom-height" ? "bottom" : "top",
      };
    }
  }, []);

  useLayoutEffect(() => {
    const nextKey = workspaceSettingsKey ?? null;
    if (workspaceSettingsKeyRef.current !== nextKey) {
      workspaceSettingsKeyRef.current = nextKey;
      lastWorkspaceSettingsSyncRef.current = "";
    }
    const shouldUseSavedDefault = nextKey === "local-workplane" || (initialSnap === undefined && initialWorkspace === undefined);
    const savedDefault = shouldUseSavedDefault ? readSavedWorkspaceDefault(nextKey) : null;
    const nextWorkspace = savedDefault?.workspace ?? normalizeWorkspaceSettings(initialWorkspace);
    // Settings saved before the inch steps existed pair Imperial with a
    // millimetre step, which the unit's own list does not offer.
    const nextSnap = snapGridForUnits(nextWorkspace.units, savedDefault?.snap ?? normalizeSnapGrid(initialSnap, DEFAULT_SNAP_GRID));
    const nextFingerprint = workplaneSettingsFingerprint(nextWorkspace, nextSnap);
    // Prop hydration must not echo back to the parent. Parent persistence creates
    // new object references even when the values are unchanged, which previously
    // caused this effect and its callback effect to update each other indefinitely.
    lastWorkspaceSettingsSyncRef.current = nextFingerprint;
    pendingWorkspaceHydrationFingerprintRef.current = nextFingerprint;
    snapRef.current = nextSnap;
    workspaceRef.current = nextWorkspace;
    setMeasureUnit(nextWorkspace);
    if (threeRef.current) {
      rebuildWorkplane(threeRef.current, nextWorkspace, resolvedThemeRef.current, drawnWorkplane(), projectNameRef.current);
      constrainCamera(threeRef.current, nextWorkspace);
      threeRef.current.needsRender = true;
    }
    setSnap((current) => (current === nextSnap ? current : nextSnap));
    setWorkspace((current) => (
      workplaneSettingsFingerprint(current, nextSnap) === nextFingerprint ? current : nextWorkspace
    ));
  }, [initialSnap, initialWorkspace, workspaceSettingsKey]);

  useEffect(() => {
    const normalizedWorkspace = normalizeWorkspaceSettings(workspace);
    const normalizedSnap = normalizeSnapGrid(snap, DEFAULT_SNAP_GRID);
    const fingerprint = workplaneSettingsFingerprint(normalizedWorkspace, normalizedSnap);
    const hydrationDecision = workspaceHydrationSyncDecision(pendingWorkspaceHydrationFingerprintRef.current, fingerprint);
    pendingWorkspaceHydrationFingerprintRef.current = hydrationDecision.pendingFingerprint;
    if (!hydrationDecision.shouldSync) {
      return;
    }
    if (lastWorkspaceSettingsSyncRef.current === fingerprint) {
      return;
    }
    lastWorkspaceSettingsSyncRef.current = fingerprint;
    onWorkspaceSettingsChange?.({ workspace: normalizedWorkspace, snap: normalizedSnap });
  }, [onWorkspaceSettingsChange, snap, workspace]);

  /**
   * Snap grid picked from a control, as opposed to hydrated from the project.
   *
   * The effect above suppresses one sync after hydration so the freshly loaded
   * settings are not echoed straight back. On mount that suppression is armed
   * but never spent, because `snap` is already seeded from `initialSnap` and
   * hydration therefore changes no state and never triggers the effect. The
   * first choice a user made was swallowed with it, leaving the editor — and
   * the project file — on the previous grid until some unrelated change
   * happened to clear the guard. A choice is never a hydration echo, so
   * disarm the guard before recording it.
   */
  const chooseSnapGrid = useCallback<Dispatch<SetStateAction<GridSize>>>((value) => {
    pendingWorkspaceHydrationFingerprintRef.current = null;
    setSnap(value);
  }, []);
  /** Same as the grid: switched from the snap menu, so never a hydration echo. */
  const changeObjectSnap = useCallback((objectSnap: boolean) => {
    pendingWorkspaceHydrationFingerprintRef.current = null;
    setWorkspace((current) => ({ ...current, objectSnap }));
  }, []);

  const makeWorkspaceDefault = useCallback(() => {
    const normalizedWorkspace = normalizeWorkspaceSettings(workspace);
    const normalizedSnap = normalizeSnapGrid(snap, DEFAULT_SNAP_GRID);
    // Project persistence below is still attempted if browser storage is unavailable.
    saveWorkspaceDefault(normalizedWorkspace, normalizedSnap);
    onWorkspaceSettingsChange?.({ workspace: normalizedWorkspace, snap: normalizedSnap });
  }, [onWorkspaceSettingsChange, snap, workspace]);

  useEffect(() => {
    const openWorkspaceSettings = () => setSettingsOpen(true);
    window.addEventListener("layerling:open-workspace-settings", openWorkspaceSettings);
    return () => window.removeEventListener("layerling:open-workspace-settings", openWorkspaceSettings);
  }, []);

  useEffect(() => {
    shapesRef.current = shapes;
    rebuildShapes(
      threeRef.current,
      shapes,
      renderSelectionIds(),
      modifierActiveRef.current,
      placementWorkplaneRef.current,
    );
    refreshDragPreviewObjects(threeRef.current, dragRef.current);
    if (threeRef.current) {
      syncTransformOverlay(
        threeRef.current,
        previewShapesForDrag(shapes, dragRef.current),
        renderSelectionIds(),
        transformOverlayRef,
        setTransformOverlay,
        workspaceRef.current.accuracy,
        Boolean(transformRef.current || dragRef.current),
        false,
        placementWorkplaneRef.current,
        resolvedThemeRef.current,
        workspaceRef.current.dimensionsAlwaysVisible,
      );
      syncAlignOverlay(threeRef.current, alignReferenceShapesRef.current, selectedIdsRef.current, alignModeRef.current, alignAnchorIdRef.current, alignHandlesRef.current, alignOverlayRef, setAlignOverlay);
      syncMirrorOverlay(threeRef.current, mirrorReferenceShapesRef.current, selectedIdsRef.current, mirrorModeRef.current, mirrorOverlayRef, setMirrorOverlay);
      syncRulerDimensionOverlay(threeRef.current, shapes, rulerDimensionOverlayRef, setRulerDimensionOverlay, workspaceRef.current.accuracy);
      syncCornerRulerToolOverlay(threeRef.current, cornerRulerModelRef.current, shapes, selectedIdsRef.current, cornerRulerOverlayRef, setCornerRulerOverlay, workspaceRef.current.accuracy);
      syncOriginDimensionOverlay(
        threeRef.current,
        originDimensionShapeFor(shapes),
        placementWorkplaneRef.current,
        workspaceRef.current.accuracy,
        resolvedThemeRef.current,
        originDimensionOverlayRef,
        setOriginDimensionOverlay,
      );
      threeRef.current.needsRender = true;
    }
  }, [shapes]);

  useEffect(() => {
    alignReferenceShapesRef.current = alignReferenceShapes;
    if (threeRef.current) {
      syncAlignOverlay(threeRef.current, alignReferenceShapes, selectedIdsRef.current, alignModeRef.current, alignAnchorIdRef.current, alignHandlesRef.current, alignOverlayRef, setAlignOverlay);
      syncMirrorOverlay(threeRef.current, mirrorReferenceShapesRef.current, selectedIdsRef.current, mirrorModeRef.current, mirrorOverlayRef, setMirrorOverlay);
      threeRef.current.needsRender = true;
    }
  }, [alignReferenceShapes]);

  // Without this the mirror arrows keep measuring the shapes the viewport
  // was mounted with - anything added later has no frame and no arrows.
  useEffect(() => {
    mirrorReferenceShapesRef.current = mirrorReferenceShapes;
    if (threeRef.current) {
      syncMirrorOverlay(threeRef.current, mirrorReferenceShapes, selectedIdsRef.current, mirrorModeRef.current, mirrorOverlayRef, setMirrorOverlay);
      threeRef.current.needsRender = true;
    }
  }, [mirrorReferenceShapes]);

  useEffect(() => {
    alignModeRef.current = alignMode;
    mirrorModeRef.current = mirrorMode;
    tapeModeRef.current = tapeMode;
    tapeDeleteModeRef.current = tapeDeleteMode;
    tapeMoveModeRef.current = tapeMoveMode;
    const nextSelectedIdsKey = selectedIds.join("|");
    if (nextSelectedIdsKey !== selectedIdsKeyRef.current) {
      selectedIdsKeyRef.current = nextSelectedIdsKey;
      if (!dragRef.current) {
        clearMoveDimensions();
      }
      lastResizeAnchorRef.current = null;
      setHoverMeasureKey(null);
      setPinnedMeasureKey(null);
      setEditingDimension(null);
      setEditingRotation(null);
      setEditingCorner(null);
      setRotationReadout(null);
      setActiveRotationWheel(false);
      setActiveTransformKind(null);
    }
    selectedIdsRef.current = selectedIds;
    rebuildShapes(
      threeRef.current,
      shapesRef.current,
      renderSelectionIds(selectedIds),
      modifierActiveRef.current,
      placementWorkplaneRef.current,
    );
    refreshDragPreviewObjects(threeRef.current, dragRef.current);
    if (threeRef.current) {
      syncTransformOverlay(
        threeRef.current,
        previewShapesForDrag(shapesRef.current, dragRef.current),
        renderSelectionIds(selectedIds),
        transformOverlayRef,
        setTransformOverlay,
        workspaceRef.current.accuracy,
        Boolean(transformRef.current || dragRef.current),
        false,
        placementWorkplaneRef.current,
        resolvedThemeRef.current,
        workspaceRef.current.dimensionsAlwaysVisible,
      );
      syncAlignOverlay(threeRef.current, alignReferenceShapesRef.current, selectedIds, alignModeRef.current, alignAnchorIdRef.current, alignHandlesRef.current, alignOverlayRef, setAlignOverlay);
      syncMirrorOverlay(threeRef.current, mirrorReferenceShapesRef.current, selectedIds, mirrorModeRef.current, mirrorOverlayRef, setMirrorOverlay);
      syncCornerRulerToolOverlay(threeRef.current, cornerRulerModelRef.current, shapesRef.current, selectedIds, cornerRulerOverlayRef, setCornerRulerOverlay, workspaceRef.current.accuracy);
      syncOriginDimensionOverlay(
        threeRef.current,
        originDimensionShapeFor(shapesRef.current, selectedIds),
        placementWorkplaneRef.current,
        workspaceRef.current.accuracy,
        resolvedThemeRef.current,
        originDimensionOverlayRef,
        setOriginDimensionOverlay,
      );
      threeRef.current.needsRender = true;
    }
  }, [clearMoveDimensions, selectedIds]);

  useEffect(() => {
    modifierActiveRef.current = modifierActive;
    if (!modifierActive) setHoverModifierEdgeId(null);
    rebuildShapes(
      threeRef.current,
      shapesRef.current,
      renderSelectionIds(),
      modifierActive,
      placementWorkplaneRef.current,
    );
    if (threeRef.current) threeRef.current.needsRender = true;
  }, [modifierActive, renderSelectionIds]);

  useEffect(() => {
    modifierPreviewActiveRef.current = modifierPreviewActive;
    rebuildShapes(
      threeRef.current,
      shapesRef.current,
      renderSelectionIds(),
      modifierActiveRef.current,
      placementWorkplaneRef.current,
    );
    if (threeRef.current) threeRef.current.needsRender = true;
  }, [modifierPreviewActive, renderSelectionIds]);

  useEffect(() => {
    if (hoverModifierEdgeId !== null && !modifierEdges.some((edge) => edge.id === hoverModifierEdgeId)) {
      setHoverModifierEdgeId(null);
    }
  }, [hoverModifierEdgeId, modifierEdges]);

  useEffect(() => {
    alignModeRef.current = alignMode;
    alignAnchorIdRef.current = alignAnchorId;
    alignHandlesRef.current = alignHandles;
    if (threeRef.current) {
      syncAlignOverlay(threeRef.current, alignReferenceShapesRef.current, selectedIdsRef.current, alignMode, alignAnchorId, alignHandles, alignOverlayRef, setAlignOverlay);
      threeRef.current.needsRender = true;
    }
  }, [alignAnchorId, alignHandles, alignMode]);

  useEffect(() => {
    mirrorModeRef.current = mirrorMode;
    if (threeRef.current) {
      syncMirrorOverlay(threeRef.current, mirrorReferenceShapesRef.current, selectedIdsRef.current, mirrorMode, mirrorOverlayRef, setMirrorOverlay);
      threeRef.current.needsRender = true;
    }
  }, [mirrorMode]);

  useEffect(() => {
    snapRef.current = snap;
  }, [snap]);

  useEffect(() => {
    tapeModeRef.current = tapeMode;
  }, [tapeMode]);

  useEffect(() => {
    tapeDeleteModeRef.current = tapeDeleteMode;
  }, [tapeDeleteMode]);

  useEffect(() => {
    tapeMoveModeRef.current = tapeMoveMode;
  }, [tapeMoveMode]);

  useEffect(() => {
    tapeModelRef.current = tapeModel;
    if (threeRef.current) {
      syncTapeOverlay(threeRef.current, tapeModel, tapeOverlayRef, setTapeOverlay, workspaceRef.current.accuracy);
      threeRef.current.needsRender = true;
    }
  }, [tapeModel]);

  useEffect(() => {
    overhangUniforms.uOverhangOn.value = showOverhangs ? 1 : 0;
    overhangUniforms.uOverhangLimit.value = overhangDownwardLimit(workspace.overhangAngle);
    if (threeRef.current) threeRef.current.needsRender = true;
  }, [showOverhangs, workspace.overhangAngle]);

  useEffect(() => {
    if (!sectionSettings.enabled) setSectionMeasureMode(false);
  }, [sectionSettings.enabled]);

  useEffect(() => {
    const { axis, offset } = sectionSettings;
    const current = sectionMeasureRef.current;
    if (current.axis !== axis || current.offset !== offset) {
      // A measurement belongs to its plane.
      sectionMeasureRef.current = { ...EMPTY_SECTION_MEASURE, axis, offset, loops: [] };
      setSectionMeasureResult(null);
    }
    if (!sectionMeasureMode || !sectionSettings.enabled || !onSectionContours) {
      if (threeRef.current) threeRef.current.needsRender = true;
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      onSectionContours(axis, offset)
        .then((loops) => {
          if (cancelled) return;
          const model = sectionMeasureRef.current;
          if (model.axis !== axis || model.offset !== offset) return;
          sectionMeasureRef.current = { ...model, loops };
          if (threeRef.current) threeRef.current.needsRender = true;
        })
        .catch(() => undefined);
    }, 150);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [sectionMeasureMode, sectionSettings, shapes, onSectionContours]);

  useEffect(() => {
    notesRef.current = notes;
    notesVisibleRef.current = notesVisible;
    if (threeRef.current) {
      syncNoteOverlay(threeRef.current, notes, notesVisible, noteOverlayRef, setNoteOverlay);
      threeRef.current.needsRender = true;
    }
  }, [notes, notesVisible]);

  useEffect(() => {
    noteModeRef.current = noteMode;
  }, [noteMode]);

  useEffect(() => {
    pivotPickModeRef.current = pivotPickMode;
  }, [pivotPickMode]);

  useEffect(() => {
    if (!layFlatPickMode && !mateFacePick) syncLayFlatHover(threeRef.current, [], resolvedThemeRef.current, null, null);
  }, [layFlatPickMode, mateFacePick]);

  useLayoutEffect(() => {
    rotationPivotRef.current = rotationPivot;
    const state = threeRef.current;
    if (!state) return;
    state.rotationPivot = pivotVector(rotationPivot);
    syncTransformOverlay(
      state,
      shapesRef.current,
      renderSelectionIds(),
      transformOverlayRef,
      setTransformOverlay,
      workspaceRef.current.accuracy,
      Boolean(transformRef.current || dragRef.current),
      false,
      placementWorkplaneRef.current,
      resolvedThemeRef.current,
      workspaceRef.current.dimensionsAlwaysVisible,
    );
    state.needsRender = true;
  }, [renderSelectionIds, rotationPivot]);

  useLayoutEffect(() => {
    const state = threeRef.current;
    rebuildShapes(
      state,
      shapesRef.current,
      renderSelectionIds(),
      modifierActiveRef.current,
      placementWorkplaneRef.current,
    );
    if (state) {
      syncTransformOverlay(
        state,
        shapesRef.current,
        renderSelectionIds(),
        transformOverlayRef,
        setTransformOverlay,
        workspaceRef.current.accuracy,
        Boolean(transformRef.current || dragRef.current),
        false,
        placementWorkplaneRef.current,
        resolvedThemeRef.current,
        workspaceRef.current.dimensionsAlwaysVisible,
      );
    }
    setSelectionHelpersVisible(state, !splitActive && !workplaneMode && transformRef.current?.kind !== "rotate");
    if (state) {
      state.modifierLayer.visible = !workplaneMode && !splitActive;
      state.moveDimensionLayer.visible = !workplaneMode && !splitActive;
      state.originDimensionLayer.visible = !workplaneMode && !splitActive;
      state.needsRender = true;
    }
    if (splitActive || workplaneMode) {
      clearMoveDimensions();
      setMarqueeRect(null);
      setHoverMeasureKey(null);
      setPinnedMeasureKey(null);
      setEditingDimension(null);
      setEditingRotation(null);
      setEditingCorner(null);
      setRotationReadout(null);
      setActiveRotationWheel(false);
      setActiveTransformKind(null);
      setPinnedRotationWheelView(null);
    }
    if (!workplaneMode) {
      syncWorkplaneHoverPreview(threeRef.current, null, workspaceRef.current, resolvedThemeRef.current);
    }
  }, [clearMoveDimensions, renderSelectionIds, splitActive, workplaneMode]);

  useEffect(() => {
    if (splitActive) return;
    setSplitHandleState(null);
    if (!splitDragRef.current) return;
    splitDragRef.current = null;
    if (threeRef.current) threeRef.current.controls.enabled = true;
    onInteractionActiveChange?.(false);
  }, [onInteractionActiveChange, splitActive]);

  useEffect(() => {
    if (splitSurfacePick) {
      setSplitHandleState(null);
      return;
    }
    setSplitPickOverFace(false);
    if (!workplaneModeRef.current) {
      syncWorkplaneHoverPreview(threeRef.current, null, workspaceRef.current, resolvedThemeRef.current);
    }
  }, [splitSurfacePick]);

  useEffect(() => {
    syncSplitPlane(threeRef.current, splitPlane, splitHandleState !== null);
  }, [splitHandleState, splitPlane]);

  useLayoutEffect(() => {
    // The plane label carries the project name, so a rename has to redraw it.
    projectNameRef.current = projectName;
    workspaceRef.current = workspace;
    setMeasureUnit(workspace);
    if (threeRef.current) threeRef.current.palette = appThemePalette(themePreference);
    // Edge lines on all bodies: shapes already built have to take the setting up.
    if (setEdgeLineStyle(effectiveViewSettings(workspace).edgeLines, workspace.edgeColor)) {
      rebuildShapes(threeRef.current, shapesRef.current, renderSelectionIds(), modifierActiveRef.current, placementWorkplaneRef.current);
    }
    rebuildWorkplane(threeRef.current, workspace, resolvedTheme, workplaneHidden ? horizontalPlacementWorkplane() : placementWorkplane, projectName);
    rebuildSelectionHelpers(threeRef.current, shapesRef.current, renderSelectionIds(), placementWorkplane);
    if (threeRef.current) {
      syncTransformOverlay(
        threeRef.current,
        shapesRef.current,
        renderSelectionIds(),
        transformOverlayRef,
        setTransformOverlay,
        workspace.accuracy,
        Boolean(transformRef.current || dragRef.current),
        false,
        placementWorkplaneRef.current,
        resolvedThemeRef.current,
        workspace.dimensionsAlwaysVisible,
      );
      syncTapeOverlay(threeRef.current, tapeModelRef.current, tapeOverlayRef, setTapeOverlay, workspace.accuracy);
      syncRulerDimensionOverlay(threeRef.current, shapesRef.current, rulerDimensionOverlayRef, setRulerDimensionOverlay, workspace.accuracy);
      syncCornerRulerToolOverlay(threeRef.current, cornerRulerModelRef.current, shapesRef.current, selectedIdsRef.current, cornerRulerOverlayRef, setCornerRulerOverlay, workspace.accuracy);
      syncNoteOverlay(threeRef.current, notesRef.current, notesVisibleRef.current, noteOverlayRef, setNoteOverlay);
      syncMoveDimensionWorldLines(threeRef.current, moveDimensionSessionRef.current, resolvedTheme);
      threeRef.current.needsRender = true;
    }
  }, [language, placementWorkplane, projectName, resolvedTheme, themePreference, workplaneHidden, workspace]);

  useEffect(() => {
    const state = threeRef.current;
    if (!state) return;
    state.workplaneLayer.visible = !workplaneLayerHidden;
    state.needsRender = true;
  }, [workplaneLayerHidden]);

  // MCP: the same switch as the eye in the camera bar.
  useEffect(() => {
    window.layerlingWorkplaneDisplay = (visible) => {
      if (typeof visible === "boolean") {
        workplaneLayerHiddenRef.current = !visible;
        setWorkplaneLayerHidden(!visible);
      }
      return { visible: !workplaneLayerHiddenRef.current };
    };
    return () => {
      delete window.layerlingWorkplaneDisplay;
    };
  }, []);

  // The arrow keys move along what the screen shows, and the view follows
  // what they push past its edge (both in LayerlingEditor's nudge).
  useEffect(() => {
    window.layerlingScreenDirections = () => {
      const camera = threeRef.current?.camera;
      if (!camera) return { right: { x: 1, y: 0, z: 0 }, away: { x: 0, y: 0, z: -1 } };
      camera.updateMatrixWorld();
      const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
      const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
      const forward = camera.getWorldDirection(new THREE.Vector3());
      // Seen from above "away" is up on the screen, seen from the side it is
      // into the screen; the sum points the right way for both and between.
      const away = forward.add(up);
      return { right: { x: right.x, y: right.y, z: right.z }, away: { x: away.x, y: away.y, z: away.z } };
    };
    window.layerlingFollowMove = (ids, translation) => {
      const state = threeRef.current;
      if (!state || !ids.length) return;
      const bounds = new THREE.Box3();
      ids.forEach((id) => {
        const object = findShapeObject(state, id);
        if (object) bounds.expandByObject(object);
      });
      if (bounds.isEmpty()) return;
      const moved = bounds.getCenter(new THREE.Vector3()).add(new THREE.Vector3(translation.x, translation.y, translation.z));
      const projected = moved.clone().project(state.camera);
      // Past the part of the picture really seen - not under the camera bar or
      // the settings - less a margin, the view takes the same step, so the
      // bodies stay where they are on screen.
      const canvas = state.renderer.domElement;
      const area = visibleWorkArea(canvas, canvas.clientWidth, canvas.clientHeight);
      const px = (projected.x + 1) / 2 * canvas.clientWidth;
      const py = (1 - projected.y) / 2 * canvas.clientHeight;
      const margin = 60;
      const inside = projected.z < 1 && px >= area.left + margin && px <= area.right - margin && py >= area.top + margin && py <= area.bottom - margin;
      if (inside) return;
      const step = new THREE.Vector3(translation.x, translation.y, translation.z);
      state.camera.position.add(step);
      state.controls.target.add(step);
      state.controls.update();
      state.needsRender = true;
    };
    return () => {
      delete window.layerlingScreenDirections;
      delete window.layerlingFollowMove;
    };
  }, []);

  useEffect(() => {
    setSelectionHelpersVisible(threeRef.current, !splitActive && !workplaneMode && activeTransformKind !== "rotate");
  }, [activeTransformKind, splitActive, workplaneMode]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    const state = createThreeScene(host);
    state.palette = themePaletteRef.current;
    threeRef.current = state;
    rebuildWorkplane(state, workspaceRef.current, resolvedThemeRef.current, drawnWorkplane(), projectNameRef.current);
    state.workplaneLayer.visible = !workplaneLayerHiddenRef.current;
    window.layerlingCaptureCanvas = () => {
      state.camera.updateMatrixWorld();
      renderFrame(state);
      return state.renderer.domElement.toDataURL("image/png");
    };
    window.layerlingCaptureCanvasAsync = () => {
      state.camera.updateMatrixWorld();
      renderFrame(state);
      return thumbnailPngDataUrl(state.renderer.domElement);
    };
    window.layerlingOrbitView = (azimuthDegrees, polarDegrees) => {
      const target = state.controls.target;
      const offset = state.camera.position.clone().sub(target);
      const spherical = new THREE.Spherical().setFromVector3(offset);
      spherical.theta += THREE.MathUtils.degToRad(azimuthDegrees);
      // Stops short of straight down or up, where the turn would flip over.
      const minPolar = Math.max(state.controls.minPolarAngle, 1e-3);
      const maxPolar = Math.min(state.controls.maxPolarAngle, Math.PI - 1e-3);
      spherical.phi = clamp(spherical.phi + THREE.MathUtils.degToRad(polarDegrees), minPolar, maxPolar);
      offset.setFromSpherical(spherical);
      state.camera.up.set(0, 1, 0);
      state.camera.position.copy(target).add(offset);
      state.camera.lookAt(target);
      state.camera.updateProjectionMatrix();
      state.controls.update();
      state.needsRender = true;
    };
    window.layerlingCaptureView = (face = "current") => {
      if (face === "home") {
        resetCamera(state);
      } else if (face !== "current") {
        const direction = viewDirectionFromName(face);
        if (!direction) throw new Error(`Unknown view "${face}": use a face, or two or three neighbouring faces joined with "-", like "front-right-top"`);
        setCameraToViewDirection(state, direction);
      }
      syncViewCube(state, viewCubeRef.current);
      fitCameraDepthRange(state.camera, state.controls.target);
      state.camera.updateMatrixWorld();
      renderFrame(state);
      return state.renderer.domElement.toDataURL("image/png");
    };
    /*
     * Ein sauberes Bild der Ansicht, wie man es in einen Forenbeitrag stellt:
     * nur die Koerper, wahlweise mit Druckplatte, ohne Griffe, Auswahlrahmen und
     * Hilfslinien, auf Wunsch ohne Hintergrund. Gezeichnet wird in ein eigenes
     * Bild mit doppelter Aufloesung; der Bildschirm bleibt, wie er ist.
     */
    window.layerlingCaptureImage = ({ plate = true, transparent = false, scale = 2 } = {}) => {
      const canvas = state.renderer.domElement;
      const cssWidth = Math.max(1, canvas.clientWidth);
      const cssHeight = Math.max(1, canvas.clientHeight);
      const factor = Math.max(0.25, Math.min(scale, 4096 / Math.max(cssWidth, cssHeight)));
      const width = Math.round(cssWidth * factor);
      const height = Math.round(cssHeight * factor);
      const target = new THREE.WebGLRenderTarget(width, height, { samples: 4, stencilBuffer: true });
      target.texture.colorSpace = THREE.SRGBColorSpace;
      const helpers: Array<THREE.Object3D | null> = [
        state.workplanePreviewLayer,
        state.layFlatHoverLayer ?? null,
        state.bentTubeSegmentLayer ?? null,
        state.helperLayer,
        state.transformGuideLayer,
        state.moveDimensionLayer,
        state.originDimensionLayer,
        state.modifierLayer,
        state.sectionPlaneHelper,
        plate ? null : state.workplaneLayer,
      ];
      const hidden = helpers.filter((object): object is THREE.Object3D => Boolean(object?.visible));
      hidden.forEach((object) => { object.visible = false; });
      const background = state.scene.background;
      const clearColor = state.renderer.getClearColor(new THREE.Color());
      const clearAlpha = state.renderer.getClearAlpha();
      if (transparent) {
        state.scene.background = null;
        state.renderer.setClearColor(0x000000, 0);
      }
      try {
        fitCameraDepthRange(state.camera, state.controls.target);
        state.camera.updateMatrixWorld();
        state.renderer.setRenderTarget(target);
        renderFrame(state);
        const pixels = new Uint8Array(width * height * 4);
        state.renderer.readRenderTargetPixels(target, 0, 0, width, height, pixels);
        const out = document.createElement("canvas");
        out.width = width;
        out.height = height;
        const context = out.getContext("2d");
        if (!context) return "";
        const image = context.createImageData(width, height);
        // WebGL counts rows from the bottom.
        const row = width * 4;
        for (let y = 0; y < height; y += 1) {
          image.data.set(pixels.subarray((height - 1 - y) * row, (height - y) * row), y * row);
        }
        // Blended over nothing, a see-through pixel (the plate, a smoothed
        // edge) comes back with its colour already multiplied by its alpha -
        // darker. A PNG wants the colour itself.
        if (transparent) {
          const data = image.data;
          for (let index = 0; index < data.length; index += 4) {
            const alpha = data[index + 3];
            if (alpha === 0 || alpha === 255) continue;
            data[index] = Math.min(255, Math.round(data[index] * 255 / alpha));
            data[index + 1] = Math.min(255, Math.round(data[index + 1] * 255 / alpha));
            data[index + 2] = Math.min(255, Math.round(data[index + 2] * 255 / alpha));
          }
        }
        context.putImageData(image, 0, 0);
        return out.toDataURL("image/png");
      } finally {
        state.renderer.setRenderTarget(null);
        target.dispose();
        state.scene.background = background;
        state.renderer.setClearColor(clearColor, clearAlpha);
        hidden.forEach((object) => { object.visible = true; });
        state.needsRender = true;
      }
    };
    perfRef.current.lastSample = performance.now();
    resetCamera(state);
    rebuildShapes(state, shapesRef.current, renderSelectionIds(), false, placementWorkplaneRef.current);
    syncSplitPlane(state, splitPlaneRef.current);

    const animate = () => {
      state.animationId = window.requestAnimationFrame(animate);
      const now = performance.now();
      const controlsChanged = state.controls.update();
      fitCameraDepthRange(state.camera, state.controls.target);
      const cameraSettled = state.wasCameraMoving && !controlsChanged;
      if (!controlsChanged && !state.needsRender && !cameraSettled) {
        return;
      }
      constrainCamera(state, workspaceRef.current);
      // Future edits: keep this before any view cube or transform-overlay projection.
      // OrbitControls changes camera position/quaternion, but manual Vector3.project()
      // can read the previous matrix unless we force the matrix world current here.
      // Removing this brings back the one-frame-late handle/line lag during camera motion.
      state.camera.updateMatrixWorld();
      if (now - state.lastViewCubeSync > 48 || cameraSettled || state.needsRender) {
        syncViewCube(state, viewCubeRef.current);
        state.lastViewCubeSync = now;
      }
      if (controlsChanged || cameraSettled || state.needsRender || now - state.lastOverlaySync > 96) {
        const previewShapes = previewShapesForDrag(shapesRef.current, dragRef.current);
        syncTransformOverlay(
          state,
          previewShapes,
          renderSelectionIds(),
          transformOverlayRef,
          setTransformOverlay,
          workspaceRef.current.accuracy,
          Boolean(transformRef.current || dragRef.current),
          false,
          placementWorkplaneRef.current,
          resolvedThemeRef.current,
          workspaceRef.current.dimensionsAlwaysVisible,
        );
        syncAlignOverlay(state, alignReferenceShapesRef.current, selectedIdsRef.current, alignModeRef.current, alignAnchorIdRef.current, alignHandlesRef.current, alignOverlayRef, setAlignOverlay);
        syncMirrorOverlay(state, mirrorReferenceShapesRef.current, selectedIdsRef.current, mirrorModeRef.current, mirrorOverlayRef, setMirrorOverlay);
        syncTapeOverlay(state, tapeModelRef.current, tapeOverlayRef, setTapeOverlay, workspaceRef.current.accuracy);
        syncSectionMeasureOverlay(state, sectionMeasureModeRef.current && sectionSettingsRef.current.enabled, sectionMeasureRef.current, sectionMeasureOverlayRef, setSectionMeasureOverlay, workspaceRef.current.accuracy);
        syncRulerDimensionOverlay(state, previewShapes, rulerDimensionOverlayRef, setRulerDimensionOverlay, workspaceRef.current.accuracy);
        syncCornerRulerToolOverlay(state, cornerRulerModelRef.current, previewShapes, selectedIdsRef.current, cornerRulerOverlayRef, setCornerRulerOverlay, workspaceRef.current.accuracy);
        syncNoteOverlay(state, notesRef.current, notesVisibleRef.current, noteOverlayRef, setNoteOverlay);
        syncMoveDimensionOverlay(
          state,
          moveDimensionSessionRef.current,
          moveDimensionOverlayRef,
          setMoveDimensionOverlay,
          workspaceRef.current.accuracy,
          resolvedThemeRef.current,
        );
        syncOriginDimensionOverlay(
          state,
          originDimensionShapeFor(previewShapes),
          placementWorkplaneRef.current,
          workspaceRef.current.accuracy,
          resolvedThemeRef.current,
          originDimensionOverlayRef,
          setOriginDimensionOverlay,
        );
        state.lastOverlaySync = now;
      }
      const renderStart = performance.now();
      fitCameraDepthRange(state.camera, state.controls.target);
      renderFrame(state);
      const frameMs = performance.now() - renderStart;
      const perf = perfRef.current;
      perf.frameMs = frameMs;
      perf.maxFrameMs = Math.max(perf.maxFrameMs, frameMs);
      perf.frames += 1;
      if (now - perf.lastSample >= 1000) {
        perf.fps = (perf.frames * 1000) / Math.max(1, now - perf.lastSample);
        perf.frames = 0;
        perf.lastSample = now;
        perf.maxFrameMs = frameMs;
      }
      state.wasCameraMoving = controlsChanged;
      state.needsRender = false;
    };

    animate();
    window.addEventListener("resize", state.resize);

    return () => {
      // The view is taken down while a sketch is open; it comes back looking where it looked (#150).
      rememberedCameraViews.set(projectIdRef.current ?? "", cameraViewOf(state));
      window.cancelAnimationFrame(state.animationId);
      window.removeEventListener("resize", state.resize);
      state.disposeInteractionListeners();
      state.controls.dispose();
      disposeChildren(state.workplaneLayer);
      if (state.workplanePreviewLayer) {
        disposeChildren(state.workplanePreviewLayer);
      }
      if (state.layFlatHoverLayer) {
        disposeChildren(state.layFlatHoverLayer);
      }
      if (state.bentTubeSegmentLayer) {
        disposeChildren(state.bentTubeSegmentLayer);
      }
      disposeChildren(state.shapeLayer);
      state.shapeRecords.clear();
      disposeChildren(state.helperLayer);
      disposeChildren(state.splitLayer);
      disposeChildren(state.transformGuideLayer);
      disposeChildren(state.moveDimensionLayer);
      disposeChildren(state.originDimensionLayer);
      disposeChildren(state.modifierLayer);
      if (state.sectionPlaneHelper) {
        state.scene.remove(state.sectionPlaneHelper);
        disposeObject(state.sectionPlaneHelper);
        state.sectionPlaneHelper = null;
      }
      disposeCutPreviewResources();
      state.renderer.dispose();
      host.replaceChildren();
      if (window.layerlingCaptureCanvas) {
        delete window.layerlingCaptureCanvas;
      }
      if (window.layerlingCaptureImage) {
        delete window.layerlingCaptureImage;
      }
      if (window.layerlingCaptureCanvasAsync) {
        delete window.layerlingCaptureCanvasAsync;
      }
      if (window.layerlingCaptureView) {
        delete window.layerlingCaptureView;
      }
      if (window.layerlingOrbitView) {
        delete window.layerlingOrbitView;
      }
      threeRef.current = null;
    };
  }, []);

  // A double click on a sketch body opens its sketch, as in Tinkercad; on a group or a bundle it
  // opens that for editing (#150). The first click has already selected it, so this is the same
  // as Edit Sketch or Edit group. Both can be switched off in the settings.
  const onEditSketchRef = useRef(onEditSketch);
  onEditSketchRef.current = onEditSketch;
  const onOpenGroupRef = useRef(onOpenGroup);
  onOpenGroupRef.current = onOpenGroup;
  useEffect(() => {
    const state = threeRef.current;
    // Pointer capture sends the clicks to the host, not to the canvas inside it.
    const host = hostRef.current;
    if (!state || !host) return;
    const openSketch = (event: MouseEvent) => {
      if (event.button !== 0 || pivotPickModeRef.current) return;
      const id = pickShapeIdAt(state, event.clientX, event.clientY);
      const shape = id ? shapesRef.current.find((candidate) => candidate.id === id) : undefined;
      if (!shape || shape.locked) return;
      const selected = selectedIdsRef.current;
      if (selected.length !== 1 || selected[0] !== shape.id) return;
      const settings = workspaceRef.current;
      if (shape.sketchProfile && settings.doubleClickOpensSketch !== false) onEditSketchRef.current?.();
      else if (shape.groupedShapes?.length && settings.doubleClickOpensGroup !== false) onOpenGroupRef.current?.(shape.id);
    };
    host.addEventListener("dblclick", openSketch);
    return () => host.removeEventListener("dblclick", openSketch);
  }, []);

  useEffect(() => {
    // Each design opens in the projection the app preference asks for. The
    // editor stays mounted between designs, so this follows the settings key
    // rather than the mount; later toggles within the design are left alone.
    const state = threeRef.current;
    if (!state) {
      return;
    }
    const perspective = readStartInPerspective();
    setStartInPerspective(perspective);
    const wantsOrthographic = !perspective;
    if (!designViewRestoredRef.current && (state.camera instanceof THREE.OrthographicCamera) !== wantsOrthographic) {
      toggleCameraProjection(state);
      syncViewCube(state, viewCubeRef.current);
    }
    setOrthographicView(state.camera instanceof THREE.OrthographicCamera);
  }, [workspaceSettingsKey]);

  // Back from the sketch view: the camera looks where it looked before (#150). A design opens the
  // way it was left, too: its view is kept in the browser and in a saved file (#220).
  useEffect(() => {
    const state = threeRef.current;
    const key = projectIdRef.current ?? "";
    const view = rememberedCameraViews.get(key) ?? readDesignView(projectIdRef.current);
    rememberedCameraViews.delete(key);
    if (state && view) {
      if ((state.camera instanceof THREE.OrthographicCamera) !== view.orthographic) toggleCameraProjection(state);
      applyCameraView(state, view);
      syncViewCube(state, viewCubeRef.current);
      setOrthographicView(state.camera instanceof THREE.OrthographicCamera);
      designViewRestoredRef.current = true;
    }
    // Only now may the camera's own movements be written down: before, the standard view
    // the viewport starts in would overwrite the one the design was left in.
    designViewReadyRef.current = true;
    if (!state) return;
    let timer = 0;
    const save = () => {
      window.clearTimeout(timer);
      writeDesignView(projectIdRef.current, cameraViewOf(state));
    };
    const saveSoon = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(save, 500);
    };
    const saveWhenHidden = () => {
      if (document.visibilityState === "hidden") save();
    };
    state.controls.addEventListener("change", saveSoon);
    window.addEventListener("pagehide", save);
    document.addEventListener("visibilitychange", saveWhenHidden);
    return () => {
      state.controls.removeEventListener("change", saveSoon);
      window.removeEventListener("pagehide", save);
      document.removeEventListener("visibilitychange", saveWhenHidden);
      window.clearTimeout(timer);
      // The viewport is taken down when the design is left (or a sketch opens): its view stays.
      save();
    };
  }, []);

  // The projection switch moves no control, so it asks for the view to be kept itself.
  useEffect(() => {
    if (!designViewReadyRef.current) return;
    const state = threeRef.current;
    if (state) writeDesignView(projectIdRef.current, cameraViewOf(state));
  }, [orthographicView]);

  useEffect(() => {
    const state = threeRef.current;
    if (!state) {
      return;
    }
    const visible = !workplaneMode
      && !splitActive
      && !alignMode
      && !mirrorMode
      && !tapeMode
      && !tapeDeleteMode
      && !tapeMoveMode
      && !modifierActive
      && activeTransformKind !== "rotate";
    if (state.transformGuideLayer.visible !== visible) {
      state.transformGuideLayer.visible = visible;
      state.needsRender = true;
    }
  }, [activeTransformKind, alignMode, mirrorMode, modifierActive, splitActive, tapeDeleteMode, tapeMode, tapeMoveMode, workplaneMode]);

  useEffect(() => {
    window.layerlingPerf = {
      get: () => {
        const state = threeRef.current;
        const info = state?.renderer.info.render;
        return {
          fps: Number(perfRef.current.fps.toFixed(1)),
          frameMs: Number(perfRef.current.frameMs.toFixed(2)),
          maxFrameMs: Number(perfRef.current.maxFrameMs.toFixed(2)),
          drawCalls: info?.calls ?? 0,
          triangles: info?.triangles ?? 0,
          points: info?.points ?? 0,
          lines: info?.lines ?? 0,
          shapeCount: shapesRef.current.filter((shape) => !shape.hidden).length,
        };
      },
    };
    return () => {
      delete window.layerlingPerf;
    };
  }, []);

  const toRawPlanePoint = useCallback((clientX: number, clientY: number, plane: THREE.Plane) => {
    const state = threeRef.current;
    if (!state) {
      return null;
    }

    const rect = state.renderer.domElement.getBoundingClientRect();
    state.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    state.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    state.raycaster.setFromCamera(state.pointer, state.camera);

    const hit = new THREE.Vector3();
    if (!state.raycaster.ray.intersectPlane(plane, hit)) {
      return null;
    }

    return hit;
  }, []);

  /** A point under the cursor on the cutting plane, snapped to the cut's outline (12 px around it). */
  const pickSectionMeasurePoint = useCallback((clientX: number, clientY: number): SectionSnap | null => {
    const state = threeRef.current;
    const settings = sectionSettingsRef.current;
    if (!state || !settings.enabled) return null;
    const normal = settings.axis === "x" ? new THREE.Vector3(1, 0, 0) : settings.axis === "y" ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1);
    const hit = toRawPlanePoint(clientX, clientY, new THREE.Plane(normal, -settings.offset));
    if (!hit) return null;
    const target = projectSectionPoint([hit.x, hit.y, hit.z], settings.axis);
    const [nx, ny, nz] = sectionPointToWorld({ u: target.u + 1, v: target.v }, settings.axis, settings.offset);
    const here = projectToScreen(hit, state);
    const there = projectToScreen(new THREE.Vector3(nx, ny, nz), state);
    const pixelsPerMm = Math.max(1e-6, Math.hypot(there.x - here.x, there.y - here.y));
    const model = sectionMeasureRef.current;
    return snapSectionPoint(target, model.loops, 12 / pixelsPerMm, model.a && !model.b ? model.a : null);
  }, [toRawPlanePoint]);

  const placeSectionMeasurePoint = useCallback((point: SectionPoint) => {
    const model = sectionMeasureRef.current;
    // Third click starts the next measurement.
    const next = !model.a || model.b ? { ...model, a: point, b: null } : { ...model, b: point };
    sectionMeasureRef.current = { ...next, hover: null };
    setSectionMeasureResult(next.a && next.b ? sectionMeasurement(next.a, next.b, next.axis, next.offset) : null);
    if (threeRef.current) threeRef.current.needsRender = true;
  }, []);

  const toPlanePointAtY = useCallback((clientX: number, clientY: number, planeY = 0) => {
    const state = threeRef.current;
    const hit = toRawPlanePoint(clientX, clientY, planeY === 0 ? state?.dragPlane ?? new THREE.Plane(new THREE.Vector3(0, 1, 0), 0) : new THREE.Plane(new THREE.Vector3(0, 1, 0), -planeY));
    if (!state || !hit) {
      return null;
    }

    const step = snapStep(snapRef.current);
    const bounds = workspaceRef.current;
    return {
      x: clamp(snapValue(hit.x, step), -bounds.width / 2 + 6, bounds.width / 2 - 6),
      z: clamp(snapValue(hit.z, step), -bounds.depth / 2 + 6, bounds.depth / 2 - 6),
    };
  }, [toRawPlanePoint]);
  const toPlanePoint = useCallback((clientX: number, clientY: number) => toPlanePointAtY(clientX, clientY, 0), [toPlanePointAtY]);

  const toPlacementWorkplanePoint = useCallback((clientX: number, clientY: number, workplane = placementWorkplaneRef.current) => {
    const normal = new THREE.Vector3(workplane.normal.x, workplane.normal.y, workplane.normal.z);
    const origin = new THREE.Vector3(workplane.origin.x, workplane.origin.y, workplane.origin.z);
    const raw = toRawPlanePoint(clientX, clientY, new THREE.Plane(normal, -normal.dot(origin)));
    if (!raw) return null;
    const local = placementWorkplaneCoordinates(workplane, raw);
    const step = snapStep(snapRef.current);
    const bounds = workspaceRef.current;
    // Wie bei Tinkercad darf ein Teil neben der Platte geparkt werden (Discussion #80);
    // die Grenze faengt nur den flachen Blick ab, bei dem der Strahl die Ebene weit draussen trifft.
    const reachX = bounds.width / 2 + bounds.width * PLATE_DRAG_REACH;
    const reachZ = bounds.depth / 2 + bounds.depth * PLATE_DRAG_REACH;
    return placementWorkplanePoint(
      workplane,
      clamp(snapValue(local.x, step), -reachX, reachX),
      clamp(snapValue(local.z, step), -reachZ, reachZ),
    );
  }, [toRawPlanePoint]);

  const toFreePlacementWorkplanePoint = useCallback((clientX: number, clientY: number, workplane = placementWorkplaneRef.current) => {
    const normal = new THREE.Vector3(workplane.normal.x, workplane.normal.y, workplane.normal.z);
    const origin = new THREE.Vector3(workplane.origin.x, workplane.origin.y, workplane.origin.z);
    const raw = toRawPlanePoint(clientX, clientY, new THREE.Plane(normal, -normal.dot(origin)));
    if (!raw) return null;
    const local = placementWorkplaneCoordinates(workplane, raw);
    const step = snapStep(snapRef.current);
    return placementWorkplanePoint(workplane, snapValue(local.x, step), snapValue(local.z, step));
  }, [toRawPlanePoint]);

  /**
   * Where a shape on the pointer lands, as in Tinkercad's Cruise (#195): over a body on the face
   * under the pointer, lined up with it (a sloped one too); elsewhere on the current workplane.
   */
  const cruiseTarget = useCallback((clientX: number, clientY: number, skip?: ReadonlySet<string>) => {
    // pickPlacementSurface is declared further down; it is reached through its ref.
    const surface = pickPlacementSurfaceRef.current?.(clientX, clientY, false, skip) ?? null;
    if (surface) return { point: surface.workplane.origin, workplane: surface.workplane, normal: surface.workplane.normal };
    const point = toFreePlacementWorkplanePoint(clientX, clientY);
    if (!point) return null;
    const workplane = placementWorkplaneRef.current;
    return { point, workplane, normal: workplane.normal };
  }, [toFreePlacementWorkplanePoint]);

  const moveCruiseGhost = useCallback((clientX: number, clientY: number) => {
    const preview = cruisePreviewRef.current;
    const state = threeRef.current;
    if (!preview || !state) return;
    cruisePointerRef.current = { x: clientX, y: clientY };
    const target = cruiseTarget(clientX, clientY);
    if (!target) return;
    const next = {
      ...preview.shape,
      ...placementPatchForNewShape(preview.shape, target.workplane, target.point),
    };
    preview.shape = next;
    updateShapeObjectTransform(preview.object, next);
    preview.object.visible = true;
    state.needsRender = true;
  }, [cruiseTarget]);

  // C: the picked-up parts follow the pointer over the faces, the parts themselves out of the way
  // of the pick, until a click sets them down there or Esc puts them back (#195).
  const moveCarry = useCallback((clientX: number, clientY: number) => {
    const ids = carryIdsRef.current;
    const state = threeRef.current;
    if (!ids?.length || !state) return;
    const target = cruiseTarget(clientX, clientY, new Set(ids));
    if (!target) return;
    const start = carryStartRef.current;
    carriedOntoFace(start, ids, target, ids[0]).forEach((patch, id) => {
      const shape = start.find((entry) => entry.id === id);
      const object = findShapeObject(state, id);
      if (shape && object) updateShapeObjectTransform(object, { ...shape, ...patch });
    });
    state.needsRender = true;
  }, [cruiseTarget]);

  useEffect(() => {
    if (!carryIds?.length) return;
    carryStartRef.current = shapesRef.current.filter((shape) => carryIds.includes(shape.id));
    return () => {
      // Back to what the parts are now: unchanged after Esc, set down after a click.
      const state = threeRef.current;
      if (!state) return;
      carryIds.forEach((id) => {
        const shape = shapesRef.current.find((entry) => entry.id === id);
        const object = findShapeObject(state, id);
        if (shape && object) updateShapeObjectTransform(object, shape);
      });
      state.needsRender = true;
    };
  }, [carryIds]);

  useEffect(() => {
    if (!cruiseAsset) {
      cruisePointerRef.current = null;
      return;
    }
    const state = threeRef.current;
    if (!state) return;
    const customization = workspaceRef.current.shapeCustomizations[cruiseAsset.kind];
    const base = makeShapeFromAsset(cruiseAsset, undefined, customization);
    const workplane = placementWorkplaneRef.current;
    const placed = {
      ...base,
      ...placementPatchForNewShape(base, workplane, workplane.origin),
    };
    const shape = prepareNewShapeRef.current ? prepareNewShapeRef.current(cruiseAsset, placed) : placed;
    const object = createShapeObject(shape, false, () => {
      if (threeRef.current) threeRef.current.needsRender = true;
    }, false);
    prepareCruiseGhost(object);
    object.visible = false;
    state.scene.add(object);
    cruisePreviewRef.current = { object, shape };
    state.needsRender = true;
    return () => {
      const latest = threeRef.current;
      latest?.scene.remove(object);
      disposeObject(object);
      if (cruisePreviewRef.current?.object === object) cruisePreviewRef.current = null;
      if (latest) latest.needsRender = true;
    };
  }, [cruiseAsset, cruiseAsset ? workspace.shapeCustomizations[cruiseAsset.kind] : undefined]);

  useEffect(() => {
    const pointer = cruisePointerRef.current;
    if (!cruiseAsset || !pointer) return;
    moveCruiseGhost(pointer.x, pointer.y);
  }, [cruiseAsset, moveCruiseGhost, placementWorkplane]);

  const storeTapeModel = useCallback((next: TapeModel) => {
    tapeModelRef.current = next;
    setTapeModel(next);
  }, []);

  useEffect(() => {
    const current = tapeModelRef.current;
    const shapeById = new Map(shapes.map((shape) => [shape.id, shape]));
    const shapeIds = new Set(shapeById.keys());
    const state = threeRef.current;
    const removedPointIds = new Set<string>();
    let metadataChanged = false;
    const updatedPoints = current.points.map((point) => {
      if (!point.attachment) return point;
      const attachedShape = shapeById.get(point.attachment.shapeId);
      if (!attachedShape || (state && !attachedShape.hidden && !tapeAttachmentMatchesTopology(state, point.attachment))) {
        removedPointIds.add(point.id);
        return point;
      }
      const object = state ? findShapeObject(state, point.attachment.shapeId) : null;
      const topologyKey = object?.userData.tapeTopologyKey as string | undefined;
      if (topologyKey && topologyKey !== point.attachment.topologyKey) {
        metadataChanged = true;
        return { ...point, attachment: { ...point.attachment, topologyKey } };
      }
      return point;
    });
    const invalidEdgeSegments = new Set<string>();
    const updatedSegments = current.segments.map((segment) => {
      if (!segment.edge) return segment;
      const attachedShape = shapeById.get(segment.edge.shapeId);
      if (!attachedShape || (state && !attachedShape.hidden && !tapeEdgeMatchesTopology(state, segment.edge))) {
        invalidEdgeSegments.add(segment.id);
        return segment;
      }
      const object = state ? findShapeObject(state, segment.edge.shapeId) : null;
      const topologyKey = object?.userData.tapeTopologyKey as string | undefined;
      if (topologyKey && topologyKey !== segment.edge.topologyKey) {
        metadataChanged = true;
        return { ...segment, edge: { ...segment.edge, topologyKey } };
      }
      return segment;
    });
    const provisionalSegments = updatedSegments.filter((segment) => (
      !removedPointIds.has(segment.startId)
      && !removedPointIds.has(segment.endId)
      && !invalidEdgeSegments.has(segment.id)
    ));
    current.segments.filter((segment) => invalidEdgeSegments.has(segment.id)).forEach((segment) => {
      [segment.startId, segment.endId].forEach((pointId) => {
        if (!provisionalSegments.some((candidate) => candidate.startId === pointId || candidate.endId === pointId)) removedPointIds.add(pointId);
      });
    });
    const segments = provisionalSegments.filter((segment) => !removedPointIds.has(segment.startId) && !removedPointIds.has(segment.endId));
    const points = updatedPoints.filter((point) => !removedPointIds.has(point.id));
    const hoverRemoved = Boolean(current.hover?.attachment && (
      !shapeIds.has(current.hover.attachment.shapeId)
      || (state && !shapeById.get(current.hover.attachment.shapeId)?.hidden && !tapeAttachmentMatchesTopology(state, current.hover.attachment))
    ));
    if (removedPointIds.size === 0 && invalidEdgeSegments.size === 0 && !hoverRemoved && !metadataChanged) return;
    if (tapePointDragRef.current && removedPointIds.has(tapePointDragRef.current.pointId)) tapePointDragRef.current = null;
    storeTapeModel({
      points,
      segments,
      startPointId: current.startPointId && !removedPointIds.has(current.startPointId) ? current.startPointId : null,
      hover: hoverRemoved ? null : current.hover,
    });
  }, [shapes, storeTapeModel]);

  const setTapeActive = useCallback((active: boolean) => {
    tapeModeRef.current = active;
    setTapeMode(active);
    if (!active) {
      const current = tapeModelRef.current;
      storeTapeModel({ ...current, startPointId: null, hover: null });
    }
  }, [storeTapeModel]);

  // A shape taken up for placing puts down the measuring tools that would
  // otherwise catch its click (the editor does the same for its own tools).
  useEffect(() => {
    if (!cruiseAsset) return;
    setTapeActive(false);
    tapeDeleteModeRef.current = false;
    setTapeDeleteMode(false);
    tapeMoveModeRef.current = false;
    setTapeMoveMode(false);
    tapePointDragRef.current = null;
    cornerRulerModeRef.current = false;
    setCornerRulerMode(false);
    setSectionMeasureMode(false);
  }, [cruiseAsset, setTapeActive]);

  const resolveTapeCandidate = useCallback(
    (clientX: number, clientY: number, ignoredPointId?: string): TapeCandidate | null => {
      const state = threeRef.current;
      if (!state) return null;

      const model = tapeModelRef.current;
      const rect = state.renderer.domElement.getBoundingClientRect();
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;
      const closestPoint = model.points.reduce<{ point: TapePoint; distance: number } | null>((closest, point) => {
        if (point.id === ignoredPointId) return closest;
        const screen = projectToScreen(tapePointWorld(state, point), state);
        const distance = Math.hypot(screen.x - localX, screen.y - localY);
        if (distance <= 12 && (!closest || distance < closest.distance)) {
          return { point, distance };
        }
        return closest;
      }, null);
      if (closestPoint) {
        const world = tapePointWorld(state, closestPoint.point);
        return { x: world.x, y: world.y, z: world.z, pointId: closestPoint.point.id, attachment: closestPoint.point.attachment };
      }

      const closestSegment = model.segments.reduce<{ world: THREE.Vector3; distance: number } | null>((closest, segment) => {
        if (segment.startId === ignoredPointId || segment.endId === ignoredPointId) return closest;
        const start = model.points.find((point) => point.id === segment.startId);
        const end = model.points.find((point) => point.id === segment.endId);
        if (!start || !end) return closest;
        const edgePoints = segment.edge ? tapeEdgeWorldPoints(state, segment.edge) : [];
        const worldPoints = edgePoints.length >= 2 ? edgePoints : [tapePointWorld(state, start), tapePointWorld(state, end)];
        for (let index = 0; index + 1 < worldPoints.length; index += 1) {
          const a = projectToScreen(worldPoints[index], state);
          const b = projectToScreen(worldPoints[index + 1], state);
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const amount = dx * dx + dy * dy > 0.001 ? clamp(((localX - a.x) * dx + (localY - a.y) * dy) / (dx * dx + dy * dy), 0, 1) : 0;
          const distance = Math.hypot(localX - (a.x + dx * amount), localY - (a.y + dy * amount));
          if (distance <= 10 && (!closest || distance < closest.distance)) {
            closest = { world: worldPoints[index].clone().lerp(worldPoints[index + 1], amount), distance };
          }
        }
        return closest;
      }, null);

      if (closestSegment) {
        const existing = model.points.find((point) => tapePointWorld(state, point).distanceTo(closestSegment.world) < 0.001);
        return { x: closestSegment.world.x, y: closestSegment.world.y, z: closestSegment.world.z, pointId: existing?.id };
      }

      const selectedShapeIds = selectedIdsRef.current.filter((id) => shapesRef.current.some((shape) => shape.id === id && !shape.hidden));
      const targetShapeIds = selectedShapeIds.length > 0 ? selectedShapeIds : shapesRef.current.filter((shape) => !shape.hidden).map((shape) => shape.id);
      const modelCandidate = pickModelTapeCandidate(state, targetShapeIds, clientX, clientY);
      if (modelCandidate) return modelCandidate;

      const raw = toRawPlanePoint(clientX, clientY, state.dragPlane);
      if (!raw) return null;
      const step = snapStep(snapRef.current);
      const bounds = workspaceRef.current;
      const snapped = {
        x: clamp(snapValue(raw.x, step), -bounds.width / 2, bounds.width / 2),
        y: 0,
        z: clamp(snapValue(raw.z, step), -bounds.depth / 2, bounds.depth / 2),
      };
      const existing = model.points.find((point) => Math.hypot(point.x - snapped.x, point.y, point.z - snapped.z) < 0.001 && !point.attachment);
      return { ...snapped, pointId: existing?.id };
    },
    [toRawPlanePoint],
  );

  const selectTapeCandidate = useCallback(
    (candidate: TapeCandidate) => {
      const current = tapeModelRef.current;
      const sameAttachment = (point: TapePoint, attachment: TapeAttachment | undefined) => Boolean(
        attachment
        && point.attachment?.shapeId === attachment.shapeId
        && Math.hypot(
          point.attachment.normalized[0] - attachment.normalized[0],
          point.attachment.normalized[1] - attachment.normalized[1],
          point.attachment.normalized[2] - attachment.normalized[2],
        ) < 1e-5,
      );
      const findExisting = (value: Pick<TapeCandidate, "x" | "y" | "z" | "pointId" | "attachment">) => value.pointId
        ? current.points.find((point) => point.id === value.pointId)
        : current.points.find((point) => sameAttachment(point, value.attachment) || (!point.attachment && !value.attachment && Math.hypot(point.x - value.x, point.y - value.y, point.z - value.z) < 0.001));
      const makePoint = (value: Pick<TapeCandidate, "x" | "y" | "z" | "pointId" | "attachment">) => findExisting(value) ?? {
        id: `tape-point-${++tapeIdRef.current}`,
        x: value.x,
        y: value.y,
        z: value.z,
        attachment: value.attachment,
      };

      if (candidate.edge && !current.startPointId) {
        const state = threeRef.current;
        const worldPoints = state ? tapeEdgeWorldPoints(state, candidate.edge) : [];
        if (worldPoints.length >= 2) {
          const firstAttachment: TapeAttachment = {
            shapeId: candidate.edge.shapeId,
            normalized: candidate.edge.normalizedPoints[0],
            kind: "vertex",
            topologyKey: candidate.edge.topologyKey,
          };
          const lastAttachment: TapeAttachment = {
            shapeId: candidate.edge.shapeId,
            normalized: candidate.edge.normalizedPoints[candidate.edge.normalizedPoints.length - 1],
            kind: "vertex",
            topologyKey: candidate.edge.topologyKey,
          };
          const start = makePoint({ x: worldPoints[0].x, y: worldPoints[0].y, z: worldPoints[0].z, attachment: firstAttachment });
          const endWorld = worldPoints[worldPoints.length - 1];
          const end = makePoint({ x: endWorld.x, y: endWorld.y, z: endWorld.z, attachment: lastAttachment });
          const points = [...current.points];
          if (!points.some((point) => point.id === start.id)) points.push(start);
          if (!points.some((point) => point.id === end.id)) points.push(end);
          const duplicate = current.segments.some((segment) => segment.edge?.key === candidate.edge?.key);
          const segments = duplicate ? current.segments : [...current.segments, {
            id: `tape-segment-${++tapeIdRef.current}`,
            startId: start.id,
            endId: end.id,
            edge: candidate.edge,
          }];
          storeTapeModel({ points, segments, startPointId: null, hover: null });
          return;
        }
      }

      const existing = findExisting(candidate);
      const point = existing ?? makePoint(candidate);
      const points = existing ? current.points : [...current.points, point];
      if (!current.startPointId) {
        storeTapeModel({ ...current, points, startPointId: point.id, hover: { x: point.x, y: point.y, z: point.z, attachment: point.attachment } });
        return;
      }
      if (current.startPointId === point.id) {
        return;
      }

      const duplicate = current.segments.some(
        (segment) =>
          (segment.startId === current.startPointId && segment.endId === point.id) ||
          (segment.startId === point.id && segment.endId === current.startPointId),
      );
      const segments = duplicate
        ? current.segments
        : [...current.segments, { id: `tape-segment-${++tapeIdRef.current}`, startId: current.startPointId, endId: point.id }];
      storeTapeModel({ points, segments, startPointId: null, hover: null });
    },
    [storeTapeModel],
  );

  const updateTapeHover = useCallback(
    (clientX: number, clientY: number) => {
      if (!tapeModeRef.current) {
        return;
      }
      const candidate = resolveTapeCandidate(clientX, clientY);
      const current = tapeModelRef.current;
      const hover = candidate;
      if ((!current.hover && !hover) || (current.hover && hover
        && current.hover.edge?.key === hover.edge?.key
        && Math.hypot(current.hover.x - hover.x, current.hover.y - hover.y, current.hover.z - hover.z) < 0.0001)) {
        return;
      }
      storeTapeModel({ ...current, hover });
    },
    [resolveTapeCandidate, storeTapeModel],
  );

  const removeTapeSegment = useCallback(
    (segmentId: string) => {
      const current = tapeModelRef.current;
      const segments = current.segments.filter((segment) => segment.id !== segmentId);
      const usedPointIds = new Set(segments.flatMap((segment) => [segment.startId, segment.endId]));
      const points = current.points.filter((point) => usedPointIds.has(point.id) || point.id === current.startPointId);
      storeTapeModel({ ...current, points, segments });
    },
    [storeTapeModel],
  );

  const removeTapePoint = useCallback(
    (pointId: string) => {
      const current = tapeModelRef.current;
      const segments = current.segments.filter((segment) => segment.startId !== pointId && segment.endId !== pointId);
      const points = current.points.filter((point) => point.id !== pointId);
      storeTapeModel({
        ...current,
        points,
        segments,
        startPointId: current.startPointId === pointId ? null : current.startPointId,
      });
    },
    [storeTapeModel],
  );

  // Clearing every measurement cannot be undone, so it asks first - but only
  // when there is a measurement to lose; a lone start point goes silently.
  const requestClearTape = useCallback(() => {
    const current = tapeModelRef.current;
    if (current.segments.length > 0) {
      setTapeClearPending(true);
    } else if (current.points.length > 0) {
      storeTapeModel({ ...current, points: [], segments: [], startPointId: null });
    }
  }, [storeTapeModel]);

  const confirmClearTape = useCallback(() => {
    tapePointDragRef.current = null;
    storeTapeModel({ points: [], segments: [], startPointId: null, hover: null });
    setTapeClearPending(false);
  }, [storeTapeModel]);

  const setMarqueeFromState = useCallback((marquee: MarqueeState | null) => {
    if (!marquee) {
      setMarqueeRect(null);
      return;
    }
    const left = Math.min(marquee.startX, marquee.currentX);
    const top = Math.min(marquee.startY, marquee.currentY);
    setMarqueeRect({
      left,
      top,
      width: Math.abs(marquee.currentX - marquee.startX),
      height: Math.abs(marquee.currentY - marquee.startY),
    });
  }, []);

  const shapesInMarquee = useCallback((rect: { left: number; top: number; right: number; bottom: number }) => {
    const state = threeRef.current;
    if (!state) {
      return [];
    }
    return shapesRef.current
      .filter((shape) => !shape.hidden)
      .filter((shape) => !shape.imagePlate)
      .filter((shape) => {
        const bounds = shapeScreenBounds(state, shape);
        if (!bounds || !boundsIntersectRect(bounds, rect)) return false;
        // The frame only says where the body could be. A spool's bore or the
        // gap between the parts of a group is inside it and still empty.
        return shapeGeometryTouchesScreenRect(state, shape.id, rect) ?? true;
      })
      .map((shape) => shape.id);
  }, []);

  const beginTransform = useCallback(
    (kind: TransformHandleKind, handleKey: string, event: ReactPointerEvent<Element>) => {
      if (event.button !== 0) {
        return;
      }
      clearMoveDimensions();
      const ids = selectedIdsRef.current;
      const activeWorkplane = placementWorkplaneRef.current;
      const frame = selectionFrameForShapes(shapesRef.current, ids, activeWorkplane);
      const shape = frame?.singleShape ?? shapesRef.current.find((entry) => entry.id === ids[0]);
      if (!frame || !shape || ids.length === 0 || ids.some((id) => shapesRef.current.find((entry) => entry.id === id)?.locked)) {
        return;
      }

      const rotationAxis = rotationAxisForHandle(handleKey);
      const resizeHandleKey = handleKey;
      const state = threeRef.current;
      const yBounds = selectionWorldYBounds(frame);
      const handlesLowerSide = handleKey === "bottom-height" || handleKey === "lower-shape";
      const lift = liftGeometryForFrame(frame, activeWorkplane);
      const liftOffset = kind === "lift" ? Math.max(2, lift.height * LIFT_HANDLE_HEIGHT_OFFSET_FRACTION) * (handlesLowerSide ? -1 : 1) : 0;
      const overlay = transformOverlayRef.current;
      const wheel = kind === "rotate" ? (overlay?.rotationWheels[rotationAxis] ?? overlay?.rotationWheel ?? undefined) : undefined;
      const rotationPlane = kind === "rotate" ? overlay?.rotationPlanes[rotationAxis] : undefined;
      const rotationPlaneCenterData = kind === "rotate" ? overlay?.rotationPlaneCenters[rotationAxis] : undefined;
      const rotationPlaneCenter = rotationPlaneCenterData
        ? new THREE.Vector3(rotationPlaneCenterData.x, rotationPlaneCenterData.y, rotationPlaneCenterData.z)
        : frame.center.clone();
      const rect = state?.renderer.domElement.getBoundingClientRect();
      const localClientX = rect ? event.clientX - rect.left : event.clientX;
      const localClientY = rect ? event.clientY - rect.top : event.clientY;
      const axisVector = rotationAxisVectorForFrame(handleKey, frame);
      const pivot = pivotVector(rotationPivotRef.current) ?? frame.center.clone();
      const rotationCenter = kind === "rotate" ? wheel ?? (state ? projectToScreen(pivot, state) : { x: localClientX, y: localClientY }) : undefined;
      const rotationStartPoint = kind === "rotate" && state ? rayPointOnRotationPlane(state, event.clientX, event.clientY, rotationPlaneCenter, axisVector) : null;
      const rotationStartVector = rotationStartPoint ? rotationStartPoint.sub(rotationPlaneCenter) : undefined;
      const rotationStartPointerAngle = kind === "rotate"
        ? rotationPlanePointerAngle(rotationPlane, localClientX, localClientY, rotationCenter ?? { x: localClientX, y: localClientY })
        : undefined;
      const scalePlane = kind === "scale"
        ? localResizePlaneForFrame(frame, workplaneFootprintY(frame, activeWorkplane))
        : undefined;
      const scaleStartPoint = scalePlane ? toRawPlanePoint(event.clientX, event.clientY, scalePlane) ?? undefined : undefined;
      const scaleSigns = kind === "scale" ? resizeSignsForHandle(resizeHandleKey) : undefined;
      const scaleAnchorPoint = kind === "scale" && scaleSigns ? resizeAnchorPointForFrame(frame, scaleSigns) : undefined;
      const liftAxis = kind === "lift" ? lift.axis : kind === "height" ? frame.yAxis.clone().normalize() : undefined;
      const liftHandlePoint = liftAxis
        ? (kind === "lift"
            ? lift.pointAt(handlesLowerSide ? lift.low : lift.high).addScaledVector(liftAxis, liftOffset)
            : framePoint(frame, 0, handlesLowerSide ? frame.min.y : frame.max.y, 0).addScaledVector(liftAxis, liftOffset))
        : undefined;
      const liftPlane = state && liftAxis && liftHandlePoint
        ? axisDragPlaneForCamera(state, liftAxis, liftHandlePoint)
        : undefined;
      const liftStartPoint = liftPlane ? toRawPlanePoint(event.clientX, event.clientY, liftPlane) ?? undefined : undefined;
      const liftStartValue = kind === "lift"
        ? lift.elevation
        : undefined;
      if (kind === "scale" && !scaleStartPoint) {
        return;
      }
      if ((kind === "lift" || kind === "height") && !liftStartPoint) {
        return;
      }
      rememberResizeAnchor(shape.id, kind, resizeHandleKey);
      event.preventDefault();
      event.stopPropagation();
      capturePointer(event.currentTarget, event.pointerId);
      setEditingRotation(null);
      setEditingCorner(null);
      setPinnedMeasureKey(measureKeyForHandle(kind, handleKey, transformOverlayRef.current));
      if (kind === "height") {
        setHoverMeasureKey(null);
      }
      setActiveRotationWheel(kind === "rotate");
      setActiveTransformKind(kind);
      setSelectionHelpersVisible(state ?? null, kind !== "rotate");
      if (kind === "rotate") {
        setRotationWheelAxis(rotationAxis);
        setPinnedRotationWheelView(wheel && rotationPlane ? { axis: rotationAxis, wheel: { ...wheel }, plane: { ...rotationPlane } } : null);
      } else {
        setPinnedRotationWheelView(null);
      }
      transformRef.current = {
        id: shape.id,
        ids: frame.ids,
        kind,
        handleKey: resizeHandleKey,
        rotationAxis,
        pointerId: event.pointerId,
        startShape: { ...shape },
        items: frame.ids
          .map((id) => shapesRef.current.find((entry) => entry.id === id))
          .filter((entry): entry is WorkplaneShape => Boolean(entry))
          .map((entry) => ({
            id: entry.id,
            startShape: { ...entry },
            startCenter: shapeCenter(entry),
            startQuaternion: quaternionForShape(entry),
          })),
        selectionFrame: frame,
        startScreenAngle: rotationCenter ? screenAngle(localClientX, localClientY, rotationCenter) : 0,
        startClientX: event.clientX,
        startClientY: event.clientY,
        scalePlaneY: kind === "scale" ? yBounds.min : 0,
        scalePlane,
        scaleSigns,
        scaleAnchorPoint,
        scaleStartPoint,
        liftAxis,
        liftPlane,
        liftStartPoint,
        liftHandlePoint,
        liftStartValue,
        rotationAxisVector: kind === "rotate" ? axisVector : undefined,
        rotationPivot: kind === "rotate" ? pivot : undefined,
        customPivot: kind === "rotate" && Boolean(rotationPivotRef.current),
        rotationPlaneCenter: kind === "rotate" ? rotationPlaneCenter : undefined,
        rotationPlaneView: kind === "rotate" ? rotationPlane : undefined,
        rotationStartPointerAngle,
        rotationStartVector: kind === "rotate" ? rotationStartVector : undefined,
        rotationScreenCenter: rotationCenter,
        rotationScreenSign: kind === "rotate" && state ? rotationScreenSign(axisVector, state.camera) : 1,
        rotationStartQuaternion: kind === "rotate" ? quaternionForShape(shape) : undefined,
        wheelCenter: wheel,
      };
      if (kind === "rotate" && state) {
        const renderRect = state.renderer.domElement.getBoundingClientRect();
        setRotationReadout({
          x: event.clientX - renderRect.left + 18,
          y: event.clientY - renderRect.top - 18,
          text: `${Math.round(rotationValueForAxis(shape, rotationAxis))}°`,
          angle: 0,
          pointerAngle: rotationPlanePointerAngle(rotationPlane, localClientX, localClientY, rotationCenter ?? { x: localClientX, y: localClientY }),
        });
      } else if (kind === "lift" && state) {
        const renderRect = state.renderer.domElement.getBoundingClientRect();
        setRotationReadout({
          x: event.clientX - renderRect.left + 22,
          y: event.clientY - renderRect.top - 34,
          text: formatMeasure(liftStartValue ?? 0, workspaceRef.current.accuracy),
        });
      } else {
        setRotationReadout(null);
      }
      if (state) {
        state.needsRender = true;
        state.controls.enabled = false;
      }
      onInteractionActiveChange?.(true);
    },
    [clearMoveDimensions, onInteractionActiveChange, rememberResizeAnchor, toRawPlanePoint],
  );

  // The pivot marker can be dragged to a new place (#140); it is set where it is let go.
  const beginPivotDrag = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    const state = threeRef.current;
    const start = state?.rotationPivot?.clone();
    if (!state || !start) return;
    event.preventDefault();
    event.stopPropagation();
    const marker = event.currentTarget;
    const view = marker.ownerDocument.defaultView ?? window;
    capturePointer(marker, event.pointerId);
    marker.classList.add("dragging");
    let latest: THREE.Vector3 | null = null;
    const show = (point: THREE.Vector3) => {
      state.rotationPivot = point;
      syncTransformOverlay(
        state,
        shapesRef.current,
        renderSelectionIds(),
        transformOverlayRef,
        setTransformOverlay,
        workspaceRef.current.accuracy,
        false,
        false,
        placementWorkplaneRef.current,
        resolvedThemeRef.current,
        workspaceRef.current.dimensionsAlwaysVisible,
      );
      state.needsRender = true;
    };
    const move = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== event.pointerId) return;
      const point = resolvePivotDragPoint(state, moveEvent.clientX, moveEvent.clientY, latest ?? start);
      if (!point) return;
      latest = point;
      show(point);
    };
    const finish = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== event.pointerId) return;
      view.removeEventListener("pointermove", move);
      view.removeEventListener("pointerup", finish);
      view.removeEventListener("pointercancel", finish);
      marker.classList.remove("dragging");
      const moved = latest as THREE.Vector3 | null;
      if (upEvent.type === "pointerup" && moved && moved.distanceTo(start) > 1e-6) {
        onPivotPick?.({ x: moved.x, y: moved.y, z: moved.z });
      } else {
        show(start);
      }
    };
    view.addEventListener("pointermove", move);
    view.addEventListener("pointerup", finish);
    view.addEventListener("pointercancel", finish);
  }, [onPivotPick, renderSelectionIds]);

  const beginCameraDragFromOverlay = useCallback((event: ReactPointerEvent<Element>) => {
    if (event.button !== 1 && event.button !== 2) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const state = threeRef.current;
    const canvas = state?.renderer.domElement;
    const PointerEventConstructor = canvas?.ownerDocument.defaultView?.PointerEvent;
    if (!canvas || !PointerEventConstructor) {
      return;
    }

    const source = event.nativeEvent;
    canvas.dispatchEvent(
      new PointerEventConstructor("pointerdown", {
        bubbles: true,
        cancelable: true,
        composed: true,
        pointerId: source.pointerId,
        pointerType: source.pointerType,
        isPrimary: source.isPrimary,
        button: source.button,
        buttons: source.buttons,
        clientX: source.clientX,
        clientY: source.clientY,
        screenX: source.screenX,
        screenY: source.screenY,
        ctrlKey: source.ctrlKey,
        shiftKey: source.shiftKey,
        altKey: source.altKey,
        metaKey: source.metaKey,
      }),
    );
  }, []);

  const forwardCameraWheelFromOverlay = useCallback((event: ReactWheelEvent<Element>) => {
    const state = threeRef.current;
    const canvas = state?.renderer.domElement;
    const WheelEventConstructor = canvas?.ownerDocument.defaultView?.WheelEvent;
    if (!canvas || !WheelEventConstructor) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const source = event.nativeEvent;
    canvas.dispatchEvent(
      new WheelEventConstructor("wheel", {
        bubbles: true,
        cancelable: true,
        composed: true,
        deltaX: source.deltaX,
        deltaY: source.deltaY,
        deltaZ: source.deltaZ,
        deltaMode: source.deltaMode,
        clientX: source.clientX,
        clientY: source.clientY,
        screenX: source.screenX,
        screenY: source.screenY,
        ctrlKey: source.ctrlKey,
        shiftKey: source.shiftKey,
        altKey: source.altKey,
        metaKey: source.metaKey,
      }),
    );
  }, []);

  const updateTransform = useCallback(
    (clientX: number, clientY: number, shiftKey = false, altKey = false) => {
      const transform = transformRef.current;
      if (!transform) {
        return false;
      }
      if (Math.hypot(clientX - transform.startClientX, clientY - transform.startClientY) > 3) {
        transform.hasMoved = true;
      }

      const step = snapStep(snapRef.current);
      if (transform.kind === "height") {
        const axis = (transform.liftAxis ?? transform.selectionFrame.yAxis).clone().normalize();
        const currentPoint = transform.liftPlane
          ? toRawPlanePoint(clientX, clientY, transform.liftPlane)
          : null;
        const rawDelta = currentPoint && transform.liftStartPoint
          ? currentPoint.clone().sub(transform.liftStartPoint).dot(axis)
          : 0;
        const resizingFromBottom = transform.handleKey === "bottom-height";
        const rawFrameHeight = transform.selectionFrame.height + (resizingFromBottom ? -rawDelta : rawDelta);
        const printerHeight = printerPresetById(workspaceRef.current.printer)?.height;
        const maxHeight = Math.max(...transform.items.map((item) => handleDimensionLimit(workspaceRef.current, item.startShape.kind, 180, "height", transform.selectionFrame.height, printerHeight)));
        const nextFrameHeight = clamp(
          transform.selectionFrame.height + snapValue(rawFrameHeight - transform.selectionFrame.height, step),
          MIN_SHAPE_SIZE,
          maxHeight,
        );
        transform.items.forEach((item) => {
          onUpdateShape(
            item.id,
            resizeShapeAlongFrameNormal(item.startShape, transform.selectionFrame, nextFrameHeight, resizingFromBottom),
          );
        });
        return true;
      }

      if (transform.kind === "lift") {
        const state = threeRef.current;
        const axis = (transform.liftAxis ?? transform.selectionFrame.yAxis).clone().normalize();
        const currentPoint = transform.liftPlane
          ? toRawPlanePoint(clientX, clientY, transform.liftPlane)
          : null;
        const rawDelta = currentPoint && transform.liftStartPoint
          ? currentPoint.clone().sub(transform.liftStartPoint).dot(axis)
          : 0;
        const delta = snapValue(rawDelta, step);
        transform.items.forEach((item) => {
          const nextCenter = item.startCenter.clone().addScaledVector(axis, delta);
          onUpdateShape(item.id, {
            x: cleanNearZero(nextCenter.x, 0.0005),
            z: cleanNearZero(nextCenter.z, 0.0005),
            elevation: cleanNearZero(
              clamp(nextCenter.y - item.startShape.height / 2, MIN_ELEVATION, MAX_ELEVATION),
              0.0005,
            ),
          });
        });
        if (state) {
          const readoutWorld = (transform.liftHandlePoint ?? transform.selectionFrame.center).clone().addScaledVector(axis, delta);
          const readoutPoint = projectToScreen(readoutWorld, state);
          setRotationReadout({
            x: readoutPoint.x + 28,
            y: readoutPoint.y - 30,
            text: formatMeasure((transform.liftStartValue ?? 0) + delta, workspaceRef.current.accuracy),
          });
        }
        return true;
      }

      if (transform.kind === "scale") {
        const worldPoint = transform.scalePlane ? toRawPlanePoint(clientX, clientY, transform.scalePlane) : null;
        if (!worldPoint) {
          return true;
        }
        if (transform.items.length === 1) {
          const maxSize = handleDimensionLimit(workspaceRef.current, transform.startShape.kind, 220, "across", Math.max(transform.selectionFrame.width, transform.selectionFrame.depth, transform.selectionFrame.height));
          const next = resizeShapeFromFrameHandle(transform, worldPoint, transform.handleKey, shiftKey || proportionLockRef.current, altKey, step, maxSize);
          onUpdateShape(transform.id, next);
        } else {
          const maxSize = Math.max(...transform.items.map((item) => handleDimensionLimit(workspaceRef.current, item.startShape.kind, 260, "across", Math.max(transform.selectionFrame.width, transform.selectionFrame.depth, transform.selectionFrame.height))));
          resizeSelectionFromHandle(transform, worldPoint, transform.handleKey, shiftKey || proportionLockRef.current, altKey, step, maxSize).forEach(({ id, patch }) => onUpdateShape(id, patch));
        }
        return true;
      }

      const point = toPlanePoint(clientX, clientY);
      if (!point && transform.kind !== "rotate") {
        return true;
      }

      const state = threeRef.current;
      const rotationCenter = transform.rotationScreenCenter ?? transform.wheelCenter;
      if (!state || !rotationCenter) {
        return true;
      }
      const rect = state.renderer.domElement.getBoundingClientRect();
      const localClientX = clientX - rect.left;
      const localClientY = clientY - rect.top;
      const axisVector = (transform.rotationAxisVector ?? rotationAxisVectorForFrame(transform.handleKey, transform.selectionFrame)).clone().normalize();
      const pivot = transform.rotationPivot ?? transform.selectionFrame.center;
      const planeCenter = transform.rotationPlaneCenter ?? pivot;
      const currentPoint = rayPointOnRotationPlane(state, clientX, clientY, planeCenter, axisVector);
      const rawDelta =
        currentPoint && transform.rotationStartVector && transform.rotationStartVector.lengthSq() > 0.000001
          ? THREE.MathUtils.radToDeg(signedAngleAroundAxis(transform.rotationStartVector, currentPoint.sub(planeCenter), axisVector))
          : THREE.MathUtils.radToDeg(unwrapRadians(screenAngle(localClientX, localClientY, rotationCenter) - transform.startScreenAngle)) * (transform.rotationScreenSign ?? 1);
      const localRotationPointer = rotationPlanePointerLocal(transform.rotationPlaneView, localClientX, localClientY);
      const insideSnapWheel = localRotationPointer
        ? Math.hypot(localRotationPointer.x, localRotationPointer.y) <= ROTATION_PROTRACTOR_OUTER_RADIUS
        : Boolean(
          transform.wheelCenter
          && Math.hypot(localClientX - transform.wheelCenter.x, localClientY - transform.wheelCenter.y) <= transform.wheelCenter.radius
        );
      const rawPointerAngle = rotationPlanePointerAngle(transform.rotationPlaneView, localClientX, localClientY, rotationCenter);
      const wheelSnapDegrees = shiftKey ? ROTATION_WHEEL_SHIFT_SNAP_DEGREES : ROTATION_WHEEL_SNAP_DEGREES;
      const wheelDirectionSign = transform.rotationPlaneView?.directionSign ?? (transform.rotationAxis === "z" ? 1 : -1);
      const snappedWheel = insideSnapWheel
        ? snappedWheelRotation(
            rawPointerAngle,
            transform.rotationStartPointerAngle
              ?? rawPointerAngle - rawDelta * wheelDirectionSign,
            wheelDirectionSign,
            wheelSnapDegrees,
          )
        : null;
      const wheelRotation = snappedWheel
        ? continuousSnappedWheelRotation(
            snappedWheel,
            wheelSnapDegrees,
            transform.rotationWheelSnapDegrees,
            transform.rotationWheelAppliedDelta,
            transform.rotationWheelAppliedPointerAngle,
            transform.rotationWheelDeltaOffset,
            transform.rotationWheelPointerOffset,
          )
        : null;
      if (wheelRotation) {
        transform.rotationWheelSnapDegrees = wheelSnapDegrees;
        transform.rotationWheelDeltaOffset = wheelRotation.deltaOffset;
        transform.rotationWheelPointerOffset = wheelRotation.pointerOffset;
        transform.rotationWheelAppliedDelta = wheelRotation.delta;
        transform.rotationWheelAppliedPointerAngle = wheelRotation.pointerAngle;
      } else {
        transform.rotationWheelSnapDegrees = undefined;
        transform.rotationWheelDeltaOffset = undefined;
        transform.rotationWheelPointerOffset = undefined;
        transform.rotationWheelAppliedDelta = undefined;
        transform.rotationWheelAppliedPointerAngle = undefined;
      }
      const delta = wheelRotation?.delta ?? snappedRotationDelta(rawDelta, false, shiftKey);

      const deltaQuaternion = new THREE.Quaternion().setFromAxisAngle(axisVector, THREE.MathUtils.degToRad(delta));
      const rotationDelta = deltaQuaternion.clone();
      if (state) {
        setRotationReadout({
          x: transform.wheelCenter ? transform.wheelCenter.x : localClientX + 18,
          y: transform.wheelCenter ? transform.wheelCenter.y - 92 : localClientY - 18,
          text: `${Number(delta.toFixed(1))}°`,
          angle: delta,
          pointerAngle: wheelRotation?.pointerAngle ?? rawPointerAngle,
        });
      }
      transform.items.forEach((item) => {
        const nextQuaternion = rotationDelta.clone().multiply(item.startQuaternion);
        const patch: Partial<WorkplaneShape> = rotationPatchFromQuaternion(nextQuaternion);
        if (transform.customPivot) {
          // Around a chosen pivot the point is precision: snapping the centre
          // to the grid would pull the pipe end off the axis it was set on.
          const nextCenter = pivot.clone().add(item.startCenter.clone().sub(pivot).applyQuaternion(rotationDelta));
          patch.x = nextCenter.x;
          patch.z = nextCenter.z;
          patch.elevation = nextCenter.y - item.startShape.height / 2;
        } else if (transform.items.length > 1) {
          const nextCenter = pivot.clone().add(item.startCenter.clone().sub(pivot).applyQuaternion(rotationDelta));
          patch.x = snapPositionValue(nextCenter.x, step, -workspaceRef.current.width / 2 + 6, workspaceRef.current.width / 2 - 6);
          patch.z = snapPositionValue(nextCenter.z, step, -workspaceRef.current.depth / 2 + 6, workspaceRef.current.depth / 2 - 6);
          patch.elevation = snapPositionValue(nextCenter.y - item.startShape.height / 2, step, MIN_ELEVATION, MAX_ELEVATION);
        }
        onUpdateShape(item.id, patch);
      });
      return true;
    },
    [onUpdateShape, toPlanePoint, toRawPlanePoint],
  );

  const suppressLiftEditAfterDrag = useCallback(() => {
    suppressNextLiftEditRef.current = true;
    window.setTimeout(() => {
      suppressNextLiftEditRef.current = false;
    }, 250);
  }, []);

  const suppressCornerEditAfterDrag = useCallback(() => {
    suppressNextCornerEditRef.current = true;
    window.setTimeout(() => {
      suppressNextCornerEditRef.current = false;
    }, 250);
  }, []);

  const finishTransform = useCallback((event: ReactPointerEvent<Element>) => {
    const transform = transformRef.current;
    if (!transform) {
      return;
    }
    if (event.currentTarget.hasPointerCapture(transform.pointerId)) {
      event.currentTarget.releasePointerCapture(transform.pointerId);
    }
    const bakeRotatedShapes = transform.kind === "rotate" && transform.hasMoved ? transform.ids : [];
    if (transform.kind === "lift") {
      setPinnedMeasureKey(getElevationMeasureKey(transformOverlayRef.current));
    }
    if (transform.kind === "lift" && transform.hasMoved) {
      suppressLiftEditAfterDrag();
    }
    if (transform.kind === "scale" && transform.hasMoved) {
      suppressCornerEditAfterDrag();
    }
    if (transform.kind === "rotate" && transform.hasMoved) {
      suppressNextRotationEditRef.current = true;
      window.setTimeout(() => {
        suppressNextRotationEditRef.current = false;
      }, 250);
    }
    transformRef.current = null;
    setActiveRotationWheel(false);
    setActiveTransformKind(null);
    setPinnedRotationWheelView(null);
    setRotationReadout(null);
    if (threeRef.current) {
      setSelectionHelpersVisible(threeRef.current, true);
      threeRef.current.controls.enabled = true;
      threeRef.current.needsRender = true;
    }
    onInteractionActiveChange?.(false);
    bakeRotatedShapes.forEach((id) => onUpdateShape(id, { bakeTransform: true }));
  }, [onInteractionActiveChange, onUpdateShape, suppressCornerEditAfterDrag, suppressLiftEditAfterDrag]);

  // The calculation a box was last set from (#180), while it still gives the body's size; the
  // box then opens on the formula instead of the number, as the Properties field does.
  const formulaForDimensionMark = useCallback((mark: DimensionMark): string | undefined => {
    if (mark.axis !== "width" && mark.axis !== "depth" && mark.axis !== "height") return undefined;
    const shape = shapesRef.current.find((entry) => entry.id === selectedIdsRef.current[0]);
    const formula = shape?.formulas?.[DIMENSION_FORMULA_FIELDS[mark.axis]];
    if (!shape || !formula) return undefined;
    const frame = selectionFrameForShapes([shape], [shape.id]);
    const extent = mark.axis === "width" ? frame?.width ?? shapeWidth(shape) : mark.axis === "depth" ? frame?.depth ?? shapeDepth(shape) : frame?.height ?? shape.height;
    return formulaMatchesMillimeters(formula, extent, parseMeasureMm) ? formula : undefined;
  }, []);

  const beginDimensionEdit = useCallback((mark: DimensionMark) => {
    const id = selectedIdsRef.current[0];
    const isCornerRulerMidpoint = cornerRulerModelRef.current[0]?.mode === "midpoint";
    if (id && (mark.axis === "width" || mark.axis === "depth" || mark.axis === "height") && !isCornerRulerMidpoint) {
      rememberResizeAnchor(id, mark.axis === "height" ? "height" : "scale", mark.handleKey);
    } else {
      lastResizeAnchorRef.current = null;
    }
    setPinnedMeasureKey(mark.handleKey);
    setEditingDimension({ key: mark.key, axis: mark.axis, x: mark.labelX, y: mark.labelY, value: formulaForDimensionMark(mark) ?? mark.label });
  }, [formulaForDimensionMark, rememberResizeAnchor]);

  // The calculation the lone selected body's height above the plate was set from (#180), if it still holds.
  const elevationFormulaFor = useCallback((elevation: number): string | undefined => {
    if (selectedIdsRef.current.length !== 1) return undefined;
    const shape = shapesRef.current.find((entry) => entry.id === selectedIdsRef.current[0]);
    const formula = shape?.formulas?.[DIMENSION_FORMULA_FIELDS.elevation];
    return formulaMatchesMillimeters(formula, elevation, parseMeasureMm) ? formula : undefined;
  }, []);

  const beginLiftEdit = useCallback((handleKey: string, x: number, y: number) => {
    if (suppressNextLiftEditRef.current) {
      suppressNextLiftEditRef.current = false;
      return;
    }
    const activeWorkplane = placementWorkplaneRef.current;
    const frame = selectionFrameForShapes(shapesRef.current, selectedIdsRef.current, activeWorkplane);
    if (!frame) {
      return;
    }
    const elevation = liftGeometryForFrame(frame, activeWorkplane).elevation;
    const elevationMark = Object.values(transformOverlayRef.current?.dimensions ?? {})
      .flat()
      .find((entry) => entry.axis === "elevation");
    const editX = elevationMark?.labelX ?? x;
    const editY = elevationMark?.labelY ?? y;
    setPinnedMeasureKey(elevationMark?.handleKey ?? handleKey);
    setActiveRotationWheel(false);
    setRotationReadout(null);
    setEditingDimension({
      key: "elevation",
      axis: "elevation",
      x: clamp(editX, 44, Math.max(44, (transformOverlayRef.current?.width ?? 900) - 44)),
      y: clamp(editY, 34, Math.max(34, (transformOverlayRef.current?.height ?? 600) - 34)),
      value: elevationFormulaFor(elevation) ?? formatMeasure(elevation, workspaceRef.current.accuracy),
    });
  }, [elevationFormulaFor]);

  // The patch a typed width, depth or height makes to a shape, or null when the
  // text is not a usable size. Shared by the single mark and the corner pair.
  const dimensionSizePatchFor = useCallback((shape: WorkplaneShape, axis: "width" | "depth" | "height", text: string): Partial<WorkplaneShape> | null => {
    const sizeFrame = selectionFrameForShapes([shape], [shape.id]);
    const currentExtent = axis === "width"
      ? sizeFrame?.width ?? shapeWidth(shape)
      : axis === "depth"
        ? sizeFrame?.depth ?? shapeDepth(shape)
        : sizeFrame?.height ?? shape.height;
    const value = resolveMeasureMm(text, currentExtent);
    if (!(Number.isFinite(value) && value > 0)) return null;
    const isCornerRulerMidpoint = cornerRulerModelRef.current[0]?.mode === "midpoint";
    const customLimit = workspaceRef.current.shapeCustomizations[shape.kind]?.maxDimension;
    const nextValue = Math.min(customLimit ?? Number.POSITIVE_INFINITY, Math.max(MIN_SHAPE_SIZE, value));
    const anchor = isCornerRulerMidpoint ? null : lastResizeAnchorRef.current;
    if (axis === "width") {
      const frame = sizeFrame;
      if (shapeHasTaper(shape) && frame) {
        const scaleX = nextValue / Math.max(MIN_SHAPE_SIZE, frame.width);
        const signs = anchor?.shapeId === shape.id ? resizeSignsForDimension(anchor.signs, "width") : { x: 0, z: 0 };
        const nextCenter = signs.x
          ? resizeCenterFromAnchor(frame, resizeAnchorPointForFrame(frame, signs), signs, nextValue, frame.depth)
          : frame.center.clone();
        return {
          ...scaledHorizontalShapePatch(shape, scaleX, 1),
          x: cleanNearZero(nextCenter.x, 0.0005),
          z: cleanNearZero(nextCenter.z, 0.0005),
          elevation: cleanNearZero(nextCenter.y - shape.height / 2, 0.0005),
        };
      } else {
        // A cylinder is always circular - the diameter mark writes both
        // fields, the same as the inspector's diameter field does.
        const patch: Partial<WorkplaneShape> = shape.kind === "cylinder" || shape.kind === "star"
          ? { width: nextValue, depth: nextValue, size: nextValue }
          : { width: nextValue, size: resizedShapeSize(nextValue, shapeDepth(shape)) };
        if (shape.kind === "cone") {
          patch.baseRadius = nextValue / 2;
        }
        return patchWithResizeAnchor(shape, patch, axis, anchor);
      }
    } else if (axis === "depth") {
      const frame = sizeFrame;
      if (shapeHasTaper(shape) && frame) {
        const scaleZ = nextValue / Math.max(MIN_SHAPE_SIZE, frame.depth);
        const signs = anchor?.shapeId === shape.id ? resizeSignsForDimension(anchor.signs, "depth") : { x: 0, z: 0 };
        const nextCenter = signs.z
          ? resizeCenterFromAnchor(frame, resizeAnchorPointForFrame(frame, signs), signs, frame.width, nextValue)
          : frame.center.clone();
        return {
          ...scaledHorizontalShapePatch(shape, 1, scaleZ),
          x: cleanNearZero(nextCenter.x, 0.0005),
          z: cleanNearZero(nextCenter.z, 0.0005),
          elevation: cleanNearZero(nextCenter.y - shape.height / 2, 0.0005),
        };
      } else {
        // Defense in depth: the cylinder's dimension mark never offers this
        // axis (see makeFootprintDimensionMark above), but keep it circular
        // regardless of how the patch got here.
        const patch: Partial<WorkplaneShape> = shape.kind === "cylinder" || shape.kind === "star"
          ? { width: nextValue, depth: nextValue, size: nextValue }
          : { depth: nextValue, size: resizedShapeSize(shapeWidth(shape), nextValue) };
        return patchWithResizeAnchor(shape, patch, axis, anchor);
      }
    } else {
      if (isCornerRulerMidpoint) {
        const deltaY = (shape.height - nextValue) / 2;
        return {
          height: nextValue,
          elevation: cleanNearZero(clamp((shape.elevation ?? 0) + deltaY, MIN_ELEVATION, MAX_ELEVATION), 0.0005),
        };
      } else {
        return patchWithResizeAnchor(shape, { height: nextValue }, axis, anchor);
      }
    }
  }, []);

  const dimensionPatchFor = useCallback((shape: WorkplaneShape, axis: "width" | "depth" | "height", text: string): Partial<WorkplaneShape> | null => {
    const patch = dimensionSizePatchFor(shape, axis, text);
    if (!patch) return null;
    // The calculation rides along with the size it set, in the same change (#180); a plain number clears it.
    const formula = formulaToRemember(text);
    return shape.formulas || formula ? { ...patch, formulas: withFieldFormula(shape.formulas, DIMENSION_FORMULA_FIELDS[axis], formula) } : patch;
  }, [dimensionSizePatchFor]);

  const commitDimensionEdit = useCallback(() => {
    const edit = editingDimension;
    const id = selectedIdsRef.current[0];
    const shape = shapesRef.current.find((entry) => entry.id === id);
    if (!edit || !shape) {
      setEditingDimension(null);
      return;
    }
    if (edit.axis === "elevation") {
      const value = parseMeasureMm(edit.value);
      if (Number.isFinite(value)) {
        const activeWorkplane = placementWorkplaneRef.current;
        const frame = selectionFrameForShapes(shapesRef.current, selectedIdsRef.current, activeWorkplane);
        const lift = frame ? liftGeometryForFrame(frame, activeWorkplane) : null;
        const currentElevation = lift
          ? lift.elevation
          : shape.elevation ?? 0;
        const targetElevation = cleanNearZero(clamp(value, MIN_ELEVATION, MAX_ELEVATION), 0.0005);
        const delta = targetElevation - currentElevation;
        const axis = lift ? lift.axis : new THREE.Vector3(0, 1, 0);
        selectedIdsRef.current.forEach((selectedId) => {
          const selectedShape = shapesRef.current.find((entry) => entry.id === selectedId);
          if (selectedShape) {
            const nextCenter = shapeCenter(selectedShape).addScaledVector(axis, delta);
            const formula = selectedIdsRef.current.length === 1 ? formulaToRemember(edit.value) : null;
            onUpdateShape(selectedId, {
              x: cleanNearZero(nextCenter.x, 0.0005),
              z: cleanNearZero(nextCenter.z, 0.0005),
              elevation: cleanNearZero(clamp(nextCenter.y - selectedShape.height / 2, MIN_ELEVATION, MAX_ELEVATION), 0.0005),
              ...(selectedShape.formulas || formula ? { formulas: withFieldFormula(selectedShape.formulas, DIMENSION_FORMULA_FIELDS.elevation, formula) } : {}),
            });
          }
        });
      }
      setEditingDimension(null);
      setPinnedMeasureKey(null);
      return;
    }
    const patch = dimensionPatchFor(shape, edit.axis, edit.value);
    if (patch) onUpdateShape(id, patch);
    setEditingDimension(null);
    setPinnedMeasureKey(null);
  }, [dimensionPatchFor, editingDimension, onUpdateShape]);

  // A click on a corner opens its width and depth together; Tab moves between them.
  const beginCornerEdit = useCallback((handleKey: string) => {
    if (suppressNextCornerEditRef.current) {
      suppressNextCornerEditRef.current = false;
      return;
    }
    const id = selectedIdsRef.current[0];
    const marks = (transformOverlayRef.current?.dimensions[handleKey] ?? []).filter((mark) => mark.axis === "width" || mark.axis === "depth");
    if (!id || marks.length === 0) return;
    // A round shape only has its diameter mark.
    if (marks.length === 1) {
      beginDimensionEdit(marks[0]);
      return;
    }
    rememberResizeAnchor(id, "scale", handleKey);
    setPinnedMeasureKey(handleKey);
    setEditingDimension(null);
    setEditingCorner({
      entries: marks.slice(0, 2).map((mark) => ({
        key: mark.key,
        axis: mark.axis as "width" | "depth",
        x: mark.labelX,
        y: mark.labelY,
        value: formulaForDimensionMark(mark) ?? mark.label,
        original: formulaForDimensionMark(mark) ?? mark.label,
      })),
    });
  }, [beginDimensionEdit, formulaForDimensionMark, rememberResizeAnchor]);

  const commitCornerEdit = useCallback(() => {
    const edit = editingCorner;
    const shape = shapesRef.current.find((entry) => entry.id === selectedIdsRef.current[0]);
    setEditingCorner(null);
    setPinnedMeasureKey(null);
    if (!edit || !shape) return;
    // Both sizes go out as one patch, the second worked out on the first's result.
    let working = shape;
    let merged: Partial<WorkplaneShape> = {};
    edit.entries.forEach((entry) => {
      if (entry.value.trim() === entry.original) return;
      const patch = dimensionPatchFor(working, entry.axis, entry.value);
      if (!patch) return;
      working = { ...working, ...patch };
      merged = { ...merged, ...patch };
    });
    if (Object.keys(merged).length > 0) onUpdateShape(shape.id, merged);
  }, [dimensionPatchFor, editingCorner, onUpdateShape]);

  // The 3D view keeps focus on pointer down, so a click beside the boxes never
  // blurs them; any press outside the pair applies it, as leaving a field would.
  useEffect(() => {
    if (!editingCorner) return;
    const applyOnOutsidePress = (event: PointerEvent) => {
      if ((event.target as HTMLElement | null)?.dataset?.cornerInput) return;
      commitCornerEdit();
    };
    window.addEventListener("pointerdown", applyOnOutsidePress, true);
    return () => window.removeEventListener("pointerdown", applyOnOutsidePress, true);
  }, [commitCornerEdit, editingCorner]);

  const cancelCornerEdit = useCallback(() => {
    setEditingCorner(null);
    setPinnedMeasureKey(null);
  }, []);

  const cancelDimensionEdit = useCallback(() => {
    setEditingDimension(null);
    setPinnedMeasureKey(null);
  }, []);

  const beginRulerDimensionEdit = useCallback((item: RulerDimensionOverlayItem) => {
    if (!item.field) return;
    setRulerDimensionEditing({ shapeId: item.shapeId, field: item.field, x: item.labelX, y: item.labelY, value: formatMeasure(item.value, workspaceRef.current.accuracy), base: item.value });
  }, []);

  const commitRulerDimensionEdit = useCallback(() => {
    const edit = rulerDimensionEditing;
    setRulerDimensionEditing(null);
    if (!edit) return;
    const shape = shapesRef.current.find((entry) => entry.id === edit.shapeId);
    const value = resolveMeasureMm(edit.value, edit.base);
    if (shape && Number.isFinite(value) && value > 0) {
      const nextValue = Math.max(MIN_SHAPE_SIZE, value);
      if (edit.field === "width") {
        onUpdateShape(edit.shapeId, { width: nextValue, size: resizedShapeSize(nextValue, shapeDepth(shape)) });
      } else if (edit.field === "depth") {
        onUpdateShape(edit.shapeId, { depth: nextValue, size: resizedShapeSize(shapeWidth(shape), nextValue) });
      } else {
        onUpdateShape(edit.shapeId, { height: nextValue });
      }
    }
  }, [onUpdateShape, rulerDimensionEditing]);

  const cancelRulerDimensionEdit = useCallback(() => {
    setRulerDimensionEditing(null);
  }, []);

  const rulerDuplicateMoveThreshold = 6;

  const handleRulerDuplicatePointerDown = useCallback((event: ReactPointerEvent<HTMLButtonElement>, item: RulerDimensionOverlayItem) => {
    event.stopPropagation();
    const shape = shapesRef.current.find((entry) => entry.id === item.shapeId);
    const ruler = shapesRef.current.find((entry) => entry.id === item.rulerId);
    if (!shape || !ruler) return;
    const rulerPose = { x: ruler.x, z: ruler.z, rotation: ruler.rotation, length: shapeWidth(ruler), crossWidth: shapeDepth(ruler) };
    const match = rulerDimensionMatch(rulerPose, {
      x: shape.x,
      z: shape.z,
      rotation: shape.rotation,
      rotationX: shape.rotationX,
      rotationZ: shape.rotationZ,
      width: shapeWidth(shape),
      height: shape.height,
      depth: shapeDepth(shape),
    });
    if (!match) return;
    capturePointer(event.target as HTMLButtonElement, event.pointerId);
    // Der Ziehpunkt haengt ueber der Arbeitsflaeche - die Ruecknahme muss auf
    // dieselbe Hoehe zielen, sonst verschiebt die Kamera-Schraege den
    // zurueckgerechneten Punkt naeher an sich heran (Parallaxenfehler).
    const planeY = shapesRef.current.reduce((max, entry) => Math.max(max, (entry.elevation ?? 0) + entry.height), 0) + 6;
    rulerDuplicateDragRef.current = {
      pointerId: event.pointerId,
      rulerId: ruler.id,
      shapeId: shape.id,
      baseAlong: match.alongOffset + match.extentAlong / 2,
      planeY,
      sourceX: shape.x,
      sourceZ: shape.z,
    };
    setRulerDuplicatePreview({ x: item.handleX, y: item.handleY, label: formatMeasure(match.extentAlong, workspaceRef.current.accuracy) });
  }, []);

  const handleRulerDuplicatePointerMove = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = rulerDuplicateDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const ruler = shapesRef.current.find((entry) => entry.id === drag.rulerId);
    const point = ruler ? toPlanePointAtY(event.clientX, event.clientY, drag.planeY) : null;
    if (!ruler || !point) return;
    const rulerPose = { x: ruler.x, z: ruler.z, rotation: ruler.rotation, length: shapeWidth(ruler), crossWidth: shapeDepth(ruler) };
    const axisAlong = new THREE.Vector3(1, 0, 0).applyQuaternion(quaternionForShape(ruler));
    const pointerAlong = (point.x - rulerPose.x) * axisAlong.x + (point.z - rulerPose.z) * axisAlong.z;
    const distance = pointerAlong - drag.baseAlong;
    const state = threeRef.current;
    if (state && Math.abs(distance) >= 0.01) {
      const target = pointAlongRuler(rulerPose, drag.baseAlong + distance);
      const preview = projectToScreen(new THREE.Vector3(target.x, drag.planeY, target.z), state);
      setRulerDuplicatePreview({ x: preview.x, y: preview.y, label: formatMeasure(Math.abs(distance), workspaceRef.current.accuracy) });
    }
  }, [toPlanePointAtY]);

  const handleRulerDuplicatePointerUp = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = rulerDuplicateDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    rulerDuplicateDragRef.current = null;
    setRulerDuplicatePreview(null);
    const ruler = shapesRef.current.find((entry) => entry.id === drag.rulerId);
    const point = ruler ? toPlanePointAtY(event.clientX, event.clientY, drag.planeY) : null;
    if (!ruler || !point) return;
    const rulerPose = { x: ruler.x, z: ruler.z, rotation: ruler.rotation, length: shapeWidth(ruler), crossWidth: shapeDepth(ruler) };
    const axisAlong = new THREE.Vector3(1, 0, 0).applyQuaternion(quaternionForShape(ruler));
    const pointerAlong = (point.x - rulerPose.x) * axisAlong.x + (point.z - rulerPose.z) * axisAlong.z;
    const distance = pointerAlong - drag.baseAlong;
    if (Math.abs(distance) < rulerDuplicateMoveThreshold) {
      // Kaum Bewegung - das war ein Klick, keine Ziehbewegung. Statt eines
      // kaum lesbaren Kopiervorgangs im Millimeterbereich lieber eine
      // eintippbare Distanz anbieten, mit der eigenen Laenge als Vorschlag.
      const shape = shapesRef.current.find((entry) => entry.id === drag.shapeId);
      const own = shape ? rulerDimensionMatch(rulerPose, {
        x: shape.x, z: shape.z, rotation: shape.rotation, rotationX: shape.rotationX, rotationZ: shape.rotationZ,
        width: shapeWidth(shape), height: shape.height, depth: shapeDepth(shape),
      }) : null;
      const suggested = own?.extentAlong ?? 10;
      setRulerDuplicateEditing({
        rulerId: drag.rulerId,
        shapeId: drag.shapeId,
        baseAlong: drag.baseAlong,
        x: event.clientX,
        y: event.clientY,
        value: formatMeasure(suggested, workspaceRef.current.accuracy),
      });
      return;
    }
    const targetAlong = drag.baseAlong + distance;
    const target = pointAlongRuler(rulerPose, targetAlong);
    onDuplicateShapeAt?.(drag.shapeId, target);
  }, [onDuplicateShapeAt, toPlanePointAtY]);

  const commitRulerDuplicateEdit = useCallback(() => {
    const edit = rulerDuplicateEditing;
    setRulerDuplicateEditing(null);
    if (!edit) return;
    const ruler = shapesRef.current.find((entry) => entry.id === edit.rulerId);
    const value = parseMeasureMm(edit.value);
    if (ruler && Number.isFinite(value)) {
      const rulerPose = { x: ruler.x, z: ruler.z, rotation: ruler.rotation, length: shapeWidth(ruler), crossWidth: shapeDepth(ruler) };
      const target = pointAlongRuler(rulerPose, edit.baseAlong + value);
      onDuplicateShapeAt?.(edit.shapeId, target);
    }
  }, [onDuplicateShapeAt, rulerDuplicateEditing]);

  const cancelRulerDuplicateEdit = useCallback(() => {
    setRulerDuplicateEditing(null);
  }, []);

  const beginRotationEdit = useCallback((handleKey: string, x: number, y: number) => {
    if (suppressNextRotationEditRef.current) {
      suppressNextRotationEditRef.current = false;
      return;
    }
    const axis = rotationAxisForHandle(handleKey);
    const shape = selectedIdsRef.current.length === 1 ? shapesRef.current.find((entry) => entry.id === selectedIdsRef.current[0]) : null;
    const currentValue = shape ? rotationValueForAxis(shape, axis) : 0;
    setPinnedMeasureKey(handleKey);
    setActiveRotationWheel(true);
    setRotationWheelAxis(axis);
    setRotationReadout(null);
    setEditingRotation({
      axis,
      handleKey,
      x: clamp(x, 38, Math.max(38, (transformOverlayRef.current?.width ?? 900) - 38)),
      y: clamp(y, 38, Math.max(38, (transformOverlayRef.current?.height ?? 600) - 38)),
      value: String(Number(currentValue.toFixed(1))),
    });
  }, []);

  const commitRotationEdit = useCallback(() => {
    const edit = editingRotation;
    if (!edit) {
      return;
    }
    const value = parseMeasurementInput(edit.value);
    if (Number.isFinite(value)) {
      const pivot = pivotVector(rotationPivotRef.current);
      selectedIdsRef.current.forEach((id) => {
        const shape = shapesRef.current.find((entry) => entry.id === id);
        const rotationPatch = rotationPatchForAxis(edit.axis, value);
        if (!pivot || !shape) {
          onUpdateShape(id, { ...rotationPatch, bakeTransform: true });
          return;
        }
        const startQuaternion = quaternionForShape(shape);
        const delta = quaternionForShape({ ...shape, ...rotationPatch }).multiply(startQuaternion.clone().invert());
        onUpdateShape(id, { ...rotatedGeometryShapePatch(shape, delta, pivot), bakeTransform: true });
      });
    }
    setEditingRotation(null);
    setEditingCorner(null);
    setActiveRotationWheel(false);
  }, [editingRotation, onUpdateShape]);

  const cancelRotationEdit = useCallback(() => {
    setEditingRotation(null);
    setEditingCorner(null);
    setActiveRotationWheel(false);
  }, []);

  const pickShape = useCallback((clientX: number, clientY: number, pointerType = "mouse") => {
    const state = threeRef.current;
    if (!state) {
      return null;
    }
    const tolerance = pointerType === "touch" ? PICK_TOLERANCE_PIXELS_TOUCH : PICK_TOLERANCE_PIXELS;

    const rect = state.renderer.domElement.getBoundingClientRect();
    state.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    state.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    state.raycaster.setFromCamera(state.pointer, state.camera);
    state.raycaster.layers.set(RENDER_LAYER_SHAPES);

    const pickable = (entry: THREE.Intersection) => {
      // Only surfaces pick a body. Its edge lines count as hit within 1.15 mm of the ray, so
      // through a slot narrower than about 3 mm the rim always won over the body behind it (#193).
      if (!(entry.object instanceof THREE.Mesh)) return false;
      if (state.sectionPlane && state.sectionPlane.distanceToPoint(entry.point) < -0.001) return false;
      const shapeId = entry.object.userData.shapeId;
      if (typeof shapeId !== "string") return false;
      const shape = shapesRef.current.find((candidate) => candidate.id === shapeId);
      return shape ? !shape.imagePlate : false;
    };
    const hit = state.raycaster.intersectObjects(state.shapeLayer.children, true).find(pickable);
    if (hit) {
      return hit.object.userData.shapeId as string;
    }

    // A press that just misses still means the body next to it: a thin wall or
    // a small part is hard to hit exactly. So the same test runs once more on
    // a small ring around the pointer - but no further. The middle of a bore
    // or the gap between two parts of a group is empty space and stays so.
    let nearestId: string | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (let step = 0; step < PICK_TOLERANCE_RAYS; step += 1) {
      const angle = (step / PICK_TOLERANCE_RAYS) * Math.PI * 2;
      state.pointer.x = ((clientX + Math.cos(angle) * tolerance - rect.left) / rect.width) * 2 - 1;
      state.pointer.y = -((clientY + Math.sin(angle) * tolerance - rect.top) / rect.height) * 2 + 1;
      state.raycaster.setFromCamera(state.pointer, state.camera);
      const near = state.raycaster.intersectObjects(state.shapeLayer.children, true).find(pickable);
      if (near && near.distance < nearestDistance) {
        nearestId = near.object.userData.shapeId as string;
        nearestDistance = near.distance;
      }
    }

    return nearestId;
  }, []);

  const pickPlacementSurface = useCallback((clientX: number, clientY: number, reverse: boolean, skip?: ReadonlySet<string>) => {
    const state = threeRef.current;
    if (!state) return null;
    const rect = state.renderer.domElement.getBoundingClientRect();
    state.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    state.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    state.raycaster.setFromCamera(state.pointer, state.camera);
    state.raycaster.layers.set(RENDER_LAYER_SHAPES);

    const hit = state.raycaster
      .intersectObjects(state.shapeLayer.children, true)
      .find((entry) => {
        if (state.sectionPlane && state.sectionPlane.distanceToPoint(entry.point) < -0.001) return false;
        return entry.object instanceof THREE.Mesh && entry.face && typeof entry.object.userData.shapeId === "string"
          && !skip?.has(entry.object.userData.shapeId as string);
      });
    if (!hit?.face) return null;

    const surface = hit.object as THREE.Mesh<THREE.BufferGeometry>;
    surface.updateWorldMatrix(true, false);
    const normal = hit.face.normal.clone().applyNormalMatrix(
      new THREE.Matrix3().getNormalMatrix(surface.matrixWorld),
    ).normalize();
    const shapeId = hit.object.userData.shapeId as string;
    const shapeObject = findShapeObject(state, shapeId);
    const shapeQuaternion = shapeObject?.getWorldQuaternion(new THREE.Quaternion()) ?? new THREE.Quaternion();
    const position = surface.geometry.getAttribute("position");
    const triangle = [hit.face.a, hit.face.b, hit.face.c]
      .filter((index) => index >= 0 && index < position.count)
      .map((index) => new THREE.Vector3().fromBufferAttribute(position, index).applyMatrix4(surface.matrixWorld));
    const faceEdges = triangle.length === 3
      ? [
          triangle[1].clone().sub(triangle[0]),
          triangle[2].clone().sub(triangle[1]),
          triangle[0].clone().sub(triangle[2]),
        ]
          .map((edge) => edge.projectOnPlane(normal))
          .filter((edge) => edge.lengthSq() > 1e-8)
          .sort((a, b) => b.lengthSq() - a.lengthSq())
      : [];
    const pointerX = clientX - rect.left;
    const pointerY = clientY - rect.top;
    const feature = placementFeatureSnap(state, surface, hit.point, normal, pointerX, pointerY);
    // On a lying face the grid runs along the body (for a plain or baked body: along the plate),
    // not along whichever triangle edge was hit - that tilted it at random (#189). On an
    // edge it runs along that edge, which is the way to choose another angle on purpose.
    const lying = Math.abs(normal.y) > 0.999;
    let tangent = feature?.kind === "edge"
      ? feature.direction.clone().projectOnPlane(normal)
      : lying
        ? new THREE.Vector3(1, 0, 0).applyQuaternion(shapeQuaternion).projectOnPlane(normal)
        : faceEdges[Math.min(1, faceEdges.length - 1)]?.clone()
          ?? new THREE.Vector3(1, 0, 0).applyQuaternion(shapeQuaternion).projectOnPlane(normal);
    if (tangent.lengthSq() < 1e-8) {
      tangent = new THREE.Vector3(0, 0, 1).applyQuaternion(shapeQuaternion).projectOnPlane(normal);
    }
    const stableDirection = new THREE.Vector3(1, 0, 0).projectOnPlane(normal);
    if (stableDirection.lengthSq() < 1e-8) {
      stableDirection.set(0, 0, 1).projectOnPlane(normal);
    }
    if (tangent.dot(stableDirection) < 0) {
      tangent.negate();
    }

    // A corner is taken as it is; on an edge the point moves along it in grid steps from its end.
    const step = snapStep(snapRef.current);
    const featurePoint = feature?.kind === "vertex"
      ? feature.point
      : feature?.kind === "edge" && step > 0
        ? feature.start.clone().addScaledVector(feature.direction, Math.round(feature.point.clone().sub(feature.start).dot(feature.direction) / step) * step)
        : feature?.point ?? null;
    const origin = featurePoint ?? hit.point;
    const workplane = placementWorkplaneFromSurface(
      { x: origin.x, y: origin.y, z: origin.z },
      { x: normal.x, y: normal.y, z: normal.z },
      { x: tangent.x, y: tangent.y, z: tangent.z },
      reverse,
      // A standing face keeps "up" pointing up - unless an edge was picked to set the angle.
      feature?.kind !== "edge",
    );

    return {
      shapeId,
      point: hit.point.clone(),
      normal,
      workplane: featurePoint ? workplane : snapPlacementWorkplaneOrigin(workplane, step),
    };
  }, []);
  pickPlacementSurfaceRef.current = pickPlacementSurface;

  /**
   * Wohin eine Notiz gehoert, die hier gesetzt oder hingezogen wird: auf den
   * Koerper unter dem Zeiger - dann haengt sie an ihm -, sonst auf die
   * Arbeitsebene. Anders als das Massband sucht sie keine Ecke und keine Kante;
   * eine Notiz will dort stehen, wo hingezeigt wurde.
   */
  const resolveNoteAnchor = useCallback((clientX: number, clientY: number) => {
    const state = threeRef.current;
    if (!state) return null;
    const rect = state.renderer.domElement.getBoundingClientRect();
    state.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    state.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    state.raycaster.setFromCamera(state.pointer, state.camera);
    state.raycaster.layers.set(RENDER_LAYER_SHAPES);
    const hit = state.raycaster.intersectObjects(state.shapeLayer.children, true).find((entry) => {
      // A note sits on a surface; an edge line near the pointer is not one (#193).
      if (!(entry.object instanceof THREE.Mesh)) return false;
      if (state.sectionPlane && state.sectionPlane.distanceToPoint(entry.point) < -0.001) return false;
      const shapeId = entry.object.userData.shapeId;
      if (typeof shapeId !== "string") return false;
      const shape = shapesRef.current.find((candidate) => candidate.id === shapeId);
      return shape ? !shape.hidden : false;
    });
    if (hit) {
      const shapeId = hit.object.userData.shapeId as string;
      const attachment = tapeAttachmentFromWorld(state, shapeId, hit.point.clone());
      if (attachment) {
        return {
          x: hit.point.x,
          y: hit.point.y,
          z: hit.point.z,
          anchor: { shapeId, normalized: attachment.normalized } satisfies WorkplaneNoteAnchor,
        };
      }
    }
    const raw = toRawPlanePoint(clientX, clientY, state.dragPlane);
    if (!raw) return null;
    const bounds = workspaceRef.current;
    return {
      x: clamp(raw.x, -bounds.width / 2, bounds.width / 2),
      y: 0,
      z: clamp(raw.z, -bounds.depth / 2, bounds.depth / 2),
      anchor: undefined,
    };
  }, [toRawPlanePoint]);

  const handleNotePinPointerDown = useCallback((event: ReactPointerEvent<HTMLButtonElement>, noteId: string) => {
    event.stopPropagation();
    noteDragRef.current = { noteId, pointerId: event.pointerId, moved: false };
    capturePointer(event.currentTarget, event.pointerId);
  }, []);

  const handleNotePinPointerMove = useCallback((event: ReactPointerEvent<HTMLButtonElement>, noteId: string) => {
    const drag = noteDragRef.current;
    if (!drag || drag.noteId !== noteId || drag.pointerId !== event.pointerId) return;
    event.stopPropagation();
    const anchor = resolveNoteAnchor(event.clientX, event.clientY);
    if (!anchor) return;
    drag.moved = true;
    // A reference point goes where it is dropped and never sticks to a body.
    const isPoint = notesRef.current.find((candidate) => candidate.id === noteId)?.kind === "point";
    onNoteUpdate?.(noteId, isPoint ? { x: anchor.x, y: anchor.y, z: anchor.z } : { x: anchor.x, y: anchor.y, z: anchor.z, anchor: anchor.anchor }, true);
  }, [onNoteUpdate, resolveNoteAnchor]);

  const handleNotePinPointerUp = useCallback((event: ReactPointerEvent<HTMLButtonElement>, noteId: string) => {
    const drag = noteDragRef.current;
    if (!drag || drag.noteId !== noteId) return;
    noteDragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!drag.moved) return;
    // Nach einem Zug darf der Klick die Notiz nicht auch noch auf- oder
    // zuklappen - er kommt trotzdem, also wird er hier entwertet.
    noteClickSuppressedRef.current = noteId;
    const note = notesRef.current.find((candidate) => candidate.id === noteId);
    if (note) onNoteUpdate?.(noteId, { x: note.x, y: note.y, z: note.z, anchor: note.anchor });
  }, [onNoteUpdate]);

  /**
   * Nur der Ref traegt das Modell - keine eigene React-Zustandsvariable dafuer,
   * weil `setCornerRulerOverlay` gleich danach ohnehin den Neuaufbau ausloest.
   * Sofortiger Sync direkt hier, nicht erst beim naechsten Kamera-Bildtakt -
   * dieselbe Falle wie beim Ursprungs-Overlay, siehe layerling-lineal.md.
   */
  const storeCornerRulerModel = useCallback((next: CornerRulerInstance[]) => {
    cornerRulerModelRef.current = next;
    if (threeRef.current) {
      syncCornerRulerToolOverlay(threeRef.current, next, shapesRef.current, selectedIdsRef.current, cornerRulerOverlayRef, setCornerRulerOverlay, workspaceRef.current.accuracy);
      threeRef.current.needsRender = true;
    }
  }, []);

  /**
   * Wohin die Ecke kommt: an eine Koerperecke in der Naehe, sonst ins Raster
   * der Ebene - immer in der Ebene selbst, auch wenn die Ecke davor oder
   * dahinter liegt (#105).
   */
  const resolveCornerRulerPoint = useCallback((clientX: number, clientY: number, workplane: PlacementWorkplane): PlacementPoint | null => {
    const state = threeRef.current;
    if (state) {
      const rect = state.renderer.domElement.getBoundingClientRect();
      const pointerX = clientX - rect.left;
      const pointerY = clientY - rect.top;
      const visible = shapesRef.current.filter((shape) => !shape.hidden && !isNonSolidShapeKind(shape.kind));
      // Die Ecken der Koerperboxen - die Kantenlinien, an denen das Massband
      // einrastet, sind nicht in jeder Ansicht da. Dazu deren echte Eckpunkte.
      const corners = visible.flatMap((shape) => shapeBoxCornersWorld(shape));
      const modelVertex = visible.length ? pickModelTapeCandidate(state, visible.map((shape) => shape.id), clientX, clientY) : null;
      if (modelVertex?.attachment?.kind === "vertex") corners.push(new THREE.Vector3(modelVertex.x, modelVertex.y, modelVertex.z));
      if (notesVisibleRef.current) referencePoints(notesRef.current).forEach((point) => corners.push(new THREE.Vector3(point.x, point.y, point.z)));
      let nearest: { point: THREE.Vector3; distance: number } | null = null;
      corners.forEach((corner) => {
        const screen = projectToScreen(corner, state);
        const distance = Math.hypot(screen.x - pointerX, screen.y - pointerY);
        if (distance <= CORNER_RULER_SNAP_PX && (!nearest || distance < nearest.distance)) nearest = { point: corner, distance };
      });
      const snapped = nearest as { point: THREE.Vector3; distance: number } | null;
      if (snapped) {
        const local = placementWorkplaneCoordinates(workplane, snapped.point);
        return placementWorkplanePoint(workplane, local.x, local.z);
      }
    }
    return toPlacementWorkplanePoint(clientX, clientY, workplane);
  }, [toPlacementWorkplanePoint]);

  const placeCornerRuler = useCallback((point: PlacementPoint, workplane: PlacementWorkplane) => {
    const existingMode = cornerRulerModelRef.current[0]?.mode ?? "endpoint";
    const instance: CornerRulerInstance = {
      id: `corner-ruler-${++cornerRulerIdRef.current}`,
      corner: point,
      workplane,
      frame: cornerRulerFrameForWorkplane(workplane),
      armLengthX: CORNER_RULER_DEFAULT_ARM_X,
      armLengthZ: CORNER_RULER_DEFAULT_ARM_Z,
      mode: existingMode,
    };
    storeCornerRulerModel([instance]);
  }, [storeCornerRulerModel]);

  const toggleCornerRulerMode = useCallback((id: string) => {
    storeCornerRulerModel(
      cornerRulerModelRef.current.map((ruler) => {
        if (ruler.id !== id) return ruler;
        const nextMode: CornerRulerMode = ruler.mode === "midpoint" ? "endpoint" : "midpoint";
        return { ...ruler, mode: nextMode };
      })
    );
  }, [storeCornerRulerModel]);

  const beginRulerCoordinateEdit = useCallback((
    rulerId: string,
    shapeIds: string[],
    axis: "x" | "z" | "elevation",
    value: number,
    x: number,
    y: number,
  ) => {
    setRulerCoordinateEditing({
      rulerId,
      shapeIds,
      axis,
      x,
      y,
      value: formatMeasure(value, workspaceRef.current.accuracy),
    });
  }, []);

  const commitRulerCoordinateEdit = useCallback(() => {
    const edit = rulerCoordinateEditing;
    setRulerCoordinateEditing(null);
    if (!edit) return;
    const wanted = new Set(edit.shapeIds);
    const moved = shapesRef.current.filter((entry) => wanted.has(entry.id));
    const ruler = cornerRulerModelRef.current.find((entry) => entry.id === edit.rulerId);
    const value = parseMeasureMm(edit.value);
    if (!moved.length || !ruler || !Number.isFinite(value)) return;

    const { frame } = ruler;
    const xAxis = new THREE.Vector3(frame.xAxis.x, frame.xAxis.y, frame.xAxis.z).normalize();
    const zAxis = new THREE.Vector3(frame.zAxis.x, frame.zAxis.y, frame.zAxis.z).normalize();
    const yAxis = new THREE.Vector3(frame.normal.x, frame.normal.y, frame.normal.z).normalize();
    const corner = new THREE.Vector3(ruler.corner.x, ruler.corner.y, ruler.corner.z);
    const bounds = projectShapesExtent(moved, xAxis, yAxis, zAxis, corner);
    const coords = computeCornerRulerRelativeCoordinates({
      rulerCorner: ruler.corner,
      rulerRotation: 0,
      frame,
      mode: ruler.mode,
      bounds,
    });
    const currentVal = edit.axis === "elevation" ? coords.elevation : edit.axis === "x" ? coords.x : coords.z;
    const delta = value - currentVal;

    // Alle markierten Koerper wandern um denselben Betrag - ihre Lage
    // zueinander bleibt, wie beim gemeinsamen Verschieben mit der Maus. Die
    // Klammer macht daraus einen einzigen Rueckgaengig-Schritt.
    // Entlang der eigenen Richtungen des Lineals - auf einer senkrechten
    // Flaeche geht "entlang des Arms" auch nach oben oder unten (#105).
    const shift = cornerRulerShiftVector(frame, edit.axis, delta);
    onInteractionActiveChange?.(true);
    moved.forEach((shape) => {
      onUpdateShape(shape.id, {
        ...(Math.abs(shift.x) > 1e-9 ? { x: cleanNearZero(shape.x + shift.x, 0.0005) } : {}),
        ...(Math.abs(shift.z) > 1e-9 ? { z: cleanNearZero(shape.z + shift.z, 0.0005) } : {}),
        ...(Math.abs(shift.y) > 1e-9 ? { elevation: cleanNearZero(clamp((shape.elevation ?? 0) + shift.y, MIN_ELEVATION, MAX_ELEVATION), 0.0005) } : {}),
      });
    });
    onInteractionActiveChange?.(false);
  }, [onInteractionActiveChange, onUpdateShape, rulerCoordinateEditing]);

  const cancelRulerCoordinateEdit = useCallback(() => {
    setRulerCoordinateEditing(null);
  }, []);

  const removeCornerRuler = useCallback((id: string) => {
    storeCornerRulerModel(cornerRulerModelRef.current.filter((ruler) => ruler.id !== id));
  }, [storeCornerRulerModel]);

  const toggleCornerRulerTool = useCallback(() => {
    if (splitActiveRef.current) return;
    const next = !cornerRulerModeRef.current;
    if (next) onCancelCruise?.();
    cornerRulerModeRef.current = next;
    setCornerRulerMode(next);
  }, [onCancelCruise]);

  /** Der Griff ist immer direkt ziehbar, ohne eigenen Verschieben-Modus - wie bei einer Notiz-Nadel, nicht wie beim Massband (das mehrere Punkte je Strecke verwaltet und deshalb einen Modus braucht). Ein Klick ohne Zug dreht die Instanz um 90 Grad - wie in Tinkercad. */
  const handleCornerRulerHandlePointerDown = useCallback((event: ReactPointerEvent<SVGCircleElement>, id: string) => {
    event.preventDefault();
    event.stopPropagation();
    cornerRulerDragRef.current = { id, pointerId: event.pointerId, moved: false };
    capturePointer(event.currentTarget, event.pointerId);
  }, []);

  const handleCornerRulerHandlePointerMove = useCallback((event: ReactPointerEvent<SVGCircleElement>, id: string) => {
    const drag = cornerRulerDragRef.current;
    if (!drag || drag.id !== id || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const current = cornerRulerModelRef.current.find((ruler) => ruler.id === id);
    if (!current) return;
    const point = resolveCornerRulerPoint(event.clientX, event.clientY, current.workplane);
    if (!point) return;
    drag.moved = true;
    storeCornerRulerModel(cornerRulerModelRef.current.map((ruler) => ruler.id === id ? { ...ruler, corner: point } : ruler));
  }, [resolveCornerRulerPoint, storeCornerRulerModel]);

  const handleCornerRulerHandlePointerUp = useCallback((event: ReactPointerEvent<SVGCircleElement>, id: string) => {
    const drag = cornerRulerDragRef.current;
    if (!drag || drag.id !== id) return;
    cornerRulerDragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (drag.moved) return;
    storeCornerRulerModel(cornerRulerModelRef.current.map((ruler) => ruler.id === id ? { ...ruler, frame: rotateCornerRulerFrame(ruler.frame) } : ruler));
  }, [storeCornerRulerModel]);

  const toggleNoteCard = useCallback((noteId: string) => {
    if (noteClickSuppressedRef.current === noteId) {
      noteClickSuppressedRef.current = null;
      return;
    }
    const note = notesRef.current.find((candidate) => candidate.id === noteId);
    if (!note) return;
    onNoteUpdate?.(noteId, { collapsed: !note.collapsed });
  }, [onNoteUpdate]);

  const pickModifierEdge = useCallback((clientX: number, clientY: number) => {
    const state = threeRef.current;
    if (!state) return null;
    return pickModifierEdgeFromScreen(state, modifierEdgesRef.current, clientX, clientY);
  }, []);

  const updateModifierEdgeHover = useCallback((clientX: number, clientY: number) => {
    const edgeId = pickModifierEdge(clientX, clientY);
    setHoverModifierEdgeId((current) => (current === edgeId ? current : edgeId));
  }, [pickModifierEdge]);

  const clearModifierEdgeHover = useCallback(() => {
    setHoverModifierEdgeId((current) => (current === null ? current : null));
  }, []);

  const pickTransformHandle = useCallback((clientX: number, clientY: number) => {
    const state = threeRef.current;
    if (!state || selectedIdsRef.current.length !== 1) {
      return null;
    }

    const rect = state.renderer.domElement.getBoundingClientRect();
    state.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    state.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    state.raycaster.setFromCamera(state.pointer, state.camera);
    state.raycaster.layers.set(RENDER_LAYER_HELPERS);

    const intersections = state.raycaster.intersectObjects(state.helperLayer.children, true);
    const hit = intersections.find((entry) => typeof entry.object.userData.transformHandle === "string");
    if (!hit) {
      return null;
    }

    return {
      id: hit.object.userData.shapeId as string,
      kind: hit.object.userData.transformHandle as TransformHandleKind,
      handleKey: (hit.object.userData.transformHandleKey as string | undefined) ?? (hit.object.userData.transformHandle as string),
      planeY: typeof hit.object.userData.transformPlaneY === "number" ? (hit.object.userData.transformPlaneY as number) : 0,
    };
  }, []);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      // Wer auf die Arbeitsflaeche klickt, ist mit dem Schreiben fertig. Von
      // allein passiert das hier nicht: Mehrere Werkzeuge fangen den
      // Zeigerdruck ab, und damit nimmt der Browser auch den Fokuswechsel
      // zurueck - der Schreibzeiger blinkte in der Notiz weiter.
      const typing = document.activeElement;
      if (typing instanceof HTMLElement && typing.classList.contains("note-text")) {
        typing.blur();
      }
      const state = threeRef.current;
      if (!state) {
        return;
      }
      // Ein Finger ist fuer den Browser die linke Taste. Ab dem zweiten gehoert
      // die Flaeche der Kamera - und solange das so ist, wird nichts
      // ausgewaehlt, auch nicht vom nachgereichten Zeigerdruck, der hier
      // wieder ankommt.
      if (event.pointerType === "touch") {
        touchPointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (cameraTouchRef.current) return;
        const wantsCamera = touchPointersRef.current.size >= 2 || touchRotateRef.current;
        // Wer gerade an einem Anfasser zieht, meint auch das - dann bleibt
        // alles, wie es ist.
        if (wantsCamera && !transformRef.current && !splitDragRef.current) {
          cancelGestureForCamera();
          cameraTouchRef.current = true;
          handOverTouchToCamera();
          return;
        }
      }
      // The right button turns the view; only a press that is let go where it
      // started opens the menu (finishDrag). A pen's barrel button reports as
      // button 2 of a "pen" pointer and counts the same (#213).
      if (event.pointerType !== "touch" && event.button === 2) {
        rightPressRef.current = { x: event.clientX, y: event.clientY };
      }
      if (event.button !== 0 || event.ctrlKey || event.metaKey) {
        return;
      }
      if (splitActiveRef.current) {
        if (splitSurfacePickRef.current) {
          const surface = pickPlacementSurface(event.clientX, event.clientY, false);
          if (!surface) return;
          event.preventDefault();
          onSplitSurfacePickRef.current?.(
            [surface.point.x, surface.point.y, surface.point.z],
            [surface.normal.x, surface.normal.y, surface.normal.z],
          );
          return;
        }
        const plane = splitPlaneRef.current;
        if (!plane || !pickSplitPlaneHandle(state, event.clientX, event.clientY)) return;
        const axisOrigin = new THREE.Vector3(...plane.origin);
        const axisNormal = new THREE.Vector3(...plane.normal).normalize();
        const startParameter = splitAxisParameter(state, event.clientX, event.clientY, axisOrigin, axisNormal);
        if (startParameter === null) return;
        event.preventDefault();
        capturePointer(event.currentTarget, event.pointerId);
        splitDragRef.current = { pointerId: event.pointerId, axisOrigin, axisNormal, startParameter, startPosition: plane.position };
        setSplitHandleState("drag");
        state.controls.enabled = false;
        onInteractionActiveChange?.(true);
        return;
      }
      clearMoveDimensions();
      const rect = state.renderer.domElement.getBoundingClientRect();

      if (modifierActive) {
        event.preventDefault();
        const edgeId = pickModifierEdge(event.clientX, event.clientY);
        if (edgeId !== null) onModifierEdgeToggle?.(edgeId, event.shiftKey);
        return;
      }

      if (sectionMeasureModeRef.current && sectionSettingsRef.current.enabled) {
        event.preventDefault();
        const snap = pickSectionMeasurePoint(event.clientX, event.clientY);
        if (snap) placeSectionMeasurePoint(snap.point);
        return;
      }

      if (tapeDeleteModeRef.current) {
        event.preventDefault();
        return;
      }

      if (tapeMoveModeRef.current) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (tapeModeRef.current) {
        event.preventDefault();
        const candidate = resolveTapeCandidate(event.clientX, event.clientY);
        if (candidate) {
          selectTapeCandidate(candidate);
        }
        return;
      }

      if (pivotPickModeRef.current) {
        event.preventDefault();
        onPivotPick?.(pickRotationPivot(state, event.clientX, event.clientY));
        return;
      }

      if (layFlatPickModeRef.current) {
        event.preventDefault();
        onLayFlatPick?.(pickLayFlatFace(state, event.clientX, event.clientY));
        return;
      }

      if (mateFacePickRef.current) {
        event.preventDefault();
        onMateFacePick?.(pickLayFlatFace(state, event.clientX, event.clientY));
        return;
      }

      if (noteModeRef.current) {
        event.preventDefault();
        const anchor = resolveNoteAnchor(event.clientX, event.clientY);
        if (anchor) onNoteAdd?.(anchor);
        onNoteModeChange?.(false);
        return;
      }

      if (cornerRulerModeRef.current) {
        event.preventDefault();
        // Auf der Flaeche, auf der gerade die Arbeitsebene liegt - ist sie ausgeblendet, auf der Platte.
        const workplane = drawnWorkplane();
        const point = resolveCornerRulerPoint(event.clientX, event.clientY, workplane);
        if (point) placeCornerRuler(point, workplane);
        cornerRulerModeRef.current = false;
        setCornerRulerMode(false);
        return;
      }

      if (workplaneModeRef.current) {
        event.preventDefault();
        syncWorkplaneHoverPreview(state, null, workspaceRef.current, resolvedThemeRef.current);
        const surface = pickPlacementSurface(event.clientX, event.clientY, event.shiftKey);
        if (surface) {
          onSetPlacementWorkplane(surface.workplane, "shape");
        } else {
          // On the plate, the workplane lies where it was clicked (on the snap grid): a sketch
          // finished on it, a revolved one too, lands there instead of in the middle (#178).
          // A click near the middle, or beside the plate, puts it back on the plate's own origin.
          const raw = toRawPlanePoint(event.clientX, event.clientY, new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
          const plate = workspaceRef.current;
          const onPlate = raw && Math.abs(raw.x) <= plate.width / 2 && Math.abs(raw.z) <= plate.depth / 2;
          const point = onPlate ? toPlanePoint(event.clientX, event.clientY) : null;
          onSetPlacementWorkplane(
            point ? { ...horizontalPlacementWorkplane(), origin: { x: point.x, y: 0, z: point.z } } : horizontalPlacementWorkplane(),
            "base",
          );
        }
        onWorkplaneModeChange(false);
        return;
      }

      if (carryIdsRef.current?.length) {
        event.preventDefault();
        const target = cruiseTarget(event.clientX, event.clientY, new Set(carryIdsRef.current));
        if (target) onCarryDropRef.current?.(target);
        return;
      }

      if (cruiseAssetRef.current) {
        event.preventDefault();
        const target = cruiseTarget(event.clientX, event.clientY);
        if (target) onAddShape(cruiseAssetRef.current, target.point, target.workplane);
        return;
      }

      const handle = pickTransformHandle(event.clientX, event.clientY);
      if (handle) {
        const shape = shapesRef.current.find((entry) => entry.id === handle.id);
        const activeWorkplane = placementWorkplaneRef.current;
        const frame = selectionFrameForShapes(shapesRef.current, selectedIdsRef.current, activeWorkplane);
        const scalePlane = handle.kind === "scale" && frame
          ? localResizePlaneForFrame(frame, workplaneFootprintY(frame, activeWorkplane))
          : undefined;
        const scaleStartPoint = scalePlane ? toRawPlanePoint(event.clientX, event.clientY, scalePlane) ?? undefined : undefined;
        const point = scalePlane ? scaleStartPoint : toPlanePoint(event.clientX, event.clientY);
        if (!shape || !frame || shape.locked || (!point && handle.kind !== "height" && handle.kind !== "lift" && handle.kind !== "rotate")) {
          return;
        }
        const handlesLowerSide = handle.handleKey === "bottom-height" || handle.handleKey === "lower-shape";
        const lift = liftGeometryForFrame(frame, activeWorkplane);
        const liftOffset = handle.kind === "lift" ? Math.max(2, lift.height * LIFT_HANDLE_HEIGHT_OFFSET_FRACTION) * (handlesLowerSide ? -1 : 1) : 0;
        const overlay = transformOverlayRef.current;
        const rotationAxis = rotationAxisForHandle(handle.handleKey);
        const resizeHandleKey = handle.handleKey;
        const scaleSigns = handle.kind === "scale" ? resizeSignsForHandle(resizeHandleKey) : undefined;
        const scaleAnchorPoint = handle.kind === "scale" && scaleSigns ? resizeAnchorPointForFrame(frame, scaleSigns) : undefined;
        const wheel = handle.kind === "rotate" ? (overlay?.rotationWheels[rotationAxis] ?? overlay?.rotationWheel ?? undefined) : undefined;
        const rotationPlane = handle.kind === "rotate" ? overlay?.rotationPlanes[rotationAxis] : undefined;
        const rotationPlaneCenterData = handle.kind === "rotate" ? overlay?.rotationPlaneCenters[rotationAxis] : undefined;
        const rotationPlaneCenter = rotationPlaneCenterData
          ? new THREE.Vector3(rotationPlaneCenterData.x, rotationPlaneCenterData.y, rotationPlaneCenterData.z)
          : frame.center.clone();
        const localClientX = event.clientX - rect.left;
        const localClientY = event.clientY - rect.top;
        const axisVector = rotationAxisVectorForFrame(handle.handleKey, frame);
        const pivot = pivotVector(rotationPivotRef.current) ?? frame.center.clone();
        const rotationCenter = handle.kind === "rotate" ? wheel ?? projectToScreen(pivot, state) : undefined;
        const rotationStartPoint = handle.kind === "rotate" ? rayPointOnRotationPlane(state, event.clientX, event.clientY, rotationPlaneCenter, axisVector) : null;
        const rotationStartVector = rotationStartPoint ? rotationStartPoint.sub(rotationPlaneCenter) : undefined;
        const liftAxis = handle.kind === "lift" ? lift.axis : handle.kind === "height" ? frame.yAxis.clone().normalize() : undefined;
        const liftHandlePoint = liftAxis
          ? (handle.kind === "lift"
              ? lift.pointAt(handlesLowerSide ? lift.low : lift.high).addScaledVector(liftAxis, liftOffset)
              : framePoint(frame, 0, handlesLowerSide ? frame.min.y : frame.max.y, 0).addScaledVector(liftAxis, liftOffset))
          : undefined;
        const liftPlane = liftAxis && liftHandlePoint
          ? axisDragPlaneForCamera(state, liftAxis, liftHandlePoint)
          : undefined;
        const liftStartPoint = liftPlane ? toRawPlanePoint(event.clientX, event.clientY, liftPlane) ?? undefined : undefined;
        const liftStartValue = handle.kind === "lift"
          ? lift.elevation
          : undefined;
        if ((handle.kind === "lift" || handle.kind === "height") && !liftStartPoint) {
          return;
        }
        rememberResizeAnchor(handle.id, handle.kind, resizeHandleKey);
        event.preventDefault();
        capturePointer(event.currentTarget, event.pointerId);
        setEditingRotation(null);
        setEditingCorner(null);
        setPinnedMeasureKey(measureKeyForHandle(handle.kind, handle.handleKey, transformOverlayRef.current));
        if (handle.kind === "height") {
          setHoverMeasureKey(null);
        }
        setActiveRotationWheel(handle.kind === "rotate");
        setActiveTransformKind(handle.kind);
        setSelectionHelpersVisible(state, handle.kind !== "rotate");
        if (handle.kind === "rotate") {
          setRotationWheelAxis(rotationAxis);
          setPinnedRotationWheelView(wheel && rotationPlane ? { axis: rotationAxis, wheel: { ...wheel }, plane: { ...rotationPlane } } : null);
        } else {
          setPinnedRotationWheelView(null);
        }
        transformRef.current = {
          id: handle.id,
          ids: frame.ids,
          kind: handle.kind,
          handleKey: resizeHandleKey,
          rotationAxis,
          pointerId: event.pointerId,
          startShape: { ...shape },
          items: frame.ids
            .map((id) => shapesRef.current.find((entry) => entry.id === id))
            .filter((entry): entry is WorkplaneShape => Boolean(entry))
            .map((entry) => ({
              id: entry.id,
              startShape: { ...entry },
              startCenter: shapeCenter(entry),
              startQuaternion: quaternionForShape(entry),
            })),
          selectionFrame: frame,
          startScreenAngle: rotationCenter ? screenAngle(localClientX, localClientY, rotationCenter) : 0,
          startClientX: event.clientX,
          startClientY: event.clientY,
          scalePlaneY: handle.kind === "scale" ? handle.planeY : 0,
          scalePlane,
          scaleSigns,
          scaleAnchorPoint,
          scaleStartPoint,
          liftAxis,
          liftPlane,
          liftStartPoint,
          liftHandlePoint,
          liftStartValue,
          rotationAxisVector: handle.kind === "rotate" ? axisVector : undefined,
          rotationPivot: handle.kind === "rotate" ? pivot : undefined,
          customPivot: handle.kind === "rotate" && Boolean(rotationPivotRef.current),
        rotationPlaneCenter: handle.kind === "rotate" ? rotationPlaneCenter : undefined,
        rotationPlaneView: handle.kind === "rotate" ? rotationPlane : undefined,
        rotationStartPointerAngle: handle.kind === "rotate"
          ? rotationPlanePointerAngle(rotationPlane, localClientX, localClientY, rotationCenter ?? { x: localClientX, y: localClientY })
          : undefined,
        rotationStartVector: handle.kind === "rotate" ? rotationStartVector : undefined,
          rotationScreenCenter: rotationCenter,
          rotationScreenSign: handle.kind === "rotate" ? rotationScreenSign(axisVector, state.camera) : 1,
          rotationStartQuaternion: handle.kind === "rotate" ? quaternionForShape(shape) : undefined,
          wheelCenter: wheel,
        };
        if (handle.kind === "rotate") {
          setRotationReadout({
            x: event.clientX - rect.left + 18,
            y: event.clientY - rect.top - 18,
            text: `${Math.round(rotationValueForAxis(shape, rotationAxis))}°`,
            angle: 0,
            pointerAngle: rotationPlanePointerAngle(rotationPlane, localClientX, localClientY, rotationCenter ?? { x: localClientX, y: localClientY }),
          });
        } else if (handle.kind === "lift") {
          setRotationReadout({
            x: event.clientX - rect.left + 22,
            y: event.clientY - rect.top - 34,
            text: formatMeasure(liftStartValue ?? 0, workspaceRef.current.accuracy),
          });
        } else {
          setRotationReadout(null);
        }
        state.needsRender = true;
        state.controls.enabled = false;
        onInteractionActiveChange?.(true);
        return;
      }

      const id = pickShape(event.clientX, event.clientY, event.pointerType);
      const additive = event.shiftKey;
      if (!id) {
        const startX = event.clientX - rect.left;
        const startY = event.clientY - rect.top;
        event.preventDefault();
        capturePointer(event.currentTarget, event.pointerId);
        marqueeRef.current = {
          pointerId: event.pointerId,
          startX,
          startY,
          currentX: startX,
          currentY: startY,
          additive,
          hasMoved: false,
        };
        setMarqueeFromState(marqueeRef.current);
        state.controls.enabled = false;
        onInteractionActiveChange?.(true);
        return;
      }

      const shape = shapesRef.current.find((entry) => entry.id === id);
      const selectedIdsSnapshot = selectedIdsRef.current;
      if (alignModeRef.current && selectedIdsSnapshot.includes(id)) {
        event.preventDefault();
        onAlignAnchorChange(id);
        return;
      }
      const dragPlaneY = shape ? shape.elevation ?? 0 : 0;
      const activeWorkplane = placementWorkplaneRef.current;
      const point = toPlacementWorkplanePoint(event.clientX, event.clientY, activeWorkplane);
      if (!point || !shape) {
        return;
      }

      event.preventDefault();
      const alreadySelected = selectedIdsSnapshot.includes(id);
      // Shift on a shape is "add to or take from the selection". On a shape that
      // is selected already it may also be the start of an axis-locked drag, so
      // there the toggle waits until the pointer comes up without having moved.
      const toggleOnClick = additive && alreadySelected && !shape.locked;
      if (additive && !toggleOnClick) {
        onSelectShape(id, "toggle");
        return;
      }
      if (!alreadySelected) {
        onSelectShape(id);
      }
      if (!canBeginShapeDrag(workspaceRef.current.selectBeforeMove, alreadySelected)) {
        return;
      }
      if (shape.locked) {
        return;
      }
      capturePointer(event.currentTarget, event.pointerId);
      const dragIds = alreadySelected && selectedIdsSnapshot.length > 1 ? selectedIdsSnapshot : [id];
      const items = dragIds
        .map<DragItem | null>((dragId) => {
          const dragShape = shapesRef.current.find((entry) => entry.id === dragId);
          if (!dragShape || dragShape.locked) {
            return null;
          }
          const helper = findSelectionHelper(state, dragId);
          const visual = findShapeObject(state, dragId);
          return {
            id: dragId,
            startX: dragShape.x,
            startZ: dragShape.z,
            startElevation: dragShape.elevation ?? 0,
            nextX: dragShape.x,
            nextZ: dragShape.z,
            nextElevation: dragShape.elevation ?? 0,
            startVisualY: visual?.position.y ?? (dragShape.elevation ?? 0) + dragShape.height / 2,
            visual,
            helper,
            helperBox: helper ? helper.box.clone() : null,
            hadPreviewSimplified: false,
          };
        })
        .filter((item): item is DragItem => Boolean(item));
      if (items.length === 0) {
        return;
      }
      setEditingCorner(null);
      dragRef.current = {
        primaryId: id,
        offsetX: shape.x - point.x,
        offsetZ: shape.z - point.z,
        planeY: dragPlaneY,
        workplane: activeWorkplane,
        startPoint: point,
        pointerId: event.pointerId,
        primaryStartX: shape.x,
        primaryStartZ: shape.z,
        items,
        toggleOnClick,
        startClient: { x: event.clientX, y: event.clientY },
        duplicate: event.altKey && onDuplicateShapesMoved
          ? {
              standIns: items.flatMap((item) => {
                if (!item.visual?.parent) return [];
                // Shares geometry and materials with the shape; nothing here is the stand-in's to dispose.
                const standIn = item.visual.clone();
                standIn.traverse((child) => {
                  child.userData = {};
                });
                standIn.name = "DuplicateDragStandIn";
                item.visual.parent.add(standIn);
                return [standIn];
              }),
            }
          : undefined,
      };
      const usesWorldHorizontalAxes = Math.abs(activeWorkplane.normal.y - 1) < 1e-6
        && Math.abs(activeWorkplane.xAxis.x - 1) < 1e-6
        && Math.abs(activeWorkplane.zAxis.z - 1) < 1e-6;
      if (workspaceRef.current.objectSnap && usesWorldHorizontalAxes && dragRef.current) {
        const dragged = new Set(items.map((item) => item.id));
        const shapeById = new Map(shapesRef.current.map((entry) => [entry.id, entry]));
        dragRef.current.snapMoving = unionSnapBox(items.flatMap((item) => {
          const entry = shapeById.get(item.id);
          return entry ? [worldSnapBox(entry)] : [];
        }));
        dragRef.current.snapTargets = [
          ...shapesRef.current
            .filter((entry) => !dragged.has(entry.id) && !entry.hidden)
            .map(worldSnapBox),
          // A reference point is a box with no size: its edges and centre are one line.
          ...(notesVisibleRef.current
            ? referencePoints(notesRef.current).map((point) => ({ minX: point.x, maxX: point.x, minZ: point.z, maxZ: point.z }))
            : []),
        ];
      }
      if (moveDimensionsEnabledRef.current && usesWorldHorizontalAxes) {
        const dragFrame = selectionFrameForShapes(shapesRef.current, items.map((item) => item.id));
        const moveDimensionAnchor = dragFrame
          ? moveDimensionAnchorForCamera(state, dragFrame)
          : new THREE.Vector3(shape.x, WORKPLANE_LINE_ELEVATION + 0.04, shape.z);
        moveDimensionSessionRef.current = {
          active: true,
          originX: moveDimensionAnchor.x,
          originZ: moveDimensionAnchor.z,
          planeY: moveDimensionAnchor.y,
          deltaX: 0,
          deltaZ: 0,
          items: items.map(({ id: itemId, startX, startZ }) => ({ id: itemId, startX, startZ })),
        };
      }
      state.needsRender = true;
      state.controls.enabled = false;
      onInteractionActiveChange?.(true);
    },
    [
      clearMoveDimensions,
      modifierActive,
      onAlignAnchorChange,
      onDuplicateShapesMoved,
      onInteractionActiveChange,
      onModifierEdgeToggle,
      onPivotPick,
      onLayFlatPick,
      onMateFacePick,
      placeCornerRuler,
      resolveCornerRulerPoint,
      onSelectShape,
      onSetPlacementWorkplane,
      onWorkplaneModeChange,
      pickPlacementSurface,
      pickModifierEdge,
      pickShape,
      pickTransformHandle,
      resolveTapeCandidate,
      selectTapeCandidate,
      setMarqueeFromState,
      toPlanePoint,
      toPlanePointAtY,
      toPlacementWorkplanePoint,
      toFreePlacementWorkplanePoint,
      toRawPlanePoint,
      onAddShape,
    ],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      // Gehoert die Flaeche gerade der Kamera, hat hier niemand etwas zu
      // schweben oder zu ziehen - die Finger bewegen die Ansicht.
      if (cameraTouchRef.current) return;
      if (cruiseAssetRef.current) moveCruiseGhost(event.clientX, event.clientY);
      if (carryIdsRef.current) moveCarry(event.clientX, event.clientY);
      if (splitActiveRef.current) {
        const state = threeRef.current;
        if (!state) return;
        if (splitSurfacePickRef.current) {
          const surface = pickPlacementSurface(event.clientX, event.clientY, false);
          syncWorkplaneHoverPreview(state, surface?.workplane ?? null, workspaceRef.current, resolvedThemeRef.current);
          setSplitPickOverFace(Boolean(surface));
          return;
        }
        const drag = splitDragRef.current;
        if (drag) {
          if (drag.pointerId !== event.pointerId) return;
          const parameter = splitAxisParameter(state, event.clientX, event.clientY, drag.axisOrigin, drag.axisNormal);
          if (parameter === null) return;
          // The panel's slider steps in tenths of a millimetre; the drag keeps to them.
          const position = Math.round((drag.startPosition + parameter - drag.startParameter) * 10) / 10;
          onSplitPositionChangeRef.current?.(position);
        } else if (event.buttons === 0) {
          const hovering = pickSplitPlaneHandle(state, event.clientX, event.clientY);
          setSplitHandleState(hovering ? "hover" : null);
        }
        return;
      }
      if (workplaneModeRef.current) {
        const surface = pickPlacementSurface(event.clientX, event.clientY, event.shiftKey);
        let preview = surface?.workplane ?? null;
        if (!preview) {
          const basePoint = toRawPlanePoint(
            event.clientX,
            event.clientY,
            new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
          );
          if (basePoint) {
            preview = snapPlacementWorkplaneOrigin(
              placementWorkplaneFromSurface(
                { x: basePoint.x, y: 0, z: basePoint.z },
                { x: 0, y: 1, z: 0 },
                { x: 1, y: 0, z: 0 },
                event.shiftKey,
              ),
              snapStep(snapRef.current),
            );
          }
        }
        syncWorkplaneHoverPreview(
          threeRef.current,
          preview,
          workspaceRef.current,
          resolvedThemeRef.current,
        );
        return;
      }
      if (layFlatPickModeRef.current) {
        syncLayFlatHover(threeRef.current, selectedIdsRef.current, resolvedThemeRef.current, event.clientX, event.clientY);
        return;
      }
      if (mateFacePickRef.current) {
        syncLayFlatHover(threeRef.current, mateFacePickRef.current.shapeIds, resolvedThemeRef.current, event.clientX, event.clientY);
        return;
      }
      if (modifierActiveRef.current) {
        updateModifierEdgeHover(event.clientX, event.clientY);
        return;
      }
      if (sectionMeasureModeRef.current && sectionSettingsRef.current.enabled) {
        sectionMeasureRef.current = { ...sectionMeasureRef.current, hover: pickSectionMeasurePoint(event.clientX, event.clientY) };
        if (threeRef.current) threeRef.current.needsRender = true;
        return;
      }
      if (tapeModeRef.current) {
        updateTapeHover(event.clientX, event.clientY);
        return;
      }
      if (tapeMoveModeRef.current) return;
      const transform = transformRef.current;
      if (transform) {
        updateTransform(event.clientX, event.clientY, event.shiftKey, event.altKey);
        if (threeRef.current) {
          threeRef.current.needsRender = true;
        }
        return;
      }

      const marquee = marqueeRef.current;
      if (marquee) {
        const state = threeRef.current;
        if (!state) {
          return;
        }
        const rect = state.renderer.domElement.getBoundingClientRect();
        marquee.currentX = event.clientX - rect.left;
        marquee.currentY = event.clientY - rect.top;
        marquee.hasMoved = marquee.hasMoved || Math.hypot(marquee.currentX - marquee.startX, marquee.currentY - marquee.startY) > 5;
        setMarqueeFromState(marquee);
        return;
      }

      const drag = dragRef.current;
      if (!drag) {
        return;
      }
      // A shaky click or double click must not nudge the part: it moves once the pointer has
      // gone a few pixels, and then follows it from where the drag began (#150).
      if (!drag.started) {
        if (Math.hypot(event.clientX - drag.startClient.x, event.clientY - drag.startClient.y) < DRAG_START_PIXELS) return;
        drag.started = true;
      }

      const point = toPlacementWorkplanePoint(event.clientX, event.clientY, drag.workplane);
      if (!point) {
        return;
      }

      let deltaX = point.x - drag.startPoint.x;
      let deltaY = point.y - drag.startPoint.y;
      let deltaZ = point.z - drag.startPoint.z;
      // Shift keeps the move on one axis of the workplane: the one the pointer
      // has travelled further along since the drag began. It is decided anew
      // with every move, so crossing the diagonal switches axis.
      const axisLock = event.shiftKey ? dragAxisLock(drag.workplane, deltaX, deltaY, deltaZ) : null;
      if (axisLock) {
        deltaX = axisLock.delta.x;
        deltaY = axisLock.delta.y;
        deltaZ = axisLock.delta.z;
      }
      const state = threeRef.current;
      if (drag.snapMoving && drag.snapTargets?.length && state) {
        let guides: ObjectSnapGuide[] = [];
        const raw = event.altKey ? null : toRawPlanePoint(event.clientX, event.clientY, new THREE.Plane(new THREE.Vector3(0, 1, 0), -drag.workplane.origin.y));
        if (raw) {
          // Measured from the unsnapped pointer: the grid must not keep an edge
          // a step away from the neighbour it is being pulled to.
          // Snapping only runs on the flat workplane, where the lock is to X or Z;
          // the locked-out direction stays at zero and is not pulled anywhere.
          const rawDeltaX = axisLock?.along === "z" ? 0 : raw.x - drag.startPoint.x;
          const rawDeltaZ = axisLock?.along === "x" ? 0 : raw.z - drag.startPoint.z;
          const snap = objectSnapOffset(shiftSnapBox(drag.snapMoving, rawDeltaX, rawDeltaZ), drag.snapTargets, objectSnapThreshold(state, raw));
          if (snap.dx !== null && axisLock?.along !== "z") deltaX = rawDeltaX + snap.dx;
          if (snap.dz !== null && axisLock?.along !== "x") deltaZ = rawDeltaZ + snap.dz;
          if (snap.dx !== null || snap.dz !== null) {
            guides = objectSnapOffset(shiftSnapBox(drag.snapMoving, deltaX, deltaZ), drag.snapTargets, 1e-4).guides;
          }
        }
        syncObjectSnapGuides(state, guides, drag.workplane.origin.y + 0.06);
      }
      const moveDimensionSession = moveDimensionSessionRef.current;
      if (moveDimensionSession) {
        moveDimensionSession.deltaX = deltaX;
        moveDimensionSession.deltaZ = deltaZ;
        moveDimensionSession.active = true;
      }

      drag.items.forEach((item) => {
        item.nextX = item.startX + deltaX;
        item.nextZ = item.startZ + deltaZ;
        item.nextElevation = item.startElevation + deltaY;
        if (threeRef.current) applyDragItemPreview(threeRef.current, item);
      });
      if (threeRef.current) {
        const previewShapes = previewShapesForDrag(shapesRef.current, drag);
        updateSelectedGroundFootprintPreviews(threeRef.current, drag);
        syncTransformOverlay(
          threeRef.current,
          previewShapes,
          renderSelectionIds(),
          transformOverlayRef,
          setTransformOverlay,
          workspaceRef.current.accuracy,
          true,
          true,
          placementWorkplaneRef.current,
          resolvedThemeRef.current,
          workspaceRef.current.dimensionsAlwaysVisible,
        );
        syncMoveDimensionOverlay(
          threeRef.current,
          moveDimensionSession,
          moveDimensionOverlayRef,
          setMoveDimensionOverlay,
          workspaceRef.current.accuracy,
          resolvedThemeRef.current,
        );
        threeRef.current.lastOverlaySync = performance.now();
        threeRef.current.needsRender = true;
      }
    },
    [pickPlacementSurface, setMarqueeFromState, toPlacementWorkplanePoint, toRawPlanePoint, moveCruiseGhost, updateModifierEdgeHover, updateTapeHover, updateTransform],
  );

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia("(pointer: coarse)");
    const apply = () => setTouchDevice(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    touchRotateRef.current = touchRotate;
  }, [touchRotate]);

  /**
   * Die liegenden Finger an die Kamera uebergeben.
   *
   * `OrbitControls` hoert auf der Leinwand und hat den ersten Finger schon
   * gesehen; ein nachgereichter Zeigerdruck bringt ihm die uebrigen bei, und
   * ab zwei Fingern faehrt es von sich aus Zoomen und Schieben.
   */
  const handOverTouchToCamera = useCallback(() => {
    const state = threeRef.current;
    const canvas = state?.renderer.domElement;
    const PointerEventConstructor = canvas?.ownerDocument.defaultView?.PointerEvent;
    if (!state || !canvas || !PointerEventConstructor) return;
    state.controls.enabled = true;
    touchPointersRef.current.forEach((position, pointerId) => {
      const handover = new PointerEventConstructor("pointerdown", {
        bubbles: true,
        cancelable: true,
        composed: true,
        pointerId,
        pointerType: "touch",
        isPrimary: false,
        button: 0,
        buttons: 1,
        clientX: position.x,
        clientY: position.y,
      });
      // Der Beruehrungszweig von OrbitControls rechnet **nur** mit
      // pageX/pageY - der Mauszweig mit clientX/clientY. Mitgeben lassen die
      // sich nicht, sie werden vom Browser abgeleitet: Chrome rechnet sie aus
      // clientX aus, WebKit nicht. Auf einem iPad stuende dort 0, beide Finger
      // laegen fuer die Kamera im Nullpunkt, und das Spreizen ergaebe nichts.
      // Deshalb hier von Hand darueber gelegt.
      Object.defineProperty(handover, "pageX", { value: position.x + window.scrollX, configurable: true });
      Object.defineProperty(handover, "pageY", { value: position.y + window.scrollY, configurable: true });
      canvas.dispatchEvent(handover);
    });
  }, []);

  /**
   * Was ein Finger angefangen hat, zuruecknehmen, bevor die Kamera uebernimmt.
   *
   * Ein angefangener Zug wird dabei auf seinen Ausgangspunkt zurueckgesetzt:
   * Wer zwei Finger aufsetzt, will die Ansicht bewegen und nicht ein Teil,
   * das der erste Finger zufaellig getroffen hat.
   */
  const cancelGestureForCamera = useCallback(() => {
    const state = threeRef.current;
    if (marqueeRef.current) {
      marqueeRef.current = null;
      setMarqueeFromState(null);
    }
    const drag = dragRef.current;
    if (drag) {
      drag.duplicate?.standIns.forEach((standIn) => standIn.removeFromParent());
      drag.items.forEach((item) => {
        item.nextX = item.startX;
        item.nextZ = item.startZ;
        item.nextElevation = item.startElevation;
        if (item.visual && item.hadPreviewSimplified) setComplexEdgeVisibility(item.visual, true);
        if (state) applyDragItemPreview(state, item);
      });
      dragRef.current = null;
      clearMoveDimensions();
      if (state) {
        syncObjectSnapGuides(state, [], 0);
      }
    }
    if (state) state.needsRender = true;
    onInteractionActiveChange?.(false);
  }, [clearMoveDimensions, onInteractionActiveChange, setMarqueeFromState]);

  const handlePointerLeave = useCallback(() => {
    if (workplaneModeRef.current) {
      syncWorkplaneHoverPreview(threeRef.current, null, workspaceRef.current, resolvedThemeRef.current);
    }
    if (modifierActiveRef.current) clearModifierEdgeHover();
    if (splitSurfacePickRef.current) {
      syncWorkplaneHoverPreview(threeRef.current, null, workspaceRef.current, resolvedThemeRef.current);
      setSplitPickOverFace(false);
    }
  }, [clearModifierEdgeHover]);

  const finishDrag = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const rightPress = rightPressRef.current;
      if (event.button === 2 && rightPress) {
        rightPressRef.current = null;
        if (onShapeContextMenu && Math.hypot(event.clientX - rightPress.x, event.clientY - rightPress.y) < 5) {
          const shapeId = pickShape(event.clientX, event.clientY, event.pointerType);
          if (shapeId && !selectedIdsRef.current.includes(shapeId)) onSelectShape(shapeId);
          onShapeContextMenu({ shapeId, clientX: event.clientX, clientY: event.clientY });
        }
        return;
      }
      if (event.pointerType === "touch") {
        touchPointersRef.current.delete(event.pointerId);
        if (touchPointersRef.current.size === 0) cameraTouchRef.current = false;
      }
      const state = threeRef.current;
      const splitDrag = splitDragRef.current;
      if (splitDrag) {
        if (splitDrag.pointerId !== event.pointerId) return;
        if (event.currentTarget.hasPointerCapture(splitDrag.pointerId)) {
          event.currentTarget.releasePointerCapture(splitDrag.pointerId);
        }
        splitDragRef.current = null;
        setSplitHandleState(state && pickSplitPlaneHandle(state, event.clientX, event.clientY) ? "hover" : null);
        if (state) state.controls.enabled = true;
        onInteractionActiveChange?.(false);
        return;
      }
      const transform = transformRef.current;
      if (transform) {
        if (event.currentTarget.hasPointerCapture(transform.pointerId)) {
          event.currentTarget.releasePointerCapture(transform.pointerId);
        }
        if (transform.kind === "lift") {
          setPinnedMeasureKey(getElevationMeasureKey(transformOverlayRef.current));
        } else if (transform.kind === "height") {
          setPinnedMeasureKey(null);
          setHoverMeasureKey(null);
        }
        if (transform.kind === "lift" && transform.hasMoved) {
          suppressLiftEditAfterDrag();
        }
        if (transform.kind === "scale" && transform.hasMoved) {
          suppressCornerEditAfterDrag();
        }
        transformRef.current = null;
        setActiveRotationWheel(false);
        setActiveTransformKind(null);
        setRotationReadout(null);
        if (state) {
          setSelectionHelpersVisible(state, true);
          state.controls.enabled = true;
          state.needsRender = true;
        }
        onInteractionActiveChange?.(false);
        return;
      }

      const marquee = marqueeRef.current;
      if (marquee) {
        if (event.currentTarget.hasPointerCapture(marquee.pointerId)) {
          event.currentTarget.releasePointerCapture(marquee.pointerId);
        }
        marqueeRef.current = null;
        setMarqueeFromState(null);
        if (marquee.hasMoved) {
          const rect = {
            left: Math.min(marquee.startX, marquee.currentX),
            right: Math.max(marquee.startX, marquee.currentX),
            top: Math.min(marquee.startY, marquee.currentY),
            bottom: Math.max(marquee.startY, marquee.currentY),
          };
          const selected = shapesInMarquee(rect);
          if (marquee.additive) {
            // Shift turns each body in the box around, as a Shift click does
            // for one: what was selected leaves the selection, the rest joins.
            const boxed = new Set(selected);
            const current = selectedIdsRef.current;
            onSelectShape([
              ...current.filter((id) => !boxed.has(id)),
              ...selected.filter((id) => !current.includes(id)),
            ]);
          } else {
            onSelectShape(selected);
          }
        } else if (!marquee.additive) {
          onSelectShape(null);
        }
        if (state) {
          state.controls.enabled = true;
        }
        onInteractionActiveChange?.(false);
        return;
      }

      const drag = dragRef.current;
      if (!drag) {
        return;
      }

      if (event.currentTarget.hasPointerCapture(drag.pointerId)) {
        event.currentTarget.releasePointerCapture(drag.pointerId);
      }

      if (state) syncObjectSnapGuides(state, [], 0);
      let movedShape = false;
      if (drag.duplicate) {
        drag.duplicate.standIns.forEach((standIn) => standIn.removeFromParent());
        const first = drag.items[0];
        const delta = {
          dx: first.nextX - first.startX,
          dz: first.nextZ - first.startZ,
          delevation: first.nextElevation - first.startElevation,
        };
        // The shapes stood in for their copies; put them back where they belong.
        drag.items.forEach((item) => {
          if (item.visual && item.hadPreviewSimplified) {
            setComplexEdgeVisibility(item.visual, true);
          }
          item.nextX = item.startX;
          item.nextZ = item.startZ;
          item.nextElevation = item.startElevation;
          if (state) applyDragItemPreview(state, item);
        });
        if (delta.dx !== 0 || delta.dz !== 0 || delta.delevation !== 0) {
          movedShape = true;
          onDuplicateShapesMoved?.(drag.items.map((item) => item.id), delta);
        }
      }
      else drag.items.forEach((item) => {
        if (item.visual && item.hadPreviewSimplified) {
          setComplexEdgeVisibility(item.visual, true);
        }
        const shape = shapesRef.current.find((entry) => entry.id === item.id);
        if (shape && (shape.x !== item.nextX || shape.z !== item.nextZ || (shape.elevation ?? 0) !== item.nextElevation)) {
          movedShape = true;
          onUpdateShape(item.id, { x: item.nextX, z: item.nextZ, elevation: item.nextElevation });
        }
      });

      if (!movedShape && drag.toggleOnClick) onSelectShape(drag.primaryId, "toggle");

      const moveDimensionSession = moveDimensionSessionRef.current;
      // The distance moved is shown at the shape that moved; after a copy there is none.
      if (movedShape && moveDimensionSession && !drag.duplicate) {
        moveDimensionSession.active = false;
      } else {
        clearMoveDimensions();
      }
      dragRef.current = null;
      if (state) {
        syncMoveDimensionOverlay(
          state,
          moveDimensionSessionRef.current,
          moveDimensionOverlayRef,
          setMoveDimensionOverlay,
          workspaceRef.current.accuracy,
          resolvedThemeRef.current,
        );
        state.controls.enabled = true;
        state.needsRender = true;
      }
      onInteractionActiveChange?.(false);
    },
    [clearMoveDimensions, onDuplicateShapesMoved, onInteractionActiveChange, onSelectShape, onUpdateShape, rememberResizeAnchor, setMarqueeFromState, shapesInMarquee, suppressCornerEditAfterDrag, suppressLiftEditAfterDrag, onShapeContextMenu, pickShape],
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (splitActiveRef.current || tapeMoveModeRef.current) return;
      const myShapeId = event.dataTransfer.getData("application/x-layerling-my-shape");
      if (myShapeId) {
        const point = toPlacementWorkplanePoint(event.clientX, event.clientY);
        onDropMyShape?.(myShapeId, point ?? placementWorkplaneRef.current.origin);
        return;
      }
      const raw = event.dataTransfer.getData("application/x-layerling-shape");
      if (!raw) {
        return;
      }

      const asset = parseDroppedShapeAsset(raw);
      if (!asset) {
        return;
      }
      const point = toPlacementWorkplanePoint(event.clientX, event.clientY);
      onAddShape(asset, point ?? placementWorkplaneRef.current.origin);
    },
    [onAddShape, onDropMyShape, toPlacementWorkplanePoint],
  );

  const focusSelection = useCallback(() => {
    const state = threeRef.current;
    if (!state) return;
    // The real selection, not renderSelectionIds: the workplane and edge tools hide
    // the outline while they are open, but the objects are still what to look at.
    const bounds = new THREE.Box3();
    selectedIdsRef.current.forEach((id) => {
      const record = state.shapeRecords.get(id);
      if (record) bounds.expandByObject(record.object);
    });
    if (bounds.isEmpty()) return;

    const center = bounds.getCenter(new THREE.Vector3());
    const radius = Math.max(bounds.getSize(new THREE.Vector3()).length() / 2, 0.5);
    const canvas = state.renderer.domElement;
    const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
    const offset = state.camera.position.clone().sub(state.controls.target);
    const direction = offset.lengthSq() > 0
      ? offset.clone().normalize()
      : CAMERA_HOME.clone().sub(CAMERA_TARGET).normalize();

    if (state.camera instanceof THREE.OrthographicCamera) {
      const halfHeight = Math.max(0.001, (state.camera.top - state.camera.bottom) / 2);
      const zoom = orthographicFramingZoom(radius, halfHeight, aspect);
      const range = orthographicZoomRange(state.camera);
      if (zoom) state.camera.zoom = clamp(zoom, range.min, range.max);
      state.camera.position.copy(center).add(direction.multiplyScalar(clamp(offset.length(), CAMERA_MIN_DISTANCE, CAMERA_MAX_DISTANCE)));
    } else {
      const distance = clamp(perspectiveFramingDistance(radius, CAMERA_FOV, aspect), CAMERA_MIN_DISTANCE, CAMERA_MAX_DISTANCE);
      state.camera.position.copy(center).add(direction.multiplyScalar(distance));
    }

    // constrainCamera keeps the orbit target inside the workspace on every frame,
    // so an object parked beyond the plate edge is framed as closely as the
    // existing camera limits allow rather than pulling the view off the grid.
    state.controls.target.copy(center);
    state.camera.lookAt(center);
    state.camera.updateProjectionMatrix();
    state.controls.update();
    syncViewCube(state, viewCubeRef.current);
    state.needsRender = true;
  }, []);

  const resetView = useCallback(() => {
    const state = threeRef.current;
    if (state) {
      resetCamera(state);
      state.needsRender = true;
    }
  }, []);

  const setViewCubeFace = useCallback((face: ViewCubeFace) => {
    const state = threeRef.current;
    if (!state) {
      return;
    }
    setCameraToViewFace(state, face);
    syncViewCube(state, viewCubeRef.current);
  }, []);

  // The bands along a face's sides and its corners look from that edge or corner (#202).
  const viewCubeZones = (face: ViewCubeFace) => VIEW_CUBE_ZONES.map(([column, row]) => (
    <span
      key={`${column}:${row}`}
      className={`cube-zone ${column !== 0 && row !== 0 ? "cube-zone-corner" : "cube-zone-edge"}`}
      style={{
        left: `${VIEW_CUBE_ZONE_START[column + 1]}%`,
        top: `${VIEW_CUBE_ZONE_START[row + 1]}%`,
        width: `${VIEW_CUBE_ZONE_SIZE[column + 1]}%`,
        height: `${VIEW_CUBE_ZONE_SIZE[row + 1]}%`,
      }}
      aria-hidden="true"
      onClick={(event) => {
        event.stopPropagation();
        const state = threeRef.current;
        if (!state) return;
        setCameraToViewDirection(state, viewCubeZoneDirection(face, column, row));
        syncViewCube(state, viewCubeRef.current);
      }}
    />
  ));

  const handleViewCubePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (event.button !== 0 || viewCubeDragRef.current) {
      return;
    }
    suppressViewCubeClickRef.current = false;
    viewCubeDragRef.current = beginViewCubeDrag(event.pointerId, event.clientX, event.clientY);
  }, []);

  const handleViewCubePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = viewCubeDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }
    const move = moveViewCubeDrag(drag, event.clientX, event.clientY);
    if (!move) {
      return;
    }
    if (move.started) {
      // Capture only once the press becomes a drag, so a plain click still
      // lands on the face button underneath.
      capturePointer(event.currentTarget, event.pointerId);
      setViewCubeDragging(true);
    }
    const state = threeRef.current;
    if (!state) {
      return;
    }
    orbitCameraByDrag(state, move.dx, move.dy);
    syncViewCube(state, viewCubeRef.current);
  }, []);

  const endViewCubeDrag = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = viewCubeDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }
    viewCubeDragRef.current = null;
    if (drag.dragging) {
      suppressViewCubeClickRef.current = true;
      setViewCubeDragging(false);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    }
  }, []);

  const handleViewCubeClickCapture = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    // The click that ends a drag must not also snap to the face it ended on.
    if (suppressViewCubeClickRef.current) {
      suppressViewCubeClickRef.current = false;
      event.preventDefault();
      event.stopPropagation();
    }
  }, []);

  const zoomCamera = useCallback((scale: number) => {
    const state = threeRef.current;
    if (!state) {
      return;
    }

    const scaled = zoomDistanceScale(scale, workspaceRef.current.zoomSpeed);
    if (scaled < 1) movePivotToDepthUnder(state, 0, 0);
    if (state.camera instanceof THREE.OrthographicCamera) {
      const range = orthographicZoomRange(state.camera);
      state.camera.zoom = clamp(state.camera.zoom / scaled, range.min, range.max);
    } else {
      const offset = state.camera.position.clone().sub(state.controls.target);
      const distance = clamp(offset.length() * scaled, CAMERA_MIN_DISTANCE, CAMERA_MAX_DISTANCE);
      offset.setLength(distance);
      state.camera.position.copy(state.controls.target).add(offset);
    }
    state.camera.updateProjectionMatrix();
    state.controls.update();
    state.needsRender = true;
  }, []);

  const toggleProjection = useCallback(() => {
    const state = threeRef.current;
    if (!state) {
      return;
    }
    toggleCameraProjection(state);
    // The button reads its state from the camera that is actually in the
    // scene, so the keyboard shortcut and the button can never disagree.
    setOrthographicView(state.camera instanceof THREE.OrthographicCamera);
  }, []);

  const togglePlacementWorkplane = useCallback(() => {
    if (splitActiveRef.current) return;
    setTapeToolsOpen(false);
    setTapeActive(false);
    tapeDeleteModeRef.current = false;
    setTapeDeleteMode(false);
    tapeMoveModeRef.current = false;
    setTapeMoveMode(false);
    onToggleWorkplaneTool();
  }, [onToggleWorkplaneTool, setTapeActive]);

  const setPlacementWorkplaneAtSelection = useCallback(() => {
    if (selectedIdsRef.current.length !== 1) return false;
    const shape = shapesRef.current.find((entry) => entry.id === selectedIdsRef.current[0] && !entry.hidden);
    if (!shape) return false;
    const quaternion = quaternionForShape(shape);
    const normal = new THREE.Vector3(0, 1, 0).applyQuaternion(quaternion).normalize();
    const tangent = new THREE.Vector3(1, 0, 0).applyQuaternion(quaternion).normalize();
    const origin = shapeCenter(shape).addScaledVector(normal, shape.height / 2);
    onSetPlacementWorkplane(snapPlacementWorkplaneOrigin(
      placementWorkplaneFromSurface(
        { x: origin.x, y: origin.y, z: origin.z },
        { x: normal.x, y: normal.y, z: normal.z },
        { x: tangent.x, y: tangent.y, z: tangent.z },
      ),
      snapStep(snapRef.current),
    ), "shape");
    onWorkplaneModeChange(false);
    return true;
  }, [onSetPlacementWorkplane, onWorkplaneModeChange]);

  const toggleTapeTools = useCallback(() => {
    if (splitActiveRef.current) return;
    const next = !tapeToolsOpen;
    setTapeToolsOpen(next);
    if (next) {
      setSectionViewOpen(false);
    }
    setTapeActive(false);
    tapeDeleteModeRef.current = false;
    setTapeDeleteMode(false);
    tapeMoveModeRef.current = false;
    setTapeMoveMode(false);
    if (next) {
      onWorkplaneModeChange(false);
    }
  }, [onWorkplaneModeChange, tapeToolsOpen, setTapeActive]);

  const activateTapeAdd = useCallback(() => {
    if (splitActiveRef.current) return;
    tapeDeleteModeRef.current = false;
    setTapeDeleteMode(false);
    tapeMoveModeRef.current = false;
    setTapeMoveMode(false);
    setTapeActive(true);
    onWorkplaneModeChange(false);
    onCancelCruise?.();
  }, [onCancelCruise, onWorkplaneModeChange, setTapeActive]);

  const activateTapeDelete = useCallback(() => {
    if (splitActiveRef.current) return;
    setTapeActive(false);
    tapeMoveModeRef.current = false;
    setTapeMoveMode(false);
    tapeDeleteModeRef.current = true;
    setTapeDeleteMode(true);
    onWorkplaneModeChange(false);
    onCancelCruise?.();
  }, [onCancelCruise, onWorkplaneModeChange, setTapeActive]);

  const activateTapeMove = useCallback(() => {
    if (splitActiveRef.current) return;
    setTapeActive(false);
    tapeDeleteModeRef.current = false;
    setTapeDeleteMode(false);
    tapeMoveModeRef.current = true;
    setTapeMoveMode(true);
    onWorkplaneModeChange(false);
    onCancelCruise?.();
    onSelectShape(null);
  }, [onCancelCruise, onSelectShape, onWorkplaneModeChange, setTapeActive]);

  const collapseCameraControls = useCallback(() => {
    setCameraControlsCollapsed(true);
    setTapeToolsOpen(false);
    setSectionViewOpen(false);
    setTapeActive(false);
    tapeDeleteModeRef.current = false;
    setTapeDeleteMode(false);
    tapeMoveModeRef.current = false;
    setTapeMoveMode(false);
    tapePointDragRef.current = null;
  }, [setTapeActive]);

  const syncSectionClippingState = useCallback((settings: SectionPlaneSettings) => {
    const state = threeRef.current;
    if (!state) return;

    if (!settings.enabled) {
      if (state.sectionPlane) {
        applySectionClipping(state, null);
      }
      updateSectionPlaneHelper(state, settings, workspaceRef.current);
      return;
    }

    const { normal, constant } = computeSectionPlaneVector(settings);
    if (!state.sectionPlane) {
      const plane = new THREE.Plane(new THREE.Vector3(normal.x, normal.y, normal.z), constant);
      applySectionClipping(state, plane);
    } else {
      state.sectionPlane.normal.set(normal.x, normal.y, normal.z);
      state.sectionPlane.constant = constant;
      applySectionClipping(state, state.sectionPlane);
    }
    updateSectionPlaneHelper(state, settings, workspaceRef.current);
  }, []);

  useEffect(() => {
    syncSectionClippingState(sectionSettings);
  }, [sectionSettings, syncSectionClippingState]);

  useEffect(() => {
    if (!sectionFineDraggingRef.current) setSectionFineAnchor(sectionSettings.offset);
  }, [sectionSettings.offset]);

  const toggleSectionView = useCallback(() => {
    setSectionViewOpen((current) => {
      const next = !current;
      if (next) {
        setTapeToolsOpen(false);
        if (!sectionSettingsRef.current.enabled) {
          const bounds = getSectionBounds(shapesRef.current, sectionSettingsRef.current.axis, workspaceRef.current.width, workspaceRef.current.depth);
          setSectionSettings((prev) => ({
            ...prev,
            enabled: true,
            offset: bounds.center,
          }));
        }
      }
      return next;
    });
  }, []);

  const handleToggleSectionEnabled = useCallback((enabled: boolean) => {
    setSectionSettings((prev) => {
      const next = { ...prev, enabled };
      if (enabled && prev.offset === 0) {
        const bounds = getSectionBounds(shapesRef.current, prev.axis, workspaceRef.current.width, workspaceRef.current.depth);
        next.offset = bounds.center;
      }
      return next;
    });
  }, []);

  const handleSelectSectionAxis = useCallback((axis: SectionPlaneAxis) => {
    const bounds = getSectionBounds(shapesRef.current, axis, workspaceRef.current.width, workspaceRef.current.depth);
    setSectionSettings((prev) => ({
      ...prev,
      axis,
      offset: bounds.center,
    }));
  }, []);

  const handleToggleSectionFlip = useCallback(() => {
    setSectionSettings((prev) => ({
      ...prev,
      flipped: !prev.flipped,
    }));
  }, []);

  const handleSectionOffsetChange = useCallback((offset: number) => {
    setSectionSettings((prev) => ({
      ...prev,
      offset,
    }));
  }, []);

  const handleResetSectionToCenter = useCallback(() => {
    const bounds = getSectionBounds(shapesRef.current, sectionSettingsRef.current.axis, workspaceRef.current.width, workspaceRef.current.depth);
    setSectionSettings((prev) => ({
      ...prev,
      offset: bounds.center,
    }));
  }, []);

  const handleToggleShowSectionPlane = useCallback((showPlane: boolean) => {
    setSectionSettings((prev) => ({
      ...prev,
      showPlane,
    }));
  }, []);

  // MCP: the same rules as the buttons - a new axis, switching on from the
  // start position or `center` put the plane in the middle of the design,
  // unless an offset is given.
  useEffect(() => {
    window.layerlingSectionView = (patch) => {
      const current = sectionSettingsRef.current;
      const axis = patch.axis ?? current.axis;
      const bounds = getSectionBounds(shapesRef.current, axis, workspaceRef.current.width, workspaceRef.current.depth);
      const switchingOn = patch.enabled === true && !current.enabled && current.offset === 0;
      const recenter = patch.center === true || axis !== current.axis || switchingOn;
      const next: SectionPlaneSettings = {
        enabled: patch.enabled ?? current.enabled,
        axis,
        offset: typeof patch.offset === "number" && Number.isFinite(patch.offset) ? patch.offset : recenter ? bounds.center : current.offset,
        flipped: patch.flipped ?? current.flipped,
        showPlane: patch.showPlane ?? current.showPlane,
      };
      sectionSettingsRef.current = next;
      setSectionSettings(next);
      return { settings: next, bounds: { min: bounds.min, max: bounds.max, center: bounds.center } };
    };
    return () => {
      delete window.layerlingSectionView;
    };
  }, []);

  // The editor stays mounted when you go back to the overview, so a cut set in
  // one design used to carry over into the next one: shapes placed there
  // vanished behind a plane nobody remembered switching on. Leaving the
  // editor ends the cut; every design opens uncut.
  const sectionProjectIdRef = useRef(projectId);
  useEffect(() => {
    if (sectionProjectIdRef.current === projectId) return;
    sectionProjectIdRef.current = projectId;
    sectionSettingsRef.current = DEFAULT_SECTION_SETTINGS;
    setSectionSettings(DEFAULT_SECTION_SETTINGS);
    setSectionViewOpen(false);
  }, [projectId]);

  const handleTapePointPointerDown = useCallback(
    (event: ReactPointerEvent<SVGCircleElement>, pointId: string) => {
      if (event.button !== 0) {
        return;
      }
      if (tapeDeleteModeRef.current) {
        event.preventDefault();
        event.stopPropagation();
        removeTapePoint(pointId);
        return;
      }
      if (tapeMoveModeRef.current) {
        event.preventDefault();
        event.stopPropagation();
        capturePointer(event.currentTarget, event.pointerId);
        tapePointDragRef.current = { pointId, pointerId: event.pointerId };
        return;
      }
      if (!tapeModeRef.current) {
        return;
      }
      const point = tapeModelRef.current.points.find((candidate) => candidate.id === pointId);
      if (!point) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      const state = threeRef.current;
      const world = state ? tapePointWorld(state, point) : new THREE.Vector3(point.x, point.y, point.z);
      selectTapeCandidate({ x: world.x, y: world.y, z: world.z, pointId, attachment: point.attachment });
    },
    [removeTapePoint, selectTapeCandidate],
  );

  const handleTapePointPointerMove = useCallback(
    (event: ReactPointerEvent<SVGCircleElement>, pointId: string) => {
      const drag = tapePointDragRef.current;
      if (!tapeMoveModeRef.current || !drag || drag.pointId !== pointId || drag.pointerId !== event.pointerId) return;
      event.preventDefault();
      event.stopPropagation();
      const candidate = resolveTapeCandidate(event.clientX, event.clientY, pointId);
      if (!candidate) return;
      const current = tapeModelRef.current;
      storeTapeModel({
        ...current,
        points: current.points.map((point) => point.id === pointId ? {
          ...point,
          x: candidate.x,
          y: candidate.y,
          z: candidate.z,
          attachment: candidate.attachment,
        } : point),
        segments: current.segments.map((segment) => segment.startId === pointId || segment.endId === pointId ? { ...segment, edge: undefined } : segment),
        hover: candidate,
      });
    },
    [resolveTapeCandidate, storeTapeModel],
  );

  const handleTapePointPointerUp = useCallback(
    (event: ReactPointerEvent<SVGCircleElement>, pointId: string) => {
      const drag = tapePointDragRef.current;
      if (!drag || drag.pointId !== pointId || drag.pointerId !== event.pointerId) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      tapePointDragRef.current = null;
      const current = tapeModelRef.current;
      storeTapeModel({ ...current, hover: null });
    },
    [storeTapeModel],
  );

  const handleTapeSegmentPointerDown = useCallback(
    (event: ReactPointerEvent<SVGElement>, segmentId: string) => {
      if (event.button !== 0) {
        return;
      }
      if (tapeDeleteModeRef.current) {
        event.preventDefault();
        event.stopPropagation();
        removeTapeSegment(segmentId);
        return;
      }
      if (!tapeModeRef.current) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      const candidate = resolveTapeCandidate(event.clientX, event.clientY);
      if (candidate) {
        selectTapeCandidate(candidate);
      }
    },
    [removeTapeSegment, resolveTapeCandidate, selectTapeCandidate],
  );

  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) {
        return false;
      }
      return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      // Shift turns the digit into "!" and the like on most layouts, so the
      // view comes from the key's position then.
      const shortcutView = !event.ctrlKey && !event.metaKey && !event.altKey
        ? viewFaceForKey(event.key, event.code, event.shiftKey)
        : undefined;
      // A slider keeps the focus after it was dragged, as in the split panel,
      // but only needs its own keys - the view shortcuts still apply.
      const sliderTarget = event.target instanceof HTMLInputElement && event.target.type === "range";
      if (sliderTarget ? SLIDER_KEYS.has(event.key) : isTypingTarget(event.target)) {
        return;
      }

      const key = event.key.toLowerCase();
      if (event.key === "Escape" && workplaneModeRef.current) {
        event.preventDefault();
        // Wie ein Klick ins Leere: zurueck auf die Grundplatte, so steht es in der Anleitung (#108).
        onSetPlacementWorkplane(horizontalPlacementWorkplane(), "base");
        onWorkplaneModeChange(false);
      } else if (event.key === "Escape" && (tapeToolsOpen || tapeModeRef.current || tapeDeleteModeRef.current || tapeMoveModeRef.current)) {
        event.preventDefault();
        setTapeActive(false);
        tapeDeleteModeRef.current = false;
        setTapeDeleteMode(false);
        tapeMoveModeRef.current = false;
        setTapeMoveMode(false);
        tapePointDragRef.current = null;
        setTapeToolsOpen(false);
      } else if (event.key === "Escape" && cornerRulerModeRef.current) {
        event.preventDefault();
        cornerRulerModeRef.current = false;
        setCornerRulerMode(false);
      } else if (event.key === "Escape" && sectionMeasureModeRef.current) {
        event.preventDefault();
        setSectionMeasureMode(false);
      } else if (event.key === "Escape" && sectionViewOpenRef.current) {
        event.preventDefault();
        setSectionViewOpen(false);
      } else if (shortcutView) {
        event.preventDefault();
        setViewCubeFace(shortcutView);
        // With Shift, frame the selection from the new side, as Shift+F does;
        // with nothing selected focusSelection does nothing.
        if (event.shiftKey) focusSelection();
      } else if (key === "w") {
        event.preventDefault();
        if (!event.shiftKey || !setPlacementWorkplaneAtSelection()) {
          togglePlacementWorkplane();
        }
      } else if (key === "f" && event.shiftKey) {
        event.preventDefault();
        focusSelection();
      } else if (key === "f" || event.key === "Home") {
        event.preventDefault();
        resetView();
      } else if (key === "o" && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        toggleProjection();
      } else if ((event.key === "+" || event.key === "=") && !event.ctrlKey && !event.metaKey && !event.altKey) {
        // With Ctrl or Cmd these are the browser's own page zoom, which the page must not swallow.
        event.preventDefault();
        zoomCamera(0.72);
      } else if ((event.key === "-" || event.key === "_") && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        zoomCamera(1.28);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focusSelection, onSetPlacementWorkplane, onWorkplaneModeChange, resetView, tapeToolsOpen, sectionViewOpen, setPlacementWorkplaneAtSelection, setTapeActive, setViewCubeFace, togglePlacementWorkplane, toggleProjection, zoomCamera]);

  return (
    <main className="workplane-stage">
      <div
        className={`view-cube ${viewCubeDragging ? "dragging" : ""}`}
        aria-label={t("view.cube")}
        onPointerDown={handleViewCubePointerDown}
        onPointerMove={handleViewCubePointerMove}
        onPointerUp={endViewCubeDrag}
        onPointerCancel={endViewCubeDrag}
        onClickCapture={handleViewCubeClickCapture}
      >
        <div className="view-cube-inner" ref={viewCubeRef}>
          <button type="button" className="cube-face cube-top" aria-label={t("view.bottom")} aria-keyshortcuts="6" title={t("camera.shortcut", { label: t("view.bottom"), keys: "6" })} onClick={() => setViewCubeFace("bottom")}>{t("view.bottomShort")}{viewCubeZones("bottom")}</button>
          <button type="button" className="cube-face cube-bottom" aria-label={t("view.top")} aria-keyshortcuts="5" title={t("camera.shortcut", { label: t("view.top"), keys: "5" })} onClick={() => setViewCubeFace("top")}>{t("view.topShort")}{viewCubeZones("top")}</button>
          <button type="button" className="cube-face cube-front" aria-label={t("view.front")} aria-keyshortcuts="1" title={t("camera.shortcut", { label: t("view.front"), keys: "1" })} onClick={() => setViewCubeFace("front")}>{t("view.frontShort")}{viewCubeZones("front")}</button>
          <button type="button" className="cube-face cube-back" aria-label={t("view.back")} aria-keyshortcuts="2" title={t("camera.shortcut", { label: t("view.back"), keys: "2" })} onClick={() => setViewCubeFace("back")}>{t("view.backShort")}{viewCubeZones("back")}</button>
          <button type="button" className="cube-face cube-right" aria-label={t("view.right")} aria-keyshortcuts="4" title={t("camera.shortcut", { label: t("view.right"), keys: "4" })} onClick={() => setViewCubeFace("right")}>{t("view.rightShort")}{viewCubeZones("right")}</button>
          <button type="button" className="cube-face cube-left" aria-label={t("view.left")} aria-keyshortcuts="3" title={t("camera.shortcut", { label: t("view.left"), keys: "3" })} onClick={() => setViewCubeFace("left")}>{t("view.leftShort")}{viewCubeZones("left")}</button>
        </div>
      </div>

      <div className={`camera-controls ${cameraControlsCollapsed ? "collapsed" : ""}`} aria-label={t("camera.controls")}>
        {cameraControlsCollapsed ? (
          <button className="camera-controls-toggle" aria-label={t("camera.show")} title={t("camera.showShort")} aria-expanded={false} onClick={() => setCameraControlsCollapsed(false)}>
            <ChevronRight size={24} strokeWidth={2.25} aria-hidden="true" />
          </button>
        ) : (
          <>
            <button className="camera-controls-toggle" aria-label={t("camera.hide")} title={t("camera.hideShort")} aria-expanded={true} onClick={collapseCameraControls}>
              <ChevronLeft size={24} strokeWidth={2.25} aria-hidden="true" />
            </button>
            <button aria-label={t("camera.home")} onClick={resetView}>
              <Home size={24} strokeWidth={2.25} />
            </button>
            <button
              aria-label={t("camera.focusSelection")}
              aria-keyshortcuts="Shift+F"
              title={t("camera.shortcut", { label: t("camera.focusSelection"), keys: "Shift+F" })}
              disabled={selectedIds.length === 0}
              onClick={focusSelection}
            >
              <Crosshair size={24} strokeWidth={2.25} />
            </button>
            <button className="camera-zoom-button" aria-label={t("camera.zoomIn")} onClick={() => zoomCamera(0.7)}>
              <Plus size={28} strokeWidth={2.15} />
            </button>
            <button className="camera-zoom-button" aria-label={t("camera.zoomOut")} onClick={() => zoomCamera(1.35)}>
              <Minus size={28} strokeWidth={2.15} />
            </button>
            {/* Zwei Finger zoomen und schieben von selbst. Zum Drehen fehlt die
                Geste, also gibt es sie hier als Umschalter - und er steht nur
                da, wo mit dem Finger gearbeitet wird. */}
            {touchDevice ? (
              <button
                className={`camera-touch-rotate${touchRotate ? " active" : ""}`}
                aria-label={t("camera.touchRotate")}
                title={t("camera.touchRotateHint")}
                aria-pressed={touchRotate}
                onClick={() => setTouchRotate((current) => !current)}
              >
                <Rotate3d size={26} strokeWidth={2.15} />
              </button>
            ) : null}
            <button
              className={orthographicView ? "active" : ""}
              aria-label={t("camera.orthographic")}
              aria-keyshortcuts="O"
              aria-pressed={orthographicView}
              title={t("camera.shortcut", {
                label: orthographicView ? t("camera.perspective") : t("camera.orthographic"),
                keys: "O",
              })}
              onClick={toggleProjection}
            >
              <Cuboid size={24} strokeWidth={2.15} aria-hidden="true" />
            </button>
            <div className="workplane-display-control-group">
              <button
                className={workplaneLayerHidden ? "active" : ""}
                aria-label={workplaneLayerHidden ? t("camera.showWorkplane") : t("camera.hideWorkplane")}
                title={workplaneLayerHidden ? t("camera.showWorkplane") : t("camera.hideWorkplane")}
                aria-pressed={workplaneLayerHidden}
                onClick={() => setWorkplaneLayerHidden((current) => !current)}
              >
                <GridEyeIcon size={25} strokeWidth={2.1} crossed={workplaneLayerHidden} aria-hidden="true" />
              </button>
            </div>
            <div className="workplane-control-group">
              <button
                className={workplaneMode ? "active" : ""}
                aria-label={t("camera.placeWorkplane")}
                title={t("camera.shortcut", { label: t("camera.placeWorkplane"), keys: "W" })}
                aria-pressed={workplaneMode}
                disabled={splitActive}
                onClick={togglePlacementWorkplane}
              >
                <PanelsTopLeft size={25} strokeWidth={2.1} aria-hidden="true" />
              </button>
              {!placementWorkplaneIsBase(placementWorkplane) && onToggleWorkplaneHidden ? (
                <button
                  className={`workplane-visibility-toggle ${workplaneHidden ? "active" : ""}`}
                  aria-label={workplaneHidden ? t("camera.showFaceWorkplane") : t("camera.hideFaceWorkplane")}
                  title={workplaneHidden ? t("camera.showFaceWorkplane") : t("camera.hideFaceWorkplane")}
                  aria-pressed={workplaneHidden}
                  onClick={onToggleWorkplaneHidden}
                >
                  {workplaneHidden ? <EyeOff size={22} strokeWidth={2.1} aria-hidden="true" /> : <Eye size={22} strokeWidth={2.1} aria-hidden="true" />}
                </button>
              ) : null}
              {/* Wer die Ebene loswerden will, sucht neben dem Auge - das blendet nur aus (#108). */}
              {!placementWorkplaneIsBase(placementWorkplane) ? (
                <button
                  className="workplane-reset-button"
                  aria-label={t("camera.resetWorkplane")}
                  title={t("camera.resetWorkplane")}
                  onClick={() => {
                    onSetPlacementWorkplane(horizontalPlacementWorkplane(), "base");
                    if (workplaneModeRef.current) onWorkplaneModeChange(false);
                  }}
                >
                  <ArrowDownToLine size={22} strokeWidth={2.1} aria-hidden="true" />
                </button>
              ) : null}
            </div>
            <div className="tape-control-group">
              <button
                className={`tape-trigger ${tapeToolsOpen ? "active" : ""}`}
                aria-label={t("camera.tapeTools")}
                title={t("camera.tapeTools")}
                aria-expanded={tapeToolsOpen}
                aria-controls="tape-tool-popover"
                disabled={splitActive}
                onClick={toggleTapeTools}
              >
                <RulerDimensionLine size={26} strokeWidth={2.2} aria-hidden="true" />
              </button>
              {tapeToolsOpen ? (
                <MovableTapePanel>
                  <button className={tapeMode ? "active" : ""} aria-label={t("camera.addMeasurement")} title={t("camera.addMeasurement")} aria-pressed={tapeMode} onClick={activateTapeAdd}>
                    <Plus size={21} strokeWidth={2.4} aria-hidden="true" />
                  </button>
                  <button className={tapeMoveMode ? "active" : ""} aria-label={t("camera.moveMeasurement")} title={t("camera.moveMeasurement")} aria-pressed={tapeMoveMode} onClick={activateTapeMove}>
                    <MousePointer2 size={20} strokeWidth={2.25} aria-hidden="true" />
                  </button>
                  <button className={`tape-delete-button ${tapeDeleteMode ? "active" : ""}`} aria-label={t("camera.deleteMeasurement")} title={t("camera.deleteMeasurement")} aria-pressed={tapeDeleteMode} onClick={activateTapeDelete}>
                    <X size={20} strokeWidth={2.4} aria-hidden="true" />
                  </button>
                  <button className="tape-clear-button" aria-label={t("camera.deleteAllMeasurements")} title={t("camera.deleteAllMeasurements")} onClick={requestClearTape}>
                    <Trash2 size={19} strokeWidth={2.25} aria-hidden="true" />
                  </button>
                  <GuideHelpLink section="tapeMeasure" className="tape-popover-help" iconSize={20} strokeWidth={2.25} />
                </MovableTapePanel>
              ) : null}
            </div>
            <div className="corner-ruler-control-group">
              <button
                className={cornerRulerMode ? "active" : ""}
                aria-label={t("camera.cornerRulerTool")}
                title={t("camera.cornerRulerTool")}
                aria-pressed={cornerRulerMode}
                disabled={splitActive}
                onClick={toggleCornerRulerTool}
              >
                <FramingSquareIcon size={24} strokeWidth={2.15} aria-hidden="true" />
              </button>
            </div>
            <div className="section-control-group">
              <button
                className={`section-trigger ${sectionViewOpen || sectionSettings.enabled ? "active" : ""}`}
                aria-label={t("camera.sectionView")}
                title={t("camera.sectionView")}
                aria-expanded={sectionViewOpen}
                aria-controls="section-tool-popover"
                onClick={toggleSectionView}
              >
                <Slice size={23} strokeWidth={2.15} aria-hidden="true" />
              </button>
              {sectionViewOpen ? (
                <MovableSectionPanel>
                  {(handleProps) => (<>
                  <div className="section-popover-header movable" title={t("camera.sectionMoveHint")} {...handleProps}>
                    <span className="section-popover-title">{t("camera.sectionView")}</span>
                    <button
                      type="button"
                      className={`section-toggle-btn ${sectionSettings.enabled ? "active" : ""}`}
                      onClick={() => handleToggleSectionEnabled(!sectionSettings.enabled)}
                      aria-pressed={sectionSettings.enabled}
                      title={sectionSettings.enabled ? t("camera.sectionActive") : t("camera.sectionInactive")}
                    >
                      {sectionSettings.enabled ? t("camera.sectionActive") : t("camera.sectionInactive")}
                    </button>
                    <GuideHelpLink section="sectionView" className="section-popover-help" iconSize={17} strokeWidth={2.2} />
                    <button
                      type="button"
                      className="section-popover-close"
                      aria-label={t("workspace.close")}
                      title={t("workspace.close")}
                      onClick={() => setSectionViewOpen(false)}
                    >
                      <X size={16} strokeWidth={2.4} aria-hidden="true" />
                    </button>
                  </div>

                  {sectionSettings.enabled ? (
                    <>
                      <div className="section-popover-axis-row">
                        <span className="section-label">{t("camera.sectionAxis")}</span>
                        <div className="section-axis-buttons" role="radiogroup" aria-label={t("camera.sectionAxis")}>
                          {/* Named like the position fields: the depth (z inside) is Y, the height (y inside) is Z. */}
                          {SECTION_AXES_SHOWN.map((ax) => (
                            <button
                              key={ax}
                              type="button"
                              role="radio"
                              aria-checked={sectionSettings.axis === ax}
                              className={`section-axis-btn ${sectionSettings.axis === ax ? "active" : ""}`}
                              onClick={() => handleSelectSectionAxis(ax)}
                              title={t(`camera.sectionAxis${sectionAxisLetter(ax)}`)}
                            >
                              {sectionAxisLetter(ax)}
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          className={`section-flip-btn ${sectionSettings.flipped ? "active" : ""}`}
                          onClick={handleToggleSectionFlip}
                          aria-pressed={sectionSettings.flipped}
                          title={t("camera.sectionFlip")}
                          aria-label={t("camera.sectionFlip")}
                        >
                          <FlipHorizontal size={17} strokeWidth={2.2} aria-hidden="true" />
                        </button>
                      </div>

                      {(() => {
                        const bounds = getSectionBounds(shapes, sectionSettings.axis, workspace.width, workspace.depth);
                        const fine = sectionFineWindow(bounds);
                        // The Y cut counts towards the back like the position fields (#182); inside it is z.
                        const sign = sectionSettings.axis === "z" ? -1 : 1;
                        const shown = Math.round(millimetersToDisplay(sign * sectionSettings.offset, workspace) * 1000) / 1000 || 0;
                        const finishFine = () => {
                          sectionFineDraggingRef.current = false;
                          setSectionFineAnchor(sectionSettingsRef.current.offset);
                        };
                        return (
                          <div className="section-popover-slider-row">
                            <div className="section-slider-head">
                              <span className="section-label">{t("camera.sectionOffset")}</span>
                              <div className="section-number-wrap">
                                {/* Text, not a number input: such a field reads the decimal mark by the
                                    browser's language, and a German one refused "12.5" (#210). */}
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  className="section-number-input"
                                  value={sectionOffsetDraft ?? String(shown)}
                                  onFocus={(e) => {
                                    setSectionOffsetDraft(String(shown));
                                    e.currentTarget.select();
                                  }}
                                  onChange={(e) => setSectionOffsetDraft(e.target.value)}
                                  onBlur={() => {
                                    const val = parseMeasurementInput(sectionOffsetDraft ?? "");
                                    if (!sectionOffsetCancelRef.current && Number.isFinite(val)) handleSectionOffsetChange(sign * displayToMillimeters(val, workspace));
                                    sectionOffsetCancelRef.current = false;
                                    setSectionOffsetDraft(null);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") e.currentTarget.blur();
                                    if (e.key === "Escape") {
                                      e.stopPropagation();
                                      sectionOffsetCancelRef.current = true;
                                      e.currentTarget.blur();
                                    }
                                  }}
                                  aria-label={t("camera.sectionOffset")}
                                />
                                <span className="section-unit">{lengthDisplayUnit(workspace).label}</span>
                              </div>
                            </div>
                            <label className="section-slider-line">
                              <span className="section-slider-scale">{t("camera.sectionCoarse")}</span>
                              <input
                                type="range"
                                className="section-slider"
                                min={sign > 0 ? bounds.min : -bounds.max}
                                max={sign > 0 ? bounds.max : -bounds.min}
                                step={bounds.step}
                                value={sign * sectionSettings.offset}
                                onChange={(e) => handleSectionOffsetChange(sign * parseFloat(e.target.value))}
                                aria-label={`${t("camera.sectionOffset")} (${t("camera.sectionCoarse")})`}
                              />
                            </label>
                            {/* Fein: ein schmales Fenster um die Stelle, an der der Grobregler
                                stand; nach dem Loslassen rueckt es mit, der Knopf springt in die Mitte. */}
                            <label className="section-slider-line" title={t("camera.sectionFineHint", { span: formatLengthMm(fine.span, workspace.accuracy) })}>
                              <span className="section-slider-scale">{t("camera.sectionFine")}</span>
                              <input
                                type="range"
                                className="section-slider"
                                min={-fine.span}
                                max={fine.span}
                                step={fine.step}
                                value={Math.max(-fine.span, Math.min(fine.span, sign * (sectionSettings.offset - sectionFineAnchor)))}
                                onPointerDown={() => { sectionFineDraggingRef.current = true; }}
                                onPointerUp={finishFine}
                                onBlur={finishFine}
                                onKeyDown={() => { sectionFineDraggingRef.current = true; }}
                                onKeyUp={finishFine}
                                onChange={(e) => {
                                  sectionFineDraggingRef.current = true;
                                  handleSectionOffsetChange(sectionFineAnchor + sign * parseFloat(e.target.value));
                                }}
                                aria-label={`${t("camera.sectionOffset")} (${t("camera.sectionFine")})`}
                              />
                            </label>
                          </div>
                        );
                      })()}

                      <div className="section-measure-row">
                        <button
                          type="button"
                          className={`section-action-btn section-measure-btn ${sectionMeasureMode ? "active" : ""}`}
                          aria-pressed={sectionMeasureMode}
                          onClick={() => {
                            if (!sectionMeasureModeRef.current) onCancelCruise?.();
                            setSectionMeasureMode((current) => !current);
                          }}
                          title={t("camera.sectionMeasureHint")}
                        >
                          <Ruler size={14} strokeWidth={2.2} aria-hidden="true" />
                          <span>{t("camera.sectionMeasure")}</span>
                        </button>
                        {sectionMeasureMode ? (
                          sectionMeasureResult ? (
                            <div className="section-measure-readout" aria-live="polite">
                              <strong>{formatMeasure(sectionMeasureResult.distance, workspace.accuracy)} {lengthDisplayUnit(workspace).label}</strong>
                              <span>{sectionMeasureDeltas(sectionMeasureResult, sectionSettings.axis, workspace.accuracy)}</span>
                            </div>
                          ) : (
                            <span className="section-measure-help">{t("camera.sectionMeasureHelp")}</span>
                          )
                        ) : null}
                      </div>

                      <div className="section-popover-footer">
                        <div className="section-footer-actions">
                          <button
                            type="button"
                            className="section-action-btn"
                            onClick={handleResetSectionToCenter}
                            title={t("camera.sectionResetHint")}
                            aria-label={t("camera.sectionReset")}
                          >
                            <RotateCcw size={14} strokeWidth={2.2} aria-hidden="true" />
                            <span>{t("camera.sectionReset")}</span>
                          </button>
                          <button
                            type="button"
                            className="section-action-btn"
                            onClick={() => onExportSectionSvg?.(sectionSettings.axis, sectionSettings.offset)}
                            title={t("camera.sectionExportSvgHint")}
                            aria-label={t("camera.sectionExportSvg")}
                          >
                            <Download size={14} strokeWidth={2.2} aria-hidden="true" />
                            <span>{t("camera.sectionExportSvg")}</span>
                          </button>
                        </div>
                        <label className="section-checkbox-label">
                          <input
                            type="checkbox"
                            checked={sectionSettings.showPlane}
                            onChange={(e) => handleToggleShowSectionPlane(e.target.checked)}
                          />
                          <span>{t("camera.sectionShowPlane")}</span>
                        </label>
                      </div>
                    </>
                  ) : null}
                  </>)}
                </MovableSectionPanel>
              ) : null}
            </div>
          </>
        )}
      </div>

      <section className={`workplane-wrap ${noteMode ? "note-mode" : ""} ${workplaneMode ? "placing-workplane" : ""} ${splitActive ? "split-mode" : ""} ${splitHandleState ? `split-handle-${splitHandleState}` : ""} ${splitSurfacePick ? "split-picking" : ""} ${splitSurfacePick && splitPickOverFace ? "split-pick-over-face" : ""} ${cruiseAsset || carryIds?.length ? "cruising" : ""} ${tapeMode ? "tape-mode" : ""} ${tapeDeleteMode ? "tape-delete-mode" : ""} ${tapeMoveMode ? "tape-move-mode" : ""} ${cornerRulerMode ? "corner-ruler-mode" : ""} ${pivotPickMode || layFlatPickMode || mateFacePick ? "pivot-pick-mode" : ""} ${modifierActive ? "modifier-edge-pick" : ""} ${sectionMeasureMode && sectionSettings.enabled ? "section-measure-mode" : ""}`} aria-label={t("aria.workplane")}>
        <div className="workplane-plane">
          <div
            className="three-workplane-host"
            ref={hostRef}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "copy";
            }}
            onDrop={handleDrop}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={finishDrag}
            onPointerCancel={finishDrag}
            onPointerLeave={handlePointerLeave}
          />
          {!workplaneMode && !splitActive && marqueeRect ? <div className="selection-marquee" style={marqueeRect} /> : null}
          {!workplaneMode && !splitActive && moveDimensionsEnabled && moveDimensionOverlay ? (
            <MoveDimensionOverlay
              overlay={moveDimensionOverlay}
              active={moveDimensionOverlay.active}
              onCommit={commitMoveDimension}
            />
          ) : null}
          {!workplaneMode && !splitActive && originDimensionsEnabled && originDimensionOverlay ? (
            <OriginDimensionOverlay overlay={originDimensionOverlay} />
          ) : null}
          {!workplaneMode && !splitActive && !pivotPickMode && !layFlatPickMode && !mateFacePick && transformOverlay && !alignMode && !mirrorMode && !tapeMode && !tapeDeleteMode && !tapeMoveMode && !modifierActive ? (
            <TransformOverlay
              box={transformOverlay}
              measureKey={pinnedMeasureKey ?? hoverMeasureKey}
              editingDimension={editingDimension}
              editingCorner={editingCorner}
              editingRotation={editingRotation}
              rotationReadout={rotationReadout}
              angleBadge={angleBadge}
              showRotationWheel={activeRotationWheel}
              hideSelectionChrome={activeTransformKind === "rotate"}
              hideDimensionMarks={false}
              rotationWheelAxis={rotationWheelAxis}
              pinnedRotationWheelView={pinnedRotationWheelView}
              onBeginCameraDrag={beginCameraDragFromOverlay}
              onCameraWheel={forwardCameraWheelFromOverlay}
              onBeginPivotDrag={onPivotPick ? beginPivotDrag : undefined}
              onBeginTransform={beginTransform}
              onMoveTransform={updateTransform}
              onFinishTransform={finishTransform}
              onHoverMeasure={setHoverMeasureKey}
              onPinMeasure={setPinnedMeasureKey}
              onBeginDimensionEdit={beginDimensionEdit}
              onBeginLiftEdit={beginLiftEdit}
              onBeginCornerEdit={beginCornerEdit}
              onEditingCornerChange={(axis, value) => setEditingCorner((current) => (current ? { entries: current.entries.map((entry) => (entry.axis === axis ? { ...entry, value } : entry)) } : current))}
              onCommitCornerEdit={commitCornerEdit}
              onCancelCornerEdit={cancelCornerEdit}
              onEditingDimensionChange={(value) => setEditingDimension((current) => (current ? { ...current, value } : current))}
              onCommitDimensionEdit={commitDimensionEdit}
              onCancelDimensionEdit={cancelDimensionEdit}
              onBeginRotationEdit={beginRotationEdit}
              onEditingRotationChange={(value) => setEditingRotation((current) => (current ? { ...current, value } : current))}
              onCommitRotationEdit={commitRotationEdit}
              onCancelRotationEdit={cancelRotationEdit}
            />
          ) : null}
          {noteOverlay && noteOverlay.notes.length > 0 ? (
            <NoteOverlay
              overlay={noteOverlay}
              editingId={editingNoteId}
              onPinPointerDown={handleNotePinPointerDown}
              onPinPointerMove={handleNotePinPointerMove}
              onPinPointerUp={handleNotePinPointerUp}
              onToggle={toggleNoteCard}
              onTextChange={(id, text) => onNoteUpdate?.(id, { text }, true)}
              // Beim Verlassen des Feldes steht der Text im Verlauf, auch wenn
              // die Hand zwischendurch nie lange genug stillstand.
              onTextCommit={(id) => onNoteUpdate?.(id, {})}
              onDetach={(id) => onNoteUpdate?.(id, { anchor: undefined })}
              onRemove={(id) => onNoteRemove?.(id)}
              onEditingIdChange={setEditingNoteId}
              workspace={workspace}
              onPointChange={(id, patch) => onNoteUpdate?.(id, patch)}
              pointCardOffset={pointCardOffset}
              onPointCardOffsetChange={changePointCardOffset}
            />
          ) : null}
          {!workplaneMode && !splitActive && alignOverlay ? <AlignOverlay overlay={alignOverlay} onAlign={onAlignSelection} onPreview={onAlignPreview} onPreviewClear={onAlignPreviewClear} /> : null}
          {!workplaneMode && !splitActive && mirrorOverlay ? <MirrorOverlay overlay={mirrorOverlay} onMirror={onMirrorSelection} onPreview={onMirrorPreview} onPreviewClear={onMirrorPreviewClear} /> : null}
          {!splitActive && sectionMeasureOverlay ? <SectionMeasureOverlay overlay={sectionMeasureOverlay} /> : null}
          {!workplaneMode && !splitActive && tapeOverlay && (tapeOverlay.points.length > 0 || tapeOverlay.hover) ? (
            <TapeOverlay
              overlay={tapeOverlay}
              startPointId={tapeModel.startPointId}
              active={tapeMode || tapeMoveMode}
              deleteMode={tapeDeleteMode}
              moveMode={tapeMoveMode}
              onPointPointerDown={handleTapePointPointerDown}
              onPointPointerMove={handleTapePointPointerMove}
              onPointPointerUp={handleTapePointPointerUp}
              onSegmentPointerDown={handleTapeSegmentPointerDown}
            />
          ) : null}
          {!workplaneMode && !splitActive && rulerDimensionOverlay && rulerDimensionOverlay.items.length > 0 ? (
            <RulerDimensionOverlay
              overlay={rulerDimensionOverlay}
              onLabelClick={beginRulerDimensionEdit}
              onHandlePointerDown={handleRulerDuplicatePointerDown}
              onHandlePointerMove={handleRulerDuplicatePointerMove}
              onHandlePointerUp={handleRulerDuplicatePointerUp}
            />
          ) : null}
          {!workplaneMode && !splitActive && cornerRulerOverlay && cornerRulerOverlay.items.length > 0 ? (
            <CornerRulerToolOverlay
              overlay={cornerRulerOverlay}
              onHandlePointerDown={handleCornerRulerHandlePointerDown}
              onHandlePointerMove={handleCornerRulerHandlePointerMove}
              onHandlePointerUp={handleCornerRulerHandlePointerUp}
              onDelete={removeCornerRuler}
              onToggleMode={toggleCornerRulerMode}
              onCoordinateClick={beginRulerCoordinateEdit}
            />
          ) : null}
          {rulerDimensionEditing ? (
            <input
              className="dimension-input"
              style={{ "--overlay-x": `${rulerDimensionEditing.x}px`, "--overlay-y": `${rulerDimensionEditing.y}px` } as CSSProperties}
              value={rulerDimensionEditing.value}
              autoFocus
              inputMode="decimal"
              onPointerDown={(event) => event.stopPropagation()}
              onFocus={(event) => event.currentTarget.select()}
              onChange={(event) => setRulerDimensionEditing((edit) => edit && { ...edit, value: event.target.value })}
              onBlur={commitRulerDimensionEdit}
              onKeyDown={(event) => {
                if (event.key === "Enter") commitRulerDimensionEdit();
                if (event.key === "Escape") cancelRulerDimensionEdit();
              }}
            />
          ) : null}
          {rulerDuplicateEditing ? (
            <input
              className="dimension-input"
              style={{ "--overlay-x": `${rulerDuplicateEditing.x}px`, "--overlay-y": `${rulerDuplicateEditing.y}px` } as CSSProperties}
              value={rulerDuplicateEditing.value}
              autoFocus
              inputMode="decimal"
              onPointerDown={(event) => event.stopPropagation()}
              onFocus={(event) => event.currentTarget.select()}
              onChange={(event) => setRulerDuplicateEditing((edit) => edit && { ...edit, value: event.target.value })}
              onBlur={commitRulerDuplicateEdit}
              onKeyDown={(event) => {
                if (event.key === "Enter") commitRulerDuplicateEdit();
                if (event.key === "Escape") cancelRulerDuplicateEdit();
              }}
            />
          ) : null}
          {rulerCoordinateEditing ? (
            <input
              className="dimension-input ruler-coordinate-input"
              style={{ "--overlay-x": `${rulerCoordinateEditing.x}px`, "--overlay-y": `${rulerCoordinateEditing.y}px` } as CSSProperties}
              value={rulerCoordinateEditing.value}
              autoFocus
              inputMode="decimal"
              onPointerDown={(event) => event.stopPropagation()}
              onFocus={(event) => event.currentTarget.select()}
              onChange={(event) => setRulerCoordinateEditing((edit) => edit && { ...edit, value: event.target.value })}
              onBlur={commitRulerCoordinateEdit}
              onKeyDown={(event) => {
                if (event.key === "Enter") commitRulerCoordinateEdit();
                if (event.key === "Escape") cancelRulerCoordinateEdit();
              }}
            />
          ) : null}
          {rulerDuplicatePreview ? (
            <span className="ruler-duplicate-preview" style={{ left: rulerDuplicatePreview.x, top: rulerDuplicatePreview.y }}>
              {rulerDuplicatePreview.label}
            </span>
          ) : null}
        </div>
      </section>

      {selectedShape && !splitActive && !modifierActive && !tapeMode && !tapeDeleteMode && !tapeMoveMode ? (
        <ShapeInspector
          shape={shapeWithParametricSource(selectedShape)}
          snap={snap}
          snapOpen={snapOpen}
          workspace={workspace}
          onUpdate={(patch, options) => {
            clearMoveDimensions();
            // Der Inspektor rechnet in der Urform; ein gedrehter Koerper wird
            // daraus neu gebaut, also muss auch der Anker daher kommen.
            const inspected = shapeWithParametricSource(selectedShape);
            const resized = proportionLockRef.current ? patchWithKeptProportions(inspected, patch, options?.resizeAxis) : patch;
            onUpdateShape(selectedShape.id, patchWithResizeAnchor(inspected, resized, options?.resizeAxis, lastResizeAnchorRef.current));
          }}
          proportionLock={proportionLock}
          onProportionLockChange={changeProportionLock}
          onBentTubeSegmentChange={changeBentTubeSegment}
          onShapeDefaultsChange={(kind, entry) => setWorkspace((current) => ({ ...current, shapeCustomizations: withShapeDefaults(current.shapeCustomizations, kind, entry) }))}
          onSnapChange={chooseSnapGrid}
          onSnapOpenChange={setSnapOpen}
          onObjectSnapChange={changeObjectSnap}
          onEditSketch={selectedShape.sketchProfile ? onEditSketch : undefined}
          onOpenGroup={selectedShape.groupedShapes?.length && onOpenGroup ? () => onOpenGroup(selectedShape.id) : undefined}
          canSeparateParts={canSeparateParts}
          onSeparateParts={onSeparateParts}
          onWrapAroundCylinder={onWrapAroundCylinder}
          onLayerText={onLayerText}
          onTextTags={onTextTags}
          textLayerStack={textLayerStack}
          onInteractionActiveChange={onInteractionActiveChange}
          onSnapGridAwayChange={setInspectorSnapGridAway}
        />
      ) : null}

      {selectedIds.length > 1 && !splitActive && !modifierActive && !tapeMode && !tapeDeleteMode && !tapeMoveMode && onSelectionHole && onSelectionColor && onSelectionLock ? (
        <SelectionInspector
          shapes={shapes.filter((shape) => selectedIds.includes(shape.id))}
          onSetHole={onSelectionHole}
          onSetColor={onSelectionColor}
          onToggleLocked={onSelectionLock}
          onInteractionActiveChange={onInteractionActiveChange}
        />
      ) : null}

      {!selectedShape || inspectorSnapGridAway ? (
        <div className="grid-settings">
          <SnapGridControl
            units={workspace.units}
            customGrids={workspace.customSnapGrids}
            snap={snap}
            snapOpen={snapOpen}
            onSnapChange={chooseSnapGrid}
            onSnapOpenChange={setSnapOpen}
            objectSnap={workspace.objectSnap}
            onObjectSnapChange={changeObjectSnap}
          />
        </div>
      ) : null}

      {settingsOpen ? (
        <WorkspaceSettingsModal
          workspace={workspace}
          snap={snap}
          themePreference={themePreference}
          moveDimensionsEnabled={moveDimensionsEnabled}
          originDimensionsEnabled={originDimensionsEnabled}
          startInPerspective={startInPerspective}
          onWorkspaceChange={setWorkspace}
          onSnapChange={chooseSnapGrid}
          onThemePreferenceChange={onThemePreferenceChange}
          onMoveDimensionsEnabledChange={changeMoveDimensionsEnabled}
          onOriginDimensionsEnabledChange={changeOriginDimensionsEnabled}
          onStartInPerspectiveChange={changeStartInPerspective}
          onMakeDefault={makeWorkspaceDefault}
          onClose={() => setSettingsOpen(false)}
        />
      ) : null}

      {tapeClearPending ? (
        <section
          className="dashboard-confirm-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-tape-title"
          onKeyDown={(event) => {
            // Escape only closes the question, not the tape measure behind it.
            if (event.key !== "Escape") return;
            event.preventDefault();
            event.stopPropagation();
            setTapeClearPending(false);
          }}
        >
          <div className="dashboard-confirm-dialog">
            <header>
              <strong id="clear-tape-title">{t("confirm.clearTapeTitle")}</strong>
              <button type="button" aria-label={t("confirm.clearTapeCancel")} onClick={() => setTapeClearPending(false)}>
                <X size={18} />
              </button>
            </header>
            <p>{t("confirm.clearTapeBody")}</p>
            <div className="dashboard-confirm-actions">
              <button className="dashboard-confirm-cancel" type="button" autoFocus onClick={() => setTapeClearPending(false)}>
                {t("confirm.cancel")}
              </button>
              <button className="dashboard-confirm-delete" type="button" onClick={confirmClearTape}>
                {t("confirm.delete")}
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}

function createThreeScene(host: HTMLDivElement): ThreeState {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: false, stencil: true });
  renderer.localClippingEnabled = true;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(host.clientWidth, host.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = DEFAULT_WORKSPACE.showShadows;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#f8fbfc");

  const camera = new THREE.PerspectiveCamera(CAMERA_FOV, host.clientWidth / Math.max(1, host.clientHeight), 0.1, 6000);
  camera.layers.enable(RENDER_LAYER_SHAPES);
  camera.layers.enable(RENDER_LAYER_HELPERS);
  camera.layers.enable(RENDER_LAYER_MODIFIERS);
  camera.layers.enable(RENDER_LAYER_PREVIEWS);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.58;
  controls.zoomSpeed = orbitControlsZoomSpeed(DEFAULT_WORKPLANE_WORKSPACE.zoomSpeed);
  controls.panSpeed = 0.65;
  controls.screenSpacePanning = true;
  controls.zoomToCursor = true;
  controls.mouseButtons = {
    LEFT: null,
    MIDDLE: THREE.MOUSE.PAN,
    RIGHT: THREE.MOUSE.ROTATE,
  };
  controls.minDistance = CAMERA_MIN_DISTANCE;
  controls.maxDistance = CAMERA_MAX_DISTANCE;
  // Allow the documented OrbitControls pole limits so Top and Bottom views can
  // settle on the vertical axis instead of being held roughly 3.4 degrees off it.
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = Math.PI;
  controls.target.copy(CAMERA_TARGET);

  const ambient = new THREE.HemisphereLight("#ffffff", "#d6edf5", 2.1);
  scene.add(ambient);

  const key = new THREE.DirectionalLight("#ffffff", 3.1);
  key.position.set(70, 130, 75);
  key.castShadow = true;
  key.shadow.camera.left = -130;
  key.shadow.camera.right = 130;
  key.shadow.camera.top = 130;
  key.shadow.camera.bottom = -130;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.00008;
  key.shadow.normalBias = 0.045;
  scene.add(key);

  const fill = new THREE.DirectionalLight("#c8f4ff", 1.2);
  fill.position.set(-95, 45, -60);
  scene.add(fill);

  const workplaneLayer = new THREE.Group();
  workplaneLayer.name = "Workplane";
  workplaneLayer.layers.set(RENDER_LAYER_WORKPLANE);
  const workplanePreviewLayer = new THREE.Group();
  workplanePreviewLayer.name = "WorkplanePreview";
  workplanePreviewLayer.layers.set(RENDER_LAYER_PREVIEWS);
  workplanePreviewLayer.visible = false;
  const shapeLayer = new THREE.Group();
  shapeLayer.name = "Shapes";
  shapeLayer.layers.set(RENDER_LAYER_SHAPES);
  const helperLayer = new THREE.Group();
  helperLayer.name = "SelectionHelpers";
  helperLayer.layers.set(RENDER_LAYER_HELPERS);
  const splitLayer = new THREE.Group();
  splitLayer.name = "SplitPlane";
  splitLayer.layers.set(RENDER_LAYER_PREVIEWS);
  const transformGuideLayer = new THREE.Group();
  transformGuideLayer.name = "TransformGuides";
  transformGuideLayer.layers.set(RENDER_LAYER_HELPERS);
  const moveDimensionLayer = new THREE.Group();
  moveDimensionLayer.name = "MoveDimensions";
  moveDimensionLayer.layers.set(RENDER_LAYER_HELPERS);
  const originDimensionLayer = new THREE.Group();
  originDimensionLayer.name = "OriginDimensions";
  originDimensionLayer.layers.set(RENDER_LAYER_HELPERS);
  const modifierLayer = new THREE.Group();
  modifierLayer.name = "EdgeModifier";
  modifierLayer.layers.set(RENDER_LAYER_MODIFIERS);
  scene.add(workplaneLayer, workplanePreviewLayer, shapeLayer, helperLayer, splitLayer, transformGuideLayer, moveDimensionLayer, originDimensionLayer, modifierLayer);

  const raycaster = new THREE.Raycaster();
  raycaster.params.Line = { threshold: 1.15 };
  (raycaster as THREE.Raycaster & { firstHitOnly?: boolean }).firstHitOnly = true;
  const pointer = new THREE.Vector2();
  const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  const resize = () => {
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    renderer.setSize(width, height);
    updateCameraViewport(state.camera, width, height);
    [state.transformGuideLayer, state.moveDimensionLayer, state.originDimensionLayer].forEach((layer) => {
      layer.traverse((child) => {
        const material = (child as THREE.Mesh).material;
        const materials = Array.isArray(material) ? material : material ? [material] : [];
        materials.forEach((candidate) => {
          if (candidate instanceof LineMaterial) {
            candidate.resolution.set(width, height);
          }
        });
      });
    });
    state.needsRender = true;
  };

  const state: ThreeState = {
    renderer,
    scene,
    camera,
    controls,
    workplaneLayer,
    workplanePreviewLayer,
    shapeLayer,
    helperLayer,
    splitLayer,
    transformGuideLayer,
    moveDimensionLayer,
    originDimensionLayer,
    modifierLayer,
    shapeRecords: new Map<string, ShapeRenderRecord>(),
    officialShapeLayerActive: false,
    raycaster,
    pointer,
    dragPlane,
    animationId: 0,
    needsRender: true,
    wasCameraMoving: false,
    lastOverlaySync: 0,
    lastViewCubeSync: 0,
    rotationHandleSides: null,
    sectionPlane: null,
    sectionPlaneHelper: null,
    lights: { ambient, key, fill },
    disposeInteractionListeners: () => {},
    resize,
  };
  const requestRender = () => {
    state.needsRender = true;
  };
  /*
   * Pointers that steer the camera right now. A mouse button let go outside
   * the window never sends its pointerup on a Mac, and the controls went on
   * panning or turning with the next move, the plate "hanging" on the mouse
   * until another middle click (forum). So a move without that button held,
   * or the window losing focus, ends the drag as the missing pointerup would.
   */
  const cameraPointers = new Map<number, PointerEvent>();
  const endCameraDrag = (pointerId: number) => {
    const started = cameraPointers.get(pointerId);
    cameraPointers.delete(pointerId);
    const PointerEventConstructor = renderer.domElement.ownerDocument.defaultView?.PointerEvent;
    if (!started || !PointerEventConstructor) return;
    renderer.domElement.dispatchEvent(new PointerEventConstructor("pointerup", {
      bubbles: true,
      cancelable: true,
      pointerId,
      pointerType: started.pointerType,
      isPrimary: started.isPrimary,
      button: started.button,
      buttons: 0,
      clientX: started.clientX,
      clientY: started.clientY,
    }));
  };
  const releaseLostCameraDrags = (event: PointerEvent) => {
    cameraPointers.forEach((started, pointerId) => {
      // `buttons` bit for the button that started it: left 1, right 2, middle 4.
      const bit = started.button === 1 ? 4 : started.button === 2 ? 2 : 1;
      if (event.pointerId === pointerId && (event.buttons & bit) === 0) endCameraDrag(pointerId);
    });
  };
  const releaseAllCameraDrags = () => {
    [...cameraPointers.keys()].forEach(endCameraDrag);
  };
  const configureLayerlingMouseButtons = (event: PointerEvent) => {
    // A pen (graphics tablet) steers the camera like a mouse: its barrel button is button 2.
    if (event.pointerType !== "touch" && (event.button === 1 || event.button === 2 || (event.button === 0 && (event.ctrlKey || event.metaKey)))) {
      cameraPointers.set(event.pointerId, event);
    }
    controls.mouseButtons.LEFT = event.button === 0 && (event.ctrlKey || event.metaKey) ? THREE.MOUSE.PAN : null;
    controls.mouseButtons.MIDDLE = THREE.MOUSE.PAN;
    controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
  };
  const resetLayerlingMouseButtons = (event?: PointerEvent) => {
    if (event) cameraPointers.delete(event.pointerId);
    controls.mouseButtons.LEFT = null;
    controls.mouseButtons.MIDDLE = THREE.MOUSE.PAN;
    controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
  };
  const preventContextMenu = (event: MouseEvent) => {
    event.preventDefault();
  };
  /**
   * Safaris eigene Zwei-Finger-Geste abwenden.
   *
   * Seit iOS 10 laesst Safari das Aufziehen der Seite zu, was auch immer im
   * Viewport-Kopf steht - `user-scalable=no` wird dort absichtlich uebergangen.
   * Bleibt nur, `gesturestart` und seine Geschwister abzulehnen; sonst nimmt
   * der Browser das Spreizen fuer sich und bricht die Zeigerereignisse ab,
   * bevor die Kamera sie sieht. Auf allem ausser Safari gibt es diese
   * Ereignisse gar nicht.
   */
  const preventSafariGesture = (event: Event) => {
    if (event.cancelable) event.preventDefault();
  };
  const SAFARI_GESTURES = ["gesturestart", "gesturechange", "gestureend"] as const;
  const pullPivotToSurface = (event: WheelEvent) => {
    if (event.deltaY >= 0) return;
    const rect = renderer.domElement.getBoundingClientRect();
    movePivotToDepthUnder(state, ((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
  };
  controls.addEventListener("change", requestRender);
  SAFARI_GESTURES.forEach((name) => renderer.domElement.addEventListener(name, preventSafariGesture));
  renderer.domElement.addEventListener("pointerdown", configureLayerlingMouseButtons, { capture: true });
  renderer.domElement.addEventListener("pointerup", resetLayerlingMouseButtons);
  renderer.domElement.addEventListener("pointercancel", resetLayerlingMouseButtons);
  renderer.domElement.addEventListener("contextmenu", preventContextMenu);
  renderer.domElement.addEventListener("wheel", requestRender, { passive: true });
  renderer.domElement.addEventListener("wheel", pullPivotToSurface, { passive: true, capture: true });
  renderer.domElement.addEventListener("pointerdown", requestRender);
  const ownWindow = renderer.domElement.ownerDocument.defaultView;
  ownWindow?.addEventListener("pointermove", releaseLostCameraDrags, { capture: true });
  ownWindow?.addEventListener("blur", releaseAllCameraDrags);
  state.disposeInteractionListeners = () => {
    ownWindow?.removeEventListener("pointermove", releaseLostCameraDrags, { capture: true });
    ownWindow?.removeEventListener("blur", releaseAllCameraDrags);
    renderer.domElement.removeEventListener("wheel", pullPivotToSurface, { capture: true });
    controls.removeEventListener("change", requestRender);
    renderer.domElement.removeEventListener("pointerdown", configureLayerlingMouseButtons, { capture: true });
    renderer.domElement.removeEventListener("pointerup", resetLayerlingMouseButtons);
    renderer.domElement.removeEventListener("pointercancel", resetLayerlingMouseButtons);
    renderer.domElement.removeEventListener("contextmenu", preventContextMenu);
    renderer.domElement.removeEventListener("wheel", requestRender);
    renderer.domElement.removeEventListener("pointerdown", requestRender);
    SAFARI_GESTURES.forEach((name) => renderer.domElement.removeEventListener(name, preventSafariGesture));
  };
  rebuildWorkplane(state, DEFAULT_WORKSPACE);
  return state;
}

function resetCamera(state: ThreeState) {
  state.camera.up.set(0, 1, 0);
  state.camera.position.copy(CAMERA_HOME);
  state.controls.target.copy(CAMERA_TARGET);
  if (state.camera instanceof THREE.OrthographicCamera) {
    state.camera.zoom = 1;
    const distance = CAMERA_HOME.distanceTo(CAMERA_TARGET);
    const halfHeight = distance * Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV / 2));
    const canvas = state.renderer.domElement;
    updateOrthographicFrustum(state.camera, canvas.clientWidth / Math.max(1, canvas.clientHeight), halfHeight);
  } else {
    state.camera.zoom = 1;
  }
  state.camera.lookAt(CAMERA_TARGET);
  state.camera.updateProjectionMatrix();
  state.controls.update();
}

function updateCameraViewport(
  camera: THREE.PerspectiveCamera | THREE.OrthographicCamera,
  width: number,
  height: number,
) {
  const aspect = width / Math.max(1, height);
  if (camera instanceof THREE.PerspectiveCamera) {
    camera.aspect = aspect;
  } else {
    const halfHeight = Math.max(0.001, (camera.top - camera.bottom) / 2);
    updateOrthographicFrustum(camera, aspect, halfHeight);
    return;
  }
  camera.updateProjectionMatrix();
}

function updateOrthographicFrustum(camera: THREE.OrthographicCamera, aspect: number, halfHeight: number) {
  camera.left = -halfHeight * aspect;
  camera.right = halfHeight * aspect;
  camera.top = halfHeight;
  camera.bottom = -halfHeight;
  camera.updateProjectionMatrix();
}

type CameraView = {
  orthographic: boolean;
  position: [number, number, number];
  target: [number, number, number];
  up: [number, number, number];
  zoom: number;
};

/** Where the camera looked, per design, while the view was taken down for a sketch (#150). */
const rememberedCameraViews = new Map<string, CameraView>();

function cameraViewOf(state: ThreeState): CameraView {
  return {
    orthographic: state.camera instanceof THREE.OrthographicCamera,
    position: state.camera.position.toArray() as [number, number, number],
    target: state.controls.target.toArray() as [number, number, number],
    up: state.camera.up.toArray() as [number, number, number],
    zoom: state.camera.zoom,
  };
}

function applyCameraView(state: ThreeState, view: CameraView) {
  state.camera.up.fromArray(view.up);
  state.camera.position.fromArray(view.position);
  state.controls.target.fromArray(view.target);
  state.camera.zoom = view.zoom;
  state.camera.lookAt(state.controls.target);
  state.camera.updateProjectionMatrix();
  fitCameraDepthRange(state.camera, state.controls.target);
  state.controls.update();
  state.needsRender = true;
}

function toggleCameraProjection(state: ThreeState) {
  const current = state.camera;
  const target = state.controls.target;
  const canvas = state.renderer.domElement;
  const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
  const offset = current.position.clone().sub(target);
  const direction = offset.lengthSq() > 0
    ? offset.clone().normalize()
    : CAMERA_HOME.clone().sub(CAMERA_TARGET).normalize();
  let next: THREE.PerspectiveCamera | THREE.OrthographicCamera;

  if (current instanceof THREE.PerspectiveCamera) {
    const visibleHalfHeight = Math.max(
      0.001,
      offset.length() * Math.tan(THREE.MathUtils.degToRad(current.getEffectiveFOV() / 2)),
    );
    next = new THREE.OrthographicCamera(
      -visibleHalfHeight * aspect,
      visibleHalfHeight * aspect,
      visibleHalfHeight,
      -visibleHalfHeight,
      current.near,
      current.far,
    );
    next.position.copy(current.position);
  } else {
    const visibleHalfHeight = Math.max(0.001, (current.top - current.bottom) / (2 * current.zoom));
    const distance = clamp(
      visibleHalfHeight / Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV / 2)),
      CAMERA_MIN_DISTANCE,
      CAMERA_MAX_DISTANCE,
    );
    next = new THREE.PerspectiveCamera(CAMERA_FOV, aspect, current.near, current.far);
    next.position.copy(target).addScaledVector(direction, distance);
  }

  if (next instanceof THREE.OrthographicCamera) {
    const range = orthographicZoomRange(next);
    state.controls.minZoom = range.min;
    state.controls.maxZoom = range.max;
  }
  next.up.copy(current.up);
  next.layers.mask = current.layers.mask;
  next.lookAt(target);
  next.updateProjectionMatrix();
  next.updateMatrixWorld();
  state.camera = next;
  state.controls.object = next;
  state.controls.update();
  state.needsRender = true;
}

function setCameraToViewFace(state: ThreeState, face: ViewCubeFace) {
  setCameraToViewDirection(state, viewFaceDirection(face));
}

/** Looks at the orbit target from a unit direction, keeping the distance: a face, an edge or a corner of the view cube. */
function setCameraToViewDirection(state: ThreeState, direction: THREE.Vector3) {
  const offset = state.camera.position.clone().sub(state.controls.target);
  const distance = clamp(offset.length(), CAMERA_MIN_DISTANCE, CAMERA_MAX_DISTANCE);

  state.camera.up.set(0, 1, 0);
  state.camera.position.copy(state.controls.target).add(direction.multiplyScalar(distance));
  state.camera.lookAt(state.controls.target);
  state.camera.updateProjectionMatrix();
  state.controls.update();
  state.needsRender = true;
}

/** Orbits the camera around the controls target for a drag on the view cube. */
function orbitCameraByDrag(state: ThreeState, dx: number, dy: number) {
  const offset = orbitOffsetByDrag(state.camera.position.clone().sub(state.controls.target), dx, dy);

  state.camera.up.set(0, 1, 0);
  state.camera.position.copy(state.controls.target).add(offset);
  state.camera.lookAt(state.controls.target);
  state.camera.updateProjectionMatrix();
  state.controls.update();
  state.needsRender = true;
}

function constrainCamera(state: ThreeState, workspace: WorkspaceSettings) {
  const target = state.controls.target;
  const previousTarget = target.clone();
  target.x = clamp(target.x, -workspace.width / 2, workspace.width / 2);
  target.y = clamp(target.y, CAMERA_MIN_TARGET_Y, CAMERA_MAX_TARGET_Y);
  target.z = clamp(target.z, -workspace.depth / 2, workspace.depth / 2);

  const targetShift = target.clone().sub(previousTarget);
  if (targetShift.lengthSq() > 0) {
    state.camera.position.add(targetShift);
    state.camera.updateProjectionMatrix();
  }
}

function syncViewCube(state: ThreeState, cube: HTMLDivElement | null) {
  if (!cube) {
    return;
  }

  const { pitch, yaw } = viewCubeAngles(state.camera.position.clone().sub(state.controls.target));
  cube.style.transform = `rotateX(${-pitch}deg) rotateY(${-yaw}deg)`;
}

function setObjectRenderLayer(object: THREE.Object3D, layer: number) {
  object.traverse((child) => child.layers.set(layer));
}

function freezeStaticObjectMatrices(object: THREE.Object3D) {
  object.traverse((child) => {
    child.updateMatrix();
    child.matrixAutoUpdate = false;
  });
  object.updateMatrixWorld(true);
}

function refreshFrozenObjectMatrix(object: THREE.Object3D) {
  object.updateMatrix();
  object.updateMatrixWorld(true);
}

function rebuildWorkplane(
  state: ThreeState | null,
  workspace: WorkspaceSettings,
  theme: ResolvedAppTheme = "light",
  placementWorkplane: PlacementWorkplane = horizontalPlacementWorkplane(),
  projectName = "",
) {
  if (!state) {
    return;
  }

  const palette = workplaneThemePalette(theme, workspace.background, workspace.gridColor, state.palette, workspace.surfaceColor);
  disposeChildren(state.workplaneLayer);
  state.scene.background = new THREE.Color(palette.sceneBackground);
  // Fast mode turns shadows, edge lines and camera inertia off together, and draws fewer pixels.
  const view = effectiveViewSettings(workspace);
  state.renderer.shadowMap.enabled = view.showShadows;
  state.controls.enableDamping = view.cameraInertia;
  const pixelRatio = viewPixelRatio(workspace, window.devicePixelRatio);
  if (state.renderer.getPixelRatio() !== pixelRatio) state.renderer.setPixelRatio(pixelRatio);
  const lightLevels = sceneLightLevels(workspace.shadeContrast);
  state.lights.ambient.intensity = lightLevels.ambient;
  state.lights.key.intensity = lightLevels.key;
  state.lights.fill.intensity = lightLevels.fill;
  state.lights.key.shadow.intensity = workspace.shadowStrength / 100;
  state.lights.key.shadow.radius = shadowBlurRadius(workspace.shadowSoftness);
  const keyPosition = keyLightPosition(workspace.lightAzimuth, workspace.lightElevation);
  state.lights.key.position.set(keyPosition.x, keyPosition.y, keyPosition.z);
  // The fill light stays opposite the main light, so the side facing away is not left black.
  const fillPosition = fillLightPosition(workspace.lightAzimuth);
  state.lights.fill.position.set(fillPosition.x, fillPosition.y, fillPosition.z);
  state.needsRender = true;
  state.controls.zoomSpeed = orbitControlsZoomSpeed(workspace.zoomSpeed);

  const activeIsBase = placementWorkplaneIsBase(placementWorkplane);
  // A workplane lying on the plate shares its plane, so the plate drops its grid (#178).
  const plateOutlineOnly = !activeIsBase && placementWorkplaneLiesOnBase(placementWorkplane);
  const addPlane = (workplane: PlacementWorkplane, muted: boolean, showMarker: boolean, outlineOnly = false) => {
    const group = new THREE.Group();
    group.name = muted ? "ReferenceWorkplane" : "ActiveWorkplane";
    const surface = new THREE.Mesh(
      new THREE.PlaneGeometry(workspace.width, workspace.depth),
      new THREE.MeshStandardMaterial({
        color: muted
          ? theme === "dark" ? "#59646b" : "#b8c0c5"
          : palette.surface.color,
        transparent: true,
        opacity: muted ? (theme === "dark" ? 0.17 : 0.22) : palette.surface.opacity,
        roughness: 0.92,
        side: THREE.DoubleSide,
        // A face-on orthographic view interpolates this large coplanar quad
        // slightly in front of the grid, so part of the grid fails the depth
        // test. Sixteen depth units holds the plate behind those lines.
        polygonOffset: true,
        polygonOffsetFactor: 1,
        // Under a workplane on the same level, the plate stays behind its surface too.
        polygonOffsetUnits: outlineOnly ? 48 : 16,
      }),
    );
    surface.name = muted ? "WorkplaneBaseReference" : "WorkplaneBase";
    surface.rotation.x = -Math.PI / 2;
    surface.receiveShadow = view.showShadows && !muted;
    group.add(surface);

    const lineColor = muted ? theme === "dark" ? "#76828a" : "#99a3aa" : workspace.gridColor;
    const majorLineColor = muted ? "" : workspace.gridMajorColor;
    if (outlineOnly) {
      group.add(createGridLines(
        workspace.width,
        workspace.depth,
        workplaneGridLayout(workspace),
        theme,
        lineColor,
        state.palette,
        true,
        majorLineColor,
      ));
    } else if (workspace.showGrid) {
      group.add(createGridLines(
        workspace.width,
        workspace.depth,
        workplaneGridLayout(workspace),
        theme,
        lineColor,
        state.palette,
        false,
        majorLineColor,
      ));
      const labelPalette = workplaneGridPalette(theme, lineColor, state.palette).major;
      // The design's name in the near left corner, so a screenshot of the scene
      // says what it shows - unless it was switched off as a distraction (#192).
      const label = workspace.showPlateLabels === false ? null : createWorkplaneLabel(
        workspace.width,
        workspace.depth,
        labelPalette.color,
        muted ? labelPalette.opacity * 0.5 : labelPalette.opacity,
        projectName,
        "",
        { outline: muted ? undefined : palette.surface.color },
      );
      if (label) {
        group.add(label);
      }
      // Only on the real plate, and hidden together with the design name.
      const printer = muted || workspace.showPlateLabels === false ? null : printerPresetById(workspace.printer);
      if (printer) {
        const printerLabel = createWorkplaneLabel(
          workspace.width,
          workspace.depth,
          labelPalette.color,
          labelPalette.opacity,
          `${printer.vendor} ${printer.model}`,
          `${printer.width} × ${printer.depth} × ${printer.height} mm`,
          { align: "right", outline: palette.surface.color },
        );
        if (printerLabel) {
          printerLabel.name = "WorkplanePrinterLabel";
          group.add(printerLabel);
        }
      }
    }
    if (!muted && workspace.showAxes) {
      group.add(createAxisArrows(workspace.width, workspace.depth));
    }
    if (showMarker) {
      const markerMaterial = new THREE.MeshBasicMaterial({
        color: theme === "dark" ? "#d7f4ff" : "#17405c",
        depthTest: false,
        transparent: true,
        opacity: 0.9,
      });
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 4, 12), markerMaterial);
      stem.position.y = 2.2;
      const arrow = new THREE.Mesh(new THREE.ConeGeometry(1.35, 3.2, 18), markerMaterial);
      arrow.position.y = 5.7;
      const marker = new THREE.Group();
      marker.name = "WorkplaneNormal";
      marker.add(stem, arrow);
      group.add(marker);
    }
    group.position.set(workplane.origin.x, workplane.origin.y, workplane.origin.z);
    group.quaternion.copy(placementWorkplaneQuaternion(workplane));
    state.workplaneLayer.add(group);
  };

  addPlane(horizontalPlacementWorkplane(), !activeIsBase, false, plateOutlineOnly);
  if (!activeIsBase) {
    addPlane(placementWorkplane, false, true);
  }
  state.workplaneLayer.position.set(0, 0, 0);
  state.workplaneLayer.quaternion.identity();
  setObjectRenderLayer(state.workplaneLayer, RENDER_LAYER_WORKPLANE);
  freezeStaticObjectMatrices(state.workplaneLayer);
}

function syncWorkplaneHoverPreview(
  state: ThreeState | null,
  workplane: PlacementWorkplane | null,
  workspace: WorkspaceSettings,
  theme: ResolvedAppTheme,
) {
  if (!state) return;
  let layer = state.workplanePreviewLayer;
  if (!layer) {
    layer = new THREE.Group();
    layer.name = "WorkplanePreview";
    layer.layers.set(RENDER_LAYER_PREVIEWS);
    layer.visible = false;
    state.workplanePreviewLayer = layer;
    state.scene.add(layer);
  }
  if (!workplane) {
    layer.visible = false;
    state.needsRender = true;
    return;
  }

  const previewSize = clamp(workspace.gridBlockSize * 6, 18, 42);
  const signature = `${theme}:${workspace.gridBlockSize}:${previewSize}`;
  if (layer.userData.previewSignature !== signature) {
    disposeChildren(layer);
    layer.userData.previewSignature = signature;
    const color = theme === "dark" ? "#69d9ff" : "#079bc6";
    const patch = new THREE.Mesh(
      new THREE.PlaneGeometry(previewSize, previewSize),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
    );
    patch.rotation.x = -Math.PI / 2;
    patch.renderOrder = 950;
    layer.add(patch);

    const outlineMaterial = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });
    const half = previewSize / 2;
    const outlinePoints = [
      -half, WORKPLANE_LINE_ELEVATION, -half, half, WORKPLANE_LINE_ELEVATION, -half,
      half, WORKPLANE_LINE_ELEVATION, -half, half, WORKPLANE_LINE_ELEVATION, half,
      half, WORKPLANE_LINE_ELEVATION, half, -half, WORKPLANE_LINE_ELEVATION, half,
      -half, WORKPLANE_LINE_ELEVATION, half, -half, WORKPLANE_LINE_ELEVATION, -half,
    ];
    const outlineGeometry = new THREE.BufferGeometry();
    outlineGeometry.setAttribute("position", new THREE.Float32BufferAttribute(outlinePoints, 3));
    const outline = new THREE.LineSegments(outlineGeometry, outlineMaterial);
    outline.renderOrder = 951;
    layer.add(outline);

    const markerMaterial = new THREE.MeshBasicMaterial({
      color,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      opacity: 0.95,
    });
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 3.4, 12), markerMaterial);
    stem.position.y = 1.9;
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(1.15, 2.6, 16), markerMaterial);
    arrow.position.y = 4.7;
    const marker = new THREE.Group();
    marker.add(stem, arrow);
    marker.renderOrder = 952;
    layer.add(marker);
  }

  const normal = new THREE.Vector3(workplane.normal.x, workplane.normal.y, workplane.normal.z);
  layer.position.set(
    workplane.origin.x + normal.x * 0.04,
    workplane.origin.y + normal.y * 0.04,
    workplane.origin.z + normal.z * 0.04,
  );
  layer.quaternion.copy(placementWorkplaneQuaternion(workplane));
  layer.visible = true;
  setObjectRenderLayer(layer, RENDER_LAYER_PREVIEWS);
  layer.updateMatrixWorld(true);
  state.needsRender = true;
}

const WORKPLANE_LABEL_TEXTURE_WIDTH = 1024;
const WORKPLANE_LABEL_FONT_STACK = '"Avenir Next", Avenir, "Helvetica Neue", Arial, sans-serif';

/**
 * Flat label along the near edge of a workplane: the design's name on the
 * left, the chosen printer on the right.
 *
 * Drawn into a canvas rather than built from glyph geometry: it is a single
 * static string that never needs to be a solid, and a texture costs one quad.
 */
/**
 * Arrows for X, Y and Z at the plate's front left corner, in the frame of the workplane they sit
 * on: X to the right, Y towards the front (as the Y field counts), Z up. They are flat-coloured,
 * never take a click, and the letters stay readable from every side.
 */
function createAxisArrows(width: number, depth: number) {
  const layout = axisArrowLayout(width, depth);
  const group = new THREE.Group();
  group.name = "WorkplaneAxisArrows";
  group.position.set(layout.x, 0.06, layout.z);
  const headLength = Math.min(layout.length * 0.3, 5);
  const shaftRadius = Math.max(0.3, layout.length * 0.022);
  const headRadius = shaftRadius * 3;
  const axes = [
    { letter: "X", color: AXIS_ARROW_COLORS.x, direction: new THREE.Vector3(1, 0, 0) },
    // Y counts towards the back, right-handed (#182): inside, that is minus z.
    { letter: "Y", color: AXIS_ARROW_COLORS.y, direction: new THREE.Vector3(0, 0, -1) },
    { letter: "Z", color: AXIS_ARROW_COLORS.z, direction: new THREE.Vector3(0, 1, 0) },
  ];
  axes.forEach(({ letter, color, direction }) => {
    const arrow = new THREE.Group();
    arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    const material = new THREE.MeshBasicMaterial({ color });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(shaftRadius, shaftRadius, layout.length - headLength, 14), material);
    shaft.position.y = (layout.length - headLength) / 2;
    const head = new THREE.Mesh(new THREE.ConeGeometry(headRadius, headLength, 20), material);
    head.position.y = layout.length - headLength / 2;
    arrow.add(shaft, head);
    group.add(arrow);

    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext("2d");
    if (context) {
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.font = `700 46px ${WORKPLANE_LABEL_FONT_STACK}`;
      context.lineJoin = "round";
      context.lineWidth = 8;
      context.strokeStyle = "rgba(255, 255, 255, 0.92)";
      context.strokeText(letter, 32, 34);
      context.fillStyle = color;
      context.fillText(letter, 32, 34);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      // Hidden behind a body like the arrow itself; it showed through every part in front of it.
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
      const size = Math.max(4, layout.length * 0.3);
      sprite.scale.set(size, size, 1);
      sprite.position.copy(direction.clone().multiplyScalar(layout.length + size * 0.65));
      sprite.renderOrder = 5;
      group.add(sprite);
    }
  });
  // The arrows are a picture, not a body: nothing under the pointer may stop at them.
  group.traverse((object) => {
    object.raycast = () => undefined;
  });
  return group;
}

function createWorkplaneLabel(
  width: number,
  depth: number,
  color: string,
  opacity: number,
  title: string,
  subtitle = "",
  { align = "left", outline }: { align?: "left" | "right"; outline?: string } = {},
) {
  const layout = workplaneLabelLayout(width, depth);
  if (!title.trim() || layout.width <= 0 || layout.height <= 0) {
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = WORKPLANE_LABEL_TEXTURE_WIDTH;
  canvas.height = Math.round(WORKPLANE_LABEL_TEXTURE_WIDTH / WORKPLANE_LABEL_ASPECT);
  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = color;
  // Set against the left edge and low in the texture, so the caption keeps to
  // the corner of the plane instead of floating in the middle of empty texture.
  context.textAlign = align;
  const textInset = canvas.width * 0.015;
  const textLeft = align === "right" ? canvas.width - textInset : textInset;
  const textWidth = canvas.width - textInset * 2;
  // A rim in the colour of the plate keeps the grid lines away from the
  // letters, so the caption stays readable where it crosses them.
  context.lineJoin = "round";
  const drawText = (text: string, weight: number, size: number, y: number, alpha = 1) => {
    context.font = `${weight} ${size}px ${WORKPLANE_LABEL_FONT_STACK}`;
    // A long name gets smaller rather than squeezed.
    const measured = context.measureText(text).width;
    if (measured > textWidth) {
      size = Math.floor((size * textWidth) / measured);
      context.font = `${weight} ${size}px ${WORKPLANE_LABEL_FONT_STACK}`;
    }
    if (outline) {
      context.strokeStyle = outline;
      context.lineWidth = size * 0.22;
      context.strokeText(text, textLeft, y, textWidth);
    }
    context.globalAlpha = alpha;
    context.fillText(text, textLeft, y, textWidth);
    context.globalAlpha = 1;
  };
  const caption = subtitle.trim();
  // Every name sits on the same baseline near the bottom, so the design name
  // and the printer line up along the front edge.
  context.textBaseline = "alphabetic";
  const baseline = canvas.height * 0.8;
  if (caption) {
    // Two lines: the detail small on top, the name underneath.
    drawText(caption, 500, Math.round(canvas.height * 0.26), canvas.height * 0.3, 0.78);
    drawText(title, 600, Math.round(canvas.height * 0.46), baseline);
  } else {
    drawText(title.trim(), 700, Math.round(canvas.height * 0.68), baseline);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(layout.width, layout.height),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity,
      // Sits on the plane it belongs to, but must never hide a model standing
      // on that plane, so it writes no depth and still tests against it.
      depthWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
  );
  label.name = "WorkplaneLabel";
  // Lies flat, reading along +x with its top towards the far edge, which is
  // upright from the default camera, and tucked into the near left corner.
  label.rotation.x = -Math.PI / 2;
  // The printer sits in the near right corner, mirrored from the design name.
  label.position.set(align === "right" ? -layout.lateralOffset : layout.lateralOffset, WORKPLANE_LINE_ELEVATION + 0.01, layout.depthOffset);
  label.renderOrder = 2;
  return label;
}

function createGridLines(
  width = WORKPLANE_WIDTH,
  depth = WORKPLANE_DEPTH,
  layout: WorkplaneGridLayout = workplaneGridLayout(DEFAULT_WORKSPACE),
  theme: ResolvedAppTheme = "light",
  gridColor = DEFAULT_WORKSPACE.gridColor,
  paletteName: AppThemePalette = "default",
  outlineOnly = false,
  majorColor = "",
) {
  const group = new THREE.Group();
  const palette = workplaneThemePalette(theme, DEFAULT_WORKSPACE.background, gridColor, paletteName, undefined, majorColor).grid;
  const minor = new THREE.LineBasicMaterial({ ...palette.minor, transparent: true, depthWrite: false });
  const major = new THREE.LineBasicMaterial({ ...palette.major, transparent: true, depthWrite: false });
  const axis = new THREE.LineBasicMaterial({ ...palette.axis, transparent: true, depthWrite: false });
  const minorPoints: number[] = [];
  const majorPoints: number[] = [];
  const axisPoints: number[] = [];
  const borderPoints: number[] = [];
  const pushLine = (points: number[], from: [number, number, number], to: [number, number, number]) => {
    points.push(...from, ...to);
  };
  const pointsFor = (kind: "axis" | "major" | "minor") => (kind === "axis" ? axisPoints : kind === "major" ? majorPoints : minorPoints);
  // Every fine and darker line also gets a band on the plate, growing as you zoom in (#143).
  const minorBands: Array<[number, number, number, number]> = [];
  const majorBands: Array<[number, number, number, number]> = [];
  const bandsFor = (kind: "axis" | "major" | "minor") => (kind === "major" ? majorBands : kind === "minor" ? minorBands : null);
  for (const { coordinate: centeredX, kind } of outlineOnly ? [] : workplaneGridLines(width, layout)) {
    pushLine(pointsFor(kind), [centeredX, WORKPLANE_LINE_ELEVATION, -depth / 2], [centeredX, WORKPLANE_LINE_ELEVATION, depth / 2]);
    bandsFor(kind)?.push([centeredX, -depth / 2, centeredX, depth / 2]);
  }

  for (const { coordinate: centeredZ, kind } of outlineOnly ? [] : workplaneGridLines(depth, layout)) {
    pushLine(pointsFor(kind), [-width / 2, WORKPLANE_LINE_ELEVATION, centeredZ], [width / 2, WORKPLANE_LINE_ELEVATION, centeredZ]);
    bandsFor(kind)?.push([-width / 2, centeredZ, width / 2, centeredZ]);
  }

  const border = new THREE.LineBasicMaterial({ ...palette.border, transparent: true, depthWrite: false });
  pushLine(borderPoints, [-width / 2, WORKPLANE_LINE_ELEVATION, -depth / 2], [width / 2, WORKPLANE_LINE_ELEVATION, -depth / 2]);
  pushLine(borderPoints, [width / 2, WORKPLANE_LINE_ELEVATION, -depth / 2], [width / 2, WORKPLANE_LINE_ELEVATION, depth / 2]);
  pushLine(borderPoints, [width / 2, WORKPLANE_LINE_ELEVATION, depth / 2], [-width / 2, WORKPLANE_LINE_ELEVATION, depth / 2]);
  pushLine(borderPoints, [-width / 2, WORKPLANE_LINE_ELEVATION, depth / 2], [-width / 2, WORKPLANE_LINE_ELEVATION, -depth / 2]);

  group.add(linesFromPoints(minorPoints, minor));
  group.add(linesFromPoints(majorPoints, major));
  const gridBands = workplaneGridBandWidths(layout.step);
  // The darker lines first, so they stay whole where a fine line crosses them.
  if (majorBands.length) group.add(bandsFromSegments(majorBands, gridBands.major, palette.major, { order: 1 }));
  if (minorBands.length) group.add(bandsFromSegments(minorBands, gridBands.minor, palette.minor, { order: 1.5 }));
  group.add(linesFromPoints(axisPoints, axis));
  group.add(linesFromPoints(borderPoints, border));

  // A line is one pixel wide whatever the zoom, so the centre cross and the border also get
  // a narrow band on the plate: stronger, and growing as you zoom in, as in Tinkercad (#143).
  const axisBand = THREE.MathUtils.clamp(Math.min(width, depth) * 0.0012, 0.15, 1);
  const borderBand = axisBand * 2;
  const axisBands: Array<[number, number, number, number]> = outlineOnly ? [] : [
    [0, -depth / 2, 0, depth / 2],
    [-width / 2, 0, width / 2, 0],
  ];
  group.add(bandsFromSegments(axisBands, axisBand, palette.axis));
  // The border band lies inside the plate, so the plate keeps its size.
  const inset = borderBand / 2;
  group.add(bandsFromSegments([
    [-width / 2, -depth / 2 + inset, width / 2, -depth / 2 + inset],
    [-width / 2, depth / 2 - inset, width / 2, depth / 2 - inset],
    [-width / 2 + inset, -depth / 2, -width / 2 + inset, depth / 2],
    [width / 2 - inset, -depth / 2, width / 2 - inset, depth / 2],
  ], borderBand, palette.border));

  return group;
}

/** Flat bands of a width in millimetres along segments (x1, z1, x2, z2) on the plate. */
/**
 * `crossings`: where bands cross, each pixel is drawn once instead of the see-through colour
 * twice, which would leave a darker dot at every crossing of the grid. The band writes depth and
 * the next one at the same depth gives way; `order` decides which kind is drawn first and so
 * wins at a crossing.
 */
function bandsFromSegments(segments: Array<[number, number, number, number]>, bandWidth: number, look: { color: string; opacity: number }, crossings?: { order: number }) {
  const positions: number[] = [];
  for (const [x1, z1, x2, z2] of segments) {
    const length = Math.hypot(x2 - x1, z2 - z1) || 1;
    const nx = (-(z2 - z1) / length) * (bandWidth / 2);
    const nz = ((x2 - x1) / length) * (bandWidth / 2);
    const y = WORKPLANE_LINE_ELEVATION;
    positions.push(
      x1 - nx, y, z1 - nz, x2 - nx, y, z2 - nz, x2 + nx, y, z2 + nz,
      x1 - nx, y, z1 - nz, x2 + nx, y, z2 + nz, x1 + nx, y, z1 + nz,
    );
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const bands = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
    color: look.color,
    opacity: look.opacity,
    transparent: true,
    depthWrite: Boolean(crossings),
    depthFunc: crossings ? THREE.LessDepth : THREE.LessEqualDepth,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  }));
  bands.renderOrder = crossings?.order ?? 1;
  return bands;
}

function linesFromPoints(points: number[], material: THREE.LineBasicMaterial) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
  const lines = new THREE.LineSegments(geometry, material);
  lines.renderOrder = 1;
  return lines;
}

// The cut a hole makes in a body is drawn from depth textures rather than from a
// boolean. A hole fragment lies inside a body when it falls between the body's
// near and its far depth at that pixel, and a body fragment lies inside a hole
// the same way; four depth textures carry those bounds. Nothing runs on the CPU
// for it, so the preview keeps up with a shape while it is being dragged, and no
// result has to be cached or dropped when a gesture starts.
const CUT_PREVIEW_COLOR = 0x30363a;
const CUT_PREVIEW_OPACITY = 0.34;
// Window depth is not linear, so a bias in window units opens a gap where the cut
// meets the surface that grows as the view is pulled back. The band is widened by it
// rather than narrowed, so a hole flush with a face stays visible - the cutter pads
// by 0.05 the same way - and the bias only has to be big enough to break a tie.
const CUT_PREVIEW_DEPTH_BIAS = 1e-7;

type CutPreviewResources = {
  bodiesNear: THREE.WebGLRenderTarget;
  bodiesFar: THREE.WebGLRenderTarget;
  frontDepth: THREE.MeshBasicMaterial;
  backDepth: THREE.MeshBasicMaterial;
  // The hole shaded where it lies inside a body: what is going to be cut out,
  // drawn on the hole itself. Nothing has to know the shape of either body - only
  // whether a fragment sits between the near and the far depth of the other one.
  ink: THREE.ShaderMaterial;
  width: number;
  height: number;
};

let cutPreviewResources: CutPreviewResources | null = null;

function cutPreviewInkMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
    // Both sides, so the far wall of a hole that goes right through fills the cut.
    // The stencil keeps one layer per pixel, so the two walls cannot add up to a
    // darker ring.
    side: THREE.DoubleSide,
    stencilWrite: true,
    stencilFunc: THREE.NotEqualStencilFunc,
    stencilRef: 1,
    stencilFail: THREE.KeepStencilOp,
    stencilZFail: THREE.KeepStencilOp,
    stencilZPass: THREE.ReplaceStencilOp,
    uniforms: {
      nearDepth: { value: null },
      farDepth: { value: null },
      resolution: { value: new THREE.Vector2(1, 1) },
      // Written straight into the frame, so the tint keeps the values it was
      // given instead of being converted twice.
      tint: { value: new THREE.Color().setHex(CUT_PREVIEW_COLOR, THREE.LinearSRGBColorSpace) },
      opacity: { value: CUT_PREVIEW_OPACITY },
      bias: { value: CUT_PREVIEW_DEPTH_BIAS },
    },
    vertexShader: [
      "void main() {",
      "  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);",
      "}",
    ].join("\n"),
    fragmentShader: [
      "uniform sampler2D nearDepth;",
      "uniform sampler2D farDepth;",
      "uniform vec2 resolution;",
      "uniform vec3 tint;",
      "uniform float opacity;",
      "uniform float bias;",
      "void main() {",
      "  // Both sides are window-space depth, so they compare directly.",
      "  float depth = gl_FragCoord.z;",
      "  vec2 uv = gl_FragCoord.xy / resolution;",
      "  float near = texture2D(nearDepth, uv).r;",
      "  float far = texture2D(farDepth, uv).r;",
      "  if (depth < near - bias || depth > far + bias) {",
      "    discard;",
      "  }",
      "  gl_FragColor = vec4(tint, opacity);",
      "}",
    ].join("\n"),
  });
}

function cutPreviewDepthTarget(width: number, height: number) {
  const depthTexture = new THREE.DepthTexture(width, height);
  depthTexture.format = THREE.DepthFormat;
  depthTexture.type = THREE.UnsignedIntType;
  const target = new THREE.WebGLRenderTarget(width, height, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    depthBuffer: true,
    stencilBuffer: false,
    depthTexture,
  });
  target.texture.colorSpace = THREE.NoColorSpace;
  return target;
}

function disposeCutPreviewResources() {
  if (!cutPreviewResources) {
    return;
  }
  [cutPreviewResources.bodiesNear, cutPreviewResources.bodiesFar].forEach((target) =>
    target.dispose(),
  );
  [
    cutPreviewResources.frontDepth,
    cutPreviewResources.backDepth,
    cutPreviewResources.ink,
  ].forEach((material) => material.dispose());
  cutPreviewResources = null;
}

function cutPreviewResourcesFor(width: number, height: number) {
  if (
    cutPreviewResources &&
    cutPreviewResources.width === width &&
    cutPreviewResources.height === height
  ) {
    return cutPreviewResources;
  }
  disposeCutPreviewResources();
  cutPreviewResources = {
    bodiesNear: cutPreviewDepthTarget(width, height),
    bodiesFar: cutPreviewDepthTarget(width, height),
    frontDepth: new THREE.MeshBasicMaterial({
      colorWrite: false,
      depthWrite: true,
      depthTest: true,
      depthFunc: THREE.LessDepth,
      side: THREE.FrontSide,
    }),
    backDepth: new THREE.MeshBasicMaterial({
      colorWrite: false,
      depthWrite: true,
      depthTest: true,
      depthFunc: THREE.LessDepth,
      side: THREE.BackSide,
    }),
    ink: cutPreviewInkMaterial(),
    width,
    height,
  };
  return cutPreviewResources;
}

function drawCutPreviews(state: ThreeState) {
  const bodies: THREE.Object3D[] = [];
  const holes: THREE.Object3D[] = [];
  state.shapeRecords.forEach((record) => {
    const object = record.object;
    if (!object || record.shape.hidden || !object.visible) {
      return;
    }
    if (record.shape.hole) {
      holes.push(object);
    } else {
      bodies.push(object);
    }
  });
  if (bodies.length === 0 || holes.length === 0) {
    return;
  }

  const renderer = state.renderer;
  const scene = state.scene;
  const camera = state.camera;
  const frameTarget = renderer.getRenderTarget();
  const size = frameTarget
    ? new THREE.Vector2(frameTarget.width, frameTarget.height)
    : renderer.getDrawingBufferSize(new THREE.Vector2());
  const resources = cutPreviewResourcesFor(size.x, size.y);

  const shapes = [...bodies, ...holes];
  const wasVisible = new Map(shapes.map((object) => [object, object.visible] as const));
  const previousAutoClear = renderer.autoClear;
  const previousOverride = scene.overrideMaterial;
  const previousBackground = scene.background;
  const previousMask = camera.layers.mask;

  const renderSet = (visible: THREE.Object3D[]) => {
    const wanted = new Set(visible);
    shapes.forEach((object) => {
      object.visible = wanted.has(object);
    });
  };

  try {
    renderer.autoClear = false;
    camera.layers.set(RENDER_LAYER_SHAPES);
    // A scene background is repainted by every render() call, and this renders
    // the scene four more times; left alone it would wipe the frame.
    scene.background = null;

    // The section plane clips per material, and these are the preview's own: without
    // it the depth textures keep the geometry that was cut away, and the ink lands in
    // the removed half. Where the plane is gone the depth reads 1.0, which discards
    // the ink there by itself.
    const sectionPlane = state.sectionPlane ?? null;
    for (const material of [resources.frontDepth, resources.backDepth]) {
      if ((material.clippingPlanes?.[0] ?? null) !== sectionPlane) {
        material.clippingPlanes = sectionPlane ? [sectionPlane] : null;
        material.needsUpdate = true;
      }
    }

    const depthPass = (
      visible: THREE.Object3D[],
      material: THREE.Material,
      target: THREE.WebGLRenderTarget,
    ) => {
      renderSet(visible);
      renderer.setRenderTarget(target);
      renderer.clear(true, true, false);
      scene.overrideMaterial = material;
      renderer.render(scene, camera);
    };

    depthPass(bodies, resources.frontDepth, resources.bodiesNear);
    depthPass(bodies, resources.backDepth, resources.bodiesFar);

    // The hole is drawn once, over the frame, and shaded where it lies inside a
    // body. The stencil decides which of its fragments gets a pixel: one layer, so
    // the shading stays even wherever the hole turns back on itself.
    resources.ink.uniforms.nearDepth.value = resources.bodiesNear.depthTexture;
    resources.ink.uniforms.farDepth.value = resources.bodiesFar.depthTexture;
    (resources.ink.uniforms.resolution.value as THREE.Vector2).set(
      resources.width,
      resources.height,
    );
    renderSet(holes);
    renderer.setRenderTarget(frameTarget);
    renderer.clear(false, false, true);
    scene.overrideMaterial = resources.ink;
    renderer.render(scene, camera);
  } finally {
    shapes.forEach((object) => {
      object.visible = wasVisible.get(object) ?? true;
    });
    scene.overrideMaterial = previousOverride;
    scene.background = previousBackground;
    camera.layers.mask = previousMask;
    renderer.autoClear = previousAutoClear;
    renderer.setRenderTarget(frameTarget);
  }
}

function renderFrame(state: ThreeState) {
  state.renderer.render(state.scene, state.camera);
  drawCutPreviews(state);
}

function updateShapeObjectTransform(object: THREE.Group, shape: WorkplaneShape) {
  object.name = shape.name;
  object.userData.shapeId = shape.id;
  object.userData.tapeDimensions = [shapeWidth(shape), shape.height, shapeDepth(shape)] satisfies [number, number, number];
  object.userData.tapeTopologyKey = tapeShapeTopologyKey(shape);
  object.position.set(shape.x, (shape.elevation ?? 0) + shape.height / 2, shape.z);
  object.rotation.set(
    THREE.MathUtils.degToRad(shape.rotationX ?? 0),
    THREE.MathUtils.degToRad(shape.rotation),
    THREE.MathUtils.degToRad(shape.rotationZ ?? 0),
  );
  object.scale.set(mirrorSign(shape.mirrorX), mirrorSign(shape.mirrorY), mirrorSign(shape.mirrorZ));
  refreshFrozenObjectMatrix(object);
}

function syncShapeObjectDimensions(object: THREE.Group, shape: WorkplaneShape) {
  object.userData.tapeDimensions = [shapeWidth(shape), shape.height, shapeDepth(shape)] satisfies [number, number, number];
  object.userData.tapeTopologyKey = tapeShapeTopologyKey(shape);
  const surface = object.children.find((child): child is THREE.Mesh => child instanceof THREE.Mesh && Boolean(child.userData.shapeSurface));
  if (!surface) return;
  const width = shapeWidth(shape);
  const depth = shapeDepth(shape);
  let scale: THREE.Vector3 | null = null;
  let offsetX = 0;
  let offsetZ = 0;
  if (shape.importedMesh && !preservesEdgeTreatmentSize(shape)) {
    scale = new THREE.Vector3(
      width / Math.max(0.001, shape.importedMesh.baseWidth),
      shape.height / Math.max(0.001, shape.importedMesh.baseHeight),
      depth / Math.max(0.001, shape.importedMesh.baseDepth),
    );
  } else if (shape.kind === "box" && !(shape.radius && shape.radius > 0)) {
    scale = new THREE.Vector3(width, shape.height, depth);
  } else if (shape.kind === "cylinder" || shape.kind === "ellipse" || shape.kind === "polygon") {
    const fit = regularPolygonFootprintScale(width, depth, polygonSidesForShape(shape));
    scale = new THREE.Vector3(fit.x, shape.height, fit.z);
    offsetX = fit.offsetX;
    offsetZ = fit.offsetZ;
  } else if (shape.kind === "sphere") {
    scale = new THREE.Vector3(width / 2, shape.height / 2, depth / 2);
  }
  if (!scale) return;

  object.position.y = (shape.elevation ?? 0) + shape.height / 2;
  object.updateMatrix();
  surface.scale.copy(scale);
  // A twisted unit body already holds its stretch (taperGeometryForShape, addMesh).
  const stretchedBy = surface.geometry.userData.stretchedBy as [number, number, number] | undefined;
  if (stretchedBy) surface.scale.divide(new THREE.Vector3(...stretchedBy));
  // Ein Vieleck mit ungerader Seitenzahl liegt nicht mittig in seinem Rahmen.
  surface.position.set(offsetX, -shape.height / 2, offsetZ);
  surface.updateMatrix();
  object.children.forEach((child) => {
    if (!child.userData.shapeEdge) return;
    child.position.copy(surface.position);
    child.rotation.copy(surface.rotation);
    child.scale.copy(surface.scale);
    child.updateMatrix();
  });
  object.updateMatrixWorld(true);
}

function removeShapeDecorations(object: THREE.Group) {
  object.children
    .filter((child) => Boolean(child.userData.shapeDecoration))
    .forEach((child) => {
      object.remove(child);
      disposeObject(child);
    });
}

function syncShapeObjectAppearance(object: THREE.Group, shape: WorkplaneShape, selected: boolean, updateSurfaceMaterial: boolean, onTextureReady?: () => void) {
  object.userData.showEdges = selected;
  const groupedContent = object.children.find((child): child is THREE.Group => child instanceof THREE.Group && Boolean(child.userData.groupedShapeContent));
  if (groupedContent && shape.groupedShapes?.length && !shape.importedMesh) {
    shape.groupedShapes
      .filter((child) => !child.hidden)
      .forEach((child) => {
        const childObject = groupedContent.children.find((entry): entry is THREE.Group => entry instanceof THREE.Group && entry.userData.groupChildId === child.id);
        if (!childObject) return;
        const childShape = groupChildAppearance(shape, child);
        syncShapeObjectAppearance(childObject, childShape, selected, updateSurfaceMaterial, onTextureReady);
      });
    object.traverse((child) => {
      child.userData.shapeId = shape.id;
    });
    setObjectRenderLayer(object, RENDER_LAYER_SHAPES);
    freezeStaticObjectMatrices(object);
    return;
  }

  const surface = object.children.find((child): child is THREE.Mesh => child instanceof THREE.Mesh && Boolean(child.userData.shapeSurface));
  if (!surface) return;
  if (updateSurfaceMaterial) {
    const material = sharedShapeMaterial(shape);
    const nextMaterial = shape.kind === "box" && shape.imagePlate && !shape.hole
      ? createImagePlateMaterials(shape, material, onTextureReady)
      : material;
    const currentMaterials = Array.isArray(surface.material) ? surface.material : null;
    const sameMaterial = Array.isArray(nextMaterial)
      ? Boolean(currentMaterials && nextMaterial.every((entry, index) => currentMaterials[index] === entry))
      : surface.material === nextMaterial;
    if (!sameMaterial) {
      replaceObjectMaterials(surface, nextMaterial);
    }
  }
  removeShapeDecorations(object);
  addShapeEdgeDecorations(object, surface, surface.geometry, shape);
  object.traverse((child) => {
    child.userData.shapeId = shape.id;
  });
  setObjectRenderLayer(object, RENDER_LAYER_SHAPES);
  freezeStaticObjectMatrices(object);
}

function applySectionClipping(state: ThreeState | null, plane: THREE.Plane | null) {
  if (!state) return;
  state.sectionPlane = plane;
  const planes = plane ? [plane] : null;

  state.shapeLayer.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.material) {
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach((mat) => {
        if (!mat) return;
        const hadPlanes = Boolean(mat.clippingPlanes && mat.clippingPlanes.length > 0);
        const willHavePlanes = Boolean(planes && planes.length > 0);
        mat.clippingPlanes = planes;
        mat.clipShadows = true;
        if (hadPlanes !== willHavePlanes) {
          mat.needsUpdate = true;
        }
      });
    }
  });

  // Moving the plane only changes its numbers, which every material reads
  // each frame; a shader rebuild is needed only when clipping starts or stops.
  const setPlanes = (mat: THREE.Material) => {
    const changed = Boolean(mat.clippingPlanes?.length) !== Boolean(planes?.length);
    mat.clippingPlanes = planes;
    mat.clipShadows = true;
    if (changed) mat.needsUpdate = true;
  };
  sharedShapeMaterialCache.forEach((entry) => setPlanes(entry.material));
  sharedLineMaterialCache.forEach(setPlanes);

  state.needsRender = true;
}

function updateSectionPlaneHelper(
  state: ThreeState,
  settings: SectionPlaneSettings,
  workspace: WorkspaceSettings,
) {
  if (!settings.enabled || !settings.showPlane) {
    if (state.sectionPlaneHelper) {
      state.scene.remove(state.sectionPlaneHelper);
      disposeObject(state.sectionPlaneHelper);
      state.sectionPlaneHelper = null;
      state.needsRender = true;
    }
    return;
  }

  const bounds = new THREE.Box3();
  state.shapeRecords.forEach((record) => {
    if (!record.shape.hidden) bounds.expandByObject(record.object);
  });

  const center = bounds.isEmpty()
    ? new THREE.Vector3(0, 20, 0)
    : bounds.getCenter(new THREE.Vector3());
  const size = bounds.isEmpty()
    ? new THREE.Vector3(workspace.width, 40, workspace.depth)
    : bounds.getSize(new THREE.Vector3());

  const spanX = Math.max(size.x * 1.3, workspace.width * 0.85, 80);
  const spanY = Math.max(size.y * 1.3, 50);
  const spanZ = Math.max(size.z * 1.3, workspace.depth * 0.85, 80);

  let helper = state.sectionPlaneHelper;
  if (!helper) {
    helper = new THREE.Group();
    helper.name = "SectionPlaneHelper";

    const quadGeom = new THREE.PlaneGeometry(1, 1);
    const quadMat = new THREE.MeshBasicMaterial({
      color: "#00b4d8",
      transparent: true,
      opacity: 0.15,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const quad = new THREE.Mesh(quadGeom, quadMat);
    quad.name = "SectionPlaneQuad";

    const borderGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.5, -0.5, 0),
      new THREE.Vector3(0.5, -0.5, 0),
      new THREE.Vector3(0.5, 0.5, 0),
      new THREE.Vector3(-0.5, 0.5, 0),
    ]);
    const borderMat = new THREE.LineBasicMaterial({
      color: "#00b4d8",
      transparent: true,
      opacity: 0.85,
      linewidth: 1.5,
      depthWrite: false,
    });
    const border = new THREE.LineLoop(borderGeom, borderMat);
    border.name = "SectionPlaneBorder";

    helper.add(quad);
    helper.add(border);
    setObjectRenderLayer(helper, RENDER_LAYER_HELPERS);
    state.scene.add(helper);
    state.sectionPlaneHelper = helper;
  }

  const quad = helper.getObjectByName("SectionPlaneQuad") as THREE.Mesh;
  const border = helper.getObjectByName("SectionPlaneBorder") as THREE.LineLoop;

  if (settings.axis === "x") {
    helper.position.set(settings.offset, center.y, center.z);
    helper.rotation.set(0, Math.PI / 2, 0);
    quad.scale.set(spanZ, spanY, 1);
    border.scale.set(spanZ, spanY, 1);
  } else if (settings.axis === "y") {
    helper.position.set(center.x, settings.offset, center.z);
    helper.rotation.set(-Math.PI / 2, 0, 0);
    quad.scale.set(spanX, spanZ, 1);
    border.scale.set(spanX, spanZ, 1);
  } else {
    helper.position.set(center.x, center.y, settings.offset);
    helper.rotation.set(0, 0, 0);
    quad.scale.set(spanX, spanY, 1);
    border.scale.set(spanX, spanY, 1);
  }

  state.needsRender = true;
}

function rebuildShapes(
  state: ThreeState | null,
  shapes: WorkplaneShape[],
  selectedIds: string[],
  useOfficialModifierRendering = false,
  workplane: PlacementWorkplane = horizontalPlacementWorkplane(),
) {
  if (!state) {
    return;
  }

  const selected = new Set(selectedIds);
  const visibleShapes = shapes.filter((shape) => !shape.hidden);

  if (useOfficialModifierRendering) {
    disposeChildren(state.shapeLayer);
    state.shapeRecords.clear();
    state.officialShapeLayerActive = true;
    visibleShapes.forEach((shape) => {
      const object = createShapeObject(shape, selected.has(shape.id), () => {
        state.needsRender = true;
      }, false);
      state.shapeLayer.add(object);
    });
    rebuildSelectionHelpers(state, shapes, selectedIds, workplane);
    if (state.sectionPlane) {
      applySectionClipping(state, state.sectionPlane);
    }
    state.needsRender = true;
    return;
  }

  if (state.officialShapeLayerActive) {
    disposeChildren(state.shapeLayer);
    state.shapeRecords.clear();
    state.officialShapeLayerActive = false;
  }

  const visibleIds = new Set(visibleShapes.map((shape) => shape.id));
  state.shapeRecords.forEach((record, id) => {
    if (visibleIds.has(id)) return;
    state.shapeLayer.remove(record.object);
    disposeObject(record.object);
    state.shapeRecords.delete(id);
  });

  visibleShapes.forEach((shape) => {
    const selectedShape = selected.has(shape.id);
    const transformSignature = shapeTransformSignature(shape);
    const materialSignature = shapeMaterialSignature(shape);
    const geometrySignature = shapeGeometrySignature(shape);
    let record = state.shapeRecords.get(shape.id);
    if (record && record.geometrySignature !== geometrySignature) {
      state.shapeLayer.remove(record.object);
      disposeObject(record.object);
      state.shapeRecords.delete(shape.id);
      record = undefined;
    }

    if (!record) {
      const object = createShapeObject(shape, selectedShape, () => {
        state.needsRender = true;
      });
      state.shapeLayer.add(object);
      record = {
        object,
        shape,
        transformSignature,
        materialSignature,
        geometrySignature,
        selected: selectedShape,
      };
      state.shapeRecords.set(shape.id, record);
      return;
    }

    if (record.transformSignature !== transformSignature) {
      updateShapeObjectTransform(record.object, shape);
    }
    record.object.name = shape.name;
    syncShapeObjectDimensions(record.object, shape);
    const materialChanged = record.materialSignature !== materialSignature;
    if (materialChanged || record.selected !== selectedShape) {
      syncShapeObjectAppearance(record.object, shape, selectedShape, materialChanged, () => {
        state.needsRender = true;
      });
    }
    record.shape = shape;
    record.transformSignature = transformSignature;
    record.materialSignature = materialSignature;
    record.geometrySignature = geometrySignature;
    record.selected = selectedShape;
  });


  rebuildSelectionHelpers(state, shapes, selectedIds, workplane);
  if (state.sectionPlane) {
    applySectionClipping(state, state.sectionPlane);
  }
  state.needsRender = true;
}

function modifierEdgeMaterialStyle(active: boolean, hovered: boolean, previewActive: boolean, belowThreshold = false) {
  const subduedSelectedPreviewEdge = previewActive && active && !hovered;
  return {
    color: active ? (hovered ? "#ffbf45" : "#ff8a1d") : hovered ? "#84edff" : belowThreshold ? "#4d7f91" : "#17b7e5",
    opacity: subduedSelectedPreviewEdge ? 0.18 : active || hovered ? 1 : belowThreshold ? 0.35 : 0.72,
    linewidth: active || hovered ? 3 : 1,
  };
}

function rebuildModifierEdges(
  state: ThreeState | null,
  edges: CadModifierEdge[],
  selectedIds: number[],
  previewActive = false,
  hoverId: number | null = null,
  highlightedIds: number[] = [],
) {
  if (!state) return;
  disposeChildren(state.modifierLayer);
  const selected = new Set(selectedIds);
  const highlighted = new Set(highlightedIds);
  edges.forEach((edge) => {
    if (edge.points.length < 6) return;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(edge.points, 3));
    const active = selected.has(edge.id);
    const hovered = hoverId === edge.id;
    const belowThreshold = !active && !hovered && !highlighted.has(edge.id);
    const style = modifierEdgeMaterialStyle(active, hovered, previewActive, belowThreshold);
    const material = new THREE.LineBasicMaterial({
      color: style.color,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      opacity: style.opacity,
      linewidth: style.linewidth,
    });
    const line = new THREE.Line(geometry, material);
    line.userData.modifierEdgeId = edge.id;
    line.renderOrder = hovered ? 1003 : active ? 1002 : 1001;
    setObjectRenderLayer(line, RENDER_LAYER_MODIFIERS);
    freezeStaticObjectMatrices(line);
    state.modifierLayer.add(line);
  });
  state.needsRender = true;
}

function rebuildSelectionHelpers(
  state: ThreeState | null,
  shapes: WorkplaneShape[],
  selectedIds: string[],
  workplane: PlacementWorkplane,
) {
  if (!state) {
    return;
  }

  disposeChildren(state.helperLayer);
  selectedIds.forEach((id) => {
    const shape = shapes.find((entry) => entry.id === id && !entry.hidden);
    if (!shape) {
      return;
    }
    const shadow = createSelectedGroundFootprint(shape, workplane);
    if (shadow) {
      setObjectRenderLayer(shadow, RENDER_LAYER_HELPERS);
      freezeStaticObjectMatrices(shadow);
      state.helperLayer.add(shadow);
    }
  });
}

function setSelectionHelpersVisible(state: ThreeState | null, visible: boolean) {
  if (!state || state.helperLayer.visible === visible) {
    return;
  }
  state.helperLayer.visible = visible;
  state.needsRender = true;
}

const formatMeasure = formatLengthMm;
const parseMeasureMm = parseLengthMm;
const resolveMeasureMm = resolveLengthMm;
const setMeasureUnit = setLengthUnit;

function makeDimensionMark(
  key: string,
  handleKey: string,
  axis: DimensionMark["axis"],
  label: string,
  fromWorld: THREE.Vector3,
  toWorld: THREE.Vector3,
  outwardWorld: THREE.Vector3,
  project: (point: THREE.Vector3) => { x: number; y: number },
): DimensionMark {
  const from = project(fromWorld);
  const to = project(toWorld);
  const outwardAxis = outwardWorld.clone();
  outwardAxis.normalize();

  const railOffset = 5.8;
  const extensionOverrun = 1.4;
  const labelOffset = 3.2;
  const railFrom = project(fromWorld.clone().add(outwardAxis.clone().multiplyScalar(railOffset)));
  const railTo = project(toWorld.clone().add(outwardAxis.clone().multiplyScalar(railOffset)));
  const extensionFrom = project(fromWorld.clone().add(outwardAxis.clone().multiplyScalar(railOffset + extensionOverrun)));
  const extensionTo = project(toWorld.clone().add(outwardAxis.clone().multiplyScalar(railOffset + extensionOverrun)));
  const edgeMidpoint = project(fromWorld.clone().lerp(toWorld, 0.5));
  const labelPoint = project(
    fromWorld
      .clone()
      .lerp(toWorld, 0.5)
      .add(outwardAxis.clone().multiplyScalar(railOffset + labelOffset)),
  );
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

function updateTransformOverlayIfChanged(
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

function updateTransformOverlayDom(state: ThreeState, next: TransformOverlayState) {
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
    element.style.setProperty("--rotate-plane-a", String(handle.plane.a));
    element.style.setProperty("--rotate-plane-b", String(handle.plane.b));
    element.style.setProperty("--rotate-plane-c", String(handle.plane.c));
    element.style.setProperty("--rotate-plane-d", String(handle.plane.d));
  });
}

function syncTransformOverlay(
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
  const cameraInsideSelection = isPointInsideTransformBounds(cameraInSelectionFrame, frame.min, frame.max);
  const project = (point: THREE.Vector3) => {
    const cameraSpace = point.clone().applyMatrix4(state.camera.matrixWorldInverse);
    const projected = cameraSpace.clone().applyMatrix4(state.camera.projectionMatrix);
    return transformOverlayScreenPoint(projected, cameraSpace.z, rect.width, rect.height);
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
  const liftOffset = Math.max(2, lift.height * LIFT_HANDLE_HEIGHT_OFFSET_FRACTION);
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
  const liftPoint = project(liftHandle);
  const liftBasePoint = project(liftBaseWorld);
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
  const dimensionMarks = {
    ...footprintDimensionMarks,
    [heightHandleKey]: [makeDimensionMark("height", heightHandleKey, "height", heightLabel, lowerCenterWorld, upperCenterWorld, rightOut, project)],
    [liftHandleKey]: [makeDimensionMark("elevation", liftHandleKey, "elevation", liftLabel, liftAnchor, liftTarget, liftDimensionOutward, project)],
  };
  const screenOffsetFromCenter = (point: { x: number; y: number }, distance: number) => {
    const dx = point.x - centerPoint.x;
    const dy = point.y - centerPoint.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    return {
      x: point.x + (dx / length) * distance,
      y: point.y + (dy / length) * distance,
    };
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
  const rotateLeft = screenOffsetFromCenter(rotateLeftSource, 24);
  const rotateRight = screenOffsetFromCenter(rotateRightSource, 28);
  const rotateBottomAnchor = screenOffsetFromCenter(rotateBottomSource, 26);
  const rotateBottom = { ...rotateBottomAnchor, y: rotateBottomAnchor.y - 5 };
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
  const yRotationAxes = rotationSides.y === "near"
    ? { u: xFootAxis, v: zFootAxis }
    : rotationSides.y === "far"
      ? { u: xFootAxis.clone().multiplyScalar(-1), v: zFootAxis.clone().multiplyScalar(-1) }
      : rotationSides.y === "right"
        ? { u: zFootAxis.clone().multiplyScalar(-1), v: xFootAxis }
        : { u: zFootAxis, v: xFootAxis.clone().multiplyScalar(-1) };
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
  const makeCameraPlaneView = (uAxis: THREE.Vector3, vAxis: THREE.Vector3): RotationPlaneView => {
    const u = uAxis.clone().transformDirection(state.camera.matrixWorldInverse);
    const v = vAxis.clone().transformDirection(state.camera.matrixWorldInverse);
    return { x: 0, y: 0, a: u.x, b: -u.y, c: v.x, d: -v.y };
  };
  const rotationHandlePlanes: Record<RotationAxis, RotationPlaneView> = {
    // Project only the two plane axes through the camera rotation. Ignoring
    // perspective translation keeps glyph appearance independent of object
    // length and screen position while preserving camera foreshortening.
    x: makeCameraPlaneView(zFootAxis, yFootAxis),
    y: makeCameraPlaneView(yRotationAxes.u, yRotationAxes.v),
    z: makeCameraPlaneView(xFootAxis, yFootAxis),
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
  const rotateHandles = rotationChromeVisible ? [
    rotateLeftSource.visible ? { key: "rotate-left", className: "screen-left", x: rotateLeft.x, y: rotateLeft.y, plane: normalizedRotationPlaneBasis(rotationHandlePlanes.x, true) } : null,
    rotateRightSource.visible ? { key: "rotate-right", className: "screen-right", x: rotateRight.x, y: rotateRight.y, plane: normalizedRotationPlaneBasis(rotationHandlePlanes.z, true) } : null,
    rotateBottomSource.visible ? { key: "rotate-bottom", className: "screen-bottom", x: rotateBottom.x, y: rotateBottom.y, plane: normalizedRotationPlaneBasis(rotationHandlePlanes.y, true) } : null,
  ].filter((handle): handle is NonNullable<typeof handle> => Boolean(handle)) : [];

  // Which mid-edge handle sits on the side of the shape currently facing the
  // camera - same sign convention as showLowerHandles above, so always-visible
  // dimension labels for a lone selection land on a readable, visible face.
  const cameraView = state.camera.position.clone().sub(frame.center);
  const widthMidHandleKey = cameraView.dot(xFootAxis) >= 0 ? "right-mid" : "left-mid";
  const depthMidHandleKey = cameraView.dot(zFootAxis) >= 0 ? "near-mid" : "far-mid";
  const alwaysVisibleDimensionKeys = dimensionsAlwaysVisible && frame.singleShape
    ? isCircularFootprint
      ? [widthMidHandleKey, heightHandleKey]
      : [widthMidHandleKey, depthMidHandleKey, heightHandleKey]
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
const drawnSurfaceBoundsCache = new WeakMap<THREE.Mesh, { key: string; box: THREE.Box3 }>();

function drawnSurfaceBounds(mesh: THREE.Mesh) {
  const key = `${mesh.geometry.uuid}:${mesh.matrixWorld.elements.join(",")}`;
  const cached = drawnSurfaceBoundsCache.get(mesh);
  if (cached?.key === key) return cached.box;
  const box = new THREE.Box3().expandByObject(mesh, true);
  drawnSurfaceBoundsCache.set(mesh, { key, box });
  return box;
}

/** The box round the surfaces drawn for these shapes, in the world; null when none is drawn. */
function drawnShapesBounds(state: ThreeState, ids: string[]): THREE.Box3 | null {
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

function syncAlignOverlay(
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

  const selectedFrame = selectionFrameForShapes(shapes, selectedIds);
  const anchorFrame = alignAnchorId && selectedIds.includes(alignAnchorId) ? selectionFrameForShapes(shapes, [alignAnchorId]) : null;
  const frame = anchorFrame ?? selectedFrame;
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
  const nearPlane = state.camera instanceof THREE.PerspectiveCamera ? state.camera.near : 0.1;
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
  // The handles stand where the parts will line up: at the box round what is drawn, as the
  // alignment measures it. The corners of a turned part's own box stick out past a cylinder or
  // a star, so handles placed there promised an edge the parts then did not move to (#187).
  const drawn = drawnShapesBounds(state, anchorFrame && alignAnchorId ? [alignAnchorId] : selectedIds);
  const worldMinY = drawn ? drawn.min.y : Math.min(...corners.map((corner) => corner.y));
  const worldMaxY = drawn ? drawn.max.y : Math.max(...corners.map((corner) => corner.y));
  const worldMinX = drawn ? drawn.min.x : Math.min(...corners.map((corner) => corner.x));
  const worldMaxX = drawn ? drawn.max.x : Math.max(...corners.map((corner) => corner.x));
  const worldMinZ = drawn ? drawn.min.z : Math.min(...corners.map((corner) => corner.z));
  const worldMaxZ = drawn ? drawn.max.z : Math.max(...corners.map((corner) => corner.z));
  const worldCenterX = (worldMinX + worldMaxX) / 2;
  const worldCenterY = (worldMinY + worldMaxY) / 2;
  const worldCenterZ = (worldMinZ + worldMaxZ) / 2;
  const offset = Math.max(8, Math.max(worldMaxX - worldMinX, worldMaxY - worldMinY, worldMaxZ - worldMinZ) * 0.16);
  const statusByKey = new Map(statuses.map((status) => [`${status.axis}:${status.target}`, status]));

  const guidePoints = {
    x0: project(new THREE.Vector3(worldMinX, worldMinY, worldMaxZ + offset)),
    x1: project(new THREE.Vector3(worldMaxX, worldMinY, worldMaxZ + offset)),
    z0: project(new THREE.Vector3(worldMaxX + offset, worldMinY, worldMinZ)),
    z1: project(new THREE.Vector3(worldMaxX + offset, worldMinY, worldMaxZ)),
    y0: project(new THREE.Vector3(worldMinX - offset, worldMinY, worldMaxZ + offset)),
    y1: project(new THREE.Vector3(worldMinX - offset, worldMaxY, worldMaxZ + offset)),
  };

  const makeHandle = (axis: AlignAxis, target: AlignTarget, point: THREE.Vector3) => {
    const status = statusByKey.get(`${axis}:${target}`);
    if (!status) {
      return null;
    }
    const screen = project(point);
    return {
      ...status,
      key: `${axis}-${target}`,
      x: screen.x,
      y: screen.y,
    };
  };

  const handles = [
    makeHandle("x", "min", new THREE.Vector3(worldMinX, worldMinY, worldMaxZ + offset)),
    makeHandle("x", "center", new THREE.Vector3(worldCenterX, worldMinY, worldMaxZ + offset)),
    makeHandle("x", "max", new THREE.Vector3(worldMaxX, worldMinY, worldMaxZ + offset)),
    makeHandle("z", "min", new THREE.Vector3(worldMaxX + offset, worldMinY, worldMinZ)),
    makeHandle("z", "center", new THREE.Vector3(worldMaxX + offset, worldMinY, worldCenterZ)),
    makeHandle("z", "max", new THREE.Vector3(worldMaxX + offset, worldMinY, worldMaxZ)),
    makeHandle("y", "min", new THREE.Vector3(worldMinX - offset, worldMinY, worldMaxZ + offset)),
    makeHandle("y", "center", new THREE.Vector3(worldMinX - offset, worldCenterY, worldMaxZ + offset)),
    makeHandle("y", "max", new THREE.Vector3(worldMinX - offset, worldMaxY, worldMaxZ + offset)),
  ].filter((handle): handle is AlignOverlayState["handles"][number] => Boolean(handle));

  const next = {
    guides: [
      { key: "x", x1: guidePoints.x0.x, y1: guidePoints.x0.y, x2: guidePoints.x1.x, y2: guidePoints.x1.y },
      { key: "z", x1: guidePoints.z0.x, y1: guidePoints.z0.y, x2: guidePoints.z1.x, y2: guidePoints.z1.y },
      { key: "y", x1: guidePoints.y0.x, y1: guidePoints.y0.y, x2: guidePoints.y1.x, y2: guidePoints.y1.y },
    ],
    handles,
  };

  overlayRef.current = next;
  setOverlay(next);
}

function syncMirrorOverlay(
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
  const nearPlane = state.camera instanceof THREE.PerspectiveCamera ? state.camera.near : 0.1;
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

  overlayRef.current = next;
  setOverlay(next);
}

function pivotVector(point: PivotPoint | null | undefined) {
  return point ? new THREE.Vector3(point.x, point.y, point.z) : null;
}

/**
 * The rotation pivot under the pointer: the centre of the flat face that was
 * clicked (the axis of a pipe end), or the clicked point on a curved surface.
 * Any visible body counts, not only the selection, so the pivot can also sit
 * on the part the selection is meant to line up with.
 */
/** The id of the body under the pointer, the nearest one the section view leaves visible. */
function pickShapeIdAt(state: ThreeState, clientX: number, clientY: number): string | null {
  const rect = state.renderer.domElement.getBoundingClientRect();
  state.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  state.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  state.raycaster.setFromCamera(state.pointer, state.camera);
  state.raycaster.layers.set(RENDER_LAYER_SHAPES);
  const hit = state.raycaster
    .intersectObjects(state.shapeLayer.children, true)
    .find((entry) => {
      if (state.sectionPlane && state.sectionPlane.distanceToPoint(entry.point) < -0.001) return false;
      return entry.object instanceof THREE.Mesh && typeof entry.object.userData.shapeId === "string";
    });
  return hit ? (hit.object.userData.shapeId as string) : null;
}

function pickRotationPivot(state: ThreeState, clientX: number, clientY: number): PivotPoint | null {
  const rect = state.renderer.domElement.getBoundingClientRect();
  state.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  state.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  state.raycaster.setFromCamera(state.pointer, state.camera);
  state.raycaster.layers.set(RENDER_LAYER_SHAPES);
  const hit = state.raycaster
    .intersectObjects(state.shapeLayer.children, true)
    .find((entry) => {
      if (state.sectionPlane && state.sectionPlane.distanceToPoint(entry.point) < -0.001) return false;
      return entry.object instanceof THREE.Mesh && entry.faceIndex !== undefined && entry.faceIndex !== null && typeof entry.object.userData.shapeId === "string";
    });
  if (!hit || hit.faceIndex === undefined || hit.faceIndex === null) return null;

  const mesh = hit.object as THREE.Mesh<THREE.BufferGeometry>;
  mesh.updateWorldMatrix(true, false);
  const position = mesh.geometry.getAttribute("position");
  const index = mesh.geometry.getIndex();
  const cornerCount = index ? index.count : position.count;
  const positions = new Float64Array(cornerCount * 3);
  const corner = new THREE.Vector3();
  for (let offset = 0; offset < cornerCount; offset += 1) {
    corner.fromBufferAttribute(position, index ? index.getX(offset) : offset).applyMatrix4(mesh.matrixWorld);
    positions[offset * 3] = corner.x;
    positions[offset * 3 + 1] = corner.y;
    positions[offset * 3 + 2] = corner.z;
  }
  return planarFaceCentroid(positions, hit.faceIndex) ?? { x: hit.point.x, y: hit.point.y, z: hit.point.z };
}

/**
 * Where a dragged pivot marker lands (#140): on the body under the pointer - a corner or the
 * middle of an edge when the pointer is near one, a point along the edge, or else the point of
 * the surface. Beside every body it slides in the plane through `depth` facing the camera.
 */
function resolvePivotDragPoint(state: ThreeState, clientX: number, clientY: number, depth: THREE.Vector3): THREE.Vector3 | null {
  const rect = state.renderer.domElement.getBoundingClientRect();
  state.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  state.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  state.raycaster.setFromCamera(state.pointer, state.camera);
  state.raycaster.layers.set(RENDER_LAYER_SHAPES);
  const hit = state.raycaster
    .intersectObjects(state.shapeLayer.children, true)
    .find((entry) => {
      if (state.sectionPlane && state.sectionPlane.distanceToPoint(entry.point) < -0.001) return false;
      return entry.object instanceof THREE.Mesh && entry.face && typeof entry.object.userData.shapeId === "string";
    });
  if (hit?.face) {
    const mesh = hit.object as THREE.Mesh<THREE.BufferGeometry>;
    mesh.updateWorldMatrix(true, false);
    const normal = hit.face.normal.clone().applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld)).normalize();
    const pointerX = clientX - rect.left;
    const pointerY = clientY - rect.top;
    const feature = placementFeatureSnap(state, mesh, hit.point, normal, pointerX, pointerY);
    if (feature?.kind === "vertex") return feature.point;
    if (feature?.kind === "edge") {
      const middle = feature.start.clone().lerp(feature.end, 0.5);
      const screen = projectToScreen(middle, state);
      return Math.hypot(screen.x - pointerX, screen.y - pointerY) <= PLACEMENT_VERTEX_SNAP_PX ? middle : feature.point;
    }
    return hit.point.clone();
  }
  const facing = new THREE.Vector3();
  state.camera.getWorldDirection(facing);
  const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(facing, depth);
  return state.raycaster.ray.intersectPlane(plane, new THREE.Vector3());
}

export type LayFlatPick = { shapeId: string; normal: { x: number; y: number; z: number }; point: { x: number; y: number; z: number } };

/** The clicked face of any body, as the body's id and the face's outward normal in world space. */
function pickLayFlatFace(state: ThreeState, clientX: number, clientY: number): LayFlatPick | null {
  const rect = state.renderer.domElement.getBoundingClientRect();
  state.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  state.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  state.raycaster.setFromCamera(state.pointer, state.camera);
  state.raycaster.layers.set(RENDER_LAYER_SHAPES);
  const hit = state.raycaster
    .intersectObjects(state.shapeLayer.children, true)
    .find((entry) => {
      if (state.sectionPlane && state.sectionPlane.distanceToPoint(entry.point) < -0.001) return false;
      return entry.object instanceof THREE.Mesh && entry.face && typeof entry.object.userData.shapeId === "string";
    });
  if (!hit || !hit.face) return null;
  const mesh = hit.object as THREE.Mesh<THREE.BufferGeometry>;
  mesh.updateWorldMatrix(true, false);
  const position = mesh.geometry.getAttribute("position");
  const corner = (index: number) => new THREE.Vector3().fromBufferAttribute(position, index).applyMatrix4(mesh.matrixWorld);
  const normal = outwardFaceNormal(corner(hit.face.a), corner(hit.face.b), corner(hit.face.c), state.raycaster.ray.direction);
  return normal ? { shapeId: mesh.userData.shapeId as string, normal, point: { x: hit.point.x, y: hit.point.y, z: hit.point.z } } : null;
}

/**
 * While "Lay flat" waits for a click, shows the face the click would turn
 * down: the flat face under the pointer, if it belongs to the selection. The
 * face is looked up again only when the pointer moves onto another triangle.
 */
function syncLayFlatHover(
  state: ThreeState | null,
  selectedIds: readonly string[],
  theme: ResolvedAppTheme,
  clientX: number | null,
  clientY: number | null,
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
    layer.visible = false;
    state.needsRender = true;
  };
  if (clientX === null || clientY === null) {
    clear();
    return;
  }

  const rect = state.renderer.domElement.getBoundingClientRect();
  state.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  state.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  state.raycaster.setFromCamera(state.pointer, state.camera);
  state.raycaster.layers.set(RENDER_LAYER_SHAPES);
  const hit = state.raycaster
    .intersectObjects(state.shapeLayer.children, true)
    .find((entry) => {
      if (state.sectionPlane && state.sectionPlane.distanceToPoint(entry.point) < -0.001) return false;
      return entry.object instanceof THREE.Mesh && entry.faceIndex !== undefined && entry.faceIndex !== null && typeof entry.object.userData.shapeId === "string";
    });
  const mesh = hit?.object as THREE.Mesh<THREE.BufferGeometry> | undefined;
  if (!hit || !mesh || hit.faceIndex === undefined || hit.faceIndex === null || !selectedIds.includes(mesh.userData.shapeId as string)) {
    clear();
    return;
  }

  const key = `${mesh.uuid}:${hit.faceIndex}:${theme}`;
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
  // A very dense mesh is too slow to search on every move: show the one facet.
  if (cornerCount <= 600000) {
    const world = new Float64Array(cornerCount * 3);
    for (let offset = 0; offset < cornerCount; offset += 1) {
      worldCorner(offset);
      world[offset * 3] = corner.x;
      world[offset * 3 + 1] = corner.y;
      world[offset * 3 + 2] = corner.z;
    }
    positions = world;
    triangles = planarFaceTriangles(world, hit.faceIndex)?.triangles ?? triangles;
  } else {
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
  layer.visible = true;
  state.needsRender = true;
}

/**
 * Lights up one segment of a bent tube: a slightly wider sleeve over that
 * piece of the tube, placed like the shape itself. Drawn again whenever the
 * shape or the chosen segment changes; nothing is drawn for another shape.
 */
function syncBentTubeSegment(state: ThreeState | null, shape: WorkplaneShape | null, segment: { shapeId: string; index: number } | null) {
  if (!state) return;
  let layer = state.bentTubeSegmentLayer;
  if (!layer) {
    layer = new THREE.Group();
    layer.name = "BentTubeSegment";
    layer.layers.set(RENDER_LAYER_PREVIEWS);
    layer.visible = false;
    state.bentTubeSegmentLayer = layer;
    state.scene.add(layer);
  }
  disposeChildren(layer);
  layer.visible = false;
  state.needsRender = true;
  if (!shape || shape.kind !== "bentTube" || !segment || segment.shapeId !== shape.id) return;

  const geometry = createBentTubeSegmentGeometry({
    width: shapeWidth(shape),
    depth: shapeDepth(shape),
    height: shape.height,
    bentTubeProfile: shape.bentTubeProfile,
    bentTubeInnerProfile: shape.bentTubeInnerProfile,
    bentTubeSize: shape.bentTubeSize,
    bentTubeWall: shape.bentTubeWall,
    bentTubeQuality: shape.bentTubeQuality,
    bentTubeSegments: shape.bentTubeSegments,
  }, segment.index);
  if (!geometry) return;

  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      color: "#ff9a2e",
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
  );
  mesh.layers.set(RENDER_LAYER_PREVIEWS);
  mesh.renderOrder = 955;
  mesh.raycast = () => undefined;
  mesh.position.y -= shape.height / 2;
  layer.position.set(shape.x, (shape.elevation ?? 0) + shape.height / 2, shape.z);
  layer.rotation.set(
    THREE.MathUtils.degToRad(shape.rotationX ?? 0),
    THREE.MathUtils.degToRad(shape.rotation),
    THREE.MathUtils.degToRad(shape.rotationZ ?? 0),
  );
  layer.scale.set(mirrorSign(shape.mirrorX), mirrorSign(shape.mirrorY), mirrorSign(shape.mirrorZ));
  layer.add(mesh);
  layer.visible = true;
}

function findShapeObject(state: ThreeState, id: string) {
  return state.shapeRecords.get(id)?.object ?? null;
}

function findSelectionHelper(state: ThreeState, id: string) {
  const helper = state.helperLayer.children.find((child) => child.userData.shapeId === id);
  return helper instanceof THREE.Box3Helper ? helper : null;
}

function findSelectedGroundFootprint(state: ThreeState, id: string) {
  return state.helperLayer.children.find((child) => child.name === "SelectedGroundFootprint" && child.userData.shapeId === id) ?? null;
}

/**
 * A move held to one axis of the workplane: of the plane's two directions,
 * the one the move has gone further along. On the flat workplane those are
 * X and Z; on a tilted one they are the plane's own.
 */
function dragAxisLock(workplane: PlacementWorkplane, deltaX: number, deltaY: number, deltaZ: number) {
  const alongX = deltaX * workplane.xAxis.x + deltaY * workplane.xAxis.y + deltaZ * workplane.xAxis.z;
  const alongZ = deltaX * workplane.zAxis.x + deltaY * workplane.zAxis.y + deltaZ * workplane.zAxis.z;
  const along: "x" | "z" = Math.abs(alongX) >= Math.abs(alongZ) ? "x" : "z";
  const axis = along === "x" ? workplane.xAxis : workplane.zAxis;
  const distance = along === "x" ? alongX : alongZ;
  return { along, delta: { x: axis.x * distance, y: axis.y * distance, z: axis.z * distance } };
}

function applyDragItemPreview(state: ThreeState, item: DragItem) {
  if (!item.visual || !item.visual.parent) {
    item.visual = findShapeObject(state, item.id);
  }
  if (!item.helper || !item.helper.parent) {
    item.helper = findSelectionHelper(state, item.id);
    item.helperBox = item.helper ? item.helper.box.clone() : null;
  }

  if (item.visual) {
    if (!item.hadPreviewSimplified) {
      setComplexEdgeVisibility(item.visual, false);
      item.hadPreviewSimplified = true;
    }
    item.visual.position.x = item.nextX;
    item.visual.position.y = item.startVisualY + item.nextElevation - item.startElevation;
    item.visual.position.z = item.nextZ;
    refreshFrozenObjectMatrix(item.visual);
  }

  if (item.helper && item.helperBox) {
    item.helper.box.copy(item.helperBox);
    item.helper.box.translate(new THREE.Vector3(
      item.nextX - item.startX,
      item.nextElevation - item.startElevation,
      item.nextZ - item.startZ,
    ));
    refreshFrozenObjectMatrix(item.helper);
  }
}

function refreshDragPreviewObjects(state: ThreeState | null, drag: DragState | null) {
  if (!state || !drag) return;
  drag.items.forEach((item) => applyDragItemPreview(state, item));
  updateSelectedGroundFootprintPreviews(state, drag);
  state.needsRender = true;
}

function updateSelectedGroundFootprintPreviews(state: ThreeState, drag: DragState) {
  drag.items.forEach((item) => {
    const footprint = findSelectedGroundFootprint(state, item.id);
    if (!footprint) {
      return;
    }
    footprint.position.x = item.nextX - item.startX;
    footprint.position.y = item.nextElevation - item.startElevation;
    footprint.position.z = item.nextZ - item.startZ;
    refreshFrozenObjectMatrix(footprint);
  });
}

function createSelectedGroundFootprint(shape: WorkplaneShape, workplane: PlacementWorkplane) {
  const frame = selectionFrameForShapes([shape], [shape.id], workplane);
  if (!frame) {
    return null;
  }

  const footprint = groundFootprintForFrame(frame, workplane);
  if (!footprint) {
    return null;
  }

  const group = new THREE.Group();
  group.name = "SelectedGroundFootprint";
  group.userData.shapeId = shape.id;

  // The footprint is convex, so a fan from its first corner fills it.
  const fillPositions: number[] = [];
  for (let index = 1; index < footprint.length - 1; index += 1) {
    [footprint[0], footprint[index], footprint[index + 1]].forEach((point) => fillPositions.push(point.x, point.y, point.z));
  }
  const fillGeometry = new THREE.BufferGeometry();
  fillGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(fillPositions), 3));
  fillGeometry.computeVertexNormals();
  const fill = new THREE.Mesh(
    fillGeometry,
    new THREE.MeshBasicMaterial({
      color: "#7f8f95",
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  group.add(fill);

  const points = [...footprint, footprint[0].clone()];
  const outline = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({ color: "#00aeea", transparent: true, opacity: 0.92 }),
  );
  outline.userData.shapeId = shape.id;
  group.add(outline);

  return group;
}

function sharedShapeGeometry(key: string, create: () => THREE.BufferGeometry) {
  const cached = sharedShapeGeometryCache.get(key);
  if (cached) {
    sharedShapeGeometryCache.delete(key);
    sharedShapeGeometryCache.set(key, cached);
    return cached.geometry;
  }
  const geometry = putGeometryOnBase(create());
  geometry.userData.cached = true;
  geometry.userData.sharedShapeGeometryKey = key;
  sharedShapeGeometryCache.set(key, { geometry, users: 0 });
  return geometry;
}

function disposeSharedShapeGeometry(geometry: THREE.BufferGeometry) {
  const edges = sharedEdgesGeometryCache.get(geometry);
  edges?.forEach((entry) => entry.dispose());
  if ((geometry as THREE.BufferGeometry & { boundsTree?: unknown }).boundsTree) {
    disposeBoundsTree.call(geometry);
  }
  geometry.dispose();
}

function trimSharedShapeGeometryCache() {
  while (sharedShapeGeometryCache.size > MAX_SHARED_SHAPE_GEOMETRIES) {
    const removable = [...sharedShapeGeometryCache.entries()].find(([, entry]) => entry.users === 0);
    if (!removable) return;
    const [key, entry] = removable;
    sharedShapeGeometryCache.delete(key);
    disposeSharedShapeGeometry(entry.geometry);
  }
}

function retainSharedShapeGeometry(mesh: THREE.Mesh, geometry: THREE.BufferGeometry) {
  const key = geometry.userData.sharedShapeGeometryKey as string | undefined;
  if (!key) return;
  const entry = sharedShapeGeometryCache.get(key);
  if (!entry || entry.geometry !== geometry) return;
  entry.users += 1;
  mesh.userData.sharedShapeGeometryKey = key;
  trimSharedShapeGeometryCache();
}

function releaseSharedShapeGeometry(mesh: THREE.Mesh | THREE.LineSegments) {
  const key = mesh.userData.sharedShapeGeometryKey as string | undefined;
  if (!key) return;
  mesh.userData.sharedShapeGeometryKey = undefined;
  const entry = sharedShapeGeometryCache.get(key);
  if (entry && entry.geometry === mesh.geometry) {
    entry.users = Math.max(0, entry.users - 1);
  }
  trimSharedShapeGeometryCache();
}

/** A group hands its hole or see-through state down to every child it draws. */
function groupChildAppearance(group: WorkplaneShape, child: WorkplaneShape): WorkplaneShape {
  if (group.hole) return { ...child, hole: true, color: "#b8c2cc" };
  // One colour for the whole group, nested groups included.
  const tinted = groupShowsPartColors(group) ? child : { ...child, color: group.color, multicolor: false };
  if (group.transparent) return { ...tinted, transparent: true };
  return tinted;
}

// A see-through solid keeps its colour. It writes no depth, so what lies
// behind or inside it - and the faces where it touches another body - stays
// visible from every side.
const TRANSPARENT_SOLID_OPACITY = 0.4;

function sharedShapeMaterial(shape: WorkplaneShape, vertexColors = false) {
  const seeThrough = !shape.hole && Boolean(shape.transparent);
  const color = shape.hole ? "#b7c0c9" : vertexColors ? "#ffffff" : shape.color;
  const key = JSON.stringify({
    color,
    vertexColors,
    transparent: Boolean(shape.hole) || seeThrough,
    opacity: shape.hole ? (shape.importedMesh ? 0.34 : 0.52) : seeThrough ? TRANSPARENT_SOLID_OPACITY : 1,
    roughness: shape.hole ? 0.88 : 0.57,
    depthWrite: !seeThrough,
    side: "double",
  });
  const cached = sharedShapeMaterialCache.get(key);
  if (cached) {
    sharedShapeMaterialCache.delete(key);
    sharedShapeMaterialCache.set(key, cached);
    return cached.material;
  }
  const material = new THREE.MeshStandardMaterial({
    color,
    vertexColors,
    transparent: Boolean(shape.hole) || seeThrough,
    opacity: shape.hole ? (shape.importedMesh ? 0.34 : 0.52) : seeThrough ? TRANSPARENT_SOLID_OPACITY : 1,
    roughness: shape.hole ? 0.88 : 0.57,
    metalness: 0.02,
    depthWrite: !seeThrough,
    side: THREE.DoubleSide,
  });
  if (!shape.hole) addOverhangTint(material);
  material.userData.cached = true;
  material.userData.sharedShapeMaterialKey = key;
  sharedShapeMaterialCache.set(key, { material, users: 0 });
  return material;
}

/**
 * Overhangs hatched red and white, so they show on a red body too - worked out per pixel from the face's own normal in world
 * space - steeper than the limit towards the ground and not lying on the
 * plate. Same rule as overhangArea() for MCP.
 */
function addOverhangTint(material: THREE.MeshStandardMaterial) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, overhangUniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vOverhangNormal;\nvarying float vOverhangY;")
      .replace(
        "#include <project_vertex>",
        "#include <project_vertex>\nvOverhangNormal = normalize( transpose( inverse( mat3( modelMatrix ) ) ) * objectNormal );\nvOverhangY = ( modelMatrix * vec4( transformed, 1.0 ) ).y;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vOverhangNormal;\nvarying float vOverhangY;\nuniform float uOverhangOn;\nuniform float uOverhangLimit;\nuniform float uOverhangPlateY;\nuniform vec3 uOverhangColor;",
      )
      .replace(
        "#include <color_fragment>",
        "#include <color_fragment>\nif ( uOverhangOn > 0.5 && vOverhangY > uOverhangPlateY && -normalize( vOverhangNormal ).y > uOverhangLimit ) diffuseColor.rgb = mod( gl_FragCoord.x + gl_FragCoord.y, 14.0 ) < 7.0 ? uOverhangColor : vec3( 1.0, 0.86, 0.82 );",
      );
  };
  material.customProgramCacheKey = () => "layerling-overhang";
}

function trimSharedShapeMaterialCache() {
  while (sharedShapeMaterialCache.size > MAX_SHARED_SHAPE_MATERIALS) {
    const removable = [...sharedShapeMaterialCache.entries()].find(([, entry]) => entry.users === 0);
    if (!removable) return;
    const [key, entry] = removable;
    sharedShapeMaterialCache.delete(key);
    entry.material.dispose();
  }
}

function retainSharedShapeMaterials(mesh: THREE.Mesh, materials: THREE.Material | THREE.Material[]) {
  const retained: string[] = [];
  (Array.isArray(materials) ? materials : [materials]).forEach((material) => {
    const key = material.userData.sharedShapeMaterialKey as string | undefined;
    if (!key || retained.includes(key)) return;
    const entry = sharedShapeMaterialCache.get(key);
    if (!entry || entry.material !== material) return;
    entry.users += 1;
    retained.push(key);
  });
  mesh.userData.sharedShapeMaterialKeys = retained;
  trimSharedShapeMaterialCache();
}

function releaseSharedShapeMaterials(mesh: THREE.Mesh | THREE.LineSegments) {
  const keys = mesh.userData.sharedShapeMaterialKeys as string[] | undefined;
  if (!keys?.length) return;
  mesh.userData.sharedShapeMaterialKeys = [];
  keys.forEach((key) => {
    const entry = sharedShapeMaterialCache.get(key);
    if (entry) entry.users = Math.max(0, entry.users - 1);
  });
}

function sharedLineMaterial(color: string, opacity: number, depthWrite = true) {
  const key = `${color}|${opacity}|${depthWrite}`;
  const cached = sharedLineMaterialCache.get(key);
  if (cached) return cached;
  const material = new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite });
  material.userData.cached = true;
  sharedLineMaterialCache.set(key, material);
  return material;
}

function disposeMaterialResource(material: THREE.Material) {
  if (material.userData.cached) return;
  const map = "map" in material ? (material.map as THREE.Texture | null) : null;
  if (map) map.dispose();
  material.dispose();
}

function replaceObjectMaterials(object: THREE.Mesh, materials: THREE.Material | THREE.Material[]) {
  const previous = Array.isArray(object.material) ? object.material : [object.material];
  releaseSharedShapeMaterials(object);
  object.material = materials;
  retainSharedShapeMaterials(object, materials);
  previous.forEach(disposeMaterialResource);
  trimSharedShapeMaterialCache();
}

function enableAcceleratedMeshPicking(mesh: THREE.Mesh, geometry: THREE.BufferGeometry, force = false) {
  const position = geometry.getAttribute("position");
  const triangles = geometry.getIndex()?.count
    ? Math.floor((geometry.getIndex()?.count ?? 0) / 3)
    : Math.floor((position?.count ?? 0) / 3);
  mesh.raycast = acceleratedRaycast;
  const bvhGeometry = geometry as THREE.BufferGeometry & { boundsTree?: unknown };
  if ((force || triangles >= BVH_PICKING_TRIANGLE_THRESHOLD) && !bvhGeometry.boundsTree) {
    computeBoundsTree.call(geometry, { targetLeafSize: 12 });
  }
}

function createShapeObject(
  shape: WorkplaneShape,
  showEdges = false,
  onTextureReady?: () => void,
  acceleratedPicking = true,
) {
  const group = new THREE.Group();
  group.name = shape.name;
  group.userData.shapeId = shape.id;
  group.userData.showEdges = showEdges;
  group.userData.acceleratedPicking = acceleratedPicking;
  group.userData.tapeDimensions = [shapeWidth(shape), shape.height, shapeDepth(shape)] satisfies [number, number, number];
  group.userData.tapeTopologyKey = tapeShapeTopologyKey(shape);
  group.position.set(shape.x, (shape.elevation ?? 0) + shape.height / 2, shape.z);
  group.rotation.set(
    THREE.MathUtils.degToRad(shape.rotationX ?? 0),
    THREE.MathUtils.degToRad(shape.rotation),
    THREE.MathUtils.degToRad(shape.rotationZ ?? 0),
  );
  group.scale.set(mirrorSign(shape.mirrorX), mirrorSign(shape.mirrorY), mirrorSign(shape.mirrorZ));

  if (shape.groupedShapes?.length && !shape.importedMesh) {
    const content = new THREE.Group();
    content.userData.groupedShapeContent = true;
    shape.groupedShapes
      .filter((child) => !child.hidden)
      .forEach((child) => {
        const childShape = groupChildAppearance(shape, child);
        const childObject = createShapeObject(childShape, showEdges, onTextureReady, acceleratedPicking);
        childObject.userData.groupChildId = child.id;
        content.add(childObject);
      });
    // Measured on the real vertices: the box of a turned part's own bounding box is wider than
    // the part, which stretched the content to a smaller size (a bundle shrank, #152).
    const contentBox = new THREE.Box3().setFromObject(content, true);
    const contentSize = contentBox.getSize(new THREE.Vector3());
    content.scale.set(
      shapeWidth(shape) / Math.max(0.001, contentSize.x),
      shape.height / Math.max(0.001, contentSize.y),
      shapeDepth(shape) / Math.max(0.001, contentSize.z),
    );
    content.position.y = -shape.height / 2;
    group.add(content);
    applyGroupedContentTaper(content, shape, contentBox);
    group.traverse((child) => {
      child.userData.shapeId = shape.id;
    });
    setObjectRenderLayer(group, RENDER_LAYER_SHAPES);
    freezeStaticObjectMatrices(group);
    return group;
  }

  const material = sharedShapeMaterial(shape);

  const width = shapeWidth(shape);
  const depth = shapeDepth(shape);
  const size = Math.min(width, depth);
  const height = shape.height;
  const geometryCacheKey = shapeGeometrySignature(shape);

  switch (shape.kind) {
    case "box":
      addMesh(
        group,
        sharedShapeGeometry(
          geometryCacheKey,
          () => shape.radius && shape.radius > 0
            ? new RoundedBoxGeometry(width, height, depth, Math.max(1, shape.steps ?? 10), shape.radius)
            : new THREE.BoxGeometry(1, 1, 1),
        ),
        shape.imagePlate && !shape.hole ? createImagePlateMaterials(shape, material, onTextureReady) : material,
        shape,
        undefined,
        undefined,
        shape.radius && shape.radius > 0 ? undefined : new THREE.Vector3(width, height, depth),
      );
      break;
    case "ruler":
      addMesh(
        group,
        sharedShapeGeometry(geometryCacheKey, () => new THREE.BoxGeometry(1, 1, 1)),
        createRulerMaterials(shape, material),
        shape,
        undefined,
        undefined,
        new THREE.Vector3(width, height, depth),
      );
      break;
    case "cylinder":
    case "ellipse":
    case "polygon": {
      // Zylinder, Ellipse und Mehrkant sind derselbe Koerper, nur mit anderer
      // Seitenzahl bzw. Fussabdruck. Die Geometrie bleibt ein Einheitskoerper
      // und wird ueber die Maschenskalierung in den Rahmen gesetzt - so baut
      // ein Zug am Anfasser nicht jedes Mal ein neues Vieleck.
      const sides = polygonSidesForShape(shape);
      const fit = regularPolygonFootprintScale(width, depth, sides);
      addMesh(
        group,
        sharedShapeGeometry(geometryCacheKey, () => new THREE.CylinderGeometry(1, 1, 1, sides, shape.segments ?? 1)),
        material,
        shape,
        new THREE.Vector3(fit.offsetX, 0, fit.offsetZ),
        undefined,
        new THREE.Vector3(fit.x, height, fit.z),
      );
      break;
    }
    case "counterbore":
    case "countersink":
      addMesh(group, sharedShapeGeometry(geometryCacheKey, () => createScrewHoleGeometry({ kind: shape.kind as "counterbore" | "countersink", width, depth, height, screwHoleShaft: shape.screwHoleShaft, screwHoleHeadDepth: shape.screwHoleHeadDepth, screwHoleAngle: shape.screwHoleAngle, sides: roundSideCount(shape.sides, width, depth) })), material, shape);
      break;
    case "teardrop":
      addMesh(group, sharedShapeGeometry(geometryCacheKey, () => createTeardropGeometry({ width, depth, height, sides: roundSideCount(shape.sides, width, depth) })), material, shape);
      break;
    case "knurl":
      addMesh(group, sharedShapeGeometry(geometryCacheKey, () => createKnurlGeometry({ width, height, knurlPattern: shape.knurlPattern, knurlCount: shape.knurlCount, knurlDepth: shape.knurlDepth, knurlAngle: shape.knurlAngle, knurlChamfer: shape.knurlChamfer })), material, shape);
      break;
    case "hinge":
      addMesh(group, sharedShapeGeometry(geometryCacheKey, () => createHingeGeometry({
        width,
        depth,
        height,
        hingeKnuckles: shape.hingeKnuckles,
        hingePinDiameter: shape.hingePinDiameter,
        hingeLeafThickness: shape.hingeLeafThickness,
        hingeClearance: shape.hingeClearance,
        sides: shape.sides,
      })), material, shape);
      break;
    case "loft":
      addMesh(group, sharedShapeGeometry(geometryCacheKey, () => createLoftGeometry({ ...shape, width, depth, height })), material, shape);
      break;
    case "dovetail":
      addMesh(group, sharedShapeGeometry(geometryCacheKey, () => createDovetailGeometry({
        width,
        depth,
        height,
        dovetailNeckWidth: shape.dovetailNeckWidth,
        dovetailClearance: shape.dovetailClearance,
        hole: shape.hole,
      })), material, shape);
      break;
    case "slot":
      addMesh(group, sharedShapeGeometry(geometryCacheKey, () => createSlotGeometry({
        width,
        depth,
        height,
        sides: shape.sides,
        slotEndRatio: shape.slotEndRatio,
      })), material, shape);
      break;
    case "sphere": {
      const { widthSegments, heightSegments } = sphereTessellation(shape.steps);
      addMesh(group, sharedShapeGeometry(geometryCacheKey, () => new THREE.SphereGeometry(1, widthSegments, heightSegments)), material, shape, undefined, undefined, new THREE.Vector3(width / 2, height / 2, depth / 2));
      break;
    }
    case "cone":
      addMesh(
        group,
        sharedShapeGeometry(geometryCacheKey, () => new THREE.CylinderGeometry(shape.topRadius ?? 0, shape.baseRadius ?? width / 2, height, roundSideCount(shape.sides, width, depth))),
        material,
        shape,
        undefined,
        undefined,
        new THREE.Vector3(1, 1, depth / Math.max(0.001, width)),
      );
      break;
    case "pyramid":
      addMesh(group, sharedShapeGeometry(geometryCacheKey, () => createPyramidGeometry(width, height, depth, shape.sides ?? 4, shape.topWidth, shape.topDepth)), material, shape);
      break;
    case "roof":
      addMesh(group, sharedShapeGeometry(geometryCacheKey, () => createRoofGeometry(width, height, depth)), material, shape);
      break;
    case "roundRoof":
      addMesh(group, sharedShapeGeometry(geometryCacheKey, () => createRoundRoofGeometry(width, height, depth, shape.sides ?? 64)), material, shape);
      break;
    case "halfSphere":
      addMesh(group, sharedShapeGeometry(geometryCacheKey, () => createHalfSphereGeometry(width, height, depth, shape.steps ?? 32)), material, shape);
      break;
    case "torus":
      addMesh(group, sharedShapeGeometry(geometryCacheKey, () => createTorusGeometry(width, height, depth)), material, shape);
      break;
    case "ring":
    case "tube":
      addMesh(group, sharedShapeGeometry(geometryCacheKey, () => createHollowCylinderGeometry(width, height, depth, shape.bevel ?? 4, roundSideCount(shape.sides, width, depth))), material, shape);
      break;
    case "star":
      addMesh(group, sharedShapeGeometry(geometryCacheKey, () => createStarGeometry({
        width,
        depth,
        height,
        starPoints: shape.starPoints,
        starInnerSize: shape.starInnerSize,
        starOuterFillet: shape.starOuterFillet,
        starInnerFillet: shape.starInnerFillet,
        starQuality: shape.starQuality,
      })), material, shape);
      break;
    case "heart":
      addMesh(group, sharedShapeGeometry(geometryCacheKey, () => createHeartGeometry({
        width,
        depth,
        height,
        heartTipFillet: shape.heartTipFillet,
        heartQuality: shape.heartQuality,
      })), material, shape);
      break;
    case "crescent":
      addMesh(group, sharedShapeGeometry(geometryCacheKey, () => createCrescentGeometry({
        width,
        depth,
        height,
        crescentThickness: shape.crescentThickness,
        crescentTipFillet: shape.crescentTipFillet,
        crescentQuality: shape.crescentQuality,
      })), material, shape);
      break;
    case "gear":
      addMesh(group, sharedShapeGeometry(geometryCacheKey, () => createGearGeometry({
        width,
        depth,
        height,
        teeth: shape.teeth,
        toothSize: shape.toothSize,
        toothWidth: shape.toothWidth,
        centerHoleSize: shape.centerHoleSize,
        gearType: shape.gearType,
        gearRim: shape.gearRim,
        helixAngle: shape.helixAngle,
        helixQuality: shape.helixQuality,
        gearProfile: shape.gearProfile,
        gearPressureAngle: shape.gearPressureAngle,
        gearBacklash: shape.gearBacklash,
      })), material, shape);
      break;
    case "honeycomb":
      addMesh(group, sharedShapeGeometry(geometryCacheKey, () => createHoneycombGeometry({
        width,
        depth,
        height,
        honeycombCellSize: shape.honeycombCellSize,
        honeycombWallThickness: shape.honeycombWallThickness,
        honeycombFrameWidth: shape.honeycombFrameWidth,
      })), material, shape);
      break;
    case "bentTube":
      addMesh(group, sharedShapeGeometry(geometryCacheKey, () => createBentTubeGeometry({
        width,
        depth,
        height,
        bentTubeProfile: shape.bentTubeProfile,
        bentTubeInnerProfile: shape.bentTubeInnerProfile,
        bentTubeSize: shape.bentTubeSize,
        bentTubeWall: shape.bentTubeWall,
        bentTubeQuality: shape.bentTubeQuality,
        bentTubeSegments: shape.bentTubeSegments,
      })), material, shape);
      break;
    case "roundedBox":
      addMesh(group, sharedShapeGeometry(geometryCacheKey, () => createRoundedBoxGeometry({
        width,
        depth,
        height,
        cornerFillet: shape.cornerFillet,
        topBottomFillet: shape.topBottomFillet,
        roundedBoxQuality: shape.roundedBoxQuality,
      })), material, shape);
      break;
    case "thread":
      addMesh(group, sharedShapeGeometry(geometryCacheKey, () => createThreadGeometry({
        width,
        depth,
        height,
        threadRole: shape.threadRole,
        threadHead: shape.threadHead,
        threadHand: shape.threadHand,
        threadProfile: shape.threadProfile,
        threadDiameter: shape.threadDiameter,
        threadPitch: shape.threadPitch,
        threadClearance: shape.threadClearance,
        threadBoltClearance: shape.threadBoltClearance,
        threadQuality: shape.threadQuality,
        threadHeadHeight: shape.threadHeadHeight,
        threadChamfer: shape.threadChamfer,
        threadHeadChamfer: shape.threadHeadChamfer,
      })), material, shape);
      break;
    case "spring":
      addMesh(group, sharedShapeGeometry(geometryCacheKey, () => createSpringGeometry({
        width,
        depth,
        height,
        springTurns: shape.springTurns,
        springWire: shape.springWire,
        springHand: shape.springHand,
        springQuality: shape.springQuality,
      })), material, shape);
      break;
    case "wedge":
      addMesh(group, sharedShapeGeometry(geometryCacheKey, () => createWedgeGeometry(width, height, depth)), material, shape);
      break;
    case "icosahedron":
      addMesh(group, sharedShapeGeometry(geometryCacheKey, () => new THREE.IcosahedronGeometry(size / 2, 1)), material, shape);
      break;
    case "text":
      addTextShape(group, material, shape, geometryCacheKey);
      break;
    case "mesh":
      if (shape.importedMesh) {
        const preserveEdgeSize = preservesEdgeTreatmentSize(shape);
        const partColored = !preserveEdgeSize && !shape.hole && groupShowsPartColors(shape) ? getPartColoredMeshGeometry(shape) : null;
        addMesh(
          group,
          partColored ?? (preserveEdgeSize ? getPreservedImportedMeshGeometry(shape) : getImportedMeshGeometry(shape.importedMesh)),
          partColored ? sharedShapeMaterial(shape, true) : material,
          shape,
          undefined,
          undefined,
          preserveEdgeSize ? undefined : new THREE.Vector3(
            width / Math.max(0.001, shape.importedMesh.baseWidth),
            height / Math.max(0.001, shape.importedMesh.baseHeight),
            depth / Math.max(0.001, shape.importedMesh.baseDepth),
          ),
        );
      } else {
        addMesh(group, sharedShapeGeometry(geometryCacheKey, () => new THREE.BoxGeometry(size, Math.max(3, height * 0.35), size * 0.72)), material, shape);
      }
      break;
    case "scribble":
      addMesh(group, sharedShapeGeometry(geometryCacheKey, () => new THREE.TorusKnotGeometry(size * 0.22, size * 0.055, 120, 12)), material, shape);
      break;
    case "sketch":
    default:
      addMesh(group, sharedShapeGeometry(geometryCacheKey, () => new THREE.BoxGeometry(size, Math.max(3, height * 0.35), size * 0.72)), material, shape);
      break;
  }

  group.traverse((child) => {
    child.userData.shapeId = shape.id;
  });
  setObjectRenderLayer(group, RENDER_LAYER_SHAPES);
  freezeStaticObjectMatrices(group);

  return group;
}

const RULER_TICK_TEXTURE_WIDTH = 2048;

/**
 * Zeichnet Teilstriche und Zehner-Zahlen auf einen deckenden Untergrund in der
 * Lineal-Farbe - anders als bei einer Bild-Deckplatte gibt es hier kein Foto,
 * das die Flaeche ohnehin fuellt, also muss die Tinte selbst fuer den
 * Untergrund sorgen, sonst waere die Deckflaeche stellenweise durchsichtig.
 */
function createRulerTickTexture(length: number, crossWidth: number, baseColor: string) {
  const canvas = document.createElement("canvas");
  canvas.width = RULER_TICK_TEXTURE_WIDTH;
  canvas.height = Math.max(1, Math.round((RULER_TICK_TEXTURE_WIDTH * crossWidth) / Math.max(1, length)));
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.fillStyle = baseColor;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#1a1a1a";
  context.strokeStyle = "#1a1a1a";
  context.textAlign = "center";
  context.textBaseline = "top";
  const pxPerMm = canvas.width / length;
  const lastMm = Math.floor(length);
  for (let value = 0; value <= lastMm; value += 1) {
    const isTen = value % 10 === 0;
    const isFive = value % 5 === 0;
    const x = value * pxPerMm;
    context.lineWidth = isTen ? 3 : 1.6;
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, canvas.height * (isTen ? 0.62 : isFive ? 0.42 : 0.26));
    context.stroke();
    if (isTen) {
      context.font = `600 ${Math.round(canvas.height * 0.24)}px ${WORKPLANE_LABEL_FONT_STACK}`;
      context.fillText(String(value), x, canvas.height * 0.66, pxPerMm * 9);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

function createRulerMaterials(shape: WorkplaneShape, sideMaterial: THREE.MeshStandardMaterial) {
  const sideMaterials = Array.from({ length: 5 }, (_, index) => (index === 0 ? sideMaterial : sideMaterial.clone()));
  const topMaterial = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.55, metalness: 0 });
  const texture = createRulerTickTexture(shapeWidth(shape), shapeDepth(shape), shape.color);
  if (texture) topMaterial.map = texture;
  return [sideMaterials[0], sideMaterials[1], topMaterial, sideMaterials[2], sideMaterials[3], sideMaterials[4]];
}

function createImagePlateMaterials(shape: WorkplaneShape, sideMaterial: THREE.MeshStandardMaterial, onTextureReady?: () => void) {
  const sideMaterials = Array.from({ length: 5 }, (_, index) => (index === 0 ? sideMaterial : sideMaterial.clone()));
  const topMaterial = new THREE.MeshStandardMaterial({
    color: "#ffffff",
    roughness: 0.64,
    metalness: 0,
    transparent: true,
    alphaTest: 0.02,
    side: THREE.FrontSide,
  });

  if (shape.imagePlate?.dataUrl) {
    const texture = imageTextureLoader.load(shape.imagePlate.dataUrl, () => {
      texture.needsUpdate = true;
      topMaterial.needsUpdate = true;
      onTextureReady?.();
    });
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    topMaterial.map = texture;
  }

  return [
    sideMaterials[0],
    sideMaterials[1],
    topMaterial,
    sideMaterials[2],
    sideMaterials[3],
    sideMaterials[4],
  ];
}

function taperGeometryForShape(geometry: THREE.BufferGeometry, shape: WorkplaneShape) {
  if (!shapeHasShapeDeform(shape)) return geometry;
  let tapered = geometry.userData.cached ? geometry.clone() : geometry;
  if (tapered !== geometry) {
    tapered.userData = {};
  }
  tapered.computeBoundingBox();
  const box = tapered.boundingBox;
  if (!box || !tapered.getAttribute("position")) return tapered;
  // A twist needs vertices partway up to turn; a box or prism has none between its ends (#184).
  const bands = twistBandCount(shape.extrudeTwist ?? 0);
  // (An image plate keeps its material groups for the picture; it is left as it was.)
  if (bands > 1 && !shape.imagePlate) {
    const flat = tapered.index ? tapered.toNonIndexed() : tapered;
    const sliced = new THREE.BufferGeometry();
    // Lengths across are judged in millimetres, also for a unit body stretched afterwards.
    const drawnX = Math.max(1e-6, box.max.x - box.min.x);
    const drawnZ = Math.max(1e-6, box.max.z - box.min.z);
    const drawnY = Math.max(1e-6, box.max.y - box.min.y);
    const mm: [number, number, number] = [shapeWidth(shape) / drawnX, shape.height / drawnY, shapeDepth(shape) / drawnZ];
    sliced.setAttribute("position", new THREE.BufferAttribute(positionsForTwist(flat.getAttribute("position").array, box.min.y, box.max.y, shape.extrudeTwist ?? 0, mm), 3));
    if (flat !== tapered) flat.dispose();
    if (!tapered.userData.cached) tapered.dispose();
    tapered = sliced;
  }
  const position = tapered.getAttribute("position");
  const height = Math.max(1e-6, box.max.y - box.min.y);
  const centerX = (box.min.x + box.max.x) / 2;
  const centerZ = (box.min.z + box.max.z) / 2;
  const deformed = shapeHasExtrudeDeform(shape);
  // A box, cylinder, polygon or sphere is drawn as a unit body (1 or 2 across) and stretched to
  // size afterwards; a turn and a lean belong to the stretched body, so they are worked out in
  // millimetres. A body drawn at its own size stretches by about 1 and is left alone.
  const stretch = (size: number, drawn: number) => {
    const factor = Math.max(1e-6, size) / Math.max(1e-6, drawn);
    return Math.abs(factor - 1) < 0.05 ? 1 : factor;
  };
  const scaleX = stretch(shapeWidth(shape), box.max.x - box.min.x);
  const scaleZ = stretch(shapeDepth(shape), box.max.z - box.min.z);
  const unit = scaleX !== 1 || scaleZ !== 1;
  for (let index = 0; index < position.count; index += 1) {
    const y = position.getY(index);
    const normalizedHeight = (y - box.min.y) / height;
    const widthScale = shapeTaperScaleAt(shape, normalizedHeight, "width");
    const depthScale = shapeTaperScaleAt(shape, normalizedHeight, "depth");
    let localX = centerX + (position.getX(index) - centerX) * widthScale;
    let localZ = centerZ + (position.getZ(index) - centerZ) * depthScale;
    if (deformed) {
      const deform = shapeExtrudeDeformAt(shape, normalizedHeight);
      const cos = Math.cos(deform.twistRadians);
      const sin = Math.sin(deform.twistRadians);
      const relativeX = (localX - centerX) * scaleX;
      const relativeZ = (localZ - centerZ) * scaleZ;
      localX = centerX + (relativeX * cos - relativeZ * sin + deform.offsetX) / scaleX;
      localZ = centerZ + (relativeX * sin + relativeZ * cos + deform.offsetZ) / scaleZ;
    }
    position.setXYZ(index, localX, y, localZ);
  }
  position.needsUpdate = true;
  if (bands > 1 && !shape.imagePlate) {
    // Smooth across the small folds between the bands, sharp at the body's own edges - judged in
    // millimetres: a unit body stretched afterwards would show its folds steeper or flatter.
    // The body stays in millimetres from here on, so its edge lines are judged there too;
    // addMesh takes the stretch it already holds out of the mesh's own.
    const scaleY = unit ? stretch(shape.height, box.max.y - box.min.y) : 1;
    if (unit) tapered.scale(scaleX, scaleY, scaleZ);
    tapered = toCreasedNormals(tapered, Math.PI / 6);
    if (unit) tapered.userData.stretchedBy = [scaleX, scaleY, scaleZ];
  } else {
    tapered.computeVertexNormals();
  }
  tapered.computeBoundingBox();
  tapered.computeBoundingSphere();
  return tapered;
}

function applyGroupedContentTaper(content: THREE.Group, shape: WorkplaneShape, baseBounds: THREE.Box3) {
  if (!shapeHasShapeDeform(shape)) return;
  const height = Math.max(1e-6, baseBounds.max.y - baseBounds.min.y);
  const centerX = (baseBounds.min.x + baseBounds.max.x) / 2;
  const centerZ = (baseBounds.min.z + baseBounds.max.z) / 2;
  const deformed = shapeHasExtrudeDeform(shape);
  content.updateMatrixWorld(true);
  const contentWorldInverse = content.matrixWorld.clone().invert();
  content.traverse((object) => {
    if (!(object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.LineSegments)) return;
    if (!(object.geometry instanceof THREE.BufferGeometry)) return;
    const sourcePosition = object.geometry.getAttribute("position");
    if (!sourcePosition) return;
    object.updateMatrixWorld(true);
    const localToContent = new THREE.Matrix4().multiplyMatrices(contentWorldInverse, object.matrixWorld);
    const contentToLocal = localToContent.clone().invert();
    if (object instanceof THREE.Mesh) {
      releaseSharedShapeGeometry(object);
    }
    const nextGeometry = object.geometry.clone();
    nextGeometry.userData = {};
    const position = nextGeometry.getAttribute("position");
    const point = new THREE.Vector3();
    for (let index = 0; index < position.count; index += 1) {
      point.fromBufferAttribute(position, index).applyMatrix4(localToContent);
      const normalizedHeight = (point.y - baseBounds.min.y) / height;
      const widthScale = shapeTaperScaleAt(shape, normalizedHeight, "width");
      const depthScale = shapeTaperScaleAt(shape, normalizedHeight, "depth");
      point.x = centerX + (point.x - centerX) * widthScale;
      point.z = centerZ + (point.z - centerZ) * depthScale;
      if (deformed) {
        const deform = shapeExtrudeDeformAt(shape, normalizedHeight);
        const cos = Math.cos(deform.twistRadians);
        const sin = Math.sin(deform.twistRadians);
        const relativeX = point.x - centerX;
        const relativeZ = point.z - centerZ;
        point.x = centerX + relativeX * cos - relativeZ * sin + deform.offsetX;
        point.z = centerZ + relativeX * sin + relativeZ * cos + deform.offsetZ;
      }
      point.applyMatrix4(contentToLocal);
      position.setXYZ(index, point.x, point.y, point.z);
    }
    position.needsUpdate = true;
    if (object instanceof THREE.Mesh) {
      nextGeometry.computeVertexNormals();
    }
    nextGeometry.computeBoundingBox();
    nextGeometry.computeBoundingSphere();
    object.geometry = nextGeometry;
    if (object instanceof THREE.Mesh && content.userData.acceleratedPicking !== false) {
      enableAcceleratedMeshPicking(object, nextGeometry, Boolean(shape.importedMesh));
    }
  });
}

function addMesh(
  group: THREE.Group,
  geometry: THREE.BufferGeometry,
  material: THREE.Material | THREE.Material[],
  shape: WorkplaneShape,
  position?: THREE.Vector3,
  rotation?: THREE.Euler,
  scale?: THREE.Vector3,
) {
  const based = geometry.userData.cached ? geometry : putGeometryOnBase(geometry);
  const prepared = taperGeometryForShape(based, shape);
  const mesh = new THREE.Mesh(prepared, material);
  mesh.userData.shapeSurface = true;
  retainSharedShapeGeometry(mesh, prepared);
  retainSharedShapeMaterials(mesh, material);
  if (group.userData.acceleratedPicking !== false && !shape.edgeTreatments?.length) {
    enableAcceleratedMeshPicking(mesh, prepared, Boolean(shape.importedMesh));
  }
  mesh.castShadow = true;
  mesh.receiveShadow = false;
  if (position) {
    mesh.position.copy(position);
  }
  mesh.position.y -= shape.height / 2;
  if (rotation) {
    mesh.rotation.copy(rotation);
  }
  if (scale) {
    mesh.scale.copy(scale);
    // A twisted unit body comes back already stretched to millimetres (taperGeometryForShape).
    const stretchedBy = prepared.userData.stretchedBy as [number, number, number] | undefined;
    if (stretchedBy) mesh.scale.divide(new THREE.Vector3(...stretchedBy));
  }
  group.add(mesh);
  addShapeEdgeDecorations(group, mesh, prepared, shape);
}

function addShapeEdgeDecorations(group: THREE.Group, mesh: THREE.Mesh, prepared: THREE.BufferGeometry, shape: WorkplaneShape) {
  const complexEdges =
    shape.kind === "mesh" ||
    Boolean(shape.importedMesh) ||
    ["cone", "pyramid", "roof", "roundRoof", "halfSphere", "torus", "tube", "ring", "star", "gear", "wedge", "polygon", "heart", "crescent", "slot", "dovetail", "hinge", "knurl", "teardrop", "counterbore", "countersink", "honeycomb", "loft"].includes(shape.kind);
  const importedTriangleCount = shape.importedMesh?.triangleCount ?? 0;
  const skipHeavyImportedEdges = Boolean(shape.importedMesh) && importedTriangleCount > IMPORTED_SELECTED_EDGE_TRIANGLE_LIMIT;
  // The setting draws a line on every body, in the colour chosen.
  const allEdgeLines = edgeLineStyle.enabled && importedTriangleCount <= ALL_EDGE_LINES_IMPORTED_TRIANGLE_LIMIT;
  if ((group.userData.showEdges || complexEdges || allEdgeLines) && (!skipHeavyImportedEdges || (allEdgeLines && !group.userData.showEdges))) {
    const selectedOutline = Boolean(group.userData.showEdges);
    const selectedRoundedBox = selectedOutline && shape.kind === "box" && Boolean(shape.radius && shape.radius > 0);
    const edgeColor = selectedOutline ? "#00aeea" : shape.hole ? "#697989" : allEdgeLines ? edgeLineStyle.color : complexEdges ? "#141b21" : darkenHex(shape.color, 0.34);
    // Edge lines on every body are a help to tell dark parts apart, not a drawing: half strength
    // keeps them readable without the hard black frame they had.
    const edgeOpacity = selectedRoundedBox ? 0 : selectedOutline ? 0.98 : shape.hole ? 0.44 : allEdgeLines ? 0.5 : complexEdges ? 0.38 : shape.kind === "text" ? 0.86 : 0.2;
    if (selectedOutline && shape.importedMesh && shape.cadDisplayEdgesVersion === 2 && Boolean(shape.cadDisplayEdges?.length)) {
      addCadDisplayEdges(group, shape, edgeColor, edgeOpacity);
    } else {
      // Ein Gewinde bei einem Grad Schwelle waere ein Knaeuel aus zehntausenden
      // Linien. Bei 25 Grad bleiben genau die Kanten stehen, die den Gang
      // zeichnen: Kuppe, Grund und die beiden Flanken.
      // Durch einen durchsichtigen Koerper scheinen auch die hinteren Kanten -
      // bei einem runden Koerper wird jede Facette zu einem Strich. Er zeigt
      // deshalb nur seine echten Kanten, etwa Deckel- und Bodenrand.
      // A twisted side folds a little at every band (#184): only its real edges get a line, as on a thread.
      const twisted = Math.abs(shape.extrudeTwist ?? 0) > 1e-6;
      const selectedThreshold = shape.importedMesh ? NORMAL_IMPORTED_SELECTION_EDGE_ANGLE : shape.kind === "thread" || twisted || (shape.transparent && !shape.hole) ? 25 : 1;
      const edgesGeometry = !selectedOutline && allEdgeLines
        ? calmEdgesGeometry(shape, prepared)
        : getEdgesGeometry(shape, prepared, selectedOutline ? selectedThreshold : twisted ? 25 : complexEdges ? 14 : 25);
      const edges = new THREE.LineSegments(edgesGeometry, sharedLineMaterial(edgeColor, edgeOpacity));
      edges.userData.complexEdge = complexEdges;
      edges.userData.shapeDecoration = true;
      edges.userData.shapeEdge = true;
      edges.position.copy(mesh.position);
      edges.rotation.copy(mesh.rotation);
      edges.scale.copy(mesh.scale);
      group.add(edges);
    }
  }
}

function addCadDisplayEdges(group: THREE.Group, shape: WorkplaneShape, color: string, opacity: number) {
  if (!shape.cadDisplayEdges?.length) return;
  const material = sharedLineMaterial(color, opacity, false);
  shape.cadDisplayEdges.forEach((edge) => {
    if (edge.points.length < 6) return;
    const positions = resizedImportedCoordinates(shape, edge.points);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    const line = new THREE.Line(geometry, material);
    line.position.y -= shape.height / 2;
    line.renderOrder = 1003;
    line.userData.complexEdge = true;
    line.userData.shapeDecoration = true;
    line.userData.cadDisplayEdge = true;
    group.add(line);
  });
}

function getImportedMeshCache(mesh: NonNullable<WorkplaneShape["importedMesh"]>) {
  const cached = importedGeometryCache.get(mesh);
  if (cached) {
    return cached;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(mesh.positions, 3));
  if (mesh.normals && mesh.normals.length === mesh.positions.length) {
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(mesh.normals, 3));
  } else {
    geometry.computeVertexNormals();
  }
  putGeometryOnBase(geometry);
  geometry.userData.cached = true;
  const next = { geometry, edges: new Map<number, THREE.EdgesGeometry>() };
  importedGeometryCache.set(mesh, next);
  return next;
}

function getImportedMeshGeometry(mesh: NonNullable<WorkplaneShape["importedMesh"]>) {
  return getImportedMeshCache(mesh).geometry;
}

function getPreservedImportedMeshGeometry(shape: WorkplaneShape) {
  const cached = preservedImportedGeometryCache.get(shape);
  if (cached) return cached;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(resizedImportedMeshPositions(shape), 3));
  geometry.computeVertexNormals();
  putGeometryOnBase(geometry);
  geometry.userData.cached = true;
  preservedImportedGeometryCache.set(shape, geometry);
  return geometry;
}

// Per mesh and per set of parts; a moved or resized group reuses the colours.
const partColoredGeometryCache = new WeakMap<object, WeakMap<object, THREE.BufferGeometry | null>>();
const PART_COLOR_TRIANGLE_LIMIT = 300_000;
const PART_COLOR_PROBE_DIRECTION = new THREE.Vector3(0.5774, 0.5773, 0.5775).normalize();

/**
 * The mesh of a group that was cut into one body, with every triangle in the
 * colour of the part it came from. Each triangle is looked up behind its own
 * face: the point lies inside the material it belongs to, so a face left by a
 * hole takes the colour of the body it was cut into.
 */
function getPartColoredMeshGeometry(shape: WorkplaneShape): THREE.BufferGeometry | null {
  const mesh = shape.importedMesh;
  const parts = shape.groupedShapes;
  if (!mesh || !parts?.length || mesh.triangleCount > PART_COLOR_TRIANGLE_LIMIT) return null;
  let byParts = partColoredGeometryCache.get(mesh);
  if (!byParts) {
    byParts = new WeakMap();
    partColoredGeometryCache.set(mesh, byParts);
  }
  if (byParts.has(parts)) return byParts.get(parts) ?? null;
  const geometry = buildPartColoredMeshGeometry(mesh, parts);
  byParts.set(parts, geometry);
  return geometry;
}

function buildPartColoredMeshGeometry(
  mesh: NonNullable<WorkplaneShape["importedMesh"]>,
  parts: WorkplaneShape[],
): THREE.BufferGeometry | null {
  // The parts in the frame of the mesh: both are stored around the group's
  // centre, standing on its lowest point.
  const solids: Array<{ probe: THREE.Mesh; box: THREE.Box3; color: THREE.Color }> = [];
  parts
    .filter((part) => !part.hole && !part.hidden)
    .forEach((part) => {
      const object = createShapeObject(part, false, undefined, false);
      object.updateMatrixWorld(true);
      object.traverse((node) => {
        if (!(node instanceof THREE.Mesh) || !node.visible) return;
        const material = Array.isArray(node.material) ? node.material[0] : node.material;
        const source = node.geometry as THREE.BufferGeometry;
        if (!source.getAttribute("position")) return;
        const geometry = source.index ? source.toNonIndexed() : source.clone();
        geometry.applyMatrix4(node.matrixWorld);
        geometry.computeBoundingBox();
        computeBoundsTree.call(geometry, { targetLeafSize: 12 });
        const probe = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
        probe.raycast = acceleratedRaycast;
        const color = material instanceof THREE.MeshStandardMaterial ? material.color.clone() : new THREE.Color(part.color);
        solids.push({ probe, box: geometry.boundingBox ?? new THREE.Box3(), color });
      });
      disposeObject(object);
    });
  if (solids.length === 0) return null;

  const base = getImportedMeshGeometry(mesh);
  const positions = base.getAttribute("position");
  const triangleCount = Math.floor(positions.count / 3);
  const colors = new Float32Array(positions.count * 3);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const edge = new THREE.Vector3();
  const probePoint = new THREE.Vector3();
  const raycaster = new THREE.Raycaster();
  const size = new THREE.Box3().setFromBufferAttribute(positions as THREE.BufferAttribute).getSize(new THREE.Vector3()).length();
  const inset = Math.min(0.05, Math.max(1e-4, size * 1e-4));
  // The plate stands the mesh on y = 0; the parts were placed against the
  // stored positions, which may sit a hair higher or lower.
  const offsetY = lowestY(mesh.positions);
  const insideOf = (point: THREE.Vector3) => {
    for (const solid of solids) {
      if (!solid.box.containsPoint(point)) continue;
      raycaster.set(point, PART_COLOR_PROBE_DIRECTION);
      if (raycaster.intersectObject(solid.probe, false).length % 2 === 1) return solid;
    }
    return null;
  };
  const nearestTo = (point: THREE.Vector3) => {
    let best = solids[0];
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const solid of solids) {
      const distance = solid.box.distanceToPoint(point);
      if (distance < bestDistance) {
        best = solid;
        bestDistance = distance;
      }
    }
    return best;
  };
  for (let triangle = 0; triangle < triangleCount; triangle += 1) {
    const offset = triangle * 3;
    a.fromBufferAttribute(positions, offset);
    b.fromBufferAttribute(positions, offset + 1);
    c.fromBufferAttribute(positions, offset + 2);
    // Outward normal, then a step back from the face into the material.
    normal.subVectors(b, a).cross(edge.subVectors(c, a)).normalize();
    probePoint.addVectors(a, b).add(c).multiplyScalar(1 / 3);
    probePoint.y += offsetY;
    probePoint.addScaledVector(normal, -inset);
    const solid = insideOf(probePoint) ?? nearestTo(probePoint);
    for (let corner = 0; corner < 3; corner += 1) {
      colors[(offset + corner) * 3] = solid.color.r;
      colors[(offset + corner) * 3 + 1] = solid.color.g;
      colors[(offset + corner) * 3 + 2] = solid.color.b;
    }
  }
  solids.forEach(({ probe }) => {
    disposeBoundsTree.call(probe.geometry);
    probe.geometry.dispose();
    (probe.material as THREE.Material).dispose();
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", positions);
  const normals = base.getAttribute("normal");
  if (normals) geometry.setAttribute("normal", normals);
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.boundingBox = base.boundingBox?.clone() ?? null;
  geometry.boundingSphere = base.boundingSphere?.clone() ?? null;
  geometry.userData.cached = true;
  return geometry;
}

function lowestY(positions: ArrayLike<number>) {
  let lowest = Number.POSITIVE_INFINITY;
  for (let index = 1; index < positions.length; index += 3) lowest = Math.min(lowest, positions[index]);
  return Number.isFinite(lowest) ? lowest : 0;
}

function getEdgesGeometry(shape: WorkplaneShape, geometry: THREE.BufferGeometry, threshold: number) {
  const importedCache = shape.importedMesh && !preservesEdgeTreatmentSize(shape) && !shapeHasShapeDeform(shape)
    ? getImportedMeshCache(shape.importedMesh).edges
    : null;
  let cache = importedCache ?? sharedEdgesGeometryCache.get(geometry);
  if (!cache) {
    cache = new Map<number, THREE.EdgesGeometry>();
    sharedEdgesGeometryCache.set(geometry, cache);
  }

  const cached = cache.get(threshold);
  if (cached) {
    return cached;
  }

  const edges = new THREE.EdgesGeometry(geometry, threshold);
  edges.userData.cached = true;
  cache.set(threshold, edges);
  return edges;
}

/** Above this many line pieces a body's edges stop outlining it and start covering it. */
const ALL_EDGE_LINES_SEGMENT_LIMIT = 1500;

/**
 * The edge lines drawn on every body: creases from 25°, but a body with a texture of small faces -
 * a thread, a knurl, a spring - would turn into a black mass of lines. For those the crease
 * angle steps up until only its real outline is left, such as the rims of the ends.
 */
function calmEdgesGeometry(shape: WorkplaneShape, geometry: THREE.BufferGeometry) {
  let edges = getEdgesGeometry(shape, geometry, 25);
  for (const threshold of [45, 70]) {
    if (edges.getAttribute("position").count / 2 <= ALL_EDGE_LINES_SEGMENT_LIMIT) break;
    edges = getEdgesGeometry(shape, geometry, threshold);
  }
  return edges;
}

function setComplexEdgeVisibility(object: THREE.Object3D, visible: boolean) {
  object.traverse((child) => {
    if (child.userData.complexEdge) {
      child.visible = visible;
    }
  });
}

function addTextShape(group: THREE.Group, material: THREE.MeshStandardMaterial, shape: WorkplaneShape, geometryCacheKey: string) {
  const geometry = sharedShapeGeometry(geometryCacheKey, () => textDisplayGeometry(shape));
  addMesh(group, geometry, material, shape);
}

function putGeometryOnBase(geometry: THREE.BufferGeometry) {
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  const minY = geometry.boundingBox?.min.y ?? 0;
  geometry.translate(0, -minY, 0);
  return geometry;
}

function createRoofGeometry(width: number, height: number, depth: number) {
  const w = width / 2;
  const d = depth / 2;
  const vertices = new Float32Array([
    -w, 0, -d, w, 0, -d, 0, height, -d,
    -w, 0, d, w, 0, d, 0, height, d,
  ]);
  const indices = [
    0, 2, 1,
    3, 4, 5,
    0, 1, 4, 0, 4, 3,
    0, 3, 5, 0, 5, 2,
    1, 2, 5, 1, 5, 4,
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  return geometry.toNonIndexed();
}

function createWedgeGeometry(width: number, height: number, depth: number) {
  const w = width / 2;
  const d = depth / 2;
  const vertices = new Float32Array([
    -w, 0, -d, w, 0, -d, w, height, -d,
    -w, 0, d, w, 0, d, w, height, d,
  ]);
  const indices = [
    0, 2, 1,
    3, 4, 5,
    0, 1, 4, 0, 4, 3,
    1, 2, 5, 1, 5, 4,
    0, 3, 5, 0, 5, 2,
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  return geometry.toNonIndexed();
}

function createTorusGeometry(width: number, height: number, depth: number) {
  const tubeRadius = Math.max(0.1, height / 2);
  const majorRadius = Math.max(0.2, Math.min(width, depth) / 2 - tubeRadius);
  const geometry = new THREE.TorusGeometry(majorRadius, tubeRadius, 36, 144);
  geometry.rotateX(Math.PI / 2);
  const outerDiameter = (majorRadius + tubeRadius) * 2;
  geometry.scale(width / outerDiameter, 1, depth / outerDiameter);
  return geometry.toNonIndexed();
}

function createHollowCylinderGeometry(width: number, height: number, depth: number, thickness: number, segments = 96) {
  const outerX = width / 2;
  const outerZ = depth / 2;
  const safeThickness = clamp(thickness, 0.1, Math.max(0.1, Math.min(outerX, outerZ) - 0.1));
  const innerX = Math.max(0.1, outerX - safeThickness);
  const innerZ = Math.max(0.1, outerZ - safeThickness);
  const count = Math.max(12, Math.round(segments));
  const positions: number[] = [];
  const point = (rx: number, rz: number, y: number, index: number): [number, number, number] => {
    const angle = (index / count) * Math.PI * 2;
    return [Math.cos(angle) * rx, y, Math.sin(angle) * rz];
  };
  const addTri = (a: [number, number, number], b: [number, number, number], c: [number, number, number]) => positions.push(...a, ...b, ...c);
  const addQuad = (a: [number, number, number], b: [number, number, number], c: [number, number, number], d: [number, number, number]) => {
    addTri(a, b, c);
    addTri(a, c, d);
  };

  for (let index = 0; index < count; index += 1) {
    const next = index + 1;
    const ob0 = point(outerX, outerZ, 0, index);
    const ob1 = point(outerX, outerZ, 0, next);
    const ot0 = point(outerX, outerZ, height, index);
    const ot1 = point(outerX, outerZ, height, next);
    const ib0 = point(innerX, innerZ, 0, index);
    const ib1 = point(innerX, innerZ, 0, next);
    const it0 = point(innerX, innerZ, height, index);
    const it1 = point(innerX, innerZ, height, next);

    addQuad(ob0, ot0, ot1, ob1);
    addQuad(ib1, it1, it0, ib0);
    addQuad(ot0, it0, it1, ot1);
    addQuad(ob0, ob1, ib1, ib0);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  return geometry;
}

function createRoundRoofGeometry(width: number, height: number, depth: number, sides = 64) {
  const radius = width / 2;
  const segments = Math.max(4, Math.round(sides));
  const shape = new THREE.Shape();
  shape.moveTo(-radius, 0);
  shape.absarc(0, 0, radius, Math.PI, 0, true);
  shape.lineTo(-radius, 0);
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1, curveSegments: segments });
  geometry.translate(0, 0, -depth / 2);
  geometry.scale(1, height / Math.max(0.001, radius), 1);
  return geometry.toNonIndexed();
}

function createHalfSphereGeometry(width: number, height: number, depth: number, steps = 32) {
  const lon = Math.max(8, Math.round(steps) * 2);
  const lat = Math.max(4, Math.round(steps / 2));
  const rx = width / 2;
  const rz = depth / 2;
  const positions: number[] = [];
  const normals: number[] = [];
  const point = (latIndex: number, lonIndex: number): [number, number, number] => {
    const theta = (latIndex / lat) * (Math.PI / 2);
    const phi = ((lonIndex % lon) / lon) * Math.PI * 2;
    const ring = Math.sin(theta);
    return [Math.cos(phi) * rx * ring, Math.cos(theta) * height, Math.sin(phi) * rz * ring];
  };
  const normal = ([x, y, z]: [number, number, number]): [number, number, number] => {
    const vector = new THREE.Vector3(x / Math.max(0.001, rx * rx), y / Math.max(0.001, height * height), z / Math.max(0.001, rz * rz)).normalize();
    return [vector.x, vector.y, vector.z];
  };
  const addTri = (a: [number, number, number], b: [number, number, number], c: [number, number, number]) => {
    positions.push(...a, ...b, ...c);
    normals.push(...normal(a), ...normal(b), ...normal(c));
  };
  const addCapTri = (a: [number, number, number], b: [number, number, number], c: [number, number, number]) => {
    positions.push(...a, ...b, ...c);
    normals.push(0, -1, 0, 0, -1, 0, 0, -1, 0);
  };

  const top: [number, number, number] = [0, height, 0];
  for (let xStep = 0; xStep < lon; xStep += 1) {
    addTri(top, point(1, xStep + 1), point(1, xStep));
  }

  for (let yStep = 1; yStep < lat; yStep += 1) {
    for (let xStep = 0; xStep < lon; xStep += 1) {
      const next = xStep + 1;
      const a = point(yStep, xStep);
      const b = point(yStep, next);
      const c = point(yStep + 1, next);
      const d = point(yStep + 1, xStep);
      addTri(a, c, d);
      addTri(a, b, c);
    }
  }

  const capY = 0;
  const bottomCenter: [number, number, number] = [0, capY, 0];
  const capPoint = (lonIndex: number): [number, number, number] => {
    const phi = ((lonIndex % lon) / lon) * Math.PI * 2;
    return [Math.cos(phi) * rx, capY, Math.sin(phi) * rz];
  };
  for (let xStep = 0; xStep < lon; xStep += 1) {
    addCapTri(bottomCenter, capPoint(xStep), capPoint(xStep + 1));
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  return geometry;
}

function syncSplitPlane(state: ThreeState | null, plane: ModelSplitPlane | null, handleActive = false) {
  if (!state) return;
  disposeChildren(state.splitLayer);
  if (!plane) {
    state.splitLayer.visible = false;
    state.needsRender = true;
    return;
  }

  const size = Math.max(10, plane.size);
  const root = new THREE.Group();
  root.position.set(...plane.origin);
  root.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...plane.normal).normalize());

  const surface = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({
      color: "#d07313",
      transparent: true,
      opacity: 0.24,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
    }),
  );
  surface.renderOrder = 900;
  root.add(surface);

  const border = new THREE.LineSegments(
    new THREE.EdgesGeometry(surface.geometry),
    new THREE.LineBasicMaterial({ color: "#b35f07", transparent: true, opacity: 0.95, depthTest: false }),
  );
  border.renderOrder = 901;
  root.add(border);

  const crossGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-size / 2, 0, 0), new THREE.Vector3(size / 2, 0, 0),
    new THREE.Vector3(0, -size / 2, 0), new THREE.Vector3(0, size / 2, 0),
  ]);
  const cross = new THREE.LineSegments(
    crossGeometry,
    new THREE.LineBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.8, depthTest: false }),
  );
  cross.renderOrder = 902;
  root.add(cross);

  const normalLength = Math.max(8, size * 0.18);
  const headLength = Math.max(2.5, normalLength * 0.18);
  const normalGuide = new THREE.ArrowHelper(
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, 0, -normalLength / 2),
    normalLength,
    handleActive ? 0xff9a2e : 0xb35f07,
    headLength,
    Math.max(1.5, normalLength * 0.1),
  );
  [normalGuide.line.material, normalGuide.cone.material].forEach((material) => {
    (Array.isArray(material) ? material : [material]).forEach((entry) => {
      entry.depthTest = false;
    });
  });
  normalGuide.renderOrder = 903;
  root.add(normalGuide);

  // The cone alone is a small target; this invisible ball around it takes the
  // pointer for dragging the plane along its normal.
  const handleHit = new THREE.Mesh(
    new THREE.SphereGeometry(headLength, 12, 8),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  handleHit.position.set(0, 0, normalLength / 2 - headLength / 2);
  handleHit.userData.splitPlaneHandle = true;
  root.add(handleHit);

  root.traverse((child) => child.layers.set(RENDER_LAYER_PREVIEWS));
  state.splitLayer.add(root);
  state.splitLayer.visible = true;
  state.needsRender = true;
}

function pointerRayFor(state: ThreeState, clientX: number, clientY: number) {
  const rect = state.renderer.domElement.getBoundingClientRect();
  state.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  state.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  state.raycaster.setFromCamera(state.pointer, state.camera);
  return state.raycaster.ray;
}

function pickSplitPlaneHandle(state: ThreeState, clientX: number, clientY: number) {
  if (!state.splitLayer.visible) return false;
  pointerRayFor(state, clientX, clientY);
  state.raycaster.layers.set(RENDER_LAYER_PREVIEWS);
  return state.raycaster.intersectObjects(state.splitLayer.children, true).some((hit) => hit.object.userData.splitPlaneHandle === true);
}

/** Where along the plane's normal line the pointer ray passes closest, or null when the view looks along that line. */
function splitAxisParameter(state: ThreeState, clientX: number, clientY: number, axisOrigin: THREE.Vector3, axisNormal: THREE.Vector3) {
  const ray = pointerRayFor(state, clientX, clientY);
  const between = new THREE.Vector3().subVectors(axisOrigin, ray.origin);
  const alignment = axisNormal.dot(ray.direction);
  const denominator = 1 - alignment * alignment;
  if (denominator < 1e-4) return null;
  return (alignment * between.dot(ray.direction) - between.dot(axisNormal)) / denominator;
}

function disposeChildren(group: THREE.Group) {
  while (group.children.length > 0) {
    const child = group.children[group.children.length - 1];
    if (child) {
      group.remove(child);
      disposeObject(child);
    }
  }
}

function prepareCruiseGhost(object: THREE.Object3D) {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.raycast = () => {};
    child.castShadow = false;
    child.receiveShadow = false;
    const sources = Array.isArray(child.material) ? child.material : [child.material];
    const clones = sources.map((material) => {
      const clone = material.clone();
      clone.userData = { ...material.userData, cached: false };
      delete clone.userData.sharedShapeMaterialKey;
      clone.transparent = true;
      clone.opacity = Math.min(clone.opacity, 0.65);
      return clone;
    });
    releaseSharedShapeMaterials(child);
    child.material = clones.length === 1 ? clones[0] : clones;
    child.userData.sharedShapeMaterialKeys = [];
  });
}

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh | THREE.LineSegments;
    if ("geometry" in mesh && mesh.geometry) {
      releaseSharedShapeGeometry(mesh);
      if (!mesh.geometry.userData.cached) {
        if ((mesh.geometry as THREE.BufferGeometry & { boundsTree?: unknown }).boundsTree) {
          disposeBoundsTree.call(mesh.geometry);
        }
        mesh.geometry.dispose();
      }
    }
    if ("material" in mesh && mesh.material) {
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      releaseSharedShapeMaterials(mesh);
      materials.forEach(disposeMaterialResource);
      trimSharedShapeMaterialCache();
    }
  });
}

function darkenHex(hex: string, amount: number) {
  const clean = hex.replace("#", "");
  const value = Number.parseInt(clean.length === 3 ? clean.split("").map((char) => char + char).join("") : clean, 16);
  const r = Math.max(0, Math.floor(((value >> 16) & 255) * (1 - amount)));
  const g = Math.max(0, Math.floor(((value >> 8) & 255) * (1 - amount)));
  const b = Math.max(0, Math.floor((value & 255) * (1 - amount)));
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}
