"use client";

import { ChevronLeft, ChevronRight, Crosshair, Cuboid, Home, Minus, MousePointer2, PanelsTopLeft, Plus, Rotate3d, Rows3, Ruler, RulerDimensionLine, X } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type Dispatch, type DragEvent, type MutableRefObject, type PointerEvent as ReactPointerEvent, type SetStateAction, type WheelEvent as ReactWheelEvent } from "react";
import * as THREE from "three";
import { Brush, Evaluator, HOLLOW_INTERSECTION } from "three-bvh-csg";
import { acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from "three-mesh-bvh";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { FontLoader, type Font, type FontData } from "three/examples/jsm/loaders/FontLoader.js";
import droidMonoFontJson from "three/examples/fonts/droid/droid_sans_mono_regular.typeface.json";
import droidSansBoldFontJson from "three/examples/fonts/droid/droid_sans_bold.typeface.json";
import droidSerifBoldFontJson from "three/examples/fonts/droid/droid_serif_bold.typeface.json";
import gentilisBoldFontJson from "three/examples/fonts/gentilis_bold.typeface.json";
import helvetikerBoldFontJson from "three/examples/fonts/helvetiker_bold.typeface.json";
import optimerBoldFontJson from "three/examples/fonts/optimer_bold.typeface.json";
import { AlignOverlay, MirrorOverlay, type AlignOverlayState, type MirrorOverlayState } from "@/components/workplane/ActionOverlays";
import { MoveDimensionOverlay } from "@/components/workplane/MoveDimensionOverlay";
import { OriginDimensionOverlay } from "@/components/workplane/OriginDimensionOverlay";
import { ShapeInspector, SnapGridControl, type ShapeInspectorUpdateOptions } from "@/components/workplane/ShapeInspector";
import { WorkspaceSettingsModal } from "@/components/workplane/WorkspaceSettingsModal";
import { appThemePalette, type AppThemePalette, type AppThemePreference, type ResolvedAppTheme } from "@/lib/appTheme";
import { cadModifierPrimitiveForBakedShape, cadTransformFromMatrix, cadTransformToMatrix } from "@/lib/cadBakeMetadata";
import { t } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";
import { orthographicFramingZoom, perspectiveFramingDistance } from "@/lib/cameraFraming";
import { createGearGeometry } from "@/lib/gearGeometry";
import { createStarGeometry } from "@/lib/starGeometry";
import { createHeartGeometry } from "@/lib/heartGeometry";
import { createCrescentGeometry } from "@/lib/crescentGeometry";
import { createSlotGeometry } from "@/lib/slotGeometry";
import { createHoneycombGeometry } from "@/lib/honeycombGeometry";
import { createRoundedBoxGeometry } from "@/lib/roundedBoxGeometry";
import { createBentTubeGeometry } from "@/lib/bentTubeGeometry";
import { createThreadGeometry } from "@/lib/threadGeometry";
import { createSpringGeometry } from "@/lib/springGeometry";
import { parseMeasurementInput } from "@/lib/measurementUnits";
import {
  computeCornerRulerRelativeCoordinates,
  computeCornerRulerShift,
  cornerRulerDimensionMatchesFromCorner,
  cornerRulerTicks,
  pointAlongRuler,
  rulerDimensionMatch,
  type CornerRulerMode,
  type RulerDimensionField,
  type RulerDimensionMatch,
} from "@/lib/rulerDimensions";
import { createMoveDimensionOverlay, type MoveDimensionAxis, type MoveDimensionOverlayData } from "@/lib/moveDimensionLines";
import { computeOriginAxisDistance, createOriginDimensionOverlay, type OriginDimensionOverlayData } from "@/lib/originDimensionLines";
import {
  horizontalPlacementWorkplane,
  placementWorkplaneCoordinates,
  placementWorkplaneFromSurface,
  placementWorkplaneIsBase,
  placementWorkplanePoint,
  placementWorkplaneQuaternion,
  snapPlacementWorkplaneOrigin,
  type PlacementPoint,
  type PlacementWorkplane,
} from "@/lib/placementWorkplane";
import { groundFootprintForFrame, liftGeometryForFrame, type SelectionFrame } from "@/lib/liftGeometry";
import { regularPolygonFootprintScale } from "@/lib/regularPolygonFootprint";
import { roundSideCount } from "@/lib/roundSideCount";
import { createPyramidGeometry } from "@/lib/pyramidGeometry";
import { projectThumbnailDimensions } from "@/lib/projectThumbnail";
import { canBeginShapeDrag, DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE, normalizeSnapGrid, normalizeWorkspaceSettings, shapeDimensionLimit, snapGridStep as snapStep, workplaneSettingsFingerprint, workspaceHydrationSyncDecision } from "@/lib/workplaneSettings";
import { interiorWorkplaneGridCoordinates, workplaneGridPalette, workplaneLabelLayout, workplaneThemePalette, WORKPLANE_LABEL_ASPECT, WORKPLANE_LINE_ELEVATION, WORKPLANE_MAJOR_GRID_INTERVAL } from "@/lib/workplaneGrid";
import { cleanNearZero, cleanRotationDegrees, isNonSolidShapeKind, mirroredAxisCount, mirrorSign, preservesEdgeTreatmentSize, proportionalResizeScale, resizedImportedCoordinates, resizedImportedMeshPositions, resizedShapeSize, shapeDepth, shapeExtrudeDeformAt, shapeHasExtrudeDeform, shapeHasShapeDeform, shapeHasTaper, shapeOverallFootprintDimensions, shapeTaperDimensions, shapeTaperScaleAt, shapeWidth, shapeWithParametricSource } from "@/lib/workplaneShapes";
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
import { NOTE_TEXT_LIMIT } from "@/lib/workplaneNotes";
import type { CadModifierEdge } from "@/lib/cadModifierTypes";

const WORKPLANE_WIDTH = 200;
const WORKPLANE_DEPTH = 140;
const MIN_GRID_BLOCK_SIZE = 1;
const MAX_GRID_BLOCK_SIZE = 200;
const WORKSPACE_DEFAULTS_STORAGE_PREFIX = "layerling.workspaceDefault.";
const MOVE_DIMENSIONS_ENABLED_STORAGE_KEY = "layerling.editor.moveDimensionsEnabled";
const ORIGIN_DIMENSIONS_ENABLED_STORAGE_KEY = "layerling.editor.originDimensionsEnabled";
/** Light-blue chrome for origin-distance lines, matching `.origin-dimension-value`. */
const ORIGIN_DIMENSION_LINE_COLOR = { light: "#6ec4e8", dark: "#8fd4f0" } as const;
/** Kreuzbreite und Vorgabe-Armlaengen des Winkellineal-Werkzeugs - kein Formen-Katalog-Eintrag mehr, siehe layerling-lineal.md. */
const CORNER_RULER_ARM_WIDTH = 12;
const CORNER_RULER_DEFAULT_ARM_X = 100;
const CORNER_RULER_DEFAULT_ARM_Z = 80;
const DEFAULT_WORKSPACE = DEFAULT_WORKPLANE_WORKSPACE;
const CAMERA_FOV = 38;
const CAMERA_HOME = new THREE.Vector3(118, 96, 118);
const CAMERA_TARGET = new THREE.Vector3(0, 0, 0);
const MIN_SHAPE_SIZE = 0.01;
const CUT_PREVIEW_PADDING = 0.01;
const MIN_ELEVATION = -180;
const MAX_ELEVATION = 220;
/** World-space offset from the height handle to the lift handle, as a fraction of selection height. */
const LIFT_HANDLE_HEIGHT_OFFSET_FRACTION = 0.30;
const CAMERA_MIN_TARGET_Y = -70;
const CAMERA_MAX_TARGET_Y = 120;
const ROTATION_PROTRACTOR_OUTER_RADIUS = 94;
const RENDER_LAYER_WORKPLANE = 0;
const RENDER_LAYER_SHAPES = 1;
const RENDER_LAYER_HELPERS = 2;
const RENDER_LAYER_MODIFIERS = 3;
const RENDER_LAYER_PREVIEWS = 4;
const BVH_PICKING_TRIANGLE_THRESHOLD = 512;
const SHAPE_KINDS = new Set<ShapeAsset["kind"]>([
  "box",
  "cylinder",
  "slot",
  "ellipse",
  "sphere",
  "sketch",
  "scribble",
  "cone",
  "pyramid",
  "roof",
  "text",
  "roundRoof",
  "halfSphere",
  "torus",
  "tube",
  "bentTube",
  "star",
  "heart",
  "crescent",
  "gear",
  "honeycomb",
  "thread",
  "spring",
  "ring",
  "wedge",
  "polygon",
  "icosahedron",
  "mesh",
]);
const fontLoader = new FontLoader();
const textFonts: Record<string, Font> = {
  Multilanguage: fontLoader.parse(helvetikerBoldFontJson as FontData),
  Sans: fontLoader.parse(droidSansBoldFontJson as FontData),
  Serif: fontLoader.parse(droidSerifBoldFontJson as FontData),
  Script: fontLoader.parse(gentilisBoldFontJson as FontData),
  Monospace: fontLoader.parse(droidMonoFontJson as FontData),
  Rounded: fontLoader.parse(optimerBoldFontJson as FontData),
  Stencil: fontLoader.parse(helvetikerBoldFontJson as FontData),
};
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
const sharedLineMaterialCache = new Map<string, THREE.LineBasicMaterial>();
const shapeResourceIds = new WeakMap<object, number>();
let nextShapeResourceId = 1;
const imageTextureLoader = new THREE.TextureLoader();
const IMPORTED_SELECTED_EDGE_TRIANGLE_LIMIT = 40000;
const NORMAL_IMPORTED_SELECTION_EDGE_ANGLE = 60;
const MODIFIER_EDGE_PICK_RADIUS_PX = 14;

function parseDroppedShapeAsset(raw: string): ShapeAsset | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") {
      return null;
    }
    const asset = value as Partial<ShapeAsset>;
    if (
      typeof asset.id !== "string" ||
      typeof asset.name !== "string" ||
      typeof asset.src !== "string" ||
      typeof asset.color !== "string" ||
      !SHAPE_KINDS.has(asset.kind as ShapeAsset["kind"]) ||
      (asset.hole !== undefined && typeof asset.hole !== "boolean")
    ) {
      return null;
    }
    return {
      id: asset.id,
      name: asset.name,
      src: asset.src,
      kind: asset.kind as ShapeAsset["kind"],
      color: asset.color,
      hole: asset.hole,
    };
  } catch {
    return null;
  }
}

type WorkplaneViewportProps = {
  shapes: WorkplaneShape[];
  selectedIds: string[];
  alignMode: boolean;
  alignAnchorId: string | null;
  alignHandles: AlignHandleStatus[];
  alignReferenceShapes: WorkplaneShape[];
  mirrorMode: boolean;
  mirrorReferenceShapes: WorkplaneShape[];
  placementWorkplane: PlacementWorkplane;
  workplaneMode: boolean;
  initialSnap?: GridSize;
  initialWorkspace?: WorkplaneWorkspaceSettings;
  workspaceSettingsKey?: string | null;
  showProjectNameInToolbar?: boolean;
  onShowProjectNameInToolbarChange?: (show: boolean) => void;
  onAddShape: (shape: ShapeAsset, point?: PlacementPoint) => void;
  onAlignAnchorChange: (id: string) => void;
  onAlignPreview: (axis: AlignAxis, target: AlignTarget) => void;
  onAlignPreviewClear: () => void;
  onAlignSelection: (axis: AlignAxis, target: AlignTarget) => void;
  onMirrorPreview: (axis: AlignAxis) => void;
  onMirrorPreviewClear: () => void;
  onMirrorSelection: (axis: AlignAxis) => void;
  onSelectShape: (id: string | string[] | null, mode?: "replace" | "toggle") => void;
  onSetPlacementWorkplane: (workplane: PlacementWorkplane, source: "shape" | "base") => void;
  onToggleWorkplaneTool: () => void;
  onInteractionActiveChange?: (active: boolean) => void;
  onEditSketch?: () => void;
  canSeparateParts?: boolean;
  onSeparateParts?: () => void;
  onUpdateShape: (id: string, patch: ShapeUpdatePatch) => void;
  onDuplicateShapeAt?: (id: string, position: { x: number; z: number }) => void;
  notes?: WorkplaneNote[];
  notesVisible?: boolean;
  noteMode?: boolean;
  onNoteAdd?: (note: { x: number; y: number; z: number; anchor?: WorkplaneNoteAnchor }) => string | null;
  onNoteUpdate?: (id: string, patch: Partial<WorkplaneNote>, transient?: boolean) => void;
  onNoteRemove?: (id: string) => void;
  onNoteModeChange?: (active: boolean) => void;
  onWorkspaceSettingsChange?: (settings: { workspace: WorkplaneWorkspaceSettings; snap: GridSize }) => void;
  projectName?: string;
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
};

type WorkspaceSettings = WorkplaneWorkspaceSettings;
type ViewCubeFace = "top" | "bottom" | "front" | "back" | "right" | "left";

const VIEW_FACE_SHORTCUTS: Readonly<Record<string, ViewCubeFace>> = {
  "1": "front",
  "2": "back",
  "3": "left",
  "4": "right",
  "5": "top",
  "6": "bottom",
};

