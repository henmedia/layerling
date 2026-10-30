"use client";
import type { SurfaceTextureFace, SurfaceTextureSettings } from "@/lib/surfaceTexture";
import { markEscapeHandled } from "@/lib/escapeHandled";
import { ArrowDownToLine, Check, ChevronLeft, ChevronRight, Crosshair, Cuboid, Download, Eye, EyeOff, FlipHorizontal, GripVertical, Home, Layers, Minus, MousePointer2, PanelsTopLeft, PencilLine, PictureInPicture2, Plus, Rotate3d, RotateCcw, Ruler, RulerDimensionLine, Slice, Spline, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type Dispatch, type DragEvent, type MutableRefObject, type PointerEvent as ReactPointerEvent, type ReactNode, type SetStateAction, type WheelEvent as ReactWheelEvent } from "react";
import { objectSnapOffset, shiftSnapBox, type ObjectSnapGuide, type SnapBox } from "@/lib/objectSnap";
import { dragReach } from "@/lib/dragReach";
import { useMovablePanel, type MovablePanelOptions } from "@/lib/useMovablePanel";
import { computeSectionPlaneVector, DEFAULT_SECTION_SETTINGS, getSectionBounds, SECTION_AXES_SHOWN, sectionAxisLetter, sectionAxisVector, sectionFineWindow, sectionFrameFromView, sectionFrameFromWorkplane, sectionPlacementWorkplane, sectionPointFromFrame, sectionPointToFrame, type SectionFrame, type SectionOrientation, type SectionPlaneAxis, type SectionPlaneSettings } from "@/lib/sectionView";
import { projectSectionPoint, type SectionBody, type SectionLoop, type SectionPoint } from "@/lib/sectionSvg";
import { normalizeSectionCutFace, SECTION_CUT_FACES, sectionCapMesh, sectionHatchSpacing, sectionHatchTexture, sectionHatchTurned, sectionHatchUvs, type SectionCutFace } from "@/lib/sectionCaps";
import { sectionMeasurement, sectionPointToWorld, snapSectionPoint, type SectionSnap } from "@/lib/sectionMeasure";
import * as THREE from "three";
import { triangleTouchesRect, type ScreenRect } from "@/lib/screenRectHit";
import { FramingSquareIcon } from "@/components/FramingSquareIcon";
import { GridEyeIcon } from "@/components/GridEyeIcon";
import { AlignOverlay, MirrorOverlay, type AlignOverlayState, type MirrorOverlayState } from "@/components/workplane/ActionOverlays";
import { MoveDimensionOverlay } from "@/components/workplane/MoveDimensionOverlay";
import { OriginDimensionOverlay } from "@/components/workplane/OriginDimensionOverlay";
import { SelectionInspector, ShapeInspector, SnapGridControl, type IconTagControls, type QrCodeControls, type ReferenceImageControls, type ShapeInspectorUpdateOptions, type TextLayerPatch } from "@/components/workplane/ShapeInspector";
import type { NameTagStack } from "@/lib/nameTag";
import { WorkspaceSettingsModal } from "@/components/workplane/WorkspaceSettingsModal";
import { appThemePalette, type AppThemePreference, type ResolvedAppTheme } from "@/lib/appTheme";
import { t } from "@/lib/i18n";
import type { ModelSplitPlane } from "@/lib/modelSplit";
import { useLanguage } from "@/lib/useLanguage";
import { viewDirectionFromName, viewFaceForKey, type ViewCubeFace } from "@/lib/viewCubeDrag";
import { ViewCube } from "@/components/workplane/ViewCube";
import { openSecondViewWindow, SecondViewWindow, useSecondViewSupported } from "@/components/workplane/SecondViewWindow";
import { starSettingsForSize } from "@/lib/starGeometry";
import { carriedOntoFace } from "@/lib/carryOntoFace";
import { keepsProportionsOnAxis } from "@/lib/keepProportions";
import { useWheelField } from "@/lib/useWheelField";
import { wheelBaseStep, wheelNextValue } from "@/lib/wheelValueStep";
import { createLatestRunner, type LatestRunner } from "@/lib/latestRunner";
import { onManifoldReady } from "@/lib/manifoldHandle";
import { onCustomFontsChanged } from "@/lib/textFonts";
import { readSavedViews, readStartView, SAVED_VIEW_KEYS, savedViewForKey, writeStartView } from "@/lib/designView";
import { readCornerRulers, writeCornerRulers } from "@/lib/cornerRulerStore";
import { highestTapeIdNumber, readTape, savedTape, writeTape } from "@/lib/tapeStore";
import { rememberCameraView, useDesignViews } from "@/components/workplane/cameraViews";
import { fitCameraDepthRange, frameBounds, resetCamera, selectionBounds, startViewOf, setCameraToViewDirection, setCameraToViewFace, stepCameraTurn, syncViewCube, toggleCameraProjection, zoomCameraBy } from "@/components/workplane/cameraRig";
import { disposeCutPreviewResources, renderFrame } from "@/components/workplane/renderFrame";
import { DIMENSION_FORMULA_FIELDS, formulaMatchesMillimeters, formulaToRemember, withFieldFormula } from "@/lib/fieldFormulas";
import { displayToMillimeters, formatLengthMm, lengthDisplayUnit, measurementOptionLabel, millimetersToDisplay, parseLengthMm, parseMeasurementInput, resolveLengthMm, setLengthUnit } from "@/lib/measurementUnits";
import { computeCornerRulerRelativeCoordinates, cornerRulerAxisModes, cornerRulerFrameForWorkplane, cornerRulerShiftVector, pointAlongRuler, rotateCornerRulerFrame, rulerDimensionMatch, toggledCornerRulerAxis, toggledCornerRulerMode, type CornerRulerAxis, type RulerDimensionField } from "@/lib/rulerDimensions";
import { createMoveDimensionOverlay, type MoveDimensionAxis, type MoveDimensionOverlayData } from "@/lib/moveDimensionLines";
import { computeOriginAxisDistance, createOriginDimensionOverlay, type OriginDimensionOverlayData } from "@/lib/originDimensionLines";
import { horizontalPlacementWorkplane, placementPatchForNewShape, placementWorkplaneCoordinates, placementWorkplaneFromSurface, placementWorkplaneIsBase, placementWorkplanePoint, snapPlacementWorkplaneOrigin, type PlacementPoint, type PlacementWorkplane } from "@/lib/placementWorkplane";
import { capturePointer } from "@/lib/pointerCapture";
import { printerPresetById } from "@/lib/printBed";
import { GuideHelpLink } from "@/components/GuideHelpLink";
import { heightWithFaceOnGrid, liftDeltaOnGrid, liftGeometryForFrame, type SelectionFrame } from "@/lib/liftGeometry";
import { projectThumbnailDimensions } from "@/lib/projectThumbnail";
import { makeShapeFromAsset, parseDroppedShapeAsset } from "@/lib/shapeCatalog";
import { planarFaceCentre } from "@/lib/faceCentre";
import { scaledHorizontalShapePatch } from "@/lib/scaleByPercent";
import { displayYTurn, insideZ } from "@/lib/displayAxes";
import { boundsInsideRect, marqueeMode } from "@/lib/marqueeSelection";
import { slicerLeftTurn } from "@/lib/cameraMouseButtons";
import { useSpaceMouse } from "@/components/workplane/useSpaceMouse";
import { canBeginShapeDrag, handleDimensionLimit, DEFAULT_SNAP_GRID, effectiveViewSettings, normalizeSnapGrid, normalizeWorkspaceSettings, readWorkspaceDefault, saveShapeDefaultsForNewDesigns, saveWorkspaceDefault, customSnapGridLabel, snapGridForShortcut, snapGridForUnits, snapGridOptions, snapGridStep as snapStep, workplaneSettingsFingerprint, workspaceForUnits, workspaceHydrationSyncDecision, zoomDistanceScale, ZOOM_STEP_IN, ZOOM_STEP_OUT } from "@/lib/workplaneSettings";
import { withShapeDefaults } from "@/lib/shapeDefaults";
import { WORKPLANE_LINE_ELEVATION } from "@/lib/workplaneGrid";
import { cleanNearZero, cleanRotationDegrees, isNonSolidShape, resizedShapeSize, shapeDepth, shapeHasTaper, shapeWidth, shapeWithParametricSource } from "@/lib/workplaneShapes";
import type { LayerlingMcpViewFace } from "@/lib/layerlingMcpProtocol";
import { ownSideForMark } from "@/lib/dimensionSides";
import { SelectionCounter } from "@/components/workplane/SelectionCounter";
import { TouchMultiSelectButton } from "@/components/workplane/TouchMultiSelectButton";
import { showsTouchMultiSelect } from "@/lib/touchMultiSelect";
import { TransformOverlay, continuousSnappedWheelRotation, getElevationMeasureKey, measureKeyForHandle, ROTATION_WHEEL_SHIFT_SNAP_DEGREES, ROTATION_WHEEL_SNAP_DEGREES, snappedRotationDelta, snappedWheelRotation, type DimensionMark, type EditingCorner, type EditingDimension, type EditingRotation, type PinnedRotationWheelView, type RotationAxis, type RotationPlaneView, type RotationReadout, type TransformHandleKind, type TransformOverlayState } from "@/components/workplane/TransformOverlay";
import { type AlignAxes, type FrameCuboid } from "@/lib/alignFrame";
import type { AlignAxis, AlignHandleStatus, AlignTarget, GridSize, MeasurementAccuracy, ShapeAsset, WorkplaneNote, WorkplaneNoteAnchor, WorkplaneShape, WorkplaneWorkspaceSettings } from "@/types/layerling";
import { referencePoints } from "@/lib/workplaneNotes";
import { pivotHeightRange, pivotPlateReach } from "@/lib/zoomPivot";
import { pointerReach } from "@/lib/pointerReach";
import { boxSnapSpots, measurementMiddle, nearestReferenceOnScreen, type ReferencePosition } from "@/lib/referencePoints";
import { type PivotPoint } from "@/lib/rotationPivot";
import { overhangDownwardLimit } from "@/lib/overhangLimits";
import { rotatedGeometryShapePatch, rotationPatchFromQuaternion as sharedRotationPatchFromQuaternion, signedDegrees } from "@/lib/geometryRotation";
import type { CadModifierEdge } from "@/lib/cadModifierTypes";
import { type CadFacePick } from "@/lib/cadFacePick";
import { disposeCadFacePickMesh } from "@/lib/cadFacePickMesh";
import { latchedDragAxis, type DragAxis } from "@/lib/dragAxisLatch";
import { axisLockedPoint, circleOfEdgePoints, perpendicularFootOnSegment, pointAcrossCircle, pointOnCircle, tapeLengthShift } from "@/lib/tapeCircle";
import { syncHistoryPickHighlight, syncPickHighlight } from "@/components/workplane/historyPickHighlight";
import { orbitViewBy, panViewBy } from "@/lib/viewArrowKeys";
import { useViewportKeyboardHooks } from "@/components/workplane/viewportKeyboard";
import { useViewportDoubleClick } from "@/components/workplane/useViewportDoubleClick";
import { aimPickRay, firstShapeHit, pickImagePoint, pickLayFlatFace, pickMateFace, pickFaceCentre, pickRotationPivot, pickShapeAt, pointerRayFor, shapesUnderPointer, rayPointOnRotationPlane, RENDER_LAYER_SHAPES, splitAxisParameter, usePickOnlyPointer, type LayFlatPick, type PickOnlySelection } from "@/components/workplane/viewportPicking";
import { fastEdgesGeometry } from "@/lib/fastEdgesGeometry";
import { RENDER_LAYER_HELPERS, type PointCardOffset, type ThreeState, type MoveDimensionSession, type NoteOverlayState, type TapePoint, type TapeAttachment, type TapeEdgeAttachment, type TapeModel, type TapeOverlayState, type TapeCandidate, type DragItem, quaternionForShape, projectToScreen, syncMoveDimensionWorldLines, tapeShapeDimensions, tapePointWorld, tapeEdgeWorldPoints, tapeSegmentWorldPoints, tapeMovableShapeId, syncTapeOverlay, tapeSegmentLengths, syncNoteOverlay, NoteOverlay, TapeOverlay, type RulerDimensionOverlayItem, type RulerDimensionOverlayState, syncRulerDimensionOverlay, RulerDimensionOverlay, type CornerRulerInstance, type CornerRulerOverlayState, syncCornerRulerToolOverlay, CornerRulerToolOverlay, syncOriginDimensionWorldLines, shapeCenter, shapeLocalExtents, projectShapeExtent, projectShapesExtent, type OriginDimensionFrame, formatMeasure, findShapeObject, releaseSharedShapeMaterials, disposeChildren, disposeObject } from "@/components/workplane/ViewportOverlays";
import { MIN_SHAPE_SIZE, RENDER_LAYER_PREVIEWS, overhangUniforms, setEdgeLineStyle, setStrongHoles, setRulerInchScale, MODIFIER_EDGE_DEPTH_PULL, clamp, selectionFrameForShapes, refreshFrozenObjectMatrix, updateShapeObjectTransform, applySectionClipping, rebuildShapes, rebuildModifierEdges, setModifierEdgeHover, rebuildSelectionHelpers, cadFacePickLayerMesh, syncCadFaceLayer, syncBentTubeSegment, TRANSPARENT_SOLID_OPACITY, createShapeObject } from "./workplane/viewportShapeObjects";
import { movePivotToDepthUnder, WorkspaceSettings, createThreeScene, rebuildWorkplane, syncWorkplaneHoverPreview, updateSectionPlaneHelper, syncSplitPlane } from "./workplane/viewportScene";
import { liftHandleOffset, screenAngle, framePoint, selectionFrameCorners, workplaneFootprintY, syncTransformOverlay, syncAlignOverlay, syncMirrorOverlay, syncLayFlatHover } from "./workplane/viewportTransformOverlays";
import { tapeAttachmentFromWorld, TAPE_PERPENDICULAR_SNAP_PIXELS, pickModelTapeCandidate, distanceToScreenSegment, SectionMeasureModel, SectionMeasureOverlayState, syncSectionMeasureOverlay } from "./workplane/viewportTape";
export type { LayFlatPick } from "@/components/workplane/viewportPicking";
import { MIN_ELEVATION, MAX_ELEVATION, ResizeSigns, ResizeAnchorMemory, TransformDragState, TransformDragItem, snapValue, selectionWorldYBounds, resizeSignsForHandle, resizeAnchorPointForFrame, resizeCenterFromAnchor, resizeSignsForDimension, patchWithResizeAnchor, patchWithUniformHeightScale, resizeShapeFromFrameHandle, resizeShapeAlongFrameNormal, resizeSelectionFromHandle, scaleSelectionItems } from "./workplane/viewportResize";

const WORKSPACE_DEFAULTS_STORAGE_PREFIX = "layerling.workspaceDefault.";
const MOVE_DIMENSIONS_ENABLED_STORAGE_KEY = "layerling.editor.moveDimensionsEnabled";
const ORIGIN_DIMENSIONS_ENABLED_STORAGE_KEY = "layerling.editor.originDimensionsEnabled";
// How the editor opens a design: perspective (default) or orthographic. An app
// preference like the two above, not a design setting - it has to hold for
// every design, including ones saved before it existed.
const START_IN_PERSPECTIVE_STORAGE_KEY = "layerling.editor.startInPerspective";
const CORNER_RULER_DEFAULT_ARM_X = 100;
const CORNER_RULER_DEFAULT_ARM_Z = 80;
// A height is no longer held to the 220 mm of the old plate: the plate sets how far the sliders reach, the guard is for a typo (#425).
/** A finger held this long (ms) without moving more than this (px) opens the context menu (#337). */
const LONG_PRESS_MS = 550;
const LONG_PRESS_SLOP_PX = 8;
const CAMERA_MIN_TARGET_Y = -70;
const CAMERA_MAX_TARGET_Y = 120;
const ROTATION_PROTRACTOR_OUTER_RADIUS = 94;
/** How far the pointer goes before a pressed shape starts to move, in screen pixels - as the marquee. */
const DRAG_START_PIXELS = 5;

const MODIFIER_EDGE_PICK_RADIUS_PX = 14;

type WorkplaneViewportProps = {
  shapes: WorkplaneShape[];
  selectedIds: string[];
  alignMode: boolean;
  /** Select multiple (touch has no Shift): a tap on a body adds it to the selection or takes it out (#337). */
  multiSelect?: boolean;
  /** A tap on empty space ends the mode and keeps the selection. */
  onMultiSelectEnd?: () => void;
  alignAnchorId: string | null;
  alignHandles: AlignHandleStatus[];
  /** The axes the align tool measures along when a workplane is set on a face (#232); null on the plate. */
  alignAxes?: AlignAxes | null;
  /** The box the handles stand on along those axes, from the shapes before any preview. */
  alignFrameBounds?: FrameCuboid | null;
  alignReferenceShapes: WorkplaneShape[];
  mirrorMode: boolean;
  mirrorReferenceShapes: WorkplaneShape[];
  splitActive?: boolean;
  /** With `splitActive`: objects can still be picked and show the selection outline, but nothing can be edited (History view). */
  pickOnly?: PickOnlySelection | null;
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
  /** `size`: Alt is held, and the dot stretches the parts instead of moving them (#998). */
  onAlignPreview: (axis: AlignAxis, target: AlignTarget, size: boolean) => void;
  onAlignPreviewClear: () => void;
  onAlignSelection: (axis: AlignAxis, target: AlignTarget, size: boolean) => void;
  onMirrorPreview: (axis: AlignAxis) => void;
  onMirrorPreviewClear: () => void;
  onMirrorSelection: (axis: AlignAxis) => void;
  onSelectShape: (id: string | string[] | null, mode?: "replace" | "toggle") => void;
  /** A right click that did not turn the view: on a body (now selected) or on empty space. */
  /** `stackIds`: every body under the pointer, front to back, for "Select other" (#804). */
  /** `facePoint`: the middle of the flat face under the pointer, when there is one (#881). */
  onShapeContextMenu?: (request: { shapeId: string | null; clientX: number; clientY: number; stackIds: string[]; facePoint?: { x: number; y: number; z: number } }) => void;
  /** Bodies marked with an outline that shows through what stands in front: the one a row of "Select other" points at (#804). */
  highlightIds?: readonly string[];
  onSetPlacementWorkplane: (workplane: PlacementWorkplane, source: "shape" | "base") => void;
  onToggleWorkplaneTool: () => void;
  onInteractionActiveChange?: (active: boolean) => void;
  /** Esc during a drag: the editor puts the shapes back as they were when the drag began (#440). */
  onCancelInteraction?: () => void;
  onEditSketch?: () => void;
  onOpenGroup?: (id: string) => void;
  canSeparateParts?: boolean;
  onSeparateParts?: () => void;
  /** Several parts selected (#183): solid or hole, a colour and locking for all of them. */
  onSelectionHole?: (hole: boolean) => void;
  onSelectionColor?: (color: string) => void;
  /** Changes to several selected shapes in one step - "Fit module" for two gears (#645). */
  onSelectionUpdateShapes?: (changes: readonly { id: string; patch: Partial<WorkplaneShape> }[], message?: string) => void;
  onSelectionLock?: () => void;
  onSelectionHide?: () => void;
  /** Wraps the selected body around a cylinder of this diameter (#106). */
  onWrapAroundCylinder?: (diameter: number, inward: boolean) => void;
  onSurfaceTexture?: (settings: SurfaceTextureSettings) => Promise<void> | void;
  /** Takes the selected body's texture off; only while the body keeps what was under it. */
  onRemoveSurfaceTexture?: () => void;
  /** Whether the surface texture card is open; the toolbar opens and closes it too. */
  surfaceTextureOpen?: boolean;
  onSurfaceTextureOpenChange?: (open: boolean) => void;
  surfaceFacePicking?: boolean;
  surfacePickedFaces?: SurfaceTextureFace[] | null;
  onSurfaceFacePick?: (faces: SurfaceTextureFace[] | null, edgeAngle: number) => void;
  /** Lays the selected vase's accessories out beside it. */
  onVaseAccessories?: () => void;
  onLayerText?: (patch: TextLayerPatch) => void;
  onTextTags?: (names: string[], gap: number) => void;
  /** Fixes the selected key ring tab to the nearest tag, where it was put (#598). */
  onFixKeyringTab?: () => void;
  /** The selected name tag as its card shows it (#215). */
  textLayerStack?: NameTagStack | null;
  /** The icon tag card's wiring for the selected sketch body or icon tag. */
  iconTag?: IconTagControls | null;
  qrCode?: QrCodeControls | null;
  /** The reference image card's wiring (#680). */
  referenceImage?: ReferenceImageControls | null;
  /**
   * Where the tape measure and the corner ruler are kept while the 3D view is gone - it is taken
   * down for the sketch and built again after it, and the rulers stay standing (forum, #618183).
   * They are not saved and not in the history.
   */
  toolMemory?: MutableRefObject<ViewportToolMemory>;
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
  /** The pivot clicked or dragged to; a click also gives the face it hit, so a group's face can be read from its parts joined. */
  onPivotPick?: (point: PivotPoint | null, face?: LayFlatPick | null) => void;
  /** A reference image being calibrated (#680): a click on it gives a point, through anything in front of it. */
  imageCalibrationId?: string | null;
  onImageCalibrationPoint?: (point: { x: number; y: number; z: number }) => void;
  /** Waiting for a click on a face of the selection to lay it flat. */
  layFlatPickMode?: boolean;
  onLayFlatPick?: (pick: LayFlatPick | null) => void;
  /** "Align faces" waiting for a click on a face of one of these bodies; `round` lights up whole round faces, `joined` the group's parts joined, whose face is lit in place of the part's. */
  mateFacePick?: { shapeIds: string[]; round?: boolean; joined?: ArrayLike<number> | null } | null;
  onMateFacePick?: (pick: LayFlatPick | null) => void;
  /** "Delete face" waiting for clicks on faces of the prepared body; a click toggles the face. */
  cadFacePick?: CadFacePick | null;
  onCadFacePick?: (faceId: number) => void;
  onNoteAdd?: (note: { x: number; y: number; z: number; anchor?: WorkplaneNoteAnchor }) => string | null;
  /** Puts reference points in the scene; answers with the ids it made (none if they are there already). */
  onAddReferencePoints?: (positions: ReferencePosition[]) => string[];
  /** Deletes every reference point at once. */
  onRemoveAllReferencePoints?: () => void;
  onNoteUpdate?: (id: string, patch: Partial<WorkplaneNote>, transient?: boolean) => void;
  onNoteRemove?: (id: string) => void;
  onNoteModeChange?: (active: boolean) => void;
  onWorkspaceSettingsChange?: (settings: { workspace: WorkplaneWorkspaceSettings; snap: GridSize }) => void;
  projectName?: string;
  /** The design on screen, null behind the overview. The viewport outlives a design, so its tools reset when this changes. */
  projectId?: string | null;
  onWorkplaneModeChange: (active: boolean) => void;
  /** A short message for the editor's notice line, such as a view saved under 7. */
  onNotice?: (message: string) => void;
  modifierActive?: boolean;
  modifierPreviewActive?: boolean;
  modifierEdges?: CadModifierEdge[];
  modifierHighlightedEdgeIds?: number[];
  selectedModifierEdgeIds?: number[];
  /** Selected edges the kernel could not treat: drawn red instead of the selection colour. */
  failedModifierEdgeIds?: number[];
  /** Draw and pick only the edges the body does not hide from this view. */
  modifierOnlyVisibleEdges?: boolean;
  onModifierEdgeToggle?: (id: number, singleEdge: boolean) => void;
  themePreference?: AppThemePreference;
  resolvedTheme?: ResolvedAppTheme;
  onThemePreferenceChange?: (preference: AppThemePreference) => void;
  /** Der aktuelle Schnitt als SVG: rechnet der Editor, aus denselben Koerpern wie der Export. */
  onExportSectionSvg?: (axis: SectionPlaneAxis, offset: number, frame: SectionFrame | null) => void;
  /** A new sketch from the cut's outlines, on the cut (#1022). */
  onSketchFromSection?: (settings: SectionPlaneSettings) => void;
  /** The cut's outlines, from the same bodies as the SVG - what section measuring snaps to. */
  onSectionContours?: (axis: SectionPlaneAxis, offset: number, frame: SectionFrame | null) => Promise<SectionLoop[]>;
  /** The bodies of the cut with their colours, to fill the cut face of the section view (#516). */
  onSectionBodies?: (axis: SectionPlaneAxis, offset: number, frame: SectionFrame | null) => Promise<SectionBody[]>;
};
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
const SECTION_CUT_FACE_STORAGE_KEY = "layerling.editor.sectionCutFace";
const POINT_CARD_OFFSETS_STORAGE_KEY = "layerling.editor.pointCardOffsets";

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