function readSavedWorkspaceDefault(key: string | null) {
  if (!key || typeof window === "undefined") {
    return null;
  }
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

function readOriginDimensionsEnabled() {
  if (typeof window === "undefined") {
    return true;
  }
  return window.localStorage.getItem(ORIGIN_DIMENSIONS_ENABLED_STORAGE_KEY) !== "false";
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
  shapeLayer: THREE.Group;
  helperLayer: THREE.Group;
  transformGuideLayer: THREE.Group;
  moveDimensionLayer: THREE.Group;
  originDimensionLayer: THREE.Group;
  modifierLayer: THREE.Group;
  shapeRecords: Map<string, ShapeRenderRecord>;
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

function isVerticalMeasureHandleKind(kind: TransformHandleKind) {
  return kind === "height" || kind === "lift";
}

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

function shouldBuildCutPreviews(transform: TransformDragState | null, drag: DragState | null) {
  return !drag && (!transform || transform.kind === "scale" || transform.kind === "height");
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
  const euler = new THREE.Euler().setFromQuaternion(quaternion, "XYZ");
  return {
    rotationX: cleanRotationDegrees(THREE.MathUtils.radToDeg(euler.x)),
    rotation: cleanRotationDegrees(THREE.MathUtils.radToDeg(euler.y)),
    rotationZ: cleanRotationDegrees(THREE.MathUtils.radToDeg(euler.z)),
  };
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
    depthTest: false,
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
    helixAngle: shape.helixAngle,
    threadRole: shape.threadRole,
    threadHead: shape.threadHead,
    threadHand: shape.threadHand,
    threadProfile: shape.threadProfile,
    threadDiameter: shape.threadDiameter,
    threadPitch: shape.threadPitch,
    threadClearance: shape.threadClearance,
    threadQuality: shape.threadQuality,
    threadHeadHeight: shape.threadHeadHeight,
    threadChamfer: shape.threadChamfer,
    threadHeadChamfer: shape.threadHeadChamfer,
    springTurns: shape.springTurns,
    springWire: shape.springWire,
    springQuality: shape.springQuality,
    helixQuality: shape.helixQuality,
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
    color: shape.color,
    hole: Boolean(shape.hole),
    imagePlate: shapeResourceId(shape.imagePlate),
    imageData: shape.imagePlate?.dataUrl ?? "",
    sourceFormat: shape.importedMesh?.sourceFormat ?? "",
    mirrored: mirroredAxisCount(shape) % 2,
    cadEdges: shapeResourceId(shape.cadDisplayEdges),
    cadEdgesVersion: shape.cadDisplayEdgesVersion ?? 0,
    cadEdgeDimensions: shape.cadDisplayEdges?.length ? [shapeWidth(shape), shapeDepth(shape), shape.height] : null,
    groupedMaterials: shape.groupedShapes?.map((child) => [child.id, child.hidden, shapeMaterialSignature(shape.hole ? { ...child, hole: true, color: "#b8c2cc" } : child)]),
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
  const taper = shape.kind === "gear" || shape.kind === "thread" || shape.kind === "spring" || shape.kind === "star" || shape.kind === "heart" || shape.kind === "crescent" || shape.kind === "slot" || shape.kind === "honeycomb" || shape.kind === "roundedBox" || shape.kind === "bentTube" || !shapeHasTaper(shape)
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
      taper,
      deform,
      preserve: preservesEdgeTreatmentSize(shape)
        ? [shapeWidth(shape), shapeDepth(shape), shape.height, shape.edgeTreatments]
        : false,
    });
  }

  if (shape.kind === "box" && !(shape.radius && shape.radius > 0)) {
    return JSON.stringify({ kind: "box", taper, deform });
  }
  if (shape.kind === "cylinder" || shape.kind === "ellipse") {
    return JSON.stringify({ kind: shape.kind, sides: polygonSidesForShape(shape), segments: shape.segments, taper, deform });
  }
  if (shape.kind === "polygon") {
    return JSON.stringify({ kind: "polygon", sides: shape.sides, segments: shape.segments, taper, deform });
  }
  if (shape.kind === "sphere") {
    return JSON.stringify({ kind: "sphere", steps: shape.steps, taper, deform });
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
    helixAngle: shape.helixAngle,
    threadRole: shape.threadRole,
    threadHead: shape.threadHead,
    threadHand: shape.threadHand,
    threadProfile: shape.threadProfile,
    threadDiameter: shape.threadDiameter,
    threadPitch: shape.threadPitch,
    threadClearance: shape.threadClearance,
    threadQuality: shape.threadQuality,
    threadHeadHeight: shape.threadHeadHeight,
    threadChamfer: shape.threadChamfer,
    threadHeadChamfer: shape.threadHeadChamfer,
    springTurns: shape.springTurns,
    springWire: shape.springWire,
    springQuality: shape.springQuality,
    helixQuality: shape.helixQuality,
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
  const next: NoteOverlayState = {
    notes: notes.map((note, index) => {
      const projected = noteWorldPosition(state, note).project(state.camera);
      return {
        id: note.id,
        index: index + 1,
        text: note.text,
        collapsed: Boolean(note.collapsed),
        attached: Boolean(note.anchor),
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
}: {
  overlay: NoteOverlayState;
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
              className={`note-pin ${note.attached ? "attached" : ""}`}
              title={t("note.move")}
              aria-label={`${t("editor.tool.note")} ${note.index}`}
              onPointerDown={(event) => onPinPointerDown(event, note.id)}
              onPointerMove={(event) => onPinPointerMove(event, note.id)}
              onPointerUp={(event) => onPinPointerUp(event, note.id)}
              onClick={() => onToggle(note.id)}
            >
              {note.index}
            </button>
            {open ? (
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
                  <button type="button" className="note-action danger" onClick={() => onRemove(note.id)}>{t("common.delete")}</button>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
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
  x: number;
  z: number;
  elevation: number;
  rotation: number;
  armLengthX: number;
  armLengthZ: number;
  mode?: CornerRulerMode;
};

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
    shapeId: string;
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
    const selectedShape = selectedIds.length === 1
      ? shapes.find((s) => s.id === selectedIds[0] && !s.hidden && !isNonSolidShapeKind(s.kind))
      : null;

    rulers.forEach((ruler) => {
      const armWidth = CORNER_RULER_ARM_WIDTH;
      const mode: CornerRulerMode = ruler.mode ?? "endpoint";
      const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, THREE.MathUtils.degToRad(ruler.rotation), 0, "XYZ"));
      const xAxis = new THREE.Vector3(1, 0, 0).applyQuaternion(quaternion);
      const zAxis = new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion);
      const yAxis = new THREE.Vector3(0, 1, 0);
      const corner = new THREE.Vector3(ruler.x, ruler.elevation, ruler.z);

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
      if (selectedShape) {
        const bounds = projectShapeExtent(selectedShape, xAxis, yAxis, zAxis, corner);
        const coords = computeCornerRulerRelativeCoordinates({
          rulerCorner: { x: ruler.x, y: ruler.elevation, z: ruler.z },
          rulerRotation: ruler.rotation,
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
          shapeId: selectedShape.id,
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
      shapes.forEach((candidate) => {
        if (isNonSolidShapeKind(candidate.kind) || candidate.hidden) return;
        if (selectedShape && candidate.id === selectedShape.id) return;
        const { armX, armZ } = cornerRulerDimensionMatchesFromCorner(
          { x: ruler.x, z: ruler.z },
          ruler.rotation,
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
            { x: ruler.x, z: ruler.z, rotation: ruler.rotation, length: ruler.armLengthX, crossWidth: armWidth },
            zAxis, armX, topY, state, accuracy,
          ));
        }
        if (armZ) {
          neighborLabels.push(cornerRulerNeighborLabel(
            `${ruler.id}:${candidate.id}:z`,
            { x: ruler.x, z: ruler.z, rotation: ruler.rotation + 90, length: ruler.armLengthZ, crossWidth: armWidth },
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
  onCoordinateClick: (rulerId: string, shapeId: string, axis: "x" | "z" | "elevation", value: number, x: number, y: number) => void;
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
                onClick={() => onCoordinateClick(item.id, item.selectedCoordinate!.shapeId, "x", item.selectedCoordinate!.xValue, item.selectedCoordinate!.xLabel.x, item.selectedCoordinate!.xLabel.y)}
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
                onClick={() => onCoordinateClick(item.id, item.selectedCoordinate!.shapeId, "z", item.selectedCoordinate!.zValue, item.selectedCoordinate!.zLabel.x, item.selectedCoordinate!.zLabel.y)}
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
                onClick={() => onCoordinateClick(item.id, item.selectedCoordinate!.shapeId, "elevation", item.selectedCoordinate!.elevationValue, item.selectedCoordinate!.elevationLabel.x, item.selectedCoordinate!.elevationLabel.y)}
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
  shape: WorkplaneShape | null,
  workplane: PlacementWorkplane,
  accuracy: MeasurementAccuracy,
  theme: ResolvedAppTheme,
  overlayRef: MutableRefObject<OriginDimensionOverlayData | null>,
  setOverlay: Dispatch<SetStateAction<OriginDimensionOverlayData | null>>,
) {
  if (!state) {
    return;
  }
  const frame = shape ? originFrameForShape(shape, workplane, accuracy) : null;
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

const importedShapeProjectionBoundsCache = new WeakMap<WorkplaneShape, Map<string, AxisProjectionBounds>>();

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
  let shapeCache = importedShapeProjectionBoundsCache.get(shape);
  if (!shapeCache) {
    shapeCache = new Map();
    importedShapeProjectionBoundsCache.set(shape, shapeCache);
  }
  const cached = shapeCache.get(axisKey);
  if (cached) {
    return {
      min: cached.min.clone(),
      max: cached.max.clone(),
    };
  }

  const preserveSize = preservesEdgeTreatmentSize(shape);
  const positions = preserveSize ? resizedImportedMeshPositions(shape) : shape.importedMesh.positions;
  const scaleX = preserveSize ? 1 : shapeWidth(shape) / Math.max(0.001, shape.importedMesh.baseWidth);
  const scaleY = preserveSize ? 1 : shape.height / Math.max(0.001, shape.importedMesh.baseHeight);
  const scaleZ = preserveSize ? 1 : shapeDepth(shape) / Math.max(0.001, shape.importedMesh.baseDepth);
  const center = shapeCenter(shape);
  const quaternion = quaternionForShape(shape);
  const min = new THREE.Vector3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
  const max = new THREE.Vector3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
  const point = new THREE.Vector3();
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
      .applyQuaternion(quaternion)
      .add(center);
    const projected = new THREE.Vector3(point.dot(xAxis), point.dot(yAxis), point.dot(zAxis));
    min.min(projected);
    max.max(projected);
  }

  if (![min.x, min.y, min.z, max.x, max.y, max.z].every(Number.isFinite)) {
    return null;
  }
  shapeCache.set(axisKey, { min: min.clone(), max: max.clone() });
  return { min, max };
}

/** Bounding-Box einer Form auf drei vorgegebene Achsen projiziert, relativ zu `origin` - Kern sowohl fuer die Zieh-Griff-Rahmen als auch fuer die Abstands-zum-Ursprung-Anzeige. */
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
function originFrameForShape(shape: WorkplaneShape, workplane: PlacementWorkplane, accuracy: MeasurementAccuracy): OriginDimensionFrame {
  const origin = new THREE.Vector3(workplane.origin.x, workplane.origin.y, workplane.origin.z);
  const xAxis = new THREE.Vector3(workplane.xAxis.x, workplane.xAxis.y, workplane.xAxis.z).normalize();
  const yAxis = new THREE.Vector3(workplane.normal.x, workplane.normal.y, workplane.normal.z).normalize();
  const zAxis = new THREE.Vector3(workplane.zAxis.x, workplane.zAxis.y, workplane.zAxis.z).normalize();
  const { min, max } = projectShapeExtent(shape, xAxis, yAxis, zAxis, origin);
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

function scaledHorizontalShapePatch(shape: WorkplaneShape, scaleX: number, scaleZ: number): Partial<WorkplaneShape> {
  const width = Math.max(MIN_SHAPE_SIZE, shapeWidth(shape) * scaleX);
  const depth = Math.max(MIN_SHAPE_SIZE, shapeDepth(shape) * scaleZ);
  const patch: Partial<WorkplaneShape> = {
    width,
    depth,
    size: resizedShapeSize(width, depth),
  };
  if (shape.kind === "cone") {
    patch.baseRadius = width / 2;
  }
  if (shapeHasTaper(shape)) {
    const taper = shapeTaperDimensions(shape);
    patch.taperTopWidth = Math.max(MIN_SHAPE_SIZE, taper.topWidth * scaleX);
    patch.taperBottomWidth = Math.max(MIN_SHAPE_SIZE, taper.bottomWidth * scaleX);
    patch.taperTopDepth = Math.max(MIN_SHAPE_SIZE, taper.topDepth * scaleZ);
    patch.taperBottomDepth = Math.max(MIN_SHAPE_SIZE, taper.bottomDepth * scaleZ);
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

  if (shiftKey && signs.x && signs.z) {
    const scale = proportionalResizeScale(width, depth, nextWidth, nextDepth);
    const limitedScale = clamp(scale, MIN_SHAPE_SIZE / Math.max(MIN_SHAPE_SIZE, Math.min(width, depth)), maxSize / Math.max(width, depth));
    nextWidth = snapDimension(width * limitedScale, step, MIN_SHAPE_SIZE, maxSize);
    nextDepth = snapDimension(depth * limitedScale, step, MIN_SHAPE_SIZE, maxSize);
  }

  const nextCenter = altKey
    ? frame.center.clone()
    : resizeCenterFromAnchor(frame, transform.scaleAnchorPoint ?? resizeAnchorPointForFrame(frame, signs), signs, nextWidth, nextDepth);
  if (shapeHasTaper(shape)) {
    const scaleX = nextWidth / Math.max(MIN_SHAPE_SIZE, width);
    const scaleZ = nextDepth / Math.max(MIN_SHAPE_SIZE, depth);
    const scaled = scaledHorizontalShapePatch(shape, scaleX, scaleZ);
    return {
      ...scaled,
      x: cleanNearZero(nextCenter.x, 0.0005),
      z: cleanNearZero(nextCenter.z, 0.0005),
      elevation: cleanNearZero(nextCenter.y - shape.height / 2, 0.0005),
    };
  }
  return resizedShapePatchFromFrame(shape, nextCenter, nextWidth, nextDepth);
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
  }

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
      patch,
    };
  });
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
  placementWorkplane,
  workplaneMode,
  initialSnap,
  initialWorkspace,
  workspaceSettingsKey,
  showProjectNameInToolbar = true,
  onShowProjectNameInToolbarChange,
  onAddShape,
  onAlignAnchorChange,
  onAlignPreview,
  onAlignPreviewClear,
  onAlignSelection,
  onMirrorPreview,
  onMirrorPreviewClear,
  onMirrorSelection,
  onSelectShape,
  onSetPlacementWorkplane,
  onToggleWorkplaneTool,
  onInteractionActiveChange,
  onEditSketch,
  canSeparateParts = false,
  onSeparateParts,
  onUpdateShape,
  onDuplicateShapeAt,
  notes = EMPTY_NOTES,
  notesVisible = true,
  noteMode = false,
  onNoteAdd,
  onNoteUpdate,
  onNoteRemove,
  onNoteModeChange,
  onWorkspaceSettingsChange,
  projectName = "",
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
}: WorkplaneViewportProps) {
  const [snapOpen, setSnapOpen] = useState(false);
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
  const suppressNextRotationEditRef = useRef(false);
  const [activeRotationWheel, setActiveRotationWheel] = useState(false);
  const [activeTransformKind, setActiveTransformKind] = useState<TransformHandleKind | null>(null);
  const [rotationWheelAxis, setRotationWheelAxis] = useState<RotationAxis>("y");
  const [pinnedRotationWheelView, setPinnedRotationWheelView] = useState<PinnedRotationWheelView | null>(null);
  const [editingDimension, setEditingDimension] = useState<EditingDimension>(null);
  const [editingRotation, setEditingRotation] = useState<EditingRotation>(null);
  const [tapeMode, setTapeMode] = useState(false);
  const [tapeDeleteMode, setTapeDeleteMode] = useState(false);
  const [tapeMoveMode, setTapeMoveMode] = useState(false);
  const [tapeToolsOpen, setTapeToolsOpen] = useState(false);
  const [cameraControlsCollapsed, setCameraControlsCollapsed] = useState(false);
  const language = useLanguage();
  const [orthographicView, setOrthographicView] = useState(false);
  const [tapeModel, setTapeModel] = useState<TapeModel>({ points: [], segments: [], startPointId: null, hover: null });
  const [tapeOverlay, setTapeOverlay] = useState<TapeOverlayState | null>(null);
  const [rulerDimensionOverlay, setRulerDimensionOverlay] = useState<RulerDimensionOverlayState | null>(null);
  const [cornerRulerMode, setCornerRulerMode] = useState(false);
  const [cornerRulerOverlay, setCornerRulerOverlay] = useState<CornerRulerOverlayState | null>(null);
  const [rulerDimensionEditing, setRulerDimensionEditing] = useState<{ shapeId: string; field: RulerDimensionField; x: number; y: number; value: string } | null>(null);
  const [rulerDuplicatePreview, setRulerDuplicatePreview] = useState<{ x: number; y: number; label: string } | null>(null);
  const [rulerDuplicateEditing, setRulerDuplicateEditing] = useState<{ rulerId: string; shapeId: string; baseAlong: number; x: number; y: number; value: string } | null>(null);
  const [rulerCoordinateEditing, setRulerCoordinateEditing] = useState<{ rulerId: string; shapeId: string; axis: "x" | "z" | "elevation"; x: number; y: number; value: string } | null>(null);
  const [noteOverlay, setNoteOverlay] = useState<NoteOverlayState | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [moveDimensionOverlay, setMoveDimensionOverlay] = useState<MoveDimensionOverlayState | null>(null);
  const [moveDimensionsEnabled, setMoveDimensionsEnabled] = useState(true);
  const [originDimensionOverlay, setOriginDimensionOverlay] = useState<OriginDimensionOverlayData | null>(null);
  const [originDimensionsEnabled, setOriginDimensionsEnabled] = useState(true);
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
  const suppressNextLiftEditRef = useRef(false);
  const snapRef = useRef(snap);
  const workspaceRef = useRef(workspace);
  const workspaceSettingsKeyRef = useRef(workspaceSettingsKey ?? null);
  const lastWorkspaceSettingsSyncRef = useRef("");
  const pendingWorkspaceHydrationFingerprintRef = useRef<string | null>(null);
  const viewCubeRef = useRef<HTMLDivElement | null>(null);
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
  const projectNameRef = useRef(projectName);
  const workplaneModeRef = useRef(workplaneMode);
  placementWorkplaneRef.current = placementWorkplane;
  workplaneModeRef.current = workplaneMode;
  const perfRef = useRef({
    fps: 0,
    frameMs: 0,
    maxFrameMs: 0,
    frames: 0,
    lastSample: 0,
  });

  const selectedShape = useMemo(() => (selectedIds.length === 1 ? shapes.find((shape) => shape.id === selectedIds[0]) ?? null : null), [selectedIds, shapes]);
  const renderSelectionIds = useCallback(
    (ids = selectedIdsRef.current) => (
      workplaneModeRef.current || (modifierActiveRef.current && !modifierPreviewActiveRef.current) ? [] : ids
    ),
    [],
  );
  /** Nur bei genau einer ausgewaehlten Form und wenn gerade nichts anderes den Bildschirm belegt - siehe layerling-lineal.md. */
  const originDimensionShapeFor = useCallback(
    (shapesList: WorkplaneShape[], ids = selectedIdsRef.current) => {
      if (!originDimensionsEnabledRef.current) return null;
      const rendered = renderSelectionIds(ids);
      if (rendered.length !== 1) return null;
      if (alignModeRef.current || mirrorModeRef.current) return null;
      if (tapeModeRef.current || tapeDeleteModeRef.current || tapeMoveModeRef.current) return null;
      if (transformRef.current || dragRef.current) return null;
      return shapesList.find((shape) => shape.id === rendered[0] && !shape.hidden) ?? null;
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
      const value = parseMeasurementInput(rawValue);
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
    const nextSnap = savedDefault?.snap ?? normalizeSnapGrid(initialSnap, DEFAULT_SNAP_GRID);
    const nextWorkspace = savedDefault?.workspace ?? normalizeWorkspaceSettings(initialWorkspace);
    const nextFingerprint = workplaneSettingsFingerprint(nextWorkspace, nextSnap);
    // Prop hydration must not echo back to the parent. Parent persistence creates
    // new object references even when the values are unchanged, which previously
    // caused this effect and its callback effect to update each other indefinitely.
    lastWorkspaceSettingsSyncRef.current = nextFingerprint;
    pendingWorkspaceHydrationFingerprintRef.current = nextFingerprint;
    snapRef.current = nextSnap;
    workspaceRef.current = nextWorkspace;
    if (threeRef.current) {
      rebuildWorkplane(threeRef.current, nextWorkspace, resolvedThemeRef.current, placementWorkplaneRef.current);
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

  const makeWorkspaceDefault = useCallback(() => {
    const normalizedWorkspace = normalizeWorkspaceSettings(workspace);
    const normalizedSnap = normalizeSnapGrid(snap, DEFAULT_SNAP_GRID);
    const key = workspaceSettingsKeyRef.current;
    if (key) {
      try {
        window.localStorage.setItem(
          `${WORKSPACE_DEFAULTS_STORAGE_PREFIX}${key}`,
          JSON.stringify({ workspace: normalizedWorkspace, snap: normalizedSnap }),
        );
      } catch {
        // Project persistence below is still attempted if browser storage is unavailable.
      }
    }
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
      shouldBuildCutPreviews(transformRef.current, dragRef.current),
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
      setRotationReadout(null);
      setActiveRotationWheel(false);
      setActiveTransformKind(null);
    }
    selectedIdsRef.current = selectedIds;
    rebuildShapes(
      threeRef.current,
      shapesRef.current,
      renderSelectionIds(selectedIds),
      shouldBuildCutPreviews(transformRef.current, dragRef.current),
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
      !transformRef.current && !dragRef.current,
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
      !transformRef.current && !dragRef.current,
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

  useLayoutEffect(() => {
    const state = threeRef.current;
    rebuildShapes(
      state,
      shapesRef.current,
      renderSelectionIds(),
      shouldBuildCutPreviews(transformRef.current, dragRef.current),
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
      );
    }
    setSelectionHelpersVisible(state, !workplaneMode && transformRef.current?.kind !== "rotate");
    if (state) {
      state.modifierLayer.visible = !workplaneMode;
      state.moveDimensionLayer.visible = !workplaneMode;
      state.originDimensionLayer.visible = !workplaneMode;
      state.needsRender = true;
    }
    if (workplaneMode) {
      clearMoveDimensions();
      setMarqueeRect(null);
      setHoverMeasureKey(null);
      setPinnedMeasureKey(null);
      setEditingDimension(null);
      setEditingRotation(null);
      setRotationReadout(null);
      setActiveRotationWheel(false);
      setActiveTransformKind(null);
      setPinnedRotationWheelView(null);
    }
    if (!workplaneMode) {
      syncWorkplaneHoverPreview(threeRef.current, null, workspaceRef.current, resolvedThemeRef.current);
    }
  }, [clearMoveDimensions, renderSelectionIds, workplaneMode]);

  useLayoutEffect(() => {
    // The plane label carries the project name, so a rename has to redraw it.
    projectNameRef.current = projectName;
    workspaceRef.current = workspace;
    if (threeRef.current) threeRef.current.palette = appThemePalette(themePreference);
    rebuildWorkplane(threeRef.current, workspace, resolvedTheme, placementWorkplane, projectName);
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
      );
      syncTapeOverlay(threeRef.current, tapeModelRef.current, tapeOverlayRef, setTapeOverlay, workspace.accuracy);
      syncRulerDimensionOverlay(threeRef.current, shapesRef.current, rulerDimensionOverlayRef, setRulerDimensionOverlay, workspace.accuracy);
      syncCornerRulerToolOverlay(threeRef.current, cornerRulerModelRef.current, shapesRef.current, selectedIdsRef.current, cornerRulerOverlayRef, setCornerRulerOverlay, workspace.accuracy);
      syncNoteOverlay(threeRef.current, notesRef.current, notesVisibleRef.current, noteOverlayRef, setNoteOverlay);
      syncMoveDimensionWorldLines(threeRef.current, moveDimensionSessionRef.current, resolvedTheme);
      threeRef.current.needsRender = true;
    }
  }, [language, placementWorkplane, projectName, resolvedTheme, themePreference, workspace]);

  useEffect(() => {
    setSelectionHelpersVisible(threeRef.current, !workplaneMode && activeTransformKind !== "rotate");
  }, [activeTransformKind, workplaneMode]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    const state = createThreeScene(host);
    state.palette = themePaletteRef.current;
    threeRef.current = state;
    rebuildWorkplane(state, workspaceRef.current, resolvedThemeRef.current, placementWorkplaneRef.current, projectNameRef.current);
    window.layerlingCaptureCanvas = () => {
      state.camera.updateMatrixWorld();
      state.renderer.render(state.scene, state.camera);
      return state.renderer.domElement.toDataURL("image/png");
    };
    window.layerlingCaptureCanvasAsync = () => {
      state.camera.updateMatrixWorld();
      state.renderer.render(state.scene, state.camera);
      return thumbnailPngDataUrl(state.renderer.domElement);
    };
    window.layerlingCaptureView = (face = "current") => {
      if (face === "home") {
        resetCamera(state);
      } else if (face !== "current") {
        setCameraToViewFace(state, face);
      }
      syncViewCube(state, viewCubeRef.current);
      state.camera.updateMatrixWorld();
      state.renderer.render(state.scene, state.camera);
      return state.renderer.domElement.toDataURL("image/png");
    };
    perfRef.current.lastSample = performance.now();
    resetCamera(state);
    rebuildShapes(state, shapesRef.current, renderSelectionIds(), true, false, placementWorkplaneRef.current);

    const animate = () => {
      state.animationId = window.requestAnimationFrame(animate);
      const now = performance.now();
      const controlsChanged = state.controls.update();
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
        );
        syncAlignOverlay(state, alignReferenceShapesRef.current, selectedIdsRef.current, alignModeRef.current, alignAnchorIdRef.current, alignHandlesRef.current, alignOverlayRef, setAlignOverlay);
        syncMirrorOverlay(state, mirrorReferenceShapesRef.current, selectedIdsRef.current, mirrorModeRef.current, mirrorOverlayRef, setMirrorOverlay);
        syncTapeOverlay(state, tapeModelRef.current, tapeOverlayRef, setTapeOverlay, workspaceRef.current.accuracy);
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
      state.renderer.render(state.scene, state.camera);
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
      window.cancelAnimationFrame(state.animationId);
      window.removeEventListener("resize", state.resize);
      state.disposeInteractionListeners();
      state.controls.dispose();
      disposeChildren(state.workplaneLayer);
      if (state.workplanePreviewLayer) {
        disposeChildren(state.workplanePreviewLayer);
      }
      disposeChildren(state.shapeLayer);
      state.shapeRecords.clear();
      disposeChildren(state.helperLayer);
      disposeChildren(state.transformGuideLayer);
      disposeChildren(state.moveDimensionLayer);
      disposeChildren(state.originDimensionLayer);
      disposeChildren(state.modifierLayer);
      state.renderer.dispose();
      host.replaceChildren();
      if (window.layerlingCaptureCanvas) {
        delete window.layerlingCaptureCanvas;
      }
      if (window.layerlingCaptureCanvasAsync) {
        delete window.layerlingCaptureCanvasAsync;
      }
      if (window.layerlingCaptureView) {
        delete window.layerlingCaptureView;
      }
      threeRef.current = null;
    };
  }, []);

  useEffect(() => {
    const state = threeRef.current;
    if (!state) {
      return;
    }
    const visible = !workplaneMode
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
  }, [activeTransformKind, alignMode, mirrorMode, modifierActive, tapeDeleteMode, tapeMode, tapeMoveMode, workplaneMode]);

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
    return placementWorkplanePoint(
      workplane,
      clamp(snapValue(local.x, step), -bounds.width / 2 + 6, bounds.width / 2 - 6),
      clamp(snapValue(local.z, step), -bounds.depth / 2 + 6, bounds.depth / 2 - 6),
    );
  }, [toRawPlanePoint]);

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
        return bounds ? boundsIntersectRect(bounds, rect) : false;
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
      const pivot = frame.center.clone();
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
      event.currentTarget.setPointerCapture(event.pointerId);
      setEditingRotation(null);
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
        if (kind !== "scale" && kind !== "height") {
          clearCutPreviewOverlays(state);
        }
        state.needsRender = true;
        state.controls.enabled = false;
      }
      onInteractionActiveChange?.(true);
    },
    [clearMoveDimensions, onInteractionActiveChange, rememberResizeAnchor, toRawPlanePoint],
  );

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
        const maxHeight = Math.max(...transform.items.map((item) => shapeDimensionLimit(workspaceRef.current, item.startShape.kind, 180)));
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
          const maxSize = shapeDimensionLimit(workspaceRef.current, transform.startShape.kind, 220);
          const next = resizeShapeFromFrameHandle(transform, worldPoint, transform.handleKey, shiftKey, altKey, step, maxSize);
          onUpdateShape(transform.id, next);
        } else {
          const maxSize = Math.max(...transform.items.map((item) => shapeDimensionLimit(workspaceRef.current, item.startShape.kind, 260)));
          resizeSelectionFromHandle(transform, worldPoint, transform.handleKey, shiftKey, altKey, step, maxSize).forEach(({ id, patch }) => onUpdateShape(id, patch));
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
        if (transform.items.length > 1) {
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
      syncCutPreviewOverlays(threeRef.current, shapesRef.current);
      setSelectionHelpersVisible(threeRef.current, true);
      threeRef.current.controls.enabled = true;
      threeRef.current.needsRender = true;
    }
    onInteractionActiveChange?.(false);
    bakeRotatedShapes.forEach((id) => onUpdateShape(id, { bakeTransform: true }));
  }, [onInteractionActiveChange, onUpdateShape, suppressLiftEditAfterDrag]);

  const beginDimensionEdit = useCallback((mark: DimensionMark) => {
    const id = selectedIdsRef.current[0];
    const isCornerRulerMidpoint = cornerRulerModelRef.current[0]?.mode === "midpoint";
    if (id && (mark.axis === "width" || mark.axis === "depth" || mark.axis === "height") && !isCornerRulerMidpoint) {
      rememberResizeAnchor(id, mark.axis === "height" ? "height" : "scale", mark.handleKey);
    } else {
      lastResizeAnchorRef.current = null;
    }
    setPinnedMeasureKey(mark.handleKey);
    setEditingDimension({ key: mark.key, axis: mark.axis, x: mark.labelX, y: mark.labelY, value: mark.label });
  }, [rememberResizeAnchor]);

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
      value: formatMeasure(elevation, workspaceRef.current.accuracy),
    });
  }, []);

  const commitDimensionEdit = useCallback(() => {
    const edit = editingDimension;
    const id = selectedIdsRef.current[0];
    const shape = shapesRef.current.find((entry) => entry.id === id);
    if (!edit || !shape) {
      setEditingDimension(null);
      return;
    }
    const value = parseMeasurementInput(edit.value);
    if (edit.axis === "elevation") {
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
            onUpdateShape(selectedId, {
              x: cleanNearZero(nextCenter.x, 0.0005),
              z: cleanNearZero(nextCenter.z, 0.0005),
              elevation: cleanNearZero(clamp(nextCenter.y - selectedShape.height / 2, MIN_ELEVATION, MAX_ELEVATION), 0.0005),
            });
          }
        });
      }
      setEditingDimension(null);
      setPinnedMeasureKey(null);
      return;
    }
    if (Number.isFinite(value) && value > 0) {
      const isCornerRulerMidpoint = cornerRulerModelRef.current[0]?.mode === "midpoint";
      const customLimit = workspaceRef.current.shapeCustomizations[shape.kind]?.maxDimension;
      const nextValue = Math.min(customLimit ?? Number.POSITIVE_INFINITY, Math.max(MIN_SHAPE_SIZE, value));
      const anchor = isCornerRulerMidpoint ? null : lastResizeAnchorRef.current;
      if (edit.axis === "width") {
        const frame = selectionFrameForShapes([shape], [shape.id]);
        if (shapeHasTaper(shape) && frame) {
          const scaleX = nextValue / Math.max(MIN_SHAPE_SIZE, frame.width);
          const signs = anchor?.shapeId === shape.id ? resizeSignsForDimension(anchor.signs, "width") : { x: 0, z: 0 };
          const nextCenter = signs.x
            ? resizeCenterFromAnchor(frame, resizeAnchorPointForFrame(frame, signs), signs, nextValue, frame.depth)
            : frame.center.clone();
          onUpdateShape(id, {
            ...scaledHorizontalShapePatch(shape, scaleX, 1),
            x: cleanNearZero(nextCenter.x, 0.0005),
            z: cleanNearZero(nextCenter.z, 0.0005),
            elevation: cleanNearZero(nextCenter.y - shape.height / 2, 0.0005),
          });
        } else {
          // A cylinder is always circular - the diameter mark writes both
          // fields, the same as the inspector's diameter field does.
          const patch: Partial<WorkplaneShape> = shape.kind === "cylinder" || shape.kind === "star"
            ? { width: nextValue, depth: nextValue, size: nextValue }
            : { width: nextValue, size: resizedShapeSize(nextValue, shapeDepth(shape)) };
          if (shape.kind === "cone") {
            patch.baseRadius = nextValue / 2;
          }
          onUpdateShape(id, patchWithResizeAnchor(shape, patch, edit.axis, anchor));
        }
      } else if (edit.axis === "depth") {
        const frame = selectionFrameForShapes([shape], [shape.id]);
        if (shapeHasTaper(shape) && frame) {
          const scaleZ = nextValue / Math.max(MIN_SHAPE_SIZE, frame.depth);
          const signs = anchor?.shapeId === shape.id ? resizeSignsForDimension(anchor.signs, "depth") : { x: 0, z: 0 };
          const nextCenter = signs.z
            ? resizeCenterFromAnchor(frame, resizeAnchorPointForFrame(frame, signs), signs, frame.width, nextValue)
            : frame.center.clone();
          onUpdateShape(id, {
            ...scaledHorizontalShapePatch(shape, 1, scaleZ),
            x: cleanNearZero(nextCenter.x, 0.0005),
            z: cleanNearZero(nextCenter.z, 0.0005),
            elevation: cleanNearZero(nextCenter.y - shape.height / 2, 0.0005),
          });
        } else {
          // Defense in depth: the cylinder's dimension mark never offers this
          // axis (see makeFootprintDimensionMark above), but keep it circular
          // regardless of how the patch got here.
          const patch: Partial<WorkplaneShape> = shape.kind === "cylinder" || shape.kind === "star"
            ? { width: nextValue, depth: nextValue, size: nextValue }
            : { depth: nextValue, size: resizedShapeSize(shapeWidth(shape), nextValue) };
          onUpdateShape(id, patchWithResizeAnchor(shape, patch, edit.axis, anchor));
        }
      } else {
        if (isCornerRulerMidpoint) {
          const deltaY = (shape.height - nextValue) / 2;
          onUpdateShape(id, {
            height: nextValue,
            elevation: cleanNearZero(clamp((shape.elevation ?? 0) + deltaY, MIN_ELEVATION, MAX_ELEVATION), 0.0005),
          });
        } else {
          onUpdateShape(id, patchWithResizeAnchor(shape, { height: nextValue }, edit.axis, anchor));
        }
      }
    }
    setEditingDimension(null);
    setPinnedMeasureKey(null);
  }, [editingDimension, onUpdateShape]);

  const cancelDimensionEdit = useCallback(() => {
    setEditingDimension(null);
    setPinnedMeasureKey(null);
  }, []);

  const beginRulerDimensionEdit = useCallback((item: RulerDimensionOverlayItem) => {
    if (!item.field) return;
    setRulerDimensionEditing({ shapeId: item.shapeId, field: item.field, x: item.labelX, y: item.labelY, value: formatMeasure(item.value, workspaceRef.current.accuracy) });
  }, []);

  const commitRulerDimensionEdit = useCallback(() => {
    const edit = rulerDimensionEditing;
    setRulerDimensionEditing(null);
    if (!edit) return;
    const shape = shapesRef.current.find((entry) => entry.id === edit.shapeId);
    const value = parseMeasurementInput(edit.value);
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
    (event.target as HTMLButtonElement).setPointerCapture(event.pointerId);
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
    const value = parseMeasurementInput(edit.value);
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
      selectedIdsRef.current.forEach((id) => onUpdateShape(id, { ...rotationPatchForAxis(edit.axis, value), bakeTransform: true }));
    }
    setEditingRotation(null);
    setActiveRotationWheel(false);
  }, [editingRotation, onUpdateShape]);

  const cancelRotationEdit = useCallback(() => {
    setEditingRotation(null);
    setActiveRotationWheel(false);
  }, []);

  const pickShape = useCallback((clientX: number, clientY: number) => {
    const state = threeRef.current;
    if (!state) {
      return null;
    }

    const rect = state.renderer.domElement.getBoundingClientRect();
    state.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    state.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    state.raycaster.setFromCamera(state.pointer, state.camera);
    state.raycaster.layers.set(RENDER_LAYER_SHAPES);

    const intersections = state.raycaster.intersectObjects(state.shapeLayer.children, true);
    const hit = intersections.find((entry) => {
      const shapeId = entry.object.userData.shapeId;
      if (typeof shapeId !== "string") return false;
      const shape = shapesRef.current.find((candidate) => candidate.id === shapeId);
      return shape ? !shape.imagePlate : false;
    });
    if (hit) {
      return hit.object.userData.shapeId as string;
    }

    let nearestId: string | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    shapesRef.current.forEach((shape) => {
      if (shape.imagePlate) return;
      const center = new THREE.Vector3(shape.x, (shape.elevation ?? 0) + shape.height / 2, shape.z).project(state.camera);
      const screenX = rect.left + ((center.x + 1) / 2) * rect.width;
      const screenY = rect.top + ((1 - center.y) / 2) * rect.height;
      const distance = Math.hypot(clientX - screenX, clientY - screenY);
      const hitRadius = clamp(Math.max(shapeWidth(shape), shapeDepth(shape)) * 2.6, 48, 112);
      if (distance <= hitRadius && distance < nearestDistance) {
        nearestId = shape.id;
        nearestDistance = distance;
      }
    });

    return nearestId;
  }, []);

  const pickPlacementSurface = useCallback((clientX: number, clientY: number, reverse: boolean) => {
    const state = threeRef.current;
    if (!state) return null;
    const rect = state.renderer.domElement.getBoundingClientRect();
    state.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    state.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    state.raycaster.setFromCamera(state.pointer, state.camera);
    state.raycaster.layers.set(RENDER_LAYER_SHAPES);

    const hit = state.raycaster
      .intersectObjects(state.shapeLayer.children, true)
      .find((entry) => entry.object instanceof THREE.Mesh && entry.face && typeof entry.object.userData.shapeId === "string");
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
    let tangent = faceEdges[Math.min(1, faceEdges.length - 1)]?.clone()
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

    const workplane = placementWorkplaneFromSurface(
      { x: hit.point.x, y: hit.point.y, z: hit.point.z },
      { x: normal.x, y: normal.y, z: normal.z },
      { x: tangent.x, y: tangent.y, z: tangent.z },
      reverse,
    );

    return {
      shapeId,
      workplane: snapPlacementWorkplaneOrigin(workplane, snapStep(snapRef.current)),
    };
  }, []);

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
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const handleNotePinPointerMove = useCallback((event: ReactPointerEvent<HTMLButtonElement>, noteId: string) => {
    const drag = noteDragRef.current;
    if (!drag || drag.noteId !== noteId || drag.pointerId !== event.pointerId) return;
    event.stopPropagation();
    const anchor = resolveNoteAnchor(event.clientX, event.clientY);
    if (!anchor) return;
    drag.moved = true;
    onNoteUpdate?.(noteId, { x: anchor.x, y: anchor.y, z: anchor.z, anchor: anchor.anchor }, true);
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

  const placeCornerRuler = useCallback((point: { x: number; z: number }) => {
    const existingMode = cornerRulerModelRef.current[0]?.mode ?? "endpoint";
    const instance: CornerRulerInstance = {
      id: `corner-ruler-${++cornerRulerIdRef.current}`,
      x: point.x,
      z: point.z,
      elevation: 0,
      rotation: 90,
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
    shapeId: string,
    axis: "x" | "z" | "elevation",
    value: number,
    x: number,
    y: number,
  ) => {
    setRulerCoordinateEditing({
      rulerId,
      shapeId,
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
    const shape = shapesRef.current.find((entry) => entry.id === edit.shapeId);
    const ruler = cornerRulerModelRef.current.find((entry) => entry.id === edit.rulerId);
    const value = parseMeasurementInput(edit.value);
    if (!shape || !ruler || !Number.isFinite(value)) return;

    const rulerQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, THREE.MathUtils.degToRad(ruler.rotation), 0, "XYZ"));
    const xAxis = new THREE.Vector3(1, 0, 0).applyQuaternion(rulerQuat);
    const zAxis = new THREE.Vector3(0, 0, 1).applyQuaternion(rulerQuat);
    const yAxis = new THREE.Vector3(0, 1, 0);
    const corner = new THREE.Vector3(ruler.x, ruler.elevation ?? 0, ruler.z);
    const bounds = projectShapeExtent(shape, xAxis, yAxis, zAxis, corner);
    const coords = computeCornerRulerRelativeCoordinates({
      rulerCorner: { x: ruler.x, y: ruler.elevation, z: ruler.z },
      rulerRotation: ruler.rotation,
      mode: ruler.mode,
      bounds,
    });
    const currentVal = edit.axis === "elevation" ? coords.elevation : edit.axis === "x" ? coords.x : coords.z;
    const delta = value - currentVal;

    if (edit.axis === "elevation") {
      const targetElevation = (shape.elevation ?? 0) + delta;
      onUpdateShape(edit.shapeId, {
        elevation: cleanNearZero(clamp(targetElevation, MIN_ELEVATION, MAX_ELEVATION), 0.0005),
      });
      return;
    }
    const shift = computeCornerRulerShift(ruler.rotation, edit.axis, delta);
    onUpdateShape(edit.shapeId, {
      x: cleanNearZero(shape.x + shift.x, 0.0005),
      z: cleanNearZero(shape.z + shift.z, 0.0005),
    });
  }, [onUpdateShape, rulerCoordinateEditing]);

  const cancelRulerCoordinateEdit = useCallback(() => {
    setRulerCoordinateEditing(null);
  }, []);

  const removeCornerRuler = useCallback((id: string) => {
    storeCornerRulerModel(cornerRulerModelRef.current.filter((ruler) => ruler.id !== id));
  }, [storeCornerRulerModel]);

  const toggleCornerRulerTool = useCallback(() => {
    const next = !cornerRulerModeRef.current;
    cornerRulerModeRef.current = next;
    setCornerRulerMode(next);
  }, []);

  /** Der Griff ist immer direkt ziehbar, ohne eigenen Verschieben-Modus - wie bei einer Notiz-Nadel, nicht wie beim Massband (das mehrere Punkte je Strecke verwaltet und deshalb einen Modus braucht). Ein Klick ohne Zug dreht die Instanz um 90 Grad - wie in Tinkercad. */
  const handleCornerRulerHandlePointerDown = useCallback((event: ReactPointerEvent<SVGCircleElement>, id: string) => {
    event.preventDefault();
    event.stopPropagation();
    cornerRulerDragRef.current = { id, pointerId: event.pointerId, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const handleCornerRulerHandlePointerMove = useCallback((event: ReactPointerEvent<SVGCircleElement>, id: string) => {
    const drag = cornerRulerDragRef.current;
    if (!drag || drag.id !== id || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const point = toPlanePoint(event.clientX, event.clientY);
    if (!point) return;
    drag.moved = true;
    storeCornerRulerModel(cornerRulerModelRef.current.map((ruler) => ruler.id === id ? { ...ruler, x: point.x, z: point.z } : ruler));
  }, [storeCornerRulerModel, toPlanePoint]);

  const handleCornerRulerHandlePointerUp = useCallback((event: ReactPointerEvent<SVGCircleElement>, id: string) => {
    const drag = cornerRulerDragRef.current;
    if (!drag || drag.id !== id) return;
    cornerRulerDragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (drag.moved) return;
    storeCornerRulerModel(cornerRulerModelRef.current.map((ruler) => ruler.id === id ? { ...ruler, rotation: (ruler.rotation + 90) % 360 } : ruler));
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
        if (wantsCamera && !transformRef.current) {
          cancelGestureForCamera();
          cameraTouchRef.current = true;
          handOverTouchToCamera();
          return;
        }
      }
      if (event.button !== 0 || event.ctrlKey || event.metaKey) {
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

      if (noteModeRef.current) {
        event.preventDefault();
        const anchor = resolveNoteAnchor(event.clientX, event.clientY);
        if (anchor) onNoteAdd?.(anchor);
        onNoteModeChange?.(false);
        return;
      }

      if (cornerRulerModeRef.current) {
        event.preventDefault();
        const point = toPlanePoint(event.clientX, event.clientY);
        if (point) placeCornerRuler(point);
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
          onSetPlacementWorkplane(horizontalPlacementWorkplane(), "base");
        }
        onWorkplaneModeChange(false);
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
        const yBounds = selectionWorldYBounds(frame);
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
        const pivot = frame.center.clone();
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
        event.currentTarget.setPointerCapture(event.pointerId);
        setEditingRotation(null);
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
        if (handle.kind !== "scale" && handle.kind !== "height") {
          clearCutPreviewOverlays(state);
        }
        state.needsRender = true;
        state.controls.enabled = false;
        onInteractionActiveChange?.(true);
        return;
      }

      const id = pickShape(event.clientX, event.clientY);
      const additive = event.shiftKey;
      if (!id) {
        const startX = event.clientX - rect.left;
        const startY = event.clientY - rect.top;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
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
      if (additive) {
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
      event.currentTarget.setPointerCapture(event.pointerId);
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
      };
      const usesWorldHorizontalAxes = Math.abs(activeWorkplane.normal.y - 1) < 1e-6
        && Math.abs(activeWorkplane.xAxis.x - 1) < 1e-6
        && Math.abs(activeWorkplane.zAxis.z - 1) < 1e-6;
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
      onInteractionActiveChange,
      onModifierEdgeToggle,
      placeCornerRuler,
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
      toRawPlanePoint,
    ],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      // Gehoert die Flaeche gerade der Kamera, hat hier niemand etwas zu
      // schweben oder zu ziehen - die Finger bewegen die Ansicht.
      if (cameraTouchRef.current) return;
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
      if (modifierActiveRef.current) {
        updateModifierEdgeHover(event.clientX, event.clientY);
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

      const point = toPlacementWorkplanePoint(event.clientX, event.clientY, drag.workplane);
      if (!point) {
        return;
      }

      const deltaX = point.x - drag.startPoint.x;
      const deltaY = point.y - drag.startPoint.y;
      const deltaZ = point.z - drag.startPoint.z;
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
        );
        syncCutPreviewOverlays(threeRef.current, previewShapes);
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
    [pickPlacementSurface, setMarqueeFromState, toPlacementWorkplanePoint, toRawPlanePoint, updateModifierEdgeHover, updateTapeHover, updateTransform],
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
      drag.items.forEach((item) => {
        item.nextX = item.startX;
        item.nextZ = item.startZ;
        item.nextElevation = item.startElevation;
        if (item.visual && item.hadPreviewSimplified) setComplexEdgeVisibility(item.visual, true);
        if (state) applyDragItemPreview(state, item);
      });
      dragRef.current = null;
      clearMoveDimensions();
      if (state) syncCutPreviewOverlays(state, shapesRef.current);
    }
    if (state) state.needsRender = true;
    onInteractionActiveChange?.(false);
  }, [clearMoveDimensions, onInteractionActiveChange, setMarqueeFromState]);

  const handlePointerLeave = useCallback(() => {
    if (workplaneModeRef.current) {
      syncWorkplaneHoverPreview(threeRef.current, null, workspaceRef.current, resolvedThemeRef.current);
    }
    if (modifierActiveRef.current) clearModifierEdgeHover();
  }, [clearModifierEdgeHover]);

  const finishDrag = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.pointerType === "touch") {
        touchPointersRef.current.delete(event.pointerId);
        if (touchPointersRef.current.size === 0) cameraTouchRef.current = false;
      }
      const state = threeRef.current;
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
        transformRef.current = null;
        setActiveRotationWheel(false);
        setActiveTransformKind(null);
        setRotationReadout(null);
        if (state) {
          syncCutPreviewOverlays(state, shapesRef.current);
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
            const merged = [...selectedIdsRef.current];
            selected.forEach((id) => {
              if (!merged.includes(id)) {
                merged.push(id);
              }
            });
            onSelectShape(merged);
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

      let movedShape = false;
      drag.items.forEach((item) => {
        if (item.visual && item.hadPreviewSimplified) {
          setComplexEdgeVisibility(item.visual, true);
        }
        const shape = shapesRef.current.find((entry) => entry.id === item.id);
        if (shape && (shape.x !== item.nextX || shape.z !== item.nextZ || (shape.elevation ?? 0) !== item.nextElevation)) {
          movedShape = true;
          onUpdateShape(item.id, { x: item.nextX, z: item.nextZ, elevation: item.nextElevation });
        }
      });

      const moveDimensionSession = moveDimensionSessionRef.current;
      if (movedShape && moveDimensionSession) {
        moveDimensionSession.active = false;
      } else {
        clearMoveDimensions();
      }
      dragRef.current = null;
      if (state) {
        // A moved shape triggers the shapes effect, which rebuilds this preview.
        // Running it here as well makes cylinder/hole CSG execute twice on release.
        if (!movedShape) {
          syncCutPreviewOverlays(state, shapesRef.current);
        }
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
    [clearMoveDimensions, onInteractionActiveChange, onSelectShape, onUpdateShape, rememberResizeAnchor, setMarqueeFromState, shapesInMarquee, suppressLiftEditAfterDrag],
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (tapeMoveModeRef.current) return;
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
    [onAddShape, toPlacementWorkplanePoint],
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
      if (zoom) state.camera.zoom = clamp(zoom, 0.02, 100);
      state.camera.position.copy(center).add(direction.multiplyScalar(clamp(offset.length(), 22, 4200)));
    } else {
      const distance = clamp(perspectiveFramingDistance(radius, CAMERA_FOV, aspect), 22, 4200);
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

  const zoomCamera = useCallback((scale: number) => {
    const state = threeRef.current;
    if (!state) {
      return;
    }

    if (state.camera instanceof THREE.OrthographicCamera) {
      state.camera.zoom = clamp(state.camera.zoom / scale, 0.02, 100);
    } else {
      const offset = state.camera.position.clone().sub(state.controls.target);
      const distance = clamp(offset.length() * scale, 22, 4200);
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
    const next = !tapeToolsOpen;
    setTapeToolsOpen(next);
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
    tapeDeleteModeRef.current = false;
    setTapeDeleteMode(false);
    tapeMoveModeRef.current = false;
    setTapeMoveMode(false);
    setTapeActive(true);
    onWorkplaneModeChange(false);
  }, [onWorkplaneModeChange, setTapeActive]);

  const activateTapeDelete = useCallback(() => {
    setTapeActive(false);
    tapeMoveModeRef.current = false;
    setTapeMoveMode(false);
    tapeDeleteModeRef.current = true;
    setTapeDeleteMode(true);
    onWorkplaneModeChange(false);
  }, [onWorkplaneModeChange, setTapeActive]);

  const activateTapeMove = useCallback(() => {
    setTapeActive(false);
    tapeDeleteModeRef.current = false;
    setTapeDeleteMode(false);
    tapeMoveModeRef.current = true;
    setTapeMoveMode(true);
    onWorkplaneModeChange(false);
    onSelectShape(null);
  }, [onSelectShape, onWorkplaneModeChange, setTapeActive]);

  const collapseCameraControls = useCallback(() => {
    setCameraControlsCollapsed(true);
    setTapeToolsOpen(false);
    setTapeActive(false);
    tapeDeleteModeRef.current = false;
    setTapeDeleteMode(false);
    tapeMoveModeRef.current = false;
    setTapeMoveMode(false);
    tapePointDragRef.current = null;
  }, [setTapeActive]);

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
        event.currentTarget.setPointerCapture(event.pointerId);
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
      if (isTypingTarget(event.target)) {
        return;
      }

      const key = event.key.toLowerCase();
      const shortcutView = !event.ctrlKey && !event.metaKey && !event.altKey
        ? VIEW_FACE_SHORTCUTS[event.key]
        : undefined;
      if (event.key === "Escape" && workplaneModeRef.current) {
        event.preventDefault();
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
      } else if (shortcutView) {
        event.preventDefault();
        setViewCubeFace(shortcutView);
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
      } else if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        zoomCamera(0.72);
      } else if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        zoomCamera(1.28);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focusSelection, onWorkplaneModeChange, resetView, tapeToolsOpen, setPlacementWorkplaneAtSelection, setTapeActive, setViewCubeFace, togglePlacementWorkplane, toggleProjection, zoomCamera]);

  return (
    <main className="workplane-stage">
      <div className="view-cube" aria-label={t("view.cube")} onPointerDown={(event) => event.stopPropagation()}>
        <div className="view-cube-inner" ref={viewCubeRef}>
          <button type="button" className="cube-face cube-top" aria-label={t("view.bottom")} aria-keyshortcuts="6" title={t("camera.shortcut", { label: t("view.bottom"), keys: "6" })} onClick={() => setViewCubeFace("bottom")}>{t("view.bottomShort")}</button>
          <button type="button" className="cube-face cube-bottom" aria-label={t("view.top")} aria-keyshortcuts="5" title={t("camera.shortcut", { label: t("view.top"), keys: "5" })} onClick={() => setViewCubeFace("top")}>{t("view.topShort")}</button>
          <button type="button" className="cube-face cube-front" aria-label={t("view.front")} aria-keyshortcuts="1" title={t("camera.shortcut", { label: t("view.front"), keys: "1" })} onClick={() => setViewCubeFace("front")}>{t("view.frontShort")}</button>
          <button type="button" className="cube-face cube-back" aria-label={t("view.back")} aria-keyshortcuts="2" title={t("camera.shortcut", { label: t("view.back"), keys: "2" })} onClick={() => setViewCubeFace("back")}>{t("view.backShort")}</button>
          <button type="button" className="cube-face cube-right" aria-label={t("view.right")} aria-keyshortcuts="4" title={t("camera.shortcut", { label: t("view.right"), keys: "4" })} onClick={() => setViewCubeFace("right")}>{t("view.rightShort")}</button>
          <button type="button" className="cube-face cube-left" aria-label={t("view.left")} aria-keyshortcuts="3" title={t("camera.shortcut", { label: t("view.left"), keys: "3" })} onClick={() => setViewCubeFace("left")}>{t("view.leftShort")}</button>
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
            <div className="workplane-control-group">
              <button
                className={workplaneMode ? "active" : ""}
                aria-label={t("camera.placeWorkplane")}
                title={t("camera.shortcut", { label: t("camera.placeWorkplane"), keys: "W" })}
                aria-pressed={workplaneMode}
                onClick={togglePlacementWorkplane}
              >
                <PanelsTopLeft size={25} strokeWidth={2.1} aria-hidden="true" />
              </button>
            </div>
            <div className="tape-control-group">
              <button
                className={`tape-trigger ${tapeToolsOpen ? "active" : ""}`}
                aria-label={t("camera.tapeTools")}
                title={t("camera.tapeTools")}
                aria-expanded={tapeToolsOpen}
                aria-controls="tape-tool-popover"
                onClick={toggleTapeTools}
              >
                <RulerDimensionLine size={26} strokeWidth={2.2} aria-hidden="true" />
              </button>
              {tapeToolsOpen ? (
                <div id="tape-tool-popover" className="tape-tool-popover" aria-label={t("camera.tapeActions")}>
                  <button className={tapeMode ? "active" : ""} aria-label={t("camera.addMeasurement")} title={t("camera.addMeasurement")} aria-pressed={tapeMode} onClick={activateTapeAdd}>
                    <Plus size={21} strokeWidth={2.4} aria-hidden="true" />
                  </button>
                  <button className={tapeMoveMode ? "active" : ""} aria-label={t("camera.moveMeasurement")} title={t("camera.moveMeasurement")} aria-pressed={tapeMoveMode} onClick={activateTapeMove}>
                    <MousePointer2 size={20} strokeWidth={2.25} aria-hidden="true" />
                  </button>
                  <button className={`tape-delete-button ${tapeDeleteMode ? "active" : ""}`} aria-label={t("camera.deleteMeasurement")} title={t("camera.deleteMeasurement")} aria-pressed={tapeDeleteMode} onClick={activateTapeDelete}>
                    <X size={20} strokeWidth={2.4} aria-hidden="true" />
                  </button>
                </div>
              ) : null}
            </div>
            <div className="corner-ruler-control-group">
              <button
                className={cornerRulerMode ? "active" : ""}
                aria-label={t("camera.cornerRulerTool")}
                title={t("camera.cornerRulerTool")}
                aria-pressed={cornerRulerMode}
                onClick={toggleCornerRulerTool}
              >
                <Ruler size={24} strokeWidth={2.15} aria-hidden="true" />
              </button>
            </div>
          </>
        )}
      </div>

      <section className={`workplane-wrap ${noteMode ? "note-mode" : ""} ${workplaneMode ? "placing-workplane" : ""} ${tapeMode ? "tape-mode" : ""} ${tapeDeleteMode ? "tape-delete-mode" : ""} ${tapeMoveMode ? "tape-move-mode" : ""} ${cornerRulerMode ? "corner-ruler-mode" : ""} ${modifierActive ? "modifier-edge-pick" : ""}`} aria-label={t("aria.workplane")}>
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
          {!workplaneMode && marqueeRect ? <div className="selection-marquee" style={marqueeRect} /> : null}
          {!workplaneMode && moveDimensionsEnabled && moveDimensionOverlay ? (
            <MoveDimensionOverlay
              overlay={moveDimensionOverlay}
              active={moveDimensionOverlay.active}
              onCommit={commitMoveDimension}
            />
          ) : null}
          {!workplaneMode && originDimensionsEnabled && originDimensionOverlay ? (
            <OriginDimensionOverlay overlay={originDimensionOverlay} />
          ) : null}
          {!workplaneMode && transformOverlay && !alignMode && !mirrorMode && !tapeMode && !tapeDeleteMode && !tapeMoveMode && !modifierActive ? (
            <TransformOverlay
              box={transformOverlay}
              measureKey={pinnedMeasureKey ?? hoverMeasureKey}
              editingDimension={editingDimension}
              editingRotation={editingRotation}
              rotationReadout={rotationReadout}
              showRotationWheel={activeRotationWheel}
              hideSelectionChrome={activeTransformKind === "rotate"}
              hideDimensionMarks={false}
              rotationWheelAxis={rotationWheelAxis}
              pinnedRotationWheelView={pinnedRotationWheelView}
              onBeginCameraDrag={beginCameraDragFromOverlay}
              onCameraWheel={forwardCameraWheelFromOverlay}
              onBeginTransform={beginTransform}
              onMoveTransform={updateTransform}
              onFinishTransform={finishTransform}
              onHoverMeasure={setHoverMeasureKey}
              onPinMeasure={setPinnedMeasureKey}
              onBeginDimensionEdit={beginDimensionEdit}
              onBeginLiftEdit={beginLiftEdit}
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
            />
          ) : null}
          {!workplaneMode && alignOverlay ? <AlignOverlay overlay={alignOverlay} onAlign={onAlignSelection} onPreview={onAlignPreview} onPreviewClear={onAlignPreviewClear} /> : null}
          {!workplaneMode && mirrorOverlay ? <MirrorOverlay overlay={mirrorOverlay} onMirror={onMirrorSelection} onPreview={onMirrorPreview} onPreviewClear={onMirrorPreviewClear} /> : null}
          {!workplaneMode && tapeOverlay && (tapeOverlay.points.length > 0 || tapeOverlay.hover) ? (
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
          {!workplaneMode && rulerDimensionOverlay && rulerDimensionOverlay.items.length > 0 ? (
            <RulerDimensionOverlay
              overlay={rulerDimensionOverlay}
              onLabelClick={beginRulerDimensionEdit}
              onHandlePointerDown={handleRulerDuplicatePointerDown}
              onHandlePointerMove={handleRulerDuplicatePointerMove}
              onHandlePointerUp={handleRulerDuplicatePointerUp}
            />
          ) : null}
          {!workplaneMode && cornerRulerOverlay && cornerRulerOverlay.items.length > 0 ? (
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

      {selectedShape && !modifierActive && !tapeMode && !tapeDeleteMode && !tapeMoveMode ? (
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
            onUpdateShape(selectedShape.id, patchWithResizeAnchor(inspected, patch, options?.resizeAxis, lastResizeAnchorRef.current));
          }}
          onSnapChange={chooseSnapGrid}
          onSnapOpenChange={setSnapOpen}
          onEditSketch={selectedShape.sketchProfile ? onEditSketch : undefined}
          canSeparateParts={canSeparateParts}
          onSeparateParts={onSeparateParts}
          onInteractionActiveChange={onInteractionActiveChange}
        />
      ) : null}

      {!selectedShape ? (
        <div className="grid-settings">
          <SnapGridControl snap={snap} snapOpen={snapOpen} onSnapChange={chooseSnapGrid} onSnapOpenChange={setSnapOpen} />
        </div>
      ) : null}

      {settingsOpen ? (
        <WorkspaceSettingsModal
          workspace={workspace}
          snap={snap}
          themePreference={themePreference}
          moveDimensionsEnabled={moveDimensionsEnabled}
          originDimensionsEnabled={originDimensionsEnabled}
          showProjectNameInToolbar={showProjectNameInToolbar}
          onWorkspaceChange={setWorkspace}
          onSnapChange={chooseSnapGrid}
          onThemePreferenceChange={onThemePreferenceChange}
          onMoveDimensionsEnabledChange={changeMoveDimensionsEnabled}
          onOriginDimensionsEnabledChange={changeOriginDimensionsEnabled}
          onShowProjectNameInToolbarChange={onShowProjectNameInToolbarChange}
          onMakeDefault={makeWorkspaceDefault}
          onClose={() => setSettingsOpen(false)}
        />
      ) : null}
    </main>
  );
}

function createThreeScene(host: HTMLDivElement): ThreeState {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: false });
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
  controls.zoomSpeed = 0.72;
  controls.panSpeed = 0.65;
  controls.screenSpacePanning = true;
  controls.zoomToCursor = true;
  controls.mouseButtons = {
    LEFT: null,
    MIDDLE: THREE.MOUSE.PAN,
    RIGHT: THREE.MOUSE.ROTATE,
  };
  controls.minDistance = 18;
  controls.maxDistance = 4200;
  controls.minZoom = 0.02;
  controls.maxZoom = 100;
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
  scene.add(workplaneLayer, workplanePreviewLayer, shapeLayer, helperLayer, transformGuideLayer, moveDimensionLayer, originDimensionLayer, modifierLayer);

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
    disposeInteractionListeners: () => {},
    resize,
  };
  const requestRender = () => {
    state.needsRender = true;
  };
  const configureLayerlingMouseButtons = (event: PointerEvent) => {
    controls.mouseButtons.LEFT = event.button === 0 && (event.ctrlKey || event.metaKey) ? THREE.MOUSE.PAN : null;
    controls.mouseButtons.MIDDLE = THREE.MOUSE.PAN;
    controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
  };
  const resetLayerlingMouseButtons = () => {
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
  controls.addEventListener("change", requestRender);
  SAFARI_GESTURES.forEach((name) => renderer.domElement.addEventListener(name, preventSafariGesture));
  renderer.domElement.addEventListener("pointerdown", configureLayerlingMouseButtons, { capture: true });
  renderer.domElement.addEventListener("pointerup", resetLayerlingMouseButtons);
  renderer.domElement.addEventListener("pointercancel", resetLayerlingMouseButtons);
  renderer.domElement.addEventListener("contextmenu", preventContextMenu);
  renderer.domElement.addEventListener("wheel", requestRender, { passive: true });
  renderer.domElement.addEventListener("pointerdown", requestRender);
  state.disposeInteractionListeners = () => {
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
      22,
      4200,
    );
    next = new THREE.PerspectiveCamera(CAMERA_FOV, aspect, current.near, current.far);
    next.position.copy(target).addScaledVector(direction, distance);
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
  const offset = state.camera.position.clone().sub(state.controls.target);
  const distance = clamp(offset.length(), 22, 4200);
  const directionByFace: Record<ViewCubeFace, THREE.Vector3> = {
    top: new THREE.Vector3(0, 1, 0),
    bottom: new THREE.Vector3(0, -1, 0),
    front: new THREE.Vector3(0, 0, 1),
    back: new THREE.Vector3(0, 0, -1),
    right: new THREE.Vector3(1, 0, 0),
    left: new THREE.Vector3(-1, 0, 0),
  };
  const direction = directionByFace[face].clone().normalize();

  state.camera.up.set(0, 1, 0);
  state.camera.position.copy(state.controls.target).add(direction.multiplyScalar(distance));
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

  const offset = state.camera.position.clone().sub(state.controls.target);
  const horizontalDistance = Math.max(0.001, Math.hypot(offset.x, offset.z));
  const pitch = THREE.MathUtils.radToDeg(Math.atan2(offset.y, horizontalDistance));
  const yaw = THREE.MathUtils.radToDeg(Math.atan2(offset.x, offset.z));
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

  const palette = workplaneThemePalette(theme, workspace.background, workspace.gridColor, state.palette);
  disposeChildren(state.workplaneLayer);
  state.scene.background = new THREE.Color(palette.sceneBackground);
  state.renderer.shadowMap.enabled = workspace.showShadows;
  state.controls.zoomSpeed = 0.28 + workspace.zoomSpeed * 0.09;

  const activeIsBase = placementWorkplaneIsBase(placementWorkplane);
  const addPlane = (workplane: PlacementWorkplane, muted: boolean, showMarker: boolean) => {
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
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
      }),
    );
    surface.name = muted ? "WorkplaneBaseReference" : "WorkplaneBase";
    surface.rotation.x = -Math.PI / 2;
    surface.receiveShadow = workspace.showShadows && !muted;
    group.add(surface);

    const lineColor = muted ? theme === "dark" ? "#76828a" : "#99a3aa" : workspace.gridColor;
    if (workspace.showGrid) {
      group.add(createGridLines(
        workspace.width,
        workspace.depth,
        workspace.gridBlockSize,
        theme,
        lineColor,
        state.palette,
      ));
      const labelPalette = workplaneGridPalette(theme, lineColor, state.palette).major;
      const label = createWorkplaneLabel(
        workspace.width,
        workspace.depth,
        labelPalette.color,
        muted ? labelPalette.opacity * 0.5 : labelPalette.opacity,
        projectName,
      );
      if (label) {
        group.add(label);
      }
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

  addPlane(horizontalPlacementWorkplane(), !activeIsBase, false);
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
 * Flat label along the near edge of a workplane, so its orientation is
 * readable at a glance instead of having to be inferred from the axis lines.
 *
 * Drawn into a canvas rather than built from glyph geometry: it is a single
 * static string that never needs to be a solid, and a texture costs one quad.
 */
function createWorkplaneLabel(width: number, depth: number, color: string, opacity: number, subtitle = "") {
  const layout = workplaneLabelLayout(width, depth);
  if (layout.width <= 0 || layout.height <= 0) {
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
  context.textAlign = "left";
  context.textBaseline = "middle";
  const textLeft = canvas.width * 0.015;
  const textWidth = canvas.width - textLeft * 2;
  const caption = subtitle.trim();
  if (caption) {
    // Two lines: the plane's name, and underneath it, smaller, the project it
    // belongs to - so a screenshot of the scene says what it shows.
    context.font = `600 ${Math.round(canvas.height * 0.46)}px ${WORKPLANE_LABEL_FONT_STACK}`;
    context.fillText(t("workplane.label"), textLeft, canvas.height * 0.4, textWidth);
    context.font = `500 ${Math.round(canvas.height * 0.26)}px ${WORKPLANE_LABEL_FONT_STACK}`;
    context.globalAlpha = 0.78;
    context.fillText(caption, textLeft, canvas.height * 0.82, textWidth);
    context.globalAlpha = 1;
  } else {
    context.font = `600 ${Math.round(canvas.height * 0.68)}px ${WORKPLANE_LABEL_FONT_STACK}`;
    context.fillText(t("workplane.label"), textLeft, canvas.height * 0.57, textWidth);
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
  label.position.set(layout.lateralOffset, WORKPLANE_LINE_ELEVATION + 0.01, layout.depthOffset);
  label.renderOrder = 2;
  return label;
}

function createGridLines(
  width = WORKPLANE_WIDTH,
  depth = WORKPLANE_DEPTH,
  blockSize = DEFAULT_WORKSPACE.gridBlockSize,
  theme: ResolvedAppTheme = "light",
  gridColor = DEFAULT_WORKSPACE.gridColor,
  paletteName: AppThemePalette = "default",
) {
  const group = new THREE.Group();
  const palette = workplaneThemePalette(theme, DEFAULT_WORKSPACE.background, gridColor, paletteName).grid;
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
  const step = clamp(blockSize, MIN_GRID_BLOCK_SIZE, MAX_GRID_BLOCK_SIZE);
  for (const { coordinate: centeredX, index } of interiorWorkplaneGridCoordinates(width, step)) {
    const points = centeredX === 0 ? axisPoints : index % WORKPLANE_MAJOR_GRID_INTERVAL === 0 ? majorPoints : minorPoints;
    pushLine(points, [centeredX, WORKPLANE_LINE_ELEVATION, -depth / 2], [centeredX, WORKPLANE_LINE_ELEVATION, depth / 2]);
  }

  for (const { coordinate: centeredZ, index } of interiorWorkplaneGridCoordinates(depth, step)) {
    const points = centeredZ === 0 ? axisPoints : index % WORKPLANE_MAJOR_GRID_INTERVAL === 0 ? majorPoints : minorPoints;
    pushLine(points, [-width / 2, WORKPLANE_LINE_ELEVATION, centeredZ], [width / 2, WORKPLANE_LINE_ELEVATION, centeredZ]);
  }

  const border = new THREE.LineBasicMaterial({ ...palette.border, transparent: true, depthWrite: false });
  pushLine(borderPoints, [-width / 2, WORKPLANE_LINE_ELEVATION, -depth / 2], [width / 2, WORKPLANE_LINE_ELEVATION, -depth / 2]);
  pushLine(borderPoints, [width / 2, WORKPLANE_LINE_ELEVATION, -depth / 2], [width / 2, WORKPLANE_LINE_ELEVATION, depth / 2]);
  pushLine(borderPoints, [width / 2, WORKPLANE_LINE_ELEVATION, depth / 2], [-width / 2, WORKPLANE_LINE_ELEVATION, depth / 2]);
  pushLine(borderPoints, [-width / 2, WORKPLANE_LINE_ELEVATION, depth / 2], [-width / 2, WORKPLANE_LINE_ELEVATION, -depth / 2]);

  group.add(linesFromPoints(minorPoints, minor));
  group.add(linesFromPoints(majorPoints, major));
  group.add(linesFromPoints(axisPoints, axis));
  group.add(linesFromPoints(borderPoints, border));

  return group;
}

function linesFromPoints(points: number[], material: THREE.LineBasicMaterial) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
  const lines = new THREE.LineSegments(geometry, material);
  lines.renderOrder = 1;
  return lines;
}

type CutPreviewShapeFrame = {
  shape: WorkplaneShape;
  worldBounds: THREE.Box3;
};

function shapeCutPreviewFrames(state: ThreeState, shapes: WorkplaneShape[]) {
  return shapes.reduce<Record<string, CutPreviewShapeFrame>>((frames, shape) => {
    const object = findShapeObject(state, shape.id);
    if (!object) {
      return frames;
    }
    object.updateMatrixWorld(true);
    const worldBounds = new THREE.Box3().setFromObject(object);
    if (!worldBounds.isEmpty()) {
      frames[shape.id] = { shape, worldBounds };
    }
    return frames;
  }, {});
}

type CutPreviewBrushCacheEntry = {
  signature: string;
  brush: Brush;
};

const cutPreviewBrushCache = new WeakMap<THREE.Object3D, CutPreviewBrushCacheEntry>();
const cutPreviewEvaluator = new Evaluator();
cutPreviewEvaluator.useGroups = false;
cutPreviewEvaluator.attributes = ["position", "normal"];

function cutPreviewObjectSignature(root: THREE.Object3D) {
  const parts: string[] = [];
  root.updateMatrixWorld(true);
  const inverseRoot = root.matrixWorld.clone().invert();
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.visible || !(child.geometry instanceof THREE.BufferGeometry)) {
      return;
    }
    const relativeMatrix = inverseRoot.clone().multiply(child.matrixWorld);
    parts.push(child.geometry.uuid, ...relativeMatrix.elements.map((value) => value.toFixed(5)));
  });
  return parts.join(":");
}

function cutPreviewBrushFromObject(root: THREE.Object3D) {
  const signature = cutPreviewObjectSignature(root);
  const cached = cutPreviewBrushCache.get(root);
  if (cached?.signature === signature) {
    cached.brush.matrixAutoUpdate = false;
    cached.brush.matrix.copy(root.matrixWorld);
    cached.brush.matrixWorld.copy(root.matrixWorld);
    return cached.brush;
  }

  const positions: number[] = [];
  const point = new THREE.Vector3();
  const inverseRoot = root.matrixWorld.clone().invert();
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.visible || !(child.geometry instanceof THREE.BufferGeometry)) {
      return;
    }

    const position = child.geometry.getAttribute("position");
    if (!position) {
      return;
    }
    const index = child.geometry.getIndex();
    const count = index?.count ?? position.count;
    const relativeMatrix = inverseRoot.clone().multiply(child.matrixWorld);
    const mirrored = relativeMatrix.determinant() < 0;
    for (let offset = 0; offset + 2 < count; offset += 3) {
      const triangle = [0, 1, 2].map((corner) => {
        const vertexIndex = index ? index.getX(offset + corner) : offset + corner;
        return point
          .set(position.getX(vertexIndex), position.getY(vertexIndex), position.getZ(vertexIndex))
          .applyMatrix4(relativeMatrix)
          .toArray();
      });
      if (mirrored) {
        [triangle[1], triangle[2]] = [triangle[2], triangle[1]];
      }
      positions.push(...triangle[0], ...triangle[1], ...triangle[2]);
    }
  });

  if (positions.length < 9) {
    return null;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  const brush = new Brush(geometry);
  brush.matrixAutoUpdate = false;
  brush.matrix.copy(root.matrixWorld);
  brush.matrixWorld.copy(root.matrixWorld);
  if (cached) {
    cached.brush.geometry.dispose();
  }
  cutPreviewBrushCache.set(root, { signature, brush });
  return brush;
}