/** Where each reference point's card stands off its pin, by point (#329); a point not moved yet uses the old shared offset. */
function readPointCardOffsets(): Record<string, PointCardOffset> {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(POINT_CARD_OFFSETS_STORAGE_KEY) ?? "null") as Record<string, Partial<PointCardOffset>> | null;
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(Object.entries(parsed)
      .filter(([, offset]) => offset && Number.isFinite(offset.x) && Number.isFinite(offset.y))
      .map(([id, offset]) => [id, { x: Number(offset.x), y: Number(offset.y) }]));
  } catch {
    return {};
  }
}

function readSectionCutFace(): SectionCutFace {
  try {
    return normalizeSectionCutFace(window.localStorage.getItem(SECTION_CUT_FACE_STORAGE_KEY));
  } catch {
    return "hatch";
  }
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
  if (!keepsProportionsOnAxis(shape, axis) || "x" in patch || "z" in patch || "elevation" in patch) return patch;
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
    layerlingCaptureImage?: (options?: { plate?: boolean; transparent?: boolean; scale?: number }) => string;
    /** The section view for MCP: applies what is given, returns the settings it ends on and the plane's range. */
    layerlingSectionView?: (patch: Partial<SectionPlaneSettings> & { center?: boolean; cutFace?: SectionCutFace }) => { settings: SectionPlaneSettings; bounds: { min: number; max: number; center: number }; cutFace: SectionCutFace };
    /** "Hide workplane" in the camera bar for MCP: sets it when given, returns whether the plate is shown. */
    layerlingWorkplaneDisplay?: (visible?: boolean) => { visible: boolean };
    /** The measurements of the tape measure for MCP: shows or hides them when asked, returns what is there (#881). */
    layerlingMeasurements?: (request?: { visible?: boolean; dimensions?: boolean }) => { visible: boolean; dimensions: boolean; measurements: Array<{ id: string; length: number }> };
    /** The four saved views (keys 7, 8, 9, 0) for MCP: saves or shows one when asked, returns which keys hold a view. */
    layerlingSavedViews?: (request?: { save?: number; show?: number; startView?: "save" | "reset" }) => { keys: { key: string; saved: boolean }[]; shown?: boolean; startView: boolean };
  }
}

type DragState = {
  primaryId: string;
  offsetX: number;
  offsetZ: number;
  planeY: number;
  /** The workplane lifted to where the pointer took hold of the body (dragWorkplaneAtGrab). */
  workplane: PlacementWorkplane;
  /** Height of the workplane itself, where the snap guides are drawn. */
  guideY: number;
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
  /** The axis a Shift drag settled on; kept until Shift is let go (#909). */
  axisLatch?: DragAxis | null;
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
  /** Alt is held: the frame works the other way round for this moment (#572). */
  reverse: boolean;
};

/** Eine gleichbleibende leere Liste, damit die Eigenschaft nicht jedes Bild neu wird. */
const EMPTY_NOTES: WorkplaneNote[] = [];

type NoteDragState = {
  noteId: string;
  pointerId: number;
  moved: boolean;
};

/** What the viewport hands back to the editor to keep across the sketch (see `toolMemory`). */
export type ViewportToolMemory = {
  tape?: TapeModel;
  cornerRulers?: CornerRulerInstance[];
  cornerRulerId?: number;
};

type TapePointDragState = {
  pointId: string;
  pointerId: number;
};

type ShapeUpdatePatch = Partial<WorkplaneShape> & { bakeTransform?: boolean };

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
        lift: session.lift,
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

/** How close, in pixels, the pointer has to come to the point across a circle for it to catch. */
const TAPE_DIAMETER_SNAP_PIXELS = 16;

/**
 * With the first point of a measurement on a circular edge, the point across the circle catches the
 * pointer when it comes near, so the distance is the exact diameter (#308).
 */