function cutPreviewActualIntersectionGeometry(state: ThreeState, solid: WorkplaneShape, hole: WorkplaneShape) {
  const solidObject = findShapeObject(state, solid.id);
  const holeObject = findShapeObject(state, hole.id);
  if (!solidObject || !holeObject) {
    return null;
  }

  const solidBrush = cutPreviewBrushFromObject(solidObject);
  const holeBrush = cutPreviewBrushFromObject(holeObject);
  if (!solidBrush || !holeBrush) {
    return null;
  }

  // Equal-height cylinders have coplanar caps. Feeding those surfaces directly
  // to three-bvh-csg can turn a few hundred input triangles into hundreds of
  // thousands of preview triangles. A tiny local expansion preserves the
  // visible cut while keeping the preview topology bounded.
  const holeScale = new THREE.Matrix4().makeScale(
    (shapeWidth(hole) + CUT_PREVIEW_PADDING * 2) / Math.max(MIN_SHAPE_SIZE, shapeWidth(hole)),
    (hole.height + CUT_PREVIEW_PADDING * 2) / Math.max(MIN_SHAPE_SIZE, hole.height),
    (shapeDepth(hole) + CUT_PREVIEW_PADDING * 2) / Math.max(MIN_SHAPE_SIZE, shapeDepth(hole)),
  );
  const paddedHoleMatrix = holeBrush.matrix.clone().multiply(holeScale);
  holeBrush.matrix.copy(paddedHoleMatrix);
  holeBrush.matrixWorld.copy(paddedHoleMatrix);

  try {
    const result = cutPreviewEvaluator.evaluate(solidBrush, holeBrush, HOLLOW_INTERSECTION);
    const position = result.geometry.getAttribute("position");
    if (!position || position.count < 3) {
      result.geometry.dispose();
      return null;
    }
    const geometry = result.geometry.clone();
    geometry.applyMatrix4(result.matrixWorld);
    result.geometry.dispose();
    geometry.computeVertexNormals();
    return geometry;
  } catch {
    return null;
  }
}

function addCutPreviewOverlays(state: ThreeState, holeFrame: CutPreviewShapeFrame, solidFrames: CutPreviewShapeFrame[]) {
  solidFrames.forEach((solidFrame) => {
    if (!holeFrame.worldBounds.intersectsBox(solidFrame.worldBounds)) {
      return;
    }

    const geometry = cutPreviewActualIntersectionGeometry(state, solidFrame.shape, holeFrame.shape);
    if (!geometry) {
      return;
    }
    const preview = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        color: "#30363a",
        transparent: true,
        opacity: 0.34,
        depthTest: false,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    preview.name = "CutPreviewOverlay";
    preview.renderOrder = 18;
    preview.userData.cutPreview = true;
    preview.raycast = () => undefined;
    setObjectRenderLayer(preview, RENDER_LAYER_PREVIEWS);
    freezeStaticObjectMatrices(preview);
    state.shapeLayer.add(preview);
  });
}

function clearCutPreviewOverlays(state: ThreeState) {
  const overlays: THREE.Object3D[] = [];
  state.shapeLayer.traverse((child) => {
    if (child.userData.cutPreview) {
      overlays.push(child);
    }
  });
  overlays.forEach((overlay) => {
    overlay.parent?.remove(overlay);
    disposeObject(overlay);
  });
}