function diameterSnapCandidate(state: ThreeState, start: TapePoint, edge: TapeEdgeAttachment, localX: number, localY: number): TapeCandidate | null {
  const circle = circleOfEdgePoints(tapeEdgeWorldPoints(state, edge));
  if (!circle) return null;
  const across = pointAcrossCircle(circle, tapePointWorld(state, start));
  if (!across) return null;
  const screen = projectToScreen(across, state);
  if (Math.hypot(screen.x - localX, screen.y - localY) > TAPE_DIAMETER_SNAP_PIXELS) return null;
  const attachment = tapeAttachmentFromWorld(state, edge.shapeId, across, "edge");
  return attachment ? { x: across.x, y: across.y, z: across.z, attachment } : null;
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

/** A body whose drawing is not built yet (a design just opened) cannot say whether a measurement still fits it (#881). */
function tapeObjectBuilt(state: ThreeState, shapeId: string) {
  return findShapeObject(state, shapeId) !== null;
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

/**
 * Whether the body covers this point from the camera. The slack matches the
 * pull toward the camera the drawn edges get, so what can be picked is what
 * is drawn.
 */
function modifierEdgePointHidden(state: ThreeState, point: THREE.Vector3) {
  const ndc = point.clone().project(state.camera);
  state.pointer.set(ndc.x, ndc.y);
  state.raycaster.setFromCamera(state.pointer, state.camera);
  state.raycaster.layers.set(RENDER_LAYER_SHAPES);
  const ray = state.raycaster.ray;
  const pointDistance = point.clone().sub(ray.origin).dot(ray.direction);
  const slack = Math.max(0.01, state.camera.position.distanceTo(point) * (1 - MODIFIER_EDGE_DEPTH_PULL));
  const hit = state.raycaster.intersectObjects(state.shapeLayer.children, true).find((entry) => {
    if (!(entry.object instanceof THREE.Mesh)) return false;
    if (state.sectionPlane && state.sectionPlane.distanceToPoint(entry.point) < -0.001) return false;
    let object: THREE.Object3D | null = entry.object;
    while (object) {
      if (!object.visible) return false;
      object = object.parent;
    }
    return true;
  });
  return hit !== undefined && hit.distance < pointDistance - slack;
}

/** `visibleOnly`: skip edges the body hides, except the ids in the set. */
function pickModifierEdgeFromScreen(state: ThreeState, edges: CadModifierEdge[], clientX: number, clientY: number, visibleOnly: ReadonlySet<number> | null = null) {
  const rect = state.renderer.domElement.getBoundingClientRect();
  const pointerX = clientX - rect.left;
  const pointerY = clientY - rect.top;
  const pointA = new THREE.Vector3();
  const pointB = new THREE.Vector3();
  const candidates: Array<{ id: number; distance: number; point: THREE.Vector3 }> = [];
  const pickReach = pointerReach(MODIFIER_EDGE_PICK_RADIUS_PX);
  state.camera.updateMatrixWorld();
  edges.forEach((edge) => {
    let best: { id: number; distance: number; point: THREE.Vector3 } | null = null;
    for (let index = 0; index + 5 < edge.points.length; index += 3) {
      pointA.set(edge.points[index], edge.points[index + 1], edge.points[index + 2]);
      pointB.set(edge.points[index + 3], edge.points[index + 4], edge.points[index + 5]);
      const a = projectCadPointToCanvas(pointA, state, rect);
      const b = projectCadPointToCanvas(pointB, state, rect);
      if (!a || !b) continue;
      const distance = distanceToScreenSegment(pointerX, pointerY, a.x, a.y, b.x, b.y);
      if (distance < pickReach && (!best || distance < best.distance)) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const lengthSq = dx * dx + dy * dy;
        const amount = lengthSq > 0.0001 ? clamp(((pointerX - a.x) * dx + (pointerY - a.y) * dy) / lengthSq, 0, 1) : 0;
        best = { id: edge.id, distance, point: pointA.clone().lerp(pointB, amount) };
      }
    }
    if (best) candidates.push(best);
  });
  candidates.sort((a, b) => a.distance - b.distance);
  const picked = visibleOnly
    ? candidates.find((candidate) => visibleOnly.has(candidate.id) || !modifierEdgePointHidden(state, candidate.point))
    : candidates[0];
  return picked?.id ?? null;
}

const EMPTY_SECTION_MEASURE: SectionMeasureModel = { axis: "x", offset: 0, frame: null, loops: [], a: null, b: null, hover: null };

/** The parts of a measurement that lie in the cutting plane, named like the position fields. */
function sectionMeasureDeltas(result: ReturnType<typeof sectionMeasurement>, axis: SectionPlaneAxis, accuracy: MeasurementAccuracy) {
  const parts: Array<[string, number]> = axis === "x"
    ? [["Y", result.deltaDepth], ["Z", result.deltaHeight]]
    : axis === "y"
      ? [["X", result.deltaX], ["Y", result.deltaDepth]]
      : [["X", result.deltaX], ["Z", result.deltaHeight]];
  return parts.map(([name, value]) => `Δ${name} ${formatMeasure(Math.abs(value), accuracy)}`).join(" · ");
}

function SectionMeasureOverlay({ overlay }: { overlay: SectionMeasureOverlayState }) {
  return (
    <div className="section-measure-overlay" aria-hidden="true">
      <svg className="tape-guides" width="100%" height="100%">
        {overlay.outlines.map((points, index) => (
          <polyline key={index} className="section-measure-outline" points={points} fill="none" />
        ))}
        {overlay.centers.map((center, index) => (
          <g key={`center-${index}`}>
            <path className="section-measure-center-halo" d={`M${center.x - 5},${center.y} h10 M${center.x},${center.y - 5} v10`} />
            <path className="section-measure-center" d={`M${center.x - 5},${center.y} h10 M${center.x},${center.y - 5} v10`} />
          </g>
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

/** So nah (in Bildpunkten) muss der Zeiger an einer Koerperecke sein, damit die Ecke des Winkellineals dort einrastet. */
const CORNER_RULER_SNAP_PX = 12;

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

/**
 * The plane a body is dragged on: the workplane, lifted along its normal to the
 * point where the pointer took hold of the body, so that point stays under the
 * pointer. On the workplane itself, a press high up on a tall or tilted body
 * met the plate far behind it, and the move ran into the drag limit (#673).
 */
function dragWorkplaneAtGrab(state: ThreeState, clientX: number, clientY: number, shapeId: string, workplane: PlacementWorkplane): PlacementWorkplane {
  aimPickRay(state, clientX, clientY, RENDER_LAYER_SHAPES);
  const hit = firstShapeHit(state);
  if (!hit || hit.object.userData.shapeId !== shapeId) return workplane;
  const normal = new THREE.Vector3(workplane.normal.x, workplane.normal.y, workplane.normal.z);
  const origin = new THREE.Vector3(workplane.origin.x, workplane.origin.y, workplane.origin.z);
  const lift = normal.dot(hit.point.clone().sub(origin));
  if (!(Math.abs(lift) > 1e-6)) return workplane;
  origin.addScaledVector(normal, lift);
  return { ...workplane, origin: { x: origin.x, y: origin.y, z: origin.z } };
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
    const edgeGeometry = fastEdgesGeometry(geometry, 25);
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

/**
 * The way the lift arrow moves a selection is measured up the corner the X and Y moves start from,
 * from the height of its bottom (#979).
 */
function liftMoveDimensionSession(
  state: ThreeState,
  transform: { selectionFrame: SelectionFrame; items: Array<{ id: string; startShape: WorkplaneShape; startCenter: THREE.Vector3 }> },
  axis: THREE.Vector3,
): MoveDimensionSession {
  const frame = transform.selectionFrame;
  const corner = moveDimensionAnchorForCamera(state, frame);
  const bottom = framePoint(frame, 0, frame.min.y, 0);
  const start = corner.clone().addScaledVector(axis, bottom.clone().sub(corner).dot(axis));
  return {
    active: true,
    originX: start.x,
    originZ: start.z,
    planeY: start.y,
    deltaX: 0,
    deltaZ: 0,
    items: [],
    lift: {
      start: { x: start.x, y: start.y, z: start.z },
      axis: { x: axis.x, y: axis.y, z: axis.z },
      delta: 0,
      side: { x: frame.center.x, y: start.y, z: frame.center.z },
      items: transform.items.map((item) => ({
        id: item.id,
        centerX: item.startCenter.x,
        centerY: item.startCenter.y,
        centerZ: item.startCenter.z,
        height: item.startShape.height,
      })),
    },
  };
}

function localResizePlaneForFrame(frame: SelectionFrame, localY = frame.min.y) {
  return new THREE.Plane().setFromNormalAndCoplanarPoint(
    frame.yAxis.clone().normalize(),
    framePoint(frame, 0, localY, 0),
  );
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

/**
 * A width and/or depth typed for a whole selection (#259): the selection's frame becomes that size,
 * as when its handle is dragged, from the corner opposite the one that was pressed.
 */
function resizeSelectionToSizes(
  frame: SelectionFrame,
  items: TransformDragItem[],
  sizes: { width?: number; depth?: number },
  signs: ResizeSigns,
  maxSize: number,
) {
  const axisSize = (current: number, size: number | undefined) => (
    size === undefined ? { size: current, scale: 1 } : { size, scale: size / Math.max(MIN_SHAPE_SIZE, current) }
  );
  const nextX = axisSize(frame.width, sizes.width);
  const nextZ = axisSize(frame.depth, sizes.depth);
  const activeSigns = { x: sizes.width === undefined ? 0 : signs.x, z: sizes.depth === undefined ? 0 : signs.z };
  const nextCenter = resizeCenterFromAnchor(frame, resizeAnchorPointForFrame(frame, activeSigns), activeSigns, nextX.size, nextZ.size);
  return scaleSelectionItems(frame, items, nextX, nextZ, 1, nextCenter, selectionWorldYBounds(frame).min, 0, maxSize);
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
  multiSelect = false,
  onMultiSelectEnd,
  alignAnchorId,
  alignHandles,
  alignAxes = null,
  alignFrameBounds = null,
  alignReferenceShapes,
  mirrorMode,
  mirrorReferenceShapes,
  splitActive = false,
  pickOnly = null,
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
  highlightIds,
  onSetPlacementWorkplane,
  onToggleWorkplaneTool,
  onInteractionActiveChange,
  onCancelInteraction,
  onEditSketch,
  onOpenGroup,
  canSeparateParts = false,
  onSeparateParts,
  onSelectionHole,
  onSelectionColor,
  onSelectionUpdateShapes,
  onSelectionLock,
  onSelectionHide,
  onWrapAroundCylinder,
  onSurfaceTexture,
  onRemoveSurfaceTexture,
  surfaceTextureOpen,
  onSurfaceTextureOpenChange,
  surfaceFacePicking,
  surfacePickedFaces,
  onSurfaceFacePick,
  onVaseAccessories,
  onLayerText,
  onTextTags,
  onFixKeyringTab,
  textLayerStack,
  iconTag,
  qrCode,
  referenceImage,
  toolMemory,
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
  imageCalibrationId = null,
  onImageCalibrationPoint,
  layFlatPickMode = false,
  onLayFlatPick,
  mateFacePick = null,
  onMateFacePick,
  cadFacePick = null,
  onCadFacePick,
  onNoteAdd,
  onAddReferencePoints,
  onRemoveAllReferencePoints,
  onNoteUpdate,
  onNoteRemove,
  onNoteModeChange,
  onWorkspaceSettingsChange,
  projectName = "",
  projectId = null,
  onWorkplaneModeChange,
  onNotice,
  modifierActive = false,
  modifierPreviewActive = false,
  modifierEdges = [],
  modifierHighlightedEdgeIds = [],
  selectedModifierEdgeIds = [],
  failedModifierEdgeIds = [],
  modifierOnlyVisibleEdges = false,
  onModifierEdgeToggle,
  themePreference = "system",
  resolvedTheme = "light",
  onThemePreferenceChange,
  onExportSectionSvg,
  onSketchFromSection,
  onSectionContours,
  onSectionBodies,
}: WorkplaneViewportProps) {
  const [snapOpen, setSnapOpen] = useState(false);
  // The inspector hands the snap grid control back to the workplane while collapsed or floating.
  const [inspectorSnapGridAway, setInspectorSnapGridAway] = useState(false);
  // The panel for several selected parts carries the snap grid at its foot (#601).
  const [selectionSnapDocked, setSelectionSnapDocked] = useState(false);
  const [snap, setSnap] = useState<GridSize>(() => normalizeSnapGrid(initialSnap, DEFAULT_SNAP_GRID));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [workspace, setWorkspace] = useState<WorkspaceSettings>(() => normalizeWorkspaceSettings(initialWorkspace));
  const [transformOverlay, setTransformOverlay] = useState<TransformOverlayState | null>(null);
  const [alignOverlay, setAlignOverlay] = useState<AlignOverlayState | null>(null);
  const [mirrorOverlay, setMirrorOverlay] = useState<MirrorOverlayState | null>(null);
  const [marqueeRect, setMarqueeRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  /** The frame is dashed where it takes whatever it touches, and the direction decides (#430). */
  const [marqueeTouching, setMarqueeTouching] = useState(false);
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
  // One locked shape holds the whole selection still, as beginTransform refuses it.
  const selectionLocked = useMemo(
    () => selectedIds.some((id) => shapes.find((shape) => shape.id === id)?.locked),
    [selectedIds, shapes],
  );
  const suppressNextRotationEditRef = useRef(false);
  const [activeRotationWheel, setActiveRotationWheel] = useState(false);
  const [activeTransformKind, setActiveTransformKind] = useState<TransformHandleKind | null>(null);
  const [rotationWheelAxis, setRotationWheelAxis] = useState<RotationAxis>("y");
  const [pinnedRotationWheelView, setPinnedRotationWheelView] = useState<PinnedRotationWheelView | null>(null);
  const [editingDimension, setEditingDimension] = useState<EditingDimension>(null);
  const [editingCorner, setEditingCorner] = useState<EditingCorner>(null);
  const [editingRotation, setEditingRotation] = useState<EditingRotation>(null);
  const [tapeMode, setTapeMode] = useState(false);
  // A click on an edge measures the whole edge (the length of a circle, say); off, it sets a point on the edge (#308).
  const [tapeWholeEdges, setTapeWholeEdges] = useState(true);
  const [tapeDeleteMode, setTapeDeleteMode] = useState(false);
  const [tapeQuickDelete, setTapeQuickDelete] = useState(false);
  const lastTapePointerRef = useRef<{ clientX: number; clientY: number } | null>(null);
  const [tapeMoveMode, setTapeMoveMode] = useState(false);
  const [tapeToolsOpen, setTapeToolsOpen] = useState(false);
  const [tapeClearPending, setTapeClearPending] = useState(false);
  const [cameraControlsCollapsed, setCameraControlsCollapsed] = useState(false);
  const language = useLanguage();
  const [orthographicView, setOrthographicView] = useState(false);
  /** The window of the second view, while it is open. */
  const [secondViewWindow, setSecondViewWindow] = useState<Window | null>(null);
  const secondViewSupported = useSecondViewSupported();
  // Hides the whole plate - grid, labels and any face workplane - for a clear
  // look at the underside. Only the view changes: shapes still land on it.
  const [workplaneLayerHidden, setWorkplaneLayerHidden] = useState(false);
  // Q hides the sizes and distances around the selection for a while, so a part being moved is easy to see (#981).
  const [dimensionsHidden, setDimensionsHidden] = useState(false);
  const dimensionsHiddenRef = useRef(dimensionsHidden);
  const showDimensions = useCallback((visible: boolean) => {
    dimensionsHiddenRef.current = !visible;
    setDimensionsHidden(!visible);
  }, []);
  const workplaneLayerHiddenRef = useRef(workplaneLayerHidden);
  workplaneLayerHiddenRef.current = workplaneLayerHidden;
  // Back from the sketch the measurements come from the editor's memory; on opening the design, from what the design keeps (#881).
  const [tapeModel, setTapeModel] = useState<TapeModel>(() => toolMemory?.current.tape ?? {
    ...(readTape(projectId) ?? { points: [], segments: [] }),
    startPointId: null,
    hover: null,
  });
  const savedTapeKeyRef = useRef<string | null>(null);
  const [tapeOverlay, setTapeOverlay] = useState<TapeOverlayState | null>(null);
  const [rulerDimensionOverlay, setRulerDimensionOverlay] = useState<RulerDimensionOverlayState | null>(null);
  const [cornerRulerMode, setCornerRulerMode] = useState(false);
  const [cornerRulerOverlay, setCornerRulerOverlay] = useState<CornerRulerOverlayState | null>(null);
  const [rulerDimensionEditing, setRulerDimensionEditing] = useState<{ shapeId: string; field: RulerDimensionField; x: number; y: number; value: string; base: number } | null>(null);
  const [rulerDuplicatePreview, setRulerDuplicatePreview] = useState<{ x: number; y: number; label: string } | null>(null);
  const [rulerDuplicateEditing, setRulerDuplicateEditing] = useState<{ rulerId: string; shapeId: string; baseAlong: number; x: number; y: number; value: string } | null>(null);
  const [rulerCoordinateEditing, setRulerCoordinateEditing] = useState<{ rulerId: string; shapeIds: string[]; axis: "x" | "z" | "elevation"; x: number; y: number; value: string } | null>(null);
  const [tapeLengthEditing, setTapeLengthEditing] = useState<{ segmentId: string; x: number; y: number; value: string } | null>(null);
  const [noteOverlay, setNoteOverlay] = useState<NoteOverlayState | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [moveDimensionOverlay, setMoveDimensionOverlay] = useState<MoveDimensionOverlayState | null>(null);
  const [moveDimensionsEnabled, setMoveDimensionsEnabled] = useState(true);
  const [originDimensionOverlay, setOriginDimensionOverlay] = useState<OriginDimensionOverlayData | null>(null);
  const [originDimensionsEnabled, setOriginDimensionsEnabled] = useState(true);
  const [startInPerspective, setStartInPerspective] = useState(true);
  const [hasStartView, setHasStartView] = useState(() => readStartView() !== null);
  const [sectionViewOpen, setSectionViewOpen] = useState(false);
  const [sectionSettings, setSectionSettings] = useState<SectionPlaneSettings>(DEFAULT_SECTION_SETTINGS);
  const sectionSettingsRef = useRef(sectionSettings);
  sectionSettingsRef.current = sectionSettings;
  // How the cut face looks (#446) is the person's choice, kept in this browser for every design;
  // read after mounting, so the page drawn on the server and the first one in the browser agree.
  const [sectionCutFace, setSectionCutFace] = useState<SectionCutFace>("hatch");
  const sectionCutFaceRef = useRef(sectionCutFace);
  sectionCutFaceRef.current = sectionCutFace;
  useEffect(() => {
    const stored = readSectionCutFace();
    sectionCutFaceRef.current = stored;
    setSectionCutFace(stored);
  }, []);
  const changeSectionCutFace = useCallback((cutFace: SectionCutFace) => {
    sectionCutFaceRef.current = cutFace;
    setSectionCutFace(cutFace);
    try {
      window.localStorage.setItem(SECTION_CUT_FACE_STORAGE_KEY, cutFace);
    } catch {
      // The choice still holds in this editor session when storage is unavailable.
    }
  }, []);
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
  // The mouse wheel in the clicked field (#536): a step a notch, as in the number fields of the properties.
  const sectionOffsetInputRef = useRef<HTMLInputElement>(null);
  const sectionOffsetDraftRef = useRef<string | null>(null);
  sectionOffsetDraftRef.current = sectionOffsetDraft;
  const sectionWheelShownRef = useRef<string | null>(null);
  useWheelField(sectionOffsetInputRef, sectionOffsetDraft !== null, ({ direction, keys }) => {
    const settings = sectionSettingsRef.current;
    const bounds = getSectionBounds(shapesRef.current, settings.axis, workspaceRef.current.width, workspaceRef.current.depth, settings.frame ?? null);
    const sign = settings.axis === "z" ? -1 : 1;
    const display = workspaceRef.current;
    const parsed = parseMeasurementInput(sectionOffsetDraftRef.current ?? "");
    const current = Number.isFinite(parsed) ? parsed : millimetersToDisplay(sign * settings.offset, display);
    const base = wheelBaseStep(millimetersToDisplay(bounds.min, display), millimetersToDisplay(bounds.max, display), 0, lengthDisplayUnit(display).label === "in");
    const next = wheelNextValue(current, direction, base, keys);
    const shown = String(Math.round(next * 1000) / 1000 || 0);
    sectionOffsetDraftRef.current = shown;
    setSectionOffsetDraft(shown);
    sectionWheelShownRef.current = shown;
    handleSectionOffsetChange(sign * displayToMillimeters(next, display));
  });
  const sectionFineDraggingRef = useRef(false);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const threeRef = useRef<ThreeState | null>(null);
  // A 3D mouse the site may use steers this view (#1013).
  useSpaceMouse(threeRef);
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
  const touchEmptyTapRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  /** A left press on empty space that turns the view in the slicer scheme (#1013): let go where it began, it clears the selection. */
  const slicerEmptyPressRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  // A finger held still on a body or on empty space opens the menu a right click opens (#337).
  const longPressRef = useRef<{ pointerId: number; timer: number; stop: () => void } | null>(null);
  const longPressFiredRef = useRef<number | null>(null);
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
  const [pointCardOffsets, setPointCardOffsets] = useState<Record<string, PointCardOffset>>({});
  const changePointCardOffset = useCallback((noteId: string, offset: PointCardOffset, final: boolean) => {
    setPointCardOffsets((current) => {
      const next = { ...current };
      // Back at its pin, a card needs no entry of its own and uses the default again.
      if (offset.x === 0 && offset.y === 0 && final) delete next[noteId];
      else next[noteId] = offset;
      if (final) {
        try {
          window.localStorage.setItem(POINT_CARD_OFFSETS_STORAGE_KEY, JSON.stringify(next));
        } catch {
          // The card keeps its place for this session when storage is unavailable.
        }
      }
      return next;
    });
  }, []);
  const [proportionLock, setProportionLock] = useState(false);
  const proportionLockRef = useRef(false);
  useEffect(() => {
    setPointCardOffset(readPointCardOffset());
    setPointCardOffsets(readPointCardOffsets());
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
  const getViewCubeRig = useCallback(() => threeRef.current, []);
  // Der Umschalter fuer das Drehen mit einem Finger steht nur dort, wo er
  // gebraucht wird. Anfangs falsch, damit das ausgelieferte HTML passt.
  const [touchDevice, setTouchDevice] = useState(false);
  const [touchRotate, setTouchRotate] = useState(false);
  // The round Select multiple button of a touch screen (#337): it stands while a body is picked
  // with a finger. A tap on it locks Select multiple, so every further tap adds a body to the
  // selection or takes it out; a second tap ends the mode and lets the selection go. A mouse never
  // needs it.
  const [touchMultiSelectVisible, setTouchMultiSelectVisible] = useState(false);
  const [touchMultiSelectActive, setTouchMultiSelectActive] = useState(false);
  const touchMultiSelectActiveRef = useRef(false);
  const setTouchMultiSelectActiveState = useCallback((active: boolean) => {
    touchMultiSelectActiveRef.current = active;
    setTouchMultiSelectActive((current) => (current === active ? current : active));
  }, []);
  const updateTouchMultiSelectVisible = useCallback((visible: boolean) => {
    setTouchMultiSelectVisible((current) => (current === visible ? current : visible));
  }, []);
  const endTouchMultiSelect = useCallback(() => {
    setTouchMultiSelectActiveState(false);
    updateTouchMultiSelectVisible(false);
  }, [setTouchMultiSelectActiveState, updateTouchMultiSelectVisible]);
  // A tap on the button locks Select multiple; a second tap ends it, takes the selection with it
  // and puts the button away.
  const toggleTouchMultiSelect = useCallback(() => {
    if (touchMultiSelectActiveRef.current) {
      endTouchMultiSelect();
      onSelectShape(null);
    } else {
      setTouchMultiSelectActiveState(true);
      updateTouchMultiSelectVisible(true);
    }
  }, [endTouchMultiSelect, onSelectShape]);
  useEffect(() => {
    // Locked Select multiple keeps the button, even with nothing selected yet.
    if (selectedIds.length === 0 && !touchMultiSelectActiveRef.current) updateTouchMultiSelectVisible(false);
  }, [selectedIds.length, updateTouchMultiSelectVisible]);
  // A new body takes the selection, so the locked mode has nothing left to add to.
  const shapeCountRef = useRef(shapes.length);
  useEffect(() => {
    const count = shapes.length;
    const grew = count > shapeCountRef.current;
    shapeCountRef.current = count;
    if (grew && touchMultiSelectActiveRef.current) endTouchMultiSelect();
  }, [shapes.length, endTouchMultiSelect]);
  // The button belongs to plain picking; a tool that takes the taps itself takes it away with it.
  const touchMultiSelectAvailable = touchMultiSelectVisible
    && !workplaneMode && !splitActive && !pickOnly
    && !alignMode && !mirrorMode
    && !tapeMode && !tapeDeleteMode && !tapeMoveMode && !cornerRulerMode
    && !modifierActive && !pivotPickMode && !layFlatPickMode && !mateFacePick && !cadFacePick;
  useEffect(() => {
    // A button that is not on the screen cannot be locked any more.
    if (!touchMultiSelectAvailable && touchMultiSelectActiveRef.current) endTouchMultiSelect();
  }, [touchMultiSelectAvailable, endTouchMultiSelect]);
  const transformOverlayRef = useRef<TransformOverlayState | null>(null);
  const alignOverlayRef = useRef<AlignOverlayState | null>(null);
  const mirrorOverlayRef = useRef<MirrorOverlayState | null>(null);
  const tapeModeRef = useRef(false);
  const tapeWholeEdgesRef = useRef(true);
  const tapeDeleteModeRef = useRef(false);
  const tapeMoveModeRef = useRef(false);
  // Only refs and state setters, so it is the same on every render.
  const leaveTapeSubModes = () => {
    tapeDeleteModeRef.current = false;
    setTapeDeleteMode(false);
    tapeMoveModeRef.current = false;
    setTapeMoveMode(false);
  };
  const tapePointDragRef = useRef<TapePointDragState | null>(null);
  const tapeModelRef = useRef(tapeModel);
  const notesRef = useRef(notes);
  const noteModeRef = useRef(noteMode);
  const rotationPivotRef = useRef<PivotPoint | null>(rotationPivot);
  const pivotPickModeRef = useRef(pivotPickMode);
  const imageCalibrationIdRef = useRef(imageCalibrationId);
  const onImageCalibrationPointRef = useRef(onImageCalibrationPoint);
  imageCalibrationIdRef.current = imageCalibrationId;
  onImageCalibrationPointRef.current = onImageCalibrationPoint;
  const layFlatPickModeRef = useRef(layFlatPickMode);
  layFlatPickModeRef.current = layFlatPickMode;
  const mateFacePickRef = useRef(mateFacePick);
  mateFacePickRef.current = mateFacePick;
  const mateFaceHoverRef = useRef<{ x: number; y: number } | null>(null);
  const cadFacePickRef = useRef(cadFacePick);
  cadFacePickRef.current = cadFacePick;
  const cadFaceHoverRef = useRef<number | null>(null);
  const notesVisibleRef = useRef(notesVisible);
  const noteOverlayRef = useRef<NoteOverlayState | null>(null);
  const noteDragRef = useRef<NoteDragState | null>(null);
  const noteClickSuppressedRef = useRef<string | null>(null);
  const tapeOverlayRef = useRef<TapeOverlayState | null>(null);
  const tapeIdRef = useRef(-1);
  const tapeShiftHintShownRef = useRef(false);
  if (tapeIdRef.current < 0) tapeIdRef.current = highestTapeIdNumber(tapeModel); // New ids count on from the kept measurements' (#881).
  const rulerDimensionOverlayRef = useRef<RulerDimensionOverlayState | null>(null);
  const cornerRulerModeRef = useRef(false);
  // Back from the sketch the square comes from the editor's memory; on opening the design, from what the design keeps (#829).
  const storedCornerRulers = useRef<CornerRulerInstance[] | null>(null);
  if (storedCornerRulers.current === null) {
    storedCornerRulers.current = toolMemory?.current.cornerRulers
      ?? readCornerRulers(projectId).map((ruler, index) => ({ ...ruler, id: `corner-ruler-${index + 1}` }));
  }
  const cornerRulerModelRef = useRef<CornerRulerInstance[]>(storedCornerRulers.current);
  const cornerRulerOverlayRef = useRef<CornerRulerOverlayState | null>(null);
  const cornerRulerIdRef = useRef(toolMemory?.current.cornerRulerId ?? storedCornerRulers.current.length);
  const cornerRulerDragRef = useRef<{ id: string; pointerId: number; moved: boolean } | null>(null);
  const rulerDuplicateDragRef = useRef<{ pointerId: number; rulerId: string; shapeId: string; baseAlong: number; planeY: number; sourceX: number; sourceZ: number } | null>(null);
  const alignModeRef = useRef(alignMode);
  const multiSelectRef = useRef(multiSelect);
  multiSelectRef.current = multiSelect;
  const onMultiSelectEndRef = useRef(onMultiSelectEnd);
  onMultiSelectEndRef.current = onMultiSelectEnd;
  const alignAnchorIdRef = useRef(alignAnchorId);
  const alignHandlesRef = useRef(alignHandles);
  const mirrorModeRef = useRef(mirrorMode);
  const modifierActiveRef = useRef(modifierActive);
  const modifierPreviewActiveRef = useRef(modifierPreviewActive);
  const modifierEdgesRef = useRef(modifierEdges);
  const modifierEdgePickOptionsRef = useRef({ onlyVisible: modifierOnlyVisibleEdges, alwaysIds: failedModifierEdgeIds });
  modifierEdgePickOptionsRef.current = { onlyVisible: modifierOnlyVisibleEdges, alwaysIds: failedModifierEdgeIds };
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
  const pickPlacementSurfaceRef = useRef<((clientX: number, clientY: number, reverse: boolean, skip?: ReadonlySet<string>, faceCentre?: "always" | "near" | false) => {
    point: THREE.Vector3; normal: THREE.Vector3; workplane: PlacementWorkplane; shapeId: string;
  } | null) | null>(null);
  /** Alt held while a shape is placed by click: it goes where the pointer is, not to a face's middle (#823). */
  const cruiseFreeRef = useRef(false);
  const cruisePreviewRef = useRef<{ object: THREE.Group; shape: WorkplaneShape } | null>(null);
  const cruisePointerRef = useRef<{ x: number; y: number } | null>(null);
  // A text is drawn with what is there when it is built: a font that arrives later - the Japanese
  // face a Japanese text fetches, after a reload too - would leave it with question marks, and
  // the 2D kernel arriving later would leave a name tag's wider layers as plain letters (#215).
  // The shapes on the plate and the ghost of a shape being placed are built again then.
  const [drawRound, setDrawRound] = useState(0);
  useEffect(() => onCustomFontsChanged(() => setDrawRound((round) => round + 1)), []);
  useEffect(() => onManifoldReady(() => setDrawRound((round) => round + 1)), []);
  cruiseAssetRef.current = cruiseAsset;
  const projectNameRef = useRef(projectName);
  const projectIdRef = useRef(projectId);
  projectIdRef.current = projectId;
  const designViewRestoredRef = useRef(false);
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
  const pickOnlyRef = useRef(pickOnly);
  pickOnlyRef.current = pickOnly;
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
  // Parts hanging on the pointer (C, or a custom shape from the library, #463) move on the screen only; their
  // measures and handles are worked out from where the parts stand in the design, so they would show at the old
  // place until the click sets the parts down. They stay out while the parts are carried.
  const carryActive = Boolean(carryIds?.length);
  const outlineSelectionIds = useCallback(
    (ids = selectedIdsRef.current) => (
      workplaneModeRef.current || splitActiveRef.current || (modifierActiveRef.current && !modifierPreviewActiveRef.current) ? [] : ids
    ),
    [],
  );
  // Read from the ref: handlers made earlier keep this function, and must see the parts being carried too.
  const renderSelectionIds = useCallback(
    (ids = selectedIdsRef.current) => (carryIdsRef.current?.length ? [] : outlineSelectionIds(ids)),
    [outlineSelectionIds],
  );
  /** The bodies drawn with the selection outline: the selection, or what is picked in pick-only mode. */
  const shapeOutlineIds = useCallback(
    (ids = selectedIdsRef.current) => pickOnlyRef.current?.ids ?? outlineSelectionIds(ids),
    [outlineSelectionIds],
  );
  /**
   * Die ausgewaehlten Formen, solange gerade nichts anderes den Bildschirm
   * belegt - siehe layerling-lineal.md. Mehrere zaehlen zusammen wie ein
   * Koerper: gemessen wird ihre gemeinsame Umrissbox, wie in similar tools.
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

  // The edge lines are built when the edges or their states change; the pointer moving onto
  // another edge only swaps the hover lines (thousands of edges on a mesh body).
  const hoverModifierEdgeIdRef = useRef(hoverModifierEdgeId);
  hoverModifierEdgeIdRef.current = hoverModifierEdgeId;
  useEffect(() => {
    modifierEdgesRef.current = modifierEdges;
    rebuildModifierEdges(threeRef.current, modifierEdges, selectedModifierEdgeIds, modifierPreviewActive, hoverModifierEdgeIdRef.current, modifierHighlightedEdgeIds, failedModifierEdgeIds, modifierOnlyVisibleEdges);
  }, [failedModifierEdgeIds, modifierEdges, modifierHighlightedEdgeIds, modifierOnlyVisibleEdges, modifierPreviewActive, selectedModifierEdgeIds]);
  useEffect(() => {
    setModifierEdgeHover(threeRef.current, modifierEdgesRef.current, hoverModifierEdgeId, selectedModifierEdgeIds, modifierPreviewActive, failedModifierEdgeIds);
    // Only the pointer: everything else rebuilds the lines (and the hover with them) above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoverModifierEdgeId]);

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

  /** A typed way up or down for what the lift arrow just moved (#979); minus goes down. */
  const commitLiftDimension = useCallback(
    (rawValue: string) => {
      const session = moveDimensionSessionRef.current;
      const lift = session?.lift;
      const typed = parseMeasureMm(rawValue);
      if (!session || !lift || !Number.isFinite(typed)) {
        return;
      }
      // No body goes below the lowest or above the highest elevation the lift arrow allows.
      let minimum = -Infinity;
      let maximum = Infinity;
      if (Math.abs(lift.axis.y) > 1e-6) {
        lift.items.forEach((item) => {
          const bottom = item.centerY - item.height / 2;
          const low = (MIN_ELEVATION - bottom) / lift.axis.y;
          const high = (MAX_ELEVATION - bottom) / lift.axis.y;
          minimum = Math.max(minimum, Math.min(low, high));
          maximum = Math.min(maximum, Math.max(low, high));
        });
      }
      lift.delta = clamp(typed, minimum, maximum);

      onInteractionActiveChange?.(true);
      lift.items.forEach((item) => {
        const centerY = item.centerY + lift.axis.y * lift.delta;
        onUpdateShape(item.id, {
          x: cleanNearZero(item.centerX + lift.axis.x * lift.delta, 0.0005),
          z: cleanNearZero(item.centerZ + lift.axis.z * lift.delta, 0.0005),
          elevation: cleanNearZero(clamp(centerY - item.height / 2, MIN_ELEVATION, MAX_ELEVATION), 0.0005),
        });
      });
      onInteractionActiveChange?.(false);
      if (threeRef.current) {
        syncMoveDimensionOverlay(
          threeRef.current,
          session,
          moveDimensionOverlayRef,
          setMoveDimensionOverlay,
          workspaceRef.current.accuracy,
          resolvedThemeRef.current,
        );
        threeRef.current.needsRender = true;
      }
    },
    [onInteractionActiveChange, onUpdateShape],
  );

  const commitMoveDimension = useCallback(
    (axis: MoveDimensionAxis, rawValue: string) => {
      if (axis === "lift") {
        commitLiftDimension(rawValue);
        return;
      }
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
    [commitLiftDimension, onInteractionActiveChange, onUpdateShape],
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
  /** The unit switch beside the snap grid: as the settings change the unit, the grid and the snap step follow (#422). */
  const changeUnits = useCallback((units: string) => {
    pendingWorkspaceHydrationFingerprintRef.current = null;
    setWorkspace((current) => workspaceForUnits(current, units));
    setSnap((current) => snapGridForUnits(units, current));
  }, []);
  /**
   * What the settings window and the "Save as default" button change: a choice, so never a hydration
   * echo either. Without disarming the guard the first change after the parent had handed the settings
   * back was swallowed, and the editor kept the old ones: a second "Save as default", or "Reset defaults",
   * did not reach the next new shape (#483).
   */
  const changeWorkspace = useCallback<Dispatch<SetStateAction<WorkspaceSettings>>>((value) => {
    pendingWorkspaceHydrationFingerprintRef.current = null;
    setWorkspace(value);
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

  // A ruler's scale follows the unit (#500): it is read when the ruler is built, so it is set before the build and
  // the rulers are built again when the unit changes.
  const inchScale = workspace.units === "Imperial";
  setRulerInchScale(inchScale);
  useEffect(() => {
    if (!threeRef.current) return;
    rebuildShapes(threeRef.current, shapesRef.current, shapeOutlineIds(), modifierActiveRef.current, placementWorkplaneRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inchScale]);

  useEffect(() => {
    shapesRef.current = shapes;
    rebuildShapes(
      threeRef.current,
      shapes,
      shapeOutlineIds(),
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
  }, [shapes, drawRound]);

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
      shapeOutlineIds(selectedIds),
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
      shapeOutlineIds(),
      modifierActive,
      placementWorkplaneRef.current,
    );
    if (threeRef.current) threeRef.current.needsRender = true;
  }, [modifierActive, renderSelectionIds, shapeOutlineIds]);

  useEffect(() => {
    modifierPreviewActiveRef.current = modifierPreviewActive;
    rebuildShapes(
      threeRef.current,
      shapesRef.current,
      shapeOutlineIds(),
      modifierActiveRef.current,
      placementWorkplaneRef.current,
    );
    if (threeRef.current) threeRef.current.needsRender = true;
  }, [modifierPreviewActive, renderSelectionIds, shapeOutlineIds]);

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
      threeRef.current.alignFrameInfo = alignAxes && alignFrameBounds ? { axes: alignAxes, bounds: alignFrameBounds } : null;
      syncAlignOverlay(threeRef.current, alignReferenceShapesRef.current, selectedIdsRef.current, alignMode, alignAnchorId, alignHandles, alignOverlayRef, setAlignOverlay);
      threeRef.current.needsRender = true;
    }
  }, [alignAnchorId, alignAxes, alignFrameBounds, alignHandles, alignMode]);

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
    if (toolMemory) toolMemory.current.tape = tapeModel;
    // The design keeps its measurements (#881), beside it in the browser and in its .lyl file; a point or hover
    // moving under the pointer is not a change worth writing.
    const kept = savedTape(tapeModel);
    const key = kept ? JSON.stringify(kept) : "";
    if (key !== savedTapeKeyRef.current) {
      if (savedTapeKeyRef.current !== null || kept) writeTape(projectIdRef.current, kept);
      savedTapeKeyRef.current = key;
    }
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
    const frame = sectionSettings.frame ?? null;
    const current = sectionMeasureRef.current;
    if (current.axis !== axis || current.offset !== offset || current.frame !== frame) {
      // A measurement belongs to its plane.
      sectionMeasureRef.current = { ...EMPTY_SECTION_MEASURE, axis, offset, frame, loops: [] };
      setSectionMeasureResult(null);
    }
    if (!sectionMeasureMode || !sectionSettings.enabled || !onSectionContours) {
      if (threeRef.current) threeRef.current.needsRender = true;
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      onSectionContours(axis, offset, frame)
        .then((loops) => {
          if (cancelled) return;
          const model = sectionMeasureRef.current;
          if (model.axis !== axis || model.offset !== offset || model.frame !== frame) return;
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

  // The cut face (#516): where the plane goes through a solid it is filled, with the colour of the body a
  // little darker, so a solid and a hole no longer look the same inside. It is made from the same bodies as
  // the section SVG; the slow part is made once per state of the design, so the face follows the plane while it moves.
  // A changed design leaves the old face wrong at once; a moved plane keeps it until the new one is cut, a moment later.
  useEffect(() => {
    if (threeRef.current) clearSectionCaps(threeRef.current);
  }, [shapes]);

  // The face is cut for the newest plane, one round at a time, and a round is never thrown away because the plane
  // moved on: with a delay that every move restarts, a plane that moves faster than the delay never let the face
  // be cut, and it only came back when the hand rested (#516, rondlh: "lags behind, sometimes a second").
  type SectionCapWish = { axis: SectionPlaneAxis; offset: number; frame: SectionFrame | null; shapes: typeof shapes; cutFace: SectionCutFace };
  const sectionBodiesRef = useRef(onSectionBodies);
  sectionBodiesRef.current = onSectionBodies;
  const sectionCapRunnerRef = useRef<LatestRunner<SectionCapWish> | null>(null);
  if (sectionCapRunnerRef.current === null) {
    const runner: LatestRunner<SectionCapWish> = createLatestRunner<SectionCapWish>(
      async (wish) => {
        const makeBodies = sectionBodiesRef.current;
        if (!makeBodies) return;
        const bodies = await makeBodies(wish.axis, wish.offset, wish.frame);
        const current = threeRef.current;
        const now = runner.wanted();
        // The face of a design that has changed since, or of a section that is off, is not shown.
        if (current && now && now.shapes === wish.shapes && now.cutFace === wish.cutFace) buildSectionCaps(current, bodies, wish.axis, wish.offset, wish.frame, wish.cutFace);
      },
      (a, b) => a.axis === b.axis && a.offset === b.offset && a.frame === b.frame && a.shapes === b.shapes && a.cutFace === b.cutFace,
    );
    sectionCapRunnerRef.current = runner;
  }

  useEffect(() => {
    const runner = sectionCapRunnerRef.current;
    if (!runner) return;
    // "Open" leaves the cut as the clipping makes it (#446): nothing is cut, nothing is drawn.
    if (!sectionSettings.enabled || !onSectionBodies || sectionCutFace === "open") {
      runner.clear();
      if (threeRef.current) clearSectionCaps(threeRef.current);
      return;
    }
    runner.request({ axis: sectionSettings.axis, offset: sectionSettings.offset, frame: sectionSettings.frame ?? null, shapes, cutFace: sectionCutFace });
  }, [sectionSettings.enabled, sectionSettings.axis, sectionSettings.offset, sectionSettings.frame, shapes, onSectionBodies, sectionCutFace]);

  useEffect(() => () => sectionCapRunnerRef.current?.clear(), []);

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
    if (!mateFacePick) mateFaceHoverRef.current = null;
  }, [layFlatPickMode, mateFacePick]);

  // A group's parts joined, or let go, after the pointer stopped on it: its face is lit again without another move.
  const mateFaceJoined = mateFacePick?.joined ?? null;
  useEffect(() => {
    const pick = mateFacePickRef.current;
    const pointer = mateFaceHoverRef.current;
    if (!pick || !pointer) return;
    syncLayFlatHover(threeRef.current, pick.shapeIds, resolvedThemeRef.current, pointer.x, pointer.y, pick.round, mateFaceJoined);
  }, [mateFaceJoined]);

  useEffect(() => {
    if (!cadFacePick) cadFaceHoverRef.current = null;
    syncCadFaceLayer(threeRef.current, cadFacePick, resolvedTheme, cadFaceHoverRef.current);
  }, [cadFacePick, resolvedTheme]);

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
  }, [renderSelectionIds, rotationPivot, carryActive]);

  useLayoutEffect(() => {
    const state = threeRef.current;
    rebuildShapes(
      state,
      shapesRef.current,
      shapeOutlineIds(),
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
      state.moveDimensionLayer.visible = !workplaneMode && !splitActive && !dimensionsHiddenRef.current;
      state.originDimensionLayer.visible = !workplaneMode && !splitActive && !dimensionsHiddenRef.current;
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
  }, [clearMoveDimensions, renderSelectionIds, shapeOutlineIds, splitActive, workplaneMode]);

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
    syncSplitPlane(threeRef.current, splitPlane, splitHandleState !== null, selectedIds);
  }, [splitHandleState, splitPlane, selectedIds]);

  useLayoutEffect(() => {
    // The plane label carries the project name, so a rename has to redraw it.
    projectNameRef.current = projectName;
    workspaceRef.current = workspace;
    setMeasureUnit(workspace);
    if (threeRef.current) threeRef.current.palette = appThemePalette(themePreference);
    // Edge lines on all bodies: shapes already built have to take the setting up.
    const holesChanged = setStrongHoles(workspace.strongHoles);
    if (setEdgeLineStyle(effectiveViewSettings(workspace).edgeLines, workspace.edgeColor) || holesChanged) {
      rebuildShapes(threeRef.current, shapesRef.current, shapeOutlineIds(), modifierActiveRef.current, placementWorkplaneRef.current);
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

  useEffect(() => {
    const state = threeRef.current;
    if (!state) return;
    state.moveDimensionLayer.visible = !workplaneMode && !splitActive && !dimensionsHidden;
    state.originDimensionLayer.visible = !workplaneMode && !splitActive && !dimensionsHidden;
    state.needsRender = true;
  }, [dimensionsHidden, splitActive, workplaneMode]);

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
    // The preview of a design (the cards of the overview, the server copy) shows all its bodies, framed, from the side
    // the view looks from: not the screen as it stands, which is a close-up or a speck on the plate, depending on how far
    // in or out the work was done. The camera is put back at once; the screen is not shown in between.
    window.layerlingCaptureCanvasAsync = () => {
      const bounds = selectionBounds(state, [...state.shapeRecords.keys()].filter((id) => state.shapeRecords.get(id)?.object.visible));
      const saved = bounds
        ? { position: state.camera.position.clone(), target: state.controls.target.clone(), up: state.camera.up.clone(), zoom: state.camera.zoom, reach: state.focusReach, turn: state.cameraTurn }
        : null;
      if (bounds) {
        frameBounds(state, bounds);
        fitCameraDepthRange(state.camera, state.controls.target);
      }
      state.camera.updateMatrixWorld();
      renderFrame(state);
      const picture = thumbnailPngDataUrl(state.renderer.domElement);
      if (saved) {
        state.camera.position.copy(saved.position);
        state.controls.target.copy(saved.target);
        state.camera.up.copy(saved.up);
        state.camera.zoom = saved.zoom;
        state.focusReach = saved.reach;
        state.cameraTurn = saved.turn;
        state.camera.lookAt(saved.target);
        state.camera.updateProjectionMatrix();
        fitCameraDepthRange(state.camera, state.controls.target);
        state.camera.updateMatrixWorld();
        state.needsRender = true;
      }
      return picture;
    };
    window.layerlingOrbitView = (azimuthDegrees, polarDegrees) => { state.cameraTurn = null; orbitViewBy(state, azimuthDegrees, polarDegrees); state.needsRender = true; };
    window.layerlingPanView = (rightFraction, upFraction) => { state.cameraTurn = null; panViewBy(state, rightFraction, upFraction); state.needsRender = true; };
    window.layerlingCaptureView = (face = "current") => {
      if (face === "home") {
        resetCamera(state);
      } else if (face !== "current") {
        const direction = viewDirectionFromName(face);
        if (!direction) throw new Error(`Unknown view "${face}": use a face, or two or three neighbouring faces joined with "-", like "front-right-top"`);
        setCameraToViewDirection(state, direction, false);
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
        state.cadFaceLayer ?? null,
        state.helperLayer,
        state.transformGuideLayer,
        state.moveDimensionLayer,
        state.originDimensionLayer,
        state.cornerRulerLayer,
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
    rebuildShapes(state, shapesRef.current, shapeOutlineIds(), false, placementWorkplaneRef.current);
    syncSplitPlane(state, splitPlaneRef.current, false, selectedIdsRef.current);

    const animate = () => {
      state.animationId = window.requestAnimationFrame(animate);
      const now = performance.now();
      const turning = stepCameraTurn(state, now);
      const controlsChanged = state.controls.update();
      fitCameraDepthRange(state.camera, state.controls.target);
      const cameraSettled = state.wasCameraMoving && !controlsChanged;
      if (!turning && !controlsChanged && !state.needsRender && !cameraSettled) {
        return;
      }
      constrainCamera(state, workspaceRef.current);
      // Future edits: keep this before any view cube or transform-overlay projection.
      // OrbitControls changes camera position/quaternion, but manual Vector3.project()
      // can read the previous matrix unless we force the matrix world current here.
      // Removing this brings back the one-frame-late handle/line lag during camera motion.
      state.camera.updateMatrixWorld();
      if (turning || now - state.lastViewCubeSync > 48 || cameraSettled || state.needsRender) {
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
      rememberCameraView(projectIdRef.current, state);
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
      if (state.cadFaceLayer) disposeChildren(state.cadFaceLayer);
      if (state.cadFacePickMesh) disposeCadFacePickMesh(state.cadFacePickMesh);
      disposeChildren(state.shapeLayer);
      state.shapeRecords.clear();
      disposeChildren(state.helperLayer);
      disposeChildren(state.splitLayer);
      disposeChildren(state.transformGuideLayer);
      disposeChildren(state.moveDimensionLayer);
      disposeChildren(state.originDimensionLayer);
      disposeChildren(state.cornerRulerLayer);
      disposeChildren(state.modifierLayer);
      if (state.sectionPlaneHelper) {
        state.scene.remove(state.sectionPlaneHelper);
        disposeObject(state.sectionPlaneHelper);
        state.sectionPlaneHelper = null;
      }
      clearSectionCaps(state);
      disposeCutPreviewResources(state.renderer);
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
      delete window.layerlingOrbitView;
      delete window.layerlingPanView;
      threeRef.current = null;
    };
  }, []);

  const emptyPressRef = useViewportDoubleClick({ threeRef, hostRef, shapesRef, selectedIdsRef, workspaceRef, pivotPickModeRef, drawnWorkplane, onEditSketch, onOpenGroup });

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

  const { saveView, showSavedView } = useDesignViews({
    threeRef, projectIdRef, viewCubeRef, designViewRestoredRef, orthographicView, setOrthographicView, onNotice,
  });

  // The view new designs open in and Home goes back to (#853), for every design of this browser.
  const saveStartView = useCallback(() => {
    const state = threeRef.current;
    if (!state) return false;
    writeStartView(startViewOf(state));
    setHasStartView(readStartView() !== null);
    onNotice?.(t("workspace.startViewSaved"));
    return true;
  }, [onNotice]);

  const resetStartView = useCallback(() => {
    writeStartView(null);
    setHasStartView(false);
  }, []);

  // The same keys for MCP (layerling_saved_view), through the functions the keys use.
  useEffect(() => {
    window.layerlingSavedViews = (request = {}) => {
      if (request.save !== undefined && !saveView(request.save)) throw new Error("The view is not ready yet");
      const shown = request.show !== undefined ? showSavedView(request.show) : undefined;
      if (request.startView === "save" && !saveStartView()) throw new Error("The view is not ready yet");
      if (request.startView === "reset") resetStartView();
      const views = readSavedViews(projectIdRef.current);
      return {
        keys: SAVED_VIEW_KEYS.map((key, slot) => ({ key, saved: Boolean(views[slot]) })),
        ...(shown !== undefined ? { shown } : {}),
        startView: readStartView() !== null,
      };
    };
    return () => {
      delete window.layerlingSavedViews;
    };
  }, [saveView, showSavedView, saveStartView, resetStartView]);

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

    aimPickRay(state, clientX, clientY);

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
    const frame = settings.frame ?? null;
    const direction = sectionAxisVector(settings.axis, frame);
    const normal = new THREE.Vector3(direction.x, direction.y, direction.z);
    const base = frame ? normal.dot(new THREE.Vector3(frame.origin.x, frame.origin.y, frame.origin.z)) : 0;
    const hit = toRawPlanePoint(clientX, clientY, new THREE.Plane(normal, -(base + settings.offset)));
    if (!hit) return null;
    const target = projectSectionPoint(sectionPointToFrame([hit.x, hit.y, hit.z], frame), settings.axis);
    const [nx, ny, nz] = sectionPointFromFrame(sectionPointToWorld({ u: target.u + 1, v: target.v }, settings.axis, settings.offset), frame);
    const here = projectToScreen(hit, state);
    const there = projectToScreen(new THREE.Vector3(nx, ny, nz), state);
    const pixelsPerMm = Math.max(1e-6, Math.hypot(there.x - here.x, there.y - here.y));
    const model = sectionMeasureRef.current;
    return snapSectionPoint(target, model.loops, pointerReach(12) / pixelsPerMm, model.a && !model.b ? model.a : null);
  }, [toRawPlanePoint]);

  const placeSectionMeasurePoint = useCallback((point: SectionPoint) => {
    const model = sectionMeasureRef.current;
    // Third click starts the next measurement.
    const next = !model.a || model.b ? { ...model, a: point, b: null } : { ...model, b: point };
    sectionMeasureRef.current = { ...next, hover: null };
    setSectionMeasureResult(next.a && next.b ? sectionMeasurement(next.a, next.b, next.axis, next.offset, next.loops) : null);
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

  const dragReachCacheRef = useRef<{ shapes: readonly WorkplaneShape[]; width: number; depth: number; x: number; z: number } | null>(null);
  const toPlacementWorkplanePoint = useCallback((clientX: number, clientY: number, workplane = placementWorkplaneRef.current) => {
    const normal = new THREE.Vector3(workplane.normal.x, workplane.normal.y, workplane.normal.z);
    const origin = new THREE.Vector3(workplane.origin.x, workplane.origin.y, workplane.origin.z);
    const raw = toRawPlanePoint(clientX, clientY, new THREE.Plane(normal, -normal.dot(origin)));
    if (!raw) return null;
    const local = placementWorkplaneCoordinates(workplane, raw);
    const step = snapStep(snapRef.current);
    const bounds = workspaceRef.current;
    // Wie bei andere Programme darf ein Teil neben der Platte geparkt werden (Discussion #80);
    // die Grenze faengt nur den flachen Blick ab, bei dem der Strahl die Ebene weit draussen trifft.
    // Sie reicht auch um einen Entwurf, der groesser ist als die Platte (#673).
    let cached = dragReachCacheRef.current;
    if (!cached || cached.shapes !== shapesRef.current || cached.width !== bounds.width || cached.depth !== bounds.depth) {
      const reach = dragReach(bounds, shapesRef.current.map(worldSnapBox));
      cached = { shapes: shapesRef.current, width: bounds.width, depth: bounds.depth, x: reach.x, z: reach.z };
      dragReachCacheRef.current = cached;
    }
    return placementWorkplanePoint(
      workplane,
      clamp(snapValue(local.x, step), -cached.x, cached.x),
      clamp(snapValue(local.z, step), -cached.z, cached.z),
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
   * Where a shape on the pointer lands, as in the usual Cruise (#195): over a body on the face
   * under the pointer, lined up with it (a sloped one too); elsewhere on the current workplane.
   */
  const cruiseTarget = useCallback((clientX: number, clientY: number, skip?: ReadonlySet<string>) => {
    // pickPlacementSurface is declared further down; it is reached through its ref.
    // A new shape snaps to the middle of a face near it, unless Alt is held; carried parts never do (#823).
    const surface = pickPlacementSurfaceRef.current?.(clientX, clientY, false, skip, skip || cruiseFreeRef.current ? false : "near") ?? null;
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
  }, [cruiseAsset, cruiseAsset ? workspace.shapeCustomizations[cruiseAsset.kind] : undefined, drawRound]);

  useEffect(() => {
    const pointer = cruisePointerRef.current;
    if (!cruiseAsset || !pointer) return;
    moveCruiseGhost(pointer.x, pointer.y);
  }, [cruiseAsset, moveCruiseGhost, placementWorkplane, drawRound]);

  const storeTapeModel = useCallback((next: TapeModel) => {
    // Whether the measurements are shown is kept unless the change says otherwise (an explicit true or false).
    const kept = "hidden" in next ? next : { ...next, hidden: tapeModelRef.current.hidden };
    tapeModelRef.current = kept;
    setTapeModel(kept);
  }, []);

  // Hidden measurements stay in the design and come back with the button (#881).
  const setTapeHidden = useCallback((hidden: boolean) => {
    const current = tapeModelRef.current;
    if (Boolean(current.hidden) === hidden) return;
    storeTapeModel({ ...current, hidden });
  }, [storeTapeModel]);

  // MCP: the eye among the tape measure's buttons, and what is measured (#881).
  useEffect(() => {
    window.layerlingMeasurements = (request) => {
      if (typeof request?.visible === "boolean") {
        setTapeHidden(!request.visible);
      }
      if (typeof request?.dimensions === "boolean") {
        showDimensions(request.dimensions);
      }
      const model = tapeModelRef.current;
      const state = threeRef.current;
      return { visible: !model.hidden, dimensions: !dimensionsHiddenRef.current, measurements: state ? tapeSegmentLengths(state, model) : [] };
    };
    return () => {
      delete window.layerlingMeasurements;
    };
  }, [setTapeHidden, showDimensions]);

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
      if (!attachedShape || (state && !attachedShape.hidden && tapeObjectBuilt(state, point.attachment.shapeId) && !tapeAttachmentMatchesTopology(state, point.attachment))) {
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
      if (!attachedShape || (state && !attachedShape.hidden && tapeObjectBuilt(state, segment.edge.shapeId) && !tapeEdgeMatchesTopology(state, segment.edge))) {
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
      setTapeQuickDelete(false);
      lastTapePointerRef.current = null;
      const current = tapeModelRef.current;
      storeTapeModel({ ...current, startPointId: null, startEdge: null, startNormal: null, hover: null });
    }
  }, [storeTapeModel]);

  // A shape taken up for placing puts down the measuring tools that would
  // otherwise catch its click (the editor does the same for its own tools).
  useEffect(() => {
    if (!cruiseAsset) return;
    setTapeActive(false);
    leaveTapeSubModes();
    tapePointDragRef.current = null;
    cornerRulerModeRef.current = false;
    setCornerRulerMode(false);
    setSectionMeasureMode(false);
  }, [cruiseAsset, setTapeActive]);

  const resolveTapeCandidate = useCallback(
    (
      clientX: number,
      clientY: number,
      ignoredPointId?: string,
      wholeEdges: boolean = tapeWholeEdgesRef.current,
      shiftKey = false,
      quickDeleteModifier = false,
    ): TapeCandidate | null => {
      const state = threeRef.current;
      if (!state) return null;

      const model = tapeModelRef.current;
      const rect = state.renderer.domElement.getBoundingClientRect();
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;
      // A finger covers more than a mouse pointer does, so it reaches further (#337).
      const pointReach = pointerReach(12);
      const lineReach = pointerReach(10);
      const referenceReach = pointerReach(14);
      const perpReach = pointerReach(TAPE_PERPENDICULAR_SNAP_PIXELS);
      const activeStartPoint = model.startPointId && model.startPointId !== ignoredPointId
        ? model.points.find((point) => point.id === model.startPointId) ?? null
        : null;
      const moveStartPoint = !activeStartPoint && ignoredPointId
        ? (() => {
            const attachedSegments = model.segments.filter(
              (segment) => !segment.edge && (segment.startId === ignoredPointId || segment.endId === ignoredPointId),
            );
            if (attachedSegments.length !== 1) return null;
            const otherId = attachedSegments[0].startId === ignoredPointId ? attachedSegments[0].endId : attachedSegments[0].startId;
            return model.points.find((point) => point.id === otherId) ?? null;
          })()
        : null;
      const referenceStartPoint = activeStartPoint ?? moveStartPoint;
      const startWorld = referenceStartPoint ? tapePointWorld(state, referenceStartPoint) : null;
      const startNormal = activeStartPoint && model.startNormal
        ? new THREE.Vector3(model.startNormal[0], model.startNormal[1], model.startNormal[2])
        : null;

      // The first point is on a circle: the point across it, which makes the diameter, catches the pointer first.
      if (activeStartPoint && model.startEdge) {
        const across = diameterSnapCandidate(state, activeStartPoint, model.startEdge, localX, localY);
        if (across) return across;
      }
      const closestPoint = model.points.reduce<{ point: TapePoint; distance: number } | null>((closest, point) => {
        if (point.id === ignoredPointId) return closest;
        const screen = projectToScreen(tapePointWorld(state, point), state);
        const distance = Math.hypot(screen.x - localX, screen.y - localY);
        if (distance <= pointReach && (!closest || distance < closest.distance)) {
          return { point, distance };
        }
        return closest;
      }, null);
      if (closestPoint) {
        if (quickDeleteModifier) return null;
        const world = tapePointWorld(state, closestPoint.point);
        return { x: world.x, y: world.y, z: world.z, pointId: closestPoint.point.id, attachment: closestPoint.point.attachment };
      }

      // A reference point catches the pointer like a measuring point does (#334): mark the middle of a circle
      // or of a line, then measure from there.
      if (notesVisibleRef.current) {
        const closestReference = nearestReferenceOnScreen(
          referencePoints(notesRef.current),
          (point) => projectToScreen(new THREE.Vector3(point.x, point.y, point.z), state),
          { x: localX, y: localY },
          referenceReach,
        );
        if (closestReference) {
          const { x, y, z } = closestReference;
          const existing = model.points.find((point) => !point.attachment && Math.hypot(point.x - x, point.y - y, point.z - z) < 0.001);
          return { x, y, z, pointId: existing?.id };
        }
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
          if (distance <= lineReach && (!closest || distance < closest.distance)) {
            let world = worldPoints[index].clone().lerp(worldPoints[index + 1], amount);
            if (startWorld) {
              const foot = perpendicularFootOnSegment(startWorld, worldPoints[index], worldPoints[index + 1]);
              if (foot) {
                const footScreen = projectToScreen(foot.point, state);
                if (Math.hypot(localX - footScreen.x, localY - footScreen.y) <= perpReach || shiftKey) {
                  world = foot.point;
                }
              }
            }
            closest = { world, distance };
          }
        }
        return closest;
      }, null);

      if (closestSegment) {
        if (quickDeleteModifier) return null;
        const existing = model.points.find((point) => tapePointWorld(state, point).distanceTo(closestSegment.world) < 0.001);
        return { x: closestSegment.world.x, y: closestSegment.world.y, z: closestSegment.world.z, pointId: existing?.id };
      }

      const selectedShapeIds = selectedIdsRef.current.filter((id) => shapesRef.current.some((shape) => shape.id === id && !shape.hidden));
      const targetShapeIds = selectedShapeIds.length > 0 ? selectedShapeIds : shapesRef.current.filter((shape) => !shape.hidden).map((shape) => shape.id);
      const modelCandidate = pickModelTapeCandidate(state, targetShapeIds, clientX, clientY, startWorld, startNormal, shiftKey);
      if (modelCandidate) {
        if (!modelCandidate.edge) return modelCandidate;
        const measuresWholeEdge = wholeEdges && !activeStartPoint && !ignoredPointId;
        const onEdge = { ...modelCandidate, circleEdge: modelCandidate.edge, edge: measuresWholeEdge ? modelCandidate.edge : undefined };
        // With whole edges off (or when placing the second point of a measurement) the edge is only where a
        // point goes. On a circle it goes on the true circle, not on a side of the polygon the edge is drawn
        // as, so that a diameter or radial distance measures exactly.
        if (!measuresWholeEdge && modelCandidate.attachment?.kind === "edge") {
          const circle = circleOfEdgePoints(tapeEdgeWorldPoints(state, modelCandidate.edge));
          if (circle) {
            const placed = pointOnCircle(circle, new THREE.Vector3(modelCandidate.x, modelCandidate.y, modelCandidate.z));
            const attachment = tapeAttachmentFromWorld(state, modelCandidate.edge.shapeId, placed, "edge");
            if (attachment) return { ...onEdge, x: placed.x, y: placed.y, z: placed.z, attachment };
          }
        }
        return onEdge;
      }

      const raw = toRawPlanePoint(clientX, clientY, state.dragPlane);
      if (!raw) return null;
      const step = snapStep(snapRef.current);
      const bounds = workspaceRef.current;
      let snapped = {
        x: clamp(snapValue(raw.x, step), -bounds.width / 2, bounds.width / 2),
        y: 0,
        z: clamp(snapValue(raw.z, step), -bounds.depth / 2, bounds.depth / 2),
      };
      if (shiftKey && startWorld) {
        const locked = axisLockedPoint(startWorld, new THREE.Vector3(snapped.x, 0, snapped.z), new THREE.Vector3(0, 1, 0));
        snapped = {
          x: clamp(locked.x, -bounds.width / 2, bounds.width / 2),
          y: 0,
          z: clamp(locked.z, -bounds.depth / 2, bounds.depth / 2),
        };
      }
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
          const segments = duplicate ? current.segments : [...current.segments, { id: `tape-segment-${++tapeIdRef.current}`, startId: start.id, endId: end.id, edge: candidate.edge }];
          storeTapeModel({ points, segments, startPointId: null, startEdge: null, startNormal: null, hover: null });
          return;
        }
      }

      const existing = findExisting(candidate);
      const point = existing ?? makePoint(candidate);
      const points = existing ? current.points : [...current.points, point];
      if (!current.startPointId) {
        storeTapeModel({
          ...current,
          points,
          startPointId: point.id,
          startEdge: candidate.circleEdge ?? null,
          startNormal: candidate.surfaceNormal ?? null,
          hover: { x: point.x, y: point.y, z: point.z, attachment: point.attachment },
        });
        // A first point a little off the middle gives a slanted line; Shift keeps it straight (#589),
        // which nobody finds by chance (#963). Said once per visit, at the moment it helps.
        if (!tapeShiftHintShownRef.current) {
          tapeShiftHintShownRef.current = true;
          onNotice?.(t("status.tapeShiftHint"));
        }
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
      storeTapeModel({ points, segments, startPointId: null, startEdge: null, startNormal: null, hover: null });
    },
    [onNotice, storeTapeModel],
  );

  const updateTapeHover = useCallback(
    (clientX: number, clientY: number, altKey = false, shiftKey = false, quickDeleteModifier = false) => {
      if (!tapeModeRef.current) {
        return;
      }
      const candidate = resolveTapeCandidate(
        clientX,
        clientY,
        undefined,
        tapeWholeEdgesRef.current !== altKey,
        shiftKey,
        quickDeleteModifier,
      );
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

  useEffect(() => {
    if (!tapeMode) return;
    const syncModifier = (event: KeyboardEvent) => {
      if (event.key !== "Shift" && event.key !== "Control" && event.key !== "Meta" && event.key !== "Alt") return;
      const quickDelete = event.shiftKey || event.ctrlKey || event.metaKey;
      setTapeQuickDelete((current) => (current === quickDelete ? current : quickDelete));
      const last = lastTapePointerRef.current;
      if (last) {
        updateTapeHover(last.clientX, last.clientY, event.altKey, event.shiftKey, quickDelete);
      }
    };
    const clearModifier = () => setTapeQuickDelete(false);
    window.addEventListener("keydown", syncModifier);
    window.addEventListener("keyup", syncModifier);
    window.addEventListener("blur", clearModifier);
    return () => {
      window.removeEventListener("keydown", syncModifier);
      window.removeEventListener("keyup", syncModifier);
      window.removeEventListener("blur", clearModifier);
    };
  }, [tapeMode, updateTapeHover]);

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
      const removedStart = current.startPointId === pointId;
      storeTapeModel({
        ...current,
        points,
        segments,
        startPointId: removedStart ? null : current.startPointId,
        startEdge: removedStart ? null : current.startEdge,
        startNormal: removedStart ? null : current.startNormal,
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
    // Dashed whenever the frame takes what it touches and the direction or Alt makes that a choice.
    setMarqueeTouching((workspaceRef.current.frameByDirection || marquee.reverse) && marqueeMode(workspaceRef.current.frameByDirection, marquee.startX, marquee.currentX, marquee.reverse) === "touch");
    const left = Math.min(marquee.startX, marquee.currentX);
    const top = Math.min(marquee.startY, marquee.currentY);
    setMarqueeRect({
      left,
      top,
      width: Math.abs(marquee.currentX - marquee.startX),
      height: Math.abs(marquee.currentY - marquee.startY),
    });
  }, []);

  const shapesInMarquee = useCallback((rect: { left: number; top: number; right: number; bottom: number }, enclose = false) => {
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
        if (enclose) return boundsInsideRect(bounds, rect);
        // The frame only says where the body could be. A spool's bore or the
        // gap between the parts of a group is inside it and still empty.
        return shapeGeometryTouchesScreenRect(state, shape.id, rect) ?? true;
      })
      .map((shape) => shape.id);
  }, []);

  // Alt on the lift arrow: the shapes go up as the preview of a copy, these stand-ins hold the place
  // they never leave (as in a sideways Alt drag), and the copy is made where they are let go (#865).
  const beginLiftDuplicate = useCallback((state: ThreeState, ids: string[]): { standIns: THREE.Object3D[] } | undefined => {
    if (!onDuplicateShapesMoved) return undefined;
    return {
      standIns: ids.flatMap((id) => {
        const visual = findShapeObject(state, id);
        if (!visual?.parent) return [];
        const standIn = visual.clone();
        standIn.traverse((child) => {
          child.userData = {};
        });
        standIn.name = "DuplicateDragStandIn";
        visual.parent.add(standIn);
        return [standIn];
      }),
    };
  }, [onDuplicateShapesMoved]);

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
      const liftOffset = kind === "lift" ? liftHandleOffset(lift.height) * (handlesLowerSide ? -1 : 1) : 0;
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
        duplicate: kind === "lift" && event.altKey && state ? beginLiftDuplicate(state, frame.ids) : undefined,
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
    [beginLiftDuplicate, clearMoveDimensions, onInteractionActiveChange, rememberResizeAnchor, toRawPlanePoint],
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
        // The face you drag lands on the grid of the workplane; a tilted selection keeps the step from where it started.
        const startLift = liftGeometryForFrame(transform.selectionFrame, placementWorkplaneRef.current);
        const upright = transform.selectionFrame.yAxis.clone().normalize().dot(startLift.axis) > 0.9999;
        // Dragged past the other face the height goes negative: the body then stands on the other side of
        // that face, which stays where it is (resizeShapeAlongFrameNormal).
        const snappedHeight = upright
          ? heightWithFaceOnGrid(startLift.low, transform.selectionFrame.height, rawFrameHeight, resizingFromBottom, step)
          : transform.selectionFrame.height + snapValue(rawFrameHeight - transform.selectionFrame.height, step);
        const nextFrameHeight = clamp(
          Math.abs(snappedHeight) < MIN_SHAPE_SIZE ? MIN_SHAPE_SIZE : snappedHeight,
          -maxHeight,
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
        // The bottom lands on the grid of the workplane, not a step from where it stood.
        const delta = liftDeltaOnGrid(liftGeometryForFrame(transform.selectionFrame, placementWorkplaneRef.current).low, rawDelta, step);
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
        if (state && !transform.duplicate && moveDimensionsEnabledRef.current) {
          const session = moveDimensionSessionRef.current?.lift
            ? moveDimensionSessionRef.current
            : (moveDimensionSessionRef.current = liftMoveDimensionSession(state, transform, axis));
          if (session.lift) session.lift.delta = delta;
          session.active = true;
          syncMoveDimensionOverlay(
            state,
            session,
            moveDimensionOverlayRef,
            setMoveDimensionOverlay,
            workspaceRef.current.accuracy,
            resolvedThemeRef.current,
          );
        }
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
          fine: shiftKey && insideSnapWheel,
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
          // A group turns rigidly (#763): no grid snap and no workplane limit on the
          // centres, or the bodies near the edge stop while the rest keep going.
          patch.x = nextCenter.x;
          patch.z = nextCenter.z;
          patch.elevation = clamp(nextCenter.y - item.startShape.height / 2, MIN_ELEVATION, MAX_ELEVATION);
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

  /** After a lift the way stays shown at the body and can be typed; a lift that went nowhere shows none. */
  const settleLiftMoveDimension = useCallback(() => {
    const session = moveDimensionSessionRef.current;
    if (session?.lift && Math.abs(session.lift.delta) > 1e-9) {
      session.active = false;
    } else {
      clearMoveDimensions();
    }
    if (threeRef.current) {
      syncMoveDimensionOverlay(
        threeRef.current,
        moveDimensionSessionRef.current,
        moveDimensionOverlayRef,
        setMoveDimensionOverlay,
        workspaceRef.current.accuracy,
        resolvedThemeRef.current,
      );
    }
  }, [clearMoveDimensions]);

  const finishTransform = useCallback((event: ReactPointerEvent<Element>) => {
    const transform = transformRef.current;
    if (!transform) {
      return;
    }
    if (event.currentTarget.hasPointerCapture(transform.pointerId)) {
      event.currentTarget.releasePointerCapture(transform.pointerId);
    }
    const bakeRotatedShapes = transform.kind === "rotate" && transform.hasMoved ? transform.ids : [];
    if (transform.duplicate) {
      transform.duplicate.standIns.forEach((standIn) => standIn.removeFromParent());
      const first = transform.items[0];
      const moved = first ? shapesRef.current.find((entry) => entry.id === first.id) : undefined;
      if (first && moved) {
        const delta = {
          dx: moved.x - first.startShape.x,
          dz: moved.z - first.startShape.z,
          delevation: (moved.elevation ?? 0) - (first.startShape.elevation ?? 0),
        };
        // The shapes stood in for their copies; put them back where they were.
        transform.items.forEach((item) => {
          onUpdateShape(item.id, { x: item.startShape.x, z: item.startShape.z, elevation: item.startShape.elevation ?? 0 });
        });
        if (delta.dx !== 0 || delta.dz !== 0 || delta.delevation !== 0) {
          onDuplicateShapesMoved?.(transform.ids, delta);
        }
      }
    }
    if (transform.kind === "lift") {
      setPinnedMeasureKey(getElevationMeasureKey(transformOverlayRef.current));
      settleLiftMoveDimension();
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
  }, [onDuplicateShapesMoved, onInteractionActiveChange, onUpdateShape, settleLiftMoveDimension, suppressCornerEditAfterDrag, suppressLiftEditAfterDrag]);

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

  // Whether the framing square counts this size to the middle of the body: typing it then grows the body to both sides.
  const rulerCountsToMiddle = useCallback((axis: string) => {
    const ruler = cornerRulerModelRef.current[0];
    const modes = cornerRulerAxisModes(ruler?.mode, ruler?.axisModes);
    return (axis === "width" ? modes.x : axis === "depth" ? modes.z : axis === "height" ? modes.elevation : "endpoint") === "midpoint";
  }, []);

  // The calculation the lone selected body's height above the plate was set from (#180), if it still holds.
  const elevationFormulaFor = useCallback((elevation: number): string | undefined => {
    if (selectedIdsRef.current.length !== 1) return undefined;
    const shape = shapesRef.current.find((entry) => entry.id === selectedIdsRef.current[0]);
    const formula = shape?.formulas?.[DIMENSION_FORMULA_FIELDS.elevation];
    return formulaMatchesMillimeters(formula, elevation, parseMeasureMm) ? formula : undefined;
  }, []);

  const beginDimensionEdit = useCallback((mark: DimensionMark) => {
    const id = selectedIdsRef.current[0];
    const isCornerRulerMidpoint = rulerCountsToMiddle(mark.axis);
    if (id && (mark.axis === "width" || mark.axis === "depth" || mark.axis === "height") && !isCornerRulerMidpoint) {
      rememberResizeAnchor(id, mark.axis === "height" ? "height" : "scale", mark.handleKey);
    } else {
      lastResizeAnchorRef.current = null;
    }
    setPinnedMeasureKey(mark.handleKey);
    // The height above the plate, shown with the other sizes (#979), keeps its calculation as the arrow's box does.
    const formula = mark.axis === "elevation" ? elevationFormulaFor(parseMeasureMm(mark.label)) : formulaForDimensionMark(mark);
    setEditingDimension({ key: mark.key, axis: mark.axis, x: mark.labelX, y: mark.labelY, value: formula ?? mark.label });
  }, [elevationFormulaFor, formulaForDimensionMark, rememberResizeAnchor]);

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
  const dimensionSizePatchFor = useCallback((shape: WorkplaneShape, markAxis: "width" | "depth" | "height", text: string, keepProportions = false): Partial<WorkplaneShape> | null => {
    // The other two measures follow before the held edge is applied, in the order the properties panel uses (#899).
    const kept = (patch: Partial<WorkplaneShape>, axis: "width" | "depth" | "height") => (keepProportions ? patchWithKeptProportions(shape, patch, axis) : patch);
    const sizeFrame = selectionFrameForShapes([shape], [shape.id]);
    // The mark counts along the workplane the box on screen was drawn in; the shape's fields along its own sides (#419).
    const markFrame = selectionFrameForShapes([shape], [shape.id], placementWorkplaneRef.current);
    const ownSide = markFrame && sizeFrame ? ownSideForMark(markFrame, sizeFrame, markAxis) : null;
    const axis: "width" | "depth" | "height" = ownSide?.axis ?? markAxis;
    const currentExtent = axis === "width"
      ? sizeFrame?.width ?? shapeWidth(shape)
      : axis === "depth"
        ? sizeFrame?.depth ?? shapeDepth(shape)
        : sizeFrame?.height ?? shape.height;
    const value = resolveMeasureMm(text, currentExtent);
    if (!(Number.isFinite(value) && value > 0)) return null;
    const isCornerRulerMidpoint = rulerCountsToMiddle(markAxis);
    const customLimit = workspaceRef.current.shapeCustomizations[shape.kind]?.maxDimension;
    const nextValue = Math.min(customLimit ?? Number.POSITIVE_INFINITY, Math.max(MIN_SHAPE_SIZE, value));
    const rememberedAnchor = isCornerRulerMidpoint ? null : lastResizeAnchorRef.current;
    // The held edge was pressed in the workplane's frame; the patch below reads it in the shape's own.
    const anchor = rememberedAnchor && ownSide && rememberedAnchor.shapeId === shape.id
      ? { ...rememberedAnchor, signs: ownSide.convertSigns(rememberedAnchor.signs) }
      : rememberedAnchor;
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
        if (shape.kind === "star") {
          Object.assign(patch, starSettingsForSize({ ...shape, width: shapeWidth(shape), depth: shapeDepth(shape) }, nextValue, nextValue));
        }
        return patchWithResizeAnchor(shape, kept(patch, axis), axis, anchor);
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
        return patchWithResizeAnchor(shape, kept(patch, axis), axis, anchor);
      }
    } else {
      if (isCornerRulerMidpoint) {
        const deltaY = (shape.height - nextValue) / 2;
        return {
          height: nextValue,
          elevation: cleanNearZero(clamp((shape.elevation ?? 0) + deltaY, MIN_ELEVATION, MAX_ELEVATION), 0.0005),
        };
      } else {
        return patchWithResizeAnchor(shape, kept({ height: nextValue }, axis), axis, anchor);
      }
    }
  }, []);

  const dimensionPatchFor = useCallback((shape: WorkplaneShape, axis: "width" | "depth" | "height", text: string, keepProportions = false): Partial<WorkplaneShape> | null => {
    const patch = dimensionSizePatchFor(shape, axis, text, keepProportions);
    if (!patch) return null;
    // The calculation rides along with the size it set, in the same change (#180); a plain number clears it.
    const formula = formulaToRemember(text);
    return shape.formulas || formula ? { ...patch, formulas: withFieldFormula(shape.formulas, DIMENSION_FORMULA_FIELDS[axis], formula) } : patch;
  }, [dimensionSizePatchFor]);

  // Width, depth or height typed for several bodies at once (#259). The box shows the size of the
  // whole selection, so the number sets that: every body is scaled with it, as when it is dragged.
  const applyTypedSelectionSize = useCallback((typed: { axis: "width" | "depth" | "height"; text: string }[], keepProportions = false) => {
    const ids = selectedIdsRef.current;
    const frame = selectionFrameForShapes(shapesRef.current, ids, placementWorkplaneRef.current);
    if (ids.length < 2 || !frame) return;
    // One measure with its proportions kept (#899): the other two of the selection's frame by the same factor.
    const single = keepProportions && typed.length === 1 ? typed[0] : null;
    const singleValue = single ? resolveMeasureMm(single.text, single.axis === "width" ? frame.width : single.axis === "depth" ? frame.depth : frame.height) : NaN;
    const factor = single ? singleValue / (single.axis === "width" ? frame.width : single.axis === "depth" ? frame.depth : frame.height) : NaN;
    const edits = single && Number.isFinite(factor) && factor > 0
      ? (["width", "depth", "height"] as const).map((axis) => ({ axis, text: String((axis === "width" ? frame.width : axis === "depth" ? frame.depth : frame.height) * factor) }))
      : typed;
    const items: TransformDragItem[] = frame.ids
      .map((id) => shapesRef.current.find((entry) => entry.id === id))
      .filter((entry): entry is WorkplaneShape => Boolean(entry))
      .map((entry) => ({ id: entry.id, startShape: { ...entry }, startCenter: shapeCenter(entry), startQuaternion: quaternionForShape(entry) }));
    const anchor = lastResizeAnchorRef.current?.shapeId === ids[0] ? lastResizeAnchorRef.current : null;
    const workspace = workspaceRef.current;
    const across = Math.max(frame.width, frame.depth, frame.height);
    const maxSize = Math.max(...items.map((item) => handleDimensionLimit(workspace, item.startShape.kind, 260, "across", across)));
    const sizes: { width?: number; depth?: number } = {};
    let height: number | undefined;
    edits.forEach((entry) => {
      const extent = entry.axis === "width" ? frame.width : entry.axis === "depth" ? frame.depth : frame.height;
      const value = resolveMeasureMm(entry.text, extent);
      if (!(Number.isFinite(value) && value > 0)) return;
      if (entry.axis === "height") {
        const printerHeight = printerPresetById(workspace.printer)?.height;
        const maxHeight = Math.max(...items.map((item) => handleDimensionLimit(workspace, item.startShape.kind, 180, "height", frame.height, printerHeight)));
        height = clamp(value, MIN_SHAPE_SIZE, maxHeight);
      } else {
        sizes[entry.axis] = clamp(value, MIN_SHAPE_SIZE, maxSize);
      }
    });
    const patches: { id: string; patch: Partial<WorkplaneShape> }[] = [];
    if (sizes.width !== undefined || sizes.depth !== undefined) {
      const signs = anchor?.signs ?? { x: 0, z: 0 };
      patches.push(...resizeSelectionToSizes(frame, items, sizes, signs, maxSize));
    }
    if (height !== undefined) {
      const fromBottom = anchor?.pressedY === "bottom";
      items.forEach((item) => patches.push({ id: item.id, patch: resizeShapeAlongFrameNormal(item.startShape, frame, height as number, fromBottom) }));
    }
    // One change for all of them: outside an interaction each update starts from the shapes as they
    // were, so the second body's patch would overwrite the first's.
    onInteractionActiveChange?.(true);
    patches.forEach(({ id, patch }) => onUpdateShape(id, patch));
    onInteractionActiveChange?.(false);
  }, [onInteractionActiveChange, onUpdateShape]);

  const commitDimensionEdit = useCallback((aroundCenter = false, proportional = false) => {
    // Alt+Enter (#327): no edge is held, so the shape grows round its middle.
    if (aroundCenter) lastResizeAnchorRef.current = null;
    // With Keep proportions ticked, or with Shift+Enter, the other two measures follow, as in the properties
    // panel and as Shift does when a corner is dragged; the box on the body passed the one measure alone (#899).
    const keepProportions = proportional || proportionLockRef.current;
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
        // One change for all bodies, or each update would start from the shapes as they were (#259).
        onInteractionActiveChange?.(true);
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
        onInteractionActiveChange?.(false);
      }
      setEditingDimension(null);
      setPinnedMeasureKey(null);
      return;
    }
    if (selectedIdsRef.current.length > 1) {
      applyTypedSelectionSize([{ axis: edit.axis, text: edit.value }], keepProportions);
    } else {
      const patch = dimensionPatchFor(shape, edit.axis, edit.value, keepProportions);
      if (patch) onUpdateShape(id, patch);
    }
    setEditingDimension(null);
    setPinnedMeasureKey(null);
  }, [applyTypedSelectionSize, dimensionPatchFor, editingDimension, onInteractionActiveChange, onUpdateShape]);

  /**
   * Tab in a dimension box (#300): the value is kept and the next box opens - width, depth, height, and round
   * again; Shift goes back. The next one opens when the body has its new size and the marks stand in their new
   * places. A box of another kind (the height above the plate) just keeps its value.
   */
  const tabDimensionEdit = useCallback((backwards: boolean) => {
    const order = ["width", "depth", "height"] as const;
    const current = editingDimension?.axis;
    const index = order.findIndex((axis) => axis === current);
    commitDimensionEdit();
    if (index < 0) return;
    const next = order[(index + (backwards ? order.length - 1 : 1)) % order.length];
    window.setTimeout(() => {
      const marks = Object.values(transformOverlayRef.current?.dimensions ?? {}).flat();
      const mark = marks.find((entry) => entry.axis === next);
      if (mark) beginDimensionEdit(mark);
    }, 60);
  }, [beginDimensionEdit, commitDimensionEdit, editingDimension?.axis]);

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

  const commitCornerEdit = useCallback((aroundCenter = false) => {
    if (aroundCenter) lastResizeAnchorRef.current = null;
    const edit = editingCorner;
    const shape = shapesRef.current.find((entry) => entry.id === selectedIdsRef.current[0]);
    setEditingCorner(null);
    setPinnedMeasureKey(null);
    if (!edit || !shape) return;
    if (selectedIdsRef.current.length > 1) {
      applyTypedSelectionSize(edit.entries.filter((entry) => entry.value.trim() !== entry.original).map((entry) => ({ axis: entry.axis, text: entry.value })));
      return;
    }
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
  }, [applyTypedSelectionSize, dimensionPatchFor, editingCorner, onUpdateShape]);

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

  // The same for a single dimension box (#486): a left click on the empty plate takes the selection away,
  // and with it the box, before it could ever lose its focus - the typed value was thrown away, while a
  // right click, which selects nothing, applied it. Any press outside the box applies it first.
  useEffect(() => {
    if (!editingDimension) return;
    const applyOnOutsidePress = (event: PointerEvent) => {
      if ((event.target as HTMLElement | null)?.closest?.(".dimension-input")) return;
      commitDimensionEdit();
    };
    window.addEventListener("pointerdown", applyOnOutsidePress, true);
    return () => window.removeEventListener("pointerdown", applyOnOutsidePress, true);
  }, [commitDimensionEdit, editingDimension]);

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

  // The angle box too (#486): a press outside applies the typed value before the selection can go.
  useEffect(() => {
    if (!editingRotation) return;
    const applyOnOutsidePress = (event: PointerEvent) => {
      if ((event.target as HTMLElement | null)?.closest?.(".rotation-edit")) return;
      commitRotationEdit();
    };
    window.addEventListener("pointerdown", applyOnOutsidePress, true);
    return () => window.removeEventListener("pointerdown", applyOnOutsidePress, true);
  }, [commitRotationEdit, editingRotation]);

  const cancelRotationEdit = useCallback(() => {
    setEditingRotation(null);
    setEditingCorner(null);
    setActiveRotationWheel(false);
  }, []);

  const pickShape = useCallback((clientX: number, clientY: number, pointerType = "mouse") => {
    const state = threeRef.current;
    return state ? pickShapeAt(state, shapesRef.current, clientX, clientY, pointerType, selectedIdsRef.current) : null;
  }, []);
  const shapeStackAt = useCallback((clientX: number, clientY: number) => {
    const state = threeRef.current;
    return state ? shapesUnderPointer(state, shapesRef.current, clientX, clientY) : [];
  }, []);
  // The right-click menu offers a reference point in the middle of the flat face it lands on (#881).
  const faceCentreAt = useCallback((clientX: number, clientY: number, shapeId: string | null) => {
    const state = threeRef.current;
    const facePoint = state && shapeId ? pickFaceCentre(state, clientX, clientY) : null;
    return facePoint ? { facePoint } : {};
  }, []);
  const highlightKey = highlightIds?.join("\0") ?? "";
  useEffect(() => {
    const state = threeRef.current;
    if (!state) return;
    syncPickHighlight(state, highlightKey ? highlightKey.split("\0") : [], "menu-pick-highlight");
  }, [highlightKey, shapes]);
  const pickOnlyPointer = usePickOnlyPointer(pickOnly, pickShape);
  useViewportKeyboardHooks(threeRef);
  const pickOnlyKey = pickOnly ? pickOnly.ids.join("\0") : null;
  useEffect(() => {
    const state = threeRef.current;
    if (!state) return;
    rebuildShapes(state, shapesRef.current, shapeOutlineIds(), modifierActiveRef.current, placementWorkplaneRef.current);
    // After the bodies: moving to another state rebuilds them, and the marking follows.
    syncHistoryPickHighlight(state, pickOnlyRef.current?.ids ?? []);
  }, [pickOnlyKey, shapeOutlineIds, shapes]);

  /** `faceCentre`: "always" puts the point in the middle of the face hit, "near" only when the pointer is close to it (#823). */
  const pickPlacementSurface = useCallback((clientX: number, clientY: number, reverse: boolean, skip?: ReadonlySet<string>, faceCentre: "always" | "near" | false = false) => {
    const state = threeRef.current;
    if (!state) return null;
    const rect = aimPickRay(state, clientX, clientY, RENDER_LAYER_SHAPES);

    // A reference image (#680) is a guide lying on the plate or a face: shapes and the workplane land on what is under it.
    const images = shapesRef.current.filter((shape) => shape.imagePlate).map((shape) => shape.id);
    const passed = images.length ? new Set([...(skip ?? []), ...images]) : skip;
    const hit = firstShapeHit(state, { needsFace: true, skip: passed });
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
    // A shape dropped from the shape list goes to the middle of the face it was dropped on; one
    // placed by click snaps there within the inner third of the face, a corner or edge winning (#823).
    let centre: THREE.Vector3 | null = null;
    if (faceCentre && hit.faceIndex !== undefined && hit.faceIndex !== null && (faceCentre === "always" || !feature)) {
      let cache = surface.userData.faceCentres as { geometry: THREE.BufferGeometry; byTriangle: Map<number, ReturnType<typeof planarFaceCentre>> } | undefined;
      if (!cache || cache.geometry !== surface.geometry) {
        cache = { geometry: surface.geometry, byTriangle: new Map() };
        surface.userData.faceCentres = cache;
      }
      if (!cache.byTriangle.has(hit.faceIndex)) {
        // While a shape follows the pointer, a big mesh is not searched on every move.
        cache.byTriangle.set(hit.faceIndex, planarFaceCentre(position.array, surface.geometry.index?.array ?? null, hit.faceIndex, faceCentre === "always" ? 200_000 : 50_000));
      }
      const face = cache.byTriangle.get(hit.faceIndex);
      if (face) {
        const world = new THREE.Vector3(...face.centre).applyMatrix4(surface.matrixWorld);
        const reach = world.distanceTo(new THREE.Vector3(...face.farthest).applyMatrix4(surface.matrixWorld));
        if (faceCentre === "always" || world.distanceTo(hit.point) <= reach / 3) centre = world;
      }
    }
    const featurePoint = centre
      ? centre
      : feature?.kind === "vertex"
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
    aimPickRay(state, clientX, clientY, RENDER_LAYER_SHAPES);
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
    // The tape measure takes a reference point as a measuring point; the pin sits right on the point and would catch the click (#334).
    const pinned = notesRef.current.find((candidate) => candidate.id === noteId);
    if (tapeModeRef.current && !tapeMoveModeRef.current && !tapeDeleteModeRef.current && pinned?.kind === "point" && event.button === 0) {
      event.preventDefault();
      // The click that follows must not fold the point's card open.
      noteClickSuppressedRef.current = noteId;
      selectTapeCandidate({ x: pinned.x, y: pinned.y, z: pinned.z });
      return;
    }
    noteDragRef.current = { noteId, pointerId: event.pointerId, moved: false };
    capturePointer(event.currentTarget, event.pointerId);
  }, [selectTapeCandidate]);

  /**
   * Where a dragged reference point snaps (#799): to a corner of a body's box, the middle of one of its edges
   * or faces, a real corner of its mesh or another point - the nearest within reach on the screen - and
   * otherwise onto an edge line near the pointer. Null when nothing is that close: the point then stays
   * under the pointer.
   */
  const snapDraggedPoint = useCallback((clientX: number, clientY: number, noteId: string): ReferencePosition | null => {
    const state = threeRef.current;
    if (!state) return null;
    const rect = state.renderer.domElement.getBoundingClientRect();
    const visible = shapesRef.current.filter((shape) => !shape.hidden && !isNonSolidShape(shape));
    const spots = visible.flatMap((shape) => boxSnapSpots(shapeBoxCornersWorld(shape)));
    const tape = visible.length ? pickModelTapeCandidate(state, visible.map((shape) => shape.id), clientX, clientY) : null;
    if (tape?.attachment?.kind === "vertex") spots.push({ x: tape.x, y: tape.y, z: tape.z });
    referencePoints(notesRef.current).forEach((point) => {
      if (point.id !== noteId) spots.push({ x: point.x, y: point.y, z: point.z });
    });
    const nearest = nearestReferenceOnScreen(
      spots,
      (point) => projectToScreen(new THREE.Vector3(point.x, point.y, point.z), state),
      { x: clientX - rect.left, y: clientY - rect.top },
      pointerReach(10),
    );
    if (nearest) return nearest;
    return tape?.attachment?.kind === "edge" ? { x: tape.x, y: tape.y, z: tape.z } : null;
  }, []);

  const handleNotePinPointerMove = useCallback((event: ReactPointerEvent<HTMLButtonElement>, noteId: string) => {
    const drag = noteDragRef.current;
    if (!drag || drag.noteId !== noteId || drag.pointerId !== event.pointerId) return;
    event.stopPropagation();
    const anchor = resolveNoteAnchor(event.clientX, event.clientY);
    if (!anchor) return;
    drag.moved = true;
    // A reference point goes where it is dropped and never sticks to a body; on the way it snaps, Alt held lets it go free.
    const isPoint = notesRef.current.find((candidate) => candidate.id === noteId)?.kind === "point";
    if (isPoint) {
      const snapped = event.altKey ? null : snapDraggedPoint(event.clientX, event.clientY, noteId);
      onNoteUpdate?.(noteId, snapped ?? { x: anchor.x, y: anchor.y, z: anchor.z }, true);
      return;
    }
    onNoteUpdate?.(noteId, { x: anchor.x, y: anchor.y, z: anchor.z, anchor: anchor.anchor }, true);
  }, [onNoteUpdate, resolveNoteAnchor, snapDraggedPoint]);

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
    // The design keeps where the square stands (#829), beside it in the browser and in its .lyl file.
    writeCornerRulers(projectIdRef.current, next);
    if (toolMemory) {
      toolMemory.current.cornerRulers = next;
      toolMemory.current.cornerRulerId = cornerRulerIdRef.current;
    }
    if (threeRef.current) {
      syncCornerRulerToolOverlay(threeRef.current, next, shapesRef.current, selectedIdsRef.current, cornerRulerOverlayRef, setCornerRulerOverlay, workspaceRef.current.accuracy);
      threeRef.current.needsRender = true;
    }
  }, [toolMemory]);

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
      const visible = shapesRef.current.filter((shape) => !shape.hidden && !isNonSolidShape(shape));
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
    const existingAxisModes = cornerRulerModelRef.current[0]?.axisModes;
    const stayInView = cornerRulerModelRef.current[0]?.occlude === false;
    const measuresOfSelection = cornerRulerModelRef.current[0]?.selectedOnly === true;
    const instance: CornerRulerInstance = {
      id: `corner-ruler-${++cornerRulerIdRef.current}`,
      corner: point,
      workplane,
      frame: cornerRulerFrameForWorkplane(workplane),
      armLengthX: CORNER_RULER_DEFAULT_ARM_X,
      armLengthZ: CORNER_RULER_DEFAULT_ARM_Z,
      mode: existingMode,
      ...(existingAxisModes ? { axisModes: existingAxisModes } : {}),
      ...(stayInView ? { occlude: false } : {}),
      ...(measuresOfSelection ? { selectedOnly: true } : {}),
    };
    storeCornerRulerModel([instance]);
  }, [storeCornerRulerModel]);

  const toggleCornerRulerMode = useCallback((id: string) => {
    storeCornerRulerModel(
      cornerRulerModelRef.current.map((ruler) => {
        if (ruler.id !== id) return ruler;
        const { axisModes: _single, ...rest } = ruler;
        return { ...rest, ...toggledCornerRulerMode(ruler.mode, ruler.axisModes) };
      })
    );
  }, [storeCornerRulerModel]);

  // Whether a body in front hides the ruler's lines, or the ruler stays in view over everything.
  const toggleCornerRulerOcclude = useCallback((id: string) => {
    storeCornerRulerModel(
      cornerRulerModelRef.current.map((ruler) => {
        if (ruler.id !== id) return ruler;
        const { occlude: _was, ...rest } = ruler;
        return ruler.occlude === false ? rest : { ...rest, occlude: false };
      })
    );
  }, [storeCornerRulerModel]);

  // Whether the bodies at the arms show their measures without being selected (#831).
  const toggleCornerRulerSelectedOnly = useCallback((id: string) => {
    storeCornerRulerModel(
      cornerRulerModelRef.current.map((ruler) => {
        if (ruler.id !== id) return ruler;
        const { selectedOnly: _was, ...rest } = ruler;
        return ruler.selectedOnly === true ? rest : { ...rest, selectedOnly: true };
      })
    );
  }, [storeCornerRulerModel]);

  // One of the three green numbers counts to the edge or the middle on its own.
  const toggleCornerRulerAxisMode = useCallback((id: string, axis: CornerRulerAxis) => {
    storeCornerRulerModel(
      cornerRulerModelRef.current.map((ruler) => {
        if (ruler.id !== id) return ruler;
        const { axisModes: _single, ...rest } = ruler;
        const toggled = toggledCornerRulerAxis(ruler.mode, ruler.axisModes, axis);
        return { ...rest, mode: toggled.mode, ...(toggled.axisModes ? { axisModes: toggled.axisModes } : {}) };
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
      axisModes: ruler.axisModes,
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

  // A typed length moves the body at one end of a measurement along the measured line, until the
  // distance is the typed one; the points stay on the body, so the measurement follows (#823). A
  // negative length takes it that far past the other point, from the edge of a box to inside it (#963).
  const beginTapeLengthEdit = useCallback((segmentId: string) => {
    const state = threeRef.current;
    const segment = tapeOverlayRef.current?.segments.find((entry) => entry.id === segmentId);
    if (!state || !segment) return;
    const [start, end] = tapeSegmentWorldPoints(state, tapeModelRef.current, segmentId);
    if (!start || !end) return;
    setTapeLengthEditing({ segmentId, x: segment.labelX, y: segment.labelY, value: formatMeasure(start.distanceTo(end), workspaceRef.current.accuracy) });
  }, []);

  const commitTapeLengthEdit = useCallback(() => {
    const edit = tapeLengthEditing;
    setTapeLengthEditing(null);
    const state = threeRef.current;
    if (!edit || !state) return;
    const value = parseMeasureMm(edit.value);
    const shapeId = tapeMovableShapeId(tapeModelRef.current, edit.segmentId, selectedIdsRef.current);
    const shape = shapeId ? shapesRef.current.find((entry) => entry.id === shapeId) : undefined;
    const [start, end] = tapeSegmentWorldPoints(state, tapeModelRef.current, edit.segmentId);
    if (!shape || !start || !end || !Number.isFinite(value)) return;
    const segment = tapeModelRef.current.segments.find((entry) => entry.id === edit.segmentId);
    const movesEnd = tapeModelRef.current.points.find((point) => point.id === segment?.endId)?.attachment?.shapeId === shape.id;
    const shift = tapeLengthShift(start, end, value, movesEnd);
    if (!shift) return;
    onInteractionActiveChange?.(true);
    onUpdateShape(shape.id, {
      ...(Math.abs(shift.x) > 1e-9 ? { x: cleanNearZero(shape.x + shift.x, 0.0005) } : {}),
      ...(Math.abs(shift.z) > 1e-9 ? { z: cleanNearZero(shape.z + shift.z, 0.0005) } : {}),
      ...(Math.abs(shift.y) > 1e-9 ? { elevation: cleanNearZero(clamp((shape.elevation ?? 0) + shift.y, MIN_ELEVATION, MAX_ELEVATION), 0.0005) } : {}),
    });
    onInteractionActiveChange?.(false);
  }, [onInteractionActiveChange, onUpdateShape, tapeLengthEditing]);

  // The number belongs to the selected bodies: when they are no longer all selected (a click on empty space that
  // leaves the field its focus), the open field goes with them instead of staying in the view (#614).
  useEffect(() => {
    if (!rulerCoordinateEditing) return;
    const selected = new Set(selectedIds);
    if (!rulerCoordinateEditing.shapeIds.every((id) => selected.has(id))) setRulerCoordinateEditing(null);
  }, [rulerCoordinateEditing, selectedIds]);

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

  /** Der Griff ist immer direkt ziehbar, ohne eigenen Verschieben-Modus - wie bei einer Notiz-Nadel, nicht wie beim Massband (das mehrere Punkte je Strecke verwaltet und deshalb einen Modus braucht). Ein Klick ohne Zug dreht die Instanz um 90 Grad - wie in similar tools. */
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
    const options = modifierEdgePickOptionsRef.current;
    return pickModifierEdgeFromScreen(state, modifierEdgesRef.current, clientX, clientY, options.onlyVisible ? new Set(options.alwaysIds) : null);
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

    aimPickRay(state, clientX, clientY, RENDER_LAYER_HELPERS);

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

  const cancelLongPress = useCallback(() => {
    const press = longPressRef.current;
    if (!press) return;
    window.clearTimeout(press.timer);
    press.stop();
    longPressRef.current = null;
  }, []);

  const beginLongPress = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    cancelLongPress();
    if (!onShapeContextMenu || event.pointerType !== "touch") return;
    const { pointerId, clientX: x, clientY: y } = event;
    const onMove = (move: PointerEvent) => {
      if (move.pointerId === pointerId && Math.hypot(move.clientX - x, move.clientY - y) >= LONG_PRESS_SLOP_PX) cancelLongPress();
    };
    const onEnd = (end: PointerEvent) => {
      if (end.pointerId === pointerId) cancelLongPress();
    };
    window.addEventListener("pointermove", onMove, true);
    window.addEventListener("pointerup", onEnd, true);
    window.addEventListener("pointercancel", onEnd, true);
    const stop = () => {
      window.removeEventListener("pointermove", onMove, true);
      window.removeEventListener("pointerup", onEnd, true);
      window.removeEventListener("pointercancel", onEnd, true);
    };
    const timer = window.setTimeout(() => {
      if (longPressRef.current?.pointerId !== pointerId) return;
      cancelLongPress();
      // A second finger belongs to the camera.
      if (touchPointersRef.current.size !== 1) return;
      longPressFiredRef.current = pointerId;
      // The press also began moving the body it landed on. The finger lifts on the menu, so that move never
      // ends here: drop it now, or the next tap ends it and puts the body back where it was (#619).
      cancelGestureForCameraRef.current();
      const shapeId = pickShape(x, y, "touch");
      if (shapeId && !selectedIdsRef.current.includes(shapeId)) onSelectShape(shapeId);
      onShapeContextMenu({ shapeId, clientX: x, clientY: y, stackIds: shapeStackAt(x, y), ...faceCentreAt(x, y, shapeId) });
    }, LONG_PRESS_MS);
    longPressRef.current = { pointerId, timer, stop };
  }, [cancelLongPress, faceCentreAt, onSelectShape, onShapeContextMenu, pickShape, shapeStackAt]);

  useEffect(() => cancelLongPress, [cancelLongPress]);

  // A finger that lifts on an element that has gone from the page (a handle or a number that
  // vanished when the selection changed) never reports its end to the viewport. Without this the
  // list of fingers keeps it, every later touch counts as a second finger, and the camera takes
  // them all (#524). When the app leaves the foreground nothing is down any more.
  useEffect(() => {
    const clearTouches = () => {
      touchPointersRef.current.clear();
      cameraTouchRef.current = false;
    };
    const onVisibility = () => {
      if (document.visibilityState !== "visible") clearTouches();
    };
    window.addEventListener("blur", clearTouches);
    window.addEventListener("pagehide", clearTouches);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("blur", clearTouches);
      window.removeEventListener("pagehide", clearTouches);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      // A mouse or a pen never shows the button of a touch screen - Shift is there for them.
      // Locked Select multiple keeps it until its own button ends it.
      if (event.pointerType !== "touch" && !touchMultiSelectActiveRef.current) updateTouchMultiSelectVisible(false);
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
      emptyPressRef.current = null;
      // Ein Finger ist fuer den Browser die linke Taste. Ab dem zweiten gehoert
      // die Flaeche der Kamera - und solange das so ist, wird nichts
      // ausgewaehlt, auch nicht vom nachgereichten Zeigerdruck, der hier
      // wieder ankommt.
      if (event.pointerType === "touch") {
        // The first finger of a touch sequence is the primary pointer: no other finger is down
        // then, so whatever the list still holds is a finger whose end never arrived.
        if (event.isPrimary) {
          touchPointersRef.current.clear();
          cameraTouchRef.current = false;
        }
        touchPointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (touchPointersRef.current.size >= 2) {
          touchEmptyTapRef.current = null;
          cancelLongPress();
          // Two fingers belong to the camera, not to a selection.
          if (!touchMultiSelectActiveRef.current) updateTouchMultiSelectVisible(false);
        }
        if (cameraTouchRef.current) {
          if (!touchMultiSelectActiveRef.current) updateTouchMultiSelectVisible(false);
          return;
        }
        const wantsCamera = touchPointersRef.current.size >= 2 || touchRotateRef.current;
        // Wer gerade an einem Anfasser zieht, meint auch das - dann bleibt
        // alles, wie es ist.
        if (wantsCamera && !transformRef.current && !splitDragRef.current) {
          cancelGestureForCamera();
          cameraTouchRef.current = true;
          if (!touchMultiSelectActiveRef.current) updateTouchMultiSelectVisible(false);
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
        // Alt turns whole edges the other way round for this click; Shift locks to the perpendicular or axis (#589).
        const candidate = resolveTapeCandidate(
          event.clientX,
          event.clientY,
          undefined,
          tapeWholeEdgesRef.current !== event.altKey,
          event.shiftKey,
        );
        if (candidate) {
          selectTapeCandidate(candidate);
        }
        return;
      }

      if (imageCalibrationIdRef.current) {
        event.preventDefault();
        const point = pickImagePoint(state, imageCalibrationIdRef.current, event.clientX, event.clientY);
        if (point) onImageCalibrationPointRef.current?.(point);
        return;
      }

      if (pivotPickModeRef.current) {
        event.preventDefault();
        const pick = pickRotationPivot(state, event.clientX, event.clientY);
        onPivotPick?.(pick?.point ?? null, pick?.face);
        return;
      }

      if (layFlatPickModeRef.current) {
        event.preventDefault();
        onLayFlatPick?.(pickLayFlatFace(state, event.clientX, event.clientY));
        return;
      }

      if (mateFacePickRef.current) {
        event.preventDefault();
        onMateFacePick?.(pickMateFace(state, event.clientX, event.clientY));
        return;
      }

      if (cadFacePickRef.current) {
        event.preventDefault();
        const faceId = pickCadFace(state, cadFacePickRef.current, event.clientX, event.clientY);
        if (faceId !== null) onCadFacePick?.(faceId);
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
        cruiseFreeRef.current = event.altKey;
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
        const selectionHeld = selectedIdsRef.current.some((id) => shapesRef.current.find((entry) => entry.id === id)?.locked);
        if (!shape || !frame || shape.locked || selectionHeld || (!point && handle.kind !== "height" && handle.kind !== "lift" && handle.kind !== "rotate")) {
          return;
        }
        const handlesLowerSide = handle.handleKey === "bottom-height" || handle.handleKey === "lower-shape";
        const lift = liftGeometryForFrame(frame, activeWorkplane);
        const liftOffset = handle.kind === "lift" ? liftHandleOffset(lift.height) * (handlesLowerSide ? -1 : 1) : 0;
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
          duplicate: handle.kind === "lift" && event.altKey ? beginLiftDuplicate(state, frame.ids) : undefined,
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
      // A finger on a body shows the round Select multiple button; empty space takes it away,
      // unless Select multiple is locked.
      updateTouchMultiSelectVisible(
        touchMultiSelectActiveRef.current || showsTouchMultiSelect(event.pointerType, id),
      );
      // Select multiple does what Shift does, for a tablet without the key; a finger on empty space
      // still turns the view and a long press still opens the menu.
      const additive = event.shiftKey || multiSelectRef.current || touchMultiSelectActiveRef.current;
      if (event.pointerType === "touch" && !event.shiftKey) beginLongPress(event);
      if (!id && event.pointerType === "touch" && !event.shiftKey) {
        // A finger on empty space turns the view, as in Tinkercad, so a tablet needs no switch for it;
        // the selection box stays with the mouse and Shift. A tap that does not move still clears the
        // selection (finishDrag).
        touchEmptyTapRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
        cancelGestureForCamera();
        cameraTouchRef.current = true;
        handOverTouchToCamera();
        return;
      }
      if (!id && slicerLeftTurn(workspaceRef.current.mouseScheme, event) && state.turnWithLeftButton) {
        // As in Bambu Studio and OrcaSlicer, a left drag on empty space turns the view (#1013); Shift draws the box.
        event.preventDefault();
        emptyPressRef.current = { x: event.clientX, y: event.clientY };
        slicerEmptyPressRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
        state.turnWithLeftButton(event.nativeEvent);
        return;
      }
      if (!id) {
        const startX = event.clientX - rect.left;
        const startY = event.clientY - rect.top;
        event.preventDefault();
        capturePointer(event.currentTarget, event.pointerId);
        emptyPressRef.current = { x: event.clientX, y: event.clientY };
        marqueeRef.current = {
          pointerId: event.pointerId,
          startX,
          startY,
          currentX: startX,
          currentY: startY,
          additive,
          hasMoved: false,
          reverse: event.altKey,
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
      const grabWorkplane = dragWorkplaneAtGrab(state, event.clientX, event.clientY, id, activeWorkplane);
      const point = toPlacementWorkplanePoint(event.clientX, event.clientY, grabWorkplane);
      if (!shape) {
        return;
      }
      if (!point) {
        // A ray that never reaches the workplane - seen flat from the side, above the horizon - still
        // picks the shape: it is selected, though there is no point to drag it from (#269).
        event.preventDefault();
        if (additive) onSelectShape(id, "toggle");
        else if (!selectedIdsSnapshot.includes(id)) onSelectShape(id);
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
      const dragIds = alreadySelected && selectedIdsSnapshot.length > 1 ? selectedIdsSnapshot : [id];
      // One locked shape holds the whole selection still, as the handles and the arrow keys do.
      if (dragIds.some((dragId) => shapesRef.current.find((entry) => entry.id === dragId)?.locked)) {
        return;
      }
      capturePointer(event.currentTarget, event.pointerId);
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
        workplane: grabWorkplane,
        guideY: activeWorkplane.origin.y,
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
      beginLiftDuplicate,
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
      beginLongPress,
      cancelLongPress,
      updateTouchMultiSelectVisible,
    ],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      // Gehoert die Flaeche gerade der Kamera, hat hier niemand etwas zu
      // schweben oder zu ziehen - die Finger bewegen die Ansicht.
      if (cameraTouchRef.current) return;
      cruiseFreeRef.current = event.altKey;
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
        mateFaceHoverRef.current = { x: event.clientX, y: event.clientY };
        syncLayFlatHover(threeRef.current, mateFacePickRef.current.shapeIds, resolvedThemeRef.current, event.clientX, event.clientY, mateFacePickRef.current.round, mateFacePickRef.current.joined);
        return;
      }
      if (cadFacePickRef.current && threeRef.current) {
        const hovered = pickCadFace(threeRef.current, cadFacePickRef.current, event.clientX, event.clientY);
        if (hovered !== cadFaceHoverRef.current) {
          cadFaceHoverRef.current = hovered;
          syncCadFaceLayer(threeRef.current, cadFacePickRef.current, resolvedThemeRef.current, hovered);
        }
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
        lastTapePointerRef.current = { clientX: event.clientX, clientY: event.clientY };
        const quickDelete = event.shiftKey || event.ctrlKey || event.metaKey;
        setTapeQuickDelete((current) => (current === quickDelete ? current : quickDelete));
        updateTapeHover(event.clientX, event.clientY, event.altKey, event.shiftKey, quickDelete);
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
        marquee.reverse = event.altKey;
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
      // has travelled further along once it has gone a few pixels. The axis is then
      // kept until Shift is let go, so crossing the diagonal does not switch it (#909).
      let axisLock: ReturnType<typeof dragAxisLock> | null = null;
      if (event.shiftKey) {
        const dominant = dragAxisLock(drag.workplane, deltaX, deltaY, deltaZ);
        const choice = latchedDragAxis(drag.axisLatch ?? null, dominant.along, Math.hypot(event.clientX - drag.startClient.x, event.clientY - drag.startClient.y));
        drag.axisLatch = choice.latched;
        axisLock = choice.along ? dragAxisLock(drag.workplane, deltaX, deltaY, deltaZ, choice.along) : { ...dominant, delta: { x: 0, y: 0, z: 0 }, still: true };
      } else {
        drag.axisLatch = null;
      }
      if (axisLock) {
        deltaX = axisLock.delta.x;
        deltaY = axisLock.delta.y;
        deltaZ = axisLock.delta.z;
      }
      const state = threeRef.current;
      if (drag.snapMoving && drag.snapTargets?.length && state && !axisLock?.still) {
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
        syncObjectSnapGuides(state, guides, drag.guideY + 0.06);
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
    // An iPad in desktop-class Safari, or one shown on a remote screen, may not report a coarse
    // primary pointer; any coarse pointer or a touch screen at all is enough to show the switch.
    const media = window.matchMedia("(pointer: coarse), (any-pointer: coarse)");
    const apply = () => setTouchDevice(media.matches || (navigator.maxTouchPoints ?? 0) > 0);
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
  const cancelGestureForCameraRef = useRef(cancelGestureForCamera);
  cancelGestureForCameraRef.current = cancelGestureForCamera;

  /**
   * Esc while the mouse button is held (#440): a move drag only previews, so its preview goes back; a handle drag
   * has changed the shapes as it went, so the editor puts them back. Nothing is taken over when the button is let go.
   * Says whether there was something to cancel.
   */
  const cancelActiveDrag = useCallback(() => {
    const state = threeRef.current;
    const transform = transformRef.current;
    if (transform) {
      onCancelInteraction?.();
      transformRef.current = null;
      setActiveRotationWheel(false);
      setActiveTransformKind(null);
      setPinnedRotationWheelView(null);
      setRotationReadout(null);
      setPinnedMeasureKey(null);
      setHoverMeasureKey(null);
      if (state) {
        setSelectionHelpersVisible(state, true);
        state.controls.enabled = true;
        state.needsRender = true;
      }
      onInteractionActiveChange?.(false);
      return true;
    }
    if (dragRef.current || marqueeRef.current) {
      if (dragRef.current) onCancelInteraction?.();
      cancelGestureForCamera();
      if (state) state.controls.enabled = true;
      return true;
    }
    return false;
  }, [cancelGestureForCamera, onCancelInteraction, onInteractionActiveChange]);
  const cancelActiveDragRef = useRef(cancelActiveDrag);
  cancelActiveDragRef.current = cancelActiveDrag;

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
          onShapeContextMenu({ shapeId, clientX: event.clientX, clientY: event.clientY, stackIds: shapeStackAt(event.clientX, event.clientY), ...faceCentreAt(event.clientX, event.clientY, shapeId) });
        }
        return;
      }
      if (event.pointerType === "touch") {
        if (longPressFiredRef.current === event.pointerId) {
          // The menu opened on this press: lifting the finger is no tap that clears the selection.
          longPressFiredRef.current = null;
          touchEmptyTapRef.current = null;
        }
        const emptyTap = touchEmptyTapRef.current;
        if (emptyTap && emptyTap.pointerId === event.pointerId) {
          touchEmptyTapRef.current = null;
          if (touchPointersRef.current.size === 1 && Math.hypot(event.clientX - emptyTap.x, event.clientY - emptyTap.y) < 8) {
            // Locked Select multiple keeps the selection and its button; the other Select
            // multiple ends here on empty space, and a plain tap clears the selection.
            if (!touchMultiSelectActiveRef.current) {
              if (multiSelectRef.current) onMultiSelectEndRef.current?.();
              else onSelectShape(null);
            }
          }
        }
        touchPointersRef.current.delete(event.pointerId);
        if (touchPointersRef.current.size === 0) cameraTouchRef.current = false;
      }
      const slicerEmptyPress = slicerEmptyPressRef.current;
      if (slicerEmptyPress && slicerEmptyPress.pointerId === event.pointerId) {
        slicerEmptyPressRef.current = null;
        // A click on empty space that did not turn the view clears the selection, as a click there always did.
        if (Math.hypot(event.clientX - slicerEmptyPress.x, event.clientY - slicerEmptyPress.y) < 5) {
          if (multiSelectRef.current) onMultiSelectEndRef.current?.();
          else onSelectShape(null);
        }
        return;
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
          settleLiftMoveDimension();
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
          marquee.reverse = event.altKey;
          const selected = shapesInMarquee(rect, marqueeMode(workspaceRef.current.frameByDirection, marquee.startX, marquee.currentX, marquee.reverse) === "enclose");
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
      // A move begun by another finger that never came back up here is no move of this one: letting it end
      // would write its start places over whatever happened since, such as a body set down on a face (#619).
      if (drag.pointerId !== event.pointerId) {
        cancelGestureForCamera();
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
    [cancelGestureForCamera, clearMoveDimensions, onDuplicateShapesMoved, onInteractionActiveChange, onSelectShape, onUpdateShape, rememberResizeAnchor, setMarqueeFromState, shapesInMarquee, suppressCornerEditAfterDrag, suppressLiftEditAfterDrag, onShapeContextMenu, pickShape, shapeStackAt, faceCentreAt],
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
      // On a body the shape lies on the face under the pointer, in its middle; with Alt where it was let go (#823).
      const surface = pickPlacementSurface(event.clientX, event.clientY, false, undefined, event.altKey ? false : "always");
      if (surface) {
        onAddShape(asset, surface.workplane.origin, surface.workplane);
        return;
      }
      const point = toPlacementWorkplanePoint(event.clientX, event.clientY);
      onAddShape(asset, point ?? placementWorkplaneRef.current.origin);
    },
    [onAddShape, onDropMyShape, pickPlacementSurface, toPlacementWorkplanePoint],
  );

  /** Zooms to the selection; false when there is none to look at. */
  const focusSelection = useCallback((): boolean => {
    const state = threeRef.current;
    if (!state) return false;
    state.cameraTurn = null;
    // The real selection, not renderSelectionIds: the workplane and edge tools hide
    // the outline while they are open, but the objects are still what to look at.
    const bounds = selectionBounds(state, selectedIdsRef.current);
    if (!bounds) return false;
    frameBounds(state, bounds);
    syncViewCube(state, viewCubeRef.current);
    return true;
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
    state.cameraTurn = null;

    if (zoomDistanceScale(scale) < 1) movePivotToDepthUnder(state, 0, 0);
    zoomCameraBy(state, scale);
  }, []);

  const toggleSecondView = useCallback(() => {
    if (secondViewWindow) {
      setSecondViewWindow(null);
      return;
    }
    setSecondViewWindow(openSecondViewWindow());
  }, [secondViewWindow]);
  const closeSecondView = useCallback(() => setSecondViewWindow(null), []);
  const getSelectedIds = useCallback(() => selectedIdsRef.current, []);

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
    leaveTapeSubModes();
    onToggleWorkplaneTool();
  }, [onToggleWorkplaneTool, setTapeActive]);

  const resetPlacementWorkplane = useCallback(() => {
    onSetPlacementWorkplane(horizontalPlacementWorkplane(), "base");
    if (workplaneModeRef.current) onWorkplaneModeChange(false);
  }, [onSetPlacementWorkplane, onWorkplaneModeChange]);
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
    leaveTapeSubModes();
    if (next) {
      onWorkplaneModeChange(false);
    }
  }, [onWorkplaneModeChange, tapeToolsOpen, setTapeActive]);

  const activateTapeAdd = useCallback(() => {
    if (splitActiveRef.current) return;
    setTapeHidden(false);
    leaveTapeSubModes();
    setTapeActive(true);
    onWorkplaneModeChange(false);
    onCancelCruise?.();
  }, [onCancelCruise, onWorkplaneModeChange, setTapeActive, setTapeHidden]);

  const toggleTapeHidden = useCallback(() => {
    // Leaving a tool that works on the measurements first, so nothing is left half-set on hidden ones.
    setTapeActive(false);
    leaveTapeSubModes();
    setTapeHidden(!tapeModelRef.current.hidden);
  }, [setTapeActive, setTapeHidden]);

  const toggleTapeWholeEdges = useCallback(() => {
    const next = !tapeWholeEdgesRef.current;
    tapeWholeEdgesRef.current = next;
    setTapeWholeEdges(next);
  }, []);

  const activateTapeDelete = useCallback(() => {
    if (splitActiveRef.current) return;
    setTapeHidden(false);
    setTapeActive(false);
    tapeMoveModeRef.current = false;
    setTapeMoveMode(false);
    tapeDeleteModeRef.current = true;
    setTapeDeleteMode(true);
    onWorkplaneModeChange(false);
    onCancelCruise?.();
  }, [onCancelCruise, onWorkplaneModeChange, setTapeActive, setTapeHidden]);

  const activateTapeMove = useCallback(() => {
    if (splitActiveRef.current) return;
    setTapeHidden(false);
    setTapeActive(false);
    tapeDeleteModeRef.current = false;
    setTapeDeleteMode(false);
    tapeMoveModeRef.current = true;
    setTapeMoveMode(true);
    onWorkplaneModeChange(false);
    onCancelCruise?.();
    onSelectShape(null);
  }, [onCancelCruise, onSelectShape, onWorkplaneModeChange, setTapeActive, setTapeHidden]);

  const collapseCameraControls = useCallback(() => {
    setCameraControlsCollapsed(true);
    setTapeToolsOpen(false);
    setSectionViewOpen(false);
    setTapeActive(false);
    leaveTapeSubModes();
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
          const bounds = getSectionBounds(shapesRef.current, sectionSettingsRef.current.axis, workspaceRef.current.width, workspaceRef.current.depth, sectionSettingsRef.current.frame ?? null);
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
        const bounds = getSectionBounds(shapesRef.current, prev.axis, workspaceRef.current.width, workspaceRef.current.depth, prev.frame ?? null);
        next.offset = bounds.center;
      }
      return next;
    });
  }, []);

  const handleSelectSectionAxis = useCallback((axis: SectionPlaneAxis) => {
    const bounds = getSectionBounds(shapesRef.current, axis, workspaceRef.current.width, workspaceRef.current.depth, sectionSettingsRef.current.frame ?? null);
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
    const bounds = getSectionBounds(shapesRef.current, sectionSettingsRef.current.axis, workspaceRef.current.width, workspaceRef.current.depth, sectionSettingsRef.current.frame ?? null);
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

  // What the axes are measured along (#644): the workplane's frame as it is now, or the view at this moment;
  // null for the design's own axes, or when the view is not there yet.
  const sectionFrameForOrientation = (orientation: SectionOrientation): SectionFrame | null => {
    if (orientation === "workplane") return sectionFrameFromWorkplane(placementWorkplaneRef.current);
    if (orientation !== "view") return null;
    const state = threeRef.current;
    if (!state) return null;
    const forward = state.camera.getWorldDirection(new THREE.Vector3());
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(state.camera.quaternion);
    const { x, y, z } = state.controls.target;
    return sectionFrameFromView({ x, y, z }, { x: forward.x, y: forward.y, z: forward.z }, { x: right.x, y: right.y, z: right.z });
  };
  const sectionFrameForOrientationRef = useRef(sectionFrameForOrientation);
  sectionFrameForOrientationRef.current = sectionFrameForOrientation;

  // Choosing the workplane or the view starts across its height - parallel to the workplane, or facing the
  // screen - in the middle of the design; choosing the view again takes the view as it is now.
  const handleSelectSectionOrientation = useCallback((wanted: SectionOrientation) => {
    const frame = sectionFrameForOrientationRef.current(wanted);
    const orientation: SectionOrientation = wanted !== "world" && !frame ? "world" : wanted;
    const prev = sectionSettingsRef.current;
    const axis: SectionPlaneAxis = orientation === "world" ? (prev.orientation ?? "world") === "world" ? prev.axis : "x" : "y";
    const bounds = getSectionBounds(shapesRef.current, axis, workspaceRef.current.width, workspaceRef.current.depth, frame);
    const next: SectionPlaneSettings = { ...prev, enabled: true, orientation, frame, axis, offset: bounds.center };
    sectionSettingsRef.current = next;
    setSectionSettings(next);
  }, []);

  // On the workplane the plane moves with it: the offset still counts from the workplane.
  useEffect(() => {
    const prev = sectionSettingsRef.current;
    if (prev.orientation !== "workplane") return;
    const frame = sectionFrameFromWorkplane(placementWorkplane);
    if (!frame) return;
    const next = { ...prev, frame };
    sectionSettingsRef.current = next;
    setSectionSettings(next);
  }, [placementWorkplane]);

  // MCP: the same rules as the buttons - a new axis, switching on from the
  // start position or `center` put the plane in the middle of the design,
  // unless an offset is given.
  useEffect(() => {
    window.layerlingSectionView = (patch) => {
      const current = sectionSettingsRef.current;
      const currentOrientation = current.orientation ?? "world";
      const orientation = patch.orientation ?? currentOrientation;
      // A new orientation takes its frame now; the view's is the view at this moment, as the button takes it.
      const frame = orientation === currentOrientation && orientation !== "view" || orientation === "view" && patch.orientation === undefined
        ? current.frame ?? null
        : sectionFrameForOrientationRef.current(orientation);
      const axis = patch.axis ?? (orientation !== currentOrientation && orientation !== "world" ? "y" : current.axis);
      const bounds = getSectionBounds(shapesRef.current, axis, workspaceRef.current.width, workspaceRef.current.depth, frame);
      const switchingOn = patch.enabled === true && !current.enabled && current.offset === 0;
      const recenter = patch.center === true || axis !== current.axis || orientation !== currentOrientation || patch.orientation === "view" || switchingOn;
      if (patch.cutFace !== undefined) changeSectionCutFace(normalizeSectionCutFace(patch.cutFace));
      const next: SectionPlaneSettings = {
        enabled: patch.enabled ?? current.enabled,
        axis,
        offset: typeof patch.offset === "number" && Number.isFinite(patch.offset) ? patch.offset : recenter ? bounds.center : current.offset,
        flipped: patch.flipped ?? current.flipped,
        showPlane: patch.showPlane ?? current.showPlane,
        orientation,
        frame,
      };
      sectionSettingsRef.current = next;
      setSectionSettings(next);
      return { settings: next, bounds: { min: bounds.min, max: bounds.max, center: bounds.center }, cutFace: sectionCutFaceRef.current };
    };
    return () => {
      delete window.layerlingSectionView;
    };
  }, [changeSectionCutFace]);

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
      // In Add measurement mode, holding Shift or Ctrl/Cmd deletes the clicked point right away (#589).
      if (tapeDeleteModeRef.current || (tapeModeRef.current && (event.shiftKey || event.ctrlKey || event.metaKey))) {
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
      const candidate = resolveTapeCandidate(event.clientX, event.clientY, pointId, undefined, event.shiftKey);
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

  /** A reference point in the middle of a measurement: the centre of a round edge or of a diameter (#323). */
  const markTapeMiddle = useCallback(
    (segmentId: string) => {
      const state = threeRef.current;
      if (!state || !onAddReferencePoints) return;
      const worldPoints = tapeSegmentWorldPoints(state, tapeModelRef.current, segmentId);
      const circle = worldPoints.length >= 4 ? circleOfEdgePoints(worldPoints) : null;
      const middle = circle
        ? { x: circle.center.x, y: circle.center.y, z: circle.center.z }
        : measurementMiddle(worldPoints.map((point) => ({ x: point.x, y: point.y, z: point.z })));
      if (middle) onAddReferencePoints([middle]);
    },
    [onAddReferencePoints],
  );

  const handleTapeSegmentPointerDown = useCallback(
    (event: ReactPointerEvent<SVGElement>, segmentId: string) => {
      if (event.button !== 0) {
        return;
      }
      // In Add measurement mode, holding Shift or Ctrl/Cmd deletes the clicked measurement right away (#589).
      if (tapeDeleteModeRef.current || (tapeModeRef.current && (event.shiftKey || event.ctrlKey || event.metaKey))) {
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
      const candidate = resolveTapeCandidate(
        event.clientX,
        event.clientY,
        undefined,
        tapeWholeEdgesRef.current !== event.altKey,
        event.shiftKey,
      );
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
      const savedView = !event.ctrlKey && !event.metaKey && !event.altKey ? savedViewForKey(event.key, event.code, event.shiftKey) : undefined;
      // A slider keeps the focus after it was dragged, as in the split panel,
      // but only needs its own keys - the view shortcuts still apply.
      const sliderTarget = event.target instanceof HTMLInputElement && event.target.type === "range";
      if (sliderTarget ? SLIDER_KEYS.has(event.key) : isTypingTarget(event.target)) {
        return;
      }

      const key = event.key.toLowerCase();
      let nextSnap: GridSize | null;
      if (event.key === "Escape" && (transformRef.current || dragRef.current || marqueeRef.current)) {
        event.preventDefault();
        markEscapeHandled(event);
        cancelActiveDragRef.current();
      } else if (event.key === "Escape" && workplaneModeRef.current) {
        event.preventDefault();
        // Wie ein Klick ins Leere: zurueck auf die Grundplatte, so steht es in der Anleitung (#108).
        resetPlacementWorkplane();
      } else if (event.key === "Escape" && (tapeToolsOpen || tapeModeRef.current || tapeDeleteModeRef.current || tapeMoveModeRef.current)) {
        event.preventDefault();
        setTapeActive(false);
        leaveTapeSubModes();
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
      } else if (savedView) {
        event.preventDefault();
        if (savedView.save) saveView(savedView.slot);
        else showSavedView(savedView.slot);
      } else if ((nextSnap = snapGridForShortcut(event, snapGridOptions(workspaceRef.current.units, workspaceRef.current.customSnapGrids), snapRef.current))) {
        // Alt+digit and comma/period pick the snap step without the menu (#748).
        event.preventDefault();
        chooseSnapGrid(nextSnap);
        onNotice?.(`${t("workspace.snapGrid")}: ${customSnapGridLabel(nextSnap, workspaceRef.current.customSnapGrids) ?? measurementOptionLabel(nextSnap)}`);
      } else if (event.altKey && !event.ctrlKey && !event.metaKey && (key === "w" || event.code === "KeyW")) {
        // Ctrl+W would close the tab. Option+W types a sign on the Mac, so the key's position counts too.
        event.preventDefault();
        resetPlacementWorkplane();
      } else if (key === "w") {
        event.preventDefault();
        if (!event.shiftKey || !setPlacementWorkplaneAtSelection()) togglePlacementWorkplane();
      } else if (key === "f" && event.shiftKey) {
        event.preventDefault();
        focusSelection();
      } else if (key === "f") {
        // As in Tinkercad: F looks at what is selected, and at everything when nothing is (#465).
        event.preventDefault();
        if (!focusSelection()) resetView();
      } else if (event.key === "Home") {
        event.preventDefault();
        resetView();
      } else if (key === "o" && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        toggleProjection();
      } else if (key === "q" && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
        event.preventDefault();
        const visible = dimensionsHiddenRef.current;
        showDimensions(visible);
        onNotice?.(t(visible ? "camera.dimensionsShown" : "camera.dimensionsHidden"));
      } else if ((event.key === "+" || event.key === "=") && !event.ctrlKey && !event.metaKey && !event.altKey) {
        // With Ctrl or Cmd these are the browser's own page zoom, which the page must not swallow.
        event.preventDefault();
        zoomCamera(ZOOM_STEP_IN);
      } else if ((event.key === "-" || event.key === "_") && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        zoomCamera(ZOOM_STEP_OUT);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [chooseSnapGrid, focusSelection, onNotice, resetPlacementWorkplane, resetView, tapeToolsOpen, sectionViewOpen, setPlacementWorkplaneAtSelection, setTapeActive, setViewCubeFace, showDimensions, togglePlacementWorkplane, toggleProjection, zoomCamera]);

  return (
    <main className="workplane-stage">
      <ViewCube getRig={getViewCubeRig} cubeRef={viewCubeRef} />
      {secondViewWindow ? <SecondViewWindow popup={secondViewWindow} threeRef={threeRef} projectId={projectId} getSelectedIds={getSelectedIds} hasSelection={selectedIds.length > 0} onClosed={closeSecondView} /> : null}

      <div className={`camera-controls ${cameraControlsCollapsed ? "collapsed" : ""}`} aria-label={t("camera.controls")} data-help-section="cameraBar">
        {cameraControlsCollapsed ? (
          <button className="camera-controls-toggle" aria-label={t("camera.show")} title={t("camera.showShort")} aria-expanded={false} onClick={() => setCameraControlsCollapsed(false)}>
            <ChevronRight size={24} strokeWidth={2.25} aria-hidden="true" />
          </button>
        ) : (
          <>
            <button className="camera-controls-toggle" aria-label={t("camera.hide")} title={t("camera.hideShort")} aria-expanded={true} onClick={collapseCameraControls}>
              <ChevronLeft size={24} strokeWidth={2.25} aria-hidden="true" />
            </button>
            <button aria-label={t("camera.home")} aria-keyshortcuts="Home" title={t("camera.shortcut", { label: t("camera.home"), keys: "Home" })} onClick={resetView}>
              <Home size={24} strokeWidth={2.25} />
            </button>
            <button
              aria-label={t("camera.focusSelection")}
              aria-keyshortcuts="F Shift+F"
              title={t("camera.shortcut", { label: t("camera.focusSelection"), keys: "F" })}
              disabled={selectedIds.length === 0}
              onClick={() => focusSelection()}
            >
              <Crosshair size={24} strokeWidth={2.25} />
            </button>
            <button className="camera-zoom-button" aria-label={t("camera.zoomIn")} aria-keyshortcuts="+" title={t("camera.shortcut", { label: t("camera.zoomIn"), keys: "+" })} onClick={() => zoomCamera(ZOOM_STEP_IN)}>
              <Plus size={28} strokeWidth={2.15} />
            </button>
            <button className="camera-zoom-button" aria-label={t("camera.zoomOut")} aria-keyshortcuts="-" title={t("camera.shortcut", { label: t("camera.zoomOut"), keys: "−" })} onClick={() => zoomCamera(ZOOM_STEP_OUT)}>
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
            {/* The second view in a window of its own. Not on a phone or a tablet. */}
            {secondViewSupported ? (
              <button
                className={secondViewWindow ? "active" : ""}
                aria-label={secondViewWindow ? t("camera.closeSecondView") : t("camera.secondView")}
                aria-pressed={Boolean(secondViewWindow)}
                title={secondViewWindow ? t("camera.closeSecondView") : t("camera.secondView")}
                onClick={toggleSecondView}
              >
                <PictureInPicture2 size={24} strokeWidth={2.15} aria-hidden="true" />
              </button>
            ) : null}
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
                  onClick={resetPlacementWorkplane}
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
                  <button className={tapeWholeEdges ? "active" : ""} aria-label={t("camera.tapeWholeEdges")} title={t("camera.tapeWholeEdgesHint")} aria-pressed={tapeWholeEdges} onClick={toggleTapeWholeEdges}>
                    <Spline size={20} strokeWidth={2.25} aria-hidden="true" />
                  </button>
                  <button className={tapeModel.hidden ? "active" : ""} aria-label={tapeModel.hidden ? t("camera.showMeasurements") : t("camera.hideMeasurements")} title={tapeModel.hidden ? t("camera.showMeasurements") : t("camera.hideMeasurements")} aria-pressed={Boolean(tapeModel.hidden)} disabled={tapeModel.segments.length === 0} onClick={toggleTapeHidden}>
                    {tapeModel.hidden ? <EyeOff size={20} strokeWidth={2.25} aria-hidden="true" /> : <Eye size={20} strokeWidth={2.25} aria-hidden="true" />}
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
                      {/* What X, Y and Z mean (#644): the design's axes, the workplane's, or the view's - then Z runs into the screen. */}
                      <div className="section-popover-axis-row">
                        <div className="section-axis-buttons section-orientation-buttons" role="radiogroup" aria-label={t("camera.sectionOrientation")}>
                          {(["world", "workplane", "view"] as const).map((orientation) => {
                            const active = (sectionSettings.orientation ?? "world") === orientation;
                            const name = orientation === "world" ? "World" : orientation === "workplane" ? "Workplane" : "View";
                            return (
                              <button
                                key={orientation}
                                type="button"
                                role="radio"
                                aria-checked={active}
                                className={`section-axis-btn section-orientation-btn ${active ? "active" : ""}`}
                                onClick={() => handleSelectSectionOrientation(orientation)}
                                title={t(`camera.sectionOrientation${name}Hint`)}
                              >
                                {t(`camera.sectionOrientation${name}`)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
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
                        const bounds = getSectionBounds(shapes, sectionSettings.axis, workspace.width, workspace.depth, sectionSettings.frame ?? null);
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
                                  ref={sectionOffsetInputRef}
                                  type="text"
                                  inputMode="decimal"
                                  className="section-number-input"
                                  value={sectionOffsetDraft ?? String(shown)}
                                  onFocus={(e) => {
                                    sectionWheelShownRef.current = null;
                                    setSectionOffsetDraft(String(shown));
                                    e.currentTarget.select();
                                  }}
                                  onChange={(e) => {
                                    sectionWheelShownRef.current = null;
                                    setSectionOffsetDraft(e.target.value);
                                  }}
                                  onBlur={() => {
                                    const val = parseMeasurementInput(sectionOffsetDraft ?? "");
                                    const fromWheel = sectionWheelShownRef.current !== null && sectionOffsetDraft === sectionWheelShownRef.current;
                                    if (!fromWheel && !sectionOffsetCancelRef.current && Number.isFinite(val)) handleSectionOffsetChange(sign * displayToMillimeters(val, workspace));
                                    sectionWheelShownRef.current = null;
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

                      {/* The cut face (#446): hatched like a drawing, filled plain, or open to look into the skin of the body. */}
                      <div className="section-popover-axis-row section-cut-face-row">
                        <span className="section-label">{t("camera.sectionCutFace")}</span>
                        <div className="section-axis-buttons section-orientation-buttons" role="radiogroup" aria-label={t("camera.sectionCutFace")}>
                          {SECTION_CUT_FACES.map((cutFace) => {
                            const active = sectionCutFace === cutFace;
                            const name = cutFace === "hatch" ? "Hatch" : cutFace === "fill" ? "Fill" : "Open";
                            return (
                              <button
                                key={cutFace}
                                type="button"
                                role="radio"
                                aria-checked={active}
                                className={`section-axis-btn section-orientation-btn ${active ? "active" : ""}`}
                                onClick={() => changeSectionCutFace(cutFace)}
                                title={t(`camera.sectionCutFace${name}Hint`)}
                              >
                                {t(`camera.sectionCutFace${name}`)}
                              </button>
                            );
                          })}
                        </div>
                      </div>

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
                              <strong>{sectionMeasureResult.circle === "diameter" ? "Ø " : sectionMeasureResult.circle === "radius" ? "R " : ""}{formatMeasure(sectionMeasureResult.distance, workspace.accuracy)} {lengthDisplayUnit(workspace).label}</strong>
                              <span>{sectionMeasureDeltas(sectionMeasureResult, sectionSettings.axis, workspace.accuracy)}</span>
                            </div>
                          ) : (
                            <span className="section-measure-help">{t("camera.sectionMeasureHelp")}</span>
                          )
                        ) : null}
                      </div>

                      <div className="section-measure-row">
                        <button
                          type="button"
                          className="section-action-btn section-workplane-btn"
                          onClick={() => {
                            // The workplane lies on the cut (#154); the next sketch starts exactly there.
                            onSetPlacementWorkplane(sectionPlacementWorkplane(sectionSettings), "shape");
                            onWorkplaneModeChange(false);
                          }}
                          title={t("camera.sectionWorkplaneHint")}
                        >
                          <Layers size={14} strokeWidth={2.2} aria-hidden="true" />
                          <span>{t("camera.sectionWorkplane")}</span>
                        </button>
                        <button
                          type="button"
                          className="section-action-btn section-workplane-btn"
                          disabled={!onSketchFromSection}
                          onClick={() => {
                            if (sectionMeasureModeRef.current) setSectionMeasureMode(false);
                            onSketchFromSection?.(sectionSettings);
                          }}
                          title={t("camera.sectionSketchHint")}
                        >
                          <PencilLine size={14} strokeWidth={2.2} aria-hidden="true" />
                          <span>{t("camera.sectionSketch")}</span>
                        </button>
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
                            onClick={() => onExportSectionSvg?.(sectionSettings.axis, sectionSettings.offset, sectionSettings.frame ?? null)}
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

                      {/* Esc closes the panel, which a tablet has no key for; a computer has the X and Esc, so it does not show these (#402). */}
                      {touchDevice ? <div className="section-footer-actions section-close-actions">
                        <button
                          type="button"
                          className="section-action-btn"
                          onClick={() => {
                            // As Esc does: the measuring first, then the panel.
                            if (sectionMeasureModeRef.current) setSectionMeasureMode(false);
                            else setSectionViewOpen(false);
                          }}
                          title={t("camera.sectionBackHint")}
                        >
                          <ChevronLeft size={14} strokeWidth={2.2} aria-hidden="true" />
                          <span>{t("camera.sectionBack")}</span>
                        </button>
                        <button
                          type="button"
                          className="section-action-btn section-confirm-btn"
                          onClick={() => {
                            // Ends the measuring and closes the panel; the cut stays.
                            setSectionMeasureMode(false);
                            setSectionViewOpen(false);
                          }}
                          title={t("camera.sectionConfirmHint")}
                        >
                          <Check size={14} strokeWidth={2.2} aria-hidden="true" />
                          <span>{t("camera.sectionConfirm")}</span>
                        </button>
                      </div> : null}
                    </>
                  ) : null}
                  </>)}
                </MovableSectionPanel>
              ) : null}
            </div>
          </>
        )}
      </div>

      <section className={`workplane-wrap ${noteMode ? "note-mode" : ""} ${workplaneMode ? "placing-workplane" : ""} ${splitActive ? "split-mode" : ""} ${splitHandleState ? `split-handle-${splitHandleState}` : ""} ${splitSurfacePick ? "split-picking" : ""} ${splitSurfacePick && splitPickOverFace ? "split-pick-over-face" : ""} ${cruiseAsset || carryIds?.length ? "cruising" : ""} ${tapeMode ? "tape-mode" : ""} ${tapeDeleteMode ? "tape-delete-mode" : ""} ${tapeMoveMode ? "tape-move-mode" : ""} ${cornerRulerMode ? "corner-ruler-mode" : ""} ${pivotPickMode || layFlatPickMode || mateFacePick || cadFacePick ? "pivot-pick-mode" : ""} ${modifierActive ? "modifier-edge-pick" : ""} ${sectionMeasureMode && sectionSettings.enabled ? "section-measure-mode" : ""}`} aria-label={t("aria.workplane")}>
        <div className="workplane-plane">
          <div
            className="three-workplane-host"
            ref={hostRef}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "copy";
            }}
            onDrop={handleDrop}
            onPointerDown={pickOnly ? pickOnlyPointer.onPointerDown : handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={pickOnly ? pickOnlyPointer.onPointerUp : finishDrag}
            onPointerCancel={pickOnly ? pickOnlyPointer.onPointerCancel : finishDrag}
            onPointerLeave={handlePointerLeave}
          />
          {!workplaneMode && !splitActive ? <SelectionCounter count={selectedIds.length} hostRef={hostRef} /> : null}
          {!workplaneMode && !splitActive && marqueeRect ? <div className={marqueeTouching ? "selection-marquee touching" : "selection-marquee"} style={marqueeRect} /> : null}
          {!workplaneMode && !splitActive && moveDimensionsEnabled && !dimensionsHidden && moveDimensionOverlay ? (
            <MoveDimensionOverlay
              overlay={moveDimensionOverlay}
              active={moveDimensionOverlay.active}
              onCommit={commitMoveDimension}
            />
          ) : null}
          {!workplaneMode && !splitActive && originDimensionsEnabled && !dimensionsHidden && originDimensionOverlay ? (
            <OriginDimensionOverlay overlay={originDimensionOverlay} />
          ) : null}
          {!workplaneMode && !splitActive && !pivotPickMode && !layFlatPickMode && !mateFacePick && !cadFacePick && transformOverlay && !alignMode && !mirrorMode && !tapeMode && !tapeDeleteMode && !tapeMoveMode && !modifierActive ? (
            <TransformOverlay
              // Q leaves out what shows by itself; a handle pointed at still shows its size.
              box={dimensionsHidden ? { ...transformOverlay, alwaysVisibleDimensionKeys: [] } : transformOverlay}
              measureKey={pinnedMeasureKey ?? hoverMeasureKey}
              editingDimension={editingDimension}
              editingCorner={editingCorner}
              editingRotation={editingRotation}
              rotationReadout={rotationReadout}
              angleBadge={dimensionsHidden ? null : angleBadge}
              locked={selectionLocked}
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
              onTabDimensionEdit={tabDimensionEdit}
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
              pointCardOffsets={pointCardOffsets}
              onPointCardOffsetChange={changePointCardOffset}
              onRemoveAllPoints={onRemoveAllReferencePoints}
            />
          ) : null}
          {!workplaneMode && !splitActive && alignOverlay ? (
            <AlignOverlay
              overlay={alignOverlay}
              onAlign={onAlignSelection}
              onPreview={(axis, target, size) => {
                if (threeRef.current) threeRef.current.alignPreviewActive = true;
                onAlignPreview(axis, target, size);
              }}
              onPreviewClear={() => {
                if (threeRef.current) threeRef.current.alignPreviewActive = false;
                onAlignPreviewClear();
              }}
            />
          ) : null}
          {!workplaneMode && !splitActive && mirrorOverlay ? <MirrorOverlay overlay={mirrorOverlay} onMirror={onMirrorSelection} onPreview={onMirrorPreview} onPreviewClear={onMirrorPreviewClear} /> : null}
          {!splitActive && sectionMeasureOverlay ? <SectionMeasureOverlay overlay={sectionMeasureOverlay} /> : null}
          {!workplaneMode && !splitActive && tapeOverlay && (tapeOverlay.points.length > 0 || tapeOverlay.hover) ? (
            <TapeOverlay
              overlay={tapeOverlay}
              startPointId={tapeModel.startPointId}
              active={tapeMode || tapeMoveMode}
              deleteMode={tapeDeleteMode}
              quickDelete={tapeMode && tapeQuickDelete}
              moveMode={tapeMoveMode}
              onPointPointerDown={handleTapePointPointerDown}
              onPointPointerMove={handleTapePointPointerMove}
              onPointPointerUp={handleTapePointPointerUp}
              onSegmentPointerDown={handleTapeSegmentPointerDown}
              onMarkMiddle={onAddReferencePoints ? markTapeMiddle : undefined}
              onEditLength={beginTapeLengthEdit}
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
              onToggleAxisMode={toggleCornerRulerAxisMode}
              onToggleOcclude={toggleCornerRulerOcclude}
              onToggleSelectedOnly={toggleCornerRulerSelectedOnly}
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
          {tapeLengthEditing ? (
            <input
              className="dimension-input tape-length-input"
              style={{ "--overlay-x": `${tapeLengthEditing.x}px`, "--overlay-y": `${tapeLengthEditing.y}px` } as CSSProperties}
              value={tapeLengthEditing.value}
              autoFocus
              inputMode="decimal"
              aria-label={t("camera.tapeTypeLength")}
              onPointerDown={(event) => event.stopPropagation()}
              onFocus={(event) => event.currentTarget.select()}
              onChange={(event) => setTapeLengthEditing((edit) => edit && { ...edit, value: event.target.value })}
              onBlur={commitTapeLengthEdit}
              onKeyDown={(event) => {
                if (event.key === "Enter") commitTapeLengthEdit();
                if (event.key === "Escape") setTapeLengthEditing(null);
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
          onUnitsChange={changeUnits}
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
          onShapeDefaultsChange={(kind, entry) => {
            changeWorkspace((current) => ({ ...current, shapeCustomizations: withShapeDefaults(current.shapeCustomizations, kind, entry) }));
            // A new design starts with them too, not only this one (#483).
            saveShapeDefaultsForNewDesigns(kind, entry);
          }}
          onSnapChange={chooseSnapGrid}
          onSnapOpenChange={setSnapOpen}
          onObjectSnapChange={changeObjectSnap}
          onEditSketch={selectedShape.sketchProfile ? onEditSketch : undefined}
          onOpenGroup={selectedShape.groupedShapes?.length && onOpenGroup ? () => onOpenGroup(selectedShape.id) : undefined}
          canSeparateParts={canSeparateParts}
          onSeparateParts={onSeparateParts}
          onWrapAroundCylinder={onWrapAroundCylinder}
          onSurfaceTexture={onSurfaceTexture}
          onRemoveSurfaceTexture={onRemoveSurfaceTexture}
          surfaceTextureOpen={surfaceTextureOpen}
          onSurfaceTextureOpenChange={onSurfaceTextureOpenChange}
          surfaceFacePicking={surfaceFacePicking}
          surfacePickedFaces={surfacePickedFaces}
          onSurfaceFacePick={onSurfaceFacePick}
          onVaseAccessories={onVaseAccessories}
          onLayerText={onLayerText}
          onTextTags={onTextTags}
          onFixKeyringTab={onFixKeyringTab}
          textLayerStack={textLayerStack}
          iconTag={iconTag}
          qrCode={qrCode}
          referenceImage={referenceImage}
          onInteractionActiveChange={onInteractionActiveChange}
          onSnapGridAwayChange={setInspectorSnapGridAway}
        />
      ) : null}

      {selectedIds.length > 1 && !splitActive && !modifierActive && !tapeMode && !tapeDeleteMode && !tapeMoveMode && onSelectionHole && onSelectionColor && onSelectionLock ? (
        <SelectionInspector
          shapes={shapes.filter((shape) => selectedIds.includes(shape.id))}
          onSetHole={onSelectionHole}
          onSetColor={onSelectionColor}
          onUpdateShapes={onSelectionUpdateShapes}
          onToggleLocked={onSelectionLock}
          onToggleHidden={onSelectionHide}
          onInteractionActiveChange={onInteractionActiveChange}
          workspace={workspace}
          snap={snap}
          snapOpen={snapOpen}
          onSnapChange={chooseSnapGrid}
          onSnapOpenChange={setSnapOpen}
          onUnitsChange={changeUnits}
          onObjectSnapChange={changeObjectSnap}
          onSnapDockedChange={setSelectionSnapDocked}
        />
      ) : null}

      {(!selectedShape && !selectionSnapDocked) || inspectorSnapGridAway ? (
        <div className="grid-settings">
          <SnapGridControl
            units={workspace.units}
            onUnitsChange={changeUnits}
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
          onWorkspaceChange={changeWorkspace}
          onSnapChange={chooseSnapGrid}
          onThemePreferenceChange={onThemePreferenceChange}
          onMoveDimensionsEnabledChange={changeMoveDimensionsEnabled}
          onOriginDimensionsEnabledChange={changeOriginDimensionsEnabled}
          onStartInPerspectiveChange={changeStartInPerspective}
          hasStartView={hasStartView}
          onSaveStartView={saveStartView}
          onResetStartView={resetStartView}
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
      {touchMultiSelectAvailable ? (
        <TouchMultiSelectButton active={touchMultiSelectActive} onToggle={toggleTouchMultiSelect} />
      ) : null}
    </main>
  );
}

function constrainCamera(state: ThreeState, workspace: WorkspaceSettings) {
  // The pivot stays on the plate, but as far out as the part "Center view" went to, so that part can be centred (#352).
  const reach = state.focusReach;
  const bodies = Array.from(state.shapeRecords.values(), ({ shape }) => ({ x: shape.x, z: shape.z, elevation: shape.elevation ?? 0, extent: Math.max(shape.height, shapeWidth(shape), shapeDepth(shape)) }));
  // Sideways the pivot reaches the farthest body too, not only the part "Center view" last went to: parts
  // parked far beside the plate could not be panned to with the mouse (#502).
  const { halfWidth, halfDepth } = pivotPlateReach(bodies, {
    halfWidth: Math.max(workspace.width / 2, reach ? Math.max(Math.abs(reach.min.x), Math.abs(reach.max.x)) : 0),
    halfDepth: Math.max(workspace.depth / 2, reach ? Math.max(Math.abs(reach.min.z), Math.abs(reach.max.z)) : 0),
  });
  // The pivot may rise to the top of the highest body (and sink to the foot of the lowest): a body
  // set high above the plate (#425) could not be centred or zoomed into with the pivot held to 120 mm.
  const { minY, maxY } = pivotHeightRange(
    bodies,
    { minY: CAMERA_MIN_TARGET_Y, maxY: CAMERA_MAX_TARGET_Y },
    reach ? { minY: reach.min.y, maxY: reach.max.y } : null,
  );
  state.pivotLimits = { halfWidth, halfDepth, minY, maxY };
  const target = state.controls.target;
  const previousTarget = target.clone();
  target.x = clamp(target.x, -halfWidth, halfWidth);
  target.y = clamp(target.y, minY, maxY);
  target.z = clamp(target.z, -halfDepth, halfDepth);

  const targetShift = target.clone().sub(previousTarget);
  if (targetShift.lengthSq() > 0) {
    state.camera.position.add(targetShift);
    state.camera.updateProjectionMatrix();
  }
}

function clearSectionCaps(state: ThreeState) {
  if (!state.sectionCapGroup) return;
  state.scene.remove(state.sectionCapGroup);
  disposeObject(state.sectionCapGroup);
  state.sectionCapGroup = null;
  state.needsRender = true;
}

/**
 * The filled cut face of the section view: one flat mesh per body, on the plane, in its colour a little darker,
 * hatched unless the panel says "Filled" (#446). "Open" never gets here.
 */
function buildSectionCaps(state: ThreeState, bodies: readonly SectionBody[], axis: SectionPlaneAxis, offset: number, frame: SectionFrame | null = null, cutFace: SectionCutFace = "hatch") {
  clearSectionCaps(state);
  if (cutFace === "open") return;
  const group = new THREE.Group();
  group.name = "SectionCaps";
  const caps = bodies.map((body) => ({ body, cap: sectionCapMesh(body.loops) })).filter(({ cap }) => cap.triangles.length > 0);
  const hatch = cutFace === "hatch" && caps.length > 0 ? sectionHatchTexture() : null;
  const spacing = hatch ? sectionHatchSpacing(caps.map(({ cap }) => cap)) : 1;
  const turned = hatch ? sectionHatchTurned(caps.map(({ body, cap }) => ({ cap, loops: body.loops }))) : [];
  caps.forEach(({ body, cap }, index) => {
    const positions: number[] = [];
    cap.points.forEach((point) => positions.push(...sectionPointFromFrame(sectionPointToWorld(point, axis, offset), frame)));
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    if (hatch) geometry.setAttribute("uv", new THREE.Float32BufferAttribute(sectionHatchUvs(cap.points, spacing, turned[index]), 2));
    geometry.setIndex(cap.triangles);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(body.color).multiplyScalar(0.78),
      map: hatch,
      // A see-through body keeps a see-through cut face (#575), as dim as the body itself.
      transparent: Boolean(body.seeThrough),
      opacity: body.seeThrough ? TRANSPARENT_SOLID_OPACITY : 1,
      depthWrite: !body.seeThrough,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = "SectionCap";
    group.add(mesh);
  });
  if (group.children.length === 0) return;
  state.scene.add(group);
  state.sectionCapGroup = group;
  state.needsRender = true;
}

function setSelectionHelpersVisible(state: ThreeState | null, visible: boolean) {
  if (!state || state.helperLayer.visible === visible) {
    return;
  }
  state.helperLayer.visible = visible;
  state.needsRender = true;
}

const parseMeasureMm = parseLengthMm;
const resolveMeasureMm = resolveLengthMm;
const setMeasureUnit = setLengthUnit;

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
/**
 * Where a dragged pivot marker lands (#140): on the body under the pointer - a corner or the
 * middle of an edge when the pointer is near one, a point along the edge, or else the point of
 * the surface. Beside every body it slides in the plane through `depth` facing the camera.
 */
function resolvePivotDragPoint(state: ThreeState, clientX: number, clientY: number, depth: THREE.Vector3): THREE.Vector3 | null {
  const rect = aimPickRay(state, clientX, clientY, RENDER_LAYER_SHAPES);
  const hit = firstShapeHit(state, { needsFace: true });
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

function pickCadFace(state: ThreeState, pick: CadFacePick, clientX: number, clientY: number) {
  const mesh = cadFacePickLayerMesh(state, pick);
  const rect = state.renderer.domElement.getBoundingClientRect();
  state.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  state.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  state.raycaster.setFromCamera(state.pointer, state.camera);
  state.raycaster.layers.set(RENDER_LAYER_SHAPES);
  const cut = (point: THREE.Vector3) => Boolean(state.sectionPlane && state.sectionPlane.distanceToPoint(point) < -0.001);
  // The shared raycaster stops at the first hit of a bounds tree; with the section view on, that hit
  // can lie in the part that is cut away, so every hit is needed to find the first one that is shown.
  const raycaster = state.raycaster as THREE.Raycaster & { firstHitOnly?: boolean };
  const firstHitOnly = raycaster.firstHitOnly;
  if (state.sectionPlane) raycaster.firstHitOnly = false;
  try {
    const hit = raycaster.intersectObject(mesh, false).find((entry) => !cut(entry.point));
    if (!hit || hit.faceIndex === undefined || hit.faceIndex === null) return null;
    // The body's own display mesh lies on the same surface and is left out of the test, which also spares a heavy body the brute-force pass.
    const blocker = raycaster
      .intersectObjects(state.shapeLayer.children.filter((child) => child.userData.shapeId !== pick.shapeId), true)
      .find((entry) => !cut(entry.point) && entry.object instanceof THREE.Mesh && typeof entry.object.userData.shapeId === "string" && entry.object.userData.shapeId !== pick.shapeId);
    if (blocker && blocker.distance < hit.distance - 1e-3) return null;
    const faceId = pick.triangleFaces[hit.faceIndex];
    return faceId === undefined || faceId < 0 ? null : faceId;
  } finally {
    raycaster.firstHitOnly = firstHitOnly;
  }
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
function dragAxisLock(workplane: PlacementWorkplane, deltaX: number, deltaY: number, deltaZ: number, forced?: DragAxis): { along: DragAxis; delta: { x: number; y: number; z: number }; still?: boolean } {
  const alongX = deltaX * workplane.xAxis.x + deltaY * workplane.xAxis.y + deltaZ * workplane.xAxis.z;
  const alongZ = deltaX * workplane.zAxis.x + deltaY * workplane.zAxis.y + deltaZ * workplane.zAxis.z;
  const along: DragAxis = forced ?? (Math.abs(alongX) >= Math.abs(alongZ) ? "x" : "z");
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

function setComplexEdgeVisibility(object: THREE.Object3D, visible: boolean) {
  object.traverse((child) => {
    if (child.userData.complexEdge) {
      child.visible = visible;
    }
  });
}

function pickSplitPlaneHandle(state: ThreeState, clientX: number, clientY: number) {
  if (!state.splitLayer.visible) return false;
  pointerRayFor(state, clientX, clientY);
  state.raycaster.layers.set(RENDER_LAYER_PREVIEWS);
  return state.raycaster.intersectObjects(state.splitLayer.children, true).some((hit) => hit.object.userData.splitPlaneHandle === true);
}

/** Where along the plane's normal line the pointer ray passes closest, or null when the view looks along that line. */
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