function syncCutPreviewOverlays(state: ThreeState, shapes: WorkplaneShape[]) {
  clearCutPreviewOverlays(state);
  const visibleShapes = shapes.filter((shape) => !shape.hidden);
  const cutFrames = shapeCutPreviewFrames(state, visibleShapes);
  const solidFrames = visibleShapes
    .filter((shape) => !shape.hole)
    .map((shape) => cutFrames[shape.id])
    .filter((frame): frame is CutPreviewShapeFrame => Boolean(frame));

  if (solidFrames.length === 0) {
    return;
  }

  visibleShapes.forEach((shape) => {
    if (!shape.hole) {
      return;
    }
    const holeFrame = cutFrames[shape.id];
    if (holeFrame) {
      addCutPreviewOverlays(state, holeFrame, solidFrames);
    }
  });
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
        const childShape = shape.hole ? { ...child, hole: true, color: "#b8c2cc" } : child;
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

function rebuildShapes(
  state: ThreeState | null,
  shapes: WorkplaneShape[],
  selectedIds: string[],
  showCutPreviews = true,
  useOfficialModifierRendering = false,
  workplane: PlacementWorkplane = horizontalPlacementWorkplane(),
) {
  if (!state) {
    return;
  }

  clearCutPreviewOverlays(state);
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
    if (showCutPreviews) {
      syncCutPreviewOverlays(state, visibleShapes);
    }
    rebuildSelectionHelpers(state, shapes, selectedIds, workplane);
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

  if (showCutPreviews) {
    syncCutPreviewOverlays(state, visibleShapes);
  }

  rebuildSelectionHelpers(state, shapes, selectedIds, workplane);
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

function formatMeasure(value: number, accuracy: MeasurementAccuracy = DEFAULT_WORKSPACE.accuracy) {
  const zeroThreshold = 0.5 * 10 ** -accuracy;
  return cleanNearZero(value, zeroThreshold).toFixed(accuracy);
}

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
  const workplaneY = workplaneYForFrame(frame, activeWorkplane);
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
  const xFaceCenter = sidePoint(rotationSides.x, 0);
  const zFaceCenter = sidePoint(rotationSides.z, 0);
  const yFaceCenter = bottomCenterWorld;
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
    { point: bottom.nearLeft, handle: { key: "near-left", className: "corner", kind: "scale" as const, x: bottom.nearLeft.x, y: bottom.nearLeft.y, title: "Resize" } },
    { point: bottom.nearRight, handle: { key: "near-right", className: "corner", kind: "scale" as const, x: bottom.nearRight.x, y: bottom.nearRight.y, title: "Resize" } },
    { point: bottom.farRight, handle: { key: "far-right", className: "corner", kind: "scale" as const, x: bottom.farRight.x, y: bottom.farRight.y, title: "Resize" } },
    { point: bottom.farLeft, handle: { key: "far-left", className: "corner", kind: "scale" as const, x: bottom.farLeft.x, y: bottom.farLeft.y, title: "Resize" } },
    { point: mid.near, handle: { key: "near-mid", className: "edge dark", kind: "scale" as const, x: mid.near.x, y: mid.near.y, title: "Resize" } },
    { point: mid.right, handle: { key: "right-mid", className: "edge dark", kind: "scale" as const, x: mid.right.x, y: mid.right.y, title: "Resize" } },
    { point: mid.far, handle: { key: "far-mid", className: "edge dark", kind: "scale" as const, x: mid.far.x, y: mid.far.y, title: "Resize" } },
    { point: mid.left, handle: { key: "left-mid", className: "edge dark", kind: "scale" as const, x: mid.left.x, y: mid.left.y, title: "Resize" } },
    { point: heightPoint, handle: { key: heightHandleKey, className: "height-top", kind: "height" as const, x: heightPoint.x, y: heightPoint.y, title: "Height" } },
    { point: liftPoint, handle: { key: liftHandleKey, className: showLowerLiftHandle ? "height-lift lower" : "height-lift", kind: "lift" as const, x: liftPoint.x, y: liftPoint.y, title: "Lift", angle: liftHandleAngle } },
  ].filter(({ point }) => point.visible).map(({ handle }) => handle);
  const rotationChromeVisible = !cameraInsideSelection && centerPoint.visible;
  const rotateHandles = rotationChromeVisible ? [
    rotateLeftSource.visible ? { key: "rotate-left", className: "screen-left", x: rotateLeft.x, y: rotateLeft.y, plane: normalizedRotationPlaneBasis(rotationHandlePlanes.x, true) } : null,
    rotateRightSource.visible ? { key: "rotate-right", className: "screen-right", x: rotateRight.x, y: rotateRight.y, plane: normalizedRotationPlaneBasis(rotationHandlePlanes.z, true) } : null,
    rotateBottomSource.visible ? { key: "rotate-bottom", className: "screen-bottom", x: rotateBottom.x, y: rotateBottom.y, plane: normalizedRotationPlaneBasis(rotationHandlePlanes.y, true) } : null,
  ].filter((handle): handle is NonNullable<typeof handle> => Boolean(handle)) : [];

  // Which mid-edge handle sits on the side of the shape currently facing the
  // camera - same sign convention as showLowerHandles above, so the always-on
  // dimension labels for a lone selection land on a readable, visible face
  // instead of potentially behind the shape.
  const cameraView = state.camera.position.clone().sub(frame.center);
  const widthMidHandleKey = cameraView.dot(xFootAxis) >= 0 ? "right-mid" : "left-mid";
  const depthMidHandleKey = cameraView.dot(zFootAxis) >= 0 ? "near-mid" : "far-mid";
  const alwaysVisibleDimensionKeys = frame.singleShape
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
  };

  if (updateDomImmediately) {
    updateTransformOverlayDom(state, next);
  }
  updateTransformOverlayIfChanged(overlayRef, setOverlay, next);
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
  const worldMinY = Math.min(...corners.map((corner) => corner.y));
  const worldMaxY = Math.max(...corners.map((corner) => corner.y));
  const worldMinX = Math.min(...corners.map((corner) => corner.x));
  const worldMaxX = Math.max(...corners.map((corner) => corner.x));
  const worldMinZ = Math.min(...corners.map((corner) => corner.z));
  const worldMaxZ = Math.max(...corners.map((corner) => corner.z));
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
        title: "Mirror left-right",
      },
      {
        axis: "z" as const,
        key: "mirror-z",
        x: zScreen.x,
        y: zScreen.y,
        angle: screenAngle(zWorld.clone().add(new THREE.Vector3(0, 0, -step)), zWorld.clone().add(new THREE.Vector3(0, 0, step))),
        title: "Mirror front-back",
      },
      {
        axis: "y" as const,
        key: "mirror-y",
        x: yScreen.x,
        y: yScreen.y,
        angle: screenAngle(yWorld.clone().add(new THREE.Vector3(0, -step, 0)), yWorld.clone().add(new THREE.Vector3(0, step, 0))),
        title: "Mirror top-bottom",
      },
    ],
  };

  overlayRef.current = next;
  setOverlay(next);
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

function createTransformHandles(box: THREE.Box3, id: string) {
  const group = new THREE.Group();
  group.name = "LayerlingTransformHandles";
  group.userData.shapeId = id;

  const handleMaterial = new THREE.MeshBasicMaterial({ color: "#e8eef1" });
  const darkMaterial = new THREE.MeshBasicMaterial({ color: "#273849" });
  const rotateMaterial = new THREE.LineBasicMaterial({ color: "#00aeea", transparent: true, opacity: 0.96 });
  const dashMaterial = new THREE.LineDashedMaterial({ color: "#2c3339", dashSize: 2.2, gapSize: 2.4, transparent: true, opacity: 0.72 });
  const handleGeometry = new THREE.BoxGeometry(2.6, 2.6, 2.6);
  const dotGeometry = new THREE.BoxGeometry(1.7, 1.7, 1.7);
  const coneGeometry = new THREE.ConeGeometry(1.7, 3.4, 18);

  const center = box.getCenter(new THREE.Vector3());
  const topY = box.max.y + 1.4;
  const x0 = box.min.x;
  const x1 = box.max.x;
  const z0 = box.min.z;
  const z1 = box.max.z;
  const xm = center.x;
  const zm = center.z;

  const cornerPoints = [
    { key: "far-left", kind: "scale" as const, point: new THREE.Vector3(x0, box.min.y + 1.3, z0) },
    { key: "far-right", kind: "scale" as const, point: new THREE.Vector3(x1, box.min.y + 1.3, z0) },
    { key: "near-left", kind: "scale" as const, point: new THREE.Vector3(x0, box.min.y + 1.3, z1) },
    { key: "near-right", kind: "scale" as const, point: new THREE.Vector3(x1, box.min.y + 1.3, z1) },
    { key: "far-left", kind: "scale" as const, point: new THREE.Vector3(x0, topY, z0) },
    { key: "far-right", kind: "scale" as const, point: new THREE.Vector3(x1, topY, z0) },
    { key: "near-left", kind: "scale" as const, point: new THREE.Vector3(x0, topY, z1) },
    { key: "near-right", kind: "scale" as const, point: new THREE.Vector3(x1, topY, z1) },
    { key: "top-height", kind: "height" as const, point: new THREE.Vector3(xm, box.max.y + 7, zm) },
  ];

  cornerPoints.forEach(({ key, kind, point }) => {
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.copy(point);
    handle.userData.shapeId = id;
    handle.userData.transformHandle = kind;
    handle.userData.transformHandleKey = key;
    handle.userData.transformPlaneY = point.y;
    group.add(handle);
    const outline = new THREE.LineSegments(new THREE.EdgesGeometry(handleGeometry), new THREE.LineBasicMaterial({ color: "#2d3439", transparent: true, opacity: 0.86 }));
    outline.position.copy(point);
    outline.userData.shapeId = id;
    outline.userData.transformHandle = handle.userData.transformHandle;
    outline.userData.transformHandleKey = key;
    outline.userData.transformPlaneY = point.y;
    group.add(outline);
  });

  [
    { key: "far-mid", point: new THREE.Vector3(xm, topY, z0) },
    { key: "near-mid", point: new THREE.Vector3(xm, topY, z1) },
    { key: "left-mid", point: new THREE.Vector3(x0, topY, zm) },
    { key: "right-mid", point: new THREE.Vector3(x1, topY, zm) },
    { key: "far-mid", point: new THREE.Vector3(xm, box.min.y + 1.3, z0) },
    { key: "near-mid", point: new THREE.Vector3(xm, box.min.y + 1.3, z1) },
    { key: "left-mid", point: new THREE.Vector3(x0, box.min.y + 1.3, zm) },
    { key: "right-mid", point: new THREE.Vector3(x1, box.min.y + 1.3, zm) },
  ].forEach(({ key, point }) => {
    const dot = new THREE.Mesh(dotGeometry, darkMaterial);
    dot.position.copy(point);
    dot.userData.shapeId = id;
    dot.userData.transformHandle = "scale";
    dot.userData.transformHandleKey = key;
    dot.userData.transformPlaneY = point.y;
    group.add(dot);
  });

  [
    [new THREE.Vector3(xm, box.max.y + 7, zm), new THREE.Vector3(xm, box.min.y + 1.3, zm)],
  ].forEach(([from, to]) => {
    const geometry = new THREE.BufferGeometry().setFromPoints([from, to]);
    const line = new THREE.Line(geometry, dashMaterial);
    line.computeLineDistances();
    group.add(line);
  });

  [
    { key: "rotate-left", center: new THREE.Vector3(x0 - 5, topY + 5, z0 - 5), start: 0.15, end: 1.45, arrow: new THREE.Vector3(x0 - 2.8, topY + 5, z0 - 8.2), rotation: Math.PI * 0.35 },
    { key: "rotate-right", center: new THREE.Vector3(x1 + 5, topY + 5, z0 - 5), start: 1.7, end: 2.95, arrow: new THREE.Vector3(x1 + 8.2, topY + 5, z0 - 2.8), rotation: Math.PI * 0.85 },
    { key: "rotate-bottom", center: new THREE.Vector3(x1 + 5, topY + 5, z1 + 5), start: 3.3, end: 4.55, arrow: new THREE.Vector3(x1 + 2.8, topY + 5, z1 + 8.2), rotation: Math.PI * 1.35 },
  ].forEach((arc) => {
    const line = createRotateArc(arc.center, 5.5, arc.start, arc.end, rotateMaterial);
    line.userData.shapeId = id;
    line.userData.transformHandle = "rotate";
    line.userData.transformHandleKey = arc.key;
    group.add(line);
    const arrow = new THREE.Mesh(coneGeometry, darkMaterial);
    arrow.position.copy(arc.arrow);
    arrow.rotation.set(Math.PI / 2, 0, arc.rotation);
    arrow.userData.shapeId = id;
    arrow.userData.transformHandle = "rotate";
    arrow.userData.transformHandleKey = arc.key;
    group.add(arrow);
  });

  return group;
}

function createRotateArc(center: THREE.Vector3, radius: number, start: number, end: number, material: THREE.LineBasicMaterial) {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= 18; i += 1) {
    const angle = start + ((end - start) * i) / 18;
    points.push(new THREE.Vector3(center.x + Math.cos(angle) * radius, center.y, center.z + Math.sin(angle) * radius));
  }
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material);
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

function sharedShapeMaterial(shape: WorkplaneShape) {
  const key = JSON.stringify({
    color: shape.hole ? "#b7c0c9" : shape.color,
    transparent: Boolean(shape.hole),
    opacity: shape.hole ? (shape.importedMesh ? 0.34 : 0.52) : 1,
    roughness: shape.hole ? 0.88 : 0.57,
    side: "double",
  });
  const cached = sharedShapeMaterialCache.get(key);
  if (cached) {
    sharedShapeMaterialCache.delete(key);
    sharedShapeMaterialCache.set(key, cached);
    return cached.material;
  }
  const material = new THREE.MeshStandardMaterial({
    color: shape.hole ? "#b7c0c9" : shape.color,
    transparent: Boolean(shape.hole),
    opacity: shape.hole ? (shape.importedMesh ? 0.34 : 0.52) : 1,
    roughness: shape.hole ? 0.88 : 0.57,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });
  material.userData.cached = true;
  material.userData.sharedShapeMaterialKey = key;
  sharedShapeMaterialCache.set(key, { material, users: 0 });
  return material;
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
        const childShape = shape.hole ? { ...child, hole: true, color: "#b8c2cc" } : child;
        const childObject = createShapeObject(childShape, showEdges, onTextureReady, acceleratedPicking);
        childObject.userData.groupChildId = child.id;
        content.add(childObject);
      });
    const contentBox = new THREE.Box3().setFromObject(content);
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
    case "slot":
      addMesh(group, sharedShapeGeometry(geometryCacheKey, () => createSlotGeometry({
        width,
        depth,
        height,
        sides: shape.sides,
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
        helixAngle: shape.helixAngle,
        helixQuality: shape.helixQuality,
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
        addMesh(
          group,
          preserveEdgeSize ? getPreservedImportedMeshGeometry(shape) : getImportedMeshGeometry(shape.importedMesh),
          material,
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
  const tapered = geometry.userData.cached ? geometry.clone() : geometry;
  if (tapered !== geometry) {
    tapered.userData = {};
  }
  tapered.computeBoundingBox();
  const box = tapered.boundingBox;
  const position = tapered.getAttribute("position");
  if (!box || !position) return tapered;
  const height = Math.max(1e-6, box.max.y - box.min.y);
  const centerX = (box.min.x + box.max.x) / 2;
  const centerZ = (box.min.z + box.max.z) / 2;
  const deformed = shapeHasExtrudeDeform(shape);
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
      const relativeX = localX - centerX;
      const relativeZ = localZ - centerZ;
      localX = centerX + relativeX * cos - relativeZ * sin + deform.offsetX;
      localZ = centerZ + relativeX * sin + relativeZ * cos + deform.offsetZ;
    }
    position.setXYZ(index, localX, y, localZ);
  }
  position.needsUpdate = true;
  tapered.computeVertexNormals();
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
  }
  group.add(mesh);
  addShapeEdgeDecorations(group, mesh, prepared, shape);
}

function addShapeEdgeDecorations(group: THREE.Group, mesh: THREE.Mesh, prepared: THREE.BufferGeometry, shape: WorkplaneShape) {
  const complexEdges =
    shape.kind === "mesh" ||
    Boolean(shape.importedMesh) ||
    ["cone", "pyramid", "roof", "roundRoof", "halfSphere", "torus", "tube", "ring", "star", "gear", "wedge", "polygon", "heart", "crescent", "slot", "honeycomb"].includes(shape.kind);
  const importedTriangleCount = shape.importedMesh?.triangleCount ?? 0;
  const skipHeavyImportedEdges = Boolean(shape.importedMesh) && importedTriangleCount > IMPORTED_SELECTED_EDGE_TRIANGLE_LIMIT;
  if ((group.userData.showEdges || complexEdges) && !skipHeavyImportedEdges) {
    const selectedOutline = Boolean(group.userData.showEdges);
    const selectedRoundedBox = selectedOutline && shape.kind === "box" && Boolean(shape.radius && shape.radius > 0);
    const edgeColor = selectedOutline ? "#00aeea" : shape.hole ? "#697989" : complexEdges ? "#141b21" : darkenHex(shape.color, 0.34);
    const edgeOpacity = selectedRoundedBox ? 0 : selectedOutline ? 0.98 : shape.hole ? 0.44 : complexEdges ? 0.38 : shape.kind === "text" ? 0.86 : 0.2;
    if (selectedOutline && shape.importedMesh && shape.cadDisplayEdgesVersion === 2 && Boolean(shape.cadDisplayEdges?.length)) {
      addCadDisplayEdges(group, shape, edgeColor, edgeOpacity);
    } else {
      // Ein Gewinde bei einem Grad Schwelle waere ein Knaeuel aus zehntausenden
      // Linien. Bei 25 Grad bleiben genau die Kanten stehen, die den Gang
      // zeichnen: Kuppe, Grund und die beiden Flanken.
      const selectedThreshold = shape.importedMesh ? NORMAL_IMPORTED_SELECTION_EDGE_ANGLE : shape.kind === "thread" ? 25 : 1;
      const edges = new THREE.LineSegments(getEdgesGeometry(shape, prepared, selectedOutline ? selectedThreshold : complexEdges ? 14 : 25), sharedLineMaterial(edgeColor, edgeOpacity));
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

function setComplexEdgeVisibility(object: THREE.Object3D, visible: boolean) {
  object.traverse((child) => {
    if (child.userData.complexEdge) {
      child.visible = visible;
    }
  });
}

function addTextShape(group: THREE.Group, material: THREE.MeshStandardMaterial, shape: WorkplaneShape, geometryCacheKey: string) {
  const geometry = sharedShapeGeometry(geometryCacheKey, () => {
    const text = (shape.text ?? "TEXT").trim() || " ";
    const bevel = clamp(shape.bevel ?? 0, 0, 8);
    const fontName = shape.font ?? "Multilanguage";
    const next = new TextGeometry(text, {
      font: textFonts[fontName] ?? textFonts.Multilanguage,
      size: 20,
      depth: shape.height,
      curveSegments: fontName === "Stencil" ? 1 : 8,
      bevelEnabled: bevel > 0,
      bevelThickness: bevel * 0.22,
      bevelSize: bevel * 0.16,
      bevelSegments: Math.max(1, shape.segments ?? 0),
    });

    next.computeBoundingBox();
    const box = next.boundingBox;
    if (box) {
      const textWidth = Math.max(1, box.max.x - box.min.x);
      const textDepth = Math.max(1, box.max.y - box.min.y);
      const scale = Math.min(shapeWidth(shape) / textWidth, shapeDepth(shape) / textDepth);
      next.scale(scale, scale, 1);
    }

    next.rotateX(-Math.PI / 2);
    next.computeBoundingBox();
    const rotatedBox = next.boundingBox;
    if (rotatedBox) {
      next.translate(
        -(rotatedBox.min.x + rotatedBox.max.x) / 2,
        -rotatedBox.min.y,
        -(rotatedBox.min.z + rotatedBox.max.z) / 2,
      );
    }
    return next;
  });
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

function disposeChildren(group: THREE.Group) {
  while (group.children.length > 0) {
    const child = group.children[group.children.length - 1];
    if (child) {
      group.remove(child);
      disposeObject(child);
    }
  }
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
